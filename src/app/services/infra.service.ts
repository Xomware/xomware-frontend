import { Injectable } from '@angular/core';
import { AuthService } from './auth.service';
import { environment } from '../../environments/environment';

export interface Workspace {
  name: string;
  resourceCount: number;
  lastModified: string | null;
  serial: number;
  terraformVersion: string;
  fileSize: number;
}

export interface StateResource {
  mode: string;
  type: string;
  name: string;
  module: string | null;
  provider: string;
  attributes: Record<string, any>;
  indexKey: string | null;
}

export interface WorkspaceState {
  workspace: string;
  serial: number;
  terraformVersion: string;
  lineage: string;
  resourceCount: number;
  dataSourceCount: number;
  resources: StateResource[];
  outputs: Record<string, { value: any; sensitive?: boolean }>;
}

@Injectable({ providedIn: 'root' })
export class InfraService {
  private readonly baseUrl = environment.apiBaseUrl + '/infra';

  constructor(private auth: AuthService) {}

  private get headers(): HeadersInit {
    return {
      'Content-Type': 'application/json',
      'X-Auth-Hash': this.auth.getPassphraseHash(),
    };
  }

  async listWorkspaces(): Promise<Workspace[]> {
    const res = await fetch(`${this.baseUrl}/workspaces`, {
      headers: this.headers,
    });
    if (!res.ok) throw new Error(`Failed to list workspaces: ${res.status}`);
    const data = await res.json();
    return data.workspaces;
  }

  async getWorkspaceState(app: string): Promise<WorkspaceState> {
    const res = await fetch(
      `${this.baseUrl}/workspaces/${encodeURIComponent(app)}/state`,
      { headers: this.headers }
    );
    if (!res.ok)
      throw new Error(`Failed to get workspace state: ${res.status}`);
    return res.json();
  }
}
