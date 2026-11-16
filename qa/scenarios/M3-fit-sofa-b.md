# S3.4 · The same sofa fits through in house B

> **REMOVED 2026-11-14 (UI fixes, `qa/reports/UI-FIX-2026-11-14.md`)**: the FitCheck (door-fit label, door markers, `fit` menu tab and the `fit ...` log lines) no longer exists. This scenario is kept as history and is not run any more.

**Milestone**: M3 · **Type**: PC (IWER emulator via MCP `iwsdk-runtime`)
Implementation prerequisites: the same as S3.3 (T3.5, T3.7, T3.8, T3.9). See `docs/plans/M3.md`, D34. Common conventions (poses, `D_GRIP`, `Q_UP`, gate rule): `qa/scenarios/M3-persistence.md`; grab sequences and readings: `qa/scenarios/M3-fit-sofa-a.md`.

## Preconditions
- `dev-params.local.txt` = `house=apartment-b&role=visitor&reset=1&seed=1&debug=1&pinch=grip`; standard setup; head at (0; 1.6; 0), `O` = (0; 1.35; −0.45), scale 0.05.
- **Conversion for house B**: `W_B(px, pz, h)` = (Ox + (px − 4.0)·0.05; Oy + h; Oz + (pz − 3.45)·0.05), with the center (4.0; 3.45) of the plan of B (walls from (0,0) to (8; 6.9)); **to be confirmed** by reading the local `Transform` of `house:apartment-b` (it must equal −center, that is (−4.0; ·; −3.45)): if it differs, the report gives the center read and uses that.
- Real data (D34): doors of B all 0.90 m (`d-entrance`, `d-living`, `d-bedroom`) except `d-bathroom` 0.80 m; route `door:d-entrance` → `door:<room>`; `my-sofa` shortest side 0.85; `my-bed` 0.95.
- Points (y = 1.39): `P_LIV_B` = W_B(2.0; 1.5) = (−0.100; 1.39; −0.5475); `P_HALL_B` = W_B(5.3; 5.5) = (0.065; 1.39; −0.3475); `P_BEDR_B` = W_B(6.4; 2.1) = (0.120; 1.39; −0.5175); `P_BATH_B` = W_B(1.3; 5.5) = (−0.135; 1.39; −0.3475). Hand pose `P − D_GRIP`.

## Steps
1. Menu open, "mine" tab (S3.3 step 1). `ecs_find_entities` with `^ui:menu-item-`; `ecs_query_entity` on `house:apartment-b` with `["Transform"]`.
2. **Sofa in the living room**: grab `ui:menu-item-my-sofa`, carry to `P_LIV_B − D_GRIP`, wait 0.6 s, without releasing. Readings: log `pattern: "fit|furniture"`; `ecs_find_entities` with `^ui:fit-`; `FitMarker` of each marker; `Furniture` of the piece; `ui_inspect` on `ui:fit-label`; `browser_screenshot` → attach. Release (`furniture placed … status=valid`).
3. **Sofa in the hallway**: new grab, `P_HALL_B`, wait 0.6 s: log `pattern: "fit"`. Release outside the house (POUT1 = (0.463; 1.393; −0.487), `furniture returned`).
4. **Sofa in the bathroom (80 cm door)**: new grab, `P_BATH_B`, wait 0.6 s: log `pattern: "fit"`, label, markers. Release outside the house.
5. **Bed toward the bedroom**: grab `my-bed`, `P_BEDR_B`, wait 0.6 s: log, label. Release outside.
6. **A/B comparison**: rewrite `dev-params.local.txt` with `house=apartment-a`, same parameters, reload, accept, hands; repeat only step 2 with `P_LIV` of S3.3 (living room of A): log `pattern: "fit"`. The report puts the two `fit furniture:my-sofa#1 …` lines side by side.
7. Unfiltered log (`error`, `Missing glyph`); cleanup as in S3.0.

## Checks (all mandatory)
1. **Step 2 (S3.4 of the ROADMAP)**: `[soglia] fit furniture:my-sofa#1 room=living status=fits route=door:d-entrance,door:d-living` and `fit label shown furniture:my-sofa#1 "Fits: the narrowest door on the way is 90 cm wide"`; `Furniture.fit` = `fits`, `fitDoor` empty; markers `ui:fit-marker-d-entrance` and `ui:fit-marker-d-living` **both** `pass`; second line `Simplified check`; text ≥ 2.4 cm, label at 0.52-0.80 m from the head and within 30°. **No** `fit … status=blocked` line for this piece.
2. **Step 3**: `fit furniture:my-sofa#2 room=hall status=fits route=door:d-entrance`, label `Fits: the narrowest door on the way is 90 cm wide`.
3. **Step 4**: `fit furniture:my-sofa#… room=bathroom status=blocked door=door:d-bathroom reason=door-too-narrow route=door:d-entrance,door:d-bathroom` with label `Won't fit: the door is 80 cm wide, the sofa's shortest side is 85 cm`; marker `d-bathroom` `block`, `d-entrance` `pass`.
4. **Step 5**: `fit furniture:my-bed#1 room=bedroom status=disassembled door=door:d-entrance …` and `Fits when disassembled: the door is 90 cm wide, the bed's shortest side is 95 cm`.
5. **Step 6 (same piece, two houses)**: in A the line has `status=blocked door=door:d-living`, in B `status=fits`: the FitCheck depends on the house data, not on the piece (S3.3 check 2 and S3.4 check 1).
6. No `fit` line contains `blocks-door`; no `error` entries; no `Missing glyph info`.
7. Screenshot of step 2 attached and described in words (green markers, readable label).

## Outcome
PASS if checks 1-7 are met · FAIL otherwise.

## To defer to the headset
As S3.3 (readability at 0.5-0.8 m and in the narrow field of view).

## Changelog
- 2026-10-09: scenario created from the M3 plan (D34).
