import { APPS, AppCard } from './apps.data';

/**
 * One product in the Xomware system: a body in the landing intro and in the
 * /apps orbit.
 *
 * Planets are a *presentation* grouping derived from APPS — they are not a
 * second source of truth. Add or change an app in apps.data.ts and it shows
 * up here automatically.
 */
export interface Planet {
  name: string;
  description: string;
  color: string;
  colorRgb: string;
  url: string;
  /** The banner lockup: the /apps orbit and the intro's planet labels. */
  logo: string;
  status: 'live' | 'coming-soon';
  /** See AppCard.beta. */
  beta: boolean;
  /** Human labels for every platform the product ships on, e.g. ['Web', 'iOS']. */
  platforms: string[];
  /** A league or pool. These sort last. */
  pool: boolean;
}

// Pools label themselves with their tag: a dynasty league isn't an annual pool.
const PLATFORM_LABEL: Record<Exclude<AppCard['platform'], 'pool'>, string> = {
  web: 'Web',
  ios: 'iOS',
};

const platformLabel = (app: AppCard): string => (app.platform === 'pool' ? app.tag : PLATFORM_LABEL[app.platform]);

/**
 * Order products before seasonal pools.
 *
 * Pools reset every year and aren't ongoing products, so they read as a
 * coda rather than being scattered through the middle.
 */
function rank(platform: AppCard['platform']): number {
  return platform === 'pool' ? 1 : 0;
}

/**
 * Group the flat app list into one planet per *product*.
 *
 * Xomify and Xomper each appear twice in APPS (a web row and an iOS row) —
 * that split is deliberate and drives the directory, so it is left alone
 * there. Two identical Xomify planets would read as a bug, so rows that share
 * a name merge here and the platforms become badges instead.
 */
function buildPlanets(): Planet[] {
  const byName = new Map<string, AppCard[]>();

  for (const app of APPS) {
    if (app.adminOnly) continue;
    const rows = byName.get(app.name);
    if (rows) {
      rows.push(app);
    } else {
      byName.set(app.name, [app]);
    }
  }

  const grouped = [...byName.values()].sort(
    (a, b) => rank(a[0].platform) - rank(b[0].platform),
  );

  return grouped.map((rows) => {
    // Prefer the web row: it owns the product's real URL and the description
    // written for the product itself, not the "…on iOS" variant.
    const primary = rows.find((r) => r.platform === 'web') ?? rows[0];

    return {
      name: primary.name,
      description: primary.description,
      color: primary.color,
      colorRgb: primary.colorRgb,
      url: primary.url,
      logo: primary.logo,
      // Live on any platform means the product is live and reachable.
      status: rows.some((r) => r.status === 'live') ? 'live' : 'coming-soon',
      beta: !!primary.beta,
      platforms: [...new Set(rows.map(platformLabel))],
      pool: primary.platform === 'pool',
    };
  });
}

export const PLANETS: Planet[] = buildPlanets();
