import { HttpClient } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { Observable } from 'rxjs';
import { environment } from '../../environments/environment';
import { NowPlayingState } from '../models/now-playing.model';

/**
 * Fetches Dom's live now-playing state from the Xomify public endpoint.
 * No auth required — the endpoint is public and rate-limited server-side.
 *
 * Path: GET ${environment.musicApiUrl}/music/public-now-playing?userId=<id>
 */
@Injectable({ providedIn: 'root' })
export class NowPlayingService {
  private readonly baseUrl = `${environment.musicApiUrl}/music`;

  constructor(private http: HttpClient) {}

  getNowPlaying(userId: string): Observable<NowPlayingState> {
    return this.http.get<NowPlayingState>(
      `${this.baseUrl}/public-now-playing?userId=${encodeURIComponent(userId)}`,
    );
  }
}
