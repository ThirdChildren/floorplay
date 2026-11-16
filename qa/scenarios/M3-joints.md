# S3.6 · Palm up and pinch point from the hand joints

**Milestone**: M3 · **Type**: PC (IWER emulator via MCP `iwsdk-runtime`) · **`CLAUDE.md` rules**: 1, 5 (feature detection), 9
Implementation prerequisites: T3.2a (spike: measured constants), T3.2b (logic, system, integration). See `docs/plans/M3.md`, D31 and "Spike outcomes". Common conventions (poses, gate rule): `qa/scenarios/M3-persistence.md`.

**What is tested here**: the **source** of the hand data (joints `wrist`, metacarpals, thumb and index tips via `XRFrame.fillPoses`; fallback: `gripSpace`), the **palm up** computed from the joints and the **pinch point** (midpoint of the tips). The pinch **state** stays the one from the `selectstart/selectend` events (D31). This is the only scenario that uses `pinch=auto` and `pinch=joints`; all the other M3 scenarios use `pinch=grip`.

## Preconditions
- Constants written by the T3.2a spike in `docs/plans/M3.md` ("Spike outcomes") and in the `emulator-qa` memory `reference_hand_pose_sequences`: `Q_UP_J` = hand orientation for which the palm normal from the joints is vertical (if it coincides with `Q_UP` = `(0, −0.2588, 0.9659, 0)`, use `Q_UP`); `D_JOINTS` = offset of the midpoint of the tips relative to the set pose at identity orientation (with `D_GRIP` = (−0.038; −0.003; +0.037) for `pinch=grip`); `PINCH_DIST_OPEN` and `PINCH_DIST_CLOSED` = distances between the tips with `select` 0 and 1. **The scenario is not run until they are written.** If the spike declared the fallback (joints not readable in IWER, D31), only branch B of steps 1 and 7 is run and the rest is "not applicable, fallback declared".
- `dev-params.local.txt` = `house=apartment-a&role=visitor&reset=1&seed=1&debug=1&pinch=auto`; standard setup; head at (0; 1.6; 0); `O` = (0; 1.35; −0.45).
- Menu poses as in S2.1: `L_MENU` = (−0.25; 1.15; −0.20), `R_MENU` = (0.25; 1.15; −0.20).

## Steps
1. **Source**: as soon as the session with hands has started, `browser_get_console_logs` with `pattern: "input source|feature|hands"` (with `since` of the load).
2. **Palm up from the joints**: `hand-left` at `L_MENU` with `Q_UP_J`, wait 0.9 s: `menu opened hand=left`; most recent `[soglia:hands]` line (every 2 s with `debug=1`): `source`, `palmDeg`. Palm down (`(0, 0, 0, 1)`), wait 1 s: `menu closed`. Same with `hand-right` at `R_MENU`.
3. **Pinch point from the joints**: menu open (left), `ecs_query_entity` on `ui:menu-item-chair` with `["Transform"]` → `I`; right hand at `I − D_JOINTS` with `(0, 0, 0, 1)`, `xr_select {device: "hand-right", duration: 0.3}` during which one `[soglia:hands]` line is read (`point=`); log `pattern: "menu item picked|furniture grabbed|hands"`. Repeat for `ui:menu-undo` (an item of the bar) and for a piece on the miniature (place a bed with `pinch=auto`: S2.2 with the constant `D_JOINTS`).
4. **Distance hysteresis**: with `select` 0 and then 1 on a still `hand-right`, two readings of `[soglia:hands]` (field `pinchDist`): open and closed. No app state change depends on the distance (the state stays `selectstart/selectend`): `pinch right start/end` coincide with `xr_set_select_value`.
5. **`pinch=grip` fallback**: rewrite `dev-params.local.txt` with `pinch=grip` (rest the same), reload, accept, hands; `input source=grip hand=left reason=param`; open the menu with `Q_UP` and take `ui:menu-item-chair` with the constant `D_GRIP` as in S2.2: everything as in M2.
6. **Fallback without joints**: with `pinch=auto`, `xr_set_connected` of the right hand to `false` (if the tool disconnects it): no `error`; reconnecting `true`: `input source=joints hand=right` returns (once per hand and session) and the menu works. If `xr_set_connected` does not remove the hand, the step is "not applicable" and `pinch=grip` (step 5) covers the path.
7. **Quick regression with `pinch=auto`**: S2.1 checks 2, 3 and 8a; S2.2 (place the bed in the bedroom, `furniture placed … status=valid`); S2.5 (rotation with touch and with the wrist, **verify the wrist poses with `D_JOINTS`**); S1.3 (room label). The constants of this scenario apply; the report states which of the two series (`D_GRIP` or `D_JOINTS`) was used where.
8. **No per-frame allocation (code review)**: `grep -n "getJointPose\|new Float32Array\|new Vector3\|new Quaternion" src/systems/hand-joints.ts src/systems/pinch-input.ts src/systems/palm-menu.ts` from the command line: no occurrence inside `update()`/`onXRFrame` (only `fillPoses` with preallocated arrays); `grep -n "fillPoses" src/` at least 1 occurrence.
9. Unfiltered log (`error`, `Cannot read`, `feature`); cleanup as in S3.0.

