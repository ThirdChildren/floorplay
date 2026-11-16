# S4.6 · Real scale with one hand only: the "Tabletop" button

> **Changelog 2026-11-02**: scenario created from the M4 plan (D49 R1, T4.R1; carry-over 1 of the M3 gate, `contest-reviewer` warning on rule 9).
> **Changelog 2026-11-02 (after T4.R1, before any run)**: the entity `ui:tabletop-button` always exists and is hidden outside real scale (like `ui:menu-button-*`): at the miniature "1 non-visible entity" is checked (`Visibility.isVisible` false), not "0 entities"; expected maximum angle 24.7° (button 0.13 × 0.05 m). No criterion changes in meaning.

> **Changelog 2026-11-06 (M5 gate, F-C2-3)**: the entry/exit duration in IWER reaches 747 ms (717 ms in B): IWER tolerance **250 ≤ n < 1000 ms = PASS** (700 < n < 1000 "known IWER warning"), n ≥ 1000 FAIL; the nominal 250–700 ms check is **headset only** (see `qa/scenarios/M3-viewpoint.md`, same date). No other criterion changes.

**Milestone**: M4 · **Type**: PC (IWER emulator via MCP `iwsdk-runtime`) · **`CLAUDE.md` rules**: 2 (you move only between viewpoints with a fade), 8 (field of view), 9 (one hand only)
Implementation prerequisites: T4.R1 (T3.12 already exists). See `docs/plans/M4.md`, D49. Conventions: `qa/scenarios/M4-issue-create.md`.

## Preconditions
- `dev-params.local.txt` = `house=apartment-a&role=visitor&reset=1&seed=1&debug=1&pinch=grip`; standard setup (head (0; 1.6; 0), `O` = (0; 1.35; −0.45), scale 0.05).
- **One hand only**: in all steps except 5 **only `hand-right`** moves; the left stays at rest `(−0.30; 1.10; 0.10)`, select 0.
- Marker `viewpoint:V1` at (−0.130; 1.4375; −0.465) → right hand at (−0.092; 1.4405; −0.502). "Tabletop" button expected at (0; 1.38; −0.55) → hand at (0.038; 1.383; −0.587). At real scale (V1) the miniature sits at (2.60; 0.40; 0.30) with scale 1 (S3.1).

## Steps
1. **Enter** `viewpoint:V1` with the right hand only: `ecs_query_entity` on `viewpoint:V1` and `miniature:root` with `["Transform"]` (→ `M1`, `R0`); `hand-right` at `M1 − D_GRIP`; `xr_set_select_value` to 1, wait **0.8 s**, to 0 (the held pinch is enough both with the confirmation of T4.R6 and without); wait 2.5 s. Log `pattern: "viewpoint|tabletop|menu button|walls"`; `xr_get_transform` `headset` (→ `H1`).
2. **The button is there, the previous buttons are not**: `ecs_find_entities` `^ui:tabletop-button$` (→ 1), `^ui:menu-button-` and `^ui:issue-button-` (absent or not visible: if the entity is there, `ecs_query_entity` must not give it a useful position or the line `menu button view` does not appear in the current session), `^ui:palm-menu$` (→ 0); `ecs_query_entity` on `ui:tabletop-button` with `["Transform"]`; `ui_inspect` (text `Tabletop`, `fontSize`); `browser_screenshot` → attach (the view from the viewpoint with the button in the lower part, ~22° below the gaze).
3. **Return with the right hand only**: `hand-right` at (0.038; 1.383; −0.587) (or at the pose read from the `Transform` minus `D_GRIP`), `xr_select {device: "hand-right", duration: 0.3}`, wait 2.5 s. Readings: log `pattern: "tabletop|viewpoint|walls|miniature|pinch left"`; `miniature:root` (→ `R2`); `xr_get_transform` `headset`; `ecs_find_entities` `^ui:tabletop-button$` (→ 1, with `Visibility.isVisible` false), `^viewpoint:` (→ 3), `^table:plinth`, `^ui:menu-button-` (present and visible again).
4. **With a piece in hand the button does not react**: re-enter V1 (step 1); the left at `L_MENU` with `Q_UP` (wait 0.9 s), the right takes `ui:menu-item-chair` from the menu and **holds**; the left (palm down) pinches the "Tabletop" button (`hand-left` at (0.038; 1.383; −0.587), `xr_select {device: "hand-left", duration: 0.3}`): log `pattern: "tabletop|viewpoint|furniture"`; then release the piece in the room (`furniture placed`) and pinch again (with the right): return. (This is the only step that uses the left.)
5. **Re-anchoring**: re-enter V1; `xr_set_transform` `headset` at (0; 1.6; 0) with orientation `(0, 0.5, 0, 0.8660)` (rotation of +60° around Y: the gaze points to −x); wait 2 s; `ecs_query_entity` on `ui:tabletop-button` with `["Transform"]`; log `pattern: "tabletop"`. Bring the head back to identity `(0, 0, 0, 1)`, wait 2 s, the `Transform` again. Return with the button.
6. **Suspension and resume**: re-enter V1; `press` `F8` (`debug=1`), wait 1 s, `press` `F9`, wait 1 s: `ecs_find_entities` `^ui:tabletop-button$` (→ 1); pinch: return.
7. Unfiltered log (`error`, `Cannot read`, `reading 'add'`, `Missing glyph`); cleanup.

