"use strict";
(() => {
  const { T, PI, TAU, group, mesh } = A, { stage, scene, camera, renderer, pot, boxes, bowls, people } = K;
  const V = T.Vector3, clamp = (v, a, b) => Math.max(a, Math.min(b, v)), mix = (a, b, t) => a + (b - a) * t, smooth = (t) => t * t * (3 - 2 * t), now = () => performance.now() / 1e3;
  let day = 0, history = [[], []];
  try {
    const v = JSON.parse(localStorage.getItem("obento-mornings-2") || "null");
    if (v && Array.isArray(v.history) && v.history.length === 2) {
      history = v.history;
      day = Number(v.day) || 0;
    }
  } catch (e) {
  }
  let mode = "cook", active = null, carry = null, gesture = null, clock = 0, lastInput = now(), serial = 0, placement = 0, transition = null, lesson = 0, portrait = false;
  const anims = [];

  function animate(duration, update, end) {
    anims.push({ start: now(), duration, update, end });
  }

  function save() {
    try {
      localStorage.setItem("obento-mornings-2", JSON.stringify({ history, day }));
    } catch (e) {
    }
  }
  const ray = new T.Raycaster(), pointer = new T.Vector2(), plane = new T.Plane(new V(0, 1, 0), 0), v1 = new V();

  function rayAt(x, y) {
    pointer.set(x / innerWidth * 2 - 1, 1 - y / innerHeight * 2);
    ray.setFromCamera(pointer, camera);
  }

  function onPlane(y = 0) {
    plane.constant = -y;
    return ray.ray.intersectPlane(plane, new V()) || new V();
  }
  let audio = null;

  function wakeAudio() {
    try {
      if (!audio) audio = new (window.AudioContext || window.webkitAudioContext)();
      if (audio.state !== "running") audio.resume().catch(() => {
      });
    } catch (e) {
    }
  }

  function sound(kind, power = 1, depth = 0) {
    if (!audio) return;
    let t = audio.currentTime, len = kind === "lid" ? 0.23 : kind === "rice" ? 0.115 : 0.15;
    let filter = audio.createBiquadFilter(), gain = audio.createGain(), src;
    gain.connect(audio.destination);
    filter.connect(gain);
    if (kind === "tomato" || kind === "dish" || kind === "lid") {
      src = audio.createOscillator();
      src.type = "sine";
      let freq = kind === "lid" ? 165 : kind === "tomato" ? 510 : 830;
      src.frequency.setValueAtTime(freq * (1 - 0.45 * clamp(depth, 0, 1)), t);
      src.frequency.exponentialRampToValueAtTime(freq * 0.41, t + len);
      filter.frequency.value = 1600;
    } else {
      let n = Math.ceil(audio.sampleRate * len), b = audio.createBuffer(1, n, audio.sampleRate), d = b.getChannelData(0);
      for (let i = 0; i < n; i++) d[i] = (Math.random() * 2 - 1) * (0.5 + 0.5 * Math.sin(i * 0.068) ** 2);
      src = audio.createBufferSource();
      src.buffer = b;
      filter.type = "lowpass";
      filter.frequency.setValueAtTime((kind === "rice" ? 1550 : 2300) / (1 + depth * 2), t);
      filter.frequency.exponentialRampToValueAtTime(280, t + len);
    }
    gain.gain.setValueAtTime(1e-4, t);
    gain.gain.exponentialRampToValueAtTime(Math.max(1e-3, (kind === "rice" ? 0.078 : 0.11) * power), t + 9e-3);
    gain.gain.exponentialRampToValueAtTime(1e-4, t + len);
    src.connect(filter);
    src.start(t);
    src.stop(t + len + 0.02);
    src.onended = () => {
      src.disconnect();
      filter.disconnect();
      gain.disconnect();
    };
  }

  function limitPoint(b, x, z, pad = 0) {
    let hw = b.w / 2 - 0.151 - pad, hd = b.d / 2 - 0.151 - pad, r = Math.min(hw * 0.65, hd * 0.65, Math.max(0.06, b.r - 0.14 - pad * 0.33)), cx = clamp(x, -hw + r, hw - r), cz = clamp(z, -hd + r, hd - r), dx = x - cx, dz = z - cz, l = Math.hypot(dx, dz);
    return l > r ? [cx + r * dx / l, cz + r * dz / l] : [x, z];
  }

  function inBox(b, x, z, margin = 0) {
    let [px, pz] = limitPoint(b, x, z, -margin);
    return Math.abs(px - x) + Math.abs(pz - z) < 1e-3;
  }
  // Both the visible rice surface and its collision surface sample this same mass grid.

  function initRice(b) {
    let nx = 33, nz = Math.round(nx * b.d / b.w), dx = (b.w - 0.27) / (nx - 1), dz = (b.d - 0.27) / (nz - 1), n = nx * nz;
    const cells = [], pos = new Float32Array(n * 3);
    for (let j = 0; j < nz; j++) for (let i = 0; i < nx; i++) {
      let x = (i - (nx - 1) / 2) * dx, z = (j - (nz - 1) / 2) * dz;
      pos.set([x, b.floor - 0.02, z], (j * nx + i) * 3);
      cells.push({ x, z, q: 0, c: 0, temp: 0, ok: inBox(b, x, z), offset: [A.rnd() - 0.5, A.rnd() - 0.5, A.rnd() * PI, A.rnd() - 0.5, A.rnd() - 0.5, A.rnd() * PI] });
    }
    let geo = new T.BufferGeometry();
    geo.setAttribute("position", new T.BufferAttribute(pos, 3).setUsage(T.DynamicDrawUsage));
    const surface = mesh(geo, A.riceBase, b.body);
    surface.frustumCulled = false;
    const grains = new T.InstancedMesh(A.riceGrain, A.riceMat, n * 2);
    grains.castShadow = false;
    grains.receiveShadow = true;
    grains.frustumCulled = false;
    grains.instanceMatrix.setUsage(T.DynamicDrawUsage);
    b.body.add(grains);
    grains.count = 0;
    b.rice = { nx, nz, dx, dz, cells, geo, surface, grains, dirty: true, peak: 0, total: 0, hot: 0, px: 0, pz: 0 };
  }
  const ht = (c) => c.q / (1 + c.c * 0.43);

  function height(b, x, z) {
    let r = b.rice, fx = clamp(x / r.dx + (r.nx - 1) / 2, 0, r.nx - 1.001), fz = clamp(z / r.dz + (r.nz - 1) / 2, 0, r.nz - 1.001), i = Math.floor(fx), j = Math.floor(fz), k = i + j * r.nx;
    return mix(mix(ht(r.cells[k]), ht(r.cells[k + 1]), fx - i), mix(ht(r.cells[k + r.nx]), ht(r.cells[k + r.nx + 1]), fx - i), fz - j);
  }
  const tmp = new T.Object3D();

  function rebuild(b) {
    const r = b.rice;
    if (!r.dirty) return;
    r.dirty = false;
    let idx = [], count = 0, area = r.dx * r.dz, sx = 0, sz = 0;
    r.total = r.peak = r.hot = 0;
    const pos = r.geo.attributes.position;
    for (let k = 0; k < r.cells.length; k++) {
      let c = r.cells[k], h = ht(c);
      pos.setY(k, b.floor + (h > 0.011 ? h - 0.014 : -0.032));
      if (h > 8e-3) {
        const quantity = c.q * area;
        r.total += quantity;
        r.hot += quantity * c.temp;
        sx += quantity * c.x;
        sz += quantity * c.z;
        if (h > r.peak) {
          r.peak = h;
          r.px = c.x;
          r.pz = c.z;
        }
        for (let j2 = 0; j2 < 2; j2++) {
          const o = c.offset, x = c.x + o[j2 * 3] * r.dx, z = c.z + o[j2 * 3 + 1] * r.dz, gh = height(b, x, z);
          if (gh < 0.012) continue;
          let gradX = (height(b, x + 0.034, z) - height(b, x - 0.034, z)) / 0.068, gradZ = (height(b, x, z + 0.034) - height(b, x, z - 0.034)) / 0.068;
          tmp.position.set(x, b.floor + gh - 2e-3, z);
          tmp.rotation.set(-Math.atan(gradZ) * 0.7, o[j2 * 3 + 2], Math.atan(gradX) * 0.7);
          tmp.scale.set(0.031, 0.024 * (1 - 0.2 * c.c), 0.063);
          tmp.updateMatrix();
          r.grains.setMatrixAt(count++, tmp.matrix);
        }
      } else if (c.q > 0) r.total += c.q * area;
      let i = k % r.nx, j = Math.floor(k / r.nx);
      if (i && j) {
        let a = k - r.nx - 1, bb = k - r.nx, cc = k - 1;
        if (Math.max(c.q, r.cells[a].q, r.cells[bb].q, r.cells[cc].q) > 0.012) idx.push(a, cc, bb, bb, cc, k);
      }
    }
    r.grains.count = count;
    r.grains.instanceMatrix.needsUpdate = true;
    pos.needsUpdate = true;
    r.geo.setIndex(idx);
    r.geo.computeVertexNormals();
    r.surface.visible = !!idx.length;
    r.mx = sx / (r.total || 1);
    r.mz = sz / (r.total || 1);
  }

  function distribute(b, x, z, vol, width, temperature = 1) {
    let r = b.rice, list = [], total = 0;
    for (let c of r.cells) {
      if (!c.ok) continue;
      let d = ((c.x - x) ** 2 + (c.z - z) ** 2) / (width * width);
      if (d > 8.5) continue;
      let w = Math.exp(-d * 0.92);
      list.push([c, w]);
      total += w;
    }
    if (!total) return;
    for (let [c, w] of list) {
      let add = vol * w / (total * r.dx * r.dz);
      c.temp = (c.q * c.temp + add * temperature) / (c.q + add);
      c.q += add;
      c.c *= 1 - add / c.q * 0.68;
    }
    r.dirty = true;
  }

  function pressRice(b, x, z, dx, dz, strength, rad = 0.31) {
    const r = b.rice;
    let taken = 0, heat = 0;
    for (let c of r.cells) {
      let d = ((c.x - x) ** 2 + (c.z - z) ** 2) / (rad * rad);
      if (d > 2.4 || c.q <= 0) continue;
      let f = strength * Math.exp(-d * 1.7);
      let remove = Math.min(c.q * 0.32, f * c.q * 0.53);
      taken += remove * r.dx * r.dz;
      heat += remove * r.dx * r.dz * c.temp;
      c.q -= remove;
      c.c += Math.min(f * 0.32, Math.max(0, 1.6 - c.c));
    }
    if (taken > 1e-6) {
      let len = Math.hypot(dx, dz);
      if (len < 0.015) {
        let side = x > 0 ? -1 : 1;
        dx = side * 0.63;
        dz = 0.77;
        len = 1;
      }
      let p = limitPoint(b, x + dx / len * rad * 1.36, z + dz / len * rad * 1.36);
      distribute(b, p[0], p[1], taken, rad * 0.86, heat / taken);
      r.dirty = true;
    }
  }

  function indent(item) {
    let b = item.box;
    if (!b || height(b, item.x, item.z) < 0.038) return;
    pressRice(b, item.x, item.z, Math.sin(item.yaw), Math.cos(item.yaw), 0.17, item.rx * 0.75);
  }

  function boxPoint(b, planeY = 0.2) {
    let p = onPlane(b.body.position.y + planeY * b.size);
    return b.body.worldToLocal(p);
  }

  function boxUnder(openOnly = true) {
    for (let b of boxes) {
      if (openOnly && b.state !== "open") continue;
      const p = boxPoint(b, b.floor + 0.18);
      if (inBox(b, p.x, p.z, 0.14)) return { b, x: p.x, z: p.z };
    }
    return null;
  }

  function localRadius(o, dx, dz) {
    let a = Math.atan2(dz, dx) + o.yaw;
    return 1 / Math.sqrt((Math.cos(a) / o.rx) ** 2 + (Math.sin(a) / o.rz) ** 2);
  }

  function makeItem(type, variant, long = false) {
    let obj = group(), art = group(obj), [rx, rz, h] = Food.sizes[type], model = Food.make(type, variant, long);
    art.add(model);
    model.position.y = -h / 2;
    art.position.y = h / 2;
    const o = { id: ++serial, type, rx: long ? rx * 1.45 : rx, rz, h, obj, art, model, variant, long, hull: Food.hull(type, variant, long), x: 0, z: 0, y: 0, yaw: 0, vx: 0, vz: 0, roll: 0, axis: 0, tilt: 0, pitch: 0, born: clock, heat: 1, squeeze: 0, flex: 0, settled: false, rest: 0, box: null, rolling: type === "tomato" || type === "chicken" };
    if (type === "lettuce") {
      o.edges = [{ x: 0, z: 0 }, { x: 0, z: 0 }];
      o.leafParts = [];
      model.traverse((part) => {
        if (!part.isMesh) return;
        part.geometry = part.geometry.clone();
        const positions = part.geometry.attributes.position;
        positions.setUsage(T.DynamicDrawUsage);
        o.leafParts.push({ geometry: part.geometry, rest: positions.array.slice() });
      });
    }
    K.tagged(obj, "food", o);
    return o;
  }

  function detach(o) {
    if (!o.box) return;
    let b = o.box;
    indent(o);
    b.items = b.items.filter((v) => v !== o);
    for (let other of b.items) {
      other.rest = 0;
      other.settled = false;
    }
    o.box = null;
    stage.attach(o.obj);
  }

  function fitFood(o, b, x, z) {
    const co = Math.cos(o.yaw), si = Math.sin(o.yaw);
    for (let pass = 0; pass < 2; pass++) for (let j = 0; j < 12; j++) {
      let angle = j * TAU / 12, xx = Math.cos(angle), zz = Math.sin(angle);
      if (o.type === "egg") {
        xx = Math.sign(xx) * Math.abs(xx) ** 0.59;
        zz = Math.sign(zz) * Math.abs(zz) ** 0.59;
      }
      let dx = xx * o.rx * co + zz * o.rz * si, dz = -xx * o.rx * si + zz * o.rz * co, p = limitPoint(b, x + dx, z + dz);
      x += p[0] - (x + dx);
      z += p[1] - (z + dz);
    }
    return [x, z];
  }

  function bendLeaf(o) {
    if (!o.leafParts) return;
    const stamp = [o.flex, ...o.edges.flatMap((e) => [e.x, e.z])].map((n) => Math.round(n * 160)).join(",");
    if (o.bendStamp === stamp) return;
    o.bendStamp = stamp;
    for (let part of o.leafParts) {
      const a = part.geometry.attributes.position, r = part.rest;
      for (let i = 0; i < a.count; i++) {
        let x = r[i * 3], y = r[i * 3 + 1], z = r[i * 3 + 2], u = x / o.rx, t = clamp(y / o.h, 0, 1), e = o.edges[u < 0 ? 0 : 1], f = u * u;
        a.setXYZ(i, x + e.x * f, y - Math.abs(e.z) * f * t * 0.15, z + e.z * f + o.flex * t * t * 0.29);
      }
      a.needsUpdate = true;
      part.geometry.computeVertexNormals();
      part.geometry.computeBoundingSphere();
    }
  }

  function place(o, b, x, z) {
    let pt = fitFood(o, b, x, z);
    o.order = ++placement;
    o.x = pt[0];
    o.z = pt[1];
    o.box = b;
    b.body.add(o.obj);
    o.obj.scale.set(1, 1 - (o.flatten || 0), 1);
    b.items.push(o);
    o.y = b.floor + height(b, o.x, o.z) + 0.22;
    o.vx = o.vz = 0;
    o.settled = false;
    o.rest = 0;
    o.since = 0;
    o.bounce = 0;
    o.firstHit = false;
    o.vy = -0.25;
    if (o.type === "lettuce") {
      o.flex = (o.x > 0 ? -1 : 1) * 0.12;
      o.pitch = 0.12;
    }
    if (o.rolling) {
      let gx = height(b, o.x + 0.13, o.z) - height(b, o.x - 0.13, o.z), gz = height(b, o.x, o.z + 0.13) - height(b, o.x, o.z - 0.13);
      o.vx = -gx * 2 + 0.08 * Math.sin(o.variant + o.x);
      o.vz = -gz * 2 + 0.065 * Math.cos(o.z + o.variant);
    }
    o.obj.position.set(o.x, o.y, o.z);
    o.obj.rotation.set(0, o.yaw, 0);
    sound(o.type === "tomato" ? "tomato" : "rice", 0.56, height(b, x, z));
    lesson = Math.max(lesson, 2);
  }

  function support(o, x, z) {
    let b = o.box, y = height(b, x, z) + b.floor;
    for (let s of b.items) {
      if (s === o || s.order >= o.order || s.type === "lettuce") continue;
      let dx = x - s.x, dz = z - s.z, dist = Math.hypot(dx, dz), r = localRadius(s, dx, dz);
      if (dist < r * 0.97 && s.y < o.y + 0.18) {
        let top = s.y + s.h * (1 - (s.flatten || 0)) * Math.sqrt(Math.max(0.03, 1 - (dist / r) ** 2));
        y = Math.max(y, top);
      }
    }
    return y;
  }

  function leafContact(o, s) {
    const co = Math.cos(s.yaw), si = Math.sin(s.yaw), dx = o.x - s.x, dz = o.z - s.z, u = dx * co - dz * si, v = dx * si + dz * co;
    let h = clamp((o.y + o.h * 0.33 - s.y) / s.h, 0.12, 0.96), best = Infinity, nx = 0, nz = 1;
    function edge(i) {
      let u2 = i / 6 - 1, e = s.edges[u2 < 0 ? 0 : 1];
      return [u2 * (0.39 + 0.35 * h) + e.x * u2 * u2, 0.12 * u2 * u2 - 0.09 + h * (0.07 + 0.19 * Math.cos(u2 * 6 + s.variant)) + h * h * 0.12 + e.z * u2 * u2 + s.flex * h * h * 0.29];
    }
    let prev = edge(0);
    for (let j = 1; j <= 12; j++) {
      let next = edge(j), dx2 = next[0] - prev[0], dz2 = next[1] - prev[1], t = clamp(((u - prev[0]) * dx2 + (v - prev[1]) * dz2) / (dx2 * dx2 + dz2 * dz2 || 1), 0, 1), xx = u - prev[0] - t * dx2, zz = v - prev[1] - t * dz2, dist = Math.hypot(xx, zz);
      if (dist < best) {
        best = dist;
        nx = xx / (dist || 1);
        nz = zz / (dist || 1);
      }
      prev = next;
    }
    let r = Math.min(o.rx, o.rz) + 0.044;
    if (best >= r || o.y > s.y + s.h * 0.92) return;
    let wx = nx * co + nz * si, wz = -nx * si + nz * co;
    contact(o, wx, wz, r - best, 0.93);
    s.flex = clamp(s.flex - nz * 0.021, -0.49, 0.49);
  }

  function contact(o, nx, nz, p, slide) {
    o.x += nx * p * 0.88;
    o.z += nz * p * 0.88;
    let dot = o.vx * nx + o.vz * nz;
    if (dot < 0) {
      o.vx = (o.vx - dot * nx) * slide;
      o.vz = (o.vz - dot * nz) * slide;
    }
  }
  // Contact samples span the underside. A long piece can bridge a small depression.

  function rollingSupport(o, x, z) {
    const b = o.box, a = o.yaw, co = Math.cos(a), si = Math.sin(a), rx = o.rx * 0.64, rz = o.rz * 0.59;
    let y = height(b, x, z);
    for (let sign of [-1, 1]) {
      y = Math.max(y, height(b, x + sign * rx * co, z - sign * rx * si) - o.h * 0.12, height(b, x + sign * rz * si, z + sign * rz * co) - o.h * 0.1);
    }
    return y;
  }

  function physics(o, dt) {
    let b = o.box;
    o.since += dt;
    o.heat *= Math.exp(-dt / 230);
    let h = height(b, o.x, o.z), target = b.floor + h - 0.026 * Math.min(1, h * 4);
    if (o.rolling) {
      if (!o.settled) {
        let g = 0.105, gx = (rollingSupport(o, o.x + g, o.z) - rollingSupport(o, o.x - g, o.z)) / (2 * g), gz = (rollingSupport(o, o.x, o.z + g) - rollingSupport(o, o.x, o.z - g)) / (2 * g);
        const drag = Math.exp(-dt * (o.type === "tomato" ? 2.5 : 2.05));
        o.vx = clamp((o.vx - gx * dt * 4.2) * drag, -2.6, 2.6);
        o.vz = clamp((o.vz - gz * dt * 4.2) * drag, -2.6, 2.6);
        let ox = o.x, oz = o.z;
        o.x += o.vx * dt;
        o.z += o.vz * dt;
        for (let s of b.items) {
          if (s === o) continue;
          if (s.type === "lettuce") {
            leafContact(o, s);
            continue;
          }
          let dx = o.x - s.x, dz = o.z - s.z, l = Math.hypot(dx, dz) || 1e-3, r = localRadius(o, -dx, -dz) + localRadius(s, dx, dz);
          if (l < r * 0.91 && Math.abs(o.y - s.y) < Math.max(o.h, s.h) * 0.82) {
            let nx = dx / l, nz = dz / l;
            if (Math.abs(dx) + Math.abs(dz) < 1e-3) nx = 1;
            contact(o, nx, nz, r * 0.91 - l, 0.5);
          }
        }
        const px = localRadius(o, 1, 0), pz = localRadius(o, 0, 1), pad = Math.min(px, pz) * 0.87;
        let [x, z] = limitPoint(b, o.x, o.z, pad);
        x = clamp(x, -b.w / 2 + 0.15 + px * 0.84, b.w / 2 - 0.15 - px * 0.84);
        z = clamp(z, -b.d / 2 + 0.15 + pz * 0.84, b.d / 2 - 0.15 - pz * 0.84);
        if (Math.abs(x - o.x) > 1e-3) o.vx *= 0.08;
        if (Math.abs(z - o.z) > 1e-3) o.vz *= 0.08;
        o.x = x;
        o.z = z;
        let dist = Math.hypot(x - ox, z - oz);
        if (dist > 4e-5) {
          o.axis = Math.atan2(z - oz, x - ox);
          o.roll += Math.min(dist, 0.095) / Math.min(o.rx, o.rz) * 1.2;
        }
        o.rest = dist / dt < 0.043 ? o.rest + dt : 0;
        if (o.rest > 0.4) {
          o.settled = true;
          o.vx = o.vz = 0;
          indent(o);
        }
      }
      target = b.floor + rollingSupport(o, o.x, o.z) - 0.026 * Math.min(1, h * 4);
      if (o.type === "chicken") target += Math.abs(Math.sin(o.roll * 2)) * 0.028;
    } else if (o.type === "egg" || o.type === "sausage") {
      let ux = Math.cos(o.yaw) * o.rx * 0.73, uz = -Math.sin(o.yaw) * o.rx * 0.73, a = support(o, o.x - ux, o.z - uz), bb = support(o, o.x + ux, o.z + uz);
      target = (a + bb) / 2;
      o.tilt = mix(o.tilt, clamp(Math.atan2(bb - a, o.rx * 1.46), -0.69, 0.69), 1 - Math.exp(-dt * 8));
    } else {
      target = support(o, o.x, o.z);
      if (o.type === "lettuce") {
        let closest = b.w * 0.5 - Math.abs(o.x);
        let bend = (o.z > 0 ? -1 : 1) * (0.12 + clamp(0.7 - closest, 0, 0.4));
        o.pitch = mix(o.pitch, bend + o.flex, 0.032);
        o.flex *= Math.exp(-dt * 0.72);
        bendLeaf(o);
      }
    }
    if (o.y > target + 6e-3 || o.vy > 0) {
      o.vy = (o.vy || 0) - dt * 7.8;
      o.y += o.vy * dt;
      if (o.y <= target) {
        o.y = target;
        if (o.type === "tomato" && !o.firstHit) {
          o.vy = 0.43 / (1 + h);
          o.firstHit = true;
          sound("tomato", 0.48, h);
        } else o.vy = 0;
      }
    } else {
      o.y = mix(o.y, target, 1 - Math.exp(-dt * 10));
      o.vy = 0;
    }
    o.obj.position.set(o.x, o.y, o.z);
    o.obj.rotation.set(o.pitch, o.yaw, o.tilt, "YXZ");
    if (o.rolling) {
      let a = o.axis + o.yaw;
      o.art.rotation.set(Math.sin(a) * o.roll, 0, -Math.cos(a) * o.roll);
    }
    o.squeeze *= Math.exp(-dt * 7);
    let jig = o.type === "broccoli" ? Math.sin(o.since * 23) * Math.exp(-o.since * 4) * 0.079 : 0;
    o.art.rotation.z = o.rolling ? o.art.rotation.z : jig;
    o.art.scale.set(1 + o.squeeze * 0.15, 1 - o.squeeze * 0.29, 1 + o.squeeze * 0.15);
  }
  const localMatrix = new T.Matrix4();

  function localModel(o) {
    o.obj.updateMatrix();
    o.art.updateMatrix();
    o.model.updateMatrix();
    return localMatrix.multiplyMatrices(o.obj.matrix, o.art.matrix).multiply(o.model.matrix);
  }

  function pileStats(b) {
    rebuild(b);
    let r = b.rice, m = 0.28 + (b.red ? 0.16 : 0.35) + r.total * 1.03, cx = r.mx * r.total, cz = r.mz * r.total, high = b.floor + r.peak, hx = r.px, hz = r.pz;
    for (let o of b.items) {
      let weight = { egg: 0.43, chicken: 0.49, broccoli: 0.23, tomato: 0.28, sausage: 0.3, lettuce: 0.055 }[o.type];
      m += weight;
      cx += o.x * weight;
      cz += o.z * weight;
      const transform = localModel(o);
      o.top = -Infinity;
      for (let sample of o.hull) {
        const p = v1.copy(sample).applyMatrix4(transform);
        o.top = Math.max(o.top, p.y);
        if (p.y > high) {
          high = p.y;
          hx = p.x;
          hz = p.z;
        }
      }
    }
    b.mass = m;
    b.centerX = cx / m;
    b.centerZ = cz / m;
    b.peakX = hx;
    b.peakZ = hz;
    let gap = Math.max(0, high - b.h - 0.046);
    return { gap, hx, hz };
  }

  function lidFit(b) {
    let { gap, hx, hz } = pileStats(b);
    if (gap < 1e-3) {
      b.gap = b.tilt = b.tiltX = 0;
      return 0;
    }
    let nx = hx / (b.w * 0.5), nz = hz / (b.d * 0.5), sum = Math.abs(nx) + Math.abs(nz) + 0.01;
    let center = gap / (1 + (nx * nx + nz * nz) / sum), sx = clamp(center * nx / sum / (b.w * 0.5), -0.34, 0.34), sz = clamp(center * nz / sum / (b.d * 0.5), -0.34, 0.34);
    let offset = 0;
    for (let c of b.rice.cells) offset = Math.max(offset, b.floor + ht(c) - b.h - 0.025 - sx * c.x - sz * c.z);
    for (let o of b.items) {
      let m = localModel(o);
      for (let s of o.hull) {
        let p = v1.copy(s).applyMatrix4(m);
        offset = Math.max(offset, p.y - b.h - 0.018 - sx * p.x - sz * p.z);
      }
    }
    b.gap = Math.max(offset, Math.abs(sx) * b.w * 0.5 + Math.abs(sz) * b.d * 0.5);
    b.tilt = Math.atan(sx);
    b.tiltX = -Math.atan(sz);
    return gap;
  }

  function closeLid(b) {
    if (b.state !== "open") return;
    active = b;
    b.state = "lowering";
    let gap = lidFit(b), start = b.lid.position.clone(), q = b.lid.quaternion.clone();
    K.seatLid(b);
    let dest = b.lid.position.clone(), end = b.lid.quaternion.clone();
    b.lid.position.copy(start);
    b.lid.quaternion.copy(q);
    animate(0.48, (t) => {
      b.lid.position.lerpVectors(start, dest, smooth(t));
      b.lid.position.y += Math.sin(t * PI) * 0.24;
      b.lid.quaternion.copy(q).slerp(end, smooth(t));
    }, () => {
      sound("lid", 0.52, gap);
      if (gap < 0.035) closed(b);
      else b.state = "ajar";
    });
  }

  function pressLid(b, dt, point) {
    const distance = point ? Math.hypot((point.x - b.peakX) / b.w, (point.z - b.peakZ) / b.d) : 0;
    const force = dt * 1.9 * clamp(1.12 - distance, 0.33, 1);
    let px = b.peakX, pz = b.peakZ;
    for (let c of b.rice.cells) {
      let d = Math.hypot(c.x - px, c.z - pz);
      if (c.q > 0.015) c.c = Math.min(4, c.c + force * Math.exp(-d * d / 0.9) * 2);
    }
    // Rice beneath the highest bite moves out under the pressing lid.
    pressRice(b, px, pz, px > 0 ? -1 : 1, pz > 0 ? -1 : 1, Math.min(0.5, force * 2.2), 0.49);
    b.rice.dirty = true;
    for (let o of b.items) {
      const ceiling = b.h + b.gap + o.x * Math.tan(b.tilt) - o.z * Math.tan(b.tiltX);
      if (o.top >= ceiling - 0.14) {
        o.flatten = Math.min(0.79, (o.flatten || 0) + force * (o.type === "broccoli" || o.type === "lettuce" ? 0.78 : 0.36));
        o.obj.scale.y = 1 - o.flatten;
        o.y = mix(o.y, b.floor + height(b, o.x, o.z) - 0.03, clamp(force, 0, 1));
        o.obj.position.y = o.y;
      }
    }
    let gap = lidFit(b);
    K.seatLid(b);
    if (gap < 0.034) closed(b);
  }

  function reopen(b) {
    b.state = "opening";
    const start = b.lid.position.clone(), q = b.lid.quaternion.clone();
    K.restLid(b);
    const end = b.lid.position.clone(), qe = b.lid.quaternion.clone();
    animate(0.34, (t) => {
      b.lid.position.lerpVectors(start, end, smooth(t));
      b.lid.position.y += 0.31 * Math.sin(PI * t);
      b.lid.quaternion.copy(q).slerp(qe, smooth(t));
    }, () => {
      b.gap = b.tilt = b.tiltX = 0;
      b.state = "open";
      active = null;
    });
    sound("lid", 0.27);
  }

  function closed(b) {
    b.gap = b.tilt = b.tiltX = 0;
    b.state = "closed";
    K.seatLid(b);
    active = b;
    carry = null;
    gesture = null;
    mode = "turn";
    people.forEach((p) => {
      p.root.visible = true;
      p.hand.root.rotation.y = 0;
      for (let f of p.hand.fingers) {
        f.rotation.x = 0;
        f.rotation.y = f.userData.rest;
      }
    });
    sound("lid", 0.85);
    startCamera("deliver", b, 2.65);
  }
  const cameraPose = { target: new V(), dir: new V(0, 0.9, 0.435).normalize(), dist: 20 };

  function direction(yaw, elev) {
    return new V(Math.sin(yaw) * Math.cos(elev), Math.sin(elev), Math.cos(yaw) * Math.cos(elev));
  }

  function cookView() {
    let aspect = camera.aspect;
    let width = portrait ? Math.max(7.75, 13.2 * aspect) : Math.max(14.35, 8.72 * aspect);
    return { target: new V(portrait ? -0.03 : -0.21, portrait ? 0.4 : 0.46, portrait ? 0.06 : 0.12), dir: direction(portrait ? 0.016 : 0.042, portrait ? 1.15 : 1.08), dist: width / (2 * Math.tan(camera.fov * PI / 360) * aspect) };
  }

  function frameView(points, dir, slack = 1.12) {
    let min = new V(Infinity, Infinity, Infinity), max = new V(-Infinity, -Infinity, -Infinity);
    for (let p of points) {
      min.min(p);
      max.max(p);
    }
    let target = min.clone().lerp(max, 0.5);
    const right = new V().crossVectors(new V(0, 1, 0), dir).normalize(), up = new V().crossVectors(dir, right), f = Math.tan(camera.fov * PI / 360);
    let dist = 4;
    for (let p of points) {
      const q = p.clone().sub(target);
      dist = Math.max(dist, q.dot(dir) + Math.max(Math.abs(q.dot(right)) / (f * camera.aspect), Math.abs(q.dot(up)) / f) * slack);
    }
    return { target, dir, dist };
  }

  function diningView(b, only = false) {
    let pts = [];
    for (let p of people) {
      let c = p.root.position;
      for (let x of [-1.75, 1.75]) for (let z of [-1.65, 1.38]) pts.push(new V(c.x + x * p.root.scale.x, 0.4, c.z + z));
    }
    if (!only && b) {
      for (let x of [-b.w / 2, b.w / 2]) for (let z of [-b.d / 2, b.d / 2]) pts.push(new V(b.home.x + x * b.size, 0.4, b.home.z + z * b.size));
    }
    if (only) {
      pts.push(K.next.position.clone().add(new V(0, 1, -0.45)));
      for (let box of boxes) {
        for (let obj of [box.body, box.lid]) for (let x of [-1, 1]) for (let z of [-1, 1]) pts.push(obj.localToWorld(new V(x * box.w * 0.5, box.h, z * box.d * 0.5)));
      }
    }
    return frameView(pts, direction(only ? 0.09 : portrait ? 0.23 : 0.75, only ? 0.91 : portrait ? 0.76 : 0.5), only ? 1.11 : 1.1);
  }

  function installPose(p) {
    cameraPose.target.copy(p.target);
    cameraPose.dir.copy(p.dir);
    cameraPose.dist = p.dist;
    camera.position.copy(p.target).addScaledVector(p.dir, p.dist);
    camera.lookAt(p.target);
    camera.updateMatrixWorld();
  }

  function lerpPose(a, b, t) {
    return { target: a.target.clone().lerp(b.target, t), dir: a.dir.clone().lerp(b.dir, t).normalize(), dist: mix(a.dist, b.dist, t) };
  }

  function startCamera(to, b, duration) {
    let start = { target: cameraPose.target.clone(), dir: cameraPose.dir.clone(), dist: cameraPose.dist };
    let end = to === "cook" ? cookView() : diningView(b, to === "table"), corner = b ? b.body.localToWorld(new V(b.w * 0.28, b.h, b.d * 0.35)) : end.target;
    let middle = { target: corner.clone().add(new V(0, 0.04, -0.16)), dir: direction(0.72, 0.21), dist: portrait ? 8.5 : 8.95 };
    transition = { to, b, start, end, middle, at: now(), duration };
  }

  function updateCamera() {
    if (!transition) return;
    let t = clamp((now() - transition.at) / transition.duration, 0, 1), a = transition, p;
    if (a.to === "deliver") {
      if (t < 0.48) p = lerpPose(a.start, a.middle, smooth(t / 0.48));
      else p = lerpPose(a.middle, a.end, smooth((t - 0.48) / 0.52));
    } else p = lerpPose(a.start, a.end, smooth(t));
    installPose(p);
    if (t === 1) {
      mode = a.to;
      transition = null;
      lastInput = now();
      if (mode === "table") K.next.visible = true;
      if (mode === "cook") active = null;
    }
  }
  // The contents stay parented to the box during the lift and the return to the plate.

  function receive(b, p) {
    if (b.state !== "closed" && b.state !== "moving") return;
    b.recipient = p;
    p.received.push(b);
    b.state = "receiving";
    mode = "receiving";
    pileStats(b);
    const start = b.body.position.clone(), end = K.platePos(b), near = p.root.localToWorld(new V(p.child ? 0.42 : -0.48, 0.34, -0.62));
    let duration = 1 + Math.min(1, b.mass * 0.15);
    p.other.root.visible = !b.red;
    const home = p.hand.root.position.clone(), otherHome = p.other.root.position.clone();
    let counts = { rice: b.rice.total };
    for (let o of b.items) counts[o.type] = (counts[o.type] || 0) + 1;
    let previousMeal = history[p.index].at(-1);
    if (previousMeal?.morning === day) {
      for (let [type, count] of Object.entries(counts)) previousMeal[type] = (previousMeal[type] || 0) + count;
    } else history[p.index].push({ ...counts, morning: day });
    history[p.index] = history[p.index].slice(-12);
    save();
    sound("rice", 0.49, 0.8);
    animate(duration, (t) => {
      const phase = t < 0.49 ? t / 0.49 : (t - 0.49) / 0.51;
      let arc = Math.sin(t * PI);
      if (t < 0.49) b.body.position.lerpVectors(start, near, smooth(phase));
      else b.body.position.lerpVectors(near, end, smooth(phase));
      let depression = Math.min(0.23, 0.045 + b.mass * 0.045) * Math.sin(PI * clamp((t - 0.1) / 0.76, 0, 1));
      b.body.position.y += arc * (0.26 + Math.min(0.13, b.mass * 0.026)) - depression * 0.48;
      b.body.rotation.z = -b.centerX * 0.26 * arc;
      b.body.rotation.x = b.centerZ * 0.19 * arc;
      b.body.rotation.y = mix(b.yaw, b.yaw * 0.38, smooth(t));
      p.hand.root.position.copy(home);
      p.hand.root.position.z += arc * 0.62;
      p.hand.root.position.y += arc * 0.22 - depression;
      p.hand.root.rotation.z = -b.centerX * 0.08 * arc;
      if (!b.red) {
        p.other.root.position.copy(otherHome);
        p.other.root.position.z += arc * 0.75;
        p.other.root.position.y += arc * 0.14 - depression * 0.6;
      }
      for (let j = 0; j < 5; j++) {
        let f = p.hand.fingers[j];
        f.rotation.y = f.userData.rest + (j - 1.6) * 0.11 * arc;
        f.rotation.x = -0.32 * arc;
      }
      K.seatLid(b);
    }, () => {
      b.state = "delivered";
      mode = "uncover";
      lastInput = now();
      p.hand.root.position.copy(home);
      p.other.root.position.copy(otherHome);
      p.hand.root.rotation.z = 0;
      b.body.rotation.x = b.body.rotation.z = 0;
      K.seatLid(b);
      sound("lid", 0.36, 0.5);
    });
  }

  function uncover(b) {
    if (b.state !== "delivered") return;
    b.state = "uncovering";
    let start = b.lid.position.clone(), q = b.lid.quaternion.clone();
    K.openedLid(b);
    let end = b.lid.position.clone(), qe = b.lid.quaternion.clone();
    animate(0.53, (t) => {
      b.lid.position.lerpVectors(start, end, smooth(t));
      b.lid.position.y += 0.47 * Math.sin(PI * t);
      b.lid.quaternion.copy(q).slerp(qe, smooth(t));
    }, () => {
      b.state = "served";
      let done = boxes.every((v) => v.state === "served");
      mode = "turn";
      if (done) K.next.visible = true;
      startCamera(done ? "table" : "cook", b, done ? 1.3 : 1.65);
    });
    sound("lid", 0.42);
  }

  function discardModel(root) {
    root.traverse((o) => {
      if (o.isInstancedMesh) o.dispose();
    });
    root.removeFromParent();
  }

  function discardItem(o) {
    if (o.leafParts) for (let p of o.leafParts) p.geometry.dispose();
    discardModel(o.obj);
  }

  function nextMorning() {
    if (mode !== "table") return;
    day++;
    save();
    mode = "turn";
    let origin = K.next.position.clone();
    animate(0.48, (t) => {
      K.next.position.z = origin.z + t * 0.81;
      K.next.position.y = 0.02 + Math.sin(t * 1.8) * 0.27;
    }, () => {
      for (let b of boxes) {
        for (let o of b.items) discardItem(o);
        b.items = [];
        for (let c of b.rice.cells) c.q = c.c = c.temp = 0;
        b.rice.dirty = true;
        b.state = "open";
        b.recipient = null;
        b.gap = b.tilt = b.tiltX = 0;
      }
      for (let p of people) {
        p.received = [];
        p.other.root.visible = false;
      }
      carry = active = null;
      lesson = 0;
      serial = 0;
      scoopSurface(0);
      K.layout(portrait, day, true);
      varySupplies();
      const newBox = boxes[0], home = newBox.home.clone(), departure = origin.clone().add(new V(0, 0.31, 0.59));
      newBox.body.position.copy(departure);
      remember();
      animate(1.78, (u) => {
        newBox.body.position.lerpVectors(departure, home, smooth(u));
        newBox.body.position.y += Math.sin(PI * u) * 0.39;
        newBox.body.rotation.y = mix(-0.19, newBox.yaw, smooth(u));
      });
      startCamera("cook", null, 1.85);
    });
  }

  function varySupplies() {
    for (let bowl of bowls) {
      for (let i = 0; i < bowl.servings.length; i++) {
        let f = bowl.servings[i];
        const longPiece = bowl.type === "chicken" && day % 6 === 3 && i === 1;
        let model = Food.make(bowl.type, (i + day) % 4, longPiece);
        model.userData.longPiece = longPiece;
        model.position.copy(f.position);
        model.rotation.copy(f.rotation);
        model.position.x += day ? Math.sin(day + i) * 0.019 : 0;
        discardModel(f);
        bowl.root.add(model);
        bowl.servings[i] = model;
      }
    }
  }

  function nearPerson(pos) {
    let best = null, dist = Infinity;
    for (let p of people) {
      let lp = p.root.worldToLocal(pos.clone()), d = Math.hypot(lp.x * 0.86, lp.z + 0.21);
      if (d < 2.02 && d < dist) {
        best = p;
        dist = d;
      }
    }
    return best;
  }

  function approachHands(pos) {
    for (let p of people) {
      let lp = p.root.worldToLocal(pos.clone()), d = Math.hypot(lp.x, lp.z), near = clamp(1 - (d - 1.1) / 4, 0, 1);
      for (let j = 0; j < 5; j++) {
        let f = p.hand.fingers[j], side = (lp.x < 0 ? 4 - j : j) * 0.08;
        f.rotation.y = f.userData.rest + (j - 1.7) * 0.095 * clamp(near * 1.3 - side, 0, 1);
        f.rotation.x = -0.15 * near;
      }
    }
  }

  function landDelivered(b, point) {
    let p = nearPerson(point) || nearPerson(b.body.position);
    if (p) {
      receive(b, p);
      return;
    }
    b.state = "closed";
    K.seatLid(b);
  }
  const cookerGrains = pot.grains.instanceMatrix.array.slice();

  function scoopSurface(t) {
    const data = pot.grains.instanceMatrix.array;
    for (let i = 0; i < pot.grains.count; i++) {
      let j = i * 16, x = cookerGrains[j + 12] - 0.16, z = cookerGrains[j + 14] - 0.05, r = x * x / 0.14 + z * z / 0.22;
      if (r > 4) continue;
      let w = Math.exp(-r * 1.5) * t;
      data[j + 12] = cookerGrains[j + 12] + x * w * 0.36;
      data[j + 13] = cookerGrains[j + 13] - 0.074 * w;
      data[j + 14] = cookerGrains[j + 14] + z * w * 0.36;
    }
    pot.grains.instanceMatrix.needsUpdate = true;
  }

  function riceStart() {
    if (carry && carry.type === "rice") return;
    clearCarry();
    carry = { type: "rice", vol: 0.89, loaded: now(), path: [], strokeBox: null, deposited: 0 };
    pot.load.visible = true;
    pot.load.scale.setScalar(0.19);
    pot.paddle.position.y -= 0.12;
    animate(0.32, (t) => {
      if (!carry || carry.type !== "rice") return;
      pot.load.scale.setScalar(0.28 + 0.72 * smooth(t));
      scoopSurface(t);
      if (!gesture || !gesture.moved) pot.paddle.position.y = pot.rest.y - 0.13 + 0.49 * smooth(t);
    });
    sound("rice", 0.86, 0.43);
    lesson = Math.max(1, lesson);
  }

  function pickFood(hit) {
    let b = hit.data, idx = b.servings.indexOf(hit.serving);
    if (idx < 0) idx = Math.abs(serial) % b.servings.length;
    let source = b.servings[idx];
    let o = makeItem(b.type, (idx + day) % 4, source.userData.longPiece === true);
    stage.add(o.obj);
    source.getWorldPosition(o.obj.position);
    o.yaw = b.root.rotation.y + source.rotation.y;
    source.visible = false;
    o.obj.rotation.copy(source.rotation);
    o.obj.position.y += 0.35;
    o.squeeze = 0.38;
    o.art.scale.set(1.04, 0.9, 1.04);
    carry = { type: "food", o, source, origin: null };
    sound("rice", 0.42, 0.24);
  }

  function pickup(o) {
    let old = { b: o.box, x: o.x, z: o.z };
    detach(o);
    carry = { type: "food", o, origin: old };
    o.obj.position.y += 0.37;
    o.art.scale.set(1.06, 0.87, 1.06);
    sound("rice", 0.44, 0.6);
  }

  function clearCarry() {
    if (!carry) return;
    if (carry.type === "rice") {
      pot.load.visible = false;
      K.restPaddle();
    } else {
      let { o, origin, source } = carry;
      if (source) source.visible = true;
      if (origin) place(o, origin.b, origin.x, origin.z);
      else discardItem(o);
    }
    carry = null;
  }

  function dropFood(target) {
    let { o, source } = carry;
    if (source?.userData.longPiece) {
      const bowl = source.parent.userData.pick.data;
      const slot = bowl.servings.indexOf(source);
      const refill = Food.make(bowl.type, o.variant);
      refill.position.copy(source.position);
      refill.rotation.copy(source.rotation);
      discardModel(source);
      bowl.root.add(refill);
      bowl.servings[slot] = refill;
    } else if (source) {
      source.visible = true;
    }
    carry = null;
    place(o, target.b, target.x, target.z);
  }

  function riceTrail(target) {
    let c = carry;
    if (!c || c.type !== "rice" || !target) return;
    let { b, x, z } = target;
    if (c.strokeBox !== b) {
      c.strokeBox = b;
      c.path = [[x, z]];
      c.lastX = x;
      c.lastZ = z;
      return;
    }
    let d = Math.hypot(x - c.lastX, z - c.lastZ);
    if (d < 0.038) return;
    let use = Math.min(c.vol * 0.87 - c.deposited, d * 0.375);
    if (use > 0) {
      let n = Math.ceil(d / 0.12);
      for (let i = 1; i <= n; i++) distribute(b, mix(c.lastX, x, i / n), mix(c.lastZ, z, i / n), use / n, 0.305);
      c.deposited += use;
      pot.load.scale.setScalar(Math.cbrt(Math.max(0.1, 1 - c.deposited / c.vol)));
    }
    c.path.push([x, z]);
    c.lastX = x;
    c.lastZ = z;
  }

  function depositRice(target) {
    let { b, x, z } = target, c = carry, remaining = c.vol - c.deposited, path = c.strokeBox === b ? c.path : [];
    if (path.length > 2) {
      let stride = Math.max(1, Math.ceil(path.length / 18)), samples = path.filter((_, i) => i % stride === 0);
      for (let [px, pz] of samples) distribute(b, px, pz, remaining * 0.72 / samples.length, 0.303);
      distribute(b, x, z, remaining * 0.28, 0.32);
    } else distribute(b, x, z, remaining, 0.46);
    for (let o of b.items) {
      o.settled = false;
      o.rest = 0;
    }
    pot.load.visible = false;
    K.restPaddle();
    carry = null;
    lesson = Math.max(lesson, 1);
    sound("rice", 0.92, 0.67);
  }

  function carryMove() {
    let target = boxUnder();
    if (carry.type === "rice") {
      let p = target ? target.b.body.localToWorld(new V(target.x, target.b.floor + height(target.b, target.x, target.z) + 0.1, target.z)) : onPlane(1.66);
      pot.paddle.position.copy(p);
      pot.paddle.rotation.set(-0.28, pot.restYaw, -0.09);
      if (target) riceTrail(target);
    } else {
      let p = target ? target.b.body.localToWorld(new V(target.x, target.b.floor + height(target.b, target.x, target.z) + 0.52, target.z)) : onPlane(1.39);
      carry.o.obj.position.copy(p);
      carry.o.obj.rotation.set(-0.14, carry.o.yaw, -0.09);
    }
  }

  function hits() {
    let targets = mode === "cook" ? [...boxes.filter((b) => !b.recipient).flatMap((b) => [b.lid, b.body]), pot.paddle, pot.base, ...bowls.map((b) => b.root)] : mode === "table" ? [K.next] : [...active ? [active.lid, active.body] : [], ...people.map((p) => p.root)];
    const hits2 = ray.intersectObjects(targets.filter((o) => o.visible), true);
    for (let hit of hits2) {
      let o = hit.object, serving = null, tag = null;
      while (o) {
        if (!o.visible) {
          tag = null;
          break;
        }
        if (!tag && o.userData.pick) tag = o.userData.pick;
        if (bowls.some((b) => b.root === o.parent)) serving = o;
        o = o.parent;
      }
      if (tag) {
        if (tag.type === "food" && tag.data.box && tag.data.box.state !== "open") tag = { type: tag.data.box.state === "ajar" ? "lid" : "box", data: tag.data.box };
        return { ...tag, serving, point: hit.point };
      }
    }
    return null;
  }
  const screen = renderer.domElement;

  function begin(e) {
    if (gesture || e.button > 0) return;
    wakeAudio();
    lastInput = now();
    rayAt(e.clientX, e.clientY);
    let hit = hits();
    if (!hit) return;
    screen.setPointerCapture(e.pointerId);
    let g = gesture = { id: e.pointerId, x: e.clientX, y: e.clientY, lastX: e.clientX, lastY: e.clientY, time: now(), moved: false, hit, kind: "none", lastTone: 0 };
    if (transition) return;
    if (mode === "table") {
      if (hit.type === "next") {
        g.kind = "new";
        K.next.position.y = 0.093;
      }
      return;
    }
    if (mode === "uncover" && active && (hit.type === "lid" || hit.type === "box")) {
      g.kind = "uncover";
      g.start = active.lid.position.clone();
      return;
    }
    if (mode === "deliver") {
      if (hit.type === "person") {
        receive(active, hit.data);
        return;
      }
      if (hit.type === "box" || hit.type === "lid") {
        g.kind = "deliver";
        active.state = "moving";
        g.offset = active.body.position.clone().sub(onPlane(0.18));
        active.body.position.y += 0.08;
        K.seatLid(active);
      }
      return;
    }
    if (mode !== "cook") return;
    if (carry) {
      const targ = boxUnder();
      if (targ && hit.type !== "lid") {
        g.kind = "carry";
        g.placing = true;
        return;
      }
      if (hit.type === "rice" && carry.type === "rice") {
        g.kind = "carry";
        pot.paddle.rotation.z += 0.18;
        sound("rice", 0.29);
        return;
      }
      if (hit.type === "supply" || hit.type === "rice" || hit.type === "lid") clearCarry();
      else {
        g.kind = "carry";
        return;
      }
    }
    if (hit.type === "rice") {
      riceStart();
      g.kind = "carry";
      return;
    }
    if (hit.type === "supply") {
      pickFood(hit);
      g.kind = "carry";
      return;
    }
    if (hit.type === "food" && hit.data.box.state === "open") {
      let o = hit.data, local = o.obj.worldToLocal(hit.point.clone());
      if (o.type === "lettuce" && Math.abs(local.x) > o.rx * 0.42) {
        g.kind = "leafEdge";
        g.o = o;
        g.side = local.x < 0 ? 0 : 1;
        g.finger = o.box.body.worldToLocal(hit.point.clone());
        g.original = { ...o.edges[g.side] };
        o.flex = 0.1;
        return;
      }
      pickup(o);
      g.kind = "carry";
      return;
    }
    if (hit.type === "lid") {
      let b = hit.data;
      g.b = b;
      g.start = b.lid.position.clone();
      if (b.state === "open") {
        g.kind = "lid";
        b.lid.position.y += 0.11;
      } else if (b.state === "ajar") {
        g.kind = "lidPress";
        g.point = b.body.worldToLocal(hit.point.clone());
        sound("rice", 0.39, 0.8);
      }
      return;
    }
    if (hit.type === "box" && hit.data.state === "open") {
      let b = hit.data, p = b.body.worldToLocal(hit.point.clone());
      if (height(b, p.x, p.z) > 0.024) {
        g.kind = "press";
        g.b = b;
        g.px = p.x;
        g.pz = p.z;
        pressRice(b, p.x, p.z, 0, 0, 0.25);
        b.items.forEach((o) => {
          o.settled = false;
          o.rest = 0;
        });
        sound("rice", 0.54, 0.3);
      } else {
        let sign = p.x >= 0 ? 1 : -1;
        animate(0.24, (u) => {
          if (b.state !== "open") return;
          b.body.rotation.z = -sign * 0.023 * Math.sin(PI * u);
          b.body.position.y = b.home.y + 0.045 * Math.sin(PI * u);
        });
        sound("lid", 0.3, 0.15);
      }
    }
  }

  function move(e) {
    if (!gesture || e.pointerId !== gesture.id) return;
    let g = gesture;
    rayAt(e.clientX, e.clientY);
    lastInput = now();
    let distance = Math.hypot(e.clientX - g.x, e.clientY - g.y);
    if (distance > 5) g.moved = true;
    g.lastX = e.clientX;
    g.lastY = e.clientY;
    if (!g.moved) return;
    if (g.kind === "leafEdge") {
      let o = g.o, b = o.box, p = boxPoint(b, g.finger.y);
      if (!inBox(b, p.x, p.z, 0.34)) {
        pickup(o);
        g.kind = "carry";
        carryMove();
        return;
      }
      let cx = clamp(p.x, -b.w / 2 + 0.12, b.w / 2 - 0.12) - g.finger.x, cz = clamp(p.z, -b.d / 2 + 0.12, b.d / 2 - 0.12) - g.finger.z, co = Math.cos(o.yaw), si = Math.sin(o.yaw), edge = o.edges[g.side];
      edge.x = clamp(g.original.x + cx * co - cz * si, -0.32, 0.32);
      edge.z = clamp(g.original.z + cx * si + cz * co, -0.69, 0.69);
      bendLeaf(o);
      for (let n of b.items) {
        n.settled = false;
        n.rest = 0;
      }
      return;
    }
    if (g.kind === "carry" && carry) {
      carryMove();
      return;
    }
    if (g.kind === "press") {
      let p = boxPoint(g.b, g.b.floor + height(g.b, g.px, g.pz));
      if (inBox(g.b, p.x, p.z, 0.05)) {
        let dx = p.x - g.px, dz = p.z - g.pz;
        pressRice(g.b, p.x, p.z, dx, dz, Math.min(0.47, Math.hypot(dx, dz) * 1.5));
        g.dx = dx;
        g.dz = dz;
        g.px = p.x;
        g.pz = p.z;
      }
      return;
    }
    if (g.kind === "lid") {
      let p = onPlane(1.22);
      g.b.lid.position.copy(p);
      g.b.lid.rotation.x = 0.39;
      return;
    }
    if (g.kind === "lidPress" && g.b.state === "ajar" && distance > 21) {
      g.kind = "none";
      reopen(g.b);
      return;
    }
    if (g.kind === "deliver" && active) {
      let p = onPlane(0.18).add(g.offset);
      active.body.position.set(clamp(p.x, -7, 7), 0.2, clamp(p.z, -11, 5));
      active.body.rotation.z = -active.centerX * 0.028;
      K.seatLid(active);
      approachHands(active.body.position);
      return;
    }
    if (g.kind === "uncover" && mode === "uncover") {
      const d = onPlane(active.body.position.y + active.h).sub(g.hit.point);
      active.lid.position.copy(g.start).addScaledVector(d, 0.65);
      active.lid.position.y += 0.055;
      return;
    }
    if (g.kind === "new" && mode === "table") {
      K.next.position.z += 0.012;
      K.next.position.y = 0.12;
    }
  }

  function finish(e) {
    if (!gesture || gesture.id !== e.pointerId) return;
    let g = gesture;
    gesture = null;
    lastInput = now();
    rayAt(e.clientX, e.clientY);
    if (screen.hasPointerCapture(e.pointerId)) screen.releasePointerCapture(e.pointerId);
    if (g.kind === "leafEdge") {
      if (!g.moved) pickup(g.o);
      else sound("rice", 0.22);
      return;
    }
    if (g.kind === "carry" && carry) {
      const target = boxUnder();
      if (target && (g.moved || g.placing)) {
        if (carry.type === "rice") depositRice(target);
        else dropFood(target);
      } else if (g.moved) {
        if (carry.type === "rice") {
          if (carry.deposited > 0 && carry.strokeBox) {
            let c = carry;
            depositRice({ b: c.strokeBox, x: c.lastX, z: c.lastZ });
          } else {
            K.restPaddle();
            pot.paddle.position.y += 0.32;
            pot.paddle.rotation.z = 0.23;
          }
        } else if (carry.origin) clearCarry();
        else {
          carry.source.getWorldPosition(carry.o.obj.position);
          carry.o.obj.position.y += 0.38;
        }
      }
      return;
    }
    if (g.kind === "lid") {
      let b = g.b, over = boxUnder();
      if (!g.moved || over && over.b === b) closeLid(b);
      else K.restLid(b);
      return;
    }
    if (g.kind === "lidPress" && g.b.state === "ajar") {
      pressLid(g.b, 0.23, g.point);
      return;
    }
    if (g.kind === "deliver" && active && active.state === "moving") {
      landDelivered(active, onPlane(0.18));
      return;
    }
    if (g.kind === "uncover" && mode === "uncover") {
      uncover(active);
      return;
    }
    if (g.kind === "new" && mode === "table") nextMorning();
  }

  function cancel() {
    if (!gesture) return;
    let g = gesture;
    gesture = null;
    if (g.kind === "carry") clearCarry();
    if (g.kind === "lid") K.restLid(g.b);
    if (g.kind === "deliver") landDelivered(active, active.body.position);
    if (g.kind === "uncover") K.seatLid(active);
    lastInput = now();
  }
  screen.addEventListener("pointerdown", begin);
  screen.addEventListener("pointermove", move);
  screen.addEventListener("pointerup", finish);
  screen.addEventListener("pointercancel", cancel);
  screen.addEventListener("contextmenu", (e) => e.preventDefault());
  const ghost = K.hintFinger(), glow = new T.PointLight(0xffe9b8, 0, 2.5, 2);
  stage.add(glow);

  function hint() {
    let a = new V(), b = new V(), ringTime = now() - lastInput;
    if (transition || gesture || mode === "receiving") {
      ghost.visible = false;
      glow.intensity = 0;
      return;
    }
    if (mode === "cook") {
      let box = boxes.find((v) => v.state === "ajar") || boxes.find((v) => v.state === "open");
      if (!box) return;
      if (box.state === "ajar") {
        a = box.body.localToWorld(new V(box.peakX, box.h + box.gap + 0.24, box.peakZ));
        b.copy(a);
        b.y -= 0.14;
      } else if (carry) {
        if (carry.type === "rice") pot.paddle.getWorldPosition(a);
        else carry.o.obj.getWorldPosition(a);
        a.y += 0.34;
        b = box.body.localToWorld(new V(-0.2, box.floor + 0.27, 0.05));
      } else if (!box.rice.total && !box.items.length) {
        a = pot.paddle.localToWorld(new V(0, 0.12, 0.62));
        b = box.body.localToWorld(new V(-0.53, 0.24, 0.12));
      } else if (!box.items.length) {
        let bowl = bowls[0];
        a = bowl.root.localToWorld(new V(0.1, 1.03, 0.04));
        b = box.body.localToWorld(new V(box.rice.px + 0.18, box.floor + box.rice.peak + 0.28, box.rice.pz));
      } else {
        a = box.lid.localToWorld(new V(0.11, 0.24, 0.04));
        b = box.body.localToWorld(new V(0.14, box.h + 0.19, 0.04));
      }
    } else if (mode === "deliver") {
      active.body.getWorldPosition(a);
      a.y += active.h + 0.21;
      b = people[active.red ? 1 : 0].root.localToWorld(new V(0, 0.36, -0.23));
    } else if (mode === "uncover") {
      a = active.lid.localToWorld(new V(0.26, 0.24, 0.42));
      b.copy(a);
      b.z -= 0.84;
    } else if (mode === "table") {
      a = K.next.localToWorld(new V(0, 0.69, 0));
      b.copy(a);
      b.z += 0.63;
    } else {
      ghost.visible = false;
      return;
    }
    const c = (ringTime - 4) % 6.9;
    ghost.visible = ringTime >= 4 && c < 2.85;
    glow.position.copy(a);
    glow.position.y += 0.32;
    glow.intensity = (0.5 + 0.5 * Math.cos(ringTime * 2.85)) * 0.52;
    if (ghost.visible) {
      let u = clamp((c - 0.45) / 1.8, 0, 1);
      ghost.position.lerpVectors(a, b, smooth(u));
      ghost.position.y += 0.09 + Math.sin(PI * u) * 0.33 + Math.max(0, 0.36 - c) * 0.52;
      let f = clamp(c / 0.25, 0, 1) * clamp((2.85 - c) / 0.48, 0, 1);
      ghost.scale.setScalar(0.82);
      ghost.children[0].children[0].material.opacity = 0.34 * f;
    }
  }
  // Thin rising ribbons. Their width and translucency vary continuously along each plume.

  function steamMaker(parent, n) {
    const bits = [];
    for (let i = 0; i < n; i++) {
      const pts = [];
      for (let j = 0; j < 17; j++) {
        let t = j / 16;
        pts.push(new V(0.14 * Math.sin(t * 5 + i * 1.7) * t, t * 1.06, 0.1 * Math.sin(t * 7 + i) * t));
      }
      let geom = new T.TubeGeometry(new T.CatmullRomCurve3(pts), 20, 0.018, 5, false), m = new T.MeshBasicMaterial({ color: 0xfff9e7, transparent: true, opacity: 0.16, depthWrite: false });
      let o = mesh(geom, m, parent);
      o.castShadow = o.receiveShadow = false;
      bits.push(o);
    }
    return bits;
  }
  const potSteam = steamMaker(pot.base, 6);
  for (let b of boxes) {
    initRice(b);
    b.steam = steamMaker(b.body, 4);
  }

  function steam(bits, x, y, z, power, spread) {
    for (let i = 0; i < bits.length; i++) {
      let o = bits[i], t = (clock * 0.225 + i * 0.381966) % 1, a = i * 2.39;
      o.visible = power > 0.015;
      if (!o.visible) continue;
      o.position.set(x + Math.cos(a) * spread + 0.13 * t * Math.sin(clock * 0.7 + i), y + 0.86 * t, z + Math.sin(a) * spread);
      o.scale.set(0.7 + t * 0.86, 0.35 + 0.74 * t, 0.85);
      o.rotation.y = Math.sin(clock * 0.32 + i) * 1.3;
      o.material.opacity = 0.18 * power * Math.sin(PI * t) ** 1.12;
    }
  }

  function remember() {
    if (!day) return;
    for (let p of people) {
      if (!history[p.index].length || p.received.length) continue;
      let rec = history[p.index].at(-1), pref = Object.keys(rec).filter((k) => k !== "rice" && k !== "morning").sort((a, b2) => rec[b2] - rec[a])[0], b = bowls.find((b2) => b2.type === pref);
      let v = p.root.worldToLocal((b ? b.root : pot.base).position.clone());
      p.hand.root.rotation.y = Math.atan2(v.x - p.hand.root.position.x, v.z - p.hand.root.position.z) * 0.78;
      for (let i = 0; i < 5; i++) p.hand.fingers[i].rotation.x = i === 0 ? -0.09 : 0.7;
    }
  }

  function resize(initial = false) {
    const v = innerWidth / innerHeight < 0.83;
    let change = v !== portrait;
    portrait = v;
    renderer.setSize(innerWidth, innerHeight, false);
    camera.aspect = innerWidth / innerHeight;
    camera.updateProjectionMatrix();
    if (initial || change) {
      if (!initial) {
        cancel();
        clearCarry();
      }
      K.layout(portrait, day, initial);
      if (!initial && mode === "table") K.next.visible = true;
    }
    if (!transition) {
      let p = mode === "cook" ? cookView() : diningView(active, mode === "table");
      installPose(p);
    } else {
      transition.end = transition.to === "cook" ? cookView() : diningView(transition.b, transition.to === "table");
    }
  }
  resize(true);
  people.forEach((p) => p.root.visible = day > 0);
  if (day) varySupplies();
  window.addEventListener("resize", () => resize());
  let previous = now(), coolTick = 0;

  function frame() {
    requestAnimationFrame(frame);
    let t = now(), dt = Math.min(0.04, Math.max(1e-3, t - previous));
    previous = t;
    clock += dt;
    for (let i = anims.length - 1; i >= 0; i--) {
      let f = anims[i], u = clamp((t - f.start) / f.duration, 0, 1);
      f.update(u);
      if (u >= 1) {
        anims.splice(i, 1);
        f.end?.();
      }
    }
    if (gesture) {
      let g = gesture;
      if (g.kind === "press") {
        pressRice(g.b, g.px, g.pz, g.dx || 0, g.dz || 0, dt * 0.96);
        if (t - g.lastTone > 0.24) {
          sound("rice", 0.21, Math.min(1, t - g.time));
          g.lastTone = t;
        }
      }
      if (g.kind === "lidPress" && g.b.state === "ajar" && !g.moved && t - g.time > 0.12) {
        pressLid(g.b, dt, g.point);
        if (t - g.lastTone > 0.25) {
          sound("rice", 0.26, 0.7);
          g.lastTone = t;
        }
      }
    }
    for (let b of boxes) {
      if (b.state === "open" || b.state === "ajar") {
        for (let o of b.items) physics(o, dt);
        rebuild(b);
      }
      if (b.state === "served") rebuild(b);
      let r = b.rice, power = b.state === "open" || b.state === "served" ? Math.min(1, r.hot * 1.35) : 0;
      steam(b.steam, r.mx || 0, b.floor + r.peak + 0.035, r.mz || 0, power, 0.26);
      if (b.state === "open" && r.hot > 0.05) {
        for (let o of b.items) if (o.type === "lettuce" && Math.hypot(o.x - r.mx, o.z - r.mz) < 1.17) o.art.rotation.x = Math.sin(clock * 2.05 + o.id) * 0.018 * Math.min(1, r.hot);
      }
    }
    coolTick += dt;
    if (coolTick > 1.6) {
      for (let b of boxes) {
        for (let c of b.rice.cells) c.temp *= Math.exp(-coolTick / 178);
        b.rice.hot *= Math.exp(-coolTick / 178);
      }
      coolTick = 0;
    }
    if (mode === "cook" && !carry && !gesture) {
      pot.paddle.position.y = pot.rest.y + (!lesson ? 0.025 * (0.5 + 0.5 * Math.sin(clock * 2.3)) : 0);
      remember();
    }
    if (carry?.type === "food" && (!gesture || !gesture.moved)) {
      let o = carry.o;
      o.art.scale.lerp(new V(1, 1, 1), 0.085);
      o.art.rotation.z = Math.sin(clock * 1.9) * 0.026;
    }
    steam(potSteam, 0, 1.51, 0, 1, 0.56);
    updateCamera();
    hint();
    renderer.render(scene, camera);
  }
  requestAnimationFrame(frame);
})();
