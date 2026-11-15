import { describe, expect, it } from 'vitest';
import type { House } from '../../src/logic/house';
import { DEFAULT_PARAMS } from '../../src/logic/params';
import { pickRestorable, serializeForSave, type RestoreContext } from '../../src/logic/persistence';
import { TABLETOP_VIEW, createInitialState, isViewState, reduce, sameView, setView, type AppState } from '../../src/logic/state';
import { loadJson } from '../helpers/load-json';

const houseA = loadJson<House>('public/houses', 'apartment-a.json');
const initial = (): AppState => createInitialState({ ...DEFAULT_PARAMS, house: 'apartment-a' });
const ctx: RestoreContext = {
  houseId: houseA.id,
  catalogIds: new Set(['bed-double']),
  roomIds: new Set(houseA.rooms.map((r) => r.id)),
  viewpointIds: new Set(houseA.viewpoints.map((v) => v.id)),
};
const WALK = { kind: 'walk', x: 4.25, z: 3.5, yawDeg: 90 } as const;

describe('the walk view in the store', () => {
  it('is a valid view and replaces the tabletop', () => {
    expect(isViewState(WALK)).toBe(true);
    const next = reduce(initial(), setView(WALK));
    expect(next.view).toEqual(WALK);
  });

  it('only the known keys reach the store', () => {
    const next = reduce(initial(), setView({ ...WALK, extra: 1 } as never));
    expect(Object.keys(next.view).sort()).toEqual(['kind', 'x', 'yawDeg', 'z']);
  });

  it('sameView compares the position: a new position is a change, the same one is not', () => {
    const s1 = reduce(initial(), setView(WALK));
    expect(reduce(s1, setView({ ...WALK }))).toBe(s1);
    expect(sameView(WALK, { ...WALK, x: 4.26 })).toBe(false);
    expect(sameView(WALK, { kind: 'viewpoint', id: 'V1' })).toBe(false);
    expect(sameView(TABLETOP_VIEW, WALK)).toBe(false);
    expect(reduce(s1, setView({ ...WALK, x: 4.26 })).view).toEqual({ ...WALK, x: 4.26 });
  });

  it.each([
    ['no x', { kind: 'walk', z: 1, yawDeg: 0 }],
    ['x as text', { kind: 'walk', x: '1', z: 1, yawDeg: 0 }],
    ['NaN', { kind: 'walk', x: Number.NaN, z: 1, yawDeg: 0 }],
    ['Infinity', { kind: 'walk', x: 1, z: Number.POSITIVE_INFINITY, yawDeg: 0 }],
    ['far away', { kind: 'walk', x: 1e9, z: 1, yawDeg: 0 }],
    ['a huge yaw', { kind: 'walk', x: 1, z: 1, yawDeg: 9000 }],
  ])('%s is refused and the view stays as it was', (_name, view) => {
    expect(isViewState(view)).toBe(false);
    const s = initial();
    expect(reduce(s, setView(view as never))).toBe(s);
  });
});

describe('the walk view is saved and restored', () => {
  it('comes back from a save with its position and heading', () => {
    const saved = serializeForSave(reduce(initial(), setView(WALK)));
    const picked = pickRestorable(saved, ctx);
    expect(picked?.view).toEqual(WALK);
  });

  it('a save without a view, or with a broken walk, restores the tabletop', () => {
    const parsed = JSON.parse(serializeForSave(reduce(initial(), setView(WALK)))) as Record<string, unknown>;
    parsed.view = { kind: 'walk', x: 'a', z: 1, yawDeg: 0 };
    expect(pickRestorable(JSON.stringify(parsed), ctx)?.view).toEqual(TABLETOP_VIEW);
  });
});
