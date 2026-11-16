import { APPS, AppCard } from '../data/apps.data';
import { PIT_R, ZONES, cameraMax, lastStation, layoutLine } from './layout';

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

  it('ends the belt at the near edge of the pit, past the last station', () => {
    expect(layout.beltEnd).toBe(layout.pit - PIT_R);
    expect(layout.beltEnd).toBeGreaterThan(layout.stations[layout.stations.length - 1].press);
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

  it('parks the pit at the anchor on wide screens and stops short of it on phones', () => {
    expect(cameraMax(layout, 1440)).toBe(layout.pit);
    expect(cameraMax(layout, 390)).toBeLessThan(layout.pit);
  });
});
