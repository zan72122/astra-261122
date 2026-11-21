"use strict";
let stage = "prep", tool = "sauce", touched = false, armed = false;
let charge = 0, handful = 0, hasSauce = false, press = null, preview = null;
let lastInput = performance.now() / 1000, now = lastInput, prev = now, phaseStart = now;
let lastHeat = -1, lastPaint = 0, lastAudio = 0;
let portrait = false, homeCam, serveCam, ovenCam, changeCam, fromTray, toolSpot, spoonRest;
const bowlSway = Math.random() * 0.25 - 0.125;
let dentActive = false, cue = "", groove = null, cutMark = null, bladeArmed = false;
let lift = null, flying = [], fresh = null, round = 0;
const ray = new T.Raycaster(), plane = new T.Plane(v3(0, 1, 0), 0), pointer = new T.Vector2();
const typeKeys = Object.keys(bowls), kinds = ["pepper", "corn", "tomato", "sausage"];
const distance = (a, b) => Math.hypot(a.x - b.x, a.z - b.z);
let ac, audioBus;
function awaken() {
  if (!ac) {
    let Audio = window.AudioContext || window.webkitAudioContext;
    if (Audio) {
      ac = new Audio();
      audioBus = ac.createGain();
      audioBus.gain.value = 0.47;
      audioBus.connect(ac.destination);
    }
  }
  if (ac?.state === "suspended") ac.resume().catch(() => {
  });
}

function sound(kind, volume = 0.6, speed = 1) {
  if (!ac) return;
  let t = ac.currentTime;
  if (["swish", "wheel"].includes(kind) && t - lastAudio < (kind === "wheel" ? 0.078 : 0.095) / clamp(speed, 0.6, 3)) return;
  if (["swish", "wheel"].includes(kind)) lastAudio = t;
  let gain = ac.createGain();
  gain.connect(audioBus);
  let dur = kind === "clink" ? 0.38 : kind === "slide" ? 0.48 : kind === "oven" ? 0.28 : kind === "swish" ? 0.105 : 0.088;
  gain.gain.setValueAtTime(1e-4, t);
  gain.gain.exponentialRampToValueAtTime(Math.max(3e-4, volume * (kind === "swish" ? 0.075 : 0.11)), t + 8e-3);
  gain.gain.exponentialRampToValueAtTime(1e-4, t + dur);
  if (["swish", "wheel", "slide", "sprinkle"].includes(kind)) {
    let buf = ac.createBuffer(1, Math.ceil(ac.sampleRate * dur), ac.sampleRate), data = buf.getChannelData(0);
    let l = 0;
    for (let i = 0; i < data.length; i++) {
      l = 0.48 * l + 0.52 * (Math.random() * 2 - 1);
      data[i] = l;
    }
    let s = ac.createBufferSource(), flt = ac.createBiquadFilter();
    s.buffer = buf;
    flt.type = "bandpass";
    flt.frequency.value = kind === "swish" ? 440 : kind === "wheel" ? 1150 + speed * 170 : kind === "slide" ? 710 : 1700;
    flt.Q.value = 0.9;
    s.connect(flt);
    flt.connect(gain);
    s.start(t);
    s.onended = () => {
      s.disconnect();
      flt.disconnect();
      gain.disconnect();
    };
  } else {
    let o = ac.createOscillator();
    o.type = kind === "clink" ? "sine" : "triangle";
    let f = kind === "clink" ? 1360 : kind === "oven" ? 124 : kind === "plate" ? 650 : 215;
    o.frequency.setValueAtTime(f * rr(0.96, 1.04), t);
    o.frequency.exponentialRampToValueAtTime(f * (kind === "clink" ? 0.986 : 0.6), t + dur);
    o.connect(gain);
    o.start(t);
    o.stop(t + dur);
    o.onended = () => {
      o.disconnect();
      gain.disconnect();
    };
  }
}

function pointAt(e, y) {
  pointer.set(e.clientX / innerWidth * 2 - 1, 1 - e.clientY / innerHeight * 2);
  ray.setFromCamera(pointer, camera);
  plane.constant = -y;
  let result = ray.ray.intersectPlane(plane, v3());
  return result || v3(100, y, 100);
}

function localAt(e) {
  let p = pointAt(e, tray.position.y + 0.28);
  return { x: p.x - tray.position.x, z: p.z - tray.position.z };
}

function screenPoint(v) {
  let p = v.clone().project(camera);
  return { x: (p.x + 1) * innerWidth * 0.5, y: (1 - p.y) * innerHeight * 0.5 };
}

function nearObj(e, obj, margin = 8) {
  obj.updateWorldMatrix(true, true);
  let b = new T.Box3().setFromObject(obj), c = b.getCenter(v3());
  pointAt(e, c.y);
  if (ray.ray.intersectsBox(b)) {
    if (ray.intersectObject(obj, true).length) return true;
  }
  const sp = screenPoint(c);
  return Math.hypot(sp.x - e.clientX, sp.y - e.clientY) < margin;
}

function cameraPose(pos, target, fov = 34) {
  return { pos, target, fov };
}
let lookAt = v3();
function setCam(p) {
  camera.position.copy(p.pos);
  lookAt.copy(p.target);
  camera.lookAt(lookAt);
  camera.fov = p.fov;
  camera.updateProjectionMatrix();
  camera.updateMatrixWorld();
}

function blendCam(a, b, p) {
  setCam(cameraPose(a.pos.clone().lerp(b.pos, p), a.target.clone().lerp(b.target, p), mix(a.fov, b.fov, p)));
}

function frameScene(points, aim, angle, fov = 34) {
  let up2 = v3(0, sin(angle), -cos(angle)), back = v3(0, sin(angle), cos(angle));
  up2.set(0, cos(angle), -sin(angle));
  let dist = 0, tan = Math.tan(fov * PI / 360);
  for (let p of points) {
    let d = p.clone().sub(aim), forward = d.dot(back);
    dist = Math.max(dist, forward + Math.abs(d.x) / (camera.aspect * tan), forward + Math.abs(d.dot(up2)) / tan);
  }
  return cameraPose(aim.clone().addScaledVector(back, dist * 1.025), aim, fov);
}

