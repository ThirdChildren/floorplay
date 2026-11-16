# S3.9 · M3 budget: forecast against measurement

> **Note 2026-11-14 (UI fixes)**: every step or criterion of this scenario about the tape measure (the `Measure` tab, `ui:measure-*`, `measure ...` log lines, the `AppState.tool` field) is REMOVED with the feature: skip it. The rest still applies.

> **Note 2026-11-14 (UI fixes)**: every step or criterion of this scenario about the FitCheck (door-fit label `Fits` / `Won't fit` / `Fits when disassembled` / `No route`, `ui:fit-label`, `ui:fit-marker-*`, the `fit` menu tab, the wheelchair and stroller pieces) is REMOVED with the feature: skip it. The rest still applies.

> **Changelog 2026-11-06 (T5.RA, M5 gate)**: the 13 walls are now the mesh `merged:walls` and the 5 thresholds the mesh `merged:thresholds` (the `wall:*` and `door:*` entities remain as anchors without a mesh): the `house` group of `[soglia:stats:groups]` goes from **24 to 8** (A) and **7** (B), and every count in this scenario drops by **16** calls per view. The thresholds and forecasts below are the historical ones (only > 100 blocks); the updated table is in `qa/scenarios/M5-budget.md`.

**Milestone**: M3 · **Type**: PC (IWER emulator via MCP `iwsdk-runtime`); fps are **informative only** · **`CLAUDE.md` rule**: 3 (performance)
Implementation prerequisites: T3.4 (line `[soglia:stats:groups]`, R-C), T3.16 (final measurement) and all the tasks that add permanent elements (T3.3b, T3.9, T3.12, T3.14). See `docs/plans/M3.md`, D33 and the section "Draw call forecast up to M5"; it extends `qa/scenarios/M2-budget.md` (same reading rules: `callsPerView = calls / views`, `triangles` = total of the two views, the source with the menu open is the line `[soglia:stats]`, never `scene_get_render_stats`). Common conventions: `qa/scenarios/M3-persistence.md`.

## Preconditions
- Consecutive runs with `dev-params.local.txt` and `browser_reload_page`:
  - **E1** (reference A): `house=apartment-a&role=visitor&reset=1&seed=1&debug=1&pinch=grip`
  - **E2** (A, 14 pieces): `house=apartment-a&role=visitor&reset=1&seed=1&debug=1&pinch=grip&furnish=scandinavian`
  - **E3** (B): `house=apartment-b&role=visitor&reset=1&seed=1&debug=1&pinch=grip`
  - **E4** (block fallback): `house=apartment-a&role=visitor&reset=1&seed=1&debug=1&pinch=grip&furnish=scandinavian&failmodels=1`
  - **E5** (joints, regression): as E2 but with `pinch=auto` (the numbers must not change by more than 1).
- For each: `xr_accept_session`, `xr_set_input_mode {mode:"hand"}`, wait 7 s, head at (0; 1.6; 0).
- **Standard cases** (six from M2 + two new), all with the most recent `[soglia:stats]` line after waiting 3 s:
  - `K1` reference A without furniture (E1), scale 0.05. `K2` E2 menu closed. `K3` E2 menu open. `K4` **worst case**: E2 + 4 own/mobility pieces placed (`my-sofa`, `my-desk`, `my-bed`, `wheelchair`, in different rooms, all valid), menu open, **`my-sofa` in hand above `furniture:bed-double#1` in the bedroom**: invalid piece with the reason label **and** the FitCheck label with markers (the bedroom is two doors away: `d-entrance` and `d-bedroom`). `K5` E2 menu closed and `K6` E2 menu open at scale **0.12** (zoom as M2-budget step 4). `K7` **viewpoint**: E2, enter `viewpoint:V1`, menu closed. `K8` **tape measure**: E2, `measure` tab, two points placed and label visible, menu closed.
- **Mandatory check before every K4 reading**: `ecs_find_entities` with `^ui:reason-` ≥ 1 **and** `^ui:fit-label$` = 1 **and** ≥ 2 `^ui:fit-marker-`, and the lines `reason shown` and `fit label shown` in the log; otherwise the measurement is not valid (repeat once and the report declares it).

## Forecast (from the plan, D33; R-B and R-C included in the tasks)
| Case | M2 measured | M3 forecast | Warning threshold (forecast + 8) | M4 → M5 forecast (tracking only) |
|---|---|---|---|---|
| K1 A without furniture | 35 | **40** | 48 | 40 → 40 |
| K2 14 pieces, closed | 49 | **54** | 62 | 56 → 67 |
| K3 14 pieces, open | 58 | **65** | 73 | 67 → 78 |
| K4 worst case at 0.05 | 66 | **80** (high 92) | 88 | 84 → 95 |
| K5 closed at 0.12 | 40 | **45** | 53 | – |
| K6 open at 0.12 | 49 | **56** | 64 | – |
| K7 viewpoint, 14 pieces | – | **≤ 49** | 57 | ≤ 55 → ≤ 66 |
| K8 tape measure active | – | **59** (K2 + 5) | 67 | – |

