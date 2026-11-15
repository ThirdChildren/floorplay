import { describe, expect, it } from 'vitest';
import {
  ARM_SECONDS,
  BRAKE_SECONDS,
  LOCKOUT_SECONDS,
  MAX_WALK_SPEED,
  STOP_SPEED,
  STROKE_GAIN,
  createDig,
  createDigHandSample,
  fingerReach,
  horizontalForward,
  resetDig,
  updateDig,
  type DigHandSample,
  type DigHead,
  type DigState,
} from '../../src/logic/dig-gesture';

// A synthetic flat hand for the right/left side. The head looks along -z at (0, 1.2, 0); hands are 0.6 m ahead, 0.35 m below.
const HEAD: DigHead = { x: 0, y: 1.2, z: 0, fx: 0, fz: -1 };
const DT = 1 / 72;

interface Pose {
  x: number;
  z: number;
  y?: number;
  palmDown?: boolean;
  open?: boolean;
  fist?: boolean;
  pinching?: boolean;
  tracked?: boolean;
}

/** Fills `s` as a flat hand at (x, y, z): palm normal down, fingers 0.17 m long, thumb well apart from the index. */
function pose(s: DigHandSample, p: Pose): DigHandSample {
  const y = p.y ?? 0.85;
  s.tracked = p.tracked ?? true;
  s.pinching = p.pinching ?? false;
  s.wrist.x = p.x;
  s.wrist.y = y;
  s.wrist.z = p.z;
  const down = p.palmDown ?? true;
  s.palmNormal.x = 0;
  s.palmNormal.y = down ? -1 : 1;
  s.palmNormal.z = 0;
  const reach = p.fist ? 0.08 : 0.17;
  const gap = p.open === false ? 0.01 : 0.08;
  s.middleTip.x = p.x;
  s.middleTip.y = y;
  s.middleTip.z = p.z - reach;
  s.ringTip.x = p.x + 0.01;
  s.ringTip.y = y;
  s.ringTip.z = p.z - reach;
  s.pinkyTip.x = p.x + 0.02;
  s.pinkyTip.y = y;
  s.pinkyTip.z = p.z - reach;
  s.indexTip.x = p.x - 0.02;
  s.indexTip.y = y;
  s.indexTip.z = p.z - reach;
  s.thumbTip.x = p.x - 0.02 - gap;
  s.thumbTip.y = y;
  s.thumbTip.z = p.z - reach + 0.01;
  return s;
}

interface Rig {
  dig: DigState;
  left: DigHandSample;
  right: DigHandSample;
  t: number;
}

const rig = (): Rig => ({ dig: createDig(), left: createDigHandSample(), right: createDigHandSample(), t: 0 });

/** Runs `seconds` of frames; `at(t)` gives the pose of each hand at time t of this run. */
function run(r: Rig, seconds: number, at: (t: number) => { l: Pose; r: Pose }, head: DigHead = HEAD): number {
  const frames = Math.round(seconds / DT);
  let peak = 0;
  for (let i = 0; i < frames; i += 1) {
    r.t += DT;
    const p = at(r.t);
    pose(r.left, p.l);
    pose(r.right, p.r);
    const speed = updateDig(r.dig, r.left, r.right, head, DT);
    if (speed > peak) peak = speed;
  }
  return peak;
}

const Z0 = -0.6;
/** Both hands hold still, flat. */
const still = (): { l: Pose; r: Pose } => ({ l: { x: -0.15, z: Z0 }, r: { x: 0.15, z: Z0 } });
/** A dig: the wrists sweep back (towards +z, towards the body) at `v` m/s for `dur` seconds from `t0`, then come forward again. */
function dig(t0: number, dur: number, v: number, extra: Partial<Pose> = {}): (t: number) => { l: Pose; r: Pose } {
  return (t) => {
    const k = Math.min(Math.max(t - t0, 0), dur);
    const back = k * v;
    // After the stroke the hands go forward again slowly (0.1 m/s): no extra drive.
    const forward = t > t0 + dur ? (t - t0 - dur) * 0.1 : 0;
    const z = Z0 + back - forward;
    return { l: { x: -0.15, z, ...extra }, r: { x: 0.15, z, ...extra } };
  };
}

