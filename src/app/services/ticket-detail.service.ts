import { Injectable, NgZone } from '@angular/core';
import { AuthService } from './auth.service';
import { environment } from '../../environments/environment';

export interface GitHubLabel {
  name: string;
  color: string;
  description?: string;
}

export interface GitHubUser {
  login: string;
  avatar_url: string;
  html_url: string;
}

export interface GitHubPR {
  number: number;
  title: string;
  html_url: string;
  state: string;
  merged: boolean;
  draft: boolean;
}

export interface TicketDetail {
  number: number;
  title: string;
  body: string;
  state: string;
  labels: GitHubLabel[];
  assignee: GitHubUser | null;
  assignees: GitHubUser[];
  created_at: string;
  updated_at: string;
  html_url: string;
  repository_url: string;
  pull_request?: { html_url: string };
  linkedPRs: GitHubPR[];
  relatedIssues: { number: number; title: string; state: string; html_url: string }[];
  repoOwner: string;
  repoName: string;
}

@Injectable({ providedIn: 'root' })
export class TicketDetailService {
  private readonly API_BASE = environment.apiBaseUrl;

  constructor(
    private auth: AuthService,
    private ngZone: NgZone,
  ) {}

  async fetchTicket(owner: string, repo: string, issueNumber: number): Promise<TicketDetail | null> {
    try {
      const res = await fetch(
        `${this.API_BASE}/status/ticket/${owner}/${repo}/${issueNumber}`,
        {
          headers: {
            'Accept': 'application/json',
            'X-Auth-Hash': this.auth.getPassphraseHash(),
          },
        }
      );
      if (!res.ok) return null;
      const ticket = await res.json();

      // relatedIssues not provided by proxy yet, default to empty
      if (!ticket.relatedIssues) {
        ticket.relatedIssues = [];
      }

      return ticket as TicketDetail;
    } catch (err) {
      console.error('Failed to fetch ticket:', err);
      return null;
    }
  }

  parseIssueUrl(url: string): { owner: string; repo: string; issueNumber: number } | null {
    // Parse https://github.com/Owner/Repo/issues/123
    const match = url.match(/github\.com\/([^/]+)\/([^/]+)\/issues\/(\d+)/);
    if (!match) return null;
    return { owner: match[1], repo: match[2], issueNumber: parseInt(match[3], 10) };
  }
}
