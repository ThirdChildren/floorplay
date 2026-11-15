// Walking inside the tabletop model with the "dig" gesture (plan docs/plans/WALK.md, rule 2).
//
// The view change itself (the fade, the real-scale look of the model, the store, the way back) is in src/systems/viewpoint.ts: it
// calls `beginWalk` at the black frame and `endWalk` when the model goes back to the table. This file owns what happens while the
// user walks:
//   - it reads the joints of both hands each frame (ONE `fillPoses` call per hand: wrist, two metacarpals, five fingertips) and
//     feeds `updateDig` (src/logic/dig-gesture.ts) with them and with the horizontal gaze;
//   - the speed that comes out moves the body on the plan (`stepWalk`, src/logic/walk.ts: it slides along the walls) and the model
//     root is placed again so the body stays under the head (the head never moves, rule 2: the MODEL moves);
//   - the comfort vignette (one head-locked quad) follows the speed;
//   - the position is written to the store (`view: {kind: 'walk', x, z, yawDeg}`) when the body stops and at most once a second while
//     it moves, so pause/resume and reload bring the user back to the same spot (plan WALK, decision 3).
// The hint "Dig with both hands, palms down, to walk" shows the first three times the walk is entered, until the first stroke.
//
// Without hand joints (controllers only, no `XRFrame.fillPoses`) the walk cannot be driven: `requestWalk` says so and does not enter
// (`[soglia] feature hand joints unavailable`); the Tabletop button and the viewpoints work as always (controllers are never required).
//
// A debug hook behind `?debug=1` (`window.__sogliaWalk`, src/debug/walk-hook.ts) feeds a speed or synthetic hand poses to the same
// code path: the emulator cannot move the finger joints of a hand the way a dig does.
//
// Nothing here allocates per frame: the samples, the vectors and the steps are created once.

import { createSystem, Quaternion, Vector3, type Object3D, type World } from '@iwsdk/core';
import { slog, swarn } from '../log';
import {
  FLOATS_PER_JOINT,
  JOINT_INDEX_TIP,
  JOINT_THUMB_TIP,
  JOINT_WRIST,
  jointPositionFromMatrix,
  palmNormalFromJoints,
} from '../logic/hand-joints';
import {
  MAX_WALK_SPEED,
  createDig,
  createDigHandSample,
  horizontalForward,
  resetDig,
  updateDig,
  type DigHandSample,
  type DigHead,
  type DigState,
} from '../logic/dig-gesture';
import { yawFromForward } from '../logic/placement';
import { setView, type Store } from '../logic/state';
import { vignetteStep, vignetteTarget } from '../logic/vignette';
import {
  WALK_EYE_HEIGHT,
  buildWalkWorld,
  freeSpot,
  planStep,
  roundMm,
  stepWalk,
  walkRoot,
  wrapDegrees,
  type PlanPoint,
  type WalkReference,
  type WalkStep,
  type WalkWorld,
} from '../logic/walk';
import type { House } from '../logic/house';
import type { MiniatureRoot } from '../logic/furniture-pose';
import { ComfortVignette } from '../ui/comfort-vignette';
import { RoomNoticePanel } from '../ui/room-notice-panel';
import { strings } from '../ui/strings';
import { isPinching } from './pinch-input';
import { isViewTransitioning, isWalking, setWalkFlag } from './view-mode';

type Hand = 'left' | 'right';
const HANDS: readonly Hand[] = ['left', 'right'];
const DEG_TO_RAD = Math.PI / 180;
const RAD_TO_DEG = 180 / Math.PI;

// The joints this reader asks for: the first five are the layout of src/logic/hand-joints.ts (so the palm normal code is shared).
const DIG_JOINT_NAMES = [
  'wrist',
  'index-finger-metacarpal',
  'pinky-finger-metacarpal',
  'thumb-tip',
  'index-finger-tip',
  'middle-finger-tip',
  'ring-finger-tip',
  'pinky-finger-tip',
] as const;
const JOINT_MIDDLE_TIP = 5;
const JOINT_RING_TIP = 6;
const JOINT_PINKY_TIP = 7;
const DIG_BUFFER_LENGTH = DIG_JOINT_NAMES.length * FLOATS_PER_JOINT;

type FillPoses = (spaces: ArrayLike<XRSpace>, baseSpace: XRSpace, transforms: Float32Array) => boolean;
interface FrameWithFillPoses {
  readonly fillPoses?: FillPoses;
}

