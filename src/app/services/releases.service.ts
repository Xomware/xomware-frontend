import { Injectable } from '@angular/core';
import { AuthService } from './auth.service';
import { Observable, of, from, forkJoin } from 'rxjs';
import { map, tap, shareReplay } from 'rxjs/operators';

export interface Release {
  id: number;
  tagName: string;
  name: string;
  body: string;
  publishedAt: string;
  htmlUrl: string;
  author: { login: string; avatarUrl: string };
  isPrerelease: boolean;
  isDraft: boolean;
}

export interface MergedPr {
  number: number;
  title: string;
  mergedAt: string;
  htmlUrl: string;
  author: string;
}

export interface RepoReleases {
  repo: string;
  releases: Release[];
  recentMergedPrs?: MergedPr[];
}

const REPOS = ['Float', 'xomfit-ios', 'xomify-frontend', 'xomware-frontend'];
const CACHE_TTL = 5 * 60 * 1000; // 5 minutes

@Injectable({ providedIn: 'root' })
export class ReleasesService {
  private cache: RepoReleases[] | null = null;
  private cacheTimestamp = 0;

  constructor(private auth: AuthService) {}

  private get headers(): HeadersInit {
    return {
      'Accept': 'application/vnd.github+json',
      'X-Auth-Hash': this.auth.getPassphraseHash(),
    };
  }

  getReleases(): Observable<RepoReleases[]> {
    const now = Date.now();
    if (this.cache && (now - this.cacheTimestamp) < CACHE_TTL) {
      return of(this.cache);
    }

    const requests = REPOS.map(repo =>
      from(this.fetchRepoReleases(repo))
    );

    return forkJoin(requests).pipe(
      tap(results => {
        this.cache = results;
        this.cacheTimestamp = Date.now();
      })
    );
  }

  getRecentMergedPrs(repo: string, days: number = 30): Observable<MergedPr[]> {
    return from(this.fetchMergedPrs(repo, days));
  }

  clearCache(): void {
    this.cache = null;
    this.cacheTimestamp = 0;
  }

  private async fetchRepoReleases(repo: string): Promise<RepoReleases> {
    try {
      const res = await fetch(
        `https://api.github.com/repos/Xomware/${repo}/releases?per_page=50`,
        { headers: this.headers }
      );

      if (!res.ok) {
        return { repo, releases: [], recentMergedPrs: await this.fetchMergedPrs(repo, 30) };
      }

      const data = await res.json();
      const releases: Release[] = (data || [])
        .filter((r: any) => !r.draft)
        .map((r: any) => ({
          id: r.id,
          tagName: r.tag_name,
          name: r.name || r.tag_name,
          body: r.body || '',
          publishedAt: r.published_at,
          htmlUrl: r.html_url,
          author: {
            login: r.author?.login || 'unknown',
            avatarUrl: r.author?.avatar_url || '',
          },
          isPrerelease: r.prerelease,
          isDraft: false,
        }));

      const result: RepoReleases = { repo, releases };
      if (releases.length === 0) {
        result.recentMergedPrs = await this.fetchMergedPrs(repo, 30);
      }
      return result;
    } catch {
      return { repo, releases: [], recentMergedPrs: await this.fetchMergedPrs(repo, 30) };
    }
  }

  private async fetchMergedPrs(repo: string, days: number): Promise<MergedPr[]> {
    try {
      const since = new Date(Date.now() - days * 24 * 60 * 60 * 1000).toISOString().split('T')[0];
      const res = await fetch(
        `https://api.github.com/repos/Xomware/${repo}/pulls?state=closed&sort=updated&direction=desc&per_page=20`,
        { headers: this.headers }
      );

      if (!res.ok) return [];

      const data = await res.json();
      return (data || [])
        .filter((pr: any) => pr.merged_at && pr.merged_at >= since)
        .slice(0, 5)
        .map((pr: any) => ({
          number: pr.number,
          title: pr.title,
          mergedAt: pr.merged_at,
          htmlUrl: pr.html_url,
          author: pr.user?.login || 'unknown',
        }));
    } catch {
      return [];
    }
  }
}
