import { Component, OnDestroy, AfterViewInit, HostListener, ElementRef, OnInit } from '@angular/core';
import { Router } from '@angular/router';
import { Subscription } from 'rxjs';
import { gsap } from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';
import { CognitoService, XomUser } from '../../services/cognito.service';
import { ProfileService } from '../../services/profile.service';
import { UserProfile } from '../../models/user.model';

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

interface ReportTarget {
  label: string;
  repo: string;
}

@Component({
  selector: 'app-landing',
  templateUrl: './landing.component.html',
  styleUrls: ['./landing.component.scss'],
})
export class LandingComponent implements AfterViewInit, OnDestroy, OnInit {
  isScrolled = false;
  menuOpen = false;
  reportMenuOpen = false;
  userMenuOpen = false;
  user: XomUser | null = null;
  profile: UserProfile | null = null;
  private userSub?: Subscription;
  private profileSub?: Subscription;

  constructor(
    private host: ElementRef<HTMLElement>,
    private cognito: CognitoService,
    private profileService: ProfileService,
    private router: Router,
  ) {}

  ngOnInit(): void {
    this.userSub = this.cognito.user$.subscribe((u) => (this.user = u));
    this.profileSub = this.profileService.profile$.subscribe(
      (p) => (this.profile = p),
    );
  }

  /** First letter of the displayName/handle for the coral fallback bubble. */
  get userInitial(): string {
    const source =
      this.profile?.displayName ??
      this.profile?.preferredUsername ??
      this.user?.preferredUsername ??
      this.profile?.email ??
      this.user?.username ??
      '?';
    return source.trim().charAt(0).toUpperCase() || '?';
  }

  /**
   * Label for the user menu trigger.
   *
   * Prefers `@handle` when a real preferredUsername is set, then displayName
   * (no @), then the email-local-part. Falls back to the raw Cognito
   * username only as a last resort — for federated users that's the ugly
   * `Google_102793155679...` form which no one wants on screen.
   */
  get userLabel(): string {
    const handle = this.profile?.preferredUsername || this.user?.preferredUsername;
    if (handle) return `@${handle}`;
    if (this.profile?.displayName) return this.profile.displayName;
    if (this.profile?.email) return this.profile.email.split('@')[0];
    return this.user?.username ?? '';
  }

  /** True when the signed-in user is in the Cognito `admin` group. */
  get isAdmin(): boolean {
    return (this.user?.groups ?? []).includes('admin');
  }

  toggleUserMenu(event: Event): void {
    event.stopPropagation();
    this.userMenuOpen = !this.userMenuOpen;
  }

  closeUserMenu(): void {
    this.userMenuOpen = false;
  }

  signOut(): void {
    this.cognito.signOut().subscribe(() => {
      this.userMenuOpen = false;
      this.router.navigateByUrl('/');
    });
  }

  reportTargets: ReportTarget[] = [
    { label: 'Xomify (Web)', repo: 'Xomware/xomify-frontend' },
    { label: 'Xomify (iOS)', repo: 'Xomware/xomify-ios' },
    { label: 'XomCloud', repo: 'Xomware/xomcloud-frontend' },
    { label: 'Xomper (Web)', repo: 'Xomware/xomper-front-end' },
    { label: 'Xomper (iOS)', repo: 'Xomware/xomper-ios' },
    { label: 'XomFit (iOS)', repo: 'Xomware/xomfit-ios' },
    { label: 'Float (iOS)', repo: 'Xomware/Float' },
    { label: 'Xom Appétit', repo: 'Xomware/xomappetit-frontend' },
    { label: 'xomware.com', repo: 'Xomware/xomware-frontend' },
  ];

  reportUrl(repo: string): string {
    return `https://github.com/${repo}/issues/new`;
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

  @HostListener('window:scroll')
  onScroll(): void {
    this.isScrolled = window.scrollY > 50;
  }

  @HostListener('document:click', ['$event'])
  onDocumentClick(event: MouseEvent): void {
    const target = event.target as Node | null;
    if (this.reportMenuOpen) {
      const wrapper = this.host.nativeElement.querySelector('.report-menu-wrapper');
      if (wrapper && target && !wrapper.contains(target)) {
        this.reportMenuOpen = false;
      }
    }
    if (this.userMenuOpen) {
      const userWrapper = this.host.nativeElement.querySelector('.user-menu-wrapper');
      if (userWrapper && target && !userWrapper.contains(target)) {
        this.userMenuOpen = false;
      }
    }
  }

  @HostListener('document:keydown.escape')
  onEscape(): void {
    this.reportMenuOpen = false;
    this.userMenuOpen = false;
  }

  toggleMenu(): void {
    this.menuOpen = !this.menuOpen;
  }

  closeMenu(): void {
    this.menuOpen = false;
  }

  toggleReportMenu(event: Event): void {
    event.stopPropagation();
    this.reportMenuOpen = !this.reportMenuOpen;
  }

  closeReportMenu(): void {
    this.reportMenuOpen = false;
  }

  ngAfterViewInit(): void {
    setTimeout(() => {
      this.initScrollAnimations();
    }, 100);
  }

  ngOnDestroy(): void {
    ScrollTrigger.getAll().forEach(t => t.kill());
    this.userSub?.unsubscribe();
    this.profileSub?.unsubscribe();
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

    // Refresh ScrollTrigger after all animations are set up
    ScrollTrigger.refresh();
  }
}
