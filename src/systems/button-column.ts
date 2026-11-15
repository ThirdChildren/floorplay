// The column of fixed buttons beside the model (Menu, Issues, View, Walk inside and, in mixed reality, My room: the side of the hand preference), as the pinned menu needs to know it
// to keep clear of it (src/logic/menu-follow.ts). Written each frame by the Menu button system, read by the palm menu system. Not an ECS
// system: a tiny shared record, so the two systems do not import each other. Nothing here allocates.

import type { ButtonAnchor } from '../logic/menu-button';
import { fillButtonColumn, type ButtonColumn } from '../logic/menu-follow';

const column: ButtonColumn = { x: 0, z: 0, halfWidth: 0, yBottom: 0, yTop: 0 };
/** The slot of the "My room" toggle, the top floor of the column (a copy: the buttons system owns its anchors). */
const roomSlot: ButtonAnchor = { id: '', side: 'right', x: 0, y: 0, z: 0, yawRad: 0 };
let roomSlotEnabled = false;
let shown = false;
let tie: 1 | -1 = 1;

/**
 * The three buttons of one side are shown (`menu` the lowest, `issues` the middle, `view` the top): the column is rebuilt from them.
 * `side` is the side they are on: the menu goes to the other one when the gaze is exactly on them.
 */
export function setButtonColumn(
  menu: Readonly<ButtonAnchor>,
  issues: Readonly<ButtonAnchor>,
  view: Readonly<ButtonAnchor>,
  side: 'left' | 'right',
  walk?: Readonly<ButtonAnchor>,
  room?: Readonly<ButtonAnchor>,
): void {
  const roomOn = room !== undefined && roomSlotEnabled;
  fillButtonColumn(column, menu, issues, view, walk, roomOn ? room : undefined);
  if (roomOn && room) {
    roomSlot.id = room.id;
    roomSlot.side = room.side;
    roomSlot.x = room.x;
    roomSlot.y = room.y;
    roomSlot.z = room.z;
    roomSlot.yawRad = room.yawRad;
    roomSlot.halfWidth = room.halfWidth;
  }
  shown = true;
  tie = side === 'right' ? 1 : -1;
}

/** The buttons are hidden (real scale, no session): nothing to keep clear of. */
export function clearButtonColumn(): void {
  shown = false;
}

/** The mixed reality world has the "My room" toggle: the column has a fifth floor for it (called once by the room view system). */
export function enableRoomToggleSlot(): void {
  roomSlotEnabled = true;
}

/** Where the "My room" toggle goes in the column now (its top floor), or null when the column is hidden or there is no toggle. */
export function getRoomToggleSlot(): Readonly<ButtonAnchor> | null {
  return shown && roomSlotEnabled ? roomSlot : null;
}

/** The shown column, or null. */
export function getButtonColumn(): Readonly<ButtonColumn> | null {
  return shown ? column : null;
}

/** +1 when the column is on the right (the menu goes to the left on a tie), -1 when it is on the left. */
export function getButtonColumnTieSign(): 1 | -1 {
  return tie;
}
