import { Component, OnInit, OnDestroy } from '@angular/core';
import { Subscription, interval } from 'rxjs';
import { switchMap, startWith } from 'rxjs/operators';
import {
  WorkflowRunsService,
  RepoCI,
  CIStatus,
} from '../../../services/workflow-runs.service';

type FilterTab = 'all' | 'failing' | 'passing' | 'in_progress';

@Component({
  selector: 'app-ci-monitor',
  templateUrl: './ci-monitor.component.html',
  styleUrls: ['./ci-monitor.component.scss'],
})
export class CiMonitorComponent implements OnInit, OnDestroy {
  repos: RepoCI[] = [];
  loading = true;
  activeFilter: FilterTab = 'all';
  private sub?: Subscription;

  filters: { id: FilterTab; label: string }[] = [
    { id: 'all', label: 'All' },
    { id: 'failing', label: 'Failing' },
    { id: 'passing', label: 'Passing' },
    { id: 'in_progress', label: 'In Progress' },
  ];

  constructor(private workflowService: WorkflowRunsService) {}

  ngOnInit(): void {
    this.sub = interval(30000)
      .pipe(
        startWith(0),
        switchMap(() => this.workflowService.getAllRepoCI())
      )
      .subscribe(repos => {
        this.repos = this.sortRepos(repos);
        this.loading = false;
      });
  }

  ngOnDestroy(): void {
    this.sub?.unsubscribe();
  }

  get filteredRepos(): RepoCI[] {
    if (this.activeFilter === 'all') return this.repos;
    return this.repos.filter(r => {
      const status = this.getStatus(r);
      switch (this.activeFilter) {
        case 'failing': return status === 'failure';
        case 'passing': return status === 'success';
        case 'in_progress': return status === 'in_progress';
        default: return true;
      }
    });
  }

  get passingCount(): number {
    return this.repos.filter(r => this.getStatus(r) === 'success').length;
  }

  get failingCount(): number {
    return this.repos.filter(r => this.getStatus(r) === 'failure').length;
  }

  get inProgressCount(): number {
    return this.repos.filter(r => this.getStatus(r) === 'in_progress').length;
  }

  getStatus(repo: RepoCI): CIStatus {
    return this.workflowService.getStatus(repo);
  }

  getStatusDot(repo: RepoCI): string {
    switch (this.getStatus(repo)) {
      case 'success': return '🟢';
      case 'failure': return '🔴';
      case 'in_progress': return '🟡';
      case 'cancelled': return '⚫';
      default: return '⚪';
    }
  }

  getStatusLabel(repo: RepoCI): string {
    switch (this.getStatus(repo)) {
      case 'success': return 'SUCCESS';
      case 'failure': return 'FAILED';
      case 'in_progress': return 'IN PROGRESS';
      case 'cancelled': return 'CANCELLED';
      default: return 'No CI';
    }
  }

  getStatusClass(repo: RepoCI): string {
    return this.getStatus(repo);
  }

  timeAgo(dateStr: string): string {
    const diff = Date.now() - new Date(dateStr).getTime();
    const mins = Math.floor(diff / 60000);
    if (mins < 1) return 'just now';
    if (mins < 60) return `${mins}m ago`;
    const hrs = Math.floor(mins / 60);
    if (hrs < 24) return `${hrs}h ago`;
    const days = Math.floor(hrs / 24);
    return `${days}d ago`;
  }

  setFilter(filter: FilterTab): void {
    this.activeFilter = filter;
  }

  private sortRepos(repos: RepoCI[]): RepoCI[] {
    const order: Record<CIStatus, number> = {
      failure: 0,
      in_progress: 1,
      success: 2,
      cancelled: 3,
      none: 4,
    };
    return repos.sort((a, b) => {
      const aOrder = order[this.getStatus(a)] ?? 5;
      const bOrder = order[this.getStatus(b)] ?? 5;
      if (aOrder !== bOrder) return aOrder - bOrder;
      return a.repoName.localeCompare(b.repoName);
    });
  }
}
