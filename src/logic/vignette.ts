// Strength of the comfort vignette of the walk (plan docs/plans/WALK.md). Pure logic: no imports from @iwsdk/core or three.
//
// The target follows the walking speed: nothing below VIGNETTE_MIN_SPEED, then smoothly up to VIGNETTE_MAX at the top speed. The
// shown value follows the target quickly when it rises (the edges close before the eyes notice the motion) and slowly when it
// falls (they open gently after the stop), so a stroke that ends does not make the view flicker.

import { MAX_WALK_SPEED } from './row-gesture';

/** Speed (m/s) under which there is no vignette. */
export const VIGNETTE_MIN_SPEED = 0.05;
/** The strongest vignette (the strength at the top speed), 0..1. */
export const VIGNETTE_MAX = 0.85;
/** Time constants (seconds) of the rise and of the fall. */
export const VIGNETTE_RISE_SECONDS = 0.12;
export const VIGNETTE_FALL_SECONDS = 0.45;

/** The strength a speed asks for, 0..VIGNETTE_MAX: a smoothstep between VIGNETTE_MIN_SPEED and the top speed. A bad speed asks for 0. */
export function vignetteTarget(speed: number): number {
  if (!Number.isFinite(speed) || speed <= VIGNETTE_MIN_SPEED) return 0;
  const t = Math.min(1, (speed - VIGNETTE_MIN_SPEED) / (MAX_WALK_SPEED - VIGNETTE_MIN_SPEED));
  return VIGNETTE_MAX * t * t * (3 - 2 * t);
}

/** Moves `current` towards `target` for a frame of `dt` seconds (exponential, fast up, slow down). Returns the new strength; 0 when it is nearly 0. */
export function vignetteStep(current: number, target: number, dt: number): number {
  if (!(dt > 0) || !Number.isFinite(dt)) return current;
  const tau = target > current ? VIGNETTE_RISE_SECONDS : VIGNETTE_FALL_SECONDS;
  const next = current + (target - current) * (1 - Math.exp(-dt / tau));
  return next < 0.004 && target === 0 ? 0 : next;
}
