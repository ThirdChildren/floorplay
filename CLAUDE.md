# Floorplay — project instructions for Claude Code

@AGENTS.md

> The line above imports the official Immersive Web SDK instructions that the template
> (`npm create @iwsdk@latest`) generates in `AGENTS.md`. They always apply: if anything below
> contradicts them on how to use IWSDK, `AGENTS.md` wins; on what to build and with
> which rules, this file wins.

## The project in brief

Floorplay is a **hands-first WebXR** app built with the **Immersive Web SDK (IWSDK)** for the
*Meta VR Start Developer Competition 2026* — track **Productivity**, division **New Experience**.
Submission deadline: **18 November 2026, 12:00 PT** (21:00 in Italy). Rules: `docs/RULES.md`.
Repository: `ThirdChildren/floorplay`.

The home from a listing becomes a **tabletop model** (1:20 scale) that is used with hands only:

1. **Choose** (visitor): furnish with your hands, try your *own* furniture, step into the rooms at real size, see the sunlight.
2. **Present** (agent): info points, virtual furnishing in one gesture, interest map.
3. **Live** (tenant and owner): issue reports anchored to the exact spot in the home,
   with red → orange → green states, history, and a move-in/move-out report.

References: `docs/ROADMAP.md` (milestones and gates), `docs/DATA_FORMATS.md` (JSON files),
`docs/DEVICE_CHECKLIST.md` (headset tests), `schemas/` (JSON Schema), `public/houses/` (demo homes).

## Language

- **Talk to the user in Italian.**
- **Everything that goes into the project is in English**: code, identifiers, comments, commit
  messages, interface strings, sample data, docs, README. The rules require an entirely English
  project: no Italian string may appear in the app.
- All visible strings live in `src/ui/strings.ts` (no text scattered through the systems).

## Non-negotiable rules

They come from the official rules and from the design. A task that violates one is not finished.

1. **Hands only, from start to finish.** Every path can be completed with pinch and gestures;
   controllers may work but are never needed.
2. **Seated.** Interactions within ~60 cm. **No thumbstick locomotion and no teleport**:
   the user moves between *viewpoints* with a fade, or walks inside the model at real scale
   with the "row" gesture (both fists closed, pulled back together like a rowing stroke),
   slow and with a comfort vignette. Walking is armed as soon as the user enters a room by
   pinching a viewpoint marker. See `docs/plans/WALK.md`.
3. **Performance.** At least **60 fps on the Quest** (target 72). Project budget, to be tuned on
   the headset: ≤ 100 draw calls, ≤ 150k visible triangles, textures ≤ 1024 px, shadows only from the sun.
4. **Fast start, clean pause and resume.** State saves itself; taking the headset off and putting
   it back on (or reloading the page) resumes from where the user left off.
5. **Always feature-detect.** Use every browser API (SpeechRecognition, MediaRecorder,
   getUserMedia, plane/mesh detection, anchors, hit test) only after checking that it
   exists, with a fallback. The emulator on desktop Chrome has APIs that the Quest Browser
   may not have.
6. **Content.** Only **CC0 / public domain** assets, provided by Meta for the contest or created
   by us. Every asset goes in `CREDITS.md`. **No trademarks, logos, branded products, or
   recognizable people.**
   The allowed exceptions (framework runtime assets under the MIT license; possible OFL fonts) are
   only those written in `docs/RULES.md`: no non-CC0 asset without an entry there.
7. **Honesty.** Simulated data (e.g. the interest map) is labelled **"Sample data"** in the app.
8. **Field of view.** Essential UI near the center of the view, panels at 0.5–0.8 m, no
   critical elements at the edges: it must also work with the narrowest field of view of the Meta VR Glasses.
9. **Accessibility.** Everything usable with one hand only (palm menu on the right hand by default,
   movable to the left hand in the accessibility options),
   high-contrast theme, large text.
10. **Original core.** No external service at the center of the experience; the demo works
    without a backend.
11. **Import Three.js from `@iwsdk/core`, never from `'three'`** (a second copy of the library
    creates hard-to-find bugs).
12. **Freeze.** After submission (18 Nov 2026, 12:00 PT) and until the winners are announced
    (~11 Dec 2026) the published site is not modified: no deploys.

## Stack and commands

- IWSDK + TypeScript + Vite, Node ≥ 20.19. Check the real script names in `package.json`.
- `npm run dev` — local server; the **IWER** emulator turns on at `localhost`.
- `npx @iwsdk/cli dev up --ai-mode agent` — managed **headless** runtime for agents
  (MCP server `iwsdk-runtime`: XR session, hands, screenshots, profiling, ECS).
- `npx @iwsdk/cli dev up --ai-mode collaborate` — same thing with a **visible** window shared
  with the user. IWSDK rule: **always announce** a headed/headless change before restarting.
- `npx @iwsdk/cli adapter sync` — registers/updates the MCP servers for Claude Code (`.mcp.json`).
  If the `xr_*`, `browser_*`, `ecs_*` tools are not available, run it and ask
  the user to restart Claude Code.
- `npm test` — Vitest on the pure logic. `npm run build` — production build in `dist/`.

## Architecture

```
src/
  index.ts          World.create(...) and system registration
  systems/          ECS systems (use IWSDK / Three.js)
  components/       ECS components
  logic/            PURE logic: no import from @iwsdk/core or three → testable with Vitest
  ui/               panels and palm menu; strings.ts with all the texts (English)
  data/             loading + validation of the JSON files (house, catalog, issues)
  debug/            development-only tools (behind a flag)
public/houses/      apartment-a.json, apartment-b.json, apartment-c.json (default, from a real floor plan)
public/catalog/     catalog.json (+ glb models)
public/demo/        my-furniture.json (test fixture, not loaded), issues-apartment-a.json, issues-apartment-c.json
schemas/            house.schema.json, issue.schema.json
tests/unit/         Vitest tests
qa/scenarios/       acceptance scenarios for the emulator (Markdown)
qa/reports/         QA reports per milestone
qa/device/          headset tests + DEBT.md (deferred tests)
```

