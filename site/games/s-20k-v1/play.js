'use strict';
let held = null, elapsed = 0, idle = 0, autoPour = 0, pourPose = 0, pourDemand = 0, manualPour = false;
let cameraRide = null, closeView = false, netAction = null, scooping = false, scoopTime = 0, releasePour = false;
let netGoal = V(), netMemory = V(), pitcherHome = V(), bowlDock = false;
const look = V(), camGoal = V(), lookGoal = V(), wideLook = V(), widePos = V(), closeLook = V(), closePos = V();
const ray = new T.Raycaster(), mouse = new T.Vector2(), ground = new T.Plane(V(0, 1, 0), 0);
const pickList = [];

function selectable(g, type, i = -1) {
    g.userData.pick = {
        type,
        i
    };
    pickList.push(g);
}
selectable(res, 'reservoir');
selectable(pitcher, 'pitcher');
selectable(basket, 'basket');
selectable(net, 'net');
selectable(bowl, 'bowl');
selectable(tray, 'tray');
for (let i = 0; i < 3; i++) {
    selectable(stands[i].root, 'stand', i);
    selectable(coursePieces[i + 1].g, 'track', i + 1);
}
// These invisible pick surfaces fill the spaces between individual mesh wires.
const pickSkin = new T.MeshBasicMaterial({
    side: T.DoubleSide
});
const netPick = mesh(netHead, new T.CylinderGeometry(.53, .47, .18, 40), pickSkin, 0, -.066, 0);
netPick.layers.set(1);
netPick.castShadow = false;
netPick.receiveShadow = false;
ray.layers.enable(1);
const hintMaterial = mat(0xfff2d5, .15, 0, {
    transparent: true,
    opacity: .42,
    depthWrite: false
});
const demo = noShadow(oval(scene, hintMaterial, 0, 0, 0, .094, .055, .11));
demo.visible = false;
const hintLamp = new T.PointLight(0xffce77, 0, 2.3, 2);
scene.add(hintLamp);
const hintRing = ring(scene, mat(0xffe7b3, .3, 0, {
    transparent: true,
    opacity: .38,
    depthWrite: false
}), .35, .012, 0, 56);
hintRing.visible = false;
hintRing.castShadow = false;
const pickedNest = group(scene);
pickedNest.visible = false;
let noodleLift = null, servingIndex = 0;
let pickedGeometry = null;

function reserveNest() {
    const i = servingIndex % nests.length;
    servingIndex++;
    const n = nests[i];
    n.visible = false;
    if (pickedGeometry) {
        pickedNest.remove(pickedGeometry);
        pickedGeometry.traverse((o)=>{
            if (o.isMesh) o.geometry.dispose();
        });
    }
    pickedGeometry = n.clone();
    pickedGeometry.traverse((o)=>{
        if (o.isMesh) {
            o.geometry = o.geometry.clone();
            o.userData.base = o.geometry.attributes.position.array.slice();
        }
    });
    pickedGeometry.visible = true;
    pickedGeometry.position.set(0, 0, 0);
    pickedNest.add(pickedGeometry);
    pickedNest.rotation.y = basket.rotation.y;
    pickedNest.scale.copy(basket.scale);
    pickedNest.position.copy(n.getWorldPosition(V()));
    pickedNest.visible = true;
    noodleLift = {
        i,
        from: pickedNest.position.clone(),
        to: pickedNest.position.clone().add(V(0, .39, 0)),
        age: 0,
        action: 'hold',
        progress: 0,
        release: false
    };
    // Hidden portions are replenished below the surrounding coils when the basket empties.
    if (nests.filter((v)=>v.visible).length === 0) {
        for (let j = 0; j < nests.length; j++)if (j !== i) {
            nests[j].rotation.y += rand(-.16, .16);
            nests[j].visible = true;
        }
    }
}

function sendNest(toWater) {
    if (!noodleLift) return;
    const u = noodleLift;
    u.action = toWater ? 'send' : 'return';
    u.progress = 0;
    u.from.copy(pickedNest.position);
    u.to.copy(toWater ? resGlass.localToWorld(V(0, .11 + waterVolume * .30, 0)) : nests[u.i].getWorldPosition(V()));
}

