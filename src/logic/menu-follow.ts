// The pinned menu follows the gaze and keeps clear of the fixed buttons (fix/panel-overlap). Pure: no imports from @iwsdk/core or three.
//
// The pinned menu (the window with the objects, opened from the fixed Menu button or the debug key) used to be anchored ONCE, where the head
// looked when it opened. A user presses the Menu button while LOOKING at the button column beside the model, so the menu landed over (or under)
// the three fixed buttons. Now:
//
// 1. FOLLOW. The menu is a tag-along panel. It stays where it is while the gaze is inside a dead zone (`FOLLOW_DEAD_ZONE_DEG` of heading,
//    `FOLLOW_PITCH_DEAD_ZONE_DEG` of pitch), so the cards do not swim under a hand that is about to pinch one; when the gaze leaves the zone the
//    menu glides to the gaze (exponential, `FOLLOW_GLIDE_SECONDS`, never faster than `FOLLOW_MAX_DEG_PER_SECOND`) and is placed again with the
//    same rules as at opening (`pinnedPanelAnchor`: 0.5-0.8 m, upright, facing back, inside the 30 degree cone).
// 2. KEEP CLEAR. The column of fixed buttons (Menu, Issues, View and, in mixed reality, My room, anchored to the model, never moved) is a vertical strip seen from the head.
//    When the menu and the strip would be closer than `COLUMN_GAP_DEG` on both axes of the view, the heading of the menu is pushed sideways,
//    on the side of the strip where the menu already is (on the side of the gaze at the opening), to the nearest heading with the gap. A glide
//    never crosses the strip: it stops at the edge and stays on its side. The menu is turned about the vertical axis only, so the elevation
//    (the pitch the anchor follows) is untouched.
// Looking straight at the strip puts the menu beside it, outside the 30 degree cone; that is the price of never covering a button
// (the menu comes back into the cone as soon as the gaze leaves the strip). Allocates nothing.

import { BUTTON_HALF_HEIGHT, BUTTON_HALF_WIDTH, ISSUE_BUTTON_HALF_WIDTH, ROOM_COLUMN_BUTTON_HALF_WIDTH, VIEW_BUTTON_HALF_HEIGHT, VIEW_BUTTON_HALF_WIDTH, type ButtonAnchor } from './menu-button';
import type { PanelExtent } from './menu';
import { pinnedPanelAnchor } from './menu-anchor';
import { panelViewBox, viewBoxOverlap, type ViewBox } from './panel-arbiter';
import type { Point3Like } from './view-fit';

/** The column of fixed buttons beside the model, in the world: centre (x, z), half width of the widest button, and the vertical extent. */
export interface ButtonColumn {
  x: number;
  z: number;
  halfWidth: number;
  yBottom: number;
  yTop: number;
}

/**
 * Fills `out` with the column of the three fixed buttons of one side: `menu` is the lowest (Menu), `issues` the middle, `view` the top
 * (their `halfWidth` is the widened one at large text). The strip is as wide as the widest button and as tall as the three together;
 * an optional fourth `room` ("My room", mixed reality only) above them makes it taller.
 */
export function fillButtonColumn(
  out: ButtonColumn,
  menu: Readonly<ButtonAnchor>,
  issues: Readonly<ButtonAnchor>,
  view: Readonly<ButtonAnchor>,
  room?: Readonly<ButtonAnchor>,
): ButtonColumn {
  out.x = menu.x;
  out.z = menu.z;
  out.halfWidth = Math.max(menu.halfWidth ?? BUTTON_HALF_WIDTH, issues.halfWidth ?? ISSUE_BUTTON_HALF_WIDTH, view.halfWidth ?? VIEW_BUTTON_HALF_WIDTH);
  out.yBottom = menu.y - BUTTON_HALF_HEIGHT;
  out.yTop = view.y + VIEW_BUTTON_HALF_HEIGHT;
  // The fourth floor, "My room" (same height as the others).
  if (room) {
    out.halfWidth = Math.max(out.halfWidth, room.halfWidth ?? ROOM_COLUMN_BUTTON_HALF_WIDTH);
    out.yTop = Math.max(out.yTop, room.y + BUTTON_HALF_HEIGHT);
  }
  return out;
}

