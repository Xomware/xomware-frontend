import { Component, OnInit, OnDestroy } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { Subscription } from 'rxjs';
import { AuthService } from '../../services/auth.service';

export type TabId = 'kanban' | 'files' | 'activity' | 'office' | 'infra' | 'ci';

/** Maps URL path segment → internal tab ID */
const ROUTE_TO_TAB: Record<string, TabId> = {
  board: 'kanban',
  files: 'files',
  activity: 'activity',
  infra: 'infra',
  office: 'office',
  ci: 'ci',
};

/** Maps internal tab ID → URL path segment */
const TAB_TO_ROUTE: Record<TabId, string> = {
  kanban: 'board',
  files: 'files',
  activity: 'activity',
  infra: 'infra',
  office: 'office',
  ci: 'ci',
};

interface Tab {
  id: TabId;
  label: string;
  icon: string;
}

@Component({
  selector: 'app-command-center',
  templateUrl: './command-center.component.html',
  styleUrls: ['./command-center.component.scss'],
})
export class CommandCenterComponent implements OnInit, OnDestroy {
  activeTab: TabId = 'kanban';

  tabs: Tab[] = [
    { id: 'kanban', label: 'XomBoard', icon: '📋' },
    { id: 'files', label: 'Files', icon: '📝' },
    { id: 'activity', label: 'Activity', icon: '📊' },
    { id: 'infra', label: 'Infrastructure', icon: '🏗️' },
    { id: 'office', label: 'Office', icon: '🏢' },
    { id: 'ci', label: 'CI', icon: '🚀' },
  ];

  private routeSub?: Subscription;

  constructor(
    private auth: AuthService,
    private router: Router,
    private route: ActivatedRoute,
  ) {}

  ngOnInit(): void {
    // Sync activeTab with the :tab route param on init and whenever it changes
    this.routeSub = this.route.params.subscribe(params => {
      const tabId = ROUTE_TO_TAB[params['tab']];
      if (tabId) {
        this.activeTab = tabId;
      }
    });
  }

  ngOnDestroy(): void {
    this.routeSub?.unsubscribe();
  }

  /** Called when user clicks a tab — updates the URL to reflect the new tab */
  setTab(tab: TabId): void {
    this.router.navigate(['/command', TAB_TO_ROUTE[tab]]);
  }

  logout(): void {
    this.auth.logout();
    this.router.navigate(['/']);
  }
}
