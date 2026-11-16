# S6.3 · Browser feature probe (`[soglia:env]`)

> **Changelog 2026-11-07**: scenario created from the M6 plan (D65, D70; T6.A5). In IWER the probe **cannot** prove what is in the Quest Browser: here it is checked that the line exists, is well formed, **does not throw exceptions**, **does not require any session or optional feature** and recognizes the emulator (the positive case of `iwer=yes`; the `iwer=no` case is headset only).

> **Changelog 2026-11-07 (evening, T6.A12, after the implementation)**: (1) **IWER overwrites `navigator.userAgent` with a Quest user agent (`OculusBrowser/33.0.0.x.x.x`)**: in the emulator `ua=` is that and **not** `HeadlessChrome/…` (the first draft was wrong); the user agent proves nothing, the emulator is recognized from `IWER_DEVICE` and from three weak clues, with a separate line `[soglia] env iwer clues device=1 uaOwn=1 xrOwn=1 nonNativeXR=1` (prefix `[soglia] `, **not** `[soglia:env]`); in IWER `iwer=yes` and the four clues at 1; (2) the `[soglia:env]` line has **`readyMs=` before `startMs=`** (`performance.now()` at "world ready" and at the first frame) and appears **at the first frame**, also outside a session; (3) the `session` line appears **2 s after the start of each session** (one per session), with `mode` derived from `environmentBlendMode` (`opaque` → `immersive-vr`), `space` from the granted features, `frameRate=90 rates=72,80,90,120` in IWER (emulated), `inputs=` = what is there at +2 s (controller until switching to hands: accept `controller`, `hand` or `none`); (4) values seen by the engineer in IWER: `vr=yes ar=yes hand=iface anchors=iface hitTest=iface planes=iface meshes=no speech=yes mediaRecorder=yes getUserMedia=yes virtualKeyboard=yes`: they are emulator data, **not** Quest data; (5) the storage probe key is `soglia-env-probe` (removed after rereading).

**Milestone**: M6 (phase A) · **Type**: PC (IWER emulator via MCP `iwsdk-runtime`) · **`CLAUDE.md` rules**: 5 (feature detection always, with a fallback) · Plan: `docs/plans/M6.md`.
Implementation prerequisite: T6.A5. Conventions: `qa/scenarios/M5-gate-notes.md`.

## Preconditions
- `BASE` = `house=apartment-a&role=visitor&reset=1&seed=1&debug=1&pinch=grip`.
- M5 standard setup (file, `browser_reload_page`, `xr_accept_session`, `xr_set_input_mode {mode: "hand"}`, wait 4 s).

## Steps
1. **Before the session**. Write `BASE`, reload **without** accepting the session. `xr_get_session_status` → `sessionActive: false`, `sessionOffered: true`. Log `pattern: "soglia:env|env iwer"`: a line `[soglia:env] ua=… iwer=… secure=… storage=… vr=… ar=… hand=… anchors=… hitTest=… planes=… meshes=… speech=… mediaRecorder=… getUserMedia=… virtualKeyboard=… readyMs=… startMs=…` and the separate line `[soglia] env iwer clues device=… uaOwn=… xrOwn=… nonNativeXR=…`.
2. **Format**. Each field has a value of its type: `ua` without spaces or markup, length ≤ 40 (**in IWER `OculusBrowser/33.0.0.x.x.x`**, a Quest user agent set by the emulator); `iwer`, `secure`, `vr`, `ar` ∈ {`yes`, `no`, `n/a`}; `storage` ∈ {`ok`, `blocked`, `missing`}; the features ∈ {`yes`, `no`, `iface`, `n/a`} (`iface` = the interface is there, the operation is not proven); `readyMs` and `startMs` numbers > 0 with `readyMs ≤ startMs`, in the order `readyMs` then `startMs`; the `iwer clues` line has the four clues as `0`/`1`/`?`.
3. **IWER positive case**. `iwer=yes` (and `device=1` in the clues line) and `storage=ok` (the project saves in `localStorage`: the probe writes and rereads a probe key and **deletes it**; `ecs`/log must show no leftovers; check that the `soglia:v1:state:*` keys have not been touched: the `state saved` line of the previous scenario stays the same).
4. **No side effects**. After the line, `xr_get_session_status` still `sessionActive: false` (the probe did not call `requestSession`); no permission requested; no network request (network log absent or unchanged).
5. **Session**. `xr_accept_session`, hands, wait 4 s. Log `pattern: "soglia:env"`: a second line (**2 s after the start of the session**, so with the 4 s wait it is already there) `[soglia:env] session mode=immersive-vr features=<list> space=<type> frameRate=<n|n/a> rates=<list|n/a> views=<1|2> inputs=<list>`; unavailable data are `n/a`, never `undefined`/`NaN`/empty; it appears **only once** per session (after `xr_end_session` and a new session, a new line).
6. **Without `debug=1`**. `house=apartment-a&reset=1&seed=1` (no `debug`): no `[soglia:env]` line.
7. **With missing features** (proven by the unit tests `env-probe.test.ts`, not here): the line with all the interfaces `undefined`, an `isSessionSupported` that does not resolve within 1.5 s and a `localStorage` that throws produces a valid line with `n/a`/`blocked`. The gate cites `npm test` and the number of tests of the file.
8. Unfiltered log (`error`, `uncaught`, `Cannot read`, `Missing glyph`): no line; cleanup.

## Checks (all mandatory)
1. **Step 1**: the `[soglia:env]` line exists before the session, with all the listed keys.
2. **Step 2**: types and constraints of the fields (no `undefined`/`NaN`).
3. **Step 3**: `iwer=yes` in IWER; `storage=ok`; no leftover of the probe key.
4. **Step 4**: the probe has not opened sessions or asked for permissions (`sessionActive: false` before acceptance).
5. **Step 5**: `session` line with the contract fields, one per session.
6. **Step 6**: absent without `debug=1`.
7. **Step 7**: `npm test` green with the probe tests (≥ 15).
8. Console: 0 `error`, 0 `warn` from the probe.
9. **Headset only** (high): `iwer=no` **and the four clues of the `iwer clues` line all at `0`**; `ua=OculusBrowser/<version>` (the user agent does not decide: in IWER it is the same); which interfaces really exist (`hand`, `anchors`, `hitTest`, `planes`, `meshes`), `speech`, `mediaRecorder`, `getUserMedia`, `virtualKeyboard`; `frameRate`/`rates` of the session; `views=2`; `startMs` (cold start < 10 s is another measurement: from pressing the link to the visible model).

## Outcome
PASS if checks 1–8 are met · FAIL otherwise.

## To defer to the headset
Entry "`[soglia:env]` on the Quest Browser" of `docs/plans/M6.md`; session S0 of phase B closes it.
