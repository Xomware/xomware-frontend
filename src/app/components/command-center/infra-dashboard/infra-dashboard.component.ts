import { Component, OnInit } from '@angular/core';
import {
  InfraService,
  Workspace,
  WorkspaceState,
  StateResource,
} from '../../../services/infra.service';

type View = 'overview' | 'detail';

@Component({
  selector: 'app-infra-dashboard',
  templateUrl: './infra-dashboard.component.html',
  styleUrls: ['./infra-dashboard.component.scss'],
})
export class InfraDashboardComponent implements OnInit {
  view: View = 'overview';
  workspaces: Workspace[] = [];
  loading = false;
  error = '';

  // Detail view
  selectedWorkspace: string = '';
  workspaceState: WorkspaceState | null = null;
  detailLoading = false;
  detailError = '';
  selectedResource: StateResource | null = null;
  resourceFilter = '';
  showOutputs = false;

  // App brand colors
  readonly appColors: Record<string, string> = {
    xomware: '#00b4d8',
    xomify: '#9c0abf',
    xomcloud: '#ff6b35',
    xomper: '#00ffab',
    xomfit: '#ff4d6d',
  };

  readonly appIcons: Record<string, string> = {
    xomware: '🏠',
    xomify: '🎵',
    xomcloud: '☁️',
    xomper: '🏈',
    xomfit: '💪',
  };

  constructor(private infra: InfraService) {}

  ngOnInit(): void {
    this.loadWorkspaces();
  }

  async loadWorkspaces(): Promise<void> {
    this.loading = true;
    this.error = '';
    try {
      this.workspaces = await this.infra.listWorkspaces();
    } catch (e: any) {
      this.error = e.message || 'Failed to load workspaces';
    } finally {
      this.loading = false;
    }
  }

  async openWorkspace(ws: Workspace): Promise<void> {
    this.selectedWorkspace = ws.name;
    this.view = 'detail';
    this.detailLoading = true;
    this.detailError = '';
    this.selectedResource = null;
    this.resourceFilter = '';
    this.showOutputs = false;
    try {
      this.workspaceState = await this.infra.getWorkspaceState(ws.name);
    } catch (e: any) {
      this.detailError = e.message || 'Failed to load state';
    } finally {
      this.detailLoading = false;
    }
  }

  backToOverview(): void {
    this.view = 'overview';
    this.workspaceState = null;
    this.selectedResource = null;
  }

  selectResource(r: StateResource): void {
    this.selectedResource = this.selectedResource === r ? null : r;
  }

  getColor(name: string): string {
    return this.appColors[name] || '#00b4d8';
  }

  getIcon(name: string): string {
    return this.appIcons[name] || '📦';
  }

  formatBytes(bytes: number): string {
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  }

  formatDate(iso: string | null): string {
    if (!iso) return 'Never';
    const d = new Date(iso);
    return d.toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  }

  get filteredResources(): StateResource[] {
    if (!this.workspaceState) return [];
    const managed = this.workspaceState.resources.filter(
      (r) => r.mode === 'managed'
    );
    if (!this.resourceFilter) return managed;
    const q = this.resourceFilter.toLowerCase();
    return managed.filter(
      (r) =>
        r.type.toLowerCase().includes(q) ||
        r.name.toLowerCase().includes(q) ||
        (r.module || '').toLowerCase().includes(q)
    );
  }

  get dataResources(): StateResource[] {
    if (!this.workspaceState) return [];
    return this.workspaceState.resources.filter((r) => r.mode === 'data');
  }

  get outputEntries(): [string, any][] {
    if (!this.workspaceState) return [];
    return Object.entries(this.workspaceState.outputs);
  }

  getAttrEntries(attrs: Record<string, any>): [string, any][] {
    return Object.entries(attrs).sort(([a], [b]) => a.localeCompare(b));
  }

  formatAttrValue(val: any): string {
    if (val === null || val === undefined) return 'null';
    if (typeof val === 'object') return JSON.stringify(val, null, 2);
    return String(val);
  }

  getResourceTypeShort(type: string): string {
    // "aws_s3_bucket" → "s3_bucket"
    return type.replace(/^aws_/, '');
  }
}
