// The "dig" gesture that walks inside the tabletop model (plan docs/plans/WALK.md). Pure logic: no imports from @iwsdk/core
// or three, so it is tested with synthetic hands.
//
// A dig is what you do with both hands to scoop something towards you: BOTH hands open (fingers out, thumb and index apart),
// BOTH palms facing down, in front of the body below the eyes, and each hand sweeping BACK towards the body. Every coordinated
// stroke adds speed along the horizontal direction of the head; when the strokes stop, the speed decays smoothly to zero.
//
// Why it is hard to trigger by accident (rule: no false positives with pinch, grab or the two-hand zoom/turn):
//  - a hand only counts while it is open (thumb-index gap and finger reach, with hysteresis), palm down (angle from straight
//    down, with hysteresis) and in front of / below the head;
//  - a pinch of that hand (the `selectstart` state) shuts the hand out for LOCKOUT_SECONDS after it ends, so the open-hand
//    pose that surrounds every pinch never walks, and the two-hand rotate/zoom gesture (both hands pinching) never does either;
//  - a hand has to be qualified for ARM_SECONDS before its movement counts;
//  - the stroke has to be mostly backwards (not a sideways wave) and faster than STROKE_MIN_SPEED in BOTH hands at once;
//  - a forward return stroke adds nothing.
//
// Conventions: world metres, +y up. The head forward is the HORIZONTAL unit vector (fx, fz) of the gaze (0, -1 looks along -z).
// Nothing here allocates per frame: the hand states and the result are created once and rewritten.

export interface Vec3Like {
  x: number;
  y: number;
  z: number;
}

// --- Thresholds (all of them are to be tuned on the headset: qa/device/DEBT.md) -----------------------------------------------

/** Palm down: the palm normal is within this angle of straight down to start (degrees)... */
export const PALM_DOWN_START_DEG = 40;
/** ...and stays "down" until it leaves this angle (hysteresis). */
export const PALM_DOWN_KEEP_DEG = 58;
/** Thumb tip to index tip distance (metres) that counts as open (not a pinch, not a grab) to start... */
export const OPEN_PINCH_START = 0.05;
/** ...and the distance that still counts as open once it is. */
export const OPEN_PINCH_KEEP = 0.04;
/** Mean distance of the middle, ring and pinky tips from the wrist (metres): a flat hand is about 0.16, a fist about 0.08. To start... */
export const OPEN_REACH_START = 0.12;
/** ...and to keep. */
export const OPEN_REACH_KEEP = 0.1;
/** The wrist is in front of the head by at least this much (metres, along the gaze)... */
export const FRONT_MIN = 0.12;
/** ...and at most this much. */
export const FRONT_MAX = 0.8;
/** The wrist is below the eyes by at least this much (metres): a hand waving in front of the face is not a dig. */
export const BELOW_EYES_MIN = 0.1;
/** The hand is at most this far below the eyes (metres): the lap of a seated user is the lowest it goes. */
export const BELOW_EYES_MAX = 0.95;
/** After a pinch of a hand ends (or while it lasts) the hand does not qualify for this long (seconds). */
export const LOCKOUT_SECONDS = 0.4;
/** A hand must be qualified this long before its stroke counts (seconds). */
export const ARM_SECONDS = 0.12;
/** The backward speed of the wrist, smoothed, that counts as a stroke (m/s), in BOTH hands. */
export const STROKE_MIN_SPEED = 0.18;
/** The backward part of the horizontal hand speed must be at least this share of the sideways part (a stroke is not a wave). */
export const STROKE_DIRECTION_RATIO = 1.4;
/** A stroke faster than this is a hand-tracking glitch (m/s): the sample is ignored. */
export const STROKE_MAX_SPEED = 3;
/** Time constant of the smoothing of the hand speed (seconds). */
export const SPEED_FILTER_SECONDS = 0.06;
/** Walking speed gained per metre of coordinated stroke ((m/s) per m). A 25 cm stroke adds about 0.5 m/s. */
export const STROKE_GAIN = 2;
/** The walking speed never goes above this, perceived metres per second (rule: slow, comfortable, about a walking pace). */
export const MAX_WALK_SPEED = 1;
/** The speed decays with this time constant while the hands keep the pose but do not stroke (seconds). */
export const DECAY_SECONDS = 0.7;
/** The speed decays faster, with this time constant, when a hand leaves the pose (seconds). */
export const BRAKE_SECONDS = 0.3;
/** Speeds below this are zero (m/s). */
export const STOP_SPEED = 0.03;
/** A frame longer than this (seconds) is cut to it: a hitch must not turn into a leap. */
export const MAX_DT = 0.1;

