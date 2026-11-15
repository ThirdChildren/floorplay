---
name: viewpoint-default-markers
description: Fix for "blue viewpoint marker missing in some rooms" - cause was data (3 of 5/2 of 4/3 of 10 rooms had a viewpoint); default viewpoints derived in checkHouse; emulator recipe notes
metadata:
  type: project
---

- Cause: DATA, not rendering. The system makes one marker per `house.viewpoints` entry; apartment-a had 3 viewpoints for 5 rooms, b 2 for 4, c 3 for 10 (hall, bathrooms, storage, entrance had none; schema only needs minItems 1).
- Fix: `src/logic/viewpoint-default.ts` (`polygonPole` quad-tree polylabel, `defaultYawDeg` nearest door of the room else midpoint of longest edge, `withDefaultViewpoints`) called at the end of `checkHouse` -> every consumer (demo, file, storage re-read) sees a complete house. Returns the SAME object when nothing is missing, else a shallow copy (rooms/walls shared). Ids: first free `V<n>` above the highest existing; explicit ones never change. `HOUSE_LIMITS.viewpoints` 30 -> 60 (checked after completion). Pole is stable on re-check, so a stored file house re-serialised keeps its viewpoints.
- Trap: `checkHouse` doc/test said "no copy"; the test now asserts shared `rooms`/`walls` and unchanged input.
- Emulator: throwaway runtime on 8090 needs `setsid nohup npx @iwsdk/cli dev up --ai-mode agent --headless --workspace <copy>` (plain `&` died after a command or two); wait ~90 s; xr session ends if the runtime restarts; `xr set-input-mode hand` before pinching; IWER joints calibration still point = set + (0,-0.0245,-0.012); world pos of a house-local anchor = root + 0.05*(house node + local). `ecs find` takes `namePattern`, not an id prefix; `browser logs` count max 200.
