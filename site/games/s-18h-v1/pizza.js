"use strict";
const R = 2.36, N = 101, gridStep = 2 * R / (N - 1), baseY = 0.317;
const tray = grp(scene), meal = grp(tray);
tray.position.y = baseY;
const panMetal = mat("#8c9190", 0.36, { metalness: 0.83 }), panRim = mat("#c0c4c0", 0.29, { metalness: 0.9 });
lathe(tray, panMetal, [[1e-3, 3e-3], [2.4, 3e-3], [2.51, 0.027], [2.57, 0.067], [2.575, 0.089], [2.54, 0.105], [2.49, 0.08], [2.4, 0.057], [1e-3, 0.057]], 128);
ring(tray, panRim, 2.55, 0.022, 0.092);
contact(tray, 0.03, -9e-3, 0.035, 5.75, 5.75, 0.85);
const surfaceMat = mat("#ffffff", 0.75, { vertexColors: true, side: T.DoubleSide });
surfaceMat.onBeforeCompile = (shader) => {
  shader.fragmentShader = shader.fragmentShader.replace("#include <roughnessmap_fragment>", "#include <roughnessmap_fragment>\nroughnessFactor*=1.-.55*smoothstep(.54,.85,1.-vColor.g/max(vColor.r,.001));");
};
const doughDetail = (() => {
  let c = sheet(512, 512), ct = c.getContext("2d"), d = ct.createImageData(512, 512);
  for (let y = 0; y < 512; y++) for (let x = 0; x < 512; x++) {
    let n = noise(x * 0.045, y * 0.045), q = 245 + 9 * (n - 0.5) + 7 * (texRand() - 0.5);
    let k = (y * 512 + x) * 4;
    d.data[k] = q;
    d.data[k + 1] = q;
    d.data[k + 2] = q;
    d.data[k + 3] = 255;
  }
  ct.putImageData(d, 0, 0);
  for (let i = 0; i < 4300; i++) {
    let x = texRand() * 512, y = texRand() * 512, r = 0.12 + 0.57 * texRand();
    ct.fillStyle = i % 4 ? "rgba(116,84,46,.30)" : "rgba(255,255,250,.8)";
    ct.beginPath();
    ct.ellipse(x, y, r * 1.4, r, texRand() * PI, 0, TAU);
    ct.fill();
  }
  return tex(c);
})();
surfaceMat.map = doughDetail;
surfaceMat.bumpMap = doughDetail;
surfaceMat.bumpScale = 0.024;
const doughPale = col("#f0d6a2"), doughGold = col("#d5a76e"), bakedGold = col("#c9853c"), bakedDark = col("#914d25"), redDeep = col("#ac2f1b"), redBright = col("#da4a23"), cheeseGold = col("#ffcf69");
let fields, bodyMesh, basePoints = [], foods = [], shreds = [], bubbles = [], pieces = [], fieldDirty = true, mealSeed = 0, meltMesh, cheeseMesh, bakeTime = 0, splitCount = 0;
const strings = [], tailsMat = mat("#ffe9ae", 0.44), crumbMat = mat("#ead0a2", 0.9), cutPep = mat("#a5c75c", 0.61);
const trayOutline = Array.from({ length: 128 }, (_, i) => ({ x: R * cos(i * TAU / 128), z: R * sin(i * TAU / 128) }));
function fieldAt(arr, x, z) {
  let fx = clamp((x + R) / gridStep, 0, N - 1.001), fz = clamp((z + R) / gridStep, 0, N - 1.001), i = Math.floor(fx) + Math.floor(fz) * N;
  return mix(mix(arr[i], arr[i + 1], fx % 1), mix(arr[i + N], arr[i + N + 1], fx % 1), fz % 1);
}

function brush(x, z, r, fn) {
  let a = Math.max(0, Math.floor((x - r + R) / gridStep)), b = Math.min(N - 1, Math.ceil((x + r + R) / gridStep)), c = Math.max(0, Math.floor((z - r + R) / gridStep)), d = Math.min(N - 1, Math.ceil((z + r + R) / gridStep));
  for (let j = c; j <= d; j++) for (let i = a; i <= b; i++) {
    let dx = i * gridStep - R - x, dz = j * gridStep - R - z, t = Math.hypot(dx, dz) / r;
    if (t < 1) fn(i + j * N, t, dx, dz);
  }
  fieldDirty = true;
}

function edgeRadius(a) {
  return R * (1 + 0.01 * sin(3 * a + mealSeed) + 8e-3 * sin(7 * a - 0.4) + 4e-3 * cos(14 * a + mealSeed));
}

