# Devpost submission — Floorplay

Copy-ready texts for the Devpost "Enter a Submission" form. Everything here is checked against the app
(`src/ui/strings.ts`, `README.md`, `docs/plans/`). Items marked **[OWNER]** need a decision or a fact from the owner.

## Form fields

| Field | Value |
|---|---|
| Project name | Floorplay |
| Tagline (≤ 140 chars) | Turn a home listing into a 1:20 tabletop model you furnish, step into and look after with your hands only. (106 chars) |
| Track | Productivity |
| Division | New Experience |
| Link (WebXR) | https://thirdchildren.github.io/floorplay/ |
| Source code | https://github.com/ThirdChildren/floorplay |
| Video | **[OWNER]** YouTube or Vimeo link, public, under 3 minutes (script: `docs/submission/VIDEO_SCRIPT.md`) |
| Target launch date | **[OWNER]** suggestion: "Public web release: March 2027" |
| Content rating | 10+ |
| Built with | Immersive Web SDK, WebXR, TypeScript, Vite, Three.js, Vitest |

Alternative taglines (all ≤ 140 chars):

- "A home listing on your table: furnish it, step inside, and report issues right where they are, with your hands." (111)
- "Hands-only VR for choosing, presenting and living in a home, from one 1:20 tabletop model." (90)

## Description (about 550 words)

### Inspiration

Choosing a home is one of the biggest decisions people make, and we still do it with flat photos and a floor
plan. Will my sofa fit? Does the bedroom get morning light? Then, once you live there, problems are reported by
phone or email: "the washing machine leaks", but which one, where, since when? We wanted one object that follows
a home through its whole life: something you can hold, look at from above, step into, and come back to.

### What it does

Floorplay turns the plan of a home into a 1:20 model on your table. You use it seated, with your hands only.

- **Choose (visitor).** Furnish the model by pinching pieces from a palm menu and dropping them in. A red frame
  and a short note explain why a piece does not fit ("Overlaps the wardrobe", "Blocks the door"). Set the real
  sizes of your own furniture and try them. Pinch a blue marker to step into a room at real size, then row with
  both fists to walk slowly through it. Pick a date and time to see where the sun falls.
- **Present (agent).** Open info points on the model, furnish or clear the whole home in one pinch, and undo.
- **Live (tenant and landlord).** Hold a pinch on the exact spot, such as the washer, to report a problem: a
  category, a predefined phrase and an urgency, no keyboard needed. The pin moves from red to orange to green as
  the landlord handles it, with a history and a move-in report.

Everything saves itself. Take the headset off, put it back on, or reload: you are where you left off.

### How we built it

Floorplay is a WebXR app built with the Immersive Web SDK on its entity-component system, in TypeScript. The
homes are JSON files (walls, openings, doors, windows, fixtures) that the app builds into geometry at runtime,
so anyone can load their own plan from the start screen. The demo home was converted from a real floor plan of
a three-bedroom, 126 m² apartment. All rules that matter (snapping, 2D collisions, door
clearance, sun position, issue states, role permissions, saving) are pure logic with about 6,900 unit tests.
We tested every scenario in the IWER browser emulator and then on a Meta Quest.

Hands are the only input. Pinch points come from the thumb and index fingertips, the palm direction from the
wrist joint, and the palm menu opens and closes with hysteresis so a shaking hand does not toggle it. Every
path also works with one hand: fixed Menu, Issues and View buttons sit beside the model and can be moved to the
left hand. Panels stay inside a narrow cone near the centre of view at 0.5–0.8 m, so the app also works with a
narrower field of view. High contrast and large text are one pinch away.

Movement is comfortable by design: no thumbstick, no teleport. You jump between viewpoints with a short fade,
and walking uses a slow rowing gesture with a comfort vignette.

### What's next

Floor plans imported from common formats, shared sessions so an agent and a visitor can tour the same model
together, real photos attached to issue reports, and a landlord view across several homes. Mixed reality is
already available as an experimental option (`?mr=1`): your real room's furniture from the headset scan can join
your own pieces.

## Optional: hand interactions and the future of VR (about 150 words)

Floorplay never asks for a controller. A pinch picks, holds and places; two pinches zoom and turn the model;
an open palm facing up brings the furniture menu to your hand; closed fists pulled back together walk you
through a room. We read the hand joints every frame without allocations: the pinch point is the midpoint of the
thumb and index tips, and the palm normal comes from the wrist, cross-checked against the finger joints. For
people who can use only one hand, every action has a fixed button beside the model, and the menu can move to
either hand. What excites us is that a home is a naturally spatial thing: on a table at 1:20 you understand it
at a glance, and at real scale you feel it. Hands make that switch feel like picking something up, not
operating software.

## Testing instructions for judges

Time needed: about 5 minutes. Seated, hands only (put the controllers down).

1. On a Meta Quest, open **https://thirdchildren.github.io/floorplay/** in the headset browser.
2. On the start screen, pinch **Enter VR**. A three-bedroom apartment, converted from a real floor plan, appears on
   the table in front of you.
3. **Furnish:** follow the short hint ("Pinch Menu"): pinch the **Menu** button beside the model, pinch a piece,
   drop it in a room. Try placing it over a door to see the red frame and the reason. Pinch **Rotate** above the
   piece to turn it. You can also turn your palm up to open the menu on your hand.
4. **Move the model:** pinch with both hands and pull apart or turn to zoom and rotate.
5. **Step inside:** pinch a blue marker in a room. Close both fists and pull back, like rowing, to walk; look where
   you want to go. Pinch **Tabletop** to return.
6. **Sun:** pinch **View**, change the time, and watch the light patches move.
7. **Report an issue:** pinch **Issues**, switch the role to **Tenant**, then hold a pinch on the washer to
   report a problem. Switch to **Landlord** to move it from red to orange to green.
8. **Resume:** take the headset off and put it back on, or reload the page: the home is as you left it.

Useful links (add to the address): `?house=apartment-a` or `?house=apartment-b` for other homes, `?role=agent`
for the agent tools, `?reset=1` to start clean, `?text=large&contrast=1` for the accessibility options.
Content marked **Sample data** in the app (issue history, move-in report, info points) is made up for the demo.

## Before submitting — checklist

- [ ] Video uploaded, public, under 3 minutes, link pasted.
- [ ] Target launch date chosen **[OWNER]**.
- [ ] 3–5 screenshots attached (suggested: model with furniture and a red "Blocks the door" note; real-scale room
      with sunlight; issue pin with the form; palm menu; start screen).
- [ ] Confirm on the form: no previous Meta funding for this project.
- [ ] Open the link once more from the Quest after the last deploy.
- [ ] Submit before **18 November 2026, 12:00 PT (21:00 in Italy)**. No changes after the deadline.
