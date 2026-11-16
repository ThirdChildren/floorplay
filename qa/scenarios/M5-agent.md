# S5.3 · Agent: info points and Furnish / Clear

> **Changelog 2026-11-06**: scenario created from the M5 plan (D57; T5.8–T5.10, T5.R3). The "interest map" (S5.2 of the first ROADMAP) is **cut**: no file.
> **Changelog 2026-11-06 (gate A/B)**: S5.3 was PASS (checks 1–11). Procedure adjustments: (1) **the pinch target on a diamond is the head, not the position of the `pin:info-00N` entity** (which is the tip): the head sits **0.027 m above** the tip (grab radius 0.02 m); with the hand on the tip the pinch is announced but opens nothing; use the height `y + 0.027` (for `pin:info-001`, head at world y = 1.437, `pinch-start point=-0.160,1.437,-0.390`) and the diamond calibration; (2) the Undo log after Clear is `undo action=stage id=clear` (after Furnish it is `id=furnish:scandinavian`); (3) `historyLength` after the sequence of step 7 is **2** (Furnish undone at step 6, then Clear, undone, Clear): H = 2 and it stays 2 after Clear on an empty house; (4) hint of the agent `home`: `Furnish sets up the house in one pinch. Undo brings it back.`, in B `Clear empties the house. Undo brings it back.`.
> **Changelog 2026-11-06 (outcomes of T5.8–T5.10)**: (1) the panel **closes after the action** with `issues panel closed via=stage`; (2) the undo is `undo action=stage id=furnish:scandinavian` and a Furnish after Undo gives ids with counters that are **never lowered** (`chair#5..8`, `nightstand#3/#4`); (3) **Clear on an empty house writes no history**; (4) the agent `home` has a **dedicated hint** (to be reported in the report, not a criterion); (5) refusals with `agent staging denied … reason=no-staging | role-not-allowed | no-catalog`; (6) **IWER calibration with `pinch=grip`**: the pinch point is `hand + (−0.029; +0.0015; +0.045)`, so to hit `T` the hand goes to `T + (0.029; −0.0015; −0.045)` (about 1 cm off from the M4 recipe `T − D_GRIP`, which stays valid for the 8 × 6 cm targets; for the diamonds, radius 2 cm, use this one); (7) the info points come from **a single request** shared with the seed, and B has none (no 404).

**Milestone**: M5 · **Type**: PC (IWER emulator via MCP `iwsdk-runtime`) · **`CLAUDE.md` rules**: 1, 7 ("Sample data"), 9, 10
Implementation prerequisites: T5.8–T5.10 (T5.R3 for check 1). See `docs/plans/M5.md`. Conventions: `qa/scenarios/M4-issue-create.md` (poses, recipes, Issues panel).

## Preconditions
- `dev-params.local.txt` = `house=apartment-a&role=visitor&reset=1&seed=1&debug=1&pinch=grip&time=2026-12-21T10:00`. Button `ui:issue-button-right` at (0.4347; 1.565; −0.5665); chips and panel controls are read with `ecs_query_entity` `["Transform"]` at each screen.
- Position of the info points in house coordinates: boiler `info-001` (2.3; 1.6→1.2; 4.8), washing machine (0.42; 0.85; 5.05), hob (0.4; 0.9; 2.2), roller shutter (6.8; 2.2→1.2; 0.1), glass of `win-living-1` (exact values read from the `Transform`s of `pin:info-00N`).

