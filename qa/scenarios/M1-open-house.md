# S1.1 · Open house A: the miniature appears with the expected entities

**Milestone**: M1 · **Type**: PC (IWER emulator via MCP `iwsdk-runtime`)
Implementation prerequisites: T1.1, T1.2, T1.5, T1.6, T1.8, T1.9 (see `docs/plans/M1.md`).

## Preconditions
- Headless runtime: `npx @iwsdk/cli dev up --ai-mode agent`, wait for `browserCommandReady: true`.
- Parameters (the MCP tools do not navigate to URLs with a query, see decision D1 of the plan): write the file `dev-params.local.txt` in the project root with **a single line**
  `house=apartment-a&role=visitor&reset=1&seed=1&debug=1`
  then `browser_reload_page`. (Equivalent to `/?house=apartment-a&role=visitor&reset=1&seed=1&debug=1`.)
- Input: hands. Seated head at (0; 1.2; 0), yaw 0.

## Steps
1. `browser_get_console_logs` with `pattern: "\\[soglia\\]"`, `count: 100`.
2. `xr_set_transform` with `device: "headset"`, `position: {x: 0, y: 1.2, z: 0}`.
3. `xr_accept_session`, then `xr_set_input_mode` with `mode: "hand"`.
4. `browser_interact` with a `wait` step of 2000 ms, then `browser_get_console_logs` with `pattern: "miniature placed"`. **Take the last line**: its `x y z` are the origin **O** of the miniature (expected (0.000; 0.950; −0.450)).
5. `ecs_find_entities`, one call for each (`limit: 50`):
   - `namePattern: "^house:"`
   - `namePattern: "^room:"`
   - `namePattern: "^wall:"`
   - `namePattern: "^door:"`
   - `namePattern: "^window:"`
   - `namePattern: "^(miniature:root|table:plinth)$"`
6. `scene_get_runtime_hierarchy` with `maxDepth: 8`: get the UUIDs of `house:apartment-a` and `room:living`; then `scene_get_object_transform` for each (global position and scale).
7. `browser_screenshot` (active session) → attach.
8. `browser_get_console_logs` with no filter, `count: 200` (look for `error`).
9. Local hands (check 7). After `xr_set_input_mode` `mode: "hand"` and at least 3 s of session, run a **temporary** probe in the browser (it must not be committed; use the `browser_*` tool that evaluates a script, name to be verified among those available) that returns:
   - all requests for **external** resources: `performance.getEntriesByType('resource').filter(e => !e.name.startsWith(location.origin)).map(e => e.name)`. Do **not** filter the names with `/@` or similar: in an earlier run it hid the URL;
   - the local requests for the hand models: the entries whose `name` contains `/models/hands/` (expected `https://localhost:8081/models/hands/left.glb` and `.../right.glb`, source `src/systems/local-hands.ts`, files in `public/models/hands/`), with `responseStatus` (200) or, if not available, `transferSize`/`decodedBodySize` > 0.
10. `browser_screenshot` in session with `hand-left` and `hand-right` brought in front of the head (e.g. at (∓0.15; Oy + 0.05; Oz + 0.30)): the **white outlines of the hands** are visible (after `xr_set_input_mode` `hand` they appear in the screenshots). `browser_get_console_logs` with `pattern: "xr-input|Failed to load"`.

## Checks (all required)
1. Step 1 contains, in this order:
   - `[soglia] params source=dev-file house=apartment-a role=visitor reset=true seed=1 debug=true`
   - `[soglia] house loaded apartment-a rooms=5 walls=13 doors=5 windows=7`
