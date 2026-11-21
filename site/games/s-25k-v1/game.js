'use strict';
(()=>{
  const {T,TAU,v,m,group,mesh,block,orb,pad,shadow}=Craft;
  const {world,path,sync}=Kit, clamp=T.MathUtils.clamp, mix=T.MathUtils.lerp;
  const canvas=document.getElementById('table');
  const renderer=new T.WebGLRenderer({canvas,antialias:true,alpha:false,powerPreference:'high-performance'});
  renderer.setPixelRatio(Math.min(window.devicePixelRatio||1,2));
  renderer.shadowMap.enabled=true;renderer.shadowMap.type=T.PCFShadowMap;
  renderer.outputColorSpace=T.SRGBColorSpace;renderer.toneMapping=T.ACESFilmicToneMapping;renderer.toneMappingExposure=1.06;
  const scene=new T.Scene();scene.background=new T.Color(0xe3ddc9);scene.fog=new T.FogExp2(0xe4dfc8,.016);
  const portrait=innerWidth/innerHeight<.87;
  const W=portrait?7.18:12.55,D=portrait?11.45:8.18,board=group(scene);
  Workshop.environment(renderer,scene);Workshop.make(scene,board,W,D,portrait);
  const pieces=[],pads=[];
  function place(kind,len,x,z,a,h0,h1){
    const p=Kit.piece(board,kind,len,x,z,a,h0,h1);pieces.push(p);return p;
  }
  function matAt(x,z,w,d,a){
    const g=group(board);g.position.set(x,0,z);g.rotation.y=-a;const nap=pad(g,w,d);pads.push({g,x,z,w,d,a,nap,press:0});return g;
  }
  function local(x,z,cx,cz,a){
    const dx=x-cx,dz=z-cz,c=Math.cos(a),s=Math.sin(a);
    return {x:dx*c+dz*s,z:-dx*s+dz*c};
  }
  function floorAt(x,z){
    for(const q of pads){const l=local(x,z,q.x,q.z,q.a);if(Math.abs(l.x)<q.w/2-.03&&Math.abs(l.z)<q.d/2-.03)return .107;}
    return Math.abs(x)<=W/2&&Math.abs(z)<=D/2?0:-.328;
  }
  const jitter=()=>(Math.random()-.5)*.085;
  const startAngle=portrait?1.12:.43,bridgeLength=3.14;
  const start=place('launch',1.82,portrait?-2.57:-4.40,portrait?-4.72:-2.72,startAngle,2.72,2.46);
  const lip=world(start,1);
  const bridgeEnd={x:lip.x+Math.cos(startAngle)*bridgeLength,z:lip.z+Math.sin(startAngle)*bridgeLength};
  const bend=place('bend',1,bridgeEnd.x,bridgeEnd.z,startAngle,1.51,1.38);
  const spareAngle=(portrait?1.51:-.19)+jitter(),padX=portrait?-2.57:-3.38,padZ=portrait?.59:1.67;
  matAt(padX,padZ,portrait?3.83:4.17,1.62,spareAngle);
  const bridge=place('straight',bridgeLength,padX-Math.cos(spareAngle)*bridgeLength/2,padZ-Math.sin(spareAngle)*bridgeLength/2,spareAngle,.52,.46);
  let spiral,wheel,extra;
  if(portrait){
    matAt(1.69,-3.57,2.78,3.25,-.08);
    spiral=place('spiral',1,1.58+jitter(),-4.42+jitter(),-.16+jitter(),1.66,.46);
    matAt(1.80,2.03,2.74,4.92,.015);
    wheel=place('wheel',1.94,1.05+jitter(),2.95,.01+jitter(),.58,.45);
    extra=place('short',1.9,.90,.78,.12+jitter(),.56,.45);
  }else{
    matAt(4.17,-.44,3.60,6.62,-.04);
    spiral=place('spiral',1,3.99+jitter(),-3.04+jitter(),-.16+jitter(),1.72,.47);
    wheel=place('wheel',2.04,3.16+jitter(),.60+jitter(),-.18+jitter(),.64,.45);
    extra=place('short',1.95,3.29+jitter(),2.12+jitter(),-.13+jitter(),.57,.45);
  }
  const bendEnd=world(bend,1);
  const tray=Kit.tray(board,bendEnd.x+Math.cos(bendEnd.a)*1.83,bendEnd.z+Math.sin(bendEnd.a)*1.83,bendEnd.a-Math.PI/2);
  function trayLocal(x,z){return local(x,z,tray.x,tray.z,tray.angle);}
  function inTray(x,z,margin=0){
    const l=trayLocal(x,z),hw=tray.w/2-.105-margin,hd=tray.d/2-.105-margin,rad=.46;
    return Math.hypot(Math.max(Math.abs(l.x)-hw+rad,0),Math.max(Math.abs(l.z)-hd+rad,0))<=rad;
  }
  for(const p of pieces){p.base=floorAt(world(p,.5).x,world(p,.5).z);sync(p);}

  const R=.222,G=10.8,marble=Workshop.marble(board,R);
  marble.userData.action={type:'ball'};marble.rotation.set(.19,.2,-.48);
  const ball={mode:'home',p:null,t:0,speed:0,lane:0,v:v(),pos:v(),hop:0,kick:0,seam:0,laps:0,carry:null,lastHit:null};
  const grasp=orb(marble,portrait?.31:.264,m.ivory);grasp.visible=false;
  const ballShade=shadow(board,0,0,.72,.56);
  function vec(s){return v(s.x,s.y,s.z);}
  function seat(p,t,lat=0){const s=world(p,t,lat);return v(s.x,s.y+R,s.z);}
  ball.pos.copy(seat(start,.019));ball.pos.y+=.025;
  let simTime=0,lastInput=0,lastFrame=0,drag=null,auto=null,selected=null,low=0,wantedLow=0;
  let taughtBridge=false,builtOnce=false,runs=0,heightExplored=false;
  let releaseSite={p:start,t:.06};
  const camera=new T.PerspectiveCamera(34,1,.065,100);
  let topDistance=16,viewInit=false;
  const lookAt=v(),eye=v();
  function camDirection(){return v(0,portrait?1.73:.91,1).normalize();}
  function resize(){
    const w=canvas.clientWidth||innerWidth,h=canvas.clientHeight||innerHeight;renderer.setSize(w,h,false);
    camera.aspect=w/h;camera.updateProjectionMatrix();
    const target=v(0,.43,portrait?-.05:-.14),dir=camDirection();
    // Fit the actual board and elevated launch, including perspective at its near corners.
    const bounds=[...[-1,1].flatMap(x=>[-1,1].map(z=>v(x*(W/2+.2),0,z*(D/2+.17)))),seat(start,0),seat(spiral,.1)];
    let lo=5,hi=48;
    for(let i=0;i<23;i++){
      const d=(lo+hi)/2;camera.position.copy(target).addScaledVector(dir,d);camera.lookAt(target);camera.updateMatrixWorld();
      if(bounds.every(pt=>{const a=pt.clone().project(camera);return Math.abs(a.x)<.953&&a.y<.89&&a.y>-.91;}))hi=d;else lo=d;
    }
    topDistance=hi;
    if(!viewInit){eye.copy(target).addScaledVector(dir,hi);lookAt.copy(target);viewInit=true;}
    camera.position.copy(eye);camera.lookAt(lookAt);camera.updateMatrixWorld();
  }
  resize();window.addEventListener('resize',resize);
  function updateCam(dt){
    if(drag&&drag.kind!=='ball')return;
    low=mix(low,wantedLow,1-Math.exp(-dt*(wantedLow?1.08:1.55)));
    const upper=v(0,.43,portrait?-.05:-.14),sp=world(spiral,.5);
    const at=upper.clone().lerp(v(sp.x*.61,.75,sp.z*.67),low);
    const front=camDirection().lerp(v(0,.24,1).normalize(),low).normalize();
    const distance=mix(topDistance,Math.max(portrait?10.6:8.8,topDistance*.72),low);
    const aim=at.clone().addScaledVector(front,distance);
    eye.lerp(aim,1-Math.exp(-dt*5.1));lookAt.lerp(at,1-Math.exp(-dt*5.1));camera.position.copy(eye);camera.lookAt(lookAt);camera.updateMatrixWorld();
  }

  function norm(a){return Math.atan2(Math.sin(a),Math.cos(a));}
  function unlink(p){
    for(let end=0;end<2;end++){const l=p.links[end];if(l){l.p.links[l.end]=null;p.links[end]=null;l.p.reachTarget=.02;l.p.wiggle=.13;}}
    p.reachTarget=.02;
  }
  function link(p,end,q,other){
    if(p.links[end]||q.links[other]||p===q)return;
    p.links[end]={p:q,end:other};q.links[other]={p,end};(end?p:q).reachTarget=.234;
    p.wiggle=.085;q.wiggle=.065;if(start.links[1]?.p===bridge)builtOnce=true;
    TimberSound.tap(470,.29);
  }
  function pairFor(p){
    let best=null;
    for(const q of pieces)if(q!==p){
      for(let end=0;end<2;end++){
        const other=1-end;if(q.links[other]||p.links[end]||q===start&&other===0)continue;
        const a=world(p,end),b=world(q,other),dist=Math.hypot(a.x-b.x,a.z-b.z);
        const score=dist+.035*Math.min(2,Math.abs(b.y-a.y));
        if(!best||score<best.score)best={p,end,q,other,dist,score};
      }
    }
    return best;
  }
  function alignPose(p,end,q,other){
    const b=world(q,other),s=path(p,end),a=b.a-s.a;
    const x=b.x-s.x*Math.cos(a)+s.z*Math.sin(a),z=b.z-s.x*Math.sin(a)-s.z*Math.cos(a);
    let drop=p.h0-p.h1;
    if(p.kind==='spiral')drop=1.12;
    else if(p===bridge&&q===start)drop=b.y-bend.h0;
    else if(p===bridge&&q===bend)drop=start.h1-b.y;
    else drop=clamp(drop,-.6,p.kind==='straight'?1.8:.65);
    const h0=end?clamp(b.y+drop,.32,3.40):b.y,h1=end?b.y:clamp(b.y-drop,.31,3.38);
    return {x,z,a,h0,h1};
  }
  function underFinger(d){
    const p=d.p,grab=d.grab;
    let best=null;
    for(const q of pieces)if(q!==p){
      for(const end of [0,1]){
        const other=1-end;
        if(q.links[other]||q===start&&other===0)continue;
        const pose=alignPose(p,end,q,other),c=Math.cos(pose.a),s=Math.sin(pose.a);
        const px=pose.x+grab.x*c-grab.z*s,pz=pose.z+grab.x*s+grab.z*c;
        const at=planePoint(mix(pose.h0,pose.h1,grab.t)+grab.height);
        if(!at)continue;
        const dist=Math.hypot(at.x-px,at.z-pz);
        const firstSpan=!builtOnce&&p===bridge&&(q===start||q===bend);
        if(dist<(firstSpan?.82:.40)&&(!best||dist<best.dist))best={p,end,q,other,dist,pose,firstSpan};
      }
    }
    return best;
  }
  function keepOnBoard(p,target){
    let minX=0,maxX=0,minZ=0,maxZ=0;
    const steps=p.kind==='spiral'?16:p.kind==='bend'?5:1;
    for(let i=0;i<=steps;i++){
      const s=world(p,i/steps),x=s.x-p.x,z=s.z-p.z;
      minX=Math.min(minX,x);maxX=Math.max(maxX,x);minZ=Math.min(minZ,z);maxZ=Math.max(maxZ,z);
    }
    target.x=clamp(target.x,-W/2+.37-minX,W/2-.37-maxX);
    target.z=clamp(target.z,-D/2+.37-minZ,D/2-.37-maxZ);
  }
  function fit(p,target,k){
    p.x=mix(p.x,target.x,k);p.z=mix(p.z,target.z,k);p.angle+=norm(target.a-p.angle)*k;
    p.h0=mix(p.h0,target.h0,k);p.h1=mix(p.h1,target.h1,k);
  }
  function attach(p,pair){
    if(!pair||pair.q.links[pair.other])return;
    fit(p,alignPose(p,pair.end,pair.q,pair.other),1);p.lift=0;link(p,pair.end,pair.q,pair.other);
    const other=1-pair.end,s=world(p,other);
    for(const q of pieces){
      if(q===p||q===pair.q||q.links[1-other])continue;
      const b=world(q,1-other);
      if(Math.hypot(b.x-s.x,b.z-s.z)<.28&&Math.abs(norm(s.a-b.a))<.45){
        p[other?'h1':'h0']=b.y;link(p,other,q,1-other);break;
      }
    }
    sync(p);
  }
  function setHeight(p,end,value){
    const key=end?'h1':'h0',members=[{p,end}],l=p.links[end];if(l)members.push(l);
    let min=.32,max=3.36;
    for(const item of members){
      const q=item.p,opp=q[item.end?'h0':'h1'];
      const reach=q.kind==='spiral'?1.78:q.kind==='bend'?.74:q.len*.66;
      min=Math.max(min,opp-reach,(q.base||0)+.32);max=Math.min(max,opp+reach);
      if(q.kind==='spiral'){if(item.end)max=Math.min(max,opp-.78);else min=Math.max(min,opp+.78);}
    }
    const h=clamp(value,min,max);
    for(const item of members){item.p[item.end?'h1':'h0']=h;sync(item.p);}
    return h;
  }
  function easeOut(t){return t*t*(3-2*t);}
  function automate(p,q){
    if(p===start||!q||q===p||q.links[1])return;
    unlink(p);const target=alignPose(p,0,q,1);
    auto={p,q,from:{x:p.x,z:p.z,a:p.angle,h0:p.h0,h1:p.h1},target,t:0};
    selected=null;
  }
  function lastRail(){
    let p=start;const seen=new Set([p]);while(p.links[1]&&!seen.has(p.links[1].p)){p=p.links[1].p;seen.add(p);}return p;
  }
  function updateAuto(dt){
    if(!auto)return;
    const u=auto,p=u.p;u.t=Math.min(1,u.t+dt/1.02);const f=easeOut(u.t);
    p.x=mix(u.from.x,u.target.x,f);p.z=mix(u.from.z,u.target.z,f);p.angle=u.from.a+norm(u.target.a-u.from.a)*f;
    p.h0=mix(u.from.h0,u.target.h0,f);p.h1=mix(u.from.h1,u.target.h1,f);p.lift=Math.sin(f*Math.PI)*.46;
    sync(p);
    if(u.t===1){attach(p,{end:0,q:u.q,other:1});p.settle=1;auto=null;}
  }
  function nearest(p,x,z,y){
    const l=local(x,z,p.x,p.z,p.angle),candidates=[];
    if(p.kind==='spiral'){
      let a=Math.atan2(l.x,.91-l.z);if(a<0)a+=TAU;candidates.push(a/TAU,0,1);
    }else if(p.kind==='bend')candidates.push(clamp(Math.atan2(l.x,1.29-l.z)/p.arc,0,1));
    else candidates.push(clamp(l.x/p.len,0,1));
    let best=null;
    for(const t of candidates){const s=world(p,t),dx=x-s.x,dz=z-s.z,d=Math.hypot(dx,dz);
      const score=d+(y===undefined?0:Math.abs(y-s.y)*.35);
      if(!best||score<best.score)best={p,t,s,d,score,lat:-dx*Math.sin(s.a)+dz*Math.cos(s.a)};
    }
    return best;
  }
  function ride(p,t,speed=0,lane=0){
    ball.mode='rail';ball.p=p;ball.t=t;ball.speed=speed;ball.lane=clamp(lane,-.15,.15);
    ball.pos.copy(seat(p,t,ball.lane));ball.previous={x:p.x,z:p.z,a:p.angle,y:world(p,t).y};
    ball.lastHit=null;ball.seam=0;ball.hop=0;
    if(p.kind==='spiral')wantedLow=1;
  }
  function rotateBall(a,ds){
    marble.rotateOnWorldAxis(v(Math.sin(a),0,-Math.cos(a)),ds/R);
  }
  function fly(p,t) {
    const s=world(p,t),slope=(p.h1-p.h0)/p.len,vel=ball.speed/Math.sqrt(1+slope*slope);
    ball.v.set(Math.cos(s.a)*vel,vel*slope,Math.sin(s.a)*vel);ball.mode='air';ball.depart=p;ball.releaseTime=simTime;
  }
  function railStep(dt) {
    const p=ball.p,old=ball.t,prev=ball.previous;
    if(Math.abs(p.x-prev.x)+Math.abs(p.z-prev.z)+Math.abs(p.angle-prev.a)>.00001||p.lift>.09){
      const n=nearest(p,ball.pos.x,ball.pos.z,ball.pos.y-R);
      if(n.d>.31||n.s.y<ball.pos.y-R-.085){
        fly(p,old);return;
      }
      ball.t=n.t;ball.lane=n.lat;
    }else if(world(p,old).y<prev.y-.052){fly(p,old);return;}
    const dy=p.h1-p.h0,L=Math.hypot(p.len,dy);
    const a=-G*.73*dy/L;let speed=ball.speed+a*dt;
    const loss=(.126+.017*speed*speed)*dt;
    speed=Math.sign(speed)*Math.max(0,Math.abs(speed)-loss);ball.speed=speed;
    const ds=speed*dt;ball.t+=ds/L;
    if(p.kind==='wheel'&&ball.lastHit!==p&&((old-.5)*(ball.t-.5)<=0||Math.abs(ball.t-.5)<.023)){
      const depth=.52+.48*Math.cos(p.wheelA*6),push=Math.abs(speed)*(.40+.65*depth);
      p.wheelV+=Math.sign(speed||1)*push;p.free=push>1.7&&Math.random()<.10;
      ball.speed*=.94-.17*depth;ball.lastHit=p;TimberSound.tap(315+depth*85,.14+Math.min(.37,push*.094));
    }
    if(p.kind==='spiral'&&Math.floor(old*12)!==Math.floor(ball.t*12))TimberSound.tap(390+50*Math.cos(ball.t*TAU),.054+Math.abs(speed)*.016,false,true);
    if(ball.t>=1||ball.t<0){
      const end=ball.t>=1?1:0,l=p.links[end];ball.t=end;
      ball.pos.copy(seat(p,end,ball.lane));
      if(l){const excess=Math.abs(ds)/L;ride(l.p,l.end===0?excess*.17:1-excess*.17,ball.speed*.989,ball.lane*.6);ball.hop=.13;TimberSound.tap(505,.16);}
      else fly(p,end);
      return;
    }
    const s=world(p,ball.t),outward=(p.kind==='bend'||p.kind==='spiral')?-Math.min(.117,speed*speed*.009):0;
    ball.lane=mix(ball.lane,outward,1-Math.exp(-dt*5));
    ball.pos.copy(seat(p,ball.t,ball.lane));if(ball.hop>0){ball.hop-=dt;ball.pos.y+=Math.max(0,Math.sin(Math.PI*ball.hop/.13))*.047;}
    rotateBall(s.a,ds);
    ball.previous={x:p.x,z:p.z,a:p.angle,y:s.y};
  }
  const fibers=[],scarTexture=(()=>{
    const c=document.createElement('canvas');c.width=128;c.height=64;const g=c.getContext('2d');
    g.save();g.translate(64,32);g.scale(1,.46);const s=g.createRadialGradient(0,0,1,0,0,61);
    s.addColorStop(0,'rgba(20,57,52,.49)');s.addColorStop(.56,'rgba(30,62,54,.25)');s.addColorStop(1,'rgba(48,74,61,0)');
    g.fillStyle=s;g.fillRect(-64,-70,128,140);g.restore();
    for(let i=0;i<170;i++){const x=(Math.random()-.5)*110,y=(Math.random()-.5)*51;if((x/52)**2+(y/22)**2>1)continue;
      g.strokeStyle=i%3?'rgba(185,196,157,.28)':'rgba(35,78,70,.33)';g.lineWidth=.6;g.beginPath();g.moveTo(x+64,y+32);g.lineTo(x+68+Math.random()*6,y+32+(Math.random()-.5)*3);g.stroke();}
    return new T.CanvasTexture(c);
  })();
  const scarMat=new T.MeshBasicMaterial({map:scarTexture,transparent:true,depthWrite:false,polygonOffset:true,polygonOffsetFactor:-2});
  const scarGeo=new T.PlaneGeometry(.53,.34),fiberGeo=new T.SphereGeometry(.012,5,4);
  function markTray(x,z,a,strength,fluff=false){
    const l=trayLocal(x,z);if(!inTray(x,z,.025))return;
    const cloth=tray.nap.geometry,verts=cloth.attributes.position,c=Math.cos(a-tray.angle),s=Math.sin(a-tray.angle);
    for(let i=0;i<verts.count;i++){
      const x=verts.getX(i)-l.x,z=verts.getZ(i)-l.z;
      const along=x*c+z*s,across=-x*s+z*c,dist=(along/.238)**2+(across/.14)**2;
      if(dist<4)verts.setY(i,Math.min(verts.getY(i),.273-.021*Math.exp(-dist)));
    }
    verts.needsUpdate=true;cloth.computeVertexNormals();
    const scar=group(tray.marks);scar.position.set(l.x,.274+Math.random()*.001,l.z);scar.rotation.y=-(a-tray.angle);
    const mesh=new T.Mesh(scarGeo,scarMat);mesh.rotation.x=-Math.PI/2;scar.add(mesh);scar.scale.setScalar(.63+Math.min(strength,3)*.14);
    if(fluff)for(let i=0;i<6;i++){
      const f=new T.Mesh(fiberGeo,i%2?m.pad:m.cord);f.scale.set(.6,1.5,.55);f.position.set(l.x,.29,l.z);tray.root.add(f);
      fibers.push({f,v:v((Math.random()-.5)*.8,.29+Math.random()*.59,(Math.random()-.5)*.8),time:0});
    }
  }
  function onSurface(type){
    ball.mode=type;ball.bounces=0;ball.settled=false;ball.surfaceDir=Math.atan2(ball.v.z,ball.v.x);
    if(type==='tray'){
      markTray(ball.pos.x,ball.pos.z,ball.surfaceDir,ball.v.length(),true);
      ball.v.multiplyScalar(.76);ball.local=trayLocal(ball.pos.x,ball.pos.z);runs++;
    }
    ball.v.y=0;ball.pos.y=(type==='tray'?.274:floorAt(ball.pos.x,ball.pos.z))+R;
  }
  function airStep(dt) {
    const prev=ball.pos.clone();ball.v.y-=G*dt;ball.pos.addScaledVector(ball.v,dt);
    const {x,y,z}=ball.pos;
    if(ball.v.y<.15){
      let landed=null;
      for(const p of pieces){
        if(p===ball.depart&&simTime-ball.releaseTime<.115)continue;
        const n=nearest(p,x,z,y-R);
        if(n.d>.32||p.lift>.17||n.s.y>prev.y-R+.027||n.s.y<y-R-.015)continue;
        if(!landed||n.s.y>landed.s.y)landed=n;
      }
      if(landed){
        const {p,t,s,lat}=landed,slope=(p.h1-p.h0)/p.len;
        const speed=(ball.v.x*Math.cos(s.a)+ball.v.z*Math.sin(s.a)+ball.v.y*slope)/Math.sqrt(1+slope*slope);
        ride(p,clamp(t,.001,.999),speed*.92,lat);ball.hop=.13;TimberSound.tap(448,.19);return;
      }
    }
    const inside=inTray(x,z),floor=inside?.275:floorAt(x,z);
    if(y-R<=floor&&ball.v.y<0){
      const impact=-ball.v.y;ball.pos.y=floor+R;
      TimberSound.tap(inside?179:252,Math.min(.54,impact*.095),inside);
      if(inside&&impact>1.75&&!ball.feltBounce){
        ball.feltBounce=true;markTray(x,z,Math.atan2(ball.v.z,ball.v.x),impact,true);
        ball.v.y=impact*.126;ball.v.x*=.74;ball.v.z*=.74;
      }else onSurface(inside?'tray':'ground');
    }
    rotateBall(Math.atan2(ball.v.z,ball.v.x),Math.hypot(ball.v.x,ball.v.z)*dt);
  }
  function surfaceStep(dt){
    const isTray=ball.mode==='tray',spd=Math.hypot(ball.v.x,ball.v.z);
    if(isTray&&ball.local){
      const l=ball.local,c=Math.cos(tray.angle),s=Math.sin(tray.angle);
      ball.pos.x=tray.x+l.x*c-l.z*s;ball.pos.z=tray.z+l.x*s+l.z*c;
    }
    if(spd<.004){ball.v.set(0,0,0);
      if(!ball.settled&&isTray)markTray(ball.pos.x,ball.pos.z,ball.surfaceDir,.95);
      ball.settled=true;return;
    }
    const old=ball.pos.clone(),a=Math.atan2(ball.v.z,ball.v.x);
    const sp=Math.max(0,spd-dt*((isTray?3.9:2.1)+(isTray?.78:.32)*spd));
    ball.v.multiplyScalar(sp/spd);ball.pos.addScaledVector(ball.v,dt);
    if(isTray){
      if(!inTray(ball.pos.x,ball.pos.z,R*.65)){
        const l=trayLocal(ball.pos.x,ball.pos.z);
        const nx=Math.sign(l.x)*Math.max(0,Math.abs(l.x)-(tray.w*.5-.57)),nz=Math.sign(l.z)*Math.max(0,Math.abs(l.z)-(tray.d*.5-.57));
        const n=v(nx*Math.cos(tray.angle)-nz*Math.sin(tray.angle),0,nz*Math.cos(tray.angle)+nx*Math.sin(tray.angle)).normalize();
        ball.v.addScaledVector(n,-1.23*Math.max(0,ball.v.dot(n)));ball.v.multiplyScalar(.72);ball.pos.copy(old);TimberSound.tap(214,.10,true);
      }
      ball.local=trayLocal(ball.pos.x,ball.pos.z);
    }else{
      if(inTray(ball.pos.x,ball.pos.z)&&!inTray(old.x,old.z)){
        ball.pos.copy(old);ball.v.multiplyScalar(-.23);
      }
      const maxX=W/2+.62,maxZ=D/2+.4;
      if(Math.abs(ball.pos.x)>maxX){ball.pos.x=clamp(ball.pos.x,-maxX,maxX);ball.v.x*=-.3;}
      if(Math.abs(ball.pos.z)>maxZ){ball.pos.z=clamp(ball.pos.z,-maxZ,maxZ);ball.v.z*=-.3;}
      const floor=floorAt(ball.pos.x,ball.pos.z);
      if(floor+R<ball.pos.y-.08){ball.mode='air';ball.depart=null;return;}
      ball.pos.y=floor+R;
    }
    rotateBall(a,sp*dt);ball.surfaceDir=a;
  }
  function recall(){
    ball.carry={from:ball.pos.clone(),t:0};ball.mode='return';wantedLow=0;ball.feltBounce=false;
  }
  function physics(dt){
    if(ball.mode==='rail')railStep(dt);
    else if(ball.mode==='air')airStep(dt);
    else if(ball.mode==='ground'||ball.mode==='tray')surfaceStep(dt);
    else if(ball.mode==='return'){
      const c=ball.carry;c.t=Math.min(1,c.t+dt/.77);const k=easeOut(c.t);
      ball.pos.copy(c.from).lerp(seat(releaseSite.p,releaseSite.t),k);ball.pos.y+=Math.sin(k*Math.PI)*.74;rotateBall(start.angle,dt*.46);
      if(c.t===1){ride(releaseSite.p,releaseSite.t,0);ball.carry=null;TimberSound.tap(530,.12);}
    }else if(ball.mode==='home'){ball.pos.copy(seat(start,.019));ball.pos.y+=.026;}
  }

  const ray=new T.Raycaster(),screen=new T.Vector2(),hPlane=new T.Plane(v(0,1,0),0);
  const pickables=[marble,tray.root,...pieces.map(p=>p.root)];
  function setRay(e){
    const r=canvas.getBoundingClientRect();screen.set((e.clientX-r.left)/r.width*2-1,1-(e.clientY-r.top)/r.height*2);
    ray.setFromCamera(screen,camera);
  }
  function planePoint(h){hPlane.constant=-h;return ray.ray.intersectPlane(hPlane,v());}
  function action(o){
    while(o){if(o.userData.action)return o.userData.action;o=o.parent;}return null;
  }
  function hit(){
    const hits=ray.intersectObjects(pickables,true);for(const h of hits){if(h.object.material===undefined)continue;const a=action(h.object);if(a)return {...a,point:h.point};}return null;
  }
  function rayTrack(){
    const surfaces=ray.intersectObjects(pieces.map(p=>p.rail),false);
    if(!surfaces.length)return null;
    const h=surfaces[0],p=action(h.object).p;return nearest(p,h.point.x,h.point.z,h.point.y);
  }
  function continueHint(){lastInput=simTime;}
  function tapPiece(p){
    if(p===start){if(ball.mode==='home'||ball.mode==='tray'||ball.mode==='ground')recall();return;}
    if(p===bridge&&!taughtBridge){
      taughtBridge=true;selected=p;p.h0=Math.max(p.h0,.88);p.lift=.10;p.settle=1;
      TimberSound.tap(252,.23,true);return;
    }
    if(selected===p&&!p.links[0]&&!p.links[1]){
      const q=lastRail();if(q!==p&&!q.links[1]){automate(p,q);return;}
    }
    if(p.links[0]||p.links[1]){
      const e=p.links[0]?0:1;setHeight(p,e,p[e?'h1':'h0']+.19*(p.tweakDir||1));
      if(p.h0>2.95||p.h1>2.85)p.tweakDir=-1;if(p.h0<.60)p.tweakDir=1;
    }else{p.h0=Math.min(2.6,p.h0+.15);p.settle=1;}
    selected=p;TimberSound.tap(296,.20);
  }
  function down(e){
    if(drag||!e.isPrimary||e.button>0)return;
    TimberSound.wake();setRay(e);const hitObj=hit();continueHint();if(!hitObj)return;
    if(auto&&hitObj.type!=='ball'){auto.p.lift=0;auto=null;}
    const {point,p}=hitObj;let type=hitObj.type;
    if(type==='body'&&p.kind==='bend'&&p.links[0]&&nearest(p,point.x,point.z,point.y).t>.73){
      type='handle';hitObj.end=1;
    }
    drag={id:e.pointerId,kind:type,p,end:hitObj.end,px:e.clientX,py:e.clientY,cx:e.clientX,cy:e.clientY,
      point:point.clone(),moved:false,age:0,released:false,detached:false,initialY:point.y,originalMode:ball.mode};
    canvas.setPointerCapture(e.pointerId);
    if(type==='ball'){
      drag.oldMode=ball.mode;drag.oldP=ball.p;drag.oldT=ball.t;drag.offset=ball.pos.clone().sub(point);
      drag.ballY=ball.pos.y+.18;drag.target=ball.pos.clone();drag.target.y+=.18;
      ball.mode='held';ball.v.set(0,0,0);ball.feltBounce=false;
      TimberSound.tap(700,.105);
    }else if(type==='body'){
      drag.origin={x:p.x,z:p.z,h:p.h0,a:p.angle};drag.offset=v(p.x-point.x,0,p.z-point.z);
      const contact=nearest(p,point.x,point.z,point.y);
      drag.grab={...local(point.x,point.z,p.x,p.z,p.angle),t:contact.t,height:point.y-contact.s.y};
      drag.target=v(p.x,0,p.z);drag.pad=pads.find(q=>{const l=local(point.x,point.z,q.x,q.z,q.a);return Math.abs(l.x)<q.w/2&&Math.abs(l.z)<q.d/2;});
      if(p!==start){p.lift=Math.max(.025,p.lift);if(drag.pad){
        const pad=drag.pad,l=local(point.x,point.z,pad.x,pad.z,pad.a),verts=pad.nap.geometry.attributes.position;
        pad.compression=new Float32Array(verts.count);
        for(let i=0;i<verts.count;i++)pad.compression[i]=.026*Math.exp(-((verts.getX(i)-l.x)**2/.56+(verts.getZ(i)-l.z)**2/.27));
      }TimberSound.tap(220,.14,true);}
    }else if(type==='handle'){
      drag.h=p[drag.end?'h1':'h0'];drag.angle=p.angle;
      drag.endpoint=world(p,drag.end);drag.axis=null;
      const t=vec(drag.endpoint).project(camera),u=vec(drag.endpoint);u.y+=1;u.project(camera);
      drag.pixelsPerUnit=Math.max(17,Math.abs(u.y-t.y)*canvas.clientHeight/2);p.wiggle=.09;
      TimberSound.tap(415,.13);
    }else{
      drag.offset=v(tray.x-point.x,0,tray.z-point.z);drag.target=v(tray.x,0,tray.z);
      tray.rock=.026*Math.sign(point.z-tray.z||1);
      drag.startAngle=Math.atan2(point.z-tray.z,point.x-tray.x);drag.trayAngle=tray.angle;
      TimberSound.tap(193,.13,true);
    }
  }
  function move(e){
    if(!drag||drag.id!==e.pointerId)return;
    updatePointer(e);
  }
  function updatePointer(e) {
    const d=drag;setRay(e);d.cx=e.clientX;d.cy=e.clientY;
    const dx=d.cx-d.px,dy=d.cy-d.py;
    if(!d.moved&&Math.hypot(dx,dy)<5)return;
    d.moved=true;continueHint();const p=d.p;
    if(d.kind==='ball'){
      const n=rayTrack();d.over=n;
      if(low>.05&&(dy< -7||n?.p===start))wantedLow=0;
      if(n){d.target=seat(n.p,n.t,n.lat*.35);d.target.y+=.20;}
      else {const floor=planePoint(.26+R);if(floor)d.target=floor;}
      d.target.x=clamp(d.target.x,-W/2-.28,W/2+.28);d.target.z=clamp(d.target.z,-D/2-.22,D/2+.22);
      if(wantedLow&&(n?.p===start||Math.hypot(d.target.x-start.x,d.target.z-start.z)<2.5))wantedLow=0;
    }else if(d.kind==='body'&&p!==start){
      const q=planePoint(d.initialY);if(!q)return;
      d.target.set(q.x+d.offset.x,0,q.z+d.offset.z);keepOnBoard(p,d.target);
      if(!d.detached){
        d.detached=true;d.detachWait=p.links.some(Boolean)?.105:0;
        unlink(p);taughtBridge||=p===bridge;
      }
    }else if(d.kind==='handle'){
      if(!d.axis)d.axis=p.kind==='bend'&&d.end===1&&Math.abs(dx)>Math.abs(dy)*.72?'rotate':'height';
      if(d.axis==='rotate'){
        const q=planePoint(d.endpoint.y);if(q){if(p.links[1]){const l=p.links[1];l.p.links[l.end]=null;p.links[1]=null;p.reachTarget=.02;}
          const s=path(p,1);p.angle=Math.atan2(q.z-p.z,q.x-p.x)-Math.atan2(s.z,s.x);sync(p);}
      }else{
        const h=setHeight(p,d.end,d.h-dy/d.pixelsPerUnit);
        if(Math.abs(h-d.h)>.08)heightExplored=true;
        if(Math.abs(h-(d.h-dy/d.pixelsPerUnit))>.04&&!d.stop){TimberSound.tap(265,.14);d.stop=true;}
      }
    }else if(d.kind==='tray'){
      const q=planePoint(d.initialY);if(q)d.target.set(clamp(q.x+d.offset.x,-W/2+tray.w*.45,W/2-tray.w*.45),0,clamp(q.z+d.offset.z,-D/2+tray.d*.43,D/2-tray.d*.43));
    }else if(d.kind==='trayTurn'){
      const q=planePoint(d.initialY);if(q)tray.angle=d.trayAngle+norm(Math.atan2(q.z-tray.z,q.x-tray.x)-d.startAngle);
      tray.root.rotation.y=-tray.angle;
    }
  }
  function dragStep(dt){
    if(!drag)return;
    const d=drag,p=d.p;d.age+=dt;
    if(d.kind==='body'&&p!==start){
      if(!d.moved){
        p.lift=mix(p.lift,p.links.some(Boolean)?0:.165,1-Math.exp(-dt*12));
        if(p===bridge&&!taughtBridge){p.h0=mix(p.h0,d.origin.h+.34,1-Math.exp(-dt*9));}
        sync(p);return;
      }
      if(d.detachWait>0){d.detachWait-=dt;return;}
      const k=1-Math.exp(-dt*13.7);
      // Magnetic alignment is continuous. The grab point remains under the finger
      // until an end is within reach of its neighbour.
      p.x=mix(p.x,d.target.x,k);p.z=mix(p.z,d.target.z,k);
      p.lift=mix(p.lift,.22,k);p.base=0;
      let pair=pairFor(p);
      if(pair&&pair.dist<.46){
        const pull=easeOut(clamp(1-(pair.dist-.095)/.365,0,1));
        const pose=alignPose(p,pair.end,pair.q,pair.other);
        fit(p,pose,(1-Math.exp(-dt*13))*pull);
        p.lift=mix(p.lift,.016,k*pull);const tongue=pair.end?p:pair.q;
        tongue.reachTarget=.04+.16*pull;tongue.wiggle=Math.sin(simTime*29)*.11*(1-pull);
      }
      // A raised joint and a loose rail live on different depth planes. Test
      // the grabbed point at the joint's real elevation as well as on the felt.
      const fingerPair=underFinger(d);
      if(fingerPair){
        const radius=fingerPair.firstSpan?.82:.4,weight=1-easeOut(fingerPair.dist/radius);
        fit(p,fingerPair.pose,1-Math.exp(-dt*(16+weight*48)));
        p.lift=mix(p.lift,.022,k);pair=fingerPair;
      }
      d.pair=pair;sync(p);
    }else if(d.kind==='ball'){
      if(d.moved&&low>.002)updatePointer({clientX:d.cx,clientY:d.cy});
      const old=ball.pos.clone();ball.pos.lerp(d.target,1-Math.exp(-dt*24));
      rotateBall(start.angle,old.distanceTo(ball.pos)*.48);
    }else if(d.kind==='tray'){
      const k=1-Math.exp(-dt*22);tray.x=mix(tray.x,d.target.x,k);tray.z=mix(tray.z,d.target.z,k);tray.root.position.set(tray.x,0,tray.z);
    }
  }
  function up(e,cancel=false){
    if(!drag||drag.id!==e.pointerId)return;
    if(!cancel)updatePointer(e);const d=drag,p=d.p;
    if(d.kind==='body'&&p!==start&&d.moved&&d.detached&&!cancel){
      // Quick swipes finish their travel visibly after the finger has lifted.
      d.released=true;d.releasedAt=simTime;return;
    }
    if(d.kind==='body'){
      if(!d.moved&&!cancel)tapPiece(p);p.settle=1;
    }else if(d.kind==='ball'){
      if(cancel){ball.mode='air';ball.depart=null;}
      else if(!d.moved){if(d.oldMode==='home'){ride(start,.04,0);TimberSound.tap(518,.15);}
        else if(d.oldMode==='rail'&&d.oldP===start){ride(start,.05,0);}else recall();}
      else{
        const n=rayTrack();if(n){releaseSite={p:n.p,t:clamp(n.t,.008,.992)};ride(n.p,releaseSite.t,0,n.lat*.5);TimberSound.tap(512,.16);}
        else {const q=planePoint(R+.34);if(q)ball.pos.copy(q);ball.mode='air';ball.depart=null;}
        if(n?.p===start){wantedLow=0;}
      }
    }else if(d.kind==='handle'&&!d.moved&&!cancel){
      heightExplored=true;p.tapWay=p.tapWay||1;const prev=p[d.end?'h1':'h0'];
      const h=setHeight(p,d.end,prev+.26*p.tapWay);
      if(Math.abs(h-prev)<.12||h>3.05||h<.51)p.tapWay*=-1;
      p.settle=.48;TimberSound.tap(340,.16);
    }else if(d.kind==='trayTurn'&&!d.moved&&!cancel){tray.angle+=.14;tray.root.rotation.y=-tray.angle;}
    continueHint();drag=null;
  }
  function finishDrag(){
    if(!drag?.released||simTime-drag.releasedAt<.23)return;
    const {p}=drag,pair=drag.pair;
    if(pair&&pair.dist<(pair.firstSpan?.94:.245))attach(p,pair);
    else {p.h0=clamp(p.h0,.42,3.35);p.h1=clamp(p.h1,.34,3.35);}
    p.settle=1;selected=p;TimberSound.tap(232,.21);drag=null;continueHint();
  }
  canvas.addEventListener('pointerdown',down);
  canvas.addEventListener('pointermove',move);
  canvas.addEventListener('pointerup',e=>up(e));
  canvas.addEventListener('pointercancel',e=>up(e,true));
  canvas.addEventListener('contextmenu',e=>e.preventDefault());
  // A translucent, fingertip-sized contact patch demonstrates one gesture at a time.
  const hint=group(board),touchMat=new T.MeshPhysicalMaterial({color:0xfff0cb,roughness:.27,transparent:true,opacity:0,depthWrite:false,clearcoat:.6});
  const contact=orb(hint,.153,touchMat);contact.scale.set(.83,.34,1.20);contact.castShadow=false;
  const hintShadow=shadow(hint,0,0,.48,.50,-.061);hintShadow.material=hintShadow.material.clone();
  const marbleFinish=marble.children[0].material;
  function shine(focus,intensity){
    for(const p of pieces){p.glaze.emissive.setHex(0xe6ac55);p.glaze.emissiveIntensity=p===focus?intensity:0;}
    marbleFinish.emissive.setHex(0xffecc4);marbleFinish.emissiveIntensity=focus===marble?intensity*.52:0;
  }
  function guidance(){
    if(drag||auto||ball.mode==='rail'||ball.mode==='air'||ball.mode==='return'||ball.mode==='held'){hint.visible=false;shine(null,0);return;}
    const idle=simTime-lastInput;
    let src,dst,focus;
    if(!start.links[1]){
      focus=bridge;src=seat(bridge,.40);src.y-=R-.20;
      const b=world(start,1);dst=v(b.x+Math.cos(b.a)*bridge.len*.4,b.y-.18,b.z+Math.sin(b.a)*bridge.len*.4);
    }else if(ball.mode==='home'||ball.mode==='ground'||ball.mode==='tray'){
      if((heightExplored||runs>=2)&&!spiral.links[0]&&lastRail()!==spiral){
        focus=spiral;src=seat(spiral,.34);dst=vec(world(lastRail(),1));dst.y+=.20;
      }else if(spiral.links[0]&&!wheel.links[0]){
        focus=wheel;src=seat(wheel,.50);dst=vec(world(spiral,1));dst.y+=.20;
      }else if(runs===1&&ball.settled&&idle>4){focus=bridge;src=vec(world(bridge,0,.48));src.y+=.07;dst=src.clone();dst.y-=.43;}
      else{focus=marble;src=ball.pos.clone();src.y+=R*.8;dst=seat(start,.12);dst.y+=.15;}
    }
    if(!src){hint.visible=false;return;}
    shine(focus,clamp(idle-.55,0,1)*(.085+.072*Math.sin(simTime*2.8)));
    if(idle<4){hint.visible=false;return;}
    const t=(idle-4)%4.6;
    hint.visible=t<3.38;
    if(!hint.visible)return;
    const f=easeOut(clamp((t-.59)/1.72,0,1));
    hint.position.copy(src).lerp(dst,f);hint.position.y+=Math.sin(Math.PI*f)*.29+.045;
    hint.scale.setScalar(1-.18*Math.sin(Math.PI*clamp(t/.65,0,1)));
    touchMat.opacity=.43*clamp(t/.36,0,1)*clamp((3.38-t)/.46,0,1);
    hintShadow.material.opacity=touchMat.opacity*.37;
  }
  function animation(dt){
    tray.rock=(tray.rock||0)*Math.exp(-dt*(drag?.kind==='tray'?3:12));
    tray.root.rotation.x=tray.rock;
    for(const pad of pads){
      const pressed=drag?.pad===pad&&!drag.moved;pad.press=mix(pad.press,pressed?1:0,1-Math.exp(-dt*(pressed?24:5)));
      if(pad.compression){
        const g=pad.nap.geometry,pos=g.attributes.position;
        for(let i=0;i<pos.count;i++)pos.setY(i,.106-pad.press*pad.compression[i]);
        pos.needsUpdate=true;g.computeVertexNormals();
        if(pad.press<.001&&!pressed)pad.compression=null;
      }
    }
    for(const p of pieces){
      if(!p.links[1]&&(!drag||drag.kind!=='body'))p.reachTarget=.025;
      p.reach=mix(p.reach,p.reachTarget,1-Math.exp(-dt*(p.reachTarget<p.reach?32:11)));
      p.wiggle*=Math.exp(-dt*9);
      if(p.settle){p.settle=Math.max(0,p.settle-dt*2.65);p.wiggle=Math.sin((1-p.settle)*Math.PI*2)*p.settle*.062;}
      if(p.kind==='wheel'){
        const prev=p.wheelA;
        const w=Math.max(0,Math.abs(p.wheelV)*Math.exp(-(p.free?.25:.40)*dt)-dt*.026);
        p.wheelV=Math.sign(p.wheelV)*w;p.wheelA+=p.wheelV*dt;
        if(Math.floor(prev*6/TAU)!==Math.floor(p.wheelA*6/TAU)&&w>.14)TimberSound.tap(208+Math.min(130,w*12),Math.min(.12,.026+w*.014));
      }
      if(drag?.p!==p&&auto?.p!==p){
        const s=world(p,.5);p.base=floorAt(s.x,s.z);
        const lift=p===bridge&&!taughtBridge&&!start.links[1]&&simTime-lastInput>1.7?.024*(.5+.5*Math.cos((simTime-1.7)*2.7)):0;
        p.lift=mix(p.lift,lift,1-Math.exp(-dt*13));
      }
      sync(p);
    }
    for(let i=fibers.length-1;i>=0;i--){
      const f=fibers[i];f.time+=dt;f.v.y-=3.6*dt;f.f.position.addScaledVector(f.v,dt);f.f.rotation.z+=dt*3;
      if(f.f.position.y<.276||f.time>.8){tray.root.remove(f.f);fibers.splice(i,1);}
    }
    marble.position.copy(ball.pos);
    const base=inTray(ball.pos.x,ball.pos.z)?.277:floorAt(ball.pos.x,ball.pos.z)+.01;
    const gap=Math.max(0,ball.pos.y-base-R);
    ballShade.position.set(ball.pos.x+.14*gap,base+.004,ball.pos.z+.077*gap);
    ballShade.scale.set(1+gap*.37,1+gap*.37,1);
  }
  const tick=1/120;let debt=0;
  function frame(now){
    const dt=Math.min(.05,Math.max(.001,(now-(lastFrame||now-16.7))/1000));lastFrame=now;simTime+=dt;
    updateAuto(dt);dragStep(dt);finishDrag();animation(dt);
    debt+=dt;while(debt>=tick){physics(tick);debt-=tick;}
    marble.position.copy(ball.pos);guidance();updateCam(dt);
    const speed=ball.mode==='rail'?Math.abs(ball.speed):ball.mode==='tray'||ball.mode==='ground'?ball.v.length():0;
    TimberSound.roll(speed,ball.mode==='rail'?ball.p.kind:ball.mode,ball.pos.x,simTime);
    renderer.render(scene,camera);requestAnimationFrame(frame);
  }
  document.addEventListener('visibilitychange',()=>{if(document.hidden){TimberSound.roll(0,'ground',0,0);lastFrame=0;debt=0;}});
  requestAnimationFrame(frame);
})();
