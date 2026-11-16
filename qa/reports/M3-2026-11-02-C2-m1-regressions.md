# M3 PC gate · part C2 · M1 regressions (S1.1-S1.6)

Date: 2026-11-02 · Environment: cloud (Linux, SwiftShader, IWER headless runtime already started) · branch `m3`
Run by: emulator-qa (Sonnet 5.5). Software rendering: fps are not meaningful.
Head at (0; 1.6; 0) (session default, so O = (0; 1.35; -0.45), not (0; 0.95; -0.45) as in the scenarios written for a head at 1.2 m).

## Scenario table (updated after each scenario)

| Scenario | Sheet | Pinch mode | Result | Notes |
|---|---|---|---|---|
| S1.1 | M1-open-house | grip (full) + auto (reduced round) | **PASS** (V7b/V7c only in part: see Warnings) | O = (0; 1.350; -0.450), 33 entities with StableId, `house:apartment-a` at (-0.275; 1.350; -0.630), `room:living` at (-0.145; 1.350; -0.515), 0 error/warn |
| S1.2 | M1-two-hands | grip (full A-D) + auto (reduced round A+B) | **PASS** (with procedure WARNINGS 2 and 3) | zoom 0.0833, yaw +90.0, limits 0.1200 / 0.0300, translation +0.200 and clamp 0.300, 0 `room selected`, 0 error/warn |
| S1.3 | M1-room-label | grip | **PASS** (WARNING 4: pillar V2 intersects the corridor label) | 5 rooms with exact `room selected <id> area=<x>` + `label shown "..."`, only 1 `ui:room-label` entity, `room deselected hall`, 0 events on the empty base, 0 error/warn |
| S1.4 | M1-budget | grip | **PASS** (WARNING 5: total triangles 21.8k > internal target 20k) | callsPerView 40 (A), 35 (A at 0.12), 34 (B) <= 100; triangles 21,776 / 23,200 / 21,456 (total 2 views) << 150,000; shadows 0; 0 `budget exceeded`; 0 error/warn |
| S1.5 | M1-house-b-and-errors | grip (B, N, T) | **PASS** | B: 4/4/9/4/4 entities and exact logs; N: `warn [soglia] house not found: nope`, 0 entities, `ui:error-panel` 1; T: id ignored, house A with 33 entities, 0 error panels; 0 error; `tests/unit/house.test.ts` green |
| S1.6 | M1-onboarding | grip (full) + auto (reduced round) | **PASS** | `step=pinch` x1 after `miniature placed`, 1 ghost hand -> 2 after the pinch -> 0 after `gesture start` (`step=done`); exit with one hand: room `living` and timeout at T0 + 8.864 s; 0 error/warn |

## S1.1 · Open house A (`M1-open-house`)

Parameters: `house=apartment-a&role=visitor&reset=1&seed=1&debug=1&pinch=grip` (then reduced round with `pinch=auto`). Head left at (0; 1.6; 0) (session default, `xr_get_transform` = y 1.6000000238), so O has `y` = 1.350 and not 0.95.

