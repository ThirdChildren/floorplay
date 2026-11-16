import { describe, expect, it } from 'vitest';
import type { House } from '../../src/logic/house';
import {
  BODY_RADIUS,
  WALK_EYE_HEIGHT,
  buildWalkWorld,
  freeSpot,
  funnelDoors,
  planStep,
  pushOutOfRect,
  resolveBody,
  roundMm,
  stepWalk,
  walkRoot,
  worldToPlan,
  wrapDegrees,
  type PlanPoint,
  type WalkStep,
  type WalkWorld,
} from '../../src/logic/walk';
import { DEFAULT_EYE_HEIGHT, eyeHeightOf, viewpointRoot } from '../../src/logic/viewpoint-pose';
import { planCenter } from '../../src/logic/house-layout';
import { loadJson } from '../helpers/load-json';

const houseA = loadJson<House>('public/houses', 'apartment-a.json');
const houseB = loadJson<House>('public/houses', 'apartment-b.json');
const worldA = buildWalkWorld(houseA);
/** Half the thickness of an exterior wall of apartment A (0.25 m). */
const EXT = 0.125;
const out: WalkStep = { moved: 0, wanted: 0, progress: 1 };
const at = (x: number, z: number): PlanPoint => ({ x, z });

/** Walks `metres` along (dx, dz) in frames of 1/72 s at `speed` and returns the final position. */
function walk(p: PlanPoint, dx: number, dz: number, metres: number, world: WalkWorld, speed = 1): PlanPoint {
  const frames = Math.ceil(metres / (speed / 72));
  const l = Math.hypot(dx, dz);
  for (let i = 0; i < frames; i += 1) stepWalk(p, (dx / l) * (speed / 72), (dz / l) * (speed / 72), world, out);
  return p;
}

describe('buildWalkWorld', () => {
  it('splits walls at doors and keeps windows solid', () => {
    // w-north has four windows and no door: one solid piece. w-living-hall (2.6..5.2 at z 4.6) has one door: two pieces.
    const north = worldA.solids.filter((r) => Math.abs(r.cz) < 1e-9 && r.w > 0);
    expect(north.length).toBe(1);
    expect(north[0].w).toBeCloseTo(11, 9);
    const hall = worldA.solids.filter((r) => Math.abs(r.cz - 4.6) < 1e-9 && r.cx > 2.6 && r.cx < 5.2);
    expect(hall.length).toBe(2);
  });

  it('closes the door that leads outside, with a plug as wide as the door', () => {
    const plug = worldA.solids.filter((r) => Math.abs(r.cz - 6.2) < 1e-9 && Math.abs(r.w - 0.9) < 1e-9);
    expect(plug.length).toBe(1);
    expect(plug[0].cx).toBeCloseTo(2.6 + 3.4 + 0.45, 9);
  });

  it('bounds hold the whole plan with a small margin', () => {
    expect(worldA.bounds.minX).toBeLessThan(0);
    expect(worldA.bounds.maxX).toBeGreaterThan(11);
    expect(worldA.center[0]).toBeCloseTo(5.5, 9);
  });

  it('works for the other demo house', () => {
    const w = buildWalkWorld(houseB);
    expect(w.solids.length).toBeGreaterThan(5);
  });
});

