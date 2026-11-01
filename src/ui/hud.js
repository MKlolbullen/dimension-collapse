/**
 * HUD: stage labels, dimension pips, w-rotation sliders (and Shift-drag),
 * view options, the live basis/rotation matrix and the transport bar.
 * The HUD reads state every frame and writes only `state.user`,
 * `state.projection` and timeline controls.
 */

import { AXIS_NAMES, vertexCount, edgeCount } from '../geometry/ncube.js';
import { visibleDimension } from '../state.js';
import { buildRotation } from '../scene/frame.js';

const $ = (id) => document.getElementById(id);
const DEG = 180 / Math.PI;
const W_DRAG_SENSITIVITY = 0.008;

function formatTime(seconds) {
  const s = Math.max(0, Math.floor(seconds));
  return `${Math.floor(s / 60)}:${String(s % 60).padStart(2, '0')}`;
}

/**
 * @param {object} deps
 * @param {ReturnType<import('../state.js').createState>} deps.state
 * @param {ReturnType<import('../timeline/sequence.js').createSequence>} deps.seq
 * @param {import('../scene/view.js').SceneView} deps.view
 * @param {import('../audio/sonification.js').Sonifier} deps.sonifier
 */
export function createHud({ state, seq, view, sonifier }) {
  const { tl } = seq;
  const el = {
    title: $('stage-title'),
    caption: $('stage-caption'),
    pips: $('dim-pips'),
    panel: $('panel'),
    panelToggle: $('panel-toggle'),
    sliders: {
      xw: [$('rot-xw'), $('rot-xw-out')],
      yw: [$('rot-yw'), $('rot-yw-out')],
      zw: [$('rot-zw'), $('rot-zw-out')],
    },
    rotReset: $('rot-reset'),
    optOrbit: $('opt-orbit'),
    optProjection: $('opt-projection'),
    optSound: $('opt-sound'),
    matrixDim: $('matrix-dim'),
    matrixStats: $('matrix-stats'),
    matrix: $('matrix'),
    play: $('btn-play'),
    prev: $('btn-prev'),
    next: $('btn-next'),
    scrub: $('scrub'),
    time: $('time'),
    speed: $('speed'),
    optLoop: $('opt-loop'),
    help: $('help'),
    helpBtn: $('btn-help'),
  };

  // ------------------------------------------------------------ dimension pips
  for (let d = 0; d <= 7; d++) {
    const li = document.createElement('li');
    li.textContent = String(d);
    el.pips.appendChild(li);
  }
  const pipEls = [...el.pips.children];

  // ------------------------------------------------------------ w-rotation
  let draggingSlider = false;
  for (const key of Object.keys(el.sliders)) {
    const [input] = el.sliders[key];
    input.addEventListener('input', () => {
      state.user[key] = Number(input.value) / DEG;
    });
    input.addEventListener('pointerdown', () => (draggingSlider = true));
    input.addEventListener('pointerup', () => (draggingSlider = false));
  }
  const resetRotation = () => {
    state.user.xw = state.user.yw = state.user.zw = 0;
  };
  el.rotReset.addEventListener('click', resetRotation);

  // Shift + drag (or right button) on the canvas rotates through w instead of orbiting.
  let wDrag = null;
  const canvas = view.canvas;
  canvas.addEventListener(
    'pointerdown',
    (e) => {
      if (!(e.shiftKey || e.button === 2)) return;
      e.stopImmediatePropagation();
      e.preventDefault();
      wDrag = { x: e.clientX, y: e.clientY, id: e.pointerId };
      view.controls.enabled = false;
      canvas.classList.add('w-drag');
      canvas.setPointerCapture(e.pointerId);
    },
    { capture: true }
  );
  canvas.addEventListener('pointermove', (e) => {
    if (!wDrag || e.pointerId !== wDrag.id) return;
    state.user.xw += (e.clientX - wDrag.x) * W_DRAG_SENSITIVITY;
    state.user.yw -= (e.clientY - wDrag.y) * W_DRAG_SENSITIVITY;
    wDrag.x = e.clientX;
    wDrag.y = e.clientY;
  });
  const endWDrag = (e) => {
    if (!wDrag || (e && e.pointerId !== wDrag.id)) return;
    wDrag = null;
    view.controls.enabled = true;
    canvas.classList.remove('w-drag');
  };
  canvas.addEventListener('pointerup', endWDrag);
  canvas.addEventListener('pointercancel', endWDrag);
  canvas.addEventListener('contextmenu', (e) => e.preventDefault());

  // ------------------------------------------------------------ view options
  el.optOrbit.addEventListener('change', () => {
    view.controls.autoRotate = el.optOrbit.checked;
  });
  el.optProjection.addEventListener('change', () => {
    state.projection = el.optProjection.checked ? 'perspective' : 'orthographic';
  });
  el.optSound.addEventListener('change', () => {
    if (el.optSound.checked) sonifier.enable();
    else sonifier.disable();
  });

  // ------------------------------------------------------------ panel
  const setPanel = (open) => {
    el.panel.classList.toggle('collapsed', !open);
    el.panelToggle.setAttribute('aria-expanded', String(open));
  };
  el.panelToggle.addEventListener('click', () =>
    setPanel(el.panel.classList.contains('collapsed'))
  );
  if (window.innerWidth < 760) setPanel(false);

  // ------------------------------------------------------------ transport
  let scrubbing = false;
  const togglePlay = () => {
    if (tl.paused()) tl.play();
    else tl.pause();
  };
  el.play.addEventListener('click', togglePlay);
  const stepStage = (dir) => {
    const t = tl.time();
    const idx = seq.stages.findIndex((s) => s.time > t + 0.05);
    let target;
    if (dir > 0) target = seq.stages[idx === -1 ? seq.stages.length - 1 : idx];
    else {
      const cur = seq.stageAt(t);
      const i = seq.stages.indexOf(cur);
      // Going back inside a stage returns to its start; from its start, to the previous one.
      target = t - cur.time > 0.6 ? cur : seq.stages[Math.max(0, i - 1)];
    }
    tl.time(target.time);
  };
  el.prev.addEventListener('click', () => stepStage(-1));
  el.next.addEventListener('click', () => stepStage(1));
  el.scrub.addEventListener('pointerdown', () => (scrubbing = true));
  el.scrub.addEventListener('input', () => {
    tl.time((Number(el.scrub.value) / 1000) * seq.duration);
  });
  el.scrub.addEventListener('change', () => (scrubbing = false));
  el.scrub.addEventListener('pointerup', () => (scrubbing = false));
  el.speed.addEventListener('change', () => tl.timeScale(Number(el.speed.value)));
  el.optLoop.addEventListener('change', () => tl.repeat(el.optLoop.checked ? -1 : 0));
  el.helpBtn.addEventListener('click', () => el.help.showModal());

  window.addEventListener('keydown', (e) => {
    if (e.target instanceof HTMLInputElement || e.target instanceof HTMLSelectElement) return;
    switch (e.key) {
      case ' ':
        e.preventDefault();
        togglePlay();
        break;
      case 'ArrowRight':
        stepStage(1);
        break;
      case 'ArrowLeft':
        stepStage(-1);
        break;
      case 'r':
      case 'R':
        resetRotation();
        break;
      case 'p':
      case 'P':
        setPanel(el.panel.classList.contains('collapsed'));
        break;
      case '?':
        if (el.help.open) el.help.close();
        else el.help.showModal();
        break;
      default:
    }
  });

  // ------------------------------------------------------------ matrix panel
  const matrixCells = [];
  let matrixSize = -1;
  const rebuildMatrix = (m) => {
    el.matrix.innerHTML = '';
    matrixCells.length = 0;
    el.matrix.style.gridTemplateColumns = `repeat(${m + 1}, auto)`;
    el.matrix.appendChild(
      Object.assign(document.createElement('span'), { className: 'cell head' })
    );
    for (let c = 0; c < m; c++) {
      const h = document.createElement('span');
      h.className = 'cell head';
      h.textContent = AXIS_NAMES[c];
      el.matrix.appendChild(h);
    }
    for (let r = 0; r < m; r++) {
      const h = document.createElement('span');
      h.className = 'cell head';
      h.textContent = AXIS_NAMES[r];
      el.matrix.appendChild(h);
      for (let c = 0; c < m; c++) {
        const cell = document.createElement('span');
        cell.className = 'cell';
        el.matrix.appendChild(cell);
        matrixCells.push(cell);
      }
    }
    matrixSize = m;
  };
  const updateMatrix = () => {
    const m = visibleDimension(state);
    if (m !== matrixSize) {
      rebuildMatrix(m);
      el.matrixDim.textContent = `ℝ${['⁰', '¹', '²', '³', '⁴', '⁵', '⁶', '⁷'][m]}`;
      el.matrixStats.textContent =
        m === 0
          ? '1 vertex · 0 edges'
          : `${vertexCount(m)} vertices · ${edgeCount(m)} edges · 2^${m} = ${vertexCount(m)}`;
    }
    if (m === 0) return;
    const rot = buildRotation(state);
    let i = 0;
    for (let r = 0; r < m; r++) {
      for (let c = 0; c < m; c++) {
        const v = rot[r][c];
        const cell = matrixCells[i++];
        const text = (Math.abs(v) < 0.005 ? 0 : v).toFixed(2);
        if (cell.textContent !== text) cell.textContent = text;
        const hot = Math.abs(v) > 0.005 && Math.abs(v) < 0.995;
        cell.classList.toggle('hot', hot);
        cell.classList.toggle('zero', Math.abs(v) < 0.005);
      }
    }
  };

  // ------------------------------------------------------------ per-frame update
  let lastStage = null;
  let lastPips = '';
  function update() {
    const t = tl.time();
    const stage = seq.stageAt(t);
    if (stage !== lastStage) {
      el.title.innerHTML = stage.title || '&nbsp;';
      el.caption.textContent = stage.caption;
      lastStage = stage;
    }

    const m = visibleDimension(state);
    const pipKey = `${state.dim}:${m}:${state.extent > 0 && state.extent < 1 ? 1 : 0}`;
    if (pipKey !== lastPips) {
      pipEls.forEach((li, d) => {
        li.classList.toggle(
          'active',
          d <= state.dim && !(d === m && state.extent > 0 && state.extent < 1)
        );
        li.classList.toggle('partial', d === m && state.extent > 0 && state.extent < 1);
      });
      lastPips = pipKey;
    }

    if (!draggingSlider) {
      for (const key of Object.keys(el.sliders)) {
        const [input, out] = el.sliders[key];
        const deg = Math.round(
          Math.atan2(Math.sin(state.user[key]), Math.cos(state.user[key])) * DEG
        );
        if (Number(input.value) !== deg) input.value = String(deg);
        out.textContent = `${deg}°`;
      }
    }

    updateMatrix();

    if (!scrubbing) el.scrub.value = String(Math.round((t / seq.duration) * 1000));
    el.time.textContent = `${formatTime(t)} / ${formatTime(seq.duration)}`;
    el.play.textContent = tl.paused() ? '▶' : '❚❚';
  }

  return { update, setPanel };
}
