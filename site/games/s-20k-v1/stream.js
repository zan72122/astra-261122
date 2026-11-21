'use strict';
const cells = 72, depth = new Float32Array(cells), speed = new Float32Array(cells), steep = new Float32Array(cells);
let waterVolume = 0, trayVolume = 0, bowlAmount = 0, pourRate = 0, streamTime = 0, dropClock = 0, netClock = 0;
let servedCount = 0;
const flowGroup = group(scene), bundles = [];
const drops = [], ripples = [], beads = [], bubbles = [];
const hangingDrop = oval(netHead, glassEdge, .18, -.16, .05, .012, .014, .012);
hangingDrop.visible = false;
hangingDrop.castShadow = false;

function noShadow(o) {
    o.castShadow = false;
    o.receiveShadow = false;
    return o;
}
const dropGeom = new T.SphereGeometry(1, 9, 6);
for (let i = 0; i < 55; i++) {
    const o = noShadow(mesh(scene, dropGeom, glassEdge));
    o.visible = false;
    drops.push({
        o,
        v: V(),
        life: 0,
        floor: 0,
        kind: 'tray'
    });
}

function drip(at, velocity, size = .028, floor = .2, kind = 'tray') {
    const d = drops.find((v)=>!v.o.visible);
    if (!d) return;
    d.o.position.copy(at);
    d.o.scale.set(size, size * 1.48, size);
    d.v.copy(velocity);
    d.o.visible = true;
    d.floor = floor;
    d.kind = kind;
    d.life = 2;
}
const rippleMat = mat(0xd7f2e8, .24, .05, {
    transparent: true,
    opacity: .6,
    depthWrite: false
});
const rippleGeo = new T.TorusGeometry(1, .017, 5, 52);
rippleGeo.rotateX(-PI / 2);
for (let i = 0; i < 18; i++) {
    const o = noShadow(mesh(scene, rippleGeo, rippleMat.clone()));
    o.visible = false;
    ripples.push({
        o,
        age: 0,
        max: 1,
        kind: 'tray'
    });
}

function ripple(at, max, kind = 'tray') {
    const r = ripples.find((v)=>!v.o.visible);
    if (!r) return;
    r.o.position.copy(at);
    r.o.visible = true;
    r.age = 0;
    r.max = max;
    r.kind = kind;
}

function trayLevel() {
    return .157 + Math.min(.234, .011 + trayVolume * .044);
}

function dynamicRibbon(n, material) {
    const a = new Float32Array((n + 1) * 6), idx = [];
    for (let i = 0; i < n; i++) {
        let v = i * 2;
        idx.push(v, v + 1, v + 2, v + 2, v + 1, v + 3);
    }
    const geo = new T.BufferGeometry();
    geo.setAttribute('position', new T.BufferAttribute(a, 3).setUsage(T.DynamicDrawUsage));
    geo.setIndex(idx);
    const o = noShadow(mesh(flowGroup, geo, material));
    o.frustumCulled = false;
    o.visible = false;
    return {
        o,
        a,
        n
    };
}
const ribbons = lengths.map(()=>dynamicRibbon(22, waterMat));
const reflections = lengths.map(()=>dynamicRibbon(22, glint));
const fallSheet = dynamicRibbon(18, waterMat), pourSheet = dynamicRibbon(18, waterMat);
const seamSheets = [1, 2, 3].map(()=>dynamicRibbon(5, waterMat));

function putRibbon(r, j, a, b) {
    a.toArray(r.a, j * 6);
    b.toArray(r.a, j * 6 + 3);
}

function finishRibbon(r, on) {
    r.o.visible = on;
    if (on) {
        r.o.geometry.attributes.position.needsUpdate = true;
        r.o.geometry.computeVertexNormals();
    }
}

function sampleCell(arr, d) {
    const f = clamp(d / totalLength) * (cells - 1), i = Math.floor(f);
    return mix(arr[i], arr[Math.min(i + 1, cells - 1)], f - i);
}
const seamCrowd = new Float32Array(4);
const splitHighlights = [1, 2, 3].map(()=>[
        dynamicRibbon(14, glint),
        dynamicRibbon(14, glint)
    ]);
let measureAgain = 0;

