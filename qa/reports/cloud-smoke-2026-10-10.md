# IWER smoke test in the cloud — 2026-10-10

Environment: Linux cloud machine, runtime already started headless (`dev up --ai-mode agent --headless`, port 8081,
SwiftShader = software rendering). The MCP tools `xr_*`/`browser_*`/`ecs_*` were not available in the session:
the `npx @iwsdk/cli` CLI was used. No app code was modified. Parameters: `house=apartment-a&reset=1&debug=1`
via `dev-params.local.txt` (ignored by git).

## Result per step

| # | Step | Result | Check |
|---|---|---|---|
| 0 | `dev status` | PASS | `"browserConnected": true`, `"browserCommandReady": true` |
| 1 | XR session: status + accept | PASS | before: `sessionActive: false`, `sessionOffered: true`; after `xr enter` → `"sessionActive": true`, `"sessionMode": "immersive-vr"`, `enabledFeatures: ["local-floor","bounded-floor","hand-tracking","viewer","local"]` |
| 2 | Hand input | PASS | `xr set-input-mode {"mode":"hand"}` → `"activeDevices": ["hand-left","hand-right"]` |
| 3 | App alive (S1.1) | PASS | `ecs find ^house:` → `house:apartment-a` (entityIndex 13); `^room:` → 5 entities; `^wall:` → 13 entities. Log: `[soglia] house loaded apartment-a rooms=5 walls=13 doors=5 windows=7` |
| 4 | Console without errors | PASS | buffer of 43 lines (`count: 200`, no filter): 38 `log` + 5 `info` (navigations), **0 `error`, 0 `warn`**; re-checked at the end of the run with the error/warn filter: `"result": []` |
| 5 | Screenshot | PASS | `qa/reports/cloud-smoke-2026-10-10.png` (800x800, 45 KB) |
| 6 | Report | PASS | this file |

## Logs quoted (after the reload with `dev-params.local.txt`)

```
[soglia] params source=dev-file house=apartment-a role=visitor reset=true seed=1 debug=true time=-
[soglia:state] {"version":1,"houseId":"apartment-a","role":"visitor","miniature":{"scale":0.05,"yawDeg":0,"offset":[0,0]},"selectedRoomId":null,"prefs":{"onboardingStep":"pinch","menuOpened":false},"furniture":[],"nextInstance":{},"historyLength":0}
[soglia] hand visuals: local models
[soglia] controller visuals: local shape
[soglia] font ready family=inter weight=normal atlas=512x512 glyphs=111
[soglia] font ready family=inter weight=bold atlas=512x512 glyphs=111
[soglia] world ready
[soglia] catalog loaded items=16 furniture=14 mobility=2
[soglia] miniature placed x=0.000 y=0.950 z=-0.450 yawDeg=0.0 scale=0.0500
[soglia] house loaded apartment-a rooms=5 walls=13 doors=5 windows=7
[soglia] onboarding step=pinch
[soglia] furniture models loaded=14 fallback=0
[soglia] miniature placed x=0.000 y=1.350 z=-0.450 yawDeg=0.0 scale=0.0500   (after entering XR)
```

Statistics (`[soglia:stats]`), outside the XR session and then in XR:

```
[soglia:stats] fps=5 calls=25 views=1 callsPerView=25 triangles=1468 geometries=37 textures=3
[soglia:stats] fps=6 calls=70 views=2 callsPerView=35 triangles=21592 geometries=46 textures=5
[soglia:stats] fps=8 calls=70 views=2 callsPerView=35 triangles=21592 geometries=46 textures=5   (last line read)
```

CLAUDE.md budget (≤ 100 draw calls, ≤ 150k triangles): 70 draw calls in total (35 per view), 21,592 triangles → within budget
(indicative; only the miniature + onboarding, empty house). The fps (5–9) are not meaningful (SwiftShader).

Note on the buffer: it also contains the first load, from before the file was written, with
`[soglia] params source=default house=apartment-a role=visitor reset=false seed=1 debug=false time=-`.
The switch to `source=dev-file` confirms that the D1 channel works in the cloud.