| System | Responsibility | Pure logic in `src/logic/` |
|---|---|---|
| `HouseBuilder` | floors, walls with openings, doors, windows from `house.json` | opening geometry |
| `Miniature` | 1:20 model, two-hand rotate/zoom, placement on the table in MR | scale transforms |
| `Furniture` | catalog, grab, snap, collisions, 90° rotation | 2D snap and collisions |
| `Viewpoint` | viewpoints, switching between tabletop model ↔ real scale | — |
| `Sun` | sun position (SunCalc), light and shadows | azimuth/elevation calculation |
| `Issues` | markers, categories, urgency, states, report | issue state machine |
| `Roles` | visitor, agent, tenant, owner | permissions per role |
| `Persistence` | automatic saving and resume | state serialization |
| `Analytics` | interest map from head direction | aggregation |
| `Accessibility` | one hand, high contrast, large text | — |

### Testability conventions (mandatory)

- Every interactive entity has a **stable, readable id** in a `StableId` component
  (e.g. `house:apartment-a`, `room:living`, `wall:w-north`, `door:d-living`, `fixture:washer`,
  `furniture:bed-double#1`, `pin:issue-014`, `viewpoint:V1`, `ui:palm-menu`). QA finds them with `ecs_find_entities`.
- Application state (open home, role, layout, issues, preferences) lives in **a
  single serializable store** (`src/logic/state.ts`): it is what gets saved, restored and verified.
- **Determinism**: no unseeded `Math.random` in the logic; injectable clock for `Sun`
  and timelines.
- **URL parameters for tests**: `?house=apartment-a&role=tenant&reset=1&seed=1&time=2026-12-21T10:00`
  load known states. `?debug=1` shows the statistics (draw calls, triangles, fps) and writes them to the
  console with the prefix `[soglia:stats]`. **`?intro=0`** skips the start screen (automated QA,
  the old entry with the session offered to the browser); without it, the page opens the start screen and
  the session starts only from the Enter VR button. `reset=1` does not delete homes loaded from file or the
  furniture measurements (`soglia:v1:catalog-sizes`). See `docs/DATA_FORMATS.md`.
- QA-friendly logs with the prefix `[soglia]` and no errors in the console on the normal path.

## Two levels of verification

1. **PC gate (always, without a headset).** `npm test` green, `npm run build` ok, the milestone's
   scenarios passed in the emulator through MCP, no console errors, `contest-reviewer`
   with no blockers. A milestone is **PC-done** when it passes this gate.
2. **Headset gate (when the Quest is available).** Checklist in `docs/DEVICE_CHECKLIST.md`.
   A milestone is **Device-done** when it also passes this. Until the headset is available, every
   deferred test goes in `qa/device/DEBT.md`.

Never write or say "it works on the headset" for something tested only in the emulator.

## Subagents and workflow

All subagents use **Sonnet 5.5 with effort high** (see `.claude/agents/`).

| Agent | When to use it |
|---|---|
| `milestone-planner` | at the start of every milestone: tasks, acceptance criteria, QA scenarios |
| `xr-engineer` | every change to the app code (systems, components, UI, interactions) |
| `logic-tester` | Vitest tests of the pure logic, JSON schemas, regressions |
| `emulator-qa` | run the scenarios in the IWER emulator via MCP and write the report |
| `asset-curator` | find, optimize and register CC0 models and textures |
| `quest-integrator` | everything about the headset: setup, tests, real performance |
| `contest-reviewer` | review of compliance with the rules and of quality (read-only) |
| `submission-writer` | texts in English: UI, Devpost, testing instructions, video script |

**Cycle of a milestone**

1. `milestone-planner` → plan in `docs/plans/Mx.md` + scenarios in `qa/scenarios/Mx-*.md`.
2. For each task: `xr-engineer` implements (small, one system at a time) → `logic-tester`
   adds/updates the tests → commit.
3. `emulator-qa` runs all the milestone's scenarios → `qa/reports/Mx-<date>.md`.
4. `contest-reviewer` → verdict; blockers go back to `xr-engineer`.
5. PC gate passed → update the status in `docs/ROADMAP.md` and add the deferred tests to
   `qa/device/DEBT.md`.
6. When the headset is available: `quest-integrator` runs the headset gate for the milestones in debt.

The main context coordinates: it delegates to the subagents, does not repeat their work, and summarizes
to the user in Italian what was done and what remains.

## Git

- Small commits, in English, conventional format: `feat:`, `fix:`, `test:`, `docs:`, `chore:`.
- The history shows that the project was started after 24 September 2026 (New
  Experience division): no import of pre-existing code, no history rewriting.
- Deploying to GitHub Pages is **manual** (workflow `pages.yml`): never during the freeze.
- Never commit secrets; `.env` is ignored.
- **No AI attribution in commits or PRs**: no `Co-Authored-By: Claude…`, no `Claude-Session:` trailer, no "Generated with Claude Code" footer (owner's decision, 2026-11-16).

## What not to do

- Add heavy dependencies without asking the user.
- Introduce thumbstick locomotion, teleport (walking with the "row" gesture of rule 2 is the only exception), or interactions that require the controller.
- Write Italian text in the interface or in the data.
- Use assets without a verified CC0 license or with recognizable trademarks.
- Mark a gate as passed without the report that proves it.
