import { describe, expect, it } from 'vitest';
import { LARGE_TEXT_FACTOR } from '../../src/logic/access';
import { MENU_EXTENT, scaleExtent, type PanelExtent } from '../../src/logic/menu';
import { ISSUE_PANEL_EXTENT } from '../../src/logic/issue-panel';
import { layoutExtent, viewLayout } from '../../src/logic/view-panel';
import { PANEL_IDS, panelsToClose, type PanelId } from '../../src/logic/panel-arbiter';
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

// The View panel and the Issues panel follow the gaze and never overlap the column of fixed buttons, like the pinned menu
// (fix/panel-overlap): the same pure rule (src/logic/menu-follow.ts) driven with the real extents of the three panels.

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

function extentOf(panel: PanelId, large: boolean): PanelExtent {
  if (panel === 'menu') return large ? scaleExtent(MENU_EXTENT, LARGE_TEXT_FACTOR) : MENU_EXTENT;
  if (panel === 'view') return layoutExtent(viewLayout(large));
  return large ? scaleExtent(ISSUE_PANEL_EXTENT, LARGE_TEXT_FACTOR) : ISSUE_PANEL_EXTENT;
}

function inputsFor(
  panel: PanelId,
  head: { x: number; y: number; z: number },
  side: Side,
  large: boolean,
  yawDeg: number,
  pitchDeg: number,
): FollowInputs {
  return {
    head,
    gazeYaw: yawDeg * DEG,
    gazePitch: pitchDeg * DEG,
    extent: extentOf(panel, large),
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


const PANELS: PanelId[] = ['menu', 'view', 'issues'];
const SIDES: Side[] = ['right', 'left'];

describe('each pinned panel is placed clear of the button column, in every head pose', () => {
  for (const panel of PANELS) {
    for (const large of [false, true]) {
      for (const side of SIDES) {
        it(`${panel}, ${large ? 'large' : 'normal'} text, buttons on the ${side}: never overlaps and keeps the gap`, () => {
          for (const head of HEADS) {
            for (const yaw of YAWS) {
              for (const pitch of PITCHES) {
                const inputs = inputsFor(panel, head, side, large, yaw, pitch);
                const state = createMenuFollow();
                placeMenuFollow(state, inputs);
                expect(overlapOf(state, inputs, 0)).toBe(0);
                expect(menuTouchesColumn(state, inputs)).toBe(false);
                panelViewBox(head, state.heading, state.anchor, state.heading, inputs.extent, boxM);
                if (columnViewBox(head, inputs.column as ButtonColumn, state.heading, boxC)) {
                  const shared = boxM.elMax + COLUMN_GAP_DEG >= boxC.elMin && boxM.elMin - COLUMN_GAP_DEG <= boxC.elMax;
                  if (shared) {
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
  }

  it('away from the buttons each panel stays on the gaze, inside the 30 degree cone', () => {
    for (const panel of PANELS) {
      for (const large of [false, true]) {
        for (const side of SIDES) {
          const head = HEADS[0];
          const inputs = inputsFor(panel, head, side, large, 0, 0);
          const state = createMenuFollow();
          placeMenuFollow(state, inputs);
          expect(Math.abs(wrapAngle(state.heading - inputs.gazeYaw))).toBeLessThan(1e-9);
          const angle = pinnedConeAngleDeg(state.anchor, state.heading, head, { x: 0, y: 0, z: -1 }, inputs.extent);
          expect(angle).toBeLessThanOrEqual(VIEW_CONE_HALF_ANGLE_DEG + 1e-6);
        }
      }
    }
  });

  it('looking straight at the buttons puts each panel beside them, on the side of the gaze', () => {
    for (const panel of PANELS) {
      for (const side of SIDES) {
        const head = HEADS[0];
        const column = columnFor(head, side, false);
        const toColumn = Math.atan2(-(column.x - head.x), -(column.z - head.z));
        for (const offsetDeg of [-8, -2, 0.5, 3, 9]) {
          const inputs = inputsFor(panel, head, side, false, 0, -15);
          inputs.gazeYaw = toColumn + offsetDeg * DEG;
          const state = createMenuFollow();
          placeMenuFollow(state, inputs);
          expect(overlapOf(state, inputs, 0)).toBe(0);
          expect(Math.sign(wrapAngle(state.heading - toColumn))).toBe(offsetDeg > 0 ? 1 : -1);
        }
      }
    }
  });
});

describe('each pinned panel follows the gaze', () => {
  it('rests inside the dead zone', () => {
    for (const panel of PANELS) {
      const inputs = inputsFor(panel, HEADS[0], 'right', false, 0, -10);
      const state = createMenuFollow();
      placeMenuFollow(state, inputs);
      const before = { ...state.anchor };
      for (const yaw of [-FOLLOW_DEAD_ZONE_DEG + 2, FOLLOW_DEAD_ZONE_DEG - 2, -5, 8]) {
        inputs.gazeYaw = yaw * DEG;
        expect(stepMenuFollow(state, inputs, DT)).toBe(false);
        expect(state.anchor).toEqual(before);
      }
    }
  });

  it('glides to the gaze without a jump and settles', () => {
    for (const panel of PANELS) {
      for (const large of [false, true]) {
        const inputs = inputsFor(panel, HEADS[0], 'right', large, 0, -10);
        inputs.column = null;
        const state = createMenuFollow();
        placeMenuFollow(state, inputs);
        inputs.gazeYaw = -50 * DEG;
        let previous = state.heading;
        let frames = 0;
        while (frames < 72 * 5) {
          stepMenuFollow(state, inputs, DT);
          expect(Math.abs(wrapAngle(state.heading - previous)) / DEG).toBeLessThanOrEqual(FOLLOW_MAX_DEG_PER_SECOND * DT + FOLLOW_SETTLE_DEG + 1e-6);
          previous = state.heading;
          frames += 1;
          if (!state.moving) break;
        }
        expect(state.moving).toBe(false);
        expect(Math.abs(wrapAngle(state.heading - inputs.gazeYaw)) / DEG).toBeLessThan(2);
        expect(frames).toBeLessThan(72 * 3);
      }
    }
  });

  it('stays 0.5-0.8 m from the head while following a gaze that turns and nods (normal text; 0.9 m at large text, the documented deviation)', () => {
    for (const panel of PANELS) {
      for (const large of [false, true]) {
        const head = HEADS[0];
        const inputs = inputsFor(panel, head, 'right', large, 0, -10);
        const state = createMenuFollow();
        placeMenuFollow(state, inputs);
        for (let i = 0; i < 72 * 8; i += 1) {
          const t = i / 72;
          inputs.gazeYaw = Math.sin(t * 0.9) * 80 * DEG;
          inputs.gazePitch = (-12 + Math.sin(t * 1.3) * 10) * DEG;
          inputs.column = columnFor(head, 'right', large);
          stepMenuFollow(state, inputs, DT);
          const d = Math.hypot(state.anchor.x - head.x, state.anchor.y - head.y, state.anchor.z - head.z);
          expect(d).toBeGreaterThanOrEqual(0.5 - 1e-6);
          expect(d).toBeLessThanOrEqual(large ? 0.9 : 0.8);
        }
      }
    }
  });
});

describe('no pinned panel overlaps the button column while it follows', () => {
  function sweep(panel: PanelId, side: Side, large: boolean, yawAt: (t: number) => number, pitchAt: (t: number) => number, seconds: number): void {
    const head = HEADS[1];
    const inputs = inputsFor(panel, head, side, large, yawAt(0), pitchAt(0));
    const state = createMenuFollow();
    placeMenuFollow(state, inputs);
    let previous = state.heading;
    for (let i = 0; i < seconds * 72; i += 1) {
      const t = i / 72;
      inputs.gazeYaw = yawAt(t) * DEG;
      inputs.gazePitch = pitchAt(t) * DEG;
      stepMenuFollow(state, inputs, DT);
      expect(overlapOf(state, inputs, 0)).toBe(0);
      expect(Math.abs(wrapAngle(state.heading - previous)) / DEG).toBeLessThan(7);
      previous = state.heading;
    }
  }

  for (const panel of PANELS) {
    for (const large of [false, true]) {
      for (const side of SIDES) {
        it(`${panel}, ${large ? 'large' : 'normal'} text, buttons on the ${side}: a head that sweeps across them and nods`, () => {
          sweep(panel, side, large, (t) => Math.sin(t * 1.1) * 120, (t) => -15 + Math.sin(t * 1.7) * 25, 12);
          sweep(panel, side, large, (t) => t * 60 - 180, () => -20, 6);
          sweep(panel, side, large, (t) => Math.sin(t * 2.3) * 40, () => -30, 8);
        });
      }
    }
  }

  it('a head that moves sideways with the gaze fixed', () => {
    for (const panel of PANELS) {
      for (const large of [false, true]) {
        for (const side of SIDES) {
          const head = { x: 0, y: 1.6, z: 0 };
          const inputs = inputsFor(panel, head, side, large, 20, -15);
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
    }
  });

  it('a panel beside the buttons stays on its side while the gaze goes past them', () => {
    for (const panel of PANELS) {
      const head = HEADS[0];
      const column = columnFor(head, 'right', false);
      const toColumn = Math.atan2(-(column.x - head.x), -(column.z - head.z));
      const inputs = inputsFor(panel, head, 'right', false, 0, -15);
      inputs.gazeYaw = toColumn + 5 * DEG;
      const state = createMenuFollow();
      placeMenuFollow(state, inputs);
      const side = Math.sign(wrapAngle(state.heading - toColumn));
      expect(side).toBe(1);
      for (let i = 0; i < 72 * 4; i += 1) {
        inputs.gazeYaw = toColumn - Math.min(60, i * 0.8) * DEG;
        stepMenuFollow(state, inputs, DT);
        expect(overlapOf(state, inputs, 0)).toBe(0);
        expect(Math.sign(wrapAngle(state.heading - toColumn))).toBe(side);
      }
    }
  });
});

describe('one panel open at a time still holds with the follow', () => {
  it('the three panels still open at the same gaze place, so exactly one may be open', () => {
    // At a gaze away from the buttons all three are placed on the same heading: the arbiter rule is what keeps them apart.
    const anchors = PANELS.map((panel) => {
      const inputs = inputsFor(panel, HEADS[0], 'right', false, 0, -10);
      const state = createMenuFollow();
      placeMenuFollow(state, inputs);
      return state.heading;
    });
    expect(Math.max(...anchors) - Math.min(...anchors)).toBeLessThan(1e-9);
    for (const opening of PANEL_IDS) {
      expect(panelsToClose(opening, { menu: true, view: true, issues: true })).toHaveLength(2);
    }
  });
});
