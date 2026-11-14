// The start screen of the web page (before the immersive session). Plain DOM over the canvas, built for the Quest Browser 2D page used
// with hands (point and pinch) as much as for a mouse: big targets (72 px buttons, 64 px steppers), text of 22 px and more, high contrast.
// Three entries: Load house file (the section of `house-file-panel.ts`), Furniture (the size of every catalog item) and Enter VR.
// Everything that comes from a file is shown with `textContent` only, never as HTML. Text comes from `strings.introStrings`.
//
// The page is built for ONE house (`house=` in the URL). Selecting another house, or loading a file, opens the page again with that
// house (`houseSwitchSearch`), so Enter VR always starts the house that the screen shows as selected. The same is done after a change of
// the furniture sizes: the catalog is read once, when the page loads, so "Apply and go back" opens the page again.

import type { World } from '@iwsdk/core';
import { slog } from '../log';
import type { CatalogSizeStore } from '../data/catalog-sizes';
import type { HouseFiles } from '../data/house-files';
import type { CatalogItem } from '../logic/catalog';
import {
  AXES,
  checkCm,
  clampCm,
  limitsCm,
  NO_OVERRIDES,
  overrideCount,
  parseCmText,
  stepCm,
  withoutItem,
  withSide,
  type Axis,
  type SizeOverrides,
} from '../logic/catalog-sizes';
import type { House } from '../logic/house';
import { houseSwitchSearch } from '../logic/house-file';
import { enterVrState, formatSizeCm, furnitureRows, sameOverrides, type FurnitureRow, type VrSupport } from '../logic/intro';
import type { Store } from '../logic/state';
import { probeImmersiveSupport, requestImmersive, type ImmersiveMode } from '../systems/xr-entry';
import { mountHouseFiles, type HouseFileSection } from './house-file-panel';
import { houseFileStrings as hf, introStrings as t } from './strings';

/** Centimetres per press of a stepper. A number can also be typed for a finer value. */
const STEP_CM = 5;

type Screen = 'home' | 'houses' | 'furniture';

export type CatalogState = { kind: 'loading' } | { kind: 'failed' } | { kind: 'ready'; items: readonly CatalogItem[]; applied: SizeOverrides };

export interface IntroScreen {
  /** The selected house, once it is loaded (null: it could not be opened). */
  setHouse(house: House | null): void;
  /** The catalog of the file (NOT with the sizes applied) and the overrides that the page was built with, or that it failed to load. */
  setCatalog(state: CatalogState): void;
  /** Starts checking the browser for this kind of session. */
  setMode(mode: ImmersiveMode): void;
  /** The world is built: Enter VR can work. */
  setWorld(world: World): void;
  dispose(): void;
}

