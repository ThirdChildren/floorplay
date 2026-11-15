// Default viewpoints (fix for "some rooms have no blue marker"). Pure logic: no imports from @iwsdk/core or three.
//
// The table-top model shows one marker per viewpoint, and a viewpoint is the only way to enter a room at real scale. A
// house file may name viewpoints for a few rooms only (the demo houses did), so every room that has none gets one
// derived here: the "pole of inaccessibility" of its floor outline (the point farthest from every wall, guaranteed to be
// inside the polygon even when the room is L-shaped), looking at the nearest door of the room, or, with no door, at the
// middle of its longest wall. The explicit viewpoints of the file are never touched or moved.

import { pointInPolygon, polygonCentroid, type Point2 } from './geometry';
import type { House, Room, Viewpoint, Wall } from './house';

/** The pole of inaccessibility is searched down to this precision (plan metres). */
const POLE_PRECISION = 0.05;
/** A door nearer than this to the point is "under" it: the direction would be noise. */
const MIN_LOOK_DISTANCE = 0.2;
const EPS = 1e-9;

/** Distance from (`px`, `pz`) to the segment `a`-`b`. */
function segmentDistance(px: number, pz: number, a: Point2, b: Point2): number {
  let x = a[0];
  let z = a[1];
  let dx = b[0] - x;
  let dz = b[1] - z;
  if (dx !== 0 || dz !== 0) {
    const t = Math.max(0, Math.min(1, ((px - x) * dx + (pz - z) * dz) / (dx * dx + dz * dz)));
    x += dx * t;
    z += dz * t;
  }
  dx = px - x;
  dz = pz - z;
  return Math.sqrt(dx * dx + dz * dz);
}

/** Signed distance to the outline: positive inside, negative outside. */
function signedDistance(px: number, pz: number, polygon: readonly Point2[]): number {
  let min = Infinity;
  for (let i = 0; i < polygon.length; i += 1) {
    const d = segmentDistance(px, pz, polygon[i], polygon[(i + 1) % polygon.length]);
    if (d < min) min = d;
  }
  return pointInPolygon([px, pz], polygon) ? min : -min;
}

interface Cell {
  x: number;
  z: number;
  /** Half of the side. */
  h: number;
  d: number;
  /** Upper bound of the distance reachable inside this cell. */
  max: number;
}

function makeCell(x: number, z: number, h: number, polygon: readonly Point2[]): Cell {
  const d = signedDistance(x, z, polygon);
  return { x, z, h, d, max: d + h * Math.SQRT2 };
}

/**
 * The point of the polygon farthest from its edges (the "polylabel" of a polygon), found with a quad-tree of cells down
 * to `precision` metres. Always inside the polygon for a valid outline; a degenerate one (no area) returns its centroid.
 */
export function polygonPole(polygon: readonly Point2[], precision: number = POLE_PRECISION): [number, number] {
  if (polygon.length === 0) return [0, 0];
  let minX = Infinity;
  let minZ = Infinity;
  let maxX = -Infinity;
  let maxZ = -Infinity;
  for (const p of polygon) {
    if (p[0] < minX) minX = p[0];
    if (p[0] > maxX) maxX = p[0];
    if (p[1] < minZ) minZ = p[1];
    if (p[1] > maxZ) maxZ = p[1];
  }
  const size = Math.min(maxX - minX, maxZ - minZ);
  if (!(size > EPS)) return [polygon[0][0], polygon[0][1]];
  const h0 = size / 2;
  const queue: Cell[] = [];
  for (let x = minX; x < maxX; x += size) {
    for (let z = minZ; z < maxZ; z += size) queue.push(makeCell(x + h0, z + h0, h0, polygon));
  }
  // Start from the centroid: it is the answer for a convex room as a first guess.
  const centroid = polygonCentroid(polygon);
  let best = makeCell(centroid[0], centroid[1], 0, polygon);
  const first = makeCell(minX + (maxX - minX) / 2, minZ + (maxZ - minZ) / 2, 0, polygon);
  if (first.d > best.d) best = first;
  // Nodes are few (a room is a handful of points): the cell with the best bound is found with a scan.
  let guard = 0;
  while (queue.length > 0 && guard < 20000) {
    guard += 1;
    let top = 0;
    for (let i = 1; i < queue.length; i += 1) if (queue[i].max > queue[top].max) top = i;
    const cell = queue[top];
    queue[top] = queue[queue.length - 1];
    queue.pop();
    if (cell.d > best.d) best = cell;
    if (cell.max - best.d <= precision) continue;
    const h = cell.h / 2;
    queue.push(
      makeCell(cell.x - h, cell.z - h, h, polygon),
      makeCell(cell.x + h, cell.z - h, h, polygon),
      makeCell(cell.x - h, cell.z + h, h, polygon),
      makeCell(cell.x + h, cell.z + h, h, polygon),
    );
  }
  if (best.d > 0 && pointInPolygon([best.x, best.z], polygon)) return [best.x, best.z];
  // No cell fell inside (a degenerate outline): the centroid if it is inside, else the first vertex.
  return pointInPolygon(centroid, polygon) ? [centroid[0], centroid[1]] : [polygon[0][0], polygon[0][1]];
}

