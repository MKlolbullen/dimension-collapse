/**
 * The single mutable state object. GSAP tweens its numeric fields; the UI
 * writes the `user` rotation angles; the renderer only reads.
 *
 * Geometry model: the object on screen is always an n-cube whose axes have
 * per-axis *extents*. Axes below `dim` have extent 1, axis `dim` (the
 * "frontier" axis currently being built or collapsed) has extent `extent`,
 * axes above have extent 0. A build step tweens `extent` 0 → 1 and then snaps
 * `dim` up; a collapse step snaps `dim` down and tweens `extent` 1 → 0.
 * That makes the discrete nature explicit: between steps you either have the
 * basis vector or you don't.
 */

export const PLANE_KEYS = [
  'xw',
  'yw',
  'zw',
  'xv',
  'yv',
  'zv',
  'wv',
  'xu',
  'yu',
  'zu',
  'wu',
  'vu',
  'xt',
  'yt',
  'zt',
  'wt',
  'vt',
  'ut',
];

/** Axis index per letter. */
export const AXIS_INDEX = { x: 0, y: 1, z: 2, w: 3, v: 4, u: 5, t: 6 };

/** Plane key ("xw") → [i, j]. */
export function planeAxes(key) {
  return [AXIS_INDEX[key[0]], AXIS_INDEX[key[1]]];
}

/** Numeric so GSAP can `set` it in a scrub-safe way. */
export const PHASE = { hold: 0, build: 1, collapse: 2 };

export function createState() {
  const auto = {};
  for (const k of PLANE_KEYS) auto[k] = 0;
  return {
    /** Settled integer dimension, 0..7. */
    dim: 0,
    /** Extent of the frontier axis (index `dim`), 0..1. */
    extent: 0,
    /** PHASE.hold | PHASE.build | PHASE.collapse — only affects colour cross-fades. */
    phase: 0,
    /** Global fade, 0 = black screen. */
    brightness: 0,
    /** Timeline-driven rotation angles per plane (radians). */
    auto,
    /** User-driven rotation angles through w (radians), from drag or sliders. */
    user: { xw: 0, yw: 0, zw: 0 },
    /**
     * Tesseract net: mix 0 = cube wireframe, 1 = net; fold 1 = folded
     * tesseract, 0 = flat cross; scale shrinks the (much wider) flat net to fit.
     */
    net: { mix: 0, fold: 1, scale: 1 },
    /** 'perspective' | 'orthographic' projection for the n→3 step. */
    projection: 'perspective',
    /** Base distance of the n→3 projection "eye" along each dropped axis (grows with dimension). */
    distance: 4,
    /** Master timeline time in seconds (set every frame; used for deterministic effects). */
    time: 0,
    /** Optional caption override written by the timeline. */
    caption: '',
  };
}

/** Number of axes that currently have non-zero extent. */
export function visibleDimension(state) {
  return Math.min(state.dim + (state.extent > 0 ? 1 : 0), 7);
}

/** Per-axis extents, length 7. */
export function axisExtents(state) {
  const e = new Array(7).fill(0);
  for (let k = 0; k < Math.min(state.dim, 7); k++) e[k] = 1;
  if (state.dim < 7) e[state.dim] = state.extent;
  return e;
}
