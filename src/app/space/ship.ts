/** Where the craft is and how it's flying. `bank` is roll, -1..1, positive dipping the +y wing. */
export interface ShipPose {
  x: number;
  y: number;
  heading: number;
  bank: number;
}

/** Length of the drawn craft in its own units, nose to nozzle. */
export const SHIP_LENGTH = 70;

const NOZZLE_X = -33;
const NOZZLE_Y = 9;
/** Light comes from the upper left of the screen, as it does for the planets and rocks. */
const LIGHT = Math.atan2(-0.8, -0.6);

const mix = (a: number, b: number, u: number): number => Math.round(a + (b - a) * u);

/** Hull metal, from shadow (0) to fully lit (1). */
function metal(u: number, alpha = 1): string {
  const k = Math.min(1, Math.max(0, u));
  return `rgba(${mix(38, 214, k)}, ${mix(44, 222, k)}, ${mix(60, 236, k)}, ${alpha})`;
}

function path(ctx: CanvasRenderingContext2D, pts: readonly (readonly [number, number])[]): void {
  ctx.beginPath();
  ctx.moveTo(pts[0][0], pts[0][1]);
  for (let i = 1; i < pts.length; i++) ctx.lineTo(pts[i][0], pts[i][1]);
  ctx.closePath();
}

function plume(ctx: CanvasRenderingContext2D, y: number, length: number, width: number): void {
  const g = ctx.createLinearGradient(NOZZLE_X, 0, NOZZLE_X - length, 0);
  g.addColorStop(0, 'rgba(255, 255, 255, 0.95)');
  g.addColorStop(0.18, 'rgba(178, 240, 255, 0.85)');
  g.addColorStop(0.55, 'rgba(60, 150, 255, 0.35)');
  g.addColorStop(1, 'rgba(40, 90, 255, 0)');
  ctx.fillStyle = g;
  ctx.beginPath();
  ctx.moveTo(NOZZLE_X + 1, y - width);
  ctx.quadraticCurveTo(NOZZLE_X - length * 0.35, y - width * 1.15, NOZZLE_X - length, y);
  ctx.quadraticCurveTo(NOZZLE_X - length * 0.35, y + width * 1.15, NOZZLE_X + 1, y + width);
  ctx.closePath();
  ctx.fill();
}

/**
 * A twin-engine courier in plan view, nose along +x at the origin. The caller
 * translates, rotates to `heading` and scales; this handles the roll (the
 * span foreshortens and the low wing drops into shadow) and lights the hull
 * from the scene's light rather than the ship's own frame.
 */