| Check | Result | Data |
|---|---|---|
| V1 logs in order | PASS | `1793622812257 [soglia] params source=dev-file house=apartment-a role=visitor reset=true seed=1 debug=true time=- pinch=grip` (field `pinch=grip` new, M3), then `[soglia] house loaded apartment-a rooms=5 walls=13 doors=5 windows=7` (812550) |
| V2 `miniature placed` | PASS | pre-session `x=0.000 y=0.950 z=-0.450 yawDeg=0.0 scale=0.0500`; in session `x=0.000 y=1.350 z=-0.450 yawDeg=0.0 scale=0.0500` (1793622817121). y - (1.6 - 0.25) = 0.000 |
| V3 counts/ids | PASS | `^house:` 1 (`house:apartment-a`); `^room:` 5 (living, bedroom, study, bathroom, hall); `^wall:` 13 (all expected ids, same construction order); `^door:` 5; `^window:` 7; `^(miniature:root\|table:plinth)$` 2. Total 33 entities, **0** without a `StableId` component; `ecs_query_entity` on `house:apartment-a` -> `StableId.value = "house:apartment-a"` |
| V4 global transforms | PASS | `house:apartment-a` position (-0.275; 1.350; -0.630) scale 0.0500; `room:living` (-0.145; 1.350; -0.515) scale 0.05 (via `scene_get_object_transform`) |
| V5 console | PASS | `level=error`: 0, `level=warn`: 0 from timestamp 1793622812257; no `house invalid`/`house not found`/`Failed to load`; no line outside `[soglia]` other than the expected ones (99 `log` lines) |
| V6 screenshot | PASS | `qa/reports/M3-gate-C2-S1.1-open-house.png`: model in front of the head (head tilted -29 degrees toward O), floors of two colors (brown wood and blue-gray tiles), light gray low walls with openings for the doors, three blue pillars (`viewpoint:V*` markers, M3), light blue ghost hand above the model (onboarding), two white `Menu` buttons with the hand outlines (M3) |
| V7a hands visible | PASS | `qa/reports/M3-gate-C2-S1.1-hands-visible.png`: hands at (∓0.15; 1.40; -0.15): the white outlines of both hands are visible in the foreground; the `Menu` buttons follow the wrists |
| V7b local hand models | PASS partial (WARNING 1) | log `[soglia] hand visuals: local models` and `[soglia] controller visuals: local shape`; `curl -sk https://localhost:8081/models/hands/left.glb` -> 200, 94572 bytes; `right.glb` -> 200, 94004 bytes (same as the files in `public/models/hands/`). The request FROM THE BROWSER is not proven (no probe) |
| V7c no external request for the hands | not measurable (WARNING 1) | no tool evaluates JS and the app code cannot be touched (rule 8); `browser run` requires `--allow-browser-automation` at `dev up`, not active. Clues: 0 lines with `generic-hand`/`jsdelivr`/`xr-input`; no `Failed to load` |
| V7d no `Failed to load visual asset` | PASS | pattern `Failed to load\|xr-input\|generic-hand\|jsdelivr` -> 0 lines in the current load |

Reduced round `pinch=auto` (load 1793623021394, head 1.6): `miniature placed y=0.950` then `y=1.350`, `house loaded apartment-a rooms=5 walls=13 doors=5 windows=7`, `input source=joints hand=left/right` (3 s after start), entities 1/5/13/5/7/2 = 33, 0 without `StableId`, error 0, warn 0. **PASS**.

WARNING: intentional M3 differences (`params` line with `pinch=grip`, `Menu` buttons, `viewpoint:V*` markers) do not affect the criteria of the sheet.

## S1.2 · Two-hand pinch (`M1-two-hands`)

Load with `pinch=grip`: start 1793623087167; O = (0; 1.35; -0.45); poses = target + (0.038; 0.003; -0.037), orientation (0,0,0,1), hand y = 1.40 (pose 1.403).
**Procedure deviation (WARNING 2)**: the markers `viewpoint:V1..V3` are located (with scale 0.05) at (-0.130; -0.465), (0.065; -0.470), (0.215; -0.535). The pinch of the left hand at (-0.15; -0.45) falls 0.025 m from V1 (within the 0.04 m of the viewpoint change). Instead of moving the hands in z (which moves the pivot and breaks check 4), I **widened the initial distances keeping the ratios** and the hands symmetric around O: phase A span 0.36 -> 0.60 (ratio 1.667), phase B radius 0.27 (instead of 0.20; V1 after the zoom is at (-0.217; -0.475), hand at 0.059), phases C/D as per the sheet (±0.15, after the rotation and zoom the markers are far away). No `viewpoint` in the logs: the pinches were taken by the two-hand gesture.

| Check | Result | Data |
|---|---|---|
| V1 phase A | PASS | `[soglia] miniature gesture start` (1793623135549); `miniature gesture end scale=0.0833 yawDeg=0.0 tiltDeg=0.0` (1793623148982): 0.0833, tiltDeg 0 |
| V2 phase B | PASS | `gesture end scale=0.0833 yawDeg=90.0 tiltDeg=0.0` (1793623186817): yaw +90.0, scale = s1 |
| V3 phase C | PASS | step 10: `scale=0.1200` (<= 0.1201); step 11: `scale=0.0300` (>= 0.0299); no NaN in any line |
| V4 position | PASS | after A-C `miniature:root` at (-0.0002; 1.350; -0.4499) (O ± 0.001); phase A/C without `translated`, B `translated x=0.000 z=0.000` |
| V5 `room selected` | PASS | 0 `room selected` lines in the whole load |
| V6 state | PASS | last `[soglia:state]` line: `miniature":{"scale":0.06038647939499923,"yawDeg":90,"offset":[0.3,0.000119]}` = last `gesture end scale=0.0604 yawDeg=90.0` (new M3 offset: the translation lives in the store) |
| V7 console/locomotion | PASS | error 0, warn 0; `xr_get_transform` head (0; 1.6; 0) at the end of the scenario (unchanged) |
| V8 screenshot | PASS | `qa/reports/M3-gate-C2-S1.2-zoomed-rotated.png`: the model fills the field of view (scale 0.12 and rotated by 90 degrees: the long side of the plan is now in depth), no flip; at the top the hint `Palm up for the menu` (M3) and the `Menu` buttons at the sides; the head is level (the following `look_at` did not appear in the frame) |
| V9 phase D | PASS | D2: `[soglia] miniature translated x=0.200 z=0.000 source=two-hands` (1793623289901), `miniature:root` (0.1998; 1.350; -0.4499), scale 0.0300 and yaw 90 unchanged; D4: `translated x=0.300 z=0.000` (hypot 0.300 <= 0.301), root (0.3000; 1.350; -0.4499), height 1.350 unchanged |

