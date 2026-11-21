'use strict';
const room = group(scene), props = group(scene);
woods.repeat.set(1.8, 1);
for (let i = -7; i <= 7; i++) {
    const g = group(room);
    g.position.z = i * 1.58;
    const m = wood.clone();
    m.map = woods.clone();
    m.map.offset.set(Math.random(), Math.random());
    m.map.needsUpdate = true;
    const plank = mesh(g, new T.PlaneGeometry(38, 1.573), m, 0, -.006, 0);
    plank.rotation.x = -PI / 2;
}
box(room, mat(0xb79c76), 0, -.08, 0, 38, .12, 32);

function fabricTexture(navy) {
    return paint(1024, 512, (c, w, h)=>{
        c.fillStyle = navy ? '#325771' : '#e8ddbf';
        c.fillRect(0, 0, w, h);
        for (let y = 0; y < h; y += 2) {
            c.fillStyle = y % 4 ? 'rgba(255,253,225,.16)' : 'rgba(75,49,29,.10)';
            c.fillRect(0, y, w, 1);
        }
        for (let x = 0; x < w; x += 2) {
            c.fillStyle = x % 4 ? 'rgba(255,255,244,.11)' : 'rgba(47,42,34,.085)';
            c.fillRect(x, 0, 1, h);
        }
        if (navy) {
            c.strokeStyle = '#c6ccbe';
            c.lineWidth = 1.8;
            c.setLineDash([6, 5]);
            for (let y = -32; y <= h + 32; y += 36) {
                for (let x = -32; x < w + 32; x += 72) {
                    c.beginPath();
                    c.arc(x + (y % 72 ? 36 : 0), y, 36, PI, TAU);
                    c.stroke();
                    c.beginPath();
                    c.arc(x + (y % 72 ? 36 : 0), y, 26, PI, TAU);
                    c.stroke();
                }
            }
        } else {
            for (const side of [0, 1])for (const [p, s] of [
                [.027, .003],
                [.039, .012],
                [.058, .004],
                [.075, .003]
            ]) {
                c.fillStyle = '#ac6350';
                c.fillRect(0, (side ? 1 - p - s : p) * h, w, s * h);
            }
        }
        for (let i = 0; i < 22000; i++) {
            c.fillStyle = i % 2 ? 'rgba(45,33,22,.045)' : 'rgba(255,255,247,.10)';
            c.fillRect(rand(0, w), rand(0, h), rand(.6, 3), 1);
        }
    });
}
const linen = mat(0xffffff, .94, 0, {
    map: fabricTexture(false),
    side: T.DoubleSide
}), indigo = mat(0xffffff, .95, 0, {
    map: fabricTexture(true),
    side: T.DoubleSide
});

function cloth(parent, material, w, d, waves, y) {
    const geo = new T.PlaneGeometry(w, d, 64, 32);
    geo.rotateX(-PI / 2);
    const a = geo.attributes.position;
    for (let i = 0; i < a.count; i++) {
        const x = a.getX(i), z = a.getZ(i);
        a.setY(i, waves * (.55 + .3 * Math.sin(2 * x + z) * Math.cos(2.1 * z) + .14 * Math.cos(5 * x - z)) + y);
        a.setZ(i, z + .01 * Math.sin(3 * x + z));
    }
    geo.computeVertexNormals();
    return mesh(parent, geo, material);
}
const runner = group(room);
cloth(runner, linen, 21, 4.9, .012, .009);
runner.rotation.y = -.22;
const basket = group(props), napkin = group(props);
cloth(napkin, indigo, 2.92, 2.35, .045, .023);
const strawA = mat(0xc59959, .67), strawB = mat(0xd7b276, .62), strawC = mat(0x9c773f, .67);

