/**
 * Experimental sonification hook (off by default).
 *
 * Idea borrowed from QFT, where particles are excitations of a field: each
 * basis vector is one harmonic partial of a single tone (axis k → the
 * (k+1)-th harmonic of a 110 Hz fundamental). Building a dimension fades its
 * partial in; collapsing fades it out. Rotation through w gently detunes the
 * w partial so you can *hear* the rotation.
 *
 * Deliberately tiny. Treat it as a stub to grow, not a finished design.
 */

import { axisExtents } from '../state.js';

const FUNDAMENTAL = 110;
const MASTER_GAIN = 0.12;

export class Sonifier {
  constructor() {
    this.ctx = null;
    this.master = null;
    this.partials = [];
    this.enabled = false;
  }

  /** Must be called from a user gesture (browser autoplay policy). */
  enable() {
    if (this.enabled) return;
    if (!this.ctx) {
      const Ctx = window.AudioContext || window.webkitAudioContext;
      if (!Ctx) return;
      this.ctx = new Ctx();
      this.master = this.ctx.createGain();
      this.master.gain.value = 0;
      this.master.connect(this.ctx.destination);
      for (let k = 0; k < 7; k++) {
        const osc = this.ctx.createOscillator();
        osc.type = k === 0 ? 'sine' : 'triangle';
        osc.frequency.value = FUNDAMENTAL * (k + 1);
        const gain = this.ctx.createGain();
        gain.gain.value = 0;
        osc.connect(gain).connect(this.master);
        osc.start();
        this.partials.push({ osc, gain });
      }
    }
    this.ctx.resume();
    this.master.gain.setTargetAtTime(MASTER_GAIN, this.ctx.currentTime, 0.3);
    this.enabled = true;
  }

  disable() {
    if (!this.enabled) return;
    this.master.gain.setTargetAtTime(0, this.ctx.currentTime, 0.2);
    this.enabled = false;
  }

  /** Called every frame with the live state. */
  update(state) {
    if (!this.enabled || !this.ctx) return;
    const now = this.ctx.currentTime;
    const ext = axisExtents(state);
    const fade = Math.max(0, Math.min(1, state.brightness));
    for (let k = 0; k < 7; k++) {
      const { osc, gain } = this.partials[k];
      // Higher partials are quieter so the chord stays soft.
      const level = (fade * ext[k]) / (k + 1);
      gain.gain.setTargetAtTime(level, now, 0.08);
      if (k === 3) {
        const detune = 40 * Math.sin(state.user.xw) + 25 * Math.sin(state.user.yw);
        osc.detune.setTargetAtTime(detune, now, 0.05);
      }
    }
  }
}
