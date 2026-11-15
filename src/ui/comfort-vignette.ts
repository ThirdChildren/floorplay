// The comfort vignette of the walk (plan docs/plans/WALK.md, rule 3): `ui:comfort-vignette`, ONE head-locked quad with a black
// ring that closes in on the edges of the view while the user moves, so a moving model does not make the eyes feel the edges
// slide. It is a child of the camera 0.5 m ahead, drawn last and over everything (no depth test), with a tiny shader that
// computes the ring from the UV (no texture, no canvas, no post-processing pass). It costs one draw call per eye while it is
// visible and NOTHING when it is not: below the minimum strength the mesh is hidden. `strength` is 0..1.
// Created once; nothing allocates per frame.

import { Mesh, PlaneGeometry, ShaderMaterial, type Entity, type World } from '@iwsdk/core';
import { tagEntity } from '../components/tag-entity';
import { stableId } from '../logic/ids';

/** Distance of the quad from the eyes (metres) and its side: it covers about +-67 degrees. */
const DISTANCE = 0.5;
const SIDE = 2.4;
/** Above everything else: the fade sphere (1_000_000) is the only thing over it, on purpose. */
const RENDER_ORDER = 999_000;
/** Below this strength the mesh is hidden. */
const MIN_STRENGTH = 0.01;

const VERTEX = /* glsl */ `
varying vec2 vUv;
void main() {
  vUv = uv;
  gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
}
`;

// r = distance from the centre of the quad in half sides (0 centre, 1 middle of an edge). The ring starts at `uInner`, is
// opaque at `uOuter`; both shrink a little with the strength so a faster walk closes in more.
const FRAGMENT = /* glsl */ `
varying vec2 vUv;
uniform float uStrength;
void main() {
  float r = length((vUv - 0.5) * 2.0);
  float inner = mix(0.55, 0.28, uStrength);
  float outer = mix(1.05, 0.62, uStrength);
  float a = smoothstep(inner, outer, r) * min(1.0, uStrength * 1.25) * 0.92;
  gl_FragColor = vec4(0.0, 0.0, 0.0, a);
}
`;

export class ComfortVignette {
  private readonly entity: Entity;
  private readonly mesh: Mesh<PlaneGeometry, ShaderMaterial>;
  private strengthValue = 0;

  constructor(world: World) {
    const geometry = new PlaneGeometry(SIDE, SIDE);
    const material = new ShaderMaterial({
      vertexShader: VERTEX,
      fragmentShader: FRAGMENT,
      uniforms: { uStrength: { value: 0 } },
      transparent: true,
      depthTest: false,
      depthWrite: false,
      fog: false,
    });
    const mesh = new Mesh(geometry, material);
    mesh.position.set(0, 0, -DISTANCE);
    mesh.renderOrder = RENDER_ORDER;
    mesh.frustumCulled = false;
    mesh.visible = false;
    mesh.raycast = () => undefined; // never a target of a ray
    this.mesh = mesh;
    this.entity = world.createTransformEntity(mesh);
    tagEntity(this.entity, stableId.ui('comfort-vignette'));
    // Head-locked: a child of the camera (the entity is the handle for the QA, the camera is the parent).
    world.camera.add(mesh);
  }

  /** Current strength, 0..1. */
  get strength(): number {
    return this.strengthValue;
  }

  /** True while the quad is drawn. */
  get visible(): boolean {
    return this.mesh.visible;
  }

  /** Sets the strength (0 clear, 1 the narrowest ring) and shows or hides the quad. Allocates nothing. */
  set(strength: number): void {
    const s = Number.isFinite(strength) ? Math.max(0, Math.min(1, strength)) : 0;
    this.strengthValue = s;
    this.mesh.material.uniforms.uStrength.value = s;
    const show = s >= MIN_STRENGTH;
    if (this.mesh.visible !== show) this.mesh.visible = show;
  }

  dispose(): void {
    this.mesh.removeFromParent();
    this.entity.dispose({ disposeResources: false });
    this.mesh.geometry.dispose();
    this.mesh.material.dispose();
  }
}
