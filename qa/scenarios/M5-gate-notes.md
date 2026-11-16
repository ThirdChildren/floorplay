# Notes for the M5 PC gate (T5.17): execution order, calibrations, ids and logs

> **Changelog 2026-11-06**: file created from the M5 plan after the delivery of T5.1–T5.16, for `emulator-qa`. It is not a scenario: it says **in what order** to run them, **with which hands** and **what to read**. It mirrors parts A, B, C1, C2 of the M4 gate (`qa/reports/M4-2026-11-03*.md`). Everything here is verified on the code of 2026-11-06 (ids, log lines); where a value is not known it says "to be read".

**Milestone**: M5 · **Type**: PC (IWER emulator via MCP `iwsdk-runtime`) · Plan: `docs/plans/M5.md`. Reports: one file per part, `qa/reports/M5-<date>-A.md`, `-B.md`, `-C1.md`, `-C2.md`, `-D.md`, plus the index `qa/reports/M5-<date>.md` (verdict and forecast-against-measurement table).

## 0. Before starting
1. `npm test` (expected green; 6413 tests on 2026-11-06), `npm run typecheck`, `npm run build`. A red here blocks the gate.
2. Runtime already started (do not change headed/headless without announcing it). Each scenario: write `dev-params.local.txt` (one line), `browser_reload_page`, `xr_accept_session`, `xr_set_input_mode {mode: "hand"}`, wait 2.5–3 s, head (0; 1.6; 0), hands at rest `(∓0.30; 1.10; 0.10)`.
3. **Every scenario starts with `reset=1`** (deletes all the `soglia:v1:*` keys, including the accessibility preferences, the sun, the coach and the issues): otherwise the contrast, the large text or the role of one scenario carry over to the next. The scenarios that test the resume say so.
4. Editing a `.uikitml` or a source during the session reloads the page and **loses the XR session**: redo `xr_accept_session`. The gate does not modify the code.
5. Read the logs with `since` and narrow filters: `[soglia:hands]` and `[soglia:stats]` fill the buffer.
6. **Log contract**: no `error`; the only accepted `warn` is `THREE.WebGLRenderer: Can't change size while VR device is presenting.` **after** `xr_end_session`; there must be no `Missing glyph`, `reading 'add'`, `budget exceeded`, `toNonIndexed`, `uncaught`.

## 1. Hand calibration in IWER (whoever misses the target has not found a bug)
| Source (`pinch=`) | Hand pose to pinch point `T` | Where it holds |
|---|---|---|
| `grip` (historical recipe M2–M4) | `T − D_GRIP` = `(Tx + 0.038; Ty + 0.003; Tz − 0.037)`, identity orientation, `D_GRIP` = (−0.038; −0.003; +0.037) | all the old scenarios, 8 × 6 cm buttons, chips, menu, pieces |
| `grip` (measurement of T5.8–T5.10) | `T + (0.029; −0.0015; −0.045)` (the pinch point is `hand + (−0.029; +0.0015; +0.045)`) | small targets: `pin:info-*` diamonds (radius 2 cm) |
| `auto` (`joints` source) | `T + (0; 0.0245; 0.012)` | `−`/`+` rows of the View panel (3.3 cm), S5.1, S5.6; the log `[soglia:hands] … event=pinch-start point=` gives the real point |
If a target does not respond: read `pinch-start point=` and correct the pose by that difference (once), noting the value in the report. The two `grip` recipes differ by about 1 cm: on the 8 × 6 cm targets it does not matter.
Other M4 rules that still hold: **long pinch** = `xr_set_select_value` at 1, hand still, wait 1.5 s, then 0 (never `xr_select` < 1 s); short pinch = `xr_select {duration: 0.3}`; with `pinch=auto` `xr_select` ≥ 0.4 s or `set-select-value` 1 + 1.5 s is needed.