function moveNest(dt) {
    if (!noodleLift) return;
    const u = noodleLift;
    u.age += dt;
    if (u.age < .84) {
        const sag = .24 * Math.sin(PI * clamp(u.age / .81));
        pickedGeometry.traverse((o)=>{
            if (!o.isMesh) return;
            const pos = o.geometry.attributes.position, base = o.userData.base;
            for (let i = 0; i < pos.count; i++) {
                const x = base[i * 3], z = base[i * 3 + 2], free = smooth(.13, .44, Math.hypot(x, z));
                pos.setY(i, base[i * 3 + 1] - sag * free * (.7 + .3 * Math.sin(5 * x + z)));
            }
            pos.needsUpdate = true;
        });
    }
    if (u.action === 'hold') {
        pickedNest.position.lerp(u.to, 1 - Math.exp(-14 * dt));
        pickedNest.scale.y = basket.scale.y * (1 + .38 * smooth(0, .3, u.age));
        return;
    }
    u.progress = clamp(u.progress + dt * (u.action === 'send' ? 1.5 : 2.7));
    const f = smooth(0, 1, u.progress);
    pickedNest.position.copy(u.from).lerp(u.to, f);
    pickedNest.position.y += Math.sin(f * PI) * .52;
    pickedNest.scale.y = basket.scale.y * (1.38 - .55 * f);
    if (f >= 1) {
        pickedNest.visible = false;
        if (u.action === 'send') {
            releaseNoodles();
            if (stage === 7) stage = 8;
        } else nests[u.i].visible = true;
        noodleLift = null;
    }
}

function configureCamera() {
    const ph = portrait(), axis = V(ph ? .018 : .032, ph ? .864 : .773, ph ? .505 : .634).normalize(), right = V().crossVectors(V(0, 1, 0), axis).normalize(), vert = V().crossVectors(axis, right);
    const points = [];
    function cloud(center, rx, rz, lo, hi) {
        for (const y of [
            lo,
            hi
        ])for (let i = 0; i < 16; i++) {
            const a = i * TAU / 16;
            points.push(V(center.x + rx * Math.cos(a), y, center.z + rz * Math.sin(a)));
        }
    }
    cloud(res.getWorldPosition(V()), .82, .82, 2.24, 2.93);
    cloud(pitcherHome, .68, .55, 0, 1.8);
    cloud(basket.position, 1.22 * basket.scale.x, 1.22 * basket.scale.x, .1, .52);
    cloud(bowl.position, .89, .89, .10, .83);
    for (const p of roundedLoop(trayW, trayD, .67, 7)) {
        points.push(tray.localToWorld(V(p[0], .08, p[1])), tray.localToWorld(V(p[0], .50, p[1])));
    }
    points.push(netHead.localToWorld(V(1.57, .12, 0)));
    cloud(garnish.position, .52, .51, .08, .23);
    let xmin = Infinity, xmax = -Infinity, ymin = Infinity, ymax = -Infinity;
    for (const p of points) {
        const x = p.dot(right), y = p.dot(vert);
        xmin = Math.min(xmin, x);
        xmax = Math.max(xmax, x);
        ymin = Math.min(ymin, y);
        ymax = Math.max(ymax, y);
    }
    wideLook.set(0, 0, 0).addScaledVector(right, (xmin + xmax) / 2).addScaledVector(vert, (ymin + ymax) / 2).addScaledVector(axis, .77);
    const tan = Math.tan(camera.fov * PI / 360), marginX = ph ? .927 : .918, marginY = ph ? .934 : .881;
    let dist = 0;
    for (const p of points) {
        const v = p.clone().sub(wideLook);
        dist = Math.max(dist, v.dot(axis) + Math.abs(v.dot(right)) / (tan * camera.aspect * marginX), v.dot(axis) + Math.abs(v.dot(vert)) / (tan * marginY));
    }
    widePos.copy(wideLook).addScaledVector(axis, dist);
    const out = trackWorld(totalLength), centre = trackWorld(paths[2].start + .06);
    closeLook.copy(out).lerp(centre, .29).lerp(bowl.position, .16);
    closeLook.y = .70;
    closePos.copy(closeLook).addScaledVector(V(ph ? .22 : .16, .58, .80).normalize(), ph ? dist * .83 : dist * .68);
}
let priorPortrait = portrait(), hasLayout = false;

