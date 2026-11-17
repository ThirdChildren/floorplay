// Pointing at a spot to report an issue (the tenant): the index finger out, the other fingers curled, held on one spot of the house for
// one second opens the same new-issue form as the long pinch, at that spot. Hands only: no controller, no pinch.
//
// HOW IT WORKS. The pose is told by the joints (src/logic/point-gesture.ts: fingertip distances from the wrist, like the row gesture's fist,
// so it is not a pinch, a fist or an open hand). The ray is the line of the index finger (knuckle to tip, filtered). It is cast analytically
// against the floor, the walls and the placed furniture in HOUSE coordinates (src/logic/point-target.ts), on the table-top model and at
// real scale alike (the root pose is read every frame). The hit is the spot; its anchor is worked out ONCE when the dwell starts (the
// fixture it snaps to, the room) and the ghost pin grows from there while the finger rests (src/logic/point-dwell.ts). At one second,
// `startIssueAt` opens the form (src/systems/issue-create.ts), the same path as the long pinch.
//
// WHEN IT STAYS OFF. A pinch of either hand, a claim on a hand (menu, a held piece, the drag, the zoom), the row gesture, a panel open
// (menu, View, Issues, the card of a scanned object), a form already open, a change of view fading, the room view of the mixed reality
// mode, a role that cannot create issues (only the tenant can). Without hand joints (controllers only, no `XRFrame.fillPoses`) the feature
// is simply off (`[soglia] feature hand joints unavailable`): the long pinch still works.
//
// A small hint ("Point at a spot for 1 second to report an issue") shows a few times, to the tenant, a few seconds into a session.
// Nothing here allocates per frame while the hand is not over the model.

import { createSystem, Quaternion, Vector3, type World } from '@iwsdk/core';
import { slog, swarn } from '../log';
import type { CatalogItem } from '../logic/catalog';
import { normalizeRotation } from '../logic/catalog';
import { rectFromWall, type Rect } from '../logic/footprint';
import type { MiniatureRoot, Vec3Tuple } from '../logic/furniture-pose';
import { FLOATS_PER_JOINT, jointPositionFromMatrix } from '../logic/hand-joints';
import type { House } from '../logic/house';
import { planCenter } from '../logic/house-layout';
import { CUT_HEIGHT } from '../logic/constants';
import { placeInRoom, resolveAnchor, ROOM_MARGIN, type IssueAnchor } from '../logic/issue-anchor';
import { can } from '../logic/permissions';
import {
  createPointHandSample,
  createPointState,
  resetPointState,
  updatePoint,
  type PointHandSample,
  type PointState,
} from '../logic/point-gesture';
import {
  cancelPointDwell,
  createPointDwell,
  dwellProgress,
  dwellTolerance,
  resetPointDwell,
  stepPointDwell,
  type DwellEvent,
} from '../logic/point-dwell';
import { castPointRay, createHouseRay, createPointHit, worldRayToHouse, type PointScene } from '../logic/point-target';
import type { Store } from '../logic/state';
import { RoomNoticePanel } from '../ui/room-notice-panel';
import { strings } from '../ui/strings';
import { getDraft, startIssueAt } from './issue-create';
import { isIssuePanelOpen } from './issue-panel';
import { getPalmMenuPanel } from './palm-menu';
import { isPinchStarted, isPinching, pinchClaims } from './pinch-input';
import { setPinDraft, setPinDraftSize } from './pins';
import { isScanCardOpen } from './room-objects';
import { isViewPanelOpen } from './view-panel';
import { isRealScale, isRoomView, isViewTransitioning } from './view-mode';
import { isRowActive } from './walk';

type Hand = 'left' | 'right';
const HANDS: readonly Hand[] = ['right', 'left'];

/** The joints this reader asks for: the wrist, the knuckle and the tip of the index, and the tips of the other three fingers. */
const POINT_JOINT_NAMES = [
  'wrist',
  'index-finger-phalanx-proximal',
  'index-finger-tip',
  'middle-finger-tip',
  'ring-finger-tip',
  'pinky-finger-tip',
] as const;
const BUFFER_LENGTH = POINT_JOINT_NAMES.length * FLOATS_PER_JOINT;

