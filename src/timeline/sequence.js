/**
 * The master GSAP timeline: black → 0D → 1D → … → 7D → … → 1D → 0D → hold.
 *
 * Everything is expressed with explicit from/to values (`fromTo`/`set`) so the
 * timeline can be scrubbed, reversed and rendered frame-by-frame headlessly
 * with identical results.
 */

import gsap from 'gsap';
import { PHASE } from '../state.js';
import { AXIS_NAMES, vertexCount, edgeCount } from '../geometry/ncube.js';

const TAU = Math.PI * 2;

export const TIMING = {
  blackHold: 1.6,
  fadeIn: 1.6,
  build: 2.6,
  build4: 3.2,
  collapse: 2.4,
  holdShort: 1.0,
  hold3D: 1.8,
  spin4D: 6.0,
  netMix: 0.8,
  netUnfold: 4.2,
  netFlatHold: 2.4,
  spinHigh: 4.5,
  spin7D: 6.0,
  collapseHold: 0.7,
  finalHold: 6.0,
  fadeOut: 2.0,
  tailBlack: 1.5,
};

export const DIM_NAMES = [
  'a point',
  'a segment',
  'a square',
  'a cube',
  'a tesseract',
  'a 5-cube (penteract)',
  'a 6-cube (hexeract)',
  'a 7-cube (hepteract)',
];

const HOLD_CAPTIONS = {
  0: 'Zero basis vectors. There is nowhere to go — but there is something.',
  1: 'One basis vector, x. Two vertices, one edge. Left or right is the only question.',
  2: 'Two basis vectors. Four vertices, four edges. Flatland.',
  3: 'Three basis vectors. Eight vertices, twelve edges. This is where drawing stops being easy.',
  4: 'Sixteen vertices, thirty-two edges, eight cubic cells. Shift-drag (or the sliders) rotates it through w. Colour is the w coordinate.',
  5: 'Thirty-two vertices, eighty edges. Brightness is the fifth coordinate, v. The picture is now a code, not a shape.',
  6: 'Sixty-four vertices, 192 edges. Spatial tricks are running out. The matrix on the right is not.',
  7: 'One hundred twenty-eight vertices, 448 edges. Every vertex is a 7-bit string of ±1. Trust the pattern.',
};

function buildCaption(k) {
  const axis = AXIS_NAMES[k];
  if (k === 0)
    return `Copy the point, slide the copy along a new direction (${axis}), connect matching corners. That is the whole rule.`;
  if (k === 3)
    return `Copy the cube and slide it along w — a direction perpendicular to all three you can see — then connect every corner to its twin. Same rule, new layer.`;
  return `Same rule, new layer: copy ${DIM_NAMES[k]}, slide the copy along ${axis}, connect every corner to its twin.`;
}

function collapseCaption(k) {
  const axis = AXIS_NAMES[k];
  if (k === 3) return 'Project away w: the two cubes of the tesseract fall back onto each other.';
  if (k === 0) return 'Project away x. Two points become one.';
  return `Project away ${axis}. Every pair of vertices that differed only in ${axis} merges — the shadow of ${DIM_NAMES[k + 1]} is ${DIM_NAMES[k]}.`;
}

export function stats(n) {
  return `${vertexCount(n)} vertices · ${edgeCount(n)} edges`;
}

/**
 * Build the master timeline for `state`.
 * @param {ReturnType<import('../state.js').createState>} state
 * @param {{ loop?: boolean }} [options]
 */
