# S5.4 · One hand only: zoom, rotation, pieces, "Rotate", issue, return

> **Changelog 2026-11-06**: scenario created from the M5 plan (D56, D59; T5.5, T5.6, T5.14; closes T1.15 in the reduced version). It extends S4.6 and S3.7.
> **Changelog 2026-11-06 (gate A/B)**: S5.4 was PASS. Fixed the arithmetic error in step 3 (**two** `zoom-less`, not three). Confirmed at the gate: Rotate at 0.54 m from the head, every press restarts from 12 s (12.00 s from the last press to `hidden reason=timeout`), `ui:menu-undo` after two rotations brings it back to 90° (`undo action=move id=furniture:chair#1`), `hidden reason=grab` only if the button was visible; all the controls at ≤ 0.722 m from the head (`menu button view distance=0.722`, `issue/view button view distance=0.715`).
> **Changelog 2026-11-06 (outcomes of T5.11–T5.15)**: (1) the View panel has **6 rows** (also `Contrast` and `Text`); (2) **"Rotate"** (T5.14): 11 × 5 cm button beside the placed piece, visible for **12 s** after placement and every press restarts from 12 s; it disappears by timeout, by `reason=grab` or if the piece disappears; +90° undoable; if the new rotation collides, the piece stays red with the reason; the `ui:rotate-button` entity **always exists** and hides outside the window (it is not "0 entities" but `Visibility.isVisible` false); log `rotate button shown id=…`, `rotate button pressed id=… hand=right`, `furniture rotated <id> rot=90 source=button`; the system is registered before the menu with a guard on the `menu` claims (a pinch on the button does not open the menu); (3) with large text the fixed buttons are ×1.25 in width (also the pinch rectangles): the positions are read from the `Transform`; (4) **known problem**: a persistent reason label can cover the low rows of the View panel (like W7 of M2): if it happens, close the label (place the piece) before using the panel; warning.
> **Changelog 2026-11-06 (outcomes of T5.1–T5.7)**: (1) the View panel has for now **4 rows** (`Zoom`, `Turn`, `Month`, `Hour`); (2) `Turn` is the **absolute** rotation of the model and its initial value is not always 0: steps 2–3 and checks 2–3 are **relative** to `Y0` read at step 1 (+30° and return to `Y0`, not "0°"); (3) the View panel closes by itself if the menu or the Issues panel is opened: it must be reopened before each group of rows; (4) **two phases for the IWER calibration**: **phase A** (steps 1–3, View panel) runs with `pinch=auto` and the hand at `T + (0; 0.0245; 0.012)` (the 3.3 cm `−`/`+` rows are not centered with the `T − D_GRIP` recipe; the real point is in the log `[soglia:hands] … event=pinch-start point=`); **phase B** (steps 4–9: pieces, Rotate, issue, real scale) runs with `pinch=grip` after rewriting `dev-params.local.txt` and reloading (the XR session is lost: `xr_accept_session` again). Zoom and rotation are not saved, so the transition between the phases restarts from scale 0.05.

**Milestone**: M5 · **Type**: PC (IWER emulator via MCP `iwsdk-runtime`) · **`CLAUDE.md` rules**: 1, 2, 8, 9
Implementation prerequisites: T5.5, T5.6, T5.14 (and M4). See `docs/plans/M5.md`, D56 and D59. Conventions: `qa/scenarios/M4-issue-create.md`.

## Preconditions
- **Phase A** (steps 1–3): `dev-params.local.txt` = `house=apartment-a&role=tenant&reset=1&seed=1&debug=1&pinch=auto&time=2026-12-21T10:00`; hand at `T + (0; 0.0245; 0.012)` for each target `T`.
- **Phase B** (steps 4–9): same file with `pinch=grip` (and `reset=1`), `browser_reload_page`, `xr_accept_session`, `xr_set_input_mode {mode: "hand"}`; hand at `T − D_GRIP`.
- **One hand only, really**: **only `hand-right`** moves; the left stays at rest `(−0.30; 1.10; 0.10)` with select 0 for the whole scenario. Right buttons: `ui:menu-button-right` (0.4347; 1.495; −0.5665), `ui:issue-button-right` (…; 1.565; …), `ui:view-button-right` (…; 1.635; …): hand at `position − D_GRIP`; the panel controls are read from the `Transform`s.