function measureSeams(dt) {
    measureAgain -= dt;
    if (measureAgain > 0) return;
    measureAgain = .11;
    for (let i = 1; i < 4; i++) {
        let count = 0;
        const joint = paths[i].start;
        for (const b of bundles) {
            if (!b.done && b.lines.some((line)=>line.some((n)=>n.mode === 'track' && Math.abs(n.d - joint) < .16))) count++;
        }
        seamCrowd[i] = count;
    }
}

function streamModel(dt) {
    measureSeams(dt);
    const spill = Math.max(0, waterVolume - .065), flux = Math.min(1, spill * 2.7);
    waterVolume = clamp(waterVolume + dt * (pourRate - flux * .028), 0, 1.48);
    const cellLength = totalLength / (cells - 1);
    // Upwind transport. Water and its momentum cross the same cells as the noodles.
    for (let i = cells - 1; i >= 0; i--) {
        const d = i * cellLength, p = paths[findPath(d)], incoming = i ? depth[i - 1] : flux;
        const obstruction = d - p.start < .17 ? clamp(seamCrowd[p.i] - .65) : 0;
        const ratio = clamp(dt * (.73 + .65 * incoming + speed[i] * .20) / cellLength) * (1 - obstruction * .36 * (1 - incoming));
        depth[i] += ratio * (incoming - depth[i]);
        if (depth[i] < .00005) depth[i] = 0;
        const slope = Math.max(-.1, -p.slope), target = Math.max(.09, Math.sqrt(Math.max(.012, slope + .018)) * 2.1);
        const upstream = i ? speed[i - 1] : .87;
        speed[i] = Math.max(.06, speed[i] + dt * ((upstream - speed[i]) * (1.1 / cellLength) + 1.55 * (target - speed[i])));
        // A fast pulse leaving the straight retains its momentum on the shallower curve.
        const impulse = p.i === 1 ? Math.max(0, -p.slope - .169) * 16.5 : 0;
        steep[i] += dt * ((i ? steep[i - 1] : 0) - steep[i]) * Math.min(1 / dt, 1.55 / cellLength) + dt * (p.i === 1 ? 2.5 * (impulse - steep[i]) : -.05 * steep[i]);
    }
    trayVolume += depth[cells - 1] * .027 * dt;
}
for (let i = 0; i < 24; i++) {
    const o = noShadow(mesh(scene, dropGeom, foam));
    bubbles.push({
        o,
        d: i / 24 * 6,
        side: rand(-.12, .12),
        r: rand(.009, .019)
    });
}
for (let i = 0; i < 22; i++) {
    const o = noShadow(mesh(scene, dropGeom, glassEdge));
    beads.push({
        o,
        i: i % 4,
        x: rand(.06, .97),
        side: rand(-.27, .27),
        r: rand(.014, .031),
        wet: false
    });
}

function exitSpeed() {
    return .27 + depth[cells - 1] * (.32 + speed[cells - 1] * .38) + Math.min(1.42, steep[cells - 1] * 1.15);
}

