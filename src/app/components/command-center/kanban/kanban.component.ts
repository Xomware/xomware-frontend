import { Component, OnInit } from '@angular/core';

export interface KanbanCard {
  id: string;
  title: string;
  description: string;
  labels: string[];
  repo?: string;
  issueUrl?: string;
  prUrl?: string;
  column: string;
  createdAt: string;
}

export interface KanbanColumn {
  id: string;
  title: string;
  icon: string;
  color: string;
}

@Component({
  selector: 'app-kanban',
  templateUrl: './kanban.component.html',
  styleUrls: ['./kanban.component.scss'],
})
export class KanbanComponent implements OnInit {
  columns: KanbanColumn[] = [
    { id: 'todo', title: 'To Do', icon: '📋', color: '#8a8a9a' },
    { id: 'in-progress', title: 'In Progress', icon: '🔨', color: '#00b4d8' },
    { id: 'in-review', title: 'In Review', icon: '👀', color: '#ff6b35' },
    { id: 'done', title: 'Done', icon: '✅', color: '#00ffab' },
  ];

  cards: KanbanCard[] = [];
  draggedCard: KanbanCard | null = null;
  showAddForm = false;
  addToColumn = '';
  newCard = { title: '', description: '', labels: '' };

  // Filtering
  repoFilter = '';
  repos: string[] = [];

  ngOnInit(): void {
    this.loadCards();
    this.repos = [...new Set(this.cards.map(c => c.repo).filter(Boolean) as string[])].sort();
  }

  getColumnCards(columnId: string): KanbanCard[] {
    return this.cards
      .filter(c => c.column === columnId)
      .filter(c => !this.repoFilter || c.repo === this.repoFilter);
  }

  get filteredCount(): number {
    return this.cards.filter(c => !this.repoFilter || c.repo === this.repoFilter).length;
  }

  onDragStart(card: KanbanCard): void {
    this.draggedCard = card;
  }

  onDragOver(event: DragEvent): void {
    event.preventDefault();
  }

  onDrop(event: DragEvent, columnId: string): void {
    event.preventDefault();
    if (this.draggedCard) {
      this.draggedCard.column = columnId;
      this.draggedCard = null;
      this.saveCards();
    }
  }

  openAddForm(columnId: string): void {
    this.addToColumn = columnId;
    this.showAddForm = true;
    this.newCard = { title: '', description: '', labels: '' };
  }

  addCard(): void {
    if (!this.newCard.title.trim()) return;
    const card: KanbanCard = {
      id: 'card-' + Date.now(),
      title: this.newCard.title.trim(),
      description: this.newCard.description.trim(),
      labels: this.newCard.labels
        .split(',')
        .map(l => l.trim())
        .filter(Boolean),
      column: this.addToColumn,
      createdAt: new Date().toISOString(),
    };
    this.cards.push(card);
    this.showAddForm = false;
    this.saveCards();
  }

  deleteCard(card: KanbanCard): void {
    this.cards = this.cards.filter(c => c.id !== card.id);
    this.saveCards();
  }

  private saveCards(): void {
    localStorage.setItem('xom_kanban', JSON.stringify(this.cards));
  }

  private loadCards(): void {
    const saved = localStorage.getItem('xom_kanban');
    if (saved) {
      try {
        const parsed = JSON.parse(saved);
        // If saved data is stale (fewer than the synced set), refresh
        if (parsed.length < 35) {
          this.cards = this.getDefaultCards();
          this.saveCards();
        } else {
          this.cards = parsed;
        }
      } catch {
        this.cards = this.getDefaultCards();
        this.saveCards();
      }
    } else {
      this.cards = this.getDefaultCards();
      this.saveCards();
    }
  }

