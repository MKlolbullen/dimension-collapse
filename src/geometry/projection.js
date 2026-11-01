/**
 * Projection from R^n down to R^3 (the space Three.js can draw).
 *
 * Perspective: for every extra axis k = 3, 4, …, n-1 place an "eye" at
 * distance d along +e_k and divide the remaining coordinates by (d - x_k)/d.
 * Points far along +e_k grow, points far along -e_k shrink — the familiar
 * "small cube inside a big cube" look of a tesseract, one factor per
 * dimension removed.
 *
 * The factors are computed from the *original* coordinates, i.e.
 *
 *     p' = ( Π_k d / (d - x_k) ) · (x_0, x_1, x_2).
 *
 * This is exactly the chain of one-at-a-time perspective divisions in which
 * the eye distance is rescaled by the accumulated factor at every step
 * (eye_k = d · Π_{j>k} f_j). Compared with a fixed-distance chain it has one
 * practical advantage: it stays finite as long as |x_k| < d for every axis,
 * which a rotated 7-cube (corner norm √7 ≈ 2.65) satisfies for d ≥ 3.
 *
 * Orthographic: simply drop the extra coordinates (the shadow of the object
 * under parallel light along the extra axes).
 *
 * See docs/projection.md.
 */

export const DEFAULT_PROJECTION_DISTANCE = 4;

/**
 * Perspective-project `v` down to `targetDim` coordinates, one factor per
 * dropped axis. Vectors shorter than `targetDim` are zero-padded.
 * @param {number[]} v
 * @param {{ targetDim?: number, distance?: number }} [options]
 * @returns {number[]}
 */
export function projectPerspective(
  v,
  { targetDim = 3, distance = DEFAULT_PROJECTION_DISTANCE } = {}
) {
  let f = 1;
  for (let k = v.length - 1; k >= targetDim; k--) {
    f *= perspectiveFactor(v[k], distance);
  }
  const out = new Array(targetDim);
  for (let c = 0; c < targetDim; c++) out[c] = c < v.length ? v[c] * f : 0;
  return out;
}

/**
 * Orthographic projection: keep the first `targetDim` coordinates.
 * @param {number[]} v
 * @param {{ targetDim?: number }} [options]
 */
export function projectOrthographic(v, { targetDim = 3 } = {}) {
  const out = new Array(targetDim);
  for (let c = 0; c < targetDim; c++) out[c] = c < v.length ? v[c] : 0;
  return out;
}

/**
 * Convenience dispatcher used by the renderer.
 * @param {number[]} v
 * @param {{ mode?: 'perspective' | 'orthographic', distance?: number, targetDim?: number }} [options]
 */
export function projectTo3(v, { mode = 'perspective', distance, targetDim = 3 } = {}) {
  return mode === 'orthographic'
    ? projectOrthographic(v, { targetDim })
    : projectPerspective(v, { targetDim, distance });
}

/**
 * The scale factor a point with extra coordinate x_k receives from one
 * perspective division. Clamped so a point sitting on the eye cannot
 * produce Infinity.
 */
export function perspectiveFactor(xk, distance = DEFAULT_PROJECTION_DISTANCE) {
  const denom = distance - xk;
  return distance / (Math.abs(denom) < 1e-6 ? 1e-6 : denom);
}