const STYLE = `
.soglia-intro{--bg:#10151c;--fg:#fff;--line:#9fb3c8;--panel:#1a222d;--accent:#ffd400;--accent-fg:#000;--bad:#ff9a9a;--fs:22px;
  position:fixed;inset:0;z-index:100;box-sizing:border-box;overflow:auto;background:var(--bg);color:var(--fg);
  font:var(--fs)/1.4 system-ui,sans-serif;-webkit-text-size-adjust:100%}
.soglia-intro.soglia-intro-contrast{--bg:#000;--line:#fff;--panel:#000;--bad:#ff7a7a}
@media (prefers-contrast:more){.soglia-intro{--bg:#000;--line:#fff;--panel:#000;--bad:#ff7a7a}}
.soglia-intro.soglia-intro-large{--fs:28px}
.soglia-intro[hidden]{display:none}
.soglia-intro *{box-sizing:border-box}
.soglia-intro-inner{max-width:780px;margin:0 auto;padding:24px 20px 56px}
.soglia-intro h1{margin:0 0 4px;font-size:2em;line-height:1.15}
.soglia-intro h2{margin:0 0 8px;font-size:1.4em;line-height:1.2}
.soglia-intro h1:focus,.soglia-intro h2:focus{outline:none}
.soglia-intro p{margin:0 0 12px}
.soglia-intro-card{margin:16px 0;padding:16px;border:3px solid var(--line);border-radius:12px;background:var(--panel)}
.soglia-intro-card .soglia-intro-label{margin:0 0 4px;font-size:.85em;opacity:.9}
.soglia-intro-card .soglia-intro-house{margin:0;font-size:1.3em;font-weight:700;overflow-wrap:anywhere}
.soglia-intro-card.soglia-intro-bad{border-color:var(--bad)}
.soglia-intro button{display:block;width:100%;min-height:72px;margin:0 0 14px;padding:12px 18px;border:4px solid var(--fg);border-radius:12px;
  background:transparent;color:var(--fg);font:700 1em/1.25 system-ui,sans-serif;text-align:left;cursor:pointer}
.soglia-intro button .soglia-intro-hint{display:block;margin-top:2px;font-weight:400;font-size:.8em}
.soglia-intro button.soglia-intro-primary{background:var(--accent);border-color:var(--accent);color:var(--accent-fg)}
.soglia-intro button[disabled]{opacity:.6;border-style:dashed;cursor:default}
.soglia-intro button:focus-visible,.soglia-intro input:focus-visible{outline:5px solid #00e5ff;outline-offset:3px}
.soglia-intro-note{min-height:1.4em;margin:-4px 0 12px}
.soglia-intro-note.soglia-intro-bad{color:var(--bad);font-weight:700}
.soglia-intro-row{display:flex;flex-wrap:wrap;gap:12px;align-items:center}
.soglia-intro-row button{width:auto;margin:0}
.soglia-intro-back{width:auto!important;min-width:160px;text-align:center!important}
/* The homes section keeps its own rules; here its buttons and list follow the size of the start screen. */
.soglia-intro .soglia-hf{font:inherit;color:inherit}
.soglia-intro .soglia-hf button{display:inline-block;width:auto;min-height:64px;margin:0 12px 10px 0;font-size:1em;text-align:center}
.soglia-intro .soglia-hf button.soglia-hf-primary{background:var(--accent);border-color:var(--accent);color:var(--accent-fg)}
.soglia-intro .soglia-hf button.soglia-hf-danger{background:transparent;color:var(--fg);border-color:var(--fg)}
.soglia-intro .soglia-hf li{border-color:var(--line);background:var(--panel);padding:14px}
.soglia-intro .soglia-hf-tag{font-size:.8em}
.soglia-intro .soglia-hf-error{background:var(--panel)}
.soglia-intro .soglia-hf-error li{font-size:.85em}
.soglia-intro.soglia-hf-drag .soglia-hf-droparea{color:var(--accent)}
.soglia-intro-sizes{list-style:none;margin:16px 0 0;padding:0}
.soglia-intro-sizes>li{margin:0 0 16px;padding:16px;border:3px solid var(--line);border-radius:12px;background:var(--panel)}
.soglia-intro-sizes>li.soglia-intro-changed{border-color:var(--accent)}
.soglia-intro-item-head{display:flex;flex-wrap:wrap;gap:8px;align-items:baseline;justify-content:space-between;margin-bottom:6px}
.soglia-intro-item-name{font-size:1.2em;font-weight:700}
.soglia-intro-tag{padding:0 10px;border:2px solid var(--accent);border-radius:6px;color:var(--accent);font-size:.8em}
.soglia-intro-tag[hidden]{display:none}
.soglia-intro-now{margin:0 0 2px;font-weight:700}
.soglia-intro-def{margin:0 0 12px;font-size:.85em;opacity:.9}
.soglia-intro-axis{display:flex;flex-wrap:wrap;gap:10px;align-items:center;margin:0 0 4px}
.soglia-intro-axis-name{flex:0 0 5.2em;font-weight:700}
.soglia-intro-axis .soglia-intro-step{width:64px;min-width:64px;min-height:64px;margin:0;padding:0;text-align:center;font-size:1.5em}
.soglia-intro-axis input{width:5.2em;min-height:64px;padding:6px 8px;border:4px solid var(--fg);border-radius:12px;background:var(--bg);color:var(--fg);
  font:700 1.2em system-ui,sans-serif;text-align:center}
.soglia-intro-axis input[aria-invalid="true"]{border-color:var(--bad)}
.soglia-intro-unit{font-size:.85em}
.soglia-intro-range{font-size:.8em;opacity:.9}
.soglia-intro-err:empty{display:none}
.soglia-intro-err{min-height:1.2em;margin:0 0 6px;color:var(--bad);font-weight:700;font-size:.9em}
.soglia-intro-item-reset{width:auto!important;min-height:56px!important;margin:0!important;text-align:center!important}
`;

