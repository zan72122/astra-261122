'use strict';
const course = group(scene);
const lengths = [.97, 2.18, 1.65, 1.15], levels = [2.32, 1.97, 1.59, 1.31, 1.09];
const heightSteps = [0, 0, 0, 0], overlap = [0, .12, .12, .12];
let bend = .39, stage = 0, coursePieces = [], stands = [], paths = [], totalLength = 0, courseAngle = 0;
const res = group(course);
res.position.x = -.14;
const cradle = group(res), resGlass = group(cradle);
const baseMat = mat(0x708982, .36), padMat = mat(0x4c6258, .77), edgeMat = mat(0xe5cf9e, .42);
const sash = mat(0x988657, .60);

function makeReservoir() {
    const holder = group(res);
    for (let j = 0; j < 3; j++) {
        const a = j * TAU / 3 + .5;
        const foot = V(.70 * Math.cos(a), .08, .70 * Math.sin(a)), top = V(.43 * Math.cos(a), 2.27, .43 * Math.sin(a));
        rod(holder, beech, foot, top, .077, .093, 20);
        oval(holder, padMat, foot.x, .062, foot.z, .105, .045, .105);
        const b = foot.clone().lerp(top, .52), c = V(.56 * Math.cos(a + TAU / 3), 1.22, .56 * Math.sin(a + TAU / 3));
        rod(holder, honey, b, c, .037, .037);
        rod(holder, brass, foot.clone().lerp(top, .85), foot.clone().lerp(top, .89), .083, .083);
    }
    ring(holder, jade, .46, .087, 2.19);
    bake(holder);
    holder.name = 'tripod';
    const g = resGlass;
    // The rim has a physical opening where the bamboo spout passes through it.
    const profile = [
        [.006, 0],
        [.51, 0],
        [.61, .065],
        [.70, .205],
        [.79, .45],
        [.815, .55],
        [.807, .582],
        [.782, .587],
        [.77, .554],
        [.686, .25],
        [.608, .106],
        [.49, .053],
        [.006, .053]
    ];
    const o = lathe(g, glass, profile, 96);
    const verts = o.geometry.attributes.position;
    for (let i = 0; i < verts.count; i++) {
        const angle = Math.atan2(verts.getZ(i), verts.getX(i));
        if (Math.abs(angle) < .45) {
            const drop = (1 - smooth(.22, .45, Math.abs(angle))) * .78;
            verts.setY(i, verts.getY(i) * (1 - drop));
        }
    }
    o.geometry.computeVertexNormals();
    o.castShadow = false;
    for (const [r, y, t] of [
        [.80, .57, .024],
        [.573, .06, .02],
        [.694, .23, .008]
    ]) {
        const p = [];
        for (let j = 0; j < 100; j++) {
            const a = j / 100 * TAU, angle = Math.atan2(Math.sin(a), Math.cos(a));
            p.push(V(r * Math.cos(a), y * (1 - .78 * (1 - smooth(.22, .45, Math.abs(angle)))), r * Math.sin(a)));
        }
        tube(g, glassEdge, p, t, 8, 100, true);
    }
    // Fine molded flutes pick up window reflections across the transparent saucer.
    const fl = group(g);
    for (let i = 2; i < 39; i++) {
        const a = i * TAU / 40;
        const p = [
            [.57, .055],
            [.64, .13],
            [.70, .25],
            [.77, .47]
        ].map(([r, y])=>V(r * Math.cos(a), y, r * Math.sin(a)));
        tube(fl, glassEdge, p, .007, 4, 9);
    }
    bake(fl);
    fl.traverse((o)=>o.castShadow = false);
}
makeReservoir();
const resWater = cyl(resGlass, waterMat, 0, .07, 0, .6, .55, .018, 80);
resWater.castShadow = false;
resWater.visible = false;
const resRingY = [], resRingX = [], resRingZ = [];
for (let i = 0; i < resWater.geometry.attributes.position.count; i++) {
    const p = resWater.geometry.attributes.position;
    resRingY.push(p.getY(i));
    resRingX.push(p.getX(i) / .55);
    resRingZ.push(p.getZ(i) / .55);
}

