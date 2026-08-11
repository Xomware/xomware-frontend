import { AfterViewInit, Component, ElementRef, NgZone, OnDestroy, ViewChild } from '@angular/core';
import { Starfield } from '../space-journey/starfield';
import { environment } from '../../../environments/environment';

/** Calmer than the flight's field — this sits behind text all the way down. */
const BACKDROP_STARS = 380;
/** Self-propelled drift. Slow enough to read as distant, not as movement. */
const DRIFT = 0.000018;

/**
 * The page-level sky.
 *
 * Replaces the ambient blob layer that used to sit behind these pages, so the
 * whole site stays in the same space the landing flight opens in rather than
 * cutting to flat black the moment the pin releases.
 *
 * Deliberately quieter than the flight's own field: fewer stars, no mark to
 * assemble, and a drift slow enough that it never competes with the content
 * on top of it.
 */
@Component({
  selector: 'app-space-backdrop',
  templateUrl: './space-backdrop.component.html',
  styleUrls: ['./space-backdrop.component.scss'],
})
export class SpaceBackdropComponent implements AfterViewInit, OnDestroy {
  @ViewChild('canvas', { static: true }) canvasRef!: ElementRef<HTMLCanvasElement>;

  private field?: Starfield;
  private resizeObserver?: ResizeObserver;

  constructor(private zone: NgZone) {}

  ngAfterViewInit(): void {
    // Runs on rAF for the life of the page; keeping it out of the zone means
    // it never triggers change detection.
    this.zone.runOutsideAngular(() => {
      const reducedMotion =
        !!window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;

      // staticScene is the visual-regression build. Drift has to be frozen
      // there too, not just the meteors: it moves every star a little each
      // frame, so screenshots taken microseconds apart would never match.
      const still = environment.staticScene || reducedMotion;

      const field = new Starfield(this.canvasRef.nativeElement, {
        animateScene: !still,
        starCount: BACKDROP_STARS,
        // The mark belongs to the flight's own field; assembling it here would
        // put a second Xomware X on screen behind the page content.
        mark: false,
        drift: still ? 0 : DRIFT,
      });
      this.field = field;
      field.resize();

      this.resizeObserver = new ResizeObserver(() => field.resize());
      this.resizeObserver.observe(this.canvasRef.nativeElement);

      // Frozen surfaces paint one frame and stop there.
      if (still) return;

      field.start();
      document.addEventListener('visibilitychange', this.onVisibility);
    });
  }

  ngOnDestroy(): void {
    document.removeEventListener('visibilitychange', this.onVisibility);
    this.resizeObserver?.disconnect();
    this.field?.destroy();
  }

  /** No reason to burn frames on a sky nobody is looking at. */
  private readonly onVisibility = (): void => {
    if (document.visibilityState === 'visible') this.field?.start();
    else this.field?.stop();
  };
}
