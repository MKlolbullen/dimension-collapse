/**
 * n-cube geometry: vertices and edges of [-1, 1]^n for n = 0..7 (any n works,
 * but the app never goes past 7).
 *
 * Two equivalent constructions are provided on purpose:
 *
 *  - `ncube(n)`           the direct "bit" construction (vertex i has coordinate k
 *                          equal to +1 when bit k of i is set, -1 otherwise);
 *  - `ncubeRecursive(n)`  the "two copies of the (n-1)-cube plus connecting
 *                          edges" recursion that the animation acts out.
 *
 * Both produce the same vertex order, so the recursion can be unit-tested
 * against the closed form (2^n vertices, n·2^(n-1) edges). See docs/ncube.md.
 */

/** Number of vertices of an n-cube: 2^n. */
export function vertexCount(n) {
  return 2 ** n;
}

/** Number of edges of an n-cube: n·2^(n-1) (0 for n = 0). */
export function edgeCount(n) {
  return n === 0 ? 0 : n * 2 ** (n - 1);
}

/**
 * Vertices of [-1, 1]^n in "binary counting" order.
 * @param {number} n
 * @returns {number[][]} 2^n arrays of length n
 */
export function ncubeVertices(n) {
  const count = vertexCount(n);
  const vertices = new Array(count);
  for (let i = 0; i < count; i++) {
    const v = new Array(n);
    for (let k = 0; k < n; k++) v[k] = (i >> k) & 1 ? 1 : -1;
    vertices[i] = v;
  }
  return vertices;
}

/**
 * Edges of the n-cube as index pairs [a, b] with a < b. Two vertices share an
 * edge iff their indices differ in exactly one bit; the bit position is the axis
 * the edge runs along and is returned in `axis[e]`.
 * @param {number} n
 * @returns {{ edges: number[][], axis: number[] }}
 */
export function ncubeEdges(n) {
  const count = vertexCount(n);
  const edges = [];
  const axis = [];
  for (let a = 0; a < count; a++) {
    for (let k = 0; k < n; k++) {
      if ((a >> k) & 1) continue;
      edges.push([a, a | (1 << k)]);
      axis.push(k);
    }
  }
  return { edges, axis };
}

/**
 * Full n-cube description.
 * @param {number} n
 * @returns {{ n: number, vertices: number[][], edges: number[][], edgeAxis: number[] }}
 */
export function ncube(n) {
  const { edges, axis } = ncubeEdges(n);
  return { n, vertices: ncubeVertices(n), edges, edgeAxis: axis };
}

/**
 * The recursion the animation performs: an n-cube is two copies of the
 * (n-1)-cube, one at x_{n-1} = -1 ("low") and one at x_{n-1} = +1 ("high"),
 * with every low corner connected to its matching high corner.
 *
 * "Corner placement" framing: the new axis is attached at *every* existing
 * corner simultaneously — the same rule at every scale, which is what makes
 * the build-up read as fractal rather than as an extrusion.
 *
 * Vertex indexing matches `ncube(n)`: low copy = indices [0, 2^(n-1)),
 * high copy = low index + 2^(n-1).
 *
 * @param {number} n
 * @returns {{
 *   n: number,
 *   vertices: number[][],
 *   edges: number[][],
 *   edgeAxis: number[],
 *   low: number[],
 *   high: number[],
 *   connecting: number[]
 * }} `connecting` holds the indices (into `edges`) of the new low↔high edges.
 */
export function ncubeRecursive(n) {
  if (n === 0) {
    return { n: 0, vertices: [[]], edges: [], edgeAxis: [], low: [0], high: [], connecting: [] };
  }
  const prev = ncubeRecursive(n - 1);
  const half = prev.vertices.length;

  const vertices = [];
  for (const v of prev.vertices) vertices.push([...v, -1]);
  for (const v of prev.vertices) vertices.push([...v, 1]);

  const edges = [];
  const edgeAxis = [];
  // Edges of the two copies: every edge e of the (n-1)-cube appears twice.
  for (let e = 0; e < prev.edges.length; e++) {
    const [a, b] = prev.edges[e];
    edges.push([a, b]);
    edgeAxis.push(prev.edgeAxis[e]);
  }
  for (let e = 0; e < prev.edges.length; e++) {
    const [a, b] = prev.edges[e];
    edges.push([a + half, b + half]);
    edgeAxis.push(prev.edgeAxis[e]);
  }
  // Connecting edges: each corner of the low copy to the same corner of the high copy.
  const connecting = [];
  for (let i = 0; i < half; i++) {
    connecting.push(edges.length);
    edges.push([i, i + half]);
    edgeAxis.push(n - 1);
  }

  const low = Array.from({ length: half }, (_, i) => i);
  const high = Array.from({ length: half }, (_, i) => i + half);
  return { n, vertices, edges, edgeAxis, low, high, connecting };
}

/**
 * Canonical string key for an undirected edge, used to compare edge sets.
 * @param {number} a
 * @param {number} b
 */
export function edgeKey(a, b) {
  return a < b ? `${a}-${b}` : `${b}-${a}`;
}

/** Axis labels used throughout the UI and docs. */
export const AXIS_NAMES = ['x', 'y', 'z', 'w', 'v', 'u', 't'];

/** The app's hard ceiling: a 7-cube has 128 vertices and 448 edges. */
export const MAX_DIM = 7;
