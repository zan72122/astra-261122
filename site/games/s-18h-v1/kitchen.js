"use strict";
const T = THREE, PI = Math.PI, TAU = 2 * PI, sin = Math.sin, cos = Math.cos, clamp = (n, a = 0, b = 1) => Math.max(a, Math.min(b, n)), mix = (a, b, t) => a + (b - a) * t, smooth = (t) => t * t * (3 - 2 * t);
const rng = () => {
  let s = 9999295;
  return () => {
    s = Math.imul(1664525, s) + 1013904223 | 0;
    return (s >>> 0) / 4294967296;
  };
};
const texRand = rng();
const rr = (a, b) => mix(a, b, Math.random()), v3 = (x = 0, y = 0, z = 0) => new T.Vector3(x, y, z), col = (c) => new T.Color(c);
const canvas = document.querySelector("#kitchen"), renderer = new T.WebGLRenderer({ canvas, antialias: true, alpha: false, powerPreference: "high-performance" });
renderer.setPixelRatio(Math.min(devicePixelRatio, 1.8));
renderer.shadowMap.enabled = true;
renderer.shadowMap.type = T.PCFShadowMap;
renderer.toneMapping = T.ACESFilmicToneMapping;
renderer.toneMappingExposure = 1.08;
const scene = new T.Scene(), camera = new T.PerspectiveCamera(34, 1, 0.035, 90);
scene.background = col("#e2d6c2");
function grp(parent) {
  const o = new T.Group();
  if (parent) parent.add(o);
  return o;
}

function mat(color, roughness = 0.65, extra = {}) {
  return new T.MeshStandardMaterial({ color, roughness, ...extra });
}

function mesh(parent, geom, material, x = 0, y = 0, z = 0) {
  const o = new T.Mesh(geom, material);
  o.position.set(x, y, z);
  o.castShadow = true;
  o.receiveShadow = true;
  parent.add(o);
  return o;
}
const fleckSphere = new T.SphereGeometry(1, 9, 5), unitSphere = new T.SphereGeometry(1, 22, 16), boxGeom = new T.BoxGeometry(1, 1, 1);
function oval(p, m, x, y, z, a, b, c) {
  const o = mesh(p, Math.max(a, b, c) < 0.105 ? fleckSphere : unitSphere, m, x, y, z);
  o.scale.set(a, b, c);
  return o;
}

function box(p, m, x, y, z, w, h, d) {
  const o = mesh(p, boxGeom, m, x, y, z);
  o.scale.set(w, h, d);
  return o;
}

function tube(p, m, pts, r = 0.02, n = 12, s = 8) {
  return mesh(p, new T.TubeGeometry(new T.CatmullRomCurve3(pts), n, r, s, false), m);
}

function lathe(p, m, path, seg = 72) {
  return mesh(p, new T.LatheGeometry(path.map((q) => new T.Vector2(...q)), seg), m);
}

function ring(p, m, r, minor, h) {
  let o = mesh(p, new T.TorusGeometry(r, minor, 8, 90), m, 0, h);
  o.rotation.x = PI / 2;
  return o;
}

function tex(c) {
  const t = new T.CanvasTexture(c);
  t.colorSpace = T.SRGBColorSpace;
  t.wrapS = t.wrapT = T.RepeatWrapping;
  t.anisotropy = Math.min(renderer.capabilities.getMaxAnisotropy(), 8);
  return t;
}

function sheet(w, h) {
  const c = document.createElement("canvas");
  c.width = w;
  c.height = h;
  return c;
}
const noiseGrid = Float32Array.from({ length: 65536 }, texRand);
function noise(x, y) {
  let a = Math.floor(x), b = Math.floor(y), u = smooth(x - a), v = smooth(y - b);
  let at = (i, j) => noiseGrid[(i & 255) + ((j & 255) << 8)];
  return mix(mix(at(a, b), at(a + 1, b), u), mix(at(a, b + 1), at(a + 1, b + 1), u), v);
}

function wood(board2) {
  const c = sheet(16, 16), ctx = c.getContext("2d");
  ctx.fillStyle = board2 ? "#c99c67" : "#cfb698";
  ctx.fillRect(0, 0, 16, 16);
  const map = tex(c), img = new Image();
  img.onload = () => {
    map.image = img;
    map.needsUpdate = true;
  };
  img.src = woodGrainImages[board2 ? 1 : 0];
  return map;
}

