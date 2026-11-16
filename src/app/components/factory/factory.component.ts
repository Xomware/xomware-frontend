import { NgTemplateOutlet } from '@angular/common';
import { AfterViewInit, ChangeDetectionStrategy, Component, ElementRef, NgZone, OnDestroy, OnInit, ViewChild, computed, inject, input, output, signal } from '@angular/core';
import { APPS, AppCard } from '../../data/apps.data';
import { Factory } from '../../factory/factory';
import { COS30, SIN30 } from '../../factory/iso';
import { PIT_R, Station, cameraMax, layoutLine } from '../../factory/layout';

interface Placed {
  left: number;
  top: number;
}

/**
 * The landing page's app directory as an isometric factory tour. A tall track gives the page scroll distance; a
 * sticky stage inside it holds the canvas and a DOM layer of station cards that moves with the camera. Scrolling
 * the track walks the camera down the line until it parks at the pit, where every app is listed.
 */
@Component({
  selector: 'app-factory',
  standalone: true,
  imports: [NgTemplateOutlet],
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './factory.component.html',
  styleUrl: './factory.component.scss',
})
export class FactoryComponent implements OnInit, AfterViewInit, OnDestroy {
  private readonly zone = inject(NgZone);
  private readonly host = inject<ElementRef<HTMLElement>>(ElementRef);

  /** Play the factory intro on arrival. The landing decides, once per page load. */
  readonly intro = input(false);
  readonly introDone = output<void>();
  readonly introPlaying = signal(false);
  readonly introTitle = signal(false);

  readonly layout = layoutLine(APPS);
  readonly groups = this.layout.lines.map((line) => ({ line, stations: this.layout.stations.filter((s) => s.app.platform === line.zone.platform) }));
  readonly viewport = signal({ w: 1440, h: 900 });
  readonly camMax = computed(() => cameraMax(this.layout, this.viewport().w));
  readonly trackHeight = computed(() => this.camMax() + this.viewport().h);
  readonly narrow = computed(() => this.viewport().w < 800);
  /** World-layer coordinates; the anchor depends on the viewport, so the lead is re-placed on resize. */
  readonly leadAt = computed<Placed>(() => {
    const { w, h } = this.viewport();
    return { left: 40 - w * 0.3, top: h * 0.2 - h * 0.52 };
  });
  /** Beside the pit on wide screens. Phones get the list in the page flow below the tour instead. */
  readonly pitAt: Placed = this.at(this.layout.pit + PIT_R * 2, -300 - PIT_R * 2 * SIN30, 30);
  readonly activeLine = signal(0);
  /** Station index of the app last picked out of the pit. Names repeat (Xomify on web and iOS), indexes don't. */
  readonly picked = signal<number | null>(null);

  @ViewChild('track', { static: true }) private track!: ElementRef<HTMLElement>;
  @ViewChild('canvas', { static: true }) private canvas!: ElementRef<HTMLCanvasElement>;
  @ViewChild('world', { static: true }) private world!: ElementRef<HTMLElement>;
  @ViewChild('bar', { static: true }) private bar!: ElementRef<HTMLElement>;

  private factory?: Factory;
  private observer?: IntersectionObserver;
  private trackTop = 0;
  private readonly reducedMotion = typeof matchMedia === 'function' && matchMedia('(prefers-reduced-motion: reduce)').matches;

  at(x: number, dy: number, dx = 0): Placed {
    return { left: x * COS30 + dx, top: x * SIN30 + dy };
  }

  ngOnInit(): void {
    this.introPlaying.set(this.intro());
  }

