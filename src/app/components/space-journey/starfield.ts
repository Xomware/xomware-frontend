/**
 * Parallax starfield with living constellations, rendered to a 2D canvas.
 *
 * Deliberately hand-written rather than pulled from a particle library: the
 * app ships every route in the initial bundle (no lazy loading), so a WebGL
 * or particle dependency would eat the whole remaining budget. This is a few
 * hundred rectangles and a handful of lines per frame, and costs nothing.
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
  /** Phase offset so twinkling isn't synchronised across the field. */
  phase: number;
}

/** A star that also belongs to the Xomware X, with a target to fly to. */
interface Node {
  star: Star;
  /** Target offset from centre, in units of the formation scale. */
  tx: number;
  ty: number;
  stroke: 0 | 1;
}

/** Parallax rate per layer. Nearer layers travel faster. */
const LAYER_SPEED = [0.25, 0.55, 1];
/** Share of the total star count in each layer — most stars sit far away. */
const LAYER_SHARE = [0.5, 0.32, 0.18];

const BASE_STAR_COUNT = 260;
/** Retina is worth it; beyond 2x is invisible and costs 4x the fill rate. */
const MAX_DPR = 2;

/** Nodes per stroke of the X. Two strokes, so double this in total. */
const NODES_PER_STROKE = 13;
/** Half-extent of the X, as a fraction of the smaller viewport dimension. */
const X_SPAN = 0.34;
/** Stars closer than this (px) get an ambient link drawn between them. */
const LINK_DISTANCE = 96;

