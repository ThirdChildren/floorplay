# S2.2 · Place the bed

**Milestone**: M2 · **Type**: PC (IWER emulator via MCP `iwsdk-runtime`)
Implementation prerequisites: T2.3, T2.5, T2.6, T2.7, T2.9, T2.10 – T2.13 (see `docs/plans/M2.md`, D13 – D17, "QA strategy" section).

## Preconditions
- `dev-params.local.txt` = `house=apartment-a&role=visitor&reset=1&seed=1&debug=1`; `browser_reload_page`; `xr_accept_session`; `xr_set_input_mode` with `mode: "hand"`; wait 2 s; head at (0; 1.6; 0).
- **O** = (Ox; Oy; Oz) from the last `miniature placed` line (expected (0; 1.35; −0.45), scale 0.05, yaw 0). Conversion: `W(px, pz) = (Ox + (px − 5.5)·0.05; Oy + 0.04; Oz + (pz − 3.6)·0.05)`.
- Menu: `L_MENU`, `Q_UP` as in `qa/scenarios/M2-palm-menu.md` ("Open the menu" sequence). The left hand stays up for the whole scenario.
- Points (with O = (0; 1.35; −0.45), hands at y = 1.39):
  - **P1** = `W(6.8; 1.30)` = (0.065; 1.39; −0.565) → bedroom, at 0.175 m real from the north wall.
  - Expected center of the bed after the snap: (6.80; 1.125) in plan = `W` (0.065; 1.39; −0.574).

## Steps
1. Open the menu (`xr_set_transform` `hand-left` at `L_MENU` with `Q_UP`, wait 0.9 s). `ecs_find_entities` with `namePattern: "^furniture:"` (must be 0). `browser_get_console_logs` with `pattern: "furniture|undo"`.
2. `ecs_query_entity` on `ui:menu-item-bed-double` with `components: ["Transform"]` → position `I`.
3. **Grab**: `xr_set_transform` `hand-right` at `I` with orientation `(0, 0, 0, 1)`; `xr_set_select_value` `hand-right` = 1; wait 0.3 s. `browser_get_console_logs` with `pattern: "furniture grabbed"`; `ecs_find_entities` with `^furniture:`; `ecs_query_entity` on the entity found with `components: ["Furniture"]`.
4. **Carry**: `xr_animate_to` `hand-right` to **P1** (0.8 s); wait 1 s. `ecs_query_entity` with `["Furniture"]` (in-flight state) and `browser_get_console_logs` with `pattern: "furniture status"`. `browser_screenshot` → attach (bed in hand above the bedroom, green outline on the floor).
5. **Release**: `xr_set_select_value` `hand-right` = 0; wait 0.5 s. `browser_get_console_logs` with `pattern: "furniture placed|room selected|gesture"`; `ecs_query_entity` with `["Furniture", "Transform"]`; latest `[soglia:state]` line.
6. `browser_screenshot` → attach (bed resting against the north wall, no outline).
7. Hand at rest (`hand-right` far away, select 0), close the menu (palm down). `browser_get_console_logs` without a filter (look for `error`).

## Checks (all mandatory)
1. Step 1: **0** `furniture:*` entities.
2. Step 3: line `[soglia] furniture grabbed furniture:bed-double#1 source=menu hand=right`; exactly **1** `furniture:bed-double#1` entity; `Furniture.catalogId` = `bed-double`, `instance` = 1, `phase` = `held`, `hand` = `right`.
3. Step 4 (in flight, hand above the miniature): `Furniture.status` = `valid`, `outline` = `green`, `phase` = `held`; there is **no** `miniature gesture start` line (a single pinch, and its owner is the furniture piece) nor `room selected`.
4. Step 5: line `[soglia] furniture placed furniture:bed-double#1 room=bedroom x=6.80 z=1.13 rot=0 status=valid` (x = 6.80 ± 0.01; **z = 1.125 ± 0.01**: the north side of the bed is flush with the inner face of the north wall, 0.125 m); `Furniture.phase` = `placed`, `status` = `valid`, `outline` = `none`, `roomId` = `bedroom`; local `Transform` (if reported as local) ≈ (6.8; 0; 1.125).
5. Step 5, store (`[soglia:state]`): `furniture` has **1** element with `id` `furniture:bed-double#1`, `catalogId` `bed-double`, `x` 6.8 ± 0.01, `z` 1.125 ± 0.01, `rotationDeg` 0, `roomId` `bedroom`; `nextInstance` `{"bed-double":2}`; `historyLength` 1; `miniature.scale` 0.05 and `yawDeg` 0 (not touched).
6. No `room selected` / `room deselected` line in the whole scenario (the pinch that grabbed the piece did not select the room) and **no** `pan start` line nor `miniature translated` (the pinch that grabbed the piece did not move the miniature: priority furniture piece > `pan`, D15/D28); `miniature.offset` stays `[0,0]` in the state.
7. No `error` entry; no `Missing glyph info`.
8. Screenshots of steps 4 and 6 attached; the report describes in words: bed in hand with green outline (step 4) and bed resting against the north wall with no outline (step 6).

## Outcome
PASS if checks 1–7 are met · FAIL otherwise. If the grab does not start (no `furniture grabbed`), repeat **only once** with the hand at ≤ 0.02 m from the center of the entry and report the difference; then FAIL. If `x`/`z` differ by more than 0.01 m but the piece is `valid` and in the right room, report the real values: FAIL only if the bed is not in `bedroom` or is not valid.

## To defer to the headset
Natural grab with a real hand, tremor while carrying, comfort of the wall snap (0.30 m) at 1:20 scale, visibility of the green outline at 0.5–0.8 m (M2 entries in `qa/device/DEBT.md`).

## Changelog
- 2026-10-05: check 6 extended: no `pan start` line nor `miniature translated` and `miniature.offset` unchanged — reason: user decision 2 (the translation of the miniature, even with one hand, must not conflict with grabbing furniture; arbitration D15/D28).
- 2026-10-06: step 1, wait after opening the menu from 0.6 s to 0.9 s — reason: the palm must stay up at least 0.4 s (gate rule, `src/logic/menu-thresholds.ts`); consequence of the same change in S2.1 V8.
