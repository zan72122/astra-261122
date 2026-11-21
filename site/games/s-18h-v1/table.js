"use strict";
const oven = grp(scene), ovenZ = -10.8;
oven.position.set(0, 0, ovenZ);
oven.visible = false;
const charcoal = mat("#373a38", 0.42, { metalness: 0.63 }), insideMetal = mat("#48453d", 0.54, { metalness: 0.57 }), rail = mat("#b2aba0", 0.25, { metalness: 0.88 }), ovenGlass = mat("#a6b5af", 0.11, { transparent: true, opacity: 0.055, depthWrite: false, metalness: 0.35 });
box(oven, insideMetal, 0, -0.13, 0, 8, 0.21, 7);
box(oven, insideMetal, 0, 1.7, -3.38, 8, 3.6, 0.19);
box(oven, charcoal, -3.81, 1.6, -0.16, 0.21, 3.4, 6.7);
box(oven, charcoal, 3.81, 1.6, -0.16, 0.21, 3.4, 6.7);
box(oven, charcoal, 0, 3.48, 0, 7.8, 0.24, 7);
for (let i = -6; i <= 6; i++) box(oven, rail, i * 0.51, 0.2, 0, 0.037, 0.047, 5.94);
for (let z of [-2.92, -1.74, 0.14, 2.87]) box(oven, rail, 0, 0.158, z, 7, 0.062, 0.052);
for (let x of [-3.54, 3.54]) for (let y of [0.18, 0.68, 1.28]) box(oven, rail, x, y, 0, 0.18, 0.063, 6.05);
for (let i = 0; i < 7; i++) box(oven, charcoal, 0, 0.74 + i * 0.19, -3.24, 3, 0.055, 0.045);
const glass = box(oven, ovenGlass, 0, 1.59, 3.12, 7.34, 3.01, 0.025);
glass.castShadow = false;
const glint = mat("#f3f3e7", 0.15, { transparent: true, opacity: 0.084, depthWrite: false });
for (let i = 0; i < 2; i++) {
  let g = box(oven, glint, -2.8 + i * 0.17, 1.54, 3.15, i ? 0.055 : 0.1, 2.78, 5e-3);
  g.rotation.z = -0.21;
  g.castShadow = false;
}
box(oven, charcoal, 0, 0.01, 3.17, 8, 0.25, 0.2);
box(oven, charcoal, 0, 3.17, 3.17, 8, 0.22, 0.2);
/* Surround the window with the actual oven front and the neighbouring cupboards. */
const frontEnamel = mat("#c8c7b6", 0.37, { metalness: 0.34 }), ovenTrim = mat("#81847c", 0.31, { metalness: 0.76 }), cabinet = mat("#859389", 0.65);
const surround = grp(oven);
box(surround, frontEnamel, 0, 3.72, 3.08, 8.04, 0.94, 0.34);
box(surround, frontEnamel, 0, -1.06, 3.08, 8.04, 1.91, 0.34);
for (let x of [-3.95, 3.95]) box(surround, frontEnamel, x, 1.57, 3.08, 0.4, 3.36, 0.34);
box(surround, ovenTrim, 0, 3.22, 3.25, 7.6, 0.07, 0.07);
for (let x of [-2.53, 2.53]) {
  let knob = lathe(surround, ovenTrim, [[1e-3, 0], [0.247, 0], [0.253, 0.04], [0.238, 0.15], [0.211, 0.19], [1e-3, 0.19]], 48);
  knob.rotation.x = PI / 2;
  knob.position.set(x, 3.78, 3.24);
  let inset = oval(surround, frontEnamel, x, 3.78, 3.44, 0.204, 0.204, 0.026);
}
for (let side of [-1, 1]) {
  let x = side * 7.55;
  box(surround, cabinet, x, 1.12, 1.15, 7.05, 6.3, 4.13);
  box(surround, boardWood, x, 4.3, -0.03, 7.19, 0.17, 7.36);
  box(surround, cabinet, x, 2.6, 3.26, 6.52, 2.49, 0.07);
  box(surround, cabinet, x, -0.42, 3.26, 6.52, 3.47, 0.07);
  box(surround, ovenTrim, x, 3.45, 3.38, 1.13, 0.063, 0.12);
}
box(surround, topWood, 0, 4.32, -0.15, 8.08, 0.17, 7.13);
const grout = mat("#d6d4c7", 0.9), tileMat = mat("#ebeee5", 0.37);
box(surround, grout, 0, 7, -3.52, 29, 7.8, 0.15);
for (let j = 0; j < 7; j++) for (let i = -7; i <= 7; i++) box(surround, tileMat, i * 1.79 + j % 2 * 0.895, 4.63 + j * 0.81, -3.419, 1.766, 0.785, 0.059);
box(surround, mat("#b6a899", 0.87), 0, -2.075, 0, 40, 0.13, 30);
combine(surround);
let lampMat = mat("#ffe7a7", 0.3, { emissive: 16758366, emissiveIntensity: 2 });
oval(oven, lampMat, 2.6, 2.22, -3.21, 0.43, 0.13, 0.09);
const bakeLight = new T.PointLight(16756311, 0, 11, 1.6);
bakeLight.position.set(2, 2.25, ovenZ - 1.85);
scene.add(bakeLight);
const dining = grp(scene);
dining.visible = false;
function textileMaterial(color) {
  let c = sheet(128, 128), ct = c.getContext("2d");
  ct.fillStyle = "#e7e6df";
  ct.fillRect(0, 0, 128, 128);
  for (let i = 0; i < 128; i += 3) {
    ct.fillStyle = "#a4a49e";
    ct.fillRect(i, 0, 1, 128);
    ct.fillStyle = "#ffffff55";
    ct.fillRect(0, i, 128, 1);
  }
  let t = tex(c);
  t.repeat.set(8, 7);
  return mat(color, 0.95, { map: t, bumpMap: t, bumpScale: 0.017 });
}

