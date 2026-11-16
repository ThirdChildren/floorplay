# S1.5 · House B and handling of loading errors

**Milestone**: M1 · **Type**: PC (IWER emulator via MCP `iwsdk-runtime`)
Scenario added by the planner (it is not in the original ROADMAP). Prerequisites: T1.5, T1.6, T1.8.

## Preconditions
- Headless runtime; headset at (0; 1.2; 0); hands. Three runs, changing `dev-params.local.txt` + `browser_reload_page`:
  - **B**: `house=apartment-b&role=visitor&reset=1&seed=1&debug=1`
  - **N**: `house=nope&role=visitor&reset=1&seed=1&debug=1`
  - **T**: `house=..%2Fapartment-a&role=visitor&reset=1&seed=1&debug=1` (attempt to leave the folder; the decoded value is `../apartment-a`, **invalid** id: the parameter parser IGNORES it and the app uses the default house `apartment-a`)

## Steps
### Run B
1. `xr_accept_session`, `xr_set_input_mode` `mode: "hand"`, wait 2 s.
2. `browser_get_console_logs` with `pattern: "\\[soglia\\]"`.
3. `ecs_find_entities` (one for each, `limit: 50`): `^house:`, `^room:`, `^wall:`, `^door:`, `^window:`, `^(miniature:root|table:plinth)$`.
4. `browser_screenshot` → attach.

### Run N
5. `browser_reload_page` with file N; `xr_accept_session`; wait 2 s.
6. `browser_get_console_logs` with no `level` filter (`count: 200`).
7. `ecs_find_entities` with `namePattern: "^(house|room|wall|door|window|miniature|table):"` and with `namePattern: "^ui:error-panel$"`.
8. `browser_screenshot` → attach.

### Run T
9. Same as steps 5–8 with file T. In addition, at step 7 the search `^(house|room|wall|door|window|miniature|table):` must give 33 results (complete house A) and `^ui:error-panel$` 0; at step 6 look in the logs for the lines `param house=`, `invalid house id ignored`, `house loaded` and `house not found`.

## Checks (all required)
**Run B**
1. Log: `[soglia] house loaded apartment-b rooms=4 walls=9 doors=4 windows=4`.
2. Entities: `^house:` → only `house:apartment-b`; `^room:` → 4 (`room:living`, `room:bedroom`, `room:bathroom`, `room:hall`); `^wall:` → 9 (`wall:w-north`, `wall:w-east`, `wall:w-south`, `wall:w-west`, `wall:w-living-bath`, `wall:w-living-hall`, `wall:w-bedroom-hall`, `wall:w-living-bedroom`, `wall:w-bath-hall`); `^door:` → 4 (`door:d-entrance`, `door:d-living`, `door:d-bedroom`, `door:d-bathroom`); `^window:` → 4 (`window:win-living`, `window:win-bedroom`, `window:win-bedroom-east`, `window:win-bathroom`); `miniature:root` and `table:plinth` present.
3. No `*apartment-a*` entity. No `error` in the console.

**Run N (`house=nope`: valid but unknown id)**
4. Log (level `warn`): `[soglia] house not found: nope`.
5. **No network request** for that file (the allow list blocks before the `fetch`): no console entry `Failed to load resource` / `404`. If `npx @iwsdk/cli dev logs --tail 100` shows the HTTP requests, none must concern `houses/nope.json` (otherwise the check relies only on the console).
6. Entities: the first search of step 7 returns **0** results; `ui:error-panel` → **1** result.
7. Zero entries of level `error` in the console and no unhandled exception (`[unhandledrejection]`).
8. Screenshot: the report describes the error panel (large text, in front of the head, at about 0.6 m) and quotes the exact visible text: "This home could not be found." and "Reload the page or choose another home."

**Run T (`house=../apartment-a`: INVALID id, ignored by the parser)**
4T. Log of the current load, both of level `warn`, in this order: `[soglia] param house="..?apartment-a" ignored: expected letters, digits, "-" or "_"` (in the printed value the `/` is replaced by `?`, as `printable` does in `src/logic/params.ts`; text observed in the report of 2026-10-05) and then `[soglia] invalid house id ignored`. The line `[soglia] params source=dev-file house=apartment-a ...` shows the default house.
5T. House A is loaded: `[soglia] house loaded apartment-a rooms=5 walls=13 doors=5 windows=7`. `[soglia] house not found: ../apartment-a` does **not** appear (nor any `house not found`).
6T. Entities: the first search of step 7 returns **33** results (complete house A: 1 house + 5 room + 13 wall + 5 door + 7 window + `miniature:root` + `table:plinth`); `ui:error-panel` → **0** results. No error panel in the screenshot (the report describes the miniature of house A).
7T. **No network request** for `../apartment-a` (nor for paths with `..`): the loader is not even queried; no `Failed to load resource` / `404` entry in the console and, if `npx @iwsdk/cli dev logs --tail 100` shows the HTTP requests, none concerns paths with `..` (otherwise the check relies only on the console).
8T. Zero entries of level `error` in the console and no unhandled exception (`[unhandledrejection]`).

**Corrupted data (not runnable here, covered by unit tests)**
9. The report refers to `tests/unit/house.test.ts` for the "invalid house" cases (`[soglia] house invalid: <path>: <message>`); check: the tests exist and pass.

## Result
PASS if checks 1–8 (run B: 1–3; run N: 4–8; run T: 4T–8T) are met and 9 is confirmed · FAIL otherwise.

## To defer to the headset
Readability of the error panel at 0.6 m (secondary item, merged with the text readability of M1).

## Changelog
- 2026-10-05: run T (`house=../apartment-a`) rewritten: invalid id IGNORED by the parser → house A loaded with 33 entities, no `ui:error-panel`, no `house not found: ../apartment-a`, warn `param house="..?apartment-a" ignored: expected letters, digits, "-" or "_"` and new line `[soglia] invalid house id ignored`, no network request for `..`; T checks separated as 4T–8T, while N (`house=nope`, valid but unknown id) stays unchanged with the error panel and `house not found: nope` — reason: F3 of the report `qa/reports/M1-2026-10-05.md`; the id validation in `src/logic/params.ts` fires before the loader's allow list, the behaviour is safe and intended (user's gate decision), the scenario described a different path.
