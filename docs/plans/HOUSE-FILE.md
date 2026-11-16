# Loading a home from a JSON file (branch `claude/house-file-upload`)

**User decision (2026-11-12)**: add a feature to load a home JSON file (format `schemas/house.schema.json`, `docs/DATA_FORMATS.md`) and get the home with its measurements; new branch from `main`, its own PR; same deadline as mixed reality (ready and tested on the headset by **Sunday 15 November morning**, otherwise it stays on the branch). The sample home derived from the user's PDF is **not** added to the repository.

## Decisions
- **HF1 · Where**: on the 2D page, before entering VR (in an immersive session the file picker is not available). A small DOM panel (texts from `src/ui/strings.ts`, in English, large and high-contrast) with: current home (title and area), choice between the demo homes and the loaded ones, `Load house file` (system picker, `accept=".json,application/json"`), dragging the file onto the page, `Remove` for loaded homes. Hidden during the XR session. Works with the hand pointer in the Quest Browser (rule 1).
- **HF2 · Checking**: the file is untrusted data: maximum size 1 MB, `JSON.parse`, `checkHouse` (same check as the demo homes), quantity limits for performance (rule 3); errors in English, readable (the first lines of `checkHouse`), no partial load; text shown only as text (never HTML).
- **HF3 · Where it is saved**: in the browser (`localStorage` through `createSafeStorage`), key `soglia:v1:house-file:<id>` and index `soglia:v1:house-files`; id with the prefix `file-` (never in conflict with `apartment-a`/`apartment-b`); at most 5 homes; full quota or missing storage → the home is valid only for the session, with a notice. Layout and issues of a loaded home are saved as for the others (key per home). No server (rule 10).
- **HF4 · Opening**: `?house=file-<id>` opens the loaded home (the panel reloads the page with that parameter); a `file-*` id missing from storage shows the error panel like an unknown home, without network requests. `reset=1` does not delete the loaded homes (only the state).
- **HF5 · Feature detection** (rule 5): `File`, `FileReader`/`Blob.text`, drag and drop and `localStorage` used only if they exist, with a fallback.

## Headset tests
In the Quest Browser: the `Load house file` button opens the file picker (file from Downloads or from a file service of the headset), the loaded home opens in VR with the right measurements, it stays after closing the browser, `Remove` removes it.

## Changelog
- 2026-11-12: plan created after the user's request.
