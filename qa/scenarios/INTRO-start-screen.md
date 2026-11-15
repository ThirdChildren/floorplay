# SI.1 · Start screen, house file, furniture sizes, Enter VR

**Milestone**: INTRO (start screen) · **Type**: PC (IWER emulator, headless) · **Rules of `CLAUDE.md`**: 1 (hands), 4 (quick start, pause and resume), 5 (feature detection), 8-9 (accessibility), 11
Related: `src/ui/intro-screen.ts`, `src/logic/catalog-sizes.ts`, `src/logic/intro.ts`, `docs/DATA_FORMATS.md` (size overrides, `intro`).

## Preconditions
- Dev server up: `npx @iwsdk/cli dev up --ai-mode agent --headless --allow-browser-automation` (the last flag is only needed for step 3, the file upload, and for navigating to a URL with `browser run`; every other step uses `browser interact`, `browser snapshot`, `xr`, `ecs` and `browser logs`).
- Navigate with `browser run` and a one-line script that calls `frame.goto(url)`, or write `dev-params.local.txt` and `browser reload` (the file is read by the page; a URL query beats it).
- Clean state: URL `?house=apartment-a&role=visitor&reset=1&seed=1&debug=1&hud=0`. **`reset=1` keeps the furniture sizes and the loaded houses**: start with "Reset all to default" (step 4) if the profile is not clean.
- Buttons are found by role and accessible name (`browser interact` with `locator: {role: "button", name: ...}`); stable ids are in `data-soglia` (`intro-enter-vr`, `intro-furniture`, `intro-load-house`, `size-<id>-<axis>-input`, ...).

## Steps
1. **Start screen first.** Open the URL. `browser screenshot`: a start screen with the title, the selected house card ("Two-bedroom apartment, 78 m²"), buttons `Load house file`, `Furniture`, `Enter VR`. `xr status`: `sessionActive: false`, `sessionOffered: false`. Logs: `intro shown`, `intro screen=home`, `app ready`; no tabletop on screen. Repeat with `&contrast=1&text=large`: black background, yellow Enter VR, larger text.
2. **Enter VR.** Click `Enter VR` (a trusted click, which is the user gesture). `xr status`: `sessionActive: true`, `sessionMode: immersive-vr`. Logs: `enter vr requested`, `intro hidden reason=session-started`. Press `F7` (debug menu key): the pinned menu opens. `xr exit`: log `intro shown reason=session-ended` and the start screen is back. The same return from inside the session, with one hand: the control "Back to home" of the menu (`qa/scenarios/HOME-back-to-home.md`).
3. **Load a house file.** `browser run` a script that clicks `Load house file`, then `locator('input[type=file]').setInputFiles({name, mimeType: 'application/json', buffer: <public/houses/apartment-c.json>})`. Logs: `house file loaded id=file-apartment-c rooms=10 areaM2=126.1`, `house file selected id=file-apartment-c`; the page opens again with `?house=file-apartment-c`; the card says "Three-bedroom apartment, 126 m²". Click `Enter VR`: `ecs find` `^house:` gives `house:file-apartment-c`. A wrong file (not JSON, or a JSON that is not a house) shows the red message and the selected house does not change.
4. **Furniture sizes.** Click `Furniture`. The list has the 14 furniture items with `Now: 160 × 200 × 95 cm`, three rows each (Width, Depth, Height) with `−` `+` buttons, a number box and `Allowed a to b`. Then:
   - Click `Make the width of the double bed larger` twice: 170 cm, `Changed` tag, summary `1 piece changed`, button `Apply and go back`, message `Saved. Press "Apply and go back" ...`; log `catalog size set id=bed-double axis=width cm=170`.
   - Type `abc` in the plant height box and press Tab: `Type a number of centimetres.`, red box, nothing saved. Type `1000` in the bed depth: `Too large. Use 50 to 400 cm.`. Type `9` in the bed width: `Too small. Use 40 to 400 cm.`.
   - `Reset to default: Double bed`: back to 160, summary `No piece changed`. `Reset all to default` needs two presses (the first one changes its text to `Press again to reset all` for 4 s).
5. **Sizes applied everywhere.** URL `...&furnish=scandinavian`. Set the double bed width to 165 and the chair width to 60, click `Apply and go back` (the page opens again, logs `catalog sizes applying items=2` then `catalog sizes applied items=2`). Logs after the load: `furniture resized id=furniture:bed-double#1 drawn=165x200x95 size=165x200x95cm` (the drawn model equals the new size) and the same for the chairs (`60x50x85`). Enter VR, `F7`: the cards read `Double bed 1.65 × 2.0 m` and `Chair 0.6 × 0.5 m`. Collision footprints use the new size (unit tests `catalog-sizes.test.ts`).
6. **Reset=1 keeps the sizes.** Open the URL of step 1 again with `reset=1`: log `catalog sizes applied items=2` (the sizes are still there) while the saved house state was cleared (`state cleared reason=reset`, not `state restored`).
7. **Reload and resume.** With pieces placed (`furnish=scandinavian` once with `reset=1`, then the same URL without `reset` and `furnish`): the page opens on the start screen (no session), log `state restored pieces=14`, `ecs find ^furniture:` gives 14 only after `Enter VR` is pressed (they exist behind the screen) and the tabletop has the pieces.
8. **`intro=0`.** `?intro=0&house=apartment-a&role=visitor&reset=1&seed=1&debug=1&hud=0`: log `intro skipped reason=intro0`, no start screen, `xr status` `sessionOffered: true`, `xr enter` works as in the older scenarios, the floating homes box is on the page.
9. **Unsupported browser** (optional): load the page with `navigator.xr` removed before the app runs (an init script on the context). The Enter VR button is disabled and the message says "This browser has no WebXR ...". The app does not throw (`feature navigator.xr unavailable`).
10. `browser logs` with `level: ["warn","error"]` since the start of the run: nothing except `THREE.WebGLRenderer: Can't change size while VR device is presenting.` (known, present with `intro=0` too).

## Checks (all required)
1. Step 1: the start screen is visible and `sessionActive` is false until Enter VR is pressed; three entries in the order Load house file, Furniture, Enter VR; the selected house is shown; text is English only.
2. Step 2: Enter VR starts `immersive-vr`; the screen hides; ending the session shows it again.
3. Step 3: the loaded house becomes the selected house and is the one VR opens; invalid files are refused with a message.
4. Step 4: limits and messages as written (limits are a quarter to three times the catalog size; the rug stays 1-2 cm tall); per-item and global reset; two presses for the global one.
5. Step 5: `drawn` equals `size` for resized pieces; menu cards show the new size; unchanged pieces keep the catalog size.
6. Step 6: `reset=1` does not remove `soglia:v1:catalog-sizes` (nor the loaded houses).
7. Step 7: the reload shows the start screen and Enter VR resumes the saved layout.
8. Step 8: `intro=0` keeps the old entry (session offered).
9. No errors in the console in the normal path; no controller needed anywhere (the screen works with a mouse or a hand pointer).
10. Headset: see the INTRO rows of `qa/device/DEBT.md`.

## Result
PASS if checks 1-9 hold on the emulator · FAIL otherwise.