function layout() {
    const ph = portrait(), changed = hasLayout && ph !== priorPortrait;
    if (hasLayout && !changed) {
        renderer.setSize(innerWidth, innerHeight, false);
        camera.aspect = innerWidth / innerHeight;
        camera.updateProjectionMatrix();
        configureCamera();
        return;
    }
    const saved = hasLayout ? tray.worldToLocal(netMemory.clone()) : null;
    const bowlNodes = [], trayNodes = [];
    if (changed) {
        for (const b of bundles)for (const line of b.lines)for (const n of line) {
            if (n.mode === 'soup' || n.mode === 'soupFall') bowlNodes.push([
                n,
                n.p.clone().sub(bowl.position),
                n.rest.clone().sub(bowl.position)
            ]);
            if (n.mode === 'tray') trayNodes.push([
                n,
                tray.worldToLocal(n.p.clone()),
                tray.worldToLocal(n.rest.clone())
            ]);
        }
    }
    renderer.setSize(innerWidth, innerHeight, false);
    camera.aspect = innerWidth / innerHeight;
    camera.updateProjectionMatrix();
    arrangeCourse();
    course.updateMatrixWorld(true);
    basket.position.set(ph ? -1.41 : -2.66, .012, ph ? -1.60 : 1.23);
    basket.scale.setScalar(ph ? .77 : 1.04);
    basket.rotation.y = ph ? -.52 : .23;
    napkin.position.copy(basket.position);
    napkin.rotation.y = ph ? -.28 : -.26;
    napkin.scale.setScalar(basket.scale.x);
    pitcherHome.set(ph ? 1.03 : -1.05, .046, ph ? -3.94 : -2.72);
    pitcher.position.copy(pitcherHome);
    const ctr = res.getWorldPosition(V());
    pitcher.rotation.y = Math.atan2(ctr.z - pitcherHome.z, -(ctr.x - pitcherHome.x));
    bowl.position.set(ph ? -1.17 : .05, .01, ph ? 3.78 : 3.04);
    const basinC = globalCourse(V(6.63, 0, .04));
    tray.position.copy(basinC);
    tray.rotation.y = -courseAngle;
    const leafX = ph ? 1.64 : 4.26;
    foliage.position.set(leafX, .043, ph ? -4.53 : -2.57);
    foliage.rotation.y = ph ? -1.18 : -.54;
    rest.position.copy(bowl.position).add(V(ph ? 1.12 : .81, 0, ph ? .88 : .98));
    rest.rotation.y = ph ? .26 : .23;
    garnish.position.set(ph ? 1.25 : 2.0, .024, ph ? -1.87 : -1.89);
    garnish.scale.setScalar(ph ? .72 : .94);
    runner.rotation.y = ph ? -1.32 : -.22;
    runner.position.set(ph ? .2 : 0, 0, ph ? 0 : -.17);
    const end = trackWorld(totalLength), dir = outletDirection();
    if (!saved) {
        netMemory.copy(end).addScaledVector(dir, .345);
        netMemory.y = .498;
    } else netMemory.copy(tray.localToWorld(saved));
    netGoal.copy(netMemory);
    net.position.copy(netGoal);
    net.rotation.y = ph ? -.10 : -.31;
    props.updateMatrixWorld(true);
    course.updateMatrixWorld(true);
    net.updateMatrixWorld(true);
    for (const [n, p, r] of bowlNodes) {
        n.p.copy(p.add(bowl.position));
        n.rest.copy(r.add(bowl.position));
    }
    for (const [n, p, r] of trayNodes) {
        n.p.copy(tray.localToWorld(p));
        n.rest.copy(tray.localToWorld(r));
    }
    for (const b of bundles)writeNoodle(b);
    [
        basket,
        pitcher,
        bowl,
        tray,
        garnish
    ].forEach((g, i)=>{
        const o = contactProps[i];
        o.position.set(g.position.x, .036, g.position.z);
        o.rotation.z = -g.rotation.y;
    });
    updateStands(0, 0);
    scene.updateMatrixWorld(true);
    configureCamera();
    if (!hasLayout || changed) {
        camera.position.copy(widePos);
        look.copy(wideLook);
        camera.lookAt(look);
        closeView = false;
        cameraRide = null;
    }
    hasLayout = true;
    priorPortrait = ph;
}

function activeHint() {
    if (stage < 6) return stage % 2 ? {
        type: 'track',
        i: 1 + (stage >> 1)
    } : {
        type: 'stand',
        i: stage >> 1
    };
    if (stage === 6 || !waterVolume && stage >= 7) return {
        type: 'pitcher'
    };
    if (stage === 7) return {
        type: 'basket'
    };
    if (netLoad() > .01) return {
        type: 'net'
    };
    if (bundles.some((b)=>!b.done && b.lines.some((line)=>line.some((n)=>n.mode === 'tray' || n.mode === 'air')))) return {
        type: 'net'
    };
    if (bowlDock) return {
        type: 'net'
    };
    if (bowlAmount > .4 && idle < 12) return {
        type: 'stand',
        i: 0
    };
    return waterVolume < .12 ? {
        type: 'pitcher'
    } : {
        type: 'basket'
    };
}