function buildBasket() {
    const g = group(basket), r = 1.19;
    lathe(g, strawC, [
        [0, .074],
        [.78, .074],
        [.91, .11],
        [
            r,
            .36
        ],
        [
            r,
            .39
        ],
        [1.15, .38],
        [.86, .16],
        [0, .12]
    ]);
    for (let a = -1.06; a < 1.07; a += .069) {
        const half = Math.sqrt(r * r - a * a) * .965;
        for (let dir = 0; dir < 2; dir++) {
            const pts = [];
            for (let k = 0; k <= 36; k++) {
                const b = mix(-half, half, k / 36), x = dir ? b : a, z = dir ? a : b;
                pts.push(V(x, .138 + .235 * Math.pow(Math.hypot(x, z) / r, 3.5) + .011 * Math.cos(b / .069 * PI + Math.round(a / .069) * PI + dir * PI), z));
            }
            tube(g, dir ? strawA : strawB, pts, .024, 4, 40);
        }
    }
    for (let j = 0; j < 3; j++) {
        const pts = [];
        for (let i = 0; i < 360; i++) {
            const a = TAU * i / 360, tw = a * 45 + j * TAU / 3;
            const rr = r + .024 * Math.cos(tw);
            pts.push(V(rr * Math.cos(a), .377 + .027 * Math.sin(tw), rr * Math.sin(a)));
        }
        tube(g, j === 0 ? strawA : strawB, pts, .029, 5, 420, true);
    }
    ring(g, honey, 1.144, .028, .30);
    bake(g);
}
buildBasket();

function servingNest(seed, r = .35) {
    const g = group(), turn = rand(-PI, PI);
    for (let k = 0; k < 14; k++) {
        const p = [], phase = k * .26, rad = r * (.73 + .22 * Math.sin(k * 2.4));
        for (let i = 0; i <= 58; i++) {
            const t = i / 58, a = t * TAU * 1.35 + phase + seed, rr = rad * (.90 + .13 * Math.cos(a * 2 + seed) + .10 * Math.sin(a * 3 + phase));
            let x = Math.cos(a) * rr, z = Math.sin(a) * rr * .76;
            x += r * .33 * Math.sin(t * 4.7 + phase);
            z += r * .16 * Math.cos(t * 4.8 + seed);
            const y = .032 + k * .013 + .06 * Math.sin(t * PI) + .028 * Math.sin(a + phase) + .022 * Math.cos(3 * a);
            p.push(V(x, y, z));
        }
        tube(g, noodleMat, p, .0175, 6, 63);
    }
    bake(g);
    g.rotation.y = turn;
    return g;
}
const nests = [];
for (const [x, z, r] of [
    [-.53, -.42, .39],
    [.18, -.57, .4],
    [.62, -.06, .39],
    [-.16, .02, .43],
    [-.64, .31, .37],
    [.07, .57, .39]
]) {
    const n = servingNest(rand(0, TAU), r);
    n.position.set(x, .22 + .06 * (x * x + z * z), z);
    basket.add(n);
    nests.push(n);
}

function leaf(g, m, length, width, curve = 0) {
    const a = [], idx = [];
    for (let i = 0; i <= 12; i++) {
        const t = i / 12, w = Math.pow(Math.sin(PI * t), .75) * width;
        for (let j = -1; j <= 1; j++) {
            a.push(length * t, .09 * Math.sin(PI * t) - .04 * Math.abs(j) * Math.sin(PI * t) + curve * t * t, j * w + .035 * Math.sin(3 * t));
        }
        if (i < 12) {
            const n = i * 3;
            idx.push(n, n + 3, n + 1, n + 1, n + 3, n + 4, n + 1, n + 4, n + 2, n + 2, n + 4, n + 5);
        }
    }
    const geo = new T.BufferGeometry();
    geo.setAttribute('position', new T.Float32BufferAttribute(a, 3));
    geo.setIndex(idx);
    geo.computeVertexNormals();
    return mesh(g, geo, m);
}
const foliage = group(room), leafGreen = mat(0x657d43, .54, 0, {
    side: T.DoubleSide
}), leafLight = mat(0x93a75e, .55, 0, {
    side: T.DoubleSide
});
for (let j = 0; j < 3; j++) {
    const sprig = group(foliage);
    sprig.rotation.y = (j - 1) * .55;
    sprig.position.z = j * .16;
    const p = [
        V(),
        V(.52, .14, .05),
        V(1.15, .22, -.11),
        V(1.9, .28, -.04)
    ];
    tube(sprig, leafGreen, p, .018);
    for (let k = 0; k < 7; k++) {
        const l = leaf(sprig, k % 3 ? leafGreen : leafLight, rand(.43, .85), rand(.085, .145), -.06);
        l.position.set(.22 + k * .22, .07 + k * .035, -.02);
        l.rotation.y = (k % 2 ? 1 : -1) * rand(.34, 1.17);
        l.rotation.x = rand(-.5, .5);
    }
    bake(sprig);
}
const pitcher = group(props);
const jugBody = group(pitcher);

