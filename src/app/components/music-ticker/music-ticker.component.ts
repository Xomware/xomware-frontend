import { Component, Input } from '@angular/core';
import { MusicProfile, NowPlaying, TopArtist, TopTrack, TopGenre } from '../../models/music.model';

/** A playable track or artist item in the marquee. */
interface TickerTrackItem {
  kind: 'item';
  label: string;
  sub: string;
  imageUrl: string;
  url: string;
  type: 'track' | 'artist' | 'genre';
}

/** A category label divider (e.g. "TOP TRACKS") shown before each group. */
interface TickerDividerItem {
  kind: 'divider';
  label: string;
  timeframe: string;
}

/** The "Powered by Xomify" badge shown at each group boundary. */
interface TickerBadgeItem {
  kind: 'badge';
}

export type TickerSegment = TickerTrackItem | TickerDividerItem | TickerBadgeItem;

const XOMIFY_URL = 'https://xomify.xomware.com';
const XOMIFY_LOGO = 'assets/img/xomify-logo.png';

/**
 * Pure-CSS marquee that scrolls top tracks, artists, and genres as labeled
 * groups with category dividers and "Powered by Xomify" badges at each
 * group boundary.
 *
 * Usage:
 *   <app-music-ticker [profile]="musicProfile" [nowPlaying]="null"></app-music-ticker>
 *
 * No GSAP — animation is driven by CSS keyframes so there is nothing to tear
 * down in ngOnDestroy.
 */
@Component({
  selector: 'app-music-ticker',
  templateUrl: './music-ticker.component.html',
  styleUrls: ['./music-ticker.component.scss'],
})
export class MusicTickerComponent {
  @Input() profile: MusicProfile | null = null;
  /** Reserved for v2 now-playing. Pass null in v1. */
  @Input() nowPlaying: NowPlaying | null = null;

  /** Expose constants for template use. */
  readonly xomifyUrl = XOMIFY_URL;
  readonly xomifyLogo = XOMIFY_LOGO;

  get timeframeLabel(): string {
    return this.profile?.windowLabel ?? '';
  }

  get segments(): TickerSegment[] {
    if (!this.profile) return [];

    const tf = this.timeframeLabel;
    const result: TickerSegment[] = [];

    // ── TOP TRACKS ──────────────────────────────────
    if (this.profile.topTracks.length > 0) {
      result.push({ kind: 'divider', label: 'TOP TRACKS', timeframe: tf });
      for (const t of this.profile.topTracks) {
        result.push({
          kind: 'item',
          label: t.name,
          sub: t.artist,
          imageUrl: t.albumArt,
          url: t.url,
          type: 'track',
        });
      }
      result.push({ kind: 'badge' });
    }

    // ── TOP ARTISTS ─────────────────────────────────
    if (this.profile.topArtists.length > 0) {
      result.push({ kind: 'divider', label: 'TOP ARTISTS', timeframe: tf });
      for (const a of this.profile.topArtists) {
        result.push({
          kind: 'item',
          label: a.name,
          sub: 'Artist',
          imageUrl: a.image,
          url: a.url,
          type: 'artist',
        });
      }
      result.push({ kind: 'badge' });
    }

    // ── TOP GENRES ──────────────────────────────────
    if (this.profile.topGenres.length > 0) {
      result.push({ kind: 'divider', label: 'TOP GENRES', timeframe: tf });
      for (const g of this.profile.topGenres) {
        result.push({
          kind: 'item',
          label: g.genre,
          sub: `${g.count} tracks`,
          // Genres have no image — use a genre icon placeholder via CSS class
          imageUrl: '',
          url: XOMIFY_URL,
          type: 'genre',
        });
      }
      result.push({ kind: 'badge' });
    }

    return result;
  }

  isItem(s: TickerSegment): s is TickerTrackItem {
    return s.kind === 'item';
  }

  isDivider(s: TickerSegment): s is TickerDividerItem {
    return s.kind === 'divider';
  }

  isBadge(s: TickerSegment): s is TickerBadgeItem {
    return s.kind === 'badge';
  }
}
