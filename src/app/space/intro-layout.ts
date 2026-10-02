import { X_ASPECT, X_CROSS } from './x-points';

/** Seconds into the intro at which the ship hits the mark. */
export const INTRO_IMPACT = 5.3;
/** Seconds at which the page is fully revealed and the intro can unmount. */
export const INTRO_END = 6.5;

export interface Rect {
  x: number;
  y: number;
  w: number;
  h: number;
}

export interface PlanetSlot {
  /** Index into the planet list. */
  index: number;
  /** Scales the shared orbit, so each planet has a ring of its own. */
  orbit: number;
  angle: number;
  radius: number;
}

export interface IntroLayout {
  w: number;
  h: number;
  m: number;
  diag: number;
  cx: number;
  cy: number;
  /** Half the mark's height. */
  s: number;
  rx: number;
  ry: number;
  slots: PlanetSlot[];
  plateW: number;
  plateH: number;
  shipScale: number;
  /** Where the strokes cross, which is what the ship aims for. */
  hit: [number, number];
}

/** Radians per second the system turns. Slow enough that every label stays put where it was laid out. */
export const ORBIT_SPEED = -0.045;
const PLATE_GAP = 6;
const EDGE = 10;
/** Room the Skip button takes in the bottom-right corner. */
const SKIP_W = 160;
const SKIP_H = 76;

const clamp = (v: number, lo: number, hi: number): number => Math.min(hi, Math.max(lo, v));

/** How many planets fit: a phone shows the first six products, a small tablet eight. */
export function planetCount(w: number, h: number, available: number): number {
  if (w < 600) return Math.min(available, 6);
  if (Math.min(w, h) < 820) return Math.min(available, 8);
  return available;
}

export function introLayout(w: number, h: number, available: number): IntroLayout {
  const m = Math.min(w, h);
  const phone = w < 600;
  const count = planetCount(w, h, available);
  const plateW = clamp(m * 0.15, 88, 136);
  const plateH = Math.round(plateW * 0.42);
  const radius = clamp(m * 0.034, 15, 28);

  const cy = h * (phone ? 0.44 : 0.46);
  const s = phone ? Math.min(w * 0.25, h * 0.13) : Math.min(h * 0.17, w * (h > w ? 0.19 : 0.12));
  const cx = w / 2;

  const rx = Math.min(w / 2 - radius * 1.15 - (phone ? 8 : 22), phone ? w : w * 0.42, 680);
  // The lowest plate has to clear the Skip button; the highest planet the top edge.
  const below = h - SKIP_H - EDGE - plateH - PLATE_GAP - radius * 1.15 - cy;
  const above = cy - radius * 1.15 - 16;
  const ry = Math.min(h * (phone ? 0.38 : 0.37), below, above);

  const slots: PlanetSlot[] = [];
  for (let i = 0; i < count; i++) {
    // Golden-ratio steps give each planet a slightly different orbit without clumping.
    const step = (i * 0.618) % 1;
    slots.push({
      index: i,
      orbit: 1 - (phone ? 0.03 : 0.09) * step,
      // Centred on the middle of the intro, so the drift is shared either side of the layout.
      angle: -Math.PI / 2 + (i / count) * Math.PI * 2 - ORBIT_SPEED * (INTRO_IMPACT / 2),
      radius: radius * (0.85 + 0.3 * ((i * 0.382) % 1)),
    });
  }

  return {
    w,
    h,
    m,
    diag: Math.hypot(w, h),
    cx,
    cy,
    s,
    rx,
    ry,
    slots,
    plateW,
    plateH,
    shipScale: clamp(m / 430, 0.85, 1.35),
    hit: [cx + X_CROSS[0] * s, cy + X_CROSS[1] * s],
  };
}

/** Where a planet is at time t; depth is -1 at the back of its orbit and 1 at the front. */
export function planetAt(L: IntroLayout, slot: PlanetSlot, t: number): { x: number; y: number; depth: number } {
  const a = slot.angle + ORBIT_SPEED * t;
  return {
    x: L.cx + Math.cos(a) * L.rx * slot.orbit,
    y: L.cy + Math.sin(a) * L.ry * slot.orbit,
    depth: Math.sin(a),
  };
}

/** The name plate hangs under its planet, nudged in from the screen edges. */
export function plateRect(L: IntroLayout, slot: PlanetSlot, x: number, y: number): Rect {
  return {
    x: clamp(x - L.plateW / 2, EDGE, L.w - EDGE - L.plateW),
    y: y + slot.radius + PLATE_GAP,
    w: L.plateW,
    h: L.plateH,
  };
}

export function markRect(L: IntroLayout): Rect {
  const hw = L.s * X_ASPECT;
  return { x: L.cx - hw, y: L.cy - L.s, w: hw * 2, h: L.s * 2 };
}

export function skipRect(L: IntroLayout): Rect {
  return { x: L.w - SKIP_W, y: L.h - SKIP_H, w: SKIP_W, h: SKIP_H };
}
