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

  it('lists every public app in the pit, grouped by line, and never an admin-only one', () => {
    const names = Array.from(el.querySelectorAll('.pit-list a b')).map((b) => b.textContent);
    expect(names).toEqual(jasmine.arrayWithExactContents(publicApps.map((a) => a.name)));
    expect(el.querySelectorAll('.pit-line').length).toBe(3);
    APPS.filter((a) => a.adminOnly).forEach((a) => expect(el.textContent).not.toContain(a.name));
  });

  it('offers a button per line plus All apps', () => {
    const labels = Array.from(el.querySelectorAll('.hud button')).map((b) => b.textContent?.trim());
    expect(labels).toEqual(['Line A · Web apps', 'Line B · Leagues & pools', 'Line C · iOS', 'All apps ↓']);
  });

  it('gives the page scroll distance for the whole tour', () => {
    const track = el.querySelector<HTMLElement>('.track');
    expect(track?.offsetHeight).toBeCloseTo(fixture.componentInstance.trackHeight(), -1);
    expect(fixture.componentInstance.trackHeight()).toBeGreaterThan(innerHeight);
  });
});
