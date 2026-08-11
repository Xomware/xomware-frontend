import {
  AfterViewInit,
  Component,
  ElementRef,
  NgZone,
  OnDestroy,
  QueryList,
  ViewChild,
  ViewChildren,
} from '@angular/core';
import { gsap } from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';
import { PLANETS, Planet } from '../../data/planets';
import { Starfield } from './starfield';
import { environment } from '../../../environments/environment';

gsap.registerPlugin(ScrollTrigger);

/**
 * Normalised timeline positions. The pinned scroll runs three beats: the intro
 * clears, the brief holds while the mark assembles behind it, then the camera
 * travels past the planets and releases into the page.
 */
const INTRO_END = 0.08;
/** The brief rises while the mark is still assembling behind it. */
const BRIEF_START = 0.12;
/** The brief holds here, then clears — travel starts at BRIEF_END. */
const BRIEF_END = 0.3;
const TRAVEL_END = 0.94;

/**
 * Scroll distance of the pin, in viewport heights per planet.
 *
 * The extra beats buy room for the intro and the brief so they don't compress
 * the flight itself.
 */
const VH_PER_PLANET = 0.85;
/**
 * Phones get a shorter flight.
 *
 * The pin is measured in viewport heights, and a phone viewport is a much
 * smaller bite of scroll than a desktop one — the same multiplier meant far
 * more thumb travel for the same journey.
 */
const VH_PER_PLANET_NARROW = 0.6;
// Intro, brief, and the long empty run out to the outro.
const EXTRA_BEATS = 4;

/**
 * How assembled the X constellation is at a given scroll progress, 0..1.
 *
 * It gathers as the wordmark clears, holds behind the brief, then scatters
 * again as the flight begins — so the mark is a beat you pass through rather
 * than decoration parked on screen. It sits behind the brief on purpose: the
 * stars are dim enough to read as sky, and the shape carries on the crispness
 * of its outline rather than on brightness.
 */
export function constellationStrength(progress: number): number {
  const GATHER_FROM = 0.04;
  const HOLD_FROM = 0.13;
  const HOLD_UNTIL = 0.23;
  const SCATTER_BY = 0.29;

  if (progress <= GATHER_FROM || progress >= SCATTER_BY) return 0;
  if (progress >= HOLD_FROM && progress <= HOLD_UNTIL) return 1;

  const ease = (t: number) => t * t * (3 - 2 * t); // smoothstep
  if (progress < HOLD_FROM) {
    return ease((progress - GATHER_FROM) / (HOLD_FROM - GATHER_FROM));
  }
  return ease(1 - (progress - HOLD_UNTIL) / (SCATTER_BY - HOLD_UNTIL));
}

/**
 * Whether the cinematic intro should mount at all.
 *
 * Only `prefers-reduced-motion` turns it off — a pinned, scrubbed flight is
 * exactly the kind of motion that setting exists to refuse. (And no
 * `matchMedia` at all means SSR/prerender, so render the plain page.)
 *
 * This used to also remember a skip in sessionStorage, on the theory that
 * nobody wants the intro twice. In practice one tap of "Skip intro" made the
 * whole flight vanish for the rest of the browser session with no way back —
 * the page just started at the profile, and it read as the feature being
 * broken. Skipping now only skips the once.
 *
 * Nothing is lost when this returns false: every app on the rail is also in
 * the directory grid further down the page.
 */
export function shouldPlayJourney(): boolean {
  if (typeof window === 'undefined' || !window.matchMedia) return false;
  return !window.matchMedia('(prefers-reduced-motion: reduce)').matches;
}

@Component({
  selector: 'app-space-journey',
  templateUrl: './space-journey.component.html',
  styleUrls: ['./space-journey.component.scss'],
})
export class SpaceJourneyComponent implements AfterViewInit, OnDestroy {
  readonly planets: Planet[] = PLANETS;
  readonly wordmark = 'XOMWARE'.split('');

