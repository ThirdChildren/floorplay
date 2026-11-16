# Floorplay on the Meta Quest 3S: user guide (Fedora)

A practical guide to put Floorplay on the headset as soon as it arrives (Tuesday, November 10, 2026), from the
Fedora PC, without Windows, without Meta Quest Link and without Meta Quest Developer Hub: you use `adb`,
Chromium and the Meta VR CLI. It is a working document for you, not for the judges.

State of the checks (written on 2026-11-07, before the headset arrived):

- **Verified in the repository** (scripts, ports, URLs, CLI commands): it is marked as such.
- **To be verified**: everything that depends on the headset, on Meta's menus or on Fedora packages that
  I could not try. Where a menu name or a command may have changed, it says
  "to be verified". If something does not match, trust the official page and report it.
- The official pages (IWSDK "Testing Your Experience", Meta documentation) were not reachable
  from the session in which I wrote this guide: the steps about Meta and adb come from general
  knowledge and from the project files, not from reading those pages today.

Related documents (I do not repeat them, I point to them):

| Document | What it is for |
|---|---|
| `docs/DEVICE_CHECKLIST.md` | the full checklist per milestone, to run on the headset |
| `qa/device/DEBT.md` | the deferred tests (one row per item, with priority) |
| `docs/ROADMAP.md` (section M6) | gate and schedule of the headset integration |
| `.claude/agents/quest-integrator.md` | the agent that runs the headset gate with you |
| `.claude/skills/iwsdk-native-xr-test/SKILL.md` | test guided by Claude on the real headset (see section 10) |
| `docs/SETUP_CLOUD.md` | does **not** apply to the Fedora PC: it is for cloud sessions (headless, no headset) |

Who does what: **you** do the physical actions (wearing the headset, accepting permissions, pinching);
Claude (agent `quest-integrator`) prepares, reads logs and measurements and writes the report.

---

## 1. Prerequisites on Fedora

### 1.1 Node.js

The project requires Node 22.12 or newer (`.nvmrc` says `22.12.0`; the `engines` field of
`package.json` also accepts 20.19+ and 24+). First check what you already have:

```bash
node --version
npm --version
```

If it is missing or too old, the simplest way is `nvm`, which reads `.nvmrc` by itself:

```bash
# check the latest nvm version at https://github.com/nvm-sh/nvm and replace v0.40.3 if needed
curl -o- https://raw.githubusercontent.com/nvm-sh/nvm/v0.40.3/install.sh | bash
```

Close and reopen the terminal, then:

```bash
cd ~/soglia        # the real path of your copy of the repository
nvm install        # installs the version indicated by .nvmrc
nvm use
node --version     # must print v22.12.0 or newer
```

Alternatively, from the Fedora packages: `sudo dnf install nodejs npm` (the version depends on your
Fedora release: check it with `node --version`; to be verified).

### 1.2 git, adb (android-tools), jq

```bash
sudo dnf install git android-tools jq
adb version
```

`jq` is only used to read the server URLs conveniently (section 4). The `android-tools`
package contains `adb`.

### 1.3 USB permissions for the Quest (udev rule)

The headset has USB vendor `2833`. With a recent `android-tools` the permissions may already be
fine (to be verified: `ls /usr/lib/udev/rules.d | grep -i android`). If later `adb devices`
does not show the headset, or shows `no permissions`, create the rule by hand:

```bash
echo 'SUBSYSTEM=="usb", ATTR{idVendor}=="2833", MODE="0660", TAG+="uaccess"' \
  | sudo tee /etc/udev/rules.d/51-quest.rules
sudo udevadm control --reload-rules
sudo udevadm trigger
```

Unplug and replug the cable, then restart the adb server:

```bash
adb kill-server
adb start-server
```

`TAG+="uaccess"` gives permission to the user who has the graphical session open: you do not need to add yourself
to any group.

### 1.4 Chromium or Chrome (remote debugging)

```bash
sudo dnf install chromium
```

Google Chrome is fine too (to be installed from its repository). It is needed for `chrome://inspect`
(section 5). The "managed" Chromium that the project opens by itself with `npm run dev` is another thing
(it is the emulator on the PC) and is not needed for headset tests.

---

## 2. Preparing the code

From the repository, on the `main` branch:

```bash
cd ~/soglia
git checkout main
git pull
```

```bash
npm ci
```

```bash
npm run typecheck
npm test
npm run build
```

The real scripts are in `package.json` (verified): `dev`, `dev:runtime`, `dev:agent`,
`dev:collab`, `dev:down`, `dev:status`, `typecheck`, `test`, `build`, `preview`. If one of the three
checks above fails, **do not** go on: fix the PC first.

The `@meta-quest/metavr` package (the Meta VR CLI) is already a development dependency and `npm ci`
installs it; its actual program (the "binary") is downloaded from Meta's CDN on first use
(section 5.3). So you need internet and a PC without restrictive proxies.

---

## 3. Preparing the Quest 3S

### 3.1 Developer account and organization (once, do it early)

