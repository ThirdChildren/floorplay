# S1.3 · Pinch on a room: label with name and area

**Milestone**: M1 · **Type**: PC (IWER emulator via MCP `iwsdk-runtime`)
Implementation prerequisites: T1.4, T1.8, T1.9, T1.10 (see `docs/plans/M1.md`).

## Preconditions
- As S1.1: headless runtime, `dev-params.local.txt` = `house=apartment-a&role=visitor&reset=1&seed=1&debug=1`, `browser_reload_page`, headset at (0; 1.2; 0), `xr_accept_session`, `xr_set_input_mode` with `mode: "hand"`, wait 2 s.
- **O = (Ox; Oy; Oz)** from the last `miniature placed` line (expected (0; 0.95; −0.45)). Scale 0.05 and yaw 0 (no gesture before this scenario).
- Floor centres in the world, `C = (Ox + dx; Oy; Oz + dz)`:

  | Room | `dx` | `dz` | Expected label (exact) | Expected log line |
  |---|---|---|---|---|
  | `living` | −0.145 | −0.065 | `Living room & kitchen · 23.9 m²` | `room selected living area=23.9` |
  | `bedroom` | +0.065 | −0.065 | `Bedroom · 14.7 m²` | `room selected bedroom area=14.7` |
  | `study` | +0.210 | −0.065 | `Study · 12.0 m²` | `room selected study area=12.0` |
  | `bathroom` | −0.210 | +0.115 | `Bathroom · 6.8 m²` | `room selected bathroom area=6.8` |
  | `hall` | +0.065 | +0.090 | `Hallway · 13.4 m²` | `room selected hall area=13.4` |

  (Unicode form `<name> · <area> m²` with `·` U+00B7 and `²` U+00B2, rendered by the local font `public/fonts` (T2.2). For house B the living room is `Living room & kitchen · 20.2 m²`. If the local font does not load the app falls back to the ASCII form `<name>: <area> m2` and writes `[soglia] font fallback reason=...`.)

  (calculation: `d = (room_centre − (5.5; 3.6)) × 0.05`; the areas are 23.92 / 14.72 / 11.96 / 6.76 / 13.44 m².)
- Hand used: right. For each room: `hand-right` at **(Cx; Oy + 0.25; Cz + 0.02)** (almost above the centre, the ray goes down almost vertically and does not cross walls), then `xr_look_at` with `device: "hand-right"` and `target: C`.

## Steps
1. For the room `living`: `xr_set_transform` `hand-right` as above → `xr_look_at` → `xr_select` with `device: "hand-right"`, `duration: 0.3`.
2. Wait 1 s (`browser_interact`, `wait` step 1000 ms). `browser_get_console_logs` with `pattern: "room|label"`.
3. `ecs_find_entities` with `namePattern: "^ui:room-label$"`.
4. `browser_screenshot` → attach (living room label visible).
5. Repeat steps 1–2 for `bedroom`, `study`, `bathroom`, `hall` (in the order of the table), one `xr_select` per room. After each one, check the log.
6. Repeat the selection of `hall` (same point, second `xr_select`). `browser_get_console_logs` with `pattern: "room"`.
7. Negative test: `hand-right` at (Ox + 0.38; Oy + 0.25; Oz) above the empty base, `xr_look_at` towards (Ox + 0.38; Oy; Oz), `xr_select`. `browser_get_console_logs` with `pattern: "room"`.
8. `browser_get_console_logs` with no filter (look for `error`).

## Checks (all required)
1. Step 2: the line `[soglia] room selected living area=23.9` and **after** it `[soglia] label shown "Living room & kitchen · 23.9 m²"` (text exactly equal, with `·` and `²`).
2. Step 3: exactly **1** `ui:room-label` entity.
3. Step 5: for each room the line `room selected <id> area=<x>` and the line `label shown "<text>"` of the table; when changing room the `ui:room-label` entity stays **single** (the panel is reused).
4. Step 6: `[soglia] room deselected hall` appears and no new `label shown`.
5. Step 7: no new `room selected` or `room deselected` line (the base is not a room).
6. The area of the living room is 23.9 ± 0.1 (check on the line of step 2); for the other rooms the exact value of the table.
7. With `debug=1`: after step 1 the last `[soglia:state]` line has `selectedRoomId":"living"`; after step 6 it has `selectedRoomId":null`.
8. No `error` entry in the console. None of the selections moved, scaled or rotated the miniature (last `[soglia:state]` line: `miniature.scale` 0.05, `yawDeg` 0).
9. Screenshot attached; the report describes the position of the label (above the room, facing the head) and its readability in words.

## Result
PASS if checks 1–8 are met · FAIL otherwise. If `xr_select` produces no selection, repeat **only once** with the hand at ≤ 0.05 m of horizontal offset from the centre and report the offset; then FAIL.

## To defer to the headset
Size and readability of the text at 0.5–0.8 m, presence of the glyphs `·` and `²` in the font on a real screen, pinch that selects the right room with the real hand and not a neighbouring one (M1 rows in `qa/device/DEBT.md`).

## Changelog
- 2026-10-05: expected text of the label brought to the current ASCII form `<name>: <area> m2` (table, check 1; added the note for house B `Living room & kitchen: 20.2 m2`) — reason: the Inter MSDF font of the panel does not have the glyphs `·` (U+00B7) or `²` (U+00B2) (F1 of the report `qa/reports/M1-2026-10-05.md`). Future goal unchanged: the Unicode text `<name> · <area> m²` remains the desired one; a task of the M2 plan will check which glyphs are available and how to get them, and then the scenario will return to the Unicode form.
- 2026-10-05 (T2.2): expected text brought back to the Unicode form `<name> · <area> m²` (table, note, check 1) and the ASCII note removed — reason: the spike of option A of T2.1 succeeded and T2.2 installed the extended local font (`public/fonts`); the label panel was widened (34 → 46) because the Unicode text fit on two lines with the middle dot at the end of the line. The ASCII form remains only as a fallback if the font does not load.