/** The position is written to the store at most this often while the body moves (seconds). */
const SAVE_INTERVAL = 1;
/** The hint shows this many times in all (per browser), until the first stroke of each time, and for at most this long (seconds). */
const HINT_TIMES = 3;
const HINT_SECONDS = 12;
const NOTICE_SECONDS = 6;
const HINT_STORAGE_KEY = 'soglia:v1:walk-hint';
/// The hint sits this far ahead of the head and at the height of the eyes (inside the central cone, rule 8).
const HINT_AHEAD = 0.65;

interface HandReader {
  bound: XRInputSource | null;
  complete: boolean;
  readonly spaces: XRSpace[];
  readonly joints: Float32Array;
}

const createReader = (): HandReader => ({ bound: null, complete: false, spaces: new Array<XRSpace>(DIG_JOINT_NAMES.length), joints: new Float32Array(DIG_BUFFER_LENGTH) });

interface WalkContext {
  world: World;
  store: Store;
  house: House;
  walkWorld: WalkWorld;
  root: Object3D | null;
  vignette: ComfortVignette;
  hint: RoomNoticePanel;
}

let context: WalkContext | null = null;
let active: WalkSystem | null = null;

// --- State of the walk -----------------------------------------------------------------------------------------------------------

const dig: DigState = createDig();
const samples: Record<Hand, DigHandSample> = { left: createDigHandSample(), right: createDigHandSample() };
const readers: Record<Hand, HandReader> = { left: createReader(), right: createReader() };
const body: PlanPoint = { x: 0, z: 0 };
const reference: WalkReference = { hx: 0, hy: 0, hz: 0, yawRad: 0 };
const rootPose: MiniatureRoot = { x: 0, y: 0, z: 0, yawRad: 0, scale: 1 };
const stepScratch: PlanPoint = { x: 0, z: 0 };
const stepResult: WalkStep = { moved: 0, wanted: 0, progress: 1 };
const gaze: DigHead = { x: 0, y: 0, z: 0, fx: 0, fz: -1 };
const forward = { fx: 0, fz: -1 };
const spotScratch: PlanPoint = { x: 0, z: 0 };

let lastHeadYawDeg = 0;
let sinceSave = 0;
let dirty = false;
let moved = false;
let hintStarted = -1;
let noticeUntil = -1;
let warnedFill = false;
/** Debug hook (`?debug=1`): when set, this speed replaces the one of the hands for `debugSpeedSeconds`. */
let debugSpeed = 0;
let debugSpeedSeconds = 0;
let debugHands = false;

/** Creates the vignette and the hint and registers the system. Register it AFTER `createViewpoint`. */
export function createWalk(world: World, store: Store, house: House, root: Object3D | null): void {
  context = {
    world,
    store,
    house,
    walkWorld: buildWalkWorld(house),
    root,
    vignette: new ComfortVignette(world),
    hint: new RoomNoticePanel(world, 'ui:walk-hint'),
  };
  world.registerSystem(WalkSystem);
}

/** True when at least one hand of the session has joints (hand tracking is on): the walk can be driven. */
export function hasHandTracking(world: World): boolean {
  const xr = world.renderer.xr;
  if (!xr.isPresenting) return false;
  const session = xr.getSession();
  if (!session) return false;
  const frame = world.xrFrame;
  if (frame && typeof (frame as unknown as FrameWithFillPoses).fillPoses !== 'function') return false;
  for (let i = 0; i < session.inputSources.length; i += 1) {
    if (session.inputSources[i].hand) return true;
  }
  return false;
}

/** Says why the walk was not entered (a short notice in front of the head), once per request. */
export function noticeNoHands(): void {
  swarn('feature hand joints unavailable: walking by dig needs hand tracking');
  noticeUntil = performance.now() / 1000 + NOTICE_SECONDS;
  active?.showNotice(strings.walk.needsHands);
}

/** The body spot a walk starts at: the first viewpoint of the house (the room it is in, facing where the viewpoint looks). */
export function startingSpot(house: House): { x: number; z: number; yawDeg: number } {
  const v = house.viewpoints[0];
  if (!v) {
    const b = context?.walkWorld.bounds;
    return { x: b ? (b.minX + b.maxX) / 2 : 0, z: b ? (b.minZ + b.maxZ) / 2 : 0, yawDeg: 0 };
  }
  return { x: v.position[0], z: v.position[1], yawDeg: v.yawDeg ?? 0 };
}

