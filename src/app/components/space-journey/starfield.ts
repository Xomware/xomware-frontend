/**
 * Parallax starfield rendered to a 2D canvas.
 *
 * Deliberately hand-written rather than pulled from a particle library: the
 * app ships every route in the initial bundle (no lazy loading), so a WebGL
 * or particle dependency would eat the whole remaining budget. This is a few
 * hundred rectangles per frame and costs nothing.
 *
 * Angular-free on purpose — it owns a canvas and a rAF loop, nothing else,
 * so it stays testable and can't leak change detection.
 */

interface Star {
  /** Position in world space, 0..1. Wrapped on draw, so the field is endless. */
  x: number;
  y: number;
  size: number;
  alpha: number;
  layer: number;
}

/** Parallax rate per layer. Nearer layers travel faster. */
const LAYER_SPEED = [0.25, 0.55, 1];
/** Share of the total star count in each layer — most stars sit far away. */
const LAYER_SHARE = [0.5, 0.32, 0.18];

const BASE_STAR_COUNT = 260;
/** Retina is worth it; beyond 2x is invisible and costs 4x the fill rate. */
const MAX_DPR = 2;

/**
 * Deterministic PRNG (mulberry32).
 *
 * A fixed seed means the same sky every load, so a visual-regression run or
 * a bug report describes a reproducible scene rather than a new random one.
 */
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

export class Starfield {
  private ctx: CanvasRenderingContext2D | null;
  private stars: Star[] = [];
  private frame = 0;
  private running = false;
  private width = 0;
  private height = 0;
  private dpr = 1;

  /** Journey scroll progress, 0..1, driven by ScrollTrigger. */
  private progress = 0;
  /** Eased follower of `progress` so the field glides instead of snapping. */
  private renderedProgress = 0;

  constructor(private canvas: HTMLCanvasElement, starCount = BASE_STAR_COUNT) {
    this.ctx = canvas.getContext('2d');
    this.seed(starCount);
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
          // Far stars are sub-pixel points; near ones read as small discs.
          size: 0.4 + layer * 0.5 + rand() * 0.7,
          alpha: 0.25 + rand() * 0.6,
          layer,
        });
      }
    });
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

  /** Paint one frame without starting the loop — used for reduced motion. */
  renderStatic(): void {
    this.renderedProgress = this.progress;
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
    this.ctx = null;
  }

  private tick = (): void => {
    if (!this.running) return;
    // Chase the target progress. Scroll updates arrive in jumps; this turns
    // them into continuous motion so the field never visibly steps.
    this.renderedProgress += (this.progress - this.renderedProgress) * 0.08;
    this.draw();
    this.frame = requestAnimationFrame(this.tick);
  };

  private draw(): void {
    const ctx = this.ctx;
    if (!ctx || !this.width) return;

    ctx.clearRect(0, 0, this.width, this.height);

    // Travel distance in screen widths across the whole journey. Higher than
    // the rail's own travel so the sky reads as much deeper than the planets.
    const travel = this.renderedProgress * this.width * 6;

    for (const star of this.stars) {
      const speed = LAYER_SPEED[star.layer];
      // Wrap into [0, width) so the field repeats seamlessly as we fly.
      let x = (star.x * this.width - travel * speed) % this.width;
      if (x < 0) x += this.width;

      const y = star.y * this.height;

      ctx.globalAlpha = star.alpha;
      ctx.fillStyle = '#ffffff';
      // fillRect beats arc()+fill by a wide margin at this count, and at
      // these sizes the difference is not visible.
      ctx.fillRect(x, y, star.size, star.size);
    }

    ctx.globalAlpha = 1;
  }
}
