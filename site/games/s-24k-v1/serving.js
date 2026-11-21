'use strict';
const Serving = (() => {
  const {T,V,clamp,mix,group,mesh,mat,ball}=W, K=Kitchen;
  const gridSize=37, extent=.88, cell=2*extent/(gridSize-1);
  const entryX=K.exit+.012, tau=Math.PI*2;
  const plateY=(x,z)=>.086+.205*Math.pow(clamp(Math.hypot(x,z)/.85,0,1),3.9);
  const noodleMat=new T.MeshPhysicalMaterial({color:0xffe2ac,roughness:.14,metalness:.035,transparent:true,opacity:.87,transmission:.57,thickness:.10,ior:1.345,clearcoat:1,clearcoatRoughness:.10,side:T.DoubleSide,depthWrite:true});
  const paleMat=noodleMat.clone();paleMat.color.set(0xffeccc);paleMat.opacity=.77;
  const sauce=new T.MeshPhysicalMaterial({color:0xffffff,vertexColors:true,roughness:.115,metalness:.035,clearcoat:1,side:T.DoubleSide});
  const glint=mat(0xfff9df,.10,{metalness:.4});
  const cross=[[.68,1],[-.68,1],[-1,.68],[-1,-.68],[-.68,-1],[.68,-1],[1,-.68],[1,.68]];
  const tmp=V(),out=V(),local=V(),direction=V(),side=V(),up=V(),zDir=V(0,0,1);
  function gridCoords(x){return clamp((x+extent)/cell,0,gridSize-1.0001);}
  function value(field,x,z) {
    const u=gridCoords(x),v=gridCoords(z),i=Math.floor(u),j=Math.floor(v),f=u-i,g=v-j,k=i+j*gridSize;
    return mix(mix(field[k],field[k+1],f),mix(field[k+gridSize],field[k+gridSize+1],f),g);
  }
  function spread(field,x,z,amount,radius){
    const i=Math.round(gridCoords(x)),j=Math.round(gridCoords(z));
    for(let b=Math.max(0,j-radius);b<=Math.min(gridSize-1,j+radius);b++)for(let a=Math.max(0,i-radius);a<=Math.min(gridSize-1,i+radius);a++){
      const ds=(a-i)**2+(b-j)**2;if(ds<=radius*radius)field[a+b*gridSize]+=amount*Math.exp(-ds/(radius*.73));
    }
  }
  function createDish(x,z) {
    const body=K.plate(K.root);body.position.set(x,K.plateBase,z);body.rotation.y=(Math.random()-.5)*.22;
    const content=group(body),heights=new Float32Array(gridSize**2),liquid=new Float32Array(gridSize**2);
    return {body,content,heights,liquid,noodles:[],seeds:[],waves:[],pool:null,flowTime:0,liquidClock:0,
      served:false,shake:0,seed:Math.random()*tau,lastTip:V(),drops:[],volume:0,travel:0,hasSauce:false,hasSesame:false};
  }
  function makeStrand(d,row,col){
    const s={row,col,amount:0,laid:0,points:[],cut:false,fall:0,loose:null,phase:d.seed+row*.48+col*.40,landed:false};
    s.anchor=V(entryX,K.axisY+(row-2)*.131,K.zAxis+(col-2)*.131);
    s.g=group(d.content);s.mesh=mesh(new T.BufferGeometry(),(row+col)%4===0?paleMat:noodleMat,s.g);
    s.mesh.frustumCulled=false;s.mesh.visible=false;s.mesh.castShadow=false;s.mesh.renderOrder=3;
    s.mesh.geometry.setAttribute('position',new T.BufferAttribute(new Float32Array(0),3));
    s.capacity=0;s.settled=false;s.lastSpd=0;d.noodles.push(s);return s;
  }
  function initBatch(d) {
    for(let row=0;row<5;row++)for(let col=0;col<5;col++)makeStrand(d,row,col);
    if(Math.random()<.17){const s=d.noodles[Math.floor(Math.random()*25)];s.bubble=ball(s.g,0,0,0,.017,.013,.016,glint);s.bubble.visible=false;}
  }
  // Local coordinates keep all landed folds attached to their own saucer.
  function localPoint(d,world,target) {
    return d.body.worldToLocal(target.copy(world));
  }
  function anchorFloor(d,s,length,speed,target){
    const index=s.row*5+s.col;
    const wave=length*(3.7+speed*.16)+s.phase;
    const reach=.38+.105*speed+.125*Math.sin(wave+.47*s.row);
    tmp.set(entryX+reach+.055*(s.row-2),0,K.zAxis+(s.col-2)*.105);
    localPoint(d,tmp,target);
    target.x+=Math.sin(wave*1.12)*.155+Math.cos(length*2.1+d.seed)*.08;
    target.z+=Math.sin(wave*1.24+length*.7)*(.13+.045*speed)+Math.sin(length*2.2+s.phase)*.092;
    // Material slips away from the local crest and stops inside the porcelain rim.
    const hx=value(d.heights,target.x+.047,target.z)-value(d.heights,target.x-.047,target.z);
    const hz=value(d.heights,target.x,target.z+.047)-value(d.heights,target.x,target.z-.047);
    target.x-=clamp(hx*1.4,-.12,.12);target.z-=clamp(hz*1.4,-.12,.12);
    const r=Math.hypot(target.x,target.z),max=.722+(index%3)*.012;
    if(r>max){target.x*=max/r;target.z*=max/r;}
    target.y=plateY(target.x,target.z)+.022+value(d.heights,target.x,target.z);
    return target;
  }
  function extrude(d,amount,speed){
    if(!d.noodles.length)initBatch(d);
    d.travel+=amount;
    for(const s of d.noodles){
      if(s.cut)continue;
      s.settled=false;s.amount+=amount;s.lastSpd=mix(s.lastSpd,clamp(speed,0,2),.28);
      const floor=anchorFloor(d,s,0,s.lastSpd,out);
      const source=localPoint(d,s.anchor,local);
      if(!s.flight)s.flight=source.distanceTo(floor)*1.075;
      const deposited=Math.max(0,s.amount-s.flight);
      while(s.laid+.036<=deposited || (!s.landed && s.amount>=s.flight)){
        const p=anchorFloor(d,s,s.laid,s.lastSpd,V());
        if(s.points.length){const prev=s.points[s.points.length-1];const step=p.clone().sub(prev);
          if(step.length()>.067)p.copy(prev).addScaledVector(step.normalize(),.067);
          p.y=plateY(p.x,p.z)+.022+value(d.heights,p.x,p.z);
        }
        s.points.push(p);s.landed=true;s.laid+=.036;
        spread(d.heights,p.x,p.z,.0037,2);
        d.lastTip.copy(p);
      }
    }
  }
  function enough(d){return d.noodles.some(s=>s.landed);}
  function path(d,s,t,time,source,end,wobble){
    const a=t*t*(2.15-1.15*t),forward=Math.sin(t*Math.PI)*(.105+.025*s.lastSpd);
    const v=V(mix(source.x,end.x,t)+forward,mix(source.y,end.y,a),mix(source.z,end.z,t));
    const bow=Math.sin(Math.PI*t);
    v.y-=bow*t*.087*(1-clamp(wobble/.05,0,1));
    v.x+=bow*wobble*1.16;v.z+=bow*Math.sin(time*8.1+s.phase+t*5)*wobble;
    return v;
  }
  function currentPath(d,s,time,quiet){
    const source=localPoint(d,s.anchor,V());
    const end=s.landed?s.points[s.points.length-1]:anchorFloor(d,s,0,s.lastSpd,V());
    const flight=s.flight||source.distanceTo(end)*1.075,tmax=Math.min(1,s.amount/flight);
    const n=Math.max(2,Math.ceil(16*tmax)),p=[];
    for(let i=0;i<=n;i++)p.push(path(d,s,tmax*i/n,time,source,end,.006+quiet*.045));
    if(s.landed)for(let i=s.points.length-2;i>=0;i--)p.push(s.points[i]);
    return p;
  }
  function cutColumn(d,col,t){
    for(const s of d.noodles){if(s.col!==col||s.cut)continue;
      s.cut=true;s.fall=0;s.loose=currentPath(d,s,t,.1);
      s.targets=s.loose.map(p=>p.clone());
      const join=Math.min(16,s.targets.length-1);
      if(!s.landed)anchorFloor(d,s,0,s.lastSpd,s.targets[join]);
      let angle=2.4+s.col*.13+s.row*.22,walk=0;
      for(let i=join-1;i>=0;i--){
        const next=s.targets[i+1],p=s.targets[i],length=s.loose[i].distanceTo(s.loose[i+1]);walk+=length;
        angle+=length*(3.35+1.8*Math.sin(walk*3+s.phase));
        p.set(next.x+Math.cos(angle)*length,0,next.z+Math.sin(angle)*length);
        const r=Math.hypot(p.x,p.z);if(r>.754){p.x*=.754/r;p.z*=.754/r;angle=Math.atan2(-p.z,-p.x)+.8;}
        p.y=plateY(p.x,p.z)+value(d.heights,p.x,p.z)+.022;
      }
      s.settled=false;d.lastTip.copy(s.targets[0]);
    }
  }
  function writeTube(s,p){
    const n=p.length;if(s.capacity<n){
      s.capacity=Math.max(32,2**Math.ceil(Math.log2(n+1)));
      const g=s.mesh.geometry;g.dispose();
      for(const k of ['position','normal'])g.setAttribute(k,new T.BufferAttribute(new Float32Array((s.capacity*8+2)*3),3).setUsage(T.DynamicDrawUsage));
      const ix=[];for(let i=0;i<s.capacity-1;i++)for(let j=0;j<8;j++){const a=i*8+j,b=i*8+(j+1)%8;ix.push(a,a+8,b,b,a+8,b+8);}
      // Closed ends keep very short extrusions visibly square.
      const capIx=[0,1,2,0,2,3,0,3,4,0,4,5,0,5,6,0,6,7];
      s.indexArray=new Uint32Array(ix.length+36);s.indexArray.set(ix);s.capIx=capIx;
      g.setIndex(new T.BufferAttribute(s.indexArray,1));s.endIndex=-1;
    }
    const geo=s.mesh.geometry,P=geo.attributes.position,N=geo.attributes.normal;
    const count=(n-1)*48;
    if(s.endIndex!==count){
      // Restore any edge triangles overwritten by the previous moving cap.
      if(s.endIndex>=0){const i=s.endIndex/48;for(let j=0;j<8;j++){const a=i*8+j,b=i*8+(j+1)%8;s.indexArray.set([a,a+8,b,b,a+8,b+8],s.endIndex+j*6);}}
      s.indexArray.set(s.capIx,count);s.indexArray.set(s.capIx.map(v=>(n-1)*8+v).reverse(),count+18);geo.index.needsUpdate=true;s.endIndex=count;
    }
    const movingCount=!s.cut&&s.landed&&s.cachedCount===n?Math.min(n,19):n;
    s.cachedCount=n;
    for(let i=0;i<movingCount;i++){
      direction.subVectors(p[Math.min(i+1,n-1)],p[Math.max(0,i-1)]).normalize();
      side.copy(zDir).addScaledVector(direction,-direction.z);
      if(side.lengthSq()<.002){side.set(1,0,0).addScaledVector(direction,-direction.x);}side.normalize();up.crossVectors(side,direction).normalize();
      const width=.036+(s.row%2)*.002,thick=.025;
      for(let j=0;j<8;j++){
        const a=cross[j][0],b=cross[j][1],k=i*8+j;
        tmp.copy(p[i]).addScaledVector(side,a*width).addScaledVector(up,b*thick);P.setXYZ(k,tmp.x,tmp.y,tmp.z);
        tmp.copy(side).multiplyScalar(a).addScaledVector(up,b).normalize();N.setXYZ(k,tmp.x,tmp.y,tmp.z);
      }
    }
    geo.setDrawRange(0,count+36);P.needsUpdate=N.needsUpdate=true;s.mesh.visible=true;
    if(s.bubble){s.bubble.visible=true;s.bubble.position.copy(p[Math.max(0,n-3)]).y+=.018;}
  }
  function updateNoodles(d,dt,time,motion){
    for(const s of d.noodles){
      if(s.amount<.0002||s.settled)continue;
      let p;
      if(s.cut){
        s.fall=Math.min(1,s.fall+dt*1.69);
        p=s.loose.map((a,i)=>{const b=s.targets[i],f=clamp(s.fall*1.35-(1-Math.min(i/16,1))*.23,0,1),q=a.clone().lerp(b,f*f*(3-2*f));
          q.y+=Math.max(0,Math.sin(f*Math.PI*1.85))*.045*(1-f);return q;});
        if(s.fall>=1){s.settled=true;for(let i=0;i<Math.min(16,p.length);i++)spread(d.heights,p[i].x,p[i].z,.003,2);}
      } else p=currentPath(d,s,time,motion);
      writeTube(s,p);
    }
  }
  // A conservative height-field flow uses the same deposited heights as the strands.
  function ensurePool(d){
    if(d.pool)return;
    const g=new T.BufferGeometry(),pos=[],colors=[];
    for(let j=0;j<gridSize;j++)for(let i=0;i<gridSize;i++){pos.push(i*cell-extent,0,j*cell-extent);colors.push(.3,.12,.03);}
    g.setAttribute('position',new T.Float32BufferAttribute(pos,3));g.setAttribute('color',new T.Float32BufferAttribute(colors,3));g.setAttribute('normal',new T.Float32BufferAttribute(pos.map((_,i)=>i%3===1?1:0),3));
    g.setIndex(new T.BufferAttribute(new Uint16Array((gridSize-1)**2*6),1));g.setDrawRange(0,0);
    d.pool=mesh(g,sauce,d.content);d.pool.renderOrder=1;d.pool.castShadow=false;d.pool.frustumCulled=false;d.flow=new Float32Array(gridSize**2);d.kick=new Float32Array(gridSize**2);d.waveHeight=new Float32Array(gridSize**2);
  }
  function pour(d,x,z,amount){
    ensurePool(d);d.hasSauce=true;d.volume+=amount;d.flowTime=3.5;
    const r=Math.hypot(x,z);if(r>.69){x*=.69/r;z*=.69/r;}
    spread(d.liquid,x,z,amount,2);
    for(const s of d.seeds){if(Math.hypot(s.p.x-x,s.p.z-z)<.24){s.v.x+=(s.p.x-x)*amount*4;s.v.z+=(s.p.z-z)*amount*4;s.asleep=false;}}
  }
  function fluidStep(d){
    const f=d.liquid,delta=d.flow;delta.fill(0);
    for(let j=1;j<gridSize-1;j++)for(let i=1;i<gridSize-1;i++){
      let k=i+j*gridSize;if(f[k]<.00009)continue;
      const x=i*cell-extent,z=j*cell-extent,level=plateY(x,z)+d.heights[k]*.72+f[k];
      let remaining=f[k]*.62;
      for(const off of [1,-1,gridSize,-gridSize]){
        const h=k+off,xx=(h%gridSize)*cell-extent,zz=Math.floor(h/gridSize)*cell-extent;
        if(Math.hypot(xx,zz)>.775)continue;
        const diff=level-(plateY(xx,zz)+d.heights[h]*.72+f[h]);
        if(diff<=0)continue;const flow=Math.min(remaining*.46,diff*.21);delta[k]-=flow;delta[h]+=flow;remaining-=flow;
      }
    }
    for(let k=0;k<f.length;k++)f[k]=Math.max(0,f[k]+delta[k]);
    // Dry banks and noodle ridges reflect the shallow surface wave back into the pool.
    const wave=d.waveHeight,kick=d.kick;
    for(let j=1;j<gridSize-1;j++)for(let i=1;i<gridSize-1;i++){
      const k=i+j*gridSize;if(f[k]<.0004){kick[k]=wave[k]=0;continue;}
      let lap=0;for(const off of [1,-1,gridSize,-gridSize]){const h=k+off;if(f[h]>.0004 && d.heights[h]<d.heights[k]+f[k]+.025)lap+=wave[h]-wave[k];}
      kick[k]=kick[k]*.89+lap*.18;
    }
    for(let k=0;k<f.length;k++)wave[k]=clamp(wave[k]+kick[k],-.018,.018);
    const g=d.pool.geometry,p=g.attributes.position,col=g.attributes.color,indices=g.index.array;let n=0;
    for(let j=0;j<gridSize;j++)for(let i=0;i<gridSize;i++){
      const k=i+j*gridSize,x=i*cell-extent,z=j*cell-extent,depth=f[k],a=clamp(depth*14,0,1);
      const ripple=wave[k];
      p.setY(k,plateY(x,z)+.003+Math.min(.14,depth*.90)+Math.min(d.heights[k]*.63,depth*2.8)+ripple);
      col.setXYZ(k,mix(.80,.17,a),mix(.52,.052,a),mix(.21,.010,a));
      if(i<gridSize-1&&j<gridSize-1){
        const b=k+1,c=k+gridSize,e=c+1;
        if(f[k]+f[b]+f[c]>.003) {indices[n++]=k;indices[n++]=c;indices[n++]=b;}
        if(f[b]+f[c]+f[e]>.003) {indices[n++]=b;indices[n++]=c;indices[n++]=e;}
      }
    }
    g.index.needsUpdate=p.needsUpdate=col.needsUpdate=true;g.setDrawRange(0,n);
  }
  function sauceBead(d,x,z,height){
    const o=ball(d.content,x,height,z,.042,.047,.042,K.sauceMat);o.castShadow=false;o.renderOrder=4;
    d.drops.push({o,vy:-.12,t:0,vx:0,vz:0});
  }
  function rollDrops(d,dt){
    for(let i=d.drops.length-1;i>=0;i--){
      const b=d.drops[i],p=b.o.position,h=(x,z)=>plateY(x,z)+value(d.heights,x,z);
      b.vy-=dt*3.8;p.y+=b.vy*dt;
      if(p.y<=h(p.x,p.z)+.026){
        if(!b.t)Sound.tap('drip',.25);b.t+=dt;
        p.y=h(p.x,p.z)+.025;b.vy=0;
        const gain=Math.min(1,b.t*5)*dt*7;
        b.vx+=(h(p.x-.024,p.z)-h(p.x+.024,p.z))*gain;b.vz+=(h(p.x,p.z-.024)-h(p.x,p.z+.024))*gain;
        b.vx*=Math.exp(-dt*3);b.vz*=Math.exp(-dt*3);p.x+=b.vx*dt;p.z+=b.vz*dt;
        if(b.t>.20){const f=clamp(1-(b.t-.2)*1.65,0,1);b.o.scale.set(.043*f,.030*f,.042*f);pour(d,p.x,p.z,.025*dt);}
        if(b.t>.81){b.o.removeFromParent();d.drops.splice(i,1);}
      }
    }
  }
  function addSeed(d,x,z,height){
    if(d.seeds.length>=230)return;
    if(!d.seedBatch)d.seedBatch=K.seedBatch(d.content,230);
    const p=K.seedPose(x,height,z),index=d.seeds.length;p.updateMatrix();d.seedBatch.setMatrixAt(index,p.matrix);d.seedBatch.count=index+1;
    d.seeds.push({p:p.position,m:p,index,v:V((Math.random()-.5)*.16,0,(Math.random()-.5)*.16),bounce:0,asleep:false});
    d.hasSesame=true;
  }
  function ripple(d,x,z,strength){
    if(d.pool){spread(d.kick,x,z,.0045*strength,2);d.flowTime=Math.max(d.flowTime,1.3);
      if(strength>1)for(let k=0;k<d.liquid.length;k++)if(d.liquid[k]>.001)d.kick[k]+=.0025*Math.sin(k%gridSize*.19);}

    const ring=mesh(new T.TorusGeometry(.09,.004,5,36),mat(0xffecbf,.18,{transparent:true,opacity:.48,depthWrite:false}),d.content,x,plateY(x,z)+value(d.liquid,x,z)+.009,z);ring.rotation.x=-Math.PI/2;ring.castShadow=false;
    d.waves.push({ring,t:0,strength});
  }
  function wick(d,dt,t){
    if(!d.noodles.length||d.travel<.3)return;
    if(!d.dew){
      d.dew=ball(d.content,0,0,0,.014,.018,.014,W.water);
      d.dew.castShadow=false;d.dew.visible=false;d.nextDew=t+2.3;d.dewAge=0;
    }
    if(!d.dew.visible){
      if(t<d.nextDew)return;
      d.dewStrand=d.noodles[Math.floor(Math.random()*d.noodles.length)];
      if(d.dewStrand.cut&&!d.dewStrand.settled){d.nextDew=t+.75;return;}
      d.dew.visible=true;d.dewAge=0;d.dewOffset=Math.random()*.45;
    }
    d.dewAge+=dt;const s=d.dewStrand,f=clamp(d.dewAge/1.36,0,1),p=d.dew.position;
    if(s.cut){
      const line=s.targets;if(!line)return;
      const u=clamp(d.dewOffset+f*.24,0,.98)*(line.length-1),i=Math.floor(u);
      p.lerpVectors(line[i],line[i+1],u-i);
    }else{
      const source=localPoint(d,s.anchor,V()),end=s.landed?s.points.at(-1):anchorFloor(d,s,0,s.lastSpd,V());
      p.copy(path(d,s,Math.min(1,s.amount/s.flight)*(.10+f*f*.85),t,source,end,.008));
    }
    p.y+=.028;const scale=Math.min(1,d.dewAge*5,Math.max(0,(1.6-d.dewAge)*4));
    d.dew.scale.set(.016*scale,.019*scale,.015*scale);
    if(d.dewAge>1.6){d.dew.visible=false;d.nextDew=t+3+Math.random()*4;}
  }
  function updateDish(d,dt,t,motion){
    updateNoodles(d,dt,t,motion);rollDrops(d,dt);wick(d,dt,t);
    if(d.shake>.001){d.shake*=Math.exp(-4.6*dt);d.body.rotation.z=Math.sin(t*19)*.013*d.shake;d.body.rotation.x=Math.cos(t*17)*.01*d.shake;}
    if(d.pool&&d.flowTime>0){d.flowTime-=dt;d.liquidClock+=dt;if(d.liquidClock>=.041){fluidStep(d);d.liquidClock=0;}}
    for(const s of d.seeds){
      if(s.asleep && d.flowTime<=0 && d.shake<.03)continue;
      const p=s.p,v=s.v,h=value(d.heights,p.x,p.z),water=value(d.liquid,p.x,p.z);
      const bottom=plateY(p.x,p.z)+Math.max(h,water)+.018;
      v.y-=dt*3.4;p.addScaledVector(v,dt);
      if(p.y<bottom){
        if(!s.touched){s.touched=true;if(water>.002)ripple(d,p.x,p.z,.64);}
        p.y=bottom;v.y=s.bounce<3&&water<.006?Math.abs(v.y)*.29:0;
        if(v.y>.02){s.bounce++;s.m.rotation.y+=.27;}else s.bounce=3;
        const slope=(x,z)=>plateY(x,z)+value(d.heights,x,z)*.7+value(d.liquid,x,z)+(d.waveHeight?value(d.waveHeight,x,z):0);
        const drift=water>.002?.68:.2;
        v.x+=(slope(p.x-.035,p.z)-slope(p.x+.035,p.z))*drift*dt*9;
        v.z+=(slope(p.x,p.z-.035)-slope(p.x,p.z+.035))*drift*dt*9;
        v.x*=Math.exp(-dt*(water>.002?3.5:12));v.z*=Math.exp(-dt*(water>.002?3.5:12));
        s.m.rotation.y+=dt*(v.x+v.z)*3+d.shake*dt*.3;
        if(s.bounce>=3&&Math.abs(v.x)+Math.abs(v.z)<.003)s.asleep=true;
      }
      const r=Math.hypot(p.x,p.z);if(r>.765){p.x*=.765/r;p.z*=.765/r;v.x*=-.25;v.z*=-.25;}
      s.m.updateMatrix();d.seedBatch.setMatrixAt(s.index,s.m.matrix);d.seedBatch.instanceMatrix.needsUpdate=true;
    }
    for(let i=d.waves.length-1;i>=0;i--){const w=d.waves[i];w.t+=dt;w.ring.scale.setScalar(.16+w.t*2.8*w.strength);w.ring.material.opacity=Math.max(0,.36-w.t*.55);
      if(w.t>.67){w.ring.removeFromParent();w.ring.geometry.dispose();w.ring.material.dispose();d.waves.splice(i,1);}}
  }
  return {createDish,extrude,enough,cutColumn,updateDish,pour,sauceBead,addSeed,ripple,plateY,value};
})();
