import { X_ASPECT, X_CROSS } from './x-points';

/** Seconds into the intro at which the ship hits the mark. */
export const INTRO_IMPACT = 5.6;
/** Seconds at which the page is fully revealed and the intro can unmount. */
export const INTRO_END = 6.8;

export interface Rect {
  x: number;
  y: number;
  w: number;
  h: number;
}

/** An inclined orbit, seen as an ellipse turned `tilt` on the screen. */
export interface Ring {
  a: number;
  b: number;
  tilt: number;
  /** Radians per second. Inner rings run faster, as they would. */
  speed: number;
}

export interface PlanetSlot {
  /** Index into the planet list. */
  index: number;
  ring: number;
  phase: number;
  radius: number;
  moon: boolean;
  /** A Saturn-style ring around the body. */
  belt: boolean;
}

export interface PlanetPos {
  x: number;
  y: number;
  /** -1 at the far side of the orbit, 1 at the near side. */
  depth: number;
  scale: number;
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
  rings: Ring[];
  slots: PlanetSlot[];
  plateW: number;
  plateH: number;
  shipScale: number;
  /** Where the strokes cross, which is what the ship aims for. */
  hit: [number, number];
  /** Per label window, where each planet's banner hangs: an ANCHORS index, or -1 for hidden. */
  labels: number[][];
}

const PLATE_GAP = 5;
const EDGE = 10;
/** Room the Skip button takes in the bottom-right corner. */
const SKIP_W = 160;
const SKIP_H = 76;
const RING_SPEED = [0.55, 0.28, 0.17];
const RING_PHASE = [2, 1.3, 2.2];
/** Depth scales a planet by this much either way. */
const DEPTH_SCALE = 0.2;

export const LABEL_FROM = 0.9;
export const LABEL_WINDOW = 0.55;
export const LABEL_FADE = 0.18;
const LABEL_STEP = 0.05;

const clamp = (v: number, lo: number, hi: number): number => Math.min(hi, Math.max(lo, v));

export const overlaps = (a: Rect, b: Rect, pad = 0): boolean =>
  a.x < b.x + b.w + pad && b.x < a.x + a.w + pad && a.y < b.y + b.h + pad && b.y < a.y + a.h + pad;

/** Shrinks a ring until its turned ellipse fits the half-extents given. */
function fit(a: number, ratio: number, tilt: number, ax: number, ay: number): [number, number] {
  const b = a * ratio;
  const c = Math.cos(tilt);
  const s = Math.sin(tilt);
  const hx = Math.hypot(a * c, b * s);
  const hy = Math.hypot(a * s, b * c);
  const k = Math.min(1, ax / hx, ay / hy);
  return [a * k, b * k];
}

export function introLayout(w: number, h: number, count: number): IntroLayout {
  const m = Math.min(w, h);
  const phone = w < 600;
  const portrait = h > w * 1.15;
  const plateW = phone ? 80 : clamp(m * 0.15, 96, 136);
  const plateH = Math.round(plateW * 0.42);
  const base = clamp(m * 0.036, 14, 34);

  const cy = h * (phone ? 0.48 : 0.47);
  const s = phone ? Math.min(w * 0.25, h * 0.13) : Math.min(h * 0.17, w * (portrait ? 0.19 : 0.12));
  const cx = w / 2;
  const markW = s * X_ASPECT;

  const reach = base * 1.25 * (1 + DEPTH_SCALE);
  const ax = Math.min(w / 2 - EDGE - reach * 1.6, 760);
  const ay = Math.min(cy - reach - 8, h - cy - reach - PLATE_GAP - plateH - EDGE);

  const specs: [number, number, number][] = portrait
    ? [
        [markW * 1.85, 0.3, -0.35],
        [ay * 0.74, 0.44, Math.PI / 2 + 0.3],
        [ay, 0.5, Math.PI / 2 - 0.08],
      ]
    : [
        [markW * 2, 0.3, -0.3],
        [ax * 0.66, 0.42, 0.24],
        [ax, 0.5, -0.06],
      ];
  const rings = specs.map(([a, ratio, tilt], k) => {
    const [fa, fb] = fit(a, ratio, tilt, ax, ay);
    return { a: fa, b: fb, tilt, speed: RING_SPEED[k] };
  });

  // The last few, the seasonal pools, ride the small inner ring across the mark.
  const inner = Math.round(count * 0.27);
  const middle = Math.round((count - inner) / 2);
  const ringOf = (i: number): number => (i >= count - inner ? 0 : i < middle ? 1 : 2);
  const sizes = [inner, middle, count - inner - middle];
  const seen = [0, 0, 0];

  const slots: PlanetSlot[] = [];
  for (let i = 0; i < count; i++) {
    const ring = ringOf(i);
    const n = seen[ring]++;
    slots.push({
      index: i,
      ring,
      phase: (n / sizes[ring]) * Math.PI * 2 + RING_PHASE[ring],
      radius: base * (ring === 0 ? 0.72 : 0.9 + 0.3 * ((i * 0.618) % 1)),
      moon: i % 3 === 1,
      belt: i % 4 === 2,
    });
  }

  const L: IntroLayout = {
    w,
    h,
    m,
    diag: Math.hypot(w, h),
    cx,
    cy,
    s,
    rings,
    slots,
    plateW,
    plateH,
    shipScale: clamp(m / 500, 0.72, 1.2),
    hit: [cx + X_CROSS[0] * s, cy + X_CROSS[1] * s],
    labels: [],
  };
  L.labels = labelSchedule(L);
  return L;
}

