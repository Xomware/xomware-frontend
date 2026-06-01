export interface NowPlayingTrack {
  name: string;
  artist: string;
  albumArt: string;
  url: string;
}

export interface NowPlayingState {
  isPlaying: boolean;
  track: NowPlayingTrack | null;
  progressMs: number | null;
  durationMs: number | null;
}
