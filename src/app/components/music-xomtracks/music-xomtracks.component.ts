import { Component, OnDestroy, OnInit } from '@angular/core';
import { Subscription } from 'rxjs';
import { environment } from '../../../environments/environment';
import { ShareCard } from '../../models/xomtracks-showcase.model';
import { XomtracksShowcaseService } from '../../services/xomtracks-showcase.service';

type LoadState = 'loading' | 'loaded' | 'error' | 'coming-soon';

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
  // Deep-links straight to the Xomtracks (Shares) feature inside xomify (the
  // full, sortable feed + ratings), not just the xomify app root. The route
  // itself was renamed from /xomtracks to /shares; xomify still redirects
  // the old path, but point at the canonical one here.
  readonly xomtracksFeatureUrl = `${environment.xomifyWebUrl}/shares`;
  // Fixed rolling playlists that back each column — not surfaced via the
  // API, so linked directly. Same two playlists as the pill buttons this
  // component used to render before they were dropped for being unneeded
  // chrome; these are the subtle-link replacement.
  readonly sharedWithMePlaylistUrl = 'https://open.spotify.com/playlist/1EovEoa2MJO7tX4qPEvnsr';
  readonly sharedByMePlaylistUrl = 'https://open.spotify.com/playlist/12rO1QHPLvJ4L3Gehi7PPX';

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
          'Could not load the Shares showcase. The backend may be unavailable.';
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

  /**
   * Resolves the URL a share's title should link out to, or `null` if we
   * don't have enough to build one (renders as plain text in that case).
   * `/shares/recent` doesn't return a direct track URL as of writing —
   * this prefers an explicit `url`/`sourceUrl` from the payload the moment
   * the backend adds one, and falls back to deriving an open.spotify.com
   * link from a Spotify track id if the platform is Spotify.
   */
  shareUrl(share: ShareCard): string | null {
    if (share.url) return share.url;
    if (share.sourceUrl) return share.sourceUrl;
    if (share.platform === 'spotify' && share.spotifyId) {
      return `https://open.spotify.com/track/${share.spotifyId}`;
    }
    return null;
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
