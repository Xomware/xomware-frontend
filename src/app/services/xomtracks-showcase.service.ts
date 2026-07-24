import { HttpClient, HttpParams } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { map, Observable, of } from 'rxjs';
import { environment } from '../../environments/environment';
import { XomtracksShowcase } from '../models/xomtracks-showcase.model';
import { XOMTRACKS_SHOWCASE_MOCK } from './xomtracks-showcase.mock';

/** Standard `{ data, error, meta }` envelope shared by all xomtracks-backend responses. */
interface ApiEnvelope<T> {
  data: T;
  error: string | null;
  meta: Record<string, unknown>;
}

/**
 * Fetches Dom's public recent-shares showcase from the xomtracks-backend hub
 * endpoint. Read-only, no auth required.
 *
 * Base URL: `environment.xomtracksApiUrl` (`api.xomtracks.xomware.com`).
 * Path: `GET /shares/recent?limit=<n>&ownerId=<email>`
 *
 * The route is public and server-side-scopes to a `DEFAULT_OWNER_ID`
 * configured on the backend Lambda — in principle we shouldn't need to pass
 * `ownerId` at all. In practice, as of this writing the deployed Lambda's
 * default is still the pre-migration Cognito `sub`, not Dom's email, so the
 * no-param call returns an empty showcase even though his 326 shares are
 * already stored under his email. We pass `environment.xomtracksOwnerId`
 * explicitly (the handler's documented override) so the showcase works
 * regardless of that drift. Safe to drop once the backend default is fixed
 * (see PLAN.md WS-AUTH).
 *
 * Response envelope is `{ data, error, meta }` — this service unwraps `data`.
 *
 * Surface mode is driven by `environment.musicSurfaces.xomtracks`:
 *   'live'         — calls the live endpoint
 *   'mock'         — returns the local fixture (useful for local dev)
 *   'coming-soon'  — callers should never reach this; the component gates it
 */
@Injectable({ providedIn: 'root' })
export class XomtracksShowcaseService {
  private readonly baseUrl = `${environment.xomtracksApiUrl}/shares`;

  constructor(private http: HttpClient) {}

  /**
   * Returns the compact recent-shares showcase (both directions).
   * `limit` caps EACH direction (backend default 5, max 20).
   */
  getRecentShares(limit = 5): Observable<XomtracksShowcase> {
    if (environment.musicSurfaces.xomtracks === 'mock') {
      return of(XOMTRACKS_SHOWCASE_MOCK);
    }
    const params = new HttpParams()
      .set('limit', String(limit))
      .set('ownerId', environment.xomtracksOwnerId);
    return this.http
      .get<ApiEnvelope<XomtracksShowcase>>(`${this.baseUrl}/recent`, { params })
      .pipe(map((res) => res.data));
  }
}