function grainMap() {
  let c = sheet(256, 256), ctx = c.getContext("2d"), im = ctx.createImageData(256, 256);
  for (let i = 0; i < im.data.length; i += 4) {
    let q = 238 + texRand() * 17;
    im.data[i] = im.data[i + 1] = im.data[i + 2] = q;
    im.data[i + 3] = 255;
  }
  ctx.putImageData(im, 0, 0);
  return tex(c);
}
const grain = grainMap(), oak = wood(false), beech = wood(true);
const metal = mat("#dae0dc", 0.24, { metalness: 0.91 }), darkMetal = mat("#717775", 0.4, { metalness: 0.84 }), enamel = mat("#f4ead4", 0.3, { map: grain }), cream = mat("#f2dbad", 0.73), green = mat("#407135", 0.45);
function illumination() {
  let c = sheet(512, 256), ct = c.getContext("2d");
  let g = ct.createLinearGradient(0, 0, 0, 256);
  g.addColorStop(0, "#fdf9e9");
  g.addColorStop(0.45, "#bab6a8");
  g.addColorStop(0.53, "#897b62");
  g.addColorStop(1, "#93785a");
  ct.fillStyle = g;
  ct.fillRect(0, 0, 512, 256);
  ct.fillStyle = "#fffbed";
  ct.fillRect(32, 48, 123, 71);
  ct.fillRect(162, 48, 75, 71);
  ct.fillStyle = "#494b49";
  ct.fillRect(298, 93, 60, 36);
  ct.fillStyle = "#fffaec";
  ct.fillRect(356, 78, 35, 62);
  let e = new T.CanvasTexture(c);
  e.mapping = T.EquirectangularReflectionMapping;
  e.colorSpace = T.SRGBColorSpace;
  scene.environment = e;
  scene.environmentIntensity = 0.42;
  scene.add(new T.HemisphereLight(16775144, 12953984, 1.35));
  const sun2 = new T.DirectionalLight(16773845, 3.25);
  sun2.position.set(-5, 9, -4);
  sun2.castShadow = true;
  sun2.shadow.mapSize.set(2048, 2048);
  Object.assign(sun2.shadow.camera, { left: -8, right: 8, top: 11, bottom: -8, near: 0.1, far: 34 });
  sun2.shadow.normalBias = 0.012;
  sun2.shadow.bias = -35e-5;
  sun2.shadow.radius = 3;
  scene.add(sun2);
  return sun2;
}
const sun = illumination();
function rounded(p, w, d, h, r, m) {
  let s = new T.Shape();
  s.moveTo(-w / 2 + r, -d / 2);
  s.lineTo(w / 2 - r, -d / 2);
  s.quadraticCurveTo(w / 2, -d / 2, w / 2, -d / 2 + r);
  s.lineTo(w / 2, d / 2 - r);
  s.quadraticCurveTo(w / 2, d / 2, w / 2 - r, d / 2);
  s.lineTo(-w / 2 + r, d / 2);
  s.quadraticCurveTo(-w / 2, d / 2, -w / 2, d / 2 - r);
  s.lineTo(-w / 2, -d / 2 + r);
  s.quadraticCurveTo(-w / 2, -d / 2, -w / 2 + r, -d / 2);
  let g = new T.ExtrudeGeometry(s, { depth: h, bevelEnabled: true, bevelSegments: 3, bevelSize: 0.045, bevelThickness: 0.04, curveSegments: 10 });
  g.rotateX(-PI / 2);
  const uv = g.attributes.uv, pos = g.attributes.position, n = g.attributes.normal;
  for (let i = 0; i < uv.count; i++) uv.setXY(i, pos.getX(i) / w + 0.5, (Math.abs(n.getY(i)) > 0.5 ? pos.getZ(i) / d : pos.getY(i) / d) + 0.5);
  return mesh(p, g, m);
}
/* Consolidate small solid details while retaining vertex colours, texture coordinates and normals. */
function batches(root) {
  root.updateWorldMatrix(true, true);
  const inv = root.matrixWorld.clone().invert(), by = new Map();
  root.traverse((o) => {
    if (!o.isMesh || o.isInstancedMesh || Array.isArray(o.material)) return;
    let b = by.get(o.material);
    if (!b) {
      b = { position: [], normal: [], uv: [], color: [], index: [] };
      by.set(o.material, b);
    }
    let g = o.geometry, ps = g.attributes.position, ns = g.attributes.normal, uv = g.attributes.uv, cs = g.attributes.color, off = b.position.length / 3, mx = inv.clone().multiply(o.matrixWorld), nm = new T.Matrix3().getNormalMatrix(mx), v = v3();
    for (let i = 0; i < ps.count; i++) {
      v.fromBufferAttribute(ps, i).applyMatrix4(mx);
      b.position.push(v.x, v.y, v.z);
      v.fromBufferAttribute(ns, i).applyNormalMatrix(nm);
      b.normal.push(v.x, v.y, v.z);
      b.uv.push(uv ? uv.getX(i) : 0, uv ? uv.getY(i) : 0);
      if (cs) b.color.push(cs.getX(i), cs.getY(i), cs.getZ(i));
    }
    for (let i = 0; i < (g.index ? g.index.count : ps.count); i++) b.index.push(off + (g.index ? g.index.getX(i) : i));
  });
  const out = [];
  for (const [m, b] of by) {
    let g = new T.BufferGeometry();
    for (let [k, size] of [["position", 3], ["normal", 3], ["uv", 2], ["color", 3]]) if (b[k].length) g.setAttribute(k, new T.Float32BufferAttribute(b[k], size));
    g.setIndex(b.index);
    out.push([g, m]);
  }
  return out;
}

