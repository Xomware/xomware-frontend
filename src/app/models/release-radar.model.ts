export interface RadarRelease {
  name: string;
  artist: string;
  albumArt: string;
  url: string;
  releaseDate: string;
  type: 'album' | 'single' | 'ep';
}

export interface RadarProfile {
  releases: RadarRelease[];
  windowLabel: string;
  updatedAt: string;
}
