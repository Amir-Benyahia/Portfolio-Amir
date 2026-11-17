// Clay single-seater, modelled procedurally from lofted cross-sections.
// Units: metres. Forward = +z, up = +y, right = +x.
import * as THREE from "three";

const clay = new THREE.MeshStandardMaterial({ color: 0xf1f1ec, roughness: 0.74, metalness: 0 });
const clayShade = new THREE.MeshStandardMaterial({ color: 0xd9dbd5, roughness: 0.8, metalness: 0 });
const rubber = new THREE.MeshStandardMaterial({ color: 0x232427, roughness: 0.92, metalness: 0 });
const dark = new THREE.MeshStandardMaterial({ color: 0x2c2e31, roughness: 0.55, metalness: 0.1 });

// smooth interpolation of keyed values (cosine ease between keys)
function sampleKeys(keys, z, prop) {
  if (z >= keys[0].z) return keys[0][prop];
  for (let i = 0; i < keys.length - 1; i++) {
    const a = keys[i], b = keys[i + 1];
    if (z <= a.z && z >= b.z) {
      const t = (a.z - z) / (a.z - b.z);
      const e = (1 - Math.cos(Math.PI * t)) / 2;
      return a[prop] + (b[prop] - a[prop]) * e;
    }
  }
  return keys[keys.length - 1][prop];
}

// Loft superellipse sections along z. keys sorted from front (high z) to back.
// key: {z, w (half width), bot, top, n (exponent: 2 ellipse, >2 boxier)}
export function loft(keys, { x = 0, rings = 64, seg = 40, capFront = true, capBack = true } = {}) {
  const z0 = keys[0].z, z1 = keys[keys.length - 1].z;
  const pos = [], idx = [];
  for (let r = 0; r <= rings; r++) {
    const z = z0 + (z1 - z0) * (r / rings);
    const w = sampleKeys(keys, z, "w"), bot = sampleKeys(keys, z, "bot"), top = sampleKeys(keys, z, "top"), n = sampleKeys(keys, z, "n");
    const cy = (top + bot) / 2, hh = (top - bot) / 2;
    for (let s = 0; s < seg; s++) {
      const a = (s / seg) * Math.PI * 2;
      const c = Math.cos(a), sn = Math.sin(a);
      const px = w * Math.sign(c) * Math.pow(Math.abs(c), 2 / n);
      const py = cy + hh * Math.sign(sn) * Math.pow(Math.abs(sn), 2 / n);
      pos.push(x + px, py, z);
    }
  }
  for (let r = 0; r < rings; r++) for (let s = 0; s < seg; s++) {
    const a = r * seg + s, b = r * seg + ((s + 1) % seg), c = (r + 1) * seg + s, d = (r + 1) * seg + ((s + 1) % seg);
    idx.push(a, c, b, b, c, d);
  }
  const addCap = (ring, flip) => {
    const center = pos.length / 3;
    let cx = 0, cy = 0, cz = 0;
    for (let s = 0; s < seg; s++) { cx += pos[(ring * seg + s) * 3]; cy += pos[(ring * seg + s) * 3 + 1]; cz += pos[(ring * seg + s) * 3 + 2]; }
    pos.push(cx / seg, cy / seg, cz / seg);
    for (let s = 0; s < seg; s++) {
      const a = ring * seg + s, b = ring * seg + ((s + 1) % seg);
      flip ? idx.push(center, a, b) : idx.push(center, b, a);
    }
  };
  if (capFront) addCap(0, true);
  if (capBack) addCap(rings, false);
  const g = new THREE.BufferGeometry();
  g.setAttribute("position", new THREE.Float32BufferAttribute(pos, 3));
  g.setIndex(idx);
  g.computeVertexNormals();
  return g;
}

// thin aerofoil extruded across the car (span along x)
function wing(chord, thick, span, camber = 0.25) {
  const s = new THREE.Shape();
  const N = 24;
  const upper = [], lower = [];
  for (let i = 0; i <= N; i++) {
    const t = i / N; // 0 = leading edge (front, +z), 1 = trailing
    const th = thick * 5 * (0.2969 * Math.sqrt(t) - 0.126 * t - 0.3516 * t * t + 0.2843 * t ** 3 - 0.1036 * t ** 4);
    const cam = -camber * thick * 4 * t * (1 - t) * 2;
    upper.push([-t * chord, cam + th]);
    lower.push([-t * chord, cam - th]);
  }
  s.moveTo(upper[0][0], upper[0][1]);
  for (let i = 1; i <= N; i++) s.lineTo(upper[i][0], upper[i][1]);
  for (let i = N; i >= 0; i--) s.lineTo(lower[i][0], lower[i][1]);
  const g = new THREE.ExtrudeGeometry(s, { depth: span, bevelEnabled: false, curveSegments: 8 });
  // shape is in (x=z-axis of car, y), extrude goes along +z -> rotate so span runs along x
  g.translate(0, 0, -span / 2);
  g.rotateY(-Math.PI / 2);
  return g;
}