## Steps
1. **Visitor**: standard setup; log `pattern: "role|pins|issues"`; `ecs_find_entities` `^pin:` (→ only `pin:info-001`…`-005`), `^pin:issue-` (→ 0), `^ui:agent-` (→ 0); `ecs_query_entity` on `pin:info-001` with `["Transform"]`; `browser_screenshot` → attach (five cyan diamonds on the model).
2. **Tenant does not see them**: open the Issues panel (`ui:issue-button-right`), `ui:issue-role-tenant`, close; `ecs_find_entities` `^pin:`; log `pattern: "pins layer"`. Then `ui:issue-role-visitor` to go back.
3. **The Agent chip**: open the Issues panel as visitor; `ui_inspect` (texts of the chips); `ui:issue-role-agent`; `ui_inspect` of the agent `home`; `ecs_find_entities` `^ui:agent-` (→ `ui:agent-furnish`, `ui:agent-clear`); log `pattern: "role|issues"`.
4. **An info point**: close the panel (`ui:issue-close`); short pinch on `pin:info-001` (hand at `position + (0.029; −0.0015; −0.045)`, IWER calibration `pinch=grip`; the log `[soglia:hands] … event=pinch-start point=` gives the real point): log `pattern: "info|issues screen"`; `ui_inspect` (title `Info`, text `Condensing boiler.`, `Sample data`, all `fontSize` ≥ 2.4 cm); `ecs_find_entities` `^ui:issue-action-` (→ 0); `ui:issue-close`.
5. **Furnish**: reopen the panel (agent), pinch on `ui:agent-furnish`: log `pattern: "agent staging|furniture|state saved"`; `ecs_find_entities` `^furniture:` (→ 14); `[soglia:state]`; `browser_screenshot` → attach (the furnished house).
6. **Undo one step**: panel closed (it closes by itself after the action), open the `pinned` menu with `ui:menu-button-right`, pinch on `ui:menu-undo`: `ecs_find_entities` `^furniture:` (→ 0). Open the panel, `ui:agent-furnish` again (→ 14).
7. **Clear**: pinch on `ui:agent-clear`: log `pattern: "agent staging|furniture"`; `^furniture:` (→ 0); Undo from the menu: `^furniture:` (→ 14); pinch on `ui:agent-clear` again (→ 0); `[soglia:state]` (→ `historyLength` = H); reopen the panel and press `ui:agent-clear` **one more time on an empty house**: `[soglia:state]` (→ `historyLength` still H).
8. **Persistence**: `ui:agent-furnish` (→ 14), wait 1.5 s, rewrite the file **without** `reset=1` and **without** `role=` (`time=` and `debug=1` stay), reload: log `pattern: "role|state restored|agent"`; `^furniture:` (→ 14).
9. **Who cannot**: role `visitor` and `tenant` (chips): `ecs_find_entities` `^ui:agent-` (→ 0 in both).
10. **House B**: rewrite the file with `house=apartment-b&role=agent&reset=1&…`, reload: log `pattern: "issues seed|pins layer|agent"`; open the Issues panel: `ecs_find_entities` `^ui:agent-` (→ only `ui:agent-clear`), `^pin:` (→ 0).
11. Unfiltered log (`error`, `uncaught`, `Cannot read`, `reading 'add'`, `Missing glyph`); cleanup (select 0 on both, hands at rest, `xr_end_session`, delete `dev-params.local.txt`).

## Checks (all mandatory)
1. **Step 1**: `pins layer count=0 baseline=0 info=5 role=visitor`; 5 `pin:info-*` and **no** `pin:issue-*`; the cyan diamonds are not red/orange/green (distinct shape and color, visible from the screenshot); `pin:info-001` at (2.3; 1.2; 4.8) ± 0.02 (height limited to 1.2 m).
2. **Step 2**: with the role `tenant` `pins layer count=3 baseline=0 info=0 role=tenant` and **0** `pin:info-*`; going back to `visitor` again 5.
3. **Step 3**: the chips are four (`Visitor`, `Agent`, `Tenant`, `Landlord`) and **no** text `coming soon`; after `ui:issue-role-agent`: `role changed from=visitor to=agent source=ui`; the agent `home` has its hint (text reported in the report; in English); the controls `ui:agent-furnish` and `ui:agent-clear` exist; for the agent **no** `pin:issue-*` and 5 `pin:info-*`.
4. **Step 4**: `info opened id=info-001`, `issues screen=info`; the text contains `Condensing boiler.` and `Sample data`; **0** action controls; all texts ≥ 2.4 cm.
5. **Step 5**: `agent staging action=furnish style=scandinavian pieces=14`; 14 `furniture:*`; `state saved … pieces=14`; the panel closes (`issues panel closed via=stage`); no `error` line.
6. **Step 6**: the Undo removes **all** 14 pieces in one step (`undo action=stage id=furnish:scandinavian`), `^furniture:` → 0; the new Furnish brings back 14 with ids with **never lowered** counters: each `catalogId` restarts from a higher instance than before, for example `furniture:chair#5…#8` and `furniture:nightstand#3`/`#4` (no id reused).
7. **Step 7**: `agent staging action=clear pieces=0`; `^furniture:` → 0; Undo → 14; Clear on an empty house **does not** write history (`historyLength` equal to H before and after).
8. **Step 8**: on reload 14 pieces (`state restored pieces=14`) and role `agent` (`role set agent source=saved`).
9. **Step 9**: for `visitor` and `tenant` 0 `ui:agent-*` controls.
10. **Step 10**: `apartment-b` has no staging: **no** `ui:agent-furnish` (no dead button), `ui:agent-clear` present; `issues seed none reason=no-demo-file`, `pins layer count=0 baseline=0 info=0 role=agent`.
11. No `error` entry; no `Missing glyph`; no `reading 'add'`; "Sample data" is the only way in which sample data appear; no text in Italian.
12. **Headset only** (high): the diamonds can be read and grabbed at 1:20 with the fingers; Furnish without stutter (14 pieces).

## Outcome
PASS if checks 1–11 are met · FAIL otherwise.

## To defer to the headset
Entries "Info points" and "Furnish / Clear" of M5 in `qa/device/DEBT.md`.
