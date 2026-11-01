import { describe, it, expect } from 'vitest';
import {
  projectPerspective,
  projectOrthographic,
  projectTo3,
  perspectiveFactor,
  axisDistance,
} from '../src/geometry/projection.js';
import { ncube } from '../src/geometry/ncube.js';

const close = (a, b, eps = 1e-9) => Math.abs(a - b) < eps;

describe('projection n → 3', () => {
  it('leaves 3D (and lower) points alone, zero-padding to length 3', () => {
    expect(projectPerspective([1, -1, 0.5])).toEqual([1, -1, 0.5]);
    expect(projectPerspective([1])).toEqual([1, 0, 0]);
    expect(projectPerspective([])).toEqual([0, 0, 0]);
    expect(projectOrthographic([2])).toEqual([2, 0, 0]);
  });

  it('orthographic simply drops the extra coordinates', () => {
    expect(projectOrthographic([1, 2, 3, 4, 5, 6, 7])).toEqual([1, 2, 3]);
  });

  it('perspective: the +w half of a tesseract projects larger than the -w half', () => {
    const d = 3;
    const near = projectPerspective([1, 1, 1, 1], { distance: d });
    const far = projectPerspective([1, 1, 1, -1], { distance: d });
    // (a single extra axis uses exactly `distance`; spread only affects axes beyond w)
    expect(near.every((c) => close(c, perspectiveFactor(1, d)))).toBe(true);
    expect(far.every((c) => close(c, perspectiveFactor(-1, d)))).toBe(true);
    expect(near[0]).toBeGreaterThan(far[0]);
    expect(close(perspectiveFactor(1, 3), 1.5)).toBe(true);
    expect(close(perspectiveFactor(-1, 3), 0.75)).toBe(true);
  });

  it('perspective applies one factor per dropped dimension, from the original coordinates', () => {
    const d = 3;
    const p = projectPerspective([1, 1, 1, 1, -1], { distance: d, spread: 0 });
    const expected = perspectiveFactor(1, d) * perspectiveFactor(-1, d);
    expect(p.every((c) => close(c, expected))).toBe(true);
    // Equivalent to a chain of divisions whose eye distance is rescaled by the
    // accumulated factor: after dropping v the eye for w sits at d·f(-1).
    const f1 = perspectiveFactor(-1, d);
    const chained = f1 * ((d * f1) / (d * f1 - f1 * 1));
    expect(close(chained, expected)).toBe(true);
  });

  it('each extra axis has its own eye distance: d_k = d + spread·(k − 3)', () => {
    expect(axisDistance(3, 4, 0.5)).toBe(4);
    expect(axisDistance(6, 4, 0.5)).toBe(5.5);
    const p = projectPerspective([1, 1, 1, 1, -1], { distance: 4, spread: 0.5 });
    const expected = perspectiveFactor(1, 4) * perspectiveFactor(-1, 4.5);
    expect(p.every((c) => close(c, expected))).toBe(true);
  });

  it('distinct per-axis distances keep all 2^n vertex projections distinct', () => {
    for (let n = 4; n <= 7; n++) {
      const keys = new Set(
        ncube(n).vertices.map((v) =>
          projectPerspective(v)
            .map((c) => c.toFixed(6))
            .join(',')
        )
      );
      expect(keys.size, `n = ${n}`).toBe(2 ** n);
    }
    // …whereas a shared distance collapses them (the degeneracy the spread avoids).
    const shared = new Set(
      ncube(7).vertices.map((v) =>
        projectPerspective(v, { spread: 0 })
          .map((c) => c.toFixed(6))
          .join(',')
      )
    );
    expect(shared.size).toBe(40);
  });

  it('stays finite for every corner of a rotated 7-cube (|x_k| < d)', () => {
    // Worst case: a corner rotated so one coordinate carries the whole norm √7.
    const v = [0, 0, 0, Math.sqrt(7), 0, 0, 0];
    const p = projectPerspective(v, { distance: 4 });
    for (const c of p) expect(Number.isFinite(c)).toBe(true);
  });

  it('a point on the w = 0 slice is unchanged by the 4 → 3 division', () => {
    expect(projectPerspective([0.3, -0.2, 0.9, 0])).toEqual([0.3, -0.2, 0.9]);
  });

  it('projects every vertex of the 7-cube to a finite 3-vector', () => {
    for (const v of ncube(7).vertices) {
      const p = projectTo3(v);
      expect(p).toHaveLength(3);
      for (const c of p) expect(Number.isFinite(c)).toBe(true);
    }
  });

  it('dispatcher honours the mode', () => {
    expect(projectTo3([1, 1, 1, 1], { mode: 'orthographic' })).toEqual([1, 1, 1]);
    expect(projectTo3([1, 1, 1, 1], { mode: 'perspective' })[0]).toBeGreaterThan(1);
  });
});
