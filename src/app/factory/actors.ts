import { AppCard } from '../data/apps.data';
import { COS30, Painter } from './iso';
import { LineLayout, PIT_R, inPit, lastStation } from './layout';
import { Shipment, drawPackage } from './packages';
import { Drawable, pressStroke, smooth, visibleRange } from './scene';

const BELT_SPEED = 55;
const SIDE_SPEED = 50;
const PILE_MAX = 48;
const CRATE = 36;
const SUITS = ['#ff7a1a', '#2f7cf6', '#22b573', '#9b5cff', '#e8475f', '#f2c230', '#e9e6df', '#18a3b8'];
const HATS = ['#ffd23f', '#ff8c1a', '#ffffff', '#3a86ff', '#ef476f', '#7ae582'];
const SKIN = ['#f1c9a5', '#d9a27c', '#a86f4c', '#7a4a2f', '#f5d6c6', '#c68b62'];

export type Rand = () => number;
type Role = 'walker' | 'carrier' | 'cart' | 'foreman' | 'fixer';

interface Crate {
  x: number;
  y: number;
  /** Time it blew up, 0 while intact. */
  dead: number;
  /** Time it (re)appeared, for the grow-in. */
  pop: number;
}

interface SideCrate {
  kind: 'in' | 'out';
  x: number;
  y: number;
  app: AppCard | null;
}

export interface PileCrate {
  x: number;
  y: number;
  z: number;
  vx: number;
  vy: number;
  vz: number;
  app: AppCard | null;
  settled: boolean;
}

interface Worker {
  role: Role;
  x: number;
  y: number;
  heading: number;
  speed: number;
  phase: number;
  scale: number;
  width: number;
  suit: string;
  hat: string;
  skin: string;
  face: number;
  panic: number;
  moving: boolean;
  /** Where a foreman or mechanic keeps returning to. */
  home: number;
  /** A cart's direction along the line. */
  dir: number;
  /** Seconds left on a foreman's pointing gesture. */
  point: number;
}

interface Puff {
  x: number;
  y: number;
  z: number;
  r: number;
  vr: number;
  vz: number;
  t: number;
  life: number;
}

interface Spark {
  x: number;
  y: number;
  z: number;
  vx: number;
  vy: number;
  vz: number;
  t: number;
  life: number;
}

/** Height of the pile's surface: a cone peaking over the middle of the pit. */
export function mound(layout: LineLayout, x: number, y: number): number {
  const d = Math.hypot(x - layout.pit, y) / PIT_R;
  return -150 + 150 * Math.max(0, 1 - d) ** 0.8;
}

export class Actors {
  crates: Crate[] = [];
  sideCrates: SideCrate[] = [];
  pile: PileCrate[] = [];
  workers: Worker[] = [];
  puffs: Puff[] = [];
  sparks: Spark[] = [];
  shake = 0;
  flash = 0;
  private nextBoom = 3;
  private feeders: number[];
  private lastT = 0;

  constructor(
    private readonly layout: LineLayout,
    private readonly rand: Rand = Math.random,
  ) {
    const { stations, sides, beltEnd, pit } = layout;
    for (let x = 60; x < beltEnd; x += this.between(130, 190)) this.crates.push({ x, y: 0, dead: 0, pop: 0 });
    for (const s of stations) {
      for (let n = 0; n < 2; n++) {
        const r = this.between(0, PIT_R * 0.85);
        const a = this.between(0, Math.PI * 2);
        const x = pit + Math.cos(a) * r;
        const y = Math.sin(a) * r;
        this.pile.push({ x, y, z: mound(layout, x, y), vx: 0, vy: 0, vz: 0, app: s.app, settled: true });
      }
    }
    for (let i = 0; i < Math.round(pit / 150); i++) {
      const side = this.rand() < 0.5 ? -1 : 1;
      this.addWorker(this.rand() < 0.4 ? 'carrier' : 'walker', this.between(0, pit - PIT_R - 40), side * this.between(110, 430));
    }
    for (const s of stations) {
      this.addWorker('foreman', s.x + this.between(-80, 80), this.between(150, 185), s.x);
      this.addWorker('cart', s.x - 300, 100 + this.between(0, 20));
      // Mechanics work the front leg of each crane, on the side away from any diverter belt.
      if (s.crane !== null) this.addWorker('fixer', s.crane - 34, 228, s.crane - 34);
    }
    this.feeders = sides.map(() => this.between(0, 2));
  }

