import { X_POINTS } from './x-points';

/**
 * Parallax starfield, rendered to a 2D canvas.
 *
 * Deliberately hand-written rather than pulled from a particle library: the
 * app ships every route in the initial bundle (no lazy loading), so a WebGL
 * or particle dependency would eat the whole remaining budget.
 *
 * There are no drawn lines anywhere in here. An earlier version connected
 * neighbouring stars and traced the mark with two strokes, which read as a
 * diagram rather than a sky. The constellation is made of stars alone — 460 of
 * them, sampled from the real logo artwork (see x-points.ts), so the brush
 * texture of the painted X is what actually forms.
 *
 * Angular-free on purpose — it owns a canvas and a rAF loop, nothing else.
 */

interface Star {
  /** Position in world space, 0..1. Wrapped on draw, so the field is endless. */
  x: number;
  y: number;
  size: number;
  alpha: number;
  layer: number;
  /** Phase offset so twinkling isn't synchronised across the field. */
  phase: number;
  /** Index into STAR_COLOURS. */
  tint: number;
  /** Bright enough to get a drawn halo. */
  luminous: boolean;
  /** Target in the mark, -1..1 about centre. Null for stars not in the X. */
  tx: number | null;
  ty: number | null;
}

/** Parallax rate per layer. Nearer layers travel faster. */
const LAYER_SPEED = [0.25, 0.55, 1];
const LAYER_SHARE = [0.46, 0.33, 0.21];

const BASE_STAR_COUNT = 640;
/** Retina is worth it; beyond 2x is invisible and costs 4x the fill rate. */
const MAX_DPR = 2;

/**
 * Real starlight isn't white. Skewed towards blue-white and white, with a few
 * warmer ones — roughly what the eye picks out on a clear night.
 */
const STAR_COLOURS = [
  '255, 255, 255',
  '226, 238, 255',
  '198, 220, 255',
  '255, 244, 224',
  '255, 226, 190',
];
const COLOUR_WEIGHTS = [0.42, 0.24, 0.16, 0.12, 0.06];

/** Half-extent of the assembled mark, as a fraction of the smaller viewport side. */
const X_SPAN = 0.42;

