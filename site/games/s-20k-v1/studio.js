'use strict';
const T = THREE, PI = Math.PI, TAU = PI * 2;
const V = (x = 0, y = 0, z = 0)=>new T.Vector3(x, y, z);
const clamp = (x, a = 0, b = 1)=>Math.max(a, Math.min(b, x));
const mix = T.MathUtils.lerp, smooth = (a, b, x)=>T.MathUtils.smoothstep(x, a, b);
const rand = (a, b)=>mix(a, b, Math.random());
const scene = new T.Scene(), camera = new T.PerspectiveCamera(33, 1, .04, 120);
const canvas = document.querySelector('canvas');
const renderer = new T.WebGLRenderer({
    canvas,
    antialias: true,
    alpha: false,
    powerPreference: 'high-performance'
});
renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 1.8));
renderer.transmissionResolutionScale = .5;
renderer.shadowMap.enabled = true;
renderer.shadowMap.type = T.PCFSoftShadowMap;
renderer.outputColorSpace = T.SRGBColorSpace;
renderer.toneMapping = T.ACESFilmicToneMapping;
renderer.toneMappingExposure = 1.08;
scene.background = new T.Color(0xe9d6b6);

function group(parent) {
    const g = new T.Group();
    if (parent) parent.add(g);
    return g;
}

function mat(color, roughness = .54, metalness = 0, more = {}) {
    return new T.MeshStandardMaterial({
        color,
        roughness,
        metalness,
        ...more
    });
}

function mesh(parent, geo, material, x = 0, y = 0, z = 0) {
    const m = new T.Mesh(geo, material);
    m.position.set(x, y, z);
    m.castShadow = true;
    m.receiveShadow = true;
    parent.add(m);
    return m;
}
const sphereGeo = new T.SphereGeometry(1, 20, 14), unitBox = new T.BoxGeometry(1, 1, 1);

function oval(g, m, x, y, z, rx, ry, rz) {
    const o = mesh(g, sphereGeo, m, x, y, z);
    o.scale.set(rx, ry, rz);
    return o;
}

function box(g, m, x, y, z, w, h, d) {
    const o = mesh(g, unitBox, m, x, y, z);
    o.scale.set(w, h, d);
    return o;
}

function cyl(g, m, x, y, z, rt, rb, h, n = 48) {
    return mesh(g, new T.CylinderGeometry(rt, rb, h, n), m, x, y, z);
}

function rod(g, m, a, b, r, rb = r, n = 12) {
    const d = b.clone().sub(a), p = a.clone().add(b).multiplyScalar(.5);
    const o = cyl(g, m, p.x, p.y, p.z, r, rb, d.length(), n);
    o.quaternion.setFromUnitVectors(V(0, 1, 0), d.normalize());
    return o;
}

function lathe(g, m, profile, n = 80) {
    return mesh(g, new T.LatheGeometry(profile.map(([x, y])=>new T.Vector2(x, y)), n), m);
}

function ring(g, m, r, t, y = 0, n = 80) {
    const o = mesh(g, new T.TorusGeometry(r, t, 9, n), m, 0, y, 0);
    o.rotation.x = PI / 2;
    return o;
}

function tubeGeometry(points, r = .025, sides = 7, steps = 0, closed = false) {
    const curve = new T.CatmullRomCurve3(points, closed, 'centripetal');
    return new T.TubeGeometry(curve, steps || Math.max(8, points.length * 3), r, sides, closed);
}

function tube(g, m, pts, r = .025, sides = 7, steps = 0, closed = false) {
    return mesh(g, tubeGeometry(pts, r, sides, steps, closed), m);
}
// Combine the hundreds of reed and textile details into a handful of draw calls.

