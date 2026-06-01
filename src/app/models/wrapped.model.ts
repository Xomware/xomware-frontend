import { TopArtist, TopGenre, TopTrack } from './music.model';

export interface WrappedMonth {
  monthKey: string;
  label: string;
  topTracks: TopTrack[];
  topArtists: TopArtist[];
  topGenres: TopGenre[];
  playlistUrl: string | null;
}

export interface WrappedArchive {
  /** months newest-first */
  months: WrappedMonth[];
  updatedAt: string;
}
