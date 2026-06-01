export const environment = {
  production: true,
  apiBaseUrl: 'https://editor-api.xomware.com',
  usersApiUrl: 'https://api.xomware.com',
  avatarsCdnUrl: '',
  awsRegion: 'us-east-1',
  cognitoUserPoolId: '',
  cognitoClientId: '',
  cognitoDomain: 'xomware-auth.auth.us-east-1.amazoncognito.com',
  ga4MeasurementId: '',
  // TODO: replace with Dom's real userId once the public-top-items endpoint ships
  musicProfileUserId: 'PLACEHOLDER_DOM_USER_ID',
  // v1: always use mock until xomify-backend public snapshot endpoint is live
  useMockMusicData: true,
};
