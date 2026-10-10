
// ============ THE DAY LOOP ============
// Night:   Wind down → a clean recap of today → your plan of attack for tomorrow (numbered, in
//          order) → a note to wake up to → the alarm → Go to sleep.
// Morning: the alarm (with last night's note right on it) → I'm up → Good morning → the briefing
//          (yesterday, the note, today's plan) → Start my morning: a Morning mode with your
//          routine (water, breakfast, shower…), the note and the plan, until you hit
//          "I'm ready — lock in". Auto lock-in stays paused through sleep and the morning.
// The plan you make at night lines itself up the next day — nothing to click.

// ---------- wind down ----------
function windTarget(){ return typeof wakeTargetDate==='function' ? wakeTargetDate() : addDays(todayStr(), 1); }
function windTask(id){ return state.tasks.items.find(function(t){ return t.id===id && t.status!=='done'; }) || null; }
function openWindDown(step){
  const target = windTarget();
  const np = state.focus.nightPlan && state.focus.nightPlan.date===target ? state.focus.nightPlan : null;
  let plan = np ? arr(np.taskIds).filter(windTask) : [];
  if(!plan.length) plan = lineupOrdered(state.tasks.items.filter(function(t){ return t.status==='today' && !isOngoingDoneToday(t); })).slice(0, 6).map(function(t){ return t.id; });
  ui.wind = {step:step || 'recap', plan:plan, target:target, search:'', alarm:(wakeTimeFor(target) || ''), noAlarm:false};
  ui.windDownOpen = false;
  showOverlay('windOverlay'); renderWindInto(); playNight();
}
ACTIONS.openWindDown = function(el){ openWindDown(el && el.dataset && el.dataset.step); };
ACTIONS.closeWindDown = function(){ windSave(false); ui.wind = null; hideOverlay('windOverlay'); renderView(); };
ACTIONS.windStep = function(el, e, id){ windReadForm(); ui.wind.step = id; renderWindInto(); };
const WIND_STEPS = [['recap','Today'],['plan','Plan of attack'],['note','Note'],['alarm','Alarm']];
ACTIONS.windNext = function(){ windReadForm(); const i = WIND_STEPS.findIndex(function(s){ return s[0]===ui.wind.step; }); ui.wind.step = WIND_STEPS[Math.min(WIND_STEPS.length-1, i+1)][0]; renderWindInto(); };
ACTIONS.windBack = function(){ windReadForm(); const i = WIND_STEPS.findIndex(function(s){ return s[0]===ui.wind.step; }); ui.wind.step = WIND_STEPS[Math.max(0, i-1)][0]; renderWindInto(); };
function windReadForm(){
  const w = ui.wind; if(!w) return;
  const n = document.getElementById('windNote');
  if(n && n.value.trim()){ addMorningNote(n.value); n.value = ''; }
  const a = document.getElementById('windAlarm'); if(a) w.alarm = a.value;
}
// save the plan + alarm (and optionally go to sleep)
function windSave(sleep){
  const w = ui.wind; if(!w) return;
  windReadForm();
  const prev = state.focus.nightPlan;
  if(prev && prev.alarmId) state.focus.alarms = state.focus.alarms.filter(function(x){ return x.id!==prev.alarmId; });
  state.focus.nightPlan = {date:w.target, taskIds:w.plan.filter(windTask), note:'', alarmId:null, createdAt:Date.now(), applied:false, dismissed:false};
  const wk = wakeCfg(), base = wakeBaseTimeFor(w.target), want = w.noAlarm ? null : (w.alarm || null);
  if((want||null)!==(wakeTimeFor(w.target)||null)){
    if(!want) wk.override = base ? {date:w.target, off:true} : null;
    else if(want===base) wk.override = null;
    else wk.override = {date:w.target, time:want};
    wakeArm();
  }
  persist('focus');
  if(sleep){
    if(state.focus.activeSession){ showToast('Stop your session first, then go to sleep.', {icon:'&#127769;'}); return; }
    ui.wind = null; hideOverlay('windOverlay');
    startMode('offtime', {sleep:true, note:'Sleep'});
    const t = wakeTimeFor(w.target);
    showToast('Good night. '+(t ? 'Alarm '+fmt12Hour(t)+' '+morningLabel(w.target)+'.' : 'No alarm set.'), {icon:'&#127769;', duration:5000});
  }
}
ACTIONS.windGoToSleep = function(){ windSave(true); };
ACTIONS.windSaveOnly = function(){ windSave(false); ui.wind = null; hideOverlay('windOverlay'); renderView(); showToast('Tomorrow\'s plan is set.', {icon:'&#127769;'}); };
// plan editing
ACTIONS.windAdd = function(el, e, id){ const w = ui.wind; if(!w || w.plan.indexOf(id)>=0) return; w.plan.push(id); playTick(); renderWindInto(); };
ACTIONS.windRemove = function(el, e, id){ const w = ui.wind; w.plan = w.plan.filter(function(x){ return x!==id; }); renderWindInto(); };
ACTIONS.windMove = function(el, e, id){ const w = ui.wind, i = w.plan.indexOf(id), j = i + Number(el.dataset.dir); if(i<0 || j<0 || j>=w.plan.length) return; w.plan.splice(i, 1); w.plan.splice(j, 0, id); renderWindInto(); };
ACTIONS.windNewTask = function(){
  const inp = document.getElementById('windNewTask'), title = inp ? inp.value.trim() : ''; if(!title) return;
  const t = {id:uid(), title:title, client:'personal', clients:['personal'], priority:'med', deadline:null, notes:'', status:'backlog', createdAt:todayStr(), completedAt:null};
  state.tasks.items.push(t); persist('tasks');
  ui.wind.plan.push(t.id); inp.value = ''; playTaskAdded(); renderWindInto();
  setTimeout(function(){ const i = document.getElementById('windNewTask'); if(i) i.focus(); }, 20);
};
ACTIONS.windNoAlarm = function(){ windReadForm(); ui.wind.noAlarm = !ui.wind.noAlarm; renderWindInto(); };
document.addEventListener('keydown', function(e){
  if(e.key==='Enter' && e.target && e.target.id==='windNewTask'){ e.preventDefault(); ACTIONS.windNewTask(); }
});
document.addEventListener('input', function(e){ if(e.target && e.target.id==='windSearch' && ui.wind){ ui.wind.search = e.target.value; clearTimeout(ui._windT); ui._windT = setTimeout(renderWindInto, 120); } });
// drag a row to reorder — or drag a task in from "From your list" to drop it at that spot
document.addEventListener('dragstart', function(e){
  if(!ui.wind) return;
  const r = e.target.closest && e.target.closest('.wd-row, .wd-chip[data-id]'); if(!r) return;
  ui.wind.dragId = r.dataset.id; e.dataTransfer.effectAllowed = 'move';
  try{ e.dataTransfer.setData('text/plain', 'wind'); }catch(err){}
  const n = r.querySelector('.wd-num'), t = r.querySelector('.wd-title, span');
  dragGhost(e, t ? t.textContent : '', {num: n ? n.textContent : null, src: r});
  document.body.classList.add('is-wind-drag');
});
function windDropMarks(row, below){ document.querySelectorAll('.wd-row.drop-above, .wd-row.drop-below').forEach(function(x){ if(x!==row){ x.classList.remove('drop-above', 'drop-below'); } }); if(row){ row.classList.toggle('drop-below', below); row.classList.toggle('drop-above', !below); } }
document.addEventListener('dragover', function(e){
  if(!ui.wind || !ui.wind.dragId || !e.target.closest) return;
  const r = e.target.closest('.wd-row'), zone = e.target.closest('.wd-plan');
  if(!r && !zone) return;
  e.preventDefault();
  if(r){ const rect = r.getBoundingClientRect(); windDropMarks(r, e.clientY > rect.top + rect.height/2); } else windDropMarks(null);
});
document.addEventListener('dragend', function(){ windDropMarks(null); document.body.classList.remove('is-wind-drag'); });
document.addEventListener('drop', function(e){
  if(!ui.wind || !ui.wind.dragId || !e.target.closest) return;
  const r = e.target.closest('.wd-row'), zone = e.target.closest('.wd-plan'); if(!r && !zone) return;
  e.preventDefault(); windDropMarks(null); document.body.classList.remove('is-wind-drag');
  const w = ui.wind, id = w.dragId; w.dragId = null;
  const from = w.plan.indexOf(id);
  if(from>=0) w.plan.splice(from, 1);
  let to = w.plan.length;
  if(r && r.dataset.id!==id){ const rect = r.getBoundingClientRect(); to = w.plan.indexOf(r.dataset.id); if(to<0) to = w.plan.length; else if(e.clientY > rect.top + rect.height/2) to++; }
  else if(r && from>=0) to = from;
  w.plan.splice(to, 0, id);
  playDrop(); renderWindInto();
});
// ---- the recap: today in numbers ----
function dayTimelineHtml(date){
  const list = sessionsOn(date), start = 6*60, end = 24*60, span = end-start;
  const pct = function(ts){ const d = new Date(ts); return Math.max(0, Math.min(100, ((d.getHours()*60+d.getMinutes())-start)/span*100)); };
  const blocks = list.map(function(s){ const a = pct(s.startedAt), b = pct(s.endedAt||Date.now()); return '<i class="wd-tl-b wd-tl-'+sessionType(s)+'" style="left:'+a.toFixed(2)+'%;width:'+Math.max(0.6, b-a).toFixed(2)+'%" title="'+fmtTimeShort(s.startedAt)+' – '+fmtTimeShort(s.endedAt||Date.now())+' · '+fmtDurationLabel(s.minutes||0)+'"></i>'; }).join('');
  const as = state.focus.activeSession;
  const live = as && date===todayStr() ? '<i class="wd-tl-b wd-tl-live" style="left:'+pct(as.startedAt).toFixed(2)+'%;width:'+Math.max(0.6, pct(Date.now())-pct(as.startedAt)).toFixed(2)+'%"></i>' : '';
  return '<div class="wd-tl"><div class="wd-tl-track">'+blocks+live+'</div><div class="wd-tl-axis"><span>6a</span><span>9a</span><span>12p</span><span>3p</span><span>6p</span><span>9p</span><span>12a</span></div></div>';
}
function windRecapHtml(){
  const d = todayStr(), target = state.standards.deepWorkTargetMinutes || 180;
  const deep = deepWorkMinutesTodayLive(), pct = Math.min(100, deep/target*100);
  const done = state.tasks.items.filter(function(t){ return t.status==='done' && t.completedAt===d; });
  const sess = sessionsOn(d), longest = sess.reduce(function(m, s){ return Math.max(m, s.minutes||0); }, 0);
  const wk = typeof workoutDay==='function' ? workoutDay(d) : {n:0, m:0};
  const std = dayStandardsComplete(d), streak = computeStreak();
  const delivs = arr(state.business.clients).reduce(function(n, c){ return n + arr(c.deliverables).reduce(function(m, x){ return m + arr(x.completedDates).filter(function(z){ return z===d; }).length; }, 0); }, 0);
  const touches = arr(state.business.clients).reduce(function(n, c){ return n + arr(c.touches).filter(function(z){ return z===d; }).length; }, 0) + arr(state.business.pipeline).reduce(function(n, l){ return n + arr(l.touchpoints).filter(function(z){ return z.date===d; }).length; }, 0);
  const left = state.tasks.items.filter(function(t){ return t.status==='today'; }).length;
  const tom = windTarget();
  const tomEvents = arr(state.calendar.events).filter(function(e){ return e.date===tom; }).sort(function(a, b){ return (a.time||'').localeCompare(b.time||''); });
  const tomDue = state.tasks.items.filter(function(t){ return t.status!=='done' && t.deadline===tom; });
  const R = 46, C = 2*Math.PI*R;
  return '<div class="wd-recap">'+
    '<div class="wd-hero">'+
      '<div class="wd-ring"><svg viewBox="0 0 110 110"><circle cx="55" cy="55" r="'+R+'" class="wd-ring-bg"/><circle cx="55" cy="55" r="'+R+'" class="wd-ring-fg'+(deep>=target?' is-hit':'')+'" stroke-dasharray="'+C.toFixed(1)+'" stroke-dashoffset="'+(C*(1-pct/100)).toFixed(1)+'"/></svg>'+
        '<div class="wd-ring-c"><div class="wd-ring-v">'+fmtHours(deep)+'</div><div class="wd-ring-k">of '+fmtHours(target)+' deep work</div></div></div>'+
      '<div class="wd-stats">'+
        '<div class="wd-stat"><b>'+done.length+'</b><span>tasks done</span></div>'+
        '<div class="wd-stat"><b>'+sess.length+'</b><span>session'+(sess.length===1?'':'s')+(longest ? ' · longest '+fmtDurationLabel(longest) : '')+'</span></div>'+
        '<div class="wd-stat'+(std?' is-good':'')+'"><b>'+(std ? '&#10003;' : '&#10005;')+'</b><span>today\'s standard</span></div>'+
        '<div class="wd-stat"><b>'+streak+'</b><span>day streak</span></div>'+
        (wk.n ? '<div class="wd-stat is-good"><b>'+wk.n+'</b><span>workout'+(wk.n===1?'':'s')+(wk.m ? ' · '+fmtDurationLabel(wk.m) : '')+'</span></div>' : '')+
        ((delivs || touches) ? '<div class="wd-stat"><b>'+(delivs+touches)+'</b><span>client moves ('+delivs+' delivered, '+touches+' touches)</span></div>' : '')+
      '</div>'+
    '</div>'+
    '<div class="wd-k">When you worked</div>'+dayTimelineHtml(d)+
    '<div class="wd-cols">'+
      '<div><div class="wd-k">Done today</div>'+(done.length ? '<ul class="wd-done">'+done.slice(0, 8).map(function(t){ return '<li>&#10003; '+escapeHtml(t.title)+'</li>'; }).join('')+(done.length>8 ? '<li class="kpi-sub">+'+(done.length-8)+' more</li>' : '')+'</ul>' : '<div class="kpi-sub">Nothing ticked off today.</div>')+
        (left ? '<div class="kpi-sub" style="margin-top:8px;">'+left+' still on today\'s list — carry them into tomorrow\'s plan.</div>' : '')+'</div>'+
      '<div><div class="wd-k">Tomorrow</div>'+((tomEvents.length || tomDue.length) ? '<div class="wd-tom">'+tomEvents.map(function(e){ return '<div><b>'+(e.time ? fmt12Hour(e.time) : 'All day')+'</b> '+escapeHtml(e.title)+'</div>'; }).join('')+tomDue.map(function(t){ return '<div><b class="is-due">Due</b> '+escapeHtml(t.title)+'</div>'; }).join('')+'</div>' : '<div class="kpi-sub">Nothing on the calendar yet.</div>')+'</div>'+
    '</div>'+
    (typeof recapPendingCount==='function' && recapPendingCount() ? '<button class="btn btn-ghost btn-sm" style="margin-top:14px;" data-action="openDayRecap">Review today\'s sessions ('+recapPendingCount()+' to check)</button>' : '')+
  '</div>';
}
function windPlanHtml(){
  const w = ui.wind;
  const rows = w.plan.map(windTask).filter(Boolean);
  const q = (w.search||'').toLowerCase();
  const pool = sortByPriorityAndDeadline(state.tasks.items.filter(function(t){ return (t.status==='today' || t.status==='backlog') && w.plan.indexOf(t.id)<0 && (!q || t.title.toLowerCase().indexOf(q)>=0); })).slice(0, 14);
  return '<div class="wd-plan">'+
    '<div class="wd-sub">In the order you\'ll do them. #1 is what you lock in on first.</div>'+
    (rows.length ? '<ol class="wd-list">'+rows.map(function(t, i){
      return '<li class="wd-row" draggable="true" data-id="'+t.id+'"><span class="wd-num">'+String(i+1).padStart(2,'0')+'</span>'+priorityTag(t.priority)+'<span class="wd-title">'+escapeHtml(t.title)+'</span>'+
        '<button class="wd-ctl" data-action="windMove" data-id="'+t.id+'" data-dir="-1" title="Up"'+(i===0?' disabled':'')+'>&#8593;</button><button class="wd-ctl" data-action="windMove" data-id="'+t.id+'" data-dir="1" title="Down"'+(i===rows.length-1?' disabled':'')+'>&#8595;</button>'+
        '<button class="wd-ctl wd-x" data-action="windRemove" data-id="'+t.id+'" title="Take it off">&#10005;</button></li>';
    }).join('')+'</ol>' : '<div class="wd-empty">Nothing planned yet — add what matters most first.</div>')+
    '<div class="wd-add"><input class="input" id="windNewTask" placeholder="+ A new task for tomorrow (Enter)"><button class="btn btn-sm" data-action="windNewTask">Add</button></div>'+
    '<div class="wd-k" style="margin-top:16px;">From your list</div>'+
    '<input class="input wd-search" id="windSearch" placeholder="Search…" value="'+escapeHtml(w.search||'')+'">'+
    '<div class="wd-pool">'+(pool.length ? pool.map(function(t){ return '<button class="wd-chip" draggable="true" data-action="windAdd" data-id="'+t.id+'" title="Click to add, or drag it into the list">'+priorityTag(t.priority)+'<span>'+escapeHtml(t.title)+'</span><b>+</b></button>'; }).join('') : '<span class="kpi-sub">Nothing else on your lists.</span>')+'</div>'+
  '</div>';
}
function windNoteHtml(){
  const w = ui.wind, notes = morningNotesFor(w.target);
  return '<div class="wd-note">'+
    '<div class="wd-sub">Shows up on your alarm screen and at the top of tomorrow\'s briefing.</div>'+
    (notes.length ? '<div class="wd-notes">'+notes.map(function(n){ return '<div class="wd-note-item"><span>&ldquo;'+escapeHtml(n.text)+'&rdquo;</span><button class="mn-x" data-action="removeMorningNote" data-id="'+n.id+'" title="Remove">&#10005;</button></div>'; }).join('')+'</div>' : '')+
    '<textarea class="input wd-note-input" id="windNote" placeholder="What does tomorrow-you need to hear?"></textarea>'+
  '</div>';
}
function windAlarmHtml(){
  const w = ui.wind, wk = wakeCfg(), base = wakeBaseTimeFor(w.target);
  return '<div class="wd-alarm">'+
    '<div class="wd-sub">'+(base ? 'Usual: '+fmt12Hour(base)+'. Changing it here only changes '+morningLabel(w.target)+'.' : 'No daily alarm that day — set one here.')+'</div>'+
    (w.noAlarm ? '<div class="wd-noalarm">No alarm '+morningLabel(w.target)+'</div>' : '<input class="ws-time wd-time" type="time" id="windAlarm" value="'+escapeHtml(w.alarm||'')+'">')+
    '<div class="row" style="gap:8px;justify-content:center;margin-top:10px;"><button class="btn btn-ghost btn-sm" data-action="windNoAlarm">'+(w.noAlarm ? 'Set an alarm' : 'No alarm '+morningLabel(w.target))+'</button>'+
      '<button class="btn btn-ghost btn-sm" data-action="openWakeSetup">Sound &amp; music</button></div>'+
    '<div class="wd-sound">'+(wakeUsesMusic(wk) ? '&#9835; '+escapeHtml(mediaName(wk.media)) : '&#128276; '+wakeBeepSound(wk)[0].toUpperCase()+wakeBeepSound(wk).slice(1)+' tone')+'</div>'+
  '</div>';
}
function windHtml(){
  const w = ui.wind; if(!w) return '';
  const i = WIND_STEPS.findIndex(function(s){ return s[0]===w.step; });
  const titles = {recap:'Here\'s how today went.', plan:'Plan of attack — '+morningLabel(w.target)+'.', note:'A note for the morning.', alarm:'Wake up '+morningLabel(w.target)+' at…'};
  const body = w.step==='plan' ? windPlanHtml() : w.step==='note' ? windNoteHtml() : w.step==='alarm' ? windAlarmHtml() : windRecapHtml();
  return '<div class="wd">'+
    '<div class="wd-top"><span class="wd-moon">&#127769;</span><span class="wd-brand">Wind down</span>'+
      '<div class="wd-steps">'+WIND_STEPS.map(function(s, k){ return '<button class="wd-step'+(k===i?' is-on':'')+(k<i?' is-past':'')+'" data-action="windStep" data-id="'+s[0]+'"><span>'+(k+1)+'</span>'+s[1]+'</button>'; }).join('')+'</div>'+
      '<button class="wd-close" data-action="closeWindDown" title="Close (your plan is kept)">&#10005;</button></div>'+
    '<div class="wd-inner" data-key="wd-'+w.step+'"><h2 class="wd-title-h">'+titles[w.step]+'</h2>'+body+'</div>'+
    '<div class="wd-foot">'+
      (i>0 ? '<button class="btn btn-ghost" data-action="windBack">&larr; Back</button>' : '<span></span>')+
      (w.step==='alarm' ? '<span class="row" style="gap:8px;"><button class="btn btn-ghost" data-action="windSaveOnly">Save — not sleeping yet</button><button class="btn wd-sleep" data-action="windGoToSleep">&#127769; Go to sleep</button></span>'
        : '<button class="btn btn-primary" data-action="windNext">Next &rarr;</button>')+
    '</div>'+
  '</div>';
}
function renderWindInto(){ const el = document.getElementById('windContent'); if(el) morphInto(el, windHtml(), {form:true}); }
registerModal('windOverlay', renderWindInto);
// the old "Plan tomorrow" opens the same thing
ACTIONS.openNightPlan = function(){ openWindDown('plan'); };

