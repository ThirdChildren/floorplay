import { readFileSync } from 'node:fs';
import { repoPath } from './load-json';

/** Axis-aligned bounds of a .glb in its own axes (x = width, y = up, z = depth): from the accessor min/max and the node transforms. */
export interface GlbBounds {
  min: [number, number, number];
  max: [number, number, number];
  /** [width (x), depth (z), height (y)], the order of the catalog sizes. */
  size: [number, number, number];
}

type Mat = number[];
const IDENTITY: Mat = [1, 0, 0, 0, 0, 1, 0, 0, 0, 0, 1, 0, 0, 0, 0, 1];

function multiply(a: Mat, b: Mat): Mat {
  const out = new Array<number>(16).fill(0);
  for (let c = 0; c < 4; c++) for (let r = 0; r < 4; r++) for (let k = 0; k < 4; k++) out[c * 4 + r] += a[k * 4 + r] * b[c * 4 + k];
  return out;
}

interface GltfNode {
  mesh?: number;
  children?: number[];
  matrix?: Mat;
  translation?: number[];
  rotation?: number[];
  scale?: number[];
}

function local(node: GltfNode): Mat {
  if (node.matrix) return node.matrix;
  const [tx, ty, tz] = node.translation ?? [0, 0, 0];
  const [x, y, z, w] = node.rotation ?? [0, 0, 0, 1];
  const [sx, sy, sz] = node.scale ?? [1, 1, 1];
  return [
    (1 - 2 * (y * y + z * z)) * sx, 2 * (x * y + z * w) * sx, 2 * (x * z - y * w) * sx, 0,
    2 * (x * y - z * w) * sy, (1 - 2 * (x * x + z * z)) * sy, 2 * (y * z + x * w) * sy, 0,
    2 * (x * z + y * w) * sz, 2 * (y * z - x * w) * sz, (1 - 2 * (x * x + y * y)) * sz, 0,
    tx, ty, tz, 1,
  ];
}

export function glbBounds(file: string): GlbBounds {
  const buffer = readFileSync(repoPath('public', file));
  const jsonLength = buffer.readUInt32LE(12);
  const gltf = JSON.parse(buffer.subarray(20, 20 + jsonLength).toString('utf8')) as {
    scene?: number;
    scenes: { nodes: number[] }[];
    nodes: GltfNode[];
    meshes: { primitives: { attributes: { POSITION: number } }[] }[];
    accessors: { min: number[]; max: number[] }[];
  };
  const min: [number, number, number] = [Infinity, Infinity, Infinity];
  const max: [number, number, number] = [-Infinity, -Infinity, -Infinity];
  const visit = (index: number, parent: Mat): void => {
    const node = gltf.nodes[index];
    const m = multiply(parent, local(node));
    if (node.mesh !== undefined) {
      for (const primitive of gltf.meshes[node.mesh].primitives) {
        const a = gltf.accessors[primitive.attributes.POSITION];
        for (let corner = 0; corner < 8; corner++) {
          const v = [corner & 1 ? a.max[0] : a.min[0], corner & 2 ? a.max[1] : a.min[1], corner & 4 ? a.max[2] : a.min[2]];
          for (let k = 0; k < 3; k++) {
            const world = m[k] * v[0] + m[4 + k] * v[1] + m[8 + k] * v[2] + m[12 + k];
            min[k] = Math.min(min[k], world);
            max[k] = Math.max(max[k], world);
          }
        }
      }
    }
    for (const child of node.children ?? []) visit(child, m);
  };
  for (const root of gltf.scenes[gltf.scene ?? 0].nodes) visit(root, IDENTITY);
  return { min, max, size: [max[0] - min[0], max[2] - min[2], max[1] - min[1]] };
}