WARNING 3 (D4, not a regression): after D2 the center of the model is at x = +0.20 and at scale 0.03 the grab radius (model radius x scale + 0.10 m, `REACH_MARGIN` in `src/logic/two-hand.ts`) does not include the pinches at (∓0.15; Oz), which the sheet repeats for D4: the two pinches arrived at 1793623304477/304756, but `miniature gesture start` only at 1793623307787, when during `xr_animate_to` the hands entered the radius at a distance of ~0.15 m. For this reason `gesture end` of D4 has `scale=0.0604` (ratio 2.0) instead of 0.0300: check 9 concerns only `translated` (0.300) and is met. For a clean D4 the hands should be centered on the new center.

Reduced round `pinch=auto` (load about 1793623390000; poses = target + (0; 0.025; 0.012)): zoom 0.36 -> 0.60: `gesture end scale=0.0832 yawDeg=0.0 tiltDeg=0.0`; rotation radius 0.27 at 30/60/90 degrees: `scale=0.0832 yawDeg=89.9 tiltDeg=0.0`; root (-0.0001; 1.350; -0.4499); 0 `room selected`, error 0, warn 0. **PASS**.

## S1.3 · Pinch on a room (`M1-room-label`)

Load with `pinch=grip`, start 1793623485311; head (0; 1.6; 0) oriented with `xr_look_at` toward O (pitch -29 degrees, as in the screenshots); `hand-right` at (Cx; 1.60; Cz+0.02), `xr_look_at` on C, `xr_select` 0.3 s. Centers C (O + dx, dz): living (-0.145; -0.515), bedroom (0.065; -0.515), study (0.210; -0.515), bathroom (-0.210; -0.335), hall (0.065; -0.360). No additional offset: all selections at the first attempt.

| Check | Result | Data |
|---|---|---|
| V1 living | PASS | `1793623504179 [soglia] room selected living area=23.9`, then `1793623504181 [soglia] label shown "Living room & kitchen · 23.9 m²"` (text with `·` and `²` identical) |
| V2 entity | PASS | `^ui:room-label$` -> 1 entity (`ui:room-label`, entityIndex 50) |
| V3 other rooms | PASS | `room selected bedroom area=14.7` / `label shown "Bedroom · 14.7 m²"`; `study area=12.0` / `"Study · 12.0 m²"`; `bathroom area=6.8` / `"Bathroom · 6.8 m²"`; `hall area=13.4` / `"Hallway · 13.4 m²"`. After each change the search still gives only 1 `ui:room-label` (panel reused) |
| V4 second select on `hall` | PASS | `1793623574543 [soglia] room deselected hall`, no new `label shown` |
| V5 empty base | PASS | hand at (0.38; 1.60; -0.45) above the base: `pinch right start/end` but no `room selected`/`deselected` line. (`xr_look_at` perpendicular gave the already known degenerate quaternion (0.5; 0.5; 0.5; -0.5); it does not matter) |
| V6 areas | PASS | 23.9 / 14.7 / 12.0 / 6.8 / 13.4 |
| V7 state | PASS | `[soglia:state]` line after step 1 with `"selectedRoomId":"living"`; after step 6 `"selectedRoomId":null`; `miniature` `{"scale":0.05,"yawDeg":0,"offset":[0,0]}` at the end of the scenario |
| V8 console | PASS | error 0, warn 0; model not moved (scale 0.05, yaw 0, offset 0) |
| V9 screenshot | PASS | `qa/reports/M3-gate-C2-S1.3-label-living.png`: white label `Living room & kitchen · 23.9 m²` in large readable black text, above the model and facing the head, with the hint `Palm up for the menu` (M3) below. `qa/reports/M3-gate-C2-S1.3-label-hall.png`: `Hallway · 13.4 m²` (see WARNING 4) |

