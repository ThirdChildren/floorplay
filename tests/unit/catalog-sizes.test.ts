import { describe, expect, it } from 'vitest';
import { createCatalogSizeStore } from '../../src/data/catalog-sizes';
import { clearSogliaKeys, createSafeStorage } from '../../src/data/storage';
import { checkCatalog, footprint, type CatalogItem } from '../../src/logic/catalog';
import {
  CATALOG_SIZES_KEY,
  NO_OVERRIDES,
  applyCatalogSizes,
  checkCm,
  clampCm,
  currentSizeCm,
  defaultSizeCm,
  hasOverride,
  limitsCm,
  modelScale,
  scaledModelSize,
  overrideCount,
  parseCmText,
  readOverrides,
  serializeOverrides,
  stepCm,
  withSide,
  withoutItem,
  type SizeOverrides,
} from '../../src/logic/catalog-sizes';
import { formatSize } from '../../src/logic/furniture-label';
import { glbBounds } from '../helpers/glb-bounds';
import { loadJson } from '../helpers/load-json';

const catalog = (): CatalogItem[] => {
  const check = checkCatalog(loadJson('public/catalog', 'catalog.json'));
  if (!check.ok) throw new Error(check.errors.join('; '));
  return check.items;
};
const find = (items: readonly CatalogItem[], id: string): CatalogItem => {
  const item = items.find((i) => i.id === id);
  if (!item) throw new Error(`no ${id}`);
  return item;
};

describe('limitsCm', () => {
  it('is a quarter to three times the catalog size, inside the absolute bounds', () => {
    const bed = defaultSizeCm(find(catalog(), 'bed-double'));
    expect(bed).toEqual([160, 200, 95]);
    expect(limitsCm(bed, 0)).toEqual({ min: 40, max: 400 });
    expect(limitsCm(bed, 1)).toEqual({ min: 50, max: 400 });
    expect(limitsCm(bed, 2)).toEqual({ min: 24, max: 285 });
  });

  it('never goes below 5 cm of width or depth', () => {
    expect(limitsCm([10, 10, 50], 0).min).toBe(5);
  });

  it('keeps a flat piece flat and a tall piece from becoming flat', () => {
    const rug = defaultSizeCm(find(catalog(), 'rug'));
    expect(rug[2]).toBe(1);
    expect(limitsCm(rug, 2)).toEqual({ min: 1, max: 2 });
    expect(limitsCm([30, 30, 4], 2).min).toBe(3);
  });

  it('always contains the default of every catalog item, on every side', () => {
    for (const item of catalog()) {
      const base = defaultSizeCm(item);
      for (const axis of [0, 1, 2] as const) {
        const { min, max } = limitsCm(base, axis);
        expect(min).toBeLessThanOrEqual(base[axis]);
        expect(max).toBeGreaterThanOrEqual(base[axis]);
      }
    }
  });
});

describe('checkCm, clampCm, stepCm, parseCmText', () => {
  const lim = { min: 40, max: 400 };

  it('accepts values inside the limits and rounds decimals', () => {
    expect(checkCm(160, lim)).toEqual({ ok: true, value: 160 });
    expect(checkCm(160.6, lim)).toEqual({ ok: true, value: 161 });
  });

  it('says why a value is refused', () => {
    expect(checkCm(39, lim)).toMatchObject({ ok: false, reason: 'too-small' });
    expect(checkCm(401, lim)).toMatchObject({ ok: false, reason: 'too-large' });
    expect(checkCm(Number.NaN, lim)).toMatchObject({ ok: false, reason: 'not-a-number' });
    expect(checkCm(Infinity, lim)).toMatchObject({ ok: false, reason: 'not-a-number' });
  });

  it('clamps and steps without leaving the limits', () => {
    expect(clampCm(1000, lim)).toBe(400);
    expect(clampCm(-5, lim)).toBe(40);
    expect(clampCm(Number.NaN, lim)).toBe(40);
    expect(stepCm(398, 1, 5, lim)).toBe(400);
    expect(stepCm(400, 1, 5, lim)).toBe(400);
    expect(stepCm(42, -1, 5, lim)).toBe(40);
    expect(stepCm(100, 1, 5, lim)).toBe(105);
  });

  it('parses what a person types', () => {
    expect(parseCmText('85')).toBe(85);
    expect(parseCmText(' 85 cm ')).toBe(85);
    expect(parseCmText('85,5')).toBe(85.5);
    expect(parseCmText('85.5')).toBe(85.5);
    for (const bad of ['', ' ', 'abc', '-5', '1e3', '0x10', '12345', '8 5', '5..5', '<b>1</b>', 'NaN']) {
      expect(parseCmText(bad)).toBeNull();
    }
  });
});