function liquidVisuals(dt, t) {
    const h = .059 + waterVolume * .305, base = .054;
    resWater.visible = waterVolume > .002;
    const radius = .15 + .411 * smooth(0, .065, waterVolume) + .190 * Math.sqrt(waterVolume);
    resWater.position.y = (h + base) / 2;
    resWater.scale.set(radius / .60, (h - base) / .018, radius / .60);
    if (resWater.visible) {
        const attr = resWater.geometry.attributes.position;
        const bottomScale = Math.min(.49, radius * .94) / radius * .60;
        for (let j = 0; j < attr.count; j++)if (resRingY[j] < 0) attr.setXYZ(j, resRingX[j] * bottomScale, resRingY[j], resRingZ[j] * bottomScale);
        attr.needsUpdate = true;
    }
    trayWater.position.y = trayLevel();
    trayWater.scale.set(1 + (trayLevel() - .157) * .29, 1, 1 + (trayLevel() - .157) * .38);
    trayWater.visible = trayVolume > .003;
    waterGlints.visible = trayVolume > .008;
    waterGlints.position.set(.038 * Math.sin(t * .63), trayLevel() + .008, .019 * Math.sin(t * .81));
    waterGlints.rotation.y = .025 * Math.sin(t * .42);
    for (let i = 0; i < 4; i++) {
        const p = paths[i], r = ribbons[i], shine = reflections[i];
        let any = false;
        for (let j = 0; j <= r.n; j++) {
            const x = p.used * j / r.n, d = p.start + x, q = sampleCell(depth, d), w = q > .009 ? (.014 + Math.sqrt(q) * .197) * smooth(.009, .14, q) : 0;
            any ||= w > 0;
            const high = .008 + w * w * 1.8 + .003 * Math.sin(8 * d - t * 4) * q;
            const center = .016 * Math.sin(d * 5 - t * 1.7) * (1 - q) + p.k * .07 * q;
            const wave = .007 * Math.cos(d * 5 - t);
            const a = globalCourse(coursePoint(i, x, center - w, high)), b = globalCourse(coursePoint(i, x, center + w, high));
            putRibbon(r, j, a, b);
            const line = (.53 + .13 * Math.sin(d * 3 + t * .5) + wave) * w;
            putRibbon(shine, j, globalCourse(coursePoint(i, x, center + line, high + .003)), globalCourse(coursePoint(i, x, center + line + w * .038 * (.6 + .4 * Math.sin(4 * d - 2 * t)), high + .003)));
        }
        finishRibbon(r, any);
        finishRibbon(shine, any);
        if (i) {
            const sheet = seamSheets[i - 1], q = sampleCell(depth, p.start), width = .17 * Math.sqrt(q), prev = paths[i - 1];
            for (let j = 0; j <= sheet.n; j++) {
                const u = j / sheet.n;
                const ends = [-1, 1].map((sign)=>{
                    const a = globalCourse(coursePoint(i - 1, prev.used - .012, sign * width, .045 * q + .01)), b = globalCourse(coursePoint(i, .10, sign * width * 1.12, .045 * q + .01));
                    return a.lerp(b, u).add(V(0, .018 * Math.sin(PI * u), 0));
                });
                putRibbon(sheet, j, ...ends);
            }
            finishRibbon(sheet, q > .02);
        }
    }
    for (let i = 1; i < 4; i++) {
        const joint = paths[i].start, q = sampleCell(depth, joint), split = clamp(seamCrowd[i] - .70) * (1 - smooth(.32, .78, q));
        for (let side = 0; side < 2; side++) {
            const r = splitHighlights[i - 1][side];
            if (split > .02 && q > .02) {
                for (let j = 0; j <= r.n; j++) {
                    const u = j / r.n, d = joint - .20 + u * .52, lane = (side ? 1 : -1) * (.033 + .112 * split * Math.sin(u * PI)), y = .026 + .082 * q + .003 * Math.sin(u * PI);
                    putRibbon(r, j, trackWorld(d, lane, y), trackWorld(d, lane + .006 * Math.sin(u * PI), y));
                }
            }
            finishRibbon(r, split > .02 && q > .02);
        }
    }
    const end = trackWorld(totalLength, 0, .07 * depth[cells - 1]), dir = outletDirection(), v = exitSpeed(), q = depth[cells - 1], Tfall = Math.sqrt(Math.max(.01, (end.y - trayLevel()) * 2 / 6.3)), cross = V(-dir.z, 0, dir.x);
    for (let j = 0; j <= fallSheet.n; j++) {
        const f = j / fallSheet.n, tt = Tfall * f, p = end.clone().addScaledVector(dir, v * tt);
        p.y -= 3.15 * tt * tt;
        p.y = Math.max(trayLevel(), p.y);
        const w = .12 * Math.sqrt(q) * (1 - .62 * f);
        putRibbon(fallSheet, j, p.clone().addScaledVector(cross, -w), p.clone().addScaledVector(cross, w));
    }
    finishRibbon(fallSheet, q > .035);
    if (q > .03) {
        dropClock += dt * (2 + q * 8);
        if (dropClock > 1) {
            dropClock = 0;
            const p = end.clone().addScaledVector(dir, v * Tfall);
            p.y = trayLevel() + .008;
            ripple(p, rand(.09, .30));
            drip(p, V(rand(-.24, .24), rand(.25, .65), rand(-.24, .24)), .015, trayLevel());
        }
    }
    for (const b of bubbles) {
        b.d += dt * (sampleCell(speed, b.d) + sampleCell(steep, b.d) * .5) * (.45 + sampleCell(depth, b.d) * .8);
        if (b.d > totalLength) b.d = 0;
        const q = sampleCell(depth, b.d);
        b.o.visible = q > .14;
        if (b.o.visible) {
            b.o.position.copy(trackWorld(b.d, b.side * Math.sqrt(q), .013 + .076 * q));
            b.o.scale.set(b.r, b.r * .52, b.r);
        }
    }
    for (const b of beads) {
        const p = paths[b.i], piece = coursePieces[b.i];
        if (piece.installed && sampleCell(depth, p.start + p.used * b.x) > .1) b.wet = true;
        b.o.visible = b.wet;
        if (b.wet) {
            b.x += dt * -p.slope * .07;
            if (b.x > 1) b.x = .025;
            if (b.x < 0) b.x = .97;
            const high = .304 - Math.sqrt(.298 * .298 - b.side * b.side);
            b.o.position.copy(globalCourse(coursePoint(b.i, b.x * p.used, b.side, high)));
            b.o.scale.set(b.r * 1.3, b.r * .67, b.r);
        }
    }
    if (waterSound) waterSound.gain.setTargetAtTime(Math.min(.36, pourRate * .35 + q * .24), audio.currentTime, .13);
}

