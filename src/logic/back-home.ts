// "Back to home": the control of the palm menu that ends the immersive session so the start screen of the page (Load house file,
// Furniture sizes, Enter VR) is shown again. Pure logic: no imports from @iwsdk/core or three.
//
// The control only ENDS the session. Everything else is what already happens when a session ends (headset taken off, system menu,
// this control): the life cycle saves the state and cancels what is held (`src/logic/lifecycle.ts`), the viewpoint system puts the
// table-top model back WITHOUT touching the saved view, and the start screen listens to `sessionend` and shows itself again. The next
// Enter VR starts a session that finds the saved house, role, layout and view. Another house or new furniture sizes reload the page
// from the start screen, as before.

export interface BackHomeInput {
  /** A session is running (the XR manager has one). */
  hasSession: boolean;
  /** The session object has an `end` function (feature detection: a browser may not give one). */
  canEnd: boolean;
  /** The previous press already asked the session to end and it has not ended yet. */
  leaving: boolean;
  /** The start screen is on this page (false with `intro=0`, the automated test entry). */
  introOnPage: boolean;
}

export type BackHomeIgnored = 'no-session' | 'already-leaving' | 'end-unavailable';

export type BackHomeDecision =
  | {
      action: 'end-session';
      /** Where the user lands: the start screen of the page, or the plain page (with `intro=0` there is no start screen). */
      landing: 'intro' | 'page';
    }
  | { action: 'ignore'; reason: BackHomeIgnored };

/**
 * What a press of "Back to home" does. A press while a session is already ending, outside a session, or in a browser that cannot end
 * the session does nothing (the reason goes to the log).
 */
export function decideBackHome(input: BackHomeInput): BackHomeDecision {
  if (input.leaving) return { action: 'ignore', reason: 'already-leaving' };
  if (!input.hasSession) return { action: 'ignore', reason: 'no-session' };
  if (!input.canEnd) return { action: 'ignore', reason: 'end-unavailable' };
  return { action: 'end-session', landing: input.introOnPage ? 'intro' : 'page' };
}

/** Body of the log line of a press: `back to home requested landing=intro` or `back to home ignored reason=no-session`. */
export function formatBackHomeLine(decision: BackHomeDecision): string {
  return decision.action === 'end-session'
    ? `back to home requested landing=${decision.landing}`
    : `back to home ignored reason=${decision.reason}`;
}

/**
 * How long a press keeps the control locked while the browser has not answered (ms). A session that did not end after this long (the
 * promise never settled) lets the user try again.
 */
export const BACK_HOME_LOCK_MS = 4000;
