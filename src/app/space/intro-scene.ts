import { Planet } from '../data/planets';
import { INTRO_END, INTRO_IMPACT, IntroLayout, introLayout, planetAt, plateRect } from './intro-layout';
import { Bounds, opaqueBounds, paintPlanet, paintPlate } from './planet-art';
import { SHIP_LENGTH, ShipPose, drawExhaust, drawShip } from './ship';
import { mulberry32 } from './starfield';
import { X_ART, X_ASPECT, X_POINTS, X_STROKES } from './x-points';

const LOGO_SRC = 'assets/img/xomware-icon.webp';
const SHIP_ENTER = 2;
const LOOP_START = 2.75;
const DIVE_START = 4.45;
/** Radians the ship covers on its loop, before it spirals in. */
const LOOP_SWEEP = Math.PI * 1.6;
/** The constellation gives way to the real artwork over this window. */
const RESOLVE: [number, number] = [2.65, 3.35];
/** Seconds a star takes to fly from the open sky to its place in the mark. */
const GATHER = 0.9;
const MAX_DPR = 2;
const SPARKS = 90;

interface Star {
  /** Start, as a fraction of the viewport. */
  sx: number;
  sy: number;
  /** Place in the mark, -1..1. */
  tx: number;
  ty: number;
  at: number;
  size: number;
}

interface Segment {
  a: Star;
  b: Star;
  /** When the line starts to draw: once both its stars have landed. */
  at: number;
}

interface Spark {
  dx: number;
  dy: number;
  speed: number;
  life: number;
  rgb: string;
}

const clamp01 = (v: number): number => Math.min(1, Math.max(0, v));
const range = (t: number, a: number, b: number): number => clamp01((t - a) / (b - a));
const easeOut = (u: number): number => 1 - (1 - u) ** 3;
const easeIn = (u: number): number => u ** 3;
const easeInOut = (u: number): number => (u < 0.5 ? 4 * u ** 3 : 1 - (-2 * u + 2) ** 3 / 2);
const easeOutBack = (u: number): number => 1 + 2.7 * (u - 1) ** 3 + 1.7 * (u - 1) ** 2;

function bezier(p0: number, p1: number, p2: number, p3: number, u: number): number {
  const v = 1 - u;
  return v * v * v * p0 + 3 * v * v * u * p1 + 3 * v * u * u * p2 + u * u * u * p3;
}

function softSprite(rgb: string, size: number): HTMLCanvasElement {
  const c = document.createElement('canvas');
  c.width = c.height = size;
  const g = c.getContext('2d');
  if (!g) return c;
  const r = size / 2;
  const grad = g.createRadialGradient(r, r, 0, r, r, r);
  grad.addColorStop(0, `rgba(${rgb}, 1)`);
  grad.addColorStop(0.18, `rgba(${rgb}, 0.85)`);
  grad.addColorStop(0.45, `rgba(${rgb}, 0.2)`);
  grad.addColorStop(1, `rgba(${rgb}, 0)`);
  g.fillStyle = grad;
  g.fillRect(0, 0, size, size);
  return c;
}

/**
 * The landing intro, drawn as a pure function of time. Planets carrying the
 * app banners turn slowly around the Xomware X as its stars gather and trace
 * the brush strokes, the constellation resolves into the real artwork, and a
 * ship loops the system and dives into the mark. The blast opens a hole onto
 * the page underneath.
 *
 * No state advances per frame, so any moment can be drawn on its own — that
 * is what lets the frame-capture harness and a dropped frame both land on
 * the right picture.
 */
export class IntroScene {
  private readonly ctx: CanvasRenderingContext2D | null;
  private readonly banners: HTMLImageElement[];
  private readonly bounds: Bounds[];
  private readonly ready: boolean[] = [];
  private readonly logo = new Image();
  private logoReady = false;
  private readonly sky = document.createElement('canvas');
  private readonly white = softSprite('255, 255, 255', 32);
  private readonly cyan = softSprite('150, 232, 255', 32);
  private readonly hot = softSprite('140, 210, 255', 32);
  private readonly anchors: Star[] = [];
  private readonly segments: Segment[] = [];
  private readonly dust: Star[] = [];
  private readonly sparks: Spark[] = [];
  private bodies: HTMLCanvasElement[] = [];
  private plates: HTMLCanvasElement[] = [];
  private layout: IntroLayout | null = null;
  private dpr = 1;

