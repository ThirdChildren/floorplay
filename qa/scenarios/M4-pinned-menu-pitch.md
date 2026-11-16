# S4.7 · `pinned` menu in the 30° cone even with the gaze tilted

> **Changelog 2026-11-02**: scenario created from the M4 plan (D49 R2, T4.R2; carry-over 2 of the M3 gate, `contest-reviewer` warning on rule 8). Before M4 the pitch window was +5.1° / −7.1° (S3.8 cone check with the gaze level).

**Milestone**: M4 · **Type**: PC (IWER emulator via MCP `iwsdk-runtime`) · **`CLAUDE.md` rule**: 8 (field of view: panels at 0.5–0.8 m, in the 30° cone)
Implementation prerequisites: T4.R2 (T4.6a for the last step). See `docs/plans/M4.md`, D49 R2; `docs/plans/M3.md`, D32 ("Outcome of T3.3a"). Conventions: `qa/scenarios/M4-issue-create.md`.

## Preconditions
- `dev-params.local.txt` = `house=apartment-a&role=visitor&reset=1&seed=1&debug=1&pinch=grip`; standard setup (head (0; 1.6; 0), identity orientation `(0, 0, 0, 1)`, `O` = (0; 1.35; −0.45)).
- **Gaze pitch** (rotation around +X; positive = looking up), quaternion `(x, y, z, w)` to set with `xr_set_transform` on the `headset` (position (0; 1.6; 0)): **+10°** `(0.0872; 0; 0; 0.9962)`; **+5°** `(0.0436; 0; 0; 0.9990)`; **0°** `(0; 0; 0; 1)`; **−8°** `(−0.0698; 0; 0; 0.9976)`; **−12°** `(−0.1045; 0; 0; 0.9945)`; **−14°** `(−0.1219; 0; 0; 0.9925)`; **−20°** `(−0.1736; 0; 0; 0.9848)`; **−25°** `(−0.2164; 0; 0; 0.9763)`. (Alternative: `xr_look_at` `headset` toward a point at 1 m with the right height; report which.)
- Right "Menu" button: hand at (0.4727; 1.498; −0.6035), `xr_select {duration: 0.2}` (the position of the buttons does not depend on the gaze).
- Expected (anchor = bottom-center of the panel; the `Transform` of `ui:palm-menu` is the center, about 0.179 m higher): anchor height `1.40 + 0.55·tan(c)` with `c = clamp(g, −8°, +8°)`; panel center: **c = +8°** y ≈ 1.656; **+5°** 1.627; **0°** 1.579; **−8°** 1.502; z ≈ −0.55 in all cases (head with yaw 0).

## Steps
For each of the pitches `g` ∈ {0°, +5°, +10°, −8°, −12°, −14°} (**PASS**) and {−20°, −25°} (**informative**):
1. Set the pitch of the `headset`, wait 1.5 s.
2. Open with the button: pinch on the right "Menu" button, wait 1 s. Log `pattern: "menu"` (lines `menu opened hand=right mode=pinned`, `menu view maxAngleDeg=<a> distance=<d>`, `menu pinned pitchDeg=<g> anchorPitchDeg=<c>`); `ecs_find_entities` `^ui:palm-menu$` (→ 1); `ecs_query_entity` on `ui:palm-menu` with `["Transform"]` (→ `P`); `browser_screenshot` only for 0°, −8° and −14° → attach.
3. Close with the same button (`menu closed mode=pinned via=button`); bring the `headset` back to identity before the next round.

Then: (4) **anchor of the Issues panel** (T4.6a): for `g` ∈ {0°, −12°}: `ui:issue-button-right` (hand at (0.4727; 1.568; −0.6035)), log `pattern: "issues panel"` (`issues panel view maxAngleDeg=<a> distance=<d>`), close with `ui:issue-close`; (5) **a single regression reading** with the head at identity: the line of S3.8/S3.7 `menu view maxAngleDeg=26.1 distance=0.59` (± 0.2) and `P` = (0; 1.579; −0.55) ± 0.01 as in M3.

## Checks (all mandatory)
1. **Angle in the cone**: for `g` ∈ {0, +5, +10, −8, −12, −14} the line `menu view maxAngleDeg` has **a ≤ 30.0** and `distance` between **0.50 and 0.65**. In M3 with `g` = −12° and −14° the value was > 30 (window −7.1°): the comparison goes in the report.
2. **Compensation**: `menu pinned pitchDeg=<g> anchorPitchDeg=<c>` with `c` = +8.0 for +10°; +5.0; 0.0; −8.0 for −8°, −12°, −14° (clamp); the height of the panel center follows the table in the preconditions (± 0.015 m).
3. **Vertical panel and yaw only**: the `Transform` has rotation around Y only (x and z of the rotation ≈ 0) in every case (no tilted text).
4. **Distances** (rule 8): title and controls at 0.50–0.80 m from the head (the title beyond 0.65 is a warning; the items ≤ 0.65); no gross overlap with the miniature: the anchor at −8° is at ≥ 1.32 m (information for the headset, `DEBT.md` entry).
5. **Informative**: −20° and −25°: report `maxAngleDeg` (expected 31–36° and 36–42°): these are **declared warnings** (beyond −15° the menu does not follow the gaze so as not to cover the miniature), not FAIL.
6. **Regression (step 5)**: with the head at identity the M3 numbers do not change (`26.1` and `distance=0.59`, center (0; 1.579; −0.55)).
7. **Issues panel** (step 4): `issues panel view maxAngleDeg` ≤ 30.0 at 0° and at −12°.
8. No `error` entries; no `NaN` in the lines.
9. **Headset only** (high): comfort of the anchor at −8° (does not cover the miniature), real pitch window; entry "`pinned` menu with pitch" in `qa/device/DEBT.md`.

## Outcome
PASS if checks 1–8 are met · FAIL otherwise. If only the −14° case fails by less than 0.5°, it is a warning (the theoretical margin is 1°).

## To defer to the headset
See check 9.
