// "Back to home" (the control at the right end of the header of the palm menu): ends the immersive session so the start screen of the
// page shows again. Not an ECS system and nothing runs per frame: the menu calls `backToHome()` from a pinch.
//
// It only asks the session to end. What follows is the ordinary end of a session (the same as taking the headset off): the life
// cycle saves the state and cancels what is held (src/systems/lifecycle.ts), the viewpoint system puts the table-top model back
// without touching the saved view (src/systems/viewpoint.ts), and the start screen listens to `sessionend` and shows itself again
// (src/ui/intro-screen.ts). With `intro=0` there is no start screen: the session ends and the plain page (the box of the homes) shows.

import type { World } from '@iwsdk/core';
import { slog, swarn } from '../log';
import { BACK_HOME_LOCK_MS, decideBackHome, formatBackHomeLine } from '../logic/back-home';

interface BackHomeContext {
  world: World;
  introOnPage: boolean;
  leaving: boolean;
  /** Clears `leaving` after `BACK_HOME_LOCK_MS` when the browser never answers. */
  timer: ReturnType<typeof setTimeout> | undefined;
}

let context: BackHomeContext | null = null;

/** The slice of an XR session this file uses: `end` is feature-detected, not assumed. */
interface EndableSession {
  end?: () => Promise<void>;
}

/**
 * Prepares the control. `introOnPage` is true when the page has the start screen (false with `intro=0`). Listens to the end of the
 * session so a second press is possible in the next one.
 */
export function createBackHome(world: World, introOnPage: boolean): void {
  const state: BackHomeContext = { world, introOnPage, leaving: false, timer: undefined };
  context = state;
  const xr = world.renderer?.xr;
  if (!xr || typeof xr.addEventListener !== 'function') {
    slog('feature XRManager session events unavailable');
    return;
  }
  xr.addEventListener('sessionend', () => unlock(state));
}

function unlock(state: BackHomeContext): void {
  state.leaving = false;
  if (state.timer !== undefined) clearTimeout(state.timer);
  state.timer = undefined;
}

/** The press of "Back to home": ends the session, once. */
export function backToHome(): void {
  const state = context;
  if (!state) return;
  const xr = state.world.renderer?.xr;
  const session = xr && xr.isPresenting && typeof xr.getSession === 'function' ? (xr.getSession() as unknown as EndableSession | null) : null;
  const decision = decideBackHome({
    hasSession: session !== null,
    canEnd: session !== null && typeof session.end === 'function',
    leaving: state.leaving,
    introOnPage: state.introOnPage,
  });
  slog(formatBackHomeLine(decision));
  if (decision.action === 'ignore') {
    if (decision.reason === 'end-unavailable') slog('feature session.end unavailable');
    return;
  }
  state.leaving = true;
  state.timer = setTimeout(() => unlock(state), BACK_HOME_LOCK_MS);
  try {
    // `end` is a promise in browsers; the `sessionend` event is what clears the lock and brings the start screen back.
    const ended = session?.end?.();
    if (ended && typeof ended.catch === 'function') {
      ended.catch((error: unknown) => {
        swarn(`back to home failed: ${error instanceof Error ? error.message : String(error)}`);
        unlock(state);
      });
    }
  } catch (error) {
    swarn(`back to home failed: ${error instanceof Error ? error.message : String(error)}`);
    unlock(state);
  }
}
