/**
 * Traces the Xomware mark into the intro's constellation.
 *
 * Reads the alpha channel of the real logo and writes three things:
 * - X_STROKES: the outline of each brush stroke, found by walking the stroke's
 *   axis and measuring the painted width across it. These are the
 *   constellation's anchor stars and lines.
 * - X_POINTS: stars scattered through the painted area, the body of the mark.
 * - X_ART: where the artwork sits, so the image can be laid exactly over the
 *   stars when the constellation resolves into it.
 *
 * Run: node scripts/generate-x-points.mjs
 * Output: src/app/space/x-points.ts (committed)
 */
import { execFileSync } from 'node:child_process';
import { writeFileSync } from 'node:fs';

const SOURCE = 'src/assets/img/xomware-icon.webp';
const OUT = 'src/app/space/x-points.ts';
const SIZE = 500;
const DUST = 320;
/** Anchor stars down each edge of a stroke. */
const STATIONS = 11;
/**
 * Hand-placed ends of each stroke's axis in the 500px artwork, painted order:
 * top-left down to bottom-right, then top-right down to bottom-left. The
 * tracer follows the real paint from there.
 */
const AXES = [
  [
    [125, 22],
    [410, 445],
  ],
  [
    [398, 66],
    [92, 410],
  ],
];

const alpha = execFileSync('magick', [SOURCE, '-alpha', 'extract', '-resize', `${SIZE}x${SIZE}!`, '-depth', '8', 'gray:-'], {
  maxBuffer: 16 * 1024 * 1024,
});
const solid = (x, y) => {
  const px = Math.round(x);
  const py = Math.round(y);
  return px >= 0 && py >= 0 && px < SIZE && py < SIZE && alpha[py * SIZE + px] > 128;
};

