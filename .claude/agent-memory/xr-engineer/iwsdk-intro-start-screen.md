---
name: iwsdk-intro-start-screen
description: Start screen (DOM before the session), launchXR from a click, offer 'none', catalog size overrides, and how to drive it in the cloud emulator
type: project
---

- `world.xr.offer` is `navigator.xr.offerSession`, not a DOM button. With the start screen the options are copied with `offer: 'none'` (`withoutSessionOffer`) and the Enter VR button calls `world.launchXR()` from the click (needs a user gesture, so the world is built BEFORE the press). `intro=0` keeps `offer: 'always'` and `xr enter` works.
- `world.sessionRequestPending` / `world.session` tell whether `launchXR` ended without a session (poll, there is no promise).
- Catalog is read once at load and shared by reference by many systems: changing sizes = reopen the page (`Apply and go back`), not a live update. Overrides live in `soglia:v1:catalog-sizes`, `reset=1` skips that key (`clearSogliaKeys`). The glTF is scaled in a holder group from `defaultSize` to `size`.
- Cloud driving: `browser interact` clicks by `locator {role,name}` (give buttons unique accessible names; same text on rows -> strict mode violation). A click that reloads the page reports `success:false`; read the logs. File upload and `goto` need `dev up --allow-browser-automation` and `browser run script.mjs` (`frame.goto`, `locator('input[type=file]').setInputFiles`). `dev-params.local.txt` is re-applied after the page URL changes (it still carries `reset=1`).
- `THREE.WebGLRenderer: Can't change size while VR device is presenting.` appears in IWER with or without the start screen.
- No jsdom in the project: DOM code is checked in the emulator, logic goes to `src/logic/` with Vitest.
- Resized models (bug fixed 2026-11-15): catalog sizes are [width, depth, HEIGHT] but three axes are x, y=UP, z: `modelScale` must return [w, h, d] ratios (it used [w, d, h] -> depth stretched the height and height the depth). Scale now uses the MEASURED glb box (`naturalSize`) and block fallback no longer sticks out 1 cm. Real glbs match the catalog exactly (tests/helpers/glb-bounds.ts parses accessor min/max). Verify rendered boxes with a scratch `npx vite` copy on another port + Playwright (`dev up` in a copy still hit port 8081): log Box3 of `visuals.create(item)` body.