/** The menu rests while the heading of the gaze is within this angle of it, in degrees (the menu is about 38 degrees wide). */
export const FOLLOW_DEAD_ZONE_DEG = 12;
/** The menu rests while the pitch of the gaze is within this angle of the one it was placed for, in degrees. */
export const FOLLOW_PITCH_DEAD_ZONE_DEG = 10;
/** A glide ends (the menu stops) when the heading is this close to its target, in degrees. */
export const FOLLOW_SETTLE_DEG = 1.5;
/** Time constant of the glide, in seconds. */
export const FOLLOW_GLIDE_SECONDS = 0.3;
/** The glide is never faster than this, in degrees per second. */
export const FOLLOW_MAX_DEG_PER_SECOND = 90;
/** The menu and the button column keep at least this gap, in degrees of the view, on both axes. */
export const COLUMN_GAP_DEG = 3;
/**
 * The menu may pass above or below the strip, but not suddenly: the sideways clearance it needs grows from nothing to the full reach over
 * this many degrees of vertical gap (counted from `COLUMN_GAP_DEG`), so a nod of the head moves the menu a little, never in a jump.
 */
export const ELEVATION_RAMP_DEG = 12;
/** The gap a push aims for: a hair more than `COLUMN_GAP_DEG`, so a menu that was pushed is not found touching again by rounding. */
const REACH_GAP_DEG = COLUMN_GAP_DEG + 0.05;
/** A frame longer than this counts as this long (a hitch must not throw the menu across the view), in seconds. */
export const FOLLOW_MAX_DT = 0.1;

const RAD_TO_DEG = 180 / Math.PI;
const DEG_TO_RAD = Math.PI / 180;
const EPS = 1e-9;

/** Where the menu is and how it got there. `heading` is the way it faces from the head (as `yawOfForward`), `gazePitch` the raw gaze pitch it was placed for. */
export interface MenuFollowState {
  heading: number;
  gazePitch: number;
  moving: boolean;
  /** Bottom centre of the menu (its frame). */
  anchor: Point3Like;
}

export function createMenuFollow(): MenuFollowState {
  return { heading: 0, gazePitch: 0, moving: false, anchor: { x: 0, y: 0, z: 0 } };
}

/** What the follow needs each frame. */
export interface FollowInputs {
  head: Readonly<Point3Like>;
  /** Heading of the gaze (radians, as `yawOfForward`) and its raw pitch (radians, positive = up). */
  gazeYaw: number;
  gazePitch: number;
  /** The menu's extent from its frame (already scaled for large text) and whether the text is large. */
  extent: Readonly<PanelExtent>;
  large: boolean;
  /** The fixed buttons that are shown, or null (hidden: real scale, no session). */
  column: Readonly<ButtonColumn> | null;
  /** Which way to go when the gaze is exactly on the column: +1 = to the left of the user, -1 = to the right (away from a right-hand column: +1). */
  tieSign: 1 | -1;
}

const boxMenu: ViewBox = { azMin: 0, azMax: 0, elMin: 0, elMax: 0 };
const boxTarget: ViewBox = { azMin: 0, azMax: 0, elMin: 0, elMax: 0 };
const boxColumn: ViewBox = { azMin: 0, azMax: 0, elMin: 0, elMax: 0 };
const scratch: Point3Like = { x: 0, y: 0, z: 0 };

/** `angle` wrapped to -pi..pi. */
export function wrapAngle(angle: number): number {
  let a = angle;
  while (a > Math.PI) a -= 2 * Math.PI;
  while (a < -Math.PI) a += 2 * Math.PI;
  return a;
}

/** 1 when the boxes share a height (or are closer than `COLUMN_GAP_DEG`), falling to 0 when they are `COLUMN_GAP_DEG + ELEVATION_RAMP_DEG` apart. */
function verticalFactor(menu: Readonly<ViewBox>, column: Readonly<ViewBox>): number {
  const gap = Math.max(column.elMin - menu.elMax, menu.elMin - column.elMax);
  const f = 1 - (gap - COLUMN_GAP_DEG) / ELEVATION_RAMP_DEG;
  return f >= 1 ? 1 : f <= 0 ? 0 : f;
}

/** Azimuth (radians, as `yawOfForward`) of the column from the head. */
function columnAzimuth(head: Readonly<Point3Like>, column: Readonly<ButtonColumn>): number {
  return Math.atan2(-(column.x - head.x), -(column.z - head.z));
}

/**
 * The view box of the column from `head`, azimuth measured from `refYaw`. False when the column is at the head itself (nothing to avoid).
 * Writes into `out`.
 */
export function columnViewBox(head: Readonly<Point3Like>, column: Readonly<ButtonColumn>, refYaw: number, out: ViewBox): boolean {
  const dx = column.x - head.x;
  const dz = column.z - head.z;
  const dh = Math.hypot(dx, dz);
  if (!(dh > EPS) || !Number.isFinite(dh + column.halfWidth + column.yBottom + column.yTop)) return false;
  const az = wrapAngle(columnAzimuth(head, column) - refYaw) * RAD_TO_DEG;
  const half = Math.atan(column.halfWidth / dh) * RAD_TO_DEG;
  out.azMin = az - half;
  out.azMax = az + half;
  out.elMin = Math.atan2(column.yBottom - head.y, dh) * RAD_TO_DEG;
  out.elMax = Math.atan2(column.yTop - head.y, dh) * RAD_TO_DEG;
  return true;
}

