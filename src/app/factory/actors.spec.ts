import { APPS } from '../data/apps.data';
import { Actors, Rand, mound } from './actors';
import { PIT_R, layoutLine } from './layout';

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

  it('starts the pit with two crates per app, resting on the mound', () => {
    const a = new Actors(layout, seeded(1));
    expect(a.pile.length).toBe(layout.stations.length * 2);
    a.pile.forEach((b) => {
      expect(b.settled).toBeTrue();
      expect(b.z).toBeCloseTo(mound(layout, b.x, b.y), 6);
    });
  });

  it('drops crates that reach the end of the belt into the pit, carrying the last press logo', () => {
    const a = new Actors(layout, seeded(2));
    a.crates = [{ x: layout.beltEnd - 1, y: 0, dead: 0, pop: 0 }];
    const before = a.pile.length;
    a.update(0.05, 10, 0, 1440);
    const dropped = a.pile[a.pile.length - 1];
    expect(a.pile.length).toBe(Math.min(before + 1, 48));
    expect(dropped.settled).toBeFalse();
    expect(dropped.app).toBe(layout.stations[layout.stations.length - 1].app);
  });

  it('settles a falling crate onto the pile inside the pit', () => {
    const a = new Actors(layout, seeded(3));
    a.pile = [{ x: layout.pit, y: 0, z: 200, vx: 0, vy: 0, vz: 0, app: null, settled: false }];
    for (let i = 0; i < 400; i++) a.settlePile(1 / 60);
    const [b] = a.pile;
    expect(b.settled).toBeTrue();
    expect(b.z).toBeCloseTo(mound(layout, b.x, b.y), 6);
    expect(Math.abs(b.x - layout.pit)).toBeLessThanOrEqual(PIT_R);
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