function combine(p) {
  let list = batches(p);
  p.clear();
  for (let [g, m] of list) mesh(p, g, m);
  return p;
}
const topWood = mat("#ffffff", 0.76, { map: oak, bumpMap: oak, bumpScale: 0.027 }), boardWood = mat("#ffffff", 0.59, { map: beech, bumpMap: beech, bumpScale: 0.023 });
const tableTop = box(scene, topWood, 0, -0.2, -2, 35, 0.36, 36);
oak.repeat.set(2.7, 4.6);
const board = grp(scene);
rounded(board, 5.94, 5.45, 0.205, 0.33, boardWood);
board.position.y = 0.062;
board.rotation.y = -0.095;
function shadeTexture() {
  let c = sheet(128, 128), ctx = c.getContext("2d"), g = ctx.createRadialGradient(64, 64, 1, 64, 64, 64);
  g.addColorStop(0, "rgba(54,32,16,.35)");
  g.addColorStop(0.55, "rgba(55,32,17,.22)");
  g.addColorStop(1, "rgba(55,32,17,0)");
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, 128, 128);
  return tex(c);
}
const shadeTex = shadeTexture();
function contact(p, x, y, z, w, d, opacity = 0.55) {
  let m = new T.MeshBasicMaterial({ map: shadeTex, transparent: true, opacity, depthWrite: false, polygonOffset: true, polygonOffsetFactor: -1 });
  let o = mesh(p, new T.PlaneGeometry(w, d), m, x, y, z);
  o.rotation.x = -PI / 2;
  o.castShadow = o.receiveShadow = false;
  return o;
}
contact(board, 0.09, -0.061, 0.13, 7.25, 6.7, 0.75);
/* A woven, folded blue tea towel. The hem and the weave follow the cloth geometry. */
function cloth() {
  let c = sheet(512, 512), ct = c.getContext("2d");
  ct.fillStyle = "#e9e6d6";
  ct.fillRect(0, 0, 512, 512);
  for (let i of [18, 24, 35, 52, 178, 184, 195, 212, 338, 344, 355, 372, 498]) {
    ct.fillStyle = i % 2 ? "#547a85" : "#70919a";
    ct.fillRect(i, 0, i % 2 ? 9 : 3, 512);
  }
  for (let i = 0; i < 512; i += 2) {
    ct.fillStyle = i % 4 ? "#ffffff1f" : "#3434260f";
    ct.fillRect(0, i, 512, 1);
    ct.fillRect(i, 0, 1, 512);
  }
  let t = tex(c);
  t.repeat.set(1.25, 1.8);
  let m = mat("#ffffff", 0.93, { map: t, side: T.DoubleSide, bumpMap: t, bumpScale: 0.018 });
  let o = grp(scene);
  for (let layer = 0; layer < 2; layer++) {
    let w = layer ? 2.42 : 2.7, d = 6.4, g = new T.PlaneGeometry(w, d, 32, 60);
    g.rotateX(-PI / 2);
    let p = g.attributes.position;
    for (let i = 0; i < p.count; i++) {
      let x = p.getX(i), z = p.getZ(i);
      let f = 0.035 * sin(x * 9 + 0.4 * z) + 0.018 * sin(z * 5 + x) + 0.025 * cos(x * 5 - z * 0.6);
      p.setXYZ(i, x + 0.035 * sin(z * 2) + layer * 0.04, 0.075 + layer * 0.046 + f + (x / w + 0.5) * 0.037 * sin(z * 2.1), z + 0.04 * sin(x * 3));
    }
    g.computeVertexNormals();
    mesh(o, g, m);
  }
  o.rotation.y = 0.29;
  return o;
}
const towel = cloth();
const glazeColors = { sauce: "#a54730", cheese: "#e4cba2", pepper: "#788c71", corn: "#477278", sausage: "#607b88", tomato: "#b28371" };
function bowl(type, r) {
  let p = grp(scene), glaze = mat(glazeColors[type], 0.3, { map: grain }), inside = mat(type === "sauce" ? "#f1d5b0" : "#f0e5cd", 0.34, { map: grain }), line = mat(type === "corn" ? "#acc3b6" : "#f5e6cd", 0.37);
  let h = r * 0.66;
  lathe(p, glaze, [[1e-3, 0.032], [r * 0.45, 0.032], [r * 0.49, 0.065], [r * 0.52, 0.12], [r * 0.69, h * 0.35], [r * 0.87, h * 0.59], [r * 0.985, h * 0.9], [r, h], [r * 0.988, h + 0.027], [r * 0.95, h + 0.029]]);
  lathe(p, inside, [[r * 0.953, h + 0.032], [r * 0.934, h - 0.015], [r * 0.87, h * 0.77], [r * 0.74, h * 0.53], [r * 0.54, h * 0.34], [r * 0.29, h * 0.26], [1e-3, h * 0.235]]);
  ring(p, inside, r * 0.977, 0.022, h + 0.024);
  ring(p, line, r * 0.939, 0.011, h * 0.83);
  ring(p, glaze, r * 0.93, 9e-3, h - 0.032);
  if (type === "corn" || type === "sausage") ring(p, line, r * 0.905, 8e-3, h * 0.745);
  return { p, r, h };
}
const skin = mat("#a64e35", 0.42), meat = mat("#d28c75", 0.6), fat = mat("#eac0a1", 0.61), spice = mat("#944d3d", 0.62), pepGreen = mat("#498421", 0.33), pepCut = mat("#8ebc40", 0.52), pepInner = mat("#aec86a", 0.61);
const tomatoRed = mat("#c8341e", 0.3), tomatoFlesh = mat("#e65633", 0.44), tomatoGel = mat("#ad3520", 0.23), seed = mat("#eab65d", 0.46), cornGold = mat("#f6bd29", 0.4), cornLight = mat("#ffda52", 0.39), cheeseMat = mat("#ffe6a0", 0.61), cheesePale = mat("#fff0c0", 0.62), sauceMat = mat("#b32c16", 0.34), sauceLight = mat("#d44a22", 0.34), herb = mat("#526337", 0.73);
function surface(p, m, rows, cols, fn) {
  let vs = [], us = [], ix = [];
  for (let i = 0; i <= rows; i++) for (let j = 0; j <= cols; j++) {
    let q = fn(i / rows, j / cols);
    vs.push(q[0], q[1], q[2]);
    us.push(j / cols, i / rows);
    if (i && j) {
      let k = i * (cols + 1) + j;
      ix.push(k - cols - 2, k - 1, k, k - cols - 2, k, k - cols - 1);
    }
  }
  let g = new T.BufferGeometry();
  g.setAttribute("position", new T.Float32BufferAttribute(vs, 3));
  g.setAttribute("uv", new T.Float32BufferAttribute(us, 2));
  g.setIndex(ix);
  g.computeVertexNormals();
  return mesh(p, g, m);
}

