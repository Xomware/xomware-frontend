import { Component, OnInit, OnDestroy } from '@angular/core';
import { BoardService, BoardCard, BoardColumn } from '../../../services/board.service';
import { Subscription } from 'rxjs';

interface VelocityDay {
  label: string;
  date: string;
  count: number;
}

interface FunnelEntry {
  column: string;
  count: number;
  color: string;
  icon: string;
}

interface Contributor {
  username: string;
  avatar: string;
  count: number;
}

interface RepoHealth {
  name: string;
  openPRs: number;
}

@Component({
  selector: 'app-analytics-dashboard',
  templateUrl: './analytics-dashboard.component.html',
  styleUrls: ['./analytics-dashboard.component.scss'],
})
export class AnalyticsDashboardComponent implements OnInit, OnDestroy {
  // Summary
  totalItems = 0;
  shippedToday = 0;
  inProgress = 0;
  totalOpenPRs = 0;

  // Charts
  velocity: VelocityDay[] = [];
  maxVelocity = 1;
  funnel: FunnelEntry[] = [];
  maxFunnel = 1;
  contributors: Contributor[] = [];
  maxContrib = 1;
  avgCycleTime = 0;
  cycleTimeCount = 0;
  repoHealth: RepoHealth[] = [];
  maxRepoPRs = 1;

  loading = true;
  private sub?: Subscription;

  private readonly funnelConfig: Record<string, { color: string; icon: string; order: number }> = {
    'Todo': { color: '#8a8a9a', icon: '📋', order: 0 },
    'In Progress': { color: '#00b4d8', icon: '🔨', order: 1 },
    'In Review': { color: '#9c0abf', icon: '👀', order: 2 },
    'Done': { color: '#00ffab', icon: '✅', order: 3 },
  };

  constructor(private boardService: BoardService) {}

  ngOnInit(): void {
    this.boardService.startPolling(60_000);
    this.sub = this.boardService.board$.subscribe(board => {
      if (!board.cards.length && !board.columns.length) return;
      this.processBoard(board.cards, board.columns, board.archivedCards || []);
      this.loading = false;
    });
    this.fetchGitHubData();
  }

  ngOnDestroy(): void {
    this.sub?.unsubscribe();
    this.boardService.stopPolling();
  }

  private processBoard(cards: BoardCard[], columns: BoardColumn[], archived: BoardCard[]): void {
    const allCards = [...cards, ...archived];
    const now = new Date();
    const todayStr = now.toISOString().slice(0, 10);

    // Summary
    this.totalItems = cards.length;
    this.shippedToday = allCards.filter(c =>
      c.column === 'Done' && c.createdAt && c.createdAt.slice(0, 10) === todayStr
    ).length;
    // Also count archived cards closed today
    this.shippedToday += archived.filter(c => {
      // Use any date field available
      return false; // archived don't have closedAt in current model
    }).length;
    this.inProgress = cards.filter(c => c.column === 'In Progress').length;

    // Velocity — last 14 days based on cards in Done column
    // Since we don't have closedAt, we'll show current board state
    const velocityMap: Record<string, number> = {};
    for (let i = 13; i >= 0; i--) {
      const d = new Date(now);
      d.setDate(d.getDate() - i);
      velocityMap[d.toISOString().slice(0, 10)] = 0;
    }
    // Count done cards by createdAt as proxy (best we have)
    allCards
      .filter(c => c.column === 'Done')
      .forEach(c => {
        if (c.createdAt) {
          const dateKey = c.createdAt.slice(0, 10);
          if (velocityMap[dateKey] !== undefined) {
            velocityMap[dateKey]++;
          }
        }
      });
    const dayNames = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
    this.velocity = Object.entries(velocityMap).map(([date, count]) => ({
      date,
      label: dayNames[new Date(date + 'T12:00:00').getDay()],
      count,
    }));
    this.maxVelocity = Math.max(1, ...this.velocity.map(v => v.count));

    // Funnel
    const columnCounts: Record<string, number> = {};
    cards.forEach(c => {
      columnCounts[c.column] = (columnCounts[c.column] || 0) + 1;
    });
    this.funnel = Object.entries(this.funnelConfig)
      .sort((a, b) => a[1].order - b[1].order)
      .map(([col, cfg]) => ({
        column: col,
        count: columnCounts[col] || 0,
        color: cfg.color,
        icon: cfg.icon,
      }));
    this.maxFunnel = Math.max(1, ...this.funnel.map(f => f.count));

    // Contributors (from Done cards)
    const contribMap: Record<string, number> = {};
    allCards
      .filter(c => c.column === 'Done' && c.assignee)
      .forEach(c => {
        contribMap[c.assignee!] = (contribMap[c.assignee!] || 0) + 1;
      });
    this.contributors = Object.entries(contribMap)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 5)
      .map(([username, count]) => ({
        username,
        avatar: `https://github.com/${username}.png?size=40`,
        count,
      }));
    this.maxContrib = Math.max(1, ...this.contributors.map(c => c.count));

    // Cycle time — not available without closedAt, show placeholder
    this.avgCycleTime = 0;
    this.cycleTimeCount = 0;
  }

  private async fetchGitHubData(): Promise<void> {
    try {
      const res = await fetch('https://api.github.com/orgs/Xomware/repos?per_page=100&sort=updated');
      if (!res.ok) return;
      const repos: any[] = await res.json();

      let totalPRs = 0;
      const health: RepoHealth[] = [];

      // Fetch open PR counts in parallel (limit to top 10 repos)
      const topRepos = repos.slice(0, 10);
      const prResults = await Promise.allSettled(
        topRepos.map(async (repo: any) => {
          const prRes = await fetch(
            `https://api.github.com/repos/Xomware/${repo.name}/pulls?state=open&per_page=100`
          );
          if (!prRes.ok) return { name: repo.name, openPRs: 0 };
          const prs: any[] = await prRes.json();
          return { name: repo.name, openPRs: prs.length };
        })
      );

      prResults.forEach(r => {
        if (r.status === 'fulfilled') {
          health.push(r.value);
          totalPRs += r.value.openPRs;
        }
      });

      this.totalOpenPRs = totalPRs;
      this.repoHealth = health.filter(h => h.openPRs > 0).sort((a, b) => b.openPRs - a.openPRs);
      this.maxRepoPRs = Math.max(1, ...this.repoHealth.map(r => r.openPRs));
    } catch {
      // silent fail
    }
  }
}
