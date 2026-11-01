/**
 * Pure per-frame geometry: state → projected 3D positions plus the scalar
 * parameters the renderer turns into colour. No Three.js in here so it can be
 * unit-tested and reused by the prototype.
 */

import { ncube } from '../geometry/ncube.js';
import { rotationFromPlanes } from '../geometry/rotation.js';
import { applyMatrix } from '../geometry/rotation.js';
import { projectTo3 } from '../geometry/projection.js';
import { tesseractNet } from '../geometry/net.js';
import { axisExtents, visibleDimension, PLANE_KEYS, PHASE, planeAxes } from '../state.js';

const CUBES = Array.from({ length: 8 }, (_, n) => ncube(n));

const W = 3;
const V = 4;

/** How far along the step (0..1) the hue cross-fades to the new frontier axis during a build. */
const HUE_BLEND_END = 0.35;

function smoothstep(a, b, x) {
  const t = Math.min(1, Math.max(0, (x - a) / (b - a)));
  return t * t * (3 - 2 * t);
}

/** Continuous "how many dimensions exist" value: dim + extent. */
export function effectiveDimension(state) {
  return Math.min(7, state.dim + state.extent);
}

/** Projection options for the n→3 step (per-axis eye distances, see projection.js). */
export function projectionOptions(state) {
  return { mode: state.projection, distance: state.distance, spread: state.spread };
}

/** Uniform scene scale per effective dimension, so higher cubes fit the frame. */
const SCALE_TABLE = [1, 1, 1, 1, 0.74, 0.58, 0.47, 0.4];
export function sceneScale(state) {
  const e = effectiveDimension(state);
  const i = Math.min(6, Math.floor(e));
  const t = e - i;
  return SCALE_TABLE[i] * (1 - t) + SCALE_TABLE[i + 1] * t;
}

/**
 * Full 7×7 rotation for the current state: user planes (xw, yw, zw) first,
 * then the timeline's automatic planes.
 */
export function buildRotation(state) {
  const planes = [];
  for (const key of ['xw', 'yw', 'zw']) {
    const [i, j] = planeAxes(key);
    planes.push({ i, j, angle: state.user[key] || 0 });
  }
  for (const key of PLANE_KEYS) {
    const angle = state.auto[key];
    if (!angle) continue;
    const [i, j] = planeAxes(key);
    planes.push({ i, j, angle });
  }
  return rotationFromPlanes(7, planes);
}

/**
 * Axis whose coordinate drives the hue. Below 4D it is the frontier axis
 * (the one being built/collapsed) so the collapse "drains" the colour; from
 * 4D on it is always w.
 */
export function hueAxis(state) {
  const frontier = state.extent > 0 ? state.dim : state.dim - 1;
  if (frontier < 0) return -1;
  return Math.min(frontier, W);
}

/**
 * The polytope frame.
 * @returns {{
 *   m: number,
 *   positions: number[][],
 *   hueT: number[],
 *   bright: number[],
 *   edges: number[][],
 *   edgeAxis: number[],
 *   frontierAxis: number,
 *   highlight: number
 * }}
 */
export function polytopeFrame(state, rotation = buildRotation(state)) {
  const m = visibleDimension(state);
  const cube = CUBES[m];
  const ext = axisExtents(state);
  const hAxis = hueAxis(state);
  const prevAxis = Math.min(state.dim - 1, W);
  const blend =
    state.phase === PHASE.build && state.extent > 0 && state.extent < 1 && hAxis !== prevAxis
      ? smoothstep(0, HUE_BLEND_END, state.extent)
      : 1;

  const positions = new Array(cube.vertices.length);
  const hueT = new Array(cube.vertices.length);
  const bright = new Array(cube.vertices.length);
  const scaled = new Array(m);
  const projection = projectionOptions(state);

  for (let i = 0; i < cube.vertices.length; i++) {
    const v = cube.vertices[i];
    for (let k = 0; k < m; k++) scaled[k] = v[k] * ext[k];

    const tNew = hAxis >= 0 && hAxis < m ? scaled[hAxis] : 0;
    const tPrev = prevAxis >= 0 && prevAxis < m ? scaled[prevAxis] : 0;
    hueT[i] = blend * tNew + (1 - blend) * tPrev;

    // Axis v (index 4) is encoded as brightness: the +v half stays bright, the
    // -v half fades, proportional to how much of v exists yet.
    bright[i] = m > V ? 1 - 0.35 * (ext[V] - scaled[V]) : 1;

    const rotated = applyMatrix(rotation, scaled);
    positions[i] = projectTo3(rotated, projection);
  }

  const frontierAxis = state.extent > 0 && state.extent < 1 ? state.dim : -1;
  const highlight = frontierAxis >= 0 ? Math.sin(Math.PI * state.extent) : 0;

  return {
    m,
    positions,
    hueT,
    bright,
    edges: cube.edges,
    edgeAxis: cube.edgeAxis,
    frontierAxis,
    highlight,
  };
}

/**
 * The tesseract-net frame (only meaningful while state.net.mix > 0).
 */
export function netFrame(state, rotation = buildRotation(state)) {
  const net = tesseractNet(state.net.fold);
  const positions = new Array(net.vertices.length);
  const hueT = new Array(net.vertices.length);
  const projection = projectionOptions(state);
  for (let i = 0; i < net.vertices.length; i++) {
    const v = net.vertices[i];
    hueT[i] = v[W];
    const rotated = applyMatrix(rotation, v);
    positions[i] = projectTo3(rotated, projection);
  }
  return { positions, hueT, edges: net.edges, cellOf: net.cellOf, cells: net.cells };
}
