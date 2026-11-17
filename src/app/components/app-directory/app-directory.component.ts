import { ChangeDetectionStrategy, Component } from '@angular/core';
import { AppCard, APPS } from '../../data/apps.data';
import { layoutLine, ZONES } from '../../factory/layout';

type Badge = 'live' | 'beta' | 'soon';

interface DirectoryEntry {
  app: AppCard;
  badge: Badge;
  /** Line letter and station number, as stencilled on the factory floor: "A-03". */
  bay: string;
}

interface DirectoryGroup {
  id: AppCard['platform'];
  title: string;
  line: string;
  entries: DirectoryEntry[];
}

const BADGE_LABEL: Record<Badge, string> = {
  live: 'Live',
  beta: 'Beta',
  soon: 'Coming soon',
};

const TITLES: Record<AppCard['platform'], string> = {
  web: 'Web Apps',
  pool: 'Leagues & Pools',
  ios: 'iOS Apps',
};

const STATION = new Map(layoutLine(APPS).stations.map((s) => [s.app, s.index + 1]));

function badgeFor(app: AppCard): Badge {
  if (app.status === 'coming-soon') return 'soon';
  return app.beta ? 'beta' : 'live';
}

/** The public app directory, grouped by platform. Shared by the landing page and /apps. */
@Component({
  selector: 'app-directory',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './app-directory.component.html',
  styleUrl: './app-directory.component.scss',
})
export class AppDirectoryComponent {
  readonly badgeLabel = BADGE_LABEL;

  // Grouped and numbered the way the factory builds them, so a tile reads as the station it came off.
  // adminOnly tools never reach a public surface; filtered here, at the source.
  readonly groups: DirectoryGroup[] = ZONES.map(({ platform, label }) => ({
    id: platform,
    title: TITLES[platform],
    line: label,
    entries: APPS.filter((a) => !a.adminOnly && a.platform === platform).map((app) => ({
      app,
      badge: badgeFor(app),
      bay: `${label.slice(-1)}-${String(STATION.get(app)).padStart(2, '0')}`,
    })),
  }));
}