  private between(a: number, b: number): number {
    return a + this.rand() * (b - a);
  }

  private pick<T>(list: T[]): T {
    return list[Math.floor(this.rand() * list.length)];
  }

  private addWorker(role: Role, x: number, y: number, home = x): void {
    this.workers.push({
      role, x, y, home,
      heading: this.between(0, Math.PI * 2),
      speed: role === 'cart' ? this.between(30, 45) : this.between(26, 46),
      phase: this.between(0, 6),
      scale: this.between(0.88, 1.18),
      width: this.between(0.9, 1.2),
      suit: this.pick(SUITS),
      hat: this.pick(HATS),
      skin: this.pick(SKIN),
      face: 1,
      panic: 0,
      moving: true,
      dir: this.rand() < 0.5 ? -1 : 1,
      point: 0,
    });
  }

  /** A malfunction: smoke, sparks, a jolt, and everyone nearby runs. */
  boom(x: number, y: number, z: number): void {
    for (let i = 0; i < 12; i++) {
      this.puffs.push({ x: x + this.between(-30, 30), y: y + this.between(-30, 30), z: z + this.between(0, 30), r: this.between(10, 22), vr: this.between(30, 70), vz: this.between(30, 90), t: 0, life: this.between(1, 1.8) });
    }
    for (let i = 0; i < 26; i++) {
      const a = this.between(0, Math.PI * 2);
      const s = this.between(80, 300);
      this.sparks.push({ x, y, z, vx: Math.cos(a) * s, vy: Math.sin(a) * s, vz: this.between(200, 520), t: 0, life: this.between(0.5, 1) });
    }
    this.shake = 7;
    this.flash = 0.16;
    for (const w of this.workers) {
      if (Math.hypot(w.x - x, w.y - y) >= 300) continue;
      w.panic = this.between(1.4, 2.4);
      w.heading = Math.atan2(w.y - y, w.x - x);
    }
  }

  /** Blows up the crate at (x, y) on the belt if there is one, otherwise the floor there. */
  boomAt(x: number, y: number, t: number): void {
    const hit = this.crates.find((c) => !c.dead && Math.abs(c.x - x) < 40 && Math.abs(y - c.y) < 60);
    if (hit) hit.dead = t;
    this.boom(hit ? hit.x : x, hit ? hit.y : y, hit ? 70 : 10);
  }

  /** The pile crate drawn nearest a screen point, if it's within reach. Bounces it as feedback. */
  pickFromPile(p: Painter, sx: number, sy: number): AppCard | null {
    let best: PileCrate | null = null;
    let bestD = 60;
    for (const b of this.pile) {
      const [px, py] = p.p(b.x, b.y, b.z + CRATE);
      const d = Math.hypot(px - sx, py - sy);
      if (d < bestD) {
        bestD = d;
        best = b;
      }
    }
    if (!best) return null;
    best.vz = 260;
    best.settled = false;
    return best.app;
  }

