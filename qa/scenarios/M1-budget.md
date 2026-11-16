# S1.4 · Graphics budget of M1 (draw calls and triangles)

**Milestone**: M1 · **Type**: PC (IWER emulator via MCP `iwsdk-runtime`); the fps values are **informative only**
Implementation prerequisites: T1.8, T1.9, T1.14 (see `docs/plans/M1.md`).

## Preconditions
- Headless runtime. Headset at (0; 1.2; 0), hands.
- Three consecutive runs, changing `dev-params.local.txt` and doing `browser_reload_page` between one and the next:
  - **Run 0 (no debug)**: `house=apartment-a&role=visitor&reset=1&seed=1`
  - **Run 1**: `house=apartment-a&role=visitor&reset=1&seed=1&debug=1`
  - **Run 2**: `house=apartment-b&role=visitor&reset=1&seed=1&debug=1`

## Steps
1. Run 0: `xr_accept_session`, `xr_set_input_mode` `mode: "hand"`, wait 6 s, `browser_get_console_logs` with `pattern: "soglia:(stats|state)"`.
2. Run 1: same preparation, wait **7 s**, then `browser_get_console_logs` with `pattern: "soglia:stats"`, `count: 50`.
3. `scene_get_render_stats` (record everything: `calls`, `triangles`, `textures`, `geometries`, `programs`, `shadow casters`, time-per-frame samples).
4. `browser_profile` with `action: "start"`, `mode: "rendering"`, `maxDurationMs: 5000`; wait 5 s; `action: "stop"`. Record the average time per frame (informative).
5. Worst case: maximum zoom with the sequence of phase C of `qa/scenarios/M1-two-hands.md` (step 10, scale 0.12), wait 3 s, again `browser_get_console_logs` with `pattern: "soglia:stats"`.
6. Run 2 (house B): same preparation as run 1, wait 7 s, steps 2–3.
7. `browser_get_console_logs` with no filter for each run (look for `error`).
8. For each run 1 and 2: `browser_get_console_logs` with `pattern: "budget exceeded|framework:"`; note the timestamp of `xr_accept_session` and the one of the switch to hands (`xr_set_input_mode` `mode: "hand"`) for check 6.
9. Texture census (check 6): for run 1, after the wait of step 2, a **temporary** probe in the browser (it must not be committed) that lists by name/size the existing textures and assigns them to the app or to the framework; without a probe, report at least `textures` (total) of each line and compare it with the reference values of check 6 (informative).

## Checks (all required)
1. Run 0: **no** `[soglia:stats]` or `[soglia:state]` line (the statistics appear only with `debug=1`).
2. Runs 1 and 2: at least 3 `[soglia:stats]` lines about 2 s apart, in the format
   `[soglia:stats] fps=<n> calls=<n> views=<1|2> callsPerView=<n> triangles=<n> geometries=<n> textures=<n>`.
3. **Budget (decides the result)**, on the last line of each run and on the line after the maximum zoom: `callsPerView` ≤ 100 and `triangles` ≤ 150,000. Note: `callsPerView = calls / views`.
4. **Internal goal of M1** (does not decide the result, but must be reported as a WARNING if exceeded): `callsPerView` ≤ 50 and `triangles` ≤ 20,000. Note: `triangles` in the `[soglia:stats]` line is the **total of the two views** (in a stereo session `renderer.info.render` counts both eyes); measured on the PC on 2026-10-05: ~21.5k in total, i.e. ~10.8k per view. The budget of `CLAUDE.md` (≤ 150k visible triangles) and the internal threshold of 20,000 stay unchanged and must be compared with the total of the line.
5. Consistency with `scene_get_render_stats`: `calls` of that tool is equal to `calls` of the `[soglia:stats]` line or to `callsPerView` (± 20 %); if it is not, report both values and the hypothesised explanation (does not decide the result).
6. Textures, with the app / framework distinction:
   a. **Textures OF THE APP** (created by our content or our UI; today only the local font atlases of the panels, `public/fonts/inter-regular.png` and `inter-bold.png`: 512x512 each, loaded only when a text uses that weight, so 1 or 2 textures; the real sizes are read from the lines `[soglia] font ready ... atlas=<W>x<H>` of the log; M1 has no content textures): at most **4**, each ≤ **1024 px** on the longer side.
   b. **FRAMEWORK textures** (not ours): list them by name and size in the report, **with no limit** and without counting towards the budget. Census measured on the PC (`src/debug/stats.ts`, probe of 2026-10-05): PMREM cubeUv render target 768x1024 RGBA16F and its ping-pong 768x1024 (from the `IBLGradient` of the scene, created by `EnvironmentSystem`); 32x32 RG16F lookup of three (first draw with MeshStandard); hand bones 12x12 (2); Meta Quest Touch Plus controller models: `crystalControllers_left_BaseColor` and `crystalControllers_right_BaseColor` 2048x2048 plus 2 `_matricesTexture` 8x8, loaded from the CDN because IWER connects the controllers at the session start and they stay cached after the switch to hands.
   c. **Informative** reference values of `renderer.info.memory.textures` (total, the `textures=` line of `[soglia:stats]`): house A 3 outside XR, 7 in XR with the controllers, 9 after the switch to hands; with `house=nope` 4 / 9 / 11. The total is not a PASS criterion: a different value must be reported with the list by name.
   d. The warn `[soglia] budget exceeded: texture 2048 px > 1024 px` **MUST NOT appear** in any run (0 lines with `budget exceeded` and `texture`).
   e. The line `[soglia] framework: texture 2048 px > 1024 px (input model under world.player, not ours)` (level `log`, once per change) **may** appear only with the controllers connected, i.e. after `xr_accept_session` and until the switch to hands (plus at most one 2 s sampling); it must not appear outside a session or for long after the switch to hands. If it appears, it must be recorded in the report with the timestamp and it is not a failure.
