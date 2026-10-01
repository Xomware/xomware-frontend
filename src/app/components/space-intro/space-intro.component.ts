import {
  AfterViewInit,
  ChangeDetectionStrategy,
  Component,
  ElementRef,
  HostListener,
  NgZone,
  OnDestroy,
  inject,
  output,
  viewChild,
} from '@angular/core';
import { PLANETS, Planet } from '../../data/planets';
import { INTRO_END, INTRO_IMPACT } from '../../space/intro-timing';

let played = false;

/** How long the dark cover may wait for the scene's chunk before the page shows without it. */
export const INTRO_PATIENCE = 4000;

export interface IntroView {
  resize(width: number, height: number): void;
  draw(t: number): void;
  dispose(): void;
}

/**
 * Loads the three.js scene as its own chunk, so nothing else on the site
 * pays for it. Resolves null without WebGL 2. An object so tests can stub it.
 */
export const introStage = {
  async open(canvas: HTMLCanvasElement, planets: Planet[]): Promise<IntroView | null> {
    const { openIntroScene } = await import('../../space/intro-scene');
    return openIntroScene(canvas, planets);
  },
};

/**
 * Whether the landing should run the intro. True once per page load, so an
 * in-app navigation back to / goes straight to the page. Reduced motion never
 * gets it.
 */
export function claimIntro(): boolean {
  if (played || typeof window === 'undefined' || !window.matchMedia) return false;
  if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return false;
  played = true;
  return true;
}

/**
 * Full-screen intro over the landing page. The page renders underneath from
 * the first frame; this covers it in the dark until the scene draws, then the
 * blast tears a hole through to it.
 */
@Component({
  selector: 'app-space-intro',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './space-intro.component.html',
  styleUrl: './space-intro.component.scss',
})
export class SpaceIntroComponent implements AfterViewInit, OnDestroy {
  /** The ship has hit; the page starts arriving under the blast. */
  readonly impact = output<void>();
  /** Finished or skipped. The host should unmount the intro. */
  readonly done = output<void>();

  private readonly canvas = viewChild.required<ElementRef<HTMLCanvasElement>>('canvas');
  private readonly host: HTMLElement = inject(ElementRef).nativeElement;
  private readonly zone = inject(NgZone);

  private scene: IntroView | null = null;
  private frame = 0;
  private start = 0;
  private patience = 0;
  private hit = false;
  private finished = false;
  private previousOverflow = '';

  ngAfterViewInit(): void {
    const root = document.documentElement;
    this.previousOverflow = root.style.overflow;
    root.style.overflow = 'hidden';

    // A chunk that never arrives costs the intro, not the page.
    this.patience = window.setTimeout(() => {
      if (!this.scene) this.zone.run(() => this.finish());
    }, INTRO_PATIENCE);

    introStage.open(this.canvas().nativeElement, PLANETS).then(
      (scene) => {
        if (this.finished) return scene?.dispose();
        if (!scene) return this.finish();
        this.scene = scene;
        // One rAF loop for the life of the intro; outside the zone so it never
        // triggers change detection.
        this.zone.runOutsideAngular(() => {
          this.resize();
          window.addEventListener('resize', this.resize);
          this.frame = requestAnimationFrame(this.tick);
        });
      },
      () => this.finish(),
    );
  }

  ngOnDestroy(): void {
    this.finished = true;
    cancelAnimationFrame(this.frame);
    clearTimeout(this.patience);
    window.removeEventListener('resize', this.resize);
    document.documentElement.style.overflow = this.previousOverflow;
    this.scene?.dispose();
  }

  @HostListener('document:keydown.escape')
  skip(): void {
    this.finish();
  }

  private readonly resize = (): void => {
    this.scene?.resize(window.innerWidth, window.innerHeight);
  };

  private readonly tick = (): void => {
    const now = performance.now();
    // The clock starts on the scene's first frame, not when the chunk was asked for.
    if (!this.start) this.start = now;
    const t = (now - this.start) / 1000;
    this.scene?.draw(t);
    // The host paints a dark cover until the canvas has a frame of its own,
    // so the page never flashes before the intro.
    this.host.classList.add('is-drawn');

    if (!this.hit && t >= INTRO_IMPACT) {
      this.hit = true;
      this.host.classList.add('is-hit');
      this.zone.run(() => this.impact.emit());
    }
    if (t >= INTRO_END) {
      this.zone.run(() => this.finish());
      return;
    }
    this.frame = requestAnimationFrame(this.tick);
  };

  private finish(): void {
    if (this.finished) return;
    this.finished = true;
    cancelAnimationFrame(this.frame);
    this.done.emit();
  }
}
