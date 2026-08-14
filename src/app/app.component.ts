import { Component, HostListener, OnDestroy, OnInit } from '@angular/core';
import { NavigationEnd, Router } from '@angular/router';
import { Subscription, combineLatest, filter } from 'rxjs';
import { CognitoService } from './services/cognito.service';
import { AnalyticsService } from './services/analytics.service';
import { ActivityService } from './services/activity.service';
import { APPS } from './data/apps.data';

@Component({
  selector: 'app-root',
  template: '<router-outlet></router-outlet>',
  styles: [':host { display: block; }'],
})
export class AppComponent implements OnInit, OnDestroy {
  private sub?: Subscription;
  private navSub?: Subscription;

  constructor(
    private cognito: CognitoService,
    private analytics: AnalyticsService,
    private activity: ActivityService,
    private router: Router,
  ) {}

  ngOnInit(): void {
    // Gated on isReady$, not user$ alone: user$ is a BehaviorSubject seeded
    // with null and the session check resolves asynchronously, so an ungated
    // subscription reports every signed-in visitor as anonymous until Amplify
    // catches up. Which ingest endpoint the activity log uses depends on this.
    this.sub = combineLatest([this.cognito.isReady$, this.cognito.user$])
      .pipe(filter(([ready]) => ready))
      .subscribe(([, user]) => {
        if (user) {
          this.analytics.identify(user.userId);
        }
        this.activity.registerAuth(!!user, () => this.cognito.getJwt());
      });

    this.navSub = this.router.events
      .pipe(filter((e): e is NavigationEnd => e instanceof NavigationEnd))
      .subscribe((e) => this.activity.trackPageview(e.urlAfterRedirects));
  }

  /**
   * Outbound clicks are caught here rather than with a handler per link. The
   * app URLs appear in at least four templates (the landing planets, the
   * /apps grid, the orbit body and its CTA), so per-link handlers would be
   * repetitive to add and easy to forget on the next surface. One delegated
   * listener matching against APPS covers every current and future link.
   */
  @HostListener('document:click', ['$event'])
  onDocumentClick(event: MouseEvent): void {
    const anchor = (event.target as HTMLElement | null)?.closest?.('a[href]');
    if (!anchor) return;

    const href = anchor.getAttribute('href') ?? '';
    if (!href.startsWith('http')) return;

    const app = APPS.find((a) => a.url === href);
    if (app) {
      this.activity.trackOutbound(app.name, href);
    }
  }

  ngOnDestroy(): void {
    this.sub?.unsubscribe();
    this.navSub?.unsubscribe();
  }
}