function mulberry32(seed: number): () => number {
  let a = seed;
  return () => {
    a |= 0;
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function pickColour(r: number): number {
  let acc = 0;
  for (let i = 0; i < COLOUR_WEIGHTS.length; i++) {
    acc += COLOUR_WEIGHTS[i];
    if (r <= acc) return i;
  }
  return 0;
}

export class Starfield {
  private ctx: CanvasRenderingContext2D | null;
  private stars: Star[] = [];
  /** Only the stars that belong to the mark, cached to avoid re-filtering. */
  private xStars: Star[] = [];
  /** Pre-rendered halo, so bright stars cost one drawImage instead of a gradient. */
  private glow: HTMLCanvasElement | null = null;
  private frame = 0;
  private running = false;
  private width = 0;
  private height = 0;
  private dpr = 1;
  private time = 0;

  private progress = 0;
  private renderedProgress = 0;
  private formation = 0;
  private renderedFormation = 0;

  constructor(private canvas: HTMLCanvasElement, starCount = BASE_STAR_COUNT) {
    this.ctx = canvas.getContext('2d');
    this.seed(starCount);
    this.buildGlow();
  }

  private seed(count: number): void {
    const rand = mulberry32(0x58_4f_4d_57); // "XOMW"
    this.stars = [];

    LAYER_SHARE.forEach((share, layer) => {
      const n = Math.round(count * share);
      for (let i = 0; i < n; i++) {
        this.stars.push({
          x: rand(),
          y: rand(),
          // Mostly sub-pixel dust with a handful of larger stars — an evenly
          // sized field is the thing that reads as "generated".
          size: 0.5 + layer * 0.35 + Math.pow(rand(), 2.2) * 1.5,
          alpha: 0.2 + Math.pow(rand(), 1.6) * 0.75,
          layer,
          phase: rand() * Math.PI * 2,
          tint: pickColour(rand()),
          luminous: rand() > 0.975,
          tx: null,
          ty: null,
        });
      }
    });

    this.assignMark(rand);
  }

  /**
   * Hand out the mark's sampled points to a random spread of stars.
   *
   * Drawn from the whole field rather than one layer, so the X assembles from
   * every depth at once instead of a single plane sliding into place.
   */
  private assignMark(rand: () => number): void {
    const pool = [...this.stars];
    this.xStars = [];

    const count = Math.min(X_POINTS.length, pool.length);
    for (let i = 0; i < count; i++) {
      const star = pool.splice(Math.floor(rand() * pool.length), 1)[0];
      const [tx, ty] = X_POINTS[i];
      star.tx = tx;
      star.ty = ty;
      this.xStars.push(star);
    }
  }

  /** Soft radial halo used for the brightest stars. */
  private buildGlow(): void {
    const size = 24;
    const c = document.createElement('canvas');
    c.width = size;
    c.height = size;
    const g = c.getContext('2d');
    if (!g) return;

    const grad = g.createRadialGradient(size / 2, size / 2, 0, size / 2, size / 2, size / 2);
    grad.addColorStop(0, 'rgba(255, 255, 255, 0.55)');
    grad.addColorStop(0.35, 'rgba(255, 255, 255, 0.14)');
    grad.addColorStop(1, 'rgba(255, 255, 255, 0)');
    g.fillStyle = grad;
    g.fillRect(0, 0, size, size);
    this.glow = c;
  }

  resize(): void {
    const rect = this.canvas.getBoundingClientRect();
    if (!rect.width || !rect.height) return;

    this.dpr = Math.min(window.devicePixelRatio || 1, MAX_DPR);
    this.width = rect.width;
    this.height = rect.height;
    this.canvas.width = Math.round(rect.width * this.dpr);
    this.canvas.height = Math.round(rect.height * this.dpr);
    this.ctx?.setTransform(this.dpr, 0, 0, this.dpr, 0, 0);
    this.draw();
  }

  setProgress(p: number): void {
    this.progress = p;
  }

  /** 0 = scattered, 1 = assembled into the mark. Driven by the timeline. */
  setFormation(v: number): void {
    this.formation = Math.min(Math.max(v, 0), 1);
  }

  /** Paint one frame without starting the loop — used for reduced motion. */
  renderStatic(): void {
    this.renderedProgress = this.progress;
    this.renderedFormation = this.formation;
    this.draw();
  }

  start(): void {
    if (this.running || !this.ctx) return;
    this.running = true;
    this.tick();
  }

  stop(): void {
    this.running = false;
    if (this.frame) cancelAnimationFrame(this.frame);
    this.frame = 0;
  }

  destroy(): void {
    this.stop();
    this.stars = [];
    this.xStars = [];
    this.glow = null;
    this.ctx = null;
  }

  private tick = (): void => {
    if (!this.running) return;
    this.renderedProgress += (this.progress - this.renderedProgress) * 0.08;
    this.renderedFormation += (this.formation - this.renderedFormation) * 0.055;
    this.time += 0.016;
    this.draw();
    this.frame = requestAnimationFrame(this.tick);
  };

  private draw(): void {
    const ctx = this.ctx;
    if (!ctx || !this.width) return;

    ctx.clearRect(0, 0, this.width, this.height);

    const travel = this.renderedProgress * this.width * 6;
    const form = this.renderedFormation;
    const cx = this.width / 2;
    const cy = this.height / 2;
    const scale = Math.min(this.width, this.height) * X_SPAN;

    for (const star of this.stars) {
      let x = (star.x * this.width - travel * LAYER_SPEED[star.layer]) % this.width;
      if (x < 0) x += this.width;
      let y = star.y * this.height;

      // Stars belonging to the mark ease toward their sampled point.
      let assembled = 0;
      if (form > 0.001 && star.tx !== null && star.ty !== null) {
        assembled = form;
        x += (cx + star.tx * scale - x) * form;
        y += (cy + star.ty * scale - y) * form;
      }

      // Slow twinkle. Small amplitude — the sky should read as alive, not
      // as blinking.
      const twinkle = 0.78 + Math.sin(this.time * 1.3 + star.phase) * 0.22;

      // Contrast is what makes the mark readable without drawing a single
      // line: its stars brighten and swell while the rest of the sky falls
      // back. Brightening the mark alone wasn't enough — against a full field
      // the shape stayed lost in the noise.
      const isMark = star.tx !== null;
      const recede = isMark ? 1 : 1 - form * 0.72;
      const alpha = Math.min(1, star.alpha * twinkle * recede + assembled * 0.85);
      const size = star.size + assembled * 1.5;

      if (star.luminous && this.glow) {
        const halo = (star.size + 1.5 + assembled * 2) * 7;
        ctx.globalAlpha = alpha * 0.75;
        ctx.drawImage(this.glow, x - halo / 2, y - halo / 2, halo, halo);
      }

      ctx.globalAlpha = alpha;
      ctx.fillStyle = `rgb(${STAR_COLOURS[star.tint]})`;
      // fillRect beats arc()+fill by a wide margin at this count, and at these
      // sizes the difference is not visible.
      ctx.fillRect(x, y, size, size);
    }

    ctx.globalAlpha = 1;
  }
}
