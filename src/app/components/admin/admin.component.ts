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

/**
 * One visitor's day, assembled from their events.
 *
 * Grouped by `visitorId` rather than `userId` on purpose: visitorId persists
 * across sign-in, so someone who browses anonymously and then signs up is one
 * visitor whose identity resolves partway through, not two separate rows.
 */
interface VisitorSession {
  visitorId: string;
  /** Email once known, otherwise a short anonymous tag. */
  identity: string;
  identified: boolean;
  /** True when this visitor signed in or signed up during the day. */
  converted: boolean;
  firstSeen: string;
  lastSeen: string;
  pageviews: number;
  /** Paths in the order visited, consecutive repeats collapsed. */
  journey: string[];
  outbound: { app: string; target: string }[];
  errors: number;
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

  visitors: VisitorSession[] = [];
  visitorsLoading = false;
  visitorsError = '';
  visitorsTruncated = false;
  expandedVisitor: string | null = null;

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
    this.loadVisitors();
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

  /**
   * Visitors needs the whole day, not the first page, so it walks the cursor.
   * Bounded: at PAGE_LIMIT × MAX_PAGES the total stops growing and the card
   * says so rather than quietly showing a partial day as if it were complete.
   */
  loadVisitors(): void {
    const date = (this.dateForm.value.date as string) || this.todayIso();
    this.visitorsLoading = true;
    this.visitorsError = '';
    this.visitors = [];
    this.visitorsTruncated = false;
    this.expandedVisitor = null;

    const PAGE_LIMIT = 200;
    const MAX_PAGES = 15;
    const collected: AdminEvent[] = [];

    const fetchPage = (cursor?: string, page = 1): void => {
      this.admin.listEvents({ date, limit: PAGE_LIMIT, cursor }).subscribe({
        next: (res: EventsListResponse) => {
          collected.push(...res.items);
          if (res.nextCursor && page < MAX_PAGES) {
            fetchPage(res.nextCursor, page + 1);
            return;
          }
          this.visitorsTruncated = !!res.nextCursor;
          this.visitors = this.buildVisitors(collected);
          this.visitorsLoading = false;
        },
        error: (err) => {
          this.visitorsError = this.errorMessage(err, 'Failed to load visitors');
          this.visitorsLoading = false;
        },
      });
    };

    fetchPage();
  }

  /** Fold a day of raw events into one row per visitor. */
  private buildVisitors(events: AdminEvent[]): VisitorSession[] {
    // Events arrive newest-first; the journey only reads correctly forwards.
    const chronological = [...events].sort((a, b) =>
      a.eventTime.localeCompare(b.eventTime),
    );

    const byVisitor = new Map<string, VisitorSession>();

    for (const ev of chronological) {
      // Pre-Visitors rows and the Cognito trigger's own rows have no
      // visitorId; fall back to userId so they still appear.
      const key = ev.visitorId || ev.userId;
      if (!key) continue;

      let v = byVisitor.get(key);
      if (!v) {
        v = {
          visitorId: key,
          identity: `anon · ${key.slice(0, 8)}`,
          identified: false,
          converted: false,
          firstSeen: ev.eventTime,
          lastSeen: ev.eventTime,
          pageviews: 0,
          journey: [],
          outbound: [],
          errors: 0,
        };
        byVisitor.set(key, v);
      }

      v.lastSeen = ev.eventTime;

      // Identity can arrive on any event in the day — the sign-in row, or any
      // row written after it. Once known it sticks.
      if (!v.identified && ev.email) {
        v.identity = ev.email;
        v.identified = true;
      }

      switch (ev.eventType) {
        case 'pageview':
          v.pageviews += 1;
          if (ev.path && v.journey[v.journey.length - 1] !== ev.path) {
            v.journey.push(ev.path);
          }
          break;
        case 'outbound':
          v.outbound.push({ app: ev.app || '—', target: ev.target || '' });
          break;
        case 'error':
          v.errors += 1;
          break;
        case 'signin':
        case 'signup':
          v.converted = true;
          break;
      }
    }

    // Most recently active first — that is the useful default when checking
    // who is on the site right now.
    return [...byVisitor.values()].sort((a, b) => b.lastSeen.localeCompare(a.lastSeen));
  }

  toggleVisitor(visitorId: string): void {
    this.expandedVisitor = this.expandedVisitor === visitorId ? null : visitorId;
  }

  get identifiedCount(): number {
    return this.visitors.filter((v) => v.identified).length;
  }

  formatSpan(v: VisitorSession): string {
    const mins = Math.round(
      (new Date(v.lastSeen).getTime() - new Date(v.firstSeen).getTime()) / 60000,
    );
    if (mins < 1) return '< 1 min';
    return `${mins} min`;
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

  /** Every card reads the same date, so one submit reloads them all. */
  reload(): void {
    this.loadEvents();
    this.loadVisitors();
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
