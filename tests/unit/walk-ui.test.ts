import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import { MAX_WALK_SPEED } from '../../src/logic/dig-gesture';
import {
  BUTTON_HALF_HEIGHT,
  ISSUE_BUTTON_HALF_HEIGHT,
  VIEW_BUTTON_HALF_HEIGHT,
  VIEW_BUTTON_LIFT,
  WALK_BUTTON_HALF_HEIGHT,
  WALK_BUTTON_HALF_WIDTH,
  WALK_BUTTON_IDS,
  WALK_BUTTON_LIFT,
  WALK_BUTTON_PANEL,
  createButtonPair,
  pickButton,
  viewButtonAnchors,
  walkButtonAnchors,
} from '../../src/logic/menu-button';
import { fillButtonColumn, type ButtonColumn } from '../../src/logic/menu-follow';
import { vignetteStep, vignetteTarget, VIGNETTE_MAX, VIGNETTE_MIN_SPEED } from '../../src/logic/vignette';
import { strings } from '../../src/ui/strings';

describe('the "Walk inside" button', () => {
  const place = () => {
    const menu = createButtonPair();
    menu[1].x = 0.3;
    menu[1].y = 1.4;
    menu[1].z = -0.5;
    menu[1].yawRad = 0.4;
    menu[0].id = 'x';
    const issues = createButtonPair();
    issues[1].x = 0.3;
    issues[1].y = 1.47;
    issues[1].z = -0.5;
    issues[1].yawRad = 0.4;
    const view = viewButtonAnchors(issues);
    const walk = walkButtonAnchors(view);
    return { menu, issues, view, walk };
  };

  it('sits 7 cm above the View button on the same ring position, with its own ids', () => {
    const { view, walk } = place();
    expect(walk[1].y - view[1].y).toBeCloseTo(WALK_BUTTON_LIFT, 12);
    expect(walk[1].x).toBe(view[1].x);
    expect(walk[1].z).toBe(view[1].z);
    expect(walk[1].yawRad).toBe(view[1].yawRad);
    expect(walk[0].id).toBe(WALK_BUTTON_IDS.left);
    expect(walk[1].id).toBe('ui:walk-button-right');
    expect(walk[1].halfWidth).toBe(WALK_BUTTON_HALF_WIDTH);
  });

  it('leaves 1 cm between its rectangle and the View button below, like the other floors', () => {
    expect(WALK_BUTTON_LIFT - VIEW_BUTTON_HALF_HEIGHT - WALK_BUTTON_HALF_HEIGHT).toBeCloseTo(VIEW_BUTTON_LIFT - ISSUE_BUTTON_HALF_HEIGHT - VIEW_BUTTON_HALF_HEIGHT, 12);
    expect(WALK_BUTTON_HALF_HEIGHT).toBe(BUTTON_HALF_HEIGHT);
  });

  it('a pinch picks the right floor of the four', () => {
    const { menu, issues, view, walk } = place();
    const all = [menu[1], issues[1], view[1], walk[1]];
    const p = { x: walk[1].x, y: walk[1].y, z: walk[1].z };
    expect(pickButton(p, all)).toBe(walk[1]);
    expect(pickButton({ ...p, y: view[1].y }, all)).toBe(view[1]);
    expect(pickButton({ ...p, y: walk[1].y + 0.04 }, all)).toBeNull();
  });

  it('makes the column of fixed buttons taller and wider, and leaves it alone without it', () => {
    const { menu, issues, view, walk } = place();
    const a: ButtonColumn = { x: 0, z: 0, halfWidth: 0, yBottom: 0, yTop: 0 };
    const b: ButtonColumn = { x: 0, z: 0, halfWidth: 0, yBottom: 0, yTop: 0 };
    fillButtonColumn(a, menu[1], issues[1], view[1]);
    fillButtonColumn(b, menu[1], issues[1], view[1], walk[1]);
    expect(b.yTop - a.yTop).toBeCloseTo(WALK_BUTTON_LIFT + WALK_BUTTON_HALF_HEIGHT - VIEW_BUTTON_HALF_HEIGHT, 12);
    expect(b.halfWidth).toBeCloseTo(WALK_BUTTON_HALF_WIDTH, 12);
    expect(b.yBottom).toBe(a.yBottom);
  });

  it('has a layout file of the size the logic says, and its words are plain English', () => {
    const layout = readFileSync('public/ui/walk-button.uikitml', 'utf8');
    expect(layout).toContain(`width: ${WALK_BUTTON_PANEL.width};`);
    expect(layout).toContain(`height: ${WALK_BUTTON_PANEL.height};`);
    expect(strings.walk.button).toBe('Walk inside');
    expect(strings.walk.hint).toBe('Dig with both hands, palms down, to walk');
    for (const text of [strings.walk.button, strings.walk.hint, strings.walk.needsHands]) expect(text).toMatch(/^[\x20-\x7e]+$/);
  });
});

describe('the comfort vignette', () => {
  it('is nothing at rest and below the minimum speed, grows with the speed, and never passes its maximum', () => {
    expect(vignetteTarget(0)).toBe(0);
    expect(vignetteTarget(VIGNETTE_MIN_SPEED)).toBe(0);
    expect(vignetteTarget(0.3)).toBeGreaterThan(0);
    expect(vignetteTarget(0.6)).toBeGreaterThan(vignetteTarget(0.3));
    expect(vignetteTarget(MAX_WALK_SPEED)).toBeCloseTo(VIGNETTE_MAX, 12);
    expect(vignetteTarget(10)).toBeCloseTo(VIGNETTE_MAX, 12);
  });

  it('a bad speed asks for nothing', () => {
    for (const bad of [Number.NaN, -1, Number.POSITIVE_INFINITY * 0]) expect(vignetteTarget(bad)).toBe(0);
  });

  it('rises faster than it falls and reaches zero after the stop', () => {
    const dt = 1 / 72;
    let up = 0;
    for (let i = 0; i < 18; i += 1) up = vignetteStep(up, 0.8, dt); // 0.25 s
    let down = 0.8;
    for (let i = 0; i < 18; i += 1) down = vignetteStep(down, 0, dt);
    expect(up).toBeGreaterThan(0.8 * 0.7);
    expect(down).toBeGreaterThan(0.8 * 0.4);
    for (let i = 0; i < 72 * 4; i += 1) down = vignetteStep(down, 0, dt);
    expect(down).toBe(0);
  });

  it('a bad dt changes nothing', () => {
    expect(vignetteStep(0.4, 0.8, 0)).toBe(0.4);
    expect(vignetteStep(0.4, 0.8, Number.NaN)).toBe(0.4);
    expect(vignetteStep(0.4, 0.8, -1)).toBe(0.4);
  });
});
