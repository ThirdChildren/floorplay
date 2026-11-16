# S4.5 · Move-in report: violet pin from `issues-apartment-a.json`

> **Changelog 2026-11-06 (Block R deviations, T5.R4/T5.R5)**: the report has two-line rows (dot + status word + urgency; below, the text up to 22 characters) and **opens with a single pinch on the row**: to check 3 is added the proof from the `movein` screen (`ui:issue-row-0` → `issues screen=detail id=baseline-001`); truncation uses three ASCII dots `...`.
> **Changelog 2026-11-06** (user decision on carry-over 6 of the M4 gate; M5 plan, T5.R4): (1) **steps 2 and 5, check 2**: the `Show on model` switch is **off by default**; at step 2 the report is opened, the off state is verified (0 `pin:baseline*`) and **then** `ui:issue-movein-toggle` is pressed to turn it on; the reading of the pin, of the switch turned on and of the screenshot happens after this press; at step 5 "leave the layer on" stays as it is; (2) the color of the report pin becomes **violet** (`color=violet`, `0x9b59d0`) instead of blue, to distinguish it from the viewpoint pillars (T5.R4): where "violet" is read below, "blue" was read before. No other criterion changes.
> **Changelog 2026-11-02**: scenario created from the M4 plan (D46, D48, T4.10).

**Milestone**: M4 · **Type**: PC (IWER emulator via MCP `iwsdk-runtime`) · **`CLAUDE.md` rules**: 7 ("Sample data"), 8, 9
Implementation prerequisites: T4.4, T4.6b, T4.8, T4.9, T4.10. Conventions: `qa/scenarios/M4-issue-create.md`.

## Preconditions
- `dev-params.local.txt` = `house=apartment-a&role=tenant&reset=1&seed=1&debug=1&pinch=grip&time=2026-11-04T10:00`; standard setup. The report is the entry `baseline-001` ("Scratch on the parquet, present at move-in.") at plan (3.8; 0.0; 1.0) → world (−0.085; 1.35; −0.58); pin head at about y = 1.385. Pinch on the head: hand at (−0.047; 1.388; −0.617).

## Steps
1. **Before**: `ecs_find_entities` `^pin:baseline` (→ 0: the report layer is off by default); `^pin:` (→ 3).
2. **Open the report**: pinch on `ui:issue-button-right` (hand at (0.4727; 1.568; −0.6035)), pinch on `ui:issue-open-movein`: log `pattern: "issues screen|movein|pins|pin color"`; `ui_inspect` (rows, header, `Show on model` switch **off**); `ecs_find_entities` `^pin:baseline` (→ 0). Then pinch on `ui:issue-movein-toggle`: log `movein shown count=1 sample=true`; `ecs_find_entities` `^pin:baseline` (→ 1); `ecs_query_entity` on `pin:baseline-001` with `["Transform"]`; `ui_inspect` (switch on); `browser_screenshot` → attach (violet pin in the living room-hallway, next to the three seed colors).
3. **Open the violet pin**: (a) from the `movein` screen a single pinch on `ui:issue-row-0`: log `issues screen=detail id=baseline-001`, then `ui:issue-back`; (b) close the panel; short pinch (0.3 s) on the pin head (hand at (−0.047; 1.388; −0.617)): log `issues screen=detail id=baseline-001`; `ui_inspect` (full text, no action control, `Sample data`); `ecs_find_entities` `^ui:issue-action-` (→ 0).
4. **Turn off**: go back to the report (`ui:issue-back`), pinch on `ui:issue-movein-toggle`: `movein hidden`; `^pin:baseline` (→ 0). Turn on again: `movein shown count=1 sample=true`.
5. **Persistence**: leave the layer on, wait 1.5 s (`state saved`), reload **without** `reset=1` and without `role=`: log `pattern: "role|issues|pins|movein"`; `^pin:baseline` (→ 1); open the report: the switch is on. Turn off, wait, reload: `^pin:baseline` (→ 0).
6. **Landlord**: `ui:issue-role-landlord`: the report and the violet pin are visible read-only (no `ui:issue-action-*`).
7. **Visitor**: `ui:issue-role-visitor` with the layer on: `ecs_find_entities` `^ui:issue-open-movein$` (→ 0), `^pin:(issue|baseline)` (→ 0, also `pin:baseline-001`; since T5.9 the visitor does see the 5 `pin:info-*`, so `^pin:` alone gives 5, not 0: correction 2026-11-06, F-C2-2); the home says `Pick Tenant to report an issue or Landlord to manage them.`; go back to `tenant`: the pin reappears.
8. Unfiltered log (`error`, `Missing glyph`, `reading 'add'`).

## Checks (all mandatory)
1. **Step 1**: 0 `pin:baseline-*` and 3 `pin:issue-*` with the report off.
2. **Step 2**: `issues screen=movein`; on opening the `Show on model` switch is **off** and 0 `pin:baseline*` (default); the list has **one** row with the text `Scratch on the par...` (truncated to **21–22 characters** with three ASCII dots, **even mid-word**; below the status line; F-C2-4) and the header `Sample data`; after pressing `ui:issue-movein-toggle`: `movein shown count=1 sample=true`; `pin color id=baseline-001 color=violet`; `pin:baseline-001` at (3.8; 0.0; 1.0) ± 0.02 (tip at height 0); the switch is on; all texts ≥ 2.4 cm.
3. **Step 3**: `issues screen=detail id=baseline-001` (reached both from the pin and, from the `movein` screen, with **a single** pinch on `ui:issue-row-0`; no select-only line); the full text `Scratch on the parquet, present at move-in.`; `Sample data`; **no** red/orange/green status (the pin is violet) and **0** action controls (the report is not an issue).
4. **Step 4**: `movein hidden` → 0 `pin:baseline*`; turn on again → 1.
5. **Step 5**: the preference `prefs.moveInVisible` is restored (line `pins layer count=4 baseline=1 role=tenant` on reload; `state saved` carries the value); from off it stays off.
6. **Step 6**: the landlord sees the same violet pin read-only; no action control.
7. **Step 7**: the visitor sees neither the report button nor any **issue or report** pin (not even with the preference on): 0 `pin:issue-*`, 0 `pin:baseline*`; sees only the 5 `pin:info-*` (`pins layer count=0 baseline=0 info=5 role=visitor`; F-C2-2).
8. Cost: `[soglia:stats:groups]` counts the violet pin in the `markers` group; calls per view do not grow compared with those of the group (a single instanced mesh).
9. No `error` entries; no `Missing glyph`.

## Outcome
PASS if checks 1–9 are met · FAIL otherwise.

## To defer to the headset
Readability of the violet next to the other colors; understanding of the report for someone who does not know it (is the text "Sample data" enough?) — entry "Instanced pins" of M4 in `qa/device/DEBT.md`.
