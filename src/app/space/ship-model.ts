import {
  AdditiveBlending,
  BoxGeometry,
  BufferGeometry,
  CanvasTexture,
  CylinderGeometry,
  DoubleSide,
  ExtrudeGeometry,
  Group,
  LatheGeometry,
  Material,
  Mesh,
  MeshBasicMaterial,
  MeshStandardMaterial,
  PlaneGeometry,
  RepeatWrapping,
  SRGBColorSpace,
  Shape,
  ShaderMaterial,
  SphereGeometry,
  Texture,
  TorusGeometry,
  Vector2,
} from 'three';

import { mulberry32 } from './starfield';

/** The Xomware courier: about 1.7 units nose to nozzle, nose along -z. */
export interface ShipModel {
  ship: Group;
  /** The exhaust plumes. Place behind the ship and copy its rotation. */
  flame: Group;
  flameMat: ShaderMaterial;
  /** The glowing throats of the two engine bells. */
  nozzles: MeshBasicMaterial;
  /** Running lights: port (red), starboard (green), tail strobe (white). */
  beacons: MeshBasicMaterial[];
  dispose(): void;
}

/** Hull plating: panels a shade apart, seams, rivet rows, hatches, a registration. */
function plating(): { map: CanvasTexture; bump: CanvasTexture } {
  const W = 1024;
  const H = 512;
  const make = (): [HTMLCanvasElement, CanvasRenderingContext2D | null] => {
    const c = document.createElement('canvas');
    c.width = W;
    c.height = H;
    return [c, c.getContext('2d')];
  };
  const [mc, m] = make();
  const [bc, b] = make();
  const rand = mulberry32(0x5e1);
  if (m && b) {
    m.fillStyle = '#cfccc4';
    m.fillRect(0, 0, W, H);
    b.fillStyle = '#808080';
    b.fillRect(0, 0, W, H);
    // Panels, each its own sheet of metal with its own weathering.
    for (let y = 0; y < H; y += 64) {
      let x = 0;
      while (x < W) {
        const w = 48 + Math.floor(rand() * 4) * 32;
        const shade = Math.round(196 + (rand() - 0.5) * 22);
        m.fillStyle = `rgb(${shade}, ${shade - 2}, ${shade - 7})`;
        m.fillRect(x, y, w, 64);
        // Grime gathers along the lower edge.
        const grime = m.createLinearGradient(0, y + 40, 0, y + 64);
        grime.addColorStop(0, 'rgba(40, 36, 30, 0)');
        grime.addColorStop(1, `rgba(40, 36, 30, ${0.08 + rand() * 0.1})`);
        m.fillStyle = grime;
        m.fillRect(x, y, w, 64);
        for (const g of [m, b]) {
          g.fillStyle = g === m ? 'rgba(28, 28, 32, 0.75)' : '#303030';
          g.fillRect(x, y, w, 1.5);
          g.fillRect(x, y, 1.5, 64);
        }
        // Rivets along the seams.
        for (let r = x + 6; r < x + w - 4; r += 8) {
          m.fillStyle = 'rgba(60, 58, 54, 0.5)';
          m.fillRect(r, y + 4, 1.4, 1.4);
          b.fillStyle = '#b0b0b0';
          b.fillRect(r, y + 4, 1.4, 1.4);
        }
        x += w;
      }
    }
    // Hatches and access plates.
    for (let i = 0; i < 14; i++) {
      const x = rand() * (W - 60);
      const y = rand() * (H - 40);
      const w = 18 + rand() * 40;
      const h = 12 + rand() * 24;
      m.strokeStyle = 'rgba(30, 30, 34, 0.6)';
      m.lineWidth = 1.2;
      m.strokeRect(x, y, w, h);
      b.strokeStyle = '#404040';
      b.strokeRect(x, y, w, h);
    }
    // A dark band and the registration, the way real craft are marked.
    m.fillStyle = 'rgba(32, 40, 52, 0.85)';
    m.fillRect(0, 300, W, 18);
    m.fillStyle = 'rgba(40, 44, 52, 0.8)';
    m.font = '600 22px "Space Grotesk", sans-serif';
    m.fillText('XW-07', 140, 360);
    m.fillText('XW-07', 652, 360);
  }
  const map = new CanvasTexture(mc);
  map.colorSpace = SRGBColorSpace;
  map.wrapS = map.wrapT = RepeatWrapping;
  map.anisotropy = 4;
  const bump = new CanvasTexture(bc);
  bump.wrapS = bump.wrapT = RepeatWrapping;
  return { map, bump };
}

/** White-hot throat fading to the bell's dark wall. */
function throat(): CanvasTexture {
  const c = document.createElement('canvas');
  c.width = c.height = 64;
  const g = c.getContext('2d');
  if (g) {
    const grad = g.createRadialGradient(32, 32, 0, 32, 32, 32);
    grad.addColorStop(0, 'rgb(255, 250, 240)');
    grad.addColorStop(0.35, 'rgb(255, 196, 120)');
    grad.addColorStop(0.75, 'rgb(150, 60, 20)');
    grad.addColorStop(1, 'rgb(20, 10, 6)');
    g.fillStyle = grad;
    g.fillRect(0, 0, 64, 64);
  }
  return new CanvasTexture(c);
}

