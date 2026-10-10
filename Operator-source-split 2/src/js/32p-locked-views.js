// ============ LOCKED IN: THE MINIMAL VIEW, BREAKS, FOCUS MUSIC ============
// • Minimal view — like a song playing full screen: the task as the "track", the timer as its
//   progress, the time and your next alarm in the corners. One button switches views; nothing
//   about the session changes when you do.
// • On a break the tasks are paused: nothing on the list can be started, finished or moved until
//   the break ends (the minimal view shows just the break clock).
// • Focus music — after the lock-in intro, a playlist of quiet, minimal tracks made right here in
//   the app (no account, no internet) keeps going until you lock out. Play / pause / skip.

// ---- the minimal view ----
function lockedMinimal(){ return state.profile.lockedView==='minimal'; }
// a full-screen view leaves with a short fade-and-settle instead of snapping away
function npLeave(then){
  const n = document.querySelector('#viewRoot .np');
  if(!n){ then(); return; }
  n.classList.add('is-leaving');
  setTimeout(then, 340);
}
ACTIONS.toggleLockedView = function(){
  const leaving = lockedMinimal();
  const go = function(){ state.profile.lockedView = leaving ? 'full' : 'minimal'; persist('profile'); playNav(); renderView(); };
  if(leaving) npLeave(go); else go();
};
document.addEventListener('keydown', function(e){
  if(e.key!=='m' && e.key!=='M') return;
  if(e.metaKey || e.ctrlKey || e.altKey || (e.target && /INPUT|TEXTAREA|SELECT/.test(e.target.tagName)) || (e.target && e.target.isContentEditable)) return;
  if(!state.focus.activeSession || ui.view!=='today' || document.querySelector('.overlay:not(.hidden)')) return;
  e.preventDefault(); ACTIONS.toggleLockedView();
});
function lockedViewBtnHtml(){
  return '<button class="lv-btn" data-action="toggleLockedView" title="'+(lockedMinimal() ? 'Back to the full view (M)' : 'Minimal view (M)')+'">'+(lockedMinimal() ? '&#9638; Full view' : '&#9673; Minimal')+'</button>';
}
// the next thing that will ring today: an alarm, a reminder, tomorrow's wake-up
function ds2(d){ return d.getFullYear()+'-'+String(d.getMonth()+1).padStart(2,'0')+'-'+String(d.getDate()).padStart(2,'0'); }
function nextRingLabel(){
  const now = Date.now(), today = todayStr(), dow = new Date().getDay();
  let best = null;
  arr(state.focus.alarms).forEach(function(a){
    if(!a.enabled || !a.time) return;
    if(a.date ? a.date!==today : arr(a.days).indexOf(dow)<0) return;
    const ts = localTs(today, a.time); if(ts > now && (!best || ts < best.ts)) best = {ts:ts, label:a.label||'Alarm'};
  });
  if(!best && typeof nextWake==='function'){ const w = nextWake(); if(w) best = {ts:w.ts, label:'Wake up'}; }
  if(!best) return '';
  const day = new Date(best.ts), d = ds2(day), when = d===today ? '' : d===addDays(today, 1) ? 'Tomorrow ' : weekdayShort(d)+' ';
  return when+fmtTimeShort(best.ts)+' &middot; '+escapeHtml(best.label);
}
// a technique's whole session laid out as blocks (work / break), with where you are in it
function npTimelineHtml(st){
  if(!st || !st.m.work || typeof lockMethodSegments!=='function') return '';
  const segs = lockMethodSegments(st.id).filter(function(x){ return x.k==='w' || x.k==='r'; });
  const total = segs.reduce(function(a, x){ return a + x.min; }, 0);
  let cur = st.onBreak ? 2*(st.round-1)-1 : 2*(st.round-1);
  if(!st.m.rounds) cur = Math.min(cur, segs.length-1);
  return '<div class="np-tl">'+segs.map(function(x, i){
    const fill = i<cur ? 1 : i===cur ? (st.onBreak ? 1 - st.left/((x.min||1)*60000) : (st.frac||0)) : 0;
    return '<i class="np-tl-'+x.k+(i===cur?' is-cur':'')+(i<cur?' is-done':'')+'" style="flex:'+(x.min/total).toFixed(3)+'" title="'+(x.k==='w' ? 'Round '+x.round+' · '+x.min+' min of work' : (x.long?'Long break':'Break')+' · '+x.min+' min')+'">'+
      '<u'+(i===cur?' id="npTlFill"':'')+' style="width:'+(Math.max(0, Math.min(1, fill))*100).toFixed(1)+'%"></u><em>'+x.min+'</em></i>';
  }).join('')+'</div>';
}
// the clock up in the corner: big time, small date, the next alarm underneath
function npClockHtml(){
  const d = new Date(), ring = nextRingLabel();
  const t = d.toLocaleTimeString(undefined, {hour:'numeric', minute:'2-digit'}), m = /^(.*?)\s*([AP]M)$/i.exec(t);
  return '<div class="np-clock"><div class="np-clock-t"><b id="npClockT">'+(m ? m[1] : t)+'</b><span id="npClockA">'+(m ? m[2] : '')+'</span></div>'+
    '<div class="np-clock-d" id="npClockD">'+d.toLocaleDateString(undefined, {weekday:'long', month:'short', day:'numeric'})+'</div>'+
    (ring ? '<div class="np-clock-r">&#9200; '+ring+'</div>' : '')+'</div>';
}
setInterval(function(){
  const t = document.getElementById('npClockT'); if(!t) return;
  const d = new Date(), s = d.toLocaleTimeString(undefined, {hour:'numeric', minute:'2-digit'}), m = /^(.*?)\s*([AP]M)$/i.exec(s);
  const tt = m ? m[1] : s; if(t.textContent!==tt) t.textContent = tt;
  const a = document.getElementById('npClockA'); if(a && m && a.textContent!==m[2]) a.textContent = m[2];
  const f = document.getElementById('npTlFill'), st = typeof methodState==='function' ? methodState() : null;
  if(f && st){ const fr = st.onBreak ? (function(){ const as = state.focus.activeSession, b = as.breaks[as.breaks.length-1] || {}; return b.minutes ? 1 - st.left/(b.minutes*60000) : 0; })() : (st.frac||0); f.style.width = (Math.max(0, Math.min(1, fr))*100).toFixed(1)+'%'; }
}, 1000);
function renderLockedMinimal(){
  const as = state.focus.activeSession, onBreak = !!as.onBreak;
  const cur = ui.currentTaskId ? state.tasks.items.find(function(t){ return t.id===ui.currentTaskId; }) : null;
  const nx = typeof nextUpTask==='function' ? nextUpTask() : null;
  const m = as.method && typeof LOCK_METHODS!=='undefined' ? LOCK_METHODS[as.method.id] : null;
  const st = typeof methodState==='function' ? methodState() : null;
  const elapsed = onBreak ? (as.frozenElapsedMs||0) : Date.now()-as.startedAt;
  const tl = npTimelineHtml(st);
  let body;
  if(onBreak){
    const b = as.breaks[as.breaks.length-1] || {};
    const left = as.breakEndsAt ? Math.max(0, as.breakEndsAt - Date.now()) : null;
    const total = b.minutes ? b.minutes*60000 : null;
    body = '<div class="np-art is-break"><span>&#9749;</span></div>'+
      '<div class="np-meta">'+
        '<div class="np-k">On a break</div>'+
        '<div class="np-title">'+(b.note ? escapeHtml(b.note) : 'Breathe. Stretch. Look away.')+'</div>'+
        '<div class="np-sub">'+(left!=null ? 'Back at '+fmtTimeShort(as.breakEndsAt) : 'No timer — end it when you\'re ready')+'</div>'+
        '<div class="np-prog">'+tl+'<div class="np-bar"><i id="npBreakBar" style="width:'+(total && left!=null ? ((1 - left/total)*100).toFixed(1) : 0)+'%"></i></div>'+
          '<div class="np-times"><span id="modeElapsed">'+formatElapsed(Date.now()-(as.breakStartedAt||Date.now()))+'</span><span id="breakRemaining">'+(left!=null ? formatElapsed(left)+' left' : '')+'</span></div></div>'+
        '<div class="np-ctl">'+(as.breakEndsAt ? '<button class="np-c" data-action="extendBreak" data-minutes="5" title="5 more minutes">+5</button>' : '<span class="np-c-sp"></span>')+
          '<button class="np-c is-main" data-action="endBreakModeFromFocus" title="End the break">&#9654;</button>'+npMusicBtnHtml()+'</div>'+
        npMusicRowHtml()+
      '</div>';
  } else {
    const pct = as.plannedMinutes ? Math.min(100, elapsed/(as.plannedMinutes*60000)*100) : Math.min(100, deepWorkMinutesTodayLive()/(state.standards.deepWorkTargetMinutes||180)*100);
    body = '<div class="np-art'+(musicOn() ? ' is-music' : '')+'"><span>'+(m ? m.icon : '&#128274;')+'</span>'+(musicOn() ? '<span class="np-art-eq wk2-eq"><i></i><i></i><i></i><i></i></span>' : '')+'</div>'+
      '<div class="np-meta">'+
        '<div class="np-k">'+(m && as.method.id!=='block' ? m.label : 'Locked in')+'</div>'+
        '<div class="np-title">'+(cur ? escapeHtml(cur.title) : 'Deep work')+'</div>'+
        '<div class="np-sub">'+(st ? '<span id="msLine">'+methodLine(st)+'</span>' : (as.plannedMinutes ? fmtDurationLabel(as.plannedMinutes)+' session' : fmtDurationLabel(deepWorkMinutesTodayLive())+' of deep work today'))+'</div>'+
        '<div class="np-prog">'+(tl || '<div class="np-bar"><i id="focusProgressBar" style="width:'+pct.toFixed(1)+'%"></i></div>')+
          '<div class="np-times"><span id="focusElapsed">'+formatElapsed(elapsed)+'</span><span>'+(as.plannedMinutes ? 'until '+fmtTimeShort(as.startedAt + as.plannedMinutes*60000) : '')+'</span></div></div>'+
        '<div class="np-ctl">'+
          '<button class="np-c" data-action="openBreakNotePrompt" title="Take a break">&#9749;</button>'+
          (cur ? '<button class="np-c is-main" data-action="finishCurrentTask" title="Done with this task">&#10003;</button>' : '<button class="np-c is-main" data-action="openStopFocus" title="Lock out">&#9632;</button>')+
          npMusicBtnHtml()+
        '</div>'+
        npMusicRowHtml()+
        (nx && (!cur || nx.id!==cur.id) ? '<div class="np-next">Up next &middot; '+escapeHtml(nx.title)+'</div>' : '')+
      '</div>';
  }
  return '<div class="np np-locked'+(onBreak?' is-break':'')+'">'+
    '<div class="np-bg"></div>'+
    '<div class="np-top">'+npClockHtml()+'<span style="flex:1"></span>'+
      '<button class="lv-btn lv-out" data-action="openStopFocus" title="Lock out">&#128275; Lock out</button>'+lockedViewBtnHtml()+'</div>'+
    '<div class="np-main">'+body+'</div>'+
  '</div>';
}
// full-screen feel: the sidebar and floating buttons step aside in the minimal view
afterRenderHooks.push(function(){
  const on = !!(state.focus && state.focus.activeSession && ui.view==='today' && lockedMinimal()) || !!(ui.view==='today' && document.querySelector('#viewRoot .rest-full'));
  document.body.classList.toggle('np-on', on);
  const brk = !!(state.focus && state.focus.activeSession && state.focus.activeSession.onBreak);
  document.body.classList.toggle('is-on-break', brk);
  const bar = document.getElementById('npBreakBar'), as = state.focus && state.focus.activeSession;
  if(bar && as && as.breakEndsAt){ const b = as.breaks[as.breaks.length-1] || {}; if(b.minutes) bar.style.width = ((1 - Math.max(0, as.breakEndsAt-Date.now())/(b.minutes*60000))*100).toFixed(1)+'%'; }
});
setInterval(function(){
  const bar = document.getElementById('npBreakBar'), as = state && state.focus && state.focus.activeSession;
  if(!bar || !as || !as.breakEndsAt) return;
  const b = as.breaks[as.breaks.length-1] || {}; if(b.minutes) bar.style.width = ((1 - Math.max(0, as.breakEndsAt-Date.now())/(b.minutes*60000))*100).toFixed(1)+'%';
}, 1000);