type Handle<K extends keyof HTMLElementTagNameMap> = HTMLElementTagNameMap[K];

function el<K extends keyof HTMLElementTagNameMap>(tag: K, className?: string, text?: string): Handle<K> {
  const node = document.createElement(tag);
  if (className) node.className = className;
  if (text !== undefined) node.textContent = text;
  return node;
}

/** A button with a title and an optional second line. `data-soglia` is the stable id the QA looks for. */
function bigButton(id: string, title: string, hint: string | null, primary: boolean): HTMLButtonElement {
  const button = el('button', primary ? 'soglia-intro-primary' : undefined);
  button.type = 'button';
  button.dataset.soglia = id;
  button.append(el('span', undefined, title));
  if (hint) button.append(el('span', 'soglia-intro-hint', hint));
  return button;
}

interface RowRefs {
  row: FurnitureRow;
  item: HTMLLIElement;
  tag: HTMLElement;
  now: HTMLElement;
  errs: [HTMLElement, HTMLElement, HTMLElement];
  reset: HTMLButtonElement;
  inputs: [HTMLInputElement, HTMLInputElement, HTMLInputElement];
  minus: [HTMLButtonElement, HTMLButtonElement, HTMLButtonElement];
  plus: [HTMLButtonElement, HTMLButtonElement, HTMLButtonElement];
}

export interface IntroDeps {
  store: Store;
  houseFiles: HouseFiles;
  sizeStore: CatalogSizeStore;
  /** The id of the house the page is built for (`house=`). */
  houseId: string;
  /** Replaced in tests. */
  reopen?: (houseId: string) => void;
}

