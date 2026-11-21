'use strict';
const Food=(()=>{
  const {T,PI,TAU,vec,clamp,mix,rng,rand,canvasMap,mat,mesh,group,instances,orbGeo,noiseMap}=Studio;
  const sizes={patty:[1.06,.36,1.25],base:[1.10,.34,.47],crown:[1.13,.88,.53],cheese:[1.15,.08,.16],tomato:[.87,.20,.45],lettuce:[1.18,.13,.12],pickle:[.46,.14,.14]};
  const pore=noiseMap(729);
  function hash(x,y){let n=Math.imul(x+3871,214013)^Math.imul(y+492,1274126177);n=Math.imul(n^(n>>>13),1597334677);return ((n^(n>>>16))>>>0)/4294967296}
  function noise(x,y){
    let a=Math.floor(x),b=Math.floor(y),s=x-a,t=y-b;s=s*s*(3-2*s);t=t*t*(3-2*t);
    return mix(mix(hash(a,b),hash(a+1,b),s),mix(hash(a,b+1),hash(a+1,b+1),s),t);
  }
  const meatMap=canvasMap(512,512,(c,w,h)=>{
    let r=rng(69341),im=c.createImageData(w,h),d=im.data;
    for(let y=0;y<h;y++)for(let x=0;x<w;x++){
      let wide=noise(x/42,y/42),medium=noise(x/10,y/10),fine=noise(x/3.7,y/3.7);
      let meat=clamp(.40*wide+.38*medium+.22*fine);
      let crust=Math.pow(clamp((meat-.25)*2.1),1.15);let k=(fine-.5)*43+(r()-.5)*23;
      let j=4*(x+y*w);d[j]=70+crust*139+k;d[j+1]=44+crust*107+k*.9;d[j+2]=32+crust*85+k*.75;d[j+3]=255;
    }c.putImageData(im,0,0);
    for(let i=0;i<3300;i++){let x=r()*w,y=r()*h,sz=r()*1.7+.28;c.fillStyle=i%4?'rgba(54,28,18,.29)':'rgba(255,228,181,.44)';c.beginPath();c.ellipse(x,y,sz*(1+r()),sz*.66,r()*PI,0,TAU);c.fill()}
  });
  const bunMap=canvasMap(384,384,(c,w,h)=>{
    let r=rng(541),im=c.createImageData(w,h),d=im.data;
    for(let y=0;y<h;y++)for(let x=0;x<w;x++){let f=(noise(x/28,y/28)-.5)*23+(noise(x/5,y/5)-.5)*19+(r()-.5)*13,j=(x+y*w)*4;d[j]=244+f;d[j+1]=234+f;d[j+2]=217+f;d[j+3]=255}c.putImageData(im,0,0);
    for(let i=0;i<2600;i++){let x=r()*w,y=r()*h,s=.15+r()*1.45;c.fillStyle='rgba(139,86,43,.26)';c.beginPath();c.ellipse(x,y,s,s*.65,r()*PI,0,TAU);c.fill()}
  });
  const crumbMap=canvasMap(512,512,(c,w,h)=>{
    let rr=rng(661),im=c.createImageData(w,h),d=im.data;
    for(let y=0;y<h;y++)for(let x=0;x<w;x++){
      let k=(noise(x/37,y/37)-.5)*47+(noise(x/5,y/5)-.5)*30+(rr()-.5)*21,j=(x+y*w)*4;
      d[j]=236+k;d[j+1]=210+k;d[j+2]=171+k;d[j+3]=255
    }c.putImageData(im,0,0);
    for(let i=0;i<2700;i++){
      let x=rr()*w,y=rr()*h,r=.4+rr()**2*3.9,s=r*(.43+.42*rr()),a=rr()*PI;
      c.fillStyle='rgba(255,239,206,.51)';c.beginPath();c.ellipse(x-.36,y+.63,r+.8,s+.7,a,0,TAU);c.fill();
      c.fillStyle='rgba(135,89,49,.54)';c.beginPath();c.ellipse(x,y,r,s,a,0,TAU);c.fill()
    }
  });
  const tomatoSeeds=[];
  const tomatoMap=canvasMap(512,512,(c,w,h)=>{
    let r=rng(157),C=w/2;c.fillStyle='#d64422';c.fillRect(0,0,w,h);
    const g=c.createRadialGradient(C,C,0,C,C,C);g.addColorStop(0,'#f59757');g.addColorStop(.28,'#ed7441');g.addColorStop(.67,'#e64a28');g.addColorStop(.89,'#eb5e31');g.addColorStop(.97,'#d2331a');g.addColorStop(1,'#ac2b19');c.fillStyle=g;c.fillRect(0,0,w,h);
    for(let i=0;i<5;i++){c.save();c.translate(C,C);const turn=i*TAU/5+.12,stretch=.88+r()*.17;c.rotate(turn);c.scale(1,stretch);
      c.beginPath();c.moveTo(54,-8);c.bezierCurveTo(74,-36,143,-108,170,-91);c.bezierCurveTo(219,-69,219,56,182,86);c.bezierCurveTo(152,108,114,44,83,32);c.bezierCurveTo(50,19,43,6,54,-8);
      const jelly=c.createLinearGradient(55,0,202,36);jelly.addColorStop(0,'#f28148');jelly.addColorStop(.45,'#c74929');jelly.addColorStop(1,'#a8331d');c.fillStyle=jelly;c.fill();c.strokeStyle='rgba(255,154,79,.8)';c.lineWidth=4;c.stroke();
      for(let j=0;j<17;j++){let a=(r()-.5)*.77,rad=115+r()*70;let x=Math.cos(a)*rad,y=Math.sin(a)*rad;c.beginPath();let rx=5+r()*4,rz=2.7+r()*2,theta=a+r()*.8;c.ellipse(x,y,rx,rz,theta,0,TAU);tomatoSeeds.push({x:(x*Math.cos(turn)-y*stretch*Math.sin(turn))/C,z:(x*Math.sin(turn)+y*stretch*Math.cos(turn))/C,rx:rx/C,rz:rz/C,angle:theta+turn});c.fillStyle=['#eeb050','#f8bb61','#d6993a'][j%3];c.fill();c.beginPath();c.ellipse(x-1,y-1,3.2,1.1,a,0,TAU);c.fillStyle='#fbd38a';c.fill()}
      c.restore()}
    for(let i=0;i<23000;i++){c.fillStyle=i%2?'rgba(255,199,130,.10)':'rgba(128,32,18,.09)';c.fillRect(r()*w,r()*h,r()*2+.2,1)}
  });
  const pickleMap=canvasMap(384,384,(c,w,h)=>{
    let r=rng(525),m=w/2,g=c.createRadialGradient(m*.9,m,12,m,m,m);g.addColorStop(0,'#c4c672');g.addColorStop(.53,'#b7c569');g.addColorStop(.78,'#99ae4d');g.addColorStop(.91,'#76913b');g.addColorStop(.97,'#506d2d');g.addColorStop(1,'#414f22');c.fillStyle=g;c.fillRect(0,0,w,h);
    for(let j=-w;j<w*1.5;j+=22){let gr=c.createLinearGradient(j,0,j+19,4);gr.addColorStop(0,'rgba(69,94,39,.22)');gr.addColorStop(.45,'rgba(234,241,156,.32)');gr.addColorStop(1,'rgba(197,204,108,0)');c.fillStyle=gr;c.beginPath();c.moveTo(j,0);c.lineTo(j+21,0);c.lineTo(j+95,h);c.lineTo(j+74,h);c.fill()}
    for(let i=0;i<3;i++)for(let j=0;j<12;j++){let a=i*TAU/3+(r()-.5)*.55,rr=(.18+r()*.47)*m;c.beginPath();c.ellipse(m+rr*Math.cos(a),m+rr*Math.sin(a),5+r()*5,3+r()*2,a+.5,0,TAU);c.fillStyle='#d8d59a';c.fill();c.lineWidth=1.1;c.strokeStyle='#abb971';c.stroke()}
    for(let i=0;i<8000;i++){c.fillStyle='rgba(74,90,33,.13)';c.fillRect(r()*w,r()*h,1.5,1)}
  });
  const bunMat=mat(0xffffff,.57,{map:bunMap,bumpMap:bunMap,bumpScale:.036,vertexColors:true});
  const crumbMat=mat(0xffe5bc,.85,{map:crumbMap,bumpMap:crumbMap,bumpScale:.061});
  const seedMat=mat(0xffe9b6,.52);
  const tomatoMat=mat(0xffffff,.30,{map:tomatoMap,bumpMap:tomatoMap,bumpScale:.019});
  const tomatoSkin=mat(0xbb321a,.24,{bumpMap:pore,bumpScale:.008});
  const pickleFlesh=mat(0xffffff,.35,{map:pickleMap,bumpMap:pickleMap,bumpScale:.025});
  const pickleSkin=mat(0x546429,.38,{bumpMap:pore,bumpScale:.024});
  const leafMat=mat(0xffffff,.46,{vertexColors:true,side:T.DoubleSide,bumpMap:pore,bumpScale:.016});
  const cheeseMat=mat(0xffc242,.40,{roughnessMap:pore});
  const cheeseSide=mat(0xe6a334,.47);
  function rings(profile,segments,radius,point,colors){
    const pos=[],uv=[],col=[],idx=[],g=new T.BufferGeometry();
    profile.forEach(([rr,yy],j)=>{for(let i=0;i<=segments;i++){let a=TAU*i/segments;
      let [x,y,z]=point(rr,yy,a,j);pos.push(x,y,z);uv.push(.5+x/(2*radius),.5-z/(2*radius));
      if(colors){let c=colors(rr,y,a,j);col.push(c.r,c.g,c.b)}
    }});
    for(let j=0;j<profile.length-1;j++){for(let i=0;i<segments;i++){let a=j*(segments+1)+i,b=a+segments+1;idx.push(a,b,a+1,b,b+1,a+1)}}
    g.setIndex(idx);g.setAttribute('position',new T.Float32BufferAttribute(pos,3));g.setAttribute('uv',new T.Float32BufferAttribute(uv,2));if(colors)g.setAttribute('color',new T.Float32BufferAttribute(col,3));g.computeVertexNormals();return g;
  }
  const cColor=h=>new T.Color(h);
  function bread(o,top){
    const radius=o.r,profile=top?[[.001,0],[.88,0],[.98,.07],[1,.16],[.99,.25],[.96,.36],[.90,.49],[.80,.63],[.68,.74],[.50,.82],[.30,.87],[.09,.89],[.001,.892]]:[[.001,.005],[.83,0],[.94,.045],[.99,.13],[1,.24],[.986,.30],[.95,.34],[.77,.356],[.49,.363],[.2,.366],[.001,.365]];
    let colors=top?[0xe9b974,0xeabb79,0xf3c98a,0xefbb72,0xe7a051,0xda8e43,0xce8137,0xc77b33,0xc87b34,0xcf8439,0xd28a40,0xd08b41,0xd08b41]:[0xc98e51,0xc58b4d,0xc58b49,0xdaaa6c,0xe1b579,0xe9c28a,0xe6b477,0xe1a767,0xd59b5d,0xe0ac6d,0xe4b57e];
    const cs=colors.map(cColor);
    function breadPoint(rr,y,a,j){let deform=1+.010*Math.cos(a*3+.5)+.009*Math.sin(a*5-1)+.004*Math.cos(a*9+.2);return [radius*rr*deform*Math.cos(a),y+.011*Math.sin(3*a+.6)*rr,radius*rr*deform*Math.sin(a)]}
    o.surface=mesh(rings(profile,96,radius*1.03,breadPoint,(r,y,a,j)=>cs[j]),bunMat,o.visual);
    if(!top){
      const geo=o.surface.geometry,sideCount=6*96*6;geo.addGroup(0,sideCount,0);geo.addGroup(sideCount,geo.index.count-sideCount,1);o.surface.material=[bunMat,crumbMat]
    }
    o.rest=o.surface.geometry.attributes.position.array.slice();
    let rr=rng(o.seed),items=[];
    if(top){
      for(let k=0;k<109;k++){
        let a=rr()*TAU,r=Math.sqrt(rr())*.974,ang=rr()*TAU;
        const i=profile.findIndex((p,j)=>j>3&&p[0]<=r);
        let y;if(i<0)y=.89;else{let p=profile[i-1],q=profile[i];y=mix(p[1],q[1],(r-p[0])/(q[0]-p[0]))}
        let x=r*radius*Math.cos(a),z=r*radius*Math.sin(a),s=.8+rr()*.55;
        const slope=.64*r/Math.sqrt(1.01-r*r),tilt=Math.atan(slope*Math.cos(ang-a));
        items.push({p:[x,y+.013+.011*Math.sin(3*a+.6)*r,z],s:[.065*s,.017*s,.025*s],r:[0,-ang, -tilt],c:rr()<.2?0xdebb82:0xffedc8});
      }o.seeds=instances(o.visual,orbGeo,seedMat,items);o.seedPositions=items.map(it=>it.p);
    }else{
      for(let k=0;k<145;k++){let a=rr()*TAU,r=Math.sqrt(rr())*.93,x=Math.cos(a)*r*radius,z=Math.sin(a)*r*radius;items.push({p:[x,.361-.022*r*r+.009*Math.sin(3*a+.6)*r,z],s:[.008+rr()*.025,.004,.008+rr()*.012],r:[0,rr()*PI,0],c:rr()<.4?0xbb8d5b:0xffe1a7})}
      instances(o.visual,orbGeo,mat(0xffffff,.85),items);
    }
  }
  function meat(o){
    const rr=rng(o.seed),phase=rr()*TAU;
    const profile=[[.001,.003],[.20,.006],[.45,.002],[.72,.002],[.9,.017],[.97,.045],[1,.094],[1.003,.17],[.995,.25],[.966,.309]];
    for(let i=20;i>=0;i--)profile.push([Math.max(.0001,.93*i/20),.317+.047*(1-(i/20)**2)]);
    const geo=rings(profile,112,o.r*1.06,(r,y,a)=>{
      let dx=Math.cos(a)*r,dz=Math.sin(a)*r,shape=1+.018*Math.sin(3*a+phase)+.014*Math.sin(7*a)+.009*Math.sin(15*a+1)+.006*Math.sin(31*a+phase);
      let relief=(noise(dx*21+44,dz*21+49)-.5)*.027+(noise(dx*6+42,dz*6+57)-.5)*.043;
      return [dx*o.r*shape,y+(y>.02?relief:relief*.35),dz*o.r*shape]
    });
    o.meatM=[0,1,2].map(()=>mat(0xb87a5a,.50,{map:meatMap,bumpMap:meatMap,bumpScale:.052}));
    o.roastUniforms=[{value:.29},{value:.68}];
    o.meatM.slice(0,2).forEach((material,k)=>{material.onBeforeCompile=shader=>{
      shader.uniforms.faceRoast=o.roastUniforms[k];
      shader.fragmentShader='uniform float faceRoast;\n'+shader.fragmentShader.replace('#include <map_fragment>',`#include <map_fragment>
        float centerHeat=1.-smoothstep(.09,.53,length(vMapUv-.5));
        float mottling=.12*sin(vMapUv.x*32.+sin(vMapUv.y*18.))+.08*cos(vMapUv.y*43.-vMapUv.x*9.);
        float crust=smoothstep(.27,.90,faceRoast+.18*centerHeat+mottling);
        diffuseColor.rgb*=mix(vec3(1.13,1.03,1.02),vec3(.76,.63,.54),crust);`);
    }});
    geo.addGroup(0,112*6*5,1);geo.addGroup(112*6*5,112*6*4,2);geo.addGroup(112*6*9,geo.index.count-112*6*9,0);
    o.surface=mesh(geo,o.meatM,o.visual);o.rest=geo.attributes.position.array.slice();
    o.doneness=[.29,.68];o.up=0;o.heat=.88;o.flip=0;o.flipActive=false;
    shadeMeat(o);
  }
  const lightMeat=cColor(0xeaab90),browned=cColor(0xa26a41),edgeMeat=cColor(0xba8d72);
  function shadeMeat(o){for(let k=0;k<2;k++){o.meatM[k].color.copy(lightMeat).lerp(browned,o.doneness[k]);o.roastUniforms[k].value=o.doneness[k]}o.meatM[2].color.copy(edgeMeat).multiplyScalar(1-.27*(o.doneness[0]+o.doneness[1])*.5)}
  const tomatoSeedMat=mat(0xe6b85c,.37),moistureMat=mat(0xf2b794,.16);
  function chamber(r,a){return -.034*Math.exp(-((r-.63)**2)/.043)*(.5+.5*Math.cos(5*(a-.12)))**2}
  function sliced(o,isPickle){
    let p=[[.0001,.001],[.72,0],[.95,.007],[.991,.025],[1,o.h*.56],[.991,o.h-.018],[.975,o.h-.004]];
    for(let j=18;j>=0;j--)p.push([Math.max(.0001,.95*j/18),o.h+.006*(1-j/18)]);
    const geo=rings(p,80,o.r*1.02,(r,y,a)=>{
      let wave=isPickle?.025*Math.sin(a*14+.5)+.014*Math.cos(a*9):.011*Math.cos(5*a+.5)+.006*Math.sin(3*a);
      let x=Math.cos(a)*r*(1+wave)*o.r,z=Math.sin(a)*r*(1+wave)*o.r;
      let ripple=isPickle?.016*Math.sin(x*35+z*5)*r: .004*Math.sin(6*a)*r;
      if(!isPickle&&y>o.h*.9)ripple+=chamber(r,a);
      if(o.rare)ripple+=.064*r**2*Math.cos(2*a);
      return [x,y+ripple,z]
    });
    geo.addGroup(0,2*80*6,0);geo.addGroup(2*80*6,4*80*6,1);geo.addGroup(6*80*6,geo.index.count-6*80*6,0);
    o.surface=mesh(geo,isPickle?[pickleFlesh,pickleSkin]:[tomatoMat,tomatoSkin],o.visual);
    if(!isPickle){
      let seeds=tomatoSeeds.map(s=>{const x=s.x*o.r*1.02,z=s.z*o.r*1.02,r=Math.hypot(x,z)/o.r,a=Math.atan2(z,x);
        return {p:[x,o.h+.005*(1-r/.95)+chamber(r,a)+.004*Math.sin(6*a)*r+.002,z],s:[o.r*s.rx,.006,o.r*s.rz],r:[0,-s.angle,0]};
      });instances(o.visual,orbGeo,tomatoSeedMat,seeds);
      const glints=[],rr=rng(o.seed);for(let i=0;i<10;i++){let a=rr()*TAU,r=.83+.12*rr(),rad=.009+rr()*.012;glints.push({p:[o.r*r*Math.cos(a),o.h+.003+chamber(r,a)+.004*Math.sin(6*a)*r,o.r*r*Math.sin(a)],s:[rad,.004,rad*.7]})}
      instances(o.visual,orbGeo,moistureMat,glints)
    }
  }
  function leaf(o){
    let rr=rng(o.seed),phase=rr()*TAU,profile=[];
    for(let i=26;i>=0;i--)profile.push([Math.max(.00001,i/26),0]);
    const dark=cColor(0x478631),light=cColor(0xa1c957),mid=cColor(0x77b240);
    const geo=rings(profile,128,o.r*1.25,(r,y,a)=>{
      const lobe=Math.sin(7*a+phase)+.44*Math.cos(13*a-phase)+.19*Math.sin(25*a);
      const rad=r*o.r*(1+.087*lobe*r**1.5);
      return [rad*Math.cos(a),.047+.030*r+.087*r**1.5*Math.sin(7*a+phase)+.065*r**3*Math.cos(18*a)+.039*r*Math.sin(3*a),rad*Math.sin(a)*.92]
    },(r,y,a)=>{
      const x=r*Math.cos(a),z=r*Math.sin(a);
      const midrib=Math.exp(-x*x/(.0008+.0011*(1-z)))*(.66-.28*z);
      const branches=Math.pow(.5+.5*Math.cos((z-Math.abs(x)*(.91+.35*z))*28),15)*Math.exp(-Math.abs(x)*2.6)*.40;
      const vein=Math.pow(clamp(.5+.5*Math.cos(a*7+phase+2*r)),10)*.36+midrib+branches;
      return dark.clone().lerp(mid,.35+.5*r).lerp(light,clamp(vein+.42*r**4+noise(Math.cos(a)*r*7,Math.sin(a)*r*7)*.18))
    });o.surface=mesh(geo,leafMat,o.visual);o.rest=geo.attributes.position.array.slice();
  }
  function pressMeat(o,depth,x,z){
    const ar=o.surface.geometry.attributes.position,face=o.up===0?1:-1;
    for(let i=0;i<ar.count;i++){
      let j=i*3,rr=(o.rest[j]-x)**2+(o.rest[j+2]-z*face)**2;
      const t=clamp(o.rest[j+1]/o.h),exposed=face===1?t:1-t;
      ar.setY(i,o.rest[j+1]-face*.087*depth*exposed*Math.exp(-rr/.17));
    }
    ar.needsUpdate=true;o.surface.geometry.computeVertexNormals()
  }
  function cheese(o){
    let n=22,pos=[],uv=[],id=[],ge=new T.BufferGeometry(),sideIndices=[];
    // A rounded square with a real underside and a finely subdivided flexible edge.
    for(let face=0;face<2;face++)for(let j=0;j<=n;j++)for(let i=0;i<=n;i++){
      let u=2*i/n-1,v=2*j/n-1,ax=Math.abs(u),az=Math.abs(v),cut=Math.max(0,ax+az-1.84);
      let x=(u-Math.sign(u)*cut*.29)*.981,z=(v-Math.sign(v)*cut*.29)*.981;
      pos.push(x,(face?.068:.004)+.008*(1-u*u)*(1-v*v),z);uv.push(i/n,j/n)
    }
    const q=(n+1)**2;
    for(let j=0;j<n;j++)for(let i=0;i<n;i++){let a=j*(n+1)+i,b=a+n+1;id.push(a,a+1,b,b,a+1,b+1,a+q,b+q,a+q+1,b+q,b+q+1,a+q+1)}
    for(let i=0;i<n;i++){for(let [a,b] of [[i,i+1],[n*(n+1)+i+1,n*(n+1)+i],[(i+1)*(n+1),i*(n+1)],[i*(n+1)+n,(i+1)*(n+1)+n]])sideIndices.push(a,a+q,b,b,a+q,b+q)}
    ge.setIndex(id.concat(sideIndices));ge.addGroup(0,id.length,0);ge.addGroup(id.length,sideIndices.length,1);ge.setAttribute('position',new T.Float32BufferAttribute(pos,3));ge.setAttribute('uv',new T.Float32BufferAttribute(uv,2));ge.computeVertexNormals();
    o.cheeseMaterial=cheeseMat.clone();o.surface=mesh(ge,[o.cheeseMaterial,cheeseSide],o.visual);o.rest=Float32Array.from(pos);o.soft=0;o.lastSoft=-1;o.lastSupport='';
  }
  function melt(o,under){
    if(!under)return;
    const dx=o.x-under.x,dz=o.z-under.z,angle=o.turn,signature=[dx,dz,under.r,angle].map(n=>n.toFixed(2)).join('/');
    if(Math.abs(o.soft-o.lastSoft)<.005&&o.lastSupport===signature)return;
    o.lastSupport=signature;o.lastSoft=o.soft;let ar=o.surface.geometry.attributes.position,c=Math.cos(angle),s=Math.sin(angle);
    for(let i=0;i<ar.count;i++){let x=o.rest[i*3],y=o.rest[i*3+1],z=o.rest[i*3+2];
      let wx=dx+x*c+z*s,wz=dz-x*s+z*c,over=Math.max(0,Math.hypot(wx,wz)-under.r*.85);
      let fold=clamp(over/.5);ar.setXYZ(i,x*(1-fold*.075*o.soft),y-o.soft*Math.min(.38,over*.81),z*(1-fold*.075*o.soft))
    }ar.needsUpdate=true;o.surface.geometry.computeVertexNormals();o.cheeseMaterial.roughness=.41-.20*o.soft;
  }
  function indent(o,amount,x,z,bounce=0){
    if(o.type!=='crown'&&o.type!=='base')return;
    const a=o.surface.geometry.attributes.position;
    const depth=(px,pz,y)=>amount*Math.exp(-((px-x)**2+(pz-z)**2)/.32)*clamp(y/o.h)*.24;
    for(let i=0;i<a.count;i++){let j=i*3;a.setY(i,o.rest[j+1]-depth(o.rest[j],o.rest[j+2],o.rest[j+1]))}a.needsUpdate=true;o.surface.geometry.computeVertexNormals();
    if(o.seeds){const m=new T.Matrix4();o.seedPositions.forEach(([sx,sy,sz],i)=>{o.seeds.getMatrixAt(i,m);m.elements[13]=sy-depth(sx,sz,sy)+Math.abs(bounce)*.04*(.5+.5*Math.sin(i*4.5));o.seeds.setMatrixAt(i,m)});o.seeds.instanceMatrix.needsUpdate=true}
  }
  function create(type,seed=Math.floor(Math.random()*1000000)){
    const [r,h,mass]=sizes[type],node=group(),visual=group(node);
    const o={type,seed,r,h,mass,node,visual,x:0,z:0,turn:0,compression:0,support:1,sauce:[],drops:[],heat:0,rare:type==='pickle'&&seed%19===0};
    if(type==='patty')meat(o);else if(type==='crown'||type==='base')bread(o,type==='crown');else if(type==='cheese')cheese(o);else if(type==='lettuce')leaf(o);else sliced(o,type==='pickle');
    return o;
  }
  return {create,shadeMeat,pressMeat,melt,indent};
})();