  private getDefaultCards(): KanbanCard[] {
    return [
      // === XOMWARE-FRONTEND ===
      {
        id: 'xw-1', title: 'Upgrade Angular 16 → 18', description: '',
        labels: ['angular', 'upgrade'], repo: 'xomware-frontend',
        issueUrl: 'https://github.com/Xomware/xomware-frontend/issues/1',
        column: 'done', createdAt: '2026-02-21T00:00:00Z',
      },
      {
        id: 'xw-cmd', title: 'Command Center Dashboard', description: 'Kanban, config viewer, activity log, pixel office',
        labels: ['feature', 'dashboard'], repo: 'xomware-frontend',
        prUrl: 'https://github.com/Xomware/xomware-frontend/pull/3',
        column: 'done', createdAt: '2026-02-22T00:00:00Z',
      },
      {
        id: 'xw-infra', title: 'Infra Dashboard', description: 'Infrastructure status and monitoring dashboard',
        labels: ['feature', 'dashboard'], repo: 'xomware-frontend',
        column: 'done', createdAt: '2026-02-24T00:00:00Z',
      },

      // === XOMIFY-FRONTEND ===
      {
        id: 'xf-143', title: 'Upgrade Angular 16 → 18', description: '',
        labels: ['angular', 'upgrade'], repo: 'xomify-frontend',
        issueUrl: 'https://github.com/Xomware/xomify-frontend/issues/143',
        prUrl: 'https://github.com/Xomware/xomify-frontend/pull/146',
        column: 'done', createdAt: '2026-02-21T00:00:00Z',
      },
      {
        id: 'xf-144', title: 'Remove hardcoded base64 logo from env example', description: '',
        labels: ['security', 'cleanup'], repo: 'xomify-frontend',
        issueUrl: 'https://github.com/Xomware/xomify-frontend/issues/144',
        prUrl: 'https://github.com/Xomware/xomify-frontend/pull/147',
        column: 'done', createdAt: '2026-02-21T00:00:00Z',
      },
      {
        id: 'xf-145', title: 'Add CI/CD pipeline (GitHub Actions)', description: '',
        labels: ['devops', 'ci-cd'], repo: 'xomify-frontend',
        issueUrl: 'https://github.com/Xomware/xomify-frontend/issues/145',
        prUrl: 'https://github.com/Xomware/xomify-frontend/pull/148',
        column: 'done', createdAt: '2026-02-21T00:00:00Z',
      },
      {
        id: 'xf-162', title: 'Fix broken logo after base64 removal', description: '',
        labels: ['bug'], repo: 'xomify-frontend',
        issueUrl: 'https://github.com/Xomware/xomify-frontend/issues/162',
        prUrl: 'https://github.com/Xomware/xomify-frontend/pull/163',
        column: 'in-progress', createdAt: '2026-02-24T00:00:00Z',
      },

      // === XOMPER-FRONT-END ===
      {
        id: 'xp-45', title: 'Upgrade Angular 16 → 18', description: '',
        labels: ['angular', 'upgrade'], repo: 'xomper-front-end',
        issueUrl: 'https://github.com/Xomware/xomper-front-end/issues/45',
        prUrl: 'https://github.com/Xomware/xomper-front-end/pull/47',
        column: 'done', createdAt: '2026-02-21T00:00:00Z',
      },
      {
        id: 'xp-46', title: "Rename package from 'angular-sleeper' to 'xomper-frontend'", description: '',
        labels: ['cleanup'], repo: 'xomper-front-end',
        issueUrl: 'https://github.com/Xomware/xomper-front-end/issues/46',
        prUrl: 'https://github.com/Xomware/xomper-front-end/pull/48',
        column: 'done', createdAt: '2026-02-21T00:00:00Z',
      },

      // === XOMCLOUD-FRONTEND ===
      {
        id: 'xc-3', title: 'Upgrade Angular 17 → 18', description: '',
        labels: ['angular', 'upgrade'], repo: 'xomcloud-frontend',
        issueUrl: 'https://github.com/Xomware/xomcloud-frontend/issues/3',
        prUrl: 'https://github.com/Xomware/xomcloud-frontend/pull/5',
        column: 'done', createdAt: '2026-02-21T00:00:00Z',
      },
      {
        id: 'xc-4', title: 'Security: environment.ts placeholder secrets pattern', description: '',
        labels: ['security'], repo: 'xomcloud-frontend',
        issueUrl: 'https://github.com/Xomware/xomcloud-frontend/issues/4',
        prUrl: 'https://github.com/Xomware/xomcloud-frontend/pull/6',
        column: 'done', createdAt: '2026-02-21T00:00:00Z',
      },

      // === INFRASTRUCTURE ===
      {
        id: 'xi-32', title: 'Upgrade AWS provider 4.38 → 5.x', description: '',
        labels: ['terraform', 'infra'], repo: 'xomify-infrastructure',
        issueUrl: 'https://github.com/Xomware/xomify-infrastructure/issues/32',
        prUrl: 'https://github.com/Xomware/xomify-infrastructure/pull/35',
        column: 'done', createdAt: '2026-02-21T00:00:00Z',
      },
      {
        id: 'xi-33', title: 'Migrate from static AWS creds to OIDC', description: '',
        labels: ['security', 'infra'], repo: 'xomify-infrastructure',
        issueUrl: 'https://github.com/Xomware/xomify-infrastructure/issues/33',
        prUrl: 'https://github.com/Xomware/xomify-infrastructure/pull/34',
        column: 'done', createdAt: '2026-02-21T00:00:00Z',
      },
      {
        id: 'xi-s3', title: 'S3 backend migration', description: 'Migrate Terraform state to S3 backend',
        labels: ['terraform', 'infra'], repo: 'xomify-infrastructure',
        column: 'done', createdAt: '2026-02-24T00:00:00Z',
      },
      {
        id: 'xci-23', title: 'Upgrade AWS provider 4.38 → 5.x', description: '',
        labels: ['terraform', 'infra'], repo: 'xomcloud-infrastructure',
        issueUrl: 'https://github.com/Xomware/xomcloud-infrastructure/issues/23',
        prUrl: 'https://github.com/Xomware/xomcloud-infrastructure/pull/24',
        column: 'done', createdAt: '2026-02-21T00:00:00Z',
      },
      {
        id: 'xpi-64', title: 'Fix typo: lamdba → lambda', description: '',
        labels: ['bugfix', 'infra'], repo: 'xomper-infrastructure',
        issueUrl: 'https://github.com/Xomware/xomper-infrastructure/issues/64',
        prUrl: 'https://github.com/Xomware/xomper-infrastructure/pull/65',
        column: 'done', createdAt: '2026-02-21T00:00:00Z',
      },

      // === XOMIFY-IOS ===
      {
        id: 'xios-3', title: 'Add CI/CD pipeline (Xcode Cloud / GitHub Actions)', description: '',
        labels: ['devops', 'ios'], repo: 'xomify-ios',
        issueUrl: 'https://github.com/domgiordano/xomify-ios/issues/3',
        prUrl: 'https://github.com/domgiordano/xomify-ios/pull/5',
        column: 'done', createdAt: '2026-02-21T00:00:00Z',
      },
      {
        id: 'xios-4', title: 'Add app icon', description: '',
        labels: ['design', 'ios'], repo: 'xomify-ios',
        issueUrl: 'https://github.com/domgiordano/xomify-ios/issues/4',
        prUrl: 'https://github.com/domgiordano/xomify-ios/pull/6',
        column: 'done', createdAt: '2026-02-21T00:00:00Z',
      },

      // === XOMFIT-IOS ===
      {
        id: 'xfit-1', title: 'Project setup — Swift/SwiftUI scaffold, CI, dependencies', description: '',
        labels: ['setup', 'ios'], repo: 'xomfit-ios',
        issueUrl: 'https://github.com/Xomware/xomfit-ios/issues/1',
        column: 'done', createdAt: '2026-02-21T00:00:00Z',
      },
      {
        id: 'xfit-2', title: 'Auth — Sign up / Login (Apple, Google, Email)', description: '',
        labels: ['auth', 'ios'], repo: 'xomfit-ios',
        issueUrl: 'https://github.com/Xomware/xomfit-ios/issues/2',
        column: 'in-progress', createdAt: '2026-02-21T00:00:00Z',
      },
      {
        id: 'xfit-3', title: 'User Profile — Setup, avatar, bio, stats', description: '',
        labels: ['feature', 'ios'], repo: 'xomfit-ios',
        issueUrl: 'https://github.com/Xomware/xomfit-ios/issues/3',
        column: 'todo', createdAt: '2026-02-21T00:00:00Z',
      },
      {
        id: 'xfit-4', title: 'Exercise Library — Database with muscle groups', description: '',
        labels: ['feature', 'ios'], repo: 'xomfit-ios',
        issueUrl: 'https://github.com/Xomware/xomfit-ios/issues/4',
        column: 'done', createdAt: '2026-02-21T00:00:00Z',
      },
      {
        id: 'xfit-5', title: 'Workout Logger — Log sets, reps, weight in real-time', description: '',
        labels: ['feature', 'ios'], repo: 'xomfit-ios',
        issueUrl: 'https://github.com/Xomware/xomfit-ios/issues/5',
        column: 'todo', createdAt: '2026-02-21T00:00:00Z',
      },
      {
        id: 'xfit-6', title: 'Workout Builder — Create and save custom templates', description: '',
        labels: ['feature', 'ios'], repo: 'xomfit-ios',
        issueUrl: 'https://github.com/Xomware/xomfit-ios/issues/6',
        column: 'done', createdAt: '2026-02-21T00:00:00Z',
      },
      {
        id: 'xfit-7', title: 'PR Tracking — Auto-detect personal records', description: '',
        labels: ['feature', 'ios'], repo: 'xomfit-ios',
        issueUrl: 'https://github.com/Xomware/xomfit-ios/issues/7',
        column: 'todo', createdAt: '2026-02-21T00:00:00Z',
      },
      {
        id: 'xfit-8', title: 'Friends System — Add, follow, friend requests', description: '',
        labels: ['social', 'ios'], repo: 'xomfit-ios',
        issueUrl: 'https://github.com/Xomware/xomfit-ios/issues/8',
        column: 'todo', createdAt: '2026-02-21T00:00:00Z',
      },
      {
        id: 'xfit-9', title: 'Social Feed — See friends workouts, PRs, activity', description: '',
        labels: ['social', 'ios'], repo: 'xomfit-ios',
        issueUrl: 'https://github.com/Xomware/xomfit-ios/issues/9',
        column: 'todo', createdAt: '2026-02-21T00:00:00Z',
      },
      {
        id: 'xfit-10', title: 'Basic Analytics — Progress charts, volume tracking', description: '',
        labels: ['analytics', 'ios'], repo: 'xomfit-ios',
        issueUrl: 'https://github.com/Xomware/xomfit-ios/issues/10',
        column: 'todo', createdAt: '2026-02-21T00:00:00Z',
      },
      {
        id: 'xfit-11', title: 'AI Coach — Personalized workout recommendations', description: '',
        labels: ['ai', 'ios'], repo: 'xomfit-ios',
        issueUrl: 'https://github.com/Xomware/xomfit-ios/issues/11',
        column: 'todo', createdAt: '2026-02-21T00:00:00Z',
      },
      {
        id: 'xfit-12', title: 'Stick Figure Animations — Exercise form guides', description: '',
        labels: ['design', 'ios'], repo: 'xomfit-ios',
        issueUrl: 'https://github.com/Xomware/xomfit-ios/issues/12',
        column: 'todo', createdAt: '2026-02-21T00:00:00Z',
      },
      {
        id: 'xfit-13', title: 'Workout Challenges — Compete with friends', description: '',
        labels: ['social', 'ios'], repo: 'xomfit-ios',
        issueUrl: 'https://github.com/Xomware/xomfit-ios/issues/13',
        column: 'todo', createdAt: '2026-02-21T00:00:00Z',
      },
      {
        id: 'xfit-14', title: 'Form Check Videos — Attach clips to sets', description: '',
        labels: ['feature', 'ios'], repo: 'xomfit-ios',
        issueUrl: 'https://github.com/Xomware/xomfit-ios/issues/14',
        column: 'done', createdAt: '2026-02-21T00:00:00Z',
      },
      {
        id: 'xfit-16', title: 'Live Workout Mode — Real-time activity for friends', description: '',
        labels: ['social', 'ios'], repo: 'xomfit-ios',
        issueUrl: 'https://github.com/Xomware/xomfit-ios/issues/16',
        column: 'todo', createdAt: '2026-02-21T00:00:00Z',
      },

      // === COMMAND CENTER META TASKS ===
      {
        id: 'meta-office-view', title: 'Office View agent update', description: 'Agent status updates for Pixel Office view',
        labels: ['agent', 'feature'], repo: 'xomware-frontend',
        column: 'done', createdAt: '2026-02-24T00:00:00Z',
      },
      {
        id: 'meta-2', title: 'Supabase backend for Kanban + activity data', description: 'Persistent storage, real-time sync',
        labels: ['feature', 'backend'],
        column: 'todo', createdAt: '2026-02-22T00:00:00Z',
      },
    ];
  }
}