## 1b. Gate state and RERUN (2026-11-06)
Parts **A and B** were run (`qa/reports/M5-2026-11-06-AB.md`) with a "not passed" outcome because of: **F1** `npm run typecheck` red (an error in `tests/unit/params.test.ts`, `Params` literal without `contrast` and `text`), **W1** coach that did not wait with View or Issues open, **W2** K18 = 84/86 (≥ 85). `xr-engineer` fixed everything (committed): **T5.RA** done (walls and thresholds merged, `house` group from 24 to 8 in A and 7 in B: −16 calls per view; K18 now 68/70/66/64, K12 25), coach with paused timeout, sun height rounded, `sun:marker` hidden at night and at real scale, golden of the living room on 21 Jun 14:00 ≈ 0.1 m². **The next run is the RERUN**, in this order:
1. **F1**: `npm test`, `npm run typecheck` (must exit with 0), `npm run build`.
2. **S5.7 check 9** (waiting coach with View and with Issues, in a single block of commands; plus the piece in hand that does not stop the timer) and check 11 (budget).
3. **S5.9 K18** (and K12, K16, K14, K15, K17, K3 for comparison with the column "Expected after T5.RA (−16)") and the `house` group = 8 (A) / 7 (B).
4. The points of **S5.1** touched: header `Sun 14° SE`; 21 Jun 14:00 living room ≈ 0.1 m² (< 0.15); at night `sun:marker` not visible and `sun:dial` visible; real scale with marker and dial hidden. And of **S5.6**: step 2 (buttons recolored with `merged:walls` instead of the walls), 3 (cone and distances) and the console sweep in a single session (warning B4.1).
5. Then **C1, C2 and D** as in §2 (parts A and B have already been run: they are not repeated except the points above).
After T5.RA the `wall:*` and `door:*` entities are **anchors without mesh** (same `StableId`, same pose): the scenarios that read their position or presence (S1.1, S3.1, S2.6, etc.) work; those that look for a mesh or a material on those entities must be read from `merged:walls` / `merged:thresholds` or from the screenshot. Log `walls rebuilt cut=2.70` / `cut=1.00` (T3.11, S3.1, S4.6).

## 2. Recommended execution order
From the cheapest to the most expensive within each part; each part has its report. The budget (S5.9) is read **inside** the parts, not separately. (**Parts A and B: already run at gate A/B, see §1b; in the rerun only the points listed above are repeated.**)

### Part A · Carryovers and sun (≈ 1 h real)
| # | Scenario | File | `dev-params.local.txt` (besides `reset=1&seed=1&debug=1`) |
|---|---|---|---|
| A1 | S5.8 carryovers R1–R6 | `M5-carryovers.md` | `house=apartment-a&role=tenant&pinch=grip&time=2026-11-04T10:00` (R2 with `failcatalog=1`, R6 with `glyphs=1` without `debug=1`) |
| A2 | S5.1 sun | `M5-sun.md` | `house=apartment-a&role=visitor&pinch=auto&time=2026-12-21T10:00` |
| A3 | S5.9 K1–K4, K7, K9–K12 | `M5-budget.md` | as E1–E6 of `M4-budget.md` + `time=2026-12-21T10:00` |

### Part B · Agent, one hand, onboarding, accessibility (≈ 2 h real)
| # | Scenario | File | `dev-params.local.txt` |
|---|---|---|---|
| B1 | S5.3 agent | `M5-agent.md` | `house=apartment-a&role=visitor&pinch=grip&time=2026-12-21T10:00` |
| B2 | S5.7 coach | `M5-menu-onboarding.md` | `house=apartment-a&role=visitor&pinch=grip&time=2026-12-21T10:00` |
| B3 | S5.4 one hand | `M5-one-hand.md` | phase A `…&role=tenant&pinch=auto&time=2026-12-21T10:00`, phase B `pinch=grip` (reload in the middle) |
| B4 | S5.6 accessibility | `M5-accessibility.md` | `house=apartment-a&role=tenant&pinch=auto&time=2026-12-21T10:00` |
| B5 | S5.9 K14–K18 | `M5-budget.md` | as described in the scenario |

### Part C1 · M2 and M3 regression (≈ 2.5 h real; with `pinch=grip` and the corrected points)
S2.1 → S2.2 → S2.5 → S2.3 → S2.4 → S2.7 → S2.6 → S2.9 → S2.8 (read from the budget) → S3.0 → S3.1 → S3.2 → S3.3 → S3.4 → S3.5. Files: `M2-*.md`, `M3-*.md`. The **corrections of 2026-11-02 and 2026-11-06** are used (S3.0 check 4 and phase 2, S3.5 step 3). Expectations changed by M5 that are **not** regressions: after each placement the `ui:rotate-button` button appears for 12 s (11 × 5 cm beside the piece): if it is on the trajectory of a pinch, move the pinch by 0.05 m and note it; at startup, after the M1 onboarding, the coach appears (`ui:coach-*`, not interactive) and the hint `Palm up for the menu`: they are expected.

