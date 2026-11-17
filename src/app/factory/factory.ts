import { AppCard } from '../data/apps.data';
import { Actors } from './actors';
import { COS30, Painter, SIN30, View, anchor, unproject } from './iso';
import { CAROUSEL, LineLayout, Speaker } from './layout';
import { Sound, beat, drawSpeaker } from './music';
import { Shipment, packHeight } from './packages';
import { Drawable, Spot, drawFloor, endDrawables, machineDrawables, smooth, visibleRange, vignette } from './scene';

/** Where an app's tag hangs over its package, in the DOM world layer's coordinates. */
export interface TagAnchor {
  left: number;
  top: number;
  /** Nearer packages' tags stack over farther ones. */
  depth: number;
}

export interface FactoryOptions {
  reducedMotion: boolean;
  /** Called with the station whose package was clicked on the carousel, or null for a click anywhere else. */
  onPick?: (index: number | null) => void;
  /**
   * Called after every frame with the world origin's screen position, the camera, intro progress (0..1, 1 once
   * the intro is over) and each station's tag anchor, so DOM can move and reveal in step.
   */
  onFrame?: (origin: { x: number; y: number }, cam: number, intro: number, tags: TagAnchor[]) => void;
}

const INTRO_SECONDS = 4.2;

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
  private intro = 1;
  private introStart = 0;
  private introDone: (() => void) | null = null;
  private spots: Spot[] = [];
  private readonly sound = new Sound();
  private music = false;

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

  /** Floor tiles ripple in, machines rise, the belt spins up. Resolves when it ends or is skipped. */
  playIntro(): Promise<void> {
    if (this.opts.reducedMotion) return Promise.resolve();
    this.intro = 0;
    this.introStart = performance.now();
    return new Promise((resolve) => (this.introDone = resolve));
  }

  skipIntro(): void {
    const done = this.introDone;
    if (!done) return;
    this.intro = 1;
    this.introDone = null;
    done();
  }

  /** Stops the carousel while a tag is being read. */
  setHold(on: boolean): void {
    this.actors.hold = on;
  }

  /** Whether Xomify says a track is playing right now: the speakers pump and the crowd dances. */
  setMusic(on: boolean): void {
    this.music = on;
    this.actors.music = on;
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
    if (this.introDone) {
      this.intro = Math.min(1, (now - this.introStart) / 1000 / INTRO_SECONDS);
      if (this.intro >= 1) this.skipIntro();
    }
    // The floor is still building during the intro, so the crowd moves at a crawl until it's done.
    if (!this.opts.reducedMotion) {
      this.actors.update(this.introDone ? dt * 0.3 : dt, t, this.view.cam, this.view.w);
      this.sound.update(dt, t, this.music, this.speakersInView());
    }
    this.spots = this.actors.spots(t);
    this.render(t, this.intro);
    this.opts.onFrame?.(this.origin(), this.view.cam, this.intro, this.spots.map(tagAnchor));
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
    const items: Drawable[] = [];
    const stations = layout.stations;
    const pulse = this.music && !this.opts.reducedMotion ? beat(t) : 0;
    this.sound.drawRings(p, t, false);
    machineDrawables(p, layout, t, rise, beltOn, (i) => this.shipFor(stations[(i + 5) % stations.length]?.app ?? null), items);
    const onIsland = () => {
      this.sound.drawRings(p, t, true);
      layout.speakers.filter((s) => s.island).forEach((s) => drawSpeaker(p, s, 1, pulse));
    };
    endDrawables(p, layout, actors.spin, this.spots, (st) => this.shipFor(st.app), Math.max(0, 1 - (t - actors.sorted) / 0.6), onIsland, items);
    for (const s of this.speakersInView()) if (!s.island) items.push({ depth: s.x + s.y, draw: () => drawSpeaker(p, s, rise, pulse) });
    actors.drawables(p, t, rise, intro, this.shipFor, items);
    items.sort((a, b) => a.depth - b.depth).forEach((d) => d.draw());
    actors.drawEffects(p);
    this.sound.drawNotes(p, t);
    ctx.restore();
    vignette(ctx, this.view);
    if (actors.flash > 0) {
      ctx.fillStyle = `rgba(255,240,220,${actors.flash})`;
      ctx.fillRect(0, 0, this.view.w, this.view.h);
    }
    if (intro < 1) {
      ctx.fillStyle = `rgba(0,0,0,${1 - smooth(0, 0.25, intro)})`;
      ctx.fillRect(0, 0, this.view.w, this.view.h);
    }
  }

  private readonly iconFor = (app: AppCard): HTMLImageElement | undefined => (app.icon ? this.icons.get(app.icon) : undefined);

  /** A stamped crate ships in its station's packaging, with the app's colour and icon. */
  private readonly shipFor = (app: AppCard | null): Shipment | null => {
    const station = app && this.layout.stations.find((s) => s.app === app);
    return station ? { kind: station.pack, color: app.color, icon: this.iconFor(app) } : null;
  };

  private speakersInView(): Speaker[] {
    const [x0, x1] = visibleRange(this.view, this.layout);
    return this.layout.speakers.filter((s) => s.x > x0 && s.x < x1);
  }

  /** The carousel package drawn nearest a screen point, if it's within reach. */
  private spotAt(sx: number, sy: number): Spot | undefined {
    let best: Spot | undefined;
    let bestD = 50;
    for (const s of this.spots) {
      const [px, py] = this.painter.p(s.x, s.y, s.z + packHeight(CAROUSEL.size, s.station.pack) / 2);
      const d = Math.hypot(px - sx, py - sy);
      if (d < bestD) {
        bestD = d;
        best = s;
      }
    }
    return best;
  }

  private readonly onPointer = (e: PointerEvent): void => {
    if (this.introDone) {
      this.skipIntro();
      return;
    }
    const rect = this.canvas.getBoundingClientRect();
    const sx = e.clientX - rect.left;
    const sy = e.clientY - rect.top;
    const hit = this.spotAt(sx, sy);
    this.opts.onPick?.(hit ? hit.station.index : null);
    if (hit) {
      this.actors.bump(hit.station.index, performance.now() / 1000);
      return;
    }
    if (this.opts.reducedMotion) return;
    const [x, y] = unproject(this.view, sx, sy);
    this.actors.boomAt(x, y, performance.now() / 1000);
  };
}

function tagAnchor(s: Spot): TagAnchor {
  const top = s.z + packHeight(CAROUSEL.size, s.station.pack) + 14;
  return { left: (s.x - s.y) * COS30, top: (s.x + s.y) * SIN30 - top, depth: s.x + s.y };
}
