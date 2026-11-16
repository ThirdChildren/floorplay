# S4.8 · Label above the pillars, minimum height, viewpoint confirmation

> **Changelog 2026-11-02**: scenario created from the M4 plan (D49 R3 and R4, T4.R5, T4.R6; carry-overs 3, 4 and 6 of the M3 gate: `qa/reports/M3-gate-C2-S1.3-label-hall.png`, `DEBT.md` entries "Pinch near a marker" and "Room label").

**Milestone**: M4 · **Type**: PC (IWER emulator via MCP `iwsdk-runtime`) · **`CLAUDE.md` rules**: 8, 9
Implementation prerequisites: parts A and B: T4.R5; part C: T4.R6 (or its fallback, see part C). Conventions: `qa/scenarios/M4-issue-create.md`.

## Preconditions
- `dev-params.local.txt` = `house=apartment-a&role=visitor&reset=1&seed=1&debug=1&pinch=grip`; standard setup (head (0; 1.6; 0), `O` = (0; 1.35; −0.45)).
- Markers `viewpoint:V1/V2/V3` at (−0.130; 1.4375; −0.465), (0.065; 1.4375; −0.470), (0.215; 1.4375; −0.535) (read them with `ecs_query_entity` `["Transform"]`).
- Hallway (`hall`, 8.4 × 1.6 m = 13.4 m²): plan center (6.8; 5.4) → world (0.065; 1.39; −0.36) → hand at (0.103; 1.393; −0.397). Living room: point (1.5; 1.5) → (−0.200; 1.39; −0.255) with the miniature moved by +0.30 in z (see part B).

## Part A · the hallway label is not covered by the pillar (T4.R5)
1. Short pinch (0.3 s) on the hallway; wait 1 s. Log `pattern: "room|label"`; `ecs_find_entities` `^ui:room-label` (→ 1); `ecs_query_entity` on its `Transform`; `browser_screenshot` with the head looking at the hallway (`xr_look_at` `headset` toward (0.02; 1.40; −0.49)) → attach; `ui_inspect` on the label (text).
2. Short pinch on the living room (same way): living room label unchanged compared with S1.3.

**Checks A**: `room selected hall area=13.4` and `label shown "Hallway · 13.4 m²"` (exact text, with `·` and `²`); line `room label layer markers=below` (the label is drawn above the markers) **or** `room label layer markers=hidden` (fallback: the nearby marker is hidden while the label is there); in the screenshot the **digits `1`, `3`, `.`, `4` are all readable** (before: `Hallway · 13_ m²`, one digit covered by `viewpoint:V2`): the report describes the text read in words. The living room label stays `Living room & kitchen · 23.9 m²` (S1.3 PASS).

## Part B · label never below the plane (T4.R5, carry-over 6)
1. Move the miniature toward the head by 0.30 m with the right hand only (pan on the free base, as S2.9 step 1): `hand-right` at (0.388; 1.383; −0.487), select 1, wait 0.3 s, `xr_animate_to` to (0.388; 1.383; −0.187) in 0.8 s, select 0. Readings: `miniature translated x=0.000 z=0.300 source=pan`; `miniature:root` at (0; 1.35; −0.15).
2. Short pinch on the living room at the point (1.5; 1.5): hand at (−0.162; 1.393; −0.292). Log `pattern: "room|label"`; `ecs_find_entities` `^ui:room-label`; `ecs_query_entity` on the `Transform` (→ `L`); `browser_screenshot` → attach. Distance of `L` from the head.
3. Optional: the same with the study and the bathroom.

**Checks B**: `room selected living area=23.9`; `L.y` **≥ 1.44** (= plane height 1.35 + wall 0.05 + 0.047, tolerance 0.005; in M3 it could be 17 cm below the plane); distance of `L` from the head **≥ 0.52 m**; the text is readable in the screenshot; no label below the plane in any of the rooms tried. Without displacement (part A) the heights do not change compared with M3 (no regression).

## Part C · a pinch near a marker does not enter by mistake (T4.R6)
Bring the miniature back to the center (menu → `ui:menu-recenter`, or reload with `reset=1`). All tests with the **right** hand, except C4.
- **C1 · still, held pinch → enters**: hand at (−0.092; 1.4405; −0.502) (pinch on V1), `xr_set_select_value` 1, wait 1 s, 0. Log `pattern: "viewpoint|miniature"`. Return with the "Tabletop" button (S4.6).
- **C2 · short tap → does not enter**: same pose, `xr_select {duration: 0.1}` (if the tool rounds, use the minimum duration and report it); wait 1.5 s.
- **C3 · moving hand → does not enter**: same pose, select 1, wait 0.1 s, `xr_animate_to` to (−0.052; 1.4405; −0.502) (+0.04 m in x) in 0.2 s, wait 1 s, select 0.
- **C4 · two-hand zoom near a marker → the zoom starts**: the **right** pinches first at (0.188; 1.453; −0.487) (outside the markers, select 1), then the **left** at (−0.112; 1.453; −0.487) (at 0.02 m from V1: the earlier M2/S1.2 recipe), `xr_set_select_value` 1, wait 0.5 s, spread by 0.2 m (`xr_animate_to` to (−0.312; …) and (0.388; …)), select 0/0.
- **C5 · corrected zoom recipe of S1.2** (hands ∓0.20): zoom as S1.2 phase A: no viewpoint confirmation.

**Checks C (variant with T4.R6)**: C1: `viewpoint confirm start id=V1` followed (≥ 0.3 s later) by `viewpoint transition start id=V1 from=tabletop` and `viewpoint entered id=V1 …`; C2: `viewpoint confirm start id=V1` and `viewpoint confirm cancelled reason=released`, **no** `viewpoint transition` line, `miniature:root` unchanged, no `room selected`; C3: `confirm cancelled reason=moved`, no transition, no `pan start` (the hand is over the rooms); C4: **no** `viewpoint confirm start` line for the left, `miniature gesture start` and `miniature gesture end scale=… yawDeg=…` with the scale grown (the case in which the left pinches first is in the unit tests of `viewpoint-confirm`, because with MCP latency the two hands do not pinch within 0.3 s of each other: the report declares it); C5: `miniature gesture start`, no `viewpoint confirm`.
**Checks C (fallback variant: radius 0.025 m only, T4.R6 not done)**: pinch at 0.025 m from V1 (C4 and C5 without the first hand) does **not** enter; pinch at 0.01 m enters immediately; C2 enters (a short tap at 0.01 m is an entry): the report says which variant is in use and the `DEBT.md` entry "Pinch near a marker" stays open.

## Part D · regression
S1.3 (living room and study), S3.1 (entry/exit with button), S1.2 with the corrected recipe: no difference in criteria.

## General checks
No `error` entries; no `Missing glyph`; no `NaN`. Expected differences compared with M3 (not FAIL): new lines `room label layer …` and `viewpoint confirm …`.

## Outcome
PASS if checks A, B, C (in the variant in use) and general are met · FAIL otherwise. A label with a covered digit is FAIL (readability is the reason for the carry-over).

## To defer to the headset
Labels in front of the pillars with the real head; accidental entries and frustration with the 0.30 s confirmation (M4 entries in `qa/device/DEBT.md`).
