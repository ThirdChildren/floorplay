# S5.5 · Full demo: the three acts in a single path

> **Note 2026-11-14 (UI fixes)**: every step or criterion of this scenario about the tape measure (the `Measure` tab, `ui:measure-*`, `measure ...` log lines, the `AppState.tool` field) is REMOVED with the feature: skip it. The rest still applies.

> **Note 2026-11-14 (UI fixes)**: every step or criterion of this scenario about the FitCheck (door-fit label `Fits` / `Won't fit` / `Fits when disassembled` / `No route`, `ui:fit-label`, `ui:fit-marker-*`, the `fit` menu tab, the wheelchair and stroller pieces) is REMOVED with the feature: skip it. The rest still applies.

> **Changelog 2026-11-06**: scenario created from the M5 plan (ROADMAP S5.5). The "less than 10 minutes" of the first ROADMAP holds for a person on the headset: **clock time is not a PC criterion** (each MCP call costs 0.5–3 s). The PC criterion is: complete path, zero errors, and a pinch count.

> **Changelog 2026-11-06 (outcomes of T5.1–T5.7)**: step 6 aligned with the sun goldens (at 15:00 on 21 Dec in A there are no patches); see `qa/scenarios/M5-sun.md`.
> **Changelog 2026-11-06 (outcomes of T5.11–T5.15)**: step 1: the coach has two steps with a 20 s timeout per step and waits if Issues or View are open; step 2: "Rotate" (11 × 5 cm, 12 s, every press restarts from 12 s); step 11: high contrast and large text from the View panel (6 rows, `+`/`−` or cell) with explicit `contrast=`/`text=` that win over the saved value; large text of the **Issues** panel and of the **menu v2** then **delivered** (T5.13 complete, T5.16) as a ×1.25 scale of the whole panel (45 × 47 cm, 28.5° cone): at step 11 the menu and Issues are opened at large text and `menu view maxAngleDeg` ≤ 30.0 is checked. On resume (step 12) also `coach step=done reason=saved`. Known problem: a persistent reason label can cover the low rows of the View panel (warning).
> **Changelog 2026-11-06 (outcomes of T5.8–T5.10)**: step 7 aligned with Furnish/Clear as implemented (panel that closes after the action, Undo `action=stage`, ids with rising counters, `Agent` chip on, 5 info diamonds for visitor and agent); IWER calibration with `pinch=grip`: hand at `T + (0.029; −0.0015; −0.045)` for small targets (diamonds, panel rows); see `qa/scenarios/M5-agent.md`.

**Milestone**: M5 · **Type**: PC (IWER emulator via MCP `iwsdk-runtime`) · **`CLAUDE.md` rules**: all the non-negotiable ones (1, 2, 4, 5, 7, 8, 9, 10) · See `docs/plans/M5.md`. It is run **last** (after S5.1–S5.9). Conventions: `qa/scenarios/M4-issue-create.md`.

## Preconditions
- `dev-params.local.txt` = `house=apartment-a&role=visitor&reset=1&seed=1&debug=1&pinch=grip&time=2026-12-21T10:00`. A single run, **without reloading** between the acts, except step 12 (resume).
- Use of hands and buttons only; the left hand is used only for the indicated steps (palm up, second pinch).

## Path
**Act 1 · Choose (visitor)**
1. Standard setup; M1 onboarding (selection of a room); coach of the "Menu" button (S5.7 steps 2–4 in short form: button, piece, placement).
2. Furnish: `bed-double` in the bedroom `W(7.0; 3.0)` and `sofa-3seat` in the living room (S2.2); rotate the bed with the touch of the left hand (S2.5) and the sofa with "Rotate" (S5.4 step 5); an invalid piece (S2.3) with label, then corrected.
3. Own furniture: `Mine` tab, `my-sofa` toward the living room: `Won't fit: the door is 80 cm wide, the sofa's shortest side is 85 cm` (S3.3); in B the same test passes (S3.4: reload with `house=apartment-b`, **a single** house change in the whole path, step 3b).
4. Measure: study window 140 cm (S3.2).
5. Viewpoint V1: enter, see the patches on the floor (S5.1 step 7), return with "Tabletop".
6. Sun: "View" panel, 10:00 → 15:00 (5 presses), living room in the sun at 10:00 (2.3 m²) and **no patch** at 15:00 (correction 2026-11-06: the study is not in the sun at 15:00); month to June and hour 18:00 (study in the sun, 1.16 m²). The View panel has 4 rows before T5.11 (then 6) and closes by itself if another panel is opened.
**Act 2 · Present (agent)**
7. Issues panel → `Agent`: `Clear`, `Furnish` (`agent staging action=furnish style=scandinavian pieces=14`; the panel closes by itself, `closed via=stage`), Undo in one step (`undo action=stage id=furnish:scandinavian`; a new Furnish gives ids with higher counters, `chair#5..8`); an info point (`pin:info-001`, screen `info`, `Sample data`). The visitor already sees the 5 diamonds at the beginning of act 1; the tenant does not.
**Act 3 · Live (tenant → landlord → tenant)**
8. `Tenant`: long pinch on the washing machine, `Leaks`, `Report` (S4.1); move-in report on (S4.5).
9. `Landlord`: list (`014, 013, 012, 010`), `Take on`, `Resolved` (S4.3).
10. `Tenant`: `Confirm` on 014 (archived) and `Reopen` on another.
11. Accessibility: high contrast and large text (S5.6 steps 2–3) and, with the right hand alone, an issue at large text.
12. **Resume**: wait 1.5 s, reload **without** `reset=1` and without `role=`: same role, same issues, same pieces, same sun time, same contrast, `coach step=done reason=saved`; then `F8`/`F9` (simulated suspension/resume) with a piece in hand: no duplicate.
13. Unfiltered log and for the `[soglia:stats]` filters; cleanup.

## Checks (all mandatory)
1. **Zero errors**: no `error`, `uncaught`, `Cannot read`, `reading 'add'`, `Missing glyph` entry; no `budget exceeded`; the only `warn` allowed is the framework one after `xr_end_session` (M5 log contract).
2. **Acts**: each act produces its log lines (act 1: `furniture placed`, `fit`, `measure`, `viewpoint entered/exited`, `sun set … source=ui`; act 2: `agent staging action=furnish … pieces=14`, `info opened id=info-001`; act 3: `issue created id=issue-014`, `issue transition … to=in_progress/resolved/archived`).
3. **Count**: the number of `pinch (left|right) start` lines of the whole path (without the resume steps) is ≤ **120** and that of the left hand alone ≤ **15** (palm up and rotation touch; the rest is one-handed).
4. **Honest labels**: "Sample data" visible on the seed issues, on the move-in report and on the info points; the role is declared "Demo roles, no accounts"; no text in Italian in any `ui_inspect` (the set of texts read is checked).
5. **Resume (rule 4)**: after the reload `role set <role> source=saved`, `sun set … source=saved`, `access … source=saved`, `state restored pieces=<n>` with the same pieces as the last save; after `F8`/`F9` with a piece in hand 0 duplicates and the menu piece with the same id (S3.0 phase 8).
6. **Budget**: `[soglia:stats]` readings in the middle of each act, all ≤ 100 calls per view.
7. **Headset only** (high): the real 10-minute test with a person, the real resume, the 60 fps and the comfort (entries of `DEBT.md`).

## Outcome
PASS if checks 1–6 are met · FAIL otherwise. If a step of an act fails because of a starting point that is not free, the point is corrected and noted (as in the M4 gate).

## To defer to the headset
Entry "Full session" of `docs/DEVICE_CHECKLIST.md`.