type FillPoses = (spaces: ArrayLike<XRSpace>, baseSpace: XRSpace, transforms: Float32Array) => boolean;
interface FrameWithFillPoses {
  readonly fillPoses?: FillPoses;
}

interface HandReader {
  bound: XRInputSource | null;
  complete: boolean;
  readonly spaces: XRSpace[];
  readonly joints: Float32Array;
}

const createReader = (): HandReader => ({
  bound: null,
  complete: false,
  spaces: new Array<XRSpace>(POINT_JOINT_NAMES.length),
  joints: new Float32Array(BUFFER_LENGTH),
});

/** The ghost pin starts this big (of 1) as soon as the dwell starts, so there is something to see at once. */
const GHOST_MIN_SIZE = 0.25;
/** The hint shows this many times in all (per browser), once per session, for at most this long (seconds). */
const HINT_TIMES = 3;
const HINT_SECONDS = 8;
/** The hint waits this long after the tenant is in a session (seconds), so it does not meet the first minute of onboarding. */
const HINT_DELAY_SECONDS = 6;
const HINT_STORAGE_KEY = 'soglia:v1:point-hint';
/**
 * The hint sits this far ahead of the head and a little ABOVE the eyes (inside the central cone, rule 8): the menu hint ("Palm up for
 * the menu") is lower, above the model, and the two must not cover each other.
 */
const HINT_AHEAD = 0.65;
const HINT_BELOW = -0.03;
/** A pointing anchor snaps to a fixture with the radius of the table-top model (0.4 m of the house), at any scale. */
const SNAP_SCALE = 0.05;

interface PointContext {
  world: World;
  store: Store;
  house: House;
  /** The catalog the systems share (read at use time: the list may grow). */
  catalog: readonly CatalogItem[];
  rootObject: { position: Vector3; rotation: { y: number }; scale: Vector3 } | null;
  scene: PointScene;
  center: [number, number];
  hint: RoomNoticePanel;
}

let context: PointContext | null = null;
let debugHands = false;
const samples: Record<Hand, PointHandSample> = { left: createPointHandSample(), right: createPointHandSample() };
const states: Record<Hand, PointState> = { left: createPointState(), right: createPointState() };
const readers: Record<Hand, HandReader> = { left: createReader(), right: createReader() };
const dwell = createPointDwell();
let warnedFill = false;

/** Registers the pointing gesture. Register it AFTER `createIssueCreate` and the pins (it opens the form and shows the ghost pin). */
export function createPointIssue(
  world: World,
  store: Store,
  house: House,
  rootObject: PointContext['rootObject'],
  catalog: readonly CatalogItem[],
): void {
  context = {
    world,
    store,
    house,
    catalog,
    rootObject,
    scene: { walls: house.walls.map((wall) => rectFromWall(wall)), wallHeight: CUT_HEIGHT },
    center: planCenter(house),
    hint: new RoomNoticePanel(world, 'ui:point-hint'),
  };
  world.registerSystem(PointIssueSystem);
}

/** Debug hook (`?debug=1`): synthetic hand poses instead of the joints (null, null = back to the joints). */
export function debugPointHands(left: PointHandSample | null, right: PointHandSample | null): void {
  debugHands = left !== null && right !== null;
  if (left && right) {
    copySample(left, samples.left);
    copySample(right, samples.right);
  }
}

function copySample(from: PointHandSample, to: PointHandSample): void {
  to.tracked = from.tracked;
  to.pinching = from.pinching;
  for (const key of ['wrist', 'indexKnuckle', 'indexTip', 'middleTip', 'ringTip', 'pinkyTip'] as const) {
    to[key].x = from[key].x;
    to[key].y = from[key].y;
    to[key].z = from[key].z;
  }
}

