// Visuals of the furniture pieces (task T2.9, decision D20): the glTF model of the catalog item when
// it loads, otherwise a procedural fallback block (a box of the catalog size plus a dark strip on the
// front, the -z side). Plus the outline frame drawn on the floor around the footprint (D14).
//
// The fallback block is ONE mesh with vertex colours (reduction R-C of D33 in docs/plans/M3.md): the box and
// the strip are merged into a single geometry, so a piece without a model costs one draw call, not two.
//
// Geometries and materials are shared: one set of materials for every piece, one block geometry per
// catalog id, one frame geometry per footprint size, and the glTF clones share the cached geometry
// and materials of the model. Pieces are therefore disposed with `disposeResources: false`.

import {
  AssetManager,
  Box3,
  BoxGeometry,
  BufferAttribute,
  BufferGeometry,
  Color,
  DoubleSide,
  Group,
  Mesh,
  MeshBasicMaterial,
  MeshStandardMaterial,
  Vector3,
  type Object3D,
} from '@iwsdk/core';
import { slog, swarn } from '../log';
import type { CatalogItem } from '../logic/catalog';
import { modelScale } from '../logic/catalog-sizes';
import { scanSkinFor } from '../logic/room-scan';
import type { OutlineKind } from '../logic/furniture-diff';
import { palette } from './theme';

/** Thickness of the outline frame, in real metres of the plan (D14). */
export const OUTLINE_WIDTH = 0.1;
/** The frame floats this high above the floor, above the door strips (0.01 m). */
const OUTLINE_LIFT = 0.02;
/** Depth of the dark front strip of a fallback block, metres. */
const STRIP_DEPTH = 0.02;
/** A model is reported when a side differs from the catalog size by more than this, metres. */
const SIZE_TOLERANCE = 0.05;

export const modelAssetId = (catalogId: string): string => `furniture-${catalogId}`;

interface PieceUserData {
  outline: Mesh;
  body: Object3D;
}

export class FurnitureVisuals {
  /** Fallback blocks: white material, the body/strip colours are vertex colours (see `blockGeometry`). */
  private readonly blockMaterial = new MeshStandardMaterial({ vertexColors: true, roughness: 1, metalness: 0 });
  private readonly greenMaterial = new MeshBasicMaterial({ color: palette.outlineValid, side: DoubleSide });
  private readonly redMaterial = new MeshBasicMaterial({ color: palette.outlineInvalid, side: DoubleSide });
  private readonly blockGeometry = new Map<string, BufferGeometry>();
  private readonly frameGeometry = new Map<string, BufferGeometry>();
  private readonly itemById = new Map<string, CatalogItem>();
  /** Catalog ids whose model loaded: only these are instantiated from the AssetManager. */
  private readonly modelReady = new Set<string>();
  /** Measured size of each loaded model as drawn, [width, depth, height] in metres: the base of the scale of a resized piece. */
  private readonly naturalSize = new Map<string, [number, number, number]>();

  constructor(items: readonly CatalogItem[]) {
    for (const item of items) this.itemById.set(item.id, item);
  }

  /**
   * Loads the model of every catalog item that has one (all in parallel, through the AssetManager).
   * A model that fails to load is reported once and that item keeps the fallback block.
   * With `simulateFailure` (`failmodels=1` together with `debug=1`) every load is replaced by a failure.
   */
  async preload(simulateFailure = false): Promise<{ models: number; fallbacks: number }> {
    const withModel = [...this.itemById.values()].filter((item) => typeof item.model === 'string');
    if (simulateFailure) slog('debug failmodels=1: every furniture model fails to load');
    const results = await Promise.allSettled(
      withModel.map((item) =>
        simulateFailure
          ? Promise.reject(new Error('simulated model failure'))
          : AssetManager.loadGLTFById(modelAssetId(item.id)),
      ),
    );
    results.forEach((result, index) => {
      const item = withModel[index];
      if (result.status === 'fulfilled') {
        this.modelReady.add(item.id);
        this.checkSize(item, result.value.scene);
      } else {
        swarn(`furniture model unavailable ${item.id}: using a block`);
      }
    });
    const models = this.modelReady.size;
    // Only items that HAVE a model can fall back to a block; own pieces and mobility items are always blocks (T3.8).
    const fallbacks = withModel.length - models;
    slog(`furniture models loaded=${models} fallback=${fallbacks}`);
    return { models, fallbacks };
  }

  /** True if the catalog item shows a glTF model (false: fallback block). */
  hasModel(catalogId: string): boolean {
    return this.modelReady.has(catalogId);
  }

  /** A new piece object: model or block, plus a hidden outline frame. Origin on the floor, at the centre of the footprint. */
  create(item: CatalogItem): Group {
    const group = new Group();
    const body = this.createBody(item);
    group.add(body);
    const frame = new Mesh(this.frame(item.size[0], item.size[1]), this.redMaterial);
    frame.visible = false;
    group.add(frame);
    const userData = group.userData as PieceUserData;
    userData.outline = frame;
    userData.body = body;
    return group;
  }

