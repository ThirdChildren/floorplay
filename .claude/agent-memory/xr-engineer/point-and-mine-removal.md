---
name: point-and-mine-removal
description: 2026-11-17 pointing gesture (index finger 1 s opens the new-issue form), tenant furnishing back, Mine removal/restore; design, IWER finger-pose recipe, traps
metadata:
  type: project
---

- `furnish` permission was REMOVED again (the tenant furnishes). `delete` of archived issues stays. A long pinch that starts on a piece moves the piece (grab claims first, `issue-create.decide` sees the `furniture` claim): the pin comes from floor/wall/fixture spots, as before the restriction.
- Pointing = `systems/point-issue.ts` + pure `logic/point-gesture.ts` (fingertip-to-wrist distances: index >= 0.14 start / 0.12 keep, middle/ring/pinky <= 0.115 / 0.135, pinch lockout 0.4 s, arm 0.15 s, filtered knuckle-to-tip ray), `point-target.ts` (analytic ray vs floor y=0, wall boxes `rectFromWall`, piece boxes, in HOUSE coords through `handToPlan`; no Three raycast, no mesh), `point-dwell.ts` (1 s, tolerance `dwellTolerance(scale)` = 3 cm world clamped 0.1..0.6 house m, 0.2 s grace, 0.4 s release after fire). It opens the form with `startIssueAt(hand, anchor)` exported from `issue-create.ts` (the old `fire` was split into `openForm`). Ghost = the existing `pin:draft` (`setPinDraft` / `setPinDraftSize`).
- TRAP: the Issues panel refused to open at real scale AND closed itself every frame there (`update`: `isModelHidden()`). Fixed with `openIssuePanel(hand, true)` + `formAtRealScale` (kept while the screen is `new`). Pins are hidden at real scale, the pin shows after Tabletop.
- TRAP: `hand.get('index-finger-phalanx-proximal')` exists in IWER; the reader asks 6 joints in one `fillPoses`. The walk system has its own reader too (no shared one).
- IWER recipe (verified): `browser run` + `frame.evaluate`: add `poses.point` (default pose with middle/ring/pinky moved to wrist + 0.47 * (joint - wrist)); the RIGHT hand mirrors the table's x (tip = hand.x - table.x); the default index is splayed ~23 deg, so compute the aim from the pose-table joints (`qa/scenarios/POINT.helper.mjs`). `ecs pause` then `browser screenshot` gives a mid-dwell picture.
- `window.__sogliaPoint` (`?debug=1`): `status()` incl. `ray` and `hit`, `hands(l, r)` synthetic samples.
- Panel under the ray is NOT tested geometrically: the gesture is shut off while menu / View / Issues / scan card are open and during any pinch or claim (DEBT row).
- Mine removal: store `removedScanned` (max 12, saved only when non-empty), `removeScanned` / `restoreScanned`; `addScanned` of an object equal to a removed one RESTORES it; ids use active+removed for `nextScanNumber`. Menu: the Mine tab view `pick` / `manage` (`logic/mine-menu.ts`), last card `Manage` / `Done`, two-press removal (armed id in `menu-items.ts`), restore in one press. The catalog entry of a removed piece stays in `merged.items` (placed copies stay, nothing parked). `index.ts` follows the store (`syncMine`), `createRoomObjects` no longer takes hooks.
- Seeding scanned pieces in QA: write `scannedFurniture` into `localStorage['soglia:v1:state:apartment-a']` with `browser run`, reload WITHOUT `reset=1`.
