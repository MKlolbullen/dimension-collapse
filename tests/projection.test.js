import { describe, it, expect } from 'vitest';
import {
  projectPerspective,
  projectOrthographic,
  projectTo3,
  perspectiveFactor,
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
    expect(near.every((c) => close(c, perspectiveFactor(1, d)))).toBe(true);
    expect(far.every((c) => close(c, perspectiveFactor(-1, d)))).toBe(true);
    expect(near[0]).toBeGreaterThan(far[0]);
    expect(close(perspectiveFactor(1, 3), 1.5)).toBe(true);
    expect(close(perspectiveFactor(-1, 3), 0.75)).toBe(true);
  });

  it('perspective applies one division per dropped dimension', () => {
    const d = 3;
    const p = projectPerspective([1, 1, 1, 1, 1], { distance: d });
    const expected = perspectiveFactor(1, d) * perspectiveFactor(perspectiveFactor(1, d), d);
    // After dropping v (axis 4), w (axis 3) has been scaled by f(1); the second
    // division then uses the *scaled* w.
    expect(p.every((c) => close(c, expected))).toBe(true);
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