function rawHeight(x, z) {
  let a = Math.atan2(z, x), r = Math.hypot(x, z) / edgeRadius(a), w = noise(x * 2.3 + mealSeed, z * 2.3 + 7);
  return 0.225 + 0.028 * (w - 0.5) + 0.01 * sin(x * 5 + z * 3) + (0.109 + 0.025 * sin(5 * a) + 0.04 * (noise(x * 4, z * 4) - 0.5)) * Math.exp(-((r - 0.901) ** 2) / 56e-4) - 0.085 * smooth(clamp((r - 0.962) / 0.038));
}

function heightAt(x, z) {
  return rawHeight(x, z) + 0.08 * fieldAt(fields.sauce, x, z) + 0.04 * fieldAt(fields.heat, x, z) * Math.exp(-((Math.hypot(x, z) / R - 0.9) ** 2) / 0.018);
}

function makeDough() {
  let ps = [], cs = [], uv = [], ix = [], radial = 74, angular = 192;
  const topRows = radial + 1;
  basePoints = [];
  for (let j = 0; j <= radial + 3; j++) for (let i = 0; i <= angular; i++) {
    let a = -TAU * i / angular, r = j <= radial ? j / radial : j === radial + 1 ? 1.002 : j === radial + 2 ? 0.986 : 5e-4;
    let x = cos(a) * edgeRadius(a) * r, z = sin(a) * edgeRadius(a) * r, y = j < topRows ? rawHeight(x, z) : j === radial + 1 ? 0.115 : 0.072;
    ps.push(x, y, z);
    uv.push(x / (2 * R) + 0.5, z / (2 * R) + 0.5);
    cs.push(1, 1, 1);
    let n = noise(8 + x * 3 + mealSeed, z * 3), rough = noise(x * 12 + 3, z * 12);
    basePoints.push({ x, z, y, r, face: j < topRows, n, rough, shade: clamp(0.1 + 0.2 * n + 0.19 * rough + 0.22 * Math.exp(-((r - 0.95) ** 2) / 2e-3) + 0.08 * sin(x * 6 + z)) });
    if (i && j) {
      let k = j * (angular + 1) + i;
      ix.push(k - angular - 2, k - 1, k, k - angular - 2, k, k - angular - 1);
    }
  }
  let g = new T.BufferGeometry();
  g.setAttribute("position", new T.Float32BufferAttribute(ps, 3));
  g.setAttribute("color", new T.Float32BufferAttribute(cs, 3));
  g.setAttribute("uv", new T.Float32BufferAttribute(uv, 2));
  g.setIndex(ix);
  g.computeVertexNormals();
  return mesh(meal, g, surfaceMat);
}

function paintSurface() {
  if (!fieldDirty) return;
  fieldDirty = false;
  let geo = bodyMesh.geometry, p = geo.attributes.position, c = geo.attributes.color, vc = new T.Color(), red = new T.Color();
  for (let i = 0; i < basePoints.length; i++) {
    let q = basePoints[i], s = q.face ? fieldAt(fields.sauce, q.x, q.z) : 0, h = fieldAt(fields.heat, q.x, q.z), b = fieldAt(fields.brown, q.x, q.z), dent = q.face ? fieldAt(fields.dent, q.x, q.z) : 0, ch = fieldAt(fields.cheese, q.x, q.z);
    let rim = Math.exp(-((q.r - 0.92) ** 2) / 8e-3);
    p.setY(i, q.y + s * 0.082 - dent * 0.045 + h * rim * 0.074 + (q.face ? Math.min(0.06, ch * 0.034) * h : 0));
    vc.copy(doughPale).lerp(doughGold, q.shade).lerp(bakedGold, b * (0.21 + 0.69 * rim)).lerp(bakedDark, b * rim * Math.pow(q.n, 4) * 0.64);
    red.copy(redBright).lerp(redDeep, clamp(0.13 + s * 0.36 + q.n * 0.19 + h * 0.19));
    vc.lerp(red, clamp(s * 5.7) * (1 - 0.06 * q.rough));
    if (q.face) vc.lerp(cheeseGold, clamp(ch * 0.61) * smooth(clamp((h - 0.29) * 2)) * 0.91);
    c.setXYZ(i, vc.r, vc.g, vc.b);
  }
  p.needsUpdate = c.needsUpdate = true;
  geo.computeVertexNormals();
}

function sauceDrop(x, z) {
  brush(x, z, 0.41, (i, t) => fields.sauce[i] = Math.min(1.8, fields.sauce[i] + 1.34 * (1 - smooth(t))));
}

