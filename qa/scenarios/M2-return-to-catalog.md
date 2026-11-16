# S2.7 · A piece of furniture left outside the miniature returns to the catalog

**Milestone**: M2 · **Type**: PC (IWER emulator via MCP `iwsdk-runtime`)
Implementation prerequisites: T2.7, T2.12, T2.13, T2.15 (see `docs/plans/M2.md`, D14 and D17).

## Preconditions
- As S2.2: `dev-params.local.txt` = `house=apartment-a&role=visitor&reset=1&seed=1&debug=1`, reload, accept, hands, head (0; 1.6; 0), O from the last `miniature placed` line, menu open (`hand-left` at `L_MENU` with `Q_UP`, held up). `W(px, pz)` as in S2.2.
- Points (O = (0; 1.35; −0.45), y = 1.39): **P1** = `W(6.8; 1.30)` = (0.065; 1.39; −0.565); **POUT1** = `W(14; 3.6)` = (0.425; 1.39; −0.450) (on the base but outside the house: plan x 14 > 11); **POUT2** = (0.60; 1.39; −0.450) (in the air beyond the edge of the base, radius 0.45 m).

## Steps
1. **New piece released outside**: grab `ui:menu-item-bed-double` (S2.2, steps 2–3), `xr_animate_to` to **POUT1**, wait 1 s. In flight: `ecs_query_entity` on `furniture:bed-double#1` with `["Furniture"]`; `ecs_find_entities` with `^ui:reason-` and `ecs_query_entity` on the label with `["Transform"]` (check 8). Release, wait 0.5 s. Log `pattern: "furniture|undo"`; `ecs_find_entities` with `^furniture:`; state.
2. Pinch on `ui:menu-undo` (S2.4, step 3). Log.
3. **Piece of the miniature taken outside**: place the bed at **P1** (S2.2, steps 2–5); grab it from its center `W(6.8; 1.125)` = (0.065; 1.39; −0.574), `xr_animate_to` to **POUT1**, wait 1 s, in flight `Furniture`; release. Log `pattern: "furniture|undo"`; `ecs_find_entities` with `^furniture:`; state.
4. **Undo the return**: pinch on `ui:menu-undo`. Log; `ecs_find_entities`; `Furniture` of the bed; state.
5. **Outside the base, in the air**: grab `ui:menu-item-armchair`, `xr_animate_to` to **POUT2**, release. Log; `ecs_find_entities`; state.
6. `browser_get_console_logs` without a filter (look for `error`). `browser_screenshot` at step 1 in flight (red outline outside the house).

## Checks (all mandatory)
1. Step 1 (in flight, hand on the base outside the house): `Furniture.status` = `invalid`, `outline` = `red`, reason `outside-house` (line `furniture status furniture:bed-double#1 status=invalid reasons=outside-house`). After the release: line `[soglia] furniture returned furniture:bed-double#1 from=menu`; **0** `^furniture:` entities; `furniture` `[]`; `nextInstance` **not** consumed (`{}`) and `historyLength` 0; no `furniture placed` line.
2. Step 2: `[soglia] undo empty` (the return of a new piece is not an undoable action).
3. Step 3: after the release outside `[soglia] furniture returned furniture:bed-double#1 from=model`; **0** `^furniture:` entities; `furniture` `[]`; `historyLength` 2 (placement + removal).
4. Step 4: `[soglia] undo action=remove id=furniture:bed-double#1`; the entity `furniture:bed-double#1` **exists again with the same id**, at (6.80; 1.125) ± 0.01, `status` `valid`; `historyLength` 1.
5. Step 5: release with the hand beyond the edge of the base (POUT2): `furniture returned furniture:armchair#1 from=menu`; no new `furniture:armchair#*` entity; `furniture` contains only the bed.
6. No `room selected` line, no `miniature gesture start`, no `furniture limit reached`; no `error` entry.
7. Screenshot of step 1 attached and described in words (the piece in hand above the base, outside the house, with a red outline).

8. **"Outside the house" reason label (D27)**: at step 1 (in flight) **1** `ui:reason-bed-double#1` entity exists and the line `[soglia] reason shown furniture:bed-double#1 "Outside the house"`; at **0.52 m or more from the head** (`LABEL_DISTANCE_MARGIN`; in rerun 2 at ~0.60 m for a piece at 14 m of plan), **entirely inside the central 30° cone** (`acos(−dz / |d|)` ≤ 30°, `d` = position − (0; 1.6; 0), from the `Transform`: the label is anchored in the cone even if the piece is outside), yaw-only, and in the screenshot the text is **fully readable** (not cut off by the right edge of the view, as it was in the previous rerun); after the release the line `reason hidden furniture:bed-double#1` and **0** `ui:reason-*` entities. Numeric deviations = warnings; cut-off text = FAIL (rule 8).

## Outcome
PASS if checks 1–6 and 8 are met · FAIL otherwise.

## To defer to the headset
Whether "leaving it outside" is a natural gesture, understandable without explanations, and whether the distance from the edge of the miniature beyond which the piece returns is comfortable (M2 entries in `qa/device/DEBT.md`).

## Changelog
- 2026-10-06 (gate rerun 2, `qa/reports/M2-2026-10-06-rerun2.md`): **new check 8** (and reading of `ui:reason-*` at step 1): the "Outside the house" label of the piece held outside the house is at ≥ 0.52 m, **entirely inside the 30° cone** (anchored in the cone, at ~0.60 m, bearing ≤ 30°), yaw-only and fully readable — reason: in rerun 2 it was cut off by the right edge of the view (W2); the code now anchors it in the cone. Outcome updated to 1–6 and 8.
