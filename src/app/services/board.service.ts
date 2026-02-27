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
  archivedCards?: BoardCard[];
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

  async moveCard(cardId: string, targetColumn: string): Promise<boolean> {
    try {
      const res = await fetch(environment.apiBaseUrl + '/status/board/move', {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'X-Auth-Hash': this.auth.getPassphraseHash(),
        },
        body: JSON.stringify({ cardId, targetColumn }),
      });
      if (!res.ok) return false;
      // Optimistically update local state
      const current = this.board$.value;
      const updatedCards = current.cards.map(c =>
        c.id === cardId ? { ...c, column: targetColumn } : c
      );
      this.board$.next({ ...current, cards: updatedCards, updatedAt: new Date().toISOString() });
      return true;
    } catch {
      return false;
    }
  }

  async fetch(): Promise<void> {
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