import {
  AdditiveBlending,
  BackSide,
  BoxGeometry,
  BufferAttribute,
  BufferGeometry,
  CanvasTexture,
  Color,
  DirectionalLight,
  DynamicDrawUsage,
  Group,
  HemisphereLight,
  IcosahedronGeometry,
  InstancedBufferAttribute,
  InstancedBufferGeometry,
  InstancedMesh,
  LineSegments,
  Material,
  MathUtils,
  Matrix4,
  Mesh,
  MeshBasicMaterial,
  NormalBlending,
  MeshStandardMaterial,
  Object3D,
  OrthographicCamera,
  PerspectiveCamera,
  PMREMGenerator,
  PlaneGeometry,
  Points,
  PointLight,
  Quaternion,
  SRGBColorSpace,
  Scene,
  ShaderMaterial,
  SphereGeometry,
  Sprite,
  SpriteMaterial,
  Texture,
  Vector3,
  WebGLRenderTarget,
  WebGLRenderer,
} from 'three';

import { Planet } from '../data/planets';
import { INTRO_END, INTRO_IMPACT } from './intro-timing';
import { Post } from './post';
import { ShipModel, buildShipModel } from './ship-model';
import { mulberry32 } from './starfield';


// Timeline, seconds.
const STARS_IN = [0.5, 1.3] as const;
const LINE_A = [1.2, 1.95] as const;
const LINE_B = [1.75, 2.5] as const;
const CHART_IN = [2.2, 2.9] as const;
const SHIP_IN = 2.0;
const DAMAGE = 4.35;
const HOLE = [INTRO_IMPACT + 0.12, INTRO_END - 0.1] as const;
// Banner labels' height on screen, in CSS pixels.
const LABEL_PX = 30;
// How far the hole opens, in screen heights: past every corner.
const HOLE_R = 1.25;

const clamp01 = (v: number): number => Math.min(1, Math.max(0, v));
const range = (t: number, a: number, b: number): number => clamp01((t - a) / (b - a));
const smooth = (u: number): number => u * u * (3 - 2 * u);
const easeInOut = (u: number): number => (u < 0.5 ? 4 * u ** 3 : 1 - (-2 * u + 2) ** 3 / 2);
const v3 = (x: number, y: number, z: number): Vector3 => new Vector3(x, y, z);
const fract = (x: number): number => x - Math.floor(x);

type Key = [number, Vector3] | [number, Vector3, Vector3];

/** Cubic Hermite through timed keys. A key's velocity defaults to Catmull-Rom, or 0 at the ends. */
function track(keys: readonly Key[], t: number, out: Vector3): Vector3 {
  if (t <= keys[0][0]) return out.copy(keys[0][1]);
  const last = keys.length - 1;
  if (t >= keys[last][0]) return out.copy(keys[last][1]);
  let i = 0;
  while (t > keys[i + 1][0]) i++;
  const [t0, p0] = keys[i];
  const [t1, p1] = keys[i + 1];
  const tangent = (j: number): Vector3 => {
    const set = keys[j][2];
    if (set) return set;
    if (j === 0 || j === last) return new Vector3();
    const [ta, a] = keys[j - 1];
    const [tb, b] = keys[j + 1];
    return b.clone().sub(a).multiplyScalar(1 / (tb - ta));
  };
  const dt = t1 - t0;
  const u = (t - t0) / dt;
  return out
    .copy(p0)
    .multiplyScalar(2 * u ** 3 - 3 * u ** 2 + 1)
    .addScaledVector(tangent(i), (u ** 3 - 2 * u ** 2 + u) * dt)
    .addScaledVector(p1, -2 * u ** 3 + 3 * u ** 2)
    .addScaledVector(tangent(i + 1), (u ** 3 - u ** 2) * dt);
}

// The ship: in past the lens from the right, a lap of the system, then a
// failing spiral into the centre.
const FLIGHT: readonly Key[] = [
  [SHIP_IN, v3(21, 17.5, 40)],
  [2.55, v3(5.5, 14, 33)],
  [3.0, v3(-9, 8, 22)],
  [3.4, v3(-22, 2, 3)],
  [3.8, v3(-9, 1.5, -20)],
  [4.15, v3(15, 1.4, -15)],
  [4.45, v3(21, 1.2, 7)],
  [4.8, v3(7, 0.8, 12)],
  [5.08, v3(-2.5, 0.4, 4)],
  [INTRO_IMPACT, v3(0, 0, 0), v3(12, -2, -22)],
];

const NOISE = /* glsl */ `
  float hash13(vec3 p) {
    p = fract(p * 0.1031);
    p += dot(p, p.zyx + 31.32);
    return fract((p.x + p.y) * p.z);
  }
  float noise3(vec3 p) {
    vec3 i = floor(p);
    vec3 f = fract(p);
    vec3 u = f * f * (3.0 - 2.0 * f);
    return mix(
      mix(mix(hash13(i), hash13(i + vec3(1, 0, 0)), u.x), mix(hash13(i + vec3(0, 1, 0)), hash13(i + vec3(1, 1, 0)), u.x), u.y),
      mix(mix(hash13(i + vec3(0, 0, 1)), hash13(i + vec3(1, 0, 1)), u.x), mix(hash13(i + vec3(0, 1, 1)), hash13(i + vec3(1, 1, 1)), u.x), u.y),
      u.z);
  }
  float fbm(vec3 p) {
    float s = 0.0;
    float a = 0.5;
    for (int i = 0; i < 5; i++) {
      s += a * noise3(p);
      p = p * 2.03 + 17.1;
      a *= 0.5;
    }
    return s;
  }
`;

// Low and from the left, a little behind the system: half-lit worlds with hard terminators.
const SUN = v3(-0.9, 0.3, -0.12).normalize();

interface PlanetLook {
  kind: number;
  a: Color;
  b: Color;
  c: Color;
  atmo: Color;
}

/** Real planets are muted: each app's colour, pulled most of the way to dust. */
function planetLook(rgb: string, i: number): PlanetLook {
  const [r, g, b] = rgb.split(',').map((n) => Number(n) / 255);
  const base = new Color().setRGB(r, g, b, SRGBColorSpace);
  const hsl = { h: 0, s: 0, l: 0 };
  base.getHSL(hsl);
  const tone = (s: number, l: number): Color => new Color().setHSL(hsl.h, hsl.s * s, l);
  const kind = [0, 1, 2, 0, 1][i % 5];
  return {
    kind,
    a: tone(0.3, kind === 2 ? 0.14 : 0.22),
    b: tone(0.22, kind === 2 ? 0.36 : 0.46),
    c: new Color().setHSL((hsl.h + 0.06) % 1, hsl.s * 0.2, 0.62),
    atmo: tone(0.5, 0.55),
  };
}

function textSprite(text: string, px: number, alpha: number, spacing = 0): Sprite {
  const c = document.createElement('canvas');
  const g = c.getContext('2d');
  const font = `500 ${px}px "Space Grotesk", "Inter", sans-serif`;
  if (g) {
    g.font = font;
    g.letterSpacing = `${spacing}px`;
    c.width = Math.ceil(g.measureText(text).width + px);
    c.height = Math.ceil(px * 1.5);
    g.font = font;
    g.letterSpacing = `${spacing}px`;
    g.fillStyle = `rgba(214, 226, 240, ${alpha})`;
    g.textBaseline = 'middle';
    g.fillText(text, px / 2 + spacing / 2, c.height / 2);
  }
  const tex = new CanvasTexture(c);
  tex.colorSpace = SRGBColorSpace;
  const s = new Sprite(new SpriteMaterial({ map: tex, transparent: true, depthWrite: false, opacity: 0 }));
  s.userData['aspect'] = c.width / c.height;
  return s;
}

