import { Faces, Painter } from './iso';
import { Speaker } from './layout';

/** Xomify doesn't report tempo, so the speakers pump at a fixed, plausible one. */
const BPM = 112;
const TOWER: Faces = { top: '#2d3142', left: '#151720', right: '#1d2030' };
const RING_LIFE = 1.1;

/** 1 on each beat, decaying towards 0 before the next. */
export const beat = (t: number): number => Math.exp(-(((t * BPM) / 60) % 1) * 6);
export const beatCount = (t: number): number => Math.floor((t * BPM) / 60);

/** A PA tower with a woofer and tweeter on both faces you can see. `pulse` (0..1) pushes the cones out. */
export function drawSpeaker(p: Painter, s: Speaker, rise: number, pulse: number): void {
  const { ctx } = p;
  const h = s.h * rise;
  p.box(s.x - 24, s.y - 24, s.z, 48, 48, h, TOWER);
  if (rise < 0.95) return;
  const grow = 1 + 0.12 * pulse;
  for (const [zc, r] of [[s.z + h * 0.32, 15], [s.z + h * 0.76, 8]]) {
    cone(p, (u, v) => p.p(s.x + u, s.y + 24.5, zc + v), r * grow);
    cone(p, (u, v) => p.p(s.x + 24.5, s.y + u, zc + v), r * grow);
  }
  const [lx, ly] = p.p(s.x, s.y, s.z + h + 0.5);
  ctx.fillStyle = `rgba(155,140,255,${0.15 + 0.85 * pulse})`;
  ctx.beginPath();
  ctx.ellipse(lx, ly, 8, 4.5, 0, 0, Math.PI * 2);
  ctx.fill();
}

/** Concentric discs on a speaker face; `at` maps a point on the face to the screen. */
function cone(p: Painter, at: (u: number, v: number) => [number, number], r: number): void {
  const { ctx } = p;
  for (const [k, fill] of [[1.18, '#0a0b10'], [1, '#3b4058'], [0.6, '#262a3e'], [0.24, '#6b7290']] as const) {
    ctx.fillStyle = fill;
    ctx.beginPath();
    for (let i = 0; i <= 28; i++) {
      const a = (i / 28) * Math.PI * 2;
      const [x, y] = at(Math.cos(a) * r * k, Math.sin(a) * r * k);
      if (i === 0) ctx.moveTo(x, y);
      else ctx.lineTo(x, y);
    }
    ctx.fill();
  }
}

interface Ring {
  x: number;
  y: number;
  z: number;
  born: number;
  island: boolean;
}

interface Note {
  x: number;
  y: number;
  z: number;
  born: number;
  life: number;
  drift: number;
  glyph: string;
}

/** While a track plays: a ring off every speaker in view on each beat, and notes floating up out of them. */
export class Sound {
  private rings: Ring[] = [];
  private notes: Note[] = [];
  private lastBeat = 0;
  private nextNote = 0;

  update(dt: number, t: number, playing: boolean, heard: Speaker[]): void {
    this.rings = this.rings.filter((r) => t - r.born < RING_LIFE);
    this.notes = this.notes.filter((n) => t - n.born < n.life);
    if (!playing || !heard.length) return;
    const b = beatCount(t);
    if (b !== this.lastBeat) {
      this.lastBeat = b;
      for (const s of heard) this.rings.push({ x: s.x, y: s.y, z: s.z + 1, born: t, island: s.island });
    }
    this.nextNote -= dt;
    if (this.nextNote > 0) return;
    this.nextNote = 0.25 + Math.random() * 0.25;
    const s = heard[Math.floor(Math.random() * heard.length)];
    this.notes.push({ x: s.x, y: s.y, z: s.z + s.h + 10, born: t, life: 1.8 + Math.random() * 0.8, drift: Math.random() * 80 - 40, glyph: Math.random() < 0.65 ? '♪' : '♫' });
  }

  /** Floor rings go under everything; the island's go on top of it, inside the carousel. */
  drawRings(p: Painter, t: number, island: boolean): void {
    const { ctx } = p;
    ctx.lineWidth = 2;
    for (const r of this.rings) {
      if (r.island !== island) continue;
      const age = (t - r.born) / RING_LIFE;
      const radius = 30 + age * (island ? 110 : 165);
      const [cx, cy] = p.p(r.x, r.y, r.z);
      ctx.strokeStyle = `rgba(155,140,255,${0.4 * (1 - age)})`;
      ctx.beginPath();
      // A floor circle projects to an axis-aligned ellipse √2·cos30 wide and √2·sin30 tall.
      ctx.ellipse(cx, cy, radius * 1.2247, radius * 0.7071, 0, 0, Math.PI * 2);
      ctx.stroke();
    }
  }

  drawNotes(p: Painter, t: number): void {
    const { ctx } = p;
    ctx.font = '700 20px system-ui, sans-serif';
    ctx.textAlign = 'center';
    for (const n of this.notes) {
      const age = t - n.born;
      const [x, y] = p.p(n.x + (n.drift * age) / n.life, n.y, n.z + age * 55);
      ctx.fillStyle = `rgba(190,180,255,${Math.min(1, age * 3) * (1 - age / n.life)})`;
      ctx.fillText(n.glyph, x, y);
    }
    ctx.textAlign = 'start';
  }
}