function pepperModel() {
  let g = grp(), phase = rr(0, TAU), ph = rr(0, TAU);
  const rad = (a) => 0.33 + 0.028 * cos(3 * a + phase) + 0.018 * sin(4 * a + ph) + 0.012 * sin(2 * a + ph);
  const thick = (a) => 0.062 + 0.015 * cos(3 * a + phase + 0.45);
  g.userData.contour = { phase, ph };
  function shape(t, a) {
    let angle = t * TAU, r = rad(a) + cos(angle) * thick(a), y = 0.078 + 0.063 * sin(angle) + 0.017 * cos(3 * a + ph);
    return [r * cos(a), y, r * sin(a) * 0.94];
  }
  for (let [start, end, m] of [[-0.125, 0.125, pepGreen], [0.125, 0.46, pepCut], [0.46, 0.64, pepInner], [0.64, 0.875, pepGreen]]) {
    m.side = T.DoubleSide;
    surface(g, m, 6, 56, (u, v) => shape(mix(start, end, u), v * TAU));
  }
  return combine(g);
}

function sausageModel() {
  let g = grp();
  let o = lathe(g, skin, [[1e-3, 0], [0.21, 0], [0.24, 0.025], [0.249, 0.1], [0.237, 0.13], [1e-3, 0.13]], 40);
  o.scale.x = 1.38;
  let face = oval(g, meat, 0, 0.128, 0, 0.32, 0.019, 0.229);
  for (let i = 0; i < 24; i++) {
    let a = rr(0, TAU), r = Math.sqrt(Math.random());
    let q = oval(g, i % 4 ? fat : spice, cos(a) * r * 0.294, 0.145 - r * r * 8e-3, sin(a) * r * 0.209, rr(8e-3, 0.026), 4e-3, rr(6e-3, 0.017));
    q.rotation.y = rr(0, PI);
  }
  return combine(g);
}

