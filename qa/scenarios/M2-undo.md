# S2.4 · Undo from the menu

**Milestone**: M2 · **Type**: PC (IWER emulator via MCP `iwsdk-runtime`)
Implementation prerequisites: T2.7, T2.12, T2.13, T2.15 (see `docs/plans/M2.md`, D17).

## Preconditions
- As S2.2: `dev-params.local.txt` = `house=apartment-a&role=visitor&reset=1&seed=1&debug=1`, reload, accept, hands, head (0; 1.6; 0), O from the last `miniature placed` line, menu open (`hand-left` at `L_MENU` with `Q_UP`, held up). `W(px, pz)` as in S2.2.
- Points (O = (0; 1.35; −0.45), y = 1.39): **P1** = `W(6.8; 1.30)` = (0.065; 1.39; −0.565) → bed snapped to (6.80; 1.125); **PB1** = `W(6.0; 3.0)` = (0.025; 1.39; −0.480) → bed snapped to (6.06; 3.00).

## Steps
1. Action 1 (placement): grab `ui:menu-item-bed-double` and release it at **P1** (sequence of S2.2, steps 2–5). Read the latest `[soglia:state]` line and `ecs_find_entities` with `^furniture:`.
2. Action 2 (move): `hand-right` at the center of the bed `W(6.8; 1.125)` = (0.065; 1.39; −0.574), orientation `(0, 0, 0, 1)`, select 1, `xr_animate_to` to **PB1**, select 0, wait 0.5 s. State and log.
3. **Undo 1**: `ecs_query_entity` on `ui:menu-undo` (Transform) → `U`; `hand-right` at `U` (orientation `(0, 0, 0, 1)`), `xr_select {device: "hand-right", duration: 0.2}`; wait 0.5 s. `browser_get_console_logs` with `pattern: "undo|furniture"`; `ecs_query_entity` on `furniture:bed-double#1` with `["Furniture"]`; state.
4. **Undo 2**: same pinch on `ui:menu-undo`. Log, `ecs_find_entities` with `^furniture:`, state.
5. **Undo 3** (empty history): same pinch. Log, `ecs_find_entities`, state.
6. **New placement after the undo**: grab `ui:menu-item-bed-double` again and release it at **P1**. Log `pattern: "furniture placed"`, `ecs_find_entities`, state.
7. Open and re-read: `browser_get_console_logs` without a filter (look for `error`).

## Checks (all mandatory)
1. Step 1: `furniture` has 1 element (bed at (6.80; 1.125) ± 0.01), `historyLength` 1, `nextInstance` `{"bed-double":2}`.
2. Step 2: bed at (6.06; 3.00) ± 0.02, `historyLength` 2.
3. Step 3: line `[soglia] undo action=move id=furniture:bed-double#1`; the bed is back at (6.80; 1.125) ± 0.01 (`Furniture.x`, `z`) and `historyLength` 1; the entity `furniture:bed-double#1` still exists (same id).
4. Step 4: line `[soglia] undo action=place id=furniture:bed-double#1`; **0** `furniture:*` entities; `furniture` = `[]`; `historyLength` 0.
5. Step 5: line `[soglia] undo empty`; state unchanged (`furniture` `[]`); **no error**.
6. Step 6: the new bed has id **`furniture:bed-double#2`** (the `nextInstance` counter does not go back) and `furniture placed furniture:bed-double#2 room=bedroom x=6.80 z=1.13 rot=0 status=valid`; `nextInstance` `{"bed-double":3}`.
7. Undo does not move, scale or rotate the miniature (scale 0.05, yaw 0 in every state line) and does not produce `room selected`.
8. No `error` entry.

## Outcome
PASS if checks 1–8 are met · FAIL otherwise. If the pinch on `ui:menu-undo` produces no `undo …` (nor `undo empty`), repeat **only once** with the hand at ≤ 0.02 m from the center of the entry and report the difference.

## To defer to the headset
`Undo` target large enough for a real pinch at 0.5 m, no involuntary undo (M2 entries in `qa/device/DEBT.md`).