WARNING 4 (M3, visual): for the corridor (closer to the head) the label sits lower (M3, 30-degree cone) and the blue pillars of the viewpoints cross it: in `qa/reports/M3-gate-C2-S1.3-label-hall.png` the pillar `viewpoint:V2` covers a digit of the text (it reads `Hallway · 13_ m²`). Global positions: `ui:room-label` (0.020; 1.426; -0.490), `viewpoint:V2` (0.065; 1.4375; -0.470), `viewpoint:V1` (-0.130; 1.4375; -0.465). The log is correct (`label shown "Hallway · 13.4 m²"`); it is a readability defect, not a functional one, and it is not part of the criteria of the sheet. To be reported to `xr-engineer` (distance of the label anchor from the markers / `renderOrder`).
Note: after check 6 I repeated a third `xr_select` on `hall` only to read the positions (line `room selected hall` and `label shown` at 1793623602015); the final state has `selectedRoomId":"hall"` for this reason.

## S1.4 · Graphics budget (`M1-budget`)

All runs with `pinch=grip`; head (0; 1.6; 0), hands. **The fps on the PC do not represent the Quest** (SwiftShader: `gpuRenderer` = `ANGLE (Google, Vulkan 1.3.0 (SwiftShader Device (Subzero) ...)`).

| Run | callsPerView | calls (2 views) | triangles (total 2 views) | geometries | textures | fps | time per frame |
|---|---|---|---|---|---|---|---|
| 0 · house A without `debug` (load 1793623672453) | n/a (no line) | - | - | - | - | - | - |
| 1 · house A `debug=1`, 12 s after start (1793623736105 ... 746686, 6 lines at ~2.1 s) | **40** | 80 | **21,776** (10.9k/view) | 54 | 7 | 5-6 | profile: p50 150.1 ms, p95 233.3 ms, max 350 ms (79 samples, `droppedFrameCount` 76; diagnostic, not calibrated) |
| 1b · house A at scale 0.12 (`gesture end scale=0.1200`, 1793623802200; lines 809927 ... 814183) | **35** | 70 | **23,200** | 57 | 7 | 5-6 | - |
| 2 · house B `debug=1` (load 1793623842085; lines 855771 ... 862025) | **34** | 68 | **21,456** | 48 | 7 | 6 | - |

Groups line (new in M3): `[soglia:stats:groups] house=24 furniture=0 hands=6 ui=8 markers=1 other=1` (house A, scale 0.05); `... ui=7 ...` at 0.12. In an earlier load (S1.3, with the room label and the hint visible, `debug=1`) `calls=82 callsPerView=41 triangles=23324 textures=8`, `ui=9`.
`scene_get_render_stats` (house A, 0.05): `calls 80, triangles 21776, geometries 54, textures 7, programs 14, meshCount 52, materialCount 28, shadowCasters 0`; (house B) `calls 68, triangles 21456, geometries 48, textures 7, programs 14, shadowCasters 0`.

| Check | Result | Data |
|---|---|---|
| V1 run 0 | PASS | 0 `[soglia:stats]`/`[soglia:state]` lines after `params source=dev-file ... debug=false` (1793623672453); the 4 lines found with a wider `since` belonged to the previous load (1793623666-668) |
| V2 format/number of lines | PASS | >= 6 lines per run at ~2.1 s, format `[soglia:stats] fps=<n> calls=<n> views=2 callsPerView=<n> triangles=<n> geometries=<n> textures=<n>` |
| V3 budget | PASS | `callsPerView` 40 / 35 / 34 <= 100; `triangles` 21,776 / 23,200 / 21,456 <= 150,000 |
| V4 internal target | WARNING | `callsPerView` <= 50 met; total `triangles` 21,776 / 23,200 / 21,456 > 20,000 (WARNING 5; per view ~10.9k, ~11.6k, ~10.7k; same order as M1: 21.3k-21.6k) |
| V5 consistency | PASS | `calls` of `scene_get_render_stats` (80 / 68) = `calls` of the `[soglia:stats]` line (80 / 68) |
| V6 textures | PASS (partial census) | 6a: app textures = 2 font atlases (`[soglia] font ready family=inter weight=normal atlas=512x512 glyphs=111` and `weight=bold atlas=512x512 glyphs=111`), <= 4, each 512 <= 1024; 0 content textures. 6b: framework not enumerated (no probe: app code cannot be modified, rule 8); `textures` = 7 (house A and B). 6c: reference value 3/5/8 (M2) -> 7 in session with the hands (informative). 6d: **0** `budget exceeded` lines. 6e: **0** `framework:` lines |
| V7 console / shadows | PASS | error 0, warn 0 in all runs; `shadowCasters` 0 |
| V8 table | PASS | table above; **the fps on the PC do not represent the Quest** |

