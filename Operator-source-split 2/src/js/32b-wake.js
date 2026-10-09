
// ============ WAKE-UP ALARM, ON-TIME ALARMS, WAKE SCREEN, BREAK TIMER ============
// One master wake-up alarm (e.g. 7:00 AM Mon–Sat) that can be changed for a single morning
// at any hour of the night, and a full-screen wake screen (clock, vision board, the plan,
// today's calendar) with music that starts by itself.
//
// Alarms used to be matched against the current minute every 4 s. When Chrome slowed the
// timers of a background window, that minute was skipped and the alarm only rang once the
// window was opened. Now every alarm keeps the time it last rang, and anything scheduled
// since then (within a grace window) rings on the next check — late by seconds, not missed.
const ALARM_GRACE_MS = 15*60000;
const WAKE_GRACE_MS = 2*3600000;
const WAKE_PING_URL = 'http://127.0.0.1:8935/wake';
function dowOf(dateStr){ return new Date(localTs(dateStr, '12:00')).getDay(); }
function wakeCfg(){ return state.focus.wake; }
function wakeTimeFor(dateStr){
  const w = wakeCfg(); if(!w) return null;
  if(w.override && w.override.date===dateStr) return w.override.off ? null : (w.override.time||null);
  if(!w.enabled) return null;
  return w.days.indexOf(dowOf(dateStr))>=0 ? w.time : null;
}
function wakeBaseTimeFor(dateStr){ const w = wakeCfg(); return (w && w.enabled && w.days.indexOf(dowOf(dateStr))>=0) ? w.time : null; }
function nextWake(){
  const now = Date.now();
  for(let i=0;i<9;i++){
    const d = addDays(todayStr(), i), t = wakeTimeFor(d);
    if(!t) continue;
    const ts = localTs(d, t);
    if(ts>now) return {ts:ts, date:d, time:t, override:!!(wakeCfg().override && wakeCfg().override.date===d)};
  }
  return null;
}
// The morning "tomorrow's alarm" refers to right now: after midnight (or before this
// morning's alarm) it's today — so setting things up at 1 AM still targets the same morning.
function wakeTargetDate(){
  const now = new Date(), today = todayStr();
  if(now.getHours()<4) return today;
  if(now.getHours()<12){ const t = wakeTimeFor(today) || wakeBaseTimeFor(today); if(t && localTs(today, t)>Date.now()) return today; }
  return addDays(today, 1);
}
function morningLabel(dateStr){
  if(dateStr===todayStr()) return new Date().getHours()<12 ? 'this morning' : 'today';
  if(dateStr===addDays(todayStr(),1)) return 'tomorrow';
  return weekdayShort(dateStr);
}
function wakeDaysLabel(days){
  const s = arr(days).slice().sort().join(',');
  if(s==='0,1,2,3,4,5,6') return 'every day';
  if(s==='1,2,3,4,5') return 'Mon–Fri';
  if(s==='1,2,3,4,5,6') return 'Mon–Sat';
  if(s==='0,6') return 'weekends';
  if(!s) return 'no days';
  const names = ['Sun','Mon','Tue','Wed','Thu','Fri','Sat'];
  return arr(days).slice().sort().map(function(d){ return names[d]; }).join(', ');
}
function wakeArm(){ wakeCfg().armedAt = Date.now(); }
// Ask the Operator.app wrapper to bring the window to the front and wake the display.
// The helper on 127.0.0.1:8935 answers one request at a time, so a second request sent at the
// same moment (bring the window up + start the music) used to bounce — and the music "failed".
// Everything for it goes through one queue, retried until it gets through.
const HELPER_RETRY_MS = [100, 200, 300, 500, 800, 1100];
let helperChain = Promise.resolve();
function helperFetch(url, timeoutMs){
  const run = async function(){
    for(let i=0;i<=HELPER_RETRY_MS.length;i++){
      const ctl = typeof AbortController!=='undefined' ? new AbortController() : null;
      const timer = setTimeout(function(){ if(ctl) ctl.abort(); }, timeoutMs||4000);
      try{
        const res = await fetch(url, {cache:'no-store', signal: ctl ? ctl.signal : undefined});
        clearTimeout(timer);
        return res.ok;
      }catch(e){ clearTimeout(timer); if(i===HELPER_RETRY_MS.length) return false; await new Promise(function(r){ setTimeout(r, HELPER_RETRY_MS[i]); }); }
    }
    return false;
  };
  const p = helperChain.then(run, run);
  helperChain = p.catch(function(){});
  return p;
}
function pingWrapper(){ helperFetch(WAKE_PING_URL, 2500); }
// ---- scheduling / checking ----
const alarmSigs = {};
function lastScheduledTs(al, now){
  const today = todayStr(new Date(now));
  const days = [today, addDays(today, -1)];
  for(let i=0;i<days.length;i++){
    const d = days[i];
    if(al.date){ if(al.date!==d) continue; }
    else if(arr(al.days).indexOf(dowOf(d))<0) continue;
    const ts = localTs(d, al.time);
    if(ts<=now) return ts;
  }
  return null;
}
function alarmOwnerGone(al){
  if(!al.taskId) return false;
  const t = state.tasks.items.find(function(x){ return x.id===al.taskId; });
  return !t || t.status==='done';
}
function checkAllAlarms(){
  if(!state.focus) return;
  const now = Date.now();
  let changed = false;
  const yesterday = addDays(todayStr(), -1);
  const before = state.focus.alarms.length;
  state.focus.alarms = state.focus.alarms.filter(function(a){ return !(a.date && a.date<yesterday); });
  if(state.focus.alarms.length!==before) changed = true;
  state.focus.alarms.forEach(function(al){
    const sig = (al.enabled?1:0)+'|'+al.time+'|'+(al.date||'')+'|'+arr(al.days).join(',');
    if(!al.armedAt){ al.armedAt = now; changed = true; }
    else if(alarmSigs[al.id] && alarmSigs[al.id]!==sig){ al.armedAt = now; changed = true; }
    alarmSigs[al.id] = sig;
    if(!al.enabled || !al.time || alarmOwnerGone(al)) return;
    const ts = lastScheduledTs(al, now);
    if(!ts || ts<=(al.lastFiredTs||0) || ts<al.armedAt-1000 || now-ts>ALARM_GRACE_MS) return;
    al.lastFiredTs = ts; changed = true;
    triggerAlarm(al);
  });
  const fired = state.focus.alarms.filter(function(a){ return a.date && a.lastFiredTs; });
  if(fired.length){ state.focus.alarms = state.focus.alarms.filter(function(a){ return !(a.date && a.lastFiredTs); }); changed = true; }
  // master wake-up alarm
  const w = wakeCfg();
  if(w){
    const days = [todayStr(), yesterday];
    for(let i=0;i<days.length;i++){
      const t = wakeTimeFor(days[i]); if(!t) continue;
      const ts = localTs(days[i], t);
      if(ts>now) continue;
      if(ts>w.lastFiredTs && ts>=w.armedAt-1000 && now-ts<=WAKE_GRACE_MS){ w.lastFiredTs = ts; changed = true; fireWake({}); }
      break;
    }
    if(w.override && w.override.date<todayStr()){ w.override = null; changed = true; }
  }
  // snoozes and test rings
  const sn = state.focus.snooze;
  if(sn && sn.ts<=now){
    state.focus.snooze = null; changed = true;
    if(sn.wake) fireWake({test:sn.test, snoozed:!sn.test}); else triggerAlarm(sn.alarm||{label:'Reminder'});
  }
  if(changed){ persist('focus'); if(fired.length) renderView(); }
}
document.addEventListener('visibilitychange', function(){ if(!document.hidden){ try{ checkAllAlarms(); checkBreakTimer(); }catch(e){} } });
window.addEventListener('focus', function(){ try{ checkAllAlarms(); }catch(e){} });
// ---- regular alarm overlay: music starts by itself ----
// Music is just another alarm sound: when an alarm has a song it plays instead of the beep.
// If it can't start, the beep rings instead — nothing to click.
function startAlarmMediaIfAny(al){
  if(!al || !al.mediaUrl) return false;
  const media = appleMusicFromLink(al.mediaUrl) || {url:al.mediaUrl};
  playWakeMedia(media, function(){ clearInterval(ringInterval); playBeep(); ringInterval = setInterval(playBeep, 2400); });
  return true;
}
function snoozeRegularAlarm(al){
  state.focus.snooze = {ts:Date.now()+5*60000, alarm:Object.assign({}, al||{}, {label:((al&&al.label)||'Reminder').replace(/ \(snoozed\)$/,'')+' (snoozed)', eventId:null, mediaUrl:null})};
  persist('focus');
}
// ---- music ----
// Wake-up music, most reliable first: a song or playlist from Apple Music (the Operator app
// asks the Music app to play it — your own library, no ads), an uploaded song (plays on this
// page, fading in), or a web/YouTube link (opens in a window; YouTube may run an ad first).
// When music is set there's no alarm beep — the beep only steps in if the music can't start.
const MUSIC_URL = 'http://127.0.0.1:8935/music/';
let wakeAudio = null, wakeAudioRamp = null, wakeMediaWin = null, wakeObjectUrl = null, wakeMusicApp = false;
function isDirectAudioUrl(u){ return /^data:audio\//i.test(u||'') || /\.(mp3|m4a|aac|wav|ogg|oga|flac|opus)(\?|#|$)/i.test(u||''); }
function appleMusicFromLink(u){
  const m = /music\.apple\.com\/[a-z]{2}\/(album|song|playlist)\/([^/?#]+)/i.exec(u||'');
  if(!m) return null;
  let q = m[2]; try{ q = decodeURIComponent(q); }catch(e){}
  return {type:'music', k: m[1].toLowerCase()==='playlist' ? 'playlist' : 'song', q: q.replace(/-/g, ' ').trim()};
}
function mediaKindLabel(m){ if(!m) return ''; if(m.type==='music') return 'Apple Music '+(m.k==='playlist'?'playlist':'song'); if(m.ref) return 'uploaded song'; return /youtu/.test(m.url||'') ? 'YouTube' : isDirectAudioUrl(m.url) ? 'song link' : 'link'; }
function mediaName(m){ return !m ? '' : m.type==='music' ? m.q : (m.name || m.url || 'Song'); }
const WAKE_HELPER = 'http://127.0.0.1:8935/';
// The launcher stops asking Chrome "which website is open?" while Operator is the window in front
// (each question made Chrome pause) — so tell it when that changes.
function opFocusPing(f){ helperFetch(WAKE_HELPER+'opfocus?f='+f, 2000); }
window.addEventListener('focus', function(){ opFocusPing(1); });
window.addEventListener('blur', function(){ opFocusPing(0); });
setTimeout(function(){ opFocusPing(document.hasFocus() ? 1 : 0); }, 1500);
function hexUtf8(str){ return Array.prototype.map.call(new TextEncoder().encode(String(str||'')), function(b){ return ('0'+b.toString(16)).slice(-2); }).join(''); }
function musicApp(cmd, media){
  return helperFetch(MUSIC_URL+cmd+(media ? '?k='+(media.k==='playlist'?'playlist':'song')+'&q='+hexUtf8(media.q) : ''), 4000);
}
async function playWakeMedia(media, onFail){
  stopWakeMedia(true);
  onFail = onFail || function(){};
  try{
    if(media.type==='music'){
      const ok = await musicApp('play', media);
      if(!ok){ onFail(); return false; }
      wakeMusicApp = true;
      return true;
    }
    if(media.ref || isDirectAudioUrl(media.url)){
      let src = media.url;
      if(media.ref){
        if(isBlobRef(media.ref)){ const b = await blobFetch(media.ref); if(!b){ onFail(); return false; } wakeObjectUrl = URL.createObjectURL(b); src = wakeObjectUrl; }
        else src = media.ref;
      }
      const a = new Audio(src);
      a.loop = true; a.volume = media.preview ? 0.6 : 0.15;
      wakeAudio = a;
      await a.play();
      if(!media.preview){
        clearInterval(wakeAudioRamp);
        wakeAudioRamp = setInterval(function(){ if(!wakeAudio){ clearInterval(wakeAudioRamp); return; } wakeAudio.volume = Math.min(1, wakeAudio.volume+0.03); if(wakeAudio.volume>=1) clearInterval(wakeAudioRamp); }, 1500);
      }
      return true;
    }
    // links open in the browser you pick (Firefox by default — its ad blocker skips YouTube ads)
    const via = wakeCfg().openIn || 'firefox';
    if(via!=='chrome'){
      try{
        const ctl = new AbortController(), tm = setTimeout(function(){ ctl.abort(); }, 3000);
        const res = await fetch(WAKE_HELPER+'open?b='+via+'&u='+hexUtf8(media.url), {signal:ctl.signal}); clearTimeout(tm);
        if(res.ok) return true;
      }catch(e){ /* no launcher (opened as a plain file) — fall back to a window here */ }
    }
    const w = window.open(media.url, 'operatorWakeMusic');
    if(!w){ onFail(); return false; }
    wakeMediaWin = w;
    return true;
  }catch(e){ wakeAudio = null; onFail(); return false; }
}
function stopWakeMedia(immediate){
  clearInterval(wakeAudioRamp); wakeFinishing = false;
  const a = wakeAudio; wakeAudio = null;
  if(a){
    if(immediate){ try{ a.pause(); }catch(e){} }
    else { const fade = setInterval(function(){ a.volume = Math.max(0, a.volume-0.1); if(a.volume<=0.01){ clearInterval(fade); try{ a.pause(); }catch(e){} } }, 120); }
  }
  if(wakeObjectUrl){ const u = wakeObjectUrl; wakeObjectUrl = null; setTimeout(function(){ URL.revokeObjectURL(u); }, 3000); }
  if(wakeMusicApp){ wakeMusicApp = false; musicApp('stop'); }
}
// "I'm up" doesn't cut the song off: it plays out to the end and then stops (no more looping,
// and in the Music app it pauses when the track is over). Stop ends it right away.
let wakeFinishing = false;
function finishWakeMedia(){
  clearInterval(wakeAudioRamp);
  const a = wakeAudio;
  if(a){
    a.loop = false; wakeFinishing = true;
    a.addEventListener('ended', function(){ if(wakeAudio===a) stopWakeMedia(true); wakeFinishing = false; if(overlayOpen('wakeOverlay')) renderWakeOverlayInto(); }, {once:true});
  }
  if(wakeMusicApp){ wakeFinishing = true; wakeMusicApp = false; musicApp('finish'); }
}
ACTIONS.wakeStopMusic = function(){
  const m = wakeCfg().media;
  stopWakeMedia(false);
  if(m && m.type==='music') musicApp('stop');
  renderWakeOverlayInto();
};
// the little "still playing" pill on the briefing
function wakeMusicPillHtml(){
  const m = wakeCfg().media;
  if(!m || !wakeFinishing) return '';
  return '<div class="brief-music"><span class="wk2-eq"><i></i><i></i><i></i><i></i></span><span class="brief-music-t">'+escapeHtml(mediaName(m))+'</span><span class="kpi-sub">plays out, then stops</span><button class="brief-music-x" data-action="wakeStopMusic" title="Stop the music now">&#9632;</button></div>';
}
// ---- the wake screen ----
let wakeRing = null; // {startedAt, test, soundFailed}
let wakeBeepTimer = null, wakeClockTimer = null;
function fireWake(opts){
  opts = opts || {};
  const w = wakeCfg();
  wakeRing = {startedAt:Date.now(), test:!!opts.test, snoozed:!!opts.snoozed, mediaFailed:false};
  ui.wakeMode = 'ring'; ui.wakeBoardBig = false;
  closeOtherOverlaysForWake();
  showOverlay('wakeOverlay');
  renderWakeOverlayInto();
  pingWrapper();
  const startBeeps = function(){ clearInterval(wakeBeepTimer); playAlarmSound(wakeBeepSound(w)); wakeBeepTimer = setInterval(function(){ playAlarmSound(wakeBeepSound(w)); }, 2600); };
  if(wakeUsesMusic(w)){
    const ring = wakeRing;
    const tryMusic = function(n){
      playWakeMedia(w.media, function(){
        if(wakeRing!==ring) return;
        if(!wakeBeepTimer) startBeeps();
        ring.mediaFailed = true; renderWakeOverlayInto();
        // keep trying the music for a minute — the moment it plays, the beeping stops
        if(n < 8) setTimeout(function(){ if(wakeRing===ring) tryMusic(n+1); }, 6000);
      }).then(function(ok){ if(ok && wakeRing===ring){ clearInterval(wakeBeepTimer); wakeBeepTimer = null; ring.mediaFailed = false; renderWakeOverlayInto(); } });
    };
    tryMusic(0);
  } else startBeeps();
  try{ if('Notification' in window && Notification.permission==='granted') new Notification('Operator: Time to get up'); }catch(e){}
}
// The alarm sound is one choice: Peaceful / Standard / Loud — or Music (your song or playlist).
function wakeUsesMusic(w){ return !!(w && w.media && w.useMusic!==false); }
function wakeBeepSound(w){ return w && ['peaceful','standard','loud'].indexOf(w.sound)>=0 ? w.sound : 'standard'; }
function closeOtherOverlaysForWake(){
  if(overlayOpen('alarmOverlay')){ clearInterval(ringInterval); hideOverlay('alarmOverlay'); }
}
function stopWakeRing(){
  clearInterval(wakeBeepTimer); wakeBeepTimer = null;
  stopWakeMedia(false);
  wakeRing = null;
  hideOverlay('wakeOverlay');
}
// "I'm up" stops the alarm and turns the screen into the morning briefing — the day ahead,
// yesterday in numbers, the goals — then Lock in or Let's go takes you into the day.
function wakeImUp(){
  const wasTest = wakeRing && wakeRing.test;
  clearInterval(wakeBeepTimer); wakeBeepTimer = null;
  finishWakeMedia();
  wakeRing = null;
  if(!wasTest && state.modes.active && state.modes.active.sleep) finishActiveMode(true);
  ui.wakeMode = 'brief'; ui.wakeBriefTest = !!wasTest; ui.wakeBoardBig = false; ui.wakeIntroDone = false;
  playWakeChime();
  renderWakeOverlayInto();
  // after the intro has played, take it out (so re-renders don't replay it)
  clearTimeout(ui._wakeIntroT);
  ui._wakeIntroT = setTimeout(function(){ if(ui.wakeMode==='brief' && !ui.wakeIntroDone){ ui.wakeIntroDone = true; renderWakeOverlayInto(); } }, 3600);
}
function endBriefing(){
  ui.wakeMode = null;
  hideOverlay('wakeOverlay');
  ui.view = 'today';
  renderView();
}
ACTIONS.wakeBriefDone = function(){ const t = ui.wakeBriefTest; endBriefing(); showToast(t ? 'Test done — that\'s how your mornings will look.' : 'Let\'s get it.', {icon:'&#9728;&#65039;'}); };
ACTIONS.wakeBriefLockIn = function(el, e, id){ endBriefing(); if(id) setNextUp(id); renderView(); openLockInChooser(); };
ACTIONS.wakeBoardToggle = function(){ ui.wakeBoardBig = !ui.wakeBoardBig; renderWakeOverlayInto(); };
function wakeSnooze(){
  const mins = wakeCfg().snoozeMinutes||9;
  const test = wakeRing && wakeRing.test;
  stopWakeRing();
  state.focus.snooze = {ts:Date.now()+mins*60000, wake:true, test:test};
  persist('focus'); renderView();
  showToast('Snoozed — ringing again at '+fmt12Hour(nowHM(new Date(Date.now()+mins*60000))), {icon:'&#128164;'});
}
ACTIONS.wakeImUp = function(){ wakeImUp(); };
ACTIONS.wakeSnooze = function(){ wakeSnooze(); };
ACTIONS.wakePlayMusic = function(){ const w = wakeCfg(); if(w.media) playWakeMedia(w.media, function(){ showToast('Couldn\'t play that — try uploading the song file instead.', {icon:'&#9888;'}); }); clearInterval(wakeBeepTimer); if(wakeRing){ wakeRing.mediaFailed = false; renderWakeOverlayInto(); } };
function wakeGreeting(){ const h = new Date().getHours(); return h<5 ? 'Still up' : h<12 ? 'Good morning' : h<18 ? 'Good afternoon' : 'Good evening'; }
function upcomingNightPlan(){ const np = state.focus.nightPlan; return (np && np.date>=todayStr()) ? np : null; }
function wakeTodayPlan(){
  const np = upcomingNightPlan(), today = todayStr();
  const planTasks = np && np.date===today ? arr(np.taskIds).map(function(id){ return state.tasks.items.find(function(t){ return t.id===id; }); }).filter(Boolean) : [];
  const tasks = planTasks.length ? planTasks : lineupOrdered(state.tasks.items.filter(function(t){ return t.status==='today'; }));
  return {note: np && np.date===today ? np.note : '', tasks: tasks.filter(function(t){ return t.status!=='done'; }).slice(0, 6)};
}
function wakeWeatherLine(){
  const now = typeof wxNow==='function' ? wxNow() : null;
  return now ? wxIcon(wxKind(now.code), skyPhase())+' '+now.temp+'&deg; '+escapeHtml(wxLabel(now.code).toLowerCase())+(now.hi!=null ? ' &middot; high '+now.hi+'&deg;' : '') : '';
}
function wakeRingHtml(){
  const w = wakeCfg();
  const playing = wakeUsesMusic(w) && !(wakeRing && wakeRing.mediaFailed);
  return '<div class="wk2" data-sky="'+skyPhase()+'">'+
    '<div class="wk2-aura"><i></i><i></i><i></i></div>'+
    '<div class="wk2-center">'+
      '<div class="wk2-greet">'+wakeGreeting()+(state.profile.name?', '+escapeHtml(state.profile.name):'')+(wakeRing && wakeRing.test ? ' <span class="tag">TEST</span>' : '')+'</div>'+
      '<div class="wk2-clock" id="wakeClock">'+new Date().toLocaleTimeString(undefined,{hour:'numeric', minute:'2-digit'})+'</div>'+
      '<div class="wk2-date">'+new Date().toLocaleDateString(undefined,{weekday:'long', month:'long', day:'numeric'})+(wakeWeatherLine() ? ' &middot; '+wakeWeatherLine() : '')+'</div>'+
      '<div class="wk2-actions">'+
        '<button class="wk2-up" data-action="wakeImUp"><span>&#9728;&#65039; I\'m up</span></button>'+
        '<button class="wk2-snooze" data-action="wakeSnooze">Snooze '+(w.snoozeMinutes||9)+' min</button>'+
      '</div>'+
      (wakeUsesMusic(w) ? '<div class="wk2-music'+(playing?' is-playing':'')+'">'+
          (playing ? '<span class="wk2-eq"><i></i><i></i><i></i><i></i></span>' : '')+
          '<span class="wk2-song">'+escapeHtml(mediaName(w.media))+'</span><span class="wk2-src">'+(wakeRing && wakeRing.mediaFailed ? 'starting the music…' : escapeHtml(mediaKindLabel(w.media)))+'</span>'+
        '</div>' : '')+
    '</div>'+
  '</div>';
}
function wakeBriefHtml(){
  const today = todayStr(), y = addDays(today, -1);
  const yDeep = deepWorkMinutesFor(y), target = state.standards.deepWorkTargetMinutes || 180;
  const yDone = state.tasks.items.filter(function(t){ return t.completedAt===y; }).length;
  const yWork = typeof workoutDay==='function' ? workoutDay(y) : {n:0, m:0};
  const yStd = dayStandardsComplete(y);
  const plan = wakeTodayPlan();
  const events = state.calendar.events.filter(function(e){ return e.date===today; }).sort(function(a,c){ return (a.time||'').localeCompare(c.time||''); });
  const deadlines = state.tasks.items.filter(function(t){ return t.deadline===today && t.status!=='done'; });
  const why = arr(state.focus.motivations && state.focus.motivations.toward).slice(0, 3);
  const goals = typeof masterGoalDefs==='function' ? masterGoalDefs() : [];
  const first = plan.tasks[0];
  const notes = morningNotesFor(today).map(function(n){ return n.text; });
  if(plan.note && notes.indexOf(plan.note)<0) notes.unshift(plan.note);
  const vb = masterVisionBoard();
  // It opens like a phone starting up: one big "Good morning" fades in out of a blur, holds,
  // then lifts away and the briefing builds in underneath. Click to skip.
  const intro = !ui.wakeIntroDone;
  let d = intro ? 2700 : 0; const step = function(){ d += 90; return ' style="animation-delay:'+d+'ms"'; };
  const stat = function(v, k, good){ return '<div class="br-stat'+(good?' is-good':'')+'"><div class="br-stat-v">'+v+'</div><div class="br-stat-k">'+k+'</div></div>'; };
  return '<div class="brief'+(ui.wakeBoardBig?' board-open':'')+'">'+
    (intro ? '<div class="brief-intro" data-action="wakeIntroSkip" title="Click to skip"><div class="bi-glow"></div><div class="bi-word">'+wakeGreeting()+'</div>'+(state.profile.name ? '<div class="bi-name">'+escapeHtml(state.profile.name)+'</div>' : '')+'</div>' : '')+
    '<div class="brief-grid-bg"></div>'+
    '<div class="brief-inner">'+
      '<div class="brief-top"'+step()+'><span class="brief-brand">OPERATOR</span><span class="brief-dot"></span><span>Morning briefing</span><span class="brief-sys">All systems go</span></div>'+
      '<h1 class="brief-hello"'+step()+'>'+wakeGreeting()+(state.profile.name ? ', <span>'+escapeHtml(state.profile.name)+'</span>' : '')+'.</h1>'+
      '<div class="brief-sub"'+step()+'>'+new Date().toLocaleDateString(undefined,{weekday:'long', month:'long', day:'numeric'})+' &middot; '+new Date().toLocaleTimeString(undefined,{hour:'numeric', minute:'2-digit'})+(wakeWeatherLine() ? ' &middot; '+wakeWeatherLine() : '')+'</div>'+
      wakeMusicPillHtml()+
      (notes.length ? '<section class="br-lastnight"'+step()+'><div class="br-k">&#127769; From last night</div>'+notes.map(function(t){ return '<div class="br-ln-text">'+escapeHtml(t)+'</div>'; }).join('')+'</section>' : '')+
      (vb && vb.elements.length ? '<section class="br-vision"'+step()+' data-action="wakeBoardToggle" title="Open your vision board">'+
          '<span class="br-vision-k">&#127775; Vision</span>'+boardStaticHtml(vb, 'wake-board')+'<span class="br-vision-hint">Click to open</span></section>' : '')+
      '<div class="brief-cols">'+
        '<section class="br-card"'+step()+'><div class="br-k">Yesterday</div><div class="br-stats">'+
          stat(fmtHours(yDeep), 'deep work', yDeep>=target)+stat(yDone, 'tasks done')+stat(yWork.n ? yWork.n+(yWork.m?' &middot; '+fmtDurationLabel(yWork.m):'') : '—', 'workouts', yWork.n>0)+stat(computeStreak()+'d', 'streak', yStd)+
        '</div><div class="br-line">'+(yStd ? '&#10003; You hit the standard — keep the run going.' : yDeep ? 'Short of the standard. Today\'s a clean slate.' : 'No deep work logged. Today we change that.')+'</div></section>'+
        '<section class="br-card br-today"'+step()+'><div class="br-k">Today\'s plan</div>'+
          (plan.note ? '<div class="br-note">'+escapeHtml(plan.note)+'</div>' : '')+
          (plan.tasks.length ? '<ol class="br-list">'+plan.tasks.map(function(t, i){ return '<li'+(i===0?' class="is-first"':'')+'>'+priorityTag(t.priority)+'<span>'+escapeHtml(t.title)+'</span>'+(i===0?'<em>first up</em>':'')+'</li>'; }).join('')+'</ol>' : '<div class="br-line">Nothing lined up yet — pick your first move.</div>')+
          ((events.length || deadlines.length) ? '<div class="br-k" style="margin-top:12px;">On the calendar</div><div class="br-agenda">'+
            events.map(function(e){ return '<div><b>'+(e.time ? fmt12Hour(e.time) : 'All day')+'</b> '+escapeHtml(e.title)+'</div>'; }).join('')+
            deadlines.map(function(t){ return '<div><b class="is-due">Due'+(t.deadlineTime ? ' '+fmt12Hour(t.deadlineTime) : '')+'</b> '+escapeHtml(t.title)+'</div>'; }).join('')+'</div>' : '')+
        '</section>'+
        '<section class="br-card"'+step()+'><div class="br-k">Goals</div><div class="br-goals">'+
          goals.map(function(m){ const pct = masterPct(m); return '<div class="br-goal" style="--mg1:'+m.color+';--mg2:'+m.color2+';"><span class="br-goal-k">'+m.icon+' '+m.label+'</span><span class="br-goal-v">'+(m.cur==null ? '—' : m.fmt(m.cur))+'</span><span class="br-goal-bar"><i style="width:'+pct.toFixed(0)+'%"></i></span></div>'; }).join('')+
        '</div>'+(why.length ? '<div class="br-k" style="margin-top:12px;">Why</div><div class="br-why">'+why.map(function(m){ return '<span>'+escapeHtml(m.text)+'</span>'; }).join('')+'</div>' : '')+'</section>'+
      '</div>'+
      '<div class="brief-cta"'+step()+'>'+
        (first ? '<button class="brief-go" data-action="wakeBriefLockIn" data-id="'+first.id+'">&#128274; Lock in on &ldquo;'+escapeHtml(first.title)+'&rdquo;</button>' : '<button class="brief-go" data-action="wakeBriefLockIn">&#128274; Lock in</button>')+
        '<button class="brief-later" data-action="wakeBriefDone">Let\'s go &rarr;</button>'+
      '</div>'+
    '</div>'+
    (ui.wakeBoardBig && vb ? '<div class="br-vision-big" data-action="wakeBoardToggle" title="Close">'+boardStaticHtml(vb, 'wake-board')+'<button class="wk2-vision-x" data-action="wakeBoardToggle">&#10005;</button></div>' : '')+
  '</div>';
}
ACTIONS.wakeIntroSkip = function(){ ui.wakeIntroDone = true; renderWakeOverlayInto(); };
function renderWakeScreen(){ return ui.wakeMode==='brief' ? wakeBriefHtml() : wakeRingHtml(); }
function renderWakeOverlayInto(){
  const el = document.getElementById('wakeContent'); if(!el) return;
  morphInto(el, renderWakeScreen());
  requestAnimationFrame(function(){ fitStaticBoards(el); });
  setTimeout(function(){ fitStaticBoards(el); }, 500);
  clearInterval(wakeClockTimer);
  wakeClockTimer = setInterval(function(){
    if(!overlayOpen('wakeOverlay')){ clearInterval(wakeClockTimer); return; }
    const c = document.getElementById('wakeClock');
    if(c) c.textContent = new Date().toLocaleTimeString(undefined,{hour:'numeric', minute:'2-digit'});
  }, 1000);
}
registerModal('wakeOverlay', renderWakeOverlayInto);
// ---- setup modal ----
function openWakeSetup(){ ui.wakeOverrideDate = wakeTargetDate(); showOverlay('wakeSetupOverlay'); renderWakeSetupInto(); }
ACTIONS.openWakeSetup = openWakeSetup;
ACTIONS.closeWakeSetup = function(){ hideOverlay('wakeSetupOverlay'); stopWakeMedia(true); renderView(); };
function renderWakeSetup(){
  const w = wakeCfg();
  const od = ui.wakeOverrideDate || wakeTargetDate();
  const ov = w.override && w.override.date===od ? w.override : null;
  const base = wakeBaseTimeFor(od);
  const eff = wakeTimeFor(od);
  const nw = nextWake();
  const names = ['S','M','T','W','T','F','S'];
  const sn = state.focus.snooze;
  return '<div class="wake-setup">'+
    '<div class="row" style="justify-content:space-between;align-items:flex-start;gap:12px;">'+
      '<div class="section-title" style="margin:0;">&#9200; Wake-up alarm'+tip('Your one daily alarm — it opens the wake screen with your vision board, today\'s plan and your music.')+'</div>'+
      '<label class="ws-switch" title="Turn the daily alarm on/off"><input type="checkbox" data-wake="enabled" '+(w.enabled?'checked':'')+'><span></span></label>'+
    '</div>'+
    '<div class="ws-main'+(w.enabled?'':' is-off')+'">'+
      '<input class="ws-time" type="time" data-wake="time" value="'+w.time+'">'+
      '<div class="ws-days">'+names.map(function(n, d){ return '<button class="ws-day'+(w.days.indexOf(d)>=0?' is-on':'')+'" data-action="wakeDay" data-id="'+d+'" title="'+['Sunday','Monday','Tuesday','Wednesday','Thursday','Friday','Saturday'][d]+'">'+n+'</button>'; }).join('')+'</div>'+
      '<div class="kpi-sub">'+(w.enabled ? fmt12Hour(w.time)+' '+wakeDaysLabel(w.days) : 'Daily alarm is off')+'</div>'+
    '</div>'+
    '<div class="ws-next">'+(nw ? 'Next ring: <b>'+fmt12Hour(nw.time)+' '+morningLabel(nw.date)+'</b> ('+weekdayShort(nw.date)+') &middot; in '+untilLabel(nw.ts)+(nw.override?' &middot; one-time change':'') : 'Nothing will ring — turn the alarm on or set a time below.')+(sn && sn.wake ? '<br>'+(sn.test?'Test':'Snooze')+' ringing at '+fmt12Hour(nowHM(new Date(sn.ts))) : '')+'</div>'+
    '<div class="ws-block">'+
      '<div class="kind-label">Just for '+morningLabel(od)+' ('+weekdayShort(od)+')'+tip('Change the time — or skip the alarm — for this one morning. Your daily alarm stays the same.')+'</div>'+
      '<div class="row" style="gap:8px;flex-wrap:wrap;">'+
        '<input class="input" type="time" data-wake="overrideTime" value="'+(eff||'')+'" style="width:130px;">'+
        '<button class="btn btn-ghost btn-sm'+(ov && ov.off?' is-active':'')+'" data-action="wakeSkip">No alarm that morning</button>'+
        (ov ? '<button class="btn btn-ghost btn-sm" data-action="wakeClearOverride">Back to usual'+(base?' ('+fmt12Hour(base)+')':'')+'</button>' : '')+
      '</div>'+
      (ov || !base ? '<div class="kpi-sub" style="margin-top:4px;">'+(ov ? (ov.off ? 'No alarm '+morningLabel(od)+'.' : 'Changed to '+fmt12Hour(ov.time)+' for '+morningLabel(od)+' only.') : 'No alarm usually that day.')+'</div>' : '')+
    '</div>'+
    '<div class="ws-block">'+
      '<div class="kind-label">Alarm sound'+tip('Pick a tone, or Music to wake up to a song or playlist — the music plays instead of the tone. If the music ever can\'t start, your tone rings instead, so you still wake up.')+'</div>'+
      '<div class="ws-sounds">'+[['peaceful','&#127808;','Peaceful'],['standard','&#128276;','Standard'],['loud','&#128226;','Loud']].map(function(x){ const on = !wakeUsesMusic(w) && wakeBeepSound(w)===x[0]; return '<button class="ws-sound'+(on?' is-on':'')+'" data-action="wakeSound" data-id="'+x[0]+'"><span class="ws-sound-i">'+x[1]+'</span>'+x[2]+'</button>'; }).join('')+
        '<button class="ws-sound ws-sound-music'+(wakeUsesMusic(w) || ui.wakeMusicOpen ? ' is-on' : '')+'" data-action="wakeUseMusic"><span class="ws-sound-i">&#9835;</span>Music</button>'+
      '</div>'+
      (wakeUsesMusic(w) || ui.wakeMusicOpen ? '<div class="ws-music-pane">'+
        (w.media ? '<div class="ws-media"><span>&#9835; '+escapeHtml(mediaName(w.media))+'</span><span class="kpi-sub">'+escapeHtml(mediaKindLabel(w.media))+'</span><span style="flex:1"></span>'+
          '<button class="btn btn-ghost btn-sm" data-action="wakePreviewMusic">'+((wakeAudio||wakeMusicApp)?'&#10073;&#10073; Stop':'&#9654; Test')+'</button><button class="btn btn-ghost btn-sm mini-move-danger" data-action="wakeClearMusic">Remove</button></div>' : '')+
        wakeMusicPickerHtml(w)+
        '<input type="file" id="wakeMusicFile" accept="audio/*" style="display:none;">'+
        '<div class="kpi-sub" style="margin-top:8px;">Backup if the music can\'t start: '+['peaceful','standard','loud'].map(function(x){ return '<button class="ws-backup'+(wakeBeepSound(w)===x?' is-on':'')+'" data-action="wakeBackupSound" data-id="'+x+'">'+x[0].toUpperCase()+x.slice(1)+'</button>'; }).join(' ')+'</div>'+
      '</div>' : '<div class="row" style="margin-top:8px;"><button class="btn btn-ghost btn-sm" data-action="wakePreviewSound">&#9654; Hear it</button></div>')+
    '</div>'+
    '<div class="ws-block grid grid-2">'+
      '<div class="field"><label>Snooze length</label><select class="input" data-wake="snoozeMinutes">'+[5,9,10,15,20].map(function(m){ return '<option value="'+m+'" '+(w.snoozeMinutes===m?'selected':'')+'>'+m+' minutes</option>'; }).join('')+'</select></div>'+
    '</div>'+
    '<div class="row" style="margin-top:18px;justify-content:space-between;gap:8px;flex-wrap:wrap;">'+
      '<div class="row" style="gap:8px;"><button class="btn btn-ghost btn-sm" data-action="wakeTestSoon" title="Rings in one minute — switch to another app to check it comes up on its own">&#128276; Test: ring in 1 min</button><button class="btn btn-ghost btn-sm" data-action="wakeTestNow">Preview wake screen</button></div>'+
      '<button class="btn btn-primary" data-action="closeWakeSetup">Done</button>'+
    '</div>'+
  '</div>';
}
function renderWakeSetupInto(){ const el = document.getElementById('wakeSetupContent'); if(el) morphInto(el, renderWakeSetup(), {form:true}); }
registerModal('wakeSetupOverlay', renderWakeSetupInto);
function saveWake(){ persist('focus'); renderWakeSetupInto(); }
ACTIONS.wakeDay = function(el, e, id){
  const w = wakeCfg(), d = Number(id), i = w.days.indexOf(d);
  if(i>=0) w.days.splice(i,1); else w.days.push(d);
  w.days.sort(); wakeArm(); saveWake();
};
ACTIONS.wakeSkip = function(){
  const w = wakeCfg(), od = ui.wakeOverrideDate || wakeTargetDate();
  w.override = (w.override && w.override.date===od && w.override.off) ? null : {date:od, off:true};
  wakeArm(); saveWake();
};
ACTIONS.wakeClearOverride = function(){ wakeCfg().override = null; wakeArm(); saveWake(); };
ACTIONS.wakeSound = function(el, e, id){ const w = wakeCfg(); w.sound = id; w.useMusic = false; ui.wakeMusicOpen = false; stopWakeMedia(true); playAlarmSound(id); saveWake(); };
ACTIONS.wakeBackupSound = function(el, e, id){ wakeCfg().sound = id; playAlarmSound(id); saveWake(); };
ACTIONS.wakeUseMusic = function(){ const w = wakeCfg(); if(w.media) w.useMusic = true; ui.wakeMusicOpen = true; saveWake(); };
ACTIONS.wakePreviewSound = function(){ playAlarmSound(wakeCfg().sound); };
ACTIONS.wakePickMusic = function(){ const f = document.getElementById('wakeMusicFile'); if(f) f.click(); };
ACTIONS.wakeClearMusic = function(){ stopWakeMedia(true); const w = wakeCfg(); if(w.media && isBlobRef(w.media.ref)) blobRemove(w.media.ref); w.media = null; w.useMusic = false; saveWake(); };
ACTIONS.wakePreviewMusic = function(){
  if(wakeAudio || wakeMusicApp){ stopWakeMedia(true); renderWakeSetupInto(); return; }
  const w = wakeCfg(); if(!w.media) return;
  playWakeMedia(Object.assign({}, w.media, {preview:true}), function(){
    showToast(w.media.type==='music' ? 'Apple Music plays through the Operator app — open Operator from its icon (not the file in a browser).' : 'Couldn\'t play that here.', {icon:'&#9888;', duration:7000});
  }).then(renderWakeSetupInto);
};
// Music source picker in the setup: Apple Music (by name or link), a song file, or a link.
function wakeMusicPickerHtml(w){
  const src = ui.wakeSrc || (w.media ? (w.media.type==='music' ? 'music' : w.media.ref ? 'upload' : 'link') : 'music');
  const kind = ui.wakeMusicKind || (w.media && w.media.type==='music' ? w.media.k : 'song');
  const tab = function(id, label){ return '<button class="seg-tab'+(src===id?' active':'')+'" data-action="wakeMusicSource" data-id="'+id+'">'+label+'</button>'; };
  const help = src==='music' ? 'Plays from your Apple Music library through the Music app — no ads, and the volume fades up. The first time, macOS asks to let Operator control Music: click OK (do it now with Test, so it never asks in the morning).'
    : src==='upload' ? 'Plays right on the wake screen and fades in.'
    : 'Opens and plays by itself. YouTube may play an ad first — Apple Music or a song file start instantly.';
  return '<div class="ws-src-row"><div class="seg-tabs ws-src" style="margin:0;">'+tab('music','&#63743; Apple Music')+tab('upload','&#11014; Song file')+tab('link','&#128279; Link')+'</div>'+tip(help)+'</div>'+
    (src==='music' ? '<div class="row" style="gap:8px;flex-wrap:wrap;">'+
        '<input class="input" id="wakeMusicQuery" placeholder="Song or playlist name (or an Apple Music link)" value="'+escapeHtml(w.media && w.media.type==='music' ? w.media.q : '')+'" style="flex:1;min-width:220px;">'+
        '<div class="seg-tabs" style="margin:0;"><button class="seg-tab'+(kind==='song'?' active':'')+'" data-action="wakeMusicKind" data-id="song">Song</button><button class="seg-tab'+(kind==='playlist'?' active':'')+'" data-action="wakeMusicKind" data-id="playlist">Playlist</button></div>'+
        '<button class="btn btn-sm btn-primary" data-action="wakeSetAppleMusic">Use it</button>'+
      '</div>'
    : src==='upload' ? '<button class="btn btn-sm" data-action="wakePickMusic">&#11014; Choose a song file</button>'
    : '<input class="input" data-wake="mediaUrl" placeholder="YouTube or song link" value="'+escapeHtml(w.media && w.media.url ? w.media.url : '')+'" style="width:100%;">'+
      '<div class="row" style="gap:8px;margin-top:8px;align-items:center;"><span class="kpi-sub">Open in</span><div class="seg-tabs" style="margin:0;">'+[['firefox','Firefox'],['safari','Safari'],['chrome','Chrome']].map(function(b){ return '<button class="seg-tab'+((w.openIn||'firefox')===b[0]?' active':'')+'" data-action="wakeOpenIn" data-id="'+b[0]+'">'+b[1]+'</button>'; }).join('')+'</div>'+tip('Firefox with an ad blocker plays YouTube without the ads. If Firefox isn\'t installed it opens in your default browser.')+'</div>');
}
ACTIONS.wakeMusicSource = function(el, e, id){ ui.wakeSrc = id; renderWakeSetupInto(); };
ACTIONS.wakeMusicKind = function(el, e, id){ ui.wakeMusicKind = id; renderWakeSetupInto(); };
ACTIONS.wakeSetAppleMusic = function(){
  const inp = document.getElementById('wakeMusicQuery');
  const v = inp ? inp.value.trim() : '';
  if(!v){ if(inp) inp.focus(); return; }
  const w = wakeCfg();
  const fromLink = appleMusicFromLink(v);
  if(w.media && isBlobRef(w.media.ref)) blobRemove(w.media.ref);
  w.media = fromLink || {type:'music', q:v, k: ui.wakeMusicKind || 'song'};
  w.useMusic = true;
  saveWake();
  showToast('Wake-up music: '+mediaName(w.media)+' (Apple Music) — hit Test to hear it', {icon:'&#9835;', duration:5000});
};
ACTIONS.wakeTestNow = function(){ hideOverlay('wakeSetupOverlay'); stopWakeMedia(true); fireWake({test:true}); };
ACTIONS.wakeTestSoon = function(){
  state.focus.snooze = {ts:Date.now()+60000, wake:true, test:true};
  persist('focus'); renderWakeSetupInto();
  showToast('Test alarm rings at '+fmt12Hour(nowHM(new Date(Date.now()+60000)))+' — switch to another app if you want to see it pop up.', {icon:'&#128276;', duration:6000});
};
document.addEventListener('change', function(e){
  const t = e.target;
  if(t.id==='wakeMusicFile'){
    const file = t.files && t.files[0]; if(!file) return;
    t.value = '';
    blobStore(file).then(function(ref){
      const w = wakeCfg();
      if(w.media && isBlobRef(w.media.ref)) blobRemove(w.media.ref);
      w.media = {ref:ref, name:file.name.replace(/\.[^.]+$/, '')};  w.useMusic = true;
      saveWake();
      showToast('Wake-up song set: '+w.media.name, {icon:'&#9835;'});
    });
    return;
  }
  const key = t.dataset && t.dataset.wake; if(!key) return;
  const w = wakeCfg();
  if(key==='enabled'){ w.enabled = t.checked; wakeArm(); }
  else if(key==='time'){ if(t.value){ w.time = t.value; wakeArm(); } }
  else if(key==='overrideTime'){
    const od = ui.wakeOverrideDate || wakeTargetDate();
    if(!t.value){ w.override = {date:od, off:true}; }
    else if(t.value===wakeBaseTimeFor(od)) w.override = null;
    else w.override = {date:od, time:t.value};
    wakeArm();
  }
  else if(key==='mediaUrl'){
    const v = t.value.trim();
    if(!v){ if(w.media && w.media.url) w.media = null; }
    else {
      if(w.media && isBlobRef(w.media.ref)) blobRemove(w.media.ref);
      w.media = appleMusicFromLink(v) || {url:v, name:/youtu/.test(v)?'YouTube':v.replace(/^https?:\/\/(www\.)?/,'').slice(0,40)}; w.useMusic = true;
    }
  }
  else if(key==='snoozeMinutes') w.snoozeMinutes = Number(t.value)||9;
  saveWake();
  renderView();
});
// ---- small pieces shown elsewhere ----
function wakeChipHtml(){
  const nw = nextWake();
  return '<button class="wake-chip'+(nw?'':' is-unset')+'" data-action="openWakeSetup" title="Wake-up alarm">&#9200; '+
    (nw ? fmt12Hour(nw.time)+' '+morningLabel(nw.date) : 'Set wake-up alarm')+'</button>';
}
// ---- break timer: breaks end on their own ----
function checkBreakTimer(){
  const as = state.focus && state.focus.activeSession;
  if(!as || !as.onBreak || !as.breakEndsAt) return;
  const left = as.breakEndsAt-Date.now();
  const el = document.getElementById('breakRemaining');
  if(el) el.textContent = left>0 ? formatElapsed(left)+' left' : 'Break over';
  if(left<=0){
    as.breakEndsAt = null;
    endBreakModeFromFocus();
    playSessionComplete();
    pingWrapper();
    showToast('Break\'s over — back to it.', {icon:'&#9201;', duration:6000});
    try{ if('Notification' in window && Notification.permission==='granted') new Notification('Operator: Break is over'); }catch(e){}
  }
}
ACTIONS.extendBreak = function(el){
  const as = state.focus.activeSession; if(!as || !as.onBreak) return;
  const m = Number(el.dataset.minutes)||5;
  as.breakEndsAt = Math.max(as.breakEndsAt||Date.now(), Date.now()) + m*60000;
  persist('focus'); renderView();
};
ACTIONS.pickBreakMinutes = function(el){ ui.breakMinutes = el.dataset.minutes==='open' ? 'open' : Number(el.dataset.minutes); renderBreakNoteModalInto(); };
// ---- alarms that go with a task: at the time, time to leave, start getting ready ----
function upsertOwnedAlarm(owner, mapKey, kind, dateStr, hm, label, link){
  owner[mapKey] = owner[mapKey] || {};
  const existingId = owner[mapKey][kind];
  if(!dateStr || !hm){
    if(existingId){ state.focus.alarms = state.focus.alarms.filter(function(a){ return a.id!==existingId; }); delete owner[mapKey][kind]; }
    return;
  }
  let a = existingId ? state.focus.alarms.find(function(x){ return x.id===existingId; }) : null;
  if(!a){ a = {id:uid(), days:[], enabled:true, armedAt:Date.now()}; state.focus.alarms.push(a); owner[mapKey][kind] = a.id; }
  if(a.time!==hm || a.date!==dateStr) a.lastFiredTs = 0;
  a.time = hm; a.date = dateStr; a.label = label; a.kind = kind; a.enabled = true;
  Object.assign(a, link||{});
}
function taskAlarmPlan(t){
  const al = t.alarm;
  if(!al || !t.deadline || !t.deadlineTime) return [];
  const start = localTs(t.deadline, t.deadlineTime);
  const at = function(ts){ const d = new Date(ts); return {date:todayStr(d), time:nowHM(d)}; };
  const out = [];
  const travel = Number(al.travel)||0, ready = Number(al.ready)||0;
  if(ready>0) out.push(Object.assign({kind:'ready', label:'Start getting ready — '+t.title}, at(start-(travel+ready)*60000)));
  if(travel>0) out.push(Object.assign({kind:'leave', label:'Time to leave — '+t.title}, at(start-travel*60000)));
  if(al.on) out.push(Object.assign({kind:'at', label:t.title}, at(start)));
  return out;
}
function syncTaskAlarms(t){
  const plan = taskAlarmPlan(t);
  ['ready','leave','at'].forEach(function(kind){
    const p = plan.find(function(x){ return x.kind===kind; });
    upsertOwnedAlarm(t, 'alarmIds', kind, p?p.date:null, p?p.time:null, p?p.label:'', {taskId:t.id});
  });
  if(t.alarmIds && !Object.keys(t.alarmIds).length) delete t.alarmIds;
  persist('focus');
}
function taskAlarmFieldsHtml(prefix, t){
  const al = (t && t.alarm) || {};
  return '<div class="task-alarm-box">'+
    '<label class="row" style="gap:6px;font-size:12.5px;color:var(--text-dim);"><input type="checkbox" id="'+prefix+'AlarmOn" '+(al.on?'checked':'')+'>&#9200; Alarm at the deadline time'+tip('Needs a deadline time. Add travel and get-ready minutes for extra alarms — e.g. 9:00 AM, 60 min travel, 60 min to get ready → up at 7:00, leave at 8:00.')+'</label>'+
    '<div class="row" style="gap:10px;margin-top:8px;flex-wrap:wrap;align-items:center;">'+
      '<span class="kpi-sub">Travel</span><input class="input" type="number" min="0" step="5" id="'+prefix+'AlarmTravel" value="'+(al.travel||'')+'" placeholder="0" style="width:74px;"><span class="kpi-sub">min</span>'+
      '<span class="kpi-sub" style="margin-left:6px;">Get ready</span><input class="input" type="number" min="0" step="5" id="'+prefix+'AlarmReady" value="'+(al.ready||'')+'" placeholder="0" style="width:74px;"><span class="kpi-sub">min</span>'+
    '</div>'+
    '<div class="kpi-sub" id="'+prefix+'AlarmHint" style="margin-top:6px;">'+taskAlarmHint(t)+'</div>'+
  '</div>';
}
function taskAlarmHint(t){
  const plan = t ? taskAlarmPlan(t) : [];
  if(!plan.length) return t && t.alarm && !(t.deadline && t.deadlineTime) ? 'Needs a deadline time.' : '';
  return plan.map(function(p){ return (p.kind==='ready'?'Get ready':p.kind==='leave'?'Leave':'Alarm')+' '+fmt12Hour(p.time)+(p.date!==t.deadline?' ('+weekdayShort(p.date)+')':''); }).join(' &middot; ');
}
function readTaskAlarmFields(prefix){
  const g = function(id){ return document.getElementById(prefix+id); };
  if(!g('AlarmOn')) return undefined;
  const on = g('AlarmOn').checked, travel = Number(g('AlarmTravel').value)||0, ready = Number(g('AlarmReady').value)||0;
  return (on || travel || ready) ? {on:on, travel:travel, ready:ready} : null;
}
// live hint while typing in the task modals
document.addEventListener('input', function(e){
  const t = e.target; if(!t.id) return;
  const m = /^(newTask|editTask-.+?-)(AlarmOn|AlarmTravel|AlarmReady)$|^(newTaskDeadline(Time)?)$|^(editDeadline(Time)?-.+)$/.exec(t.id);
  if(!m) return;
  const prefix = m[1] || (m[3] ? 'newTask' : 'editTask-'+t.id.replace(/^editDeadline(Time)?-/, '')+'-');
  const hint = document.getElementById(prefix+'AlarmHint'); if(!hint) return;
  const dl = prefix==='newTask' ? document.getElementById('newTaskDeadline') : document.getElementById('editDeadline-'+prefix.slice(9,-1));
  const dt = prefix==='newTask' ? document.getElementById('newTaskDeadlineTime') : document.getElementById('editDeadlineTime-'+prefix.slice(9,-1));
  const fake = {title:'', deadline:dl && dl.value, deadlineTime:dt && dt.value, alarm:readTaskAlarmFields(prefix)};
  hint.innerHTML = taskAlarmHint(fake);
});
document.addEventListener('change', function(e){ if(e.target && /AlarmOn$/.test(e.target.id||'')) e.target.dispatchEvent(new Event('input', {bubbles:true})); });
function wakeSettingsCardHtml(){
  const w = wakeCfg(), nw = nextWake();
  return '<div class="card section wake-settings-card" id="wakeSettingsSection">'+
    '<div class="row" style="justify-content:space-between;gap:12px;flex-wrap:wrap;">'+
      '<div><div class="section-title" style="margin:0;">&#9200; Wake-up alarm</div>'+
        '<div class="wake-settings-time">'+(w.enabled ? fmt12Hour(w.time) : 'Off')+'<span class="kpi-sub"> '+(w.enabled ? wakeDaysLabel(w.days) : '')+'</span></div>'+
        '<div class="kpi-sub">'+(nw ? 'Next: '+fmt12Hour(nw.time)+' '+morningLabel(nw.date)+' &middot; in '+untilLabel(nw.ts)+(nw.override?' (one-time change)':'') : 'Nothing scheduled')+(w.media ? ' &middot; &#9835; '+escapeHtml(w.media.name||'music') : '')+'</div></div>'+
      '<div class="row" style="gap:8px;"><button class="btn btn-ghost btn-sm" data-action="wakeTestNow">Preview</button><button class="btn btn-primary" data-action="openWakeSetup">Set up</button></div>'+
    '</div></div>';
}
ACTIONS.wakeOpenIn = function(el, e, id){ wakeCfg().openIn = id; saveWake(); };
