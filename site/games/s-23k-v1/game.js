'use strict';
const canvas=document.querySelector('canvas');
const renderer=new T.WebGLRenderer({canvas,antialias:true,alpha:false,powerPreference:'high-performance'});
renderer.setPixelRatio(Math.min(devicePixelRatio||1,1.85));
renderer.shadowMap.enabled=true;renderer.shadowMap.type=T.PCFShadowMap;
renderer.outputColorSpace=T.SRGBColorSpace;renderer.toneMapping=T.ACESFilmicToneMapping;renderer.toneMappingExposure=1.12;
const camera=new T.PerspectiveCamera(35,1,.08,100);
const sky=new T.HemisphereLight(0xfff6df,0xc7b49d,1.85);scene.add(sky);
const sun=new T.DirectionalLight(0xffedcb,3.05);sun.position.set(-5.8,9,-4.4);scene.add(sun);
sun.castShadow=true;sun.shadow.mapSize.set(2048,2048);Object.assign(sun.shadow.camera,{left:-8,right:8,top:8,bottom:-8,near:.1,far:28});sun.shadow.camera.updateProjectionMatrix();
sun.shadow.bias=-.00022;sun.shadow.normalBias=.013;sun.shadow.radius=3;
const fill=new T.DirectionalLight(0xd9e8f0,.58);fill.position.set(4,4,6);scene.add(fill);
const audioFx={
  ctx:null,noise:null,lastRustle:-2,
  start(){
    if(!this.ctx){
      const Audio=window.AudioContext||window.webkitAudioContext;if(!Audio)return;
      this.ctx=new Audio();const b=this.ctx.createBuffer(1,this.ctx.sampleRate*.7,this.ctx.sampleRate),s=b.getChannelData(0);
      for(let i=0;i<s.length;i++)s[i]=Math.random()*2-1;this.noise=b;
    }
    if(this.ctx.state==='suspended')this.ctx.resume().catch(()=>{});
  },
  play(kind,intensity=.5){
    const c=this.ctx;if(!c||c.state!=='running')return;
    const t=c.currentTime,i=clamp(intensity,.06,1),r=Math.random();
    const tonal=kind==='cord',snap=kind==='snap',rolling=kind==='roll',rub=kind==='rub';
    if(rub&&t-this.lastRustle<.115)return;if(rub)this.lastRustle=t;
    const dur=tonal?.11-.045*i:snap?.052:rub?.16:rolling?.049:.105;
    const src=tonal?c.createOscillator():c.createBufferSource(),filter=c.createBiquadFilter(),gain=c.createGain();
    if(tonal){src.type='triangle';src.frequency.setValueAtTime(160+390*i,t);src.frequency.exponentialRampToValueAtTime(105+180*i,t+dur)}
    else src.buffer=this.noise;
    filter.type=tonal||kind==='drop'?'lowpass':'bandpass';filter.frequency.value=tonal?1300:snap?1200+r*650:rub?480+500*i:rolling?360+r*180:540;
    filter.Q.value=snap?1.4:.75;
    gain.gain.setValueAtTime(.0001,t);gain.gain.exponentialRampToValueAtTime((tonal?.062:snap?.19:rub?.17:.22)*i+.001,t+.008);
    gain.gain.exponentialRampToValueAtTime(.0001,t+dur);
    src.connect(filter);filter.connect(gain);gain.connect(c.destination);src.start(t,tonal?0:r*.32);src.stop(t+dur+.015);
    src.onended=()=>{src.disconnect();gain.disconnect();filter.disconnect()};
  }
};
const damp=(a,b,rate,dt)=>mix(a,b,1-Math.exp(-rate*dt));
const toWorld=(o,x=0,y=0,z=0)=>o.localToWorld(v3(x,y,z));
const pointer=new T.Vector2(),ray=new T.Raycaster();
const state={rail:false,arm:false,thread:false,high:false,railMix:0,armMix:0,threadMix:0,cart:-.86,pull:0,tension:0,close:0,lift:0,sway:0,swayV:0,held:null,gripOffset:0,gripStart:0,view:0,peek:false,editing:false};
let action=null,time=0,idle=0,layoutKey='',lastTwang=0;
const restRail=v3(),restArm=v3(),threadOrigin=v3(),ringCenter=v3(),freeKnot=v3(),camFocus=v3(),camPos=v3();
let portrait=false,railYaw=-.125,armYaw=-.25,initialCamera=true;
function layout(force){
  const ww=canvas.clientWidth,hh=canvas.clientHeight,key=ww+'x'+hh;
  if(key===layoutKey&&!force)return;layoutKey=key;portrait=ww/hh<.81;
  renderer.setSize(ww,hh,false);camera.aspect=ww/hh;camera.updateProjectionMatrix();
  tray.position.set(portrait?5.85:3.64,0,portrait?-.20:-2.97);tray.rotation.y=portrait?-.20:-.15;
  restRail.set(portrait?-1.17:-2.10,.195,portrait?2.04:2.67);
  railYaw=portrait?.12:-.115;
  restArm.set(portrait?1.98:1.21,.18,portrait?1.77:3.03);armYaw=portrait?-.42:-.52;
  threadOrigin.set(portrait?3.31:3.70,.074,portrait?1.89:2.81);
  tray.updateMatrixWorld(true);
  for(const p of parcels)if(p.state==='tray'){
    p.root.position.copy(toWorld(tray,p.trayX,.102+p.h,p.trayZ));p.root.rotation.y=p.yaw+tray.rotation.y;
  }
  initialCamera=true;
}
function allFolded(){return panels.every(p=>p.angle>p.max*.93)}
function railY(){return state.high?2.385:1.895}
function railZ(){return state.high?-.315:.335}
const panelShadow=new Map();
for(const p of panels){
  panelShadow.set(p,shadow(kit,0,.009,0,1,1,.46));
  p.surface.material=[p.surface.material[0].clone(),cut];
  p.surface.material[0].onBeforeCompile=kraft.onBeforeCompile;
}
const railShadow=shadow(kit,0,.009,0,5.95,.69,.55);
const armShadow=shadow(kit,0,.012,0,1.69,1.37,.54);
const dust=[];
const crumbMats=[pulp,honey,lightKraft];
for(let i=0;i<15;i++){
  const o=mesh(kit,new T.TetrahedronGeometry(.014+(i%3)*.004),crumbMats[i%3]);o.visible=false;dust.push({o,age:0,vel:v3()});
}
function flakes(pos){
  for(let i=0;i<4;i++){const d=dust.find(p=>!p.o.visible);if(!d)break;
    d.o.visible=true;d.age=0;d.o.position.copy(pos);d.vel.set((Math.random()-.5)*.34,.2+Math.random()*.24,(Math.random()-.5)*.27);
  }
}
function updatePanels(dt){
  for(const p of panels){
    const dragging=action?.kind==='panel'&&action.item===p&&action.moved;
    if(!dragging){
      const delta=p.target-p.angle;p.velocity+=(delta*83-p.velocity*15.8)*dt;p.angle=clamp(p.angle+p.velocity*dt,-.015,p.max+.037);
    }
    const hint=hintTarget()===p&&idle>1?(.014+.012*Math.sin(time*2.1)):0;
    p.hinge.rotation.x=p.angle-PI/2+hint;
    p.flex=damp(p.flex,p.press,18,dt);
    const curl=(1-smooth(.05,.98,p.angle/p.max))*(p===back?.065:.032);
    if(p.flex>.0004||p.wasFlex||Math.abs(curl-(p.lastCurl??-1))>.0005){
      const a=p.surface.geometry.attributes.position;
      const length=p===back?1.47:p===front?.5:p===mouth?.82:2.37;
      const width=p===back?2.56:p===front?1.95:1;
      for(let i=0;i<a.count;i++){
        const k=i*3,x=p.positions[k],y=p.positions[k+1],dx=x-p.touch.x,dy=y-p.touch.y;
        const warp=curl*(y/length)**2*(.46+.54*(x/width)**2);
        a.setZ(i,p.positions[k+2]+warp-.078*p.flex*Math.exp(-(dx*dx+dy*dy)*2.3));
      }
      for(const edge of p.cutFaces||[]){
        const attr=edge.o.geometry.attributes.position;
        for(let i=0;i<attr.count;i++){
          const k=i*3,x=edge.orig[k]+edge.o.position.x,y=edge.orig[k+1]+edge.o.position.y;
          const dx=x-p.touch.x,dy=y-p.touch.y;
          attr.setZ(i,edge.orig[k+2]+curl*(y/length)**2*(.46+.54*(x/width)**2)-.078*p.flex*Math.exp(-(dx*dx+dy*dy)*2.3));
        }
        attr.needsUpdate=true;
      }
      a.needsUpdate=true;p.wasFlex=p.flex>.0004;p.lastCurl=curl;
      if(p.flex>.01||p.wasBent){p.surface.geometry.computeVertexNormals();p.wasBent=p.flex>.01}
    }
    p.surface.material[0].emissive.setHex(0xffca74);p.surface.material[0].emissiveIntensity=hint*1.9;
    for(const tab of p.tabs){
      const other=tab.other,proximity=smooth(.63,.96,Math.min(p.angle,other.angle)/(PI/2));
      const aligned=Math.min(p.angle,other.angle)>1.48;
      const flex=proximity*(1-smooth(1.38,1.49,Math.min(p.angle,other.angle)));
      tab.g.rotation.y=damp(tab.g.rotation.y,-tab.sign*(.54*proximity+.58*flex),24,dt);
      tab.g.rotation.x=.18*flex;
      if(aligned&&!tab.caught){audioFx.play('snap',.69);flakes(toWorld(tab.g,tab.sign*.2,.14,.06));p.velocity=-.12}
      tab.caught=aligned;
    }
    const k=p===mouth?p.angle/mouth.max:p.angle/(PI/2);
    const sh=panelShadow.get(p),len=p===back?1.47:p===front?.46:p===mouth?2.8:2.28;
    const point=toWorld(p.hinge,0,len*.50,0);sh.position.set(point.x,.009,point.z);
    const width=p===back?5.4:p===front?4.06:p===mouth?1.5:2.16;
    sh.scale.set(width,len*(1-.74*k)+.38,1);sh.rotation.z=p.root.rotation.y;
    sh.material.opacity=.48-.27*k;
  }
  const f=clamp(mouth.angle/mouth.max);
  slope.rotation.x=-f*.657;dish.rotation.x=f*.267;
  dishEdges.forEach((g,i)=>g.rotation.y=(i===0?1:-1)*f*1.18);dishEnd.rotation.x=f*1.25;
  for(const d of dust)if(d.o.visible){
    d.age+=dt;d.vel.y-=3.6*dt;d.o.position.addScaledVector(d.vel,dt);
    if(d.o.position.y<FLOOR)d.vel.set(0,0,0);d.o.scale.setScalar(1-smooth(.48,.85,d.age));if(d.age>.85)d.o.visible=false;
  }
}
function returnToPose(object,dt){
  const catchup=object.userData.settling;if(!catchup)return;
  catchup.amount*=Math.exp(-10*dt);
  object.position.lerp(catchup.position,catchup.amount);
  object.quaternion.slerp(catchup.rotation,catchup.amount);
  if(catchup.amount<.002)delete object.userData.settling;
}
function updateRig(dt){
  const s=state;
  s.railMix=damp(s.railMix,s.rail?1:0,5.2,dt);s.armMix=damp(s.armMix,s.arm?1:0,6.2,dt);s.threadMix=damp(s.threadMix,s.thread?1:0,3.8,dt);
  const r=s.railMix,a=s.armMix;
  const dest=v3(0,railY(),railZ());
  rail.position.lerpVectors(restRail,dest,r);rail.position.y+=.46*Math.sin(PI*r);
  rail.rotation.set(0,mix(railYaw,0,r),0);
  if(action?.kind==='rail'&&action.moved){rail.position.copy(action.world).add(action.offset);rail.rotation.y*=.38}else returnToPose(rail,dt);
  carriage.position.x=s.cart*r-.23*(1-r);
  s.tension=damp(s.tension,s.pull,20,dt);
  const closeGoal=smooth(.09,.47,s.tension);
  s.close=damp(s.close,closeGoal,action?.kind==='ring'?27:18,dt);
  const liftGoal=smooth(.45,1,s.tension)*(s.high?.96:.51);
  if(s.pull>.02||s.close<.24)s.lift=damp(s.lift,liftGoal,liftGoal<s.lift?4.2:15,dt);
  s.swayV+=(-s.sway*35-s.swayV*4.5)*dt;s.sway+=s.swayV*dt;
  const restY=FLOOR+.764;
  const parked=toWorld(rail,carriage.position.x,.015,.56);
  const hung=parked.lerp(v3(s.cart,restY+s.lift,LANE),r);
  arm.position.lerpVectors(restArm,hung,a);arm.position.y+=.48*Math.sin(PI*a);
  arm.scale.y=1-.27*a*r;
  arm.rotation.order='YXZ';arm.rotation.set(mix(-PI/2,0,a*r),mix(armYaw,rail.rotation.y,a),s.sway*.12*a);
  if(action?.kind==='arm'&&action.moved)arm.position.copy(action.world).add(action.offset);else returnToPose(arm,dt);
  for(let i=0;i<2;i++){
    const sign=i?1:-1;
    const reach=s.held?clamp((extentX(s.held)-sign*s.gripOffset-.39)*.74,-.18,.16):0;
    jaws[i].rotation.z=sign*(.20-s.close*(.51-reach));
    links[i].position.set(sign*.027,-.29+.222*s.close,.18);
    links[i].rotation.z=-sign*(.52+.51*s.close);
  }
  plate.position.y=.224*s.close;
  wheel.rotation.x=-s.tension*3.8;
  railShadow.position.set(rail.position.x,.009,rail.position.z);railShadow.rotation.z=rail.rotation.y;railShadow.material.opacity=.56*(1-.82*r);
  armShadow.position.set(arm.position.x,.013,arm.position.z+(1-a)*.35);armShadow.material.opacity=.48*(1-.72*a);
}
function laidString(){
  const tail=[],o=threadOrigin;
  const pts=[[-1.05,-.34],[-.68,-.26],[-.38,-.47],[.26,-.57],[.64,-.31],[.55,.04],[.11,.12],[-.30,-.08],[-.12,-.41],[.35,-.44],[.58,-.14],[.34,.14],[-.08,.20],[-.32,.10]];
  for(let i=0;i<pts.length;i++)tail.push(v3(o.x+pts[i][0],o.y+.019*Math.sin(i*.85)+i*.002,o.z+pts[i][1]));
  return tail;
}
function updateCord(){
  const s=state,t=s.threadMix,o=threadOrigin;
  let loose=laidString();freeKnot.copy(loose[loose.length-1]);const looseTip=loose[0];
  if(action?.kind==='thread'&&action.moved){
    const delta=action.world.clone().sub(looseTip);loose=loose.map((p,i)=>p.clone().addScaledVector(delta,Math.pow(1-i/(loose.length-1),2)));
  }
  if(s.threadReturn&&action?.kind!=='thread'){
    const amt=Math.exp(-5.2*(time-s.threadReturn.time));
    loose=loose.map((p,i)=>p.addScaledVector(s.threadReturn.offset,amt*(1-i/(loose.length-1))**2));
    if(amt<.001)s.threadReturn=null;
  }
  const rest=toWorld(carriage,0,mix(-.084,-.54,s.railMix),mix(1.13,1.00,s.railMix));
  rest.y-=s.tension*.79;rest.z+=s.tension*.23;rest.x+=s.sway*.16;
  const ringHeight=.43,ringWidth=.31;
  ringCenter.copy(rest);
  if(action?.kind==='ring'&&action.moved){
    const depth=rest.clone().project(camera).z;
    ringCenter.set(action.ndc.x,action.ndc.y,depth).unproject(camera).add(action.grabOffset);
    if(ringCenter.y<ringHeight+.055){
      const line=ringCenter.clone().sub(camera.position);
      ringCenter.copy(camera.position).addScaledVector(line,(ringHeight+.055-camera.position.y)/line.y);
    }
  }
  if(s.ringReturn&&action?.kind!=='ring'){
    const amount=Math.exp(-9*(time-s.ringReturn.time));ringCenter.lerp(s.ringReturn.pos,amount);
    if(amount<.002)s.ringReturn=null;
  }
  const ringPitch=(1-s.railMix)*PI/2;
  const tied=ringCenter.clone().add(v3(0,ringHeight*Math.cos(ringPitch),-ringHeight*Math.sin(ringPitch)));
  const start=toWorld(arm,0,.234+s.close*.224,.13),pul=toWorld(carriage,0,.04,.36),run=[];
  run.push(start,start.clone().lerp(pul,.32).add(v3(-.22*(1-smooth(0,.12,s.tension)),0,-.10)));
  for(let i=0;i<=9;i++){const ang=PI*i/9;run.push(pul.clone().add(v3(0,.194*Math.sin(ang),-.194*Math.cos(ang))))}
  run.push(pul.clone().lerp(tied,.50).add(v3(s.sway*.067,-.10*(1-s.tension),.07)),tied);
  const c1=new T.CatmullRomCurve3(loose),c2=new T.CatmullRomCurve3(run);
  const path=[];for(let i=0;i<=40;i++)path.push(c1.getPoint(i/40).lerp(c2.getPoint(i/40),t));
  runningCord.update(path);
  const loop=[];
  for(let i=0;i<=38;i++){
    const f=TAU*i/38,xx=Math.sin(f)*(.77-.24*Math.cos(f));
    const l=freeKnot.clone().add(v3(xx*.62,.018*Math.sin(f),(.5-.5*Math.cos(f))*1.16));
    const q=ringCenter.clone().add(v3(xx*ringWidth,ringHeight*Math.cos(f)*Math.cos(ringPitch),.065*(1-Math.cos(f))-ringHeight*Math.cos(f)*Math.sin(ringPitch)));
    loop.push(l.lerp(q,t));
  }loopCord.update(loop);knot.position.copy(freeKnot).lerp(tied,t);knot.rotation.x=(1-t)*PI*.43;
  aglet.position.copy(path[0]);aglet.quaternion.setFromUnitVectors(v3(0,1,0),path[0].clone().sub(path[1]).normalize());
  if(!s.thread)ringCenter.copy(freeKnot).add(v3(0,0,.52));
}
function hangerPose(){
  const s=state;
  const a=toWorld(arm,.055,.441,.015);
  const local=carriage.worldToLocal(a),hang=guide;
  const pivot=v3(0,.085,.045),delta=local.sub(pivot);
  hang.position.copy(pivot);const direction=v3(0,-1,0).lerp(delta.clone().normalize(),s.armMix).normalize();
  hang.quaternion.setFromUnitVectors(v3(0,-1,0),direction);
  hang.scale.y=mix(.27,delta.length()/1.16,s.armMix);
}
function floorHeight(x,z){
  if(Math.abs(x-EXIT)<.65&&z>-.63&&z<2.50){
    const a=mouth.angle,b=a+slope.rotation.x,hingeZ=-.63+.82*Math.cos(a),endZ=hingeZ+1.47*Math.cos(b);
    const ridge=FLOOR+.82*Math.sin(a);
    if(z<hingeZ)return FLOOR+(z+.63)*Math.tan(a);
    if(z<endZ)return Math.max(.065,ridge+(z-hingeZ)*Math.tan(b));
    return Math.max(.063,ridge+1.47*Math.sin(b));
  }
  return (Math.abs(x)<=W*.5+.025&&Math.abs(z)<D*.5+.05)?FLOOR:.018;
}
function extentX(p){return .5*(Math.abs(Math.cos(p.yaw))*p.w+Math.abs(Math.sin(p.yaw))*p.d)}
function support(p){
  const v=p.root.position,base=floorHeight(v.x,v.z);
  let h=base;p.restOn=null;
  if(p.type==='tube')for(const q of parcels){
    if(q===p||q.type!=='flat'||!['floor','desk'].includes(q.state))continue;
    const end=p.w*.39,cs=Math.cos(p.yaw),sn=Math.sin(p.yaw);
    for(const sign of [-1,1]){
      const dx=v.x+sign*cs*end-q.root.position.x,dz=v.z-sign*sn*end-q.root.position.z;
      const u=dx*Math.cos(q.yaw)-dz*Math.sin(q.yaw),w=dx*Math.sin(q.yaw)+dz*Math.cos(q.yaw);
      if(Math.abs(u)<q.w*.44&&Math.abs(w)<q.d*.49&&Math.abs(v.x-q.root.position.x)>.32){
        h=Math.max(h,base+q.h*.85);p.restOn=q;p.tilt=sign*.17;
      }
    }
  }
  return h;
}
function releaseHeld(extra=0){
  const p=state.held;if(!p)return;
  p.state='fall';p.vx=clamp((state.cart-p.prevCart)*7,-1,1)+extra;p.vy=.025;p.vz=0;
  p.spin=(p.type==='tube'?1.25:.54)*Math.sign(state.gripOffset||.1)+p.tilt*.8;
  p.releaseAt=time;p.bounces=0;p.lipWait=0;p.rollClock=0;
  const c=p.contactX??0;
  for(const off of [-.3,.3])if(!p.crease.some(v=>Math.abs(v-(c+off))<.06)&&p.crease.length<12)p.crease.push(c+off);
  p.grip=Math.max(.04,p.grip);
  state.held=null;state.swayV+=state.gripOffset*1.3;state.canCatch=false;
}
function findCatch(dt){
  const s=state;if(s.close<.12||s.lift>.11||s.held||!s.thread||!s.canCatch)return;
  let best=null,score=Infinity;
  for(const p of parcels){
    if(!['floor','desk'].includes(p.state))continue;const v=p.root.position,dx=s.cart-v.x;
    if(Math.abs(dx)>extentX(p)+.11||Math.abs(v.z-LANE)>p.d*.5+.19)continue;
    const d=Math.abs(dx)+.75*Math.abs(v.z-LANE);
    if(d<score){score=d;best=p}
  }
  if(!best)return;
  const p=best,off=s.cart-p.root.position.x;
  if(s.close<.52){
    if(p.type==='pouch'&&Math.abs(off)>.21){const f=off>0?-1:1;p.yaw+=f*.48*dt;p.root.position.x+=f*.09*dt}
    return;
  }
  s.held=p;s.gripOffset=off;s.gripStart=s.cart;s.catchY=p.root.position.y;
  s.gripZ=p.root.position.z-LANE;s.catchTilt=p.tilt;s.supportCatch=!!p.restOn;
  s.slip=0;s.catchYaw=p.yaw;p.contactX=off*Math.cos(p.yaw)/p.scale;
  p.prevCart=s.cart;p.state='held';audioFx.play('rub',.39);
}
function heldMotion(dt){
  const s=state,p=s.held;if(!p)return;
  const pos=p.root.position,offset=s.gripOffset,lean=clamp(offset/(extentX(p)+.05),-1,1);
  p.grip=damp(p.grip,s.close,17,dt);
  const lifting=smooth(.012,.30,s.lift);
  const slipping=smooth(.04,.30,s.slip);
  p.tilt=damp(p.tilt,mix(s.catchTilt,lean*(.93+.40*slipping),lifting),10,dt);
  pos.x=s.cart-offset*Math.cos(p.tilt)-Math.sign(offset)*slipping*.145;
  pos.z=LANE+s.gripZ*(1-lifting*.34);pos.y=s.catchY+s.lift-slipping*.14+Math.abs(Math.sin(p.tilt))*p.w*.20;
  const movement=Math.abs(p.prevCart-s.cart),stability=(s.supportCatch?.24:0)+(p.type==='tube'?.50:.68);
  if(s.lift>.06)s.slip+=Math.max(0,Math.abs(lean)-stability)*(movement*2.9+dt*.24);
  for(const q of parcels){
    if(q===p||!['floor','desk'].includes(q.state)||movement<.0001)continue;
    const v=q.root.position;if(Math.abs(v.x-pos.x)>extentX(q)+extentX(p)-.08||Math.abs(v.z-pos.z)>(q.d+p.d)*.40)continue;
    if(pos.y-p.h>v.y+q.h-.018)continue;
    const dir=Math.sign(s.cart-p.prevCart);q.root.position.x=clamp(v.x+dir*movement*.34,-2.26,2.26);
    q.tilt=damp(q.tilt,-dir*.55,8,dt);q.yaw+=dir*movement*.36;
    p.roll+=movement*dir*1.7;s.slip+=movement*Math.abs(lean)*.36;
    if(time-(s.lastKnock||0)>.35){audioFx.play('drop',.22);s.lastKnock=time}
  }
  if(s.close<.30||s.slip>.30){releaseHeld(s.slip>.30?-Math.sign(offset)*.30:0);return}
  p.prevCart=s.cart;
}
function settleDish(p,dt){
  const v=p.root.position;
  const zEnd=toWorld(dish,0,.72,.063).z;
  const onSlope=v.z<toWorld(dish,0,0,.06).z;
  if(onSlope)p.vz+=dt*(p.type==='tube'?2.15:1.70);
  p.vz*=Math.exp(-dt*(onSlope?.81:2.9));p.vz=Math.min(1.55,p.vz);
  if(!onSlope&&p.vz<.06){p.state='dish';p.vz=0;return}
  if(p.type!=='tube')p.roll=damp(p.roll,onSlope?.245:0,9,dt);
  v.z+=p.vz*dt;v.x+=p.vx*dt;
  v.x=clamp(v.x,EXIT-.45,EXIT+.45);
  v.y=damp(v.y,floorHeight(v.x,v.z)+p.h,20,dt);
  p.tilt=damp(p.tilt,0,6,dt);
  if(p.type==='tube'){
    p.roll+=p.vz*Math.cos(p.yaw)*dt/p.h;p.rollClock-=dt;if(p.rollClock<=0){audioFx.play('roll',.22*p.vz);p.rollClock=.17/Math.max(.24,p.vz)}
  }
  for(const q of parcels){
    if(q===p||q.state!=='dish')continue;
    const dx=v.x-q.root.position.x,dz=v.z-q.root.position.z;
    if(Math.abs(dx)>(extentX(p)+extentX(q))*.77||dz>=.02||dz<-(p.d+q.d)*.43)continue;
    q.root.position.x=clamp(q.root.position.x-Math.sign(dx||.1)*.09,EXIT-.48,EXIT+.48);q.yaw-=Math.sign(dx||.1)*.06;
    p.yaw+=Math.sign(dx||.1)*.20;p.vx=Math.sign(dx||.1)*.21;
    p.state='dish';p.vz=0;audioFx.play('drop',.3);break;
  }
  if(v.z>zEnd-p.d*.23){v.z=zEnd-p.d*.23;p.vz=0;p.state='dish';audioFx.play('drop',.35)}
}
function updateParcels(dt){
  if(state.tension<.17)state.canCatch=true;
  findCatch(dt);heldMotion(dt);
  for(const p of parcels){
    const pos=p.root.position;
    if(p.state==='moving'){
      p.travel=clamp(p.travel+dt*2.75);
      pos.lerpVectors(p.from,p.to,smooth(0,1,p.travel));pos.y+=Math.sin(p.travel*PI)*p.arc;
      if(p.travel>=1){p.state=p.goalState;p.tilt=p.savedTilt||0;audioFx.play('drop',.35)}
    }
    if(p.state==='fall'){
      p.vy-=4.95*dt;pos.y+=p.vy*dt;pos.x+=p.vx*dt;pos.z+=p.vz*dt;
      p.tilt+=p.spin*dt;p.yaw+=p.spin*.32*dt;
      const tilt=p.tilt,h=support(p)+p.h+Math.abs(Math.sin(tilt))*p.w*.24;
      if(pos.y<=h&&p.vy<0){
        pos.y=h;audioFx.play('drop',clamp(-p.vy*.30,.16,.75));
        if(Math.abs(pos.x-EXIT)<.65&&mouth.angle>.27){
          p.state='slide';p.vz=.34;p.rollClock=0;p.vx*=.33;
        }else if(pos.x+extentX(p)>EXIT-.63&&pos.x<EXIT-.63&&mouth.angle>.27){
          p.state='lip';p.lipWait=.28;p.vx=.05*Math.sign(p.tilt||.1);
        }else if(p.type==='tube'&&p.bounces===0&&p.vy<-.6){
          p.vy=-p.vy*.25;p.vx+=Math.sign(p.spin)*.36;p.spin*=-.43;p.bounces++;
        }else{
          p.state='settling';p.vx+=clamp(p.spin,-1,1)*(p.type==='tube'?.22:.08);p.vy=0;p.rollClock=0;
        }
      }
    }else if(p.state==='lip'){
      p.lipWait-=dt;const dir=pos.x+Math.sin(p.tilt)*p.w*.23>EXIT-.63?1:-1;
      p.tilt-=dir*dt*.96;
      if(p.lipWait<0){pos.x+=dir*.14;p.state=dir>0?'slide':'settling';p.vz=.32;p.vx=dir*.25;p.rollClock=0}
    }else if(p.state==='settling'){
      pos.x=clamp(pos.x+p.vx*dt,-W/2+p.w*.30,W/2-p.w*.30);
      p.vx*=Math.exp(-3.4*dt);
      p.tilt=damp(p.tilt,0,5.5,dt);pos.y=damp(pos.y,support(p)+p.h,12,dt);
      if(p.type==='tube'){p.roll+=p.vx*dt/p.h;p.rollClock-=dt;if(p.rollClock<=0&&Math.abs(p.vx)>.09){audioFx.play('roll',Math.abs(p.vx)*.5);p.rollClock=.067/Math.abs(p.vx)}}
      if(Math.abs(p.vx)<.015){p.state='floor';p.vx=0}
    }else if(p.state==='slide')settleDish(p,dt);
    if(p.state!=='held'&&p.grip>.0004){p.grip=damp(p.grip,0,9,dt)}
    if(Math.abs((p.lastGrip||0)-p.grip)>.002||p.needsCrease){
      crumple(p,p.grip,p.contactX||0);p.lastGrip=p.grip;p.needsCrease=false;
    }
    if(p.state!=='tray')p.root.rotation.set(p.roll,p.yaw,p.tilt,'YZX');
    const sh=p.shadow,base=p.state==='tray'?.104:floorHeight(pos.x,pos.z);
    const gap=Math.max(0,pos.y-base-p.h);
    sh.position.set(pos.x+.10*gap,base+.008,pos.z+.20*gap);sh.rotation.z=p.root.rotation.y;
    sh.scale.set(p.w*(1.33+gap*.65),p.d*(1.48+gap*.75),1);sh.material.opacity=.69/(1+3.4*gap);
  }
}
function hintTarget(){
  if(action)return null;
  if(!state.rail){
    if(state.editing&&state.arm)return arm;
    const order=[back,left,right,front,mouth];
    const p=order.find(p=>p.angle<p.max*.925&&p.target<p.max*.94);if(p)return p;
    return rail;
  }
  if(!state.arm)return arm;if(!state.thread)return aglet;
  if(!parcels.some(p=>!['tray','dish'].includes(p.state)))return parcels.find(p=>p.state==='tray')||parcels[0];
  return loopCord.obj;
}
function hintPoints(target){
  if(target?.hinge){
    const p=target,h=p===back?1.32:p===mouth?1.12:p===front?.36:1.69;
    const x=p===front?1.73:0;
    return [toWorld(p.hinge,x,h,.09),toWorld(p.root,x,h*.94,-h*.27)];
  }
  if(target===rail)return [toWorld(rail,-2.48,.19,0),v3(-2.53,railY()+.08,railZ())];
  if(target===arm)return [toWorld(arm,0,.09,.16),state.arm?restArm.clone():toWorld(carriage,0,-.15,.17)];
  if(target===aglet)return [aglet.position.clone(),toWorld(carriage,0,.21,.34)];
  if(target===loopCord.obj)return [ringCenter.clone().add(v3(.13,-.18,.04)),ringCenter.clone().add(v3(.26,-.61,.18))];
  if(target?.wrapper)return [target.root.position.clone().add(v3(0,target.h,0)),v3(-1.45,.4,LANE)];
  return null;
}
const touchGuide=group(kit);
const guideMat=new T.MeshStandardMaterial({color:0xffeddb,roughness:.64,transparent:true,opacity:0,depthWrite:false});
const fingerPad=mesh(touchGuide,new T.CapsuleGeometry(.139,.21,6,20),guideMat);fingerPad.rotation.z=-.42;fingerPad.rotation.x=.38;fingerPad.castShadow=fingerPad.receiveShadow=false;
function updateHint(){
  const target=hintTarget(),phase=(idle-4)%6.1;
  touchGuide.visible=!!target&&idle>4&&phase<2.48;
  if(touchGuide.visible){
    const q=hintPoints(target);if(!q){touchGuide.visible=false;return}
    const f=smooth(.42,1.88,phase);touchGuide.position.lerpVectors(q[0],q[1],f);
    touchGuide.position.y+=.19+.09*(1-smooth(.02,.35,phase))+.08*Math.sin(PI*f);
    guideMat.opacity=.34*smooth(0,.32,phase)*(1-smooth(1.92,2.48,phase));
  }
  const pulse=target&&idle>1?(.5+.5*Math.sin(time*2.4)):0;
  for(const p of parcels)p.mat.emissive.setRGB(target===p?.07*pulse:0,target===p?.039*pulse:0,target===p?.012*pulse:0);
  sleeve.material[0]=target===rail?litStock:pulp;
  hook.material[0]=target===arm?litStock:lightKraft;
  litStock.emissiveIntensity=.11*pulse;
  cordMat.emissive.setHex(0xffdc95);cordMat.emissiveIntensity=target===loopCord.obj?.065*pulse:0;
  aglet.children[0].material=target===aglet?litStock:pulp;
}
const litStock=lightKraft.clone();litStock.onBeforeCompile=lightKraft.onBeforeCompile;litStock.emissive.setHex(0xffce83);
function boundsPoints(play){
  const pts=[];
  if(play){
    for(const x of [-2.9,2.90])for(const z of [-1.02,1.04]){pts.push(v3(x,.05,z),v3(x,2.42,z))}
    pts.push(toWorld(dish,-.8,.92,.1),toWorld(dish,.8,.92,.1));
    if(!state.peek||state.inspectDesk){
      for(const x of [-tw/2,tw/2])for(const z of [-td/2,td/2])pts.push(toWorld(tray,x,.34,z));
    }
    return pts;
  }
  for(const p of panels){
    const geo=p.surface.geometry;if(!geo.boundingBox)geo.computeBoundingBox();const b=geo.boundingBox;
    for(const x of [b.min.x,b.max.x])for(const y of [b.min.y,b.max.y])pts.push(toWorld(p.hinge,x,y,.08));
  }
  for(const x of [-tw/2-.1,tw/2+.1])for(const z of [-td/2-.1,td/2+.1])pts.push(toWorld(tray,x,.34,z));
  for(const x of [-2.8,2.8])pts.push(toWorld(rail,x,.12,.13));
  pts.push(toWorld(dish,0,.93,.1),toWorld(arm,0,-1.04,.11),threadOrigin.clone().add(v3(0,0,1.51)));
  for(const p of parcels)if(p.state==='desk')pts.push(p.root.position.clone());
  return pts;
}
function fitView(points,yaw,elevation,marginX,marginY){
  const out=v3(Math.sin(yaw)*Math.cos(elevation),Math.sin(elevation),Math.cos(yaw)*Math.cos(elevation));
  const rightVec=v3(Math.cos(yaw),0,-Math.sin(yaw)),up=v3().crossVectors(out,rightVec);
  const tx=Math.tan(camera.fov*PI/360)*camera.aspect*marginX,ty=Math.tan(camera.fov*PI/360)*marginY;
  let xlo=Infinity,xhi=-Infinity,ylo=Infinity,yhi=-Infinity;
  for(const p of points){
    const z=p.dot(out),x=p.dot(rightVec),y=p.dot(up);
    xlo=Math.min(xlo,x-z*tx);xhi=Math.max(xhi,x+z*tx);ylo=Math.min(ylo,y-z*ty);yhi=Math.max(yhi,y+z*ty);
  }
  const dist=Math.max((xhi-xlo)/(2*tx),(yhi-ylo)/(2*ty));
  const center=rightVec.multiplyScalar((xlo+xhi)*.5).addScaledVector(up,(ylo+yhi)*.5);
  const average=points.reduce((n,p)=>n+p.dot(out),0)/points.length;
  return {eye:center.clone().addScaledVector(out,dist),focus:center.clone().addScaledVector(out,average)};
}