## Checks (all mandatory)
1. **Step 1 (branch A, joints available)**: `[soglia] input source=joints hand=left` and `… hand=right` (once per hand and session, no repetition every frame). **Branch B (declared fallback)**: `[soglia] input source=grip hand=left reason=no-joints` and `right`, and in the report the statement "joints not exercised in the emulator" with the entry in `qa/device/DEBT.md`; in this case checks 2-4 are "not applicable" and 5, 7, 8 and 9 apply.
2. **Palm (branch A)**: the menu opens on both hands with `Q_UP_J` (`menu opened hand=left`, `hand=right`), and closes with the palm down; `palmDeg` ≤ 10° in the up pose (sample value, warning if up to 15°) and ≥ 120° in the down one; the line `source=joints`. Openings and closings respect the thresholds (0.4 s, 0.25 s, 300 ms) as in S2.1 check 8.
3. **Pinch point (branch A)**: the item `ui:menu-item-chair` is taken with the constant `D_JOINTS` (`furniture grabbed furniture:chair#1 source=menu hand=right`), the `point=` field of the `[soglia:hands]` line is **≤ 0.02 m** from `I` (within the 5 cm radius for the grab) and the difference from the set pose is the constant `D_JOINTS` ± 0.005 m. For the item `ui:menu-undo` and for a piece on the miniature (frame within 1.5 cm of the footprint) the grab succeeds with the same constant.
4. **Distance (branch A)**: `pinchDist` with `select` 0 > 0.03 m and with `select` 1 < 0.03 m (hysteresis thresholds 0.02/0.03); the state `pinch right start/end` does not change source.
5. **`pinch=grip`**: `input source=grip hand=left reason=param`; the menu opens with `Q_UP`; the grab with `D_GRIP` succeeds as in M2 (`furniture grabbed …`). The fallback is identical to the M2 behavior.
6. **Disconnection**: no `error` or exception; on reconnection the source returns to `joints` (branch A) and the menu responds. If not applicable, the report says so.
7. **`pinch=auto` regression**: S2.1 checks 2, 3, 8a PASS; S2.2 PASS (bed in the bedroom, `status=valid`); S2.5 PASS with the recomputed wrist poses; S1.3: `Living room & kitchen · 23.9 m²` (text unchanged).
8. **Code review**: no occurrence of `getJointPose` or allocations inside `update()`/`onXRFrame` in the hand systems; at least one call to `fillPoses` guarded by feature detection (`typeof frame.fillPoses === 'function'`, `inputSource.hand`).
9. No `error` entries; no `Missing glyph info`; no `feature … unavailable` warning beyond those expected by branch B.
10. **Headset only** (high): `inputSource.hand` and `fillPoses` on the Quest; palm up reliable from the joint normal; precise pinch point at 1:20; fallback to `gripSpace` when the hand is lost; the IWER constants do not apply on the headset.

## Outcome
PASS if checks 1-9 of the applicable branch are met and the report declares the branch (A or B) · FAIL otherwise. Branch B is not a FAIL: it is the fallback planned by the 45-minute spike.

## To defer to the headset
"Joints" entry of M3 in `qa/device/DEBT.md` (high). Also update the M2 entry on `gripSpace` (R2) with the outcome.

## Changelog
- 2026-10-09: scenario created from the M3 plan (D31).