function spread(x, z, px, pz, load) {
  let dx = x - px, dz = z - pz, dist = Math.hypot(dx, dz), steps = Math.max(1, Math.ceil(dist / 0.052));
  let left = load;
  for (let n = 1; n <= steps; n++) {
    let xx = mix(px, x, n / steps), zz = mix(pz, z, n / steps);
    if (Math.hypot(xx, zz) > R - 0.085) continue;
    let avail = fieldAt(fields.sauce, xx, zz);
    let width = 0.17 + 0.145 * clamp(left + avail * 0.29);
    let d = Math.min(0.075, dist / steps);
    brush(xx, zz, width, (i, t) => {
      let core = 1 - smooth(t), ridge = Math.exp(-((t - 0.78) ** 2) / 0.014);
      let old = fields.sauce[i];
      let swept = Math.min(old, 0.62) * core * d * 3.3;
      fields.sauce[i] = clamp(old - swept + ridge * (left * 0.55 + avail * 0.64) * d * 3 + core * left * d * 0.55, 0, 1.7);
      fields.dent[i] = Math.max(fields.dent[i], core * 0.68);
    });
    left = Math.max(0, left - d * 0.055);
  }
  return left;
}

function makeCheeseMesh() {
  let m = new T.InstancedMesh(shred, cheesePale, 1400);
  m.instanceMatrix.setUsage(T.DynamicDrawUsage);
  m.count = 0;
  m.castShadow = m.receiveShadow = true;
  m.frustumCulled = false;
  meal.add(m);
  return m;
}
const instDummy = new T.Object3D();
function addShred(x, z) {
  if (shreds.length >= cheeseMesh.instanceMatrix.count || Math.hypot(x, z) > R - 0.06) return;
  let s = { x, z, a: rr(0, PI), len: rr(0.72, 1.63), w: rr(0.72, 1.26), roll: rr(-0.35, 0.35), h: heightAt(x, z) + Math.min(0.17, fieldAt(fields.cheese, x, z) * 0.065), drop: 0.25, heat: 0 };
  shreds.push(s);
  brush(x, z, 0.2, (i, t) => fields.cheese[i] += 0.235 * (1 - t));
  cheeseMesh.setColorAt(shreds.length - 1, col(Math.random() < 0.4 ? "#fff0c2" : "#ffe69d"));
  cheeseMesh.count = shreds.length;
  cheeseMesh.instanceColor.needsUpdate = true;
}

function cheeseMatrices(dt) {
  let changed = false;
  for (let i = 0; i < shreds.length; i++) {
    let s = shreds[i];
    if (s.drop <= 0 && s.heat === bakeTime) continue;
    changed = true;
    s.drop = Math.max(0, s.drop - dt * 1.4);
    s.heat = bakeTime;
    let density = fieldAt(fields.cheese, s.x, s.z), h = clamp((fieldAt(fields.heat, s.x, s.z) - 0.08 - density * 0.035) * 1.55);
    instDummy.position.set(s.x, mix(s.h, heightAt(s.x, s.z) + 0.019 + Math.min(0.075, density * 0.021), h) + s.drop, s.z);
    instDummy.rotation.set(0, s.a, s.roll * (1 - h));
    instDummy.scale.set(s.len * (1 + 0.1 * h), 1 - 0.45 * h, s.w * (1 + 1.17 * h));
    instDummy.updateMatrix();
    cheeseMesh.setMatrixAt(i, instDummy.matrix);
  }
  if (changed) cheeseMesh.instanceMatrix.needsUpdate = true;
}

function localFoodPoint(f, x, z) {
  let dx = x - f.x, dz = z - f.z;
  return { x: (cos(f.yaw) * dx - sin(f.yaw) * dz) / f.s, z: (sin(f.yaw) * dx + cos(f.yaw) * dz) / f.s };
}

function ringProfile(f, q) {
  let a = Math.atan2(q.z / 0.94, q.x), { phase, ph } = f.obj.userData.contour;
  let r = 0.33 + 0.028 * cos(3 * a + phase) + 0.018 * sin(4 * a + ph) + 0.012 * sin(2 * a + ph);
  let width = 0.062 + 0.015 * cos(3 * a + phase + 0.45);
  return { r, width, dist: Math.hypot(q.x, q.z / 0.94), a, ph };
}

