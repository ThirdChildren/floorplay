// How the immersive session is entered from the start screen (`src/ui/intro-screen.ts`). Nothing here runs with `intro=0`, where the
// SDK keeps offering the session to the browser as before.
//
// With the start screen the session is NOT offered: the SDK's offer (`navigator.xr.offerSession`) would let the browser start VR
// without the start screen. Instead the Enter VR button of the page calls `launchXR`, from the press itself (a session can only be
// requested from a user gesture, so the world is built before the press and the press does nothing slow).

import type { World, WorldOptions } from '@iwsdk/core';
import { slog, swarn } from '../log';
import type { VrSupport } from '../logic/intro';

export type ImmersiveMode = 'immersive-vr' | 'immersive-ar';

/**
 * `navigator.xr.isSessionSupported(mode)`, guarded (the Quest Browser and the IWER emulator answer it; other browsers may not have
 * WebXR at all). Never throws.
 */
export async function probeImmersiveSupport(mode: ImmersiveMode): Promise<VrSupport> {
  const xr = typeof navigator !== 'undefined' ? navigator.xr : undefined;
  if (!xr || typeof xr.isSessionSupported !== 'function') {
    slog('feature navigator.xr unavailable');
    return 'no-api';
  }
  try {
    const supported = await xr.isSessionSupported(mode);
    if (!supported) slog(`feature ${mode} unavailable`);
    return supported ? 'supported' : 'unsupported';
  } catch (error) {
    swarn(`${mode} probe failed: ${error instanceof Error ? error.message : String(error)}`);
    return 'error';
  }
}

/** A COPY of the project options where the session is not offered to the browser (the start screen starts it). */
export function withoutSessionOffer(base: WorldOptions): WorldOptions {
  if (base.xr === false) return base;
  return { ...base, xr: { ...(base.xr ?? {}), offer: 'none' } };
}

/** How long to wait for the browser to answer a request for a session before the page says it did not start (ms). */
const POLL_MS = 400;
const GIVE_UP_MS = 60_000;

/**
 * Requests the immersive session of the world (call it from the press of a button). `settled(true)` when a session started,
 * `settled(false)` when the request ended without one (refused, cancelled, not possible). The SDK reports the reason in the console.
 */
export function requestImmersive(world: World, settled: (started: boolean) => void): void {
  try {
    world.launchXR();
  } catch (error) {
    swarn(`enter vr failed: ${error instanceof Error ? error.message : String(error)}`);
    settled(false);
    return;
  }
  const startedAt = Date.now();
  const timer = setInterval(() => {
    if (world.session) {
      clearInterval(timer);
      settled(true);
    } else if (!world.sessionRequestPending || Date.now() - startedAt > GIVE_UP_MS) {
      clearInterval(timer);
      slog('enter vr: no session started');
      settled(false);
    }
  }, POLL_MS);
}
