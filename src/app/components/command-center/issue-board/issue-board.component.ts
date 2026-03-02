import { Component, OnInit, OnDestroy } from '@angular/core';
import { IssuesService, RepoIssues, GitHubIssue } from '../../../services/issues.service';

type FilterTab = 'all' | 'bugs' | 'features' | 'unassigned' | 'jarvis';
type SortMode = 'newest' | 'oldest' | 'comments';

@Component({
  selector: 'app-issue-board',
  templateUrl: './issue-board.component.html',
  styleUrls: ['./issue-board.component.scss'],
})
export class IssueBoardComponent implements OnInit, OnDestroy {
  repoIssues: RepoIssues[] = [];
  loading = true;
  activeFilter: FilterTab = 'all';
  sortMode: SortMode = 'newest';
  collapsedRepos = new Set<string>();

  private refreshTimer?: ReturnType<typeof setInterval>;

  totalIssues = 0;
  bugCount = 0;
  unassignedCount = 0;
  featureCount = 0;

  filters: { id: FilterTab; label: string }[] = [
    { id: 'all', label: 'All' },
    { id: 'bugs', label: 'Bugs' },
    { id: 'features', label: 'Features' },
    { id: 'unassigned', label: 'Unassigned' },
    { id: 'jarvis', label: 'Jarvis' },
  ];

  constructor(private issuesService: IssuesService) {}

  ngOnInit(): void {
    this.loadIssues();
    this.refreshTimer = setInterval(() => this.loadIssues(), 120_000);
  }

  ngOnDestroy(): void {
    if (this.refreshTimer) clearInterval(this.refreshTimer);
  }

  async loadIssues(): Promise<void> {
    this.loading = true;
    try {
      this.repoIssues = await this.issuesService.fetchAllIssues();
      this.computeStats();
    } catch {
      this.repoIssues = [];
    }
    this.loading = false;
  }

  private computeStats(): void {
    const all = this.allIssues;
    this.totalIssues = all.length;
    this.bugCount = all.filter(i => this.isBug(i)).length;
    this.unassignedCount = all.filter(i => !i.assignee).length;
    this.featureCount = all.filter(i => this.isFeature(i)).length;
  }

  get allIssues(): GitHubIssue[] {
    return this.repoIssues.flatMap(r => r.issues);
  }

  get filteredRepoIssues(): RepoIssues[] {
    return this.repoIssues
      .map(r => ({ repo: r.repo, issues: this.filterIssues(r.issues) }))
      .filter(r => r.issues.length > 0);
  }

  get totalFiltered(): number {
    return this.filteredRepoIssues.reduce((sum, r) => sum + r.issues.length, 0);
  }

  private filterIssues(issues: GitHubIssue[]): GitHubIssue[] {
    let filtered = issues;
    switch (this.activeFilter) {
      case 'bugs':
        filtered = issues.filter(i => this.isBug(i));
        break;
      case 'features':
        filtered = issues.filter(i => this.isFeature(i));
        break;
      case 'unassigned':
        filtered = issues.filter(i => !i.assignee);
        break;
      case 'jarvis':
        filtered = issues.filter(i => i.assignee?.login === 'JarvisXomware');
        break;
    }
    return this.sortIssues(filtered);
  }

  private sortIssues(issues: GitHubIssue[]): GitHubIssue[] {
    const sorted = [...issues];
    switch (this.sortMode) {
      case 'newest':
        sorted.sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());
        break;
      case 'oldest':
        sorted.sort((a, b) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime());
        break;
      case 'comments':
        sorted.sort((a, b) => b.comments - a.comments);
        break;
    }
    return sorted;
  }

  isBug(issue: GitHubIssue): boolean {
    return issue.labels.some(l => l.name.toLowerCase().includes('bug'));
  }

  isFeature(issue: GitHubIssue): boolean {
    return issue.labels.some(l =>
      l.name.toLowerCase().includes('enhancement') || l.name.toLowerCase().includes('feature')
    );
  }

  toggleRepo(repo: string): void {
    if (this.collapsedRepos.has(repo)) {
      this.collapsedRepos.delete(repo);
    } else {
      this.collapsedRepos.add(repo);
    }
  }

  isCollapsed(repo: string): boolean {
    return this.collapsedRepos.has(repo);
  }

  setFilter(filter: FilterTab): void {
    this.activeFilter = filter;
  }

  getVisibleLabels(issue: GitHubIssue): { name: string; color: string }[] {
    return issue.labels.slice(0, 3);
  }

  getExtraLabelCount(issue: GitHubIssue): number {
    return Math.max(0, issue.labels.length - 3);
  }

  timeAgo(dateStr: string): string {
    const diff = Date.now() - new Date(dateStr).getTime();
    const mins = Math.floor(diff / 60000);
    if (mins < 60) return `${mins}m ago`;
    const hours = Math.floor(mins / 60);
    if (hours < 24) return `${hours}h ago`;
    const days = Math.floor(hours / 24);
    if (days < 30) return `${days}d ago`;
    const months = Math.floor(days / 30);
    return `${months}mo ago`;
  }
}