function updateCamera(dt){
  const s=state;const playing=s.thread&&s.rail;
  s.view=damp(s.view,s.peek&&playing?1:0,2.3,dt);
  const close=s.view;
  const yaw=playing?mix(portrait?-.16:-.21,-.125,close):portrait?-1.26:-.26;
  const elev=playing?mix(.756,.022,close):portrait?.89:.875;
  const f=fitView(boundsPoints(playing),yaw,elev,portrait?.918:.925,portrait?.88:.89);
  // At the exit the near lip is just below the claw, with an unbroken view down the chute.
  if(playing&&close>.01){
    f.eye.y=mix(f.eye.y,1.17,close);
    f.focus.y=mix(f.focus.y,1.13,close);
  }
  const rate=initialCamera?1:1-Math.exp(-dt*(playing?2.75:3.3));
  camPos.lerp(f.eye,rate);camFocus.lerp(f.focus,rate);
  camera.position.copy(camPos);camera.lookAt(camFocus);camera.updateMatrixWorld();initialCamera=false;
}
function setRay(e){
  const r=canvas.getBoundingClientRect();
  pointer.set((e.clientX-r.left)/r.width*2-1,1-(e.clientY-r.top)/r.height*2);
  ray.setFromCamera(pointer,camera);
}
function project(p){const v=p.clone().project(camera);return new T.Vector2((v.x+1)*canvas.clientWidth/2,(1-v.y)*canvas.clientHeight/2)}
function pixelDistance(e,p){const a=project(p);return Math.hypot(e.clientX-a.x,e.clientY-a.y)}
function planeHit(normal,through){
  const plane=new T.Plane().setFromNormalAndCoplanarPoint(normal,through);return ray.ray.intersectPlane(plane,v3());
}
function deskPoint(y=.16){return planeHit(v3(0,1,0),v3(0,y,0))}
function hit(e){
  if(state.thread&&state.rail){
    const cp=project(ringCenter),pt=project(ringCenter.clone().add(v3(0,.45,.02))),side=project(ringCenter.clone().add(v3(.25,0,0)));
    if(Math.pow((e.clientX-cp.x)/Math.max(16,Math.abs(side.x-cp.x)+7),2)+Math.pow((e.clientY-cp.y)/Math.max(22,Math.abs(pt.y-cp.y)+10),2)<1.10)return {kind:'ring',point:ringCenter.clone()};
  }
  const choices=[];
  function allow(root,kind,item=null){choices.push({root,kind,item})}
  if(!state.rail&&!state.arm)for(const p of panels)allow(p.root,'panel',p);
  if(allFolded()||state.rail||state.editing)allow(rail,'rail');
  if((state.rail&&!state.arm)||(!state.rail&&state.arm))allow(arm,'arm');
  if(state.arm&&!state.thread){allow(aglet,'thread');allow(runningCord.obj,'thread');allow(loopCord.obj,'thread');allow(knot,'thread')}
  if(state.thread||state.editing)for(const p of parcels)if(!['held','moving','fall','slide','drag'].includes(p.state))allow(p.root,'parcel',p);
  const hits=ray.intersectObjects(choices.map(c=>c.root),true);
  for(const h of hits){
    let o=h.object;
    while(o){const choice=choices.find(c=>c.root===o);if(choice){
      if(choice.kind==='rail'&&state.rail&&Math.abs(rail.worldToLocal(h.point.clone()).x)<2.17)break;
      return {...choice,point:h.point};
    }o=o.parent}
  }
  if(state.arm&&!state.thread&&pixelDistance(e,aglet.position)<21)return {kind:'thread',point:aglet.position.clone()};
  return null;
}
function assignRail(high){
  state.high=high;state.inspectDesk=false;state.rail=true;state.editing=false;state.peek=false;audioFx.play('snap',.64);
}
function removeRail(){
  if(state.held)releaseHeld();state.rail=false;state.peek=false;state.editing=true;state.pull=0;
  audioFx.play('rub',.75);
}
function nextSpot(p,desired){
  const u=clamp(desired,-W/2+p.w*.43,1.26-p.w*.37);
  const places=parcels.filter(q=>q!==p&&['floor','settling','moving'].includes(q.state)).map(q=>({x:q.state==='moving'?q.to.x:q.root.position.x,w:extentX(q)}));
  let best=u,cost=Infinity;
  for(let x=-W/2+p.w*.45;x<=1.30-p.w*.38;x+=.045){
    let c=Math.abs(x-u)*.13;
    for(const q of places)c+=Math.max(0,q.w+extentX(p)+.035-Math.abs(q.x-x))*3;
    if(c<cost){cost=c;best=x}
  }
  return best;
}
function moveParcel(p,to,zone,arc=.48){
  p.from=p.root.position.clone();p.to=to;p.travel=0;p.arc=arc;p.savedTilt=p.tilt;p.goalState=zone;p.state='moving';p.restOn=null;
}
function dropParcel(p,target,dragged){
  const startState=action.origin;
  if(!target)target=p.root.position;
  const atTray=tray.worldToLocal(target.clone());
  if(dragged&&Math.abs(atTray.x)<tw*.52&&Math.abs(atTray.z)<td*.55){
    p.trayX=clamp(atTray.x,-tw*.38,tw*.38);p.trayZ=clamp(atTray.z,-td*.32,td*.32);
    p.savedTilt=0;moveParcel(p,toWorld(tray,p.trayX,p.h+.105,p.trayZ),'tray',.16);return;
  }
  if(dragged&&startState==='dish'&&Math.abs(target.x-EXIT)<.85&&target.z>1.45){
    const x=clamp(target.x,EXIT-.46,EXIT+.46),z=clamp(target.z,1.66,2.43);
    moveParcel(p,v3(x,floorHeight(x,z)+p.h,z),'dish',.09);return;
  }
  if(dragged&&state.editing&&!state.rail&&(Math.abs(target.x)>2.65||Math.abs(target.z)>1.06)){
    moveParcel(p,v3(clamp(target.x,-5.2,5.2),p.h+.018,clamp(target.z,-3.1,3.5)),'desk',.13);return;
  }
  const x=nextSpot(p,dragged?target.x:state.cart);
  moveParcel(p,v3(x,FLOOR+p.h,LANE+(dragged?clamp(target.z-LANE,-.14,.14):0)),'floor',dragged?.18:1.05);
}
canvas.addEventListener('pointerdown',e=>{
  if(action||e.button!==0)return;audioFx.start();setRay(e);
  const h=hit(e);if(!h)return;
  canvas.setPointerCapture(e.pointerId);idle=0;const pos=h.point;
  action={...h,id:e.pointerId,x:e.clientX,y:e.clientY,lastX:e.clientX,lastY:e.clientY,ndc:pointer.clone(),moved:false,world:pos.clone(),start:pos.clone(),offset:v3(),elapsed:0};
  const a=action;
  if(h.kind==='panel'){
    const p=h.item;a.initial=p.angle;p.touch.copy(p.hinge.worldToLocal(pos.clone()));p.press=1;p.target=clamp(p.angle+(p.angle>p.max*.85?-.12:.135),0,p.max);p.velocity=p.angle>p.max*.85?-.65:.87;
    audioFx.play('rub',.54);
  }else if(h.kind==='ring'){
    a.cart=state.cart;a.startPull=state.pull;a.grabOffset=ringCenter.clone().sub(pos);a.maxPull=state.pull;a.previous=state.cart;
    const raw=ringCenter.clone().project(camera);a.grabOffset=ringCenter.clone().sub(v3(pointer.x,pointer.y,raw.z).unproject(camera));
    a.frameRight=project(ringCenter.clone().add(v3(1,0,0))).sub(project(ringCenter));
    a.pullPixels=clamp(canvas.clientHeight*.20,100,168);a.pullCoord=0;state.swayV+=.12;audioFx.play('cord',.12);
  }else if(h.kind==='parcel'){
    a.origin=h.item.state;a.original=h.item.root.position.clone();a.offset.copy(h.item.root.position).sub(pos);
    h.item.state='drag';h.item.root.position.y+=.046;audioFx.play('rub',.37);
  }else{
    a.offset.copy(h.kind==='rail'?rail.position:h.kind==='arm'?arm.position:aglet.position).sub(pos);
    a.wasMounted=state.rail;a.oldHigh=state.high;
    if(h.kind==='rail'&&state.rail){state.peek=false;state.editing=true;state.pull=0;if(state.held)releaseHeld()}
    audioFx.play('rub',.4);
  }
});
function nearestSocket(e,a){
  let best=null;
  for(const high of [false,true])for(const side of [-1,1]){
    const p=v3(side*W/2,high?2.385:1.895,high?-.315:.335);
    const pix=project(p);
    const d=Math.hypot(pix.x-e.clientX,pix.y-e.clientY);
    // A child can also hold the middle of the long beam and line up its ends.
    const end=toWorld(rail,side*W/2,0,0),ePix=project(end);
    const ed=Math.hypot(ePix.x-pix.x,ePix.y-pix.y);
    const dist=Math.min(d,ed+5);
    if(!best||dist<best.d)best={high,d:dist,p};
  }return best;
}
canvas.addEventListener('pointermove',e=>{
  if(!action){if(e.pointerType==='mouse'){setRay(e);canvas.style.cursor=hit(e)?'grab':'default'}return}
  const a=action;if(e.pointerId!==a.id)return;setRay(e);a.ndc.copy(pointer);
  const dx=e.clientX-a.x,dy=e.clientY-a.y;
  if(Math.hypot(dx,dy)>5)a.moved=true;if(!a.moved)return;idle=0;canvas.style.cursor='grabbing';
  if(a.kind==='panel'){
    const p=a.item;const p0=project(toWorld(p.root,0,0,-1)),p1=project(toWorld(p.root,0,1,0)),dir=p1.sub(p0),len=dir.length();dir.normalize();
    let travel=dx*dir.x+dy*dir.y;
    if(Math.abs(travel)<Math.hypot(dx,dy)*.32)travel=(a.initial>p.max*.7?-1:1)*Math.hypot(dx,dy)*.63;
    p.angle=clamp(a.initial+travel/Math.max(45,len*.95)*p.max,0,p.max+.018);p.target=p.angle;p.velocity=0;audioFx.play('rub',.45);
  }else if(a.kind==='ring'){
    const horiz=dx/(a.frameRight.x||1);
    const cart=clamp(a.cart+horiz,-2.23,2.31),delta=cart-state.cart;
    state.swayV=clamp(state.swayV+delta*.85,-1.4,1.4);state.cart=cart;
    const along=dy-horiz*a.frameRight.y;
    // A sliding dead band on the rope retains the grip during a lateral sweep.
    const raw=along/a.pullPixels+a.startPull;
    if(raw>a.pullCoord+.025)a.pullCoord=raw-.025;
    if(raw<a.pullCoord-.105)a.pullCoord=raw+.105;
    state.pull=clamp(a.pullCoord);
    if(Math.abs(state.pull-lastTwang)>.155){audioFx.play('cord',state.pull);lastTwang=state.pull}
    if(cart>=1.43&&!state.peek){state.peek=true;state.swayV+=.13}
  }else if(a.kind==='parcel'){
    const pos=deskPoint(.26+a.item.h);if(pos){
      a.world.copy(pos);a.item.root.position.copy(pos).add(v3(0,.23,0));a.item.tilt=damp(a.item.tilt,(e.clientX-a.lastX)*-.012,14,.03);
    }
  }else{
    const normal=camera.getWorldDirection(v3()),loc=planeHit(normal,a.start);
    if(loc)a.world.copy(loc);
    if(a.kind==='rail'&&a.wasMounted&&Math.hypot(dx,dy)>9){state.editing=true;state.rail=false}
    if(a.kind==='rail'){
      const q=nearestSocket(e,a);
      if(q.d<29)a.world.lerp(q.p.clone().sub(v3(Math.sign(q.p.x)*W/2,0,0)).sub(a.offset),.40);
    }
  }
  a.lastX=e.clientX;a.lastY=e.clientY;
});
function endPointer(e,cancel){
  const a=action;if(!a||e.pointerId!==a.id)return;
  setRay(e);idle=0;canvas.style.cursor='grab';
  if(a.kind==='panel'){
    const p=a.item;p.press=0;
    if(a.moved||cancel){
      const f=p.angle/p.max;const to=f<.23?0:f>.65?1:.45;p.target=to*p.max;
    }else p.target=a.initial/p.max>.87?0:p.max;
    if(p.target<.02)state.editing=true;p.velocity=0;audioFx.play('rub',.46);
  }else if(a.kind==='rail'){
    if(cancel){state.rail=a.wasMounted;state.high=a.oldHigh}
    else if(!a.moved&&a.wasMounted)removeRail();
    else if(allFolded()){
      const q=nearestSocket(e,a);
      if(!a.moved||q.d<Math.max(58,canvas.clientWidth*.085))assignRail(a.moved?q.high:state.editing?!a.oldHigh:a.oldHigh);
      else removeRail();
    }else removeRail();
  }else if(a.kind==='arm'&&!cancel){
    if(state.arm){releaseHeld();state.arm=false;state.thread=false;state.pull=0;state.peek=false;audioFx.play('rub',.6)}
    else if(state.rail&&(!a.moved||pixelDistance(e,toWorld(carriage,0,-.18,.18))<Math.max(62,canvas.clientWidth*.12))){state.arm=true;audioFx.play('snap',.57)}
  }else if(a.kind==='thread'&&!cancel){
    if(state.arm&&(!a.moved||pixelDistance(e,toWorld(carriage,0,.12,.36))<Math.max(62,canvas.clientWidth*.11))){state.thread=true;state.swayV=.8;audioFx.play('cord',.52)}
  }else if(a.kind==='parcel'){
    if(cancel)moveParcel(a.item,a.original,a.origin,.10);else dropParcel(a.item,deskPoint(FLOOR),a.moved);
  }else if(a.kind==='ring'){
    if(state.peek)state.inspectDesk=true;
    if(!a.moved&&!cancel){state.tapUntil=time+.64;state.pull=.69}
    else state.pull=0;
    state.swayV+=clamp((e.clientX-a.x)*.001,-.48,.48);audioFx.play('cord',.18);
  }
  if(a.moved&&(a.kind==='rail'||a.kind==='arm')){
    const obj=a.kind==='rail'?rail:arm;
    obj.userData.settling={position:obj.position.clone(),rotation:obj.quaternion.clone(),amount:1};
  }
  if(a.kind==='ring'&&a.moved)state.ringReturn={pos:ringCenter.clone(),time};
  if(a.kind==='thread'&&a.moved)state.threadReturn={offset:a.world.clone().sub(laidString()[0]),time};
  action=null;if(canvas.hasPointerCapture(e.pointerId))canvas.releasePointerCapture(e.pointerId);
}
canvas.addEventListener('pointerup',e=>endPointer(e,false));
canvas.addEventListener('pointercancel',e=>endPointer(e,true));
canvas.addEventListener('lostpointercapture',e=>{if(action?.id===e.pointerId)endPointer(e,true)});
canvas.addEventListener('contextmenu',e=>e.preventDefault());
let previous=0;
function frame(now){
  const dt=Math.min(.036,Math.max(.001,(now-previous)*.001||.016));previous=now;time+=dt;idle=action?0:idle+dt;
  if(state.tapUntil&&time>state.tapUntil){state.tapUntil=0;if(action?.kind!=='ring')state.pull=0}
  layout(false);lamplight.value=time;
  updatePanels(dt);updateRig(dt);hangerPose();updateParcels(dt);
  updateCamera(dt);updateCord();updateHint();
  renderer.render(scene,camera);requestAnimationFrame(frame);
}
layout(true);requestAnimationFrame(frame);
