# S1.2 · Two-hand pinch: zoom, rotation, limits

> **Changelog 2026-11-02** (starting points only, criteria unchanged; M3 gate, `qa/reports/M3-2026-11-02-C2-m1-regressions.md`): since M3 the markers `viewpoint:V1/V2/V3` sit at (−0.130; −0.465), (0.065; −0.470), (0.215; −0.535) at scale 0.05 and move with the miniature; a pinch within 0.04 m of a marker enters the viewpoint instead of starting the zoom (the hands at ∓0.15 fell 0.025 m from `V1`). The distances of the hands from the centre become: phase A **∓0.20 → ∓0.333**, phase B **radius 0.27**, step 10 **∓0.27 → ∓0.75**, step 11 **∓0.40 → ∓0.02**, phase D **∓0.17** (all at ≥ 0.05 m from the markers, recomputed on the starting scale of each phase). Head at (0; 1.6; 0), `O` = (0; 1.35; −0.45), `pinch=grip` (as M2/M3). The hands stay symmetric around the centre: check 4 holds to the letter.

**Milestone**: M1 · **Type**: PC (IWER emulator via MCP `iwsdk-runtime`)
Implementation prerequisites: T1.9, T1.11, T1.12 (see `docs/plans/M1.md`).

## Preconditions
- As S1.1: headless runtime, `dev-params.local.txt` = `house=apartment-a&role=visitor&reset=1&seed=1&debug=1&pinch=grip`, `browser_reload_page`.
- `xr_set_transform` headset at (0; 1.6; 0) (as the emulator puts it by default); `xr_accept_session`; `xr_set_input_mode` with `mode: "hand"`; wait 2 s.
- Get **O = (Ox; Oy; Oz)** from the last line `[soglia] miniature placed …` (expected (0; 1.35; −0.45) with the head at 1.6 m). The hands stay at height **y = Oy + 0.05**. Rotation convention: positive `yawDeg` = counter-clockwise rotation seen from above around +Y (like `rotation.y` in Three.js); the right hand moving away from the user (−z) while the left one comes closer is equivalent to +90°.
- **Note (T2.17a, hands relative to the centre)**: since T2.17a the midpoint of the hands is the **pivot** of the gesture (`docs/plans/M2.md`, D28): hands symmetric about the centre of the miniature do not move it, hands shifted to one side move it when zooming. In IWER the pinch point is the `gripSpace`, which sits about 5 cm from the pose set with `xr_set_transform`: with orientation `(0, 0, 0, 1)` the grip sits at **pose + (−0.038; −0.003; +0.037)** (settled, about 150 ms after the pinch). To have hands really symmetric around O, every pose of phases A–D must be set to **target − (−0.038; −0.003; +0.037)**, i.e. (x + 0.038; y + 0.003; z − 0.037) (also valid for the stops of `xr_animate_to`). Without this correction the ×2.4 zoom moves the centre by about 7 cm and check 4 does not hold.
- Note on the calls: `xr_animate_to` queues the animations one after the other; the result depends only on the final poses of each stop. Duration 0.5 s per stop, one call per hand, in the order left → right.

## Steps

### Phase A · zoom
1. `xr_set_transform`: `hand-left` at (Ox − 0.20; y; Oz), `hand-right` at (Ox + 0.20; y; Oz). Distance between the hands 0.40 m.
2. `xr_set_select_value` `hand-left` = 1, then `hand-right` = 1 (pinch held).
3. `browser_get_console_logs` with `pattern: "gesture"` → there must be `miniature gesture start`.
4. `xr_animate_to`: `hand-left` to (Ox − 0.333; y; Oz), then `hand-right` to (Ox + 0.333; y; Oz). Final distance 0.667 m (ratio 1.667).
5. `xr_set_select_value` `hand-left` = 0, `hand-right` = 0 (release).
6. `browser_get_console_logs` with `pattern: "gesture end|room selected"`.

### Phase B · rotation (starting from the end of phase A; let s1 be the scale read in the `gesture end` line of phase A)
7. `xr_set_transform`: `hand-left` at (Ox − 0.27; y; Oz), `hand-right` at (Ox + 0.27; y; Oz) (after phase A the miniature is larger and `V1` is 0.03 m from ∓0.20: that is why the radius is 0.27); then `xr_set_select_value` to 1 on both.
8. Stops, one `xr_animate_to` call per hand (left first, then right), duration 0.5 s:
   - 30°: left (Ox − 0.234; y; Oz + 0.135), right (Ox + 0.234; y; Oz − 0.135)
   - 60°: left (Ox − 0.135; y; Oz + 0.234), right (Ox + 0.135; y; Oz − 0.234)
   - 90°: left (Ox; y; Oz + 0.270), right (Ox; y; Oz − 0.270)
