import { describe, expect, it } from 'vitest';
import { checkCatalog, type CatalogItem } from '../../src/logic/catalog';
import { NO_OVERRIDES, withSide } from '../../src/logic/catalog-sizes';
import { enterVrState, formatSizeCm, furnitureRows, sameOverrides, type EnterVrInput } from '../../src/logic/intro';
import { loadJson } from '../helpers/load-json';

const catalog = (): CatalogItem[] => {
  const check = checkCatalog(loadJson('public/catalog', 'catalog.json'));
  if (!check.ok) throw new Error(check.errors.join('; '));
  return check.items;
};

const ready: EnterVrInput = { support: 'supported', worldReady: true, houseOk: true, starting: false, failed: false };

describe('enterVrState', () => {
  it('is on when everything is ready', () => {
    expect(enterVrState(ready)).toEqual({ enabled: true, note: 'ready' });
  });

  it('is off, with a clear note, when the browser has no immersive session', () => {
    expect(enterVrState({ ...ready, support: 'unsupported' })).toEqual({ enabled: false, note: 'unsupported' });
    expect(enterVrState({ ...ready, support: 'no-api' })).toEqual({ enabled: false, note: 'no-api' });
    expect(enterVrState({ ...ready, support: 'error' })).toEqual({ enabled: false, note: 'error' });
  });

  it('waits for the world and for the answer of the browser', () => {
    expect(enterVrState({ ...ready, worldReady: false })).toEqual({ enabled: false, note: 'loading' });
    expect(enterVrState({ ...ready, support: 'checking' })).toEqual({ enabled: false, note: 'checking' });
  });

  it('is off when the selected house could not be loaded', () => {
    expect(enterVrState({ ...ready, houseOk: false })).toEqual({ enabled: false, note: 'house-missing' });
    // While the world is still loading, the house is not known to be missing yet.
    expect(enterVrState({ ...ready, houseOk: false, worldReady: false }).note).toBe('loading');
  });

  it('is off while a session starts, and on again after a failed request', () => {
    expect(enterVrState({ ...ready, starting: true })).toEqual({ enabled: false, note: 'starting' });
    expect(enterVrState({ ...ready, failed: true })).toEqual({ enabled: true, note: 'failed' });
  });
});

describe('furnitureRows', () => {
  it('lists the furniture items only, in catalog order, with their size now', () => {
    const items = catalog();
    const rows = furnitureRows(items, NO_OVERRIDES);
    expect(rows.map((r) => r.id)).toEqual(items.filter((i) => i.kind === 'furniture').map((i) => i.id));
    expect(rows.some((r) => r.id === 'wheelchair')).toBe(false);
    const bed = rows.find((r) => r.id === 'bed-double');
    expect(bed).toMatchObject({ name: 'Double bed', sizeCm: [160, 200, 95], defaultCm: [160, 200, 95], changed: false });
  });

  it('marks changed items and shows the new size', () => {
    const items = catalog();
    const bed = items.find((i) => i.id === 'bed-double') as CatalogItem;
    const rows = furnitureRows(items, withSide(NO_OVERRIDES, bed, 0, 170));
    expect(rows.find((r) => r.id === 'bed-double')).toMatchObject({ sizeCm: [170, 200, 95], changed: true });
    expect(rows.filter((r) => r.changed)).toHaveLength(1);
  });
});

describe('sameOverrides and formatSizeCm', () => {
  const items = catalog();
  const bed = items.find((i) => i.id === 'bed-double') as CatalogItem;
  const chair = items.find((i) => i.id === 'chair') as CatalogItem;

  it('compares item by item', () => {
    const a = withSide(NO_OVERRIDES, bed, 0, 170);
    expect(sameOverrides(a, withSide(NO_OVERRIDES, bed, 0, 170))).toBe(true);
    expect(sameOverrides(a, NO_OVERRIDES)).toBe(false);
    expect(sameOverrides(NO_OVERRIDES, a)).toBe(false);
    expect(sameOverrides(a, withSide(NO_OVERRIDES, bed, 0, 171))).toBe(false);
    expect(sameOverrides(a, withSide(a, chair, 0, 50))).toBe(false);
    expect(sameOverrides(NO_OVERRIDES, {})).toBe(true);
  });

  it('writes the three sides in cm', () => {
    expect(formatSizeCm([160, 200, 95])).toBe('160 × 200 × 95 cm');
  });
});
