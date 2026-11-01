/**
 * n-dimensional rotations as plain row-major arrays of arrays (n ≤ 7, so no
 * typed-array heroics). A rotation in n dimensions is not "about an axis" — it
 * is *in a plane*. The elementary building block is the Givens rotation in the
 * coordinate plane spanned by e_i and e_j; every rotation is a product of
 * those. See docs/rotation.md.
 */

/** n×n identity. */
export function identity(n) {
  return Array.from({ length: n }, (_, r) => Array.from({ length: n }, (_, c) => (r === c ? 1 : 0)));
}

/**
 * Givens rotation by `theta` in the (i, j) coordinate plane of R^n.
 * Positive theta rotates e_i towards e_j.
 * @param {number} n
 * @param {number} i
 * @param {number} j
 * @param {number} theta radians
 */
export function givens(n, i, j, theta) {
  if (i === j) throw new Error('A rotation plane needs two distinct axes');
  if (i < 0 || j < 0 || i >= n || j >= n) throw new Error(`Plane (${i},${j}) outside R^${n}`);
  const m = identity(n);
  const c = Math.cos(theta);
  const s = Math.sin(theta);
  m[i][i] = c;
  m[j][j] = c;
  m[i][j] = -s;
  m[j][i] = s;
  return m;
}

/** Matrix product A·B (both n×n). */
export function multiply(a, b) {
  const n = a.length;
  const out = Array.from({ length: n }, () => new Array(n).fill(0));
  for (let r = 0; r < n; r++) {
    for (let k = 0; k < n; k++) {
      const ark = a[r][k];
      if (ark === 0) continue;
      const bk = b[k];
      const outR = out[r];
      for (let c = 0; c < n; c++) outR[c] += ark * bk[c];
    }
  }
  return out;
}

/** Transpose (which, for a rotation, is also the inverse). */
export function transpose(m) {
  const n = m.length;
  return Array.from({ length: n }, (_, r) => Array.from({ length: n }, (_, c) => m[c][r]));
}

/**
 * Apply an n×n matrix to a vector. The vector may be shorter than n (it is
 * treated as zero-padded) — handy for rotating a 3-cube inside R^7.
 * @param {number[][]} m
 * @param {number[]} v
 * @returns {number[]} length n
 */
export function applyMatrix(m, v) {
  const n = m.length;
  const out = new Array(n).fill(0);
  for (let r = 0; r < n; r++) {
    const row = m[r];
    let acc = 0;
    for (let c = 0; c < v.length; c++) acc += row[c] * v[c];
    out[r] = acc;
  }
  return out;
}

/**
 * Compose Givens rotations for a list of planes, applied in array order
 * (the first plane is applied to the vector first).
 * @param {number} n
 * @param {{ i: number, j: number, angle: number }[]} planes
 */
export function rotationFromPlanes(n, planes) {
  let m = identity(n);
  for (const { i, j, angle } of planes) {
    if (!angle) continue;
    m = multiply(givens(n, i, j, angle), m);
  }
  return m;
}

/** Determinant via Gaussian elimination (used by tests: a rotation has det +1). */
export function determinant(matrix) {
  const n = matrix.length;
  const m = matrix.map((row) => row.slice());
  let det = 1;
  for (let col = 0; col < n; col++) {
    let pivot = col;
    for (let r = col + 1; r < n; r++) {
      if (Math.abs(m[r][col]) > Math.abs(m[pivot][col])) pivot = r;
    }
    if (Math.abs(m[pivot][col]) < 1e-12) return 0;
    if (pivot !== col) {
      [m[pivot], m[col]] = [m[col], m[pivot]];
      det = -det;
    }
    det *= m[col][col];
    for (let r = col + 1; r < n; r++) {
      const f = m[r][col] / m[col][col];
      for (let c = col; c < n; c++) m[r][c] -= f * m[col][c];
    }
  }
  return det;
}

/** True if Mᵀ·M ≈ I within `eps`. */
export function isOrthonormal(m, eps = 1e-9) {
  const n = m.length;
  const p = multiply(transpose(m), m);
  for (let r = 0; r < n; r++) {
    for (let c = 0; c < n; c++) {
      if (Math.abs(p[r][c] - (r === c ? 1 : 0)) > eps) return false;
    }
  }
  return true;
}

/**
 * All coordinate planes (i < j) of R^n — 21 of them for n = 7.
 * @param {number} n
 */
export function coordinatePlanes(n) {
  const planes = [];
  for (let i = 0; i < n; i++) for (let j = i + 1; j < n; j++) planes.push([i, j]);
  return planes;
}
