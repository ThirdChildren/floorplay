# S5.8 · Carryovers from the M4 gate (Block R)

> **Changelog 2026-11-06**: scenario created from the M5 plan (D63; T5.R1–T5.R6). The corrections to the existing scenarios (carryover 6) are not part of this scenario: they are applied in the files concerned (see the plan, "Carryovers: corrections to the scenarios").
> **Changelog 2026-11-06 (gate A/B)**: S5.8 was PASS (R1–R6). Adjustments: (1) **R2 step 2**: `state saved … parked=1` does not appear with the reload alone: it is read **after the first change of state** (for example a role change from the panel: `state saved … pieces=0 … role=visitor parked=1`); (2) **R2 step 3**: the line `state restored pieces=1 key=…` does **not** report `parked=0` (the field appears only if > 0): `parked=0` is read from the next save; `historyLength` stays 0 (the history is that of the session without a catalog); (3) **R5**: the row to pinch depends on the list order: if `issue-014` is already `Resolved` the order is `013, 012, 014, 010` and `issue-013` is `ui:issue-row-0` (otherwise `row-1`): read `items=` and choose the row of `issue-013` from there; (4) the managed browser profiles **persist between `dev up`s**: a start may find an already saved state (`access text=large source=saved`): `reset=1` at the beginning of each scenario is mandatory.
> **Changelog 2026-11-06 (deviations of Block R closed by `xr-engineer`)**: (R2) in the session without a catalog the undo history is emptied; (R3) with the Agent chip hidden the grid has `Visitor` at the top left and `Tenant`/`Landlord` below, positions unchanged; (R4) two-line rows, 4 per page (`ui:issue-row-0…3`), truncation with ASCII `...` (the Inter atlas has no U+2026), 0.5 cm margin only on the detail head (status and urgency); (R5) the move-in report also opens with a single pinch and the log `issues row selected` no longer exists; (R6) `glyphs=1` requires `debug=1`.

**Milestone**: M5 · **Type**: PC (IWER emulator via MCP `iwsdk-runtime` and `npm test`) · **`CLAUDE.md` rules**: 4 (pause and resume), 7, 9 · See `docs/plans/M5.md`, D63. Conventions: `qa/scenarios/M4-issue-create.md`.

## Part R1 · the role comes from the store
**Steps**: `npm test -- state issue-state permissions` (or the equivalent files); `grep` (the repository search tool) of `transitionIssue(` in `src/`: no call passes a role. Runtime with `role=landlord&reset=1&seed=1&debug=1&pinch=grip&time=2026-11-04T10:00`: "Take on" on `issue-014` (create it first as tenant as in S4.3 step 1), then "Resolved"; log `pattern: "issue transition"`.
**Checks**: the signature of `transitionIssue` has no `role` parameter (the compiler enforces it: `npm run typecheck` ok); the tests cover all the role × action pairs; the lines `issue transition id=… by=landlord` coincide with the current role of the store, never with another.

## Part R2 · persistence even without a catalog
**Preconditions**: `house=apartment-a&role=tenant&reset=1&seed=1&debug=1&pinch=grip&time=2026-11-04T10:00`.
**Steps**: (1) standard setup; place `chair` in the living room at `W(1.5; 3.0)` and create an issue from the washing machine (S4.1 steps 2–4); wait 1.5 s (`state saved`). (2) Rewrite the file **without** `reset=1` and **without** `role=` but with `failcatalog=1`; reload: log `pattern: "state restored|parked|role|issues|catalog"`; `ecs_find_entities` `^pin:`, `^furniture:`. (3) Place nothing; reload **without** `failcatalog`: log; `^furniture:`, `^pin:`.
**Checks**: at step 2 `state restored pieces=0 parked=1 catalog=missing key=…`, `role set tenant source=saved`, the 4 `pin:issue-*` are there, 0 `furniture:*`; `state saved … parked=1` (the piece is not lost on the next save); at step 3 `furniture:chair#1` reappears and `parked=0`; **in the session without a catalog the undo history is empty** (`[soglia:state]` has `historyLength` 0); on the reload of step 3 the history stays the one saved by the session without a catalog (empty: Undo does not restore the placement of the `chair`, which stays in the store); `failcatalog=1` without `debug=1` is ignored with `param failcatalog ignored: needs debug=1` (warn); no `error`.

