# S4.2 · Voice note (optional) and no dead buttons

> **Changelog 2026-11-02**: scenario created from the M4 plan (D40, T4.15). Part A applies **always**; part B only if T4.15 was done.

**Milestone**: M4 · **Type**: PC (IWER emulator via MCP) · **`CLAUDE.md` rules**: 5 (feature detection with fallback), 1, 10
Implementation prerequisites: T4.7 (part A); T4.15 (part B). See `docs/plans/M4.md`, D40, "The problem of text with hands only". Conventions: `qa/scenarios/M4-issue-create.md`.

## Preconditions
- `dev-params.local.txt` = `house=apartment-a&role=tenant&reset=1&seed=1&debug=1&pinch=grip&time=2026-11-04T10:00`; standard setup. Desktop Chrome exposes `MediaRecorder` and `navigator.mediaDevices.getUserMedia`, but **without a microphone** in the headless environment `getUserMedia` fails (`NotFoundError`); the Quest Browser may not have them: the app must work in both cases.

## Part A · without T4.15 (mandatory)
1. Open a draft from the washer (S4.1 step 2) and `ui_inspect` on the panel; `ecs_find_entities` with `^ui:issue-(voice|record|note)` (→ 0).
2. Complete the issue with a phrase and `ui:issue-report` (S4.1 steps 3–4).
3. Log `pattern: "voice|audio|microphone|keyboard|feature"` and unfiltered log.

**Checks A**: no `ui:issue-voice*`, `ui:issue-record*`, `ui:issue-note*` entity; no `Record`/`Voice`/`Note` text in the panel; the issue is completed with the phrases only; no microphone permission request; no `error` line. It is a full PASS: voice is not a promised feature.

## Part B · with T4.15 (only if done)
1. **With the APIs present** (Chrome): the draft shows `ui:issue-voice` (text `Record`, ≥ 2.4 cm). Pinch → log `voice permission requested`; without a microphone: `voice unavailable reason=NotFoundError` and **the button disappears** from the draft (no error, the issue is completed with the phrase).
2. **With a virtual microphone** (`--use-fake-device-for-media-stream`, if the environment allows it): `voice recording start`, wait 2 s, `voice recording stop bytes=<n>`; the issue created has `audio` (logical path `idb:issue-014`), in the detail `ui:issue-voice-play` appears; the note is saved in IndexedDB (line `voice saved key=issue-014`), not in `localStorage`.
3. **Without the APIs** (not reproducible in Chrome): covered by a unit test of `hasVoiceSupport(globalThis)` with a fake object.
4. `reset=1` also deletes the note (`state cleared reason=reset keys=<n> idb=<m>`).

**Checks B**: steps 1–4 with the lines indicated; no recording starts without an explicit pinch; no `error`; privacy: no data leaves the browser (no network request).

## Outcome
Part A PASS always; part B PASS only if T4.15 is done and steps 1, 3 and 4 are met (step 2 only if the environment has a virtual microphone, otherwise "not testable" and an entry in `DEBT.md`).

## To defer to the headset
Microphone and `MediaRecorder` in the Quest Browser (consent, quality, comfort); entry in `qa/device/DEBT.md` (low).