// ---------- morning: the plan lines itself up; Morning mode ----------
// Last night's plan becomes today's lineup, in that order, the first time the app sees the day.
function applyNightPlanAuto(){
  const np = state.focus.nightPlan;
  if(!np || np.date!==todayStr() || np.applied) return false;
  const ids = arr(np.taskIds).filter(function(id){ return windTask(id); });
  ids.forEach(function(id){ const t = windTask(id); if(t && t.status==='backlog') t.status = 'today'; });
  const rest = arr(state.focus.lineupOrder).filter(function(id){ return ids.indexOf(id)<0; });
  state.focus.lineupOrder = ids.concat(rest);
  if(ids[0]) state.focus.nextTaskId = ids[0];
  np.applied = true;
  persist('tasks'); persist('focus');
  return true;
}
function todaysPlan(){
  const np = state.focus.nightPlan;
  const ids = np && np.date===todayStr() ? arr(np.taskIds) : [];
  const fromPlan = ids.map(function(id){ return state.tasks.items.find(function(t){ return t.id===id; }); }).filter(Boolean);
  if(fromPlan.length) return fromPlan;
  return lineupOrdered(state.tasks.items.filter(function(t){ return t.status==='today'; }));
}
const DEFAULT_ROUTINE = [{id:'r1', text:'&#128167; Water'}, {id:'r2', text:'&#127859; Breakfast'}, {id:'r3', text:'&#128703; Shower'}, {id:'r4', text:'&#128085; Get dressed'}, {id:'r5', text:'&#129504; Read the plan'}];
function morningRoutine(){ if(!Array.isArray(state.focus.morningRoutine)) state.focus.morningRoutine = DEFAULT_ROUTINE.map(function(x){ return {id:x.id, text:x.text.replace(/&#(\d+);/g, function(m, n){ return String.fromCodePoint(Number(n)); })}; }); return state.focus.morningRoutine; }
function routineDone(){ const r = state.focus.routineDone; return r && r.date===todayStr() ? r.ids : []; }
ACTIONS.routineTick = function(el, e, id){
  const done = routineDone().slice(), i = done.indexOf(id);
  if(i>=0) done.splice(i, 1); else { done.push(id); playTick(); }
  state.focus.routineDone = {date:todayStr(), ids:done};
  if(done.length===morningRoutine().length && i<0) playPositive();
  persist('focus'); renderView();
};
ACTIONS.routineEdit = function(){ ui.routineEdit = !ui.routineEdit; renderView(); };
ACTIONS.routineRemove = function(el, e, id){ state.focus.morningRoutine = morningRoutine().filter(function(x){ return x.id!==id; }); persist('focus'); renderView(); };
ACTIONS.routineAdd = function(){ const i = document.getElementById('routineNew'), v = i ? i.value.trim() : ''; if(!v) return; morningRoutine().push({id:uid(), text:v}); i.value = ''; persist('focus'); renderView(); };
document.addEventListener('keydown', function(e){ if(e.key==='Enter' && e.target && e.target.id==='routineNew'){ e.preventDefault(); ACTIONS.routineAdd(); } });
function startMorning(){
  applyNightPlanAuto();
  if(!(state.modes.active && state.modes.active.morning)) startMode('offtime', {morning:true, note:'Morning'});
  ui.view = 'today'; renderView();
}
ACTIONS.startMorning = function(){ startMorning(); };
ACTIONS.morningLockIn = function(el, e, id){
  if(state.modes.active && state.modes.active.morning) finishActiveMode(true);
  if(id) setNextUp(id);
  renderView(); openLockInChooser();
};
ACTIONS.morningBriefing = function(){ ui.wakeMode = 'brief'; ui.wakeIntroDone = true; ui.briefSkipped = true; ui.briefShift = 0; ui.briefT0 = Date.now() - 1e7; ui.wakeBriefTest = false; loadMorningNews(); showOverlay('wakeOverlay'); renderWakeOverlayInto(); briefVoiceRun(); };
function planListHtml(list, cls){
  return '<ol class="plan-list '+(cls||'')+'">'+list.map(function(t, i){ const done = t.status==='done'; return '<li class="'+(done?'is-done':'')+(i===0 && !done?' is-first':'')+'"><span class="pl-num">'+(done ? '&#10003;' : String(i+1).padStart(2,'0'))+'</span>'+priorityTag(t.priority)+'<span class="pl-t">'+escapeHtml(t.title)+'</span></li>'; }).join('')+'</ol>';
}
// Morning mode is life first — the routine, last night's note, the vision — and no work on the
// screen until you Clock in (then the plan of attack shows up).
function renderMorningView(){
  const active = state.modes.active, p = state.profile;
  const notes = morningNotesFor(todayStr());
  const routine = morningRoutine(), done = routineDone();
  const editing = !!ui.routineEdit;
  const q = quoteOfDay();
  const vb = masterVisionBoard();
  return '<div class="mm" data-sky="'+skyLook()+'">'+
    '<div class="mm-head"><div><div class="mm-k">&#9728;&#65039; Morning</div><div class="mm-greet">'+wakeGreeting()+', '+escapeHtml(p.name||'')+'.</div>'+
      '<div class="mm-sub">Up for <span id="modeElapsed">'+formatElapsed(Date.now()-active.startedAt)+'</span> &middot; '+new Date().toLocaleDateString(undefined, {weekday:'long', month:'long', day:'numeric'})+(wakeWeatherLine() ? ' &middot; '+wakeWeatherLine() : '')+'</div></div>'+
      '<button class="btn btn-ghost btn-sm" data-action="morningBriefing">&#9728;&#65039; Good morning</button></div>'+
    (notes.length ? '<div class="mm-note"><div class="mm-k">&#127769; From Last Night</div>'+notes.map(function(n){ return '<div class="mm-note-t">'+escapeHtml(n.text)+'</div>'; }).join('')+'</div>' : '')+
    '<div class="mm-grid">'+
      '<div class="mm-card"><div class="mm-card-h"><span class="mm-k">Get going</span><span class="kpi-sub">'+done.length+'/'+routine.length+'</span><button class="mm-edit" data-action="routineEdit">'+(editing?'Done':'&#9998;')+'</button></div>'+
        '<div class="mm-routine">'+routine.map(function(r){ const on = done.indexOf(r.id)>=0;
          return '<div class="mm-r'+(on?' is-on':'')+'"><button class="mm-r-main" data-action="routineTick" data-id="'+r.id+'"><span class="mm-tick">'+(on?'&#10003;':'')+'</span><span>'+escapeHtml(r.text)+'</span></button>'+(editing ? '<button class="mn-x" data-action="routineRemove" data-id="'+r.id+'">&#10005;</button>' : '')+'</div>'; }).join('')+
          (editing ? '<div class="mn-row"><input class="input" id="routineNew" placeholder="+ Add a step (Enter)"><button class="btn btn-sm" data-action="routineAdd">Add</button></div>' : '')+
        '</div></div>'+
      '<div class="mm-card mm-side">'+
        '<div class="mm-quote"><div class="mm-k">&#10024; For Today</div>'+quoteHtml(q)+'</div>'+
        '<div class="mm-thoughts"><div class="mm-k">&#127807; For a Good Day</div>'+thoughtsOfDay(3).map(function(x){ return '<div class="br-th"><span class="br-th-i">'+x[0]+'</span><div><b>'+x[1]+'</b><span>'+x[2]+'</span></div></div>'; }).join('')+'</div>'+
        (vb && vb.elements.length ? '<div class="mm-vision" data-action="openVisionFull" title="Open your vision board">'+boardStaticHtml(vb, 'wake-board')+'</div>' : '')+
      '</div>'+
    '</div>'+
    '<div class="mm-cta">'+
      '<button class="brief-go brief-clockin mm-clockin" data-action="clockIn">&#128188; Start Work</button>'+
      '<button class="brief-later mm-end" data-action="endMode">End Morning</button>'+
    '</div>'+
  '</div>';
}
afterRenderHooks.push(function(){ if(typeof state!=='undefined' && state && state.focus && applyNightPlanAuto()) setTimeout(renderView, 0); });