function layout() {
  portrait = innerWidth / innerHeight < 0.83;
  renderer.setSize(innerWidth, innerHeight, false);
  camera.aspect = innerWidth / innerHeight;
  const pos = portrait ? { sauce: [-1.31, 3.34], corn: [1.17, 3.65], pepper: [-1.25, -2.98], cheese: [0.88, -3.19], sausage: [1.27, -5.15], tomato: [-0.89, -5.03] } : { sauce: [-3.64, 1.15], corn: [3.57, 1.37], pepper: [3.61, -0.9], cheese: [-0.29, -3.33], sausage: [1.91, -3.1], tomato: [-2.53, -3.13] };
  if (bowlSway > 0.035) [pos.tomato, pos.sausage] = [pos.sausage, pos.tomato];
  const pts = [];
  for (let k of typeKeys) {
    let b = bowls[k], q = pos[k];
    b.p.position.set(q[0] + bowlSway * cos(typeKeys.indexOf(k)), 5e-3, q[1] + bowlSway * 0.5 * sin(typeKeys.indexOf(k)));
    for (let i = 0; i < 12; i++) {
      let a = i * TAU / 12;
      pts.push(v3(b.p.position.x + (b.r + 0.1) * cos(a), b.h, b.p.position.z + (b.r + 0.1) * sin(a)));
    }
  }
  spoonRest = bowls.sauce.p.position.clone().add(v3(-0.06, bowls.sauce.h * 0.88, 0.02));
  towel.position.set(portrait ? 2.1 : 3.75, 0, portrait ? -3.75 : -0.68);
  towel.rotation.y = portrait ? -0.24 : 0.3;
  sprig.position.set(portrait ? -1.85 : -3.53, 0.03, portrait ? 4.81 : 2.97);
  sprig.rotation.y = portrait ? 0.71 : -0.91;
  sprig.scale.setScalar(portrait ? 0.76 : 0.94);
  cherryVine.position.set(portrait ? -1.9 : -4.55, 0, portrait ? -5.92 : -2.58);
  cherryVine.rotation.y = portrait ? -0.61 : 0.53;
  pts.push(v3(-2.54, 0.51, 2.87), v3(2.82, 0.51, 2.72));
  pts.push(spoonRest.clone().add(v3(portrait ? 0.22 : -1.08, 0.45, portrait ? 1.48 : 1.13)));
  let angle = (portrait ? 57 : 54) * PI / 180, aim = v3(portrait ? 0 : -0.13, 0.26, portrait ? 0.29 : -0.05);
  homeCam = frameScene(pts, aim, angle);
  homeCam.pos.sub(aim).multiplyScalar(portrait ? 0.925 : 0.969).add(aim);
  const platePos = portrait ? [[0.03, -4.02], [-0.32, 3.85]] : [[-3.58, -2.14], [3.58, -2.15]];
  family.forEach((f, k) => {
    let [x, z] = platePos[k];
    f.plate.position.set(x, 0.015, z);
    let left = k === 0, ang = portrait ? left ? -2.02 : 1.19 : left ? -1.67 : 1.71;
    let pos2 = portrait ? left ? v3(-1.55, 0.277, -4.27) : v3(1.28, 0.263, 4.14) : v3(x + (left ? -1.02 : 1.02), 0.27, z + 0.85);
    f.origin = pos2;
    f.ang = ang;
    f.a.g.position.copy(pos2);
    f.a.g.rotation.y = ang;
    f.a.g.scale.setScalar(k ? 0.82 : 0.94);
    f.b.g.scale.setScalar(k ? 0.82 : 0.94);
    f.b.g.rotation.y = ang;
    f.b.g.position.copy(pos2).add(v3(cos(ang) * 0.88, 0, -sin(ang) * 0.88));
    if (!portrait && k === 0) f.b.g.position.copy(pos2).add(v3(-cos(ang) * 0.88, 0, sin(ang) * 0.88));
  });
  toolSpot = portrait ? v3(2.18, 0.026, 2.78) : v3(-3.45, 0.035, 1.66);
  let dinnerPts = [v3(-3, 0.28, 2.7), v3(3, 0.28, 2.7), toolSpot.clone().add(v3(0.1, 0.6, 0.85))];
  for (let f of family) {
    for (let i = 0; i < 12; i++) {
      let a = i * TAU / 12;
      dinnerPts.push(f.plate.position.clone().add(v3(1.48 * cos(a), 0.22, 1.48 * sin(a))));
    }
    dinnerPts.push(f.origin.clone().add(v3(0, 0.2, 0.1)));
  }
  serveCam = frameScene(dinnerPts, v3(0, 0.26, portrait ? 0.2 : -0.16), angle);
  let bakeDist = 6.6, bakeFov = 2 * Math.atan(3.15 / (camera.aspect * bakeDist)) * 180 / PI;
  ovenCam = cameraPose(v3(0, 2.24, ovenZ + bakeDist), v3(0, 0.48, ovenZ - 0.12), clamp(bakeFov, 26, 94));
  if (stage === "prep") setCam(homeCam);
  if (["serve", "complete"].includes(stage)) setCam(serveCam);
  if (["baking", "ready"].includes(stage)) setCam(ovenCam);
  if (stage === "prep" && !press) restSpoon();
  if (stage === "serve" && !groove) parkCutter();
  if (fresh) positionFresh();
}

function restSpoon() {
  spoon.position.copy(spoonRest);
  spoon.rotation.set(-0.28, portrait ? 0.25 : -0.77, -0.075);
}

function parkCutter() {
  cutter.g.position.copy(toolSpot);
  cutter.g.rotation.set(0.13, portrait ? -0.38 : -0.67, -0.84);
}

function toolOnPizza(x, z, h = 0.12) {
  spoon.position.set(tray.position.x + x, tray.position.y + heightAt(x, z) + h, tray.position.z + z);
  spoon.rotation.set(-0.31, 0.41, -0.075);
}

function removePreview() {
  if (preview) {
    preview.removeFromParent();
    preview = null;
  }
}

function makePreview(k) {
  removePreview();
  if (k === "cheese") {
    preview = grp(scene);
    for (let i = 0; i < 9; i++) {
      let q = mesh(preview, shred, i % 2 ? cheesePale : cheeseMat, rr(-0.095, 0.095), rr(0, 0.063), rr(-0.083, 0.083));
      q.rotation.set(rr(-0.4, 0.4), rr(0, PI), rr(-0.4, 0.4));
    }
  } else if (kinds.includes(k)) {
    preview = ingredient(k);
    scene.add(preview);
    preview.scale.setScalar(0.98);
  }
}

function bowlHit(e) {
  let best = null, min = Infinity;
  for (let k of typeKeys) {
    let b = bowls[k], p = pointAt(e, b.h * 0.73), d = distance(p, b.p.position) / b.r;
    if (d < 1.1 && d < min) {
      min = d;
      best = k;
    }
  }
  return best;
}

function choose(k) {
  tool = k;
  armed = true;
  charge = k === "sauce" ? 1 : 0;
  handful = k === "cheese" ? 48 : k === "corn" ? 6 : 1;
  touched = true;
  makePreview(k);
  if (k === "sauce") sound("clink", 0.7);
  else sound("sprinkle", 0.4);
  return { type: "ingredient", kind: k, at: null, tick: 0, travel: 0, lastCorn: null, spent: 0 };
}
let scoop = null, dropBlob = null;
function scoopSauce(x = 0, z = 0) {
  touched = hasSauce = true;
  let a = spoon.position.clone(), b = v3(x, tray.position.y + heightAt(x, z) + 0.3, z);
  scoop = { a, b, t: now, land: false, x, z };
  if (dropBlob) dropBlob.removeFromParent();
  dropBlob = oval(scene, sauceMat, b.x, b.y, b.z, 0.14, 0.13, 0.18);
  dropBlob.visible = false;
}