// ---- breaks: the tasks are paused ----
const BREAK_FROZEN = ['setCurrentTask','stagePendingCurrentTask','confirmPendingCurrentTask','finishCurrentTask','releaseCurrentTask','completeTask','toggleTaskActive',
  'promoteTask','demoteTask','undoTask','bulkCompleteTasks','bulkUndoTasks','bulkMoveTasks','bulkRemoveTasks','moveTaskToBacklog','nnStartNext','nnPendingToNext','nnLockInNext',
  'toggleNextPicker','pickNextTask','clearStagedTask','openTaskEditModal','deleteTaskUndoable','taskMenuBtn','addTaskToday','addTaskBacklog','openAddTaskModal','setFieldToday',
  'clearField','saveEditTask','toggleTaskSelect','stageNextTask','setNextUp'];
function onBreakNow(){ const as = state.focus && state.focus.activeSession; return !!(as && as.onBreak); }
function breakBlocks(action){
  if(!onBreakNow() || BREAK_FROZEN.indexOf(action)<0) return false;
  showToast('You\'re on a break — the tasks wait until you\'re back.', {icon:'&#9749;', duration:2600});
  return true;
}
// no dragging tasks around, and no task right-click menu, while on a break
document.addEventListener('dragstart', function(e){ if(onBreakNow() && e.target && e.target.closest && e.target.closest('[data-task-id], .tl-row, .nn-drag, .task-card')){ e.preventDefault(); breakBlocks('setCurrentTask'); } }, true);
document.addEventListener('contextmenu', function(e){ if(onBreakNow() && e.target && e.target.closest && e.target.closest('[data-task-id]')){ e.preventDefault(); e.stopPropagation(); breakBlocks('taskMenuBtn'); } }, true);

