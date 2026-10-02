type Rgb = [number, number, number];

/** The part of an image that isn't transparent, as fractions of its size. */
export interface Bounds {
  x: number;
  y: number;
  w: number;
  h: number;
}

const smooth = (a: number, b: number, v: number): number => {
  const u = Math.min(1, Math.max(0, (v - a) / (b - a)));
  return u * u * (3 - 2 * u);
};

function hash2(x: number, y: number, seed: number): number {
  const s = Math.sin(x * 127.1 + y * 311.7 + seed * 74.7) * 43758.5453;
  return s - Math.floor(s);
}

function noise(x: number, y: number, seed: number): number {
  const ix = Math.floor(x);
  const iy = Math.floor(y);
  const fx = x - ix;
  const fy = y - iy;
  const ux = fx * fx * (3 - 2 * fx);
  const uy = fy * fy * (3 - 2 * fy);
  const a = hash2(ix, iy, seed);
  const b = hash2(ix + 1, iy, seed);
  const c = hash2(ix, iy + 1, seed);
  const d = hash2(ix + 1, iy + 1, seed);
  return a + (b - a) * ux + (c - a) * uy + (a - b - c + d) * ux * uy;
}

function fbm(x: number, y: number, seed: number): number {
  let sum = 0;
  let amp = 0.5;
  for (let o = 0; o < 4; o++) {
    sum += amp * noise(x, y, seed + o * 13);
    x *= 2.03;
    y *= 2.03;
    amp *= 0.5;
  }
  return sum;
}

function parseRgb(rgb: string): Rgb {
  const [r, g, b] = rgb.split(',').map((v) => Number(v));
  return [r, g, b];
}

const lerp = (a: Rgb, b: Rgb, u: number): Rgb => [a[0] + (b[0] - a[0]) * u, a[1] + (b[1] - a[1]) * u, a[2] + (b[2] - a[2]) * u];

/**
 * A lit planet in the app's colour, baked once per size. Lit by hand per
 * pixel: a surface (gas bands, rock or cloud-streaked ocean, by `seed`), a
 * soft terminator facing `light`, and an atmosphere that brightens toward
 * the limb on the lit side. `light` is a screen direction toward the sun.
 *
 * The sprite is 1.5x the planet's diameter; the rest is atmosphere glow.
 */
export function paintPlanet(radius: number, rgb: string, seed: number, light: [number, number]): HTMLCanvasElement {
  const r = Math.max(4, Math.round(radius));
  const size = Math.ceil(r * 3);
  const c = size / 2;
  const canvas = document.createElement('canvas');
  canvas.width = canvas.height = size;
  const g = canvas.getContext('2d');
  if (!g) return canvas;

  const app = parseRgb(rgb);
  // Neon brand colours look like plastic on a sphere; pull them toward slate.
  const base = lerp(app, [46, 52, 72], 0.38);
  const deep = lerp(base, [8, 10, 20], 0.62);
  const pale = lerp(base, [236, 240, 250], 0.42);
  const air = lerp(app, [200, 230, 255], 0.45);

  const ll = Math.hypot(light[0], light[1]) || 1;
  const L: [number, number, number] = [(light[0] / ll) * 0.88, (light[1] / ll) * 0.88, 0.48];
  const kind = seed % 3;
  const tilt = (hash2(seed, 1, 3) - 0.5) * 0.7;
  const ct = Math.cos(tilt);
  const st = Math.sin(tilt);

  const img = g.createImageData(size, size);
  const px = img.data;
  for (let y = 0; y < size; y++) {
    for (let x = 0; x < size; x++) {
      const nx = (x + 0.5 - c) / r;
      const ny = (y + 0.5 - c) / r;
      const d2 = nx * nx + ny * ny;
      const i = (y * size + x) * 4;
      const dist = Math.sqrt(d2);

      if (d2 >= 1) {
        // Atmosphere glow beyond the limb, on the side facing the light.
        const facing = Math.max(0, (nx * L[0] + ny * L[1]) / dist + 0.35);
        const a = Math.exp(-(dist - 1) * 9) * 0.55 * facing + Math.exp(-(dist - 1) * 26) * 0.12;
        px[i] = air[0];
        px[i + 1] = air[1];
        px[i + 2] = air[2];
        px[i + 3] = Math.min(255, a * 255);
        continue;
      }

      const nz = Math.sqrt(1 - d2);
      // Surface coordinates on the tilted sphere.
      const tx = nx * ct - ny * st;
      const ty = nx * st + ny * ct;
      const lat = Math.asin(Math.max(-1, Math.min(1, ty)));
      const lon = Math.atan2(tx, nz);

      let albedo: Rgb;
      if (kind === 0) {
        const warp = fbm(lon * 1.6, lat * 5, seed) * 1.6;
        const band = 0.5 + 0.5 * Math.sin(lat * 9 + warp * 2.4);
        const fine = fbm(lon * 4, lat * 22, seed + 7);
        albedo = lerp(lerp(deep, base, band), pale, Math.max(0, band - 0.55) * 1.4 + (fine - 0.5) * 0.35);
      } else if (kind === 1) {
        const h = fbm(lon * 2.4 + 3, lat * 2.4, seed);
        const crater = fbm(lon * 7, lat * 7, seed + 21);
        albedo = lerp(lerp(deep, base, smooth(0.25, 0.7, h)), pale, smooth(0.62, 0.78, crater) * 0.45);
      } else {
        const sea = fbm(lon * 2, lat * 2.2, seed);
        const cloud = fbm(lon * 3 + lat * 2, lat * 7, seed + 5);
        albedo = lerp(lerp(deep, base, smooth(0.4, 0.62, sea)), [228, 236, 246], smooth(0.55, 0.75, cloud) * 0.7);
      }

      const ndl = nx * L[0] + ny * L[1] + nz * L[2];
      const lit = smooth(-0.18, 0.55, ndl);
      const fres = (1 - nz) ** 2.4;
      const rim = fres * (0.12 + 0.88 * smooth(-0.3, 0.4, ndl));
      const amb = 0.05;
      const lum = amb + lit * 1.05;
      const edge = smooth(1, 1 - 1.4 / r, dist);
      px[i] = Math.min(255, albedo[0] * lum + air[0] * rim * 0.85);
      px[i + 1] = Math.min(255, albedo[1] * lum + air[1] * rim * 0.85);
      px[i + 2] = Math.min(255, albedo[2] * lum + air[2] * rim * 0.85);
      // The last pixel and a half blends into the glow outside, which antialiases the limb.
      px[i + 3] = 255 * edge + 140 * (1 - edge);
    }
  }
  g.putImageData(img, 0, 0);
  return canvas;
}

