---
name: back-to-home
description: "Back to home" menu control (branch feat/back-to-home) - header split, session end only, what IWER proved, pinch calibration
metadata:
  type: project
---

- The control `ui:menu-home` lives in the HEADER of the palm menu (right end, 18 x 4 cm); the left 17.6 cm is the title or the two tabs (8.6 cm each). A fifth bar button or a bottom strip was rejected: the bar is full (36 cm) and a test pins the menu at <= 0.376 m tall, so the header split keeps MENU_EXTENT and every geometry test untouched. `strings.menu.catalogUnavailable` became "No catalog" (the old text did not fit 17.6 cm).
- Behaviour is ONLY `XRSession.end()` (`src/systems/back-home.ts`, pure decision in `src/logic/back-home.ts`): the existing life cycle (save reason=end, suspend, menu closed), viewpoint system (table back, saved view kept) and intro-screen `sessionend` listener do the rest. No reload; another house / sizes still reload from the start screen. `intro=0`: session ends, plain page. No confirm step (autosave; no draft can be open while the menu is).
- IWER recipe: scratch copy on port 8791 (`h.sh` wrapper with `--workspace copy`), F7 opens the pinned menu, `ui:menu-home` at menu frame (+0.09, header height); pinch with hand position = target + (-0.029, +0.0015, +0.045) for the menu, target + (0, 0.0245, 0.012) for a table marker (two calibrations: pick whichever matches the pinch point log). Hand input mode must be set AFTER `xr enter` (and after re-entering). Click house buttons with the full aria-label ("Use this house: Apartment B"); the browser log bridge goes quiet after a page reload.
- Headset not tried: DEBT rows HOME.
