// The "point" pose that reports an issue: the index finger out, the other three fingers curled, held at a spot. Pure logic: no imports
// from @iwsdk/core or three, so it is tested with synthetic hands (tests/unit/point-gesture.test.ts).
//
// It is told apart from the other hand poses by the distance of the fingertips from the wrist, the same measure the row gesture uses
// for its fist (src/logic/row-gesture.ts): a flat hand reaches 0.17-0.19 m with every finger, a relaxed hand about 0.15, a pinch with
// the other fingers loose 0.13-0.15, a fist 0.07-0.10, and a pointing hand has the index tip at 0.15 or more and the other three at 0.07-0.11.
//  - open or relaxed hand: the middle, ring and pinky tips are far from the wrist -> not a point;
//  - fist: the index tip is close to the wrist too -> not a point;
//  - pinch: the pinch state of the hand (`selectstart`, passed in as `pinching`) shuts the hand out, and for LOCKOUT_SECONDS after it ends.
// Both limits have hysteresis (one value to start, a looser one to keep). A hand must hold the pose for ARM_SECONDS before it is ready.
//
// The ray is the line of the index finger: from its knuckle (the proximal joint) through the tip, low-pass filtered so a tremor of the
// tracking does not swing the point on the model. Conventions: world metres, +y up. Nothing here allocates per frame.

export interface Vec3Like {
  x: number;
  y: number;
  z: number;
}

// --- Thresholds (to be tuned on the headset: qa/device/DEBT.md) ---------------------------------------------------------------

/** The index tip is at least this far from the wrist to start a point (metres)... */
export const INDEX_REACH_START = 0.14;
/** ...and at least this far to keep it. */
export const INDEX_REACH_KEEP = 0.12;
/** The farthest of the middle, ring and pinky tips is at most this far from the wrist to start (metres)... */
export const CURL_REACH_START = 0.115;
/** ...and at most this far to keep. */
export const CURL_REACH_KEEP = 0.135;
/** The knuckle-to-tip part of the index must be at least this long to give a direction (metres). */
export const MIN_FINGER_LENGTH = 0.03;
/** After a pinch of the hand ends (or while it lasts) the hand does not qualify for this long (seconds). */
export const POINT_LOCKOUT_SECONDS = 0.4;
/** A hand must hold the pose this long before it is ready (seconds). */
export const POINT_ARM_SECONDS = 0.15;
/** Time constant of the filter of the direction of the finger (seconds). */
export const DIRECTION_FILTER_SECONDS = 0.05;
/** A frame longer than this (seconds) is cut to it. */
export const POINT_MAX_DT = 0.1;

// --- Input ------------------------------------------------------------------------------------------------------------------------

/** What the system reads from one hand each frame (joint positions in world metres). Filled in place by the caller. */
export interface PointHandSample {
  /** The joints were read this frame and are finite. */
  tracked: boolean;
  /** The pinch state of the hand (WebXR `selectstart` .. `selectend`). */
  pinching: boolean;
  wrist: Vec3Like;
  /** The proximal joint of the index (the knuckle): with the tip it gives the direction of the finger. */
  indexKnuckle: Vec3Like;
  indexTip: Vec3Like;
  middleTip: Vec3Like;
  ringTip: Vec3Like;
  pinkyTip: Vec3Like;
}

export function createPointHandSample(): PointHandSample {
  const v = (): Vec3Like => ({ x: 0, y: 0, z: 0 });
  return { tracked: false, pinching: false, wrist: v(), indexKnuckle: v(), indexTip: v(), middleTip: v(), ringTip: v(), pinkyTip: v() };
}

// --- State ------------------------------------------------------------------------------------------------------------------------

/** Why a hand is not pointing right now (for logs and tests). `ok` means it qualifies. */
export type PointReject = 'ok' | 'untracked' | 'pinch' | 'lockout' | 'index' | 'curl';

export interface PointState {
  /** The hand holds the pose (with hysteresis). */
  qualified: boolean;
  reason: PointReject;
  /** Seconds the hand has held the pose (0 when it does not). */
  qualifiedFor: number;
  /** Seconds left of the lockout after a pinch. */
  lockout: number;
  /** The fingertip (the origin of the ray), world metres. */
  ox: number;
  oy: number;
  oz: number;
  /** The unit direction of the finger, filtered. Meaningful when `hasDirection`. */
  dx: number;
  dy: number;
  dz: number;
  hasDirection: boolean;
}

