'use strict';
const Kit = (() => {
  const {T,TAU,v,m,group,mesh,block,ring,cyl,dowel,lathe,orb,shadow,wood,surface}=Craft;
  const clamp=T.MathUtils.clamp, mix=T.MathUtils.lerp;
  const rim=.455;
  // This cross section is swept along the same path sampled by the marble.
  const section=[[-.455,-.105],[-.455,.135],[-.442,.174],[-.411,.19],[-.348,.19],[-.321,.172],[-.298,.095],[-.268,.041],[-.209,.012],[-.12,0],[.12,0],[.209,.012],[.268,.041],[.298,.095],[.321,.172],[.348,.19],[.411,.19],[.442,.174],[.455,.135],[.455,-.105],[.435,-.14],[-.435,-.14]];
  function path(p,t) {
    let x,z,a;
    if(p.kind==='spiral') {
      a=t*TAU; x=.91*Math.sin(a);z=.91*(1-Math.cos(a));
    } else if(p.kind==='bend') {
      a=t*p.arc;x=1.29*Math.sin(a);z=1.29*(1-Math.cos(a));
    } else {x=t*p.len;z=0;a=0;}
    return {x,z,a,y:mix(p.h0,p.h1,t)};
  }
  function world(p,t,lateral=0) {
    const s=path(p,t),c=Math.cos(p.angle),d=Math.sin(p.angle),a=p.angle+s.a;
    return {x:p.x+s.x*c-s.z*d-lateral*Math.sin(a),y:s.y+p.lift,z:p.z+s.x*d+s.z*c+lateral*Math.cos(a),a};
  }
  function geo(p) {
    const steps=p.kind==='spiral'?100:p.kind==='bend'?32:4;
    const pos=[],uv=[],indices=[],groups=[[],[],[]];
    const faces=section.length;
    for(let j=0;j<faces;j++) {
      const k=(j+1)%faces,idx=j*(steps+1)*2;
      const mat=j===0||j>=18?2:(j>=2&&j<=4||j>=14&&j<=16)?1:0;
      for(let i=0;i<=steps;i++){
        const s=path(p,i/steps);
        for(const [d,h] of [section[j],section[k]]) {
          pos.push(s.x-d*Math.sin(s.a),s.y+h,s.z+d*Math.cos(s.a));
          uv.push(p.len*i/steps,d+h*1.5);
        }
        if(i<steps) {
          const b=idx+i*2;groups[mat].push(b,b+1,b+2,b+2,b+1,b+3);
        }
      }
    }
    for(const t of [0,1]){
      const s=path(p,t),start=pos.length/3;
      for(const [d,h] of section){pos.push(s.x-d*Math.sin(s.a),s.y+h,s.z+d*Math.cos(s.a));uv.push(d,h);}
      const triangles=T.ShapeUtils.triangulateShape(section.map(q=>new T.Vector2(q[0],q[1])),[]);
      for(const tri of triangles)for(const i of (t?tri.slice().reverse():tri))groups[2].push(start+i);
    }
    const g=new T.BufferGeometry();g.setAttribute('position',new T.Float32BufferAttribute(pos,3));g.setAttribute('uv',new T.Float32BufferAttribute(uv,2));
    for(let i=0;i<3;i++){g.addGroup(indices.length,groups[i].length,i);indices.push(...groups[i]);}
    g.setIndex(indices);g.computeVertexNormals();return g;
  }
  function support(p,t,paint) {
    const s=path(p,t),g=group(p.root);g.position.set(s.x,0,s.z);
    g.rotation.y=-s.a;
    shadow(g,0,0,1.17,1.26,.013);
    const foot=block(g,.65,.115,.87,.18,paint,0,0,0);
    const sleeve=cyl(g,.18,1,m.green,0,.3,0);
    const collar=lathe(g,[[.162,0],[.197,.018],[.196,.073],[.178,.087]],m.jade);
    const stem=cyl(g,.13,1,m.birch);
    const saddle=block(g,.32,.12,.86,.06,m.walnut);
    const pin=dowel(g,v(0,0,-.45),v(0,0,.45),.071,m.brass);
    const housing=Math.min(.76,Math.max(.09,(s.y-.25)*.58));
    p.supports.push({t,g,foot,sleeve,collar,stem,saddle,pin,housing});
  }
  function knobs(p) {
    for(let end=0;end<2;end++) {
      const s=path(p,end),g=group(p.root);
      g.position.set(s.x,0,s.z);g.rotation.y=-s.a;
      const pivot=group(g);pivot.position.set(end?-.11:.11,-.025,.472);pivot.rotation.x=Math.PI/2;
      lathe(pivot,[[.001,-.05],[.13,-.05],[.155,-.022],[.157,.048],[.139,.078],[.113,.088],[.001,.088]],p.kind==='launch'?m.green:m.rust);
      cyl(pivot,.056,.016,m.brass,0,.093,0);
      const knobPick=orb(pivot,.243,m.ivory,0,.025,0);knobPick.visible=false;knobPick.userData.pick=true;
      g.userData.action={type:'handle',p,end};p.handles.push(g);
    }
  }
  function wheel(p) {
    const s=group(p.root);s.position.x=p.len*.51;p.mechanism=s;
    for(const side of [-1,1]){
      const z=side*.50;
      block(s,.78,.16,.20,.067,m.green,0,-.08,z);
      dowel(s,v(-.31,-.016,z),v(0,.68,z),.081,m.jade);
      dowel(s,v(.31,-.016,z),v(0,.68,z),.081,m.jade);
      const washer=cyl(s,.135,.083,m.green,0,.69,z);washer.rotation.x=Math.PI/2;
    }
    const rotor=group(s);rotor.position.y=.69;p.rotor=rotor;
    const bladeMats=[m.walnut,wood(0xe2a569),wood(0xeabd81),wood(0xd99560),m.maple,wood(0xe9ad73)];
    for(let i=0;i<6;i++){
      const g=group(rotor);g.rotation.z=i*TAU/6;
      block(g,.106,.47,.60,.042,bladeMats[i],.033,.14,0,.025);
      for(const sign of [-1,1]){
        block(g,.086,.44,.066,.028,m.edge,0,.026,sign*.292,.017);
        const peg=cyl(g,.035,.015,m.brass,0,.41,sign*.337);peg.rotation.x=Math.PI/2;
      }
    }
    for(const sign of [-1,1]){
      const tor=mesh(rotor,new T.TorusGeometry(.418,.031,9,48),m.edge,0,0,.295*sign);
      tor.castShadow=true;
    }
    const hub=cyl(rotor,.158,.72,m.maple);hub.rotation.x=Math.PI/2;
    const axle=cyl(s,.077,1.16,m.brass,0,.69,0);axle.rotation.x=Math.PI/2;
    for(const sign of [-1,1])orb(s,.084,m.brass,0,.69,.582*sign).scale.z=.52;
  }
  function spiral(p) {
    const g=group(p.root);g.position.z=.91;
    lathe(g,[[.01,0],[.34,0],[.38,.04],[.38,.13],[.34,.18],[.239,.18]],m.green);
    p.mast=cyl(g,.202,1,m.birch);
    p.cap=lathe(g,[[.194,0],[.239,.03],[.24,.105],[.223,.135],[.15,.158],[.001,.166]],m.rust);
    p.arms=[];
    for(let i=0;i<8;i++){
      const t=(i+.34)/8,s=path(p,t);
      const arm=dowel(p.root,v(0,0,.91),v(s.x,0,s.z),.061,m.edge);p.arms.push({arm,t});
    }
    p.splices=[];
    for(let i=1;i<12;i++) {
      const s=path(p,i/12),g=group(p.root);g.position.set(s.x,s.y,s.z);g.rotation.y=-s.a;
      // Small inset pins mark the joints of the bent, laminated rail.
      for(const d of [-.383,.383])cyl(g,.021,.009,m.brass,0,.193,d);
      p.splices.push({g,t:i/12});
    }
  }
  function launch(p) {
    const g=group(p.root);g.position.set(.04,p.h0,0);p.cradle=g;
    // A turned cup with a shallow concave seat. Its open front feeds into the groove.
    const geo=new T.LatheGeometry([[.001,-.069],[.42,-.069],[.47,-.015],[.48,.057],[.461,.092],[.396,.101],[.3,.057],[.18,.018],[.001,.012]].map(q=>new T.Vector2(...q)),64);
    mesh(g,geo,m.maple);
    const tower=group(p.root);tower.position.x=.24;
    block(tower,.96,.15,1.03,.16,m.green);
    p.posts=[];
    for(const z of [-.287,.287]){
      const post=block(tower,.25,p.h0-.22,.22,.065,m.jade,0,.13,z);
      block(tower,.281,.105,.254,.04,m.green,0,.26,z);
      const cap=block(tower,.301,.10,.263,.035,m.green,0,p.h0-.32,z);
      p.posts.push({post,cap,original:p.h0});
      cyl(tower,.062,.025,m.brass,.31,.16,z);
    }
    p.braces=[.22,.53,.82].map(frac=>({frac,bar:dowel(tower,v(0,p.h0*frac,-.29),v(0,p.h0*frac,.29),.057,m.edge)}));
    shadow(tower,0,0,1.85,1.85);
  }
  function piece(parent,kind,len,x,z,angle,h0,h1) {
    const p={kind,len,x,z,angle,h0,h1,lift:0,arc:1.07,root:group(parent),handles:[],supports:[],links:[null,null],wiggle:0,wheelV:0,wheelA:Math.random()*TAU,reach:.02,reachTarget:.02};
    if(kind==='spiral')p.len=.91*TAU;if(kind==='bend')p.len=1.29*p.arc;
    p.root.userData.action={type:'body',p};
    p.glaze=m.lip.clone();p.rail=mesh(p.root,geo(p),[m.maple,p.glaze,m.edge]);
    // The socket is set into the underside of each removable rail.
    const s=path(p,.16);
    p.socket=group(p.root);p.socket.position.set(s.x,s.y-.155,s.z+.22);
    p.socket.quaternion.setFromUnitVectors(v(0,1,0),v(-.12,-.42,.90).normalize());
    lathe(p.socket,[[.001,-.04],[.130,-.037],[.147,-.015],[.144,.065],[.125,.080],[.099,.080],[.088,.062],[.088,-.012]],m.edge);
    cyl(p.socket,.089,.013,m.shoe,0,-.014,0);
    p.tongue=group(p.root);
    block(p.tongue,1,.043,.47,.052,m.birch,.46,-.027,0,.015);
    if(kind==='spiral'){spiral(p);support(p,.96,m.green);}
    else {
      if(kind==='launch')launch(p);else support(p,.07,kind==='wheel'?m.green:m.jade);
      support(p,.93,m.green);
    }
    if(kind==='wheel')wheel(p);
    knobs(p);sync(p,true);return p;
  }
  function sync(p,rebuild=false) {
    p.root.position.set(p.x,0,p.z);p.root.rotation.y=-p.angle;
    const h0=p.h0,h1=p.h1;
    const changed=rebuild||p.last0!==h0||p.last1!==h1;
    if(changed){const old=p.rail.geometry;p.rail.geometry=geo(p);old.dispose();p.last0=h0;p.last1=h1;}
    p.rail.position.y=p.lift;
    const base=p.base||0;
    for(const r of p.supports) {
      const h=mix(h0,h1,r.t)+p.lift-base;
      r.g.position.y=base;
      const sleeve=Math.min(r.housing,Math.max(.07,h-.26));
      r.sleeve.position.y=.095+sleeve/2;r.sleeve.scale.y=sleeve;
      r.collar.position.y=.065+sleeve;
      const stem=Math.max(.042,h-.18-sleeve);
      r.stem.position.y=.075+sleeve+stem/2;r.stem.scale.y=stem;r.stem.rotation.z=p.wiggle*.16;
      r.saddle.position.y=h-.245;r.pin.position.y=h-.165;
    }
    for(let i=0;i<2;i++)p.handles[i].position.y=(i?h1:h0)+p.lift;
    const e=path(p,1);p.tongue.position.set(e.x,e.y+p.lift,e.z);p.tongue.rotation.set(0,-e.a,0);
    p.tongue.scale.x=p.reach;const neighbour=p.links[1]?.p;
    p.tongue.rotation.z=p.wiggle+Math.atan(neighbour?(neighbour.h1-neighbour.h0)/neighbour.len:(h1-h0)/p.len);
    p.socket.position.y=mix(h0,h1,.16)-.155+p.lift;
    if(p.mechanism){p.mechanism.position.y=mix(h0,h1,.51)+p.lift;p.rotor.rotation.z=p.wheelA;}
    if(p.mast){
      p.mast.scale.y=h0+.18;p.mast.position.y=(h0+.18)/2+p.lift;p.cap.position.y=h0+.15+p.lift;
      for(const {arm,t} of p.arms)arm.position.y=mix(h0,h1,t)-.20+p.lift;
      for(const {g,t} of p.splices)g.position.y=mix(h0,h1,t)+p.lift;
    }
    if(p.cradle){
      p.cradle.position.y=h0+p.lift;
      for(const {post,cap,original} of p.posts){post.scale.y=(h0-.22)/(original-.22);cap.position.y=h0-.32+p.lift;}
      for(const {frac,bar} of p.braces)bar.position.y=h0*frac;
    }
  }
  function tray(parent,x,z,a) {
    const root=group(parent);root.position.set(x,0,z);root.rotation.y=-a;
    const w=2.27,d=2.87;
    shadow(root,0,0,w+1,d+1);
    block(root,w,.19,d,.62,m.edge,0,.012,0,.047);
    block(root,w-.014,.105,d-.014,.61,m.maple,0,.164,0,.031);
    block(root,w-.19,.027,d-.19,.53,m.tray,0,.219,0,.010);
    const nap=Craft.fabricTop(root,w-.192,d-.192,.525,.273,m.tray);
    ring(root,w-.075,d-.075,.585,.272,.067,m.lip);
    ring(root,w-.244,d-.244,.51,.269,.014,m.padEdge);
    const grip=lathe(root,[[.001,0],[.105,0],[.133,.028],[.130,.078],[.105,.095],[.001,.095]],m.rust,0,.265,d/2-.016);
    const o={root,x,z,angle:a,w,d,marks:group(root),grip,nap};
    root.userData.action={type:'tray',tray:o};grip.userData.action={type:'trayTurn',tray:o};
    return o;
  }
  return {piece,sync,path,world,tray};
})();
