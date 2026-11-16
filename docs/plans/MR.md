# MR · Mixed reality: my room (branch `claude/eager-mendel-skcibe`)

**User decision (2026-11-11)**: build the **full version** of mixed reality, on a branch separate from `main`, to be tested on the headset and then merged. Chosen content: (1) the real objects of the room, recognized from the Quest's scan, can be seen, touched (name and measurements) and added to "my furniture" for the FitCheck; (2) **virtual catalog furniture at real size in the room**, resting on the detected floor. The feature freeze (Thu 12, 23:59) slips **only for this feature**; everything stays behind `?mr=1` until it passes the headset test in **two different rooms** (rule already written in `docs/ROADMAP.md`, M5). If it does not pass by **Sunday 15 November in the morning** (deadline given by the user on 2026-11-11), the branch is not merged and the demo stays the one on `main`.

## What the platform gives and what it does not (verified on `@iwsdk/core` 1.0.1, 2026-11-11)

- `world.xr.mode: 'ar'` → `immersive-ar` session with passthrough. `features.sceneUnderstanding: true` → `SceneUnderstandingSystem` creates **`XRPlane`** entities (floor, walls, ceiling, tables as planes) and **`XRMesh`** entities (furniture as volumes with `isBounded3D`, `semanticLabel`, `min`, `max`, `dimensions`), and `XRAnchor` to anchor content. It requires the WebXR features `plane-detection`/`mesh-detection` (and `anchors`).
- The objects **come from the room scan done in the Quest settings (Space Setup)**, not from free recognition from the camera: typical labels `table`, `couch`, `bed`, `storage`, `screen`, `lamp`, `plant`, `wall_art`, `door_frame`, `window_frame`, `other`. An object that the scan does not have does not exist for the app. Free recognition of objects from the camera (IWSDK `camera` feature) would require a vision model or an external service: **excluded** (rule 10 and "no heavy dependencies without asking").
- On the PC: the IWER emulator has synthetic rooms (`dev.emulator.environment`: `living_room`, `meeting_room`, `music_room`, `office_large`, `office_small`) with labelled planes and volumes: the scenarios are tried there; the real test stays on the headset.

## Decisions

**DMR1 · Entry.** `?mr=1` (URL or `dev-params.local.txt`, like `pinch=`) creates the `World` with `xr.mode = 'ar'` and `sceneUnderstanding` on; without the parameter the app is **identical to `main`** (`vr` session, no new system active). Feature detection (rule 5): if `navigator.xr.isSessionSupported('immersive-ar')` is false or the session does not grant `mesh-detection`/`plane-detection`, log `[soglia] feature mr unavailable reason=…` and fall back to the `vr` session (or to the model without the room), never an error. Without a room scan (no `XRMesh`/`XRPlane` after 3 s) a panel says in English to do Space Setup in the headset settings.

**DMR2 · Two views in the same MR session.** The model stays as it is today, floating above the passthrough (transparent background instead of the sky). A menu button (`My room` / `Model`, in the v2 menu bar or as a tab) switches to the **room** view: the model hides, the outlines of the real furniture and the virtual furniture at 1:1 appear. Only one view active at a time; log `[soglia] mr view=room|model`.