WARNING 5: the internal M1 target (<= 20,000 triangles, total 2 views) is exceeded by a small margin (+9 % at 0.05; +16 % at 0.12), it does not decide the result. It goes in DEBT.md as "measure on the Quest". Compared with M1 (~21.5k) the triangles are unchanged.
Screenshot: `qa/reports/M3-gate-C2-S1.4-house-b-stats.png` (house B, run 2).

## S1.5 · House B and error handling (`M1-house-b-and-errors`)

All runs with `pinch=grip`; head (0; 1.6; 0). In runs N and T the session was only accepted (`xr_accept_session`) without switching to hands, as in steps 5 and 9 of the sheet: the screenshots therefore show the controller shapes connected by IWER at the start of the session.

**Run B** (`house=apartment-b`, load 1793623842085)

| Check | Result | Data |
|---|---|---|
| V1 log | PASS | `1793623842547 [soglia] house loaded apartment-b rooms=4 walls=9 doors=4 windows=4` |
| V2 entities | PASS | `^house:` -> `house:apartment-b`; `^room:` 4 (living, bedroom, bathroom, hall); `^wall:` 9 (w-north, w-east, w-south, w-west, w-living-bath, w-living-hall, w-bedroom-hall, w-living-bedroom, w-bath-hall); `^door:` 4 (d-entrance, d-living, d-bedroom, d-bathroom); `^window:` 4 (win-living, win-bedroom, win-bedroom-east, win-bathroom); `miniature:root` + `table:plinth` |
| V3 | PASS | `apartment-a` -> 0 entities; error 0, warn 0. Screenshot `qa/reports/M3-gate-C2-S1.5-house-b.png` (model of house B, 4 rooms) |

**Run N** (`house=nope`, load 1793623936103)

| Check | Result | Data |
|---|---|---|
| V4 | PASS | `1793623936587 warn [soglia] house not found: nope` (only warn, expected) |
| V5 no request | PASS | 0 `Failed to load` / `404` / `nope.json` lines in the console; `npx @iwsdk/cli dev logs --tail 100` reports no requests to `houses/` (as per the M1 note it does not record HTTP requests: the check relies on the console) |
| V6 entities | PASS | `^(house\|room\|wall\|door\|window\|miniature\|table):` -> **0**; `^ui:error-panel$` -> **1** (`ui:error-panel`) |
| V7 | PASS | `level=error` 0; no `unhandledrejection`/`uncaught` |
| V8 screenshot | PASS | `qa/reports/M3-gate-C2-S1.5-error-panel.png`: white panel with a red bar, in front of the head, title in bold black `This home could not be found.` and below in gray `Reload the page or choose another home.`; large text; in the background only the sky and the two dark controller shapes |

**Run T** (`house=..%2Fapartment-a`, load 1793623969024)

| Check | Result | Data |
|---|---|---|
| V4T | PASS | `[soglia] params source=dev-file house=apartment-a role=visitor reset=true seed=1 debug=true time=- pinch=grip`, then `warn [soglia] param house="..?apartment-a" ignored: expected letters, digits, "-" or "_"` and `warn [soglia] invalid house id ignored` (same timestamp 1793623969026) |
| V5T | PASS | `[soglia] house loaded apartment-a rooms=5 walls=13 doors=5 windows=7`; no `house not found` |
| V6T | PASS | overall search **33** entities; `^ui:error-panel$` **0**. Screenshot `qa/reports/M3-gate-C2-S1.5-traversal-house-a.png`: model of house A (two floor colors, low walls, three blue pillars, light blue ghost hand, `Menu` buttons), no error panel |
| V7T | PASS | no request with `..` (0 `Failed to load`/`404` lines in the console; 0 occurrences of `../` in `dev logs --tail 150`) |
| V8T | PASS | `level=error` 0; the only warns are the two expected ones |

**V9 corrupted data**: covered by `tests/unit/house.test.ts` (`describe('checkHouse reports readable errors with the field path')`, mutations rejected; the message `house invalid: <error>` is in `src/index.ts:163`). `npm test` run now: **75 files, 4465 tests green**. PASS.

