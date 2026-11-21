'use strict';
const Kitchen = (() => {
  const {T,V,scene,mat,mesh,box,ball,rod,ring,group,woods,brass,metal,water,agar,porcelain,surface,contact,seeded,mix}=W;
  const rand=seeded(1063), root=group(), tau=Math.PI*2;
  // Glazed tiles, joinery and the two real window casements meet behind the counter.
  const architecture=group(root);
  const grout=mat(0xd3cec0,.9), sash=mat(0xe4dfca,.52);
  box(architecture,36,4,.13,grout,0,-.63,-3.96);
  const tiles=Array.from({length:7},(_,i)=>mat(new T.Color().setHSL(.428+i*.002,.095+i*.004,.686+i*.009),.27));
  const tileGeo=W.boxGeo(.76,.405,.08,.015);
  for(let j=0;j<4;j++)for(let i=-19;i<20;i++)mesh(tileGeo,tiles[Math.floor(rand()*7)],architecture,i*.774+(j%2)*.387,j*.417-.19,-3.85);
  box(architecture,36,.16,.52,woods.light,0,1.32,-3.85);
  const windowFrame=group(architecture);
  for(let i=-4;i<=4;i++){box(windowFrame,.115,6,.14,sash,i*2.88,4.37,-3.97,.013);box(windowFrame,.04,5.95,.065,sash,i*2.88+1.44,4.38,-4.02,.006);}
  for(let y of [1.48,3.13,5.65])box(windowFrame,32,y===3.13?.075:.14,.15,sash,0,y,-3.99,.01);
  const paneMaterial=new T.MeshPhysicalMaterial({color:0xf4f8ef,transmission:.96,roughness:.39,thickness:.07,ior:1.48,side:T.DoubleSide});
  const pane=mesh(new T.PlaneGeometry(32,6.1),paneMaterial,architecture,0,4.47,-4.085);pane.castShadow=pane.receiveShadow=false;
  const sideWindow=architecture.clone();sideWindow.rotation.y=Math.PI/2;sideWindow.position.set(-3.17,0,0);root.add(sideWindow);
  // A bank of greenery beyond the glass gives depth to the bright kitchen.
  const sky=new T.MeshBasicMaterial({color:0xe5ecde});
  box(root,80,22,.15,sky,0,7,-13);
  const leafColors=[0xc0d0a6,0xacc6a1,0x9db796,0xcbd6ac,0xe1dfb7].map(c=>mat(c,1));
  for(let i=0;i<56;i++){const b=ball(root,-17+rand()*34,.65+rand()*2.3,-8-rand()*3,1.15+rand(),.75+rand(),.95,leafColors[i%5]);b.castShadow=false;}
  box(root,.15,22,68,sky,-17,7,0);
  for(let i=0;i<22;i++){const b=ball(root,-11-rand()*2,1.5+rand()*1.3,-5+rand()*14,1.05,1.3,1.6,leafColors[i%5]);b.castShadow=false;}
  // Long individual boards have softened seams and independent grain.
  const topMats=[woods.table,...[.97,1.026,.985].map(f=>{const m=woods.table.clone();m.color.multiplyScalar(f);return m;})];
  topMats.forEach((m,i)=>{m.map=woods.table.map.clone();m.map.offset.set(i*.196,i*.207);m.bumpMap=m.map;});
  for(let i=0;i<16;i++)box(root,30,.26,.92,topMats[i%4],0,-.14,-3.56+.922*i,.013);
  const clay=mat(0xb9c5aa,.24), iron=mat(0x5b6151,.41);
  function vessel(parent,profile,material,n=72){
    return mesh(new T.LatheGeometry(profile.map(([x,y])=>new T.Vector2(x,y)),n),material,parent);
  }
  // Kitchen utensils by the sill, well beyond the play area.
  const crock=group(root);crock.position.set(-4.02,0,-2.93);
  vessel(crock,[[.25,.015],[.31,.045],[.36,.18],[.365,.58],[.325,.73],[.326,.78],[.285,.78],[.277,.71],[.285,.22],[0,.2]],clay);
  ring(crock,.307,.767,.014,iron);
  for(let i=0;i<5;i++){
    const a=V(rand()*.25-.12,.25,rand()*.18-.09),b=V(-.35+i*.17,1.31+rand()*.29,.1-rand()*.3);
    rod(crock,a,b,.028,woods.dark,12,.032);if(i%2===0){let spoon=ball(crock,b.x,b.y+.09,b.z,.087,.18,.041,woods.light);spoon.rotation.z=(i-2)*-.1;}
  }
  // Fresh shiso cuttings in a small glazed cup on the windowsill.
  const herbs=group(root);herbs.position.set(1.34,1.405,-3.77);
  const herbCup=mat(0xd9d4b8,.29),stemMat=mat(0x658052,.62);
  vessel(herbs,[[.001,.01],[.17,.01],[.20,.055],[.245,.30],[.232,.365],[.213,.37],[.193,.345],[.172,.09],[.001,.085]],herbCup);
  ring(herbs,.224,.350,.009,clay);
  const bladeMat=mat(0xffffff,.59,{vertexColors:true,side:T.DoubleSide});
  function shiso(parent,base,angle,length,width,tilt){
    const sprig=group(parent);sprig.position.copy(base);sprig.rotation.y=angle;sprig.rotation.z=tilt;
    const pos=[],colors=[],idx=[],n=22;
    for(let i=0;i<=n;i++){
      const t=i/n,span=Math.sin(Math.PI*t)**.83*width*(i%2?.88:1);
      for(let j=-2;j<=2;j++){
        const side=j/2;pos.push(t*length,.21*Math.sin(t*Math.PI*.94)-t*t*.105-Math.abs(side)*Math.sin(Math.PI*t)*.056,side*span);
        const c=new T.Color().setHSL(.255+.023*t,.30+.06*t,.27+.075*(1-Math.abs(side))+.021*Math.sin(i*.8));colors.push(c.r,c.g,c.b);
      }
    }
    for(let i=0;i<n;i++)for(let j=0;j<4;j++){const k=i*5+j;idx.push(k,k+1,k+5,k+1,k+6,k+5);}
    const g=new T.BufferGeometry();g.setAttribute('position',new T.Float32BufferAttribute(pos,3));g.setAttribute('color',new T.Float32BufferAttribute(colors,3));g.setIndex(idx);g.computeVertexNormals();mesh(g,bladeMat,sprig);
    for(let i=0;i<6;i++){const a=i/6,b=(i+1)/6;
      rod(sprig,V(a*length,.21*Math.sin(a*Math.PI*.94)-a*a*.105+.004,0),V(b*length,.21*Math.sin(b*Math.PI*.94)-b*b*.105+.004,0),.0045*(1-a)+.001,stemMat,6);}
  }
  for(let i=0;i<5;i++){
    const a=i*2.399+.45,top=V(Math.cos(a)*(.18+rand()*.11),.70+rand()*.32,Math.sin(a)*.17);
    rod(herbs,V(0,.12,0),top,.013,stemMat,8,.007);
    shiso(herbs,top,a,.41+rand()*.19,.129+rand()*.044,rand()*.70-.35);
    shiso(herbs,top.clone().multiplyScalar(.80),a+2.57,.38,.13,.10);
  }
  // A folded woven kitchen towel. Each stripe bends with the cloth surface.
  const clothMap=surface(512,512,(c,w,h)=>{
    c.fillStyle='#3e6070';c.fillRect(0,0,w,h);
    c.strokeStyle='#b7c3ba';c.lineWidth=1.5;c.setLineDash([5,3.2]);
    for(let j=0;j<13;j++)for(let i=-1;i<9;i++){
      const x=i*68+(j%2)*34,y=j*45;
      for(const r of [12,24,34]){c.beginPath();c.ellipse(x,y,r,r*.83,0,Math.PI,Math.PI*2);c.stroke();}
    }
    c.setLineDash([]);
    for(let i=0;i<w;i+=2){c.fillStyle=i%4?'rgba(30,45,49,.10)':'rgba(237,233,207,.10)';c.fillRect(i,0,1,h);c.fillRect(0,i,w,1);}
    for(const u of [15,22,31,480,489,496]){c.fillStyle='#a6b4ab';c.fillRect(u,0,u===22||u===489?4:1.5,h);}
  });
  const linen=mat(0xffffff,.99,{map:clothMap,bumpMap:clothMap,bumpScale:.009,side:T.DoubleSide});
  const towel=group(root);towel.position.set(-2.2,.015,1.21);towel.rotation.y=-.09;
  for(let layer=0;layer<2;layer++){
    const g=new T.PlaneGeometry(2.98,1.61,34,25);g.rotateX(-Math.PI/2);const p=g.attributes.position;
    for(let i=0;i<p.count;i++){const x=p.getX(i),z=p.getZ(i);p.setY(i,.018*Math.sin(z*13+x*.8)+.015*Math.sin(x*12-z*5)+layer*.025+.018);}
    g.computeVertexNormals();mesh(g,linen,towel,layer*.055,0,layer*.066);
  }
  // A footed cypress press, with a hollow square bore and a long glazed inspection window.
  const exit=.65, zAxis=-.52, axisY=1.39, bore=.64, back=-2.13;
  const press=group(root);press.position.z=zAxis;
  const base=group(press);
  box(base,2.83,.16,1.2,woods.oak,-.88,.085,0,.055);
  box(base,2.68,.075,1.105,woods.light,-.88,.195,0,.026);
  for(const x of [-1.86,-.06]){
    box(base,.38,.48,.85,woods.oak,x,.43,0,.036);
    box(base,.50,.14,1.01,woods.dark,x,.746,0,.025);
    box(base,.52,.16,1.07,woods.light,x,.866,0,.022);
    for(const z of [-.45,.45])box(base,.12,.09,.12,woods.end,x,.42,z,.009);
  }
  contact(root,-.88,.003,zAxis,3.35,1.7,.37);
  const len=exit-back,cx=(back+exit)/2;
  box(press,len,.143,.93,woods.oak,cx,axisY-.394,0,.024);
  for(const s of [-1,1]){
    box(press,len,.68,.135,woods.light,cx,axisY,s*.394,.023);
    box(press,len,.123,.245,woods.light,cx,axisY+.392,s*.343,.022);
  }
  for(const x of [back+.07,exit-.17])box(press,.14,.123,.51,woods.light,x,axisY+.392,0,.017);
  const glass=new T.MeshPhysicalMaterial({color:0xd6e8d6,roughness:.115,metalness:.08,transparent:true,opacity:.185,clearcoat:1,depthWrite:false});
  const windowGlass=box(press,len-.35,.022,.44,glass,cx-.045,axisY+.391,0,.01);windowGlass.castShadow=false;windowGlass.renderOrder=4;
  const seam=mat(0x684b32,.58);
  for(const s of [-1,1])box(press,len-.34,.023,.016,seam,cx-.044,axisY+.393,s*.229,.004);
  // Hardwood keys at the ends of the box, and small flush brass assembly pins.
  for(const x of [back+.096,exit-.24]){
    for(let i=0;i<3;i++)box(press,.19,.079,.012,woods.end,x,axisY-.22+i*.213,.463,.006);
    for(const z of [-.345,.345]){let peg=mesh(new T.CylinderGeometry(.033,.033,.006,20),brass,press,x,axisY+.455,z);peg.castShadow=false;}
  }
  const collar=group(press);collar.position.set(exit-.055,axisY,0);
  for(const s of [-1,1]){box(collar,.24,.92,.107,woods.oak,0,0,s*.437,.014);box(collar,.24,.107,.78,woods.oak,0,s*.409,0,.014);}
  const frame=group(press);frame.position.set(exit+.079,axisY+.32,0);
  for(const s of [-1,1]){
    box(frame,.123,.88,.105,woods.dark,0,0,s*.392,.016);
    box(frame,.123,.115,.705,woods.oak,0,s*.38,0,.016);
    for(const k of [-1,1]){const p=mesh(new T.CylinderGeometry(.024,.024,.012,18),brass,frame,.065,s*.38,k*.381);p.rotation.z=-Math.PI/2;}
  }
  // Grid grooves cross the mouth continuously, with a slightly brighter cutting edge.
  for(let k=0;k<=5;k++){
    const q=(k/5-.5)*.67;
    box(frame,.072,.017,.672,metal,0,q,0,.003);
    box(frame,.072,.672,.017,metal,.003,0,q,.003);
  }
  const knob=group(frame);knob.position.set(.09,0,.459);
  rod(knob,V(0,-.367,0),V(0,.367,0),.008,metal,8);
  box(knob,.10,.098,.176,woods.dark,0,.435,0,.035);box(knob,.059,.057,.104,brass,0,-.404,0,.011);
  const board=group(root);board.position.set(-1.95,.072,1.12);board.rotation.y=-.105;
  box(board,2.64,.126,1.06,woods.light,0,.068,0,.087);
  // The water footprint is an actual thin film, left visible when the block is lifted.
  const wet=mat(0x957443,.18,{transparent:true,opacity:.40,metalness:.13,depthWrite:false});
  box(board,1.88,.005,.657,wet,-.035,.134,0,.002);
  for(let i=0;i<28;i++){
    let x=(rand()-.5)*2.29,z=(rand()-.5)*.91;let r=.012+rand()**3*.055;
    ball(board,x,.138,z,r*1.6,r*.26,r,water).castShadow=false;
  }
  const fresh=group(root),blockMaterial=agar.clone();
  const block=box(fresh,1.84,.608,.612,blockMaterial,0,0,0,.047);
  const bubbleMat=new T.MeshPhysicalMaterial({color:0xfff1c5,roughness:.08,metalness:.17,transparent:true,opacity:.49,depthWrite:false});
  function bubbles(){
    while(fresh.children.length>1)fresh.remove(fresh.children[fresh.children.length-1]);
    for(let i=0;i<31;i++){const r=.005+Math.random()**3*.025;const b=ball(fresh,(Math.random()-.5)*1.71,(Math.random()-.5)*.54,(Math.random()-.5)*.55,r*1.07,r,r,bubbleMat);b.castShadow=false;}
  }
  const boardHome=V(-1.99,.525,1.12);
  fresh.position.copy(boardHome);fresh.rotation.y=board.rotation.y;bubbles();
  const rodGroup=group(root);
  // The piston head remains visible behind the agar through the inspection glass.
  box(rodGroup,.168,.602,.604,woods.dark,0,0,0,.029);
  box(rodGroup,.033,.576,.58,woods.light,.085,0,0,.014);
  box(rodGroup,2.82,.205,.226,woods.light,-1.475,0,0,.032);
  box(rodGroup,.16,.49,.684,woods.oak,-2.913,0,0,.064);
  box(rodGroup,.028,.36,.516,woods.end,-3.0,0,0,.013);
  const rodHome=V(-1.63,.33,-1.59);rodGroup.position.copy(rodHome);rodGroup.rotation.y=-.10;
  const tray=group(root);tray.position.set(1.54,.006,.12);
  box(tray,3.46,.112,3.43,woods.tray,0,.059,0,.112);
  box(tray,3.31,.049,3.26,woods.tray,0,.133,0,.024);
  for(const s of [-1,1]){
    box(tray,3.43,.14,.095,woods.oak,0,.156,s*1.66,.045);
    box(tray,.097,.14,3.25,woods.oak,s*1.685,.156,0,.039);
  }
  contact(root,1.54,.003,.12,4.0,3.99,.32);
  const plateBase=.171, plateRadius=.845;
  const dishMap=surface(1024,512,(c,w,h)=>{
    c.fillStyle='#f1f0e4';c.fillRect(0,0,w,h);
    const random=seeded(533);
    for(let i=0;i<13500;i++){c.fillStyle='rgba(95,109,99,'+random()*.095+')';c.fillRect(random()*w,random()*h,1,1);}
    // Cobalt double lines and small hand-painted leaves follow the scalloped rim.
    for(const [y,width,color] of [[137,5,'#395e76'],[148,2,'#628da1'],[189,2,'#5e7e8d'],[311,3,'#315872'],[324,1.9,'#648392'],[407,2,'#617e89']]){
      c.strokeStyle=color;c.lineWidth=width;c.beginPath();for(let x=0;x<=w;x+=4){const yy=y+.8*Math.sin(x/w*tau*7);if(x===0)c.moveTo(x,yy);else c.lineTo(x,yy);}c.stroke();
    }
    for(let i=0;i<20;i++){
      c.save();c.translate((i+.4)*w/20,171);c.rotate(-.15);
      c.strokeStyle='#537d8d';c.lineWidth=1.25;c.beginPath();c.moveTo(-13,4);c.quadraticCurveTo(0,3,12,-5);c.stroke();
      for(let j=0;j<4;j++){c.fillStyle=j%2?'#678da1':'#3c647e';c.beginPath();c.ellipse(-8+j*5,(j%2?-2:2)-j*.9,4.8,1.9,j%2?.55:-.70,0,tau);c.fill();}c.restore();
    }
  },false);
  const dishMat=new T.MeshPhysicalMaterial({map:dishMap,color:0xffffff,roughness:.19,clearcoat:.55,clearcoatRoughness:.11,side:T.DoubleSide});
  function plate(parent){
    const g=group(parent);
    const profile=[[.001,.016],[.34,.016],[.395,.024],[.401,.058],[.527,.08],[.687,.138],[.809,.223],[.845,.256],[.836,.273],[.810,.269],[.759,.237],[.69,.191],[.55,.126],[.385,.092],[.16,.086],[.001,.085]];
    const geo=new T.LatheGeometry(profile.map(a=>new T.Vector2(...a)),112),p=geo.attributes.position;
    for(let i=0;i<p.count;i++){const x=p.getX(i),z=p.getZ(i),a=Math.atan2(z,x),r=Math.hypot(x,z),f=Math.max(0,(r-.59)/.26);
      const s=1+f*.013*Math.cos(a*12);p.setXYZ(i,x*s,p.getY(i)+.008*f*Math.cos(a*12),z*s);}
    geo.computeVertexNormals();mesh(geo,dishMat,g);
    contact(g,0,.002,0,1.72,1.59,.32);return g;
  }
  const stack=group(root);stack.position.set(2.98,.004,-2.66);stack.rotation.y=.08;
  for(let j=0;j<3;j++){const p=plate(stack);p.position.set(.017*Math.sin(j),j*.086,j*.012);p.rotation.y=Math.random()*.45;}
  const resting=group(root);resting.position.set(1.11,.006,-2.40);
  // A shallow, round resting place for a finished saucer.
  box(resting,1.93,.13,2.22,woods.tray,0,.066,.12,.064);
  vessel(resting,[[0,.13],[.74,.13],[.891,.137],[.892,.155],[.86,.178],[.826,.175],[.76,.146],[0,.143]],woods.oak);
  contact(resting,0,-.002,.12,2.21,2.45,.25);
  const jug=group(root);const jugHome=V(2.71,plateBase,1.09);jug.position.copy(jugHome);
  const speckle=surface(384,192,(c,w,h)=>{
    c.fillStyle='#b6c3ad';c.fillRect(0,0,w,h);
    for(let i=0;i<6400;i++){const r=rand()**4*1.5+.2;c.fillStyle='rgba(77,69,49,'+(.05+rand()*.28)+')';c.beginPath();c.ellipse(rand()*w,rand()*h,r,r*.83,0,0,tau);c.fill();}
    c.fillStyle='#7a7866';c.fillRect(0,48,w,2);
  });
  const celadon=new T.MeshPhysicalMaterial({map:speckle,roughness:.24,clearcoat:.5,side:T.DoubleSide});
  const jugProf=[[.001,.012],[.175,.012],[.192,.036],[.195,.078],[.268,.116],[.343,.263],[.348,.401],[.331,.491],[.310,.5],[.295,.475],[.306,.351],[.26,.217],[.17,.119],[0,.11]];
  const jugGeo=new T.LatheGeometry(jugProf.map(a=>new T.Vector2(...a)),96),jp=jugGeo.attributes.position;
  for(let i=0;i<jp.count;i++){const x=jp.getX(i),y=jp.getY(i),z=jp.getZ(i),angle=Math.atan2(z,-x);
    let spout=Math.exp(-angle*angle*11)*W.clamp((y-.31)/.17,0,1);jp.setXYZ(i,x-.208*spout,y+.084*spout,z*.94);}
  jugGeo.computeVertexNormals();mesh(jugGeo,celadon,jug);
  const sauceMat=new T.MeshPhysicalMaterial({color:0x673715,roughness:.096,clearcoat:1,metalness:.12});
  const liquid=ball(jug,-.003,.347,0,.301,.012,.283,sauceMat);
  ring(jug,.181,.038,.012,mat(0x938067,.63));
  const spoon=group(root);const spoonHome=V(.64,plateBase+.035,1.29);spoon.position.copy(spoonHome);spoon.rotation.y=-.24;
  const spoonHead=group(spoon);
  const scoopGeo=new T.SphereGeometry(1,42,20,0,tau,Math.PI/2,Math.PI/2);
  const spoonWood=woods.light.clone();spoonWood.side=T.DoubleSide;
  const scoop=mesh(scoopGeo,spoonWood,spoonHead);scoop.scale.set(.286,.084,.188);scoop.position.y=.104;
  const scoopBottom=mesh(scoopGeo,woods.oak,spoonHead,0,.09);scoopBottom.scale.set(.29,.089,.19);
  const handle=box(spoon,1.065,.072,.106,woods.light,-.735,.105,0,.034);handle.rotation.z=-.04;
  const seedMaterial=mat(0xf1d9a5,.43);
  const seedGeometry=new T.SphereGeometry(1,14,9),sp=seedGeometry.attributes.position;
  for(let i=0;i<sp.count;i++){const x=sp.getX(i),taper=.93-.24*x;sp.setXYZ(i,x,sp.getY(i)*taper+.08*(1-x*x),sp.getZ(i)*taper);}
  seedGeometry.computeVertexNormals();
  function seedPose(x,y,z){
    const pose=new T.Object3D();pose.position.set(x,y,z);pose.rotation.y=Math.random()*Math.PI;
    pose.scale.set(.034*(.9+Math.random()*.2),.014,.020);return pose;
  }
  function seedBatch(p,n){
    const batch=new T.InstancedMesh(seedGeometry,seedMaterial,n);batch.count=0;batch.frustumCulled=false;
    batch.instanceMatrix.setUsage(T.DynamicDrawUsage);batch.receiveShadow=true;p.add(batch);return batch;
  }
  const sesame=seedBatch(spoon,37);
  function fillSpoon(){
    const grains=[];for(let i=0;i<37;i++){const a=Math.random()*tau,r=Math.sqrt(Math.random());
      grains.push(seedPose(Math.cos(a)*r*.198,.055+.029*(1-r)+r*r*.027+Math.random()*.015,Math.sin(a)*r*.134));}
    grains.sort((a,b)=>a.position.x-b.position.x);grains.forEach((p,i)=>{p.updateMatrix();sesame.setMatrixAt(i,p.matrix);});
    sesame.count=grains.length;sesame.instanceMatrix.needsUpdate=true;
  }
  fillSpoon();
  // Batch stationary objects sharing geometry so the actual tilework and trees cost few draw calls.
  const moving=new Set([tray,frame,board,towel,fresh,rodGroup,stack,resting,jug,spoon]);
  const batches=new Map();root.updateMatrixWorld(true);
  function collect(object){
    if(moving.has(object))return;
    if(object.isMesh && !object.material.transparent){
      const key=object.geometry.uuid+object.material.uuid+object.castShadow+object.receiveShadow;
      if(!batches.has(key))batches.set(key,[]);batches.get(key).push(object);
    }
    object.children.forEach(collect);
  }
  collect(root);
  for(const list of batches.values()){
    if(list.length<3)continue;const first=list[0],batch=new T.InstancedMesh(first.geometry,first.material,list.length);
    batch.castShadow=first.castShadow;batch.receiveShadow=first.receiveShadow;
    list.forEach((o,i)=>{batch.setMatrixAt(i,o.matrixWorld);o.removeFromParent();});
    batch.computeBoundingSphere();root.add(batch);
  }
  return {root,towel,press,frame,knob,board,block,fresh,boardHome,bubbles,rodGroup,rodHome,tray,plate,plateBase,plateRadius,stack,resting,jug,jugHome,liquid,spoon,spoonHome,sesame,fillSpoon,seedBatch,seedPose,sauceMat,exit:exit+.145,zAxis,axisY,bore};
})();
