import { describe, expect, it } from 'vitest';
import { LARGE_TEXT_FACTOR } from '../../src/logic/access';
import { ISSUE_PANEL_EXTENT } from '../../src/logic/issue-panel';
import { MENU_EXTENT, scaleExtent, type PanelExtent } from '../../src/logic/menu';
import { pinnedConeAngleDeg, pinnedPanelAnchor, yawOfForward } from '../../src/logic/menu-anchor';
import { VIEW_CONE_HALF_ANGLE_DEG } from '../../src/logic/menu-thresholds';
import {
  PANEL_IDS,
  formatPanelArbiter,
  formatPanelConflict,
  panelViewBox,
  panelWinner,
  panelsToClose,
  panelsToReconcile,
  viewBoxOverlap,
  type OpenPanels,
  type PanelId,
  type ViewBox,
} from '../../src/logic/panel-arbiter';
import { layoutExtent, viewLayout } from '../../src/logic/view-panel';
import type { Point3Like } from '../../src/logic/view-fit';

// The menu, the View panel and the Issues panel open in the same place (fix/panel-overlap): they can never be open together.

const DEG = Math.PI / 180;
const HEAD: Point3Like = { x: 0.2, y: 1.6, z: -0.3 };

/** Every combination of open panels (8), as flags. */
function combos(): OpenPanels[] {
  const out: OpenPanels[] = [];
  for (let mask = 0; mask < 8; mask += 1) out.push({ menu: (mask & 1) !== 0, view: (mask & 2) !== 0, issues: (mask & 4) !== 0 });
  return out;
}

const countOpen = (open: OpenPanels): number => PANEL_IDS.filter((id) => open[id]).length;

describe('panelsToClose', () => {
  it('closes exactly the other panels that are open, for every combination', () => {
    for (const opening of PANEL_IDS) {
      for (const open of combos()) {
        const closing = panelsToClose(opening, open);
        expect(closing).not.toContain(opening);
        for (const id of PANEL_IDS) expect(closing.includes(id)).toBe(id !== opening && open[id]);
      }
    }
  });

  it('menu + View, menu + Issues, View + Issues and all three: one panel is left after the opening', () => {
    const pairs: [PanelId, PanelId][] = [
      ['menu', 'view'],
      ['menu', 'issues'],
      ['view', 'issues'],
    ];
    for (const [a, b] of pairs) {
      for (const [opening, other] of [[a, b], [b, a]] as [PanelId, PanelId][]) {
        const open = { menu: false, view: false, issues: false, [other]: true } as OpenPanels;
        expect(panelsToClose(opening, open)).toEqual([other]);
      }
    }
    for (const opening of PANEL_IDS) {
      const closing = panelsToClose(opening, { menu: true, view: true, issues: true });
      expect(closing).toHaveLength(2);
      expect(closing).not.toContain(opening);
    }
  });

  it('closes nothing when the panel opens alone, or when it is the only one open', () => {
    for (const id of PANEL_IDS) {
      expect(panelsToClose(id, { menu: false, view: false, issues: false })).toEqual([]);
      expect(panelsToClose(id, { menu: id === 'menu', view: id === 'view', issues: id === 'issues' })).toEqual([]);
    }
  });
});

describe('panelWinner and panelsToReconcile', () => {
  it('keeps the panel opened last, whatever the combination', () => {
    for (const open of combos()) {
      for (const stamps of [
        { menu: 1, view: 2, issues: 3 },
        { menu: 3, view: 2, issues: 1 },
        { menu: 2, view: 3, issues: 1 },
        { menu: 0, view: 0, issues: 0 },
      ]) {
        const winner = panelWinner(open, stamps);
        const losers = panelsToReconcile(open, stamps);
        if (countOpen(open) === 0) {
          expect(winner).toBeNull();
          expect(losers).toEqual([]);
          continue;
        }
        expect(winner).not.toBeNull();
        expect(open[winner as PanelId]).toBe(true);
        for (const id of PANEL_IDS) if (open[id]) expect(stamps[id]).toBeLessThanOrEqual(stamps[winner as PanelId]);
        // Exactly one panel is left open.
        expect(losers).toHaveLength(countOpen(open) - 1);
        expect(losers).not.toContain(winner);
        for (const id of losers) expect(open[id]).toBe(true);
      }
    }
  });

  it('breaks a tie the same way every time (menu, then Issues, then View)', () => {
    const tie = { menu: 5, view: 5, issues: 5 };
    expect(panelWinner({ menu: true, view: true, issues: true }, tie)).toBe('menu');
    expect(panelWinner({ menu: false, view: true, issues: true }, tie)).toBe('issues');
    expect(panelWinner({ menu: false, view: true, issues: false }, tie)).toBe('view');
  });

  it('a panel that never announced itself (stamp 0) loses to one that did', () => {
    expect(panelWinner({ menu: true, view: true, issues: false }, { menu: 0, view: 1, issues: 0 })).toBe('view');
    expect(panelsToReconcile({ menu: true, view: true, issues: false }, { menu: 0, view: 1, issues: 0 })).toEqual(['menu']);
  });
});

describe('a sequence of openings never leaves two panels open', () => {
  it('holds for 2000 seeded random openings and closings', () => {
    let seed = 20261115;
    const next = (): number => {
      seed = (seed * 1664525 + 1013904223) % 4294967296;
      return seed / 4294967296;
    };
    const open: Record<PanelId, boolean> = { menu: false, view: false, issues: false };
    for (let i = 0; i < 2000; i += 1) {
      const id = PANEL_IDS[Math.floor(next() * 3)];
      if (next() < 0.25) {
        open[id] = false; // the user closes it
      } else {
        for (const other of panelsToClose(id, open)) open[other] = false;
        open[id] = true;
      }
      expect(countOpen(open)).toBeLessThanOrEqual(1);
    }
  });
});