function plate(points, thickness) {
  const s = new THREE.Shape();
  s.moveTo(points[0][0], points[0][1]);
  for (let i = 1; i < points.length; i++) s.lineTo(points[i][0], points[i][1]);
  const g = new THREE.ExtrudeGeometry(s, { depth: thickness, bevelEnabled: true, bevelSize: 0.01, bevelThickness: 0.01, bevelSegments: 2 });
  g.translate(0, 0, -thickness / 2);
  g.rotateY(-Math.PI / 2); // shape x -> car z
  return g;
}

function tyre(radius, width) {
  const pts = [];
  const r0 = radius * 0.62, rr = 0.07;
  pts.push(new THREE.Vector2(r0, -width / 2));
  // sidewall bulge and rounded shoulder
  for (let i = 0; i <= 10; i++) {
    const t = i / 10;
    pts.push(new THREE.Vector2(r0 + (radius - rr - r0) * t + Math.sin(t * Math.PI) * 0.015, -width / 2 - Math.sin(t * Math.PI) * 0.012));
  }
  for (let i = 0; i <= 8; i++) {
    const a = -Math.PI / 2 + (i / 8) * (Math.PI / 2);
    pts.push(new THREE.Vector2(radius - rr + Math.cos(a) * rr, -width / 2 + rr + Math.sin(a) * rr));
  }
  for (let i = 0; i <= 8; i++) {
    const a = (i / 8) * (Math.PI / 2);
    pts.push(new THREE.Vector2(radius - rr + Math.cos(a) * rr, width / 2 - rr + Math.sin(a) * rr));
  }
  for (let i = 0; i <= 10; i++) {
    const t = 1 - i / 10;
    pts.push(new THREE.Vector2(r0 + (radius - rr - r0) * t + Math.sin(t * Math.PI) * 0.015, width / 2 + Math.sin(t * Math.PI) * 0.012));
  }
  const g = new THREE.LatheGeometry(pts, 48);
  g.rotateZ(Math.PI / 2);
  return g;
}

function wheel(radius, width, side) {
  const grp = new THREE.Group();
  const t = new THREE.Mesh(tyre(radius, width), rubber);
  t.castShadow = true; t.receiveShadow = true;
  grp.add(t);
  // rim: dished disc with spokes suggested by a cover
  const rim = new THREE.Mesh(new THREE.CylinderGeometry(radius * 0.62, radius * 0.6, width * 0.82, 40, 1, true), dark);
  rim.rotation.z = Math.PI / 2; grp.add(rim);
  const cover = new THREE.Mesh(new THREE.CylinderGeometry(radius * 0.58, radius * 0.58, 0.02, 40), dark);
  cover.rotation.z = Math.PI / 2; cover.position.x = side * width * 0.38; grp.add(cover);
  const nut = new THREE.Mesh(new THREE.CylinderGeometry(0.035, 0.045, 0.05, 16), clayShade);
  nut.rotation.z = Math.PI / 2; nut.position.x = side * width * 0.42; grp.add(nut);
  return grp;
}

function rod(a, b, r = 0.018, mat = clayShade) {
  const v = new THREE.Vector3().subVectors(b, a);
  const m = new THREE.Mesh(new THREE.CylinderGeometry(r, r, v.length(), 8), mat);
  m.position.copy(a).addScaledVector(v, 0.5);
  m.quaternion.setFromUnitVectors(new THREE.Vector3(0, 1, 0), v.normalize());
  m.castShadow = true;
  return m;
}

