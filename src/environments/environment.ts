export const environment = {
  production: true,
  apiBaseUrl: 'https://editor-api.xomware.com',
  usersApiUrl: 'https://api.xomware.com',
  musicApiUrl: 'https://api.xomify.xomware.com',
  avatarsCdnUrl: '',
  awsRegion: 'us-east-1',
  cognitoUserPoolId: '',
  cognitoClientId: '',
  cognitoDomain: 'xomware-auth.auth.us-east-1.amazoncognito.com',
  ga4MeasurementId: '',
  musicProfileUserId: '12146721999',
  xomifyWebUrl: 'https://xomify.xomware.com',
  musicSurfaces: {
    now: 'live',
    radar: 'live',
    wrapped: 'live',
  } as { now: 'live' | 'mock' | 'coming-soon'; radar: 'live' | 'mock' | 'coming-soon'; wrapped: 'live' | 'mock' | 'coming-soon' },
};
