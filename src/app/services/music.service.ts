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
 * Base URL: `environment.usersApiUrl` (`api.xomware.com` family).
 * Path: `GET /music/public-top-items?userId=<id>`
 *
 * Set `environment.useMockMusicData = true` to return the local mock fixture
 * instead of hitting the network (default in v1 while the backend endpoint
 * is pending).
 *
 * Cross-repo blocker: the live endpoint (`GET /music/public-top-items`) does
 * not exist yet. It must be built in xomify-backend before flipping
 * `useMockMusicData` to false. See PLAN.md §Cross-Repo Dependency.
 */
@Injectable({ providedIn: 'root' })
export class MusicService {
  private readonly baseUrl = `${environment.usersApiUrl}/music`;

  constructor(private http: HttpClient) {}

  /**
   * Returns the public top-items snapshot for the given userId.
   * Returns the mock fixture when `environment.useMockMusicData` is true.
   */
  getPublicTopItems(userId: string): Observable<MusicProfile> {
    if (environment.useMockMusicData) {
      return of(MUSIC_PROFILE_MOCK);
    }
    return this.http.get<MusicProfile>(
      `${this.baseUrl}/public-top-items?userId=${encodeURIComponent(userId)}`,
    );
  }
}
