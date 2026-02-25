import { Component, OnInit, OnDestroy } from '@angular/core';
import { BoardService, BoardCard, BoardColumn } from '../../../services/board.service';
import { Subscription } from 'rxjs';

@Component({
  selector: 'app-kanban',
  templateUrl: './kanban.component.html',
  styleUrls: ['./kanban.component.scss'],
})
export class KanbanComponent implements OnInit, OnDestroy {
  columns: BoardColumn[] = [
    { id: 'dom-todo', title: 'Dom Todo', icon: '👤', color: '#3b82f6' },
    { id: 'blocked-by-dom', title: 'Blocked by Dom', icon: '🚫', color: '#ef4444' },
    { id: 'todo', title: 'Agent Todo', icon: '📋', color: '#8a8a9a' },
    { id: 'in-progress', title: 'In Progress', icon: '🔨', color: '#00b4d8' },
    { id: 'in-review', title: 'In Review', icon: '👀', color: '#ff6b35' },
    { id: 'dom-done', title: 'Dom Done', icon: '👍', color: '#22c55e' },
    { id: 'done', title: 'Done', icon: '✅', color: '#00ffab' },
  ];

  cards: BoardCard[] = [];
  lastUpdated: string | null = null;
  isLive = false;

  // Filtering
  repoFilter = '';
  repos: string[] = [];

  private boardSub?: Subscription;

  constructor(private boardService: BoardService) {}

  ngOnInit(): void {
    this.boardService.startPolling(30_000);
    this.boardSub = this.boardService.board$.subscribe(data => {
      if (data.cards.length > 0) {
        this.cards = data.cards;
        if (data.columns.length > 0) {
          this.columns = data.columns;
        }
        this.lastUpdated = data.updatedAt;
        this.isLive = true;
      }
      this.repos = [...new Set(this.cards.map(c => c.repo).filter(Boolean) as string[])].sort();
    });
  }

  ngOnDestroy(): void {
    this.boardService.stopPolling();
    this.boardSub?.unsubscribe();
  }

  getColumnCards(columnId: string): BoardCard[] {
    return this.cards
      .filter(c => c.column === columnId)
      .filter(c => !this.repoFilter || c.repo === this.repoFilter);
  }

  get filteredCount(): number {
    return this.cards.filter(c => !this.repoFilter || c.repo === this.repoFilter).length;
  }

  get liveStatus(): string {
    if (!this.lastUpdated) return 'Connecting...';
    const ago = Math.round((Date.now() - new Date(this.lastUpdated).getTime()) / 1000);
    if (ago < 60) return `Live — updated ${ago}s ago`;
    return `Updated ${Math.round(ago / 60)}m ago`;
  }
}