/** Centre of a door on the plan (the wall line at the middle of the opening), or null for a zero-length wall. */
function doorCentre(wall: Wall, offset: number, width: number): [number, number] | null {
  const dx = wall.to[0] - wall.from[0];
  const dz = wall.to[1] - wall.from[1];
  const length = Math.sqrt(dx * dx + dz * dz);
  if (!(length > EPS)) return null;
  const d = offset + width / 2;
  return [wall.from[0] + (dx / length) * d, wall.from[1] + (dz / length) * d];
}

/** Direction in degrees (0 = towards -z, clockwise seen from above, [0, 360)) of the plan vector (`dx`, `dz`). */
function yawOf(dx: number, dz: number): number {
  const deg = (Math.atan2(dx, -dz) * 180) / Math.PI;
  const wrapped = ((Math.round(deg) % 360) + 360) % 360;
  return wrapped;
}

/**
 * Where a default viewpoint at `position` looks: at the nearest door that connects `room` (the way in and out), else at
 * the middle of the longest edge of the outline. Returns 0 (north) when neither gives a direction.
 */
export function defaultYawDeg(room: Room, position: Point2, walls: readonly Wall[]): number {
  let target: [number, number] | null = null;
  let bestSq = Infinity;
  for (const wall of walls) {
    for (const opening of wall.openings) {
      if (opening.type !== 'door' || !opening.connects || !opening.connects.includes(room.id)) continue;
      const at = doorCentre(wall, opening.offset, opening.width);
      if (!at) continue;
      const sq = (at[0] - position[0]) ** 2 + (at[1] - position[1]) ** 2;
      if (sq < MIN_LOOK_DISTANCE * MIN_LOOK_DISTANCE || !(sq < bestSq)) continue;
      bestSq = sq;
      target = at;
    }
  }
  if (!target) {
    let longestSq = 0;
    const n = room.polygon.length;
    for (let i = 0; i < n; i += 1) {
      const a = room.polygon[i];
      const b = room.polygon[(i + 1) % n];
      const sq = (b[0] - a[0]) ** 2 + (b[1] - a[1]) ** 2;
      if (sq > longestSq) {
        const mid: [number, number] = [(a[0] + b[0]) / 2, (a[1] + b[1]) / 2];
        if ((mid[0] - position[0]) ** 2 + (mid[1] - position[1]) ** 2 < MIN_LOOK_DISTANCE * MIN_LOOK_DISTANCE) continue;
        longestSq = sq;
        target = mid;
      }
    }
  }
  return target ? yawOf(target[0] - position[0], target[1] - position[1]) : 0;
}

/** The viewpoint a room gets when the house names none for it, with the id `id`. Position inside the room polygon. */
export function defaultViewpoint(room: Room, walls: readonly Wall[], id: string): Viewpoint {
  const position = polygonPole(room.polygon);
  return { id, room: room.id, position: [position[0], position[1]], yawDeg: defaultYawDeg(room, position, walls) };
}

/** Ids `V<n>` that are free in `taken`, counting up from one above the highest `V<n>` already there. */
function idGenerator(taken: ReadonlySet<string>): () => string {
  let next = 1;
  for (const id of taken) {
    const m = /^V(\d+)$/.exec(id);
    if (m) next = Math.max(next, Number(m[1]) + 1);
  }
  return () => {
    let id = `V${next}`;
    while (taken.has(id)) {
      next += 1;
      id = `V${next}`;
    }
    next += 1;
    return id;
  };
}

/**
 * The house with a viewpoint for every room: the explicit viewpoints stay as they are (same order, same ids) and each
 * room without one gets a derived viewpoint after them, in the order of `rooms`. Returns the SAME object when every room
 * already has a viewpoint; otherwise a shallow copy with a longer `viewpoints` array (the input is never changed).
 */
export function withDefaultViewpoints(house: House): House {
  const covered = new Set<string>(house.viewpoints.map((viewpoint) => viewpoint.room));
  const missing = house.rooms.filter((room) => !covered.has(room.id));
  if (missing.length === 0) return house;
  const nextId = idGenerator(new Set(house.viewpoints.map((viewpoint) => viewpoint.id)));
  const added = missing.map((room) => defaultViewpoint(room, house.walls, nextId()));
  return { ...house, viewpoints: [...house.viewpoints, ...added] };
}
