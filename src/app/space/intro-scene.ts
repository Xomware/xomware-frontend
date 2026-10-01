import { Planet } from '../data/planets';
import { drawShip } from './ship';
import { mulberry32 } from './starfield';
import { X_POINTS } from './x-points';

/** Seconds into the intro at which the ship hits the centre. */
export const INTRO_IMPACT = 5.3;
/** Seconds at which the page is fully revealed and the intro can unmount. */
export const INTRO_END = 6.5;

const SHIP_ENTER = 2.2;
const LOOP_START = 2.95;
const DIVE_START = 4.5;
/** Radians the ship covers on its loop, before it spirals in. */
const LOOP_SWEEP = Math.PI * 1.7;
const RINGS = 4;
const MAX_DPR = 2;
const SPRITE = 128;
const TRAIL = 18;
const DEBRIS = 140;

interface Body {
  rgb: string;
  ring: number;
  phase: number;
  appearAt: number;
  sprite: HTMLCanvasElement;
}

interface XStar {
  /** Where it starts, as a fraction of the viewport. */
  sx: number;
  sy: number;
  /** Where it lands in the mark, -1..1. */
  tx: number;
  ty: number;
  delay: number;
  size: number;
  cyan: boolean;
  /** Direction and speed when the impact throws it out. */
  ex: number;
  ey: number;
}

interface Debris {
  dx: number;
  dy: number;
  speed: number;
  size: number;
  rgb: string;
}

interface Layout {
  w: number;
  h: number;
  m: number;
  cx: number;
  cy: number;
  /** Half-height of the X. */
  s: number;
  tilt: number;
  rx: number[];
  planetR: number;
  loopRx: number;
  loopRy: number;
  shipScale: number;
  diag: number;
}

interface ShipPose {
  x: number;
  y: number;
  /** -1 behind the system's plane, 1 in front of it. */
  depth: number;
  scale: number;
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

/** A lit sphere in the app's colour, wearing its icon. Repainted once the icon loads. */
function paintPlanet(c: HTMLCanvasElement, rgb: string, icon: HTMLImageElement | null): void {
  const g = c.getContext('2d');
  if (!g) return;
  const C = SPRITE / 2;
  const R = SPRITE * 0.36;
  g.clearRect(0, 0, SPRITE, SPRITE);

  const halo = g.createRadialGradient(C, C, R * 0.9, C, C, C);
  halo.addColorStop(0, `rgba(${rgb}, 0.45)`);
  halo.addColorStop(1, `rgba(${rgb}, 0)`);
  g.fillStyle = halo;
  g.fillRect(0, 0, SPRITE, SPRITE);

  g.save();
  g.beginPath();
  g.arc(C, C, R, 0, Math.PI * 2);
  g.clip();
  g.fillStyle = `rgb(${rgb})`;
  g.fillRect(0, 0, SPRITE, SPRITE);
  if (icon) {
    const k = R * 1.45;
    g.drawImage(icon, C - k / 2, C - k / 2, k, k);
  }
  // Lit from the upper left, falling into shadow on the far side.
  const shade = g.createRadialGradient(C - R * 0.45, C - R * 0.5, R * 0.1, C - R * 0.1, C - R * 0.1, R * 1.35);
  shade.addColorStop(0, 'rgba(255, 255, 255, 0.3)');
  shade.addColorStop(0.45, 'rgba(255, 255, 255, 0)');
  shade.addColorStop(0.8, 'rgba(4, 6, 18, 0.35)');
  shade.addColorStop(1, 'rgba(4, 6, 18, 0.8)');
  g.fillStyle = shade;
  g.fillRect(0, 0, SPRITE, SPRITE);
  g.restore();

  g.strokeStyle = 'rgba(255, 255, 255, 0.2)';
  g.lineWidth = 1.5;
  g.beginPath();
  g.arc(C, C, R, 0, Math.PI * 2);
  g.stroke();
}

/** The point in the mark nearest each ideal position, so the drawn lines land on real stars. */
function nearestMarkPoints(ideal: [number, number][]): [number, number][] {
  return ideal.map(([ix, iy]) => {
    let best = X_POINTS[0];
    let bestD = Infinity;
    for (const p of X_POINTS) {
      const d = (p[0] - ix) ** 2 + (p[1] - iy) ** 2;
      if (d < bestD) {
        bestD = d;
        best = p;
      }
    }
    return [best[0], best[1]];
  });
}

const STEPS = [-0.82, -0.41, 0, 0.41, 0.82];
// The painted X is taller than it is wide, so each stroke runs at about 0.7:1.
const STROKES: [number, number][][] = [
  nearestMarkPoints(STEPS.map((u) => [u * 0.7, u])),
  nearestMarkPoints(STEPS.map((u) => [-u * 0.7, u])),
];

/**
 * The landing intro, drawn as a pure function of time: planets orbit, stars
 * gather into the Xomware X, a ship loops the system and spirals into the
 * centre, and the blast opens a hole onto the page underneath.
 *
 * No state advances per frame, so any moment can be drawn on its own — that
 * is what lets the frame-capture harness and a dropped frame both land on
 * the right picture.
 */
export class IntroScene {
  private readonly ctx: CanvasRenderingContext2D | null;
  private readonly bodies: Body[];
  private readonly debris: Debris[] = [];
  private readonly sky = document.createElement('canvas');
  private readonly white = softSprite('255, 255, 255', 32);
  private readonly cyan = softSprite('150, 232, 255', 32);
  private xStars: XStar[] = [];
  private layout!: Layout;
  private dpr = 1;

