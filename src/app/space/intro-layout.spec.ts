import { PLANETS as APPS_IN_ORBIT } from '../data/planets';
import {
  INTRO_IMPACT,
  bodyRect,
  introLayout,
  labelAt,
  markRect,
  overlaps,
  planetAt,
  plateRect,
  skipRect,
} from './intro-layout';

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
// The real list, so adding an app re-runs the layout sweep against it.
const PLANETS = APPS_IN_ORBIT.length;
const POOLS = APPS_IN_ORBIT.filter((p) => p.pool).length;

describe('introLayout', () => {
  for (const [w, h] of VIEWPORTS) {
    describe(`at ${w}x${h}`, () => {
      const L = introLayout(w, h, PLANETS, POOLS);

      it('puts every app in orbit, on screen', () => {
        expect(L.slots.length).toBe(PLANETS);
        for (let t = 0; t <= INTRO_IMPACT; t += 0.1) {
          for (const slot of L.slots) {
            const body = bodyRect(slot, planetAt(L, slot, t));
            const at = `planet ${slot.index} at t=${t.toFixed(1)}`;
            expect(body.x).withContext(at).toBeGreaterThanOrEqual(0);
            expect(body.y).withContext(at).toBeGreaterThanOrEqual(0);
            expect(body.x + body.w).withContext(at).toBeLessThanOrEqual(w);
            expect(body.y + body.h).withContext(at).toBeLessThanOrEqual(h);
          }
        }
      });

      it('shows every banner at some point', () => {
        L.slots.forEach((slot) => {
          let best = 0;
          for (let t = 0; t <= INTRO_IMPACT; t += 0.05) best = Math.max(best, labelAt(L, slot.index, t).alpha);
          expect(best).withContext(`planet ${slot.index}`).toBe(1);
        });
      });

      it('shows every banner for more than a glimpse', () => {
        L.slots.forEach((slot) => {
          const windows = L.labels.filter((row) => row[slot.index] >= 0).length;
          expect(windows).withContext(`planet ${slot.index}`).toBeGreaterThanOrEqual(4);
        });
      });

      it('circles the leagues and pools round the mark on the inner ring, not over it', () => {
        const mark = markRect(L);
        L.slots.forEach((slot) => {
          expect(slot.ring === 0).withContext(`planet ${slot.index}`).toBe(APPS_IN_ORBIT[slot.index].pool);
          if (slot.ring > 0) return;
          let on = 0;
          let n = 0;
          for (let t = 0.6; t <= INTRO_IMPACT; t += 0.05, n++) {
            if (overlaps(bodyRect(slot, planetAt(L, slot, t)), mark, -4)) on++;
          }
          expect(on / n).withContext(`planet ${slot.index} over the mark`).toBeLessThan(0.1);
        });
      });

      it('keeps every visible banner clear of the others, the planets, the mark and Skip', () => {
        const mark = markRect(L);
        const skip = skipRect(L);
        for (let t = 0.013; t <= INTRO_IMPACT; t += 0.05) {
          const pos = L.slots.map((slot) => planetAt(L, slot, t));
          const bodies = L.slots.map((slot, i) => bodyRect(slot, pos[i]));
          const plates = L.slots.map((slot, i) => {
            const label = labelAt(L, i, t);
            return label.alpha > 0 ? plateRect(L, slot, pos[i], label.anchor) : null;
          });
          plates.forEach((plate, i) => {
            if (!plate) return;
            const at = `planet ${i} at t=${t.toFixed(2)}`;
            expect(plate.x).withContext(at).toBeGreaterThanOrEqual(0);
            expect(plate.y).withContext(at).toBeGreaterThanOrEqual(0);
            expect(plate.x + plate.w).withContext(at).toBeLessThanOrEqual(w);
            expect(plate.y + plate.h).withContext(at).toBeLessThanOrEqual(h);
            expect(overlaps(plate, mark, 4)).withContext(`${at} vs mark`).toBeFalse();
            expect(overlaps(plate, skip)).withContext(`${at} vs skip`).toBeFalse();
            plates.forEach((other, j) => {
              if (other && j !== i) expect(overlaps(plate, other, 2)).withContext(`${at} vs plate ${j}`).toBeFalse();
            });
            bodies.forEach((body, j) => {
              if (j !== i) expect(overlaps(plate, body)).withContext(`${at} vs planet ${j}`).toBeFalse();
            });
          });
        }
      });
    });
  }
});