  @ViewChild('root', { static: true }) root!: ElementRef<HTMLElement>;
  @ViewChild('canvas', { static: true }) canvasRef!: ElementRef<HTMLCanvasElement>;
  @ViewChild('rail', { static: true }) rail!: ElementRef<HTMLElement>;
  @ViewChild('intro', { static: true }) intro!: ElementRef<HTMLElement>;
  @ViewChild('brief', { static: true }) brief!: ElementRef<HTMLElement>;
  @ViewChild('focus', { static: true }) focus!: ElementRef<HTMLElement>;
  @ViewChild('outro', { static: true }) outro!: ElementRef<HTMLElement>;
  @ViewChild('steps', { static: true }) steps!: ElementRef<HTMLElement>;
  @ViewChild('stepCount', { static: true }) stepCount!: ElementRef<HTMLElement>;
  @ViewChildren('planetEl') planetEls!: QueryList<ElementRef<HTMLElement>>;

  private starfield?: Starfield;
  private trigger?: ScrollTrigger;
  private timeline?: gsap.core.Timeline;
  private resizeObserver?: ResizeObserver;
  private visibility?: IntersectionObserver;
  private activeIndex = -1;
  /** Planet elements, captured once the view exists. */
  private els: HTMLElement[] = [];
  /** Measured planet positions; refreshed whenever ScrollTrigger re-measures. */
  private fractions: number[] = [];

  constructor(private zone: NgZone) {}

  ngAfterViewInit(): void {
    // Everything below runs on rAF at scroll rate. Keeping it out of the
    // Angular zone means no change-detection pass per frame; active-planet
    // state is applied as a class on the element instead of a binding.
    this.zone.runOutsideAngular(() => this.init());
  }

  ngOnDestroy(): void {
    this.timeline?.kill();
    // Kill only this component's trigger. LandingComponent tears down the
    // rest; killing ScrollTrigger.getAll() from here would take out the
    // landing's own reveal animations too.
    this.trigger?.kill();
    this.resizeObserver?.disconnect();
    this.visibility?.disconnect();
    this.starfield?.destroy();
  }

  /**
   * Scroll the pinned journey to a planet when it receives keyboard focus.
   *
   * Without this, tabbing moves focus to a planet that is still translated
   * off-screen: the browser cannot scroll a transformed element into view,
   * so the focus ring would vanish and keyboard users would be lost.
   */
  onPlanetFocus(index: number): void {
    const trigger = this.trigger;
    if (!trigger) return;

    const span = trigger.end - trigger.start;
    // Same measured fractions the highlight and the step controls use, so
    // focus lands the planet in the centre rather than merely somewhere near.
    const share = this.ensureFractions()[index] ?? 0;
    const target = trigger.start + span * (BRIEF_END + (TRAVEL_END - BRIEF_END) * share);

    // Deferred a frame because the browser runs its own "scroll the focused
    // element into view" *after* this handler. That native scroll can't do
    // anything sensible with an element inside a pinned, transformed rail, and
    // it was overriding this correction — leaving the focused planet far
    // off-screen. Running a frame later means ours is the one that sticks.
    //
    // Instant, not smooth: a focus jump should land immediately, and animating
    // it fights the scrub for control of the scroll position.
    requestAnimationFrame(() => {
      // `.journey` is overflow:hidden, which is still *programmatically*
      // scrollable — so the browser's focus-into-view shunts its scrollLeft to
      // chase a planet far along the rail. That shifts the whole scene
      // sideways while the rail transform stays put, which is why the focused
      // planet ended up ~1700px off centre. Put the container back; the scroll
      // position below is what actually brings the planet into view.
      const root = this.root.nativeElement;
      root.scrollLeft = 0;
      root.scrollTop = 0;

      window.scrollTo({ top: target, behavior: 'instant' as ScrollBehavior });
    });
  }

  /**
   * Step to the previous/next planet.
   *
   * Reuses the same measured fractions as the highlight and keyboard focus, so
   * "next" always lands the following planet dead centre rather than nudging
   * the scroll by a guessed amount.
   */
  jump(direction: 1 | -1): void {
    const count = this.planets.length;
    if (!count) return;

    // activeIndex is -1 until the first scroll frame; treat that as "before
    // the first planet" so a forward press from the intro goes to planet one.
    const from = this.activeIndex < 0 ? (direction > 0 ? -1 : 0) : this.activeIndex;
    const next = Math.min(Math.max(from + direction, 0), count - 1);
    this.scrollToPlanet(next);
  }

