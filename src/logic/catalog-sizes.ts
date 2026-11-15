// Pure model of the size overrides of the furniture catalog (start screen, Furniture menu). The user may change the width,
// depth and height of a catalog item in whole centimetres; the overrides are saved in the browser and applied when the catalog
// is loaded, so every system sees the new size. No imports from @iwsdk/core or three, no browser APIs.
//
// Format of the stored text (key `CATALOG_SIZES_KEY`): {"version":1,"sizes":{"<catalog id>":[width,depth,height]}} in whole cm.
// An entry equal to the catalog default is never stored; an empty map is stored as no key at all.

import { FLAT_HEIGHT, type CatalogItem } from './catalog';

/** Key of the overrides in `localStorage`. `reset=1` keeps it: it is a setting of the user, like a loaded house, not saved state of a house. */
export const CATALOG_SIZES_KEY = 'soglia:v1:catalog-sizes';
export const CATALOG_SIZES_VERSION = 1;

export function isCatalogSizesKey(key: unknown): boolean {
  return key === CATALOG_SIZES_KEY;
}

/** Size in whole centimetres: [width, depth, height]. */
export type SizeCm = [number, number, number];
/** Catalog id -> size in cm. Only items whose size differs from the catalog default are present. */
export type SizeOverrides = Readonly<Record<string, SizeCm>>;

export const AXES = ['width', 'depth', 'height'] as const;
export type Axis = 0 | 1 | 2;

export interface LimitsCm {
  min: number;
  max: number;
}

/** Absolute bounds for any item, in cm. */
const ABS_MIN_CM: readonly [number, number, number] = [5, 5, 1];
const ABS_MAX_CM: readonly [number, number, number] = [400, 400, 300];
/** An item may shrink to a quarter and grow to three times its catalog size (a model stretched further stops looking like itself). */
const REL_MIN = 0.25;
const REL_MAX = 3;
const FLAT_HEIGHT_CM = Math.round(FLAT_HEIGHT * 100);

export const toCm = (meters: number): number => Math.round(meters * 100);
export const toMeters = (cm: number): number => cm / 100;

/** The catalog size of an item in whole cm (the size it has before any override). */
export function defaultSizeCm(item: Pick<CatalogItem, 'size' | 'defaultSize'>): SizeCm {
  const base = item.defaultSize ?? item.size;
  return [toCm(base[0]), toCm(base[1]), toCm(base[2])];
}

/**
 * The allowed range of one side, from the catalog default. A flat piece (a rug) stays flat: its height may only go from 1 to
 * 2 cm. A piece that is not flat cannot be made flat by mistake (at least 3 cm). The default is always inside the range.
 */
export function limitsCm(defaultCm: SizeCm, axis: Axis): LimitsCm {
  const base = defaultCm[axis];
  let min = Math.max(ABS_MIN_CM[axis], Math.ceil(base * REL_MIN));
  let max = Math.min(ABS_MAX_CM[axis], Math.floor(base * REL_MAX));
  if (axis === 2) {
    if (defaultCm[2] <= FLAT_HEIGHT_CM) {
      min = ABS_MIN_CM[2];
      max = FLAT_HEIGHT_CM;
    } else {
      min = Math.max(min, FLAT_HEIGHT_CM + 1);
    }
  }
  return { min: Math.min(min, base), max: Math.max(max, base) };
}

export type SizeCheck =
  | { ok: true; value: number }
  | { ok: false; reason: 'not-a-number' | 'too-small' | 'too-large'; limits: LimitsCm };

/** Checks one typed or computed value against the limits. Decimals are rounded to whole cm first. */
export function checkCm(value: number, limits: LimitsCm): SizeCheck {
  if (!Number.isFinite(value)) return { ok: false, reason: 'not-a-number', limits };
  const cm = Math.round(value);
  if (cm < limits.min) return { ok: false, reason: 'too-small', limits };
  if (cm > limits.max) return { ok: false, reason: 'too-large', limits };
  return { ok: true, value: cm };
}

