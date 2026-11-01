import { describe, it, expect, beforeAll } from 'vitest';
import { createState, PHASE, PLANE_KEYS, visibleDimension } from '../src/state.js';
import { createSequence } from '../src/timeline/sequence.js';

/**
 * Integration test of the master timeline: build it once, seek to every stage
 * boundary and check the state the renderer would see. GSAP runs fine in Node
 * (no DOM needed for plain-object tweens).
 */
describe('master timeline 0 → 7 → 0', () => {
  let state;
  let seq;
  const at = (t) => {
    seq.tl.time(t);
    return state;
  };
  const stage = (id) => seq.stages.find((s) => s.id === id);

  beforeAll(() => {
    state = createState();
    seq = createSequence(state, { loop: false });
  });

  it('has a finite duration and monotonically ordered stages', () => {
    expect(seq.duration).toBeGreaterThan(60);
    expect(seq.duration).toBeLessThan(180);
    for (let i = 1; i < seq.stages.length; i++) {
      expect(seq.stages[i].time).toBeGreaterThanOrEqual(seq.stages[i - 1].time);
    }
  });

  it('starts black on a point and ends black on a point', () => {
    at(0);
    expect(state.dim).toBe(0);
    expect(state.brightness).toBe(0);
    at(seq.duration);
    expect(state.dim).toBe(0);
    expect(state.extent).toBe(0);
    expect(state.brightness).toBeCloseTo(0, 5);
  });

  it('visits every dimension 0..7 on the way up and the way down', () => {
    for (let d = 1; d <= 7; d++) {
      at(stage(`hold-${d}`)?.time ?? stage('hold-4-spin').time + 0.01);
      if (d !== 4) expect(state.dim).toBe(d);
    }
    at(stage('hold-4-spin').time + 0.01);
    expect(state.dim).toBe(4);
    for (let d = 6; d >= 1; d--) {
      at(stage(`hold-${d}-down`).time + 0.01);
      expect(state.dim).toBe(d);
      expect(state.extent).toBe(0);
    }
    at(stage('final').time + 0.01);
    expect(state.dim).toBe(0);
    expect(state.brightness).toBe(1);
  });

  it('build steps grow the frontier axis from 0 to 1; collapse steps shrink it from 1 to 0', () => {
    const b = stage('build-2');
    at(b.time + 0.01);
    expect(state.dim).toBe(2);
    expect(state.phase).toBe(PHASE.build);
    expect(state.extent).toBeLessThan(0.05);
    at(b.time + 1.3);
    expect(state.extent).toBeGreaterThan(0.2);
    expect(state.extent).toBeLessThan(0.8);
    expect(visibleDimension(state)).toBe(3);

    const c = stage('collapse-2');
    at(c.time + 0.01);
    expect(state.dim).toBe(2);
    expect(state.phase).toBe(PHASE.collapse);
    expect(state.extent).toBeGreaterThan(0.95);
    at(c.time + 2.3);
    expect(state.extent).toBeLessThan(0.1);
  });

  it('the net is fully unfolded and flat at net-flat, and folded with the cube back at the end', () => {
    at(stage('net-flat').time + 0.01);
    expect(state.net.mix).toBeCloseTo(1, 5);
    expect(state.net.fold).toBeCloseTo(0, 5);
    at(stage('build-4').time);
    expect(state.net.mix).toBeCloseTo(0, 5);
    expect(state.net.fold).toBeCloseTo(1, 5);
  });

  it('every stage boundary is a canonical pose: automatic rotation angles are multiples of 2π', () => {
    const TAU = Math.PI * 2;
    for (const s of seq.stages) {
      at(s.time + 0.001);
      for (const key of PLANE_KEYS) {
        const turns = state.auto[key] / TAU;
        expect(Math.abs(turns - Math.round(turns)), `${s.id} ${key}`).toBeLessThan(1e-3);
      }
    }
  });

  it('spins the xw plane during the 4D hold', () => {
    const s = stage('hold-4-spin');
    at(s.time + 3);
    expect(Math.abs(state.auto.xw)).toBeGreaterThan(1);
  });

  it('the user w-rotation is unwound before w is removed', () => {
    state.user.xw = 1.0;
    state.user.yw = -0.5;
    const c = stage('collapse-3');
    at(c.time - 1.0);
    at(c.time);
    expect(Math.abs(state.user.xw)).toBeLessThan(1e-6);
    expect(Math.abs(state.user.yw)).toBeLessThan(1e-6);
  });

  it('stageAt / seekStage resolve stages', () => {
    const s = stage('net-unfold');
    expect(seq.stageAt(s.time + 0.5).id).toBe('net-unfold');
    expect(seq.seekStage('hold-7').id).toBe('hold-7');
    expect(seq.tl.time()).toBeCloseTo(stage('hold-7').time, 6);
  });
});
