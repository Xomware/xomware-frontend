import { MusicProfile } from '../models/music.model';

export const MUSIC_PROFILE_MOCK: MusicProfile = {
  windowLabel: 'Last 4 weeks',
  updatedAt: '2026-06-01T06:00:00.000Z',
  nowPlaying: null,
  topTracks: [
    {
      name: 'HUMBLE.',
      artist: 'Kendrick Lamar',
      albumArt: 'https://i.scdn.co/image/ab67616d0000b2732e02117d76426a08ac7c174f',
      url: 'https://open.spotify.com/track/7KXjTSCq5nL1LoYtL7XAwS',
    },
    {
      name: 'SICKO MODE',
      artist: 'Travis Scott',
      albumArt: 'https://i.scdn.co/image/ab67616d0000b273072e9faef2ef7b6db63834a3',
      url: 'https://open.spotify.com/track/2xLMifQCjDGFmkHkpNLD9h',
    },
    {
      name: 'Money Trees',
      artist: 'Kendrick Lamar',
      albumArt: 'https://i.scdn.co/image/ab67616d0000b273d28db4e13dc0d5c4bf4d5b51',
      url: 'https://open.spotify.com/track/2HbKqm4o0w5wEeEFXm2sD1',
    },
    {
      name: 'Goosebumps',
      artist: 'Travis Scott',
      albumArt: 'https://i.scdn.co/image/ab67616d0000b273f54b99bf27cda88f4a7403ce',
      url: 'https://open.spotify.com/track/6vvhDcRoIBjDT2dofJaMUL',
    },
    {
      name: 'N95',
      artist: 'Kendrick Lamar',
      albumArt: 'https://i.scdn.co/image/ab67616d0000b2730c471c36970b9406a4f9e516',
      url: 'https://open.spotify.com/track/5zklbSzXIXkbRxkSSmLPDM',
    },
  ],
  topArtists: [
    {
      name: 'Kendrick Lamar',
      image: 'https://i.scdn.co/image/ab6761610000e5eb867008a971fae0f4d913f63b',
      url: 'https://open.spotify.com/artist/2YZyLoL8N0Wb9xBt1NhZWg',
    },
    {
      name: 'Travis Scott',
      image: 'https://i.scdn.co/image/ab6761610000e5eb19c2790744c792d2203879cb',
      url: 'https://open.spotify.com/artist/0Y5tJX1MQlPlqiwlOH1tJY',
    },
    {
      name: 'Drake',
      image: 'https://i.scdn.co/image/ab6761610000e5eb4293385d324db8558179afd9',
      url: 'https://open.spotify.com/artist/3TVXtAsR1Inumwj472S9r4',
    },
    {
      name: 'J. Cole',
      image: 'https://i.scdn.co/image/ab6761610000e5eb8ae7f2aaa9817a704a87ea36',
      url: 'https://open.spotify.com/artist/6l3HvQ5sa6mXTsMTB19rO5',
    },
    {
      name: 'Tyler, the Creator',
      image: 'https://i.scdn.co/image/ab6761610000e5eb66ccef46b9a8b21c39bcf2a7',
      url: 'https://open.spotify.com/artist/4V8LLVI7PbaPR0K2TGSxFF',
    },
  ],
  topGenres: [
    { genre: 'Hip-Hop', count: 42 },
    { genre: 'Rap', count: 38 },
    { genre: 'Trap', count: 25 },
    { genre: 'West Coast Hip-Hop', count: 17 },
    { genre: 'Conscious Hip-Hop', count: 12 },
  ],
};