// ---- focus music: quiet, minimal tracks, made live ----
// Each track: a chord loop, a tempo, how the notes fall (an arpeggio pattern), and a texture.
// Five tracks, each with its own feel (they used to share one recipe, so every song opened the
// same way): two warm lo-fi loops, then three quiet, spacious ones in the spirit of game soundtracks
// you can work to for hours — felt piano, a harp-like figure, and slow bells over a drone.
const fmHz = function(m){ return 440*Math.pow(2, (m-69)/12); }; // midi note → Hz
const FOCUS_TRACKS = [
  {name:'First Light', style:'lofi', bpm:68, prog:[[174.6,220,261.6,329.6],[164.8,196,246.9,293.7],[146.8,174.6,220,261.6],[130.8,164.8,196,246.9]], arp:[0,2,1,3,2,1], wave:'triangle', hiss:0.005},
  {name:'Still Water', style:'lofi', soft:true, bpm:56, prog:[[130.8,164.8,196,246.9],[146.8,174.6,220,261.6],[123.5,164.8,196,246.9],[110,146.8,174.6,220]], arp:[0,1,2,3,2,1,0], wave:'sine', hiss:0.003},
  // felt piano: a low note, a slowly rolled chord, and now and then a few melody notes drifting on top
  {name:'Meadow', style:'piano', bpm:54, prog:[[43,55,59,62,66],[40,52,55,59,64],[36,48,55,59,62],[38,50,54,57,62]], scale:[67,69,71,74,76,78,79,81], hiss:0.002},
  // a harp-like figure that keeps turning over, gentle and bright
  {name:'Clearwater', style:'harp', bpm:76, prog:[[45,57,61,64,69],[42,54,57,61,66],[38,50,57,62,66],[40,52,56,59,64]], fig:[0,2,3,4,3,2,1,2], hiss:0},
  // almost nothing: a deep drone that breathes, with a bell every so often
  {name:'Far Lands', style:'bells', bpm:40, prog:[[38,45,50],[36,43,48],[41,48,53],[38,45,52]], scale:[62,64,67,69,72,74,76,79], hiss:0.002}
];
const FM = {playing:false, idx:0, bar:0, nextAt:0, timer:0, bus:null, hiss:null, rnd:1};
const FM_BARS = 24; // about a minute and a half to two minutes a track
function fmVolume(){ const v = Number(state.profile.musicVolume); return isFinite(v) && state.profile.musicVolume!=null ? Math.max(0, Math.min(1, v)) : 0.7; }
function fmRand(){ FM.rnd = (FM.rnd*16807) % 2147483647; return (FM.rnd - 1)/2147483646; }
function fmBus(ctx){
  if(FM.bus && FM.bus.ctx===ctx) return FM.bus;
  // a soft echo trails every note — that sense of space is most of the mood
  const g = ctx.createGain(), dl = ctx.createDelay(2), fb = ctx.createGain(), lp = ctx.createBiquadFilter(), wet = ctx.createGain();
  g.gain.value = 0.0001; dl.delayTime.value = 0.42; fb.gain.value = 0.32; lp.type = 'lowpass'; lp.frequency.value = 2400; wet.gain.value = 0.35;
  const out = sfxOut(ctx);
  g.connect(out); g.connect(dl); dl.connect(lp); lp.connect(fb); fb.connect(dl); lp.connect(wet); wet.connect(out);
  FM.bus = {ctx:ctx, g:g};
  return FM.bus;
}
// a felt-piano-ish note: a pure tone with a little body, quick to speak, long to fade
function fmKey(ctx, out, t, freq, dur, vol){
  const g = ctx.createGain(), f = ctx.createBiquadFilter();
  f.type = 'lowpass'; f.frequency.setValueAtTime(Math.min(6000, freq*6), t); f.frequency.exponentialRampToValueAtTime(Math.max(400, freq*1.5), t + dur*0.6);
  g.gain.setValueAtTime(0.0001, t); g.gain.exponentialRampToValueAtTime(vol, t + 0.012); g.gain.exponentialRampToValueAtTime(vol*0.35, t + 0.4); g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
  [[1, 'sine', 1], [2, 'triangle', 0.18], [3, 'sine', 0.06]].forEach(function(h){ const o = ctx.createOscillator(), og = ctx.createGain(); o.type = h[1]; o.frequency.value = freq*h[0]; o.detune.value = (Math.random()-0.5)*6; og.gain.value = h[2]; o.connect(og); og.connect(f); o.start(t); o.stop(t + dur + 0.05); });
  f.connect(g); g.connect(out);
}
// a bell: inharmonic partials, a long shimmer
function fmBell(ctx, out, t, freq, vol){
  const g = ctx.createGain(); g.gain.setValueAtTime(0.0001, t); g.gain.exponentialRampToValueAtTime(vol, t + 0.006); g.gain.exponentialRampToValueAtTime(0.0001, t + 5);
  [[1, 1], [2.76, 0.25], [5.4, 0.08]].forEach(function(h){ const o = ctx.createOscillator(), og = ctx.createGain(); o.type = 'sine'; o.frequency.value = freq*h[0]; og.gain.value = h[1]; o.connect(og); og.connect(g); o.start(t); o.stop(t + 5.1); });
  g.connect(out);
}
function fmBar(ctx, out, t, tr, bar){
  const beat = 60/tr.bpm, len = beat*4, ch = tr.prog[bar % tr.prog.length];
  if(tr.style==='lofi'){
    padChord(ctx, out, t, ch, len*0.35, len*0.45, len*0.6, tr.soft ? 0.018 : 0.022);
    sfxPluck(ctx, out, t, ch[0]/2, len*0.9, 0.04, 'sine');
    const steps = tr.arp.length, step = len/steps;
    tr.arp.forEach(function(n, i){ if((bar + i) % 5 === 4) return; sfxPluck(ctx, out, t + i*step + (i%2 ? step*0.08 : 0), ch[n % ch.length]*2, step*2.2, 0.014 + (i===0 ? 0.006 : 0), tr.wave); });
    if(!tr.soft) for(let i=0;i<4;i++) sfxTap(ctx, out, t + i*beat + beat*0.5, 4200, 0.018);
    return;
  }
  if(tr.style==='piano'){
    // it opens on a single low note and lets the room fill in before anything else happens
    fmKey(ctx, out, t, fmHz(ch[0]), len*1.6, 0.1);
    if(bar===0) return;
    ch.slice(1).forEach(function(m, i){ if(fmRand() < 0.85) fmKey(ctx, out, t + beat*(0.5 + i*0.32) + fmRand()*0.05, fmHz(m), len*1.2, 0.05); });
    if(bar > 1 && fmRand() < 0.7){ const k = 1 + Math.floor(fmRand()*3); for(let i=0;i<k;i++) fmKey(ctx, out, t + beat*(1.5 + i*(0.8 + fmRand()*0.6)), fmHz(tr.scale[Math.floor(fmRand()*tr.scale.length)]), len, 0.06); }
    return;
  }
  if(tr.style==='harp'){
    const step = beat/2;
    tr.fig.forEach(function(n, i){ fmKey(ctx, out, t + i*step + (i%2 ? 0.015 : 0), fmHz(ch[n % ch.length] + 12), step*5, 0.05 - (i%2 ? 0.014 : 0)); });
    if(bar % 2===0) fmKey(ctx, out, t, fmHz(ch[0]), len*1.4, 0.09);
    return;
  }
  if(tr.style==='bells'){
    padChord(ctx, out, t, ch.map(fmHz), len*0.45, len*0.2, len*0.7, 0.016);
    if(bar===0) return;
    if(fmRand() < 0.75) fmBell(ctx, out, t + beat*(0.5 + fmRand()*2), fmHz(tr.scale[Math.floor(fmRand()*tr.scale.length)]), 0.03);
    if(fmRand() < 0.3) fmBell(ctx, out, t + beat*(2.5 + fmRand()), fmHz(tr.scale[Math.floor(fmRand()*tr.scale.length)]) , 0.018);
  }
}
function fmHiss(ctx, out, level){
  if(FM.hiss){ try{ FM.hiss.stop(); }catch(e){} FM.hiss = null; }
  if(!level) return;
  const len = Math.floor(ctx.sampleRate*2), buf = ctx.createBuffer(1, len, ctx.sampleRate), d = buf.getChannelData(0);
  for(let i=0;i<len;i++) d[i] = (Math.random()*2-1)*0.5;
  const src = ctx.createBufferSource(), f = ctx.createBiquadFilter(), g = ctx.createGain();
  src.buffer = buf; src.loop = true; f.type = 'bandpass'; f.frequency.value = 3500; f.Q.value = 0.6; g.gain.value = level;
  src.connect(f); f.connect(g); g.connect(out); src.start(); FM.hiss = src;
}
function fmSchedule(){
  if(!FM.playing) return;
  const ctx = getAudioCtx(); if(!ctx) return;
  const bus = fmBus(ctx);
  while(FM.nextAt < ctx.currentTime + 1.5){
    if(FM.bar >= FM_BARS){ FM.idx = (FM.idx + 1) % FOCUS_TRACKS.length; FM.bar = 0; fmHiss(ctx, bus.g, FOCUS_TRACKS[FM.idx].hiss); fmRefresh(); }
    const tr = FOCUS_TRACKS[FM.idx];
    fmBar(ctx, bus.g, FM.nextAt, tr, FM.bar);
    FM.nextAt += 60/tr.bpm*4; FM.bar++;
  }
}
function focusMusicPlay(idx){
  const ctx = getAudioCtx(); if(!ctx) return;
  if(idx!=null){ FM.idx = ((idx % FOCUS_TRACKS.length) + FOCUS_TRACKS.length) % FOCUS_TRACKS.length; FM.bar = 0; }
  FM.rnd = 1 + Math.floor(Math.random()*2147483000);
  const bus = fmBus(ctx);
  bus.g.gain.cancelScheduledValues(ctx.currentTime);
  bus.g.gain.setValueAtTime(Math.max(0.0001, bus.g.gain.value), ctx.currentTime);
  bus.g.gain.exponentialRampToValueAtTime(Math.max(0.0002, fmVolume()), ctx.currentTime + 2.5);
  if(!FM.playing){ FM.nextAt = ctx.currentTime + 0.1; fmHiss(ctx, bus.g, FOCUS_TRACKS[FM.idx].hiss); }
  FM.playing = true;
  clearInterval(FM.timer); FM.timer = setInterval(fmSchedule, 400); fmSchedule();
  fmRefresh();
}
function focusMusicStop(){
  if(!FM.playing) return;
  FM.playing = false; clearInterval(FM.timer);
  const ctx = getAudioCtx();
  if(ctx && FM.bus){ const g = FM.bus.g.gain; g.cancelScheduledValues(ctx.currentTime); g.setValueAtTime(Math.max(0.0001, g.value), ctx.currentTime); g.exponentialRampToValueAtTime(0.0001, ctx.currentTime + 1.2); }
  setTimeout(function(){ if(!FM.playing){ fmHiss(null, null, 0); FM.bus = null; } }, 1400);
  fmRefresh();
}
function fmRefresh(){ document.querySelectorAll('.fm').forEach(function(el){ el.outerHTML = focusPlayerHtml(el.classList.contains('is-np')); }); }
ACTIONS.fmToggle = function(){ if(FM.playing) focusMusicStop(); else focusMusicPlay(); };
ACTIONS.fmNext = function(){ const was = FM.playing; FM.idx = (FM.idx + 1) % FOCUS_TRACKS.length; FM.bar = 0; if(was){ focusMusicStop(); setTimeout(function(){ focusMusicPlay(); }, 900); } else fmRefresh(); };
function focusPlayerHtml(np){
  const tr = FOCUS_TRACKS[FM.idx];
  return '<span class="fm'+(np?' is-np':'')+(FM.playing?' is-on':'')+'">'+
    (FM.playing ? '<span class="wk2-eq"><i></i><i></i><i></i><i></i></span>' : '<span class="fm-i">&#9835;</span>')+
    '<span class="fm-t">'+escapeHtml(tr.name)+'</span>'+
    '<button class="fm-b" data-action="fmToggle" title="'+(FM.playing?'Pause':'Play focus music')+'">'+(FM.playing ? '&#10073;&#10073;' : '&#9654;')+'</button>'+
    '<button class="fm-b" data-action="fmNext" title="Next track">&#9197;</button></span>';
}
// the lock-in intro hands over to the playlist (if that's switched on)
function focusMusicAfterIntro(delayMs){
  if(!soundPref('focusMusic', true)) return;
  clearTimeout(FM.introT);
  FM.introT = setTimeout(function(){ if(state.focus.activeSession && !FM.playing) focusMusicPlay(Math.floor(Math.random()*FOCUS_TRACKS.length)); }, delayMs||0);
}
document.addEventListener('input', function(e){ if(e.target && e.target.id==='breakNoteInput') ui.breakNoteDraft = e.target.value; });