export function createPointState(): PointState {
  return { qualified: false, reason: 'untracked', qualifiedFor: 0, lockout: 0, ox: 0, oy: 0, oz: 0, dx: 0, dy: 0, dz: -1, hasDirection: false };
}

export function resetPointState(s: PointState): void {
  s.qualified = false;
  s.reason = 'untracked';
  s.qualifiedFor = 0;
  s.lockout = 0;
  s.hasDirection = false;
}

function distance(a: Vec3Like, b: Vec3Like): number {
  return Math.hypot(a.x - b.x, a.y - b.y, a.z - b.z);
}

/** The farthest of the middle, ring and pinky tips from the wrist (metres). */
export function curlReach(sample: Readonly<PointHandSample>): number {
  return Math.max(distance(sample.wrist, sample.middleTip), distance(sample.wrist, sample.ringTip), distance(sample.wrist, sample.pinkyTip));
}

/** The index tip from the wrist (metres). */
export function indexReach(sample: Readonly<PointHandSample>): number {
  return distance(sample.wrist, sample.indexTip);
}

/** The reason a sample does not qualify (`ok` when it does), with the hysteresis of `wasQualified`. Pure: it changes nothing. */
export function classifyPoint(sample: Readonly<PointHandSample>, wasQualified: boolean): PointReject {
  if (!sample.tracked) return 'untracked';
  if (sample.pinching) return 'pinch';
  const index = indexReach(sample);
  const curl = curlReach(sample);
  if (!Number.isFinite(index) || !Number.isFinite(curl)) return 'untracked';
  if (index < (wasQualified ? INDEX_REACH_KEEP : INDEX_REACH_START)) return 'index';
  if (curl > (wasQualified ? CURL_REACH_KEEP : CURL_REACH_START)) return 'curl';
  return 'ok';
}

/**
 * Advances the state of one hand by `dt` seconds. Returns true when the hand is READY: it has held the pose for POINT_ARM_SECONDS and
 * has a direction. The fingertip and the filtered direction are in the state.
 */
export function updatePoint(state: PointState, sample: Readonly<PointHandSample>, dt: number): boolean {
  const step = Number.isFinite(dt) && dt > 0 ? Math.min(dt, POINT_MAX_DT) : 0;
  if (sample.pinching) state.lockout = POINT_LOCKOUT_SECONDS;
  else if (state.lockout > 0) state.lockout = Math.max(0, state.lockout - step);
  let reason = classifyPoint(sample, state.qualified);
  if (reason === 'ok' && state.lockout > 0) reason = 'lockout';
  state.reason = reason;
  if (reason !== 'ok') {
    state.qualified = false;
    state.qualifiedFor = 0;
    state.hasDirection = false;
    return false;
  }
  state.qualified = true;
  state.qualifiedFor += step;
  state.ox = sample.indexTip.x;
  state.oy = sample.indexTip.y;
  state.oz = sample.indexTip.z;
  const rx = sample.indexTip.x - sample.indexKnuckle.x;
  const ry = sample.indexTip.y - sample.indexKnuckle.y;
  const rz = sample.indexTip.z - sample.indexKnuckle.z;
  const length = Math.hypot(rx, ry, rz);
  if (!(length >= MIN_FINGER_LENGTH)) {
    state.hasDirection = false;
    return false;
  }
  const ux = rx / length;
  const uy = ry / length;
  const uz = rz / length;
  if (!state.hasDirection) {
    state.dx = ux;
    state.dy = uy;
    state.dz = uz;
    state.hasDirection = true;
  } else {
    const alpha = 1 - Math.exp(-step / DIRECTION_FILTER_SECONDS);
    const fx = state.dx + (ux - state.dx) * alpha;
    const fy = state.dy + (uy - state.dy) * alpha;
    const fz = state.dz + (uz - state.dz) * alpha;
    const fl = Math.hypot(fx, fy, fz);
    if (fl > 1e-6) {
      state.dx = fx / fl;
      state.dy = fy / fl;
      state.dz = fz / fl;
    }
  }
  return state.qualifiedFor >= POINT_ARM_SECONDS;
}
