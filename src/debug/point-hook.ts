// Debug-only (`?debug=1`) hook for the pointing gesture: `window.__sogliaPoint`.
//
// The emulator (IWER) moves the wrist of a hand but bends its fingers only with a custom pose, so the QA can register one in the page and
// drive the REAL joints (qa/scenarios/POINT.helper.mjs). This hook is the fallback and the way to read the state:
//   status()            { phase, progress, left, right, hasHit, hit } (`left`/`right` say why a hand does not point)
//   hands(left, right)  synthetic hand poses for the recognition instead of the joints (null, null = back to the joints)
// Nothing here is in the normal path: the hook only exists with `?debug=1`.

import { slog } from '../log';
import type { PointHandSample } from '../logic/point-gesture';
import { debugPointHands, pointStatus } from '../systems/point-issue';

interface PointHook {
  status(): ReturnType<typeof pointStatus>;
  hands(left: PointHandSample | null, right: PointHandSample | null): void;
}

export function attachPointHook(): void {
  if (typeof window === 'undefined') return;
  const hook: PointHook = {
    status: () => pointStatus(),
    hands: (left, right) => debugPointHands(left, right),
  };
  (window as unknown as { __sogliaPoint?: PointHook }).__sogliaPoint = hook;
  slog('debug point hook ready (window.__sogliaPoint)');
}
