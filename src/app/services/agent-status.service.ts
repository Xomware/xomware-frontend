import { Injectable, OnDestroy } from '@angular/core';
import { BehaviorSubject } from 'rxjs';
import { AuthService } from './auth.service';
import { environment } from '../../environments/environment';

export interface AgentStatus {
  name: string;
  status: 'idle' | 'working' | 'thinking' | 'done';
  task: string | null;
}

export interface AgentStatusResponse {
  updatedAt: string | null;
  agents: AgentStatus[];
}

@Injectable({ providedIn: 'root' })
export class AgentStatusService implements OnDestroy {
  private readonly url = environment.apiBaseUrl + '/status/agents';
  private pollTimer: ReturnType<typeof setInterval> | null = null;

  readonly status$ = new BehaviorSubject<AgentStatusResponse>({
    updatedAt: null,
    agents: [],
  });

  constructor(private auth: AuthService) {}

  startPolling(intervalMs = 10_000): void {
    this.fetch(); // immediate first fetch
    this.stopPolling();
    this.pollTimer = setInterval(() => this.fetch(), intervalMs);
  }

  stopPolling(): void {
    if (this.pollTimer) {
      clearInterval(this.pollTimer);
      this.pollTimer = null;
    }
  }

  ngOnDestroy(): void {
    this.stopPolling();
  }

  private async fetch(): Promise<void> {
    try {
      const res = await fetch(this.url, {
        headers: {
          'X-Auth-Hash': this.auth.getPassphraseHash(),
        },
      });
      if (!res.ok) return;
      const data: AgentStatusResponse = await res.json();
      this.status$.next(data);
    } catch {
      // silent fail — office just shows stale data
    }
  }
}
