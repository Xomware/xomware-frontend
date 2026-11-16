import { AppCard } from '../data/apps.data';
import { Actors } from './actors';
import { COS30, Painter, SIN30, View, anchor, unproject } from './iso';
import { LineLayout, inPit } from './layout';
import { Drawable, clipToPit, drawFloor, drawPitRim, drawPitShell, machineDrawables, smooth, vignette } from './scene';

export interface FactoryOptions {
  reducedMotion: boolean;
  /** Called with the app whose crate was clicked in the pit. */
  onPitPick?: (app: AppCard) => void;
  /** Called after every frame with the world origin's screen position and the camera, to move DOM in step. */
  onFrame?: (origin: { x: number; y: number }, cam: number) => void;
}

/**
 * Owns the factory canvas: sizing, the animation loop, the eased camera and clicks. The landing component tells it
 * where the camera should be and reads back where the world origin sits on screen to move its DOM layer in step.
 */
export class Factory {
  private readonly ctx: CanvasRenderingContext2D;
  private readonly painter: Painter;
  private readonly actors: Actors;
  private readonly icons = new Map<string, HTMLImageElement>();
  private readonly view: View = { w: 0, h: 0, cam: 0 };
  private target = 0;
  private raf = 0;
  private last = 0;
  private running = false;

  constructor(
    private readonly canvas: HTMLCanvasElement,
    private readonly layout: LineLayout,
    private readonly opts: FactoryOptions,
  ) {
    const ctx = canvas.getContext('2d');
    if (!ctx) throw new Error('2D canvas unavailable');
    this.ctx = ctx;
    this.painter = new Painter(ctx, this.view);
    this.actors = new Actors(layout);
    for (const s of layout.stations) {
      const src = s.app.icon;
      if (!src || this.icons.has(src)) continue;
      const img = new Image();
      img.src = src;
      this.icons.set(src, img);
    }
    canvas.addEventListener('pointerdown', this.onPointer);
  }

  /** Matches the canvas to its CSS size at the device pixel ratio. */
  resize(w: number, h: number): void {
    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    this.view.w = w;
    this.view.h = h;
    this.canvas.width = Math.round(w * dpr);
    this.canvas.height = Math.round(h * dpr);
    this.ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    if (!this.running) this.render(0, 0);
  }

  /** Where the camera should head, in world units along the line. */
  setCamera(cam: number): void {
    this.target = cam;
  }

  /** Screen position of the world origin, for translating DOM that is laid out in world coordinates. */
  origin(): { x: number; y: number } {
    const [ax, ay] = anchor(this.view);
    return { x: ax - this.view.cam * COS30, y: ay - this.view.cam * SIN30 };
  }

  /** Runs the loop while the factory is on screen; pausing it keeps a scrolled-away tab idle. */
  setRunning(on: boolean): void {
    if (on === this.running) return;
    this.running = on;
    if (on) {
      this.last = performance.now();
      this.raf = requestAnimationFrame(this.frame);
    } else {
      cancelAnimationFrame(this.raf);
    }
  }

  destroy(): void {
    this.setRunning(false);
    this.canvas.removeEventListener('pointerdown', this.onPointer);
  }

  private readonly frame = (now: number): void => {
    const dt = Math.min(0.05, (now - this.last) / 1000);
    this.last = now;
    const t = this.opts.reducedMotion ? 0 : now / 1000;
    this.view.cam = this.opts.reducedMotion ? this.target : this.view.cam + (this.target - this.view.cam) * 0.14;
    if (!this.opts.reducedMotion) this.actors.update(dt, t, this.view.cam, this.view.w);
    this.render(t, 1);
    this.opts.onFrame?.(this.origin(), this.view.cam);
    this.raf = requestAnimationFrame(this.frame);
  };

  /** `intro` runs 0..1 while the intro plays and stays at 1 after. */
  private render(t: number, intro: number): void {
    const { ctx, painter: p, layout, actors } = this;
    const rise = intro >= 1 ? 1 : smooth(0.45, 0.85, intro);
    const beltOn = smooth(0.7, 1, intro);
    ctx.save();
    if (actors.shake) ctx.translate((Math.random() - 0.5) * 2 * actors.shake, (Math.random() - 0.5) * 1.2 * actors.shake);
    drawFloor(p, layout, intro, rise);
    drawPitShell(p, layout);
    clipToPit(p, layout);
    actors.drawPile(p, this.iconFor);
    ctx.restore();
    drawPitRim(p, layout);
    const items: Drawable[] = [];
    const stations = layout.stations;
    machineDrawables(p, layout, t, rise, beltOn, (i) => this.iconFor(stations[(i + 5) % stations.length]?.app ?? null), items);
    actors.drawables(p, t, rise, intro, this.iconFor, items);
    items.sort((a, b) => a.depth - b.depth).forEach((d) => d.draw());
    actors.drawEffects(p);
    ctx.restore();
    vignette(ctx, this.view);
    if (actors.flash > 0) {
      ctx.fillStyle = `rgba(255,240,220,${actors.flash})`;
      ctx.fillRect(0, 0, this.view.w, this.view.h);
    }
  }

  private readonly iconFor = (app: AppCard | null): HTMLImageElement | undefined => (app?.icon ? this.icons.get(app.icon) : undefined);

  private readonly onPointer = (e: PointerEvent): void => {
    if (this.opts.reducedMotion) return;
    const rect = this.canvas.getBoundingClientRect();
    const sx = e.clientX - rect.left;
    const sy = e.clientY - rect.top;
    const [x, y] = unproject(this.view, sx, sy);
    if (inPit(this.layout, x, y, 40)) {
      const app = this.actors.pickFromPile(this.painter, sx, sy);
      if (app) this.opts.onPitPick?.(app);
      return;
    }
    this.actors.boomAt(x, y, performance.now() / 1000);
  };
}
