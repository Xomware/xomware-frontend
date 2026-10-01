/**
 * Parallax starfield, rendered to a 2D canvas.
 *
 * Deliberately hand-written rather than pulled from a particle library: the
 * app ships every route in the initial bundle (no lazy loading), so a WebGL
 * or particle dependency would eat the whole remaining budget.
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
}

/** A shooting star: a short-lived streak with a fading tail. */
interface Meteor {
  x: number;
  y: number;
  vx: number;
  vy: number;
  length: number;
  life: number;
  maxLife: number;
}

/** Somebody out there. Crosses the field now and then, and is gone. */
interface Rocket {
  x: number;
  /** Course line; the ship weaves gently about it. */
  y0: number;
  y: number;
  vx: number;
  /** Amplitude (px) and rate of the weave. */
  weave: number;
  rate: number;
  /** Counts up; the ship despawns once it has cleared the far edge. */
  life: number;
}

/**
 * The courier, pre-rendered from the intro's 3D model (ship-model.ts) at five
 * bank angles, -24 to +24 degrees, each 320 x 160, nose to the right.
 */
const SHIP_SHEET = 'assets/img/ship/courier.webp';
const SHIP_FRAMES = 5;
const FRAME_W = 320;
const FRAME_H = 160;
/** The hull spans x 61-226 of a frame; the bells end at x 62. */
const HULL_PX = 165;
const TAIL_X = 62;
/**
 * Heights of the engine bells visible in each frame, as a fraction of its
 * height. The far engine hides behind the hull once the ship banks away.
 */
const BELLS: readonly (readonly number[])[] = [[0.675, 0.334], [0.653, 0.354], [0.625], [0.59], [0.55]];