  ngAfterViewInit(): void {
    this.zone.runOutsideAngular(() => {
      this.factory = new Factory(this.canvas.nativeElement, this.layout, {
        reducedMotion: this.reducedMotion,
        onPitPick: (app) => this.zone.run(() => this.pick(app)),
        onFrame: (origin, cam, intro) => this.follow(origin, cam, intro),
      });
      this.measure();
      addEventListener('scroll', this.onScroll, { passive: true });
      addEventListener('resize', this.measure);
      this.observer = new IntersectionObserver(([entry]) => this.factory?.setRunning(entry.isIntersecting));
      this.observer.observe(this.track.nativeElement);
      if (!this.introPlaying()) return;
      addEventListener('keydown', this.onIntroKey);
      addEventListener('wheel', this.skipIntro, { passive: true });
      addEventListener('touchstart', this.skipIntro, { passive: true });
      this.factory.playIntro().then(() => this.zone.run(() => this.endIntro()));
    });
  }

  readonly skipIntro = (): void => this.factory?.skipIntro();

  private readonly onIntroKey = (e: KeyboardEvent): void => {
    if (['Escape', 'Enter', ' '].includes(e.key)) this.skipIntro();
  };

  private endIntro(): void {
    removeEventListener('keydown', this.onIntroKey);
    removeEventListener('wheel', this.skipIntro);
    removeEventListener('touchstart', this.skipIntro);
    this.introPlaying.set(false);
    this.introDone.emit();
  }

  ngOnDestroy(): void {
    removeEventListener('scroll', this.onScroll);
    removeEventListener('resize', this.measure);
    removeEventListener('keydown', this.onIntroKey);
    removeEventListener('wheel', this.skipIntro);
    removeEventListener('touchstart', this.skipIntro);
    this.observer?.disconnect();
    this.factory?.destroy();
  }

  /** Scrolls the page so the camera lands at x along the line. */
  jumpTo(x: number): void {
    const top = this.trackTop + Math.max(0, Math.min(this.camMax(), x));
    scrollTo({ top, behavior: this.reducedMotion ? 'auto' : 'smooth' });
  }

  jumpToPit(): void {
    if (this.narrow()) this.host.nativeElement.querySelector('#all-apps')?.scrollIntoView({ behavior: this.reducedMotion ? 'auto' : 'smooth' });
    else this.jumpTo(this.camMax());
  }

  /** Keyboard users tab onto cards the camera hasn't reached yet, so bring their station into view. */
  focusStation(s: Station): void {
    this.jumpTo(s.x - 420);
  }

  statusLabel(app: AppCard): string {
    return app.status === 'coming-soon' ? 'Coming soon' : `Open ${app.name.split(' ')[0]}`;
  }

  private readonly measure = (): void => {
    const w = innerWidth;
    const h = innerHeight;
    this.zone.run(() => this.viewport.set({ w, h }));
    this.factory?.resize(w, h);
    // The track's height comes from the viewport, so read its position once layout has caught up.
    requestAnimationFrame(() => {
      this.trackTop = this.track.nativeElement.getBoundingClientRect().top + scrollY;
      this.onScroll();
    });
  };

  private readonly onScroll = (): void => {
    this.factory?.setCamera(Math.max(0, Math.min(this.camMax(), scrollY - this.trackTop)));
  };

  private follow(origin: { x: number; y: number }, cam: number, intro: number): void {
    if (intro > 0.55 && intro < 1 && !this.introTitle()) this.zone.run(() => this.introTitle.set(true));
    this.world.nativeElement.style.transform = `translate3d(${origin.x}px, ${origin.y}px, 0)`;
    this.bar.nativeElement.style.width = `${(cam / Math.max(1, this.camMax())) * 100}%`;
    let line = 0;
    this.layout.lines.forEach((l, i) => {
      if (cam + 400 >= l.x) line = i;
    });
    if (line !== this.activeLine()) this.zone.run(() => this.activeLine.set(line));
  }

  private pick(app: AppCard): void {
    const station = this.layout.stations.find((s) => s.app === app);
    if (!station) return;
    this.picked.set(station.index);
    // On phones the list is further down the page; scrolling to it would yank the reader away from the pit.
    if (this.narrow()) return;
    const row = this.host.nativeElement.querySelector(`[data-station="${station.index}"]`);
    row?.scrollIntoView({ block: 'nearest', behavior: this.reducedMotion ? 'auto' : 'smooth' });
  }
}
