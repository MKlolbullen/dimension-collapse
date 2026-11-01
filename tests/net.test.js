import { describe, it, expect } from 'vitest';
import {
  tesseractNet,
  tesseractNetCells,
  netCellVertices,
  foldPoint,
  NET_CELL_COUNT,
  NET_VERTEX_COUNT,
  NET_EDGE_COUNT,
} from '../src/geometry/net.js';
import { ncube, edgeKey } from '../src/geometry/ncube.js';

const round = (x) => Math.round(x * 1e6) / 1e6;
const key = (v) => v.map(round).join(',');

describe('tesseract net', () => {
  it('has 8 cubes, 64 vertices (8 per cube) and 96 edges (12 per cube)', () => {
    const cells = tesseractNetCells();
    expect(cells).toHaveLength(NET_CELL_COUNT);
    expect(cells).toHaveLength(8);
    const net = tesseractNet(0);
    expect(net.vertices).toHaveLength(NET_VERTEX_COUNT);
    expect(net.edges).toHaveLength(NET_EDGE_COUNT);
    for (let c = 0; c < 8; c++) {
      expect(net.cellOf.filter((i) => i === c)).toHaveLength(8);
    }
  });

  it('flat (fold = 0): every vertex lies in the hyperplane w = -1 and cubes do not overlap', () => {
    const net = tesseractNet(0);
    for (const v of net.vertices) expect(round(v[3])).toBe(-1);
    const centers = tesseractNetCells().map((c) => c.center);
    for (let a = 0; a < centers.length; a++) {
      for (let b = a + 1; b < centers.length; b++) {
        const dist = Math.hypot(...centers[a].map((x, k) => x - centers[b][k]));
        // Unit cubes of side 2: centres at least 2 apart means no interior overlap.
        expect(dist).toBeGreaterThanOrEqual(2 - 1e-9);
      }
    }
    // The cross shape: six cubes touch the core, the eighth hangs off -y.
    const core = centers[0];
    const touching = centers
      .slice(1)
      .filter((c) => Math.hypot(...c.map((x, k) => x - core[k])) === 2);
    expect(touching).toHaveLength(6);
  });

  it('folded (fold = 1): the 8 cubes are exactly the 8 facets of [-1,1]^4', () => {
    const cells = tesseractNetCells();
    for (const cell of cells) {
      const verts = netCellVertices(cell, 1);
      const [axis, sign] = cell.facet;
      for (const v of verts) {
        expect(round(v[axis])).toBe(sign);
        for (const c of v) expect(Math.abs(round(c))).toBe(1);
      }
      // Each facet is a genuine cube: 8 distinct corners.
      expect(new Set(verts.map(key)).size).toBe(8);
    }
    const facets = new Set(cells.map((c) => c.facet.join(':')));
    expect(facets.size).toBe(8);
  });

  it('folded (fold = 1): union of vertices is the 16 tesseract corners, union of edges is its 32 edges', () => {
    const net = tesseractNet(1);
    const tess = ncube(4);
    const tessKeys = new Set(tess.vertices.map(key));
    const netKeys = new Set(net.vertices.map((v) => key(v)));
    expect(netKeys).toEqual(tessKeys);

    const indexOf = new Map([...tessKeys].map((k, i) => [k, i]));
    const edgeSet = new Set();
    for (const [a, b] of net.edges) {
      edgeSet.add(edgeKey(indexOf.get(key(net.vertices[a])), indexOf.get(key(net.vertices[b]))));
    }
    const tessEdges = new Set(tess.edges.map(([a, b]) => edgeKey(a, b)));
    expect(edgeSet).toEqual(tessEdges);
  });

  it('folding preserves edge lengths (the cubes are rigid)', () => {
    for (const fold of [0, 0.25, 0.5, 0.75, 1]) {
      const net = tesseractNet(fold);
      for (const [a, b] of net.edges) {
        const len = Math.hypot(...net.vertices[a].map((x, k) => x - net.vertices[b][k]));
        expect(round(len)).toBe(2);
      }
    }
  });

  it('foldPoint: a quarter turn carries +dir onto +w about the hinge', () => {
    const hinge = [1, 0, 0, -1];
    const dir = [1, 0, 0, 0];
    const p = foldPoint([3, 0.5, -0.5, -1], hinge, dir, Math.PI / 2);
    expect(p.map(round)).toEqual([1, 0.5, -0.5, 1]);
    const same = foldPoint([3, 0.5, -0.5, -1], hinge, dir, 0);
    expect(same.map(round)).toEqual([3, 0.5, -0.5, -1]);
  });
});