function tomatoModel() {
  let g = grp(), w = rr(0.26, 0.3);
  let o = lathe(g, tomatoRed, [[1e-4, 1e-3], [w * 0.36, 0.015], [w * 0.7, 0.072], [w * 0.9, 0.15], [w, 0.23], [w * 0.99, 0.255], [1e-3, 0.256]], 42);
  o.scale.z = 0.93;
  oval(g, tomatoFlesh, 0, 0.252, 0, w * 0.97, 0.016, w * 0.9);
  let n = 3;
  for (let k = 0; k < n; k++) {
    let a = k * TAU / n + 0.2;
    let x = 0.128 * cos(a), z = 0.124 * sin(a);
    let q = oval(g, tomatoGel, x, 0.264, z, 0.133, 9e-3, 0.088);
    q.rotation.y = -a + PI / 2;
    for (let j = 0; j < 5; j++) {
      let b = (j - 2) * 0.46;
      let px = cos(a + b) * rr(0.137, 0.18), pz = sin(a + b) * rr(0.137, 0.18);
      let l = oval(g, seed, px, 0.275, pz, 0.029, 7e-3, 0.013);
      l.rotation.y = -a - b;
    }
  }
  return combine(g);
}

function kernelModel() {
  let g = grp();
  let o = lathe(g, cornGold, [[2e-3, 2e-3], [0.057, 5e-3], [0.078, 0.024], [0.099, 0.085], [0.096, 0.115], [0.076, 0.137], [0.034, 0.145], [1e-3, 0.14]], 14);
  o.scale.z = 0.76;
  oval(g, cornLight, 0, 0.126, 3e-3, 0.077, 0.023, 0.058);
  return combine(g);
}

function shredGeom() {
  let g = new T.CapsuleGeometry(0.035, 0.18, 3, 6);
  g.rotateZ(PI / 2);
  let p = g.attributes.position;
  for (let i = 0; i < p.count; i++) {
    let x = p.getX(i), y = p.getY(i), z = p.getZ(i);
    p.setXYZ(i, x, y * 0.65 + 0.024 + 0.012 * cos(x * 16), z * 0.77 + 0.011 * sin(x * 13));
  }
  g.computeVertexNormals();
  return g;
}
const shred = shredGeom(), variants = { pepper: [], sausage: [], tomato: [], corn: [] };
for (let i = 0; i < 5; i++) {
  variants.pepper.push(pepperModel());
  variants.sausage.push(sausageModel());
  variants.tomato.push(tomatoModel());
  variants.corn.push(kernelModel());
}