const COS_START = Math.cos((PALM_DOWN_START_DEG * Math.PI) / 180);
const COS_KEEP = Math.cos((PALM_DOWN_KEEP_DEG * Math.PI) / 180);

// --- Input ----------------------------------------------------------------------------------------------------------------------

/** What the system reads from one hand each frame (joint positions in world metres). Filled in place by the caller. */
export interface DigHandSample {
  /** The joints were read this frame and the palm normal is coherent. */
  tracked: boolean;
  /** The pinch state of the hand (WebXR `selectstart` .. `selectend`). */
  pinching: boolean;
  wrist: Vec3Like;
  /** Unit vector out of the palm. */
  palmNormal: Vec3Like;
  thumbTip: Vec3Like;
  indexTip: Vec3Like;
  middleTip: Vec3Like;
  ringTip: Vec3Like;
  pinkyTip: Vec3Like;
}

export function createDigHandSample(): DigHandSample {
  const v = (): Vec3Like => ({ x: 0, y: 0, z: 0 });
  return { tracked: false, pinching: false, wrist: v(), palmNormal: { x: 0, y: -1, z: 0 }, thumbTip: v(), indexTip: v(), middleTip: v(), ringTip: v(), pinkyTip: v() };
}

/** The head each frame: position and the unit vector of the gaze projected on the floor. */
export interface DigHead {
  x: number;
  y: number;
  z: number;
  fx: number;
  fz: number;
}

// --- State ----------------------------------------------------------------------------------------------------------------------

/** Why a hand is not part of the dig right now (for logs and tests). `ok` means it qualifies. */
export type DigReject = 'ok' | 'untracked' | 'pinch' | 'lockout' | 'palm' | 'open' | 'reach' | 'zone';

export interface DigHandState {
  /** The hand qualifies (open, palm down, in the zone), with hysteresis. */
  qualified: boolean;
  reason: DigReject;
  /** Seconds the hand has been qualified (0 when it is not). */
  qualifiedFor: number;
  /** Seconds left of the lockout after a pinch. */
  lockout: number;
  hasPrev: boolean;
  prevX: number;
  prevZ: number;
  /** Smoothed speed of the wrist towards the body (m/s, positive = back towards the body) and the smoothed sideways speed (m/s, absolute). */
  back: number;
  side: number;
  /** The hand makes a stroke right now (armed, qualified, fast and mostly backwards). */
  stroking: boolean;
}

export interface DigState {
  readonly left: DigHandState;
  readonly right: DigHandState;
  /** Walking speed, metres per second (perceived), 0 to MAX_WALK_SPEED. */
  speed: number;
  /** Metres of coordinated stroke added to the speed in the last update (for tests and logs). */
  lastStroke: number;
}

function createHandState(): DigHandState {
  return { qualified: false, reason: 'untracked', qualifiedFor: 0, lockout: 0, hasPrev: false, prevX: 0, prevZ: 0, back: 0, side: 0, stroking: false };
}

export function createDig(): DigState {
  return { left: createHandState(), right: createHandState(), speed: 0, lastStroke: 0 };
}

export function resetHandState(h: DigHandState): void {
  h.qualified = false;
  h.reason = 'untracked';
  h.qualifiedFor = 0;
  h.lockout = 0;
  h.hasPrev = false;
  h.back = 0;
  h.side = 0;
  h.stroking = false;
}

/** Stops everything (a session ends, the walk is left, the app is suspended). */
export function resetDig(state: DigState): void {
  resetHandState(state.left);
  resetHandState(state.right);
  state.speed = 0;
  state.lastStroke = 0;
}

function dist(a: Vec3Like, b: Vec3Like): number {
  return Math.hypot(a.x - b.x, a.y - b.y, a.z - b.z);
}

/** Mean distance of the middle, ring and pinky tips from the wrist: how far the fingers reach (small for a fist). */
export function fingerReach(h: Readonly<DigHandSample>): number {
  return (dist(h.middleTip, h.wrist) + dist(h.ringTip, h.wrist) + dist(h.pinkyTip, h.wrist)) / 3;
}

/**
 * Judges one hand for this frame: writes `qualified` and `reason` of `h` and returns whether the hand qualifies. Uses the
 * strict thresholds to start and the relaxed ones to stay (hysteresis). A pinch starts the lockout.
 */