1. A Meta account with the headset already set up and linked to the **Meta Horizon** app on the phone
   (to be verified: the app name may change).
2. To enable developer mode you need a **developer organization** on the site
   `developers.meta.com` (created with the same account; Meta may ask for account
   verification, for example with two-factor authentication: to be verified). **Do it before
   Tuesday**, from the PC or the phone: it is the step that most often blocks.

### 3.2 Developer mode

From the Meta Horizon app on the phone (menu names to be verified):

1. Open the app, go to the devices and choose the Quest 3S.
2. Headset settings, then **Developer Mode**, and turn it on.
3. Restart the headset.

### 3.3 USB connection and USB debugging

1. Connect the headset to the PC with a USB-C cable that **carries data** (not a charge-only one).
2. Put on the headset: the **Allow USB debugging** request appears. Check "Always allow from this
   computer" and confirm. The request only appears with the headset on and worn.
3. On the PC:

```bash
adb devices
```

A row with the serial number and `device` must appear. If `unauthorized` appears or nothing
appears, see section 8. **Write down the serial number**: it is needed in the optional step of section 10.

### 3.4 Hands, controllers, browser

- **Hand tracking on** (in the headset settings, in the section on movement
  tracking, "Hand tracking"; name to be verified). For Floorplay tests **put the controllers down
  and turn them off**: with the controllers on, the headset may switch to the controllers (and rule 1 of the
  project is that everything is done with the hands).
- **Updated Quest Browser** (system settings, updates; to be verified where). An
  old version may lack APIs such as the hand joints; write down the browser version in the
  report (in `chrome://inspect` or in `navigator.userAgent`).
- Sit down: the project is designed to be used **seated**, with interactions within about 60 cm.

---

## 4. Opening Floorplay on the headset

The project's development server starts in **HTTPS** on port **8081** with a self-signed
development certificate (verified: `https://localhost:8081/`). WebXR requires a "secure context":
`localhost` and `https` are. The certificate is self-signed, so the Quest Browser will show a
warning the first time, even on `localhost`: it must be accepted (section 4.3).

### 4.1 Starting the server

For headset tests you do not need the emulator window on the PC: start the server **without opening
the managed browser**.

```bash
cd ~/soglia
npx @iwsdk/cli dev up --no-open
```

The command returns immediately and the server keeps running in the background (verified). To see its
logs in the terminal you can add `--foreground` (option listed by `dev up --help`, not tried
at length).

Alternative, with the emulator window (same as your usual use): `npm run dev`
(= `iwsdk dev restart --open --foreground`, from `package.json`).

To read the URLs (the field is `data.runtimeUrls`, verified):

```bash
npx @iwsdk/cli dev status | jq '.data.runtimeUrls'
```

Example response (the IP will be your PC's):

```json
{
  "local": "https://localhost:8081/",
  "network": [ "https://192.168.1.20:8081/" ]
}
```

If port 8081 is busy, the server may choose another port: **always read the port
from the status** and substitute it in the examples below. To stop everything:

```bash
npm run dev:down
```

### 4.2 Way (a), recommended: USB with `adb reverse`

The headset connected to the PC sees the PC's server as `localhost`. No Wi-Fi, no IP.

```bash
adb devices
adb reverse tcp:8081 tcp:8081
adb reverse --list
```

Then, in the **Quest Browser** (from the headset), open:

```
https://localhost:8081/?debug=1
```

To avoid typing the URL with the virtual keyboard you can launch it from the PC (to be verified: the standard
Android intent should open the Quest Browser). **Beware of the `&`**: `adb shell` joins the
arguments into a single string and the shell **on the headset** re-reads it, so the remote command must
be **a single argument in single quotes, with the URL in double quotes** inside. The form without
outer quotes (`adb shell am start ... -d "https://...&..."`) breaks with the `&` (the part after the
first `&` becomes a background command):

```bash
adb shell 'am start -a android.intent.action.VIEW -d "https://localhost:8081/?house=apartment-a&debug=1"'
```

The script `npm run quest:open -- <preset>` (section 11) already builds the right command.

Another way to avoid typing URLs: the parameters can live in the file `dev-params.local.txt` in the
project root (ignored by git, read **only by the development server**; see section 6).

The `adb reverse` link is lost if you unplug the cable or restart adb: redo it.

### 4.3 The certificate

On first opening the Quest Browser shows a warning about the connection not being private. Choose
the advanced option and proceed to `localhost` (the exact text is to be verified). Do it once
for each address (`localhost` and the network IP are two different sites to the browser).

### 4.4 Way (b): Wi-Fi with the network URL

Useful if you do not have the cable at hand; it is less convenient for debugging. Headset and PC must be on the
**same network** (and the network must not isolate devices, as many guest networks do).

1. Take the `network` URL from the status (section 4.1), for example `https://192.168.1.20:8081/`.
2. Open it in the Quest Browser and accept the certificate warning.
3. If it does not open: the Fedora firewall may be blocking the port. Try (valid until the
   firewall is restarted):

```bash
sudo firewall-cmd --add-port=8081/tcp
```

The server listens on all interfaces (`host: '0.0.0.0'` in `vite.config.ts`, verified).

### 4.5 The emulator must not activate on the headset

In development the server injects the IWER emulator (the one you use on the PC). The plugin disables it for
the `OculusBrowser` user agent (the plugin's default setting, verified in the code; the item
"IWER does not activate on non-localhost hosts in the production build" remains in `DEBT.md`). On the
headset, therefore, the emulator controls must not appear: if they do, note it as a
problem.

### 4.6 Entering VR

`iwsdk.config.json` has `xr.mode: "vr"`, `offer: "always"` and `handTracking: true` (verified): the
page offers a button to enter VR (usually "Enter VR", name to be verified). Press it with your
finger or with the browser pointer, and the **first time** accept the WebXR permission (and the one for
hand tracking, if requested) inside the headset.

---

## 5. Remote debugging, screenshots, recording

### 5.1 Console and performance with `chrome://inspect`

With the cable connected, USB debugging authorized and the Quest Browser with the page open:

1. On the PC open Chromium and go to `chrome://inspect/#devices`.
2. Check "Discover USB devices". The Quest appears with its open tabs.
3. On the Floorplay tab press **inspect**: DevTools opens with console, network and performance
   of the page **on the headset**.

In the console filter by `[soglia` to see only the app's logs. What to expect (format
verified in the code):