9. Release (select at 0 on both). `browser_get_console_logs` with `pattern: "gesture end"`, then `browser_screenshot` → attach (miniature enlarged and rotated by 90°).

### Phase C · limits
10. Hands at (Ox ∓ 0.27; y; Oz), pinch, `xr_animate_to` to (Ox ∓ 0.75; y; Oz) (ratio ≈ 2.8: from the scale of phase B, 0.0833, it exceeds 0.12 and the scale stops at the limit), release. Read `gesture end`.
11. Hands at (Ox ∓ 0.40; y; Oz) (at 0.12 the marker `V2` is at (0.156; −0.498): the hands at ∓0.40 are 0.24 m away from it), pinch, `xr_animate_to` to (Ox ∓ 0.02; y; Oz) (ratio 0.05), release. Read `gesture end`.

### Phase D · two-hand translation (T2.17a, decision D28; at any scale, here from the scale of phase C)
D1. Hands at (Ox ∓ 0.17; y; Oz) (at scale 0.03 the markers are close to the centre: `V3` is 0.065 m from the right hand), with the grip correction of the note above (centre between the hands = centre of the miniature), pinch on both, wait 0.3 s.
D2. `xr_animate_to`: `hand-left` to (Ox + 0.03; y; Oz), then `hand-right` to (Ox + 0.37; y; Oz) (distance unchanged 0.34, midpoint **+0.20**); release. `browser_get_console_logs` with `pattern: "\\] miniature (gesture end|translated)"`.
D3. `ecs_query_entity` on `miniature:root` with `["Transform"]`.
D4. Limit: repeat D1–D2 with a midpoint shift of **+0.60** (from a position already at +0.20); **the hands start centred on the new centre** (Ox + 0.20 ∓ 0.17: at scale 0.03 the pinches at ∓0.15 from Ox are outside the grab radius and the gesture starts late with the wrong scale); read `translated`.

### Closing
12. `scene_get_runtime_hierarchy` + `scene_get_object_transform` on `miniature:root` (global position).
13. `browser_get_console_logs` with no filter (look for `error`).
14. Final release of both hands (select at 0) and `xr_end_session`.

## Checks (all required)
1. Phase A: `miniature gesture start` and `miniature gesture end …` exist; the final scale s1 is **0.0833 ± 10 %**, i.e. between 0.075 and 0.092; `tiltDeg` ≤ 3.
2. Phase B: `yawDeg` = **+90 ± 10** (between 80 and 100); the final scale is s1 ± 3 %; `tiltDeg` ≤ 3.
3. Phase C: after step 10 `scale` ≤ 0.1201 (upper limit 0.12); after step 11 `scale` ≥ 0.0299 (lower limit 0.03). No NaN value in any line.
4. Global position of `miniature:root` after phases A–C: within 0.02 m of O (the miniature does not move; with the hands symmetric around the centre, see the T2.17a note). After phase D the position is the one of D3 (check 9).
5. During the three phases **no** `room selected` line appears (pinching with two hands on the miniature does not select rooms).
6. With `debug=1`, the last `[soglia:state]` line has `miniature.scale` and `miniature.yawDeg` equal (± 0.001 and ± 0.1) to those of the last `gesture end`.
7. No `error` entry in the console; no locomotion (the head position read with `xr_get_transform` is unchanged).
8. Screenshot of step 9 attached; the report says in words that the miniature is larger and rotated, with no flips.

9. Phase D (T2.17a): after D2 there is `[soglia] miniature translated x=0.200 z=0.000 source=two-hands` (± 0.01); `miniature:root` is at (Ox + 0.20; Oy; Oz) ± 0.01 with the **height Oy unchanged** (± 0.001), scale and `yawDeg` unchanged; no `room selected` line. After D4 the centre is **0.30 m** from the anchor (the `translated` line has `sqrt(x² + z²)` ≤ 0.301), not 0.80.

## Result
PASS if checks 1–7 and 9 are met · FAIL otherwise. If the grab does not start (no `gesture start`), repeat **only once** with the hands moved up to 0.05 m towards the centre of the miniature and report the offset in the report. If after the correction the grab does not start: FAIL.

## To defer to the headset
Reliability of the real two-hand pinch, absence of jerks, grab thresholds and dead zone, comfort of the zoom limits (M1 rows in `qa/device/DEBT.md`).

## Changelog
- 2026-10-06 (T2.17a): added **phase D** (two-hand translation, check 9) and the **note on the pivot and the IWER grip**; check 4 holds for phases A–C with the hands symmetric around the centre (reason: the two-hand gesture now moves the centre of the miniature around the midpoint of the hands, D28; measured in IWER: without correcting the grip the zoom from 0.05 to 0.12 moves the centre by (+0.053; −0.052) m, with the correction by 0.000 m).
