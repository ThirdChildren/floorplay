import { describe, expect, it } from 'vitest';
import { BACK_HOME_LOCK_MS, decideBackHome, formatBackHomeLine, type BackHomeInput } from '../../src/logic/back-home';
import { isValidStableId, stableId } from '../../src/logic/ids';
import {
  BAR_GAP,
  HEADER_HEIGHT,
  HEADER_LEFT_WIDTH,
  HOME_SLOT,
  HOME_WIDTH,
  ITEM_BORDER,
  ITEM_SLOTS,
  ITEM_HALF,
  MENU_EXTENT,
  MENU_TABS,
  MENU_WIDTH,
  TAB_WIDTH,
  TITLE_PANEL_WIDTH,
  pickRect,
  tabSlots,
  type Quat,
} from '../../src/logic/menu';
import { strings } from '../../src/ui/strings';
import { loadJson } from '../helpers/load-json';

const ready: BackHomeInput = { hasSession: true, canEnd: true, leaving: false, introOnPage: true };

describe('decideBackHome', () => {
  it('ends the session and lands on the start screen when the page has one', () => {
    expect(decideBackHome(ready)).toEqual({ action: 'end-session', landing: 'intro' });
  });

  it('with intro=0 it still ends the session, and lands on the plain page', () => {
    expect(decideBackHome({ ...ready, introOnPage: false })).toEqual({ action: 'end-session', landing: 'page' });
  });

  it('ignores a second press while the session is ending', () => {
    expect(decideBackHome({ ...ready, leaving: true })).toEqual({ action: 'ignore', reason: 'already-leaving' });
  });

  it('ignores a press outside a session (the debug key opens the menu on the flat page)', () => {
    expect(decideBackHome({ ...ready, hasSession: false, canEnd: false })).toEqual({ action: 'ignore', reason: 'no-session' });
  });

  it('ignores a press when the browser gives no way to end the session', () => {
    expect(decideBackHome({ ...ready, canEnd: false })).toEqual({ action: 'ignore', reason: 'end-unavailable' });
  });

  it('writes one log line per decision', () => {
    expect(formatBackHomeLine(decideBackHome(ready))).toBe('back to home requested landing=intro');
    expect(formatBackHomeLine(decideBackHome({ ...ready, introOnPage: false }))).toBe('back to home requested landing=page');
    expect(formatBackHomeLine(decideBackHome({ ...ready, hasSession: false }))).toBe('back to home ignored reason=no-session');
  });

  it('unlocks a press that the browser never answered, after a few seconds', () => {
    expect(BACK_HOME_LOCK_MS).toBeGreaterThanOrEqual(2000);
    expect(BACK_HOME_LOCK_MS).toBeLessThanOrEqual(10000);
  });
});

describe('the "Back to home" control of the palm menu', () => {
  it('has its own stable id', () => {
    expect(stableId.ui('menu-home')).toBe('ui:menu-home');
    expect(isValidStableId(stableId.ui('menu-home'))).toBe(true);
  });

  it('is labelled in plain English', () => {
    expect(strings.menu.home).toBe('Back to home');
    expect(/[^\x20-\x7e]/.test(strings.menu.home)).toBe(false);
  });

  it('shares the header with the tabs: the right end, same height, nothing overlaps, nothing sticks out', () => {
    expect(TITLE_PANEL_WIDTH + BAR_GAP + HOME_WIDTH).toBeCloseTo(MENU_WIDTH, 9);
    expect(HEADER_LEFT_WIDTH).toBeCloseTo(TITLE_PANEL_WIDTH, 9);
    const tabs = tabSlots([...MENU_TABS]);
    const lastRight = Math.max(...tabs.map((tab) => tab.dx + tab.halfWidth));
    expect(HOME_SLOT.dx - HOME_SLOT.halfWidth - lastRight).toBeGreaterThanOrEqual(BAR_GAP / 100 - 1e-12);
    expect(HOME_SLOT.dx + HOME_SLOT.halfWidth).toBeLessThanOrEqual(MENU_EXTENT.halfWidth + 1e-12);
    expect(HOME_SLOT.halfHeight * 200).toBeCloseTo(HEADER_HEIGHT, 9);
    for (const tab of tabs) expect(tab.dy).toBeCloseTo(HOME_SLOT.dy, 12);
    // At least 4 cm tall and 6 cm wide to pinch (rule 8 of the menu).
    expect(HOME_SLOT.halfHeight * 200).toBeGreaterThanOrEqual(4);
    expect(HOME_SLOT.halfWidth * 200).toBeGreaterThanOrEqual(6);
  });

  it('sits above the first row of cards, so a pinch on a card is never a pinch on it', () => {
    const topCard = ITEM_SLOTS[0].dy + ITEM_HALF.halfHeight;
    expect(HOME_SLOT.dy - HOME_SLOT.halfHeight).toBeGreaterThanOrEqual(topCard);
    expect(HOME_SLOT.dy + HOME_SLOT.halfHeight).toBeLessThanOrEqual(MENU_EXTENT.top + 1e-12);
  });

  it('keeps the label, in bold at 2.4 cm, inside its box with 0.5 cm to spare', () => {
    const atlas = loadJson<{ chars: { char: string; xadvance: number }[]; info: { size: number } }>('public', 'fonts', 'inter-bold.json');
    const advance = new Map(atlas.chars.map((glyph) => [glyph.char, glyph.xadvance / atlas.info.size]));
    const width = [...strings.menu.home].reduce((sum, c) => sum + (advance.get(c) ?? 0.65), 0) * 2.4;
    expect(width).toBeLessThanOrEqual(HOME_WIDTH - 2 * ITEM_BORDER - 0.5);
  });

  it('is picked by a pinch on it, and by no pinch on a tab or the title', () => {
    const frame: Quat = { x: 0, y: 0, z: 0, w: 1 };
    const slots = [
      { id: 'ui:menu-home', x: HOME_SLOT.dx, y: HOME_SLOT.dy, z: 0, halfWidth: HOME_SLOT.halfWidth, halfHeight: HOME_SLOT.halfHeight },
      ...tabSlots([...MENU_TABS]).map((tab) => ({ id: `tab-${tab.tab}`, x: tab.dx, y: tab.dy, z: 0, halfWidth: tab.halfWidth, halfHeight: tab.halfHeight })),
    ];
    expect(pickRect({ x: HOME_SLOT.dx, y: HOME_SLOT.dy, z: 0.01 }, slots, frame)?.id).toBe('ui:menu-home');
    expect(pickRect({ x: HOME_SLOT.dx + HOME_SLOT.halfWidth - 0.005, y: HOME_SLOT.dy, z: 0 }, slots, frame)?.id).toBe('ui:menu-home');
    for (const tab of tabSlots([...MENU_TABS])) {
      expect(pickRect({ x: tab.dx, y: tab.dy, z: 0 }, slots, frame)?.id).toBe(`tab-${tab.tab}`);
    }
  });

  it('keeps two tabs and the home control in 36 cm', () => {
    expect(MENU_TABS.reduce((sum, tab) => sum + TAB_WIDTH[tab], 0) + BAR_GAP * (MENU_TABS.length - 1) + BAR_GAP + HOME_WIDTH).toBeCloseTo(MENU_WIDTH, 9);
  });
});