- `[soglia] params source=url house=apartment-a role=visitor reset=false seed=1 debug=true time=-`:
  confirms that the URL parameters were read;
- `[soglia] hand visuals: local models`: the hands come from the local models;
- `[soglia:stats] fps=72 calls=... views=2 callsPerView=... triangles=...` every 2 seconds with
  `debug=1`. In a real VR session `views=2`;
- in the normal path **no `error`** in the console.

If the Quest does not appear: section 8. If it appears but cannot be inspected during the
immersive session, note it (to be verified).

### 5.2 Screenshots and recording

- **From the headset**: the Meta button, then sharing (photos and video). The files end up on the headset
  (folders like `/sdcard/Oculus/Screenshots` and `/sdcard/Oculus/VideoShots`: to be verified) and are
  copied to the PC with `adb pull`:

```bash
adb pull /sdcard/Oculus/Screenshots ~/quest-shots
adb pull /sdcard/Oculus/VideoShots ~/quest-videos
```

- **Mirror on the PC with scrcpy** (handy for tests and for the video; the package may not be
  in the base Fedora repositories and cropping to show a single eye is to be verified):

```bash
sudo dnf install scrcpy
scrcpy
```

- Remember for the contest video: no recognizable people or trademarks in the footage.

### 5.3 Meta VR CLI (`metavr`)

The project includes it (`@meta-quest/metavr` in `package.json`, version `^1.8.1`). From the root:

```bash
npx metavr --help
```

On **first launch it downloads its program from Meta's CDN** (I could not try it: my
session did not reach that CDN, so the details of the subcommands are to be verified with
`--help`). From the package documentation, the command groups are: `device` (list, info,
battery), `app`, `capture` (screenshots and recordings), `files`, `log` (logcat), `shell`, `perf`
(Perfetto traces), `docs`, `adb`, `mcp`.

Examples to try (the exact names of the subcommands and flags must be checked with `--help`):

```bash
npx metavr device --help
npx metavr capture --help
npx metavr perf --help
```

To use it from Claude Code as an MCP server, the project's way is:

```bash
npx @iwsdk/cli adapter sync
```

It creates `.mcp.json` (not committed) with the servers `iwsdk-runtime`, `iwsdk-reference` and `metavr`; then
restart Claude Code so that it loads them (see `docs/SETUP_CLOUD.md`, section 3, for the warnings
about the files the command creates). Alternatively the package's command is `metavr mcp install
claude-code`. Meta's official skills are optional.

---

## 6. Useful URL parameters

Read from `src/logic/params.ts` (verified). An invalid value falls back to the default value and
writes a warning to the console. If a key appears twice, the first one wins.

| Parameter | Values | Default | Effect |
|---|---|---|---|
| `house` | `apartment-a`, `apartment-b` | `apartment-a` | the house to open |
| `role` | `visitor`, `agent`, `tenant`, `landlord` | `visitor` | the role; if named in the URL it beats the saved one |
| `reset` | `1` / `0` | `0` | `1` ignores the saved state (start from zero) |
| `seed` | integer | `1` | seed for the deterministic logic |
| `time` | `2026-12-21T10:00` | current time | sun time (year within the limits of the sun module) |
| `debug` | `1` / `0` | `0` | on-screen statistics and `[soglia:stats]` in the console |
| `contrast` | `1` / `0` | saved | high contrast; if named it beats the saved preference |
| `text` | `normal` / `large` | saved | normal or large text (3.0 cm); if named it beats the saved one |
| `pinch` | `auto` / `grip` / `joints` | `auto` | where the pinch point is taken from: hand joints, or the "grip" (for comparison) |
| `furnish` | `none` / `scandinavian` | `none` | starts with the sample furnishing (development aid) |
| `mr` | `1` / `0` | `0` | read but **without effect**: mixed reality has been cut since M5 |
| `glyphs`, `failmodels`, `failmy`, `failcatalog` | `1` | `0` | development aids; they only work together with `debug=1`: not needed on the headset |
| `hud` | `1` / `0` | `1` with `debug=1` | `hud=0` turns off the statistics panel in the headset (for the final measurements); without `debug=1` it is ignored with a warning |
| `t_<name>` | number | see section 11.2 | tuning knobs (pinch thresholds, radii, palm, distances, timers, `foveation`, `fovMask`); only with `debug=1` |

The leading `?` and the `&` separate the parameters. The time is written with colons: `time=2026-12-21T10:00`.

**Beware of `reset=1`**: if it stays in the URL, every reload resets the state. For the
pause and resume tests **do not** use it (or use it only the first time and then reopen the URL without).

Tests can also be given via a file: in development the app reads `dev-params.local.txt` in the
project root (one line, for example `house=apartment-a&debug=1`, **without** the `?`). On the
headset it applies only if the page comes from the development server (not from the public build) and **a
parameter in the URL beats the one in the file**. Delete it at the end of the test.

Ready-made URLs (with `adb reverse`; with Wi-Fi replace `https://localhost:8081` with the network URL):

