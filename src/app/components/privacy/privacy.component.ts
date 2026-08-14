import { Component } from '@angular/core';

@Component({
  selector: 'app-privacy',
  templateUrl: './privacy.component.html',
  styleUrls: ['./privacy.component.scss'],
})
export class PrivacyComponent {
  // The policy's own "Changes" section promises this moves whenever the policy
  // does. Bumped for the activity-logging disclosure.
  readonly lastUpdated = 'August 14, 2026';
}
