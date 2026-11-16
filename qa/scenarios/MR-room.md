# S-MR · Mixed reality: my room

> **Note 2026-11-14 (UI fixes)**: every step or criterion of this scenario about the FitCheck (door-fit label `Fits` / `Won't fit` / `Fits when disassembled` / `No route`, `ui:fit-label`, `ui:fit-marker-*`, the `fit` menu tab, the wheelchair and stroller pieces) is REMOVED with the feature: skip it. The rest still applies.

> **Note 2026-11-15 (button column)**: in the MODEL view the toggle `ui:room-button` ("My room") is the fifth, top floor of the fixed column beside the model (Menu, Issues, View, Walk inside, My room; 12 x 6 cm), not a panel in front of the head: where S-MR.2/3 say "pinch on `ui:room-button`" in the model view, press it in the column. In the ROOM view the column is away and the pair `Model` + `Menu` (`ui:room-button` + `ui:room-menu-button`, 6 cm tall) is anchored in front of the head as before: the `mr button shown` / `mr button reanchored` lines now appear only there (maxAngleDeg about 30.0).

> **Changelog 2026-11-12 (after the review corrections)**: the `My room`/`Model` button has `Menu` (`ui:room-menu-button`) beside it and the pair sits 0.215 m above the eyes (`mr button shown distance=0.59 maxAngleDeg=25.5`); cards and pair stay inside the 30° cone even with the head tilted; the measurements of real furniture are "About …"; a virtual piece wins over real furniture only if it is in front or inside. Added the one-hand path in S-MR.3.

> **Changelog 2026-11-12**: scenario created for the PC gate of the MR feature (`docs/plans/MR.md`, MR.1–MR.5). Coordinates of the synthetic room `office_large` of the emulator (`floor` plane at y = 0; real sofa center (1.03; 0.42; −0.65), long along z from −1.5 to −0.2, x from 0.62 to 1.44; tall shelf (1.10; 0.73; 0.40)): they must be reread from the `room mesh …` logs at run time.

**Type**: PC (IWER emulator, `dev.emulator.environment: office_large`) · **`CLAUDE.md` rules**: 1, 2, 3, 5, 7, 8, 9, 10
Base parameters: `house=apartment-a&role=visitor&reset=1&seed=1&debug=1&pinch=grip&mr=1`. Pinch = `xr_select` ≥ 0.3 s; the real pinch point is read from `[soglia:hands] … point=`. Aim: `xr look-at` of the hand toward the target.

## S-MR.1 · Entry and regression
1. Without `mr`: `immersive-vr` session, no `ui:room-*`/`ui:scan-*` entity, no `mr`/`room` line, draw calls equal to `main` in the same state.
2. With `mr=1`: `immersive-ar` with `plane-detection` and `mesh-detection` granted; lines `mr world created mode=immersive-ar sceneUnderstanding=on`, `mr session scene-understanding=granted`, `room scan meshes=<n> planes=<n>`; no sky; model as in `vr`.
3. `debug=1&noscan=1&mr=1`: `room scan empty`; in room view after ~10 s the panel `No room scan found. …`; a piece is placed on the fallback floor.

## S-MR.2 · Real objects
1. Pinch on `ui:room-button` → `mr view=room`; model and model buttons hidden; `mr objects outlined=<n>` (no volume as large as the room).
2. Right-hand ray on the sofa → `mr hover … label=couch`; pinch → `mr object selected label=couch size=<l>x<p>x<a>`; card in the 30° cone (`coneDeg` ≤ 30), texts ≥ 2.4 cm.
3. `Add to Mine` → `mr object added id=my-scan-couch-1`, `state saved … scanned=1`; the card shows `Added`; reload without `reset`: "My couch" in the `Mine` tab.
4. In `Model` view, "My couch" from the menu toward a door: FitCheck label with the sofa measurements.

## S-MR.3 · Virtual furniture at real size
1. In room view, palm menu → a piece (e.g. `Armchair`) → ray on the free floor → release: `mr piece placed id=room:piece-armchair#… status=valid`; ray line and cursor visible.
2. Dragged onto the real sofa: `status=invalid`, label `Overlaps the couch`.
3. Rotation with the touch of the other hand: `rot=90`, `rot=180`.
4. Short pinch on the piece → card `Remove`/`Close`; `Remove` → `mr piece removed … reason=card`; release off the floor → `reason=off-floor`.
5. 12 pieces → `mr piece limit reached max=12` and `Room is full`; draw calls ≤ 100 per view; the first placement shows `Room layout is not saved`.
6. `Model` hides the pieces, `My room` shows them again.
7. **One hand only** (right hand only): `My room` → `Menu` (`ui:room-menu-button`) → entry → piece placed with the ray → rotation with the wrist (hand roll) → pinch on the piece → `Remove`.
8. Piece inside the real sofa: it is picked up again; piece behind the sofa: the pinch on the sofa opens the sofa card.

## S-MR.4 · Life cycle
1. F8/F9 with a new piece in hand: no piece duplicated or lost; card closed (`via=suspend`); the view stays.
2. End of session (`xr exit`, then `xr enter`): back to `Model`, the room pieces are gone; "My couch" stays in `Mine`.

## General checks
Console without `error` in the normal path (the framework `warn` `THREE.WebGLRenderer: Can't change size while VR device is presenting.` from `xr exit` is known); no Italian string; no new network request in the app (the synthetic room of the emulator from `www.unpkg.com` concerns development only); ≤ 100 calls per view.

## To defer to the headset
Everything about real passthrough, real Space Setup, real labels, hand ray aiming when seated, wrist rotation, real measurements (±5 cm), fps: see `docs/plans/MR.md`, "Headset tests".