export function clampCm(value: number, limits: LimitsCm): number {
  if (!Number.isFinite(value)) return limits.min;
  return Math.min(limits.max, Math.max(limits.min, Math.round(value)));
}

/** Reads what the user typed in a number box: "85", "85.5", "85,5", "85 cm". Null for anything else (empty, text, negative, hex, exponent). */
export function parseCmText(text: string): number | null {
  const match = /^\s*(\d{1,4}(?:[.,]\d{1,3})?)\s*(?:cm)?\s*$/i.exec(text);
  if (!match) return null;
  const value = Number(match[1].replace(',', '.'));
  return Number.isFinite(value) ? value : null;
}

/** One step up (+1) or down (-1), clamped. A value already at the limit stays there. */
export function stepCm(current: number, direction: 1 | -1, step: number, limits: LimitsCm): number {
  return clampCm(current + direction * step, limits);
}

const sameSize = (a: readonly number[], b: readonly number[]): boolean => a[0] === b[0] && a[1] === b[1] && a[2] === b[2];

/** The size of an item in cm now: the override when there is one, else the catalog default. */
export function currentSizeCm(item: Pick<CatalogItem, 'id' | 'size' | 'defaultSize'>, overrides: SizeOverrides): SizeCm {
  const own = Object.prototype.hasOwnProperty.call(overrides, item.id) ? overrides[item.id] : undefined;
  if (own) return [own[0], own[1], own[2]];
  return defaultSizeCm(item);
}

/** True when the item has a size that is not its catalog default. */
export function hasOverride(overrides: SizeOverrides, id: string): boolean {
  return Object.prototype.hasOwnProperty.call(overrides, id);
}

/**
 * New overrides with one side of one item changed. The value is clamped to the limits; when the item ends up with its
 * default size again, its entry is removed. `item` is the item WITH its default (`defaultSize` or the plain catalog size).
 */
export function withSide(overrides: SizeOverrides, item: Pick<CatalogItem, 'id' | 'size' | 'defaultSize'>, axis: Axis, cm: number): SizeOverrides {
  const base = defaultSizeCm(item);
  const next = currentSizeCm(item, overrides);
  next[axis] = clampCm(cm, limitsCm(base, axis));
  const out: Record<string, SizeCm> = { ...overrides };
  if (sameSize(next, base)) delete out[item.id];
  else out[item.id] = next;
  return out;
}

/** New overrides without the entry of one item. */
export function withoutItem(overrides: SizeOverrides, id: string): SizeOverrides {
  if (!hasOverride(overrides, id)) return overrides;
  const out: Record<string, SizeCm> = { ...overrides };
  delete out[id];
  return out;
}

export const NO_OVERRIDES: SizeOverrides = Object.freeze({});

export function overrideCount(overrides: SizeOverrides): number {
  return Object.keys(overrides).length;
}

/** The result of reading what was stored. `dropped` has one line per entry that could not be used (the app logs it). */
export interface OverridesRead {
  overrides: SizeOverrides;
  dropped: string[];
}

const isRecord = (v: unknown): v is Record<string, unknown> => typeof v === 'object' && v !== null && !Array.isArray(v);

/**
 * Reads the stored text (untrusted: the user or another version of the app may have written it). Anything wrong is left out, never
 * thrown: bad JSON, an unknown version, an id that is not in `items`, a size that is not three numbers. A side outside the limits is
 * clamped. An entry that equals the default is dropped. Old text with no key at all simply gives no overrides.
 */
