import { readdirSync, readFileSync } from 'node:fs';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { BUTTON_WIDTH, PAGE_INDICATOR_WIDTH, BAR_HEIGHT, MENU_WIDTH } from '../../src/logic/menu';
import { repoPath } from '../helpers/load-json';

// The font module needs the browser; the look of a panel does not.
vi.mock('../../src/ui/fonts', () => ({ applyPanelFont: () => 0 }));

const { applyPanelTheme } = await import('../../src/ui/panel-theme');
const { buttonLook, highContrastUiColors, setAccessibility, uiColors, uiTokens } = await import('../../src/ui/theme');

afterEach(() => setAccessibility({ contrast: false, largeText: false }));

// The visual language of the panels (UI polish): ONE set of tokens in src/ui/theme.ts, carried by every public/ui/*.uikitml file.
// This test reads the files and checks that nothing in them is off the set, so a new panel cannot drift from the others.

const dir = repoPath('public/ui');
const files = readdirSync(dir).filter((file) => file.endsWith('.uikitml'));

interface Box {
  readonly file: string;
  readonly id: string;
  readonly style: Readonly<Record<string, string>>;
}

function boxes(): Box[] {
  const out: Box[] = [];
  for (const file of files) {
    const source = readFileSync(`${dir}/${file}`, 'utf8');
    for (const match of source.matchAll(/id="([^"]+)" style="([^"]*)"/g)) {
      const style: Record<string, string> = {};
      for (const part of match[2].split(';')) {
        const [key, value] = part.split(':').map((text) => text.trim());
        if (key && value) style[key] = value;
      }
      out.push({ file, id: match[1], style });
    }
  }
  return out;
}

const ALL = boxes();
/** The colours that mean something and are not themed: the neutral and violet dots, the red of a reason label and of the error panel. */
const MEANING_COLORS = ['#8a8f98', '#9b59d0', '#e5322d', '#b3261e'];
const TOKEN_COLORS = [uiColors.surface, uiColors.secondary, uiColors.border, uiColors.ink, uiColors.inkSoft, uiColors.primary, uiColors.primaryInk];

describe('the files of public/ui carry the tokens and nothing else', () => {
  it('finds the panels', () => {
    expect(files.length).toBeGreaterThanOrEqual(20);
    expect(ALL.length).toBeGreaterThan(200);
  });

  it('uses only the colours of the set (and the dots that mean a status)', () => {
    for (const box of ALL) {
      for (const key of ['background-color', 'border-color', 'color']) {
        const value = box.style[key];
        if (value === undefined) continue;
        expect([...TOKEN_COLORS, ...MEANING_COLORS], `${box.file} ${box.id} ${key}`).toContain(value);
      }
    }
  });

  it('draws every border as the hairline of the tokens (the error panel keeps its heavier red one)', () => {
    for (const box of ALL) {
      const width = box.style['border-width'];
      if (width === undefined || box.file === 'error-panel.uikitml') continue;
      expect(Number(width), `${box.file} ${box.id}`).toBe(uiTokens.border.width);
    }
  });

  it('rounds every box as a card, a pill (at most `pillMax`, half the height) or a dot', () => {
    for (const box of ALL) {
      const radius = box.style['border-radius'];
      if (radius === undefined || box.file === 'error-panel.uikitml' || box.file === 'debug-hud.uikitml') continue;
      const value = Number(radius);
      const height = Number(box.style.height ?? Number.NaN);
      const isDot = box.style.width !== undefined && box.style.width === box.style.height && value === height / 2;
      const isPill = Number.isFinite(height) && Math.abs(value - Math.min(height / 2, uiTokens.radius.pillMax)) < 1e-9;
      const isCard = value === uiTokens.radius.card;
      expect(isDot || isPill || isCard, `${box.file} ${box.id} radius ${radius} height ${box.style.height}`).toBe(true);
    }
  });

  it('keeps the text of the panels at 2.4 cm or more (the debug panel excepted) and the title at the token size', () => {
    for (const box of ALL) {
      const size = box.style['font-size'];
      if (size === undefined || box.file === 'debug-hud.uikitml') continue;
      expect(Number(size), `${box.file} ${box.id}`).toBeGreaterThanOrEqual(uiTokens.type.body);
    }
    for (const title of ['palm-menu-title', 'issue-panel-title', 'view-panel-title']) {
      const box = ALL.find((candidate) => candidate.id === title);
      expect(Number(box?.style['font-size']), title).toBeGreaterThanOrEqual(uiTokens.type.title);
    }
  });

  it('gives a title the accent colour and a label the soft ink, so the hierarchy reads at a glance', () => {
    for (const title of ['palm-menu-title', 'issue-panel-title', 'view-panel-title']) {
      expect(ALL.find((candidate) => candidate.id === title)?.style.color, title).toBe(uiColors.primary);
    }
    for (const row of ['zoom', 'turn', 'month', 'hour', 'contrast', 'text', 'hand']) {
      expect(ALL.find((candidate) => candidate.id === `view-panel-${row}-label`)?.style.color, row).toBe(uiColors.inkSoft);
    }
  });
});

