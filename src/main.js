import './style.css';
import { createState } from './state.js';
import { SceneView } from './scene/view.js';
import { createSequence } from './timeline/sequence.js';
import { createHud } from './ui/hud.js';
import { Sonifier } from './audio/sonification.js';

/**
 * URL parameters:
 *   ?headless=1   no rAF loop, no panel/transport; exposes window.__dc for scripts/render-trailer.mjs
 *   ?loop=0       play once and hold on the final point
 *   ?t=12.5       start at a given timeline time (seconds)
 *   ?paused=1     start paused
 *   ?stage=net-flat  start at a named stage (see src/timeline/sequence.js)
 */
const params = new URLSearchParams(window.location.search);
const headless = params.has('headless');
if (headless) document.body.classList.add('headless');

const state = createState();
const canvas = document.getElementById('scene');
const view = new SceneView(canvas, { headless });
const seq = createSequence(state, { loop: !headless && params.get('loop') !== '0' });
const sonifier = new Sonifier();
const hud = createHud({ state, seq, view, sonifier });

function renderAt(dt) {
  state.time = seq.tl.time();
  view.render(state, dt);
  hud.update();
  sonifier.update(state);
}

const resize = () => view.resize(window.innerWidth, window.innerHeight);
window.addEventListener('resize', resize);
resize();

if (params.has('stage')) seq.seekStage(params.get('stage'));
if (params.has('t')) seq.tl.time(Number(params.get('t')));

if (headless) {
  // Deterministic frame stepping for the trailer renderer.
  let last = seq.tl.time();
  window.__dc = {
    duration: seq.duration,
    stages: seq.stages.map(({ id, time, title }) => ({ id, time, title })),
    seek(t) {
      seq.tl.time(t);
      renderAt(Math.max(0, t - last));
      last = t;
    },
    setSize(w, h) {
      view.resize(w, h);
    },
  };
  renderAt(0);
} else {
  if (!params.has('paused')) seq.tl.play();
  let last = performance.now();
  const loop = (now) => {
    const dt = Math.min(0.1, (now - last) / 1000);
    last = now;
    renderAt(dt);
    requestAnimationFrame(loop);
  };
  requestAnimationFrame(loop);
}

// Handy for poking at things from the console.
window.dimensionCollapse = { state, seq, view };
