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
  logo: string;
  tag: string;
  status: 'live' | 'coming-soon';
}

@Component({
  selector: 'app-landing',
  templateUrl: './landing.component.html',
  styleUrls: ['./landing.component.scss'],
})
export class LandingComponent implements AfterViewInit, OnDestroy {
  isScrolled = false;
  menuOpen = false;

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
    },
    {
      name: 'Hornets SE Champs',
      description: 'Hornets SE Division Win Bet Tracker',
      color: '#00788C',
      colorRgb: '0, 120, 140',
      url: 'https://hornets-southeast-champs.xomware.com',
      logo: 'assets/img/hornets-placeholder.svg',
      tag: 'Web App',
      status: 'live',
    },
    {
      name: 'XomFit',
      description: 'Social fitness & lifting tracker. Challenge friends, follow AI workout plans.',
      color: '#34C759',
      colorRgb: '52, 199, 89',
      url: 'https://xomfit.xomware.com',
      logo: 'assets/img/xomfit-placeholder.svg',
      tag: 'iOS · Coming Soon',
      status: 'coming-soon',
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
    },
  ];

  @HostListener('window:scroll')
  onScroll(): void {
    this.isScrolled = window.scrollY > 50;
  }

  toggleMenu(): void {
    this.menuOpen = !this.menuOpen;
  }

  closeMenu(): void {
    this.menuOpen = false;
  }

  ngAfterViewInit(): void {
    setTimeout(() => {
      this.initScrollAnimations();
    }, 100);
  }

  ngOnDestroy(): void {
    ScrollTrigger.getAll().forEach(t => t.kill());
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

    // Refresh ScrollTrigger after all animations are set up
    ScrollTrigger.refresh();
  }
}
