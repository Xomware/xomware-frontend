import { Component } from '@angular/core';
import { ComingSoonApp } from '../../../models/coming-soon.models';

@Component({
  selector: 'app-coming-soon-section',
  templateUrl: './coming-soon-section.component.html',
  styleUrls: ['./coming-soon-section.component.scss'],
})
export class ComingSoonSectionComponent {
  readonly apps: ComingSoonApp[] = [
    {
      id: 'xomfit',
      name: 'XomFit',
      tagline: 'Social fitness & lifting tracker',
      description: 'Track your lifts, challenge friends, follow AI-powered workout plans. Your gym crew, in your pocket.',
      color: '#34C759',
      colorRgb: '52, 199, 89',
      platform: 'iOS',
      logo: 'assets/img/xomfit-placeholder.svg',
      url: 'https://xomfit.xomware.com',
      releaseHint: 'Spring 2026',
    },
    {
      id: 'float',
      name: 'Float',
      tagline: 'Real-time deals for bars & restaurants',
      description: 'Live happy hour pricing, rotating deals, and the best spots near you — updated in real time.',
      color: '#FFB800',
      colorRgb: '255, 184, 0',
      platform: 'iOS',
      logo: 'assets/img/float-placeholder.svg',
      url: 'https://float.xomware.com',
      releaseHint: 'Summer 2026',
    },
  ];
}