describe('overrides', () => {
  const items = catalog();
  const bed = find(items, 'bed-double');

  it('changing one side keeps the others at the default', () => {
    const o = withSide(NO_OVERRIDES, bed, 0, 170);
    expect(o).toEqual({ 'bed-double': [170, 200, 95] });
    expect(currentSizeCm(bed, o)).toEqual([170, 200, 95]);
    expect(hasOverride(o, 'bed-double')).toBe(true);
    expect(NO_OVERRIDES).toEqual({});
  });

  it('clamps a side to its limits', () => {
    expect(withSide(NO_OVERRIDES, bed, 0, 9999)['bed-double'][0]).toBe(400);
    expect(withSide(NO_OVERRIDES, bed, 2, 0)['bed-double'][2]).toBe(24);
  });

  it('removes the entry when the item is back at its default', () => {
    const changed = withSide(NO_OVERRIDES, bed, 1, 210);
    expect(overrideCount(changed)).toBe(1);
    expect(withSide(changed, bed, 1, 200)).toEqual({});
  });

  it('resets one item or all of them without touching the input', () => {
    const chair = find(items, 'chair');
    const two = withSide(withSide(NO_OVERRIDES, bed, 0, 170), chair, 0, 50);
    expect(Object.keys(withoutItem(two, 'bed-double'))).toEqual(['chair']);
    expect(Object.keys(two)).toHaveLength(2);
    expect(withoutItem(two, 'unknown')).toBe(two);
  });

  it('applies the sizes in metres, keeps the catalog size and leaves other items as they are', () => {
    const o = withSide(NO_OVERRIDES, bed, 0, 170);
    const applied = applyCatalogSizes(items, o);
    const newBed = find(applied, 'bed-double');
    expect(newBed.size).toEqual([1.7, 2, 0.95]);
    expect(newBed.defaultSize).toEqual([1.6, 2, 0.95]);
    expect(find(applied, 'chair')).toBe(find(items, 'chair'));
    expect(bed.size).toEqual([1.6, 2, 0.95]);
    expect(applyCatalogSizes(items, NO_OVERRIDES).every((item, i) => item === items[i])).toBe(true);
  });

  it('the collision footprint and the menu text follow the new size', () => {
    const newBed = find(applyCatalogSizes(items, withSide(NO_OVERRIDES, bed, 0, 165)), 'bed-double');
    expect(footprint(newBed, 0)).toEqual([1.65, 2]);
    expect(footprint(newBed, 90)).toEqual([2, 1.65]);
    expect(formatSize(newBed.size[0], newBed.size[1])).toBe('1.65 × 2.0 m');
  });

  it('the model scale is the new size over the catalog size', () => {
    const newBed = find(applyCatalogSizes(items, withSide(NO_OVERRIDES, bed, 0, 80)), 'bed-double');
    expect(modelScale(newBed)).toEqual([0.5, 1, 1]);
    expect(modelScale(bed)).toEqual([1, 1, 1]);
  });

  it('the model scale is in the axes of the model: depth goes to z, height to y (regression: they were swapped)', () => {
    const chair = find(items, 'chair'); // 45 x 50 x 85 cm
    const big = find(applyCatalogSizes(items, { chair: [45, 100, 85] }), 'chair'); // only the depth doubles
    expect(modelScale(big)).toEqual([1, 1, 2]);
    const tall = find(applyCatalogSizes(items, { chair: [45, 50, 100] }), 'chair'); // only the height changes
    const [sx, sy, sz] = modelScale(tall);
    expect([sx, sz]).toEqual([1, 1]);
    expect(sy).toBeCloseTo(100 / 85, 12);
    expect(modelScale(chair)).toEqual([1, 1, 1]);
  });

  it('a side the model has no extent on keeps the scale 1 instead of dividing by zero', () => {
    const item = { size: [1, 1, 1] as [number, number, number], defaultSize: [1, 1, 1] as [number, number, number] };
    expect(modelScale(item, [0, 1, 1])).toEqual([1, 1, 1]);
    expect(modelScale(item, [Number.NaN, 2, 0.5])).toEqual([1, 2, 0.5]);
  });
});

