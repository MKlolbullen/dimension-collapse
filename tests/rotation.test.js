import { describe, it, expect } from 'vitest';
import {
  identity,
  givens,
  multiply,
  transpose,
  applyMatrix,
  rotationFromPlanes,
  determinant,
  isOrthonormal,
  coordinatePlanes,
} from '../src/geometry/rotation.js';

const close = (a, b, eps = 1e-9) => Math.abs(a - b) < eps;

describe('Givens rotations', () => {
  it('are orthonormal with determinant +1 in every coordinate plane of R^7', () => {
    for (const [i, j] of coordinatePlanes(7)) {
      const m = givens(7, i, j, 0.7);
      expect(isOrthonormal(m)).toBe(true);
      expect(close(determinant(m), 1)).toBe(true);
    }
  });

  it('rotate e_i towards e_j by theta and leave the other axes alone', () => {
    const m = givens(4, 0, 3, Math.PI / 2); // xw plane
    const ex = applyMatrix(m, [1, 0, 0, 0]);
    const ew = applyMatrix(m, [0, 0, 0, 1]);
    const ey = applyMatrix(m, [0, 1, 0, 0]);
    expect(ex.map((c) => Math.round(c * 1e9) / 1e9)).toEqual([0, 0, 0, 1]);
    expect(ew.map((c) => Math.round(c * 1e9) / 1e9)).toEqual([-1, 0, 0, 0]);
    expect(ey).toEqual([0, 1, 0, 0]);
  });

  it('compose: R(a)·R(b) = R(a+b) in the same plane; transpose inverts', () => {
    const a = givens(5, 1, 4, 0.3);
    const b = givens(5, 1, 4, 0.9);
    const ab = multiply(a, b);
    const sum = givens(5, 1, 4, 1.2);
    for (let r = 0; r < 5; r++)
      for (let c = 0; c < 5; c++) expect(close(ab[r][c], sum[r][c])).toBe(true);

    const inv = multiply(transpose(a), a);
    const id = identity(5);
    for (let r = 0; r < 5; r++)
      for (let c = 0; c < 5; c++) expect(close(inv[r][c], id[r][c])).toBe(true);
  });

  it('a composite of several plane rotations is still orthonormal (preserves lengths)', () => {
    const m = rotationFromPlanes(7, [
      { i: 0, j: 3, angle: 0.4 },
      { i: 1, j: 3, angle: -1.1 },
      { i: 2, j: 3, angle: 2.0 },
      { i: 1, j: 4, angle: 0.25 },
      { i: 3, j: 6, angle: 0.9 },
    ]);
    expect(isOrthonormal(m)).toBe(true);
    expect(close(determinant(m), 1)).toBe(true);
    const v = [1, -1, 1, 1, -1, 1, -1];
    const rv = applyMatrix(m, v);
    const len = (x) => Math.hypot(...x);
    expect(close(len(rv), len(v))).toBe(true);
  });

  it('rotating a 3-cube corner inside R^7 zero-pads the vector', () => {
    const m = rotationFromPlanes(7, [{ i: 0, j: 3, angle: Math.PI / 2 }]);
    const out = applyMatrix(m, [1, 1, 1]);
    expect(out).toHaveLength(7);
    expect(close(out[0], 0)).toBe(true);
    expect(close(out[3], 1)).toBe(true);
  });

  it('rejects degenerate planes', () => {
    expect(() => givens(4, 2, 2, 1)).toThrow();
    expect(() => givens(4, 0, 4, 1)).toThrow();
  });
});