describe('collisions: the body cannot cross a wall', () => {
  it('walking from the living room into the north wall stops in front of it', () => {
    const p = at(2.9, 3.3);
    walk(p, 0, -1, 6, worldA);
    // The north wall is at z = 0 with thickness 0.25: the body stops at 0.05 + radius.
    expect(p.z).toBeGreaterThanOrEqual(EXT + BODY_RADIUS - 1e-6);
    expect(p.z).toBeLessThan(EXT + BODY_RADIUS + 0.01);
    expect(p.x).toBeCloseTo(2.9, 6);
  });

  it('cannot tunnel through a thin wall even with a huge step', () => {
    const p = at(2.9, 3.3);
    stepWalk(p, 0, -8, worldA, out);
    expect(p.z).toBeGreaterThanOrEqual(EXT + BODY_RADIUS - 1e-6);
  });

  it('slides along a wall when walking at it at an angle', () => {
    const p = at(2.9, 0.5);
    // Heading north-east into the north wall: z is blocked, x goes on.
    walk(p, 1, -1, 2, worldA);
    expect(p.z).toBeGreaterThanOrEqual(EXT + BODY_RADIUS - 1e-6);
    expect(p.x).toBeGreaterThan(3.5);
  });

  it('sliding keeps at least half of the speed at 45 degrees and reports the progress', () => {
    const p = at(2.9, EXT + BODY_RADIUS + 0.004);
    const o: WalkStep = { moved: 0, wanted: 0, progress: 1 };
    stepWalk(p, 0.01, -0.01, worldA, o);
    expect(o.progress).toBeGreaterThan(0.4);
    expect(o.progress).toBeLessThan(0.9);
  });

  it('head-on into a wall reports almost no progress', () => {
    const p = at(2.9, EXT + BODY_RADIUS);
    const o: WalkStep = { moved: 0, wanted: 0, progress: 1 };
    stepWalk(p, 0, -0.01, worldA, o);
    expect(o.progress).toBeLessThan(0.1);
  });

  it('a corner stops the body without jitter or escape', () => {
    // North-west corner of the living room: walls z = 0 and x = 0.
    const p = at(0.8, 0.8);
    walk(p, -1, -1, 3, worldA);
    expect(p.x).toBeGreaterThanOrEqual(EXT + BODY_RADIUS - 1e-6);
    expect(p.z).toBeGreaterThanOrEqual(EXT + BODY_RADIUS - 1e-6);
    expect(p.x).toBeLessThan(0.36);
    expect(p.z).toBeLessThan(0.36);
  });

  it('stays inside the house when walking at every wall in every direction', () => {
    const b = worldA.bounds;
    for (let deg = 0; deg < 360; deg += 15) {
      const p = at(8.6, 3.2);
      walk(p, Math.cos((deg * Math.PI) / 180), Math.sin((deg * Math.PI) / 180), 20, worldA, 2);
      expect(p.x).toBeGreaterThanOrEqual(b.minX);
      expect(p.x).toBeLessThanOrEqual(b.maxX);
      expect(p.z).toBeGreaterThanOrEqual(b.minZ);
      expect(p.z).toBeLessThanOrEqual(b.maxZ);
      // The study (x 8.4..11, z 0..4.6) is closed except its door to the hall at z 4.6: the body may leave through that door only.
      expect(p.x).toBeLessThanOrEqual(11 - EXT - BODY_RADIUS + 1e-6);
    }
  });

  it('the entrance door is closed: the body cannot leave the house', () => {
    // The entrance is at x 6.0..6.9 of the south wall z = 6.2 (hall). Walk south through it.
    const p = at(6.45, 5.2);
    walk(p, 0, 1, 4, worldA);
    expect(p.z).toBeLessThanOrEqual(6.2 - EXT - BODY_RADIUS + 1e-6);
  });
});

describe('collisions: doors are passable', () => {
  it('walks from the living room to the hall through the door of w-living-hall', () => {
    // The door spans x 3.6..4.4 on z = 4.6. Walk south through its middle.
    const p = at(4.0, 3.3);
    walk(p, 0, 1, 2, worldA);
    expect(p.z).toBeGreaterThan(5.0);
    expect(p.x).toBeCloseTo(4.0, 6);
  });

  it('a narrow door of 0.75 m lets the body through', () => {
    // w-bath-hall: x = 2.6, door from offset 0.4 to 1.15 along z 4.6..6.2 -> z 5.0..5.75. Walk west from the hall at z 5.4.
    const p = at(3.6, 5.4);
    walk(p, -1, 0, 2, worldA);
    expect(p.x).toBeLessThan(2.0);
  });

  it('a body that is not lined up with the door is funnelled through it instead of stopping on the jamb', () => {
    const p = at(3.6, 4.85); // the door starts at z 5.0: the body would clip the jamb
    walk(p, -1, 0, 2, worldA);
    expect(p.x).toBeLessThan(2.0);
    expect(p.z).toBeGreaterThan(5.0 + BODY_RADIUS - 1e-6);
    expect(p.z).toBeLessThan(5.75 - BODY_RADIUS + 1e-6);
  });

  it('aiming at the doorway at 45 degrees is enough to get through', () => {
    const p = at(3.4, 4.75);
    walk(p, -1, 0.6, 2, worldA);
    expect(p.x).toBeLessThan(2.4);
  });

  it('walking along the wall past a door does not pull the body into it', () => {
    const p = at(3.0, 4.75);
    walk(p, 0, 1, 1, worldA);
    expect(p.x).toBeCloseTo(3.0, 6);
  });

  it('a body far from the door along the wall still meets the wall', () => {
    const p = at(3.0, 6.0); // the door ends at z 5.75; 0.25 m beyond the jamb...
    const q = at(3.0, 6.0);
    walk(p, -1, 0, 0.3, worldA);
    funnelDoors(q, 0, 0, worldA);
    expect(q).toEqual({ x: 3.0, z: 6.0 }); // ...a zero step never moves the body
  });

  it('the body is thin: a 0.75 m doorway leaves more than half a metre of play', () => {
    expect(0.75 - 2 * BODY_RADIUS).toBeGreaterThan(0.5);
  });
});

