'use strict';
const scene=new T.Scene();
scene.background=new T.Color(0xdce5d9);
scene.fog=new T.FogExp2(0xdce3d6,.022);
const room=group(scene), kit=group(scene);
function makeRoom(){
  const wood=material(0xffffff,{map:woodTexture,bumpMap:woodTexture,bumpScale:.016,roughness:.66});
  for(let j=0;j<10;j++){
    const z=-5.75+j*1.52;
    const plank=box(room,40,.32,1.515,wood,0,-.16,z);
    const uv=plank.geometry.attributes.uv,position=plank.geometry.attributes.position;
    for(let i=0;i<uv.count;i++)uv.setXY(i,position.getX(i)+j*1.27,position.getZ(i)+j*.86);
  }
  const trim=material(0xf2ebda),reveal=material(0xc7c8b7),glass=material(0xd9e9e5,{roughness:.28});
  box(room,48,1.1,.45,trim,0,-.01,-6.7);
  box(room,48,.19,.89,trim,0,.57,-6.52);
  box(room,48,.13,.22,reveal,0,.75,-6.84);
  box(room,48,.19,.27,trim,0,.89,-6.83);
  box(room,48,16,.15,glass,0,8,-11);
  for(let n=-4;n<=4;n++){
    box(room,.18,13,.33,trim,n*5.85-2.7,7.25,-6.89);
    box(room,.09,13,.37,reveal,n*5.85-2.83,7.25,-6.95);
  }
  box(room,48,.21,.28,trim,0,4.5,-6.9);
  // Out-of-focus garden colors beyond the actual window frame.
  const foliage=[0xa5b795,0xb6c9aa,0xc4d1b5,0xd1d9c0].map(c=>material(c));
  for(let n=0;n<40;n++){
    const o=sphere(room,1,foliage[n%4],(rand()-.5)*39,.9+rand()*1.5,-9.1-rand(),.85+rand(),.5+rand(),.65);
    o.castShadow=false;
  }
}
makeRoom();
const W=5.12,D=1.94,FLOOR=.15,LANE=.06,EXIT=1.96;
const base=group(kit);base.position.y=FLOOR-.075;
const floor=group(base);floor.rotation.x=-PI/2;
const baseShape=[[-W/2,-D/2],[1.33,-D/2],[1.33,.63],[W/2,.63],[W/2,D/2],[-W/2,D/2]];
board(floor,baseShape,.075,lightKraft);
const underBox=shadow(kit,0,.006,0,6.1,2.8,.61);
const panels=[];
// Small triangles let a press bend the face and the exposed cut at the same point.
function flexibleStock(surface){
  const old=surface.geometry, pos=old.attributes.position, uv=old.attributes.uv, normal=old.attributes.normal;
  const vertices=[],normals=[],tex=[],g=new T.BufferGeometry();
  function read(i){return [pos.getX(i),pos.getY(i),pos.getZ(i),uv.getX(i),uv.getY(i),normal.getX(i),normal.getY(i),normal.getZ(i)]}
  function half(a,b){return a.map((n,i)=>(n+b[i])*.5)}
  function distance(a,b){return (a[0]-b[0])**2+(a[1]-b[1])**2+(a[2]-b[2])**2}
  function split(a,b,c,depth){
    const ab=distance(a,b),bc=distance(b,c),ca=distance(c,a),longest=Math.max(ab,bc,ca);
    if(longest>.16&&depth<10){
      if(longest===ab){const m=half(a,b);split(a,m,c,depth+1);split(m,b,c,depth+1)}
      else if(longest===bc){const m=half(b,c);split(a,b,m,depth+1);split(a,m,c,depth+1)}
      else{const m=half(c,a);split(a,b,m,depth+1);split(m,b,c,depth+1)}
    }else for(const v of [a,b,c]){vertices.push(v[0],v[1],v[2]);tex.push(v[3],v[4]);normals.push(v[5],v[6],v[7])}
  }
  for(const part of old.groups){
    const start=vertices.length/3;
    for(let i=part.start;i<part.start+part.count;i+=3)split(read(i),read(i+1),read(i+2),0);
    g.addGroup(start,vertices.length/3-start,part.materialIndex);
  }
  g.setAttribute('position',new T.Float32BufferAttribute(vertices,3).setUsage(T.DynamicDrawUsage));
  g.setAttribute('uv',new T.Float32BufferAttribute(tex,2));
  g.setAttribute('normal',new T.Float32BufferAttribute(normals,3));surface.geometry=g;old.dispose();
}
function panel(id,x,z,yaw,outline,face,holes=[],initial=.035){
  const swivel=group(base);swivel.position.set(x,.008,z);swivel.rotation.y=yaw;
  const hinge=group(swivel),surface=board(hinge,outline,.078,face,holes);
  const p={id,root:swivel,hinge,surface,angle:initial,target:initial,velocity:0,locked:false,tabs:[],max:PI/2,press:0,touch:v3(),flex:0};
  flexibleStock(surface);
  p.positions=surface.geometry.attributes.position.array.slice();surface.userData.panel=p;panels.push(p);
  hinge.rotation.x=initial-PI/2;
  return p;
}
function exposedFlutes(parent,x0,x1,edge,thickness,outward){
  const positions=[],indices=[],uv=[];
  const cells=Math.round((x1-x0)/(.083*thickness/.065)),steps=cells*8;
  for(let i=0;i<=steps;i++){
    const u=i/steps,x=mix(x0,x1,u);
    const z=thickness*(.50+.355*Math.cos(u*cells*TAU));
    for(const depth of [.003,.029]){
      positions.push(x,edge+outward*depth,z);uv.push(x,depth);
    }
    if(i){const n=i*2;indices.push(n-2,n-1,n,n,n-1,n+1)}
  }
  const g=new T.BufferGeometry();g.setAttribute('position',new T.Float32BufferAttribute(positions,3));
  g.setAttribute('uv',new T.Float32BufferAttribute(uv,2));g.setIndex(indices);g.computeVertexNormals();
  mesh(parent,g,lightKraft);
  for(const z of [thickness*.055,thickness*.945])box(parent,x1-x0,.030,thickness*.11,lightKraft,(x0+x1)*.5,edge+outward*.015,z);
}
const back=panel('back',0,-D/2,0,[[-2.56,0],[2.56,0],[2.56,.64],[2.37,.68],[2.37,1.27],[2.13,1.47],[-2.19,1.47],[-2.38,1.27],[-2.38,.70],[-2.56,.64]],kraft,[],.34);
const beforeFlutes=back.hinge.children.length;
exposedFlutes(back.hinge,-2.16,2.10,1.47,.078,1);
back.cutFaces=back.hinge.children.slice(beforeFlutes).map(o=>({o,orig:o.geometry.attributes.position.array.slice()}));
const sideEdge=[[-.97,0],[.97,0],[.97,1.20],[.75,1.41],[.66,1.87],[.50,1.87],[.50,1.65],[.17,1.65],[.17,1.88],[.095,2.00],[.07,2.37],[-.15,2.37],[-.15,2.14],[-.48,2.14],[-.48,2.37],[-.78,2.37],[-.97,2.18]];
const sideHoles=[rectangle(-.89,.82,.105,.37),rectangle(.77,.24,.082,.22)];
const left=panel('left',-W/2,0,PI/2,sideEdge.map(([u,h])=>[-u,h]),lightKraft,sideHoles.map(h=>h.map(([u,v])=>[-u,v])),.15);
const right=panel('right',W/2,0,-PI/2,sideEdge,kraft,sideHoles,.085);
const front=panel('front',-.615,D/2,PI,[[ -1.945,0],[1.945,0],[1.945,.43],[1.79,.51],[1.61,.51],[1.46,.17],[1.34,.122],[-1.70,.122],[-1.83,.245],[-1.945,.26]],lightKraft);
function addTab(p,sign,offset,y,l,h){
  const g=group(p.hinge);g.position.set(offset,y,.003);
  board(g,[[0,0],[sign*l*.72,0],[sign*l,.055],[sign*l,h-.06],[sign*l*.75,h],[0,h]],.069,lightKraft);
  crease(g,sign*.027,.022,sign*.027,h-.022,.071);
  p.tabs.push({g,sign,other:offset>0?(p===front?left:right):(p===front?right:left),caught:false});
}
addTab(back,-1,-2.37,.83,.48,.32);addTab(back,1,2.37,.83,.48,.32);addTab(front,1,1.945,.17,.32,.21);
for(const p of [left,right])crease(p.hinge,-.90,.042,.90,.042,.08);
crease(back.hinge,-2.43,.04,2.43,.04,.081);
crease(front.hinge,-1.89,.04,1.89,.04,.081);
const mouth=panel('ramp',EXIT,-.63,PI,rectangle(-.62,0,1.24,.82),honey,[],0);
mouth.max=.39;
const slope=group(mouth.hinge);slope.position.y=.82;
const slide=board(slope,rectangle(-.62,0,1.24,1.47),.068,lightKraft);
slide.userData.panel=mouth;crease(slope,-.60,.025,.60,.025,.071);
const dish=group(slope);dish.position.y=1.47;
const saucer=board(dish,[[-.62,0],[.62,0],[.78,.17],[.78,.74],[.66,.86],[-.66,.86],[-.78,.74],[-.78,.17]],.06,kraft);
saucer.userData.panel=mouth;
const dishEdges=[];
for(const side of [-1,1]){
  const g=group(dish);g.position.set(side*.76,.16,0);
  board(g,[[0,0],[side*.14,.10],[side*.14,.54],[0,.64]],.045,lightKraft);dishEdges.push(g);
}
const dishEnd=group(dish);dishEnd.position.y=.85;
board(dishEnd,[[-.66,0],[.66,0],[.59,.17],[-.59,.17]],.05,lightKraft);
crease(dish,-.59,.022,.59,.022,.064);
// The beam is a folded channel with its raw edge visible along both flanges.
const rail=group(kit),beamLength=5.57;
const beamProfile=[[-2.79,-.035],[-2.76,-.105],[-2.48,-.105],[-2.43,-.16],[2.43,-.16],[2.48,-.105],[2.76,-.105],[2.79,-.035],[2.79,.11],[2.71,.16],[-2.71,.16],[-2.79,.11]];
const web=board(rail,beamProfile,.062,honey);web.position.z=.055;
for(const y of [-.14,.145]){
  const f=group(rail);f.position.set(0,y,.113);f.rotation.x=-PI/2;
  board(f,rectangle(-2.76,0,5.52,.24),.043,lightKraft);
  exposedFlutes(f,-2.72,2.72,0,.043,-1);
}
const carriage=group(rail);
const sleeve=board(carriage,[[-.34,.18],[-.29,.245],[.28,.245],[.34,.18],[.34,-.17],[.22,-.26],[-.23,-.26],[-.34,-.17]],.073,pulp);
sleeve.position.z=.14;
box(carriage,.64,.067,.41,pulp,0,.218,-.005);
box(carriage,.62,.37,.06,kraft,0,.015,-.20);
function disc(p,r,d,mat,x,y,z,axis='z'){
  const m=mesh(p,new T.CylinderGeometry(r,r,d,32),mat,x,y,z);
  if(axis==='z')m.rotation.x=PI/2;if(axis==='x')m.rotation.z=PI/2;return m;
}
function pin(p,x,y,z,r=.067){
  disc(p,r,.028,honey,x,y,z);
  disc(p,r*.63,.034,brass,x,y,z+.018);
  disc(p,r*.22,.005,slotMat,x,y,z+.037);
}
for(const x of [-.23,.23])pin(carriage,x,.115,.215,.046);
const wheel=group(carriage);wheel.position.set(0,.025,.36);
disc(wheel,.157,.115,honey,0,0,0,'x');
for(const x of [-.087,.087])disc(wheel,.196,.05,lightKraft,x,0,0,'x');
disc(wheel,.053,.29,brass,0,0,0,'x');
for(const x of [-.15,.15]){
  const b=board(carriage,[[-.11,-.13],[.15,-.13],[.23,-.028],[.23,.07],[.16,.12],[-.11,.13]],.047,kraft);
  b.rotation.y=-PI/2;b.position.set(x,0,.25);
}
const arm=group(kit);
const hook=board(arm,[[-.29,.015],[-.27,.23],[-.09,.30],[-.09,.48],[.01,.57],[.18,.55],[.23,.42],[.18,.33],[.099,.35],[.11,.43],[.057,.445],[.038,.40],[.055,.26],[.29,.19],[.29,.015]],.095,lightKraft);
hook.position.z=-.06;
const jaws=[];
for(const s of [-1,1]){
  const joint=group(arm);joint.position.set(s*.20,.015,.054);
  const outline=[[-.085,.045],[.045,.083],[.18,-.18],[.43,-.54],[.47,-.72],[.42,-.88],[.18,-1.04],[.047,-1.015],[.075,-.93],[.255,-.78],[.27,-.64],[.13,-.415],[-.075,-.18]].map(([x,y])=>[s*x,y]);
  board(joint,outline,.10,lightKraft);
  const pad=board(joint,[[s*.05,-1.012],[s*.17,-1.052],[s*.39,-.908],[s*.38,-.864],[s*.27,-.89]],.117,honey);
  pad.position.z=-.008;
  pin(arm,s*.20,.02,.167,.077);
  jaws.push(joint);
}
const plate=board(arm,[[-.092,-.37],[.092,-.37],[.092,.21],[.055,.26],[-.055,.26],[-.092,.21]],.055,honey);
plate.position.z=.105;
const links=[];
for(const s of [-1,1]){
  const l=group(arm);l.position.z=.17;
  board(l,rectangle(-.041,0,.082,.37),.042,pulp);links.push(l);
}
const cordMat=material(0xf0dfbb,{roughness:1});
cordMat.onBeforeCompile=s=>{
  s.vertexShader='varying vec2 vThread;\n'+s.vertexShader.replace('#include <uv_vertex>','#include <uv_vertex>\nvThread=uv;');
  s.fragmentShader='varying vec2 vThread;\n'+s.fragmentShader.replace('#include <color_fragment>',`#include <color_fragment>
    float twist=cos(6.28318*(vThread.y*3.-vThread.x*13.5));
    float fineThread=cos(6.28318*(vThread.y*12.-vThread.x*54.));
    diffuseColor.rgb*=.88+.105*twist+.024*fineThread;`);
};
// Re-sample one physical cord, retaining its cross section and twist as the ends move.
function liveCord(n,r){
  const sides=10,g=new T.BufferGeometry(),pos=new Float32Array((n+1)*(sides+1)*3),nor=pos.slice(),uv=new Float32Array((n+1)*(sides+1)*2),idx=[];
  for(let i=0;i<n;i++)for(let j=0;j<sides;j++){
    const a=i*(sides+1)+j,b=a+sides+1;idx.push(a,b,a+1,a+1,b,b+1);
  }
  g.setAttribute('position',new T.BufferAttribute(pos,3).setUsage(T.DynamicDrawUsage));g.setAttribute('normal',new T.BufferAttribute(nor,3));
  g.setAttribute('uv',new T.BufferAttribute(uv,2));g.setIndex(idx);
  const obj=mesh(kit,g,cordMat);obj.frustumCulled=false;
  const delta=v3(),u=v3(),v=v3(),normal=v3(),ref=v3();
  function update(points){
    const curve=new T.CatmullRomCurve3(points,false,'centripetal');const path=curve.getPoints(n);let len=0;
    for(let i=0;i<=n;i++){
      delta.subVectors(path[Math.min(n,i+1)],path[Math.max(0,i-1)]).normalize();
      if(!i)ref.set(Math.abs(delta.y)<.85?0:1,Math.abs(delta.y)<.85?1:0,0);
      u.crossVectors(delta,ref).normalize();v.crossVectors(u,delta).normalize();ref.copy(v);
      if(i)len+=path[i].distanceTo(path[i-1]);
      for(let j=0;j<=sides;j++){
        const a=j*TAU/sides,k=i*(sides+1)+j;
        normal.copy(u).multiplyScalar(Math.cos(a)).addScaledVector(v,Math.sin(a));
        const rr=r*(1+.042*Math.cos(3*a-len*75));
        pos[k*3]=path[i].x+normal.x*rr;pos[k*3+1]=path[i].y+normal.y*rr;pos[k*3+2]=path[i].z+normal.z*rr;
        normal.toArray(nor,k*3);uv[k*2]=len;uv[k*2+1]=j/sides;
      }
    }
    for(const k of ['position','normal','uv'])g.attributes[k].needsUpdate=true;
  }
  return {obj,update};
}
const runningCord=liveCord(95,.034),loopCord=liveCord(83,.052);
const knot=group(kit);for(let i=0;i<4;i++){
  const m=mesh(knot,new T.TorusGeometry(.059,.024,7,18),cordMat,0,i*.027,0);m.rotation.x=PI/2-.19;
}
const aglet=group(kit);
disc(aglet,.047,.235,pulp,0,0,0,'y');
for(const y of [-.085,-.059,.074])disc(aglet,.048,.012,honey,0,y,0,'y');
const tray=group(kit);
function trayPanel(points,position,rx,ry=0){
  const p=group(tray);p.position.set(...position);p.rotation.order='YXZ';p.rotation.set(rx,ry,0);board(p,points,.072,pulp);return p;
}
const tw=3.43,td=2.04;
trayPanel(rectangle(-tw/2,-td/2,tw,td),[0,.025,0],-PI/2);
for(const s of [-1,1]){
  trayPanel([[-tw/2,0],[tw/2,0],[tw/2+.09,.23],[tw/2-.02,.34],[-tw/2+.01,.34],[-tw/2-.09,.24]],[0,.085,s*td/2],-.24,s>0?PI:0);
  trayPanel([[-td/2,0],[td/2,0],[td/2+.09,.22],[td/2,.31],[-td/2,.31],[-td/2-.09,.23]],[s*tw/2,.083,0],-.27,s>0?-PI/2:PI/2);
}
const trayShadow=shadow(tray,.015,.004,.025,4.08,2.63,.54);
const parcels=[];
function paperMesh(root,rows,mat){
  const p=[],uv=[],ind=[],k=rows[0].length;
  for(let i=0;i<rows.length;i++)for(let j=0;j<k;j++){
    const v=rows[i][j];p.push(...v);uv.push(v[0]*2,j/(k-1)*2);
    if(i<rows.length-1&&j<k-1){
      const a=i*k+j,b=a+k;ind.push(a,a+1,b,a+1,b+1,b);
    }
  }
  const g=new T.BufferGeometry();
  g.setAttribute('position',new T.Float32BufferAttribute(p,3));g.setAttribute('uv',new T.Float32BufferAttribute(uv,2));g.setIndex(ind);g.computeVertexNormals();
  return mesh(root,g,mat);
}
function foldedPatch(parent,points,mat){
  const g=new T.BufferGeometry();g.setAttribute('position',new T.Float32BufferAttribute(points.flat(),3));
  g.setAttribute('uv',new T.Float32BufferAttribute(points.flatMap(p=>[p[0],p[2]]),2));
  const idx=[];for(let i=1;i+1<points.length;i++)idx.push(0,i+1,i);g.setIndex(idx);g.computeVertexNormals();
  return mesh(parent,g,mat);
}
function parcel(type,color,x,z,angle,scale=1){
  const root=group(kit),wrapper=group(root);
  const mat=stock(color);mat.roughness=.71;mat.bumpScale=.006;
  const tone=new T.Color(color),flap=stock(tone.clone().multiplyScalar(.95)),rim=stock(tone.clone().lerp(new T.Color(0xffead3),.14));
  const rows=[],sp=(x,k)=>Math.sign(x)*Math.pow(Math.abs(x),k);
  let h=.15,w=.99,d=.64;
  if(type==='tube'){
    h=.237;w=1.32;d=.46;
    const rings=[[-.67,.115],[-.60,.145],[-.49,.057],[-.445,.077],[-.378,.175],[-.30,.222],[-.20,.235],[0,.24],[.20,.235],[.30,.222],[.38,.175],[.445,.077],[.49,.057],[.60,.145],[.67,.115]];
    for(const [xx,r] of rings){
      const row=[];for(let j=0;j<=40;j++){
        const a=TAU*j/40,tip=smooth(.28,.55,Math.abs(xx)),twist=Math.sign(xx)*tip*1.45;
        const rad=r*(1+tip*(.24*Math.sin(a*6+twist*2)+.09*Math.sin(a*3))+.023*Math.cos(a*7+xx));
        row.push([xx+Math.sign(xx)*smooth(.56,.67,Math.abs(xx))*.022*Math.cos(a*6),rad*Math.cos(a+twist),rad*Math.sin(a+twist)]);
      }rows.push(row);
    }
    paperMesh(wrapper,rows,mat);
    for(const s of [-1,1]){
      const points=rows[s<0?0:rows.length-1];const cap=points.slice(0,-1).map(p=>[p[0]-s*.021,p[1]*.92,p[2]*.92]);
      foldedPatch(wrapper,cap,flap);
      for(let k=0;k<5;k++){
        const a=k*TAU/5;
        tube(wrapper,[[s*.32,.211*Math.cos(a),.211*Math.sin(a)],[s*.41,.138*Math.cos(a+.15*s),.138*Math.sin(a+.15*s)],[s*.485,.06*Math.cos(a+s*.8),.06*Math.sin(a+s*.8)]],.004,rim,7);
      }
    }
  }else{
    const pouch=type==='pouch';w=pouch?.82:1.04;d=pouch?.61:.67;h=pouch?.249:.145;
    const profile=pouch?[[-.5,.65,.72],[-.44,.91,.92],[-.29,1,1],[.02,.98,1],[.26,.67,.96],[.36,.27,.95],[.46,.16,.94],[.50,.12,.93]]:[[-.50,.68,.88],[-.457,.92,.98],[-.34,1,1],[0,1.022,1],[.34,1,1],[.457,.92,.98],[.50,.68,.88]];
    for(const [xx,amp,dep] of profile){
      const row=[];for(let j=0;j<=32;j++){
        const a=TAU*j/32,wrinkle=1+.024*Math.sin(a*7+xx*5)+.014*Math.cos(a*11-xx*8);
        row.push([xx*w,h*amp*sp(Math.cos(a),.28)*wrinkle+(pouch?xx*.08:0),d*.5*dep*sp(Math.sin(a),.28)*wrinkle]);
      }rows.push(row);
    }
    paperMesh(wrapper,rows,mat);
    for(const s of [-1,1]){
      const rr=rows[s<0?0:rows.length-1];foldedPatch(wrapper,rr.slice(0,-1),flap);
      const cx=s*w*.5,hh=h*(pouch?(s>0?.14:.67):.68),dd=d*.44,yy=pouch?s*.04:0;
      foldedPatch(wrapper,[[cx+s*.002,yy+hh,-dd],[cx+s*.008,yy+.005,.025],[cx+s*.002,yy+hh,dd]],rim);
      foldedPatch(wrapper,[[cx+s*.002,yy-hh,-dd],[cx+s*.010,yy-.01,-.018],[cx+s*.002,yy-hh,dd]],mat);
    }
    if(pouch){
      foldedPatch(wrapper,[[.28,.109,-d*.46],[.414,.079,-d*.46],[.421,.074,d*.46],[.282,.111,d*.46]],rim);
      tube(wrapper,[[.277,.113,-.27],[.272,.118,0],[.28,.111,.27]],.008,flap,7);
      for(const s of [-1,1])tube(wrapper,[[-.32,.15,s*.24],[-.18,.211,s*.219],[.15,.172,s*.194],[.27,.108,s*.211]],.006,rim,9);
    }else{
      foldedPatch(wrapper,[[-w*.35,h*1.017,-.058],[w*.36,h*1.019,-.061],[w*.35,h*1.039,.038],[-w*.34,h*1.037,.045]],flap);
      for(const s of [-1,1])for(const f of [-1,1])tube(wrapper,[[s*w*.497,h*.70,f*.271],[s*w*.445,h*.92,f*.20],[s*w*.32,h*.99,f*.136]],.006,rim,7);
    }
  }
  root.scale.setScalar(scale);
  const sh=shadow(kit,0,.01,0,w*scale*1.31,d*scale*1.55,.63);
  const item={type,root,wrapper,mat,shadow:sh,w:w*scale,d:d*scale,h:h*scale,scale,state:'tray',vx:0,vy:0,vz:0,spin:0,tilt:0,yaw:angle,roll:0,grip:0,crease:[],trayX:x,trayZ:z,meshData:[],restOn:null};
  wrapper.traverse(o=>{if(o.isMesh){o.userData.parcel=item;const attr=o.geometry.attributes.position;item.meshData.push({o,attr,orig:attr.array.slice()})}});
  root.rotation.y=angle;parcels.push(item);return item;
}
const offerings=[
 ['flat',0xdd8e70,-1.06,-.45,-.14,.94],
 ['tube',0xe7b55d,.05,-.46,.11,.90],
 ['pouch',0x8aaa99,1.15,-.39,-.23,1],
 ['tube',0x77a9a0,-1.02,.43,-.19,.92],
 ['pouch',0xb4a1bc,.18,.44,.13,.95],
 ['flat',0xe6c585,1.13,.43,-.08,.90]
];
const trayDirection=Math.random()<.5?-1:1;
for(const [t,c,x,z,a,s] of offerings)parcel(t,c,trayDirection*x+(Math.random()-.5)*.07,z+(Math.random()-.5)*.065,a+(Math.random()-.5)*.19,s);
function crumple(p,amount,gripLocal){
  const mark=p.crease;
  for(const m of p.meshData){
    for(let i=0;i<m.attr.count;i++){
      const x=m.orig[i*3],y=m.orig[i*3+1],z=m.orig[i*3+2];
      const edge=Math.abs(x-gripLocal),spread=p.type==='tube'?.27:.33;
      const band=Math.exp(-Math.pow((edge-spread)/.095,2));
      let old=0;for(const c of mark)old+=Math.exp(-Math.pow((x-c)/.05,2))*.012;
      m.attr.setXYZ(i,x-Math.sign(x-gripLocal)*amount*band*.05,y*(1-amount*.12*band)-Math.max(0,y)*old,z*(1-band*amount*.115-old)+amount*band*.008*Math.cos(y*73));
    }
    m.attr.needsUpdate=true;
  }
}
// A sliding hanger keeps the eye of the arm on the trolley throughout a lift.
const guide=group(carriage);
const hanger=board(guide,rectangle(-.050,-1.20,.10,1.24),.046,honey,[rectangle(-.024,-1.15,.048,.075)]);
const keeper=box(carriage,.26,.082,.12,lightKraft,0,-.14,.045);
box(arm,.24,.054,.10,pulp,0,.254,.138);