function supportAt(x, z, exclude) {
  let y = heightAt(x, z), under = "dough", ringAround = null, ch = fieldAt(fields.cheese, x, z);
  if (ch > 0.07) {
    under = "cheese";
    y += Math.min(0.14, ch * 0.066);
  } else if (fieldAt(fields.sauce, x, z) > 0.06) under = "sauce";
  for (let f of foods) {
    if (f === exclude || f.held || exclude && f.order >= exclude.order) continue;
    let q = localFoodPoint(f, x, z), top = null;
    if (f.kind === "pepper") {
      let g = ringProfile(f, q);
      if (g.dist < g.r - g.width) ringAround = f;
      if (Math.abs(g.dist - g.r) <= g.width) {
        let profile = Math.sqrt(Math.max(0, 1 - ((g.dist - g.r) / g.width) ** 2));
        top = 0.078 + 0.063 * profile + 0.017 * cos(3 * g.a + g.ph);
      }
    }
    if (f.kind === "sausage" && Math.hypot(q.x / 0.337, q.z / 0.25) < 1) top = 0.146;
    if (f.kind === "tomato" && Math.hypot(q.x, q.z / 0.93) < 0.272) top = 0.261;
    if (f.kind === "corn" && Math.hypot(q.x / 0.096, q.z / 0.073) < 1) top = 0.125;
    if (top !== null) {
      let h = f.floor + f.s * (top + q.x * Math.sin(f.tiltZ || 0) - q.z * Math.sin(f.tiltX || 0));
      if (h > y) {
        y = h;
        under = f.id;
      }
    }
  }
  return { y, under, ringAround };
}
/* Sample the footprint as well as its centre so a slice can rest across a pepper wall. */
function restingSurface(f) {
  let center2 = supportAt(f.x, f.z, f);
  if (f.kind === "corn") return center2;
  let rx = f.kind === "pepper" ? 0.33 : f.kind === "sausage" ? 0.28 : 0.13, rz = f.kind === "pepper" ? 0.3 : f.kind === "sausage" ? 0.19 : 0.13, samples = [];
  for (let i = 0; i < 8; i++) {
    let a = i * TAU / 8, x = rx * cos(a) * f.s, z = rz * sin(a) * f.s;
    let q = supportAt(f.x + x * cos(f.yaw) + z * sin(f.yaw), f.z - x * sin(f.yaw) + z * cos(f.yaw), f);
    samples.push({ ...q, x, z });
  }
  f.tiltZ = clamp((samples[0].y - samples[4].y) / (rx * 2 * f.s), -0.27, 0.27);
  f.tiltX = clamp((samples[6].y - samples[2].y) / (rz * 2 * f.s), -0.27, 0.27);
  let floor = f.kind === "pepper" ? -Infinity : center2.y, under = center2.under;
  for (let q of samples) {
    let support = q.y - q.x * sin(f.tiltZ) + q.z * sin(f.tiltX);
    if (support > floor) {
      floor = support;
      under = q.under;
    }
  }
  return { y: floor, under, ringAround: null };
}
let foodId = 0, stackOrder = 0;
function placeFood(kind, x, z, old) {
  let obj = old?.obj || ingredient(kind), f = old || { id: ++foodId, kind, obj, s: rr(0.86, 1.15), yaw: rr(0, TAU) };
  if (!old) {
    meal.add(obj);
    foods.push(f);
  } else for (let q of foods) {
    if (q.inside === f.id) q.inside = null;
    if (q.under === f.id) q.reseat = true;
  }
  Object.assign(f, { x, z, order: ++stackOrder, vy: 0, lift: 0.48, vx: 0, vz: 0, age: 0, bounces: 0, roll: rr(-0.18, 0.18), tiltX: 0, tiltZ: 0 });
  let surface = restingSurface(f);
  f.floor = surface.y;
  f.under = surface.under;
  f.inside = surface.ringAround?.id;
  if (kind === "corn") {
    let under = foods.find((a) => a.id === surface.under);
    let dir = under ? Math.atan2(z - under.z, x - under.x) : rr(0, TAU), speed = under?.kind === "pepper" ? 0.78 : under?.kind === "sausage" ? 0.36 : surface.ringAround ? 0.39 : 0.23;
    f.vx = cos(dir) * speed;
    f.vz = sin(dir) * speed;
  }
  obj.scale.setScalar(f.s);
  obj.rotation.set(f.tiltX, f.yaw, f.tiltZ, "YXZ");
  obj.position.set(x, f.floor + f.lift, z);
  return f;
}

function rollKernel(f, dt, sup) {
  if (typeof sup.under === "number" && f.lift < 0.07) {
    let d = 0.026;
    f.vx += clamp((supportAt(f.x - d, f.z, f).y - supportAt(f.x + d, f.z, f).y) / (2 * d), -0.9, 0.9) * dt * 2.2;
    f.vz += clamp((supportAt(f.x, f.z - d, f).y - supportAt(f.x, f.z + d, f).y) / (2 * d), -0.9, 0.9) * dt * 2.2;
  }
  let xx = f.x + f.vx * dt, zz = f.z + f.vz * dt, inner = foods.find((q) => q.id === f.inside);
  if (inner && !inner.held) {
    let local = localFoodPoint(inner, xx, zz), p = ringProfile(inner, local), limit = p.r - p.width - 0.071 * f.s / inner.s;
    if (p.dist > limit && p.dist < 0.45) {
      let dx = xx - inner.x, dz = zz - inner.z, len = Math.hypot(dx, dz) || 1, nx = dx / len, nz = dz / len, dot = f.vx * nx + f.vz * nz;
      if (dot > 0) {
        f.vx -= 1.38 * dot * nx;
        f.vz -= 1.38 * dot * nz;
      }
      xx = inner.x + dx * limit / p.dist;
      zz = inner.z + dz * limit / p.dist;
    }
  }
  if (Math.hypot(xx, zz) < R - 0.07) {
    f.x = xx;
    f.z = zz;
  }
  let friction = Math.exp(-dt * (1.7 + 6 * fieldAt(fields.sauce, f.x, f.z)));
  f.vx *= friction;
  f.vz *= friction;
}