## Part R3 · the "Agent" chip does not promise
**Steps**: `grep` of `coming soon` and `Info points for agents` in `src/`; open the Issues panel and `ui_inspect` (**4 chips** since the M5 gate, T5.10 is delivered: `Visitor`, `Agent`, `Tenant`, `Landlord`) with `ecs_query_entity` `["Transform"]` on the `ui:issue-role-*`. (The historical check with 3 chips held only between T5.R3 and T5.10 and cannot be rerun at the gate: it is read from the commit.)
**Checks**: no text `coming soon` or `Info points for agents` in any screen; **4** chips, each with a function (`ui:issue-role-agent` opens `Furnish`/`Clear`, S5.3); `strings.issues.comingSoon` no longer exists. (Chronicle: between T5.R3 and T5.10 the chip was hidden and the grid had `Visitor` at the top left and `Tenant`/`Landlord` below, in the same positions as M4.)

## Part R4 · accessible list
**Steps**: role `landlord`, Issues panel → `Issues (4)` (S4.3 step 2): `ui_inspect` of the rows; the detail of `issue-013`: `ui_inspect`; move-in report (S4.5): color of the pin.
**Checks**: each row is on **two lines**: above dot + **status word** (`Open`, `Progress`, `Resolved`, `Archived`) + urgency, below the text up to **22 characters** (21–22 with the dots, **even in the middle of a word**: `Scratch on the par...`, `A tile came loose n...`; F-C2-4), truncated with three ASCII dots `...` (not `…`: the Inter atlas has no U+2026); the rows are **4 per page**: `ecs_find_entities` `^ui:issue-row-` → `ui:issue-row-0…3`, **no** `ui:issue-row-4`; with the seed + `issue-014` the list is `page=1/1` with 4 rows; no row leaves its column; in the detail the **head** (status and urgency, for example `Medium`) has a margin ≥ 0.5 cm from the panel edge (the margin does not apply to the other rows of the detail); the move-in report pin is `color=violet` (`pin color id=baseline-001 color=violet`), distinct from the blue of the pillars (`viewpoint:*`) in the screenshot; the `issue-list` test fixes the rule.

## Part R5 · a single pinch opens the detail
**Steps**: role `landlord`, panel → list; pinch **once** on `ui:issue-row-1`; log `pattern: "issues"`. Then `ui:issue-back`, `ui:issue-back` (home), `ui:issue-open-movein` and **a single** pinch on `ui:issue-row-0` of the move-in report.
**Checks**: `issues screen=detail id=issue-013` after the **first** pinch (no intermediate selection-only line and **no** `issues row selected` line: that log no longer exists); the pin of `issue-013` is highlighted in the detail; `Back` goes back to the list; the move-in report also opens with a single pinch (`issues screen=detail id=baseline-001`).

## Part R6 · logs and cleanup
**Steps**: `grep` of `console.error` in `src/index.ts`; reload with `glyphs=1` **without** `debug=1`; `xr_end_session`; unfiltered log.
**Checks**: no `console.error` outside a final `catch` block with a prefix (`[soglia] …`); `glyphs=1` without `debug=1` produces `param glyphs ignored: needs debug=1` (warn) and no `ui:glyph-test` panel (with `debug=1&glyphs=1`, as in S2.0, the panel is there); after `xr_end_session` the only expected `warn`-level line is `THREE.WebGLRenderer: Can't change size while VR device is presenting.` (M5 log contract); no other `warn` or `error`.

## Outcome
PASS if all the parts R1–R6 are met · FAIL otherwise (each part is blocking: they are prerequisites).

## To defer to the headset
No new entry (carryover 10, full confirmation of the viewpoint and W4, stays in `DEBT.md` as in M4).
