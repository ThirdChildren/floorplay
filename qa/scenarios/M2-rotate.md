# S2.5 · 90° snap rotation (wrist and tap with the other hand)

**Milestone**: M2 · **Type**: PC (IWER emulator via MCP `iwsdk-runtime`)
Implementation prerequisites: T2.6, T2.13, T2.14 (see `docs/plans/M2.md`, D13 and D19).

## Preconditions
- As S2.2: `dev-params.local.txt` = `house=apartment-a&role=visitor&reset=1&seed=1&debug=1`, reload, accept, hands, head (0; 1.6; 0), O from the last `miniature placed` line, menu open (`hand-left` at `L_MENU` with `Q_UP`, held up). `W(px, pz)` as in S2.2.
- Bed placed as in S2.2 at **P1** = (0.065; 1.39; −0.565) → (6.80; 1.125) rot 0. Center of the bed in world: `C0` = (0.065; 1.39; −0.574).
- Convention (D13/D19): `rotationDeg` clockwise seen from above; the hand turns like the piece; relative to the grab (`rotationDeg = initial − quantized twist`, twist + = counterclockwise). Yaw-only quaternions: −30° `(0, −0.2588190, 0, 0.9659258)`, −60° `(0, −0.5, 0, 0.8660254)`, −90° `(0, −0.7071068, 0, 0.7071068)`, +90° `(0, 0.7071068, 0, 0.7071068)`.
- Note: `xr_set_transform` always requires `orientation`; if `xr_animate_to` accepts `orientation` (to be checked, `docs/plans/M2.md` "Spike outcomes") use it with 0.4 s per leg in place of the three `xr_set_transform`.

## Steps
1. Place the bed at **P1** (S2.2, steps 2–5). Read `furniture placed`.
2. **Wrist, clockwise**: `hand-right` at `C0` with orientation `(0, 0, 0, 1)`, select 1, wait 0.3 s (log `furniture grabbed … source=model`). Then, **without moving the position**, three `xr_set_transform` of `hand-right` with the orientations −30°, −60°, −90°, with 0.3 s wait after each. After each: `browser_get_console_logs` with `pattern: "furniture rotated"` and `ecs_query_entity` on the bed with `["Furniture"]`. `browser_screenshot` after −90° (rotated bed, preview outline).
3. Release (select 0, wait 0.5 s). Log `furniture placed`, `ecs_query_entity` with `["Furniture"]`, state.
4. **Wrist, counterclockwise**: grab the bed again at its current center `W(6.8; 0.925)` = (0.065; 1.39; −0.584), orientation `(0, 0, 0, 1)`, select 1; `xr_set_transform` with +30°, +60°, +90° (same position, 0.3 s each); release. Log and `Furniture`.
5. **Tap with the other hand**: grab the bed again (center `W(6.8; 1.125)`), select 1 with the right hand; `xr_select {device: "hand-left", duration: 0.2}`, wait 0.4 s, log `furniture rotated`; second `xr_select` of the left hand, wait 0.4 s, log; release the right hand. Log `furniture placed`, `Furniture`, state.
6. With the bed released: **check** that the free-hand tap is not a grab: `xr_select {device: "hand-left", duration: 0.2}` on the position of the bed with the right hand at rest → `furniture grabbed` **appears** (it is a normal grab with the left hand, source=model) and must be released with select 0 without moving it; note the behavior (does not decide the outcome).
7. `browser_get_console_logs` without a filter (look for `error`).

## Checks (all mandatory)
1. Step 2: after −30° **no** `furniture rotated` line (below the 50° threshold); after −60° `[soglia] furniture rotated furniture:bed-double#1 rot=90`; after −90° no other line (stays 90); in flight `Furniture.rotationDeg` = 90 and `outline` = `green`.
2. Step 3: `furniture placed furniture:bed-double#1 room=bedroom x=6.80 z=0.93 rot=90 status=valid` (z = 0.925 ± 0.02: with the rotated footprint 2.0 × 1.6 the north side snaps to the wall at z = 0.125 with the center at 0.925); `Furniture.rotationDeg` = 90 and `status` = `valid`; `historyLength` 2.
3. Step 4: from 90° with the hand rotated 90° counterclockwise the rotation returns to **0**: line `furniture rotated … rot=0` after +60° and `furniture placed … x=6.80 z=1.13 rot=0 status=valid`.
4. Step 5: first tap `rot=90`, second tap `rot=180`; `furniture placed … x=6.80 z=1.13 rot=180 status=valid` (the 180° footprint is the same as the 0° one); **no** `furniture grabbed` produced by the taps of the other hand, no `miniature gesture start`, no `room selected`.
4b. Four consecutive taps bring back the starting rotation (0 → 90 → 180 → 270 → 0): repeat the taps with the right hand holding and read the `rot=…` lines (optional check if time is short; it must be declared in the report).
5. Step 6: the grab with the left hand is a normal grab (the outcome is noted); the release without movement does not change the state and does not create a useless history entry (`historyLength` unchanged or +1 with the same state: the report says which).
6. No `error` entry; scale 0.05 and yaw 0 unchanged in the store.
7. Screenshot of step 2 attached; the report describes in words the orientation of the bed (along the x axis when rotated by 90°) and the green outline.

## Outcome
PASS if checks 1–4 and 6 are met · FAIL otherwise. If `furniture rotated` does not appear after −60°, repeat **only once** with −75° before −90° and report the actual value of the threshold (it does not decide the outcome if the tap of the other hand passes).

## To defer to the headset
Reliability of the wrist (50°/40° hysteresis) with a real hand, comparison with the tap of the other hand, comfort of rotating while seated (M2 entries in `qa/device/DEBT.md`).