**DMR3 · Remote interaction while seated (rules 1, 2).** The real furniture is beyond 60 cm: it is pointed at with the **hand ray** (the hand's target ray; IWSDK `RayInteractable` or a custom ray on the volumes) and chosen with the pinch. No locomotion: you can turn on the chair. The card that opens sits **in front of the head** (anchor `pinned`, 0.55 m, 30° cone), not on the distant object (rule 8).

**DMR4 · Real objects: outlines, card, "Add to Mine".** Every bounded `XRMesh` with a furniture label (`table`, `couch`, `bed`, `storage`, `screen`, `lamp`, `plant`, `other`) has an outline (edges of the volume) in **one** instanced mesh (+1 call) and an English name (`Couch`, `Table`, …). Pinch with the ray → outline highlighted and card: name, measurements **width × depth × height in whole cm** (from the volume, Y axis up), buttons `Add to Mine` and `Close`. `Add to Mine` creates an own piece (`kind: furniture`, measurements sorted like the pieces of `my-furniture.json`, name "My couch", stable id `my-scan-couch-1`), saved in the state (whitelist, additive version 1) and visible in the `Mine` tab of the menu and in the FitCheck on the apartment's doors ("Does my couch fit through the door?"). Walls, floor, ceiling, door and window frames are not added.

**DMR5 · Virtual furniture at real size.** In room view, choosing a piece from the menu (catalog, `Mine`, mobility) creates it **at 1:1** on the detected floor (lowest `floor` plane; fallback: floor height from the `local-floor` reference) at the point hit by the ray, in front of the user. It is moved by dragging it with the ray on the floor, rotated by 90° with the wrist or with the tap of the other hand (as on the model, D19), removed with `Remove` from its card or by releasing it outside the floor. 2D plan collisions with the real volumes and with the other virtual pieces: red outline and label of the reason `Overlaps the couch` (reuse of the placement rules and of the reason label). Maximum 12 pieces in the room. **Not saved between one session and the next in version 1** (the room coordinates change at every session without persistent anchors): declared in the UI ("Room layout is not saved") and in `qa/device/DEBT.md`; pieces added with `Add to Mine` are saved instead.

**DMR6 · Performance (rule 3).** Volume outlines in one instanced mesh, global room mesh never drawn, 1:1 pieces with the same glb files as the model (one piece = 1 call), no shadows. Cap: ≤ 100 calls per view even with 12 pieces; target ≤ 70.

**DMR7 · Texts and data.** All strings in `src/ui/strings.ts`, in English; no simulated data (the real furniture is real: no "Sample data"); no new asset; no external service.

## Tasks (in order; `xr-engineer`, then `logic-tester` where there is pure logic)

| Id | Task | PC acceptance |
|---|---|---|
| MR.1 | **Spike and entry**: `?mr=1` → `World` in `ar` with `sceneUnderstanding`; emulator with `dev.emulator.environment` (synthetic room); log of detected volumes and planes (label, measurements); feature detection and fallback; without `mr` the app is identical (quick regression) | S-MR.1 |
| MR.2 | **Pure logic** `src/logic/room-scan.ts`: labels → names, measurements in cm from the volume, choice of the volume hit by the ray, own piece from a volume, 1:1 floor placement and 2D collisions with the volumes | Vitest tests |
| MR.3 | **Room view and real objects**: `My room`/`Model` button, instanced outlines, ray + pinch, card with measurements, `Add to Mine` saved and visible in `Mine` and in the FitCheck | S-MR.2 |
| MR.4 | **1:1 virtual furniture**: from the menu to the floor, dragging with the ray, rotation, collisions with reason label, `Remove`, cap of 12 | S-MR.3 |
| MR.5 | **Lifecycle and messages**: suspend/resume in MR (grab closed, view kept), "Space Setup" panel if the room is empty, "Room layout is not saved" | S-MR.4 |
| MR.6 | **PC gate** (`emulator-qa`: S-MR.1–S-MR.4 + quick regression of the `vr` session without `mr`), `contest-reviewer`, headset debt, PR towards `main` | report `qa/reports/MR-<date>.md` |

## Headset tests (by the user, before the merge)

In **one room** with Space Setup done (the second room is not needed: user decision of 2026-11-14): the MR session starts; the real furniture appears with the right name; the ray chooses it while seated; the measurements are plausible (±5 cm on a piece measured with a tape measure); `Add to Mine` then FitCheck on the apartment; a virtual sofa at 1:1 on the floor stays still when you turn around; collision with a real piece of furniture; ≥ 60 fps; without `?mr=1` the app is the one on `main`. If a test fails, the feature stays on the branch.

## Changelog
- 2026-11-11: plan created after the user's decision (full version, separate branch, virtual furniture in the room).
- 2026-11-11: deadline for the headset tests and the merge moved to Sunday 15 November morning (user's indication).
