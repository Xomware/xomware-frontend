import { Injectable, OnDestroy } from '@angular/core';
import { BehaviorSubject } from 'rxjs';
import { AuthService } from './auth.service';
import { environment } from '../../environments/environment';

export interface BoardCard {
  id: string;
  title: string;
  description: string;
  labels: string[];
  repo?: string;
  issueUrl?: string;
  prUrl?: string;
  column: string;
  createdAt: string;
  assignee?: string;
}

export interface BoardColumn {
  id: string;
  title: string;
  icon: string;
  color: string;
}

export interface BoardStatusResponse {
  updatedAt: string | null;
  columns: BoardColumn[];
  cards: BoardCard[];
}

@Injectable({ providedIn: 'root' })
export class BoardService implements OnDestroy {
  private readonly url = environment.apiBaseUrl + '/status/board';
  private pollTimer: ReturnType<typeof setInterval> | null = null;

  readonly board$ = new BehaviorSubject<BoardStatusResponse>({
    updatedAt: null,
    columns: [],
    cards: [],
  });

  constructor(private auth: AuthService) {}

  startPolling(intervalMs = 30_000): void {
    this.fetch(); // immediate first fetch
    this.stopPolling();
    this.pollTimer = setInterval(() => this.fetch(), intervalMs);
  }

  stopPolling(): void {
    if (this.pollTimer) {
      clearInterval(this.pollTimer);
      this.pollTimer = null;
    }
  }

  ngOnDestroy(): void {
    this.stopPolling();
  }

  private async fetch(): Promise<void> {
    try {
      const res = await fetch(this.url, {
        headers: {
          'X-Auth-Hash': this.auth.getPassphraseHash(),
        },
      });
      if (!res.ok) return;
      const data: BoardStatusResponse = await res.json();
      this.board$.next(data);
    } catch {
      // silent fail — board just shows stale data
    }
  }
}