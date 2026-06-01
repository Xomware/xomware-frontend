import { Component, Input } from '@angular/core';
import { MusicProfile, NowPlaying, TopArtist, TopTrack } from '../../models/music.model';

interface TickerItem {
  label: string;
  sub: string;
  imageUrl: string;
  url: string;
  type: 'track' | 'artist';
}

/**
 * Pure-CSS marquee that scrolls top tracks and top artists.
 * No GSAP — animation is driven entirely by CSS keyframes so there is
 * nothing to tear down in ngOnDestroy.
 *
 * Usage:
 *   <app-music-ticker [profile]="musicProfile" [nowPlaying]="null"></app-music-ticker>
 *
 * Built standalone-friendly so it can be dropped on the landing page later.
 * The `nowPlaying` slot is reserved but unused in v1 (always null).
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

  get items(): TickerItem[] {
    if (!this.profile) return [];

    const tracks: TickerItem[] = this.profile.topTracks.map(
      (t: TopTrack): TickerItem => ({
        label: t.name,
        sub: t.artist,
        imageUrl: t.albumArt,
        url: t.url,
        type: 'track',
      }),
    );

    const artists: TickerItem[] = this.profile.topArtists.map(
      (a: TopArtist): TickerItem => ({
        label: a.name,
        sub: 'Artist',
        imageUrl: a.image,
        url: a.url,
        type: 'artist',
      }),
    );

    return [...tracks, ...artists];
  }
}
