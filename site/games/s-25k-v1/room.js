'use strict';
const Workshop=(()=>{
  const {T,v,m,surface,wood,group,mesh,block,cyl,orb,lathe,shadow,rand}=Craft;
  function environment(renderer,scene) {
    const c=document.createElement('canvas');c.width=512;c.height=256;
    const g=c.getContext('2d'),bg=g.createLinearGradient(0,0,0,256);
    bg.addColorStop(0,'#efeadb');bg.addColorStop(.57,'#dacfaf');bg.addColorStop(.65,'#89725a');bg.addColorStop(1,'#685243');g.fillStyle=bg;g.fillRect(0,0,512,256);
    g.fillStyle='#fffcf2';for(let i=0;i<3;i++)for(let j=0;j<2;j++)g.fillRect(63+i*30,41+j*35,27,32);
    g.fillStyle='#696150';g.fillRect(309,75,60,70);
    const env=new T.CanvasTexture(c);env.colorSpace=T.SRGBColorSpace;env.mapping=T.EquirectangularReflectionMapping;
    const pmrem=new T.PMREMGenerator(renderer);const baked=pmrem.fromEquirectangular(env);scene.environment=baked.texture;scene.environmentIntensity=.37;env.dispose();pmrem.dispose();
  }
  function plant(parent,x,z) {
    const g=group(parent);g.position.set(x,-.24,z);
    shadow(g,.06,.06,2.04,1.75,-.06);
    lathe(g,[[.01,0],[.38,0],[.44,.05],[.53,.74],[.53,.81],[.50,.87],[.44,.85],[.423,.74]],surface(0xc68161,.8));
    cyl(g,.433,.038,surface(0x664c37),0,.762,0);
    const leafMats=[0x718b62,0x8d9d73,0x667e5e].map(c=>surface(c,.73,{side:T.DoubleSide}));
    for(let j=0;j<13;j++){
      const a=j*2.4, r=.24+rand()*.45,h=1.07+rand()*.79, from=v(.06*Math.cos(a),.78,.06*Math.sin(a)),to=v(r*Math.cos(a),h,r*Math.sin(a));
      Craft.dowel(g,from,to,.015,m.darkGreen);
      const geo=new T.BufferGeometry(),pos=[],idx=[];
      for(let k=0;k<=10;k++){const f=k/10,w=Math.sin(Math.PI*f)**.7*.145;for(const side of [-1,0,1])pos.push(f*.49,Math.sin(f*Math.PI)*.12+f*.12-Math.abs(side)*w*.25,side*w);
        if(k<10){let b=k*3;idx.push(b,b+3,b+1,b+1,b+3,b+4,b+1,b+4,b+2,b+2,b+4,b+5);}}
      geo.setAttribute('position',new T.Float32BufferAttribute(pos,3));geo.setIndex(idx);geo.computeVertexNormals();
      const leaf=mesh(g,geo,leafMats[j%3],to.x,to.y,to.z);leaf.rotation.y=-a;leaf.rotation.z=.2+rand()*.45;
    }
  }
  function make(scene,board,w,d,portrait) {
    const tableW=w+4.7,tableD=d+2.35;
    block(scene,tableW,.50,tableD,.48,m.desk,0,-.83,0,.10);
    block(scene,tableW-.13,.11,tableD-.14,.41,m.edge,0,-.86,0,.035);
    // Real edge mouldings and tiny corner pegs on the removable cork board.
    block(board,w+.17,.195,d+.17,.43,m.edge,0,-.319,0,.044);
    block(board,w+.15,.125,d+.15,.425,m.birch,0,-.168,0,.039);
    block(board,w,.118,d,.38,m.cork,0,-.118,0,.044);
    for(const x of [-1,1])for(const z of [-1,1]){
      const px=x*(w/2-.24),pz=z*(d/2-.24);
      cyl(board,.053,.009,m.edge,px,.002,pz);cyl(board,.031,.01,m.brass,px,.004,pz);
    }
    const cream=surface(0xddd9bb,.95),frame=surface(0xe8dec7,.66),mint=surface(0xa2b5a0,.88);
    block(scene,46,18,.22,.06,cream,0,-3,-d/2-3.8);
    block(scene,42,.18,40,.12,mint,0,-3.23,0);
    const wallz=-d/2-3.54;
    block(scene,10.8,6.6,.17,.05,frame,-4,.26,wallz);
    const outdoors=surface(0xcbd9c1,1,{emissive:0xe8f1dc,emissiveIntensity:.36});
    block(scene,10.4,6.2,.10,.03,outdoors,-4,.44,wallz+.1);
    for(const x of [-7.46,-4,-.54])block(scene,.11,6.28,.17,.02,frame,x,.42,wallz+.2);
    block(scene,10.54,.12,.21,.025,frame,-4,3.45,wallz+.19);
    block(scene,11,.18,.63,.055,m.birch,-4,.22,wallz+.19);
    for(const x of [-1,1])for(const z of [-1,1])block(scene,.56,2.5,.60,.09,m.desk,x*(tableW/2-.8),-3.25,z*(tableD/2-.8));
    plant(scene,-w/2-.58,-d/2-.24);
    // A low wooden parts box at the far corner of the table.
    const box=group(scene);box.position.set(w/2+.42,-.328,-d/2-.30);box.rotation.y=-.16;
    block(box,1.52,.13,.91,.12,m.edge);
    for(const x of [-.70,.70])block(box,.13,.48,.92,.04,m.maple,x,0,0);
    for(const z of [-.40,.40])block(box,1.43,.44,.115,.035,m.maple,0,0,z);
    for(let j=0;j<4;j++){let k=cyl(box,.117,.91,m.birch,-.12+rand()*.26,.21+j*.042,-.23+j*.13);k.rotation.z=1.45+rand()*.18;}
    // Narrow bands of shade on the timber come from the off-camera window sash.
    const light=new T.DirectionalLight(0xffe9c6,2.75);light.position.set(-7,12,-4);light.target.position.set(0,0,0);
    light.castShadow=true;const dSh=portrait?10:10.6;
    Object.assign(light.shadow.camera,{left:-dSh,right:dSh,top:dSh,bottom:-dSh,near:.2,far:35});
    light.shadow.mapSize.set(2048,2048);light.shadow.normalBias=.018;light.shadow.bias=-.00024;light.shadow.radius=3;
    scene.add(light,light.target,new T.HemisphereLight(0xf4f2e2,0xb38c6c,1.55));
    const fill=new T.DirectionalLight(0xfff2da,.46);fill.position.set(4,6,7);scene.add(fill);
    const blind=surface(0xb5aa8e);blind.colorWrite=false;blind.depthWrite=false;
    for(let j=0;j<3;j++){const slat=block(scene,.115, .09,22,.025,blind,-10+j*5.7,7.8,-3);
      slat.rotation.y=.34;slat.receiveShadow=false;}
  }
  function marble(parent,r) {
    const g=group(parent),c=document.createElement('canvas');c.width=512;c.height=256;
    const cx=c.getContext('2d');cx.fillStyle='#f5f2e4';cx.fillRect(0,0,512,256);
    for(let i=0;i<512;i++){
      const y=122+Math.sin(i/512*Math.PI*2+.35)*32;
      cx.fillStyle='#427596';cx.fillRect(i,y,1,4.9);cx.fillStyle='#5d97b2';cx.fillRect(i,y+4.9,1,1.7);
      cx.fillStyle='#8aafbd';cx.fillRect(i,y-3.0,1,1.05);
    }
    const map=new T.CanvasTexture(c);map.colorSpace=T.SRGBColorSpace;
    const glass=new T.MeshPhysicalMaterial({map,roughness:.145,metalness:.018,clearcoat:1,clearcoatRoughness:.075,envMapIntensity:.83,ior:1.49});
    mesh(g,new T.SphereGeometry(r,48,36),glass);return g;
  }
  return {environment,make,marble};
})();
