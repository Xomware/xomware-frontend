import { COS30, Faces, Painter, View } from './iso';
import { LineLayout, PIT_R, inPit } from './layout';

export interface Drawable {
  /** x + y of the thing's front-most point; drawn in ascending order so nearer things cover farther ones. */
  depth: number;
  draw: () => void;
}

const BG = '#10131c';
const TILE = 80;
const FLOOR_Y = 480;
const PIT_DEPTH = -170;
const BELT: Faces = { top: '#2b3044', left: '#1b1f2e', right: '#232838' };
const PRESS: Faces = { top: '#4a5170', left: '#2f3550', right: '#3a4160' };
const ARM: Faces = { top: '#565e80', left: '#353b58', right: '#424a6c' };
const POST: Faces = { top: '#5a6280', left: '#363c58', right: '#434a69' };
const BEAM: Faces = { top: '#646d8e', left: '#3a405c', right: '#4a5272' };
const BIN: Faces = { top: '#14172a', left: '#3a4160', right: '#4a5272' };

/** World x range worth drawing for this view: a margin either side of what's on screen, never past the pit. */
export function visibleRange(v: View, layout: LineLayout): [number, number] {
  return [v.cam - 900, Math.min(v.cam + v.w / COS30 + 600, layout.pit + PIT_R + 900)];
}

/** The press's stroke: 0 up, 1 down on the crate. Shared so sparks fire on the downstroke. */
export function pressStroke(t: number, index: number): number {
  const ph = ((t + index * 0.41) % 1.9) / 1.9;
  if (ph < 0.1) return (ph / 0.1) ** 2;
  if (ph < 0.2) return 1;
  if (ph < 0.7) return 1 - (ph - 0.2) / 0.5;
  return 0;
}

/**
 * Floor tiles, the slab edge and the station pads. `intro` runs 0..1: tiles ripple out from the middle of the
 * view and the pads fade in with the machines.
 */
export function drawFloor(p: Painter, layout: LineLayout, intro: number, rise: number): void {
  const { ctx, view } = p;
  ctx.fillStyle = BG;
  ctx.fillRect(-40, -40, view.w + 80, view.h + 80);
  const [x0, x1] = visibleRange(view, layout);
  const centre = view.cam + view.w * 0.4;
  for (let x = Math.floor(x0 / TILE) * TILE; x < x1; x += TILE) {
    for (let y = -FLOOR_Y; y < FLOOR_Y; y += TILE) {
      if (inPit(layout, x + TILE / 2, y + TILE / 2, -TILE / 2 + 1)) continue;
      const grow = intro >= 1 ? 1 : smooth(0, 1, intro * 2.2 - Math.hypot(x - centre, y) / 1400);
      if (grow <= 0) continue;
      const inset = ((1 - grow) * TILE) / 2;
      const [sx, sy] = p.p(x + inset, y + inset, 0);
      if (sx < -260 || sx > view.w + 260 || sy < -260 || sy > view.h + 260) continue;
      const fill = (x / TILE + y / TILE) % 2 === 0 ? '#1d2131' : '#1a1e2d';
      p.poly([p.p(x + inset, y + inset, 0), p.p(x + TILE - inset, y + inset, 0), p.p(x + TILE - inset, y + TILE - inset, 0), p.p(x + inset, y + TILE - inset, 0)], fill);
    }
  }
  p.poly([p.p(x0, FLOOR_Y, 0), p.p(x1, FLOOR_Y, 0), p.p(x1, FLOOR_Y, -40), p.p(x0, FLOOR_Y, -40)], '#0c0e15');
  ctx.globalAlpha = 0.5 * rise;
  for (const s of layout.stations) {
    if (s.x < x0 || s.x > x1) continue;
    p.poly([p.p(s.x - 120, 120, 0), p.p(s.x + 120, 120, 0), p.p(s.x + 120, 200, 0), p.p(s.x - 120, 200, 0)], s.app.color);
  }
  ctx.globalAlpha = 1;
}

