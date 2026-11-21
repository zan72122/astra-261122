"use strict";
const K = (() => {
  const { T, PI, TAU, rnd, canvas, mat, group, mesh, ell, box, tube, rod, lathe, ring, shell, slab, rimRect, instances, shadow, gold, cloth } = A;
  const scene = new T.Scene(), stage = group(scene), camera = new T.PerspectiveCamera(34, 1, 0.12, 105);
  const renderer = new T.WebGLRenderer({ canvas: document.querySelector("canvas"), antialias: true, powerPreference: "high-performance", alpha: false });
  renderer.setPixelRatio(Math.min(devicePixelRatio, 1.85));
  renderer.shadowMap.enabled = true;
  renderer.shadowMap.type = T.PCFShadowMap;
  renderer.toneMapping = T.ACESFilmicToneMapping;
  renderer.toneMappingExposure = 1.02;
  scene.background = new T.Color(0xc9b18f);
  const env = canvas(512, 256, (c, w, h) => {
    let gr = c.createLinearGradient(0, 0, 0, h);
    gr.addColorStop(0, "#e7e7de");
    gr.addColorStop(0.48, "#bbb6a7");
    gr.addColorStop(0.53, "#9a7a54");
    gr.addColorStop(1, "#65503d");
    c.fillStyle = gr;
    c.fillRect(0, 0, w, h);
    c.fillStyle = "#fff9e7";
    c.fillRect(43, 25, 111, 93);
    c.fillStyle = "#8f867a";
    c.fillRect(96, 25, 4, 93);
    c.fillRect(43, 70, 111, 3);
    c.fillStyle = "#404541";
    c.fillRect(300, 76, 120, 49);
  });
  env.mapping = T.EquirectangularReflectionMapping;
  scene.environment = env;
  scene.environmentIntensity = 0.54;
  scene.add(new T.HemisphereLight(0xfff6df, 0xc4a583, 1.66));
  const sun = new T.DirectionalLight(0xffe3b8, 2.85);
  sun.position.set(-8, 15, -7);
  sun.target.position.set(0, 0, -1.6);
  scene.add(sun, sun.target);
  sun.castShadow = true;
  Object.assign(sun.shadow.camera, { left: -14, right: 14, top: 15, bottom: -15, far: 48, near: 0.5 });
  sun.shadow.mapSize.set(2048, 2048);
  sun.shadow.radius = 2.2;
  sun.shadow.bias = -38e-5;
  sun.shadow.normalBias = 0.017;
  const fill = new T.DirectionalLight(0xe2efff, 0.45);
  fill.position.set(3, 7, 8);
  scene.add(fill);
  const woodTex = A.woodMap();
  woodTex.wrapS = woodTex.wrapT = T.RepeatWrapping;
  woodTex.repeat.set(1.48, 1.33);
  const wood = mat(0xffead3, 0.68, { map: woodTex, bumpMap: woodTex, bumpScale: 0.021 });
  // A soft band of window light across the oak. The grain is continuous through the light.
  wood.onBeforeCompile = (shader) => {
    shader.vertexShader = "varying vec3 oakWorld;\n" + shader.vertexShader;
    shader.vertexShader = shader.vertexShader.replace("#include <worldpos_vertex>", "#include <worldpos_vertex>\noakWorld=(modelMatrix*vec4(transformed,1.)).xyz;");
    shader.fragmentShader = "varying vec3 oakWorld;\n" + shader.fragmentShader;
    shader.fragmentShader = shader.fragmentShader.replace("#include <color_fragment>", "#include <color_fragment>\nfloat lane=oakWorld.x*.78+oakWorld.z*.67;float beam=smoothstep(-8.6,-7.8,lane)*(1.-smoothstep(-2.0,-1.2,lane))+smoothstep(-.9,-.45,lane)*(1.-smoothstep(2.8,3.4,lane));diffuseColor.rgb*=mix(vec3(.89,.90,.94),vec3(1.15,1.09,1.0),beam);");
  };
  const table = box(stage, wood, 0, -0.32, 1, 17.8, 0.64, 14);
  const breakfast = box(stage, wood, 0, -0.337, -14.01, 24, 0.64, 16);
  const enamel = mat(0xe2ddca, 0.32, { metalness: 0.12 }), ivory = mat(0xf0eee2, 0.26), ink = mat(0x242d31, 0.29, { metalness: 0.23 }), iron = mat(0x555b58, 0.33, { metalness: 0.52 }), nickel = mat(0xaaa99a, 0.26, { metalness: 0.67 }), navy = mat(0x233e53, 0.36), darkWood = mat(0x70462b, 0.46), bamboo = mat(0xd4ab73, 0.52);
  const roots = {}, boxes = [], bowls = [], people = [];

  function object(name) {
    return roots[name] = group(stage);
  }

  function tagged(obj, type, data) {
    obj.userData.pick = { type, data };
    return obj;
  }

  function cooker() {
    let base = object("cooker");
    shadow(base, 3.85, 3.35);
    const form = group(base);
    form.scale.z = 0.92;
    lathe(form, enamel, [[0.02, 0.08], [0.86, 0.08], [1.11, 0.15], [1.28, 0.32], [1.39, 0.68], [1.41, 1.03], [1.38, 1.18], [1.3, 1.29], [1.22, 1.31]], 84);
    ring(form, iron, 1.365, 1.15, 0.032);
    lathe(form, ink, [[1.36, 1.2], [1.4, 1.28], [1.35, 1.36], [1.21, 1.365], [1.13, 1.3], [1.04, 0.73], [0.68, 0.5], [0.01, 0.49]]);
    ring(form, nickel, 1.24, 1.345, 0.023);
    for (let s of [-1, 1]) {
      let h = slab(form, ink, 0.48, 0.75, 0.18, 0.16);
      h.position.set(s * 1.35, 0.91, 0);
      let top = slab(form, enamel, 0.46, 0.71, 0.13, 0.16);
      top.position.set(s * 1.35, 1.015, 0);
    }
    const rice = group(form);
    rice.position.y = 1.2;
    A.riceGrains(rice, 1.155, 1.155, 0.29, 1020);
    let latch = slab(form, nickel, 0.6, 0.19, 0.21, 0.08);
    latch.position.set(0, 0.62, 1.24);
    ell(form, ivory, 0, 0.55, 1.29, 0.28, 0.17, 0.095);
    let lid = group(form);
    lid.position.set(0, 1.36, -1.06);
    lid.rotation.x = 1.04;
    const disc = group(lid);
    disc.position.z = -1.035;
    lathe(disc, enamel, [[0.01, -0.17], [0.83, -0.16], [1.17, -0.1], [1.32, 3e-3], [1.33, 0.1], [1.28, 0.17], [0.04, 0.17]]);
    ring(disc, ink, 1.19, 0.183, 0.075);
    ell(disc, iron, 0, 0.17, 0, 1.11, 0.065, 1.11);
    for (let r of [0.55, 0.74, 0.94]) ring(disc, nickel, r, 0.22, 0.016);
    ell(disc, nickel, 0, 0.238, 0, 0.5, 0.065, 0.5);
    for (let j = 0; j < 2; j++) for (let k = 0; k < 9 + j * 4; k++) {
      let a = k * TAU / (9 + j * 4), r = 0.22 + j * 0.12;
      ell(disc, ink, Math.cos(a) * r, 0.294 - j * 0.014, Math.sin(a) * r, 0.028, 6e-3, 0.028, true);
    }
    const paddle = group(stage), head = group(paddle);
    ell(head, bamboo, 0, 0, 0, 0.378, 0.057, 0.53);
    const groove = mat(0xb98e58, 0.54);
    for (let k = -2; k <= 2; k++) tube(head, groove, [[k * 0.09, 0.05, -0.31], [k * 0.11, 0.059, -0.11], [k * 0.1, 0.054, 0.23]], 5e-3);
    tube(paddle, bamboo, [[0, 0, 0.33], [0.015, 0.035, 0.63], [0.041, 0.15, 1.02], [0.071, 0.275, 1.5]], 0.112);
    ell(paddle, bamboo, 0.072, 0.277, 1.5, 0.113, 0.107, 0.13);
    const load = group(head);
    load.position.y = 0.044;
    A.riceGrains(load, 0.346, 0.428, 0.27, 180);
    load.visible = false;
    A.batch(form);
    tagged(base, "rice");
    tagged(paddle, "rice");
    return { base, paddle, load, head, grains: rice.children.find((o) => o.isInstancedMesh) };
  }
  const pot = cooker();

  function lacquerArt(red) {
    return canvas(768, 512, (c, w, h) => {
      c.fillStyle = red ? "#9a2e23" : "#203338";
      c.fillRect(0, 0, w, h);
      for (let i = 0; i < 19e3; i++) {
        c.fillStyle = i % 2 ? "rgba(233,193,133,.055)" : "rgba(20,15,16,.08)";
        c.fillRect(rnd() * w, rnd() * h, rnd() * 1.7 + 0.6, 0.8);
      }
      c.save();
      if (red) {
        c.translate(795, 27);
        c.scale(-0.9, 0.92);
      }
      let gild = "#d0a85d", pale = "#e9d5ab";
      function branch(pts, width) {
        c.lineCap = "round";
        c.strokeStyle = gild;
        c.lineWidth = width;
        c.beginPath();
        c.moveTo(...pts[0]);
        c.bezierCurveTo(...pts[1], ...pts[2], ...pts[3]);
        c.stroke();
      }
      branch([[11, 492], [93, 409], [164, 305], [310, 211]], 4);
      branch([[100, 392], [151, 312], [188, 247], [178, 192]], 2.7);
      branch([[166, 335], [210, 307], [254, 321], [286, 272]], 2.4);
      branch([[193, 294], [221, 275], [233, 217], [234, 193]], 2);
      branch([[66, 437], [54, 390], [71, 373], [66, 343]], 2);
      function blossom(x, y, r, a, bright) {
        c.save();
        c.translate(x, y);
        c.rotate(a);
        for (let i = 0; i < 5; i++) {
          c.rotate(TAU / 5);
          c.fillStyle = bright ? pale : gild;
          c.beginPath();
          c.moveTo(0, 1);
          c.bezierCurveTo(-r * 0.76, -r * 0.45, -r * 0.41, -r * 1.05, 0, -r * 0.85);
          c.bezierCurveTo(r * 0.33, -r * 1.06, r * 0.75, -r * 0.48, 0, 1);
          c.fill();
        }
        c.fillStyle = red ? "#973b2a" : "#5e6253";
        c.beginPath();
        c.arc(0, 0, r * 0.14, 0, TAU);
        c.fill();
        for (let k = 0; k < 6; k++) {
          let a2 = k * TAU / 6;
          c.fillStyle = "#ac853d";
          c.beginPath();
          c.arc(Math.cos(a2) * r * 0.23, Math.sin(a2) * r * 0.23, r * 0.052, 0, TAU);
          c.fill();
        }
        c.restore();
      }
      [[94, 405, 22], [143, 353, 33], [169, 313, 18], [189, 267, 30], [180, 212, 18], [239, 309, 19], [276, 282, 14], [240, 250, 23], [288, 227, 14], [308, 208, 10], [64, 361, 15], [236, 198, 10]].forEach(([x, y, r], k) => blossom(x, y, r, k * 1.3, k % 3 !== 0));
      c.restore();
    });
  }

  function boxSet(red) {
    const w = red ? 2.58 : 3.86, d = red ? 2.03 : 2.69, h = red ? 0.57 : 0.81, r = red ? 0.57 : 0.4;
    const body = object(red ? "red" : "black"), finish = mat(red ? 0x932c24 : 0x202b2c, 0.25, { metalness: 0.14 }), inside = mat(red ? 0xab3d2f : 0x30383a, 0.37, { metalness: 0.07 });
    shadow(body, w * 1.36, d * 1.48);
    let outer = mesh(shell(w, d, [[0.13, 0.03, r], [0.075, 0.063, r], [0.027, 0.15, r], [0, h - 0.07, r], [5e-3, h - 0.018, r], [0.042, h, r - 0.01], [0.112, h - 9e-3, r - 0.035], [0.144, h - 0.06, r - 0.06], [0.18, 0.29, r - 0.05], [0.24, 0.18, r - 0.03], [0.31, 0.157, r - 0.02]]), [finish, inside], body);
    let loop = 44;
    outer.geometry.addGroup(0, 6 * loop * 6, 0);
    outer.geometry.addGroup(6 * loop * 6, outer.geometry.index.count - 6 * loop * 6, 1);
    rimRect(body, gold, w - 0.044, d - 0.044, r, h - 0.036, 9e-3);
    rimRect(body, finish, w - 0.06, d - 0.06, r, 0.161, 0.017);
    const lid = group(stage), lm = mat(0xffffff, 0.28, { map: lacquerArt(red), metalness: 0.19 });
    mesh(shell(w + 0.07, d + 0.07, [[0.062, 0, r + 0.02], [3e-3, 0.045, r + 0.03], [0, 0.127, r + 0.03], [0.025, 0.168, r + 0.024], [0.077, 0.192, r], [0.16, 0.203, r - 0.03]]), lm, lid);
    rimRect(lid, gold, w - 0.068, d - 0.068, r - 6e-3, 0.189, 0.01);
    rimRect(lid, gold, w - 0.183, d - 0.183, r - 0.043, 0.202, 4e-3);
    inside.onBeforeCompile = (shader) => {
      shader.vertexShader = "varying vec3 lacquerPoint;\n" + shader.vertexShader;
      shader.vertexShader = shader.vertexShader.replace("#include <begin_vertex>", "#include <begin_vertex>\nlacquerPoint=position;");
      shader.fragmentShader = "varying vec3 lacquerPoint;\n" + shader.fragmentShader;
      shader.fragmentShader = shader.fragmentShader.replace("#include <color_fragment>", `#include <color_fragment>
float corner=min(${w * 0.5} - abs(lacquerPoint.x),${d * 0.5} - abs(lacquerPoint.z));float occlusion=(1.-smoothstep(.14,.48,corner))*(1.-smoothstep(.17,${h},lacquerPoint.y));diffuseColor.rgb*=1.-.35*occlusion;`);
    };
    inside.customProgramCacheKey = () => red ? "redInterior" : "blackInterior";
    const b = { red, body, lid, w, d, h, r, floor: 0.159, items: [], state: "open", recipient: null, press: 0, tilt: 0, mass: 0, centerX: 0, centerZ: 0 };
    tagged(body, "box", b);
    tagged(lid, "lid", b);
    boxes.push(b);
    return b;
  }
  boxSet(false);
  boxSet(true);

  function porcelain(style) {
    const hues = [["#f1ece0", "#2d5575"], ["#b3d4cb", "#507d7d"], ["#eee9d7", "#4a6878"], ["#e5ded0", "#83583b"], ["#e4e4d7", "#577b77"], ["#e8e6d9", "#324e70"]][style];
    return canvas(1024, 384, (c, w, h) => {
      c.fillStyle = hues[0];
      c.fillRect(0, 0, w, h);
      c.strokeStyle = hues[1];
      c.fillStyle = hues[1];
      for (let y of [91, 99, 148, 160, 214, 221]) {
        c.globalAlpha = y % 2 ? 0.86 : 0.64;
        c.fillRect(0, y, w, y % 2 ? 3 : 2);
      }
      c.globalAlpha = 0.8;
      for (let i = 0; i < 32; i++) {
        let x = i * w / 32;
        for (let y of [125, 187]) {
          c.save();
          c.translate(x, y);
          if (style === 0 || style === 5) {
            for (let k = -1; k <= 1; k++) {
              c.beginPath();
              c.ellipse(k * 6, 0, 2.3, 9, k * 0.6, 0, TAU);
              c.fill();
            }
            c.beginPath();
            c.arc(0, 10, 2, 0, TAU);
            c.fill();
          } else if (style === 2) {
            c.beginPath();
            c.ellipse(0, 0, 3.5, 7, 0.5, 0, TAU);
            c.fill();
          } else {
            c.beginPath();
            c.arc(0, 0, 10, 0, PI);
            c.lineWidth = 1.6;
            c.stroke();
          }
          c.restore();
        }
      }
    });
  }
  const ceramics = Array.from({ length: 6 }, (_, i) => mat(0xffffff, 0.25, { map: porcelain(i), metalness: 0.035 }));
  const glazes = [0x2d5270, 0x5f8583, 0x526e7b, 0x94694f, 0x577b77, 0x28475e].map((c) => mat(c, 0.27));

  function dish(g, rx, rz, h, style, scallop = false) {
    let d = group(g);
    d.scale.set(rx, 1, rz);
    let geo = new T.LatheGeometry([[1e-3, 0.045], [0.36, 0.045], [0.42, 0.065], [0.47, 0.107], [0.64, h * 0.39], [0.84, h * 0.71], [0.968, h - 0.042], [1, h], [0.995, h + 0.022], [0.959, h + 0.027], [0.922, h - 0.014], [0.81, h * 0.72], [0.65, h * 0.44 + 0.035], [0.48, h * 0.27 + 0.055], [0.33, h * 0.23 + 0.041], [1e-3, h * 0.23 + 0.038]].map((a) => new T.Vector2(...a)), 96);
    if (scallop) {
      let p = geo.attributes.position;
      for (let i = 0; i < p.count; i++) {
        let x = p.getX(i), z = p.getZ(i), r = Math.hypot(x, z), v = 1 + 0.018 * Math.cos(Math.atan2(z, x) * 14) * r ** 5;
        p.setXYZ(i, x * v, p.getY(i) + 0.027 * Math.cos(Math.atan2(z, x) * 14) * r ** 6, z * v);
      }
      geo.computeVertexNormals();
    }
    mesh(geo, ceramics[style], d);
    if (!scallop) ring(d, glazes[style], 0.992, h + 0.022, 0.012);
    ring(d, glazes[style], 0.43, 0.083, 0.013);
    return d;
  }
  const bowlData = [
    ["chicken", 1.32, 1.19, 0.54, 0, [[0, 0, 0.41, 1], [-0.63, 0.11, 0.26, 0.3], [0.59, 0.24, 0.28, 2.8], [-0.37, -0.5, 0.34, 3.8], [0.4, -0.49, 0.38, 5], [0.12, -0.04, 0.85, 2.4]]],
    ["egg", 1.63, 1.02, 0.3, 1, [[-0.84, 0.04, 0.21, -0.23], [-0.28, 0.12, 0.24, -0.32], [0.28, 0.05, 0.26, -0.35], [0.83, -0.09, 0.3, -0.4]]],
    ["broccoli", 1.18, 1.05, 0.46, 2, [[-0.52, 0.23, 0.2, 1], [0.32, 0.26, 0.18, 3], [0, -0.37, 0.2, 2], [0.56, -0.33, 0.21, 4.8]]],
    ["tomato", 1.07, 0.98, 0.43, 5, [[-0.49, 0.24, 0.2, 0.2], [0.12, 0.44, 0.23, 1], [0.54, -0.07, 0.24, 3], [-0.46, -0.34, 0.22, 1], [0.13, -0.36, 0.24, 2], [0.02, 0.01, 0.59, 3]]],
    ["sausage", 1.37, 0.96, 0.37, 3, [[-0.3, -0.42, 0.22, -0.15], [0.03, -0.05, 0.24, -0.27], [0.23, 0.34, 0.24, -0.31], [-0.22, 0.12, 0.55, -0.61]]],
    ["lettuce", 1.12, 1, 0.34, 4, [[-0.2, 0.37, 0.19, 0.2], [-0.07, 0.04, 0.21, -0.35], [0.04, -0.18, 0.22, 0.21], [0.23, -0.44, 0.22, -0.47]]]
  ];
  for (const [type, rx, rz, h, style, arr] of bowlData) {
    const root = object(type);
    shadow(root, rx * 2.46, rz * 2.6);
    dish(root, rx, rz, h, style, type === "egg" || type === "lettuce");
    const servings = [];
    arr.forEach(([x, z, y, a], i) => {
      const food = Food.make(type, i);
      food.position.set(x, y, z);
      food.rotation.y = a;
      if (type === "egg") {
        food.rotation.z = -0.86;
        food.rotation.x = 0.09;
        food.position.y += 0.29;
      }
      if (type === "broccoli") food.rotation.z = Math.sin(i + 1) * 0.38;
      if (type === "lettuce") food.rotation.x = -0.35;
      root.add(food);
      servings.push(food);
    });
    let b = { type, root, servings, rx, rz };
    bowls.push(b);
    tagged(root, "supply", b);
  }
  const tea = object("tea");
  shadow(tea, 1.67, 1.52);
  dish(tea, 0.76, 0.69, 0.122, 1);
  const cup = group(tea);
  cup.position.y = 0.079;
  lathe(cup, ceramics[5], [[0.01, 0], [0.27, 0], [0.29, 0.05], [0.31, 0.1], [0.38, 0.15], [0.431, 0.38], [0.444, 0.69], [0.438, 0.735], [0.425, 0.751], [0.404, 0.731], [0.397, 0.62], [0.382, 0.36], [0.28, 0.13], [0.01, 0.13]]);
  ring(cup, glazes[0], 0.438, 0.733, 0.012);
  lathe(cup, mat(0x8f8b37, 0.14, { metalness: 0.11 }), [[0.396, 0.623], [0.388, 0.617], [0.01, 0.616]]);
  A.batch(tea);
  const matRoot = object("mat");
  let slats = [];
  for (let i = 0; i < 48; i++) {
    const c = [0xc8995e, 0xc49558, 0xd0a26c, 0xd6aa73, 0xc79b63][i % 5];
    slats.push([0, 0.062, (i - 23.5) * 0.08, 3.65, 0.038, 0.041, 0, 0, 0, c]);
  }
  instances(matRoot, new T.CylinderGeometry(1, 1, 2, 10).rotateZ(PI / 2), mat(0xffffff, 0.68), slats);
  for (let x of [-3.35, -3.29, -2.77, -2.72, 2.72, 2.77, 3.29, 3.35]) rod(matRoot, darkWood, [x, 0.08, -1.91], [x, 0.08, 1.91], 0.012);
  const linen = object("linen");
  cloth(linen, 4.36, 4.95, 0);
  const eggCloth = object("eggCloth");
  cloth(eggCloth, 4.25, 2.38, 2);
  const sticks = object("sticks");
  let chopMat = mat(0x79502e, 0.35), lacquer = mat(0x323c39, 0.32);
  let rest = slab(sticks, ivory, 0.79, 0.3, 0.18, 0.11);
  rest.position.set(0, 0.02, 0.07);
  for (let s of [-1, 1]) {
    let x = s * 0.125;
    rod(sticks, chopMat, [x, 0.155, -1.3], [x + s * 0.028, 0.239, 1.3], 0.025, 0.061);
    rod(sticks, lacquer, [x + s * 0.023, 0.223, 0.65], [x + s * 0.028, 0.241, 1.3], 0.054, 0.062);
    for (let z of [0.69, 0.75, 0.79]) rod(sticks, gold, [x + s * 0.024, 0.226, z], [x + s * 0.025, 0.227, z + 0.018], 0.056);
  }
  // A small handmade bud vase beyond the working area.
  const sprig = object("sprig");
  lathe(sprig, mat(0x847f65, 0.51), [[0.01, 0], [0.25, 0.01], [0.34, 0.1], [0.39, 0.4], [0.34, 0.64], [0.18, 0.76], [0.14, 0.91], [0.16, 0.94], [0.13, 0.96], [0.105, 0.93], [0.106, 0.81]]);
  const twig = mat(0x635738, 0.77), leaf = mat(0x526b3b, 0.52, { side: T.DoubleSide });
  for (let k = 0; k < 3; k++) {
    let x = 0.48 * (k - 1), z = 0.17 * Math.sin(k * 2), h = 1.85 + 0.22 * k;
    tube(sprig, twig, [[0, 0.8, 0], [x * 0.15, 1.22, z * 0.4], [x * 0.6, 1.6, z], [x, h, z - 0.19]], 0.014);
    for (let j = 0; j < 5; j++) {
      let u = 0.2 + j * 0.14, s = j % 2 ? 1 : -1;
      Food.leafBlade(sprig, leaf, [x * u, 1.12 + (h - 1.12) * u, z * u], [x * u + s * (0.23 + 0.12 * Math.sin(j)), 1.3 + (h - 1.11) * u, z * u - 0.13 + s * 0.09], 0.086, 0.05);
    }
  }
  const skin = mat(0xe4b296, 0.58), nail = mat(0xebc5ad, 0.41);

  function palmModel(isChild, ghost = false, left = false) {
    const g = group(), hand = group(g), size = isChild ? 0.78 : 1;
    hand.scale.set((left ? -1 : 1) * size, size, size);
    const sk = ghost ? new T.MeshStandardMaterial({ color: 0xf8e9d1, transparent: true, opacity: 0.4, depthWrite: false, roughness: 0.58 }) : skin;
    let fingers = [];
    ell(hand, sk, 0, 0.15, -0.19, 0.443, 0.168, 0.49);
    ell(hand, sk, 0, 0.143, -0.58, 0.269, 0.145, 0.38);
    function digit(x, z, len, w, a, id) {
      let d = group(hand);
      d.position.set(x, 0.14, z);
      d.rotation.y = a;
      let geo = new T.LatheGeometry([[1e-3, 0], [w * 0.69, 0.018], [w * 0.97, len * 0.13], [w, len * 0.3], [w * 0.88, len * 0.51], [w * 0.85, len * 0.69], [w * 0.79, len * 0.83], [w * 0.62, len * 0.94], [w * 0.3, len * 0.99], [1e-3, len]].map((p) => new T.Vector2(...p)), 20);
      geo.rotateX(PI / 2);
      const pos = geo.attributes.position;
      for (let i = 0; i < pos.count; i++) {
        let t = pos.getZ(i) / len;
        pos.setY(i, pos.getY(i) * 0.84 + 0.09 * t * t);
      }
      geo.computeVertexNormals();
      mesh(geo, sk, d);
      if (!ghost) {
        let nn = ell(d, nail, 0, 0.057, len * 0.869, w * 0.57, 0.02, len * 0.086, true);
        nn.rotation.x = -0.18;
      }
      fingers.push(d);
      d.userData.rest = a;
      return d;
    }
    digit(-0.299, 0.069, 0.54, 0.104, -0.16, 0);
    digit(-0.109, 0.14, 0.663, 0.109, -0.045, 1);
    digit(0.099, 0.137, 0.624, 0.103, 0.059, 2);
    digit(0.28, 0.062, 0.485, 0.09, 0.166, 3);
    digit(-0.35, -0.26, 0.48, 0.134, -0.89, 4);
    if (!ghost) {
      let sm = mat(isChild ? 0xba8837 : 0x263c50, 0.93, { bumpMap: A.grainNoise, bumpScale: 0.015 });
      let sleeve = mesh(new T.CylinderGeometry(0.36, 0.58, 24, 36), sm, hand, 0, 0.15, -12.72);
      sleeve.rotation.x = PI / 2;
      sleeve.scale.z = 0.76;
      let cuff = mesh(new T.CylinderGeometry(0.346, 0.37, 0.29, 40), sm, hand, 0, 0.15, -0.829);
      cuff.rotation.x = PI / 2;
      cuff.scale.z = 0.79;
      for (let k = 0; k < 3; k++) {
        let band = mesh(new T.CylinderGeometry(0.35 + k * 3e-3, 0.351 + k * 3e-3, 0.013, 40), mat(isChild ? 0xcc9d53 : 0x3f5362, 0.93), hand, 0, 0.15, -0.712 - k * 0.071);
        band.rotation.x = PI / 2;
        band.scale.z = 0.8;
      }
    }
    return { root: g, hand, fingers };
  }
  for (let i = 0; i < 2; i++) {
    const root = group(stage), plate = group(root);
    dish(plate, 2.05, 1.54, 0.17, i ? 2 : 0);
    let plMat = mat(i ? 0x818e68 : 0x3c607e, 0.4);
    if (i) {
      for (let j = 0; j < 21; j++) {
        let a = j * TAU / 21;
        ell(plate, plMat, Math.cos(a) * 1.65, 0.15, Math.sin(a) * 1.19, 0.04, 0.012, 0.065, true).rotation.y = a;
      }
    } else {
      for (let r of [1.47, 1.52, 1.68]) ring(plate, plMat, r, 0.153, 0.015).scale.y = 0.74;
    }
    const hand = palmModel(!!i, false, i === 1), other = palmModel(!!i, false, i === 0);
    root.add(hand.root, other.root);
    hand.root.position.set(i ? 0.81 : -0.91, 0.04, -1.47);
    other.root.position.set(i ? -0.99 : 1.16, 0.03, -1.65);
    other.root.visible = false;
    const p = { root, plate, hand, other, child: !!i, received: [], index: i };
    tagged(root, "person", p);
    people.push(p);
  }
  // Cotton placemats, a window sill, and a timber apron come into view at table height.
  for (const p of people) {
    let runner = group(p.root);
    runner.rotation.y = p.child ? 0.055 : -0.04;
    cloth(runner, 4.32, 3.27, p.child ? 1 : 0);
    runner.position.y = -0.025;
    p.plate.position.y = 0.057;
  }
  A.batch(sprig);
  A.batch(sticks);
  const trim = mat(0x956a43, 0.64), plaster = mat(0xe4d9c2, 0.91), glass = mat(0xe9ebdf, 0.63, { emissive: 0xfcf4da, emissiveIntensity: 0.36 });
  box(stage, plaster, 0, 4.55, -22.35, 52, 11, 0.21);
  box(stage, trim, 0, -0.41, -5.993, 17.8, 0.24, 0.18);
  const floorWood = mat(0xb4946e, 0.79, { map: woodTex });
  box(stage, floorWood, 0, -5.53, 0, 65, 0.32, 65);
  for (let x of [-8.38, 8.38]) for (let z of [-5.53, 7.51]) box(stage, trim, x, -2.89, z, 0.43, 4.7, 0.43);
  box(stage, trim, 0, -0.68, 7.62, 17.14, 0.39, 0.17);
  box(stage, trim, -9.8, 2.14, -22.08, 13.6, 0.24, 0.65);
  box(stage, glass, -9.8, 5.5, -22.1, 13.2, 6.65, 0.1);
  for (let i = 0; i < 5; i++) box(stage, trim, -16.4 + i * 3.3, 5.5, -21.99, 0.083, 6.66, 0.11);
  for (let y of [2.21, 5.4, 8.77]) box(stage, trim, -9.8, y, -21.99, 13.23, 0.09, 0.12);
  const next = object("next");
  for (let i = 0; i < 2; i++) {
    const g = mesh(shell(2.2, 1.61, [[0.12, 0, 0.36], [0, 0.17, 0.37], [0, 0.44, 0.37], [0.09, 0.45, 0.34], [0.15, 0.15, 0.3], [0.24, 0.12, 0.29]]), mat(i ? 0x813729 : 0x34403c, 0.31), next, 0, i * 0.22);
    g.rotation.y = i * 0.15;
  }
  tagged(next, "next");

  function locate(o, x, y, z, a = 0, s = 1) {
    o.position.set(x, y, z);
    o.rotation.set(0, a, 0);
    o.scale.setScalar(s);
  }
  let portrait = false, day = 0;

  function layout(vertical, number, reset = false) {
    portrait = vertical;
    day = number;
    const drift = number ? Math.sin(number * 2) * 0.14 : 0;
    const coords = vertical ? { tea: [2.3, -6.05, 0.2, 0.85], cooker: [-1.96, -4.23, -0.14, 0.91], black: [-1.44, -0.2, 0.055, 0.93], red: [1.69, 0.32, -0.1, 0.91], chicken: [1.66, -3.96, -0.12, 0.99], egg: [-1.79, 2.22, 0.12, 0.93], broccoli: [1.52, 2.59, -0.24, 0.94], tomato: [-2.29, 4.63, -0.12, 0.83], sausage: [-0.26, 5.03, 0.2, 0.82], lettuce: [1.97, 4.91, -0.08, 0.88], sprig: [0.32, -6.2, -0.32, 0.74], mat: [0, -0.03, 0.025, 0.94], linen: [-2.1, -4.36, -0.19, 0.86], eggCloth: [-1.91, 2.35, 0.2, 0.93], sticks: [-3.38, 1.86, -0.18, 0.71] } : { tea: [4.61, -4.55, 0.19, 1.02], cooker: [-4.88, -1.45, -0.18, 1], black: [-1.24, 0.16, 0.085, 1], red: [2.06, 0.75, -0.135, 1], chicken: [4.31, -2.27, -0.14, 1.05], egg: [-4.45, 2.69, 0.15, 1.04], broccoli: [5.06, 0.22, 0.21, 1], tomato: [-1.47, 3.54, -0.2, 1], sausage: [1.42, 3.74, -0.26, 1.02], lettuce: [4.36, 3.05, -0.12, 0.99], sprig: [-2.68, -3.76, -0.28, 0.87], mat: [0.17, 0.1, 0.012, 1.02], linen: [-5.04, -1.58, -0.23, 1], eggCloth: [-4.83, 2.8, 0.22, 1.09], sticks: [-6.37, 2.58, -0.27, 0.96] };
    if (number % 2) {
      let a = coords.broccoli, b = coords.lettuce;
      coords.lettuce = [a[0], a[1], a[2], b[3]];
      coords.broccoli = [b[0], b[1], b[2], a[3]];
    }
    for (let [name, [x, z, a, s]] of Object.entries(coords)) {
      if (name === "black" || name === "red") continue;
      let y = ["mat", "linen", "eggCloth"].includes(name) ? 0 : name === "cooker" ? 0.095 : name === "egg" || name === "sticks" ? 0.102 : 0.012;
      locate(roots[name], x, y, z, a + (["mat", "linen", "eggCloth", "cooker"].includes(name) ? 0 : drift), s);
    }
    for (const b of boxes) {
      let [x, z, a, s] = coords[b.red ? "red" : "black"];
      b.home = new T.Vector3(x, 0.112, z);
      b.yaw = a;
      b.size = s;
      b.lidHome = new T.Vector3(x + (b.red ? 0.12 : 0.23), vertical ? 0.925 : 1.04, z - (b.red ? 1.53 : 1.93) * s);
      b.lidAngle = b.red ? 0.76 : 0.78;
      if (reset || !b.recipient) {
        if (b.state !== "moving") locate(b.body, x, 0.112, z, a, s);
        if (b.state === "open") restLid(b);
        else if (b.state !== "moving" && b.state !== "opening") seatLid(b);
      }
    }
    let plateZ = vertical ? -8.6 : -7.95;
    for (let i = 0; i < 2; i++) {
      let p = people[i];
      locate(p.root, (i ? 1 : -1) * (vertical ? 1.98 : 2.77), 4e-3, plateZ + (i ? 0.18 : 0), i ? -0.1 : 0.08, vertical ? 0.87 : 1);
      if (!reset) for (const b of p.received) {
        if (b.state === "delivered" || b.state === "served") {
          let dest = platePos(b);
          locate(b.body, dest.x, dest.y, dest.z, b.yaw * 0.38, b.size);
          if (b.state === "served") openedLid(b);
          else seatLid(b);
        }
      }
    }
    locate(next, vertical ? -0.05 : 0.21, 0.02, plateZ - 2.39, -0.16, vertical ? 0.68 : 0.83);
    next.visible = false;
    const point = new T.Vector3(0.16, 1.45, 0.05);
    pot.base.localToWorld(point);
    pot.rest = point;
    pot.restYaw = vertical ? -0.55 : 0.72;
    restPaddle();
    sun.position.set(-8 + Math.sin(number * 0.91) * 2, 15, -7 + Math.sin(number) * 1.7);
  }

  function restPaddle() {
    pot.paddle.position.copy(pot.rest);
    pot.paddle.rotation.set(-0.15, pot.restYaw, -0.055);
    pot.paddle.scale.copy(pot.base.scale);
  }

  function restLid(b) {
    locate(b.lid, b.lidHome.x, b.lidHome.y, b.lidHome.z, b.yaw + (b.red ? -0.055 : 0.05), b.size);
    b.lid.rotateX(b.lidAngle);
  }

  function seatLid(b) {
    b.lid.scale.copy(b.body.scale);
    b.lid.quaternion.copy(b.body.quaternion);
    b.lid.position.copy(b.body.localToWorld(new T.Vector3(0, b.h + (b.gap || 0), 0)));
    b.lid.rotateZ(b.tilt || 0);
    b.lid.rotateX(b.tiltX || 0);
  }

  function platePos(b) {
    const p = b.recipient, idx = p.received.indexOf(b);
    return p.root.localToWorld(new T.Vector3(idx > 0 ? 0.43 : -0.12, idx > 0 ? 0.035 : 0.215, idx > 0 ? 2.84 : -0.02));
  }

  function openedLid(b) {
    const dest = platePos(b);
    b.lid.scale.copy(b.body.scale);
    b.lid.position.copy(dest);
    b.lid.position.z -= b.d * 0.7 * b.size;
    b.lid.position.x += b.w * 0.15;
    if (b.recipient.received.indexOf(b) > 0) {
      b.lid.position.z = dest.z + 0.05;
      b.lid.position.x = dest.x + (b.recipient.child ? 1 : -1) * (b.w + 0.16) * b.size;
    }
    b.lid.position.y = 0.065;
    b.lid.rotation.set(0.045, b.body.rotation.y - 0.17, 0);
  }

  function hintFinger() {
    const root = group(stage), m = new T.MeshStandardMaterial({ color: 0xf6e0bc, transparent: true, opacity: 0.35, depthWrite: false, roughness: 0.55 });
    let digit = group(root);
    ell(digit, m, 0, 0.32, 0, 0.108, 0.33, 0.108);
    ell(digit, m, 0.055, 0.69, 0.09, 0.131, 0.192, 0.126);
    ell(digit, m, 0.16, 0.82, 0.23, 0.197, 0.17, 0.159);
    digit.rotation.x = 0.49;
    digit.rotation.z = -0.36;
    root.traverse((o) => {
      o.castShadow = false;
      o.receiveShadow = false;
    });
    root.visible = false;
    return root;
  }
  return { scene, stage, camera, renderer, sun, roots, boxes, bowls, people, table, breakfast, pot, next, tagged, layout, restPaddle, restLid, seatLid, platePos, openedLid, hintFinger, locate, get portrait() {
    return portrait;
  } };
})();
