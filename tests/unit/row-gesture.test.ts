import { describe, expect, it } from 'vitest';
import {
  ARM_SECONDS,
  BELOW_EYES_MAX_START,
  BELOW_EYES_MIN_START,
  BRAKE_SECONDS,
  FIST_REACH_KEEP,
  FIST_REACH_START,
  FRONT_MAX_START,
  LOCKOUT_SECONDS,
  MAX_WALK_SPEED,
  STOP_SPEED,
  STROKE_GAIN,
  createRow,
  createRowHandSample,
  fistReach,
  horizontalForward,
  resetRow,
  updateRow,
  type RowHandSample,
  type RowHead,
  type RowState,
} from '../../src/logic/row-gesture';

// Synthetic hands. The head looks along -z at (0, 1.2, 0); fists are 0.6 m ahead, 0.35 m below the eyes (chest height).
const HEAD: RowHead = { x: 0, y: 1.2, z: 0, fx: 0, fz: -1 };
const DT = 1 / 72;

interface Pose {
  x: number;
  z: number;
  y?: number;
  /** How far the four fingertips are from the wrist (metres): 0.085 fist (default), 0.15 relaxed, 0.18 flat. */
  reach?: number;
  /** The index finger sticks out to this reach while the other fingers stay curled (a pinch-like hand). */
  indexReach?: number;
  pinching?: boolean;
  tracked?: boolean;
}

/** Fills `s` as a hand with its wrist at (x, y, z) and the fingertips `reach` metres ahead of it (towards -z). */
function pose(s: RowHandSample, p: Pose): RowHandSample {
  const y = p.y ?? 0.85;
  const reach = p.reach ?? 0.085;
  s.tracked = p.tracked ?? true;
  s.pinching = p.pinching ?? false;
  s.wrist.x = p.x;
  s.wrist.y = y;
  s.wrist.z = p.z;
  const tip = (t: { x: number; y: number; z: number }, dx: number, r: number): void => {
    t.x = p.x + dx;
    t.y = y;
    t.z = p.z - r;
  };
  tip(s.indexTip, -0.02, p.indexReach ?? reach);
  tip(s.middleTip, 0, reach);
  tip(s.ringTip, 0.01, reach);
  tip(s.pinkyTip, 0.02, reach);
  return s;
}

interface Rig {
  row: RowState;
  left: RowHandSample;
  right: RowHandSample;
  t: number;
}

const rig = (): Rig => ({ row: createRow(), left: createRowHandSample(), right: createRowHandSample(), t: 0 });

/** Runs `seconds` of frames; `at(t)` gives the pose of each hand at time t of this run. */
function run(r: Rig, seconds: number, at: (t: number) => { l: Pose; r: Pose }, head: RowHead = HEAD): number {
  const frames = Math.round(seconds / DT);
  let peak = 0;
  for (let i = 0; i < frames; i += 1) {
    r.t += DT;
    const p = at(r.t);
    pose(r.left, p.l);
    pose(r.right, p.r);
    const speed = updateRow(r.row, r.left, r.right, head, DT);
    if (speed > peak) peak = speed;
  }
  return peak;
}

const Z0 = -0.6;
/** Both fists hold still. */
const still = (extra: Partial<Pose> = {}): (() => { l: Pose; r: Pose }) => () => ({ l: { x: -0.15, z: Z0, ...extra }, r: { x: 0.15, z: Z0, ...extra } });
/** A row: the wrists sweep back (towards +z, towards the body) at `v` m/s for `dur` seconds from `t0`, then go forward slowly. */
function row(t0: number, dur: number, v: number, extra: Partial<Pose> = {}): (t: number) => { l: Pose; r: Pose } {
  return (t) => {
    const k = Math.min(Math.max(t - t0, 0), dur);
    const back = k * v;
    // After the stroke the hands go forward again slowly (0.1 m/s): no extra drive.
    const forward = t > t0 + dur ? (t - t0 - dur) * 0.1 : 0;
    const z = Z0 + back - forward;
    return { l: { x: -0.15, z, ...extra }, r: { x: 0.15, z, ...extra } };
  };
}

