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
    const labels = Array.from(el.querySelectorAll('.hud button')).map((b) => b.textContent?.trim());
    expect(labels).toEqual(['Line A · Web apps', 'Line B · Leagues & pools', 'Line C · iOS', 'Shipping', 'All apps ↓']);
  });

  it('gives the page scroll distance for the whole tour', () => {
    const track = el.querySelector<HTMLElement>('.track');
    expect(track?.offsetHeight).toBeCloseTo(fixture.componentInstance.trackHeight(), -1);
    expect(fixture.componentInstance.trackHeight()).toBeGreaterThan(innerHeight);
  });
});
