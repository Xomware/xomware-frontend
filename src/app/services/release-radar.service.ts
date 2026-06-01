import { HttpClient } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { Observable, of } from 'rxjs';
import { environment } from '../../environments/environment';
import { RadarProfile } from '../models/release-radar.model';
import { RELEASE_RADAR_MOCK } from './release-radar.mock';

/**
 * Fetches this week's new releases for a given user's taste profile from the
 * Xomify public release-radar endpoint. All data is read-only, no auth.
 *
 * Base URL: `environment.usersApiUrl` (`api.xomware.com` family).
 * Path: `GET /music/public-release-radar?userId=<id>`
 *
 * Set `environment.useMockMusicData = true` to return the local mock fixture
 * instead of hitting the network (default in v1 while the backend endpoint
 * is pending).
 *
 * Cross-repo blocker: the live endpoint (`GET /music/public-release-radar`)
 * does not exist yet. It must be built in xomify-backend before flipping
 * `useMockMusicData` to false. See docs/features/music-section/PLAN.md.
 */
@Injectable({ providedIn: 'root' })
export class ReleaseRadarService {
  private readonly baseUrl = `${environment.usersApiUrl}/music`;

  constructor(private http: HttpClient) {}

  /**
   * Returns the public release-radar snapshot for the given userId.
   * Returns the mock fixture when `environment.useMockMusicData` is true.
   */
  getPublicReleaseRadar(userId: string): Observable<RadarProfile> {
    if (environment.useMockMusicData) {
      return of(RELEASE_RADAR_MOCK);
    }
    return this.http.get<RadarProfile>(
      `${this.baseUrl}/public-release-radar?userId=${encodeURIComponent(userId)}`,
    );
  }
}