## Steps
1. **Mark the start**: log `pattern: "pinch left|menu opened hand=left"` must stay empty for the whole scenario (reread at the end with `since` from the start); `ecs_query_entity` on `miniature:root` (→ `S0`, `Y0`).
2. **One-hand zoom** (phase A): pinch on `ui:view-button-right`; pinch on `ui:view-zoom-more` twice; log `pattern: "view step|miniature"`; `ecs_query_entity` on `miniature:root` (scale).
3. **One-hand rotation** (phase A): pinch on `ui:view-turn-more` twice (+30° relative to `Y0`); log; `ecs_query_entity` on `miniature:root` (rotation); `ui:view-zoom-less` **twice** (after two `zoom-more` you are at 160 %: 130 %, 100 %; a third goes to 80 %, scale 0.04) and `ui:view-turn-less` twice (back to 100 % and to `Y0`); close with `ui:view-close`. **Switch to phase B**: rewrite the file with `pinch=grip` and reload (see Preconditions).
4. **One piece** (phase B): pinch on `ui:menu-button-right`; tab `Items`; take `ui:menu-item-chair` with the right hand and place it in the living room at `W(1.5; 3.0)`; log `pattern: "furniture|menu"`.
5. **Rotate**: wait 1 s; `ecs_find_entities` `^ui:rotate-button$` (→ 1, visible: `Visibility`); `ecs_query_entity` on its position; pinch on `ui:rotate-button` within 12 s of placement; log `pattern: "rotate|furniture"`; repeat a second time (every press restarts from 12 s); then wait 14 s without touching anything and reread `Visibility` (→ not visible, `rotate button hidden reason=timeout`); then `ui:menu-undo` (if the menu is closed, reopen with `ui:menu-button-right`).
6. **Issue**: pinch on `ui:issue-button-right`; (role `tenant`) close the panel; long pinch on the washing machine as in S4.1 step 2 (select 1 for 1.5 s, then 0), `ui:issue-phrase-leaks`, `ui:issue-report`: log `pattern: "issue|pins"`.
7. **Real scale and return**: long pinch (0.8 s) on `viewpoint:V1`; wait 2.5 s; pinch on `ui:tabletop-button`: log `pattern: "viewpoint|tabletop"`.
8. **The role**: pinch on `ui:issue-button-right`, `ui:issue-role-landlord` and close; log `pattern: "role"`.
9. **Final check**: log `pattern: "pinch left|menu opened hand=left|error"` and unfiltered (`error`, `uncaught`, `Cannot read`, `reading 'add'`, `Missing glyph`); cleanup.

## Checks (all mandatory)
1. **Steps 1–9, the left hand**: **no** `pinch left` line, no `menu opened hand=left`; the `ecs_query_entity` pose of `hand-left` never changes.
2. **Step 2**: `view step row=zoom value=130% scale=0.065` (again `160%` / 0.08 at the second); the scale of `miniature:root` = 0.08 ± 0.001 and the offset unchanged (`recenter` is not needed).
3. **Step 3**: `view step row=turn value=<Y0+15>` and `<Y0+30>` (`Turn` is the absolute rotation of the model, initial value `Y0` read at step 1, not always 0); the rotation of `miniature:root` = `Y0` + 30° ± 0.5 around Y; after the return scale 0.05 and rotation `Y0` (± 0.001; the pieces and the rest of the scene unchanged).
4. **Step 4**: `menu opened … mode=pinned` and `furniture placed furniture:chair#1 room=living … status=valid`.
5. **Step 5**: `rotate button shown id=furniture:chair#1`; 1 `ui:rotate-button` visible at ≥ 0.50 m from the head; at each press `rotate button pressed id=furniture:chair#1 hand=right`; after the two presses `furniture rotated furniture:chair#1 rot=90 source=button` then `rot=180 source=button`; the store has `rotationDeg` 180 and the history two more entries; after 14 s without actions `rotate button hidden reason=timeout` (the entity stays, not visible); the button is **not visible** while a piece is in hand (`rotate button hidden reason=grab`); a pinch on the button neither opens nor closes the menu; after `ui:menu-undo` the piece goes back to 90°; if the rotation makes the piece collide, it stays in the model with a red frame and the reason.
6. **Step 6**: `issue created id=issue-014 … text="The washing machine leaks."`, `pin:issue-014` red; the "Rotate" button does not open by mistake at that moment.
7. **Step 7**: `viewpoint entered id=V1 …` and, after `ui:tabletop-button`, `viewpoint exited id=V1 …`; `miniature:root` goes back to the scale and rotation of before (± 0.001).
8. **Step 8**: `role changed from=tenant to=landlord source=ui`.
9. No `error` entry; no `Missing glyph`; no `reading 'add'`; everything done seated, at ≤ 0.72 m from the head, without locomotion.
10. **Headset only** (high): six fixed buttons reachable and distinguishable with one hand; "Rotate" is not pressed by mistake; the zoom and rotation steps are comfortable compared with the two two-hand gestures.

## Outcome
PASS if checks 1–9 are met · FAIL otherwise.

## To defer to the headset
Entries "View buttons", "Rotate", "Zoom and rotation with buttons" of M5.
