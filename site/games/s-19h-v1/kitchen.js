'use strict';
const Kitchen=(()=>{
  const {T,PI,TAU,scene,camera,vec,rand,rng,clamp,mix,mat,mesh,group,orb,box,lathe,rim,tube,instances,orbGeo,canvasMap,woodMap,noiseMap,contact,windowLight}=Studio;
  const world=group(scene),pan=group(world),board=group(world),cloth=group(world),bottle=group(world),herb=group(world);
  const stations={},guests=[],goods=['cheese','lettuce','tomato','pickle'],surface=0,boardY=.24,panY=.214;
  const pore=noiseMap(49182),wood=woodMap();wood.repeat.set(2.4,3.4);
  const counterMat=windowLight(mat(0xffffff,.60,{map:wood,bumpMap:wood,bumpScale:.028}));
  const table=box(world,counterMat,0,-.23,-.1,39,.46,29);
  const chamferGold=mat(0xc39956,.32,{metalness:.66});
  const rawIron=mat(0x292d2d,.57,{metalness:.50,bumpMap:pore,bumpScale:.027});
  const darkIron=mat(0x252728,.43,{metalness:.68,bumpMap:pore,bumpScale:.015});
  const rimIron=mat(0x454845,.37,{metalness:.67,bumpMap:pore,bumpScale:.008});
  const oilMat=mat(0x72603c,.22,{metalness:.52});
  const bubbles=[],steam=[];
  function fryingPan(){
    lathe(pan,rawIron,[[.001,.046],[1.46,.046],[1.59,.075],[1.71,.17],[1.89,.45],[1.915,.49],[1.90,.52],[1.865,.52],[1.83,.486],[1.76,.35],[1.64,.23],[1.52,.195],[.001,.195]],128);
    rim(pan,rimIron,1.887,.022,.512);
    const cooking=lathe(pan,darkIron,[[.001,.197],[1.51,.197],[1.58,.21],[1.66,.25]],100);cooking.material.side=T.DoubleSide;
    // Shallow pools catch the window and are surrounded by separate beads of hot fat.
    const oil=mat(0x3a3526,.215,{metalness:.48});
    const pool=orb(pan,oil,-.12,.202,.12,1.36,.011,1.22);pool.rotation.y=.45;
    const drops=[],rr=rng(942);
    for(let i=0;i<117;i++){
      let a=rr()*TAU,r=.85+rr()*.80,s=.008+rr()**2*.056;
      drops.push({p:[Math.cos(a)*r,.208+Math.max(0,r-1.48)*.25,Math.sin(a)*r],s:[s,.004+s*.17,s*(.6+rr()*.7)],c:i%3?0xada38b:0x756c52});
    }instances(pan,orbGeo,oilMat,drops);
    const shine=mat(0xb4a776,.27,{metalness:.38});
    for(let i=0;i<21;i++){let a=rr()*TAU,r=1.035+rr()*.14;let o=orb(pan,i%4?oilMat:shine,Math.cos(a)*r,.222,Math.sin(a)*r+.1,1,1,1);bubbles.push({o,a,base:.012+rr()*.031,phase:rr()*TAU})}
    const handle=group(pan);handle.rotation.y=-.95;handle.position.y=.022;
    const outline=new T.Shape();outline.moveTo(-.26,1.67);outline.bezierCurveTo(-.25,2.02,-.145,2.23,-.15,2.55);outline.bezierCurveTo(-.16,2.99,-.25,3.72,-.23,3.95);outline.bezierCurveTo(-.20,4.23,.20,4.23,.23,3.95);outline.bezierCurveTo(.25,3.72,.16,2.99,.15,2.55);outline.bezierCurveTo(.145,2.23,.25,2.02,.26,1.67);outline.closePath();
    const eye=new T.Path();eye.absellipse(0,3.88,.087,.18,0,TAU,false,0);outline.holes.push(eye);
    const geo=new T.ExtrudeGeometry(outline,{depth:.1,bevelEnabled:true,steps:1,bevelSegments:3,bevelSize:.048,bevelThickness:.042,curveSegments:16});geo.rotateX(PI/2);
    const h=mesh(geo,rawIron,handle);h.rotation.x=-.077;h.position.y=.34;
    orb(handle,rimIron,0,.398,1.91,.079,.024,.068);
    contact(pan,0,.012,.05,2.16,2.12,.67);
    const steamMat=new T.MeshBasicMaterial({color:0xfff3dc,transparent:true,opacity:.10,depthWrite:false});
    for(let k=0;k<4;k++){const p=[];for(let i=0;i<=9;i++){let t=i/9;p.push([.07*Math.sin(t*6+k)*t,t*.85,t*.13])}
      const o=tube(pan,steamMat.clone(),p,.009+k%2*.004);o.castShadow=o.receiveShadow=false;steam.push(o)}
  }
  fryingPan();
  function makeBoard(){
    const tex=woodMap(true),m=windowLight(mat(0xffffff,.55,{map:tex,bumpMap:tex,bumpScale:.021}));
    const g=lathe(board,m,[[.001,.014],[1.91,.014],[2.02,.038],[2.07,.089],[2.07,.174],[2.04,.222],[1.97,.24],[1.925,.24],[1.903,.226],[1.880,.217],[1.856,.226],[1.83,.24],[.001,.24]],128);
    let a=g.geometry.attributes.position,uv=g.geometry.attributes.uv;
    for(let i=0;i<a.count;i++)uv.setXY(i,.5+a.getX(i)/4.18,.5+a.getZ(i)/4.18);
    g.rotation.y=-.30;
    contact(board,.03,.008,.05,2.27,2.22,.48);
  }
  makeBoard();
  const fabricMap=canvasMap(512,512,(c,w,h)=>{
    let im=c.createImageData(w,h),d=im.data,rr=rng(5129);
    for(let y=0;y<h;y++)for(let x=0;x<w;x++){let u=x/w;
      let stripes=(u>.119&&u<.133)||(u>.146&&u<.162)||(u>.178&&u<.222)||(u>.237&&u<.249)||(u>.785&&u<.804)||(u>.816&&u<.863)||(u>.878&&u<.894);
      let k=5*Math.cos(x*PI/1.9)+4*Math.sin(y*PI/1.8)+(rr()-.5)*16;
      let c=stripes?[55,96,92]:[218,211,181],j=(y*w+x)*4;d[j]=c[0]+k;d[j+1]=c[1]+k;d[j+2]=c[2]+k;d[j+3]=255;
    }c.putImageData(im,0,0)
  });
  const fabric=mat(0xffffff,.98,{map:fabricMap,bumpMap:fabricMap,bumpScale:.019,side:T.DoubleSide});
  function napkin(){
    const w=3.7,h=3.50;
    for(let k=0;k<2;k++){
      let g=new T.PlaneGeometry(w,h,48,42);g.rotateX(-PI/2);
      let p=g.attributes.position;
      for(let i=0;i<p.count;i++){let x=p.getX(i),z=p.getZ(i),ed=Math.pow(Math.max(Math.abs(x)/(w/2),Math.abs(z)/(h/2)),3);
        p.setXYZ(i,x+.035*Math.sin(z*4)*ed,.023+k*.054+.026*Math.sin(x*6+z*.6)+ed*(.045+.032*Math.sin(z*5+x))+.11*Math.exp(-((x+.9+z*.25)**2)/.045),z+.046*Math.sin(x*2.8+z)*ed)}
      g.computeVertexNormals();const layer=mesh(g,fabric,cloth);layer.position.set(-.09*k,0,.116*k);layer.rotation.y=k*.048;
    }
    const fringe=[];
    for(let i=0;i<118;i++){let x=(i/117-.5)*w;fringe.push({p:[x,.034,1.78+.027*Math.sin(x*3)],s:[.008,.009,.037+rand()*.035],r:[0,(rand()-.5)*.3,0]})}instances(cloth,orbGeo,mat(0xc7bd9d,.98),fringe);
  }
  napkin();
  const ceramic=col=>mat(col,.25,{bumpMap:pore,bumpScale:.007});
  const cream=ceramic(0xeee4c7),celadon=ceramic(0x93b6a5),stone=ceramic(0xceac87),green=ceramic(0x668b7c);
  function dish(p,r,h,m,accent){
    let g=lathe(p,m,[[.001,.018],[r*.48,.018],[r*.53,.041],[r*.54,.095],[r*.70,.12],[r*.85,h*.54],[r*.98,h*.91],[r,h],[r*.988,h+.024],[r*.958,h+.023],[r*.931,h-.011],[r*.84,h*.65],[r*.67,h*.44],[r*.47,h*.35],[.001,h*.34]],80);
    rim(p,accent,r*.982,.014,h+.018);contact(p,0,.009,0,r*1.05,r,.30);return g;
  }
  for(const [k,type] of goods.entries()){
    let root=group(world),pile=group(root),samples=[];
    const rr=rng(811+k*854);
    if(type==='cheese'){
      const p=lathe(root,cream,[[.001,.018],[.80,.018],[.92,.05],[1.24,.14],[1.27,.18],[1.255,.204],[1.22,.21],[1.13,.177],[.93,.132],[.001,.12]]);
      p.scale.z=.91;rim(root,green,1.205,.012,.196).scale.y=.91;
      for(let j=0;j<4;j++){let f=Food.create(type,734+j);f.node.scale.set(.78,.86,.78);f.node.rotation.y=-.14+j*.062;f.node.position.set((j-1.5)*.037,.138+j*.064,-.03+(j===3?.11:0));pile.add(f.node);samples.push(f)}
    }else{
      const r=type==='lettuce'?1.25:type==='tomato'?1.16:1.01,h=type==='lettuce'?.52:type==='tomato'?.44:.51;
      dish(root,r,h,type==='lettuce'?celadon:type==='tomato'?cream:stone,type==='lettuce'?green:type==='tomato'?stone:cream);
      if(type==='tomato'){
        for(let i=0;i<4;i++){let f=Food.create(type,768+i);f.node.scale.setScalar(.84);pile.add(f.node);f.node.position.set(-.18+.10*i,.16+i*.132,.18-i*.14);f.node.rotation.set(.11+i*.038,i*.83,.03-i*.016);samples.push(f)}
      }else if(type==='pickle'){
        for(let i=0;i<9;i++){let f=Food.create(type,Math.floor(rr()*50000)),a=i*2.39,r=i<6?.49:.27;f.node.scale.setScalar(.90+rr()*.1);pile.add(f.node);f.node.position.set(r*Math.cos(a),.2+i*.052,r*Math.sin(a));f.node.rotation.set((rr()-.5)*.37,rr()*PI,(rr()-.5)*.22);samples.push(f)}
      }else{
        for(let i=0;i<9;i++){let f=Food.create(type,887+i*8),a=i*2.39,r=i<6?.58:.26;f.node.scale.set(.66+rr()*.1,1.24,.53+rr()*.12);pile.add(f.node);f.node.position.set(r*Math.cos(a),.38+(i%3)*.13+.05*(i>5),r*Math.sin(a));f.node.rotation.set(.48+rr()*.25,a+.5,(rr()-.5)*.74);samples.push(f)}
      }
    }
    samples.forEach(f=>f.node.userData.stockItem=f);root.userData.action={kind:'supply',type};stations[type]={root,pile,samples,jitter:[(Math.random()-.5)*.18,(Math.random()-.5)*.18]};
  }
  const sauceRed=mat(0xb62417,.30),cap=mat(0xefe2bd,.49);
  const bottleBody=group(bottle);
  lathe(bottleBody,sauceRed,[[.001,.012],[.31,.012],[.38,.05],[.405,.13],[.414,.32],[.426,.92],[.424,1.20],[.408,1.35],[.348,1.46],[.245,1.55],[.199,1.58],[.001,1.58]],72);
  lathe(bottleBody,cap,[[.001,1.545],[.224,1.545],[.244,1.572],[.244,1.72],[.223,1.753],[.127,1.753],[.123,1.80],[.055,2.084],[.047,2.12],[.026,2.12],[.026,2.08]],64);
  const grooves=[];
  for(let i=0;i<48;i++){let a=i*TAU/48;grooves.push({p:[.242*Math.cos(a),1.646,.242*Math.sin(a)],s:[.008,.074,.008]})}instances(bottleBody,orbGeo,cap,grooves);
  orb(bottleBody,sauceRed,0,2.108,0,.033,.010,.033);
  bottle.userData.action={kind:'bottle'};
  const bottleShade=contact(world,0,.009,0,.57,.55,.46);
  // Thin jointed tubes taper at each fingertip. The same skeleton opens around each burger.
  function digit(p,m,points,radii){
    let path=new T.CatmullRomCurve3(points),pos=[],idx=[],segments=22,sides=14;
    for(let j=0;j<=segments;j++){
      let t=j/segments,center=path.getPoint(t),dir=path.getTangent(t),across=vec().crossVectors(vec(0,1,0),dir).normalize(),up=vec().crossVectors(dir,across).normalize();
      let f=t*(radii.length-1),i=Math.min(radii.length-2,Math.floor(f)),r=mix(radii[i],radii[i+1],f-i);
      for(let k=0;k<=sides;k++){let a=k*TAU/sides,v=center.clone().addScaledVector(across,r*Math.cos(a)).addScaledVector(up,r*.80*Math.sin(a));pos.push(v.x,v.y,v.z)}
    }
    for(let j=0;j<segments;j++)for(let k=0;k<sides;k++){let a=j*(sides+1)+k,b=a+sides+1;idx.push(a,a+1,b,b,a+1,b+1)}
    let g=new T.BufferGeometry();g.setIndex(idx);g.setAttribute('position',new T.Float32BufferAttribute(pos,3));g.computeVertexNormals();return mesh(g,m,p);
  }
  function hand(parent,small,mirror){
    let root=group(parent),shape=group(root),skin=mat(small?0xe4ad89:0xca9372,.66,{bumpMap:pore,bumpScale:.008}),sleeve=mat(small?0x416e86:0xaf792f,.93,{bumpMap:pore,bumpScale:.024});
    shape.scale.x=mirror?-1:1;
    // Continuous sleeve goes back past the edge of the table.
    let cuff=lathe(shape,sleeve,[[.001,0],[.32,0],[.355,.05],[.37,.18],[.40,.26],[.40,.43],[.455,.55],[.54,1.3],[.57,2.7],[.64,20],[.001,20]],48);cuff.rotation.x=-PI/2;cuff.scale.z=.72;cuff.position.set(0,0,-.59);
    for(let i=0;i<6;i++){let ring=rim(shape,sleeve,.361+i*.003,.014,0);ring.rotation.x=0;ring.position.set(0,0,-.69-i*.039);ring.scale.y=.73}
    orb(shape,skin,0,.012,-.47,.293,.20,.39);
    const palm=orb(shape,skin,0,.015,-.025,.484,.207,.62);palm.rotation.z=-.06;
    orb(shape,skin,-.24,.066,.02,.255,.168,.357);
    const crease=mat(small?0xdba181:0xbe886b,.77),nailBed=mat(small?0xe7bc9e:0xd5aa8f,.50);
    // Fine palm folds sit on the surface of the thenar pad and palm.
    const palmSurface=(x,z)=>.016+.207*Math.sqrt(Math.max(.01,1-(x/.484)**2-((z+.025)/.62)**2));
    for(let j=0;j<2;j++){let points=[];for(let k=0;k<=8;k++){let t=k/8,x=-.30+.60*t,z=.14-j*.26+.092*Math.sin(PI*t)+.05*t;points.push([x,palmSurface(x,z)+.004,z])}tube(shape,crease,points,.005,12)}
    let digits=[];
    for(let i=0;i<4;i++){
      let g=group(shape),x=(i-1.5)*.219,l=[.67,.76,.698,.53][i],wid=[.128,.134,.12,.101][i],splay=(i-1.5)*.055;
      g.position.set(x,.011,.302-.07*Math.abs(i-1));
      digit(g,skin,[vec(0,0,0),vec(splay*.32,.022,l*.36),vec(splay*.8,.07,l*.70),vec(splay,.145,l*.92),vec(splay,.17,l)],[wid*.91,wid,wid*.93,wid*.84,wid*.72,wid*.53,.012]);
      const nail=orb(g,nailBed,splay,.103,l*.930,wid*.56,.014,l*.072);nail.rotation.x=-.59;
      let line=[];for(let k=-3;k<=3;k++){let f=k/3;line.push([splay*.5+wid*.76*f,.037+wid*.78*Math.sqrt(1-(f*.8)**2),l*.47+.009*f*f])}tube(g,crease,line,.004,8);digits.push(g);
    }
    let thumb=group(shape);thumb.position.set(-.31,0,-.17);
    digit(thumb,skin,[vec(0,0,0),vec(-.17,.039,.10),vec(-.33,.112,.29),vec(-.38,.22,.46),vec(-.36,.28,.54)],[.185,.169,.148,.124,.09,.012]);digits.push(thumb);
    root.scale.setScalar(small?.80:1.17);return {root,digits,mirror};
  }
  function plate(p,small){
    let dishRoot=group(p),glaze=ceramic(small?0xd8e3dc:0xe8d7ae),trim=ceramic(small?0x517b8b:0xa6783b),r=1.69;
    dish(dishRoot,r,.19,glaze,trim);
    if(!small){rim(dishRoot,trim,r*.919,.011,.181);rim(dishRoot,trim,r*.951,.009,.196)}
    else{
      let dots=[];for(let i=0;i<44;i++){let a=i*TAU/44;dots.push({p:[1.571*Math.cos(a),.181,1.571*Math.sin(a)],s:[.028,.006,.028]})}instances(dishRoot,orbGeo,trim,dots)
    }
    return dishRoot;
  }
  for(let k=0;k<2;k++){
    let root=group(world),plates=plate(root,!!k),hands=[hand(root,!!k,false),hand(root,!!k,true)];
    const g={root,plate:plates,hands,small:!!k,index:k,meals:[],preference:goods.slice().sort(()=>Math.random()-.5),favorite:null};
    root.userData.action={kind:'guest',guest:g};guests.push(g);
  }
  // A small kitchen herb softens the edge of the millwork beyond the work surface.
  function basil(){
    const terra=mat(0xb2714e,.91,{bumpMap:pore,bumpScale:.021}),soil=mat(0x463427,.97),stem=mat(0x6c8147,.69);
    lathe(herb,terra,[[.001,.01],[.43,.01],[.48,.06],[.58,.80],[.62,.83],[.62,.92],[.58,.94],[.53,.90],[.5,.68],[.001,.68]]);
    orb(herb,soil,0,.838,0,.55,.04,.55);
    const lg=mat(0xffffff,.46,{side:T.DoubleSide,vertexColors:true});
    const rr=rng(782);
    for(let k=0;k<12;k++){
      let a=k*2.4,dx=.53*Math.cos(a),dz=.53*Math.sin(a),h=1.0+rr()*.95;
      tube(herb,stem,[[0,.82,0],[dx*.41,(h+.84)*.5,dz*.47],[dx,h,dz]],.018,9);
      for(let j=0;j<5;j++){let leaf=group(herb);leaf.position.set(dx*(.7+j*.07),h-.41+j*.105,dz*(.7+j*.07));leaf.rotation.y=a+j*1.85;
        let pos=[],co=[],idx=[];for(let n=0;n<=12;n++){let t=n/12,w=.22*Math.sin(PI*t)**.72,tip=.61*t,h=.19*Math.sin(PI*t)-.11*t;
          for(let b=-2;b<=2;b++){pos.push(b/2*w,h-.085*Math.abs(b/2)*Math.sin(PI*t),tip);let c=new T.Color(b===0?0x78914c:b===-2?0x3d6a37:0x4d813d);co.push(c.r,c.g,c.b)}}
        for(let n=0;n<12;n++)for(let b=0;b<4;b++){let q=n*5+b;idx.push(q,q+5,q+1,q+1,q+5,q+6)}
        let geo=new T.BufferGeometry();geo.setIndex(idx);geo.setAttribute('position',new T.Float32BufferAttribute(pos,3));geo.setAttribute('color',new T.Float32BufferAttribute(co,3));geo.computeVertexNormals();mesh(geo,lg,leaf);
      }
    }
  }
  basil();
  const crumbs=group(world),crumbItems=[],rr=rng(997);
  for(let k=0;k<41;k++){let a=rr()*TAU,r=1.19+rr()*.62,s=.012+rr()*.027;crumbItems.push({p:[r*Math.cos(a),.023,r*Math.sin(a)],s:[s,.007+rr()*.009,s*.53],r:[0,rr()*PI,0],c:k%3?0xd1a36d:0xf1cd94})}instances(crumbs,orbGeo,mat(0xffffff,.86),crumbItems);
  const pepper=group(world),pepperItems=[];
  for(let k=0;k<8;k++){let x=(rr()-.5)*1.16,z=(rr()-.5)*.55,s=.032+rr()*.025;pepperItems.push({p:[x,s,z],s:[s,s,s*.97],c:k%3?0x544338:0x967b56})}instances(pepper,new T.IcosahedronGeometry(1,1),mat(0xffffff,.78),pepperItems);
  const kitchenWall=mat(0xe3cdaa,.93);box(world,kitchenWall,0,3,-14.9,42,12,.4);box(world,kitchenWall,0,3,15.2,42,12,.4);
  const tile=mat(0xa5b4a5,.44);
  for(let k=0;k<2;k++){
    const tiles=[],z=k?14.94:-14.62;
    for(let j=0;j<3;j++)for(let i=-7;i<8;i++)tiles.push({p:[i*2.10+(j%2)*1.05,j*.84+.36,z],s:[2.08,.824,.10]});
    instances(world,new T.BoxGeometry(1,1,1),tile,tiles)
  }
  const jarMat=ceramic(0xd4c6a4),lidMat=mat(0x96704d,.66);
  for(let k=0;k<4;k++){let jar=group(world);jar.position.set((k%2?5:-6)+.9*(k>1),0,k<2?-11.2:11.9);
    lathe(jar,jarMat,[[0,0],[.55,0],[.65,.1],[.68,1.30],[.64,1.43],[.51,1.5],[.50,1.56],[0,1.56]],48);lathe(jar,lidMat,[[0,1.55],[.52,1.55],[.54,1.6],[.50,1.65],[0,1.65]],48)}
  const layout={portrait:false,base:vec(),crown:vec(),bottle:vec(),panLook:vec(),tableLook:vec(),homeCam:vec(),fov:31};
  function arrange(aspect){
    const p=aspect<.90;layout.portrait=p;
    const locate=(o,x,z,y=0)=>o.position.set(x,y,z);
    locate(pan,p?-.54:-2.34,p?-1.74:.14);pan.rotation.y=p?-.35:0;
    locate(board,p?.33:1.73,p?2.00:.68);
    layout.base.set(p?-.93:.96,p?.113:boardY+.005,p?4.28:1.36);
    layout.crown.set(p?1.24:3.16,.153,p?4.67:2.95);
    locate(cloth,p?.46:3.05,p?4.90:3.56);cloth.rotation.y=p?.135:-.27;
    layout.bottle.set(p?2.17:4.34,0,p?-.72:-.70);bottle.position.copy(layout.bottle);bottleShade.position.set(layout.bottle.x,.012,layout.bottle.z);
    const entries=p?[[-1.95,-4.71],[-1.32,-7.83],[1.30,-6.66],[1.25,-3.76]]:[[-4.18,-2.79],[-1.60,-3.41],[1.07,-3.38],[3.61,-3.47]];
    goods.forEach((t,i)=>{const st=stations[t];locate(st.root,entries[i][0]+st.jitter[0],entries[i][1]+st.jitter[1]);st.root.rotation.y=[-.20,.14,-.20,.08][i]});
    locate(guests[0].root,p?1.03:2.80,p?-10.22:-6.75);locate(guests[1].root,p?-1.56:-1.28,p?-10.66:-6.93);
    locate(herb,p?-3.45:-5.93,p?-7.89:-4.9);locate(crumbs,layout.crown.x,layout.crown.z,.13);locate(pepper,p?-2.07:-3.43,p?-3.45:-2.02);
    layout.panLook.set(p?-.07:-.11,.05,p?-.64:-.06);
    layout.fov=p?31:32;
    let fovRad=layout.fov*PI/180;
    let dist=p?Math.max(10.9,6.34/(2*Math.tan(fovRad/2)*aspect)):Math.max(10.4,Math.min(14.15,12.25/(2*Math.tan(fovRad/2)*aspect)),8.20/(2*Math.tan(fovRad/2)));
    const elev=(p?58:51)*PI/180;
    layout.homeCam.copy(layout.panLook).add(vec(0,dist*Math.sin(elev),dist*Math.cos(elev)));
  }
  function poseGuest(g,open,weight,width,settle,reach,point,time){
    const small=g.small,second=small||width>2.48||weight>3.6;
    for(let k=0;k<2;k++){
      let hand=g.hands[k],side=k?1:-1,active=k===0||second,hold=open*active;
      let outer=k?1.47:1.20,inner=small?.43:.31;
      let x=side*mix(outer,second?inner:0,hold),z=mix(-1.61,-.18,hold);
      if(k===1&&!second){z-=.9;x+=.3}
      hand.root.position.set(x,.20+.13*hold-.065*clamp(weight/4)*settle,z);
      hand.root.rotation.set(.025+settle*.052,side*(-.30+hold*.08),side*(.07+.04*hold));
      hand.digits.forEach((d,i)=>{d.rotation.x=-.10-.49*(1-clamp(open*1.73-i*.135))-.23*settle;d.rotation.y=(i-1.5)*(.01+.055*hold)});
      if(k===0&&point){
        let angle=Math.atan2(point.x-g.root.position.x-hand.root.position.x,point.z-g.root.position.z-hand.root.position.z);
        hand.root.rotation.y=angle;hand.root.position.z+=.38+.046*Math.sin(time*2.6);
        hand.digits.forEach((d,i)=>d.rotation.x=i===0?-.12:-1.02);
      }
      if(k===0&&reach)hand.root.position.z+=.12*reach;
    }
  }
  function animate(t,heat,active,burst,warmMeal){
    const source=active?pan:warmMeal?.root;
    if(source&&steam[0].parent!==source)for(let wisp of steam)source.add(wisp);
    const steamHeat=active?heat:warmMeal?.heat||0;
    const steamY=active?.59:Math.min(.88,warmMeal?.height||0);
    for(let b of bubbles){let v=.54+.46*Math.sin(t*(3.4+b.phase*.35)+b.phase),s=b.base*(.45+v*.88+burst*.65);b.o.scale.set(s,s*(.32+.64*v),s);b.o.visible=active&&heat>.19}
    steam.forEach((o,i)=>{let u=(t*.34+i*.237)%1;o.position.set(-.50+i*.29+.065*Math.sin(t+i),steamY+u*.63,-.09+Math.cos(i*4)*.39);o.scale.set(.7+u,u*.65+.45,.8);o.rotation.y=i+t*.25;o.material.opacity=(.027+.074*Math.sin(PI*u))*steamHeat;o.visible=!!source&&steamHeat>.18});
  }
  return {world,pan,panY,board,boardY,cloth,bottle,bottleBody,stations,guests,goods,layout,arrange,animate,poseGuest,plate,hand,digit,sauceRed,contact,crumbs};
})();
