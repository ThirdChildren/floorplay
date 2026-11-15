// The column of fixed buttons beside the model (Menu, Issues, View: the side of the hand preference), as the pinned menu needs to know it
// to keep clear of it (src/logic/menu-follow.ts). Written each frame by the Menu button system, read by the palm menu system. Not an ECS
// system: a tiny shared record, so the two systems do not import each other. Nothing here allocates.

import type { ButtonAnchor } from '../logic/menu-button';
import { fillButtonColumn, type ButtonColumn } from '../logic/menu-follow';

const column: ButtonColumn = { x: 0, z: 0, halfWidth: 0, yBottom: 0, yTop: 0 };
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
): void {
  fillButtonColumn(column, menu, issues, view);
  shown = true;
  tie = side === 'right' ? 1 : -1;
}

/** The buttons are hidden (real scale, no session): nothing to keep clear of. */
export function clearButtonColumn(): void {
  shown = false;
}

/** The shown column, or null. */
export function getButtonColumn(): Readonly<ButtonColumn> | null {
  return shown ? column : null;
}

/** +1 when the column is on the right (the menu goes to the left on a tie), -1 when it is on the left. */
export function getButtonColumnTieSign(): 1 | -1 {
  return tie;
}
