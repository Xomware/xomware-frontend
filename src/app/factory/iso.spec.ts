import { project, unproject } from './iso';

describe('isometric projection', () => {
  const view = { w: 1440, h: 900, cam: 2300 };

  it('round-trips floor points through unproject', () => {
    for (const [x, y] of [[0, 0], [2300, 0], [3100, -400], [5000, 380]]) {
      const [sx, sy] = project(view, x, y, 0);
      const [bx, by] = unproject(view, sx, sy);
      expect(bx).toBeCloseTo(x, 6);
      expect(by).toBeCloseTo(y, 6);
    }
  });

  it('runs the line down and to the right, and lifts things on screen as z grows', () => {
    const [ax, ay] = project(view, 2300, 0, 0);
    const [bx, by] = project(view, 2400, 0, 0);
    const [, uy] = project(view, 2300, 0, 50);
    expect(bx).toBeGreaterThan(ax);
    expect(by).toBeGreaterThan(ay);
    expect(uy).toBe(ay - 50);
  });
});
