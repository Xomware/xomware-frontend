import { Component, ElementRef, OnDestroy, AfterViewInit, OnInit, ViewChild } from '@angular/core';
import { BehaviorSubject, EMPTY, Subscription, interval, of } from 'rxjs';
import { switchMap, startWith, catchError, distinctUntilChanged } from 'rxjs/operators';
import { gsap } from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';
import { MusicService } from '../../services/music.service';
import { NowPlayingService } from '../../services/now-playing.service';
import { MusicProfile } from '../../models/music.model';
import { NowPlayingState } from '../../models/now-playing.model';
import { environment } from '../../../environments/environment';
import { AppCard, APPS } from '../../data/apps.data';
import { shouldPlayJourney } from '../space-journey/space-journey.component';

const IDLE_STATE: NowPlayingState = {
  isPlaying: false,
  track: null,
  progressMs: null,
  durationMs: null,
  source: 'none',
  playedAt: null,
};

gsap.registerPlugin(ScrollTrigger);

@Component({
  selector: 'app-landing',
  templateUrl: './landing.component.html',
  styleUrls: ['./landing.component.scss'],
})
export class LandingComponent implements AfterViewInit, OnDestroy, OnInit {
  /**
   * Whether to mount the cinematic intro. Read once, before the first render,
   * so the page never mounts the journey and then yanks it away.
   */
  readonly showJourney = shouldPlayJourney();

  landingTickerProfile: MusicProfile | null = null;
  nowPlayingState: NowPlayingState | null = null;

  /**
   * Public app directory — see src/app/data/apps.data.ts (shared with /apps).
   * Internal tools (`adminOnly`) are excluded; they surface in /admin only.
   */
  apps: AppCard[] = APPS.filter((a) => !a.adminOnly);

  private tickerSub?: Subscription;
  private nowPlayingSub?: Subscription;

  /**
   * Gates the now-playing poll. This page is public and the poll runs every
   * 25s forever, so left ungated a single forgotten background tab would keep
   * hitting the API indefinitely. Polling only runs while the music section is
   * actually on screen and the tab is visible.
   */
  private readonly pollActive$ = new BehaviorSubject<boolean>(false);
  private musicInView = false;
  private musicObserver?: IntersectionObserver;

  /**
   * The music section sits behind an *ngIf on the profile fetch, so it does
   * not exist at ngAfterViewInit. A setter picks it up whenever it appears.
   */
  @ViewChild('musicSection') set musicSection(ref: ElementRef<HTMLElement> | undefined) {
    this.musicObserver?.disconnect();
    if (!ref) {
      this.musicInView = false;
      this.syncPolling();
      return;
    }

    this.musicObserver = new IntersectionObserver(
      ([entry]) => {
        this.musicInView = entry.isIntersecting;
        this.syncPolling();
      },
      // Start a little before it scrolls in, so data is warm on arrival.
      { rootMargin: '400px' },
    );
    this.musicObserver.observe(ref.nativeElement);
  }

  constructor(
    private musicService: MusicService,
    private nowPlayingService: NowPlayingService,
  ) {}

  ngOnInit(): void {
    // Fetch top-items once for the ticker and snapshot module (short_term default).
    this.tickerSub = this.musicService
      .getPublicTopItems(environment.musicProfileUserId)
      .subscribe({
        next: (data) => (this.landingTickerProfile = data),
        error: () => {
          // Silently skip the ticker/snapshot if the fetch fails.
          this.landingTickerProfile = null;
        },
      });

    // Poll now-playing for the snapshot module (25s interval, same as /music),
    // but only while pollActive$ says it is worth doing.
    this.nowPlayingSub = this.pollActive$
      .pipe(
        distinctUntilChanged(),
        switchMap((active) => (active ? interval(25_000).pipe(startWith(0)) : EMPTY)),
        switchMap(() =>
          this.nowPlayingService
            .getNowPlaying(environment.musicProfileUserId)
            .pipe(catchError(() => of(IDLE_STATE))),
        ),
      )
      .subscribe((s) => (this.nowPlayingState = s));

    document.addEventListener('visibilitychange', this.onVisibilityChange);
  }

  private readonly onVisibilityChange = (): void => this.syncPolling();

  private syncPolling(): void {
    this.pollActive$.next(this.musicInView && document.visibilityState === 'visible');
  }

  /**
   * Mirrors MusicSnapshotComponent's own `hasData` guard.
   *
   * Gating the section on `landingTickerProfile` alone isn't enough: a
   * response that parses but carries no items is still truthy, which would
   * render a "What's playing" heading above an empty box.
   */
  get hasMusicData(): boolean {
    const p = this.landingTickerProfile;
    if (!p) return false;
    return !!(p.topTracks?.length || p.topArtists?.length || p.topGenres?.length);
  }

  get webApps(): AppCard[] {
    return this.apps.filter(a => a.platform === 'web');
  }

  /** Annual/seasonal event pools — grouped apart from ongoing products. */
  get poolApps(): AppCard[] {
    return this.apps.filter((a) => a.platform === 'pool');
  }

  get iosApps(): AppCard[] {
    return this.apps.filter(a => a.platform === 'ios');
  }

  ngAfterViewInit(): void {
    setTimeout(() => {
      this.initScrollAnimations();
    }, 100);
  }

  ngOnDestroy(): void {
    ScrollTrigger.getAll().forEach(t => t.kill());
    document.removeEventListener('visibilitychange', this.onVisibilityChange);
    this.musicObserver?.disconnect();
    this.tickerSub?.unsubscribe();
    this.nowPlayingSub?.unsubscribe();
  }

  private initScrollAnimations(): void {
    // Hero fade out on scroll
    gsap.to('.hero-content', {
      scrollTrigger: {
        trigger: '.hero',
        start: 'top top',
        end: 'bottom top',
        scrub: 0.5,
      },
      opacity: 0,
      y: -50,
    });

    // Section headers slide in
    gsap.utils.toArray('.section-header').forEach((header: unknown) => {
      gsap.from(header as gsap.TweenTarget, {
        scrollTrigger: {
          trigger: header as Element,
          start: 'top 85%',
          toggleActions: 'play none none reverse',
        },
        opacity: 0,
        y: 40,
        duration: 0.8,
        ease: 'power3.out',
      });
    });

    // App cards stagger in — one trigger per grid so each fires as it enters viewport
    const containers = gsap.utils.toArray<Element>('.cards-container');
    containers.forEach((container) => {
      const gridCards = gsap.utils.toArray<Element>('.app-card', container);
      if (gridCards.length) {
        gsap.set(gridCards, { opacity: 0, y: 60 });
        gsap.to(gridCards, {
          scrollTrigger: {
            trigger: container,
            start: 'top 85%',
            toggleActions: 'play none none none',
          },
          opacity: 1,
          y: 0,
          stagger: 0.1,
          duration: 0.7,
          ease: 'power3.out',
        });
      }
    });

    // Footer slide in
    gsap.from('.footer-inner', {
      scrollTrigger: {
        trigger: '.footer',
        start: 'top 90%',
        toggleActions: 'play none none reverse',
      },
      opacity: 0,
      y: 30,
      duration: 0.6,
      ease: 'power2.out',
    });

    ScrollTrigger.refresh();
  }
}