  constructor(
    private readonly canvas: HTMLCanvasElement,
    planets: Planet[],
  ) {
    this.ctx = canvas.getContext('2d');
    const rand = mulberry32(0x1e7);

    this.bodies = planets.map((planet, i) => {
      const sprite = document.createElement('canvas');
      sprite.width = sprite.height = SPRITE;
      paintPlanet(sprite, planet.colorRgb, null);

      const icon = new Image();
      icon.decoding = 'async';
      icon.onload = () => paintPlanet(sprite, planet.colorRgb, icon);
      icon.src = planet.icon;

      const ring = i % RINGS;
      const onRing = Math.ceil((planets.length - ring) / RINGS);
      const slot = Math.floor(i / RINGS);
      return {
        rgb: planet.colorRgb,
        ring,
        phase: (slot / onRing) * Math.PI * 2 + ring * 0.9,
        appearAt: 0.3 + i * 0.07,
        sprite,
      };
    });

    const colours = [...planets.map((p) => p.colorRgb), '255, 214, 130', '255, 138, 46', '252, 252, 242'];
    for (let i = 0; i < DEBRIS; i++) {
      const a = rand() * Math.PI * 2;
      this.debris.push({
        dx: Math.cos(a),
        dy: Math.sin(a),
        speed: 0.35 + rand() * 1.1,
        size: 1 + rand() * 2.6,
        rgb: colours[Math.floor(rand() * colours.length)],
      });
    }
  }

  resize(width: number, height: number): void {
    if (!width || !height) return;
    this.dpr = Math.min(window.devicePixelRatio || 1, MAX_DPR);
    this.canvas.width = Math.round(width * this.dpr);
    this.canvas.height = Math.round(height * this.dpr);

    const m = Math.min(width, height);
    const portrait = height > width * 1.2;
    const s = Math.min(width * 0.17, height * 0.15);
    const tilt = portrait ? 0.9 : 0.4;
    const rxMax = Math.min(width * 0.45, (height * 0.4) / tilt, 620);
    const rxMin = s * 1.6;
    const rx = Array.from({ length: RINGS }, (_, k) => rxMin + ((rxMax - rxMin) * k) / (RINGS - 1));
    const loopRx = Math.min(rxMax * 1.12, width * 0.47);

    this.layout = {
      w: width,
      h: height,
      m,
      cx: width / 2,
      cy: height * 0.47,
      s,
      tilt,
      rx,
      planetR: Math.min(Math.max(m * 0.042, 13), 32),
      loopRx,
      loopRy: Math.min(loopRx * tilt * 1.1, height * 0.42),
      shipScale: Math.min(Math.max(m / 380, 1.05), 2.1),
      diag: Math.hypot(width, height),
    };

    this.seedMark(width < 600);
    this.paintSky();
  }

  private seedMark(sparse: boolean): void {
    const rand = mulberry32(0x58);
    this.xStars = [];
    X_POINTS.forEach(([tx, ty], i) => {
      // A phone draws half the mark's stars; the shape still reads at that size.
      if (sparse && i % 2) return;
      const spread = 0.6 + rand() * 0.9;
      this.xStars.push({
        sx: rand(),
        sy: rand(),
        tx,
        ty,
        delay: 0.85 + rand() * 0.75,
        size: 0.8 + rand() ** 2 * 1.4,
        cyan: rand() < 0.45,
        ex: (tx + (rand() - 0.5) * 0.6) * spread,
        ey: (ty + (rand() - 0.5) * 0.6) * spread,
      });
    });
  }

