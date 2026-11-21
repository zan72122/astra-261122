'use strict';
(() => {
  const {T,V,renderer,camera,scene,canvas,group,mat,mesh,ball,clamp,mix}=W,K=Kitchen,S=Serving;
  const full=1.84,insideEnd=.586,headDepth=.104,air=.25,homeDish=V(1.35,K.plateBase,-.47),nearDish=V(1.56,K.plateBase,.70);
  const dishes=[],particles=[],tweens=[];
  let dish=S.createDish(homeDish.x,homeDish.z),focused=null,phase='frame',active=null,locked=false;
  dishes.push(dish);
  let remaining=full,head=insideEnd-full-headDepth-air,compression=0,returnSpring=0,cut=0,cutSide=1;
  let clock=0,lastInput=0,guideKey='',lastDt=1/60,quiet=0,speed=0,pressAssist=0;
  let lastStroke=-10;
  let shifted=false,shiftCount=0,dripAfter=-1,focusAmount=0,slideOrigin=V(),cameraReady=false;
  let toolAction=null,storedCount=0,pressRest=0,nextDrop=0,soundPos=0;
  const cameraLook=V(),baseLook=V(),basePos=V(),ray=new T.Raycaster(),ndc=new T.Vector2();
  const hitObjects=[],handlers=new Map();
  const curve=t=>t*t*(3-2*t);
  function animate(duration,update,done){
    const tw={duration,update,done,t:0};tweens.push(tw);return tw;
  }
  function setPhase(next){phase=next;lastInput=clock;guideKey='';}
  function screen(p){const v=p.clone().project(camera);return new T.Vector2((v.x+1)*innerWidth/2,(1-v.y)*innerHeight/2);}
  function panFor(p){return clamp(p.clone().project(camera).x,-.82,.82);}
  function sound(k,p,volume=1){Sound.tap(k,volume,panFor(p));}
  function stopRubbing(){speed=0;Sound.rubAt(0);}
  function particle(a,v,r,type='water',floor=K.plateBase+.1){
    if(particles.length>75)return;
    const o=ball(scene,a.x,a.y,a.z,r,r*1.2,r,type==='sauce'?K.sauceMat:W.water);
    o.castShadow=false;particles.push({o,v,floor,type,ttl:1.35});
  }
  function splash(p,total=5){
    for(let i=0;i<total;i++)particle(p,V((Math.random()-.4)*.55,.32+Math.random()*.65,(Math.random()-.5)*.7),.008+Math.random()*.011);
  }
  function hitBox(name,parent,size,center){
    const o=new T.Mesh(new T.BoxGeometry(...size),new T.MeshBasicMaterial());
    parent.add(o);o.position.copy(center);o.visible=false;hitObjects.push(o);handlers.set(o,name);return o;
  }
  function hitDish(d){
    const o=new T.Mesh(new T.CylinderGeometry(.884,.86,.37,48));d.body.add(o);o.position.y=.17;o.visible=false;
    hitObjects.push(o);handlers.set(o,d);
  }
  hitDish(dish);
  hitBox('frame',K.frame,[.66,1.25,1.2],V(-.04,-.05,0));
  hitBox('jelly',K.fresh,[2.02,.8,.80],V());
  const rodHit=hitBox('rod',K.rodGroup,[3.18,.59,.76],V(-1.45,0,0));
  hitBox('cut',K.knob,[.33,.48,.38],V(0,.35,0));
  hitBox('stack',K.stack,[1.74,.58,1.73],V(0,.25,0));
  hitBox('store',K.resting,[1.73,.22,1.72],V(0,.12,0));
  hitBox('jug',K.jug,[.94,.69,.76],V(-.06,.26,0));
  hitBox('spoon',K.spoon,[1.74,.34,.55],V(-.47,.12,0));
  function canTouch(key){
    if(locked)return false;
    if(focused){
      if(focusAmount<.998)return key===focused;
      return key===focused||key==='jug'||key==='spoon'||key==='store';
    }
    if(typeof key==='object'){
      if(key.served)return true;
      return key===dish&&['ready','portioned'].includes(phase);
    }
    if(key==='frame')return phase==='frame';
    if(key==='jelly')return phase==='jelly';
    if(key==='rod')return phase==='rod'||phase==='extract'||(phase==='ready'&&cut===0);
    if(key==='cut')return phase==='ready'&&S.enough(dish);
    return key==='stack'&&phase==='next';
  }
  function rayAt(x,y){ndc.set(x/innerWidth*2-1,1-y/innerHeight*2);ray.setFromCamera(ndc,camera);}
  function pick(x,y){
    scene.updateMatrixWorld();rayAt(x,y);
    for(const h of ray.intersectObjects(hitObjects.filter(o=>canTouch(handlers.get(o))),false))return handlers.get(h.object);
    return null;
  }
  function tablePoint(x,y,height){
    rayAt(x,y);return ray.ray.intersectPlane(new T.Plane(V(0,1,0),-height),V())||V();
  }
  function axisParameter(x,y,origin,direction){
    rayAt(x,y);const w=ray.ray.origin.clone().sub(origin),u=ray.ray.direction.dot(direction);
    return (w.dot(direction)-u*w.dot(ray.ray.direction))/Math.max(.0001,1-u*u);
  }
  const pushOrigin=V(0,K.axisY,K.zAxis),pushAxis=V(1,0,0);
  const wireOrigin=V(K.exit+.015,K.axisY+.35,0),wireAxis=V(0,0,1);
  function projectedDelta(a,b,dx,dy){
    const v=screen(b).sub(screen(a)),l=v.lengthSq();return l>.001?(dx*v.x+dy*v.y)/l:0;
  }
  function shiftObj(obj,to,rot,arc,duration,end){
    const from=obj.position.clone(),startRot=obj.rotation.y;
    locked=true;animate(duration,t=>{const f=curve(t);obj.position.lerpVectors(from,to,f);obj.position.y+=arc*Math.sin(Math.PI*f);obj.rotation.y=mix(startRot,rot,f);},()=>{locked=false;end?.();});
  }
  function insertFrame(){
    if(phase!=='frame'||locked)return;
    locked=true;const from=K.frame.position.y;
    animate(.30,t=>{K.frame.position.y=mix(from,K.axisY,1-(1-t)**3)-.023*Math.sin(t*Math.PI);},()=>{
      K.frame.position.y=K.axisY;sound('wood',K.frame.getWorldPosition(V()));setPhase('jelly');locked=false;
    });
  }
  function syncAgar(){
    K.rodGroup.position.set(head-returnSpring,K.axisY,K.zAxis);K.rodGroup.rotation.set(0,0,0);
    const tail=-3.064,exposed=Math.min(.14,-2.12-K.rodGroup.position.x);
    rodHit.scale.x=(exposed-tail)/3.18;rodHit.position.x=(exposed+tail)/2;
    if(remaining<=.0001){K.fresh.visible=false;return;}
    K.fresh.visible=true;K.fresh.position.set(insideEnd-remaining/2+compression*.22,K.axisY,K.zAxis);
    K.fresh.rotation.set(0,0,0);K.fresh.scale.set(Math.max(.001,(remaining-compression*.36)/full),1+compression*.5,1+compression*.35);
  }
  function insertAgar(){
    const o=K.fresh,from=o.position.clone(),rot=o.rotation.y,entrance=V(-2.13-full/2-.035,K.axisY,K.zAxis);
    locked=true;o.scale.set(1,1,1);
    animate(.96,t=>{
      if(t<.52){const f=curve(t/.52);o.position.lerpVectors(from,entrance,f);o.position.y+=.36*Math.sin(Math.PI*f);o.rotation.y=rot*(1-f);}
      else{const u=(t-.52)/.48,f=curve(u);o.position.lerpVectors(entrance,V(insideEnd-full/2,K.axisY,K.zAxis),f);
        const squish=.042*Math.sin(Math.min(1,u*3)*Math.PI);o.scale.set(1-squish,1+squish*.5,1+squish*.45);
        if(u<.1&&!o.userData.touched){o.userData.touched=true;sound('slide',entrance,.58);splash(V(-2.13,K.axisY+.24,K.zAxis+.23),4);}
      }
    },()=>{locked=false;o.userData.touched=false;o.scale.set(1,1,1);remaining=full;setPhase('rod');sound('drip',o.position,.26);});
  }
  function insertRod(){
    head=insideEnd-full-headDepth-air;returnSpring=0;
    shiftObj(K.rodGroup,V(head,K.axisY,K.zAxis),0,.23,.67,()=>{syncAgar();setPhase('ready');sound('wood',K.rodGroup.position,.59);});
  }
  function extractRod(){
    const from=K.rodGroup.position.clone(),clear=V(-2.40,K.axisY,K.zAxis);locked=true;
    animate(.93,t=>{
      if(t<.57){K.rodGroup.position.lerpVectors(from,clear,curve(t/.57));}
      else {const f=curve((t-.57)/.43);K.rodGroup.position.lerpVectors(clear,K.rodHome,f);K.rodGroup.position.y+=Math.sin(f*Math.PI)*.24;K.rodGroup.rotation.y=-.10*f;}
    },()=>{rodHit.scale.x=1;rodHit.position.x=-1.45;K.fresh.position.copy(K.boardHome);K.fresh.rotation.set(0,K.board.rotation.y,0);K.fresh.scale.set(1,1,1);K.fresh.visible=true;K.bubbles();remaining=full;locked=false;setPhase('jelly');});
  }
  function pressBy(distance,dt){
    if(!dish||remaining<=0||phase!=='ready'||cut>0)return;
    const old=head;lastStroke=clock;
    const surface=insideEnd-remaining-headDepth;
    head=clamp(head+distance,-2.29,insideEnd-headDepth+.021-compression);
    const beyond=Math.max(0,head-surface),need=Math.max(0,.021-compression);
    const dent=Math.min(need,beyond);
    if(beyond>0 && compression<.0005){splash(V(K.exit,K.axisY+.18,K.zAxis+.22),5);sound('slide',V(head,K.axisY,K.zAxis),.62);}
    compression+=dent;
    const pushed=Math.min(remaining,Math.max(0,beyond-dent));
    head-=dent;remaining=Math.max(0,remaining-pushed);
    if(distance<0)compression=Math.max(0,compression+distance);
    const vel=Math.abs(head-old)/Math.max(.012,dt);
    speed=mix(speed,Math.min(2.6,vel),.28);
    if(pushed>0){S.extrude(dish,pushed*7.65,speed);quiet=1;pressRest=0;dripAfter=-1;}
    soundPos=panFor(V(head-.5,K.axisY,K.zAxis));Sound.rubAt(speed,soundPos);
    returnSpring=0;syncAgar();
  }
  function releasePress(){
    if(compression>.001){returnSpring=compression*.56;head-=compression*.39;dripAfter=clock+.48+Math.random()*.3;}
    compression=0;stopRubbing();
  }
  function setCut(f){
    if(phase!=='ready')return;
    const old=cut;cut=clamp(Math.max(cut,f),0,1);
    K.knob.position.z=cutSide*(.459-.918*cut);
    for(let j=0;j<5;j++){
      const column=cutSide===1?4-j:j,threshold=(.459-(column-2)*.131*cutSide)/.918;
      if(old<threshold && cut>=threshold){S.cutColumn(dish,column,clock);sound('thread',K.knob.getWorldPosition(V()),.32+j*.055);quiet=.8;}
    }
    if(cut>=.999){cut=1;cutSide*=-1;K.knob.position.z=.459*cutSide;sound('wood',K.knob.getWorldPosition(V()),.50);setPhase('portioned');}
  }
  function moveDish(x,z){
    if(!dish)return;
    dish.body.position.x=clamp(x,.94,1.92);dish.body.position.z=clamp(z,-.77,-.06);
    if(dish.body.position.distanceTo(homeDish)>.16){shifted=true;quiet=.68;}
  }
  function nudge(d){
    d.shake=1;d.flowTime=Math.max(1.25,d.flowTime);d.seeds.forEach(s=>s.asleep=false);
    if(d.hasSauce)S.ripple(d,.05,0,1.9);sound('dish',d.body.position,.48);
  }
  function startFocus(d){
    if(focused!==d){focused=d;slideOrigin.copy(d.body.position);focusAmount=0;}
  }
  function slideToFront(f){
    if(!focused)return;focusAmount=clamp(f,0,1);focused.body.position.lerpVectors(slideOrigin,nearDish,curve(focusAmount));
    focused.body.position.y+=Math.sin(Math.PI*focusAmount)*.05;
    if(focusAmount>=.999)focusAmount=1;
  }
  function finishPull(){
    const f=focusAmount;locked=true;animate(.98*(1-f)+.1,t=>slideToFront(mix(f,1,curve(t))),()=>{locked=false;lastInput=clock;nudge(focused);});
  }
  function slotFor(d){
    if(d.slot)return d.slot;
    const i=storedCount++,p=K.resting.position;d.slotIndex=i;
    // Keep completed dishes on the counter, extending the row towards the left.
    const row=Math.floor(i/5),column=i%5;
    d.slot=V(p.x-column*1.80,i===0?.154:.005,p.z-row*1.74);return d.slot;
  }
  function storeFocus(){
    if(!focused||locked)return;
    const d=focused,from=d.body.position.clone(),slot=slotFor(d),start=focusAmount;
    const freshPortion=d===dish&&!d.served;
    locked=true;toolAction=null;returnTools();
    animate(1.05,t=>{const f=curve(t);focusAmount=start*(1-f);d.body.position.lerpVectors(from,slot,f);d.body.position.y+=Math.sin(f*Math.PI)*.24;},()=>{
      d.body.position.copy(slot);d.served=true;focused=null;focusAmount=0;locked=false;sound('dish',slot,.6);
      if(freshPortion){dish=null;setPhase('next');}else lastInput=clock;
    });
  }
  function takePlate(source){
    const from=source?source.getWorldPosition(V()):K.stack.position;
    const d=S.createDish(from.x,from.z);d.body.position.y=from.y;dishes.push(d);hitDish(d);dish=d;
    cut=0;shifted=false;shiftCount=0;quiet=0;
    const stacked=K.stack.children.filter(c=>c.isGroup),top=stacked.filter(c=>c.visible).at(-1);if(top)top.visible=false;
    shiftObj(d.body,homeDish,d.body.rotation.y,.42,.74,()=>{sound('dish',d.body.position,.61);setPhase(remaining<.0001?'extract':'ready');
      if(!stacked.some(c=>c.visible))stacked.forEach(c=>c.visible=true);});
  }
  const streamMat=new T.MeshPhysicalMaterial({color:0xb76e28,roughness:.12,metalness:.09,clearcoat:1,transparent:true,opacity:.83});
  const stream=mesh(new T.CylinderGeometry(1,1,1,10),streamMat,scene);stream.visible=false;stream.castShadow=false;
  function returnTools(){K.jug.position.copy(K.jugHome);K.jug.rotation.set(0,0,0);K.spoon.position.copy(K.spoonHome);K.spoon.rotation.set(0,-.24,0);stream.visible=false;K.fillSpoon();}
  function endTool(){
    if(!toolAction)return;const name=toolAction.name,o=name==='jug'?K.jug:K.spoon,p=o.position.clone(),q=o.quaternion.clone(),dest=name==='jug'?K.jugHome:K.spoonHome;
    const rot=new T.Quaternion().setFromEuler(new T.Euler(0,name==='jug'?0:-.24,0));
    toolAction=null;stream.visible=false;locked=true;
    animate(.39,t=>{const f=curve(t);o.position.lerpVectors(p,dest,f);o.position.y+=.095*Math.sin(Math.PI*f);o.quaternion.slerpQuaternions(q,rot,f);},()=>{
      locked=false;K.fillSpoon();lastInput=clock;sound('wood',dest,.21);
    });
  }
  function startTool(name){
    const d=focused,obj=name==='jug'?K.jug:K.spoon;
    toolAction={name,d,obj,aim:obj.position.clone(),started:clock,auto:false,finishAt:0,emitting:false,clock:0,drop:0,tilt:0,seed:0,lastSound:0};
    toolAction.aim.y=d.body.position.y+.50;sound('wood',obj.position,.23);
  }
  function operateTool(dt){
    const a=toolAction;if(!a)return;
    const d=a.d,isJug=a.name==='jug',obj=a.obj;
    const local=d.body.worldToLocal(a.aim.clone());let radius=Math.hypot(local.x,local.z);
    const inside=radius<.823,dir=inside?1:0;
    a.tilt=mix(a.tilt,dir,1-Math.exp(-dt*7));
    const high=a.aim.clone();high.y=d.body.position.y+(isJug?.45:.59)+.10*a.tilt;
    high.x+=isJug?.38:0;high.z+=isJug?.042:0;
    obj.position.lerp(high,1-Math.exp(-dt*12));
    obj.rotation.z=isJug?a.tilt*.97:-a.tilt*.41;obj.rotation.y=isJug?.12:-.24;obj.rotation.x=isJug?-.14*a.tilt:.57*a.tilt;
    if(isJug)K.liquid.rotation.z=-obj.rotation.z*.61;
    const source=obj.localToWorld(isJug?V(-.507,.534,0):V(.19,.072,.10));
    const point=d.body.worldToLocal(source.clone());radius=Math.hypot(point.x,point.z);
    const flowing=inside&&radius<.80&&a.tilt>.43;
    stream.visible=false;
    if(flowing){
      const floor=S.plateY(point.x,point.z)+S.value(d.heights,point.x,point.z);
      if(isJug){
        if(!a.emitting){S.sauceBead(d,point.x,point.z,point.y);a.drop=.31;a.emitting=true;}
        if(a.drop>0)a.drop-=dt;
        else {
          const dest=d.body.localToWorld(V(point.x,floor+.012,point.z)),dir=source.clone().sub(dest);
          stream.visible=true;stream.position.copy(dest).lerp(source,.5);stream.quaternion.setFromUnitVectors(V(0,1,0),dir.clone().normalize());
          stream.scale.set(.016+.0025*Math.sin(clock*22),dir.length(),.014);
          S.pour(d,point.x,point.z,dt*.068);
          if(clock-a.lastSound>.39){sound('drip',dest,.16+Math.random()*.1);S.ripple(d,point.x,point.z,.59);a.lastSound=clock;}
        }
      } else {
        a.seed+=dt*16;
        while(a.seed>=1 && K.sesame.count>0){
          a.seed--;K.sesame.count--;
          S.addSeed(d,point.x+(Math.random()-.5)*.13,point.z+(Math.random()-.5)*.12,point.y);sound('seed',source,.39);
        }
      }
    }else a.emitting=false;
    if(a.auto&&clock>a.finishAt){endTool();K.liquid.rotation.z=0;}
  }
  function demoPour(){
    const a=toolAction;if(!a)return;
    const x=(a.name==='jug'?(a.d.volume>.02?-.29:.23):-.05)+(Math.random()-.5)*.20;
    a.aim.copy(a.d.body.localToWorld(V(x,.45,(Math.random()-.5)*.37)));a.auto=true;a.finishAt=clock+1.34;
  }
  // Pointer coordinates are projected onto each tool's real axis or the tabletop.
  canvas.addEventListener('pointerdown',e=>{
    if(active)return;Sound.start();lastInput=clock;
    const key=pick(e.clientX,e.clientY);if(key===null)return;
    if(toolAction){if(toolAction.auto){endTool();}return;}
    Sound.rubAt(0);pressAssist=0;canvas.setPointerCapture(e.pointerId);
    active={key,id:e.pointerId,x:e.clientX,y:e.clientY,lastX:e.clientX,lastY:e.clientY,dist:0,start:clock,phase,base:V(),prev:0,cut,focus:focusAmount,wasFocus:!!focused,dragged:false};
    if(key==='frame'){insertFrame();return;}
    if(key==='jelly'||(key==='rod'&&phase==='rod')){const obj=key==='jelly'?K.fresh:K.rodGroup;active.base.copy(obj.position);obj.position.y+=.067;sound('slide',obj.position,.23);}
    if(typeof key==='object'){active.base.copy(key.body.position);active.floor=tablePoint(e.clientX,e.clientY,key.body.position.y+.17);
      if(key.served&&!focused)startFocus(key);
    }
    if(key==='stack'){
      const top=K.stack.children.filter(o=>o.isGroup&&o.visible).at(-1);
      if(top){active.carry=top;active.base.copy(top.position);active.world=top.getWorldPosition(V());top.position.y+=.045;}
    }
    if(key==='rod'&&phase==='extract')active.base.copy(K.rodGroup.position);
    if(key==='cut'){active.axis=axisParameter(e.clientX,e.clientY,wireOrigin,wireAxis);sound('wood',K.knob.getWorldPosition(V()),.24);}
    if(key==='jug'||key==='spoon')startTool(key);
    if(key==='rod'&&phase==='ready'){active.axis=axisParameter(e.clientX,e.clientY,pushOrigin,pushAxis);returnSpring=0;pressRest=0;}
  });
  canvas.addEventListener('pointermove',e=>{
    const a=active;if(!a||e.pointerId!==a.id)return;
    const x=e.clientX,y=e.clientY,dx=x-a.x,dy=y-a.y;
    a.dist=Math.max(a.dist,Math.hypot(dx,dy));if(a.dist>5)a.dragged=true;
    lastInput=clock;
    if(!locked){
      if(a.key==='rod'&&a.phase==='ready'&&phase==='ready'){
        const axis=axisParameter(x,y,pushOrigin,pushAxis);
        pressBy(axis-a.axis,lastDt);a.axis=axis;
      }else if(a.key==='stack'&&a.carry&&a.dragged){
        const offset=tablePoint(x,y,.29).sub(tablePoint(a.x,a.y,.29));
        const point=a.world.clone().add(offset);point.y+=Math.min(.38,.07+a.dist*.0029);
        a.carry.position.copy(K.stack.worldToLocal(point));
      }else if(a.key==='rod'&&a.phase==='extract'&&a.dragged){
        const d=projectedDelta(a.base,a.base.clone().add(V(-1,0,0)),dx,dy);
        K.rodGroup.position.x=a.base.x-clamp(d,0,a.base.x+2.48);Sound.rubAt(Math.abs(x-a.lastX+y-a.lastY)*.045);
      }else if(a.key==='cut'&&phase==='ready'){
        const axis=axisParameter(x,y,wireOrigin,wireAxis);
        setCut(a.cut+(a.axis-axis)*cutSide/.918);
      }else if((a.key==='jelly'||a.key==='rod'&&a.phase==='rod')&&a.dragged){
        const obj=a.key==='jelly'?K.fresh:K.rodGroup,offset=tablePoint(x,y,a.base.y).sub(tablePoint(a.x,a.y,a.base.y));
        obj.position.copy(a.base).add(offset);obj.position.y+=Math.min(.82,.10+a.dist/120);
        if(a.key==='jelly'){obj.rotation.z=.035*Math.sin(a.dist*.023);obj.rotation.y=mix(K.board.rotation.y,0,Math.min(1,a.dist/100));}
      }else if(typeof a.key==='object'){
        if(focused&&a.wasFocus&&a.focus>.998){
          if(dy< -8){const w=tablePoint(x,y,nearDish.y).sub(tablePoint(a.x,a.y,nearDish.y));
            a.key.body.position.copy(nearDish).addScaledVector(w,.48);a.key.body.position.y+=Math.min(.12,-dy*.001);}
        }else if(phase==='portioned'&&a.key===dish||a.key.served||focused){
          startFocus(a.key);const amount=a.focus+Math.max(dy,Math.hypot(dx,dy)*.56)/Math.max(80,innerHeight*.19);
          slideToFront(amount);
        }else if(a.key===dish&&phase==='ready'){
          const now=tablePoint(x,y,homeDish.y+.17);moveDish(a.base.x+now.x-a.floor.x,a.base.z+now.z-a.floor.z);
        }
      }else if(toolAction&&a.key===toolAction.name){
        const p=tablePoint(x,y,focused.body.position.y+.16);
        toolAction.aim.copy(p);
      }
    }
    a.lastX=x;a.lastY=y;
  });
  function release(e,cancelled=false){
    const a=active;if(!a||e.pointerId!==a.id)return;active=null;lastInput=clock;
    try{if(canvas.hasPointerCapture(e.pointerId))canvas.releasePointerCapture(e.pointerId);}catch{}
    if(a.key==='frame'||locked){stopRubbing();return;}
    const tap=!a.dragged&&!cancelled;
    if(a.key==='jelly'&&phase==='jelly'){if(cancelled){shiftObj(K.fresh,K.boardHome,K.board.rotation.y,.02,.36);}else insertAgar();}
    else if(a.key==='rod'){
      if(phase==='rod'){if(cancelled)shiftObj(K.rodGroup,K.rodHome,-.10,.04,.30);else insertRod();}
      else if(phase==='extract'&&!cancelled)extractRod();
      else if(phase==='ready'){
        if(tap){pressAssist=Math.max(0,insideEnd-remaining-headDepth-head)+(dish.travel===0?.042:.10+Math.random()*.029);}
        else releasePress();
      }
    } else if(a.key==='cut'&&phase==='ready'&&tap){
      const from=cut,to=Math.min(1,cut+.23);locked=true;animate(.29,t=>setCut(mix(from,to,curve(t))),()=>locked=false);
    }else if(a.key==='stack'&&phase==='next'){
      if(!cancelled)takePlate(a.carry);if(a.carry)a.carry.position.copy(a.base);
    }
    else if(a.key==='store'&&focused&&!cancelled)storeFocus();
    else if(a.key==='jug'||a.key==='spoon'){
      if(tap)demoPour();else endTool();K.liquid.rotation.z=0;
    }else if(typeof a.key==='object'){
      if(a.wasFocus&&a.focus>=.998){
        if(a.lastY<a.y-Math.max(30,innerHeight*.057)&&!cancelled)storeFocus();
        else {a.key.body.position.copy(nearDish);if(tap)nudge(a.key);}
      }else if(a.key.served||phase==='portioned'||focused){
        startFocus(a.key);
        if(tap||focusAmount>.85){finishPull();}
      } else if(a.key===dish&&phase==='ready'&&tap){
        shiftCount++;const x=dish.body.position.x,z=dish.body.position.z,d=shiftCount%2?1:-1;
        animate(.37,t=>moveDish(mix(x,homeDish.x+d*.31,curve(t)),mix(z,homeDish.z-d*.24,curve(t))));
        sound('slide',dish.body.position,.30);
      }
    }
  }
  canvas.addEventListener('pointerup',e=>release(e));
  canvas.addEventListener('pointercancel',e=>release(e,true));
  canvas.addEventListener('contextmenu',e=>e.preventDefault());
  const guideMat=new T.MeshPhysicalMaterial({color:0xfff8db,roughness:.28,transparent:true,opacity:0,depthWrite:false,clearcoat:1});
  const fingertip=mesh(new T.CapsuleGeometry(.073,.105,7,16),guideMat,scene);fingertip.castShadow=fingertip.receiveShadow=false;fingertip.renderOrder=10;fingertip.rotation.set(.24,.10,-.43);
  let glowing=[];
  const glowLookup=new Map();
  function glow(key,obj){
    if(key===guideKey&&glowing.length)return;
    for(const pair of glowing)pair.mesh.material=pair.original;
    glowing=[];guideKey=key;
    if(!obj)return;
    if(!glowLookup.has(obj)){
      const list=[];obj.traverse(m=>{if(!m.isMesh||!m.visible||!m.material.emissive||m===K.block&&remaining===0)return;
        const original=m.material,lit=original.clone();lit.emissive.set(0xffbf6b);list.push({mesh:m,original,lit});});
      glowLookup.set(obj,list);
    }
    glowing=glowLookup.get(obj);for(const p of glowing)p.mesh.material=p.lit;
  }
  function hint(){
    if(locked||active||toolAction||pressAssist>0)return null;
    if(focused){
      if(focusAmount<.998)return ['pull',focused.body,focused.body.localToWorld(V(.32,.24,.68)),V(.1,0,.6)];
      if(!focused.hasSauce)return ['jug',K.jug,K.jug.localToWorld(V(.10,.49,.13)),V(-.67,.25,-.2)];
      if(!focused.hasSesame)return ['spoon',K.spoon,K.spoon.localToWorld(V(-.68,.13,0)),V(.60,.27,-.42)];
      return ['store',focused.body,focused.body.localToWorld(V(.12,.25,.68)),V(-.12,.15,-.68)];
    }
    if(phase==='frame')return ['frame',K.frame,K.frame.localToWorld(V(.07,.425,.18)),V(0,-.32,0)];
    if(phase==='jelly')return ['jelly',K.fresh,K.fresh.localToWorld(V(-.09,.315,.11)),V(-.4,.41,-.64)];
    if(phase==='rod'||phase==='extract'){
      return [phase,K.rodGroup,K.rodGroup.localToWorld(V(-2.91,.25,.08)),phase==='rod'?V(.68,.3,.26):V(-.63,.06,0)];
    }
    if(phase==='ready'){
      if(S.enough(dish)&&(!shifted&&dish.travel>1.56&&dish.travel<2.70)){
        return ['shift',dish.body,dish.body.localToWorld(V(.44,.24,.62)),V(.38,0,-.22)];
      }
      if(S.enough(dish)&&(cut>0||remaining<=0||shifted||pressRest>2.8)){
        return ['cut',K.knob,K.knob.localToWorld(V(0,.47,0)),V(0,0,-.57*cutSide)];
      }
      return ['push',K.rodGroup,K.rodGroup.localToWorld(V(-2.91,.24,.12)),V(.66,0,0)];
    }
    if(phase==='portioned')return ['pull',dish.body,dish.body.localToWorld(V(.22,.25,.71)),V(.02,.06,.72)];
    if(phase==='next')return ['stack',K.stack,K.stack.localToWorld(V(.13,.42,.37)),V(-.29,.26,.72)];
    return null;
  }
  function updateGuide(dt){
    const h=hint();if(!h){if(glowing.length)glow('',null);fingertip.visible=false;return;}
    glow(h[0],h[1]);
    const intensity=.048+.092*(.5+.5*Math.cos(clock*2.8))**2;
    for(const p of glowing)p.lit.emissiveIntensity=intensity;
    if(phase==='frame')K.frame.position.y=K.axisY+.32+.022*(.5+.5*Math.sin(clock*3.1));
    const idle=clock-lastInput;
    fingertip.visible=idle>4;
    if(idle>4){const t=((idle-4)%3.3)/3.3,p=curve(clamp((t-.23)/.54,0,1));
      fingertip.position.copy(h[2]).addScaledVector(h[3],p);
      fingertip.position.y+=.11+.16*(1-curve(clamp(t/.24,0,1)))+.16*curve(clamp((t-.79)/.2,0,1));
      guideMat.opacity=.40*Math.min(1,t*8,(1-t)*6);
    }
  }
  function resize(){
    renderer.setSize(innerWidth,innerHeight,false);camera.aspect=innerWidth/innerHeight;
    const narrow=clamp((1.12-camera.aspect)/.62,0,1);
    camera.fov=mix(32.5,40,narrow);camera.updateProjectionMatrix();
    // Re-lay the loose kit along the counter on a narrow screen, keeping the mouth above the dish.
    K.stack.position.set(mix(2.98,-4.82,narrow),.004,mix(-2.66,.58,narrow));
    K.resting.position.set(mix(1.11,-.85,narrow),.006,mix(-2.40,-1.99,narrow));
    for(const d of dishes){if(!d.slot)continue;
      d.slot.set(K.resting.position.x-d.slotIndex%5*1.80,d.slotIndex===0?.154:.005,K.resting.position.z-Math.floor(d.slotIndex/5)*1.74);
      if(d.served&&d!==focused)d.body.position.copy(d.slot);
    }
    K.board.position.set(mix(-1.95,-2.36,narrow),.072,mix(1.12,1.00,narrow));
    K.towel.position.set(K.board.position.x-.20,.015,K.board.position.z+.08);
    K.boardHome.set(K.board.position.x-.035,.525,K.board.position.z);
    K.rodHome.set(mix(-1.63,-2.56,narrow),.33,mix(-1.59,-.47,narrow));
    if(!locked&&!active){if(phase==='frame'||phase==='jelly')K.fresh.position.copy(K.boardHome);if(['frame','jelly','rod'].includes(phase))K.rodGroup.position.copy(K.rodHome);}
    K.tray.scale.z=mix(1,.92,narrow);
    const dir=V(mix(4.7,9.5,narrow),mix(4.65,8.6,narrow),mix(8.4,1.22,narrow)).normalize();
    const right=V(dir.z,0,-dir.x).normalize(),up=dir.clone().cross(right).normalize();
    const kit=[
      V(K.board.position.x-1.37,.14,K.board.position.z+.63),V(K.board.position.x+1.33,.14,K.board.position.z+.62),
      K.rodHome.clone().add(V(-3.04,.20,-.29)),V(-4.64,1.54,-.18),V(.81,2.21,-.90),
      V(3.27,.22,.12+1.71*K.tray.scale.z),V(-.20,.21,.12+1.71*K.tray.scale.z),V(3.26,.22,.12-1.71*K.tray.scale.z),
      K.stack.position.clone().add(V(.78,.38,0)),K.stack.position.clone().add(V(0,.42,-.80)),
      K.resting.position.clone().add(V(.2,.08,mix(-.82,-.42,narrow))),V(-2.14,1.87,-.97)
    ];
    const tanV=Math.tan(T.MathUtils.degToRad(camera.fov/2)),tanH=tanV*camera.aspect;
    baseLook.set(-.17,.58,-.30);
    let dist=0;
    for(let j=0;j<4;j++){
      dist=0;for(const p of kit){const v=p.clone().sub(baseLook);dist=Math.max(dist,v.dot(dir)+Math.abs(v.dot(right))/(tanH*.925),v.dot(dir)+Math.abs(v.dot(up))/(tanV*.86));}
      let lo=1,hi=-1,bot=1,top=-1;
      for(const p of kit){const v=p.clone().sub(baseLook),z=dist-v.dot(dir),x=v.dot(right)/(z*tanH),y=v.dot(up)/(z*tanV);
        lo=Math.min(lo,x);hi=Math.max(hi,x);bot=Math.min(bot,y);top=Math.max(top,y);}
      if(j<3){baseLook.addScaledVector(right,(lo+hi)*.49*dist*tanH);baseLook.addScaledVector(up,((bot+top)*.5+.033)*dist*tanV);}
    }
    basePos.copy(baseLook).addScaledVector(dir,dist);
    if(!cameraReady||!focused){camera.position.copy(basePos);cameraLook.copy(baseLook);camera.lookAt(cameraLook);cameraReady=true;}
    camera.updateMatrixWorld();scene.updateMatrixWorld();
  }
  function updateCamera(dt){
    const f=focused?focusAmount:0,narrow=clamp((1.12-camera.aspect)/.62,0,1);
    const look=baseLook.clone(),pos=basePos.clone();
    if(focused){
      const d=focused,tip=d.body.localToWorld(d.lastTip.clone()),center=d.body.position.clone().add(V(0,.17,0));
      const closeDir=V(mix(.80,2.59,narrow),mix(2.67,3.96,narrow),mix(2.55,1.29,narrow)).normalize();
      const closeDist=Math.max(3.56,2.39/(2*Math.tan(T.MathUtils.degToRad(camera.fov/2))*camera.aspect));
      const close=center.clone().addScaledVector(closeDir,closeDist);
      const bend=center.clone().add(V(2.07,1.12,3.22)).lerp(basePos,.10*narrow);
      if(f<.62){
        const u=curve(f/.62);pos.lerp(bend,u);look.lerp(tip,u);
      }else{
        const u=curve((f-.62)/.38);pos.lerpVectors(bend,close,u);look.lerpVectors(tip,center,u);
      }
    }
    const ease=1-Math.exp(-dt*14);camera.position.lerp(pos,ease);cameraLook.lerp(look,ease);camera.lookAt(cameraLook);camera.updateMatrixWorld();
  }
  function update(dt){
    clock+=dt;lastDt=dt;W.water.roughness=.072+.008*Math.sin(clock*1.26);
    for(let i=tweens.length-1;i>=0;i--){const a=tweens[i];a.t=Math.min(1,a.t+dt/Math.max(.01,a.duration));a.update(a.t);if(a.t>=1){tweens.splice(i,1);a.done?.();}}
    if(pressAssist>0){const d=Math.min(pressAssist,dt*.74);pressBy(d,dt);pressAssist-=d;if(pressAssist<.00001){pressAssist=0;releasePress();}}
    if(active?.key==='rod'&&active.phase==='ready'&&!active.dragged&&clock-active.start>.49&&phase==='ready')pressBy(dt*.081,dt);
    if(clock-lastStroke>.075 && pressAssist===0){
      quiet*=Math.exp(-dt*2.3);pressRest+=dt;if(speed>.01){speed*=Math.exp(-dt*13);Sound.rubAt(speed,soundPos);}
    }
    if(returnSpring>.00005){returnSpring*=Math.exp(-dt*6.3);if(phase==='ready'||phase==='portioned')K.rodGroup.position.x=head-returnSpring;}
    if(dripAfter>0&&clock>dripAfter){const p=V(K.exit+.045,K.axisY-.17,K.zAxis+.13);
      particle(p,V(.10,-.17,.04),.019);dripAfter=-1;}
    if(clock>nextDrop&&phase==='ready'&&dish?.travel>.37){
      nextDrop=clock+3.1+Math.random()*2.3;particle(V(K.exit+.12,K.axisY-.18,K.zAxis-.09),V(.06,-.11,.018),.013);
    }
    updateCamera(dt);
    if(toolAction)operateTool(dt);
    for(const d of dishes)S.updateDish(d,dt,clock,quiet);
    for(let i=particles.length-1;i>=0;i--){
      const p=particles[i];p.v.y-=dt*3.9;p.o.position.addScaledVector(p.v,dt);p.ttl-=dt;
      if(p.o.position.y<=p.floor||p.ttl<0){
        if(p.o.scale.x>.018&&p.o.position.y<=p.floor)sound('drip',p.o.position,p.type==='sauce'?.21:.17);
        p.o.removeFromParent();particles.splice(i,1);
      }
    }
    updateGuide(dt);
  }
  let last=performance.now();
  function loop(now){
    const dt=clamp((now-last)/1000,.001,.045);last=now;
    update(dt);renderer.render(scene,camera);requestAnimationFrame(loop);
  }
  window.addEventListener('resize',resize);
  window.addEventListener('blur',()=>{if(active)release({pointerId:active.id},true);pressAssist=0;stopRubbing();});
  document.addEventListener('visibilitychange',()=>{if(document.hidden)stopRubbing();last=performance.now();});
  resize();updateGuide(0);requestAnimationFrame(loop);
})();