  update(dt: number, t: number, cam: number, viewW: number): void {
    const { layout } = this;
    for (const c of this.crates) {
      const prev = c.x;
      c.x += BELT_SPEED * dt;
      c.y += (0 - c.y) * Math.min(1, dt * 4);
      if (c.dead && t - c.dead > 2.6) {
        c.dead = 0;
        c.pop = t;
      }
      const divert = layout.sides.find((s) => s.kind === 'out' && prev < s.x && c.x >= s.x);
      if (divert && !c.dead && this.rand() < 0.4) {
        this.sideCrates.push({ kind: 'out', x: divert.x, y: 0, app: lastStation(layout, c.x)?.app ?? null });
        this.recycle(c, t);
        continue;
      }
      if (c.x > layout.beltEnd && !c.dead) {
        this.pile.push({ x: layout.beltEnd, y: c.y, z: 40, vx: this.between(110, 220), vy: this.between(-90, 90), vz: this.between(80, 220), app: lastStation(layout, c.x)?.app ?? null, settled: false });
        this.recycle(c, t);
      }
    }
    layout.sides.forEach((s, i) => {
      if (s.kind !== 'in') return;
      this.feeders[i] -= dt;
      if (this.feeders[i] > 0) return;
      this.feeders[i] = this.between(2.4, 4);
      this.sideCrates.push({ kind: 'in', x: s.x, y: -440, app: null });
    });
    this.sideCrates = this.sideCrates.filter((c) => {
      c.y += SIDE_SPEED * dt;
      if (c.kind === 'in' && c.y >= -40) {
        this.crates.push({ x: c.x, y: -40, dead: 0, pop: 0 });
        return false;
      }
      return !(c.kind === 'out' && c.y >= 460);
    });
    // Feeders add crates faster than diverters take them, so trim the oldest to keep the belt from clogging.
    if (this.crates.length > 90) this.crates.splice(0, this.crates.length - 90);
    this.settlePile(dt);
    this.moveWorkers(dt, t);
    this.pressSparks(t);
    this.nextBoom -= dt;
    if (this.nextBoom <= 0) {
      this.nextBoom = this.between(3, 4.6);
      const onScreen = this.crates.filter((c) => !c.dead && c.x > cam && c.x < cam + viewW * 1.1);
      if (onScreen.length) {
        const c = this.pick(onScreen);
        c.dead = t;
        this.boom(c.x, c.y, 70);
      }
    }
    for (const p of this.puffs) {
      p.t += dt;
      p.r += p.vr * dt;
      p.z += p.vz * dt;
    }
    for (const s of this.sparks) {
      s.t += dt;
      s.vz -= 900 * dt;
      s.x += s.vx * dt;
      s.y += s.vy * dt;
      s.z = Math.max(0, s.z + s.vz * dt);
    }
    this.puffs = this.puffs.filter((p) => p.t < p.life);
    this.sparks = this.sparks.filter((s) => s.t < s.life);
    this.shake = Math.max(0, this.shake - dt * 45);
    this.flash = Math.max(0, this.flash - dt * 1.6);
    this.lastT = t;
  }

  /** Sends a crate back to the start of the belt, as if a fresh one came on. */
  private recycle(c: Crate, t: number): void {
    c.x = this.between(-160, -20);
    c.pop = t;
  }

  settlePile(dt: number): void {
    const { layout } = this;
    for (const b of this.pile) {
      if (b.settled) continue;
      b.vz -= 900 * dt;
      b.x = Math.min(layout.pit + PIT_R - 20, Math.max(layout.pit - PIT_R + 20, b.x + b.vx * dt));
      b.y = Math.min(PIT_R - 20, Math.max(-PIT_R + 20, b.y + b.vy * dt));
      b.z += b.vz * dt;
      const floor = mound(layout, b.x, b.y);
      if (b.z > floor) continue;
      b.z = floor;
      if (Math.abs(b.vz) > 160) {
        b.vz *= -0.3;
        b.vx *= 0.5;
        b.vy *= 0.5;
      } else {
        b.settled = true;
        this.puffs.push({ x: b.x, y: b.y, z: b.z, r: 6, vr: 40, vz: 20, t: 0, life: 0.5 });
      }
    }
    if (this.pile.length > PILE_MAX) this.pile.splice(0, this.pile.length - PILE_MAX);
  }