describe('the bar of the menu: arrows with a page indicator between them', () => {
  it('fills the width of the menu with five cells and four gaps of the token size', () => {
    const cells = BUTTON_WIDTH.undo + BUTTON_WIDTH.prev + PAGE_INDICATOR_WIDTH + BUTTON_WIDTH.next + BUTTON_WIDTH.recenter;
    expect(cells + 4 * uiTokens.gap).toBeCloseTo(MENU_WIDTH, 9);
  });

  it('makes Back and Next round-ish arrows: as tall as the bar, at least 5.2 cm wide, a pill', () => {
    for (const id of ['menu-btn-prev', 'menu-btn-next']) {
      const box = ALL.find((candidate) => candidate.id === id);
      expect(Number(box?.style.height), id).toBe(BAR_HEIGHT);
      expect(Number(box?.style.width), id).toBeGreaterThanOrEqual(5.2);
      expect(Number(box?.style['border-radius']), id).toBe(uiTokens.radius.pillMax);
    }
  });
});

describe('the look of the buttons', () => {
  it('has a primary button with no visible border in the normal theme and the yellow border in high contrast', () => {
    expect(buttonLook('primary').borderColor).toBe(uiColors.primary);
    expect(buttonLook('secondary').borderColor).toBe(uiColors.border);
    setAccessibility({ contrast: true, largeText: false });
    expect(buttonLook('primary').borderColor).toBe(highContrastUiColors.border);
    expect(buttonLook('secondary').borderColor).toBe(highContrastUiColors.border);
  });
});

/** A minimal stand-in for the UIKit tree: what `applyPanelTheme` reads (`properties.peek`), writes (`setProperties`) and walks (`traverse`). */
function fakePanel(root: Record<string, unknown>, children: Record<string, unknown>[] = []) {
  const make = (initial: Record<string, unknown>) => {
    const state = { ...initial };
    return {
      state,
      properties: { peek: () => state },
      setProperties: (patch: Record<string, unknown>) => Object.assign(state, patch),
      traverse(visit: (node: unknown) => void) {
        visit(this);
        for (const child of kids) visit(child);
      },
    };
  };
  const kids = children.map(make);
  const top = make(root);
  return { doc: { getElementById: () => top as never }, top, kids };
}

describe('the hairline border in high contrast', () => {
  const body = { backgroundColor: uiColors.surface, borderColor: uiColors.border, borderWidth: 0.2, paddingLeft: 0.2, paddingRight: 0.2, paddingTop: 0.6, paddingBottom: 0.2 };

  it('is twice as thick and takes the extra from the padding, so the content does not move', () => {
    const { doc, top } = fakePanel(body);
    setAccessibility({ contrast: true, largeText: false });
    applyPanelTheme(doc as never, 'root', 'none');
    expect(top.state.borderWidth).toBeCloseTo(0.2 * uiTokens.border.highContrastFactor, 9);
    // border + padding is what it was: 0.2 + 0.2 on the sides, 0.2 + 0.6 on top
    expect(Number(top.state.borderWidth) + Number(top.state.paddingLeft)).toBeCloseTo(0.4, 9);
    expect(Number(top.state.borderWidth) + Number(top.state.paddingTop)).toBeCloseTo(0.8, 9);
    expect(top.state.borderColor).toBe(highContrastUiColors.border);
    expect(top.state.backgroundColor).toBe(highContrastUiColors.surface);
  });

  it('goes back to the hairline and the original padding when the preference is turned off', () => {
    const { doc, top } = fakePanel(body);
    setAccessibility({ contrast: true, largeText: false });
    applyPanelTheme(doc as never, 'root', 'none');
    setAccessibility({ contrast: false, largeText: false });
    applyPanelTheme(doc as never, 'root', 'none');
    expect(top.state).toMatchObject(body);
  });

  it('does not take more padding than there is (a box with no padding keeps none)', () => {
    const { doc, top } = fakePanel({ ...body, paddingLeft: 0.1 });
    setAccessibility({ contrast: true, largeText: false });
    applyPanelTheme(doc as never, 'root', 'none');
    expect(Number(top.state.paddingLeft)).toBeGreaterThanOrEqual(0);
  });

  it('thickens a bordered panel that scales with large text by the scale as well', () => {
    const { doc, top } = fakePanel({ ...body, width: 36, fontSize: 2.4 });
    setAccessibility({ contrast: true, largeText: true });
    applyPanelTheme(doc as never, 'root', 'scale');
    expect(Number(top.state.borderWidth)).toBeCloseTo(0.2 * 2 * 1.25, 9);
    expect(Number(top.state.width)).toBeCloseTo(36 * 1.25 * 1.02, 9);
  });
});
