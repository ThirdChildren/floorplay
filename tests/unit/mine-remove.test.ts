// Removing a piece from Mine, the Removed list, restoring it, and saving all of that.
import { describe, expect, it } from 'vitest';
import { DEFAULT_PARAMS } from '../../src/logic/params';
import { pickRestorable, serializeForSave } from '../../src/logic/persistence';
import { MAX_SCANNED, ownPieceFromVolume, sanitizeRemovedScanned, type ScannedPiece } from '../../src/logic/room-scan';
import {
  addScanned,
  createInitialState,
  deserialize,
  placeFurniture,
  reduce,
  removeScanned,
  restoreSaved,
  restoreScanned,
  serialize,
  type Action,
  type AppState,
} from '../../src/logic/state';

const initial = (): AppState => createInitialState({ ...DEFAULT_PARAMS, house: 'apartment-c' });
const run = (state: AppState, ...actions: Action[]): AppState => actions.reduce(reduce, state);
const couch: ScannedPiece = { id: 'my-scan-couch-1', name: 'My couch', label: 'couch', size: [2.1, 0.9, 0.85] };
const bed: ScannedPiece = { id: 'my-scan-bed-1', name: 'My bed', label: 'bed', size: [2, 1.6, 0.5] };
const withBoth = (): AppState => run(initial(), addScanned(couch), addScanned(bed));

describe('removeScanned and restoreScanned', () => {
  it('moves a piece to the Removed list and back, with its id and data', () => {
    const removed = reduce(withBoth(), removeScanned('my-scan-couch-1'));
    expect(removed.scannedFurniture).toEqual([bed]);
    expect(removed.removedScanned).toEqual([couch]);
    const back = reduce(removed, restoreScanned('my-scan-couch-1'));
    expect(back.scannedFurniture.map((p) => p.id)).toEqual(['my-scan-bed-1', 'my-scan-couch-1']);
    expect(back.scannedFurniture[1]).toEqual(couch);
    expect(back.removedScanned).toEqual([]);
  });

  it('ignores an id that is not where it should be', () => {
    const state = withBoth();
    expect(reduce(state, removeScanned('my-scan-lamp-9'))).toBe(state);
    expect(reduce(state, restoreScanned('my-scan-couch-1'))).toBe(state);
    const removed = reduce(state, removeScanned('my-scan-couch-1'));
    expect(reduce(removed, removeScanned('my-scan-couch-1'))).toBe(removed);
  });

  it('refuses to remove when the Removed list is full, and to restore when Mine is full', () => {
    const lamps: ScannedPiece[] = Array.from({ length: MAX_SCANNED }, (_, i) => ({
      id: `my-scan-lamp-${i + 1}`,
      name: 'My lamp',
      label: 'lamp',
      size: [0.2, 0.2, 0.3 + i / 100],
    }));
    let state = run(initial(), ...lamps.map(addScanned));
    for (const lamp of lamps) state = reduce(state, removeScanned(lamp.id));
    expect(state.removedScanned).toHaveLength(MAX_SCANNED);
    // Mine is empty now: a new piece goes in, and it cannot be removed (the Removed list has no room).
    state = reduce(state, addScanned(couch));
    expect(reduce(state, removeScanned(couch.id))).toBe(state);
    // Fill Mine again with different pieces: no room to restore.
    let full = run(initial(), ...lamps.map(addScanned));
    full = { ...full, removedScanned: [couch] };
    expect(reduce(full, restoreScanned(couch.id))).toBe(full);
  });

  it('leaves the pieces already placed in the house, the history and the counters alone', () => {
    let state = run(initial(), addScanned(couch), placeFurniture('my-scan-couch-1', 1, 1, 0, 'living'));
    const before = { furniture: state.furniture, history: state.history, nextInstance: state.nextInstance };
    state = reduce(state, removeScanned(couch.id));
    expect(state.furniture).toBe(before.furniture);
    expect(state.history).toBe(before.history);
    expect(state.nextInstance).toBe(before.nextInstance);
    state = reduce(state, restoreScanned(couch.id));
    expect(state.furniture).toBe(before.furniture);
  });
});

