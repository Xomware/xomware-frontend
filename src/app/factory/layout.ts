import { AppCard } from '../data/apps.data';
import { COS30 } from './iso';
import { PACKS, PackKind } from './packages';

/** Half-width of the pit at the end of the line. */
export const PIT_R = 230;
const START = 1150;
const SPACING = 760;
const ZONE_GAP = 440;

export interface Zone {
  platform: AppCard['platform'];
  label: string;
  sub: string;
}

export const ZONES: Zone[] = [
  { platform: 'web', label: 'Line A', sub: 'Web apps' },
  { platform: 'pool', label: 'Line B', sub: 'Leagues & pools' },
  { platform: 'ios', label: 'Line C', sub: 'iOS' },
];

export interface Station {
  app: AppCard;
  index: number;
  /** Centre of the station, where its card hangs. */
  x: number;
  /** The press that stamps this app's logo onto passing crates. */
  press: number;
  /** The gantry crane just before the station; the first station of a line has its banner there instead. */
  crane: number | null;
  /** What this station's crates ship in. */
  pack: PackKind;
}

export interface SideBelt {
  /** 'in' feeds blank crates onto the line from the back; 'out' pulls crates off to a bin at the front. */
  kind: 'in' | 'out';
  x: number;
}

export interface LineLayout {
  stations: Station[];
  lines: { zone: Zone; x: number }[];
  sides: SideBelt[];
  pit: number;
  beltEnd: number;
}

export function layoutLine(apps: AppCard[]): LineLayout {
  const stations: Station[] = [];
  const lines: LineLayout['lines'] = [];
  let x = START;
  for (const zone of ZONES) {
    const group = apps.filter((a) => a.platform === zone.platform && !a.adminOnly);
    if (!group.length) continue;
    if (stations.length) x += ZONE_GAP;
    lines.push({ zone, x: x - 400 });
    group.forEach((app, i) => {
      stations.push({ app, index: stations.length, x, press: x + 240, crane: i === 0 ? null : x - 400, pack: PACKS[stations.length % PACKS.length] });
      x += SPACING;
    });
  }
  const sides: SideBelt[] = [];
  stations.forEach((s, i) => {
    if (i % 3 === 1) sides.push({ kind: 'in', x: s.x - 170 });
    if (i % 4 === 2) sides.push({ kind: 'out', x: s.x + 430 });
  });
  const pit = x + 260;
  return { stations, lines, sides, pit, beltEnd: pit - PIT_R };
}

/**
 * Furthest the camera travels. On wide screens the pit lands at the camera anchor, leaving the right side for
 * its app list; on phones it stops a little short so the pit sits mid-screen.
 */
export function cameraMax(layout: LineLayout, width: number): number {
  return width < 800 ? layout.pit - (width * 0.2) / COS30 : layout.pit;
}

/** The station whose press a crate at x passed most recently, which decides the logo it carries. */
export function lastStation(layout: LineLayout, x: number): Station | null {
  let found: Station | null = null;
  for (const s of layout.stations) if (s.press < x) found = s;
  return found;
}

export const inPit = (layout: LineLayout, x: number, y: number, pad = 0): boolean =>
  Math.abs(x - layout.pit) < PIT_R + pad && Math.abs(y) < PIT_R + pad;
