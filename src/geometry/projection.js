/**
 * Projection from R^n down to R^3 (the space Three.js can draw).
 *
 * Perspective: for every extra axis k = n-1, n-2, …, 3 in turn, place a
 * "camera" at distance d along +e_k and divide the remaining coordinates by
 * (d - x_k)/d. Points far along +e_k grow, points far along -e_k shrink — this
 * is the familiar "small cube inside a big cube" look of a tesseract, one
 * division per dimension removed.
 *
 * Orthographic: simply drop the extra coordinates (the shadow of the object
 * under parallel light along the extra axes).
 *
 * See docs/projection.md.
 */

export const DEFAULT_PROJECTION_DISTANCE = 3;

/**
 * Perspective-project `v` down to `targetDim` coordinates, one division per
 * dropped axis. Vectors shorter than `targetDim` are zero-padded.
 * @param {number[]} v
 * @param {{ targetDim?: number, distance?: number }} [options]
 * @returns {number[]}
 */
export function projectPerspective(v, { targetDim = 3, distance = DEFAULT_PROJECTION_DISTANCE } = {}) {
  const out = v.slice();
  for (let k = out.length - 1; k >= targetDim; k--) {
    const denom = distance - out[k];
    // Points at or behind the projection "eye" would blow up; clamp defensively.
    const f = distance / (Math.abs(denom) < 1e-6 ? 1e-6 : denom);
    for (let c = 0; c < k; c++) out[c] *= f;
    out.length = k;
  }
  while (out.length < targetDim) out.push(0);
  return out;
}

/**
 * Orthographic projection: keep the first `targetDim` coordinates.
 * @param {number[]} v
 * @param {{ targetDim?: number }} [options]
 */
export function projectOrthographic(v, { targetDim = 3 } = {}) {
  const out = v.slice(0, targetDim);
  while (out.length < targetDim) out.push(0);
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
 * perspective division — exposed so the UI/doc examples can quote it.
 */
export function perspectiveFactor(xk, distance = DEFAULT_PROJECTION_DISTANCE) {
  return distance / (distance - xk);
}