const CYAN = '0, 180, 216';

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
  private nodes: Node[] = [];
  /** Front-layer stars only — the ones eligible for ambient links. */
  private linkable: Star[] = [];
  private frame = 0;
  private running = false;
  private width = 0;
  private height = 0;
  private dpr = 1;
  private time = 0;

  /** Journey scroll progress, 0..1, driven by ScrollTrigger. */
  private progress = 0;
  /** Eased follower of `progress` so the field glides instead of snapping. */
  private renderedProgress = 0;

  /** 0 = free drift, 1 = fully assembled into the X. */
  private formation = 0;
  private renderedFormation = 0;

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
          phase: rand() * Math.PI * 2,
        });
      }
    });

    this.linkable = this.stars.filter((s) => s.layer === 2);
    this.seedConstellation(rand);
  }

  /**
   * Pick the stars that form the X and give each a target.
   *
   * Targets carry a small perpendicular jitter rather than sitting on a clean
   * diagonal: the Xomware mark is a painted brush X with uneven strokes, and a
   * geometrically perfect X reads as a close-button, not as the logo.
   */
  private seedConstellation(rand: () => number): void {
    this.nodes = [];
    const pool = [...this.linkable];

    for (const stroke of [0, 1] as const) {
      for (let i = 0; i < NODES_PER_STROKE; i++) {
        if (!pool.length) break;
        const star = pool.splice(Math.floor(rand() * pool.length), 1)[0];

        // t runs -1..1 along the stroke.
        const t = (i / (NODES_PER_STROKE - 1)) * 2 - 1;
        // Stroke 0 runs top-left→bottom-right, stroke 1 the other way.
        const dir = stroke === 0 ? 1 : -1;
        const jitter = (rand() - 0.5) * 0.1;

        this.nodes.push({
          star,
          tx: t * 0.78 * dir + jitter,
          // Slightly taller than wide, matching the mark's proportions.
          ty: t + jitter * 0.6,
          stroke,
        });
      }
    }
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

  /** 0 = scattered, 1 = assembled into the X. Driven by the timeline. */
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
    this.nodes = [];
    this.linkable = [];
    this.ctx = null;
  }

  private tick = (): void => {
    if (!this.running) return;
    // Chase the targets. Scroll updates arrive in jumps; this turns them into
    // continuous motion so the field never visibly steps.
    this.renderedProgress += (this.progress - this.renderedProgress) * 0.08;
    this.renderedFormation += (this.formation - this.renderedFormation) * 0.06;
    this.time += 0.016;
    this.draw();
    this.frame = requestAnimationFrame(this.tick);
  };

  /** Screen position of a star, including parallax wrap. */
  private starX(star: Star, travel: number): number {
    let x = (star.x * this.width - travel * LAYER_SPEED[star.layer]) % this.width;
    if (x < 0) x += this.width;
    return x;
  }

  private draw(): void {
    const ctx = this.ctx;
    if (!ctx || !this.width) return;

    ctx.clearRect(0, 0, this.width, this.height);

    // Travel distance in screen widths across the whole journey. Higher than
    // the rail's own travel so the sky reads as much deeper than the planets.
    const travel = this.renderedProgress * this.width * 6;
    const form = this.renderedFormation;

    // Where each node currently is, so links and dots agree.
    const cx = this.width / 2;
    const cy = this.height / 2;
    const scale = Math.min(this.width, this.height) * X_SPAN;
    const placed = new Map<Star, { x: number; y: number }>();

    for (const node of this.nodes) {
      const freeX = this.starX(node.star, travel);
      const freeY = node.star.y * this.height;
      const targetX = cx + node.tx * scale;
      const targetY = cy + node.ty * scale;
      placed.set(node.star, {
        x: freeX + (targetX - freeX) * form,
        y: freeY + (targetY - freeY) * form,
      });
    }

    this.drawAmbientLinks(ctx, travel, placed);
    this.drawConstellation(ctx, form, placed);

    // Stars last so they sit on top of their own links.
    for (const star of this.stars) {
      const at = placed.get(star);
      const x = at ? at.x : this.starX(star, travel);
      const y = at ? at.y : star.y * this.height;

      // Slow twinkle. Amplitude is small — this should register as the sky
      // being alive, not as blinking.
      const twinkle = 0.82 + Math.sin(this.time * 1.4 + star.phase) * 0.18;

      ctx.globalAlpha = star.alpha * twinkle;
      ctx.fillStyle = '#ffffff';
      // fillRect beats arc()+fill by a wide margin at this count, and at
      // these sizes the difference is not visible.
      ctx.fillRect(x, y, star.size, star.size);
    }

    ctx.globalAlpha = 1;
  }

  /**
   * Faint links between near neighbours in the front layer.
   *
   * Only the front layer participates (~47 stars), which keeps this at a few
   * hundred distance checks per frame instead of tens of thousands.
   */
  private drawAmbientLinks(
    ctx: CanvasRenderingContext2D,
    travel: number,
    placed: Map<Star, { x: number; y: number }>,
  ): void {
    ctx.lineWidth = 1;

    for (let i = 0; i < this.linkable.length; i++) {
      const a = this.linkable[i];
      const pa = placed.get(a);
      const ax = pa ? pa.x : this.starX(a, travel);
      const ay = pa ? pa.y : a.y * this.height;

      for (let j = i + 1; j < this.linkable.length; j++) {
        const b = this.linkable[j];
        const pb = placed.get(b);
        const bx = pb ? pb.x : this.starX(b, travel);
        const by = pb ? pb.y : b.y * this.height;

        const dx = ax - bx;
        const dy = ay - by;
        const distance = Math.hypot(dx, dy);
        if (distance > LINK_DISTANCE) continue;

        // Fade with distance so links dissolve rather than pop.
        ctx.globalAlpha = (1 - distance / LINK_DISTANCE) * 0.16;
        ctx.strokeStyle = '#ffffff';
        ctx.beginPath();
        ctx.moveTo(ax, ay);
        ctx.lineTo(bx, by);
        ctx.stroke();
      }
    }
  }

  /** The X itself: two strokes drawn through their own nodes. */
  private drawConstellation(
    ctx: CanvasRenderingContext2D,
    form: number,
    placed: Map<Star, { x: number; y: number }>,
  ): void {
    if (form < 0.02) return;

    ctx.lineWidth = 1.5;
    ctx.lineCap = 'round';

    for (const stroke of [0, 1] as const) {
      const points = this.nodes
        .filter((n) => n.stroke === stroke)
        .map((n) => placed.get(n.star))
        .filter((p): p is { x: number; y: number } => !!p);

      if (points.length < 2) continue;

      // Squared so the line only really arrives once the stars are nearly
      // home — otherwise the X is legible long before it has formed.
      ctx.globalAlpha = form * form * 0.55;
      ctx.strokeStyle = `rgba(${CYAN}, 1)`;
      ctx.beginPath();
      ctx.moveTo(points[0].x, points[0].y);
      for (let i = 1; i < points.length; i++) {
        ctx.lineTo(points[i].x, points[i].y);
      }
      ctx.stroke();
    }

    // Brighten the node stars themselves as they lock into place.
    ctx.globalAlpha = form * 0.9;
    ctx.fillStyle = `rgba(${CYAN}, 1)`;
    for (const node of this.nodes) {
      const at = placed.get(node.star);
      if (!at) continue;
      const r = 1 + form * 1.6;
      ctx.fillRect(at.x - r / 2, at.y - r / 2, r, r);
    }

    ctx.globalAlpha = 1;
  }
}
