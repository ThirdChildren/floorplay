// Room selection and its label (T1.10). A pinch on a room floor (`room:<id>`, `Pressed` through its
// `RayInteractable`) dispatches `selectRoom` on the application store; a store listener then logs
// and shows or hides the `ui:room-label` panel. The press is ignored while a two-hand gesture runs
// or both hands pinch (a two-hand gesture must not select a room), and while a menu item, a piece or
// a one-hand drag owns a pinch (see the arbitration in src/logic/pinch-claims.ts). A pinch in the air of the hand that
// holds the PALM menu open is never a room selection either (F-A, T3.3b): the guard only ignores the room, it does not
// claim the hand, so that hand can still tap to rotate a held piece. With the pinned menu no hand is "the menu hand".
// `roomSelectionAllowed` (src/logic/menu-button.ts) decides. The text is `strings.roomLabel`;
// the area comes from the room polygon (`polygonArea`), because rooms have no area field in the data.

import {
  createSystem,
  Pressed,
  RayInteractable,
  type Entity,
  type Object3D,
  type World,
} from '@iwsdk/core';
import { StableId } from '../components/stable-id';
import { slog } from '../log';
import { formatArea, polygonArea } from '../logic/geometry';
import type { House } from '../logic/house';
import { stableId } from '../logic/ids';
import { menuHandPinching, roomSelectionAllowed } from '../logic/menu-button';
import { selectRoom, type Store } from '../logic/state';
import { panelFontSupports } from '../ui/fonts';
import { RoomLabelPanel } from '../ui/room-label-panel';
import { strings } from '../ui/strings';
import { isMiniatureGestureActive } from './miniature-gesture';
import { getMenuMode, getPalmMenuHand } from './palm-menu';
import { isFurnitureInteractionActive, isPanActive, isPinchStarted, pinchClaims } from './pinch-input';
import { isModelHidden, isRealScale, isRoomView, isTabletopLocked } from './view-mode';

const ROOM_PREFIX = 'room:';
/** The room label stays on the model this long, then goes away by itself (owner's request, 2026-11-16); a new pinch shows it again. */
export const ROOM_LABEL_SECONDS = 4;

interface RoomLabelContext {
  store: Store;
  house: House;
  panel: RoomLabelPanel;
}

// Shared with the system, which has no constructor arguments: set by `createRoomLabel`.
let context: RoomLabelContext | null = null;

/** Writes the centre of the room label into `out` and returns true while the label is on screen (the hint avoids it). */
export function getRoomLabelPosition(out: { x: number; y: number; z: number }): boolean {
  return context?.panel.getPosition(out) ?? false;
}

/** Wires the room selection to `store` for `house` and registers the system. */
export function createRoomLabel(world: World, store: Store, house: House): void {
  context = { store, house, panel: new RoomLabelPanel(world) };
  world.registerSystem(RoomLabelSystem);
}

export class RoomLabelSystem extends createSystem({
  pressed: { required: [StableId, RayInteractable, Pressed] },
  rooms: { required: [StableId, RayInteractable] },
}) {
  private shownRoomId: string | null = null;
  private readonly pinches = { left: false, right: false };
  /** True while the label is on screen; `labelAge` counts the seconds since it was shown. */
  private labelOn = false;
  private labelAge = 0;

  init(): void {
    const ctx = context;
    if (!ctx) return;
    const { store, house } = ctx;
    this.shownRoomId = store.get().selectedRoomId;

    this.cleanupFuncs.push(
      this.queries.pressed.subscribe('qualify', (entity) => {
        const name = entity.object3D?.name ?? '';
        if (!name.startsWith(ROOM_PREFIX)) return;
        // The room has the lowest priority among the pinch owners (menu > furniture > viewpoint > two-hands > pan > room).
        this.pinches.left = isPinchStarted('left');
        this.pinches.right = isPinchStarted('right');
        const allowed = roomSelectionAllowed({
          gestureActive: isMiniatureGestureActive(),
          furnitureInteraction: isFurnitureInteractionActive(),
          panActive: isPanActive(),
          menuHandPinching: menuHandPinching(getMenuMode(), getPalmMenuHand(), this.pinches),
          // No room selection at real scale, while the view changes, or for the pinch that picked a viewpoint marker.
          viewpointActive: isTabletopLocked() || pinchClaims.anyClaimed('viewpoint'),
        });
        if (!allowed) return;
        const roomId = name.slice(ROOM_PREFIX.length);
        if (!house.rooms.some((room) => room.id === roomId)) return;
        // The same room again after its label went away: the store does not change, so show the label from here.
        if (roomId === store.get().selectedRoomId) {
          if (!this.labelOn) this.showLabel(roomId);
          return;
        }
        store.dispatch(selectRoom(roomId));
      }),
    );

    this.cleanupFuncs.push(
      store.subscribe((state) => {
        const previous = this.shownRoomId;
        const current = state.selectedRoomId;
        if (current === previous) return;
        this.shownRoomId = current;
        if (current === null) {
          this.hideLabel();
          if (previous !== null) slog(`room deselected ${previous}`);
          return;
        }
        this.showLabel(current);
      }),
    );
  }

  update(delta: number): void {
    const ctx = context;
    if (!ctx) return;
    if (this.labelOn) {
      this.labelAge += delta;
      // Gone after a few seconds, and at once in the room view of mixed reality or at real scale (the model is not there).
      if (this.labelAge >= ROOM_LABEL_SECONDS) this.hideLabel('timeout');
      else if (isRoomView() || isModelHidden() || isRealScale()) this.hideLabel('view');
    }
    // In session the XR camera only gets the viewer pose after the systems run, so use the head group.
    const head = this.world.renderer.xr.isPresenting ? this.world.player.head : this.world.camera;
    ctx.panel.update(head);
  }

  /** Shows the label of `roomId` above its floor and starts its clock. */
  private showLabel(roomId: string): void {
    const ctx = context;
    if (!ctx) return;
    const room = ctx.house.rooms.find((r) => r.id === roomId);
    const floor = room ? this.findRoomObject(roomId) : null;
    if (!room || !floor) return;
    const area = polygonArea(room.polygon);
    slog(`room selected ${room.id} area=${formatArea(area)}`);
    const unicode = strings.roomLabel(room.name, area);
    // Fallback only if the local panel font did not load (the bundled font has no `·` or `²`).
    const text = panelFontSupports(unicode) ? unicode : strings.roomLabel(room.name, area, true);
    ctx.panel.show(text, floor);
    this.labelOn = true;
    this.labelAge = 0;
    slog(`label shown "${text}"`);
  }

  private hideLabel(reason?: 'timeout' | 'view'): void {
    context?.panel.hide();
    if (this.labelOn && reason) slog(`label hidden reason=${reason}`);
    this.labelOn = false;
  }

  private findRoomObject(roomId: string): Object3D | null {
    const wanted = stableId.room(roomId);
    for (const entity of this.queries.rooms.entities as Iterable<Entity>) {
      if (entity.object3D?.name === wanted) return entity.object3D;
    }
    return null;
  }
}
