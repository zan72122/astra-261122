'use strict';
const scene=new T.Scene(), room=group(scene), work=group(scene);
scene.background=new T.Color('#e8dfcb');
const renderer=new T.WebGLRenderer({canvas:document.querySelector('canvas'),antialias:true,alpha:false,powerPreference:'high-performance'});
renderer.shadowMap.enabled=true;renderer.shadowMap.type=T.PCFSoftShadowMap;
renderer.outputColorSpace=T.SRGBColorSpace;renderer.toneMapping=T.ACESFilmicToneMapping;renderer.toneMappingExposure=1.02;
scene.environment=environment();scene.environmentIntensity=.39;
const camera=new T.PerspectiveCamera(34,1,.08,120);
scene.add(new T.HemisphereLight('#fff8e7','#bea282',1.25));
const sun=new T.DirectionalLight('#fff0d1',3.25);sun.position.set(-6.5,11,-3.8);sun.target.position.set(0,0,0);scene.add(sun,sun.target);sun.castShadow=true;
sun.shadow.mapSize.set(2048,2048);Object.assign(sun.shadow.camera,{left:-10,right:10,top:9,bottom:-9,near:.1,far:30});sun.shadow.normalBias=.018;sun.shadow.bias=-.00022;sun.shadow.radius=3;
const fill=new T.DirectionalLight('#eff7ff',.85);fill.position.set(1,6,7);scene.add(fill);
const oak=wood('#fff1dc'),honey=wood('#d9ba91'),paleWood=wood('#fff6df'),walnut=wood('#987451');
const steel=mat('#b8bec0',.255,{metalness:.88,envMapIntensity:1.05});
const steelBright=mat('#d3d6d3',.19,{metalness:.91,envMapIntensity:1.18}),iron=mat('#383b38',.52,{metalness:.67});
const flourMaterial=mat('#fff3d6',.98,{map:glazeMap});
function tag(o,id){o.userData.action=id;return o}
function anchor(id){let g=group(work);tag(g,id);return g}
const tops=group(room);
for(let i=0;i<12;i++){
 let m=wood(['#efdbbf','#f5e0c3','#f5ddbc','#efdabd'][i%4]);m.map.offset.set(rand()*.9,rand()*.8);box(tops,27,.37,.993,m,0,-.195,-5.75+i)
}
box(room,26,5,.3,wood('#bd9871'),0,-2.8,5.85);
for(let i=-3;i<4;i++){rounded(room,3.36,2.73,.085,.055,wood('#c7ad8e'),i*3.65,-2.11,5.98).rotation.x=PI/2}
const plaster=mat('#e8dfca',.98,{map:glazeMap});
box(room,40,14,.25,plaster,0,6,-6.53);
const tiles=[0xd3d8cc,0xd9dacf,0xe1e0d2,0xd7d9cd,0xdadbcf].map(c=>mat(c,.44,{map:glazeMap}));
const tileGeo=new T.BoxGeometry(1.46,.83,.095);
for(let j=0;j<3;j++)for(let i=-9;i<10;i++){mesh(tileGeo,tiles[Math.floor(rand()*tiles.length)],room,i*1.48+(j%2)*.74,.435+j*.854,-6.34)}
box(room,29,.105,.34,oak,0,.07,-6.20);
const frame=wood('#b69974');
box(room,15,.16,.31,frame,-1,2.59,-6.2);
function windowFrame(){
 const win=group(room);win.position.set(-3.7,2.75,-6.16);
 const view=mat('#dbe5c6',1,{emissive:'#e1eace',emissiveIntensity:.5});
 box(win,6.8,4.9,.10,view,0,2.45,-.045);
 const greens=['#a9b990','#91a57d','#b8c29b','#879e74','#c6d0a8'].map(c=>mat(c,.9));
 const leafGeo=new T.IcosahedronGeometry(1,1);
 for(let i=0;i<90;i++){let x=rand()*6.6-3.3,y=rand()*4.5+.21;if(x>1&&y<2)continue;let o=mesh(leafGeo,greens[i%5],win,x,y,.02);o.scale.set(.11+rand()*.34,.09+rand()*.2,.025);o.rotation.z=rand()*PI;o.castShadow=false}
 for(let x of [-3.5,-1.12,1.12,3.5])box(win,.115,5.1,.17,frame,x,2.45,.19);
 for(let y of [0,2.48,4.98])box(win,7.12,.13,.18,frame,0,y,.19);
 rounded(win,7.55,.71,.12,.055,oak,0,-.09,.29)
}
windowFrame();
function herb(p,x,y,z,scale=1){
 const g=group(p);g.position.set(x,y,z);g.scale.setScalar(scale);
 lathe(g,[[.01,.01],[.40,.01],[.44,.09],[.53,.88],[.55,.91],[.55,.99],[.49,1.01],[.46,.93]],glaze('#a78668'),60);
 cylinder(g,.47,.45,.06,mat('#453b2b'),0,.92);
 const stem=mat('#6c7854'),leaves=['#657a50','#7b8a5e','#83966a','#556e51'].map(c=>mat(c,.78,{side:T.DoubleSide}));
 for(let i=0;i<13;i++){let a=i*2.399,rad=.25+rand()*.45,x1=Math.cos(a)*rad,z1=Math.sin(a)*rad,y1=1.92+rand()*.74;
 tube(g,[V(0,.91,0),V(x1*.33,1.42,z1*.23),V(x1,y1,z1)],.014,stem,9);
 for(let j=0;j<5;j++){const k=.35+j*.15,angle=a+(j%2?1:-1)*.85,xx=x1*k,zz=z1*k,yy=lerp(.93,y1,k);
 const points=[0,0,0,.095,.074,.036,0,.195,.29,-.086,.069,.047,0,.102,.14];
 const geo=new T.BufferGeometry();geo.setAttribute('position',new T.Float32BufferAttribute(points,3));geo.setIndex([0,1,4,1,2,4,2,3,4,3,0,4]);geo.computeVertexNormals();
 let l=mesh(geo,leaves[(i+j)%4],g,xx,yy,zz);l.rotation.y=angle;l.rotation.x=.3*rand();l.scale.setScalar(.8+rand()*.68)}
 }return g
}
herb(room,-6.0,2.81,-5.9,.84);
function storageJar(x,z,s,colour){
 const g=group(room);g.position.set(x,0,z);g.scale.setScalar(s);
 lathe(g,[[.01,.01],[.42,.01],[.49,.09],[.51,.22],[.51,1.0],[.48,1.13],[.40,1.18],[.41,1.24]],glaze(colour));cylinder(g,.43,.43,.09,honey,0,1.27);ball(g,0,1.35,0,.09,.06,.09,walnut);contact(g,0,0,.63,.63,.23)
}
storageJar(5.85,-5.02,.86,'#d2bca3');storageJar(6.78,-5.16,1.12,'#c2c4b4');
function hangingTools(){
 box(room,4.32,.18,.19,frame,4.47,3.49,-6.15);
 for(const [i,x] of [3.16,4.04,5.68].entries()){const z=-5.95;let hook=mat('#97794c',.32,{metalness:.7});ball(room,x,3.44,z,.057,.058,.09,hook);let g=group(room);g.position.set(x,3.40,z+.024);g.rotation.z=[.07,-.035,.04][i];
 const wm=i===1?paleWood:honey;tube(g,[V(0,-.04,0),V(0,-.63,.01),V(.015,-1.21,.065)],.06,wm,10);
 if(i===1){let o=rounded(g,.32,.58,.07,.09,wm,0,-1.39,.04);o.rotation.x=-PI/2+.16}else ball(g,0,-1.39,.05,.20,.31,.075,wm);
 ring(g,.029,.009,0,hook).rotation.set(0,0,0)}
}
hangingTools();
const mixing=anchor('mix'), support=group(mixing);
const towel=cloth(support,4.48,3.53);towel.rotation.y=-.15;
const mixBowl=bowl(mixing,1.64,1.31,'mix');mixBowl.position.y=.105;
contact(mixing,.02,.035,1.64,1.44,.34,.12);
const jug=anchor('jug'),salt=anchor('salt'),cup=anchor('cup');
function pouringVessel(parent,profile,m,lipRadius,height,spout,baseWidth,handled){
 const g=group(parent),body=lathe(g,profile,m,96),a=body.geometry.attributes.position;
 for(let i=0;i<a.count;i++){const x=a.getX(i),z=a.getZ(i),y=a.getY(i),angle=Math.atan2(z,x),tip=Math.exp(-angle*angle/.092)*Math.pow(clamp(y/height),4);
 a.setXYZ(i,x+spout*tip,y+.095*tip,z*(1-.16*tip))}
 body.geometry.computeVertexNormals();
 if(handled){tube(g,[V(-baseWidth*.85,height*.80,0),V(-baseWidth*1.40,height*.86,0),V(-baseWidth*1.63,height*.61,0),V(-baseWidth*1.46,height*.41,0),V(-baseWidth*.87,height*.37,0)],baseWidth*.102,m,32)}
 return g
}
const jugGlaze=glaze('#9cb5a6');
pouringVessel(jug,[[.001,.015],[.38,.015],[.48,.10],[.54,.40],[.53,.78],[.44,1.14],[.40,1.39],[.44,1.50],[.445,1.54],[.409,1.55],[.386,1.48],[.362,1.36],[.40,1.13],[.47,.75],[.47,.31],[.30,.13],[.001,.12]],jugGlaze,.44,1.54,.245,.52,true);
const waterMat=mat('#bed3c1',.13,{metalness:.24,transparent:true,opacity:.84});
const jugWater=cylinder(jug,.399,.40,.015,waterMat,0,1.25);contact(jug,0,0,.7,.60,.27);
const saltBowl=bowl(salt,.40,.207,'plain',glaze('#c69e82'));
const saltPile=ball(salt,0,.142,0,.28,.085,.25,mat('#f4f0e4',.85));
const crystals=group(salt);const saltGeo=new T.BoxGeometry(.038,.029,.04);
for(let i=0;i<40;i++){const x=(rand()-.5)*.44,z=(rand()-.5)*.41;let s=mesh(saltGeo,flourMaterial,crystals,x,.226-(x*x+z*z)*.65+rand()*.018,z);s.rotation.set(rand(),rand(),rand())}
contact(salt,0,0,.47,.42,.20);
const cupBody=pouringVessel(cup,[[.001,.01],[.32,.01],[.41,.073],[.54,.23],[.63,.49],[.64,.64],[.625,.68],[.585,.68],[.57,.59],[.55,.48],[.46,.28],[.31,.13],[.001,.125]],glaze('#e6d4b2'),.64,.68,.285,.63,false);
const rimBand=lathe(cup,[[.592,.36],[.607,.41]],glaze('#8c7359'));
function flourHeap(p,r,h,y){
 const g=new T.SphereGeometry(1,56,32),a=g.attributes.position;
 for(let i=0;i<a.count;i++){let x=a.getX(i),yy=a.getY(i),z=a.getZ(i);let n=Math.sin(19*x+z*12)*.015+Math.sin(23*z-x*7)*.014+Math.cos(7*x+8*z)*.037;let k=1+n;a.setXYZ(i,x*r*k,yy*h*k+Math.max(0,yy)*n*r,z*r*k)}
 g.computeVertexNormals();return mesh(g,flourMaterial,p,0,y,0)
}
const cupFlour=flourHeap(cup,.578,.23,.566);
const board=anchor('board'),BOARD=.225;
const boardMat=wood('#ffe6b8',.16,.28);
rounded(board,4.78,3.62,.169,.17,boardMat,0,.025,0);contact(board,0,0,2.70,2.04,.34,.007);
const pin=anchor('pin');
lathe(pin,[[.001,-1.71],[.081,-1.71],[.113,-1.66],[.118,-1.53],[.106,-1.27],[.126,-1.24],[.184,-1.21],[.204,-1.15],[.212,-.91],[.212,.92],[.206,1.15],[.182,1.21],[.121,1.25],[.107,1.28],[.118,1.54],[.11,1.66],[.079,1.71],[.001,1.71]],wood('#edc792',.85,1.26)).rotation.z=PI/2;
const knife=anchor('knife');
function knifeBlade(){
 const path=new T.Shape();path.moveTo(-1.13,.01);path.quadraticCurveTo(-.48,-.011,.52,.005);path.lineTo(.60,.14);path.lineTo(.70,.16);path.lineTo(.68,.277);path.quadraticCurveTo(-.56,.33,-1.07,.31);path.quadraticCurveTo(-1.16,.30,-1.13,.01);
 const g=new T.ExtrudeGeometry(path,{depth:.039,bevelEnabled:true,bevelSegments:2,bevelSize:.012,bevelThickness:.007});g.rotateY(-PI/2);mesh(g,steel,knife);
 const edge=mesh(new T.BoxGeometry(.048,.030,1.58),steelBright,knife,-.019,.017,-.23);
 let h=lathe(knife,[[.025,-.04],[.087,0],[.097,.12],[.094,.93],[.074,.97],[.001,.974]],walnut,24);h.rotation.x=PI/2;h.position.set(-.016,.215,.61);
 let ferrule=cylinder(knife,.098,.095,.13,iron,-.016,.214,.668,40);ferrule.rotation.x=PI/2;
}
knifeBlade();
const restMat=glaze('#9eafa3');rounded(board,.31,.51,.10,.08,restMat,2.15,BOARD,-.27);
const pot=anchor('pot'),pr=1.40;
contact(pot,0,0,1.89,1.65,.33,.01);
const burner=rounded(pot,3.04,2.77,.16,.25,mat('#414443',.43,{metalness:.40}),0,.055,0);
ring(pot,1.10,.066,.27,iron);
for(let i=0;i<4;i++){let a=i*PI/2+.5,o=box(pot,.19,.13,.54,iron,Math.sin(a)*1.10,.29,Math.cos(a)*1.10);o.rotation.y=a}
const potShape=[[.001,.35],[1.15,.35],[1.27,.40],[1.32,.52],[1.37,1.23],[1.398,1.45],[1.43,1.49],[1.431,1.52],[1.406,1.548],[1.372,1.51],[1.352,1.42],[1.312,.64],[1.238,.48],[.001,.47]];
lathe(pot,potShape,steel);ring(pot,1.413,.027,1.516,steelBright);
for(let side of [-1,1]){
 const s=side;tube(pot,[V(s*1.30,1.15,-.33),V(s*1.58,1.24,-.33),V(s*1.77,1.26,-.23),V(s*1.77,1.26,.23),V(s*1.57,1.24,.33),V(s*1.30,1.15,.33)],.071,steelBright);
 let handle=rounded(pot,.255,.72,.13,.099,walnut,s*1.765,1.222,0);
 for(let z of [-.30,.30])ball(pot,s*1.329,1.14,z,.028,.057,.057,steelBright)}
