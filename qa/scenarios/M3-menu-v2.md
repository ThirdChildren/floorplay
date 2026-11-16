# S3.8 · Menu v2: text ≥ 2.4 cm, tabs, 30° cone and room label in the cone

> **Note 2026-11-14 (UI fixes)**: every step or criterion of this scenario about the tape measure (the `Measure` tab, `ui:measure-*`, `measure ...` log lines, the `AppState.tool` field) is REMOVED with the feature: skip it. The rest still applies.

> **Note 2026-11-14 (UI fixes)**: every step or criterion of this scenario about the FitCheck (door-fit label `Fits` / `Won't fit` / `Fits when disassembled` / `No route`, `ui:fit-label`, `ui:fit-marker-*`, the `fit` menu tab, the wheelchair and stroller pieces) is REMOVED with the feature: skip it. The rest still applies.

**Milestone**: M3 · **Type**: PC (IWER emulator via MCP `iwsdk-runtime`) · **`CLAUDE.md` rules**: 8 (field of view, distances, nothing critical at the edges), 9 (large text)
Implementation prerequisites: T3.5 (menu v2), T3.6 (room label in the cone), T3.8 (`mine` and `fit` tabs with data). See `docs/plans/M3.md`, D37; closes warnings W2 (text under 2.4 cm) and A4 (label without cone check) of `qa/reports/M2-2026-10-06-rerun3.md`. Common conventions (poses, `D_GRIP`, `Q_UP`, gate rule): `qa/scenarios/M3-persistence.md`.

## Preconditions
- `dev-params.local.txt` = `house=apartment-a&role=visitor&reset=1&seed=1&debug=1&pinch=grip`; standard setup; head at (0; 1.6; 0) **and never rotated**; `O` = (0; 1.35; −0.45); scale 0.05.
- Room centers in world coordinates (x, z): living room (−0.145; −0.515), bedroom (0.065; −0.515), study (0.210; −0.515), bathroom (−0.210; −0.335), hallway (0.065; −0.360). Pinch on a room: `hand-right` at (Cx; 1.6; Cz + 0.02) with `xr_look_at` toward (Cx; 1.35; Cz), `xr_select {device: "hand-right", duration: 0.3}`.
- Expected labels (`<name> · <area> m²`, area from the polygon, one decimal): `Living room & kitchen · 23.9 m²`, `Bedroom · 14.7 m²`, `Study · 12.0 m²`, `Bathroom · 6.8 m²`, `Hallway · 13.4 m²`.
- The ids of the panel texts are read with `grep -n 'id=' public/ui/palm-menu.uikitml`; `ui_inspect {entityIndex, selector: "#<id>", properties: ["fontSize","text"]}` accepts only one id at a time (1 unit = 1 cm); the entity `ui:palm-menu` is found again with `ecs_find_entities` at each opening.

## Steps
1. **Openings and tabs**: `hand-left` at `L_MENU` with `Q_UP`, wait 0.9 s. `ecs_find_entities` with `^ui:palm-menu$`, `^ui:menu-tab-`, `^ui:menu-item-`, `^ui:menu-(undo|page-prev|page-next|recenter|tabletop)$`; log `pattern: "menu|catalog"`, `count: 12`; line `menu view`; `browser_screenshot` → attach.
2. **Pages of the `items` tab**: as S2.1 step 5 (Next, Next, Next, Prev): `ecs_find_entities` with `^ui:menu-item-` and `^ui:palm-menu$` (same entity index) and log `pattern: "menu page"` at each step.
3. **Other tabs**: pinch on `ui:menu-tab-mine`, then `ui:menu-tab-fit`, then `ui:menu-tab-measure`, finally `ui:menu-tab-items` again (right, hand at `item − D_GRIP`, `xr_select 0.2`, wait 0.5 s at each step): `ecs_find_entities` with `^ui:menu-item-` after each; log `pattern: "menu tab|menu page|measure"`.
4. **Texts**: for `items` (page 1 and page 2, which has `Bookcase`, `Wardrobe`, `Nightstand`) and for the `mine` and `fit` tabs: `ui_inspect` with `properties: ["fontSize","text"]` on **every** text (title, name and size line of all items, 4 tabs, Undo, Back, Next, Recenter/Tabletop). Panel width: `ui_inspect` on the root (`width` in cm; if not possible, the `menu view` of the log).
5. **Room labels** (menu closed, palm down): for the 5 rooms, pinch as in the preconditions; after each pinch `ecs_find_entities` with `^ui:room-label$`, `ecs_query_entity` on `ui:room-label` with `["Transform"]` (→ `L`), `ui_inspect` of the text; log `pattern: "room"`. From `L` compute: distance `|L − (0; 1.6; 0)|`, angle `acos(−dz / |d|)`, rotation (yaw-only: x and z ≈ 0). For the most lateral room (**bathroom**, bottom left) and for the **study** (right) attach `browser_screenshot`.
6. **Regression**: S1.3 (exact texts), S2.1 checks 2, 3, 3b, 4; the piece in hand still dims menu v2 (S2.1 step 13).
7. Unfiltered log (`error`, `Missing glyph`, `Cannot read`); cleanup as in S3.0.

