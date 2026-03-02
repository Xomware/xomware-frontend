import { Injectable } from '@angular/core';
import { Observable, of, timer, from, concat } from 'rxjs';
import { map, switchMap, shareReplay, catchError, concatMap, delay, toArray } from 'rxjs/operators';

export interface WorkflowRun {
  repoName: string;
  workflowName: string;
  status: string;
  conclusion: string | null;
  htmlUrl: string;
  createdAt: string;
  updatedAt: string;
  headBranch: string;
}

export interface RepoCI {
  repoName: string;
  repoUrl: string;
  latestRun: WorkflowRun | null;
  loading: boolean;
}

export type CIStatus = 'success' | 'failure' | 'cancelled' | 'in_progress' | 'none';

@Injectable({ providedIn: 'root' })
export class WorkflowRunsService {
  private reposCache$: Observable<any[]> | null = null;
  private reposCacheTime = 0;
  private runCache = new Map<string, { data: WorkflowRun | null; time: number }>();
  private readonly CACHE_TTL = 30000;

  getRepos(): Observable<any[]> {
    const now = Date.now();
    if (this.reposCache$ && now - this.reposCacheTime < this.CACHE_TTL) {
      return this.reposCache$;
    }
    this.reposCacheTime = now;
    this.reposCache$ = from(
      fetch('https://api.github.com/orgs/Xomware/repos?per_page=100')
        .then(r => r.json())
    ).pipe(
      map((repos: any[]) =>
        repos
          .filter((r: any) => !r.archived && !r.fork)
          .sort((a: any, b: any) => a.name.localeCompare(b.name))
      ),
      shareReplay(1),
      catchError(() => of([]))
    );
    return this.reposCache$;
  }

  getLatestWorkflowRun(repo: string): Observable<WorkflowRun | null> {
    const now = Date.now();
    const cached = this.runCache.get(repo);
    if (cached && now - cached.time < this.CACHE_TTL) {
      return of(cached.data);
    }

    return from(
      fetch(`https://api.github.com/repos/Xomware/${repo}/actions/runs?per_page=3`)
        .then(r => r.json())
    ).pipe(
      map((data: any) => {
        const runs = data.workflow_runs;
        if (!runs || runs.length === 0) {
          this.runCache.set(repo, { data: null, time: Date.now() });
          return null;
        }
        const run = runs[0];
        const result: WorkflowRun = {
          repoName: repo,
          workflowName: run.name,
          status: run.status,
          conclusion: run.conclusion,
          htmlUrl: run.html_url,
          createdAt: run.created_at,
          updatedAt: run.updated_at,
          headBranch: run.head_branch,
        };
        this.runCache.set(repo, { data: result, time: Date.now() });
        return result;
      }),
      catchError(() => {
        this.runCache.set(repo, { data: null, time: Date.now() });
        return of(null);
      })
    );
  }

  getAllRepoCI(): Observable<RepoCI[]> {
    return this.getRepos().pipe(
      switchMap((repos: any[]) => {
        if (repos.length === 0) return of([]);
        // Sequential with 200ms delay
        const requests = repos.map((repo: any) =>
          this.getLatestWorkflowRun(repo.name).pipe(
            map(run => ({
              repoName: repo.name,
              repoUrl: repo.html_url,
              latestRun: run,
              loading: false,
            } as RepoCI)),
            delay(200)
          )
        );
        return concat(...requests).pipe(toArray());
      })
    );
  }

  getStatus(repo: RepoCI): CIStatus {
    if (!repo.latestRun) return 'none';
    if (repo.latestRun.status === 'in_progress' || repo.latestRun.status === 'queued') return 'in_progress';
    if (repo.latestRun.conclusion === 'success') return 'success';
    if (repo.latestRun.conclusion === 'failure') return 'failure';
    if (repo.latestRun.conclusion === 'cancelled') return 'cancelled';
    return 'none';
  }
}