## Checks (all mandatory)
1. **Step 1**: `viewpoint entered id=V1 …` (the duration is a warning if > 700 ms: IWER frame rate, see S3.1); `miniature:root` at (2.60; 0.40; 0.30) ± 0.01; no `pinch left` line.
2. **Step 2**: **1** `ui:tabletop-button`; the line `[soglia] tabletop button shown distance=<d> maxAngleDeg=<a>` with `d` between **0.50 and 0.80** (expected 0.59) and `a` **≤ 30.0** (expected 24.7: **inside the cone**, not a fallback entry); `Transform` at (0; 1.38; −0.55) ± 0.03 with rotation around Y only (x and z ≈ 0); the text is `Tabletop` and `fontSize` ≥ 2.4 cm; the "Menu" and "Issues" buttons are not visible; no palm menu.
3. **Step 3**: lines `tabletop button pressed hand=right` and `viewpoint exited id=V1 durationMs=<n>` (250 ≤ n ≤ 700 at 72 fps; **warning** up to 1000 for the IWER frame rate, as S3.1), `walls rebuilt cut=1.00`; `R2` = `R0` ± 0.001 (the miniature comes back identical); `H2` = `H1`; 1 non-visible `ui:tabletop-button`; 3 `viewpoint:*`; the "Menu" and "Issues" buttons present again (2 + 2); **no** `pinch left` or `menu opened hand=left` line: all done with one hand.
4. **Step 4**: `tabletop button ignored reason=piece-held` (or no exit) with the piece in hand; the pinch of the other hand rotates the piece (`furniture rotated furniture:chair#1 …`); after placement, the button works.
5. **Step 5**: after rotating the head by 60° the button re-anchors within 2 s in front of the gaze: new position at (−0.476; 1.38; −0.275) ± 0.05 (0.55 m in front, 0.22 below the eyes) and the line `tabletop button reanchored`; with the head back at identity it re-anchors at (0; 1.38; −0.55) ± 0.05; never farther than 0.8 m or beyond 30° from the resting axis.
6. **Step 6**: after `F8`/`F9` the button is still there and works; the viewpoint does not change because of the suspension (D35).
7. No `error` entries; no `Missing glyph`; no `reading 'add'`.
8. **Headset only** (high): the button can be reached and read when seated with one hand; it is not pressed by mistake while taking a piece; the re-anchoring does not disorient.

## Outcome
PASS if checks 1–7 are met · FAIL otherwise. Before M4 this scenario failed at check 2 (no one-hand return button at real scale; M3 gate warning).

## To defer to the headset
"One-hand real scale" entry of M3/M4 in `qa/device/DEBT.md`.