function netLoad() {
    let n = 0;
    for (const b of bundles)if (!b.done) {
        for (const line of b.lines)for (const p of line)if (p.mode === 'net') n++;
    }
    return n / (strandCount * nodeCount);
}

function hintAt(h) {
    if (h.type === 'stand') {
        const s = stands[h.i];
        return s.raised ? s.pole.localToWorld(V(0, .68, -.327)) : s.head.getWorldPosition(V());
    }
    if (h.type === 'track') return coursePieces[h.i].g.localToWorld(V(lengths[h.i] * .43, .17, 0));
    if (h.type === 'pitcher') return pitcher.localToWorld(V(.70, 1.31, 0));
    if (h.type === 'basket') return basket.localToWorld(V(-.07, .39, .06));
    return netHead.localToWorld(V(.38, .04, 0));
}

function guides(t) {
    hintRing.visible = false;
    demo.visible = false;
    hintLamp.intensity = 0;
    if (held || autoPour || noodleLift || netAction) return;
    let h = activeHint(), p = hintAt(h);
    if (h.type === 'pitcher' && closeView && Math.abs(p.clone().project(camera).x) > .95) {
        h = {
            type: 'stand',
            i: 0
        };
        p = hintAt(h);
    }
    const pulse = .5 - .5 * Math.cos(t * 3.15);
    hintLamp.position.copy(p).add(V(-.15, .27, .08));
    hintLamp.intensity = .32 + pulse * .63;
    if (h.type === 'stand' && stage < 6) {
        const s = stands[h.i];
        s.hinge.rotation.x -= .085 * pulse;
        hintRing.visible = true;
        hintRing.position.copy(s.root.getWorldPosition(V()));
        hintRing.position.y = .159;
        hintRing.material.opacity = .19 + .34 * pulse;
        hintRing.scale.setScalar(1 + .065 * pulse);
    }
    if (h.type === 'track') {
        coursePieces[h.i].g.position.y += .037 * pulse;
    }
    if (idle < 4) return;
    const phase = (idle - 4) % 4.5 / 2.75;
    if (phase > 1) return;
    let q = p.clone();
    if (h.type === 'stand') q.y += stage < 6 ? .65 : .25;
    else if (h.type === 'track') q = trackWorld(paths[h.i].start + .26, 0, .16);
    else if (h.type === 'pitcher' || h.type === 'basket') q = resGlass.localToWorld(V(.02, .78, 0));
    else if (bowlDock) q = netMemory.clone();
    else if (netLoad() > .01) q = bowl.localToWorld(V(0, .94, 0));
    else q = trackWorld(totalLength).addScaledVector(outletDirection(), .58), q.y = .49;
    demo.visible = true;
    const f = smooth(.18, .86, phase);
    demo.position.copy(p).lerp(q, f);
    demo.position.y += .10 + .18 * Math.sin(f * PI);
    demo.scale.set(.09, .052 + .025 * Math.sin(phase * PI), .105);
    hintMaterial.opacity = .37 * Math.sin(PI * phase);
}

function canPick(h) {
    if (stage < 6) return h.type === (stage % 2 ? 'track' : 'stand') && h.i === (stage % 2 ? 1 + (stage >> 1) : stage >> 1);
    if (h.type === 'tray') return bundles.some((b)=>!b.done && b.lines.some((l)=>l.some((n)=>n.mode === 'tray')));
    return true;
}

function setRay(e) {
    const rc = canvas.getBoundingClientRect();
    mouse.set((e.clientX - rc.left) / rc.width * 2 - 1, 1 - (e.clientY - rc.top) / rc.height * 2);
    ray.setFromCamera(mouse, camera);
}

