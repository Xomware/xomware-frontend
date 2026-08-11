// Environment for visual regression tests ONLY. Never deployed.
//
// Identical to environment.ts except every music surface is forced to 'mock',
// so /music renders its real content from the local fixtures instead of the
// empty state. Without this the music components - roughly a third of the
// remaining token violations - are invisible to the screenshot suite, and
// migrating them would be unverified.
export const environment = {
  production: true,
  apiBaseUrl: 'https://editor-api.xomware.com',
  usersApiUrl: 'https://api.xomware.com',
  musicApiUrl: 'https://api.xomify.xomware.com',
  xomtracksApiUrl: 'https://api.xomtracks.xomware.com',
  avatarsCdnUrl: '',
  awsRegion: 'us-east-1',
  cognitoUserPoolId: '',
  cognitoClientId: '',
  cognitoDomain: 'xomware-auth.auth.us-east-1.amazoncognito.com',
  ga4MeasurementId: '',
  musicProfileUserId: '12146721999',
  xomifyWebUrl: 'https://xomify.xomware.com',
  // Explicit override for GET /shares/recent — see xomtracks-showcase.service.ts
  // for why this is passed instead of relying on the backend's default scoping.
  xomtracksOwnerId: 'dominickj.giordano@gmail.com',
  /**
   * Freeze the non-deterministic parts of the landing starfield (shooting
   * stars, asteroid tumble). Only the visual-regression build turns this on:
   * a meteor that may or may not be mid-flight when the screenshot is taken
   * would blow past the suite's 150-pixel diff tolerance every other run.
   */
  staticScene: true,
  musicSurfaces: {
    now: 'mock',
    radar: 'mock',
    wrapped: 'mock',
    xomtracks: 'mock',
  } as {
    now: 'live' | 'mock' | 'coming-soon';
    radar: 'live' | 'mock' | 'coming-soon';
    wrapped: 'live' | 'mock' | 'coming-soon';
    xomtracks: 'live' | 'mock' | 'coming-soon';
  },
};
