'use strict';
const Studio = (() => {
  const T=THREE, PI=Math.PI, TAU=2*PI;
  const scene=new T.Scene(), camera=new T.PerspectiveCamera(32,1,.08,140);
  const canvas=document.querySelector('canvas');
  const renderer=new T.WebGLRenderer({canvas,antialias:true,alpha:false,powerPreference:'high-performance'});
  renderer.setPixelRatio(Math.min(devicePixelRatio || 1,1.8));
  renderer.shadowMap.enabled=true;
  renderer.shadowMap.type=T.PCFShadowMap;
  renderer.toneMapping=T.ACESFilmicToneMapping;
  renderer.toneMappingExposure=1.04;
  scene.background=new T.Color(0xd9bc92);
  scene.fog=new T.FogExp2(0xe1cbb2,.018);
  const clamp=(v,a=0,b=1)=>Math.max(a,Math.min(b,v));
  const mix=(a,b,k)=>a+(b-a)*k;
  const smooth=t=>t*t*(3-2*t);
  const vec=(x=0,y=0,z=0)=>new T.Vector3(x,y,z);
  const rng=seed=>()=>{seed=(Math.imul(seed,1664525)+1013904223)>>>0;return seed/4294967296};
  const rand=rng(843217);
  function canvasMap(w,h,draw,repeat=false){
    const c=document.createElement('canvas'); c.width=w;c.height=h;
    draw(c.getContext('2d'),w,h);
    const tex=new T.CanvasTexture(c);tex.colorSpace=T.SRGBColorSpace;tex.anisotropy=Math.min(8,renderer.capabilities.getMaxAnisotropy());
    if(repeat)tex.wrapS=tex.wrapT=T.RepeatWrapping;
    return tex;
  }
  const mat=(color,roughness=.6,extra={})=>new T.MeshStandardMaterial({color,roughness,...extra});
  function mesh(g,m,parent){let o=new T.Mesh(g,m);o.castShadow=o.receiveShadow=true;if(parent)parent.add(o);return o}
  const group=parent=>{let o=new T.Group();if(parent)parent.add(o);return o};
  const orbGeo=new T.SphereGeometry(1,24,16),smallGeo=new T.SphereGeometry(1,10,7);
  function orb(p,m,x,y,z,sx,sy,sz){let o=mesh(orbGeo,m,p);o.position.set(x,y,z);o.scale.set(sx,sy,sz);return o}
  function box(p,m,x,y,z,w,h,d){let o=mesh(new T.BoxGeometry(w,h,d),m,p);o.position.set(x,y,z);return o}
  // Profiles travel from the centre of the underside to the lip and back to the centre.
  function lathe(p,m,profile,n=96){return mesh(new T.LatheGeometry(profile.map(([r,y])=>new T.Vector2(Math.max(.0001,r),y)),n),m,p)}
  function rim(p,m,r,thick,y){const o=mesh(new T.TorusGeometry(r,thick,8,96),m,p);o.rotation.x=PI/2;o.position.y=y;return o}
  function tube(p,m,points,r,n=18){return mesh(new T.TubeGeometry(new T.CatmullRomCurve3(points.map(v=>Array.isArray(v)?vec(...v):v)),n,r,7,false),m,p)}
  function instances(p,geo,material,items,shadows=false){
    const o=new T.InstancedMesh(geo===orbGeo?smallGeo:geo,material,items.length),a=new T.Object3D();
    items.forEach((it,i)=>{a.position.set(...it.p);a.scale.set(...it.s);a.rotation.set(...(it.r||[0,0,0]));a.updateMatrix();o.setMatrixAt(i,a.matrix);if(it.c)o.setColorAt(i,new T.Color(it.c))});
    o.castShadow=shadows;o.receiveShadow=true;p.add(o);return o;
  }
  // A shared studio reflection, with two broad warm window lights in the metal and glaze.
  const envScene=new T.Scene();envScene.background=new T.Color(0xb4a288);
  function panel(x,y,z,w,h,color,power){
    const m=new T.MeshBasicMaterial({color:new T.Color(color).multiplyScalar(power),side:T.DoubleSide});
    const o=new T.Mesh(new T.PlaneGeometry(w,h),m);o.position.set(x,y,z);o.lookAt(0,0,0);envScene.add(o);
  }
  panel(-7,4,-3,6,8,0xffdfac,4);panel(3,5,5,7,4,0xfff4e5,2);panel(0,-4,0,18,18,0x745039,.65);
  const pm=new T.PMREMGenerator(renderer),environment=pm.fromScene(envScene,.045,.1,45,{size:64});scene.environment=environment.texture;scene.environmentIntensity=.42;pm.dispose();
  const hemi=new T.HemisphereLight(0xfff1da,0xc2855c,1.2);scene.add(hemi);
  const sun=new T.DirectionalLight(0xffdfac,3.25);sun.position.set(-7,11,-5.5);sun.target.position.set(0,0,-.6);scene.add(sun,sun.target);
  sun.castShadow=true;sun.shadow.mapSize.set(2048,2048);Object.assign(sun.shadow.camera,{left:-9,right:9,top:10,bottom:-10,near:.1,far:36});
  sun.shadow.normalBias=.018;sun.shadow.bias=-.00025;sun.shadow.radius=3;
  const fill=new T.DirectionalLight(0xffeee0,.63);fill.position.set(3,5,6);scene.add(fill);
  // Analytic grain follows the length of each board. Fine pores share its UVs.
  function woodMap(board=false){
    return canvasMap(1024,512,(c,w,h)=>{
      const rand=rng(board?6921:901),im=c.createImageData(w,h),d=im.data;
      const bands=board?8:5;
      const base=board?[192,145,91]:[160,104,70];
      const rows=Array.from({length:bands},()=>rand()*15-7);
      const knots=Array.from({length:bands},()=>[rand()*w,rand()*h/bands]);
      for(let y=0;y<h;y++)for(let x=0;x<w;x++){
        const band=Math.min(bands-1,Math.floor(y/h*bands)),v=y-band*h/bands;
        const dx=(x-knots[band][0])/135,dy=(v-knots[band][1])/13,dist=Math.sqrt(dx*dx+dy*dy);
        const warp=2.7*Math.sin(x/160+y*.014)+1.1*Math.sin(x/66+y*.017)+5.3*Math.exp(-dx*dx)*Math.sin(dy);
        const t=v+warp,grain=Math.sin(t*1.6+.9*Math.sin(t*.42))+.55*Math.sin(t*3.5+x*.004);
        let k=rows[band]+4.4*grain+4*Math.sin(t*.20)+2.6*Math.cos(t*.63)+4*(rand()-.5);
        k-=Math.exp(-dist*.9)*(3+5*Math.cos(14*dist));
        if(!board&&v<1.95)k-=v<1?38:16;
        if(!board&&v>h/bands-1.5)k+=8;
        const j=(y*w+x)*4;d[j]=base[0]+k;d[j+1]=base[1]+k*.86;d[j+2]=base[2]+k*.65;d[j+3]=255;
      }c.putImageData(im,0,0);
      for(let i=0;i<7800;i++){const x=rand()*w,y=rand()*h;c.strokeStyle=rand()<.6?'rgba(66,30,13,.10)':'rgba(255,229,182,.11)';c.lineWidth=.4+rand()*.6;c.beginPath();c.moveTo(x,y);c.quadraticCurveTo(x+3,y-.35,x+rand()*14+1,y);c.stroke()}
    },true);
  }
  function noiseMap(seed){return canvasMap(192,192,(c,w,h)=>{let r=rng(seed),d=c.createImageData(w,h);for(let j=0;j<d.data.length;j+=4){let v=160+Math.floor(r()*95);d.data[j]=d.data[j+1]=d.data[j+2]=v;d.data[j+3]=255}c.putImageData(d,0,0)},true)}
  // Contact darkening is attached to each solid, including the shadow beneath a lifted ingredient.
  const contactTexture=canvasMap(96,96,(c,w,h)=>{let g=c.createRadialGradient(48,48,5,48,48,47);g.addColorStop(0,'rgba(52,28,12,.78)');g.addColorStop(.52,'rgba(62,30,12,.38)');g.addColorStop(1,'rgba(68,35,20,0)');c.fillStyle=g;c.fillRect(0,0,w,h)});
  function contact(p,x,y,z,rx,rz,alpha=.35){let m=new T.MeshBasicMaterial({map:contactTexture,transparent:true,depthWrite:false,opacity:alpha,polygonOffset:true,polygonOffsetFactor:-1});let o=new T.Mesh(new T.PlaneGeometry(2,2),m);p.add(o);o.rotation.x=-PI/2;o.position.set(x,y,z);o.scale.set(rx,rz,1);return o}
  // Sunlight through an out-of-frame sash, projected onto real geometry in world space.
  function windowLight(material){material.onBeforeCompile=s=>{
    s.vertexShader='varying vec3 kitchenWorld;\n'+s.vertexShader.replace('#include <project_vertex>','#include <project_vertex>\nkitchenWorld=(modelMatrix*vec4(transformed,1.)).xyz;');
    s.fragmentShader='varying vec3 kitchenWorld;\n'+s.fragmentShader.replace('#include <opaque_fragment>',`vec2 wp=kitchenWorld.xz+kitchenWorld.y*vec2(.63,.5);
      float stripes=wp.x*.80-wp.y*.57;
      float bar=1.-smoothstep(.07,.19,abs(stripes+4.65));
      bar=max(bar,(1.-smoothstep(.08,.23,abs(stripes-3.84)))*.74);
      float shade=smoothstep(1.8,4.4,wp.x*.21+wp.y*.98);
      outgoingLight*=mix(vec3(1.04,1.015,.97),vec3(.65,.70,.75),max(bar*.56,shade*.64));
      #include <opaque_fragment>`);
  };return material}
  return {T,PI,TAU,scene,camera,canvas,renderer,sun,vec,clamp,mix,smooth,rng,rand,canvasMap,mat,mesh,group,orb,box,lathe,rim,tube,instances,woodMap,noiseMap,contact,windowLight,orbGeo};
})();