### Part C2 · M1, S3.6–S3.8 and M4 regression (≈ 2.5 h real)
S1.2 → S1.3 → S1.6 → S3.6 (`pinch=auto`) → S3.7 → S3.8 → S4.1 → S4.3 → S4.4 → S4.5 → S4.6 → S4.7 → S4.8. S1.1, S1.4, S1.5 are read from the logs of S2.8/S5.9 and of a load of B; S2.0 (glyphs, `debug=1&glyphs=1`) is in the round of the labels. Changes to know: **six** fixed buttons at the model (3 planes: `ui:menu-button-*`, `ui:issue-button-*`, `ui:view-button-*`), four role chips, two-line list and 4 per page, violet move-in report and off by default, single `ui:tabletop-button` at real scale (S4.6 and S3.7 count `^ui:(menu|issue)-button-` → 4, not 6, and `^ui:view-button-` → 2 separately).

### Part D · Full demo and closing (≈ 1 h real)
S5.5 `M5-full-demo.md` last, in a single run. Then: forecast-against-measurement table (S5.9), list of the entries for `qa/device/DEBT.md` (added by the user, not by `emulator-qa`), index `qa/reports/M5-<date>.md`.

## 3. Ids and log lines to know (verified on the code)
- **Entities**: `sun:dial`, `sun:marker`, `light:patches`, `light:<windowId>` (only if lit), `ui:view-button-left|right`, `ui:view-panel`, `ui:view-close`, `ui:view-zoom|turn|month|hour-less|more`, `ui:view-contrast`, `ui:view-contrast-less|more`, `ui:view-text`, `ui:view-text-less|more`, `pin:info-001`…`-005`, `ui:agent-furnish`, `ui:agent-clear`, `ui:rotate-button` (always exists, visible only in the 12 s window), `ui:coach-menu-button`, `ui:coach-grab`.
- **Logs** (prefix `[soglia]`): `sun set time=… source=… utc=…Z az=… el=…` · `sun below horizon time=… source=… utc=…` · `sun light windows=… rooms=<id>:<m² with 1 decimal>` · `sun dial ringRadius=… marker=x,y,z` · `view button pressed id=… hand=…` · `view panel opened mode=pinned hand=…` · `view panel view maxAngleDeg=… distance=…` · `view panel closed via=button|close|menu|panel|suspend|view` · `view control pressed id=ui:view-… hand=…` · `view step row=… value=…` · `view panel rebuilt text=…` · `access contrast=on|off source=…` · `access text=large|normal source=… menu=large issues=large` · `access applied recolored=N` · `coach step=menu-button|grab|done reason=…` · `rotate button shown|hidden|pressed …` · `furniture rotated <id> rot=<deg> source=button` · `pins layer count=… baseline=… info=… role=…` · `info opened id=…` · `issues screen=info` · `agent staging action=furnish|clear …` · `agent staging denied action=… reason=…` · `undo action=stage id=furnish:scandinavian`.
- **Draw call groups**: `house` = **8** in A and **7** in B after T5.RA (it was 24); `merged:walls`, `merged:thresholds`; the `[soglia:stats:groups]` lines of the M3/M4 scenarios with `house` 24 must be read with −16.
- **Sun areas**: in the log they have **one decimal**; the exact goldens (2.3029; 1.1616; 2.4284 m²) are in the unit tests.
- **Resolution**: `menu view maxAngleDeg` and `issues panel view maxAngleDeg` for the cone; at large text ≈ 28.5° (≤ 30° with pitch ±8°), at normal text ≈ 26.1°.

## 4. Gate decisions and criteria (from the M5 plan)
- **Blocking**: console errors in the normal path, `npm test`/`typecheck`/`build` red, `CLAUDE.md` violations (Italian strings, non-CC0 assets, external services), > 100 calls per view. The rest is a warning (user rule, 2026-10-06).
- **R-A (T5.RA)** was **carried out** after gate A/B (K18 = 84/86): at the rerun the worst case must be **≈ 68–70** (warning threshold 76); if it goes back up to **≥ 85**, it writes it as a high warning and reports it to the coordinator before closing.
- **Criterion differences already decided** (not FAILs): the area log has one decimal; at 15:00 on 21 Dec in A there are no patches; the study is not in the sun at 15:00; on 21 Jun 14:00 the living room has ≈ 0.1 m² and not 0; the pinch target on a diamond is the head (0.027 m above the tip); `Sun 14° SE` is rounded; the View panel closes by itself when another panel is opened; a persistent reason label can cover the low rows of the View panel (warning).
- **Headset only** (not tested here): real fps, comfort of the six buttons, legibility at 3.0 cm, contrast in the narrow field of view, real resume, long pinch with real fingers. The report lists them as proposals for `qa/device/DEBT.md`.
- After the gate: `contest-reviewer` (T5.18).
