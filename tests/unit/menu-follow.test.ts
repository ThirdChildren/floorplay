import { describe, expect, it } from 'vitest';
import { LARGE_TEXT_FACTOR } from '../../src/logic/access';
import { MENU_EXTENT, scaleExtent, type PanelExtent } from '../../src/logic/menu';
import {
  BUTTON_HALF_WIDTH,
  ISSUE_BUTTON_HALF_WIDTH,
  VIEW_BUTTON_HALF_WIDTH,
  buttonAnchors,
  faceHead,
  issueButtonAnchors,
  viewButtonAnchors,
  widenButtons,
} from '../../src/logic/menu-button';
import { pinnedConeAngleDeg } from '../../src/logic/menu-anchor';
import {
  COLUMN_GAP_DEG,
  FOLLOW_DEAD_ZONE_DEG,
  FOLLOW_MAX_DEG_PER_SECOND,
  FOLLOW_SETTLE_DEG,
  columnViewBox,
  createMenuFollow,
  fillButtonColumn,
  menuTouchesColumn,
  placeMenuFollow,
  stepMenuFollow,
  wrapAngle,
  type ButtonColumn,
  type FollowInputs,
  type MenuFollowState,
} from '../../src/logic/menu-follow';
import { VIEW_CONE_HALF_ANGLE_DEG } from '../../src/logic/menu-thresholds';
import { panelViewBox, viewBoxOverlap, type ViewBox } from '../../src/logic/panel-arbiter';

// The pinned menu follows the gaze and never overlaps the column of fixed buttons (fix/panel-overlap).

const DEG = Math.PI / 180;
const DT = 1 / 72;
const MODEL_ANCHOR = { x: 0, y: 0.85, z: -0.55 };

type Side = 'left' | 'right';

/** The column the Menu button system builds for `side`, exactly as it does it (same functions, widened at large text). */
function columnFor(head: { x: number; y: number; z: number }, side: Side, large: boolean): ButtonColumn {
  const menu = buttonAnchors(MODEL_ANCHOR, 0.05, 0);
  faceHead(menu, head);
  const issues = issueButtonAnchors(menu);
  const view = viewButtonAnchors(issues);
  const widen = large ? LARGE_TEXT_FACTOR : 1;
  widenButtons(menu, BUTTON_HALF_WIDTH, widen);
  widenButtons(issues, ISSUE_BUTTON_HALF_WIDTH, widen);
  widenButtons(view, VIEW_BUTTON_HALF_WIDTH, widen);
  const i = side === 'left' ? 0 : 1;
  return fillButtonColumn({ x: 0, z: 0, halfWidth: 0, yBottom: 0, yTop: 0 }, menu[i], issues[i], view[i]);
}

function inputsFor(head: { x: number; y: number; z: number }, side: Side, large: boolean, yawDeg: number, pitchDeg: number): FollowInputs {
  return {
    head,
    gazeYaw: yawDeg * DEG,
    gazePitch: pitchDeg * DEG,
    extent: large ? scaleExtent(MENU_EXTENT, LARGE_TEXT_FACTOR) : MENU_EXTENT,
    large,
    column: columnFor(head, side, large),
    tieSign: side === 'right' ? 1 : -1,
  };
}

const boxM: ViewBox = { azMin: 0, azMax: 0, elMin: 0, elMax: 0 };
const boxC: ViewBox = { azMin: 0, azMax: 0, elMin: 0, elMax: 0 };

/** Overlap fraction of the menu and the column as the user sees them (0 = clear), with a margin in degrees. */
function overlapOf(state: MenuFollowState, inputs: FollowInputs, margin = 0): number {
  if (!inputs.column || !columnViewBox(inputs.head, inputs.column, state.heading, boxC)) return 0;
  panelViewBox(inputs.head, state.heading, state.anchor, state.heading, inputs.extent, boxM);
  return viewBoxOverlap(boxM, boxC, margin);
}

const HEADS = [
  { x: 0, y: 1.6, z: 0 },
  { x: 0.15, y: 1.5, z: 0.1 },
  { x: -0.2, y: 1.7, z: -0.1 },
];
const YAWS = Array.from({ length: 36 }, (_, i) => i * 10 - 180);
const PITCHES = [-70, -50, -30, -15, 0, 8, 25];

