"use strict";
const A = (() => {
  const T = THREE, PI = Math.PI, TAU = PI * 2;
  let seed = 62819;

  function rnd() {
    seed = Math.imul(seed, 1664525) + 1013904223 >>> 0;
    return seed / 4294967296;
  }

  function canvas(w, h, draw) {
    const c = document.createElement("canvas");
    c.width = w;
    c.height = h;
    draw(c.getContext("2d"), w, h);
    const t = new T.CanvasTexture(c);
    t.colorSpace = T.SRGBColorSpace;
    t.anisotropy = 4;
    return t;
  }
  const mat = (color, roughness = 0.53, options = {}) => new T.MeshStandardMaterial({ color, roughness, ...options });
  const group = (parent) => {
    const g = new T.Group();
    if (parent) parent.add(g);
    return g;
  };
  const mesh = (geo, m, parent, x = 0, y = 0, z = 0) => {
    const o = new T.Mesh(geo, m);
    o.position.set(x, y, z);
    o.castShadow = true;
    o.receiveShadow = true;
    if (parent) parent.add(o);
    return o;
  };
  const sphere = new T.SphereGeometry(1, 26, 18), smallSphere = new T.SphereGeometry(1, 12, 9), riceGrain = new T.SphereGeometry(1, 9, 6);

  function ell(parent, m, x, y, z, sx, sy, sz, small = false) {
    const o = mesh(small ? smallSphere : sphere, m, parent, x, y, z);
    o.scale.set(sx, sy, sz);
    return o;
  }

  function box(parent, m, x, y, z, w, h, d) {
    return mesh(new T.BoxGeometry(w, h, d), m, parent, x, y, z);
  }

  function tube(parent, m, points, r = 0.022) {
    const curve = new T.CatmullRomCurve3(points.map((p) => new T.Vector3(...p)));
    return mesh(new T.TubeGeometry(curve, Math.max(6, points.length * 3), r, 7, false), m, parent);
  }

  function rod(parent, m, a, b, r, r2 = r) {
    const av = new T.Vector3(...a), bv = new T.Vector3(...b), o = mesh(new T.CylinderGeometry(r2, r, av.distanceTo(bv), 14), m, parent);
    o.position.copy(av).lerp(bv, 0.5);
    o.quaternion.setFromUnitVectors(new T.Vector3(0, 1, 0), bv.sub(av).normalize());
    return o;
  }

  function lathe(parent, m, profile, n = 80) {
    return mesh(new T.LatheGeometry(profile.map((p) => new T.Vector2(...p)), n), m, parent);
  }

  function ring(parent, m, r, y, t = 0.018) {
    const o = mesh(new T.TorusGeometry(r, t, 8, 80), m, parent, 0, y);
    o.rotation.x = PI / 2;
    return o;
  }

  function roundedLoop(w, d, r, n = 10) {
    r = Math.max(1e-4, Math.min(w / 2 - 1e-5, d / 2 - 1e-5, r));
    const pts = [];
    for (let k = 0; k < 4; k++) {
      const cx = (k === 0 || k === 3 ? 1 : -1) * (w / 2 - r), cz = (k < 2 ? 1 : -1) * (d / 2 - r);
      for (let j = 0; j <= n; j++) {
        const a = (k + j / n) * PI / 2;
        pts.push([cx + r * Math.cos(a), cz + r * Math.sin(a)]);
      }
    }
    return pts;
  }

  function shell(w, d, profile) {
    const v = [], uv = [], idx = [];
    let count = 0;
    for (let j = 0; j < profile.length; j++) {
      const [inset, y, r] = profile[j], ww = Math.max(2e-3, w - inset * 2), dd = Math.max(2e-3, d - inset * 2), pts = roundedLoop(ww, dd, r);
      count = pts.length;
      for (const [x, z] of pts) {
        v.push(x, y, z);
        uv.push(x / w + 0.5, 0.5 - z / d);
      }
      if (j) for (let k = 0; k < count; k++) {
        let a = (j - 1) * count + k, b = (j - 1) * count + (k + 1) % count;
        idx.push(a, a + count, b, b, a + count, b + count);
      }
    }
    const cap = (offset, reverse) => {
      let center = v.length / 3;
      v.push(0, v[offset * 3 + 1], 0);
      uv.push(0.5, 0.5);
      for (let k = 0; k < count; k++) {
        const a = offset + k, b = offset + (k + 1) % count;
        idx.push(center, reverse ? b : a, reverse ? a : b);
      }
    };
    cap(0, false);
    cap((profile.length - 1) * count, true);
    let geo = new T.BufferGeometry();
    geo.setAttribute("position", new T.Float32BufferAttribute(v, 3));
    geo.setAttribute("uv", new T.Float32BufferAttribute(uv, 2));
    geo.setIndex(idx);
    geo.computeVertexNormals();
    return geo;
  }

  function slab(parent, m, w, d, h, r, bevel = 0.04) {
    return mesh(shell(w, d, [[bevel, 0, r], [9e-3, 0.25 * bevel, r], [0, bevel, r], [0, h - bevel, r], [9e-3, h - 0.25 * bevel, r], [bevel, h, r], [bevel + 0.02, h, r]]), m, parent);
  }

  function rimRect(parent, m, w, d, r, y, thick) {
    const pts = roundedLoop(w, d, r);
    pts.push(pts[0]);
    const p = pts.map(([x, z]) => new T.Vector3(x, y, z));
    return mesh(new T.TubeGeometry(polygonPath(p), p.length * 2, thick, 6, false), m, parent);
  }

  function polygonPath(p) {
    let path = new T.CurvePath();
    for (let i = 1; i < p.length; i++) path.add(new T.LineCurve3(p[i - 1], p[i]));
    return path;
  }

  function instances(parent, geometry, material, items) {
    const im = new T.InstancedMesh(geometry, material, items.length), tmp = new T.Object3D();
    items.forEach((v, i) => {
      tmp.position.set(v[0], v[1], v[2]);
      tmp.scale.set(v[3], v[4], v[5]);
      tmp.rotation.set(v[6] || 0, v[7] || 0, v[8] || 0);
      tmp.updateMatrix();
      im.setMatrixAt(i, tmp.matrix);
      if (v[9] !== void 0) im.setColorAt(i, new T.Color(v[9]));
    });
    im.receiveShadow = true;
    im.castShadow = true;
    parent.add(im);
    return im;
  }
  // Bake rigid details that share a glaze or food material into one indexed mesh.

  function batch(root) {
    root.updateMatrixWorld(true);
    const inv = root.matrixWorld.clone().invert(), sets = new Map();
    root.traverse((o) => {
      if (!o.isMesh || o.isInstancedMesh || Array.isArray(o.material)) return;
      let key = o.material.uuid + o.castShadow + o.receiveShadow + Object.keys(o.geometry.attributes).join();
      if (!sets.has(key)) sets.set(key, []);
      sets.get(key).push(o);
    });
    for (let parts of sets.values()) {
      if (parts.length < 2) continue;
      const values = {}, indices = [];
      let offset = 0;
      for (let o of parts) {
        let geo2 = o.geometry.clone().applyMatrix4(new T.Matrix4().multiplyMatrices(inv, o.matrixWorld));
        for (let [key, a] of Object.entries(geo2.attributes)) {
          if (!values[key]) values[key] = [];
          for (let v of a.array) values[key].push(v);
        }
        if (geo2.index) for (let i of geo2.index.array) indices.push(i + offset);
        else for (let i = 0; i < geo2.attributes.position.count; i++) indices.push(i + offset);
        offset += geo2.attributes.position.count;
        geo2.dispose();
        o.removeFromParent();
      }
      let m = parts[0], geo = new T.BufferGeometry();
      for (let [key, arr] of Object.entries(values)) geo.setAttribute(key, new T.Float32BufferAttribute(arr, m.geometry.attributes[key].itemSize));
      geo.setIndex(indices);
      let combined = mesh(geo, m.material, root);
      combined.castShadow = m.castShadow;
      combined.receiveShadow = m.receiveShadow;
    }
  }
  const shadows = canvas(128, 128, (c, w, h) => {
    let gr = c.createRadialGradient(64, 64, 2, 64, 64, 64);
    gr.addColorStop(0, "rgba(48,26,10,.51)");
    gr.addColorStop(0.53, "rgba(48,26,10,.33)");
    gr.addColorStop(0.85, "rgba(48,26,10,.08)");
    gr.addColorStop(1, "rgba(48,26,10,0)");
    c.fillStyle = gr;
    c.fillRect(0, 0, w, h);
  });
  const shadowMat = new T.MeshBasicMaterial({ map: shadows, transparent: true, depthWrite: false, polygonOffset: true, polygonOffsetFactor: -1 });

  function shadow(parent, w, d, y = 0.014) {
    const o = mesh(new T.PlaneGeometry(w, d), shadowMat, parent, 0, y);
    o.rotation.x = -PI / 2;
    o.castShadow = o.receiveShadow = false;
    return o;
  }

  function noiseTexture(size, base, amp) {
    return canvas(size, size, (c, w, h) => {
      let im = c.createImageData(w, h);
      for (let i = 0; i < w * h; i++) {
        const a = (rnd() - 0.5) * amp;
        for (let k = 0; k < 3; k++) im.data[i * 4 + k] = base[k] + a;
        im.data[i * 4 + 3] = 255;
      }
      c.putImageData(im, 0, 0);
    });
  }
  const grainNoise = noiseTexture(128, [215, 215, 215], 68);
  const riceMat = mat(0xfff9e7, 0.32), riceBase = mat(0xf0e7cf, 0.57, { bumpMap: grainNoise, bumpScale: 0.025 });

  function riceGrains(p, rx, rz, height, n) {
    ell(p, riceBase, 0, 0, 0, rx, height, rz);
    let arr = [];
    for (let i = 0; i < n; i++) {
      let a = rnd() * TAU, r = Math.sqrt(rnd()), x = Math.cos(a) * r, z = Math.sin(a) * r, y = Math.sqrt(1 - r * r);
      arr.push([x * rx, y * height + 8e-3, z * rz, 0.036 + rnd() * 0.012, 0.027 + rnd() * 0.01, 0.074 + rnd() * 0.012, z * 0.42, rnd() * PI, x * 0.4, [0xfff9e9, 0xfff8df, 0xf8eed5, 0xfffcef][i % 4]]);
    }
    instances(p, riceGrain, riceMat, arr);
  }

  function woodMap() {
    return canvas(2048, 1536, (c, w, h) => {
      const im = c.createImageData(w, h), n = 10;
      for (let p = 0; p < n; p++) {
        const start = Math.round(p * h / n), end = Math.round((p + 1) * h / n), tint = rnd() * 14, phase = rnd() * 20;
        let fibers = Array.from({ length: 410 }, () => rnd() * 8);
        for (let y = start; y < end; y++) {
          let v = (y - start) / (end - start);
          for (let x = 0; x < w; x++) {
            let u = x / w, warp = v + 0.021 * Math.sin(u * 8 + phase) + 8e-3 * Math.sin(u * 21 + phase + v * 6), f = warp * 350 + u * 2;
            let rings = Math.sin(warp * 37 + 2.1 * Math.sin(u * 5 + phase) + 0.6 * Math.sin(u * 11 + v * 9));
            let g = tint + 4 * rings - 5 * Math.pow(Math.max(0, rings), 10) + fibers[(Math.floor(f) + 410) % 410] - 0.9 * Math.sin(f * 2.2) + (rnd() - 0.5) * 4;
            let edge = Math.min(y - start, end - 1 - y);
            if (edge < 2) g -= edge ? 8 : 23;
            if (edge === 2) g += 6;
            let i = (y * w + x) * 4;
            im.data[i] = 175 + g;
            im.data[i + 1] = 117 + g * 0.89;
            im.data[i + 2] = 67 + g * 0.72;
            im.data[i + 3] = 255;
          }
        }
      }
      c.putImageData(im, 0, 0);
      for (let i = 0; i < 4300; i++) {
        let x = rnd() * w, y = rnd() * h, l = 4 + rnd() ** 3 * 135;
        c.strokeStyle = rnd() < 0.5 ? "rgba(94,52,26,.085)" : "rgba(255,221,170,.12)";
        c.lineWidth = 0.3 + rnd() * 0.65;
        c.beginPath();
        c.moveTo(x, y);
        c.bezierCurveTo(x + l * 0.3, y - 0.3, x + l * 0.7, y + 0.4, x + l, y + rnd() - 0.5);
        c.stroke();
      }
    });
  }
  const fabrics = {};

  function cloth(parent, w, d, style = 0) {
    if (!fabrics[style]) {
      let tex = canvas(512, 512, (c, s) => {
        c.fillStyle = style === 1 ? "#dcd1ad" : style === 2 ? "#486566" : "#dcdcc9";
        c.fillRect(0, 0, s, s);
        for (let i = 0; i < s; i++) {
          c.fillStyle = i % 3 ? "rgba(255,255,255,.08)" : "rgba(47,35,24,.12)";
          c.fillRect(i, 0, 0.8, s);
          c.fillRect(0, i, s, 0.8);
        }
        for (let i = 0; i < 512; i += 128) {
          c.fillStyle = style === 0 ? "rgba(39,74,99,.74)" : style === 1 ? "rgba(149,87,46,.39)" : "rgba(232,225,190,.40)";
          for (let k of [0, 6, 15]) {
            c.fillRect(i + k, 0, k === 6 ? 6 : 2, s);
            if (style !== 2) c.fillRect(0, i + k, s, k === 6 ? 6 : 2);
          }
        }
      });
      tex.wrapS = tex.wrapT = T.RepeatWrapping;
      tex.repeat.set(2, 1.6);
      fabrics[style] = mat(0xffffff, 0.96, { map: tex, bumpMap: tex, bumpScale: 0.011, side: T.DoubleSide });
    }
    const g = new T.PlaneGeometry(w, d, 52, 40);
    g.rotateX(-PI / 2);
    let a = g.attributes.position;
    for (let i = 0; i < a.count; i++) {
      let x = a.getX(i), z = a.getZ(i), edge = (Math.abs(x) / (w / 2)) ** 5 + (Math.abs(z) / (d / 2)) ** 5;
      a.setY(i, 0.035 + edge * (0.036 + 0.034 * Math.sin(x * 4 + z * 2)) + 8e-3 * Math.cos(4 * z + x));
      a.setX(i, x + 0.023 * Math.sin(z * 3 + x));
      a.setZ(i, z + 0.032 * Math.sin(x * 2));
    }
    g.computeVertexNormals();
    return mesh(g, fabrics[style], parent);
  }
  const gold = mat(0xc39953, 0.34, { metalness: 0.46 });
  return { T, PI, TAU, rnd, canvas, mat, group, mesh, ell, box, tube, rod, lathe, ring, shell, slab, rimRect, instances, smallSphere, riceGrain, sphere, shadow, grainNoise, riceMat, riceBase, riceGrains, woodMap, cloth, gold, noiseTexture, batch };
})();
const Food = (() => {
  const { T, PI, TAU, rnd, canvas, mat, group, mesh, ell, tube, rod, instances, smallSphere, grainNoise, shell } = A;
  const sizes = { egg: [0.58, 0.37, 0.48], chicken: [0.46, 0.4, 0.69], broccoli: [0.49, 0.44, 0.89], tomato: [0.335, 0.33, 0.63], sausage: [0.66, 0.25, 0.45], lettuce: [0.74, 0.2, 0.84] };
  const yolk = canvas(384, 256, (c, w, h) => {
    c.fillStyle = "#ffce48";
    c.fillRect(0, 0, w, h);
    for (let i = 0; i < 8e3; i++) {
      let x = rnd() * w, y = rnd() * h;
      c.fillStyle = rnd() > 0.5 ? "rgba(255,245,145,.23)" : "rgba(179,106,23,.12)";
      c.beginPath();
      c.ellipse(x, y, rnd() * 3 + 0.2, rnd() * 1.6 + 0.2, rnd() * PI, 0, TAU);
      c.fill();
    }
    for (let k = 0; k < 3; k++) {
      c.beginPath();
      for (let i = 0; i < 370; i++) {
        let a = i / 369 * TAU * 2.05, r = 0.042 + 0.96 * i / 369;
        let x = w * (0.51 + 0.54 * r * Math.sign(Math.cos(a)) * Math.abs(Math.cos(a)) ** 0.75), y = h * (0.49 + 0.52 * r * Math.sin(a) + 0.018 * Math.sin(a * 3 + r));
        if (i) c.lineTo(x, y);
        else c.moveTo(x, y);
      }
      c.strokeStyle = ["rgba(206,139,29,.75)", "rgba(255,237,129,.85)", "rgba(235,167,38,.54)"][k];
      c.lineWidth = [8, 4, 1.3][k];
      c.stroke();
      c.translate(0, 2);
    }
  });
  const eggTop = mat(0xffffff, 0.46, { map: yolk, bumpMap: grainNoise, bumpScale: 0.013 });
  const sideTex = canvas(384, 256, (c, w, h) => {
    c.fillStyle = "#eaa13e";
    c.fillRect(0, 0, w, h);
    for (let i = 0; i < 450; i++) {
      let x = rnd() * w, y = rnd() * h, r = 2 + rnd() * 10;
      const gr = c.createRadialGradient(x, y, 0, x, y, r);
      gr.addColorStop(0, "rgba(150,65,15,.31)");
      gr.addColorStop(1, "rgba(174,78,18,0)");
      c.fillStyle = gr;
      c.fillRect(x - r, y - r, r * 2, r * 2);
    }
  }), eggSide = mat(0xf4b548, 0.52, { map: sideTex });
  const chickenMat = mat(0xffffff, 0.73, { vertexColors: true, bumpMap: grainNoise, bumpScale: 0.035 }), crumbMat = mat(0xffffff, 0.7);
  const green = mat(0x466e26, 0.57), stem = mat(0x91ad49, 0.66), tomatoMat = mat(0xd32b11, 0.22, { metalness: 0.025 }), nailGreen = mat(0x497126, 0.5, { side: T.DoubleSide });
  const sausageMat = mat(0xaa4828, 0.32, { bumpMap: grainNoise, bumpScale: 0.012 }), sausageCut = mat(0xdf8a57, 0.55), sear = mat(0x81381d, 0.54);

  function leafBlade(parent, m, a, b, width, arch) {
    const v = [], idx = [];
    for (let i = 0; i <= 8; i++) {
      let u = i / 8, x = a[0] + (b[0] - a[0]) * u, y = a[1] + (b[1] - a[1]) * u + arch * Math.sin(PI * u), z = a[2] + (b[2] - a[2]) * u, ang = Math.atan2(b[2] - a[2], b[0] - a[0]) + PI / 2;
      let w = width * Math.sin(PI * u) ** 0.7;
      for (let s of [-1, 0, 1]) v.push(x + s * w * Math.cos(ang), y + (1 - Math.abs(s)) * w * 0.27, z + s * w * Math.sin(ang));
      if (i) {
        let j = i * 3;
        idx.push(j - 3, j, j - 2, j - 2, j, j + 1, j - 2, j + 1, j - 1, j - 1, j + 1, j + 2);
      }
    }
    let geo = new T.BufferGeometry();
    geo.setAttribute("position", new T.Float32BufferAttribute(v, 3));
    geo.setIndex(idx);
    geo.computeVertexNormals();
    return mesh(geo, m, parent);
  }

  function egg(g, variant) {
    let w = 1.12, d = 0.7, h = 0.47;
    let body = mesh(shell(w, d, [[0.074, 0.02, 0.16], [0.017, 0.065, 0.18], [0, 0.16, 0.2], [0.011, h - 0.07, 0.18], [0.049, h - 0.014, 0.16]]), eggSide, g);
    let cap = mesh(shell(w - 0.093, d - 0.093, [[0, h - 0.013, 0.145], [4e-3, h, 0.145], [0.035, h + 0.012, 0.14]]), eggTop, g);
    for (let k = 0; k < 3; k++) {
      const x = -0.32 + k * 0.31, z = d / 2 - 0.012;
      let patch = ell(g, mat([0xc38332, 0xd6973e, 0xe5aa52][k], 0.63), x, 0.2 + 0.09 * Math.sin(variant + k), z, 0.105, 0.045, 8e-3, true);
      patch.rotation.z = -0.17;
    }
  }

  function nugget(g, variant, long) {
    const geo = new T.SphereGeometry(1, 52, 38), at = geo.attributes.position, colors = [], c = new T.Color();
    let phase = variant * 6.2;
    const field = (x, y, z) => Math.sin(x * 8.3 + y * 4 + phase) * Math.sin(z * 9 - y * 5.2) + 0.54 * Math.cos(y * 15 + x * 11 - phase) * Math.sin(z * 19 + x) + 0.25 * Math.sin(x * 37 + y * 31 + z * 22);
    for (let i = 0; i < at.count; i++) {
      let x = at.getX(i), y = at.getY(i), z = at.getZ(i), n = field(x, y, z), crag = Math.abs(n), r = 1 + 0.12 * n + 0.052 * Math.sin(x * 4 + z * 6 + phase) + 0.037 * Math.sin(y * 22 + x * 23) * Math.cos(z * 17);
      at.setXYZ(i, x * 0.45 * r * (long ? 1.45 : 1), 0.36 + y * 0.345 * r, z * 0.391 * r);
      let t = Math.max(0, Math.min(1, 0.41 + 0.24 * n + 0.15 * Math.sin(x * 3 + y * 5 + phase) + 0.12 * crag));
      c.set(0x81401d).lerp(new T.Color(0xe8a949), t);
      colors.push(c.r, c.g, c.b);
    }
    geo.setAttribute("color", new T.Float32BufferAttribute(colors, 3));
    geo.computeVertexNormals();
    mesh(geo, chickenMat, g);
    let crumbs = [];
    for (let i = 0; i < 110; i++) {
      let y = rnd() * 2 - 1, a = rnd() * TAU, k = Math.sqrt(1 - y * y), x = Math.cos(a) * k, z = Math.sin(a) * k, f = 1 + 0.12 * field(x, y, z) + 0.052 * Math.sin(x * 4 + z * 6 + phase), r = 0.018 + rnd() ** 2 * 0.064;
      crumbs.push([x * 0.45 * f * (long ? 1.45 : 1), 0.36 + y * 0.345 * f, z * 0.391 * f, r, r * (0.45 + rnd() * 0.75), r * 0.84, rnd() * 3, rnd() * 6, rnd() * 4, [0xbd792e, 0xd99941, 0x9b5725, 0xc38a3b][i % 4]]);
    }
    instances(g, new T.IcosahedronGeometry(1, 0), crumbMat, crumbs);
  }

  function tomato(g, v) {
    const t = ell(g, tomatoMat, 0, 0.315, 0, 0.339, 0.315, 0.33);
    const top = 0.614;
    for (let k = 0; k < 6; k++) {
      let a = k * TAU / 6 + v, l = 0.19 + 0.07 * Math.sin(k + v);
      leafBlade(g, nailGreen, [0, top, 0], [Math.cos(a) * l, top - 0.064, Math.sin(a) * l], 0.042, 0.025);
    }
    tube(g, green, [[0, top, 0], [0.018, top + 0.064, 0.01], [0.062, top + 0.103, 0.025]], 0.017);
  }
  const floretGeo = new T.IcosahedronGeometry(1, 1), floretMat = mat(0xffffff, 0.84), headMat = mat(0x477736, 0.82);

  function broccoli(g, v) {
    rod(g, stem, [0, 0.01, 0], [0.014, 0.55, -0.035], 0.118, 0.155);
    let crowns = [];
    for (let k = 0; k < 12; k++) {
      let a = k * 2.4 + v, r = 0.295 * Math.sqrt(k / 11), x = r * Math.cos(a), z = r * Math.sin(a), y = 0.66 - 0.12 * k / 11 + 0.035 * Math.cos(k);
      rod(g, stem, [0, 0.23, 0], [x, y, z], 0.065, 0.1);
      let h = 0.192 + 0.025 * Math.cos(k * 3);
      ell(g, headMat, x, y, z, h, h * 0.83, h, true);
      for (let j = 0; j < 34; j++) {
        let s = rnd(), ang = rnd() * TAU, l = Math.sqrt(1 - s * s), b = 0.027 + rnd() * 0.027;
        crowns.push([x + l * h * Math.cos(ang), y + h * 0.8 * s, z + l * h * Math.sin(ang), b, b * 0.93, b, 0, ang, 0, [0x416e2e, 0x497c36, 0x597f35, 0x366033, 0x608044][(j + k) % 5]]);
      }
    }
    instances(g, floretGeo, floretMat, crowns);
  }

  function sausage(g, v) {
    const geo = new T.SphereGeometry(1, 36, 24), pos = geo.attributes.position;
    for (let i = 0; i < pos.count; i++) {
      let x = pos.getX(i), y = pos.getY(i), z = pos.getZ(i), body = 1.27 - 0.27 * x * x;
      pos.setXYZ(i, x * 0.677, 0.233 + y * 0.19 * body, z * 0.213 * body + x * x * 0.105);
    }
    geo.computeVertexNormals();
    mesh(geo, sausageMat, g);
    for (let k = 0; k < 3; k++) {
      let x = -0.32 + k * 0.29;
      let pp = [];
      for (let j = 0; j <= 10; j++) {
        let u = j / 10, z = (u - 0.46) * 0.32, xx = x + 0.16 * (u - 0.5), h = Math.sqrt(Math.max(0.01, 1 - (xx / 0.68) ** 2 - ((z - xx * xx * 0.19) / 0.255) ** 2));
        pp.push([xx, 0.231 + 0.239 * h, z]);
      }
      tube(g, sear, pp, 0.018);
      tube(g, sausageCut, pp.map(([x2, y, z]) => [x2 + 0.018, y + 3e-3, z]), 0.014);
    }
  }
  const leafMat = mat(0xffffff, 0.53, { vertexColors: true, side: T.DoubleSide }), ribMat = mat(0xb1cc63, 0.63);

  function lettuce(g, v) {
    const nx = 36, ny = 18, vs = [], cs = [], ids = [], phase = v;
    function p(u, t) {
      let edge = Math.abs(u) ** 1.8, wrinkle = Math.sin(u * 19 + phase + t * 1.8) * 0.075 + Math.sin(u * 38 - phase) * 0.034;
      return [u * (0.39 + 0.35 * t), 0.035 + t * (0.78 - 0.2 * edge) + t * t * (wrinkle + Math.sin(u * 29) * 0.037), 0.12 * u * u - 0.09 + t * (0.07 + 0.19 * Math.cos(u * 6 + phase)) + t * t * (wrinkle * 1.46 + 0.12)];
    }
    let c = new T.Color();
    for (let j = 0; j <= ny; j++) for (let i = 0; i <= nx; i++) {
      let u = i / nx * 2 - 1, t = j / ny;
      vs.push(...p(u, t));
      c.set(0xc0d17a).lerp(new T.Color(0x579b39), Math.min(1, t * 0.78 + Math.abs(u) * 0.21 + 0.14 * Math.sin(u * 19 + t)));
      cs.push(c.r, c.g, c.b);
      if (i && j) {
        let k = j * (nx + 1) + i;
        ids.push(k - nx - 2, k - 1, k, k - nx - 2, k, k - nx - 1);
      }
    }
    let geo = new T.BufferGeometry();
    geo.setAttribute("position", new T.Float32BufferAttribute(vs, 3));
    geo.setAttribute("color", new T.Float32BufferAttribute(cs, 3));
    geo.setIndex(ids);
    geo.computeVertexNormals();
    mesh(geo, leafMat, g);
    tube(g, ribMat, [p(0, 0), p(0, 0.25), p(0.015, 0.5), p(0.01, 0.75), p(0.02, 0.94)], 0.014);
    for (let j = 0; j < 3; j++) for (let s of [-1, 1]) {
      let y = 0.12 + j * 0.18;
      let a = [p(0, y), p(s * 0.24, y + 0.08), p(s * 0.46, y + 0.17), p(s * 0.66, y + 0.24)];
      tube(g, ribMat, a.map((q) => [q[0], q[1], q[2] + 9e-3]), 8e-3);
    }
  }
  let factories = { egg, chicken: nugget, tomato, broccoli, sausage, lettuce }, templates = new Map();
  const hulls = new Map();

  function hull(type, v, long) {
    const key = type + v + long;
    if (hulls.has(key)) return hulls.get(key);
    const model = make(type, v, long), dirs = [], best = [], scores = [];
    for (let i = -1; i <= 1; i++) for (let j = -1; j <= 1; j++) for (let k = -1; k <= 1; k++) if (i || j || k) {
      dirs.push(new T.Vector3(i, j, k));
      best.push(new T.Vector3());
      scores.push(-Infinity);
    }
    model.updateMatrixWorld(true);
    const point = new T.Vector3(), m = new T.Matrix4(), combined = new T.Matrix4();
    function consider(p) {
      for (let k = 0; k < dirs.length; k++) {
        let value = dirs[k].dot(p);
        if (value > scores[k]) {
          scores[k] = value;
          best[k].copy(p);
        }
      }
    }
    model.traverse((o) => {
      if (!o.isMesh) return;
      let vertices = o.geometry.attributes.position;
      if (o.isInstancedMesh) {
        const bounds = new T.Box3();
        o.geometry.computeBoundingBox();
        for (let i = 0; i < o.count; i++) {
          o.getMatrixAt(i, m);
          combined.multiplyMatrices(o.matrixWorld, m);
          bounds.copy(o.geometry.boundingBox).applyMatrix4(combined);
          for (let x of [bounds.min.x, bounds.max.x]) for (let y of [bounds.min.y, bounds.max.y]) for (let z of [bounds.min.z, bounds.max.z]) consider(point.set(x, y, z));
        }
      } else for (let j = 0; j < vertices.count; j++) consider(point.fromBufferAttribute(vertices, j).applyMatrix4(o.matrixWorld));
    });
    hulls.set(key, best);
    return best;
  }

  function make(type, v = 0, long = false) {
    v = Math.abs(v) % 4;
    let key = type + v + long;
    if (!templates.has(key)) {
      let g = group();
      factories[type](g, v, long);
      A.batch(g);
      templates.set(key, g);
    }
    return templates.get(key).clone(true);
  }
  return { make, sizes, leafBlade, hull };
})();
