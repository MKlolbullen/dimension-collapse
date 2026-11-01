/**
 * Three.js view: owns the renderer, camera, orbit controls and the two
 * wireframe objects (the n-cube and the tesseract net). It only ever *reads*
 * the state; all animation lives in the GSAP timeline.
 */

import {
  AdditiveBlending,
  BufferAttribute,
  BufferGeometry,
  CanvasTexture,
  Color,
  Group,
  PerspectiveCamera,
  Points,
  PointsMaterial,
  Scene,
  WebGLRenderer,
} from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
import { LineSegments2 } from 'three/addons/lines/LineSegments2.js';
import { LineSegmentsGeometry } from 'three/addons/lines/LineSegmentsGeometry.js';
import { LineMaterial } from 'three/addons/lines/LineMaterial.js';
import { edgeCount, vertexCount, MAX_DIM } from '../geometry/ncube.js';
import { NET_EDGE_COUNT, NET_VERTEX_COUNT } from '../geometry/net.js';
import { polytopeFrame, netFrame, buildRotation, sceneScale } from './frame.js';
import { writeColor } from './colors.js';

const MAX_VERTICES = vertexCount(MAX_DIM);
const MAX_EDGES = edgeCount(MAX_DIM);
const LINE_WIDTH_PX = 1.6;

/** Soft round sprite for vertices, drawn once onto a canvas. */
function makePointSprite() {
  const size = 64;
  const canvas = document.createElement('canvas');
  canvas.width = canvas.height = size;
  const ctx = canvas.getContext('2d');
  const g = ctx.createRadialGradient(size / 2, size / 2, 0, size / 2, size / 2, size / 2);
  g.addColorStop(0, 'rgba(255,255,255,1)');
  g.addColorStop(0.35, 'rgba(255,255,255,0.9)');
  g.addColorStop(1, 'rgba(255,255,255,0)');
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, size, size);
  const tex = new CanvasTexture(canvas);
  tex.needsUpdate = true;
  return tex;
}

/** A wireframe (edges + glowing vertices) with pre-allocated buffers. */
class Wireframe {
  constructor(maxVertices, maxEdges, sprite) {
    this.group = new Group();

    // Fat lines (screen-space width). The geometry is allocated once at the
    // maximum size; per frame we overwrite the interleaved buffers in place
    // and adjust instanceCount, instead of calling setPositions (which would
    // allocate new GPU buffers every frame).
    this.linePositions = new Float32Array(maxEdges * 2 * 3);
    this.lineColors = new Float32Array(maxEdges * 2 * 3);
    const lineGeo = new LineSegmentsGeometry();
    lineGeo.setPositions(this.linePositions);
    lineGeo.setColors(this.lineColors);
    this.lineMaterial = new LineMaterial({
      color: 0xffffff,
      linewidth: LINE_WIDTH_PX,
      vertexColors: true,
      transparent: true,
      opacity: 1,
      blending: AdditiveBlending,
      depthWrite: false,
    });
    this.lines = new LineSegments2(lineGeo, this.lineMaterial);
    this.lines.frustumCulled = false;

    this.pointPositions = new Float32Array(maxVertices * 3);
    this.pointColors = new Float32Array(maxVertices * 3);
    const pointGeo = new BufferGeometry();
    pointGeo.setAttribute('position', new BufferAttribute(this.pointPositions, 3));
    pointGeo.setAttribute('color', new BufferAttribute(this.pointColors, 3));
    this.pointMaterial = new PointsMaterial({
      vertexColors: true,
      size: 8,
      sizeAttenuation: false,
      map: sprite,
      transparent: true,
      opacity: 1,
      blending: AdditiveBlending,
      depthWrite: false,
    });
    this.points = new Points(pointGeo, this.pointMaterial);
    this.points.frustumCulled = false;

    this.group.add(this.lines, this.points);
  }

  set opacity(value) {
    this.lineMaterial.opacity = value;
    this.pointMaterial.opacity = value;
    this.group.visible = value > 0.002;
  }

  /**
   * Upload positions/colours. `edgeColor(e, endIndex, out, offset)` lets the
   * caller decide per-edge colours (e.g. frontier highlight).
   */
  upload(positions, edges, vertexColor, edgeColor) {
    const n = positions.length;
    for (let i = 0; i < n; i++) {
      const p = positions[i];
      this.pointPositions[i * 3] = p[0];
      this.pointPositions[i * 3 + 1] = p[1];
      this.pointPositions[i * 3 + 2] = p[2];
      vertexColor(i, this.pointColors, i * 3);
    }
    this.points.geometry.setDrawRange(0, n);
    this.points.geometry.attributes.position.needsUpdate = true;
    this.points.geometry.attributes.color.needsUpdate = true;

    for (let e = 0; e < edges.length; e++) {
      const [a, b] = edges[e];
      const pa = positions[a];
      const pb = positions[b];
      const o = e * 6;
      this.linePositions[o] = pa[0];
      this.linePositions[o + 1] = pa[1];
      this.linePositions[o + 2] = pa[2];
      this.linePositions[o + 3] = pb[0];
      this.linePositions[o + 4] = pb[1];
      this.linePositions[o + 5] = pb[2];
      edgeColor(e, a, this.lineColors, o);
      edgeColor(e, b, this.lineColors, o + 3);
    }
    const geo = this.lines.geometry;
    geo.instanceCount = edges.length;
    geo.attributes.instanceStart.data.needsUpdate = true;
    geo.attributes.instanceColorStart.data.needsUpdate = true;
  }