function ingredient(type, variant) {
  return variants[type][variant ?? Math.floor(rr(0, 5))].clone();
}

function fillBowl(b, type) {
  let { p, r, h } = b;
  let fill = grp(p);
  if (type === "sauce") {
    let m = sauceMat;
    let disk = surface(fill, m, 26, 80, (u, v) => {
      let a = -v * TAU, rad = (2e-3 + u * 0.894) * r;
      return [rad * cos(a), h * 0.789 + 0.029 * sin(u * 30 + a * 1.8) * u + 0.017 * noise(rad * cos(a) * 10, rad * sin(a) * 10), rad * sin(a)];
    });
    m.side = T.DoubleSide;
    for (let i = 0; i < 85; i++) {
      let a = rr(0, TAU), rad = r * 0.84 * Math.sqrt(Math.random());
      let o = oval(fill, i % 9 === 0 ? herb : i % 3 ? sauceLight : tomatoGel, rad * cos(a), h * 0.808 + 0.02 * sin(rad / r * 33 + a * 1.8), rad * sin(a), rr(8e-3, 0.046), rr(2e-3, 9e-3), rr(7e-3, 0.027));
      o.rotation.y = a;
    }
  } else if (type === "cheese") {
    for (let i = 0; i < 260; i++) {
      let a = rr(0, TAU), d = r * 0.84 * Math.sqrt(Math.random());
      let q = mesh(fill, shred, i % 3 ? cheeseMat : cheesePale, cos(a) * d, h * 0.76 + 0.26 * (1 - (d / r) ** 2) + rr(-0.05, 0.1), sin(a) * d);
      q.rotation.set(rr(-0.6, 0.6), rr(0, TAU), rr(-0.55, 0.55));
      q.scale.set(rr(0.8, 1.55), rr(0.85, 1.5), rr(0.95, 1.55));
    }
  } else if (type === "corn") {
    for (let i = 0; i < 100; i++) {
      let a = i * 2.4, d = r * 0.81 * Math.sqrt((i + 0.5) / 100);
      let q = ingredient(type);
      q.scale.setScalar(rr(0.9, 1.15));
      q.position.set(cos(a) * d, h * 0.73 + 0.19 * (1 - d / r) + rr(-0.045, 0.048), sin(a) * d);
      q.rotation.set(rr(-0.5, 0.5), a, rr(-0.4, 0.4));
      fill.add(q);
    }
  } else {
    let count = type === "pepper" ? 9 : type === "tomato" ? 7 : 11;
    for (let i = 0; i < count; i++) {
      let a = i * 2.4 + 0.7, d = (i ? Math.sqrt(i / (count - 1)) : 0) * r * (type === "pepper" ? 0.58 : 0.62);
      let q = ingredient(type);
      let s = type === "tomato" ? 1.04 : rr(0.83, 1.03);
      q.scale.setScalar(s);
      q.position.set(cos(a) * d, h * 0.76 + 0.13 * (1 - d / r) + 0.043 * sin(i * 2), sin(a) * d);
      q.rotation.set(rr(-0.53, 0.53), rr(0, TAU), rr(-0.55, 0.55));
      fill.add(q);
    }
  }
  combine(p);
  contact(p, 0.045, 0.012, 0.055, r * 2.42, r * 2.36, 0.68);
  return b;
}
const bowls = {};
for (let [kind, r] of Object.entries({ sauce: 0.91, cheese: 0.96, pepper: 0.87, corn: 0.76, sausage: 0.84, tomato: 0.84 })) {
  bowls[kind] = fillBowl(bowl(kind, r), kind);
  scene.add(bowls[kind].p);
}