```
Clean start, with statistics:
https://localhost:8081/?house=apartment-a&role=visitor&reset=1&seed=1&debug=1

Without reset (for resume and for normal use):
https://localhost:8081/?debug=1

House B:
https://localhost:8081/?house=apartment-b&reset=1&debug=1

Tenant, for the issues:
https://localhost:8081/?house=apartment-a&role=tenant&reset=1&debug=1

Agent (info points, Furnish and Clear):
https://localhost:8081/?house=apartment-a&role=agent&reset=1&debug=1

Winter solstice sun, 10 o'clock:
https://localhost:8081/?reset=1&debug=1&time=2026-12-21T10:00

High contrast and large text:
https://localhost:8081/?reset=1&debug=1&contrast=1&text=large

Pinch point from the grip (comparison with the real hands):
https://localhost:8081/?debug=1&pinch=grip
```

---

## 7. What to test: 10-15 minute smoke test

Purpose: to understand in a quarter of an hour whether **the whole basic path holds up on the headset**. It does not replace the
checklist. Controls and expected phrases come from the app texts (`src/ui/strings.ts`) and from the QA
scenarios; on the headset they may differ in the details, note them.

Before: controllers off and put away, seated, `chrome://inspect` open on the PC with the console
filtered on `[soglia`, URL with `debug=1`.

1. **Start.** Open the URL; accept the certificate; press the button to enter VR. The cold
   start should be under 10 s (item M0 of `DEBT.md`). Console: `params ...` line.
2. **Hands.** Both hands are visible (local models), no controller, no errors. Check
   `hand visuals: local models`. If the app also stays launchable with hand tracking
   off, that is a separate item of `DEBT.md` (M0): note it if you try it.
3. **Miniature and pinch.** The miniature (scale 1:20) sits at a comfortable height and distance when seated.
   Pinch a room: the label appears (for example "Study · 12.0 m²"). Try the two-hand pinch:
   it rotates and zooms without jerks. Is the onboarding with the ghost hand understandable?
4. **Menu.** Open the palm menu with a hand palm up (try left and right, without accidental
   openings). Then close it and open the menu with the "Menu" button next to the miniature (one hand
   only).
5. **Furnish.** Take a piece of furniture from the menu and place it in a room; release it. Rotate it (wrist
   twist, tap of the other hand or "Rotate" button, which appears about 12 s after placing).
6. **Door that blocks.** Put a piece of furniture in front of a door: it must become invalid with the
   reason "Blocks the door".
7. **Own furniture.** "Mine" tab: bring the sample sofa to the living room of house A.
   (The FitCheck message was removed on 2026-11-14: you only check that the piece sits down.)
8. **Tape measure.** ~~"Measure" tab~~ **Removed on 2026-11-14**: the tape measure no longer exists, step to skip.
9. **Viewpoint.** Pinch a blue pillar (viewpoint V1): fade and room at real
   scale (eye height 1.2 m). Go back to the miniature with the "Tabletop" button. No nausea? Is the
   fade too long or too short? (measurements in `DEBT.md`, M3 and M5).
10. **Issue.** Set the role to "Tenant" (button "Issues", then the role box, or
    `role=tenant` in the URL). **Long pinch** (about 0.8 s) on the washing machine: choose category and
    phrase, "Report". A marker must appear, and none by mistake with normal pinches.
11. **Roles.** Switch to "Landlord": list of issues (there is sample data, labeled
    "Sample data"), "Take on", "Resolved". Switch to "Agent": info points, "Furnish" and "Clear".
12. **Sun.** "View" button: change hour and month; the sun patches on the floor change. The label
    "Simplified light" appears.