/**
 * Starts the walk at the plan spot `spot` (on a free place near it) with the head at `head` (world, `yawDeg` the turn of the head, as
 * for a viewpoint): places `root` so the body is under the head, with the floor `WALK_EYE_HEIGHT` below the eyes, and switches the dig
 * on (`showHint`: the first entries show the hint, a restore does not). Returns the spot used (the place and the heading to save), or null when the head pose is not usable (nothing changed).
 */
export function beginWalk(
  root: Object3D,
  head: { x: number; y: number; z: number; yawDeg: number },
  spot: { x: number; z: number; yawDeg: number },
  showHint = true,
): { x: number; z: number; yawDeg: number } | null {
  const ctx = context;
  if (!ctx) return null;
  const yawRad = (spot.yawDeg + head.yawDeg) * DEG_TO_RAD;
  if (![head.x, head.y, head.z, yawRad, spot.x, spot.z].every(Number.isFinite)) {
    swarn('walk pose not usable');
    return null;
  }
  freeSpot(spot.x, spot.z, ctx.walkWorld, spotScratch);
  body.x = spotScratch.x;
  body.z = spotScratch.z;
  reference.hx = head.x;
  reference.hy = head.y;
  reference.hz = head.z;
  reference.yawRad = yawRad;
  ctx.root = root;
  placeRoot(ctx);
  resetDig(dig);
  lastHeadYawDeg = head.yawDeg;
  sinceSave = 0;
  dirty = false;
  moved = false;
  setWalkFlag(true);
  if (showHint) startHint(ctx);
  slog(`walk started x=${roundMm(body.x)} z=${roundMm(body.z)} yawDeg=${Math.round(spot.yawDeg)} eye=${WALK_EYE_HEIGHT}`);
  return { x: roundMm(body.x), z: roundMm(body.z), yawDeg: wrapDegrees(spot.yawDeg) };
}

/** Stops the walk (the model goes back to the table, the session ended): the position is written to the store first when `save` is true. */
export function endWalk(save: boolean): void {
  const ctx = context;
  if (!ctx || !isWalking()) return;
  if (save) flushToStore(ctx);
  setWalkFlag(false);
  resetDig(dig);
  debugSpeed = 0;
  debugSpeedSeconds = 0;
  ctx.vignette.set(0);
  ctx.hint.show(false);
  hintStarted = -1;
  slog(`walk ended x=${roundMm(body.x)} z=${roundMm(body.z)}`);
}

/** The session is suspended (hidden, blurred): stops where the body is, the position is written to the store. */
export function suspendWalk(): void {
  const ctx = context;
  if (!ctx || !isWalking()) return;
  flushToStore(ctx);
  resetDig(dig);
  debugSpeed = 0;
  debugSpeedSeconds = 0;
  ctx.vignette.set(0);
}

/** Where the body is on the plan now (a copy). */
export function walkPosition(): { x: number; z: number; yawDeg: number } {
  return { x: roundMm(body.x), z: roundMm(body.z), yawDeg: wrapDegrees(reference.yawRad * RAD_TO_DEG - lastHeadYawDeg) };
}

/** Debug hook: drives the walk at `speed` m/s for `seconds` along the gaze as if the hands had dug (same code path after `updateDig`). */
export function debugDrive(speed: number, seconds: number): void {
  debugSpeed = Math.max(0, Math.min(MAX_WALK_SPEED, speed));
  debugSpeedSeconds = Math.max(0, seconds);
}

/** Debug hook: feeds a synthetic hand pose to `updateDig` instead of the real joints (null = back to the joints). */
export function debugHandSamples(left: DigHandSample | null, right: DigHandSample | null): void {
  debugHands = left !== null && right !== null;
  if (left && right) {
    copySample(left, samples.left);
    copySample(right, samples.right);
  }
}

function copySample(from: DigHandSample, to: DigHandSample): void {
  to.tracked = from.tracked;
  to.pinching = from.pinching;
  for (const key of ['wrist', 'palmNormal', 'thumbTip', 'indexTip', 'middleTip', 'ringTip', 'pinkyTip'] as const) {
    to[key].x = from[key].x;
    to[key].y = from[key].y;
    to[key].z = from[key].z;
  }
}

