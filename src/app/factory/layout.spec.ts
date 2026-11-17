import { APPS, AppCard } from '../data/apps.data';
import { project } from './iso';
import { CAROUSEL, ZONES, cameraMax, lastStation, layoutLine, ringPoint } from './layout';

describe('layoutLine', () => {
  const layout = layoutLine(APPS);

  it('puts every public app on the line once, grouped web, then pools, then iOS', () => {
    const publicApps = APPS.filter((a) => !a.adminOnly);
    expect(layout.stations.length).toBe(publicApps.length);
    const order = layout.stations.map((s) => ZONES.findIndex((z) => z.platform === s.app.platform));
    expect(order).toEqual([...order].sort((a, b) => a - b));
    expect(layout.stations.some((s) => s.app.adminOnly)).toBeFalse();
  });

  it('spaces stations evenly within a line and further apart between lines', () => {
    const gaps = layout.stations.slice(1).map((s, i) => s.x - layout.stations[i].x);
    const within = gaps.filter((_, i) => layout.stations[i].app.platform === layout.stations[i + 1].app.platform);
    const between = gaps.filter((_, i) => layout.stations[i].app.platform !== layout.stations[i + 1].app.platform);
    expect(new Set(within).size).toBe(1);
    between.forEach((g) => expect(g).toBeGreaterThan(within[0]));
  });

  it('gives the first station of each line a banner instead of a crane', () => {
    layout.lines.forEach((line) => {
      const first = layout.stations.find((s) => s.app.platform === line.zone.platform);
      expect(first?.crane).toBeNull();
    });
  });

  it('keeps side belts clear of presses and cranes', () => {
    for (const side of layout.sides) {
      for (const s of layout.stations) {
        expect(Math.abs(side.x - s.press)).toBeGreaterThan(60);
        if (s.crane !== null) expect(Math.abs(side.x - s.crane)).toBeGreaterThan(60);
      }
    }
  });

  it('ends the belt at the sorter, past the last station and clear of the carousel', () => {
    expect(layout.beltEnd).toBeGreaterThan(layout.stations[layout.stations.length - 1].press);
    // The sorter box reaches 86 past the belt's end.
    const nearest = Math.min(...Array.from({ length: 360 }, (_, d) => ringPoint(layout, CAROUSEL.a, CAROUSEL.b, (d * Math.PI) / 180)[0]));
    expect(layout.beltEnd + 86).toBeLessThan(nearest);
  });

  it('stands floor speakers off the belts, and two on the carousel island', () => {
    const floor = layout.speakers.filter((s) => !s.island);
    for (const s of floor) {
      expect(Math.abs(s.y)).withContext('main belt').toBeGreaterThan(40 + 24);
      for (const side of layout.sides) {
        const sameSide = side.kind === 'in' ? s.y < 0 : s.y > 0;
        if (sameSide) expect(Math.abs(s.x - side.x)).withContext('side belt').toBeGreaterThan(30 + 24);
      }
    }
    const island = layout.speakers.filter((s) => s.island);
    expect(island.length).toBe(2);
    island.forEach((s) => expect(Math.hypot(s.x - layout.end.x, s.y - layout.end.y)).toBeLessThan(CAROUSEL.b - CAROUSEL.belt));
  });

  it('skips a line with no public apps', () => {
    const webOnly = APPS.filter((a): a is AppCard => a.platform === 'web');
    expect(layoutLine(webOnly).lines.map((l) => l.zone.label)).toEqual(['Line A']);
  });
});

describe('lastStation', () => {
  const layout = layoutLine(APPS);

  it('is null before the first press and follows the presses after it', () => {
    const [first, second] = layout.stations;
    expect(lastStation(layout, first.press - 1)).toBeNull();
    expect(lastStation(layout, first.press + 1)).toBe(first);
    expect(lastStation(layout, second.press + 1)).toBe(second);
  });
});

describe('cameraMax', () => {
  const layout = layoutLine(APPS);

  it('parks the carousel in the middle of the screen at any width', () => {
    for (const w of [390, 1024, 1440]) {
      const [x] = project({ w, h: 900, cam: cameraMax(layout, w) }, layout.end.x, layout.end.y, 0);
      expect(x).withContext(`${w}px`).toBeCloseTo(w / 2, 6);
    }
  });
});
