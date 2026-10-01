import { Component } from '@angular/core';

/**
 * Public app directory — the full Xomware suite.
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
export class AppsComponent {}
