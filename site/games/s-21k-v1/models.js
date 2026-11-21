'use strict';
function makeMat(p,w,d){
 const g=group(p);
 const tex=canvasTexture(Math.round(w*120),Math.round(d*120),(c,W,H)=>{
 c.fillStyle='#648b7d';c.fillRect(0,0,W,H);
 for(let i=0;i<W*H/17;i++){c.fillStyle=noise()<.5?'rgba(246,255,234,.07)':'rgba(35,67,55,.06)';c.fillRect(noise()*W,noise()*H,1.5,1.5)}
 const step=42,mar=25;
 c.save();c.beginPath();c.rect(mar,mar,W-2*mar,H-2*mar);c.clip();
 for(let i=0;i*step<W;i++){const x=mar+i*step;c.strokeStyle=i%5===0?'rgba(226,234,205,.54)':'rgba(222,233,207,.29)';c.lineWidth=i%5===0?1.8:1;c.beginPath();c.moveTo(x,mar);c.lineTo(x,H-mar);c.stroke()}
 for(let i=0;i*step<H;i++){const y=mar+i*step;c.strokeStyle=i%5===0?'rgba(226,234,205,.54)':'rgba(222,233,207,.29)';c.lineWidth=i%5===0?1.8:1;c.beginPath();c.moveTo(mar,y);c.lineTo(W-mar,y);c.stroke()}
 c.restore();c.strokeStyle='rgba(234,238,211,.62)';c.lineWidth=2;c.strokeRect(mar,mar,W-2*mar,H-2*mar);
 for(let i=0;i<(W-mar*2)/10.5;i++){const x=mar+i*10.5;c.fillStyle='#afc3ad';c.fillRect(x,mar-(i%4===0?8:4),1,i%4===0?8:4)}
 for(let i=0;i<108;i++){const x=noise()*W,y=noise()*H;c.beginPath();c.moveTo(x,y);c.lineTo(x+noise()*130-65,y+noise()*110-55);c.strokeStyle='rgba(215,222,194,.13)';c.lineWidth=.8;c.stroke()}
 });
 const m=mat(0xffffff,{map:tex,roughness:.93});
 const o=plate(g,w,d,.055,m,.18,0,-.086,0,mat(0x496e61));
 const pos=o.geometry.attributes.position,uv=o.geometry.attributes.uv;
 for(const gr of o.geometry.groups)if(gr.materialIndex===0)for(let i=gr.start;i<gr.start+gr.count;i++)uv.setXY(i,pos.getX(i)/w+.5,pos.getY(i)/d+.5);
 return g;
}
function makeNet(p){
 const root=group(p),W=2.52,D=1.88,H=2.55;
 const base=roundedPath(-W/2,-D/2,W,D,.035);slab(root,base,.09);
 // Small folded runners hold the floor of the mechanism above the outlet.
 for(const x of [-.99,.99]){plate(root,.17,1.44,.08,ivory,.025,x,.095,-.03);for(const z of [-.52,.52])cyl(root,.044,.044,.015,kraftDark,x,.19,z,16)}
 const left=group(root),right=group(root),back=group(root),front=group(root);
 for(const [i,pivot] of [[-1,left],[1,right]]){
 pivot.position.set(i*W/2,.08,0);
 const leaf=group(pivot);leaf.scale.x=i;
 const s=new T.Shape();s.moveTo(.02,-D/2);s.lineTo(H-.50,-D/2);s.quadraticCurveTo(H-.40,-D/2,H-.34,-D/2+.12);s.lineTo(H-.03,-.22);s.quadraticCurveTo(H,.02,H,.2);s.lineTo(H,D/2-.09);s.quadraticCurveTo(H,D/2,H-.10,D/2);s.lineTo(.02,D/2);s.closePath();
 hole(s,H-.28,D/2-.135,.37,.134);hole(s,.65,D/2-.135,.32,.134);
 for(const h of [1.77,2.12])hole(s,h,-.12,.105,.80);
 hole(s,1.09,-D/2+.16,.45,.075);
 pivot.userData.board=slab(leaf,s,.085);
 for(const z of [.775,.883])plate(leaf,1.55,.041,.069,ivory,.018,1.42,.089,z);

 // Slender pressed lines border the insertion slots.
 for(const h of [1.77,2.12]){box(leaf,.019,.008,.73,creaseMat,h+.094,.091,.12)}
 for(const v of [-.68,-.4,-.12,.16,.44,.72])box(leaf,.055,.006,.13,creaseMat,.054,.088,v);
 }
 back.position.set(0,.08,-D/2);
 const s=new T.Shape();s.moveTo(-W/2,0);s.lineTo(W/2,0);
 for(const [x,dir,levels] of [[W/2,1,[.47,2.09]]]){
 for(const v of levels){s.lineTo(x,v);s.lineTo(x+dir*.145,v);s.quadraticCurveTo(x+dir*.27,v+.02,x+dir*.26,v+.105);s.lineTo(x+dir*.22,v+.29);s.lineTo(x,v+.29)}
 }
 s.lineTo(W/2,H-.04);s.quadraticCurveTo(W/2,H+.12,W/2-.16,H+.12);s.lineTo(-W/2+.16,H+.12);s.quadraticCurveTo(-W/2,H+.12,-W/2,H-.04);
 for(const v of [2.09,.47]){s.lineTo(-W/2,v+.29);s.lineTo(-W/2-.22,v+.29);s.lineTo(-W/2-.26,v+.105);s.quadraticCurveTo(-W/2-.27,v+.02,-W/2-.145,v);s.lineTo(-W/2,v)}
 s.closePath();back.userData.board=slab(back,s,.09);
 // A folded piece of striped paper forms a small scalloped awning.
 const awning=group(back);awning.position.set(0,.095,-H+.02);
 const n=9,sw=(W+.18)/n;
 for(let i=0;i<n;i++){const xx=-(W+.18)/2+i*sw;
 const a=new T.Shape();a.moveTo(xx,.19);a.lineTo(xx+sw,.19);a.lineTo(xx+sw,-.27);a.bezierCurveTo(xx+sw,-.44,xx,-.44,xx,-.27);a.closePath();
 const o=slab(awning,a,.027,i%2?ivory:coral,i%2?ivory:coral,.002);o.rotation.x=-PI/2+.09;
 }
 for(const x of [-.97,.97]){cyl(back,.046,.046,.012,mat(0xb18c60),x,.106,-H+.01,20)}
 for(const x of [-W/2,W/2]){box(root,.052,.024,D,creaseMat,x,.084,0)}
 box(root,W,.028,.052,creaseMat,0,.084,-D/2);
 front.position.set(0,.07,D/2);
 const f=new T.Shape();
 f.moveTo(-W/2,0);f.lineTo(-.63,0);f.lineTo(-.63,-.53);f.quadraticCurveTo(-.63,-.78,-.40,-.78);
 f.lineTo(.40,-.78);f.quadraticCurveTo(.63,-.78,.63,-.53);f.lineTo(.63,0);f.lineTo(W/2,0);
 f.lineTo(W/2,-1.04);f.quadraticCurveTo(W/2,-1.12,W/2-.10,-1.12);f.lineTo(-W/2+.10,-1.12);
 f.quadraticCurveTo(-W/2,-1.12,-W/2,-1.04);f.closePath();roundHole(f,0,-.99,.112);slab(front,f,.085);
 const tongue=plate(root,1.21,.55,.046,ivory,.07,0,.093,D/2+.12);
 tongue.rotation.x=.045;
 return {root,left,right,back,front,awning,W,D,H};
}
function makeRamp(p){
 const g=group(p),s=new T.Shape(),w=1.19,d=.44;
 s.moveTo(-w,-d);s.lineTo(w,-d);s.lineTo(w,-.29);s.lineTo(w+.17,-.29);s.lineTo(w+.17,.29);s.lineTo(w,.29);s.lineTo(w,d);s.lineTo(-w,d);s.lineTo(-w,.29);s.lineTo(-w-.17,.29);s.lineTo(-w-.17,-.29);s.lineTo(-w,-.29);s.closePath();slab(g,s,.09);
 plate(g,w*2-.08,.069,.102,card,.021,0,.085,-d+.045);
 plate(g,.96,.052,.066,card,.019,0,.085,d-.034);
 for(const x of [-1.15,1.15])box(g,.018,.007,.61,creaseMat,x,.093,0);
 return g;
}
function makeWheel(p){
 const g=group(p),s=new T.Shape(),r=.88,a=.388;
 for(let i=0;i<=110;i++){const t=PI/2+a+(TAU-2*a)*i/110,x=r*Math.cos(t),y=r*Math.sin(t);if(i===0)s.moveTo(x,y);else s.lineTo(x,y)}
 s.bezierCurveTo(.31,.40,-.31,.40,-r*Math.sin(a),r*Math.cos(a));s.closePath();roundHole(s,0,0,.12);
 // The recess has a floor and two thick corrugated cheeks.
 const core=group(g);
 const back=slab(core,s,.07,ivory);back.rotation.x=0;back.position.z=-.13;
 const mid=slab(core,s,.18,card);mid.rotation.x=0;mid.position.z=-.06;
 const face=slab(core,s,.05,card);face.rotation.x=0;face.position.z=.12;
 const ax=ring(core,.205,.038,ivory,0,0,.18);ax.rotation.x=0;
 for(let i=0;i<3;i++){const t=TAU*i/3+.32;const b=cyl(core,.043,.043,.017,kraftDark,.57*Math.sin(t),.57*Math.cos(t),.186,16);b.rotation.x=PI/2}
 return g;
}
function makeHandle(p){
 const g=group(p);
 function axial(rt,rb,h,m,x,y,z){const a=cyl(g,rt,rb,h,m,x,y,z);a.rotation.x=PI/2;return a}
 axial(.096,.096,.88,wood,0,0,-.27);axial(.247,.25,.16,ivory,0,0,.16);
 const s=roundedPath(-.177,-.16,.354,.87,.17);const a=slab(g,s,.105,coral,edge,.016);a.rotation.x=0;a.position.z=.23;
 axial(.094,.094,.024,wood,0,0,.36);
 axial(.085,.09,.18,wood,0,.53,.38);
 const handle=mesh(g,new T.LatheGeometry([[0,0],[.09,0],[.135,.035],[.147,.085],[.143,.24],[.126,.3],[.095,.32],[0,.32]].map(q=>new T.Vector2(...q)),40),mint,0,.53,.42);handle.rotation.x=PI/2;
 for(const z of [.5,.55,.60,.65]){const r=ring(g,.145,.006,mat(0x79a596),0,.53,z);r.rotation.x=0}
 return g;
}
function makeWindow(p){
 const g=group(p),s=new T.Shape();
 s.moveTo(-1.13,-.96);s.lineTo(-.16,-.96);s.lineTo(-.16,-.63);s.quadraticCurveTo(-.16,-.47,0,-.47);
 s.quadraticCurveTo(.16,-.47,.16,-.63);s.lineTo(.16,-.96);s.lineTo(1.13,-.96);
 s.quadraticCurveTo(1.19,-.96,1.19,-.90);s.lineTo(1.19,.89);s.quadraticCurveTo(1.19,.96,1.12,.96);
 s.lineTo(-1.12,.96);s.quadraticCurveTo(-1.19,.96,-1.19,.89);s.lineTo(-1.19,-.90);s.quadraticCurveTo(-1.19,-.96,-1.13,-.96);
 const window=slab(g,s,.034,standardGlass,glassEdge,.006);window.rotation.x=0;window.castShadow=false;window.renderOrder=4;
 const bar=plate(g,2.42,.13,.097,mint,.056,0,.93,.013,mint);
 const brow=box(g,2.16,.017,.014,ivory,0,.971,.087);
 for(const x of [-1.177,1.177]){const rail=box(g,.021,1.82,.027,glassEdge,x,0,.03);rail.castShadow=false}
 for(const [x,y,h] of [[-.98,.18,.54],[-.90,.39,.26],[1.02,-.45,.23]]){
 const geo=new T.PlaneGeometry(.015,h);const sh=mesh(g,geo,glint,x,y,.05);sh.rotation.z=-.28;sh.castShadow=false;sh.renderOrder=5;
 }return g;
}
function makeTray(p){
 const g=group(p);plate(g,2.83,1.37,.06,ivory,.17);
 const lining=canvasTexture(128,128,(c)=>{c.fillStyle='#f1dec1';c.fillRect(0,0,128,128);c.fillStyle='rgba(201,128,94,.29)';c.fillRect(0,0,32,128);c.fillRect(0,0,128,32);c.fillStyle='rgba(192,120,84,.18)';c.fillRect(38,0,4,128);c.fillRect(0,38,128,4)});lining.repeat.set(2.45,2.45);
 plate(g,2.62,1.19,.012,mat(0xffffff,{map:lining}),.09,0,.065,0,ivory);
 for(const z of [-.66,.66]){const bar=plate(g,2.82,.055,.155,ivory,.025,0,.055,z);bar.rotation.x=z*.19}
 for(const x of [-1.39,1.39]){const bar=plate(g,.063,1.3,.168,ivory,.025,x,.053,0);bar.rotation.z=-x*.08}
 return g;
}
const shellColors=[0xe89d9c,0x91bda7,0xe8c16e];
function makeCup(p,i){
 const g=group(p),r=.342,m=mat(shellColors[i],{roughness:.29,metalness:.02});
 const profile=[];for(let j=0;j<=20;j++){const t=j/20*PI/2;profile.push(new T.Vector2(Math.max(.001,r*Math.sin(t)),-r*Math.cos(t)))}
 for(let j=20;j>=0;j--){const t=j/20*PI/2;profile.push(new T.Vector2(Math.max(.001,(r-.029)*Math.sin(t)),-(r-.029)*Math.cos(t)))}
 mesh(g,new T.LatheGeometry(profile,56),m);
 ring(g,r-.012,.018,m,0,.001,0);ring(g,r-.005,.007,m,0,-.046,0);
 return g;
}
function makeLid(p){
 const g=group(p),r=.347;
 const o=mesh(g,new T.SphereGeometry(r,48,24,0,TAU,0,PI/2),standardGlass);o.castShadow=false;o.renderOrder=3;
 const rim=ring(g,r-.009,.012,glassEdge,0,.002,0);rim.castShadow=false;
 for(const [yaw,a,b,w] of [[-.68,.42,1.01,.018],[-.5,.56,.93,.011],[2.34,.62,1.14,.008]]){
 const pts=[];for(let j=0;j<=8;j++){const t=lerp(a,b,j/8),h=yaw+t*.18;pts.push(vec((r+.002)*Math.sin(t)*Math.sin(h),(r+.002)*Math.cos(t),(r+.002)*Math.sin(t)*Math.cos(h)))}
 const o=line(g,pts,w,glint);o.renderOrder=4;o.castShadow=false;
 }return g;
}
function makePrize(p,i){
 const g=group(p);
 if(i===0){
 const rubber=mat(0xe89c9d,{map:paperTex,roughness:.91});
 plate(g,.45,.245,.21,rubber,.055,0,-.112,0,rubber);
 const wrapper=mat(0xf1dfbc,{map:paperTex});plate(g,.185,.252,.217,wrapper,.017,-.04,-.114,0,wrapper);
 for(const x of [-.11,.029]){box(g,.007,.004,.23,coral,x,.122,0)}
 }else if(i===1){
 const wrapper=mat(0xf2d29b,{map:paperTex});
 plate(g,.39,.32,.19,wrapper,.045,0,-.103,0,wrapper);
 for(const k of [-1,1]){
 const hinge=group(g);hinge.position.set(0,.099,-k*.14);
 const a=new T.Shape();a.moveTo(-.184,0);a.lineTo(.184,0);a.lineTo(.024,-k*.184);a.closePath();
 slab(hinge,a,.006,ivory,ivory,.002);if(k===1)g.userData.flap=hinge;
 }
 const cord=mat(0xae7652);
 for(const x of [-.028,.023]){line(g,[vec(x,-.09,.15),vec(x,.094,.16),vec(x,.113,.13),vec(x,.114,-.13),vec(x,.093,-.16),vec(x,-.09,-.15)],.009,cord)}
 line(g,[vec(-.16,.11,-.04),vec(0,.118,-.04),vec(.17,.11,-.04)],.009,cord);
 }else{
 const profile=[[0,-.244],[.029,-.216],[.051,-.148],[.115,-.105],[.19,-.05],[.216,.005],[.213,.04],[.176,.078],[.077,.106],[.04,.119],[.04,.217],[.031,.237],[0,.239]];
 mesh(g,new T.LatheGeometry(profile.map(q=>new T.Vector2(...q)),64),wood);
 ring(g,.211,.012,coral,0,.028,0);ring(g,.202,.009,mint,0,-.019,0);
 }return g;
}
function makeNest(p){
 const g=group(p),s=roundedPath(-1.54,-.53,3.08,1.06,.12);
 for(const x of [-.94,0,.94])roundHole(s,x,0,.252);
 slab(g,s,.12,ivory);for(const x of [-1.35,1.35]){plate(g,.16,.80,.10,card,.035,x,-.094,0)}
 return g;
}
function decorPlant(p){
 const g=group(p),ceramic=mat(0xe6d9bd,{roughness:.48});
 const shape=[[0,0],[.44,0],[.48,.05],[.59,.66],[.61,.72],[.59,.78],[.53,.78],[.51,.67]];
 mesh(g,new T.LatheGeometry(shape.map(q=>new T.Vector2(...q)),52),ceramic);
 cyl(g,.52,.51,.04,mat(0x67513c),0,.68,0);
 const leaves=[0x779266,0x869c70,0x627e56,0x9ca776].map(x=>mat(x,{side:T.DoubleSide}));
 for(let j=0;j<19;j++){
 const dir=j*2.4,a=.45+noise()*.5,h=.9+noise()*.86;
 const start=vec(0,.69,0),base=vec(Math.cos(dir)*a*.45,h,Math.sin(dir)*a*.45);
 const end=vec(Math.cos(dir)*a*1.36,h+.10+noise()*.46,Math.sin(dir)*a*1.36);
 rod(g,start,base,.014,leaves[j%4],6);
 const pts=[],idx=[],side=vec(-Math.sin(dir),0,Math.cos(dir));for(let k=0;k<=9;k++){const t=k/9,mid=base.clone().lerp(end,t);mid.y+=.17*Math.sin(t*PI);const w=.20*Math.pow(Math.sin(PI*t),.8);for(const n of [-1,0,1]){const v=mid.clone().addScaledVector(side,w*n);v.y-=Math.abs(n)*w*.4;pts.push(v.x,v.y,v.z)}if(k){const b=k*3;idx.push(b-3,b,b-2,b-2,b,b+1,b-2,b+1,b-1,b-1,b+1,b+2)}}
 const geo=new T.BufferGeometry();geo.setAttribute('position',new T.Float32BufferAttribute(pts,3));geo.setIndex(idx);geo.computeVertexNormals();mesh(g,geo,leaves[j%4]);
 } return g;
}
function makeTape(p){
 const g=group(p);const s=new T.Shape();s.absarc(0,0,.49,0,TAU);roundHole(s,0,0,.30);
 slab(g,s,.30,ivory,mat(0xd9b989),.01);
 for(let i=0;i<5;i++)ring(g,.33+i*.029,.003,mat(0xd2b891),0,.315,0);
 const tail=plate(g,.31,.47,.013,ivory,.013,.25,.01,.45,ivory);tail.rotation.z=.08;return g;
}
function pencil(p,m){
 const g=group(p);
 const shaft=cyl(g,.065,.065,2.35,m,0,0,0,6);shaft.rotation.z=PI/2;
 const tip=cyl(g,0,.065,.25,wood,-1.3,0,0,6);tip.rotation.z=PI/2;
 const lead=cyl(g,0,.022,.077,mat(0x514a42),-1.414,0,0,6);lead.rotation.z=PI/2;
 const end=cyl(g,.064,.064,.09,ivory,1.18,0,0);end.rotation.z=PI/2;
 return g;
}
