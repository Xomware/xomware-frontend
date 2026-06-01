import {
  Component,
  Input,
  OnDestroy,
  OnInit,
} from '@angular/core';
import { Subscription, interval, of } from 'rxjs';
import { switchMap, startWith, catchError } from 'rxjs/operators';
import { NowPlayingService } from '../../services/now-playing.service';
import { NowPlayingState } from '../../models/now-playing.model';
import { environment } from '../../../environments/environment';

/** Polling interval in milliseconds. */
const POLL_INTERVAL_MS = 25_000;

/** Safe idle state emitted when a poll request errors, so the interval keeps firing. */
const IDLE_STATE: NowPlayingState = {
  isPlaying: false,
  track: null,
  progressMs: null,
  durationMs: null,
  source: 'none',
  playedAt: null,
};

/**
 * Polls the now-playing endpoint every 25 seconds and displays the
 * currently playing track.
 *
 * When `showWhenIdle` is false (landing placement), the component renders
 * nothing when no track is playing. When true (/music placement), it shows
 * a quiet "Not playing right now" state.
 */
@Component({
  selector: 'app-now-playing',
  templateUrl: './now-playing.component.html',
  styleUrls: ['./now-playing.component.scss'],
})
export class NowPlayingComponent implements OnInit, OnDestroy {
  /**
   * When false (landing), hide entirely when not playing.
   * When true (/music), show a "Not playing" placeholder.
   */
  @Input() showWhenIdle = false;

  state: NowPlayingState | null = null;
  private pollSub?: Subscription;

  constructor(private nowPlayingService: NowPlayingService) {}

  ngOnInit(): void {
    this.pollSub = interval(POLL_INTERVAL_MS)
      .pipe(
        startWith(0),
        switchMap(() =>
          this.nowPlayingService
            .getNowPlaying(environment.musicProfileUserId)
            .pipe(
              // On error emit a safe idle state so the outer interval keeps firing.
              catchError(() => of(IDLE_STATE)),
            ),
        ),
      )
      .subscribe((s) => (this.state = s));
  }

  ngOnDestroy(): void {
    this.pollSub?.unsubscribe();
  }

  get progressPercent(): number {
    if (!this.state?.progressMs || !this.state?.durationMs) return 0;
    return Math.min(100, (this.state.progressMs / this.state.durationMs) * 100);
  }

  /**
   * Show whenever there is a track (playing or recent).
   * When source === 'none', only show if showWhenIdle (the /music page idle placeholder).
   */
  get isVisible(): boolean {
    if (!this.state) return false;
    if (this.state.track) return true;
    return this.showWhenIdle;
  }

  /** Human-readable relative time from an ISO string (e.g. "2h ago"). */
  relativeTime(iso: string): string {
    const diffMs = Date.now() - new Date(iso).getTime();
    const diffMins = Math.floor(diffMs / 60_000);

    if (diffMins < 1) return 'just now';
    if (diffMins < 60) return `${diffMins}m ago`;

    const diffHours = Math.floor(diffMins / 60);
    if (diffHours < 24) return `${diffHours}h ago`;

    const diffDays = Math.floor(diffHours / 24);
    if (diffDays === 1) return '1 day ago';
    if (diffDays < 30) return `${diffDays} days ago`;

    const diffWeeks = Math.floor(diffDays / 7);
    if (diffWeeks === 1) return '1 week ago';
    if (diffWeeks < 8) return `${diffWeeks} weeks ago`;

    const diffMonths = Math.floor(diffDays / 30);
    if (diffMonths === 1) return '1 month ago';
    return `${diffMonths} months ago`;
  }
}
