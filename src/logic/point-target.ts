// Where the pointing finger meets the house: a ray (in world metres) against the surfaces of the model, analytically, in HOUSE coordinates
// (plan x and z, y = height above the floor, metres of the house). Pure: no imports from @iwsdk/core or three.
//
// The surfaces are the ones a report can be about: the floor of the rooms (the plane y = 0), the walls (each a box of its thickness, as
// high as the model shows it: cut at CUT_HEIGHT on the table, full height at real scale) and the placed furniture (a box of its footprint
// and its height). A fixture is not a surface of its own: the hit point snaps to it in `resolveAnchor`, as for a long pinch. The openings of
// the walls are not cut out (a window can be pointed at as the wall that holds it). It is the same analytic geometry the grab and the
// long pinch use, so it costs nothing per frame and needs no mesh.

import { handToPlan, type MiniatureRoot, type Vec3Tuple } from './furniture-pose';
import type { Rect } from './footprint';

/** A ray in house coordinates: the origin and a direction (not necessarily unit; the parameter of a hit is in units of it). */
export interface HouseRay {
  ox: number;
  oy: number;
  oz: number;
  dx: number;
  dy: number;
  dz: number;
}

export function createHouseRay(): HouseRay {
  return { ox: 0, oy: 0, oz: 0, dx: 0, dy: 0, dz: -1 };
}

const originScratch: Vec3Tuple = [0, 0, 0];
const tipScratch: Vec3Tuple = [0, 0, 0];
const planScratch: Vec3Tuple = [0, 0, 0];

/**
 * The world ray (`origin`, unit `direction`) in house coordinates, written into `out`. False (and `out` untouched) when a number is not
 * finite or the scale is not positive. `center` is the plan centre that sits on the origin of the model root (`planCenter(house)`).
 */
export function worldRayToHouse(
  origin: Readonly<Vec3Tuple>,
  direction: Readonly<Vec3Tuple>,
  root: Readonly<MiniatureRoot>,
  center: Readonly<[number, number]>,
  out: HouseRay,
): boolean {
  if (!(root.scale > 0)) return false;
  for (let i = 0; i < 3; i += 1) {
    if (!Number.isFinite(origin[i]) || !Number.isFinite(direction[i])) return false;
  }
  handToPlan(origin, root, center, originScratch);
  tipScratch[0] = origin[0] + direction[0];
  tipScratch[1] = origin[1] + direction[1];
  tipScratch[2] = origin[2] + direction[2];
  handToPlan(tipScratch, root, center, planScratch);
  // handToPlan gives [x, z, y].
  out.ox = originScratch[0];
  out.oz = originScratch[1];
  out.oy = originScratch[2];
  out.dx = planScratch[0] - originScratch[0];
  out.dz = planScratch[1] - originScratch[1];
  out.dy = planScratch[2] - originScratch[2];
  return Number.isFinite(out.ox + out.oy + out.oz + out.dx + out.dy + out.dz);
}

/** What the ray met. */
export type PointSurface = 'floor' | 'wall' | 'furniture';

export interface PointHit {
  /** The parameter along the ray (house metres when the direction is unit in house space). */
  t: number;
  /** The point, house coordinates. */
  x: number;
  y: number;
  z: number;
  surface: PointSurface;
}

export function createPointHit(): PointHit {
  return { t: 0, x: 0, y: 0, z: 0, surface: 'floor' };
}

/** The running interval of `rayBox` (module scratch: nothing is allocated per call). */
const span = { t0: 0, t1: 0 };

/** Clips `span` to the slab `lo..hi` along one axis; false when the ray cannot be inside it. */
function clipSlab(o: number, d: number, lo: number, hi: number): boolean {
  if (Math.abs(d) < 1e-12) return o >= lo && o <= hi;
  let a = (lo - o) / d;
  let b = (hi - o) / d;
  if (a > b) {
    const swap = a;
    a = b;
    b = swap;
  }
  if (a > span.t0) span.t0 = a;
  if (b < span.t1) span.t1 = b;
  return span.t0 <= span.t1;
}

/**
 * Entry parameter of the ray into the box of footprint `rect` (its `angleRad` is the direction of its width) from the floor up to
 * `height`, or null when the ray misses it or it is all behind the origin. A ray that starts inside the box gives 0, and the caller
 * ignores it (a finger inside a piece is not pointing at it).
 */
export function rayBox(ray: Readonly<HouseRay>, rect: Readonly<Rect>, height: number): number | null {
  const c = Math.cos(rect.angleRad);
  const s = Math.sin(rect.angleRad);
  // The ray in the frame of the box: u along the box width, v along its depth, y up.
  const px = ray.ox - rect.cx;
  const pz = ray.oz - rect.cz;
  span.t0 = 0;
  span.t1 = Number.POSITIVE_INFINITY;
  if (!clipSlab(px * c + pz * s, ray.dx * c + ray.dz * s, -rect.w / 2, rect.w / 2)) return null;
  if (!clipSlab(-px * s + pz * c, -ray.dx * s + ray.dz * c, -rect.d / 2, rect.d / 2)) return null;
  if (!clipSlab(ray.oy, ray.dy, 0, height)) return null;
  return span.t0;
}

/** The solid things of the model a ray can meet, besides the floor. */
export interface PointScene {
  /** The wall boxes (`rectFromWall`), all as high as `wallHeight`. */
  walls: readonly Rect[];
  wallHeight: number;
}

/** A piece of furniture as the ray sees it: the footprint on the plan and the height. */
export interface PointPiece {
  rect: Readonly<Rect>;
  height: number;
}

const MIN_T = 1e-6;

/**
 * The nearest surface the ray meets in front of its origin, written into `out`; false when it meets none (it points up or away).
 * `piece(i)` is called for i in [0, pieceCount) and returns the box of the i-th placed piece (it may reuse one object), or null to skip it.
 */
export function castPointRay(
  ray: Readonly<HouseRay>,
  scene: Readonly<PointScene>,
  pieceCount: number,
  piece: (index: number, into: { rect: Rect; height: number }) => boolean,
  scratch: { rect: Rect; height: number },
  out: PointHit,
): boolean {
  let bestT = Number.POSITIVE_INFINITY;
  let surface: PointSurface = 'floor';
  // The floor: the plane y = 0, hit from above.
  if (ray.dy < -1e-9 && ray.oy > 0) {
    const t = -ray.oy / ray.dy;
    if (t > MIN_T) bestT = t;
  }
  for (const wall of scene.walls) {
    const t = rayBox(ray, wall, scene.wallHeight);
    if (t !== null && t > MIN_T && t < bestT) {
      bestT = t;
      surface = 'wall';
    }
  }
  for (let i = 0; i < pieceCount; i += 1) {
    if (!piece(i, scratch)) continue;
    const t = rayBox(ray, scratch.rect, scratch.height);
    if (t !== null && t > MIN_T && t < bestT) {
      bestT = t;
      surface = 'furniture';
    }
  }
  if (!Number.isFinite(bestT)) return false;
  out.t = bestT;
  out.x = ray.ox + ray.dx * bestT;
  out.y = ray.oy + ray.dy * bestT;
  out.z = ray.oz + ray.dz * bestT;
  out.surface = surface;
  return true;
}