function foodPhysics(dt) {
  for (let f of foods) {
    if (f.held) continue;
    f.age += dt;
    if (f.lift <= 0 && f.age >= 1.65 && !f.reseat) continue;
    f.vy -= dt * 6.2;
    f.lift += f.vy * dt;
    let sup = restingSurface(f), old = f.floor;
    f.floor = mix(old, sup.y, clamp(dt * 16));
    f.under = sup.under;
    if (f.lift <= 0) {
      if (f.vy < -0.39 && f.bounces < 2) {
        f.vy = -f.vy * (f.kind === "corn" ? 0.38 : 0.17);
        f.bounces++;
        if (f.age < 1) sound("drop", 0.3);
      } else f.vy = 0;
      f.lift = 0;
    }
    if (f.kind === "corn" && f.age > 0.23) rollKernel(f, dt, sup);
    f.obj.position.set(f.x, f.floor + Math.max(0, f.lift), f.z);
    f.obj.rotation.set(f.tiltX + f.roll * Math.exp(-4 * f.age) * sin(f.age * 24), f.yaw, f.tiltZ + f.roll * 0.13 + f.lift * 0.21, "YXZ");
    f.reseat = Math.abs(old - sup.y) > 5e-3;
  }
}

function warmFields(t) {
  bakeTime = t;
  let tomatoes = foods.filter((f) => f.kind === "tomato");
  for (let j = 0; j < N; j++) for (let i = 0; i < N; i++) {
    let k = j * N + i, x = i * gridStep - R, z = j * gridStep - R, edge = Math.hypot(x, z) / R;
    let water = 0;
    for (let f of tomatoes) {
      let d = (x - f.x) ** 2 + (z - f.z) ** 2;
      if (d < 0.49) water = Math.max(water, 1 - d / 0.49);
    }
    let h = clamp(t * (1.13 + 0.16 * edge) - 0.035 * fields.sauce[k] - 0.06 * Math.min(fields.cheese[k], 2) - 0.1 * water);
    fields.heat[k] = h;
    fields.brown[k] = smooth(clamp((h - 0.24) * 1.43));
  }
  fieldDirty = true;
}
/* The liquid surface grows from neighbouring pinches as their local temperatures rise. */
const meltedMat = mat("#ffffff", 0.39, { vertexColors: true, side: T.DoubleSide });
let lastMelt = -1;
function updateMelt(force = false) {
  if (!shreds.length || !force && bakeTime - lastMelt < 0.034) return;
  lastMelt = bakeTime;
  const threshold = 0.13, cache = new Array(N * N), pos = [], colors = [], uv = [], indices = [];
  const milk = col("#ffdf91"), gold = col("#e8b34c"), curd = new T.Color();
  function sample(i, j) {
    let k = i + j * N;
    if (cache[k]) return cache[k];
    let x = i * gridStep - R, z = j * gridStep - R, d = fields.cheese[k], heat = fields.heat[k];
    let connected = smooth(clamp((heat - 0.19 - Math.min(d, 2) * 0.057) * 1.9));
    return cache[k] = { x, z, d: d * connected, h: heightAt(x, z) + 9e-3 + Math.min(0.105, d * 0.043) * connected, heat };
  }
  function crossing(a, b) {
    let t = (threshold - a.d) / (b.d - a.d);
    return { x: mix(a.x, b.x, t), z: mix(a.z, b.z, t), h: mix(a.h, b.h, t) - 8e-3, heat: mix(a.heat, b.heat, t), d: threshold };
  }
  function triangle(a, b, c) {
    if (a.d < threshold && b.d < threshold && c.d < threshold) return;
    let face = [a, b, c], clipped = [];
    for (let i = 0; i < 3; i++) {
      let u = face[i], v = face[(i + 1) % 3];
      if (u.d >= threshold) clipped.push(u);
      if (u.d >= threshold !== v.d >= threshold) clipped.push(crossing(u, v));
    }
    let start = pos.length / 3;
    for (let q of clipped) {
      pos.push(q.x, q.h, q.z);
      uv.push(q.x, q.z);
      let m = noise(12 * q.x + mealSeed, 12 * q.z);
      curd.copy(milk).lerp(gold, clamp(0.12 + 0.42 * (1 - clamp(q.d)) + 0.33 * m * q.heat));
      colors.push(curd.r, curd.g, curd.b);
    }
    for (let j = 1; j < clipped.length - 1; j++) indices.push(start, start + j, start + j + 1);
  }
  for (let j = 0; j < N - 1; j++) for (let i = 0; i < N - 1; i++) {
    let k = i + j * N;
    if (Math.max(fields.cheese[k], fields.cheese[k + 1], fields.cheese[k + N], fields.cheese[k + N + 1]) < threshold) continue;
    let a = sample(i, j), b = sample(i + 1, j), c = sample(i + 1, j + 1), d = sample(i, j + 1);
    triangle(a, d, c);
    triangle(a, c, b);
  }
  if (meltMesh) {
    meltMesh.removeFromParent();
    meltMesh.geometry.dispose();
    meltMesh = null;
  }
  if (!pos.length) return;
  let geo = new T.BufferGeometry();
  geo.setAttribute("position", new T.Float32BufferAttribute(pos, 3));
  geo.setAttribute("normal", new T.Float32BufferAttribute(pos.map((_, i) => i % 3 === 1 ? 1 : 0), 3));
  geo.setAttribute("uv", new T.Float32BufferAttribute(uv, 2));
  geo.setAttribute("color", new T.Float32BufferAttribute(colors, 3));
  geo.setIndex(indices);
  meltMesh = mesh(meal, geo, meltedMat);
}
const bubbleMat = mat("#f4cb70", 0.27), wetMat = mat("#e7ad4f", 0.18);
function buildBubbles() {
  let sorts = shreds.slice().sort((a, b) => fieldAt(fields.cheese, b.x, b.z) - fieldAt(fields.cheese, a.x, a.z));
  for (let s of sorts) {
    let d = fieldAt(fields.cheese, s.x, s.z);
    if (d < 0.44 || bubbles.some((q) => Math.hypot(q.x - s.x, q.z - s.z) < 0.32)) continue;
    newBubble(s.x, s.z, 0.1 + 0.11 * clamp(d / 2), 0.34 + 0.1 * clamp(d), false);
    if (bubbles.length > 48) break;
  }
  for (let f of foods.filter((f2) => f2.kind === "tomato")) for (let i = 0; i < 9; i++) {
    let a = i * TAU / 9;
    newBubble(f.x + 0.29 * cos(a) * f.s, f.z + 0.29 * sin(a) * f.s, rr(0.026, 0.049), rr(0.2, 0.48), true);
  }
  for (let f of foods.filter((f2) => f2.kind === "corn")) {
    let enclosed = [0, 1, 2, 3].every((k) => fieldAt(fields.cheese, f.x + 0.13 * cos(k * PI / 2), f.z + 0.13 * sin(k * PI / 2)) > 0.23);
    if (enclosed) {
      let b = newBubble(f.x, f.z, 0.116, 0.42, false);
      b.grain = f;
    }
  }
}

