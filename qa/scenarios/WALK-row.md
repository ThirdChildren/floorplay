# WALK-dig: walking inside the tabletop model with the dig gesture

**Type**: PC (IWER, headless). **Rules**: 2 (amended), 3, 5, 8, 9. Plan: `docs/plans/WALK.md`.

## Setup

`dev-params.local.txt` = `house=apartment-a&reset=1&debug=1&intro=0&seed=1`. Start with
`npx @iwsdk/cli dev up --ai-mode agent --headless --allow-browser-automation` (the last flag only to evaluate the helpers below with
`browser run`). `browser reload`, `xr enter`, `xr set-input-mode {"mode":"hand"}`. Hands default to (+-0.25, 1.5, -0.4), above the
eyes (head y 1.2), so they are out of the dig zone until placed at `y=0.85, z=-0.6` with `xr set-transform`.

Helper (page side, through `browser run` with `frame.evaluate`): a stroke moves `IWER_DEVICE.hands.left|right.position` (a Vector3,
`.set(x, y, z)`) every 50 ms from `z0` to `z1` and back while it samples `window.__sogliaWalk.status()`. Two `xr animate-to` calls run one
after the other, so they cannot make a two-hand stroke: use the page-side helper.

## Steps and expected results

| # | Step | Expected |
|---|---|---|
| 1 | Tabletop view, session on | `ui:walk-button-right` exists above `ui:view-button-right`; screenshot shows "Walk inside" at the top of the column |
| 2 | Pinch the button (hand set to the button minus the pinch offset; `xr select` 0.6 s) | `walk button pressed`, any open View/Issues/menu closes, `walk transition start`, fade out/swap/in 250-1000 ms (IWER), `walk started x=2.9 z=3.3 yawDeg=0 eye=1.6`, `walk entered`; `ui:walk-hint` shows once |
| 3 | `status()` | `walking:true`, `x=2.9, z=3.3`, speed 0 |
| 4 | Hands flat, palms down, at `y=0.85, z=-0.6` | `left:"ok", right:"ok"` |
| 5 | Both hands stroke back 0.3 m in 0.5 s, 3 times (`z0=-0.6, z1=-0.25`) | speed rises to 0.3-0.6 m/s (never > 1), `z` decreases (walks along the gaze, -z), vignette 0.1-0.5, speed decays to 0 within ~2 s after the last stroke, `walk stopped` |
| 6 | One hand strokes, the other holds still | speed stays 0 |
| 7 | Both hands palms up (`roll 180`) and stroke | speed 0, reason `palm` |
| 8 | Both hands pinching (`xr set-select-value` 1 on both) and sweep | speed 0, reason `pinch`; the model does not zoom or turn (real scale) |
| 9 | Release the pinches | after 0.4 s reason `ok` again |
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

The gesture reads the joints of IWER's synthetic hand (open, palm down); fingers cannot be bent, so "fist" and "pinch pose without the
select event" are covered by `tests/unit/dig-gesture.test.ts` only. Real hand-tracking noise, comfort and speed are headset items
(`qa/device/DEBT.md`, rows WALK).
