import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import { LARGE_TEXT_FACTOR } from '../../src/logic/access';
import { MENU_EXTENT, scaleExtent } from '../../src/logic/menu';
import {
  BUTTON_HALF_HEIGHT,
  BUTTON_HALF_WIDTH,
  ISSUE_BUTTON_HALF_WIDTH,
  ROOM_COLUMN_BUTTON_HALF_WIDTH,
  ROOM_COLUMN_BUTTON_LIFT,
  VIEW_BUTTON_HALF_WIDTH,
  WALK_BUTTON_HALF_HEIGHT,
  WALK_BUTTON_HALF_WIDTH,
  buttonAnchors,
  buttonView,
  createButtonPair,
  faceHead,
  issueButtonAnchors,
  pickButton,
  roomButtonSlots,
  viewButtonAnchors,
  walkButtonAnchors,
  widenButtons,
  type ButtonAnchor,
} from '../../src/logic/menu-button';
import {
  columnViewBox,
  createMenuFollow,
  fillButtonColumn,
  menuTouchesColumn,
  placeMenuFollow,
  type ButtonColumn,
  type FollowInputs,
} from '../../src/logic/menu-follow';
import { panelViewBox, viewBoxOverlap, type ViewBox } from '../../src/logic/panel-arbiter';
import { ROOM_BUTTON_HALF_HEIGHT, ROOM_BUTTON_ID, ROOM_BUTTON_PANEL, ROOM_MENU_BUTTON_PANEL } from '../../src/logic/room-view';

// The "My room" toggle is the fifth floor of the fixed button column in the model view of the mixed reality mode.

const DEG = Math.PI / 180;
const MODEL_ANCHOR = { x: 0, y: 0.85, z: -0.55 };

interface Floors {
  menu: ButtonAnchor;
  issues: ButtonAnchor;
  view: ButtonAnchor;
  walk: ButtonAnchor;
  room: ButtonAnchor;
}

/** The five floors of one side, built as the Menu button system builds them. */
function floorsFor(head: { x: number; y: number; z: number }, side: 'left' | 'right', large = false): Floors {
  const menu = buttonAnchors(MODEL_ANCHOR, 0.05, 0);
  faceHead(menu, head);
  const issues = issueButtonAnchors(menu);
  const view = viewButtonAnchors(issues);
  const walk = walkButtonAnchors(view);
  const room = roomButtonSlots(walk);
  const widen = large ? LARGE_TEXT_FACTOR : 1;
  widenButtons(menu, BUTTON_HALF_WIDTH, widen);
  widenButtons(issues, ISSUE_BUTTON_HALF_WIDTH, widen);
  widenButtons(view, VIEW_BUTTON_HALF_WIDTH, widen);
  widenButtons(walk, WALK_BUTTON_HALF_WIDTH, widen);
  widenButtons(room, ROOM_COLUMN_BUTTON_HALF_WIDTH, widen);
  const i = side === 'left' ? 0 : 1;
  return { menu: menu[i], issues: issues[i], view: view[i], walk: walk[i], room: room[i] };
}

describe('the "My room" slot, top floor of the column', () => {
  const head = { x: 0, y: 1.5, z: 0 };

  it('sits 7 cm above "Walk inside" on the same ring position and yaw, with the id of the toggle', () => {
    for (const side of ['left', 'right'] as const) {
      const f = floorsFor(head, side);
      expect(f.room.y - f.walk.y).toBeCloseTo(ROOM_COLUMN_BUTTON_LIFT, 12);
      expect(f.room.x).toBe(f.walk.x);
      expect(f.room.z).toBe(f.walk.z);
      expect(f.room.yawRad).toBe(f.walk.yawRad);
      expect(f.room.side).toBe(side);
      expect(f.room.id).toBe(ROOM_BUTTON_ID);
      expect(f.room.halfWidth).toBe(ROOM_COLUMN_BUTTON_HALF_WIDTH);
    }
  });

  it('has the same height and the same 1 cm gap as the other floors, and the panel files say so', () => {
    expect(ROOM_BUTTON_HALF_HEIGHT).toBe(BUTTON_HALF_HEIGHT);
    expect(ROOM_BUTTON_PANEL.height).toBe(6);
    expect(ROOM_MENU_BUTTON_PANEL.height).toBe(6);
    expect(ROOM_COLUMN_BUTTON_LIFT - WALK_BUTTON_HALF_HEIGHT - ROOM_BUTTON_HALF_HEIGHT).toBeCloseTo(0.01, 12);
    expect(readFileSync('public/ui/room-button.uikitml', 'utf8')).toContain(`height: ${ROOM_BUTTON_PANEL.height};`);
    expect(readFileSync('public/ui/room-menu-button.uikitml', 'utf8')).toContain(`height: ${ROOM_MENU_BUTTON_PANEL.height};`);
  });

  it('a pinch picks the right floor of the five, and between two floors nothing', () => {
    const f = floorsFor(head, 'right');
    const all = [f.menu, f.issues, f.view, f.walk, f.room];
    for (const floor of all) expect(pickButton({ x: floor.x, y: floor.y, z: floor.z }, all)).toBe(floor);
    expect(pickButton({ x: f.room.x, y: f.room.y - 0.035, z: f.room.z }, all)).toBeNull();
    expect(pickButton({ x: f.room.x, y: f.room.y + 0.04, z: f.room.z }, all)).toBeNull();
  });

  it('widens with large text like the other floors', () => {
    const f = floorsFor(head, 'right', true);
    expect(f.room.halfWidth).toBeCloseTo(ROOM_COLUMN_BUTTON_HALF_WIDTH * LARGE_TEXT_FACTOR, 12);
  });
});

