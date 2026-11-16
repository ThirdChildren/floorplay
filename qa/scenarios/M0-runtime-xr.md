# S0.2 · Headless runtime and emulated XR session

**Milestone**: M0 · **Type**: PC (IWER emulator via MCP `iwsdk-runtime`)

## Preconditions
- No active runtime: `npx @iwsdk/cli dev down` (any result).
- **Headless** start (announce it to the user first, rule from `AGENTS.md`):
  `npx @iwsdk/cli dev up --ai-mode agent`.
- Wait for `npx @iwsdk/cli dev status` with `browserCommandReady: true` (timeout 60 s, repeat every 5 s).
- MCP tools available (`xr_*`, `browser_*`, `ecs_*`). If missing: `npx @iwsdk/cli adapter sync` and ask the user to restart Claude Code.
- No URL parameters (not needed in M0).

## Steps
1. `xr_get_session_status` → save the response in the report.
2. `browser_get_console_logs` with `count: 100` (no `level` filter, which would hide the errors).
3. `xr_accept_session`.
4. `xr_get_session_status` again.
5. `xr_set_input_mode` with `mode: "hand"` → save `activeDevices`.
6. `xr_set_transform` with `device: "headset"`, `position: {x: 0, y: 1.2, z: 0}`.
7. `xr_get_transform` for `headset`, `hand-left`, `hand-right`.
8. `ecs_list_systems`.
9. `browser_screenshot` → attach the path (`screenshotPath`) to the report.
10. `browser_reload_page`, wait for `browserCommandReady: true`, then `xr_get_session_status` (cold start after the reload).
11. `xr_end_session`.
12. `npx @iwsdk/cli dev down`.

## Checks (all required)
1. Step 1: the response arrives without error (no `browser_not_launched`, no timeout).
2. Step 2: no entry of level `error`. Warnings (`warn`) allowed but listed in the report.
3. Steps 3–4: after `xr_accept_session` the status shows the session **active** (different from the response of step 1).
4. Step 5: `activeDevices` contains both `hand-left` and `hand-right` and does **not** contain `controller-left` or `controller-right`.
5. Step 7: all returned coordinates are finite numbers; for `headset` `y` = 1.2 ± 0.01 after step 6.
6. Step 8: `ecs_list_systems` returns at least one system (the ECS world is alive).
7. Step 9: the screenshot file exists and is not empty.
8. Step 10: after the reload `xr_get_session_status` responds within 15 s and the app restarts with no errors in the console (`browser_get_console_logs`).
9. Steps 11–12: the session ends and the runtime stops (`dev status` no longer reports the active runtime).

## Result
PASS if all checks are met · FAIL otherwise, with expected vs obtained. If the runtime does not start for environmental reasons (missing browser, port 8081), result **BLOCKED** with the cause and the command that revealed it.

## To defer to the headset
A real WebXR session on Quest with `handTracking: true` and no emulator on the headset (M0 rows in `qa/device/DEBT.md`, see `docs/plans/M0.md`).