/** Current state for the QA and the debug hook. */
export function walkStatus(): {
  walking: boolean;
  speed: number;
  x: number;
  z: number;
  vignette: number;
  left: string;
  right: string;
  /** Smoothed backward and sideways speed of each wrist (m/s) and its wrist z (the hand pose the gesture sees). */
  hands: { back: number; side: number; stroking: boolean; wristZ: number }[];
} {
  return {
    hands: [dig.left, dig.right].map((h, i) => ({ back: roundMm(h.back), side: roundMm(h.side), stroking: h.stroking, wristZ: roundMm(samples[i === 0 ? 'left' : 'right'].wrist.z) })),
    walking: isWalking(),
    speed: dig.speed,
    x: roundMm(body.x),
    z: roundMm(body.z),
    vignette: context?.vignette.strength ?? 0,
    left: dig.left.reason,
    right: dig.right.reason,
  };
}

function placeRoot(ctx: WalkContext): void {
  const object = ctx.root;
  if (!object) return;
  walkRoot(body.x, body.z, ctx.walkWorld.center, reference, rootPose);
  object.scale.setScalar(rootPose.scale);
  object.position.set(rootPose.x, rootPose.y, rootPose.z);
  object.rotation.set(0, rootPose.yawRad, 0);
}

function flushToStore(ctx: WalkContext): void {
  const spot = walkPosition();
  ctx.store.dispatch(setView({ kind: 'walk', x: spot.x, z: spot.z, yawDeg: spot.yawDeg }));
  sinceSave = 0;
  dirty = false;
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
    // Browser storage can be blocked: the hint then shows every time, which is harmless.
  }
}

function startHint(ctx: WalkContext): void {
  if (hintCount() >= HINT_TIMES) return;
  bumpHintCount();
  hintStarted = performance.now() / 1000;
  ctx.hint.setText(strings.walk.hint);
  active?.anchorHint();
  slog('walk hint shown');
}

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
  for (let i = 0; i < DIG_JOINT_NAMES.length; i += 1) {
    const space = hand.get(DIG_JOINT_NAMES[i]);
    if (!space) {
      swarn(`feature hand joint ${DIG_JOINT_NAMES[i]} unavailable`);
      return false;
    }
    reader.spaces[i] = space;
  }
  reader.complete = true;
  return true;
}

/** Fills `sample` from the joints of `source`. Returns false (sample marked untracked) when there is nothing usable. */
function readHand(hand: Hand, source: XRInputSource | null, frame: XRFrame | null, reference_: XRReferenceSpace | null, sample: DigHandSample): boolean {
  sample.tracked = false;
  if (!source || !frame || !reference_) return false;
  const reader = readers[hand];
  const fill = (frame as unknown as FrameWithFillPoses).fillPoses;
  if (typeof fill !== 'function') {
    if (!warnedFill) {
      warnedFill = true;
      swarn('feature XRFrame.fillPoses unavailable; the dig gesture cannot read the hands');
    }
    return false;
  }
  if (reader.bound !== source) bind(reader, source);
  if (!reader.complete) return false;
  try {
    if (fill.call(frame, reader.spaces, reference_, reader.joints) !== true) return false;
  } catch {
    return false;
  }
  const m = reader.joints;
  if (!palmNormalFromJoints(m, hand, sample.palmNormal)) return false;
  if (
    !jointPositionFromMatrix(m, JOINT_WRIST, sample.wrist) ||
    !jointPositionFromMatrix(m, JOINT_THUMB_TIP, sample.thumbTip) ||
    !jointPositionFromMatrix(m, JOINT_INDEX_TIP, sample.indexTip) ||
    !jointPositionFromMatrix(m, JOINT_MIDDLE_TIP, sample.middleTip) ||
    !jointPositionFromMatrix(m, JOINT_RING_TIP, sample.ringTip) ||
    !jointPositionFromMatrix(m, JOINT_PINKY_TIP, sample.pinkyTip)
  ) {
    return false;
  }
  sample.tracked = true;
  return true;
}

export class WalkSystem extends createSystem({}) {
  private readonly headPosition = new Vector3();
  private readonly headQuaternion = new Quaternion();
  private readonly headForward = new Vector3();
  private vignetteStrength = 0;

  init(): void {
    active = this;
    this.cleanupFuncs.push(() => {
      if (active === this) active = null;
    });
  }

