# S2.0 · Panel font glyphs

> **Changelog 2026-11-06** (deviation of Block R, T5.R6): `glyphs=1` now requires `debug=1`; without it, the line `param glyphs ignored: needs debug=1` (warn) and no `ui:glyph-test` panel. The `dev-params.local.txt` lines of this scenario already have `debug=1` (parts A and B with `glyphs=1`): no change to the recipe. If `ui:glyph-test` does not appear, also check that `debug=1` is in the file.

**Milestone**: M2 · **Type**: PC (IWER emulator via MCP `iwsdk-runtime`)
Implementation prerequisites: **part A** T2.1; **part B** T2.2. **Option A (extended atlas from Inter) is already approved by the user (2026-10-05)**: part B runs if the 45-minute spike of T2.1 succeeded; if the spike failed, option D is adopted **with no further questions** and branch D applies. The report states which of the two was adopted (the choice is in `docs/plans/M2.md`, "Spike outcomes"). See `docs/plans/M2.md`.

## Preconditions
- Runtime already started (do not change the mode without announcing it). `dev-params.local.txt` (git-ignored) with **one line**:
  - Part A and B, on-screen test: `house=apartment-a&role=visitor&reset=1&seed=1&debug=1&glyphs=1`
  - Part B, label regression: `house=apartment-a&role=visitor&reset=1&seed=1&debug=1`
- Order of steps as in M1: `browser_reload_page` → `xr_accept_session` → `xr_set_input_mode` with `mode: "hand"` → wait 3 s. The head stays at (0; 1.6; 0) (session default); `ui:glyph-test` sits 0.6 m in front of the head.
- Candidate characters (eight): `²` `·` `×` `°` `−` `±` `→` `≈`. Static check by the planner on the `@pmndrs/msdfonts` 1.0.76 package (to be confirmed here): **only `°`** available; missing `² · × − ± → ≈`.

## Steps

### Part A · on-screen audit (T2.1)
1. `ecs_find_entities` with `namePattern: "^ui:glyph-test$"`.
2. `browser_get_console_logs` with `pattern: "Missing glyph info"` and `count: 60` (the buffer accumulates loads: use only the lines with timestamp ≥ `params source=` of the current load). Derive the set of **distinct** characters cited in the lines `Missing glyph info for character "<c>"`.
3. `browser_screenshot` → attach (the three rows of the test panel: missing characters appear as solid squares).
4. `browser_get_console_logs` without a filter (look for `error`).

### Part B · after T2.2 (if A was adopted)
5. Repeat steps 1–4: **no** `Missing glyph info` line in the current load; line `[soglia] font ready family=inter weight=bold atlas=<W>x<H> glyphs=<n>`.
6. Change `dev-params.local.txt` (without `glyphs=1`), `browser_reload_page`, preparation as above, then the sequence of `qa/scenarios/M1-room-label.md` for `living` and for `study` (right hand at (Cx; Oy + 0.25; Cz + 0.02), `xr_look_at`, `xr_select {duration: 0.3}`), with O read from the last `miniature placed` line. `browser_get_console_logs` with `pattern: "label shown|Missing glyph"`.
7. `browser_screenshot` of the living room label → attach.
8. `scene_get_render_stats` (`textures` field) and `[soglia:stats]` line (`textures=` field): note the value with and without `glyphs=1`.

9. **License and credits (only with A)**, from the command line: `ls public/fonts/` (must contain `OFL.txt` and the atlas files), `grep -n "font-inter-msdf" CREDITS.md`, `grep -n -i "Open Font License\|OFL" docs/RULES.md`, `npm test` (the hygiene test on `CREDITS.md` for fonts in `public/`).

### Branch D (no new font: spike failed)
10. Steps 5–9 are not run: run `npm test` (the `font-glyphs` test must pass) and verify that `[soglia] label shown "Study: 12.0 m2"` remains the ASCII form of S1.3. Also verify that **no** font file was added to `public/` (`ls public/fonts` does not exist or is empty) and that `docs/RULES.md` and `CREDITS.md` do **not** cite the OFL exception.

## Checks (all mandatory)
**Part A**
1. Step 1: exactly **1** `ui:glyph-test` entity.
2. Step 2: the report contains an **eight-row table** (character → available / missing) built from the logs; a character is "missing" if at least one line `Missing glyph info for character "<c>"` appears, "available" if none. If the table differs from the static check (only `°` available) the report says so plainly (not a FAIL: it is the audit).
3. Step 3: screenshot attached and described in words (which rows and which characters are seen as solid squares).
4. Step 4: no `error` entry in the console.

**Part B (A adopted)**
5. Step 5: **0** `Missing glyph info` lines in the current load; the `font ready` line exists and `W` and `H` are ≤ 1024.
6. Step 6: `[soglia] label shown "Living room & kitchen · 23.9 m²"` and `[soglia] label shown "Study · 12.0 m²"` (exact text, with `·` U+00B7 and `²` U+00B2); no `Missing glyph info` line.
7. Step 7: in the screenshot the label shows the middle dot and the superscript (not solid squares).
8. Step 8: **app** textures ≤ 4 and each ≤ 1024 px (the atlases are derived from the `font ready` log, not by deduction); no `budget exceeded` line; no `error`.
9. No request to a CDN for the font: no `Failed to load` / `404` line in the console (the network test with the temporary M1 probe is optional).
10. Step 9: `public/fonts/OFL.txt` exists; `CREDITS.md` contains a line with id `font-inter-msdf` (author, URL, OFL 1.1 license, changes); `docs/RULES.md` contains the written exception for Inter/OFL; `npm test` green (including `tests/unit/repo-hygiene.test.ts`).

**Branch D**
11. Step 10: `npm test` green; ASCII label unchanged; no font file in `public/`; no OFL exception written; the report writes "option D adopted (spike failed: <reason>)" and part B does not apply.

## Outcome
PASS if: part A, checks 1–4 · part B (if A adopted), checks 5–10 · branch D, check 11 · FAIL otherwise. If `ui:glyph-test` does not appear, check that `glyphs=1` is in the file and report the `params` log; repeat only once.

## To defer to the headset
Sharpness and readability of `² · ×` at 0.5–0.8 m and in the narrow field of view of the Meta VR Glasses; no network request for the font on the Quest (M1 and M2 entries in `qa/device/DEBT.md`).

## Changelog
- 2026-10-05: user decision on the font: option A is already approved (no waiting after the spike), the spike lasts 45 minutes and, if it fails, D is adopted with no further questions; part B runs "if A was adopted" (no longer "if the user chose A"); added check 10 (license and credits: `public/fonts/OFL.txt`, line `font-inter-msdf`, exception in `docs/RULES.md`, hygiene test) and renumbered the checks of branch D (now 11, with a check that there are no font files or written exceptions) — reason: record the user's answers to open question 1 of the M2 plan.