describe('the menu is placed clear of the button column, in every head pose', () => {
  for (const large of [false, true]) {
    for (const side of ['right', 'left'] as Side[]) {
      it(`${large ? 'large' : 'normal'} text, buttons on the ${side}: never overlaps, whatever the gaze`, () => {
        for (const head of HEADS) {
          for (const yaw of YAWS) {
            for (const pitch of PITCHES) {
              const inputs = inputsFor(head, side, large, yaw, pitch);
              const state = createMenuFollow();
              placeMenuFollow(state, inputs);
              expect(overlapOf(state, inputs, 0)).toBe(0);
              expect(menuTouchesColumn(state, inputs)).toBe(false);
              // The gap is the one asked for wherever the strip and the menu share a height.
              panelViewBox(head, state.heading, state.anchor, state.heading, inputs.extent, boxM);
              if (columnViewBox(head, inputs.column as ButtonColumn, state.heading, boxC)) {
                const sharedHeight = boxM.elMax + COLUMN_GAP_DEG >= boxC.elMin && boxM.elMin - COLUMN_GAP_DEG <= boxC.elMax;
                if (sharedHeight) {
                  const gap = Math.max(boxC.azMin - boxM.azMax, boxM.azMin - boxC.azMax);
                  expect(gap).toBeGreaterThanOrEqual(COLUMN_GAP_DEG - 1e-6);
                }
              }
            }
          }
        }
      });
    }
  }

  it('the menu stays where the gaze is (and in the 30 degree cone) when the gaze is away from the buttons', () => {
    for (const large of [false, true]) {
      for (const side of ['right', 'left'] as Side[]) {
        const head = HEADS[0];
        const inputs = inputsFor(head, side, large, 0, 0);
        const state = createMenuFollow();
        placeMenuFollow(state, inputs);
        // Straight ahead the buttons are about 38 degrees to the side: the menu is not moved.
        expect(Math.abs(wrapAngle(state.heading - inputs.gazeYaw))).toBeLessThan(1e-9);
        const forward = { x: 0, y: 0, z: -1 };
        const angle = pinnedConeAngleDeg(state.anchor, state.heading, head, forward, inputs.extent);
        expect(angle).toBeLessThanOrEqual(VIEW_CONE_HALF_ANGLE_DEG + 1e-6);
      }
    }
  });

  it('looking straight at the buttons puts the menu beside them, on the side of the gaze, not over them', () => {
    for (const side of ['right', 'left'] as Side[]) {
      const head = HEADS[0];
      const column = columnFor(head, side, false);
      const toColumn = Math.atan2(-(column.x - head.x), -(column.z - head.z));
      for (const offsetDeg of [-8, -2, 0.5, 3, 9]) {
        const inputs = inputsFor(head, side, false, 0, -15);
        inputs.gazeYaw = toColumn + offsetDeg * DEG;
        const state = createMenuFollow();
        placeMenuFollow(state, inputs);
        expect(overlapOf(state, inputs, 0)).toBe(0);
        // It sits on the side of the strip where the gaze is (a positive azimuth is to the left of the user).
        const rel = wrapAngle(state.heading - toColumn);
        expect(Math.sign(rel)).toBe(offsetDeg > 0 ? 1 : -1);
      }
    }
  });

  it('a gaze exactly on the buttons goes to the side of the model (left of a right-hand column, right of a left-hand one)', () => {
    for (const side of ['right', 'left'] as Side[]) {
      const head = HEADS[0];
      const column = columnFor(head, side, false);
      const inputs = inputsFor(head, side, false, 0, -15);
      inputs.gazeYaw = Math.atan2(-(column.x - head.x), -(column.z - head.z));
      const state = createMenuFollow();
      placeMenuFollow(state, inputs);
      const rel = wrapAngle(state.heading - inputs.gazeYaw);
      expect(Math.sign(rel)).toBe(side === 'right' ? 1 : -1);
      expect(overlapOf(state, inputs, 0)).toBe(0);
    }
  });

  it('without a column (hidden buttons) the menu goes to the gaze', () => {
    const inputs = inputsFor(HEADS[0], 'right', false, 33, -10);
    inputs.column = null;
    const state = createMenuFollow();
    placeMenuFollow(state, inputs);
    expect(wrapAngle(state.heading - inputs.gazeYaw)).toBeCloseTo(0, 9);
  });
});