function nearestFood(p) {
  let best = null, bestHeight = -Infinity;
  for (let f of foods) {
    let q = localFoodPoint(f, p.x, p.z), hit = false;
    if (f.kind === "pepper") {
      let ring = ringProfile(f, q);
      hit = Math.abs(ring.dist - ring.r) < ring.width + 0.064;
    } else if (f.kind === "sausage") hit = Math.hypot(q.x / 0.375, q.z / 0.278) < 1;
    else hit = Math.hypot(q.x, q.z) < (f.kind === "corn" ? 0.156 : 0.313);
    if (hit && f.obj.position.y > bestHeight) {
      bestHeight = f.obj.position.y;
      best = f;
    }
  }
  return best;
}

function startBake() {
  if (stage !== "prep" || !hasSauce && !foods.length && !shreds.length) return;
  press = null;
  armed = false;
  removePreview();
  if (scoop && !scoop.land) sauceDrop(scoop.x, scoop.z);
  scoop = null;
  if (dropBlob) dropBlob.visible = false;
  spoon.visible = false;
  stage = "insert";
  phaseStart = now;
  changeCam = cameraPose(camera.position.clone(), lookAt.clone(), camera.fov);
  fromTray = tray.position.clone();
  oven.visible = true;
  glass.visible = true;
  glass.position.y = 1.59;
  bakeLight.intensity = 11;
  buildBubbles();
  sound("slide", 0.95);
  demo.visible = false;
}

function returnTray() {
  if (stage !== "ready") return;
  stage = "return";
  phaseStart = now;
  fromTray = tray.position.clone();
  changeCam = cameraPose(camera.position.clone(), lookAt.clone(), camera.fov);
  dining.visible = true;
  cutter.g.visible = true;
  parkCutter();
  sound("slide", 0.86);
  freezePizza();
}

function moveTrayStage(t) {
  let s = smooth(clamp(t / (stage === "insert" ? 2.35 : 2.12)));
  if (stage === "insert") {
    tray.position.lerpVectors(fromTray, v3(0, 0.26, ovenZ), s);
    tray.position.y += sin(s * PI) * 0.29;
    blendCam(changeCam, ovenCam, s);
    if (s > 0.22) {
      for (let b of Object.values(bowls)) b.p.visible = false;
      sprig.visible = cherryVine.visible = false;
    }
    if (s >= 1) {
      tableTop.visible = board.visible = towel.visible = false;
      stage = "baking";
      phaseStart = now;
      lastHeat = -1;
    }
  } else {
    tray.position.lerpVectors(fromTray, v3(0, baseY, 0), s);
    tray.position.y += sin(s * PI) * 0.32;
    blendCam(changeCam, serveCam, s);
    if (s > 0.27) tableTop.visible = board.visible = towel.visible = true;
    if (s > 0.55) {
      oven.visible = false;
      bakeLight.intensity = 0;
    }
    if (s >= 1) {
      stage = "serve";
      bladeArmed = false;
      lastInput = now;
      parkCutter();
    }
  }
}

function markLine(a, b, piece) {
  if (cutMark) {
    cutMark.geometry.dispose();
    cutMark.removeFromParent();
  }
  let dx = b.x - a.x, dz = b.z - a.z, len = Math.hypot(dx, dz);
  if (len < 0.016) {
    cutMark = null;
    return;
  }
  let path = [];
  for (let i = 0; i <= Math.max(3, Math.ceil(len / 0.12)); i++) {
    let u = i / Math.max(3, Math.ceil(len / 0.12)), x = mix(a.x, b.x, u), z = mix(a.z, b.z, u);
    let y = supportAt(x, z).y + 0.012;
    path.push(v3(x, y, z));
  }
  cutMark = tube(meal, crumbMat, path, 0.018, path.length * 2, 5);
  cutMark.position.copy(piece.g.position);
}

function clearLine() {
  if (cutMark) {
    cutMark.removeFromParent();
    cutMark.geometry.dispose();
    cutMark = null;
  }
  groove = null;
}

function pieceAt(p) {
  return pieces.find((q) => !q.served && inside(q.poly, p.x - q.g.position.x, p.z - q.g.position.z));
}

function closestPiece(p) {
  let best = null, near = null;
  for (let q of pieces.filter((q2) => !q2.served)) {
    let n = nearest(q.poly, p.x - q.g.position.x, p.z - q.g.position.z);
    if (!near || n.d < near.d) {
      best = q;
      near = n;
    }
  }
  return best;
}

function onBlade(p, q) {
  cutter.g.position.set(p.x + q.g.position.x, tray.position.y + heightAt(p.x, p.z) + 8e-3, p.z + q.g.position.z);
  cutter.g.rotation.x = 0;
  cutter.g.rotation.z = 0;
}

function pickBlade(p) {
  let q = pieceAt(p) || closestPiece(p);
  if (!q) return;
  let n = nearest(q.poly, p.x - q.g.position.x, p.z - q.g.position.z);
  clearLine();
  groove = { a: { x: n.x, z: n.z }, b: { x: n.x, z: n.z }, piece: q, unused: true };
  cutter.g.rotation.y = 0.3;
  onBlade(n, q);
  bladeArmed = true;
}

function lineEnd(poly, a, ux, uz) {
  let best = 0;
  for (let i = 0; i < poly.length; i++) {
    let p = poly[i], q = poly[(i + 1) % poly.length], dx = q.x - p.x, dz = q.z - p.z, de = ux * dz - uz * dx;
    if (Math.abs(de) < 1e-8) continue;
    let x = p.x - a.x, z = p.z - a.z, t = (x * dz - z * dx) / de, v = (x * uz - z * ux) / de;
    if (t > 0.02 && v >= -1e-4 && v <= 1.0001) best = Math.max(best, t);
  }
  return best;
}

function drawCut(p) {
  if (!groove) return;
  let q = groove.piece, dx = p.x - q.g.position.x - groove.a.x, dz = p.z - q.g.position.z - groove.a.z, len = Math.hypot(dx, dz);
  if (len < 0.065) return;
  let ux = dx / len, uz = dz / len, max = lineEnd(q.poly, groove.a, ux, uz);
  if (max < 0.26) return;
  let run = Math.min(len, max), b = { x: groove.a.x + ux * run, z: groove.a.z + uz * run };
  let step = distance(b, groove.b);
  if (step < 0.012) return;
  groove.b = b;
  groove.unused = false;
  markLine(groove.a, b, q);
  onBlade(b, q);
  cutter.g.rotation.y = Math.atan2(-ux, -uz);
  cutter.wheel.rotation.x -= step / 0.34;
  sound("wheel", 0.58, clamp(step * 20, 0.5, 3));
  if (len >= max - 0.105 && run > 0.25) {
    let end = { x: groove.a.x + ux * max, z: groove.a.z + uz * max };
    if (cutPiece(q, groove.a, end)) {
      clearLine();
      bladeArmed = false;
      parkCutter();
      press = null;
      sound("drop", 0.5);
    }
  }
}

