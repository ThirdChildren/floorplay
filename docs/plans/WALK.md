# WALK: walking inside the tabletop model with the "row" gesture

Owner request (2026-11-15), rule 2 of `CLAUDE.md` (amended): besides the viewpoints, the user may walk inside the model with the
"row" gesture (both fists closed, pulled back together like a rowing stroke), slowly and with a comfort vignette. Still hands only, still seated, no thumbstick, no teleport.

## Decisions

1. **The user becomes small, the model is magnified around the head.** The head never moves (as for the viewpoints, D35): the
   model root is placed at real scale (1) around the head, with the model floor `WALK_EYE_HEIGHT` = 1.6 m under the eyes. That is
   the same picture as shrinking the user by 1:20 inside a model that stays on the table, and it is the only version that keeps
   every panel, hand pinch and menu working (scaling the rig would also scale IPD, hand reach and every UI distance). On the way back
   the root returns to `anchor + offset` with the stored scale and yaw, so the model is exactly where it was on the table.
2. **Entry/exit.** The fixed button column beside the model has a fourth floor, "Walk inside" (`ui:walk-button-left|right`, 16 x 6 cm,
   7 cm above View). A pinch closes the open panels and runs the existing fade (`startTransition`, 0.2 s + 0.2 s). The way back is the
   existing "Tabletop" button/menu item (`requestTabletop`), same fade. The start spot is the first viewpoint of the house
   (`house.viewpoints[0]`: position and heading), pushed onto a free spot if needed.
3. **Persistence.** `AppState.view` gains `{kind: 'walk', x, z, yawDeg}` (additive; plan metres and heading in the viewpoint
   convention). The position is written to the store when the body stops and at most once a second while it moves, and on suspend /
   session end. Pause/resume, a session that ends, and a page reload all RESTORE the walk at the saved spot (no fade, as for a
   viewpoint, D35); the heading is aligned to where the head looks at that moment. The user can leave with the Tabletop button.
4. **Row gesture** (`src/logic/row-gesture.ts`, pure, 36 unit tests): the user closes BOTH hands into fists in front of the chest and
   pulls them back towards the body together, like a rowing stroke (it replaced the first "dig" version: open hands, palms down).
   Per hand: a *fist* = the farthest of the four fingertips (index, middle, ring, pinky) is at most 11 cm from the wrist to start /
   13.5 cm to keep (flat hand 17-19 cm, relaxed 15 cm, pinch with loose fingers 13-15 cm, fist 7-10 cm; the thumb and the palm
   direction are not used); *chest zone* = wrist 12-70 cm ahead of the head along the gaze to start (4-80 cm to keep, a stroke ends
   close to the chest) and 18-65 cm below the eyes to start (12-75 cm to keep). A pinch locks the hand out for 0.4 s after it ends
   (so every pinch, grab and the two-hand rotate/zoom gesture, which is made of pinches, never walks); the hand must be qualified
   0.12 s before it counts; a stroke is the smoothed backward wrist speed >= 0.18 m/s, mostly backward (not sideways, ratio 1.4), in
   BOTH hands at once. Speed += 10 (m/s per m of coordinated stroke), max 5 m/s perceived; it decays with a 0.7 s time constant while
   the hands hold the pose and 0.3 s when a hand leaves it. Direction = the horizontal gaze of the head (the user turns by turning
   the head/body; no snap turn). The pinch vs fist distinction: a pinch keeps the index finger out towards the thumb (index tip
   13-15 cm from the wrist) and the `selectstart` state shuts the hand out anyway.
5. **Miniature gestures** are off at real scale (`isTabletopLocked`), and the pinch gate above means the row wins clearly anyway.
   `pinch-claims` is not involved: the row takes no pinch claim (it never uses a pinch).
6. **Collisions** (`src/logic/walk.ts`, 31 tests): the body is a circle of 0.22 m on the plan. Solids = `wallPieces` (walls split at
   doors, so doors are gaps, windows are solid) + a plug in every door that leads outside (the user stays in the house) + a bounds
   clamp. A step is cut into <= 5 cm substeps and the circle is pushed out of every rectangle it overlaps: it slides along walls.
   Walking into a wall bleeds the speed (time constant 0.12 s). Furniture does not block (decision: keep it simple).
7. **Comfort vignette** (`ui:comfort-vignette`): ONE head-locked quad (child of the camera, 0.5 m ahead) with a tiny ShaderMaterial,
   no texture, no post-processing; strength from speed (0.05 -> 5 m/s: 0 -> 0.85, rise 0.12 s, fall 0.45 s); hidden (no draw call)
   when the strength is under 0.01. Measured in IWER: +1 draw call per view while it shows.
8. **Feature detection.** Without hand joints (controllers only, or no `XRFrame.fillPoses`) "Walk inside" does not enter: the log says
   `[soglia] feature hand joints unavailable` and a notice says "Walking needs hand tracking. Put the controllers down." The viewpoints
   and every other path keep working (controllers are never required).
9. **Coach.** "Row with both fists to walk" (`ui:walk-hint`) shows in front of the head on the first three entries
   (browser `localStorage` counter `soglia:v1:walk-hint`), until the first stroke or 12 s; it is not shown on a restore.

## Files

`src/logic/row-gesture.ts`, `src/logic/walk.ts`, `src/logic/vignette.ts`, `src/systems/walk.ts`, `src/ui/comfort-vignette.ts`,
`src/debug/walk-hook.ts`, `public/ui/walk-button.uikitml`; changes in `state.ts`, `persistence.ts`, `viewpoint.ts`, `view-mode.ts`,
`menu-button.ts` (logic and system), `menu-follow.ts`, `button-column.ts`, `lifecycle.ts`, `index.ts`, `strings.ts`.

## Debug hook (`?debug=1`)

`window.__sogliaWalk`: `enter()`, `leave()`, `drive(speed, seconds)` (feeds a speed to the same step/collision/vignette/store path as a
row), `status()`, `hands(left, right)` (synthetic joint samples). In IWER the real gesture works end to end too: IWER's hand has only
open/pinch/point poses, so the QA registers a `fist` pose in the page (finger joints pulled to 0.47 of their distance to the wrist,
`qa/scenarios/WALK-row.helper.mjs`) and moves `IWER_DEVICE.hands.left|right.position` in a stroke (`qa/scenarios/WALK-row.md`).

## Not done / open

- Furniture is not a collision obstacle; stairs and several floors do not exist in the data.
- The 1.6 m eye height puts the model floor 0.4 m under a seated user's real floor in mixed reality (VR is unaffected).
- All thresholds are guesses until a headset is available (`qa/device/DEBT.md`, rows WALK).
