import { Component, OnDestroy, OnInit } from '@angular/core';
import { Subscription } from 'rxjs';
import { environment } from '../../../environments/environment';
import { ShareCard } from '../../models/xomtracks-showcase.model';
import { XomtracksShowcaseService } from '../../services/xomtracks-showcase.service';

type LoadState = 'loading' | 'loaded' | 'error' | 'coming-soon';

interface PlaylistLink {
  label: string;
  url: string;
}

const PLATFORM_LABELS: Record<string, string> = {
  spotify: 'Spotify',
  soundcloud: 'SoundCloud',
  apple: 'Apple Music',
};

@Component({
  selector: 'app-music-xomtracks',
  templateUrl: './music-xomtracks.component.html',
  styleUrls: ['./music-xomtracks.component.scss'],
})
export class MusicXomtracksComponent implements OnInit, OnDestroy {
  state: LoadState = 'loading';
  sharedWithMe: ShareCard[] = [];
  sharedByMe: ShareCard[] = [];
  errorMessage = '';

  readonly xomifyUrl = environment.xomifyWebUrl;
  // Deep-links straight to the Xomtracks feature inside xomify (the full,
  // sortable feed + ratings), not just the xomify app root.
  readonly xomtracksFeatureUrl = `${environment.xomifyWebUrl}/xomtracks`;
  readonly playlists: PlaylistLink[] = [
    { label: 'Shared With Me — Rolling Playlist', url: environment.xomtracksPlaylists.in },
    { label: 'Shared By Me — Rolling Playlist', url: environment.xomtracksPlaylists.out },
  ];

  private sub?: Subscription;

  constructor(private showcaseService: XomtracksShowcaseService) {}

  ngOnInit(): void {
    if (environment.musicSurfaces.xomtracks === 'coming-soon') {
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
    this.sub = this.showcaseService.getRecentShares(5).subscribe({
      next: (data) => {
        this.sharedWithMe = data.sharedWithMe;
        this.sharedByMe = data.sharedByMe;
        this.state = 'loaded';
      },
      error: () => {
        this.errorMessage =
          'Could not load the Xomtracks showcase. The backend may be unavailable.';
        this.state = 'error';
      },
    });
  }

  trackByShare(index: number, share: ShareCard): string {
    return `${share.direction}-${share.date}-${index}`;
  }

  displayTitle(share: ShareCard): string {
    return share.title?.trim() || 'Untitled track';
  }

  displayArtist(share: ShareCard): string {
    return share.artist?.trim() || 'Unknown artist';
  }

  /** Outbound shares carry no sharer name/handle — the hub renders that as "You". */
  displaySharer(share: ShareCard): string {
    if (share.direction === 'out') return 'You';
    return share.sharer?.trim() || 'Someone';
  }

  platformLabel(platform: string): string {
    return PLATFORM_LABELS[platform] ?? platform;
  }

  /** Returns a human-readable relative time string for an epoch-seconds date. */
  relativeTime(epochSeconds: number): string {
    if (!epochSeconds) return '';
    const diffMs = Date.now() - epochSeconds * 1000;
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