function bake(g) {
    const sets = new Map();
    for (const c of g.children.slice()) {
        if (!c.isMesh || Array.isArray(c.material) || c.children.length) continue;
        c.updateMatrix();
        const a = c.geometry.index ? c.geometry.toNonIndexed() : c.geometry.clone();
        a.applyMatrix4(c.matrix);
        if (!sets.has(c.material)) sets.set(c.material, []);
        sets.get(c.material).push(a);
        g.remove(c);
    }
    for (const [m, geos] of sets) {
        const g2 = new T.BufferGeometry();
        for (const key of [
            'position',
            'normal',
            'uv'
        ]) {
            const count = geos.reduce((s, v)=>s + (v.attributes[key]?.array.length || 0), 0);
            if (!count || geos.some((v)=>!v.attributes[key])) continue;
            const data = new Float32Array(count);
            let i = 0;
            for (const v of geos) {
                data.set(v.attributes[key].array, i);
                i += v.attributes[key].array.length;
            }
            g2.setAttribute(key, new T.BufferAttribute(data, geos[0].attributes[key].itemSize));
        }
        mesh(g, g2, m);
        geos.forEach((v)=>v.dispose());
    }
    return g;
}

function paint(w, h, fn, repeat = true) {
    const c = document.createElement('canvas');
    c.width = w;
    c.height = h;
    fn(c.getContext('2d'), w, h);
    const t = new T.CanvasTexture(c);
    t.colorSpace = T.SRGBColorSpace;
    if (repeat) t.wrapS = t.wrapT = T.RepeatWrapping;
    t.anisotropy = Math.min(8, renderer.capabilities.getMaxAnisotropy());
    return t;
}

function grain(base, dark, light, amount = 1) {
    return paint(1024, 512, (c, w, h)=>{
        c.fillStyle = base;
        c.fillRect(0, 0, w, h);
        for (let i = 0; i < 1350; i++) {
            let y = rand(0, h), x = rand(-w * .4, w);
            const len = rand(16, w * .8), amp = rand(.1, 3) * amount;
            c.lineWidth = rand(.25, 2.6);
            c.globalAlpha = rand(.03, .2);
            c.strokeStyle = i % 3 ? dark : light;
            c.beginPath();
            c.moveTo(x, y);
            c.bezierCurveTo(x + len * .26, y - amp, x + len * .6, y + amp, x + len, y + amp * .4);
            c.stroke();
        }
        for (let i = 0; i < 9000; i++) {
            c.globalAlpha = rand(.02, .07);
            c.fillStyle = i % 2 ? light : dark;
            c.fillRect(rand(0, w), rand(0, h), rand(.5, 3), .8);
        }
        c.globalAlpha = 1;
    });
}
const woods = grain('#e4c696', '#996f43', '#fff4cc', 2.4), wood = mat(0xffffff, .59, 0, {
    map: woods
});
const cane = mat(0xffffff, .38, 0, {
    map: grain('#ecd39c', '#9e703c', '#fff1c4')
});
const skin = mat(0xffffff, .48, 0, {
    map: grain('#b0aa66', '#6f783e', '#f2d596')
});
const beech = mat(0xd5ab73, .5), honey = mat(0xac7a46, .52), jade = mat(0x436e64, .3), jadeLight = mat(0x7ca39a, .34), brass = mat(0xc99a51, .29, .64), ivory = mat(0xf4eeda, .32), porcelain = mat(0xf1ead9, .23);
const noodleMat = mat(0xfff3ce, .38, 0, {
    envMapIntensity: .6
}), wetNoodle = mat(0xfff4d6, .23);
const glass = new T.MeshPhysicalMaterial({
    color: 0xb9e5de,
    transparent: true,
    opacity: .90,
    transmission: .87,
    thickness: .17,
    ior: 1.47,
    roughness: .075,
    metalness: 0,
    clearcoat: 1,
    side: T.DoubleSide,
    depthWrite: false
});
const glassEdge = mat(0xb3dbd5, .16, .17, {
    transparent: true,
    opacity: .78,
    depthWrite: false
});
const waterMat = new T.MeshPhysicalMaterial({
    color: 0x84cac3,
    transparent: true,
    opacity: .5,
    roughness: .095,
    metalness: .14,
    clearcoat: 1,
    side: T.DoubleSide,
    depthWrite: false
});
const glint = mat(0xe9ffef, .15, .12, {
    transparent: true,
    opacity: .69,
    depthWrite: false
});
const foam = mat(0xdcf4e6, .22);
const porcelainBlue = mat(0x324f68, .27), soupMat = mat(0x694023, .16, .04);
const portrait = ()=>innerHeight > innerWidth * 1.14;
const roomTex = paint(512, 256, (c, w, h)=>{
    const grad = c.createLinearGradient(0, 0, 0, h);
    grad.addColorStop(0, '#fffae8');
    grad.addColorStop(.54, '#d7cbb2');
    grad.addColorStop(1, '#9f876a');
    c.fillStyle = grad;
    c.fillRect(0, 0, w, h);
    for (const x of [34, 84, 144, 356, 410]) {
        c.fillStyle = '#fffef6';
        c.fillRect(x, 45, 42, 75);
        c.fillStyle = '#cfc6b3';
        c.fillRect(x, 87, 42, 2);
    }
}, false);
roomTex.mapping = T.EquirectangularReflectionMapping;
const pmrem = new T.PMREMGenerator(renderer);
scene.environment = pmrem.fromEquirectangular(roomTex).texture;
pmrem.dispose();
roomTex.dispose();
scene.environmentIntensity = .62;
scene.add(new T.HemisphereLight(0xfffbeb, 0xe2b688, 1.38));
const sun = new T.DirectionalLight(0xfff2d5, 3.05);
sun.position.set(-5, 10, -4);
sun.castShadow = true;
sun.shadow.mapSize.set(2048, 2048);
Object.assign(sun.shadow.camera, {
    left: -9,
    right: 9,
    top: 9,
    bottom: -9,
    near: .2,
    far: 30
});
sun.shadow.bias = -.00035;
sun.shadow.normalBias = .016;
sun.shadow.radius = 3;
scene.add(sun);
const fill = new T.DirectionalLight(0xe6f7ff, .66);
fill.position.set(3, 4, 7);
scene.add(fill);
const aoTexture = paint(128, 128, (c)=>{
    const g = c.createRadialGradient(64, 64, 0, 64, 64, 64);
    g.addColorStop(0, 'rgba(69,45,24,.48)');
    g.addColorStop(.5, 'rgba(69,45,24,.20)');
    g.addColorStop(1, 'rgba(69,45,24,0)');
    c.fillStyle = g;
    c.fillRect(0, 0, 128, 128);
}, false);

