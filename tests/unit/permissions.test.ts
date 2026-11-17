import { describe, expect, it } from 'vitest';
import { ROLES } from '../../src/logic/params';
import type { Role } from '../../src/logic/params';
import {
  PERMISSION_ACTIONS,
  PERMISSION_TABLE,
  TRANSITION_FROM,
  can,
  isTransitionAction,
  roleAllows,
} from '../../src/logic/permissions';
import type { PermissionAction } from '../../src/logic/permissions';

// The expectation is written out here, independent of the table in the source (D43).
const EXPECTED: Record<PermissionAction, Role[]> = {
  'view-pins': ['tenant', 'landlord'],
  create: ['tenant'],
  'take-on': ['landlord'],
  resolve: ['landlord'],
  confirm: ['tenant'],
  reopen: ['tenant'],
  'view-move-in': ['tenant', 'landlord'],
  'view-info': ['visitor', 'agent'],
  stage: ['agent'],
  furnish: ['visitor', 'agent', 'landlord'],
  delete: ['tenant', 'landlord'],
  'change-role': ['visitor', 'agent', 'tenant', 'landlord'],
};

describe('permission table', () => {
  it('covers the four roles and the twelve actions', () => {
    expect(ROLES).toHaveLength(4);
    expect(PERMISSION_ACTIONS).toHaveLength(12);
    expect(Object.keys(PERMISSION_TABLE).sort()).toEqual([...PERMISSION_ACTIONS].sort());
  });

  const cases = ROLES.flatMap((role) => PERMISSION_ACTIONS.map((action) => [role, action] as const));
  it.each(cases)('%s x %s', (role, action) => {
    expect(can(role, action)).toBe(EXPECTED[action].includes(role));
    expect(roleAllows(role, action)).toBe(EXPECTED[action].includes(role));
  });

  it('lets every role change the demo role', () => {
    for (const role of ROLES) expect(can(role, 'change-role')).toBe(true);
  });

  it('gives the visitor the info points and the role change, nothing about issues', () => {
    const allowed = PERMISSION_ACTIONS.filter((a) => can('visitor', a));
    expect(allowed).toEqual(['view-info', 'furnish', 'change-role']);
  });

  it('gives the agent the info points, the staging and the role change, nothing about issues', () => {
    const allowed = PERMISSION_ACTIONS.filter((a) => can('agent', a));
    expect(allowed).toEqual(['view-info', 'stage', 'furnish', 'change-role']);
  });

  it('never shows the pins of the issues and the info points to the same role (no screen has both)', () => {
    for (const role of ROLES) expect(can(role, 'view-pins') && can(role, 'view-info')).toBe(false);
  });

  it('lets only the agent stage the house', () => {
    expect(ROLES.filter((role) => can(role, 'stage'))).toEqual(['agent']);
  });

  it('never lets the same role create and manage', () => {
    expect(can('tenant', 'take-on')).toBe(false);
    expect(can('landlord', 'create')).toBe(false);
    expect(can('landlord', 'confirm')).toBe(false);
  });

  it('rejects an unknown role or action', () => {
    expect(can('owner' as Role, 'create')).toBe(false);
    expect(can('tenant', 'remove' as PermissionAction)).toBe(false);
    expect(can('tenant', '__proto__' as PermissionAction)).toBe(false);
    expect(can('tenant', 'constructor' as PermissionAction)).toBe(false);
  });
});

describe('can with an issue', () => {
  it.each([
    ['landlord', 'take-on', 'open', true],
    ['landlord', 'take-on', 'in_progress', false],
    ['landlord', 'resolve', 'in_progress', true],
    ['landlord', 'resolve', 'open', false],
    ['tenant', 'confirm', 'resolved', true],
    ['tenant', 'reopen', 'resolved', true],
    ['tenant', 'confirm', 'in_progress', false],
    ['tenant', 'reopen', 'archived', false],
    ['tenant', 'confirm', 'archived', false],
  ] as const)('%s %s on %s is %s', (role, action, status, ok) => {
    expect(can(role, action, { kind: 'issue', status })).toBe(ok);
  });

  it('is false for a transition on a baseline or an info entry', () => {
    expect(can('landlord', 'take-on', { kind: 'baseline' })).toBe(false);
    expect(can('tenant', 'confirm', { kind: 'info' })).toBe(false);
  });

  it('keeps the role check first', () => {
    expect(can('tenant', 'take-on', { kind: 'issue', status: 'open' })).toBe(false);
  });

  it('ignores the issue for actions that are not transitions', () => {
    expect(can('tenant', 'create', { kind: 'baseline' })).toBe(true);
    expect(can('landlord', 'view-pins', { kind: 'info' })).toBe(true);
  });
});

describe('furnish (the tenant cannot move furniture)', () => {
  it('is allowed to every role but the tenant', () => {
    expect(ROLES.filter((role) => can(role, 'furnish'))).toEqual(['visitor', 'agent', 'landlord']);
    expect(can('tenant', 'furnish')).toBe(false);
  });

  it('does not depend on an issue', () => {
    expect(can('tenant', 'furnish', { kind: 'issue', status: 'open' })).toBe(false);
    expect(can('visitor', 'furnish', { kind: 'issue', status: 'open' })).toBe(true);
  });

  it('leaves the tenant what it had: the pins, the reports and the move-in', () => {
    const allowed = PERMISSION_ACTIONS.filter((a) => can('tenant', a));
    expect(allowed).toEqual(['view-pins', 'create', 'confirm', 'reopen', 'view-move-in', 'delete', 'change-role']);
  });
});

describe('delete (archived issues only)', () => {
  it('is for the tenant and the landlord', () => {
    expect(ROLES.filter((role) => can(role, 'delete'))).toEqual(['tenant', 'landlord']);
  });

  it.each([
    ['tenant', 'archived', true],
    ['landlord', 'archived', true],
    ['tenant', 'open', false],
    ['tenant', 'in_progress', false],
    ['tenant', 'resolved', false],
    ['landlord', 'open', false],
    ['landlord', 'in_progress', false],
    ['landlord', 'resolved', false],
    ['visitor', 'archived', false],
    ['agent', 'archived', false],
  ] as const)('%s delete on %s is %s', (role, status, ok) => {
    expect(can(role, 'delete', { kind: 'issue', status })).toBe(ok);
  });

  it('is false for a move-in or info entry, and for an issue without a status', () => {
    expect(can('tenant', 'delete', { kind: 'baseline' })).toBe(false);
    expect(can('landlord', 'delete', { kind: 'info' })).toBe(false);
    expect(can('tenant', 'delete', { kind: 'issue' })).toBe(false);
  });

  it('is not a status transition', () => {
    expect(isTransitionAction('delete')).toBe(false);
  });
});

describe('transition actions', () => {
  it('knows the four transitions and their start status', () => {
    expect(TRANSITION_FROM).toEqual({ 'take-on': 'open', resolve: 'in_progress', confirm: 'resolved', reopen: 'resolved' });
    expect(isTransitionAction('resolve')).toBe(true);
    expect(isTransitionAction('create')).toBe(false);
    expect(isTransitionAction('toString')).toBe(false);
    expect(isTransitionAction(undefined)).toBe(false);
  });
});
