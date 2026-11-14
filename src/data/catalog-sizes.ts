// The size overrides of the furniture catalog, kept in `localStorage` through `createSafeStorage` (key `soglia:v1:catalog-sizes`).
// When storage is missing or refuses a write, the overrides are kept in memory for this page only and `persisted()` says so:
// the start screen then tells the user that the sizes cannot be applied (applying them needs a reload, which would lose them).
// Never throws. No network.

import { slog, swarn } from '../log';
import {
  CATALOG_SIZES_KEY,
  overrideCount,
  readOverrides,
  serializeOverrides,
  type SizeOverrides,
} from '../logic/catalog-sizes';
import type { CatalogItem } from '../logic/catalog';
import type { SafeStorage } from './storage';

export interface CatalogSizeStore {
  /** The overrides now (memory first, else storage), checked against `items`. Lines for unusable entries are logged once. */
  read(items: readonly CatalogItem[]): SizeOverrides;
  /** Keeps the overrides. True when they are in storage (they survive a reload); false when only memory has them. */
  write(overrides: SizeOverrides): boolean;
  /** True when the last write reached storage (or there was nothing to write). */
  persisted(): boolean;
}

export function createCatalogSizeStore(storage: SafeStorage): CatalogSizeStore {
  // `undefined`: nothing written in this page yet, read storage. `null`: written, nothing to keep.
  let memory: string | null | undefined;
  let persisted = true;
  let warned = false;

  return {
    read(items) {
      const text = memory !== undefined ? memory : storage.get(CATALOG_SIZES_KEY);
      const result = readOverrides(text, items);
      if (!warned && result.dropped.length > 0) {
        warned = true;
        for (const line of result.dropped) swarn(line);
      }
      return result.overrides;
    },
    write(overrides) {
      const text = serializeOverrides(overrides);
      memory = text;
      // Nothing to keep is always "saved": after a reload there is no key either way.
      let ok = true;
      if (text === null) storage.remove(CATALOG_SIZES_KEY);
      else ok = storage.set(CATALOG_SIZES_KEY, text);
      persisted = ok;
      if (!ok) slog('catalog sizes kept in memory only');
      else slog(`catalog sizes saved items=${overrideCount(overrides)}`);
      return ok;
    },
    persisted: () => persisted,
  };
}
