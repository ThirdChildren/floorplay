# Scenario POINT-MINE: tenant furnishing, pointing at a spot, Mine removal (2026-11-17)

Environment: IWER headless (cloud), `dev up --ai-mode agent --headless --allow-browser-automation`, params in `dev-params.local.txt`
(`house=apartment-a&role=tenant&reset=1&seed=1&debug=1&pinch=grip&intro=0&mr=0&furnish=scandinavian`), then `browser reload`, `xr enter`,
`xr set-input-mode {"mode":"hand"}`. Pointing uses the helper `qa/scenarios/POINT.helper.mjs` (copy it inside the workspace and run
`POINT_SCN=<step> POINT_ARGS=<args> npx @iwsdk/cli browser run <copy> --timeout 90000`): it registers a `point` finger pose in the emulator
and drives the REAL joints through the real recognition. Steps: `hold` (1 s dwell fires), `open`, `fist` (no dwell), `break` (pose lost: cancel),
`drift` (spot moves: restarts), `pinch` (other hand pinches: cancel), `world` (target in world metres, for real scale), `start` (pose kept, for a screenshot).

1. **Tenant grabs a piece**: right hand on `furniture:sofa-3seat#1` (grip pinch pose = target + (0.038, 0.003, -0.037)), carry 0.1 m, release. Log `furniture grabbed ... hand=right`, `furniture placed`.
2. **Long pinch still reports**: hold the pinch 1.5 s on a free floor spot (plan 1.0, 1.0). Logs `issue hold start`, `issue draft created`, `issues screen=new`.
3. **Pointing, tabletop**: `hold`. Logs `point start hand=right surface=... room=...`, `point fired hand=right seconds=1.0`, `issue draft created`, `issues screen=new`. Then Furniture, "is loose", Report: `issue created id=issue-014`, red pin at the spot.
4. **Not a point**: `open` and `fist` give no dwell (`left`/`right` reasons `curl` / `index` in `__sogliaPoint.status()`); `break` logs `point cancelled reason=pose`; `drift` logs `point moved`, then fires on the new spot after 1 s; `pinch` logs `point cancelled reason=pinch`. Role `visitor`: no `point start`.
5. **Pointing at real scale**: enter V1 (pinch the marker), `world` with target (0, 0.4, -1.8). Log `point fired`, form opens, `issues panel closed via=view` does NOT follow.
6. **Mine**: seed `scannedFurniture` in localStorage, reload without `reset=1`; palm menu, tab Mine: cards and a last `Manage`. Manage, press My couch: `mine remove armed`, press again: `mine removed`; reload: it is listed with `Restore`; press it: `mine restored`; reload: back in Mine.
7. **Placed piece stays**: pick My bed from Mine, drop it in the house, remove it from Mine, reload: `state restored pieces=1`, no `piece parked`.
8. **Add to Mine** (`mr=1`): card on the couch, Add: `mr object added`; remove it from Mine; Add again: `mr object restored id=my-scan-couch-1`.
9. Console: no `error` (only the known `tuning.local.txt ERR_ABORTED` poll artifact), no `warn`.