export function judgeHand(h: DigHandState, s: Readonly<DigHandSample>, head: Readonly<DigHead>, dt: number): boolean {
  if (s.pinching) h.lockout = LOCKOUT_SECONDS;
  else if (h.lockout > 0) h.lockout = Math.max(0, h.lockout - dt);

  const was = h.qualified;
  let reason: DigReject = 'ok';
  if (!s.tracked) reason = 'untracked';
  else if (s.pinching) reason = 'pinch';
  else if (h.lockout > 0) reason = 'lockout';
  else {
    const cosDown = -s.palmNormal.y; // 1 = palm straight down
    if (!(cosDown >= (was ? COS_KEEP : COS_START))) reason = 'palm';
    else if (!(dist(s.thumbTip, s.indexTip) >= (was ? OPEN_PINCH_KEEP : OPEN_PINCH_START))) reason = 'open';
    else if (!(fingerReach(s) >= (was ? OPEN_REACH_KEEP : OPEN_REACH_START))) reason = 'reach';
    else {
      const rx = s.wrist.x - head.x;
      const rz = s.wrist.z - head.z;
      const front = rx * head.fx + rz * head.fz;
      const below = head.y - s.wrist.y;
      if (!(front >= FRONT_MIN && front <= FRONT_MAX && below >= BELOW_EYES_MIN && below <= BELOW_EYES_MAX)) reason = 'zone';
    }
  }
  h.reason = reason;
  h.qualified = reason === 'ok';
  if (h.qualified) h.qualifiedFor = was ? h.qualifiedFor + dt : 0;
  else {
    h.qualifiedFor = 0;
    h.hasPrev = false;
    h.back = 0;
    h.side = 0;
    h.stroking = false;
  }
  return h.qualified;
}

/**
 * Measures the stroke of a qualified hand: the speed of the wrist towards the body (along -forward) and sideways, smoothed.
 * Sets `stroking`. Returns the backward speed that counts (0 when the hand does not stroke).
 */
function measureStroke(h: DigHandState, s: Readonly<DigHandSample>, head: Readonly<DigHead>, dt: number): number {
  const x = s.wrist.x;
  const z = s.wrist.z;
  if (!h.hasPrev) {
    h.hasPrev = true;
    h.prevX = x;
    h.prevZ = z;
    h.back = 0;
    h.side = 0;
    h.stroking = false;
    return 0;
  }
  const vx = (x - h.prevX) / dt;
  const vz = (z - h.prevZ) / dt;
  h.prevX = x;
  h.prevZ = z;
  const raw = Math.hypot(vx, vz);
  if (!Number.isFinite(raw) || raw > STROKE_MAX_SPEED) {
    h.stroking = false;
    return 0; // a glitch of the tracking: keep the smoothed values, count nothing
  }
  const back = -(vx * head.fx + vz * head.fz);
  // The right-hand side of the gaze is (-fz, fx) seen from above with z towards the user; only its size matters.
  const side = Math.abs(vx * -head.fz + vz * head.fx);
  const k = Math.min(1, dt / SPEED_FILTER_SECONDS);
  h.back += (back - h.back) * k;
  h.side += (side - h.side) * k;
  h.stroking = h.qualifiedFor >= ARM_SECONDS && h.back >= STROKE_MIN_SPEED && h.back >= STROKE_DIRECTION_RATIO * h.side;
  return h.stroking ? h.back : 0;
}

/**
 * One frame. Judges both hands, adds the stroke (when BOTH hands stroke, the slower one counts) to the speed and lets the speed
 * decay. Returns the new speed. `dt` is in seconds; a non-positive or non-finite one changes nothing.
 */
export function updateDig(
  state: DigState,
  left: Readonly<DigHandSample>,
  right: Readonly<DigHandSample>,
  head: Readonly<DigHead>,
  dt: number,
): number {
  if (!(dt > 0) || !Number.isFinite(dt) || !Number.isFinite(head.fx + head.fz + head.x + head.y + head.z)) return state.speed;
  const step = Math.min(dt, MAX_DT);
  const l = judgeHand(state.left, left, head, step);
  const r = judgeHand(state.right, right, head, step);
  let leftBack = 0;
  let rightBack = 0;
  if (l) leftBack = measureStroke(state.left, left, head, step);
  if (r) rightBack = measureStroke(state.right, right, head, step);

  const drive = leftBack > 0 && rightBack > 0 ? Math.min(leftBack, rightBack) : 0;
  state.lastStroke = drive * step;
  if (drive > 0) {
    state.speed = Math.min(MAX_WALK_SPEED, state.speed + STROKE_GAIN * state.lastStroke);
  } else {
    const tau = l && r ? DECAY_SECONDS : BRAKE_SECONDS;
    state.speed *= Math.exp(-step / tau);
    if (state.speed < STOP_SPEED) state.speed = 0;
  }
  return state.speed;
}

/** Normalises the horizontal part of a gaze vector into `out`; returns false (and leaves `out`) when it looks straight up or down. */
export function horizontalForward(x: number, z: number, out: { fx: number; fz: number }): boolean {
  const length = Math.hypot(x, z);
  if (!(length > 0.2) || !Number.isFinite(length)) return false;
  out.fx = x / length;
  out.fz = z / length;
  return true;
}