  /** The backdrop never changes, so it is painted once per size rather than every frame. */
  private paintSky(): void {
    const { w, h } = this.layout;
    const sky = this.sky;
    sky.width = this.canvas.width;
    sky.height = this.canvas.height;
    const g = sky.getContext('2d');
    if (!g) return;
    g.setTransform(this.dpr, 0, 0, this.dpr, 0, 0);

    const bg = g.createRadialGradient(w / 2, h * 0.47, 0, w / 2, h * 0.47, Math.hypot(w, h) * 0.6);
    bg.addColorStop(0, '#0d1230');
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

    // The ground shakes as the ship comes in and for a beat after it hits.
    const shake =
      (range(t, INTRO_IMPACT - 0.25, INTRO_IMPACT) * (1 - range(t, INTRO_IMPACT, INTRO_IMPACT + 0.6))) *
      L.m *
      0.018;
    if (shake > 0) {
      ctx.translate(Math.sin(t * 91) * shake, Math.cos(t * 77) * shake);
    }

    // Slow push in, the whole way through.
    const zoom = 1 + 0.06 * (t / INTRO_END);
    ctx.save();
    ctx.translate(L.cx, L.cy);
    ctx.scale(zoom, zoom);
    ctx.translate(-L.cx, -L.cy);
    ctx.globalAlpha = range(t, 0, 0.7);
    ctx.drawImage(this.sky, 0, 0, L.w, L.h);
    ctx.globalAlpha = 1;

    this.drawRings(ctx, t);
    const ship = this.shipPose(t);
    this.drawBodies(ctx, t, false);
    if (ship && ship.depth < 0) this.drawShip(ctx, t, ship);
    this.drawMark(ctx, t);
    this.drawBodies(ctx, t, true);
    if (ship && ship.depth >= 0) this.drawShip(ctx, t, ship);
    this.drawWordmark(ctx, t);
    ctx.restore();

    if (t >= INTRO_IMPACT) this.drawImpact(ctx, t);
  }

  private orbitPoint(ring: number, angle: number): [number, number] {
    const L = this.layout;
    const rx = L.rx[ring];
    return [L.cx + Math.cos(angle) * rx, L.cy + Math.sin(angle) * rx * L.tilt];
  }

  /** Planets are thrown outward and fade once the ship hits. */
  private blast(t: number): number {
    return easeOut(range(t, INTRO_IMPACT, INTRO_IMPACT + 1));
  }

  private drawRings(ctx: CanvasRenderingContext2D, t: number): void {
    const L = this.layout;
    const a = 0.09 * range(t, 0.2, 1.2) * (1 - range(t, INTRO_IMPACT, INTRO_IMPACT + 0.3));
    if (a <= 0) return;
    ctx.strokeStyle = `rgba(160, 200, 255, ${a})`;
    ctx.lineWidth = 1;
    for (const rx of L.rx) {
      ctx.beginPath();
      ctx.ellipse(L.cx, L.cy, rx, rx * L.tilt, 0, 0, Math.PI * 2);
      ctx.stroke();
    }
  }

  private drawBodies(ctx: CanvasRenderingContext2D, t: number, front: boolean): void {
    const L = this.layout;
    const blast = this.blast(t);
    const fade = 1 - range(t, INTRO_IMPACT + 0.1, INTRO_IMPACT + 0.7);
    if (fade <= 0) return;

    for (const b of this.bodies) {
      // Inner rings run faster, like a real system.
      const angle = b.phase + t * (0.85 / (1 + b.ring * 0.45));
      const depth = Math.sin(angle);
      if (depth >= 0 !== front) continue;

      const grow = easeOutBack(range(t, b.appearAt, b.appearAt + 0.55));
      if (grow <= 0) continue;
      let [x, y] = this.orbitPoint(b.ring, angle);
      x += (x - L.cx) * blast * 1.8;
      y += (y - L.cy) * blast * 1.8;

      const scale = 0.78 + 0.32 * ((depth + 1) / 2);
      // The body fills 72% of its sprite; the rest is halo.
      const size = (L.planetR * 2 * scale * grow) / 0.72;
      ctx.globalAlpha = fade * (0.7 + 0.3 * ((depth + 1) / 2));
      ctx.drawImage(b.sprite, x - size / 2, y - size / 2, size, size);
    }
    ctx.globalAlpha = 1;
  }

