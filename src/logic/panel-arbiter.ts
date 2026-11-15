// One pinned panel at a time (fix/panel-overlap). Pure: no imports from @iwsdk/core or three.
//
// The menu (palm or pinned), the View panel and the Issues panel all open in the SAME place: about half a metre in front of
// the head, centred on the gaze (`pinnedPanelAnchor`). Two of them side by side cannot both stay inside the 30 degree view cone
// (rule 8: each is 38-47 cm wide at 0.5-0.6 m), so the rule is that they are never open together: the panel that opens last
// wins and closes the others, at once (the same frame), whichever way it was opened (palm, fixed button, long pinch, debug key).
//
// This module holds the decision (who closes) and the measure used to prove it (the angular box a panel covers, as seen from
// the head, and whether two boxes overlap). The systems (src/systems/panel-arbiter.ts) carry it out.

import type { PanelExtent } from './menu';
import { pinnedPanelPoint } from './menu-anchor';
import type { Point3Like } from './view-fit';

/** The pinned panels that share the central view. */
export type PanelId = 'menu' | 'view' | 'issues';

export const PANEL_IDS: readonly PanelId[] = ['menu', 'view', 'issues'];

/** Which panels are open. */
export type OpenPanels = Readonly<Record<PanelId, boolean>>;

/**
 * Tie break when two panels claim the same stamp (never happens with the counter of the systems, but the result must still be
 * deterministic): the lower index stays open.
 */
const PRIORITY: readonly PanelId[] = ['menu', 'issues', 'view'];

/** The panels that must close when `opening` opens: every other panel that is open, in `PANEL_IDS` order. */
export function panelsToClose(opening: PanelId, open: OpenPanels): PanelId[] {
  const out: PanelId[] = [];
  for (const id of PANEL_IDS) if (id !== opening && open[id]) out.push(id);
  return out;
}

/**
 * The panel that stays when more than one is open: the one opened last (`openedAt` is a counter that grows with every opening;
 * a panel with no stamp counts as 0, so it never beats one that announced itself). Null when no panel is open.
 */
export function panelWinner(open: OpenPanels, openedAt: Readonly<Record<PanelId, number>>): PanelId | null {
  let winner: PanelId | null = null;
  for (const id of PRIORITY) {
    if (!open[id]) continue;
    if (winner === null || openedAt[id] > openedAt[winner]) winner = id;
  }
  return winner;
}

/** The panels that must close so that only the winner stays open (empty when at most one is open). */
export function panelsToReconcile(open: OpenPanels, openedAt: Readonly<Record<PanelId, number>>): PanelId[] {
  const winner = panelWinner(open, openedAt);
  const out: PanelId[] = [];
  for (const id of PANEL_IDS) if (open[id] && id !== winner) out.push(id);
  return out;
}

/** What a panel covers in the view of the user, in degrees from the gaze: azimuth (positive = to the left) and elevation (positive = up). */
export interface ViewBox {
  azMin: number;
  azMax: number;
  elMin: number;
  elMax: number;
}

const RAD_TO_DEG = 180 / Math.PI;
const corner: Point3Like = { x: 0, y: 0, z: 0 };

/**
 * The angular box of an upright panel (`anchor` is its bottom centre, `panelYaw` the way it faces, `extent` its size) seen from `head`
 * with a gaze whose heading is `gazeYaw` (radians, as `yawOfForward`). The box is the smallest rectangle in (azimuth, elevation)
 * that holds the four corners, which is what the user sees. Writes into `out` and returns it. Allocates nothing.
 */
export function panelViewBox(
  head: Readonly<Point3Like>,
  gazeYaw: number,
  anchor: Readonly<Point3Like>,
  panelYaw: number,
  extent: Readonly<PanelExtent>,
  out: ViewBox,
): ViewBox {
  out.azMin = Infinity;
  out.azMax = -Infinity;
  out.elMin = Infinity;
  out.elMax = -Infinity;
  for (let i = 0; i < 4; i += 1) {
    pinnedPanelPoint(anchor, panelYaw, i < 2 ? -extent.halfWidth : extent.halfWidth, i % 2 === 0 ? extent.bottom : extent.top, corner);
    const dx = corner.x - head.x;
    const dy = corner.y - head.y;
    const dz = corner.z - head.z;
    // Azimuth from the heading of the gaze, wrapped to -180..180 (a panel in front of the head is far from the wrap).
    let az = Math.atan2(-dx, -dz) - gazeYaw;
    while (az > Math.PI) az -= 2 * Math.PI;
    while (az < -Math.PI) az += 2 * Math.PI;
    const el = Math.atan2(dy, Math.hypot(dx, dz));
    const azDeg = az * RAD_TO_DEG;
    const elDeg = el * RAD_TO_DEG;
    if (azDeg < out.azMin) out.azMin = azDeg;
    if (azDeg > out.azMax) out.azMax = azDeg;
    if (elDeg < out.elMin) out.elMin = elDeg;
    if (elDeg > out.elMax) out.elMax = elDeg;
  }
  return out;
}

/**
 * Fraction (0..1) of the SMALLER of two view boxes that the other one covers: 0 when they do not touch, 1 when one holds the other.
 * `margin` (degrees) grows both boxes, so a gap smaller than it counts as touching.
 */
export function viewBoxOverlap(a: Readonly<ViewBox>, b: Readonly<ViewBox>, margin = 0): number {
  const w = Math.min(a.azMax + margin, b.azMax + margin) - Math.max(a.azMin - margin, b.azMin - margin);
  const h = Math.min(a.elMax + margin, b.elMax + margin) - Math.max(a.elMin - margin, b.elMin - margin);
  if (!(w > 0) || !(h > 0)) return 0;
  const areaA = (a.azMax - a.azMin + 2 * margin) * (a.elMax - a.elMin + 2 * margin);
  const areaB = (b.azMax - b.azMin + 2 * margin) * (b.elMax - b.elMin + 2 * margin);
  const smaller = Math.min(areaA, areaB);
  if (!(smaller > 0)) return 0;
  return Math.min(1, (w * h) / smaller);
}

/** The log line when an opening closed other panels: `panel arbiter opened=view closed=menu,issues` (`closed=-` when none). */
export function formatPanelArbiter(opened: PanelId, closed: readonly PanelId[]): string {
  return `panel arbiter opened=${opened} closed=${closed.length === 0 ? '-' : closed.join(',')}`;
}

/** The log line when two panels were found open together (a bug somewhere: the arbiter closes the older one). */
export function formatPanelConflict(kept: PanelId, closed: readonly PanelId[]): string {
  return `panel conflict kept=${kept} closed=${closed.join(',')}`;
}
