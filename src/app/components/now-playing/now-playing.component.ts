import {
  Component,
  Input,
  OnDestroy,
  OnInit,
} from '@angular/core';
import { Subscription, interval } from 'rxjs';
import { switchMap, startWith } from 'rxjs/operators';
import { NowPlayingService } from '../../services/now-playing.service';
import { NowPlayingState } from '../../models/now-playing.model';
import { environment } from '../../../environments/environment';

/** Polling interval in milliseconds. */
const POLL_INTERVAL_MS = 25_000;

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
          this.nowPlayingService.getNowPlaying(environment.musicProfileUserId),
        ),
      )
      .subscribe({
        next: (s) => (this.state = s),
        error: () => {
          // On error, keep stale state if available; otherwise null.
          if (!this.state) this.state = null;
        },
      });
  }

  ngOnDestroy(): void {
    this.pollSub?.unsubscribe();
  }

  get progressPercent(): number {
    if (!this.state?.progressMs || !this.state?.durationMs) return 0;
    return Math.min(100, (this.state.progressMs / this.state.durationMs) * 100);
  }

  get isVisible(): boolean {
    if (!this.state) return false;
    if (this.state.isPlaying && this.state.track) return true;
    return this.showWhenIdle;
  }
}