  /** Scroll so a given planet sits in the centre of the screen. */
  private scrollToPlanet(index: number): void {
    const trigger = this.trigger;
    if (!trigger) return;

    const span = trigger.end - trigger.start;
    const share = this.ensureFractions()[index] ?? 0;
    const target = trigger.start + span * (BRIEF_END + (TRAVEL_END - BRIEF_END) * share);
    window.scrollTo({ top: target, behavior: 'smooth' });
  }

  /** Jump past the flight to the page below. Not remembered — see above. */
  skip(): void {
    this.scrollPastPin('smooth');
  }

  private scrollPastPin(behavior: ScrollBehavior): void {
    // `trigger.end` is the scroll position where the pin releases, so this
    // lands exactly on the first grounded section with no gap or overlap.
    const end = this.trigger?.end;
    if (end == null) return;
    window.scrollTo({ top: end, behavior });
  }

  private init(): void {
    // staticScene freezes the shooting stars and asteroid tumble. Only the
    // visual-regression build sets it: a meteor that may or may not be in
    // flight when the screenshot lands would break the suite every other run.
    const field = new Starfield(this.canvasRef.nativeElement, {
      animateScene: !environment.staticScene,
    });
    this.starfield = field;
    field.resize();

    this.resizeObserver = new ResizeObserver(() => field.resize());
    this.resizeObserver.observe(this.canvasRef.nativeElement);

    // Only burn frames while the journey is actually on screen.
    this.visibility = new IntersectionObserver(
      ([entry]) => (entry.isIntersecting ? field.start() : field.stop()),
      { threshold: 0 },
    );
    this.visibility.observe(this.root.nativeElement);

    this.buildTimeline();
  }

  private buildTimeline(): void {
    const rail = this.rail.nativeElement;
    const els = this.planetEls.map((r) => r.nativeElement);
    this.els = els;

    const timeline = gsap.timeline({
      scrollTrigger: {
        trigger: this.root.nativeElement,
        start: 'top top',
        end: () => {
          const perPlanet =
            window.innerWidth <= 768 ? VH_PER_PLANET_NARROW : VH_PER_PLANET;
          return `+=${window.innerHeight * perPlanet * (this.planets.length + EXTRA_BEATS)}`;
        },
        pin: true,
        // Anticipates the pin on fast scrolls; without it the section can
        // visibly jump at high scroll velocity.
        anticipatePin: 1,
        scrub: 0.6,
        invalidateOnRefresh: true,
        // Re-measure alongside ScrollTrigger, so a resize or orientation
        // change doesn't leave the highlight pointing at the wrong planet.
        onRefresh: () => (this.fractions = this.centreFractions(els)),
        onUpdate: (self) => {
          this.starfield?.setProgress(self.progress);
          this.starfield?.setFormation(constellationStrength(self.progress));
          this.setActive(els, self.progress);
        },
      },
    });

    // Durations are explicit so the timeline is exactly 1.0 long. GSAP
    // positions are seconds, not progress: with the default 0.5s duration the
    // timeline ran to 1.36s, so the rail finished travelling by 45% of the
    // scroll and INTRO_END/TRAVEL_END no longer described where anything
    // actually was. At a total of 1.0, timeline time == scroll progress.
    timeline
      .to(
        this.intro.nativeElement,
        { opacity: 0, y: -60, ease: 'power2.in', duration: INTRO_END },
        0,
      )
      // The brief rises, holds while the reader takes it in, then clears
      // before the first planet arrives.
      .fromTo(
        this.brief.nativeElement,
        { opacity: 0, y: 40 },
        { opacity: 1, y: 0, ease: 'power2.out', duration: 0.05 },
        BRIEF_START,
      )
      .to(
        this.brief.nativeElement,
        { opacity: 0, y: -40, ease: 'power2.in', duration: 0.06 },
        BRIEF_END - 0.06,
      )
      .to(
        rail,
        {
          duration: TRAVEL_END - BRIEF_END,
          // Measured from the last planet rather than the rail's scrollWidth:
          // the planets are max-width capped, so the padding-to-width ratio
          // shifts with viewport size and a scrollWidth-based travel would
          // leave the final planet off-centre. Recomputed on refresh so a
          // resize or a late font swap re-measures.
          x: () => -this.railTravel(els),
          ease: 'none',
        },
        BRIEF_END,
      )
      // The step controls and the mobile readout both belong to the flight
      // only: there is nothing to step through, and nothing centred to report,
      // until the planets start moving.
      .fromTo(
        this.steps.nativeElement,
        { opacity: 0 },
        { opacity: 1, ease: 'none', duration: 0.03 },
        BRIEF_END,
      )
      .to(
        this.steps.nativeElement,
        { opacity: 0, ease: 'none', duration: 1 - TRAVEL_END },
        TRAVEL_END,
      )
      .fromTo(
        this.focus.nativeElement,
        { opacity: 0 },
        { opacity: 1, ease: 'none', duration: 0.03 },
        BRIEF_END,
      )
      .to(
        this.focus.nativeElement,
        { opacity: 0, ease: 'none', duration: 1 - TRAVEL_END },
        TRAVEL_END,
      )
      ;
    // Travel ends on the outro at TRAVEL_END and simply holds there for the
    // last stretch of the pin, so the closing card gets a beat to be read
    // before the page takes over. Nothing animates in that window on purpose.

    this.timeline = timeline;
    this.trigger = timeline.scrollTrigger;
  }

