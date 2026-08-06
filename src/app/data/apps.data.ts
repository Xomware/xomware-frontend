export interface AppCard {
  name: string;
  description: string;
  color: string;
  colorRgb: string;
  url: string;
  logo: string;
  tag: string;
  status: 'live' | 'coming-soon';
  /**
   * 'pool' is for annual/seasonal event pools (Sun God Derby, Reese's Playoff
   * Challenge) rather than ongoing products. They are built differently — a
   * derby-style Next.js app rather than the Angular three-repo product
   * template — and they read wrong sitting next to Xomify in a "Web Apps"
   * list, so they get their own group.
   */
  platform: 'web' | 'ios' | 'pool';
  /**
   * Set to 'banner' when `logo` is a wide wordmark/banner asset (roughly
   * 3:2) rather than a square icon. Cards render a taller, wider logo
   * area for these so the banner reads cleanly instead of getting
   * squashed into the default square icon slot. Omit for square icons.
   */
  logoStyle?: 'banner';
  /**
   * Internal tool — surfaced only inside the admin portal, never on the public
   * /apps grid or the landing page. The app's own API is the real gate; this
   * flag just keeps a private tool off a public directory.
   */
  adminOnly?: boolean;
}

/**
 * Single source of truth for the Xomware app directory. Consumed by
 * AppsComponent (full /apps grid) and LandingComponent (full grid, same
 * data). Add new apps here — both surfaces pick the change up automatically.
 */
export const APPS: AppCard[] = [
  {
    name: 'Xomify',
    description: 'Your Spotify stats, wrapped your way. Top songs, artists, genres & more.',
    color: '#9c0abf',
    colorRgb: '156, 10, 191',
    url: 'https://xomify.xomware.com',
    logo: 'assets/img/xomify-logo.png',
    tag: 'Web App',
    status: 'live',
    platform: 'web',
  },
  {
    name: 'XomCloud',
    description: 'Your SoundCloud library, organized. Discover and manage your music collection.',
    color: '#ff6b35',
    colorRgb: '255, 107, 53',
    url: 'https://xomcloud.xomware.com',
    logo: 'assets/img/xomcloud-logo.png',
    tag: 'Web App',
    status: 'live',
    platform: 'web',
  },
  {
    name: 'Xomper',
    description: 'Fantasy football analytics. Track your dynasty league, players & matchups.',
    color: '#00ffab',
    colorRgb: '0, 255, 171',
    url: 'https://xomper.xomware.com',
    logo: 'assets/img/xomper-logo.jpg',
    tag: 'Web App',
    status: 'live',
    platform: 'web',
  },
  {
    name: 'Sun God Derby',
    description: "Grant's annual Kentucky Derby pool. Tail or fade his picks, climb the leaderboard.",
    color: '#C8102E',
    colorRgb: '200, 16, 46',
    url: 'https://derby.xomware.com',
    logo: 'assets/img/sun-god-derby-banner.png',
    tag: 'Annual Pool',
    status: 'live',
    platform: 'pool',
  },
  {
    name: "Reese's Playoff Challenge",
    description:
      'NFL playoff pool. Draft one player per playoff team and ride them through January.',
    color: '#8B4513',
    colorRgb: '139, 69, 19',
    url: 'https://playoffs.xomware.com',
    logo: 'assets/img/xomware-icon-transparent-background.png',
    tag: 'Annual Pool',
    status: 'coming-soon',
    platform: 'pool',
  },
  {
    name: 'Xom Appétit',
    description: 'Home-cooking tracker with recipes, ingredients & macros. Rated by three loud chefs.',
    color: '#ff6b6b',
    colorRgb: '255, 107, 107',
    url: 'https://xomappetit.xomware.com',
    logo: 'assets/img/xomappetit-banner.png',
    tag: 'Web App',
    status: 'live',
    platform: 'web',
  },
  {
    name: 'Xom Forms',
    description: 'Group availability scheduler — When2meet done right. Drag-paint your availability, see the best time instantly.',
    color: '#4caf50',
    colorRgb: '76, 175, 80',
    url: 'https://xomforms.xomware.com',
    logo: 'assets/img/xomforms-banner.png',
    logoStyle: 'banner',
    tag: 'Web App',
    status: 'live',
    platform: 'web',
  },
  {
    name: 'Xomify',
    description: 'Your Spotify stats on iOS. Native app available on TestFlight.',
    color: '#9c0abf',
    colorRgb: '156, 10, 191',
    url: 'https://testflight.apple.com/join/5CQaJ2mB',
    logo: 'assets/img/xomify-logo.png',
    tag: 'iOS · TestFlight',
    status: 'live',
    platform: 'ios',
  },
  {
    name: 'Xomper',
    description: 'Fantasy football analytics on iOS. Native app coming soon.',
    color: '#00ffab',
    colorRgb: '0, 255, 171',
    url: 'https://xomper.xomware.com',
    logo: 'assets/img/xomper-logo.jpg',
    tag: 'iOS · Coming Soon',
    status: 'coming-soon',
    platform: 'ios',
  },
  {
    name: 'XomFit',
    description: 'Social fitness & lifting tracker. Challenge friends, follow AI workout plans.',
    color: '#34C759',
    colorRgb: '52, 199, 89',
    url: 'https://testflight.apple.com/join/xttcUQwT',
    logo: 'assets/img/xomfit-banner.png',
    tag: 'iOS · TestFlight',
    status: 'live',
    platform: 'ios',
  },
  {
    name: 'Float',
    description: 'Real-time deals for bars & restaurants. Live happy hours near you.',
    color: '#FFB800',
    colorRgb: '255, 184, 0',
    url: 'https://float.xomware.com',
    logo: 'assets/img/float-placeholder.svg',
    tag: 'iOS · Coming Soon',
    status: 'coming-soon',
    platform: 'ios',
  },
  {
    name: 'Xomcron',
    description: 'Scheduled tasks and trackers. Price watches, card credits, AWS spend.',
    color: '#2563eb',
    colorRgb: '37, 99, 235',
    url: 'https://crons.xomware.com',
    logo: 'assets/img/xomcron-logo.svg',
    tag: 'Internal',
    status: 'live',
    platform: 'web',
    adminOnly: true,
  },
];
