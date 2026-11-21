'use strict';
const T=THREE, PI=Math.PI, TAU=2*PI;
const clamp=(x,a=0,b=1)=>Math.max(a,Math.min(b,x));
const lerp=(a,b,t)=>a+(b-a)*t;
const vec=(x=0,y=0,z=0)=>new T.Vector3(x,y,z);
const group=(parent)=>{const g=new T.Group();if(parent)parent.add(g);return g};
const mat=(color,props={})=>new T.MeshStandardMaterial({color,roughness:.78,...props});
function rand(seed){return ()=>{seed=(1664525*seed+1013904223)>>>0;return seed/4294967296}}
const noise=rand(27018);
function canvasTexture(w,h,draw){
 const c=document.createElement('canvas');c.width=w;c.height=h;
 draw(c.getContext('2d'),w,h);
 const t=new T.CanvasTexture(c);t.colorSpace=T.SRGBColorSpace;t.wrapS=t.wrapT=T.RepeatWrapping;t.anisotropy=8;return t;
}
const paperTex=canvasTexture(384,384,(c,w,h)=>{
 c.fillStyle='#f3ede0';c.fillRect(0,0,w,h);
 for(let i=0;i<29000;i++){const x=noise()*w,y=noise()*h;c.fillStyle=noise()<.47?'rgba(98,72,49,.12)':'rgba(255,255,250,.42)';c.fillRect(x,y,.4+noise()*3,.4+noise()*1.2)}
 for(let i=0;i<1400;i++){const x=noise()*w,y=noise()*h;c.strokeStyle='rgba(116,88,55,.14)';c.lineWidth=.3+noise()*.6;c.beginPath();c.moveTo(x,y);c.lineTo(x+noise()*5,y+noise()*2-1);c.stroke()}
});
paperTex.repeat.set(.65,.65);
const edgeTex=canvasTexture(128,96,(c,w,h)=>{
 const grad=c.createLinearGradient(0,0,0,h);
 [[0,'#efd4a3'],[.1,'#c29464'],[.18,'#634526'],[.49,'#8c623d'],[.86,'#63462c'],[.9,'#c6a079'],[1,'#f5dcaf']].forEach(([s,col])=>grad.addColorStop(s,col));
 c.fillStyle=grad;c.fillRect(0,0,w,h);c.beginPath();
 for(let x=-1;x<=w;x++) {const y=h*(.5+.32*Math.cos(x/w*TAU));if(x<0)c.moveTo(x,y);else c.lineTo(x,y)}
 c.lineWidth=9;c.strokeStyle='#dfb886';c.stroke();
});
const woodTex=canvasTexture(1536,512,(c,w,h)=>{
 c.fillStyle='#dab284';c.fillRect(0,0,w,h);
 for(let i=0;i<4400;i++){
 const y=noise()*h,a=noise()*5+.35,b=noise()*TAU,k=1+Math.floor(noise()*3),start=noise()*w;
 c.beginPath();c.lineWidth=.3+noise()*1.8;c.strokeStyle=noise()<.52?'rgba(128,75,41,.095)':'rgba(255,232,191,.2)';
 for(let x=-16;x<=w+16;x+=16){const yy=y+a*Math.sin(x/w*TAU*k+b)+Math.sin(x/w*TAU+b)*4+(y-h*.42)*.14*Math.exp(-Math.pow((x-w*.63)/180,2)-Math.pow((y-h*.42)/65,2));if(x===-16)c.moveTo(x,yy);else c.lineTo(x,yy)}c.stroke();
 if(i%3===0){c.fillStyle='rgba(110,73,34,.13)';c.fillRect(start,y,2+noise()*12,.8)}
 }
});
const wood=mat(0xffffff,{map:woodTex,bumpMap:woodTex,bumpScale:.017,roughness:.68});
const card=mat(0xd9ae78,{map:paperTex, bumpMap:paperTex,bumpScale:.015});
const ivory=mat(0xffe8c5,{map:paperTex,bumpMap:paperTex,bumpScale:.009});
const coral=mat(0xe08c76,{map:paperTex});
const edge=mat(0xffffff,{map:edgeTex,roughness:.97});
const kraftDark=mat(0x9a6c47), creaseMat=mat(0xb89163,{map:paperTex});
const mint=mat(0x85b6a4), pink=mat(0xeea19f), gold=mat(0xe7bd71);
const standardGlass=new T.MeshPhysicalMaterial({color:0xf0fcfc,roughness:.12,metalness:0,transparent:true,opacity:.18,envMapIntensity:1.4,clearcoat:1,depthWrite:false,side:T.DoubleSide});
const glassEdge=new T.MeshStandardMaterial({color:0xcee9e5,transparent:true,opacity:.72,roughness:.24,depthWrite:false});
const glint=new T.MeshBasicMaterial({color:0xfffcf1,transparent:true,opacity:.7,depthWrite:false,side:T.DoubleSide});
function mesh(parent,geo,material,x=0,y=0,z=0){
 const o=new T.Mesh(geo,material);o.position.set(x,y,z);o.castShadow=o.receiveShadow=true;if(parent)parent.add(o);return o;
}
function box(p,w,h,d,m,x=0,y=0,z=0){return mesh(p,new T.BoxGeometry(w,h,d),m,x,y,z)}
function ball(p,r,m,x,y,z,sx=1,sy=1,sz=1){const o=mesh(p,new T.SphereGeometry(r,32,20),m,x,y,z);o.scale.set(sx,sy,sz);return o}
function cyl(p,rt,rb,h,m,x=0,y=0,z=0,n=48){return mesh(p,new T.CylinderGeometry(rt,rb,h,n),m,x,y,z)}
function ring(p,r,t,m,x,y,z){const o=mesh(p,new T.TorusGeometry(r,t,8,64),m,x,y,z);o.rotation.x=PI/2;return o}
function roundedPath(x,y,w,h,r,Cls=T.Shape){
 const s=new Cls();r=Math.min(r,w*.499,h*.499);
 s.moveTo(x+r,y);s.lineTo(x+w-r,y);s.quadraticCurveTo(x+w,y,x+w,y+r);s.lineTo(x+w,y+h-r);s.quadraticCurveTo(x+w,y+h,x+w-r,y+h);s.lineTo(x+r,y+h);s.quadraticCurveTo(x,y+h,x,y+h-r);s.lineTo(x,y+r);s.quadraticCurveTo(x,y,x+r,y);return s;
}
function hole(s,x,y,w,h,r=.03){s.holes.push(roundedPath(x-w/2,y-h/2,w,h,r,T.Path))}
function roundHole(s,x,y,r){const path=new T.Path();path.absarc(x,y,r,0,TAU,true);s.holes.push(path)}
function slab(p,shape,thick,material=card,edgeMat=edge,bevel=.013){
 const g=new T.ExtrudeGeometry(shape,{depth:thick,bevelEnabled:bevel>0,bevelSegments:2,steps:1,bevelSize:bevel,bevelThickness:bevel,curveSegments:14});
 // Surface coordinates follow the cut, so the exposed flute keeps its scale around curves.
 if(edgeMat===edge){const a=g.attributes.position,uv=g.attributes.uv;
 for(const part of g.groups)if(part.materialIndex===1)for(let i=part.start;i<part.start+part.count;i+=3){
 // Use the tangent from the two vertices in the same depth layer.
 let j=i,k=i+1;if(Math.abs(a.getZ(j)-a.getZ(k))>.00001){k=i+2;if(Math.abs(a.getZ(j)-a.getZ(k))>.00001){j=i+1;k=i+2}}
 const mx=a.getX(k)-a.getX(j),my=a.getY(k)-a.getY(j),ml=Math.hypot(mx,my)||1;
 for(let u=i;u<i+3;u++)uv.setXY(u,(a.getX(u)*mx/ml+a.getY(u)*my/ml)/.105,clamp(a.getZ(u)/thick,.001,.999));
 }}
 const o=mesh(p,g,[material,edgeMat]);o.rotation.x=-PI/2;return o;
}
function plate(p,w,d,h,m=card,r=.08,x=0,y=0,z=0,em=edge){
 const o=slab(p,roundedPath(-w/2,-d/2,w,d,r),h,m,em);o.position.set(x,y,z);return o;
}
function rod(p,a,b,r,m,n=12){const v=b.clone().sub(a);const o=cyl(p,r,r,v.length(),m,0,0,0,n);o.position.copy(a).addScaledVector(v,.5);o.quaternion.setFromUnitVectors(vec(0,1,0),v.normalize());return o}
function line(p,pts,r,m){return mesh(p,new T.TubeGeometry(new T.CatmullRomCurve3(pts),Math.max(12,pts.length*3),r,6,false),m)}
const contactTex=canvasTexture(128,128,(c,w,h)=>{let g=c.createRadialGradient(w/2,h/2,0,w/2,h/2,w/2);g.addColorStop(0,'rgba(48,31,19,.40)');g.addColorStop(.48,'rgba(49,34,22,.22)');g.addColorStop(1,'rgba(52,36,22,0)');c.fillStyle=g;c.fillRect(0,0,w,h)});
function contact(p,w,d,x,y,z,opacity=.68){const o=mesh(p,new T.PlaneGeometry(w,d),new T.MeshBasicMaterial({map:contactTex,transparent:true,depthWrite:false,opacity,polygonOffset:true,polygonOffsetFactor:-1}),x,y,z);o.rotation.x=-PI/2;o.castShadow=o.receiveShadow=false;return o}
