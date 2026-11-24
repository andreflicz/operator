// ============ MUSIC, EVERYWHERE IT BELONGS ============
// One small player that looks and works the same on every full-screen page (Good morning, Work mode,
// the lock-in sequence, locked in): what's playing, ⏭, and ▶ / ❚❚. It never disappears when you
// press it, it just shows ▶ again.
// Good morning keeps your wake-up song going: it plays out, then a morning track picks up so the
// music doesn't drop out halfway through. Op talking or listening only turns it down.
// Lock-in has its own sound: the moment you open the lock-in sequence, and while you're locked in, a
// low, subtle track plays (or whatever's on goes down to match).

// ---- three more tracks: one for mornings, two made to sit under deep work ----
FOCUS_TRACKS.push(
  {name:'Sunrise', style:'glass', morning:true, bpm:64, prog:[[48,55,60,64,67],[45,52,57,60,64],[41,48,53,57,60],[43,50,55,59,62]], scale:[72,74,76,79,81,84,86], hiss:0.001},
  {name:'Low Light', style:'hush', lock:true, bpm:56, prog:[[45,52,57,60],[41,48,53,57],[43,50,55,58],[40,47,52,55]], scale:[64,67,69,72,74], hiss:0.002},
  {name:'Undertow', style:'hush', lock:true, bpm:52, prog:[[38,45,50,53],[41,48,53,57],[36,43,48,52],[40,47,52,55]], scale:[62,65,67,69,72], hiss:0.003}
);
// hush: a low warm pad, a heartbeat you barely notice and a muted note now and then. Nothing to listen to,
// just something to sink into.
fmDream = (function(base){
  return function(style){
    if(style==='hush') return function(ctx, out, t, tr, bar){
      const beat = 60/tr.bpm, len = beat*4, ch = tr.prog[bar % tr.prog.length];
      padChord(ctx, out, t, ch.map(fmHz), len*0.6, len*0.3, len*1.1, 0.016);
      fmKey(ctx, out, t, fmHz(ch[0] - 12), len*1.2, 0.05);
      if(bar > 0){ fmKick(ctx, out, t, 0.045); fmKick(ctx, out, t + beat*2, 0.03); }
      if(bar > 1 && fmRand() < 0.55) fmKey(ctx, out, t + beat*(1 + Math.floor(fmRand()*3)) + fmRand()*0.1, fmHz(tr.scale[Math.floor(fmRand()*tr.scale.length)]), beat*3, 0.022);
    };
    return base(style);
  };
})(fmDream);

// ---- soft: the same music at about a third of the volume ----
const fmVolumeFull = fmVolume;
fmVolume = function(){ return fmVolumeFull()*(FM.soft ? 0.32 : 1); };
function fmRamp(sec){
  const ctx = getAudioCtx(); if(!ctx || !FM.playing || !FM.bus) return;
  const g = FM.bus.g.gain; g.cancelScheduledValues(ctx.currentTime); g.setValueAtTime(Math.max(0.0001, g.value), ctx.currentTime);
  g.exponentialRampToValueAtTime(Math.max(0.0002, FM.ducked ? fmVolume()*0.12 : fmVolume()), ctx.currentTime + (sec||1.5));
}
function musicSoft(on){ on = !!on; if(FM.soft===on) return; FM.soft = on; fmRamp(2); }
function fmTrackIds(key){ return FOCUS_TRACKS.map(function(tr, i){ return tr[key] ? i : -1; }).filter(function(i){ return i >= 0; }); }
function fmPlayFrom(key, tag, soft){
  const ids = fmTrackIds(key); if(!ids.length || typeof focusMusicPlay!=='function') return;
  FM.soft = !!soft; FM.tag = tag || key;
  focusMusicPlay(ids[Math.floor(Math.random()*ids.length)]);
}
function wakeSongOn(){ return !!((typeof wakeAudio!=='undefined' && wakeAudio) || (typeof wakeMusicApp!=='undefined' && wakeMusicApp) || (typeof wakeFinishing!=='undefined' && wakeFinishing)); }