describe('dig gesture: strokes move, everything else does not', () => {
  it('a coordinated backward stroke of both open, palm-down hands adds speed', () => {
    const r = rig();
    run(r, 0.3, still); // arm
    const peak = run(r, 0.5, dig(r.t, 0.4, 0.6));
    expect(peak).toBeGreaterThan(0.3);
    expect(peak).toBeLessThanOrEqual(MAX_WALK_SPEED);
  });

  it('the speed is about GAIN times the stroke length (a 0.24 m stroke is about 0.48 m/s)', () => {
    const r = rig();
    run(r, 0.3, still);
    const peak = run(r, 0.5, dig(r.t, 0.4, 0.6));
    expect(peak).toBeGreaterThan(0.25 * STROKE_GAIN * 0.5);
    expect(peak).toBeLessThan(0.24 * STROKE_GAIN * 1.05);
  });

  it('repeated strokes build up speed but never pass the maximum', () => {
    const r = rig();
    run(r, 0.3, still);
    let peak = 0;
    for (let i = 0; i < 6; i += 1) {
      peak = Math.max(peak, run(r, 0.5, dig(r.t, 0.35, 0.8)));
    }
    expect(peak).toBe(MAX_WALK_SPEED);
  });

  it('the speed decays smoothly to zero when the hands stop, and never goes up while they only hold the pose', () => {
    const r = rig();
    run(r, 0.3, still);
    run(r, 0.45, dig(r.t, 0.4, 0.8));
    expect(r.dig.speed).toBeGreaterThan(0.3);
    // The smoothing of the hand speed (60 ms) lets the last frames of the stroke through: settle first.
    run(r, 0.25, () => ({ l: { x: -0.15, z: r.left.wrist.z }, r: { x: 0.15, z: r.right.wrist.z } }));
    let last = r.dig.speed;
    let monotone = true;
    for (let i = 0; i < 400; i += 1) {
      r.t += DT;
      pose(r.left, { x: -0.15, z: r.left.wrist.z });
      pose(r.right, { x: 0.15, z: r.right.wrist.z });
      const s = updateDig(r.dig, r.left, r.right, HEAD, DT);
      if (s > last + 1e-12) monotone = false;
      last = s;
    }
    expect(monotone).toBe(true);
    expect(r.dig.speed).toBe(0);
  });

  it('one hand does nothing: only the right hand strokes', () => {
    const r = rig();
    run(r, 0.3, still);
    const peak = run(r, 1, (t) => ({ l: { x: -0.15, z: Z0 }, r: { x: 0.15, z: Z0 + Math.min(t - 0.3, 0.5) * 0.8 } }));
    expect(peak).toBe(0);
  });

  it('one hand missing (not tracked) does nothing', () => {
    const r = rig();
    run(r, 0.3, still);
    const a = dig(r.t, 0.4, 0.8);
    const peak = run(r, 0.6, (t) => {
      const p = a(t);
      return { l: { ...p.l, tracked: false }, r: p.r };
    });
    expect(peak).toBe(0);
  });

  it('palms up do nothing', () => {
    const r = rig();
    run(r, 0.3, still);
    const peak = run(r, 0.6, dig(r.t, 0.4, 0.8, { palmDown: false }));
    expect(peak).toBe(0);
  });

  it('palms facing each other (sideways) do nothing', () => {
    const r = rig();
    run(r, 0.3, still);
    const a = dig(r.t, 0.4, 0.8);
    const peak = run(r, 0.6, (t) => a(t));
    expect(peak).toBeGreaterThan(0); // control: with the pose of `pose()` it does walk...
    const r2 = rig();
    const sideways = (s: DigHandSample): void => {
      s.palmNormal.x = 1;
      s.palmNormal.y = 0;
    };
    run(r2, 0.3, still);
    const b = dig(r2.t, 0.4, 0.8);
    let peak2 = 0;
    for (let i = 0; i < 40; i += 1) {
      r2.t += DT;
      const p = b(r2.t);
      pose(r2.left, p.l);
      pose(r2.right, p.r);
      sideways(r2.left);
      sideways(r2.right);
      peak2 = Math.max(peak2, updateDig(r2.dig, r2.left, r2.right, HEAD, DT));
    }
    expect(peak2).toBe(0);
  });

  it('pinching hands do nothing, even with the same sweep (the two-hand rotate/zoom gesture)', () => {
    const r = rig();
    run(r, 0.3, still);
    const peak = run(r, 0.7, dig(r.t, 0.5, 0.8, { pinching: true, open: false, palmDown: false }));
    expect(peak).toBe(0);
  });

  it('the two-hand zoom/turn gesture with the palms down and the pinch state on never walks', () => {
    const r = rig();
    run(r, 0.3, still);
    // Both hands pinch (select events) while the joints may still look open: the pinch state alone shuts the hands out.
    const peak = run(r, 1, dig(r.t, 0.8, 0.5, { pinching: true }));
    expect(peak).toBe(0);
    expect(r.dig.left.reason).toBe('pinch');
  });

  it('after a pinch ends the hand stays shut out for LOCKOUT_SECONDS', () => {
    const r = rig();
    run(r, 0.3, still);
    run(r, 0.1, () => ({ l: { x: -0.15, z: Z0, pinching: true }, r: { x: 0.15, z: Z0, pinching: true } }));
    run(r, LOCKOUT_SECONDS - 0.1, still);
    expect(r.dig.left.reason).toBe('lockout');
    run(r, 0.2, still);
    expect(r.dig.left.reason).toBe('ok');
  });

  it('a pinch in the middle of a stroke ends the stroke and freezes the gain', () => {
    const r = rig();
    run(r, 0.3, still);
    const a = dig(r.t, 0.6, 0.6);
    run(r, 0.2, a);
    const before = r.dig.speed;
    expect(before).toBeGreaterThan(0);
    run(r, 0.3, (t) => ({ l: { ...a(t).l, pinching: true }, r: a(t).r }));
    expect(r.dig.speed).toBeLessThanOrEqual(before);
  });

  it('closed fists (a grab) do nothing', () => {
    const r = rig();
    run(r, 0.3, still);
    const peak = run(r, 0.6, dig(r.t, 0.4, 0.8, { fist: true }));
    expect(peak).toBe(0);
  });

  it('a pinch pose (thumb touching the index) does nothing even if the select event is missing', () => {
    const r = rig();
    run(r, 0.3, still);
    const peak = run(r, 0.6, dig(r.t, 0.4, 0.8, { open: false }));
    expect(peak).toBe(0);
  });

  it('a forward push of both hands (away from the body) does nothing', () => {
    const r = rig();
    run(r, 0.3, still);
    const peak = run(r, 0.5, (t) => {
      const z = Z0 - Math.min(t - 0.3, 0.4) * 0.8;
      return { l: { x: -0.15, z }, r: { x: 0.15, z } };
    });
    expect(peak).toBe(0);
  });

  it('a sideways sweep of both hands does nothing', () => {
    const r = rig();
    run(r, 0.3, still);
    const peak = run(r, 0.6, (t) => {
      const dx = Math.min(t - 0.3, 0.4) * 0.8;
      return { l: { x: -0.15 + dx, z: Z0 }, r: { x: 0.15 + dx, z: Z0 } };
    });
    expect(peak).toBe(0);
  });

  it('hands moving in opposite directions (the rotate sweep) do nothing', () => {
    const r = rig();
    run(r, 0.3, still);
    const peak = run(r, 0.6, (t) => {
      const k = Math.min(t - 0.3, 0.4) * 0.8;
      return { l: { x: -0.15, z: Z0 + k }, r: { x: 0.15, z: Z0 - k } };
    });
    expect(peak).toBe(0);
  });

  it('a stroke that is too slow does nothing', () => {
    const r = rig();
    run(r, 0.3, still);
    const peak = run(r, 1.5, dig(r.t, 1.4, 0.1));
    expect(peak).toBe(0);
  });

  it('hands raised in front of the face (above the zone) do nothing', () => {
    const r = rig();
    run(r, 0.3, still);
    const peak = run(r, 0.6, dig(r.t, 0.4, 0.8, { y: 1.15 }));
    expect(peak).toBe(0);
  });

  it('hands beside or behind the head (outside the front zone) do nothing', () => {
    const r = rig();
    run(r, 0.1, still);
    const peak = run(r, 0.6, (t) => {
      const z = 0.3 + Math.min(t - 0.1, 0.4) * 0.8; // behind the head
      return { l: { x: -0.15, z }, r: { x: 0.15, z } };
    });
    expect(peak).toBe(0);
  });

  it('a hand that has been in the pose for less than ARM_SECONDS does not count', () => {
    const r = rig();
    // Start moving at once: the first ARM_SECONDS of the pose never count.
    const peak = run(r, ARM_SECONDS * 0.9, dig(0, 0.4, 0.8));
    expect(peak).toBe(0);
  });

  it('a tracking glitch (a hand that jumps 2 m in one frame) adds nothing', () => {
    const r = rig();
    run(r, 0.3, still);
    pose(r.left, { x: -0.15, z: Z0 + 2 });
    pose(r.right, { x: 0.15, z: Z0 + 2 });
    const s = updateDig(r.dig, r.left, r.right, HEAD, DT);
    expect(s).toBe(0);
  });

  it('hysteresis: a palm that drifts between the start and keep angles stays in; one that starts there is not let in', () => {
    const tilt = (s: DigHandSample, deg: number): void => {
      const a = (deg * Math.PI) / 180;
      s.palmNormal.x = Math.sin(a);
      s.palmNormal.y = -Math.cos(a);
    };
    const r = rig();
    run(r, 0.3, still);
    expect(r.dig.left.qualified).toBe(true);
    pose(r.left, { x: -0.15, z: Z0 });
    tilt(r.left, 50); // between 40 (start) and 58 (keep)
    pose(r.right, { x: 0.15, z: Z0 });
    updateDig(r.dig, r.left, r.right, HEAD, DT);
    expect(r.dig.left.qualified).toBe(true);
    tilt(r.left, 65);
    updateDig(r.dig, r.left, r.right, HEAD, DT);
    expect(r.dig.left.qualified).toBe(false);
    tilt(r.left, 50);
    updateDig(r.dig, r.left, r.right, HEAD, DT);
    expect(r.dig.left.qualified).toBe(false); // not let back in at 50
    tilt(r.left, 30);
    updateDig(r.dig, r.left, r.right, HEAD, DT);
    expect(r.dig.left.qualified).toBe(true);
  });

  it('the stroke direction follows the head: looking along +x, a sweep along -x is a dig', () => {
    const head: DigHead = { x: 0, y: 1.2, z: 0, fx: 1, fz: 0 };
    const r = rig();
    const hands = (x: number): { l: Pose; r: Pose } => ({ l: { x, z: -0.15 }, r: { x, z: 0.15 } });
    run(r, 0.3, () => hands(0.4), head);
    const peak = run(r, 0.5, (t) => hands(0.4 - Math.min(t - 0.3, 0.4) * 0.6), head);
    expect(peak).toBeGreaterThan(0.3);
  });

  it('a bad dt or a non-finite head changes nothing', () => {
    const r = rig();
    run(r, 0.3, still);
    run(r, 0.45, dig(r.t, 0.4, 0.8));
    const s = r.dig.speed;
    expect(updateDig(r.dig, r.left, r.right, HEAD, 0)).toBe(s);
    expect(updateDig(r.dig, r.left, r.right, HEAD, -1)).toBe(s);
    expect(updateDig(r.dig, r.left, r.right, HEAD, Number.NaN)).toBe(s);
    expect(updateDig(r.dig, r.left, r.right, { ...HEAD, fx: Number.NaN }, DT)).toBe(s);
  });

  it('a long hitch frame is cut: it cannot add more than a normal frame cap would', () => {
    const r = rig();
    run(r, 0.3, still);
    pose(r.left, { x: -0.15, z: Z0 + 0.05 });
    pose(r.right, { x: 0.15, z: Z0 + 0.05 });
    updateDig(r.dig, r.left, r.right, HEAD, 5);
    expect(r.dig.speed).toBeLessThanOrEqual(MAX_WALK_SPEED);
  });

  it('a hand that leaves the pose brakes faster than hands that hold it', () => {
    const slow = rig();
    run(slow, 0.3, still);
    run(slow, 0.45, dig(slow.t, 0.4, 0.8));
    const start = slow.dig.speed;
    run(slow, BRAKE_SECONDS, (t) => ({ l: { x: -0.15, z: slow.left.wrist.z }, r: { x: 0.15, z: slow.right.wrist.z } }));
    const braked = rig();
    run(braked, 0.3, still);
    run(braked, 0.45, dig(braked.t, 0.4, 0.8));
    run(braked, BRAKE_SECONDS, () => ({ l: { x: -0.15, z: braked.left.wrist.z, palmDown: false }, r: { x: 0.15, z: braked.right.wrist.z } }));
    expect(braked.dig.speed).toBeLessThan(slow.dig.speed);
    expect(braked.dig.speed).toBeLessThan(start * 0.5);
  });

  it('resetDig stops everything', () => {
    const r = rig();
    run(r, 0.3, still);
    run(r, 0.45, dig(r.t, 0.4, 0.8));
    expect(r.dig.speed).toBeGreaterThan(STOP_SPEED);
    resetDig(r.dig);
    expect(r.dig.speed).toBe(0);
    expect(r.dig.left.qualified).toBe(false);
  });
});

describe('dig gesture helpers', () => {
  it('fingerReach is about 0.17 for a flat hand and 0.08 for a fist', () => {
    const s = createDigHandSample();
    expect(fingerReach(pose(s, { x: 0, z: 0 }))).toBeCloseTo(0.17, 2);
    expect(fingerReach(pose(s, { x: 0, z: 0, fist: true }))).toBeCloseTo(0.08, 2);
  });

  it('horizontalForward normalises and refuses a gaze straight up or down', () => {
    const out = { fx: 0, fz: 0 };
    expect(horizontalForward(3, -4, out)).toBe(true);
    expect(out.fx).toBeCloseTo(0.6, 9);
    expect(out.fz).toBeCloseTo(-0.8, 9);
    expect(horizontalForward(0.01, 0.01, out)).toBe(false);
    expect(horizontalForward(Number.NaN, 1, out)).toBe(false);
    expect(out.fx).toBeCloseTo(0.6, 9);
  });
});