interface Label {
  plate: Sprite;
  /** Width over height of the banner art. */
  aspect: number;
}

interface Body {
  mesh: Mesh<SphereGeometry, ShaderMaterial>;
  label: Label | null;
  halo: Mesh<SphereGeometry, ShaderMaterial>;
  moon: Mesh<SphereGeometry, ShaderMaterial>;
  radius: number;
  orbit: number;
  phase: number;
  speed: number;
  incline: number;
}

const PLANET_VERT = /* glsl */ `
  varying vec3 vN;
  varying vec3 vObj;
  varying vec3 vWorld;
  void main() {
    vObj = normalize(position);
    vN = normalize(mat3(modelMatrix) * normal);
    vec4 w = modelMatrix * vec4(position, 1.0);
    vWorld = w.xyz;
    gl_Position = projectionMatrix * viewMatrix * w;
  }
`;

const LIGHTING = /* glsl */ `
  uniform vec3 sunDir;
  uniform vec3 flashPos;
  uniform float flash;
  vec3 light(vec3 albedo, vec3 n, vec3 world) {
    float ndl = dot(n, sunDir);
    // A soft terminator: sunlight wraps a few degrees past the limb.
    float sun = clamp((ndl + 0.05) / 1.05, 0.0, 1.0);
    vec3 c = albedo * (sun * vec3(2.4, 2.3, 2.15) + 0.003);
    vec3 toF = flashPos - world;
    float df = length(toF);
    c += albedo * max(dot(n, toF / df), 0.0) * flash / (1.0 + df * df * 0.05) * vec3(3.0, 2.2, 1.4);
    return c;
  }
`;

/**
 * The landing intro as a three.js scene. Planets orbit under an
 * astronomical-chart X, a ship laps the system and spirals into the middle,
 * and the blast tears a hole onto the page. `draw(t)` is a pure function of
 * time, so a dropped frame or a capture harness lands on the right picture.
 */
export class IntroScene {
  private readonly scene = new Scene();
  private readonly camera = new PerspectiveCamera(36, 1, 0.1, 2000);
  private readonly post: Post;
  private readonly materials: Material[] = [];
  private readonly textures: Texture[] = [];
  private readonly bodies: Body[] = [];
  private readonly planetUniforms = {
    sunDir: { value: SUN },
    flashPos: { value: new Vector3() },
    flash: { value: 0 },
  };
  private readonly starMat: ShaderMaterial;
  private readonly chart: { group: Group; stars: ShaderMaterial; lines: ShaderMaterial; labels: Sprite[]; grid: ShaderMaterial };
  private readonly model: ShipModel;
  private readonly env: Texture;
  private readonly ship: Group;
  private readonly flame: Group;
  private readonly flameMat: ShaderMaterial;
  private readonly nozzles: MeshBasicMaterial;
  private readonly beacons: MeshBasicMaterial[];
  private readonly trail: { mesh: Mesh<BufferGeometry, ShaderMaterial>; pos: Float32Array; age: Float32Array };
  private readonly smoke: { mesh: Mesh<BufferGeometry, ShaderMaterial>; pos: Float32Array; age: Float32Array };
  private readonly blast: {
    fire: Mesh<InstancedBufferGeometry, ShaderMaterial>;
    smoke: Mesh<InstancedBufferGeometry, ShaderMaterial>;
    shards: InstancedMesh;
    embers: InstancedMesh;
    light: PointLight;
    shardV: Vector3[];
    shardSpin: Vector3[];
    emberV: Vector3[];
  };
  private readonly shutter = new Matrix4();
  private readonly tmp = { a: new Vector3(), b: new Vector3(), c: new Vector3(), q: new Quaternion(), o: new Object3D() };
  private aspect = 1;
  /** A phone's narrow frame draws the whole system tighter. */
  private spread = 1;
  private viewHeight = 1;
  private readonly leaders: LineSegments;

  constructor(
    private readonly renderer: WebGLRenderer,
    planets: Planet[],
    banners: (HTMLImageElement | null)[],
  ) {
    this.post = new Post(renderer);
    const sun = new DirectionalLight(0xfff1de, 2.6);
    sun.position.copy(SUN).multiplyScalar(50);
    this.scene.add(sun, new HemisphereLight(0x22324a, 0x050407, 0.25));

    this.buildNebula();
    this.starMat = this.buildStars();
    this.chart = this.buildChart();
    planets.forEach((p, i) => this.buildPlanet(p, i, banners[i]));
    // Metal needs something to reflect: the sky and planets, captured once.
    const pmrem = new PMREMGenerator(renderer);
    this.env = pmrem.fromScene(this.scene, 0.02).texture;
    pmrem.dispose();
    this.scene.environment = this.env;
    this.scene.environmentIntensity = 0.9;

    this.leaders = this.buildLeaders(planets.length);
    this.model = buildShipModel();
    this.ship = this.model.ship;
    this.flame = this.model.flame;
    this.flameMat = this.model.flameMat;
    this.nozzles = this.model.nozzles;
    this.beacons = this.model.beacons;
    this.scene.add(this.ship, this.flame);
    this.trail = this.buildRibbon(true);
    this.smoke = this.buildRibbon(false);
    this.blast = this.buildBlast();
  }

  resize(width: number, height: number): void {
    if (!width || !height) return;
    const dpr = Math.min(window.devicePixelRatio || 1, Math.min(width, height) < 700 ? 1.25 : 1.5);
    this.renderer.setPixelRatio(dpr);
    this.renderer.setSize(width, height, false);
    this.post.setSize(Math.round(width * dpr), Math.round(height * dpr));
    this.aspect = width / height;
    this.spread = this.aspect < 0.85 ? 0.62 : 1;
    this.viewHeight = height;
    this.camera.aspect = this.aspect;
    const px = (height * dpr) / 1000;
    this.starMat.uniforms['scale'].value = px;
    this.chart.stars.uniforms['scale'].value = px;
    // The figure hangs behind the system, square to the lens and centred on where it looks.
    this.frame(0);
    this.camera.updateMatrixWorld();
    const look = this.tmp.a.set(0, this.aspect < 0.85 ? 1.5 : 0.5, 0);
    const dir = look.clone().sub(this.camera.position).normalize();
    this.chart.group.position.copy(look).addScaledVector(dir, 70);
    this.chart.group.quaternion.copy(this.camera.quaternion);
  }

  draw(t: number): void {
    const fadeIn = smooth(range(t, 0, 0.9));
    const hit = t - INTRO_IMPACT;

    // Where the camera was when a 1/90 s shutter opened, for motion blur.
    this.frame(t - 1 / 90);
    this.camera.updateMatrixWorld();
    this.shutter.multiplyMatrices(this.camera.projectionMatrix, this.camera.matrixWorldInverse);
    const focus = this.frame(t);
    this.camera.updateMatrixWorld();

    this.drawPlanets(t);
    this.drawLabels(t);
    this.drawChart(t);
    this.drawShip(t);
    this.drawBlast(t);

    const centre = this.tmp.a.set(0, 0, 0).project(this.camera);
    const hole = HOLE_R * easeInOut(range(t, HOLE[0], HOLE[1]));
    const wave = range(t, INTRO_IMPACT, INTRO_IMPACT + 1.1);
    this.post.render(this.scene, this.camera, {
      ...focus,
      shutter: this.shutter,
      bloom: 0.55 + (hit > 0 ? 0.6 * Math.exp(-hit * 4) : 0),
      exposure: fadeIn,
      time: t,
      shock: {
        x: centre.x * 0.5 + 0.5,
        y: centre.y * 0.5 + 0.5,
        radius: hit > 0 ? Math.max(hole + 0.03, 0.9 * (1 - Math.exp(-hit * 3.2))) : 0,
        width: 0.035 + 0.04 * wave,
        strength: hit > 0 ? 0.012 * (1 - wave) : 0,
      },
      hole,
      haze: this.haze(t),
    });
  }

