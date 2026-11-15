---
name: walk-dig
description: Walking inside the tabletop model with the dig gesture (branch claude/dig-walk): design, verified IWER recipes for a REAL joint-driven two-hand stroke, traps
metadata:
  type: project
---

- Design: the head never moves; walking moves the MODEL root (real scale, floor 1.6 m under the eyes) so every UI keeps working. View state `{kind:'walk',x,z,yawDeg}` in `state.ts`; `viewpoint.ts` owns the fade/enter/exit (`requestWalk`, `placeAtWalk`, `requestTabletop` handles walk), `systems/walk.ts` owns the per-frame dig + collisions + vignette + store flush. Pure logic: `dig-gesture.ts`, `walk.ts` (reuses `footprint.wallPieces`, doors = gaps, exterior doors plugged), `vignette.ts`.
- The dig reads 8 joints per hand with its OWN `fillPoses` call (first five keep the hand-joints.ts layout so `palmNormalFromJoints` is reused); only runs while walking.
- IWER recipe for a REAL stroke (no mocks): start dev with `--allow-browser-automation`, `browser run <script in the workspace>` receives `{frame}` (use `frame.evaluate`, NOT `page`); `IWER_DEVICE.hands.left.position.set(x,y,z)` moves the wrist from page JS. `xr animate-to` calls are serialised by the runtime, so two hands cannot stroke together that way. IWER's default hand is open + palm down (palmDeg 149.9, pinchDist 0.094): hands at y=0.85, z=-0.6 (head y=1.2) qualify (`status().left == 'ok'`). Wrist joint z = hand z + 0.117.
- Pinch the fixed buttons in IWER: hand set = button minus (0.048 left / -0.048 right, 0.034 -> but the closed pinch point sits ~7 cm LOWER than that), so aim 7 cm above the target or you press the floor below. Read the button position with `ecs query` (entity from `ecs find`).
- Editing src reloads the page and ends the XR session: every edit needs reload -> `xr enter` -> `set-input-mode hand` -> `__sogliaWalk.enter()`. `reset=1` in `dev-params.local.txt` wipes the saved state at every load: drop it to test restore.
- Trap: exterior walls of the demo houses are 0.25 m thick (interior 0.12), so a body of 0.22 m stops at 0.345 from the wall axis; unit tests must not assume 0.1.
- Trap: the smoothing of the wrist speed (60 ms) keeps a hand "stroking" for 2-3 frames after it stops: tests that assert a monotone decay settle first.
- `RoomNoticePanel` takes an optional stable id: the walk hint is `ui:walk-hint`. Vignette = child of `world.camera`, ShaderMaterial quad, +1 draw call per view only while visible.