  setResolution(w, h) {
    this.lineMaterial.resolution.set(w, h);
  }
}

export class SceneView {
  /**
   * @param {HTMLCanvasElement} canvas
   * @param {{ headless?: boolean }} [options] headless disables orbit auto-rotation
   *   time dependence on wall-clock (the caller passes dt explicitly).
   */
  constructor(canvas, { headless = false } = {}) {
    this.canvas = canvas;
    this.headless = headless;

    this.renderer = new WebGLRenderer({
      canvas,
      antialias: true,
      alpha: false,
      powerPreference: 'high-performance',
      preserveDrawingBuffer: headless,
    });
    this.renderer.setClearColor(new Color(0x000000), 1);

    this.scene = new Scene();
    this.camera = new PerspectiveCamera(42, 1, 0.05, 100);
    this.camera.position.set(3.2, 2.4, 5.6);
    this.camera.lookAt(0, 0, 0);

    this.controls = new OrbitControls(this.camera, canvas);
    this.controls.enableDamping = true;
    this.controls.dampingFactor = 0.08;
    this.controls.enablePan = false;
    this.controls.minDistance = 2.5;
    this.controls.maxDistance = 20;
    this.controls.autoRotate = true;
    this.controls.autoRotateSpeed = 0.5;

    const sprite = makePointSprite();
    this.polytope = new Wireframe(MAX_VERTICES, MAX_EDGES, sprite);
    this.net = new Wireframe(NET_VERTEX_COUNT, NET_EDGE_COUNT, sprite);
    this.net.opacity = 0;
    this.scene.add(this.polytope.group, this.net.group);

    this.resize();
  }

  resize(width = this.canvas.clientWidth, height = this.canvas.clientHeight) {
    const w = Math.max(1, width);
    const h = Math.max(1, height);
    this.renderer.setPixelRatio(this.headless ? 1 : Math.min(window.devicePixelRatio || 1, 2));
    this.renderer.setSize(w, h, false);
    this.camera.aspect = w / h;
    this.camera.updateProjectionMatrix();
    const pr = this.renderer.getPixelRatio();
    this.polytope.setResolution(w * pr, h * pr);
    this.net.setResolution(w * pr, h * pr);
  }

  /**
   * Render one frame of `state`. `dt` is the elapsed time in seconds, used by
   * the orbit auto-rotation so headless renders are deterministic.
   */
  render(state, dt = 1 / 60) {
    const rotation = buildRotation(state);
    const fade = Math.max(0, Math.min(1, state.brightness));
    const scale = sceneScale(state);
    this.polytope.group.scale.setScalar(scale);

    // --- n-cube wireframe ---
    const frame = polytopeFrame(state, rotation);
    const cubeOpacity = fade * (1 - state.net.mix);
    this.polytope.opacity = cubeOpacity;
    if (cubeOpacity > 0) {
      const { hueT, bright, edgeAxis, frontierAxis, highlight } = frame;
      this.polytope.upload(
        frame.positions,
        frame.edges,
        (i, out, o) => writeColor(out, o, hueT[i], bright[i]),
        (e, i, out, o) =>
          writeColor(out, o, hueT[i], bright[i], edgeAxis[e] === frontierAxis ? highlight : 0)
      );
      // Bigger dots when there is little else to see (0D, 1D).
      this.polytope.pointMaterial.size = frame.m === 0 ? 16 : 10 - 0.75 * frame.m;
    }

    // --- tesseract net ---
    const netOpacity = fade * state.net.mix;
    this.net.opacity = netOpacity;
    if (netOpacity > 0) {
      const nf = netFrame(state, rotation);
      this.net.upload(
        nf.positions,
        nf.edges,
        (i, out, o) =>
          writeColor(out, o, nf.hueT[i], 0.85 + (0.15 * ((nf.cellOf[i] * 37) % 8)) / 7),
        (e, i, out, o) => writeColor(out, o, nf.hueT[i], 1, 0)
      );
      this.net.pointMaterial.size = 6;
      this.net.group.scale.setScalar(state.net.scale * scale);
    }

    this.controls.update(dt);
    this.renderer.render(this.scene, this.camera);
  }

  dispose() {
    this.controls.dispose();
    this.renderer.dispose();
  }
}
