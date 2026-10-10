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
ACTIONS.toggleLockedView = function(){ state.profile.lockedView = lockedMinimal() ? 'full' : 'minimal'; persist('profile'); playNav(); renderView(); };
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
function nextRingLabel(){
  const now = Date.now(), today = todayStr(), dow = new Date().getDay();
  let best = null;
  arr(state.focus.alarms).forEach(function(a){
    if(!a.enabled || !a.time) return;
    if(a.date ? a.date!==today : arr(a.days).indexOf(dow)<0) return;
    const ts = localTs(today, a.time); if(ts > now && (!best || ts < best.ts)) best = {ts:ts, label:a.label||'Alarm'};
  });
  if(!best && typeof nextWake==='function'){ const w = nextWake(); if(w) best = {ts:w.ts, label:'Wake up'}; }
  return best ? fmtTimeShort(best.ts)+' &middot; '+escapeHtml(best.label) : '';
}
function renderLockedMinimal(){
  const as = state.focus.activeSession, onBreak = !!as.onBreak;
  const cur = ui.currentTaskId ? state.tasks.items.find(function(t){ return t.id===ui.currentTaskId; }) : null;
  const nx = typeof nextUpTask==='function' ? nextUpTask() : null;
  const m = as.method && typeof LOCK_METHODS!=='undefined' ? LOCK_METHODS[as.method.id] : null;
  const elapsed = onBreak ? (as.frozenElapsedMs||0) : Date.now()-as.startedAt;
  const ring = nextRingLabel();
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
        '<div class="np-prog"><div class="np-bar"><i id="npBreakBar" style="width:'+(total && left!=null ? ((1 - left/total)*100).toFixed(1) : 0)+'%"></i></div>'+
          '<div class="np-times"><span id="modeElapsed">'+formatElapsed(Date.now()-(as.breakStartedAt||Date.now()))+'</span><span id="breakRemaining">'+(left!=null ? formatElapsed(left)+' left' : '')+'</span></div></div>'+
        '<div class="np-ctl">'+(as.breakEndsAt ? '<button class="np-c" data-action="extendBreak" data-minutes="5" title="5 more minutes">+5</button>' : '')+
          '<button class="np-c is-main" data-action="endBreakModeFromFocus" title="End the break">&#9654;</button></div>'+
      '</div>';
  } else {
    const pct = as.plannedMinutes ? Math.min(100, elapsed/(as.plannedMinutes*60000)*100) : Math.min(100, deepWorkMinutesTodayLive()/(state.standards.deepWorkTargetMinutes||180)*100);
    body = '<div class="np-art"><span>'+(m ? m.icon : '&#128274;')+'</span></div>'+
      '<div class="np-meta">'+
        '<div class="np-k">'+(m && as.method.id!=='block' ? m.label : 'Locked in')+'</div>'+
        '<div class="np-title">'+(cur ? escapeHtml(cur.title) : 'Deep work')+'</div>'+
        '<div class="np-sub">'+(typeof methodState==='function' && methodState() ? '<span id="msLine">'+methodLine(methodState())+'</span>' : (as.plannedMinutes ? fmtDurationLabel(as.plannedMinutes)+' session' : fmtDurationLabel(deepWorkMinutesTodayLive())+' of deep work today'))+'</div>'+
        '<div class="np-prog"><div class="np-bar"><i id="focusProgressBar" style="width:'+pct.toFixed(1)+'%"></i></div>'+
          '<div class="np-times"><span id="focusElapsed">'+formatElapsed(elapsed)+'</span><span>'+(as.plannedMinutes ? fmtTimeShort(as.startedAt + as.plannedMinutes*60000) : '')+'</span></div></div>'+
        '<div class="np-ctl">'+
          '<button class="np-c" data-action="openBreakNotePrompt" title="Take a break">&#9749;</button>'+
          (cur ? '<button class="np-c is-main" data-action="finishCurrentTask" title="Done with this task">&#10003;</button>' : '<button class="np-c is-main" data-action="openStopFocus" title="Lock out">&#9632;</button>')+
          '<button class="np-c" data-action="openStopFocus" title="Lock out">&#128275;</button>'+
        '</div>'+
        (nx && (!cur || nx.id!==cur.id) ? '<div class="np-next">Up next &middot; '+escapeHtml(nx.title)+'</div>' : '')+
      '</div>';
  }
  return '<div class="np'+(onBreak?' is-break':'')+'">'+
    '<div class="np-bg"></div>'+
    '<div class="np-top"><span class="np-time" id="liveClock"></span>'+(ring ? '<span class="np-ring">&#9200; '+ring+'</span>' : '')+'<span style="flex:1"></span>'+focusPlayerHtml(true)+lockedViewBtnHtml()+'</div>'+
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
const FOCUS_TRACKS = [
  {name:'First Light', bpm:68, prog:[[174.6,220,261.6,329.6],[164.8,196,246.9,293.7],[146.8,174.6,220,261.6],[130.8,164.8,196,246.9]], arp:[0,2,1,3,2,1], wave:'triangle', hiss:0.005},
  {name:'Low Tide', bpm:60, prog:[[130.8,196,246.9,329.6],[110,164.8,220,261.6],[116.5,174.6,220,293.7],[98,146.8,196,246.9]], arp:[0,1,2,1], wave:'sine', hiss:0.004},
  {name:'Paper Lanterns', bpm:74, prog:[[146.8,220,277.2,329.6],[123.5,185,246.9,293.7],[138.6,207.7,261.6,329.6],[110,164.8,220,277.2]], arp:[3,2,0,2,1,2], wave:'triangle', hiss:0.006},
  {name:'Night Bus', bpm:64, prog:[[110,164.8,207.7,261.6],[98,146.8,185,233.1],[103.8,155.6,196,246.9],[92.5,138.6,174.6,220]], arp:[0,2,3,2], wave:'sine', hiss:0.007},
  {name:'Still Water', bpm:56, prog:[[130.8,164.8,196,246.9],[146.8,174.6,220,261.6],[123.5,164.8,196,246.9],[110,146.8,174.6,220]], arp:[0,1,2,3,2,1,0], wave:'sine', hiss:0.003},
  {name:'Late Studio', bpm:70, prog:[[155.6,196,233.1,293.7],[138.6,174.6,207.7,261.6],[123.5,155.6,185,233.1],[116.5,146.8,174.6,220]], arp:[1,3,2,0], wave:'triangle', hiss:0.006}
];
const FM = {playing:false, idx:0, bar:0, nextAt:0, timer:0, bus:null, hiss:null};
const FM_BARS = 24; // about a minute and a half to two minutes a track
function fmVolume(){ const v = Number(state.profile.musicVolume); return isFinite(v) && state.profile.musicVolume!=null ? Math.max(0, Math.min(1, v)) : 0.7; }
function fmBus(ctx){
  if(FM.bus && FM.bus.ctx===ctx) return FM.bus;
  const g = ctx.createGain(); g.gain.value = 0.0001; g.connect(sfxOut(ctx));
  FM.bus = {ctx:ctx, g:g};
  return FM.bus;
}
function fmBar(ctx, out, t, tr, bar){
  const beat = 60/tr.bpm, len = beat*4, ch = tr.prog[bar % tr.prog.length];
  padChord(ctx, out, t, ch, len*0.35, len*0.45, len*0.6, 0.022);
  sfxPluck(ctx, out, t, ch[0]/2, len*0.9, 0.04, 'sine');
  const steps = tr.arp.length, step = len/steps;
  tr.arp.forEach(function(n, i){ if((bar + i) % 5 === 4) return; sfxPluck(ctx, out, t + i*step + (i%2 ? step*0.08 : 0), ch[n % ch.length]*2, step*2.2, 0.014 + (i===0 ? 0.006 : 0), tr.wave); });
  // a soft brush on the off-beats
  for(let i=0;i<4;i++) sfxTap(ctx, out, t + i*beat + beat*0.5, 4200, 0.018);
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
