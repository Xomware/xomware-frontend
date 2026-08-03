import { Component, OnInit } from '@angular/core';
import { FormBuilder, FormGroup } from '@angular/forms';
import { Router } from '@angular/router';
import {
  AdminEvent,
  AdminService,
  CostSummaryResponse,
  EventsListResponse,
} from '../../services/admin.service';
import { CognitoService } from '../../services/cognito.service';
import { AppCard, APPS } from '../../data/apps.data';

@Component({
  selector: 'app-admin',
  templateUrl: './admin.component.html',
  styleUrls: ['./admin.component.scss'],
})
export class AdminComponent implements OnInit {
  readonly dateForm: FormGroup;

  events: AdminEvent[] = [];
  eventsDate = '';
  eventsCursor: string | undefined;
  eventsLoading = false;
  eventsLoadingMore = false;
  eventsError = '';

  cost: CostSummaryResponse | null = null;
  costLoading = false;
  costError = '';

  /**
   * Internal tools, kept off the public directory. This route is already
   * behind adminGuard, and each tool gates independently on its own API.
   */
  readonly internalTools: AppCard[] = APPS.filter((a) => a.adminOnly);

  constructor(
    private admin: AdminService,
    private cognito: CognitoService,
    private fb: FormBuilder,
    private router: Router,
  ) {
    this.dateForm = this.fb.group({
      date: [this.todayIso()],
    });
  }

  ngOnInit(): void {
    this.loadEvents();
    this.loadCost();
  }

  loadEvents(): void {
    const date = this.dateForm.value.date as string | null;
    this.eventsLoading = true;
    this.eventsError = '';
    this.events = [];
    this.eventsCursor = undefined;

    this.admin.listEvents(date ? { date } : {}).subscribe({
      next: (res: EventsListResponse) => {
        this.events = res.items;
        this.eventsCursor = res.nextCursor;
        this.eventsDate = res.date;
        this.eventsLoading = false;
      },
      error: (err) => {
        this.eventsError = this.errorMessage(err, 'Failed to load events');
        this.eventsLoading = false;
      },
    });
  }

  loadMoreEvents(): void {
    if (!this.eventsCursor || this.eventsLoadingMore) {
      return;
    }
    this.eventsLoadingMore = true;
    const date = this.eventsDate || (this.dateForm.value.date as string);

    this.admin
      .listEvents({ date, cursor: this.eventsCursor })
      .subscribe({
        next: (res: EventsListResponse) => {
          this.events = [...this.events, ...res.items];
          this.eventsCursor = res.nextCursor;
          this.eventsLoadingMore = false;
        },
        error: (err) => {
          this.eventsError = this.errorMessage(err, 'Failed to load more events');
          this.eventsLoadingMore = false;
        },
      });
  }

  loadCost(): void {
    this.costLoading = true;
    this.costError = '';
    this.admin.costSummary().subscribe({
      next: (res) => {
        this.cost = {
          ...res,
          services: [...res.services].sort((a, b) => b.amount - a.amount),
        };
        this.costLoading = false;
      },
      error: (err) => {
        this.costError = this.errorMessage(err, 'Failed to load cost summary');
        this.costLoading = false;
      },
    });
  }

  signOut(): void {
    this.cognito.signOut().subscribe({
      next: () => this.router.navigate(['/']),
      error: () => this.router.navigate(['/']),
    });
  }

  formatTime(iso: string): string {
    const d = new Date(iso);
    return d.toLocaleTimeString('en-US', {
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
    });
  }

  formatMoney(amount: number, currency: string): string {
    try {
      return new Intl.NumberFormat('en-US', {
        style: 'currency',
        currency,
        minimumFractionDigits: 2,
        maximumFractionDigits: 2,
      }).format(amount);
    } catch {
      return `${currency} ${amount.toFixed(2)}`;
    }
  }

  formatRange(start: string, end: string): string {
    return `${start} → ${end}`;
  }

  private todayIso(): string {
    const d = new Date();
    const yyyy = d.getFullYear();
    const mm = String(d.getMonth() + 1).padStart(2, '0');
    const dd = String(d.getDate()).padStart(2, '0');
    return `${yyyy}-${mm}-${dd}`;
  }

  private errorMessage(err: unknown, fallback: string): string {
    if (err && typeof err === 'object' && 'status' in err) {
      const status = (err as { status?: number }).status;
      if (status === 403) {
        return 'You no longer have admin access.';
      }
      if (status === 401) {
        return 'Session expired — sign in again.';
      }
    }
    if (err instanceof Error && err.message) {
      return err.message;
    }
    return fallback;
  }
}