function contact(g, x, z, rx, rz, y = .011) {
    const o = mesh(g, new T.PlaneGeometry(2, 2), new T.MeshBasicMaterial({
        map: aoTexture,
        transparent: true,
        depthWrite: false,
        opacity: .57
    }), x, y, z);
    o.rotation.x = -PI / 2;
    o.scale.set(rx, rz, 1);
    o.castShadow = false;
    return o;
}

function soundInit() {
    if (audio) return;
    const C = window.AudioContext || window.webkitAudioContext;
    if (!C) return;
    audio = new C();
    master = audio.createGain();
    master.gain.value = .25;
    master.connect(audio.destination);
    const len = audio.sampleRate * 2, buf = audio.createBuffer(1, len, audio.sampleRate), d = buf.getChannelData(0);
    for (let i = 0, a = 0; i < len; i++) {
        a = .89 * a + .11 * (Math.random() * 2 - 1);
        d[i] = a;
    }
    const noise = audio.createBufferSource();
    noise.buffer = buf;
    noise.loop = true;
    const filter = audio.createBiquadFilter();
    filter.type = 'bandpass';
    filter.frequency.value = 1700;
    filter.Q.value = .55;
    waterSound = audio.createGain();
    waterSound.gain.value = 0;
    noise.connect(filter);
    filter.connect(waterSound);
    waterSound.connect(master);
    noise.start();
}
let audio, master, waterSound;

function tone(freq, vol = .25, dur = .16, type = 'sine', end = .78) {
    if (!audio) return;
    const t = audio.currentTime, o = audio.createOscillator(), amp = audio.createGain();
    o.type = type;
    o.frequency.setValueAtTime(freq, t);
    o.frequency.exponentialRampToValueAtTime(freq * end, t + dur);
    amp.gain.setValueAtTime(.0001, t);
    amp.gain.exponentialRampToValueAtTime(vol, t + .006);
    amp.gain.exponentialRampToValueAtTime(.0001, t + dur);
    o.connect(amp);
    amp.connect(master);
    o.start(t);
    o.stop(t + dur + .01);
    o.onended = ()=>{
        o.disconnect();
        amp.disconnect();
    };
}
