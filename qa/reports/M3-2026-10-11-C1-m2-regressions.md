# M3 PC gate · part C1 · M2 regressions (S2.0-S2.9)

Date: 2026-10-11 · Environment: cloud (Linux, SwiftShader, IWER headless runtime already started) · HEAD `1a65465`
Executor: emulator-qa (Sonnet 5.5). Software rendering: the fps are not meaningful.

## Scenario table (updated after each scenario)

| Scenario | Card | Pinch mode | Result | Notes |
|---|---|---|---|---|
| S2.0 | M2-glyphs | n/a (`pinch=grip` in the second part) | **PASS** | 0 `Missing glyph info`, `font ready` 512x512, labels with `·` and `²`, 0 error/warn, `npm test` 4465 green |
| S2.1 | M2-palm-menu | grip (complete) + auto (reduced round: see below) | **PASS** (grip) | steps 1-14 complete with `pinch=grip`; 0 error/warn; NOTICES for intentional M3 changes (see section) |
| S2.2 | M2-place-bed | grip (complete) + auto (reduced round) | **PASS** | bed in `bedroom` x=6.80 z=1.125 with both modes; NOTICE: FitCheck label (M3) covers the bed in flight |
| S2.3 | M2-collision | grip | **PASS** | wardrobe 7.44/0.42, bed 6.06/3.00 valid, on the wardrobe `invalid` + `Overlaps the wardrobe`, valid again; NOTICE: FitCheck label coexists |
| S2.4 | M2-undo | grip | **PASS** | `undo action=move`, `undo action=place`, `undo empty`, new id `furniture:bed-double#2`, `nextInstance {"bed-double":3}` |
| S2.5 | M2-rotate | grip (complete) + auto (reduced round) | **PASS** (grip) | -60 deg -> `rot=90`, +60/+90 -> `rot=0`, 4 taps 0->90->180->270->0, `placed ... rot=180`; AUTO: see section |
| S2.6 | M2-door-blocked | grip | **PASS** with procedure NOTICE | in flight `blocks-door`, `Blocks the door`, 2nd armchair valid, 1st moved valid 6.80/2.50, old-over-new `overlaps-furniture with=furniture:armchair#2`; NOTICE: with the menu open the pinch at the centre of the room is taken by the Recenter button |
| S2.7 | M2-return-to-catalog | grip | **PASS** | `returned ... from=menu` / `from=model`, `undo empty`, `undo action=remove`, `Outside the house` at 0.600 m / 11.5 deg |
| S2.8 | M2-budget | grip | **PASS** (with numeric NOTICES) | max 67 calls per view (<= 100), 31.2k triangles (<= 150k), 0 error; menu cost +9; `failmodels=1` blocks 54 calls/view |
| S2.9 | M2-translate-miniature | grip | **PASS** with NOTICES | steps 1-9 PASS; zoom to 0.12 (hands at z = -0.237), two-hand drag with 0.30 m clamp, rotation `yawDeg=90.0 tiltDeg=0.0`; NOTICES: root after the zoom at z = -0.75 and `translated x=0.166 z=-0.250` instead of `x=0.200` (consequences of the zoom recipe, not defects) |

(Per-scenario sections, FAILs, notices, differences due to M3, limits and traps: below, filled in as I went.)

## S2.0 · Font glyphs (PASS)

Option A (Inter atlas) already adopted in M2: part B applies. Load 1: `house=apartment-a&role=visitor&reset=1&seed=1&debug=1&glyphs=1`; load 2 (labels): without `glyphs=1`, with `pinch=grip`.

| # | Check | Result | Data |
|---|---|---|---|
| 1 | 1 entity `ui:glyph-test` | PASS | `ecs_find_entities ^ui:glyph-test$` -> `total: 1` (entityIndex 1; components Transform, Visibility, LevelTag, StableId, PanelUI, Follower, PanelDocument) |
| 5 | 0 `Missing glyph info`; `font ready` with W,H <= 1024 | PASS | `Missing glyph` filter empty in the current load (ts 1791732635591); `[soglia] font ready family=inter weight=normal atlas=512x512 glyphs=111` and `... weight=bold atlas=512x512 glyphs=111`; `[soglia] glyph test shown id=ui:glyph-test` |
| 6 | label texts | PASS | `[soglia] label shown "Living room & kitchen · 23.9 m²"` and `[soglia] label shown "Study · 12.0 m²"` (with `room selected living area=23.9` / `room selected study area=12.0`) |
| 7 | screenshot | PASS | `M3-gate-C1-S2.0-glyph-test.png`: panel with three rows, `m² ² · × ° − ± → ≈` in regular and in bold and `ABC abc 0123456789 %§°`, no solid squares; `M3-gate-C1-S2.0-label-living.png`: living room label with `·` and `m²` readable, above the model, with the hint "Palm up for the menu" |
| 8 | app textures <= 4, each <= 1024; no `budget exceeded`; no error | PASS | app textures = the two 512x512 atlases; `[soglia:stats] ... textures=7` (with `glyphs=1`, as in M2 rerun3) and `textures=8` with label and hint (panel UIKit, framework); 0 `budget exceeded` lines; `level=[error,warn]` empty since the load |
| 9 | CDN | PASS | no `Failed to load`/`404` line (error/warn filter empty) |
| 10 | licence and credits | PASS | `public/fonts/` = `OFL.txt`, `inter-bold.{json,png}`, `inter-regular.{json,png}`; `CREDITS.md:11` row `font-inter-msdf`; `docs/RULES.md` lines 47-53 (second exception, OFL 1.1); `npm test`: 75 files, 4465 tests green |

Part A (historical audit): not rerun as an audit; the table of the eight characters is consistent: no `Missing glyph info` for `² · × ° − ± → ≈` (all available). No change due to M3.

## S2.1 · Palm menu (pinch=grip, complete scenario)

Parameters: `house=apartment-a&role=visitor&reset=1&seed=1&debug=1&pinch=grip` (log `params source=dev-file ... pinch=grip`, ts 1791733036932 for the load of steps 11-14; ts 1791732741469 for steps 1-10). Head (0; 1.6; 0). `Q_UP` = (0, -0.2588, 0.9659, 0). O = (0; 1.35; -0.45). The file `dev-params.local.txt` does not contain `time=`.