describe('row gesture: strokes with both fists move, everything else does not', () => {
  it('a coordinated backward stroke of both fists adds speed', () => {
    const r = rig();
    run(r, 0.3, still()); // arm
    const peak = run(r, 0.5, row(r.t, 0.4, 0.6));
    expect(peak).toBeGreaterThan(0.3);
    expect(peak).toBeLessThanOrEqual(MAX_WALK_SPEED);
  });

  it('the speed is about GAIN times the stroke length (a 0.24 m stroke is about 0.48 m/s)', () => {
    const r = rig();
    run(r, 0.3, still());
    const peak = run(r, 0.5, row(r.t, 0.4, 0.6));
    expect(peak).toBeGreaterThan(0.25 * STROKE_GAIN * 0.5);
    expect(peak).toBeLessThan(0.24 * STROKE_GAIN * 1.05);
  });

  it('repeated strokes build up speed but never pass the maximum', () => {
    const r = rig();
    run(r, 0.3, still());
    let peak = 0;
    for (let i = 0; i < 6; i += 1) {
      peak = Math.max(peak, run(r, 0.5, row(r.t, 0.35, 0.8)));
    }
    expect(peak).toBe(MAX_WALK_SPEED);
  });

  it('the speed decays smoothly to zero when the fists stop, and never goes up while they only hold the pose', () => {
    const r = rig();
    run(r, 0.3, still());
    run(r, 0.45, row(r.t, 0.4, 0.8));
    expect(r.row.speed).toBeGreaterThan(0.3);
    // The smoothing of the hand speed (60 ms) lets the last frames of the stroke through: settle first.
    run(r, 0.25, () => ({ l: { x: -0.15, z: r.left.wrist.z }, r: { x: 0.15, z: r.right.wrist.z } }));
    let last = r.row.speed;
    let monotone = true;
    for (let i = 0; i < 400; i += 1) {
      r.t += DT;
      pose(r.left, { x: -0.15, z: r.left.wrist.z });
      pose(r.right, { x: 0.15, z: r.right.wrist.z });
      const s = updateRow(r.row, r.left, r.right, HEAD, DT);
      if (s > last + 1e-12) monotone = false;
      last = s;
    }
    expect(monotone).toBe(true);
    expect(r.row.speed).toBe(0);
  });

  it('both hands are required: only the right fist strokes', () => {
    const r = rig();
    run(r, 0.3, still());
    const peak = run(r, 1, (t) => ({ l: { x: -0.15, z: Z0 }, r: { x: 0.15, z: Z0 + Math.min(t - 0.3, 0.5) * 0.8 } }));
    expect(peak).toBe(0);
  });

  it('both hands are required: one fist missing (not tracked) does nothing', () => {
    const r = rig();
    run(r, 0.3, still());
    const a = row(r.t, 0.4, 0.8);
    const peak = run(r, 0.6, (t) => {
      const p = a(t);
      return { l: { ...p.l, tracked: false }, r: p.r };
    });
    expect(peak).toBe(0);
  });

  it('both hands are required: one open hand and one fist do nothing', () => {
    const r = rig();
    run(r, 0.3, still());
    const a = row(r.t, 0.4, 0.8);
    const peak = run(r, 0.6, (t) => {
      const p = a(t);
      return { l: { ...p.l, reach: 0.18 }, r: p.r };
    });
    expect(peak).toBe(0);
    expect(r.row.left.reason).toBe('fist');
    expect(r.row.right.reason).toBe('ok');
  });
});