function newBubble(x, z, r, start, wet) {
  let obj = oval(meal, wet ? wetMat : bubbleMat, x, heightAt(x, z) + 0.042, z, 1e-3, 1e-3, 1e-3);
  let b = { x, z, r, start, obj, phase: rr(0, 0.08) };
  bubbles.push(b);
  return b;
}

function steamBubbles(t) {
  for (let b of bubbles) {
    let p = clamp((t - b.start - b.phase) * 2.55), rise = sin(p * PI);
    b.obj.visible = t > b.start + b.phase;
    const thickness = Math.min(0.105, fieldAt(fields.cheese, b.x, b.z) * 0.043);
    b.obj.position.y = heightAt(b.x, b.z) + 0.015 + thickness * smooth(clamp(t * 1.35));
    b.obj.scale.set(b.r * (0.42 + 0.61 * p), b.r * (0.05 + 0.89 * rise), b.r * (0.39 + 0.58 * p));
    if (b.grain) {
      b.grain.obj.rotation.z = b.grain.roll * 0.16 + rise * 0.35;
      b.grain.obj.position.y = b.grain.floor + rise * 0.082;
    }
  }
}

function makePizza() {
  meal.clear();
  mealSeed = rr(0, 100);
  foods = [];
  shreds = [];
  bubbles = [];
  pieces = [];
  splitCount = 0;
  bakeTime = 0;
  lastMelt = -1;
  meltMesh = null;
  fields = {};
  for (let n of ["sauce", "cheese", "heat", "brown", "dent"]) fields[n] = new Float32Array(N * N);
  bodyMesh = makeDough();
  cheeseMesh = makeCheeseMesh();
  fieldDirty = true;
  paintSurface();
}