function hit(e) {
    setRay(e);
    const current = stage < 6 ? activeHint() : null, items = pickList.filter((g)=>canPick(g.userData.pick));
    if (stage >= 7) {
        for (const b of bundles)if (!b.done) items.push(b.mesh);
    }
    const hits = ray.intersectObjects(items, true);
    if (!current && hits.length) {
        let top = hits[0].object;
        while (top && !top.userData.pick)top = top.parent;
        if (top?.userData.pick.type === 'track' || top?.userData.pick.type === 'stand') {
            for (let i = 0; i < stands.length; i++) {
                const h = {
                    type: 'stand',
                    i
                }, p = hintAt(h), s = p.clone().project(camera);
                if (Math.hypot((s.x - mouse.x) * innerWidth / 2, (s.y - mouse.y) * innerHeight / 2) < (portrait() ? 13 : 16)) return {
                    ...h,
                    point: p
                };
            }
        }
    }
    for (const r of hits) {
        let o = r.object;
        while (o) {
            if (o.userData.pick) return {
                ...o.userData.pick,
                point: r.point
            };
            if (o.userData.bundle) return {
                type: 'noodle',
                bundle: o.userData.bundle,
                point: r.point
            };
            o = o.parent;
        }
    }
    // Forgiving contact volumes follow the actual object, including the reclined post.
    const candidates = current ? [
        current
    ] : [
        {
            type: 'net'
        },
        {
            type: 'pitcher'
        },
        {
            type: 'basket'
        },
        ...stands.map((s, i)=>({
                type: 'stand',
                i
            }))
    ];
    for (const h of candidates) {
        const p = hintAt(h), projected = p.clone().project(camera), size = portrait() ? 28 : 33;
        if (projected.z < 1 && Math.hypot((projected.x - mouse.x) * innerWidth / 2, (projected.y - mouse.y) * innerHeight / 2) < size) return {
            ...h,
            point: p
        };
    }
    return null;
}

function planePoint(e, y) {
    setRay(e);
    ground.constant = -y;
    return ray.ray.intersectPlane(ground, V());
}

function netInTray(p) {
    const q = tray.worldToLocal(p.clone());
    return Math.abs(q.x) < 1.84 && Math.abs(q.z) < 1.46;
}

function missedPoint() {
    for (const b of bundles)if (!b.done) {
        for (const l of b.lines)for (const n of l)if (n.mode === 'tray') return n.p.clone();
    }
    return null;
}

function moveNetTo(where) {
    netAction = {
        from: net.position.clone(),
        to: where.clone(),
        f: 0,
        kind: 'catch'
    };
    netGoal.copy(where);
    scooping = true;
}

function toBowl() {
    if (!bowlDock && netInTray(net.position)) netMemory.copy(net.position);
    netAction = {
        from: net.position.clone(),
        to: bowl.position.clone().add(V(.05, .96, -.12)),
        f: 0,
        kind: 'dump'
    };
    bowlDock = true;
}

function returnNet() {
    netAction = {
        from: net.position.clone(),
        to: netMemory.clone(),
        f: 0,
        kind: 'back'
    };
    netAction.to.y = .498;
    bowlDock = false;
    dumpPower = 0;
}

function touchStart(e) {
    if (held || e.isPrimary === false) return;
    soundInit();
    if (audio?.state === 'suspended') audio.resume().catch (()=>{});
    const h = hit(e);
    if (!h) return;
    idle = 0;
    canvas.setPointerCapture(e.pointerId);
    held = {
        ...h,
        id: e.pointerId,
        sx: e.clientX,
        sy: e.clientY,
        dx: 0,
        dy: 0,
        age: 0,
        moved: false,
        start: h.point.clone(),
        last: h.point.clone(),
        wasStage: stage,
        original: 0
    };
    if (h.type === 'stand') {
        const s = stands[h.i];
        closeView = false;
        cameraRide = null;
        if (!s.raised) {
            s.raised = true;
            stage++;
            tone(410, .24, .14, 'triangle', .77);
        } else {
            held.original = heightSteps[h.i + 1];
            tone(310, .06, .08, 'triangle');
        }
    } else if (h.type === 'track') {
        closeView = false;
        cameraRide = null;
        held.original = overlap[h.i];
        held.bend = bend;
        coursePieces[h.i].lift = .14;
        tone(660 - h.i * 85, .11, .07, 'triangle');
    } else if (h.type === 'reservoir') {
        closeView = false;
        cameraRide = null;
        held.original = heightSteps[0];
    } else if (h.type === 'basket' && !noodleLift) {
        reserveNest();
        held.hasNest = true;
    } else if (h.type === 'pitcher') {
        manualPour = true;
        autoPour = 0;
        pourDemand = .22;
        closeView = false;
        cameraRide = null;
    } else if (h.type === 'net') {
        netAction = null;
        held.netOrigin = netMemory.clone();
        held.offset = net.position.clone().sub(planePoint(e, .50) || h.point);
        held.offset.y = 0;
        scooping = true;
        netWet = Math.max(.24, netWet);
    } else if (h.type === 'noodle') {
        h.bundle.press = 1;
        for (let i = 0; i < 5; i++)drip(h.point, V(rand(-.4, .4), rand(.22, .8), rand(-.4, .4)), .017, Math.max(.18, h.point.y - .04), 'bead');
    }
}

