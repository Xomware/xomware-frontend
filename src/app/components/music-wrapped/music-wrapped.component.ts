import { Component, OnDestroy, OnInit } from '@angular/core';
import { Subscription } from 'rxjs';
import { environment } from '../../../environments/environment';
import { MusicDetailItem, TopArtist, TopGenre, TopTrack } from '../../models/music.model';
import { WrappedArchive, WrappedMonth } from '../../models/wrapped.model';
import { WrappedService } from '../../services/wrapped.service';

type LoadState = 'loading' | 'loaded' | 'error' | 'coming-soon';

@Component({
  selector: 'app-music-wrapped',
  templateUrl: './music-wrapped.component.html',
  styleUrls: ['./music-wrapped.component.scss'],
})
export class MusicWrappedComponent implements OnInit, OnDestroy {
  state: LoadState = 'loading';
  archive: WrappedArchive | null = null;
  selectedMonthKey = '';
  errorMessage = '';

  // ── Detail modal ───────────────────────────────────
  detailItem: MusicDetailItem | null = null;

  private sub?: Subscription;

  constructor(private wrappedService: WrappedService) {}

  get selectedMonth(): WrappedMonth | null {
    if (!this.archive) return null;
    return (
      this.archive.months.find((m) => m.monthKey === this.selectedMonthKey) ??
      null
    );
  }

  ngOnInit(): void {
    if (environment.musicSurfaces.wrapped === 'coming-soon') {
      this.state = 'coming-soon';
      return;
    }
    this.load();
  }

  ngOnDestroy(): void {
    this.sub?.unsubscribe();
  }

  load(): void {
    this.state = 'loading';
    this.errorMessage = '';
    this.sub?.unsubscribe();
    this.sub = this.wrappedService
      .getPublicWrapped(environment.musicProfileUserId)
      .subscribe({
        next: (data) => {
          this.archive = data;
          // default to newest month
          if (data.months.length > 0) {
            this.selectedMonthKey = data.months[0].monthKey;
          }
          this.state = 'loaded';
        },
        error: () => {
          this.errorMessage =
            'Could not load wrapped archive. The backend may be unavailable.';
          this.state = 'error';
        },
      });
  }

  selectMonth(key: string): void {
    this.selectedMonthKey = key;
  }

  trackByMonthKey(_index: number, month: WrappedMonth): string {
    return month.monthKey;
  }

  trackByTrackUrl(_index: number, track: TopTrack): string {
    return track.url;
  }

  trackByArtistUrl(_index: number, artist: TopArtist): string {
    return artist.url;
  }

  trackByGenre(_index: number, genre: TopGenre): string {
    return genre.genre;
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