function warp(p, k, slope) {
    const x = p.x, z = p.z, a = k * x;
    return V((Math.abs(k) < .00001 ? x : Math.sin(a) / k) - Math.sin(a) * z, p.y + slope * x, (Math.abs(k) < .00001 ? 0 : (1 - Math.cos(a)) / k) + Math.cos(a) * z);
}

function stripGeo(x0, x1, r0, r1, n = 34, reverse = false, arc0 = -PI / 2, arc1 = PI / 2) {
    const p = [], uv = [], idx = [];
    const sx = 26;
    for (let i = 0; i <= sx; i++)for (let j = 0; j <= n; j++) {
        const t = i / sx, a = mix(arc0, arc1, j / n), r = mix(r0, r1, t);
        p.push(mix(x0, x1, t), .30 - r * Math.cos(a), r * Math.sin(a));
        uv.push(t, j / n);
        if (i < sx && j < n) {
            const v = i * (n + 1) + j, b = v + n + 1;
            if (reverse) idx.push(v, b, v + 1, b, b + 1, v + 1);
            else idx.push(v, v + 1, b, v + 1, b + 1, b);
        }
    }
    const geo = new T.BufferGeometry();
    geo.setAttribute('position', new T.Float32BufferAttribute(p, 3));
    geo.setAttribute('uv', new T.Float32BufferAttribute(uv, 2));
    geo.setIndex(idx);
    geo.computeVertexNormals();
    return geo;
}

function endEdge(g, x, outer, inner) {
    const p = [], idx = [];
    for (let j = 0; j <= 36; j++) {
        const a = -PI / 2 + j * PI / 36;
        for (const r of [
            outer,
            inner
        ])p.push(x, .3 - r * Math.cos(a), r * Math.sin(a));
        if (j < 36) {
            const b = j * 2;
            idx.push(b, b + 1, b + 2, b + 2, b + 1, b + 3);
        }
    }
    const geo = new T.BufferGeometry();
    geo.setAttribute('position', new T.Float32BufferAttribute(p, 3));
    geo.setIndex(idx);
    geo.computeVertexNormals();
    return mesh(g, geo, edgeMat);
}
for (const m of [
    skin,
    cane,
    edgeMat,
    sash
])m.side = T.DoubleSide;

function makeTrack(i) {
    const g = group(course), l = lengths[i], geom = group(g);
    mesh(geom, stripGeo(0, l, .298, .298), cane);
    mesh(geom, stripGeo(0, l - .10, .345, .345, 28, true), skin);
    mesh(geom, stripGeo(l - .10, l, .345, .321, 28, true), edgeMat);
    endEdge(geom, 0, .345, .298);
    endEdge(geom, l, .321, .298);
    for (const sign of [-1, 1]) {
        const p = [];
        for (let j = 0; j <= 28; j++) {
            p.push(V(l * j / 28, .300, sign * .321));
        }
        tube(geom, edgeMat, p, .022, 7, 28);
        const p2 = p.map((q)=>V(q.x, .284, sign * .338));
        tube(geom, skin, p2, .009, 5, 28);
    }
    for (const x of [
        l * .16,
        l * .79
    ]) {
        mesh(geom, stripGeo(x - .036, x + .036, .348, .351, 25, true), skin);
        mesh(geom, stripGeo(x - .044, x - .034, .351, .351, 25, true), sash);
        mesh(geom, stripGeo(x + .038, x + .048, .350, .350, 25, true), edgeMat);
    }
    // A few long fibers break the symmetry of the split bamboo.
    for (let n = 0; n < 7; n++) {
        const a = rand(-1.35, 1.35), s = rand(0, .22), e = rand(.65, .98), p = [];
        for (let j = 0; j <= 18; j++) {
            const x = mix(s, e, j / 18) * l, aa = a + .012 * Math.sin(x * 3 + n);
            p.push(V(x, .302 - .297 * Math.cos(aa), .297 * Math.sin(aa)));
        }
        tube(geom, n % 3 ? edgeMat : sash, p, .0027, 4, 18);
    }
    bake(geom);
    const originals = geom.children.map((o)=>o.geometry.attributes.position.array.slice());
    return {
        g,
        geom,
        originals,
        loose: V(),
        looseYaw: rand(-.09, .09),
        installed: i === 0,
        progress: i === 0 ? 1 : 0,
        lift: 0,
        lean: 0,
        oldK: NaN,
        oldS: NaN
    };
}
for (let i = 0; i < 4; i++)coursePieces.push(makeTrack(i));