  /** Where the exhaust shimmer sits on screen: just behind the ship, sized to it. */
  private haze(t: number): { x: number; y: number; radius: number; strength: number } {
    if (t < SHIP_IN || t >= INTRO_IMPACT) return { x: 0, y: 0, radius: 0, strength: 0 };
    const p = this.shipAt(t, this.tmp.a);
    const back = this.shipAt(t - 0.02, this.tmp.b).sub(p).normalize();
    const at = p.clone().addScaledVector(back, 1.4 * this.spread);
    const dist = this.camera.position.distanceTo(at);
    at.project(this.camera);
    const radius = (1.3 * this.spread) / (2 * dist * Math.tan(MathUtils.degToRad(this.camera.fov) / 2));
    const burn = 1 - range(t, DAMAGE, INTRO_IMPACT) * 0.5;
    return { x: at.x * 0.5 + 0.5, y: at.y * 0.5 + 0.5, radius, strength: Math.min(0.0025, radius * 0.02) * burn };
  }

  dispose(): void {
    this.post.dispose();
    this.model.dispose();
    this.env.dispose();
    this.materials.forEach((m) => m.dispose());
    this.textures.forEach((x) => x.dispose());
    this.scene.traverse((o) => {
      if (o instanceof Mesh || o instanceof Points || o instanceof LineSegments) o.geometry.dispose();
    });
    this.renderer.dispose();
  }

  // ── Per frame ─────────────────────────────────────────────────────────────

  private shipAt(t: number, out: Vector3): Vector3 {
    return track(FLIGHT, t, out).multiplyScalar(this.spread);
  }

  /**
   * The camera: a slow push in with a little drift, closer on a phone's narrow
   * frame relative to its width. Returns the focus for this moment.
   */
  private frame(t: number): { focus: number; aperture: number } {
    const portrait = this.aspect < 0.85;
    // Keep the outer orbits inside the frame's width.
    const vfov = portrait ? 62 : 36;
    const hfov = 2 * Math.atan(Math.tan(MathUtils.degToRad(vfov) / 2) * this.aspect);
    const dist = Math.max(52 * this.spread, 27 * this.spread / Math.tan(hfov / 2));
    const push = 1 - 0.1 * easeInOut(range(t, 0, INTRO_IMPACT));
    const az = MathUtils.degToRad(8 - 7 * smooth(range(t, 0, INTRO_IMPACT)));
    // A phone looks down on the system more, so its orbits fill the tall frame.
    const el = MathUtils.degToRad(portrait ? 62 : 22);
    const d = dist * push;
    const pos = this.tmp.b.set(Math.sin(az) * Math.cos(el) * d, Math.sin(el) * d, Math.cos(az) * Math.cos(el) * d);

    // A damped shake as the blast reaches the lens.
    const hit = t - INTRO_IMPACT - 0.05;
    if (hit > 0) {
      const k = Math.exp(-hit * 4.5) * 0.35;
      pos.x += Math.sin(hit * 71) * k + Math.sin(hit * 37) * k * 0.6;
      pos.y += Math.sin(hit * 53 + 1) * k;
    }
    this.camera.position.copy(pos);
    this.camera.fov = vfov;
    this.camera.updateProjectionMatrix();
    this.camera.lookAt(0, portrait ? 1.5 : 0.5, 0);
    this.camera.updateMatrixWorld();

    // Pull focus to the ship as it passes the lens, then back to the system.
    const ship = this.shipAt(Math.min(t, INTRO_IMPACT), this.tmp.c);
    const toShip = pos.distanceTo(ship);
    const onShip = smooth(range(t, SHIP_IN + 0.1, 2.35)) * (1 - smooth(range(t, 2.75, 3.2)));
    return { focus: MathUtils.lerp(d, toShip, onShip), aperture: 2.5 + 5 * onShip };
  }

  private drawPlanets(t: number): void {
    const flash = Math.max(0, t - INTRO_IMPACT);
    this.planetUniforms.flash.value = t > INTRO_IMPACT ? 14 * Math.exp(-flash * 5) : 0;
    for (const b of this.bodies) {
      const a = b.phase + t * b.speed;
      const r = b.orbit * this.spread;
      const p = this.tmp.a.set(Math.cos(a) * r, 0, Math.sin(a) * r);
      p.applyAxisAngle(this.tmp.b.set(1, 0, 0), b.incline);
      b.mesh.position.copy(p);
      b.halo.position.copy(p);
      b.mesh.rotation.y = t * 0.12 + b.phase;
      const m = b.phase * 3.1 + t * 0.9;
      b.moon.position.set(Math.cos(m) * b.radius * 2.3, Math.sin(m) * b.radius * 0.5, Math.sin(m) * b.radius * 2.3).add(p);
    }
  }

  /**
   * Labels sit up and to the right of each planet at a fixed size on screen,
   * joined to it by a hairline, and fade in once the chart is drawn.
   */
  private drawLabels(t: number): void {
    const fade = smooth(range(t, CHART_IN[0] + 0.3, CHART_IN[1] + 0.3)) * (1 - smooth(range(t, INTRO_IMPACT - 0.15, INTRO_IMPACT + 0.05)));
    const cam = this.camera;
    const right = this.tmp.b.setFromMatrixColumn(cam.matrixWorld, 0);
    const up = this.tmp.c.setFromMatrixColumn(cam.matrixWorld, 1);
    const unitsPerPx = (d: number): number => (2 * d * Math.tan(MathUtils.degToRad(cam.fov) / 2)) / this.viewHeight;
    const pos = this.leaders.geometry.attributes['position'] as BufferAttribute;
    this.bodies.forEach((b, i) => {
      const plate = b.label?.plate;
      if (!b.label || !plate) {
        pos.setXYZ(i * 2, 0, 0, 0);
        pos.setXYZ(i * 2 + 1, 0, 0, 0);
        return;
      }
      const k = unitsPerPx(cam.position.distanceTo(b.mesh.position));
      const h = LABEL_PX * (this.aspect < 0.85 ? 0.75 : 1) * k;
      const from = b.mesh.position.clone().addScaledVector(right, b.radius * 0.75).addScaledVector(up, b.radius * 0.75);
      const to = from.clone().addScaledVector(right, 14 * k).addScaledVector(up, 14 * k);
      pos.setXYZ(i * 2, from.x, from.y, from.z);
      pos.setXYZ(i * 2 + 1, to.x, to.y, to.z);
      plate.position.copy(to).addScaledVector(right, 4 * k);
      plate.scale.set(h * b.label.aspect, h, 1);
      plate.material.opacity = fade;
    });
    pos.needsUpdate = true;
    this.leaders.geometry.computeBoundingSphere();
    (this.leaders.material as ShaderMaterial).uniforms['fade'].value = fade;
  }

  private drawChart(t: number): void {
    this.chart.stars.uniforms['time'].value = t;
    this.chart.stars.uniforms['fade'].value = smooth(range(t, STARS_IN[0], STARS_IN[1]));
    this.chart.lines.uniforms['time'].value = t;
    const chartIn = smooth(range(t, CHART_IN[0], CHART_IN[1]));
    this.chart.grid.uniforms['fade'].value = smooth(range(t, 0.8, 1.8)) * 0.6;
    this.chart.labels.forEach((s) => (s.material.opacity = chartIn));
    this.starMat.uniforms['time'].value = t;
  }

