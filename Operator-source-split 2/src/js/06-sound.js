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
      gain.gain.exponentialRampToValueAtTime(Math.max(0.0002, (gainPeak||0.25)*sfxVolume()),t+0.02);
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
function sfxVolume(){ const v = Number(state.profile.sfxVolume); return isFinite(v) && state.profile.sfxVolume!=null ? Math.max(0, Math.min(1, v)) : 0.8; }
function soundPref(k, dflt){ const v = state.profile.sounds && state.profile.sounds[k]; return v===undefined ? dflt : v; }
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
  input.gain.value = sfxVolume()/0.8;
  lp.type = 'lowpass'; lp.frequency.value = 9000;
  comp.threshold.value = -14; comp.ratio.value = 3;
  input.connect(dry); dry.connect(comp); input.connect(verb); verb.connect(wet); wet.connect(comp);
  comp.connect(lp); lp.connect(ctx.destination);
  sfxBus = {ctx:ctx, input:input};
  return input;
}
function applySfxVolume(){ if(sfxBus) sfxBus.input.gain.value = sfxVolume()/0.8;
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
  // locking in: a rising sweep that lands on a bright two-note chord
  lockin: function(c, o, t){ sfxSweep(c, o, t, 110, 440, 0.45, 0.06); sfxSweep(c, o, t+0.05, 220, 880, 0.4, 0.03); sfxPluck(c, o, t+0.32, 659.3, 0.7, 0.07); sfxPluck(c, o, t+0.38, 987.8, 0.8, 0.06); sfxTap(c, o, t+0.3, 5200, 0.12); },
  // hitting the day's standard / a goal: a little fanfare
  fanfare: function(c, o, t){ [523.3, 659.3, 784, 1046.5].forEach(function(f, i){ sfxPluck(c, o, t+i*0.09, f, 0.5, 0.07); }); [784, 987.8, 1318.5].forEach(function(f){ sfxPluck(c, o, t+0.42, f, 1.4, 0.05, 'sine'); }); sfxTap(c, o, t+0.42, 6000, 0.1); },
  // a new message: two quick glassy pings
  ping: function(c, o, t){ sfxPluck(c, o, t, 1567.98, 0.25, 0.06, 'sine'); sfxPluck(c, o, t+0.11, 2093, 0.35, 0.05, 'sine'); },
  // winding down: a low, warm chord that settles
  night: function(c, o, t){ [130.8, 196, 261.6, 329.6].forEach(function(f, i){ sfxPluck(c, o, t+i*0.16, f, 2.4, 0.05, 'sine'); }); sfxSweep(c, o, t, 392, 196, 1.8, 0.025); },
  wake: function(c, o, t){ [261.6, 392, 523.3, 659.3, 784, 1046.5].forEach(function(f, i){ sfxPluck(c, o, t+i*0.13, f, 2.2, 0.055, i%2 ? 'sine' : 'triangle'); }); sfxSweep(c, o, t, 130.8, 261.6, 1.6, 0.04); }
};
// ---- the soft palette: warm sines in one key (C major pentatonic), like Wind down ----
// Moving around the app walks up and down the scale instead of repeating one blip, so a run of
// clicks sounds like a little melody. Steps in the rituals (Wind down, Lock in, Good morning)
// climb one note per step.
const PENTA = [196, 220, 261.6, 293.7, 329.6, 392, 440, 523.3, 587.3, 659.3, 784];
let pentaIdx = 5;
function pentaWalk(){ const moves = [-2, -1, 1, 2]; pentaIdx = Math.max(2, Math.min(PENTA.length-2, pentaIdx + moves[Math.floor(Math.random()*moves.length)])); return PENTA[pentaIdx]; }
SFX.nav = function(c, o, t){ const f = pentaWalk(); sfxPluck(c, o, t, f, 0.55, 0.04, 'sine'); sfxPluck(c, o, t+0.045, f*1.5, 0.7, 0.018, 'sine'); };
SFX.lift = function(c, o, t){ sfxSweep(c, o, t, 330, 523.3, 0.16, 0.022); sfxTap(c, o, t, 1800, 0.05); };
SFX.drop = function(c, o, t){ sfxPluck(c, o, t, 392, 0.45, 0.055, 'sine'); sfxPluck(c, o, t+0.05, 587.3, 0.6, 0.03, 'sine'); sfxTap(c, o, t, 900, 0.08); };
SFX.lockout = function(c, o, t){ [659.3, 523.3, 392, 261.6].forEach(function(f, i){ sfxPluck(c, o, t+i*0.11, f, 1.2, 0.05, 'sine'); }); sfxSweep(c, o, t, 440, 220, 0.9, 0.025); };
SFX.deny = function(c, o, t){ sfxPluck(c, o, t, 233.1, 0.22, 0.07, 'triangle'); sfxPluck(c, o, t+0.09, 220, 0.3, 0.06, 'triangle'); };
function stepSfx(i){ const base = [261.6, 329.6, 392, 523.3, 659.3, 784][Math.max(0, Math.min(5, i||0))]; return function(c, o, t){ sfxPluck(c, o, t, base, 0.9, 0.05, 'sine'); sfxPluck(c, o, t+0.06, base*1.5, 1.1, 0.025, 'sine'); sfxPluck(c, o, t+0.12, base*2, 1.2, 0.012, 'sine'); }; }
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
function playLockIn(){ if(lockStartSound()==='none') return; playSfx('lockin', function(){ tone([523,659], 0.18, 0.25); }); }
function playFanfare(){ playSfx('fanfare', function(){ tone([523,659,784], 0.3, 0.3); }); }
function playPing(){ playSfx('ping', function(){ tone([1200,1500], 0.08, 0.15); }); }
function playNight(){ playSfx('night', function(){ tone([440,330], 0.3, 0.2); }); }
function playNav(){ if(soundPref('nav', true)) playSfx('nav', null); }
function playDragLift(){ if(soundPref('drag', true)) playSfx('lift', null); }
function playDrop(){ if(soundPref('drag', true)) playSfx('drop', function(){ tone([660], 0.08, 0.15); }); }
function playLockOut(){ playSfx('lockout', function(){ tone([659,494], 0.16, 0.22); }); }
function playDeny(){ playSfx('deny', function(){ tone([220,208], 0.12, 0.2); }); }
function playStep(i){ if(soundPack()==='classic'){ tone([523], 0.08, 0.15); return; } sfx(stepSfx(i)); }
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