  private drawMark(ctx: CanvasRenderingContext2D, t: number): void {
    const L = this.layout;
    const formed = range(t, 1.2, 2.6);
    const blast = this.blast(t);
    const fade = 1 - range(t, INTRO_IMPACT + 0.2, INTRO_IMPACT + 0.9);
    if (fade <= 0) return;

    // The X is the sun of this system: a soft glow grows behind it as it forms.
    const glow = formed * 0.5 * fade * (1 + 0.5 * range(t, DIVE_START, INTRO_IMPACT));
    if (glow > 0) {
      const r = L.s * 1.9;
      const grad = ctx.createRadialGradient(L.cx, L.cy, 0, L.cx, L.cy, r);
      grad.addColorStop(0, `rgba(0, 180, 216, ${0.35 * glow})`);
      grad.addColorStop(1, 'rgba(0, 180, 216, 0)');
      ctx.fillStyle = grad;
      ctx.fillRect(L.cx - r, L.cy - r, r * 2, r * 2);
    }

    const twinkleT = t * 2.1;
    for (let i = 0; i < this.xStars.length; i++) {
      const st = this.xStars[i];
      const u = easeInOut(range(t, st.delay, st.delay + 1.1));
      const tx = L.cx + st.tx * L.s;
      const ty = L.cy + st.ty * L.s;
      let x = st.sx * L.w + (tx - st.sx * L.w) * u;
      let y = st.sy * L.h + (ty - st.sy * L.h) * u;
      if (blast > 0) {
        x += st.ex * L.m * 1.2 * blast;
        y += st.ey * L.m * 1.2 * blast;
      }
      const twinkle = 0.8 + Math.sin(twinkleT + i) * 0.2;
      // Faint while scattered, so they read as ordinary sky until they gather.
      ctx.globalAlpha = Math.min(1, (0.3 + 0.6 * u) * twinkle * range(t, 0, 0.7) * fade);
      const box = (st.size + u * 0.5) * 5.5;
      ctx.drawImage(st.cyan ? this.cyan : this.white, x - box / 2, y - box / 2, box, box);
    }
    ctx.globalAlpha = 1;

    this.drawConstellation(ctx, t, fade);
  }

  /** The constellation lines, traced stroke by stroke once the stars have landed. */
  private drawConstellation(ctx: CanvasRenderingContext2D, t: number, fade: number): void {
    const L = this.layout;
    const hold = 1 - 0.55 * range(t, 3.2, 3.8);
    ctx.lineCap = 'round';

    STROKES.forEach((stroke, k) => {
      const start = 1.7 + k * 0.45;
      const drawn = range(t, start, start + 0.8) * (stroke.length - 1);
      if (drawn <= 0) return;
      const pts = stroke.map(([x, y]) => [L.cx + x * L.s, L.cy + y * L.s] as const);

      for (const [width, alpha] of [
        [6, 0.16],
        [1.6, 0.9],
      ] as const) {
        ctx.strokeStyle = `rgba(170, 236, 255, ${alpha * hold * fade})`;
        ctx.lineWidth = width;
        ctx.beginPath();
        ctx.moveTo(pts[0][0], pts[0][1]);
        for (let i = 1; i < pts.length; i++) {
          const part = Math.min(1, drawn - (i - 1));
          if (part <= 0) break;
          const [ax, ay] = pts[i - 1];
          const [bx, by] = pts[i];
          ctx.lineTo(ax + (bx - ax) * part, ay + (by - ay) * part);
        }
        ctx.stroke();
      }

      // The anchor stars light up as the line reaches them.
      pts.forEach(([x, y], i) => {
        const lit = clamp01(drawn - i + 1);
        if (lit <= 0) return;
        const box = 16 + 6 * Math.sin(t * 3 + i);
        ctx.globalAlpha = lit * fade;
        ctx.drawImage(this.cyan, x - box / 2, y - box / 2, box, box);
      });
      ctx.globalAlpha = 1;
    });
  }

  private loopPoint(angle: number, shrink: number): [number, number] {
    const L = this.layout;
    return [L.cx + Math.cos(angle) * L.loopRx * shrink, L.cy + Math.sin(angle) * L.loopRy * shrink];
  }