// lock-in music: low and subtle. Whatever's already playing just goes down; nothing playing → Low Light or Undertow.
function lockMusicOn(){
  if(typeof soundPref==='function' && !soundPref('lockMusic', true)) return;
  if(wakeSongOn()) return;
  if(FM.playing || FM.switching){ musicSoft(true); dockRefresh(); return; }
  if(ui.lockMusicOff) return;
  fmPlayFrom('lock', 'lock', true);
}
// out of a session: back to full volume (only if it was the session that turned it down)
function lockMusicDone(){ if(FM.soft && !overlayOpen('lockSeqOverlay')) musicSoft(false); }
openLockSeq = (function(base){ return function(opts){ const was = overlayOpen('lockSeqOverlay'); base(opts); if(!was && overlayOpen('lockSeqOverlay')) lockMusicOn(); }; })(openLockSeq);
afterRenderHooks.push(function(){
  const on = !!state.focus.activeSession;
  if(on && !ui._lockMusicSeen){ ui._lockMusicSeen = true; lockMusicOn(); }
  if(!on && ui._lockMusicSeen){ ui._lockMusicSeen = false; lockMusicDone(); }
});
// work music: the morning track hands over to a work one; a lock track already going stays
workMusicPlay = (function(base){
  return function(){
    if(FM.playing && FM.tag==='morning'){ if(typeof soundPref==='function' && !soundPref('workMusic', true)) return; FM.soft = false; FM.tag = 'work'; const ids = fmTrackIds('work'); FM.idx = ids[Math.floor(Math.random()*ids.length)]; FM.bar = 0; FM.switching = true; focusMusicStop(); setTimeout(function(){ FM.switching = false; focusMusicPlay(); }, 900); return; }
    base(); if(FM.playing && !FM.tag) FM.tag = 'work';
  };
})(workMusicPlay);
inspPlayDream = (function(base){ return function(){ FM.soft = false; FM.tag = 'dream'; base(); }; })(inspPlayDream);

// ---- the player ----
function mctlKey(){ return [wakeSongOn() ? 'w' : '', FM.playing || FM.switching ? 'p' : '', FM.idx, FM.soft ? 's' : ''].join('|'); }
function mctlHtml(cls){
  const song = wakeSongOn(), m = song && typeof wakeCfg==='function' ? wakeCfg().media : null;
  const on = song || FM.playing || FM.switching;
  const name = song ? (m ? mediaName(m) : 'Your wake-up song') : on ? FOCUS_TRACKS[FM.idx].name : 'Music';
  return '<span class="mctl'+(cls ? ' '+cls : '')+(on ? ' is-on' : '')+'" data-mk="'+mctlKey()+'">'+
    '<span class="mctl-i">'+(on ? '<span class="wk2-eq"><i></i><i></i><i></i><i></i></span>' : '&#9835;')+'</span>'+
    '<span class="mctl-t" title="'+escapeHtml(name)+'">'+escapeHtml(name)+'</span>'+
    (on && !song ? '<button class="mctl-b" data-action="mctlNext" title="Next track">&#9197;</button>' : '')+
    '<button class="mctl-b mctl-p" data-action="mctlToggle" title="'+(on ? 'Pause' : 'Play')+'">'+(on ? '&#10073;&#10073;' : '&#9654;')+'</button></span>';
}
ACTIONS.mctlToggle = function(el){
  if(wakeSongOn()){
    // stop the wake-up song for real, whatever's playing it
    ui.gmMusicOff = true; stopWakeMedia(true); wakeFinishing = false;
    const m = wakeCfg().media; if(m && m.type==='music') musicApp('stop');
  } else if(FM.playing || FM.switching){
    if(FM.switching) return;
    focusMusicStop(); ui.gmMusicOff = overlayOpen('wakeOverlay'); ui.lockMusicOff = !!(state.focus.activeSession || overlayOpen('lockSeqOverlay'));
  } else {
    ui.gmMusicOff = false; ui.lockMusicOff = false;
    if(overlayOpen('wakeOverlay')) fmPlayFrom('morning', 'morning', false);
    else if(overlayOpen('lockSeqOverlay') || state.focus.activeSession) fmPlayFrom('lock', 'lock', true);
    else if(overlayOpen('planOverlay')) fmPlayFrom('work', 'work', false);
    else focusMusicPlay();
  }
  playTick(); dockRefresh();
};
ACTIONS.mctlNext = function(){ if(FM.playing && !FM.switching) ACTIONS.fmNext(); };
// every player on the page follows along when the music changes
dockRefresh = (function(base){
  return function(){
    base();
    const k = mctlKey();
    document.querySelectorAll('.mctl').forEach(function(el){
      if(el.dataset.mk===k) return;
      const cls = Array.prototype.filter.call(el.classList, function(c){ return c!=='mctl' && c!=='is-on'; }).join(' ');
      const t = document.createElement('div'); t.innerHTML = mctlHtml(cls); el.replaceWith(t.firstChild);
    });
  };
})(dockRefresh);
fmRefresh = function(){ dockRefresh(); };
setInterval(function(){ if(document.querySelector('.mctl')) dockRefresh(); }, 1500);

