import { CARDBOARD, Faces, Painter, Pt } from './iso';

export type PackKind = 'gift' | 'barrel' | 'case' | 'crate' | 'tote' | 'box' | 'pallet';

/** Station i ships in PACKS[i % 7], so no two neighbouring apps share packaging. */
export const PACKS: readonly PackKind[] = ['gift', 'barrel', 'case', 'crate', 'tote', 'box', 'pallet'];

/** What a crate carries once a press has stamped it. */
export interface Shipment {
  kind: PackKind;
  color: string;
  icon?: HTMLImageElement;
}

const HEIGHT: Record<PackKind | 'blank', number> = { blank: 0.9, box: 0.9, crate: 0.85, barrel: 1.05, gift: 0.8, case: 0.72, tote: 0.66, pallet: 1 };
const WOOD: Faces = { top: '#c99a62', left: '#7d5530', right: '#a0703f' };
const CASE: Faces = { top: '#5b6480', left: '#2c3244', right: '#3d4459' };
const CAP: Faces = { top: '#c9cfdc', left: '#7f8697', right: '#a2a9b9' };
const WRAP: Faces = { top: '#ffffff', left: '#dfe6f2', right: '#eef2f8' };
const RIBBON = '#ffd36b';
const RIBBON_SHADE = '#e3b347';

/** Height of a package `s` across; no kind means a blank, unstamped box. */
export const packHeight = (s: number, kind?: PackKind): number => s * HEIGHT[kind ?? 'blank'];

/** Lightens (f > 0) or darkens (f < 0) a #rrggbb colour. */
export function shade(color: string, f: number): string {
  const [r, g, b] = [1, 3, 5].map((i) => {
    const v = parseInt(color.slice(i, i + 2), 16);
    return Math.round(f < 0 ? v * (1 + f) : v + (255 - v) * f);
  });
  return `rgb(${r},${g},${b})`;
}

/** Lit from the right like the rest of the floor; `base` darkens all three faces together. */
const facesOf = (color: string, base = 0): Faces => ({ top: shade(color, base + 0.12), left: shade(color, base - 0.45), right: shade(color, base - 0.22) });