function flavor(piece) {
  if (piece.flavor) return piece.flavor;
  const f = { pepper: 0, sausage: 0, tomato: 0, corn: 0, cheese: 0, sauce: 0 };
  const ids = {}, bites = {};
  function rememberBite(kind, amount, x, z) {
    if (amount > (bites[kind]?.amount || 0)) bites[kind] = { amount, x, z };
  }
  for (const item of foods) {
    const samples = [];
    for (let i = 0; i < 64; i++) {
      const angle = 2.4 * i, radial = Math.sqrt((i + 0.5) / 64);
      let x, z;
      if (item.kind === "pepper") {
        const wall = ringProfile(item, { x: cos(angle), z: 0.94 * sin(angle) });
        const radius = wall.r + wall.width * (2 * ((i * 0.618) % 1) - 1);
        x = radius * cos(angle);
        z = radius * 0.94 * sin(angle);
      } else {
        const span = item.kind === "corn" ? [0.096, 0.076] : item.kind === "sausage" ? [0.337, 0.245] : [0.276, 0.255];
        x = span[0] * radial * cos(angle);
        z = span[1] * radial * sin(angle);
      }
      const worldX = item.x + item.s * (x * cos(item.yaw) + z * sin(item.yaw));
      const worldZ = item.z + item.s * (z * cos(item.yaw) - x * sin(item.yaw));
      if (inside(piece.poly, worldX, worldZ)) samples.push({ x: worldX, z: worldZ });
    }
    if (samples.length) {
      const amount = samples.length / 64, bite = samples[Math.floor(samples.length / 2)];
      f[item.kind] += amount;
      ids[item.id] = amount;
      rememberBite(item.kind, amount, bite.x, bite.z);
    }
  }
  for (let z = -R; z < R; z += 0.17) for (let x = -R; x < R; x += 0.17) {
    if (!inside(piece.poly, x, z)) continue;
    for (const kind of ["cheese", "sauce"]) {
      const amount = fieldAt(fields[kind], x, z);
      f[kind] += amount * 0.019;
      rememberBite(kind, amount, x, z);
    }
  }
  piece.bites = bites;
  piece.contents = ids;
  piece.flavor = f;
  return f;
}

function tendrils(p) {
  for (let seam of p.cuts) {
    let { a, b, nx, nz } = seam, len = distance(a, b), num = Math.ceil(len / 0.09);
    for (let i = 1; i < num; i++) {
      let t = (i + 0.3) / num, x = mix(a.x, b.x, t), z = mix(a.z, b.z, t);
      if (nearest(p.poly, x, z).d > 0.032) continue;
      let d = Math.min(fieldAt(fields.cheese, x + 0.07 * nx, z + 0.07 * nz), fieldAt(fields.cheese, x - 0.07 * nx, z - 0.07 * nz));
      if (d < 0.075 || Math.random() > clamp(d * 1.6, 0.14, 0.94)) continue;
      let adj = pieces.find((q) => q !== p && !q.served && nearest(q.poly, x, z).d < 0.032);
      if (!adj) continue;
      let h = heightAt(x, z) + 0.037, thick = 9e-3 + 0.038 * clamp(d / 1.75), max = 0.31 + clamp(d, 0, 2) * 0.64 + rr(0.08, 0.37);
      let g = tube(meal, tailsMat, [v3(x, h, z), v3(x + 0.01, h, z), v3(x + 0.026, h, z)], thick, 8, 5);
      strings.push({ p, adj, x, z, h, thick, max, g, snap: 0 });
      if (strings.length >= 32) return;
    }
  }
}

function tail(p, x, z, h, dx, dz, w) {
  let pts = [v3(x, h, z), v3(x + dx * 0.57, h + 0.022, z + dz * 0.57), v3(x + dx, h - 0.03, z + dz)];
  tube(p.g, tailsMat, pts, w, 7, 5);
}

function updateStrings(dt) {
  for (let i = strings.length - 1; i >= 0; i--) {
    let s = strings[i];
    let a = v3(s.x, s.h, s.z), b = a.clone();
    s.p.g.localToWorld(a);
    s.adj.g.localToWorld(b);
    meal.worldToLocal(a);
    meal.worldToLocal(b);
    let d = a.distanceTo(b);
    if (d > s.max && !s.snap) s.snap = 1e-3;
    if (s.snap) {
      s.snap += dt * 5;
      if (s.snap >= 1) {
        let dx = clamp((a.x - b.x) * 0.12, -0.12, 0.12), dz = clamp((a.z - b.z) * 0.12, -0.12, 0.12);
        tail(s.p, s.x, s.z, s.h, -dx, -dz, s.thick * 0.62);
        tail(s.adj, s.x, s.z, s.h, dx, dz, s.thick * 0.62);
        s.g.geometry.dispose();
        s.g.removeFromParent();
        if (s.looseEnd) { s.looseEnd.geometry.dispose(); s.looseEnd.removeFromParent(); }
        strings.splice(i, 1);
        continue;
      }
      const breakPoint = a.clone().lerp(b, 0.52);
      breakPoint.y -= Math.min(0.18, d * 0.18);
      const retract = smooth(s.snap);
      const nearBoard = breakPoint.clone().lerp(b, retract);
      const middle = nearBoard.clone().lerp(b, 0.5);
      middle.y -= 0.024 * (1 - retract);
      const line = new T.CatmullRomCurve3([b.clone(), middle, nearBoard]);
      const geometry = new T.TubeGeometry(line, 8, s.thick * 0.46, 6, false);
      if (!s.looseEnd) s.looseEnd = mesh(meal, geometry, tailsMat);
      else { s.looseEnd.geometry.dispose(); s.looseEnd.geometry = geometry; }
      b.copy(breakPoint).lerp(a, retract);
    }
    let c = a.clone().lerp(b, 0.5);
    c.y -= Math.min(0.18, d * 0.18);
    let path = new T.CatmullRomCurve3([a, c, b]);
    s.g.geometry.dispose();
    s.g.geometry = new T.TubeGeometry(path, 9, s.thick * clamp(1 - d / (s.max * 1.4), 0.22, 1), 6, false);
  }
}

function pickPiece(p, at) {
  if (!p || !splitCount) return;
  clearLine();
  parkCutter();
  bladeArmed = false;
  let c = center(p.poly);
  lift = { p, c, origin: p.g.position.clone(), grab: { x: at.x - p.g.position.x, z: at.z - p.g.position.z }, desired: p.g.position.clone(), sticky: false };
  lift.desired.y = 0.54;
  tendrils(p);
  flavor(p);
  sound("drop", 0.38);
}

function pieceWorldCenter(p) {
  let c = center(p.poly);
  return p.g.localToWorld(v3(c.x, 0.22, c.z));
}

function recipient(e) {
  let w = pointAt(e, 0.38), best = null, d = Infinity;
  for (let f of family) {
    let k = Math.min(distance(w, f.plate.position) / 1.68, distance(w, f.a.g.position) / 1.33);
    if (k < 1.14 && k < d) {
      d = k;
      best = f;
    }
  }
  return best;
}