export function readOverrides(text: string | null, items: readonly CatalogItem[]): OverridesRead {
  const none: OverridesRead = { overrides: NO_OVERRIDES, dropped: [] };
  if (text === null || text.trim() === '') return none;
  let data: unknown;
  try {
    data = JSON.parse(text);
  } catch {
    return { overrides: NO_OVERRIDES, dropped: ['catalog sizes: stored text is not valid JSON'] };
  }
  if (!isRecord(data) || data.version !== CATALOG_SIZES_VERSION || !isRecord(data.sizes)) {
    return { overrides: NO_OVERRIDES, dropped: ['catalog sizes: unknown format'] };
  }
  const known = new Map(items.map((item) => [item.id, item] as const));
  const out: Record<string, SizeCm> = {};
  const dropped: string[] = [];
  for (const id of Object.keys(data.sizes)) {
    const item = known.get(id);
    if (!item) {
      dropped.push(`catalog sizes: "${id}" is not in the catalog`);
      continue;
    }
    const raw = data.sizes[id];
    if (!Array.isArray(raw) || raw.length !== 3 || !raw.every((v) => typeof v === 'number' && Number.isFinite(v))) {
      dropped.push(`catalog sizes: "${id}" is not three numbers`);
      continue;
    }
    const base = defaultSizeCm(item);
    const size: SizeCm = [
      clampCm(raw[0] as number, limitsCm(base, 0)),
      clampCm(raw[1] as number, limitsCm(base, 1)),
      clampCm(raw[2] as number, limitsCm(base, 2)),
    ];
    if (!sameSize(size, base)) out[id] = size;
  }
  return { overrides: out, dropped };
}

/** The text to store, or null when there is nothing to store (the key is then removed). */
export function serializeOverrides(overrides: SizeOverrides): string | null {
  const ids = Object.keys(overrides).sort();
  if (ids.length === 0) return null;
  const sizes: Record<string, SizeCm> = {};
  for (const id of ids) sizes[id] = [overrides[id][0], overrides[id][1], overrides[id][2]];
  return JSON.stringify({ version: CATALOG_SIZES_VERSION, sizes });
}

/**
 * The catalog the app works with: a copy of `items` where every item with an override has the new `size` (metres) and keeps its
 * catalog size in `defaultSize` (the glTF models are drawn at that size and scaled to the new one). Items without an override
 * are returned as they are, so a user with no overrides gets exactly the catalog of the file.
 */
export function applyCatalogSizes(items: readonly CatalogItem[], overrides: SizeOverrides): CatalogItem[] {
  return items.map((item) => {
    if (!hasOverride(overrides, item.id)) return item;
    const cm = overrides[item.id];
    return {
      ...item,
      size: [toMeters(cm[0]), toMeters(cm[1]), toMeters(cm[2])],
      defaultSize: [item.size[0], item.size[1], item.size[2]],
    };
  });
}

/**
 * The scale of a glTF model to show it at the item size, in the AXES OF THE MODEL: x = width, y = HEIGHT (up), z = depth. The sizes
 * of the catalog are [width, depth, height], so the depth ratio goes to z and the height ratio to y (never straight to x, y, z).
 * `natural` is the size of the model as drawn, [width, depth, height] in metres: the catalog default when omitted, the measured
 * bounding box of the glTF when the app knows it. A side with no extent keeps the scale 1. 1,1,1 when nothing changed.
 */
export function modelScale(
  item: Pick<CatalogItem, 'size' | 'defaultSize'>,
  natural?: readonly [number, number, number],
): [number, number, number] {
  const base = natural ?? item.defaultSize;
  if (!base) return [1, 1, 1];
  const ratio = (size: number, from: number): number => (from > 1e-6 && Number.isFinite(from) ? size / from : 1);
  return [ratio(item.size[0], base[0]), ratio(item.size[2], base[2]), ratio(item.size[1], base[1])];
}

/**
 * The size [width, depth, height] a model of natural size `natural` takes once scaled by `scale` (axes of the model, see
 * `modelScale`). It is what the headset draws: tests compare it with the size asked for.
 */
export function scaledModelSize(
  natural: readonly [number, number, number],
  scale: readonly [number, number, number],
): [number, number, number] {
  return [natural[0] * scale[0], natural[1] * scale[2], natural[2] * scale[1]];
}
