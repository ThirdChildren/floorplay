import { readdirSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import { pointInPolygon } from '../../src/logic/geometry';
import { checkHouse, type House, type Room, type Wall } from '../../src/logic/house';
import { parseHouseFile } from '../../src/logic/house-file';
import {
  defaultViewpoint,
  defaultYawDeg,
  polygonPole,
  withDefaultViewpoints,
} from '../../src/logic/viewpoint-default';
import { markerAnchor } from '../../src/logic/viewpoint-markers';
import { loadJson, repoPath } from '../helpers/load-json';

const files = readdirSync(repoPath('public', 'houses')).filter((f) => f.endsWith('.json'));
const raw = (file: string): House => structuredClone(loadJson<House>('public/houses', file));

/** Distance from a point to the nearest edge of a polygon. */
function edgeDistance(p: readonly [number, number], poly: readonly (readonly [number, number])[]): number {
  let min = Infinity;
  for (let i = 0; i < poly.length; i += 1) {
    const a = poly[i];
    const b = poly[(i + 1) % poly.length];
    const dx = b[0] - a[0];
    const dz = b[1] - a[1];
    const t = Math.max(0, Math.min(1, ((p[0] - a[0]) * dx + (p[1] - a[1]) * dz) / (dx * dx + dz * dz)));
    min = Math.min(min, Math.hypot(p[0] - (a[0] + t * dx), p[1] - (a[1] + t * dz)));
  }
  return min;
}

// An L and a U: non-convex rooms.
const L_SHAPE: [number, number][] = [
  [0, 0], [6, 0], [6, 2], [2, 2], [2, 8], [0, 8],
];
// A U shape whose centroid falls in the notch (outside the polygon).
const U_SHAPE: [number, number][] = [
  [0, 0], [10, 0], [10, 10], [7, 10], [7, 2], [3, 2], [3, 10], [0, 10],
];

describe('polygonPole', () => {
  it('is the centre of a rectangle (the point farthest from the walls)', () => {
    const [x, z] = polygonPole([[0, 0], [4, 0], [4, 2], [0, 2]]);
    expect(z).toBeCloseTo(1, 1);
    expect(x).toBeGreaterThan(0.9);
    expect(x).toBeLessThan(3.1);
  });

  it('stays inside non-convex rooms, away from the walls', () => {
    for (const shape of [L_SHAPE, U_SHAPE]) {
      const p = polygonPole(shape);
      expect(pointInPolygon(p, shape)).toBe(true);
      expect(edgeDistance(p, shape)).toBeGreaterThan(0.9);
    }
  });

  it('works for a polygon given in either vertex order', () => {
    const p = polygonPole([...U_SHAPE].reverse());
    expect(pointInPolygon(p, U_SHAPE)).toBe(true);
  });

  it('does not fail on a degenerate outline', () => {
    expect(polygonPole([[1, 1], [2, 2], [3, 3]]).every(Number.isFinite)).toBe(true);
    expect(polygonPole([[1, 1], [1, 1], [1, 1]])).toEqual([1, 1]);
    expect(polygonPole([])).toEqual([0, 0]);
  });
});

describe('defaultYawDeg', () => {
  const room: Room = { id: 'r', name: 'R', polygon: [[0, 0], [4, 0], [4, 4], [0, 4]] };
  const wall = (id: string, from: [number, number], to: [number, number], connects: [string, string]): Wall => ({
    id,
    from,
    to,
    thickness: 0.1,
    exterior: false,
    openings: [{ id: `${id}-d`, type: 'door', offset: 1.5, width: 1, height: 2, connects }],
  });

  it('looks at the door of the room (0 = -z, clockwise from above)', () => {
    // A door in the wall at x = 4: east of the point, so 90 degrees.
    expect(defaultYawDeg(room, [2, 2], [wall('e', [4, 0], [4, 4], ['r', 'other'])])).toBe(90);
    // A door in the wall at z = 0: towards -z, so 0 degrees.
    expect(defaultYawDeg(room, [2, 2], [wall('n', [0, 0], [4, 0], ['r', 'other'])])).toBe(0);
    // A door in the wall at z = 4: towards +z, so 180 degrees.
    expect(defaultYawDeg(room, [2, 2], [wall('s', [0, 4], [4, 4], ['other', 'r'])])).toBe(180);
  });

  it('ignores the doors of other rooms and falls back to the longest wall', () => {
    const rect: Room = { id: 'r', name: 'R', polygon: [[0, 0], [8, 0], [8, 2], [0, 2]] };
    const yaw = defaultYawDeg(rect, [4, 1], [wall('x', [0, 20], [4, 20], ['a', 'b'])]);
    // The longest edges are the ones at z = 0 and z = 2; the first one (z = 0) wins: towards -z.
    expect(yaw).toBe(0);
  });

  it('always returns a value in [0, 360)', () => {
    for (const walls of [[], [wall('w', [0, 4], [4, 4], ['r', 'o'])]]) {
      const yaw = defaultYawDeg(room, [2, 2], walls);
      expect(yaw).toBeGreaterThanOrEqual(0);
      expect(yaw).toBeLessThan(360);
    }
  });
});

describe('withDefaultViewpoints', () => {
  it('returns the same object when every room has a viewpoint', () => {
    const house = raw('apartment-a.json');
    const full = withDefaultViewpoints(house);
    const again = withDefaultViewpoints(full);
    expect(again).toBe(full);
  });

  it('keeps the explicit viewpoints, adds one per missing room with fresh ids and does not change the input', () => {
    const house = raw('apartment-a.json');
    const before = structuredClone(house);
    const out = withDefaultViewpoints(house);
    expect(house).toEqual(before);
    expect(out.viewpoints.slice(0, before.viewpoints.length)).toEqual(before.viewpoints);
    expect(out.viewpoints).toHaveLength(house.rooms.length);
    const ids = out.viewpoints.map((v) => v.id);
    expect(new Set(ids).size).toBe(ids.length);
    expect(ids.slice(before.viewpoints.length)).toEqual(['V4', 'V5']);
  });

  it('skips ids that are taken and numbers after the highest V<n>', () => {
    const house = raw('apartment-b.json');
    house.viewpoints[0].id = 'V7';
    house.viewpoints[1].id = 'V3';
    const out = withDefaultViewpoints(house);
    expect(out.viewpoints.slice(2).map((v) => v.id)).toEqual(['V8', 'V9']);
  });

  it('puts a derived viewpoint inside a non-convex room', () => {
    const room: Room = { id: 'u', name: 'U', polygon: U_SHAPE };
    const v = defaultViewpoint(room, [], 'V1');
    expect(v.room).toBe('u');
    expect(pointInPolygon(v.position, U_SHAPE)).toBe(true);
  });
});

describe.each(files)('%s: every room has one marker inside its floor', (file) => {
  const checked = checkHouse(raw(file));

  it('passes checkHouse', () => {
    expect(checked.ok).toBe(true);
  });

  it('has at least one viewpoint in every room, and inside the room polygon', () => {
    if (!checked.ok) return;
    const { house } = checked;
    for (const room of house.rooms) {
      const own = house.viewpoints.filter((v) => v.room === room.id);
      expect(own.length, `${room.id} has no viewpoint`).toBeGreaterThanOrEqual(1);
      for (const v of own) expect(pointInPolygon(v.position, room.polygon), `${v.id} outside ${room.id}`).toBe(true);
    }
  });

  it('has unique viewpoint ids and a finite marker anchor for each', () => {
    if (!checked.ok) return;
    const ids = checked.house.viewpoints.map((v) => v.id);
    expect(new Set(ids).size).toBe(ids.length);
    for (const v of checked.house.viewpoints) {
      const a = markerAnchor(v);
      expect([a.x, a.y, a.z].every(Number.isFinite)).toBe(true);
      expect(v.yawDeg === undefined || (v.yawDeg >= 0 && v.yawDeg < 360)).toBe(true);
    }
  });
});

describe('a house loaded from a file', () => {
  it('gets a viewpoint for every room, and loading it again changes nothing', () => {
    const file = JSON.stringify(raw('apartment-c.json'));
    const parsed = parseHouseFile(file);
    expect(parsed.ok).toBe(true);
    if (!parsed.ok) return;
    const { house } = parsed;
    for (const room of house.rooms) {
      const own = house.viewpoints.filter((v) => v.room === room.id);
      expect(own.length, `${room.id}`).toBeGreaterThanOrEqual(1);
      expect(pointInPolygon(own[0].position, room.polygon)).toBe(true);
    }
    const stored = parseHouseFile(JSON.stringify({ ...house, id: 'apartment-c' }));
    expect(stored.ok && stored.house.viewpoints).toEqual(house.viewpoints);
  });

  it('adds a viewpoint to a room that the file left out, without touching the explicit ones', () => {
    const data = raw('apartment-a.json');
    const first = data.viewpoints[0];
    data.viewpoints = [first];
    const parsed = parseHouseFile(JSON.stringify(data));
    expect(parsed.ok).toBe(true);
    if (!parsed.ok) return;
    expect(parsed.house.viewpoints[0]).toEqual(first);
    expect(parsed.house.viewpoints).toHaveLength(data.rooms.length);
  });
});
