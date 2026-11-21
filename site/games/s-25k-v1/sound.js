'use strict';
const TimberSound=(()=>{
  let ctx,master,noise,rolling,filter,rollGain,pan,resonance;
  function wake(){
    if(!ctx){
      const AC=window.AudioContext||window.webkitAudioContext;if(!AC)return;
      ctx=new AC();master=ctx.createGain();master.gain.value=.52;master.connect(ctx.destination);
      noise=ctx.createBuffer(1,ctx.sampleRate*1.3,ctx.sampleRate);
      const data=noise.getChannelData(0);let prev=0;
      for(let i=0;i<data.length;i++){prev=.41*prev+.59*(Math.random()*2-1);data[i]=prev;}
      rolling=ctx.createBufferSource();rolling.buffer=noise;rolling.loop=true;
      filter=ctx.createBiquadFilter();filter.type='bandpass';filter.Q.value=1.7;
      rollGain=ctx.createGain();rollGain.gain.value=0;
      pan=ctx.createStereoPanner?ctx.createStereoPanner():ctx.createGain();
      rolling.connect(filter);filter.connect(rollGain);rollGain.connect(pan);pan.connect(master);rolling.start();
      resonance=ctx.createDelay(.25);resonance.delayTime.value=.062;const decay=ctx.createGain();decay.gain.value=.19;
      resonance.connect(decay);decay.connect(master);
    }
    if(ctx.state==='suspended')ctx.resume().catch(()=>{});
  }
  function tap(freq=360,power=.32,soft=false,echo=false){
    if(!ctx)return;const t=ctx.currentTime;
    for(const [f,vol,len] of [[freq,1,.093],[freq*2.73,.26,.045],[freq*4.12,.11,.025]]){
      const osc=ctx.createOscillator(),g=ctx.createGain();osc.type='sine';osc.frequency.setValueAtTime(f,t);osc.frequency.exponentialRampToValueAtTime(f*.86,t+len);
      g.gain.setValueAtTime(.0001,t);g.gain.exponentialRampToValueAtTime(Math.max(.001,power*vol*(soft?.28:.55)),t+.002);
      g.gain.exponentialRampToValueAtTime(.0001,t+len*(soft?.75:1.25));osc.connect(g);g.connect(master);if(echo)g.connect(resonance);osc.start(t);osc.stop(t+len*1.3+.01);
    }
  }
  function roll(speed,material,x,time){
    if(!ctx)return;const t=ctx.currentTime,spiral=material==='spiral',soft=material==='tray'||material==='ground';
    filter.frequency.setTargetAtTime((soft?130:280)+speed*(spiral?190:138),t,.045);
    filter.Q.setTargetAtTime(spiral?3.5:1.5,t,.06);
    rolling.playbackRate.setTargetAtTime(.45+speed*.17,t,.09);
    rollGain.gain.setTargetAtTime(Math.min(.18,speed*.031)*(soft?.35:.84)*(1+.17*Math.sin(time*(12+speed*18))),t,.035);
    if(pan.pan)pan.pan.setTargetAtTime(Math.max(-.82,Math.min(.82,x*.12)),t,.06);
  }
  return {wake,tap,roll};
})();
