import { describe, expect, it } from 'vitest';
import {
  LOST_GRACE_SECONDS,
  POINT_DWELL_SECONDS,
  RELEASE_SECONDS,
  TOLERANCE_MAX_HOUSE,
  TOLERANCE_MIN_HOUSE,
  cancelPointDwell,
  createPointDwell,
  dwellProgress,
  dwellTolerance,
  stepPointDwell,
  type DwellEvent,
  type DwellInput,
} from '../../src/logic/point-dwell';

const on = (x = 1, y = 0, z = 1, tolerance = 0.6): DwellInput => ({ ready: true, hit: true, x, y, z, tolerance });
const NO_HIT: DwellInput = { ready: true, hit: false, x: 0, y: 0, z: 0, tolerance: 0.6 };
const NO_POSE: DwellInput = { ready: false, hit: true, x: 1, y: 0, z: 1, tolerance: 0.6 };

/** Runs `seconds` at 60 steps a second and returns the events other than `none`. */
function run(d: ReturnType<typeof createPointDwell>, input: DwellInput, seconds: number): DwellEvent[] {
  const events: DwellEvent[] = [];
  const steps = Math.round(seconds * 60);
  for (let i = 0; i < steps; i += 1) {
    const e = stepPointDwell(d, input, 1 / 60);
    if (e !== 'none') events.push(e);
  }
  return events;
}

describe('dwellTolerance', () => {
  it('is 3 cm of the model on the table, and never below 10 cm of the house', () => {
    expect(dwellTolerance(0.05)).toBeCloseTo(0.6, 9);
    expect(dwellTolerance(0.1)).toBeCloseTo(0.3, 9);
    expect(dwellTolerance(1)).toBe(TOLERANCE_MIN_HOUSE);
    expect(dwellTolerance(0.001)).toBe(TOLERANCE_MAX_HOUSE);
    expect(dwellTolerance(Number.NaN)).toBe(TOLERANCE_MIN_HOUSE);
    expect(dwellTolerance(0)).toBe(TOLERANCE_MIN_HOUSE);
  });
});

describe('the dwell', () => {
  it('starts on the first usable sample and fires after one second on the spot', () => {
    const d = createPointDwell();
    expect(stepPointDwell(d, on(), 1 / 60)).toBe('start');
    expect(d.phase).toBe('dwelling');
    const events = run(d, on(), POINT_DWELL_SECONDS + 0.1);
    expect(events).toEqual(['fire']);
    expect(d.phase).toBe('fired');
    expect(dwellProgress(d)).toBe(1);
  });

  it('does not fire before one second', () => {
    const d = createPointDwell();
    stepPointDwell(d, on(), 1 / 60);
    expect(run(d, on(), 0.9)).toEqual([]);
    expect(dwellProgress(d)).toBeGreaterThan(0.85);
    expect(dwellProgress(d)).toBeLessThan(1);
  });

  it('progress goes from 0 to 1', () => {
    const d = createPointDwell();
    expect(dwellProgress(d)).toBe(0);
    stepPointDwell(d, on(), 1 / 60);
    run(d, on(), 0.5);
    expect(dwellProgress(d)).toBeCloseTo(0.5, 1);
  });

  it('tolerates a small tremor on the spot', () => {
    const d = createPointDwell();
    stepPointDwell(d, on(1, 0, 1), 1 / 60);
    const events: DwellEvent[] = [];
    for (let i = 0; i < 70; i += 1) {
      const wobble = (i % 2 === 0 ? 1 : -1) * 0.2;
      const e = stepPointDwell(d, on(1 + wobble, 0, 1 - wobble), 1 / 60);
      if (e !== 'none') events.push(e);
    }
    expect(events).toEqual(['fire']);
  });

  it('a spot beyond the tolerance starts the dwell again from there (drift), so it does not fire early', () => {
    const d = createPointDwell();
    stepPointDwell(d, on(1, 0, 1), 1 / 60);
    run(d, on(1, 0, 1), 0.7);
    expect(stepPointDwell(d, on(2.5, 0, 1), 1 / 60)).toBe('drift');
    expect(d.elapsed).toBe(0);
    expect(d.ax).toBe(2.5);
    expect(run(d, on(2.5, 0, 1), 0.7)).toEqual([]);
    expect(run(d, on(2.5, 0, 1), 0.4)).toEqual(['fire']);
  });

  it('a short loss of the pose or of the hit only stops the clock', () => {
    const d = createPointDwell();
    stepPointDwell(d, on(), 1 / 60);
    run(d, on(), 0.5);
    const before = d.elapsed;
    expect(run(d, NO_POSE, LOST_GRACE_SECONDS * 0.5)).toEqual([]);
    expect(run(d, NO_HIT, LOST_GRACE_SECONDS * 0.4)).toEqual([]);
    expect(d.elapsed).toBe(before);
    run(d, on(), 0.1);
    expect(d.elapsed).toBeGreaterThan(before);
  });

  it('a pose that is gone for good cancels, a hit that is gone for good is lost', () => {
    const a = createPointDwell();
    stepPointDwell(a, on(), 1 / 60);
    expect(run(a, NO_POSE, LOST_GRACE_SECONDS + 0.1)).toEqual(['cancel']);
    expect(a.phase).toBe('idle');
    const b = createPointDwell();
    stepPointDwell(b, on(), 1 / 60);
    expect(run(b, NO_HIT, LOST_GRACE_SECONDS + 0.1)).toEqual(['lost']);
    expect(b.phase).toBe('idle');
  });

  it('does not start without a pose or a hit, nor on a broken point', () => {
    const d = createPointDwell();
    expect(run(d, NO_POSE, 0.5)).toEqual([]);
    expect(run(d, NO_HIT, 0.5)).toEqual([]);
    expect(run(d, { ...on(), x: Number.NaN }, 0.5)).toEqual([]);
    expect(d.phase).toBe('idle');
  });

  it('after it fired it waits for the pose to go away before it can start again', () => {
    const d = createPointDwell();
    stepPointDwell(d, on(), 1 / 60);
    run(d, on(), 1.1);
    expect(d.phase).toBe('fired');
    // Still pointing: no new dwell, no second fire.
    expect(run(d, on(), 2)).toEqual([]);
    expect(d.phase).toBe('fired');
    // A blink is not enough, a real release is.
    run(d, NO_POSE, RELEASE_SECONDS * 0.5);
    expect(d.phase).toBe('fired');
    run(d, on(), 0.05);
    run(d, NO_POSE, RELEASE_SECONDS + 0.1);
    expect(d.phase).toBe('idle');
    expect(stepPointDwell(d, on(), 1 / 60)).toBe('start');
  });

  it('can be cancelled from outside (a pinch, a held piece)', () => {
    const d = createPointDwell();
    expect(cancelPointDwell(d)).toBe('none');
    stepPointDwell(d, on(), 1 / 60);
    expect(cancelPointDwell(d)).toBe('cancel');
    expect(d.phase).toBe('idle');
    expect(dwellProgress(d)).toBe(0);
  });

  it('ignores a bad dt', () => {
    const d = createPointDwell();
    stepPointDwell(d, on(), 1 / 60);
    stepPointDwell(d, on(), Number.NaN);
    stepPointDwell(d, on(), -3);
    expect(d.elapsed).toBe(0);
  });
});
