'use strict';
const T=THREE, PI=Math.PI, TAU=2*PI;
const clamp=(v,a=0,b=1)=>Math.max(a,Math.min(v,b)), lerp=(a,b,t)=>a+(b-a)*t;
const smooth=t=>t*t*(3-2*t), V=(x=0,y=0,z=0)=>new T.Vector3(x,y,z);
let seed=22537;
function rand(){seed=(Math.imul(seed,1664525)+1013904223)>>>0;return seed/4294967296}
function group(parent){const g=new T.Group();if(parent)parent.add(g);return g}
function mat(color,roughness=.64,more={}){return new T.MeshStandardMaterial({color,roughness,...more})}
function mesh(geo,m,p,x=0,y=0,z=0){const o=new T.Mesh(geo,m);o.position.set(x,y,z);o.castShadow=true;o.receiveShadow=true;if(p)p.add(o);return o}
function box(p,w,h,d,m,x=0,y=0,z=0){return mesh(new T.BoxGeometry(w,h,d),m,p,x,y,z)}
function ball(p,x,y,z,rx,ry,rz,m){const o=mesh(new T.SphereGeometry(1,32,20),m,p,x,y,z);o.scale.set(rx,ry,rz);return o}
function cylinder(p,rt,rb,h,m,x=0,y=0,z=0,n=64){return mesh(new T.CylinderGeometry(rt,rb,h,n),m,p,x,y,z)}
function lathe(p,points,m,n=96){return mesh(new T.LatheGeometry(points.map(a=>new T.Vector2(...a)),n),m,p)}
function ring(p,r,t,y,m,x=0,z=0){const o=mesh(new T.TorusGeometry(r,t,8,96),m,p,x,y,z);o.rotation.x=PI/2;return o}
function tube(p,points,r,m,segments=28){return mesh(new T.TubeGeometry(new T.CatmullRomCurve3(points),segments,r,7,false),m,p)}
function line(p,points,m){const o=new T.Line(new T.BufferGeometry().setFromPoints(points),m);p.add(o);return o}
function rounded(p,w,d,h,r,m,x=0,y=0,z=0){
 const s=new T.Shape(),a=w/2,b=d/2;
 s.moveTo(-a+r,-b);s.lineTo(a-r,-b);s.quadraticCurveTo(a,-b,a,-b+r);s.lineTo(a,b-r);s.quadraticCurveTo(a,b,a-r,b);s.lineTo(-a+r,b);s.quadraticCurveTo(-a,b,-a,b-r);s.lineTo(-a,-b+r);s.quadraticCurveTo(-a,-b,-a+r,-b);
 const g=new T.ExtrudeGeometry(s,{depth:h,bevelEnabled:true,bevelSize:.025,bevelThickness:.025,bevelSegments:3,curveSegments:6});g.rotateX(-PI/2);
 return mesh(g,m,p,x,y,z)
}
function canvas(w,h,draw){const c=document.createElement('canvas');c.width=w;c.height=h;draw(c.getContext('2d'),w,h);return c}
function tex(c,repeat=true){const t=new T.CanvasTexture(c);t.colorSpace=T.SRGBColorSpace;if(repeat)t.wrapS=t.wrapT=T.RepeatWrapping;t.anisotropy=4;return t}
function grains(ctx,w,h,n,dark,light,s=.9){for(let i=0;i<n;i++){ctx.fillStyle=rand()<.52?dark:light;ctx.fillRect(rand()*w,rand()*h,s*(.4+rand()*1.5),s*(.45+rand()))}}
function woodTexture(){
 return tex(canvas(1024,512,(c,w,h)=>{
 c.fillStyle='#cb9c6b';c.fillRect(0,0,w,h);
 const image=c.getImageData(0,0,w,h);
 for(let y=0;y<h;y++)for(let x=0;x<w;x++){let wave=y+7*Math.sin(TAU*x/w+.8*Math.sin(y*.019))+3*Math.sin(2*TAU*x/w-y*.013);
 const late=Math.pow(.5+.5*Math.sin(wave*.35+.7*Math.sin(wave*.12)),11);
 const broad=Math.sin(wave*.111)+Math.sin(wave*.239)*.45;
 const shade=6*broad-late*14+3.3*Math.sin(wave*2.7)+(rand()-.5)*7;
 let k=4*(y*w+x);image.data[k]=207+shade;image.data[k+1]=170+shade;image.data[k+2]=125+shade*.86}
 c.putImageData(image,0,0);
 for(let i=0;i<2900;i++){const x=rand()*w,y=rand()*h;c.strokeStyle='rgba(85,49,18,'+(.025+rand()*.08)+')';c.lineWidth=.3+rand()*.7;c.beginPath();c.moveTo(x,y);c.bezierCurveTo(x+9,y-.5,x+24,y+.4,x+10+rand()*95,y+rand()-.5);c.stroke()}
 }))
}
const woodMap=woodTexture();
function wood(color='#ffffff',sx=1,sy=1){const map=woodMap.clone();map.repeat.set(sx,sy);map.needsUpdate=true;return mat(color,.56,{map,bumpMap:map,bumpScale:.018})}
const glazeMap=tex(canvas(512,256,(c,w,h)=>{c.fillStyle='#fcfbf7';c.fillRect(0,0,w,h);grains(c,w,h,5600,'#cebda780','#ffffff',.82);grains(c,w,h,190,'#98745c99','#d3c4ab',1.3)}));
function glaze(color){return mat(color,.26,{map:glazeMap,bumpMap:glazeMap,bumpScale:.005})}
function liquidSurface(p,r,y,material){
 const spokes=64,rings=13,positions=[],idx=[];
 for(let j=0;j<=rings;j++)for(let k=0;k<=spokes;k++){
  const a=k/spokes*TAU,dist=r*j/rings;positions.push(Math.cos(a)*dist,0,Math.sin(a)*dist);
  if(j<rings&&k<spokes){let i=j*(spokes+1)+k;idx.push(i,i+1,i+spokes+1,i+1,i+spokes+2,i+spokes+1)}
 }
 const geo=new T.BufferGeometry();geo.setAttribute('position',new T.Float32BufferAttribute(positions,3));geo.setIndex(idx);geo.computeVertexNormals();
 const o=mesh(geo,material,p,0,y,0);o.castShadow=false;return o
}
function waterMotion(o,time,r,heat,disturbance=0){
 const ps=o.geometry.attributes.position;
 for(let i=0;i<ps.count;i++){let x=ps.getX(i),z=ps.getZ(i),d=Math.hypot(x,z),edge=clamp((r-d)*10);
  const wave=.0044*Math.sin(z*6+x*3-time*2.1)+.0057*Math.cos(x*7-z*2+time*1.54);
  const boil=.0073*Math.exp(-((x+.63)**2+(z+.31)**2)/.27)*Math.sin(d*21-time*7.1);
  const echo=disturbance*.022*(Math.sin(d*16-time*10)+.50*Math.sin((2*r-d)*16-time*10));
  ps.setY(i,edge*(heat*(wave+boil)+echo))
 }
 ps.needsUpdate=true;o.geometry.computeVertexNormals()
}
const ceramic=glaze('#f7edda'),blue=glaze('#244a72'),darkBlue=glaze('#213a52');
function paintedMap(style){
 return tex(canvas(1024,384,(c,w,h)=>{
 c.fillStyle='#f1e8d4';c.fillRect(0,0,w,h);grains(c,w,h,26000,'#99826b36','#ffffff69');
 const band=(y,hh,color)=>{c.fillStyle=color;c.fillRect(0,y,w,hh)};
 if(style==='mix'){
 band(33,5,'#213e5e');band(44,2,'#496179');band(57,219,'#294a69');
 const unit=64;
 c.save();c.beginPath();c.rect(0,57,w,219);c.clip();
 for(let row=0;row<9;row++){let y=63+row*30;for(let col=-1;col<=17;col++){let x=col*unit+(row%2)*32;c.fillStyle='#294a69';c.beginPath();c.arc(x,y,32,PI,TAU);c.fill();for(let r of [30,24,18,12,6]){c.beginPath();c.arc(x,y,r,PI,TAU);c.lineWidth=1.7;c.strokeStyle='#ece7ce';c.stroke()}}}c.restore();
 band(284,4,'#365673');band(294,2,'#53728a')
 }else{
 band(27,4,'#385d72');band(38,2,'#577487');
 for(let i=0;i<42;i++){let x=i*w/42;c.beginPath();c.moveTo(x,70);c.bezierCurveTo(x-8,110,x-8,202,x+1,264);c.bezierCurveTo(x+3,197,x+5,102,x,70);c.fillStyle=i%2?'#42667d':'#284c68';c.fill()}
 band(280,3,'#547082')
 }
 grains(c,w,h,9000,'#776c5321','#ffffff20',1.2)
 }))
}
function bowl(p,r,h,style='plain',c=ceramic){
 const g=group(p),foot=r*.41;
 const outside=[[.01,.07],[foot*.91,.07],[foot*.94,.014],[foot,.014],[foot*1.025,.10],[foot*1.02,.14],[r*.55,h*.14],[r*.69,h*.25],[r*.81,h*.42],[r*.91,h*.65],[r*.98,h*.88],[r,h*.98],[r,h]];
 const out=lathe(g,outside,style==='plain'?c:mat('#ffffff',.26,{map:paintedMap(style)}));
 // The glaze bands follow the height of the thrown wall.
 const uv=out.geometry.attributes.uv,ps=out.geometry.attributes.position;for(let i=0;i<uv.count;i++)uv.setY(i,ps.getY(i)/h);
 lathe(g,[[r,h],[r*.994,h+.019],[r*.974,h+.025],[r*.954,h],[r*.933,h*.88],[r*.87,h*.68],[r*.75,h*.46],[r*.61,h*.30],[r*.43,h*.19],[r*.23,h*.155],[.001,h*.15]],c);
 ring(g,r*.987,.021,h+.012,style==='plain'?c:blue);
 if(style!=='plain'){ring(g,r*.930,.012,h*.872,blue);ring(g,r*.913,.008,h*.821,blue);ring(g,r*.405,.011,h*.185,blue)}
 if(style==='mix'){
 const pigment=glaze('#4b6981');
 for(let i=0;i<14;i++){
  const a=i*TAU/14,pts=[];
  for(let j=0;j<=10;j++){const t=j/10,rr=r*(.242+.11*t),ang=a+.17*Math.sin(t*PI);
   pts.push(V(Math.cos(ang)*rr,h*(.155+(rr/r-.23)*.175)+.005,Math.sin(ang)*rr))}
  tube(g,pts,.007,pigment,10)
 }
 ring(g,r*.226,.007,h*.157,pigment)
 }
 return g
}
function contact(p,x,z,rx,rz,alpha=.22,y=.018){
 const m=new T.MeshBasicMaterial({map:contact.map,transparent:true,opacity:alpha,depthWrite:false,polygonOffset:true,polygonOffsetFactor:-1});
 const o=mesh(new T.PlaneGeometry(rx*2,rz*2),m,p,x,y,z);o.rotation.x=-PI/2;o.castShadow=o.receiveShadow=false;return o
}
contact.map=tex(canvas(128,128,(c,w,h)=>{let gr=c.createRadialGradient(64,64,0,64,64,64);gr.addColorStop(0,'#47331ccc');gr.addColorStop(.6,'#47331c91');gr.addColorStop(1,'#47331c00');c.fillStyle=gr;c.fillRect(0,0,w,h)}),false);
const linenTex=tex(canvas(256,256,(c,w,h)=>{
 c.fillStyle='#dcd5bf';c.fillRect(0,0,w,h);
 for(let off of [16,26,32,40,189,197,205,215]){c.fillStyle='#506c7a';c.fillRect(0,off,w,off===32||off===205?5:2)}
 for(let i=0;i<256;i+=2){c.fillStyle=i%4?'#fff6df35':'#58493638';c.fillRect(i,0,1,h);c.fillRect(0,i,w,1)}
 grains(c,w,h,12000,'#57524026','#ffffff3a')
}));
function cloth(p,w,d){
 let g=new T.PlaneGeometry(w,d,56,44);g.rotateX(-PI/2);const a=g.attributes.position;for(let i=0;i<a.count;i++){let x=a.getX(i),z=a.getZ(i),edge=Math.pow(Math.abs(x)/(w/2),3)+Math.pow(Math.abs(z)/(d/2),4);a.setXYZ(i,x+.028*Math.sin(z*3.3),.045+.035*(1+Math.sin(x*7+z*3.2))*edge+.019*Math.sin(z*11+x*1.8),z+.03*Math.sin(x*4.3))}
 g.computeVertexNormals();const m=mat('#fffdf0',.99,{map:linenTex,bumpMap:linenTex,bumpScale:.023,side:T.DoubleSide});return mesh(g,m,p)
}
function woven(p,r){
 const g=group(p),m=mat('#b18c59',.94),edge=mat('#9e784d',.94);
 cylinder(g,r,r*.985,.078,m,0,.045);
 const c=canvas(512,512,(ctx,w,h)=>{ctx.fillStyle='#ad895b';ctx.fillRect(0,0,w,h);
 for(let i=0;i<14900;i++){let a=rand()*TAU,rr=Math.sqrt(rand())*255;ctx.strokeStyle=rand()<.52?'rgba(250,222,164,.65)':'rgba(88,61,29,.39)';ctx.lineWidth=1+rand()*1.5;ctx.beginPath();ctx.arc(256,256,rr,a,a+.016+rand()*.034);ctx.stroke()}
 for(let rr=5;rr<260;rr+=7){ctx.beginPath();ctx.strokeStyle='#68482b66';ctx.lineWidth=1.2;ctx.arc(256,256,rr,0,TAU);ctx.stroke()}
 });
 let disk=mesh(new T.CircleGeometry(r,96),mat('#ffffff',.9,{map:tex(c,false)}),g,0,.086);disk.rotation.x=-PI/2;ring(g,r-.015,.025,.07,edge);return g
}
function environment(){
 const faces=Array.from({length:6},(_,i)=>canvas(128,128,(c,w,h)=>{let gr=c.createLinearGradient(0,0,0,h);gr.addColorStop(0,'#edece1');gr.addColorStop(.46,'#e8e1d0');gr.addColorStop(.53,'#8e806e');gr.addColorStop(1,'#bb9c7a');c.fillStyle=gr;c.fillRect(0,0,w,h);if(i===1||i===5){c.fillStyle='#fffff5';c.fillRect(7,3,87,64);c.fillStyle='#babcab';c.fillRect(33,0,3,65);c.fillRect(5,37,91,3)}if(i===3){c.fillStyle='#ad8e6c';c.fillRect(0,0,w,h)}}));
 const env=new T.CubeTexture(faces);env.colorSpace=T.SRGBColorSpace;env.needsUpdate=true;return env
}
// Bake immobile pieces sharing a finish into one draw call per material.
function batchStillLife(root){
 root.updateWorldMatrix(true,true);
 const inverse=root.matrixWorld.clone().invert(),buckets=new Map();
 root.traverse(o=>{if(!o.isMesh)return;const key=o.material.uuid+'-'+o.castShadow+'-'+o.receiveShadow;
  if(!buckets.has(key))buckets.set(key,[]);buckets.get(key).push(o)
 });
 const v=V();
 for(let list of buckets.values()){
  if(list.length<2)continue;const pos=[],nor=[],uvs=[],idx=[];
  for(const o of list){
   const g=o.geometry,ps=g.attributes.position,ns=g.attributes.normal,uv=g.attributes.uv,base=pos.length/3;
   const matrix=inverse.clone().multiply(o.matrixWorld),normalMatrix=new T.Matrix3().getNormalMatrix(matrix);
   for(let i=0;i<ps.count;i++){
    v.fromBufferAttribute(ps,i).applyMatrix4(matrix);pos.push(v.x,v.y,v.z);
    v.fromBufferAttribute(ns,i).applyMatrix3(normalMatrix).normalize();nor.push(v.x,v.y,v.z);
    uvs.push(uv?uv.getX(i):0,uv?uv.getY(i):0)
   }
   const count=g.index?g.index.count:ps.count;
   for(let i=0;i<count;i++)idx.push(base+(g.index?g.index.getX(i):i));
   o.removeFromParent()
  }
  const geo=new T.BufferGeometry();geo.setAttribute('position',new T.Float32BufferAttribute(pos,3));geo.setAttribute('normal',new T.Float32BufferAttribute(nor,3));geo.setAttribute('uv',new T.Float32BufferAttribute(uvs,2));geo.setIndex(idx);
  const o=mesh(geo,list[0].material,root);o.castShadow=list[0].castShadow;o.receiveShadow=list[0].receiveShadow
 }
}
