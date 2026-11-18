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
  musicSurfaces: {
    now: 'live',
    radar: 'live',
    wrapped: 'live',
    xomtracks: 'live',
  } as {
    now: 'live' | 'mock' | 'coming-soon';
    radar: 'live' | 'mock' | 'coming-soon';
    wrapped: 'live' | 'mock' | 'coming-soon';
    xomtracks: 'live' | 'mock' | 'coming-soon';
  },
};
