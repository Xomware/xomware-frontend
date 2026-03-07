import { Component, OnDestroy, AfterViewInit, HostListener } from '@angular/core';
import { gsap } from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';

gsap.registerPlugin(ScrollTrigger);

interface AppCard {
  name: string;
  description: string;
  color: string;
  colorRgb: string;
  url: string;
  monsterState: string;
  logo: string;
  tag: string;
}

@Component({
  selector: 'app-landing',
  templateUrl: './landing.component.html',
  styleUrls: ['./landing.component.scss'],
})
export class LandingComponent implements AfterViewInit, OnDestroy {
  monsterState = 'idle';
  isMobile = false;
  isScrolled = false;

  private idleTimer: any;
  private mobileTimer: any;
  private readonly SLEEP_DELAY = 12000;
  private readonly MOBILE_CYCLE_MIN = 4000;
  private readonly MOBILE_CYCLE_MAX = 8000;
  private readonly mobileStates = ['idle', 'wave', 'headphones', 'dj', 'football', 'idle', 'idle'];

  apps: AppCard[] = [
    {
      name: 'Xomify',
      description: 'Your Spotify stats, wrapped your way. Top songs, artists, genres & more.',
      color: '#9c0abf',
      colorRgb: '156, 10, 191',
      url: 'https://xomify.xomware.com',
      monsterState: 'headphones',
      logo: 'assets/img/xomify-logo.png',
      tag: 'Web App',
    },
    {
      name: 'XomCloud',
      description: 'Your SoundCloud library, organized. Discover and manage your music collection.',
      color: '#ff6b35',
      colorRgb: '255, 107, 53',
      url: 'https://xomcloud.xomware.com',
      monsterState: 'dj',
      logo: 'assets/img/xomcloud-logo.png',
      tag: 'Web App',
    },
    {
      name: 'Xomper',
      description: 'Fantasy football analytics. Track your dynasty league, players & matchups.',
      color: '#00ffab',
      colorRgb: '0, 255, 171',
      url: 'https://xomper.xomware.com',
      monsterState: 'football',
      logo: 'assets/img/xomper-logo.jpg',
      tag: 'Web App',
    },
    {
      name: 'Meals',
      description: 'Track what you eat, rate your meals, and build better habits with AI insights.',
      color: '#ff6b6b',
      colorRgb: '255, 107, 107',
      url: 'https://meals.xomware.com',
      monsterState: 'idle',
      logo: 'assets/img/xomware-icon-transparent-background.png',
      tag: 'Web App',
    },
    {
      name: 'XomFit',
      description: 'Social fitness & lifting tracker. Challenge friends, follow AI workout plans.',
      color: '#34C759',
      colorRgb: '52, 199, 89',
      url: 'https://xomfit.xomware.com',
      monsterState: 'idle',
      logo: 'assets/img/xomfit-placeholder.svg',
      tag: 'iOS · Coming Soon',
    },
  ];

  @HostListener('window:scroll')
  onScroll(): void {
    this.isScrolled = window.scrollY > 50;
  }

  ngAfterViewInit(): void {
    setTimeout(() => {
      this.checkMobile();
      if (this.isMobile) {
        this.startMobileCycle();
      } else {
        this.resetIdleTimer();
      }
      this.initScrollAnimations();
    }, 100);
  }

  ngOnDestroy(): void {
    clearTimeout(this.idleTimer);
    clearTimeout(this.mobileTimer);
    ScrollTrigger.getAll().forEach(t => t.kill());
  }

  @HostListener('window:resize')
  onResize(): void {
    const wasMobile = this.isMobile;
    this.checkMobile();
    if (this.isMobile && !wasMobile) {
      this.startMobileCycle();
    } else if (!this.isMobile && wasMobile) {
      clearTimeout(this.mobileTimer);
      this.monsterState = 'idle';
      this.resetIdleTimer();
    }
  }

  onCardHover(state: string): void {
    if (this.isMobile) return;
    this.monsterState = state;
    this.resetIdleTimer();
  }

  onCardLeave(): void {
    if (this.isMobile) return;
    this.monsterState = 'idle';
    this.resetIdleTimer();
  }

  onPageInteraction(): void {
    if (this.isMobile) return;
    if (this.monsterState === 'sleep') {
      this.monsterState = 'idle';
    }
    this.resetIdleTimer();
  }

  private initScrollAnimations(): void {
    // Hero fade out on scroll
    gsap.to('.hero-content', {
      scrollTrigger: {
        trigger: '.hero',
        start: 'top top',
        end: 'bottom top',
        scrub: true,
      },
      opacity: 0,
      y: -50,
    });

    // Section headers slide in
    gsap.utils.toArray('.section-header').forEach((header: any) => {
      gsap.from(header, {
        scrollTrigger: {
          trigger: header,
          start: 'top 85%',
          toggleActions: 'play none none reverse',
        },
        opacity: 0,
        y: 40,
        duration: 0.8,
        ease: 'power3.out',
      });
    });

    // App cards stagger in
    gsap.from('.app-card', {
      scrollTrigger: {
        trigger: '.cards-container',
        start: 'top 80%',
        toggleActions: 'play none none reverse',
      },
      opacity: 0,
      y: 60,
      stagger: 0.1,
      duration: 0.7,
      ease: 'power3.out',
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
  }

  private checkMobile(): void {
    const isTouch = 'ontouchstart' in window || navigator.maxTouchPoints > 0;
    const isSmallScreen = window.innerWidth <= 1024;
    this.isMobile = isTouch && isSmallScreen;
  }

  private resetIdleTimer(): void {
    clearTimeout(this.idleTimer);
    this.idleTimer = setTimeout(() => {
      if (this.monsterState === 'idle' && !this.isMobile) {
        this.monsterState = 'sleep';
      }
    }, this.SLEEP_DELAY);
  }

  private startMobileCycle(): void {
    const cycle = () => {
      if (!this.isMobile) return;
      const randomState = this.mobileStates[Math.floor(Math.random() * this.mobileStates.length)];
      this.monsterState = randomState;
      const delay = this.MOBILE_CYCLE_MIN + Math.random() * (this.MOBILE_CYCLE_MAX - this.MOBILE_CYCLE_MIN);
      this.mobileTimer = setTimeout(cycle, delay);
    };
    const initialDelay = 2000 + Math.random() * 3000;
    this.mobileTimer = setTimeout(cycle, initialDelay);
  }
}