describe('the column with the fifth floor', () => {
  const head = { x: 0, y: 1.5, z: 0 };
  const empty = (): ButtonColumn => ({ x: 0, z: 0, halfWidth: 0, yBottom: 0, yTop: 0 });

  it('is as tall as five floors and keeps its bottom, and is unchanged without the toggle', () => {
    const f = floorsFor(head, 'right');
    const four = fillButtonColumn(empty(), f.menu, f.issues, f.view, f.walk);
    const five = fillButtonColumn(empty(), f.menu, f.issues, f.view, f.walk, f.room);
    expect(five.yBottom).toBe(four.yBottom);
    expect(five.yTop - four.yTop).toBeCloseTo(ROOM_COLUMN_BUTTON_LIFT + ROOM_BUTTON_HALF_HEIGHT - WALK_BUTTON_HALF_HEIGHT, 12);
    expect(five.yTop).toBeCloseTo(f.room.y + ROOM_BUTTON_HALF_HEIGHT, 12);
    expect(five.halfWidth).toBe(four.halfWidth); // "Walk inside" is the widest
  });

  it('is wider when large text makes the toggle the widest one', () => {
    const f = floorsFor(head, 'right');
    const col = fillButtonColumn(empty(), f.menu, f.issues, f.view, undefined, { ...f.room, halfWidth: 0.2 });
    expect(col.halfWidth).toBe(0.2);
    expect(col.yTop).toBeCloseTo(f.room.y + ROOM_BUTTON_HALF_HEIGHT, 12);
  });

  it('the top floor is at most 5 degrees farther from the gaze than "Walk inside" below it, and within 50 degrees, for heads 1.2-1.9 m', () => {
    for (const y of [1.2, 1.4, 1.6, 1.9]) {
      for (const side of ['left', 'right'] as const) {
        const h = { x: 0, y, z: 0 };
        const f = floorsFor(h, side);
        // The gaze level (the head looking straight ahead) and the gaze at the model (looking down at it).
        const gazes = [
          { x: 0, y: 0, z: -1 },
          { x: 0 - h.x, y: MODEL_ANCHOR.y - h.y, z: MODEL_ANCHOR.z - h.z },
        ];
        for (const forward of gazes) {
          const angle = (b: ButtonAnchor): number => {
            const pair = createButtonPair();
            pair[0] = b;
            pair[1] = b;
            return buttonView(pair, h, forward).angleDeg;
          };
          expect(angle(f.room) - angle(f.walk)).toBeLessThan(5);
          expect(angle(f.room)).toBeLessThanOrEqual(50);
        }
      }
    }
  });
});

describe('the pinned menu keeps clear of the column that includes the toggle', () => {
  const boxM: ViewBox = { azMin: 0, azMax: 0, elMin: 0, elMax: 0 };
  const boxC: ViewBox = { azMin: 0, azMax: 0, elMin: 0, elMax: 0 };
  const heads = [
    { x: 0, y: 1.6, z: 0 },
    { x: 0.15, y: 1.5, z: 0.1 },
    { x: -0.2, y: 1.7, z: -0.1 },
  ];

  for (const large of [false, true]) {
    for (const side of ['right', 'left'] as const) {
      it(`${large ? 'large' : 'normal'} text, buttons on the ${side}: the menu never touches the five floors`, () => {
        for (const head of heads) {
          const f = floorsFor(head, side, large);
          const column = fillButtonColumn(empty(), f.menu, f.issues, f.view, f.walk, f.room);
          for (let yaw = -180; yaw < 180; yaw += 10) {
            for (const pitch of [-70, -50, -30, -15, 0, 8, 25, 40]) {
              const inputs: FollowInputs = {
                head,
                gazeYaw: yaw * DEG,
                gazePitch: pitch * DEG,
                extent: large ? scaleExtent(MENU_EXTENT, LARGE_TEXT_FACTOR) : MENU_EXTENT,
                large,
                column,
                tieSign: side === 'right' ? 1 : -1,
              };
              const state = createMenuFollow();
              placeMenuFollow(state, inputs);
              expect(menuTouchesColumn(state, inputs)).toBe(false);
              if (columnViewBox(head, column, state.heading, boxC)) {
                panelViewBox(head, state.heading, state.anchor, state.heading, inputs.extent, boxM);
                expect(viewBoxOverlap(boxM, boxC, 0)).toBe(0);
              }
            }
          }
        }
      });
    }
  }
});

function empty(): ButtonColumn {
  return { x: 0, z: 0, halfWidth: 0, yBottom: 0, yTop: 0 };
}
