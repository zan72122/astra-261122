'use strict';
const Sound = (() => {
  let ctx,bus,noise,rub,band,level,pan;
  function start(){
    if(ctx){if(ctx.state==='suspended')ctx.resume().catch(()=>{});return;}
    const AC=window.AudioContext||window.webkitAudioContext;if(!AC)return;
    ctx=new AC();bus=ctx.createGain();bus.gain.value=.46;bus.connect(ctx.destination);
    noise=ctx.createBuffer(1,ctx.sampleRate*2,ctx.sampleRate);const a=noise.getChannelData(0);
    let prev=0;for(let i=0;i<a.length;i++){prev=prev*.58+(Math.random()*2-1)*.42;a[i]=prev;}
    rub=ctx.createBufferSource();rub.buffer=noise;rub.loop=true;band=ctx.createBiquadFilter();band.type='bandpass';band.Q.value=.9;band.frequency.value=380;
    level=ctx.createGain();level.gain.value=0;rub.connect(band);band.connect(level);
    pan=ctx.createStereoPanner?ctx.createStereoPanner():ctx.createGain();level.connect(pan);pan.connect(bus);rub.start();ctx.resume().catch(()=>{});
  }
  function rubAt(speed,where=0){
    if(!ctx)return;const t=ctx.currentTime,s=Math.min(2,Math.abs(speed));
    band.frequency.setTargetAtTime(300+s*718,t,.055);level.gain.setTargetAtTime(Math.min(.16,s*.15),t,.046);
    rub.playbackRate.setTargetAtTime(.55+s*.8,t,.07);if(pan.pan)pan.pan.setTargetAtTime(where,t,.04);
  }
  function tap(kind='wood',strength=1,stereo=0){
    if(!ctx)return;const t=ctx.currentTime,modes={
      wood:[[520,.048,.28],[903,.035,.13],[166,.081,.24]],
      slide:[[238,.079,.23],[452,.047,.10]],
      dish:[[1085,.18,.13],[1717,.11,.07],[2380,.15,.035]],
      drip:[[1040,.108,.14],[1730,.064,.07]],
      seed:[[1570,.025,.025],[820,.031,.04]],
      thread:[[438,.074,.14],[786,.033,.09]]
    };
    const outlet=ctx.createStereoPanner?ctx.createStereoPanner():ctx.createGain();if(outlet.pan)outlet.pan.value=stereo;outlet.connect(bus);
    const list=modes[kind]||modes.wood;
    list.forEach(([freq,duration,amp],i)=>{
      const osc=ctx.createOscillator(),env=ctx.createGain();osc.type=kind==='wood'&&i===1?'triangle':'sine';
      osc.frequency.setValueAtTime(freq*(.98+Math.random()*.04),t);
      osc.frequency.exponentialRampToValueAtTime(freq*(kind==='drip'?1.65:.87),t+duration);
      env.gain.setValueAtTime(.00001,t);env.gain.exponentialRampToValueAtTime(Math.max(.00002,amp*strength),t+.003);
      env.gain.exponentialRampToValueAtTime(.00001,t+duration);osc.connect(env);env.connect(outlet);osc.start(t);osc.stop(t+duration+.005);
      osc.onended=()=>{osc.disconnect();env.disconnect();if(i===0)setTimeout(()=>outlet.disconnect(),340);};
    });
  }
  return {start,rubAt,tap};
})();
