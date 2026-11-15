import { existsSync, readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import { MAX_WALK_SPEED } from '../../src/logic/row-gesture';
import { BUTTON_HALF_HEIGHT, VIEW_BUTTON_HALF_HEIGHT, createButtonPair, issueButtonAnchors, pickButton, viewButtonAnchors } from '../../src/logic/menu-button';
import { fillButtonColumn, type ButtonColumn } from '../../src/logic/menu-follow';
import { vignetteStep, vignetteTarget, VIGNETTE_MAX, VIGNETTE_MIN_SPEED } from '../../src/logic/vignette';
import { strings } from '../../src/ui/strings';

describe('the walk texts and the fixed button column', () => {
  it('has no "Walk inside" button any more: walking starts at a viewpoint', () => {
    expect(Object.keys(strings.walk)).toEqual(['hint', 'needsHands']);
    expect(existsSync('public/ui/walk-button.uikitml')).toBe(false);
    const column = readFileSync('src/systems/menu-button.ts', 'utf8');
    expect(column).not.toMatch(/walkPanels|walkButtons|requestWalk/);
  });

  it('keeps the coach words and plain English', () => {
    expect(strings.walk.hint).toBe('Row with both fists to walk');
    for (const text of [strings.walk.hint, strings.walk.needsHands]) expect(text).toMatch(/^[\x20-\x7e]+$/);
  });

  it('the fixed column is Menu, Issues, View: 7 cm apart, 1 cm free between the rectangles', () => {
    const menu = createButtonPair();
    menu[1].x = 0.3;
    menu[1].y = 1.4;
    menu[1].z = -0.5;
    menu[1].yawRad = 0.4;
    const issues = issueButtonAnchors(menu);
    const view = viewButtonAnchors(issues);
    const all = [menu[1], issues[1], view[1]];
    const p = { x: view[1].x, y: view[1].y, z: view[1].z };
    expect(pickButton(p, all)).toBe(view[1]);
    expect(pickButton({ ...p, y: view[1].y + 0.04 }, all)).toBeNull();
    const column: ButtonColumn = { x: 0, z: 0, halfWidth: 0, yBottom: 0, yTop: 0 };
    fillButtonColumn(column, menu[1], issues[1], view[1]);
    expect(column.yTop).toBeCloseTo(view[1].y + VIEW_BUTTON_HALF_HEIGHT, 12);
    expect(column.yBottom).toBeCloseTo(menu[1].y - BUTTON_HALF_HEIGHT, 12);
  });
});

describe('the comfort vignette', () => {
  it('is nothing at rest and below the minimum speed, grows with the speed, and never passes its maximum', () => {
    expect(vignetteTarget(0)).toBe(0);
    expect(vignetteTarget(VIGNETTE_MIN_SPEED)).toBe(0);
    expect(vignetteTarget(0.3)).toBeGreaterThan(0);
    expect(vignetteTarget(0.6)).toBeGreaterThan(vignetteTarget(0.3));
    expect(vignetteTarget(MAX_WALK_SPEED)).toBeCloseTo(VIGNETTE_MAX, 12);
    expect(vignetteTarget(100)).toBeCloseTo(VIGNETTE_MAX, 12);
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
