# S3.5 · Wheelchair and stroller

> **REMOVED 2026-11-14 (UI fixes, `qa/reports/UI-FIX-2026-11-14.md`)**: the FitCheck (door-fit label, door markers, `fit` menu tab and the `fit ...` log lines) no longer exists. This scenario is kept as history and is not run any more.

> **Changelog 2026-11-06** (user decision on carry-over 6 of the M4 gate; M5 plan): step 3: the stroller is no longer placed at +0.06 m from the chair (point not free): before step 3 the wheelchair is removed with Undo (`ui:menu-undo`, `furniture:wheelchair#1` disappears) and the stroller goes on the original point `P_BATH`. No criterion changes.

**Milestone**: M3 · **Type**: PC (IWER emulator via MCP `iwsdk-runtime`) · **`CLAUDE.md` rule**: 9 (accessibility)
Implementation prerequisites: T3.5 (`fit` tab), T3.7, T3.8, T3.9. See `docs/plans/M3.md`, D34. Common conventions (poses, `D_GRIP`, `Q_UP`, gate rule): `qa/scenarios/M3-persistence.md`; grab sequences and readings: `qa/scenarios/M3-fit-sofa-a.md`.

## Preconditions
- House A: `dev-params.local.txt` = `house=apartment-a&role=visitor&reset=1&seed=1&debug=1&pinch=grip`; standard setup; head at (0; 1.6; 0), `O` = (0; 1.35; −0.45), scale 0.05.
- Data (D34, `public/catalog/catalog.json`, `kind: mobility`, no model: block fallback): `wheelchair` width 0.70 → required 0.70 + 2 × 0.05 = **0.80 m** (no centimeter of tolerance, only 1e-9); `stroller` width 0.60 → **0.70 m**. Doors of A: `d-entrance` 0.90, `d-living` 0.80, `d-bedroom` 0.80, `d-study` 0.80, `d-bathroom` 0.75; B: all 0.90 except `d-bathroom` 0.80.
- Points A (y = 1.39): `P_BATH` = W(1.3; 5.9) = (−0.210; 1.39; −0.335) (bathroom); `P_LIV` = W(2.0; 1.5) = (−0.175; 1.39; −0.555); `P_STUDY` = W(9.7; 2.3) = (0.210; 1.39; −0.515). Point B: `P_BATH_B` = W_B(1.3; 5.5) = (−0.135; 1.39; −0.3475) (center of B (4.0; 3.45), see S3.4).
- Menu: `fit` tab (pinch on `ui:menu-tab-fit`).

## Steps
1. **"fit" tab**: menu open, pinch on `ui:menu-tab-fit`; `ecs_find_entities` with `^ui:menu-item-`; log `pattern: "menu"`. Verify that the `items` tab still has 14 items in 3 pages (`ui:menu-tab-items`).
2. **Wheelchair toward the bathroom of A (S3.5 of the ROADMAP)**: grab `ui:menu-item-wheelchair`, carry to `P_BATH − D_GRIP`, wait 0.6 s, without releasing. Readings: log `pattern: "fit|furniture"`; `ecs_find_entities` with `^ui:fit-`; `FitMarker` of each marker; `Furniture` of the piece; `ui_inspect` on `ui:fit-label`; `browser_screenshot` → attach. Release in the bathroom (`furniture placed … room=bathroom`), then `ecs_find_entities` with `^furniture:`.
3. **Stroller toward the same bathroom**: first undo the wheelchair placement (menu open, pinch on `ui:menu-undo`; `ecs_find_entities` `^furniture:` → 0), then the "fit" tab, grab `ui:menu-item-stroller`, carry to `P_BATH − D_GRIP` (same point, no shift: the bathroom is free), wait 0.6 s, without releasing: log `pattern: "fit"`, label, markers. Release outside the house (POUT1 = (0.463; 1.393; −0.487)).
4. **Wheelchair toward the living room and the study (exact edge)**: grab `wheelchair` again, `P_LIV − D_GRIP`, wait 0.6 s: log; then (same grab) `xr_animate_to` to `P_STUDY − D_GRIP`, wait 0.6 s: log. Release outside.
5. **House B**: rewrite `dev-params.local.txt` with `house=apartment-b`, reload, accept, hands; grab `wheelchair`, `P_BATH_B − D_GRIP`, wait 0.6 s: log, label; release outside.
6. **Normal pieces**: go back to A (file with `house=apartment-a`, `reset=1`), place `wheelchair` in the bathroom and `stroller` in the living room: `ecs_find_entities` with `^furniture:` (ids `furniture:wheelchair#1`, `furniture:stroller#1`); collision test: bring the wheelchair over the stroller already placed → line `furniture status … reasons=overlaps-furniture with=furniture:stroller#1` (the seats follow the pieces rule, D34).
7. Unfiltered log (`error`, `Missing glyph`); cleanup as in S3.0.

## Checks (all mandatory)
1. **Step 1**: `menu tab fit` and `menu page 1/1 tab=fit items=wheelchair,stroller`; **2** entities `ui:menu-item-wheelchair` and `ui:menu-item-stroller`; the `items` tab keeps 14 items (`menu page 1/3 …` as in S2.1).
2. **Step 2**: `[soglia] fit furniture:wheelchair#1 room=bathroom status=blocked door=door:d-bathroom reason=door-too-narrow route=door:d-entrance,door:d-bathroom` and `fit label shown furniture:wheelchair#1 "Won't fit: the door is 75 cm wide, the wheelchair needs 80 cm"` (exact text); second line `Simplified check`; marker `ui:fit-marker-d-bathroom` `block`, `ui:fit-marker-d-entrance` `pass`; label at 0.52-0.80 m from the head, within 30°, yaw-only, text ≥ 2.4 cm. The piece is a normal piece: after release `furniture placed furniture:wheelchair#1 room=bathroom … status=valid`.
3. **Step 3**: `fit furniture:stroller#1 room=bathroom status=fits route=door:d-entrance,door:d-bathroom` and `Fits: the narrowest door on the way is 75 cm wide` (0.60 + 0.10 = 0.70 ≤ 0.75).
4. **Step 4 (exact edge)**: the wheelchair toward the living room and toward the study gives `status=fits` with `Fits: the narrowest door on the way is 80 cm wide` (0.70 + 0.10 = 0.80 ≤ 0.80 with numeric tolerance; **not** a 1 cm tolerance: that applies only to furniture, and the unit test `fit-check.test.ts` verifies 0.79 → blocks).
5. **Step 5 (B)**: `fit furniture:wheelchair#… room=bathroom status=fits` with `Fits: the narrowest door on the way is 80 cm wide` (`d-bathroom` of B is 0.80).
6. **Step 6**: `furniture:wheelchair#1` and `furniture:stroller#1` present; the overlap produces `overlaps-furniture` with the reason label "Overlaps the stroller" (D27) **in addition** to the FitCheck one (it does not hide it): the two labels coexist (`ui:reason-wheelchair#…` and `ui:fit-label`), at ≥ 0.52 m and within 30°.
7. No `fit` line with `blocks-door`; no `error` entries; no `Missing glyph info`.
8. Screenshot of step 2 attached and described in words.
9. **Headset only**: the wheelchair and the stroller are blocks (no verified CC0 model): recognizable by name and message, not by shape (M3 entry in `qa/device/DEBT.md`, medium priority).

## Outcome
PASS if checks 1-8 are met · FAIL otherwise.

## To defer to the headset
As S3.3; in addition, the readability of the wheelchair block at 1:20 and whether a model is needed (user decision, no non-CC0 assets).

## Changelog
- 2026-10-09: scenario created from the M3 plan (D34).
