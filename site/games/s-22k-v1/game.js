'use strict';
const screenCanvas=renderer.domElement,ray=new T.Raycaster(),pointer=new T.Vector2(),ground=new T.Plane(V(0,1,0),0);
ray.params.Line.threshold=.038;
const world=(g,x=0,y=0,z=0)=>{g.updateWorldMatrix(true,false);return g.localToWorld(V(x,y,z))};
const local=(g,p)=>{g.updateWorldMatrix(true,false);return g.worldToLocal(p.clone())};
const tauEase=(dt,rate)=>1-Math.exp(-rate*dt);
let dt=0,time=0,lastFrame=0,lastTouch=0,phase='flour',drag=null,sheet=null,cutCount=0,portrait=false;
let batch=0,saved=[],noodles=[],waterLeft=1,pourPoint=V(),waterRunning=false,saltDissolved=0;
let netLoaded=false,visitedPot=false,netSweep=V(),serveAngle=0,selectedGarnish=null;
let camLook=V(),camGoal=V(),camEye=V(),camOffset=V(),lookGoal=V(),cameraReady=false;
let restCup=V(),restJug=V(),restSalt=V(),restServe=V(),restNet=V(),anim=null,discardedAt=V();
let foldReady=false,stationReady=false,flight=[],lastSound=0,dustTick=0;
const noodleParent=group(scene),progressLight=new T.PointLight('#ffe6a8',.56,2.0);
scene.add(progressLight);
const touchGuide=group(scene),guideMat=new T.MeshPhysicalMaterial({color:'#fff5de',transparent:true,opacity:.26,roughness:.25,depthWrite:false});
const guideDome=ball(touchGuide,0,0,0,.105,.16,.102,guideMat);guideDome.rotation.z=-.29;guideDome.castShadow=false;
touchGuide.visible=false;
function glide(duration,update,done){
 anim={duration,elapsed:0,update,done};update(0,0)
}
function setPhase(s){phase=s;lastTouch=time;touchGuide.visible=false}
function held(){return noodles.filter(n=>n.state==='net')}
function swimming(){return noodles.filter(n=>n.state==='pot')}
function orientToBoard(o){o.rotation.y=board.rotation.y}
function pinRest(){
 pin.position.copy(world(board,-.29,BOARD+.233,-1.17));pin.rotation.set(0,board.rotation.y+.045,0)
}
function knifeRest(){
 knife.position.copy(world(board,2.12,BOARD+.109,-.034));knife.rotation.set(-.016,board.rotation.y-.015,-.065)
}
function layout(){
 const w=screenCanvas.clientWidth||innerWidth,h=screenCanvas.clientHeight||innerHeight;
 portrait=w/h<.86;renderer.setPixelRatio(Math.min(devicePixelRatio||1,portrait?1.8:1.65));renderer.setSize(w,h,false);camera.aspect=w/h;camera.updateProjectionMatrix();
 mixing.position.set(portrait?-.12:-2.68,0,portrait?2.39:1.64);
 board.position.set(portrait?.67:2.32,0,portrait?-1.18:.96);board.rotation.y=portrait?-.052:-.091;board.scale.setScalar(portrait?.84:1);
 pot.position.set(portrait?1.35:3.14,0,portrait?-4.44:-2.68);
 restJug.set(portrait?-2.12:-1.35,0,portrait?.25:-1.67);restSalt.set(portrait?-2.31:-.37,0,portrait?-.67:-1.10);
 restCup.copy(world(mixing,-1.58,1.00,-.40));restServe.set(portrait?-1.72:-4.06,0,portrait?-3.95:-2.41);
 toppings.position.set(portrait?-2.03:.41,0,portrait?-2.24:-3.29);toppings.rotation.y=portrait?1.37:.13;
 mats[0].position.set(portrait?2.31:-5.31,0,portrait?1.12:-.35);mats[1].position.set(portrait?-1.72:-4.06,0,portrait?-3.95:-2.41);
 if(batch>0)mats[0].position.copy(matStation(0));
 if(!batch)mats[1].visible=true;
 if(!anim){
  cup.position.copy(phase==='flour'?restCup:world(mixing,-1.89,.12,-1.06));
  jug.position.copy(restJug);salt.position.copy(restSalt)
 }
 serving.g.position.copy(restServe);
 if(stationReady){
  mixing.position.copy(mixingAside());cup.position.copy(world(mixing,-1.89,.12,-1.06));
  serving.g.position.copy(servingStation());toppings.position.copy(garnishStation());toppings.rotation.y=.055;
  if(batch<2)mats[batch].position.copy(matStation(batch))
 }
 saved.forEach((s,i)=>s.g.position.copy(mats[i].position).y=.094);
 restNet.copy(world(pot,.66,1.63,.42));net.position.copy(restNet);net.rotation.set(-.09,-.40,.08);
 if(phase==='cook'){net.position.copy(world(pot,netSweep.x,waterY-.14,netSweep.z))}
 if(phase==='cut'&&held().length){net.position.copy(world(board,-1.40,BOARD+.36,2.13));net.rotation.set(.06,0,-.09)}
 pinRest();knifeRest();
 if(['roll','fold'].includes(phase)){pin.position.copy(world(board,0,BOARD+.65,-.36));orientToBoard(pin)}
 if(phase==='compare')comparisonLayout();scene.updateMatrixWorld(true);aimCamera();if(!cameraReady){camera.position.copy(camEye);camLook.copy(lookGoal);camera.lookAt(camLook);cameraReady=true}
}
function aimCamera(){
 const a=camera.aspect;
 if(phase==='compare'||phase==='garnishDrag'&&batch===2){
 lookGoal.copy(mats[0].position).lerp(mats[1].position,.5);lookGoal.y=.58;camOffset.set(.32,4.55,4.20).multiplyScalar(portrait?1.77:1.14)
 }else if(['cook','immersing','lifting'].includes(phase)){
 lookGoal.copy(pot.position).add(V(0,1.21,.04));camOffset.set(1.15,3.58,4.61).multiplyScalar(portrait?1.89:1.10)
 }else if(['garnish','garnishDrag','park','deliver','carrying'].includes(phase)){
 let target=serving.g.position.clone().lerp(toppings.position,phase==='carrying'?.09:.20);
 if(batch<2)target.lerp(mats[batch].position,.18);
 lookGoal.copy(target).add(V(0,.44,0));camOffset.set(.38,5.3,5.7).multiplyScalar(portrait?1.72:1.10)
 }else if(['roll','fold','folding','cut','cutting','peel','boardReturn'].includes(phase)){
 lookGoal.copy(board.position).add(V(0,.36,0));camOffset.set(.32,6.00,5.29).multiplyScalar(portrait?1.99:1.10)
 }else if(['water','mix','lift','transfer','saltwater'].includes(phase)){
 lookGoal.copy(mixing.position).add(V(0,.70,-.17));camOffset.set(.46,6.17,5.56).multiplyScalar(portrait?1.85:1.06)
 }else{
 lookGoal.set(portrait?0:-.02,portrait?.53:.56,portrait?-.96:-.16);
 camOffset.set(portrait?.64:1.05,portrait?16.3:8.73,portrait?12.55:11.32);
 if(!portrait)camOffset.multiplyScalar(Math.max(1,1.40/a))
 }
 camEye.copy(lookGoal).add(camOffset)
}
let ac,noise,wake;
function audioStart(){
 if(!ac){const Audio=window.AudioContext||window.webkitAudioContext;if(!Audio)return;
 ac=new Audio();noise=ac.createBuffer(1,ac.sampleRate,ac.sampleRate);const data=noise.getChannelData(0);let brown=0;for(let i=0;i<data.length;i++){brown=(brown+.08*(Math.random()*2-1))/1.023;data[i]=brown*2.8+.23*(Math.random()*2-1)}
 const b=ac.createBufferSource(),f=ac.createBiquadFilter(),g=ac.createGain();b.buffer=noise;b.loop=true;f.type='lowpass';f.frequency.value=620;g.gain.value=.011;b.connect(f).connect(g).connect(ac.destination);b.start();
 }if(ac.state==='suspended')ac.resume().catch(()=>{})
}
function sound(type,force=.6,pitch=1){
 if(!ac)return;let now=ac.currentTime;
 const s=ac.createGain(),dur=({grain:.26,wood:.11,wet:.19,water:.24,cut:.09,roll:.16,drop:.22,china:.45})[type]||.17;
 s.gain.setValueAtTime(.0001,now);s.gain.exponentialRampToValueAtTime(Math.max(.003,.105*force),now+.009);s.gain.exponentialRampToValueAtTime(.0001,now+dur);
 s.connect(ac.destination);
 let source;if(['drop','china','wet'].includes(type)){
 source=ac.createOscillator();source.type='sine';const freq=type==='drop'?650:type==='china'?880:148;source.frequency.setValueAtTime(freq*pitch,now);source.frequency.exponentialRampToValueAtTime(freq*pitch*(type==='drop'?.57:.85),now+dur)
 }else{
 source=ac.createBufferSource();source.buffer=noise;source.loop=true;const f=ac.createBiquadFilter();f.type=type==='wood'||type==='cut'?'bandpass':'lowpass';f.frequency.value=({grain:3400,roll:700,cut:1460,wood:610,water:2400}[type]||900)*pitch;f.Q.value=type==='cut'?1.4:.68;source.connect(f);f.connect(s)
 }
 if(['drop','china','wet'].includes(type))source.connect(s);source.start(now);source.stop(now+dur+.01);source.onended=()=>{source.disconnect();s.disconnect()}
}
function brushSound(type,pitch){if(time-lastSound>.105){sound(type,.40+rand()*.19,pitch);lastSound=time}}
const specks=[],speckGeo=new T.IcosahedronGeometry(1,0);
const dropsMat=mat('#c5d8cc',.13,{metalness:.28}),powderSpeck=mat('#fff2d9',.95);
for(let i=0;i<115;i++){let o=mesh(speckGeo,powderSpeck,scene);o.visible=false;o.castShadow=false;specks.push({o,life:0,v:V(),floor:0})}
function particles(point,count,water=false,strength=1,floor=.08){
 for(let i=0;i<count;i++){let d=specks.find(p=>p.life<=0);if(!d)break;let r=(water?.022:.016)*(.45+rand());d.o.material=water?dropsMat:powderSpeck;d.o.scale.set(r,water?r*1.6:r,r);d.o.position.copy(point).add(V((rand()-.5)*.09,rand()*.04,(rand()-.5)*.08));d.o.visible=true;d.life=.25+rand()*.5;d.floor=floor;d.v.set((rand()-.5)*strength,.12+rand()*strength,(rand()-.5)*strength)}
}
const stream=mesh(new T.CylinderGeometry(1,1,1,12),dropsMat,scene);stream.visible=false;
function flow(a,b,r,m){
 const diff=b.clone().sub(a);stream.visible=true;stream.material=m;stream.position.copy(a).lerp(b,.5);stream.scale.set(r,diff.length(),r*.76);stream.quaternion.setFromUnitVectors(V(0,1,0),diff.normalize())
}
const ripples=[];
function ripple(parent,x,y,z,s=.45){
 let m=new T.MeshBasicMaterial({color:'#f6e9c1',transparent:true,opacity:.25,depthWrite:false});
 const o=ring(parent,.16,.006,y,m,x,z);o.castShadow=o.receiveShadow=false;ripples.push({o,t:0,s})
}
function fillFlour(){
 setPhase('flourPour');const start=cup.position.clone(),hit=world(mixing,dustCenter.x,.37,dustCenter.z);
 sound('grain',.8,1.24);
 glide(1.65,(k)=>{
 const tilt=Math.sin(Math.min(1,k/.82)*PI/2);cup.rotation.z=-.97*tilt;cup.position.copy(start).add(V(.10*tilt,.46*tilt,0));
 flourLevel=smooth(clamp(k/.80));cupFlour.scale.set(1-flourLevel*.9,1-flourLevel*.9,1-flourLevel*.9);cupFlour.visible=flourLevel<.985;redrawPowder();
 if(k>.045&&k<.80){const tip=world(cup,.86,.68,0),end=hit.clone();end.y=.35+flourLevel*.67;flow(tip,end,.072*Math.sin(k/.80*PI)+.018,flourMaterial);particles(tip,2,false,.27,.85);particles(end,2,false,.77,.52)}
 else stream.visible=false;
 if(k>.80){let t=smooth((k-.80)/.20);cup.position.lerp(world(mixing,-1.89,.12,-1.06),t);cup.rotation.z*=(1-t)}
 },()=>{setPhase('salt')})
}
function salting(){
 const from=salt.position.clone(),to=world(jug,.04,1.63,0);setPhase('salting');glide(.92,(t)=>{
 let k=smooth(clamp(t/.50));salt.position.copy(from).lerp(to,k);salt.position.y+=Math.sin(k*PI)*.36;salt.rotation.z=-1.45*clamp((t-.32)/.35);
 saltPile.scale.y=.085*(1-clamp((t-.48)/.30));crystals.visible=t<.58;
 if(t>.48&&t<.74)particles(world(jug,0,1.57,0),3,false,.15,1.22);
 if(t>.76){let s=smooth((t-.76)/.24);salt.position.lerp(restSalt,s);salt.rotation.z*=1-s}
 },()=>{sound('china',.25,1.26);setPhase('shake')})
}
const saltInWater=group(jug);for(let i=0;i<21;i++){let a=rand()*TAU,r=.26*Math.sqrt(rand());mesh(saltGeo,flourMaterial,saltInWater,r*Math.cos(a),1.266+rand()*.016,r*Math.sin(a))}saltInWater.visible=false;
function shakeJug(amount){
 if(phase!=='shake')return;
 saltDissolved=clamp(saltDissolved+amount);saltInWater.scale.setScalar(1-saltDissolved*.9);saltInWater.position.y=saltDissolved*1.12;jug.rotation.z=Math.sin(time*21)*.12;brushSound('water',1.13);
 if(saltDissolved>=.995){jug.rotation.z=0;saltInWater.visible=false;setPhase('water')}
}
function waterStep(dt){
 let vol=Math.min(waterLeft,dt*.345);waterLeft-=vol;
 const target=world(mixing,pourPoint.x,.80,pourPoint.z),pos=target.clone().add(V(-.68,.87,.05));jug.position.lerp(pos,tauEase(dt,12));jug.rotation.z=lerp(jug.rotation.z,-.99,tauEase(dt,12));
 wetAt(pourPoint.x,pourPoint.z,vol*16);jugWater.position.y=.31+.94*waterLeft;jugWater.scale.setScalar(.8+.2*waterLeft);
 const end=target.clone();end.y=bowlFloor(pourPoint.x,pourPoint.z)+.63*(1-clamp(Math.hypot(pourPoint.x,pourPoint.z)/1.1));
 flow(world(jug,.64,1.57,0),end,.033+.006*Math.sin(time*37),dropsMat);if(time-dustTick>.07){particles(end,2,true,.58,end.y-.025);dustTick=time}brushSound('water',.92);
 if(waterLeft<.0001){stream.visible=false;waterRunning=false;setPhase('saltwater');let start=jug.position.clone();glide(.60,t=>{jug.position.copy(start).lerp(restJug,smooth(t));jug.rotation.z=-.99*(1-t)},()=>{setPhase('mix')})}
}
function moveLump(p,strength){
 let hit=local(mixing,p),r=Math.hypot(hit.x,hit.z);if(r>1.07){hit.x*=1.07/r;hit.z*=1.07/r}
 const before=collected;let left=kneadAt(hit.x,hit.z,strength);brushSound(lumpMoisture>.35||left>.44?'wet':'grain',1.05-left*.27);
 if(left-before>.003)particles(world(mixing,hit.x,lump.position.y+.08,hit.z),3,false,.69,bowlFloor(hit.x,hit.z));
 if(left>.91){previousDust={x:hit.x,z:hit.z};setPhase('lift');if(drag)drag.readyLift=false}
}
function transferDough(){
 setPhase('transfer');sheet=new Sheet();sheet.parts[0].o.visible=false;const start=world(powderGroup,lump.position.x,lump.position.y,lump.position.z),end=world(board,0,BOARD+.14,0);powderGroup.remove(lump);scene.add(lump);
 sound('wet',.7,.74);glide(1.2,t=>{const v=smooth(t);lump.position.copy(start).lerp(end,v);lump.position.y+=1.7*Math.sin(v*PI);lump.scale.set(1-.12*Math.sin(t*PI),1+.37*Math.sin(t*TAU),1-.08*Math.sin(t*PI))},()=>{
 lump.visible=false;powderGroup.add(lump);sheet.parts[0].o.visible=true;pin.position.copy(world(board,0,BOARD+.64,-.32));orientToBoard(pin);sound('wood',.48,.8);setPhase('roll')
 })
}
function rolling(p,delta,force){
 let v=local(board,p),x=clamp(v.x,sheet.min-.19,sheet.max+.19),z=clamp(v.z,-1.55,1.48);
 sheet.roll(x,z,delta.x,delta.z,force);let a=sheet.sample(sheet.atX(x),.5);
 pin.position.copy(world(board,x,BOARD+a.h+.205,z));orientToBoard(pin);pin.rotation.x+=delta.z*2.3;brushSound('roll',.7+(.53-a.h)*2.6);
 if(sheet.strokes>2.7)foldReady=true
}
function finishFold(fraction){
 setPhase('folding');sheet.crease=clamp(fraction,.43,.78);pinRest();let start=sheet.fold;glide(.72,t=>{
 sheet.fold=lerp(start,1,smooth(t));sheet.update()
 },()=>{sound('wet',.37,.80);setPhase('cut')})
}
function cutAt(x){
 x=clamp(x,sheet.min+.026,sheet.max-.026);
 let bladeX=x,part=sheet.parts.find(p=>{let a=sheet.sample(p.lo,.5).x+p.spread,b=sheet.sample(p.hi,.5).x+p.spread;return x>=a&&x<=b});
 if(part)bladeX=x-part.spread;
 const top=world(board,x,BOARD+.39,-.08),bottom=world(board,x,BOARD+.029,-.08);
 knife.position.copy(top);orientToBoard(knife);setPhase('cutting');
 let did=false;glide(.54,t=>{let k=smooth(clamp(t/.36));knife.position.copy(top).lerp(bottom,k);
 if(t>.23&&!did){sheet.hit.set(bladeX,0,0);sheet.indent=.92;sheet.update();did=true}
 if(t>.35&&did===true){let parts=sheet.cut(bladeX);if(parts)cutCount++;did=2;sound('cut',.83,.9+rand()*.2)}
 if(t>.47){knife.position.y+=.36*smooth((t-.47)/.53);sheet.indent*=.8}
 },()=>{sheet.indent=0;sheet.update();knifeRest();setPhase('cut')})
}
function netPath(n,t){
 const k=n.length*(t-.5),layer=n.layer;
 const crease=(1-clamp(n.heat))*.103*Math.exp(-((t-n.crease)**2)/.012);
 const x=crease+Math.sin(t*TAU*.76+n.seed)*.18+(layer%4-1.5)*.105,z=k*.68+.095*Math.sin(n.seed);
 const r=Math.hypot(x,z),broad=clamp(n.width/.75);
 const basket=-.29*(1-clamp((r/.685)**2));
 const height=lerp(basket,.035,broad)+.043+.030*layer+.023*Math.cos(k*4)-Math.max(0,r-.66)*(.36+.32*broad);
 return world(net,x,height,z)
}
function peel(p){
 if(!p||!sheet.parts.includes(p))return;
 setPhase('peel');let n=makeNoodle(sheet.noodle(p));noodles.push(n);n.state='peeling';n.layer=held().length;
 const origin=t=>{let v=sheet.sample(n.u,t);return world(board,v.x+p.spread,v.y+v.h*.52,v.z)};
 const from=net.position.clone(),to=world(board,-1.40,BOARD+.36,2.13);
 sound('wet',.46,1.08);
 glide(1.24,t=>{net.position.copy(from).lerp(to,smooth(clamp(t/.64)));net.rotation.set(.06,0,-.09);
 shapeNoodle(n,s=>{let k=smooth(clamp((t-(1-s)*.25)/.75));let start=origin(s),end=netPath(n,s);start.lerp(end,k);start.y+=Math.sin(PI*k)*(.65+.22*s);return start})
 },()=>{n.state='net';netLoaded=true;setPhase('cut')})
}
function potPath(n,t){
 const age=n.age,heat=clamp(n.heat),curl=.37+heat*.63;
 const phaseA=n.seed*.12+n.turn+age*.16,angle=phaseA+(t-.5)*n.length*(.72+curl*.41);
 const r=.43+.13*Math.sin(1.6*PI*t+n.seed)+.10*Math.sin(age*.39+n.seed);
 const side=n.length*(t-.5);
 let x=Math.cos(angle)*r+.22*Math.sin(n.seed+age*.24)+.20*side,z=Math.sin(angle)*r+side*(.46-.22*curl);
 let kink=(1-heat)*Math.exp(-((t-n.crease)**2)/.013);
 return world(pot,x,waterY+.015+.027*Math.sin(time*2+t*6+n.seed)+.091*kink+.012*n.layer,z+.19*kink)
}
function immerse(){
 const bunch=held();if(!bunch.length)return;setPhase('immersing');bunch.forEach((n,i)=>{n.state='dipping';n.layer=i;n.age=0;n.heat=0;n.delay=i*.20;n.turn=rand()*.5});
 const from=net.position.clone(),to=world(pot,0,waterY-.14,.12);let splashed=false;
 glide(visitedPot?1.36:2.18,(t)=>{
 const k=smooth(clamp(t/.70));net.position.copy(from).lerp(to,k);net.position.y+=Math.sin(k*PI)*.63;
 net.rotation.x=lerp(.06,-.17,k);net.rotation.z=lerp(-.09,-.19,k);
 for(let i=0;i<bunch.length;i++){let n=bunch[i];glazeNoodle(n,clamp((t-.42-i/(bunch.length+1)*.13)/.57)*.65);shapeNoodle(n,s=>{let f=smooth(clamp((t-.42-i/(bunch.length+1)*.13-(1-s)*.13)/.33));return netPath(n,s).lerp(potPath(n,s),f)})}
 if(k>.93&&!splashed){splashed=true;sound('water',.74,.77);ripple(pot,.04,waterY+.015,.11,.82);particles(world(pot,0,waterY,.18),13,true,1.24,waterY)}
 },()=>{bunch.forEach(n=>{n.state='pot'});netSweep.set(0,0,.12);visitedPot=true;netLoaded=false;setPhase('cook')})
}
function scoop(point,speed=0){
 let q=local(pot,point),rr=Math.hypot(q.x,q.z);if(rr>.86){q.x*=.86/rr;q.z*=.86/rr}
 netSweep.set(q.x,0,q.z);net.position.copy(world(pot,q.x,waterY-.19,q.z));net.rotation.set(-.065,-.28,-.043);if(speed>.12&&time-dustTick>.12){particles(world(pot,q.x,waterY,q.z),Math.min(12,2+Math.floor(speed*12)),true,.48+speed*1.7,waterY);dustTick=time}
 swimming().forEach(n=>{for(let t of [.08,.28,.51,.76,.94]){const p=local(pot,potPath(n,t));if(Math.hypot(p.x-q.x,p.z-q.z)<.66){n.caught=true;break}}})
}
function liftNet(){
 let caught=swimming().filter(n=>n.caught);if(!caught.length){const near=swimming().sort((a,b)=>potPath(a,.5).distanceTo(net.position)-potPath(b,.5).distanceTo(net.position))[0];if(near){scoop(potPath(near,.5));caught=swimming().filter(n=>n.caught)}}
 if(!caught.length)return;
 setPhase('lifting');let from=net.position.clone(),to=from.clone().add(V(0,.85,.18));
 caught.forEach((n,i)=>{n.state='scooping';n.layer=i});glide(.84,t=>{
 net.position.copy(from).lerp(to,smooth(t));caught.forEach(n=>shapeNoodle(n,s=>potPath(n,s).lerp(netPath(n,s),lerp(n.catchMix||0,1,smooth(clamp((t-.10*(1-s))/.9))))));
 if(t>.3&&time-dustTick>.12){particles(net.position.clone().add(V(.06,-.17,0)),2,true,.27,waterY);sound('drop',.22,.88+rand()*.37);dustTick=time}
 },()=>{caught.forEach(n=>n.state='net');netLoaded=true;readyServing()})
}
function servingStation(){return portrait?V(-.12,0,2.36):V(-2.24,0,1.58)}
function garnishStation(){return portrait?V(.34,BOARD*.84+.025,-.09):V(-2.86,0,-.93)}
function mixingAside(){return portrait?V(-4.03,0,-1.56):V(-4.86,0,-3.04)}
function matStation(i){
 return portrait?(i?V(-1.60,0,4.36):V(1.73,0,4.37)):(i?V(-2.14,0,4.27):V(-5.10,0,1.09))
}
function readyServing(){
 const a=serving.g.position.clone(),b=servingStation(),src=toppings.position.clone(),nt=net.position.clone(),dst=b.clone().add(V(.52,1.27,-.28));
 const mixFrom=mixing.position.clone(),mixTo=mixingAside(),cupFrom=cup.position.clone(),matFrom=mats[batch].position.clone(),matTo=matStation(batch);
 const trayYaw=toppings.rotation.y;serving.soup.visible=true;stationReady=true;setPhase('carrying');
 glide(1.43,t=>{
 const k=smooth(t),clear=smooth(clamp(t/.66));mixing.position.copy(mixFrom).lerp(mixTo,clear);cup.position.copy(cupFrom).add(mixing.position.clone().sub(mixFrom));
 serving.g.position.copy(a).lerp(b,k);serving.g.position.y+=.31*Math.sin(k*PI);toppings.position.copy(src).lerp(garnishStation(),k);toppings.rotation.y=lerp(trayYaw,.055,k);
 mats[batch].position.copy(matFrom).lerp(matTo,k);net.position.copy(nt).lerp(dst,k);net.position.y+=.35*Math.sin(PI*k)
 },()=>{lastTouch=time})
}
function bowlPath(n,t){
 const a=n.landAngle,span=n.length*.73,rad=.48+.10*Math.sin(n.seed);
 const curve=.55+n.coil*1.14,theta=(t-.43)*span*curve/rad;
 let x=Math.sin(theta)*rad/curve,z=(1-Math.cos(theta))*rad/curve-.16;
 let xx=n.landX+x*Math.cos(a)-z*Math.sin(a),zz=n.landZ+x*Math.sin(a)+z*Math.cos(a);
 const rr=Math.hypot(xx,zz),bound=Math.max(.55,.96-Math.min(n.width*.36,.30));
 if(rr>bound){let f=bound/rr;xx*=f;zz*=f}
 const j=clamp(t)*24,i=Math.min(23,Math.floor(j)),support=n.seat?lerp(n.seat[i],n.seat[i+1],j-i):0;
 const y=.705+support+.055*Math.sin(PI*t)+.035*Math.sin(t*7+n.seed)+.073*(1-clamp(n.heat))*Math.exp(-((t-n.crease)**2)/.014);
 return V(xx,y,zz)
}
function serveAt(point,vector=V()){
 const bunch=held();if(!bunch.length)return;
 const q=local(serving.g,point);let rad=Math.hypot(q.x,q.z);if(rad>.76){q.x*=.76/rad;q.z*=.76/rad}
 let start=net.position.clone(),dst=world(serving.g,q.x,1.20,q.z);
 bunch.forEach((n,i)=>{n.state='landing';n.startLayer=n.layer;n.layer=serving.noodles.length+i;n.landX=q.x+Math.cos(i*2.4)*.045;n.landZ=q.z+Math.sin(i*2.4)*.045;n.landAngle=Math.hypot(vector.x,vector.z)>.04?Math.atan2(vector.z,vector.x):n.seed*.7;n.coil=1-clamp(rad);n.serve=serving});
 const settled=[...serving.noodles];
 for(const n of bunch){
  const seat=[];
  for(let j=0;j<=24;j++){
   const p=bowlPath(n,j/24);let support=0;
   for(const lower of settled)for(let k=0;k<=24;k++){
    const q=bowlPath(lower,k/24),overlap=(lower.width+n.width)*.34+.035,d=Math.hypot(q.x-p.x,q.z-p.z);
    if(d<overlap)support=Math.max(support,(q.y-.705+clamp(lower.thick[k]*.46,.018,.14))*(1-(d/overlap)**3))
   }
   seat.push(support)
  }
  n.seat=seat.map((v,j)=>(seat[Math.max(0,j-1)]+2*v+seat[Math.min(24,j+1)])/4);settled.push(n)
 }
 setPhase('deliver');let splashed=false;
 glide(1.34,t=>{
 net.position.copy(start).lerp(dst,smooth(clamp(t/.48)));net.rotation.z=-.10-.85*smooth(clamp((t-.27)/.57));
 bunch.forEach((n,i)=>shapeNoodle(n,s=>{let k=smooth(clamp((t-.20-(1-s)*.22-i/(bunch.length+1)*.14)/.45));let base=bowlPath(n,s);let target=world(serving.contents,base.x,base.y,base.z);let p=netPath(n,s).lerp(target,k);p.y+=Math.sin(PI*k)*.12;return p}));
 if(!splashed&&t>.58){splashed=true;ripple(serving.g,q.x,.705,q.z,.65);sound('drop',.56,.76)}
 },()=>{bunch.forEach(n=>{n.state='served';serving.contents.add(n.mesh);shapeNoodle(n,s=>bowlPath(n,s));serving.noodles.push(n)});netLoaded=false;net.position.copy(world(serving.g,1.60,.38,.09));net.rotation.set(.045,-.54,.045);setPhase('garnish')})
}
function bowlHeight(b,x,z){
 let high=.706;
 for(let n of b.noodles){for(let j=0;j<=20;j++){let v=bowlPath(n,j/20),d=Math.hypot(v.x-x,v.z-z);if(d<n.width*.48+.045)high=Math.max(high,v.y+.44*n.thick[Math.round(j/20*24)])}}
 return high
}
function overTofu(b,x,z){
 for(let g of b.garnishes){if(g.kind!=='tofu')continue;const dx=x-g.o.position.x,dz=z-g.o.position.z,c=Math.cos(g.o.rotation.y),s=Math.sin(g.o.rotation.y),xx=dx*c-dz*s,zz=dx*s+dz*c;
 if(xx>-.36&&xx<.34&&zz<.34&&zz>-.34&&xx-zz<.075)return g.o.position.y+.122}return 0
}
function pickGarnish(kind){
 const stock=kind==='onion'?onionStock:tofuStock;if(!stock.length)return;
 const o=stock.pop();scene.attach(o);o.position.y+=.30;selectedGarnish={o,kind,sourcePhase:phase,origin:o.position.clone()};setPhase('garnishDrag');sound(kind==='onion'?'grain':'wet',.27,1.25)
}
function garnishDrop(b,point){
 if(!selectedGarnish)return;const {o,kind,sourcePhase}=selectedGarnish;selectedGarnish=null;
 let q=local(b.contents,point),r=Math.hypot(q.x,q.z),limit=kind==='tofu'?.67:.93;if(r>limit){q.x*=limit/r;q.z*=limit/r}
 let high=bowlHeight(b,q.x,q.z),tofuY=overTofu(b,q.x,q.z),afloat=kind==='onion'&&high<.73&&!tofuY;
 let parent=afloat?b.floating:b.contents;
 const targetLocal=local(parent,world(b.contents,q.x,Math.max(high,tofuY)+.018,q.z));
 parent.attach(o);let from=o.position.clone(),target=targetLocal.clone();o.rotation.set(0,rand()*TAU,0);
 const tiltX=kind==='tofu'?clamp((bowlHeight(b,q.x,q.z+.20)-bowlHeight(b,q.x,q.z-.20))*2.5,-.38,.38):0;
 const tiltZ=kind==='tofu'?clamp((bowlHeight(b,q.x+.20,q.z)-bowlHeight(b,q.x-.20,q.z))*2.5,-.38,.38):0;
 const g={o,kind,afloat,base:target.clone(),age:0,vel:V(),seed:rand()*TAU};b.garnishes.push(g);
 flight.push({o,from,to:target,time:0,duration:.40,done:()=>{
 sound(kind==='tofu'?'wet':'drop',.37,.9+rand()*.48);o.rotation.x=tiltX;o.rotation.z=tiltZ;
 b.wave=.85;ripple(b.g,q.x,.71,q.z,.39);if(afloat){for(let other of b.garnishes){if(other.afloat){let dx=other.o.position.x-q.x,dz=other.o.position.z-q.z;other.vel.x+=dx*.65+(rand()-.5)*.12;other.vel.z+=dz*.65+(rand()-.5)*.12}}}
 if(afloat&&rand()<.115){const e=scallion(parent,.086);e.position.copy(target).x+=.092;b.garnishes.push({o:e,kind:'onion',afloat:true,base:e.position.clone(),age:0,vel:V(.17,0,.04),seed:rand()*TAU});g.vel.x-=.12}
 }});
 setPhase(sourcePhase==='compare'?'compare':'garnish')
}
function updateBowl(b,dt){
 if(b.soup.visible){const speed=Math.min(.82,Math.abs(b.angle-b.floatAngle)*.65);
  b.wave=Math.max((b.wave||0)*Math.exp(-dt*1.8),speed);
  waterMotion(b.soup,time,1.018,.13,b.wave)
 }
 b.contents.rotation.y=b.angle;b.body.rotation.y=b.angle;
 b.floatAngle=lerp(b.floatAngle,b.angle,tauEase(dt,2.95));b.floating.rotation.y=b.floatAngle;
 for(let g of b.garnishes){g.age+=dt;if(!g.afloat||g.age<.43)continue;
 g.o.position.addScaledVector(g.vel,dt);g.vel.multiplyScalar(Math.exp(-1.51*dt));let r=Math.hypot(g.o.position.x,g.o.position.z);if(r>.936){g.o.position.x*=.936/r;g.o.position.z*=.936/r;g.vel.multiplyScalar(-.38)}g.o.position.y=.722+.006*Math.sin(time*1.55+g.seed)}
}
function comparisonLayout(){
 const center=portrait?V(0,.01,1.92):V(-2,.01,1.26);
 mats.forEach((m,i)=>{m.visible=true;m.position.copy(center).add(portrait?V((i-.5)*.44,0,(i-.5)*2.78):V((i-.5)*2.82,0,(i-.5)*.25));if(saved[i]){saved[i].g.position.copy(m.position);saved[i].g.position.y=.106}});
 toppings.position.copy(center).add(portrait?V(1.51,0,-.04):V(0,0,-1.62));toppings.rotation.y=portrait?1.38:0
}
function parkBowl(){
 if(!serving.noodles.length||saved.includes(serving))return;const thisBowl=serving,i=batch;
 setPhase('park');const from=thisBowl.g.position.clone(),to=mats[i].position.clone().add(V(0,.095,0));
 
 mats[i].visible=true;glide(1.0,t=>{thisBowl.g.position.copy(from).lerp(to,smooth(t));thisBowl.g.position.y+=.075*Math.sin(t*PI)},()=>{
 tag(thisBowl.g,'kept'+i);saved.push(thisBowl);batch++;
 if(batch===1){nextBatch()}else{
 const old=saved.map(s=>s.g.position.clone());comparisonLayout();const dest=saved.map(s=>s.g.position.clone());
 setPhase('compare');glide(1.20,t=>{mats.forEach((m,i)=>{saved[i].g.position.copy(old[i]).lerp(dest[i],smooth(t));m.position.copy(saved[i].g.position);m.position.y=.01})},()=>{setPhase('compare')})
 }
 })
}
function nextBatch(){
 for(let n of noodles)if(n.state!=='served'){n.mesh.removeFromParent();n.mesh.geometry.dispose();n.mesh.material.dispose()}noodles=[];
 if(sheet)for(let p of [...sheet.parts])sheet.remove(p);sheet=null;cutCount=0;foldReady=false;netLoaded=visitedPot=false;
 stationReady=false;serving=makeBowl('serve','serve');waterLeft=1;saltDissolved=0;waterRunning=false;powderGroup.add(lump);lump.scale.setScalar(1);lump.visible=false;
 cupFlour.visible=true;cupFlour.scale.setScalar(1);cup.rotation.set(0,0,0);jug.rotation.set(0,0,0);jugWater.position.y=1.25;jugWater.scale.setScalar(1);
 crystals.visible=true;saltPile.scale.set(.28,.085,.25);salt.rotation.set(0,0,0);saltInWater.visible=false;saltInWater.scale.setScalar(1);saltInWater.position.y=0;
 selectedGarnish=null;refill();setPhase('flour');makePowder();layout()
}
function backToWork(){
 if(swimming().length){setPhase('cook');net.position.copy(world(pot,netSweep.x,waterY-.18,netSweep.z));return}
 if(!sheet?.parts.length)return;
 setPhase('cut');pinRest();knifeRest();net.position.copy(restNet);net.rotation.set(-.09,-.4,.08)
}
function setRay(e){
 const rect=screenCanvas.getBoundingClientRect();pointer.set(((e.clientX-rect.left)/rect.width)*2-1,-((e.clientY-rect.top)/rect.height)*2+1);ray.setFromCamera(pointer,camera)
}
function atHeight(y){ground.constant=-y;return ray.ray.intersectPlane(ground,V())||V()}
function allowed(id){
 if(id?.startsWith('kept'))return true;
 const ids={
 flour:['cup'],salt:['salt'],shake:['jug'],water:['jug','mix'],mix:['mix'],lift:['mix'],
 roll:['pin','piece'],fold:['piece'],cut:['knife','piece','net','pot'],cook:['net','pot'],
 carrying:['net','serve'],garnish:['serve','onion','tofu','mat','net','pot','piece','knife'],
 garnishDrag:['serve'],compare:['onion','tofu']
 };return (ids[phase]||[]).includes(id)
}
function pick(e){
 setRay(e);scene.updateMatrixWorld(true);
 const hits=ray.intersectObjects(work.children,true);
 for(let h of hits){let o=h.object,id=null,hidden=false,tagged=null;for(let a=o;a;a=a.parent){if(!a.visible)hidden=true;if(!id&&a.userData.action){id=a.userData.action;tagged=a}}
 if(hidden||!id||!allowed(id))continue;
 if(id==='mat'&&tagged!==mats[batch])continue;
 return {id,o:tagged,p:h.point}
 }
 // Preserve a fingertip-sized target around the small salt dish and the knife handle.
 let targets=phase==='salt'?[[salt,'salt',V(0,.15,0)]]:phase==='cut'?[[knife,'knife',V(0,.22,.98)]]:phase==='roll'?[[pin,'pin',V()]]:[];
 for(let [o,id,q] of targets){let p=world(o,q.x,q.y,q.z),u=p.clone().project(camera);let dx=(u.x-pointer.x)*screenCanvas.clientWidth/2,dy=(u.y-pointer.y)*screenCanvas.clientHeight/2;
 if(Math.hypot(dx,dy)<20)return {id,o,p}}
 return null
}
function bowlForId(id){return id?.startsWith('kept')?saved[Number(id.slice(4))]:serving}
function validBowlAt(p){let options=[...saved,serving];let best=null,dist=Infinity;for(let b of options){const q=local(b.g,p),d=Math.hypot(q.x,q.z);if(d<1.36&&d<dist){best=b;dist=d}}return best}
function naturalCut(){
 const parts=[...sheet.parts].sort((a,b)=>b.hi-b.lo-(a.hi-a.lo));if(!parts.length)return 0;
 const p=parts[0];return sheet.sample(lerp(p.lo,p.hi,cutCount%3===1?.32:.18),.5).x+p.spread
}
function down(e){
 if(drag||e.isPrimary===false)return;
 audioStart();const hit=pick(e);if(!hit)return;
 const {id,o,p}=hit,b=bowlForId(id);
 if(anim&&!id.startsWith('kept'))return;
 e.preventDefault();screenCanvas.setPointerCapture(e.pointerId);lastTouch=time;touchGuide.visible=false;
 drag={pid:e.pointerId,id,obj:o,b,start:p.clone(),p:p.clone(),sx:e.clientX,sy:e.clientY,px:e.clientX,py:e.clientY,total:0,oldPhase:phase,offset:V(),moved:false,fold:false,readyLift:phase==='lift'};
 if(phase==='garnishDrag'&&(id==='serve'||id.startsWith('kept'))){garnishDrop(b,atHeight(.72));drag=null;return}
 if(id.startsWith('kept')||(id==='serve'&&phase==='garnish')){const q=local(b.g,p);drag.radius=Math.hypot(q.x,q.z);drag.lastAngle=Math.atan2(q.z,q.x);drag.bowlOrigin=b.g.position.clone();return}
 if(phase==='flour'&&id==='cup'){fillFlour();return}
 if(phase==='salt'){salt.position.y+=.086;return}
 if(phase==='shake'){saltInWater.visible=true;shakeJug(.22);return}
 if(phase==='water'){waterRunning=true;pourPoint.set(dustCenter.x,0,dustCenter.z);if(id==='mix'){const q=local(mixing,p),s=Math.min(1,1.05/(Math.hypot(q.x,q.z)||1));pourPoint.set(q.x*s,0,q.z*s)}return}
 if(phase==='mix'){moveLump(p,.29);return}
 if(phase==='lift'){lump.scale.y*=1.12;return}
 if(phase==='roll'){
 let q=local(board,p),front=sheet.sample(sheet.atX(q.x),1).z;
 if(id==='piece'&&foldReady&&q.z>front*.48){drag.fold=true;drag.foldStart=q.z;pinRest();setPhase('fold');return}
 drag.boardPrev=q;rolling(p,V(0,0,-.03),.14);return
 }
 if(phase==='cut'&&id==='knife'){knife.position.y+=.33;drag.bladeX=naturalCut();return}
 if(phase==='cook'){scoop(atHeight(waterY));return}
 if((phase==='garnish'||phase==='compare')&&(id==='tofu'||id==='onion')){pickGarnish(id);return}
 if(phase==='carrying'&&id==='serve'){serveAt(p);return}
}
function move(e){
 if(!drag||drag.pid!==e.pointerId)return;setRay(e);const d=drag;lastTouch=time;let dx=e.clientX-d.px,dy=e.clientY-d.py;
 d.px=e.clientX;d.py=e.clientY;d.total+=Math.hypot(dx,dy);d.moved=d.total>5;
 if(anim)return;
 if(d.id.startsWith('kept')||d.id==='serve'&&d.oldPhase==='garnish'){
 let p=atHeight(.76),q=local(d.b.g,p),a=Math.atan2(q.z,q.x),delta=a-d.lastAngle;
 if(delta>PI)delta-=TAU;if(delta<-PI)delta+=TAU;
 if(d.id==='serve'&&d.radius<.70){let target=d.bowlOrigin.clone().add(p.clone().sub(d.start));target.y=.028;d.b.g.position.lerp(target,.60)}
 else{d.b.angle+=Math.abs(delta)<.85?delta:dx*.008;d.lastAngle=a}
 return
 }
 if(phase==='salt'){let p=atHeight(.55);salt.position.lerp(p,.72);salt.position.y=.48;return}
 if(phase==='shake'){jug.position.x=restJug.x+clamp((e.clientX-d.sx)*.006,-.24,.24);shakeJug(Math.min(.15,Math.hypot(dx,dy)*.006));return}
 if(phase==='water'&&waterRunning){let q=local(mixing,atHeight(.81));let r=Math.hypot(q.x,q.z),k=r>1.05?1.05/r:1;pourPoint.set(q.x*k,0,q.z*k);return}
 if(phase==='mix'){let p=atHeight(.66),dist=Math.min(.53,p.distanceTo(d.p));moveLump(p,dist*1.72);d.p.copy(p);return}
 if(phase==='lift'&&d.readyLift){let q=local(mixing,atHeight(.85));lump.position.x=clamp(q.x,-1.30,1.30);lump.position.z=clamp(q.z,-1.12,1.12);lump.position.y=.81+Math.min(.62,d.total*.006);return}
 if(phase==='roll'){
 const p=atHeight(BOARD+.36),q=local(board,p),delta=q.clone().sub(d.boardPrev);rolling(p,delta,Math.min(.90,delta.length()*1.42));d.boardPrev=q;return
 }
 if(phase==='fold'&&d.fold){let q=local(board,atHeight(BOARD+.28)),front=sheet.sample(0,1).front,back=sheet.sample(0,0).back;
 let travel=clamp((d.foldStart-q.z)/(front-back));sheet.fold=clamp(travel*1.48,.04,.94);sheet.crease=clamp(1-travel*.56,.44,.78);sheet.update();return}
 if(phase==='cut'&&d.id==='knife'){let q=local(board,atHeight(BOARD+.38));d.bladeX=clamp(q.x,sheet.min+.025,sheet.max-.025);knife.position.copy(world(board,d.bladeX,BOARD+.45,-.03));orientToBoard(knife);return}
 if(phase==='cut'&&d.id==='piece'&&cutCount){let dist=Math.min(.17,d.total*.003);d.obj.position.y=dist;return}
 if(phase==='cut'&&d.id==='net'&&held().length){net.position.copy(atHeight(1.09));return}
 if(phase==='cook'){scoop(atHeight(waterY),Math.min(.77,Math.hypot(dx,dy)*.027));return}
 if(phase==='carrying'&&d.id==='net'){net.position.lerp(atHeight(1.18),.82);return}
 if(phase==='garnishDrag'&&selectedGarnish){selectedGarnish.o.position.copy(atHeight(1.04));return}
}
function up(e){
 if(!drag||drag.pid!==e.pointerId)return;setRay(e);const d=drag;drag=null;lastTouch=time;
 if(screenCanvas.hasPointerCapture(e.pointerId))screenCanvas.releasePointerCapture(e.pointerId);
 if(anim)return;
 if(d.id.startsWith('kept'))return;
 if(d.id==='serve'&&d.oldPhase==='garnish'){
 if(d.radius<.7&&d.moved){let mp=mats[batch].position,dist=d.b.g.position.distanceTo(mp);if(dist<1.74||(d.b.g.position.distanceTo(d.bowlOrigin)>.68&&mp.clone().sub(d.bowlOrigin).dot(d.b.g.position.clone().sub(d.bowlOrigin))>1.05)){parkBowl();return}d.b.g.position.copy(d.bowlOrigin)}
 return
 }
 if(phase==='salt'&&d.id==='salt'){salting();return}
 if(d.oldPhase==='shake'){jug.position.copy(restJug);jug.rotation.z=0;if(phase==='shake'&&!d.moved)shakeJug(.13);return}
 if(d.oldPhase==='water'){if(d.moved&&waterLeft>.02){waterRunning=false;stream.visible=false}return}
 if(phase==='lift'&&d.readyLift){transferDough();return}
 if(phase==='roll'&&d.id==='pin'&&!d.moved){const q=local(board,d.p);rolling(world(board,q.x,BOARD+.3,q.z-.25),V(0,0,-.25),.72);return}
 if(phase==='fold'&&d.fold){finishFold(d.moved?sheet.crease:.55);return}
 if(phase==='cut'){
 if(d.id==='knife'){cutAt(d.bladeX);return}
 if(d.id==='piece'){d.obj.position.y=0;if(!cutCount){cutAt(local(board,d.start).x);return}peel(d.obj.userData.part);return}
 if((d.id==='pot'||d.id==='net')&&held().length){immerse();return}
 if(d.id==='pot'&&swimming().length){backToWork();return}
 }
 if(phase==='cook'){liftNet();return}
 if(phase==='carrying'&&d.id==='net'){let p=d.moved?atHeight(.73):world(serving.g,.07,.73,.07);serveAt(p,p.clone().sub(d.start));return}
 if(phase==='garnishDrag'&&selectedGarnish&&d.moved){let p=atHeight(.73),b=validBowlAt(p);if(b)garnishDrop(b,p);return}
 if(phase==='garnish'){if(d.id==='mat')parkBowl();else if(['net','pot','piece','knife'].includes(d.id))backToWork()}
}
function cancelGesture(e){
 if(!drag||e.pointerId!==drag.pid)return;
 if(drag.id==='serve'&&drag.bowlOrigin)drag.b.g.position.copy(drag.bowlOrigin);
 if(phase==='salt')salt.position.copy(restSalt);if(phase==='cut')knifeRest();
 if(phase==='fold'){sheet.fold=0;sheet.update();setPhase('roll')}
 if(waterRunning){waterRunning=false;stream.visible=false}drag=null;lastTouch=time
}
screenCanvas.addEventListener('pointerdown',down);screenCanvas.addEventListener('pointermove',move);screenCanvas.addEventListener('pointerup',up);screenCanvas.addEventListener('pointercancel',cancelGesture);
screenCanvas.addEventListener('contextmenu',e=>e.preventDefault());
function cue(){
 const path=(a,b)=>[a,b||a.clone().add(V(0,-.085,0))];
 if(phase==='flour')return path(world(cup,-.29,.71,.13),world(cup,-.34,.96,.14));
 if(phase==='salt')return path(world(salt,0,.24,.01),world(jug,.07,1.61,0));
 if(phase==='shake')return path(world(jug,-.22,1.33,.23),world(jug,.24,1.33,.23));
 if(phase==='water')return waterRunning?path(world(mixing,-.48,.96,.02),world(mixing,.56,.84,-.08)):path(world(jug,-.21,1.32,.18),world(mixing,-.08,1.15,0));
 if(phase==='mix'){
 let target=grainsData.reduce((a,b)=>b.amount*(.7+b.water*.1)>a.amount*(.7+a.water*.1)?b:a);
 const begin=lump.visible?world(mixing,lump.position.x,lump.position.y+.27,lump.position.z):world(mixing,dustCenter.x,1.05,dustCenter.z);
 return path(begin,world(mixing,target.x+.15,.87,target.z+.07))
 }
 if(phase==='lift')return path(world(mixing,lump.position.x,lump.position.y+.29,lump.position.z),world(board,-1.18,.58,.59));
 if(phase==='roll'&&foldReady){let p=sheet.sample(0,1);return path(world(board,p.x,BOARD+p.h+.085,p.z),world(board,.04,.63,p.z-.99))}
 if(phase==='roll')return path(world(pin,0,.25,.06),world(board,.06,BOARD+.54,-1.0));
 if(phase==='cut'){
 if(held().length)return path(world(net,.45,.13,.55),world(pot,.04,1.49,.04));
 if(cutCount&&sheet.parts.length){let p=sheet.parts.reduce((a,b)=>a.hi-a.lo<b.hi-b.lo?a:b),v=sheet.sample((p.lo+p.hi)/2,.68);return path(world(board,v.x+p.spread,v.y+v.h+.06,v.z),world(board,-1.40,BOARD+.49,2.13))}
 if(sheet.parts.length)return path(world(knife,-.01,.31,1.11),world(board,naturalCut(),BOARD+.43,.87))
 }
 if(phase==='cook')return path(world(net,.55,.14,.65),world(pot,-.29,1.61,.19));
 if(phase==='carrying')return path(world(net,.59,.17,.65),world(serving.g,-.13,.85,.13));
 if(phase==='garnish'){
 if(serving.garnishes.length<2){let g=serving.garnishes.some(v=>v.kind==='onion')?tofuDish:onionDish;return path(world(g,0,.26,0),world(serving.g,-.28,.84,.12))}
 return path(world(serving.g,0,.82,.61),world(mats[batch],0,.22,0))
 }
 if(phase==='garnishDrag'&&selectedGarnish)return path(selectedGarnish.o.position.clone().add(V(0,.13,0)),world(serving.g,.34,.83,.12));
 if(phase==='compare')return path(world(saved[0].g,.97,.88,.35),world(saved[0].g,.52,.88,.91));
 return null
}
let guideSample=0,guidePath=null;
function animateGuide(dt){
 if(phase==='flour'&&!anim&&!drag){
 const pulse=(.5-.5*Math.cos(time*2.45))**3;cup.position.copy(restCup);cup.position.y+=.048*pulse;cup.rotation.z=-.065*pulse
 }
 if(phase==='salt'&&!drag&&!anim)salt.position.y=restSalt.y+.067*(.5-.5*Math.cos(time*2.55))**3;
 if(anim||drag){touchGuide.visible=false;progressLight.intensity=0;guideSample=0;return}
 if(time>=guideSample||guideSample===0){guidePath=cue();guideSample=time+.115}
 if(!guidePath){touchGuide.visible=false;progressLight.intensity=0;return}
 const [a,b]=guidePath;progressLight.position.copy(a).add(V(-.09,.30,.14));
 progressLight.intensity=.22+.40*(.5+.5*Math.sin(time*2.62));
 let idle=time-lastTouch;if(idle<4.05){touchGuide.visible=false;return}
 const cyc=((idle-4.05)%3.42)/3.42,k=smooth(clamp((cyc-.16)/.58));touchGuide.visible=cyc<.86;
 touchGuide.position.copy(a).lerp(b,k);touchGuide.position.y+=Math.sin(k*PI)*.18+.085;
 guideMat.opacity=.36*clamp(cyc/.085)*clamp((.85-cyc)/.09);touchGuide.scale.setScalar(portrait?1.14:1)
}
function animateKitchen(dt){
 for(let b of bubbles){let f=(time*b.speed+b.a)%1,scale=b.s*Math.sin(f*PI)**.45;b.o.scale.set(scale,scale*(.52+f*.3),scale);b.o.position.y=waterY-.04+.055*f}
 for(let s of steam){let f=(time*.245+s.a)%1;s.o.position.set(s.x+.21*Math.sin(f*3.8+s.a*8)*f,waterY+.03+f*1.48,s.z+.12*f);let r=.25+.47*f;s.o.scale.set(r*(.78+f*.23),r*1.59,1);s.o.material.opacity=.13*Math.sin(f*PI)**.89;s.o.material.rotation=.10*Math.sin(time*.46+s.a)}
 waterMotion(potWater,time,1.343,1,phase==='cook'&&drag?.55:0);potWater.material.roughness=.135+.027*Math.sin(time*.46);
 for(let d of specks){if(d.life<=0)continue;d.life-=dt;d.v.y-=4.0*dt;d.o.position.addScaledVector(d.v,dt);if(d.o.position.y<d.floor)d.life=0;if(d.life<=0)d.o.visible=false}
 for(let i=ripples.length-1;i>=0;i--){let r=ripples[i];r.t+=dt;let f=r.t/1.44;
 let radius=.10+r.s*(1-(1-clamp(f))**2);r.o.scale.setScalar(radius/.16);r.o.material.opacity=.29*(1-clamp(f));
 // Surface rings disappear at the ceramic wall.
 const limit=r.o.parent===pot?1.324:1.005;
 if(Math.hypot(r.o.position.x,r.o.position.z)+radius>limit){r.o.scale.multiplyScalar(1-.13*clamp(f));r.o.material.opacity*=.42}
 if(f>=1){r.o.removeFromParent();r.o.geometry.dispose();r.o.material.dispose();ripples.splice(i,1)}}
 for(let i=flight.length-1;i>=0;i--){const f=flight[i];f.time+=dt;let k=clamp(f.time/f.duration);f.o.position.copy(f.from).lerp(f.to,smooth(k));f.o.position.y+=.12*Math.sin(k*PI);if(k>=1){f.done();flight.splice(i,1)}}
}
function animateFrame(ms){
 requestAnimationFrame(animateFrame);dt=Math.min(.045,Math.max(.001,(ms-lastFrame)/1000));lastFrame=ms;time+=dt;
 if(anim){let a=anim;a.elapsed+=dt;let t=clamp(a.elapsed/a.duration);a.update(t,dt);if(t>=1&&anim===a){anim=null;a.done?.()}}
 if(phase==='water'&&waterRunning)waterStep(dt);
 if(grip>.008&&!drag&&phase==='mix'){grip*=Math.exp(-dt*(6-2*lumpMoisture));const s=Math.cbrt(collected);lump.scale.set(s*(1+grip*.046),s*(1-grip*.09),s*(1+grip*.043));redrawPowder()}
 if(sheet&&phase==='roll'&&!drag&&sheet.indent>.015){sheet.indent*=Math.exp(-dt*7);sheet.update();pin.position.y+=dt*.019*sheet.indent}
 for(let n of noodles){
 if(n.state==='pot'){
  n.age+=dt;n.heat=clamp((n.age-n.delay)/(4.4+n.thick[12]*7));
  if(n.heat<1)glazeNoodle(n,.65+.35*n.heat);
  if(n.caught)n.catchMix=lerp(n.catchMix||0,.92,tauEase(dt,4.4));
  shapeNoodle(n,t=>{let p=potPath(n,t);return n.caught?p.lerp(netPath(n,t),n.catchMix):p})
 }
 if(n.state==='net')shapeNoodle(n,t=>netPath(n,t))
 }
 updateBowl(serving,dt);saved.forEach(b=>{if(b!==serving)updateBowl(b,dt)});
 animateKitchen(dt);animateGuide(dt);aimCamera();
 if(phase==='immersing'&&anim){
 const k=smooth(clamp(anim.elapsed/(anim.duration*.90)));const edge=net.position.clone();edge.y-=.11;lookGoal.copy(edge).lerp(lookGoal.clone().copy(pot.position).add(V(0,1.21,0)),k);
 camEye.copy(lookGoal).add(camOffset);camEye.x+=.66*Math.sin(k*PI);camEye.y+=(1-k)*.98
 }
 if(phase==='carrying'&&anim){const f=smooth(clamp(anim.elapsed/anim.duration));lookGoal.lerp(net.position,.82*(1-f));camEye.copy(lookGoal).add(camOffset)}
 const rate=phase==='immersing'?5.0:3.48;camera.position.lerp(camEye,tauEase(dt,rate));camLook.lerp(lookGoal,tauEase(dt,rate+1.1));camera.lookAt(camLook);renderer.render(scene,camera)
}
for(const still of [room,crystals,saltInWater,mixBowl])batchStillLife(still);
makePowder();layout();window.addEventListener('resize',layout);requestAnimationFrame(animateFrame);