function splashUpdate(dt) {
    for (const d of drops) {
        if (!d.o.visible) continue;
        d.v.y -= 6.3 * dt;
        d.o.position.addScaledVector(d.v, dt);
        d.life -= dt;
        if (d.o.position.y <= d.floor || d.life < 0) {
            if (d.kind === 'net') {
                ripple(V(d.o.position.x, d.floor + .006, d.o.position.z), .13);
                tone(1000 + Math.max(0, net.position.y - .2) * 310, .034, .065, 'sine', 1.27);
            }
            d.o.visible = false;
        }
    }
    for (const r of ripples) {
        if (!r.o.visible) continue;
        r.age += dt * (r.kind === 'soup' ? .71 : 1.1);
        if (r.age > 1.5) {
            r.o.visible = false;
            continue;
        }
        const back = r.age > 1;
        const s = back ? 1 - (r.age - 1) * .66 : .06 + .94 * r.age;
        r.o.scale.setScalar(Math.max(.01, s * r.max));
        r.o.material.opacity = back ? .19 * (1 - (r.age - 1) * 2) : .54 - .33 * r.age;
    }
}

function waterPourVisual(t) {
    if (pourRate <= .002) {
        finishRibbon(pourSheet, false);
        return;
    }
    const spout = jugBody.localToWorld(V(-.755, 1.806, 0));
    const dest = resGlass.localToWorld(V(-.12, .07 + waterVolume * .305, 0));
    const w = .018 + .048 * Math.sqrt(pourRate);
    for (let i = 0; i <= pourSheet.n; i++) {
        const f = i / pourSheet.n, p = spout.clone().lerp(dest, f);
        p.y += .24 * Math.sin(f * PI);
        const ww = w * (1 - .40 * f) * (1 + .03 * Math.sin(t * 23 - f * 12));
        putRibbon(pourSheet, i, p.clone().add(V(-ww, 0, 0)), p.clone().add(V(ww, 0, 0)));
    }
    finishRibbon(pourSheet, true);
}
// Each line has its own tail, contact history and launch velocity.
const strandCount = 9, nodeCount = 15, sides = 5;

function noodleGeometry() {
    const vertexCount = strandCount * nodeCount * sides, geo = new T.BufferGeometry(), indices = [];
    for (let s = 0; s < strandCount; s++)for (let j = 0; j < nodeCount - 1; j++)for (let k = 0; k < sides; k++) {
        const n = (s * nodeCount + j) * sides, a = n + k, b = n + (k + 1) % sides;
        indices.push(a, a + sides, b, b, a + sides, b + sides);
    }
    geo.setAttribute('position', new T.BufferAttribute(new Float32Array(vertexCount * 3), 3).setUsage(T.DynamicDrawUsage));
    geo.setAttribute('normal', new T.BufferAttribute(new Float32Array(vertexCount * 3), 3).setUsage(T.DynamicDrawUsage));
    geo.setIndex(indices);
    return geo;
}

