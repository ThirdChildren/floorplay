# WALK-row: walking inside the tabletop model by rowing with both fists

**Type**: PC (IWER, headless). **Rules**: 2 (amended), 3, 5, 8, 9. Plan: `docs/plans/WALK.md`.

## Setup

`dev-params.local.txt` = `house=apartment-a&reset=1&debug=1&intro=0&seed=1`. Start with
`npx @iwsdk/cli dev up --ai-mode agent --headless --allow-browser-automation` (the last flag only to evaluate the helpers below with
`browser run`). `browser reload`, `xr enter`, `xr set-input-mode {"mode":"hand"}`. The emulator head is at y = 1.6 and the hands
default to (+-0.25, 1.5, -0.4), which is not the chest zone: the helper places the fists at `y = head - 0.35`, `z = -0.717` (the wrist
joint is 0.117 m behind the hand position, so the wrist is 0.6 m ahead).

Helper `qa/scenarios/WALK-row.helper.mjs` (copy it inside the workspace, `npx @iwsdk/cli browser run <copy> --timeout 90000`). IWER's hand
has only the open (`default`), `pinch` and `point` poses, so the helper registers a `fist` pose on both hands (finger joints except
the metacarpals pulled to 0.47 of their distance to the wrist: tips about 8.5 cm from the wrist), then moves
`IWER_DEVICE.hands.left|right.position` every 50 ms and samples `window.__sogliaWalk.status()`. Two `xr animate-to` calls run one after
the other, so they cannot make a two-hand stroke: use the page-side helper. It prints the numbers of steps 4-9.

## Steps and expected results

| # | Step | Expected |
|---|---|---|
| 1 | Tabletop view, session on | `ui:walk-button-right` exists above `ui:view-button-right`; screenshot shows "Walk inside" at the top of the column |
| 2 | Pinch the button (hand set to the button minus the pinch offset; `xr select` 0.6 s) | `walk button pressed`, any open View/Issues/menu closes, `walk transition start`, fade out/swap/in 250-1000 ms (IWER), `walk started x=2.9 z=3.3 yawDeg=0 eye=1.6`, `walk entered`; `ui:walk-hint` shows once |
| 3 | `status()` | `walking:true`, `x=2.9, z=3.3`, speed 0 |
| 4 | Open hands (IWER `default` pose) at the chest, hold and stroke | `left:"fist", right:"fist"` (reason: not a fist), speed 0 |
| 5 | Both fists (`fist` pose) at the chest, hold | `left:"ok", right:"ok"` |
| 6 | Both fists stroke back 0.3 m in 0.5 s, 3 times (return fast) | speed rises to 0.5-1 m/s (never > 1), `z` decreases (walks along the gaze, -z), vignette up to ~0.85, speed decays to 0 within ~2 s after the last stroke, `walk stopped` |
| 7 | One fist strokes, the other holds still | speed stays 0 |
| 8 | Fists in the lap (head - 0.9) or raised at the face (head - 0.05) | reason `zone`, speed 0 |
| 9 | Fists sweep sideways 0.4 m; then both hands pinch (`updatePinchValue(1)`) and stroke | speed 0; reason `pinch`; after the release the reason is `lockout` for 0.4 s, then `ok` |
| 10 | Face the north wall and walk (`drive(1, 8)` or strokes) | the body stops at `z = 0.125 + 0.22 = 0.345`, speed bleeds to ~0.4-0.5 and decays; no tunnelling |
| 11 | Turn the head 90 degrees (`xr set-transform headset orientation yaw -90`) and drive at 45 degrees into a wall | the body slides along the wall |
| 12 | Walk x to 4.0 (door `w-living-hall` is x 3.6-4.4), face south (`yaw 180`), drive 7 s | the body passes the door and stops at `z = 5.855` (hall south wall) |
| 13 | Walk at the entrance door (x 6.0-6.9 of `w-south-hall`, z 6.2) | the body cannot leave the house (stops at `z = 5.855`) |
| 14 | Console | no errors; `[soglia:stats]` calls per view +1 only while the vignette shows |
| 15 | `browser reload` (no `reset`), `xr enter` | `walk restored x=.. z=..` at the saved spot, no hint |
| 16 | `xr exit`, `xr enter` | walk restored at the same spot (`viewpoint suspended reason=session-end` before) |
| 17 | F8 (hidden) | speed 0, position in the store; F9 (visible): walk continues |
| 18 | "Tabletop" button or `__sogliaWalk.leave()` | fade, `walk ended`, `viewpoint exited id=walk`, `view` is `tabletop`, model back on the table, Walk button back |
| 19 | `xr set-input-mode controller`, request the walk | not entered, `[soglia] feature hand joints unavailable`, notice "Walking needs hand tracking. Put the controllers down." |

## What IWER cannot show

The `fist` pose is synthetic (a scaled copy of IWER's open hand): the real finger curl of hand tracking, its noise, how a real pinch
and a real fist differ in the joints, and the comfort of the stroke are headset items (`qa/device/DEBT.md`, rows WALK). The pinch with
loose fingers and the single pointing finger are covered by `tests/unit/row-gesture.test.ts` only.