function deliver(f) {
  if (!lift) return;
  let { p, c } = lift;
  lift = null;
  p.served = true;
  let fl = flavor(p), liked = fl[f.preference] > 0.075;
  const match = f.received.find((q) => Object.keys(p.contents).some((id) => foods.find((it) => String(it.id) === id)?.kind === "pepper" && q.contents[id] && p.contents[id] < 0.999));
  let rot = match ? match.plateAngle : f.k ? 0.14 : -0.16, scale = 0.585, origin;
  if (match) {
    origin = { x: match.plateOrigin.x, z: match.plateOrigin.z };
  } else {
    let lx = c.x * cos(rot) + c.z * sin(rot), lz = -c.x * sin(rot) + c.z * cos(rot);
    origin = { x: -lx * scale * 0.37 + (f.received.length % 2 ? 0.095 : -0.045), z: -lz * scale * 0.37 + (f.received.length % 2 ? 0.035 : -0.055) };
  }
  /* Complementary portions use the same translation and rotation on the dish. */
  p.plateAngle = rot;
  p.plateOrigin = origin;
  p.plateLevel = match ? match.plateLevel + 2e-3 : 0.12 + Math.min(f.received.length, 5) * 0.035;
  let local = v3(origin.x, p.plateLevel, origin.z), goal = local.clone().add(f.plate.position);
  let entry = { shape: p.poly.map((q) => ({ ...q })), flavor: { ...fl }, liked, round, angle: rot };
  f.memory.push(entry);
  f.received.push(p);
  f.joy = liked ? 1 : 0.38;
  scene.attach(p.g);
  flying.push({ p, f, start: now, a: p.g.position.clone(), rot: p.g.rotation.clone(), s: p.g.scale.x, goal, scale, angle: rot, c });
  for (let s of strings) if (s.p === p) s.snap = 1e-3;
  sound("plate", 0.42);
  press = null;
}

function settlePiece() {
  if (!lift) return;
  lift.p.g.position.copy(lift.origin);
  lift.p.g.rotation.set(0, 0, 0);
  for (let i = strings.length - 1; i >= 0; i--) if (strings[i].p === lift.p) {
    strings[i].g.removeFromParent();
    strings[i].g.geometry.dispose();
    if (strings[i].looseEnd) {
      strings[i].looseEnd.geometry.dispose();
      strings[i].looseEnd.removeFromParent();
    }
    strings.splice(i, 1);
  }
  lift = null;
}

function updateFamily(dt) {
  if (!dining.visible) return;
  for (let f of family) {
    const pos = lift ? pieceWorldCenter(lift.p) : null;
    const d = pos ? Math.min(distance(pos, f.origin), distance(pos, f.plate.position)) : 10;
    const liked = lift && flavor(lift.p)[f.preference] > 0.075;
    const remember = f.memory.some(portion => portion.liked);
    let open = clamp(1 - d / (liked ? remember ? 4.1 : 3.32 : 2.11));
    let accepting = flying.find((q) => q.f === f), reach = accepting ? 0.34 : open * 0.48;
    f.open = mix(f.open, accepting ? 0.94 : open, clamp(dt * 6));
    f.reach = mix(f.reach, reach, clamp(dt * 6));
    f.joy = Math.max(0, f.joy - dt * 0.44);
    let interest = pos;
    if (liked) {
      const bite = lift.p.bites[f.preference];
      interest = lift.p.g.localToWorld(v3(bite.x, 0.35, bite.z));
    }
    if (!interest && stage === "serve") {
      let best = null, amount = 0.015;
      for (let p of pieces) {
        if (p.served) continue;
        let n = flavor(p)[f.preference];
        if (n > amount) {
          best = p;
          amount = n;
        }
      }
      if (best) {
        const bite = best.bites[f.preference];
        interest = best.g.localToWorld(v3(bite.x, 0.35, bite.z));
      }
    }
    let aim = interest ? Math.atan2(interest.x - f.origin.x, interest.z - f.origin.z) + PI : f.ang;
    let diff = Math.atan2(sin(aim - f.ang), cos(aim - f.ang));
    f.a.g.position.copy(f.origin);
    f.a.g.position.x -= sin(f.ang) * f.reach;
    f.a.g.position.z -= cos(f.ang) * f.reach;
    f.a.g.position.y += 0.025 * sin(now * 1.5 + f.k) + f.open * 0.115;
    f.a.g.rotation.y = f.ang + clamp(diff, -0.24, 0.24) * (interest ? 0.67 : 0);
    f.a.g.rotation.z = 0.033 * sin(now * 1.32 + f.k) + f.joy * 0.06 * sin(now * 8);
    f.a.skin.morphTargetInfluences[0] = clamp(0.09 + f.open * 0.91 + 0.04 * sin(now * 1.6 + f.k));
    let carried = accepting?.p || lift?.p, large = false;
    if (carried) {
      let projected = carried.poly.map((q) => q.x * cos(f.ang) - q.z * sin(f.ang));
      large = Math.max(...projected) - Math.min(...projected) > (f.k ? 1.1 : 1.3);
    }
    let big = large && (accepting || open > 0.12);
    f.b.g.visible = !!big;
    f.b.skin.morphTargetInfluences[0] = f.open;
    f.a.skin.morphTargetInfluences[1] = Math.sqrt(f.open);
    f.a.skin.morphTargetInfluences[2] = interest && !accepting && (liked || !lift) ? 0.42 + (remember ? 0.18 : 0) : 0.04;
    f.b.skin.morphTargetInfluences[1] = Math.sqrt(f.open);
    f.b.g.position.y = f.a.g.position.y;
  }
}

function animateFlying() {
  for (let i = flying.length - 1; i >= 0; i--) {
    let f = flying[i], t = clamp((now - f.start) / 0.96), u = smooth(t), g = f.p.g, scale = mix(f.s, f.scale, u);
    /* Bring the centre of the actual piece to the open palm before lowering it onto the plate. */
    let startCenter = v3(f.c.x, 0.18, f.c.z).applyEuler(f.rot).multiplyScalar(f.s).add(f.a), endCenter = v3(f.c.x, 0.18, f.c.z).applyAxisAngle(v3(0, 1, 0), f.angle).multiplyScalar(f.scale).add(f.goal);
    let palm = f.f.a.g.position.clone().add(v3(-sin(f.f.ang) * 0.43, 0.265, -cos(f.f.ang) * 0.43));
    let c = t < 0.46 ? startCenter.clone().lerp(palm, smooth(t / 0.46)) : palm.clone().lerp(endCenter, smooth((t - 0.46) / 0.54));
    g.rotation.set(mix(f.rot.x, 0, u) + sin(PI * u) * 0.095, f.angle * u, mix(f.rot.z, 0, u) + sin(u * PI * 3) * f.f.joy * 0.079);
    g.scale.setScalar(scale);
    g.position.copy(c.sub(v3(f.c.x, 0.18, f.c.z).applyEuler(g.rotation).multiplyScalar(scale)));
    if (t >= 1) {
      g.position.copy(f.goal);
      f.f.plate.attach(g);
      flying.splice(i, 1);
      sound("plate", 0.34);
      if (pieces.every((q) => q.served) && !flying.length) finishRound();
    }
  }
}

function positionFresh() {
  if (!fresh) return;
  fresh.position.set(portrait ? 1.32 : 0.2, 0.36, portrait ? -2.28 : -3.16);
  fresh.scale.setScalar(portrait ? 0.56 : 0.66);
}

