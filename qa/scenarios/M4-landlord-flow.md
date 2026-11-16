# S4.3 · From landlord to tenant: list by urgency, "Take on", "Resolved", "Confirm", history

> **Changelog 2026-11-06 (M5 gate)**: since the M5 gate the role chips are **four** (`Visitor`, `Agent`, `Tenant`, `Landlord`) and the chip positions are read from the `Transform` (those of M4 are not assumed); with the large text the panel is 45 × 47 cm. Calibration: with `pinch=grip` the 8 × 6 cm buttons and the chips are pinched with `T − D_GRIP` as in M4; for the small rows see `qa/scenarios/M5-gate-notes.md`.
> **Changelog 2026-11-06 (Block R deviations, T5.R4/T5.R5)**: the list rows are on **two lines** (dot + status word `Open`/`Progress`/`Resolved`/`Archived` + urgency; below the text up to 22 characters, truncated with ASCII `...`) and are **4 per page**: the ids are `ui:issue-row-0…3` (`ui:issue-row-4` no longer exists); with the seed + `issue-014` the list stays on one page (`page=1/1`). The log `issues row selected` no longer exists and must not appear. No criterion changes in meaning.
> **Changelog 2026-11-06** (user decision on carry-over 6 of the M4 gate; M5 plan, T5.R5): step 4 and check 3: the detail opens with **a single** pinch on the row (the letter of the scenario was already this; at the M4 gate two presses were needed, selection and then opening: discoverability, carry-over 5). It is now explicit: after the **first** pinch `issues screen=detail id=…` appears, without intermediate select-only lines. Valid after T5.R5.
> **Changelog 2026-11-02**: scenario created from the M4 plan (D41, D43, D47, D48). The list order is that of D48 (active by urgency, then `resolved`, then `archived` under "History").

**Milestone**: M4 · **Type**: PC (IWER emulator via MCP `iwsdk-runtime`) · **`CLAUDE.md` rules**: 1, 7 ("Sample data"), 9 (one hand), 10
Implementation prerequisites: T4.1–T4.9 (also T4.R3, T4.6b). See `docs/plans/M4.md`, D43 (permissions), D48. Conventions (poses, buttons, long pinch, clock): `qa/scenarios/M4-issue-create.md`.

**One hand only**: in the whole scenario **only `hand-right`** moves (the left stays at rest `(−0.30; 1.10; 0.10)`, select 0); no `pinch left` line, no `menu opened hand=left`.

## Preconditions
- `dev-params.local.txt` = `house=apartment-a&role=tenant&reset=1&seed=1&debug=1&pinch=grip&time=2026-11-04T10:00`; standard setup (head (0; 1.6; 0), `O` = (0; 1.35; −0.45)).
- The seed brings `issue-010` (low, resolved, study), `issue-012` (low, open, living room), `issue-013` (medium, in_progress, bedroom) and `baseline-001`. All `sample`.
- Reading the controls: `ecs_query_entity` `["Transform"]` at every screen; pinch = `xr_select {duration: 0.3}` at `position − D_GRIP`.

## Steps
1. **Create `issue-014`** (washer, `Leaks`, Medium) as S4.1 steps 2–4: log `issue created id=issue-014 … text="The washing machine leaks."`.
2. **Open and close the panel quickly**: pinch on `ui:issue-button-right` (hand at (0.4727; 1.568; −0.6035)), wait 0.2 s, pinch on the same button (closes), repeat 3 times without a pause, then leave it open. Log `pattern: "issues panel|reading|error"`; `ecs_find_entities` `^ui:issue-panel$` (→ 1). `ui_inspect` on the panel: `home` screen (chips `Visitor`, `Agent`, `Tenant`, `Landlord` (four since the M5 gate: the `Agent` chip is on since T5.10; in M4 there were three), the buttons `Issues (4)` and `Move-in report`, the text `Hold a pinch on an appliance or a spot to report an issue.`, the footer `Demo roles, no accounts`).
3. **Become landlord**: pinch on `ui:issue-role-landlord`: log `role changed from=tenant to=landlord source=ui`; `ui_inspect` (the tenant hint text is no longer there). Pinch on `ui:issue-open-list`: log `issues screen=list page=1/1 items=…`; `ui_inspect` (rows, header `Sample data`, texts ≥ 2.4 cm); `browser_screenshot` → attach.
4. **Detail and "Take on"**: **a single** pinch on `ui:issue-row-0` (→ `issue-014`): log `issues screen=detail id=issue-014` right after that pinch (no select-only press before); `ui_inspect` (status `Open`, urgency `Medium`, category `Appliances`, room `Bathroom`, the text, a history row `4 Nov · tenant · Created`, **no** `Sample data`); `ecs_find_entities` `^ui:issue-action-` (→ only `ui:issue-action-take-on`). Pinch on `ui:issue-action-take-on`: log `issue transition …`, `pin color id=issue-014 color=orange`, `issue history …`; `ecs_find_entities` `^ui:issue-action-` (→ only `ui:issue-action-resolved`).
5. **"Resolved"**: pinch on `ui:issue-action-resolved`: log `issue transition id=issue-014 from=in_progress to=resolved …`, `pin color … color=green`; `ecs_find_entities` `^ui:issue-action-` (→ 0 for the landlord); `browser_screenshot` (green pin in the bathroom) → attach.
6. **Landlord prohibitions**: `ui:issue-back`, row of `issue-010` (resolved, seed): `ecs_find_entities` `^ui:issue-action-` (→ 0: only the tenant confirms or reopens); as said by `ui_inspect` the detail shows `Sample data`.
7. **Back to tenant**: `ui:issue-role-tenant` (the panel goes back to `home`), `ui:issue-open-list`: log `items=` in the expected order. Row of `issue-012` (open, seed): `^ui:issue-action-` (→ 0: a tenant neither takes on nor resolves). `ui:issue-back`.
8. **"Confirm"**: row of `issue-014` (resolved): `^ui:issue-action-` (→ `ui:issue-action-confirm` and `ui:issue-action-reopen`, **none** among `take-on`/`resolved`); pinch on `ui:issue-action-confirm`: log `issue transition id=issue-014 from=resolved to=archived by=tenant event=archived`; `ecs_find_entities` `^pin:` (→ `pin:issue-010`, `-012`, `-013`; **not** `pin:issue-014`); the panel goes back to the list: log `items=` with `issue-014` last under `History`; row of `issue-014`: `ui_inspect` (status `Archived`, three history rows `Resolved`, `In progress`… the last 3 of the 4 entries; the row `+1 more` or equivalent if the text is truncated).
9. **"Reopen"**: row of `issue-010` (resolved, seed): pinch on `ui:issue-action-reopen`: log `issue transition id=issue-010 from=resolved to=in_progress by=tenant event=reopened`, `pin color id=issue-010 color=orange`; history `reopened`.
10. **One at a time with the menu**: with the panel open, pinch on `ui:menu-button-right`: `issues panel closed via=menu`, `menu opened hand=right mode=pinned`; then again `ui:issue-button-right`: `menu closed …` and panel open; `ecs_find_entities` `^ui:palm-menu$` (→ 1 in every reading, never 2 panels together).
11. Unfiltered log (`error`, `reading 'add'`, `Cannot read`, `Missing glyph`); screenshot of the final list → attach; cleanup.