function changeHeight(which, level) {
    const n = clamp(level, -2, 2);
    if (heightSteps[which] === n) return;
    heightSteps[which] = n;
    calcCourse();
    if (which) stands[which - 1].spring = .55;
    tone(366 + n * 47, .17, .085, 'triangle', .81);
}

function onMove(e) {
    if (!held || held.id !== e.pointerId) return;
    const h = held;
    idle = 0;
    h.dx = e.clientX - h.sx;
    h.dy = e.clientY - h.sy;
    if (Math.hypot(h.dx, h.dy) > 7) h.moved = true;
    const p = planePoint(e, h.start.y);
    if (!p) return;
    h.last.copy(p);
    if (h.type === 'stand' && h.wasStage >= 6) {
        changeHeight(h.i + 1, h.original + Math.round(-h.dy / (portrait() ? 33 : 42)));
    } else if (h.type === 'reservoir' && h.moved) changeHeight(0, h.original + Math.round(-h.dy / 40));
    else if (h.type === 'track' && h.moved) {
        const rel = course.worldToLocal(p.clone()).sub(course.worldToLocal(h.start.clone())), i = h.i, g = coursePieces[i];
        overlap[i] = clamp(h.original - rel.x * .32, .032, .255);
        if (i === 2) bend = clamp(h.bend + rel.z * .56, -.39, .39);
        if (!g.installed) {
            g.lift = clamp(.16 - h.dy * .008, .10, 1.24);
            g.lean = clamp(-h.dy * .001, -.10, .16);
            g.loose.x = paths[i].x - .13 + clamp(rel.x * .70, -.56, .63);
            g.loose.z = paths[i].z - .65 + clamp(rel.z * .70, -.62, .82);
        } else g.lift = clamp(-h.dy * .0017, 0, .10);
        calcCourse();
    } else if (h.type === 'pitcher') {
        const target = resGlass.localToWorld(V(0, .26, 0)).project(camera), sx = (target.x + 1) * innerWidth / 2, sy = (1 - target.y) * innerHeight / 2;
        const toward = 1 - clamp(Math.hypot(e.clientX - sx, e.clientY - sy) / Math.max(75, Math.hypot(h.sx - sx, h.sy - sy)));
        pourDemand = clamp(.22 + toward * .69 - h.dy * .003, .12, 1.0);
    } else if (h.type === 'basket' && h.hasNest && noodleLift?.action === 'hold') {
        const at = planePoint(e, mix(.55, 2.57, clamp(Math.hypot(h.dx, h.dy) / 110)));
        if (at) noodleLift.to.copy(at);
    } else if (h.type === 'net' && h.moved) {
        const at = planePoint(e, .50);
        if (!at) return;
        at.add(h.offset);
        const dist = Math.hypot(at.x - bowl.position.x, at.z - bowl.position.z);
        if (dist < 1.24) {
            if (!bowlDock && h.netOrigin) netMemory.copy(h.netOrigin);
            bowlDock = true;
            netGoal.copy(at);
            netGoal.y = .91 + .09 * (1 - clamp(dist));
            dumpPower = clamp((.88 - dist) / .63);
            scooping = false;
        } else {
            bowlDock = false;
            dumpPower = 0;
            const local = tray.worldToLocal(at);
            local.x = clamp(local.x, -1.37, 1.37);
            local.z = clamp(local.z, -1.06, 1.06);
            const missed = missedPoint();
            local.y = missed ? missed.y + .12 : .49;
            netGoal.copy(tray.localToWorld(local));
            scooping = true;
        }
    }
}