function mulberry32(seed) {
  let a = seed;
  return () => {
    a |= 0;
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/** Cross-sections of the paint along one stroke's axis: [distance along, near edge, far edge]. */
function sections([p0, p1]) {
  const len = Math.hypot(p1[0] - p0[0], p1[1] - p0[1]);
  const d = [(p1[0] - p0[0]) / len, (p1[1] - p0[1]) / len];
  const n = [-d[1], d[0]];
  const out = [];
  let centre = 0;
  for (let s = -60; s <= len + 60; s += 3) {
    const c = [p0[0] + d[0] * s, p0[1] + d[1] * s];
    const runs = [];
    let run = null;
    let gap = 0;
    for (let o = -80; o <= 80; o += 0.5) {
      if (solid(c[0] + n[0] * o, c[1] + n[1] * o)) {
        if (!run) runs.push((run = [o, o]));
        run[1] = o;
        gap = 0;
      } else if (run && (gap += 0.5) > 7) {
        // Bridges the dry-brush streaks inside a stroke, not the gap between strokes.
        run = null;
      }
    }
    if (!runs.length) continue;
    const best = runs.reduce((a, b) => (Math.abs((b[0] + b[1]) / 2 - centre) < Math.abs((a[0] + a[1]) / 2 - centre) ? b : a));
    centre = (best[0] + best[1]) / 2;
    out.push({ s, lo: best[0], hi: best[1] });
  }
  return { out, p0, d, n };
}

function outline(axis) {
  const { out, p0, d, n } = sections(axis);
  const widths = out.map((x) => x.hi - x.lo).sort((a, b) => a - b);
  const median = widths[widths.length >> 1];
  // Where the strokes cross, the section takes in both; bridge it from either side.
  const ok = out.map((x) => x.hi - x.lo < median * 1.3);
  const lo = out.map((x) => x.lo);
  const hi = out.map((x) => x.hi);
  for (let i = 0; i < out.length; i++) {
    if (ok[i]) continue;
    let j = i;
    while (j > 0 && !ok[j]) j--;
    let k = i;
    while (k < out.length - 1 && !ok[k]) k++;
    const f = (i - j) / (k - j);
    lo[i] = lo[j] + (lo[k] - lo[j]) * f;
    hi[i] = hi[j] + (hi[k] - hi[j]) * f;
  }
  const smooth = (arr) =>
    arr.map((_, i) => {
      const win = arr.slice(Math.max(0, i - 3), i + 4);
      return win.reduce((a, b) => a + b, 0) / win.length;
    });
  const L = smooth(lo);
  const H = smooth(hi);
  const at = (i, o) => [p0[0] + d[0] * out[i].s + n[0] * o, p0[1] + d[1] * out[i].s + n[1] * o];
  const left = [];
  const right = [];
  for (let q = 0; q < STATIONS; q++) {
    const i = Math.round((q / (STATIONS - 1)) * (out.length - 1));
    left.push(at(i, L[i]));
    right.push(at(i, H[i]));
  }
  return { left, right };
}

const filled = [];
for (let y = 0; y < SIZE; y += 2) {
  for (let x = 0; x < SIZE; x += 2) if (solid(x, y)) filled.push([x, y]);
}
if (!filled.length) throw new Error(`No opaque pixels in ${SOURCE}`);

const xs = filled.map((p) => p[0]);
const ys = filled.map((p) => p[1]);
const minX = Math.min(...xs);
const maxX = Math.max(...xs);
const minY = Math.min(...ys);
const maxY = Math.max(...ys);
const cx = (minX + maxX) / 2;
const cy = (minY + maxY) / 2;
const half = Math.max(maxX - minX, maxY - minY) / 2;
const norm = ([x, y]) => [Math.round(((x - cx) / half) * 1000) / 1000, Math.round(((y - cy) / half) * 1000) / 1000];

const rand = mulberry32(0x584f4d58);
const pool = [...filled];
const dust = [];
for (let i = 0; i < DUST; i++) dust.push(norm(pool.splice(Math.floor(rand() * pool.length), 1)[0]));

const strokes = AXES.map(outline).map(({ left, right }) => ({ left: left.map(norm), right: right.map(norm) }));

// Where the two axes cross: the ship aims here.
const [[a0, a1], [b0, b1]] = AXES;
const den = (a1[0] - a0[0]) * (b1[1] - b0[1]) - (a1[1] - a0[1]) * (b1[0] - b0[0]);
const u = ((b0[0] - a0[0]) * (b1[1] - b0[1]) - (b0[1] - a0[1]) * (b1[0] - b0[0])) / den;
const cross = norm([a0[0] + (a1[0] - a0[0]) * u, a0[1] + (a1[1] - a0[1]) * u]);

const list = (pts) => pts.map(([x, y]) => `[${x}, ${y}]`).join(', ');
const r4 = (v) => Math.round(v * 10000) / 10000;

writeFileSync(
  OUT,
  `/**
 * The Xomware mark, traced from ${SOURCE}.
 *
 * GENERATED — do not edit by hand. Regenerate with:
 *   node scripts/generate-x-points.mjs
 *
 * Coordinates are -1..1 about the centre of the painted area, y pointing down.
 */

type Point = readonly [number, number];

export interface XStroke {
  /** One edge of the brush stroke, from the start of the stroke to its end. */
  left: readonly Point[];
  right: readonly Point[];
}

/** The two brush strokes, in the order they were painted. */
export const X_STROKES: readonly XStroke[] = [
${strokes.map((s) => `  {\n    left: [${list(s.left)}],\n    right: [${list(s.right)}],\n  },`).join('\n')}
];

/** ${DUST} stars spread through the painted area. */
export const X_POINTS: readonly Point[] = [
${dust.map(([x, y]) => `  [${x}, ${y}],`).join('\n')}
];

/** Where the strokes cross. */
export const X_CROSS: Point = [${cross[0]}, ${cross[1]}];

/** The artwork's centre and half-extent, as fractions of the image, to lay the image over the stars. */
export const X_ART = { cx: ${r4(cx / SIZE)}, cy: ${r4(cy / SIZE)}, half: ${r4(half / SIZE)} } as const;

/** Painted width over painted height: the mark spans ±X_ASPECT across and ±1 down. */
export const X_ASPECT = ${r4((maxX - minX) / (maxY - minY))};
`,
);

console.log(`Wrote ${OUT}: ${STATIONS} stations per stroke, ${dust.length} dust stars`);