// ---- Good morning: the song plays out, then a morning track takes over ----
function gmHandoff(){
  if(!overlayOpen('wakeOverlay') || ui.wakeMode!=='brief' || ui.gmMusicOff || FM.switching || wakeSongOn()) return;
  // (a lock-in track left on from last night gives way to the morning one)
  if(FM.playing && FM.tag==='lock'){ const ids = fmTrackIds('morning'); FM.soft = false; FM.tag = 'morning'; FM.idx = ids[0]; FM.bar = 0; FM.switching = true; focusMusicStop(); setTimeout(function(){ FM.switching = false; focusMusicPlay(); dockRefresh(); }, 900); return; }
  if(FM.playing) return;
  if(typeof soundPref==='function' && !soundPref('morningMusic', true)) return;
  fmPlayFrom('morning', 'morning', false); dockRefresh();
}
// the Music app: ask it now and then whether the song's over (the Operator app pauses it at the end)
let gmPollT = null;
function gmWatchSong(){
  clearInterval(gmPollT);
  gmPollT = setInterval(function(){
    if(!overlayOpen('wakeOverlay')){ clearInterval(gmPollT); return; }
    if(!wakeFinishing || wakeAudio){ if(!wakeSongOn()){ clearInterval(gmPollT); gmHandoff(); } return; }
    const ctl = typeof AbortController!=='undefined' ? new AbortController() : null, tm = setTimeout(function(){ if(ctl) ctl.abort(); }, 3000);
    fetch(MUSIC_URL+'now', {cache:'no-store', signal: ctl ? ctl.signal : undefined}).then(function(r){ return r.json(); }).then(function(j){
      clearTimeout(tm);
      if(j && j.state && j.state!=='playing' && wakeFinishing && !wakeAudio){ wakeFinishing = false; clearInterval(gmPollT); dockRefresh(); gmHandoff(); }
    }).catch(function(){ clearTimeout(tm); });
  }, 5000);
}
finishWakeMedia = (function(base){
  return function(){
    const a = wakeAudio;
    base();
    if(a) a.addEventListener('ended', function(){ setTimeout(gmHandoff, 600); }, {once:true});
    gmWatchSong();
  };
})(finishWakeMedia);
// the briefing starting with no song at all (an alarm tone, or a test): the morning track, softly in
afterRenderHooks.push(function(){
  if(ui.wakeMode==='brief' && overlayOpen('wakeOverlay')){
    if(!ui._gmStarted){ ui._gmStarted = true; ui.gmMusicOff = false; setTimeout(gmHandoff, 2200); }
  } else ui._gmStarted = false;
});
// leaving Good morning for work: a song still going fades out so the work music can come in
function gmLeave(){ clearInterval(gmPollT); if(wakeSongOn()){ stopWakeMedia(false); wakeFinishing = false; const m = wakeCfg().media; if(m && m.type==='music') musicApp('stop'); } }
ACTIONS.wakeStartMorning = (function(base){ return function(){ gmLeave(); return base.apply(this, arguments); }; })(ACTIONS.wakeStartMorning);
ACTIONS.briefSkip = (function(base){ return function(){ gmLeave(); return base.apply(this, arguments); }; })(ACTIONS.briefSkip);
ACTIONS.wakeStopMusic = function(){ ACTIONS.mctlToggle(); };

// ---- Op talking or listening turns the music down; it never stops it ----
aiUiRefresh = (function(base){
  return function(){
    base.apply(this, arguments);
    if(AI.listening && !OV.listenDuck){ OV.listenDuck = true; opDuck(true); }
    else if(!AI.listening && OV.listenDuck){ OV.listenDuck = false; opDuck(false); }
  };
})(aiUiRefresh);
