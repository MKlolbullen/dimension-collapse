import { describe, it, expect } from 'vitest';
import {
  ncube,
  ncubeRecursive,
  vertexCount,
  edgeCount,
  edgeKey,
  MAX_DIM,
} from '../src/geometry/ncube.js';

describe('n-cube closed forms', () => {
  it.each([0, 1, 2, 3, 4, 5, 6, 7])('n = %i has 2^n vertices and n·2^(n-1) edges', (n) => {
    const cube = ncube(n);
    expect(cube.vertices).toHaveLength(vertexCount(n));
    expect(cube.vertices).toHaveLength(2 ** n);
    expect(cube.edges).toHaveLength(edgeCount(n));
    expect(cube.edges).toHaveLength(n === 0 ? 0 : n * 2 ** (n - 1));
    expect(cube.edgeAxis).toHaveLength(cube.edges.length);
  });

  it('known values: point, segment, square, cube, tesseract, 7-cube', () => {
    expect([vertexCount(0), edgeCount(0)]).toEqual([1, 0]);
    expect([vertexCount(1), edgeCount(1)]).toEqual([2, 1]);
    expect([vertexCount(2), edgeCount(2)]).toEqual([4, 4]);
    expect([vertexCount(3), edgeCount(3)]).toEqual([8, 12]);
    expect([vertexCount(4), edgeCount(4)]).toEqual([16, 32]);
    expect([vertexCount(MAX_DIM), edgeCount(MAX_DIM)]).toEqual([128, 448]);
  });
});

describe('n-cube structure', () => {
  it('every vertex coordinate is ±1 and all vertices are distinct', () => {
    for (let n = 0; n <= 7; n++) {
      const { vertices } = ncube(n);
      const seen = new Set();
      for (const v of vertices) {
        expect(v).toHaveLength(n);
        for (const c of v) expect(Math.abs(c)).toBe(1);
        seen.add(v.join(','));
      }
      expect(seen.size).toBe(vertices.length);
    }
  });

  it('edges connect vertices that differ in exactly one coordinate, along edgeAxis', () => {
    for (let n = 1; n <= 7; n++) {
      const { vertices, edges, edgeAxis } = ncube(n);
      edges.forEach(([a, b], e) => {
        const diff = [];
        for (let k = 0; k < n; k++) if (vertices[a][k] !== vertices[b][k]) diff.push(k);
        expect(diff).toEqual([edgeAxis[e]]);
      });
    }
  });

  it('every vertex has degree n', () => {
    for (let n = 1; n <= 7; n++) {
      const { vertices, edges } = ncube(n);
      const degree = new Array(vertices.length).fill(0);
      for (const [a, b] of edges) {
        degree[a]++;
        degree[b]++;
      }
      for (const d of degree) expect(d).toBe(n);
    }
  });

  it('each axis carries exactly 2^(n-1) edges', () => {
    for (let n = 1; n <= 7; n++) {
      const { edgeAxis } = ncube(n);
      for (let k = 0; k < n; k++) {
        expect(edgeAxis.filter((a) => a === k)).toHaveLength(2 ** (n - 1));
      }
    }
  });
});

describe('two-copies recursion', () => {
  it.each([0, 1, 2, 3, 4, 5, 6, 7])('n = %i: recursion matches the direct construction', (n) => {
    const direct = ncube(n);
    const rec = ncubeRecursive(n);
    expect(rec.vertices).toEqual(direct.vertices);
    const directKeys = new Set(direct.edges.map(([a, b]) => edgeKey(a, b)));
    const recKeys = new Set(rec.edges.map(([a, b]) => edgeKey(a, b)));
    expect(recKeys).toEqual(directKeys);
    expect(rec.edges).toHaveLength(direct.edges.length);
  });

  it('splits into two copies of the (n-1)-cube plus 2^(n-1) connecting edges', () => {
    for (let n = 1; n <= 7; n++) {
      const rec = ncubeRecursive(n);
      expect(rec.low).toHaveLength(2 ** (n - 1));
      expect(rec.high).toHaveLength(2 ** (n - 1));
      expect(rec.connecting).toHaveLength(2 ** (n - 1));
      // E(n) = 2·E(n-1) + 2^(n-1)
      expect(rec.edges.length).toBe(2 * edgeCount(n - 1) + 2 ** (n - 1));
      for (const e of rec.connecting) {
        const [a, b] = rec.edges[e];
        expect(rec.vertices[a][n - 1]).toBe(-1);
        expect(rec.vertices[b][n - 1]).toBe(1);
        expect(rec.vertices[a].slice(0, n - 1)).toEqual(rec.vertices[b].slice(0, n - 1));
        expect(rec.edgeAxis[e]).toBe(n - 1);
      }
    }
  });
});
