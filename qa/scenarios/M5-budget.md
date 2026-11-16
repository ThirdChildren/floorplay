# S5.9 · M5 budget: forecast against measurement (six buttons, dial, patches, info points, "Rotate", coach)

> **Note 2026-11-14 (UI fixes)**: every step or criterion of this scenario about the FitCheck (door-fit label `Fits` / `Won't fit` / `Fits when disassembled` / `No route`, `ui:fit-label`, `ui:fit-marker-*`, the `fit` menu tab, the wheelchair and stroller pieces) is REMOVED with the feature: skip it. The rest still applies.

> **Changelog 2026-11-06**: scenario created from the M5 plan (D55, D61, T5.7); it extends `qa/scenarios/M4-budget.md` (K1–K13) with K14–K18. The worst case measured in M4 is K4 = 75 per view (regression) and K11 = 71.

> **Note 2026-11-07 (PC gate of M6 phase A, `qa/reports/M6-2026-11-07.md`, warning A2)**: the numbers of this sheet (K2 **46**, K3 **54** / 60 at normal text, K12 **23**, K18 **68 / 70 / 66 / 64**, column "Expected after T5.RA") **cannot be reproduced with the gate recipe (F7 to open the menu) even on M5**: M5 `412790f` built in a worktree and remeasured **in the same state** (house A, 14 pieces, `role=tenant`, `time=2026-12-21T10:00`, at steady state) gives **K2 50, K3 58, K12 26, K18 at steady state 68** (after release 68 then 64, at rest 64; no transient +2 from `Rotate` in that recipe). The difference is one of recipe and state (startup hint and coach, menu point), not a regression. **Rule for the "equal to M5" comparisons** (D65 of `docs/plans/M6.md`): it is made against **M5 remeasured in the same state**, never against the forecasts of this sheet; the forecasts remain as an order of magnitude and for the warning thresholds. With M6 and `hud=0` the numbers are identical to remeasured M5; with `hud=1` the panel costs +2 (52, 60, 28, 70).

**Milestone**: M5 · **Type**: PC (IWER emulator via MCP `iwsdk-runtime`); the fps are **informational only** · **`CLAUDE.md` rule**: 3 (performance)
> **Changelog 2026-11-06 (gate A/B and T5.RA)**: gate A/B (`qa/reports/M5-2026-11-06-AB.md`) measured **K18 = 84 at steady state, 86 for ~4 s after release** (≥ 85: high warning W2) and **K16 = 73** (14 pieces, hint, room label and coach) / **78** (menu open and `grab` coach); **K14 65, K3 70, K15 65 (63 with Rotate hidden), K17 65**. For this reason **T5.RA** was carried out: the 13 walls are the mesh `merged:walls` and the 5 thresholds `merged:thresholds` (the `wall:*` and `door:*` entities stay anchors without mesh, same `StableId` and same pose); the `house` group goes from **24 to 8** (A) and **7** (B): **all the forecasts and measurements with `house` = 24 scale by −16 per view**. After T5.RA: **K18 = 68 / 70 / 66 / 64** (those that were 84 / 86 / 82 / 80), **K12 = 25**. The tables below report the values **before T5.RA** (column "Measured") and, in the column "Expected after T5.RA", the −16 forecast for the **rerun** (`qa/scenarios/M5-gate-notes.md`). The transient +2 of the ~4 s after release is `Rotate` (12 s) added to FitCheck and markers (8 s): it is intended, not a defect. Identical images before and after (1 pixel out of 640,000); log `walls rebuilt cut=2.70` / `cut=1.00`.
> **Changelog 2026-11-06 (outcomes of T5.7)**: the checkpoint was run (IWER, house A, `time=2026-12-21T10:00`): **K1 47, K2 61, K3 69, K10 64, K17 64, worst case 76, K12 29** calls per view; groups `house` 24, `ui` 12, `sun` 2 (1 at real scale: the dial is hidden, the patches stay), `markers` 1; maximum triangles 31,354. **The worst case (76) is below 85: T5.RA is NOT needed.** K14, K15, K16 and K18 remain to be measured (after T5.9, T5.14, T5.15 and at the gate); K18 must be remeasured with the role `tenant` and the two labels. The View panel has for now 4 rows, so K17 holds for those.
> **Changelog 2026-11-06 (large text of Issues and menu, T5.13 complete and T5.16)**: delivered with the **×1.25 scale** approach (same entries, same controls, no new grid), therefore without extra meshes or panels: worst case with high contrast and large text **65** (6413 tests green). Two readings **at large text** are added: **K3t** (K3 with `text=large`: `pinned` menu at 45 × 47 cm) and **K10t** (K10 with `text=large`: Issues panel on the list). Criterion: ≤ 100 (blocks) and difference from normal K3/K10 **≤ +3** (warning if greater, because the scaled text adds no elements); `menu view maxAngleDeg` (≈ 28.5°) is also recorded for the cone. They are run in the round of S5.6.
> **Changelog 2026-11-06 (outcomes of T5.11–T5.15)**: measured **K16 = 57** cold with the coach (forecast 70) and **62** with the menu open and the `grab` coach; the **worst case with high contrast and large text = 65** (no warning or error; `toNonIndexed` no longer appears). High contrast and large text cost no calls (as expected). K15 (Rotate visible) was not read separately: the button exists only for 12 s after placement, reread within 5 s of placement. (Superseded by the following changelog: the large text of Issues and menu was delivered.)
> **Changelog 2026-11-06 (outcomes of T5.8–T5.10)**: **K14 measured = 65** (forecast 66) with 14 pieces + 5 diamonds + Issues panel on the agent `home`; groups `house` 24, `furniture` 14, `ui` 15, `markers` 2 (the `pin:info-instances` diamonds cost +1), `sun` 2; triangles 28,418. K18 **was not measured with the agent** (an invalid piece in hand with the two labels): estimate < 85, to be measured at the gate; K15 and K16 remain to be measured.

