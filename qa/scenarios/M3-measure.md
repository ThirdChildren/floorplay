# S3.2 · Tape measure: measure the study window

> **REMOVED 2026-11-14 (UI fixes, `qa/reports/UI-FIX-2026-11-14.md`)**: the tape measure (Measure tab, `ui:measure-*`, `measure ...` log lines) no longer exists. This scenario is kept as history and is not run any more.

> **Changelog 2026-11-02** (starting point only, criteria unchanged; M3 gate, warning A-S3.2-1 in `qa/reports/M3-2026-10-10-B.md`): step 10: the zoom to 0.12 starts with the hands symmetric at **∓0.20 m** from the center (not ∓0.15: at 0.02–0.025 m from the marker `viewpoint:V1` the pinch entered the viewpoint) and ends at ∓0.60; the miniature stays at `O` (no 0.30 m shift) and the points `A1'`, `A2'` are recomputed at scale 0.12.

**Milestone**: M3 · **Type**: PC (IWER emulator via MCP `iwsdk-runtime`)
Implementation prerequisites: T3.13, T3.14, T3.5 (`measure` tab, `ui:menu-tab-measure`), T3.10 (`measure` claim). See `docs/plans/M3.md`, D36. Common conventions (poses, `D_GRIP`, `Q_UP`, `W(...)`, gate rule): `qa/scenarios/M3-persistence.md`.

## Preconditions
- `dev-params.local.txt` = `house=apartment-a&role=visitor&reset=1&seed=1&debug=1&pinch=grip`; standard setup; head at (0; 1.6; 0); `O` = (0; 1.35; −0.45); scale 0.05.
- Points (floor plan → world, `h` = 0.04, so y = Oy + 0.04 = 1.39): **study window** `win-study` on the wall `w-north` (z = 0), from x = 9.0 to x = 10.4: `A1` = W(9.0; 0) = (0.175; 1.39; −0.630), `A2` = W(10.4; 0) = (0.245; 1.39; −0.630). **Inner width of the bedroom** (inner faces of `w-living-bedroom`, x = 5.26, and of `w-bedroom-study`, x = 8.34): `B1` = W(5.4; 2.3) = (−0.005; 1.39; −0.515), `B2` = W(8.2; 2.3) = (0.135; 1.39; −0.515) (within 0.14 m of the plan from the faces, inside the snap radius of 0.24 m). **Free points** in the living room: `F1` = W(2.0; 2.3) = (−0.175; 1.39; −0.515), `F2` = W(3.0; 2.3) = (−0.125; 1.39; −0.515) (no corner, end or face within 0.24 m).
- Hand pose for a point `T`: `T − D_GRIP` = (Tx + 0.038; Ty + 0.003; Tz − 0.037), orientation `(0, 0, 0, 1)`; pinch = `xr_select {device: "hand-right", duration: 0.4}` (the point is taken 150 ms after the start, so the hand must not move for 0.3 s).
- Menu and tab: `hand-left` at `L_MENU` with `Q_UP`, wait 0.9 s; the tab `ui:menu-tab-measure` is read with `ecs_query_entity` `["Transform"]` and pressed with the right hand (grip correction).

## Steps
1. **Before**: `ecs_find_entities` with `^ui:measure-` (→ 0). Place a `chair` in the living room on `W(1.5; 3.0)` (S2.2: take from the menu, release), wait 0.5 s.
2. **Activate the tool**: open the menu, pinch on the `measure` tab; log `pattern: "menu|measure"`. Close the menu (palm down, wait 1 s). `ecs_find_entities` with `^ui:measure-hint$`, `ecs_query_entity` on `ui:measure-hint` with `["Transform"]`; `ui_inspect` on the panel for the text and `fontSize`.
3. **Study window**: pinch at `A1`, wait 0.5 s, pinch at `A2`, wait 1 s. Log `pattern: "measure"`; `ecs_find_entities` with `^ui:measure-`; `ecs_query_entity` on `ui:measure-label` with `["Transform"]`; `ui_inspect` on the label (text, `fontSize`); `browser_screenshot` → attach.
4. **Bedroom**: pinch at `B1`, pinch at `B2` (same rhythm). Log `pattern: "measure"`; `ui_inspect` of the label.
5. **Free points**: pinch at `F1`, pinch at `F2`. Log `pattern: "measure"`.
6. **The third pinch starts over**: after step 5 (complete measure), a single pinch at `A1`: log, `ecs_find_entities` with `^ui:measure-` (point 2, the tape and the label disappear).
7. **Priority with a piece and with the room**: with the tool active, pinch on the **center of the chair** `W(1.5; 3.0)` (poses of step 1): log `pattern: "measure|furniture|room"`; pinch in a room (`W(6.8; 2.3)`): no selection.
8. **The menu stays on top**: open the menu (left), pinch of the right hand on `ui:menu-undo` or on `ui:menu-tab-items` (with tool active): log `pattern: "menu|measure|undo"`.
9. **Exit**: with the `items` tab active (step 8) `ecs_find_entities` with `^ui:measure-`; log `pattern: "measure"`; then take a piece from the menu and place it: the grab works again.
10. **Scale 0.12 (informative)**: two-hand zoom up to 0.12 with hands symmetric around `O` at `y = Oy + 0.10`: starting targets (Ox ∓ 0.20; Oy + 0.10; Oz), ending targets (Ox ∓ 0.60; …), poses = target − `D_GRIP` (the two hands stay at ≥ 0.07 m from every `viewpoint:V*` marker; verify `miniature gesture start` and `miniature:root` still at `O`; if the center had moved, recompute with the root read). Points at scale 0.12 with the root at `O`: `A1'` = (Ox + 0.420; Oy + 0.04; Oz − 0.432) = (0.420; 1.39; −0.882) and `A2'` = (0.588; 1.39; −0.882), poses (0.458; 1.393; −0.919) and (0.626; 1.393; −0.919), reactivate `measure`, measure the window again with poses recomputed from `W` at the scale read (`O` + (plan − center)·0.12): the snap works with a smaller radius (0.10 m of plan); the outcome 140 ± 1 still applies.
11. Unfiltered log (`error`, `Cannot read`, `Missing glyph`); cleanup as in S3.0.

