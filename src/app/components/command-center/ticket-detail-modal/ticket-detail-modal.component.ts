import {
  Component,
  Input,
  Output,
  EventEmitter,
  OnChanges,
  SimpleChanges,
  ElementRef,
  ChangeDetectorRef,
} from '@angular/core';
import { TicketDetailService, TicketDetail } from '../../../services/ticket-detail.service';
import MarkdownIt from 'markdown-it';

@Component({
  selector: 'app-ticket-detail-modal',
  templateUrl: './ticket-detail-modal.component.html',
  styleUrls: ['./ticket-detail-modal.component.scss'],
})
export class TicketDetailModalComponent implements OnChanges {
  @Input() issueUrl: string | null = null;
  @Output() closed = new EventEmitter<void>();

  ticket: TicketDetail | null = null;
  loading = false;
  error = false;
  renderedBody = '';

  private md: MarkdownIt;

  constructor(
    private ticketService: TicketDetailService,
    private el: ElementRef,
    private cdr: ChangeDetectorRef,
  ) {
    this.md = new MarkdownIt({
      html: false,
      linkify: true,
      breaks: true,
    });
  }

  get isOpen(): boolean {
    return this.issueUrl !== null;
  }

  ngOnChanges(changes: SimpleChanges): void {
    if (changes['issueUrl'] && this.issueUrl) {
      this.loadTicket();
    }
  }

  async loadTicket(): Promise<void> {
    if (!this.issueUrl) return;
    const parsed = this.ticketService.parseIssueUrl(this.issueUrl);
    if (!parsed) {
      this.error = true;
      return;
    }

    this.loading = true;
    this.error = false;
    this.ticket = null;
    this.cdr.detectChanges();

    const ticket = await this.ticketService.fetchTicket(parsed.owner, parsed.repo, parsed.issueNumber);
    this.loading = false;

    if (!ticket) {
      this.error = true;
      this.cdr.detectChanges();
      return;
    }

    this.ticket = ticket;
    this.renderedBody = this.md.render(ticket.body);
    this.cdr.detectChanges();
  }

  close(): void {
    this.issueUrl = null;
    this.ticket = null;
    this.loading = false;
    this.error = false;
    this.closed.emit();
  }

  onOverlayClick(event: MouseEvent): void {
    if (event.target === event.currentTarget) {
      this.close();
    }
  }

  onKeydown(event: KeyboardEvent): void {
    if (event.key === 'Escape') {
      this.close();
    }
  }

  formatDate(dateStr: string): string {
    const d = new Date(dateStr);
    return d.toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  }

  relativeTime(dateStr: string): string {
    const now = Date.now();
    const then = new Date(dateStr).getTime();
    const diffMs = now - then;
    const mins = Math.floor(diffMs / 60000);
    if (mins < 60) return `${mins}m ago`;
    const hrs = Math.floor(mins / 60);
    if (hrs < 24) return `${hrs}h ago`;
    const days = Math.floor(hrs / 24);
    if (days < 30) return `${days}d ago`;
    return `${Math.floor(days / 30)}mo ago`;
  }

  getPrStatusIcon(pr: { state: string; merged: boolean; draft: boolean }): string {
    if (pr.merged) return '🟣';
    if (pr.draft) return '⚪';
    if (pr.state === 'open') return '🟢';
    if (pr.state === 'closed') return '🔴';
    return '⚪';
  }

  getPrStatusLabel(pr: { state: string; merged: boolean; draft: boolean }): string {
    if (pr.merged) return 'Merged';
    if (pr.draft) return 'Draft';
    if (pr.state === 'open') return 'Open';
    if (pr.state === 'closed') return 'Closed';
    return pr.state;
  }

  getIssueStateIcon(state: string): string {
    return state === 'open' ? '🟢' : '🟣';
  }

  getLabelTextColor(bgHex: string): string {
    // Determine if label needs light or dark text
    const r = parseInt(bgHex.substring(0, 2), 16);
    const g = parseInt(bgHex.substring(2, 4), 16);
    const b = parseInt(bgHex.substring(4, 6), 16);
    const luminance = (0.299 * r + 0.587 * g + 0.114 * b) / 255;
    return luminance > 0.5 ? '#000000' : '#ffffff';
  }
}