## Checks (all mandatory)
1. **Steps 1–2**: `issue created id=issue-014`; the panel opens and closes 3 times without `error` or `reading 'add'`; the `home` screens show the exact controls and texts; `ui:issue-open-list` has the label `Issues (4)` (three of the seed + `issue-014`; the report does not count).
2. **Step 3**: `role changed from=tenant to=landlord source=ui`; line `issues screen=list page=1/1 items=issue-014,issue-013,issue-012,issue-010` (**exact order**: active by urgency `014 medium open`, `013 medium in_progress`, `012 low open`, then `010 resolved`); the header contains `Sample data`; all rows ≥ 2.4 cm and the panel in the cone (line `menu view` or `issues panel view maxAngleDeg` ≤ 30.0, distance 0.50–0.65 m).
3. **Step 4**: `issues screen=detail id=issue-014` after the first (and only) pinch on the row, **without** any `issues row selected` line; status `Open`, urgency `Medium`, category `Appliances`, room `Bathroom` (English names from the data); **a single** action control (`take-on`); after the pinch `issue transition id=issue-014 from=open to=in_progress by=landlord event=in_progress`, `pin color id=issue-014 color=orange`, `issue history id=issue-014 events=created@2026-11-04T10:00:00.000Z/tenant,in_progress@2026-11-04T10:01:00.000Z/landlord`; the only control now is `resolved`.
4. **Step 5**: `issue transition … from=in_progress to=resolved by=landlord event=resolved`, `pin color … color=green`, `…resolved@2026-11-04T10:02:00.000Z/landlord`; **0** action controls for the landlord on a `resolved` issue.
5. **Step 6**: the landlord has no actions on `issue-010` (0 controls); the detail of a seed entry shows `Sample data`, that of `issue-014` does not.
6. **Step 7**: tenant list `items=issue-013,issue-012,issue-014,issue-010` (active by urgency `013`, `012`; then `resolved` by urgency `014` medium, `010` low); the tenant has no actions on an `open` issue.
7. **Step 8**: `^ui:issue-action-` = `confirm` and `reopen`; after `confirm`: `issue transition id=issue-014 from=resolved to=archived by=tenant event=archived`; **3** `pin:*` (010, 012, 013), `pin:issue-014` absent; list `items=issue-013,issue-012,issue-010,issue-014` with `History` above `issue-014`; history of **4** entries (`created`, `in_progress`, `resolved`, `archived` with `at` 10:00, 10:01, 10:02, 10:03).
8. **Step 9**: `reopened` with `by=tenant`, `pin color id=issue-010 color=orange`, `…reopened@2026-11-04T10:04:00.000Z/tenant`.
9. **Step 10**: never two `ui:palm-menu`/`ui:issue-panel` together; lines `issues panel closed via=menu`, `menu closed`.
10. **One hand**: no `pinch left` or `menu opened hand=left` line in the whole scenario.
11. No `error` entries; no `Missing glyph`; no `reading 'add'`.
12. Forbidden transitions (for example `open → resolved`, or `confirm` by the landlord) are covered by the unit tests `tests/unit/issue-state.test.ts` and `permissions.test.ts` (4 roles × 4 actions × 4 states): the report cites them; in the interface the control does not exist, so it cannot be pressed.
13. **Headset only** (high): readability and selection of the rows and buttons at 0.55 m; the two "Issues"/"Menu" buttons are not confused with real fingers.

## Outcome
PASS if checks 1–12 are met · FAIL otherwise (the list order, an action control that should not exist or an `error` are FAIL).

## To defer to the headset
"Issues buttons" and "Issues panel" entries of M4 in `qa/device/DEBT.md`.
