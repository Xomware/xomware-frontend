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
import { PLANETS } from '../../data/planets';
import { INTRO_END, INTRO_IMPACT, IntroScene } from '../../space/intro-scene';

let played = false;

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
 * the first frame; this only covers it, then blows a hole through to it.
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

  private scene?: IntroScene;
  private frame = 0;
  private start = 0;
  private hit = false;
  private finished = false;
  private previousOverflow = '';

  ngAfterViewInit(): void {
    const root = document.documentElement;
    this.previousOverflow = root.style.overflow;
    root.style.overflow = 'hidden';

    // One rAF loop for the life of the intro; outside the zone so it never
    // triggers change detection.
    this.zone.runOutsideAngular(() => {
      this.scene = new IntroScene(this.canvas().nativeElement, PLANETS);
      this.resize();
      window.addEventListener('resize', this.resize);
      this.start = performance.now();
      this.frame = requestAnimationFrame(this.tick);
    });
  }

  ngOnDestroy(): void {
    cancelAnimationFrame(this.frame);
    window.removeEventListener('resize', this.resize);
    document.documentElement.style.overflow = this.previousOverflow;
  }

  @HostListener('document:keydown.escape')
  skip(): void {
    this.finish();
  }

  private readonly resize = (): void => {
    this.scene?.resize(window.innerWidth, window.innerHeight);
  };

  private readonly tick = (): void => {
    const t = (performance.now() - this.start) / 1000;
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
