---
name: walk-row
description: Walking inside the tabletop model by rowing with both fists (branch claude/dig-walk; replaced the dig gesture): design, thresholds, IWER fist-pose recipe, traps
metadata:
  type: project
---

- The gesture is now `src/logic/row-gesture.ts` (was dig-gesture): a hand qualifies when it is a FIST (max of the index/middle/ring/pinky tip distances from the wrist <= 0.11 m to start, 0.135 to keep) and in the chest zone (wrist 0.12-0.70 m ahead along the gaze, 0.18-0.65 m below the eyes; keep 0.04-0.80 / 0.12-0.75). The system reads only 5 joints per hand (wrist + 4 tips); palm normal and thumb are not used. Stroke/speed/decay/lockout code is unchanged from the dig.
- Design: the head never moves; walking moves the MODEL root (real scale, floor 1.6 m under the eyes). View state `{kind:'walk',x,z,yawDeg}` in `state.ts`; `viewpoint.ts` owns the fade, `systems/walk.ts` owns the per-frame row + collisions + vignette + store flush; pure logic `row-gesture.ts`, `walk.ts`, `vignette.ts`.
- Trap: hysteresis means a hand that is already qualified stays in with the KEEP bands: a test that moves a qualified hand out of the zone mid-run does not turn it off; start the hand in the bad pose (`still(extra)` in the tests).
- Trap: the IWER head is at y = 1.6 (not 1.2); fists at `head.y - 0.35`, hand position z = -0.717 (wrist joint is hand z + 0.117, wrist y = hand y + 0.002).
- IWER fist recipe (verified): `browser run` script (needs `dev up --allow-browser-automation`) with `frame.evaluate`; find the private pose table with `Object.getOwnPropertySymbols(IWER_DEVICE.hands.left)` (the value with `.poses`), add `poses.fist` = copy of `poses.default` with every finger joint except the metacarpals moved to wrist + 0.47 * (joint - wrist) in the offsetMatrix translation (indices 12-14); then `hand.poseId = 'fist'` and `hand.position.set(...)`. Tip-wrist distance comes out about 0.085 m. Pinch for the lockout check: `hand.updatePinchValue(1)`. The helper is `qa/scenarios/WALK-row.helper.mjs`. The wireframe hand in screenshots does not visibly close.
- Scratch runtime (port 8777) recipe: rsync project to scratchpad copy excluding node_modules/.iwsdk/.git/.claude/.mcp.json, node_modules as per-entry symlinks but NOT `.vite`/`.vite-temp`, `port:` changed in the copy's vite.config.ts, `dev up --ai-mode agent --headless --allow-browser-automation --workspace <copy>`, `dev down --workspace <copy>` at the end (user's 8081 Quest server untouched).
- Pinch the fixed buttons in IWER: aim 7 cm above the target (closed pinch point sits lower). Editing src reloads the page and ends the XR session.
- Trap: exterior walls are 0.25 m thick, so a body of 0.22 m stops at 0.345 from the wall axis. Smoothing (60 ms) keeps a hand "stroking" 2-3 frames after it stops. `RoomNoticePanel` takes a stable id: the walk hint is `ui:walk-hint`.