| # | Check | Result | Objective data |
|---|---|---|---|
| 1 | Step 1: 0 `ui:palm-menu` and 0 items | PASS with NOTICE | 0 `ui:palm-menu`, 0 `ui:menu-item-*`, 0 undo/prev/next/recenter; the pattern `^ui:(palm-menu\|menu-)` however finds 2 entities: `ui:menu-button-left` (index 44) and `ui:menu-button-right` (45), the M3 Menu buttons (intentional, they have `PanelUI`) |
| 2 | Step 3: 1 `ui:palm-menu`, `menu opened`, `catalog loaded`, 6 items in order, 4 buttons | PASS with NOTICE | `[soglia] menu opened hand=left mode=palm` (NOTICE: `mode=palm` suffix from M3, intended); `[soglia] catalog loaded items=16 furniture=14 mobility=2` (identical to M2; in the merged M3 catalog the `items` tab still has 14 entries); 1 `ui:palm-menu` (index 50, with `PanelUI`); 6 `ui:menu-item-` items with `MenuItem.catalogId` = bed-double, bed-single, sofa-3seat, armchair, table-dining, chair; 1 `ui:menu-undo`, 1 `-page-prev`, 1 `-page-next`, 1 `-recenter`; in addition (M3) 4 `ui:menu-tab-items/-mine/-fit/-measure`; no `wheelchair`/`stroller` item in the `items` tab; the anchors have no `PanelUI` (component list: Transform, Visibility, LevelTag, StableId, MenuItem). `src/ui/strings.ts` lines 38-41: `undo: 'Undo'`, `previous: 'Back'`, `next: 'Next'`, `recenter: 'Recenter'`; the screenshot shows icon + text for all four |
| 3 | Distance 0.50-0.65 m and distinct items | PASS | computed from the Transform with head (0; 1.6; 0): palm-menu 0.534; bed-double 0.585; bed-single 0.585; sofa 0.546; armchair 0.546; table-dining 0.520; chair 0.520; undo 0.520; prev 0.505; next 0.501; recenter 0.515 (all 0.50-0.59); tabs 0.625-0.629 (numeric NOTICE: the M3 tabs sit at 0.63 m, within 0.65). Distance between neighbouring items: 0.18 m in x, 0.083 m in y (>= 0.06) |
| 3b | Central 30 deg cone | PASS | `[soglia] menu view maxAngleDeg=30.0 distance=0.50`; angles from the Transforms: palm-menu 2.0; items 9.2-14.7; undo 24.8; prev 20.4; next 19.1; recenter 22.9; tabs 16.6-18.3 (all <= 30) |
| 4 | Pages | PASS | `menu page 2/3 items=coffee-table,desk,bookcase,wardrobe,nightstand,tv-stand`, then `menu page 3/3 items=rug,plant`, the third `next` produces no new line, `prev` -> `menu page 2/3 items=coffee-table,desk,bookcase,wardrobe,nightstand,tv-stand`; index of `ui:palm-menu` = 50 before and after each change; no `menu closed` between step 5 and 6; 6 items (page 2), 2 items `rug`, `plant` (page 3) |
| 5 | Closing | PASS | `[soglia] menu closed mode=palm via=palm` (ts 1791732808131); 0 `ui:palm-menu`, 0 items (only the 2 Menu buttons remain) |
| 6 | Right | PASS | `menu opened hand=right mode=palm` (ts 1791732820758), 1 `ui:palm-menu`; then closing |
| 7 | Both | PASS | 1 single `ui:palm-menu`, a single line `menu opened hand=left mode=palm` (ts 1791732840226) |
| 8a | Same hand pinching | PASS | T_a1: `pinch left start` (ts ...855456), 0 `ui:palm-menu`, no `menu opened` after; T_a2: `pinch left end` ts 1791732868906, `menu opened hand=left mode=palm` ts 1791732869696: delta **0.790 s**, 1 entity |
| 8b | Pinch of the other hand | PASS | `pinch right start` ts ...889020, `menu opened hand=left` ts ...889723 with the right pinching; 1 entity; after `pinch right end` (...901082) still 1 entity, no `menu closed` |
| 8c | Piece in hand | PASS | T_c0: `menu item picked id=bed-double hand=right` (new M3 line), `furniture grabbed furniture:bed-double#1 source=menu hand=right`, `furniture status ... status=invalid reasons=outside-house`, 1 `ui:palm-menu`, no `menu closed`; explicit closing: `menu closed mode=palm via=palm` (ts ...918430); T_c1 (palm up 1.5 s): 0 entities, no `menu opened`, `Furniture.phase`=`held`, `hand`=`right`, `roomId`=""; T_c2: `pinch right end` ts 1791732937256, `furniture returned furniture:bed-double#1 from=menu` (same ts +1 ms), `menu opened hand=left mode=palm` ts 1791732938135: delta **0.879 s** |
| 8d | `pan` active | PASS | `pan start hand=right` ts ...959722, 0 `ui:palm-menu`, no `menu opened`, no `miniature translated`; `pan end hand=right` ts 1791732978076, `menu opened hand=left` ts 1791732978904: delta **0.828 s** |
| 8e | Short palm (informative) | SKIPPED | MCP latency 1.2-2.1 s for each `wait`: > 0.35 s; covered by `tests/unit/palm.test.ts` |
| 8f | Menu open + pinch of the same hand | PASS | T_f0: 1 entity, `menu opened hand=left mode=palm`; T_f1: `pinch left start` ts ...990988, 1 entity, no `menu closed`; T_f2: `pinch left end` ts 1791733001884, 1 entity, no `menu closed` and no second opening; T_f3: a single `menu closed mode=palm via=palm` (ts 1791733012986), 0 entities. **Difference from M2 (F-A closed): no `room selected` line in the whole scenario** (in M2 the line for the pinch of the menu hand selected the `living` room): an M3 improvement, not a regression |
| 9 | Model unchanged, no `room selected` | PASS | `[soglia:state]` (ts 1791732798447): `miniature {scale 0.05, yawDeg 0, offset [0,0]}`, `selectedRoomId null`, `furniture []`; 0 `room selected/deselected` lines in the whole load; 0 `miniature gesture start` |
| 10 | 0 error, 0 `Missing glyph info`, no network | PASS | filter `level=[error,warn]` empty from the start of the load to the end of the scenario (ts 1791732741000-1791733360882) |
| 11a | 0 `ui:menu-hint`, onboarding `pinch` | PASS | `onboarding step=pinch` ts 1791733037248, 0 hint entities |
| 11b | Hint | PASS | `pinch right start` ts ...050075 -> `onboarding step=two-hands` (...050077) -> `onboarding step=done` ts 1791733058995 (9.0 s after the first phase) -> `hint shown id=menu` ts ...058996; 1 `ui:menu-hint` (index 49); Transform (0; 1.4872; -0.5076), orientation (0,0,0,1) = yaw only; distance from the head 0.520 m (>= 0.52, <= 0.65); y 1.487 >= Oy+0.10 = 1.45; screenshot `M3-gate-C1-S2.1-hint.png`: white panel with hand icon and "Palm up for the menu" above the model |
| 11c | Opening hides the hint | PASS | `menu opened hand=left mode=palm` ts 1791733083268, `hint hidden id=menu` ts ...083376; 0 `ui:menu-hint`; `[soglia:state]`: `"menuOpened":true` |
| 11d | No reappearance | PASS | after closing (`menu closed mode=palm via=palm` ts ...094944) and reopening (`menu opened hand=left` ts ...102377): 0 entities, no new `hint shown`, no `onboarding step=menu` line |
| 12 | Screenshot | PASS | `M3-gate-C1-S2.1-menu-open.png`: menu entirely in the field of view, above the model; title/tabs `Items` (active, black) `Mine` `Fit` `Measure` at the top, 2x3 grid (Double bed 1.6 x 2.0 m, Single bed 0.9 x 2.0 m, Three-seat sofa 2.1 x 0.9 m, Armchair 0.8 x 0.8 m, Dining table 1.4 x 0.9 m, Chair 0.45 x 0.5 m), bottom bar with four buttons `Undo` `Back` `Next` `Recenter` with icon and text, no element cut off; the two M3 `Menu` buttons at the sides (outside the menu). Onboarding ghost hand no longer visible |
| 13 | PROBE 1: 5 pinches with the same hand, left and right | PASS | **Left**: pages 2/3 (ts ...128171), 3/3 (...132185), 2/3 (...154777), 1/3 (...160052), 2/3 (...176947) = 2,3,2,1,2; **Right**: 2/3 (...226410), 3/3 (...228583), 2/3 (...250231), 1/3 (...252437), 2/3 (...266278); 0 error/warn after each read and at the end; 1 `ui:palm-menu` (index 53 on the left, 57 on the right); no `menu closed` between opening and explicit closing; the menu stays open after the fifth pinch. The menu FOLLOWS the hand: after each move the buttons shift by 2-3 cm; pose recomputed with one correction (sometimes two) and read again (declared) |
| 14 | PROBE 2: Recenter with piece in hand | PASS | 13a: `pan start hand=right` ts ...282174, `miniature translated x=-0.100 z=0.000 source=pan`, T0 = (-0.10; 1.35; -0.45); 13b: bed grab from the menu (`furniture grabbed ... source=menu hand=right`), `status=invalid reasons=outside-house` (hand beyond the edge); 13c: left pinch on `ui:menu-recenter` (pose (0.1249; 1.5016; -0.5083)): **no** `miniature recentered`, no error, root T1 = (-0.10; 1.35; -0.45) = T0, `furniture:bed-double#1` `phase`=`held`, `rotationDeg`=90, line `furniture rotated furniture:bed-double#1 rot=90` (expected), 1 `ui:palm-menu`, no `menu closed`; 13d: `furniture returned furniture:bed-double#1 from=menu` (ts ...345833), pinch on Recenter -> `miniature recentered scale=0.0500` (ts 1791733360882), root T2 = (0; 1.35; -0.45) |

Console: 0 `error`, 0 `warn` in the whole scenario. Screenshots: `M3-gate-C1-S2.1-menu-open.png`, `M3-gate-C1-S2.1-hint.png`, `M3-gate-C1-S2.1-menu-after-release.png` (menu with the model already moved by -0.10 m to the left, menu not dimmed).

Notices due to M3 (intentional, not FAIL): (1) the `ui:menu-button-left/-right` buttons make 2 entities appear in the pattern `^ui:(palm-menu|menu-)` even with the menu closed (checks 1 and 5 say "0 `ui:menu-*`"); (2) the `menu opened/closed` lines carry `mode=palm` and `via=palm`; (3) `ui:menu-tab-*` and the title become the four tabs (check 12 speaks of a "title"); (4) new line `menu item picked id=bed-double hand=right`; (5) the position of the items changed (new 2x3 grid): bed-double (-0.0953; 1.6746; -0.5720) instead of (-0.1340; 1.6250; -0.5477) in M2.

### S2.1 · reduced round with `pinch=auto`

`dev-params.local.txt`: `house=apartment-a&role=visitor&reset=1&seed=1&debug=1&pinch=auto` (the `params` line does not print `pinch=` when it is `auto`; the mode is recognised by `input source=joints hand=left/right`, ts 1791733506596). Pose = target + (0; 0.025; 0.012) at identity, `xr_select` 0.5 s. Data: palm up on the left -> `menu opened hand=left mode=palm` (ts 1791733509425), 1 `ui:palm-menu`; right pinch on `ui:menu-page-next` (pose (0.0134; 1.4614; -0.4616)): `pinch right start` ts ...525817, `menu page 2/3 items=coffee-table,desk,bookcase,wardrobe,nightstand,tv-stand` ts ...525822; then on `ui:menu-page-prev` (pose (-0.0636; 1.4614; -0.461)): `menu page 1/3 items=bed-double,bed-single,sofa-3seat,armchair,table-dining,chair` ts ...533207; pinch of the menu hand (left, `xr_set_select_value` 1 for 2.5 s, menu open): `pinch left start` ts ...535906 / `pinch left end` ts ...544451, 1 `ui:palm-menu` for the whole duration, no `menu closed`, **no `room selected`** (F-A closed also with `auto`); 0 error/warn. **PASS**.