/** The pit's floor and the two walls you can see into. The pile goes on top, then drawPitRim. */
export function drawPitShell(p: Painter, layout: LineLayout): void {
  const l0 = layout.pit - PIT_R;
  const l1 = layout.pit + PIT_R;
  p.poly([p.p(l0, -PIT_R, PIT_DEPTH), p.p(l1, -PIT_R, PIT_DEPTH), p.p(l1, PIT_R, PIT_DEPTH), p.p(l0, PIT_R, PIT_DEPTH)], '#0b0d14');
  p.poly([p.p(l0, -PIT_R, 0), p.p(l1, -PIT_R, 0), p.p(l1, -PIT_R, PIT_DEPTH), p.p(l0, -PIT_R, PIT_DEPTH)], '#171a28');
  p.poly([p.p(l0, -PIT_R, 0), p.p(l0, PIT_R, 0), p.p(l0, PIT_R, PIT_DEPTH), p.p(l0, -PIT_R, PIT_DEPTH)], '#131622');
}

/** Clips to what shows above the pit's front rim, so crates deep in the pile are hidden by the floor. Caller restores. */
export function clipToPit(p: Painter, layout: LineLayout): void {
  const l0 = layout.pit - PIT_R;
  const l1 = layout.pit + PIT_R;
  const [lx, ly] = p.p(l0, PIT_R, 0);
  const [rx, ry] = p.p(l1, -PIT_R, 0);
  const [fx, fy] = p.p(l1, PIT_R, 0);
  const { ctx } = p;
  ctx.save();
  ctx.beginPath();
  ctx.moveTo(lx, ly - 600);
  ctx.lineTo(rx, ry - 600);
  ctx.lineTo(rx, ry);
  ctx.lineTo(fx, fy);
  ctx.lineTo(lx, ly);
  ctx.closePath();
  ctx.clip();
}

export function drawPitRim(p: Painter, layout: LineLayout): void {
  const l0 = layout.pit - PIT_R;
  const l1 = layout.pit + PIT_R;
  const stripe = (ax: number, ay: number, bx: number, by: number) => {
    for (let i = 0; i < 14; i++) {
      const u0 = i / 14;
      const u1 = (i + 1) / 14;
      const x0 = ax + (bx - ax) * u0;
      const y0 = ay + (by - ay) * u0;
      const x1 = ax + (bx - ax) * u1;
      const y1 = ay + (by - ay) * u1;
      p.poly([p.p(x0, y0, 0), p.p(x1, y1, 0), p.p(x1, y1, 4), p.p(x0, y0, 4)], i % 2 ? '#1b1d24' : '#f2c230');
    }
  };
  stripe(l0, PIT_R, l1, PIT_R);
  stripe(l1, -PIT_R, l1, PIT_R);
}

/**
 * The machinery, as depth-sorted drawables: the main belt up to the pit, side belts and their bins, presses and
 * gantry cranes. `rise` grows the machines out of the floor during the intro; `beltOn` spins the belts up.
 * `iconFor` resolves an app icon for the crate hanging from each crane.
 */
