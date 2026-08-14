import { ErrorHandler, Injectable, Injector, inject } from '@angular/core';
import { ActivityService } from './activity.service';

/**
 * Reports uncaught errors to the activity log, then defers to Angular's own
 * handler so console output is exactly what it was before.
 *
 * ActivityService is resolved lazily through the Injector: an ErrorHandler is
 * constructed very early in bootstrap, and injecting a service that reaches
 * for HTTP/config at that point risks a cyclic dependency.
 */
@Injectable()
export class GlobalErrorHandler extends ErrorHandler {
  private readonly injector = inject(Injector);

  override handleError(error: unknown): void {
    try {
      const activity = this.injector.get(ActivityService);
      const err = error as { message?: string; stack?: string } | null;
      const message =
        (err && typeof err.message === 'string' && err.message) ||
        String(error) ||
        'Unknown error';
      activity.trackError(message, err?.stack);
    } catch {
      // Reporting must never mask the original error.
    }

    // Last, so a failure in reporting cannot stop the error surfacing.
    super.handleError(error);
  }
}
