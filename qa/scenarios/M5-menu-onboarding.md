# S5.7 · Onboarding of the "Menu" button (two-step coach)

> **Changelog 2026-11-06**: scenario created from the M5 plan (D60; T5.15). It completes the menu onboarding deferred from M2/T2.16 (the hint `Palm up for the menu` stays).

> **Changelog 2026-11-06 (outcomes of T5.11 and T5.15)**: (1) `prefs.coach` is saved; an **old save without `coach`** starts from `done` if there are pieces, from `grab` if the menu has already been opened, otherwise from `menu-button`; (2) two steps (D60) with a **20 s timeout per step**; log `coach step=menu-button reason=start` → `coach step=grab reason=menu-opened` → `coach step=done reason=placed`, **0** `ui:coach-*` entities at the end; on reload `coach step=done reason=saved`; (3) step 1: text **below** the button, 10 cm from it (≤ 0.15 m) and at **38°** from the view center; step 2: above the menu; (4) the coach **waits** if the Issues panel or the View panel is open; (5) measurements: cold with the coach **57** calls per view, menu open with the `grab` coach **62**; (6) the fixed buttons are ×1.25 in width with large text: the distance from the button is read from the `Transform`.

> **Changelog 2026-11-06 (gate A/B and fix W1)**: check 9 was the only one not met at gate A/B (the 20 s timeout also ran with View or Issues open and the coach did not come back). **Fixed**: the timeout now **pauses** with the View or Issues panel open and the coach **reappears on closing in the same step**; **a piece in hand hides the coach but does not stop the timer** (if a piece is held beyond 20 s from the first moment the step was visible, `coach step=done reason=timeout` fires). In the gate the sequences must be run **in a single block of commands** (the CLI costs ≈ 1 s per call and the coach lasts 20 s per step): for step 9 open the panel within a few seconds of the start of the coach (in the gate: +2.8 s). Budget (check 11): at gate A/B, **before T5.RA**, K16 = 73 (14 pieces, hint, room label and coach) and 78 (menu open and `grab` coach); after T5.RA (−16 calls) expected ≈ 57 and ≈ 62; the threshold ≤ 75 holds for the **rerun**. The other results (checks 1–8 and 10) were PASS: step 1 at 0.096 m from the button and 36.8° from the center; timeout 20.06 s with the sequence `start` → `done reason=timeout` (no `grab` step in between).

**Milestone**: M5 · **Type**: PC (IWER emulator via MCP `iwsdk-runtime`) · **`CLAUDE.md` rules**: 1, 8, 9 · See `docs/plans/M5.md`, D60. Conventions: `qa/scenarios/M4-issue-create.md`, M1 onboarding: `qa/scenarios/M1-onboarding.md`.

## Preconditions
- `dev-params.local.txt` = `house=apartment-a&role=visitor&reset=1&seed=1&debug=1&pinch=grip&time=2026-12-21T10:00`. Clean state (`reset=1`): `onboardingStep=pinch`, `menuOpened=false`, `coach` at the initial value.