describe('row gesture: what is a fist', () => {
  it('open hands (flat, 0.18 m reach) never row, with the same sweep', () => {
    const r = rig();
    run(r, 0.3, still({ reach: 0.18 }));
    const peak = run(r, 0.6, row(r.t, 0.4, 0.8, { reach: 0.18 }));
    expect(peak).toBe(0);
    expect(r.row.left.reason).toBe('fist');
  });

  it('relaxed hands (0.15 m reach) never row', () => {
    const r = rig();
    run(r, 0.3, still({ reach: 0.15 }));
    const peak = run(r, 0.6, row(r.t, 0.4, 0.8, { reach: 0.15 }));
    expect(peak).toBe(0);
  });

  it('a pinch pose (index out towards the thumb, the other fingers curled) is not a fist', () => {
    const r = rig();
    run(r, 0.3, still({ indexReach: 0.15 }));
    const peak = run(r, 0.6, row(r.t, 0.4, 0.8, { indexReach: 0.15 }));
    expect(peak).toBe(0);
    expect(r.row.left.reason).toBe('fist');
  });

  it('a single finger out (a pointing hand) is not a fist', () => {
    const r = rig();
    run(r, 0.3, still({ indexReach: 0.18 }));
    const peak = run(r, 0.6, row(r.t, 0.4, 0.8, { indexReach: 0.18 }));
    expect(peak).toBe(0);
  });

  it('fist reach is the farthest of the four tips', () => {
    const s = createRowHandSample();
    expect(fistReach(pose(s, { x: 0, z: 0 }))).toBeCloseTo(0.085, 2);
    expect(fistReach(pose(s, { x: 0, z: 0, reach: 0.18 }))).toBeCloseTo(0.18, 2);
    expect(fistReach(pose(s, { x: 0, z: 0, indexReach: 0.16 }))).toBeCloseTo(0.16, 2);
  });

  it('the start and keep thresholds leave a margin around a real fist and a relaxed hand', () => {
    expect(FIST_REACH_START).toBeGreaterThan(0.1);
    expect(FIST_REACH_START).toBeLessThan(FIST_REACH_KEEP);
    expect(FIST_REACH_KEEP).toBeLessThan(0.15);
  });

  it('hysteresis: a fist that opens a little keeps rowing; one that starts there is not let in', () => {
    const mid = (FIST_REACH_START + FIST_REACH_KEEP) / 2;
    const r = rig();
    run(r, 0.3, still());
    expect(r.row.left.qualified).toBe(true);
    pose(r.left, { x: -0.15, z: Z0, reach: mid });
    pose(r.right, { x: 0.15, z: Z0 });
    updateRow(r.row, r.left, r.right, HEAD, DT);
    expect(r.row.left.qualified).toBe(true);
    pose(r.left, { x: -0.15, z: Z0, reach: FIST_REACH_KEEP + 0.02 });
    updateRow(r.row, r.left, r.right, HEAD, DT);
    expect(r.row.left.qualified).toBe(false);
    pose(r.left, { x: -0.15, z: Z0, reach: mid });
    updateRow(r.row, r.left, r.right, HEAD, DT);
    expect(r.row.left.qualified).toBe(false); // not let back in at the middle value
    pose(r.left, { x: -0.15, z: Z0, reach: 0.085 });
    updateRow(r.row, r.left, r.right, HEAD, DT);
    expect(r.row.left.qualified).toBe(true);
  });
});

describe('row gesture: pinch and lockout', () => {
  it('pinching hands do nothing, even with fists and the same sweep', () => {
    const r = rig();
    run(r, 0.3, still());
    const peak = run(r, 0.7, row(r.t, 0.5, 0.8, { pinching: true }));
    expect(peak).toBe(0);
  });

  it('the two-hand zoom/turn gesture (both hands pinching) never rows', () => {
    const r = rig();
    run(r, 0.3, still());
    const peak = run(r, 1, row(r.t, 0.8, 0.5, { pinching: true, reach: 0.13 }));
    expect(peak).toBe(0);
    expect(r.row.left.reason).toBe('pinch');
  });

  it('after a pinch ends the hand stays shut out for LOCKOUT_SECONDS', () => {
    const r = rig();
    run(r, 0.3, still());
    run(r, 0.1, () => ({ l: { x: -0.15, z: Z0, pinching: true }, r: { x: 0.15, z: Z0, pinching: true } }));
    run(r, LOCKOUT_SECONDS - 0.1, still());
    expect(r.row.left.reason).toBe('lockout');
    run(r, 0.2, still());
    expect(r.row.left.reason).toBe('ok');
  });

  it('a pinch in the middle of a stroke ends the stroke and freezes the gain', () => {
    const r = rig();
    run(r, 0.3, still());
    const a = row(r.t, 0.6, 0.6);
    run(r, 0.2, a);
    const before = r.row.speed;
    expect(before).toBeGreaterThan(0);
    run(r, 0.3, (t) => ({ l: { ...a(t).l, pinching: true }, r: a(t).r }));
    expect(r.row.speed).toBeLessThanOrEqual(before);
  });
});

