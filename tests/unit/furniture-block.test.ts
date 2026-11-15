import { describe, expect, it } from 'vitest';
import { blockGeometry } from '../../src/ui/furniture-visuals';

describe('blockGeometry (piece without a model)', () => {
  it('has exactly the size asked for, the dark front strip included (it used to add 1 cm of depth)', () => {
    for (const [w, d, h] of [[1.6, 2, 0.95], [0.7, 1.1, 0.95], [2, 1.4, 0.01], [0.05, 0.05, 0.01]] as const) {
      const geometry = blockGeometry(w, d, h);
      geometry.computeBoundingBox();
      const box = geometry.boundingBox!;
      expect(box.max.x - box.min.x).toBeCloseTo(w, 6);
      expect(box.max.z - box.min.z).toBeCloseTo(d, 6);
      expect(box.max.y - box.min.y).toBeCloseTo(h, 6);
      expect(box.min.y).toBeCloseTo(0, 6); // on the floor
      expect(box.min.z + box.max.z).toBeCloseTo(0, 6); // centred on the footprint
      geometry.dispose();
    }
  });
});