  /** Puts the hint (or the notice) where the head looks now: 0.65 m ahead at the height of the eyes, facing the head. */
  anchorHint(): void {
    const ctx = context;
    if (!ctx) return;
    const head = this.world.player.head;
    head.getWorldPosition(this.headPosition);
    head.getWorldQuaternion(this.headQuaternion);
    this.headForward.set(0, 0, -1).applyQuaternion(this.headQuaternion);
    const yaw = yawFromForward(this.headForward.x, this.headForward.z);
    // Ahead along the horizontal gaze: yaw 0 looks along -z, so the point is (-sin(yaw), -cos(yaw)) times the distance.
    ctx.hint.place(this.headPosition.x - Math.sin(yaw) * HINT_AHEAD, this.headPosition.y - 0.04, this.headPosition.z - Math.cos(yaw) * HINT_AHEAD, yaw);
  }

  showNotice(text: string): void {
    const ctx = context;
    if (!ctx) return;
    ctx.hint.setText(text);
    this.anchorHint();
  }

  update(delta: number): void {
    const ctx = context;
    if (!ctx) return;
    ctx.hint.prepare();
    const now = performance.now() / 1000;
    const xr = this.world.renderer.xr;
    const presenting = xr.isPresenting;

    // The notice (no hand tracking) and the hint of the first entries show for a while.
    const noticeOn = noticeUntil > now && presenting;
    const hintOn = hintStarted >= 0 && now - hintStarted < HINT_SECONDS && isWalking() && presenting;
    ctx.hint.show(noticeOn || hintOn);
    if (!noticeOn && noticeUntil >= 0 && noticeUntil <= now) noticeUntil = -1;

    if (!isWalking()) {
      if (this.vignetteStrength !== 0) {
        this.vignetteStrength = 0;
        ctx.vignette.set(0);
      }
      return;
    }
    if (!presenting) {
      // The session ended: the viewpoint system puts the table back (and calls `endWalk`); nothing to drive.
      return;
    }
    if (isViewTransitioning()) {
      ctx.vignette.set(0);
      return;
    }
    const dt = Number.isFinite(delta) && delta > 0 ? Math.min(delta, 0.1) : 0;
    if (dt === 0) return;

    // The head: position, the horizontal gaze and the turn of the head (for the heading that is saved).
    const head = this.world.player.head;
    head.getWorldPosition(this.headPosition);
    head.getWorldQuaternion(this.headQuaternion);
    this.headForward.set(0, 0, -1).applyQuaternion(this.headQuaternion);
    lastHeadYawDeg = yawFromForward(this.headForward.x, this.headForward.z) * RAD_TO_DEG;
    if (horizontalForward(this.headForward.x, this.headForward.z, forward)) {
      gaze.fx = forward.fx;
      gaze.fz = forward.fz;
    }
    gaze.x = this.headPosition.x;
    gaze.y = this.headPosition.y;
    gaze.z = this.headPosition.z;

    // The hands: real joints, or the synthetic poses of the debug hook.
    if (!debugHands) {
      const session = xr.getSession();
      const frame = this.world.xrFrame;
      const space = this.world.xrReferenceSpace;
      for (const hand of HANDS) {
        const source = session ? findInputSource(session.inputSources, hand) : null;
        readHand(hand, source, frame, space, samples[hand]);
      }
    }
    if (!debugHands) {
      samples.left.pinching = isPinching('left');
      samples.right.pinching = isPinching('right');
    }

    let speed = updateDig(dig, samples.left, samples.right, gaze, dt);
    if (debugSpeedSeconds > 0) {
      debugSpeedSeconds -= dt;
      speed = Math.max(speed, debugSpeed);
      dig.speed = speed;
    }

    if (speed > 0) {
      planStep(speed, gaze.fx, gaze.fz, dt, reference.yawRad, stepScratch);
      stepWalk(body, stepScratch.x, stepScratch.z, ctx.walkWorld, stepResult);
      // Walking at a wall: the speed bleeds away so the user does not keep "pushing" after stopping (the body slides if it can).
      if (stepResult.wanted > 0 && stepResult.progress < 0.3) dig.speed *= Math.exp(-dt / 0.12);
      placeRoot(ctx);
      moved = true;
      dirty = true;
      sinceSave += dt;
      // The first stroke ends the hint.
      if (hintStarted >= 0 && speed > 0.1) {
        hintStarted = -1;
        slog('walk hint done reason=stroke');
      }
      if (sinceSave >= SAVE_INTERVAL) flushToStore(ctx);
    } else if (dirty) {
      flushToStore(ctx);
      if (moved) slog(`walk stopped x=${roundMm(body.x)} z=${roundMm(body.z)}`);
      moved = false;
    }

    this.vignetteStrength = vignetteStep(this.vignetteStrength, vignetteTarget(dig.speed), dt);
    ctx.vignette.set(this.vignetteStrength);
  }
}
