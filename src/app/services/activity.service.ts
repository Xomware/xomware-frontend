import { Injectable } from '@angular/core';
import { environment } from '../../environments/environment';

export type ActivityEventType = 'pageview' | 'outbound' | 'error';

interface ActivityEvent {
  type: ActivityEventType;
  path?: string;
  referrer?: string;
  target?: string;
  app?: string;
  message?: string;
  stack?: string;
}

/** localStorage key for the anonymous visitor id. */
const VISITOR_KEY = 'xw_visitor_id';

/**
 * Errors are capped per session on purpose. An exception thrown inside a
 * render or a retry loop can fire hundreds of times a second, and every one
 * would be a billed write against a PAY_PER_REQUEST table. The failure mode
 * of an uncapped error reporter is a surprise AWS bill, not a crash.
 */
const MAX_ERRORS_PER_SESSION = 10;

/**
 * Records visitor activity to the shared Xomware events table, the same one
 * the Cognito trigger writes sign-ins to. Read back by the /admin portal.
 *
 * Most of xomware.com is public — the landing page, /apps and /music need no
 * account — so the majority of traffic worth recording is anonymous. That is
 * why there are two endpoints: signed-in visitors post to /events/track-user
 * where API Gateway verifies the JWT and the backend can trust the identity,
 * and everyone else posts to the public /events/track and is recorded against
 * their anonymous visitor id. The backend never trusts a client-sent userId.
 *
 * Every failure here is swallowed. Analytics must not be able to break a page
 * or surface an error to a visitor.
 */
@Injectable({ providedIn: 'root' })
export class ActivityService {
  private readonly baseUrl = environment.usersApiUrl;

  /** Set by AppComponent from the Cognito user stream. */
  private jwtProvider: (() => Promise<string | null>) | null = null;
  private signedIn = false;

  /**
   * CognitoService seeds `user$` with a synchronous `null` and only resolves
   * the real session asynchronously — the same "stale null on first paint"
   * problem `isReady$` exists to solve for route guards. Without gating on it,
   * the first pageview of every session would be filed as anonymous even for a
   * signed-in visitor. Events raised before auth settles are buffered here and
   * flushed once it does.
   */
  private authResolved = false;
  private pending: ActivityEvent[] = [];
  /** A visitor who never resolves auth should not accumulate forever. */
  private static readonly MAX_PENDING = 20;

  private lastPath: string | null = null;
  private errorCount = 0;
  /** Sent once per page load, not on every SPA navigation. */
  private referrerSent = false;

  /**
   * Stable per-browser id. Deliberately survives sign-in, so a session that
   * starts anonymous and later authenticates can be stitched together.
   */
  private get visitorId(): string {
    try {
      let id = localStorage.getItem(VISITOR_KEY);
      if (!id) {
        id = this.uuid();
        localStorage.setItem(VISITOR_KEY, id);
      }
      return id;
    } catch {
      // Private browsing / storage disabled — still send, just unstitched.
      return 'unknown';
    }
  }

  private uuid(): string {
    // randomUUID needs a secure context; http:// dev hosts fall back.
    if (typeof crypto !== 'undefined' && 'randomUUID' in crypto) {
      return crypto.randomUUID();
    }
    return `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 10)}`;
  }

  /**
   * Wires the auth state in. Called by AppComponent once the Cognito session
   * check has settled; the first call releases anything buffered before then.
   */
  registerAuth(signedIn: boolean, jwtProvider: () => Promise<string | null>): void {
    this.signedIn = signedIn;
    this.jwtProvider = jwtProvider;

    const wasResolved = this.authResolved;
    this.authResolved = true;
    if (!wasResolved && this.pending.length) {
      const flushed = this.pending;
      this.pending = [];
      void this.send(flushed);
    }
  }

  trackPageview(path: string): void {
    // Angular re-emits NavigationEnd for the same URL on some redirects; a
    // duplicate row per redirect would double every page's count.
    if (path === this.lastPath) return;
    this.lastPath = path;

    const event: ActivityEvent = { type: 'pageview', path };
    if (!this.referrerSent) {
      this.referrerSent = true;
      const ref = typeof document !== 'undefined' ? document.referrer : '';
      if (ref) event.referrer = ref;
    }
    void this.send([event]);
  }

  /** A click through to one of the apps — the "where did they go" signal. */
  trackOutbound(app: string, target: string): void {
    void this.send([{ type: 'outbound', app, target, path: this.lastPath ?? undefined }]);
  }

  trackError(message: string, stack?: string): void {
    if (this.errorCount >= MAX_ERRORS_PER_SESSION) return;
    this.errorCount += 1;
    void this.send([
      {
        type: 'error',
        // Trimmed here as well as server-side. Framework stacks run long and
        // there is no value in shipping 40KB over the wire to have the backend
        // cut it to 2KB anyway.
        message: message.slice(0, 500),
        stack: stack?.slice(0, 2048),
        path: this.lastPath ?? undefined,
      },
    ]);
  }

  /**
   * Global Privacy Control and Do Not Track. A visitor who sets either has
   * asked, in the only machine-readable way available to them, not to be
   * tracked — so they are not, at all: no request, no visitor id, no row.
   *
   * This is what lets the site do first-party analytics without a consent
   * banner in good conscience. Checked per-send rather than cached because a
   * browser extension can flip it mid-session.
   */
  private get trackingRefused(): boolean {
    if (typeof navigator === 'undefined') return false;
    const nav = navigator as Navigator & {
      globalPrivacyControl?: boolean;
      doNotTrack?: string | null;
      msDoNotTrack?: string | null;
    };
    if (nav.globalPrivacyControl === true) return true;
    const dnt =
      nav.doNotTrack ??
      nav.msDoNotTrack ??
      (typeof window !== 'undefined'
        ? (window as Window & { doNotTrack?: string | null }).doNotTrack
        : null);
    return dnt === '1' || dnt === 'yes';
  }

  private async send(events: ActivityEvent[]): Promise<void> {
    if (this.trackingRefused) {
      // Drop anything buffered too — the refusal applies retroactively within
      // the session, not just to events raised after it was noticed.
      this.pending = [];
      return;
    }

    if (!this.authResolved) {
      if (this.pending.length < ActivityService.MAX_PENDING) {
        this.pending.push(...events);
      }
      return;
    }

    try {
      const token = this.signedIn && this.jwtProvider ? await this.jwtProvider() : null;
      const url = `${this.baseUrl}/events/${token ? 'track-user' : 'track'}`;

      await fetch(url, {
        method: 'POST',
        // keepalive lets the request outlive the page. Outbound clicks
        // navigate away immediately, so without it the most interesting
        // event is also the one most likely to be cancelled in flight.
        keepalive: true,
        headers: {
          'Content-Type': 'application/json',
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
        body: JSON.stringify({ visitorId: this.visitorId, events }),
      });
    } catch {
      // Swallowed by design — see the class comment.
    }
  }
}
