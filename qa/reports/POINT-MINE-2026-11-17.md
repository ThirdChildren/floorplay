# POINT-MINE: tenant furnishing back, pointing at a spot, Mine removal (2026-11-17)

**Gate**: PC only (IWER headless, cloud machine, SwiftShader: fps 8-12 mean nothing). Branch `main`. **Nothing here was tried on a headset**: see the POINT and MINE rows of `qa/device/DEBT.md`.
Checks before each commit: `npm run typecheck`, `npm test` (165 files, 7107 tests passed, 1 skipped), `npm run build`.

## What changed

1. **The tenant furnishes again.** `git revert` of 68f1ad9 plus the `furnish` parts of 70b56be: the `furnish` action, its store gates, the "View only" menu and the strings are gone (table back to 11 actions). `delete` (archived issues) stays. Menu tabs, grab, Rotate, Undo, coach and My room work for the tenant as for the visitor.
   Pinch arbitration is what it was before 68f1ad9: the grab claims a pinch that lands on a piece, and the long pinch waits for the claims (`issue-create.ts` `decide`), so a long pinch that starts ON a piece moves the piece; on the floor, a wall or a fixture it reports.
2. **Pointing at a spot for 1 s** (tenant): `src/systems/point-issue.ts` with pure `point-gesture.ts` (pose from fingertip-to-wrist distances, hysteresis, pinch lockout, filtered finger ray), `point-target.ts` (analytic ray against floor, walls, furniture in house coordinates, no mesh), `point-dwell.ts` (1 s timer, tolerance, grace, release). The form is opened by `startIssueAt` (same path as the long pinch). The ghost `pin:draft` grows while the finger rests. At real scale the Issues panel opens for the new-issue form only. Hint string `strings.point.hint`. Debug hook `window.__sogliaPoint` (`?debug=1`).
3. **Mine removal and restore**: store fields `removedScanned`, actions `removeScanned` / `restoreScanned`, menu Mine tab with `Manage` / `Done` cards (`src/logic/mine-menu.ts`), two-press removal, restore in one press, saved with the state. `Add to Mine` on the scan card of a removed object restores it. See `docs/DATA_FORMATS.md`.

### Decisions
- **Placed pieces of a removed Mine item stay** in the house (the catalog entry is kept), and are not parked at the next start. Simplest and safe: nothing in the layout changes.
- **`my-furniture.json` items**: not loaded since 2026-11-16, so there is nothing built in to remove; only room-scan pieces go through this. The Removed list holds at most 12 (a 13th removal is refused with `mine remove refused reason=removed-full`); a removed id is never handed out again.
- **Pointing surfaces**: floor, walls (cut at 1 m on the table, full height at real scale, openings not cut out) and placed furniture; a fixture is reached through the snap of `resolveAnchor` (0.4 m of the house) as for a long pinch.
- **Tolerance**: 3 cm of the model on the table (0.6 m of the house at 1:20), clamped to 0.1 to 0.6 m of the house (so 10 cm at real scale).
- **Panel under the ray**: not tested geometrically. The gesture is shut off while the menu, the View panel, the Issues panel or a scan card is open (those are the panels that sit in front of the model), and during any pinch or claim. The fixed buttons and small hints are not checked (DEBT row).

## Results (emulator)

| # | Check | Result | Evidence |
|---|---|---|---|
| 1 | Tenant: pinch on `furniture:sofa-3seat#1`, carry, release | PASS: `furniture grabbed ... hand=right`, `furniture placed` | log |
| 2 | Tenant: long pinch (1.5 s) on a free floor spot | PASS: `issue hold start`, `issue draft created at=1.00,0.80,1.00`, `issues screen=new` | `POINT-02-long-pinch-form-tenant.png` |
| 3 | Pointing, tabletop, real joints (`point` pose), floor/furniture | PASS: `point start`, progress 0.09 to 1.0 over 1 s, `point fired seconds=1.0`, `issue draft created`, `issues screen=new` | `POINT-01-dwell-ghost-pin.png` (mid dwell, ghost pin) |
| 4 | Finish the report from that form (Furniture, "is loose", Report) | PASS: `issue created id=issue-014 ... text="The furniture is loose."`, red pin at the pointed spot | `POINT-03-pin-created-by-pointing.png` |
| 5 | Open hand, fist | PASS: never a dwell (reasons `curl` / `index`) | status rows |
| 6 | Pose lost at 0.4 s | PASS: `point cancelled reason=pose` | log |
| 7 | Spot moved 3.5 m of the house mid dwell | PASS: `point moved` (dwell restarts), fires 1 s after on the new spot | log |
| 8 | Other hand pinches while pointing | PASS: `point cancelled reason=pinch`; pointing again after the pinch ends and the lockout (0.4 s) | log |
| 9 | Role visitor, same pose | PASS: no dwell, no `point start` | status |
| 10 | Pointing at real scale (V1), floor 1.8 m ahead | PASS after a fix: first run was refused (the Issues panel never opened at real scale: `form-refused`), now `point fired`, form open and kept (no `closed via=view`) | `POINT-04-real-scale-form.png` |
| 11 | Hint | PASS: shown after 6 s as three lines above the menu hint, ends on pointing or after 8 s | log |
| 12 | Mine: tab with pieces + `Manage`; `Manage` list; first press "Press again"; second press removes | PASS | `MINE-01` to `MINE-04` |
| 13 | Reload: removed piece listed as "Restore"; press restores; reload keeps it in Mine | PASS (`state saved ... removedScanned=1`, then `scanned=3`) | `MINE-05` to `MINE-07` |
| 14 | A piece of My bed placed in the house, then removed from Mine, reload | PASS: `state restored pieces=1`, no `piece parked` | `MINE-08` |
| 15 | `mr=1`: Add to Mine on the couch card, remove it from Mine, Add again | PASS: `mr object added id=my-scan-couch-1`, then `mr object restored id=my-scan-couch-1` | log |
| 16 | Console | PASS: no `warn`; one `error`: `GET tuning.local.txt net::ERR_ABORTED`, the known poll artifact | `browser logs` |

### How the emulator was driven (and what that proves)
- **Pointing** goes through the real joints: `qa/scenarios/POINT.helper.mjs` registers a `point` finger pose in IWER (the default hand with middle, ring and pinky pulled to 0.47 of their distance from the wrist; the right hand mirrors x) and places and turns the hand from page JS. The recognition, the ray, the dwell and the form are the real code paths. The Mine data was seeded by writing `scannedFurniture` into the saved state in `localStorage` (`browser run`), then reloading, because the scan card path was tried separately in step 15.
- The emulator's default index finger is splayed (about 23 degrees), so the aim was computed from the joints of the pose table, not from the hand axis.
- Not driven: the row walk against pointing (covered by the gate `isRowActive`, not run), a piece held while pointing (the grab claim gate), the tenant coach.

## Unit tests added or changed
`tests/unit/point-gesture.test.ts` (open hand, relaxed hand, fist, loose pinch, pinch lockout, hysteresis, arming, filter), `point-dwell.test.ts` (1 s, tolerance, drift, grace, release, external cancel), `point-target.test.ts` (world to house, ray against boxes, walls of apartment A, furniture, fixture snap, outside the house), `mine-menu.test.ts`, `mine-remove.test.ts` (store, Add after removal, ids, limits, saving, placed pieces not parked). Removed: `tenant-furniture.test.ts`. Updated: `permissions.test.ts`, `persistence.test.ts`, `persistence-no-catalog.test.ts`, `state.test.ts`.
