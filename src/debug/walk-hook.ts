// Debug-only (`?debug=1`) hook for the walk (plan docs/plans/WALK.md): `window.__sogliaWalk`.
//
// The emulator (IWER) moves the wrist of a hand but cannot bend its fingers without a custom pose (the QA registers a fist pose in the page), so the gesture recognition itself is
// tested with synthetic joint poses in Vitest (tests/unit/row-gesture.test.ts). This hook lets the QA drive the REST of the walk in
// the emulator through the same code path the real gesture uses (the speed goes through the same step, collisions, root placement,
// vignette and store as a row):
//   drive(speed, seconds)  walk at `speed` m/s along the gaze for `seconds` (as if the hands had rowed at that speed)
//   leave()                the same request as the "Tabletop" button (the way in is a pinch on a viewpoint marker)
//   status()               { walking, speed, x, z, vignette, left, right } (`left`/`right` say why a hand does not qualify)
//   hands(l, r)            synthetic hand poses for `updateRow` (null, null = back to the real joints)
// Nothing here is in the normal path: the hook only exists with `?debug=1`.

import { slog } from '../log';
import { requestTabletop } from '../systems/viewpoint';
import { debugDrive, debugHandSamples, walkStatus } from '../systems/walk';
import type { RowHandSample } from '../logic/row-gesture';

interface WalkHook {
  drive(speed: number, seconds: number): void;
  leave(): boolean;
  status(): ReturnType<typeof walkStatus>;
  hands(left: RowHandSample | null, right: RowHandSample | null): void;
}

export function attachWalkHook(): void {
  if (typeof window === 'undefined') return;
  const hook: WalkHook = {
    drive: (speed, seconds) => debugDrive(speed, seconds),
    leave: () => requestTabletop('button'),
    status: () => walkStatus(),
    hands: (left, right) => debugHandSamples(left, right),
  };
  (window as unknown as { __sogliaWalk?: WalkHook }).__sogliaWalk = hook;
  slog('debug walk hook ready (window.__sogliaWalk)');
}