function finishRound() {
  if (stage === "complete") return;
  stage = "complete";
  phaseStart = lastInput = now;
  cutter.g.visible = false;
  fresh = grp(scene);
  lathe(fresh, panMetal, [[0.01, 0], [2.42, 0], [2.55, 0.08], [2.55, 0.11], [2.43, 0.07], [0.01, 0.07]], 96);
  let raw = bodyMesh.geometry.clone(), pos = raw.attributes.position, cs = raw.attributes.color, c = new T.Color();
  for (let i = 0; i < basePoints.length; i++) {
    let q = basePoints[i];
    pos.setY(i, q.y);
    c.copy(doughPale).lerp(doughGold, q.shade);
    cs.setXYZ(i, c.r, c.g, c.b);
  }
  raw.computeVertexNormals();
  mesh(fresh, raw, surfaceMat);
  positionFresh();
  fresh.userData.z = fresh.position.z;
}

function anotherRound() {
  if (stage !== "complete") return;
  round++;
  for (let f of family) {
    for (let p of f.received) {
      p.g.removeFromParent();
      p.g.traverse((o) => {
        if (o.isMesh) o.geometry.dispose();
      });
    }
    f.received = [];
  }
  if (fresh) {
    fresh.removeFromParent();
    fresh.children.forEach((o) => o.geometry.dispose());
    fresh = null;
  }
  stage = "prep";
  touched = hasSauce = armed = false;
  charge = handful = 0;
  tool = "sauce";
  scoop = null;
  bodyMesh.geometry.dispose();
  cheeseMesh.dispose();
  if (meltMesh) meltMesh.geometry.dispose();
  press = groove = null;
  bladeArmed = false;
  removePreview();
  for (let b of Object.values(bowls)) b.p.visible = true;
  dining.visible = false;
  spoon.visible = sprig.visible = cherryVine.visible = true;
  oven.visible = false;
  bakeLight.intensity = 0;
  tray.position.set(0, baseY, 0);
  makePizza();
  layout();
  lastInput = now;
  sound("drop", 0.45);
}

function safeSpot(p, kind) {
  let m = R - (kind === "corn" ? 0.085 : kind === "cheese" ? 0.025 : 0.16), r = Math.hypot(p.x, p.z);
  if (r > m) {
    return { x: p.x * m / r, z: p.z * m / r };
  }
  return { ...p };
}

function sprinkleAt(p, n) {
  for (let i = 0; i < n && handful > 0; i++) {
    let a = rr(0, TAU), r = rr(0.018, 0.133);
    addShred(p.x + cos(a) * r, p.z + sin(a) * r);
    handful--;
  }
  if (!handful) armed = false;
  halfSound();
}
let lastSprinkle = 0;
function halfSound() {
  if (now - lastSprinkle > 0.16) {
    sound("sprinkle", 0.31);
    lastSprinkle = now;
  }
}

function ingredientMotion(e, dt = 0, release = false) {
  if (!press || press.type !== "ingredient") return;
  let p = localAt(e), k = press.kind, on = Math.hypot(p.x, p.z) < R + 0.02;
  press.e = e;
  if (preview) {
    let pp = pointAt(e, on ? tray.position.y + 0.7 : 1.03);
    preview.position.copy(pp);
    preview.visible = !on || handful > 0;
  }
  if (!on) {
    press.at = null;
    return;
  }
  let pt = safeSpot(p, k);
  if (k === "sauce") {
    if (scoop && !scoop.land && now - scoop.t < 0.41) return;
    if (!hasSauce) {
      sauceDrop(pt.x, pt.z);
      hasSauce = true;
    }
    let a = press.at || pt;
    if (!press.at && charge > 0.85 && !press.initial) {
      sauceDrop(pt.x, pt.z);
      press.initial = true;
    }
    let step = distance(a, pt);
    charge = spread(pt.x, pt.z, a.x, a.z, charge);
    dentActive = true;
    toolOnPizza(pt.x, pt.z, 0.014);
    if (step > 0.02) sound("swish", 0.54, step * 15);
    if (release) {
      armed = false;
      restSpoon();
    }
  } else if (k === "cheese") {
    if (!handful) return;
    press.tick += dt * 21;
    if (!press.at || release && press.spent === 0) press.tick = Math.max(press.tick, release ? 6 : 3);
    let number = Math.min(8, Math.floor(press.tick));
    if (number) {
      sprinkleAt(pt, number);
      press.spent += number;
      press.tick -= number;
    }
  } else if (k === "corn") {
    if ((release || press.lastCorn && distance(press.lastCorn, pt) > 0.24 && now - press.lastTime > 0.12) && handful > (release ? 0 : 1)) {
      placeFood(k, pt.x, pt.z);
      handful--;
      press.lastCorn = pt;
      press.lastTime = now;
      halfSound();
    }
    if (!press.lastCorn) {
      press.lastCorn = pt;
      press.lastTime = now;
    }
    if (release) armed = handful > 0;
  } else if (release) {
    placeFood(k, pt.x, pt.z);
    handful = 0;
    armed = false;
    sound("drop", 0.42);
  }
  press.at = pt;
}

function down(e) {
  if (press || !e.isPrimary || e.button > 0) return;
  e.preventDefault();
  awaken();
  now = performance.now() / 1e3;
  lastInput = now;
  demo.visible = false;
  canvas.setPointerCapture(e.pointerId);
  if (stage === "complete") {
    if (fresh && nearObj(e, fresh, 12)) anotherRound();
    return;
  }
  if (stage === "ready") {
    let p = pointAt(e, tray.position.y + 0.14);
    if (Math.hypot(p.x - tray.position.x, p.z - tray.position.z) < 2.92 || nearObj(e, tray, 10)) {
      press = { type: "return", y: e.clientY };
    }
    return;
  }
  if (stage === "prep") {
    let k = bowlHit(e), p = localAt(e);
    if (!k && spoon.visible && nearObj(e, spoon, 13)) k = "sauce";
    if (k) {
      let first = !touched;
      press = choose(k);
      press.e = e;
      if (k === "sauce" && first) {
        press.initial = true;
        scoopSauce();
      } else if (k === "sauce") {
        restSpoon();
        spoon.position.y += 0.13;
        spoon.rotation.z = -0.32;
      }
      if (preview) {
        preview.position.copy(bowls[k].p.position);
        preview.position.y = bowls[k].h + 0.31;
      }
      return;
    }
    let r = Math.hypot(p.x, p.z);
    let bottom = pointAt(e, tray.position.y + 0.088), rb = Math.hypot(bottom.x, bottom.z);
    if ((hasSauce || shreds.length || foods.length) && rb > R - 0.035 && rb < 2.76 && bottom.z > -0.8) {
      press = { type: "tray", y: e.clientY };
      return;
    }
    if (r > R + 0.03) return;
    if (!touched) {
      press = choose("sauce");
      press.initial = true;
      press.e = e;
      scoopSauce();
      return;
    }
    let food = nearestFood(p);
    if (food && armed && tool !== "sauce") {
      press = { type: "touchFood", f: food, e, x: e.clientX, y: e.clientY };
      return;
    }
    if (food && (!armed || tool === food.kind && handful === 0)) {
      removePreview();
      press = { type: "food", f: food, e };
      food.held = true;
      food.obj.position.y += 0.18;
      return;
    }
    removePreview();
    if (!armed && tool !== "sauce" && tool !== "cheese") {
      return;
    }
    if (tool === "cheese" && !handful) return;
    if (tool === "sauce" && !armed) charge = Math.max(charge, 0.08);
    press = { type: "ingredient", kind: tool, e, at: null, tick: 0, spent: 0, lastCorn: null, initial: hasSauce && !armed };
    ingredientMotion(e);
    return;
  }
  if (stage === "serve") {
    let p = localAt(e);
    if (lift) {
      let f = recipient(e);
      if (f) {
        deliver(f);
        return;
      }
      if (pieceAt(p) !== lift.p) {
        settlePiece();
      } else {
        press = { type: "lift", e, x: e.clientX, y: e.clientY, moved: false };
        return;
      }
    }
    const hit = nearObj(e, cutter.g, 12);
    let q = pieceAt(p) || closestPiece(p);
    if (!q) return;
    let edge = nearest(q.poly, p.x - q.g.position.x, p.z - q.g.position.z);
    if (hit && !groove) {
      pickBlade(p);
      press = { type: "cut", e, selected: true, x: e.clientX, y: e.clientY };
      sound("clink", 0.38);
      return;
    }
    if (groove && !groove.unused && (hit || distance({ x: p.x - groove.piece.g.position.x, z: p.z - groove.piece.g.position.z }, groove.b) < 0.49)) {
      press = { type: "cut", e };
      return;
    }
    if ((hit || bladeArmed || !splitCount || edge.d < 0.16) && (edge.d < 0.52 || pieceAt(p))) {
      if (!groove || groove.unused || edge.d < 0.3) pickBlade(p);
      press = { type: "cut", e };
      return;
    }
    q = pieceAt(p);
    if (q) {
      pickPiece(q, p);
      press = { type: "lift", e, x: e.clientX, y: e.clientY, moved: false };
    }
  }
}