  private drawShip(t: number): void {
    const flying = t >= SHIP_IN && t < INTRO_IMPACT;
    this.ship.visible = flying;
    this.flame.visible = flying;
    if (flying) {
      const p = this.shipAt(t, this.tmp.a);
      const ahead = this.shipAt(t + 0.01, this.tmp.b).sub(p).normalize();
      // Bank into the turn: lift leans towards the centre of curvature.
      const before = this.shipAt(t - 0.03, new Vector3());
      const after = this.shipAt(t + 0.03, new Vector3());
      const accel = before.add(after).addScaledVector(p, -2).multiplyScalar(1 / 0.0009);
      const lateral = accel.addScaledVector(ahead, -accel.dot(ahead));
      const up = this.tmp.c.set(0, 1, 0).multiplyScalar(260).add(lateral).normalize();
      const damage = range(t, DAMAGE, INTRO_IMPACT);
      // Losing it: a yaw and roll wobble that grows into a tumble.
      up.applyAxisAngle(ahead, Math.sin(t * 23) * 0.5 * damage + damage * damage * t * 6);
      const m = new Matrix4().lookAt(new Vector3(), ahead, up);
      this.ship.quaternion.setFromRotationMatrix(m);
      this.ship.position.copy(p);

      // The engine coughs as it fails.
      const cough = damage > 0 ? 0.35 + 0.65 * Math.max(0, Math.sin(t * 61) * Math.sin(t * 17 + 1)) : 1;
      const burn = (0.9 + 0.1 * Math.sin(t * 90)) * cough * (1 - damage * 0.6);
      this.nozzles.color.setRGB(1, 0.62, 0.32).multiplyScalar(14 * burn);
      this.flameMat.uniforms['strength'].value = burn;
      this.flameMat.uniforms['time'].value = t;
      this.flame.position.copy(p).addScaledVector(ahead, -0.88);
      this.flame.quaternion.copy(this.ship.quaternion);
      // Running lights: red port, green starboard, a white strobe.
      this.beacons[0].color.setRGB(1, 0.08, 0.05).multiplyScalar(6);
      this.beacons[1].color.setRGB(0.1, 1, 0.3).multiplyScalar(6);
      this.beacons[2].color.setScalar(fract(t * 1.1) < 0.06 ? 30 : 0.05);
    }
    this.updateRibbon(this.trail, t, 0.55, (age) => (t < DAMAGE ? 1 : 1 - range(t, DAMAGE, DAMAGE + 0.6)) * (1 - age));
    this.updateRibbon(this.smoke, t, 0.9, (age) => range(t, DAMAGE - 0.1, DAMAGE + 0.5) * (1 - age));
    this.trail.mesh.visible = t > SHIP_IN && t < INTRO_IMPACT + 0.4;
    this.smoke.mesh.visible = t > DAMAGE - 0.1 && t < INTRO_IMPACT + 1.2;
    this.trail.mesh.material.uniforms['time'].value = t;
    this.smoke.mesh.material.uniforms['time'].value = t;
  }

  /** Fills a ribbon with the path the ship has flown over the last `span` seconds. */
  private updateRibbon(
    r: { mesh: Mesh<BufferGeometry, ShaderMaterial>; pos: Float32Array; age: Float32Array },
    t: number,
    span: number,
    strength: (age: number) => number,
  ): void {
    const n = r.pos.length / 6;
    const now = Math.min(t, INTRO_IMPACT);
    const view = this.tmp.a.copy(this.camera.position);
    for (let i = 0; i < n; i++) {
      const age = i / (n - 1);
      const tt = Math.max(SHIP_IN, now - age * span);
      const p = this.shipAt(tt, this.tmp.b);
      const next = this.shipAt(tt + 0.01, this.tmp.c).sub(p);
      const side = next.cross(view.clone().sub(p)).normalize();
      // Exhaust spreads as it ages, and drifts.
      const w = 0.12 + age * (r === this.smoke ? 1.4 : 0.5);
      r.pos.set([p.x - side.x * w, p.y - side.y * w, p.z - side.z * w, p.x + side.x * w, p.y + side.y * w, p.z + side.z * w], i * 6);
      const a = Math.max(0, strength(age)) * (tt <= SHIP_IN ? 0 : 1);
      r.age[i * 2] = a;
      r.age[i * 2 + 1] = a;
    }
    const g = r.mesh.geometry;
    g.attributes['position'].needsUpdate = true;
    g.attributes['aStrength'].needsUpdate = true;
    g.computeBoundingSphere();
  }

  private drawBlast(t: number): void {
    const b = this.blast;
    const hit = t - INTRO_IMPACT;
    const on = hit >= 0;
    b.fire.visible = on && hit < 1.2;
    b.smoke.visible = on;
    b.shards.visible = on;
    b.embers.visible = on;
    b.light.intensity = on ? 400 * Math.exp(-hit * 5) : 0;
    this.planetUniforms.flashPos.value.set(0, 0, 0);
    if (!on) return;

    b.fire.material.uniforms['age'].value = hit;
    b.smoke.material.uniforms['age'].value = hit;

    const o = this.tmp.o;
    const travel = (1 - Math.exp(-hit * 1.6)) / 1.6;
    b.shardV.forEach((vel, i) => {
      o.position.copy(vel).multiplyScalar(travel);
      const s = b.shardSpin[i];
      o.rotation.set(s.x * hit, s.y * hit, s.z * hit);
      o.scale.setScalar(1);
      o.updateMatrix();
      b.shards.setMatrixAt(i, o.matrix);
    });
    b.shards.instanceMatrix.needsUpdate = true;

    // Embers streak along their flight, as long as a 1/90 s shutter sees them move.
    const ember = new Color();
    const fwd = this.tmp.b.set(0, 0, 1);
    b.emberV.forEach((vel, i) => {
      o.position.copy(vel).multiplyScalar(travel * 1.3);
      const speed = vel.length() * Math.exp(-hit * 1.6);
      o.quaternion.copy(this.tmp.q.setFromUnitVectors(fwd, this.tmp.c.copy(vel).normalize()));
      o.scale.set(1, 1, 1 + (speed / 90) * 40);
      o.updateMatrix();
      b.embers.setMatrixAt(i, o.matrix);
      // Cooling: white, through orange, to a dull red, then out.
      const heat = Math.exp(-hit * (2.4 + (i % 7) * 0.3));
      ember.setRGB(1, 0.32 + 0.6 * heat, 0.06 + 0.5 * heat * heat).multiplyScalar(8 * heat);
      b.embers.setColorAt(i, ember);
    });
    b.embers.instanceMatrix.needsUpdate = true;
    if (b.embers.instanceColor) b.embers.instanceColor.needsUpdate = true;
  }

  // ── Builders ──────────────────────────────────────────────────────────────

  private keep<T extends Material>(m: T): T {
    this.materials.push(m);
    return m;
  }