function buildJug() {
    const g = jugBody, profile = [
        [.02, .075],
        [.40, .075],
        [.50, .13],
        [.548, .30],
        [.57, 1.0],
        [.547, 1.45],
        [.526, 1.69],
        [.548, 1.73],
        [.512, 1.73],
        [.49, 1.66],
        [.511, .35],
        [.455, .16],
        [.02, .16]
    ];
    const o = lathe(g, glass, profile, 80);
    const a = o.geometry.attributes.position;
    for (let i = 0; i < a.count; i++) {
        const y = a.getY(i), x = a.getX(i), z = a.getZ(i), angle = Math.atan2(z, -x), lip = Math.exp(-angle * angle / .105) * smooth(1.36, 1.71, y);
        a.setXYZ(i, x - .23 * lip, y + .085 * lip, z);
    }
    o.geometry.computeVertexNormals();
    o.castShadow = false;
    const p = [];
    for (let i = 0; i < 96; i++) {
        const angle = TAU * i / 96, x = Math.cos(angle), z = Math.sin(angle), v = Math.atan2(z, -x), lip = Math.exp(-v * v / .105);
        p.push(V(.535 * x - .23 * lip, 1.73 + .085 * lip, .535 * z));
    }
    tube(g, glassEdge, p, .026, 8, 96, true);
    ring(g, glassEdge, .467, .035, .13);
    const handle = [
        V(.49, 1.42, 0),
        V(.79, 1.43, 0),
        V(.98, 1.23, 0),
        V(.99, .84, 0),
        V(.82, .53, 0),
        V(.52, .49, 0)
    ];
    tube(g, glassEdge, handle, .077, 12, 40);
    tube(g, glass, handle, .105, 12, 40);
    const ribs = group(g);
    for (let i = 0; i < 28; i++) {
        const a = i * TAU / 28, r = .535;
        const p = [
            V(.47 * Math.cos(a), .15, .47 * Math.sin(a)),
            V(r * Math.cos(a), .34, r * Math.sin(a)),
            V(.56 * Math.cos(a), 1.03, .56 * Math.sin(a))
        ];
        tube(ribs, glassEdge, p, .008, 5, 10);
    }
    bake(ribs);
    ribs.traverse((o)=>o.castShadow = false);
}
buildJug();
const jugWater = lathe(jugBody, waterMat, [
    [.01, .16],
    [.45, .16],
    [.51, .34],
    [.526, 1.12],
    [.506, 1.13],
    [.01, 1.13]
]);
jugWater.castShadow = false;
ring(jugBody, glint, .51, .009, 1.13);
const bowl = group(props);