function makeStand(i) {
    const root = group(course), foot = group(root), hinge = group(root), pole = group(hinge), head = group(pole);
    cyl(foot, padMat, 0, .059, 0, .322, .294, .065);
    lathe(foot, beech, [
        [0, .072],
        [.289, .072],
        [.32, .094],
        [.317, .132],
        [.277, .151],
        [.151, .155],
        [.12, .12],
        [0, .12]
    ], 48);
    cyl(foot, jade, 0, .153, 0, .14, .18, .046);
    hinge.position.y = .155;
    const fixed = group(pole);
    cyl(fixed, jade, 0, .12, 0, .10, .115, .24);
    cyl(fixed, beech, 0, .455, 0, .084, .099, .64);
    cyl(fixed, brass, 0, .75, 0, .112, .112, .067);
    rod(fixed, brass, V(0, .68, -.061), V(0, .68, -.254), .032, .042, 16);
    rod(fixed, jade, V(0, .68, -.239), V(0, .68, -.343), .091, .077, 22);
    bake(fixed);
    const upper = cyl(pole, honey, 0, .88, 0, .062, .071, .75, 20);
    const saddle = group(head);
    const pts = [];
    for (let j = 0; j <= 24; j++) {
        const a = mix(-1.36, 1.36, j / 24);
        pts.push(V(0, .30 - .366 * Math.cos(a), .366 * Math.sin(a)));
    }
    tube(saddle, jade, pts, .055, 9, 28);
    for (const x of [-.065, .065]) {
        const p = pts.map((v)=>V(x, v.y, v.z));
        tube(saddle, jadeLight, p, .023, 8, 28);
    }
    cyl(saddle, brass, 0, -.081, 0, .10, .073, .09, 24);
    bake(saddle);
    return {
        root,
        foot,
        hinge,
        pole,
        upper,
        head,
        raised: false,
        up: 0,
        press: 0,
        spring: 0,
        i
    };
}
for (let i = 0; i < 3; i++)stands.push(makeStand(i));

function calcCourse() {
    const h = levels.slice();
    for (let j = 0; j < 4; j++)h[j + 1] += heightSteps[j] * .205;
    h[0] += heightSteps[0] * .205;
    let x = .39, z = 0, yaw = 0, dist = 0;
    paths = [];
    for (let i = 0; i < 4; i++) {
        const l = lengths[i], k = i === 2 ? bend / l : 0;
        const join = i ? .04 + (i === 3 ? Math.max(0, -heightSteps[3]) * .045 : 0) : 0;
        let sy = i ? h[i] - join : h[0], ey = h[i + 1];
        if (i === 0) ey = h[1];
        const slope = (ey - sy) / l, used = l - (i < 3 ? overlap[i + 1] : 0);
        paths.push({
            x,
            z,
            y: sy,
            yaw,
            k,
            slope,
            l,
            used,
            start: dist,
            i
        });
        const end = warp(V(used, 0, 0), k, slope);
        x += end.x * Math.cos(yaw) - end.z * Math.sin(yaw);
        z += end.x * Math.sin(yaw) + end.z * Math.cos(yaw);
        yaw += k * used;
        dist += used;
    }
    totalLength = dist;
    cradle.position.y = h[0] - .07;
    res.children.find((o)=>o.name === 'tripod').scale.y = cradle.position.y / 2.25;
    for (let i = 0; i < 4; i++) {
        const p = paths[i], piece = coursePieces[i];
        const k = p.k, s = mix(-.014, p.slope, piece.progress);
        if (Math.abs(k - piece.oldK) > .0001 || Math.abs(s - piece.oldS) > .0002 || Number.isNaN(piece.oldS)) {
            piece.geom.children.forEach((o, j)=>{
                const pos = o.geometry.attributes.position, orig = piece.originals[j];
                for (let q = 0; q < pos.count; q++) {
                    const a = q * 3, x = orig[a], y = orig[a + 1], z = orig[a + 2], angle = k * x;
                    pos.setXYZ(q, (Math.abs(k) < .00001 ? x : Math.sin(angle) / k) - Math.sin(angle) * z, y + s * x, (Math.abs(k) < .00001 ? 0 : (1 - Math.cos(angle)) / k) + Math.cos(angle) * z);
                }
                pos.needsUpdate = true;
                o.geometry.computeVertexNormals();
                o.geometry.computeBoundingSphere();
                o.geometry.computeBoundingBox();
            });
            piece.oldK = k;
            piece.oldS = s;
        }
    }
}