function freezePizza() {
  updateMelt(true);
  cheeseMatrices(1);
  paintSurface();
  let tmp = grp(meal);
  const mtx = new T.Matrix4();
  for (let i = 0; i < cheeseMesh.count; i++) {
    cheeseMesh.getMatrixAt(i, mtx);
    let o = mesh(tmp, shred, cheeseMat);
    o.matrix.copy(mtx);
    o.matrixAutoUpdate = false;
  }
  let flat = batches(meal);
  meal.clear();
  const g = grp(meal);
  for (let [geo, m] of flat) mesh(g, geo, m);
  pieces = [{ g, poly: trayOutline.map((p) => {
    let scale = edgeRadius(Math.atan2(p.z, p.x)) / R;
    return { x: p.x * scale, z: p.z * scale };
  }), cuts: [], served: false }];
}

function inside(poly, x, z) {
  let c = false;
  for (let i = 0, j = poly.length - 1; i < poly.length; j = i++) {
    let a = poly[i], b = poly[j];
    if (a.z > z !== b.z > z && x < (b.x - a.x) * (z - a.z) / (b.z - a.z) + a.x) c = !c;
  }
  return c;
}

function center(poly) {
  let x = 0, z = 0, A = 0;
  for (let i = 0; i < poly.length; i++) {
    let a = poly[i], b = poly[(i + 1) % poly.length], k = a.x * b.z - b.x * a.z;
    x += (a.x + b.x) * k;
    z += (a.z + b.z) * k;
    A += k;
  }
  return { x: x / (3 * A), z: z / (3 * A), area: Math.abs(A / 2) };
}

function nearest(poly, x, z) {
  let best = { d: Infinity };
  for (let i = 0; i < poly.length; i++) {
    let a = poly[i], b = poly[(i + 1) % poly.length], dx = b.x - a.x, dz = b.z - a.z, t = clamp(((x - a.x) * dx + (z - a.z) * dz) / (dx * dx + dz * dz || 1)), xx = a.x + t * dx, zz = a.z + t * dz, d = Math.hypot(xx - x, zz - z);
    if (d < best.d) best = { x: xx, z: zz, d };
  }
  return best;
}

function slicePoly(poly, dist) {
  let out = [];
  for (let i = 0; i < poly.length; i++) {
    let a = poly[i], b = poly[(i + 1) % poly.length], da = dist(a), db = dist(b);
    if (da >= 0) out.push(a);
    if (da < 0 !== db < 0) {
      let t = da / (da - db);
      out.push({ x: mix(a.x, b.x, t), z: mix(a.z, b.z, t) });
    }
  }
  return out;
}

function appendTri(out, a, b, c) {
  out.push(...a, ...b, ...c);
}

function interpolate(a, b, t) {
  return a.map((v, i) => mix(v, b[i], t));
}

function makeGeo(data, vc) {
  let g = new T.BufferGeometry(), p = [], n = [], u = [], c = [], stride = 11;
  for (let i = 0; i < data.length; i += stride) {
    p.push(data[i], data[i + 1], data[i + 2]);
    n.push(data[i + 3], data[i + 4], data[i + 5]);
    u.push(data[i + 6], data[i + 7]);
    if (vc) c.push(data[i + 8], data[i + 9], data[i + 10]);
  }
  g.setAttribute("position", new T.Float32BufferAttribute(p, 3));
  g.setAttribute("normal", new T.Float32BufferAttribute(n, 3));
  g.setAttribute("uv", new T.Float32BufferAttribute(u, 2));
  if (vc) g.setAttribute("color", new T.Float32BufferAttribute(c, 3));
  return g;
}

