import { Component } from '@angular/core';
import { AppCard, APPS } from '../../data/apps.data';

/**
 * Public app directory — the full Xomware suite grid.
 *
 * Publicly routable (no auth guard) so the "Explore Apps" CTA on the
 * landing page, and anonymous visitors in general, can browse every app
 * without signing in.
 */
@Component({
  selector: 'app-apps',
  templateUrl: './apps.component.html',
  styleUrls: ['./apps.component.scss'],
})
export class AppsComponent {
  // This route is public, so internal tools must never reach it. Filtered at
  // the source rather than per-getter so a future getter can't leak one.
  apps: AppCard[] = APPS.filter((a) => !a.adminOnly);

  get webApps(): AppCard[] {
    return this.apps.filter((a) => a.platform === 'web');
  }

  get iosApps(): AppCard[] {
    return this.apps.filter((a) => a.platform === 'ios');
  }
}