describe('pushOutOfRect and resolveBody', () => {
  const wall = { cx: 0, cz: 0, w: 4, d: 0.1, angleRad: 0 };
  it('pushes a circle that overlaps the face out along the normal', () => {
    const p = at(0, 0.2);
    const depth = pushOutOfRect(p, 0.22, wall);
    expect(depth).toBeCloseTo(0.22 - 0.15, 9);
    expect(p.z).toBeCloseTo(0.27, 9);
    expect(p.x).toBe(0);
  });

  it('does nothing for a circle that is clear', () => {
    const p = at(0, 0.5);
    expect(pushOutOfRect(p, 0.22, wall)).toBe(0);
    expect(p).toEqual({ x: 0, z: 0.5 });
  });

  it('pushes from the end of a wall around its corner', () => {
    const p = at(2.1, 0.1);
    pushOutOfRect(p, 0.22, wall);
    expect(Math.hypot(p.x - 2, p.z - 0.05)).toBeGreaterThanOrEqual(0.22 - 1e-9);
  });

  it('a centre inside the rectangle leaves by the nearest side', () => {
    const p = at(0, 0.01);
    pushOutOfRect(p, 0.22, wall);
    expect(p.z).toBeCloseTo(0.05 + 0.22, 9);
  });

  it('works on a turned wall', () => {
    const turned = { cx: 0, cz: 0, w: 4, d: 0.1, angleRad: Math.PI / 2 }; // runs along z
    const p = at(0.2, 0);
    pushOutOfRect(p, 0.22, turned);
    expect(p.x).toBeCloseTo(0.27, 9);
    expect(p.z).toBeCloseTo(0, 9);
  });

  it('resolveBody clamps to the bounds', () => {
    const p = at(-50, 100);
    resolveBody(p, worldA);
    expect(p.x).toBe(worldA.bounds.minX);
    expect(p.z).toBe(worldA.bounds.maxZ);
  });

  it('freeSpot moves a point that is in a wall and leaves a free one alone', () => {
    const inside = freeSpot(2.9, 0.02, worldA, at(0, 0));
    expect(inside.z).toBeGreaterThanOrEqual(EXT + BODY_RADIUS - 1e-6);
    const free = freeSpot(2.9, 3.3, worldA, at(0, 0));
    expect(free).toEqual({ x: 2.9, z: 3.3 });
  });
});

describe('stepWalk input', () => {
  it('a non-finite step changes nothing', () => {
    const p = at(2.9, 3.3);
    stepWalk(p, Number.NaN, 1, worldA, out);
    expect(p).toEqual({ x: 2.9, z: 3.3 });
    expect(out.moved).toBe(0);
  });

  it('a zero step changes nothing and reports full progress', () => {
    const p = at(2.9, 3.3);
    stepWalk(p, 0, 0, worldA, out);
    expect(out.progress).toBe(1);
  });

  it('in the open the body moves exactly as asked', () => {
    const p = at(2.9, 3.3);
    stepWalk(p, 0.3, 0.4, worldA, out);
    expect(p.x).toBeCloseTo(3.2, 9);
    expect(p.z).toBeCloseTo(3.7, 9);
    expect(out.moved).toBeCloseTo(0.5, 9);
    expect(out.progress).toBeCloseTo(1, 9);
  });
});

describe('integration: speed to distance', () => {
  it('1 m/s for 2 s along the gaze with the model not turned moves 2 m', () => {
    const p = at(6.0, 3.3);
    const s: PlanPoint = at(0, 0);
    // Facing +x in the world with the model yaw 0: the plan moves +x.
    for (let i = 0; i < 144; i += 1) {
      planStep(1, 1, 0, 1 / 72, 0, s);
      stepWalk(p, s.x, s.z, worldA, out);
    }
    expect(p.x).toBeCloseTo(8.0, 6);
    expect(p.z).toBeCloseTo(3.3, 6);
  });

  it('a model turned by yaw: the step on the plan is the world step turned back', () => {
    const s = at(0, 0);
    // R(90 deg) maps plan (1, 0) to world (0, -1): walking along world -z moves the plan along +x.
    worldToPlan(0, -1, Math.PI / 2, s);
    expect(s.x).toBeCloseTo(1, 9);
    expect(s.z).toBeCloseTo(0, 9);
  });

  it('planStep scales by speed and dt', () => {
    const s = at(0, 0);
    planStep(0.5, 0, -1, 0.1, 0, s);
    expect(s.x).toBeCloseTo(0, 12);
    expect(s.z).toBeCloseTo(-0.05, 12);
  });
});