  /**
   * Where the ship is at time t. It swings in from the left onto a loop
   * around the system, then spirals into the centre, faster as it falls.
   */
  private shipPosition(t: number): [number, number] | null {
    const L = this.layout;
    if (t < SHIP_ENTER || t >= INTRO_IMPACT) return null;
    const startAngle = Math.PI * 0.75;
    const speed = LOOP_SWEEP / (DIVE_START - LOOP_START);

    if (t < LOOP_START) {
      const [ex, ey] = this.loopPoint(startAngle, 1);
      // Tangent of the loop at its entry point, so the hand-off is seamless.
      const tx = Math.sin(startAngle) * L.loopRx;
      const ty = -Math.cos(startAngle) * L.loopRy;
      const len = Math.hypot(tx, ty);
      const k = L.loopRx * 0.45;
      const u = range(t, SHIP_ENTER, LOOP_START);
      return [
        bezier(-L.w * 0.08, L.w * 0.05, ex - (tx / len) * k, ex, u),
        bezier(L.cy - L.h * 0.12, L.cy - L.h * 0.02, ey - (ty / len) * k, ey, u),
      ];
    }

    const dive = range(t, DIVE_START, INTRO_IMPACT);
    const angle = startAngle - speed * (t - LOOP_START) - easeIn(dive) * Math.PI * 0.6;
    // Squared, not cubed: a cubic fall kept it out wide and then snapped it in over
    // the last couple of frames, so the dive itself was never seen.
    return this.loopPoint(angle, 1 - dive * dive);
  }

  private shipPose(t: number): ShipPose | null {
    const p = this.shipPosition(t);
    if (!p) return null;
    const L = this.layout;
    const depth = Math.max(-1, Math.min(1, (p[1] - L.cy) / L.loopRy));
    const dive = range(t, DIVE_START, INTRO_IMPACT);
    return {
      x: p[0],
      y: p[1],
      depth,
      scale: L.shipScale * (0.8 + 0.25 * ((depth + 1) / 2)) * (1 + dive * 0.5),
    };
  }

  private drawShip(ctx: CanvasRenderingContext2D, t: number, pose: ShipPose): void {
    const dive = range(t, DIVE_START, INTRO_IMPACT);

    // Exhaust trail, with smoke pouring out once the ship is going down.
    const pts: [number, number][] = [[pose.x, pose.y]];
    for (let i = 1; i <= TRAIL; i++) {
      const p = this.shipPosition(t - i * 0.03);
      if (!p) break;
      pts.push(p);
    }
    ctx.lineCap = 'round';
    for (let i = 1; i < pts.length; i++) {
      const k = 1 - i / TRAIL;
      ctx.strokeStyle = `rgba(255, 176, 92, ${k * 0.6})`;
      ctx.lineWidth = (0.6 + k * 3.4) * pose.scale;
      ctx.beginPath();
      ctx.moveTo(pts[i - 1][0], pts[i - 1][1]);
      ctx.lineTo(pts[i][0], pts[i][1]);
      ctx.stroke();
    }
    if (dive > 0.05) {
      for (let i = 2; i < pts.length; i += 2) {
        const k = 1 - i / TRAIL;
        ctx.fillStyle = `rgba(150, 145, 160, ${k * 0.4 * Math.min(1, dive * 3)})`;
        ctx.beginPath();
        ctx.arc(pts[i][0], pts[i][1], (2 + (1 - k) * 7) * pose.scale, 0, Math.PI * 2);
        ctx.fill();
      }
    }

    const prev = this.shipPosition(t - 0.016) ?? [pose.x - 1, pose.y];
    // A wobble that grows as it loses control.
    const wobble = Math.sin(t * 40) * 0.35 * dive;
    ctx.save();
    ctx.translate(pose.x, pose.y);
    ctx.rotate(Math.atan2(pose.y - prev[1], pose.x - prev[0]) + wobble);
    ctx.scale(pose.scale, pose.scale);
    drawShip(ctx, t);
    ctx.restore();
  }

  private drawWordmark(ctx: CanvasRenderingContext2D, t: number): void {
    const L = this.layout;
    const a = range(t, 2.4, 3.1) * (1 - range(t, INTRO_IMPACT - 0.1, INTRO_IMPACT + 0.2));
    if (a <= 0) return;
    const size = Math.min(Math.max(L.w * 0.022, 15), 26);
    const y = Math.min(L.h - size * 2.5, L.cy + L.rx[RINGS - 1] * L.tilt + L.planetR * 2 + size * 1.8);
    ctx.globalAlpha = a;
    ctx.fillStyle = 'rgba(234, 240, 255, 0.92)';
    ctx.font = `700 ${size}px "Space Grotesk", "Inter", sans-serif`;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.letterSpacing = `${size * 0.6}px`;
    // letterSpacing trails the last glyph too; nudge right by half of it to recentre.
    ctx.fillText('XOMWARE', L.cx + size * 0.3, y);
    ctx.letterSpacing = '0px';
    ctx.globalAlpha = 1;
  }

