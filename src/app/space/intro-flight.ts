import { ShipPose } from './ship';

/** A point a craft passes through at time t. */
export interface Key {
  t: number;
  x: number;
  y: number;
}

/**
 * Where a craft on `keys` is at time t, or null outside its flight. A cubic
 * Hermite through the keys with Catmull-Rom tangents taken over time, so the
 * speed carries smoothly through each key even when they're unevenly spaced.
 */
export function trackAt(keys: readonly Key[], t: number): [number, number] | null {
  const last = keys.length - 1;
  if (last < 1 || t < keys[0].t || t > keys[last].t) return null;
  let i = 0;
  while (i < last - 1 && t > keys[i + 1].t) i++;
  const k0 = keys[i];
  const k1 = keys[i + 1];
  const before = keys[Math.max(0, i - 1)];
  const after = keys[Math.min(last, i + 2)];
  const h = k1.t - k0.t;
  const m0x = (k1.x - before.x) / (k1.t - before.t);
  const m0y = (k1.y - before.y) / (k1.t - before.t);
  const m1x = (after.x - k0.x) / (after.t - k0.t);
  const m1y = (after.y - k0.y) / (after.t - k0.t);
  const u = (t - k0.t) / h;
  const u2 = u * u;
  const u3 = u2 * u;
  const a = 2 * u3 - 3 * u2 + 1;
  const b = u3 - 2 * u2 + u;
  const c = -2 * u3 + 3 * u2;
  const d = u3 - u2;
  return [a * k0.x + b * h * m0x + c * k1.x + d * h * m1x, a * k0.y + b * h * m0y + c * k1.y + d * h * m1y];
}

/** Position, heading and bank on a track; the bank leans into the turn. */
export function poseOn(keys: readonly Key[], t: number): ShipPose | null {
  const p = trackAt(keys, t);
  if (!p) return null;
  const t0 = keys[0].t;
  const t1 = keys[keys.length - 1].t;
  const at = (u: number): [number, number] => trackAt(keys, Math.min(t1, Math.max(t0, u))) ?? p;
  const heading = (u: number): number => {
    const a = at(u - 0.01);
    const b = at(u + 0.01);
    return Math.atan2(b[1] - a[1], b[0] - a[0]);
  };
  let turn = heading(t + 0.03) - heading(t - 0.03);
  if (turn > Math.PI) turn -= Math.PI * 2;
  if (turn < -Math.PI) turn += Math.PI * 2;
  return { x: p[0], y: p[1], heading: heading(t), bank: Math.max(-0.85, Math.min(0.85, turn * 3.3)) };
}