  constructor(
    private readonly canvas: HTMLCanvasElement,
    private readonly planets: Planet[],
  ) {
    this.ctx = canvas.getContext('2d');
    const rand = mulberry32(0x1e7);

    this.bounds = planets.map(() => ({ x: 0, y: 0, w: 1, h: 1 }));
    // decode(), not onload: WebKit can report an image complete and still draw
    // it blank into a canvas until it has been decoded.
    this.banners = planets.map((planet, i) => {
      const img = new Image();
      img.src = planet.logo;
      img
        .decode()
        .then(() => {
          this.ready[i] = true;
          this.bounds[i] = opaqueBounds(img);
          this.bakePlate(i);
        })
        // A banner that fails to load leaves its plate empty rather than breaking the intro.
        .catch(() => undefined);
      return img;
    });

    this.logo.src = LOGO_SRC;
    this.logo
      .decode()
      .then(() => (this.logoReady = true))
      .catch(() => undefined);

    // Anchor stars down both edges of each stroke, landing from the top of the
    // stroke to its end so the line follows the brush.
    X_STROKES.forEach((stroke, k) => {
      const n = stroke.left.length;
      const edge = (pts: typeof stroke.left): Star[] =>
        pts.map(([tx, ty], q) => ({
          sx: 0.05 + rand() * 0.9,
          sy: 0.05 + rand() * 0.9,
          tx,
          ty,
          at: 0.35 + k * 0.4 + q * 0.075,
          size: 1.6 + rand() * 0.6,
        }));
      const left = edge(stroke.left);
      const right = edge(stroke.right);
      this.anchors.push(...left, ...right);
      const join = (a: Star, b: Star): void => {
        this.segments.push({ a, b, at: Math.max(a.at, b.at) + GATHER * 0.85 });
      };
      join(left[0], right[0]);
      for (let q = 0; q < n - 1; q++) {
        join(left[q], left[q + 1]);
        join(right[q], right[q + 1]);
      }
      join(left[n - 1], right[n - 1]);
    });

    for (const [tx, ty] of X_POINTS) {
      this.dust.push({
        sx: rand(),
        sy: rand(),
        tx,
        ty,
        at: 0.25 + rand() * 1.4,
        size: 0.6 + rand() ** 2 * 1.2,
      });
    }

    const colours = ['255, 250, 236', '255, 214, 130', '255, 160, 70', '170, 236, 255'];
    for (let i = 0; i < SPARKS; i++) {
      const a = rand() * Math.PI * 2;
      this.sparks.push({
        dx: Math.cos(a),
        dy: Math.sin(a),
        speed: 0.45 + rand() ** 1.5 * 1.3,
        life: 0.45 + rand() * 0.6,
        rgb: colours[Math.floor(rand() * colours.length)],
      });
    }
  }

  resize(width: number, height: number): void {
    if (!width || !height) return;
    this.dpr = Math.min(window.devicePixelRatio || 1, MAX_DPR);
    this.canvas.width = Math.round(width * this.dpr);
    this.canvas.height = Math.round(height * this.dpr);
    const L = introLayout(width, height, this.planets.length);
    this.layout = L;

    this.bodies = L.slots.map((slot) => {
      // Lit by the mark at the centre: it's the sun of this system.
      const p = planetAt(L, slot, INTRO_IMPACT / 2);
      return paintPlanet(slot.radius * this.dpr, this.planets[slot.index].colorRgb, slot.index * 7 + 2, [
        L.cx - p.x,
        L.cy - p.y,
      ]);
    });
    this.plates = [];
    L.slots.forEach((slot) => this.bakePlate(slot.index));
    this.paintSky();
  }

  private bakePlate(index: number): void {
    const L = this.layout;
    if (!L || index >= L.slots.length) return;
    const banner = this.banners[index];
    this.plates[index] = paintPlate(
      L.plateW,
      L.plateH,
      this.dpr,
      this.planets[index].colorRgb,
      this.ready[index] ? banner : null,
      this.bounds[index],
    );
  }