/** True when the menu in `state` (seen from the live head) is closer than `COLUMN_GAP_DEG` to the column on both axes of the view. */
export function menuTouchesColumn(state: Readonly<MenuFollowState>, inputs: Readonly<FollowInputs>): boolean {
  const column = inputs.column;
  if (!column || !columnViewBox(inputs.head, column, state.heading, boxColumn)) return false;
  panelViewBox(inputs.head, state.heading, state.anchor, state.heading, inputs.extent, boxMenu);
  return viewBoxOverlap(boxMenu, boxColumn, COLUMN_GAP_DEG / 2) > 0; // the margin grows both boxes: a gap under COLUMN_GAP_DEG touches
}

/** The view box the menu will have when it is placed at `heading` with the pitch of `state` from the live head (centred on `heading`). Writes into `out`. */
function menuBoxAt(state: Readonly<MenuFollowState>, inputs: Readonly<FollowInputs>, heading: number, out: ViewBox): ViewBox {
  pinnedPanelAnchor(inputs.head, heading, state.gazePitch, inputs.extent, inputs.large, scratch);
  return panelViewBox(inputs.head, heading, scratch, heading, inputs.extent, out);
}

function anchorAt(state: MenuFollowState, inputs: Readonly<FollowInputs>, heading: number, pitch: number): void {
  pinnedPanelAnchor(inputs.head, heading, pitch, inputs.extent, inputs.large, state.anchor);
}

/**
 * The heading the menu wants: the gaze, unless the menu there would touch the column, then the nearest heading that keeps the gap, on the
 * side of the column where the menu is now (`side` is that side, +1 / -1, or 0 when it is not on one: the side of the gaze decides).
 */
function targetHeading(state: Readonly<MenuFollowState>, inputs: Readonly<FollowInputs>, side: number): number {
  const psi = inputs.gazeYaw;
  const column = inputs.column;
  if (!column) return psi;
  // The menu as it would be at the gaze: its size and its elevation.
  pinnedPanelAnchor(inputs.head, psi, inputs.gazePitch, inputs.extent, inputs.large, scratch);
  panelViewBox(inputs.head, psi, scratch, psi, inputs.extent, boxTarget);
  if (!columnViewBox(inputs.head, column, psi, boxColumn)) return psi;
  const factor = verticalFactor(boxTarget, boxColumn);
  if (factor <= 0) return psi;
  const reach = factor * ((boxTarget.azMax - boxTarget.azMin) / 2 + (boxColumn.azMax - boxColumn.azMin) / 2 + REACH_GAP_DEG); // degrees
  const col = (boxColumn.azMin + boxColumn.azMax) / 2; // column centre from the gaze, degrees
  let s = side;
  if (s === 0) s = Math.abs(col) > 1e-6 ? (col > 0 ? -1 : 1) : inputs.tieSign;
  // The menu at the gaze (0 degrees) is allowed when it is on side `s` of the column and farther than `reach`.
  if (s * -col >= reach) return psi;
  return psi + (col + s * reach) * DEG_TO_RAD;
}

/**
 * Which side of the column the menu is on: +1 when it is to the left of it, -1 to the right, 0 when it is on it (the gaze, or `tieSign`,
 * decides then). The menu keeps its side: it never hops across the buttons.
 */
function sideOfColumn(state: Readonly<MenuFollowState>, inputs: Readonly<FollowInputs>): number {
  const column = inputs.column;
  if (!column || !columnViewBox(inputs.head, column, state.heading, boxColumn)) return 0;
  const col = (boxColumn.azMin + boxColumn.azMax) / 2; // column centre from the menu's heading, degrees (+ = to the left of the menu)
  if (Math.abs(col) < 1e-6) return 0;
  return col > 0 ? -1 : 1;
}

/**
 * The heading of the nearest place beside the column, on `side` (0: the tie side), for a menu that touches it: the menu where it is, moved
 * sideways by the least that leaves the gap. Never more than the reach (the size of the menu plus the strip plus the gap).
 */
