// Pure logic of the start screen (the web page shown before the immersive session): which button state to show for Enter VR,
// the rows of the furniture sizes list, and whether the sizes changed since the page was built. No imports from @iwsdk/core or three.

import type { CatalogItem } from './catalog';
import {
  currentSizeCm,
  defaultSizeCm,
  hasOverride,
  limitsCm,
  type LimitsCm,
  type SizeCm,
  type SizeOverrides,
} from './catalog-sizes';

/**
 * What the browser says about an immersive session:
 * `checking` (the answer has not come yet), `supported`, `unsupported` (the browser answers no), `no-api` (no `navigator.xr`
 * or no `isSessionSupported`), `error` (the check threw).
 */
export type VrSupport = 'checking' | 'supported' | 'unsupported' | 'no-api' | 'error';

export type EnterVrNote =
  | 'loading' // the world is still being built
  | 'checking' // asking the browser
  | 'ready'
  | 'starting' // the session was requested, the browser has not answered
  | 'failed' // the request was refused or nothing happened
  | 'house-missing' // the selected house could not be loaded
  | 'sizes-unsaved' // sizes were changed but could not be saved, so they are not applied
  | 'unsupported'
  | 'no-api'
  | 'error';

export interface EnterVrInput {
  support: VrSupport;
  /** The world and the house are built: the session can start. */
  worldReady: boolean;
  /** The selected house loaded (false: it was not found or is invalid). */
  houseOk: boolean;
  /** A session was requested and has not started yet. */
  starting: boolean;
  /** The last request ended without a session. */
  failed: boolean;
}

export interface EnterVrState {
  enabled: boolean;
  note: EnterVrNote;
}

/** The state of the Enter VR button, from most to least important reason. The button is on only when nothing blocks it. */
export function enterVrState(input: EnterVrInput): EnterVrState {
  if (input.support === 'unsupported') return { enabled: false, note: 'unsupported' };
  if (input.support === 'no-api') return { enabled: false, note: 'no-api' };
  if (input.support === 'error') return { enabled: false, note: 'error' };
  if (!input.houseOk && input.worldReady) return { enabled: false, note: 'house-missing' };
  if (!input.worldReady) return { enabled: false, note: 'loading' };
  if (input.support === 'checking') return { enabled: false, note: 'checking' };
  if (input.starting) return { enabled: false, note: 'starting' };
  if (input.failed) return { enabled: true, note: 'failed' };
  return { enabled: true, note: 'ready' };
}

/** One line of the furniture list. */
export interface FurnitureRow {
  id: string;
  name: string;
  sizeCm: SizeCm;
  defaultCm: SizeCm;
  limits: [LimitsCm, LimitsCm, LimitsCm];
  changed: boolean;
}

/** The rows of the Furniture list: the `furniture` items of the catalog with their size now, in catalog order. */
export function furnitureRows(items: readonly CatalogItem[], overrides: SizeOverrides): FurnitureRow[] {
  return items
    .filter((item) => item.kind === 'furniture')
    .map((item) => {
      const defaultCm = defaultSizeCm(item);
      return {
        id: item.id,
        name: item.name,
        sizeCm: currentSizeCm(item, overrides),
        defaultCm,
        limits: [limitsCm(defaultCm, 0), limitsCm(defaultCm, 1), limitsCm(defaultCm, 2)],
        changed: hasOverride(overrides, item.id),
      };
    });
}

/** True when two sets of overrides give every item the same size. */
export function sameOverrides(a: SizeOverrides, b: SizeOverrides): boolean {
  const ids = new Set([...Object.keys(a), ...Object.keys(b)]);
  for (const id of ids) {
    const x = hasOverride(a, id) ? a[id] : null;
    const y = hasOverride(b, id) ? b[id] : null;
    if (x === null || y === null) {
      if (x !== y) return false;
      continue;
    }
    if (x[0] !== y[0] || x[1] !== y[1] || x[2] !== y[2]) return false;
  }
  return true;
}

/** "160 × 200 × 95 cm" (width, depth, height). */
export function formatSizeCm(size: SizeCm): string {
  return `${size[0]} × ${size[1]} × ${size[2]} cm`;
}