  /** The backdrop never changes, so it is painted once per size rather than every frame. */
  private paintSky(): void {
    const L = this.layout;
    if (!L) return;
    const { w, h } = L;
    const sky = this.sky;
    sky.width = this.canvas.width;
    sky.height = this.canvas.height;
    const g = sky.getContext('2d');
    if (!g) return;
    g.setTransform(this.dpr, 0, 0, this.dpr, 0, 0);

    const bg = g.createRadialGradient(L.cx, L.cy, 0, L.cx, L.cy, L.diag * 0.6);
    bg.addColorStop(0, '#0f1534');
    bg.addColorStop(1, '#04050d');
    g.fillStyle = bg;
    g.fillRect(0, 0, w, h);

    for (const [x, y, rgb] of [
      [0.2, 0.18, '0, 180, 216'],
      [0.82, 0.3, '156, 10, 191'],
      [0.5, 0.95, '0, 180, 216'],
    ] as const) {
      const neb = g.createRadialGradient(w * x, h * y, 0, w * x, h * y, Math.max(w, h) * 0.45);
      neb.addColorStop(0, `rgba(${rgb}, 0.08)`);
      neb.addColorStop(1, `rgba(${rgb}, 0)`);
      g.fillStyle = neb;
      g.fillRect(0, 0, w, h);
    }

    const rand = mulberry32(0x57);
    const count = Math.min(Math.max((w * h) / 2600, 180), 520);
    for (let i = 0; i < count; i++) {
      const box = (0.5 + rand() ** 2.2 * 1.6) * 6;
      g.globalAlpha = 0.15 + rand() ** 1.6 * 0.7;
      g.drawImage(rand() < 0.2 ? this.cyan : this.white, rand() * w - box / 2, rand() * h - box / 2, box, box);
    }
    g.globalAlpha = 1;
  }

  draw(t: number): void {
    const ctx = this.ctx;
    const L = this.layout;
    if (!ctx || !L) return;

    ctx.setTransform(this.dpr, 0, 0, this.dpr, 0, 0);
    ctx.globalCompositeOperation = 'source-over';
    ctx.globalAlpha = 1;
    ctx.fillStyle = '#04050d';
    ctx.fillRect(0, 0, L.w, L.h);

    const shake = range(t, INTRO_IMPACT - 0.2, INTRO_IMPACT) * (1 - range(t, INTRO_IMPACT, INTRO_IMPACT + 0.5)) * L.m * 0.014;
    if (shake > 0) ctx.translate(Math.sin(t * 91) * shake, Math.cos(t * 77) * shake);

    // A slow push in, the whole way through.
    const zoom = 1 + 0.05 * (t / INTRO_END);
    ctx.save();
    ctx.translate(L.cx, L.cy);
    ctx.scale(zoom, zoom);
    ctx.translate(-L.cx, -L.cy);
    ctx.drawImage(this.sky, 0, 0, L.w, L.h);

    this.drawOrbits(ctx, t);
    const ship = this.shipPose(t);
    const shipFront = ship !== null && ship.y >= L.hit[1];
    this.drawPlanets(ctx, t, false);
    if (ship && !shipFront) this.drawShip(ctx, t, ship);
    this.drawMark(ctx, t);
    this.drawPlanets(ctx, t, true);
    if (ship && shipFront) this.drawShip(ctx, t, ship);
    ctx.restore();

    if (t >= INTRO_IMPACT) this.drawImpact(ctx, t);
  }

  /** Planets are thrown outward and fade once the ship hits. */
  private blast(t: number): number {
    return easeOut(range(t, INTRO_IMPACT, INTRO_IMPACT + 1));
  }

  private drawOrbits(ctx: CanvasRenderingContext2D, t: number): void {
    const L = this.layout;
    if (!L) return;
    const a = 0.08 * range(t, 0, 0.8) * (1 - range(t, INTRO_IMPACT, INTRO_IMPACT + 0.3));
    if (a <= 0) return;
    ctx.strokeStyle = `rgba(160, 200, 255, ${a})`;
    ctx.lineWidth = 1;
    ctx.beginPath();
    for (const slot of L.slots) {
      ctx.moveTo(L.cx + L.rx * slot.orbit, L.cy);
      ctx.ellipse(L.cx, L.cy, L.rx * slot.orbit, L.ry * slot.orbit, 0, 0, Math.PI * 2);
    }
    ctx.stroke();
  }