Implementation prerequisites: T5.4, T5.5, T5.9, T5.14, T5.15 (the **checkpoint T5.7** measures K1–K4 and K9–K12 as soon as buttons, dial and patches exist, **before** T5.8). Same reading rules as `qa/scenarios/M3-budget.md` and `M4-budget.md` (`callsPerView = calls / views`, with a panel open the source is the line `[soglia:stats]`, never `scene_get_render_stats`). Conventions: `qa/scenarios/M4-issue-create.md`.

## Preconditions
- Consecutive runs (`dev-params.local.txt`, `browser_reload_page`, `xr_accept_session`, `xr_set_input_mode hand`, wait 7 s, head (0; 1.6; 0)). **E1–E6** as `M4-budget.md` (with `time=2026-12-21T10:00` added: the sun is above the horizon and the patches exist). The startup hint (`ui:menu-hint`) weighs +3…+4: the "steady state" readings are taken after the first opening of the menu, the "cold" ones before.
- **New cases**:
  - `K14` **agent**: `house=apartment-a&role=agent&reset=1&seed=1&debug=1&pinch=grip&furnish=scandinavian&time=2026-12-21T10:00`, Issues panel open on the `home` (`ui:agent-furnish` visible), wait 3 s.
  - `K15` **after a placement**: from E2 (14 pieces) place `chair` in the living room and read within 5 s with `ui:rotate-button` present.
  - `K16` **cold with the coach**: E2, `reset=1`, M1 onboarding closed, coach at step `menu-button` (S5.7 step 2), wait 3 s.
  - `K17` **View panel open** on E2, wait 3 s (and again after 10 s: the peak of the first 8–9 s of M4 is transient).
  - `K18` **M5 worst case**: E6 + the 4 own/mobility pieces, Issues panel open on the list (or the `pinned` menu), **resume from the model** `my-sofa` and bring it over `furniture:bed-double#1` (invalid piece with reason and FitCheck label, with the markers), sun above the horizon (patches present), role `tenant`; wait 3 s. Mandatory check before the reading: `^ui:reason-` ≥ 1, `^ui:fit-label$` = 1, ≥ 2 `^ui:fit-marker-`, one panel open, `^light:patches$` = 1, `^sun:dial$` = 1.