Screenshot (in the XR session, hands active): seen from above, the white/grey miniature of the house with wooden floors
on the dark table, under a light blue gradient sky, with the two white outlines of the ghost hands at the sides and a
semi-transparent light blue object in the centre (presumably the "pinch" onboarding cue, not verified).

## Exact CLI commands that worked (for docs/SETUP_CLOUD.md)

From `/home/user/soglia`:

```bash
npx @iwsdk/cli dev status                                   # check browserCommandReady: true
echo "house=apartment-a&reset=1&debug=1" > dev-params.local.txt
npx @iwsdk/cli browser reload --input-json '{}'             # reloads and re-reads dev-params.local.txt
npx @iwsdk/cli xr status --input-json '{}'
npx @iwsdk/cli xr enter --input-json '{}'                   # = xr_accept_session (NOT "accept-session")
npx @iwsdk/cli xr set-input-mode --input-json '{"mode":"hand"}'
npx @iwsdk/cli ecs find --input-json '{"namePattern":"^house:"}'   # same for "^room:" (5) and "^wall:" (13)
npx @iwsdk/cli browser logs --input-json '{"count":200}'
npx @iwsdk/cli browser logs --input-json '{"count":200,"level":["error","warn"]}'
npx @iwsdk/cli browser logs --input-json '{"count":200,"pattern":"soglia:stats"}'
npx @iwsdk/cli browser screenshot --input-json '{}' --output-file /home/user/soglia/qa/reports/cloud-smoke-2026-10-10.png
```

## Differences from the MCP flow

- Different action names: `xr enter` (not `accept-session`), `browser logs`, `browser reload`, `ecs find`, `ecs systems`.
  MCP → CLI mapping in the help of each action (`... --help`, line "MCP tool:").
- Every command is a separate `npx` process: the output is a JSON envelope `{"ok":..., "data":{"result":...}}`.
  `--raw` gives the raw result; `--output-file` for screenshots (otherwise a temporary file in `data.screenshotPath`).
- `browser logs` returns very verbose JSON (each line with args/frameUrl/etc.; the IWSDK banner is multiline):
  it is better to save the output to a file and filter it (`python3 -I`) or use `pattern`/`level`.
- No profile statistics or `ecs snapshot/diff` were tried in this smoke test (not requested).

## Observed times

- Runtime start (log of `dev status`): browser launch 09:10:38 → `running` 09:11:02 (~24 s).
- App after the reload: `world ready` ~4.5 s after the navigation; full scene (furniture models) ~5.5 s.
- `dev status` ~1 s; `xr status`/`xr enter` ~1 s; `browser reload` ~3.3 s; `browser screenshot` ~5.6 s (SwiftShader).

## Traps

1. Writing `dev-params.local.txt` is NOT enough: a `browser reload` is needed after writing it (otherwise it stays `source=default`).
2. The correct order is reload → `xr enter` → `set-input-mode`: the reload closes the XR session (`sessionOffered: true` again).
3. The log buffer keeps the lines of the load before the reload: read by timestamp or by `source=dev-file`.
4. `dev-params.local.txt` was left in the root (ignored by git, `.gitignore:48`): delete it or rewrite it before the next run.
5. The help of `xr` without an action exits with `ok:false` / `cli_error` (it is just the list of actions, not a real error).

## What the headless emulator with SwiftShader does NOT prove

- real fps and frame time (here 5–9 fps with software rendering), so neither 60/72 fps on the Quest;
- precision and comfort of real hand tracking, real pinch, seated fatigue;
- real passthrough/MR, placement on the table, plane/mesh detection, anchors;
- microphone and speech recognition;
- draw calls/triangles on the Quest (here counted on the desktop renderer, useful as a regression indication);
- real look of colours, shadows and text on the headset displays; the field of view of the Meta VR Glasses;
- perception of scale/depth in real stereo (here 2 emulated views, monoscopic 800x800 screenshot).

None of these is a proof "on the headset": they remain debt for `qa/device/DEBT.md`.