/** Measures the opaque part of an image, so a banner with transparent padding can be drawn tight. */
export function opaqueBounds(img: HTMLImageElement): Bounds {
  const w = 160;
  const h = Math.max(1, Math.round((w * img.naturalHeight) / Math.max(1, img.naturalWidth)));
  const full = { x: 0, y: 0, w: 1, h: 1 };
  const c = document.createElement('canvas');
  c.width = w;
  c.height = h;
  const g = c.getContext('2d', { willReadFrequently: true });
  if (!g) return full;
  g.drawImage(img, 0, 0, w, h);
  const data = g.getImageData(0, 0, w, h).data;
  let minX = w;
  let minY = h;
  let maxX = -1;
  let maxY = -1;
  for (let y = 0; y < h; y++) {
    for (let x = 0; x < w; x++) {
      if (data[(y * w + x) * 4 + 3] < 24) continue;
      minX = Math.min(minX, x);
      maxX = Math.max(maxX, x);
      minY = Math.min(minY, y);
      maxY = Math.max(maxY, y);
    }
  }
  if (maxX < 0) return full;
  return { x: minX / w, y: minY / h, w: (maxX - minX + 1) / w, h: (maxY - minY + 1) / h };
}

/**
 * The name plate under a planet: a dark glass tag with the app's banner
 * fitted inside. Without the banner (still loading) it's an empty tag, so the
 * layout never jumps when it arrives.
 */
export function paintPlate(
  w: number,
  h: number,
  dpr: number,
  rgb: string,
  banner: HTMLImageElement | null,
  bounds: Bounds,
): HTMLCanvasElement {
  const canvas = document.createElement('canvas');
  canvas.width = Math.ceil(w * dpr);
  canvas.height = Math.ceil(h * dpr);
  const g = canvas.getContext('2d');
  if (!g) return canvas;
  g.scale(dpr, dpr);

  const radius = Math.min(8, h * 0.22);
  g.beginPath();
  g.roundRect(0.5, 0.5, w - 1, h - 1, radius);
  const fill = g.createLinearGradient(0, 0, 0, h);
  fill.addColorStop(0, 'rgba(22, 26, 46, 0.86)');
  fill.addColorStop(1, 'rgba(8, 10, 22, 0.9)');
  g.fillStyle = fill;
  g.fill();
  g.strokeStyle = `rgba(${rgb}, 0.5)`;
  g.lineWidth = 1;
  g.stroke();
  g.strokeStyle = 'rgba(236, 242, 255, 0.1)';
  g.beginPath();
  g.moveTo(radius, 1.5);
  g.lineTo(w - radius, 1.5);
  g.stroke();

  if (!banner || !banner.naturalWidth) return canvas;
  const pad = Math.max(4, h * 0.13);
  const sw = banner.naturalWidth * bounds.w;
  const sh = banner.naturalHeight * bounds.h;
  const k = Math.min((w - pad * 2) / sw, (h - pad * 2) / sh);
  const dw = sw * k;
  const dh = sh * k;
  g.drawImage(
    banner,
    banner.naturalWidth * bounds.x,
    banner.naturalHeight * bounds.y,
    sw,
    sh,
    (w - dw) / 2,
    (h - dh) / 2,
    dw,
    dh,
  );
  return canvas;
}
