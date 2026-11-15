# WALK on the viewpoints: PC report (2026-11-15)

**Gate**: PC only (IWER headless, throwaway runtime on port 8791, copy of the workspace; the Quest server on 8081 untouched). Branch
`claude/dig-walk`. Plan `docs/plans/WALK.md`, scenario `qa/scenarios/WALK-row.md`. Nothing here was run on a headset.

## Result

| Check | Result |
|---|---|
| `npm run typecheck`, `npm run build` | clean |
| `npm test` | 6933 passed, 1 failed: the known `tests/unit/quest-scripts.test.ts:441` |
| Tabletop column | Menu, Issues, View; no `ui:walk-button-*` entity (`ecs find`), no Walk inside button in `tabletop-four-buttons.png` |
| Pinch on `viewpoint:V1` (right hand, IWER joints) | `viewpoint transition start id=V1`, `walk hint shown`, `walk started x=2.9 z=3.3 yawDeg=0 eye=1.2`, `viewpoint entered id=V1 eye=1.20 durationMs=443`; store `view` = `viewpoint V1` |
| Rowing with the `fist` pose (`WALK-row.helper.mjs`) | `walk hint done reason=stroke`; three strokes: peaks 5.7 / 5.6 / 1.5 m/s, body moved z 3.3 -> 0.345 (stops at the north wall, 0.125 + 0.22), speed decays to 0 in the settle; one fist alone: speed 0; fists in the lap or raised: reason `zone`; pinch: reason `pinch`, then `lockout`, then `ok` |
| Store after the walk | `view` = `{"kind":"walk","x":2.9,"z":0.345,"yawDeg":0}` (replaces the viewpoint once the body moved) |
| Reload (no `reset`), `xr enter` | `walk started x=2.9 z=1.017 ... eye=1.2`, `walk restored x=2.9 z=1.017`, no `walk hint shown` |
| Tabletop (`__sogliaWalk.leave()`) | `walk ended`, `viewpoint exited id=walk`, `view` = `tabletop` |
| Console | no errors or warnings in the path |

Screenshots: `real-scale-walked.png` (at the north wall after the rows), `restored-walk.png`, `tabletop-four-buttons.png`.

## Not run in IWER

- Controllers only: entering a viewpoint needs a pinch, which IWER only gives with hands, so the notice path (`[soglia] feature hand
  joints unavailable`, once) was not driven; it is `noticeNoHands`, unchanged except for the once-per-page guard.
- Everything about the real hand pose, comfort and speed on the Quest: `qa/device/DEBT.md`, rows WALK.
