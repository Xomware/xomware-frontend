import { Component, Input } from '@angular/core';
import { MusicProfile, TopArtist, TopGenre, TopTrack } from '../../models/music.model';
import { NowPlayingState } from '../../models/now-playing.model';

/**
 * Compact music snapshot module for the landing page.
 *
 * Shows:
 *  - Now-playing / last-played card (via `nowPlayingState` input, fed from
 *    the parent's NowPlayingComponent data — no extra polling here)
 *  - Top 3 tracks, top 3 artists, top 3 genres (compact pills/rows)
 *  - "View music" CTA → /music
 *
 * Degrades gracefully: each sub-section only renders when its data exists.
 */
@Component({
  selector: 'app-music-snapshot',
  templateUrl: './music-snapshot.component.html',
  styleUrls: ['./music-snapshot.component.scss'],
})
export class MusicSnapshotComponent {
  /** Short-term MusicProfile from the landing's existing MusicService fetch. */
  @Input() profile: MusicProfile | null = null;

  /** Current now-playing state — passed in from the parent which already polls it. */
  @Input() nowPlayingState: NowPlayingState | null = null;

  /** Top 3 of each, clamped at the component level. */
  get topTracks(): TopTrack[] {
    return (this.profile?.topTracks ?? []).slice(0, 3);
  }

  get topArtists(): TopArtist[] {
    return (this.profile?.topArtists ?? []).slice(0, 3);
  }

  get topGenres(): TopGenre[] {
    return (this.profile?.topGenres ?? []).slice(0, 3);
  }

  get hasData(): boolean {
    return this.profile !== null && (
      this.topTracks.length > 0 ||
      this.topArtists.length > 0 ||
      this.topGenres.length > 0
    );
  }

  get isPlaying(): boolean {
    return this.nowPlayingState?.source === 'playing' && !!this.nowPlayingState?.track;
  }

  get isRecent(): boolean {
    return this.nowPlayingState?.source === 'recent' && !!this.nowPlayingState?.track;
  }

  /** Human-readable relative time from an ISO string. */
  relativeTime(iso: string): string {
    const diffMs = Date.now() - new Date(iso).getTime();
    const diffMins = Math.floor(diffMs / 60_000);

    if (diffMins < 1) return 'just now';
    if (diffMins < 60) return `${diffMins}m ago`;

    const diffHours = Math.floor(diffMins / 60);
    if (diffHours < 24) return `${diffHours}h ago`;

    const diffDays = Math.floor(diffHours / 24);
    if (diffDays === 1) return '1 day ago';
    return `${diffDays} days ago`;
  }
}
