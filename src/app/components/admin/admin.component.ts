import { Component, OnInit } from '@angular/core';
import { FormBuilder, FormGroup } from '@angular/forms';
import {
  AdminEvent,
  AdminEventType,
  AdminService,
  CostSummaryResponse,
  EventsListResponse,
} from '../../services/admin.service';
import { AppCard, APPS } from '../../data/apps.data';

interface EventFilter {
  label: string;
  value: AdminEventType | '';
}

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

  readonly eventFilters: EventFilter[] = [
    { label: 'All', value: '' },
    { label: 'Pageviews', value: 'pageview' },
    { label: 'Outbound', value: 'outbound' },
    { label: 'Sign-ins', value: 'signin' },
    { label: 'Sign-ups', value: 'signup' },
  ];

  errors: AdminEvent[] = [];
  errorsCursor: string | undefined;
  errorsLoading = false;
  errorsLoadingMore = false;
  errorsError = '';
  /** eventId of the row whose stack is expanded; only one at a time. */
  expandedError: string | null = null;

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
    private fb: FormBuilder,
  ) {
    this.dateForm = this.fb.group({
      date: [this.todayIso()],
      eventType: [''],
    });
  }

  ngOnInit(): void {
    this.loadEvents();
    this.loadErrors();
    this.loadCost();
  }

  /** Current type filter, or undefined when showing every type. */
  private get selectedType(): AdminEventType | undefined {
    const value = this.dateForm.value.eventType as AdminEventType | '';
    return value || undefined;
  }

  loadEvents(): void {
    const date = this.dateForm.value.date as string | null;
    this.eventsLoading = true;
    this.eventsError = '';
    this.events = [];
    this.eventsCursor = undefined;

    this.admin.listEvents({
      ...(date ? { date } : {}),
      ...(this.selectedType ? { eventType: this.selectedType } : {}),
    }).subscribe({
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

    // The filter has to be repeated: the cursor is a LastEvaluatedKey from
    // whichever index the first page queried, so dropping eventType here
    // would hand a by-type cursor to a by-day query.
    this.admin
      .listEvents({
        date,
        cursor: this.eventsCursor,
        ...(this.selectedType ? { eventType: this.selectedType } : {}),
      })
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

  /** Errors get their own card — they are the one type you act on. */
  loadErrors(): void {
    const date = this.dateForm.value.date as string | null;
    this.errorsLoading = true;
    this.errorsError = '';
    this.errors = [];
    this.errorsCursor = undefined;
    this.expandedError = null;

    this.admin
      .listEvents({ ...(date ? { date } : {}), eventType: 'error' })
      .subscribe({
        next: (res: EventsListResponse) => {
          this.errors = res.items;
          this.errorsCursor = res.nextCursor;
          this.errorsLoading = false;
        },
        error: (err) => {
          this.errorsError = this.errorMessage(err, 'Failed to load errors');
          this.errorsLoading = false;
        },
      });
  }

  loadMoreErrors(): void {
    if (!this.errorsCursor || this.errorsLoadingMore) {
      return;
    }
    this.errorsLoadingMore = true;
    const date = this.dateForm.value.date as string;

    this.admin
      .listEvents({ date, eventType: 'error', cursor: this.errorsCursor })
      .subscribe({
        next: (res: EventsListResponse) => {
          this.errors = [...this.errors, ...res.items];
          this.errorsCursor = res.nextCursor;
          this.errorsLoadingMore = false;
        },
        error: (err) => {
          this.errorsError = this.errorMessage(err, 'Failed to load more errors');
          this.errorsLoadingMore = false;
        },
      });
  }

  toggleError(eventId: string): void {
    this.expandedError = this.expandedError === eventId ? null : eventId;
  }

  /** Both cards read the same date, so one submit reloads both. */
  reload(): void {
    this.loadEvents();
    this.loadErrors();
  }

  /**
   * Who the row belongs to. Anonymous visitors are written as
   * `anon:<visitorId>`; showing the raw uuid is noise, so they collapse to a
   * short tag that is still distinguishable between visitors.
   */
  actorLabel(ev: AdminEvent): string {
    if (ev.email) return ev.email;
    if (ev.userId?.startsWith('anon:')) {
      return `anon · ${ev.userId.slice(5, 13)}`;
    }
    return ev.userId || '—';
  }

  /** The most useful column varies by type, so the table shows one "detail". */
  detailLabel(ev: AdminEvent): string {
    switch (ev.eventType) {
      case 'outbound':
        return ev.app ? `→ ${ev.app}` : ev.target || '—';
      case 'error':
        return ev.message || '—';
      case 'pageview':
        return ev.path || '—';
      default:
        return ev.identityProvider || '—';
    }
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