describe('the rendered size of a resized model is the size asked for', () => {
  const items = catalog();
  const withModel = items.filter((item) => typeof item.model === 'string');

  it('every catalog model is as large as the catalog says (so the default size scale is right)', () => {
    expect(withModel.length).toBeGreaterThan(10);
    for (const item of withModel) {
      const bounds = glbBounds(`${item.model}`);
      for (let axis = 0; axis < 3; axis++) expect(bounds.size[axis], `${item.id} axis ${axis}`).toBeCloseTo(item.size[axis], 2);
    }
  });

  it('after the scale, the box of every item is width x depth x height for each side changed on its own and for all together', () => {
    const cases: ReadonlyArray<(base: [number, number, number]) => [number, number, number]> = [
      ([w, d, h]) => [Math.round(w * 125), d * 100, h * 100],
      ([w, d, h]) => [w * 100, Math.round(d * 150), h * 100],
      ([w, d, h]) => [w * 100, d * 100, Math.round(h * 80)],
      ([w, d, h]) => [Math.round(w * 60), Math.round(d * 130), Math.round(h * 170)],
    ];
    for (const item of withModel) {
      const natural = glbBounds(`${item.model}`).size;
      for (const make of cases) {
        const raw = make(item.size);
        const base = defaultSizeCm(item);
        const cm: [number, number, number] = [0, 1, 2].map((axis) => clampCm(raw[axis], limitsCm(base, axis as 0 | 1 | 2))) as [number, number, number];
        const resized = find(applyCatalogSizes(items, { [item.id]: cm }), item.id);
        const drawn = scaledModelSize(natural, modelScale(resized, natural));
        for (let axis = 0; axis < 3; axis++) {
          expect(drawn[axis], `${item.id} ${cm.join('x')} axis ${axis}`).toBeCloseTo(cm[axis] / 100, 3);
        }
        // the same with the scale from the catalog number only (what an item that was not measured gets)
        const fromCatalog = scaledModelSize(natural, modelScale(resized));
        for (let axis = 0; axis < 3; axis++) expect(fromCatalog[axis]).toBeCloseTo(cm[axis] / 100, 2);
      }
    }
  });

  it('reproduces the reported bug: with the real bed a height of 120 cm gave a model 190 cm deep and 95 cm high', () => {
    const bed = find(items, 'bed-double'); // 160 x 200 x 95
    const natural = glbBounds(`${bed.model}`).size;
    const resized = find(applyCatalogSizes(items, { 'bed-double': [160, 200, 120] }), 'bed-double');
    const [sx, sy, sz] = modelScale(resized);
    // the old code set scale.set(sx, depthRatio, heightRatio): depth 1, height 1.263
    const drawn = scaledModelSize(natural, [sx, sy, sz]);
    expect(drawn[0]).toBeCloseTo(1.6, 3);
    expect(drawn[1]).toBeCloseTo(2.0, 3);
    expect(drawn[2]).toBeCloseTo(1.2, 3);
    const old = [resized.size[0] / bed.size[0], resized.size[1] / bed.size[1], resized.size[2] / bed.size[2]];
    expect(natural[1] * old[2]).toBeGreaterThan(2.4); // the old depth: 2.0 x 1.263 = 2.53 m instead of 2.0 m
    expect(natural[2] * old[1]).toBeCloseTo(0.95, 3); // the old height did not change
  });
});