  private drawPlanets(ctx: CanvasRenderingContext2D, t: number, front: boolean): void {
    const L = this.layout;
    if (!L) return;
    const blast = this.blast(t);
    const fade = 1 - range(t, INTRO_IMPACT + 0.05, INTRO_IMPACT + 0.6);
    if (fade <= 0) return;

    for (const slot of L.slots) {
      const p = planetAt(L, slot, t);
      if (p.depth >= 0 !== front) continue;
      const appear = 0.08 + slot.index * 0.07;
      const grow = easeOutBack(range(t, appear, appear + 0.5));
      if (grow <= 0) continue;
      const x = p.x + (p.x - L.cx) * blast * 1.6;
      const y = p.y + (p.y - L.cy) * blast * 1.6;

      const body = this.bodies[slot.index];
      const size = slot.radius * 3 * grow;
      ctx.globalAlpha = fade;
      ctx.drawImage(body, x - size / 2, y - size / 2, size, size);

      const plate = this.plates[slot.index];
      const shown = easeOut(range(t, appear + 0.25, appear + 0.7)) * fade;
      if (!plate || shown <= 0) continue;
      const r = plateRect(L, slot, p.x, p.y);
      ctx.globalAlpha = shown;
      ctx.drawImage(plate, r.x + (x - p.x), r.y + (y - p.y) + (1 - shown) * 6, r.w, r.h);
    }
    ctx.globalAlpha = 1;
  }

  private starAt(star: Star, t: number): [number, number, number] {
    const L = this.layout as IntroLayout;
    const u = easeInOut(range(t, star.at, star.at + GATHER));
    const tx = L.cx + star.tx * L.s;
    const ty = L.cy + star.ty * L.s;
    const sx = star.sx * L.w;
    const sy = star.sy * L.h;
    return [sx + (tx - sx) * u, sy + (ty - sy) * u, u];
  }

  private drawMark(ctx: CanvasRenderingContext2D, t: number): void {
    const L = this.layout;
    if (!L) return;
    const resolved = easeInOut(range(t, RESOLVE[0], RESOLVE[1]));
    const gone = range(t, INTRO_IMPACT, INTRO_IMPACT + 0.3);
    if (gone >= 1) return;
    const live = 1 - gone;

    // The X is the sun of this system: a soft light grows behind it as it forms.
    const formed = range(t, 0.6, 2.4);
    const charge = range(t, DIVE_START, INTRO_IMPACT);
    const pulse = 0.75 + 0.25 * Math.sin(t * 11);
    const glow = (formed * 0.5 + resolved * 0.3 + charge * 0.5 * pulse) * live;
    if (glow > 0) {
      const r = L.s * 2.1;
      const grad = ctx.createRadialGradient(L.cx, L.cy, 0, L.cx, L.cy, r);
      grad.addColorStop(0, `rgba(0, 180, 216, ${0.32 * glow})`);
      grad.addColorStop(0.5, `rgba(0, 120, 200, ${0.1 * glow})`);
      grad.addColorStop(1, 'rgba(0, 120, 200, 0)');
      ctx.fillStyle = grad;
      ctx.fillRect(L.cx - r, L.cy - r, r * 2, r * 2);
    }

    // Dust: the body of the strokes, faint while scattered so it reads as ordinary sky.
    const dustFade = (1 - 0.9 * resolved) * live;
    for (let i = 0; i < this.dust.length; i++) {
      const star = this.dust[i];
      const [x, y, u] = this.starAt(star, t);
      const twinkle = 0.8 + Math.sin(t * 2.3 + i) * 0.2;
      ctx.globalAlpha = Math.min(1, (0.3 + 0.45 * u) * twinkle * dustFade);
      const box = star.size * 5;
      ctx.drawImage(i % 3 ? this.cyan : this.white, x - box / 2, y - box / 2, box, box);
    }

    this.drawConstellation(ctx, t, (1 - 0.82 * resolved) * live);

    if (resolved > 0) this.drawLogo(ctx, resolved, gone);
    ctx.globalAlpha = 1;
  }

  /** The lines between the anchor stars, each drawing once both its ends have landed. */
  private drawConstellation(ctx: CanvasRenderingContext2D, t: number, alpha: number): void {
    if (alpha <= 0) return;
    ctx.lineCap = 'round';
    ctx.beginPath();
    for (const seg of this.segments) {
      const u = easeOut(range(t, seg.at, seg.at + 0.22));
      if (u <= 0) continue;
      const [ax, ay] = this.starAt(seg.a, t);
      const [bx, by] = this.starAt(seg.b, t);
      ctx.moveTo(ax, ay);
      ctx.lineTo(ax + (bx - ax) * u, ay + (by - ay) * u);
    }
    for (const [width, a] of [
      [4, 0.14],
      [1.1, 0.85],
    ] as const) {
      ctx.strokeStyle = `rgba(170, 236, 255, ${a * alpha})`;
      ctx.lineWidth = width;
      ctx.stroke();
    }

    for (let i = 0; i < this.anchors.length; i++) {
      const star = this.anchors[i];
      const [x, y, u] = this.starAt(star, t);
      // A flare as each one lands.
      const flare = range(t, star.at + GATHER * 0.8, star.at + GATHER) * (1 - range(t, star.at + GATHER, star.at + GATHER + 0.4));
      const box = star.size * (6 + u * 2 + flare * 7);
      ctx.globalAlpha = Math.min(1, (0.45 + 0.55 * u) * alpha + flare * 0.5);
      ctx.drawImage(this.cyan, x - box / 2, y - box / 2, box, box);
    }
    ctx.globalAlpha = 1;
  }

