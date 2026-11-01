import { describe, it, expect } from 'vitest';
import { createState, PHASE, visibleDimension, axisExtents } from '../src/state.js';
import {
  polytopeFrame,
  netFrame,
  hueAxis,
  sceneScale,
  projectionDistance,
  buildRotation,
} from '../src/scene/frame.js';
import { isOrthonormal } from '../src/geometry/rotation.js';

describe('state helpers', () => {
  it('visible dimension counts the frontier axis only while it has extent', () => {
    const s = createState();
    s.dim = 3;
    s.extent = 0;
    expect(visibleDimension(s)).toBe(3);
    s.extent = 0.4;
    expect(visibleDimension(s)).toBe(4);
    expect(axisExtents(s)).toEqual([1, 1, 1, 0.4, 0, 0, 0]);
    s.dim = 7;
    expect(visibleDimension(s)).toBe(7);
  });
});

describe('polytope frame', () => {
  it('a settled n-cube projects 2^n vertices and n·2^(n-1) edges', () => {
    const s = createState();
    s.brightness = 1;
    for (let n = 0; n <= 7; n++) {
      s.dim = n;
      s.extent = 0;
      const f = polytopeFrame(s);
      expect(f.m).toBe(n);
      expect(f.positions).toHaveLength(2 ** n);
      expect(f.edges).toHaveLength(n === 0 ? 0 : n * 2 ** (n - 1));
      for (const p of f.positions) {
        expect(p).toHaveLength(3);
        for (const c of p) expect(Number.isFinite(c)).toBe(true);
      }
    }
  });

  it('mid-step the two copies are separated by 2·extent along the frontier axis (3D case)', () => {
    const s = createState();
    s.dim = 2;
    s.extent = 0.25;
    s.phase = PHASE.build;
    const f = polytopeFrame(s);
    expect(f.m).toBe(3);
    const zs = f.positions.map((p) => p[2]);
    expect(Math.max(...zs)).toBeCloseTo(0.25, 9);
    expect(Math.min(...zs)).toBeCloseTo(-0.25, 9);
    expect(f.frontierAxis).toBe(2);
    expect(f.highlight).toBeGreaterThan(0);
  });

  it('at extent 0 the copies coincide (the snap is invisible)', () => {
    const s = createState();
    s.dim = 3;
    s.extent = 1e-9;
    const grown = polytopeFrame(s);
    s.extent = 0;
    const settled = polytopeFrame(s);
    expect(grown.m).toBe(4);
    expect(settled.m).toBe(3);
    for (const p of grown.positions) {
      const match = settled.positions.some((q) => q.every((c, k) => Math.abs(c - p[k]) < 1e-6));
      expect(match).toBe(true);
    }
  });

  it('hue axis is the frontier axis below 4D and w from 4D on', () => {
    const s = createState();
    s.dim = 0;
    s.extent = 0;
    expect(hueAxis(s)).toBe(-1);
    s.extent = 0.5;
    expect(hueAxis(s)).toBe(0);
    s.dim = 2;
    s.extent = 0.5;
    expect(hueAxis(s)).toBe(2);
    s.dim = 3;
    s.extent = 0;
    expect(hueAxis(s)).toBe(2);
    s.extent = 0.5;
    expect(hueAxis(s)).toBe(3);
    s.dim = 7;
    expect(hueAxis(s)).toBe(3);
  });

  it('colour drains as the axis collapses: hue parameter equals the scaled coordinate', () => {
    const s = createState();
    s.dim = 3;
    s.extent = 0.5;
    s.phase = PHASE.collapse;
    const f = polytopeFrame(s);
    expect(Math.max(...f.hueT)).toBeCloseTo(0.5, 9);
    expect(Math.min(...f.hueT)).toBeCloseTo(-0.5, 9);
  });

  it('brightness encodes v: the +v half stays at 1, the -v half dims', () => {
    const s = createState();
    s.dim = 5;
    s.extent = 0;
    const f = polytopeFrame(s);
    expect(Math.max(...f.bright)).toBeCloseTo(1, 9);
    expect(Math.min(...f.bright)).toBeCloseTo(0.3, 9);
    s.dim = 4;
    expect(polytopeFrame(s).bright.every((b) => b === 1)).toBe(true);
  });

  it('the composite rotation is orthonormal for user + auto angles', () => {
    const s = createState();
    s.user.xw = 0.7;
    s.user.yw = -0.2;
    s.auto.wt = 2.1;
    s.auto.yv = 0.4;
    expect(isOrthonormal(buildRotation(s))).toBe(true);
  });

  it('scene scale and projection distance are continuous in the effective dimension', () => {
    const s = createState();
    s.dim = 3;
    s.extent = 0.999999;
    const a = sceneScale(s);
    const da = projectionDistance(s);
    s.dim = 4;
    s.extent = 0;
    expect(sceneScale(s)).toBeCloseTo(a, 4);
    expect(projectionDistance(s)).toBeCloseTo(da, 4);
    s.dim = 7;
    expect(sceneScale(s)).toBeLessThan(0.5);
    expect(projectionDistance(s)).toBeGreaterThan(5);
  });
});

describe('net frame', () => {
  it('folded net coincides with the tesseract frame', () => {
    const s = createState();
    s.dim = 4;
    s.extent = 0;
    s.net.fold = 1;
    const cube = polytopeFrame(s);
    const net = netFrame(s);
    expect(net.positions).toHaveLength(64);
    for (const p of net.positions) {
      const match = cube.positions.some((q) => q.every((c, k) => Math.abs(c - p[k]) < 1e-6));
      expect(match).toBe(true);
    }
  });

  it('flat net: all hue parameters equal -1 (single colour)', () => {
    const s = createState();
    s.net.fold = 0;
    const net = netFrame(s);
    expect(net.hueT.every((t) => Math.abs(t + 1) < 1e-9)).toBe(true);
  });
});
