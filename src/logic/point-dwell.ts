// The dwell timer of the pointing gesture: the finger has to stay on (about) one spot for POINT_DWELL_SECONDS. Pure: no imports from
// @iwsdk/core or three.
//
// Each frame the caller says whether a hand is READY (pose held, see point-gesture.ts) and whether its ray meets a surface that can hold an
// issue, and where (house coordinates). The first such sample is the ANCHOR of the dwell; the dwell goes on while the spot stays within
// `tolerance` of the anchor. A spot beyond the tolerance starts the dwell again from the new spot (`drift`); a pose or a hit that is gone
// for longer than LOST_GRACE_SECONDS cancels it (`lost`); a short gap (tracking blink) only stops the clock. After it fires the machine
// waits for the pose to be gone for RELEASE_SECONDS (hysteresis) before it can start another.

/** How long the finger rests on one spot before the form opens (seconds). */
export const POINT_DWELL_SECONDS = 1;
/** A pose or hit that is missing for up to this long only stops the clock (seconds). */
export const LOST_GRACE_SECONDS = 0.2;
/** After it fired, the pose has to be gone this long before a new dwell can start (seconds). */
export const RELEASE_SECONDS = 0.4;
/** The tolerance on the table (a miniature at scale 0.05): this much of WORLD metres, 3 cm of the model. */
export const TOLERANCE_WORLD = 0.03;
/** The tolerance never goes below this in the house (metres): at real scale 3 cm of tremor at arm's length is too tight. */
export const TOLERANCE_MIN_HOUSE = 0.1;
/** ...and never above this (metres): the model at its smallest scale must not accept a whole room as one spot. */
export const TOLERANCE_MAX_HOUSE = 0.6;

/** The tolerance in HOUSE metres for a miniature `scale`: 3 cm of the model on the table (0.6 m at 1:20), at least 10 cm at real size. */
export function dwellTolerance(scale: number): number {
  if (!Number.isFinite(scale) || !(scale > 0)) return TOLERANCE_MIN_HOUSE;
  return Math.min(TOLERANCE_MAX_HOUSE, Math.max(TOLERANCE_MIN_HOUSE, TOLERANCE_WORLD / scale));
}

export type DwellPhase = 'idle' | 'dwelling' | 'fired';

export interface PointDwell {
  phase: DwellPhase;
  /** Seconds the dwell has run on the current spot. */
  elapsed: number;
  /** The spot the dwell started on (house coordinates). */
  ax: number;
  ay: number;
  az: number;
  /** Seconds the pose or the hit has been missing (dwelling), or the pose has been gone (fired). */
  gone: number;
}

export function createPointDwell(): PointDwell {
  return { phase: 'idle', elapsed: 0, ax: 0, ay: 0, az: 0, gone: 0 };
}

export function resetPointDwell(d: PointDwell): void {
  d.phase = 'idle';
  d.elapsed = 0;
  d.gone = 0;
}

/** What one step did. `start` and `drift` begin a dwell (on a new spot); `lost` and `cancel` end one; `fire` is the moment it is done. */
export type DwellEvent = 'none' | 'start' | 'drift' | 'lost' | 'cancel' | 'fire';

export interface DwellInput {
  /** A hand is ready (the pose held long enough) and no rule shuts the gesture out. */
  ready: boolean;
  /** The ray meets a surface that can hold an issue. */
  hit: boolean;
  x: number;
  y: number;
  z: number;
  /** In house metres, `dwellTolerance(scale)`. */
  tolerance: number;
}

/** Progress of the dwell in [0, 1]. */
export function dwellProgress(d: Readonly<PointDwell>): number {
  return d.phase === 'dwelling' ? Math.min(1, Math.max(0, d.elapsed / POINT_DWELL_SECONDS)) : d.phase === 'fired' ? 1 : 0;
}

function begin(d: PointDwell, input: Readonly<DwellInput>): void {
  d.phase = 'dwelling';
  d.elapsed = 0;
  d.gone = 0;
  d.ax = input.x;
  d.ay = input.y;
  d.az = input.z;
}

/** Advances the dwell by `dt` seconds and says what happened. `cancel` is a dwell stopped from outside (a rule shut the gesture out). */
export function stepPointDwell(d: PointDwell, input: Readonly<DwellInput>, dt: number): DwellEvent {
  const step = Number.isFinite(dt) && dt > 0 ? dt : 0;
  const usable = input.ready && input.hit && Number.isFinite(input.x + input.y + input.z);
  switch (d.phase) {
    case 'idle':
      if (!usable) return 'none';
      begin(d, input);
      return 'start';
    case 'fired':
      // The form is open (or was): nothing starts again until the finger has been taken away for a moment.
      if (input.ready) {
        d.gone = 0;
        return 'none';
      }
      d.gone += step;
      if (d.gone >= RELEASE_SECONDS) resetPointDwell(d);
      return 'none';
    default: {
      if (!input.ready) {
        // The pose is gone: a short blink only stops the clock; a real end cancels.
        d.gone += step;
        if (d.gone > LOST_GRACE_SECONDS) {
          resetPointDwell(d);
          return 'cancel';
        }
        return 'none';
      }
      if (!usable) {
        d.gone += step;
        if (d.gone > LOST_GRACE_SECONDS) {
          resetPointDwell(d);
          return 'lost';
        }
        return 'none';
      }
      d.gone = 0;
      if (Math.hypot(input.x - d.ax, input.y - d.ay, input.z - d.az) > input.tolerance) {
        begin(d, input);
        return 'drift';
      }
      d.elapsed += step;
      if (d.elapsed >= POINT_DWELL_SECONDS) {
        d.phase = 'fired';
        d.gone = 0;
        return 'fire';
      }
      return 'none';
    }
  }
}

/** Stops a running dwell from outside (a pinch, a held piece, a panel...): `cancel` if there was one, else `none`. A `fired` machine stays so. */
export function cancelPointDwell(d: PointDwell): DwellEvent {
  if (d.phase !== 'dwelling') return 'none';
  resetPointDwell(d);
  return 'cancel';
}
