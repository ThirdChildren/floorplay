// Carries out the "one pinned panel at a time" rule of src/logic/panel-arbiter.ts for the menu, the View panel and the Issues
// panel. Not an ECS system: a small registry the three systems join in `init`.
//
// - `panelOpening(id)` is called by a panel the moment it decides to open (after its own checks, before it creates anything):
//   it stamps the panel and closes every other open panel at once, in the same frame.
// - `reconcilePanels()` is a safety net called every frame by the three systems: if two panels are ever found open together
//   (a path that forgot to call `panelOpening`), the one stamped last stays and the others close, with a `panel conflict` line.
//
// Nothing here allocates per frame while at most one panel is open (the usual case).

import { slog } from '../log';
import {
  PANEL_IDS,
  formatPanelArbiter,
  formatPanelConflict,
  panelWinner,
  panelsToClose,
  panelsToReconcile,
  type OpenPanels,
  type PanelId,
} from '../logic/panel-arbiter';

/** What the arbiter needs from a panel: is it open, and close it because `by` opened. */
export interface PanelSurface {
  isOpen: () => boolean;
  close: (by: PanelId) => void;
}

const surfaces = new Map<PanelId, PanelSurface>();
const openedAt: Record<PanelId, number> = { menu: 0, view: 0, issues: 0 };
const openNow: Record<PanelId, boolean> = { menu: false, view: false, issues: false };
let counter = 0;

/** Registers a panel. Returns the function that removes it (the system's teardown). */
export function registerPanel(id: PanelId, surface: PanelSurface): () => void {
  surfaces.set(id, surface);
  return () => {
    if (surfaces.get(id) === surface) surfaces.delete(id);
  };
}

function readOpen(): OpenPanels {
  for (const id of PANEL_IDS) openNow[id] = surfaces.get(id)?.isOpen() ?? false;
  return openNow;
}

function closeAll(ids: readonly PanelId[], by: PanelId): void {
  for (const id of ids) surfaces.get(id)?.close(by);
}

/**
 * `id` is about to open: stamps it and closes every other panel that is open. Call it after the checks that may refuse the opening
 * (no session, real scale) and before the panel is created, so a refused opening closes nothing.
 */
export function panelOpening(id: PanelId): void {
  counter += 1;
  openedAt[id] = counter;
  const closing = panelsToClose(id, readOpen());
  closeAll(closing, id);
  if (closing.length > 0) slog(formatPanelArbiter(id, closing));
}

/** Every frame: when more than one panel is open, only the one opened last stays. Allocates nothing when at most one is open. */
export function reconcilePanels(): void {
  const open = readOpen();
  let count = 0;
  for (const id of PANEL_IDS) if (open[id]) count += 1;
  if (count < 2) return;
  const winner = panelWinner(open, openedAt);
  if (winner === null) return;
  const losers = panelsToReconcile(open, openedAt);
  slog(formatPanelConflict(winner, losers));
  closeAll(losers, winner);
}