/** A package centred on (x, y), resting at height z, `s` across. No shipment draws a blank cardboard box. */
export function drawPackage(p: Painter, x: number, y: number, z: number, s: number, ship?: Shipment | null): void {
  const { ctx } = p;
  const h = packHeight(s, ship?.kind);
  const r = s / 2;
  const P = (a: number, b: number, c: number): Pt => p.p(a, b, c);
  // Flat patches painted on a face: onL on a +y face, onR on a +x face, onT on a top.
  const onL = (x0: number, x1: number, fy: number, z0: number, z1: number, fill: string) => p.poly([P(x0, fy, z0), P(x1, fy, z0), P(x1, fy, z1), P(x0, fy, z1)], fill);
  const onR = (fx: number, y0: number, y1: number, z0: number, z1: number, fill: string) => p.poly([P(fx, y0, z0), P(fx, y1, z0), P(fx, y1, z1), P(fx, y0, z1)], fill);
  const onT = (x0: number, y0: number, x1: number, y1: number, fz: number, fill: string) => p.poly([P(x0, y0, fz), P(x1, y0, fz), P(x1, y1, fz), P(x0, y1, fz)], fill);
  const decal = (fz: number, size: number) => {
    const icon = ship?.icon;
    if (icon?.complete && icon.naturalWidth) p.topImage(icon, x - size / 2, y - size / 2, fz + 0.6, size, size);
  };

  if (!ship || ship.kind === 'box') {
    p.box(x - r, y - r, z, s, s, h, CARDBOARD);
    onR(x + r, y - s * 0.09, y + s * 0.09, z + h * 0.55, z + h, '#c79f71');
    if (!ship) {
      onT(x - r, y - s * 0.09, x + r, y + s * 0.09, z + h + 0.3, '#cfa877');
      return;
    }
    onL(x - s * 0.36, x + s * 0.22, y + r, z + h * 0.2, z + h * 0.44, ship.color);
    decal(z + h, s * 0.74);
    return;
  }

  const { color } = ship;
  switch (ship.kind) {
    case 'crate': {
      const w = s * 1.1;
      const post = s * 0.12;
      p.box(x - w / 2, y - r, z, w, s, h, WOOD);
      ctx.strokeStyle = 'rgba(60,35,15,.75)';
      ctx.lineWidth = 1;
      ctx.beginPath();
      for (const f of [1 / 3, 2 / 3]) {
        segment(ctx, P(x - w / 2, y + r, z + h * f), P(x + w / 2, y + r, z + h * f));
        segment(ctx, P(x + w / 2, y - r, z + h * f), P(x + w / 2, y + r, z + h * f));
      }
      ctx.stroke();
      onL(x - w / 2, x - w / 2 + post, y + r, z, z + h, '#6a4626');
      onL(x + w / 2 - post, x + w / 2, y + r, z, z + h, '#6a4626');
      onR(x + w / 2, y - r, y - r + post, z, z + h, '#7f5631');
      onR(x + w / 2, y + r - post, y + r, z, z + h, '#7f5631');
      onR(x + w / 2, y - r * 0.55, y + r * 0.55, z + h * 0.4, z + h * 0.6, color);
      decal(z + h, s * 0.7);
      return;
    }
    case 'barrel':
      drum(p, x, y, z, s * 0.46, h, color, ship.icon);
      return;
    case 'gift': {
      p.box(x - r, y - r, z, s, s, h, facesOf(color));
      onL(x - s * 0.07, x + s * 0.07, y + r, z, z + h, RIBBON);
      onR(x + r, y - s * 0.07, y + s * 0.07, z, z + h, RIBBON_SHADE);
      decal(z + h, s * 0.64);
      // A bow on the back corner of the lid, clear of the icon.
      const [bx, by] = P(x - r * 0.62, y - r * 0.62, z + h + 1);
      const q = s * 0.14;
      ctx.fillStyle = RIBBON;
      ctx.beginPath();
      ctx.ellipse(bx - q * 0.8, by - q * 0.5, q, q * 0.6, -0.5, 0, Math.PI * 2);
      ctx.ellipse(bx + q * 0.8, by - q * 0.5, q, q * 0.6, 0.5, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = RIBBON_SHADE;
      ctx.beginPath();
      ctx.arc(bx, by - q * 0.4, q * 0.35, 0, Math.PI * 2);
      ctx.fill();
      return;
    }
    case 'case': {
      const w = s * 1.25;
      const d = s * 0.82;
      const cap = s * 0.14;
      p.box(x - w / 2, y - d / 2, z, w, d, h, CASE);
      onL(x - w / 2, x + w / 2, y + d / 2, z + h * 0.4, z + h * 0.58, color);
      onR(x + w / 2, y - d / 2, y + d / 2, z + h * 0.4, z + h * 0.58, shade(color, -0.25));
      for (const [cx, cy] of [[x - w / 2, y - d / 2], [x + w / 2 - cap, y - d / 2], [x - w / 2, y + d / 2 - cap], [x + w / 2 - cap, y + d / 2 - cap]]) {
        p.box(cx, cy, z + h - 3, cap, cap, 4, CAP);
      }
      onT(x - s * 0.26, y - s * 0.26, x + s * 0.26, y + s * 0.26, z + h + 0.3, '#f1f2f6');
      decal(z + h + 0.2, s * 0.46);
      return;
    }
    case 'tote': {
      const w = s * 1.12;
      const d = s * 0.9;
      p.box(x - w / 2, y - d / 2, z, w, d, h - 5, facesOf(color));
      p.box(x - w / 2 - 3, y - d / 2 - 3, z + h - 5, w + 6, d + 6, 5, facesOf(color, -0.32));
      onL(x - s * 0.18, x + s * 0.18, y + d / 2, z + h * 0.5, z + h * 0.68, 'rgba(0,0,0,.45)');
      decal(z + h, s * 0.62);
      return;
    }
    case 'pallet': {
      const w = s * 1.2;
      const q = w / 2;
      const deck = s * 0.16;
      const layer = (h - deck) / 2;
      p.box(x - q, y - q, z, w, w, deck, WOOD);
      for (const [a, b] of [[-0.3, -0.1], [0.1, 0.3]]) {
        onL(x + w * a, x + w * b, y + q, z + 1, z + deck - 1.5, '#2a1c10');
        onR(x + q, y + w * a, y + w * b, z + 1, z + deck - 1.5, '#2a1c10');
      }
      for (let lz = 0; lz < 2; lz++) {
        for (const [ix, iy] of [[0, 0], [1, 0], [0, 1], [1, 1]]) p.box(x - q + ix * q + 1, y - q + iy * q + 1, z + deck + lz * layer, q - 2, q - 2, layer - 1, CARDBOARD);
      }
      ctx.globalAlpha = 0.2;
      p.box(x - q - 1, y - q - 1, z + deck, w + 2, w + 2, h - deck, WRAP);
      ctx.globalAlpha = 1;
      onL(x - s * 0.07, x + s * 0.07, y + q + 1, z + deck, z + h, color);
      onR(x + q + 1, y - s * 0.07, y + s * 0.07, z + deck, z + h, shade(color, -0.2));
      decal(z + h + 0.5, s * 0.66);
      return;
    }
  }
}

function segment(ctx: CanvasRenderingContext2D, [ax, ay]: Pt, [bx, by]: Pt): void {
  ctx.moveTo(ax, ay);
  ctx.lineTo(bx, by);
}

/**
 * An upright drum of radius r. A circle on the floor plane projects to an axis-aligned ellipse √2·cos30·r wide and
 * √2·sin30·r tall, which is what lets the sides and hoops be drawn as plain canvas ellipses.
 */
function drum(p: Painter, x: number, y: number, z: number, r: number, h: number, color: string, icon?: HTMLImageElement): void {
  const { ctx } = p;
  const [tx, ty] = p.p(x, y, z + h);
  const [bx, by] = p.p(x, y, z);
  const rx = r * 1.2247;
  const ry = r * 0.7071;
  const side = ctx.createLinearGradient(tx - rx, 0, tx + rx, 0);
  side.addColorStop(0, shade(color, -0.55));
  side.addColorStop(0.62, shade(color, -0.18));
  side.addColorStop(1, shade(color, -0.34));
  ctx.fillStyle = side;
  ctx.beginPath();
  ctx.moveTo(tx - rx, ty);
  ctx.lineTo(bx - rx, by);
  ctx.ellipse(bx, by, rx, ry, 0, Math.PI, 0, true);
  ctx.lineTo(tx + rx, ty);
  ctx.closePath();
  ctx.fill();
  ctx.strokeStyle = shade(color, -0.65);
  ctx.lineWidth = 2;
  for (const f of [0.2, 0.8]) {
    const [hx, hy] = p.p(x, y, z + h * f);
    ctx.beginPath();
    ctx.ellipse(hx, hy, rx, ry, 0, 0, Math.PI);
    ctx.stroke();
  }
  ctx.fillStyle = shade(color, -0.1);
  ctx.beginPath();
  ctx.ellipse(tx, ty, rx, ry, 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.strokeStyle = shade(color, -0.4);
  ctx.lineWidth = 1.5;
  ctx.beginPath();
  ctx.ellipse(tx, ty, rx * 0.9, ry * 0.9, 0, 0, Math.PI * 2);
  ctx.stroke();
  if (!icon?.complete || !icon.naturalWidth) return;
  ctx.save();
  ctx.beginPath();
  ctx.ellipse(tx, ty, rx * 0.78, ry * 0.78, 0, 0, Math.PI * 2);
  ctx.clip();
  p.topImage(icon, x - r * 0.8, y - r * 0.8, z + h + 0.5, r * 1.6, r * 1.6);
  ctx.restore();
}