## S2.2 · Place the bed (PASS)

### pinch=grip (complete scenario)
Parameters `house=apartment-a&role=visitor&reset=1&seed=1&debug=1&pinch=grip`; O of the bed from `miniature placed x=0.000 y=1.350 z=-0.450 yawDeg=0.0 scale=0.0500` (ts 1791733420327). Menu pose: left (-0.25; 1.15; -0.2) `Q_UP`; item `ui:menu-item-bed-double` read (-0.0953; 1.6746; -0.5720); right poses: grab (-0.0573; 1.6776; -0.609), P1 (0.103; 1.393; -0.602).

| # | Check | Result | Data |
|---|---|---|---|
| 1 | 0 `furniture:*` with the menu open | PASS | `ecs_find_entities ^(furniture:|ui:menu-item-bed-double$|ui:palm-menu$)` -> only `ui:palm-menu` (50) and the item (59); `menu opened hand=left mode=palm` ts 1791733424596 |
| 2 | Grab | PASS | `[soglia] furniture grabbed furniture:bed-double#1 source=menu hand=right` (ts 1791733440403; in addition `menu item picked id=bed-double hand=right` as in S2.1); 1 entity `furniture:bed-double#1` (index 65); `Furniture.catalogId`=`bed-double`, `instance`=1, `phase`=`held`, `hand`=`right` |
| 3 | In flight | PASS | `status`=`valid`, `outline`=`green`, `phase`=`held`, `roomId`=`bedroom`, `x`=6.8, `z`=1.125; intermediate logs `status=invalid reasons=outside-house` (at the menu), `status=invalid reasons=overlaps-wall wall=w-living-bedroom` (ts ...446735, transient while carrying) and `status=valid reasons=-` (ts ...447175); no `miniature gesture start`, no `room selected`, no `pan start` |
| 4 | Release | PASS | `[soglia] furniture placed furniture:bed-double#1 room=bedroom x=6.80 z=1.13 rot=0 status=valid` (ts 1791733467365, 3 ms after `pinch right end`); `Furniture.phase`=`placed`, `status`=`valid`, `outline`=`none`, `roomId`=`bedroom`; local `Transform` to `house:apartment-a` = (6.8; 0; 1.125) |
| 5 | Store | PASS | `[soglia:state]`: `"furniture":[{"id":"furniture:bed-double#1","catalogId":"bed-double","instance":1,"x":6.8,"z":1.125,"rotationDeg":0,"roomId":"bedroom"}]`, `"nextInstance":{"bed-double":2}`, `"historyLength":1`, `miniature {scale 0.05, yawDeg 0, offset [0,0]}`, `selectedRoomId null` |
| 6 | No `room selected`, `pan start`, `translated` | PASS | filter `room (de)?selected|miniature (gesture|translated)|pan ` empty since the load; `offset [0,0]` |
| 7 | 0 error, 0 `Missing glyph info` | PASS | `level=[error,warn]` empty |
| 8 | Screenshot | PASS with NOTICE | `M3-gate-C1-S2.2-bed-in-hand.png`: the menu is dimmed (items light grey, not selectable), the green frame on the bedroom floor is visible (green rectangle), and **an orange M3 label (FitCheck)** covers the top of the bed: "Fits when disassembled: the door is 90 cm wide, the double bed's shortest side is 95 cm / Simplified check". `M3-gate-C1-S2.2-bed-placed.png`: the menu is full again; the beige bed, resting against the north wall of the bedroom, is partly covered by the menu (as in M2); no frame |

Differences due to M3: (a) `Furniture` has the fields `fit` (`disassembled`) and `fitDoor` (`door:d-entrance`) and `[soglia] fit label hidden furniture:bed-double#1` appears (ts 1791733475366, 8 s after the release) — FitCheck, intentional; (b) the FitCheck label shows "Fits when disassembled..." for the double bed (entrance door 90 cm, short side 95 cm), which in step 4 covers the bed in the screenshot.

### pinch=auto (reduced round)
Poses: grab = item + (0; 0.025; 0.012) = (-0.0953; 1.6996; -0.56) with `set_select_value` 1 + wait 0.7 s; P1 pose = (0.065; 1.415; -0.553), `animate_to` 0.8 s; release with `set_select_value` 0. Data: `menu item picked id=bed-double hand=right` and `furniture grabbed furniture:bed-double#1 source=menu hand=right` (ts 1791733550878), states `invalid reasons=outside-house` -> `invalid reasons=overlaps-wall wall=w-living-bedroom` -> `valid`; `[soglia] furniture placed furniture:bed-double#1 room=bedroom x=6.80 z=1.13 rot=0 status=valid` (ts 1791733571431); `Furniture` `phase`=`placed`, `roomId`=`bedroom`, `x`=6.8, `z`=1.125; 0 error/warn. **PASS**.

## S2.3 · Collision between furniture (PASS, pinch=grip)

Parameters `house=apartment-a&role=visitor&reset=1&seed=1&debug=1&pinch=grip`; O = (0; 1.35; -0.45); menu open with the left on `L_MENU`/`Q_UP` and held up. Item `ui:menu-item-wardrobe` read on page 2: (0.0869; 1.5915; -0.5388) (same slot as the wardrobe in M2: index 3 of the 2x3 grid). Poses: wardrobe grab (0.1249; 1.5945; -0.5758) -> PW pose (0.133; 1.393; -0.6395); bed (-0.0573; 1.6776; -0.609) -> PB1 pose (0.063; 1.393; -0.517); grab from the model (0.066; 1.393; -0.517) -> PB2 pose (0.113; 1.393; -0.607).

| # | Check | Result | Data |
|---|---|---|---|
| 1 | Wardrobe | PASS | `[soglia] furniture placed furniture:wardrobe#1 room=bedroom x=7.44 z=0.42 rot=0 status=valid` (ts 1791733646828; `Furniture.z`=0.425); `status`=`valid`, `outline`=`none`; `menu page 2/3 items=coffee-table,desk,bookcase,wardrobe,nightstand,tv-stand` (ts ...628892) |
| 2 | Valid bed | PASS | `furniture placed furniture:bed-double#1 room=bedroom x=6.06 z=3.00 rot=0 status=valid` (ts 1791733673338); `outline` none. In flight (while carrying from the menu) transient lines appear `status=invalid reasons=outside-house` (ts ...662799) and `status=invalid reasons=overlaps-wall wall=w-living-bedroom` (ts ...664892) and the labels `reason shown furniture:bed-double#1 "Outside the house"` / `"Overlaps a wall"`, then `status=valid reasons=-` and `reason hidden`: these are flight states, the placed piece is valid |
| 3 | In flight over the wardrobe | PASS | grab from the model `furniture grabbed furniture:bed-double#1 source=model hand=right` (ts ...688039); `Furniture` `status`=`invalid`, `outline`=`red`, `phase`=`held`, `reasons`=`overlaps-furniture`, x=7, z=1.125; line `[soglia] furniture status furniture:bed-double#1 status=invalid reasons=overlaps-furniture with=furniture:wardrobe#1` (ts ...697383); no `overlaps-wall` |
| 4 | Release | PASS | `[soglia] furniture placed furniture:bed-double#1 room=bedroom x=7.00 z=1.13 rot=0 status=invalid` (ts 1791733720821); bed `phase`=`placed`, `status`=`invalid`, `outline`=`red` persistent, `reasons`=`overlaps-furniture`; wardrobe `valid`, `outline` none; `[soglia:state]`: `furniture` has 2 elements (wardrobe 7.44/0.425; bed 7/1.125), `historyLength` 3 |
| 5 | Valid again | PASS | bed picked up again (`furniture grabbed ... source=model`, ts ...744211), `status=valid reasons=-` (ts 1791733751512), `reason hidden furniture:bed-double#1` (ts ...751654), `furniture placed furniture:bed-double#1 room=bedroom x=6.06 z=3.00 rot=0 status=valid` (ts ...753937) |
| 6 | Final count | PASS | 2 entities `furniture:*` (`furniture:wardrobe#1` index 66, `furniture:bed-double#1` index 68), 0 `ui:reason-*`; `[soglia:state]`: `"nextInstance":{"wardrobe":2,"bed-double":2}`, `"historyLength":4` |
| 7 | No room/gesture; scale and yaw | PASS | `miniature {scale 0.05, yawDeg 0, offset [0,0]}`, `selectedRoomId null`; no `room selected`/`miniature gesture` line |
| 8 | 0 error | PASS | `level=[error,warn]` empty from ts 1791733600000 |
| 9 | Screenshot steps 3 and 4 | PASS | `M3-gate-C1-S2.3-reason-overlap.png` (in flight): **red** frame on the bedroom floor around the bed overlapping the wardrobe, white label with red border "Overlaps the wardrobe" readable in full, and above it the orange M3 FitCheck label ("Fits when disassembled: the door is 90 cm wide, the double bed's shortest side is 95 cm / Simplified check") that covers the first rows of the dimmed menu; `M3-gate-C1-S2.3-bed-placed-invalid.png` (after the release): beige bed with persistent red frame on the floor, label "Overlaps the wardrobe" still visible; the FitCheck label is gone (it has its own timer). After the valid return (log `reason hidden`) the frame disappears (`outline` none) |
| 10a | Reason label in flight | PASS | 1 entity `ui:reason-bed-double#1` (index 49); `[soglia] reason shown furniture:bed-double#1 "Overlaps the wardrobe"` (ts ...697525, exact text); `Transform` (0.0692; 1.4651; -0.5735): distance from the head **0.593 m** (>= 0.52, <= 0.65), `y` 1.465 >= Oy+0.04 = 1.39, angle **14.8 deg** (<= 30), orientation (0; -0.0600; 0; 0.9982) = yaw-only, text whole and without Italian |
| 10b | After the release | PASS | label still 1 entity, no `reason hidden`; `Transform` (0.0668; 1.4553; -0.5785): 0.599 m, 15.1 deg; `ui:reason-wardrobe#1` absent; reasons in the log only `overlaps-furniture` |
| 10c | Valid return | PASS | 0 entities `ui:reason-*`, `[soglia] reason hidden furniture:bed-double#1` |
| 10d | At the end 0 labels; max 3 | PASS | 0 `ui:reason-*` at the end; never more than 1 reason label |

