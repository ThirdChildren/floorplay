# S3.10 · Distance grab and measure at real scale (ONLY IF T3.15 IS DONE)

> **Note 2026-11-14 (UI fixes)**: every step or criterion of this scenario about the tape measure (the `Measure` tab, `ui:measure-*`, `measure ...` log lines, the `AppState.tool` field) is REMOVED with the feature: skip it. The rest still applies.

**Milestone**: M3 · **Type**: PC (IWER emulator via MCP `iwsdk-runtime`) · **`CLAUDE.md` rules**: 1, 2 (seated, no locomotion), 8
Implementation prerequisites: T3.12 (viewpoints), T3.14 (tape measure), T3.15 (ray from the hand). See `docs/plans/M3.md`, D38 and the 20-minute spike of T3.15. **If T3.15 is cut** (it is cut first) this scenario is not run: the report writes "S3.10 not applicable: real scale, grab only within arm's reach" and the entry goes in `qa/device/DEBT.md` and in the Devpost. Common conventions: `qa/scenarios/M3-persistence.md`; viewpoints: `qa/scenarios/M3-viewpoint.md`.

## Preconditions
- Outcome of the T3.15 spike written in `docs/plans/M3.md` ("Spike outcomes"): how the ray of `player.raySpaces[hand]` is oriented in IWER (`xr_set_transform` with `orientation`, or `xr_look_at` on the hand; trap R3 of M2 to verify) and whether its direction is reproducible. **The scenario is not run without this outcome.** If the ray is not reproducible, the task moves to M5/M7 and the scenario does not apply.
- `dev-params.local.txt` = `house=apartment-a&role=visitor&reset=1&seed=1&debug=1&pinch=grip&furnish=scandinavian`; standard setup; head at (0; 1.6; 0); enter `viewpoint:V1` (S3.1 step 2): `root` = (2.60; 0.40; 0.30). World position of a floor-plan point in V1: `(px − 2.9; 0.4 + h; pz − 3.3)`.
- Pieces out of reach (> 0.6 m from the head) in V1: `furniture:sofa-3seat#1` at (4.62; 3.10) → world (1.72; ·; −0.20), horizontal distance 1.73 m; `furniture:bookcase#1` at (10.69; ·) is in another room.

## Steps
1. **Ray**: `hand-right` at (0.25; 1.15; −0.25) with the orientation the spike outcome indicates to point at the floor under the sofa (`xr_look_at` or quaternion); `xr_select {device: "hand-right", duration: 0.3}` **not** on a piece within reach. Log `pattern: "furniture|ray|pinch"`.
2. **Distance grab**: hand pointed at the center of the sofa, `xr_set_select_value` 1, wait 0.4 s: `furniture grabbed furniture:sofa-3seat#1 source=…` (the source `distance` or equivalent, cited in the report); while the pinch lasts, `xr_animate_to` of the hand to point at another free spot in the living room (`(1.5; 3.0)` on the floor plan → world (−1.4; ·; −0.3)), the piece follows the intersection point; rotation with the wrist as in D19; release: `furniture placed furniture:sofa-3seat#1 …` with snapped pose and coherent `status`; `Furniture` of the piece before and after; undo brings back the previous pose.
3. **Distance measure**: `measure` tab, two pinches pointed at the ends of the window `win-study` or, in V1, at two corners of the room (the report computes the expected value from the geometry of `apartment-a.json`: distance between the inner faces of the walls); log `pattern: "measure"`.
4. **No locomotion**: `xr_get_transform` `headset` identical before and after (± 0.001).
5. Unfiltered log (`error`); cleanup as in S3.0.

## Checks (all mandatory, if applicable)
1. The ray grabs the piece pointed at and **not** another one nearby (the closest to the intersection point, on a tie the closest center); no grab when the ray does not hit the floor of the model.
2. The piece follows the intersection point without jumps over 0.1 m between two consecutive readings; the final pose, the state (`valid`/`invalid`) and the reason follow the same rules as S2.2/S2.3; a single entity `furniture:sofa-3seat#1` in every reading.
3. Distance measure: `measure result cm=<n>` consistent with the geometry (±2 cm for points snapped to faces/corners).
4. Head unchanged; no `viewpoint transition` line; no `error`.
5. **Headset only**: precise ray from the hand without jumps with the real hand; comfort when seated.

## Outcome
PASS if checks 1-4 are met · FAIL otherwise · "not applicable" if T3.15 was cut.

## To defer to the headset
"Distance grab" entry of M3 in `qa/device/DEBT.md` (medium).

## Changelog
- 2026-10-09: scenario created from the M3 plan (D38, T3.15 cuttable).