export function buildCar() {
  const car = new THREE.Group();
  const add = (geo, mat = clay, cast = true) => { const m = new THREE.Mesh(geo, mat); m.castShadow = cast; m.receiveShadow = true; car.add(m); return m; };

  // chassis + nose
  add(loft([
    { z: 2.8, w: 0.09, bot: 0.17, top: 0.27, n: 3 },
    { z: 2.3, w: 0.15, bot: 0.14, top: 0.36, n: 2.8 },
    { z: 1.5, w: 0.21, bot: 0.12, top: 0.5, n: 2.6 },
    { z: 0.75, w: 0.3, bot: 0.08, top: 0.6, n: 3 },
    { z: -0.25, w: 0.36, bot: 0.06, top: 0.64, n: 3.2 },
    { z: -1.2, w: 0.3, bot: 0.06, top: 0.6, n: 3 },
    { z: -2.0, w: 0.15, bot: 0.12, top: 0.42, n: 2.6 },
    { z: -2.4, w: 0.07, bot: 0.18, top: 0.3, n: 2.2 },
  ], { rings: 90 }));

  // engine cover rising behind the driver, with airbox
  add(loft([
    { z: 0.05, w: 0.14, bot: 0.55, top: 0.74, n: 2.4 },
    { z: -0.35, w: 0.17, bot: 0.55, top: 0.98, n: 2.6 },
    { z: -0.9, w: 0.13, bot: 0.55, top: 0.88, n: 2.4 },
    { z: -1.7, w: 0.05, bot: 0.5, top: 0.6, n: 2.2 },
    { z: -2.1, w: 0.02, bot: 0.45, top: 0.5, n: 2 },
  ], { rings: 50 }));
  // airbox intake (dark opening)
  const intake = add(new THREE.SphereGeometry(0.1, 24, 16), rubber, false);
  intake.scale.set(1, 1.15, 0.35); intake.position.set(0, 0.86, -0.27);
  // shark fin
  add(plate([[-0.6, 0.72], [-0.6, 0.98], [-1.6, 0.92], [-2.15, 0.7], [-2.1, 0.6]], 0.015));

  // sidepods
  for (const sx of [-1, 1]) {
    add(loft([
      { z: 0.62, w: 0.24, bot: 0.1, top: 0.4, n: 5 },
      { z: 0.3, w: 0.32, bot: 0.08, top: 0.47, n: 5 },
      { z: -0.5, w: 0.3, bot: 0.08, top: 0.44, n: 4 },
      { z: -1.2, w: 0.2, bot: 0.09, top: 0.32, n: 3 },
      { z: -1.8, w: 0.08, bot: 0.12, top: 0.2, n: 2.4 },
    ], { x: sx * 0.36, rings: 60 }));
    // inlet mouth
    const mouth = add(new THREE.SphereGeometry(0.1, 20, 12), rubber, false);
    mouth.scale.set(2.0, 1.3, 0.3); mouth.position.set(sx * 0.46, 0.29, 0.64);
    // mirror
    car.add(rod(new THREE.Vector3(sx * 0.3, 0.6, 0.55), new THREE.Vector3(sx * 0.5, 0.7, 0.5), 0.012));
    const mir = add(RoundedPlate(0.16, 0.06, 0.03));
    mir.position.set(sx * 0.52, 0.71, 0.5);
  }

  // cockpit opening + driver's helmet
  const hole = add(loft([
    { z: 0.62, w: 0.12, bot: 0.57, top: 0.645, n: 2 },
    { z: 0.3, w: 0.24, bot: 0.57, top: 0.66, n: 2.4 },
    { z: -0.15, w: 0.22, bot: 0.57, top: 0.665, n: 2.4 },
    { z: -0.2, w: 0.12, bot: 0.57, top: 0.66, n: 2 },
  ], { rings: 20 }), rubber, false);
  const helmet = add(new THREE.SphereGeometry(0.15, 32, 24), clay);
  helmet.scale.set(0.95, 0.95, 1.08); helmet.position.set(0, 0.76, -0.02);
  const visor = add(new THREE.SphereGeometry(0.152, 32, 12, Math.PI * 0.18, Math.PI * 0.64, Math.PI * 0.38, Math.PI * 0.17), dark, false);
  visor.scale.copy(helmet.scale); visor.position.copy(helmet.position);
  visor.rotation.y = 0;

  // halo
  const hoop = new THREE.CatmullRomCurve3([
    new THREE.Vector3(-0.3, 0.63, -0.28), new THREE.Vector3(-0.32, 0.82, -0.05), new THREE.Vector3(-0.24, 0.88, 0.32),
    new THREE.Vector3(0, 0.9, 0.48), new THREE.Vector3(0.24, 0.88, 0.32), new THREE.Vector3(0.32, 0.82, -0.05), new THREE.Vector3(0.3, 0.63, -0.28),
  ]);
  add(new THREE.TubeGeometry(hoop, 60, 0.032, 12, false), clay);
  const pillar = new THREE.CatmullRomCurve3([new THREE.Vector3(0, 0.9, 0.48), new THREE.Vector3(0, 0.82, 0.66), new THREE.Vector3(0, 0.6, 0.8)]);
  add(new THREE.TubeGeometry(pillar, 20, 0.028, 10, false), clay);

  // floor (plan view) with sculpted edges
  const fl = new THREE.Shape();
  fl.moveTo(-0.32, 1.0); fl.lineTo(0.32, 1.0); fl.bezierCurveTo(0.6, 0.8, 0.78, 0.5, 0.78, 0.0);
  fl.lineTo(0.76, -1.25); fl.bezierCurveTo(0.74, -1.5, 0.55, -1.7, 0.5, -1.75); fl.lineTo(0.48, -2.25); fl.lineTo(-0.48, -2.25);
  fl.lineTo(-0.5, -1.75); fl.bezierCurveTo(-0.55, -1.7, -0.74, -1.5, -0.76, -1.25); fl.lineTo(-0.78, 0.0); fl.bezierCurveTo(-0.78, 0.5, -0.6, 0.8, -0.32, 1.0);
  const flg = new THREE.ExtrudeGeometry(fl, { depth: 0.03, bevelEnabled: true, bevelSize: 0.015, bevelThickness: 0.01, bevelSegments: 2 });
  flg.rotateX(Math.PI / 2); flg.translate(0, 0.07, 0);
  add(flg, clayShade);

  // front wing: three stacked elements + endplates + nose pylons
  const fw = [[0.34, 0.035, 1.9, 2.78, 0.09], [0.22, 0.03, 1.86, 2.55, 0.15], [0.17, 0.025, 1.8, 2.42, 0.21]];
  for (const [ch, th, sp, z, y] of fw) { const m = add(wing(ch, th, sp, 0.6)); m.position.set(0, y, z + 0.05); m.rotation.x = 0.12; }
  for (const sx of [-1, 1]) {
    const ep = add(plate([[2.9, 0.06], [2.92, 0.26], [2.75, 0.3], [2.3, 0.28], [2.25, 0.06]], 0.015));
    ep.position.x = sx * 0.95;
    car.add(rod(new THREE.Vector3(sx * 0.08, 0.2, 2.45), new THREE.Vector3(sx * 0.07, 0.12, 2.55), 0.015));
  }

  // rear wing: main plane + flap + beam wing, tall endplates
  const rw1 = add(wing(0.36, 0.04, 1.0, 0.7)); rw1.position.set(0, 0.84, -2.25); rw1.rotation.x = 0.18;
  const rw2 = add(wing(0.2, 0.03, 1.0, 0.7)); rw2.position.set(0, 0.98, -2.55); rw2.rotation.x = 0.5;
  const bw = add(wing(0.22, 0.03, 0.9, 0.5)); bw.position.set(0, 0.42, -2.28); bw.rotation.x = 0.1;
  for (const sx of [-1, 1]) {
    const ep = add(plate([[-2.12, 0.3], [-2.2, 1.06], [-2.72, 1.08], [-2.78, 0.62], [-2.6, 0.3]], 0.015));
    ep.position.x = sx * 0.51;
  }
  // rear crash structure + rain light
  const rl = add(new THREE.BoxGeometry(0.12, 0.05, 0.03), dark, false); rl.position.set(0, 0.26, -2.42);

  // wheels + suspension
  const wheels = [];
  const wspec = [[0.82, 1.78, 0.36, 0.36], [0.8, -1.62, 0.37, 0.44]];
  for (const [wx, wz, r, wd] of wspec) for (const sx of [-1, 1]) {
    const w = wheel(r, wd, sx);
    w.position.set(sx * wx, r, wz);
    car.add(w); wheels.push(w);
    const hub = new THREE.Vector3(sx * (wx - wd * 0.45), r, wz);
    car.add(rod(new THREE.Vector3(sx * 0.2, 0.42, wz + 0.25), hub.clone().add(new THREE.Vector3(0, 0.08, 0))));
    car.add(rod(new THREE.Vector3(sx * 0.2, 0.42, wz - 0.25), hub.clone().add(new THREE.Vector3(0, 0.08, 0))));
    car.add(rod(new THREE.Vector3(sx * 0.2, 0.2, wz + 0.22), hub.clone().add(new THREE.Vector3(0, -0.06, 0))));
    car.add(rod(new THREE.Vector3(sx * 0.2, 0.2, wz - 0.22), hub.clone().add(new THREE.Vector3(0, -0.06, 0))));
  }
  car.userData.wheels = wheels;
  return car;
}

// small rounded slab used for mirrors
function RoundedPlate(w, h, d) {
  const s = new THREE.Shape();
  const r = h / 2;
  s.moveTo(-w / 2 + r, -h / 2); s.lineTo(w / 2 - r, -h / 2); s.absarc(w / 2 - r, 0, r, -Math.PI / 2, Math.PI / 2);
  s.lineTo(-w / 2 + r, h / 2); s.absarc(-w / 2 + r, 0, r, Math.PI / 2, Math.PI * 1.5);
  const g = new THREE.ExtrudeGeometry(s, { depth: d, bevelEnabled: false });
  g.translate(0, 0, -d / 2);
  return g;
}

export const materials = { clay, clayShade, rubber, dark };