export function machineDrawables(
  p: Painter,
  layout: LineLayout,
  t: number,
  rise: number,
  beltOn: number,
  iconFor: (i: number) => HTMLImageElement | undefined,
  out: Drawable[],
): void {
  const { ctx } = p;
  const [x0, x1] = visibleRange(p.view, layout);
  const beltLines = (fromX: number, toX: number, fromY: number, toY: number, z: number, along: 'x' | 'y', speed: number) => {
    ctx.strokeStyle = '#1d2131';
    ctx.lineWidth = 2;
    ctx.beginPath();
    const off = (t * speed * beltOn) % 40;
    if (along === 'x') {
      for (let x = Math.floor(fromX / 40) * 40 + off; x < toX; x += 40) {
        const [ax, ay] = p.p(x, fromY, z);
        const [bx, by] = p.p(x, toY, z);
        ctx.moveTo(ax, ay);
        ctx.lineTo(bx, by);
      }
    } else {
      for (let y = fromY + off; y < toY; y += 40) {
        const [ax, ay] = p.p(fromX, y, z);
        const [bx, by] = p.p(toX, y, z);
        ctx.moveTo(ax, ay);
        ctx.lineTo(bx, by);
      }
    }
    ctx.stroke();
  };

  out.push({
    depth: -Infinity,
    draw: () => {
      const end = Math.min(x1, layout.beltEnd);
      p.box(x0, -40, 0, end - x0, 80, 40 * rise, BELT);
      beltLines(x0, end, -40, 40, 40 * rise, 'x', 55);
    },
  });

  for (const s of layout.sides) {
    if (s.x < x0 || s.x > x1) continue;
    const back = s.kind === 'in';
    const y0 = back ? -460 : 40;
    out.push({
      depth: back ? s.x - 500 : s.x + 40,
      draw: () => {
        p.box(s.x - 30, y0, 0, 60, 420, 30 * rise, BELT);
        beltLines(s.x - 30, s.x + 30, y0, y0 + 420, 30 * rise, 'y', 50);
      },
    });
    if (!back) out.push({ depth: s.x + 520, draw: () => p.box(s.x - 55, 465, 0, 110, 90, 46 * rise, BIN) });
  }

  for (const st of layout.stations) {
    if (st.press > x0 - 200 && st.press < x1) {
      out.push({
        depth: st.press - 120,
        draw: () => {
          const down = pressStroke(t, st.index);
          p.box(st.press - 40, -150, 0, 80, 70, 190 * rise, PRESS);
          p.box(st.press - 30, -80, 160 * rise, 60, 110, 26 * rise, ARM);
          p.box(st.press - 22, -22, (150 - down * 70) * rise, 44, 44, 12, { top: st.app.color, left: '#262a3d', right: '#30354c' });
          ctx.globalAlpha = rise;
          p.poly([p.p(st.press - 41, -151, 190 * rise), p.p(st.press + 41, -151, 190 * rise), p.p(st.press + 41, -147, 190 * rise), p.p(st.press - 41, -147, 190 * rise)], st.app.color);
          ctx.globalAlpha = 1;
        },
      });
    }
    const crane = st.crane;
    if (crane === null || crane < x0 || crane > x1) continue;
    out.push({
      depth: crane - 200,
      draw: () => {
        for (const y of [-200, 200]) p.box(crane - 10, y - 10, 0, 20, 20, 260 * rise, POST);
        p.box(crane - 14, -210, 260 * rise, 28, 420, 18, BEAM);
        const hookY = Math.sin(t * 0.6 + st.index) * 150;
        const hookZ = 150 + Math.sin(t * 0.9 + st.index) * 50;
        const [tx, ty] = p.p(crane, hookY, 260 * rise);
        const [bx, by] = p.p(crane, hookY, hookZ * rise);
        ctx.strokeStyle = '#8b93b4';
        ctx.lineWidth = 1.5;
        ctx.beginPath();
        ctx.moveTo(tx, ty);
        ctx.lineTo(bx, by);
        ctx.stroke();
        p.crate(crane, hookY, (hookZ - 36) * rise, 36, iconFor(st.index));
      },
    });
  }
}

/** A darkened edge so the eye settles in the middle of the floor. */
export function vignette(ctx: CanvasRenderingContext2D, v: View): void {
  const g = ctx.createRadialGradient(v.w / 2, v.h * 0.5, v.h * 0.3, v.w / 2, v.h * 0.5, Math.max(v.w, v.h) * 0.8);
  g.addColorStop(0, 'rgba(0,0,0,0)');
  g.addColorStop(1, 'rgba(0,0,0,.5)');
  ctx.fillStyle = g;
  ctx.fillRect(-40, -40, v.w + 80, v.h + 80);
}

export function smooth(a: number, b: number, x: number): number {
  const t = Math.min(1, Math.max(0, (x - a) / (b - a)));
  return t * t * (3 - 2 * t);
}
