import { Planet } from '../data/planets';
import { Bolt, Comet, Rock, bakeRocks, drawComet, rockAt } from './intro-action';
import { Key, poseOn, trackAt } from './intro-flight';
import {
  INTRO_END,
  INTRO_IMPACT,
  IntroLayout,
  PlanetPos,
  PlanetSlot,
  introLayout,
  labelAt,
  planetAt,
  plateRect,
} from './intro-layout';
import { Bounds, opaqueBounds, paintPlanet, paintPlate } from './planet-art';
import {
  COURIER_NOZZLES,
  HAULER_NOZZLES,
  Nozzle,
  RAIDER_NOZZLES,
  SHIP_LENGTH,
  ShipPose,
  drawExhaust,
  drawHauler,
  drawRaider,
  drawShip,
} from './ship';
import { mulberry32 } from './starfield';
import { X_ART, X_POINTS, X_STROKES } from './x-points';

const LOGO_SRC = 'assets/img/xomware-icon.webp';
/** The scene drops out of warp over this long. */
const WARP_END = 0.8;
const DIVE_START = 4.75;
/** The constellation gives way to the real artwork over this window. */
const RESOLVE: [number, number] = [2.7, 3.3];
/** Seconds a star takes to fly from the open sky to its place in the mark. */
const GATHER = 0.8;
const MAX_DPR = 2;
const SPARKS = 90;
const STREAKS = 110;
const BOLT_LIFE = 0.7;
const ROCK_SPRITES = 6;
/** Draw order of a ship in open space: in front of the mark and most of the planets. */
const SHIP_Z = 0.55;

interface Star {
  /** Start, as a fraction of the viewport. */
  sx: number;
  sy: number;
  /** Place in the mark, -1..1. */
  tx: number;
  ty: number;
  at: number;
  size: number;
  /** Which stroke it belongs to, so which ship lights it. */
  stroke: number;
  /** When a ship flies past and lights it; set per layout. */
  lit: number;
}

interface Segment {
  a: Star;
  b: Star;
  /** When the line starts to draw; set per layout. */
  at: number;
}

interface Spark {
  dx: number;
  dy: number;
  speed: number;
  life: number;
  rgb: string;
}

interface Streak {
  angle: number;
  /** Final distance from the centre, as a fraction of half the diagonal. */
  reach: number;
}

interface Craft {
  keys: Key[];
  pose: (t: number) => ShipPose | null;
  scale: (t: number) => number;
  z: (t: number) => number;
  draw: (ctx: CanvasRenderingContext2D, pose: ShipPose, time: number, thrust: number) => void;
  nozzles: readonly Nozzle[];
  sprite: HTMLCanvasElement;
  wake: string;
}

interface Flare {
  t: number;
  x: number;
  y: number;
  rgb: string;
  /** The rock it broke, or null if the rock took the hit. */
  rock: Rock | null;
}

interface Item {
  z: number;
  paint: () => void;
}

const clamp01 = (v: number): number => Math.min(1, Math.max(0, v));
const range = (t: number, a: number, b: number): number => clamp01((t - a) / (b - a));
const easeOut = (u: number): number => 1 - (1 - u) ** 3;
const easeInOut = (u: number): number => (u < 0.5 ? 4 * u ** 3 : 1 - (-2 * u + 2) ** 3 / 2);
const easeOutBack = (u: number): number => 1 + 2.7 * (u - 1) ** 3 + 1.7 * (u - 1) ** 2;