export function drawShip(ctx: CanvasRenderingContext2D, pose: ShipPose, time: number, thrust = 1): void {
  const bank = Math.max(-1, Math.min(1, pose.bank));
  // Which side of the hull faces the light, in the ship's own frame.
  const lit = Math.sin(LIGHT - pose.heading);
  // -1 for the -y side, 1 for the +y side.
  const sideLight = (side: number): number => 0.55 - 0.28 * lit * side - 0.32 * bank * side;

  ctx.save();
  ctx.scale(1, 1 - 0.38 * Math.abs(bank));

  // Engine light first, so the hull covers its root.
  ctx.globalCompositeOperation = 'lighter';
  const flicker = Math.sin(time * 47) * 0.12 + Math.sin(time * 29 + 1) * 0.08;
  for (const y of [-NOZZLE_Y, NOZZLE_Y]) {
    const halo = ctx.createRadialGradient(NOZZLE_X - 2, y, 0, NOZZLE_X - 2, y, 13);
    halo.addColorStop(0, `rgba(150, 225, 255, ${0.55 * thrust})`);
    halo.addColorStop(1, 'rgba(60, 140, 255, 0)');
    ctx.fillStyle = halo;
    ctx.fillRect(NOZZLE_X - 15, y - 13, 26, 26);
    plume(ctx, y, (15 + 9 * thrust) * (1 + flicker), 2.6);
  }
  ctx.globalCompositeOperation = 'source-over';

  for (const side of [-1, 1]) {
    const s = side;
    const tone = sideLight(s);

    // Wing: a cranked delta from the hull out to a clipped tip.
    const wing = ctx.createLinearGradient(0, 5 * s, -10, 26 * s);
    wing.addColorStop(0, metal(tone + 0.08));
    wing.addColorStop(1, metal(tone - 0.18));
    ctx.fillStyle = wing;
    path(ctx, [
      [12, 5 * s],
      [-2, 12 * s],
      [-15, 25 * s],
      [-21, 26 * s],
      [-22, 22 * s],
      [-19, 12 * s],
      [-25, 6 * s],
    ]);
    ctx.fill();
    // Leading edge catches the light; trailing edge is a darker flap line.
    ctx.lineWidth = 0.7;
    ctx.strokeStyle = metal(tone + 0.35, 0.9);
    ctx.beginPath();
    ctx.moveTo(12, 5 * s);
    ctx.lineTo(-2, 12 * s);
    ctx.lineTo(-15, 25 * s);
    ctx.stroke();
    ctx.strokeStyle = 'rgba(16, 20, 32, 0.55)';
    ctx.beginPath();
    ctx.moveTo(-20, 16 * s);
    ctx.lineTo(-14, 11 * s);
    ctx.moveTo(1, 9 * s);
    ctx.lineTo(-13, 21 * s);
    ctx.stroke();
    // Brand stripe across the wing root.
    ctx.fillStyle = 'rgba(0, 180, 216, 0.9)';
    path(ctx, [
      [3, 8 * s],
      [-1, 10.5 * s],
      [-6, 10.5 * s],
      [-2, 8 * s],
    ]);
    ctx.fill();

    // Nacelle along the wing root, with its nozzle bell.
    const nac = ctx.createLinearGradient(0, (NOZZLE_Y - 3.6) * s, 0, (NOZZLE_Y + 3.6) * s);
    nac.addColorStop(0, metal(tone + 0.2));
    nac.addColorStop(0.45, metal(tone + 0.05));
    nac.addColorStop(1, metal(tone - 0.35));
    ctx.fillStyle = nac;
    ctx.beginPath();
    ctx.moveTo(-4, (NOZZLE_Y - 2.6) * s);
    ctx.quadraticCurveTo(0, NOZZLE_Y * s, -4, (NOZZLE_Y + 2.6) * s);
    ctx.lineTo(-29, (NOZZLE_Y + 3.4) * s);
    ctx.lineTo(-29, (NOZZLE_Y - 3.4) * s);
    ctx.closePath();
    ctx.fill();
    ctx.fillStyle = 'rgba(30, 32, 42, 1)';
    path(ctx, [
      [-29, (NOZZLE_Y - 3.6) * s],
      [NOZZLE_X, (NOZZLE_Y - 4.2) * s],
      [NOZZLE_X, (NOZZLE_Y + 4.2) * s],
      [-29, (NOZZLE_Y + 3.6) * s],
    ]);
    ctx.fill();
    ctx.fillStyle = `rgba(190, 240, 255, ${0.65 + 0.3 * thrust})`;
    ctx.fillRect(NOZZLE_X - 0.6, NOZZLE_Y * s - 2.6, 1.2, 5.2);

    // Canard.
    ctx.fillStyle = metal(tone - 0.05);
    path(ctx, [
      [25, 4 * s],
      [18, 9.5 * s],
      [15.5, 9.5 * s],
      [16, 4.6 * s],
    ]);
    ctx.fill();
  }

  // Fuselage: a long tapered body, shaded like a cylinder seen from above.
  const shadeSide = lit + bank * 0.9;
  const hull = ctx.createLinearGradient(0, -6.5, 0, 6.5);
  hull.addColorStop(0, metal(0.5 + 0.38 * shadeSide));
  hull.addColorStop(0.42, metal(0.92));
  hull.addColorStop(0.62, metal(0.75));
  hull.addColorStop(1, metal(0.45 - 0.38 * shadeSide));
  ctx.fillStyle = hull;
  ctx.beginPath();
  ctx.moveTo(37, 0);
  ctx.bezierCurveTo(32, -3.4, 22, -5.6, 10, -6.2);
  ctx.lineTo(-10, -6.4);
  ctx.lineTo(-27, -4.8);
  ctx.lineTo(-30, -2.6);
  ctx.lineTo(-30, 2.6);
  ctx.lineTo(-27, 4.8);
  ctx.lineTo(-10, 6.4);
  ctx.lineTo(10, 6.2);
  ctx.bezierCurveTo(22, 5.6, 32, 3.4, 37, 0);
  ctx.closePath();
  ctx.fill();

  // Panel seams and a dark nose cap.
  ctx.strokeStyle = 'rgba(18, 22, 34, 0.5)';
  ctx.lineWidth = 0.55;
  ctx.beginPath();
  for (const x of [5, -6, -17]) {
    ctx.moveTo(x, -6.2);
    ctx.quadraticCurveTo(x - 1.6, 0, x, 6.2);
  }
  ctx.moveTo(4, 0);
  ctx.lineTo(-26, 0);
  ctx.stroke();
  ctx.fillStyle = 'rgba(40, 44, 58, 0.9)';
  ctx.beginPath();
  ctx.moveTo(37, 0);
  ctx.bezierCurveTo(35, -1.4, 33, -2.3, 31, -2.5);
  ctx.lineTo(31, 2.5);
  ctx.bezierCurveTo(33, 2.3, 35, 1.4, 37, 0);
  ctx.fill();

  // Canopy glass with a specular streak on the lit side.
  const glass = ctx.createLinearGradient(26, -3, 10, 3);
  glass.addColorStop(0, 'rgba(120, 214, 240, 1)');
  glass.addColorStop(0.4, 'rgba(18, 60, 96, 1)');
  glass.addColorStop(1, 'rgba(6, 14, 30, 1)');
  ctx.fillStyle = glass;
  ctx.beginPath();
  ctx.ellipse(17, 0, 8.5, 3.3, 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.strokeStyle = 'rgba(24, 28, 40, 0.9)';
  ctx.lineWidth = 0.7;
  ctx.stroke();
  ctx.strokeStyle = 'rgba(240, 252, 255, 0.85)';
  ctx.lineWidth = 0.8;
  ctx.beginPath();
  const glintY = lit > 0 ? -1 : 1;
  ctx.ellipse(18, 0, 6, 2.2, 0, glintY < 0 ? Math.PI * 1.15 : Math.PI * 0.15, glintY < 0 ? Math.PI * 1.6 : Math.PI * 0.6);
  ctx.stroke();

  // Dorsal fin, edge-on from above.
  ctx.fillStyle = metal(0.85);
  path(ctx, [
    [-12, -0.7],
    [-30, -1.1],
    [-30, 1.1],
    [-12, 0.7],
  ]);
  ctx.fill();

  // Nav lights: red to port, green to starboard, a white strobe on the tail.
  const blink = Math.sin(time * 5.2) > 0.55 ? 1 : 0.25;
  ctx.globalCompositeOperation = 'lighter';
  for (const [x, y, rgb, a] of [
    [-20, -25.5, '255, 70, 70', 0.9],
    [-20, 25.5, '80, 255, 140', 0.9],
    [-30, 0, '255, 255, 255', blink],
  ] as const) {
    const g = ctx.createRadialGradient(x, y, 0, x, y, 4);
    g.addColorStop(0, `rgba(${rgb}, ${a})`);
    g.addColorStop(1, `rgba(${rgb}, 0)`);
    ctx.fillStyle = g;
    ctx.fillRect(x - 4, y - 4, 8, 8);
  }
  ctx.restore();
}

/** Repeatable 0..1 noise for a whole number, so a particle looks the same every time it is drawn. */
function hash(n: number): number {
  const s = Math.sin(n * 127.1 + 311.7) * 43758.5453;
  return s - Math.floor(s);
}

/**
 * Exhaust as a pure function of time: each particle left a nozzle at a fixed
 * emission time, so it's drawn by asking where the ship was then rather than
 * by keeping a particle list. `poseAt` returns null where there was no ship.
 */
export function drawExhaust(
  ctx: CanvasRenderingContext2D,
  sprite: HTMLCanvasElement,
  poseAt: (time: number) => ShipPose | null,
  time: number,
  scale: number,
  smoke = 0,
): void {
  const rate = 160;
  const life = 0.3;
  const newest = Math.floor(time * rate);
  ctx.globalCompositeOperation = 'lighter';

  // A continuous hot wake, so the particles read as a plume rather than a dotted line.
  const steps = 14;
  ctx.lineCap = 'round';
  let prev: [number, number] | null = null;
  for (let i = 0; i <= steps; i++) {
    const p = poseAt(time - i * 0.016);
    if (!p) break;
    const back = (NOZZLE_X - 3) * scale;
    const pt: [number, number] = [p.x + Math.cos(p.heading) * back, p.y + Math.sin(p.heading) * back];
    if (prev) {
      const k = 1 - i / steps;
      ctx.strokeStyle = `rgba(120, 200, 255, ${0.5 * k})`;
      ctx.lineWidth = (1 + 6 * k) * scale;
      ctx.beginPath();
      ctx.moveTo(prev[0], prev[1]);
      ctx.lineTo(pt[0], pt[1]);
      ctx.stroke();
    }
    prev = pt;
  }
  for (let n = newest; n > newest - life * rate; n--) {
    const born = n / rate;
    const age = time - born;
    const p = poseAt(born);
    if (!p || age < 0) continue;
    const r1 = hash(n);
    const r2 = hash(n + 0.5);
    const side = n % 2 ? 1 : -1;
    const squash = 1 - 0.38 * Math.abs(p.bank);
    const cos = Math.cos(p.heading);
    const sin = Math.sin(p.heading);
    const lx = NOZZLE_X - 4;
    const ly = NOZZLE_Y * side * squash;
    // Thrown back along the heading it had when it left, spreading as it slows.
    const travel = (1 - Math.exp(-4 * age)) / 4;
    const back = 120 * travel;
    const spread = (r1 - 0.5) * 40 * travel;
    const x = p.x + (lx * cos - ly * sin) * scale - cos * back * scale - sin * spread * scale;
    const y = p.y + (lx * sin + ly * cos) * scale - sin * back * scale + cos * spread * scale;
    const k = age / life;
    const size = (3 + k * 14 + r2 * 3) * scale;
    ctx.globalAlpha = (1 - k) ** 1.6 * 0.55;
    ctx.drawImage(sprite, x - size / 2, y - size / 2, size, size);
    if (smoke > 0 && k > 0.2) {
      ctx.globalCompositeOperation = 'source-over';
      ctx.globalAlpha = (1 - k) * 0.35 * smoke;
      ctx.fillStyle = 'rgb(92, 96, 112)';
      ctx.beginPath();
      ctx.arc(x, y, size * 0.45, 0, Math.PI * 2);
      ctx.fill();
      ctx.globalCompositeOperation = 'lighter';
    }
  }
  ctx.globalAlpha = 1;
  ctx.globalCompositeOperation = 'source-over';
}
