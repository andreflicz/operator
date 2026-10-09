// ============ SOUND ============
function soundOn(){ return state.profile.soundEnabled !== false; }
let sharedAudioCtx = null;
function getAudioCtx(){
  try{
    const Ctx = window.AudioContext||window.webkitAudioContext;
    if(!sharedAudioCtx || sharedAudioCtx.state==='closed'){ sharedAudioCtx = new Ctx(); }
    if(sharedAudioCtx.state==='suspended'){ sharedAudioCtx.resume().catch(function(){}); }
    return sharedAudioCtx;
  }catch(e){ return null; }
}
// Creating the AudioContext costs ~100ms; do it while idle after startup instead of on the
// first click that plays a sound (it starts suspended and is resumed on that click).
function warmAudio(){
  if(sharedAudioCtx || !soundOn()) return;
  try{ const Ctx = window.AudioContext||window.webkitAudioContext; if(Ctx) sharedAudioCtx = new Ctx(); }catch(e){}
}
function tone(freqs, dur, gainPeak){
  if(!soundOn()) return;
  try{
    const ctx = getAudioCtx();
    if(!ctx) return;
    let t = ctx.currentTime;
    freqs.forEach(function(freq){
      const osc=ctx.createOscillator(), gain=ctx.createGain();
      osc.type='sine'; osc.frequency.value=freq;
      gain.gain.setValueAtTime(0.0001,t);
      gain.gain.exponentialRampToValueAtTime(gainPeak||0.25,t+0.02);
      gain.gain.exponentialRampToValueAtTime(0.0001,t+dur);
      osc.connect(gain).connect(ctx.destination);
      osc.start(t); osc.stop(t+dur+0.02);
      t+=dur*0.75;
    });
  }catch(e){}
}
// ---- the sound set ----
// "Modern" (default): soft, glassy plucks and taps through a little room reverb — closer to a
// phone's UI sounds than a beep. "Classic" is the original sine beeps. Settings → Preferences.
function soundPack(){ return state.profile.soundPack==='classic' ? 'classic' : 'modern'; }
let sfxBus = null;
function sfxImpulse(ctx, secs, decay){
  const len = Math.floor(ctx.sampleRate*secs), buf = ctx.createBuffer(2, len, ctx.sampleRate);
  for(let ch=0; ch<2; ch++){ const d = buf.getChannelData(ch); for(let i=0;i<len;i++) d[i] = (Math.random()*2-1)*Math.pow(1-i/len, decay); }
  return buf;
}
function sfxOut(ctx){
  if(sfxBus && sfxBus.ctx===ctx) return sfxBus.input;
  const input = ctx.createGain(), dry = ctx.createGain(), wet = ctx.createGain(), verb = ctx.createConvolver(), comp = ctx.createDynamicsCompressor(), lp = ctx.createBiquadFilter();
  dry.gain.value = 0.9; wet.gain.value = 0.28; verb.buffer = sfxImpulse(ctx, 1.4, 3.4);
  lp.type = 'lowpass'; lp.frequency.value = 9000;
  comp.threshold.value = -14; comp.ratio.value = 3;
  input.connect(dry); dry.connect(comp); input.connect(verb); verb.connect(wet); wet.connect(comp);
  comp.connect(lp); lp.connect(ctx.destination);
  sfxBus = {ctx:ctx, input:input};
  return input;
}
// a soft plucked note: two slightly detuned voices through a closing low-pass
function sfxPluck(ctx, out, t, freq, dur, vol, type){
  const g = ctx.createGain(), f = ctx.createBiquadFilter();
  f.type = 'lowpass'; f.Q.value = 0.8;
  f.frequency.setValueAtTime(Math.min(14000, freq*9), t); f.frequency.exponentialRampToValueAtTime(Math.max(300, freq*1.4), t+dur);
  g.gain.setValueAtTime(0.0001, t); g.gain.exponentialRampToValueAtTime(vol, t+0.008); g.gain.exponentialRampToValueAtTime(0.0001, t+dur);
  [-4, 5].forEach(function(det){ const o = ctx.createOscillator(); o.type = type||'triangle'; o.frequency.value = freq; o.detune.value = det; o.connect(f); o.start(t); o.stop(t+dur+0.05); });
  f.connect(g); g.connect(out);
}
// a short tap — filtered noise, like a key click
function sfxTap(ctx, out, t, freq, vol){
  const len = Math.floor(ctx.sampleRate*0.03), buf = ctx.createBuffer(1, len, ctx.sampleRate), d = buf.getChannelData(0);
  for(let i=0;i<len;i++) d[i] = (Math.random()*2-1)*Math.pow(1-i/len, 4);
  const src = ctx.createBufferSource(), f = ctx.createBiquadFilter(), g = ctx.createGain();
  src.buffer = buf; f.type = 'bandpass'; f.frequency.value = freq; f.Q.value = 3; g.gain.value = vol;
  src.connect(f); f.connect(g); g.connect(out); src.start(t);
}
function sfxSweep(ctx, out, t, from, to, dur, vol){
  const o = ctx.createOscillator(), g = ctx.createGain();
  o.type = 'sine'; o.frequency.setValueAtTime(from, t); o.frequency.exponentialRampToValueAtTime(to, t+dur);
  g.gain.setValueAtTime(0.0001, t); g.gain.exponentialRampToValueAtTime(vol, t+dur*0.4); g.gain.exponentialRampToValueAtTime(0.0001, t+dur);
  o.connect(g); g.connect(out); o.start(t); o.stop(t+dur+0.05);
}
function sfx(fn){
  if(!soundOn()) return;
  try{ const ctx = getAudioCtx(); if(!ctx) return; fn(ctx, sfxOut(ctx), ctx.currentTime+0.005); }catch(e){}
}
const SFX = {
  tick: function(c, o, t){ sfxTap(c, o, t, 3200, 0.22); sfxPluck(c, o, t, 1760, 0.06, 0.025, 'sine'); },
  added: function(c, o, t){ sfxPluck(c, o, t, 880, 0.22, 0.09); sfxPluck(c, o, t+0.06, 1318.5, 0.3, 0.07); },
  positive: function(c, o, t){ sfxPluck(c, o, t, 659.3, 0.3, 0.09); sfxPluck(c, o, t+0.07, 987.8, 0.4, 0.08); },
  complete: function(c, o, t){ [523.3, 659.3, 784, 1046.5].forEach(function(f, i){ sfxPluck(c, o, t+i*0.055, f, 0.55, 0.075); }); sfxPluck(c, o, t+0.24, 2093, 0.5, 0.025, 'sine'); },
  start: function(c, o, t){ sfxSweep(c, o, t, 196, 392, 0.28, 0.07); sfxPluck(c, o, t+0.14, 784, 0.45, 0.08); },
  stop: function(c, o, t){ sfxPluck(c, o, t, 587.3, 0.35, 0.08); sfxPluck(c, o, t+0.09, 440, 0.5, 0.07); },
  session: function(c, o, t){ [392, 523.3, 659.3, 784, 1046.5].forEach(function(f, i){ sfxPluck(c, o, t+i*0.08, f, 1.1, 0.06); }); },
  rest: function(c, o, t){ sfxPluck(c, o, t, 440, 0.7, 0.06, 'sine'); sfxPluck(c, o, t+0.12, 349.2, 0.9, 0.05, 'sine'); },
  journal: function(c, o, t){ sfxPluck(c, o, t, 740, 0.4, 0.06, 'sine'); sfxPluck(c, o, t+0.08, 1108.7, 0.5, 0.04, 'sine'); },
  wake: function(c, o, t){ [261.6, 392, 523.3, 659.3, 784, 1046.5].forEach(function(f, i){ sfxPluck(c, o, t+i*0.13, f, 2.2, 0.055, i%2 ? 'sine' : 'triangle'); }); sfxSweep(c, o, t, 130.8, 261.6, 1.6, 0.04); }
};
function playSfx(name, classic){ if(soundPack()==='classic'){ if(classic) classic(); return; } sfx(SFX[name]); }
function playTick(){ playSfx('tick', function(){ tone([1200], 0.08, 0.2); }); }
function playStartChime(){ playSfx('start', function(){ tone([523,659], 0.18, 0.25); }); }
function playStopSound(){ playSfx('stop', function(){ tone([659,494], 0.16, 0.22); }); }
function playPositive(){ playSfx('positive', function(){ tone([659,880], 0.2, 0.25); }); }
function playSessionComplete(){ playSfx('session', function(){ tone([523,659,784], 0.3, 0.3); }); }
function playRestSound(){ playSfx('rest', function(){ tone([440,330], 0.3, 0.2); }); }
function playTaskComplete(){ playSfx('complete', function(){ tone([523,659,784,1046], 0.2, 0.4); }); }
function playTaskAdded(){ playSfx('added', function(){ tone([880,1046], 0.1, 0.18); }); }
function playJournalSound(){ playSfx('journal', function(){ tone([587,740], 0.16, 0.16); }); }
function playWakeChime(){ playSfx('wake', function(){ tone([659,880], 0.2, 0.25); }); }
function fmt12Hour(hm){
  if(!hm) return '';
  const parts = hm.split(':').map(Number);
  let h = parts[0], m = parts[1];
  const ampm = h>=12 ? 'PM' : 'AM';
  h = h % 12; if(h===0) h = 12;
  return h+':'+pad2(m)+' '+ampm;
}
function playAlarmSound(style){
  style = style || (state.profile && state.profile.alarmSound) || 'standard';
  try{
    const ctx = getAudioCtx();
    if(!ctx) return;
    let t = ctx.currentTime;
    if(style==='peaceful'){
      [523,659,784].forEach(function(freq){
        const osc=ctx.createOscillator(), gain=ctx.createGain();
        osc.type='sine'; osc.frequency.value=freq;
        gain.gain.setValueAtTime(0.0001,t);
        gain.gain.exponentialRampToValueAtTime(0.18,t+0.08);
        gain.gain.exponentialRampToValueAtTime(0.0001,t+0.9);
        osc.connect(gain).connect(ctx.destination);
        osc.start(t); osc.stop(t+0.95);
        t += 0.4;
      });
    } else if(style==='loud'){
      for(let i=0;i<6;i++){
        [988,784].forEach(function(freq, idx){
          const osc=ctx.createOscillator(), gain=ctx.createGain();
          osc.type='square'; osc.frequency.value=freq;
          gain.gain.setValueAtTime(0.0001, t+idx*0.09);
          gain.gain.exponentialRampToValueAtTime(0.4, t+idx*0.09+0.015);
          gain.gain.exponentialRampToValueAtTime(0.0001, t+idx*0.09+0.11);
          osc.connect(gain).connect(ctx.destination);
          osc.start(t+idx*0.09); osc.stop(t+idx*0.09+0.13);
        });
        t += 0.2;
      }
    } else {
      [880,660,880,660].forEach(function(freq){
        const osc = ctx.createOscillator(), gain = ctx.createGain();
        osc.type='sine'; osc.frequency.value=freq;
        gain.gain.setValueAtTime(0.0001, t);
        gain.gain.exponentialRampToValueAtTime(0.28, t+0.02);
        gain.gain.exponentialRampToValueAtTime(0.0001, t+0.16);
        osc.connect(gain).connect(ctx.destination);
        osc.start(t); osc.stop(t+0.2);
        t += 0.22;
      });
    }
  }catch(e){}
}
function playBeep(){ playAlarmSound(); }

