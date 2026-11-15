---
name: room-column-button
description: "My room" toggle is the fifth floor of the fixed button column in the model view; one panel, two homes (column slot vs head pair in the room view); ownership, pick and numbers
metadata:
  type: project
---

- One panel `ui:room-button` (RoomViewSystem owns it, placement and pinch). MenuButtonSystem only computes the slot (`roomButtonSlots`, 7 cm above Walk, `ROOM_COLUMN_BUTTON_LIFT`) and publishes it through `src/systems/button-column.ts` (`enableRoomToggleSlot` called by `createRoomView`, `getRoomToggleSlot`, set by `setButtonColumn(..., walk, room)`; `fillButtonColumn` 6th arg). Slot is null when the column is hidden, so the toggle follows the other buttons' hiding rules; extra rule: hidden during fades.
- Model view: toggle in the column, head pair (`Model` + `Menu`, `ui:room-menu-button`) NOT shown. Room view: column away (isModelHidden) so the head pair is shown as before. `mr button shown` logs only in the room view now.
- Room buttons are 6 cm tall now (12x6 and 8x6, uikitml + `ROOM_*_PANEL`), pair anchor slides to ~30.0 deg (was 25.5). Pick in the column uses `pickButton` (fixed 6 cm height); in the pair `pickRoomButton` as before.
- Seated angle numbers (tests/unit/room-column.test.ts): top floor ~49 deg from a gaze at the model with the head at 1.2 m, <= 5 deg more than Walk. Accepted, device debt row "MR" in DEBT.md.
- Verification in a scratch copy on port 8093 (Quest server on 8081 untouched): `ecs find namePattern` + `ecs query` give button positions; pinch with `pinch=grip` = position + (0.029, -0.0015, -0.045); `xr set-select-value` 1 then 0 gives the pinch; walk press sets Visibility false on the toggle.
