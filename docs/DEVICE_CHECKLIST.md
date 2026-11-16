# Headset checklist

To be run with a Meta Quest (3 or 3S) when it is available. Each item: ✅ ok, ❌ problem (with
a note), ➖ not applicable. Results go in `qa/device/<milestone>-<date>.md`.
Checks deferred while the headset is not available are listed in `qa/device/DEBT.md` (one row per item,
with priority: this checklist is the index, DEBT.md the detail with the numbers to compare against).
Step-by-step guide for the user (Fedora, adb, certificate, remote debugging, Meta VR CLI):
`docs/QUEST_SETUP.md`. Plan and order of the sessions: `docs/plans/M6.md`.

> **Status 2026-11-16 (owner's device test)**: the owner tested the latest features on the Quest (everything after the
> 2026-11-11 session: start screen and Enter VR, Back to home, UI-FIX/UI-POLISH, palm menu pinch fix, walk/row gesture,
> viewpoint markers, house files) and reported that everything works. No numbers were given. A checked box `[x]` below
> means "passed on the headset" (owner's test of 2026-11-16, or the 2026-11-11 session where noted). An unchecked box
> marked 🟨 means "works per the owner's test 2026-11-16; measurement not recorded" (fps, draw calls, triangles,
> cold start, network requests, console warnings, exact distances or angles): it stays open until the number is
> written in a report in `qa/device/`. An unchecked box without a mark was not covered. Details per row:
> `qa/device/DEBT.md`.

> **Changelog 2026-11-16**: status marks added after the owner's device test (see above); the whole document was translated to English and the project renamed from Soglia to Floorplay (the literal runtime strings `[soglia:...]` and `soglia:v1:*` keep their names).

> **Changelog 2026-11-12**: mixed reality taken up again as the opt-in feature `?mr=1` (user decision of 2026-11-11): the ➖ item becomes a check to be done.

> **Changelog 2026-11-07** (M6 plan, reports from `quest-integrator`): (1) M5: the "sun shadows" no longer
> exist, they are **light patches** (D55 of M5); (2) M5: **mixed reality is cut and outside the gate**
> (`mr=1` has no effect), explicit decision D74 of the M6 plan; (3) M4: system keyboard and microphone **not
> implemented** (D40), ➖ items; distance grab of M3 ➖ (T3.15 cut); (4) added the items present in DEBT.md and
> missing here: fixed buttons `Menu`/`Issues`/`View`/`Tabletop`, View panel, info points, Furnish/Clear,
> `Rotate`, coach, cold start under 10 s, `handTracking` required or optional; (5) `[soglia:stats]` requires
> `?debug=1`; (6) the server is **self-signed HTTPS even on `localhost`**; (7) `dev-params.local.txt` also applies on the headset
> if the page comes from the development server. Added the section "M6 tools" (HUD, `[soglia:env]`, tuning). **Update 2026-11-07 (evening, T6.A12)**: phase A is implemented, the section "M6 tools" describes what really exists (proven only on the PC).

## Setup (once)

- [x] Developer mode active (Meta Horizon app on the phone → headset → Developer mode; a developer
      organisation on the Meta site is needed first: see `docs/QUEST_SETUP.md`, section 3). (Done: the 2026-11-11 session ran.)
- [x] `adb devices` sees the headset (on Fedora: `sudo dnf install android-tools`; if needed, udev rule for the
      USB vendor `2833`). (Done: the 2026-11-11 session ran.)
- [x] App reachable: development server `npx @iwsdk/cli dev up --no-open` (**self-signed HTTPS on port
      8081, even on `localhost`**: the Quest Browser shows a certificate warning the first time, for each
      address, and it must be accepted). Via USB: `adb reverse tcp:8081 tcp:8081` and `https://localhost:8081/?debug=1`;
      via Wi-Fi: `https://<pc-ip>:8081/?debug=1`. Always read the port from `dev status`. (Done: the 2026-11-11 session ran.)
- [ ] 🟨 IWER does **not** activate on the headset (rule for the OculusBrowser user agent): no emulator
      controls on screen. (Works per the owner's test 2026-11-16; the `iwer=no` console line was not recorded.)
- [x] Remote debugging: Chromium on the PC → `chrome://inspect/#devices` → console of the page on the headset
      (the 2026-11-11 session used the CDP channel of `quest:console`).
- [ ] Meta VR CLI: it is already a development dependency (`@meta-quest/metavr`, installed by `npm ci`); it is used with
      `npx metavr ...` and downloads its program from the Meta CDN at first launch (see
      `docs/QUEST_SETUP.md`, section 5.3). No global installation is needed. (Not reported.)
- [x] **`[soglia:stats]` exists only with `?debug=1`** (every 2 s: fps, calls, triangles; with `debug=1` also
      `[soglia:stats:groups]`). Without `debug=1` the console has no performance numbers. (Seen in the 2026-11-11 log.)
- [ ] **Parameters from file**: `dev-params.local.txt` (project root, one line, no `?`) works **also on the
      headset** if the page comes from the development server (not from the public build); a parameter in the URL beats
      the one in the file. Delete it at the end of the check. (Not reported.)
- [x] Hands active in the headset settings (Hand tracking), controllers put away and switched off.

## Always, at every milestone

- [x] No controller switched on: everything is completed with the hands.
- [x] Seated, without getting up or reaching beyond ~60 cm.
- [ ] 🟨 fps ≥ 60 along the whole path of the milestone (target 72); note draw calls and triangles (from
      `[soglia:stats]`, with `debug=1`). (Works per the owner's test 2026-11-16; measurement not recorded. The 2026-11-11 session measured 90 fps, minimum 82 over 191 s, 20–24 calls per view.)
- [x] Text readable without effort; essential UI at the centre of the view.
- [ ] 🟨 No errors in the console (remote debugging). (Works per the owner's test 2026-11-16; console not recorded.)
- [x] Take the headset off and put it back on: the app resumes from where it was left.
- [x] No Italian string visible.
- [ ] 🟨 **Local hands**: with the network blocked (or `cdn.jsdelivr.net` unreachable) the hands are visible
      (glb files in `public/models/hands/`), no `[xr-input] Failed to load visual asset` warning. (Works per the owner's test 2026-11-16; network and console not recorded.)
- [ ] 🟨 **Controller check**: switch the controllers on and restart the session. A local grey capsule
      is seen (not the Meta model), no request to `cdn.jsdelivr.net` starts and the app
      never requires them (it remains fully completable with the hands). (Not individually reported.)

## M0 · Startup and environment

- [ ] 🟨 **Is `handTracking: true` required or optional?** The session starts with the hands active; without hands (or with
      tracking switched off) the app must remain startable. (Works per the owner's test 2026-11-16 with hands; the no-hands case was not recorded.)
- [ ] 🟨 **Cold start under 10 s** (from pressing the link to the tabletop model visible; bundle 6.57 MB, 1.68 MB gzip). (Seconds not recorded.)
- [ ] 🟨 No request to `unpkg.com`, `api.dicebear.com` or `cdn.jsdelivr.net` (not even with the controllers
      switched on): DevTools Network tab. (Not recorded.)
- [ ] 🟨 `renderer.xr.getCamera().cameras.length` is 2 (field `views=2` of `[soglia:stats]`). (Not recorded.)
- [x] `localStorage` present and not blocked in the Quest Browser (needed for resume).

## M1 · House and tabletop model
- [x] The tabletop model appears at a comfortable height when seated; natural distance and scale.
- [x] Two-hand pinch to rotate/zoom reliable, without jerks.
- [x] Pinch on a room: it picks the right one; label readable (`·` and `²` sharp).
- [x] Onboarding with the ghost hand understandable without explanations.

## M2 · Furnishing
- [x] The palm menu opens only when needed (no accidental openings), with both hands.
- [x] Grab and release precise; snapping does not "jump".
- [x] Wrist rotation reliable; collisions evident.
- [x] Translation of the tabletop model with one and two hands without jerks; `Recenter` reachable.

## M3 · Inside the house
- [x] **Fixed `Menu` buttons** (two, at ±0.45 m): reachable with one hand when seated, readable, without taking the
      neighbouring piece; the `pinned` menu reads in the field of view.
- [x] Fade between tabletop model and room without discomfort; correct eye height.
- [ ] ➖ Distance grab in the real-size room: **cut** (T3.15). In real scale pieces are taken only at
      arm's reach: note how uncomfortable that is. (The arm's-reach-only comfort passed per the owner's test 2026-11-16.)
- ~~Tape measure: error ≤ 2 cm on known measurements of the tabletop model.~~ **Removed on 2026-11-14** (the tape measure no longer exists).
- ~~FitCheck message readable and clear.~~ **Removed on 2026-11-14** (the FitCheck no longer exists).
- [x] Hand joints (`XRHand`, `fillPoses`) available and pinch point precise (`[soglia:hands]`). (Seen in the 2026-11-11 log: `source=joints` on both hands.)

## M4 · Issues
- [x] Long pinch distinct from the normal pinch (no placeholder by mistake).
- [x] **`Issues` buttons** above `Menu` and **`Tabletop` button** in real scale: reachable and readable with one
      hand; Issues panel readable at 0.59 m, no row mistaken for its neighbour.
- [ ] ➖ System keyboard in WebXR: **not implemented** (D40, predefined phrases instead of the keyboard).
- [ ] ➖ Microphone (`MediaRecorder` / `getUserMedia`): **not implemented**, no voice button (S4.2). Only check
      that no dead button appears.
- [x] Cycle red → orange → light green even at a glance; the violet of the move-in report is distinguishable.
- [x] Real resume with issues, role, pieces and active viewpoint.

## M5 · Light, agent, accessibility
- [ ] 🟨 **fps with the sun light patches** (there are no real shadows: the sun is our own calculation with patches on the
      floor, "Simplified light") in the worst case (`pinned` menu + invalid piece + labels). (Works per the owner's test 2026-11-16; fps not recorded.)
- [x] **`View` buttons** (third floor) and **View panel** (Zoom, Turn, Month, Hour, Contrast, Text): reachable with
      one hand, 3.3 cm rows without mix-ups, sun dial readable.
- [x] **Info points** (cyan diamonds, "Sample data") readable and pinchable; **Furnish / Clear** with one hand,
      14 pieces without jerks, `Undo` in one step.
- [x] High contrast and large text readable in the field of view; complete one-hand mode.
- [x] **`Rotate`** (12 s after placement) reachable and not pressed by mistake; **coach** of the `Menu` button
      understandable without explanations.
- [x] **Mixed reality `?mr=1`** (taken up again on 2026-11-11, plan `docs/plans/MR.md`; before, D74 cut it). With
      Space Setup done, in **one room** (user decision of 2026-11-14: the second room is not needed): the session starts with passthrough; `My room` shows the outlines of the
      real furniture with the right name; the hand ray picks them when seated; measurements within ±5 cm of a piece of furniture measured
      with a tape measure; `Add to Mine` (the FitCheck was removed on 2026-11-14); a virtual sofa at 1:1 on the floor stays still when
      you turn around and turns red over a real piece of furniture; one-hand path (`Model`/`Menu`); fps read on the headset (no 12-piece cap to test, decision of 2026-11-14);
      without `?mr=1` the app is the one on `main`. If a check fails, the branch is not merged.
      (Owner-reported 2026-11-16: everything works. 🟨 The ±5 cm measurements and the fps were not recorded.)

## Back to the start screen (`Back to home`, 2026-11-15; plan and scenario: `qa/scenarios/HOME-back-to-home.md`)
- [x] **`Back to home`** (at the right of the menu header, next to `Items` and `Mine`): pressed with one hand, from the menu
      on the palm and from the fixed one, without taking a neighbouring card by mistake; the label reads at 0.5-0.6 m.
- [x] The session ends by itself, the start screen (Load house file, Furniture, Enter VR) appears in the Quest Browser without
      reloading; `Enter VR` restarts with house, role, pieces, issues and viewpoint as they were.
- [x] From there another house is chosen or the furniture sizes are changed ("Apply and go back"), then `Enter VR` opens the new house.

## M6 tools (phase A implemented on 2026-11-07, **proven only on the PC**; details in `docs/QUEST_SETUP.md`, section 11)
These are developer tools, not app features: the owner's 2026-11-16 report did not cover them one by one, so they stay open (🟨 in `qa/device/DEBT.md`).
- [ ] 🟨 `?debug=1` shows in the headset, **in session only**, the `ui:debug-hud` panel (fps with `OK`/`LOW`/`FAIL`, mean/p95/max ms,
      calls and triangles, minimum fps and worst frame, joints source, last log lines; at ~0.8 m and ~36° from the
      line of sight); `&hud=0` switches it off for clean measurements (costs ~+2 calls, group `hud`).
- [ ] 🟨 The console contains `[soglia:env]` (browser, `iwer=`, available features, `readyMs`/`startMs`; the `session` line
      2 s after the session starts with `frameRate` and `rates`), `[soglia] env iwer clues` (all 0 on the Quest),
      `[soglia:frames]` (mean, p95 and maximum frame time, `hzFrom=session|est`) and `[soglia:stats:summary]`.
- [ ] 🟨 Tuning: parameters `t_<name>=<value>` (only with `debug=1`; 26 knobs) and live file `tuning.local.txt` (with the
      `t_` prefix) read every 2 s by the development server; every change writes `[soglia] tuning set ...`
      (`npm run quest:tune -- name=value` writes it for you).
- [ ] 🟨 `npm run quest:*` scripts (check, serve, reverse, open, console, perf, capture, preview, links, tune): each
      one proven on the real Quest; the uncertain points (opening in VR, debug socket, `metavr`) are in `qa/device/DEBT.md` (M6). (`reverse`, `open` and `console` already worked in the 2026-11-11 session.)

## Before delivery
- [ ] Public link (GitHub Pages) opened from the Quest Browser, without login, from start to finish (the public build
      does not read `dev-params.local.txt`).
- [ ] Complete demo of the three acts in under 10 minutes by a person who does not know it.
- [ ] Footage for the video taken from the headset (or from the emulator) without recognisable people or brands.