function move(e) {
  if (!e.isPrimary) return;
  if (!press) {
    canvas.style.cursor = "default";
    return;
  }
  lastInput = now;
  press.e = e;
  if (press.type === "touchFood" && Math.hypot(e.clientX - press.x, e.clientY - press.y) > 6) {
    press.type = "food";
    press.f.held = true;
    removePreview();
  }
  if (press.type === "ingredient") ingredientMotion(e);
  else if (press.type === "food") {
    let f = press.f, p = safeSpot(localAt(e), f.kind);
    f.obj.position.set(p.x, heightAt(p.x, p.z) + 0.31, p.z);
    f.obj.rotation.z = 0.11;
  } else if (press.type === "tray") {
    if (press.y - e.clientY > 15) startBake();
  } else if (press.type === "return") {
    if (e.clientY - press.y > 14) {
      press = null;
      returnTray();
    }
  } else if (press.type === "cut") {
    if (press.selected && Math.hypot(e.clientX - press.x, e.clientY - press.y) < 8) return;
    drawCut(localAt(e));
  } else if (press.type === "lift" && lift) {
    if (Math.hypot(e.clientX - press.x, e.clientY - press.y) > 5) press.moved = true;
    let w = pointAt(e, tray.position.y + 0.65);
    lift.desired.set(w.x - lift.grab.x, 0.62, w.z - lift.grab.z);
  }
}

function up(e) {
  if (!e.isPrimary) return;
  lastInput = now;
  if (!press) return;
  if (press.type === "touchFood") {
    press = { type: "ingredient", kind: tool, e, at: null, tick: 0, spent: 0, lastCorn: null };
  }
  let type = press.type;
  if (type === "ingredient") {
    let on = Math.hypot(localAt(e).x, localAt(e).z) < R + 0.025;
    if (on) ingredientMotion(e, 0, true);
    removePreview();
    if (tool === "sauce" && (!scoop || scoop.land)) restSpoon();
  }
  if (type === "food") {
    let f = press.f, p = localAt(e);
    f.held = false;
    if (Math.hypot(p.x, p.z) < R + 0.38) p = safeSpot(p, f.kind);
    else p = f;
    placeFood(f.kind, p.x, p.z, f);
    foods.forEach((q) => q.reseat = true);
  }
  if (type === "tray") startBake();
  if (type === "return") returnTray();
  if (type === "cut" && !press.selected && groove && !groove.unused) drawCut(localAt(e));
  if (type === "lift" && lift) {
    let f = recipient(e);
    if (f) deliver(f);
    else if (press.moved) settlePiece();
    else lift.sticky = true;
  }
  press = null;
}

function cancel() {
  if (press?.type === "food") {
    let f = press.f;
    f.held = false;
    placeFood(f.kind, f.x, f.z, f);
  }
  press = null;
  removePreview();
  if (lift) settlePiece();
  if (stage === "prep") restSpoon();
  lastInput = now;
}
canvas.addEventListener("pointerdown", down);
canvas.addEventListener("pointermove", move);
canvas.addEventListener("pointerup", up);
canvas.addEventListener("pointercancel", cancel);
canvas.addEventListener("contextmenu", (e) => e.preventDefault());
function instruction() {
  if (stage === "prep") {
    if (!touched) return "spoon";
    if (press) return "";
    if (armed && handful > 0 && tool !== "sauce") return "place";
    if (!shreds.length && !foods.length) return hasSauce ? "cheese" : "spoon";
    return "tray";
  }
  if (stage === "ready") return "out";
  if (stage === "complete") return "fresh";
  if (stage === "serve") {
    if (lift) return "plate";
    if (groove) return "cut";
    return splitCount ? "piece" : "cutter";
  }
  return "";
}