  /** Two layers of dust and faint emission, baked once into textures. */
  private buildNebula(): void {
    const bake = (seed: number, tint: Color, dark: number): Texture => {
      const rt = new WebGLRenderTarget(1024, 512);
      const mat = new ShaderMaterial({
        uniforms: { seed: { value: seed }, tint: { value: tint }, dark: { value: dark } },
        vertexShader: /* glsl */ `
          varying vec2 vUv;
          void main() { vUv = position.xy * 0.5 + 0.5; gl_Position = vec4(position.xy, 0.0, 1.0); }
        `,
        fragmentShader: /* glsl */ `
          uniform float seed;
          uniform vec3 tint;
          uniform float dark;
          varying vec2 vUv;
          ${NOISE}
          void main() {
            vec3 p = vec3(vUv * vec2(4.0, 2.0), seed);
            // Domain-warped fbm: filaments rather than blobs.
            vec3 q = vec3(fbm(p), fbm(p + 5.2), 0.0);
            float n = fbm(p + q * 1.8);
            float lane = smoothstep(0.45, 0.75, fbm(p * 1.7 + q + 9.0));
            float edge = smoothstep(0.0, 0.25, vUv.x) * smoothstep(1.0, 0.75, vUv.x) * smoothstep(0.0, 0.3, vUv.y) * smoothstep(1.0, 0.7, vUv.y);
            float glow = pow(max(smoothstep(0.35, 0.85, n), 1e-5), 2.0) * edge;
            gl_FragColor = vec4(tint * glow * (1.0 - lane * dark), 1.0);
          }
        `,
      });
      const quad = new Mesh(new PlaneGeometry(2, 2), mat);
      this.renderer.setRenderTarget(rt);
      this.renderer.render(quad, new OrthographicCamera(-1, 1, 1, -1, 0, 1));
      this.renderer.setRenderTarget(null);
      mat.dispose();
      quad.geometry.dispose();
      this.textures.push(rt.texture);
      return rt.texture;
    };
    const layers: [number, Color, number, Vector3, number][] = [
      [3.1, new Color(0.05, 0.075, 0.1), 0.9, v3(-60, 70, -520), 1300],
      [8.7, new Color(0.075, 0.045, 0.085), 0.7, v3(140, -40, -380), 900],
    ];
    for (const [seed, tint, dark, at, size] of layers) {
      const plane = new Mesh(
        new PlaneGeometry(size, size / 2),
        this.keep(new MeshBasicMaterial({ map: bake(seed, tint, dark), blending: AdditiveBlending, depthWrite: false, transparent: true })),
      );
      plane.position.copy(at);
      plane.lookAt(0, 0, 60);
      this.scene.add(plane);
    }
  }

  /** Background stars at real depths, so a moving lens gives them parallax. */
  private buildStars(): ShaderMaterial {
    const rand = mulberry32(0x5752);
    const n = 2600;
    const pos = new Float32Array(n * 3);
    const mag = new Float32Array(n);
    const col = new Float32Array(n * 3);
    const temps = [
      [0.72, 0.8, 1],
      [0.88, 0.92, 1],
      [1, 1, 1],
      [1, 0.94, 0.82],
      [1, 0.82, 0.62],
    ];
    for (let i = 0; i < n; i++) {
      const d = i < 300 ? 90 + rand() * 120 : 300 + rand() * 600;
      const u = rand() * 2 - 1;
      const a = rand() * Math.PI * 2;
      const s = Math.sqrt(1 - u * u);
      pos.set([Math.cos(a) * s * d, u * d * 0.7, -Math.abs(Math.sin(a) * s * d) - 40], i * 3);
      // Most stars are faint; a handful are bright.
      mag[i] = rand() ** 5;
      col.set(temps[Math.floor(rand() ** 1.5 * temps.length)], i * 3);
    }
    const g = new BufferGeometry();
    g.setAttribute('position', new BufferAttribute(pos, 3));
    g.setAttribute('aMag', new BufferAttribute(mag, 1));
    g.setAttribute('aColor', new BufferAttribute(col, 3));
    const mat = this.keep(
      new ShaderMaterial({
        transparent: true,
        depthWrite: false,
        blending: AdditiveBlending,
        uniforms: { scale: { value: 1 }, time: { value: 0 } },
        vertexShader: /* glsl */ `
          attribute float aMag;
          attribute vec3 aColor;
          uniform float scale;
          varying float vMag;
          varying vec3 vColor;
          void main() {
            vMag = aMag;
            vColor = aColor;
            gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
            gl_PointSize = (2.0 + aMag * 9.0) * scale;
          }
        `,
        fragmentShader: /* glsl */ `
          varying float vMag;
          varying vec3 vColor;
          void main() {
            vec2 p = gl_PointCoord - 0.5;
            float r = length(p);
            float core = exp(-r * r * 90.0);
            float halo = exp(-r * r * 18.0) * 0.15;
            // Only the brightest show the telescope's diffraction cross.
            float spike = (exp(-abs(p.x) * 70.0) + exp(-abs(p.y) * 70.0)) * smoothstep(0.5, 0.0, r) * smoothstep(0.55, 0.9, vMag) * 0.35;
            float i = (0.15 + vMag * 3.5) * (core + halo + spike);
            gl_FragColor = vec4(vColor * i, 1.0);
          }
        `,
      }),
    );
    this.scene.add(new Points(g, mat));
    return mat;
  }