## S1.6 · Onboarding with the ghost hand (`M1-onboarding`)

Load with `pinch=grip` (start 1793624054484 for steps 1-6; then 3 reloads for steps 7, 10, 11); hands far away at (∓0.40; 1.40; 0.20); first pinch `hand-right` at (0; 1.45; -0.35) identity orientation, `xr_select` 0.2 s (pinch point (-0.038; 1.447; -0.313), not on a room or a marker). The 9 s timeout after `step=two-hands` prevents taking a screenshot and running phase A in sequence: I handled it by running phase A in a block right after the first pinch (the first `gesture start` leads to `done`, as per memory) and the two-hand screenshot in a separate test (step 11).

| Check | Result | Data |
|---|---|---|
| V1a order | PASS | outside the session: `1793624060983 [soglia] miniature placed x=0.000 y=0.950 z=-0.450 ...`, then `1793624061015 [soglia] onboarding step=pinch` (only once); search `^ui:ghost-hand-` outside the session = **0** |
| V1b | PASS | after `xr_accept_session`: second `miniature placed ... y=1.350` (1793624067485), no second `step=pinch` in the load, no other `onboarding` line until one acts |
| V1c | PASS (time not measurable) | the search right after `xr_set_input_mode` started at 1793624070592, that is 3.1 s after the session start (067485): 1 entity (`ui:ghost-hand-right`). For the sheet an interval < 1.0 s cannot be proven (CLI latency): noted as "not measurable", no FAIL |
| V2 | PASS | at >= 1.5 s: exactly 1 entity, `ui:ghost-hand-right`; no `ui:ghost-hand-left`. Screenshot `qa/reports/M3-gate-C2-S1.6-ghost-right.png`: a translucent light blue ghost hand above the model, no overlapping text |
| V3 | PASS | `1793624105608 [soglia] onboarding step=two-hands` (first pinch at 105601); 2 entities: `ui:ghost-hand-right`, `ui:ghost-hand-left` |
| V4 | PASS | in a clean load (start 1793624168410): `step=two-hands` 179817; phase A (±0.15 -> ±0.25): `miniature gesture start` 185400 and `onboarding step=done` in the same ms; `gesture end scale=0.0833 yawDeg=0.0 tiltDeg=0.0` (191414); `^ui:ghost-hand-` -> **0** |
| V5 | PASS | after the reload (1793624210723): `state cleared reason=reset keys=1`, `state none key=soglia:v1:state:apartment-a`, `onboarding step=pinch`: the sequence restarts (with `reset=1`; without `reset=1` the M3 persistence saves `prefs.onboardingStep`, not proven here: see WARNING 6) |
| V6 strings | PASS | `grep -n -i "onboard\|ghost\|hand" src/ui/strings.ts` -> only one line (53), a comment (`/** The fixed buttons beside the model (T3.3b)...`), no visible onboarding sentence |
| V7 | PASS | `level=error` 0, `level=warn` 0 in all loads (info 4, log 196); no controller used (`xr_set_input_mode` = `hand`) |
| V8 screenshot | PASS | `qa/reports/M3-gate-C2-S1.6-ghost-right.png` (one hand) and `qa/reports/M3-gate-C2-S1.6-ghost-two.png` (two light blue ghost hands approaching above the model); the only texts in the view are the `Menu` buttons (M3, not part of the onboarding) and, after the step, the hint `Palm up for the menu` |
| V9 exit with a room | PASS | load 1793624231787: `onboarding step=two-hands` 244153; 2 `ui:ghost-hand-*` entities at the check; `1793624246025 [soglia] room selected living area=23.9`, `246027 label shown "Living room & kitchen · 23.9 m²"`, `246028 onboarding step=done`; no `gesture`; `^ui:ghost-hand-` -> **0** |
| V10 timeout | PASS | load 1793624266951: T0 = `step=two-hands` 1793624276801; `step=done` 1793624285665 = **T0 + 8.864 s** (9.0 ± 0.5); 2 ghost hands in the screenshot at ~3 s from T0 (`qa/reports/M3-gate-C2-S1.6-ghost-two.png`); at T0 + 14.6 s `^ui:ghost-hand-` -> 0; no `room selected` line |