function clipSolid(obj, groups, nx, nz, offset, sections) {
  let g = obj.geometry, attr = g.attributes, ix = g.index, pos = attr.position, ns = attr.normal, uv = attr.uv, cs = attr.color, vs = [], ds = [];
  for (let i = 0; i < pos.count; i++) {
    let x = pos.getX(i), z = pos.getZ(i);
    vs.push([x, pos.getY(i), z, ns.getX(i), ns.getY(i), ns.getZ(i), uv?.getX(i) || 0, uv?.getY(i) || 0, cs?.getX(i) ?? 1, cs?.getY(i) ?? 1, cs?.getZ(i) ?? 1]);
    ds.push(nx * x + nz * z - offset);
  }
  let outputs = [[], []], edges = [];
  for (let i = 0; i < (ix ? ix.count : pos.count); i += 3) {
    let ids = [0, 1, 2].map((j) => ix ? ix.getX(i + j) : i + j), dd = ids.map((j) => ds[j]), vv = ids.map((j) => vs[j]);
    if (dd.every((d) => d >= 0) || dd.every((d) => d <= 0)) {
      appendTri(outputs[dd.every((d) => d >= 0) ? 0 : 1], ...vv);
      continue;
    }
    let side = [[], []], cross = [];
    for (let j = 0; j < 3; j++) {
      let k = (j + 1) % 3;
      side[dd[j] >= 0 ? 0 : 1].push(vv[j]);
      if (dd[j] >= 0 !== dd[k] >= 0) {
        let q = interpolate(vv[j], vv[k], dd[j] / (dd[j] - dd[k]));
        cross.push(q);
        side[0].push(q);
        side[1].push(q);
      }
    }
    if (cross.length === 2) edges.push(cross);
    for (let s = 0; s < 2; s++) for (let j = 1; j < side[s].length - 1; j++) appendTri(outputs[s], side[s][0], side[s][j], side[s][j + 1]);
  }
  for (let s = 0; s < 2; s++) if (outputs[s].length) mesh(groups[s], makeGeo(outputs[s], !!cs), obj.material);
  /* Fill the vertical section between successive pairs of surface crossings. Empty ring centres stay open. */
  if (!edges.length) return;
  const capMaterial = obj.material === surfaceMat ? crumbMat : obj.material === pepGreen || obj.material === pepCut || obj.material === pepInner ? cutPep : obj.material === skin ? meat : obj.material;
  let section = sections.get(capMaterial);
  if (!section) {
    section = [];
    sections.set(capMaterial, section);
  }
  for (let edge of edges) section.push(edge);
}

function closeSection(edges, capM, groups, nx, nz, offset) {
  let projected = edges.map((e) => e.map((q) => ({ t: -nz * q[0] + nx * q[2], y: q[1] }))).map((e) => e.sort((a, b) => a.t - b.t));
  let ticks = [...new Set(projected.flat().map((q) => Math.round(q.t * 1e4) / 1e4))].sort((a, b) => a - b);
  let cap = [[], []];
  for (let i = 0; i < ticks.length - 1; i++) {
    let l = ticks[i], r = ticks[i + 1], m = (l + r) / 2;
    let list = projected.filter((e) => e[0].t <= m && e[1].t > m);
    const yy = (e, t) => mix(e[0].y, e[1].y, clamp((t - e[0].t) / (e[1].t - e[0].t)));
    list.sort((a, b) => yy(a, m) - yy(b, m));
    for (let k = 0; k + 1 < list.length; k += 2) {
      for (let s = 0; s < 2; s++) {
        let sign = s ? 1 : -1;
        let vv = (t, y) => [nx * offset - nz * t, y, nz * offset + nx * t, sign * nx, 0, sign * nz, t, y, 1, 1, 1];
        let a = vv(l, yy(list[k], l)), b = vv(r, yy(list[k], r)), c = vv(r, yy(list[k + 1], r)), d = vv(l, yy(list[k + 1], l));
        if (s) {
          appendTri(cap[s], a, c, b);
          appendTri(cap[s], a, d, c);
        } else {
          appendTri(cap[s], a, b, c);
          appendTri(cap[s], a, c, d);
        }
      }
    }
  }
  for (let s = 0; s < 2; s++) if (cap[s].length) {
    capM.side = T.DoubleSide;
    mesh(groups[s], makeGeo(cap[s], capM.vertexColors), capM);
  }
}

function cutPiece(piece, a, b) {
  let dx = b.x - a.x, dz = b.z - a.z, len = Math.hypot(dx, dz);
  if (len < 0.23) return false;
  let nx = -dz / len, nz = dx / len, off = nx * a.x + nz * a.z, dist = (p) => nx * p.x + nz * p.z - off;
  let polys = [slicePoly(piece.poly, dist), slicePoly(piece.poly, (p) => -dist(p))];
  if (polys.some((p) => p.length < 3 || center(p).area < 0.04)) return false;
  let gs = [grp(meal), grp(meal)], sections = new Map();
  for (let o of piece.g.children) clipSolid(o, gs, nx, nz, off, sections);
  for (let [material, edges] of sections) closeSection(edges, material, gs, nx, nz, off);
  let seam = { a, b, nx, nz, off };
  for (let s = 0; s < 2; s++) {
    gs[s].position.copy(piece.g.position);
    gs[s].position.x += nx * (s ? -0.019 : 0.019);
    gs[s].position.z += nz * (s ? -0.019 : 0.019);
    pieces.push({ g: gs[s], poly: polys[s], cuts: [...piece.cuts, seam], served: false });
  }
  pieces.splice(pieces.indexOf(piece), 1);
  piece.g.removeFromParent();
  piece.g.children.forEach((o) => o.geometry.dispose());
  splitCount++;
  return true;
}