  private moveWorkers(dt: number, t: number): void {
    const { layout } = this;
    for (const w of this.workers) {
      w.panic = Math.max(0, w.panic - dt);
      let vx = 0;
      let vy = 0;
      if (w.panic) {
        vx = Math.cos(w.heading) * w.speed * 3;
        vy = Math.sin(w.heading) * w.speed * 3;
      } else if (w.role === 'cart') {
        if (this.rand() < dt * 0.15) w.dir *= -1;
        vx = w.dir * w.speed;
      } else if (w.role === 'foreman') {
        w.point = Math.max(0, w.point - dt);
        if (this.rand() < dt * 0.25) w.point = 1.2;
        if (Math.abs(w.x - w.home) > 90) w.heading = w.x > w.home ? Math.PI : 0;
        else if (this.rand() < dt * 0.5) w.heading = this.rand() < 0.5 ? 0 : Math.PI;
        if (Math.sin(t * 0.4 + w.phase) > 0.2) vx = Math.cos(w.heading) * w.speed * 0.6;
      } else if (w.role === 'fixer') {
        if (Math.abs(w.x - w.home) > 4) vx = (w.home - w.x) * 2;
      } else {
        if (this.rand() < dt * 0.4) w.heading += this.between(-1.2, 1.2);
        vx = Math.cos(w.heading) * w.speed;
        vy = Math.sin(w.heading) * w.speed;
      }
      w.x += vx * dt;
      w.y += vy * dt;
      w.moving = Math.hypot(vx, vy) > 2;
      if (w.moving) {
        w.phase += dt * Math.hypot(vx, vy) * 0.3;
        const screenDx = (vx - vy) * COS30;
        if (Math.abs(screenDx) > 1) w.face = Math.sign(screenDx);
      }
      this.keepOnFloor(w);
    }
  }

  /** Off the belt, inside the floor slab, out of the pit and clear of the side belts. */
  private keepOnFloor(w: Worker): void {
    const { layout } = this;
    if (Math.abs(w.y) < 85) {
      w.y = (Math.sign(w.y) || 1) * 85;
      w.heading = -w.heading;
    }
    if (Math.abs(w.y) > 450) {
      w.y = Math.sign(w.y) * 450;
      w.heading = -w.heading;
    }
    if (inPit(layout, w.x, w.y, 30)) {
      w.x = Math.min(w.x, layout.pit - PIT_R - 30);
      w.heading = Math.PI - w.heading;
      w.dir = -1;
    }
    for (const s of layout.sides) {
      const onBelt = s.kind === 'in' ? w.y < -40 : w.y > 40;
      if (Math.abs(w.x - s.x) >= 46 || !onBelt) continue;
      w.x = s.x + (Math.sign(w.x - s.x) || 1) * 46;
      w.heading = Math.PI - w.heading;
      w.dir *= -1;
    }
    if (w.x < 0) {
      w.x = 0;
      w.heading = 0;
      w.dir = 1;
    }
  }

  /** Sparks off each visible press as it lands. */
  private pressSparks(t: number): void {
    for (const s of this.layout.stations) {
      if (pressStroke(this.lastT, s.index) >= 1 || pressStroke(t, s.index) < 1) continue;
      for (let n = 0; n < 6; n++) {
        this.sparks.push({ x: s.press, y: 0, z: 70, vx: this.between(-120, 120), vy: this.between(-120, 120), vz: this.between(150, 320), t: 0, life: this.between(0.3, 0.6) });
      }
    }
  }