export function buildShipModel(): ShipModel {
  const materials: Material[] = [];
  const geometries: BufferGeometry[] = [];
  const textures: Texture[] = [];
  const keep = <T extends Material>(m: T): T => {
    materials.push(m);
    return m;
  };
  const geo = <T extends BufferGeometry>(g: T): T => {
    geometries.push(g);
    return g;
  };

  const { map, bump } = plating();
  const throatTex = throat();
  textures.push(map, bump, throatTex);
  const hull = keep(new MeshStandardMaterial({ color: 0xffffff, map, bumpMap: bump, bumpScale: 0.6, roughness: 0.38, metalness: 0.45 }));
  const wingMap = map.clone();
  wingMap.repeat.set(1.6, 1.6);
  textures.push(wingMap);
  const wingSkin = keep(new MeshStandardMaterial({ color: 0x9a9da3, map: wingMap, bumpMap: bump, bumpScale: 0.5, roughness: 0.46, metalness: 0.5 }));
  const dark = keep(new MeshStandardMaterial({ color: 0x4a4e55, roughness: 0.38, metalness: 0.8 }));
  const burnt = keep(new MeshStandardMaterial({ color: 0x3a2f2a, roughness: 0.35, metalness: 0.9 }));
  const glass = keep(new MeshStandardMaterial({ color: 0x3a5068, roughness: 0.12, metalness: 0.9, envMapIntensity: 2.5 }));
  const nozzles = keep(new MeshBasicMaterial({ color: 0x000000, map: throatTex }));
  const beacons = [0, 1, 2].map(() => keep(new MeshBasicMaterial({ color: 0x000000 })));

  const ship = new Group();

  // Fuselage: an ogive nose into a long body that steps down at the engine bay.
  const profile: Vector2[] = [];
  for (let i = 0; i <= 40; i++) {
    const u = i / 40;
    const nose = Math.sin(Math.min(u / 0.5, 1) * Math.PI * 0.5) ** 0.8;
    const waist = 1 - 0.1 * Math.sin(Math.min(Math.max((u - 0.55) / 0.45, 0), 1) * Math.PI);
    profile.push(new Vector2(Math.max(0.24 * nose * waist, 0.003), u * 2 - 1));
  }
  const body = new Mesh(geo(new LatheGeometry(profile, 48)), hull);
  body.rotation.x = Math.PI / 2;
  body.scale.set(1, 1, 0.74);
  ship.add(body);

  // Canopy glass in a dark frame.
  const canopy = new Mesh(geo(new SphereGeometry(0.2, 32, 16, 0, Math.PI * 2, 0, Math.PI / 2)), glass);
  canopy.scale.set(0.62, 0.5, 1.45);
  canopy.position.set(0, 0.12, -0.5);
  ship.add(canopy);
  const frame = new Mesh(geo(new TorusGeometry(0.2, 0.012, 6, 32)), dark);
  frame.rotation.x = Math.PI / 2;
  frame.scale.set(0.62, 1.45, 1);
  frame.position.set(0, 0.12, -0.5);
  ship.add(frame);

  // Swept wings with a little dihedral, a darker leading edge, and a pod each.
  const wing = new Shape();
  wing.moveTo(0, -0.12);
  wing.lineTo(0.98, 0.42);
  wing.lineTo(1.06, 0.6);
  wing.lineTo(0.9, 0.64);
  wing.lineTo(0, 0.66);
  const wingGeo = geo(new ExtrudeGeometry(wing, { depth: 0.03, bevelEnabled: true, bevelSize: 0.014, bevelThickness: 0.012, bevelSegments: 2 }));
  wingGeo.rotateX(Math.PI / 2);
  const edgeGeo = geo(new BoxGeometry(1.12, 0.05, 0.05));
  for (const side of [1, -1]) {
    const w = new Mesh(wingGeo, wingSkin);
    w.scale.set(side, 1, 1);
    w.position.set(side * 0.12, -0.04, 0);
    w.rotation.z = side * 0.07;
    ship.add(w);
    const edge = new Mesh(edgeGeo, dark);
    edge.position.set(side * 0.6, -0.05, 0.15);
    edge.rotation.y = -side * 0.5;
    edge.rotation.z = side * 0.07;
    ship.add(edge);

    const pod = new Mesh(geo(new CylinderGeometry(0.105, 0.125, 0.72, 28)), dark);
    pod.rotation.x = Math.PI / 2;
    pod.position.set(side * 0.42, -0.02, 0.6);
    ship.add(pod);
    const intake = new Mesh(geo(new TorusGeometry(0.1, 0.018, 8, 28)), hull);
    intake.position.set(side * 0.42, -0.02, 0.24);
    ship.add(intake);
    // The bell: heat-blued metal flaring out from the throat.
    const bell = new Mesh(geo(new CylinderGeometry(0.13, 0.085, 0.18, 28, 1, true)), burnt);
    bell.rotation.x = Math.PI / 2;
    bell.position.set(side * 0.42, -0.02, 1.04);
    ship.add(bell);
    const glow = new Mesh(geo(new CylinderGeometry(0.085, 0.085, 0.01, 28)), nozzles);
    glow.rotation.x = Math.PI / 2;
    glow.position.set(side * 0.42, -0.02, 0.97);
    ship.add(glow);
    // Reaction-control quads near the nose.
    const rcs = new Mesh(geo(new BoxGeometry(0.05, 0.05, 0.08)), dark);
    rcs.position.set(side * 0.17, 0.02, -0.6);
    ship.add(rcs);

    const tip = new Mesh(geo(new SphereGeometry(0.022, 10, 8)), beacons[side > 0 ? 1 : 0]);
    tip.position.set(side * 1.1, -0.045, 0.63);
    ship.add(tip);
  }

  // Tail fin with the strobe on top.
  const fin = new Shape();
  fin.moveTo(0, 0);
  fin.lineTo(0.5, 0);
  fin.lineTo(0.64, 0.44);
  fin.lineTo(0.44, 0.46);
  const finGeo = geo(new ExtrudeGeometry(fin, { depth: 0.026, bevelEnabled: true, bevelSize: 0.008, bevelThickness: 0.006, bevelSegments: 1 }));
  finGeo.rotateY(Math.PI / 2);
  const tail = new Mesh(finGeo, wingSkin);
  tail.position.set(-0.013, 0.08, 0.4);
  tail.rotation.y = Math.PI;
  ship.add(tail);
  const strobe = new Mesh(geo(new SphereGeometry(0.02, 8, 6)), beacons[2]);
  strobe.position.set(0, 0.55, 0.86);
  ship.add(strobe);

  // Greebles: a spine, sensor blister, an antenna and belly plates.
  for (const [x, y, z, w, h, d] of [
    [0, 0.175, 0.22, 0.12, 0.035, 0.42],
    [0.13, 0.125, 0.62, 0.06, 0.05, 0.22],
    [-0.13, 0.125, 0.62, 0.06, 0.05, 0.22],
    [0, -0.17, 0.05, 0.12, 0.035, 0.6],
  ]) {
    const box = new Mesh(geo(new BoxGeometry(w, h, d)), dark);
    box.position.set(x, y, z);
    ship.add(box);
  }
  const blister = new Mesh(geo(new SphereGeometry(0.05, 16, 8, 0, Math.PI * 2, 0, Math.PI / 2)), glass);
  blister.position.set(0, -0.15, -0.55);
  blister.rotation.x = Math.PI;
  ship.add(blister);
  const mast = new Mesh(geo(new CylinderGeometry(0.004, 0.004, 0.22, 4)), dark);
  mast.position.set(0.05, 0.27, 0.05);
  mast.rotation.x = 0.5;
  ship.add(mast);
  ship.scale.setScalar(0.85);

  // Exhaust: two crossed additive sheets per bell so the plume reads from any angle.
  const flameMat = keep(
    new ShaderMaterial({
      transparent: true,
      depthWrite: false,
      side: DoubleSide,
      blending: AdditiveBlending,
      uniforms: { strength: { value: 1 }, time: { value: 0 } },
      vertexShader: /* glsl */ `
        varying vec2 vUv;
        void main() {
          vUv = uv;
          gl_Position = projectionMatrix * modelViewMatrix * vec4(position.x * 0.2, 0.0, position.y * 1.3 + 0.65, 1.0);
        }
      `,
      fragmentShader: /* glsl */ `
        uniform float strength;
        uniform float time;
        varying vec2 vUv;
        void main() {
          float along = clamp(vUv.y, 0.0, 1.0);
          float across = abs(vUv.x - 0.5) * 2.0;
          // Shock diamonds: the bright knots a nozzle's exhaust forms just past the bell.
          float diamonds = 0.75 + 0.25 * cos(along * 38.0 - time * 6.0);
          float width = mix(0.35, 1.0, along);
          float body = exp(-across * across * 7.0 / (width * width)) * pow(max(1.0 - along, 1e-4), 2.0) * diamonds;
          float flick = 0.88 + 0.12 * sin(time * 83.0 + along * 21.0);
          vec3 hot = mix(vec3(1.0, 0.5, 0.2), vec3(1.0, 0.92, 0.8), pow(max(1.0 - along, 1e-4), 5.0));
          gl_FragColor = vec4(hot * body * strength * flick * 2.4, 1.0);
        }
      `,
    }),
  );
  const flame = new Group();
  const sheet = geo(new PlaneGeometry(1, 1));
  for (const x of [-0.36, 0.36]) {
    for (const roll of [0, Math.PI / 2]) {
      const m = new Mesh(sheet, flameMat);
      m.position.x = x;
      m.position.y = -0.017;
      m.rotation.z = roll;
      flame.add(m);
    }
  }

  return {
    ship,
    flame,
    flameMat,
    nozzles,
    beacons,
    dispose: () => {
      materials.forEach((m) => m.dispose());
      geometries.forEach((g) => g.dispose());
      textures.forEach((x) => x.dispose());
    },
  };
}
