# S5.10 · Quick regression after M5

> **Changelog 2026-11-06**: scenario created from the M5 plan; it follows `qa/scenarios/M4-regression.md`. It uses the existing scenarios **with the corrected starting points** (S1.2, S2.6, S2.9, S3.0, S3.2, S3.3) and the corrections of carryover 6 **approved by the user and applied on 2026-11-06** (M5 plan, "Carryovers: corrections to the scenarios"): S3.0 (check 4 and phase 2), S3.5 (step 3), S4.3 (step 4) and S4.5 (steps 2 and 5, violet move-in report).

> **Changelog 2026-11-06 (M5 gate)**: the execution order in parts (A, B, C1, C2, D), the hand calibrations (historical and measured `pinch=grip`, `pinch=auto`), the new ids and log lines are in **`qa/scenarios/M5-gate-notes.md`**: this file remains the list of what is repeated and of what changes. The corrections of S3.0, S3.5, S4.3 and S4.5 and the fourth chip (`Agent`) of S4.3 are already applied in the scenarios.

**Milestone**: M5 · **Type**: PC (IWER emulator via MCP `iwsdk-runtime`) · **`CLAUDE.md` rules**: all · See `docs/plans/M5.md`.

## What changes in M5 and can break the old scenarios
- **Six** fixed buttons appear (two more "View" ones) and a dial with patches: pinches near `ui:view-button-*` (height 1.635) must not land on the "Issues"/"Menu" buttons (disjoint rectangles) and vice versa.
- `transitionIssue` no longer receives the role (R1); persistence works without a catalog (R2); the "Agent" chip is there from the gate; the detail opens with **one** pinch (R5); the move-in report color is violet (R4).
- The "Rotate" button appears for 12 s after each placement: it must not be on the trajectory of the pinches of the scenarios (at ≥ 0.50 m from the head, beside the piece); if it is, the recipe moves by 0.05 m.
- The hint `Palm up for the menu` and the cold-start coach change the draw call readings (+3…+4): see `M5-budget.md`.
- `pinch=grip` as in M4; the `viewpoint:V*` markers still have a radius of 0.025 m.

## Preconditions
- `dev-params.local.txt` per scenario as in each one, **plus `time=2026-12-21T10:00`** when the sun is needed; `pinch=grip`; standard setup.

## Steps
Order (cheapest first): S2.1 → S2.2 → S2.5 → S2.3 → S2.4 → S2.7 → S2.6 → S2.9 → S1.2 → S1.3 → S1.6 → S3.7 → S3.8 → S3.0 → S3.1 → S3.2 → S3.3 → S3.4 → S3.5 → S4.1 → S4.3 → S4.4 → S4.5 → S4.6 → S4.7 → S4.8 → S3.9/S5.9 (budget). S1.1, S1.4 and S1.5 are read from the logs of S2.8/S5.9 and of a load of B; S2.0 is in the round of the labels.
After S3.7 and S4.6 also verify: `ecs_find_entities` `^ui:(menu|issue|view)-button-` (→ 6 in tabletop, 0 at real scale, where `ui:tabletop-button` exists).

## Checks (all mandatory)
1. Every scenario in the list **PASS** (or PASS with known M3/M4 warnings); no FAIL.
2. In tabletop the six fixed buttons are present; at real scale only `ui:tabletop-button`.
3. Console without `error`; no `Missing glyph`, `reading 'add'` or `budget exceeded` across all the steps; the only expected `warn` is the framework one after `xr_end_session`.
4. The worst-case draw calls of the regression are ≤ 100 (declared and compared with K4 of S5.9).
5. A failure due to a **starting point that is not free** (for example under "Rotate") is corrected at the point, without changing the criterion, with a changelog line in the scenario concerned.

## Outcome
PASS if checks 1–4 are met · FAIL otherwise.

## To defer to the headset
No new entry: the headset tests are in the M1–M5 entries of `qa/device/DEBT.md`.