export function createSequence(state, { loop = true } = {}) {
  const stages = [];
  const tl = gsap.timeline({
    paused: true,
    repeat: loop ? -1 : 0,
    defaults: { ease: 'power2.inOut' },
  });

  const mark = (id, dim, title, caption) => {
    stages.push({ id, time: tl.duration(), dim, title, caption });
  };

  const build = (k) => {
    const dur = k === 3 ? TIMING.build4 : TIMING.build;
    mark(`build-${k}`, k, `${k}D → ${k + 1}D`, buildCaption(k));
    tl.set(state, { dim: k, extent: 0, phase: PHASE.build });
    tl.fromTo(state, { extent: 0 }, { extent: 1, duration: dur });
    tl.set(state, { dim: k + 1, extent: 0, phase: PHASE.hold });
  };

  const collapse = (k) => {
    mark(`collapse-${k}`, k + 1, `${k + 1}D → ${k}D`, collapseCaption(k));
    tl.set(state, { dim: k, extent: 1, phase: PHASE.collapse });
    tl.fromTo(state, { extent: 1 }, { extent: 0, duration: TIMING.collapse });
    tl.set(state, { dim: k, extent: 0, phase: PHASE.hold });
  };

  const hold = (dim, seconds, id = `hold-${dim}`) => {
    mark(id, dim, `${dim}D — ${DIM_NAMES[dim]}`, HOLD_CAPTIONS[dim]);
    const start = tl.duration();
    tl.to({}, { duration: seconds });
    return start;
  };

  // Spin a plane by one full turn over `seconds` starting at `at`, ending
  // exactly where it started (so every stage boundary is a canonical pose).
  const spin = (key, seconds, at, turns = 1) => {
    tl.fromTo(
      state.auto,
      { [key]: 0 },
      { [key]: TAU * turns, duration: seconds, ease: 'power1.inOut' },
      at
    );
    tl.set(state.auto, { [key]: 0 }, at + seconds);
  };

  // ---------------------------------------------------------------- opening
  mark('black', 0, '', 'Nothing yet. No directions to move in.');
  tl.set(state, { dim: 0, extent: 0, phase: PHASE.hold, brightness: 0 });
  tl.set(state.net, { mix: 0, fold: 1, scale: 1 });
  tl.to({}, { duration: TIMING.blackHold });
  mark('appear', 0, '0D — a point', HOLD_CAPTIONS[0]);
  tl.fromTo(
    state,
    { brightness: 0 },
    { brightness: 1, duration: TIMING.fadeIn, ease: 'power1.out' }
  );
  tl.to({}, { duration: TIMING.holdShort });

  // ---------------------------------------------------------------- 0 → 3
  build(0);
  hold(1, TIMING.holdShort);
  build(1);
  hold(2, TIMING.holdShort);
  build(2);
  hold(3, TIMING.hold3D);

  // ---------------------------------------------------------------- 3 → 4, rotating projection
  build(3);
  let at = hold(4, TIMING.spin4D, 'hold-4-spin');
  spin('xw', TIMING.spin4D, at);

  // ---------------------------------------------------------------- the hero moment: the net
  mark(
    'net-unfold',
    4,
    '4D — the tesseract net',
    'Eight cubes unfold into ordinary 3D space, like a paper template of a box. Every cube is a cell of the tesseract.'
  );
  tl.fromTo(state.net, { mix: 0 }, { mix: 1, duration: TIMING.netMix, ease: 'power1.inOut' });
  tl.fromTo(state.net, { fold: 1, scale: 1 }, { fold: 0, scale: 0.7, duration: TIMING.netUnfold });
  mark(
    'net-flat',
    4,
    '4D — the tesseract net, flat',
    'Flat: all eight cubes share w = −1 (one colour). Six surround the core, the eighth hangs off the bottom. Fold them back up through w and they close into a tesseract.'
  );
  tl.to({}, { duration: TIMING.netFlatHold });
  mark(
    'net-fold',
    4,
    '4D — folding back up',
    'Each cube turns a quarter circle in a plane you cannot see — its outward direction rotates into w. Watch the colours separate.'
  );
  tl.fromTo(state.net, { fold: 0, scale: 0.7 }, { fold: 1, scale: 1, duration: TIMING.netUnfold });
  tl.fromTo(state.net, { mix: 1 }, { mix: 0, duration: TIMING.netMix, ease: 'power1.inOut' });

  // ---------------------------------------------------------------- 4 → 7
  build(4);
  at = hold(5, TIMING.spinHigh);
  spin('yv', TIMING.spinHigh, at);
  build(5);
  at = hold(6, TIMING.spinHigh);
  spin('zu', TIMING.spinHigh, at);
  build(6);
  at = hold(7, TIMING.spin7D);
  spin('wt', TIMING.spin7D, at);
  spin('xv', TIMING.spin7D, at);

  // ---------------------------------------------------------------- 7 → 0
  // Return the user's w-rotation to the identity before w is removed, so the
  // snap back into 3D happens in a canonical orientation.
  const unwind = { p: 0 };
  let captured = null;
  const wrap = (a) => Math.atan2(Math.sin(a), Math.cos(a));
  for (let k = 6; k >= 0; k--) {
    if (k === 3) {
      tl.fromTo(
        unwind,
        { p: 0 },
        {
          p: 1,
          duration: 0.9,
          onStart: () => {
            captured = {
              xw: wrap(state.user.xw),
              yw: wrap(state.user.yw),
              zw: wrap(state.user.zw),
            };
          },
          onUpdate: () => {
            if (!captured) return;
            for (const key of Object.keys(captured))
              state.user[key] = captured[key] * (1 - unwind.p);
          },
        }
      );
    }
    collapse(k);
    if (k > 0) {
      hold(k, TIMING.collapseHold, `hold-${k}-down`);
    }
  }

  // ---------------------------------------------------------------- the point, held
  mark(
    'final',
    0,
    '0D — a point',
    'The same point we started from. One rep done. Beyond 4D the pictures run out; the matrices never do.'
  );
  tl.to({}, { duration: TIMING.finalHold });
  mark('fade', 0, '', '');
  tl.fromTo(
    state,
    { brightness: 1 },
    { brightness: 0, duration: TIMING.fadeOut, ease: 'power1.in' }
  );
  tl.to({}, { duration: TIMING.tailBlack });

  const duration = tl.duration();

  /** Stage whose start time is the latest one ≤ t. */
  const stageAt = (t) => {
    let current = stages[0];
    for (const s of stages) {
      if (s.time <= t + 1e-6) current = s;
      else break;
    }
    return current;
  };

  /** Jump to the start of a stage by id (or the next stage after time t). */
  const seekStage = (id) => {
    const s = stages.find((x) => x.id === id);
    if (s) tl.time(s.time);
    return s;
  };

  return { tl, stages, duration, stageAt, seekStage };
}
