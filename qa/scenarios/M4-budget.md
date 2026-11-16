# S4.10 · M4 budget: forecast against measurement (pins, "Issues" buttons, panel, "Tabletop")

> **Note 2026-11-14 (UI fixes)**: every step or criterion of this scenario about the FitCheck (door-fit label `Fits` / `Won't fit` / `Fits when disassembled` / `No route`, `ui:fit-label`, `ui:fit-marker-*`, the `fit` menu tab, the wheelchair and stroller pieces) is REMOVED with the feature: skip it. The rest still applies.

> **Changelog 2026-11-02**: scenario created from the M4 plan (D33 updated, D46, D47); it extends `qa/scenarios/M3-budget.md` (K1–K8) with K9–K12. The measured M3 worst case is K4 = 71 per view.

> **Changelog 2026-11-06 (T5.RA, M5 gate)**: the `house` group goes from **24 to 8** (A) and **7** (B) (meshes `merged:walls` and `merged:thresholds`; `wall:*` and `door:*` entities are anchors without a mesh) and every count below drops by **16** per view; check 4 (`house` 24 ± 2) → **8 ± 1**. The forecasts are historical (only > 100 blocks); the current values are in `qa/scenarios/M5-budget.md`.

**Milestone**: M4 · **Type**: PC (IWER emulator via MCP `iwsdk-runtime`); fps are **informative only** · **`CLAUDE.md` rule**: 3 (performance)
Implementation prerequisites: T4.4, T4.6a, T4.R1, T4.12 and all the tasks that add permanent elements. Same reading rules as `qa/scenarios/M3-budget.md` (`callsPerView = calls / views`, the source with an open panel is the line `[soglia:stats]`, never `scene_get_render_stats`). Conventions: `qa/scenarios/M4-issue-create.md`.

## Preconditions
- Consecutive runs (`dev-params.local.txt`, `browser_reload_page`, `xr_accept_session`, `xr_set_input_mode hand`, wait 7 s, head (0; 1.6; 0)):
  - **E1–E5**: as `qa/scenarios/M3-budget.md` (role `visitor`).
  - **E6** (tenant, 14 pieces, seed pins + 1): `house=apartment-a&role=tenant&reset=1&seed=1&debug=1&pinch=grip&furnish=scandinavian&time=2026-11-04T10:00`; create `issue-014` on the washer (S4.1 steps 2–4) and turn on the move-in report (S4.5 step 2): 5 pins, 4 red/orange/green and 1 violet (the report was blue until T5.R4; correction 2026-11-06).
- **Cases**:
  - `K1`–`K8`: as M3 (E1–E5), now with the "Issues" buttons (+2 estimated).
  - `K9` E6, menu and panel closed, scale 0.05. `K10` E6 with the Issues panel open on the list (`ui:issue-button-right`, `ui:issue-open-list`), wait 3 s.
  - `K11` **M4 worst case**: E6 + place the 4 own/mobility pieces (S3.3/S3.5), open the Issues panel (list), **re-grab from the miniature** `my-sofa` and carry it above `furniture:bed-double#1` (invalid piece with the reason label **and** the FitCheck label with markers); wait 3 s. Mandatory check before the reading: `^ui:reason-` ≥ 1, `^ui:fit-label$` = 1, ≥ 2 `^ui:fit-marker-`, `^ui:issue-panel$` = 1, `^pin:` ≥ 5.
  - `K12` **real scale**: E2, enter `viewpoint:V1` (S4.6 step 1), menu closed, with `ui:tabletop-button` present, wait 3 s.
  - `K13` (informative) **10 + 1 pins**: from E6 add issues from the free point up to 12 `pin:*` (MAX 40 is not tested): the number of calls must not grow by more than 1 compared with K9 (a single instanced mesh).