function coursePoint(i, local, side = 0, above = 0) {
    const p = paths[i], v = warp(V(local, above, side), p.k, p.slope), c = Math.cos(p.yaw), s = Math.sin(p.yaw);
    return V(p.x + v.x * c - v.z * s, p.y + v.y, p.z + v.x * s + v.z * c);
}

function globalCourse(v) {
    return v.applyAxisAngle(V(0, 1, 0), -courseAngle).add(course.position);
}

function findPath(d) {
    for (let i = 0; i < 3; i++)if (d < paths[i].start + paths[i].used) return i;
    return 3;
}

function trackWorld(d, side = 0, above = 0) {
    d = clamp(d, 0, totalLength);
    const i = findPath(d);
    return globalCourse(coursePoint(i, d - paths[i].start, side, above));
}

function outletDirection() {
    const p = paths[3], a = p.yaw + courseAngle;
    return V(Math.cos(a), p.slope, Math.sin(a));
}

function updateStands(dt, time) {
    for (let j = 0; j < 3; j++) {
        const s = stands[j], i = j + 1, p = paths[i], v = coursePoint(i, p.l - (i === 3 ? .60 : .29));
        s.root.position.set(v.x, 0, v.z);
        s.root.rotation.y = -(p.yaw + p.k * (p.l - .29));
        s.up = clamp(s.up + (s.raised ? dt * 1.48 : 0));
        const f = smooth(0, 1, s.up);
        s.spring = Math.max(0, s.spring - dt * 2.15);
        s.press = mix(s.press, held?.type === 'stand' && held.i === j ? 1 : 0, 1 - Math.exp(-dt * 12));
        s.foot.scale.y = 1 - .18 * s.press;
        s.hinge.rotation.x = (1 - f) * (PI / 2 - .045) + Math.sin(s.up * PI * 3.4) * .14 * (1 - s.up) * f;
        s.hinge.rotation.z = Math.sin(s.spring * TAU) * s.spring * .055;
        const tall = v.y - .155 - .019 - .041 * s.press;
        s.upper.scale.y = Math.max(.25, (tall - .60) / .75);
        s.upper.position.y = (tall + .60) * .5;
        s.head.position.y = tall;
        s.head.rotation.y = .22 * (1 - f) + .08 * Math.sin(s.up * PI * 4) * (1 - s.up);
        const g = coursePieces[i];
        if (g.installed && g.progress < 1) {
            g.progress = Math.min(1, g.progress + dt * 1.75);
            if (g.progress === 1) {
                s.spring = 1;
                tone(590 - lengths[i] * 118, .27, .105, 'triangle', .56);
            }
            calcCourse();
        }
        const f2 = smooth(0, 1, g.progress), seat = smooth(0, .71, g.progress), a = g.loose;
        g.g.position.copy(a).lerp(V(p.x, p.y, p.z), seat);
        g.g.position.y += Math.sin(seat * PI) * .26 + g.lift;
        g.g.rotation.set(0, mix(g.looseYaw, -p.yaw, seat), g.lean + (1 - f2) * .013 + Math.sin(f2 * PI) * .20, 'YXZ');
    }
    const g = coursePieces[0].g, p = paths[0];
    g.position.set(p.x, p.y, p.z);
    g.rotation.y = -p.yaw;
}

function arrangeCourse() {
    const ph = portrait();
    courseAngle = ph ? 1.35 : .43;
    course.rotation.y = -courseAngle;
    course.position.set(ph ? -.82 : -3.16, 0, ph ? -3.64 : -1.54);
    calcCourse();
    for (let i = 1; i < 4; i++) {
        const p = paths[i], piece = coursePieces[i];
        piece.loose.set(p.x - (i === 1 ? .13 : .27), .102, p.z + (i === 1 ? -.64 : i === 2 ? -.78 : -.64));
    }
}