function spoonModel() {
  let g = grp(), m = metal;
  /* Bowl of the spoon is concave on the upper face, with a continuous rolled lip. */
  let o = surface(g, m, 14, 56, (u, v) => {
    let a = -v * TAU, r = 1e-3 + u * 0.999;
    return [cos(a) * 0.232 * r * (1 + 0.1 * sin(a)), 0.087 * r * r, sin(a) * 0.32 * r];
  });
  m.side = T.DoubleSide;
  let pts = [];
  for (let i = 0; i <= 56; i++) {
    let a = i * TAU / 56;
    pts.push(v3(cos(a) * 0.232 * (1 + 0.1 * sin(a)), 0.087, sin(a) * 0.32));
  }
  tube(g, m, pts, 9e-3, 56, 6);
  let h = tube(g, m, [v3(0, 0.08, 0.28), v3(0, 0.12, 0.47), v3(0, 0.19, 0.9), v3(0, 0.22, 1.47)], 0.063, 22, 10);
  h.scale.x = 0.95;
  let cap = oval(g, m, 0, 0.23, 1.47, 0.084, 0.044, 0.15);
  let dip = oval(g, sauceMat, 0, 0.05, 0, 0.19, 0.043, 0.258);
  return combine(g);
}
const spoon = spoonModel();
scene.add(spoon);
function basil() {
  let g = grp(), leaf = mat("#467b34", 0.47, { side: T.DoubleSide }), mid = mat("#7b9a4a", 0.63), stemMat = mat("#698449", 0.7);
  tube(g, stemMat, [v3(0, 0.035, 0.57), v3(0.01, 0.08, 0.13), v3(0.09, 0.1, -0.65)], 0.019);
  for (let i = 0; i < 7; i++) {
    let z = 0.38 - Math.floor(i / 2) * 0.31, side = i % 2 ? 1 : -1, len = rr(0.49, 0.71), l = grp(g);
    l.position.set(0.02, 0.09, z);
    l.rotation.y = side * rr(0.75, 1.33);
    l.rotation.z = rr(-0.17, 0.17);
    let width = len * 0.34;
    let form = (u, v) => {
      let w = (v - 0.5) * 2;
      return [w * width * Math.pow(sin(u * PI), 0.84) * (1 + 0.033 * sin(u * 38)), 0.105 * sin(u * PI) * (1 - 0.72 * Math.abs(w)) + 0.054 * u, -len * u];
    };
    surface(l, leaf, 20, 9, form);
    let pts = [];
    for (let j = 0; j < 8; j++) {
      let q = form(j / 7, 0.5);
      pts.push(v3(q[0], q[1] + 4e-3, q[2]));
    }
    tube(l, mid, pts, 6e-3, 12, 4);
    for (let j = 1; j < 5; j++) for (let s of [-1, 1]) {
      let u = j * 0.145;
      let a = form(u, 0.5), b = form(u + 0.1, 0.5 + s * 0.28), c = form(u + 0.16, 0.5 + s * 0.44);
      tube(l, mid, [a, b, c].map((q) => v3(q[0], q[1] + 3e-3, q[2])), 26e-4, 5, 3);
    }
  }
  return combine(g);
}
const sprig = basil();
scene.add(sprig);
function wholeTomatoes() {
  let g = grp();
  for (let i = 0; i < 3; i++) {
    let x = i * 0.385, z = 0.17 * sin(i * 2.6), r = rr(0.215, 0.268);
    oval(g, tomatoRed, x, r * 0.86, z, r, r * 0.88, r * 0.96);
    for (let j = 0; j < 5; j++) {
      let a = j * TAU / 5;
      let l = oval(g, green, x + 0.072 * cos(a), r * 1.71, z + 0.072 * sin(a), 0.1, 0.014, 0.023);
      l.rotation.y = -a;
    }
    tube(g, green, [v3(x, r * 1.71, z), v3(x + 0.04, r * 1.85, z - 0.03), v3(x + 0.11, r * 1.9, z - 0.08)], 0.014, 6, 5);
  }
  return combine(g);
}
const cherryVine = wholeTomatoes();
scene.add(cherryVine);
/* Flour and little pinches of semolina on the work board. */
{
  let p = grp(board), flour = mat("#efe1c8", 0.98), semolina = mat("#d1b78c", 0.91), dustGeo = new T.IcosahedronGeometry(1, 0);
  for (let i = 0; i < 950; i++) {
    let x = rr(-2.87, 2.87), z = rr(-2.57, 2.57), r = Math.hypot(x, z);
    if (r < 2.38 || noise(x * 1.2 + 12, z * 1.5) < 0.36) continue;
    let o = mesh(p, dustGeo, i % 6 ? flour : semolina, x, 0.25, z);
    let s = rr(25e-4, 0.012);
    o.scale.set(s * 1.5, s * 0.4, s);
  }
  combine(p);
}