function servingPlate(k) {
  let p = grp(), m = mat(k ? "#f1e9ce" : "#e4e8df", 0.26), blue = mat("#4a687e", 0.35), sageLine = mat("#7c956e", 0.46), petal = mat("#98aeba", 0.43), spot = mat("#d1ad62", 0.44), r = 1.48;
  lathe(p, m, [[0.01, 0.025], [0.78, 0.025], [0.86, 0.062], [1.19, 0.08], [r - 0.05, 0.157], [r, 0.192], [r - 8e-3, 0.217], [r - 0.048, 0.231], [1.32, 0.211], [1.13, 0.153], [0.89, 0.101], [0.01, 0.089]], 96);
  ring(p, k ? sageLine : blue, k ? 1.436 : 1.412, k ? 0.012 : 0.023, 0.223);
  if (!k) {
    ring(p, blue, 1.342, 0.011, 0.212);
    ring(p, blue, 1.3, 6e-3, 0.201);
  } else for (let i = 0; i < 16; i++) {
    let a = i * TAU / 16, x = 1.285 * cos(a), z = 1.285 * sin(a);
    for (let j = 0; j < 5; j++) {
      let u = j * TAU / 5 + a;
      let l = oval(p, petal, x + 0.034 * cos(u), 0.196, z + 0.034 * sin(u), 0.032, 7e-3, 0.019);
      l.rotation.y = -u;
    }
    oval(p, spot, x, 0.201, z, 0.021, 7e-3, 0.021);
  }
  return combine(p);
}
/* Construct the whole hand as one smooth skin surface. Fingers open at the knuckles. */
function handGeometry() {
  let bones = [];
  function bone(a, b, r, s) {
    bones.push({ a, b, r, s });
  }
  let lengths = [0.59, 0.73, 0.79, 0.68], xs = [-0.295, -0.105, 0.1, 0.29];
  for (let i = 0; i < 4; i++) {
    let x = xs[i], l = lengths[i], dx = (i - 1.5) * 0.094, rad = [0.087, 0.099, 0.107, 0.108][i];
    let a = [x, 0.01, -0.22], b = [x + dx * 0.32, 0.035, -0.32 - l * 0.37], c = [x + dx * 0.75, 0.124, -0.3 - l * 0.73], d = [x + dx, 0.22, -0.27 - l];
    bone(a, b, rad * 1.13, rad);
    bone(b, c, rad, rad * 0.91);
    bone(c, d, rad * 0.91, rad * 0.8);
  }
  bone([0.25, -6e-3, 0.16], [0.448, 0.035, -8e-3], 0.155, 0.132);
  bone([0.448, 0.035, -8e-3], [0.571, 0.14, -0.19], 0.131, 0.112);
  bone([0.571, 0.14, -0.19], [0.6, 0.231, -0.366], 0.112, 0.094);
  function sdf(x, y, z) {
    let palm = (Math.sqrt((x / 0.421) ** 2 + ((y + 3e-3) / 0.167) ** 2 + ((z - 0.048) / 0.51) ** 2) - 1) * 0.167;
    let wrist = (Math.sqrt((x / 0.265) ** 2 + (y / 0.148) ** 2 + ((z - 0.47) / 0.39) ** 2) - 1) * 0.15;
    let d = Math.min(palm, wrist);
    for (let { a, b, r, s } of bones) {
      let dx = b[0] - a[0], dy = b[1] - a[1], dz = b[2] - a[2], t = clamp(((x - a[0]) * dx + (y - a[1]) * dy + (z - a[2]) * dz) / (dx * dx + dy * dy + dz * dz));
      let k = Math.hypot(x - a[0] - dx * t, (y - a[1] - dy * t) * 1.06, z - a[2] - dz * t) - mix(r, s, t), h = Math.max(0.058 - Math.abs(d - k), 0);
      d = Math.min(d, k) - h * h / 0.232;
    }
    return d;
  }
  let step = 0.044, X = 32, Y = 16, Z = 47, pts = [], vals = [], out = [], norm = [], morph = [], thumbMorph = [], pointMorph = [];
  for (let z = 0; z < Z; z++) for (let y = 0; y < Y; y++) for (let x = 0; x < X; x++) {
    let q = [-0.628 + x * step, -0.251 + y * step, -1.22 + z * step];
    pts.push(q);
    vals.push(sdf(...q));
  }
  const cube = [0, 1, X + 1, X, X * Y, X * Y + 1, X * Y + X + 1, X * Y + X], tets = [[0, 5, 1, 6], [0, 1, 2, 6], [0, 2, 3, 6], [0, 3, 7, 6], [0, 7, 4, 6], [0, 4, 5, 6]];
  const cache = new Map();
  function inter(i, j) {
    let key = Math.min(i, j) * 4e4 + Math.max(i, j);
    if (cache.has(key)) return cache.get(key);
    let t = vals[i] / (vals[i] - vals[j]), a = pts[i], b = pts[j], p = a.map((v, n2) => mix(v, b[n2], t)), [x, y, z] = p, e = 2e-3;
    let n = v3(sdf(x + e, y, z) - sdf(x - e, y, z), sdf(x, y + e, z) - sdf(x, y - e, z), sdf(x, y, z + e) - sdf(x, y, z - e)).normalize();
    let q = { p, n };
    cache.set(key, q);
    return q;
  }
  function tri(a, b, c) {
    let va = v3(...a.p), ab = v3(...b.p).sub(va), ac = v3(...c.p).sub(va);
    if (ab.cross(ac).dot(a.n) < 0) [b, c] = [c, b];
    for (let q of [a, b, c]) {
      out.push(...q.p);
      norm.push(q.n.x, q.n.y, q.n.z);
      let [x, y, z] = q.p, k = clamp((-z - 0.18) / 0.84), thumb = clamp((x - 0.38) / 0.23);
      morph.push(x * (1 + 0.12 * k), y - 0.16 * k * k, z - 0.071 * k);
      thumbMorph.push(x + 0.073 * thumb, y - 0.104 * thumb, z - 0.037 * thumb);
      let index = clamp((x - 0.145) / 0.133) * clamp((0.53 - x) / 0.1) * k;
      pointMorph.push(x + 0.026 * index, y - 0.088 * index, z - 0.127 * index);
    }
  }
  for (let z = 0; z < Z - 1; z++) for (let y = 0; y < Y - 1; y++) for (let x = 0; x < X - 1; x++) {
    let i = x + y * X + z * X * Y, corner = cube.map((j) => j + i);
    if (corner.every((j) => vals[j] > 0) || corner.every((j) => vals[j] <= 0)) continue;
    for (let tet of tets) {
      let inside2 = [], outside = [];
      for (let k of tet) {
        let j = corner[k];
        (vals[j] < 0 ? inside2 : outside).push(j);
      }
      if (!inside2.length || !outside.length) continue;
      if (inside2.length === 2) {
        let [a, b] = inside2, [c, d] = outside, A = inter(a, c), B = inter(b, c), C = inter(b, d), D = inter(a, d);
        tri(A, B, C);
        tri(A, C, D);
      } else {
        let a = inside2.length === 1 ? inside2[0] : outside[0], b = inside2.length === 1 ? outside : inside2;
        tri(inter(a, b[0]), inter(a, b[1]), inter(a, b[2]));
      }
    }
  }
  let g = new T.BufferGeometry();
  g.setAttribute("position", new T.Float32BufferAttribute(out, 3));
  g.setAttribute("normal", new T.Float32BufferAttribute(norm, 3));
  g.morphAttributes.position = [morph, thumbMorph, pointMorph].map((p) => new T.Float32BufferAttribute(p, 3));
  return g;
}
const handGeo = handGeometry();
function familyHand(k, second) {
  let g = grp(), p = grp(g), skin = mat(k ? "#dfa17c" : "#edb493", 0.66), o = mesh(p, handGeo, skin);
  if (second) p.scale.x = -1;
  let sleeve = textileMaterial(k ? "#9fae81" : "#435c70");
  let s = lathe(p, sleeve, [[0.3, 0], [0.338, 0.025], [0.36, 0.18], [0.38, 0.31], [0.405, 0.56], [0.47, 3.45], [0.48, 5.4]], 44);
  s.position.z = 0.39;
  s.rotation.x = PI / 2;
  s.scale.z = 0.64;
  let cuff = mat(k ? "#87996e" : "#34495b", 0.92);
  for (let i = 0; i < 5; i++) {
    let r = ring(p, cuff, 0.326 + i * 6e-3, 0.013, 0);
    r.rotation.x = 0;
    r.position.z = 0.416 + i * 0.045;
    r.scale.y = 0.67;
  }
  const line = mat(k ? "#c78f72" : "#d7a083", 0.84);
  for (let [x, z, sg] of [[-0.2, -0.08, 1], [0.04, 0.12, -1]]) tube(p, line, [v3(x - 0.08, 0.142, z + 0.06), v3(x, 0.161, z), v3(x + 0.12, 0.145, z - 0.047 * sg)], 45e-4, 9, 4);
  return { g, skin: o };
}
let preferences = ["pepper", "tomato", "sausage", "corn", "cheese", "sauce"].sort(() => Math.random() - 0.5);
const family = [0, 1].map((k) => {
  let plate = servingPlate(k), a = familyHand(k, false), b = familyHand(k, true);
  dining.add(plate, a.g, b.g);
  b.g.visible = false;
  return { k, plate, a, b, preference: preferences[k], memory: [], received: [], open: 0, reach: 0, joy: 0 };
});
function cutterModel() {
  let g = grp(), wheel = grp(g);
  let disc = lathe(wheel, metal, [[1e-3, -0.027], [0.275, -0.027], [0.338, -2e-3], [0.34, 3e-3], [0.276, 0.028], [1e-3, 0.028]], 64);
  disc.rotation.z = PI / 2;
  wheel.position.y = 0.343;
  for (let x of [-0.056, 0.056]) oval(wheel, darkMetal, x, 0, 0, 0.026, 0.072, 0.072);
  let neck = tube(g, metal, [v3(0.067, 0.34, 0), v3(0.068, 0.55, 0.12), v3(0.01, 0.62, 0.36)], 0.039);
  let h = lathe(g, mat("#92633d", 0.47, { map: grain }), [[0.035, 0], [0.084, 0.015], [0.104, 0.12], [0.104, 0.66], [0.092, 0.77], [0.061, 0.82], [1e-3, 0.835]], 36);
  h.rotation.x = 1.16;
  h.position.set(0, 0.61, 0.32);
  let collar = lathe(g, metal, [[0.081, 0], [0.09, 8e-3], [0.09, 0.085], [0.079, 0.09]], 32);
  collar.rotation.copy(h.rotation);
  collar.position.copy(h.position);
  return { g, wheel };
}
const cutter = cutterModel();
scene.add(cutter.g);
cutter.g.visible = false;
const steamGroup = grp(scene), steamMat = new T.MeshBasicMaterial({ color: 16776432, transparent: true, opacity: 0.105, depthWrite: false, side: T.DoubleSide });
const steam = [];
for (let i = 0; i < 12; i++) {
  let g = new T.PlaneGeometry(1, 1, 1, 12), m = steamMat.clone(), q = mesh(steamGroup, g, m);
  q.castShadow = q.receiveShadow = false;
  steam.push({ q, g, seed: rr(0, 1), x: rr(-1.8, 1.8), z: rr(-1.5, 1.5) });
}
steamGroup.visible = false;
function animateSteam(time, amount) {
  steamGroup.visible = amount > 0.05;
  if (!steamGroup.visible) return;
  for (let s of steam) {
    let u = (time * 0.23 + s.seed) % 1, height = 0.37 + 0.42 * s.seed;
    let source = v3(s.x, 0.29, s.z), scale = 1;
    if (stage === "serve" || stage === "complete") {
      let slice = pieces.find((q) => inside(q.poly, s.x, s.z));
      if (!slice) {
        s.q.visible = false;
        continue;
      }
      slice.g.localToWorld(source);
      source.sub(steamGroup.position);
      scale = slice.g.getWorldScale(v3()).x;
    }
    s.q.visible = true;
    s.q.position.copy(source);
    s.q.position.y += u * 0.69 * scale;
    s.q.scale.setScalar(scale);
    s.q.material.opacity = 0.11 * sin(PI * u) * amount;
    let p = s.g.attributes.position;
    for (let j = 0; j <= 12; j++) {
      let t = j / 12, xx = 0.069 * sin(t * 6 + time * 0.9 + s.seed * 15) + 0.04 * sin(t * 10 + time * 0.4);
      for (let k = 0; k < 2; k++) p.setXYZ(j * 2 + k, xx + (k - 0.5) * 0.034 * sin(PI * t), t * height, 0);
    }
    p.needsUpdate = true;
  }
}
const demoMat = mat("#fbddba", 0.55, { transparent: true, opacity: 0, depthWrite: false });
const demo = grp(scene);
(() => {
  let p = grp(demo);
  const link = (a, b, r) => {
    const va = v3(...a), vb = v3(...b), dir = vb.clone().sub(va), c = mesh(p, new T.CapsuleGeometry(r, dir.length(), 4, 12), demoMat);
    c.position.copy(va.add(vb).multiplyScalar(0.5));
    c.quaternion.setFromUnitVectors(v3(0, 1, 0), dir.normalize());
  };
  link([0, 0.08, 0], [0.028, 0.22, 0.16], 0.069);
  link([0.028, 0.22, 0.16], [0.05, 0.39, 0.32], 0.08);
  oval(p, demoMat, 0.03, 0.41, 0.49, 0.225, 0.105, 0.23);
  for (let i = 0; i < 3; i++) link([-0.07 - i * 0.052, 0.29, 0.34 + i * 0.055], [-0.09 - i * 0.048, 0.365, 0.43 + i * 0.047], 0.063);
  link([0.14, 0.36, 0.4], [0.2, 0.27, 0.3], 0.075);
  combine(demo);
  demo.traverse((o) => {
    o.castShadow = o.receiveShadow = false;
  });
  demo.visible = false;
})();
