import { Component, OnDestroy, AfterViewInit, OnInit } from '@angular/core';
import { Subscription } from 'rxjs';
import { gsap } from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';
import { CognitoService, XomUser } from '../../services/cognito.service';
import { MusicService } from '../../services/music.service';
import { MusicProfile } from '../../models/music.model';
import { environment } from '../../../environments/environment';

gsap.registerPlugin(ScrollTrigger);

interface AppCard {
  name: string;
  description: string;
  color: string;
  colorRgb: string;
  url: string;
  logo: string;
  tag: string;
  status: 'live' | 'coming-soon';
  platform: 'web' | 'ios';
}

@Component({
  selector: 'app-landing',
  templateUrl: './landing.component.html',
  styleUrls: ['./landing.component.scss'],
})
export class LandingComponent implements AfterViewInit, OnDestroy, OnInit {
  user: XomUser | null = null;
  landingTickerProfile: MusicProfile | null = null;

  private userSub?: Subscription;
  private tickerSub?: Subscription;

  constructor(
    private cognito: CognitoService,
    private musicService: MusicService,
  ) {}

  ngOnInit(): void {
    this.userSub = this.cognito.user$.subscribe((u) => (this.user = u));
    // Fetch top-items once for the landing ticker (short_term default).
    this.tickerSub = this.musicService
      .getPublicTopItems(environment.musicProfileUserId)
      .subscribe({
        next: (data) => (this.landingTickerProfile = data),
        error: () => {
          // Silently skip the ticker if the fetch fails — don't break landing.
          this.landingTickerProfile = null;
        },
      });
  }

  apps: AppCard[] = [
    {
      name: 'Xomify',
      description: 'Your Spotify stats, wrapped your way. Top songs, artists, genres & more.',
      color: '#9c0abf',
      colorRgb: '156, 10, 191',
      url: 'https://xomify.xomware.com',
      logo: 'assets/img/xomify-logo.png',
      tag: 'Web App',
      status: 'live',
      platform: 'web',
    },
    {
      name: 'XomCloud',
      description: 'Your SoundCloud library, organized. Discover and manage your music collection.',
      color: '#ff6b35',
      colorRgb: '255, 107, 53',
      url: 'https://xomcloud.xomware.com',
      logo: 'assets/img/xomcloud-logo.png',
      tag: 'Web App',
      status: 'live',
      platform: 'web',
    },
    {
      name: 'Xomper',
      description: 'Fantasy football analytics. Track your dynasty league, players & matchups.',
      color: '#00ffab',
      colorRgb: '0, 255, 171',
      url: 'https://xomper.xomware.com',
      logo: 'assets/img/xomper-logo.jpg',
      tag: 'Web App',
      status: 'live',
      platform: 'web',
    },
    {
      name: 'Sun God Derby',
      description: "Grant's annual Kentucky Derby pool. Tail or fade his picks, climb the leaderboard.",
      color: '#C8102E',
      colorRgb: '200, 16, 46',
      url: 'https://derby.xomware.com',
      logo: 'assets/img/sun-god-derby-banner.png',
      tag: 'Web App',
      status: 'live',
      platform: 'web',
    },
    {
      name: 'Xom Appétit',
      description: 'Home-cooking tracker with recipes, ingredients & macros. Rated by three loud chefs.',
      color: '#ff6b6b',
      colorRgb: '255, 107, 107',
      url: 'https://xomappetit.xomware.com',
      logo: 'assets/img/xomappetit-banner.png',
      tag: 'Web App',
      status: 'live',
      platform: 'web',
    },
    {
      name: 'Xomify',
      description: 'Your Spotify stats on iOS. Native app available on TestFlight.',
      color: '#9c0abf',
      colorRgb: '156, 10, 191',
      url: 'https://testflight.apple.com/join/5CQaJ2mB',
      logo: 'assets/img/xomify-logo.png',
      tag: 'iOS · TestFlight',
      status: 'live',
      platform: 'ios',
    },
    {
      name: 'Xomper',
      description: 'Fantasy football analytics on iOS. Native app coming soon.',
      color: '#00ffab',
      colorRgb: '0, 255, 171',
      url: 'https://xomper.xomware.com',
      logo: 'assets/img/xomper-logo.jpg',
      tag: 'iOS · Coming Soon',
      status: 'coming-soon',
      platform: 'ios',
    },
    {
      name: 'XomFit',
      description: 'Social fitness & lifting tracker. Challenge friends, follow AI workout plans.',
      color: '#34C759',
      colorRgb: '52, 199, 89',
      url: 'https://testflight.apple.com/join/xttcUQwT',
      logo: 'assets/img/xomfit-banner.png',
      tag: 'iOS · TestFlight',
      status: 'live',
      platform: 'ios',
    },
    {
      name: 'Float',
      description: 'Real-time deals for bars & restaurants. Live happy hours near you.',
      color: '#FFB800',
      colorRgb: '255, 184, 0',
      url: 'https://float.xomware.com',
      logo: 'assets/img/float-placeholder.svg',
      tag: 'iOS · Coming Soon',
      status: 'coming-soon',
      platform: 'ios',
    },
  ];

  get webApps(): AppCard[] {
    return this.apps.filter(a => a.platform === 'web');
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
