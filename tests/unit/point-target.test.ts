import { describe, expect, it } from 'vitest';
import { rectFromWall, type Rect } from '../../src/logic/footprint';
import { handToPlan, type MiniatureRoot, type Vec3Tuple } from '../../src/logic/furniture-pose';
import { resolveAnchor } from '../../src/logic/issue-anchor';
import { checkHouse, type House } from '../../src/logic/house';
import { planCenter } from '../../src/logic/house-layout';
import { castPointRay, createHouseRay, createPointHit, rayBox, worldRayToHouse, type PointScene } from '../../src/logic/point-target';
import apartmentA from '../../public/houses/apartment-a.json';

const result = checkHouse(apartmentA);
if (!result.ok) throw new Error('apartment-a is not valid');
const house: House = result.house;
const center = planCenter(house);

const root = (scale: number, yawRad = 0, x = 0, y = 1.35, z = -0.45): MiniatureRoot => ({ x, y, z, yawRad, scale });
const none = (): boolean => false;
const scratch = { rect: { cx: 0, cz: 0, w: 1, d: 1, angleRad: 0 } as Rect, height: 0 };

describe('worldRayToHouse', () => {
  it('maps a point and a direction of the world to the house (scale, offset)', () => {
    const r = root(0.05);
    const ray = createHouseRay();
    // A point 0.1 m above the model floor and 0.1 m right of the root origin: 2 m up and 2 m east of the plan centre.
    expect(worldRayToHouse([0.1, 1.45, -0.45], [0, -1, 0], r, center, ray)).toBe(true);
    expect(ray.ox).toBeCloseTo(center[0] + 2, 9);
    expect(ray.oz).toBeCloseTo(center[1], 9);
    expect(ray.oy).toBeCloseTo(2, 9);
    expect(ray.dy).toBeCloseTo(-20, 9);
    expect(ray.dx).toBeCloseTo(0, 9);
  });

  it('agrees with handToPlan for a turned model', () => {
    const r = root(0.08, 0.7, 0.2, 1.1, -0.5);
    const ray = createHouseRay();
    const world: Vec3Tuple = [0.31, 1.4, -0.62];
    worldRayToHouse(world, [0, 0, -1], r, center, ray);
    const plan = handToPlan(world, r, center);
    expect([ray.ox, ray.oz, ray.oy]).toEqual([plan[0], plan[1], plan[2]]);
  });

  it('refuses a bad scale or a broken number', () => {
    const ray = createHouseRay();
    expect(worldRayToHouse([0, 1, 0], [0, -1, 0], root(0), center, ray)).toBe(false);
    expect(worldRayToHouse([Number.NaN, 1, 0], [0, -1, 0], root(0.05), center, ray)).toBe(false);
  });
});

describe('rayBox', () => {
  const box: Rect = { cx: 2, cz: 3, w: 2, d: 1, angleRad: 0 };
  it('hits the top of a box from above and the side from the side', () => {
    const down = { ox: 2, oy: 2, oz: 3, dx: 0, dy: -1, dz: 0 };
    expect(rayBox(down, box, 0.8)).toBeCloseTo(1.2, 9);
    const side = { ox: 0, oy: 0.4, oz: 3, dx: 1, dy: 0, dz: 0 };
    expect(rayBox(side, box, 0.8)).toBeCloseTo(1, 9);
  });

  it('misses a box beside the ray, behind it, or above the height', () => {
    expect(rayBox({ ox: 5, oy: 2, oz: 3, dx: 0, dy: -1, dz: 0 }, box, 0.8)).toBeNull();
    expect(rayBox({ ox: 0, oy: 0.4, oz: 3, dx: -1, dy: 0, dz: 0 }, box, 0.8)).toBeNull();
    expect(rayBox({ ox: 0, oy: 1.5, oz: 3, dx: 1, dy: 0, dz: 0 }, box, 0.8)).toBeNull();
  });

  it('works for a box turned along a wall', () => {
    const turned: Rect = { cx: 0, cz: 0, w: 4, d: 0.2, angleRad: Math.PI / 4 };
    // The wall runs along (1, 1); a ray along +x from (-3, -1) crosses it at x = z + ... = near (-1, -1).
    const t = rayBox({ ox: -3, oy: 0.5, oz: -1, dx: 1, dy: 0, dz: 0 }, turned, 1);
    expect(t).not.toBeNull();
    expect(-3 + (t as number)).toBeLessThan(-0.8);
    expect(-3 + (t as number)).toBeGreaterThan(-1.3);
  });

  it('a ray that starts inside gives 0', () => {
    expect(rayBox({ ox: 2, oy: 0.2, oz: 3, dx: 1, dy: 0, dz: 0 }, box, 0.8)).toBe(0);
  });
});

