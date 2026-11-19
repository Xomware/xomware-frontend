import { NgTemplateOutlet } from '@angular/common';
import { AfterViewInit, ChangeDetectionStrategy, Component, ElementRef, NgZone, OnDestroy, OnInit, ViewChild, computed, effect, inject, input, output, signal } from '@angular/core';
import { APPS, AppCard } from '../../data/apps.data';
import { Factory, TagAnchor } from '../../factory/factory';
import { COS30, SIN30 } from '../../factory/iso';
import { Station, cameraMax, layoutLine, stationNear } from '../../factory/layout';
import { NowPlayingState } from '../../models/now-playing.model';

interface Placed {
  left: number;
  top: number;
}

/** Matches $breakpoint-md: at or under it the stylesheet docks one station card instead of hanging them all. */
const PHONE = 768;

/**
 * The landing page's app directory as an isometric factory tour. A tall track gives the page scroll distance; a
 * sticky stage inside it holds the canvas and a DOM layer of station cards that moves with the camera. Scrolling
 * the track walks the camera down the line until it parks at the shipping carousel, where every app rides past
 * with a tag. The flat list of apps follows the factory on the landing page.
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

  /** Play the factory intro on arrival. The landing decides, once per page load. */
  readonly intro = input(false);
  readonly introDone = output<void>();
  /** What Xomify says is playing, or last played. The landing polls it while it's worth showing. */
  readonly nowPlaying = input<NowPlayingState | null>(null);
  readonly isPlaying = computed(() => this.nowPlaying()?.source === 'playing');
  /** True while any of the factory is on screen. */
  readonly onScreen = output<boolean>();
  readonly introPlaying = signal(false);
  readonly introTitle = signal(false);

  readonly layout = layoutLine(APPS);
  readonly viewport = signal({ w: 1440, h: 900 });
  readonly phone = computed(() => this.viewport().w <= PHONE);
  /** Phones see the floor zoomed out, so a screen holds about what a desktop's does. */
  readonly zoom = computed(() => (this.phone() ? Math.min(1, this.viewport().w / 680) : 1));
  /**
   * Page scroll per world unit walked. At 1 a phone needed ~15,000px of scrolling to reach the carousel; on phones
   * the walk runs a little ahead of the finger instead.
   */
  private readonly pace = computed(() => (this.phone() ? this.zoom() * 0.6 : 1));
  readonly camMax = computed(() => cameraMax(this.layout, this.viewport().w / this.zoom()));
  readonly trackHeight = computed(() => this.camMax() * this.pace() + this.viewport().h);
  /** On phones, the station nearest mid-screen, shown in one card docked to the bottom. */
  readonly docked = signal<Station | null>(null);
  /** World-layer coordinates; the anchor depends on the viewport, so the lead is re-placed on resize. */
  readonly leadAt = computed<Placed>(() => {
    const { w, h } = this.viewport();
    return { left: (this.phone() ? 16 : 40) - w * 0.3, top: h * 0.2 - h * 0.52 };
  });
  /** The carousel's centre in the world layer, for the Shipping heading above it. */
  readonly endAt = computed<Placed>(() => {
    const { x, y } = this.layout.end;
    return { left: (x - y) * COS30 * this.zoom(), top: (x + y) * SIN30 * this.zoom() };
  });
  /** Which HUD stop the camera is at: a line's index, or lines.length at the carousel. */
  readonly activeLine = signal(0);
  /** Station whose tag was opened by clicking its package. */
  readonly opened = signal<number | null>(null);

  @ViewChild('track', { static: true }) private track!: ElementRef<HTMLElement>;
  @ViewChild('canvas', { static: true }) private canvas!: ElementRef<HTMLCanvasElement>;
  @ViewChild('world', { static: true }) private world!: ElementRef<HTMLElement>;
  @ViewChild('bar', { static: true }) private bar!: ElementRef<HTMLElement>;

  private factory?: Factory;
  private observer?: IntersectionObserver;
  private trackTop = 0;
  private tagEls: HTMLElement[] = [];
  private readonly reducedMotion = typeof matchMedia === 'function' && matchMedia('(prefers-reduced-motion: reduce)').matches;

  constructor() {
    effect(() => this.factory?.setMusic(this.isPlaying()));
  }

  at(x: number, dy: number, dx = 0): Placed {
    const k = this.zoom();
    return { left: (x * COS30 + dx) * k, top: (x * SIN30 + dy) * k };
  }

  ngOnInit(): void {
    this.introPlaying.set(this.intro());
  }

  ngAfterViewInit(): void {
    this.zone.runOutsideAngular(() => {
      this.factory = new Factory(this.canvas.nativeElement, this.layout, {
        reducedMotion: this.reducedMotion,
        onPick: (index) => this.zone.run(() => this.opened.set(index)),
        onFrame: (origin, cam, intro, tags) => this.follow(origin, cam, intro, tags),
      });
      this.factory.setMusic(this.isPlaying());
      this.tagEls = Array.from(this.world.nativeElement.querySelectorAll<HTMLElement>('.ship'));
      this.measure();
      addEventListener('scroll', this.onScroll, { passive: true });
      addEventListener('resize', this.measure);
      this.observer = new IntersectionObserver(([entry]) => {
        this.factory?.setRunning(entry.isIntersecting);
        this.zone.run(() => this.onScreen.emit(entry.isIntersecting));
      });
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
    const top = this.trackTop + Math.max(0, Math.min(this.camMax(), x)) * this.pace();
    scrollTo({ top, behavior: this.reducedMotion ? 'auto' : 'smooth' });
  }

  jumpToEnd(): void {
    this.jumpTo(this.camMax());
  }

  /** The flat list of every app is the landing's next section, after the factory. */
  showAll(): void {
    document.getElementById('all-apps')?.scrollIntoView({ behavior: this.reducedMotion ? 'auto' : 'smooth' });
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
    this.factory?.resize(w, h, this.zoom());
    // The track's height comes from the viewport, so read its position once layout has caught up.
    requestAnimationFrame(() => {
      this.trackTop = this.track.nativeElement.getBoundingClientRect().top + scrollY;
      this.onScroll();
    });
  };

  private readonly onScroll = (): void => {
    this.factory?.setCamera(Math.max(0, Math.min(this.camMax(), (scrollY - this.trackTop) / this.pace())));
  };

  private follow(origin: { x: number; y: number }, cam: number, intro: number, tags: TagAnchor[]): void {
    if (intro > 0.55 && intro < 1 && !this.introTitle()) this.zone.run(() => this.introTitle.set(true));
    this.world.nativeElement.style.transform = `translate3d(${origin.x}px, ${origin.y}px, 0)`;
    this.bar.nativeElement.style.width = `${(cam / Math.max(1, this.camMax())) * 100}%`;
    let line = 0;
    this.layout.lines.forEach((l, i) => {
      if (cam + 400 >= l.x) line = i;
    });
    if (cam >= this.camMax() - 300) line = this.layout.lines.length;
    if (line !== this.activeLine()) this.zone.run(() => this.activeLine.set(line));
    // Mid-screen sits 0.2 of the width right of the anchor, which is 0.2w / (zoom * cos30) along the line.
    const docked = this.phone() ? stationNear(this.layout, cam + (this.viewport().w * 0.2) / (this.zoom() * COS30)) : null;
    if (docked !== this.docked()) this.zone.run(() => this.docked.set(docked));
    tags.forEach((tag, i) => {
      const el = this.tagEls[i];
      if (!el) return;
      el.style.transform = `translate(${tag.left}px, ${tag.top}px) translate(-50%, calc(-100% - 8px))`;
      el.style.zIndex = String(Math.round(tag.depth) + 4000);
    });
    // Hovering, focusing or opening a tag holds the carousel still so it can be read.
    this.factory?.setHold(!!this.world.nativeElement.querySelector('.ship:hover, .ship:focus-visible, .ship.is-open'));
  }
}