describe('row gesture: the chest zone', () => {
  it('fists raised in front of the face (above the band) do nothing', () => {
    const r = rig();
    const y = 1.2 - (BELOW_EYES_MIN_START - 0.05);
    run(r, 0.3, still({ y }));
    const peak = run(r, 0.6, row(r.t, 0.4, 0.8, { y }));
    expect(peak).toBe(0);
    expect(r.row.left.reason).toBe('zone');
  });

  it('fists in the lap (below the band) do nothing', () => {
    const r = rig();
    const y = 1.2 - (BELOW_EYES_MAX_START + 0.1);
    run(r, 0.3, still({ y }));
    const peak = run(r, 0.6, row(r.t, 0.4, 0.8, { y }));
    expect(peak).toBe(0);
    expect(r.row.left.reason).toBe('zone');
  });

  it('fists beyond the reach of an arm do nothing', () => {
    const r = rig();
    const far = (): { l: Pose; r: Pose } => ({ l: { x: -0.15, z: -(FRONT_MAX_START + 0.1) }, r: { x: 0.15, z: -(FRONT_MAX_START + 0.1) } });
    run(r, 0.3, far);
    expect(r.row.left.reason).toBe('zone');
  });

  it('fists beside or behind the head do nothing', () => {
    const r = rig();
    run(r, 0.1, still());
    const peak = run(r, 0.6, (t) => {
      const z = 0.3 + Math.min(t - 0.1, 0.4) * 0.8; // behind the head
      return { l: { x: -0.15, z }, r: { x: 0.15, z } };
    });
    expect(peak).toBe(0);
  });

  it('a stroke that ends close to the chest keeps counting (the zone is relaxed once the fist is in)', () => {
    const r = rig();
    run(r, 0.3, still());
    // 0.6 m ahead -> 0.1 m ahead (below FRONT_MIN_START, above FRONT_MIN_KEEP).
    const peak = run(r, 0.7, row(r.t, 0.6, 0.8333));
    expect(peak).toBeGreaterThan(0.5);
    expect(r.row.left.reason).not.toBe('zone');
  });

  it('the stroke direction follows the head: looking along +x, a sweep along -x is a row', () => {
    const head: RowHead = { x: 0, y: 1.2, z: 0, fx: 1, fz: 0 };
    const r = rig();
    const hands = (x: number): { l: Pose; r: Pose } => ({ l: { x, z: -0.15 }, r: { x, z: 0.15 } });
    run(r, 0.3, () => hands(0.4), head);
    const peak = run(r, 0.5, (t) => hands(0.4 - Math.min(t - 0.3, 0.4) * 0.6), head);
    expect(peak).toBeGreaterThan(0.3);
  });
});

