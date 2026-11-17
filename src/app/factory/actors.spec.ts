import { APPS } from '../data/apps.data';
import { Actors, Rand } from './actors';
import { CAROUSEL, layoutLine } from './layout';

/** A fixed-sequence random source so the scene comes out the same every run. */
function seeded(seed: number): Rand {
  let s = seed >>> 0;
  return () => {
    s = (s * 1664525 + 1013904223) >>> 0;
    return s / 4294967296;
  };
}

describe('Actors', () => {
  const layout = layoutLine(APPS);

  it('carries one package per app round the carousel, evenly spaced', () => {
    const a = new Actors(layout, seeded(1));
    const spots = a.spots(0);
    expect(spots.map((s) => s.station)).toEqual(layout.stations);
    const step = (Math.PI * 2) / spots.length;
    spots.slice(1).forEach((s, i) => expect(s.th - spots[i].th).toBeCloseTo(step, 9));
  });

  it('turns the carousel, and holds it still while a tag is being read', () => {
    const a = new Actors(layout, seeded(2));
    a.update(1, 1, 0, 1440);
    const turned = a.spin;
    expect(turned).toBeGreaterThan(0);
    a.hold = true;
    a.update(1, 2, 0, 1440);
    expect(a.spin).toBe(turned);
  });

  it('hops the package of the app whose crate reaches the sorter', () => {
    const a = new Actors(layout, seeded(3));
    a.crates = [{ x: layout.beltEnd - 1, y: 0, dead: 0, pop: 0 }];
    a.update(0.05, 10, 0, 1440);
    const last = layout.stations.length - 1;
    const spots = a.spots(10.25);
    expect(spots[last].z).toBeGreaterThan(CAROUSEL.height);
    spots.slice(0, last).forEach((s) => expect(s.z).toBe(CAROUSEL.height));
    expect(a.sorted).toBe(10);
  });

  it('makes walkers by a speaker dance, but only while a track plays', () => {
    const a = new Actors(layout, seeded(5));
    const [speaker] = layout.speakers;
    const walker = a.workers.find((w) => w.role === 'walker')!;
    const park = () => Object.assign(walker, { x: speaker.x + 80, y: speaker.y, panic: 0 });
    park();
    a.update(0.01, 1, 0, 1440);
    expect(walker.groove).toBeFalse();
    a.music = true;
    park();
    a.update(0.01, 2, 0, 1440);
    expect(walker.groove).toBeTrue();
  });

  it('makes workers near a malfunction panic and leaves distant ones alone', () => {
    const a = new Actors(layout, seeded(4));
    const x = layout.stations[2].x;
    a.boom(x, 0, 10);
    a.workers.forEach((w) => {
      if (Math.hypot(w.x - x, w.y) < 300) expect(w.panic).toBeGreaterThan(0);
      else expect(w.panic).toBe(0);
    });
  });
});