export function planetAt(L: IntroLayout, slot: PlanetSlot, t: number): PlanetPos {
  const ring = L.rings[slot.ring];
  const a = slot.phase + ring.speed * t;
  const ex = Math.cos(a) * ring.a;
  const ey = Math.sin(a) * ring.b;
  const c = Math.cos(ring.tilt);
  const s = Math.sin(ring.tilt);
  const depth = Math.sin(a);
  return { x: L.cx + ex * c - ey * s, y: L.cy + ex * s + ey * c, depth, scale: 1 + DEPTH_SCALE * depth };
}

/** The planet and its belt, if it has one. */
export function bodyRect(slot: PlanetSlot, p: PlanetPos): Rect {
  const r = slot.radius * p.scale;
  const hw = slot.belt ? r * 2.1 : r;
  return { x: p.x - hw, y: p.y - r, w: hw * 2, h: r * 2 };
}

/** Under, over, or beside the planet on the side away from the mark. */
const ANCHORS = ['below', 'above', 'side'] as const;

/** The name plate hangs off its planet, nudged in from the screen edges. */
export function plateRect(L: IntroLayout, slot: PlanetSlot, p: PlanetPos, anchor = 0): Rect {
  const r = slot.radius * p.scale;
  const { plateW: w, plateH: h } = L;
  let x = p.x - w / 2;
  let y = p.y + r + PLATE_GAP;
  if (ANCHORS[anchor] === 'above') y = p.y - r - PLATE_GAP - h;
  if (ANCHORS[anchor] === 'side') {
    const reach = (slot.belt ? r * 2.1 : r) + PLATE_GAP;
    x = p.x < L.cx ? p.x - reach - w : p.x + reach;
    y = p.y - h / 2;
  }
  return { x: clamp(x, EDGE, L.w - EDGE - w), y, w, h };
}

export function markRect(L: IntroLayout): Rect {
  const hw = L.s * X_ASPECT;
  return { x: L.cx - hw, y: L.cy - L.s, w: hw * 2, h: L.s * 2 };
}

export function skipRect(L: IntroLayout): Rect {
  return { x: L.w - SKIP_W, y: L.h - SKIP_H, w: SKIP_W, h: SKIP_H };
}

function windowSpan(k: number): [number, number] {
  const t0 = LABEL_FROM + k * LABEL_WINDOW;
  return [t0, Math.min(t0 + LABEL_WINDOW, INTRO_IMPACT)];
}

/**
 * Which banners show in each window. Planets move too fast for every label
 * to stay up, so each window takes the labels that stay clear of everything
 * for its whole span, least-shown first. On a phone that rotates them through;
 * on a big screen most stay up throughout.
 */
function labelSchedule(L: IntroLayout): number[][] {
  const n = Math.ceil((INTRO_IMPACT - LABEL_FROM) / LABEL_WINDOW);
  const mark = markRect(L);
  const skip = skipRect(L);
  const shown = L.slots.map(() => 0);
  const out: number[][] = [];
  let prev = L.slots.map(() => -1);

  for (let k = 0; k < n; k++) {
    const [t0, t1] = windowSpan(k);
    const times: number[] = [];
    for (let t = t0; t < t1 + 1e-6; t += LABEL_STEP) times.push(Math.min(t, t1));
    const pos = times.map((t) => L.slots.map((slot) => planetAt(L, slot, t)));
    const bodies = pos.map((row) => row.map((p, i) => bodyRect(L.slots[i], p)));

    const order = L.slots
      .map((_, i) => i)
      .sort((a, b) => shown[a] - shown[b] || Number(prev[b] >= 0) - Number(prev[a] >= 0) || a - b);
    const on = L.slots.map(() => -1);
    const taken: Rect[][] = times.map(() => []);
    for (const i of order) {
      // Keep last window's anchor if it still works, so a banner doesn't jump.
      const tries = prev[i] >= 0 ? [prev[i], ...ANCHORS.keys()] : [...ANCHORS.keys()];
      for (const anchor of tries) {
        const rects = pos.map((row) => plateRect(L, L.slots[i], row[i], anchor));
        const clear = rects.every((r, q) => {
          if (r.y < EDGE || r.y + r.h > L.h - EDGE) return false;
          if (overlaps(r, mark, 8) || overlaps(r, skip, 2)) return false;
          if (bodies[q].some((b, j) => j !== i && overlaps(r, b, 4))) return false;
          return taken[q].every((o) => !overlaps(r, o, 6));
        });
        if (!clear) continue;
        on[i] = anchor;
        rects.forEach((r, q) => taken[q].push(r));
        shown[i]++;
        break;
      }
    }
    out.push(on);
    prev = on;
  }
  return out;
}

/**
 * Planet `i`'s banner at t: how visible it is and where it hangs. It fades
 * inside its window, never across one, so two banners never share a spot.
 */
export function labelAt(L: IntroLayout, i: number, t: number): { alpha: number; anchor: number } {
  const k = Math.floor((t - LABEL_FROM) / LABEL_WINDOW);
  const hidden = { alpha: 0, anchor: 0 };
  if (k < 0 || k >= L.labels.length) return hidden;
  const anchor = L.labels[k][i];
  if (anchor < 0) return hidden;
  const [t0, t1] = windowSpan(k);
  let a = 1;
  if (k === 0 || L.labels[k - 1][i] !== anchor) a = Math.min(a, (t - t0) / LABEL_FADE);
  if (k < L.labels.length - 1 && L.labels[k + 1][i] !== anchor) a = Math.min(a, (t1 - t) / LABEL_FADE);
  return { alpha: Math.min(1, Math.max(0, a)), anchor };
}
