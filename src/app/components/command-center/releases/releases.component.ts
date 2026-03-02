import { Component, OnInit, OnDestroy } from '@angular/core';
import { trigger, state, style, transition, animate } from '@angular/animations';
import { ReleasesService, RepoReleases, Release, MergedPr } from '../../../services/releases.service';

const REPO_COLORS: Record<string, string> = {
  'Float': '#00b4d8',
  'xomfit-ios': '#22c55e',
  'xomify-frontend': '#a855f7',
  'xomware-frontend': '#f97316',
};

interface TimelineItem {
  type: 'release' | 'pr';
  repo: string;
  date: string;
  release?: Release;
  pr?: MergedPr;
}

@Component({
  selector: 'app-releases',
  templateUrl: './releases.component.html',
  styleUrls: ['./releases.component.scss'],
  animations: [
    trigger('expandCollapse', [
      state('collapsed', style({ height: '0', overflow: 'hidden', opacity: 0 })),
      state('expanded', style({ height: '*', overflow: 'visible', opacity: 1 })),
      transition('collapsed <=> expanded', animate('200ms ease-in-out')),
    ]),
  ],
})
export class ReleasesComponent implements OnInit, OnDestroy {
  allData: RepoReleases[] = [];
  timelineItems: TimelineItem[] = [];
  loading = true;
  error = '';

  // Filters
  repos = Object.keys(REPO_COLORS);
  selectedRepos: Set<string> = new Set(this.repos);
  includePrerelease = false;
  dateRange: '7d' | '30d' | '90d' | 'all' = 'all';

  // Stats
  releasesThisMonth = 0;
  mostActiveRepo = '';
  daysSinceLastRelease = 0;

  // Expand state
  expandedIds = new Set<string>();
  expandedPrSections = new Set<string>();

  private refreshInterval: any;

  constructor(private releasesService: ReleasesService) {}

  ngOnInit(): void {
    this.loadReleases();
    this.refreshInterval = setInterval(() => this.loadReleases(), 5 * 60 * 1000);
  }

  ngOnDestroy(): void {
    if (this.refreshInterval) clearInterval(this.refreshInterval);
  }

  loadReleases(): void {
    this.loading = true;
    this.releasesService.getReleases().subscribe({
      next: data => {
        this.allData = data;
        this.applyFilters();
        this.computeStats();
        this.loading = false;
      },
      error: () => {
        this.error = 'Failed to load releases';
        this.loading = false;
      },
    });
  }

  toggleRepo(repo: string): void {
    if (this.selectedRepos.has(repo)) {
      this.selectedRepos.delete(repo);
    } else {
      this.selectedRepos.add(repo);
    }
    this.applyFilters();
  }

  setDateRange(range: '7d' | '30d' | '90d' | 'all'): void {
    this.dateRange = range;
    this.applyFilters();
  }

  togglePrerelease(): void {
    this.includePrerelease = !this.includePrerelease;
    this.applyFilters();
  }

  toggleExpand(id: string): void {
    if (this.expandedIds.has(id)) {
      this.expandedIds.delete(id);
    } else {
      this.expandedIds.add(id);
    }
  }

  togglePrSection(repo: string): void {
    if (this.expandedPrSections.has(repo)) {
      this.expandedPrSections.delete(repo);
    } else {
      this.expandedPrSections.add(repo);
    }
  }

  isExpanded(id: string): boolean {
    return this.expandedIds.has(id);
  }

  getRepoColor(repo: string): string {
    return REPO_COLORS[repo] || '#6b7280';
  }

  getDateCutoff(): Date | null {
    if (this.dateRange === 'all') return null;
    const days = parseInt(this.dateRange);
    return new Date(Date.now() - days * 24 * 60 * 60 * 1000);
  }

  applyFilters(): void {
    const cutoff = this.getDateCutoff();
    const items: TimelineItem[] = [];

    for (const repoData of this.allData) {
      if (!this.selectedRepos.has(repoData.repo)) continue;

      for (const release of repoData.releases) {
        if (!this.includePrerelease && release.isPrerelease) continue;
        if (cutoff && new Date(release.publishedAt) < cutoff) continue;
        items.push({
          type: 'release',
          repo: repoData.repo,
          date: release.publishedAt,
          release,
        });
      }
    }

    items.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
    this.timelineItems = items;
  }

  computeStats(): void {
    const now = new Date();
    const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);
    const repoCounts: Record<string, number> = {};
    let latestDate: Date | null = null;
    let totalThisMonth = 0;

    for (const repoData of this.allData) {
      repoCounts[repoData.repo] = repoData.releases.length;
      for (const release of repoData.releases) {
        const d = new Date(release.publishedAt);
        if (d >= monthStart) totalThisMonth++;
        if (!latestDate || d > latestDate) latestDate = d;
      }
    }

    this.releasesThisMonth = totalThisMonth;
    this.mostActiveRepo = Object.entries(repoCounts)
      .sort(([, a], [, b]) => b - a)[0]?.[0] || 'N/A';

    if (latestDate) {
      this.daysSinceLastRelease = Math.floor(
        (now.getTime() - latestDate.getTime()) / (1000 * 60 * 60 * 24)
      );
    }
  }

  getReposWithPrFallback(): RepoReleases[] {
    return this.allData.filter(
      r => this.selectedRepos.has(r.repo) && r.recentMergedPrs && r.recentMergedPrs.length > 0
    );
  }

  formatDate(dateStr: string): string {
    return new Date(dateStr).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
    });
  }
}