// ---- Day off: a proper rest-day screen, a small moment when it starts or ends, and it turns
// itself on for the days your wake-up alarm doesn't ring (e.g. Sundays) ----
function isWorkDay(dateStr){
  const w = typeof wakeCfg==='function' ? wakeCfg() : null;
  if(!w || !w.enabled || !arr(w.days).length) return true; // no schedule set → every day can be a work day
  return arr(w.days).indexOf(dowOf(dateStr))>=0;
}
function nextWorkDay(from){ for(let i=1;i<8;i++){ const d = addDays(from, i); if(isWorkDay(d)) return d; } return null; }
function autoDayOffCheck(){
  if(!state || !state.daysOff) return false;
  const today = todayStr(), seen = state.daysOff.autoSeen = arr(state.daysOff.autoSeen);
  if(seen.indexOf(today)>=0) return false;
  seen.push(today); if(seen.length > 40) seen.splice(0, seen.length - 40);
  let changed = true;
  if(!isWorkDay(today) && !isDayOff(today) && !state.focus.activeSession){ state.daysOff.dates.push(today); dayOffFlash(true, true); }
  persist('daysOff');
  return changed;
}
afterRenderHooks.push(function(){ if(typeof state!=='undefined' && state && state.daysOff && autoDayOffCheck() && isDayOff(todayStr())) setTimeout(renderView, 0); });
function dayOffFlash(on, auto){
  const d = document.createElement('div');
  d.className = 'lock-flash is-dayoff'+(on ? '' : ' is-back');
  d.innerHTML = '<div class="lf-ring"></div><div class="lf-k">'+(on ? '&#127796; Day off' : '&#9728;&#65039; Back to it')+'</div><div class="lf-t">'+(on ? (auto ? 'No alarm today — it’s a rest day.' : 'Rest is part of the plan.') : 'Today counts.')+'</div>';
  document.body.appendChild(d);
  setTimeout(function(){ if(d.parentNode) d.parentNode.removeChild(d); }, 1900);
}
const REST_IDEAS = [
  ['&#127795;','Get outside.','A long walk, no podcast. Let your head wander.'],
  ['&#128222;','Call someone you like.','Not a text — an actual call.'],
  ['&#127859;','Cook something real.','Take your time with it.'],
  ['&#128164;','Sleep in, guilt-free.','Recovery is where the gains show up.'],
  ['&#128214;','Read for fun.','Something with no business in it.'],
  ['&#127947;&#65039;','Move, easy.','A light session or a stretch — nothing heroic.'],
  ['&#128245;','Phone in another room.','For an hour. See how it feels.'],
  ['&#127774;','Get some sun.','Ten minutes of daylight does more than you’d think.']
];
function restIdeas(n){ const d = Number(todayStr().replace(/-/g,'')), out = []; for(let i=0;i<n;i++) out.push(REST_IDEAS[(d + i*3) % REST_IDEAS.length]); return out; }
// day off and the weekend: full-screen, minimal, like the minimal locked view (the corner button gives the sidebar back)
function restFull(){ return ui.restFull!==false; }
ACTIONS.toggleRestFull = function(){ ui.restFull = !restFull(); renderView(); };
function restTopHtml(extra){
  return '<div class="np-top"><span class="np-time" id="liveClock"></span><span style="flex:1"></span>'+(extra||'')+
    '<button class="lv-btn" data-action="toggleRestFull" title="'+(restFull() ? 'Show the sidebar' : 'Full screen')+'">'+(restFull() ? '&#8690;' : '&#8689;')+'</button></div>';
}
function weekDeepMinutes(){ let m = 0; for(let i=0;i<7;i++){ const d = addDays(todayStr(), -i); m += i===0 ? deepWorkMinutesTodayLive() : deepWorkMinutesFor(d); } return m; }
// clocked out on the last work day before a day off: the weekend starts now, in the day-off look
function renderWeekendOffView(elapsed){
  const today = todayStr(), nw = nextWorkDay(today), wake = nw && typeof wakeTimeFor==='function' ? wakeTimeFor(nw) : null;
  const ideas = restIdeas(3);
  return '<div class="np rest dayoff is-weekend'+(restFull() ? ' rest-full' : '')+'">'+
    '<div class="dayoff-bg"></div>'+
    restTopHtml()+
    '<div class="dayoff-in">'+
      '<div class="dayoff-k">&#127937; Clocked out &middot; day off tomorrow</div>'+
      '<h1 class="dayoff-h">That’s the week'+(state.profile.name ? ', <span>'+escapeHtml(state.profile.name)+'</span>' : '')+'.</h1>'+
      '<div class="dayoff-cards">'+
        '<div class="dayoff-c"><b>'+fmtHours(deepWorkMinutesTodayLive())+'</b><span>deep work today</span></div>'+
        '<div class="dayoff-c"><b id="modeElapsed">'+formatElapsed(elapsed)+'</b><span>off the clock</span></div>'+
        (nw ? '<div class="dayoff-c"><b>'+weekdayShort(nw)+'</b><span>back to work'+(wake ? ' &middot; alarm '+fmt12Hour(wake) : '')+'</span></div>' : '')+
      '</div>'+
      (ideas.length ? '<div class="dayoff-ideas">'+ideas.map(function(x){ return '<div class="br-th"><span class="br-th-i">'+x[0]+'</span><div><b>'+x[1]+'</b><span>'+x[2]+'</span></div></div>'; }).join('')+'</div>' : '')+
      '<div class="dayoff-row">'+
        (isWindDownTime() ? '<button class="dayoff-back" data-action="openWindDown">&#127769; Wind down</button>' : '')+
        '<button class="dayoff-back" data-action="clockIn">Clock back in</button>'+
      '</div>'+
    '</div>'+
  '</div>';
}
function renderDayOffView(){
  const streak = computeStreak(), nw = nextWorkDay(todayStr());
  const wake = nw && typeof wakeTimeFor==='function' ? wakeTimeFor(nw) : null;
  const stat = function(v, k){ return '<div class="rest-s"><b>'+v+'</b><span>'+k+'</span></div>'; };
  return '<div class="np rest is-dayoff'+(restFull() ? ' rest-full' : '')+'">'+
    '<div class="np-bg"></div>'+
    restTopHtml('<button class="lv-btn rest-work" data-action="quickDayOff" title="Turn the day off back off">Work today</button>')+
    '<div class="np-main">'+
      '<div class="np-art is-dayoff"><span>&#127796;</span></div>'+
      '<div class="np-meta">'+
        '<div class="np-title rest-h">Day off.</div>'+
        '<div class="rest-stats">'+
          stat(streak, 'day streak')+
          stat(fmtHours(weekDeepMinutes()), 'deep work this week')+
          (nw ? stat(weekdayShort(nw), 'back'+(wake ? ' &middot; '+fmt12Hour(wake) : '')) : '')+
        '</div>'+
      '</div>'+
    '</div>'+
  '</div>';
}

