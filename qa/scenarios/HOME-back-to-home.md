# HOME - Back to home (palm menu control that returns to the start screen)

Branch `feat/back-to-home`. The control `ui:menu-home` ("Back to home") sits at the right end of the header of the palm menu, in
the row of the tabs (Items / Mine) or the title. One pinch ends the immersive session; the start screen of the page (Load house
file, Furniture, Enter VR; plan: `qa/scenarios/INTRO-start-screen.md`) is shown again. Nothing is lost, so there is no confirm step:
every action is saved as it happens, the life cycle saves again when the session ends (`state saved ... reason=end`), and a draft of
a new issue cannot be open while the menu is (the menu and the Issues panel never show together). A piece held in the other hand
is cancelled by the life cycle exactly as when the headset is taken off.

## Setup
`npm run dev` is not enough: use a scratch runtime on a free port (not the Quest server on 8081): `dev-params.local.txt` with
`house=apartment-a&reset=1&debug=1&seed=1&role=tenant` (for step 1) and `...&intro=0` (for step 4). `xr set-input-mode` `hand`.

## Steps
1. **Intro on.** Click `Enter VR`, press `F7` (pinned menu). The header reads `Items | Mine | Back to home`. Pinch `ui:menu-home`
   (`ecs query` its position; hand at position + (-0.029, +0.0015, +0.045), `xr set-select-value` 1 then 0). Logs in this order:
   `back to home requested landing=intro`, `lifecycle suspended source=session state=non-immersive`, `state saved ... reason=end`,
   `menu closed mode=pinned via=suspend`, `pinch right end`, `intro screen=home`, `intro shown reason=session-ended`. `xr status`:
   `sessionActive: false`; screenshot: the start screen. No panel entity is left (`ecs find palm-menu` is empty).
2. **Enter VR again.** Click `Enter VR`: `lifecycle resumed source=session state=visible`, `intro hidden reason=session-started`; the
   menu is closed (palm up or F7 opens it again), the model is where it was, the house, role and pieces are the saved ones.
3. **At real scale.** Pinch a blue viewpoint marker (V1), wait for `viewpoint entered id=V1`, open the menu (it has the same control),
   pinch `Back to home`: logs add `walk ended`, `plinth visible=true`, `viewpoint suspended reason=session-end` (the table is back,
   the saved view is NOT rewritten). `Enter VR` again: `viewpoint restored id=V1`, `walk started`, `viewpoint entered ... durationMs=0`.
4. **`intro=0`.** Same, with `&intro=0`: pinch `Back to home`: `back to home requested landing=page`; the session ends and the plain
   page (the floating box of the homes) shows; `xr enter` starts a new session and resumes the saved state.
5. **Another house.** On the start screen after step 1: `Load house file`, `Use this house: Apartment B` (page reloads). The card
   says "One-bedroom apartment, 55 m2"; `Enter VR`: `ecs find ^house:` gives `house:apartment-b` (its own saved state, per house).
6. **Guards.** `F7` outside a session and a pinch cannot happen (the control needs a session): the log says `back to home ignored
   reason=no-session` when the function is called with none (unit test). A second pinch while the session is ending is ignored
   (`already-leaving`, unit test); the lock clears when `sessionend` arrives or after 4 s.
7. `browser logs` since the start: no warning or error except `THREE.WebGLRenderer: Can't change size while VR device is presenting.`

## Checks (all required)
1. Step 1: the control exists with the id `ui:menu-home`, the label is "Back to home", and the session ends from one hand pinch.
2. Step 1: the start screen is shown again, with no reload and no leftover panel; Step 2: the next session resumes the saved state.
3. Step 3: a viewpoint or walk spot is restored after the round trip; the store keeps the `viewpoint` view.
4. Step 4: with `intro=0` the session ends and the plain page shows.
5. Step 5: another house opens fresh from the start screen.
6. The tabs `Items` and `Mine` still work (neighbours of the control) and nothing else moved in the menu: the menu is still 36 x 37.6 cm.
7. Headset: see the HOME rows of `qa/device/DEBT.md`.

## Result
PASS if checks 1-6 hold on the emulator - FAIL otherwise. Last PC run: 2026-11-15, see `qa/reports/back-to-home/` (screenshots)
and `qa/reports/HOME-2026-11-15.md`.
