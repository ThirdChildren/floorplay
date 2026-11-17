import { describe, expect, it } from 'vitest';
import { mineEntries, mineEntryId, mineTabHasContent, pressRemove, settleMineView } from '../../src/logic/mine-menu';

const a = { id: 'my-scan-couch-1' };
const b = { id: 'my-scan-bed-1' };
const c = { id: 'my-scan-desk-1' };

describe('mineEntries', () => {
  it('lists nothing when there is nothing at all (the tab is hidden)', () => {
    expect(mineEntries('pick', [], [])).toEqual([]);
    expect(mineEntries('manage', [], [])).toEqual([]);
    expect(mineTabHasContent(0, 0)).toBe(false);
  });

  it('the pick view lists the pieces in Mine and a last Manage card', () => {
    const entries = mineEntries('pick', [a, b], [c]);
    expect(entries.map((e) => e.kind)).toEqual(['pick', 'pick', 'manage']);
    expect(entries.map(mineEntryId)).toEqual(['my-scan-couch-1', 'my-scan-bed-1', 'manage']);
  });

  it('the pick view with only removed pieces still has the Manage card (that is how to restore)', () => {
    expect(mineEntries('pick', [], [c]).map((e) => e.kind)).toEqual(['manage']);
    expect(mineTabHasContent(0, 1)).toBe(true);
  });

  it('the manage view lists Mine (to remove), then Removed (to restore), then Done', () => {
    const entries = mineEntries('manage', [a, b], [c]);
    expect(entries.map((e) => e.kind)).toEqual(['remove', 'remove', 'restore', 'done']);
    expect(entries.map(mineEntryId)).toEqual(['my-scan-couch-1', 'my-scan-bed-1', 'my-scan-desk-1', 'done']);
    expect(entries[2].item).toBe(c);
  });
});

describe('pressRemove', () => {
  it('the first press arms, the second press on the same piece removes', () => {
    const first = pressRemove(null, a.id);
    expect(first).toEqual({ armed: a.id, remove: false });
    expect(pressRemove(first.armed, a.id)).toEqual({ armed: null, remove: true });
  });

  it('a press on another piece arms that one instead and removes nothing', () => {
    expect(pressRemove(a.id, b.id)).toEqual({ armed: b.id, remove: false });
  });
});

describe('settleMineView', () => {
  it('keeps the view while there is something, goes back to pick when there is nothing', () => {
    expect(settleMineView('manage', 0, 1)).toBe('manage');
    expect(settleMineView('manage', 2, 0)).toBe('manage');
    expect(settleMineView('manage', 0, 0)).toBe('pick');
    expect(settleMineView('pick', 0, 0)).toBe('pick');
  });
});
