// Real end-to-end "point at a spot" in IWER: a custom 'point' hand pose (index kept, middle/ring/pinky pulled towards the wrist) is registered in the
// emulator and the hand is placed and turned from page JS, so the REAL joints go through the REAL recognition. Run it after `xr enter` and
// `xr set-input-mode hand`; pick the step with the environment variable POINT_SCN (see the switch below).
// Copy it inside the workspace (it must live there) and run: POINT_SCN=hold npx @iwsdk/cli browser run <copy> --timeout 90000
// Model at the table: scale 0.05, root (0, 1.35, -0.45), plan centre (5.5, 3.6) of apartment-a: world = (Ox + (px - 5.5) 0.05, Oy + y 0.05, Oz + (pz - 3.6) 0.05).
export default async function run({ frame }) {
  const scn = process.env.POINT_SCN || 'hold';
  const arg = (process.env.POINT_ARGS || '').split(',').filter(Boolean).map(Number);
  return await frame.evaluate(
    async ({ scn, arg }) => {
      const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
      const D = window.IWER_DEVICE;
      const P = window.__sogliaPoint;
      const hands = { left: D.hands.left, right: D.hands.right };
      const CURL = ['middle', 'ring', 'pinky'];
      const tables = {};
      for (const [side, h] of Object.entries(hands)) {
        for (const s of Object.getOwnPropertySymbols(h)) {
          const v = h[s];
          if (v && v.poses) {
            tables[side] = v.poses;
            if (!v.poses.point) {
              const def = v.poses.default;
              const pt = { jointTransforms: {}, gripOffsetMatrix: def.gripOffsetMatrix };
              const w = def.jointTransforms['wrist'].offsetMatrix;
              for (const [name, j] of Object.entries(def.jointTransforms)) {
                const m = new Float32Array(j.offsetMatrix);
                if (CURL.some((f) => name.startsWith(f)) && !name.includes('metacarpal')) {
                  for (const k of [12, 13, 14]) m[k] = w[k] + (m[k] - w[k]) * 0.47;
                }
                pt.jointTransforms[name] = { offsetMatrix: m, radius: j.radius };
              }
              v.poses.point = pt;
            }
            if (!v.poses.fist) {
              const def = v.poses.default;
              const fist = { jointTransforms: {}, gripOffsetMatrix: def.gripOffsetMatrix };
              const w = def.jointTransforms['wrist'].offsetMatrix;
              for (const [name, j] of Object.entries(def.jointTransforms)) {
                const m = new Float32Array(j.offsetMatrix);
                if (['index', 'middle', 'ring', 'pinky'].some((f) => name.startsWith(f)) && !name.includes('metacarpal')) {
                  for (const k of [12, 13, 14]) m[k] = w[k] + (m[k] - w[k]) * 0.47;
                }
                fist.jointTransforms[name] = { offsetMatrix: m, radius: j.radius };
              }
              v.poses.fist = fist;
            }
          }
        }
      }
      const out = { scn, log: [] };
      // The table is written for the left hand: the right hand mirrors x (verified: the tip of the right hand is at hand.x - table.x).
      const jt = (name) => {
        const m = tables.right.default.jointTransforms[name].offsetMatrix;
        return [-m[12], m[13], m[14]];
      };
      const tipOffset = jt('index-finger-tip');
      const knuckleOffset = jt('index-finger-phalanx-proximal');
      out.tipOffset = tipOffset;
      // Rotation of the hand about +x by `a` radians (pitch; a < 0 points the fingers down).
      const rx = (v, a) => [v[0], v[1] * Math.cos(a) - v[2] * Math.sin(a), v[1] * Math.sin(a) + v[2] * Math.cos(a)];
      // Puts the hand (pitched by pitchDeg, yaw 0) so that the line of its index finger (knuckle to tip, the same line the app reads) meets
      // world point T, with the tip `height` metres above T. The default hand of the emulator has a slightly splayed index, so the
      // direction is computed from the joints of the pose table, not assumed along the hand's -z.
      const aim = async (side, T, pitchDeg, height, pose) => {
        const a = (-pitchDeg * Math.PI) / 180;
        const dir = rx([tipOffset[0] - knuckleOffset[0], tipOffset[1] - knuckleOffset[1], tipOffset[2] - knuckleOffset[2]], a);
        const len = Math.hypot(...dir);
        const d = dir.map((v) => v / len);
        const t = height / -d[1];
        const tip = [T[0] - t * d[0], T[1] - t * d[1], T[2] - t * d[2]];
        const off = rx(tipOffset, a);
        hands[side].position.set(tip[0] - off[0], tip[1] - off[1], tip[2] - off[2]);
        hands[side].quaternion.set(Math.sin(a / 2), 0, 0, Math.cos(a / 2));
        if (pose) hands[side].poseId = pose;
      };
      const world = (px, py, pz) => [0 + (px - 5.5) * 0.05, 1.35 + py * 0.05, -0.45 + (pz - 3.6) * 0.05];
      const st = () => {
        const s = P.status();
        return { ph: s.phase, pr: s.progress, l: s.left, r: s.right, hit: s.hasHit, at: [s.hit.x, s.hit.y, s.hit.z].join(','), sf: s.hit.surface, ray: [s.ray.ox, s.ray.oy, s.ray.oz, s.ray.dx, s.ray.dy, s.ray.dz].join(',') };
      };
      const sample = async (ms, every = 250) => {
        const rows = [];
        const n = Math.round(ms / every);
        for (let i = 0; i < n; i += 1) {
          await sleep(every);
          rows.push(st());
        }
        return rows;
      };
      const rest = () => {
        hands.left.position.set(-0.25, 1.5, -0.4);
        hands.left.quaternion.set(0, 0, 0, 1);
        hands.left.poseId = 'default';
        hands.right.position.set(0.25, 1.5, -0.4);
        hands.right.quaternion.set(0, 0, 0, 1);
        hands.right.poseId = 'default';
      };
      out.head = [D.position.x, D.position.y, D.position.z];
      const SPOT = arg.length >= 2 ? [arg[0], 0, arg[1]] : [1.0, 0, 1.0];
      const T = world(SPOT[0], SPOT[1], SPOT[2]);
      out.target = T;
      switch (scn) {
        case 'hold': {
          rest();
          await sleep(600);
          await aim('right', T, 50, 0.17, 'point');
          out.rows = await sample(2400);
          break;
        }
        case 'world': {
          // arg = world x, y, z of the target, pitch (deg), height of the tip above the target: for the views at real scale.
          rest();
          await sleep(400);
          await aim('right', [arg[0], arg[1], arg[2]], arg[3] || 40, arg[4] || 0.9, 'point');
          out.rows = await sample(2000);
          break;
        }
        case 'start': {
          // The pose is taken and kept (the script returns after 0.5 s): for a screenshot of the dwell with `ecs pause`.
          rest();
          await sleep(400);
          await aim('right', T, 50, 0.17, 'point');
          out.rows = await sample(500);
          break;
        }
        case 'open': {
          rest();
          await sleep(400);
          await aim('right', T, 50, 0.17, 'default');
          out.rows = await sample(1800);
          break;
        }
        case 'fist': {
          rest();
          await sleep(400);
          await aim('right', T, 50, 0.17, 'fist');
          out.rows = await sample(1800);
          break;
        }
        case 'break': {
          rest();
          await sleep(400);
          await aim('right', T, 50, 0.17, 'point');
          out.before = await sample(600);
          await aim('right', T, 50, 0.17, 'default');
          out.after = await sample(1200);
          break;
        }
        case 'drift': {
          rest();
          await sleep(400);
          await aim('right', T, 50, 0.17, 'point');
          out.before = await sample(750);
          const T2 = world(SPOT[0] + 3.5, 0, SPOT[2]);
          await aim('right', T2, 50, 0.17, 'point');
          out.mid = await sample(750);
          out.late = await sample(1500);
          break;
        }
        case 'pinch': {
          rest();
          await sleep(400);
          await aim('right', T, 50, 0.17, 'point');
          out.before = await sample(500);
          hands.left.position.set(-0.25, 1.4, -0.3);
          hands.left.updatePinchValue(1);
          out.during = await sample(1500);
          hands.left.updatePinchValue(0);
          break;
        }
        default:
          out.error = 'unknown scenario';
      }
      return out;
    },
    { scn, arg },
  );
}