function releaseNoodles() {
    const b = {
        mesh: mesh(scene, noodleGeometry(), wetNoodle),
        lines: [],
        phase: rand(0, TAU),
        age: 0,
        done: false,
        press: 0,
        number: servedCount++,
        touch: false
    };
    b.mesh.frustumCulled = false;
    b.mesh.userData.bundle = b;
    const long = Math.random() < .28 ? Math.floor(rand(0, strandCount)) : -1;
    for (let s = 0; s < strandCount; s++) {
        const line = [];
        const length = rand(.66, 1.04) + (s === long ? .72 : 0), delay = rand(0, .13);
        for (let j = 0; j < nodeCount; j++) {
            const f = j / (nodeCount - 1), angle = b.phase + s * .55 + f * TAU * 1.35;
            line.push({
                d: -delay - f * length,
                length,
                mode: 'track',
                p: resGlass.localToWorld(V(.26 * Math.cos(angle), .15, .27 * Math.sin(angle))),
                v: V(),
                side: (s - (strandCount - 1) / 2) * .021,
                rest: V(),
                age: 0,
                angle,
                slip: 0,
                threshold: clamp(.06 + s * .104 + f * .066 + rand(-.012, .012), .05, .97),
                caught: false
            });
        }
        b.lines.push(line);
    }
    bundles.push(b);
    writeNoodle(b);
    tone(530, .065, .105, 'sine', 1.3);
}
const tangent = V(), lateral = V(), normal = V(), up = V(0, 1, 0), pbuf = V();

function writeNoodle(b) {
    const pos = b.mesh.geometry.attributes.position, norm = b.mesh.geometry.attributes.normal;
    let i = 0;
    for (const line of b.lines)for (let j = 0; j < line.length; j++) {
        const n = line[j];
        tangent.subVectors(line[Math.min(j + 1, nodeCount - 1)].p, line[Math.max(0, j - 1)].p).normalize();
        lateral.crossVectors(tangent, up);
        if (lateral.lengthSq() < .00001) lateral.set(1, 0, 0);
        else lateral.normalize();
        normal.crossVectors(lateral, tangent).normalize();
        for (let k = 0; k < sides; k++) {
            const a = TAU * k / sides;
            pbuf.copy(lateral).multiplyScalar(Math.cos(a)).addScaledVector(normal, Math.sin(a));
            norm.setXYZ(i, pbuf.x, pbuf.y, pbuf.z);
            pos.setXYZ(i, n.p.x + pbuf.x * .015, n.p.y + pbuf.y * .015 * (1 - .42 * b.press), n.p.z + pbuf.z * .015);
            i++;
        }
    }
    pos.needsUpdate = true;
    norm.needsUpdate = true;
    b.mesh.geometry.boundingSphere = null;
}

function netLocal(p) {
    return netHead.worldToLocal(p.clone());
}

function capture(n, s, j, b, local, edge) {
    n.mode = 'net';
    n.caught = true;
    const f = j / (nodeCount - 1);
    const angle = b.phase + f * TAU * 1.19 + s * .23, r = .12 + .15 * Math.sin(f * PI) + s * .011;
    n.rest.set(clamp(local.x, -.43, .43) * .63 + Math.cos(angle) * r * .78, 0, clamp(local.z, -.43, .43) * .63 + Math.sin(angle) * r * .7);
    if (edge) {
        const rr = Math.hypot(local.x, local.z) || 1, stick = .45 + .12 * Math.sin(f * PI * 2);
        n.rest.x = local.x / rr * stick + .045 * Math.cos(angle);
        n.rest.z = local.z / rr * stick + .045 * Math.sin(angle);
    }
    const rr = Math.hypot(n.rest.x, n.rest.z);
    n.rest.y = rr > .50 ? -.03 - (rr - .50) * 1.7 : -.151 * (1 - rr * rr / .25) + .025 + .008 * s;
    n.age = 0;
    if (!b.touch) {
        b.touch = true;
        tone(1630, .07, .09, 'sine', .67);
    }
}
let dumpPower = 0, dumpTilt = 0, spillFraction = 0, netWet = 0;

