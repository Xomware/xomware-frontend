import { APPS } from '../data/apps.data';
import { Painter } from './iso';
import { layoutLine } from './layout';
import { PACKS, drawPackage } from './packages';

describe('factory packaging', () => {
  it('never ships two neighbouring stations in the same packaging', () => {
    const { stations } = layoutLine(APPS);
    stations.slice(1).forEach((s, i) => expect(s.pack).not.toBe(stations[i].pack));
  });

  it('draws every kind, and a blank box, onto the canvas', () => {
    const canvas = document.createElement('canvas');
    canvas.width = canvas.height = 120;
    const ctx = canvas.getContext('2d')!;
    const painter = new Painter(ctx, { w: 120, h: 120, cam: 0 });
    const inked = () => ctx.getImageData(0, 0, 120, 120).data.some((v, i) => i % 4 === 3 && v > 0);
    for (const kind of [...PACKS, undefined]) {
      ctx.clearRect(0, 0, 120, 120);
      // The anchor sits at (36, 62), so a package at the world origin lands mid-canvas.
      drawPackage(painter, 0, 0, 0, 36, kind ? { kind, color: '#9c0abf' } : null);
      expect(inked()).withContext(kind ?? 'blank').toBeTrue();
    }
  });
});