// ---- true full screen: Good morning, the work preview and the full-screen views take the whole
// display, not just the window. The launcher puts the window into real macOS full screen (no
// "press Esc" bubble; macOS asks once for Accessibility permission); without it, Chrome's own.
function trueFullOn(){ return state.profile.trueFull!==false; }
function wantTrueFull(){
  if(!trueFullOn()) return false;
  return document.body.classList.contains('np-on') || overlayOpen('planOverlay') || (overlayOpen('wakeOverlay') && (ui.wakeMode==='brief' || ui.wakeMode==='ring' || ui.wakeMode==='snooze'));
}
const TF = {want:false, via:null, busy:false, warned:false};
async function trueFullSet(on){
  // only undo a full screen we made (if you'd already made the window full screen, it stays)
  if(!on && !TF.via) return;
  if(!on && TF.via==='web'){ try{ if(document.fullscreenElement) await document.exitFullscreen(); }catch(e){} TF.via = null; return; }
  TF.busy = true;
  let ok = false, why = '';
  try{
    const r = await fetchWithin(WAKE_HELPER+'window/full?f='+(on ? 1 : 0), 4000);
    ok = !!(r && r.ok); if(!ok && r){ try{ why = (await r.json()).error || ''; }catch(e){} }
  }catch(e){}
  if(ok) TF.via = on ? 'mac' : null;
  else if(why==='accessibility') {
    // no launcher (or no permission yet): the browser's own full screen
    try{
      if(on && !document.fullscreenElement && document.documentElement.requestFullscreen){ await document.documentElement.requestFullscreen({navigationUI:'hide'}); TF.via = 'web'; }
      else if(!on && document.fullscreenElement && TF.via==='web'){ await document.exitFullscreen(); TF.via = null; }
    }catch(e){}
    if(on && why==='accessibility' && !TF.warned){ TF.warned = true; showToast('For true full screen, allow Operator in System Settings → Privacy & Security → Accessibility.', {icon:'&#9974;', duration:8000}); }
  }
  TF.busy = false;
}
function trueFullSync(){
  const w = wantTrueFull();
  if(w===TF.want || TF.busy) return;
  TF.want = w; trueFullSet(w);
}
afterRenderHooks.push(function(){ setTimeout(trueFullSync, 0); });
setInterval(function(){ if(typeof state!=='undefined' && state && state.profile) trueFullSync(); }, 700);
// leaving Chrome's full screen with Esc counts as "not now" until the screen changes
document.addEventListener('fullscreenchange', function(){ if(!document.fullscreenElement && TF.via==='web'){ TF.via = null; } });
ACTIONS.toggleTrueFull = function(){ state.profile.trueFull = !trueFullOn(); persist('profile'); if(!trueFullOn() && TF.want){ TF.want = false; trueFullSet(false); } renderView(); };
ACTIONS.noop = function(){};