/** Current state for the QA and the debug hook. */
export function pointStatus(): {
  phase: string;
  progress: number;
  left: string;
  right: string;
  hasHit: boolean;
  hit: { x: number; y: number; z: number; surface: string };
  /** The fingertip and the filtered direction of the right hand (world), for the QA. */
  ray: { ox: number; oy: number; oz: number; dx: number; dy: number; dz: number };
} {
  const s = states.right.qualified || !states.left.qualified ? states.right : states.left;
  return {
    ray: { ox: round3(s.ox), oy: round3(s.oy), oz: round3(s.oz), dx: round3(s.dx), dy: round3(s.dy), dz: round3(s.dz) },
    phase: dwell.phase,
    progress: Math.round(dwellProgress(dwell) * 1000) / 1000,
    left: states.left.reason,
    right: states.right.reason,
    hasHit: lastHitValid,
    hit: { x: round3(lastHit.x), y: round3(lastHit.y), z: round3(lastHit.z), surface: lastHit.surface },
  };
}

const round3 = (v: number): number => Math.round(v * 1000) / 1000;

// --- Reading the hands ---------------------------------------------------------------------------------------------------------------

function findInputSource(sources: XRInputSourceArray, hand: Hand): XRInputSource | null {
  for (let i = 0; i < sources.length; i += 1) {
    const source = sources[i];
    if (source.handedness === hand && source.hand) return source;
  }
  return null;
}

function bind(reader: HandReader, source: XRInputSource): boolean {
  reader.bound = source;
  reader.complete = false;
  const hand = source.hand;
  if (!hand || typeof hand.get !== 'function') return false;
  for (let i = 0; i < POINT_JOINT_NAMES.length; i += 1) {
    const space = hand.get(POINT_JOINT_NAMES[i] as XRHandJoint);
    if (!space) {
      swarn(`feature hand joint ${POINT_JOINT_NAMES[i]} unavailable`);
      return false;
    }
    reader.spaces[i] = space;
  }
  reader.complete = true;
  return true;
}

/** Fills `sample` from the joints of `source`. Returns false (sample marked untracked) when there is nothing usable. */
function readHand(hand: Hand, source: XRInputSource | null, frame: XRFrame | null, space: XRReferenceSpace | null, sample: PointHandSample): boolean {
  sample.tracked = false;
  if (!source || !frame || !space) return false;
  const reader = readers[hand];
  const fill = (frame as unknown as FrameWithFillPoses).fillPoses;
  if (typeof fill !== 'function') {
    if (!warnedFill) {
      warnedFill = true;
      swarn('feature XRFrame.fillPoses unavailable; pointing at a spot needs hand joints');
    }
    return false;
  }
  if (reader.bound !== source) bind(reader, source);
  if (!reader.complete) return false;
  try {
    if (fill.call(frame, reader.spaces, space, reader.joints) !== true) return false;
  } catch {
    return false;
  }
  const m = reader.joints;
  if (
    !jointPositionFromMatrix(m, 0, sample.wrist) ||
    !jointPositionFromMatrix(m, 1, sample.indexKnuckle) ||
    !jointPositionFromMatrix(m, 2, sample.indexTip) ||
    !jointPositionFromMatrix(m, 3, sample.middleTip) ||
    !jointPositionFromMatrix(m, 4, sample.ringTip) ||
    !jointPositionFromMatrix(m, 5, sample.pinkyTip)
  ) {
    return false;
  }
  sample.tracked = true;
  return true;
}

// --- The hint ------------------------------------------------------------------------------------------------------------------------

function hintCount(): number {
  try {
    const n = Number(window.localStorage.getItem(HINT_STORAGE_KEY));
    return Number.isFinite(n) && n > 0 ? n : 0;
  } catch {
    return 0;
  }
}

function bumpHintCount(): void {
  try {
    window.localStorage.setItem(HINT_STORAGE_KEY, String(hintCount() + 1));
  } catch {
    // Browser storage can be blocked: the hint then shows once per session, which is harmless.
  }
}

// --- The system ----------------------------------------------------------------------------------------------------------------------

const lastHit = createPointHit();
let lastHitValid = false;

