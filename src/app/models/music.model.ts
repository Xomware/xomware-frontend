export type MusicRange = 'short_term' | 'medium_term' | 'long_term';

export interface TopTrack {
  name: string;
  artist: string;
  albumArt: string;
  url: string;
}

export interface TopArtist {
  name: string;
  image: string;
  url: string;
}

export interface TopGenre {
  genre: string;
  count: number;
}

/** Stub kept for ticker component input compatibility. */
export interface NowPlaying {}

export interface MusicProfile {
  topTracks: TopTrack[];
  topArtists: TopArtist[];
  topGenres: TopGenre[];
  windowLabel: string;
  updatedAt: string;
  nowPlaying: NowPlaying | null;
}