2. Step 4: `[soglia] miniature placed x=… y=… z=… yawDeg=0.0 scale=0.0500` with `x` = 0 ± 0.02, `y` = 0.95 ± 0.02, `z` = −0.45 ± 0.02. If `y` ≠ 0.95 (e.g. the starting head pose was not applied), note it in the report and use the logged values as O; the check passes only if `y − (head height − 0.25)` = 0 ± 0.02 with the head height read with `xr_get_transform`.
3. Step 5, **exact** counts and exact ids:
   - `^house:` → 1 entity, `house:apartment-a` (no `house:apartment-b`).
   - `^room:` → 5: `room:living`, `room:bedroom`, `room:study`, `room:bathroom`, `room:hall`.
   - `^wall:` → 13: `wall:w-north`, `wall:w-east`, `wall:w-south-hall`, `wall:w-notch`, `wall:w-south-bath`, `wall:w-west`, `wall:w-living-bath`, `wall:w-living-hall`, `wall:w-bedroom-hall`, `wall:w-study-hall`, `wall:w-living-bedroom`, `wall:w-bedroom-study`, `wall:w-bath-hall`.
   - `^door:` → 5: `door:d-entrance`, `door:d-living`, `door:d-bedroom`, `door:d-study`, `door:d-bathroom`.
   - `^window:` → 7: `window:win-living-1`, `window:win-living-2`, `window:win-bedroom`, `window:win-study`, `window:win-study-east`, `window:win-living-west`, `window:win-bathroom`.
   - last filter → 2: `miniature:root` and `table:plinth`.
   Every entity found has the `StableId` component (`value` field equal to the name).
4. Step 6 (tolerance ± 0.005 m, ± 0.001 on the scale), with O = (Ox; Oy; Oz) and yaw 0:
   - `house:apartment-a`: global scale 0.05; global position (Ox − 0.275; Oy; Oz − 0.630).
   - `room:living`: global position (Ox − 0.145; Oy; Oz − 0.515).
5. Step 8: no entry of level `error`; no `[soglia] house invalid`; no `[soglia] house not found`.
6. Screenshot attached; the report describes in words: miniature visible in front of the head, floors of two distinct colours (wood and tiles), low walls with gaps for the doors.

7. **Local hands, no CDN request for the hands** (steps 9–10), in an XR session with hands only:
   a. The hands are visible: the screenshot of step 10 shows the white outlines of both hands (description in words in the report).
   b. The hand models are served by the project: the probe finds the requests `https://localhost:8081/models/hands/left.glb` and `https://localhost:8081/models/hands/right.glb` with status 200 (or non-empty body).
   c. **No** external request (`!startsWith(location.origin)`) contains `generic-hand` or concerns the hands; no request to `cdn.jsdelivr.net` for the hands. If other external requests appear, list them in the report with their URL (they do not decide the result).
   d. No `[xr-input] Failed to load visual asset` line in the console (no `error`/`warn` entry with `Failed to load` related to the hand models).
   **Known limit (to report in the report):** in the IWER emulator the session starts with the **controllers connected** and the request for the controller models (`meta-quest-touch-plus/left.glb` and `.../right.glb` from `cdn.jsdelivr.net`) goes out anyway when the session starts: `xr_set_connected` needs an already active session, so the controllers cannot be disconnected beforehand. Those two requests are **EXPECTED**: just record them in the report (URL and status), they are **not** a failure. The criterion concerns `generic-hand` / the hands. If step 9 or 10 cannot be run on the PC, the report marks it as a debt for the headset instead of giving a result.

## Result
PASS if checks 1–5 and 7 are all met and the screenshot is attached · FAIL otherwise, with expected vs obtained and the relevant log lines.

## To defer to the headset
Comfortable height and distance of the miniature when seated; real reference space of the Quest; readability of the colours; real fps (M1 rows in `qa/device/DEBT.md`). Local hands (check 7): on the real Quest, with no controllers connected, **no** request to `cdn.jsdelivr.net` (not even for the controllers) and hands visible and tracked; on the PC it cannot be proven because of the known IWER limit (to be reported as a debt, without editing `qa/device/DEBT.md` from here).

## Changelog
- 2026-10-05: added check 7 (steps 9–10) to this scenario: in an XR session with hands only the hands are visible and no network request goes to `cdn.jsdelivr.net` for the hands (local glb `https://localhost:8081/models/hands/left.glb` and `right.glb`; `src/systems/local-hands.ts`, `public/models/hands/`); temporary probe with `performance.getEntriesByType('resource')` filtering only `!startsWith(location.origin)` (never with `/@`), no `[xr-input] Failed to load visual asset`, known IWER limit on the requests for the controller models from the CDN (expected, only recorded); the Result now includes 7 — reason: S1.1 was chosen because it is the scenario that already opens the session with `xr_accept_session` + `xr_set_input_mode hand` on house A and checks the app start; it comes from the new `local-hands` feature (offline hands, `CLAUDE.md` rule "demo without backend" and performance/quick start).