export class PointIssueSystem extends createSystem({}) {
  private readonly ray = createHouseRay();
  private readonly hit = createPointHit();
  private readonly originTuple: Vec3Tuple = [0, 0, 0];
  private readonly directionTuple: Vec3Tuple = [0, 0, -1];
  private readonly hitTuple: Vec3Tuple = [0, 0, 0];
  private readonly rootPose: MiniatureRoot = { x: 0, y: 0, z: 0, yawRad: 0, scale: 1 };
  private readonly pieceScratch = { rect: { cx: 0, cz: 0, w: 1, d: 1, angleRad: 0 } as Rect, height: 0 };
  private readonly headPosition = new Vector3();
  private readonly headQuaternion = new Quaternion();
  private readonly headForward = new Vector3();
  private readonly pieceOf = (index: number, into: { rect: Rect; height: number }): boolean => this.pieceBox(index, into);

  private hand: Hand | null = null;
  private anchor: IssueAnchor | null = null;
  private ghostShown = false;
  private warnedNoHands = false;
  private seenHands = false;
  private sessionSeconds = 0;
  private hintStarted = -1;
  private hintDone = false;
  private wasPresenting = false;

  init(): void {
    this.cleanupFuncs.push(() => {
      this.clearGhost();
      context?.hint.dispose();
    });
  }

  update(delta: number): void {
    const ctx = context;
    if (!ctx) return;
    const world = this.world;
    const presenting = world.renderer.xr.isPresenting;
    if (!presenting) {
      if (this.wasPresenting) this.endSession();
      this.wasPresenting = false;
      return;
    }
    this.wasPresenting = true;
    const dt = Number.isFinite(delta) && delta > 0 ? Math.min(delta, 0.1) : 0;
    if (dt === 0) return;
    ctx.hint.prepare();
    this.sessionSeconds += dt;

    // The hands: real joints, or the synthetic poses of the debug hook.
    if (!debugHands) {
      const session = world.renderer.xr.getSession();
      const frame = world.xrFrame;
      const space = world.xrReferenceSpace;
      for (const hand of HANDS) {
        const source = session ? findInputSource(session.inputSources, hand) : null;
        readHand(hand, source, frame, space, samples[hand]);
        samples[hand].pinching = isPinchStarted(hand);
      }
    }
    if (samples.left.tracked || samples.right.tracked) this.seenHands = true;
    else if (!this.warnedNoHands && this.sessionSeconds > 3 && !this.seenHands) {
      this.warnedNoHands = true;
      swarn('feature hand joints unavailable: pointing at a spot needs hand tracking');
    }

    // Both hands keep their state every frame (the lockout after a pinch must run even while the gesture is shut out).
    const ready = { left: false, right: false };
    for (const hand of HANDS) ready[hand] = updatePoint(states[hand], samples[hand], dt);

    const role = ctx.store.get().role;
    const reason = this.shutOut(role);
    // The hand that points: the one that already does, else the right, else the left.
    let chosen: Hand | null = null;
    if (reason === null) {
      if (this.hand !== null && ready[this.hand] && dwell.phase !== 'idle') chosen = this.hand;
      else chosen = ready.right ? 'right' : ready.left ? 'left' : null;
    }

    this.updateHint(ctx, role, reason === null && (states.left.qualified || states.right.qualified), dt);

    if (reason !== null) {
      this.shutDown(reason);
      return;
    }

    let hasHit = false;
    let tolerance = 0.1;
    if (chosen !== null) {
      hasHit = this.castFrom(ctx, chosen);
      tolerance = dwellTolerance(this.rootPose.scale);
    }
    lastHitValid = hasHit;
    const event = stepPointDwell(
      dwell,
      { ready: chosen !== null, hit: hasHit, x: this.hit.x, y: this.hit.y, z: this.hit.z, tolerance },
      dt,
    );
    this.handle(ctx, event, chosen);
    if (dwell.phase === 'dwelling' && this.ghostShown) setPinDraftSize(Math.max(GHOST_MIN_SIZE, dwellProgress(dwell)));
    if (dwell.phase === 'idle' && this.ghostShown) this.clearGhost();
  }