export function createIntroScreen(deps: IntroDeps): IntroScreen {
  const { store, houseFiles, sizeStore, houseId } = deps;
  const reopen =
    deps.reopen ??
    ((id: string): void => {
      const search = houseSwitchSearch(window.location.search, id);
      window.location.assign(`${window.location.pathname}${search}${window.location.hash}`);
    });

  const style = el('style');
  style.textContent = STYLE;
  document.head.append(style);

  const root = el('div', 'soglia-intro');
  root.dataset.soglia = 'intro';
  const inner = el('div', 'soglia-intro-inner');
  root.append(inner);

  // --- state -------------------------------------------------------------------------------------------------------
  let house: House | null = null;
  let houseKnown = false;
  let support: VrSupport = 'checking';
  let world: World | null = null;
  let starting = false;
  let failed = false;
  let catalog: CatalogState = { kind: 'loading' };
  let overrides: SizeOverrides = NO_OVERRIDES;
  let applied: SizeOverrides = NO_OVERRIDES;
  let applying = false;
  let resetAllTimer: ReturnType<typeof setTimeout> | undefined;
  let confirmingResetAll = false;

  // --- home --------------------------------------------------------------------------------------------------------
  const home = el('section');
  home.dataset.soglia = 'intro-home';
  const title = el('h1', undefined, t.title);
  title.tabIndex = -1;
  const tagline = el('p', undefined, t.tagline);
  const card = el('div', 'soglia-intro-card');
  card.dataset.soglia = 'intro-selected-house';
  const cardLabel = el('p', 'soglia-intro-label', t.selectedLabel);
  const cardHouse = el('p', 'soglia-intro-house', t.loadingHouse);
  cardHouse.dataset.soglia = 'intro-selected-house-name';
  cardHouse.setAttribute('aria-live', 'polite');
  const cardDetails = el('p');
  card.append(cardLabel, cardHouse, cardDetails);
  const loadButton = bigButton('intro-load-house', t.loadHouse, t.loadHouseHint, false);
  const furnitureButton = bigButton('intro-furniture', t.furniture, t.furnitureHint, false);
  const enterButton = bigButton('intro-enter-vr', t.enterVr, null, true);
  const enterNote = el('p', 'soglia-intro-note');
  enterNote.setAttribute('aria-live', 'polite');
  enterNote.dataset.soglia = 'intro-enter-note';
  home.append(title, tagline, card, loadButton, furnitureButton, enterButton, enterNote);

  // --- houses ------------------------------------------------------------------------------------------------------
  const housesScreen = el('section');
  housesScreen.dataset.soglia = 'intro-houses';
  const housesTitle = el('h2', undefined, t.housesTitle);
  housesTitle.tabIndex = -1;
  const housesBack = el('button', 'soglia-intro-back', t.back);
  housesBack.type = 'button';
  housesBack.dataset.soglia = 'intro-houses-back';
  const housesBox = el('div');
  housesScreen.append(housesBack, housesTitle, el('p', undefined, t.housesIntro), housesBox);
  const houseSection: HouseFileSection = mountHouseFiles(housesBox, houseFiles, { currentId: houseId, mode: 'intro' });

  // --- furniture ---------------------------------------------------------------------------------------------------
  const furnitureScreen = el('section');
  furnitureScreen.dataset.soglia = 'intro-furniture-screen';
  const furnitureTitle = el('h2', undefined, t.sizes.title);
  furnitureTitle.tabIndex = -1;
  const furnitureBack = el('button', 'soglia-intro-back', t.back);
  furnitureBack.type = 'button';
  furnitureBack.dataset.soglia = 'intro-furniture-back';
  const furnitureIntro = el('p', undefined, t.sizes.intro);
  const furnitureMessage = el('p', 'soglia-intro-note');
  furnitureMessage.setAttribute('aria-live', 'polite');
  furnitureMessage.dataset.soglia = 'intro-furniture-message';
  const summary = el('p', 'soglia-intro-now');
  summary.dataset.soglia = 'intro-furniture-summary';
  const resetAllButton = el('button', undefined, t.sizes.resetAll);
  resetAllButton.type = 'button';
  resetAllButton.dataset.soglia = 'intro-furniture-reset-all';
  const list = el('ul', 'soglia-intro-sizes');
  list.setAttribute('aria-label', t.sizes.title);
  list.dataset.soglia = 'intro-furniture-list';
  const listStatus = el('p', undefined, t.sizes.loading);
  furnitureScreen.append(furnitureBack, furnitureTitle, furnitureIntro, furnitureMessage, summary, resetAllButton, listStatus, list);

  inner.append(home, housesScreen, furnitureScreen);
  document.body.append(root);

  const refs = new Map<string, RowRefs>();

  // --- rendering ---------------------------------------------------------------------------------------------------
  const pendingChange = (): boolean => !sameOverrides(overrides, applied);

  const renderHome = (): void => {
    cardHouse.textContent = house ? house.title : houseKnown ? t.noHouse : t.loadingHouse;
    cardDetails.textContent = house ? hf.details(house.areaM2, house.rooms.length) : houseKnown ? t.houseFailed : '';
    card.classList.toggle('soglia-intro-bad', houseKnown && house === null);
    const state = enterVrState({ support, worldReady: world !== null, houseOk: house !== null, starting, failed });
    enterButton.disabled = !state.enabled;
    enterButton.setAttribute('aria-disabled', String(!state.enabled));
    let note: keyof typeof t.enterNote = state.note;
    if (state.note === 'ready' && !sizeStore.persisted()) note = 'sizes-unsaved';
    enterNote.textContent = t.enterNote[note];
    enterNote.classList.toggle('soglia-intro-bad', !state.enabled && state.note !== 'loading' && state.note !== 'checking' && state.note !== 'starting');
  };

  const renderFurnitureSummary = (): void => {
    const count = overrideCount(overrides);
    summary.textContent = count === 0 ? t.sizes.noneChanged : t.sizes.changedCount(count);
    resetAllButton.disabled = count === 0;
    resetAllButton.textContent = confirmingResetAll ? t.sizes.resetAllConfirm : t.sizes.resetAll;
    if (applying) furnitureMessage.textContent = t.sizes.applying;
    else if (!sizeStore.persisted()) furnitureMessage.textContent = t.sizes.unsaved;
    else furnitureMessage.textContent = pendingChange() ? t.sizes.pending : '';
    furnitureMessage.classList.toggle('soglia-intro-bad', !sizeStore.persisted());
    furnitureBack.textContent = pendingChange() && sizeStore.persisted() ? t.backApply : t.back;
  };

  const refreshRow = (id: string): void => {
    const ref = refs.get(id);
    if (!ref || catalog.kind !== 'ready') return;
    const [row] = furnitureRows(catalog.items.filter((item) => item.id === id), overrides);
    ref.row = row;
    ref.now.textContent = t.sizes.now(formatSizeCm(row.sizeCm));
    ref.tag.hidden = !row.changed;
    ref.item.classList.toggle('soglia-intro-changed', row.changed);
    ref.reset.disabled = !row.changed;
    for (const axis of [0, 1, 2] as const) {
      ref.inputs[axis].value = String(row.sizeCm[axis]);
      ref.inputs[axis].removeAttribute('aria-invalid');
      ref.minus[axis].disabled = row.sizeCm[axis] <= row.limits[axis].min;
      ref.plus[axis].disabled = row.sizeCm[axis] >= row.limits[axis].max;
    }
  };

  const commit = (next: SizeOverrides): void => {
    overrides = next;
    const saved = sizeStore.write(next);
    if (!saved) slog('catalog sizes not saved: they cannot be applied');
    renderFurnitureSummary();
    renderHome();
  };

  const setSide = (id: string, axis: Axis, cm: number): void => {
    if (catalog.kind !== 'ready') return;
    const item = catalog.items.find((candidate) => candidate.id === id);
    if (!item) return;
    commit(withSide(overrides, item, axis, cm));
    slog(`catalog size set id=${id} axis=${AXES[axis]} cm=${overrides[id]?.[axis] ?? 'default'}`);
    refreshRow(id);
  };

  const buildRows = (): void => {
    list.replaceChildren();
    refs.clear();
    if (catalog.kind !== 'ready') return;
    for (const row of furnitureRows(catalog.items, overrides)) {
      const item = el('li');
      item.dataset.soglia = `size-item-${row.id}`;
      item.dataset.catalogId = row.id;
      const head = el('div', 'soglia-intro-item-head');
      const tag = el('span', 'soglia-intro-tag', t.sizes.changed);
      head.append(el('span', 'soglia-intro-item-name', row.name), tag);
      const now = el('p', 'soglia-intro-now');
      now.dataset.soglia = `size-now-${row.id}`;
      const def = el('p', 'soglia-intro-def', t.sizes.defaultSize(formatSizeCm(row.defaultCm)));
      item.append(head, now, def);
      const errs: HTMLElement[] = [];
      const inputs: HTMLInputElement[] = [];
      const minus: HTMLButtonElement[] = [];
      const plus: HTMLButtonElement[] = [];
      for (const axis of [0, 1, 2] as const) {
        const axisName = [t.sizes.width, t.sizes.depth, t.sizes.height][axis];
        const line = el('div', 'soglia-intro-axis');
        const err = el('p', 'soglia-intro-err');
        err.setAttribute('role', 'alert');
        const less = el('button', 'soglia-intro-step', '−');
        less.type = 'button';
        less.dataset.soglia = `size-${row.id}-${AXES[axis]}-minus`;
        less.setAttribute('aria-label', t.sizes.smaller(axisName, row.name));
        const more = el('button', 'soglia-intro-step', '+');
        more.type = 'button';
        more.dataset.soglia = `size-${row.id}-${AXES[axis]}-plus`;
        more.setAttribute('aria-label', t.sizes.larger(axisName, row.name));
        const input = el('input');
        input.type = 'text';
        input.inputMode = 'numeric';
        input.autocomplete = 'off';
        input.dataset.soglia = `size-${row.id}-${AXES[axis]}-input`;
        input.setAttribute('aria-label', t.sizes.field(axisName, row.name));
        const limits = row.limits[axis];
        const showError = (message: string): void => {
          err.textContent = message;
          input.setAttribute('aria-invalid', 'true');
        };
        less.addEventListener('click', () => {
          err.textContent = '';
          const now = currentCm(row.id, axis);
          setSide(row.id, axis, stepCm(now, -1, STEP_CM, limitsFor(row.id, axis)));
        });
        more.addEventListener('click', () => {
          err.textContent = '';
          const now = currentCm(row.id, axis);
          setSide(row.id, axis, stepCm(now, 1, STEP_CM, limitsFor(row.id, axis)));
        });
        input.addEventListener('change', () => {
          err.textContent = '';
          const typed = parseCmText(input.value);
          if (typed === null) {
            showError(t.sizes.notNumber);
            return;
          }
          const check = checkCm(typed, limitsFor(row.id, axis));
          if (!check.ok) {
            showError(check.reason === 'too-small' ? t.sizes.tooSmall(check.limits.min, check.limits.max) : t.sizes.tooLarge(check.limits.min, check.limits.max));
            return;
          }
          setSide(row.id, axis, check.value);
        });
        line.append(
          el('span', 'soglia-intro-axis-name', axisName),
          less,
          input,
          more,
          el('span', 'soglia-intro-unit', 'cm'),
          el('span', 'soglia-intro-range', t.sizes.range(limits.min, limits.max)),
        );
        item.append(line, err);
        errs.push(err);
        inputs.push(input);
        minus.push(less);
        plus.push(more);
      }
      const reset = el('button', 'soglia-intro-item-reset', t.sizes.resetItem);
      reset.type = 'button';
      reset.dataset.soglia = `size-${row.id}-reset`;
      reset.setAttribute('aria-label', `${t.sizes.resetItem}: ${row.name}`);
      reset.addEventListener('click', () => {
        for (const err of errs) err.textContent = '';
        commit(withoutItem(overrides, row.id));
        slog(`catalog size reset id=${row.id}`);
        refreshRow(row.id);
      });
      item.append(reset);
      list.append(item);
      refs.set(row.id, {
        row,
        item,
        tag,
        now,
        errs: errs as RowRefs['errs'],
        reset,
        inputs: inputs as RowRefs['inputs'],
        minus: minus as RowRefs['minus'],
        plus: plus as RowRefs['plus'],
      });
      refreshRow(row.id);
    }
  };

  const limitsFor = (id: string, axis: Axis): { min: number; max: number } => {
    const ref = refs.get(id);
    return ref ? ref.row.limits[axis] : limitsCm([100, 100, 100], axis);
  };
  const currentCm = (id: string, axis: Axis): number => {
    const ref = refs.get(id);
    return ref ? clampCm(ref.row.sizeCm[axis], ref.row.limits[axis]) : 0;
  };

  const renderCatalog = (): void => {
    listStatus.hidden = catalog.kind === 'ready';
    listStatus.textContent = catalog.kind === 'failed' ? t.sizes.failed : t.sizes.loading;
    furnitureButton.disabled = catalog.kind === 'failed';
    summary.hidden = catalog.kind !== 'ready';
    resetAllButton.hidden = catalog.kind !== 'ready';
    buildRows();
    renderFurnitureSummary();
  };

  const show = (next: Screen): void => {
    home.hidden = next !== 'home';
    housesScreen.hidden = next !== 'houses';
    furnitureScreen.hidden = next !== 'furniture';
    root.scrollTop = 0;
    const heading = next === 'home' ? title : next === 'houses' ? housesTitle : furnitureTitle;
    heading.focus({ preventScroll: true });
    slog(`intro screen=${next}`);
  };

  // --- actions -----------------------------------------------------------------------------------------------------
  loadButton.addEventListener('click', () => show('houses'));
  furnitureButton.addEventListener('click', () => show('furniture'));
  housesBack.addEventListener('click', () => show('home'));
  furnitureBack.addEventListener('click', () => {
    if (pendingChange() && sizeStore.persisted()) {
      // The catalog is read when the page loads: open the page again so that every system starts with the new sizes.
      applying = true;
      renderFurnitureSummary();
      slog(`catalog sizes applying items=${overrideCount(overrides)}`);
      reopen(houseId);
      return;
    }
    show('home');
  });
  resetAllButton.addEventListener('click', () => {
    if (!confirmingResetAll) {
      confirmingResetAll = true;
      if (resetAllTimer !== undefined) clearTimeout(resetAllTimer);
      resetAllTimer = setTimeout(() => {
        confirmingResetAll = false;
        renderFurnitureSummary();
      }, 4000);
      renderFurnitureSummary();
      return;
    }
    confirmingResetAll = false;
    if (resetAllTimer !== undefined) clearTimeout(resetAllTimer);
    commit(NO_OVERRIDES);
    slog('catalog sizes reset all');
    for (const id of refs.keys()) {
      const ref = refs.get(id);
      if (ref) for (const err of ref.errs) err.textContent = '';
      refreshRow(id);
    }
  });
  enterButton.addEventListener('click', () => {
    if (!world || enterButton.disabled) return;
    starting = true;
    failed = false;
    renderHome();
    slog('enter vr requested');
    requestImmersive(world, (started) => {
      starting = false;
      failed = !started;
      renderHome();
    });
  });

  // --- the preferences of the user: high contrast and large text (the same ones as the panels in the headset) --------------
  const applyPrefs = (): void => {
    const { contrast, largeText } = store.get().prefs;
    root.classList.toggle('soglia-intro-contrast', contrast);
    root.classList.toggle('soglia-intro-large', largeText);
  };
  applyPrefs();
  const unsubscribePrefs = store.subscribe(applyPrefs);

  // --- the session: the screen is hidden while it runs and is back when it ends ------------------------------------------
  const cleanups: Array<() => void> = [unsubscribePrefs];

  renderHome();
  renderCatalog();
  show('home');

  return {
    setHouse(next) {
      house = next;
      houseKnown = true;
      houseSection.setCurrent(next);
      renderHome();
    },
    setCatalog(state) {
      catalog = state;
      if (state.kind === 'ready') {
        applied = state.applied;
        overrides = state.applied;
      }
      renderCatalog();
      renderHome();
    },
    setMode(mode) {
      void probeImmersiveSupport(mode).then((result) => {
        support = result;
        renderHome();
      });
    },
    setWorld(next) {
      world = next;
      const xr = next.renderer.xr;
      const onStart = (): void => {
        root.hidden = true;
        starting = false;
        slog('intro hidden reason=session-started');
      };
      const onEnd = (): void => {
        root.hidden = false;
        starting = false;
        failed = false;
        renderHome();
        show('home');
        slog('intro shown reason=session-ended');
        enterButton.focus({ preventScroll: true });
      };
      xr.addEventListener('sessionstart', onStart);
      xr.addEventListener('sessionend', onEnd);
      cleanups.push(
        () => xr.removeEventListener('sessionstart', onStart),
        () => xr.removeEventListener('sessionend', onEnd),
      );
      if (xr.isPresenting) root.hidden = true;
      renderHome();
    },
    dispose() {
      for (const undo of cleanups) undo();
      if (resetAllTimer !== undefined) clearTimeout(resetAllTimer);
      houseSection.dispose();
      root.remove();
      style.remove();
    },
  };
}
