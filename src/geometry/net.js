/**
 * The tesseract net: eight cubes laid flat in a 3-dimensional hyperplane
 * (the cross / "Dalí" net), plus the fold that stands them back up into the
 * tesseract [-1, 1]^4.
 *
 * Every cube is a cell x_k = ±1 of the tesseract. The net lives in the
 * hyperplane w = -1 and is built from the "central" cell (w = -1) with the six
 * cells x = ±1, y = ±1, z = ±1 attached to its six faces, and the eighth cell
 * (w = +1) hanging off the far face of the -y cell.
 *
 * Folding a cube back into place is a rotation in the plane spanned by the
 * cube's outward direction `dir` and the w axis, about the shared face
 * (the "hinge"). A cube attached to another cube inherits that cube's fold —
 * the eighth cube folds twice. `fold = 0` is the flat net, `fold = 1` is the
 * tesseract. See docs/net.md.
 */

import { ncube } from './ncube.js';

const W = 3;
const CUBE = ncube(3);

/**
 * Cube-cell descriptors. `center` is the cell centre in the flat net (3D, in
 * the hyperplane w = -1); `folds` are applied in order, innermost first.
 * `facet` is the tesseract facet ([axis, sign]) the cell becomes when folded.
 */
export function tesseractNetCells() {
  const unit = (axis, sign) => {
    const d = [0, 0, 0, 0];
    d[axis] = sign;
    return d;
  };
  const cells = [{ id: 'core', label: 'w = −1', facet: [3, -1], center: [0, 0, 0], folds: [] }];
  const sideLabels = [
    ['x = +1', 0, 1],
    ['x = −1', 0, -1],
    ['y = +1', 1, 1],
    ['y = −1', 1, -1],
    ['z = +1', 2, 1],
    ['z = −1', 2, -1],
  ];
  for (const [label, axis, sign] of sideLabels) {
    const center = [0, 0, 0];
    center[axis] = 2 * sign;
    const hinge = [0, 0, 0, -1];
    hinge[axis] = sign;
    cells.push({
      id: `${'xyz'[axis]}${sign > 0 ? '+' : '-'}`,
      label,
      facet: [axis, sign],
      center,
      folds: [{ hinge, dir: unit(axis, sign) }],
    });
  }
  // Eighth cube: the w = +1 cell, hanging off the -y cell.
  cells.push({
    id: 'w+',
    label: 'w = +1',
    facet: [3, 1],
    center: [0, -4, 0],
    folds: [
      { hinge: [0, -3, 0, -1], dir: unit(1, -1) },
      { hinge: [0, -1, 0, -1], dir: unit(1, -1) },
    ],
  });
  return cells;
}

/**
 * Rotate point `p` (4D) about `hinge` in the plane spanned by `dir` and e_w by
 * angle `theta`. Positive theta carries +dir towards +w.
 */
export function foldPoint(p, hinge, dir, theta) {
  const rel = [p[0] - hinge[0], p[1] - hinge[1], p[2] - hinge[2], p[3] - hinge[3]];
  let a = 0;
  for (let k = 0; k < 4; k++) a += rel[k] * dir[k];
  const b = rel[W];
  const c = Math.cos(theta);
  const s = Math.sin(theta);
  const a2 = a * c - b * s;
  const b2 = a * s + b * c;
  const out = new Array(4);
  for (let k = 0; k < 4; k++) {
    out[k] = hinge[k] + rel[k] - a * dir[k] + a2 * dir[k];
  }
  out[W] += -b + b2;
  return out;
}

/**
 * The eight vertices (4D) of one cell at a given fold amount.
 * @param {ReturnType<typeof tesseractNetCells>[number]} cell
 * @param {number} fold 0 = flat net, 1 = tesseract
 */
export function netCellVertices(cell, fold) {
  const theta = (fold * Math.PI) / 2;
  return CUBE.vertices.map((c) => {
    let p = [cell.center[0] + c[0], cell.center[1] + c[1], cell.center[2] + c[2], -1];
    for (const { hinge, dir } of cell.folds) p = foldPoint(p, hinge, dir, theta);
    return p;
  });
}

/**
 * All 64 vertices and 96 edges of the net (each cube keeps its own copy of
 * shared vertices so the cubes can separate while folding).
 * @param {number} fold 0 = flat, 1 = folded
 * @returns {{ vertices: number[][], edges: number[][], cellOf: number[], cells: object[] }}
 */
export function tesseractNet(fold) {
  const cells = tesseractNetCells();
  const vertices = [];
  const edges = [];
  const cellOf = [];
  cells.forEach((cell, ci) => {
    const base = vertices.length;
    for (const v of netCellVertices(cell, fold)) {
      vertices.push(v);
      cellOf.push(ci);
    }
    for (const [a, b] of CUBE.edges) edges.push([base + a, base + b]);
  });
  return { vertices, edges, cellOf, cells };
}

export const NET_CELL_COUNT = 8;
export const NET_VERTEX_COUNT = 64;
export const NET_EDGE_COUNT = 96;