  /** The size of the drawn body of a piece made by `create`, in cm (width, depth, height): for the log of resized pieces. */
  measureBody(group: Object3D): [number, number, number] | null {
    const body = (group.userData as Partial<PieceUserData>).body;
    if (!body) return null;
    body.updateWorldMatrix(true, true);
    const size = new Box3().setFromObject(body).getSize(new Vector3());
    return [Math.round(size.x * 100), Math.round(size.z * 100), Math.round(size.y * 100)];
  }

  /** Shows the frame in the colour of `kind` (`none` hides it). */
  setOutline(group: Object3D, kind: OutlineKind): void {
    const frame = (group.userData as Partial<PieceUserData>).outline;
    if (!frame) return;
    frame.visible = kind !== 'none';
    if (kind !== 'none') frame.material = kind === 'green' ? this.greenMaterial : this.redMaterial;
  }

  /**
   * The preview frame of a held piece (D14): a flat frame on the floor of the model, in its own object (not part
   * of the piece, which follows the hand). Hidden until `setPreview` shows it.
   */
  createPreviewFrame(item: Pick<CatalogItem, 'size'>): Mesh {
    const mesh = new Mesh(this.frame(item.size[0], item.size[1]), this.greenMaterial);
    mesh.visible = false;
    return mesh;
  }

  /** Shows the preview frame in the colour of `kind`, or hides it (`none`). */
  setPreview(mesh: Mesh, kind: OutlineKind): void {
    mesh.visible = kind !== 'none';
    if (kind !== 'none') mesh.material = kind === 'green' ? this.greenMaterial : this.redMaterial;
  }

  /** Frees the shared geometries and materials (when the whole furniture system goes away). */
  dispose(): void {
    for (const geometry of [...this.blockGeometry.values(), ...this.frameGeometry.values()]) {
      geometry.dispose();
    }
    this.blockGeometry.clear();
    this.frameGeometry.clear();
    for (const material of [this.blockMaterial, this.greenMaterial, this.redMaterial]) {
      material.dispose();
    }
  }

  private createBody(item: CatalogItem): Object3D {
    if (this.modelReady.has(item.id)) {
      const gltf = AssetManager.getGLTF(modelAssetId(item.id));
      if (gltf) return this.scaled(item, gltf.scene);
      swarn(`furniture model missing from the cache ${item.id}: using a block`);
    }
    // A piece added from the room scan has no model of its own: it wears the catalog model of what it is, stretched to its size.
    const skin = scanSkinFor(item.id, item.size);
    if (skin && this.modelReady.has(skin)) {
      const gltf = AssetManager.getGLTF(modelAssetId(skin));
      const natural = this.naturalSize.get(skin);
      if (gltf && natural) {
        const [sx, sy, sz] = modelScale(item, natural);
        const holder = new Group();
        holder.scale.set(sx, sy, sz);
        holder.add(gltf.scene);
        return holder;
      }
    }
    return this.createBlock(item);
  }

  /**
   * The model is drawn at the size of the catalog file. When the user changed the size of the item (`defaultSize` is set), it goes
   * inside a group that stretches it to the new width, depth and height: same shared geometry and materials, no new draw call.
   */
  private scaled(item: CatalogItem, scene: Object3D): Object3D {
    if (!item.defaultSize) return scene;
    // Scale from the MEASURED size of the model (not only from the catalog number), in the axes of the model: y is the height.
    const [sx, sy, sz] = modelScale(item, this.naturalSize.get(item.id));
    const holder = new Group();
    holder.scale.set(sx, sy, sz);
    holder.add(scene);
    return holder;
  }

  private createBlock(item: CatalogItem): Group {
    const block = new Group();
    let geometry = this.blockGeometry.get(item.id);
    if (!geometry) {
      geometry = blockGeometry(item.size[0], item.size[1], item.size[2]);
      this.blockGeometry.set(item.id, geometry);
    }
    block.add(new Mesh(geometry, this.blockMaterial));
    return block;
  }

  /** Frame geometry: a flat ring just outside the footprint `w` x `d`, OUTLINE_WIDTH thick. */
  private frame(w: number, d: number): BufferGeometry {
    const key = `${w}x${d}`;
    let geometry = this.frameGeometry.get(key);
    if (!geometry) {
      geometry = frameGeometry(w, d);
      this.frameGeometry.set(key, geometry);
    }
    return geometry;
  }