  /** Crates on the belts and the workers, as depth-sorted drawables. `intro` fades the crates in last. */
  drawables(p: Painter, t: number, rise: number, intro: number, shipFor: (app: AppCard | null) => Shipment | null, out: Drawable[]): void {
    const { layout } = this;
    const [x0, x1] = visibleRange(p.view, layout);
    const fade = smooth(0.75, 1, intro);
    for (const c of this.crates) {
      if (c.dead || c.x < x0 || c.x > Math.min(x1, layout.beltEnd)) continue;
      const s = CRATE * (c.pop ? Math.min(1, (t - c.pop) / 0.35) : 1) * fade;
      if (s < 2) continue;
      out.push({ depth: c.x + c.y, draw: () => drawPackage(p, c.x, c.y, 40, s, shipFor(lastStation(layout, c.x)?.app ?? null)) });
    }
    for (const c of this.sideCrates) {
      if (c.x < x0 || c.x > x1) continue;
      // Diverted crates drop into the bin over their last stretch.
      const z = c.kind === 'out' && c.y > 440 ? 30 - (c.y - 440) * 2 : 30;
      out.push({ depth: c.x + c.y + 5, draw: () => drawPackage(p, c.x, c.y, z, 32, shipFor(c.app)) });
    }
    for (const w of this.workers) {
      if (w.x < x0 || w.x > x1) continue;
      out.push({ depth: w.x + w.y, draw: () => this.drawWorker(p, w, t, rise) });
    }
  }

  drawPile(p: Painter, shipFor: (app: AppCard | null) => Shipment | null): void {
    [...this.pile]
      .sort((a, b) => a.x + a.y + a.z * 0.01 - (b.x + b.y + b.z * 0.01))
      .forEach((b) => drawPackage(p, b.x, b.y, b.z, CRATE, shipFor(b.app)));
  }