const brushed=tex(canvas(512,256,(c,w,h)=>{
 c.fillStyle='#b5b5b5';c.fillRect(0,0,w,h);
 for(let i=0;i<4200;i++){let v=Math.floor(135+rand()*94);c.strokeStyle='rgba('+v+','+v+','+v+',.54)';let x=rand()*w,y=rand()*h;c.beginPath();c.moveTo(x,y);c.lineTo(x+13+rand()*130,y);c.lineWidth=.33+rand()*.46;c.stroke()}
}));brushed.colorSpace=T.NoColorSpace;steel.roughnessMap=brushed;steel.roughness=.35;
const waterY=1.279;
const potWater=liquidSurface(pot,1.343,waterY,mat('#a9b6a4',.12,{metalness:.38,transparent:true,opacity:.79,depthWrite:false}));
const boil=group(pot),bubbleGeo=new T.SphereGeometry(1,9,7),bubbleM=mat('#d7e2d8',.11,{metalness:.34,transparent:true,opacity:.75});
const bubbles=[];for(let i=0;i<35;i++){let a=rand()*TAU,r=Math.sqrt(rand())*1.22,bb=mesh(bubbleGeo,bubbleM,boil,r*Math.cos(a),waterY,r*Math.sin(a));bb.castShadow=false;bubbles.push({o:bb,a:rand(),s:.016+rand()*.044,speed:.36+rand()*.55})}
const mistMap=tex(canvas(128,128,(c,w,h)=>{let gr=c.createRadialGradient(64,64,2,64,64,62);gr.addColorStop(0,'#fffaf1b0');gr.addColorStop(.45,'#fffaf157');gr.addColorStop(1,'#fffaf100');c.fillStyle=gr;c.fillRect(0,0,w,h)}),false);
const steam=[];for(let i=0;i<12;i++){let m=new T.SpriteMaterial({map:mistMap,transparent:true,opacity:.05,depthWrite:false});let o=new T.Sprite(m);pot.add(o);steam.push({o,a:rand(),x:(rand()-.5)*1.25,z:(rand()-.5)*.71})}
const net=anchor('net');
const wire=mat('#a7aba5',.27,{metalness:.87}),wireLines=new T.LineBasicMaterial({color:'#888f88',transparent:true,opacity:.87});
const touchNet=cylinder(net,.687,.40,.24,new T.MeshBasicMaterial({visible:false}),0,-.12);touchNet.castShadow=touchNet.receiveShadow=false;
ring(net,.696,.032,.008,steelBright);ring(net,.679,.014,-.027,wire);
const wirePoints=[];
for(let d of [-1,1])for(let k=-9;k<=9;k++){
 const off=k*.068,span=Math.sqrt(.685**2-off*off),pts=[];
 for(let j=0;j<=19;j++){let v=lerp(-span,span,j/19),x=d===1?off:v,z=d===1?v:off;pts.push(V(x,-.31*(1-(x*x+z*z)/.685**2),z))}
 for(let i=1;i<pts.length;i++)wirePoints.push(pts[i-1],pts[i])
}
net.add(new T.LineSegments(new T.BufferGeometry().setFromPoints(wirePoints),wireLines));
tube(net,[V(.44,0,.49),V(.69,.025,.71),V(1.19,.11,1.13),V(1.56,.15,1.48)],.043,steelBright);
tube(net,[V(.91,.066,.90),V(1.25,.124,1.21),V(1.66,.165,1.59)],.083,walnut);
function makeBowl(id,pattern='serve'){
 const g=anchor(id);const body=bowl(g,1.14,.84,pattern);body.position.y=.015;contact(g,0,0,1.18,1.04,.26);
 const soup=liquidSurface(g,1.018,.697,mat('#a96127',.15,{metalness:.16}));soup.visible=false;
 let contents=group(g),floating=group(g);return {g,body,soup,contents,floating,noodles:[],garnishes:[],angle:0,floatAngle:0}
}
let serving=makeBowl('serve');
const mats=[anchor('mat'),anchor('mat')];mats.forEach(g=>woven(g,1.33));
const toppings=anchor('toppings');
const onionDish=tag(bowl(toppings,.50,.20,'plain',glaze('#ccd0b8')),'onion');onionDish.position.x=-.53;
const tofuDish=tag(group(toppings),'tofu');tofuDish.position.x=.55;
rounded(tofuDish,.95,.82,.085,.17,glaze('#ddd4b9'),0,.025,0);
const tofuMap=tex(canvas(128,128,(c,w,h)=>{c.fillStyle='#cb8b41';c.fillRect(0,0,w,h);for(let i=0;i<4200;i++){let x=rand()*w,y=rand()*h,r=.4+rand()*2.5;c.fillStyle=rand()<.57?'#9a5b2838':'#ffe3a652';c.beginPath();c.ellipse(x,y,r,r*.65,rand()*PI,0,TAU);c.fill()}}));
const tofuMat=mat('#ffdfa4',.58,{map:tofuMap,bumpMap:tofuMap,bumpScale:.047});
function tofuPiece(p,size=.75){
 const sh=new T.Shape();sh.moveTo(-size*.57,-size*.45);sh.quadraticCurveTo(-size*.57,-size*.50,-size*.44,-size*.5);sh.lineTo(size*.48,-size*.47);sh.quadraticCurveTo(size*.62,-size*.43,size*.49,-size*.31);sh.lineTo(-size*.39,size*.48);sh.quadraticCurveTo(-size*.52,size*.56,-size*.54,size*.4);sh.closePath();
 const geo=new T.ExtrudeGeometry(sh,{depth:.082,bevelEnabled:true,bevelThickness:.044,bevelSize:.036,bevelSegments:3});geo.rotateX(-PI/2);return mesh(geo,tofuMat,p)
}
const greens=[glaze('#779447'),glaze('#9aaa5a'),glaze('#61863f'),glaze('#bbc17b')],onionInner=mat('#c5d18d',.63);
function scallion(p,size=.106){
 const g=group(p),r=size;
 lathe(g,[[r*.70,0],[r,0],[r*1.02,r*.50],[r*.97,r*.61],[r*.72,r*.57],[r*.71,0]],greens[Math.floor(rand()*greens.length)],18);
 ring(g,r*.81,r*.095,r*.58,onionInner).scale.set(1,1,.86);g.scale.z=.83+rand()*.20;return g
}
const onionStock=[],tofuStock=[];
function refill(){
 for(let o of [...onionStock,...tofuStock])o.removeFromParent();onionStock.length=tofuStock.length=0;
 for(let i=0;i<14;i++){let a=i*2.4,r=.31*Math.sqrt(i/14),o=scallion(onionDish,.074+rand()*.034);o.position.set(Math.cos(a)*r,.12+rand()*.06,Math.sin(a)*r);o.rotation.set(rand()*.27,rand()*TAU,rand()*.47);onionStock.push(o)}
 for(let i=0;i<3;i++){let o=tofuPiece(tofuDish,.67);o.position.set(-.016*i,.15+i*.082,.032*i);o.rotation.y=i*.21-.17;tofuStock.push(o)}
}
refill();
