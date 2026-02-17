import { Component, OnDestroy, AfterViewInit, HostListener } from '@angular/core';

interface AppCard {
  name: string;
  description: string;
  color: string;
  url: string;
  monsterState: string;
  logo: string;
}

@Component({
  selector: 'app-root',
  templateUrl: './app.component.html',
  styleUrls: ['./app.component.scss'],
})
export class AppComponent implements AfterViewInit, OnDestroy {
  monsterState = 'idle';
  isMobile = false;

  private idleTimer: any;
  private mobileTimer: any;
  private readonly SLEEP_DELAY = 12000;
  private readonly MOBILE_CYCLE_MIN = 4000;
  private readonly MOBILE_CYCLE_MAX = 8000;
  private readonly mobileStates = ['idle', 'wave', 'headphones', 'dj', 'football', 'idle', 'idle'];

  apps: AppCard[] = [
    {
      name: 'xomify',
      description: 'Your Spotify stats, wrapped your way. Top songs, artists, genres & more.',
      color: '#9c0abf',
      url: 'https://xomify.xomware.com',
      monsterState: 'headphones',
      logo: 'assets/img/xomify-logo.png',
    },
    {
      name: 'xomcloud',
      description: 'Your SoundCloud library, organized. Discover and manage your music collection.',
      color: '#ff6b35',
      url: 'https://xomcloud.xomware.com',
      monsterState: 'dj',
      logo: 'assets/img/xomcloud-logo.png',
    },
    {
      name: 'xomper',
      description: 'Fantasy football analytics. Track your dynasty league, players & matchups.',
      color: '#00ffab',
      url: 'https://xomper.xomware.com',
      monsterState: 'football',
      logo: 'assets/img/xomper-logo.jpg',
    },
  ];

  ngAfterViewInit(): void {
    // Delay slightly to ensure viewport is fully measured (iOS Safari)
    setTimeout(() => {
      this.checkMobile();
      if (this.isMobile) {
        this.startMobileCycle();
      } else {
        this.resetIdleTimer();
      }
    }, 100);
  }

  ngOnDestroy(): void {
    clearTimeout(this.idleTimer);
    clearTimeout(this.mobileTimer);
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
