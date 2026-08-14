import { TestBed } from '@angular/core/testing';
import { ReactiveFormsModule } from '@angular/forms';
import { of, throwError } from 'rxjs';
import { AdminComponent } from './admin.component';
import {
  AdminEvent,
  AdminEventType,
  AdminService,
  EventsListRequest,
  EventsListResponse,
} from '../../services/admin.service';

let seq = 0;
const ev = (
  eventType: AdminEventType,
  time: string,
  extra: Partial<AdminEvent> = {},
): AdminEvent => ({
  eventId: `e${++seq}`,
  eventType,
  eventTime: `2026-08-14T${time}:00.000Z`,
  eventDate: '2026-08-14',
  userId: extra.email ? 'cognito-sub' : `anon:${extra.visitorId ?? 'v1'}`,
  ...extra,
});

describe('AdminComponent — visitors', () => {
  let component: AdminComponent;
  let admin: jasmine.SpyObj<AdminService>;

  /** Serve one page of events, then no cursor. */
  const serve = (items: AdminEvent[]) => {
    admin.listEvents.and.callFake((req: EventsListRequest = {}) => {
      const filtered = req.eventType
        ? items.filter((i) => i.eventType === req.eventType)
        : items;
      return of({
        date: '2026-08-14',
        eventType: req.eventType ?? null,
        items: filtered,
        nextCursor: undefined,
      } as EventsListResponse);
    });
  };

  beforeEach(() => {
    seq = 0;
    admin = jasmine.createSpyObj('AdminService', ['listEvents', 'costSummary']);
    admin.costSummary.and.returnValue(throwError(() => new Error('not under test')));
    admin.listEvents.and.returnValue(
      of({ date: '2026-08-14', eventType: null, items: [], nextCursor: undefined }),
    );

    TestBed.configureTestingModule({
      imports: [ReactiveFormsModule],
      declarations: [AdminComponent],
      providers: [{ provide: AdminService, useValue: admin }],
      schemas: [],
    });
    TestBed.overrideTemplate(AdminComponent, '');
    component = TestBed.createComponent(AdminComponent).componentInstance;
  });

  it('groups events into one row per visitor', () => {
    serve([
      ev('pageview', '10:00', { visitorId: 'a', path: '/' }),
      ev('pageview', '10:01', { visitorId: 'a', path: '/apps' }),
      ev('pageview', '10:02', { visitorId: 'b', path: '/' }),
    ]);
    component.loadVisitors();

    expect(component.visitors.length).toBe(2);
    expect(component.visitors.map((v) => v.pageviews).sort()).toEqual([1, 2]);
  });

  it('keeps an anonymous session that signs in as ONE visitor', () => {
    // The whole reason visitorId exists. Grouping by userId would split this
    // person into an anon row and a signed-in row.
    serve([
      ev('pageview', '10:00', { visitorId: 'a', path: '/' }),
      ev('signin', '10:05', { visitorId: 'a', email: 'dom@example.com' }),
      ev('pageview', '10:06', { visitorId: 'a', email: 'dom@example.com', path: '/profile' }),
    ]);
    component.loadVisitors();

    expect(component.visitors.length).toBe(1);
    const v = component.visitors[0];
    expect(v.identity).toBe('dom@example.com');
    expect(v.identified).toBe(true);
    expect(v.converted).toBe(true);
    expect(v.pageviews).toBe(2);
  });

  it('labels a visitor who never signs in as anonymous', () => {
    serve([ev('pageview', '10:00', { visitorId: 'abcdef1234', path: '/' })]);
    component.loadVisitors();

    expect(component.visitors[0].identified).toBe(false);
    expect(component.visitors[0].identity).toBe('anon · abcdef12');
  });

  it('orders the journey forwards even though events arrive newest-first', () => {
    serve([
      ev('pageview', '10:02', { visitorId: 'a', path: '/music' }),
      ev('pageview', '10:00', { visitorId: 'a', path: '/' }),
      ev('pageview', '10:01', { visitorId: 'a', path: '/apps' }),
    ]);
    component.loadVisitors();

    expect(component.visitors[0].journey).toEqual(['/', '/apps', '/music']);
  });

  it('collapses consecutive repeats but keeps a genuine return', () => {
    serve([
      ev('pageview', '10:00', { visitorId: 'a', path: '/apps' }),
      ev('pageview', '10:01', { visitorId: 'a', path: '/apps' }),
      ev('pageview', '10:02', { visitorId: 'a', path: '/music' }),
      ev('pageview', '10:03', { visitorId: 'a', path: '/apps' }),
    ]);
    component.loadVisitors();

    expect(component.visitors[0].journey).toEqual(['/apps', '/music', '/apps']);
  });

  it('records outbound click-throughs and errors', () => {
    serve([
      ev('outbound', '10:01', { visitorId: 'a', app: 'Today In Sports', target: 'https://todayinsports.app' }),
      ev('error', '10:02', { visitorId: 'a', message: 'boom' }),
    ]);
    component.loadVisitors();

    expect(component.visitors[0].outbound).toEqual([
      { app: 'Today In Sports', target: 'https://todayinsports.app' },
    ]);
    expect(component.visitors[0].errors).toBe(1);
  });

  it('sorts most recently active first', () => {
    serve([
      ev('pageview', '09:00', { visitorId: 'old', path: '/' }),
      ev('pageview', '11:00', { visitorId: 'recent', path: '/' }),
    ]);
    component.loadVisitors();

    expect(component.visitors[0].visitorId).toBe('recent');
  });

  it('falls back to userId for rows written before visitorId existed', () => {
    // The Cognito trigger writes signin rows with no visitorId.
    serve([ev('signin', '10:00', { email: 'dom@example.com' })]);
    component.loadVisitors();

    expect(component.visitors.length).toBe(1);
    expect(component.visitors[0].identity).toBe('dom@example.com');
  });

  it('walks the cursor to cover the whole day', () => {
    let call = 0;
    admin.listEvents.and.callFake(() => {
      call += 1;
      return of({
        date: '2026-08-14',
        eventType: null,
        items: [ev('pageview', '10:00', { visitorId: `v${call}`, path: '/' })],
        nextCursor: call < 3 ? `cursor-${call}` : undefined,
      } as EventsListResponse);
    });
    component.loadVisitors();

    expect(call).toBe(3);
    expect(component.visitors.length).toBe(3);
    expect(component.visitorsTruncated).toBe(false);
  });

  it('flags truncation rather than showing a partial day as complete', () => {
    admin.listEvents.and.callFake(() =>
      of({
        date: '2026-08-14',
        eventType: null,
        items: [ev('pageview', '10:00', { visitorId: 'v', path: '/' })],
        nextCursor: 'always-more',
      } as EventsListResponse),
    );
    component.loadVisitors();

    expect(component.visitorsTruncated).toBe(true);
  });

  it('surfaces a load failure instead of showing an empty day', () => {
    admin.listEvents.and.returnValue(throwError(() => ({ status: 500 })));
    component.loadVisitors();

    expect(component.visitorsError).toBeTruthy();
    expect(component.visitorsLoading).toBe(false);
  });
});