function pushedHeading(state: Readonly<MenuFollowState>, inputs: Readonly<FollowInputs>, side: number): number {
  const column = inputs.column;
  if (!column || !columnViewBox(inputs.head, column, state.heading, boxColumn)) return state.heading;
  menuBoxAt(state, inputs, state.heading, boxMenu); // the menu is placed again from the live head, so its size is the one it will have
  const reach = (boxMenu.azMax - boxMenu.azMin) / 2 + (boxColumn.azMax - boxColumn.azMin) / 2 + REACH_GAP_DEG;
  const col = (boxColumn.azMin + boxColumn.azMax) / 2; // from the menu's heading, degrees
  const s = side !== 0 ? side : inputs.tieSign;
  return wrapAngle(state.heading + (col + s * reach) * DEG_TO_RAD);
}

/**
 * Places the menu now (no glide), as it opens: at the gaze, or beside the column (on the side of the gaze) when the gaze is on it.
 * Resets the state.
 */
export function placeMenuFollow(state: MenuFollowState, inputs: Readonly<FollowInputs>): void {
  state.moving = false;
  state.gazePitch = inputs.gazePitch;
  state.heading = inputs.gazeYaw;
  anchorAt(state, inputs, state.heading, state.gazePitch);
  state.heading = targetHeading(state, inputs, sideOfColumn(state, inputs));
  anchorAt(state, inputs, state.heading, state.gazePitch);
}

/**
 * One frame of the follow. Returns true when the menu moved (its anchor was written again). `dt` is the frame time in seconds.
 * The menu rests inside the dead zone, glides to the gaze outside it, and is pushed clear of the column whenever it would touch it.
 */
export function stepMenuFollow(state: MenuFollowState, inputs: Readonly<FollowInputs>, dt: number): boolean {
  const step = Number.isFinite(dt) && dt > 0 ? Math.min(dt, FOLLOW_MAX_DT) : 0;
  const touching = menuTouchesColumn(state, inputs);
  const side = sideOfColumn(state, inputs);
  const desired = targetHeading(state, inputs, side);
  const headingError = wrapAngle(desired - state.heading);
  const pitchError = inputs.gazePitch - state.gazePitch;
  if (!state.moving) {
    const out =
      Math.abs(headingError) * RAD_TO_DEG > FOLLOW_DEAD_ZONE_DEG ||
      Math.abs(pitchError) * RAD_TO_DEG > FOLLOW_PITCH_DEAD_ZONE_DEG ||
      touching;
    if (!out) return false;
    state.moving = true;
  }

  const alpha = 1 - Math.exp(-step / FOLLOW_GLIDE_SECONDS);
  const maxStep = FOLLOW_MAX_DEG_PER_SECOND * DEG_TO_RAD * step;
  let move = headingError * alpha;
  if (Math.abs(move) > maxStep) move = Math.sign(move) * maxStep;
  // The pitch glides with the heading; both are used to place the menu again from the live head.
  state.gazePitch += pitchError * alpha;
  if (Math.abs(inputs.gazePitch - state.gazePitch) * RAD_TO_DEG < FOLLOW_SETTLE_DEG) state.gazePitch = inputs.gazePitch;
  // A menu that touches the column leaves it at once, to the nearest edge on its own side (a glide through the buttons would show them
  // under the menu); the rest glides.
  let heading = touching ? pushedHeading(state, inputs, side) : wrapAngle(state.heading + move);
  if (!touching && side !== 0 && inputs.column && columnViewBox(inputs.head, inputs.column, state.heading, boxColumn)) {
    menuBoxAt(state, inputs, heading, boxMenu);
    // The column from the candidate heading (the box above was measured from the old one).
    columnViewBox(inputs.head, inputs.column, heading, boxColumn);
    const factor = verticalFactor(boxMenu, boxColumn);
    if (factor > 0) {
      // The glide never goes into the column: it stops at the edge, on the side it started from.
      const reach = factor * ((boxMenu.azMax - boxMenu.azMin) / 2 + (boxColumn.azMax - boxColumn.azMin) / 2 + REACH_GAP_DEG);
      const columnHeading = columnAzimuth(inputs.head, inputs.column);
      const rel = wrapAngle(heading - columnHeading) * RAD_TO_DEG;
      if (side * rel < reach) heading = wrapAngle(columnHeading + side * reach * DEG_TO_RAD);
    }
  }
  state.heading = heading;
  anchorAt(state, inputs, state.heading, state.gazePitch);
  const arrived = Math.abs(wrapAngle(desired - state.heading)) * RAD_TO_DEG < FOLLOW_SETTLE_DEG && state.gazePitch === inputs.gazePitch;
  if (arrived) {
    state.heading = desired;
    anchorAt(state, inputs, state.heading, state.gazePitch);
    state.moving = false;
  }
  return true;
}
