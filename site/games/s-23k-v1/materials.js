'use strict';
const T = THREE;
const PI = Math.PI, TAU = 2*PI;
const clamp = (x,a=0,b=1)=>Math.max(a,Math.min(b,x));
const mix = (a,b,t)=>a+(b-a)*t;
const smooth = (a,b,x)=>{const f=clamp((x-a)/(b-a));return f*f*(3-2*f)};
const v3 = (x=0,y=0,z=0)=>new T.Vector3(x,y,z);
function randomSeed(seed){
  return ()=>{seed=(Math.imul(seed,1664525)+1013904223)>>>0;return seed/4294967296};
}
const rand=randomSeed(67682);
function canvasTexture(w,h,paint,repeat=true){
  const c=document.createElement('canvas'); c.width=w;c.height=h;
  paint(c.getContext('2d'),w,h);
  const t=new T.CanvasTexture(c);
  t.colorSpace=T.SRGBColorSpace;
  if(repeat)t.wrapS=t.wrapT=T.RepeatWrapping;
  t.anisotropy=4;
  return t;
}
function field(w,h){
  const a=new Float32Array(w*h);for(let i=0;i<a.length;i++)a[i]=rand();
  return (x,y)=>{
    x=(x%1+1)%1*w;y=(y%1+1)%1*h;
    const i=Math.floor(x),j=Math.floor(y),fx=smooth(0,1,x-i),fy=smooth(0,1,y-j);
    return mix(mix(a[j*w+i],a[j*w+(i+1)%w],fx),mix(a[((j+1)%h)*w+i],a[((j+1)%h)*w+(i+1)%w],fx),fy);
  };
}
function pixels(ctx,w,h,sample){
  const data=ctx.createImageData(w,h);
  for(let y=0;y<h;y++)for(let x=0;x<w;x++){
    const p=(y*w+x)*4,c=sample(x/w,y/h,x,y);
    data.data[p]=c[0];data.data[p+1]=c[1];data.data[p+2]=c[2];data.data[p+3]=255;
  }
  ctx.putImageData(data,0,0);
}
const stockTexture=canvasTexture(512,512,(c,w,h)=>{
  const pulp=field(32,39), clouds=field(8,9);
  pixels(c,w,h,(u,v)=>{
    const q=231+(rand()-.5)*16+(pulp(u,v)-.5)*13+(clouds(u,v)-.5)*10+1.3*Math.sin(u*TAU*26);
    return [q+2,q+1,q];
  });
  for(let i=0;i<3600;i++){
    const x=rand()*w,y=rand()*h;
    c.strokeStyle=rand()<.62?'rgba(73,48,25,.12)':'rgba(255,255,245,.5)';
    c.lineWidth=rand()*.8+.35;c.beginPath();c.moveTo(x,y);c.quadraticCurveTo(x+1,y-1,x+rand()*3,y+rand()*3-1.5);c.stroke();
  }
});
stockTexture.repeat.set(.8,.8);
const cutTexture=canvasTexture(256,64,(c,w,h)=>{
  pixels(c,w,h,(u,v)=>{
    const arch=.5+.29*Math.sin(u*TAU*4),fiber=rand()*12;
    const lip=Math.max(1-smooth(.10,.21,v),smooth(.79,.91,v));
    const wall=1-smooth(.055,.16,Math.abs(v-arch));
    const q=lip*.87+wall*.76+.22*(1-smooth(0,.27,Math.abs(v-arch)));
    return [100+101*q+fiber,69+91*q+fiber,43+73*q+fiber];
  });
});
const woodTexture=canvasTexture(1024,512,(c,w,h)=>{
  const broad=field(4,13),mid=field(10,134),fine=field(54,203),drift=field(6,5);
  pixels(c,w,h,(u,v)=>{
    const warp=v+.023*(drift(u,v)-.5)+.008*Math.sin(TAU*(u+v*1.5));
    const rings=TAU*(warp*24+1.4*broad(u,warp)+.13*Math.cos(u*TAU*2));
    const streak=Math.pow(.5+.5*Math.sin(rings),7);
    const q=(broad(u,warp)-.5)*20+(mid(u,warp)-.5)*14+(fine(u,warp)-.5)*9-streak*9+(rand()-.5)*5;
    return [202+q,165+q,125+q];
  });
  for(let i=0;i<2000;i++){
    let x=rand()*w,y=rand()*h;c.strokeStyle='rgba(92,54,30,.12)';c.lineWidth=.4+rand()*.7;
    c.beginPath();c.moveTo(x,y);c.lineTo(x+2+rand()*12,y+rand()*.75);c.stroke();
  }
});
woodTexture.repeat.set(.118,.49);
const shadowTexture=canvasTexture(128,128,(c,w,h)=>{
  const g=c.createRadialGradient(w/2,h/2,0,w/2,h/2,w/2);
  g.addColorStop(0,'rgba(49,27,13,.64)');g.addColorStop(.52,'rgba(58,35,17,.39)');g.addColorStop(1,'rgba(62,39,21,0)');
  c.fillStyle=g;c.fillRect(0,0,w,h);
},false);
const lamplight={value:0};
// The glazing bars break the wide window light into soft-edged pools on every surface.
function daylight(mat){
  mat.onBeforeCompile=s=>{
    s.uniforms.sunTime=lamplight;
    s.vertexShader='varying vec3 vRoom;\n'+s.vertexShader.replace('#include <worldpos_vertex>','#include <worldpos_vertex>\nvRoom=(modelMatrix*vec4(transformed,1.)).xyz;');
    s.fragmentShader='varying vec3 vRoom; uniform float sunTime;\n'+s.fragmentShader.replace('#include <opaque_fragment>',`
      vec2 windowPos=vec2(vRoom.x+.52*vRoom.z-.63*vRoom.y,vRoom.z-.25*vRoom.x-.55*vRoom.y);
      float u=windowPos.x+.035*sin(sunTime*.09);
      float pen=.18+.035*max(0.,vRoom.y);
      float stripe=smoothstep(.11,.11+pen,abs(mod(u+4.25,6.45)-3.225));
      float sash=smoothstep(.12,.40,abs(windowPos.y+3.42));
      float sun=stripe*sash*(1.-smoothstep(3.1,4.6,windowPos.y+.20*windowPos.x));
      outgoingLight*=mix(vec3(.83,.86,.90),vec3(1.09,1.055,1.005),sun);
      #include <opaque_fragment>`);
  };return mat;
}
function material(color,opts={}){return daylight(new T.MeshStandardMaterial({color,roughness:.9,...opts}))}
function stock(color){return material(color,{map:stockTexture,bumpMap:stockTexture,bumpScale:.013,side:T.DoubleSide})}
const kraft=stock(0xc99d68),lightKraft=stock(0xd9b681),honey=stock(0xb68a55),pulp=stock(0xdfc9a1);
const cut=material(0xffffff,{map:cutTexture,side:T.DoubleSide});
const scoreMat=material(0x997349),slotMat=material(0x644a34),brass=material(0xb98a46,{metalness:.57,roughness:.45});
function group(parent){const g=new T.Group();if(parent)parent.add(g);return g}
function mesh(parent,g,m,x=0,y=0,z=0){
  const o=new T.Mesh(g,m);o.position.set(x,y,z);o.castShadow=o.receiveShadow=true;parent.add(o);return o;
}
function box(parent,w,h,d,mat,x=0,y=0,z=0){return mesh(parent,new T.BoxGeometry(w,h,d),mat,x,y,z)}
function sphere(parent,r,mat,x,y,z,sx=1,sy=1,sz=1){
  const o=mesh(parent,new T.SphereGeometry(r,18,12),mat,x,y,z);o.scale.set(sx,sy,sz);return o;
}
function tube(parent,pts,r,mat,segments=20){
  const curve=new T.CatmullRomCurve3(pts.map(a=>Array.isArray(a)?v3(...a):a));
  return mesh(parent,new T.TubeGeometry(curve,segments,r,6,false),mat);
}
function shadow(parent,x,y,z,w,d,opacity=.45){
  const m=new T.MeshBasicMaterial({map:shadowTexture,transparent:true,opacity,depthWrite:false,polygonOffset:true,polygonOffsetFactor:-1});
  const a=mesh(parent,new T.PlaneGeometry(1,1),m,x,y,z);a.rotation.x=-PI/2;a.scale.set(w,d,1);a.castShadow=a.receiveShadow=false;return a;
}
function roundedOutline(points,r=.045){
  const p=new T.Shape();
  for(let i=0;i<points.length;i++){
    const a=new T.Vector2(...points[(i+points.length-1)%points.length]),b=new T.Vector2(...points[i]),c=new T.Vector2(...points[(i+1)%points.length]);
    const back=a.sub(b),next=c.sub(b),rad=Math.min(r,back.length()*.36,next.length()*.36);
    back.setLength(rad).add(b);next.setLength(rad).add(b);
    if(!i)p.moveTo(back.x,back.y);else p.lineTo(back.x,back.y);
    p.quadraticCurveTo(b.x,b.y,next.x,next.y);
  }p.closePath();return p;
}
function rectangle(x,y,w,h){return [[x,y],[x+w,y],[x+w,y+h],[x,y+h]]}
function board(parent,points,thick=.075,face=kraft,holes=[],radius=.035){
  const s=roundedOutline(points,radius);
  for(const hole of holes)s.holes.push(roundedOutline(hole,.023));
  const g=new T.ExtrudeGeometry(s,{depth:thick,bevelEnabled:false,curveSegments:3,UVGenerator:{
    generateTopUV(geo,a,i,j,k){return [i,j,k].map(n=>new T.Vector2(a[n*3],a[n*3+1]))},
    generateSideWallUV(geo,a,i,j,k,l){
      const dx=a[i*3]-a[j*3],dy=a[i*3+1]-a[j*3+1];
      return [i,j,k,l].map(n=>new T.Vector2((Math.abs(dx)>Math.abs(dy)?a[n*3]:a[n*3+1])*2.7,a[n*3+2]/thick));
    }
  }});
  return mesh(parent,g,[face,cut]);
}
function crease(p,x1,y1,x2,y2,z=.078){
  const len=Math.hypot(x2-x1,y2-y1),rot=Math.atan2(y2-y1,x2-x1);
  const a=box(p,len,.019,.004,scoreMat,(x1+x2)/2,(y1+y2)/2,z);a.rotation.z=rot;
  const b=box(p,len,.009,.005,lightKraft,(x1+x2)/2-Math.sin(rot)*.018,(y1+y2)/2+Math.cos(rot)*.018,z);b.rotation.z=rot;
}
