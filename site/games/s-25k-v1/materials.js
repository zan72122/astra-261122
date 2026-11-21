'use strict';
const Craft = (() => {
  const T = THREE, TAU = 2 * Math.PI;
  const v = (x=0,y=0,z=0) => new T.Vector3(x,y,z);
  const group = parent => { const obj = new T.Group(); if(parent) parent.add(obj); return obj; };
  let seed = 23498;
  function rand() { seed = (1664525 * seed + 1013904223) >>> 0; return seed / 4294967296; }
  const noise = new Float32Array(256*256);
  for(let i=0;i<noise.length;i++) noise[i]=rand();
  function n(x,y) {
    let a=Math.floor(x), b=Math.floor(y), u=x-a, w=y-b;
    u=u*u*(3-2*u); w=w*w*(3-2*w);
    let i=((b&255)<<8), j=(((b+1)&255)<<8), p=a&255,q=(a+1)&255;
    return (noise[i+p]*(1-u)+noise[i+q]*u)*(1-w)+(noise[j+p]*(1-u)+noise[j+q]*u)*w;
  }
  function texture(kind) {
    const c=document.createElement('canvas'), size=kind==='wood'?768:512;
    c.width=c.height=size;
    const ctx=c.getContext('2d'), im=ctx.createImageData(size,size);
    for(let j=0;j<size;j++) for(let i=0;i<size;i++) {
      const x=i/size,y=j/size;
      let lum,red=0,blue=0;
      if(kind==='wood') {
        const bend=.019*Math.sin(x*TAU+.55*Math.sin(y*TAU*2))+.009*Math.sin(x*TAU*2-y*TAU);
        const grain=y+bend, layer=grain*TAU*18+.95*Math.sin(grain*6*TAU)+.45*Math.sin(x*TAU+grain*7*TAU);
        lum=222+9*Math.sin(layer)-14*Math.pow(.5+.5*Math.sin(layer),9)+5*Math.sin(grain*TAU*118+Math.sin(x*TAU*3))+12*(n(x*9,grain*180)-.5)+7*(rand()-.5);
        red=4;blue=-7;
      } else if(kind==='cork') {
        const flakes=n(x*90,y*90);
        lum=214+(flakes-.5)*45+(n(x*30,y*30)-.5)*19+20*(rand()-.5);
        if(rand()<.027) lum-=rand()*47;
        red=3;blue=-5;
      } else {
        lum=211+34*(rand()-.5)+13*(n(x*75,y*75)-.5)+9*(n(x*18,y*18)-.5);
      }
      const k=(j*size+i)*4; im.data[k]=lum+red;im.data[k+1]=lum;im.data[k+2]=lum+blue;im.data[k+3]=255;
    }
    ctx.putImageData(im,0,0);
    if(kind==='felt') {
      for(let k=0;k<16000;k++){
        const x=rand()*size,y=rand()*size,a=rand()*TAU,len=1+rand()*5;
        ctx.strokeStyle=rand()>.5?'rgba(255,254,235,.19)':'rgba(46,54,48,.13)';
        ctx.lineWidth=.55+rand()*.5;ctx.beginPath();ctx.moveTo(x,y);ctx.lineTo(x+len*Math.cos(a),y+len*Math.sin(a));ctx.stroke();
      }
    }
    const tex=new T.CanvasTexture(c);tex.colorSpace=T.SRGBColorSpace;tex.wrapS=tex.wrapT=T.RepeatWrapping;tex.anisotropy=4;
    return tex;
  }
  function surface(color,roughness=.65,other={}) {return new T.MeshStandardMaterial({color,roughness,...other});}
  const grain=texture('wood'), fiber=texture('felt'), corkTex=texture('cork');
  grain.repeat.set(.25,.58);fiber.repeat.set(.87,.87);corkTex.repeat.set(.65,.65);
  const wood=(color)=>surface(color,.43,{map:grain,bumpMap:grain,bumpScale:.012});
  const felt=(color)=>surface(color,.98,{map:fiber,bumpMap:fiber,bumpScale:.026});
  const m={
    maple:wood(0xf5ca8a),lip:wood(0xffda9e),edge:wood(0xb37c49),birch:wood(0xffe2af),
    walnut:wood(0x985b38),desk:wood(0xe3ad79),cork:surface(0xe5bd8e,.96,{map:corkTex,bumpMap:corkTex,bumpScale:.042}),
    green:surface(0x397774,.48), jade:surface(0x67968a,.53),darkGreen:surface(0x295c5a,.52),
    rust:surface(0xc86d4b,.43),ochre:surface(0xe6ae58,.5),brass:surface(0xcca16a,.32,{metalness:.62}),
    shoe:surface(0x414942,.85),pad:felt(0x77968e),padEdge:felt(0x587e76),tray:felt(0x4e8681),
    cord:surface(0xe5d5b2,.91),ivory:surface(0xf8f0d9,.52)
  };
  function mesh(parent,geo,mat,x=0,y=0,z=0) {
    const o=new T.Mesh(geo,mat);o.position.set(x,y,z);o.castShadow=o.receiveShadow=true;parent.add(o);return o;
  }
  function shape(w,d,r) {
    const s=new T.Shape(),a=w/2,b=d/2;r=Math.min(r,a-.001,b-.001);
    s.moveTo(-a+r,-b);s.lineTo(a-r,-b);s.quadraticCurveTo(a,-b,a,-b+r);s.lineTo(a,b-r);s.quadraticCurveTo(a,b,a-r,b);
    s.lineTo(-a+r,b);s.quadraticCurveTo(-a,b,-a,b-r);s.lineTo(-a,-b+r);s.quadraticCurveTo(-a,-b,-a+r,-b);
    return s;
  }
  function block(parent,w,h,d,r,mat,x=0,y=0,z=0,bev=.035) {
    bev=Math.min(bev,h*.38);const g=new T.ExtrudeGeometry(shape(w-2*bev,d-2*bev,Math.max(.01,r-bev)),{depth:h-2*bev,bevelEnabled:bev>0,bevelSegments:3,steps:1,bevelSize:bev,bevelThickness:bev,curveSegments:8});
    g.rotateX(-Math.PI/2);g.translate(0,bev,0);
    return mesh(parent,g,mat,x,y,z);
  }
  function ring(parent,w,d,r,y,t,mat) {
    const pts=shape(w,d,r).getSpacedPoints(128).slice(0,-1).map(p=>v(p.x,y,-p.y));
    return mesh(parent,new T.TubeGeometry(new T.CatmullRomCurve3(pts,true),128,t,7,true),mat);
  }
  const cylGeo=new T.CylinderGeometry(1,1,1,28);
  function cyl(parent,r,h,mat,x=0,y=0,z=0) { const o=mesh(parent,cylGeo,mat,x,y,z);o.scale.set(r,h,r);return o; }
  function dowel(parent,a,b,r,mat) {
    const dir=b.clone().sub(a),center=a.clone().lerp(b,.5);
    const obj=cyl(parent,r,dir.length(),mat,center.x,center.y,center.z);obj.quaternion.setFromUnitVectors(v(0,1,0),dir.normalize());return obj;
  }
  function lathe(parent,profile,mat,x=0,y=0,z=0){
    return mesh(parent,new T.LatheGeometry(profile.map(p=>new T.Vector2(...p)),48),mat,x,y,z);
  }
  function orb(parent,r,mat,x=0,y=0,z=0) {return mesh(parent,new T.SphereGeometry(r,32,24),mat,x,y,z);}
  function fabricTop(parent,w,d,r,height,mat){
    const nx=Math.ceil(w/.075),nz=Math.ceil(d/.075),positions=[],uv=[],indices=[];
    for(let j=0;j<=nz;j++){
      const z=(j/nz-.5)*d,q=Math.max(0,Math.abs(z)-d/2+r);
      const half=w/2-r+Math.sqrt(Math.max(0,r*r-q*q));
      for(let i=0;i<=nx;i++){
        const x=(i/nx*2-1)*half;positions.push(x,height,z);uv.push(x,-z);
        if(i<nx&&j<nz){const a=j*(nx+1)+i,b=a+nx+1;indices.push(a,b,a+1,a+1,b,b+1);}
      }
    }
    const geo=new T.BufferGeometry();
    geo.setAttribute('position',new T.Float32BufferAttribute(positions,3).setUsage(T.DynamicDrawUsage));
    geo.setAttribute('uv',new T.Float32BufferAttribute(uv,2));geo.setIndex(indices);geo.computeVertexNormals();
    const top=mesh(parent,geo,mat);top.castShadow=false;return top;
  }
  function pad(parent,w,d,color=m.pad) {
    block(parent,w,.085,d,.27,m.padEdge);
    block(parent,w-.02,.023,d-.02,.26,color,0,.06,0,.007);
    const nap=fabricTop(parent,w-.024,d-.024,.255,.106,color);
    const path=shape(w-.16,d-.16,.19),pts=path.getSpacedPoints(Math.ceil((2*w+2*d)/.12));
    const pos=[];
    for(let i=0;i<pts.length-1;i++){const a=pts[i],b=pts[i+1];pos.push(a.x,.112,-a.y,a.x+(b.x-a.x)*.53,.112,-(a.y+(b.y-a.y)*.53));}
    let g=new T.BufferGeometry();g.setAttribute('position',new T.Float32BufferAttribute(pos,3));
    parent.add(new T.LineSegments(g,new T.LineBasicMaterial({color:0xd9cfaf,transparent:true,opacity:.78})));
    return nap;
  }
  // Soft contact shadows keep the small supports grounded underneath the window light.
  const sc=document.createElement('canvas');sc.width=sc.height=128;
  const cx=sc.getContext('2d'),gr=cx.createRadialGradient(64,64,0,64,64,64);
  gr.addColorStop(0,'rgba(53,33,23,.36)');gr.addColorStop(.44,'rgba(59,40,30,.2)');gr.addColorStop(1,'rgba(63,44,32,0)');
  cx.fillStyle=gr;cx.fillRect(0,0,128,128);
  const shadeMat=new T.MeshBasicMaterial({map:new T.CanvasTexture(sc),transparent:true,depthWrite:false,polygonOffset:true,polygonOffsetFactor:-1});
  function shadow(parent,x,z,w,d,y=.012){
    const o=mesh(parent,new T.PlaneGeometry(w,d),shadeMat,x,y,z);o.rotation.x=-Math.PI/2;o.castShadow=o.receiveShadow=false;return o;
  }
  return {T,TAU,v,m,wood,felt,surface,group,mesh,block,ring,shape,cyl,dowel,orb,lathe,pad,fabricTop,shadow,rand};
})();
