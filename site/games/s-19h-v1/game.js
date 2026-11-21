'use strict';
(()=>{
  const S=Studio,K=Kitchen,T=THREE;
  const {PI,TAU,vec,mix,clamp,smooth,scene,camera,renderer,canvas,group,orb,contact}=S;
  const {world,pan,board,panY,boardY,stations,guests,layout}=K;
  const ray=new T.Raycaster(),plane=new T.Plane(vec(0,1,0),0),pointer=new T.Vector2();
  const burgers=[],history=[],flights=[];
  let burger,griddle,base,crown,drag=null,mode='kitchen',phase=0,handoff=null,viewMix=0,focus=0;
  let lastAction=0,time=0,burst=0,flips=0,lastGuest=null,pressedOnce=false,frame=0,viewport='';
  let pressure=0,pressureGoal=0,pressX=0,pressZ=0,pressPulse=0,layoutReady=false;
  let bottleReturn=null,activeGlow=null;
  const cameraTarget=vec(),cameraGoal=vec(),lookGoal=vec(),initialRay=vec();

  const sound=(()=>{
    let ctx=null,noiseBuffer,master,hiss,panGain;
    function start(){
      if(!ctx){let A=window.AudioContext||window.webkitAudioContext;if(!A)return;
        ctx=new A();master=ctx.createGain();master.gain.value=.43;master.connect(ctx.destination);
        noiseBuffer=ctx.createBuffer(1,ctx.sampleRate*1.7,ctx.sampleRate);let data=noiseBuffer.getChannelData(0),last=0;
        for(let i=0;i<data.length;i++){last=.38*last+.62*(Math.random()*2-1);data[i]=last}
        hiss=ctx.createBufferSource();hiss.buffer=noiseBuffer;hiss.loop=true;let f=ctx.createBiquadFilter();f.type='bandpass';f.frequency.value=3450;f.Q.value=.69;panGain=ctx.createGain();panGain.gain.value=0;hiss.connect(f).connect(panGain).connect(master);hiss.start();
      }if(ctx.state==='suspended')ctx.resume().catch(()=>{});
    }
    function tap(type,strength=.5,speed=0){
      if(!ctx||ctx.state!=='running')return;
      const now=ctx.currentTime;
      const voices={base:[118,.15,.43],crown:[109,.18,.43],tomato:[425,.085,.23],pickle:[518,.075,.20],cheese:[194,.11,.28],lettuce:[1150,.14,.36],patty:[166,.11,.36],sauce:[282,.075,.19],land:[96,.20,.31],sizzle:[2600,.14,.49]};
      let [hz,dur,vol]=voices[type]||voices.base;hz*=.91+.18*Math.random()+.14*clamp(speed)-.11*strength;
      const g=ctx.createGain();g.gain.setValueAtTime(.0001,now);g.gain.exponentialRampToValueAtTime(.05+vol*(.30+.48*clamp(strength)),now+.007);g.gain.exponentialRampToValueAtTime(.0001,now+dur);g.connect(master);
      if(type==='lettuce'||type==='sizzle'){
        const src=ctx.createBufferSource();src.buffer=noiseBuffer;let f=ctx.createBiquadFilter();f.type='bandpass';f.frequency.setValueAtTime(hz,now);f.frequency.exponentialRampToValueAtTime(hz*.69,now+dur);f.Q.value=.75;src.connect(f).connect(g);src.start(now,Math.random());src.stop(now+dur+.01);src.onended=()=>{src.disconnect();f.disconnect();g.disconnect()};
      }else{
        const osc=ctx.createOscillator();osc.type=type==='pickle'||type==='tomato'?'sine':'triangle';osc.frequency.setValueAtTime(hz,now);osc.frequency.exponentialRampToValueAtTime(hz*(type==='sauce'?1.34:.55),now+dur);osc.connect(g);osc.start(now);osc.stop(now+dur+.02);osc.onended=()=>{osc.disconnect();g.disconnect()};
      }
    }
    function update(dt){if(!ctx||ctx.state!=='running')return;let p=griddle.layers[0];panGain.gain.setTargetAtTime(p?.type==='patty'?(mode==='table'?.008:.028)+burst*.07:0,ctx.currentTime,.09);if(p&&Math.random()<dt*(mode==='table'?.46:1.3))tap('sizzle',.07)}
    document.addEventListener('visibilitychange',()=>{if(document.hidden&&ctx)ctx.suspend().catch(()=>{});else if(ctx)ctx.resume().catch(()=>{})});
    return {start,tap,update};
  })();
  function newMeal(){
    const m={root:group(world),layers:[],height:0,width:0,mass:0,leanX:0,leanZ:0,wobX:0,wobZ:0,velX:0,velZ:0,impact:0,compression:0,heat:0};
    m.shadow=contact(m.root,0,.003,0,1.27,1.22,.50);burgers.push(m);return m;
  }
  function bind(f,kind){f.node.userData.action={kind,food:f};return f}
  function loose(type){const f=bind(Food.create(type),'loose');world.add(f.node);return f}
  function flight(o,dest,duration=.32,lift=.27){
    const prev=flights.findIndex(f=>f.o===o);if(prev>=0)flights.splice(prev,1);
    flights.push({o,start:o.position.clone(),dest:dest.clone(),t:0,duration,lift});
  }
  function stopFlight(o){const i=flights.findIndex(f=>f.o===o);if(i>=0)flights.splice(i,1)}
  function positionLoose(){
    if(base&&base.node.parent===world){base.node.position.copy(layout.base);base.node.rotation.y=-.22}
    if(crown&&crown.node.parent===world){crown.node.position.copy(layout.crown);crown.node.rotation.y=.39}
  }
  function preparePan(){
    griddle=newMeal();griddle.root.position.copy(pan.position);griddle.root.position.y=panY;griddle.root.position.z+=.12;
    add(griddle,Food.create('patty'),0,0,Math.random()*.6-.3,false);
  }
  function batch(){
    if(!griddle?.layers.length)preparePan();
    burger=newMeal();burger.root.position.copy(board.position);burger.root.position.y=boardY;
    if(!base||base.meal)base=loose('base');
    if(!crown||crown.meal)crown=loose('crown');
    positionLoose();flips=0;pressedOnce=false;phase=0;pressure=pressureGoal=0;
  }
  function removeFromMeal(f){
    if(!f.meal)return;
    const i=f.meal.layers.indexOf(f);if(i>=0)f.meal.layers.splice(i,1);f.meal=null;
  }
  function add(m,f,x,z,turn,impact=true){
    stopFlight(f.node);removeFromMeal(f);m.root.add(f.node);bind(f,'layer');f.meal=m;f.x=x;f.z=z;f.turn=turn;f.touch=time;f.land=impact?.10:0;f.node.scale.setScalar(1);
    let cover=m.layers.findIndex(l=>l.type==='crown');
    if(cover>=0&&f.type!=='crown')m.layers.splice(cover,0,f);else m.layers.push(f);
    if(impact){m.impact=Math.min(.18,m.impact+.059*f.mass);m.velX+=x*.32;m.velZ+=z*.32;sound.tap(f.type,.42+f.mass*.22)}
    return f;
  }
  function ensureBase(animate=true){
    if(burger.layers.length)return;
    const start=base.node.getWorldPosition(vec());add(burger,base,0,0,-.23,animate);
    if(animate){base.arrival={start,t:0,duration:.33};base.land=.08}
    phase=Math.max(phase,1);
  }
  function clearGriddle(){griddle.shadow.material.dispose();griddle.shadow.geometry.dispose();const idx=burgers.indexOf(griddle);if(idx>=0)burgers.splice(idx,1);world.remove(griddle.root);griddle={layers:[],root:group(),height:0}}
  function carryPatty(x=0,z=0){
    if(!griddle.layers.length)return;
    ensureBase();const parts=griddle.layers.slice();
    for(let f of parts){
      let start=f.node.getWorldPosition(vec());add(burger,f,clamp(x+f.x,-.76,.76),clamp(z+f.z,-.76,.76),f.turn);
      f.arrival={start,t:0,duration:.34};f.land=.10;
    }clearGriddle();burst=.6;phase=2;
  }
  function flip(){
    const p=griddle.layers[0];if(!p||p.flipActive)return;
    if(griddle.layers.length>1){carryPatty();return}
    p.flipActive=true;p.flipTime=0;p.flipStart=p.flip;p.flipEnd=p.flip+PI;flips++;p.touch=time;sound.tap('patty',.31);
  }
  function topAt(m,x,z){
    let best=null,max=-Infinity;
    for(let f of m.layers){
      let dx=x-f.x,dz=z-f.z,inside=f.type==='cheese'?Math.max(Math.abs(dx*Math.cos(f.turn)-dz*Math.sin(f.turn)),Math.abs(dx*Math.sin(f.turn)+dz*Math.cos(f.turn)))<1:Math.hypot(dx,dz)<f.r*1.03;
      if(inside){let h=(f.level||0)+f.h*(1-f.compression);if(h>=max){best=f;max=h}}
    }return best;
  }
  function tickMeal(m,dt){
    m.shadow.visible=m.layers.length>0&&!(drag?.moved&&((drag.kind==='pan'&&m===griddle)||(drag.kind==='carry'&&m===burger)))&&!(handoff?.rec.meal===m&&handoff.placed<.95);
    if(!m.layers.length){m.height=m.mass=m.width=0;return}
    let total=0,cx=0,cz=0;for(let f of m.layers){total+=f.mass;cx+=f.x*f.mass;cz+=f.z*f.mass}cx/=total;cz/=total;
    m.mass=total;
    let load=0,loadX=0,loadZ=0;
    for(let i=m.layers.length-1;i>=0;i--){let f=m.layers[i];load+=f.mass;loadX+=f.x*f.mass;loadZ+=f.z*f.mass;f.loadX=loadX/load;f.loadZ=loadZ/load}
    const response=1-Math.exp(-dt*5.5),baseLayer=m.layers[0],factor=m.layers.length>1?.30:0;
    m.leanX=mix(m.leanX,(cx-baseLayer.x)*factor,response);m.leanZ=mix(m.leanZ,(cz-baseLayer.z)*factor,response);
    const stiff=18/(1+Math.min(6,m.height)*.24),damp=4.0;
    m.velX+=(-stiff*m.wobX-damp*m.velX)*dt;m.velZ+=(-stiff*m.wobZ-damp*m.velZ)*dt;m.wobX+=m.velX*dt;m.wobZ+=m.velZ*dt;
    m.impact*=Math.exp(-dt*8.6);
    let maxH=0,minX=0,maxX=0,heat=0;
    for(let i=0;i<m.layers.length;i++){
      const f=m.layers[i];let under=null,level=0;
      for(let j=0;j<i;j++){const q=m.layers[j],dist=Math.hypot(f.x-q.x,f.z-q.z);
        const overlap=f.type==='pickle'&&q.type==='pickle'?.68:.87;
        if(dist<(f.r+q.r)*overlap&&q.level+q.currentH>=level-.0001){under=q;level=q.level+q.currentH}
      }
      const dist=under?Math.hypot(f.x-under.x,f.z-under.z):0;
      f.support=under?clamp((under.r+f.r-dist)/(2*f.r),.12,1):1;f.under=under;
      if(under){
        const r=under.r;f.contactBounds=[Math.max(f.x-f.r,under.x-r),Math.min(f.x+f.r,under.x+r),Math.max(f.z-f.r,under.z-r),Math.min(f.z+f.r,under.z+r)];
        const side=.115+.16*(1-f.support),bounds=f.contactBounds;
        f.slopeX=mix(f.slopeX||0,clamp((f.loadX-(bounds[0]+bounds[1])*.5)*side,-.14,.14),response);
        f.slopeZ=mix(f.slopeZ||0,clamp((f.loadZ-(bounds[2]+bounds[3])*.5)*side,-.14,.14),response);
      }
      if(f.type==='patty'){
        if(f.pressHit){
          let touching=drag?.kind==='pan'&&!drag.moved&&m===griddle;
          f.pad=mix(f.pad||0,touching?.88:0,1-Math.exp(-dt*25));
          if(f.pad<.006&&!touching){f.pad=0;Food.pressMeat(f,0,0,0);f.pressHit=null}
          else Food.pressMeat(f,f.pad,f.pressHit.x,f.pressHit.z)
        }
        let on=m===griddle&&!(drag?.kind==='pan'&&drag.moved);
        f.heat=on?mix(f.heat,1,dt*.24):Math.max(.055,f.heat*Math.exp(-dt*.033));
        if(on&&!f.flipActive){let k=1-f.up;f.doneness[k]+=(.97-f.doneness[k])*dt*.059;f.doneness[f.up]+=(.68-f.doneness[f.up])*dt*.0013}
        if(f.flipActive){
          f.flipTime+=dt;let u=clamp(f.flipTime/.76);f.flip=mix(f.flipStart,f.flipEnd,smooth(clamp((u-.12)/.76)));
          f.air=Math.sin(PI*clamp((u-.12)/.86))*.89;
          if(u>=1){f.flipActive=false;f.flip=f.flipEnd;f.up=1-f.up;f.air=0;burst=1;m.impact=.135;m.velZ=.12;sound.tap('sizzle',1);sound.tap('patty',.93)}
        }
        Food.shadeMeat(f);f.visual.rotation.x=f.flip;f.visual.position.y=f.h*(1-Math.cos(f.flip))*.5;heat=Math.max(heat,f.heat);
      }else if(f.type==='cheese'){
        let incoming=under?.heat||0;f.heat=mix(f.heat,incoming*.85,1-Math.exp(-dt*.45));f.soft+=(1-f.soft)*dt*(.001+Math.max(0,incoming-.065)**1.5*.24);Food.melt(f,under);
        for(let d of f.sauce){const y=faceHeight(f,d.x,d.z,0);d.mesh.position.y=y+.012;if(d.tip)d.tip.position.y=y+.042;if(d.segment)d.segment.position.y=(y+faceHeight(f,d.previous.x,d.previous.z,0))*.5+.023}
      }else f.heat=mix(f.heat,(under?.heat||0)*.4,dt*.12);
      let softness=f.type==='crown'?.31:f.type==='base'?.22:f.type==='lettuce'?.46:f.type==='cheese'?.29:.106;
      let target=clamp((m===burger?pressure:0)*softness+m.impact*softness*1.2+(m.layers.length-1-i)*.008*softness,0,.48);
      f.compression=mix(f.compression,target,1-Math.exp(-dt*15));f.currentH=f.h*(1-f.compression);f.level=level;
      const localTiltX=m.leanX+m.wobX+(f.slopeX||0),localTiltZ=m.leanZ+m.wobZ+(f.slopeZ||0);
      let offsetX=localTiltX*level,offsetZ=localTiltZ*level;
      if(under){offsetX+=(f.x-under.x)*(1-f.support)*.12;offsetZ+=(f.z-under.z)*(1-f.support)*.12}
      f.land=Math.max(0,(f.land||0)-dt*.62);
      f.node.position.set(f.x+offsetX,level+(f.air||0)+f.land,f.z+offsetZ);
      f.node.rotation.order='ZXY';let fraction=clamp(i*.44);
      f.node.rotation.set(localTiltZ*fraction,f.turn,-localTiltX*fraction,'ZXY');
      f.node.scale.set(1+f.compression*.047,1-f.compression,1+f.compression*.047);
      if(f.flipActive&&f.flipTime<.105)f.node.scale.y*=1-.14*Math.sin(PI*f.flipTime/.105);
      if(f.arrival){const an=f.arrival;an.t+=dt;const u=clamp(an.t/an.duration),v=m.root.worldToLocal(an.start.clone());f.node.position.lerp(v,1-smooth(u));f.node.position.y+=.32*Math.sin(u*PI);if(u>=1)f.arrival=null}
      if((f.type==='lettuce'||f.type==='tomato')&&f.touch!==undefined){
        let age=time-f.touch,amp=Math.exp(-age*4)*Math.sin(age*(f.type==='tomato'?34:17));
        f.visual.rotation.z=amp*(f.type==='tomato'?.031:.079);
        if(f.type==='lettuce'&&age<1.6&&frame%2===0){let a=f.surface.geometry.attributes.position;for(let n=0;n<a.count;n++){let j=n*3,r=Math.hypot(f.rest[j],f.rest[j+2])/f.r;a.setY(n,f.rest[j+1]+.071*Math.exp(-age*3.5)*r*r*Math.sin(age*16-r*3+f.rest[j]*3))}a.needsUpdate=true}
      }
      if((f.type==='crown'||f.type==='base')&&m===burger&&(pressure>.002||f.hadDent)){
        let dx=pressX-f.x,dz=pressZ-f.z,c=Math.cos(f.turn),s=Math.sin(f.turn);Food.indent(f,pressure,dx*c-dz*s,dx*s+dz*c,pressPulse);f.hadDent=pressure>.002;
      }
      minX=Math.min(minX,f.node.position.x-f.r);maxX=Math.max(maxX,f.node.position.x+f.r);maxH=Math.max(maxH,level+f.currentH);
    }
    m.width=maxX-minX;m.height=maxH;m.heat=heat;
  }
  function cameraFit(w,h){
    let aspect=w/h,key=w+'x'+h;if(viewport===key)return;viewport=key;
    renderer.setSize(w,h,false);camera.aspect=aspect;K.arrange(aspect);camera.updateProjectionMatrix();
    if(!layoutReady){layoutReady=true;batch();camera.position.copy(layout.homeCam);cameraTarget.copy(layout.panLook);camera.fov=layout.fov;camera.lookAt(cameraTarget);camera.updateProjectionMatrix();camera.updateMatrixWorld()}
    else{
      if(burger){burger.root.position.copy(board.position);burger.root.position.y=boardY}
      if(griddle.layers.length){griddle.root.position.copy(pan.position);griddle.root.position.y=panY;griddle.root.position.z+=.12}
      positionLoose();
      history.forEach(rec=>{const pos=recordPosition(rec);rec.plate.position.copy(pos);if(handoff?.rec!==rec)rec.meal.root.position.copy(pos).y+=.082});
    }
  }
  function recordPosition(rec){
    const i=history.indexOf(rec),latest=history.at(-1),age=history.length-1-i;
    const p=latest.guest.root.position.clone(),dir=latest.guest.index===0?-1:1;
    if(age>0)p.x+=dir*age*3.51;p.z+=age>0?.22:0;return p;
  }
  function servingView(rec,hero,distance,elev,hasNeighbor){
    const key=viewport+'-'+hasNeighbor;if(rec.view?.key===key)return rec.view;
    const preferred=rec.guest.index===0?2.84:-2.86,sgn=Math.sign(preferred),probe=new T.PerspectiveCamera(layout.fov,camera.aspect,.08,140);
    const centers=[rec.guest.root.position];if(hasNeighbor)centers.push(recordPosition(history.at(-2)));
    let best={score:-Infinity,angle:preferred,scale:1,key};
    const choices=K.goods.map(t=>({p:stations[t].root.position.clone().add(vec(0,.60,0)),favorite:t===rec.guest.favorite}));
    if(rec.guest.favorite==='patty')choices.push({p:pan.position.clone().add(vec(0,.54,0)),favorite:true});
    for(let scale of [1,1.12,1.25])for(let offset of [-.99,-.74,-.49,-.27,0,.27,.49,.74,.99]){
      const angle=sgn*(PI+offset),dist=distance*scale;
      probe.position.copy(hero).add(vec(Math.sin(angle)*Math.cos(elev),Math.sin(elev),Math.cos(angle)*Math.cos(elev)).multiplyScalar(dist));
      probe.lookAt(hero);probe.updateMatrixWorld();
      let score=-1.9*(scale-1)-.26*Math.abs(angle-preferred);
      for(let ch of choices){
        let uv=ch.p.clone().project(probe),inside=Math.abs(uv.x)<.89&&Math.abs(uv.y)<.85;
        let blocked=false;for(let i=0;i<centers.length&&!blocked;i++){
          let center=centers[i],h=i?history.at(-2).meal.height:rec.meal.height;
          // Trace the line of sight through each finished stack before choosing a table-side seat.
          const dx=ch.p.x-probe.position.x,dz=ch.p.z-probe.position.z;
          const t=clamp(((center.x-probe.position.x)*dx+(center.z-probe.position.z)*dz)/(dx*dx+dz*dz));
          for(let k=-2;k<=2;k++){let f=clamp(t+k*.033);if(Math.hypot(probe.position.x+dx*f-center.x,probe.position.z+dz*f-center.z)<1.22&&mix(probe.position.y,ch.p.y,f)<h+.22){blocked=true;break}}
        }
        if(inside&&!blocked)score+=ch.favorite?14:1.1;else if(ch.favorite)score-=3+Math.abs(uv.x);
      }
      for(let c of centers){let uv=c.clone().add(vec(0,.5,0)).project(probe);score-=Math.max(0,Math.abs(uv.x)-.62)*8}
      if(score>best.score)best={score,angle,scale,key};
    }return rec.view=best;
  }
  function aim(dt){
    const prep=layout.portrait,quality=1-Math.exp(-dt*(handoff?8.5:3.8));
    let f=mode==='kitchen'&&phase>0?1:0;
    if(drag?.kind==='pan'&&drag.moved){const travel=griddle.root.position.distanceTo(pan.position);f=Math.max(f,clamp((travel-.60)/pan.position.distanceTo(board.position)))}
    focus=mix(focus,f,1-Math.exp(-dt*1.9));
    const build=burger.layers.length>0?Math.max(0,(burger.height-2.6)*.44):0;
    let look=layout.panLook.clone();look.x+=focus*(prep?.11:.45);look.z+=focus*(prep?.75:.43);look.y+=focus*(.17+build*.45);
    const baseDist=layout.homeCam.distanceTo(layout.panLook),el=mix(prep?58:51,prep?48:40,focus)*PI/180;
    let distance=baseDist+build*1.2;
    let aimTarget=look,angle=0,elev=el,dist=distance;
    if(handoff&&!handoff.touch){
      const moving=handoff.rec.meal;aimTarget=look.clone().lerp(moving.root.position.clone().add(vec(0,moving.height*.45,0)),smooth(clamp(handoff.t/.80)));
    }
    if(history.length&&(viewMix>.00001||handoff?.touch)){
      let rec=history.at(-1),g=rec.guest.root.position,placed=handoff?handoff.placed:1;
      const two=history.length>1,side=rec.guest.index===0?-1:1;
      const served=rec.meal,hero=vec(g.x+(two?side*1.55*placed:0),.47+served.height*.47,g.z+.09);
      const overview=two?(prep?7.1:6.72):(prep?3.68:5.45);
      let d=Math.max(overview/(2*Math.tan(layout.fov*PI/360)*camera.aspect),prep?5.65:6.9,served.height*2.58);
      const view=servingView(rec,vec(g.x+(two?side*1.55:0),.47+served.height*.47,g.z+.09),d,(two?24:22)*PI/180,two);
      // Orbit around the very same stack; a point on the burger stays in focus during the descent.
      aimTarget=handoff?hero:look.clone().lerp(hero,smooth(clamp(viewMix*1.37)));
      angle=mix(0,view.angle,smooth(viewMix));
      elev=mix(el,(two?24:22)*PI/180,smooth(viewMix));dist=mix(distance,d*view.scale,smooth(viewMix));
    }
    lookGoal.copy(aimTarget);cameraGoal.set(Math.sin(angle)*Math.cos(elev)*dist,Math.sin(elev)*dist,Math.cos(angle)*Math.cos(elev)*dist).add(lookGoal);
    cameraTarget.lerp(lookGoal,quality);camera.position.lerp(cameraGoal,quality);camera.lookAt(cameraTarget);camera.updateMatrixWorld();
  }
  function pointerRay(x,y){
    pointer.set(x/canvas.clientWidth*2-1,1-y/canvas.clientHeight*2);ray.setFromCamera(pointer,camera);
  }
  function surfacePoint(x,y,h=0){
    pointerRay(x,y);plane.constant=-h;let p=vec();return ray.ray.intersectPlane(plane,p)||p.copy(initialRay);
  }
  function screenPoint(o){let p=o.clone().project(camera);return {x:(p.x+1)*canvas.clientWidth/2,y:(1-p.y)*canvas.clientHeight/2}}
  function hit(x,y){
    pointerRay(x,y);
    const candidates=[...Object.values(stations).map(st=>st.root),K.bottle,...guests.map(g=>g.root)];
    if(base&&!base.meal)candidates.push(base.node);if(crown&&!crown.meal)candidates.push(crown.node);
    for(let m of burgers)if(m.layers.length)candidates.push(m.root);
    for(let rec of history)candidates.push(rec.plate);
    const hits=ray.intersectObjects(candidates,true);
    for(let h of hits){
      let o=h.object,action=null,item=null,visible=true;
      while(o){if(!o.visible){visible=false;break}if(!action&&o.userData.action)action=o.userData.action;if(o.userData.stockItem)item=o.userData.stockItem;o=o.parent}
      if(visible&&action)return {...action,item,point:h.point};
    }
    return null;
  }
  function nearBoard(p){return Math.hypot(p.x-board.position.x,p.z-board.position.z)<2.46}
  function nearPan(p){return Math.hypot(p.x-pan.position.x,p.z-pan.position.z)<1.92}
  function guestAt(p){return guests.find(g=>Math.hypot(p.x-g.root.position.x,p.z-g.root.position.z)<2.03)}
  function isReady(){return burger.layers.some(f=>f.type==='base')&&burger.layers.some(f=>f.type==='patty')}
  const shadow=contact(world,0,.01,0,1.1,1.0,.44);shadow.visible=false;
  const sauceMat=S.mat(0xb9220d,.265),dripMat=S.mat(0xbb2910,.245);
  function faceHeight(f,x,z,face){
    if(f.type==='patty')return face===1?-.005:f.h-.043*clamp(Math.hypot(x,z)/f.r)**2;
    if(f.type!=='cheese'||!f.under)return f.h;
    const c=Math.cos(f.turn),s=Math.sin(f.turn),under=f.under;
    let over=Math.max(0,Math.hypot(f.x-under.x+x*c+z*s,f.z-under.z-x*s+z*c)-under.r*.85);
    return .068-f.soft*Math.min(.38,over*.81);
  }
  function faceHost(f,face){
    if(f.type!=='patty')return f.node;
    f.faces??=[];if(!f.faces[face]){f.faces[face]=group(f.visual);f.faces[face].rotation.x=face?PI:0}return f.faces[face];
  }
  function saucePoint(f,x,z,qty,previous=null){
    if(!f)return null;
    let dist=Math.hypot(x,z),limit=f.r*.96;if(dist>limit){x*=limit/dist;z*=limit/dist}
    const face=f.up||0,host=faceHost(f,face),y=faceHeight(f,x,z,face);
    const prev=previous&&previous.food===f&&previous.face===face?previous:null,rad=.056+Math.sqrt(qty)*.082;
    if(prev&&Math.hypot(prev.x-x,prev.z-z)<.057){
      prev.qty=Math.min(2.5,prev.qty+qty*.245);let s=.076+Math.sqrt(prev.qty)*.099;prev.mesh.scale.set(s,s*.62,s);return prev
    }
    const existing=f.sauce.find(d=>d.face===face&&Math.hypot(d.x-x,d.z-z)<.046);
    if(existing){existing.qty+=qty*.22;const s=Math.min(.30,.08+Math.sqrt(existing.qty)*.068);existing.mesh.scale.set(s,s*.60,s);return existing}
    let m=orb(host,sauceMat,x,y+.012,z,rad,rad*.65,rad),record={x,z,qty,face,mesh:m,food:f,extruded:0};f.sauce.push(record);
    if(prev&&Math.hypot(prev.x-x,prev.z-z)<.34){
      let a=vec(prev.x,faceHeight(f,prev.x,prev.z,face)+.023,prev.z),b=vec(x,y+.023,z),seg=orb(host,sauceMat,0,0,0,.067,.049,.10);
      seg.position.copy(a).lerp(b,.5);seg.scale.z=a.distanceTo(b)*.54+.038;seg.rotation.y=Math.atan2(x-prev.x,z-prev.z);record.segment=seg;record.previous=prev;
    }return record;
  }
  function sauceExit(m,strength){
    if(strength<.035)return;
    const top=m.layers.at(-1);if(!top||top.type!=='crown')return;
    for(let f of m.layers){
      if(!f.sauce.length||f===top)continue;
      let c=Math.cos(f.turn),s=Math.sin(f.turn);
      let localX=(pressX-f.x)*c-(pressZ-f.z)*s,localZ=(pressX-f.x)*s+(pressZ-f.z)*c;
      for(let d of f.sauce){
        const z=f.type==='patty'&&d.face!==f.up?-d.z:d.z;
        const dist=Math.hypot(d.x,z)/f.r,near=1-clamp(Math.hypot(localX-d.x,localZ-z)/2.3);
        const amount=strength*(.21+.95*dist**1.7)*(.42+near*.74)*Math.sqrt(d.qty);
        if(amount<=d.extruded+.002)continue;d.extruded=amount;
        let dx=d.x+.34*localX+.18*m.leanX,dz=z+.34*localZ+.18*m.leanZ+.085,l=Math.hypot(dx,dz)||1;
        let edge=f.r*(f.type==='cheese'?.94:.985);if(f.type==='cheese')edge=.966/Math.max(Math.abs(dx/l),Math.abs(dz/l),.01);
        if(!d.drip){
          let rad=Math.atan2(dx,dz);let old=f.drops.find(q=>Math.cos(q.angle-rad)>.986);
          if(old)d.drip=old;else{
            let n=group(f.node),lip=orb(n,dripMat,0,0,0,1,1,1),bead=orb(n,dripMat,0,0,0,1,1,1);
            n.position.set(dx/l*edge,(f.type==='patty'&&f.up!==d.face?0:faceHeight(f,dx/l*edge,dz/l*edge,d.face))-.005,dz/l*edge);n.rotation.y=rad;d.drip={node:n,lip,bead,angle:rad,pool:0};f.drops.push(d.drip)}
        }
        let drip=d.drip;drip.pool+=Math.max(0,amount-(d.used||0));d.used=amount;
        let v=Math.min(.72,drip.pool),len=.026+.21*v;
        drip.lip.scale.set(.058+.13*v,.029+.055*v,.043+.087*v);
        drip.bead.position.set(0,-len*.64,.033+.050*v);drip.bead.scale.set(.039+.086*v,len*.78,.036+.076*v);
        d.mesh.scale.y*=.995;
      }
    }
  }
  function bottleAt(p,squeezing){
    bottleReturn=null;const b=K.bottle;b.rotation.set(.13,0,PI-.52,'XYZ');let s=squeezing?.85:1;
    K.bottleBody.scale.set(s,1,1/s**.26);const tip=vec(0,2.12,0).applyQuaternion(b.quaternion);b.position.copy(p).sub(tip);
  }
  function returnBottle(){bottleReturn={start:K.bottle.position.clone(),rot:K.bottle.quaternion.clone(),t:0};K.bottleBody.scale.set(1,1,1)}
  function paint(d,dt){
    // Contact is resolved against the visible food surface, including its stored rotation.
    pointerRay(d.x,d.y);let targets=[burger,...(griddle.layers.length?[griddle]:[])].flatMap(m=>m.layers.map(f=>f.surface));
    const hits=ray.intersectObjects(targets,false);
    let f,p;if(hits.length){let hit=hits[0],node=hit.object;while(node&&!node.userData.action)node=node.parent;f=node?.userData.action?.food;p=hit.point.clone()}
    if(!f){p=surfacePoint(d.x,d.y,.61);bottleAt(p,false);d.mark=null;d.contact=false;return}
    bottleAt(p,true);const local=f.node.worldToLocal(p.clone());d.contact=true;
    d.paintClock=(d.paintClock||0)+dt;if(d.paintClock>.036||!d.mark){
      const nx=local.x,nz=local.z,old=d.mark,far=old&&old.food===f?Math.hypot(nx-old.x,nz-old.z):0,steps=clamp(Math.ceil(far/.085),1,16);
      for(let k=1;k<=steps;k++){let a=k/steps;d.mark=saucePoint(f,far?mix(old.x,nx,a):nx,far?mix(old.z,nz,a):nz,.32,d.mark)}
      d.paintClock=0;if(!old)sound.tap('sauce',.42)
    }
  }
  function squeezeEnd(d){if(d.mark){let f=d.mark.food;const m=d.mark;m.tip=orb(faceHost(f,m.face),sauceMat,m.x,faceHeight(f,m.x,m.z,m.face)+.042,m.z,.031,.042,.031)}returnBottle()}
  function safeOffset(p,m,limit=.79){
    let x=p.x-m.root.position.x,z=p.z-m.root.position.z,r=Math.hypot(x,z);if(r>limit){x*=limit/r;z*=limit/r}return {x,z}
  }
  function supplyTarget(type,p){
    if(griddle.layers.length&&nearPan(p)&&type!=='base'&&type!=='crown')return griddle;
    if(nearBoard(p))return burger;return null;
  }
  function takeFromSupply(type,item){
    const st=stations[type],index=item?st.samples.indexOf(item):st.samples.length-1;
    const pick=index<0?st.samples.length-1:index,f=st.samples[pick],fresh=Food.create(type);
    const slots=st.samples.slice(0,pick+1).map(q=>({p:q.node.position.clone(),r:q.node.rotation.clone(),s:q.node.scale.clone()}));
    world.attach(f.node);delete f.node.userData.stockItem;st.samples.splice(pick,1);
    st.pile.add(fresh.node);fresh.node.userData.stockItem=fresh;st.samples.unshift(fresh);
    for(let i=0;i<=pick;i++){const n=st.samples[i].node,slot=slots[i];n.position.copy(slot.p);n.rotation.copy(slot.r);n.scale.copy(slot.s)}
    f.node.scale.setScalar(1);return f;
  }
  function landing(x,y,type,ignore=null){
    const meals=[burger,griddle].filter(m=>m!==ignore&&m.layers.length&&(m!==griddle||!['base','crown','patty'].includes(type)));
    pointerRay(x,y);
    const surfaces=meals.flatMap(m=>m.layers.map(f=>f.surface));
    const hits=ray.intersectObjects(surfaces,false);
    if(hits.length){
      const h=hits[0];let n=h.object;while(n&&!n.userData.action)n=n.parent;
      if(n?.userData.action?.food)return {m:n.userData.action.food.meal,p:h.point.clone()};
    }
    // The pointer can reach an overhanging edge before its ray meets the lower board.
    for(let m of meals){
      const p=surfacePoint(x,y,m.root.position.y+m.height),off=m.root.worldToLocal(p.clone());
      if(Math.hypot(off.x,off.z)<1.27){const f=topAt(m,off.x,off.z);p.y=m.root.position.y+(f?f.level+f.currentH:m.height);return {m,p}}
    }
    const p=surfacePoint(x,y,boardY);return {m:supplyTarget(type,p),p};
  }
  function attachAt(m,f,p,d){
    if(m===burger&&f.type!=='base')ensureBase();
    const start=f.node.getWorldPosition(vec()),off=f.type==='base'?{x:0,z:0}:safeOffset(p,m,f.type==='crown'?.50:.9);
    add(m,f,off.x,off.z,d?.twist??(Math.random()-.5)*.45);
    f.arrival={start,t:0,duration:.23};m.velX+=clamp((d?.vx||0)*.002,-.47,.47);m.velZ+=clamp((d?.vy||0)*.002,-.47,.47);
    if(m===burger)phase=Math.max(phase,1);
  }
  function moveLayer(f,dx,dz){
    const m=f.meal,i=m.layers.indexOf(f);if(i<1)return;
    const origin=drag.layerOrigins[i];let nx=origin.x+dx,nz=origin.z+dz,r=Math.hypot(nx,nz);
    if(r>.98){nx*=.98/r;nz*=.98/r}dx=nx-origin.x;dz=nz-origin.z;
    for(let j=i;j<m.layers.length;j++){let q=m.layers[j],orig=drag.layerOrigins[j],follow=j===i?1:.91;q.x=orig.x+dx*follow;q.z=orig.z+dz*follow}
    f.touch=time;m.wobX*=.90;m.wobZ*=.90;m.velX*=.86;m.velZ*=.86;
  }
  function beginServe(g){
    if(!isReady()||handoff)return;
    pressure=pressureGoal=0;drag=null;shadow.visible=false;
    const meal=burger;world.attach(g.plate);g.plate.userData.action={kind:'served',meal};const rec={meal,guest:g,plate:g.plate,counts:{}};
    for(let f of meal.layers){rec.counts[f.type]=(rec.counts[f.type]||0)+1;if(f.sauce.length)rec.counts.sauce=(rec.counts.sauce||0)+f.sauce.reduce((s,d)=>s+d.qty,0)}
    g.meals.push(rec);g.favorite=g.preference.find(t=>rec.counts[t])||'patty';lastGuest=g;history.push(rec);
    handoff={rec,t:0,placed:0,from:meal.root.position.clone(),touch:false,released:false};mode='handoff';lastAction=time;
    meal.layers.forEach(f=>bind(f,'servedLayer'));
    for(let old of history.slice(0,-1)){let dest=recordPosition(old);flight(old.plate,dest,.89,0);flight(old.meal.root,dest.clone().add(vec(0,.082,0)),.89,.012)}
    g.plate=K.plate(g.root,g.small);g.plate.visible=false;
  }
  function nextBatch(){
    if(!history.length)return;
    const latest=history.at(-1);latest.guest.plate.visible=false;
    batch();mode='table';lastAction=time;
  }
  function returnKitchen(){
    if(mode!=='table')return;mode='kitchen';lastAction=time;focus=0;
    for(let g of guests)g.plate.visible=true;
    // Make room at the recipient's place while leaving each finished sandwich on its own plate.
    let latest=history.at(-1);for(let rec of history){
      let pos=recordPosition(rec);pos.z-=1.92;pos.x+=latest.guest.index===0?1.76:-1.76;
      flight(rec.plate,pos,.76,0);flight(rec.meal.root,pos.clone().add(vec(0,.082,0)),.76,.012)
    }
  }
  function tickHandoff(dt){
    let a=handoff;if(!a)return;a.t+=dt;let {rec}=a,g=rec.guest,m=rec.meal,p=g.root.position,arrival=.80;
    const u=clamp(a.t/arrival),land=clamp((a.t-1.80)/.85),ease=smooth(u),weight=clamp(m.mass/4);
    a.placed=smooth(land);m.root.position.copy(a.from).lerp(vec(p.x,.48-.053*weight,p.z-.015),ease);
    m.root.position.y+=Math.sin(PI*u)*.42;m.root.position.y=mix(m.root.position.y,.082,a.placed);
    if(u>=1&&!a.touch){a.touch=true;m.impact=.092;m.velX+=m.leanX*.76;sound.tap('land',weight+.3)}
    if(a.t>1.65&&!griddle.layers.length)preparePan();
    if(land>.77&&!a.released){a.released=true;m.impact=.063;sound.tap('base',.39)}
    viewMix=Math.min(1,Math.max(0,a.t-.80)/2.12);
    if(a.t>=3.32){handoff=null;viewMix=1;nextBatch()}
  }
  function tapAction(a){
    if(!a)return;
    if(mode==='table'){
      if(a.kind==='supply'||a.kind==='loose'||(a.kind==='layer'&&a.food.meal===griddle))returnKitchen();
      else if(a.kind==='guest'&&lastGuest){const favorite=lastGuest.favorite;returnKitchen();if(stations[favorite])tapAction({kind:'supply',type:favorite});else flip();return}
      else if(a.kind==='served'||a.kind==='servedLayer'){let m=a.meal||a.food.meal;m.velX+=.27;m.impact=.10;sound.tap('base',.42);return}else return;
    }
    switch(a.kind){
      case 'supply':{
        const f=takeFromSupply(a.type,a.item),start=f.node.position.clone();
        const m=a.type==='cheese'&&griddle.layers.length?griddle:burger;
        if(m===burger)ensureBase();let n=m.layers.filter(f=>f.type===a.type).length;
        let ox=a.type==='pickle'?(n%2?.38:-.36):a.type==='cheese'?.085:.13*Math.sin(n*2.1+1),oz=a.type==='cheese'?.08:.12*Math.cos(n*2.5);
        add(m,f,ox,oz,a.type==='cheese'?-.30:(Math.random()-.5)*.8);f.arrival={start,t:0,duration:.43};break
      }
      case 'loose':if(a.food.type==='base')ensureBase();else{ensureBase();attachAt(burger,a.food,burger.root.position,null)}break;
      case 'layer':if(a.food.meal===griddle){flip()}else{a.food.touch=time;a.food.meal.impact=.07;sound.tap(a.food.type,.38)}break;
      case 'guest':if(isReady())beginServe(a.guest);break;
      case 'bottle':{
        const m=burger.layers.length?burger:griddle;if(!m.layers.length)return;const f=m.layers.at(-1);let p=f.node.localToWorld(vec(.08,f.h+.015,.55*f.r));
        bottleAt(p,true);saucePoint(f,.08,.57*f.r,.83);sound.tap('sauce',.57);bottleReturn={start:K.bottle.position.clone(),rot:K.bottle.quaternion.clone(),t:-.23};break
      }
    }
  }
  function layerAtEdge(action,x,y){
    const f=action?.food,m=f?.meal;
    if(action?.kind!=='layer'||m!==burger||m.layers.length<3)return action;
    const local=f.node.worldToLocal(action.point.clone());
    if(f.type==='base'&&local.y<f.h*.7)return action;
    if(f.type==='crown'&&local.y>f.h*.22)return action;
    if(!['crown','base'].includes(f.type)&&local.y<f.h*.93)return action;
    const facing=camera.position.clone().sub(m.root.position);facing.y=0;facing.normalize();
    const right=vec(facing.z,0,-facing.x);
    let best=null,score=Infinity;
    // At a crowded front seam the finger covers several thin layers. Resolve the
    // cross-section at this horizontal position, including a slice recessed under the lid.
    for(let layer of m.layers){
      const center=layer.node.getWorldPosition(vec());center.y+=layer.currentH*.52;
      const p=screenPoint(center),p2=screenPoint(center.clone().add(right)),pixels=Math.max(1,p2.x-p.x);
      const offset=(x-p.x)/pixels;if(Math.abs(offset)>layer.r*.99)continue;
      const front=Math.sqrt(Math.max(0,layer.r**2-offset**2)),point=center.clone().addScaledVector(right,offset).addScaledVector(facing,Math.max(front,.76));
      const edge=screenPoint(point),d=Math.abs(edge.y-y);
      if(d<score&&d<Math.max(4,pixels*.115)){score=d;best={kind:'layer',food:layer,point}}
    }return best||action;
  }
  function down(e){
    if(drag||mode==='handoff')return;sound.start();lastAction=time;let a=layerAtEdge(hit(e.clientX,e.clientY),e.clientX,e.clientY);if(!a)return;
    const table=mode==='table';let kind=a.kind,food=a.food;
    if(table&&['supply','loose','layer'].includes(kind))returnKitchen();
    if(kind==='layer'){
      if(food.meal===griddle)kind='pan';
      else if(food===base&&burger.layers.length>1)kind='carry';
      else if(food.type==='crown')kind='press';
      else kind='adjust';
    }
    const h=a.point?.y||0,p=surfacePoint(e.clientX,e.clientY,h);initialRay.copy(p);
    drag={kind,action:a,food,t0:time,startX:e.clientX,startY:e.clientY,x:e.clientX,y:e.clientY,lastX:e.clientX,lastY:e.clientY,lastT:time,vx:0,vy:0,moved:false,id:e.pointerId,planeY:h,anchor:p,startPressure:e.pressure};
    const d=drag;
    if(kind==='adjust'||kind==='press')d.layerOrigins=food.meal.layers.map(f=>({x:f.x,z:f.z}));
    if(kind==='press'){
      let lp=burger.root.worldToLocal(a.point.clone());pressX=lp.x;pressZ=lp.z;pressureGoal=.22;pressedOnce=true;food.touch=time;sound.tap('crown',.29)
    }
    if(kind==='pan'){d.origin=griddle.root.position.clone();let f=griddle.layers[0];if(f){f.touch=time;f.pressHit=f.node.worldToLocal(a.point.clone())}}
    if(kind==='carry')d.origin=burger.root.position.clone();
    if(kind==='loose'){d.origin=food.node.position.clone();stopFlight(food.node)}
    if(kind==='supply'){d.origin=stations[a.type].root.position.clone();d.origin.y=.6}
    if(kind==='bottle'){d.origin=K.bottle.position.clone();bottleReturn=null}
    if(kind==='adjust')food.touch=time;
    canvas.setPointerCapture(e.pointerId);if(e.cancelable)e.preventDefault();
  }
  function dragging(d){
    const p=surfacePoint(d.x,d.y,d.planeY),dx=p.x-d.anchor.x,dz=p.z-d.anchor.z;
    let n=d.held?.node;
    if(d.kind==='supply'&&!d.held){d.held=takeFromSupply(d.action.type,d.action.item);d.twist=(Math.random()-.5)*.45;n=d.held.node}
    if(d.kind==='loose'){d.held=d.food;n=d.held.node}
    if(d.kind==='pan'&&griddle.layers.length)n=griddle.root;
    if(d.kind==='carry')n=burger.root;
    if(d.kind==='press'){
      const dest=surfacePoint(d.x,d.y,boardY);
      if(!nearBoard(dest)&&Math.hypot(d.x-d.startX,d.y-d.startY)>38){let f=d.food;d.origin=f.node.getWorldPosition(vec());removeFromMeal(f);world.attach(f.node);d.kind='loose';d.held=f;d.anchor=p.clone();d.planeY=p.y;pressureGoal=0;d.detached=true;n=f.node}
      else{pressureGoal=clamp(.27+Math.max(0,d.y-d.startY)/80+.29*(time-d.t0),.18,1);return}
    }
    if(d.kind==='adjust'){moveLayer(d.food,dx,dz);return}
    if(d.kind==='bottle'){paint(d,.018);return}
    if(n&&d.origin){
      const spot=landing(d.x,d.y,d.held?.type||(d.kind==='pan'?'patty':'base'),d.kind==='carry'?burger:d.kind==='pan'?griddle:null);
      let targetH=spot.m?spot.p.y:0;
      let pos=vec(d.origin.x+dx,Math.max(d.origin.y+.48,targetH+.36),d.origin.z+dz);
      n.position.copy(pos);if(d.held){n.rotation.set(-.06,d.twist||0,.04)}
      shadow.visible=true;shadow.position.set(spot.p.x,Math.max(.014,targetH+.009),spot.p.z);shadow.scale.set(d.held?.r||1.1,d.held?.r||1.1,1);
    }
  }
  function move(e){
    let d=drag;if(!d||d.id!==e.pointerId)return;
    let elapsed=Math.max(.016,time-d.lastT);d.vx=mix(d.vx,(e.clientX-d.x)/elapsed,.45);d.vy=mix(d.vy,(e.clientY-d.y)/elapsed,.45);
    d.x=e.clientX;d.y=e.clientY;d.lastT=time;lastAction=time;
    if(Math.hypot(d.x-d.startX,d.y-d.startY)>5)d.moved=true;if(d.moved)dragging(d);if(e.cancelable)e.preventDefault();
  }
  function up(e,cancel=false){
    const d=drag;if(!d||d.id!==e.pointerId)return;lastAction=time;drag=null;shadow.visible=false;
    if(canvas.hasPointerCapture(e.pointerId))canvas.releasePointerCapture(e.pointerId);
    d.vx*=Math.exp(-8*(time-d.lastT));d.vy*=Math.exp(-8*(time-d.lastT));
    const p=surfacePoint(d.x,d.y,boardY),g=guestAt(p);
    if(d.kind==='press'){pressureGoal=0;pressPulse=pressure;burger.velZ+=pressure*.092;sound.tap('crown',pressure,.36);return}
    if(!d.moved&&!cancel){
      if(d.kind==='pan')flip();else if(d.kind==='carry'){burger.impact=.073;burger.velZ=.13;sound.tap('base',.31)}
      else if(d.kind==='adjust'){d.food.touch=time;d.food.meal.impact=.069;sound.tap(d.food.type,.52)}
      else tapAction(d.action);return
    }
    if(d.kind==='bottle'){squeezeEnd(d);return}
    if(d.kind==='carry'){
      if(g&&!cancel&&isReady()){beginServe(g);return}
      flight(burger.root,vec(board.position.x,boardY,board.position.z),.30,.09);burger.velX=clamp(d.vx*.001,-.60,.60);burger.velZ=clamp(d.vy*.001,-.60,.60);return;
    }
    if(d.kind==='pan'){
      if(!griddle.layers.length)return;
      const spot=landing(d.x,d.y,'patty',griddle);
      if(!cancel&&spot.m===burger){let v=safeOffset(spot.p,burger,.72);carryPatty(v.x,v.z)}
      else{flight(griddle.root,vec(pan.position.x,panY,pan.position.z+.12),.28,.1);burst=.38}return
    }
    if(d.held){
      const f=d.held;
      let spot=landing(d.x,d.y,f.type),m=cancel?null:spot.m;
      if(m){if(f.type==='base')ensureBase();else attachAt(m,f,spot.p,d)}
      else if(f===base||f===crown){bind(f,'loose');flight(f.node,f===base?layout.base:layout.crown,.33,.19)}
      else{world.remove(f.node);disposeFood(f)}return;
    }
    if(d.kind==='adjust'&&!cancel){let m=d.food.meal;m.velX+=clamp(d.vx*.0007,-.36,.36);m.velZ+=clamp(d.vy*.0007,-.36,.36);sound.tap(d.food.type,.37,Math.hypot(d.vx,d.vy)/700)}
  }
  function disposeFood(f){
    f.surface.geometry.dispose();if(f.cheeseMaterial)f.cheeseMaterial.dispose();if(f.meatM)f.meatM.forEach(m=>m.dispose());f.node.traverse(o=>{if(o.isInstancedMesh)o.dispose()})
  }
  canvas.addEventListener('pointerdown',down);canvas.addEventListener('pointermove',move);
  canvas.addEventListener('pointerup',e=>up(e));canvas.addEventListener('pointercancel',e=>up(e,true));
  canvas.addEventListener('lostpointercapture',e=>{if(drag?.id===e.pointerId)up(e,true)});
  canvas.addEventListener('contextmenu',e=>e.preventDefault());
  // The demonstration is a translucent fingertip with a nail and a rounded pad.
  const guide=group(world),ghostMat=new T.MeshPhysicalMaterial({color:0xffe4c2,transparent:true,opacity:0,roughness:.58,depthWrite:false});
  const finger=K.digit(guide,ghostMat,[vec(0,0,0),vec(.02,.12,.07),vec(.12,.32,.27),vec(.21,.51,.48),vec(.29,.67,.65)],[.025,.127,.157,.154,.149,.130,.036]);
  const nail=orb(guide,ghostMat,.017,.113,.003,.085,.085,.026);nail.rotation.x=-.56;guide.traverse(o=>{o.castShadow=false;o.receiveShadow=false;o.renderOrder=8});guide.visible=false;
  function guideStep(){
    if(mode==='table'){
      let fav=lastGuest?.favorite;let s=stations[fav];let p=s?s.root.position.clone().add(vec(0,.72,0)):griddle.root.position.clone().add(vec(0,.38,0));
      return {a:p,b:p.clone().add(vec(.1,.10,.04)),target:s?s.samples.at(-1):griddle.layers[0]};
    }
    if(!griddle.layers.length&&!burger.layers.length)return null;
    let pat=griddle.layers[0],p=pat?griddle.root.position.clone().add(vec(0,.34,.34)):null,boardPos=board.position.clone().add(vec(0,boardY+burger.height+.05,0));
    if(pat&&!flips&&griddle.layers.length===1)return {a:p,b:p.clone().add(vec(0,-.09,0)),target:pat};
    if(pat&&griddle.layers.length===1&&!burger.layers.length)return {a:stations.cheese.root.position.clone().add(vec(.27,.51,.36)),b:p,target:stations.cheese.samples.at(-1)};
    if(pat)return {a:p,b:boardPos,target:pat};
    if(!burger.layers.some(f=>['tomato','lettuce','pickle'].includes(f.type)))return {a:stations.tomato.root.position.clone().add(vec(.1,.70,0)),b:boardPos.clone().add(vec(.31,0,.19)),target:stations.tomato.samples.at(-1)};
    if(!burger.layers.some(f=>f.sauce.length)&&!crown.meal)return {a:layout.bottle.clone().add(vec(0,1.17,.23)),b:boardPos.clone().add(vec(.30,.07,.36)),target:null};
    if(!crown.meal)return {a:crown.node.position.clone().add(vec(0,.69,.20)),b:boardPos,target:crown};
    if(!pressedOnce)return {a:boardPos.clone().add(vec(0,.18,0)),b:boardPos.clone().add(vec(0,-.02,0)),target:crown};
    let g=guests[history.length%2];return {a:burger.root.position.clone().add(vec(0,.18,.97)),b:g.root.position.clone().add(vec(0,.45,0)),target:base};
  }
  function guideTick(){
    if(activeGlow){activeGlow.emissiveIntensity=0;activeGlow=null}
    if(guideTick.lifted){guideTick.lifted.position.y-=guideTick.offset;guideTick.lifted=null}
    if(drag||mode==='handoff'){guide.visible=false;return}
    let h=guideStep();if(!h){guide.visible=false;return}
    let idle=time-lastAction,target=h.target;
    if(target?.type==='patty'){let m=target.meatM[target.up];m.emissive.setHex(0xffb456);m.emissiveIntensity=.026+.040*(.5+.5*Math.sin(time*3));activeGlow=m}
    else if(idle>.55){
      const lifted=target?.visual||K.bottleBody;guideTick.offset=.033*Math.max(0,Math.sin(time*2.72))**3;
      lifted.position.y+=guideTick.offset;guideTick.lifted=lifted
    }
    if(idle<4){guide.visible=false;return}
    const t=(idle-4)%6.5,duration=2.72;if(t>duration){guide.visible=false;return}
    guide.visible=true;let u=clamp((t-.38)/1.62),k=smooth(u);guide.position.copy(h.a).lerp(h.b,k);guide.position.y+=.08+.17*Math.sin(PI*k)+.12*(1-clamp(t/.44));
    guide.rotation.y=mode==='table'?PI+.24:-.25;
    ghostMat.opacity=.27*smooth(clamp(t/.35))*smooth(clamp((duration-t)/.51));
  }
  function run(timestamp){
    const now=timestamp*.001,dt=clamp(now-(run.prev??now-.016),.001,.045);run.prev=now;time+=dt;frame++;
    cameraFit(canvas.clientWidth||innerWidth,canvas.clientHeight||innerHeight);
    if(mode==='handoff')tickHandoff(dt);
    else if(mode==='kitchen')viewMix=Math.max(0,viewMix-dt*.79);
    if(drag?.kind==='press'&&!drag.moved)pressureGoal=clamp(.23+(time-drag.t0)*.56+.1*Math.max(0,(drag.startPressure||.5)-.5));
    if(drag?.kind==='bottle'&&drag.moved)paint(drag,dt);
    pressure=mix(pressure,pressureGoal,1-Math.exp(-dt*(pressureGoal?11:7.5)));pressPulse*=Math.exp(-dt*8);
    for(let m of burgers)tickMeal(m,dt);
    if(pressure>.025)sauceExit(burger,pressure);
    for(let j=flights.length-1;j>=0;j--){let f=flights[j];f.t+=dt;let u=clamp(f.t/f.duration);f.o.position.lerpVectors(f.start,f.dest,smooth(u));f.o.position.y+=f.lift*Math.sin(PI*u);if(u>=1)flights.splice(j,1)}
    if(bottleReturn){let b=bottleReturn;b.t+=dt;let u=clamp(b.t/.39);K.bottle.position.lerpVectors(b.start,layout.bottle,smooth(u));K.bottle.position.y+=.25*Math.sin(PI*u);K.bottle.quaternion.copy(b.rot).slerp(new T.Quaternion(),smooth(u));if(u>=1){bottleReturn=null;K.bottleBody.scale.set(1,1,1)}}
    for(let g of guests){
      let rec=handoff?.rec,receiving=rec?.guest===g;
      let approach=0;if(drag?.kind==='carry')approach=clamp(1-Math.hypot(burger.root.position.x-g.root.position.x,burger.root.position.z-g.root.position.z)/4);
      let opened=receiving?clamp(handoff.t/.79)*(1-handoff.placed):approach;
      let m=receiving?rec.meal:burger,point=mode==='table'&&lastGuest===g&&time-lastAction>.73?(stations[g.favorite]?.root.position||pan.position):null;
      K.poseGuest(g,opened,m.mass,m.width+m.height*Math.hypot(m.leanX,m.leanZ),receiving?handoff.placed:0,approach,point,time);
    }
    burst*=Math.exp(-dt*4.6);K.animate(time,griddle.layers[0]?.heat||0,!!griddle.layers.length&&!(drag?.kind==='pan'&&drag.moved),burst,burger);
    guideTick();aim(dt);sound.update(dt);renderer.render(scene,camera);requestAnimationFrame(run);
  }
  requestAnimationFrame(run);
})();