function makeBowl() {
    // Indigo brush strokes follow the curved porcelain, including the inner lip.
    const tex = paint(1024, 256, (c, w, h)=>{
        c.fillStyle = '#f5f0dc';
        c.fillRect(0, 0, w, h);
        for (let i = 0; i < 42; i++) {
            const x = i * w / 42;
            c.fillStyle = i % 3 ? '#385775' : '#46657c';
            c.beginPath();
            c.moveTo(x, 126);
            c.bezierCurveTo(x + 2, 118, x + 2, 73, x + 9, 58);
            c.bezierCurveTo(x + 17, 83, x + 10, 103, x + 5, 123);
            c.closePath();
            c.fill();
            c.beginPath();
            c.ellipse(x + 6, 49, 2.5, 4, -.16, 0, TAU);
            c.fill();
        }
        for (let i = 0; i < 40; i++) {
            const x = i * w / 40;
            c.fillStyle = i % 4 ? '#385a79' : '#496882';
            c.beginPath();
            c.moveTo(x + 3, 186);
            c.bezierCurveTo(x + 2, 175, x + 3, 157, x + 10, 151);
            c.bezierCurveTo(x + 15, 162, x + 11, 180, x + 3, 186);
            c.fill();
        }
        for (const [y, s] of [
            [10, 4],
            [18, 2],
            [35, 4],
            [135, 5],
            [146, 2],
            [202, 3],
            [218, 1]
        ]) {
            c.fillStyle = '#395775';
            c.fillRect(0, y, w, s);
        }
    });
    const shape = [
        [.02, .055],
        [.37, .055],
        [.41, .08],
        [.40, .155],
        [.49, .19],
        [.64, .28],
        [.78, .47],
        [.87, .71],
        [.875, .78],
        [.85, .808],
        [.813, .78],
        [.79, .68],
        [.72, .49],
        [.59, .335],
        [.36, .238],
        [.01, .227]
    ];
    lathe(bowl, mat(0xffffff, .22, 0, {
        map: tex
    }), shape);
    ring(bowl, porcelainBlue, .855, .016, .794);
    ring(bowl, porcelainBlue, .40, .015, .115);
}
makeBowl();
const broth = lathe(bowl, soupMat, [
    [.01, .24],
    [.59, .34],
    [.72, .50],
    [.759, .592],
    [.746, .596],
    [.01, .595]
]);
broth.castShadow = false;
const scallion = mat(0x729447, .46), scallionIn = mat(0xb4c46c, .51);

function onion(g, x, y, z, r, a = 0) {
    const root = group(g);
    root.position.set(x, y, z);
    root.rotation.set(.08, a, .07);
    const v = ring(root, scallion, r, .018);
    v.scale.y = .76;
    const v2 = ring(root, scallionIn, r - .017, .007, .008);
    v2.scale.y = .76;
    return root;
}
for (let i = 0; i < 7; i++) {
    const a = rand(-1.3, 1.0), r = rand(.45, .62);
    onion(bowl, r * Math.cos(a), .614, r * Math.sin(a), rand(.043, .076), rand(-PI, PI));
}
const rest = group(props), chopMat = mat(0x934d32, .35), restMat = mat(0x749486, .23);
const pillow = oval(rest, restMat, .35, .085, 0, .16, .082, .365);
pillow.rotation.y = -.12;
for (let j = 0; j < 2; j++) {
    const z = (j - .5) * .178;
    rod(rest, chopMat, V(-.91, .066, z), V(1.01, .203, z + .025 * j), .039, .017, 12);
    for (let i = 0; i < 3; i++)rod(rest, brass, V(.72 + .069 * i, .183 + .005 * i, z + .022 * j), V(.737 + .069 * i, .185 + .005 * i, z + .022 * j), .0395, .0395);
}
const garnish = group(props);
lathe(garnish, porcelain, [
    [0, .04],
    [.33, .04],
    [.41, .085],
    [.59, .19],
    [.60, .23],
    [.57, .24],
    [.40, .153],
    [.25, .11],
    [0, .11]
], 64);
ring(garnish, porcelainBlue, .575, .01, .228);
for (let i = 0; i < 22; i++) {
    const a = rand(0, TAU), r = rand(.03, .36);
    onion(garnish, r * Math.cos(a), .16 + .08 * (1 - r / .36) + rand(0, .03), r * Math.sin(a), rand(.04, .073), rand(0, PI));
}
const tray = group(props), trayInner = mat(0xedeede, .30), trayGreen = mat(0x81aaa0, .27);