// ---- longer moments: dawn, the work intro, the lock-in start-up ----
// A slow pad: a few sines per note, detuned, through a gentle low-pass, with a long attack.
function padChord(ctx, out, t, freqs, attack, hold, release, vol){
  const f = ctx.createBiquadFilter(); f.type = 'lowpass'; f.frequency.value = 1800; f.Q.value = 0.4;
  const g = ctx.createGain();
  g.gain.setValueAtTime(0.0001, t); g.gain.exponentialRampToValueAtTime(vol, t+attack);
  g.gain.setValueAtTime(vol, t+attack+hold); g.gain.exponentialRampToValueAtTime(0.0001, t+attack+hold+release);
  freqs.forEach(function(fr){ [-6, 0, 7].forEach(function(det){ const o = ctx.createOscillator(); o.type = 'sine'; o.frequency.value = fr; o.detune.value = det; o.connect(f); o.start(t); o.stop(t+attack+hold+release+0.1); }); });
  f.connect(g); g.connect(out);
}
SFX.dawn = function(c, o, t){ padChord(c, o, t, [130.8, 196, 261.6, 329.6, 392], 9, 14, 8, 0.035); [523.3, 659.3, 784].forEach(function(f, i){ sfxPluck(c, o, t+6+i*1.6, f, 3, 0.02, 'sine'); }); };
SFX.workintro = function(c, o, t){ padChord(c, o, t, [174.6, 220, 261.6, 329.6], 1.6, 1.6, 2.4, 0.04); sfxSweep(c, o, t, 220, 440, 1.6, 0.03); [523.3, 659.3, 784, 1046.5].forEach(function(f, i){ sfxPluck(c, o, t+0.9+i*0.16, f, 1.4, 0.045, 'sine'); }); };
// "Chill intro": about fifteen seconds of lo-fi — four warm chords, a slow arpeggio, a soft low end
SFX.chill = function(c, o, t){
  const prog = [[174.6, 220, 261.6, 329.6], [164.8, 196, 246.9, 293.7], [146.8, 174.6, 220, 261.6, 329.6], [130.8, 164.8, 196, 246.9]];
  prog.forEach(function(ch, i){
    const at = t + i*3.4;
    padChord(c, o, at, ch, 1.2, 1.8, 2.2, 0.028);
    sfxPluck(c, o, at, ch[0]/2, 2.6, 0.05, 'sine');
    ch.concat([ch[1]*2, ch[2]*2]).forEach(function(f, j){ sfxPluck(c, o, at + 0.42*j, f*2, 1.1, 0.018, 'triangle'); });
  });
  // a little tape hiss under it
  const len = Math.floor(c.sampleRate*14), buf = c.createBuffer(1, len, c.sampleRate), d = buf.getChannelData(0);
  for(let i=0;i<len;i++) d[i] = (Math.random()*2-1)*0.5;
  const src = c.createBufferSource(), hp = c.createBiquadFilter(), g = c.createGain();
  src.buffer = buf; hp.type = 'bandpass'; hp.frequency.value = 3500; hp.Q.value = 0.6;
  g.gain.setValueAtTime(0.0001, t); g.gain.exponentialRampToValueAtTime(0.006, t+1.5); g.gain.setValueAtTime(0.006, t+11); g.gain.exponentialRampToValueAtTime(0.0001, t+14);
  src.connect(hp); hp.connect(g); g.connect(o); src.start(t); src.stop(t+14);
};
function playDawnPad(){ if(soundPref('dawn', true)) sfx(SFX.dawn); }
function playWorkIntro(){ if(soundPref('workintro', true)) playSfx('workintro', function(){ tone([523,659,784], 0.3, 0.25); }); }
// what plays as you lock in: none / the chime / the chill intro / your own music
function lockStartSound(){ const v = state.profile.lockSound; return ['none','chime','chill','music'].indexOf(v)>=0 ? v : 'chill'; }
let lockSongPlaying = false;
function playLockInSong(){
  const k = lockStartSound();
  if(k==='chill'){ setTimeout(function(){ sfx(SFX.chill); }, 700); if(typeof focusMusicAfterIntro==='function') focusMusicAfterIntro(14500); return; }
  if(k==='music'){ const m = state.profile.lockMusic; if(m && m.q && typeof musicApp==='function'){ musicApp('play', m).then(function(ok){ lockSongPlaying = !!ok; }); } }
}
function stopLockInSong(){ if(typeof focusMusicStop==='function'){ clearTimeout(FM.introT); focusMusicStop(); } if(lockSongPlaying && soundPref('lockMusicStop', true) && typeof musicApp==='function'){ lockSongPlaying = false; musicApp('stop'); } }

