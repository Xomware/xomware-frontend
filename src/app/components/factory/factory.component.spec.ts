import { ComponentFixture, TestBed } from '@angular/core/testing';
import { APPS } from '../../data/apps.data';
import { FactoryComponent } from './factory.component';

describe('FactoryComponent', () => {
  let fixture: ComponentFixture<FactoryComponent>;
  let el: HTMLElement;
  const publicApps = APPS.filter((a) => !a.adminOnly);

  beforeEach(() => {
    TestBed.configureTestingModule({ imports: [FactoryComponent] });
    fixture = TestBed.createComponent(FactoryComponent);
    el = fixture.nativeElement;
    fixture.detectChanges();
  });

  afterEach(() => fixture.destroy());

  it('hangs a station card for every public app, with a working link unless it is coming soon', () => {
    const cards = el.querySelectorAll('article.card');
    expect(cards.length).toBe(publicApps.length);
    // Cards follow the line, which groups by platform, not the order of APPS.
    fixture.componentInstance.layout.stations.forEach(({ app }, i) => {
      const card = cards[i];
      expect(card.querySelector('.card-name')?.textContent).toBe(app.name);
      const link = card.querySelector<HTMLAnchorElement>('a.card-go');
      if (app.status === 'coming-soon') expect(link).toBeNull();
      else expect(link?.getAttribute('href')).toBe(app.url);
    });
  });

  it('hangs a shipping tag on every public app, linking out unless it is coming soon', () => {
    const tags = el.querySelectorAll<HTMLAnchorElement>('.ship');
    expect(tags.length).toBe(publicApps.length);
    fixture.componentInstance.layout.stations.forEach(({ app }, i) => {
      expect(tags[i].querySelector('.ship-name')?.textContent).toContain(app.name);
      expect(tags[i].getAttribute('href')).toBe(app.status === 'coming-soon' ? null : app.url);
    });
    APPS.filter((a) => a.adminOnly).forEach((a) => expect(el.textContent).not.toContain(a.name));
  });

  it('offers a button per line, the carousel and the flat list', () => {
    const labels = Array.from(el.querySelectorAll('.hud button')).map((b) => b.getAttribute('aria-label') ?? b.textContent?.trim());
    expect(labels).toEqual(['Line A · Web apps', 'Line B · Leagues & pools', 'Line C · iOS', 'Shipping', 'All apps ↓']);
  });

  it('shows what Xomify is playing, or what it last played, and nothing without a track', () => {
    const track = { name: 'Midnight City', artist: 'M83', albumArt: 'art.jpg', url: 'https://open.spotify.com/track/x' };
    const state = { isPlaying: true, track, progressMs: 0, durationMs: 1, source: 'playing' as const, playedAt: null };
    fixture.componentRef.setInput('nowPlaying', state);
    fixture.detectChanges();
    const panel = () => el.querySelector<HTMLAnchorElement>('.np');
    expect(panel()?.textContent).toContain('Now playing');
    expect(panel()?.textContent).toContain('Midnight City');
    expect(panel()?.getAttribute('href')).toBe(track.url);
    fixture.componentRef.setInput('nowPlaying', { ...state, isPlaying: false, source: 'recent' as const, playedAt: '2026-11-17T10:00:00Z' });
    fixture.detectChanges();
    expect(panel()?.textContent).toContain('Last played');
    fixture.componentRef.setInput('nowPlaying', { ...state, track: null, source: 'none' as const });
    fixture.detectChanges();
    expect(panel()).toBeNull();
  });

  it('gives the page scroll distance for the whole tour', () => {
    const track = el.querySelector<HTMLElement>('.track');
    expect(track?.offsetHeight).toBeCloseTo(fixture.componentInstance.trackHeight(), -1);
    expect(fixture.componentInstance.trackHeight()).toBeGreaterThan(innerHeight);
  });
});
