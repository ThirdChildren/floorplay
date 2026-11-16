# S0.3 · Clean start: no template content

**Milestone**: M0 · **Type**: PC (IWER emulator via MCP `iwsdk-runtime`)

## Preconditions
- Headless runtime active as in S0.2 (`npx @iwsdk/cli dev up --ai-mode agent`, `browserCommandReady: true`).
- Task T0.6 completed (template content removed).

## Steps
1. `browser_reload_page`, wait for `browserCommandReady: true`.
2. `browser_get_console_logs` with `count: 200`, no `level` filter.
3. `npx @iwsdk/cli dev logs --tail 200` → development server log.
4. `ecs_find_entities` with `namePattern: "robot|welcome|webxr banner|sansevieria|^environment$"`, `limit: 50`.
5. `ecs_list_systems` → list of names.
6. `scene_get_render_stats` → record `calls` and `triangles` as a baseline.
7. `xr_accept_session`, `xr_get_session_status`, then `browser_get_console_logs` once more (errors that only appear in session), finally `xr_end_session`.
8. `browser_screenshot` (outside a session) → attach.

## Checks (all required)
1. Steps 2 and 7: no entry of level `error`; no message naming 404, `Failed to load`, `jsdelivr`, `gltf`, `uikitml`, `chime`.
2. Step 3: no 404 line and no `ERR`/`error` from the development server.
3. Step 4: **0** entities found.
4. Step 5: the list does **not** contain `RobotSystem` or `PanelSystem`.
5. Step 6: if `available: true`, `calls` ≤ 10 and `triangles` ≤ 5,000 (empty scene). If `available: false`, note it and move on (not blocking).
6. Step 7: the session starts with the empty scene without errors.
7. Step 8: the screenshot exists; the report says in words what it shows (expected: only the gradient background, no objects).

## Result
PASS if checks 1–4, 6 and 7 are met (5 is informative when `available: false`) · FAIL otherwise.

## To defer to the headset
Nothing.
