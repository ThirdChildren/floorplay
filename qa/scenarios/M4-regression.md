# S4.9 · Quick regression of M1, M2 and M3 after M4

> **Changelog 2026-11-02**: scenario created from the M4 plan. It uses the existing scenarios **with the starting points corrected on 2026-11-02** (S1.2, S2.6, S2.9, S3.0, S3.2, S3.3; see the changelog line at the top of each) and `pinch=grip`.

**Milestone**: M4 · **Type**: PC (IWER emulator via MCP `iwsdk-runtime`) · **`CLAUDE.md` rules**: 1, 3, 4, 8, 9
It introduces no new criteria: it repeats the listed scenarios and confirms that **their criteria have not changed** (except for the expected differences below). Prerequisite: all the M4 tasks. Conventions: `qa/scenarios/M3-persistence.md` and `qa/scenarios/M4-issue-create.md` (poses, `D_GRIP`, long pinch, clock).

## Execution
- Role `visitor` (default) and `pinch=grip`, unless indicated. Each scenario with its own parameter file (always with `reset=1`, already verified in the sheets). Rule for the report: one line per scenario (PASS / PASS with warnings / FAIL), the cause of the warnings and the screenshots cited by the original scenarios.
- Order (cheapest first): S2.1 → S2.2 → S2.5 → S2.3 → S2.4 → S2.7 → S2.6 → S2.9 → S1.2 → S1.3 → S1.6 → S3.7 → S3.8 → S3.0 → S3.1 → S3.2 → S3.3 → S3.4 → S3.5 → S3.9 (with `qa/scenarios/M4-budget.md`). S1.1, S1.4 and S1.5 (house B and error panel) are read from the logs of S2.8/S4.10 and from a single load of B; S2.0 (glyphs) is in the round of the labels.
- **`pinch=auto` round** (reduced, pinch point from the joints, `xr_select` ≥ 0.4 s): S2.1, S2.2, S2.5, S3.6 (`qa/scenarios/M3-joints.md`): same outcomes.
- **Role `tenant` and `landlord`** (reduced): S2.2 (bed placement), S3.3 and S3.7 with `role=tenant`: the M2/M3 flows do not change with the role; the palm menu has the same tabs.

## Expected differences compared with M3 (warnings or new facts, **not** FAIL)
- 4 buttons instead of 2 (`ui:menu-button-left/-right` and `ui:issue-button-left/-right`); `^ui:menu-button-` stays 2; `^ui:(menu|issue)-button-` is 4; calls per view are +2 (S4.10).
- 4 new `fixture:*` entities (`^fixture:`): the prefix counts of S1.1 do not include them (`^house:`, `^room:`, `^wall:`, `^door:`, `^window:`).
- `state saved key=… pieces=N bytes=N reason=debounce` now ends with ` issues=<n> role=<role> parked=<n>`: an end-of-line comparison with `$` is no longer valid; use the prefix.
- The `[soglia:state]` lines carry the issues in compact form (`issues:[…]`) and the `role` field.
- `menu pinned pitchDeg=… anchorPitchDeg=…` after every opening of the `pinned` menu (S3.7, S3.8).
- Hallway label (S1.3): now readable, line `room label layer markers=…`.
- `viewpoint confirm start/cancelled` (only if T4.R6 is done): in S3.1 and S3.2 the pinch on the marker must be **held ≥ 0.6 s** (`xr_set_select_value` 1, wait 0.8 s, 0) instead of `xr_select 0.3`; see the note at the top of `qa/scenarios/M3-viewpoint.md`. With the fallback only (radius 0.025 m) the pinches at 0.02 m from the marker (old zoom recipe) **no longer** enter the viewpoint.
- At real scale (S3.1, S3.5 real part) `ui:tabletop-button` appears and the "Menu"/"Issues" buttons are not there.
- Own pieces not lost if `my-furniture.json` is missing (S3.0 does not test it by itself: S4.4 phase 6 does).
- With a role other than `tenant` the long pinch does nothing (`issue denied …`): in the M2/M3 scenarios with `visitor` it produces no issues.

## Checks
1. For each listed scenario, all its mandatory checks are met (with the corrected points); no new `error`, `Missing glyph`, `reading 'add'`, `budget exceeded`.
2. The expected differences are reported as such in the report, once, at the top.
3. The `pinch=auto` round and the `tenant`/`landlord` rounds give the same outcomes (or differences explained by the joint constants, `qa/…/reference_m3_hand_constants`).
4. S3.9 and S4.10 are run only once (with the single "forecast against measurement" table).
5. The entries left open (W4, headset-only tests) are not reopened: the report lists them as in `qa/device/DEBT.md`.

## Outcome
PASS if checks 1–4 are met · FAIL otherwise. If a scenario fails because of a **starting point** that is not free, the point is adjusted in the scenario (a single update, changelog line) without changing the criterion, as for the M3 carry-overs.

## To defer to the headset
No new entry beyond those of the listed scenarios.