function touchEnd(e, cancel = false) {
    if (!held || held.id !== e.pointerId) return;
    const h = held;
    held = null;
    idle = 0;
    if (h.type === 'stand') {
        stands[h.i].spring = 1;
        if (h.wasStage >= 6 && !h.moved && !cancel) changeHeight(h.i + 1, h.original <= -2 ? 0 : h.original - 1);
    }
    if (h.type === 'reservoir') {
        if (!h.moved && !cancel) changeHeight(0, h.original >= 2 ? 0 : h.original + 1);
    } else if (h.type === 'track') {
        const g = coursePieces[h.i];
        g.lift = 0;
        g.lean = 0;
        if (!cancel && !g.installed) {
            const p = paths[h.i], target = globalCourse(V(p.x + lengths[h.i] * .4, p.y, p.z)).project(camera);
            const px = (target.x + 1) * innerWidth / 2, py = (1 - target.y) * innerHeight / 2;
            if (!h.moved || Math.hypot(e.clientX - px, e.clientY - py) < Math.max(110, innerHeight * .25)) {
                g.installed = true;
                stage++;
            }
        } else if (g.installed && !h.moved && !cancel) {
            if (h.i === 2) bend = bend > 0 ? -.39 : .39;
            else overlap[h.i] = overlap[h.i] > .16 ? .065 : .218;
            calcCourse();
            tone(610 - lengths[h.i] * 123, .19, .10, 'triangle', .6);
        }
    } else if (h.type === 'basket' && h.hasNest && noodleLift?.action === 'hold') {
        const t = resGlass.localToWorld(V(0, .30, 0)).project(camera), d = Math.hypot(e.clientX - (t.x + 1) * innerWidth / 2, e.clientY - (1 - t.y) * innerHeight / 2);
        sendNest(!cancel && (!h.moved || d < Math.max(96, innerHeight * .19)));
    } else if (h.type === 'pitcher') {
        manualPour = false;
        if (!cancel && !h.moved && h.age < .48) {
            autoPour = 3.65;
            pourDemand = .85;
        } else {
            pourDemand = 0;
            releasePour = true;
        }
    } else if (h.type === 'net') {
        scooping = false;
        if (!cancel && !h.moved) {
            if (bowlDock) returnNet();
            else if (netLoad() > .01) toBowl();
            else {
                const p = missedPoint();
                if (p) {
                    p.y += .13;
                    moveNetTo(p);
                } else {
                    scoopTime = .55;
                    scooping = true;
                    netGoal.y = trayLevel() + .09;
                }
            }
        } else if (bowlDock) {
            dumpPower = 0;
        } else {
            netGoal.y = .498;
            netMemory.copy(netGoal);
        }
    } else if (h.type === 'bowl' && !cancel) {
        if (netLoad() > .01) toBowl();
        else if (bowlDock) returnNet();
        else {
            ripple(bowl.position.clone().add(V(.03, .611, .02)), .62, 'soup');
            tone(705 + bowlAmount * 25, .07, .27);
        }
    } else if (h.type === 'tray' && !cancel) {
        const p = h.point.clone();
        p.y = .314;
        moveNetTo(p);
    }
    if (canvas.hasPointerCapture(e.pointerId)) canvas.releasePointerCapture(e.pointerId);
}
canvas.addEventListener('pointerdown', touchStart);
canvas.addEventListener('pointermove', onMove);
canvas.addEventListener('pointerup', (e)=>touchEnd(e));
canvas.addEventListener('pointercancel', (e)=>touchEnd(e, true));
canvas.addEventListener('contextmenu', (e)=>e.preventDefault());

function pitcherMotion(dt) {
    if (autoPour > 0) {
        autoPour = Math.max(0, autoPour - dt);
        if (!autoPour) {
            pourDemand = 0;
            releasePour = true;
        }
    }
    if (manualPour && held?.type === 'pitcher' && !held.moved && held.age > .45) pourDemand = clamp(.38 + (held.age - .45) * .20, .38, .91);
    const active = manualPour || autoPour > 0, poseTarget = active ? 1 : 0;
    pourPose = mix(pourPose, poseTarget, 1 - Math.exp(-dt * (active ? 3.8 : 4.7)));
    const tilt = active ? .38 + pourDemand * .63 : 0;
    jugBody.rotation.z = mix(jugBody.rotation.z, tilt, 1 - Math.exp(-dt * 4));
    const dest = resGlass.localToWorld(V(.12, .86, 0)), offset = V(-.755, 1.806, 0).applyEuler(jugBody.rotation).applyEuler(pitcher.rotation);
    pitcher.position.copy(pitcherHome).lerp(dest.sub(offset), smooth(0, 1, pourPose));
    pitcher.position.y += .48 * Math.sin(pourPose * PI);
    const rate = active && pourPose > .75 ? .027 + Math.pow(pourDemand, 1.7) * .39 : 0;
    pourRate = mix(pourRate, rate, 1 - Math.exp(-dt * (active ? 7 : 12)));
    if (pourRate > .018 && stage === 6) stage = 7;
    jugWater.scale.y = 1 - .28 * pourPose;
    pitcher.updateMatrixWorld(true);
    if (releasePour && pourRate < .015) {
        releasePour = false;
        const at = jugBody.localToWorld(V(-.755, 1.806, 0));
        drip(at, V(-.04, -.18, 0), .029, cradle.position.y + .10, 'pour');
        tone(1480, .054, .13, 'sine', .72);
    }
}

