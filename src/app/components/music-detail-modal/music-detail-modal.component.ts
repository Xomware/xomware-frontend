import {
  Component,
  ElementRef,
  EventEmitter,
  HostListener,
  Input,
  OnChanges,
  OnDestroy,
  Output,
  QueryList,
  SimpleChanges,
  ViewChildren,
} from '@angular/core';
import { MusicDetailItem } from '../../models/music.model';
import { environment } from '../../../environments/environment';

const XOMIFY_WEB_URL = environment.xomifyWebUrl;

/** Extracts the Spotify entity ID from an open.spotify.com URL.
 *  E.g. "https://open.spotify.com/artist/4q3ewBCX7sLwd24euuV69X" → "4q3ewBCX7sLwd24euuV69X"
 *  Returns null if the URL doesn't match the expected pattern.
 */
function extractSpotifyId(url: string): string | null {
  try {
    const parsed = new URL(url);
    if (!parsed.hostname.includes('spotify.com')) return null;
    const segments = parsed.pathname.split('/').filter(Boolean);
    return segments[segments.length - 1] ?? null;
  } catch {
    return null;
  }
}

@Component({
  selector: 'app-music-detail-modal',
  templateUrl: './music-detail-modal.component.html',
  styleUrls: ['./music-detail-modal.component.scss'],
})
export class MusicDetailModalComponent implements OnChanges, OnDestroy {
  @Input() item: MusicDetailItem | null = null;
  @Output() readonly close = new EventEmitter<void>();

  /** All focusable interactive elements inside the dialog — used for tab-trap. */
  @ViewChildren('focusable') focusableEls!: QueryList<ElementRef<HTMLElement>>;

  /** The element that had focus when the modal opened — restored on close. */
  private triggerEl: HTMLElement | null = null;

  get xomifyArtistUrl(): string | null {
    if (!this.item || this.item.kind !== 'artist') return null;
    const id = extractSpotifyId(this.item.spotifyUrl);
    if (!id) return null;
    return `${XOMIFY_WEB_URL}/artist-profile/${id}`;
  }

  ngOnChanges(changes: SimpleChanges): void {
    if (!changes['item']) return;

    const opened = changes['item'].currentValue !== null;
    const closed = changes['item'].currentValue === null;

    if (opened) {
      this.triggerEl = document.activeElement as HTMLElement | null;
      document.body.style.overflow = 'hidden';
      // Defer focus to after the view is rendered.
      requestAnimationFrame(() => this.focusFirst());
    }

    if (closed) {
      document.body.style.overflow = '';
      this.triggerEl?.focus();
      this.triggerEl = null;
    }
  }

  ngOnDestroy(): void {
    // Safety: restore scroll if the component is destroyed while open.
    document.body.style.overflow = '';
  }

  dismiss(): void {
    this.close.emit();
  }

  onBackdropClick(event: MouseEvent): void {
    // Only close when clicking the backdrop itself, not the card.
    if (event.target === event.currentTarget) {
      this.dismiss();
    }
  }

  @HostListener('keydown', ['$event'])
  onKeydown(event: KeyboardEvent): void {
    if (!this.item) return;

    if (event.key === 'Escape') {
      event.preventDefault();
      this.dismiss();
      return;
    }

    if (event.key === 'Tab') {
      this.trapFocus(event);
    }
  }

  private focusFirst(): void {
    const els = this.focusableEls?.toArray();
    if (els?.length) {
      els[0].nativeElement.focus();
    }
  }

  private trapFocus(event: KeyboardEvent): void {
    const els = this.focusableEls?.toArray().map((r) => r.nativeElement) ?? [];
    if (els.length === 0) return;

    const first = els[0];
    const last = els[els.length - 1];
    const focused = document.activeElement as HTMLElement | null;

    if (event.shiftKey) {
      if (focused === first) {
        event.preventDefault();
        last.focus();
      }
    } else {
      if (focused === last) {
        event.preventDefault();
        first.focus();
      }
    }
  }
}