7. No `error` entry in the console in any run; no active shadow (`shadow casters` = 0).
8. The report includes a table with `callsPerView`, `triangles`, `fps` and time per frame for each run and states clearly: "the fps on the PC do not represent the Quest".

## Result
PASS if checks 1, 2, 3, 6 and 7 are met for both houses · FAIL otherwise. The warnings of check 4 do not cause a failure but go into `qa/device/DEBT.md` as "measure on the Quest".

## To defer to the headset
Real fps ≥ 60 on the Quest with A and B, real draw calls and triangles read through remote debugging, time per frame; temperature/sustainability not required in M1.

## Changelog
- 2026-10-05: check 6 amended: the textures OF THE APP are counted (today 2 UIKit font atlases 256x512), limit 4 and each ≤ 1024 px; the framework textures (PMREM + ping-pong 768x1024, 32x32 lookup, hand bones 12x12, Quest Touch Plus controller models 2048x2048 + 2 matrices 8x8) must be listed by name with no limit and not counting towards the budget; the warn `budget exceeded: texture 2048 px` is replaced by the line `framework: texture 2048 px > 1024 px (input model under world.player, not ours)`, and the scenario checks that `budget exceeded` does NOT appear and that `framework:` appears only with the controllers connected; added steps 8–9 to collect logs and the census — reason: the baseline "≤ 4 textures in total" did not take the framework into account (total measured 9 in the report `qa/reports/M1-2026-10-05.md`, F2); the app has no content textures. The 1024 px threshold of `CLAUDE.md` remains valid for the app's textures.
- 2026-10-05: check 4: added the note that `triangles` is the total of the two views (~21.5k in total, ~10.8k per view) — reason: clarify the number in the report (21.3k–21.6k, WARNING) without changing the internal threshold of 20,000 or the `CLAUDE.md` budget (≤ 150k).
- 2026-10-05 (T2.2): check 6a updated: the panel atlases are no longer the 256x512 ones of the font included in UIKit but the two local Inter 512x512 atlases (regular and bold, with the glyphs `² · × − ± → ≈`), read from the `font ready` log; the limit (≤ 4 app textures, each ≤ 1024 px) remains — reason: T2.2 of the M2 plan (option A: extended font from Inter OFL).
- 2026-10-06 (T2.18, note only, no check changed): texture census redone in a session with hands and 14 pieces: **app 0 content textures** (the piece glb files have no textures) **and 2 font atlases of the UIKit panels 512x512** (`inter-regular`, `inter-bold`); **framework 6** (PMREM 768x1024 and ping-pong, 32x32 lookup, 512x512 hand canvas, 2 bone matrices 12x12); `renderer.info.memory.textures` from 3 to 8. Since T0.2b the controllers are local: the two 2048x2048 textures from the CDN and the line `framework: texture 2048 px` cited in the changelog of 2026-10-05 no longer appear (measured 0 times), and the reference values of check 6c (3/7/9) must be read as 3/5/8. Values measured with 14 pieces in `docs/plans/M2.md` ("Spike outcomes", T2.18).