## Steps
1. **Before the coach**: standard setup; `ecs_find_entities` `^ui:coach-` (→ 0); log `pattern: "coach|onboarding"`.
2. **Close the M1 onboarding**: short pinch on a room (as in S1.6): log `pattern: "onboarding|coach"`; wait 1.5 s; `ecs_find_entities` `^ui:coach-` (→ `ui:coach-menu-button`, 1) and `^ui:menu-hint$`; `ecs_query_entity` on `ui:coach-menu-button` and `ui:menu-button-right` with `["Transform"]`; `ui_inspect` (text `Pinch Menu`, `fontSize` ≥ 2.4 cm); `browser_screenshot` → attach (the ghost hand on the button).
3. **Coach step 2**: pinch on `ui:menu-button-right`; log `pattern: "coach|menu opened"`; `ecs_find_entities` `^ui:coach-` (→ `ui:coach-grab`); `ui_inspect` (text `Drop it in the house`); `browser_screenshot` → attach.
4. **End of the coach**: take `ui:menu-item-chair` and place it in the living room at `W(1.5; 3.0)`: log `pattern: "coach|furniture placed"`; `ecs_find_entities` `^ui:coach-` (→ 0).
5. **Persistence**: wait 1.5 s, reload without `reset=1`: log `pattern: "coach"` (→ no coach); then with `reset=1` repeat steps 1–2 (the coach comes back).
6. **Palm route**: with `reset=1`, close the M1 onboarding, then open the menu with the **palm up** (`hand-left` at `L_MENU`, `Q_UP`, wait 0.9 s): `coach step=grab reason=menu-opened` (step 1 is skipped); close (palm down).
7. **Timeout**: with `reset=1`, close the M1 onboarding and **do not** touch anything for 45 s: `coach step=done reason=timeout` (20 s timeout per step); no `ui:coach-*`.
8. **With a piece in hand it is not there**: during coach step 2, hold a piece in hand: the coach text disappears on grabbing or does not overlap the hand (no label closer than 0.50 m).
9. **Waiting coach**: with `reset=1` and the M1 onboarding closed, open the View panel straight away (within ≈ 3 s of the start of the coach, in a single block of commands) (`ui:view-button-right`) and close it again after 25 s (the coach must still be there, in the same step); then the same with the Issues panel (`ui:issue-button-right`).
10. Unfiltered log; cleanup.

## Checks (all mandatory)
1. **Step 1**: 0 `ui:coach-*` during the M1 onboarding (they do not overlap).
2. **Step 2**: `coach step=menu-button reason=start`; 1 `ui:coach-menu-button` **below** the button, at ≤ 0.15 m from `ui:menu-button-right` (expected 0.10 m) and at 0.50–0.80 m from the head, at about 38° from the view center (≤ 45°, fallback entry); text `Pinch Menu` (no Italian text); `ui:menu-hint` may coexist but must not overlap (distance ≥ 0.05 m).
3. **Step 3**: `menu opened hand=right mode=pinned` and `coach step=grab reason=menu-opened`; 1 `ui:coach-grab`, 0 `ui:coach-menu-button`.
4. **Step 4**: `coach step=done reason=placed`; 0 `ui:coach-*`.
5. **Step 5**: after the reload `coach step=done reason=saved` (or no `coach` line and 0 entities); with `reset=1` the coach restarts from `menu-button`.
6. **Step 6**: `coach step=grab reason=menu-opened` (start from `grab` for those who have already opened the menu).
7. **Step 7**: the timeout is 20 s **per step**: within 45 s of the start of the coach, `coach step=done reason=timeout` (if after the first timeout it moves to the `grab` step instead of closing, report the exact sequence of the `coach step=…` lines); at the end 0 `ui:coach-*`.
8. **Step 8**: no overlap with the hand or with the piece; no coach pinch claims the hand (the coach is not interactive).
9. **Step 9 (waiting coach)**: with the View (or Issues) panel open for 25 s, the coach **waits**: no `coach step=done reason=timeout` line and the 20 s timeout does not run; once the panel is closed, the `menu-button` step resumes **in the same step** (the entity `ui:coach-menu-button` becomes visible again) and the time spent with the panel open does not count; the same with the Issues panel. With a **piece in hand** the coach is hidden but the timer **continues**: holding it beyond 20 s from the first visible moment leads to `coach step=done reason=timeout`.
10. **Old save**: the three cases of resuming from a save without `coach` (with pieces → `done`; menu already opened and no pieces → `grab`; neither → `menu-button`) are covered by the unit tests: the report cites them; on the runtime only the case "no pieces, menu never opened" is tried, with `reset=1`.
11. **Budget**: the cold peak of calls (hint + coach) ≤ 75 and with the menu open and the `grab` coach ≤ 75 (**after T5.RA**; at gate A/B, before T5.RA, they were 73 and 78: 78 over the threshold), and it returns to steady state within 3 s after the end of the coach (table of S5.9, case K16).
12. No `error` entry; no `Missing glyph`; no `reading 'add'`.
13. **Headset only** (medium): the ghost hand is understood without explanations, the 20 s timeout is neither too long nor too short.

## Outcome
PASS if checks 1–12 are met (13 is headset only) · FAIL otherwise.

## To defer to the headset
Entry "Menu button coach" of M5.