  /** The real artwork, laid exactly over the stars it was traced from. */
  private drawLogo(ctx: CanvasRenderingContext2D, resolved: number, gone: number): void {
    const L = this.layout;
    if (!L || !this.logoReady) return;
    const size = (L.s / X_ART.half) * (1.05 - 0.05 * resolved) * (1 + gone * 0.25);
    ctx.globalAlpha = resolved * (1 - gone);
    ctx.drawImage(this.logo, L.cx - X_ART.cx * size, L.cy - X_ART.cy * size, size, size);
    ctx.globalAlpha = 1;
  }

  private loopRadii(): [number, number] {
    const L = this.layout as IntroLayout;
    return [Math.max(L.s * X_ASPECT + 52, L.rx * 0.7), Math.max(L.s + 46, L.ry * 0.7)];
  }

  /**
   * Where the ship is at time t. It swings in from the left onto a loop
   * around the mark, then spirals into the crossing of the strokes, faster
   * as it falls.
   */
  private shipPosition(t: number): [number, number] | null {
    const L = this.layout;
    if (!L || t < SHIP_ENTER || t >= INTRO_IMPACT) return null;
    const [rx, ry] = this.loopRadii();
    const [hx, hy] = L.hit;
    const start = Math.PI * 0.75;
    const speed = LOOP_SWEEP / (DIVE_START - LOOP_START);

    if (t < LOOP_START) {
      const ex = hx + Math.cos(start) * rx;
      const ey = hy + Math.sin(start) * ry;
      // Tangent of the loop at its entry point, so the hand-off is seamless.
      const tx = Math.sin(start) * rx;
      const ty = -Math.cos(start) * ry;
      const len = Math.hypot(tx, ty);
      const k = rx * 0.5;
      const u = range(t, SHIP_ENTER, LOOP_START);
      return [
        bezier(-L.w * 0.12, L.w * 0.08, ex - (tx / len) * k, ex, u),
        bezier(hy - L.h * 0.2, hy - L.h * 0.08, ey - (ty / len) * k, ey, u),
      ];
    }

    const dive = range(t, DIVE_START, INTRO_IMPACT);
    const angle = start - speed * (t - LOOP_START) - easeIn(dive) * Math.PI * 0.6;
    // Squared, not cubed: a cubic fall stays out wide and snaps in over the
    // last couple of frames, so the dive itself is never seen.
    const shrink = 1 - dive * dive;
    return [hx + Math.cos(angle) * rx * shrink, hy + Math.sin(angle) * ry * shrink];
  }

  private readonly shipPose = (t: number): ShipPose | null => {
    const p = this.shipPosition(t);
    if (!p) return null;
    const at = (u: number): [number, number] =>
      this.shipPosition(Math.min(INTRO_IMPACT - 1e-4, Math.max(SHIP_ENTER, u))) ?? p;
    const heading = (u: number): number => {
      const a = at(u - 0.01);
      const b = at(u + 0.01);
      return Math.atan2(b[1] - a[1], b[0] - a[0]);
    };
    // Bank into the turn: roll follows how fast the heading is swinging.
    let turn = heading(t + 0.03) - heading(t - 0.03);
    if (turn > Math.PI) turn -= Math.PI * 2;
    if (turn < -Math.PI) turn += Math.PI * 2;
    const dive = range(t, DIVE_START, INTRO_IMPACT);
    const bank = Math.max(-0.85, Math.min(0.85, turn * 3.3)) + Math.sin(t * 34) * 0.3 * dive;
    return { x: p[0], y: p[1], heading: heading(t), bank };
  };