## Forecast (from the M4 plan, D33 updated; R-B and R-C included)
| Case | M3 measured | M4 forecast | Warning threshold (forecast + 8) | M5 forecast (tracking only) |
|---|---|---|---|---|
| K1 A without furniture | 35 | **37** | 45 | 48 |
| K2 14 pieces, closed | 49 | **51** | 59 | 62 |
| K3 14 pieces, open | 58 | **60** | 68 | 71 |
| K4 M3 worst case (visitor) | 71 | **73** | 81 | 84 |
| K5 closed at 0.12 | 44 | **46** | 54 | – |
| K6 open at 0.12 | 53 | **55** | 63 | – |
| K7 viewpoint | ≤ 49 | **≤ 51** (Tabletop button; Menu/Issues buttons hidden) | 59 | ≤ 62 |
| K8 tape measure active | (in the M3 report B; M3 forecast: 59) | **K2 measured + 5 + 2** | K2 + 15 | – |
| **K9** tenant, 14 pieces, closed, 5 pins | – | **52** (K2 + 2 buttons + 1 mesh) | 60 | 63 |
| **K10** K9 with the Issues panel open | – | **61** (K9 + 9) | 69 | 72 |
| **K11** M4 worst case | – | **74** (high 80) | 82 | 85 (tenant) / 95 (agent) |
| **K12** real scale with "Tabletop" | – | **≤ 51** | 59 | ≤ 62 |
| **K13** 12 pins | – | **K9 + 1** | – | – |

## Steps
1. **E1–E5, K1–K8**: as M3-budget (steps 1–5), now role `visitor`: in the six standard button cases `ecs_find_entities` `^ui:(menu|issue)-button-` (→ 4).
2. **E6, K9, K10**: reading of `[soglia:stats]` and `[soglia:stats:groups]` (`markers` must grow by 1 for the pins mesh); `ecs_find_entities` `^pin:`.
3. **K11**: prepare as indicated; mandatory checks; reading; `browser_profile` (informative); release outside the house.
4. **K12**: enter V1 (menu closed), reading; `ecs_find_entities` `^ui:tabletop-button$` (→ 1).
5. **K13**: add issues up to 12 pins; reading.
6. For every run: `browser_get_console_logs` with `pattern: "budget exceeded|framework:|Missing glyph|uncaught|unhandled"` and unfiltered (`error`); cleanup as in S3.0.

## Checks (all mandatory)
1. **Blocks**: in **every** reading `callsPerView` ≤ **100** and `triangles` ≤ **150,000**. More than 100: gate FAIL.
2. **Tracking** (does not block): "forecast against measurement" table in the report for K1–K13 (columns M3, forecast, measured, difference); WARNING for a difference > +8 with the hypothesis to correct. **K11 ≥ 85 opens R-A as the first task of M5**; K11 between 85 and 100 is a warning, not a FAIL. With K11 < 85 the M5 projection (agent ~95) is still to be re-measured with shadows.
3. Unit costs to declare: "Issues" buttons (K1 − K1 of M3 = +2 expected, warning if > +5), pins mesh (K9 − K2 − buttons = +1, warning if > +2), Issues panel (K10 − K9 ≈ +9, warning if > +12), Tabletop button (K12 − K7 = +2, warning if > +4).
4. `[soglia:stats:groups]`: `house` 24 ± 2, `furniture` equal to the number of pieces ± 1, `markers` ≤ 5 in K11 (pins and viewpoint markers, one instance each), `ui` consistent (panel + buttons + labels); line absent without `debug=1`.
5. K13: 12 pins cost no more than 1 call compared with K9 (instanced mesh).
6. App textures ≤ 4 and each ≤ 1024 px; 0 `budget exceeded` lines; `shadowCasters` = 0; 0 `error` entries; no `Missing glyph`.
7. The report declares plainly: "the IWER count (two passes) is a proxy; PC fps do not represent the Quest" and the entries for the headset (case K11, real cost of the UIKit panels and of multiview).

## Outcome
PASS if check 1 and 5–6 are met in all runs, 2 is in the report, and 3–4 and 7 are reported (also as warnings) · FAIL otherwise. **Gate rule (user, 2026-10-06)**: only console errors in the normal path, red tests/build, violations of `CLAUDE.md` and > 100 draw calls block.

## To defer to the headset
Real draw calls and fps with K11 (entry "Real draw calls and fps with the M4 worst case" of `qa/device/DEBT.md`).
