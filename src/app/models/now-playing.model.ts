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
  /** 'playing' = actively playing; 'recent' = last played fallback; 'none' = nothing available. */
  source: 'playing' | 'recent' | 'none';
  /** ISO timestamp set when source === 'recent'. */
  playedAt: string | null;
}
