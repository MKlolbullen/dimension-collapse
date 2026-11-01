/**
 * Colour mapping. A single scalar t ∈ [-1, 1] (a coordinate along the hue
 * axis, usually w) is mapped onto a spectral path that reads well on black:
 * teal (t = -1) → blue → violet (t = 0) → magenta → amber (t = +1).
 */

import { Color } from 'three';

export const HUE_START = 0.5; // teal
export const HUE_END = 1.08; // amber (wraps past red)
export const SATURATION = 0.85;
export const LIGHTNESS = 0.58;

const scratch = new Color();

/** Hue in [0, 1) for a coordinate t in [-1, 1]. */
export function hueForT(t) {
  const u = (Math.min(1, Math.max(-1, t)) + 1) / 2;
  return (HUE_START + (HUE_END - HUE_START) * u) % 1;
}

/**
 * Writes RGB for (t, brightness, highlight) into `out` at offset `o`.
 * `highlight` pulls the colour towards white (used for the frontier edges).
 */
export function writeColor(out, o, t, bright = 1, highlight = 0) {
  scratch.setHSL(hueForT(t), SATURATION, LIGHTNESS);
  if (highlight > 0) scratch.lerp(WHITE, highlight * 0.85);
  out[o] = scratch.r * bright;
  out[o + 1] = scratch.g * bright;
  out[o + 2] = scratch.b * bright;
}

const WHITE = new Color(1, 1, 1);

/** CSS colour string for the same mapping (used by the HUD swatches). */
export function cssColorForT(t) {
  return `hsl(${Math.round(hueForT(t) * 360)} ${Math.round(SATURATION * 100)}% ${Math.round(LIGHTNESS * 100)}%)`;
}
