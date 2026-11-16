# S4.4 · Resume: role, issues, parked pieces, lifecycle

> **Changelog 2026-11-02**: scenario created from the M4 plan (D41, D44, T4.R4, T4.11). It extends S3.0 (`qa/scenarios/M3-persistence.md`, which stays valid) with role and issues.

> **Changelog 2026-11-06 (M5 gate, F-C2-2)**: since T5.9 with role `visitor` (also the default without `role=` and without saved state) `^pin:` gives the 5 `pin:info-*`; in this scenario the roles are `tenant`/`landlord`, so the `^pin:` counts (3 and 4) do not change. Where a count under `visitor` is read it must be read as `^pin:(issue|baseline)` = 0 and `pin:info-*` = 5. In `apartment-b` (phase 5) no demo file: `^pin:` = 0 also for the visitor.

**Milestone**: M4 · **Type**: PC (IWER emulator via MCP `iwsdk-runtime`) · **`CLAUDE.md` rule**: 4 (quick start, clean pause and resume)
Implementation prerequisites: T4.2, T4.R4, T4.11 (T4.4–T4.9 for the pins and the panel). Conventions: `qa/scenarios/M4-issue-create.md` and `qa/scenarios/M3-persistence.md`.

**Tool limits** (as S3.0): no MCP tool reads `localStorage` or changes `visibilityState`; the proof is the **reload** plus the lines `state saved` / `state restored` / `issues restored`; suspension is simulated with `F8`/`F9` (`debug=1`), which **simulate** the event (the report declares it).

## Preconditions
- Starting parameter file: `house=apartment-a&role=tenant&reset=1&seed=1&debug=1&pinch=grip&time=2026-11-04T10:00`. Every phase change rewrites the indicated file, `browser_reload_page`, `xr_accept_session`, `xr_set_input_mode hand`, wait 2.5 s.

## Steps
1. **Phase 1 · save role and issues**. With the starting file: create `issue-014` (S4.1 steps 2–4); place a `chair` in the living room at `W(1.5; 3.0)` (S2.2); wait **1.5 s**. Log `pattern: "state saved|issues|role|furniture placed"`; `ecs_find_entities` `^pin:` (→ 4), `^furniture:` (→ 1).
2. **Phase 2 · reload without `reset` and without `role`**. File = `house=apartment-a&seed=1&debug=1&pinch=grip&time=2026-11-04T10:00` (without `reset=1`, without `role=`). Readings: log `pattern: "role|issues|state|furnish|miniature placed"`; `^pin:` (→ 4); `^furniture:` (→ `furniture:chair#1`); `ecs_find_entities` `^ui:issue-panel$` (→ 0, the interface is not saved); pinch on `ui:issue-button-right` and `ui:issue-open-list`: lines `items=` (with `issue-014`); `browser_screenshot` → attach.
3. **Phase 3 · the URL role wins**. File = `house=apartment-a&role=landlord&seed=1&debug=1&pinch=grip&time=2026-11-04T10:00` (without `reset`), reload: log; `^pin:` (→ 4); wait 1.5 s: `state saved … role=landlord`. Then file without `role=` and reload: `role set landlord source=saved`.
4. **Phase 4 · `reset=1` deletes**. File with `reset=1` and `role=tenant`: log `pattern: "state cleared|issues seeded|role"`; `^pin:` (→ 3: the seed), `^furniture:` (→ 0). Reload without `reset=1`: `issues restored count=4`, `^pin:` (→ 3).
5. **Phase 5 · one house does not inherit from the other**. With `house=apartment-b&role=tenant` (without `reset`): log `issues seed none reason=no-demo-file` (B has no demo file and **no request is made**: no 404 in the console), `^pin:` (→ 0), `^furniture:` (→ 0); go back to `apartment-a`: `issues restored count=4`.
6. **Phase 6 · own piece not lost (T4.R4)**. File = `house=apartment-a&role=tenant&reset=1&seed=1&debug=1&pinch=grip`. Menu → `mine` tab → place `my-sofa` in the living room at `W(2.0; 1.5)` (S3.3 step 2); wait 1.5 s (`state saved … pieces=1`). Then `…&debug=1&failmy=1` (without `reset`), reload: log `pattern: "state|my furniture|parked"` (→ `state piece parked id=furniture:my-sofa#1 reason=unknown-catalog`, **no** `state piece discarded` line); `^furniture:` (→ 0); place a `chair` (S2.2); wait 1.5 s: `state saved … pieces=1 … parked=1`. Then **without** `failmy` (without `reset`), reload: `^furniture:` (→ `furniture:my-sofa#1` **and** `furniture:chair#1`), `state restored pieces=2`.
7. **Phase 7 · suspension with the draft open**. Starting file (with `reset=1`); long pinch on the washer (draft open, `new` screen); `browser_interact` `press` `F8`; wait 1 s. Log `pattern: "lifecycle|issue|issues panel|state saved"`: `lifecycle suspended source=debug-key state=hidden`, `issue draft cancelled reason=suspend`, `issues panel closed via=suspend`; `^pin:draft$` (→ 0), `^ui:issue-panel$` (→ 0); `^pin:` (→ 3). `xr_set_select_value hand-right` 0 (the IWER hand is still "closed"), `press` `F9`; `lifecycle resumed source=debug-key state=visible`; the button `ui:issue-button-right` works again (panel opens); no new issue.
8. **Phase 8 · end of session with the panel open**. Panel open on the list; `xr_end_session`; wait 1 s; log `pattern: "lifecycle|issues panel|state saved"`; `xr_accept_session`, `xr_set_input_mode hand`: `^ui:issue-panel$` (→ 0), `^pin:` as before, no `error`.
9. **Phase 9 · viewpoint and "Tabletop" on resume** (T4.R1 + D35). Enter `viewpoint:V1` (pinch held 0.6 s on the marker, S3.1), wait 2.5 s; reload without `reset`: log `pattern: "viewpoint|tabletop button|walls"`; `ecs_find_entities` `^ui:tabletop-button$` (→ 1) and `^ui:issue-button-` (→ 0 at real scale); pinch on the button (S4.6): return to the miniature.
10. `browser_get_console_logs` unfiltered (`error`, `QuotaExceeded`, `Cannot read`, `reading 'add'`); `browser_screenshot` at step 2 → attach; cleanup as in S3.0.

