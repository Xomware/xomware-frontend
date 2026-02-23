import { Component } from '@angular/core';

interface LogEntry {
  timestamp: string;
  type: 'task' | 'lesson' | 'error' | 'info';
  title: string;
  detail?: string;
  icon: string;
}

@Component({
  selector: 'app-activity-log',
  templateUrl: './activity-log.component.html',
  styleUrls: ['./activity-log.component.scss'],
})
export class ActivityLogComponent {
  filter: string = 'all';

  entries: LogEntry[] = [
    {
      timestamp: '2026-02-22 18:57',
      type: 'task',
      title: 'Command Center project started',
      detail: 'Dom requested dashboard with Kanban, config viewer, pixel office, and activity logging.',
      icon: '🚀',
    },
    {
      timestamp: '2026-02-21 19:34',
      type: 'task',
      title: 'Opened 14 PRs across Xomware repos',
      detail: 'Angular upgrades, Terraform updates, CI/CD pipelines, security fixes. All assigned to Dom for review.',
      icon: '📦',
    },
    {
      timestamp: '2026-02-21 18:00',
      type: 'task',
      title: 'XomBoard created on GitHub Projects',
      detail: 'Project board at github.com/orgs/Xomware/projects/2 with Todo, In Progress, In Review, Done columns.',
      icon: '📋',
    },
    {
      timestamp: '2026-02-21 17:00',
      type: 'info',
      title: 'Scanned 12 core Xomware repositories',
      detail: '36 total repos, 12 core. Found Angular 16 (needs 18), mixed AWS providers, no hardcoded secrets.',
      icon: '🔍',
    },
    {
      timestamp: '2026-02-21 16:00',
      type: 'lesson',
      title: 'GitHub token needed project scope',
      detail: 'JarvisXomware token initially missing project and read:project scopes. Dom added them.',
      icon: '📝',
    },
    {
      timestamp: '2026-02-21 15:00',
      type: 'info',
      title: 'First boot — met Dom',
      detail: 'Charlotte NC, Eastern time. Runs Xomware org with 3 apps: Xomify, Xomcloud, Xomper.',
      icon: '👋',
    },
  ];

  get filteredEntries(): LogEntry[] {
    if (this.filter === 'all') return this.entries;
    return this.entries.filter((e) => e.type === this.filter);
  }

  setFilter(f: string): void {
    this.filter = f;
  }
}
