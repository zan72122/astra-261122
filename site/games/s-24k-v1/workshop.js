'use strict';
const W = (() => {
  const T = THREE, V = (x=0,y=0,z=0) => new T.Vector3(x,y,z);
  const clamp = T.MathUtils.clamp, mix = T.MathUtils.lerp;
  const canvas = document.getElementById('kitchen');
  const renderer = new T.WebGLRenderer({canvas, antialias:true, alpha:false, powerPreference:'high-performance'});
  renderer.setPixelRatio(Math.min(devicePixelRatio || 1, 1.85));
  renderer.shadowMap.enabled = true;
  renderer.shadowMap.type = T.PCFSoftShadowMap;
  renderer.toneMapping = T.ACESFilmicToneMapping;
  renderer.toneMappingExposure = 1.07;
  const scene = new T.Scene();
  scene.background = new T.Color(0xd8e2cf);
  scene.fog = new T.FogExp2(0xe5e5d5,.027);
  const camera = new T.PerspectiveCamera(33,1,.04,100);
  const group = (parent=scene) => {const g=new T.Group();parent.add(g);return g;};
  const mat = (color, roughness=.5, extras={}) => new T.MeshStandardMaterial({color,roughness,...extras});
  function mesh(geo, material, parent=scene, x=0,y=0,z=0) {
    const m = new T.Mesh(geo, material);
    m.position.set(x,y,z);m.castShadow=true;m.receiveShadow=true;parent.add(m);return m;
  }
  function seeded(s) {return () => {s=(Math.imul(1664525,s)+1013904223)>>>0;return s/4294967296;};}
  const rng=seeded(48219);
  const noiseValues=Float32Array.from({length:65536},()=>rng());
  function noise(x,y) {
    let i=Math.floor(x), j=Math.floor(y); x-=i;y-=j;x=x*x*(3-2*x);y=y*y*(3-2*y);
    const n=(a,b)=>noiseValues[((a&255)+((b&255)<<8))];
    return mix(mix(n(i,j),n(i+1,j),x),mix(n(i,j+1),n(i+1,j+1),x),y);
  }
  function surface(w,h,draw,repeat=true) {
    const c=document.createElement('canvas');c.width=w;c.height=h;draw(c.getContext('2d'),w,h);
    const t=new T.CanvasTexture(c);t.colorSpace=T.SRGBColorSpace;t.anisotropy=Math.min(8,renderer.capabilities.getMaxAnisotropy());
    if(repeat)t.wrapS=t.wrapT=T.RepeatWrapping;return t;
  }
  function timber(base,seed,scale=1) {
    const random=seeded(seed);
    const tex=surface(1024,384,(c,w,h)=>{
      const im=c.createImageData(w,h);
      for(let j=0;j<h;j++)for(let i=0;i<w;i++){
        let u=i/w,v=j/h, bend=8*noise(u*3+seed,v*3)+2.8*Math.sin(u*5.5+v*9+seed);
        let a=j+bend+1.8*noise(u*9+seed,v*7);
        let late=Math.pow(.5+.5*Math.cos(a*.73+5*noise(u*1.8,a*.033)),11);
        let fiber=noise(u*11+seed,a*1.16), wide=noise(u*2.2+seed,a*.09);
        let pigment=(wide-.5)*21+(fiber-.5)*8-late*(3+8*noise(u*13,a*.16))+(random()-.5)*4;
        let k=(i+j*w)*4;for(let p=0;p<3;p++)im.data[k+p]=base[p]+pigment*(1+p*.05);im.data[k+3]=255;
      }
      c.putImageData(im,0,0);
      for(let n=0;n<340;n++){let x=random()*w,y=random()*h;c.strokeStyle='rgba(91,55,29,'+(.025+random()*.07)+')';c.lineWidth=.5+random()*.8;c.beginPath();c.moveTo(x,y);c.quadraticCurveTo(x+14,y+.5,x+random()*67+4,y+random()*.8);c.stroke();}
    });
    tex.repeat.set(.46*scale,.77*scale);
    return mat(0xffffff,.47,{map:tex,bumpMap:tex,bumpScale:.008});
  }
  const woods={
    table:timber([199,166,125],13,.62), oak:timber([180,129,74],27,.98),
    light:timber([211,170,114],48,1.1), dark:timber([134,87,53],21,1.05),
    tray:timber([160,111,70],35,.8), end:timber([166,118,75],87,1.5)
  };
  // Each face has physical-size UVs. Extra edge rings round the timber without softening its flat faces.
  const boxCache=new Map();
  function boxGeo(w,h,d,r,detail=Math.min(w,h,d)<.10?1:3) {
    r=Math.min(r,w*.495,h*.495,d*.495);
    const key=[w,h,d,r,detail].join('/');if(boxCache.has(key))return boxCache.get(key);
    const half=[w/2,h/2,d/2], pos=[],normal=[],uv=[],index=[];
    const ticks=a=>detail===1?[-half[a],-half[a]+r,half[a]-r,half[a]]:[-half[a],-half[a]+r*.18,-half[a]+r*.54,-half[a]+r,half[a]-r,half[a]-r*.54,half[a]-r*.18,half[a]];
    for(let axis=0;axis<3;axis++)for(const sign of [-1,1]){
      const u=(axis+1)%3,v=(axis+2)%3,us=ticks(u),vs=ticks(v),base=pos.length/3;
      for(const b of vs)for(const a of us){
        const p=[0,0,0];p[axis]=half[axis]*sign;p[u]=a;p[v]=b;
        const core=p.map((val,k)=>clamp(val,-half[k]+r,half[k]-r));
        const n=V(p[0]-core[0],p[1]-core[1],p[2]-core[2]).normalize().toArray();
        pos.push(...core.map((val,k)=>val+n[k]*r));normal.push(...n);
        if(axis===0)uv.push(p[2],p[1]);else uv.push(p[0],axis===1?p[2]:p[1]);
      }
      for(let j=0;j<vs.length-1;j++)for(let i=0;i<us.length-1;i++){let a=base+i+j*us.length,b=a+1,c=a+us.length,d=c+1;if(sign>0)index.push(a,b,c,b,d,c);else index.push(a,c,b,b,c,d);}
    }
    const g=new T.BufferGeometry();g.setIndex(index);g.setAttribute('position',new T.Float32BufferAttribute(pos,3));g.setAttribute('normal',new T.Float32BufferAttribute(normal,3));g.setAttribute('uv',new T.Float32BufferAttribute(uv,2));boxCache.set(key,g);return g;
  }
  const box=(p,w,h,d,m,x=0,y=0,z=0,r=.035)=>mesh(boxGeo(w,h,d,r),m,p,x,y,z);
  const ballGeo=new T.SphereGeometry(1,24,14),dropGeo=new T.SphereGeometry(1,12,8);
  function ball(p,x,y,z,rx,ry,rz,m) {const b=mesh(Math.max(rx,ry,rz)<.11?dropGeo:ballGeo,m,p,x,y,z);b.scale.set(rx,ry,rz);return b;}
  function rod(p,a,b,r,m,segments=12,r2=r) {
    const dir=b.clone().sub(a),o=mesh(new T.CylinderGeometry(r2,r,dir.length(),segments),m,p);
    o.position.copy(a).lerp(b,.5);o.quaternion.setFromUnitVectors(V(0,1,0),dir.normalize());return o;
  }
  function ring(p,r,y,t,m){const a=mesh(new T.TorusGeometry(r,t,8,96),m,p,0,y);a.rotation.x=-Math.PI/2;return a;}
  const shadowTexture=surface(128,128,(c,w,h)=>{
    const g=c.createRadialGradient(64,64,0,64,64,64);g.addColorStop(0,'rgba(46,28,14,.68)');g.addColorStop(.5,'rgba(46,28,14,.44)');g.addColorStop(1,'rgba(46,28,14,0)');c.fillStyle=g;c.fillRect(0,0,w,h);
  },false);
  function contact(p,x,y,z,w,d,opacity=.28){
    const m=new T.MeshBasicMaterial({map:shadowTexture,transparent:true,opacity,depthWrite:false});
    const o=mesh(new T.PlaneGeometry(w,d),m,p,x,y,z);o.rotation.x=-Math.PI/2;o.castShadow=o.receiveShadow=false;return o;
  }
  // A small physical reflection environment provides the window reflection on glaze, water and agar.
  const room=new T.Scene();room.background=new T.Color(0xb0aa91);
  function panel(x,y,z,w,h,c,look){const q=new T.Mesh(new T.PlaneGeometry(w,h),new T.MeshBasicMaterial({color:c,side:T.DoubleSide}));q.position.set(x,y,z);q.lookAt(look);room.add(q);}
  panel(-3,4,-7,13,8,new T.Color(3.8,4.0,3.8),V());
  panel(4,1,6,9,8,0x766b58,V());panel(0,-3,0,20,20,0xb2906c,V());panel(-3,4,-6.8,.32,9,0x6a7367,V());
  const pmrem=new T.PMREMGenerator(renderer);scene.environment=pmrem.fromScene(room,.035).texture;pmrem.dispose();scene.environmentIntensity=.48;
  const hemi=new T.HemisphereLight(0xf4fbff,0xe5bd91,1.46);scene.add(hemi);
  const sun=new T.DirectionalLight(0xffefd4,2.65);sun.position.set(-4.8,8,-5.5);sun.castShadow=true;
  sun.shadow.mapSize.set(2048,2048);Object.assign(sun.shadow.camera,{left:-7,right:7,top:6,bottom:-6,near:.3,far:28});sun.shadow.normalBias=.014;sun.shadow.bias=-.0002;sun.shadow.radius=3.2;scene.add(sun);
  const fill=new T.DirectionalLight(0xe3f5ff,.55);fill.position.set(4,4,7);scene.add(fill);
  const porcelain=mat(0xf8f6e9,.175,{metalness:.035});
  const brass=mat(0xb48a4c,.31,{metalness:.66});
  const metal=mat(0x9caaa3,.245,{metalness:.77});
  const agar=new T.MeshPhysicalMaterial({color:0xffd18a,roughness:.105,metalness:0,clearcoat:1,clearcoatRoughness:.075,transparent:true,opacity:.89,transmission:.70,thickness:.59,ior:1.345,attenuationColor:0xffca79,attenuationDistance:1.0,envMapIntensity:1.25});
  renderer.transmissionResolutionScale=.55;
  const water=new T.MeshPhysicalMaterial({color:0xf5f5df,roughness:.075,transparent:true,opacity:.43,metalness:.15,clearcoat:1,depthWrite:false});
  return {T,V,clamp,mix,canvas,renderer,scene,camera,mat,group,mesh,box,boxGeo,ball,rod,ring,surface,contact,woods,porcelain,brass,metal,agar,water,seeded,noise};
})();
