// Walking inside the model at real scale (plan docs/plans/WALK.md): the body, the walls it cannot cross, the step and the pose of the
// model around the head. Pure logic: no imports from @iwsdk/core or three.
//
// THE IDEA. Like the viewpoints (D35) the head never moves: the model is shown at real scale (perceived scale 1, the user
// is "small inside the 1:20 model" and the model is shown 20 times larger around them) and walking moves the MODEL under the
// head. The state is the plan position `P` of the body (metres, the plan of the house file). The root of the model is placed so
// that `P` is under the reference head position `ref` (the head when the walk started), with the floor `eye` (the eye height of the
// viewpoint) below the eyes; leaning moves the head from `ref`, not `P`.
//
// COLLISIONS. The body is a circle (BODY_RADIUS) on the plan. The solid things are the solid pieces of every wall (walls split
// at their DOORS, `wallPieces`: doors are gaps; windows stay solid) plus a closed "plug" in each door that leads outside (the
// user stays inside the house). A step moves the circle and then pushes it out of every rectangle it overlaps: along a wall the
// push cancels the part of the step that points into the wall, so the body SLIDES instead of stopping dead.

import type { House } from './house';
import { doorZone, wallPieces, type Rect } from './footprint';
import { planBox } from './house-layout';
import { REAL_SCALE } from './real-scale';
import type { MiniatureRoot } from './furniture-pose';
import { DEFAULT_EYE_HEIGHT } from './viewpoint-pose';

/**
 * Eyes above the floor of the model at the perceived scale, metres: seated, as at a viewpoint (the model is at real size around the
 * head). A walk that starts at a viewpoint keeps the eye height of that viewpoint; one restored from the saved `walk` view uses this.
 */
export const WALK_EYE_HEIGHT = DEFAULT_EYE_HEIGHT;
/** Radius of the body on the plan, metres (a doorway of 0.75 m leaves 0.31 m of play). */
export const BODY_RADIUS = 0.22;
/** A step is cut into pieces of at most this length so a fast frame cannot jump across a wall (metres; walls are 0.1 m thick). */
export const MAX_SUBSTEP = 0.05;
/** How many times the body is pushed out of the walls in one substep (a corner needs two). */
export const PUSH_PASSES = 4;
/** Extra metres around the plan the body may not leave, even if a house file has a hole in its walls. */
export const BOUNDS_MARGIN = 0.05;

export interface WalkWorld {
  /** The solid rectangles on the plan (wall pieces and closed exterior doors). */
  readonly solids: readonly Rect[];
  /** The plan box the body stays in: minX, minZ, maxX, maxZ. */
  readonly bounds: { readonly minX: number; readonly minZ: number; readonly maxX: number; readonly maxZ: number };
  /** The plan point that sits on the root origin (`planCenter`). */
  readonly center: Readonly<[number, number]>;
}

/** Builds the solid rectangles of `house`. Walls are split at doors; a door to the outside is closed by a plug. */
export function buildWalkWorld(house: Pick<House, 'walls' | 'rooms'>): WalkWorld {
  const solids: Rect[] = [];
  for (const wall of house.walls) {
    for (const piece of wallPieces(wall)) solids.push(piece);
    for (const opening of wall.openings) {
      if (opening.type !== 'door') continue;
      const toOutside = wall.exterior || (opening.connects?.includes('outside') ?? false);
      if (toOutside) solids.push(doorZone(wall, opening, 0));
    }
  }
  const box = planBox(house);
  return {
    solids,
    bounds: { minX: box.minX - BOUNDS_MARGIN, minZ: box.minZ - BOUNDS_MARGIN, maxX: box.maxX + BOUNDS_MARGIN, maxZ: box.maxZ + BOUNDS_MARGIN },
    center: [box.cx, box.cz],
  };
}

/** A point on the plan. */
export interface PlanPoint {
  x: number;
  z: number;
}

/**
 * Pushes the circle at `p` (radius `r`) out of `rect`, writing the new position into `p`. Returns the depth of the push (0 when
 * the circle was clear). Works in the frame of the rectangle, so a turned wall is no harder than an axis-aligned one.
 */
export function pushOutOfRect(p: PlanPoint, r: number, rect: Readonly<Rect>): number {
  const c = Math.cos(rect.angleRad);
  const s = Math.sin(rect.angleRad);
  const dx = p.x - rect.cx;
  const dz = p.z - rect.cz;
  // Local frame: u along the wall, v across it.
  const u = dx * c + dz * s;
  const v = -dx * s + dz * c;
  const hw = rect.w / 2;
  const hd = rect.d / 2;
  const nu = Math.max(-hw, Math.min(hw, u));
  const nv = Math.max(-hd, Math.min(hd, v));
  let ox = u - nu;
  let ov = v - nv;
  let d = Math.hypot(ox, ov);
  if (d >= r) return 0;
  if (d < 1e-9) {
    // The centre is INSIDE the rectangle: leave by the nearest side.
    const left = hw + u;
    const right = hw - u;
    const near = hd + v;
    const far = hd - v;
    const m = Math.min(left, right, near, far);
    ox = 0;
    ov = 0;
    if (m === left) ox = -1;
    else if (m === right) ox = 1;
    else if (m === near) ov = -1;
    else ov = 1;
    // Move to the side of the rectangle plus the radius.
    const push = m + r;
    p.x += (ox * c - ov * s) * push;
    p.z += (ox * s + ov * c) * push;
    return push;
  }
  const push = r - d;
  ox /= d;
  ov /= d;
  p.x += (ox * c - ov * s) * push;
  p.z += (ox * s + ov * c) * push;
  return push;
}