function noodleUpdate(dt, t) {
    netHead.updateWorldMatrix(true, false);
    const waterY = trayLevel(), out = outletDirection(), flow = exitSpeed();
    const previous = bundles.filter((b)=>!b.done);
    for (let bi = 0; bi < previous.length; bi++) {
        const b = previous[bi];
        b.age += dt;
        b.press = Math.max(0, b.press - dt * 1.7);
        let finished = true;
        for (let s = 0; s < b.lines.length; s++) {
            const line = b.lines[s];
            if (line.sliding) line.sliding += dt;
            for (let j = 0; j < line.length; j++) {
                const n = line[j], f = j / (nodeCount - 1);
                n.age += dt;
                if (n.mode === 'tray' || n.mode === 'air') {
                    const near = [
                        line[j - 1],
                        line[j + 1]
                    ].find((p)=>p?.mode === 'net' && p.age > .10 && p.p.distanceTo(n.p) > .32);
                    if (near) {
                        capture(n, s, j, b, near.rest, false);
                        n.rest.lerp(near.rest, .72);
                    }
                }
                if (n.mode === 'track') {
                    const d = Math.max(0, n.d), i = findPath(d), p = paths[i], q = sampleCell(depth, d), v = sampleCell(speed, d), puddle = clamp((q - .035 - f * .115) * 2.5);
                    const local = d - p.start;
                    let friction = 1;
                    if (i > 0 && local < .19 && q < .43) {
                        friction = mix(.035, 1, smooth(.07, .43, q));
                        for (let k = 0; k < bi; k++) {
                            const other = previous[k].lines[s % strandCount];
                            if (other.some((m)=>m.mode === 'track' && Math.abs(m.d - d) < .14)) {
                                friction *= .26;
                                break;
                            }
                        }
                    }
                    let adv = (.065 + v * .70 + sampleCell(steep, d) * .78) * Math.pow(puddle, .78) * friction;
                    if (n.d < 0) adv = (.22 + q * .80) * clamp((waterVolume - .047) * 21);
                    if (j) {
                        const front = line[j - 1], gap = front.d - n.d, rest = n.length / (nodeCount - 1);
                        if (front.mode === 'track') {
                            adv += clamp((gap - rest) * 3.2, 0, .4) * puddle;
                            if (gap < rest * .28) adv *= .62;
                        }
                    }
                    n.d += adv * dt;
                    const side = n.side + .053 * Math.sin(n.angle + n.d * 2.2) + .037 * Math.sin(f * 5.6 + b.phase + t * .6);
                    if (n.d < 0) {
                        const a = n.angle + n.d * .32, r = .18 + .13 * f, at = resGlass.localToWorld(V(r * Math.cos(a), .09 + .30 * waterVolume + .018 * s, r * Math.sin(a)));
                        n.p.copy(at.lerp(trackWorld(0, side, .06), smooth(-.56, 0, n.d)));
                    } else if (n.d < totalLength) {
                        const seg = findPath(n.d), path = paths[seg], x = n.d - path.start, q2 = sampleCell(depth, n.d);
                        const edge = seg === 2 ? -.12 * Math.sign(path.k) * Math.sin(PI * x / path.used) : 0, lane = side + edge * (.51 + q2 * .46);
                        let high = .019 + q2 * .061 + lane * lane * 1.73 + .014 * Math.sin(n.angle);
                        if (seg > 0 && x < .15) {
                            const a = paths[seg - 1], drop = coursePoint(seg - 1, a.used).y - path.y;
                            high += Math.max(0, drop) * (1 - smooth(0, .15, x)) + .028 * Math.sin(x / .15 * PI);
                        }
                        n.p.copy(trackWorld(n.d, lane, high));
                        if (!b.hasFollow && n.d > paths[1].start + paths[1].used * .48) {
                            b.hasFollow = true;
                            if (!closeView && !cameraRide && !held) cameraRide = {
                                bundle: b,
                                elapsed: 0
                            };
                        }
                    } else {
                        n.mode = 'air';
                        n.p.copy(trackWorld(totalLength, side, .047));
                        n.v.copy(out).multiplyScalar(flow * (.96 + .05 * Math.sin(n.angle)));
                        n.v.y -= .05;
                        n.age = 0;
                    }
                } else if (n.mode === 'air') {
                    const before = n.p.clone();
                    n.v.y -= 6.3 * dt;
                    n.p.addScaledVector(n.v, dt);
                    const local = netLocal(n.p), was = netLocal(before);
                    const radial = Math.hypot(local.x, local.z), netY = -.155 * (1 - Math.min(1, radial * radial / .25));
                    if (radial < netR + .073 && local.y <= netY + .036 && was.y >= netY - .05) {
                        capture(n, s, j, b, local, radial > .385);
                        netWet = 1;
                    } else if (n.p.y <= waterY + .01) {
                        n.mode = 'tray';
                        n.age = 0;
                        n.rest.copy(n.p);
                        n.rest.y = .182 + s * .0018;
                        n.rest.addScaledVector(n.v, .035);
                        n.rest.x += .09 * Math.cos(n.angle);
                        n.rest.z += .075 * Math.sin(n.angle);
                        if (s === 0 && j === 0) {
                            ripple(V(n.p.x, waterY + .007, n.p.z), .28);
                            tone(730, .085, .105, 'sine', 1.15);
                        }
                    }
                } else if (n.mode === 'tray') {
                    n.p.lerp(n.rest, 1 - Math.exp(-dt * 5));
                    const local = netLocal(n.p);
                    if (scooping && Math.hypot(local.x, local.z) < netR - .016 && local.y > -.22 && local.y < .20) {
                        capture(n, s, j, b, local, false);
                        netWet = 1;
                    }
                } else if (n.mode === 'net') {
                    n.p.lerp(netHead.localToWorld(n.rest.clone()), 1 - Math.exp(-dt * (n.age < .15 ? 13 : 30)));
                    if (spillFraction > n.threshold || line.sliding && line.sliding > f * .63) {
                        if (!line.sliding) line.sliding = .001;
                        n.mode = 'soupFall';
                        n.age = 0;
                        n.layer = Math.min(.128, bowlAmount * .013);
                        n.v.set(0, .05, 0);
                        n.slip = 0;
                    }
                } else if (n.mode === 'soupFall') {
                    n.slip = clamp(n.slip + dt * 2.25);
                    const a = b.phase + f * TAU * 1.24 + s * .23, rr = .23 + .16 * Math.sin(f * PI) + s * .012;
                    const layer = n.layer;
                    n.rest.copy(bowl.position).add(V(Math.cos(a) * rr, .585 + layer + s * .0028 + .014 * Math.sin(a * 2), Math.sin(a) * rr * .90));
                    n.p.lerp(n.rest, 1 - Math.exp(-dt * (3 + n.slip * 13)));
                    if (n.slip >= 1) {
                        n.mode = 'soup';
                        n.p.copy(n.rest);
                        bowlAmount += 1 / (strandCount * nodeCount);
                        if (j === 0 && s % 3 === 0) {
                            ripple(V(n.p.x, .612 + layer, n.p.z), .36, 'soup');
                            tone(650 + bowlAmount * 27, .10, .16, 'sine', .70);
                        }
                    }
                }
                if (n.mode !== 'soup') finished = false;
            }
        }
        writeNoodle(b);
        b.done = finished;
    }
    if (netWet > 0) {
        netWet = Math.max(0, netWet - dt * .029);
        netClock += dt * (1.1 + netWet * 3.3) / (1 + Math.max(0, net.position.y - .55));
        hangingDrop.visible = !bowlDock;
        const grow = clamp(netClock);
        hangingDrop.scale.set(.009 + .018 * grow, .013 + .033 * grow, .009 + .018 * grow);
        if (netClock > 1 && dumpPower < .06) {
            netClock = 0;
            const at = hangingDrop.getWorldPosition(V());
            const overBasin = netInTray(at);
            drip(at, V(0, -.05, 0), .019, overBasin ? waterY : .028, overBasin ? 'net' : 'table');
            const a = rand(0, TAU), r = rand(.16, .34);
            hangingDrop.position.set(Math.cos(a) * r, -.177 + .59 * r * r, Math.sin(a) * r);
        }
    }
}