// ---- Settings → Sound ----
function soundSettingsHtml(){
  const p = state.profile, on = p.soundEnabled!==false, pack = on ? soundPack() : 'off', ls = lockStartSound(), lm = p.lockMusic || null;
  const seg = function(cur, act, opts){ return '<div class="seg-tabs snd-seg">'+opts.map(function(o){ return '<button class="seg-tab'+(cur===o[0]?' active':'')+'" data-action="'+act+'" data-id="'+o[0]+'">'+o[1]+'</button>'; }).join('')+'</div>'; };
  const tog = function(k, label, sub, dflt){ const v = soundPref(k, dflt); return '<label class="snd-row"><span><b>'+label+'</b><small>'+sub+'</small></span><span class="ws-switch"><input type="checkbox" data-snd="'+k+'" '+(v?'checked':'')+'><span></span></span></label>'; };
  const tile = function(id, icon, label, sub){ return '<button class="snd-tile'+(ls===id?' is-on':'')+'" data-action="sndLockSound" data-id="'+id+'"><span class="snd-tile-i">'+icon+'</span><b>'+label+'</b><small>'+sub+'</small></button>'; };
  return '<div class="snd">'+
    '<div class="card section"><div class="snd-h"><div><div class="section-title" style="margin:0;">&#127925; Sound Effects</div><div class="kpi-sub">Clicks, ticks and chimes around the app.</div></div><button class="btn btn-ghost btn-sm" data-action="previewSounds">&#9654; Hear them</button></div>'+
      seg(pack, 'sndPack', [['modern','Soft'],['classic','Classic beeps'],['off','Off']])+
      '<div class="snd-vol'+(on?'':' is-off')+'"><span>&#128264;</span><input type="range" min="0" max="100" step="5" id="sndVol" value="'+Math.round(sfxVolume()*100)+'"><span>&#128266;</span><b id="sndVolV">'+Math.round(sfxVolume()*100)+'%</b></div>'+
      '<div class="snd-rows'+(on?'':' is-off')+'">'+
        tog('nav', 'Moving around', 'A soft note when you switch pages', true)+
        tog('drag', 'Drag and drop', 'A lift and a landing when you move things', true)+
      '</div></div>'+
    '<div class="card section"><div class="snd-h"><div><div class="section-title" style="margin:0;">&#128274; When You Lock In</div><div class="kpi-sub">What plays the moment you lock in.</div></div><button class="btn btn-ghost btn-sm" data-action="sndPreviewLock">&#9654; Hear it</button></div>'+
      '<div class="snd-tiles">'+tile('none', '&#128263;', 'Silent', 'Nothing at all')+tile('chime', '&#10024;', 'Chime', 'A quick rising chime')+tile('chill', '&#127769;', 'Chill Intro', '15 seconds of lo-fi')+tile('music', '&#9835;', 'My Music', 'A song or playlist')+'</div>'+
      (ls==='music' ? '<div class="snd-music">'+
          '<input class="input" id="sndLockQuery" placeholder="Apple Music song or playlist name" value="'+escapeHtml(lm ? lm.q : '')+'">'+
          seg(lm && lm.k==='playlist' ? 'playlist' : 'song', 'sndLockKind', [['song','Song'],['playlist','Playlist']])+
          '<button class="btn btn-sm btn-primary" data-action="sndLockSet">Use it</button>'+
        '</div>'+(lm ? '<div class="kpi-sub" style="margin-top:6px;">&#9835; '+escapeHtml(lm.q)+' &middot; Plays through the Music app</div>' : '')+
        '<div class="snd-rows">'+tog('lockMusicStop', 'Stop it when I lock out', 'Otherwise it keeps playing', true)+'</div>' : '')+
    '</div>'+
    '<div class="card section"><div class="section-title">&#9728;&#65039; Mornings</div>'+
      '<div class="snd-pl"><label><b>Morning playlist</b><small>An Apple Music playlist — the play button on Good morning starts it, and it follows your wake-up song by itself</small></label>'+
        '<div class="snd-music" style="margin-top:8px;"><input class="input" id="sndMorningPl" placeholder="Playlist name in Apple Music" value="'+escapeHtml(p.morningPlaylist && p.morningPlaylist.q || '')+'"><button class="btn btn-sm btn-primary" data-action="sndMorningPlSet">Save</button></div></div>'+
      '<div class="snd-rows">'+
        tog('morningPlAfterSong', 'Play it after the wake-up song', 'When the song ends, the playlist carries on', true)+
        tog('focusMusic', 'Focus music after the lock-in intro', 'Quiet tracks keep playing until you lock out', true)+
        tog('dawn', 'Dawn before the alarm', 'A slow chord swells under the sunrise in the last 90 seconds', true)+
        tog('workintro', 'Start work', 'A warm swell when the work intro opens', true)+
      '</div>'+
      '<div class="snd-h" style="margin-top:12px;"><div class="kpi-sub">Your alarm tone or wake-up music lives with the alarm.</div><button class="btn btn-ghost btn-sm" data-action="openWakeSetup">&#9200; Alarm sound</button></div>'+
    '</div>'+
  '</div>';
}
function saveSound(){ persist('profile'); if(typeof renderView==='function') renderView(); }
ACTIONS.sndPack = function(el, e, id){ const p = state.profile; p.soundEnabled = id!=='off'; if(id!=='off') p.soundPack = id; saveSound(); if(id!=='off') playPositive(); };
ACTIONS.sndLockSound = function(el, e, id){ state.profile.lockSound = id; saveSound(); };
ACTIONS.sndPreviewLock = function(){ playLockIn(); const k = lockStartSound(); if(k==='chill') setTimeout(function(){ sfx(SFX.chill); }, 700); else if(k==='music'){ const m = state.profile.lockMusic; if(m && m.q) musicApp('play', m).then(function(ok){ if(!ok) showToast('Music plays through the Operator app — open Operator from its icon.', {icon:'&#9888;'}); }); } };
ACTIONS.sndLockKind = function(el, e, id){ ui.sndLockKind = id; const m = state.profile.lockMusic; if(m){ m.k = id; saveSound(); } else renderView(); };
ACTIONS.sndLockSet = function(){
  const i = document.getElementById('sndLockQuery'), v = i ? i.value.trim() : ''; if(!v){ if(i) i.focus(); return; }
  const fromLink = typeof appleMusicFromLink==='function' ? appleMusicFromLink(v) : null;
  state.profile.lockMusic = fromLink || {type:'music', q:v, k: ui.sndLockKind || 'song'};
  saveSound(); showToast('Lock-in music: '+state.profile.lockMusic.q, {icon:'&#9835;'});
};
document.addEventListener('change', function(e){
  const t = e.target; if(!t || !t.dataset || !t.dataset.snd) return;
  state.profile.sounds = Object.assign({}, state.profile.sounds||{}); state.profile.sounds[t.dataset.snd] = !!t.checked; persist('profile');
});
document.addEventListener('input', function(e){
  const t = e.target; if(!t || t.id!=='sndVol') return;
  state.profile.sfxVolume = Number(t.value)/100; applySfxVolume();
  const v = document.getElementById('sndVolV'); if(v) v.textContent = t.value+'%';
  clearTimeout(ui._sndT); ui._sndT = setTimeout(function(){ persist('profile'); playTick(); }, 180);
});
// "Hear them": a short tour of the set, one sound after another
ACTIONS.previewSounds = function(){
  if(!soundOn()){ showToast('Sound effects are off.', {icon:'&#128263;'}); return; }
  const seq = [playTick, playNav, playTaskAdded, playDrop, playPositive, playTaskComplete, playLockIn];
  seq.forEach(function(f, i){ setTimeout(f, i*420); });
};

ACTIONS.sndMorningPlSet = function(){ const i = document.getElementById('sndMorningPl'), v = i ? i.value.trim() : ''; state.profile.morningPlaylist = v ? {q:v, k:'playlist'} : null; saveSound(); showToast(v ? 'Morning playlist: '+v : 'Morning playlist cleared', {icon:'&#9835;'}); };
