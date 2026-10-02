import { mulberry32 } from './starfield';

/** A drifting, tumbling rock. Positions are screen pixels at t = 0. */
export interface Rock {
  x: number;
  y: number;
  vx: number;
  vy: number;
  r: number;
  angle: number;
  spin: number;
  sprite: number;
  /** Behind the mark below 0, in front above. */
  z: number;
  /** When a shot broke it apart, if one did. */
  broken: number;
}

/** A laser bolt, fired at t0 and gone at `end`, early if it struck a rock. */
export interface Bolt {
  t0: number;
  x: number;
  y: number;
  dx: number;
  dy: number;
  speed: number;
  end: number;
  rgb: string;
  struck: boolean;
}

export interface Comet {
  t0: number;
  t1: number;
  from: [number, number];
  to: [number, number];
}

export const rockAt = (rock: Rock, t: number): [number, number] => [rock.x + rock.vx * t, rock.y + rock.vy * t];

/**
 * Rock sprites, baked once: an irregular outline, shaded from the upper left,
 * with a few craters. The scene tumbles them, which turns the light with them
 * as a tumbling rock would.
 */
export function bakeRocks(count: number, size: number): HTMLCanvasElement[] {
  const rand = mulberry32(0xa57);
  const out: HTMLCanvasElement[] = [];
  for (let k = 0; k < count; k++) {
    const c = document.createElement('canvas');
    c.width = c.height = size;
    out.push(c);
    const g = c.getContext('2d');
    if (!g) continue;
    const half = size / 2;
    const r = half * 0.9;
    const n = 9 + Math.floor(rand() * 4);
    g.beginPath();
    for (let i = 0; i < n; i++) {
      const a = (i / n) * Math.PI * 2;
      // Never below 0.62, or the outline folds in and reads as a star.
      const d = r * (0.62 + rand() * 0.38);
      if (i === 0) g.moveTo(half + Math.cos(a) * d, half + Math.sin(a) * d);
      else g.lineTo(half + Math.cos(a) * d, half + Math.sin(a) * d);
    }
    g.closePath();
    const shade = g.createLinearGradient(half - r, half - r, half + r, half + r);
    shade.addColorStop(0, 'rgb(138, 132, 128)');
    shade.addColorStop(0.5, 'rgb(72, 70, 76)');
    shade.addColorStop(1, 'rgb(24, 24, 32)');
    g.fillStyle = shade;
    g.fill();
    g.save();
    g.clip();
    for (let i = 0; i < 4; i++) {
      const cx = half + (rand() - 0.5) * r;
      const cy = half + (rand() - 0.5) * r;
      const cr = r * (0.1 + rand() * 0.16);
      g.fillStyle = 'rgba(16, 16, 22, 0.45)';
      g.beginPath();
      g.arc(cx, cy, cr, 0, Math.PI * 2);
      g.fill();
      g.strokeStyle = 'rgba(190, 184, 176, 0.25)';
      g.lineWidth = size / 64;
      g.beginPath();
      g.arc(cx + cr * 0.2, cy + cr * 0.2, cr, Math.PI * 0.9, Math.PI * 1.6);
      g.stroke();
    }
    g.restore();
  }
  return out;
}

/** A comet: a hot head in its coma, and a tapered dust tail streaming behind. */
export function drawComet(ctx: CanvasRenderingContext2D, comet: Comet, t: number, sprite: HTMLCanvasElement, len: number): void {
  if (t <= comet.t0 || t >= comet.t1) return;
  const u = (t - comet.t0) / (comet.t1 - comet.t0);
  const a = Math.min(1, u * 6, (1 - u) * 6);
  const [x0, y0] = comet.from;
  const [x1, y1] = comet.to;
  const x = x0 + (x1 - x0) * u;
  const y = y0 + (y1 - y0) * u;
  const d = Math.hypot(x1 - x0, y1 - y0) || 1;
  const dx = (x1 - x0) / d;
  const dy = (y1 - y0) / d;
  const tx = x - dx * len;
  const ty = y - dy * len;
  const w = len * 0.06;

  ctx.globalCompositeOperation = 'lighter';
  const tail = ctx.createLinearGradient(x, y, tx, ty);
  tail.addColorStop(0, `rgba(200, 236, 255, ${0.5 * a})`);
  tail.addColorStop(0.3, `rgba(120, 190, 255, ${0.2 * a})`);
  tail.addColorStop(1, 'rgba(80, 140, 255, 0)');
  ctx.fillStyle = tail;
  ctx.beginPath();
  ctx.moveTo(x - dy * w * 0.3, y + dx * w * 0.3);
  ctx.quadraticCurveTo(x - dx * len * 0.5 - dy * w, y - dy * len * 0.5 + dx * w, tx - dy * w * 1.6, ty + dx * w * 1.6);
  ctx.lineTo(tx + dy * w * 0.6, ty - dx * w * 0.6);
  ctx.quadraticCurveTo(x - dx * len * 0.5 + dy * w * 0.4, y - dy * len * 0.5 - dx * w * 0.4, x + dy * w * 0.3, y - dx * w * 0.3);
  ctx.closePath();
  ctx.fill();
  // The straight blue ion tail.
  ctx.strokeStyle = `rgba(140, 200, 255, ${0.22 * a})`;
  ctx.lineWidth = 1;
  ctx.beginPath();
  ctx.moveTo(x, y);
  ctx.lineTo(x - dx * len * 1.3, y - dy * len * 1.3);
  ctx.stroke();

  ctx.globalAlpha = a;
  const coma = w * 5;
  ctx.drawImage(sprite, x - coma / 2, y - coma / 2, coma, coma);
  ctx.drawImage(sprite, x - coma / 5, y - coma / 5, coma / 2.5, coma / 2.5);
  ctx.globalAlpha = 1;
  ctx.globalCompositeOperation = 'source-over';
}
