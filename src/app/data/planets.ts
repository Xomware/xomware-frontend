import { APPS, AppCard } from './apps.data';

/**
 * A single body in the space journey on the landing page.
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
  logo: string;
  status: 'live' | 'coming-soon';
  /** Human labels for every platform the product ships on, e.g. ['Web', 'iOS']. */
  platforms: string[];
  /** Layout only — see LAYOUT below. */
  size: number;
  offsetY: number;
  depth: number;
}

/**
 * Per-position layout values, applied by index rather than randomised.
 *
 * Randomising would re-roll the composition on every render and make the
 * journey untestable; a fixed table gives the same varied-but-deliberate
 * arrangement every time. Cycled with `%` so adding a 9th app still works.
 *
 * size    — multiplier on the base planet diameter
 * offsetY — vertical drift from the travel line, in vh
 * depth   — parallax rate; >1 passes nearer the camera than the star layers
 */
const LAYOUT = [
  { size: 1.0, offsetY: -7, depth: 0.9 },
  { size: 0.84, offsetY: 11, depth: 0.7 },
  { size: 1.12, offsetY: -13, depth: 1.05 },
  { size: 0.92, offsetY: 5, depth: 0.8 },
  { size: 1.04, offsetY: -4, depth: 0.95 },
  { size: 0.88, offsetY: 13, depth: 0.72 },
  { size: 1.16, offsetY: -10, depth: 1.1 },
  { size: 0.96, offsetY: 6, depth: 0.85 },
];

const PLATFORM_LABEL: Record<AppCard['platform'], string> = {
  web: 'Web',
  ios: 'iOS',
  pool: 'Annual Pool',
};

/**
 * Order products before seasonal pools.
 *
 * Pools reset every year and aren't ongoing products, so they read as a
 * coda to the journey rather than being scattered through the middle of it.
 */
function journeyRank(platform: AppCard['platform']): number {
  return platform === 'pool' ? 1 : 0;
}

/**
 * Group the flat app list into one planet per *product*.
 *
 * Xomify and Xomper each appear twice in APPS (a web row and an iOS row) —
 * that split is deliberate and drives the /apps grid, so it is left alone
 * there. A visitor flying past two identical Xomify planets would read it as
 * a bug, so the journey merges rows that share a name and shows the
 * platforms as badges instead.
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
    (a, b) => journeyRank(a[0].platform) - journeyRank(b[0].platform),
  );

  return grouped.map((rows, i) => {
    // Prefer the web row: it owns the product's real URL and the description
    // written for the product itself, not the "…on iOS" variant.
    const primary = rows.find((r) => r.platform === 'web') ?? rows[0];
    const layout = LAYOUT[i % LAYOUT.length];

    return {
      name: primary.name,
      description: primary.description,
      color: primary.color,
      colorRgb: primary.colorRgb,
      url: primary.url,
      logo: primary.logo,
      // Live on any platform means the product is live and reachable.
      status: rows.some((r) => r.status === 'live') ? 'live' : 'coming-soon',
      platforms: [...new Set(rows.map((r) => PLATFORM_LABEL[r.platform]))],
      ...layout,
    };
  });
}

export const PLANETS: Planet[] = buildPlanets();
