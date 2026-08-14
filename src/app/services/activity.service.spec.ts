import { TestBed } from '@angular/core/testing';
import { ActivityService } from './activity.service';
import { environment } from '../../environments/environment';

interface SentCall {
  url: string;
  body: { visitorId: string; events: { type: string; [k: string]: unknown }[] };
  headers: Record<string, string>;
}

describe('ActivityService', () => {
  let service: ActivityService;
  let sent: SentCall[];
  let fetchSpy: jasmine.Spy;

  const flush = () => new Promise<void>((r) => setTimeout(r, 0));
  const resolveAuth = (signedIn: boolean, token: string | null = null) =>
    service.registerAuth(signedIn, () => Promise.resolve(token));

  beforeEach(() => {
    localStorage.removeItem('xw_visitor_id');
    sent = [];
    fetchSpy = spyOn(window, 'fetch').and.callFake(
      (url: RequestInfo | URL, init?: RequestInit) => {
        sent.push({
          url: String(url),
          body: JSON.parse(String(init?.body ?? '{}')),
          headers: (init?.headers ?? {}) as Record<string, string>,
        });
        return Promise.resolve(new Response(null, { status: 204 }));
      },
    );
    TestBed.configureTestingModule({});
    service = TestBed.inject(ActivityService);
  });

  describe('auth gating', () => {
    it('buffers events raised before the session check settles', async () => {
      service.trackPageview('/');
      await flush();

      // The whole point: this must NOT have gone out as anonymous yet.
      expect(fetchSpy).not.toHaveBeenCalled();
    });

    it('flushes buffered events to the authed route once auth resolves', async () => {
      service.trackPageview('/');
      await flush();

      resolveAuth(true, 'jwt-token');
      await flush();

      expect(sent.length).toBe(1);
      expect(sent[0].url).toBe(`${environment.usersApiUrl}/events/track-user`);
      expect(sent[0].body.events[0]['path']).toBe('/');
      expect(sent[0].headers['Authorization']).toBe('Bearer jwt-token');
    });

    it('flushes to the public route for a signed-out visitor', async () => {
      service.trackPageview('/apps');
      resolveAuth(false);
      await flush();

      expect(sent[0].url).toBe(`${environment.usersApiUrl}/events/track`);
      expect(sent[0].headers['Authorization']).toBeUndefined();
    });

    it('caps the buffer so an unresolved session cannot grow unbounded', async () => {
      for (let i = 0; i < 50; i++) {
        service.trackPageview(`/page-${i}`);
      }
      resolveAuth(false);
      await flush();

      expect(sent.length).toBe(1);
      expect(sent[0].body.events.length).toBe(20);
    });
  });

  describe('pageviews', () => {
    beforeEach(() => resolveAuth(false));

    it('sends a pageview with its path', async () => {
      service.trackPageview('/music');
      await flush();

      expect(sent[0].body.events[0]).toEqual(
        jasmine.objectContaining({ type: 'pageview', path: '/music' }),
      );
    });

    it('drops a repeat of the same path', async () => {
      service.trackPageview('/apps');
      service.trackPageview('/apps');
      await flush();

      expect(sent.length).toBe(1);
    });

    it('does not drop a genuine return to a previous path', async () => {
      service.trackPageview('/apps');
      service.trackPageview('/music');
      service.trackPageview('/apps');
      await flush();

      expect(sent.length).toBe(3);
    });

    it('sends the referrer only on the first pageview', async () => {
      service.trackPageview('/');
      service.trackPageview('/apps');
      await flush();

      expect('referrer' in sent[1].body.events[0]).toBe(false);
    });
  });

  describe('outbound', () => {
    beforeEach(() => resolveAuth(false));

    it('records the app and target, tagged with the current path', async () => {
      service.trackPageview('/apps');
      service.trackOutbound('Today In Sports', 'https://todayinsports.app');
      await flush();

      expect(sent[1].body.events[0]).toEqual(
        jasmine.objectContaining({
          type: 'outbound',
          app: 'Today In Sports',
          target: 'https://todayinsports.app',
          path: '/apps',
        }),
      );
    });

    it('uses keepalive so the request outlives the navigation', async () => {
      service.trackOutbound('Xomify', 'https://xomify.xomware.com');
      await flush();

      expect(fetchSpy.calls.mostRecent().args[1].keepalive).toBe(true);
    });
  });

  describe('errors', () => {
    beforeEach(() => resolveAuth(false));

    it('records message and stack', async () => {
      service.trackError('boom', 'Error: boom\n  at x');
      await flush();

      expect(sent[0].body.events[0]).toEqual(
        jasmine.objectContaining({ type: 'error', message: 'boom' }),
      );
    });

    it('stops after the per-session cap', async () => {
      // An error inside a render loop can fire without bound, and every send
      // is a billed write. The cap is the only thing between a bug and a bill.
      for (let i = 0; i < 40; i++) {
        service.trackError(`boom ${i}`);
      }
      await flush();

      expect(sent.length).toBe(10);
    });
  });

  describe('visitor id', () => {
    beforeEach(() => resolveAuth(false));

    it('persists so a session that later signs in can be stitched', async () => {
      service.trackPageview('/');
      await flush();
      const first = sent[0].body.visitorId;

      expect(first).toBeTruthy();
      expect(localStorage.getItem('xw_visitor_id')).toBe(first);

      service.trackPageview('/apps');
      await flush();
      expect(sent[1].body.visitorId).toBe(first);
    });

    it('never sends a client-supplied userId', async () => {
      service.trackPageview('/');
      await flush();

      // Identity is the backend's to decide, from verified claims or not at
      // all. Anything sent here would be forgeable.
      expect('userId' in sent[0].body).toBe(false);
    });
  });

  describe('privacy signals', () => {
    const withSignal = (prop: string, value: unknown) => {
      Object.defineProperty(navigator, prop, { value, configurable: true });
    };
    afterEach(() => {
      for (const prop of ['globalPrivacyControl', 'doNotTrack']) {
        if (prop in navigator) {
          Object.defineProperty(navigator, prop, { value: undefined, configurable: true });
        }
      }
    });

    it('sends nothing at all when Global Privacy Control is set', async () => {
      withSignal('globalPrivacyControl', true);
      resolveAuth(false);
      service.trackPageview('/');
      service.trackOutbound('Xomify', 'https://xomify.xomware.com');
      service.trackError('boom');
      await flush();

      expect(fetchSpy).not.toHaveBeenCalled();
    });

    it('sends nothing when Do Not Track is set', async () => {
      withSignal('doNotTrack', '1');
      resolveAuth(false);
      service.trackPageview('/');
      await flush();

      expect(fetchSpy).not.toHaveBeenCalled();
    });

    it('never creates a visitor id for a visitor who refused', async () => {
      withSignal('globalPrivacyControl', true);
      resolveAuth(false);
      service.trackPageview('/');
      await flush();

      expect(localStorage.getItem('xw_visitor_id')).toBeNull();
    });

    it('discards events buffered before the refusal was noticed', async () => {
      // Buffered while auth was unresolved, then GPC turns up. The refusal
      // applies to those too, not only to what comes after.
      service.trackPageview('/');
      withSignal('globalPrivacyControl', true);
      resolveAuth(false);
      await flush();

      expect(fetchSpy).not.toHaveBeenCalled();
    });

    it('still tracks when no privacy signal is present', async () => {
      resolveAuth(false);
      service.trackPageview('/');
      await flush();

      expect(fetchSpy).toHaveBeenCalled();
    });
  });

  it('swallows transport failures rather than surfacing them', async () => {
    fetchSpy.and.returnValue(Promise.reject(new Error('offline')));
    resolveAuth(false);

    await expectAsync(
      (async () => {
        service.trackPageview('/');
        await flush();
      })(),
    ).toBeResolved();
  });
});
