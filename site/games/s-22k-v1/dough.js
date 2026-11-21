'use strict';
const powderGroup=group(mixing),flourColor=new T.Color(),dryColor=new T.Color('#fff4dc'),wetColor=new T.Color('#ceb58c');
const powderM=mat('#ffffff',.98,{vertexColors:true,side:T.DoubleSide,map:glazeMap});
powderM.onBeforeCompile=shader=>{
 shader.vertexShader=shader.vertexShader.replace('#include <common>','#include <common>\nattribute float hydration; varying float localWater;').replace('#include <begin_vertex>','#include <begin_vertex>\nlocalWater=hydration;');
 shader.fragmentShader=shader.fragmentShader.replace('#include <common>','#include <common>\nvarying float localWater;').replace('#include <roughnessmap_fragment>','#include <roughnessmap_fragment>\nroughnessFactor=mix(roughnessFactor,0.19,smoothstep(0.22,0.98,localWater));')
};
let powder,grainsData=[],powderIdx=[],dustCenter={x:0,z:0},previousDust=null;
let flourLevel=0,collected=0,lumpMoisture=.1,grip=0,gripX=0,gripZ=0;
const lump=flourHeap(powderGroup,.70,.44,.51);
lump.material=mat('#eddbb6',.78,{map:glazeMap,bumpMap:glazeMap,bumpScale:.018});lump.visible=false;
function makePowder(){
 if(powder){powder.geometry.dispose();powder.removeFromParent()}
 grainsData=[];powderIdx=[];flourLevel=collected=0;lumpMoisture=.1;grip=0;lump.visible=false;
 dustCenter={x:(rand()-.5)*.28-.14,z:(rand()-.5)*.27};
 const nr=23,na=72;
 for(let i=0;i<=nr;i++)for(let j=0;j<=na;j++){
 let r=i/nr,a=TAU*j/na,rr=r*(1.11+.044*Math.sin(a*3.0+1.2)+.033*Math.cos(a*7)),x=dustCenter.x+rr*Math.cos(a),z=dustCenter.z+rr*Math.sin(a);
 let amount=Math.pow(Math.max(0,1-r*r),1.37)*(.75+.049*Math.cos(x*18+z*7)+.035*Math.sin(z*16-x*10));
 let residue=previousDust?.09*Math.exp(-((x-previousDust.x)**2+(z-previousDust.z)**2)/.13):0;
 grainsData.push({x,z,r,amount,original:amount,water:0,residue,weight:r+.018});
 if(i<nr&&j<na){let q=i*(na+1)+j;powderIdx.push(q,q+1,q+na+1,q+1,q+na+2,q+na+1)}
 }
 const g=new T.BufferGeometry(),n=grainsData.length;g.setAttribute('position',new T.BufferAttribute(new Float32Array(n*3),3));g.setAttribute('color',new T.BufferAttribute(new Float32Array(n*3),3));g.setAttribute('hydration',new T.Float32BufferAttribute(new Float32Array(n),1));g.setIndex(powderIdx);
 powder=mesh(g,powderM,powderGroup);powder.frustumCulled=false;redrawPowder()
}
function bowlFloor(x,z){return .312+.175*(x*x+z*z)+.106*(x*x+z*z)**2}
function redrawPowder(){
 const p=powder.geometry.attributes.position,c=powder.geometry.attributes.color;
 const idx=[],hydration=powder.geometry.attributes.hydration;
 grainsData.forEach((v,i)=>{
 let rScale=.37+.63*Math.sqrt(flourLevel),x=dustCenter.x+(v.x-dustCenter.x)*rScale,z=dustCenter.z+(v.z-dustCenter.z)*rScale;
 const wet=clamp(v.water),left=v.amount*flourLevel+v.residue,contactDepth=grip*.065*Math.exp(-((x-gripX)**2+(z-gripZ)**2)/.064);
 p.setXYZ(i,x,bowlFloor(x,z)+left*(1-.32*wet)-contactDepth,z);
 hydration.setX(i,wet);flourColor.copy(dryColor).lerp(wetColor,wet*.79);c.setXYZ(i,flourColor.r,flourColor.g,flourColor.b)
 });
 for(let i=0;i<powderIdx.length;i+=3){let k=powderIdx[i],j=powderIdx[i+1],l=powderIdx[i+2];if((grainsData[k].amount+grainsData[j].amount+grainsData[l].amount)*flourLevel+grainsData[k].residue>.016)idx.push(k,j,l)}
 powder.geometry.setIndex(idx);hydration.needsUpdate=p.needsUpdate=c.needsUpdate=true;powder.geometry.computeVertexNormals();
}
function wetAt(x,z,amt){
 for(let v of grainsData){let ds=(v.x-x)**2+(v.z-z)**2;v.water+=amt*Math.exp(-ds/.088)*(1+v.residue*4)}
 redrawPowder()
}
function kneadAt(x,z,strength){
 let wet=0,taken=0,total=0,mass=0;
 for(let v of grainsData){const ds=(v.x-x)**2+(v.z-z)**2,near=Math.exp(-ds/(.14+.69*collected)),pull=clamp(strength*near*(.26+.68*clamp(v.water)+.72*collected),0,.89);
 let pick=v.amount*pull;v.amount-=pick;wet+=pick*clamp(v.water);taken+=pick;
 if(near>.3)v.water+=.04*collected*near;
 total+=v.original*v.weight;mass+=v.amount*v.weight
 }
 collected=clamp(1-mass/total);if(taken>.0001)lumpMoisture=lerp(lumpMoisture,wet/taken,.12);
 grip=1;gripX=x;gripZ=z;
 lump.visible=collected>.014;let sc=Math.cbrt(collected);
 lump.scale.set(sc*(1+grip*.046),sc*(1-grip*.09),sc*(1+grip*.043));
 lump.position.set(x,bowlFloor(x,z)+.32*sc,z);redrawPowder();
 return collected
}
const NC=49,NR=23;
class Sheet{
 constructor(){
 this.columns=Array.from({length:NC},(_,i)=>{const u=2*i/(NC-1)-1,base=Math.sqrt(Math.max(.015,1-Math.pow(Math.abs(u),2.7)));
 let src=grainsData[Math.round((.16+.7*i/(NC-1))*grainsData.length)%grainsData.length];
 const moisture=new Float32Array(NR),ridge=new Float32Array(NR);
 for(let j=0;j<NR;j++){
  const zz=(j/(NR-1)*2-1)*base*.96;let weighted=0,weight=0;
  for(let k=0;k<grainsData.length;k+=5){let v=grainsData[k],dist=(v.x-u*.91)**2+(v.z-zz)**2;if(dist>.14)continue;
   let w=Math.exp(-dist/.047);weighted+=clamp(v.water)*w;weight+=w}
  moisture[j]=weight?clamp(weighted/weight*.75+lumpMoisture*.25):lumpMoisture
 }
 return {u,base,water:src?clamp(src.water*.48+lumpMoisture*.52):.45,moisture,ridge,work:new Float32Array(NR).fill(.075),fore:0,aft:0,x:0}});
 this.fold=0;this.crease=.53;this.strokes=0;this.indent=0;this.hit=V();this.spring=0;this.parts=[];this.min=0;this.max=0;this.update();this.addPart(-1,1)
 }
 update(){
 let xx=0,prev=.81;
 for(let c of this.columns){let sum=0;for(let v of c.work)sum+=v;let avg=sum/NR;
 const w=.80+.96*(1-Math.exp(-avg*.97));
 xx+=(prev+w)/(NC-1);c.x=xx;prev=w;
 c.front=c.base*(.72+.66*(1-Math.exp(-avg*1.3))+c.fore)+.04*Math.cos(c.u*4);
 c.back=-c.base*(.73+.68*(1-Math.exp(-avg*1.15))+c.aft)+.023*Math.sin(c.u*7);
 }
 const mid=(this.columns[0].x+this.columns[NC-1].x)*.5;
 for(let c of this.columns)c.x-=mid;this.min=this.columns[0].x;this.max=this.columns[NC-1].x;
 this.parts.forEach(part=>this.paint(part))
 }
 sample(u,t){
 let col=clamp((u+1)*.5)*(NC-1),i=Math.min(NC-2,Math.floor(col)),f=col-i,a=this.columns[i],b=this.columns[i+1];
 let row=clamp(t)*(NR-1),j=Math.min(NR-2,Math.floor(row)),rf=row-j;
 let pressure=lerp(lerp(a.work[j],a.work[j+1],rf),lerp(b.work[j],b.work[j+1],rf),f);
 const x=lerp(a.x,b.x,f),front=lerp(a.front,b.front,f),back=lerp(a.back,b.back,f);
 let z=lerp(back,front,t),soft=lerp(lerp(a.moisture[j],a.moisture[j+1],rf),lerp(b.moisture[j],b.moisture[j+1],rf),f);
 let h=.039+(.53+soft*.058)*Math.sqrt(Math.max(.016,(1-u*u)*(1-(t*2-1)**2)))*Math.exp(-pressure*1.32);
 h+=lerp(lerp(a.ridge[j],a.ridge[j+1],rf),lerp(b.ridge[j],b.ridge[j+1],rf),f);
 h+=.009*Math.sin(8*x+z*9)*Math.sin(5*z-2*x)*Math.exp(-pressure*.65);
 let d=(x-this.hit.x)**2+(z-this.hit.z)**2;
 h*=1-this.indent*.22*Math.exp(-d/.16)+this.indent*.066*Math.exp(-((Math.sqrt(d)-.48)**2)/.043);
 let crease=lerp(back,front,this.crease),dist=Math.max(0,z-crease),fold=this.fold;
 let altitude=0;if(dist>0&&fold>0){
 let angle=fold*(PI-.045);z=crease+dist*Math.cos(angle);
 altitude=dist*Math.sin(angle)+fold*(h*1.45+.068*(1-Math.exp(-dist*13))+.09*Math.exp(-dist*dist/.036));
 }
 return {x,z,y:BOARD+.007+altitude,h,front,back,soft}
 }
 roll(x,z,dx,dz,force){
 for(const c of this.columns){
 let side=Math.exp(-Math.pow((x-c.x)/.76,4));
 const shift=new Float32Array(NR),direction=dz<0?-1:1;
 for(let j=0;j<NR;j++){
  let zz=lerp(c.back,c.front,j/(NR-1)),influence=Math.exp(-((zz-z)**2)/.22);
  const before=c.work[j],step=force*side*influence*(.90+c.moisture[j]*.22);
  c.work[j]=Math.min(4.8,before+step);
  const displaced=.21*(Math.exp(-before)-Math.exp(-c.work[j]))+c.ridge[j]*clamp(step);
  c.ridge[j]*=1-clamp(step);shift[clamp(j+direction*3,0,NR-1)]+=displaced*.61;
  shift[clamp(j-direction*2,0,NR-1)]+=displaced*.16
 }
 for(let j=0;j<NR;j++)c.ridge[j]=Math.min(.14,c.ridge[j]+shift[j]);
 const extension=force*side*.074;
 if(dz<0)c.aft=Math.min(.65,c.aft+extension);else c.fore=Math.min(.54,c.fore+extension);
 }this.hit.set(x,0,z);this.indent=1;this.strokes+=force;this.update()
 }
 atX(x){for(let i=1;i<NC;i++){let a=this.columns[i-1],b=this.columns[i];if(b.x>=x)return lerp(a.u,b.u,clamp((x-a.x)/(b.x-a.x)))}return 1}
 addPart(lo,hi){
 let nx=Math.max(3,Math.ceil((hi-lo)*23)),nz=NR-1,stride=nx+1,num=stride*(nz+1),pos=new Float32Array(num*6),idx=[];
 for(let j=0;j<nz;j++)for(let i=0;i<nx;i++){let k=j*stride+i,b=k+stride;idx.push(k,b,k+1,b,b+1,k+1,k+num,k+num+1,b+num,b+num,k+num+1,b+num+1)}
 const side=(a,b)=>idx.push(a,b,a+num,b,b+num,a+num);
 for(let i=0;i<nx;i++){side(i+1,i);side(nz*stride+i,nz*stride+i+1)}for(let j=0;j<nz;j++){side(j*stride,(j+1)*stride);side((j+1)*stride+nx,j*stride+nx)}
 const g=new T.BufferGeometry();g.setAttribute('position',new T.BufferAttribute(pos,3));g.setAttribute('uv',new T.BufferAttribute(new Float32Array(num*4),2));g.setIndex(idx);
 const o=tag(mesh(g,sheetM,board),'piece');let part={lo,hi,nx,nz,num,o,spread:0};o.userData.part=part;this.parts.push(part);this.paint(part);return part
 }
 paint(p){
 const g=p.o.geometry,ps=g.attributes.position,uv=g.attributes.uv;
 for(let j=0;j<=p.nz;j++)for(let i=0;i<=p.nx;i++){let k=j*(p.nx+1)+i,u=lerp(p.lo,p.hi,i/p.nx),t=j/p.nz,v=this.sample(u,t),x=v.x+p.spread;
 ps.setXYZ(k,x,v.y+v.h,v.z);ps.setXYZ(k+p.num,x,v.y,v.z);uv.setXY(k,(u+1)/2,t);uv.setXY(k+p.num,(u+1)/2,t)}
 ps.needsUpdate=uv.needsUpdate=true;g.computeVertexNormals();g.computeBoundingSphere();g.computeBoundingBox()
 }
 remove(p){this.parts.splice(this.parts.indexOf(p),1);p.o.removeFromParent();p.o.geometry.dispose()}
 cut(x){
 let u=this.atX(x),p=this.parts.find(v=>u>v.lo+.012&&u<v.hi-.012);if(!p)return null;
 this.remove(p);let left=this.addPart(p.lo,u),right=this.addPart(u,p.hi);
 for(let v of this.parts){v.spread+=(v.hi<=u?-.012:.012);this.paint(v)}
 return [left,right]
 }
 noodle(p){
 const u=(p.lo+p.hi)*.5,a=this.sample(u,0),b=this.sample(u,1),w=this.sample(p.hi,.5).x-this.sample(p.lo,.5).x;
 const thick=Array.from({length:25},(_,i)=>this.sample(u,i/24).h);
 let n={id:Math.random(),u,lo:p.lo,hi:p.hi,width:w,length:b.front-a.back,thick,crease:this.crease,seed:rand()*TAU,origin:p,heat:0,state:'board',age:0,landX:0,landZ:0,turn:0,layer:0};
 this.remove(p);return n
 }
}
const sheetM=mat('#f4dfb6',.79,{map:glazeMap,bumpMap:glazeMap,bumpScale:.015,side:T.DoubleSide});
const noodleM=mat('#f6e7c5',.38,{map:glazeMap,side:T.DoubleSide});
const sections=38,around=12;
function makeNoodle(n){
 const g=new T.BufferGeometry(),idx=[],N=(sections+1)*around;
 g.setAttribute('position',new T.BufferAttribute(new Float32Array((N+2)*3),3));
 for(let j=0;j<sections;j++)for(let k=0;k<around;k++){const a=j*around+k,b=j*around+(k+1)%around;idx.push(a,b,a+around,b,b+around,a+around)}
 for(let k=0;k<around;k++)idx.push(N,(k+1)%around,k,N+1,sections*around+k,sections*around+(k+1)%around);
 g.setIndex(idx);g.setAttribute('color',new T.BufferAttribute(new Float32Array((N+2)*3).fill(1),3));
 const finish=noodleM.clone();finish.vertexColors=true;n.mesh=mesh(g,finish,scene);n.mesh.frustumCulled=false;glazeNoodle(n,0);return n
}
function shapeNoodle(n,path,widthEase=1){
 const att=n.mesh.geometry.attributes.position,points=[];
 for(let j=0;j<=sections;j++)points.push(path(j/sections));
 for(let j=0;j<=sections;j++){
 const t=j/sections,p=points[j],bef=points[Math.max(0,j-1)],aft=points[Math.min(sections,j+1)];
 const dx=aft.x-bef.x,dz=aft.z-bef.z,dl=Math.hypot(dx,dz)||1,nx=dz/dl,nz=-dx/dl;
 const width=n.width*.5*(.82+.18*Math.sin(t*PI))*(1+.018*Math.sin(n.seed+t*9));
 const h=clamp(n.thick[Math.round(t*24)]*.49,.023,.16)*(1+.12*clamp(n.heat));
 for(let k=0;k<around;k++){let a=TAU*k/around,s=Math.sin(a),c=Math.cos(a),cross=Math.sign(c)*Math.pow(Math.abs(c),.59)*width,eh=Math.sign(s)*Math.pow(Math.abs(s),.56)*h;
 // Very broad offcuts drape over the rim with their full material width.
 const bend=widthEase*Math.max(0,width-.30),side=cross/(1+.82*bend);
 att.setXYZ(j*around+k,p.x+nx*side,p.y+eh-bend*.41*Math.pow(Math.abs(c),3),p.z+nz*side)}
 }
 const cap=(sections+1)*around;for(let j=0;j<2;j++){let p=points[j*sections];att.setXYZ(cap+j,p.x,p.y,p.z)}
 att.needsUpdate=true;n.mesh.geometry.computeVertexNormals();n.mesh.geometry.computeBoundingSphere()
}

function glazeNoodle(n,amount){
 const colour=n.mesh.geometry.attributes.color;
 for(let j=0;j<=sections;j++){const shine=clamp(amount*2.7-(1-j/sections)*1.35);for(let k=0;k<around;k++)colour.setXYZ(j*around+k,.99,.924+.076*shine,.824+.169*shine)}
 colour.needsUpdate=true;n.mesh.material.roughness=lerp(.76,.245,clamp(amount));n.mesh.material.envMapIntensity=.48+amount*.42
}