  /**
   * Distance the rail must travel for its last item to land dead centre.
   *
   * That item is the outro, not the last planet — the flight should come to
   * rest on the closing card rather than sailing past it.
   */
  private railTravel(els: HTMLElement[]): number {
    const last = this.outro?.nativeElement ?? els[els.length - 1];
    if (!last) return 0;
    const centre = last.offsetLeft + last.offsetWidth / 2;
    return Math.max(0, centre - window.innerWidth / 2);
  }

  /**
   * Fraction of the travel phase at which each planet is centred on screen.
   *
   * Not simply `i / (n - 1)`: the rail carries a full viewport of lead-in, so
   * the planets are not spread evenly across the travel. Deriving each one
   * from its measured position keeps the highlight, the ambient tint and
   * keyboard focus all landing on the planet actually in front of the camera.
   */
  private centreFractions(els: HTMLElement[]): number[] {
    const travel = this.railTravel(els);
    const half = window.innerWidth / 2;
    if (!travel) return els.map(() => 0);

    return els.map((el) => {
      const centre = el.offsetLeft + el.offsetWidth / 2;
      return Math.min(Math.max((centre - half) / travel, 0), 1);
    });
  }

  /**
   * Measured fractions, computing them on demand if `onRefresh` has not run.
   *
   * Snapping asked for these before the first refresh, got an empty list, and
   * so could only ever snap to 0 or 1 — which flung the journey to the intro
   * or the end of the flight instead of to a planet.
   */
  private ensureFractions(): number[] {
    if (!this.fractions.length && this.els.length) {
      this.fractions = this.centreFractions(this.els);
    }
    return this.fractions;
  }

  /**
   * Mark the planet nearest the centre of travel.
   *
   * Applied as a class and a CSS variable rather than through a binding —
   * this runs on every scrub frame, outside the Angular zone.
   */
  private setActive(els: HTMLElement[], progress: number): void {
    const span = TRAVEL_END - BRIEF_END;
    const t = Math.min(Math.max((progress - BRIEF_END) / span, 0), 1);

    const fractions = this.ensureFractions();
    let index = 0;
    let best = Infinity;
    for (let i = 0; i < fractions.length; i++) {
      const d = Math.abs(fractions[i] - t);
      if (d < best) {
        best = d;
        index = i;
      }
    }

    if (index === this.activeIndex) return;

    els[this.activeIndex]?.classList.remove('is-active');
    els[index]?.classList.add('is-active');
    this.activeIndex = index;

    const planet = this.planets[index];

    // Drives the ambient bloom so only the current planet tints the void.
    this.root.nativeElement.style.setProperty('--active-rgb', planet.colorRgb);
    this.root.nativeElement.style.setProperty('--active-color', planet.color);

    // Direct writes, not bindings — this runs outside the Angular zone.
    const focus = this.focus.nativeElement;
    const name = focus.querySelector('.focus__name');
    const description = focus.querySelector('.focus__description');
    if (name) name.textContent = planet.name;
    if (description) description.textContent = planet.description;

    this.stepCount.nativeElement.textContent = `${index + 1} / ${this.planets.length}`;
  }
}
