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
 * Base URL: `environment.musicApiUrl` (`api.xomify.xomware.com`).
 * Path: `GET /music/public-wrapped?userId=<id>`
 *
 * Surface mode is driven by `environment.musicSurfaces.wrapped`:
 *   'live'         — calls the live endpoint (backend not yet built)
 *   'mock'         — returns the local fixture
 *   'coming-soon'  — callers should never reach this; the component gates it
 */
@Injectable({ providedIn: 'root' })
export class WrappedService {
  private readonly baseUrl = `${environment.musicApiUrl}/music`;

  constructor(private http: HttpClient) {}

  /**
   * Returns the public wrapped archive for the given userId.
   * Returns the mock fixture when `environment.musicSurfaces.wrapped === 'mock'`.
   */
  getPublicWrapped(userId: string): Observable<WrappedArchive> {
    if (environment.musicSurfaces.wrapped === 'mock') {
      return of(WRAPPED_MOCK);
    }
    return this.http.get<WrappedArchive>(
      `${this.baseUrl}/public-wrapped?userId=${encodeURIComponent(userId)}`,
    );
  }
}
