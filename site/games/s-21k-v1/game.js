'use strict';
const canvas=document.getElementById('table');
const renderer=new T.WebGLRenderer({canvas,antialias:true,alpha:false,powerPreference:'high-performance'});
renderer.setPixelRatio(Math.min(window.devicePixelRatio||1,2));
renderer.shadowMap.enabled=true;renderer.shadowMap.type=T.PCFSoftShadowMap;
renderer.outputColorSpace=T.SRGBColorSpace;renderer.toneMapping=T.ACESFilmicToneMapping;renderer.toneMappingExposure=1.13;
const scene=new T.Scene();scene.background=new T.Color(0xe3d6bc);
const camera=new T.PerspectiveCamera(34,1,.07,150);
const world=group(scene),tabletop=group(scene);
const sun=new T.DirectionalLight(0xffe3bc,3.0);sun.position.set(-6,12,-4.3);scene.add(sun);sun.castShadow=true;
Object.assign(sun.shadow.camera,{left:-11,right:11,top:11,bottom:-11,near:.2,far:34});sun.shadow.mapSize.set(2048,2048);sun.shadow.normalBias=.014;sun.shadow.bias=-.00014;sun.shadow.camera.updateProjectionMatrix();
scene.add(new T.HemisphereLight(0xfff6e2,0xb69f83,2.25));
const fill=new T.DirectionalLight(0xd5edff,.69);fill.position.set(4,5,6);scene.add(fill);
// A room-sized environment gives the curved plastic and the flat window different reflections.
const envScene=new T.Scene();envScene.background=new T.Color(0x9e9482);
const envWall=(x,y,z,w,h,ry,col)=>{const m=mesh(envScene,new T.PlaneGeometry(w,h),new T.MeshBasicMaterial({color:col,side:T.DoubleSide}),x,y,z);m.rotation.y=ry;return m};
for(const z of [-3.2,-1.5,.2])for(const y of [1.3,3.3])envWall(-4,y,z,1.49,1.8,PI/2,0xfffbee);
envWall(0,2,-5,7,4.2,0,0xf1e1bc);envWall(4,.3,0,7,2,PI/2,0x5c6658);
const pmrem=new T.PMREMGenerator(renderer),reflection=pmrem.fromScene(envScene,.025);scene.environment=reflection.texture;scene.environmentIntensity=.32;pmrem.dispose();
for(let i=-7;i<8;i++){
 const plankMat=wood.clone(),tex=woodTex.clone();tex.repeat.set(1.65,.89);tex.offset.set(noise(),noise()*.1);plankMat.map=tex;plankMat.bumpMap=tex;
 plankMat.color.setHSL(.087,.18,.91+noise()*.08);
 const board=box(tabletop,44,.38,1.63,plankMat,0,-.288,i*1.646);
}
// The back edge of the desk meets a painted wooden windowsill.
const room=group(tabletop),paint=mat(0xe7dec9,{roughness:.68}),plaster=mat(0xe3d9c5);
box(room,46,2.5,.31,plaster,0,-.66,-10.45);
box(room,46,.15,.80,paint,0,.64,-10.25);
const sky=new T.MeshBasicMaterial({color:0xe4efe4});
box(room,44,8,.09,sky,0,4.62,-10.69);
for(let i=-4;i<5;i++)box(room,.12,8,.16,paint,i*4.4,4.62,-10.50);
box(room,44,.10,.15,paint,0,3.80,-10.50);
// Diffuse window light, including its soft mullion shadows, falls across every material.
const lightTravel={value:0};
function windowLight(m){
 if(!m.isMeshStandardMaterial||m.userData.sunlit)return;
 m.userData.sunlit=true;m.onBeforeCompile=sh=>{
 sh.vertexShader='varying vec3 vTableWorld;\n'+sh.vertexShader.replace('#include <project_vertex>','#include <project_vertex>\nvTableWorld=(modelMatrix*vec4(transformed,1.)).xyz;');
 sh.uniforms.kitLightTravel=lightTravel;
 sh.fragmentShader='uniform float kitLightTravel; varying vec3 vTableWorld;\n'+sh.fragmentShader.replace('#include <opaque_fragment>',`
 float kitU=kitLightTravel+vTableWorld.x*.88+vTableWorld.z*.40+vTableWorld.y*.40;
 float kitV=vTableWorld.z*.88-vTableWorld.x*.37+vTableWorld.y*.28;
 float pane=smoothstep(-6.0,-5.45,kitU)*(1.-smoothstep(1.2,1.85,kitU))*smoothstep(-7.5,-6.9,kitV)*(1.-smoothstep(4.2,4.8,kitV));
 pane*=.28+.72*smoothstep(.045,.21,abs(kitU+1.7));
 pane*=.38+.62*smoothstep(.04,.23,abs(kitV+2.8));
 outgoingLight*=mix(vec3(.9,.92,.94),vec3(1.13,1.09,1.015),pane);
 #include <opaque_fragment>`);
 };
}
const landscapeMat=makeMat(world,13.78,7.94),portraitMat=makeMat(world,8.52,12.62);
const net=makeNet(world),tray=makeTray(world),nest=makeNest(world);
const plant=decorPlant(world),tape=makeTape(world);
const pencil1=pencil(world,mat(0xbc6d51)),pencil2=pencil(world,mat(0xdaaa63));
const parts=[
 {id:'ramp',o:makeRamp(world)},{id:'wheel',o:makeWheel(world)},
 {id:'crank',o:makeHandle(world)},{id:'window',o:makeWindow(world)}
];
const carrier=group(world);
const carrierShape=roundedPath(-2.11,-1.07,4.22,2.14,.15);
roundHole(carrierShape,-.88,0,.94);hole(carrierShape,1.08,0,.75,1.45,.32);
hole(carrierShape,1.78,.73,.16,.16,.08);slab(carrier,carrierShape,.061,card);
const carrierShadow=contact(carrier,4.64,2.60,0,-.009,.055,.58);
const underNet=contact(world,3.7,2.9,0,-.010,0,.71);
const underTray=contact(world,3.38,1.74,0,-.012,0,.65);
const underNest=contact(world,3.58,1.47,0,-.009,0,.70);
const underParts=parts.map((p,i)=>contact(world,[2.98,2.21,1.08,2.82][i],[1.24,2.19,1.73,2.27][i],0,-.01,0,.66));
const underPrizes=Array.from({length:3},()=>contact(world,.65,.53,0,.08,0,.66));
const underLids=Array.from({length:3},()=>contact(world,.84,.84,0,0,0,.53));
const cups=[],prizes=[];
const orderColors=[0,1,2];if(Math.random()<.5)orderColors.reverse();
for(let i=0;i<3;i++){
 const root=group(world),cup=makeCup(root,orderColors[i]),lid=makeLid(world);
 cups.push({i,root,cup,lid,state:'empty',prize:null,wob:0,rock:0,angle:0,rotation0:(Math.random()-.5)*.28,
 drift:(Math.random()-.5)*.065,home:new T.Vector3(),coverHome:new T.Vector3(),onStand:true,lidHome:true});
 const o=makePrize(world,i);prizes.push({i,o,cup:null,selected:false,restYaw:(Math.random()-.5)*1.3,spin:0,onTray:true,rest:vec()});
}
scene.traverse(o=>{if(o.material){for(const m of [].concat(o.material))windowLight(m)}});
const panels=[{id:'left',o:net.left,angle:.038,target:.038},{id:'back',o:net.back,angle:.008,target:.008},{id:'right',o:net.right,angle:.012,target:.012}];
for(const p of panels){p.board=p.o.userData.board;p.flat=p.board.geometry.attributes.position.array.slice();p.dent=0}
const queue=[],particles=[],tweens=[];
let portrait=false,layout=null,assembled=false,firstDrop=true,zoomCup=null,selected=null,lowside=1,angle=0,pocket=null;
let frontAngle=0,trayShift=0,traySpring=0,traySpeed=0,autoTurn=0,turnSpeed=0,hasLayout=false,rewiring=false;
let clockTime=0,lastTouch=0,demonstration=0,held=null,lastHint=null,flushTime=0;
const targetMap=new Map(),ray=new T.Raycaster(),ndc=new T.Vector2(),plane=new T.Plane(vec(0,1,0),0);
const euler=(x=0,y=0,z=0)=>new T.Euler(x,y,z,'YXZ');
function qEuler(x=0,y=0,z=0){return new T.Quaternion().setFromEuler(euler(x,y,z))}
function nameTarget(o,type,data){const hit={o,type,data};targetMap.set(o,hit);return hit}
panels.forEach(p=>p.hit=nameTarget(p.o,'panel',p));parts.forEach(p=>p.hit=nameTarget(p.o,'part',p));
cups.forEach(c=>{c.hit=nameTarget(c.root,'cup',c);c.lidHit=nameTarget(c.lid,'lid',c)});
prizes.forEach(p=>p.hit=nameTarget(p.o,'prize',p));const trayHit=nameTarget(tray,'tray',tray);
function proxy(p,w,h,d,y=0,z=0){const o=mesh(p,new T.BoxGeometry(w,h,d),new T.MeshBasicMaterial({visible:false}),0,y,z);o.castShadow=o.receiveShadow=false}
prizes.forEach(p=>proxy(p.o,.60,.42,.48));cups.forEach(c=>{proxy(c.root,.68,.53,.65,-.05);proxy(c.lid,.66,.32,.66,.12)});
proxy(parts[2].o,.56,1.03,.8,.23,.29);proxy(parts[3].o,2.42,1.94,.09);
function tween(o,pos,quat,d,cb,lift=0){
 clearTween(o);
 const a={o,p0:o.position.clone(),p1:pos.clone(),q0:o.quaternion.clone(),q1:quat.clone(),time:0,d,cb,lift};
 tweens.push(a);return a;
}
function clearTween(o){const i=tweens.findIndex(a=>a.o===o);if(i>=0)tweens.splice(i,1)}
function moving(o){return tweens.some(a=>a.o===o)}
function stepTweens(dt){
 for(const a of [...tweens]){a.time=Math.min(a.d,a.time+dt);const t=a.time/a.d,k=t*t*(3-2*t);
 a.o.position.lerpVectors(a.p0,a.p1,k);a.o.quaternion.slerpQuaternions(a.q0,a.q1,k);a.o.position.y+=Math.sin(t*PI)*a.lift;
 if(t===1){clearTween(a.o);if(a.cb)a.cb()}
 }
}
function layoutSpec(isPortrait){
 return isPortrait?{box:[0,-1.90],tray:[1.64,3.18],rack:[.12,5.39],ramp:[-1.84,3.17],frame:[-1.84,1.03],glass:[2.11,1.00],plant:[-4.37,-5.81],tape:[4.09,4.34],pen:[3.62,-4.74],mat:[8.52,12.62]}:
 {box:[-1.77,.15],tray:[-1.53,2.64],rack:[3.68,2.94],ramp:[-4.75,2.52],frame:[3.43,-2.17],glass:[4.17,-.01],plant:[-6.30,-4.02],tape:[6.72,1.40],pen:[4.50,-4.11],mat:[13.78,7.94]};
}
function trayHome(){return assembled?vec(net.root.position.x+trayShift,.004,net.root.position.z+1.69):vec(layout.tray[0],.004,layout.tray[1])}
function prizeSpot(p){
 const q=trayHome();return assembled?vec(net.root.position.x+(p.i-1)*.75,.13,net.root.position.z+2.87):vec(q.x+(p.i-1)*.78,.229,q.z+.07);
}
function installedPose(id){
 const n=net.root.position;
 if(id==='ramp')return [vec(n.x,n.y+1.93,n.z-.32),qEuler(.045,0,-lowside*.155)];
 if(id==='wheel')return [vec(n.x,n.y+1.06,n.z+.46),qEuler(0,0,-lowside*angle)];
 if(id==='crank')return [vec(n.x,n.y+1.06,n.z+.96),qEuler(0,0,-lowside*angle)];
 return [vec(n.x,n.y+1.65,n.z+.82),qEuler()];
}
function loosePose(p){
 switch(p.id){
 case 'ramp':return [vec(layout.ramp[0],.006,layout.ramp[1]),qEuler(0,-.09)];
 case 'wheel':return [vec(layout.frame[0]-.88,.156,layout.frame[1]),qEuler(-PI/2,0,.24)];
 case 'crank':return [vec(layout.frame[0]+1.08,.22,layout.frame[1]),qEuler(.045,.40,1.49)];
 default:return [vec(layout.glass[0],.06,layout.glass[1]),qEuler(-PI/2+.045,.075)];
 }
}
function relocate(o,p,old){if(old)o.position.add(p.clone().sub(old));else o.position.copy(p)}
function setLayout(initial=false){
 const iw=window.innerWidth,ih=window.innerHeight;renderer.setSize(iw,ih,false);camera.aspect=iw/ih;camera.updateProjectionMatrix();
 const narrow=iw/ih<.84;if(hasLayout&&narrow===portrait){if(initial)fitCamera(1,true);return}
 if(hasLayout){
 if(held)endInteraction({pointerId:held.id,clientX:held.lx,clientY:held.ly},true);
 for(let i=0;i<5&&tweens.length;i++)stepTweens(4);
 }
 const old=layout,oldBox=net.root.position.clone(),oldParts=old?parts.map(p=>loosePose(p)[0]):null,oldTray=old?trayHome():null;
 portrait=narrow;layout=layoutSpec(portrait);landscapeMat.visible=!portrait;portraitMat.visible=portrait;
 net.root.position.set(layout.box[0],.009,layout.box[1]);nest.position.set(layout.rack[0],.098,layout.rack[1]);
 tray.position.copy(trayHome());underNet.position.set(net.root.position.x,-.010,net.root.position.z);
 underNest.position.set(nest.position.x,-.010,nest.position.z);
 carrier.position.set(layout.frame[0],-.011,layout.frame[1]);
 for(const [o,tag,y,ry] of [[plant,'plant',-.07,.26],[tape,'tape',-.065,-.60],[pencil1,'pen',.002,-.19],[pencil2,'pen',.0,-.12]]){
 o.position.set(layout[tag][0],y,layout[tag][1]);o.rotation.y=ry+(portrait&&tag==='pen'?1.56:0)}
 pencil2.position.x+=portrait?.22:.20;pencil2.position.z+=portrait?.14:.22;
 parts.forEach((p,i)=>{const [pos,rot]=p.installed?installedPose(p.id):loosePose(p);
 if(p.installed||!old||!p.touched){p.o.position.copy(pos);p.o.quaternion.copy(rot)}else relocate(p.o,pos,oldParts[i]);});
 cups.forEach(c=>{
 const home=vec(nest.position.x+(c.i-1)*.94+c.drift,.32,nest.position.z+c.drift*.3);
 const lid=vec(home.x,.006,nest.position.z-.84-c.drift);
 if(c.root.parent===world&&(c.state==='empty'||c.state==='filled'||c.state==='closed'))relocate(c.root,home,old?c.home:null);
 if(c.lid.parent===world&&c.state!=='opened')relocate(c.lid,lid,old?c.coverHome:null);
 if(old){
 const boxDelta=net.root.position.clone().sub(oldBox),trayDelta=trayHome().sub(oldTray);
 if(['queued','pocket','falling'].includes(c.state)){c.root.position.add(boxDelta);if(c.state==='falling')c.fallFrom.add(boxDelta)}
 if(c.state==='opened'){c.lid.position.add(trayDelta);c.prize.o.position.add(trayDelta);c.prize.rest.add(trayDelta)}
 }

 c.home.copy(home);c.coverHome.copy(lid);if(!old)c.lid.rotation.y=c.rotation0;
 if(c.state==='tray'||c.state==='opened')c.root.position.add(trayHome().sub(oldTray||trayHome()));
 });
 prizes.forEach(p=>{if(!p.cup){const pos=prizeSpot(p);if(!old||p.onTray)p.rest.copy(pos);else p.rest.add(net.root.position.clone().sub(oldBox));p.o.position.copy(p.rest);p.o.rotation.y=p.restYaw;if(p.i===2)p.o.rotation.z=.9}});
 hasLayout=true;fitCamera(1,true);
}
const camLook=vec(),camGoal=vec(),lookGoal=vec(),backDir=vec(),rightDir=vec(),upDir=vec();
function framePoints(points,look,back,margin=1){
 back.normalize();rightDir.crossVectors(vec(0,1,0),back).normalize();upDir.crossVectors(back,rightDir).normalize();
 const tan=Math.tan(camera.fov*PI/360);let distance=1;
 for(const p of points){const d=p.clone().sub(look);distance=Math.max(distance,d.dot(back)+Math.abs(d.dot(rightDir))/(tan*camera.aspect)*margin,d.dot(back)+Math.abs(d.dot(upDir))/tan*margin)}
 camGoal.copy(look).addScaledVector(back,distance);lookGoal.copy(look);
}
function fitCamera(dt,instant=false){
 const b=net.root.position;
 if(zoomCup){
 const c=zoomCup,cp=c.root.position;
 const q=c.state==='falling'?clamp(c.fallTime/.9):1;
 lookGoal.set(lerp(b.x,cp.x*.70+b.x*.30,q),lerp(1.2,.48,q),lerp(b.z+.4,cp.z-.16,q));
 const dest=vec(1.60,portrait?1.64:1.15,portrait?4.85:3.55).multiplyScalar(portrait?1.03:1);if(c.state==='opening'||c.state==='opened')dest.y+=.77;camGoal.copy(lookGoal).add(dest);
 }else{
 const points=[];let center;
 if(!assembled){
 const w=portrait?7.96:12.92,d=portrait?11.76:7.02;center=vec(portrait?0:.05,.18,portrait?.08:.12);
 if(portrait){
 for(const [x,z] of [[-3.94,-1.1],[3.94,-1.1],[-3.99,2.11],[3.54,2.08],[-1.6,6.04],[1.8,6.04],[-1.43,-5.72],[1.43,-5.72]])points.push(vec(x,.04,z));
 }else for(const x of [-w/2,w/2])for(const z of [-d/2,d/2])points.push(vec(x,.02,z));
 points.push(vec(b.x,panels[1].angle>.45?2.9:.35,b.z-.94));
 backDir.set(portrait?.065:.11,portrait?1.77:1.40,1);
 }else{
 const minX=Math.min(b.x-1.58,tray.position.x-1.58),maxX=Math.max(nest.position.x+1.65,b.x+1.7),minZ=b.z-1.34,maxZ=Math.max(nest.position.z+.73,b.z+3.28);
 center=vec((minX+maxX)/2,.70,(minZ+maxZ)/2-.14);
 for(const x of [minX,maxX])for(const z of [minZ,maxZ])points.push(vec(x,.05,z));
 for(const x of [-1.4,1.4])points.push(vec(b.x+x,2.92,b.z-.88));
 prizes.forEach(p=>{if(!p.cup)points.push(p.rest)});cups.forEach(c=>{if(['empty','closed','filled'].includes(c.state))points.push(c.root.position)});
 for(const c of cups)if(c.lid.parent===world&&!c.lidHome&&c.state!=='opened')points.push(c.lid.position);
 if(rewiring)for(const p of parts.filter(p=>!p.installed)){for(const dx of [-1.38,1.38])points.push(p.o.position.clone().add(vec(dx,0,.5)))}
 backDir.set(.13,portrait?1.24:.98,1);
 }framePoints(points,center,backDir,portrait?1.058:1.035);
 }
 const k=instant?1:1-Math.exp(-dt*(zoomCup?3.65:2.0));camera.position.lerp(camGoal,k);camLook.lerp(lookGoal,k);camera.lookAt(camLook);camera.updateMatrixWorld();
}
// All sound is made from short filtered noise bursts, resonant shells, and an axle loop.
let audio=null,soundNoise=null,axleGain,axleFilter,axleSource;
function wakeSound(){
 if(!audio){const AC=window.AudioContext||window.webkitAudioContext;if(!AC)return;
 audio=new AC();const len=Math.ceil(audio.sampleRate*1.25);soundNoise=audio.createBuffer(1,len,audio.sampleRate);const ch=soundNoise.getChannelData(0);for(let i=0;i<len;i++)ch[i]=Math.random()*2-1;
 axleSource=audio.createBufferSource();axleSource.buffer=soundNoise;axleSource.loop=true;axleFilter=audio.createBiquadFilter();axleFilter.type='bandpass';axleFilter.Q.value=1.4;axleGain=audio.createGain();axleGain.gain.value=0;axleSource.connect(axleFilter).connect(axleGain).connect(audio.destination);axleSource.start();
 }if(audio.state==='suspended')audio.resume().catch(()=>{});
}
function sound(kind,force=.6,delay=0){
 if(!audio)return;const t=audio.currentTime+delay;force=clamp(force,.07,1.25);
 const noises={paper:[510,.13,.16],rub:[330,.18,.12],snap:[1450,.065,.19],drop:[220,.16,.25]};
 if(noises[kind]){const [freq,d,g]=noises[kind],source=audio.createBufferSource(),filter=audio.createBiquadFilter(),gain=audio.createGain();
 source.buffer=soundNoise;filter.type='bandpass';filter.frequency.setValueAtTime(freq*(.8+force*.42),t);filter.frequency.exponentialRampToValueAtTime(freq*.5,t+d);filter.Q.value=.88;
 gain.gain.setValueAtTime(.0001,t);gain.gain.exponentialRampToValueAtTime(g*force,t+.009);gain.gain.exponentialRampToValueAtTime(.0001,t+d);source.connect(filter).connect(gain).connect(audio.destination);source.start(t,Math.random()*.35);source.stop(t+d+.02);return}
 const frequency=kind==='wood'?590:kind==='inside'?815:1470;
 const duration=kind==='wood'?.088:.056;
 for(let i=0;i<2;i++){const o=audio.createOscillator(),g=audio.createGain();o.type='sine';o.frequency.setValueAtTime(frequency*(i?1.64:1)*(1+Math.random()*.05),t);o.frequency.exponentialRampToValueAtTime(frequency*(i?1.28:.79),t+duration);
 g.gain.setValueAtTime(.0001,t);g.gain.exponentialRampToValueAtTime((i?.016:.049)*force,t+.002);g.gain.exponentialRampToValueAtTime(.0001,t+duration);o.connect(g).connect(audio.destination);o.start(t);o.stop(t+duration+.02)}
}
function driveAudio(dt){if(audio){const a=Math.min(1,turnSpeed*.18);axleFilter.frequency.setTargetAtTime(175+a*620,audio.currentTime,.065);axleGain.gain.setTargetAtTime(a*.069,audio.currentTime,.052)}turnSpeed*=Math.exp(-dt*11)}
function paperBits(pos){
 for(let i=0;i<3;i++){const o=box(world,.025+Math.random()*.014,.009,.016,ivory,pos.x,pos.y,pos.z);particles.push({o,v:vec((Math.random()-.5)*.73,.18+Math.random()*.2,(Math.random()-.5)*.64),life:1.6})}
}
function panelPos(p){
 const v=p.id==='back'?vec(.1,.1,-2.09):vec((p.id==='left'?-1:1)*2.05,.1,.13);
 return p.o.localToWorld(v);
}
function flexBoard(p,dt){
 const contact=p.pressSpot;
 if(contact&&held?.hit.data!==p)p.dent*=Math.exp(-dt*11);
 const bends=p.id==='back'?[panels[0],panels[2]].map(side=>clamp((Math.min(side.angle,p.angle)-.96)/.61)):[0,0];
 const tag=bends[0]+bends[1]*3;
 if(!contact&&Math.abs(tag-(p.lastFlex||0))<.0001)return;
 const attr=p.board.geometry.attributes.position,a=attr.array,b=p.flat;
 for(let i=0;i<a.length;i+=3){
 const x=b[i],y=b[i+1],u=bends[x<0?0:1];
 const tab=clamp((Math.abs(x)-net.W/2+.06)/.22);
 let dz=tab*(.088*u+.14*Math.sin(u*PI));
 if(contact){const dx=x-contact.x,dy=y-contact.y;dz-=p.dent*Math.exp(-(dx*dx+dy*dy)*2.7)}
 a[i+2]=b[i+2]+dz;
 }
 p.lastFlex=tag;attr.needsUpdate=true;
 if(contact&&p.dent<.0002){p.pressSpot=null;p.dent=0}
}
function panelUpdate(dt){
 for(const p of panels){p.angle+= (p.target-p.angle)*(1-Math.exp(-dt*10));
 const s=p.id==='left'?-1:1;const rest=p.ringTime?Math.exp(-p.ringTime*5)*Math.sin(p.ringTime*21)*.026:0;
 flexBoard(p,dt);
 if(p.ringTime){p.ringTime+=dt;if(p.ringTime>1.1)p.ringTime=0}
 if(p.id==='back'){p.o.rotation.x=p.angle+rest;net.awning.rotation.x=-p.angle*.84}
 else p.o.rotation.z=s*(p.angle+rest);
 }
 const back=panels[1];
 for(const p of [panels[0],panels[2]])if(!p.locked&&p.angle>1.52&&back.angle>1.52){p.locked=true;p.ringTime=.001;const other=p===panels[0]?panels[2]:panels[0];if(!other.locked)other.target=Math.max(other.target,.23);sound('snap',.76);paperBits(p.o.localToWorld(vec(p.id==='left'?-2.24:2.24,.10,-.80)))}
 const both=panels[0].locked&&panels[2].locked;if(both)back.locked=true;
 frontAngle+=((both?PI/2:0)-frontAngle)*(1-Math.exp(-dt*5.5));net.front.rotation.x=-frontAngle;
}
function buildReady(){return panels.every(p=>p.locked)}
function nextPart(){return parts.find(p=>!p.installed)}
function assembledNow(){
 assembled=true;rewiring=false;
 tween(tray,trayHome(),qEuler(),.80,()=>sound('rub',.30),.055);
 prizes.forEach(p=>{if(!p.cup&&p.onTray){p.rest.copy(prizeSpot(p));p.onTray=false;tween(p.o,p.rest,qEuler(0,p.restYaw,p.i===2?.92:0),.75,null,.19)}});
}
function installPart(p,side=null){
 if(p.busy||nextPart()!==p||!buildReady())return;
 if(p.id==='ramp'){p.replaced=rewiring;if(side!==null)lowside=side;angle=.41;autoTurn=0}
 if(p.id==='wheel'&&angle===0)angle=.41;
 const [pos,rot]=installedPose(p.id);
 p.busy=true;sound(p.id==='window'?'tick':'rub',.55);
 const lead=pos.clone(),leadRot=rot.clone();
 if(p.id==='window')lead.y+=1.22;
 else if(p.id==='crank')lead.z+=.62;
 else if(p.id==='ramp'){
 const tilt=lowside*.10;leadRot.multiply(qEuler(0,0,tilt));lead.y+=.13;lead.x-=lowside*.057;
 }else{lead.y+=.24;lead.z+=.18}
 tween(p.o,lead,leadRot,.46,()=>{
 sound('rub',.24);
 tween(p.o,pos,rot,.32,()=>{p.installed=true;p.busy=false;sound('snap',.54);
 if(p.id==='window'){if(!assembled)assembledNow();else rewiring=false}});
 },.46);
}
function emptyMachine(){return !pocket&&!queue.length&&!cups.some(c=>c.state==='loading'||c.state==='falling')}
function extract(p){
 if(!emptyMachine()||p.busy||!assembled)return;
 p.installed=false;p.busy=true;rewiring=true;if(p.id==='window')parts[0].replaced=false;sound('rub',.58);
 const [pos,rot]=loosePose(p);
 // Leave the lifted window beside the machine, within reach of the work area.
 if(p.id==='window')pos.set(net.root.position.x+(portrait?2.38:-2.63),.06,net.root.position.z+.02);
 if(p.id==='ramp')pos.set(net.root.position.x+(portrait?-2.1:2.68),.025,net.root.position.z+.53);
 const lifted=p.o.position.clone();
 lifted.y=Math.max(lifted.y,installedPose(p.id)[0].y+(p.id==='window'?1.23:.35));
 tween(p.o,lifted,p.o.quaternion,.29,()=>tween(p.o,pos,rot,.43,()=>{p.busy=false;p.touched=true},.21));
}
function selectPrize(p){
 if(selected&&selected!==p){selected.selected=false;selected.o.position.copy(selected.rest)}
 selected=selected===p?null:p;p.selected=selected===p;p.spin=p.i===2?8:0;sound(p.i===2?'wood':'paper',.32);
 if(!p.selected)p.o.position.copy(p.rest);
}
function attachLocal(parent,o,pos,rot){parent.attach(o);o.position.copy(pos);o.quaternion.copy(rot)}
function putPrize(p,c){
 if(c.state!=='empty'||p.cup||moving(p.o))return;
 if(selected){selected.selected=false;selected=null}
 p.onTray=false;p.selected=false;p.cup=c;c.prize=p;c.state='filling';c.wob=.20;
 const dst=c.root.localToWorld(vec(0,-.12,0));
 tween(p.o,dst,qEuler(0,p.restYaw,p.i===2?1.13:.12),.44,()=>{
 attachLocal(c.root,p.o,vec(0,-.12,0),qEuler(0,p.restYaw,p.i===2?1.13:.12));
 c.state='filled';c.wob=.26;c.cargoTilt=p.i===2?1.13:.12;sound(p.i===2?'wood':'inside',.5);
 },.30);
}
function closeLid(c){
 if(c.state!=='filled')return;c.state='closing';
 tween(c.lid,c.root.position.clone().add(vec(0,.009,0)),c.root.quaternion,.43,()=>{
 attachLocal(c.root,c.lid,vec(0,.005,0),qEuler());c.state='closed';c.wob=.12;
 sound('tick',.83);sound('inside',.25,.046);
 },.28);
}
function queuePos(i){
 const n=net.root.position;return vec(n.x+lowside*(.87-i*.69),n.y+2.145+i*.108,n.z-.31)
}
function loadCup(c){
 if(c.state!=='closed'||!parts[3].installed||rewiring)return;
 c.state='loading';c.onStand=false;c.wob=0;sound('tick',.45);const entry=net.root.position.clone().add(vec(-lowside*.60,2.95,-.08));
 tween(c.root,entry,qEuler(0,0,lowside*1.68),.56,()=>{
 c.state='queued';queue.push(c);c.roll=c.root.rotation.z;c.lag=.16;c.rock=.13;
 sound('drop',.42);sound('inside',.36,.085);queue.forEach((b,i)=>b.rock=.12/(i+1));
 },.32);
}
function crankBy(delta,dt){
 if(!parts[2].installed||!parts[3].installed||Math.abs(delta)<.00001)return;
 // Sample the swept angle. Even a fast drag can transfer only one capsule per revolution.
 const slices=Math.ceil(Math.abs(delta)/.075),inc=delta/slices;
 for(let j=0;j<slices;j++){
 const prev=angle;angle+=inc;const a=((angle%TAU)+TAU)%TAU;
 if(!pocket&&queue.length&&Math.abs(a-.83)<.092&&queue[0].root.position.distanceTo(queuePos(0))<.33){
 pocket=queue.shift();pocket.state='pocket';pocket.capture=0;sound('tick',.70);sound('inside',.33,.063);
 queue.forEach((c,i)=>{c.rock=.21/(i+1);sound('tick',.50/(i+1),.055*(i+1))});
 }
 if(pocket&&Math.cos(a)<-.74){dropCup(pocket);pocket=null}
 if(Math.floor(prev*5/PI)!==Math.floor(angle*5/PI)&&queue.length)sound('tick',.14+Math.min(.28,Math.abs(delta)*.19));
 }
 turnSpeed=Math.max(turnSpeed,Math.abs(delta)/Math.max(.012,dt));
}
function dropCup(c){
 c.state='falling';c.fallTime=0;c.fallFrom=c.root.position.clone();c.fallSide=lowside;c.vx=0;c.vz=0;c.vy=0;c.bounces=0;c.travel=0;
 c.wob=0;if(firstDrop){zoomCup=c;firstDrop=false}
 sound('rub',.42);
}
function fallUpdate(c,dt){
 c.fallTime+=dt;const t=c.fallTime;const n=net.root.position,r=.342;
 if(t<=.49){const k=t/.49;c.root.position.set(lerp(c.fallFrom.x,n.x+c.fallSide*.13,k),lerp(c.fallFrom.y,.49,k)-.06*Math.sin(k*PI),lerp(c.fallFrom.z,n.z+1.36,k));c.root.rotation.z+=c.fallSide*dt*4;}
 else{
 if(!c.travel){c.root.position.set(n.x+c.fallSide*.13,.51,n.z+1.36);c.vx=c.fallSide*1.85;c.vz=1.7;c.vy=-.55;c.travel=1}
 c.vy-=dt*6.2;c.root.position.x+=c.vx*dt;c.root.position.z+=c.vz*dt;c.root.position.y+=c.vy*dt;
 const floor=tray.position.y+.083+r;const xLim=1.36-r,zLim=.65-r;
 if(c.root.position.y<floor){c.root.position.y=floor;if(c.vy<-.26){if(c.bounces===0){traySpeed=-.36;sound('drop',.93);sound('tick',.58,.039);sound('inside',.54,.103)}c.bounces++}c.vy=c.bounces<2?Math.abs(c.vy)*.30:0}
 const dx=c.root.position.x-tray.position.x,dz=c.root.position.z-tray.position.z;
 if(Math.abs(dx)>xLim){c.root.position.x=tray.position.x+Math.sign(dx)*xLim;c.vx=Math.sign(-dx)*Math.abs(c.vx)*.42;sound('tick',Math.min(.5,Math.abs(c.vx)))}
 if(Math.abs(dz)>zLim){c.root.position.z=tray.position.z+Math.sign(dz)*zLim;c.vz=Math.sign(-dz)*Math.abs(c.vz)*.48;sound('tick',Math.min(.48,Math.abs(c.vz)))}
 for(const other of cups){
 if(other===c||other.state!=='tray')continue;
 const sepX=c.root.position.x-other.root.position.x,sepZ=c.root.position.z-other.root.position.z;
 const dist=Math.hypot(sepX,sepZ),gap=2*r-dist;
 if(gap>0&&Math.abs(other.root.position.y-c.root.position.y)<.24){
 const nx=dist>.02?sepX/dist:c.fallSide,nz=dist>.02?sepZ/dist:0;
 c.root.position.x=clamp(c.root.position.x+nx*gap*.71,tray.position.x-xLim,tray.position.x+xLim);
 c.root.position.z=clamp(c.root.position.z+nz*gap*.71,tray.position.z-zLim,tray.position.z+zLim);
 other.trayOff.x=clamp(other.trayOff.x-nx*gap*.34,-xLim,xLim);other.trayOff.z=clamp(other.trayOff.z-nz*gap*.34,-zLim,zLim);
 if(c.vx*nx+c.vz*nz<-.07){sound('tick',Math.min(.75,Math.hypot(c.vx,c.vz)*.4));c.vx+=nx*.55;c.vz+=nz*.55;other.wob=.11}
 }}
 c.vx*=Math.exp(-dt*1.65);c.vz*=Math.exp(-dt*1.52);
 c.root.rotation.z-=c.vx*dt/r;c.root.rotation.x+=c.vz*dt/r;
 if(t>2.08){c.state='tray';c.trayOff=c.root.position.clone().sub(tray.position);c.trayOff.y=r+.083;c.wob=.10;sound('inside',.21)}
 }
 if(c.prize){c.prize.o.rotation.z+=c.fallSide*dt*(c.prize.i===0?.7:c.prize.i===1?2.0:1.45);c.prize.o.position.y=-.099+Math.sin(t*10)*Math.exp(-t)*.045}
}
function openCup(c){
 if(c.state!=='tray')return;c.state='opening';zoomCup=c;autoTurn=0;
 const pos=c.root.position.clone();const spills=c.prize.i===2&&Math.abs(Math.sin(c.prize.o.rotation.z))>.94;sound('rub',.38);
 tween(c.root,pos,qEuler(0,c.rotation0,.07*c.fallSide),.27,()=>{
 const side=(c.trayOff.x>0?-1:1);
 world.attach(c.lid);const lp=pos.clone().add(vec(side*.69,-.29,.06));
 lp.x=clamp(lp.x,tray.position.x-1.03,tray.position.x+1.03);
 tween(c.lid,lp,qEuler(.07,side*.56,side*-.08),.46,()=>{
 c.state='opened';c.lidHome=false;const p=c.prize;
 if(spills){p.spin=5.8;sound('wood',.4)}
 },.38);sound('tick',.64);
 const p=c.prize;world.attach(p.o);
 const pp=pos.clone().add(vec(-side*.04,-.057,.02));
 if(spills){pp.set(clamp(pos.x+side*.42,tray.position.x-1.13,tray.position.x+1.13),tray.position.y+.33,tray.position.z+.43)}
 p.rest.copy(pp);
 tween(p.o,pp,qEuler(0,p.restYaw,p.i===2?.12:.08),.44,null,.10);
 });
}
function finishPrize(p,where){
 const c=p.cup;if(!c||c.state!=='opened')return;
 c.prize=null;p.cup=null;p.onTray=false;c.state='returning';
 const pos=where||prizeSpot(p);p.rest.copy(pos);p.rest.y=p.i===2?.192:.13;
 p.restYaw=p.o.rotation.y+.24;p.spin=p.i===2?4.5:0;
 tween(p.o,p.rest,qEuler(0,p.restYaw,p.i===2?.58:.01),.59,()=>{sound(p.i===2?'wood':'paper',.49);p.settle=.001},.18);
 zoomCup=null;
 tween(c.root,c.home,qEuler(0,c.rotation0,0),.73,()=>{c.state='empty';c.onStand=true;c.wob=.1},.36);
 tween(c.lid,c.coverHome,qEuler(0,c.rotation0,0),.76,()=>{c.lidHome=true},.30);
}
function stepCups(dt){
 const rolling=parts[1].installed;
 if(rolling){parts[1].o.rotation.z=-lowside*angle;if(parts[2].installed)parts[2].o.rotation.z=-lowside*angle}
 for(const c of cups){
 if(c.state==='queued'){
 const index=queue.indexOf(c),to=queuePos(index),before=c.root.position.x;
 c.root.position.lerp(to,1-Math.exp(-dt*(5.4-index*.55)));c.roll-=(c.root.position.x-before)/.342;
 c.rock*=Math.exp(-dt*3);c.root.rotation.set(.08,c.rotation0,c.roll+Math.sin(clockTime*17-index*.83)*c.rock);
 if(c.prize){const fac=c.prize.i===0?.75:c.prize.i===1?1.21:.90;
 const aim=-c.roll*.67+Math.round(c.roll*fac/1.05)*.34;c.prize.o.rotation.z=lerp(c.prize.o.rotation.z,aim,1-Math.exp(-dt*(c.prize.i+2)))}
 }else if(c.state==='pocket'){
 c.capture=Math.min(1,c.capture+dt*4.5);
 const n=net.root.position;const to=vec(n.x+lowside*.815*Math.sin(angle),n.y+1.06+.815*Math.cos(angle),n.z+.48);
 c.root.position.lerp(to,c.capture);c.root.rotation.z=-lowside*angle+c.rotation0;
 }else if(c.state==='falling')fallUpdate(c,dt);
 else if(c.state==='tray'&&!moving(c.root)){c.root.position.copy(tray.position).add(c.trayOff)}
 if(['empty','filled','closed','tray'].includes(c.state)&&!moving(c.root)&&held?.hit.data!==c){
 c.wob*=Math.exp(-dt*3.3);c.root.rotation.z=lerp(c.root.rotation.z,(c.state==='tray'?c.fallSide*.27:c.state==='filled'?.09:0)+Math.sin(clockTime*16)*c.wob,1-Math.exp(-dt*5));
 if(c.state==='tray')c.root.rotation.x*=Math.exp(-dt*2)
 }
 }
 prizes.forEach(p=>{if(p.spin>.025){p.o.rotation.y+=p.spin*dt;p.spin*=Math.exp(-dt*2.3)}
 if(p.settle){p.settle+=dt;
 if(!p.cup&&!moving(p.o)&&!p.selected){const k=Math.exp(-p.settle*5);p.o.rotation.z=(p.i===2?.59:.01)+Math.sin(p.settle*(p.i===1?28:15))*k*(p.i===1?.055:.17);if(p.i===1)p.o.userData.flap.rotation.x=-.24*k*Math.abs(Math.sin(p.settle*19))}
 if(p.settle>1.5)p.settle=0;
 }
 if(p.selected&&!held&&!moving(p.o)){p.o.position.copy(p.rest);p.o.position.y+=.13+.024*Math.sin(clockTime*3)}
 });
}
function eligible(hit){
 const {type,data:d}=hit;
 if(type==='panel')return !d.locked&&d.target<1.565;
 if(type==='part'){
 if(d.busy||!buildReady())return false;
 if(d.installed){if(d.id==='crank')return parts[3].installed&&!parts[3].lift;
 if(d.id==='window')return assembled&&emptyMachine();
 if(d.id==='ramp')return assembled&&!parts[3].installed&&emptyMachine();return false}
 return nextPart()===d;
 }
 if(!assembled)return false;
 if(type==='prize')return (!d.cup||d.cup.state==='opened')&&!moving(d.o);
 if(type==='tray')return !moving(tray);
 if(type==='cup')return !moving(d.root)&&['empty','filled','closed','tray','opened'].includes(d.state);
 if(type==='lid')return !moving(d.lid)&&['empty','filled','closed','tray','opened'].includes(d.state);
 return false;
}
function rayAt(x,y){const r=canvas.getBoundingClientRect();ndc.set((x-r.left)/r.width*2-1,1-(y-r.top)/r.height*2);ray.setFromCamera(ndc,camera)}
function pick(x,y){
 rayAt(x,y);const objs=[];for(const [obj,h] of targetMap)if(eligible(h))objs.push(obj);
 const hits=ray.intersectObjects(objs,true);
 for(const h of hits){let o=h.object;while(o){const hit=targetMap.get(o);if(hit&&eligible(hit))return {hit,point:h.point};o=o.parent}}
 return null;
}
function planePoint(x,y,height){rayAt(x,y);plane.constant=-height;return ray.ray.intersectPlane(plane,vec())}
function screenPoint(v){const q=v.clone().project(camera);return {x:(q.x+1)*canvas.clientWidth/2,y:(1-q.y)*canvas.clientHeight/2}}
function nearOnScreen(x,y,v,radius){
 const p=screenPoint(v),edge=screenPoint(v.clone().addScaledVector(rightDir,radius));return Math.hypot(x-p.x,y-p.y)<Math.max(25,Math.abs(edge.x-p.x));
}
function capAt(x,y){return cups.filter(c=>c.state==='empty').map(c=>({c,p:screenPoint(c.root.position)})).sort((a,b)=>Math.hypot(a.p.x-x,a.p.y-y)-Math.hypot(b.p.x-x,b.p.y-y)).find(v=>nearOnScreen(x,y,v.c.root.position,.61))?.c}
function boundPoint(v){
 const [w,d]=layout.mat;v.x=clamp(v.x,-w/2+.33,w/2-.33);v.z=clamp(v.z,-d/2+.33,d/2-.33);return v;
}
function safeRest(v){
 boundPoint(v);const b=net.root.position;
 if(v.z<b.z+1.30&&Math.abs(v.x-b.x)<1.54)v.x=b.x+(v.x<b.x?-1:1)*1.66;
 if(Math.abs(v.z-tray.position.z)<.82&&Math.abs(v.x-tray.position.x)<1.58)v.z=tray.position.z+.94;
 return boundPoint(v);
}
function onDown(e){
 if(held||e.button>0)return;wakeSound();
 const found=pick(e.clientX,e.clientY);if(!found)return;
 const {hit,point}=found,d=hit.data;lastTouch=clockTime;demonstration=0;hintPad.visible=false;
 const c=hit.type==='cup'||hit.type==='lid'?d:null;
 let object=hit.o;if(c&&(c.state==='closed'||c.state==='tray'))object=c.root;
 const h=held={id:e.pointerId,hit,object,point,sx:e.clientX,sy:e.clientY,lx:e.clientX,ly:e.clientY,moved:false,started:clockTime,lastTime:clockTime,base:object.position.clone(),baseQ:object.quaternion.clone(),height:object.position.y,amount:0};
 h.startPlane=planePoint(e.clientX,e.clientY,h.height)||point.clone();
 canvas.setPointerCapture(e.pointerId);
 if(hit.type==='panel'){
 d.pressSpot=d.board.worldToLocal(point.clone());d.dent=.035+.019*(e.pressure||.4);h.angle=d.angle;d.target=clamp(d.angle+.13,0,PI/2);d.angle=d.target;sound('paper',.48);
 }else if(hit.type==='part'&&d.installed&&d.id==='crank'){
 h.wasTurning=autoTurn>.001;autoTurn=0;h.hub=screenPoint(installedPose('crank')[0]);h.arc=Math.atan2(e.clientY-h.hub.y,e.clientX-h.hub.x);
 sound('rub',.18);
 }else if(hit.type==='part'){
 sound(d.id==='window'?'tick':'paper',.29);if(!d.installed){h.object.position.y+=.055;h.side=point.x<d.o.position.x?1:-1}
 }else if(hit.type==='cup'||hit.type==='lid'){
 c.wob=.17;if(c.state==='empty')sound('tick',.23);
 }else if(hit.type==='prize'){h.object.position.y+=.045;sound(d.i===2?'wood':'paper',.28)}
}
function onMove(e){
 if(!held){if(e.pointerType==='mouse')canvas.style.cursor=pick(e.clientX,e.clientY)?'grab':'default';return}
 if(e.pointerId!==held.id)return;e.preventDefault();
 const h=held,d=h.hit.data,x=e.clientX,y=e.clientY,mx=x-h.sx,my=y-h.sy,dt=Math.max(.012,clockTime-h.lastTime);
 if(Math.hypot(mx,my)>5)h.moved=true;
 if(!h.moved)return;lastTouch=clockTime;canvas.style.cursor='grabbing';
 const at=planePoint(x,y,h.height)||h.startPlane,delta=at.clone().sub(h.startPlane);
 if(h.hit.type==='panel'){
 const sign=d.id==='left'?1:-1;
 const motion=d.id==='back'?(-my*.64+Math.abs(mx)*.20):(-my*.57+mx*sign*.77);
 const distance=Math.max(72,Math.min(canvas.clientWidth,canvas.clientHeight)*.255);
 d.target=clamp(h.angle+.13+motion/distance*1.9,0,PI/2);
 if(d.id==='back'&&!panels.some(p=>p!==d&&p.target>1.35))d.target=Math.min(d.target,1.19);
 d.dent=.023+clamp(Math.abs(motion)/130)*.037;d.angle=d.target;if(clockTime-flushTime>.14){sound('rub',clamp(Math.hypot(x-h.lx,y-h.ly)/28,.10,.6));flushTime=clockTime}
 }else if(h.hit.type==='part'){
 if(d.installed&&d.id==='crank'){const a=Math.atan2(y-h.hub.y,x-h.hub.x);let diff=a-h.arc;if(diff>PI)diff-=TAU;if(diff< -PI)diff+=TAU;
 const dist=Math.hypot(x-h.hub.x,y-h.hub.y);if(dist<11)diff=(x-h.lx-(y-h.ly))*.014;
 crankBy(clamp(diff*lowside,-.5,.5),dt);h.arc=a;
 }else if(d.installed&&d.id==='window'){
 d.lift=clamp((h.base.y-installedPose('window')[0].y)-my/canvas.clientHeight*8.0,0,2.03);d.o.position.y=installedPose('window')[0].y+d.lift;
 }else if(d.installed&&d.id==='ramp'){
 d.o.position.y=h.base.y+clamp(-my/canvas.clientHeight*5.1,0,.55);
 }else{
 d.touched=true;h.object.position.copy(boundPoint(h.base.clone().add(delta)));h.object.position.y=h.base.y+.19+clamp(-my/canvas.clientHeight,0,.85);
 const target=installedPose(d.id)[0];
 if(nearOnScreen(x,y,target,1.30)){const q=installedPose(d.id)[1];h.object.quaternion.slerp(q,.22);h.object.position.y=lerp(h.object.position.y,target.y+.26,.72)}
 }
 }else if(h.hit.type==='tray'){
 const previous=tray.position.clone();trayShift=clamp(h.base.x+delta.x-net.root.position.x,-.64,.64);tray.position.x=net.root.position.x+trayShift;
 const dx=tray.position.x-previous.x;for(const c of cups)if(c.state==='opened'){c.root.position.x+=dx;c.lid.position.x+=dx;c.prize.o.position.x+=dx;c.prize.rest.x+=dx}
 }else if(h.hit.type==='prize'){
 d.o.position.copy(boundPoint(h.base.clone().add(delta)));d.o.position.y=h.base.y+.20;d.o.rotation.z=lerp(d.o.rotation.z,-delta.x*.12,.12);
 }else if(h.hit.type==='cup'||h.hit.type==='lid'){
 const c=d;
 if(c.state==='tray'){
 c.root.rotation.z=h.baseQ.clone().angleTo(new T.Quaternion())*.06+mx*.014;
 if(c.lid.parent===c.root){c.lid.rotation.y=mx*.015;c.lid.position.y=clamp(-my*.002,0,.13)}
 }else if(c.state==='closed'||c.state==='empty'||(c.state==='filled'&&h.hit.type==='lid')){
 h.object.position.copy(boundPoint(h.base.clone().add(delta)));h.object.position.y=h.base.y+.14;
 if(c.state==='closed'){c.root.rotation.z-= (x-h.lx)*.009;c.prize.o.rotation.z+=(x-h.lx)*(c.prize.i===1?.005:.002)}
 }
 }
 h.lx=x;h.ly=y;h.lastTime=clockTime;
}
function endInteraction(e,cancelled=false){
 const h=held;if(!h||h.id!==e.pointerId)return;
 const d=h.hit.data,x=e.clientX,y=e.clientY,tap=!h.moved&&!cancelled;
 held=null;lastTouch=clockTime;if(canvas.hasPointerCapture(e.pointerId))canvas.releasePointerCapture(e.pointerId);canvas.style.cursor='grab';
 if(h.hit.type==='panel'){
 if(tap){const supported=panels.some(p=>p!==d&&p.target>1.37);
 d.target=d.id==='back'&&!supported?1.10:PI/2;sound('paper',.64)}
 else if(!cancelled&&d.angle>1.41)d.target=PI/2;else d.target=d.angle;
 if(d.id!=='back'&&d.target>1.5&&panels[1].target>1&&panels[1].target<1.2)panels[1].target=PI/2;
 }else if(h.hit.type==='part'){
 if(d.installed){
 if(d.id==='crank'){if(tap&&!h.wasTurning){autoTurn=pocket?((PI-angle%TAU+TAU)%TAU)+.11:TAU+.01;if(!queue.length&&!pocket)autoTurn=TAU*.55;sound('rub',.36)}}
 else if(d.id==='window'){if(tap||(!cancelled&&d.lift>.89)){d.lift=0;extract(d)}}
 else if(d.id==='ramp'){if(tap||(!cancelled&&h.moved))extract(d)}
 }else{
 const target=installedPose(d.id)[0],close=nearOnScreen(x,y,target,1.80);
 if(!cancelled&&(tap||close)){
 let side=null;if(d.id==='ramp'){side=tap?(rewiring?-lowside:h.side):(h.object.position.x>net.root.position.x?-1:1)}
 installPart(d,side);
 }else if(!h.moved)h.object.position.copy(h.base);
 }
 }else if(h.hit.type==='prize'){
 if(d.cup&&d.cup.state==='opened'){
 if(!cancelled){let pos=null;if(h.moved){pos=safeRest(d.o.position.clone())}finishPrize(d,pos)}
 }else if(tap){d.o.position.copy(h.base);selectPrize(d)}
 else{const c=!cancelled&&capAt(x,y);if(c)putPrize(d,c);else{d.rest.copy(safeRest(d.o.position));d.rest.y=d.i===2?.19:.13;d.o.position.copy(d.rest);d.restYaw=d.o.rotation.y;d.onTray=false;d.settle=.001;if(d.i===2)d.spin=clamp((Math.abs(x-h.sx)+Math.abs(y-h.sy))*.07,1,9);d.selected=false;if(selected===d)selected=null}}
 }else if(h.hit.type==='tray'){if(tap){traySpeed=-.075;sound('paper',.32)}}
 else{
 const c=d;
 if(c.state==='tray'){if(!cancelled&&(tap||Math.hypot(x-h.sx,y-h.sy)>13))openCup(c)}
 else if(c.state==='opened'){if(tap)finishPrize(c.prize,null)}
 else if(c.state==='empty'){
 if(tap&&selected)putPrize(selected,c);
 else if(h.moved){if(h.hit.type==='lid'){safeRest(c.lid.position);c.lid.position.y=.012;c.lidHome=false}else{safeRest(c.root.position);c.root.position.y=.339;c.onStand=false}}
 }else if(c.state==='filled'){
 if(!cancelled&&(tap||(h.hit.type==='lid'&&nearOnScreen(x,y,c.root.position,.67))))closeLid(c);
 else if(h.hit.type==='lid'&&h.moved)c.lid.position.y=.006;
 }else if(c.state==='closed'){
 const top=net.root.position.clone().add(vec(0,2.42,0));
 if(!cancelled&&(tap||nearOnScreen(x,y,top,1.70)))loadCup(c);
 else if(h.moved){safeRest(c.root.position);c.onStand=false;c.root.position.y=.345;c.wob=.23}
 }
 }
}
canvas.addEventListener('pointerdown',onDown);canvas.addEventListener('pointermove',onMove);
canvas.addEventListener('pointerup',e=>endInteraction(e));canvas.addEventListener('pointercancel',e=>endInteraction(e,true));
canvas.addEventListener('contextmenu',e=>e.preventDefault());
const hintLight=new T.PointLight(0xffdd9e,0,1.9,2);scene.add(hintLight);
// A translucent contact impression demonstrates a single fingertip gesture without a hand model.
const hintPad=group(world);
const padMat=new T.MeshPhysicalMaterial({color:0xffeee0,transparent:true,opacity:.31,roughness:.39,depthWrite:false});
const pad=ball(hintPad,.145,padMat,0,.07,0,.84,.43,1.17);pad.castShadow=false;
const padContact=contact(hintPad,.36,.40,0,.003,0,.65);
function hintTarget(){
 if(!buildReady())return panels.find(p=>p.target<1.49&&!p.locked)?.hit;
 if(!assembled||rewiring){if(rewiring&&parts[0].installed&&!parts[3].installed&&!parts[3].busy&&!parts[0].busy&&!parts[0].replaced)return parts[0].hit;return nextPart()?.hit}
 const opened=cups.find(c=>c.state==='opened');if(opened)return opened.prize.hit;
 const landed=cups.find(c=>c.state==='tray');if(landed)return landed.hit;
 if(cups.some(c=>['falling','opening','loading','returning','closing','filling'].includes(c.state)))return null;
 if(selected)return cups.find(c=>c.state==='empty')?.hit;
 const filled=cups.find(c=>c.state==='filled');if(filled)return filled.lidHit;
 const closed=cups.find(c=>c.state==='closed');if(closed)return closed.hit;
 if(queue.length||pocket)return parts[2].hit;
 return prizes.find(p=>!p.cup)?.hit;
}
function showHint(dt){
 const hit=hintTarget(),idle=clockTime-lastTouch;
 if(held||!hit||!eligible(hit)||moving(hit.o)){hintLight.intensity=0;hintPad.visible=false;return}
 if(hit!==lastHint){demonstration=0;lastHint=hit}
 const d=hit.data;let start=hit.o.getWorldPosition(vec()),end=start.clone();
 if(hit.type==='panel'){start=panelPos(d);const to=d.id==='back'?vec(0,1.84,.64):vec(d.id==='left'?.90:-.90,1.54,0);end.copy(start).add(to)}
 else if(hit.type==='part'){
 if(d.id==='crank'&&d.installed){start=d.o.localToWorld(vec(0,.54,.73));end.copy(start)}
 else if(d.installed){start.y+=d.id==='window'?.89:.18;end.copy(start).add(vec(0,.70,0))}
 else{start.y+=d.id==='crank'?.40:.17;end.copy(installedPose(d.id)[0]).add(vec(0,.18,0))}
 }else if(hit.type==='prize'){start.y+=.13;const c=cups.find(c=>c.state==='empty');if(d.cup)end.copy(prizeSpot(d));else if(c)end.copy(c.root.position).add(vec(0,.25,0))}
 else if(hit.type==='lid'){start.y+=.34;end.copy(d.root.position).add(vec(0,.28,0))}
 else if(hit.type==='cup'){start.y+=.15;if(d.state==='closed')end.copy(net.root.position).add(vec(0,2.88,0));else end.copy(start).add(vec(0,.20,0))}
 const pulse=.5+.5*Math.sin(clockTime*2.65);
 hintLight.position.copy(start).add(vec(0,.32,.04));hintLight.intensity=.25+.64*pulse;
 hintPad.visible=false;if(idle<4.05)return;
 demonstration+=dt;const cycle=demonstration%3.45;if(cycle>2.36)return;
 const k=clamp((cycle-.35)/1.30);const ease=k*k*(3-2*k);
 hintPad.visible=true;hintPad.position.lerpVectors(start,end,ease);hintPad.position.y+=.025+.15*Math.sin(ease*PI);
 if(hit.type==='part'&&d.id==='crank'&&d.installed){const theta=angle+ease*2.95;hintPad.position.copy(installedPose('crank')[0]).add(vec(lowside*Math.sin(theta)*.54,Math.cos(theta)*.54,.75))}
 const alpha=Math.min(clamp(cycle/.3),clamp((2.36-cycle)/.44));padMat.opacity=.35*alpha;padContact.material.opacity=.30*alpha;hintPad.scale.setScalar(.85+alpha*.15);
}
function shadows(){
 underTray.position.set(tray.position.x,-.011,tray.position.z);
 underParts.forEach((o,i)=>{const part=parts[i];o.visible=!part.installed&&!part.busy;if(o.visible){o.position.set(part.o.position.x,-.013,part.o.position.z);o.material.opacity=.52/(1+Math.max(0,part.o.position.y-.15)*2)}});
 underPrizes.forEach((o,i)=>{const p=prizes[i];o.visible=!p.cup;if(o.visible)o.position.set(p.o.position.x,p.onTray?.092:-.007,p.o.position.z)});
 underLids.forEach((o,i)=>{const c=cups[i];o.visible=c.lid.parent===world&&!moving(c.lid)&&c.state!=='opened';if(o.visible)o.position.set(c.lid.position.x,-.01,c.lid.position.z)});
}
let oldTime=null;
function animate(now){
 const dt=oldTime===null?.016:Math.min(.04,(now-oldTime)/1000);oldTime=now;clockTime+=dt;
 stepTweens(dt);panelUpdate(dt);
 if(autoTurn>.0001){const inc=Math.min(autoTurn,dt*3.20);crankBy(inc,dt);autoTurn-=inc}
 stepCups(dt);traySpeed+=(-traySpring*102-traySpeed*7.4)*dt;traySpring+=traySpeed*dt;tray.scale.y=1+traySpring*2.2;
 if(assembled&&!moving(tray))tray.position.y=.004+traySpring*.13;
 for(let i=particles.length-1;i>=0;i--){const b=particles[i];b.life-=dt;b.v.y-=dt*2.9;b.o.position.addScaledVector(b.v,dt);b.o.rotation.z+=dt*3;if(b.o.position.y<.015)b.o.position.y=.015;if(b.life<0){world.remove(b.o);b.o.geometry.dispose();particles.splice(i,1)}}
 driveAudio(dt);shadows();scene.updateMatrixWorld(true);showHint(dt);fitCamera(dt);
 lightTravel.value=Math.sin(clockTime*.033)*.36;scene.environmentRotation.y=Math.sin(clockTime*.025)*.065;
 sun.position.x=-6+Math.sin(clockTime*.045)*.32;sun.position.z=-4.3+Math.sin(clockTime*.035)*.16;
 renderer.render(scene,camera);
}
setLayout(true);window.addEventListener('resize',()=>setLayout());
document.addEventListener('visibilitychange',()=>{oldTime=null;if(document.hidden){if(audio)audio.suspend().catch(()=>{});autoTurn=0}else if(audio&&audio.state==='suspended')audio.resume().catch(()=>{})});
renderer.setAnimationLoop(animate);