Differences due to M3 (NOTICES): (a) the FitCheck shows the orange label when the bed is picked up (here also on the bed already placed), so in the step 3 screenshot two labels coexist (reason + FitCheck) and the orange one covers the dimmed menu; (b) `Furniture` has the fields `fit`/`fitDoor` (wardrobe `fits`, bed `disassembled` via `door:d-entrance`); (c) in flight from the menu to the bed, `outside-house` and `overlaps-wall` pass briefly (as in M2: the intermediate logs do not change the placed piece).

## S2.4 · Undo from the menu (PASS, pinch=grip)

Parameters `house=apartment-a&role=visitor&reset=1&seed=1&debug=1&pinch=grip`. Menu open (left on `L_MENU`/`Q_UP`). `ui:menu-undo` read at (-0.1441; 1.4364; -0.4724); right pose (-0.1061; 1.4394; -0.5094), `xr_select` 0.2 s.

| # | Check | Result | Data |
|---|---|---|---|
| 1 | Step 1 | PASS | `furniture placed furniture:bed-double#1 room=bedroom x=6.80 z=1.13 rot=0 status=valid` (ts 1791733820893); `[soglia:state]`: 1 element at x 6.8 / z 1.125, `historyLength` 1, `nextInstance` `{"bed-double":2}` |
| 2 | Step 2 | PASS | `furniture placed furniture:bed-double#1 room=bedroom x=6.06 z=3.00 rot=0 status=valid` (ts ...845051), `historyLength` 2 |
| 3 | Undo 1 | PASS | `[soglia] undo action=move id=furniture:bed-double#1` (ts 1791733858690); state: x 6.8 / z 1.125, `historyLength` 1; same entity (`furniture:bed-double#1`) |
| 4 | Undo 2 | PASS | `[soglia] undo action=place id=furniture:bed-double#1` (ts ...865092); 0 entities `furniture:*`; `furniture` `[]`, `historyLength` 0, `nextInstance` `{"bed-double":2}` |
| 5 | Undo 3 | PASS | `[soglia] undo empty` (ts ...871951); 0 entities; 0 error |
| 6 | New placement | PASS | `furniture placed furniture:bed-double#2 room=bedroom x=6.80 z=1.13 rot=0 status=valid` (ts ...894166); `[soglia:state]`: `furniture:bed-double#2`, `instance` 2, `nextInstance` `{"bed-double":3}`, `historyLength` 1 |
| 7 | Model unchanged | PASS | every state line: `miniature {scale 0.05, yawDeg 0, offset [0,0]}`, `selectedRoomId null`; 0 `room selected`/`miniature gesture` |
| 8 | 0 error | PASS | `level=[error,warn]` empty from ts 1791733790000 |

No difference due to M3 detected (the only novelties are the same as in S2.2: `menu item picked`, `fit` fields).

## S2.5 · Snap rotation (pinch=grip, complete scenario)

