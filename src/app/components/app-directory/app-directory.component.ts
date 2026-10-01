import { ChangeDetectionStrategy, Component } from '@angular/core';
import { AppCard, APPS } from '../../data/apps.data';

type Badge = 'live' | 'beta' | 'soon';

interface DirectoryEntry {
  app: AppCard;
  badge: Badge;
}

interface DirectoryGroup {
  id: AppCard['platform'];
  title: string;
  entries: DirectoryEntry[];
}

const BADGE_LABEL: Record<Badge, string> = {
  live: 'Live',
  beta: 'Beta',
  soon: 'Coming soon',
};

const GROUPS: { id: AppCard['platform']; title: string }[] = [
  { id: 'web', title: 'Web Apps' },
  { id: 'pool', title: 'Leagues & Pools' },
  { id: 'ios', title: 'iOS Apps' },
];

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

  // adminOnly tools never reach a public surface; filtered here, at the source.
  readonly groups: DirectoryGroup[] = GROUPS.map(({ id, title }) => ({
    id,
    title,
    entries: APPS.filter((a) => !a.adminOnly && a.platform === id).map((app) => ({
      app,
      badge: badgeFor(app),
    })),
  }));
}