/** A tumbling rock. Drawn as an irregular polygon so no two look alike. */
interface Asteroid {
  x: number;
  y: number;
  radius: number;
  /** Per-vertex radius multipliers — the silhouette. */
  shape: number[];
  spin: number;
  angle: number;
  layer: number;
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

const ASTEROID_COUNT = 7;
/** Seconds between rocket sightings, before jitter. Rare on purpose. */
const ROCKET_INTERVAL = 15;
/** Seconds between shooting stars, before jitter. */
const METEOR_INTERVAL = 2.4;
const MAX_METEORS = 3;

/** How the field is configured for a given surface. */
export interface StarfieldOptions {
  /** false freezes meteors and asteroid tumble, for reproducible screenshots. */
  animateScene?: boolean;
  starCount?: number;
  /** Shooting stars. */
  meteors?: boolean;
  /** Tumbling rocks. */
  asteroids?: boolean;
  /** Self-propelled drift per frame. */
  drift?: number;
}

export function mulberry32(seed: number): () => number {
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
  /** One pre-rendered sprite per star colour, plus a spiked variant. */
  private starSprites: HTMLCanvasElement[] = [];
  private spikeSprites: HTMLCanvasElement[] = [];
  private frame = 0;
  private running = false;
  private width = 0;
  private height = 0;
  private dpr = 1;
  private time = 0;

  private asteroids: Asteroid[] = [];
  private meteors: Meteor[] = [];
  private rocket: Rocket | null = null;
  private readonly shipSheet = new Image();
  private nextMeteorAt = METEOR_INTERVAL;
  private nextRocketAt = ROCKET_INTERVAL;
  private rand: () => number = mulberry32(1);

  private progress = 0;

  private readonly opts: Required<StarfieldOptions>;

  constructor(private canvas: HTMLCanvasElement, options: StarfieldOptions = {}) {
    this.opts = {
      animateScene: true,
      starCount: BASE_STAR_COUNT,
      meteors: true,
      asteroids: true,
      drift: 0,
      ...options,
    };
    this.ctx = canvas.getContext('2d');
    this.shipSheet.decoding = 'async';
    if (this.opts.animateScene) this.shipSheet.src = SHIP_SHEET;
    this.seed(this.opts.starCount);
    this.buildSprites();
  }

  private get animateScene(): boolean {
    return this.opts.animateScene;
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
        });
      }
    });

    if (this.opts.asteroids) this.seedAsteroids(rand);
    // Kept for meteor spawning, which needs randomness past construction.
    this.rand = rand;
  }

  private seedAsteroids(rand: () => number): void {
    this.asteroids = [];
    for (let i = 0; i < ASTEROID_COUNT; i++) {
      const vertices = 8 + Math.floor(rand() * 4);
      const shape: number[] = [];
      for (let v = 0; v < vertices; v++) {
        // Never below 0.62, or the polygon folds in on itself and reads as a
        // star rather than a rock.
        shape.push(0.62 + rand() * 0.55);
      }
      this.asteroids.push({
        x: rand(),
        y: 0.08 + rand() * 0.84,
        radius: 4 + rand() * 11,
        shape,
        spin: (rand() - 0.5) * 0.4,
        angle: rand() * Math.PI * 2,
        layer: rand() > 0.5 ? 1 : 2,
      });
    }
  }

  /**
   * Pre-render one soft sprite per star colour, plus a spiked version.
   *
   * Stars used to be drawn with fillRect, which is exactly a square dot — at
   * these sizes that reads as confetti, not sky. A soft radial falloff gives
   * every star a core and a halo, and the four-point diffraction spikes on the
   * bright ones are the detail the eye actually reads as "star".
   *
   * Pre-rendering per colour means drawing is a drawImage rather than building
   * a gradient 640 times a frame.
   */
  private buildSprites(): void {
    this.starSprites = STAR_COLOURS.map((rgb) => {
      const size = 32;
      const c = document.createElement('canvas');
      c.width = size;
      c.height = size;
      const g = c.getContext('2d');
      if (!g) return c;

      const r = size / 2;
      const grad = g.createRadialGradient(r, r, 0, r, r, r);
      grad.addColorStop(0, `rgba(${rgb}, 1)`);
      grad.addColorStop(0.16, `rgba(${rgb}, 0.85)`);
      grad.addColorStop(0.42, `rgba(${rgb}, 0.22)`);
      grad.addColorStop(1, `rgba(${rgb}, 0)`);
      g.fillStyle = grad;
      g.fillRect(0, 0, size, size);
      return c;
    });

    this.spikeSprites = STAR_COLOURS.map((rgb) => {
      const size = 96;
      const c = document.createElement('canvas');
      c.width = size;
      c.height = size;
      const g = c.getContext('2d');
      if (!g) return c;

      const r = size / 2;
      // Core bloom.
      const core = g.createRadialGradient(r, r, 0, r, r, r * 0.34);
      core.addColorStop(0, `rgba(${rgb}, 0.95)`);
      core.addColorStop(0.5, `rgba(${rgb}, 0.28)`);
      core.addColorStop(1, `rgba(${rgb}, 0)`);
      g.fillStyle = core;
      g.fillRect(0, 0, size, size);

      // Four spikes, drawn as tapered gradients out from the centre.
      const spike = (w: number, h: number) => {
        const grad = g.createLinearGradient(r - w / 2, r, r + w / 2, r);
        grad.addColorStop(0, `rgba(${rgb}, 0)`);
        grad.addColorStop(0.5, `rgba(${rgb}, 0.5)`);
        grad.addColorStop(1, `rgba(${rgb}, 0)`);
        g.fillStyle = grad;
        g.fillRect(r - w / 2, r - h / 2, w, h);
      };
      spike(size * 0.94, 1.1);
      g.save();
      g.translate(r, r);
      g.rotate(Math.PI / 2);
      g.translate(-r, -r);
      spike(size * 0.72, 1.1);
      g.restore();

      return c;
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
    this.asteroids = [];
    this.meteors = [];
    this.rocket = null;
    this.starSprites = [];
    this.spikeSprites = [];
    this.ctx = null;
  }

  private tick = (): void => {
    if (!this.running) return;
    this.progress += this.opts.drift;
    this.time += 0.016;
    this.update();
    this.draw();
    this.frame = requestAnimationFrame(this.tick);
  };

  /** Advance everything that has its own motion. */
  private update(): void {
    if (!this.animateScene) return;

    for (const rock of this.asteroids) {
      rock.angle += rock.spin * 0.01;
    }

    if (this.opts.meteors && this.time >= this.nextMeteorAt && this.meteors.length < MAX_METEORS) {
      this.spawnMeteor();
      // Jittered so they never fall into a visible rhythm.
      this.nextMeteorAt = this.time + METEOR_INTERVAL + this.rand() * 3.4;
    }

    for (let i = this.meteors.length - 1; i >= 0; i--) {
      const m = this.meteors[i];
      m.x += m.vx;
      m.y += m.vy;
      m.life += 1;
      if (m.life > m.maxLife) this.meteors.splice(i, 1);
    }

    if (!this.rocket && this.time >= this.nextRocketAt) {
      this.spawnRocket();
      this.nextRocketAt = this.time + ROCKET_INTERVAL + this.rand() * 14;
    }

    if (this.rocket) {
      const r = this.rocket;
      r.x += r.vx;
      r.life += 1;
      r.y = r.y0 + Math.sin(r.life * r.rate) * r.weave;
      // Gone once it has cleared the far edge with room to spare.
      const margin = 140;
      if (this.rocket.x < -margin || this.rocket.x > this.width + margin) this.rocket = null;
    }
  }

  private spawnRocket(): void {
    const rand = this.rand;
    const leftToRight = rand() > 0.5;
    // Much slower than a meteor: this one is under power, not falling.
    const speed = 1.6 + rand() * 1.2;
    const y0 = this.height * (0.15 + rand() * 0.6);

    this.rocket = {
      x: leftToRight ? -140 : this.width + 140,
      y0,
      y: y0,
      vx: (leftToRight ? 1 : -1) * speed,
      // A long, lazy weave: a course correction, not a wobble.
      weave: 18 + rand() * 30,
      rate: 0.006 + rand() * 0.006,
      life: 0,
    };
  }

  private spawnMeteor(): void {
    const rand = this.rand;
    // Shallow diagonal, entering from either side of the top half.
    const leftToRight = rand() > 0.45;
    const angle = (18 + rand() * 22) * (Math.PI / 180);
    const speed = 9 + rand() * 7;

    this.meteors.push({
      x: leftToRight ? -80 : this.width + 80,
      y: this.height * (0.02 + rand() * 0.45),
      vx: (leftToRight ? 1 : -1) * Math.cos(angle) * speed,
      vy: Math.sin(angle) * speed,
      length: 90 + rand() * 150,
      life: 0,
      maxLife: 55 + rand() * 45,
    });
  }

  private draw(): void {
    const ctx = this.ctx;
    if (!ctx || !this.width) return;

    ctx.clearRect(0, 0, this.width, this.height);

    const travel = this.progress * this.width * 6;

    this.drawAsteroids(ctx, travel);

    for (const star of this.stars) {
      let x = (star.x * this.width - travel * LAYER_SPEED[star.layer]) % this.width;
      if (x < 0) x += this.width;
      const y = star.y * this.height;

      // Slow twinkle. Small amplitude — the sky should read as alive, not
      // as blinking.
      const twinkle = 0.78 + Math.sin(this.time * 1.3 + star.phase) * 0.22;
      const alpha = Math.min(0.92, star.alpha * twinkle);
      const sprite = this.starSprites[star.tint];
      if (!sprite) continue;

      // The sprite's visible core is a fraction of its box, so it is drawn
      // several times the nominal star size.
      const box = star.size * 6.5;
      ctx.globalAlpha = alpha;
      ctx.drawImage(sprite, x - box / 2, y - box / 2, box, box);

      if (star.luminous) {
        const spikes = this.spikeSprites[star.tint];
        if (spikes) {
          const sb = box * 3.4;
          ctx.globalAlpha = alpha * 0.8;
          ctx.drawImage(spikes, x - sb / 2, y - sb / 2, sb, sb);
        }
      }
    }

    this.drawMeteors(ctx);
    this.drawRocket(ctx);
    ctx.globalAlpha = 1;
  }

  /**
   * The courier: heat shimmer behind the bells, the exhaust, then the hull
   * sprite banked into its weave. Drawn in the ship's frame, nose along +x.
   */
  private drawRocket(ctx: CanvasRenderingContext2D): void {
    const r = this.rocket;
    const sheet = this.shipSheet;
    if (!r || !sheet.complete || !sheet.naturalWidth) return;

    const dir = Math.sign(r.vx);
    const vy = Math.cos(r.life * r.rate) * r.weave * r.rate;
    // Lateral acceleration sets the bank, as it would in a coordinated turn.
    const accel = -Math.sin(r.life * r.rate) * r.weave * r.rate * r.rate;
    const bank = Math.max(-1, Math.min(1, accel * 400 * dir));
    const frame = Math.round((bank + 1) * 0.5 * (SHIP_FRAMES - 1));
    const len = this.width < 600 ? 58 : 82;
    const k = len / HULL_PX;
    const fw = FRAME_W * k;
    const fh = FRAME_H * k;
    // Where the frame's left edge and the tail sit, relative to the ship's centre.
    const left = -fw * 0.45;
    const tail = left + TAIL_X * k;
    const throttle = 0.85 + 0.15 * Math.sin(this.time * 3.1) + 0.05 * Math.sin(this.time * 41);

    ctx.save();
    ctx.translate(r.x, r.y);
    ctx.rotate(Math.atan2(vy, Math.abs(r.vx)) * dir);
    ctx.scale(dir, 1);
    ctx.globalAlpha = 1;

    const top = -fh / 2;
    for (const [i, bellY] of BELLS[frame].entries()) {
      const y = top + bellY * fh;
      const power = (i === 0 ? 1 : 0.8) * throttle;
      const bell = len * 0.05;
      const reach = len * (0.5 + 0.08 * Math.sin(this.time * 17 + i));
      this.shimmer(ctx, tail, y, len, dir);
      // Exhaust: as wide as the bell where it leaves, tapering to nothing.
      ctx.globalCompositeOperation = 'lighter';
      const plume = ctx.createLinearGradient(tail, y, tail - reach, y);
      plume.addColorStop(0, `rgba(255, 226, 190, ${0.75 * power})`);
      plume.addColorStop(0.2, `rgba(255, 150, 80, ${0.35 * power})`);
      plume.addColorStop(1, 'rgba(255, 110, 50, 0)');
      ctx.fillStyle = plume;
      ctx.beginPath();
      ctx.moveTo(tail + 1, y - bell);
      ctx.quadraticCurveTo(tail - reach * 0.35, y - bell * 1.1, tail - reach, y);
      ctx.quadraticCurveTo(tail - reach * 0.35, y + bell * 1.1, tail + 1, y + bell);
      ctx.closePath();
      ctx.fill();
      const glow = ctx.createRadialGradient(tail, y, 0, tail, y, len * 0.1);
      glow.addColorStop(0, `rgba(255, 214, 170, ${0.5 * power})`);
      glow.addColorStop(1, 'rgba(255, 140, 70, 0)');
      ctx.fillStyle = glow;
      ctx.fillRect(tail - len * 0.1, y - len * 0.1, len * 0.2, len * 0.2);
      ctx.globalCompositeOperation = 'source-over';
    }

    ctx.drawImage(sheet, frame * FRAME_W, 0, FRAME_W, FRAME_H, left, top, fw, fh);
    ctx.restore();
  }

  /**
   * Hot exhaust bends the light passing through it: copy the strip of sky
   * just behind a bell back over itself in thin slices, each nudged by a
   * travelling ripple, so the stars behind the plume swim.
   */
  private shimmer(ctx: CanvasRenderingContext2D, tail: number, y: number, len: number, dir: number): void {
    const t = ctx.getTransform();
    const slices = 14;
    const w = (len * 0.6) / slices;
    const h = len * 0.16;
    for (let i = 0; i < slices; i++) {
      const x = tail - (i + 1) * w;
      const fade = 1 - i / slices;
      const dy = Math.sin(this.time * 26 + i * 0.9) * 0.9 * fade;
      // Source in device pixels, from where this slice sits on the canvas now.
      const p = t.transformPoint(new DOMPoint(x + (dir < 0 ? w : 0), y - h / 2));
      ctx.drawImage(this.canvas, p.x, p.y, w * this.dpr, h * this.dpr, x, y - h / 2 + dy, w, h);
    }
  }

  /** Tumbling rocks drifting through the field. */
  private drawAsteroids(ctx: CanvasRenderingContext2D, travel: number): void {
    for (const rock of this.asteroids) {
      let x = (rock.x * this.width - travel * LAYER_SPEED[rock.layer] * 0.85) % this.width;
      if (x < 0) x += this.width;
      const y = rock.y * this.height;

      ctx.save();
      ctx.translate(x, y);
      ctx.rotate(rock.angle);

      ctx.beginPath();
      for (let i = 0; i < rock.shape.length; i++) {
        const a = (i / rock.shape.length) * Math.PI * 2;
        const r = rock.radius * rock.shape[i];
        const px = Math.cos(a) * r;
        const py = Math.sin(a) * r;
        if (i === 0) ctx.moveTo(px, py);
        else ctx.lineTo(px, py);
      }
      ctx.closePath();

      // Lit from the upper left, like the planets, so the scene agrees with
      // itself about where the light is.
      const shade = ctx.createLinearGradient(-rock.radius, -rock.radius, rock.radius, rock.radius);
      // Kept dark. Brighter than this and they stop reading as distant rock
      // and start competing with the stars for attention.
      shade.addColorStop(0, 'rgba(96, 100, 122, 0.6)');
      shade.addColorStop(0.55, 'rgba(44, 46, 62, 0.62)');
      shade.addColorStop(1, 'rgba(18, 19, 30, 0.7)');
      ctx.fillStyle = shade;
      ctx.fill();

      ctx.strokeStyle = 'rgba(150, 158, 186, 0.18)';
      ctx.lineWidth = 0.8;
      ctx.stroke();
      ctx.restore();
    }
  }

  /** Shooting stars: a bright head trailing a fading streak. */
  private drawMeteors(ctx: CanvasRenderingContext2D): void {
    for (const m of this.meteors) {
      // Ease in and out so they never pop into or out of existence.
      const t = m.life / m.maxLife;
      const fade = Math.sin(Math.min(Math.max(t, 0), 1) * Math.PI);
      if (fade <= 0.01) continue;

      const speed = Math.hypot(m.vx, m.vy) || 1;
      const tailX = m.x - (m.vx / speed) * m.length;
      const tailY = m.y - (m.vy / speed) * m.length;

      const grad = ctx.createLinearGradient(m.x, m.y, tailX, tailY);
      grad.addColorStop(0, `rgba(255, 255, 255, ${0.9 * fade})`);
      grad.addColorStop(0.25, `rgba(214, 236, 255, ${0.4 * fade})`);
      grad.addColorStop(1, 'rgba(214, 236, 255, 0)');

      ctx.globalAlpha = 1;
      ctx.strokeStyle = grad;
      ctx.lineWidth = 1.8;
      ctx.lineCap = 'round';
      ctx.beginPath();
      ctx.moveTo(m.x, m.y);
      ctx.lineTo(tailX, tailY);
      ctx.stroke();

      const head = this.starSprites[0];
      if (head) {
        const b = 14;
        ctx.globalAlpha = fade;
        ctx.drawImage(head, m.x - b / 2, m.y - b / 2, b, b);
      }
    }
  }
}
