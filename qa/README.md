# QA

- `scenarios/` — scenari di accettazione per l'emulatore, uno per file (`M<n>-<nome>.md`).
  Li scrive `milestone-planner`, li esegue `emulator-qa` con il server MCP `iwsdk-runtime`.
- `reports/` — report del gate PC (`M<n>-<AAAA-MM-GG>.md`), scritti da `emulator-qa`.
- `device/` — prove sul visore (`M<n>-<AAAA-MM-GG>.md`) e `DEBT.md` con le prove rimandate,
  gestiti da `quest-integrator`.

## Start screen and `intro=0`

Since the start screen (`qa/scenarios/INTRO-start-screen.md`) the page opens on a start screen and the immersive session is started by its
**Enter VR** button, not offered to the browser. **Every scenario written before it (M0-M6, MR) assumes the old entry** (`xr_accept_session` /
`npx @iwsdk/cli xr enter` accepts the offered session): run them with **`intro=0`** added to the URL or to `dev-params.local.txt`
(for example `house=apartment-a&role=visitor&reset=1&seed=1&debug=1&intro=0`). Nothing else in those scenarios changes. `reset=1` keeps the
houses loaded from a file and the furniture sizes (`soglia:v1:catalog-sizes`): a run that needs the catalog sizes starts from a clean browser
profile or uses "Reset all to default" on the start screen.

## Modello di scenario

```markdown
# S<milestone>.<n> · <titolo>

**Milestone**: M<n> · **Tipo**: PC (emulatore) | solo visore

## Precondizioni
- URL: `/?house=apartment-a&role=visitor&reset=1&seed=1`
- Sessione XR accettata, input: mani, testa a (0, 1.2, 0.45) rispetto al plastico

## Passi
1. `xr_set_transform` mano destra su ...
2. `xr_select` (pizzico) ...

## Verifiche (tutte obbligatorie)
- `ecs_find_entities` → esiste `<StableId>` con ...
- console: nessun errore; presente `[soglia] ...`
- screenshot allegato al report

## Esito
PASS se ... · FAIL altrimenti
```
