/**
 * Samples the Xomware mark into a point cloud for the starfield constellation.
 *
 * The constellation used to be two straight lines of ~26 stars, which read as
 * a close-button rather than the brand. This walks the real logo's alpha
 * channel instead, so the stars trace the actual painted brush strokes —
 * uneven edges, tapered ends and the gap where the strokes cross included.
 *
 * Run: node scripts/generate-x-points.mjs
 * Output: src/app/components/space-journey/x-points.ts (committed)
 */
import { execFileSync } from 'node:child_process';
import { writeFileSync } from 'node:fs';

const SOURCE = 'src/assets/img/xomware-icon.webp';
const OUT = 'src/app/components/space-journey/x-points.ts';
/** Sampling grid. Higher = finer detail in the stroke edges. */
const GRID = 132;
/** How many stars end up in the mark. */
const TARGET_POINTS = 460;
/** Alpha above which a pixel counts as part of the mark. */
const ALPHA_CUTOFF = 130;

// Deterministic sampling, so regenerating gives byte-identical output.
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

// `txt:` gives one line per pixel; the alpha channel becomes grey levels.
const raw = execFileSync(
  'magick',
  [SOURCE, '-alpha', 'extract', '-resize', `${GRID}x${GRID}!`, '-depth', '8', 'txt:-'],
  { encoding: 'utf8', maxBuffer: 64 * 1024 * 1024 },
);

const filled = [];
for (const line of raw.split('\n')) {
  // e.g. "12,34: (255,255,255)  #FFFFFF  gray(255)"
  const m = /^(\d+),(\d+):\s*\((\d+)/.exec(line);
  if (!m) continue;
  const value = Number(m[3]);
  if (value < ALPHA_CUTOFF) continue;
  filled.push([Number(m[1]), Number(m[2])]);
}

if (!filled.length) throw new Error('No opaque pixels found — check SOURCE/ALPHA_CUTOFF');

// Even sampling across the whole mark, rather than the first N in raster
// order, so both strokes are covered evenly.
const rand = mulberry32(0x584f4d58);
const picked = [];
const pool = [...filled];
const count = Math.min(TARGET_POINTS, pool.length);
for (let i = 0; i < count; i++) {
  picked.push(pool.splice(Math.floor(rand() * pool.length), 1)[0]);
}

// Normalise to -1..1 about the mark's own centre, so the constellation is
// centred on the artwork rather than on the (padded) canvas.
const xs = filled.map((p) => p[0]);
const ys = filled.map((p) => p[1]);
const minX = Math.min(...xs);
const maxX = Math.max(...xs);
const minY = Math.min(...ys);
const maxY = Math.max(...ys);
const halfW = (maxX - minX) / 2;
const halfH = (maxY - minY) / 2;
const cx = minX + halfW;
const cy = minY + halfH;
const half = Math.max(halfW, halfH);

const points = picked
  .map(([x, y]) => [(x - cx) / half, (y - cy) / half])
  .map(([x, y]) => [Math.round(x * 1000) / 1000, Math.round(y * 1000) / 1000]);

const body = points.map(([x, y]) => `  [${x}, ${y}],`).join('\n');

writeFileSync(
  OUT,
  `/**
 * Point cloud of the Xomware mark, sampled from ${SOURCE}.
 *
 * GENERATED — do not edit by hand. Regenerate with:
 *   node scripts/generate-x-points.mjs
 *
 * Coordinates are -1..1 about the centre of the artwork, y pointing down.
 * ${points.length} points sampled from ${filled.length} opaque pixels on a ${GRID}x${GRID} grid.
 */
export const X_POINTS: ReadonlyArray<readonly [number, number]> = [
${body}
];
`,
);

console.log(`Wrote ${points.length} points to ${OUT} (from ${filled.length} opaque pixels)`);