/** Repeatable 0..1 noise for a whole number. */
function hash(n: number): number {
  const s = Math.sin(n * 127.1 + 311.7) * 43758.5453;
  return s - Math.floor(s);
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
 * The landing intro, drawn as a pure function of time. The scene drops out
 * of warp into a system of planets carrying the app banners on three
 * inclined rings around the Xomware X. A courier and a hauler warp in and
 * fly the two strokes of the mark, lighting its stars; a raider chases the
 * courier through the planets with its guns going while the hauler
 * slingshots a planet and shoots its way out through the rocks. Then the
 * courier spirals into the mark and the blast opens a hole onto the page.
 *
 * No state advances per frame: everything that depends on the layout is
 * worked out in `resize`, so any moment can be drawn on its own. That is
 * what lets the frame-capture harness and a dropped frame both land on the
 * right picture.
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
  private readonly red = softSprite('255, 110, 80', 32);
  private readonly amber = softSprite('255, 190, 100', 32);
  private readonly anchors: Star[] = [];
  private readonly segments: Segment[] = [];
  private readonly dust: Star[] = [];
  private readonly sparks: Spark[] = [];
  private readonly streaks: Streak[] = [];
  private readonly rockSprites = bakeRocks(ROCK_SPRITES, 64);
  private bodies: HTMLCanvasElement[] = [];
  private moon: HTMLCanvasElement | null = null;
  private plates: HTMLCanvasElement[] = [];
  private crafts: Craft[] = [];
  private rocks: Rock[] = [];
  private bolts: Bolt[] = [];
  private flares: Flare[] = [];
  private comets: Comet[] = [];
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
    // stroke to its end, ahead of the ship that will light them.
    X_STROKES.forEach((stroke, k) => {
      const n = stroke.left.length;
      const edge = (pts: typeof stroke.left): Star[] =>
        pts.map(([tx, ty], q) => ({
          sx: 0.05 + rand() * 0.9,
          sy: 0.05 + rand() * 0.9,
          tx,
          ty,
          at: 0.15 + k * 0.25 + q * 0.03,
          size: 1.6 + rand() * 0.6,
          stroke: k,
          lit: Infinity,
        }));
      const left = edge(stroke.left);
      const right = edge(stroke.right);
      this.anchors.push(...left, ...right);
      const join = (a: Star, b: Star): void => {
        this.segments.push({ a, b, at: Infinity });
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
        at: 0.2 + rand() * 1.2,
        size: 0.6 + rand() ** 2 * 1.2,
        stroke: -1,
        lit: Infinity,
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

    for (let i = 0; i < STREAKS; i++) {
      this.streaks.push({ angle: rand() * Math.PI * 2, reach: 0.1 + rand() ** 0.7 * 0.95 });
    }
  }

  resize(width: number, height: number): void {
    if (!width || !height) return;
    this.dpr = Math.min(window.devicePixelRatio || 1, MAX_DPR);
    this.canvas.width = Math.round(width * this.dpr);
    this.canvas.height = Math.round(height * this.dpr);
    const L = introLayout(width, height, this.planets.length, this.planets.filter((p) => p.pool).length);
    this.layout = L;

    // Baked lit from +x; drawn turned toward the mark, the sun of this system.
    this.bodies = L.slots.map((slot) =>
      paintPlanet(slot.radius * 1.2 * this.dpr, this.planets[slot.index].colorRgb, slot.index * 7 + 2, [1, 0]),
    );
    this.moon = paintPlanet(Math.max(3, L.slots[0].radius * 0.4 * this.dpr), '150, 150, 162', 4, [1, 0]);
    this.plates = [];
    L.slots.forEach((slot) => this.bakePlate(slot.index));
    this.paintSky();
    this.plan(L);
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

  /** Flight paths, rocks, shots and comets for this layout. */
  private plan(L: IntroLayout): void {
    const { cx, cy, s, hit } = L;
    const X = (u: number, v: number): [number, number] => [cx + u * s, cy + v * s];
    const ax = L.w * 0.42;
    const ay = Math.min(cy, L.h - cy) * 0.8;
    const F = (u: number, v: number): [number, number] => [cx + u * ax, cy + v * ay];
    const key = (t: number, [x, y]: [number, number]): Key => ({ t, x, y });

    // The courier comes out of warp above the mark, flies the first stroke,
    // weaves out through the planets, and spirals into the crossing.
    const courierKeys = [
      key(1.15, X(-1.25, -1.55)),
      key(1.45, X(-0.6, -1)),
      key(1.75, X(0.1, -0.04)),
      key(2.05, X(0.68, 1)),
      key(2.35, X(1.3, 1.5)),
      key(2.75, F(0.78, 0.55)),
      key(3.15, F(0.62, -0.3)),
      key(3.55, F(0.05, -0.72)),
      key(3.95, F(-0.62, -0.45)),
      key(4.35, F(-0.72, 0.25)),
      key(DIVE_START, F(-0.25, 0.62)),
      key(5.05, [hit[0] + s * 1.05, hit[1] + s * 0.25]),
      key(5.3, [hit[0] + s * 0.3, hit[1] - s * 0.6]),
      key(5.48, [hit[0] - s * 0.25, hit[1] - s * 0.1]),
      key(INTRO_IMPACT, hit),
    ];

    // The raider rides the courier's tail, weaving, then breaks away.
    const lag = 0.32;
    const raiderKeys: Key[] = [];
    for (let t = 1.5; t <= 4.0 + 1e-6; t += 0.1) {
      const p = trackAt(courierKeys, t - lag);
      const q = trackAt(courierKeys, t - lag + 0.02);
      if (!p || !q) continue;
      const d = Math.hypot(q[0] - p[0], q[1] - p[1]) || 1;
      const weave = Math.sin(t * 3.1) * 14 * L.shipScale;
      raiderKeys.push(key(t, [p[0] - ((q[1] - p[1]) / d) * weave, p[1] + ((q[0] - p[0]) / d) * weave]));
    }
    const brk = raiderKeys[raiderKeys.length - 1];
    const brkPrev = raiderKeys[raiderKeys.length - 2];
    const head = Math.atan2(brk.y - brkPrev.y, brk.x - brkPrev.x);
    const speed = Math.hypot(brk.x - brkPrev.x, brk.y - brkPrev.y) / 0.1;
    const peel = head - 0.7;
    raiderKeys.push(key(4.3, [brk.x + Math.cos(peel) * speed * 0.3, brk.y + Math.sin(peel) * speed * 0.3]));
    raiderKeys.push(key(5, [brk.x + Math.cos(peel - 0.4) * L.diag * 0.75, brk.y + Math.sin(peel - 0.4) * L.diag * 0.75]));

    // The hauler flies the second stroke, then slingshots round a planet.
    const haulerKeys = [
      key(1.75, X(1.2, -1.25)),
      key(2, X(0.72, -0.72)),
      key(2.3, X(-0.06, 0.05)),
      key(2.6, X(-0.76, 0.82)),
    ];
    // The planet nearest the end of the stroke whose loop stays on screen.
    const squash = 0.62;
    const target = X(-1.4, 1.6);
    const reachOf = (slot: PlanetSlot): number => slot.radius * 2.6 + 16 * L.shipScale;
    const spill = (slot: PlanetSlot): number => {
      let worst = 0;
      for (let t = 2.95; t <= 3.7; t += 0.05) {
        const p = planetAt(L, slot, t);
        const r = reachOf(slot) + 24 * L.shipScale;
        worst = Math.max(worst, r - p.x, p.x + r - L.w, r * squash - p.y, p.y + r * squash - L.h);
      }
      return worst;
    };
    const score = (slot: PlanetSlot): number => {
      const p = planetAt(L, slot, 3.3);
      return spill(slot) * 100 + Math.hypot(p.x - target[0], p.y - target[1]);
    };
    const around = L.slots.filter((slot) => slot.ring > 0).reduce((best, slot) => (score(slot) < score(best) ? slot : best));
    const orbit = reachOf(around);
    const p0 = planetAt(L, around, 2.95);
    const last = haulerKeys[haulerKeys.length - 1];
    const theta0 = Math.atan2((last.y - p0.y) / squash, last.x - p0.x);
    const inX = last.x - haulerKeys[haulerKeys.length - 2].x;
    const inY = last.y - haulerKeys[haulerKeys.length - 2].y;
    const dir = -Math.sin(theta0) * inX + Math.cos(theta0) * squash * inY >= 0 ? 1 : -1;
    const sweep = Math.PI * 1.3;
    const loopAt = (t: number): [number, number] => {
      const p = planetAt(L, around, t);
      const a = theta0 + dir * sweep * range(t, 2.95, 3.7);
      return [p.x + Math.cos(a) * orbit, p.y + Math.sin(a) * orbit * squash];
    };
    for (let t = 2.95; t <= 3.7 + 1e-6; t += 0.125) haulerKeys.push(key(t, loopAt(t)));
    const end = loopAt(3.7);
    const endPrev = loopAt(3.65);
    const out = Math.atan2(end[1] - endPrev[1], end[0] - endPrev[0]);
    const outSpeed = Math.hypot(end[0] - endPrev[0], end[1] - endPrev[1]) / 0.05;
    haulerKeys.push(key(4.1, [end[0] + Math.cos(out) * outSpeed * 0.4, end[1] + Math.sin(out) * outSpeed * 0.4]));
    haulerKeys.push(key(4.9, [end[0] + Math.cos(out) * L.diag * 0.8, end[1] + Math.sin(out) * L.diag * 0.8]));

    const dive = (t: number): number => range(t, DIVE_START, INTRO_IMPACT);
    const near = (t: number, keys: Key[]): number => {
      const pose = poseOn(keys, t);
      const p = planetAt(L, around, t);
      if (!pose || Math.hypot(pose.x - p.x, (pose.y - p.y) / squash) > orbit * 1.4) return SHIP_Z;
      return p.depth + (pose.y > p.y ? 0.05 : -0.05);
    };
    this.crafts = [
      {
        keys: courierKeys,
        pose: (t) => poseOn(courierKeys, t),
        scale: (t) => L.shipScale * (1 + dive(t) * 0.45),
        z: () => SHIP_Z,
        draw: drawShip,
        nozzles: COURIER_NOZZLES,
        sprite: this.hot,
        wake: '120, 200, 255',
      },
      {
        keys: raiderKeys,
        pose: (t) => poseOn(raiderKeys, t),
        scale: () => L.shipScale * 0.92,
        z: () => SHIP_Z + 0.01,
        draw: drawRaider,
        nozzles: RAIDER_NOZZLES,
        sprite: this.red,
        wake: '255, 110, 90',
      },
      {
        keys: haulerKeys,
        pose: (t) => poseOn(haulerKeys, t),
        scale: () => L.shipScale * 1.08,
        z: (t) => near(t, haulerKeys),
        draw: drawHauler,
        nozzles: HAULER_NOZZLES,
        sprite: this.amber,
        wake: '255, 180, 100',
      },
    ];

    this.lightConstellation(L);
    this.planRocks(L);
    this.planShots(L);

    const { w, h } = L;
    this.comets = [
      { t0: 0.5, t1: 2.7, from: [w * 1.05, h * 0.16], to: [w * 0.3, -h * 0.06] },
      { t0: 2.4, t1: 4.6, from: [-w * 0.05, h * 0.66], to: [w * 0.62, h * 1.06] },
    ];
    if (w >= 600) this.comets.push({ t0: 3.6, t1: 5.5, from: [w * 0.7, -h * 0.05], to: [w * 1.05, h * 0.5] });
  }

  /** Each stroke's stars light, and its lines draw, as the ship flying it passes. */
  private lightConstellation(L: IntroLayout): void {
    for (const star of this.anchors) {
      const craft = this.crafts[star.stroke === 0 ? 0 : 2];
      const x = L.cx + star.tx * L.s;
      const y = L.cy + star.ty * L.s;
      let best = Infinity;
      let when = craft.keys[0].t;
      for (let t = craft.keys[0].t; t < craft.keys[0].t + 1.4; t += 0.004) {
        const p = trackAt(craft.keys, t);
        if (!p) break;
        const d = Math.hypot(p[0] - x, p[1] - y);
        if (d < best) {
          best = d;
          when = t;
        }
      }
      star.lit = Math.max(when, star.at + GATHER);
    }
    for (const seg of this.segments) seg.at = Math.max(seg.a.lit, seg.b.lit) - 0.04;
  }

  private planRocks(L: IntroLayout): void {
    const rand = mulberry32(0xb0b);
    const k = Math.min(1.3, Math.max(0.6, L.m / 700));
    const count = L.w < 600 ? 14 : 22;
    const clusters: [number, number][] = [
      [L.cx + L.w * 0.3, L.cy - Math.min(L.cy, L.h - L.cy) * 0.55],
      [L.cx - L.w * 0.28, L.cy + Math.min(L.cy, L.h - L.cy) * 0.5],
    ];
    this.rocks = [];
    for (let i = 0; i < count; i++) {
      const [ox, oy] = clusters[i % 2];
      const vx = -L.w * (0.02 + rand() * 0.03);
      const vy = L.h * (rand() - 0.3) * 0.02;
      // Placed where it should be halfway through, then wound back to the start.
      const x = ox + (rand() - 0.5) * L.w * 0.42;
      const y = oy + (rand() - 0.5) * L.h * 0.22;
      this.rocks.push({
        x: x - vx * 2.8,
        y: y - vy * 2.8,
        vx,
        vy,
        r: (3 + rand() ** 1.8 * 9) * k,
        angle: rand() * Math.PI * 2,
        spin: (rand() - 0.5) * 2.4,
        sprite: i % ROCK_SPRITES,
        z: rand() < 0.5 ? -0.8 : 0.8,
        broken: Infinity,
      });
    }
  }

  /** Every shot fired, worked out ahead: where it goes and whether a rock stops it. */
  private planShots(L: IntroLayout): void {
    const [courier, raider, hauler] = this.crafts;
    const speed = Math.max(900, L.diag * 1.1);
    const small = 6 * Math.min(1.3, Math.max(0.6, L.m / 700));
    type Shot = { craft: Craft; t: number; muzzle: [number, number]; at: 'courier' | 'rock'; rgb: string; n: number };
    const shots: Shot[] = [];
    [2.2, 2.3, 2.4, 2.95, 3.05, 3.15, 3.55, 3.65, 3.75].forEach((t, n) =>
      shots.push({ craft: raider, t, muzzle: [20, n % 2 ? 21.6 : -21.6], at: 'courier', rgb: '255, 96, 80', n }),
    );
    [3.25, 3.35, 3.45, 4.05, 4.15].forEach((t, n) =>
      shots.push({ craft: courier, t, muzzle: [37, 0], at: 'rock', rgb: '140, 230, 255', n }),
    );
    [3.85, 3.95, 4.05, 4.15].forEach((t, n) =>
      shots.push({ craft: hauler, t, muzzle: [26, n % 2 ? 8 : -8], at: 'rock', rgb: '255, 200, 110', n }),
    );
    shots.sort((a, b) => a.t - b.t);

    this.bolts = [];
    this.flares = [];
    for (const shot of shots) {
      const pose = shot.craft.pose(shot.t);
      if (!pose) continue;
      const k = shot.craft.scale(shot.t);
      const cos = Math.cos(pose.heading);
      const sin = Math.sin(pose.heading);
      const [mx, my] = shot.muzzle;
      const x = pose.x + (mx * cos - my * sin) * k;
      const y = pose.y + (mx * sin + my * cos) * k;
      let aim = pose.heading;
      if (shot.at === 'courier') {
        const c = courier.pose(shot.t);
        if (c) {
          const lead = Math.hypot(c.x - x, c.y - y) / speed;
          const ahead = courier.pose(shot.t + lead) ?? c;
          // Near misses either side: it's a chase, not an execution.
          const miss = (shot.n % 2 ? 1 : -1) * (12 + 6 * (shot.n % 3)) * L.shipScale;
          aim = Math.atan2(ahead.y + Math.cos(ahead.heading) * miss - y, ahead.x - Math.sin(ahead.heading) * miss - x);
        }
      } else {
        aim = this.aimAtRock(x, y, pose.heading, shot.t, speed, L) ?? aim;
      }
      const bolt: Bolt = {
        t0: shot.t,
        x,
        y,
        dx: Math.cos(aim),
        dy: Math.sin(aim),
        speed,
        end: shot.t + BOLT_LIFE,
        rgb: shot.rgb,
        struck: false,
      };
      for (let dt = 0; dt < BOLT_LIFE; dt += 1 / 240) {
        const t = shot.t + dt;
        const bx = x + bolt.dx * speed * dt;
        const by = y + bolt.dy * speed * dt;
        const rock = this.rocks.find((r) => {
          if (r.broken <= t) return false;
          const [rx, ry] = rockAt(r, t);
          return Math.hypot(bx - rx, by - ry) < r.r * 0.9 + 2;
        });
        if (!rock) continue;
        bolt.end = t;
        bolt.struck = true;
        const breaks = rock.r < small;
        if (breaks) rock.broken = t;
        this.flares.push({ t, x: bx, y: by, rgb: shot.rgb, rock: breaks ? rock : null });
        break;
      }
      this.bolts.push(bolt);
    }
  }

  /** The heading that leads the nearest rock ahead, if one is in reach. */
  private aimAtRock(x: number, y: number, heading: number, t: number, speed: number, L: IntroLayout): number | null {
    let best: number | null = null;
    let bestD = L.diag * 0.7;
    for (const rock of this.rocks) {
      if (rock.broken <= t) continue;
      let [rx, ry] = rockAt(rock, t);
      const lead = Math.hypot(rx - x, ry - y) / speed;
      [rx, ry] = rockAt(rock, t + lead);
      const d = Math.hypot(rx - x, ry - y);
      let off = Math.atan2(ry - y, rx - x) - heading;
      off = Math.atan2(Math.sin(off), Math.cos(off));
      if (Math.abs(off) > 0.75 || d >= bestD) continue;
      bestD = d;
      best = heading + off;
    }
    return best;
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

    // Out of warp the camera settles back. It's still by the time the banners
    // show, so they sit exactly where the layout checked them.
    const zoom = 1 + 0.14 * (1 - easeOut(range(t, 0, 0.9)));
    ctx.save();
    ctx.translate(L.cx, L.cy);
    ctx.scale(zoom, zoom);
    ctx.translate(-L.cx, -L.cy);
    ctx.globalAlpha = 0.25 + 0.75 * range(t, 0.15, 0.7);
    ctx.drawImage(this.sky, 0, 0, L.w, L.h);
    ctx.globalAlpha = 1;

    if (t < WARP_END) this.drawWarp(ctx, t);
    this.drawOrbits(ctx, t);
    for (const comet of this.comets) drawComet(ctx, comet, t, this.cyan, L.m * 0.2);

    const items: Item[] = [];
    this.queuePlanets(items, t);
    this.queueRocks(items, t);
    items.push({ z: 0, paint: () => this.drawMark(ctx, t) });
    for (const craft of this.crafts) {
      const pose = craft.pose(t);
      if (pose && t < INTRO_IMPACT) items.push({ z: craft.z(t), paint: () => this.drawCraft(ctx, craft, pose, t) });
    }
    items.sort((a, b) => a.z - b.z);
    // Banners hang between the system and the ships flying through it, so a
    // ship crossing a banner passes in front of it rather than vanishing.
    for (const item of items) if (item.z < SHIP_Z) item.paint();
    this.drawPlates(ctx, t);
    for (const item of items) if (item.z >= SHIP_Z) item.paint();

    for (const craft of this.crafts) this.drawWarpIn(ctx, craft, t);
    this.drawBolts(ctx, t);
    this.drawFlares(ctx, t);
    ctx.restore();

    if (t >= INTRO_IMPACT) this.drawImpact(ctx, t);
  }

  /** Planets are thrown outward and fade once the ship hits. */
  private blast(t: number): number {
    return easeOut(range(t, INTRO_IMPACT, INTRO_IMPACT + 1));
  }

  /** Stars stretched into lines that shrink back to points as the scene drops out of warp. */
  private drawWarp(ctx: CanvasRenderingContext2D, t: number): void {
    const L = this.layout as IntroLayout;
    const u = range(t, 0, WARP_END);
    const a = (1 - u) ** 1.2;
    const half = L.diag / 2;
    const tail = 1 - 0.9 * (1 - easeOut(u));
    ctx.globalCompositeOperation = 'lighter';
    ctx.lineCap = 'round';
    ctx.beginPath();
    for (const s of this.streaks) {
      const cos = Math.cos(s.angle);
      const sin = Math.sin(s.angle);
      const r = s.reach * half;
      ctx.moveTo(L.cx + cos * r * tail, L.cy + sin * r * tail);
      ctx.lineTo(L.cx + cos * r, L.cy + sin * r);
    }
    for (const [width, rgb, k] of [
      [2.4, '120, 190, 255', 0.12],
      [0.9, '220, 238, 255', 0.5],
    ] as const) {
      ctx.strokeStyle = `rgba(${rgb}, ${k * a})`;
      ctx.lineWidth = width;
      ctx.stroke();
    }
    const glow = (1 - range(t, 0, 0.45)) * 0.16;
    if (glow > 0) {
      const r = L.m * 0.5;
      const grad = ctx.createRadialGradient(L.cx, L.cy, 0, L.cx, L.cy, r);
      grad.addColorStop(0, `rgba(200, 236, 255, ${glow})`);
      grad.addColorStop(1, 'rgba(120, 190, 255, 0)');
      ctx.fillStyle = grad;
      ctx.fillRect(L.cx - r, L.cy - r, r * 2, r * 2);
    }
    ctx.globalCompositeOperation = 'source-over';
  }

  private drawOrbits(ctx: CanvasRenderingContext2D, t: number): void {
    const L = this.layout as IntroLayout;
    const a = 0.08 * range(t, 0.3, 1.1) * (1 - range(t, INTRO_IMPACT, INTRO_IMPACT + 0.3));
    if (a <= 0) return;
    ctx.strokeStyle = `rgba(160, 200, 255, ${a})`;
    ctx.lineWidth = 1;
    ctx.beginPath();
    for (const ring of L.rings) {
      ctx.moveTo(L.cx + ring.a * Math.cos(ring.tilt), L.cy + ring.a * Math.sin(ring.tilt));
      ctx.ellipse(L.cx, L.cy, ring.a, ring.b, ring.tilt, 0, Math.PI * 2);
    }
    ctx.stroke();
  }

  private queuePlanets(items: Item[], t: number): void {
    const L = this.layout as IntroLayout;
    const ctx = this.ctx as CanvasRenderingContext2D;
    const blast = this.blast(t);
    const fade = 1 - range(t, INTRO_IMPACT + 0.05, INTRO_IMPACT + 0.6);
    if (fade <= 0) return;
    for (const slot of L.slots) {
      const appear = 0.12 + slot.index * 0.05;
      const grow = easeOutBack(range(t, appear, appear + 0.45));
      if (grow <= 0) continue;
      const p = planetAt(L, slot, t);
      const x = p.x + (p.x - L.cx) * blast * 1.6;
      const y = p.y + (p.y - L.cy) * blast * 1.6;
      items.push({ z: p.depth, paint: () => this.drawPlanet(ctx, slot, p, x, y, grow, fade, t) });
    }
  }

  private drawPlanet(
    ctx: CanvasRenderingContext2D,
    slot: PlanetSlot,
    p: PlanetPos,
    x: number,
    y: number,
    grow: number,
    fade: number,
    t: number,
  ): void {
    const L = this.layout as IntroLayout;
    const r = slot.radius * p.scale * grow;
    // The far side of an orbit is further from the eye and dimmer.
    const alpha = (0.6 + 0.4 * ((p.depth + 1) / 2)) * fade;
    const sun = Math.atan2(L.cy - y, L.cx - x);
    const rgb = this.planets[slot.index].colorRgb;
    const tilt = slot.index % 2 ? -0.35 : 0.3;

    const belt = (front: boolean): void => {
      ctx.save();
      ctx.translate(x, y);
      ctx.rotate(tilt);
      for (const [k, width, a] of [
        [1.6, 0.34, 0.28],
        [1.85, 0.12, 0.5],
        [2.05, 0.06, 0.3],
      ] as const) {
        ctx.strokeStyle = `rgba(${rgb}, ${a * alpha})`;
        ctx.lineWidth = Math.max(1, r * width);
        ctx.beginPath();
        ctx.ellipse(0, 0, r * k, r * k * 0.28, 0, front ? 0 : Math.PI, front ? Math.PI : Math.PI * 2);
        ctx.stroke();
      }
      ctx.restore();
    };

    const moonAngle = t * 2.4 + slot.index;
    const moonFront = Math.sin(moonAngle) > 0;
    const moon = (): void => {
      if (!this.moon) return;
      const size = Math.max(3, r * 0.32) * 3;
      const mx = x + Math.cos(moonAngle) * r * 2;
      const my = y + Math.sin(moonAngle) * r * 0.55;
      ctx.save();
      ctx.translate(mx, my);
      ctx.rotate(Math.atan2(L.cy - my, L.cx - mx));
      ctx.globalAlpha = alpha;
      ctx.drawImage(this.moon, -size / 2, -size / 2, size, size);
      ctx.restore();
    };

    if (slot.belt) belt(false);
    if (slot.moon && !moonFront) moon();
    ctx.save();
    ctx.translate(x, y);
    ctx.rotate(sun);
    ctx.globalAlpha = alpha;
    const size = r * 3;
    ctx.drawImage(this.bodies[slot.index], -size / 2, -size / 2, size, size);
    ctx.restore();
    if (slot.belt) belt(true);
    if (slot.moon && moonFront) moon();
    ctx.globalAlpha = 1;
  }

  private queueRocks(items: Item[], t: number): void {
    const ctx = this.ctx as CanvasRenderingContext2D;
    const a = range(t, 0.4, 1.2) * (1 - range(t, INTRO_IMPACT, INTRO_IMPACT + 0.4));
    if (a <= 0) return;
    for (const rock of this.rocks) {
      if (t >= rock.broken) continue;
      items.push({
        z: rock.z,
        paint: () => {
          const [x, y] = rockAt(rock, t);
          const size = rock.r * 2.2;
          ctx.save();
          ctx.translate(x, y);
          ctx.rotate(rock.angle + rock.spin * t);
          ctx.globalAlpha = a * (rock.z < 0 ? 0.75 : 1);
          ctx.drawImage(this.rockSprites[rock.sprite], -size / 2, -size / 2, size, size);
          ctx.restore();
        },
      });
    }
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
    const L = this.layout as IntroLayout;
    const resolved = easeInOut(range(t, RESOLVE[0], RESOLVE[1]));
    const gone = range(t, INTRO_IMPACT, INTRO_IMPACT + 0.3);
    if (gone >= 1) return;
    const live = 1 - gone;

    // The X is the sun of this system: a soft light grows behind it as it forms.
    const formed = range(t, 1.3, 2.6);
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
    const dustFade = (1 - 0.9 * resolved) * live * range(t, 0.2, 0.7);
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

  /** The lines between the anchor stars, each drawing as a ship passes over it. */
  private drawConstellation(ctx: CanvasRenderingContext2D, t: number, alpha: number): void {
    if (alpha <= 0) return;
    ctx.lineCap = 'round';
    ctx.beginPath();
    for (const seg of this.segments) {
      const u = easeOut(range(t, seg.at, seg.at + 0.16));
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

    for (const star of this.anchors) {
      const [x, y, u] = this.starAt(star, t);
      const lit = range(t, star.lit - 0.05, star.lit);
      // A flare as the ship lights it.
      const flare = lit * (1 - range(t, star.lit, star.lit + 0.45));
      const box = star.size * (5 + u * 2 + lit * 2 + flare * 9);
      ctx.globalAlpha = Math.min(1, (0.3 + 0.35 * u + 0.35 * lit) * alpha * range(t, 0.2, 0.6) + flare * 0.6);
      ctx.drawImage(this.cyan, x - box / 2, y - box / 2, box, box);
    }
    ctx.globalAlpha = 1;
  }

  /** The real artwork, laid exactly over the stars it was traced from. */
  private drawLogo(ctx: CanvasRenderingContext2D, resolved: number, gone: number): void {
    const L = this.layout as IntroLayout;
    if (!this.logoReady) return;
    const size = (L.s / X_ART.half) * (1.05 - 0.05 * resolved) * (1 + gone * 0.25);
    ctx.globalAlpha = resolved * (1 - gone);
    ctx.drawImage(this.logo, L.cx - X_ART.cx * size, L.cy - X_ART.cy * size, size, size);
    ctx.globalAlpha = 1;
  }

  private drawCraft(ctx: CanvasRenderingContext2D, craft: Craft, pose: ShipPose, t: number): void {
    const start = craft.keys[0].t;
    const scale = craft.scale(t);
    const dive = craft === this.crafts[0] ? range(t, DIVE_START, INTRO_IMPACT) : 0;
    // Stretched along its heading for a moment as it drops out of warp.
    const stretch = 1 + 2.2 * (1 - range(t, start, start + 0.12)) ** 2;

    drawExhaust(ctx, craft.sprite, craft.pose, t, scale, dive, craft.nozzles, craft.wake);
    ctx.save();
    ctx.translate(pose.x, pose.y);
    ctx.rotate(pose.heading + Math.sin(t * 40) * 0.12 * dive);
    ctx.scale(scale * stretch, scale);
    // Centre the craft on its path rather than its nose.
    ctx.translate(-SHIP_LENGTH * 0.04, 0);
    const shake = { ...pose, bank: pose.bank + Math.sin(t * 34) * 0.3 * dive };
    craft.draw(ctx, shake, t, 1 + dive * 0.5);
    ctx.restore();
  }

  /** A streak that collapses onto the spot a craft arrives at, and a flash as it does. */
  private drawWarpIn(ctx: CanvasRenderingContext2D, craft: Craft, t: number): void {
    const L = this.layout as IntroLayout;
    const start = craft.keys[0].t;
    if (t < start - 0.2 || t > start + 0.2) return;
    const pose = craft.pose(start);
    if (!pose) return;
    const cos = Math.cos(pose.heading);
    const sin = Math.sin(pose.heading);
    ctx.globalCompositeOperation = 'lighter';
    if (t < start) {
      const u = range(t, start - 0.2, start);
      const len = L.diag * 0.5 * (1 - easeOut(u)) + 10;
      const grad = ctx.createLinearGradient(pose.x, pose.y, pose.x - cos * len, pose.y - sin * len);
      grad.addColorStop(0, `rgba(240, 250, 255, ${0.3 + 0.6 * u})`);
      grad.addColorStop(1, 'rgba(140, 200, 255, 0)');
      ctx.strokeStyle = grad;
      ctx.lineWidth = 1.5 + 2 * u;
      ctx.lineCap = 'round';
      ctx.beginPath();
      ctx.moveTo(pose.x, pose.y);
      ctx.lineTo(pose.x - cos * len, pose.y - sin * len);
      ctx.stroke();
    }
    const flash = range(t, start - 0.06, start) * (1 - range(t, start, start + 0.2));
    if (flash > 0) {
      const r = 40 * L.shipScale;
      const grad = ctx.createRadialGradient(pose.x, pose.y, 0, pose.x, pose.y, r);
      grad.addColorStop(0, `rgba(235, 248, 255, ${0.8 * flash})`);
      grad.addColorStop(1, 'rgba(120, 190, 255, 0)');
      ctx.fillStyle = grad;
      ctx.fillRect(pose.x - r, pose.y - r, r * 2, r * 2);
    }
    ctx.globalCompositeOperation = 'source-over';
  }

  private drawBolts(ctx: CanvasRenderingContext2D, t: number): void {
    const L = this.layout as IntroLayout;
    const len = 30 * L.shipScale;
    ctx.globalCompositeOperation = 'lighter';
    ctx.lineCap = 'round';
    for (const bolt of this.bolts) {
      if (t < bolt.t0 || t >= bolt.end) continue;
      const travelled = bolt.speed * (t - bolt.t0);
      const hx = bolt.x + bolt.dx * travelled;
      const hy = bolt.y + bolt.dy * travelled;
      const tail = Math.min(travelled, len);
      for (const [width, a] of [
        [4, 0.3],
        [1.4, 1],
      ] as const) {
        ctx.strokeStyle = `rgba(${bolt.rgb}, ${a})`;
        ctx.lineWidth = width;
        ctx.beginPath();
        ctx.moveTo(hx - bolt.dx * tail, hy - bolt.dy * tail);
        ctx.lineTo(hx, hy);
        ctx.stroke();
      }
      const muzzle = 1 - range(t, bolt.t0, bolt.t0 + 0.07);
      if (muzzle > 0) {
        const r = 9 * L.shipScale;
        ctx.globalAlpha = muzzle;
        ctx.drawImage(this.white, bolt.x - r, bolt.y - r, r * 2, r * 2);
        ctx.globalAlpha = 1;
      }
    }
    ctx.globalCompositeOperation = 'source-over';
  }

  /** Where a shot strikes a rock: a hot flash and sparks, and chips if the rock broke. */
  private drawFlares(ctx: CanvasRenderingContext2D, t: number): void {
    const L = this.layout as IntroLayout;
    const k = Math.min(1.3, Math.max(0.6, L.m / 700));
    this.flares.forEach((f, n) => {
      const dt = t - f.t;
      if (dt < 0 || dt > 1.2) return;
      ctx.globalCompositeOperation = 'lighter';
      const u = dt / 0.45;
      if (u < 1) {
        const r = 20 * k * (0.5 + u);
        ctx.globalAlpha = (1 - u) ** 2;
        ctx.drawImage(this.amber, f.x - r, f.y - r, r * 2, r * 2);
        ctx.drawImage(this.white, f.x - r / 3, f.y - r / 3, (r * 2) / 3, (r * 2) / 3);
        ctx.globalAlpha = 1;
        ctx.lineWidth = 1.2;
        ctx.lineCap = 'round';
        for (let i = 0; i < 7; i++) {
          const a = hash(n * 13 + i) * Math.PI * 2;
          const d = (8 + hash(n * 7 + i) * 18) * k * easeOut(u);
          const x = f.x + Math.cos(a) * d;
          const y = f.y + Math.sin(a) * d;
          ctx.strokeStyle = `rgba(255, 220, 160, ${1 - u})`;
          ctx.beginPath();
          ctx.moveTo(x - Math.cos(a) * 4 * k, y - Math.sin(a) * 4 * k);
          ctx.lineTo(x, y);
          ctx.stroke();
        }
      }
      ctx.globalCompositeOperation = 'source-over';
      const rock = f.rock;
      if (!rock) return;
      // The broken rock's chips keep its drift and tumble apart.
      const [rx, ry] = rockAt(rock, t);
      for (let i = 0; i < 4; i++) {
        const a = hash(n * 31 + i) * Math.PI * 2;
        const d = (10 + hash(n * 17 + i) * 22) * k * (1 - Math.exp(-3 * dt));
        const size = rock.r * (0.7 + 0.4 * hash(n + i));
        ctx.save();
        ctx.translate(rx + Math.cos(a) * d, ry + Math.sin(a) * d);
        ctx.rotate(rock.angle + (i + 1) * dt * 3);
        ctx.globalAlpha = 1 - range(dt, 0.6, 1.2);
        ctx.drawImage(this.rockSprites[(rock.sprite + i + 1) % ROCK_SPRITES], -size / 2, -size / 2, size, size);
        ctx.restore();
      }
      ctx.globalAlpha = 1;
    });
  }

  private drawPlates(ctx: CanvasRenderingContext2D, t: number): void {
    const L = this.layout as IntroLayout;
    const blast = this.blast(t);
    const fade = 1 - range(t, INTRO_IMPACT + 0.05, INTRO_IMPACT + 0.5);
    if (fade <= 0) return;
    for (const slot of L.slots) {
      const plate = this.plates[slot.index];
      const label = labelAt(L, slot.index, Math.min(t, INTRO_IMPACT - 1e-3));
      const a = label.alpha * fade;
      if (!plate || a <= 0) continue;
      const p = planetAt(L, slot, t);
      const r = plateRect(L, slot, p, label.anchor);
      const dx = (p.x - L.cx) * blast * 1.6;
      const dy = (p.y - L.cy) * blast * 1.6;
      ctx.globalAlpha = a;
      ctx.drawImage(plate, r.x + dx, r.y + dy + (1 - label.alpha) * 4, r.w, r.h);
    }
    ctx.globalAlpha = 1;
  }

  /** Flash, shockwave and sparks from the crossing of the X, and a hole that opens onto the page. */
  private drawImpact(ctx: CanvasRenderingContext2D, t: number): void {
    const L = this.layout as IntroLayout;
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