## Checks (all mandatory)
1. **Phase 1**: a single line `state saved key=soglia:v1:state:apartment-a pieces=1 bytes=<n> reason=debounce issues=5 role=tenant parked=0` after the last change (between 0.45 s and 1.5 s from the line `issue created` or `furniture placed`; ±0.05 s is a warning; `issues=5` = the three of the seed, the report and `issue-014`); 4 `pin:*`; 1 `furniture:*`.
2. **Phase 2**: `role set tenant source=saved`; `issues restored count=5 key=soglia:v1:state:apartment-a`; `state restored pieces=1`; 4 `pin:*` including `pin:issue-014` red in the same position; `furniture:chair#1` in the same pose; no `issues seeded` line (the seed does not reload); 0 `ui:issue-panel`; `selectedRoomId` `null`; the landlord/tenant list contains `issue-014`.
3. **Phase 3**: `role set landlord source=url` (the parameter wins over the saved one); then `state saved … role=landlord`; when loading without `role=`: `role set landlord source=saved`. The role is never taken from the saved state when the URL says so.
4. **Phase 4**: with `reset=1`: `state cleared reason=reset keys=<n≥1>`, `issues seeded issues=3 baseline=1 source=demo`, 3 `pin:*` and 0 pieces; on reload without `reset`: `issues restored count=4` (the four of the seed: 5 minus the `issue-014` deleted by the reset) and 3 `pin:*`.
5. **Phase 5**: A and B do not share state: in B no piece and no pin of A; on returning to A the data of A come back (`issues restored count=4`).
6. **Phase 6**: `state piece parked id=furniture:my-sofa#1 reason=unknown-catalog` (warn, one per piece), **no** `state piece discarded` for that piece, `^furniture:` = 0 with `failmy`; the next `state saved` has `parked=1` and, on normal reload, **both** pieces come back (`furniture:my-sofa#1`, `furniture:chair#1`, `state restored pieces=2`): before M4 the own piece would have been lost.
7. **Phase 7**: `issue draft cancelled reason=suspend`, 0 `pin:draft`, 0 panels, `issues` unchanged (3 `pin:*` after the `reset`), no `state saved … issues=` with one more issue; on resume the "Issues" button responds; no `error`.
8. **Phase 8**: after `xr_end_session` the panel is closed, no draft, no pin lost or duplicated (`^pin:` unchanged), no `error`.
9. **Phase 9**: after the reload with the saved viewpoint there is **1** `ui:tabletop-button` and **0** `ui:issue-button-*` and `ui:menu-button-*`; the button brings back the miniature (S4.6).
10. No `error` entries; no `QuotaExceeded` line or `feature localStorage unavailable`.
11. The report declares plainly: (a) `localStorage` absent/blocked/full and the debounce are **only in the unit tests**; (b) `F8`/`F9` **simulate** the event; (c) the real resume (headset taken off/on) is **headset only** (`qa/device/DEBT.md`).

## Outcome
PASS if checks 1–10 are met and 11 is in the report · FAIL otherwise (an issue, a piece or the role lost or duplicated is FAIL).

## To defer to the headset
Real resume with issues and role (take the headset off and on, reload the page); `localStorage` in the Quest Browser.
