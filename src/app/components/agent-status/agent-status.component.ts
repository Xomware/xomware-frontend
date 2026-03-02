import { Component, OnInit, OnDestroy, HostListener } from '@angular/core';
import { environment } from '../../../environments/environment';

interface BoardCard {
  id: string;
  title: string;
  repo?: string;
  assignee?: string;
  column: string;
  createdAt: string;
  closedAt?: string;
}

@Component({
  selector: 'app-agent-status',
  templateUrl: './agent-status.component.html',
  styleUrls: ['./agent-status.component.scss'],
})
export class AgentStatusComponent implements OnInit, OnDestroy {
  expanded = false;
  loading = true;

  activeCards: BoardCard[] = [];
  reviewCards: BoardCard[] = [];
  doneToday: BoardCard[] = [];
  velocityCount = 0;

  private pollTimer: ReturnType<typeof setInterval> | null = null;

  ngOnInit(): void {
    this.fetchBoard();
    this.pollTimer = setInterval(() => this.fetchBoard(), 30_000);
  }

  ngOnDestroy(): void {
    if (this.pollTimer) clearInterval(this.pollTimer);
  }

  toggle(): void {
    this.expanded = !this.expanded;
  }

  close(): void {
    this.expanded = false;
  }

  @HostListener('document:keydown.escape')
  onEsc(): void {
    this.close();
  }

  private async fetchBoard(): Promise<void> {
    try {
      const res = await fetch(`${environment.boardApiUrl}/status/board`, {
        headers: { 'X-Auth-Hash': environment.boardAuthHash },
      });
      if (!res.ok) return;
      const data = await res.json();
      const cards: BoardCard[] = data.cards || [];

      this.activeCards = cards.filter(c => c.column === 'in-progress');
      this.reviewCards = cards.filter(c => c.column === 'in-review');

      const todayStr = new Date().toISOString().slice(0, 10);
      const doneCards = cards.filter(
        c => c.column === 'done' && c.closedAt && c.closedAt.slice(0, 10) === todayStr
      );
      this.velocityCount = doneCards.length;
      this.doneToday = doneCards.slice(-5).reverse();
    } catch {
      // silent
    } finally {
      this.loading = false;
    }
  }
}