## Checks (all mandatory)
1. **Step 1**: 0 `ui:measure-*` entities; the chair is placed.
2. **Step 2**: lines `menu tab measure` and `measure start`; after closing the menu there is **1** `ui:measure-hint` with text `Pinch two points` (from `src/ui/strings.ts`, `fontSize` ≥ 2.4 cm, ≥ 0.52 m from the head, ≤ 30° from the axis, yaw-only) and no `ui:measure-point-*`, `-tape`, `-label` entity. No `room selected` or `furniture grabbed` for the pinch on the tab.
3. **Window (S3.2 of the ROADMAP)**: `measure point 1 plan=9.00,0.00 snap=opening-end target=window:win-study`, `measure point 2 plan=10.40,0.00 snap=opening-end target=window:win-study` (plan coordinates ±0.01), `measure result cm=140 a=9.00,0.00 b=10.40,0.00` with **139 ≤ cm ≤ 141** (exactly 140 expected). `ui:measure-point-1`, `ui:measure-point-2`, `ui:measure-tape` and `ui:measure-label` (a single one) exist, the label text is `140 cm` with `fontSize` ≥ 2.4 cm; the label is at ≥ 0.52 m from the head and at ≤ 30° from the axis. No `room selected` line, no `furniture grabbed`.
4. **Bedroom**: two `measure point` lines with `snap=wall-face` (or the equivalent label chosen by the implementation, cited in the report) and `measure result cm=308` with **307 ≤ cm ≤ 309**; the tape and the previous labels are replaced (at most 1 label, 1 tape).
5. **Free points**: `snap=free` for both and `cm=100` with **98 ≤ cm ≤ 102**.
6. **Third pinch**: new `measure point 1 …`, **0** `ui:measure-point-2`, **0** `ui:measure-tape`, **0** `ui:measure-label`; only `ui:measure-point-1` exists.
7. **Priority**: the pinch on the chair does **not** produce `furniture grabbed` but a `measure point …` line; the pinch in the room does not produce `room selected`. No new `furniture` line.
8. **The menu stays on top**: the pinch on `ui:menu-undo` or on the tab produces the menu line (`undo …` / `menu tab items`) and **no** `measure point`.
9. **Exit**: after `menu tab items` the line `measure end` exists, **0** `ui:measure-*` entities (also `ui:measure-hint`), and a grab from the menu produces `furniture grabbed … source=menu` (no "hidden" disabled grab).
10. **Scale 0.12**: `cm=140` ± 1 (warning if outside, because it depends on pose precision; the radius is in world meters: the more you zoom in, the more precise).
11. No `error` entries and no `Missing glyph info`; the value is always an integer (no `NaN`, no decimals in the `measure result` lines).

## Outcome
PASS if checks 1-9 and 11 are met (10 is informative) · FAIL otherwise.

## To defer to the headset
Precise freehand measure at 1:20 (1 cm on the miniature = 20 cm real, closing fingers moves the point), snap to edges and windows with real fingers, readability of the label and tape at 0.5-0.8 m, comfort of switching tools (M3 entry in `qa/device/DEBT.md`). At real scale the tape measure works only with T3.15 (distance grab): without it, "real scale: miniature only" is declared.

## Changelog
- 2026-10-09: scenario created from the M3 plan (D36).