function guide() {
  let idle = now - lastInput;
  cue = instruction();
  let bounce = 0.5 - 0.5 * cos(now * 2.8);
  if (stage === "prep") {
    for (let k of typeKeys) bowls[k].p.position.y = 5e-3 + (cue === k ? 0.049 * bounce : 0);
    if (cue === "spoon" && !scoop && !press) {
      restSpoon();
      spoon.position.y += 0.052 * bounce;
      spoon.rotation.x -= 0.041 * bounce;
    }
    if (cue === "tray") {
      panRim.emissive.setRGB(0.055 * bounce, 0.039 * bounce, 0.018 * bounce);
    } else panRim.emissive.setRGB(0, 0, 0);
  }
  if (stage === "serve" && cue === "cutter" && !press) {
    parkCutter();
    cutter.g.position.y += 0.044 * bounce;
  }
  if (stage === "ready") {
    panRim.emissive.setRGB(0.075 * bounce, 0.045 * bounce, 0.017 * bounce);
  }
  demo.visible = false;
  if (idle < 4 || press || !cue) return;
  let loop = (idle - 4) % 6.8;
  if (loop > 2.58) return;
  let u = clamp(loop / 2.56), t = smooth(clamp((u - 0.12) / 0.72)), a, b;
  if (cue === "spoon") {
    a = spoonRest.clone().add(v3(0, 0.24, 0.3));
    b = v3(0, baseY + 0.43, 0);
  } else if (cue === "cheese") {
    a = bowls.cheese.p.position.clone().add(v3(0, 0.92, 0));
    b = v3(-0.61, baseY + 0.57, 0.28);
  } else if (cue === "place") {
    a = bowls[tool].p.position.clone().add(v3(0, bowls[tool].h + 0.19, 0));
    b = v3(-0.77, baseY + 0.58, 0.24);
  } else if (cue === "tray" || cue === "out") {
    a = tray.position.clone().add(v3(0.03, 0.16, 2.51));
    b = a.clone().add(v3(0, 0.1, cue === "tray" ? -0.71 : 0.69));
  } else if (cue === "cutter") {
    a = toolSpot.clone().add(v3(0, 0.77, 0.36));
    b = v3(-1.62, baseY + 0.41, 1.63);
  } else if (cue === "cut") {
    let { a: origin, b: end, piece } = groove, ctr = center(piece.poly);
    a = v3(end.x, baseY + 0.43, end.z).add(piece.g.position);
    b = v3(mix(origin.x, ctr.x, 1.35), baseY + 0.48, mix(origin.z, ctr.z, 1.35)).add(piece.g.position);
  } else if (cue === "piece") {
    let p = pieces.find((q) => !q.served);
    if (!p) return;
    a = pieceWorldCenter(p);
    a.y += 0.16;
    b = a.clone().add(v3(0, 0.49, 0.03));
  } else if (cue === "plate") {
    a = pieceWorldCenter(lift.p);
    b = family[0].plate.position.clone().add(v3(0, 0.31, 0));
  } else if (cue === "fresh") {
    a = fresh.position.clone().add(v3(0.1, 0.78, 0.14));
    b = fresh.position.clone().add(v3(0.03, 0.32, 0.03));
  }
  if (!a || !b) return;
  demo.visible = true;
  demo.position.copy(a).lerp(b, t);
  demo.position.y += 0.14 * sin(t * PI);
  if (cue === "spoon" && t > 0.84) {
    demo.position.x += 0.27 * sin((t - 0.84) * 27);
    demo.position.z += 0.23 * (1 - cos((t - 0.84) * 27));
  }
  demo.rotation.set(-0.12, -0.25, -0.12);
  demoMat.opacity = 0.34 * smooth(clamp(u * 8)) * smooth(clamp((1 - u) * 7));
}

function animate() {
  requestAnimationFrame(animate);
  now = performance.now() / 1e3;
  let dt = Math.min(0.052, Math.max(0, now - prev));
  prev = now;
  if (stage === "prep") {
    if (scoop) {
      let t = clamp((now - scoop.t) / 0.64), u = smooth(clamp(t / 0.65));
      spoon.position.lerpVectors(scoop.a, scoop.b, u);
      spoon.position.y += 0.71 * sin(PI * u);
      spoon.rotation.set(-0.36, 0.39, mix(-0.09, -0.71, u));
      if (t > 0.42 && t < 0.77) {
        dropBlob.visible = true;
        dropBlob.position.copy(scoop.b);
        dropBlob.position.y += 0.23 * (0.77 - t);
        dropBlob.scale.set(0.16, 0.1 + 0.66 * (t - 0.42), 0.17);
      }
      if (t > 0.65 && !scoop.land) {
        sauceDrop(scoop.x, scoop.z);
        scoop.land = true;
        sound("drop", 0.65);
      }
      if (t >= 1) {
        dropBlob.visible = false;
        scoop = null;
        if (press?.kind !== "sauce") restSpoon();
      }
    }
    if (press?.kind === "cheese" && press.e) ingredientMotion(press.e, dt);
    if (dentActive && now - lastPaint > 0.047) {
      let n = 0;
      for (let i = 0; i < fields.dent.length; i++) {
        let d = fields.dent[i];
        if (d > 3e-3) {
          fields.dent[i] = d * 0.86;
          n++;
        }
      }
      dentActive = n > 0;
      fieldDirty = true;
    }
    if (fieldDirty && now - lastPaint > 0.045) {
      paintSurface();
      lastPaint = now;
    }
    foodPhysics(dt);
    cheeseMatrices(dt);
  }
  if (stage === "insert") {
    foodPhysics(dt);
    cheeseMatrices(dt);
  }
  if (stage === "insert" || stage === "return") moveTrayStage(now - phaseStart);
  if (stage === "baking") {
    let t = clamp((now - phaseStart) / 33);
    if (t - lastHeat > 6e-3 || t >= 1) {
      warmFields(t);
      paintSurface();
      cheeseMatrices(dt);
      updateMelt();
      lastHeat = t;
    }
    steamBubbles(t);
    if (t >= 1) {
      stage = "ready";
      phaseStart = lastInput = now;
      sound("oven", 0.5);
    }
  }
  if (stage === "ready") {
    let u = smooth(clamp((now - phaseStart) / 1.05));
    tray.position.z = ovenZ + 0.88 * u;
    glass.position.y = 1.59 - 3.18 * u;
    glass.visible = u < 0.97;
    for (let b of bubbles) {
      b.obj.scale.y = b.r * (0.052 + 9e-3 * sin(now * 1.7 + b.phase * 85));
    }
  }
  let steamAmount = stage === "baking" ? clamp((bakeTime - 0.24) * 1.3) : stage === "ready" || stage === "return" ? 0.76 : stage === "serve" ? 0.47 : stage === "complete" ? 0.28 : 0;
  steamGroup.position.copy(tray.position);
  animateSteam(now, steamAmount);
  if (stage === "serve" || stage === "complete") {
    if (lift) {
      let p = lift.p.g;
      p.position.lerp(lift.desired, 1 - Math.exp(-dt * 15));
      p.rotation.z = mix(p.rotation.z, -0.025, dt * 8);
      p.rotation.x = mix(p.rotation.x, 0.033, dt * 8);
    }
    updateStrings(dt);
    updateFamily(dt);
    animateFlying();
    if (fresh) {
      let u = smooth(clamp((now - phaseStart) / 0.82));
      fresh.position.y = 0.36 + 0.48 * (1 - u);
      fresh.position.z = fresh.userData.z - 0.55 * (1 - u);
    }
  }
  guide();
  renderer.render(scene, camera);
}
/* Diffuse daylight passing through the kitchen window falls across the worktop. */
topWood.onBeforeCompile = (shader) => {
  shader.vertexShader = "varying vec3 kitchenWorld;\n" + shader.vertexShader;
  shader.vertexShader = shader.vertexShader.replace("#include <worldpos_vertex>", "#include <worldpos_vertex>\nkitchenWorld=(modelMatrix*vec4(transformed,1.)).xyz;");
  shader.fragmentShader = "varying vec3 kitchenWorld;\n" + shader.fragmentShader;
  shader.fragmentShader = shader.fragmentShader.replace("#include <color_fragment>", "#include <color_fragment>\nfloat s=kitchenWorld.x+.56*kitchenWorld.z; float sunpatch=smoothstep(-5.9,-5.35,s)*(1.-smoothstep(2.45,3.2,s));float frame=smoothstep(.12,.34,abs(s+3.72))*smoothstep(.095,.29,abs(kitchenWorld.z-.23*kitchenWorld.x+2.76));diffuseColor.rgb*=mix(vec3(.78,.815,.84),vec3(1.11,1.074,1.013),sunpatch*frame);");
};
makePizza();
layout();
window.addEventListener("resize", layout);
window.addEventListener("blur", cancel);
document.addEventListener("visibilitychange", () => {
  if (document.hidden) cancel();
});
requestAnimationFrame(animate);