describe('a walk that starts at a viewpoint (walking is on in every real-scale view)', () => {
  const center = planCenter(houseA);
  const head = { x: 0.1, y: 1.25, z: -0.3, yawDeg: -40 };
  const rootAt = (position: readonly [number, number], yawDeg: number, eye: number): ReturnType<typeof walkRoot> => {
    const yawRad = ((yawDeg + head.yawDeg) * Math.PI) / 180;
    return walkRoot(position[0], position[1], center, { hx: head.x, hy: head.y, hz: head.z, yawRad, eye }, { x: 0, y: 0, z: 0, yawRad: 0, scale: 0 });
  };

  it('the seated walk eye height is the viewpoint default, so a restored walk keeps the floor where the viewpoints put it', () => {
    expect(WALK_EYE_HEIGHT).toBe(DEFAULT_EYE_HEIGHT);
  });

  it('puts the model exactly where the viewpoint pose did, for each viewpoint of every demo house, with its own eye height', () => {
    for (const house of [houseA, houseB]) {
      for (const v of house.viewpoints) {
        const eye = eyeHeightOf(v);
        const expected = viewpointRoot(v, planCenter(house), head);
        const yawRad = ((v.yawDeg ?? 0) + head.yawDeg) * (Math.PI / 180);
        const got = walkRoot(v.position[0], v.position[1], planCenter(house), { hx: head.x, hy: head.y, hz: head.z, yawRad, eye }, { x: 0, y: 0, z: 0, yawRad: 0, scale: 0 });
        expect(got.x).toBeCloseTo(expected.x, 9);
        expect(got.y).toBeCloseTo(expected.y, 9);
        expect(got.z).toBeCloseTo(expected.z, 9);
        expect(got.yawRad).toBeCloseTo(expected.yawRad, 9);
      }
    }
  });

  it('an eye height of 1.5 m puts the floor 1.5 m under the head', () => {
    expect(rootAt(houseA.viewpoints[0].position, 0, 1.5).y).toBeCloseTo(head.y - 1.5, 12);
  });

  it('a viewpoint marker is already on a free spot of its house: entering it does not move the body', () => {
    for (const house of [houseA, houseB]) {
      const world = buildWalkWorld(house);
      for (const v of house.viewpoints) {
        const free = freeSpot(v.position[0], v.position[1], world, at(0, 0));
        expect(free.x).toBeCloseTo(v.position[0], 9);
        expect(free.z).toBeCloseTo(v.position[1], 9);
      }
    }
  });
});

describe('walkRoot: the model around the head', () => {
  it('puts the point P under the head with the floor one eye height down, as a viewpoint does', () => {
    const v1 = houseA.viewpoints[0];
    const center = planCenter(houseA);
    const head = { x: 0.3, y: 1.3, z: -0.2, yawDeg: 25 };
    const ref = viewpointRoot({ ...v1, eyeHeight: WALK_EYE_HEIGHT }, center, head);
    const root = walkRoot(v1.position[0], v1.position[1], center, { hx: head.x, hy: head.y, hz: head.z, yawRad: ref.yawRad, eye: WALK_EYE_HEIGHT }, { x: 0, y: 0, z: 0, yawRad: 0, scale: 0 });
    expect(root.x).toBeCloseTo(ref.x, 9);
    expect(root.y).toBeCloseTo(ref.y, 9);
    expect(root.z).toBeCloseTo(ref.z, 9);
    expect(root.y).toBeCloseTo(1.3 - WALK_EYE_HEIGHT, 9);
    expect(root.scale).toBe(1);
  });

  it('walking one metre along the gaze moves the root one metre the other way', () => {
    const center = planCenter(houseA);
    const ref = { hx: 0, hy: 1.3, hz: 0, yawRad: 0, eye: WALK_EYE_HEIGHT };
    const a = walkRoot(3, 3, center, ref, { x: 0, y: 0, z: 0, yawRad: 0, scale: 1 });
    const b = walkRoot(3, 2, center, ref, { x: 0, y: 0, z: 0, yawRad: 0, scale: 1 }); // 1 m towards -z of the plan = the gaze at yaw 0
    expect(b.z - a.z).toBeCloseTo(1, 9); // the world slides towards the user
  });
});

describe('small helpers', () => {
  it('wrapDegrees and roundMm', () => {
    expect(wrapDegrees(190)).toBe(-170);
    expect(wrapDegrees(-180)).toBe(180);
    expect(wrapDegrees(720)).toBe(0);
    expect(roundMm(1.23456)).toBe(1.235);
  });
});