## Forecast (from the M5 plan, "Draw call forecast")
The "Forecast" and "Measured" columns are **before T5.RA** (`house` group = 24); the column **"Expected after T5.RA"** is the forecast of the **rerun** (`house` = 8 in A, 7 in B: −16) with the warning threshold = expected + 8.
| Case | M4 measured | M5 forecast | **Measured (T5.7 / gate A/B, before T5.RA)** | **Expected after T5.RA (−16)** | Warning threshold after T5.RA |
|---|---|---|---|---|---|
| K1 A without furniture, at steady state | 37 (45 cold) | 44 | 47 | **31** | 39 |
| K2 14 pieces, closed, at steady state | 55 | 62 | 61 (62 gate A/B) | **46** | 54 |
| K3 14 pieces, menu open | 63 (`pinned` menu) | 70 | 69 (70 gate A/B) | **54** | 62 |
| **K4 worst case of the regression** | **75** | 82 (high 88) | 76 | **60** | 68 |
| K7 viewpoint + "Tabletop" | 24 | 26 | (see K12) | – | – |
| K9 tenant, 14 pieces, closed | 55 | 62 | – | **46** | 54 |
| K10 Issues panel open | 58 | 65 | 64 | **48** | 56 |
| K11 M4 worst case | 71 | 78 | – | **62** | 70 |
| K12 real scale with "Tabletop" | 24 | 26 | 29 | **25 (measured after T5.RA)** | 33 |
| **K14** agent, 14 pieces, `home` panel | – | 66 | 65 | **49** | 57 |
| **K15** after a placement, with "Rotate" (15 pieces) | – | 64 | 65 (63 with Rotate hidden) | **49** (47) | 57 |
| **K16** cold with the coach, 14 pieces, hint and room label | 59 | 70 | **73** (after the coach 67); with menu open and `grab` coach **78** | **57** (after the coach 51); with menu and `grab` coach **62** | 65 / 70 |
| **K17** View panel open | – | 65 | 65 (gate A/B; 64 in T5.7) | **49** | 57 |
| **K18** M5 worst case (`pinned` menu open + invalid `my-sofa` in hand + 2 reason labels + FitCheck + 2 markers, 18 pieces, tenant) | – | 82 (high 88) | **84** at steady state, **86** for ~4 s after release, 82, **80** at rest; with high contrast and large text 65 (T5.11–T5.15) | **68** at steady state, **70** after release (+2 transient of `Rotate`, intended), 66, **64** at rest (**measured after T5.RA**) | 76 |

## Steps
1. **K1–K4, K7, K9–K12** (checkpoint T5.7): as `M3-budget.md`/`M4-budget.md`; in addition `ecs_find_entities` `^ui:(menu|issue|view)-button-` (→ 6 in the cases with the model, 0 in the viewpoint) and `^(sun|light):` (→ `sun:dial`, `sun:marker`, `light:patches`, `light:win-*` anchors).
2. **K14–K18** as described; for each one the reading `[soglia:stats]` and `[soglia:stats:groups]` (the new groups `sun` and `markers`), and the check of the states before the reading.
3. For each run: `browser_get_console_logs` with `pattern: "budget exceeded|framework:|Missing glyph|uncaught|unhandled"` and unfiltered (`error`); cleanup as S3.0.

## Checks (all mandatory)
1. **Blocks**: in **every** reading `callsPerView` ≤ **100** and `triangles` ≤ **150,000**. More than 100: gate FAIL.
2. **T5.7 rule (D61)**: the worst case of K4/K11/K18 **≥ 85** opens T5.RA (R-A, −16); between 85 and 100 it is not a FAIL. **T5.RA was carried out** (K18 was 84/86 at gate A/B): at the rerun the worst case must be **≤ 76** (expected 68–70); if it goes back up to ≥ 85, it is a high warning to report to the coordinator. The report states plainly which branch was applied.
3. **Tracking** (does not block): "forecast against measurement" table for all the cases (columns M4, forecast, measured, difference); WARNING for a difference > +8 with the hypothesis to correct.
4. **Unit costs** to declare: "View" buttons (K1 − K1 of M4 with the rest equal = +4 expected, warning if > +6), dial (+1, warning > +2), patches (+1, warning > +2; 0 with the sun below the horizon), info points (+1, warning > +2), "Rotate" (+2, warning > +4), coach (+3…+4, warning > +6), View panel (≈ 0…+3 on K9, warning > +9).
5. `[soglia:stats:groups]`: `house` **8 ± 1 in A and 7 in B** (after T5.RA: `merged:walls` and `merged:thresholds`; it was 24 ± 2), `furniture` equal to the number of pieces ± 1, `sun` ≤ 2 (**1 at real scale**: the dial is hidden, the patches stay), `markers` ≤ 6 (pin, diamonds, viewpoint markers; 1 in the checkpoint with `visitor`, **2** with the info diamonds of visitor/agent: K14), `ui` consistent (**12** with the 6 buttons at the model, plus panel and labels).
6. Textures each ≤ 1024 px; the IWER total `textures=` count is **7** (6 before the first panel): it must not grow; 0 `budget exceeded` lines; no shadow with a shadow map (D55): the metric `shadowCasters` no longer exists in the status lines, it is checked with a `grep castShadow src/` (0 lines); 0 `error` entries; no `Missing glyph`.
7. The report states plainly: "the IWER count (two passes) is a proxy; the PC fps do not represent the Quest" and the entries for the headset (case K18, real cost of the UIKit panels and of the six buttons, multiview).

## Outcome
PASS if checks 1 and 6 are met in all the runs, 2 is applied and declared, and 3–5 and 7 are reported (also as warnings) · FAIL otherwise. **Gate rule (user, 2026-10-06)**: only console errors in the normal path, red tests/build, `CLAUDE.md` violations and > 100 draw calls block.

## To defer to the headset
Entry "Real draw calls and fps with the M5 worst case" of `qa/device/DEBT.md`.
