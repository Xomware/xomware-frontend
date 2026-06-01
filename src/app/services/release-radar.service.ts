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
 * Base URL: `environment.musicApiUrl` (`api.xomify.xomware.com`).
 * Path: `GET /music/public-release-radar?userId=<id>`
 *
 * Surface mode is driven by `environment.musicSurfaces.radar`:
 *   'live'         — calls the live endpoint (backend not yet built)
 *   'mock'         — returns the local fixture
 *   'coming-soon'  — callers should never reach this; the component gates it
 */
@Injectable({ providedIn: 'root' })
export class ReleaseRadarService {
  private readonly baseUrl = `${environment.musicApiUrl}/music`;

  constructor(private http: HttpClient) {}

  /**
   * Returns the public release-radar snapshot for the given userId.
   * Returns the mock fixture when `environment.musicSurfaces.radar === 'mock'`.
   */
  getPublicReleaseRadar(userId: string): Observable<RadarProfile> {
    if (environment.musicSurfaces.radar === 'mock') {
      return of(RELEASE_RADAR_MOCK);
    }
    return this.http.get<RadarProfile>(
      `${this.baseUrl}/public-release-radar?userId=${encodeURIComponent(userId)}`,
    );
  }
}