Parameters `house=apartment-a&role=visitor&reset=1&seed=1&debug=1&pinch=grip`. The bed in this scenario is `furniture:bed-double#2` (placed at P1 after scenario S2.4 in the same load: id #2 instead of #1, no effect on the checks). Wrist poses (with `G` = bed centre (0.065; 1.39; -0.574), computed with python): -30 (0.1164; 1.393; -0.587), -60 (0.116; 1.393; -0.5596), -90 (0.102; 1.393; -0.536); +30 (0.0794; 1.393; -0.635), +60 (0.052; 1.393; -0.6354), +90 (0.028; 1.393; -0.622) (with `G` z = -0.584 for the bed at z 0.925).

| # | Check | Result | Data |
|---|---|---|---|
| 1 | Wrist clockwise | PASS | grab `furniture grabbed furniture:bed-double#2 source=model hand=right` (ts 1791733925702); after -30: no `furniture rotated` line; after -60: `[soglia] furniture rotated furniture:bed-double#2 rot=90` (ts ...937736); after -90: no other line; in flight `Furniture.rotationDeg`=90, `outline`=`green`, `status`=`valid`, `x`=6.8, `z`=0.925 |
| 2 | Release | PASS | `[soglia] furniture placed furniture:bed-double#2 room=bedroom x=6.80 z=0.93 rot=90 status=valid` (ts 1791733955845); `[soglia:state]`: `rotationDeg` 90, `z` 0.925, `historyLength` 2 |
| 3 | Wrist counter-clockwise | PASS | picked up again at (0.103; 1.393; -0.621): `furniture rotated furniture:bed-double#2 rot=0` (ts ...979937, during the sequence +30/+60/+90) and `furniture placed furniture:bed-double#2 room=bedroom x=6.80 z=1.13 rot=0 status=valid` (ts ...984269) |
| 4 | Taps with the other hand | PASS | with the right holding (`furniture grabbed ... source=model hand=right`, ts ...999478): tap 1 `rot=90` (ts ...006590), tap 2 `rot=180` (ts ...010213); **no** `furniture grabbed` from the taps, no `miniature gesture start`, no `room selected`; release after two more taps (rot 90, 180): `furniture placed furniture:bed-double#2 room=bedroom x=6.80 z=1.13 rot=180 status=valid` (ts ...025055); `[soglia:state]`: `rotationDeg` 180, `historyLength` 4 |
| 4b | Four taps | PASS | consecutive taps with the right holding: `rot=180` -> `rot=270` (ts ...012845) -> `rot=0` (ts ...014977): 0 -> 90 -> 180 -> 270 -> 0 |
| 5 | Empty grab with the left | PASS (annotation) | with the right at rest and the left palm down on the bed position (menu closed: `menu closed mode=palm via=palm` ts ...039774): `furniture grabbed furniture:bed-double#2 source=model hand=left` (ts ...048064), `furniture hand left world=0.065,1.390,-0.574 plan=6.80,1.12`, release `furniture placed ... x=6.80 z=1.13 rot=180 status=valid` without moving; no new `[soglia:state]` line => state and `historyLength` (4) unchanged |
| 6 | 0 error; scale and yaw | PASS | `level=[error,warn]` empty from ts 1791733790000; `miniature {scale 0.05, yawDeg 0, offset [0,0]}` |
| 7 | Screenshot step 2 | PASS with NOTICE | `M3-gate-C1-S2.5-rotated-in-hand.png`: the rotated bed (along the x axis, wider than tall) with a green frame on the bedroom floor; the orange FitCheck (M3) panel partly covers the dimmed menu and the area above the bed; the white ghost hand is near the bed |

Differences due to M3: same as S2.2 (FitCheck label in flight, `fit`/`fitDoor` fields). `Furniture.fit`=`disassembled` also with the bed rotated by 90 deg.

### S2.5 · reduced round with `pinch=auto`

`pinch=auto`; constants: pose = target - R(q)*o with o = (0.0005; -0.0249; -0.0119) for the right (python): identity (0.0645; 1.4149; -0.5621), -30 (0.0586; 1.4149; -0.5639), -60 (0.0544; 1.4149; -0.5685), -90 (0.0531; 1.4149; -0.5745); `set_select_value` 1 + wait 0.7 s; left tap with `xr_select` 0.5 s. Data: bed placed from the menu `furniture placed furniture:bed-double#1 room=bedroom x=6.80 z=1.13 rot=0 status=valid` (ts 1791734114441); picked up again (`furniture grabbed ... source=model hand=right`, ts ...128008), -30/-60/-90: `furniture rotated furniture:bed-double#1 rot=90` (ts ...138056); left tap: `furniture rotated furniture:bed-double#1 rot=180` (ts ...144821); release: `furniture placed furniture:bed-double#1 room=bedroom x=6.80 z=1.13 rot=180 status=valid` (ts ...147688); no `room selected`/`pan`/`miniature gesture`; 0 error/warn. **PASS**.

## S2.6 · Door blocked by a piece of furniture (PASS, pinch=grip)

Parameters `house=apartment-a&role=visitor&reset=1&seed=1&debug=1&pinch=grip`. Menu open (left `L_MENU`/`Q_UP`). `ui:menu-item-armchair` (page 1) at (0.0869; 1.5915; -0.5388): grab (0.1249; 1.5945; -0.5758). Carrying poses: PD (0.083; 1.393; -0.467), PS (0.138; 1.393; -0.467), centre of the 1st armchair (0.083; 1.393; -0.460) -> PC (0.103; 1.393; -0.542).

| # | Check | Result | Data |
|---|---|---|---|
| 1 | In flight over the door | PASS | `Furniture` (index 65): `status`=`invalid`, `outline`=`red`, `reasons`=`blocks-door`, x 6.4, z 4.14; line `[soglia] furniture status furniture:armchair#1 status=invalid reasons=blocks-door door=door:d-bedroom` (ts 1791734191758; no `overlaps-wall`) |
| 2 | Release | PASS | `[soglia] furniture placed furniture:armchair#1 room=bedroom x=6.40 z=4.14 rot=0 status=invalid` (ts ...218505); `outline` `red` persistent, `reasons` `blocks-door`, in the store |
| 3 | 2nd armchair next to it | PASS | `furniture placed furniture:armchair#2 room=bedroom x=7.50 z=4.14 rot=0 status=valid` (ts ...250837); `status` `valid`, `outline` `none`; only `ui:reason-armchair#1` exists |
| 4 | 1st armchair away from the door | PASS | `furniture status furniture:armchair#1 status=valid reasons=-` (ts ...272662), `reason hidden furniture:armchair#1` (ts ...272795), `furniture placed furniture:armchair#1 room=bedroom x=6.80 z=2.50 rot=0 status=valid` (ts ...275383); `outline` `none` |
| 5 | Count | PASS | 2 entities `furniture:*` (65, 70), 0 `ui:reason-*`; `[soglia:state]`: `nextInstance` `{"armchair":3}` |
| 6 | No room/gesture; 0 error | PASS | no `room selected`/`miniature gesture start`; `level=[error,warn]` empty from ts 1791734160000 |
| 7 | Screenshot step 1 | PASS with NOTICE | `M3-gate-C1-S2.6-blocks-door.png`: the armchair (pink) on the door opening with a **red** frame on the floor; two panels: "Blocks the door" (white, red border, readable in full) and above it, **green**, "Fits: the narrowest door on the way is 80 cm wide / Simplified check" (M3 FitCheck: the armchair gets through the door, but blocks its free area: the two messages do not contradict each other because they measure different things); the thresholds of the doors on the route have the **green** FitCheck markers (in M2 they were orange); dimmed menu behind |
| 8 | Reason label | PASS | 1 entity `ui:reason-armchair#1`; `reason shown furniture:armchair#1 "Blocks the door"` (ts ...191883, exact text); in flight Transform (0.0364; 1.4795; -0.5045): **0.520 m** (identical to M2 rerun3), **14.0 deg**, orientation (0; -0.0360; 0; 0.9994) yaw-only; after the release (0.0335; 1.4751; -0.5037): 0.520 m, 14 deg; stays after the release; `ui:reason-armchair#2` absent; `reason hidden` after the move (0 `ui:reason-*` at step 5) |
| 9 | Old over new | PASS | `[soglia] furniture status furniture:armchair#1 status=invalid reasons=overlaps-furniture with=furniture:armchair#2` (ts 1791734365892) and `reason shown furniture:armchair#1 "Overlaps the armchair"` (ts ...365904); in flight `#1` `invalid`/`red`/`overlaps-furniture`, `#2` `valid`/`none` and **no** line `furniture status furniture:armchair#2 ... invalid`; label in flight (0.0609; 1.4782; -0.5498): 0.565 m, 12.4 deg, yaw-only; after the release `furniture placed furniture:armchair#1 room=bedroom x=7.50 z=4.14 rot=0 status=invalid` (ts ...385499); at the end 2 `furniture:*`, 1 `ui:reason-armchair#1`, `nextInstance` `{"armchair":3}`, `historyLength` 4; final screenshot `M3-gate-C1-S2.6-final-invalid-armchair.png` (menu closed): label "Overlaps the armchair" whole above the model |

**Procedure NOTICE (not FAIL, intentional M3 change in the menu coordinates)**: at step 6 with the menu open and held up, the grab of the 1st armchair from its centre (pose (0.103; 1.393; -0.542) = pinch point (0.065; 1.39; -0.505)) was taken by the `ui:menu-recenter` button (`[soglia] pinch right start` and `[soglia] miniature recentered scale=0.0500` in the same ms, ts 1791734292144): no `furniture grabbed`, model already centred so no damage. Cause: in menu v2 `ui:menu-recenter` sits at (0.1149; 1.4364; -0.4744) instead of (0.1301; 1.4490; -0.4805) in M2: the distance from the pinch point is 0.075 m (0.092 m in M2) and is inside the button's radius. To go on, the menu was closed (palm down, `menu closed mode=palm via=palm`) before repeating the grab, which then succeeded (`furniture grabbed furniture:armchair#1 source=model hand=right`). So the scenario as written (menu open "for the whole scenario") can no longer be run to the letter at step 6; the function (a nearby button wins over the piece) is a menu priority choice, not a loss of pieces.

## S2.7 · A piece of furniture left outside returns to the catalog (PASS, pinch=grip)

Parameters `house=apartment-a&role=visitor&reset=1&seed=1&debug=1&pinch=grip`. Menu open. POUT1 pose (0.463; 1.393; -0.487), POUT2 pose (0.638; 1.393; -0.487); undo pose (-0.1061; 1.4394; -0.5094).

| # | Check | Result | Data |
|---|---|---|---|
| 1 | New piece released outside | PASS | in flight (index 65): `status` `invalid`, `outline` `red`, `reasons` `outside-house`, x 14, z 3.6, `roomId` "", `fit` `none`; line `furniture status furniture:bed-double#1 status=invalid reasons=outside-house` (ts 1791734458276); release: `[soglia] furniture returned furniture:bed-double#1 from=menu` (ts ...485753); 0 `furniture:*`; `[soglia:state]`: `furniture` `[]`, `nextInstance` `{}`, `historyLength` 0; no `furniture placed` line |
| 2 | Undo | PASS | `[soglia] undo empty` (ts ...499406) |
| 3 | Piece from the model carried outside | PASS | pose at P1 `furniture placed furniture:bed-double#1 room=bedroom x=6.80 z=1.13 rot=0 status=valid` (ts ...524589); picked up again (`source=model`), release at POUT1: `[soglia] furniture returned furniture:bed-double#1 from=model` (ts ...550791); 0 entities; `furniture` `[]`, `nextInstance` `{"bed-double":2}`, `historyLength` 2 |
| 4 | Undo the return | PASS | `[soglia] undo action=remove id=furniture:bed-double#1` (ts ...563345); `furniture:bed-double#1` exists again with the same id (index 65), `[soglia:state]`: x 6.8, z 1.125, `roomId` `bedroom`, `historyLength` 1 |
| 5 | Armchair released in the air (POUT2) | PASS | `furniture grabbed furniture:armchair#1 source=menu hand=right` (ts ...573362), `furniture returned furniture:armchair#1 from=menu` (ts ...583054); no `furniture:armchair#*` entity, only the bed remains |
| 6 | No room/gesture/limit; 0 error | PASS | no `room selected`, `miniature gesture`, `furniture limit reached` line; `level=[error,warn]` empty from ts 1791734400000 |
| 7 | Screenshot step 1 | PASS | `M3-gate-C1-S2.7-outside-house.png`: the bed with a red frame is in hand on the base, bottom right, partly outside the right edge of the view (the piece is 0.43 m to the side: this is normal); the white label with red border "Outside the house" is at the centre, entirely in the field of view, above the dimmed menu |
| 8 | Label "Outside the house" | PASS | 1 entity `ui:reason-bed-double#1` (index 68); `[soglia] reason shown furniture:bed-double#1 "Outside the house"` (ts ...458408); Transform (0.1130; 1.5611; -0.5880): **0.600 m**, **11.5 deg** (<= 30), orientation (0; -0.0948; 0; 0.9955) yaw-only; text whole and readable; after the release `reason hidden furniture:bed-double#1` (ts ...485757, 4 ms after `furniture returned`) and 0 `ui:reason-*` |

Differences due to M3: none detected for this scenario (no FitCheck label for pieces outside the house: `fit` `none`).

## S2.8 · Budget with 14 pieces of furniture (PASS, pinch=grip)

Run 1: `house=apartment-a&role=visitor&reset=1&seed=1&debug=1&furnish=scandinavian&pinch=grip`.

- Log: `[soglia] furniture models loaded=14 fallback=0`, `[soglia] furnish applied style=scandinavian pieces=14 invalid=0` (ts 1791734613109); 14 entities `furniture:*` (sofa-3seat#1, coffee-table#1, table-dining#1, chair#1-#4, bed-double#1, nightstand#1-#2, wardrobe#1, desk#1, bookcase#1, plant#1), all `status valid reasons -` (14 lines `furniture status ... status=valid reasons=-`), 0 `ui:reason-*`; sofa-3seat `x` 4.62 `z` 3.10 (<= 3.19), bookcase `x` 10.69 `z` 2.5 (<= 10.70); `[soglia] font ready family=inter weight=normal|bold atlas=512x512`; 0 `budget exceeded`/`framework:`/`Missing glyph`/`uncaught`/`unhandled`; `level=[error,warn]` empty.
- New in M3 on the preset pieces: `Furniture.fit` (sofa-3seat `blocked` for `door:d-living`, bookcase `fits`): does not change the `valid` state.

| Measure | scale | `callsPerView` | calls (2 views) | triangles | textures | fps (sw) | notes |
|---|---|---|---|---|---|---|---|
| Run 1 immediately (M-closed, 1st read) | 0.05 | **54** | 108 | 27,116 | 6 | 8 | with onboarding ghost hand (+4) and menu hint; `scene_get_render_stats` `calls` 108 = line |
| M-open | 0.05 | **63** | 126 | 30,472 | 8 | 7 | menu cost **+9** (63 - 54) |
| M-worst (menu open + armchair in hand over the bed + reason label + FitCheck label) | 0.05 | **67** | 134 | 31,188 | 8 | 7 | `ui:reason-armchair#1` + `reason shown furniture:armchair#1 "Overlaps the double bed"` (ts ...700015), `ui:fit-label` + `fit label shown ... "Fits: the narrowest door on the way is 80 cm wide"`, 2 `ui:fit-marker-*`; release outside `furniture returned furniture:armchair#1 from=menu` |
| M-closed at steady state (after the ghost hand and the hint) | 0.05 | **50** | 100 | 27,020 | 8 | 7-8 | tool `calls` 100 = line, `shadowCasters` 0 |
| M-closed | 0.12 | **50** | 100 | 27,020 | 8 | 6 | tool `calls` 100 = line |
| M-open | 0.12 | **59** | 118 | 30,376 | 8 | 6 | menu cost **+9** |
| M-worst | 0.12 | **67** | 134 | 31,148 | 8 | 5 | `ui:reason-armchair#1` + `reason shown ... "Overlaps the double bed"` (ts ...836533), `ui:fit-label`; `furniture returned ... from=menu` (ts ...861224) |

Zoom 0.05 -> 0.12 with the hands at z = -0.237 (not -0.487, known trap: `viewpoint:V1`): `miniature translated x=0.000 z=-0.300 source=two-hands`, `[soglia:state]`: `miniature {scale 0.12, offset [0.000065,-0.3]}`, root (0.000065; 1.35; -0.75). **The zoom recipe differs from M2's (z = -0.487): at 0.12 the model is moved by 0.3 m and the measurements are not comparable one to one with M2's rerun3 (40 / 49 / 53)**.
Profile `browser_profile` (rendering, informative, SwiftShader): frame p50 133 ms, p95 250 ms, 84 frames dropped out of 96: no meaning for the Quest.

### Runs 2, 3, 4

| Run | parameters (besides `role=visitor&reset=1&seed=1&debug=1&pinch=grip`) | `callsPerView` | calls | triangles | geometries | textures | fps (sw) | log |
|---|---|---|---|---|---|---|---|---|
| 1 (A + 14 pieces) | `house=apartment-a&furnish=scandinavian` | 54 (steady state 50) | 108 | 27,116 | 62 | 6-8 | 8 | see above |
| 2 (house B) | `house=apartment-b&furnish=scandinavian` | **34** | 68 | **21,456** | 46 | 6 | 9-10 | `[soglia] furnish: no staging in apartment-b` (`warn` level, ts 1791734888988), 0 entities `furniture:*`, no `error` |
| 3 (A without furniture) | `house=apartment-a` | **40** | 80 | **21,776** | 54 | 7 | 8 | 0 error/warn |
| 4 (blocks) | `house=apartment-a&failmodels=1&furnish=scandinavian` | **54** | 108 | **22,448** | 64 | 7 | 7 | `[soglia] debug failmodels=1: every furniture model fails to load` (ts 1791734947205); `[soglia] furniture models loaded=0 fallback=14`; 14 `warn` lines `[soglia] furniture model unavailable <id>: using a block` (bed-double, bed-single, sofa-3seat, armchair, table-dining, chair, coffee-table, desk, bookcase, wardrobe, nightstand, tv-stand, rug, plant: one per catalog entry with a model); `[soglia] furnish applied style=scandinavian pieces=14 invalid=0`; sofa `x` 4.62 `z` 3.10, bookcase `x` 10.69, all `valid`; tool `calls` 108 = line; `shadowCasters` 0; 0 `error`, 0 `Missing glyph`, 0 `budget exceeded` |

Screenshots: `M3-gate-C1-S2.8-worst-case-0.05.png` (run 1, worst case: recognisable beige models (sofa, table, chairs, bed, wardrobe, bookcase), the dimmed menu, two panels: green "Fits: the narrowest door on the way is 80 cm wide / Simplified check" and red "Overlaps the double bed", green markers on the doors; the house looks furnished) and `M3-gate-C1-S2.8-failmodels-blocks.png` (run 4: the same pieces as beige blocks with a dark front strip (small window), recognisable by size; two ghost hands and two `Menu` buttons).

### Checks

| # | Check | Result | Data |
|---|---|---|---|
| 1 | Run 1: `furnish applied ... pieces=14 invalid=0`, 14 entities, all `valid`, no `ui:reason-*`, sofa z <= 3.19, bookcase x <= 10.70 | PASS | see above |
| 2 | Run 2 house B | PASS | `furnish: no staging in apartment-b` (warn), 0 `furniture:*`, 0 error |
| 3 | `callsPerView` <= 100 and triangles <= 150,000 in EVERY measurement | PASS | maximum **67** (M-worst at 0.05 and 0.12), maximum triangles 31,188 |
| 4a | Internal targets: <= 70 calls per view and <= 60,000 triangles | PASS | max 67 / 31,188 (no notice) |
| 4b | Menu cost (expected ~ +9, notice if > 12) | PASS | 0.05: 54 -> 63 = **+9**; 0.12: 50 -> 59 = **+9** |
| 4c | Difference from run 3 | informative | 54 (steady state 50) - 40 = +14 (+10 at steady state) for 14 pieces (M2 rerun3: 49 - 35 = +14); triangles 27,116 - 21,776 = +5,340 |
| 5 | App textures <= 4 and each <= 1024; 0 `budget exceeded` | PASS | the two 512x512 font atlases (`font ready ... atlas=512x512`); 0 content (the glb files have no textures); renderer total 6-8 (framework + UIKit); 0 `budget exceeded`/`framework:` |
| 6 | `shadowCasters` 0, 0 error, 0 `Missing glyph` | PASS | `scene_get_render_stats` `shadowCasters` 0 (runs 1 and 4); `level=[error,warn]` empty in all runs (apart from the expected warn of house B and the 14 warns of the blocks) |
| 7 | tool `calls` = `[soglia:stats]` line with the menu closed | PASS | 108 = 108 (A, first read), 100 = 100 (steady state 0.05), 100 = 100 (0.12), 108 = 108 (blocks). With the menu open the tool was not used (known M2 note: `reading 'x'`), the source is the line |
| 8 | Table of the six measurements | PASS | above, with the label proof: `ui:reason-armchair#1` + `reason shown furniture:armchair#1 "Overlaps the double bed"` (0.05: ts ...700015; 0.12: ts ...836533) |
| 9 | Screenshot | PASS | above |
| 10 | Run 4 (blocks) | PASS | `failmodels=1: every furniture model fails to load`, `loaded=0 fallback=14`, 14 warn, `furnish applied ... invalid=0`, 14 entities all `valid`; sofa z 3.10 / bookcase x 10.69; callsPerView **54** (M2: 63; scenario note of 2026-10-10: 49-54 with one mesh per block); 22,448 triangles (M2: 22,264) |

**Comparison with M2's rerun3** (`qa/reports/M2-2026-10-06-rerun3.md`: 66 calls/view at 0.05 in the worst case, 53 at 0.12, 30.7k triangles): at 0.05 M-worst **67** (+1: the FitCheck label and the door markers of M3 offset the reduction of the block mesh and the lighter menu) and triangles 31,188 (+0.5k); M-closed steady state 50 (M2: 49, +1 for the two M3 `Menu` buttons minus the ghost hand that disappears); M-open 0.05 63 with the onboarding ghost hand still present (M2: 58: the difference is the ghost hand +4 and the Menu buttons +1). At 0.12: 50 / 59 / 67 against M2's 40 / 49 / 53: **+10 / +10 / +14, NOTICE not comparable**: M2 zoomed with the hands at z = -0.487 (centre unchanged), M3 uses z = -0.237 so as not to touch `viewpoint:V1` (known trap), so the model moves by 0.3 m (`translated z=-0.300`) and the scene entering the view cone changes; it is still <= 70 (at 0.12 the worst case is 67, so below the 70 notice).
The fps on the PC (SwiftShader, 5-10 fps) do not represent the Quest.

## S2.9 · Moving the model (PASS with NOTICES, pinch=grip)

Parameters `house=apartment-a&role=visitor&reset=1&seed=1&debug=1&furnish=scandinavian&pinch=grip`; O = (0; 1.35; -0.45), scale 0.05; hands at rest left (-0.30; 1.10; 0.10), right (0.30; 1.10; 0.10). Poses (corrected grip): B1 (0.388; 1.383; -0.487), B2 (-0.312; 1.383; -0.487).

| # | Check | Result | Data |
|---|---|---|---|
| 1 | One hand, drag (poses B1 -> (0.238; 1.383; -0.487)) | PASS | `pan start hand=right` (ts 1791735046637), `miniature translated x=-0.150 z=0.000 source=pan`, `pan end hand=right` (ts ...056822); `miniature:root` (-0.15; 1.35; -0.45), scale 0.05; no `miniature gesture start`/`room selected`/`furniture grabbed`; screenshot `M3-gate-C1-S2.9-pan-left.png`: model moved to the left and still in the field of view, hint "Palm up for the menu" above, two `Menu` buttons at the sides, no overlap with the buttons |
| 2 | No vertical drift | PASS | rise of 0.10 m: `pan start`/`pan end` without a `translated` line; root y 1.35 (1.3500000238) |
| 3 | Horizontal limit | PASS | `miniature translated x=-0.300 z=0.000 source=pan`, root (-0.30; 1.35; -0.45) |
| 4 | Diagonal limit (poses (0.088; 1.383; -0.487) -> (0.088; 1.383; 0.113)) | PASS | `miniature translated x=-0.134 z=0.268 source=pan`; root (-0.1342; 1.35; -0.1817): radius 0.300, y 1.35 |
| 5 | Recenter (two hands: left Q_UP, right pinch on `ui:menu-recenter` (0.1149; 1.4364; -0.4744) with pose (0.1529; 1.4394; -0.5114), `xr_select` 0.2 s) | PASS | `[soglia] miniature recentered scale=0.0500` (ts ...160324); `menu closed mode=palm via=palm` (ts ...161285); root (0; 1.35; -0.45), scale 0.05; `[soglia:state]` `"offset":[0,0]`, `"scale":0.05`, `historyLength` 0 |
| 6 | Pinch on the piece (plant, pose (-0.182; 1.393; -0.4545)) | PASS | `furniture grabbed furniture:plant#1 source=model hand=right` (ts ...171911), no `pan start`/`translated`/`room selected`; release: `[soglia] furniture placed furniture:plant#1 room=living x=1.10 z=4.37 rot=0 status=valid` (ts ...181280); in addition (M3) `fit label shown furniture:plant#1 "Fits: the narrowest door on the way is 80 cm wide"` and `fit label hidden` 8 s later |
| 7a | Room selected | PASS | `[soglia] room selected living area=23.9` (ts ...198106), no `pan`/`translated` |
| 7b | Pinch inside a room (LV, pose (-0.137; 1.393; -0.487)) | PASS | no `pan start`/`translated`/`furniture grabbed` line; root still (0; 1.35; -0.45) |
| 8 | Piece in hand + left pinch on the base | PASS | right holds (`furniture grabbed furniture:plant#1 source=model hand=right`, ts ...228937), left on B2 with `xr_select` 0.2: `furniture rotated furniture:plant#1 rot=90` (ts ...239379), no `pan start`/`miniature gesture start`; release `furniture placed furniture:plant#1 room=living x=1.10 z=4.37 rot=90 status=valid` (ts ...249730); root unchanged |
| 9 | Promotion pan -> two hands | PASS | `pan start hand=right` (ts ...265137) at B1, then left pinch at B2: `[soglia] pan upgrade hand=right to=two-hands` and `[soglia] miniature gesture start` (ts ...272550, same ms); on release `miniature gesture end scale=0.0500 yawDeg=0.0 tiltDeg=0.0` (ts ...281931); root (0; 1.35; -0.45), no `room selected` |

### S2.9 · resumed after the interruption (429): steps 10-12

The session was restarted (new page, new XR session): restart from zero with `house=apartment-a&role=visitor&reset=1&seed=1&debug=1&furnish=scandinavian&pinch=grip` (load ts 1793622338693; `furnish applied style=scandinavian pieces=14 invalid=0`), page reloaded with offset 0 and scale 0.05 (`miniature placed x=0.000 y=1.350 z=-0.450 yawDeg=0.0 scale=0.0500`): the starting Recenter of step 10 is not needed (root already at O). Hands at rest as in the scenario.

| # | Check | Result | Data |
|---|---|---|---|
| 10a | Enlarge to 0.12 (hands at z = -0.237 instead of -0.487, known trap: with z = -0.487 the pinch enters `viewpoint:V1`) | PASS with NOTICE | left pose (-0.112; 1.453; -0.237) -> (-0.562; ...), right (0.188; ...) -> (0.638; ...), 0.5 s each; `[soglia] miniature gesture start` (ts 1793622371527), `[soglia] miniature gesture end scale=0.1200 yawDeg=0.0 tiltDeg=0.0` (ts ...379857) and `miniature translated x=0.000 z=-0.300 source=two-hands`; no `furniture grabbed`/`room selected`/`viewpoint`. **NOTICE**: `miniature:root` = (0.000065; 1.35; -0.75), i.e. z = -0.75 and not O (-0.45) as check 10 asked ("O +- 0.01"): with the hands at z = -0.237 the midpoint (pivot) is 0.21 m closer to the head than the M2 position and the model moves by 0.30 m (0.30 m limit reached). Scale 0.12, yaw 0 and tilt 0 are correct. Screenshot `M3-gate-C1-S2.9-scaled-moved.png`: the enlarged house fills the lower part of the view (plinth edges and rooms, beige furniture on the right, blue viewpoint markers), the hint "Palm up for the menu" and the two `Menu` buttons remain visible and are not covered |
| 10b (1st attempt) | Drag at 0.12 from the scenario points moved with the model (plan (5.55; 3.6) and (7.25; 3.6) -> world (0.006; 1.45; -0.75) and (0.210; 1.45; -0.75), poses (0.044; 1.453; -0.787) / (0.248; 1.453; -0.787)) | **NOT VALID (unsuitable point, rule 10b)** | the two pinches start (`pinch left start` ts 1793622424515, `pinch right start` ts ...425248) but **no** `miniature gesture start`/`pan start`/`translated` appears and the root stays (0.000065; 1.35; -0.75): no `furniture grabbed`/`room selected`. Probable cause: with the model moved to z = -0.75 the points are 0.76 m from the head, beyond the useful reach of the pinches for the gesture (the project's interactions are within ~0.6 m). The step does not count and another point is chosen (below) |
| 10b (2nd attempt, points chosen on the nearest free base) | same scheme with the hands at z = -0.337 (pinch z = -0.30, plan z = 7.35, outside the house and on the base: margin > 1 m from the footprints): left (0.044; 1.453; -0.337) -> (0.244; ...), right (0.248; 1.453; -0.337) -> (0.448; ...) | PASS with NOTICE | `miniature gesture start` (ts 1793622486111), `miniature gesture end scale=0.1200 yawDeg=0.0 tiltDeg=0.0` (ts ...502663), `[soglia] miniature translated x=0.166 z=-0.250 source=two-hands` (ts ...502668); root (0.1664; 1.35; -0.6996), height unchanged, scale 0.12, yaw 0, tilt 0; no `furniture grabbed`/`room selected`. **NOTICE**: the expected offset `x=0.200 z=0.000` is not reached because the model was already at offset (0; -0.30) after step 10a (hands at z = -0.237): the requested offset (0.20; -0.30) has radius 0.36 > 0.30 and is projected onto the circle, exactly (0.166; -0.250) (radius 0.300). So the 0.30 m clamp works; the deviation is a consequence of the zoom recipe at z = -0.237, not of a defect. Screenshot `M3-gate-C1-S2.9-scaled-dragged.png` |
| 11 | Rotation and translation together, without Recenter (from the same free points of 10b moved with the model: pinch at plan z = 7.35, pivot M = (0.308; 1.45; -0.30), r = 0.102; stages 30 / 60 / 90 deg + 0.10 in x; poses 30: L (0.2577; 1.453; -0.286) R (0.4343; ...; -0.388), 60: L (0.295; ...; -0.2487) R (0.397; ...; -0.4253), 90: L (0.446; ...; -0.235) R (0.446; ...; -0.439)) | PASS | `miniature gesture start` (ts 1793622560275), `[soglia] miniature gesture end scale=0.1200 yawDeg=90.0 tiltDeg=0.0` (ts ...588422), `miniature translated x=0.008 z=0.292 source=two-hands` (radius 0.292 <= 0.301); `miniature:root` (0.0081; 1.35; -0.1583), orientation (0; 0.7071; 0; 0.7071) = yaw only, scale 0.12 (unchanged), height 1.35; no `furniture grabbed`/`room selected`/`viewpoint`. Screenshot `M3-gate-C1-S2.9-rotated.png`: the model rotated by 90 deg and brought closer to the head (seen from above-side: wall, beige furniture and a pink bed on the left, blue viewpoint marker), hint and `Menu` buttons not covered |
| 12 | Unfiltered console, head | PASS | `level=[error,warn]` empty from ts 1793622338000 (start of the resume load) and filter `uncaught|unhandled|Cannot read|undefined|Missing glyph|budget exceeded` empty; `xr_get_transform` of the head: (0; 1.6; 0), identity orientation: no locomotion; no `room selected` line in the resume load |
| 13 | `npm test` / pan and claim tests | PASS | `npm test` (run at the start of the work): 75 files, 4465 tests green; `vitest run miniature-pan pinch-claims pinch-claims-matrix`: 203 tests green |

**Differences from M2 due to M3 and notices for S2.9**
1. (NOTICE, recipe) Zoom at z = -0.237 instead of -0.487 (and consequently root at z = -0.75 and offset (0; -0.30) after step 10a): in M3 the viewpoint markers (`viewpoint:V1` at ~0.02 m from the pinch) capture the pinch at z = -0.487. Check 10 ("root at O +- 0.01 after the enlargement") not met to the letter; scale, yaw and tilt correct.
2. (NOTICE, consequence) `translated x=0.166 z=-0.250` instead of `x=0.200 z=0.000` at 10b: the 0.30 m clamp projects (0.20; -0.30) onto the circle; it is the correct behaviour of the limit. To get the expected figure a Recenter would be needed (which however brings the scale back to 0.05) followed by a zoom with an unchanged centre, not possible without touching a marker with the scenario's recipe.
3. (NOTICE, points) The scenario's 10b points (plan (5.55; 3.6) / (7.25; 3.6)) with the model at z = -0.75 are ~0.76 m from the head and the two-hand gesture does not start (no log); rule 10b applied: points on the nearest free base (plan z = 7.35, 0.34 m from the head), reported above; nothing else changed.
4. (M3 difference, positive) The `Menu` button and the viewpoint markers stay away from the pinches of steps 1-9 (B1, B2, steps 6-9: no pinch captured by them); Recenter (step 5) with menu v2 works as in M2 (`miniature recentered scale=0.0500`, offset `[0,0]`, `historyLength` 0).
5. (M3 difference) The pinch that picks up `furniture:plant#1` also shows the FitCheck label (`fit label shown ... "Fits: the narrowest door on the way is 80 cm wide"`), which disappears 8 s after the release.

---

## C1 summary: M2 regressions in the emulator (HEAD 123f4e4)

**C1 verdict: PASS** (all scenarios S2.0-S2.9 remain PASS after the M3 changes; no FAIL; no console error; budget respected).

| Scenario | Result | Pinch used |
|---|---|---|
| S2.0 glyphs | PASS | n/a |
| S2.1 palm menu | PASS (M3 NOTICES) | complete grip + reduced auto |
| S2.2 place the bed | PASS | complete grip + reduced auto |
| S2.3 collision | PASS | grip |
| S2.4 undo | PASS | grip |
| S2.5 rotation | PASS | complete grip + reduced auto |
| S2.6 door blocked | PASS (procedure NOTICE) | grip |
| S2.7 return to the catalog | PASS | grip |
| S2.8 budget | PASS (numeric NOTICES) | grip |
| S2.9 moving the model | PASS (NOTICES) | grip |

Blocking criteria (user rule 2026-10-06): (a) console errors: **0** in all scenarios (`level=[error,warn]` empty, except the expected warns of S2.8: `furnish: no staging in apartment-b` and 14 `furniture model unavailable ... using a block`); (b) test/build: `npm test` 4465 green (build not rerun in this part); (c) violations of `CLAUDE.md`: none detected (hands only, no locomotion: head always (0; 1.6; 0); texts in English; no `Missing glyph info`); (d) > 100 calls per view: **no**, maximum **67** (S2.8 M-worst at 0.05 and 0.12), maximum triangles 31,188 (<= 150,000), app textures: 2 atlases of 512 px.
Closing of F-A (M2): the pinch of the menu hand with the menu open no longer selects the room (S2.1 8f, also with `pinch=auto`): 0 `room selected` in the whole S2.1.

## Notices

1. S2.1 (intentional M3 changes): `ui:menu-button-left/-right` (2 entities with `PanelUI`) in the pattern `^ui:(palm-menu|menu-)` even with the menu closed; lines `menu opened hand=left mode=palm` / `menu closed mode=palm via=palm`; tabs `ui:menu-tab-*` in place of the title; new line `menu item picked id=... hand=right`; tabs at 0.63 m from the head (within 0.65); coordinates of the 2x3 grid changed (bed-double (-0.0953; 1.6746; -0.5720)).
2. S2.2/S2.3/S2.5/S2.6/S2.8: orange/green FitCheck label (M3) coexisting with the reason label and covering part of the dimmed menu and of the bed in flight; `Furniture.fit`/`fitDoor`; green markers on the doors (orange in M2).
3. S2.6 (procedure): with the menu open the pinch at the centre of the room (pinch point (0.065; 1.39; -0.505)) is taken by the `ui:menu-recenter` button (0.075 m; in M2 0.092 m): the scenario written with the menu "held up for the whole scenario" cannot be run to the letter at step 6; menu closed to complete the step.
4. S2.8: M-worst 67 calls/view (M2 rerun3: 66) at 0.05; at 0.12 50 / 59 / 67 against M2's 40 / 49 / 53 (+10 / +10 / +14) because the zoom recipe at z = -0.237 moves the model; menu cost +9 (expected); run 4 (blocks) 54 calls/view (M2: 63); onboarding: ghost hand (+4) and hint present in the first measurement (54), steady state 50.
5. S2.9: see points 1-3 of the S2.9 section (root at z = -0.75, `translated x=0.166 z=-0.250`, moved 10b points).
6. S2.1 step 8e (palm too short) skipped: MCP latency 1.2-2.1 s for each wait > 0.35 s; covered by `tests/unit/palm.test.ts`.
7. A spurious `menu opened hand=right` of 0.12 s appeared in S2.1 during the sequential lowering of the two hands (known artefact of sequential MCP calls).

## What the emulator does not prove (to add to `qa/device/DEBT.md`)

- Precision and comfort of the pinches with real hands: `auto` pinch point (midpoint of the tips, ~6.5 cm from the grip) compared with the `gripSpace` point; capture radius of the `Menu` and `Recenter` buttons and of the viewpoint markers near the pieces (S2.6) with real fingers at 0.5 m.
- Palm up/down detection (0.4 s / 0.25 s, thresholds 35/55 degrees) and involuntary closing of the menu with tremor, with real hands.
- Comfort of menu v2 (text >= 2.4 cm, 2x3 grid, tabs) in the narrow field of view and at 0.5-0.63 m; overlap of the labels (FitCheck + reason) on the dimmed menu.
- Real fps and time per frame (the PC is SwiftShader at 5-10 fps; p50 133 ms in the S2.8 profile): the budget of draw calls (max 67 per view) and triangles (31.2k) must be measured on the Quest with the menu open, a piece in hand and the two labels.
- Reach radius of the two-hand pinches with the model at 0.12 moved to 0.75 m (S2.9 10b: no gesture at 0.76 m from the head), comfort of the 0.30 m limit.
- Rendering of the texts, of the glyphs `² · × °` and of the colours on the headset displays; perception of scale in stereo; microphone and passthrough (not exercised here).

## Procedure traps (for the orchestrator's memory)

- After a restart of the runtime/session the CLI/MCP has a new tab (`generation` restarts): repeat reload -> `xr_accept_session` -> `xr_set_input_mode hand`.
- `browser_interact`: a single wait after `browser_profile start` and `3000 + 2000` in the same batch are rejected; use a single wait <= 3000 ms. Each `wait` lasts ~1-1.7 s more than the value (latency).
- With the menu open and the right hand on the room-centre pinch point (0.065; 1.39; -0.505) the `ui:menu-recenter` button wins over the piece (S2.6 step 6): close the menu (palm down) before picking the piece up again.
- Menu v2 follows the palm hand: for page changes with the same hand recompute the pose after each move (1-2 corrections), pose = item + (-0.038; +0.0159; -0.0335) with `Q_UP`.
- Pose to pinch with `pinch=auto`: target + (0; 0.025; 0.012), `xr_select` >= 0.4-0.5 s; wrist rotation: pose = G - R_y(a)*o with o = (0.0005; -0.0249; -0.0119) (right).
- Avoid the log patterns that capture `[soglia:state]` (with the furniture preset it is huge) or `furniture status` (14 lines) with a high `count`; use `since` and narrow filters (`soglia\] (...)`).
- S2.9 10b at 0.12: after the zoom at z = -0.237 the model is at z = -0.75 (0.76 m from the head) and the two-hand gesture does not start: use the points on the base nearest to the head (plan z = 7.35, hands at z = -0.337) and accept that the clamp (0.30 m) gives `translated x=0.166 z=-0.250`.
- `dev-params.local.txt` must be rewritten with `pinch=grip` (the `params` line prints `pinch=grip`; with `auto` the field does not appear and `input source=joints` confirms the mode).
- Time: session 1 from 15:30 UTC on 11/10 for about 2 h 15 min (S2.0-S2.9 step 9), resume session (after the 429) about 15 min.
