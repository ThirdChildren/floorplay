# Data formats

All files are JSON, **in English** (keys and values: the values appear in the interface).
The schemas in `schemas/` are the source of truth; `logic-tester` uses them in the tests.

## Coordinate system

- Unit: **metres**. The plan lies on the **x–z** plane: `x` to the right, `z` towards the bottom of the drawing
  ("towards the viewer"). `y` is height.
- A 2D point on the plan is `[x, z]`; a 3D point is `[x, y, z]`.
- `northAngleDeg`: angle **clockwise** from the plan's "up" direction (−z) to true north.
  Example: main facade (side z = 0) facing south-east → the plan's "up" points to 135°
  → north is at 225° clockwise → `northAngleDeg: 225`.

## house (`public/houses/*.json`, schema `schemas/house.schema.json`)

| Field | Meaning |
|---|---|
| `id`, `title`, `areaM2`, `floor` | identity and listing data (commercial area) |
| `location` | `{ lat, lon }` for the sun calculation (approximate position) |
| `northAngleDeg`, `ceilingHeight` | orientation and ceiling height |
| `rooms[]` | `id`, `name`, `polygon` (`[x, z]` points, clockwise), `floorMaterial` |
| `walls[]` | `id`, `from`, `to`, `thickness`, `exterior`, `openings[]` |
| `openings[]` | `id`, `type` (`door`/`window`), `offset` (m from the `from` end), `width` (clear width), `height`, `sill` (windows), `connects` (doors: two room ids or `"outside"`), `entrance` |
| `viewpoints[]` | `id`, `room`, `position` `[x, z]`, `yawDeg` (0 = towards −z, clockwise), `eyeHeight` |
| ↳ rooms without a viewpoint | every room must have a blue marker on the model: if the file does not name a viewpoint for a room, the loader (`checkHouse`) adds one at the end (a free `V<n>`), at the point of the room farthest from the walls (always inside the polygon, even for L-shaped rooms), facing the nearest door or, without doors, the longest side. Viewpoints written in the file never change |
| `fixtures[]` | fixed objects the tenant can point at: `id`, `name`, `room`, `category`, `position` `[x, y, z]` |
| `staging` | "Furnish" presets: `{ "<style>": [{ catalogId, position [x, z], rotationDeg }] }` |

Categories (`category`): `plumbing`, `electrical`, `appliances`, `furniture`, `floors_walls`,
`windows_doors`, `other`.

## Passage rule (FitCheck) — REMOVED on 2026-11-14

> **Removed** (interface fixes, `qa/reports/UI-FIX-2026-11-14.md`): the app no longer shows any message about passing through doors (`Fits` / `Won't fit` / `Fits when disassembled` / `No route`), nor the markers on the doors, nor the `Fit` tab of the menu. `src/logic/door-graph.ts` and `src/logic/fit-check.ts` no longer exist. The text below stays as history; the fields `kind: "mobility"` and `disassemblable` stay in the data format (schemas unchanged) but the app does not use them.

Simplified and declared as such in the app (second fixed line of the label: "Simplified check").
Pure logic in `src/logic/door-graph.ts` and `src/logic/fit-check.ts` (D34 in `docs/plans/M3.md`).

1. Route: from the door with `entrance: true` to the destination room, on the door graph
   (`connects`; nodes = rooms + `outside`), path with the fewest doors (on a tie, the first in file
   order). Only the entrance door can connect `outside`. Unknown room, home without an
   entrance or isolated room: `no-route` ("No route from the entrance to this room").
2. **Furniture** (`kind: "furniture"`) with dimensions `w x d x h`: sorted ascending `a <= b <= c`.
   It passes through a door if `a <= width + 0.01` and `b <= height` (it can be tilted); the 1 cm
   tolerance applies only to furniture.
3. **Wheelchair / stroller** (`kind: "mobility"` in the catalog): it passes if
   `size[0] + 2 x 0.05 <= width`, **without** tolerance (only 1e-9 for the numeric noise of
   decimals: 0.70 + 0.10 passes through a door of 0.80, not through one of 0.79). The door height
   does not matter and a mobility piece is never disassembled.
4. **Unverified corridors**: the house file has no corridor data (width,
   turns), so the FitCheck looks only at doors. In the demo homes the corridor of A is
   1.6 m wide and would not change any result. This is the reason for the "Simplified check".
5. The result indicates **the first door on the route** that does not let it through and the reason. Codes
   **distinct** from the placement reasons of M2: `door-too-narrow`, `door-too-low`, `fits-disassembled`,
   `no-route` (plus `fits`). `blocks-door` is **never** reused: it is the free zone of 0.30 m
   in front of a door and remains an invalid-placement reason. A piece with `disassemblable: true`
   blocked by a door is `fits-disassembled` (never "blocked").
6. Texts (whole cm, short name in lowercase without a leading "My "), in `strings.fit`:
   `Won't fit: the door is 80 cm wide, the sofa's shortest side is 85 cm` /
   `Won't fit: the door is 75 cm wide, the wheelchair needs 80 cm` /
   `Won't fit: the door is 210 cm high, the sofa needs 230 cm` /
   `Fits when disassembled: the door is 90 cm wide, the bed's shortest side is 95 cm` /
   `Fits: the narrowest door on the way is 90 cm wide` /
   `No route from the entrance to this room`.

