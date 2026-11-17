# Floorplay

**Floorplay turns a home listing into a 1:20 tabletop model you furnish, walk through and look after with your hands only.**

Live demo: <https://thirdchildren.github.io/floorplay/> (open it in the headset browser)

Demo video: <https://youtu.be/pn9RRxbicKw>

Floorplay is a hands-first WebXR app for Meta Quest, built with the Immersive Web SDK. It has no controller
steps, no thumbstick movement and no teleport. You sit at a table and use your hands.

## What it is

The home from a listing appears on your table as a small model (scale 1:20). One model, three acts:

1. **Choose** (visitor). Furnish the model with your hands. Try your own pieces (the sizes are yours to set).
   Step inside a room at real size. See where the sun falls at a time you pick.
2. **Present** (agent). Open info points on the model. Furnish or clear the whole home in one pinch, then undo.
3. **Live** (tenant and landlord). Report a problem at the exact spot, such as a leaking washer. The report
   moves from red to orange to green. Keep a history and a move-in report.

Three demo apartments are included. The one that opens by default, `apartment-c` (three bedrooms, 126 m²), was
converted by hand from a real floor plan into the JSON format; it has the full demo (furnishing, info points, sample issues). You can also load your own home from a JSON file on the start screen
(format in [`docs/DATA_FORMATS.md`](docs/DATA_FORMATS.md)).

## Try it

1. Open the live demo in the Meta Quest Browser.
2. Put the controllers down. Press **Enter VR** on the start screen (use your hand to point and pinch).
3. Sit at a table or in a chair. The model appears in front of you, within arm's reach.

Useful URL parameters (add them after the address, for example `?house=apartment-b&role=tenant`):

| Parameter | Values | Effect |
|---|---|---|
| `house` | `apartment-c` (default), `apartment-a`, `apartment-b` | Open a demo home. |
| `role` | `visitor`, `agent`, `tenant`, `landlord` | Start in a role. You can also switch in the Issues panel. |
| `reset` | `1` | Ignore the saved state of the home. |
| `time` | `2026-12-21T10:00` | Set the date and time of the sun. |
| `intro` | `0` | Skip the start screen. |
| `contrast`, `text` | `contrast=1`, `text=large` | Start with high contrast or large text. |
| `mr` | `0` | Turn mixed reality off and use the VR model only. |
| `debug` | `1` | Show draw calls, triangles and fps. |

## Hand gestures

| Do this | To get this |
|---|---|
| Pinch a piece in the menu, move, release | Place furniture. A red frame and a short note show why a piece does not fit. |
| Pinch a room | Show its name and area. |
| Pinch with both hands, move apart or turn | Zoom and turn the model. |
| Pinch the free base of the model, drag | Move the model on the table. |
| Palm up | Open the furniture menu. |
| Pinch the **Menu**, **Issues** or **View** button beside the model | Open that panel with one hand. |
| **Rotate** button above a piece | Turn it a quarter turn. |
| Pinch a blue marker | Step into a room at real size. |
| Close both fists, pull back like rowing | Walk inside the model. Look where you want to go. A comfort vignette shows while you move. |
| **Tabletop** button | Go back to the model on the table. |
| Hold a pinch on an appliance or a spot (tenant) | Report a problem. Pick a category, a phrase and an urgency. |
| Point at a spot for one second (tenant) | Open the new-issue form there, with no pinch. |

Moving between places uses a short fade. Walking is slow and only starts with the row gesture.

## Accessibility

- Every path works with one hand. The Menu, Issues and View buttons sit beside the model, and you can
  move them to the left hand in **View > Hand**. The default is the right hand.
- **View > Contrast** switches to a high-contrast theme. **View > Text** switches to large text.
- Panels stay near the centre of your view, at 0.5 to 0.8 m.
- Status is always a word as well as a colour.

## Sample data

Some content is made up so you can see the full flow. It is labelled **Sample data** in the app: the move-in
report, the issue history of the demo apartment, and the agent's info points. The sun is a simplified light: patches
on the floor through the windows, with no shadows.

## Mixed reality

On a headset that supports passthrough, Floorplay starts in mixed reality: the model sits on your real table.
Pinch **My room** beside the model to see your real room. The objects from your headset room scan (Space Setup)
are outlined: pinch one to see its size and **Add to Mine**, so it joins your own furniture in the menu. In the Mine tab,
**Manage** removes a piece (press twice) or brings a removed one back. You can
also place virtual pieces at real size on your floor. Pinch **Model** to go back. Without a room scan the app says
so and the rest works as usual. Add `?mr=0` to use the VR model only. Browsers without passthrough get VR.

## Tech

- [Immersive Web SDK](https://iwsdk.dev) (IWSDK), TypeScript, Vite. WebXR hand tracking.
- No backend and no external service. The demo runs from static files.
- State (furniture, role, reports, preferences) is saved automatically in your browser and restored when you
  reload or put the headset back on.
- Pure logic (geometry, snapping, collisions, sun position, issue states, permissions) lives in `src/logic/`
  and is covered by unit tests.
- Browser features are checked before use, with a fallback.

The app was functionally tested on a Meta Quest on 16 November 2026. Performance is still being tuned on the headset.

## Build and run

Needs Node 20.19 or newer (22.12 recommended, see `.nvmrc`).

```sh
npm install
npm run dev        # dev server with the IWER browser emulator on localhost
npm test           # unit tests (Vitest)
npm run typecheck  # TypeScript checks
npm run build      # production build in dist/
```

Other files: `public/houses/` (demo homes), `public/catalog/` (furniture), `schemas/` (JSON Schemas),
`docs/DATA_FORMATS.md` (file formats), `src/ui/strings.ts` (all text in the app).

## Assets and licenses

All art is CC0 or made for this project. The furniture models are from the Kenney Furniture Kit (CC0).
Three documented exceptions, each with its license shipped in the build:

- Generic hand models from the WebXR Input Profiles (MIT).
- The Inter font, as panel text atlases (SIL Open Font License 1.1).
- Menu icons from Lucide and Feather via `@pmndrs/uikit-lucide` (ISC and MIT).

The sun position uses published formulas, written from the description with no copied code. Full list and
sources: [`CREDITS.md`](CREDITS.md).

## Competition

Floorplay was made for the Meta VR Start Developer Competition 2026 (Productivity track, New Experience
division). It is an independent project, not endorsed by or affiliated with any company.

## License

The source code is released under the [MIT License](LICENSE). Third-party assets keep their own licenses (see `CREDITS.md`).