  /**
   * The X as a star chart: a dozen stars along its strokes, joined by thin
   * lines drawn in order, with designations, a name, and a faint grid.
   */
  private buildChart(): IntroScene['chart'] {
    const rand = mulberry32(0x58);
    const plane = new Group();
    this.scene.add(plane);
    const S = 15;

    const steps = [-1, -0.62, -0.28, 0, 0.3, 0.64, 1];
    const jitter = (): number => (rand() - 0.5) * 0.07;
    const strokeA = steps.map((u) => v3((u * 0.72 + jitter()) * S, (-u + jitter()) * S, 0));
    const strokeB = steps.map((u, i) => (i === 3 ? strokeA[3].clone() : v3((-u * 0.72 + jitter()) * S, (-u + jitter()) * S, 0)));

    // Stars: the X's own, brightest at the tips and the crossing, then a few field stars.
    const stars: { p: Vector3; mag: number; at: number }[] = [];
    const add = (p: Vector3, mag: number, at: number): void => {
      stars.push({ p, mag, at });
    };
    strokeA.forEach((p, i) => add(p, i === 0 || i === 6 || i === 3 ? 1 : 0.45 + rand() * 0.35, LINE_A[0] + (i / 6) * (LINE_A[1] - LINE_A[0])));
    strokeB.forEach((p, i) => i !== 3 && add(p, i === 0 || i === 6 ? 0.9 : 0.4 + rand() * 0.35, LINE_B[0] + (i / 6) * (LINE_B[1] - LINE_B[0])));
    for (let i = 0; i < 9; i++) add(v3((rand() - 0.5) * S * 2.6, (rand() - 0.5) * S * 2.4, 0), 0.12 + rand() * 0.2, 99);

    const sp = new Float32Array(stars.length * 3);
    const sm = new Float32Array(stars.length);
    const sa = new Float32Array(stars.length);
    stars.forEach((s, i) => {
      sp.set([s.p.x, s.p.y, s.p.z], i * 3);
      sm[i] = s.mag;
      sa[i] = s.at;
    });
    const sg = new BufferGeometry();
    sg.setAttribute('position', new BufferAttribute(sp, 3));
    sg.setAttribute('aMag', new BufferAttribute(sm, 1));
    sg.setAttribute('aAt', new BufferAttribute(sa, 1));
    const starMat = this.keep(
      new ShaderMaterial({
        transparent: true,
        depthWrite: false,
        blending: AdditiveBlending,
        uniforms: { time: { value: 0 }, fade: { value: 0 }, scale: { value: 1 } },
        vertexShader: /* glsl */ `
          attribute float aMag;
          attribute float aAt;
          uniform float time;
          uniform float fade;
          uniform float scale;
          varying float vI;
          varying float vSpike;
          void main() {
            // A star brightens a touch as its line reaches it.
            float lit = smoothstep(aAt - 0.05, aAt + 0.15, time);
            vI = fade * (0.35 + aMag * 1.6) * (1.0 + 0.6 * lit);
            vSpike = aMag;
            gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
            gl_PointSize = (14.0 + aMag * 30.0) * scale;
          }
        `,
        fragmentShader: /* glsl */ `
          varying float vI;
          varying float vSpike;
          void main() {
            vec2 p = gl_PointCoord - 0.5;
            float r = length(p);
            float core = exp(-r * r * 260.0);
            float halo = exp(-r * r * 30.0) * 0.12;
            float spike = (exp(-abs(p.x) * 120.0) * exp(-abs(p.y) * 6.0) + exp(-abs(p.y) * 120.0) * exp(-abs(p.x) * 6.0)) * smoothstep(0.4, 1.0, vSpike) * 0.5;
            gl_FragColor = vec4(vec3(0.86, 0.92, 1.0) * vI * (core * 3.0 + halo + spike), 1.0);
          }
        `,
      }),
    );
    const starPoints = new Points(sg, starMat);
    plane.add(starPoints);

    // Lines: each segment carries the times its ends are reached; the shader
    // reveals the part already drawn.
    const lp: number[] = [];
    const lt: number[] = [];
    const segs = (stroke: Vector3[], span: readonly [number, number]): void => {
      for (let i = 0; i < stroke.length - 1; i++) {
        // Stop short of each star, like a printed chart.
        const a = stroke[i];
        const b = stroke[i + 1];
        const dir = b.clone().sub(a).normalize();
        const a2 = a.clone().addScaledVector(dir, 0.55);
        const b2 = b.clone().addScaledVector(dir, -0.55);
        lp.push(a2.x, a2.y, 0, b2.x, b2.y, 0);
        lt.push(span[0] + (i / 6) * (span[1] - span[0]), span[0] + ((i + 1) / 6) * (span[1] - span[0]));
      }
    };
    segs(strokeA, LINE_A);
    segs(strokeB, LINE_B);
    const lg = new BufferGeometry();
    lg.setAttribute('position', new BufferAttribute(new Float32Array(lp), 3));
    lg.setAttribute('aAt', new BufferAttribute(new Float32Array(lt), 1));
    const lineMat = this.keep(
      new ShaderMaterial({
        transparent: true,
        depthWrite: false,
        blending: AdditiveBlending,
        uniforms: { time: { value: 0 } },
        vertexShader: /* glsl */ `
          attribute float aAt;
          varying float vAt;
          void main() {
            vAt = aAt;
            gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
          }
        `,
        fragmentShader: /* glsl */ `
          uniform float time;
          varying float vAt;
          void main() {
            if (vAt > time) discard;
            gl_FragColor = vec4(vec3(0.62, 0.74, 0.9) * 0.75, 1.0);
          }
        `,
      }),
    );
    plane.add(new LineSegments(lg, lineMat));

    // A faint coordinate grid: two arcs of right ascension and one of declination, dashed.
    const gp: number[] = [];
    const arc = (f: (u: number) => Vector3): void => {
      for (let i = 0; i < 64; i += 2) {
        const a = f(i / 64);
        const b = f((i + 1) / 64);
        gp.push(a.x, a.y, a.z, b.x, b.y, b.z);
      }
    };
    arc((u) => v3(-S * 1.9 + Math.sin(u * Math.PI) * 3, (u - 0.5) * S * 3.2, 0));
    arc((u) => v3(S * 1.75 + Math.sin(u * Math.PI) * 3.4, (u - 0.5) * S * 3.2, 0));
    arc((u) => v3((u - 0.5) * S * 4.6, -S * 1.42 - Math.sin(u * Math.PI) * 2.6, 0));
    const gg = new BufferGeometry();
    gg.setAttribute('position', new BufferAttribute(new Float32Array(gp), 3));
    const gridMat = this.keep(
      new ShaderMaterial({
        transparent: true,
        depthWrite: false,
        blending: AdditiveBlending,
        uniforms: { fade: { value: 0 } },
        vertexShader: /* glsl */ `void main() { gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0); }`,
        fragmentShader: /* glsl */ `
          uniform float fade;
          void main() { gl_FragColor = vec4(vec3(0.5, 0.6, 0.75) * 0.14 * fade, 1.0); }
        `,
      }),
    );
    plane.add(new LineSegments(gg, gridMat));

    // Designations by the brightest stars, and the name under the figure.
    const labels: Sprite[] = [];
    const label = (text: string, at: Vector3, height: number, px: number, alpha: number, spacing = 0): void => {
      const s = textSprite(text, px, alpha, spacing);
      this.textures.push((s.material.map as Texture));
      this.materials.push(s.material);
      s.scale.set(height * (s.userData['aspect'] as number), height, 1);
      s.position.copy(at);
      plane.add(s);
      labels.push(s);
    };
    label('α', strokeA[0].clone().add(v3(-1.4, 1.1, 0)), 1.3, 48, 0.7);
    label('β', strokeB[0].clone().add(v3(1.4, 1.1, 0)), 1.3, 48, 0.7);
    label('γ', strokeA[6].clone().add(v3(1.5, -1.0, 0)), 1.3, 48, 0.7);
    label('δ', strokeB[6].clone().add(v3(-1.5, -1.0, 0)), 1.3, 48, 0.7);
    label('ε', strokeA[3].clone().add(v3(1.5, 0.2, 0)), 1.1, 48, 0.6);
    label('XOMWARE', v3(0, -S - 3.4, 0), 1.6, 64, 0.85, 40);

    return { group: plane, stars: starMat, lines: lineMat, labels, grid: gridMat };
  }

