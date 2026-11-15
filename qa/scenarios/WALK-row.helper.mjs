// Real end-to-end row in IWER (run it AFTER a viewpoint marker was pinched: walking starts there): a custom 'fist' hand pose is registered in the emulator and both hands are moved from page JS.
export default async function run({ frame }) {
  return await frame.evaluate(async () => {
    const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
    const D = window.IWER_DEVICE;
    const W = window.__sogliaWalk;
    const hands = { left: D.hands.left, right: D.hands.right };
    // Register a fist pose: finger joints (all but the metacarpals) pulled towards the wrist.
    const FINGERS = ['index', 'middle', 'ring', 'pinky'];
    for (const h of Object.values(hands)) {
      for (const s of Object.getOwnPropertySymbols(h)) {
        const v = h[s];
        if (v && v.poses && !v.poses.fist) {
          const def = v.poses.default;
          const fist = { jointTransforms: {}, gripOffsetMatrix: def.gripOffsetMatrix };
          const w = def.jointTransforms['wrist'].offsetMatrix;
          for (const [name, j] of Object.entries(def.jointTransforms)) {
            const m = new Float32Array(j.offsetMatrix);
            if (FINGERS.some((f) => name.startsWith(f)) && !name.includes('metacarpal')) {
              for (const k of [12, 13, 14]) m[k] = w[k] + (m[k] - w[k]) * 0.47;
            }
            fist.jointTransforms[name] = { offsetMatrix: m, radius: j.radius };
          }
          v.poses.fist = fist;
        }
      }
    }
    const out = { log: [] };
    const HY = D.position.y; out.headY = HY; out.headZ = D.position.z;
    const CY = HY - 0.35;
    const set = (side, x, y, z, pose) => { hands[side].position.set(x, y, z); if (pose) hands[side].poseId = pose; };
    const status = () => { const s = W.status(); return { speed: +s.speed.toFixed(3), z: s.z, x: s.x, vig: +s.vignette.toFixed(3), l: s.left, r: s.right, hl: s.hands[0], hr: s.hands[1] }; };
    // a stroke: both (or one) hands go back dz in dur ms (50 ms steps); then return slowly
    const stroke = async (z0, dz, dur, sides = ['left', 'right'], poses = {}, x = 0.15) => {
      const n = Math.round(dur / 50); let peak = 0;
      for (let i = 0; i <= n; i += 1) {
        const z = z0 + dz * (i / n);
        for (const s of ['left', 'right']) if (sides.includes(s)) set(s, s === 'left' ? -x : x, CY, z, poses[s]);
        await sleep(50);
        peak = Math.max(peak, W.status().speed);
      }
      return peak;
    };
    const Z = -0.717;
    // 0 walking is on as soon as a viewpoint is entered: pinch a blue marker (WALK-row.md, step 1) before running this helper
    out.entered = W.status().walking;
    out.afterEnter = status();
    // A open hands (emulator default pose): hold + stroke = no walk
    for (const s of ['left', 'right']) set(s, s === 'left' ? -0.15 : 0.15, CY, Z, 'default');
    await sleep(500);
    out.openHold = status();
    out.openPeak = await stroke(Z, 0.3, 500);
    out.openAfter = status();
    // B fists, hold
    for (const s of ['left', 'right']) set(s, s === 'left' ? -0.15 : 0.15, CY, Z, 'fist');
    await sleep(600);
    out.fistHold = status();
    // B2 three rowing strokes with both fists
    const z0 = status().z;
    const peaks = [];
    for (let i = 0; i < 3; i += 1) {
      peaks.push(await stroke(Z, 0.3, 500)); // back
      for (const s of ['left', 'right']) set(s, s === 'left' ? -0.15 : 0.15, CY, Z, 'fist'); // return fast (forward strokes add nothing)
      await sleep(150);
    }
    out.rowPeaks = peaks;
    out.rowAfter = status();
    out.rowMovedZ = +(out.rowAfter.z - z0).toFixed(3);
    await sleep(2500);
    out.settled = status();
    // C one fist alone
    for (const s of ['left', 'right']) set(s, s === 'left' ? -0.15 : 0.15, CY, Z, 'fist');
    await sleep(500);
    out.onePeak = await stroke(Z, 0.3, 500, ['right']);
    out.oneAfter = status();
    // D hands in the lap (y 0.35, 0.85 below the eyes): zone
    for (const s of ['left', 'right']) set(s, s === 'left' ? -0.15 : 0.15, HY - 0.9, Z, 'fist');
    await sleep(500);
    out.lap = status();
    // E raised fists (y 1.15)
    for (const s of ['left', 'right']) set(s, s === 'left' ? -0.15 : 0.15, HY - 0.05, Z, 'fist');
    await sleep(500);
    out.raised = status();
    // F sideways sweep with fists
    for (const s of ['left', 'right']) set(s, s === 'left' ? -0.15 : 0.15, CY, Z, 'fist');
    await sleep(600);
    let sidePeak = 0;
    for (let i = 0; i <= 10; i += 1) { for (const s of ['left', 'right']) set(s, (s === 'left' ? -0.15 : 0.15) + 0.04 * i, CY, Z, 'fist'); await sleep(50); sidePeak = Math.max(sidePeak, W.status().speed); }
    out.sidePeak = sidePeak;
    // G pinch with fists (select value) then stroke
    for (const s of ['left', 'right']) set(s, s === 'left' ? -0.15 : 0.15, CY, Z, 'fist');
    await sleep(600);
    for (const s of ['left', 'right']) hands[s].updatePinchValue(1);
    await sleep(200);
    out.pinchState = status();
    out.pinchPeak = await stroke(Z, 0.3, 500);
    for (const s of ['left', 'right']) hands[s].updatePinchValue(0);
    await sleep(100);
    out.afterRelease = status();
    await sleep(600);
    out.afterLockout = status();
    return out;
  });
}