## Steps
1. **E1**: wait 7 s; `browser_get_console_logs` with `pattern: "soglia:stats"`, `count: 6` → K1; `scene_get_render_stats` (menu closed) for comparison; `ecs_find_entities` with `^ui:menu-button-` (→ 2).
2. **E2**: K2, then K3 (menu open, `L_MENU` with `Q_UP`, wait 0.9 s + 3 s). Then K4, which is prepared by first placing the 4 pieces ("mine" and "fit" tabs, S3.3/S3.5, all valid; `my-sofa#1` stays placed in the living room), then opening the menu, taking `my-sofa` (it will be `furniture:my-sofa#2`) and carrying it (grip correction) above `furniture:bed-double#1` (position read with `ecs_query_entity` `["Transform"]` + (0; 0.05; 0)); wait 3 s; mandatory checks; reading. Release outside the house. Zoom to 0.12 (M1-two-hands phase C) and K5, K6.
3. **K7**: from E2 at scale 0.05, menu closed, `viewpoint:V1` (S3.1 step 2), wait 3 s → reading; return to the tabletop.
4. **K8**: `measure` tab, two points on the study window (S3.2 step 3), menu closed, wait 3 s → reading; leave the tab.
5. **E3, E4, E5**: wait 7 s and reading (E4 also `furniture models loaded=0 fallback=14` and `furniture model unavailable` ×14, as M2-budget step 9; E5 same reading as K2/K3).
6. For every `[soglia:stats]` reading also note the last `[soglia:stats:groups]` line (every 2 s with `debug=1`): `house`, `furniture`, `hands`, `ui`, `markers`, `other` (estimate by scene traversal, not the renderer number).
7. For every run `browser_get_console_logs` with `pattern: "budget exceeded|framework:|Missing glyph|uncaught|unhandled"` and unfiltered (`error`); `browser_profile` (informative) in K4.
8. Cleanup as in S3.0.

## Checks (all mandatory)
1. **Blocks**: in **every** reading (K1-K8, E1-E5) `callsPerView` ≤ **100** and `triangles` ≤ **150,000**. More than 100 in any of them: gate FAIL.
2. **Tracking** (D33, does not block): the report contains the "forecast against measurement" table with one row per case (K1-K8), the columns M2, forecast, measured, difference, and for every difference > +8 the word **WARNING** with the hypothesis to correct (D33 updated in the plan). **If K4 ≥ 85 the report opens task R-A (merge walls and thresholds, −16 per view, 2.5 h) as the first task of M4**; if K4 ≥ 85 and < 100 it is a warning, not a FAIL.
3. The menu cost `K3 − K2` ≤ 12 (warning if higher; expected +9...+11) and the cost of the Menu button (K1 − 35 ≈ +4...+5; warning if > 8).
4. `[soglia:stats:groups]`: `house` = 24 ± 2, `furniture` equal to the number of pieces (14 in K2, 18 in K4) ± 1, `hands` between 5 and 8, `markers` ≤ 4 in K4; line present every 2 s with `debug=1` and **absent** without `debug=1`.
5. App textures ≤ 4 and each ≤ 1024 px; 0 `budget exceeded` lines; `shadowCasters` = 0 (no shadows before M5); 0 `error` entries; no `Missing glyph info`.
6. E4 (blocks): `furniture models loaded=0 fallback=14`; 14 `warn` lines `furniture model unavailable … using a block`; `callsPerView` ≈ 49 + (new ones) with R-C (a block at one call: the M2 line goes from 63 to ~49-54); the report declares the number.
7. E5 (`pinch=auto`) differs from E2 by no more than 1 call per view.
8. The report declares plainly: "the IWER count (two passes) is a proxy; PC fps do not represent the Quest" and the entries for the headset: real draw calls and fps of case K4; real cost of the UIKit panels (2 per root?) and of multiview.

## Outcome
PASS if check 1 and 5-7 are met for all runs, 2 is in the report and 3-4 are reported (also as warnings) · FAIL otherwise. **Gate rule (user, 2026-10-06)**: only console errors in the normal path, red tests/build, violations of `CLAUDE.md` and > 100 draw calls block; everything else is a warning.

## To defer to the headset
Real draw calls, triangles and fps with K4; real cost of the UIKit panel and of multiview (entry "Real draw calls and fps with the M3 worst case" in `qa/device/DEBT.md`).

## Changelog
- 2026-10-09: scenario created from the M3 plan (D33): forecast against measurement at every gate; K4 ≥ 85 opens R-A in M4.