  private checkSize(item: CatalogItem, scene: Object3D): void {
    const size = new Box3().setFromObject(scene).getSize(new Vector3());
    this.naturalSize.set(item.id, [size.x, size.z, size.y]);
    // The model is made at the size of the catalog file, whatever size the user chose for the item.
    const [w, d, h] = item.defaultSize ?? item.size;
    if (
      Math.abs(size.x - w) > SIZE_TOLERANCE ||
      Math.abs(size.z - d) > SIZE_TOLERANCE ||
      Math.abs(size.y - h) > SIZE_TOLERANCE
    ) {
      swarn(
        `furniture model ${item.id} size ${size.x.toFixed(2)}x${size.z.toFixed(2)}x${size.y.toFixed(2)} ` +
          `differs from the catalog ${w}x${d}x${h}`,
      );
    }
  }
}

/** Flat ring around a `w` x `d` rectangle centred on the origin (pure data: exported for tests). */
export function frameGeometry(w: number, d: number, width = OUTLINE_WIDTH): BufferGeometry {
  const ix = w / 2;
  const iz = d / 2;
  const ox = ix + width;
  const oz = iz + width;
  const y = OUTLINE_LIFT;
  // Outer corners 0-3, inner corners 4-7, in the same order.
  const positions = new Float32Array([
    -ox, y, -oz, ox, y, -oz, ox, y, oz, -ox, y, oz,
    -ix, y, -iz, ix, y, -iz, ix, y, iz, -ix, y, iz,
  ]);
  const indices: number[] = [];
  for (let i = 0; i < 4; i++) {
    const j = (i + 1) % 4;
    indices.push(i, j, 4 + j, i, 4 + j, 4 + i);
  }
  const geometry = new BufferGeometry();
  geometry.setAttribute('position', new BufferAttribute(positions, 3));
  geometry.setIndex(indices);
  return geometry;
}

/**
 * Fallback block of a `w` x `d` x `h` piece as ONE geometry with vertex colours: the body box (origin on the
 * floor, centred on the footprint) and the dark front strip on the -z face. The whole block fits the `w` x `d` x `h` box
 * exactly: the strip takes the front STRIP_DEPTH of the depth and the body box starts half of it behind, so the strip's face
 * is in front of the body (no z-fighting) and nothing sticks out of the footprint (the old strip added 1 cm of depth).
 */
export function blockGeometry(w: number, d: number, h: number): BufferGeometry {
  const overlap = Math.min(STRIP_DEPTH / 2, d / 4);
  const bodyDepth = d - overlap;
  const body = new BoxGeometry(w, h, bodyDepth);
  body.translate(0, h / 2, overlap / 2);
  const stripHeight = Math.max(h * 0.6, 0.005);
  const stripDepth = Math.min(STRIP_DEPTH, d / 2);
  const strip = new BoxGeometry(w * 0.8, stripHeight, stripDepth);
  strip.translate(0, h / 2, -d / 2 + stripDepth / 2);
  const merged = mergeColoured([
    [body, new Color(palette.furniture)],
    [strip, new Color(palette.furnitureFront)],
  ]);
  body.dispose();
  strip.dispose();
  return merged;
}

/** Concatenates indexed geometries (position, normal, index) and paints each part with one vertex colour. */
function mergeColoured(parts: ReadonlyArray<readonly [BufferGeometry, Color]>): BufferGeometry {
  let vertices = 0;
  let indices = 0;
  for (const [geometry] of parts) {
    vertices += geometry.getAttribute('position').count;
    indices += geometry.getIndex()?.count ?? 0;
  }
  const positions = new Float32Array(vertices * 3);
  const normals = new Float32Array(vertices * 3);
  const colors = new Float32Array(vertices * 3);
  const index = new Uint16Array(indices);
  let vertexOffset = 0;
  let indexOffset = 0;
  for (const [geometry, color] of parts) {
    const position = geometry.getAttribute('position');
    const normal = geometry.getAttribute('normal');
    for (let i = 0; i < position.count; i++) {
      const at = (vertexOffset + i) * 3;
      positions[at] = position.getX(i);
      positions[at + 1] = position.getY(i);
      positions[at + 2] = position.getZ(i);
      normals[at] = normal.getX(i);
      normals[at + 1] = normal.getY(i);
      normals[at + 2] = normal.getZ(i);
      colors[at] = color.r;
      colors[at + 1] = color.g;
      colors[at + 2] = color.b;
    }
    const source = geometry.getIndex();
    if (source) {
      for (let i = 0; i < source.count; i++) index[indexOffset + i] = source.getX(i) + vertexOffset;
      indexOffset += source.count;
    }
    vertexOffset += position.count;
  }
  const merged = new BufferGeometry();
  merged.setAttribute('position', new BufferAttribute(positions, 3));
  merged.setAttribute('normal', new BufferAttribute(normals, 3));
  merged.setAttribute('color', new BufferAttribute(colors, 3));
  merged.setIndex(new BufferAttribute(index, 1));
  return merged;
}