describe('readOverrides and serializeOverrides', () => {
  const items = catalog();

  it('round-trips and writes nothing for no overrides', () => {
    const o: SizeOverrides = { 'bed-double': [170, 200, 95], chair: [50, 50, 85] };
    const text = serializeOverrides(o);
    expect(text).not.toBeNull();
    expect(readOverrides(text, items)).toEqual({ overrides: o, dropped: [] });
    expect(serializeOverrides(NO_OVERRIDES)).toBeNull();
  });

  it('gives no overrides for a missing key (old saved states)', () => {
    expect(readOverrides(null, items)).toEqual({ overrides: {}, dropped: [] });
    expect(readOverrides('', items)).toEqual({ overrides: {}, dropped: [] });
  });

  it('never throws on bad text and says what it dropped', () => {
    expect(readOverrides('not json', items).overrides).toEqual({});
    expect(readOverrides('not json', items).dropped).toHaveLength(1);
    expect(readOverrides('[]', items).dropped).toHaveLength(1);
    expect(readOverrides('{"version":2,"sizes":{}}', items).dropped).toHaveLength(1);
    expect(readOverrides('{"version":1}', items).dropped).toHaveLength(1);
  });

  it('drops unknown ids and entries that are not three numbers', () => {
    const text = JSON.stringify({
      version: 1,
      sizes: {
        'no-such-item': [10, 10, 10],
        chair: [50, 50],
        armchair: [80, '80', 85],
        plant: [null, 35, 90],
        'bed-single': [95, 200, 90],
      },
    }).replace('"bed-single"', '"__proto__":[1,2,3],"bed-single"');
    const r = readOverrides(text, items);
    expect(Object.keys(r.overrides)).toEqual(['bed-single']);
    expect(r.dropped).toHaveLength(5);
  });

  it('clamps values outside the limits and drops entries equal to the default', () => {
    const text = JSON.stringify({ version: 1, sizes: { chair: [9999, 1, 85], armchair: [80, 80, 85] } });
    const r = readOverrides(text, items);
    expect(r.overrides).toEqual({ chair: [135, 13, 85] });
  });
});

describe('createCatalogSizeStore', () => {
  const items = catalog();
  const memoryStorage = (failWrites = false) => {
    const map = new Map<string, string>();
    const storage = {
      get length() {
        return map.size;
      },
      key: (i: number) => [...map.keys()][i] ?? null,
      getItem: (k: string) => map.get(k) ?? null,
      setItem: (k: string, v: string) => {
        if (failWrites && k !== 'soglia:v1:probe') throw Object.assign(new Error('full'), { name: 'QuotaExceededError', code: 22 });
        map.set(k, String(v));
      },
      removeItem: (k: string) => void map.delete(k),
      clear: () => map.clear(),
    } as Storage;
    return { map, storage };
  };
  const safe = (storage: Storage | null) => createSafeStorage(() => storage, () => undefined);

  it('saves in the key soglia:v1:catalog-sizes and reads it in a new page', () => {
    const { map, storage } = memoryStorage();
    const store = createCatalogSizeStore(safe(storage));
    const o = withSide(NO_OVERRIDES, find(items, 'bed-double'), 0, 170);
    expect(store.write(o)).toBe(true);
    expect(store.persisted()).toBe(true);
    expect(CATALOG_SIZES_KEY).toBe('soglia:v1:catalog-sizes');
    expect(map.has('soglia:v1:catalog-sizes')).toBe(true);
    expect(createCatalogSizeStore(safe(storage)).read(items)).toEqual(o);
  });

  it('removes the key when the last override is reset', () => {
    const { map, storage } = memoryStorage();
    const store = createCatalogSizeStore(safe(storage));
    store.write(withSide(NO_OVERRIDES, find(items, 'chair'), 0, 50));
    store.write(NO_OVERRIDES);
    expect(map.has(CATALOG_SIZES_KEY)).toBe(false);
    expect(store.read(items)).toEqual({});
  });

  it('keeps the sizes in memory when storage is missing, and says they are not persisted', () => {
    const store = createCatalogSizeStore(safe(null));
    const o = withSide(NO_OVERRIDES, find(items, 'chair'), 0, 50);
    expect(store.write(o)).toBe(false);
    expect(store.persisted()).toBe(false);
    expect(store.read(items)).toEqual(o);
  });

  it('keeps the sizes in memory when a write is refused', () => {
    const { storage } = memoryStorage(true);
    const store = createCatalogSizeStore(safe(storage));
    const o = withSide(NO_OVERRIDES, find(items, 'chair'), 0, 50);
    expect(store.write(o)).toBe(false);
    expect(store.read(items)).toEqual(o);
  });

  it('reset=1 (clearSogliaKeys) keeps the sizes and removes the saved state of a house', () => {
    const { map, storage } = memoryStorage();
    const s = safe(storage);
    const store = createCatalogSizeStore(s);
    store.write(withSide(NO_OVERRIDES, find(items, 'chair'), 0, 50));
    map.set('soglia:v1:state:apartment-a', '{}');
    expect(clearSogliaKeys(s)).toBe(1);
    expect([...map.keys()]).toEqual([CATALOG_SIZES_KEY]);
  });
});
