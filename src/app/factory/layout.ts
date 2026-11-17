import { AppCard } from '../data/apps.data';
import { COS30 } from './iso';
import { PACKS, PackKind } from './packages';

/**
 * The shipping carousel the line ends at: semi-axes a (across the screen) and b (into it), the belt's width and
 * height, and how big the packages riding it are. All in world units.
 */
export const CAROUSEL = { a: 367, b: 255, belt: 80, height: 26, island: 40, size: 54 };
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

/** A PA tower. Most stand on the floor; two stand back to back on the carousel's island. */
export interface Speaker {
  x: number;
  y: number;
  /** Height of whatever it stands on. */
  z: number;
  h: number;
  island: boolean;
}

export interface LineLayout {
  stations: Station[];
  lines: { zone: Zone; x: number }[];
  sides: SideBelt[];
  /** Centre of the carousel. It sits back off the line's axis so it lands mid-screen when the camera parks. */
  end: { x: number; y: number };
  /** Where the belt runs into the sorter in front of the carousel. */
  beltEnd: number;
  speakers: Speaker[];
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
  const end = { x: x + 480, y: -184 };
  const floor = (sx: number, sy: number): Speaker => ({ x: sx, y: sy, z: 0, h: 124, island: false });
  const island = (dx: number): Speaker => ({ x: end.x + dx, y: end.y - dx, z: CAROUSEL.island, h: 78, island: true });
  // One by the opening headline, one along the front, one at each line's banner and a pair on the carousel.
  const speakers = [floor(330, -380), floor(900, 330), ...lines.map((l) => floor(l.x + 120, -360)), island(-30), island(30)];
  return { stations, lines, sides, end, beltEnd: end.x - 520, speakers };
}

/** Furthest the camera travels: far enough to park the carousel in the middle of the screen. */
export function cameraMax(layout: LineLayout, width: number): number {
  return layout.end.x - layout.end.y - (width * 0.2) / COS30;
}

/**
 * A point on an ellipse round the carousel's centre. Its axes run along the world's diagonals, which project to
 * screen horizontal and vertical, so the loop reads as a wide oval rather than a tilted one.
 */
export function ringPoint(layout: LineLayout, a: number, b: number, th: number): [number, number] {
  const across = Math.cos(th) * a;
  const into = Math.sin(th) * b;
  return [layout.end.x + (across + into) * Math.SQRT1_2, layout.end.y + (into - across) * Math.SQRT1_2];
}

/** The station whose press a crate at x passed most recently, which decides the logo it carries. */
export function lastStation(layout: LineLayout, x: number): Station | null {
  let found: Station | null = null;
  for (const s of layout.stations) if (s.press < x) found = s;
  return found;
}