function roundedLoop(w, d, r, n = 14) {
    const points = [];
    for (let j = 0; j < 4; j++) {
        const ax = [1, -1, -1, 1][j] * (w / 2 - r), az = [1, 1, -1, -1][j] * (d / 2 - r);
        for (let i = 0; i <= n; i++) {
            const a = (j + i / n) * PI / 2;
            points.push([
                ax + r * Math.cos(a),
                az + r * Math.sin(a)
            ]);
        }
    }
    return points;
}

function traySurface(g, m, profiles) {
    const verts = [], idx = [], uv = [];
    let count = 0;
    for (let k = 0; k < profiles.length; k++) {
        let [w, d, r, y] = profiles[k];
        const p = roundedLoop(w, d, r);
        count = p.length;
        for (let i = 0; i < count; i++) {
            verts.push(p[i][0], y, p[i][1]);
            uv.push(i / count, k / (profiles.length - 1));
            if (k > 0) {
                const a = (k - 1) * count + i, b = (k - 1) * count + (i + 1) % count;
                idx.push(a, b, a + count, b, b + count, a + count);
            }
        }
    }
    const geo = new T.BufferGeometry();
    geo.setAttribute('position', new T.Float32BufferAttribute(verts, 3));
    geo.setAttribute('uv', new T.Float32BufferAttribute(uv, 2));
    geo.setIndex(idx);
    geo.computeVertexNormals();
    const o = mesh(g, geo, m);
    o.material.side = T.DoubleSide;
    return o;
}

