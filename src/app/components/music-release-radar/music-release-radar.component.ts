import { Component, OnDestroy, OnInit } from '@angular/core';
import { Subscription } from 'rxjs';
import { environment } from '../../../environments/environment';
import { RadarProfile, RadarRelease } from '../../models/release-radar.model';
import { ReleaseRadarService } from '../../services/release-radar.service';

type LoadState = 'loading' | 'loaded' | 'error' | 'coming-soon';

@Component({
  selector: 'app-music-release-radar',
  templateUrl: './music-release-radar.component.html',
  styleUrls: ['./music-release-radar.component.scss'],
})
export class MusicReleaseRadarComponent implements OnInit, OnDestroy {
  state: LoadState = 'loading';
  radarProfile: RadarProfile | null = null;
  errorMessage = '';

  private sub?: Subscription;

  constructor(private radarService: ReleaseRadarService) {}

  ngOnInit(): void {
    if (environment.musicSurfaces.radar === 'coming-soon') {
      this.state = 'coming-soon';
      return;
    }
    this.load();
  }

  ngOnDestroy(): void {
    this.sub?.unsubscribe();
  }

  load(): void {
    this.state = 'loading';
    this.errorMessage = '';
    this.sub?.unsubscribe();
    this.sub = this.radarService
      .getPublicReleaseRadar(environment.musicProfileUserId)
      .subscribe({
        next: (data) => {
          this.radarProfile = data;
          this.state = 'loaded';
        },
        error: () => {
          this.errorMessage =
            'Could not load release radar. The backend may be unavailable.';
          this.state = 'error';
        },
      });
  }

  /** Returns a human-readable relative time string for a YYYY-MM-DD date. */
  relativeDate(dateStr: string): string {
    const date = new Date(dateStr + 'T00:00:00');
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffDays = Math.floor(diffMs / 86_400_000);

    if (diffDays === 0) return 'Today';
    if (diffDays === 1) return 'Yesterday';
    if (diffDays < 7) return `${diffDays} days ago`;

    const diffWeeks = Math.floor(diffDays / 7);
    if (diffWeeks === 1) return '1 week ago';
    return `${diffWeeks} weeks ago`;
  }

  trackByUrl(_index: number, release: RadarRelease): string {
    return release.url;
  }

  typeBadgeLabel(type: RadarRelease['type']): string {
    const labels: Record<RadarRelease['type'], string> = {
      album: 'Album',
      single: 'Single',
      ep: 'EP',
    };
    return labels[type];
  }
}