  /** Why the gesture is shut out right now (a short word for the log), or null when it may run. */
  private shutOut(role: ReturnType<Store['get']>['role']): string | null {
    if (!can(role, 'create')) return 'role';
    if (getDraft() !== null || isIssuePanelOpen()) return 'form-open';
    if (isPinchStarted('left') || isPinchStarted('right') || isPinching('left') || isPinching('right')) return 'pinch';
    if (pinchClaims.anyClaimed()) return 'claimed';
    if (isRowActive()) return 'rowing';
    if (isViewTransitioning()) return 'view-change';
    if (isRoomView()) return 'room-view';
    if (getPalmMenuPanel() !== null || isViewPanelOpen() || isScanCardOpen()) return 'panel-open';
    return null;
  }

  /** The box of the i-th placed piece for `castPointRay`: its footprint and its height. False when the piece is unknown. */
  private pieceBox(index: number, into: { rect: Rect; height: number }): boolean {
    const ctx = context;
    if (!ctx) return false;
    const piece = ctx.store.get().furniture[index];
    if (!piece) return false;
    const catalog = ctx.catalog;
    let item: CatalogItem | undefined;
    for (let i = 0; i < catalog.length; i += 1) {
      if (catalog[i].id === piece.catalogId) {
        item = catalog[i];
        break;
      }
    }
    if (!item) return false;
    const swap = normalizeRotation(piece.rotationDeg) % 180 !== 0;
    into.rect.cx = piece.x;
    into.rect.cz = piece.z;
    into.rect.w = swap ? item.size[1] : item.size[0];
    into.rect.d = swap ? item.size[0] : item.size[1];
    into.rect.angleRad = 0;
    into.height = item.size[2];
    return true;
  }

  /** Casts the ray of the finger of `hand` against the house. True when it meets a surface inside the house (`this.hit` is the spot). */
  private castFrom(ctx: PointContext, hand: Hand): boolean {
    const object = ctx.rootObject;
    if (!object) return false;
    const state = states[hand];
    const r = this.rootPose;
    r.x = object.position.x;
    r.y = object.position.y;
    r.z = object.position.z;
    r.yawRad = object.rotation.y;
    r.scale = object.scale.x;
    this.originTuple[0] = state.ox;
    this.originTuple[1] = state.oy;
    this.originTuple[2] = state.oz;
    this.directionTuple[0] = state.dx;
    this.directionTuple[1] = state.dy;
    this.directionTuple[2] = state.dz;
    if (!worldRayToHouse(this.originTuple, this.directionTuple, r, ctx.center, this.ray)) return false;
    // The walls are cut on the table-top model and whole at real scale: the ray meets what is drawn.
    ctx.scene.wallHeight = isRealScale() ? ctx.house.ceilingHeight : CUT_HEIGHT;
    const count = ctx.store.get().furniture.length;
    if (!castPointRay(this.ray, ctx.scene, count, this.pieceOf, this.pieceScratch, this.hit)) return false;
    lastHit.x = this.hit.x;
    lastHit.y = this.hit.y;
    lastHit.z = this.hit.z;
    lastHit.surface = this.hit.surface;
    this.hitTuple[0] = this.hit.x;
    this.hitTuple[1] = this.hit.y;
    this.hitTuple[2] = this.hit.z;
    return placeInRoom(this.hitTuple, ctx.house.rooms, ROOM_MARGIN) !== null;
  }

  private handle(ctx: PointContext, event: DwellEvent, chosen: Hand | null): void {
    switch (event) {
      case 'start':
      case 'drift': {
        this.hand = chosen;
        this.hitTuple[0] = dwell.ax;
        this.hitTuple[1] = dwell.ay;
        this.hitTuple[2] = dwell.az;
        this.anchor = resolveAnchor(this.hitTuple, ctx.house, SNAP_SCALE);
        if (this.anchor === null) {
          resetPointDwell(dwell);
          this.clearGhost();
          return;
        }
        if (this.hintStarted >= 0) this.endHint('pointing');
        setPinDraft(this.anchor.position, GHOST_MIN_SIZE);
        this.ghostShown = true;
        slog(
          `point ${event === 'start' ? 'start' : 'moved'} hand=${chosen} surface=${this.hit.surface} room=${this.anchor.room.id}` +
            `${this.anchor.fixture ? ` fixture=${this.anchor.fixture.id}` : ''} at=${this.anchor.position.map(round3).join(',')}`,
        );
        break;
      }
      case 'lost':
      case 'cancel':
        slog(`point cancelled reason=${event === 'lost' ? 'off-target' : 'pose'}`);
        this.clearGhost();
        break;
      case 'fire': {
        const anchor = this.anchor;
        const hand = this.hand;
        this.anchor = null;
        if (!anchor || !hand) {
          this.clearGhost();
          break;
        }
        slog(`point fired hand=${hand} seconds=1.0`);
        // The draft takes over the ghost (full size, kept until the form reports or cancels).
        if (!startIssueAt(hand, anchor)) {
          slog('point ignored reason=form-refused');
          this.clearGhost();
        } else {
          this.ghostShown = false;
        }
        break;
      }
      default:
        break;
    }
  }

