import { HttpClient } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { Observable, of } from 'rxjs';
import { environment } from '../../environments/environment';
import { MusicProfile } from '../models/music.model';
import { MUSIC_PROFILE_MOCK } from './music.mock';

/**
 * Fetches Dom's public listening stats from the Xomify public snapshot
 * endpoint. All data is read-only and requires no auth.
 *
 * Base URL: `environment.musicApiUrl` (`api.xomify.xomware.com`).
 * Path: `GET /music/public-top-items?userId=<id>`
 *
 * Surface mode is driven by `environment.musicSurfaces.now`:
 *   'live'         — calls the live endpoint
 *   'mock'         — returns the local fixture (useful for local dev)
 *   'coming-soon'  — callers should never reach this; the component gates it
 */
@Injectable({ providedIn: 'root' })
export class MusicService {
  private readonly baseUrl = `${environment.musicApiUrl}/music`;

  constructor(private http: HttpClient) {}

  /**
   * Returns the public top-items snapshot for the given userId.
   * Calls the live API when `environment.musicSurfaces.now === 'live'`.
   * Returns the mock fixture when the surface is `'mock'`.
   */
  getPublicTopItems(userId: string): Observable<MusicProfile> {
    if (environment.musicSurfaces.now === 'mock') {
      return of(MUSIC_PROFILE_MOCK);
    }
    return this.http.get<MusicProfile>(
      `${this.baseUrl}/public-top-items?userId=${encodeURIComponent(userId)}`,
    );
  }
}