function flatTray(g, m, w, d, r, y) {
    const pts = roundedLoop(w, d, r);
    const shape = new T.Shape(pts.map(([x, z])=>new T.Vector2(x, -z)));
    const geo = new T.ShapeGeometry(shape);
    geo.rotateX(-PI / 2);
    return mesh(g, geo, m, 0, y);
}
const trayW = 3.50, trayD = 2.78;
traySurface(tray, trayGreen, [
    [3.12, 2.4, .57, .06],
    [3.19, 2.47, .60, .09],
    [3.46, 2.74, .66, .41],
    [
        trayW,
        trayD,
        .68,
        .455
    ],
    [3.48, 2.76, .67, .49],
    [3.43, 2.71, .66, .50]
]);
traySurface(tray, trayInner, [
    [3.43, 2.71, .66, .50],
    [3.38, 2.66, .64, .465],
    [3.10, 2.38, .56, .17],
    [3.02, 2.30, .55, .15]
]);
flatTray(tray, trayInner, 3.03, 2.31, .55, .153);
const trayWater = flatTray(tray, waterMat, 3.09, 2.37, .56, .175);
trayWater.castShadow = false;
const net = group(props), netHead = group(net);
const metal = mat(0xa6b4ac, .31, .78), steel = mat(0xc3cac0, .23, .8);
const netR = .51;
ring(netHead, steel, netR, .026, .006);
ring(netHead, metal, netR - .016, .009, -.019);
const meshWire = group(netHead);
for (let i = -10; i <= 10; i++) {
    const s = i * .047, half = Math.sqrt((netR - .012) ** 2 - s * s);
    for (let j = 0; j < 2; j++) {
        const p = [];
        for (let k = 0; k <= 12; k++) {
            const q = mix(-half, half, k / 12);
            p.push(V(j ? s : q, -.164 * (1 - (s * s + q * q) / (.5 * .5)) - .005 * j, j ? q : s));
        }
        tube(meshWire, metal, p, .006, 4, 16);
    }
}
bake(meshWire);
for (const z of [-.073, .073])tube(netHead, steel, [
    V(.471, 0, z * 2.4),
    V(.62, .013, z),
    V(.84, .029, z * .65)
], .018);
rod(netHead, beech, V(.72, .023, 0), V(1.53, .10, 0), .072, .055, 20);
rod(netHead, brass, V(.706, .023, 0), V(.789, .03, 0), .062, .061, 20);
const hang = ring(netHead, brass, .048, .011, .10, 24);
hang.position.x = 1.56;
for (let i = 0; i < 9; i++) {
    const a = rand(0, TAU), r = rand(.23, .49);
    const o = oval(netHead, glassEdge, r * Math.cos(a), -.163 * (1 - r * r / .25) - .012, r * Math.sin(a), .018, .023, .018);
    o.castShadow = false;
}
const contactProps = [
    basket,
    pitcher,
    bowl,
    tray,
    garnish
].map((prop, i)=>contact(scene, 0, 0, [1.41, .81, 1.09, 2.31, .76][i], [1.28, .65, .90, 1.73, .6][i], .034));
// A cut sudachi on the condiment dish. Each segment has a pith border and pulp.
const citrus = group(garnish);
citrus.position.set(-.21, .215, .06);
citrus.rotation.z = .14;
citrus.rotation.y = .38;
const peel = mat(0x809643, .52), pith = mat(0xf2e7b1, .58), pulp = mat(0xd8cf75, .26), juice = mat(0xf4e4a1, .27);
lathe(citrus, peel, [
    [.013, .005],
    [.125, .03],
    [.201, .087],
    [.226, .15],
    [.233, .208],
    [.232, .23],
    [.214, .232]
], 48);
cyl(citrus, pith, 0, .228, 0, .217, .218, .012, 52);
const flesh = group(citrus), vesicle = new T.SphereGeometry(1, 8, 5);
for (let i = 0; i < 9; i++) {
    const angle = i * TAU / 9 + .09, w = TAU / 9 - .088, shape = new T.Shape();
    shape.moveTo(.019 * Math.cos(angle), .019 * Math.sin(angle));
    shape.absarc(0, 0, .196, angle, angle + w, false);
    shape.lineTo(.018 * Math.cos(angle + w), .018 * Math.sin(angle + w));
    shape.closePath();
    const geo = new T.ShapeGeometry(shape, 10);
    geo.rotateX(-PI / 2);
    mesh(flesh, geo, pulp, 0, .236, 0);
    for (let j = 0; j < 8; j++) {
        const a = angle + rand(.04, w - .04), r = rand(.055, .18);
        const ves = mesh(flesh, vesicle, juice, r * Math.cos(a), .238, -r * Math.sin(a));
        ves.scale.set(rand(.008, .020), .003, .004);
        ves.rotation.y = a;
    }
}
bake(flesh);
// Curved mounting plates and glazed ceramics read best with a narrow contact shadow.
const stillReflection = mat(0xe7f0db, .20, 0, {
    transparent: true,
    opacity: .23,
    depthWrite: false
});
const waterGlints = group(tray);
for (let i = 0; i < 4; i++) {
    const a = i * .14;
    const p = [
        V(-1.13 + a, 0, -.64 - a),
        V(-.86 + a, 0, -.65 - a),
        V(-.52 + a, 0, -.63 - a)
    ];
    const l = tube(waterGlints, stillReflection, p, i === 0 ? .013 : .006, 6, 20);
    l.castShadow = false;
    l.receiveShadow = false;
}
waterGlints.visible = false;

function packOnions(parent) {
    const batch = group(parent);
    const rings = parent.children.filter((o)=>o.isGroup && o.children[0]?.material === scallion);
    for (const g of rings) {
        for (const m of g.children.slice())batch.attach(m);
        parent.remove(g);
    }
    bake(batch);
}
packOnions(bowl);
packOnions(garnish);
bake(rest);
