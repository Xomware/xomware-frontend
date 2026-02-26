import { Component, OnInit, OnDestroy } from '@angular/core';
import { BoardService, BoardCard, BoardColumn } from '../../../services/board.service';
import { InboxService, InboxItem } from '../../../services/inbox.service';
import { Subscription } from 'rxjs';

@Component({
  selector: 'app-kanban',
  templateUrl: './kanban.component.html',
  styleUrls: ['./kanban.component.scss'],
})
export class KanbanComponent implements OnInit, OnDestroy {
  columns: BoardColumn[] = [
    { id: 'dom-todo', title: 'Dom Todo', icon: '👤', color: '#3b82f6' },
    { id: 'dom-done', title: 'Dom Done', icon: '👍', color: '#22c55e' },
    { id: 'blocked-by-dom', title: 'Blocked by Dom', icon: '🚫', color: '#ef4444' },
    { id: 'todo', title: 'Agent Todo', icon: '📋', color: '#8a8a9a' },
    { id: 'in-progress', title: 'In Progress', icon: '🔨', color: '#00b4d8' },
    { id: 'in-review', title: 'In Review', icon: '👀', color: '#ff6b35' },
    { id: 'done', title: 'Done', icon: '✅', color: '#00ffab' },
  ];

  cards: BoardCard[] = [];
  archivedCards: BoardCard[] = [];
  lastUpdated: string | null = null;
  isLive = false;
  showArchive = false;

  // Filtering
  repoFilter = '';
  repos: string[] = [];

  // Inbox
  showAddIdea = false;
  ideaTitle = '';
  ideaDescription = '';
  ideaRepo = '';
  submittingIdea = false;
  pendingIdeas: InboxItem[] = [];

  private boardSub?: Subscription;
  private inboxSub?: Subscription;

  constructor(
    private boardService: BoardService,
    private inboxService: InboxService,
  ) {}

  ngOnInit(): void {
    this.boardService.startPolling(30_000);
    this.boardSub = this.boardService.board$.subscribe(data => {
      if (data.cards.length > 0 || (data.archivedCards && data.archivedCards.length > 0)) {
        this.cards = data.cards.filter(c => c.column !== 'archived');
        this.archivedCards = data.archivedCards || data.cards.filter(c => c.column === 'archived');
        this.lastUpdated = data.updatedAt;
        this.isLive = true;
      }
      this.repos = [...new Set(this.cards.map(c => c.repo).filter(Boolean) as string[])].sort();
    });

    this.inboxService.fetch();
    this.inboxSub = this.inboxService.inbox$.subscribe(items => {
      this.pendingIdeas = items.filter(i => i.status === 'pending');
    });
  }

  ngOnDestroy(): void {
    this.boardService.stopPolling();
    this.boardSub?.unsubscribe();
    this.inboxSub?.unsubscribe();
  }

  getColumnCards(columnId: string): BoardCard[] {
    return this.cards
      .filter(c => c.column === columnId)
      .filter(c => !this.repoFilter || c.repo === this.repoFilter);
  }

  get filteredCount(): number {
    return this.cards.filter(c => !this.repoFilter || c.repo === this.repoFilter).length;
  }

  get filteredArchive(): BoardCard[] {
    return this.archivedCards
      .filter(c => !this.repoFilter || c.repo === this.repoFilter);
  }

  dragCardId: string | null = null;

  onDragStart(event: DragEvent, card: BoardCard): void {
    this.dragCardId = card.id;
    if (event.dataTransfer) {
      event.dataTransfer.effectAllowed = 'move';
      event.dataTransfer.setData('text/plain', card.id);
    }
  }

  onDragOver(event: DragEvent): void {
    event.preventDefault();
    if (event.dataTransfer) {
      event.dataTransfer.dropEffect = 'move';
    }
  }

  onDragEnter(event: DragEvent, columnId: string): void {
    event.preventDefault();
    const el = (event.currentTarget as HTMLElement);
    el.classList.add('drag-over');
  }

  onDragLeave(event: DragEvent): void {
    const el = (event.currentTarget as HTMLElement);
    el.classList.remove('drag-over');
  }

  async onDrop(event: DragEvent, columnId: string): Promise<void> {
    event.preventDefault();
    const el = (event.currentTarget as HTMLElement);
    el.classList.remove('drag-over');

    const cardId = event.dataTransfer?.getData('text/plain') || this.dragCardId;
    if (!cardId) return;

    // Don't do anything if dropped in same column
    const card = this.cards.find(c => c.id === cardId);
    if (card && card.column === columnId) return;

    const success = await this.boardService.moveCard(cardId, columnId);
    if (!success) {
      console.error('Failed to move card');
    }
    this.dragCardId = null;
  }

  async submitIdea(): Promise<void> {
    if (!this.ideaTitle.trim() || this.submittingIdea) return;
    this.submittingIdea = true;
    const success = await this.inboxService.addIdea(
      this.ideaTitle.trim(),
      this.ideaDescription.trim(),
      this.ideaRepo.trim(),
    );
    this.submittingIdea = false;
    if (success) {
      this.ideaTitle = '';
      this.ideaDescription = '';
      this.ideaRepo = '';
      this.showAddIdea = false;
    }
  }

  onDragEnd(): void {
    this.dragCardId = null;
  }

  get liveStatus(): string {
    if (!this.lastUpdated) return 'Connecting...';
    const ago = Math.round((Date.now() - new Date(this.lastUpdated).getTime()) / 1000);
    if (ago < 60) return `Live — updated ${ago}s ago`;
    return `Updated ${Math.round(ago / 60)}m ago`;
  }
}