Expected results on the demo data (doors of A: `d-entrance` 0.90, `d-living`/`d-bedroom`/`d-study` 0.80,
`d-bathroom` 0.75; of B: all 0.90 except `d-bathroom` 0.80):
- sofa 85 x 95 x 230 (`my-sofa`): blocked on `d-living` (80 cm) in A, passes into the living room of B;
- `my-bed` bed (disassemblable): `fits-disassembled` on `d-entrance` (90 cm) towards any room;
- wheelchair 70 cm (80 needed): blocked on `d-bathroom` (75 cm) in A, passes into the bathroom of B;
- stroller 60 cm (70 needed): passes even through the bathroom of A.

## catalog (`public/catalog/catalog.json`)

`items[]`: `id`, `name`, `kind` (`furniture` | `mobility`), `size` `[w, d, h]` in metres,
`disassemblable` (beds, wardrobes, tables; the field stays in the format but is no longer used by the app after the removal of the FitCheck), `model` (glb path, `null` until the `asset-curator` assigns it), `credit` (id in `CREDITS.md`).
Schema: `schemas/catalog.schema.json` (it also applies to `my-furniture.json`: without `model` it needs `owner`; with `model` it needs `credit`).
Hand-written validation in `src/logic/catalog.ts` (`checkCatalog`), with unique ids in addition. Flat pieces
(`size[2] ≤ 0.02`, the rug) do not collide with other furniture and do not block doors.

### Furniture pose (`rotationDeg`, `position`)

It applies to `house.staging[].rotationDeg`, to the app state and to the catalog (`size = [w, d, h]`):

- `position` = **centre of the footprint** `[x, z]` in plan metres; the piece stands on the floor (y = 0).
- `rotationDeg` ∈ {0, 90, 180, 270}, **clockwise seen from above** with the plan drawn with −z at
  the top (like `viewpoints[].yawDeg`). Any other value is brought to the nearest quarter turn.
- **Front**: at 0° the front of the furniture faces **−z** (towards the top of the plan).
- **Footprint** on the plan: `[w, d]` at 0° and 180°, `[d, w]` at 90° and 270°.
- In Three.js: `object.rotation.y = −rotationDeg · π / 180` (same convention as the walls).
- The `rotationDeg` values of `staging.scandinavian` do not yet follow the front (chairs and wardrobe face the
  wrong side): they do not change the footprint and will be reviewed in M5.

### Size overrides of the catalog (browser storage, start screen)

The user can change the width, depth and height of the `furniture` items of the catalog on the start screen (Furniture). The sizes are
kept in `localStorage`, key **`soglia:v1:catalog-sizes`**, never in `catalog.json`:

```json
{ "version": 1, "sizes": { "bed-double": [170, 200, 95] } }
```

- Values are **whole centimetres** `[width, depth, height]`. An item that equals its catalog size has no entry; no entry at all means no key.
- Limits per side (`src/logic/catalog-sizes.ts`, `limitsCm`): a quarter to three times the catalog size, and at most 5-400 cm
  (width, depth) and 1-300 cm (height). A flat piece (the rug, height <= 2 cm) stays flat (1-2 cm); a piece that is not flat stays at
  least 3 cm tall.
- The overrides are read **once, when the page loads**, and applied to a copy of the catalog (`applyCatalogSizes`): `size` becomes the
  new size in metres and `defaultSize` keeps the size of the file. Menu cards, placement, collisions and the model (the glTF is scaled
  from `defaultSize` to `size`) all use the new size. Pieces saved in an older state keep working: a saved piece stores only its catalog
  id, position and rotation.
- **`reset=1` does not remove the sizes** (nor the loaded house files): they are the user's settings, not the saved state of a house.
  Use "Reset all to default" on the start screen, or remove the key, to get the catalog sizes back.
- A missing, full or blocked `localStorage` keeps the sizes in memory for this page only; the start screen then says that they cannot be
  applied (applying needs a reload).

## URL parameters of the page

Besides the parameters in `CLAUDE.md` (`house`, `role`, `reset`, `seed`, `time`, `debug`, ...), **`intro=0|1`** (default `1`) controls the
start screen. With `intro=1` the page opens on the start screen (Load house file, Furniture, Enter VR) and the immersive session is
started only by its **Enter VR** button (the session is not offered to the browser). With `intro=0` there is no start screen: the
session is offered to the browser as before (`xr enter` of the CLI accepts it) and the floating box of the houses is on the page.
Automated QA that does not use the start screen must set `intro=0` (in the URL or in `dev-params.local.txt`).

## my furniture (`public/demo/my-furniture.json`)

Like `catalog.items`, with `owner: "me"`. In MR the measurements can come from pinching the corners.

## issue (`public/demo/issues-*.json`, schema `schemas/issue.schema.json`)

| Field | Meaning |
|---|---|
| `id`, `houseId` | identity |
| `kind` | `issue` (report), `question` (question to the agent), `baseline` (defect in the move-in report), `info` (info point) |
| `position` | `[x, y, z]` in house coordinates |
| `fixtureId` | optional, if anchored to a fixture |
| `category`, `urgency` | category as above; `low` / `medium` / `urgent` |
| `text`, `audio` | text; path of the voice note (optional) |
| `status` | `open` → `in_progress` → `resolved` → `archived` (only for `issue`) |
| `history[]` | `{ at, by, event, note? }` with `by` ∈ `tenant`, `landlord`, `agent`, `visitor` |

Valid `status` transitions: `open→in_progress` (landlord), `in_progress→resolved` (landlord),
`resolved→archived` (tenant confirms), `resolved→in_progress` (tenant rejects). The others are forbidden.
Colors: open red, in_progress orange, resolved green, archived grey, baseline blue.