describe('castPointRay', () => {
  const walls = house.walls.map((w) => rectFromWall(w));
  const scene: PointScene = { walls, wallHeight: 1 };
  const out = createPointHit();

  it('hits the floor from above', () => {
    const ray = { ox: 2, oy: 2, oz: 2, dx: 0, dy: -1, dz: 0 };
    expect(castPointRay(ray, scene, 0, none, scratch, out)).toBe(true);
    expect(out.surface).toBe('floor');
    expect([out.x, out.y, out.z]).toEqual([2, 0, 2]);
  });

  it('a ray that points up or away meets nothing', () => {
    expect(castPointRay({ ox: 2, oy: 1, oz: 2, dx: 0, dy: 1, dz: 0 }, scene, 0, none, scratch, out)).toBe(false);
    expect(castPointRay({ ox: 2, oy: 1, oz: 2, dx: 0, dy: 0, dz: 1 }, { walls: [], wallHeight: 1 }, 0, none, scratch, out)).toBe(false);
  });

  it('hits the north wall of apartment A from the inside, below the cut', () => {
    // The north wall is z = 0 from x = 0 to 11; look at it from (2, 0.5, 2) towards -z.
    const ray = { ox: 2, oy: 0.5, oz: 2, dx: 0, dy: 0, dz: -1 };
    expect(castPointRay(ray, scene, 0, none, scratch, out)).toBe(true);
    expect(out.surface).toBe('wall');
    expect(out.z).toBeGreaterThan(0);
    expect(out.z).toBeLessThan(0.2);
    expect(out.y).toBeCloseTo(0.5, 9);
  });

  it('a ray over the top of a wall cut at 1 m goes on to the floor behind it', () => {
    const ray = { ox: 2, oy: 1.6, oz: 2, dx: 0, dy: -0.1, dz: -1 };
    expect(castPointRay(ray, scene, 0, none, scratch, out)).toBe(true);
    expect(out.surface).toBe('floor');
    expect(out.z).toBeLessThan(0);
  });

  it('hits a piece of furniture before the floor under it, on its top', () => {
    const ray = { ox: 3, oy: 2, oz: 2, dx: 0, dy: -1, dz: 0 };
    const piece = (index: number, into: { rect: Rect; height: number }): boolean => {
      if (index !== 0) return false;
      into.rect.cx = 3;
      into.rect.cz = 2;
      into.rect.w = 2;
      into.rect.d = 0.9;
      into.rect.angleRad = 0;
      into.height = 0.45;
      return true;
    };
    expect(castPointRay(ray, scene, 1, piece, scratch, out)).toBe(true);
    expect(out.surface).toBe('furniture');
    expect(out.y).toBeCloseTo(0.45, 9);
  });

  it('the hit of a ray at the washing machine snaps to the fixture, as a long pinch does', () => {
    const washer = house.fixtures?.find((f) => f.id === 'washer');
    expect(washer).toBeDefined();
    const [fx, , fz] = washer!.position;
    const ray = { ox: fx + 0.1, oy: 1.5, oz: fz + 0.1, dx: 0, dy: -1, dz: 0 };
    expect(castPointRay(ray, scene, 0, none, scratch, out)).toBe(true);
    const anchor = resolveAnchor([out.x, out.y, out.z], house, 0.05);
    expect(anchor?.fixture?.id).toBe('washer');
  });

  it('a hit outside the house has no anchor', () => {
    const ray = { ox: 40, oy: 1, oz: 40, dx: 0, dy: -1, dz: 0 };
    expect(castPointRay(ray, scene, 0, none, scratch, out)).toBe(true);
    expect(resolveAnchor([out.x, out.y, out.z], house, 0.05)).toBeNull();
  });
});
