import { Component, OnDestroy, AfterViewInit, OnInit } from '@angular/core';
import { Subscription, interval, of } from 'rxjs';
import { switchMap, startWith, catchError } from 'rxjs/operators';
import { gsap } from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';
import { CognitoService, XomUser } from '../../services/cognito.service';
import { MusicService } from '../../services/music.service';
import { NowPlayingService } from '../../services/now-playing.service';
import { MusicProfile } from '../../models/music.model';
import { NowPlayingState } from '../../models/now-playing.model';
import { environment } from '../../../environments/environment';
import { AppCard, APPS } from '../../data/apps.data';

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
  user: XomUser | null = null;
  landingTickerProfile: MusicProfile | null = null;
  nowPlayingState: NowPlayingState | null = null;

  /**
   * Public app directory — see src/app/data/apps.data.ts (shared with /apps).
   * Internal tools (`adminOnly`) are excluded; they surface in /admin only.
   */
  apps: AppCard[] = APPS.filter((a) => !a.adminOnly);

  private userSub?: Subscription;
  private tickerSub?: Subscription;
  private nowPlayingSub?: Subscription;

  constructor(
    private cognito: CognitoService,
    private musicService: MusicService,
    private nowPlayingService: NowPlayingService,
  ) {}

  ngOnInit(): void {
    this.userSub = this.cognito.user$.subscribe((u) => (this.user = u));

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

    // Poll now-playing for the snapshot module (25s interval, same as /music).
    this.nowPlayingSub = interval(25_000)
      .pipe(
        startWith(0),
        switchMap(() =>
          this.nowPlayingService
            .getNowPlaying(environment.musicProfileUserId)
            .pipe(catchError(() => of(IDLE_STATE))),
        ),
      )
      .subscribe((s) => (this.nowPlayingState = s));
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
    this.userSub?.unsubscribe();
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