13. **Accessibility.** In the "View" panel: "Contrast" On and "Text" Large; the texts stay readable and
    inside the field of view. Try a few actions with **one hand only**.
14. **Pause and resume.** Take the headset off for about 10 seconds and put it back on: the app restarts from where you
    left it (pieces, role, issues, viewpoint). Then reload the page **without `reset=1`**
    and check that it finds the same state again.
15. **Performance.** In `chrome://inspect` read the `[soglia:stats]` lines at the heaviest points
    (menu open with many pieces, Furnish just pressed, real scale with the sun): `fps` ≥ 60
    (target 72), `callsPerView` ≤ 100, `triangles` ≤ 150000. Note the worst case.

If something goes wrong, **do not** fix the code on the spot: note the problem with the steps to
reproduce it (it is the job of `quest-integrator`; the code is then touched by `xr-engineer`).

### 7.1 Then: full tests and how to note them

- Full list of tests: `docs/DEVICE_CHECKLIST.md` (per milestone) and the rows of
  `qa/device/DEBT.md`. Recommended order if time is short: first the items with **high** priority,
  for milestones M1 to M5 (they are the majority; Claude can order them with you).
- Mixed reality: cut from the demo and **outside the gate** (decision D74 of `docs/plans/M6.md`, confirmation
  of M5). The checklist was realigned on 2026-11-07 (no mixed reality, "light patches" instead of
  shadows, keyboard and microphone not applicable).
- **Report**: one file per session in `qa/device/`, named `M<n>-<YYYY-MM-DD>.md` (for the smoke
  test: `M6-2026-11-10.md`). Format, as per `quest-integrator`:

```markdown
# Headset test · <date>

Headset: Quest 3S · Quest Browser <version> · Fedora PC <version> · URL: <URL used>

## Checklist items
| Item | Outcome (OK / PROBLEM / N/A) | Measurement or note |
|---|---|---|

## Measurements
fps (min / typical), callsPerView, triangles, at the points: <list>

## Problems
1. <title> · steps to reproduce: ... · expected / seen: ... · log: ...

## Recommendations (in order of impact)
1. ...
```

- Update the "Outcome on the headset" column of `qa/device/DEBT.md` and the Device-done status in
  `docs/ROADMAP.md` **only** for tests actually done on the headset. Never write "works on the headset"
  for what was tested only in the emulator.
- The thresholds you want to change (pinch, distances, miniature height, text) are **proposed** to
  `xr-engineer` with the measured value: they are not changed behind the scenes.

---

## 8. Common problems

| Symptom | What to do |
|---|---|
| `adb devices` empty | charge-only cable or wrong port: try another cable/port; put on the headset and see whether the USB debugging request appears; check the udev rule (1.3); `adb kill-server && adb start-server`; verify that developer mode is on and that the headset was restarted |
| `unauthorized` | put on the headset and accept "Allow USB debugging"; if it does not appear: `adb kill-server`, unplug and replug, and in the headset revoke the USB debugging authorizations from the developer settings (to be verified where), then retry |
| `no permissions` | udev rule missing or not reloaded (1.3); unplug and replug the cable |
| `offline` | unplug and replug; `adb kill-server`; restart the headset |
| Chrome does not see the Quest in `chrome://inspect` | check "Discover USB devices"; close other programs that use adb (Android Studio, scrcpy) or run `adb kill-server`; open the page in the Quest Browser (it must be an open tab) |
| The page does not open on `localhost` | `adb reverse` is missing (redo it, it is per port); the server is not running (`npx @iwsdk/cli dev status`); the port is different from 8081 |
| Certificate warning | normal (self-signed development certificate): go on from the advanced option; it must be redone for each address |
| The button to enter VR is missing | check `chrome://inspect`: errors in the console? verify that the URL is `https`; reload after accepting the certificate; verify that the emulator did not appear (4.5); if it appears only on `localhost` but not on the network IP, or vice versa, note it (they are different contexts); try the USB way. Whether the browser supports `immersive-vr` is to be verified with `navigator.xr.isSessionSupported('immersive-vr')` from the console |
| Hands not detected | check that hand tracking is on in the headset settings; **controllers off and put away**; good light, hands within the cameras' field; exit the session and retry. Try `pinch=grip` or `pinch=joints` to understand whether it is the pinch point |
| Port already in use (8081) | another `dev up` is still active: `npm run dev:down`, then restart; or read the new port with `dev status` and redo `adb reverse` with that one |
| Vite cache / changes not visible | stop the server (`npm run dev:down`), delete the cache (`rm -rf node_modules/.vite`) and restart; on the headset reload the page (and if needed clear the Quest Browser cache from its settings; to be verified) |
| Reload resets everything | you left `reset=1` in the URL (section 6) |
| Wi-Fi does not reach the PC | same network? guest network with isolation? firewall (`sudo firewall-cmd --add-port=8081/tcp`)? Use the USB way |
| `metavr` does not start | on first use it downloads a program from Meta's CDN: you need internet and no network block; retry; details in 5.3 |
| You do not have the IP | `npx @iwsdk/cli dev status` or `ip -4 addr` |