  private drawShip(ctx: CanvasRenderingContext2D, t: number, pose: ShipPose): void {
    const L = this.layout;
    if (!L) return;
    const dive = range(t, DIVE_START, INTRO_IMPACT);
    const [, ry] = this.loopRadii();
    const depth = Math.max(-1, Math.min(1, (pose.y - L.hit[1]) / ry));
    const scale = L.shipScale * (0.86 + 0.14 * ((depth + 1) / 2)) * (1 + dive * 0.45);

    drawExhaust(ctx, this.hot, this.shipPose, t, scale, dive);
    ctx.save();
    ctx.translate(pose.x, pose.y);
    ctx.rotate(pose.heading + Math.sin(t * 40) * 0.12 * dive);
    ctx.scale(scale, scale);
    // Centre the craft on its path rather than its nose.
    ctx.translate(-SHIP_LENGTH * 0.04, 0);
    drawShip(ctx, pose, t, 1 + dive * 0.5);
    ctx.restore();
  }

  /** Flash, shockwave and sparks from the crossing of the X, and a hole that opens onto the page. */
  private drawImpact(ctx: CanvasRenderingContext2D, t: number): void {
    const L = this.layout;
    if (!L) return;
    const dt = t - INTRO_IMPACT;
    const [hx, hy] = L.hit;

    // Punch the hole first; everything after this paints over the page.
    const hole = L.diag * 0.62 * easeInOut(range(t, INTRO_IMPACT + 0.1, INTRO_END - 0.1));
    if (hole > 0) {
      ctx.globalCompositeOperation = 'destination-out';
      const grad = ctx.createRadialGradient(hx, hy, Math.max(hole - 90, 0), hx, hy, hole);
      grad.addColorStop(0, 'rgba(0, 0, 0, 1)');
      grad.addColorStop(1, 'rgba(0, 0, 0, 0)');
      ctx.fillStyle = grad;
      ctx.beginPath();
      ctx.arc(hx, hy, hole, 0, Math.PI * 2);
      ctx.fill();
    }

    ctx.globalCompositeOperation = 'lighter';
    const core = 1 - range(dt, 0.08, 0.6);
    if (core > 0) {
      const r = Math.max(L.m * 0.32 * easeOut(range(dt, 0, 0.35)), 1);
      const grad = ctx.createRadialGradient(hx, hy, 0, hx, hy, r);
      grad.addColorStop(0, `rgba(255, 252, 240, ${core})`);
      grad.addColorStop(0.35, `rgba(150, 230, 255, ${0.7 * core})`);
      grad.addColorStop(1, 'rgba(0, 140, 220, 0)');
      ctx.fillStyle = grad;
      ctx.fillRect(hx - r, hy - r, r * 2, r * 2);
    }

    const wave = easeOut(range(dt, 0, 0.95));
    if (wave < 1) {
      const r = L.diag * 0.62 * wave;
      ctx.strokeStyle = `rgba(120, 220, 255, ${0.16 * (1 - wave)})`;
      ctx.lineWidth = 26 * (1 - wave) + 4;
      ctx.beginPath();
      ctx.arc(hx, hy, r, 0, Math.PI * 2);
      ctx.stroke();
      ctx.strokeStyle = `rgba(230, 248, 255, ${0.85 * (1 - wave)})`;
      ctx.lineWidth = 1.5 + 3 * (1 - wave);
      ctx.stroke();
    }

    ctx.lineCap = 'round';
    for (const sp of this.sparks) {
      const a = 1 - range(dt, sp.life * 0.4, sp.life);
      if (a <= 0) continue;
      const k = 3.4;
      const reach = L.m * sp.speed * 1.5;
      const dist = (reach * (1 - Math.exp(-k * dt))) / k;
      const vel = reach * Math.exp(-k * dt);
      const len = Math.min(70, Math.max(2, vel * 0.05));
      const x = hx + sp.dx * dist;
      const y = hy + sp.dy * dist;
      ctx.strokeStyle = `rgba(${sp.rgb}, ${a})`;
      ctx.lineWidth = 1.6;
      ctx.beginPath();
      ctx.moveTo(x - sp.dx * len, y - sp.dy * len);
      ctx.lineTo(x, y);
      ctx.stroke();
    }

    // Added light rather than painted over, so it glares instead of greying the scene out.
    const flash = range(dt, 0, 0.04) * (1 - range(dt, 0.04, 0.4));
    if (flash > 0) {
      ctx.fillStyle = `rgba(236, 248, 255, ${0.8 * flash})`;
      ctx.fillRect(-L.w, -L.h, L.w * 3, L.h * 3);
    }
    ctx.globalCompositeOperation = 'source-over';
  }
}