Reduced round `pinch=auto` (load 1793624316971; poses = target + (0; 0.025; 0.012), `xr_select` 0.5 s): outside the session 0 ghost entities; `miniature placed y=0.950` and `step=pinch` (same ms, in the correct order), in session 1 entity; after the pinch `step=two-hands` (1793624327249) and 2 entities; phase A: `gesture start` and `step=done` at 1793624333660/661, `gesture end scale=0.0832 yawDeg=0.0 tiltDeg=0.0`, 0 entities; `input source=grip hand=* reason=no-joints` (transient at startup, expected) then `input source=joints`; error 0, warn 0. **PASS**.

---

## Summary C2

**Verdict: PASS.** The M1 scenarios S1.1-S1.6 remain PASS after the M3 changes (6/6): no FAIL, 0 unexpected `level=error` and 0 unexpected `level=warn` (the only warns are those expected by S1.5: `house not found: nope`, `param house="..?apartment-a" ignored ...`, `invalid house id ignored`), budget met (max 41 draw calls per view against 100; max 23.3k total triangles against 150k), no locomotion (head always at (0; 1.6; 0)), no controller used. `npm test`: 75 files, 4465 tests green (run now, code not touched).

| Scenario | Result |
|---|---|
| S1.1 open-house | PASS (V7b/V7c partial, see WARNING 1) |
| S1.2 two-hands | PASS (WARNINGS 2 and 3) |
| S1.3 room-label | PASS (WARNING 4) |
| S1.4 budget | PASS (WARNING 5) |
| S1.5 house-b-and-errors | PASS |
| S1.6 onboarding | PASS |

Screenshots: `qa/reports/M3-gate-C2-S1.1-open-house.png`, `M3-gate-C2-S1.1-hands-visible.png`, `M3-gate-C2-S1.2-zoomed-rotated.png`, `M3-gate-C2-S1.3-label-living.png`, `M3-gate-C2-S1.3-label-hall.png`, `M3-gate-C2-S1.4-house-b-stats.png`, `M3-gate-C2-S1.5-house-b.png`, `M3-gate-C2-S1.5-error-panel.png`, `M3-gate-C2-S1.5-traversal-house-a.png`, `M3-gate-C2-S1.6-ghost-right.png`, `M3-gate-C2-S1.6-ghost-two.png`.

## Warnings

1. **S1.1 V7b/V7c (not proven by the browser)**: no tool evaluates JS and the app code could not be touched (no temporary probe as in M1); `browser run` requires `--allow-browser-automation`, not active and not restarted. Proven only: logs `hand visuals: local models`/`controller visuals: local shape`, `curl` 200 on the two glb (94572 / 94004 bytes), 0 `Failed to load`/`generic-hand`/`jsdelivr`/`xr-input` lines. The census of external requests and of the browser response for the glb remains to be redone with the probe (or with `dev up --allow-browser-automation`). Note already known from M1: in the formula of check 4 `Oz - 0.630` the values are absolute (z = -0.630 and -0.515 with O = (0; y; -0.45)); exactly those were measured.
2. **S1.2 (intentional M3 difference: `viewpoint:V*` markers)**: the pinch at (-0.15; -0.45) falls 0.025 m from V1 (within 0.04 m); I widened the distances keeping the ratios and the hands symmetric around O (phase A 0.36 -> 0.60, phase B radius 0.27) instead of the shift in z, which breaks check 4. Points used in detail in the S1.2 section. Also, O has y = 1.35 (head at 1.6, as per the assignment) and not the 0.95 of the sheets.
3. **S1.2 D4 (procedure)**: after D2 the model is at x = +0.20 and at scale 0.03 the pinches at (∓0.15; Oz) are outside the grab radius (model radius x scale + 0.10 m): the gesture started 3.0 s after the pinches, on the fly, with `scale=0.0604` at the end of the gesture (ratio 2.0 because of the late start), `translated x=0.300 z=0.000` (check 9 satisfied). Not an app defect; for a clean D4 center the hands on the new center.
4. **S1.3 (M3, visual)**: the pillar `viewpoint:V2` crosses the corridor label and covers a digit (`Hallway · 13_ m²`, `qa/reports/M3-gate-C2-S1.3-label-hall.png`). Label (0.020; 1.426; -0.490), marker (0.065; 1.4375; -0.470). The log is correct, the function passes, but it is a readability defect to pass to `xr-engineer`. In addition the hint `Palm up for the menu` (M3) appears below the label throughout S1.3.
5. **S1.4**: total `triangles` 21,776 (A, 0.05), 23,200 (A, 0.12), 21,456 (B) > internal target of 20,000 (does not decide the result; M1 21.3-21.6k). `callsPerView` 40 / 35 / 34 (the worst case foreseen for M3 is 71 per view; here the maximum read is 41 per view, with the hint and the `Menu` buttons present). New `[soglia:stats:groups]` line (M3). `textures` 7 (M1: 8-9): the census by framework name was not redone (no probe).
6. **S1.6 V5**: in M3 the persistence saves `prefs.onboardingStep`; with `reset=1` the sequence restarts (as the scenario requires). The behavior without `reset=1` (the sheet says to invert V5 in S4.4) was not exercised.
7. Intentional M3 differences seen and not treated as FAIL: `params` line with `pinch=grip`; `Menu` buttons at the wrists (`ui:menu-button-left/-right`) always present; hint `Palm up for the menu`; blue pillars `viewpoint:V*`; `input source=grip ... reason=param`; `state cleared reason=reset keys=N` and `state none key=...`; `miniature translated` even with 0.000 and the `offset` field in the state.
8. At the first acceptance (without switching to hands) the S1.5 N/T screenshots show the local controller shapes (`controller visuals: local shape`): expected, the IWER session starts with the controllers connected.

