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