  drawEffects(p: Painter): void {
    const { ctx } = p;
    ctx.fillStyle = '#e8e8ee';
    for (const f of this.puffs) {
      const [sx, sy] = p.p(f.x, f.y, f.z);
      ctx.globalAlpha = 0.7 * (1 - f.t / f.life);
      ctx.beginPath();
      ctx.arc(sx, sy, f.r, 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.globalAlpha = 1;
    for (const s of this.sparks) {
      const [sx, sy] = p.p(s.x, s.y, s.z);
      ctx.fillStyle = `rgba(255,${200 + Math.round(40 * (1 - s.t / s.life))},120,${1 - s.t / s.life})`;
      ctx.fillRect(sx - 1.5, sy - 1.5, 3, 3);
    }
  }

  /** Hard hat, overalls with a reflective band, a prop for the role. No faces. */
  private drawWorker(p: Painter, w: Worker, t: number, rise: number): void {
    const { ctx } = p;
    const s = w.scale * rise;
    if (s < 0.05) return;
    const panic = w.panic > 0;
    const walking = w.moving || panic;
    const ph = w.phase * (panic ? 1.6 : 1);
    const stride = walking ? Math.sin(ph) : 0;
    if (w.role === 'cart') {
      const cx = w.x + w.dir * 26;
      p.box(cx - 12, w.y - 9, 3, 24, 18, 4, { top: '#5a6280', left: '#363c58', right: '#434a69' });
      p.box(cx - 9, w.y - 7, 7, 12, 12, 12, { top: '#e0bd92', left: '#9c7650', right: '#ba8f63' });
      p.box(cx + 1, w.y - 5, 7, 9, 9, 9, { top: '#e0bd92', left: '#9c7650', right: '#ba8f63' });
    }
    const [sx, sy] = p.p(w.x, w.y, 0);
    ctx.save();
    ctx.translate(sx, sy);
    ctx.scale(w.face * s, s);
    ctx.fillStyle = 'rgba(0,0,0,.3)';
    ctx.beginPath();
    ctx.ellipse(0, 0, 10, 4.5, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = '#232634';
    this.rounded(ctx, -5 + stride * 2.2, -13, 4.6, 13, 2);
    this.rounded(ctx, 0.6 - stride * 2.2, -13, 4.6, 13, 2);
    ctx.fillStyle = '#15171f';
    ctx.fillRect(-6 + stride * 2.2, -2.5, 6, 2.5);
    ctx.fillRect(-0.4 - stride * 2.2, -2.5, 6, 2.5);
    ctx.translate(0, walking ? -Math.abs(Math.sin(ph)) * (panic ? 3 : 1.6) : 0);
    const bw = 7 * w.width;
    ctx.fillStyle = w.suit;
    this.rounded(ctx, -bw, -29, bw * 2, 18, 5);
    ctx.fillStyle = 'rgba(0,0,0,.16)';
    this.rounded(ctx, 0, -29, bw, 18, [0, 5, 5, 0]);
    ctx.fillStyle = 'rgba(255,255,255,.6)';
    ctx.fillRect(-bw, -21, bw * 2, 2.2);
    ctx.strokeStyle = w.suit;
    ctx.lineWidth = 3.4;
    ctx.lineCap = 'round';
    const front: [number, number] = [bw - 1, -26];
    const back: [number, number] = [-bw + 1, -26];
    const arm = (o: [number, number], dx: number, dy: number) => {
      ctx.beginPath();
      ctx.moveTo(o[0], o[1]);
      ctx.lineTo(o[0] + dx, o[1] + dy);
      ctx.stroke();
    };
    if (panic) {
      arm(front, 3, -11 + Math.sin(ph * 2) * 2);
      arm(back, -3, -11 - Math.sin(ph * 2) * 2);
    } else if (w.role === 'carrier') {
      arm(front, 3, -9);
      arm(back, 2, -9);
      ctx.fillStyle = '#d9b48a';
      ctx.fillRect(-3, -46, 14, 10);
      ctx.fillStyle = '#9c7650';
      ctx.fillRect(-3, -38, 14, 2);
    } else if (w.role === 'cart') {
      arm(front, 9, 2);
      arm(back, 9, 3);
    } else if (w.role === 'foreman') {
      ctx.fillStyle = '#f4f2ea';
      ctx.fillRect(bw + 1, -26, 7, 9);
      ctx.fillStyle = '#3b3f52';
      ctx.fillRect(bw + 3, -27, 3, 2);
      arm(front, 3, 4);
      if (w.point > 0) arm(back, -12, -6);
      else arm(back, -1, 9);
    } else if (w.role === 'fixer') {
      const swing = Math.abs(Math.sin(t * 7 + w.phase));
      arm(back, -2, 9);
      const ang = -1.6 + swing * 1.5;
      const ex = front[0] + Math.cos(ang) * 8;
      const ey = front[1] + Math.sin(ang) * 8;
      arm(front, ex - front[0], ey - front[1]);
      ctx.strokeStyle = '#9aa3b8';
      ctx.lineWidth = 2.5;
      ctx.beginPath();
      ctx.moveTo(ex, ey);
      ctx.lineTo(ex + Math.cos(ang + 1.2) * 8, ey + Math.sin(ang + 1.2) * 8);
      ctx.stroke();
    } else {
      arm(front, 2 + stride * 4, 10);
      arm(back, -2 - stride * 4, 10);
    }
    ctx.fillStyle = w.skin;
    ctx.beginPath();
    ctx.arc(0, -33.5, 5.2, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = w.hat;
    ctx.beginPath();
    ctx.ellipse(0, -35.5, 6.4, 5.4, 0, Math.PI, 0);
    ctx.fill();
    ctx.beginPath();
    ctx.ellipse(1.2, -35.4, 8.6, 1.8, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = 'rgba(255,255,255,.45)';
    ctx.fillRect(-1, -40.5, 2, 4.5);
    ctx.restore();
  }

  private rounded(ctx: CanvasRenderingContext2D, x: number, y: number, w: number, h: number, r: number | number[]): void {
    ctx.beginPath();
    ctx.roundRect(x, y, w, h, r);
    ctx.fill();
  }
}