describe('Add to Mine after a removal', () => {
  it('the same object comes back as the removed piece (same id and data), not as a second entry', () => {
    const removed = reduce(withBoth(), removeScanned(couch.id));
    const again = reduce(removed, addScanned({ ...couch, id: 'my-scan-couch-2' }));
    expect(again.scannedFurniture.map((p) => p.id)).toEqual(['my-scan-bed-1', 'my-scan-couch-1']);
    expect(again.removedScanned).toEqual([]);
  });

  it('a different object gets a new number that no removed piece uses', () => {
    const removed = reduce(withBoth(), removeScanned(couch.id));
    const next = ownPieceFromVolume({ name: 'Couch', key: 'couch', cm: [160, 80, 80] }, [...removed.scannedFurniture, ...removed.removedScanned]);
    expect(next?.id).toBe('my-scan-couch-2');
    expect(reduce(removed, addScanned(next!)).scannedFurniture.map((p) => p.id)).toContain('my-scan-couch-2');
  });

  it('refuses a piece with the id of a removed piece', () => {
    const removed = reduce(withBoth(), removeScanned(couch.id));
    expect(reduce(removed, addScanned({ ...couch, size: [1, 1, 1] }))).toBe(removed);
  });
});

describe('saving the Removed list', () => {
  const ctx = { houseId: 'apartment-c', catalogIds: new Set(['my-scan-couch-1', 'my-scan-bed-1']), roomIds: new Set<string>() };
  const removedState = (): AppState => reduce(withBoth(), removeScanned(couch.id));

  it('writes the list only when it has pieces', () => {
    expect(Object.keys(JSON.parse(serialize(withBoth())))).not.toContain('removedScanned');
    expect(JSON.parse(serialize(removedState())).removedScanned).toEqual([couch]);
  });

  it('survives a save and a restore: both lists come back', () => {
    const text = serializeForSave(removedState());
    expect(deserialize(text)?.removedScanned).toEqual([couch]);
    const picked = pickRestorable(text, ctx)!;
    expect(picked.removedScanned).toEqual([couch]);
    const restored = reduce(initial(), restoreSaved(picked));
    expect(restored.scannedFurniture).toEqual([bed]);
    expect(restored.removedScanned).toEqual([couch]);
    // And then it can be restored for good.
    expect(reduce(restored, restoreScanned(couch.id)).scannedFurniture.map((p) => p.id)).toContain(couch.id);
  });

  it('an older saved state (no list) restores with an empty Removed list', () => {
    const base = JSON.parse(serialize(withBoth()));
    expect(deserialize(JSON.stringify(base))?.removedScanned).toEqual([]);
  });

  it('a broken or repeated entry goes away alone; a piece that is also in Mine stays in Mine only', () => {
    const base = JSON.parse(serialize(run(initial(), addScanned(bed))));
    const text = JSON.stringify({ ...base, removedScanned: [{ id: 'x' }, 7, couch, couch, bed, { ...bed, id: 'my-scan-bed-2' }] });
    // `bed` is in Mine (both by id and by object): only the couch is left in Removed.
    expect(deserialize(text)?.removedScanned).toEqual([couch]);
    expect(deserialize(JSON.stringify({ ...base, removedScanned: 'no' }))?.removedScanned).toEqual([]);
  });

  it('a restore that names no list leaves the Removed pieces of the session alone, minus any that Mine now has', () => {
    const state = removedState();
    const picked = pickRestorable(serialize(initial()), ctx)!;
    const { removedScanned: _drop, ...rest } = picked;
    void _drop;
    expect(reduce(state, restoreSaved(rest)).removedScanned).toEqual([couch]);
  });

  it('the placed pieces of a removed item are not parked at the next start: its catalog id is still known', () => {
    const state = run(initial(), addScanned(couch), placeFurniture('my-scan-couch-1', 1, 1, 0, 'living'), removeScanned(couch.id));
    const picked = pickRestorable(serializeForSave(state), { ...ctx, roomIds: new Set(['living']) })!;
    expect(picked.furniture).toHaveLength(1);
    expect(picked.parked).toHaveLength(0);
  });
});

describe('sanitizeRemovedScanned', () => {
  it('keeps at most MAX_SCANNED valid pieces', () => {
    const many = Array.from({ length: MAX_SCANNED + 4 }, (_, i) => ({ id: `my-scan-lamp-${i + 1}`, name: 'My lamp', label: 'lamp', size: [0.2, 0.2, 0.3 + i / 100] }));
    expect(sanitizeRemovedScanned(many, [])).toHaveLength(MAX_SCANNED);
  });
});