## Checks (all mandatory)
1. **Structure (step 1)**: 1 `ui:palm-menu`; tabs `ui:menu-tab-items`, `-mine`, `-fit`, `-measure` (4); 6 `ui:menu-item-*` items in the `items` tab (same order as M2: `bed-double`, `bed-single`, `sofa-3seat`, `armchair`, `table-dining`, `chair`), plus `ui:menu-undo`, `ui:menu-page-prev`, `ui:menu-page-next`, `ui:menu-recenter` (and **not** `ui:menu-tabletop`, which exists only at real scale). The ids and log lines of the `items` tab are those of M2 (S2.1 remains valid): `menu page 2/3 items=coffee-table,desk,bookcase,wardrobe,nightstand,tv-stand`, `menu page 3/3 items=rug,plant`.
2. **Tabs**: `menu tab mine` → `menu page 1/1 tab=mine items=my-sofa,my-desk,my-bed` and 3 items; `menu tab fit` → `menu page 1/1 tab=fit items=wheelchair,stroller` and 2 items; `menu tab measure` → line `measure start` (the tool activates, no furniture item); `menu tab items` → `measure end` and 6 items again on page 1/3. No tab without data is shown with placeholder text.
3. **Text (W2 closed)**: **every** text read in step 4 has `fontSize` ≥ **2.4 cm** (names, sizes, tabs, buttons, title), including `Bookcase`, `Wardrobe`, `Nightstand` (in M2 2.24/2.21/2.02); if a name does not fit, shorten the size line (`1.6×2.0`) before going below 2.4. Any text under 2.4 cm: FAIL (rule 9).
4. **Menu geometry**: panel width **≤ 0.38 m**; line `menu view maxAngleDeg=<a> distance=<d>` with **a ≤ 30.0** and d between 0.50 and 0.60 for every opening (also with `Q_UP` and with the `pinned` menu of S3.7); every item and every tab at a distance of 0.50-0.65 m from the head (≥ 0.499) and within 30° (`acos(−dz/|d|)` from the `Transform`); distance between items ≥ 0.06 m; the title does not go beyond 0.70 m (warning if between 0.65 and 0.70; it was A5 of M2).
5. **Room labels (A4 closed)**: the texts are those in the preconditions list (±0.1 m² on the area); for **all 5** rooms `ui:room-label` is at a distance **≥ 0.52 m and ≤ 0.80 m** from the head, **within 30.0°** of the view axis (warning up to 30.5°), yaw-only (x and z of the rotation ≈ 0, tolerance 0.01) and with `fontSize` ≥ 2.4 cm; for the bathroom and the study the screenshot shows the **whole** text (not cut by the edge) and the report describes the position relative to the room (anchored on the edge of the cone if the room is outside it). Only one label at a time (single `room-label`).
6. **Regression**: S1.3 and S2.1 PASS with the same checks; in particular the living room label is exactly `Living room & kitchen · 23.9 m²`.
7. No `error` entries; no `Missing glyph info`; no `budget exceeded` lines.
8. **Headset only** (high): readability at 0.5 m of the 2.4 cm texts; the largest panel stays in the narrow field of view; tabs and pages selectable with the real pinch.

## Outcome
PASS if checks 1-7 are met · FAIL otherwise. Numeric deviations (0.495 m, 30.2°) are warnings; text under 2.4 cm or an angle above 30.5° without anchoring is FAIL (rules 8 and 9).

## To defer to the headset
Entries "Menu v2" and "Room label in the cone" of M3 in `qa/device/DEBT.md`; they replace the M2 entries on text < 2.4 cm (W2) and A4.

## Changelog
- 2026-10-10 (T3.5, no criterion changed): reading note. With **two tabs or more** the header is the row of tabs and **the title "Furniture" is not drawn** (with a single tab, as before T3.8, the title is drawn and there are no tabs): at step 4 the "title" text is read only in the second case. The frame of the palm menu sits at 0.50–0.52 m (`MENU_FRAME_MAX_DISTANCE`), inside 0.50–0.60 of check 4. To test the tabs before T3.8 and T3.14 with `debug=1`: key `F6` (`browser_interact` `press`), which turns on `mine`, `fit` and `measure`; the `measure` tab does not write `measure start` yet.
- 2026-10-09: scenario created from the M3 plan (D37, T3.6).
- 2026-10-10 (T3.8 and T3.14, no criterion changed): the development key F6 no longer exists. The `Mine` and `Fit` tabs appear on their own (T3.8) and the `Measure` tab on its own with the tape measure (T3.14); the steps that cited F6 are run without pressing anything.