---

## 9. At the end of the session

```bash
adb reverse --remove tcp:8081
npm run dev:down
rm -f dev-params.local.txt
```

Then you make the commits of the report and of `DEBT.md` yourself.

---

## 10. Optional: let Claude read the real headset

The project has a skill (`.claude/skills/iwsdk-native-xr-test/SKILL.md`) and the CLI has the command
`runtime pair-headset` to connect a headset to the development server and give Claude the state of the
page (ECS, XR session, positions) while you do the tests. The part I verified here, without
a headset:

```bash
npx @iwsdk/cli dev up --no-open
adb -s <SERIAL> reverse tcp:8081 tcp:8081
npx @iwsdk/cli runtime pair-headset --input-json '{"headsetId":"<SERIAL>"}' --raw
npx @iwsdk/cli runtime targets --raw
```

`pair-headset` answers with a URL of the form `https://localhost:8081/?__iwsdk_headset=<token>`: it must be
opened **in the headset** (with `adb reverse` active), then `runtime targets` shows the page with its
`runtimeTarget` (to be copied in full into the following commands). Screenshot, snapshot and console
of the CLI work only on the PC's managed browser, not on the headset ("host-only", from `AGENTS.md`):
for the headset console you use `chrome://inspect`.

Warning: the `--native-xr-control` option (for the skill's automated tests) **replaces the real
controllers with synthetic controllers** and for this reason it must **not** be used for tests with the real
hands. For Floorplay tests use the normal path of sections 4-7.

---

## 11. M6 tools

> **Status (2026-11-07, evening)**: phase A of the M6 plan is **implemented** (T6.A1–T6.A11) and this section
> was re-read against the code (`scripts/quest/`, `src/logic/tuning.ts`, `src/debug/`,
> `qa/device/presets.json`). Everything is tested **on the PC** (unit tests, `--dry-run`, a fake `adb` and a fake debug
> server, the emulator): **nothing is tested on the headset**. Every command that talks to a real Quest
> (`adb reverse`, opening the URL, `--mode vr`, the remote debugging socket, `logcat`, `metavr`) is
> **to be verified** on Tuesday; if one does not work, note it (it is the job of session S0 of `docs/plans/M6.md`)
> and the scripts can be fixed in under an hour. If a name here does not match the code, trust the code
> (`npm run` lists the scripts).

### 11.0 Procedure for Tuesday (session S0, about 1.5 h)

Before: Fedora ready (section 1), `npm ci`, `npm test`, `npm run build` green, headset in developer mode and
connected with the data cable (section 3), hand tracking on, controllers off, seated.

```bash
cd ~/soglia
npm run quest:check                          # 1. does it see the headset? model, battery, active reverses, server state
npm run quest:serve                          # 2. starts the development server without opening the emulator browser
npm run quest:reverse                        # 3. adb reverse on the port the server declares (usually 8081)
npm run quest:open -- smoke                  # 4. opens https://localhost:<port>/?house=apartment-a&role=visitor&reset=1&seed=1&debug=1
npm run quest:console                        # 5. (in a second terminal) saves the headset console in qa/device/logs/
# in the headset: accept the certificate warning (first time), press "Enter VR", accept the WebXR permission
npm run quest:tune -- pinnedDistance=0.62    # 6. changes a threshold with the session open, without reloading (see 11.2)
```

Check with `quest:check` before starting; if step 4 opens the browser but not the URL, use
`npm run quest:open -- smoke --mode browser` or type by hand the URL printed by `quest:links`. If
`quest:console` does not find the debug socket, use `chrome://inspect` (section 5.1) and note that the automatic
channel did not work. Alternative without `adb` to change scenario: open in the headset
`https://localhost:<port>/dev/quest.html` (page with a big link per preset, 11.1). At the end of the session:
`npm run quest:unreverse`, `npm run dev:down`, `rm -f tuning.local.txt dev-params.local.txt`.

What to look at first in the console or in the `ui:debug-hud` panel (see 11.3): `[soglia:env]` with
`iwer=no` and all the clues of the line `[soglia] env iwer clues` at `0`; `views=2`; `readyMs` and `startMs` (cold
start); then `[soglia:frames]` with `hz`, `fps` and `class`. For the **final fps measurements** do not use the development
server but `npm run quest:preview` with `hud=0` (section 11.1).

### 11.1 `quest:*` npm scripts (tasks T6.A9, T6.A11)

Eleven scripts, all with `--dry-run` (prints the commands without running them; the only read they do is
`npx @iwsdk/cli dev status` to learn the port). `--serial <number>` applies to those that talk to a
device (`check`, `reverse`, `unreverse`, `open`, `console`, `perf`, `capture`): if `adb` sees **more than
one device** and you do not give `--serial`, the script **stops** and does not pick one (D69). Without `adb` or without
a headset it exits with code 1 and a message in English. **Port**: `--port` > the one declared by `dev status` > 8081.

| Command | What it does |
|---|---|
| `npm run quest:check` | lists the headset (`adb devices -l`), model and battery, the active `adb reverse` links and the server state |
| `npm run quest:serve` | `npx @iwsdk/cli dev up --no-open` and prints the URLs (port read from `dev status`) |
| `npm run quest:reverse` / `quest:unreverse` | `adb reverse tcp:<port> tcp:<port>` / `adb reverse --remove tcp:<port>` |
| `npm run quest:open -- <preset\|url> [--mode browser\|vr] [--base <url>]` | opens a preset (`qa/device/presets.json`) or a URL in the Quest Browser from the PC. `--mode browser` (default) = Android `VIEW` intent; `--mode vr` = `am broadcast … ovrweb://vr?uri=<encoded URL>` (to be verified: it should enter VR by itself). It only opens `localhost` and private network addresses. The remote command is **a single argument** with the URL in double quotes, so the `&` break nothing (section 4.2) |
| `npm run quest:links` | prints the **12 presets** with the URLs (`smoke`, `a-clean`, `b-clean`, `tenant`, `landlord`, `agent`, `sun-winter-10`, `sun-summer-14`, `contrast-text`, `grip`, `perf-worst`, `resume`), writes `qa/device/links.md` and generates the **launch page** `public/dev/quest.html` (development only, ignored by git, excluded from the build; relative links, so any port works). In the headset: `https://localhost:<port>/dev/quest.html`, tap a scenario, then "Enter VR" |
| `npm run quest:tune -- name=value …` | writes `tuning.local.txt` (one line `t_name=value&…`, ignored by git; **adds the `t_` prefix by itself**); the development server re-reads it every 2 s and the app applies the values **without reloading**. An unknown name or a non-numeric value writes nothing; out of range it warns (the limit is applied by the app). `quest:tune -- --clear` deletes the file |
| `npm run quest:console` | saves the Quest Browser console in `qa/device/logs/console-<date>-<time>.log` (and prints it). **CDP** channel if the PC has Node 22+ (global `WebSocket`): `adb forward tcp:9222 localabstract:chrome_devtools_remote` (`--socket` to change the name), shows console, exceptions and network requests to hosts other than the page's (useful for "no request to the CDN"); otherwise `adb logcat` filtered on `[soglia`. Options: `--seconds`, `--match`, `--all`, `--channel cdp\|logcat`. If neither works, `chrome://inspect` applies (5.1) |
| `npm run quest:perf -- [--seconds 10] [-- <metavr words>]` | performance trace with `npx metavr perf capture --app com.oculus.browser --mode vr --duration <ms>`, saved under `qa/device/traces/` (ignored by git). The `metavr` subcommands and flags are **to be verified** with `npx metavr perf --help` (the words after `--` are added as they are); the device for `metavr` is chosen with the `ANDROID_SERIAL` variable |
| `npm run quest:capture -- shot\|video [--seconds n]` | screenshot or recording with `npx metavr capture …`, under `qa/device/captures/` (ignored by git); flags to be verified with `npx metavr capture --help`. Without `metavr`: `adb pull` as in 5.2 |
| `npm run quest:preview` | `npm run build` + `vite preview` (HTTP on port 4173) for the **final fps measurements** on a production build; with `adb reverse tcp:4173 tcp:4173` you open `http://localhost:4173/?debug=1&hud=0` (`localhost` over HTTP is a secure context, without a certificate warning: to be verified) |

### 11.2 Tuning and diagnostic parameters (only with `debug=1`)

They are read from `src/logic/tuning.ts` (26 knobs, **all wired**: the plan's "optional" ones are there) and from
`src/logic/params.ts` (`hud`). Without `debug=1` they are ignored with a warning `[soglia] tuning ignored name=… reason=needs-debug`
(one per name). An out-of-range value is brought back to the nearest limit (`tuning clamped`), an unknown name
or a non-numeric value is discarded (`reason=unknown|not-a-number`), `t_palmCloseDeg` must stay above
`t_palmOpenDeg` (`reason=order`). **Three layers, strongest first**: live file `tuning.local.txt` (re-read every 2 s by the development
server; **it needs the `t_` prefix**: `t_fovMask=45`, without the prefix it is ignored without any log line), URL (`?…&t_name=value`), `dev-params.local.txt`;
then the default. The tuning is **not saved**: at every start you restart from default + URL/file.

| Parameter | Default | Limits | Unit | Applies |
|---|---|---|---|---|
| `hud` | `1` (with `debug=1`) | `0` / `1` | – | `hud=0` turns off the statistics panel in the headset |
| `t_longPress` | 0.8 | 0.4 - 1.6 | s | immediately (long pinch) |
| `t_longPressMove` | 0.015 | 0.005 - 0.04 | m | immediately |
| `t_pinchWait` | 0.15 | 0 - 0.4 | s | immediately (wait for the pinch point from the joints) |
| `t_pinRadius` | 0.02 | 0.01 - 0.05 | world m | immediately (grabbing the markers) |
| `t_viewpointRadius` | 0.025 | 0.01 - 0.06 | world m | immediately (grabbing the viewpoint markers) |
| `t_pickMargin` | 0.015 | 0.005 - 0.05 | world m | immediately (grabbing the pieces) |
| `t_pickDepth` | 0.05 | 0.02 - 0.10 | m | immediately (selection depth of entries and buttons) |
| `t_settleMs` | 150 | 0 - 400 | ms | immediately (settling of the two-hand pinch and of the translation) |
| `t_deadZone` | 0.005 | 0.001 - 0.02 | m | immediately (dead zone of the gestures) |
| `t_palmOpenDeg` / `t_palmCloseDeg` | 35 / 55 | 20-50 / 40-75 (close > open) | degrees | immediately |
| `t_palmOpenHold` / `t_palmCloseHold` | 0.4 / 0.25 | 0.2-1.0 / 0.1-0.8 | s | immediately |
| `t_pinnedDistance` / `t_pinnedDrop` | 0.55 / 0.20 | 0.45-0.75 / 0.05-0.35 | m | at the next opening of the menu or panel |
| `t_anchorForward` / `t_anchorDown` | 0.45 / 0.25 | 0.35-0.65 / 0.10-0.40 | m | at the next placement (session start or `Recenter`) |
| `t_rotateWindow` / `t_coachTimeout` | 12 / 20 | 6-30 / 8-60 | s | at the next appearance |
| `t_longPressSettle`, `t_fixtureSnap`, `t_measureSnap`, `t_releaseGuard`, `t_buttonRing` | 0.15 s, 0.02 world m, 0.012 world m, 0.3 s, 0.45 m | 0-0.4 s, 0.01-0.05, 0.006-0.03, 0.1-0.8 s, 0.35-0.60 m | s / m | immediately (`buttonRing`: read at every call, without rebuilds) |
| `t_foveation` | not set | 0 - 1 | – | immediately (`renderer.xr.setFoveation`, only if it exists: `tuning foveation applied=…` / `restored=…` / `skipped reason=no-api\|failed`) |
| `t_fovMask` | 0 (off) | 20 - 55 (0 = off) | degrees (half-angle) | immediately, **only in session** (black ring at 1.5 m attached to the head that simulates a narrow field of view, `debug:fov-mask`; `fov-mask on halfAngleDeg=…`) |

`pinnedDistance` and `pinnedDrop` apply to **normal** text panels: with large text the project's values
remain. The URL and the live file follow the same format: `https://localhost:8081/?debug=1&t_longPress=1.1&t_palmOpenHold=0.6`;
from the PC, while you are in the headset and without reloading: `npm run quest:tune -- longPress=1.1 palmOpenHold=0.6`. The updated
list of names, limits and defaults is the table in `src/logic/tuning.ts` (the log line `tuning table count=26`
announces it at startup). **Passing values through the URL is covered only by unit tests**: on the PC the tests use `dev-params.local.txt`.

### 11.3 What you see in the headset with `debug=1`

- A `ui:debug-hud` panel **only in session**, to the left of the miniature and a bit beyond (about 0.8 m from the head,
  36° from the line of sight), updated once a second: fps with `OK`/`LOW`/`FAIL` (`OK` ≥ 70, `LOW` ≥ 60),
  time per frame (average, p95, maximum), calls per view and triangles, minimum fps and worst frame of the session,
  source of the joints (`joints`/`grip`) and last pinch, up to 4 log lines (also `warn` and `uncaught …`).
  It can be read without taking off the headset. **Cost: about +2 calls** (in the `hud` group of `[soglia:stats:groups]`,
  which ends with `hud=<n>`; the field-of-view mask counts there). For the **final measurements** use `hud=0`
  (`hud hidden reason=hud0`).
- In the console: `[soglia:env]` (short user agent, `iwer=`, browser features, `readyMs=` and `startMs=`) at the first
  frame and, **2 s after the start of every session**, the `session` line (mode, granted features, `frameRate`,
  `rates`, `views`, `inputs`); `[soglia] env iwer clues …` (the clues for recognizing the emulator: in IWER
  they are all 1, on the Quest they must all be 0; the user agent does not count, IWER sets a Quest one);
  `[soglia:frames]` every 2 s with `hz`, `fps`, `class` and `hzFrom=session|est`; `[soglia:stats:summary]` every
  10 s of session, at the end of the session and when the page goes to the background.
- The browser features that the probe lists (`hand`, `anchors`, `hitTest`, `planes`, `meshes`, `speech`,
  `mediaRecorder`, `getUserMedia`, `virtualKeyboard`) are detection only: `iface` = the interface exists, it does not
  prove that it works.

### 11.4 Where to note the measured values

One file per session, `qa/device/M6-<YYYY-MM-DD>-S<n>.md`, with the model of the M6 plan ("Phase B" section): for each
knob the value tried, the number of trials and the outcome; the values chosen as new defaults are applied by
`xr-engineer` (commit `fix(tuning): ...`), they are not changed behind the scenes.
