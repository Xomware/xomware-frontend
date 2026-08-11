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
const TARGET_POINTS = 620;
/**
 * Share of points placed on the stroke edges rather than the interior.
 *
 * An evenly-filled cloud reads as a smudge at low brightness. Concentrating
 * points on the boundary gives the silhouette a crisp edge, so the mark stays
 * unmistakably the X even when the stars are dim.
 */
const EDGE_SHARE = 0.62;
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
function sample(args) {
  const raw = execFileSync('magick', args, {
    encoding: 'utf8',
    maxBuffer: 64 * 1024 * 1024,
  });
  const out = [];
  for (const line of raw.split('\n')) {
    // e.g. "12,34: (255,255,255)  #FFFFFF  gray(255)"
    const m = /^(\d+),(\d+):\s*\((\d+)/.exec(line);
    if (!m) continue;
    if (Number(m[3]) < ALPHA_CUTOFF) continue;
    out.push([Number(m[1]), Number(m[2])]);
  }
  return out;
}

const base = [SOURCE, '-alpha', 'extract', '-resize', `${GRID}x${GRID}!`, '-threshold', '50%'];
const filled = sample([...base, '-depth', '8', 'txt:-']);
// EdgeOut leaves just the boundary band of the strokes.
const edges = sample([...base, '-morphology', 'EdgeOut', 'Octagon:1', '-depth', '8', 'txt:-']);

if (!filled.length) throw new Error('No opaque pixels found — check SOURCE/ALPHA_CUTOFF');
if (!edges.length) throw new Error('No edge pixels found — check the morphology step');

const edgeKeys = new Set(edges.map(([x, y]) => `${x},${y}`));
const interior = filled.filter(([x, y]) => !edgeKeys.has(`${x},${y}`));

// Even sampling across the whole mark, rather than the first N in raster
// order, so both strokes are covered evenly.
const rand = mulberry32(0x584f4d58);

function take(source, n) {
  const pool = [...source];
  const out = [];
  const count = Math.min(n, pool.length);
  for (let i = 0; i < count; i++) {
    out.push(pool.splice(Math.floor(rand() * pool.length), 1)[0]);
  }
  return out;
}

const edgeCount = Math.round(TARGET_POINTS * EDGE_SHARE);
const picked = [
  ...take(edges, edgeCount),
  ...take(interior, TARGET_POINTS - edgeCount),
];

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
 * ${points.length} points on a ${GRID}x${GRID} grid, ${Math.round(EDGE_SHARE * 100)}% of them on the
 * stroke edges so the silhouette stays crisp when the stars are dim.
 */
export const X_POINTS: ReadonlyArray<readonly [number, number]> = [
${body}
];
`,
);

console.log(
  `Wrote ${points.length} points to ${OUT} ` +
    `(${edges.length} edge / ${interior.length} interior pixels available)`,
);
