import { Component, OnDestroy, OnInit } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { Subscription } from 'rxjs';
import { environment } from '../../../environments/environment';
import { MusicDetailItem, MusicProfile, MusicRange } from '../../models/music.model';
import { MusicService } from '../../services/music.service';

type LoadState = 'loading' | 'loaded' | 'error';
export type MusicTab = 'now' | 'radar' | 'wrapped';

const VALID_TABS: MusicTab[] = ['now', 'radar', 'wrapped'];

interface RangeOption {
  label: string;
  value: MusicRange;
}

@Component({
  selector: 'app-music',
  templateUrl: './music.component.html',
  styleUrls: ['./music.component.scss'],
})
export class MusicComponent implements OnInit, OnDestroy {
  // ── Tab state ──────────────────────────────────────
  activeTab: MusicTab = 'now';
  /** Tracks which tabs have been activated at least once for lazy loading. */
  activatedTabs = new Set<MusicTab>(['now']);

  // ── Now tab: top-items data ────────────────────────
  state: LoadState = 'loading';
  profile: MusicProfile | null = null;
  errorMessage = '';

  // ── Detail modal ───────────────────────────────────
  detailItem: MusicDetailItem | null = null;

  // ── Time-range switcher ────────────────────────────
  selectedRange: MusicRange = 'short_term';
  rangeLoading = false;

  rangeOptions: RangeOption[] = [
    { label: 'Last 4 weeks', value: 'short_term' },
    { label: '6 months', value: 'medium_term' },
    { label: 'All time', value: 'long_term' },
  ];

  private sub?: Subscription;
  private querySub?: Subscription;

  constructor(
    private musicService: MusicService,
    private route: ActivatedRoute,
    private router: Router,
  ) {}

  ngOnInit(): void {
    // Read the active tab from the query param; fall back to 'now' for unknown values.
    this.querySub = this.route.queryParamMap.subscribe((params) => {
      const raw = params.get('tab') as MusicTab | null;
      const tab: MusicTab =
        raw && VALID_TABS.includes(raw) ? raw : 'now';
      this.activeTab = tab;
      this.activatedTabs.add(tab);
    });
    this.load();
  }

  ngOnDestroy(): void {
    this.sub?.unsubscribe();
    this.querySub?.unsubscribe();
  }

  // ── Tab navigation ─────────────────────────────────

  selectTab(tab: MusicTab): void {
    if (this.activeTab === tab) return;
    this.activeTab = tab;
    this.activatedTabs.add(tab);
    this.router.navigate([], {
      relativeTo: this.route,
      queryParams: { tab },
      queryParamsHandling: 'merge',
      replaceUrl: true,
    });
  }

  /** Roving tabindex — left/right arrow keys move between tabs. */
  onTabKeydown(event: KeyboardEvent): void {
    const tabs = VALID_TABS;
    const current = tabs.indexOf(this.activeTab);
    let next = current;

    if (event.key === 'ArrowRight') {
      next = (current + 1) % tabs.length;
    } else if (event.key === 'ArrowLeft') {
      next = (current - 1 + tabs.length) % tabs.length;
    } else if (event.key === 'Home') {
      next = 0;
    } else if (event.key === 'End') {
      next = tabs.length - 1;
    } else {
      return;
    }

    event.preventDefault();
    this.selectTab(tabs[next]);

    const tabEl = document.querySelector<HTMLButtonElement>(
      `[data-tab="${tabs[next]}"]`,
    );
    tabEl?.focus();
  }

  // ── Time-range switcher ────────────────────────────

  selectRange(range: MusicRange): void {
    if (this.selectedRange === range || this.rangeLoading) return;
    this.selectedRange = range;
    this.load(range);
  }

  // ── Now tab: data loading ──────────────────────────

  load(range: MusicRange = this.selectedRange): void {
    // First load: full loading state. Subsequent (range switch): inline rangeLoading.
    if (this.state !== 'loaded') {
      this.state = 'loading';
    } else {
      this.rangeLoading = true;
    }
    this.errorMessage = '';
    this.sub?.unsubscribe();
    this.sub = this.musicService
      .getPublicTopItems(environment.musicProfileUserId, range)
      .subscribe({
        next: (data) => {
          this.profile = data;
          this.state = 'loaded';
          this.rangeLoading = false;
        },
        error: () => {
          this.errorMessage =
            'Could not load listening stats. The backend may be unavailable.';
          this.state = 'error';
          this.rangeLoading = false;
        },
      });
  }

  // ── Detail modal ───────────────────────────────────

  openDetail(item: MusicDetailItem): void {
    this.detailItem = item;
  }

  /** Returns a human-readable relative time string for the given ISO date. */
  relativeTime(iso: string): string {
    const diffMs = Date.now() - new Date(iso).getTime();
    const diffMins = Math.floor(diffMs / 60_000);

    if (diffMins < 1) return 'just now';
    if (diffMins < 60) return `${diffMins}m ago`;

    const diffHours = Math.floor(diffMins / 60);
    if (diffHours < 24) return `${diffHours}h ago`;

    const diffDays = Math.floor(diffHours / 24);
    if (diffDays === 1) return '1 day ago';
    if (diffDays < 30) return `${diffDays} days ago`;

    const diffWeeks = Math.floor(diffDays / 7);
    if (diffWeeks === 1) return '1 week ago';
    if (diffWeeks < 8) return `${diffWeeks} weeks ago`;

    const diffMonths = Math.floor(diffDays / 30);
    if (diffMonths === 1) return '1 month ago';
    return `${diffMonths} months ago`;
  }
}
