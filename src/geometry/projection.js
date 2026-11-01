/**
 * Projection from R^n down to R^3 (the space Three.js can draw).
 *
 * Perspective: for every extra axis k = 3, 4, …, n-1 place an "eye" at
 * distance d_k along +e_k and scale the remaining coordinates by
 * d_k / (d_k - x_k). Points far along +e_k grow, points far along -e_k
 * shrink — the familiar "small cube inside a big cube" look of a tesseract,
 * one factor per dimension removed:
 *
 *     p' = ( Π_k d_k / (d_k - x_k) ) · (x_0, x_1, x_2),      d_k = d + s·(k - 3).
 *
 * The factors are computed from the *original* coordinates. This is exactly
 * the chain of one-at-a-time perspective divisions in which the eye distance
 * is rescaled by the accumulated factor at every step, and it stays finite as
 * long as |x_k| < d_k for every axis — which a rotated 7-cube (corner norm
 * √7 ≈ 2.65) satisfies for d ≥ 3.
 *
 * Each axis gets its *own* distance (the `spread` s). With a single shared
 * distance the product would depend only on how many extra coordinates are
 * +1, and e.g. the 128 vertices of a 7-cube would land on just 40 distinct
 * points. Distinct distances keep all 2^n projections distinct.
 *
 * Orthographic: simply drop the extra coordinates (the shadow of the object
 * under parallel light along the extra axes).
 *
 * See docs/projection.md.
 */

export const DEFAULT_PROJECTION_DISTANCE = 4;
export const DEFAULT_PROJECTION_SPREAD = 0.5;

/** Eye distance for extra axis `k` (k ≥ 3). */
export function axisDistance(
  k,
  distance = DEFAULT_PROJECTION_DISTANCE,
  spread = DEFAULT_PROJECTION_SPREAD
) {
  return distance + spread * (k - 3);
}

/**
 * Perspective-project `v` down to `targetDim` coordinates, one factor per
 * dropped axis. Vectors shorter than `targetDim` are zero-padded.
 * @param {number[]} v
 * @param {{ targetDim?: number, distance?: number, spread?: number }} [options]
 * @returns {number[]}
 */
export function projectPerspective(
  v,
  { targetDim = 3, distance = DEFAULT_PROJECTION_DISTANCE, spread = DEFAULT_PROJECTION_SPREAD } = {}
) {
  let f = 1;
  for (let k = v.length - 1; k >= targetDim; k--) {
    f *= perspectiveFactor(v[k], axisDistance(k, distance, spread));
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
 * @param {{ mode?: 'perspective' | 'orthographic', distance?: number, spread?: number, targetDim?: number }} [options]
 */
export function projectTo3(v, { mode = 'perspective', distance, spread, targetDim = 3 } = {}) {
  return mode === 'orthographic'
    ? projectOrthographic(v, { targetDim })
    : projectPerspective(v, { targetDim, distance, spread });
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
