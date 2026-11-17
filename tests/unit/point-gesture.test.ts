// The pointing pose, told apart from an open hand, a relaxed hand, a fist and a pinch, with synthetic joints (wrist at the origin, fingers along -z).
import { describe, expect, it } from 'vitest';
import {
  CURL_REACH_KEEP,
  CURL_REACH_START,
  INDEX_REACH_KEEP,
  INDEX_REACH_START,
  POINT_ARM_SECONDS,
  POINT_LOCKOUT_SECONDS,
  classifyPoint,
  createPointHandSample,
  createPointState,
  curlReach,
  indexReach,
  resetPointState,
  updatePoint,
  type PointHandSample,
} from '../../src/logic/point-gesture';

interface Shape {
  index: number;
  others: number;
  pinching?: boolean;
  tracked?: boolean;
}
/** A hand with its wrist at the origin: the index along -z (knuckle at 0.6 of its reach), the other three tips `others` from the wrist. */
function hand(shape: Shape, at = { x: 0, y: 0, z: 0 }): PointHandSample {
  const s = createPointHandSample();
  s.tracked = shape.tracked ?? true;
  s.pinching = shape.pinching ?? false;
  const put = (v: { x: number; y: number; z: number }, dx: number, dz: number, dy = 0): void => {
    v.x = at.x + dx;
    v.y = at.y + dy;
    v.z = at.z - dz;
  };
  put(s.wrist, 0, 0);
  put(s.indexKnuckle, 0, shape.index * 0.6);
  put(s.indexTip, 0, shape.index);
  put(s.middleTip, 0.01, shape.others);
  put(s.ringTip, 0.02, shape.others * 0.97);
  put(s.pinkyTip, 0.03, shape.others * 0.93);
  return s;
}

const POINT = { index: 0.17, others: 0.08 };
const OPEN = { index: 0.18, others: 0.18 };
const RELAXED = { index: 0.15, others: 0.15 };
const FIST = { index: 0.085, others: 0.085 };
const PINCH_LOOSE = { index: 0.13, others: 0.14 };

describe('classifyPoint', () => {
  it('accepts the index out with the other three curled', () => {
    expect(classifyPoint(hand(POINT), false)).toBe('ok');
  });

  it('rejects the other poses with a reason', () => {
    expect(classifyPoint(hand(OPEN), false)).toBe('curl');
    expect(classifyPoint(hand(RELAXED), false)).toBe('curl');
    expect(classifyPoint(hand(FIST), false)).toBe('index');
    expect(classifyPoint(hand(PINCH_LOOSE), false)).not.toBe('ok'); // a loose pinch: the index is short of 0.14 and the others are not curled
  });

  it('a pinch shuts the hand out whatever its shape', () => {
    expect(classifyPoint(hand({ ...POINT, pinching: true }), false)).toBe('pinch');
  });

  it('an untracked or broken hand never qualifies', () => {
    expect(classifyPoint(hand({ ...POINT, tracked: false }), false)).toBe('untracked');
    const broken = hand(POINT);
    broken.indexTip.x = Number.NaN;
    expect(classifyPoint(broken, false)).toBe('untracked');
  });

  it('has hysteresis on both limits', () => {
    const between = (a: number, b: number): number => (a + b) / 2;
    const indexMid = between(INDEX_REACH_KEEP, INDEX_REACH_START);
    const curlMid = between(CURL_REACH_START, CURL_REACH_KEEP);
    expect(classifyPoint(hand({ index: indexMid, others: 0.08 }), false)).toBe('index');
    expect(classifyPoint(hand({ index: indexMid, others: 0.08 }), true)).toBe('ok');
    expect(classifyPoint(hand({ index: 0.17, others: curlMid }), false)).toBe('curl');
    expect(classifyPoint(hand({ index: 0.17, others: curlMid }), true)).toBe('ok');
  });

  it('measures the reaches from the wrist', () => {
    const h = hand(POINT);
    expect(indexReach(h)).toBeCloseTo(0.17, 6);
    expect(curlReach(h)).toBeLessThan(0.1);
  });
});

describe('updatePoint', () => {
  it('is ready only after the arming time', () => {
    const state = createPointState();
    const h = hand(POINT);
    expect(updatePoint(state, h, 0.05)).toBe(false);
    expect(state.qualified).toBe(true);
    expect(updatePoint(state, h, 0.05)).toBe(false);
    expect(updatePoint(state, h, POINT_ARM_SECONDS)).toBe(true);
  });

  it('gives the fingertip as origin and the finger line as direction', () => {
    const state = createPointState();
    updatePoint(state, hand(POINT, { x: 0.1, y: 1.2, z: -0.4 }), 0.2);
    expect(state.ox).toBeCloseTo(0.1, 6);
    expect(state.oy).toBeCloseTo(1.2, 6);
    expect(state.oz).toBeCloseTo(-0.57, 6);
    expect(state.dz).toBeCloseTo(-1, 6);
    expect(Math.hypot(state.dx, state.dy, state.dz)).toBeCloseTo(1, 6);
  });

  it('filters the direction: a tremor moves it a little, a turn gets there', () => {
    const state = createPointState();
    updatePoint(state, hand(POINT), 0.2);
    const turned = hand(POINT);
    turned.indexTip.x = 0.05; // the tip swings sideways
    updatePoint(state, turned, 0.01);
    const small = state.dx;
    expect(small).toBeGreaterThan(0);
    for (let i = 0; i < 40; i += 1) updatePoint(state, turned, 0.05);
    expect(state.dx).toBeGreaterThan(small);
    expect(state.dx).toBeCloseTo(0.05 / Math.hypot(0.05, 0.068), 3);
  });

  it('a pinch locks the hand out for a while after it ends', () => {
    const state = createPointState();
    updatePoint(state, hand(POINT), 0.2);
    updatePoint(state, hand({ ...POINT, pinching: true }), 0.016);
    expect(state.reason).toBe('pinch');
    updatePoint(state, hand(POINT), 0.1);
    expect(state.reason).toBe('lockout');
    let t = 0;
    while (t < POINT_LOCKOUT_SECONDS + 0.1) {
      updatePoint(state, hand(POINT), 0.05);
      t += 0.05;
    }
    expect(state.reason).toBe('ok');
    // And it has to be armed again.
    expect(updatePoint(state, hand(POINT), POINT_ARM_SECONDS)).toBe(true);
  });

  it('a pose that breaks resets the arming time', () => {
    const state = createPointState();
    updatePoint(state, hand(POINT), 0.2);
    expect(updatePoint(state, hand(FIST), 0.016)).toBe(false);
    expect(state.qualifiedFor).toBe(0);
    expect(updatePoint(state, hand(POINT), 0.05)).toBe(false);
  });

  it('does not give a direction from a finger that is too short to read', () => {
    const state = createPointState();
    const h = hand(POINT);
    h.indexKnuckle.z = h.indexTip.z + 0.001;
    expect(updatePoint(state, h, 0.3)).toBe(false);
    expect(state.hasDirection).toBe(false);
  });

  it('ignores a bad dt and cuts a long one', () => {
    const state = createPointState();
    updatePoint(state, hand(POINT), Number.NaN);
    updatePoint(state, hand(POINT), -1);
    expect(state.qualifiedFor).toBe(0);
    updatePoint(state, hand(POINT), 5);
    expect(state.qualifiedFor).toBeCloseTo(0.1, 6);
    resetPointState(state);
    expect(state.qualified).toBe(false);
  });
});