  /** The gesture is shut out: a running dwell stops (and says why once). */
  private shutDown(reason: string): void {
    if (cancelPointDwell(dwell) === 'cancel') slog(`point cancelled reason=${reason}`);
    if (dwell.phase !== 'dwelling' && this.ghostShown) this.clearGhost();
    lastHitValid = false;
    this.anchor = null;
  }

  private clearGhost(): void {
    if (!this.ghostShown) return;
    this.ghostShown = false;
    if (getDraft() === null) setPinDraft(null);
  }

  private endSession(): void {
    resetPointDwell(dwell);
    resetPointState(states.left);
    resetPointState(states.right);
    this.clearGhost();
    this.anchor = null;
    this.hand = null;
    this.sessionSeconds = 0;
    this.hintStarted = -1;
    this.hintDone = false;
    this.seenHands = false;
    this.warnedNoHands = false;
    context?.hint.show(false);
  }

  // --- The hint ---

  private updateHint(ctx: PointContext, role: ReturnType<Store['get']>['role'], posing: boolean, dt: number): void {
    void dt;
    if (this.hintStarted < 0) {
      if (this.hintDone || !can(role, 'create') || !this.seenHands || this.sessionSeconds < HINT_DELAY_SECONDS) return;
      // Not during the first-use onboarding (its ghost hand and prompts own the middle of the view).
      if (ctx.store.get().prefs.onboardingStep !== 'done') return;
      if (hintCount() >= HINT_TIMES) {
        this.hintDone = true;
        return;
      }
      if (getDraft() !== null || isIssuePanelOpen() || getPalmMenuPanel() !== null || isViewPanelOpen() || isRoomView()) return;
      if (posing || dwell.phase !== 'idle') {
        // Already pointing: nobody needs the hint, and it does not count as shown.
        this.hintDone = true;
        return;
      }
      bumpHintCount();
      this.hintStarted = this.sessionSeconds;
      ctx.hint.setText(strings.point.hint);
      this.placeHint(ctx);
      slog('point hint shown');
      return;
    }
    const over = this.sessionSeconds - this.hintStarted >= HINT_SECONDS;
    const busy = getDraft() !== null || isIssuePanelOpen() || getPalmMenuPanel() !== null || isViewPanelOpen() || !can(role, 'create');
    if (posing) this.endHint('pointing');
    else if (over || busy) this.endHint(over ? 'timeout' : 'busy');
  }

  private placeHint(ctx: PointContext): void {
    const head = this.world.player.head;
    head.getWorldPosition(this.headPosition);
    head.getWorldQuaternion(this.headQuaternion);
    this.headForward.set(0, 0, -1).applyQuaternion(this.headQuaternion);
    const yaw = Math.atan2(-this.headForward.x, -this.headForward.z);
    ctx.hint.place(
      this.headPosition.x - Math.sin(yaw) * HINT_AHEAD,
      this.headPosition.y - HINT_BELOW,
      this.headPosition.z - Math.cos(yaw) * HINT_AHEAD,
      yaw,
    );
    ctx.hint.show(true);
  }

  private endHint(reason: string): void {
    if (this.hintStarted < 0) return;
    this.hintStarted = -1;
    this.hintDone = true;
    context?.hint.show(false);
    slog(`point hint done reason=${reason}`);
  }
}
