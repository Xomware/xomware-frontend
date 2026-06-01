import { HttpClient } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { Observable, of } from 'rxjs';
import { environment } from '../../environments/environment';
import { WrappedArchive } from '../models/wrapped.model';
import { WRAPPED_MOCK } from './wrapped.mock';

/**
 * Fetches Dom's monthly wrapped archive from the Xomify public wrapped
 * endpoint. All data is read-only, no auth.
 *
 * Base URL: `environment.usersApiUrl` (`api.xomware.com` family).
 * Path: `GET /music/public-wrapped?userId=<id>`
 *
 * Set `environment.useMockMusicData = true` to return the local mock fixture
 * instead of hitting the network (default in v1 while the backend endpoint
 * is pending).
 *
 * Cross-repo blocker: the live endpoint (`GET /music/public-wrapped`)
 * does not exist yet. It must be built in xomify-backend before flipping
 * `useMockMusicData` to false. See docs/features/music-section/PLAN.md.
 */
@Injectable({ providedIn: 'root' })
export class WrappedService {
  private readonly baseUrl = `${environment.usersApiUrl}/music`;

  constructor(private http: HttpClient) {}

  /**
   * Returns the public wrapped archive for the given userId.
   * Returns the mock fixture when `environment.useMockMusicData` is true.
   */
  getPublicWrapped(userId: string): Observable<WrappedArchive> {
    if (environment.useMockMusicData) {
      return of(WRAPPED_MOCK);
    }
    return this.http.get<WrappedArchive>(
      `${this.baseUrl}/public-wrapped?userId=${encodeURIComponent(userId)}`,
    );
  }
}
