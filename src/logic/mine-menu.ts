// What the Mine tab of the palm menu lists, as cards (the pieces the user added from the room scan, and the ones removed from Mine).
// Pure: no imports from @iwsdk/core or three.
//
// Two views of the one tab. `pick` (the default) lists the pieces in Mine, each a card that is picked up like a catalog item, then a last card
// `Manage`. `manage` lists the pieces in Mine (a press asks, a second press on the same card removes it), then the Removed ones (one press puts
// a piece back in Mine), then a last card `Done` that goes back to `pick`. A piece removed from Mine keeps its catalog entry, so a copy of it
// already placed in the house stays there.

export type MineView = 'pick' | 'manage';

/** What a pinch on a card of the Mine tab does. */
export type MineEntryKind = 'pick' | 'manage' | 'remove' | 'restore' | 'done';

export interface MineEntry<T extends { readonly id: string }> {
  readonly kind: MineEntryKind;
  /** The piece (a card of a piece); absent for the two cards that only switch the view. */
  readonly item?: T;
}

/** True when the tab has something to show: pieces in Mine or pieces that can be restored. */
export function mineTabHasContent(mineCount: number, removedCount: number): boolean {
  return mineCount > 0 || removedCount > 0;
}

/** The cards of the Mine tab for `view`, in order. Empty when there is nothing at all (the tab is not shown then). */
export function mineEntries<T extends { readonly id: string }>(view: MineView, mine: readonly T[], removed: readonly T[]): MineEntry<T>[] {
  if (!mineTabHasContent(mine.length, removed.length)) return [];
  if (view === 'pick') {
    return [...mine.map((item): MineEntry<T> => ({ kind: 'pick', item })), { kind: 'manage' }];
  }
  return [
    ...mine.map((item): MineEntry<T> => ({ kind: 'remove', item })),
    ...removed.map((item): MineEntry<T> => ({ kind: 'restore', item })),
    { kind: 'done' },
  ];
}

/** The id an entry has in the `menu page` log line and in its anchor: the piece id, or the name of the switch card. */
export function mineEntryId(entry: MineEntry<{ readonly id: string }>): string {
  return entry.item ? entry.item.id : entry.kind;
}

/** The result of a press on a `remove` card: the first press arms it, the second press (same piece, nothing else pressed between) removes. */
export type RemovePress = { readonly armed: string | null; readonly remove: boolean };

/** `armed` is the id armed by the previous press, or null. Pressing another card, or a card of another kind, disarms (`armed: null`). */
export function pressRemove(armed: string | null, id: string): RemovePress {
  return armed === id ? { armed: null, remove: true } : { armed: id, remove: false };
}

/** The view after something changed the data: `manage` with nothing left to manage (no piece at all) goes back to `pick`. */
export function settleMineView(view: MineView, mineCount: number, removedCount: number): MineView {
  return mineTabHasContent(mineCount, removedCount) ? view : 'pick';
}
