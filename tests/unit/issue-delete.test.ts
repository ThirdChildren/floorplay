// Deleting an archived issue: the permission, the store action, the saved state and the demo seed that must not come back.
import { describe, expect, it } from 'vitest';
import { buildDetail, type DetailTexts } from '../../src/logic/issue-detail';
import { buildMoveInPage } from '../../src/logic/issue-movein';
import type { Issue } from '../../src/logic/issues';
import { DEFAULT_PARAMS, ROLES } from '../../src/logic/params';
import type { Role } from '../../src/logic/params';
import { can } from '../../src/logic/permissions';
import { pickRestorable, serializeForSave, type RestoreContext } from '../../src/logic/persistence';
import { pickSeed } from '../../src/logic/issue-seed';
import {
  createInitialState,
  deleteIssue,
  deserialize,
  reduce,
  restoreSaved,
  seedIssues,
  serialize,
  setRole,
  transitionIssue,
  type Action,
  type AppState,
} from '../../src/logic/state';
import { strings } from '../../src/ui/strings';
import { loadJson } from '../helpers/load-json';

const initial = (role: Role = 'visitor'): AppState => createInitialState({ ...DEFAULT_PARAMS, house: 'apartment-a', role });
const run = (state: AppState, ...actions: Action[]): AppState => actions.reduce(reduce, state);
const demoFile = (): Issue[] => structuredClone(loadJson<Issue[]>('public/demo', 'issues-apartment-a.json'));
const T1 = '2026-11-05T10:00:00.000Z';
const T2 = '2026-11-06T10:00:00.000Z';

/** A seeded store where the tenant has confirmed the resolved demo issue (issue-010): it is archived. */
function withArchived(): AppState {
  const seeded = run(initial('tenant'), seedIssues(demoFile()));
  return run(seeded, transitionIssue('issue-010', 'confirm', T1));
}

const ctx = (): RestoreContext => ({
  houseId: 'apartment-a',
  catalogIds: new Set(['chair']),
  roomIds: new Set(['living']),
  viewpointIds: new Set<string>(),
});

describe('deleteIssue in the store', () => {
  it('removes an archived issue for the tenant and the landlord', () => {
    for (const role of ['tenant', 'landlord'] as const) {
      const state = run(withArchived(), setRole(role));
      const after = reduce(state, deleteIssue('issue-010'));
      expect(after.issues.some((i) => i.id === 'issue-010'), role).toBe(false);
      expect(after.issues).toHaveLength(state.issues.length - 1);
    }
  });

  it('refuses an issue that is not archived, whoever asks', () => {
    for (const role of ROLES) {
      const state = run(withArchived(), setRole(role));
      for (const id of ['issue-012', 'issue-013']) expect(reduce(state, deleteIssue(id)), `${role} ${id}`).toBe(state);
    }
  });

  it('refuses a resolved issue (only the confirm archives it)', () => {
    const state = run(initial('tenant'), seedIssues(demoFile()));
    expect(state.issues.find((i) => i.id === 'issue-010')?.status).toBe('resolved');
    expect(reduce(state, deleteIssue('issue-010'))).toBe(state);
  });

  it('refuses the visitor and the agent even on an archived issue', () => {
    for (const role of ['visitor', 'agent'] as const) {
      const state = run(withArchived(), setRole(role));
      expect(reduce(state, deleteIssue('issue-010')), role).toBe(state);
    }
  });

  it('refuses a move-in entry, an unknown id and a repeat', () => {
    const state = withArchived();
    expect(reduce(state, deleteIssue('baseline-001'))).toBe(state);
    expect(reduce(state, deleteIssue('issue-999'))).toBe(state);
    const once = reduce(state, deleteIssue('issue-010'));
    expect(reduce(once, deleteIssue('issue-010'))).toBe(once);
  });

  it('leaves the other issues, the counter and the seed flag as they were', () => {
    const state = withArchived();
    const after = reduce(state, deleteIssue('issue-010'));
    expect(after.issues.map((i) => i.id)).toEqual(['issue-012', 'issue-013', 'baseline-001']);
    expect(after.nextIssue).toBe(state.nextIssue);
    expect(after.issuesSeeded).toBe(true);
  });

  it('says the same in the permission table: can() is the rule', () => {
    const state = withArchived();
    for (const issue of state.issues) {
      const allowed = can('tenant', 'delete', issue);
      expect(reduce(state, deleteIssue(issue.id)) !== state).toBe(allowed);
    }
  });
});