describe('row gesture: the stroke itself', () => {
  it('a forward push of both fists (away from the body) does nothing', () => {
    const r = rig();
    run(r, 0.3, still());
    const peak = run(r, 0.5, (t) => {
      const z = Z0 - Math.min(t - 0.3, 0.4) * 0.8;
      return { l: { x: -0.15, z }, r: { x: 0.15, z } };
    });
    expect(peak).toBe(0);
  });

  it('a sideways sweep of both fists does nothing', () => {
    const r = rig();
    run(r, 0.3, still());
    const peak = run(r, 0.6, (t) => {
      const dx = Math.min(t - 0.3, 0.4) * 0.8;
      return { l: { x: -0.15 + dx, z: Z0 }, r: { x: 0.15 + dx, z: Z0 } };
    });
    expect(peak).toBe(0);
  });

  it('a mostly sideways diagonal does nothing; a mostly backward one rows', () => {
    const diag = (side: number): number => {
      const r = rig();
      run(r, 0.3, still());
      return run(r, 0.6, (t) => {
        const k = Math.min(t - 0.3, 0.4);
        return { l: { x: -0.15 + k * side, z: Z0 + k * 0.8 }, r: { x: 0.15 + k * side, z: Z0 + k * 0.8 } };
      });
    };
    expect(diag(1.2)).toBe(0);
    expect(diag(0.2)).toBeGreaterThan(0.3);
  });

  it('fists moving in opposite directions (the rotate sweep) do nothing', () => {
    const r = rig();
    run(r, 0.3, still());
    const peak = run(r, 0.6, (t) => {
      const k = Math.min(t - 0.3, 0.4) * 0.8;
      return { l: { x: -0.15, z: Z0 + k }, r: { x: 0.15, z: Z0 - k } };
    });
    expect(peak).toBe(0);
  });

  it('a stroke that is too slow does nothing', () => {
    const r = rig();
    run(r, 0.3, still());
    const peak = run(r, 1.5, row(r.t, 1.4, 0.1));
    expect(peak).toBe(0);
  });

  it('a hand that has been a fist for less than ARM_SECONDS does not count', () => {
    const r = rig();
    // Start moving at once: the first ARM_SECONDS of the pose never count.
    const peak = run(r, ARM_SECONDS * 0.9, row(0, 0.4, 0.8));
    expect(peak).toBe(0);
  });

  it('a tracking glitch (a hand that jumps 2 m in one frame) adds nothing', () => {
    const r = rig();
    run(r, 0.3, still());
    pose(r.left, { x: -0.15, z: Z0 + 2 });
    pose(r.right, { x: 0.15, z: Z0 + 2 });
    const s = updateRow(r.row, r.left, r.right, HEAD, DT);
    expect(s).toBe(0);
  });

  it('a bad dt or a non-finite head changes nothing', () => {
    const r = rig();
    run(r, 0.3, still());
    run(r, 0.45, row(r.t, 0.4, 0.8));
    const s = r.row.speed;
    expect(updateRow(r.row, r.left, r.right, HEAD, 0)).toBe(s);
    expect(updateRow(r.row, r.left, r.right, HEAD, -1)).toBe(s);
    expect(updateRow(r.row, r.left, r.right, HEAD, Number.NaN)).toBe(s);
    expect(updateRow(r.row, r.left, r.right, { ...HEAD, fx: Number.NaN }, DT)).toBe(s);
  });

  it('a long hitch frame is cut: it cannot add more than a normal frame cap would', () => {
    const r = rig();
    run(r, 0.3, still());
    pose(r.left, { x: -0.15, z: Z0 + 0.05 });
    pose(r.right, { x: 0.15, z: Z0 + 0.05 });
    updateRow(r.row, r.left, r.right, HEAD, 5);
    expect(r.row.speed).toBeLessThanOrEqual(MAX_WALK_SPEED);
  });

  it('a fist that opens brakes faster than fists that hold the pose', () => {
    const slow = rig();
    run(slow, 0.3, still());
    run(slow, 0.45, row(slow.t, 0.4, 0.8));
    const start = slow.row.speed;
    run(slow, BRAKE_SECONDS, () => ({ l: { x: -0.15, z: slow.left.wrist.z }, r: { x: 0.15, z: slow.right.wrist.z } }));
    const braked = rig();
    run(braked, 0.3, still());
    run(braked, 0.45, row(braked.t, 0.4, 0.8));
    run(braked, BRAKE_SECONDS, () => ({ l: { x: -0.15, z: braked.left.wrist.z, reach: 0.18 }, r: { x: 0.15, z: braked.right.wrist.z } }));
    expect(braked.row.speed).toBeLessThan(slow.row.speed);
    expect(braked.row.speed).toBeLessThan(start * 0.5);
  });

  it('resetRow stops everything', () => {
    const r = rig();
    run(r, 0.3, still());
    run(r, 0.45, row(r.t, 0.4, 0.8));
    expect(r.row.speed).toBeGreaterThan(STOP_SPEED);
    resetRow(r.row);
    expect(r.row.speed).toBe(0);
    expect(r.row.left.qualified).toBe(false);
  });
});

describe('row gesture helpers', () => {
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