  /**
   * The blast. Fireball and shockwave from the centre, a hole that opens onto
   * the page underneath, debris thrown out over it, and a flash on top.
   */
  private drawImpact(ctx: CanvasRenderingContext2D, t: number): void {
    const L = this.layout;
    const dt = t - INTRO_IMPACT;

    // Punch the hole first; everything after this paints over the page.
    const hole = L.diag * 0.62 * easeInOut(range(t, INTRO_IMPACT + 0.12, INTRO_END - 0.1));
    if (hole > 0) {
      ctx.globalCompositeOperation = 'destination-out';
      const edge = Math.max(hole - 80, 0);
      const grad = ctx.createRadialGradient(L.cx, L.cy, edge, L.cx, L.cy, hole);
      grad.addColorStop(0, 'rgba(0, 0, 0, 1)');
      grad.addColorStop(1, 'rgba(0, 0, 0, 0)');
      ctx.fillStyle = grad;
      ctx.beginPath();
      ctx.arc(L.cx, L.cy, hole, 0, Math.PI * 2);
      ctx.fill();
      ctx.globalCompositeOperation = 'source-over';
    }

    const fire = easeOut(range(t, INTRO_IMPACT, INTRO_IMPACT + 0.6));
    const fireAlpha = 1 - range(t, INTRO_IMPACT + 0.2, INTRO_IMPACT + 0.9);
    if (fireAlpha > 0) {
      const r = Math.max(L.m * 0.5 * fire, 1);
      const grad = ctx.createRadialGradient(L.cx, L.cy, 0, L.cx, L.cy, r);
      grad.addColorStop(0, `rgba(255, 252, 240, ${fireAlpha})`);
      grad.addColorStop(0.3, `rgba(255, 214, 130, ${0.9 * fireAlpha})`);
      grad.addColorStop(0.65, `rgba(255, 120, 40, ${0.45 * fireAlpha})`);
      grad.addColorStop(1, 'rgba(255, 90, 30, 0)');
      ctx.fillStyle = grad;
      ctx.beginPath();
      ctx.arc(L.cx, L.cy, r, 0, Math.PI * 2);
      ctx.fill();
    }

    const wave = easeOut(range(t, INTRO_IMPACT, INTRO_IMPACT + 1));
    const waveAlpha = 1 - wave;
    if (waveAlpha > 0) {
      ctx.strokeStyle = `rgba(190, 240, 255, ${0.85 * waveAlpha})`;
      ctx.lineWidth = 2 + 8 * waveAlpha;
      ctx.beginPath();
      ctx.arc(L.cx, L.cy, L.diag * 0.6 * wave, 0, Math.PI * 2);
      ctx.stroke();
    }

    const travel = (1 - Math.exp(-2.6 * dt)) / 2.6;
    const debrisAlpha = 1 - range(dt, 0.45, 1.15);
    if (debrisAlpha > 0) {
      for (const d of this.debris) {
        const dist = d.speed * L.m * 1.6 * travel;
        ctx.globalAlpha = debrisAlpha;
        ctx.fillStyle = `rgb(${d.rgb})`;
        ctx.beginPath();
        ctx.arc(L.cx + d.dx * dist, L.cy + d.dy * dist, d.size, 0, Math.PI * 2);
        ctx.fill();
      }
      ctx.globalAlpha = 1;
    }

    // Added light rather than painted over, so it glares instead of greying the scene out.
    const flash = range(t, INTRO_IMPACT, INTRO_IMPACT + 0.05) * (1 - range(t, INTRO_IMPACT + 0.05, INTRO_IMPACT + 0.45));
    if (flash > 0) {
      ctx.globalCompositeOperation = 'lighter';
      ctx.fillStyle = `rgba(252, 248, 230, ${0.85 * flash})`;
      ctx.fillRect(-L.w, -L.h, L.w * 3, L.h * 3);
      ctx.globalCompositeOperation = 'source-over';
    }
  }
}