describe('the menu follows the gaze', () => {
  it('rests while the gaze stays inside the dead zone', () => {
    const inputs = inputsFor(HEADS[0], 'right', false, 0, -10);
    const state = createMenuFollow();
    placeMenuFollow(state, inputs);
    const before = { ...state.anchor };
    for (const yaw of [-FOLLOW_DEAD_ZONE_DEG + 2, FOLLOW_DEAD_ZONE_DEG - 2, -5, 8]) {
      inputs.gazeYaw = yaw * DEG;
      inputs.column = columnFor(HEADS[0], 'right', false);
      expect(stepMenuFollow(state, inputs, DT)).toBe(false);
      expect(state.anchor).toEqual(before);
    }
  });

  it('glides to the gaze when it leaves the dead zone, without a jump, and settles on it', () => {
    const inputs = inputsFor(HEADS[0], 'right', false, 0, -10);
    inputs.column = null; // nothing in the way
    const state = createMenuFollow();
    placeMenuFollow(state, inputs);
    inputs.gazeYaw = -50 * DEG; // 50 degrees to the right
    let previous = state.heading;
    let frames = 0;
    let moved = 0;
    while (frames < 72 * 5) {
      if (stepMenuFollow(state, inputs, DT)) moved += 1;
      const delta = Math.abs(wrapAngle(state.heading - previous)) / DEG;
      expect(delta).toBeLessThanOrEqual(FOLLOW_MAX_DEG_PER_SECOND * DT + FOLLOW_SETTLE_DEG + 1e-6);
      previous = state.heading;
      frames += 1;
      if (!state.moving) break;
    }
    expect(moved).toBeGreaterThan(5);
    expect(state.moving).toBe(false);
    expect(Math.abs(wrapAngle(state.heading - inputs.gazeYaw)) / DEG).toBeLessThan(2);
    expect(frames).toBeLessThan(72 * 3);
  });

  it('follows the pitch of the gaze too (looking down at the table)', () => {
    const inputs = inputsFor(HEADS[0], 'right', false, 0, 0);
    inputs.column = null;
    const state = createMenuFollow();
    placeMenuFollow(state, inputs);
    const y0 = state.anchor.y;
    inputs.gazePitch = -30 * DEG;
    for (let i = 0; i < 72 * 3 && (i === 0 || state.moving); i += 1) stepMenuFollow(state, inputs, DT);
    expect(state.anchor.y).toBeLessThan(y0 - 0.05);
  });

  it('keeps 0.5-0.8 m from the head and the whole menu in the cone while it follows (normal text)', () => {
    const head = HEADS[0];
    const inputs = inputsFor(head, 'right', false, 0, -10);
    inputs.column = null;
    const state = createMenuFollow();
    placeMenuFollow(state, inputs);
    for (let i = 0; i < 72 * 6; i += 1) {
      const t = i / 72;
      inputs.gazeYaw = Math.sin(t * 0.9) * 80 * DEG;
      inputs.gazePitch = (-10 + Math.sin(t * 1.3) * 12) * DEG;
      stepMenuFollow(state, inputs, DT);
      const d = Math.hypot(state.anchor.x - head.x, state.anchor.y - head.y, state.anchor.z - head.z);
      expect(d).toBeGreaterThanOrEqual(0.5 - 1e-6);
      expect(d).toBeLessThanOrEqual(0.8);
    }
  });
});

