import {
  AfterViewInit,
  ChangeDetectorRef,
  Component,
  ElementRef,
  NgZone,
  OnDestroy,
  QueryList,
  ViewChild,
  ViewChildren,
} from '@angular/core';
import { gsap } from 'gsap';
import { PLANETS, Planet } from '../../data/planets';

/** Seconds a product stays at the front before the orbit moves on. */
const DWELL = 3.8;
/** Seconds to swing the next product to the front. */
const TRAVEL = 1.1;

/**
 * The Xomware suite as an orbital system.
 *
 * Products circle a central mark; whichever is at the front is magnified and
 * its details are shown. The orbit advances on its own so the page reads as
 * alive, and stops the moment someone interacts — hovering, focusing or
 * stepping it manually — so it never fights a person trying to read.
 */
@Component({
  selector: 'app-orbit',
  templateUrl: './app-orbit.component.html',
  styleUrls: ['./app-orbit.component.scss'],
})
export class AppOrbitComponent implements AfterViewInit, OnDestroy {
  readonly apps: Planet[] = PLANETS;

  /** Drives the info panel. Updated inside the zone; the orbit itself is not. */
  focusedIndex = 0;
  paused = false;

  @ViewChild('stage', { static: true }) stage!: ElementRef<HTMLElement>;
  @ViewChildren('body') bodies!: QueryList<ElementRef<HTMLElement>>;

  /** Continuous rotation in degrees; GSAP tweens this and layout() reads it. */
  private readonly rot = { deg: 0 };
  private els: HTMLElement[] = [];
  private radiusX = 0;
  private radiusY = 0;
  private resizeObserver?: ResizeObserver;
  private visibility?: IntersectionObserver;
  private queued?: gsap.core.Tween;
  private spin?: gsap.core.Tween;
  private onScreen = false;
  private reducedMotion = false;

  constructor(
    private zone: NgZone,
    private cdr: ChangeDetectorRef,
  ) {}

  get focused(): Planet {
    return this.apps[this.focusedIndex];
  }

  private get step(): number {
    return 360 / this.apps.length;
  }

  ngAfterViewInit(): void {
    this.reducedMotion =
      typeof window !== 'undefined' &&
      !!window.matchMedia &&
      window.matchMedia('(prefers-reduced-motion: reduce)').matches;

    this.zone.runOutsideAngular(() => {
      this.els = this.bodies.map((b) => b.nativeElement);
      this.measure();
      this.layout();

      this.resizeObserver = new ResizeObserver(() => {
        this.measure();
        this.layout();
      });
      this.resizeObserver.observe(this.stage.nativeElement);

      // An orbit spinning in a scrolled-past section is wasted work, and on a
      // long page it would still be advancing when nobody can see it.
      this.visibility = new IntersectionObserver(
        ([entry]) => {
          this.onScreen = entry.isIntersecting;
          if (this.onScreen) this.queueNext();
          else this.cancelQueued();
        },
        { threshold: 0.25 },
      );
      this.visibility.observe(this.stage.nativeElement);
    });
  }

  ngOnDestroy(): void {
    this.cancelQueued();
    this.spin?.kill();
    this.resizeObserver?.disconnect();
    this.visibility?.disconnect();
  }

  /** Step the orbit by hand. Also stops the auto-advance for good. */
  step_(direction: 1 | -1): void {
    this.paused = true;
    this.cancelQueued();
    const next = (this.focusedIndex + direction + this.apps.length) % this.apps.length;
    this.goTo(next);
  }

  /** Bring a specific product to the front (click, or keyboard focus). */
  select(index: number): void {
    if (index === this.focusedIndex) return;
    this.paused = true;
    this.cancelQueued();
    this.goTo(index);
  }

  /** Hovering the stage holds the current product so it can be read. */
  hold(): void {
    this.cancelQueued();
  }

  release(): void {
    if (!this.paused) this.queueNext();
  }

  private measure(): void {
    const rect = this.stage.nativeElement.getBoundingClientRect();
    // A wide, shallow ellipse reads as a ring seen at an angle rather than a
    // flat circle of icons.
    this.radiusX = rect.width * 0.36;
    this.radiusY = Math.min(rect.height * 0.34, 148);
  }

  /**
   * Place every body on the ellipse for the current rotation.
   *
   * Writes transforms straight to the elements — this runs on every frame of
   * the swing, so going through bindings would mean a change-detection pass
   * per frame for eight elements that only need a transform.
   */
  private layout(): void {
    const step = this.step;

    this.els.forEach((el, i) => {
      const theta = ((this.rot.deg + i * step) * Math.PI) / 180;
      // depth: 1 at the front (nearest the viewer), -1 at the back.
      const depth = Math.cos(theta);
      const x = Math.sin(theta) * this.radiusX;
      const y = depth * this.radiusY;
      // Front bodies are bigger and fully opaque; those behind recede.
      const t = (depth + 1) / 2;
      const scale = 0.48 + t * 0.52;

      el.style.transform = `translate(-50%, -50%) translate(${x}px, ${y}px) scale(${scale})`;
      el.style.opacity = `${0.3 + t * 0.7}`;
      el.style.zIndex = `${Math.round(t * 100)}`;
      el.classList.toggle('is-front', depth > 0.92);
    });
  }

  private goTo(index: number): void {
    const target = -index * this.step;
    // Rotation is continuous and unbounded, so tween along the shortest arc
    // to the target rather than unwinding the whole way round.
    let delta = target - this.rot.deg;
    delta = (((delta + 180) % 360) + 360) % 360 - 180;

    this.spin?.kill();
    this.zone.runOutsideAngular(() => {
      this.spin = gsap.to(this.rot, {
        deg: this.rot.deg + delta,
        duration: this.reducedMotion ? 0 : TRAVEL,
        ease: 'power2.inOut',
        onUpdate: () => this.layout(),
      });
    });

    // The panel is a binding, so this half has to re-enter Angular.
    this.zone.run(() => {
      this.focusedIndex = index;
      this.cdr.markForCheck();
    });
  }

  private queueNext(): void {
    // Reduced motion gets a static ring: it can still be driven by hand, but
    // nothing moves on its own.
    if (this.paused || this.reducedMotion || !this.onScreen) return;
    this.cancelQueued();
    this.queued = gsap.delayedCall(DWELL, () => {
      this.goTo((this.focusedIndex + 1) % this.apps.length);
      this.queueNext();
    });
  }

  private cancelQueued(): void {
    this.queued?.kill();
    this.queued = undefined;
  }
}
