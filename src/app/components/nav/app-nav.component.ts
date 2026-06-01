import {
  Component,
  ElementRef,
  HostListener,
  OnDestroy,
  OnInit,
} from '@angular/core';
import { Router } from '@angular/router';
import { Subscription } from 'rxjs';
import { CognitoService, XomUser } from '../../services/cognito.service';
import { ProfileService } from '../../services/profile.service';
import { UserProfile } from '../../models/user.model';

interface ReportTarget {
  label: string;
  repo: string;
}

@Component({
  selector: 'app-nav',
  templateUrl: './app-nav.component.html',
  styleUrls: ['./app-nav.component.scss'],
})
export class AppNavComponent implements OnInit, OnDestroy {
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
    // Seed scroll state in case the component mounts after the user has scrolled.
    this.isScrolled = window.scrollY > 50;
  }

  ngOnDestroy(): void {
    this.userSub?.unsubscribe();
    this.profileSub?.unsubscribe();
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
   * Prefers @handle, then displayName, then email-local-part, then username.
   */
  get userLabel(): string {
    const handle =
      this.profile?.preferredUsername || this.user?.preferredUsername;
    if (handle) return `@${handle}`;
    if (this.profile?.displayName) return this.profile.displayName;
    if (this.profile?.email) return this.profile.email.split('@')[0];
    return this.user?.username ?? '';
  }

  /** True when the signed-in user is in the Cognito `admin` group. */
  get isAdmin(): boolean {
    return (this.user?.groups ?? []).includes('admin');
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

  @HostListener('window:scroll')
  onScroll(): void {
    this.isScrolled = window.scrollY > 50;
  }

  @HostListener('document:click', ['$event'])
  onDocumentClick(event: MouseEvent): void {
    const target = event.target as Node | null;
    if (this.reportMenuOpen) {
      const wrapper = this.host.nativeElement.querySelector(
        '.report-menu-wrapper',
      );
      if (wrapper && target && !wrapper.contains(target)) {
        this.reportMenuOpen = false;
      }
    }
    if (this.userMenuOpen) {
      const userWrapper =
        this.host.nativeElement.querySelector('.user-menu-wrapper');
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
}