  private buildPlanet(planet: Planet, i: number, banner: HTMLImageElement | null): void {
    const look = planetLook(planet.colorRgb, i);
    const rand = mulberry32(0x91 + i * 13);
    // Inner rings carry the small worlds; the giants sit further out.
    const orbit = 8 + i * 1.75 + rand() * 0.8;
    const radius = look.kind === 0 ? 1.3 + rand() * 0.6 : 0.65 + rand() * 0.35;
    const mat = this.keep(
      new ShaderMaterial({
        uniforms: {
          ...this.planetUniforms,
          colA: { value: look.a },
          colB: { value: look.b },
          colC: { value: look.c },
          atmo: { value: look.atmo },
          kind: { value: look.kind },
          seed: { value: rand() * 50 },
        },
        vertexShader: PLANET_VERT,
        fragmentShader: /* glsl */ `
          uniform vec3 colA;
          uniform vec3 colB;
          uniform vec3 colC;
          uniform vec3 atmo;
          uniform float kind;
          uniform float seed;
          varying vec3 vN;
          varying vec3 vObj;
          varying vec3 vWorld;
          ${NOISE}
          ${LIGHTING}
          void main() {
            vec3 p = vObj;
            vec3 albedo;
            float spec = 0.0;
            if (kind < 0.5) {
              // Gas giant: banded, the bands sheared by turbulence, a storm or two.
              float warp = fbm(p * vec3(2.0, 7.0, 2.0) + seed);
              float bands = sin((p.y + warp * 0.12) * 21.0 + seed) * 0.5 + 0.5;
              bands = mix(bands, fbm(vec3(p.y * 30.0, seed, 0.0)), 0.35);
              albedo = mix(colA, colB, bands);
              albedo = mix(albedo, colC, smoothstep(0.62, 0.8, fbm(p * 5.0 + seed + 3.0)) * 0.6);
            } else if (kind < 1.5) {
              // Rock: highlands and basins, with a rough crust.
              float h = fbm(p * 2.6 + seed);
              float ridge = 1.0 - abs(fbm(p * 7.0 + seed) * 2.0 - 1.0);
              albedo = mix(colA, colB, smoothstep(0.35, 0.65, h)) * (0.8 + 0.3 * ridge);
            } else {
              // Water world: deep ocean, a little land, weather.
              float land = smoothstep(0.52, 0.56, fbm(p * 2.2 + seed));
              albedo = mix(colA, colB * 0.8, land);
              float cloud = smoothstep(0.5, 0.75, fbm(p * vec3(3.0, 6.0, 3.0) + seed + 11.0));
              albedo = mix(albedo, vec3(0.75), cloud * 0.8);
              spec = (1.0 - land) * (1.0 - cloud);
            }
            vec3 n = normalize(vN);
            vec3 v = normalize(cameraPosition - vWorld);
            vec3 c = light(albedo, n, vWorld);
            vec3 h = normalize(sunDir + v);
            c += spec * pow(max(dot(n, h), 1e-5), 60.0) * 1.2 * step(0.0, dot(n, sunDir));
            // Atmosphere: a thin rim, only where the sun reaches it.
            float rim = pow(max(1.0 - max(dot(n, v), 0.0), 1e-5), 3.5);
            c += atmo * rim * smoothstep(-0.25, 0.5, dot(n, sunDir)) * 1.6;
            gl_FragColor = vec4(c, 1.0);
          }
        `,
      }),
    );
    const mesh = new Mesh(new SphereGeometry(radius, 64, 32), mat);
    this.scene.add(mesh);

    const halo = new Mesh(
      new SphereGeometry(radius * 1.12, 48, 24),
      this.keep(
        new ShaderMaterial({
          side: BackSide,
          transparent: true,
          depthWrite: false,
          blending: AdditiveBlending,
          uniforms: { ...this.planetUniforms, atmo: { value: look.atmo } },
          vertexShader: PLANET_VERT,
          fragmentShader: /* glsl */ `
            uniform vec3 sunDir;
            uniform vec3 atmo;
            varying vec3 vN;
            varying vec3 vWorld;
            void main() {
              vec3 n = -normalize(vN);
              vec3 v = normalize(cameraPosition - vWorld);
              // Light scattered through the air just past the limb, sunward side only.
              float limb = pow(clamp(1.0 - abs(dot(n, v)), 1e-5, 1.0), 6.0);
              float lit = smoothstep(-0.3, 0.6, dot(-n, sunDir));
              gl_FragColor = vec4(atmo * limb * lit * 0.9, 1.0);
            }
          `,
        }),
      ),
    );
    this.scene.add(halo);

    const moon = new Mesh(
      new SphereGeometry(Math.max(0.22, radius * 0.27), 32, 16),
      this.keep(
        new ShaderMaterial({
          uniforms: { ...this.planetUniforms, seed: { value: i * 7.3 } },
          vertexShader: PLANET_VERT,
          fragmentShader: /* glsl */ `
            uniform float seed;
            varying vec3 vN;
            varying vec3 vObj;
            varying vec3 vWorld;
            ${NOISE}
            ${LIGHTING}
            void main() {
              // Grey regolith, darker maria.
              float g = 0.14 + 0.1 * fbm(vObj * 4.0 + seed) - 0.05 * smoothstep(0.5, 0.6, fbm(vObj * 1.5 + seed + 4.0));
              gl_FragColor = vec4(light(vec3(g, g * 0.98, g * 0.95), normalize(vN), vWorld), 1.0);
            }
          `,
        }),
      ),
    );
    moon.visible = i % 2 === 0;
    this.scene.add(moon);

    this.bodies.push({
      mesh,
      halo,
      moon,
      label: banner ? this.buildLabel(banner) : null,
      radius,
      orbit,
      // Spread round the system by the golden angle, so no side is crowded.
      phase: i * 2.39996 + rand() * 0.4,
      // Kepler: the outer worlds are slower.
      speed: 1.6 / Math.pow(orbit, 1.1),
      incline: (rand() - 0.5) * 0.06,
    });
  }

  private buildLeaders(n: number): LineSegments {
    const g = new BufferGeometry();
    g.setAttribute('position', new BufferAttribute(new Float32Array(n * 6), 3).setUsage(DynamicDrawUsage));
    const lines = new LineSegments(
      g,
      this.keep(
        new ShaderMaterial({
          transparent: true,
          depthWrite: false,
          blending: AdditiveBlending,
          uniforms: { fade: { value: 0 } },
          vertexShader: /* glsl */ `void main() { gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0); }`,
          fragmentShader: /* glsl */ `
            uniform float fade;
            void main() { gl_FragColor = vec4(vec3(0.55, 0.64, 0.78) * 0.45 * fade, 1.0); }
          `,
        }),
      ),
    );
    lines.frustumCulled = false;
    this.scene.add(lines);
    return lines;
  }

  /** The app's banner, hung beside its planet like a chart callout. */
  private buildLabel(banner: HTMLImageElement): Label {
    const tex = new Texture(banner);
    tex.colorSpace = SRGBColorSpace;
    tex.needsUpdate = true;
    this.textures.push(tex);
    const mat = this.keep(new SpriteMaterial({ map: tex, transparent: true, depthWrite: false, opacity: 0 }));
    const plate = new Sprite(mat);
    // Anchored at its left-centre, so it grows away from the leader line.
    plate.center.set(0, 0.5);
    this.scene.add(plate);
    return { plate, aspect: banner.naturalWidth / Math.max(1, banner.naturalHeight) };
  }

  /** A camera-facing ribbon along the ship's recent path: hot exhaust, or smoke. */
  private buildRibbon(hot: boolean): { mesh: Mesh<BufferGeometry, ShaderMaterial>; pos: Float32Array; age: Float32Array } {
    const n = 48;
    const pos = new Float32Array(n * 6);
    const age = new Float32Array(n * 2);
    const along = new Float32Array(n * 2);
    const side = new Float32Array(n * 2);
    const index: number[] = [];
    for (let i = 0; i < n; i++) {
      along.set([i / (n - 1), i / (n - 1)], i * 2);
      side.set([-1, 1], i * 2);
      if (i < n - 1) {
        const k = i * 2;
        index.push(k, k + 1, k + 2, k + 1, k + 3, k + 2);
      }
    }
    const g = new BufferGeometry();
    g.setAttribute('position', new BufferAttribute(pos, 3).setUsage(DynamicDrawUsage));
    g.setAttribute('aStrength', new BufferAttribute(age, 1).setUsage(DynamicDrawUsage));
    g.setAttribute('aAlong', new BufferAttribute(along, 1));
    g.setAttribute('aSide', new BufferAttribute(side, 1));
    g.setIndex(index);
    const mat = this.keep(
      new ShaderMaterial({
        transparent: true,
        depthWrite: false,
        blending: hot ? AdditiveBlending : NormalBlending,
        uniforms: { time: { value: 0 } },
        vertexShader: /* glsl */ `
          attribute float aStrength;
          attribute float aAlong;
          attribute float aSide;
          varying float vS;
          varying float vAlong;
          varying float vSide;
          varying vec3 vWorld;
          void main() {
            vS = aStrength;
            vAlong = aAlong;
            vSide = aSide;
            vWorld = position;
            gl_Position = projectionMatrix * viewMatrix * vec4(position, 1.0);
          }
        `,
        fragmentShader: hot
          ? /* glsl */ `
          varying float vS;
          varying float vAlong;
          varying float vSide;
          void main() {
            float core = exp(-vSide * vSide * 6.0);
            vec3 c = mix(vec3(1.0, 0.72, 0.42), vec3(0.45, 0.5, 0.62), smoothstep(0.0, 0.5, vAlong));
            gl_FragColor = vec4(c * core * vS * 0.9 * (1.0 - vAlong), 1.0);
          }`
          : /* glsl */ `
          uniform float time;
          varying float vS;
          varying float vAlong;
          varying float vSide;
          varying vec3 vWorld;
          ${NOISE}
          void main() {
            float n = fbm(vWorld * 0.9 + vec3(0.0, time * 0.4, 0.0));
            float body = exp(-vSide * vSide * 2.5) * smoothstep(0.25, 0.65, n + 0.2 * (1.0 - vAlong));
            gl_FragColor = vec4(vec3(0.07, 0.068, 0.07), body * vS * 0.75);
          }`,
      }),
    );
    const mesh = new Mesh(g, mat);
    mesh.frustumCulled = false;
    mesh.visible = false;
    this.scene.add(mesh);
    return { mesh, pos, age };
  }