function netMotion(dt) {
    if (netAction) {
        const a = netAction;
        a.f = clamp(a.f + dt * (a.kind === 'dump' ? .77 : 1.32));
        const f = smooth(0, 1, a.f);
        netGoal.copy(a.from).lerp(a.to, f);
        netGoal.y += .44 * Math.sin(PI * f);
        if (a.kind === 'dump') dumpPower = smooth(.57, .98, a.f);
        if (a.f === 1) {
            if (a.kind === 'catch') {
                scoopTime = .64;
                netMemory.copy(netGoal);
            }
            netAction = null;
        }
    } else if (bowlDock && !held && dumpPower > .99 && netLoad() === 0) {
        dumpPower = 0;
    }
    if (scoopTime > 0) {
        scoopTime -= dt;
        scooping = true;
        if (scoopTime <= 0) {
            scooping = false;
            netGoal.y = .498;
        }
    }
    net.position.lerp(netGoal, 1 - Math.exp(-dt * 17));
    const fromSoup = Math.hypot(net.position.x - bowl.position.x, net.position.z - bowl.position.z);
    const demand = bowlDock ? dumpPower * (1 - smooth(.68, 1.04, fromSoup)) : 0;
    dumpTilt += clamp(demand - dumpTilt, -dt * 2.9, dt * 1.17);
    spillFraction = Math.min(demand, dumpTilt);
    netHead.rotation.z = mix(netHead.rotation.z, .018 + .66 * dumpTilt, 1 - Math.exp(-dt * 9));
    net.updateMatrixWorld(true);
}

function cameraMotion(dt) {
    camGoal.copy(closeView ? closePos : widePos);
    lookGoal.copy(closeView ? closeLook : wideLook);
    if (cameraRide) {
        const r = cameraRide;
        r.elapsed += dt;
        const head = r.bundle.lines[0][0], d = clamp(head.d, 0, totalLength), p = trackWorld(d);
        const f = smooth(0, 1.45, r.elapsed), ahead = smooth(paths[2].start + .25, totalLength - .13, d);
        const near = p.clone().add(V(portrait() ? .67 : .43, 1.07, portrait() ? 3.65 : 3.02)), focus = p.clone().addScaledVector(outletDirection(), .18);
        camGoal.copy(widePos).lerp(near, f).lerp(closePos, ahead);
        lookGoal.copy(wideLook).lerp(focus, f).lerp(closeLook, ahead);
        if (ahead >= .999 || head.mode !== 'track') {
            cameraRide = null;
            closeView = true;
        }
    }
    const k = 1 - Math.exp(-dt * (cameraRide ? 3.4 : 2.4));
    camera.position.lerp(camGoal, k);
    look.lerp(lookGoal, k);
    camera.lookAt(look);
    camera.updateMatrixWorld();
}

function step(dt) {
    elapsed += dt;
    streamTime += dt;
    if (held) held.age += dt;
    else idle += dt;
    updateStands(dt, elapsed);
    pitcherMotion(dt);
    netMotion(dt);
    moveNest(dt);
    streamModel(dt);
    liquidVisuals(dt, elapsed);
    waterPourVisual(elapsed);
    noodleUpdate(dt, elapsed);
    splashUpdate(dt);
    cameraMotion(dt);
    guides(elapsed);
}
let last = 0;

function frame(ms) {
    const dt = last ? Math.min(.05, (ms - last) / 1000) : 1 / 60;
    last = ms;
    // Fixed maximum substep keeps very short contacts reliable on slower touch devices.
    const n = Math.max(1, Math.ceil(dt / .025));
    for (let j = 0; j < n; j++)step(dt / n);
    renderer.render(scene, camera);
    requestAnimationFrame(frame);
}
layout();
window.addEventListener('resize', layout);
requestAnimationFrame(frame);
