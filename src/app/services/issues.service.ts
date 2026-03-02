import { Injectable } from '@angular/core';

export interface GitHubIssueLabel {
  name: string;
  color: string;
}

export interface GitHubIssueAssignee {
  login: string;
  avatar_url: string;
}

export interface GitHubIssue {
  number: number;
  title: string;
  labels: GitHubIssueLabel[];
  assignee: GitHubIssueAssignee | null;
  created_at: string;
  comments: number;
  html_url: string;
  pull_request?: unknown;
  repository_url: string;
}

export interface RepoIssues {
  repo: string;
  issues: GitHubIssue[];
}

interface CacheEntry {
  data: GitHubIssue[];
  timestamp: number;
}

@Injectable({ providedIn: 'root' })
export class IssuesService {
  private readonly API = 'https://api.github.com';
  private readonly ORG = 'Xomware';
  private readonly CACHE_TTL = 120_000;
  private readonly DELAY = 300;

  private cache = new Map<string, CacheEntry>();

  async fetchAllIssues(): Promise<RepoIssues[]> {
    const repos = await this.fetchRepos();
    const results: RepoIssues[] = [];

    for (let i = 0; i < repos.length; i++) {
      const repo = repos[i];
      if (i > 0) await this.delay(this.DELAY);
      const issues = await this.fetchRepoIssues(repo);
      if (issues.length > 0) {
        results.push({ repo, issues });
      }
    }

    results.sort((a, b) => b.issues.length - a.issues.length);
    return results;
  }

  private async fetchRepos(): Promise<string[]> {
    try {
      const res = await fetch(`${this.API}/orgs/${this.ORG}/repos?per_page=100`, {
        headers: { Accept: 'application/vnd.github.v3+json' },
      });
      if (!res.ok) return [];
      const data = await res.json();
      return data.map((r: { name: string }) => r.name).sort();
    } catch {
      return [];
    }
  }

  private async fetchRepoIssues(repo: string): Promise<GitHubIssue[]> {
    const cached = this.cache.get(repo);
    if (cached && Date.now() - cached.timestamp < this.CACHE_TTL) {
      return cached.data;
    }

    try {
      const res = await fetch(
        `${this.API}/repos/${this.ORG}/${repo}/issues?state=open&per_page=100`,
        { headers: { Accept: 'application/vnd.github.v3+json' } }
      );
      if (!res.ok) return [];
      const data: GitHubIssue[] = await res.json();
      const issues = data.filter(i => !i.pull_request);
      this.cache.set(repo, { data: issues, timestamp: Date.now() });
      return issues;
    } catch {
      return [];
    }
  }

  private delay(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }
}
