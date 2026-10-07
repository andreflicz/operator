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
function playTick(){ tone([1200], 0.08, 0.2); }
function playStartChime(){ tone([523,659], 0.18, 0.25); }
function playStopSound(){ tone([659,494], 0.16, 0.22); }
function playPositive(){ tone([659,880], 0.2, 0.25); }
function playSessionComplete(){ tone([523,659,784], 0.3, 0.3); }
function playRestSound(){ tone([440,330], 0.3, 0.2); }
function playTaskComplete(){ tone([523,659,784,1046], 0.2, 0.4); }
function playTaskAdded(){ tone([880,1046], 0.1, 0.18); }
function playJournalSound(){ tone([587,740], 0.16, 0.16); }
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