describe('the menu never overlaps the button column while it follows', () => {
  /** Simulates a head that turns and nods; checks the gap after every frame. */
  function sweep(side: Side, large: boolean, yawAt: (t: number) => number, pitchAt: (t: number) => number, seconds: number): MenuFollowState {
    const head = HEADS[1];
    const inputs = inputsFor(head, side, large, yawAt(0), pitchAt(0));
    const state = createMenuFollow();
    placeMenuFollow(state, inputs);
    let previous = state.heading;
    for (let i = 0; i < seconds * 72; i += 1) {
      const t = i / 72;
      inputs.gazeYaw = yawAt(t) * DEG;
      inputs.gazePitch = pitchAt(t) * DEG;
      stepMenuFollow(state, inputs, DT);
      expect(overlapOf(state, inputs, 0)).toBe(0);
      // No hop: the heading moves a few degrees a frame at most (a head turning 200 degrees a second moves the strip 2.8 degrees a frame).
      expect(Math.abs(wrapAngle(state.heading - previous)) / DEG).toBeLessThan(7);
      previous = state.heading;
    }
    return state;
  }

  for (const large of [false, true]) {
    for (const side of ['right', 'left'] as Side[]) {
      it(`${large ? 'large' : 'normal'} text, buttons on the ${side}: a head that sweeps across them and nods`, () => {
        sweep(side, large, (t) => Math.sin(t * 1.1) * 120, (t) => -15 + Math.sin(t * 1.7) * 25, 12);
        sweep(side, large, (t) => t * 60 - 180, () => -20, 6); // a slow full turn
        sweep(side, large, (t) => Math.sin(t * 2.3) * 40, () => -30, 8);
      });
    }
  }

  it('a menu beside the buttons stays on its side while the gaze goes past them', () => {
    const head = HEADS[0];
    const column = columnFor(head, 'right', false);
    const toColumn = Math.atan2(-(column.x - head.x), -(column.z - head.z));
    const inputs = inputsFor(head, 'right', false, 0, -15);
    inputs.gazeYaw = toColumn + 5 * DEG; // looking at the buttons, a little to the left of them: the menu goes to their left
    const state = createMenuFollow();
    placeMenuFollow(state, inputs);
    const side = Math.sign(wrapAngle(state.heading - toColumn));
    expect(side).toBe(1);
    // The gaze now passes the buttons and goes far to their right.
    for (let i = 0; i < 72 * 4; i += 1) {
      inputs.gazeYaw = toColumn - Math.min(60, i * 0.8) * DEG;
      stepMenuFollow(state, inputs, DT);
      expect(overlapOf(state, inputs, 0)).toBe(0);
      expect(Math.sign(wrapAngle(state.heading - toColumn))).toBe(side);
    }
  });

  it('the buttons are not moved or read back: the column is an input only', () => {
    const inputs = inputsFor(HEADS[0], 'right', false, 0, -15);
    const copy = { ...(inputs.column as ButtonColumn) };
    const state = createMenuFollow();
    placeMenuFollow(state, inputs);
    for (let i = 0; i < 100; i += 1) {
      inputs.gazeYaw = (i - 50) * 2 * DEG;
      stepMenuFollow(state, inputs, DT);
    }
    expect(inputs.column).toEqual(copy);
  });
});

describe('a head that moves sideways with the gaze fixed', () => {
  it('never leaves the menu over the buttons (the strip moves in the view, the menu is pushed)', () => {
    for (const large of [false, true]) {
      for (const side of ['right', 'left'] as Side[]) {
        const head = { x: 0, y: 1.6, z: 0 };
        const inputs = inputsFor(head, side, large, 20, -15);
        const state = createMenuFollow();
        placeMenuFollow(state, inputs);
        for (let i = 0; i < 72 * 6; i += 1) {
          head.x = Math.sin(i / 72) * 0.35;
          head.z = Math.cos(i / 90) * 0.2;
          inputs.column = columnFor(head, side, large);
          stepMenuFollow(state, inputs, DT);
          expect(overlapOf(state, inputs, 0)).toBe(0);
        }
      }
    }
  });
});

describe('fillButtonColumn', () => {
  it('is as wide as the widest button and as tall as the three together, at the position of the menu button', () => {
    const column = columnFor(HEADS[0], 'right', false);
    expect(column.halfWidth).toBeCloseTo(Math.max(BUTTON_HALF_WIDTH, ISSUE_BUTTON_HALF_WIDTH, VIEW_BUTTON_HALF_WIDTH), 9);
    expect(column.yTop - column.yBottom).toBeGreaterThan(0.2);
    const large = columnFor(HEADS[0], 'right', true);
    expect(large.halfWidth).toBeCloseTo(column.halfWidth * LARGE_TEXT_FACTOR, 9);
  });

  it('the buttons are at the side of the model, outside the menu when the gaze is on the model (a sanity check of the geometry)', () => {
    const head = HEADS[0];
    const extent: PanelExtent = MENU_EXTENT;
    const inputs = inputsFor(head, 'right', false, 0, 0);
    const state = createMenuFollow();
    placeMenuFollow(state, inputs);
    expect(extent.halfWidth).toBeGreaterThan(0);
    expect(overlapOf(state, inputs, 0)).toBe(0);
  });
});
