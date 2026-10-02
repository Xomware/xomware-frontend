import { INTRO_IMPACT, Rect, introLayout, markRect, planetAt, planetCount, plateRect, skipRect } from './intro-layout';

const VIEWPORTS: [number, number][] = [
  [360, 640],
  [360, 780],
  [390, 844],
  [414, 896],
  [768, 1024],
  [1024, 768],
  [1280, 720],
  [1440, 900],
  [1920, 1080],
];
const PLANETS = 11;

const overlaps = (a: Rect, b: Rect, pad = 0): boolean =>
  a.x < b.x + b.w + pad && b.x < a.x + a.w + pad && a.y < b.y + b.h + pad && b.y < a.y + a.h + pad;

function boxes(w: number, h: number, t: number): { plates: Rect[]; bodies: Rect[] } {
  const L = introLayout(w, h, PLANETS);
  const plates: Rect[] = [];
  const bodies: Rect[] = [];
  for (const slot of L.slots) {
    const p = planetAt(L, slot, t);
    plates.push(plateRect(L, slot, p.x, p.y));
    bodies.push({ x: p.x - slot.radius, y: p.y - slot.radius, w: slot.radius * 2, h: slot.radius * 2 });
  }
  return { plates, bodies };
}

describe('introLayout', () => {
  it('shows fewer planets on a phone', () => {
    expect(planetCount(390, 844, PLANETS)).toBe(6);
    expect(planetCount(1440, 900, PLANETS)).toBe(PLANETS);
  });

  for (const [w, h] of VIEWPORTS) {
    it(`keeps every label clear of the others, the mark and the Skip button at ${w}x${h}`, () => {
      const L = introLayout(w, h, PLANETS);
      const mark = markRect(L);
      const skip = skipRect(L);
      for (let t = 0; t <= INTRO_IMPACT; t += 0.1) {
        const { plates, bodies } = boxes(w, h, t);
        plates.forEach((plate, i) => {
          const at = `planet ${i} at t=${t.toFixed(1)}`;
          expect(plate.x).withContext(at).toBeGreaterThanOrEqual(0);
          expect(plate.x + plate.w).withContext(at).toBeLessThanOrEqual(w);
          expect(plate.y + plate.h).withContext(at).toBeLessThanOrEqual(h);
          expect(overlaps(plate, mark, 6)).withContext(`${at} vs mark`).toBeFalse();
          expect(overlaps(plate, skip)).withContext(`${at} vs skip`).toBeFalse();
          plates.forEach((other, j) => {
            if (j !== i) expect(overlaps(plate, other, 4)).withContext(`${at} vs plate ${j}`).toBeFalse();
          });
          bodies.forEach((body, j) => {
            if (j !== i) expect(overlaps(plate, body, 2)).withContext(`${at} vs planet ${j}`).toBeFalse();
          });
          expect(bodies[i].y).withContext(at).toBeGreaterThanOrEqual(0);
          expect(overlaps(bodies[i], mark, 4)).withContext(`${at} body vs mark`).toBeFalse();
        });
      }
    });
  }
});
