// The tenant only reports issues: the store ignores every furniture action while the role cannot `furnish`.
import { describe, expect, it } from 'vitest';
import { DEFAULT_PARAMS, ROLES } from '../../src/logic/params';
import type { Role } from '../../src/logic/params';
import { can } from '../../src/logic/permissions';
import {
  createInitialState,
  moveFurniture,
  placeFurniture,
  reduce,
  removeFurniture,
  restoreSaved,
  setFurniture,
  setRole,
  stageFurniture,
  undo,
  type Action,
  type AppState,
} from '../../src/logic/state';

const initial = (role: Role): AppState => createInitialState({ ...DEFAULT_PARAMS, house: 'apartment-a', role });
const run = (state: AppState, ...actions: Action[]): AppState => actions.reduce(reduce, state);
const withChair = (role: Role): AppState => run(initial('visitor'), placeFurniture('chair', 1, 1, 0, 'living'), setRole(role));

describe('furniture actions per role', () => {
  const furnishers = ROLES.filter((role) => can(role, 'furnish'));

  it.each(furnishers)('%s can place, move, remove and undo', (role) => {
    let state = run(initial(role), placeFurniture('chair', 1, 1, 0, 'living'));
    expect(state.furniture).toHaveLength(1);
    state = reduce(state, moveFurniture('furniture:chair#1', 2, 2, 90, 'living'));
    expect(state.furniture[0]).toMatchObject({ x: 2, z: 2, rotationDeg: 90 });
    state = reduce(state, removeFurniture('furniture:chair#1'));
    expect(state.furniture).toHaveLength(0);
    state = reduce(state, undo());
    expect(state.furniture).toHaveLength(1);
  });

  it('every role but the tenant furnishes', () => {
    expect(furnishers).toEqual(['visitor', 'agent', 'landlord']);
  });

  it('the agent still stages the house', () => {
    const state = run(initial('agent'), stageFurniture([], 'clear'), placeFurniture('chair', 1, 1, 0, 'living'), stageFurniture([], 'clear'));
    expect(state.furniture).toHaveLength(0);
    expect(state.history.at(-1)?.action).toBe('stage');
  });
});

describe('the tenant cannot move furniture', () => {
  it('ignores place, move, remove, undo and stage (the same state object comes back)', () => {
    const s = withChair('tenant');
    expect(reduce(s, placeFurniture('chair', 2, 2, 0, 'living'))).toBe(s);
    expect(reduce(s, moveFurniture('furniture:chair#1', 2, 2, 90, 'living'))).toBe(s);
    expect(reduce(s, removeFurniture('furniture:chair#1'))).toBe(s);
    expect(reduce(s, undo())).toBe(s);
    expect(reduce(s, stageFurniture([], 'clear'))).toBe(s);
    expect(s.furniture).toHaveLength(1);
    expect(s.history).toHaveLength(1);
  });

  it('keeps the counters and the history untouched', () => {
    const s = withChair('tenant');
    const after = run(s, placeFurniture('chair', 2, 2, 0, 'living'), placeFurniture('bed-double', 3, 3, 0, 'living'));
    expect(after.nextInstance).toEqual(s.nextInstance);
    expect(after.history).toBe(s.history);
  });

  it('applies at once when the role switches, in both directions', () => {
    let s = withChair('visitor');
    s = reduce(s, setRole('tenant'));
    expect(reduce(s, removeFurniture('furniture:chair#1'))).toBe(s);
    s = reduce(s, setRole('visitor'));
    expect(reduce(s, removeFurniture('furniture:chair#1')).furniture).toHaveLength(0);
  });

  it('still lets the setup paths write the furniture (the furnish= URL, a saved state), which are not user actions', () => {
    const piece = withChair('visitor').furniture;
    const s = run(initial('tenant'), setFurniture(piece));
    expect(s.furniture).toHaveLength(1);
  });

  it('keeps the other tenant powers: the role switch works', () => {
    expect(reduce(initial('tenant'), setRole('visitor')).role).toBe('visitor');
  });

  it('a saved tenant state keeps its pieces and still blocks changes after restore', () => {
    const saved = withChair('tenant');
    const restored = run(
      initial('visitor'),
      restoreSaved({
        furniture: [...saved.furniture],
        nextInstance: { ...saved.nextInstance },
        history: [...saved.history],
        prefs: { ...saved.prefs },
        view: saved.view,
        role: 'tenant',
      }),
    );
    expect(restored.role).toBe('tenant');
    expect(restored.furniture).toHaveLength(1);
    expect(reduce(restored, removeFurniture('furniture:chair#1'))).toBe(restored);
  });
});
