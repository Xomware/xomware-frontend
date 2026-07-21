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
  apps: AppCard[] = APPS;

  get webApps(): AppCard[] {
    return this.apps.filter((a) => a.platform === 'web');
  }

  get iosApps(): AppCard[] {
    return this.apps.filter((a) => a.platform === 'ios');
  }
}
