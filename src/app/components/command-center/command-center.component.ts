import { Component } from '@angular/core';
import { Router } from '@angular/router';
import { AuthService } from '../../services/auth.service';

export type TabId = 'kanban' | 'config' | 'activity' | 'office';

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
export class CommandCenterComponent {
  activeTab: TabId = 'kanban';

  tabs: Tab[] = [
    { id: 'kanban', label: 'XomBoard', icon: '📋' },
    { id: 'config', label: 'Config', icon: '⚙️' },
    { id: 'activity', label: 'Activity', icon: '📊' },
    { id: 'office', label: 'Office', icon: '🏢' },
  ];

  constructor(private auth: AuthService, private router: Router) {}

  setTab(tab: TabId): void {
    this.activeTab = tab;
  }

  logout(): void {
    this.auth.logout();
    this.router.navigate(['/']);
  }
}
