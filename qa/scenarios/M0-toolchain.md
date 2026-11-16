# S0.1 · Toolchain: test, build, CI, data index

**Milestone**: M0 · **Type**: PC (command line, no emulator)

## Preconditions
- Working directory: the project root. No IWSDK runtime needs to be running.
- Clean git tree after the M0 commits (`git status --porcelain` empty) or changes listed in the report.

## Steps
1. `node -v` → record the version.
2. `npm ci` → record the exit code.
3. `npm run typecheck` → exit code.
4. `npm test 2>&1 | tee` → record the exit code, the list of test files and the number of tests.
5. `npm run build` → exit code; then `ls dist dist/houses dist/catalog dist/demo`.
6. Search for external dependencies:
   - `grep -rIlE "https?://" src public iwsdk.config.json index.html | xargs grep -hoE "https?://[A-Za-z0-9.-]+" | sort -u`
     → **must be empty** (the project code contains no external URLs).
   - Hosts present in the bundle: `grep -ohE "https?://[A-Za-z0-9.-]+" dist/assets/*.js | sort -u`.
     Allowed **only**:
     - namespaces and schema identifiers, never requested: `www.w3.org`, `json-schema.org`,
       `jcgt.org`, `iwsdk.dev`, `iwsdk.local`;
     - defaults of `@iwsdk/core` 1.0.1, with no option to change them (see `docs/RULES.md`):
       `unpkg.com` (Draco/KTX2 decoder: only triggered by loading a compressed glTF, forbidden),
       `cdn.jsdelivr.net` (controller profiles and models: the hand glb files have been local since
       2026-10-05, the controllers remain; the host stays in the bundle as the default of `@iwsdk/xr-input`),
       `api.dicebear.com` (default image of the uikit-horizon Avatar component: only triggered
       when an Avatar is used without `src`, forbidden).
     Any other host is a failure.
   - At runtime no network request to the hosts of the second group, except the
     controller models on `cdn.jsdelivr.net` (in the IWER emulator the session starts with the controllers
     connected and the two requests go out anyway: expected, to be recorded).
7. Search for template content: `ls src` and `ls public` → record the list.
8. Static reading of the workflows:
   - `grep -c "npm test" .github/workflows/ci.yml`, same for `npm run build`, `npm run typecheck`;
   - `grep -nE "^\s*(push|pull_request|schedule):" .github/workflows/pages.yml`;
   - `grep -n "workflow_dispatch" .github/workflows/pages.yml`;
   - `grep -n "2026-11-18T20:00:00Z" .github/workflows/pages.yml`.
9. `npx @iwsdk/cli adapter status` → must list `iwsdk-runtime` as configured.
10. **Informative** item (does not decide the result): `grep -il "iwer" dist/assets/*.js` → record whether the production bundle contains the emulator and, if so, how it is activated (`activation` in `iwsdk.config.json`).

## Checks (all required, except 10)
1. Node ≥ 20.19.0 (expected 22.x from the `.nvmrc` file).
2. `npm ci`, `npm run typecheck`, `npm test`, `npm run build` all exit with code 0.
3. The output of `npm test` does **not** contain "No test files found" and names at least `schemas.test.ts`, `data-consistency.test.ts`, `repo-hygiene.test.ts`.
4. The output of `npm test` shows that `apartment-a.json`, `apartment-b.json` and `issues-apartment-a.json` were validated (names in the test titles or in the `it` list). Report the total number of tests (expected ≥ 30).
5. `dist/houses/apartment-a.json`, `dist/houses/apartment-b.json`, `dist/catalog/catalog.json`, `dist/demo/issues-apartment-a.json` and `dist/demo/my-furniture.json` exist.
6. Step 6 prints nothing.
7. `src/` does not contain `robot.ts`, `robot-component.ts`, `panel.ts`; `public/` does not contain `gltf/`, `audio/`, `textures/` or `ui/welcome.uikitml`.
8. `ci.yml` contains the three commands (count ≥ 1 each). `pages.yml` contains `workflow_dispatch`, the freeze date and **no** `push:`, `pull_request:`, `schedule:` line.
9. `adapter status` reports `iwsdk-runtime` as configured.

## Result
PASS if checks 1–9 are all met · FAIL otherwise, with the command, exit code and last 30 lines of output in the report.

## To defer to the headset
Nothing for this scenario. The green status of the CI on GitHub is confirmed after the first push (mark it as "to be confirmed by the user").

## Changelog

- 2026-10-05: list of hosts in step 6 corrected. It used to say that `cdn.jsdelivr.net` is only triggered with controllers connected; in fact the hand model (`generic-hand`) needed it too. The hands are now local (`public/models/hands/`), the controllers remain on the CDN. Reason: M1 gate decision (B1).
- 2026-10-05: step 6 still forbade any request to the hosts of the second group — reason: it contradicted the corrected list above (the controller models on `cdn.jsdelivr.net` go out anyway in IWER); reported by `contest-reviewer` at the M1 gate.