describe('log lines', () => {
  it('names who opened and who closed', () => {
    expect(formatPanelArbiter('view', ['menu', 'issues'])).toBe('panel arbiter opened=view closed=menu,issues');
    expect(formatPanelArbiter('menu', [])).toBe('panel arbiter opened=menu closed=-');
    expect(formatPanelConflict('issues', ['view'])).toBe('panel conflict kept=issues closed=view');
  });
});

describe('why the rule is needed: the three panels open in the same place', () => {
  const NORMAL = { menu: MENU_EXTENT, view: layoutExtent(viewLayout(false)), issues: ISSUE_PANEL_EXTENT } as const;
  const LARGE = {
    menu: scaleExtent(MENU_EXTENT, LARGE_TEXT_FACTOR),
    view: layoutExtent(viewLayout(true)),
    issues: scaleExtent(ISSUE_PANEL_EXTENT, LARGE_TEXT_FACTOR),
  } as const;

  function boxOf(extent: PanelExtent, large: boolean, pitchDeg: number, yawRad: number, head: Point3Like): ViewBox {
    const anchor = pinnedPanelAnchor(head, yawRad, pitchDeg * DEG, extent, large, { x: 0, y: 0, z: 0 });
    return panelViewBox(head, yawRad, anchor, yawRad, extent, { azMin: 0, azMax: 0, elMin: 0, elMax: 0 });
  }

  it('each pair covers most of the same part of the view, at any pitch and heading, normal and large text', () => {
    const pairs: [PanelId, PanelId][] = [
      ['menu', 'view'],
      ['menu', 'issues'],
      ['view', 'issues'],
    ];
    for (const large of [false, true]) {
      const extents = large ? LARGE : NORMAL;
      for (const pitchDeg of [-50, -30, -20, -8, 0, 8, 25]) {
        for (const yawDeg of [-120, -30, 0, 45, 170]) {
          for (const [a, b] of pairs) {
            const boxA = boxOf(extents[a], large, pitchDeg, yawDeg * DEG, HEAD);
            const boxB = boxOf(extents[b], large, pitchDeg, yawDeg * DEG, HEAD);
            expect(viewBoxOverlap(boxA, boxB)).toBeGreaterThan(0.5);
          }
        }
      }
    }
  });

  it('the panel that stays open is inside the cone (menu, View, Issues; normal and large text; left or right hand does not move it)', () => {
    // The side of the fixed buttons and the hand of the palm menu (`prefs.leftHandMenu`) do not enter the anchor of a pinned panel:
    // the same head gives the same place, so the rule has nothing to do with the hand.
    for (const large of [false, true]) {
      const extents = large ? LARGE : NORMAL;
      for (const id of PANEL_IDS) {
        const yaw = yawOfForward(0, -1);
        const anchor = pinnedPanelAnchor(HEAD, yaw, 0, extents[id], large, { x: 0, y: 0, z: 0 });
        const angle = pinnedConeAngleDeg(anchor, yaw, HEAD, { x: 0, y: 0, z: -1 }, extents[id]);
        expect(angle).toBeLessThanOrEqual(VIEW_CONE_HALF_ANGLE_DEG + 1e-6);
      }
    }
  });
});

describe('viewBoxOverlap', () => {
  const a: ViewBox = { azMin: -10, azMax: 10, elMin: -10, elMax: 10 };

  it('is 0 apart, 1 when one holds the other, and a fraction in between', () => {
    expect(viewBoxOverlap(a, { azMin: 20, azMax: 30, elMin: -10, elMax: 10 })).toBe(0);
    expect(viewBoxOverlap(a, { azMin: -5, azMax: 5, elMin: -5, elMax: 5 })).toBe(1);
    expect(viewBoxOverlap(a, { azMin: 0, azMax: 20, elMin: -10, elMax: 10 })).toBeCloseTo(0.5, 6);
  });

  it('counts a gap smaller than the margin as touching', () => {
    const near: ViewBox = { azMin: 11, azMax: 21, elMin: -10, elMax: 10 };
    expect(viewBoxOverlap(a, near, 0)).toBe(0);
    expect(viewBoxOverlap(a, near, 1.5)).toBeGreaterThan(0);
  });
});

describe('panelViewBox', () => {
  it('a panel straight ahead is centred on the gaze and does not depend on the heading', () => {
    const extent: PanelExtent = { halfWidth: 0.2, bottom: 0, top: 0.4 };
    for (const yawDeg of [0, 90, -135, 180]) {
      const yaw = yawDeg * DEG;
      const anchor = { x: HEAD.x - Math.sin(yaw) * 0.5, y: HEAD.y - 0.2, z: HEAD.z - Math.cos(yaw) * 0.5 };
      const box = panelViewBox(HEAD, yaw, anchor, yaw, extent, { azMin: 0, azMax: 0, elMin: 0, elMax: 0 });
      expect(box.azMin).toBeCloseTo(-box.azMax, 6);
      expect(box.elMin).toBeCloseTo(-box.elMax, 6);
      expect(box.azMax).toBeCloseTo(Math.atan(0.2 / 0.5) / DEG, 3);
    }
  });
});
