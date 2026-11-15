// The tag-along placement shared by the three pinned panels (the menu, the View panel, the Issues panel): it wraps the pure rule of
// src/logic/menu-follow.ts (rest inside a dead zone, glide to the gaze outside it, keep a gap of 3 degrees from the column of fixed buttons)
// and reads the head from the scene. A panel owns one follower, calls `open` when it is created and `step` once per frame while it is
// open, and moves itself to `anchor` / `heading` whenever `step` says it moved (`version` grows each time, for the systems that place the
// controls of the panel). Nothing here allocates per frame.

import { Quaternion, Vector3, type Object3D } from '@iwsdk/core';
import { pitchOfForward, yawOfForward } from '../logic/menu-anchor';
import { createMenuFollow, placeMenuFollow, stepMenuFollow, wrapAngle, type ButtonColumn, type FollowInputs } from '../logic/menu-follow';
import type { PanelExtent } from '../logic/menu';
import type { Point3Like } from '../logic/view-fit';

export class PinnedFollower {
  private readonly state = createMenuFollow();
  private readonly headPosition = new Vector3();
  private readonly headForward = new Vector3();
  private readonly headQuaternion = new Quaternion();
  private readonly inputs: FollowInputs = {
    head: this.headPosition,
    gazeYaw: 0,
    gazePitch: 0,
    extent: { halfWidth: 0, bottom: 0, top: 0 },
    large: false,
    column: null,
    tieSign: 1,
  };
  /** Grows each time the panel was placed somewhere new (at `open` and at every `step` that moved it). */
  version = 0;

  /** Where the panel faces from the head, radians (as `yawOfForward`). */
  get heading(): number {
    return this.state.heading;
  }

  /** Bottom centre of the panel. */
  get anchor(): Readonly<Point3Like> {
    return this.state.anchor;
  }

  /** True while the panel glides. */
  get moving(): boolean {
    return this.state.moving;
  }

  /** Heading of the gaze at the last `open` or `step`, radians, and its pitch. */
  get gazeYaw(): number {
    return this.inputs.gazeYaw;
  }

  get gazePitch(): number {
    return this.inputs.gazePitch;
  }

  /** How far the panel is turned from the gaze, radians (0 when it faces the gaze, as at a normal opening). */
  get shift(): number {
    return wrapAngle(this.state.heading - this.inputs.gazeYaw);
  }

  private read(head: Object3D, extent: Readonly<PanelExtent>, large: boolean, column: Readonly<ButtonColumn> | null, tieSign: 1 | -1): void {
    head.getWorldPosition(this.headPosition);
    head.getWorldQuaternion(this.headQuaternion);
    this.headForward.set(0, 0, -1).applyQuaternion(this.headQuaternion);
    const inputs = this.inputs;
    inputs.gazeYaw = yawOfForward(this.headForward.x, this.headForward.z);
    inputs.gazePitch = pitchOfForward(this.headForward.x, this.headForward.y, this.headForward.z);
    inputs.extent = extent;
    inputs.large = large;
    inputs.column = column;
    inputs.tieSign = tieSign;
  }

  /** Places the panel for the head as it is now (no glide): at the gaze, or beside the column when the gaze is on it. */
  open(head: Object3D, extent: Readonly<PanelExtent>, large: boolean, column: Readonly<ButtonColumn> | null, tieSign: 1 | -1): void {
    this.read(head, extent, large, column, tieSign);
    placeMenuFollow(this.state, this.inputs);
    this.version += 1;
  }

  /** One frame: true when the panel moved (read `anchor` and `heading`). `dt` is the frame time in seconds. */
  step(head: Object3D, extent: Readonly<PanelExtent>, large: boolean, column: Readonly<ButtonColumn> | null, tieSign: 1 | -1, dt: number): boolean {
    this.read(head, extent, large, column, tieSign);
    const moved = stepMenuFollow(this.state, this.inputs, dt);
    if (moved) this.version += 1;
    return moved;
  }
}
