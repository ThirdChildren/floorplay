# Floorplay roadmap

> **Project name (2026-11-16)**: the project was renamed from Soglia to **Floorplay** on 2026-11-16 (repository
> `ThirdChildren/floorplay`, Pages URL https://thirdchildren.github.io/floorplay/). All the documentation was
> translated to English the same day. The literal runtime strings (`[soglia]` / `[soglia:stats]` log prefixes,
> `soglia:v1:*` storage keys) keep their names. **M7 (submission) is in progress.**

Every milestone has **two gates**:

- **PC gate** — everything verifiable on the PC (Fedora) with automated tests and with the IWER emulator
  driven via MCP (`iwsdk-runtime`). It is the gate that decides whether to move on to the next milestone.
- **Headset gate** — the same functions tried on a real Meta Quest. As long as the headset is not available,
  the checks accumulate in `qa/device/DEBT.md` and are recovered in milestone **M6**.
  If the headset arrives earlier, the headset gate is done at the end of each milestone.

Status legend: ⬜ to do · 🟨 in progress · ✅ PC-done · 🟩 Device-done

**Device status (2026-11-16)**: the owner tested the latest features on the Quest and reported that everything works
(no numbers). Every milestone with device debt still has at least one row that needs a measurement (fps, draw calls,
triangles, cold start, network, console, exact distances or angles), so **no milestone is 🟩 Device-done yet**: M0–M5, M6
and MR are marked "functionally verified on device by owner (2026-11-16), measurements pending". A milestone becomes
🟩 only when every row of `qa/device/DEBT.md` for it is ✅ with a report in `qa/device/`.

| Milestone | Period | Status |
|---|---|---|
| M0 Setup and tools | 30 Sep – 1 Oct | ✅ PC-done (plan: `docs/plans/M0.md`); functionally verified on device by owner 2026-11-16, measurements pending (cold start, network requests, console, `views=2`) |
| M1 House and tabletop model | 2 – 7 Oct | ✅ PC-done 2026-10-05 (plan: `docs/plans/M1.md`; report: `qa/reports/M1-2026-10-05-rerun.md`); functionally verified on device by owner 2026-11-16, measurements pending (fps and real draw calls/triangles with A and B) |
| M2 Furnishing with the hands | 8 – 14 Oct (PC-done brought forward to 7 Oct) | ✅ PC-done 2026-10-07 (plan: `docs/plans/M2.md`; report: `qa/reports/M2-2026-10-06-rerun3.md`; `contest-reviewer`: PASSED WITH RESERVATIONS, no blockers); functionally verified on device by owner 2026-11-16, measurements pending (worst-case fps and calls, narrow-field-of-view angles, console/network checks; see `qa/device/DEBT.md`) |
| M3 Inside the house and my furniture | 15 – 21 Oct (PC-done expected 12–13 Oct) | ✅ PC-done 2026-11-02 (plan: `docs/plans/M3.md`; report: `qa/reports/M3-2026-10-10.md`; `contest-reviewer`: APPROVED WITH WARNINGS, no blockers; T3.15 cut); functionally verified on device by owner 2026-11-16, measurements pending (fps and real draw calls, console warnings; see `qa/device/DEBT.md`) |
| M4 Issues and persistence | 2 – 8 Nov (PC-done expected Sun 8, limit Mon 9) | ✅ PC-done 2026-11-04 (plan: `docs/plans/M4.md`; report: `qa/reports/M4-2026-11-03.md`; `contest-reviewer`: APPROVED WITH WARNINGS, no blockers; voice note, system keyboard, full viewpoint confirmation and italic W4 not done; branch `m4`); functionally verified on device by owner 2026-11-16, measurements pending (fps and real draw calls, fade durations; see `qa/device/DEBT.md`) |
| M5 Light, agent, accessibility, mixed reality (**reduced**) | 9 – 12 Nov (PC-done by Thu 12, 23:59; started Fri 6 Nov) | ✅ PC-done 2026-11-06 (plan: `docs/plans/M5.md`; report: `qa/reports/M5-2026-11-06.md`; `contest-reviewer`: APPROVED WITH WARNINGS, no blockers, fixable warnings closed; T5.RA done; real shadows, interest map and comparison cut); functionally verified on device by owner 2026-11-16, measurements pending (fps and real draw calls, font-startup console checks, full-demo timing, fade durations; see `qa/device/DEBT.md`) |
| M6 Headset integration | **phase A** (tools, without headset) Sat 7 – Mon 9 Nov; **phase B** with the Quest (arrives Tue 10): sessions 10 – 13 Nov, main session Fri 13; fallback: link smoke test 15 – 16 Nov | 🟨 **phase A PC-done 2026-11-07; phase B in progress**: first headset session 2026-11-11 (log-based, palm menu defect found and fixed on the PC), then the owner's functional device test of 2026-11-16 (everything works, no numbers); developer-tooling rows and all measurements are still open (phase A PC gate PASSED: report `qa/reports/M6-2026-11-07.md`, zero blockers) · plan delivered 2026-11-07 (plan: `docs/plans/M6.md`; user guide: `docs/QUEST_SETUP.md`; phase A scenarios: `qa/scenarios/M6-*.md`) |
| MR Mixed reality (opt-in `?mr=1`) | 11 – 15 Nov (branch `claude/eager-mendel-skcibe`; merge after the headset test in one room (the second is not needed, decision of 2026-11-14), by Sun 15 morning) | ✅ PC-done 2026-11-12 (plan `docs/plans/MR.md`; report `qa/reports/MR-2026-11-12.md`; `contest-reviewer`: code without violations, warnings being fixed); functionally verified on device by owner 2026-11-16 (owner-reported: everything works), measurements pending (±5 cm furniture measurements, fps, network) |
| M7 Polish and delivery | 14 – 17 Nov (internal delivery Tue 17, 18:00; deadline Wed 18 Nov, 12:00 PT = 21:00 in Italy) | 🟨 in progress (as of 2026-11-16: project renamed to Floorplay, documentation translated to English; see the changelog) |

### Rescheduled calendar (2026-11-02)

The original dates (M4 22–28 Oct, M5 29 Oct–4 Nov, M6 2–10 Nov, M7 9–15 Nov) were **out of date**: M3 closed on
2 November with ~12–13 h of active work against 7 estimated (factor ≈ 1.8, three interruptions for usage limits).
16 days remain until delivery. The user decided to carry on ("everything else slips, I think we can
make it"). The estimates of `docs/plans/M4.md` apply the factor 1.8: M4 ≈ **23 real hours** (range 16–32 h).

| When (Italy) | What |
|---|---|
| Mon 2 – Sun 8 Nov | **M4**: Block R (carry-overs from the M3 gate), issues, persistence, PC gate |
| Mon 9 – Thu 12 Nov | **reduced M5**: sun, minimal agent, basic accessibility; R-A if there are shadows |
| **Thu 12 Nov, 23:59** | **FEATURE FREEZE**: no new task after **Wed 11 Nov, 12:00**; afterwards only fixes, tuning, documents |
| 10 – 13 Nov (half days) | **M6** as soon as the Quest is there; main session Fri 13 |
| Sat 14 – Tue 17 Nov | **M7**: README and `DATA_FORMATS.md` in English, video < 3 min, Devpost, test instructions, `contest-reviewer`, manual deploy, link check |
| Tue 17 Nov, 18:00 | **internal delivery**; Wed 18 morning in reserve |

**Cuts, in order** (details and what is lost in `docs/plans/M4.md`, "Cuts"): voice note and system keyboard (already
cut from the start) → viewpoint confirmation (T4.R6) and W4 → distance grab (already cut, T3.15) → comparison of
two layouts/houses → interest map and questions → mixed reality → sun shadows → complete one-hand mode of M5.
**Scenario A** (moderate delay): cuts down to the map. **Scenario B** (M4 not PC-done Mon 9 night): minimal M4 and M5
reduced to sun (dial) + Furnish/Clear + high contrast/large text.

The headset must be obtained **as soon as possible**: every day without a Quest pushes the checks of the long pinch, of the 60 fps and
of the real resume into `qa/device/DEBT.md`.

---

## M0 · Setup and tools

**Goal**: project ready, agents and tests working, first commit.

- Registration for Meta VR Start (done by the user), Meta account with developer access.
- `npm create @iwsdk@latest` (TypeScript, hand tracking on), then copy this kit into the root.
- `npx @iwsdk/cli adapter sync` to register the `iwsdk-runtime` MCP server.
- Add Vitest (`npm i -D vitest ajv ajv-formats`) and the script `"test": "vitest run"`.
- CI workflow (`.github/workflows/ci.yml`) and manual Pages (`pages.yml`).
- First git commit.

**PC gate**: `npm test` runs (even with a single schema test), `npm run build` ok,
`npx @iwsdk/cli dev up --ai-mode agent` started and `xr_get_session_status` answers.
Scenarios in `qa/scenarios/M0-*.md` (S0.1 toolchain, S0.2 runtime and XR session, S0.3 clean start).
**Headset gate**: none.

## M1 · House and tabletop model

**Goal**: from the file `apartment-a.json` the tabletop model is born on the table, it is rotated and enlarged
with two hands.

- Validation of the JSON files with `schemas/house.schema.json` (readable errors).
- `HouseBuilder`: floors by material, walls with door and window openings, merged geometries.
- `Miniature`: 1:20 scale, walls cut at 1 m, placed in front of the seated user
  (~0.45 m ahead, ~0.25 m below the eyes), rotation and zoom with two-hand pinch.
- Touch on a room → label "Living room & kitchen · 24 m²" (area computed from the polygon).
- Onboarding: ghost hand that shows the pinch, without text.

| PC scenario | Check |
|---|---|
| S1.1 Open the house | `?house=apartment-a&reset=1` → entity `house:apartment-a` present, 5 rooms, 13 walls |
| S1.2 Two hands | two-hand pinch and moving apart → the scale of the tabletop model increases; rotation of ~90° |
| S1.3 Room label | pinch on the living room → label with area 23.9 m² (± 0.1) |
| S1.4 Budget | `?debug=1` → draw calls and triangles within the budget of `CLAUDE.md` |
| S1.5 House B and errors | `?house=apartment-b` → 4 rooms, 9 walls; `?house=nope` → error panel, no network request (added by the M1 plan) |
| S1.6 Onboarding | ghost hand: pinch → two hands → end, without text (added by the M1 plan) |

Scenarios in `qa/scenarios/M1-*.md`. The MCP tools do not navigate to URLs with parameters: QA writes
`dev-params.local.txt` and does `browser_reload_page` (see `docs/plans/M1.md`, decision D1).

**Unit tests**: polygon area, openings inside the wall length, valid schema for A and B.
**Headset gate (deferrable)**: height and distance of the tabletop model comfortable when seated, readability of the
labels, reliable two-hand pinch, fps ≥ 60.

## M2 · Furnishing with the hands

**Goal**: catalogue on the palm, furniture grabbed, snapped, rotated and checked.

- Palm menu (palm facing up, both hands) with the entries of the active mode.
- Catalogue from `public/catalog/catalog.json`; CC0 models from the `asset-curator`.
- Grab (IWSDK), snapping to the floor and walls, 90° step rotation with the wrist,
  red outline if it collides or blocks a door, green if valid.
- Undo from the menu; a piece left outside the tabletop model returns to the catalogue. An invalid piece **stays in the model** with the red frame and a short label (in English) that explains the reason (T2.9b).
- **T2.0b (spike, 30 min)**: controller models replaced by a local shape with the `AnimatedHand` method, without touching `node_modules`; if not feasible, a row in `qa/device/DEBT.md`.
- **T2.1 (first interface task)**: check of the glyphs of the panel font (`² · × ° − ± → ≈`; static check: only `°` is there) and a 45-minute spike on **option A** (MSDF atlas extended from Inter OFL: the user's ok and the second licence exception in `docs/RULES.md` are already given); if the spike fails, **option D** (final ASCII) without further questions. After T2.2 (option A) the room label (S1.3) returns to `<name> · <area> m²`.
- **T2.17a/b (mandatory, user decision)**: move the tabletop model with **two hands** (midpoint as pivot) and with **one hand** (pinch on the free base, never on a room or a piece), 0.30 m limit from the anchor, locked height, "Recenter" (`ui:menu-recenter`) in the menu; pinch priority menu > furniture > two hands > translation > room. Today the tabletop model never moves.
- **T2.16 (hint, not onboarding)**: a small cue ("Palm up for the menu") stays visible until the palm menu has been opened for the first time; the **complete menu onboarding moves to M5**; the M1 onboarding (S1.6) does not change.
- `@pmndrs/uikit-lucide` icons allowed as a library in the bundle, always with a text label, cited in `CREDITS.md` (Libraries).
- The M2 catalogue shows only the 14 `furniture` pieces (cap `MAX_PIECES = 40`); the `mobility` ones (wheelchair, pushchair) come in M3.
- Correction of the staging of `apartment-a.json` approved (bookcase x 10.8 → 10.69; sofa z 3.42 → 3.10): the preset test must fail if a piece leaves the room, enters a wall or occupies a door opening.

| PC scenario | Check |
|---|---|
| S2.0 Font glyphs | `glyphs=1` → on-screen audit of the characters (part A); after T2.2 no `Missing glyph info` and the label `Living room & kitchen · 23.9 m²` (part B) (added by the M2 plan) |
| S2.1 Palm menu | left hand with palm up → `ui:palm-menu` visible; same with the right; 6 entries per page, 3 pages |
| S2.2 Place the bed | pinch on `bed-double`, drag into the bedroom, release → entity inside `bedroom`, resting against a wall |
| S2.3 Collision | push the bed against the wardrobe → state `invalid`, red outline **and label "Overlaps the wardrobe"**; move it → `valid`, label gone |
| S2.4 Undo | "Undo" → the last action disappears from the store |
| S2.5 Step rotation | wrist or touch with the other hand → 0 → 90 → 180 → 270, footprint and snapping recomputed (added by the M2 plan) |
| S2.6 Blocked door | armchair in front of `door:d-bedroom` → `invalid` with reason `blocks-door`, valid next to the door (added by the M2 plan) |
| S2.7 Return to the catalogue | release outside the house → `furniture returned`, no entity; undo restores the same id (added by the M2 plan) |
| S2.8 Budget with furniture | `furnish=scandinavian&debug=1` → 14 pieces, `callsPerView` ≤ 100, triangles ≤ 150,000, app textures ≤ 4 (added by the M2 plan) |
| S2.9 Move the tabletop model | **mandatory (T2.17a/b)**: translation with two hands **and with one hand** (pinch on the base), 0.30 m limit, height unchanged, "Recenter", no conflict with the grab of pieces and the selection of rooms (added by the M2 plan) |

**Unit tests**: snapping to walls, collisions between rotated rectangles, blocked door, step rotation, store with undo, catalogue, pinch arbitration, palm detection, glyph guard, tabletop model translation (clamp, disjoint pinch zones), valid furnishing preset, reason labels.
**Calendar**: PC-done expected by **11 October 2026** (buffer 12–14 Oct); **reached on 7 October 2026** (report `qa/reports/M2-2026-10-06-rerun3.md`, verdict PASSED WITH RESERVATIONS, no blockers; reservations and warnings in the report). Order of execution and estimates in `docs/plans/M2.md`.
**Headset gate (functionally verified by the owner on 2026-11-16, measurements pending)**: natural grab, no jitter, reliable wrist rotation, reliable palm-up; M2 rows in `qa/device/DEBT.md`. The IWER budget (66 calls per view at scale 0.05 and 53 at 0.12 in the worst case, 30.7k triangles) is a PC number, not a headset one. Persistence absent in M2 (rule 4): furniture is lost on reload; the first slice (saving to `localStorage`) arrives with the first tasks of M3.

## M3 · Inside the house and my furniture

**Goal**: viewpoints, tape measure, own furniture and door checking; in addition the resume
after a pause (first slice of persistence), the one-hand menu and the draw call forecast.
Plan and decisions D29–D38 in `docs/plans/M3.md`.

**The first four tasks, in this order and before any other work** (user request):

1. **Minimal saving + lifecycle** (T3.1a/b): the furniture layout is saved to
   `localStorage` (key `soglia:v1:state:<house>`, `serialize/deserialize` of `src/logic/state.ts`,
   cleared by `reset=1`); it is the **first slice of M4's `Persistence`**, not a separate system (M4
   reuses `storage.ts`, `persistence.ts` and the lifecycle and only adds the fields: role,
   issues). Session hidden/resumed with a piece in hand: the grab closes cleanly, no
   piece lost or duplicated.
2. **Palm up and pinch point from the joints** (T3.2a/b, 45-minute spike with declared
   fallback): `XRHand` joints via `fillPoses`, `gripSpace` only as a reserve.
3. **Fixed "Menu" button** on the edge of the tabletop model, openable with a pinch of ONE hand, with
   `pinned` menu (Undo and Recenter included) (T3.3a/b); it also closes warning F-A of M2.
4. **Draw call forecast up to M5** with tracking at every gate (T3.4).

Then: menu v2 (texts ≥ 2.4 cm, tabs), room label in the cone, FitCheck, own furniture,
viewpoints, tape measure (T3.5–T3.17).

- `Viewpoint`: pinch on V1/V2/V3 → fade → real scale at seated eye height (1.2 m);
  "Tabletop" from the menu to go back. Distance grab in the room (T3.15, **cuttable**: if it is dropped,
  in real scale pieces are taken only at arm's reach and this is declared).
- ~~`Measure`~~ **REMOVED on 2026-11-14** (interface fixes, `qa/reports/UI-FIX-2026-11-14.md`): pinch on two points, snapping to walls and corners, measurement in cm.
- ~~`FitCheck`~~ **REMOVED on 2026-11-14** (interface fixes, `qa/reports/UI-FIX-2026-11-14.md`): path from the entrance door to the room (door graph), check of every
  door; the same for wheelchair and pushchair. Message in English that explains the reason.

| PC scenario | Check |
|---|---|
| S3.1 Viewpoint | pinch on `viewpoint:V1` → camera at real scale in the living room; "Tabletop" → return |
| S3.2 Tape measure (**removed 2026-11-14**) | measure the window of the study → 140 cm (± 1) |
| S3.3 Sofa in A (**removed 2026-11-14**) | "My sofa 230 × 95 × 85" towards the living room → block on `door:d-living`, message "Won't fit: the door is 80 cm wide, the sofa's shortest side is 85 cm" |
| S3.4 Sofa in B (**removed 2026-11-14**) | same test in `apartment-b` → it passes |
| S3.5 Wheelchair (**removed 2026-11-14**) | towards the bathroom of A → block on `door:d-bathroom` (75 cm); the pushchair (60 cm) passes |
| S3.0 Persistence and pause/resume (added by the M3 plan) | `qa/scenarios/M3-persistence.md`: save, reload (same pieces, same ids), `reset=1` clears, one key per house, session hidden with a piece in hand (no duplicate, grab closed, same id on resume) |
| S3.6 Palm and pinch from the joints (added) | `qa/scenarios/M3-joints.md`: `joints`/`grip` source, palm up from the joints, pinch point, `pinch=grip` as a reserve |
| S3.7 One-hand Menu button and F-A (added) | `qa/scenarios/M3-menu-button.md`: opening, page, grab, Undo and Recenter with the right hand only; the in-air pinch of the menu hand does not select the room |
| S3.8 Menu v2 and labels in the cone (added) | `qa/scenarios/M3-menu-v2.md`: texts ≥ 2.4 cm, tabs, panel ≤ 0.38 m and ≤ 30°, room label in the cone |
| S3.9 Budget: forecast against measurement (added) | `qa/scenarios/M3-budget.md`: eight cases K1–K8; > 100 per view blocks, worst case ≥ 85 opens R-A in M4 |
| S3.10 Distance grab (added, only if T3.15) | `qa/scenarios/M3-distance-grab.md`: ray from the hand at real scale; not applicable if the task is cut |

The FitCheck does not reuse `blocks-door` (free zone in front of the door, M2): the codes are
`door-too-narrow`, `door-too-low`, `fits-disassembled`, `no-route`. Corridors not verified
("Simplified check"). `sofa-3seat` from the catalogue does not pass through `d-living` of A (consistent: the preset never
shows the label until the piece is in hand); the demo case remains `my-sofa` 230 × 95 × 85.

**Unit tests**: door graph, path, passage rules (see `docs/DATA_FORMATS.md`),
persistence (keys, whitelist, `localStorage` missing/blocked/full), lifecycle, hand joints,
menu and button, forecast of draw call groups, real-scale pose, fade,
tape measure snapping.
**Calendar**: PC-done expected **12–13 October 2026** (buffer up to 15; official window
15–21 Oct as margin). Honest estimate in `docs/plans/M3.md` (≈ 7 h of clock time; optimistic 4.5 h,
pessimistic 11 h).
**Headset gate**: fade without nausea, credible real scale, precise freehand tape measure;
in addition (rows in `qa/device/DEBT.md` once the gate is passed): resume after taking the headset off, `localStorage`
in the Quest Browser, real joints, reachability of the Menu buttons, real draw calls and fps with the worst
case. **Status 2026-11-16**: functionally verified on device by the owner, measurements pending (fps and real draw calls; the tape measure was removed).

**Result of the PC gate (2026-11-02)**: **passed**, report in `qa/reports/M3-2026-10-10.md` (index) with
A, B, rerun of S3.5, C1 (M2 regressions) and C2 (M1 regressions). `npm test` 4465 tests in 75 files,
typecheck and build ok, CI green. One blocker found and fixed during the gate (F-S3.5-1, error
`PanelUISystem ... (reading 'add')` with the FitCheck and reason labels, commit `9d52d0e`).
Draw calls: worst case K4 = 71 per view (< 85: **R-A does not become the first task of M4**), M5 projection
≈ 86. **T3.15 (distance grab and measure) cut**: in real scale pieces are taken only at arm's
reach, the tape measure works only on the tabletop model, S3.10 not applicable, the task moves to M5/M7. Headset
debt rows in `qa/device/DEBT.md` (M3 rows). Real execution time ≈ 12–13 h of active work
against 7 h estimated, with three interruptions for account usage limits.

## M4 · Issues and persistence

**Goal**: the complete issue cycle and the resume after a pause.
**Plan and decisions D39–D52 in `docs/plans/M4.md` (delivered on 2026-11-02, 🟨)**: first Block R (carry-overs from the
M3 gate, T4.R1–T4.R7), then issues and persistence (T4.1–T4.12), PC gate (T4.13) and review (T4.14). Estimate:
≈ 23 real hours (central × 1.8); PC-done expected Sun 8 Nov, limit Mon 9.

- `Roles`: visitor, agent (M5), tenant, owner; **the change happens from the new "Issues" panel**
  (two mirrored buttons above the "Menu" buttons, reachable with one hand; the palm menu is at the limit of the
  30° cone), not from the palm menu; the role is saved, a `role=` in the URL wins (D41).
- `Issues`: long pinch (0.8 s) on a point or on a fixture → placeholder; category (proposed by the
  fixture), urgency, **text chosen among predefined phrases per category** (no keyboard: D40; the system
  keyboard and the voice note with MediaRecorder are optional extras, feature-detected, cut from the start);
  states open → in_progress → resolved → archived; tenant confirmation; move-in report (blue, "Sample data").
- `Persistence`: automatic saving (localStorage/IndexedDB with try/catch), resume on reload
  and on `visibilitychange`. **The first slice is delivered in M3** (T3.1a/b: key
  `soglia:v1:state:<house>`, whitelist of restored fields, `reset=1`, lifecycle with a clean
  closed grab); M4 reuses `src/data/storage.ts`, `src/logic/persistence.ts` and the lifecycle and
  only adds `role` and the issues to the whitelist, the possible version bump and
  IndexedDB if the quota requires it. The M3 worst case of draw calls measured **71** (< 85):
  R-A (merging walls and thresholds into two meshes, −16 calls per view, ~2.5 h; see `docs/plans/M3.md`, D33)
  is **not** the first task of M4, but remains ready if the Quest measures more.
- **Carry-overs from the M3 gate → Block R of `docs/plans/M4.md` (to be executed BEFORE the new work; prerequisites: (1), (2), (5), (9) = T4.R1–T4.R4; deferrable: (3)+(6) T4.R5, (4) T4.R6, W4 T4.R7; (7) scenarios already corrected on 2026-11-02, with a changelog row; (8) in M7)** (warnings from the `contest-reviewer` and `emulator-qa`), in
  order of importance: (1) **real scale without a menu for one-handed users**: show at least one
  button to return to the tabletop model even in real scale (rule 9); (2) **`pinned` menu in the 30° cone
  only with a level gaze**: anchor that accounts for pitch (`fitPanelToCone`); (3)
  pillar `viewpoint:V2` that covers a digit of the hallway label (`Hallway · 13_ m²`,
  `qa/reports/M3-gate-C2-S1.3-label-hall.png`): move the label or make the markers pass under
  the labels; (4) pinch near a viewpoint marker that replaces the zoom: dead zone
  or confirmation; (5) loss of own pieces if `my-furniture.json` does not load (do not rewrite the
  saved state with discarded pieces); (6) `placeRoomLabel` below the plane with rooms less than 0.52 m from the
  head; (7) correct the scenarios with non-free points (S3.0, S3.2 step 10, S3.3 steps 5-6, S2.9
  step 10, S2.6 step 6) and the italic W4; (8) `README.md` still at "M0" and `docs/DATA_FORMATS.md` in
  Italian (before delivery, M7); (9) move `flushPanelDisposals()` out of `PalmMenuSystem`.

| PC scenario | Check |
|---|---|
| S4.1 Issue | `qa/scenarios/M4-issue-create.md`: role tenant, long pinch on `fixture:washer` → category `appliances`, phrase "Leaks" → text `The washing machine leaks.` (predefined phrases instead of the keyboard, D40), urgency medium → red `pin:issue-014`; free point with category choice; unauthorised roles |
| S4.2 Voice (optional) | `qa/scenarios/M4-voice-note.md`: always: no voice button without the API (no dead button); if T4.15: note recorded and linked |
| S4.3 Owner | `qa/scenarios/M4-landlord-flow.md`: role landlord → list by urgency (`014, 013, 012, 010`); "Take on" → orange; "Resolved" → green; tenant confirmation → history (archived); "Reopen" |
| S4.4 Resume | `qa/scenarios/M4-persistence-resume.md`: reload → same issues, same role (an explicit `role=` wins), own pieces not lost (`failmy=1`), suspension with the draft open |
| S4.5 Move-in report | `qa/scenarios/M4-move-in-report.md`: "Move-in report" → blue placeholder from `issues-apartment-a.json`, "Sample data" |
| S4.6 One-hand real scale (added) | `qa/scenarios/M4-one-hand-real-scale.md`: button `ui:tabletop-button` in real scale, return with one hand only (carry-over 1 from M3) |
| S4.7 Tilted `pinned` menu (added) | `qa/scenarios/M4-pinned-menu-pitch.md`: cone ≤ 30° with pitch from +10° to −14° (carry-over 2) |
| S4.8 Label, pillar, dead zone (added) | `qa/scenarios/M4-labels-and-markers.md`: hallway label readable, minimum height, viewpoint confirmation (carry-overs 3, 4, 6) |
| S4.9 Quick regression (added) | `qa/scenarios/M4-regression.md`: S1.2, S1.3, S1.6, S2.1–S2.9, S3.0–S3.9 with `pinch=grip` and the corrected points |
| S4.10 Budget (added) | `qa/scenarios/M4-budget.md`: K1–K13, M4 worst case K11 (forecast 74); ≥ 85 opens R-A in M5 |

**Unit tests**: state machine (valid and forbidden transitions), serialization/deserialization,
permissions per role.
**Headset gate**: long pinch distinct from the normal pinch, "Issues" buttons and panel readable and
reachable with one hand, one-hand real scale ("Tabletop"), resume after taking the headset off; system
keyboard in WebXR and microphone in the Quest Browser only if the optional extras (T4.15, T4.16) were done.
Rows planned in `docs/plans/M4.md`, "Debt for `qa/device/DEBT.md`" (added by the user at the gate).
**Status 2026-11-16**: functionally verified on device by the owner, measurements pending (fps and real draw calls, fade durations).

## M5 · Light, agent, accessibility, mixed reality

**Plan and decisions D53–D64 in `docs/plans/M5.md` (delivered on 2026-11-06, 🟨)**: first Block R (carry-overs 1–5 from the M4 gate plus logs and cleanup, T5.R1–T5.R6), then sun (own algorithm, **light patches instead of shadows**, "View" panel with month/hour, button zoom and rotation = reduced T1.15), agent (info points, undoable Furnish / Clear), accessibility (high contrast, large text, "Rotate", coach of the "Menu" button), PC gate (T5.17) and review (T5.18). Estimate: ≈ 30 real hours (central × 1.8); capacity up to Thu 12 ≈ 44 h. **Cut from the start**: comparison of two layouts/houses, interest map and questions (S5.2), mixed reality `?mr=1`, shadows with shadow map, one-hand drag; **below the line**: large-text menu v2 (T5.16). R-A (T5.RA) is conditional on checkpoint T5.7 (worst case ≥ 85).

**Carry-overs from the M4 gate (warnings from the `contest-reviewer` and `emulator-qa`, 2026-11-04), in order of importance**: (1) **`transitionIssue` must use `state.role`** (the reducer today trusts the role passed by the caller: today the only caller passes `state.role`, so there is no real bypass, but M5 adds callers); (2) **persistence even if `catalog.json` does not load** (`src/index.ts` restores and saves only with the catalogue: role and issues would be lost); (3) **"Agent" chip**: today it is a role without functions with the hint "Info points for agents are coming soon.": M5 delivers the info points or the chip is hidden before M7; (4) **list accessibility**: status in words or shape besides the coloured dot (D46), row text truncated at about 16 characters, `Medium` at the panel edge in the detail, blue of the move-in report close to the blue of the pillars; (5) **opening the detail with two presses** (discoverability): an indication or a single pinch; (6) **scenarios to align** (user decision, not touched): S3.0 check 4 (`state restored pieces=0` instead of `state none` with the seed), S4.3 step 4 (two presses), S4.5 steps 2 and 5 (switch off by default), non-free points of S3.0 phase 2 and S3.5 step 3; (7) the framework `warn` `THREE.WebGLRenderer: Can't change size while VR device is presenting.` (only `xr_end_session`) in the log contract; (8) `console.error` of `src/index.ts` outside the prefix, `strings.issues.comingSoon` almost dead, `?glyphs=1` without `debug=1`; (9) cap of 40 pieces that does not count the parked ones (very rare); (10) full 0.30 s confirmation on the viewpoint (T4.R6) and italic W4 (T4.R7) if the headset asks for them.

**Goal**: all the demo functions present. **Rescheduled on 2026-11-02 (9 – 12 Nov, PC-done by Thu 12
23:59 = feature freeze)** and **reduced to the minimum that holds the three acts**: sun, Furnish/Clear and
info points, high contrast and large text, "Rotate", menu onboarding remain; the following can be cut, in this order:
comparison of two layouts/houses, interest map and questions, mixed reality (`?mr=1`, outside the demo unless tested
on the headset in two rooms), shadows (R-A is avoided), complete one-hand mode. The worst case of the agent role reaches
~95 calls with shadows: R-A (−16) is the first task of M5 if there are shadows (see `docs/plans/M4.md`).

- `Sun` with SunCalc, month/hour knob, shadows only in the active room.
- Agent: info points, "Furnish / Clear" (preset `staging`), interest map with
  label "Sample data", questions received.
- Comparison of two layouts and two houses.
- Accessibility: one-hand mode, high contrast, large text.
- **Complete palm menu onboarding** (postponed from M2/T2.16, where only a hint remains): teach palm up, the "Menu" button and the grab from the catalogue, with minimal text in English.
- **Menu and Recenter usable with one hand only** (explicit item, decision of the M2 gate of 2026-10-06; rule 9 of `CLAUDE.md`) — **DELIVERED IN M3 (2026-10-09, T3.3a/b, S3.7)**: the fixed "Menu" button on the edge of the tabletop model (`ui:menu-button-left`/`-right`) opens with a pinch of ONE hand the `pinned` menu (0.55 m ahead, 0.20 m below the eyes, in the 30° cone), which stays open without holding the palm up and contains **Undo and Recenter**; it does not depend on the palm gesture. **What remains for M5**: (a) the button onboarding; (b) the **"Rotate"** button to rotate a piece with one hand only (today the touch of the other hand, the wrist works with one hand); (c) high contrast and large text also for the `pinned` menu; (d) the choice of opening the `pinned` menu by default in one-hand mode; (e) S5.4 extended to all the actions of S2–S4 with the right hand only, starting from the button (the "Recenter and Undo with one hand" part is already in S3.7); (f) the reachability check on the headset (the buttons sit at ~0.65 m and ~46°, outside the 30° cone: declared warning, row in `qa/device/DEBT.md`).
- **T1.15 · Zoom and rotation of the tabletop model with one hand** (alternative to the two-hand gestures of M1,
  which today are the only way to rotate and enlarge; rule 9). Proposal of the M1 plan: dragged
  one-hand pinch on the tabletop model = rotation around Y; two small buttons on the edge
  of the base for zoom ± (panel at 0.5–0.8 m); threshold between "touch" (room label) and
  "drag" 1.5 cm. Scenario S5.4 must be extended to S1.2 (besides S2–S4) when M5 is planned.
  In M1 the onboarding is already unlocked with one hand (selection of a room or timeout).
  **Note (M2 decision of 2026-10-05)**: the one-hand *translation* already exists since M2 and uses the
  pinch on the **free base** of the tabletop model; one-hand rotation and zoom must not use
  that zone (use the buttons on the edge and/or the dragged pinch on a room, with the
  pinch arbitration of M2).
- **Mixed reality (behind flag `?mr=1`)**: measuring real furniture with the pinch on the edges and
  tabletop model resting on a detected surface. On the PC it is tried with the synthetic environment
  of the emulator; it enters the demo only if it passes the headset gate in **two different rooms**.

| PC scenario | Check |
|---|---|
| S5.1 Sun | `qa/scenarios/M5-sun.md`: `time=2026-12-21T10:00` → sun patches in the living room; `T15:00` → living room in shade and study in the sun; daylight saving time in June; night; precedence `time=` > saved (updated by the M5 plan) |
| S5.2 Map | **CUT** by the M5 plan (no file): the interest map and the questions do not enter |
| S5.3 Agent: info points and Furnish / Clear | `qa/scenarios/M5-agent.md`: role visitor/agent → 5 info points with "Sample data"; "Furnish" → 14 pieces; Undo or "Clear" → empty house; no button in `apartment-b` (updated by the M5 plan) |
| S5.4 One hand | `qa/scenarios/M5-one-hand.md`: zoom, rotation, piece, "Rotate", issue, return with the right hand only; no event from the left (updated by the M5 plan) |
| S5.5 Full demo | `qa/scenarios/M5-full-demo.md`: path of the three acts, zero console errors; the 10-minute time holds on the headset, on the PC it is counted (updated by the M5 plan) |
| S5.6 Accessibility (added) | `qa/scenarios/M5-accessibility.md`: high contrast (≥ 7:1 from tests) and large text ≥ 3.0 cm, persistence and parameters |
| S5.7 Menu button onboarding (added) | `qa/scenarios/M5-menu-onboarding.md`: two-step coach, resume, timeout |
| S5.8 Carry-overs from the M4 gate (added) | `qa/scenarios/M5-carryovers.md`: R1–R6 |
| S5.9 Budget (added) | `qa/scenarios/M5-budget.md`: K1–K18, forecast worst case ~82; ≥ 85 opens T5.RA |
| S5.10 Quick regression (added) | `qa/scenarios/M5-regression.md`: S1.2, S1.3, S1.6, S2.1–S2.9, S3.0–S3.9, S4.1, S4.3–S4.8 with `pinch=grip` |

**Headset gate**: mixed reality in two rooms never tried before: **taken up again on 2026-11-11 as the opt-in feature `?mr=1`** on branch `claude/eager-mendel-skcibe` (plan `docs/plans/MR.md`, PC gate passed `qa/reports/MR-2026-11-12.md`; it enters `main` only after the test in two rooms by Sunday 15 morning) (before: cut, D74 of the M6 plan),
fps with the sun light patches (there are no real shadows), readable contrast, complete 10-minute session
without discomfort. (Realigned on 2026-11-07 with `docs/DEVICE_CHECKLIST.md`.)
**Status 2026-11-16**: functionally verified on device by the owner (contrast, large text, agent, Rotate, coach, sun, one-hand mode, resume; mixed reality owner-reported), measurements pending (fps and real draw calls, the 10-minute full-demo timing, font-startup console checks).

## M6 · Headset integration

**Goal**: settle all the debt in `qa/device/DEBT.md` and reach Device-done for M1–M5.
**Plan and decisions D65–D79 in `docs/plans/M6.md` (delivered on 2026-11-07, 🟨)**; user guide (Fedora, adb,
certificate, remote debugging, Meta VR CLI and "M6 tools"): `docs/QUEST_SETUP.md`. Two phases.

- **Phase A · before the headset (Sat 7 – Mon 9 Nov)**, only tools behind `debug=1` or outside the app, **defaults
  unchanged** and no new function (T6.A1–T6.A13): tuning knobs `t_<name>` (URL, `dev-params.local.txt`,
  live file `tuning.local.txt` re-read every 2 s, `foveation`), in-headset statistics panel `ui:debug-hud`
  (`hud=0` switches it off), lines `[soglia:frames]`, `[soglia:stats:summary]` and `[soglia:env]` (probe of the browser
  features), `npm run quest:*` scripts for `adb` and `metavr`, narrow field of view mask (optional), start
  page (optional). Estimate: core ≈ 18 real hours, everything ≈ 22 h (central × 1.8). PC scenarios: S6.1 tuning, S6.2
  frames and panel, S6.3 probe, S6.4 scripts, S6.5 reduced regression and budget (`qa/scenarios/M6-*.md`).
- **Phase B · with the headset (from Tue 10 Nov)**: sessions S0 smoke and environment (Tue evening), S1 hands (Wed morning),
  S2 trips and data (Wed afternoon), S3 light, agent, accessibility and performance (Thu morning), decision on the
  defaults (Thu evening, by the freeze), S4 re-verification and gate (Fri 13); fallback L1–L3 if the headset is late.
  Execution of `docs/DEVICE_CHECKLIST.md` (realigned on 2026-11-07) and of `qa/device/DEBT.md` by priority; tuning
  with protocols with numeric thresholds; real graphics budget with criterion D71 (no 2 s window under 60 fps).
  **Progress**: first headset session 2026-11-11 (see `qa/device/DEBT.md`), owner's functional device test 2026-11-16 (everything works, no numbers); the tuning protocols, the developer-tooling rows and all measurements are still open.
- **Mixed reality: taken up again on 2026-11-11 (user decision, full version)** as the opt-in feature `?mr=1`: real furniture from the Space Setup scan (outlines, measurements, `Add to Mine` towards the FitCheck) and virtual furniture at real size on the floor. Plan `docs/plans/MR.md`, PC gate passed (`qa/reports/MR-2026-11-12.md`); owner-reported functional test on the headset on 2026-11-16 (measurements pending). (Before: cut, D74.)

**Gate**: all the checklist items passed or justified (the `high` rows of DEBT.md per milestone, D77); fps ≥ 60
across the whole demo (D71); no statement "works on the headset" without the report in `qa/device/`.

## M7 · Polish and delivery

**Status 2026-11-16**: in progress. The project was renamed to Floorplay and all documentation translated to English on this date (see the changelog).

- `submission-writer`: Devpost description (English), tagline ≤ 140 characters, test instructions,
  script and subtitles of the video.
- Video < 3 minutes with real footage (headset or emulator), no AI-generated videos.
- `contest-reviewer`: final review against `docs/RULES.md`.
- **`README.md`** (still at "M0", with "CC0 only" that contradicts the three exceptions of `docs/RULES.md`) and
  **`docs/DATA_FORMATS.md` in English**: carry-over (8) from the M3 gate, done on 2026-11-16. (Documentation translated to English on 2026-11-16.)
- Manual deploy to GitHub Pages (https://thirdchildren.github.io/floorplay/), link check (from the headset if available), **internal delivery Tuesday 17 November, 18:00**
  (official deadline Wednesday 18 November, 12:00 PT = 21:00 in Italy; Wednesday morning in reserve).
- **Feature freeze Thursday 12 November 2026, 23:59** (no new task after Wed 11 Nov, 12:00); then
  **site freeze** from delivery until the winners are announced (no deploy).


## Changelog

- 2026-11-17: start screen header redone: the logo icon on the left, the name (wordmark) on the right with the tagline under it; favicon (the icon on a navy square). The whole transparent logo is kept in `assets-src/branding/`.
- 2026-11-17: logo (generated with Gemini from our own prompt, credited in `CREDITS.md`) shown at the top of the start screen as the page title (`public/branding/logo.png`, transparent, dark-background version); sources and the YouTube thumbnail kept in `assets-src/branding/`.
- 2026-11-16 (night): a resized catalog bed or sofa is drawn with the sibling model that suits its new size (a double bed made 90 cm wide looks like a single bed, a short sofa like an armchair), stretched to the exact size (`resizedSkinFor`). Owner's request after the device test.
- 2026-11-16 (night): the Rotate button above a piece that was just put down lasts 2 s (was 12), and its time runs also while a menu or panel covers it (it no longer starts again when the surface closes). Owner's request after the device test. Owner fixed the odd double bed by resetting its sizes in Furniture.
- 2026-11-16 (night): the room label goes away by itself after 4 s (`ROOM_LABEL_SECONDS`) and at once in My room (mixed reality) or at real scale; pinching the same room shows it again. Owner's request after the device test; scanned-piece sizes confirmed correct on the Quest by the owner.
- 2026-11-16 (night): fix: a scanned piece whose long side runs across the catalog model (e.g. a double bed scanned 2.0 × 1.6) turned the model a quarter turn instead of stretching its width; every side now keeps its measured length (`skinFit`). Reported by the owner on the Quest.
- 2026-11-16 (night): Mine holds only the objects added from the room scan (the sample own pieces are no longer loaded); scanned objects are drawn with the matching catalog model stretched to their size instead of a block. Unit tests for the mapping; not yet tried on the headset.
- 2026-11-16 (evening): **mixed reality on by default** (owner's request): `mr` defaults to on, `?mr=0` turns it off, no `immersive-ar` falls back to VR. README, Devpost texts and video script updated.
- 2026-11-16 (evening): PR #14 merged (easy passage when walking). The owner tested `apartment-c` as default home and the new walking on the Quest: everything works (no measurements). Deployed to GitHub Pages.
- 2026-11-16: **apartment-c is the default demo home** (converted from a real floor plan): fixtures (washer, boiler, kitchen unit, roller shutter), a 20-piece Furnish preset (all valid per `evaluateAll`), demo issues, move-in entry and 5 info points (`public/demo/issues-apartment-c.json`, Sample data). Tests updated for the new default; headless smoke test clean. Not yet tried on the headset.
- 2026-11-16: **project renamed Soglia → Floorplay** (app title, page title, package, schemas, README; repository
  to be renamed `ThirdChildren/floorplay`, Pages URL https://thirdchildren.github.io/floorplay/). Source code released
  under the MIT License. **All documentation translated to English** (CLAUDE.md, `docs/`, plans, QA scenarios and
  reports, subagent definitions). **Device status**: the owner tested the latest features on the Quest and reported
  that everything works; `qa/device/DEBT.md` records functional rows as passed (owner's test) and measurement rows as
  pending (no numbers reported). Official rules reread from the full page (see `docs/RULES.md`). M7 (submission) in progress.
- 2026-11-07 (night): **M6 phase A PC-done (PC gate T6.A13 PASSED)**: report `qa/reports/M6-2026-11-07.md` (`emulator-qa`, HEAD `96f874f`): S6.1–S6.5 PASS, zero blockers, clean console, **144 files and 6905 tests green** (M5: 131 and 6434), typecheck and build ok, `hud=0` equal to M5 remeasured in the same state (K2 50, K3 58, K12 26, K18 68; HUD +2 calls, limit +3), bundle **+9.3 kB gzip** (limit +20). Documentation warnings fixed in the documents: A1 (the growth is +9.3 and not +3.5 kB), A2 (the K numbers of `qa/scenarios/M5-budget.md` do not reproduce even on M5: note added; the D65 comparison is made on M5 remeasured in the same state, rule fixed in S6.2 and S6.5), A5 (criterion on existing tests reworded), A6 (S6.2 step 4 without `time=` in the `BASE`), A7 (`F8` does not emit `visibilitychange`). **A3 (mask with one call not attributed to the `hud` group) and A4 (HUD covered by the left button column from the default head) are being fixed by `xr-engineer`** (only `debug=1`). **Phase B from 10 Nov** with the arrival of the headset; no item is Device-done.
- 2026-11-07 (evening): **M6 phase A implemented (T6.A1–T6.A11) and T6.A12 done** (documents realigned with the code, no code touched by the planner): `docs/plans/M6.md` ("Outcomes" filled in with what really exists: 26 `t_*` knobs all wired with M5 defaults, live > url > file layers, 11 `quest:*` scripts with 12 presets, HUD `ui:debug-hud` +2 calls, `debug:fov-mask` mask, `quest.html`, build +9.3 kB gzip after the gate, the first estimate was +3.5), `docs/QUEST_SETUP.md` (section 4.2 with the correct `adb shell` quoting, section 11 with the real state and Tuesday's procedure), `docs/DEVICE_CHECKLIST.md`, `qa/device/DEBT.md` (13 M6 rows), scenarios S6.1–S6.5 aligned and gate order in `qa/scenarios/M6-regression.md`. **The PC gate T6.A13 remains** (`emulator-qa`); nothing is proven on the headset.
- 2026-11-07: **M6 plan delivered (M6 ⬜ → 🟨)**: `docs/plans/M6.md` (decisions D65–D79, phase A T6.A1–T6.A13, phase B sessions S0–S4 with tuning protocols based on numeric thresholds, fallback L1–L3 if the headset is late, risks R57–R73, debt for `DEBT.md`, honest estimate: phase A core ≈ 18 real hours / everything ≈ 22 h, phase B ≈ 12.5 h of headset sessions + ≈ 16 h of agent work) and scenarios `qa/scenarios/M6-*.md` (S6.1–S6.5). Phase A = only tools behind `debug=1` or outside the app, defaults unchanged, no new dependency. **Mixed reality cut and outside the gate** (D74, confirmation of M5). `docs/DEVICE_CHECKLIST.md` realigned (seven reports from `quest-integrator`: light patches instead of shadows, mixed reality cut, keyboard/microphone/distance grab not applicable, missing DEBT.md items added, `debug=1` for `[soglia:stats]`, self-signed HTTPS also on `localhost`, `dev-params.local.txt` on the headset) and section 11 of `docs/QUEST_SETUP.md` completed with the status "to be implemented". M5 status unchanged (✅ PC-done); nothing is proven on the headset.
- 2026-11-06: **M5 🟨 → ✅ PC-done** (unified report `qa/reports/M5-2026-11-06.md`, with the partial reports AB, rerun and C2D; scenarios S5.1, S5.3–S5.10 and regressions S1.x, S2.x, S3.x, S4.x passed). Delivered: Block R (carry-overs 1–8 from M4), sun in pure logic with light patches and the "Simplified light" label, "View" panel (sun, zoom, rotation, contrast, text), info points and Furnish/Clear for the agent role, high contrast (≥ 7:1), large text (panels scaled ×1.25, declared pitch window ±8°), one-handed "Rotate", Menu button coach, T5.RA (walls and thresholds merged, −16 calls). Worst case 70 calls per view, 32,766 triangles. Fixed after the gate: F1, W1, W2, F-D-1, F-D-2 and warnings 3–9 from `contest-reviewer`. Open: rereading of the official rules (Devpost site not reachable from the session), N2/N3 to remeasure on the headset. Nothing is proven on the headset: M5 items in `qa/device/DEBT.md`. M3 and M4 merged into `main` with squash (PR #1 and #2).
- 2026-11-06: **M5 plan delivered (M5 ⬜ → 🟨)**: `docs/plans/M5.md` (decisions D53–D64, Block R T5.R1–T5.R6, tasks T5.1–T5.18 with T5.16 below the line and conditional T5.RA, draw call forecast with worst case ~82, risks, debt, estimate ≈ 30 real hours, order of cuts) and scenarios `qa/scenarios/M5-*.md` (S5.1, S5.3–S5.10). **Cut from the start**: comparison of two layouts/houses, interest map and questions (S5.2), mixed reality, shadow-map shadows (replaced by light patches), one-handed dragging (T1.15 reduced to buttons in the "View" panel). Corrections to the existing scenarios (carry-over 6) **applied on 2026-11-06 by decision of the user** (S3.0, S3.5, S4.3, S4.5, each with a changelog line); also confirmed: sun patches instead of shadow maps, the single "View" panel and staging only for apartment-a. M4 status unchanged (✅ PC-done).
- 2026-11-02: **M4 plan delivered (M4 ⬜ → 🟨)**: `docs/plans/M4.md` (decisions D39–D52, Block R of the M3 carry-overs, tasks T4.R1–T4.R7 and T4.1–T4.14, draw call forecast, risks, debt, honest estimate with factor 1.8) and scenarios `qa/scenarios/M4-*.md` (S4.1–S4.10). **M4–M7 calendar rescheduled** (the previous dates were out of date): M4 PC-done expected Sun 8 Nov (limit Mon 9), M5 reduced 9–12 Nov, **feature freeze Thu 12 Nov 23:59**, M6 as soon as the Quest is available (main session Fri 13), M7 14–17 Nov with internal delivery Tue 17, 18:00; cuts in order and A/B scenarios in `docs/plans/M4.md`. Text with hands only: predefined phrases (D40), system keyboard and voice note optional and cut from the start. Role change from the new "Issues" panel (D41). Scenarios corrected in their starting points (not in the criteria), with a changelog line at the top: S1.2, S2.6, S2.9, S3.0, S3.2, S3.3 and a conditional note on S3.1. `README.md` and `docs/DATA_FORMATS.md` in English move to M7. M3 status unchanged (✅ PC-done).
- 2026-11-04: **M4 🟨 → ✅ PC-done** (report `qa/reports/M4-2026-11-03.md`; scenarios S4.1–S4.8, S4.10 and regressions S1.x, S2.x, S3.x passed; `contest-reviewer`: APPROVED WITH WARNINGS, no blockers). Worst case 75 draw calls per view (< 85: R-A is not the first task of M5). Closed 5 days ahead of the revised plan (expected Sun 8–Mon 9 Nov). M4 items added to `qa/device/DEBT.md`. One criterion difference to decide: S3.0 check 4. Carry-overs to M5 in the M5 section.
- 2026-11-02: **M3 🟨 → ✅ PC-done** (report `qa/reports/M3-2026-10-10.md`; scenarios S3.0–S3.9 and regressions S1.1–S1.6, S2.0–S2.9 passed; `contest-reviewer`: APPROVED WITH WARNINGS, no blockers). T3.15 cut (distance grab and distance measurement move to M5/M7). Clarification of rule 8 in `docs/RULES.md` (fallback entry points up to 45°: two side Menu buttons at ±0.45 m). M3 items added to `qa/device/DEBT.md`. **Calendar not updated**: M3 closes on 2 November instead of 12–13 October, and 16 days remain until the 18 November delivery for M4–M7: to be rescheduled with the user (possible cuts: distance grab, voice, agent).
- 2026-10-09: M3 plan delivered (`docs/plans/M3.md`, scenarios `qa/scenarios/M3-*.md`): **M3 ⬜ → 🟨**. User request: the first four tasks are minimal saving in `localStorage` + lifecycle, palm and pinch from the joints, one-handed "Menu" button, draw call forecast up to M5. Scenario rows added (S3.0, S3.6–S3.10). **M4**: `Persistence` already has its first slice (note). **M5**: the item "menu and Recenter usable with one hand" is rewritten as delivered in M3, with the list of what remains for M5 (button onboarding, "Rotate", high contrast, one-hand default, S5.4, headset test). No other milestone status changed.
- 2026-10-07: M2 PC-done (report `qa/reports/M2-2026-10-06-rerun3.md`; `contest-reviewer`: PASSED WITH RESERVATIONS, no blockers). M2 headset gate in debt: items added or aligned in `qa/device/DEBT.md`. M3+ status unchanged (updated by the M3 plan).
- 2026-10-06: M5 now has the explicit item "menu and Recenter usable with one hand" (menu `pinned`, Undo and Recenter included) — user decision on the M2 gate (finding of the report `qa/reports/M2-2026-10-06.md`). No milestone status changed.