  /**
   * A cluster of soft billboards thrown out from the centre: incandescent
   * gas (additive, cooling white to red) or the smoke that follows it.
   */
  private puffs(n: number, hot: boolean, rand: () => number): Mesh<InstancedBufferGeometry, ShaderMaterial> {
    const g = new InstancedBufferGeometry();
    const quad = new PlaneGeometry(1, 1);
    g.setAttribute('position', quad.getAttribute('position'));
    g.setAttribute('uv', quad.getAttribute('uv'));
    g.setIndex(quad.getIndex());
    const dir = new Float32Array(n * 3);
    const seed = new Float32Array(n);
    for (let i = 0; i < n; i++) {
      const d = v3(rand() - 0.5, (rand() - 0.5) * 0.6, rand() - 0.5).normalize().multiplyScalar(0.2 + rand() ** 0.6);
      dir.set([d.x, d.y, d.z], i * 3);
      seed[i] = rand();
    }
    g.setAttribute('aDir', new InstancedBufferAttribute(dir, 3));
    g.setAttribute('aSeed', new InstancedBufferAttribute(seed, 1));
    g.instanceCount = n;
    const mat = this.keep(
      new ShaderMaterial({
        transparent: true,
        depthWrite: false,
        blending: hot ? AdditiveBlending : NormalBlending,
        uniforms: { age: { value: 0 } },
        vertexShader: /* glsl */ `
          attribute vec3 aDir;
          attribute float aSeed;
          uniform float age;
          varying vec2 vUv;
          varying float vSeed;
          void main() {
            vUv = uv;
            vSeed = aSeed;
            float reach = ${hot ? '2.6' : '4.2'} * (1.0 - exp(-age * ${hot ? '4.0' : '1.8'}));
            vec3 centre = aDir * reach;
            float size = ${hot ? '(0.5 + aSeed) * (0.5 + 2.2 * (1.0 - exp(-age * 5.0)))' : '(1.0 + aSeed * 1.5) * (0.6 + 2.6 * (1.0 - exp(-age * 1.5)))'};
            vec4 mv = modelViewMatrix * vec4(centre, 1.0);
            mv.xy += position.xy * size;
            gl_Position = projectionMatrix * mv;
          }
        `,
        fragmentShader: /* glsl */ `
          uniform float age;
          varying vec2 vUv;
          varying float vSeed;
          ${NOISE}
          void main() {
            vec2 p = vUv - 0.5;
            float r = length(p) * 2.0;
            float n = fbm(vec3(p * 3.0, vSeed * 10.0 + age * 1.5));
            float puff = smoothstep(1.0, 0.2, r + (n - 0.5) * 0.9);
            ${
              hot
                ? `float heat = exp(-age * (4.5 + vSeed * 2.5)) * (1.2 - r);
            vec3 c = vec3(1.0, 0.35, 0.08) * heat * 4.0 + vec3(1.0, 0.8, 0.5) * pow(max(heat, 1e-4), 2.5) * 9.0;
            gl_FragColor = vec4(c * puff, 1.0);`
                : `float a = puff * smoothstep(0.05, 0.4, age) * exp(-age * 1.2) * 0.55;
            gl_FragColor = vec4(vec3(0.05, 0.045, 0.045) + vec3(0.25, 0.1, 0.03) * exp(-age * 4.0), a);`
            }
          }
        `,
      }),
    );
    const mesh = new Mesh(g, mat);
    mesh.frustumCulled = false;
    mesh.visible = false;
    // Smoke first, so the hot gas reads in front of it.
    mesh.renderOrder = hot ? 3 : 2;
    this.scene.add(mesh);
    return mesh;
  }

  private buildBlast(): IntroScene['blast'] {
    const rand = mulberry32(0xb1a5);
    const fire = this.puffs(36, true, rand);
    const smoke = this.puffs(26, false, rand);

    // Hull fragments, flattened and irregular, thrown mostly along the orbital plane.
    const shardGeo = new IcosahedronGeometry(0.12, 0);
    shardGeo.scale(1.6, 0.35, 1);
    const shardMat = this.keep(new MeshStandardMaterial({ color: 0x8b8a86, roughness: 0.55, metalness: 0.6 }));
    const shards = new InstancedMesh(shardGeo, shardMat, 70);
    const shardV: Vector3[] = [];
    const shardSpin: Vector3[] = [];
    for (let i = 0; i < 70; i++) {
      const dir = v3(rand() - 0.5, (rand() - 0.5) * 0.45, rand() - 0.5).normalize();
      shardV.push(dir.multiplyScalar(10 + rand() * 30));
      shardSpin.push(v3(rand() - 0.5, rand() - 0.5, rand() - 0.5).multiplyScalar(18));
    }
    shards.visible = false;
    this.scene.add(shards);

    const emberGeo = new BoxGeometry(0.025, 0.025, 0.025);
    const embers = new InstancedMesh(emberGeo, this.keep(new MeshBasicMaterial({ color: 0xffffff })), 64);
    const emberV: Vector3[] = [];
    for (let i = 0; i < 64; i++) {
      const dir = v3(rand() - 0.5, (rand() - 0.5) * 0.7, rand() - 0.5).normalize();
      emberV.push(dir.multiplyScalar(6 + rand() ** 3 * 60));
      embers.setColorAt(i, new Color(0, 0, 0));
    }
    embers.visible = false;
    this.scene.add(embers);

    const light = new PointLight(0xffb070, 0, 0, 2);
    this.scene.add(light);
    return { fire, smoke, shards, embers, light, shardV, shardSpin, emberV };
  }
}

/**
 * Builds the scene once the app banners are in (each gets 900 ms before its
 * planet goes unlabelled). Resolves null when this device can't give us WebGL 2.
 */
export async function openIntroScene(canvas: HTMLCanvasElement, planets: Planet[]): Promise<IntroScene | null> {
  const gl = canvas.getContext('webgl2', { antialias: false, alpha: true, premultipliedAlpha: true, stencil: false, powerPreference: 'high-performance' });
  if (!gl) return null;
  const banners = await Promise.all(
    planets.map(
      (p) =>
        new Promise<HTMLImageElement | null>((resolve) => {
          const img = new Image();
          img.onload = () => resolve(img);
          img.onerror = () => resolve(null);
          setTimeout(() => resolve(null), 900);
          img.src = p.logo;
        }),
    ),
  );
  await Promise.race([document.fonts.load('500 40px "Space Grotesk"'), new Promise((r) => setTimeout(r, 900))]);
  const scene = new IntroScene(new WebGLRenderer({ canvas, context: gl, premultipliedAlpha: true, alpha: true }), planets, banners);
  scene.resize(canvas.clientWidth, canvas.clientHeight);
  // Compile everything now, the ship and blast included, so nothing hitches later.
  scene.draw(INTRO_IMPACT + 0.2);
  scene.draw(3);
  return scene;
}