/** Pushes the body at `p` out of every solid of `world` and back inside the bounds. Returns the largest push. */
export function resolveBody(p: PlanPoint, world: Readonly<WalkWorld>, r: number = BODY_RADIUS): number {
  let largest = 0;
  for (let pass = 0; pass < PUSH_PASSES; pass += 1) {
    let moved = 0;
    for (const rect of world.solids) {
      const push = pushOutOfRect(p, r, rect);
      if (push > moved) moved = push;
    }
    if (moved > largest) largest = moved;
    if (moved < 1e-7) break;
  }
  const b = world.bounds;
  if (p.x < b.minX) p.x = b.minX;
  else if (p.x > b.maxX) p.x = b.maxX;
  if (p.z < b.minZ) p.z = b.minZ;
  else if (p.z > b.maxZ) p.z = b.maxZ;
  return largest;
}

/** What `stepWalk` reports. Reused between calls. */
export interface WalkStep {
  /** The distance the body really moved (metres). */
  moved: number;
  /** The distance it was asked to move (metres). */
  wanted: number;
  /** Moved / wanted: 1 in the open, near 0 head-on into a wall, in between when sliding. */
  progress: number;
}

/**
 * Moves the body at `p` by (`dx`, `dz`) metres of plan, in substeps, sliding along the walls. Writes the new position into `p`.
 * A non-finite step changes nothing.
 */
export function stepWalk(p: PlanPoint, dx: number, dz: number, world: Readonly<WalkWorld>, out: WalkStep): WalkStep {
  out.moved = 0;
  out.wanted = 0;
  out.progress = 1;
  if (!Number.isFinite(dx + dz)) return out;
  const wanted = Math.hypot(dx, dz);
  out.wanted = wanted;
  if (wanted === 0) return out;
  const startX = p.x;
  const startZ = p.z;
  const parts = Math.max(1, Math.ceil(wanted / MAX_SUBSTEP));
  const sx = dx / parts;
  const sz = dz / parts;
  for (let i = 0; i < parts; i += 1) {
    p.x += sx;
    p.z += sz;
    resolveBody(p, world);
  }
  out.moved = Math.hypot(p.x - startX, p.z - startZ);
  out.progress = Math.min(1, out.moved / wanted);
  return out;
}

/** The nearest free spot to (`x`, `z`): the point itself when the body fits there, else pushed out of the walls. Writes into `out`. */
export function freeSpot(x: number, z: number, world: Readonly<WalkWorld>, out: PlanPoint): PlanPoint {
  out.x = x;
  out.z = z;
  resolveBody(out, world);
  return out;
}

// --- Pose of the model around the head ----------------------------------------------------------------------------------------

/** The head when the walk began, and the turn of the model (counter-clockwise radians about +Y, as `MiniatureRoot.yawRad`). */
export interface WalkReference {
  hx: number;
  hy: number;
  hz: number;
  yawRad: number;
  /** Eyes above the floor of the model, metres (`WALK_EYE_HEIGHT`, or the eye height of the viewpoint the walk started at). */
  eye: number;
}

/**
 * Pose of `miniature:root` that puts the plan point (`px`, `pz`) under the head of `ref` with the floor `ref.eye` below
 * it: `root_xz = head_xz - R(yaw) (P - centre)`, with R as in `viewpointRoot` (src/logic/viewpoint-pose.ts). Writes into `out`.
 */
export function walkRoot(
  px: number,
  pz: number,
  center: Readonly<[number, number]>,
  ref: Readonly<WalkReference>,
  out: MiniatureRoot,
): MiniatureRoot {
  const c = Math.cos(ref.yawRad);
  const s = Math.sin(ref.yawRad);
  const a = px - center[0];
  const b = pz - center[1];
  out.x = ref.hx - (a * c + b * s);
  out.y = ref.hy - ref.eye;
  out.z = ref.hz - (-a * s + b * c);
  out.yawRad = ref.yawRad;
  out.scale = REAL_SCALE;
  return out;
}

/**
 * Converts a horizontal world vector (`wx`, `wz`) into the same vector on the plan, for a model turned by `yawRad`:
 * the inverse of the turn `R(yaw)` that `walkRoot` applies to the plan. Writes into `out`.
 */
export function worldToPlan(wx: number, wz: number, yawRad: number, out: PlanPoint): PlanPoint {
  const c = Math.cos(yawRad);
  const s = Math.sin(yawRad);
  out.x = c * wx - s * wz;
  out.z = s * wx + c * wz;
  return out;
}

/** The step of the body on the plan for a walk at `speed` m/s along the horizontal gaze (`fx`, `fz`) during `dt` seconds. */
export function planStep(speed: number, fx: number, fz: number, dt: number, yawRad: number, out: PlanPoint): PlanPoint {
  return worldToPlan(fx * speed * dt, fz * speed * dt, yawRad, out);
}

/** Wraps degrees to (-180, 180]. */
export function wrapDegrees(deg: number): number {
  let a = deg % 360;
  if (a > 180) a -= 360;
  else if (a <= -180) a += 360;
  return a;
}

/** Rounds to millimetres (the saved position). */
export function roundMm(v: number): number {
  return Math.round(v * 1000) / 1000;
}
