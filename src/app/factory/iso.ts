/** Isometric projection for the factory landing: x runs along the production line, y across it, z up. */
export const COS30 = Math.cos(Math.PI / 6);
export const SIN30 = 0.5;

export type Pt = [number, number];

export interface View {
  w: number;
  h: number;
  /** Camera position along the line, in world units. */
  cam: number;
}

export interface Faces {
  top: string;
  left: string;
  right: string;
}

/** The screen point the camera's position on the line projects to. */
export const anchor = (v: View): Pt => [v.w * 0.3, v.h * 0.52];

export function project(v: View, x: number, y: number, z: number): Pt {
  const [ax, ay] = anchor(v);
  return [ax + (x - y - v.cam) * COS30, ay + (x + y - v.cam) * SIN30 - z];
}

/** Inverse of project() on the floor plane, z = 0. */
export function unproject(v: View, sx: number, sy: number): Pt {
  const [ax, ay] = anchor(v);
  const diff = (sx - ax) / COS30 + v.cam;
  const sum = (sy - ay) / SIN30 + v.cam;
  return [(diff + sum) / 2, (sum - diff) / 2];
}

export const CARDBOARD: Faces = { top: '#e0bd92', left: '#9c7650', right: '#ba8f63' };

export class Painter {
  constructor(
    readonly ctx: CanvasRenderingContext2D,
    public view: View,
  ) {}

  p(x: number, y: number, z: number): Pt {
    return project(this.view, x, y, z);
  }

  poly(pts: Pt[], fill: string): void {
    const { ctx } = this;
    ctx.fillStyle = fill;
    ctx.beginPath();
    pts.forEach(([x, y], i) => (i ? ctx.lineTo(x, y) : ctx.moveTo(x, y)));
    ctx.closePath();
    ctx.fill();
  }

  /** A box seen from the front: the +y face on the left, the +x face on the right, then the top. */
  box(x: number, y: number, z: number, dx: number, dy: number, dz: number, f: Faces): void {
    const P = (a: number, b: number, c: number) => this.p(a, b, c);
    this.poly([P(x, y + dy, z), P(x + dx, y + dy, z), P(x + dx, y + dy, z + dz), P(x, y + dy, z + dz)], f.left);
    this.poly([P(x + dx, y, z), P(x + dx, y + dy, z), P(x + dx, y + dy, z + dz), P(x + dx, y, z + dz)], f.right);
    this.poly([P(x, y, z + dz), P(x + dx, y, z + dz), P(x + dx, y + dy, z + dz), P(x, y + dy, z + dz)], f.top);
  }

  /** Draws an image onto a horizontal face by mapping its square onto the projected parallelogram. */
  topImage(img: HTMLImageElement, x: number, y: number, z: number, dx: number, dy: number): void {
    const [x0, y0] = this.p(x, y, z);
    const [x1, y1] = this.p(x + dx, y, z);
    const [x3, y3] = this.p(x, y + dy, z);
    const { ctx } = this;
    ctx.save();
    ctx.transform((x1 - x0) / img.naturalWidth, (y1 - y0) / img.naturalWidth, (x3 - x0) / img.naturalHeight, (y3 - y0) / img.naturalHeight, x0, y0);
    ctx.drawImage(img, 0, 0);
    ctx.restore();
  }
}