## What the emulator does not prove (to add to `qa/device/DEBT.md`)

- Real fps and time per frame: here SwiftShader 5-6 fps, p50 150 ms (S1.4 profile, not calibrated); draw calls (max 41/view) and triangles (max 23.3k total) must be measured on the Quest with houses A and B, also with the menu open and the labels.
- Local hands: the browser on the Quest must not make requests to `cdn.jsdelivr.net` and the hands must be tracked (S1.1 V7b/V7c not provable here without a probe; the IWER controllers are connected at startup).
- Reliability of the real two-hand pinch (zoom/rotation/translation), grab thresholds and grab radius (0.65 m from the head, model radius + 0.10 m) with real hands; comfort of the limits 0.03/0.12 and of the 0.30 m clamp; interference of the `viewpoint:V*` markers (0.04 m) with the two-hand gesture with real fingers.
- Readability at 0.5-0.8 m of the room label, of the `·` and `²` glyphs, of the error panel and of the hint `Palm up for the menu`, with the narrow field of view of the Meta VR Glasses; overlap with the viewpoint pillars (WARNING 4).
- Onboarding ghost hand: it is understood without explanations, size, speed, does not disturb the field of view; 1.0 s of stillness before it appears (`SHOW_DELAY_S`, not measurable with the CLI latency).
- Comfortable height and distance of the model while seated; real reference space of the Quest; colors of floors and walls on the headset displays.

## Procedure traps

- Outside the `pinch=grip` mode of the sheet, with the M3 markers the pinches at (Ox ∓ 0.15; Oz) fall on `viewpoint:V1` (0.025 m): use span 0.36 -> 0.60 and rotation radius 0.27, or move sideways; the markers (scale 0.05) are at (-0.130; -0.465), (0.065; -0.470), (0.215; -0.535) and move with the model (center x scale x rotation).
- Two-hand gesture: it starts only with BOTH hands within model radius x scale + 0.10 m and at <= 0.65 m from the head; with the model translated (D4) center the pinches on the new center, otherwise the start is late and the scale changes.
- The onboarding timeout (9.0 s) runs during the MCP calls: for phase A right after the first pinch send in a single block `set_transform` x2 + `set_select_value` x2 + `animate_to` x2 + release x2; the two-hand screenshot only in the timeout test (step 11) with `browser_screenshot` MCP right after the pinch (copy the file from `/tmp/iwsdk-screenshot-*.png`).
- The `[soglia:hands]` lines every 2 s fill the 200-line buffer: always read the logs with `since` and a narrow `pattern` or with the pattern `^(?!\[soglia:(hands|stats|state)\])`; the `level` filter with `since` also works on 200 lines.
- `browser_interact`: after `browser_profile start`, a `wait` of 3000 ms is rejected (`exceeds the remaining batch budget`): use 1500 ms; the real duration is about +1 s.
- `xr_look_at` perpendicular on the base gives a degenerate quaternion (0.5; 0.5; 0.5; -0.5), harmless for the negative test of S1.3 step 7.
- `dev-params.local.txt` with `pinch=grip` -> the `params` line ends with `pinch=grip`; with `auto` the field does not appear. The file was deleted at the end of the test and the page reloaded with the default parameters.
- Duration: about 30 minutes (from about 12:33 to 13:00 UTC on 02/11, from the log timestamps), no interruption.