describe('a deleted issue stays deleted', () => {
  it('the demo seed is not applied again, in the same session or after a reload', () => {
    const deleted = reduce(withArchived(), deleteIssue('issue-010'));
    // The same session: the seed is "once".
    expect(reduce(deleted, seedIssues(demoFile()))).toBe(deleted);
    // After a reload: the saved state comes back with the flag, so the seed is not asked for again.
    const saved = serializeForSave(deleted);
    const picked = pickRestorable(saved, ctx());
    expect(picked).not.toBeNull();
    expect(picked?.issuesSeeded).toBe(true);
    expect(picked?.issues.map((i) => i.id)).toEqual(['issue-012', 'issue-013', 'baseline-001']);
    const reloaded = run(initial('tenant'), restoreSaved(picked!), seedIssues(demoFile()));
    expect(reloaded.issues.some((i) => i.id === 'issue-010')).toBe(false);
    expect(reloaded.issuesSeeded).toBe(true);
  });

  it('survives serialize and deserialize', () => {
    const deleted = reduce(withArchived(), deleteIssue('issue-010'));
    const back = deserialize(serialize(deleted));
    expect(back?.issues.map((i) => i.id)).toEqual(['issue-012', 'issue-013', 'baseline-001']);
    expect(back?.issuesSeeded).toBe(true);
  });

  it('deleting every issue leaves an empty list that is still marked as seeded', () => {
    let state = run(initial('tenant'), seedIssues(demoFile()));
    state = run(state, transitionIssue('issue-010', 'confirm', T1));
    state = reduce(state, deleteIssue('issue-010'));
    const back = deserialize(serialize({ ...state, issues: [] }));
    expect(back?.issues).toEqual([]);
    expect(back?.issuesSeeded).toBe(true);
    // After a reload the empty list stays empty; only a fresh store (reset=1) is seeded again, as designed.
    const picked = pickRestorable(serializeForSave({ ...state, issues: [] }), ctx());
    expect(run(initial('tenant'), restoreSaved(picked!), seedIssues(demoFile())).issues).toEqual([]);
    expect(run(initial('tenant'), seedIssues(demoFile())).issues.length).toBeGreaterThan(0);
  });

  it('the number of a deleted issue is never handed out again', () => {
    const state = run(withArchived(), setRole('tenant'));
    const before = state.nextIssue;
    expect(reduce(state, deleteIssue('issue-010')).nextIssue).toBe(before);
  });

  it('the seed file holds no archived issue: only a confirm by the tenant makes one deletable', () => {
    const pick = pickSeed(demoFile(), 'apartment-a');
    expect(pick.ok).toBe(true);
    if (pick.ok) expect(pick.issues.filter((i) => i.status === 'archived')).toEqual([]);
  });
});

describe('the report and the history after a delete', () => {
  const texts = strings.issues.detail;
  const detailTexts: DetailTexts = { ...texts, categories: strings.issues.categories, separator: ' - ' };

  it('the detail of the deleted issue is the "not found" one, not an error', () => {
    const after = reduce(withArchived(), deleteIssue('issue-010'));
    const issue = after.issues.find((i) => i.id === 'issue-010');
    const model = buildDetail(issue, 'issue-010', 'tenant', null, detailTexts, 'Back', 'Close');
    expect(model.missing).toBe(true);
    expect(model.actions).toEqual([]);
  });

  it('the Delete button exists only on an archived issue, and asks twice', () => {
    const state = withArchived();
    const archived = state.issues.find((i) => i.id === 'issue-010');
    const open = state.issues.find((i) => i.id === 'issue-012');
    const first = buildDetail(archived, 'issue-010', 'tenant', null, detailTexts, 'Back', 'Close');
    expect(first.actions.map((a) => a.action)).toEqual(['delete']);
    expect(first.actions[0].label).toBe(strings.issues.detail.delete);
    const armed = buildDetail(archived, 'issue-010', 'tenant', null, detailTexts, 'Back', 'Close', true);
    expect(armed.actions[0].label).toBe(strings.issues.detail.deleteConfirm);
    expect(buildDetail(open, 'issue-012', 'tenant', null, detailTexts, 'Back', 'Close').actions.map((a) => a.action)).not.toContain('delete');
    expect(buildDetail(archived, 'issue-010', 'visitor', null, detailTexts, 'Back', 'Close').actions).toEqual([]);
  });

  it('the move-in report does not depend on the deleted issue', () => {
    const state = withArchived();
    const baseline = (s: AppState) => buildMoveInPage(s.issues, 'tenant', true, null, strings.issues.movein).rows.map((r) => r.id);
    expect(baseline(reduce(state, deleteIssue('issue-010')))).toEqual(baseline(state));
  });

  it('a later transition on the deleted id is ignored', () => {
    const after = reduce(withArchived(), deleteIssue('issue-010'));
    expect(reduce(after, transitionIssue('issue-010', 'reopen', T2))).toBe(after);
  });
});
