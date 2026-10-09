
// ============ EVENTS ↔ TASKS, PREP ALARMS, REMINDERS, NIGHT PLAN, SLEEP ============
function shiftHM(hm, deltaMinutes){
  const p = String(hm||'00:00').split(':').map(Number);
  let m = ((p[0]*60+p[1]+deltaMinutes)%1440+1440)%1440;
  return pad2(Math.floor(m/60))+':'+pad2(m%60);
}
// ---- event ↔ task links ----
function renderEventTaskPicker(e){
  const linked = new Set(arr(e.taskIds));
  if(e.id) state.tasks.items.forEach(function(t){ if(t.eventId===e.id) linked.add(t.id); });
  const open = state.tasks.items.filter(function(t){ return t.status!=='done' || linked.has(t.id); })
    .sort(function(a,b){ return (linked.has(b.id)?1:0)-(linked.has(a.id)?1:0); }).slice(0,60);
  return '<div class="client-check-list" style="max-height:170px;">'+
    (open.map(function(t){
      return '<label class="client-check-row"><input type="checkbox" data-event-task="'+t.id+'" '+(linked.has(t.id)?'checked':'')+'>'+escapeHtml(t.title)+(t.status==='done'?' <span class="kpi-sub">(done)</span>':'')+'</label>';
    }).join('') || '<div class="kpi-sub">No open tasks.</div>')+
  '</div>'+
  (e.id ? '<button class="mini-move mini-move-today" style="margin-top:6px;" data-action="addTaskForEvent" data-id="'+e.id+'">+ New task for this event</button>' : '<div class="kpi-sub" style="margin-top:4px;">Save the event first to create new tasks for it.</div>');
}
function readEventExtras(ev){
  const v = function(id){ const el = document.getElementById(id); return el ? el.value : ''; };
  const c = function(id){ const el = document.getElementById(id); return !!(el && el.checked); };
  ev.location = v('calEventLocation').trim() || null;
  ev.remindBefore = Number(v('calEventRemindBefore'))||0;
  ev.isShoot = c('calEventIsShoot');
  ev.readyTime = v('calEventReadyTime')||null;
  ev.travelMinutes = Number(v('calEventTravel'))||0;
  ev.autoShootMode = ev.isShoot && c('calEventAutoShoot');
  const boxes = document.querySelectorAll('#calEventContent [data-event-task]');
  if(boxes.length){
    const ids = [];
    boxes.forEach(function(b){
      const t = state.tasks.items.find(function(x){ return x.id===b.dataset.eventTask; });
      if(!t) return;
      if(b.checked){ ids.push(t.id); t.eventId = ev.id; }
      else if(t.eventId===ev.id) t.eventId = null;
    });
    ev.taskIds = ids;
  }
}
ACTIONS.addTaskForEvent = function(el, e, id){
  ui.newTaskEventId = id;
  closeCalEventModal();
  openAddTaskModal();
};
// One-off alarms derived from an event: get ready, leave (time − travel), remind-before.
function upsertEventAlarm(ev, kind, dateStr, hm, label){
  ev.extraAlarmIds = ev.extraAlarmIds || {};
  const existingId = ev.extraAlarmIds[kind];
  if(!dateStr || !hm){
    if(existingId){ state.focus.alarms = state.focus.alarms.filter(function(a){ return a.id!==existingId; }); delete ev.extraAlarmIds[kind]; }
    return;
  }
  let a = existingId ? state.focus.alarms.find(function(x){ return x.id===existingId; }) : null;
  if(!a){ a = {id:uid(), days:[], enabled:true}; state.focus.alarms.push(a); ev.extraAlarmIds[kind] = a.id; }
  a.time = hm; a.date = dateStr; a.label = label; a.eventId = ev.id; a.kind = kind; a.enabled = true;
}
function eventStartTs(ev){ return ev.time ? localTs(ev.date, ev.time) : null; }
function syncEventExtraAlarms(ev){
  const start = eventStartTs(ev);
  const at = function(ts){ const d = new Date(ts); return [todayStr(d), nowHM(d)]; };
  if(ev.readyTime) upsertEventAlarm(ev, 'ready', ev.date, ev.readyTime, 'Start getting ready — '+ev.title);
  else upsertEventAlarm(ev, 'ready', null);
  if(start && ev.travelMinutes>0){ const x = at(start-ev.travelMinutes*60000); upsertEventAlarm(ev, 'leave', x[0], x[1], 'Time to leave — '+ev.title+(ev.location?' ('+ev.location+')':'')); }
  else upsertEventAlarm(ev, 'leave', null);
  if(start && ev.remindBefore>0){ const y = at(start-ev.remindBefore*60000); upsertEventAlarm(ev, 'remind', y[0], y[1], ev.title+' in '+fmtDurationLabel(ev.remindBefore)); }
  else upsertEventAlarm(ev, 'remind', null);
}
// ---- Shooting mode from a shoot event ----
function endFocusSessionForSwitch(){
  const s = state.focus.activeSession; if(!s) return;
  if(s.onBreak) endBreakModeFromFocus();
  if(ui.currentTaskId){ accumulateCurrentTaskTime(ui.currentTaskId); persist('tasks'); }
  const endedAt = Date.now();
  state.focus.sessions.push({id:uid(), type:sessionType(s), date:todayStr(new Date(s.startedAt)), startedAt:s.startedAt, endedAt:endedAt, minutes:Math.max(1, Math.round((endedAt-s.startedAt)/60000)), completedTasks:arr(s.completedTasks), note:''});
  state.focus.activeSession = null;
  state.focus.lastSessionEndedAt = endedAt;
  persist('focus');
}
function startShootFromEvent(ev){
  if(!ev) return;
  if(state.modes.active && state.modes.active.type==='shooting') return;
  endFocusSessionForSwitch();
  startMode('shooting', {note:ev.title, eventId:ev.id});
  ev.shootStartedOn = todayStr();
  persist('calendar');
  showToast('Shooting mode started for '+ev.title, {icon:'&#127916;'});
}
ACTIONS.startShootFromEvent = function(el, e, id){ startShootFromEvent(state.calendar.events.find(function(x){ return x.id===id; })); hideOverlay('alarmOverlay'); clearInterval(ringInterval); };
function onEventAlarm(al){
  if(!al || !al.eventId) return;
  const ev = state.calendar.events.find(function(x){ return x.id===al.eventId; });
  if(ev && ev.isShoot && ev.autoShootMode && ev.shootStartedOn!==todayStr() && (al.kind==='ready' || al.kind==='leave' || al.id===ev.alarmId)) startShootFromEvent(ev);
}
// ---- Alarm wake-up content ----
function nightPlanForToday(){ const np = state.focus.nightPlan; return (np && np.date===todayStr()) ? np : null; }
function renderAlarmExtra(al){
  let html = '';
  if(al && al.wakeNote) html += '<div class="alarm-note">'+escapeHtml(al.wakeNote)+'</div>';
  const np = (al && (al.wake || al.kind==='wake')) ? nightPlanForToday() : null;
  if(np){
    if(np.note && np.note!==(al.wakeNote||'')) html += '<div class="alarm-note">'+escapeHtml(np.note)+'</div>';
    const tasks = arr(np.taskIds).map(function(id){ return state.tasks.items.find(function(t){ return t.id===id; }); }).filter(Boolean);
    if(tasks.length) html += '<div class="alarm-plan"><div class="kind-label" style="margin-top:0;">Today\'s plan</div>'+tasks.map(function(t){ return '<div>&#9675; '+escapeHtml(t.title)+'</div>'; }).join('')+'</div>';
  }
  const ev = al && al.eventId ? state.calendar.events.find(function(x){ return x.id===al.eventId; }) : null;
  if(ev){
    html += '<div class="kpi-sub" style="margin-top:6px;">'+escapeHtml(ev.title)+(ev.time?' at '+fmt12Hour(ev.time):'')+(ev.location?' &middot; &#128205; '+escapeHtml(ev.location):'')+'</div>';
    if(ev.isShoot && !(state.modes.active && state.modes.active.type==='shooting')) html += '<button class="btn btn-sm shooting-btn-sm" style="margin-top:10px;" data-action="startShootFromEvent" data-id="'+ev.id+'">&#127916; Start shooting mode</button>';
  }
  return html;
}
ACTIONS.playAlarmMedia = function(el){
  clearInterval(ringInterval);
  const url = el.dataset.url;
  if(url) playWakeMedia({url:url}, function(){ window.open(safariizeUrl(url), '_blank'); });
  el.remove();
};
// ---- Reminders: mini alarm (sound + notification + banner) ----
function fireReminder(r){
  r.firedAt = Date.now();
  persist('focus');
  try{ playAlarmSound(); }catch(e){}
  try{ if('Notification' in window && Notification.permission==='granted') new Notification('Reminder: '+(r.label||'')); }catch(e){}
  showToast(r.label||'Reminder', {icon:'&#128276;', actionLabel:'Done', actionAction:'reminderDone:'+r.id, duration:20000});
}
function checkReminders(){
  const now = Date.now(), today = todayStr();
  arr(state.focus.reminders).forEach(function(r){
    if(!r.time || r.firedAt || !r.date || r.date>today) return;
    const ts = localTs(r.date, r.time);
    // fire on time, or catch up if the app was closed for up to 10 minutes past it
    if(ts<=now && now-ts < 10*60000) fireReminder(r);
  });
}
// toast action "reminderDone:<id>"
document.body.addEventListener('click', function(e){
  const el = e.target.closest && e.target.closest('[data-action^="reminderDone:"]');
  if(!el) return;
  dismissReminder(el.dataset.action.slice('reminderDone:'.length));
  const c = document.getElementById('toastContainer'); if(c) c.innerHTML='';
});
// ---- Turn a task into a reminder ----
let lastTaskToReminder = null;
ACTIONS.taskToReminder = function(el, e, id){
  const t = state.tasks.items.find(function(x){ return x.id===id; }); if(!t) return;
  const r = {id:uid(), label:t.title, date:t.deadline||todayStr(), time:t.deadlineTime||null, fromTaskId:t.id};
  state.focus.reminders.push(r);
  persist('focus');
  closeTaskEditModal();
  deleteTasksUndoable([t.id]);
  showToast('Turned into a reminder'+(r.time?' — mini alarm at '+fmt12Hour(r.time):''), {icon:'&#128276;', actionLabel:'Undo', actionAction:'undoTaskToReminder', duration:7000});
  lastTaskToReminder = r.id;
};
ACTIONS.undoTaskToReminder = function(){
  if(lastTaskToReminder){ state.focus.reminders = state.focus.reminders.filter(function(x){ return x.id!==lastTaskToReminder; }); persist('focus'); }
  lastTaskToReminder = null;
  ACTIONS.undoDeleteTasks();
};
// ---- Next alarm ----
function nextAlarmOccurrence(){
  const now = Date.now(); let best = null;
  const nw = typeof nextWake==='function' ? nextWake() : null;
  if(nw) best = {alarm:{label:'Wake up', time:nw.time, wake:true}, ts:nw.ts, date:nw.date, wake:true};
  arr(state.focus.alarms).forEach(function(a){
    if(!a.enabled || !a.time) return;
    for(let i=0;i<8;i++){
      const d = addDays(todayStr(), i);
      if(a.date){ if(a.date!==d) continue; }
      else { const dow = new Date(localTs(d,'12:00')).getDay(); if(arr(a.days).indexOf(dow)<0) continue; }
      const ts = localTs(d, a.time);
      if(ts<=now) continue;
      if(!best || ts<best.ts) best = {alarm:a, ts:ts, date:d};
      break;
    }
  });
  return best;
}
function untilLabel(ts){
  const m = Math.max(0, Math.round((ts-Date.now())/60000));
  return fmtDurationLabel(m);
}
// ---- Night-before plan ----
function planTargetDate(){ return new Date().getHours()>=15 ? addDays(todayStr(),1) : todayStr(); }
function openNightPlan(){
  const np = state.focus.nightPlan;
  const target = planTargetDate();
  ui.nightPlanDraft = (np && np.date===target) ? {date:np.date, taskIds:arr(np.taskIds).slice(), note:np.note||''} : {date:target, taskIds:[], note:''};
  ui.nightPlanDraft.alarmTime = wakeTimeFor(target) || '';
  showOverlay('nightPlanOverlay'); renderNightPlanModalInto();
}
function renderNightPlanModal(){
  const d = ui.nightPlanDraft; if(!d) return '';
  const sel = new Set(d.taskIds);
  const cands = state.tasks.items.filter(function(t){ return t.status!=='done'; })
    .sort(function(a,b){ return (sel.has(b.id)?1:0)-(sel.has(a.id)?1:0) || taskPriorityRank(a)-taskPriorityRank(b); }).slice(0,80);
  const base = wakeBaseTimeFor(d.date);
  const dayLabel = d.date===todayStr() ? 'today' : 'tomorrow ('+weekdayShort(d.date)+')';
  return '<div class="section-title" style="margin-bottom:14px;">&#127769; Plan '+dayLabel+tip('Shows up when your alarm goes off, and on the Today page in the morning.')+'</div>'+
    '<div class="field"><label>Tasks to line up ('+sel.size+')</label><div class="client-check-list" style="max-height:200px;">'+
      (cands.map(function(t){ return '<label class="client-check-row"><input type="checkbox" data-plan-task="'+t.id+'" '+(sel.has(t.id)?'checked':'')+'>'+(t.isVideoIdea?'&#127916; ':'')+escapeHtml(t.title)+'</label>'; }).join('') || '<div class="kpi-sub">No open tasks yet.</div>')+
    '</div>'+
    '<div class="row" style="margin-top:6px;gap:6px;"><input class="input" id="nightPlanNewTask" placeholder="+ Add a new task to the plan" style="flex:1;"><button class="btn btn-sm" data-action="nightPlanAddTask">Add</button></div></div>'+
    '<div class="field" style="margin-top:12px;"><label>Note to wake up to</label><textarea class="input" id="nightPlanNote" style="width:100%;min-height:70px;" placeholder="What matters tomorrow, and why.">'+escapeHtml(d.note||'')+'</textarea></div>'+
    '<div class="field night-wake-field" style="margin-top:12px;"><label>&#9200; Wake up '+morningLabel(d.date)+' at</label>'+
      '<div class="row" style="gap:10px;align-items:center;flex-wrap:wrap;"><input class="input ws-time ws-time-sm" type="time" id="nightPlanAlarm" value="'+escapeHtml(d.alarmTime||'')+'">'+
      '<span class="kpi-sub">'+(base ? 'Usual: '+fmt12Hour(base)+' ('+wakeDaysLabel(wakeCfg().days)+'). A different time here only changes '+morningLabel(d.date)+'.' : 'No daily alarm that day — set a time to wake up '+morningLabel(d.date)+'.')+'</span>'+
      '<button class="btn btn-ghost btn-sm" data-action="openWakeSetup">Alarm settings &amp; music</button></div></div>'+
    '<div class="row" style="margin-top:18px;justify-content:space-between;">'+
      (state.focus.nightPlan ? '<button class="btn btn-ghost btn-sm mini-move-danger" data-action="clearNightPlan">Clear plan</button>' : '<span></span>')+
      '<div class="row"><button class="btn btn-ghost" data-action="closeNightPlan">Cancel</button><button class="btn btn-primary" data-action="saveNightPlan">Save plan</button></div>'+
    '</div>';
}
function renderNightPlanModalInto(){ const el=document.getElementById('nightPlanContent'); if(el) morphInto(el, renderNightPlanModal(), {form:true}); }
registerModal('nightPlanOverlay', renderNightPlanModalInto);
function readNightPlanForm(){
  const d = ui.nightPlanDraft; if(!d) return;
  d.taskIds = Array.prototype.map.call(document.querySelectorAll('#nightPlanContent [data-plan-task]:checked'), function(b){ return b.dataset.planTask; });
  const note = document.getElementById('nightPlanNote'); if(note) d.note = note.value;
  const al = document.getElementById('nightPlanAlarm'); if(al) d.alarmTime = al.value;
}
ACTIONS.openNightPlan = openNightPlan;
ACTIONS.closeNightPlan = function(){ ui.nightPlanDraft = null; hideOverlay('nightPlanOverlay'); };
ACTIONS.nightPlanAddTask = function(){
  readNightPlanForm();
  const inp = document.getElementById('nightPlanNewTask');
  const title = inp ? inp.value.trim() : '';
  if(!title) return;
  const t = {id:uid(), title:title, client:'personal', clients:['personal'], priority:'med', deadline:null, notes:'', status:'backlog', createdAt:todayStr(), completedAt:null};
  state.tasks.items.push(t);
  ui.nightPlanDraft.taskIds.push(t.id);
  inp.value = '';
  persist('tasks'); playTaskAdded(); renderNightPlanModalInto();
};
ACTIONS.saveNightPlan = function(){
  readNightPlanForm();
  const d = ui.nightPlanDraft; if(!d) return;
  const prev = state.focus.nightPlan;
  // Older plans made their own one-off alarm; the wake-up alarm handles it now.
  if(prev && prev.alarmId) state.focus.alarms = state.focus.alarms.filter(function(x){ return x.id!==prev.alarmId; });
  const w = wakeCfg();
  if((d.alarmTime||null)!==(wakeTimeFor(d.date)||null)){
    if(!d.alarmTime) w.override = wakeBaseTimeFor(d.date) ? {date:d.date, off:true} : null;
    else if(d.alarmTime===wakeBaseTimeFor(d.date)) w.override = null;
    else w.override = {date:d.date, time:d.alarmTime};
    wakeArm();
  }
  state.focus.nightPlan = {date:d.date, taskIds:d.taskIds, note:d.note||'', alarmId:null, createdAt:Date.now(), applied:false, dismissed:false};
  ui.nightPlanDraft = null;
  hideOverlay('nightPlanOverlay');
  playPositive();
  persist('focus'); renderView();
  const t = wakeTimeFor(d.date);
  showToast('Plan saved for '+morningLabel(d.date)+(t?' — alarm '+fmt12Hour(t):''), {icon:'&#127769;'});
};
ACTIONS.clearNightPlan = function(){
  const np = state.focus.nightPlan;
  if(np && np.alarmId) state.focus.alarms = state.focus.alarms.filter(function(x){ return x.id!==np.alarmId; });
  state.focus.nightPlan = null; ui.nightPlanDraft = null;
  hideOverlay('nightPlanOverlay');
  persist('focus'); renderView();
};
ACTIONS.applyNightPlan = function(){
  const np = nightPlanForToday(); if(!np) return;
  arr(np.taskIds).forEach(function(id){ const t = state.tasks.items.find(function(x){ return x.id===id; }); if(t && t.status==='backlog') t.status = 'today'; });
  np.applied = true;
  playTaskAdded();
  persist('tasks'); persist('focus'); renderView();
};
ACTIONS.dismissNightPlan = function(){ const np = nightPlanForToday(); if(np){ np.dismissed = true; persist('focus'); renderView(); } };
function renderMorningPlanCard(){
  const np = nightPlanForToday();
  if(!np || np.dismissed) return '';
  const tasks = arr(np.taskIds).map(function(id){ return state.tasks.items.find(function(t){ return t.id===id; }); }).filter(Boolean);
  if(!tasks.length && !np.note) return '';
  const pending = tasks.filter(function(t){ return t.status==='backlog'; }).length;
  return '<div class="section"><div class="card morning-plan-card">'+
    '<div class="row" style="justify-content:space-between;align-items:flex-start;">'+
      '<div><div class="kpi-label" style="color:var(--accent);">&#127749; Last night\'s plan</div>'+(np.note?'<div class="morning-note">'+escapeHtml(np.note)+'</div>':'')+'</div>'+
      '<button class="mini-move" data-action="dismissNightPlan" title="Hide for today">&#10005;</button>'+
    '</div>'+
    (tasks.length ? '<div class="morning-tasks">'+tasks.map(function(t){ return '<span class="morning-task'+(t.status==='done'?' is-done':t.status==='today'?' is-today':'')+'">'+(t.status==='done'?'&#10003; ':'')+escapeHtml(t.title)+'</span>'; }).join('')+'</div>' : '')+
    (pending ? '<div class="row" style="justify-content:flex-end;margin-top:10px;"><button class="btn btn-good btn-sm" data-action="applyNightPlan">Line up '+pending+' for today</button></div>' : '')+
  '</div></div>';
}
// ---- Sleep mode ----
ACTIONS.startSleepMode = function(){
  if(state.focus.activeSession){ showToast('Stop your session first, then start Sleep mode.', {icon:'&#127769;'}); return; }
  startMode('offtime', {sleep:true, note:'Sleep'});
  ui.windDownOpen = false;
  if(sessionsOn(todayStr()).length) openDayRecap(todayStr());
};
function renderSleepView(){
  const active = state.modes.active;
  const nw = nextWake();
  const np = upcomingNightPlan();
  const npTasks = np ? arr(np.taskIds).map(function(id){ return state.tasks.items.find(function(t){ return t.id===id; }); }).filter(Boolean) : [];
  return '<div class="view-header today-header"><div><div class="view-title">Sleep mode<span class="sleepy-dots" aria-hidden="true"></span></div><div class="view-sub" id="liveClock"></div></div></div>'+
  '<div class="day-off-wrap"><div class="card day-off-card sleep-card">'+
    '<div class="sleep-moon">&#127769;</div>'+
    '<div class="hero-num" id="modeElapsed" style="color:var(--night-text);">'+formatElapsed(Date.now()-active.startedAt)+'</div>'+
    '<div class="hero-label" style="color:var(--text-dim);">resting &middot; auto lock-in paused</div>'+
    '<div class="sleep-grid">'+
      '<button class="sleep-tile sleep-tile-btn" data-action="openWakeSetup"><div class="kpi-label">Wake-up</div>'+(nw ? '<div class="sleep-tile-val">'+fmt12Hour(nw.time)+'</div><div class="kpi-sub">'+morningLabel(nw.date)+' &middot; in '+untilLabel(nw.ts)+'</div>' : '<div class="sleep-tile-val">Not set</div><div class="kpi-sub">Tap to set it</div>')+'</button>'+
      '<button class="sleep-tile sleep-tile-btn" data-action="openNightPlan"><div class="kpi-label">'+(np?'Plan for '+morningLabel(np.date):'Tomorrow\'s plan')+'</div>'+(np ? '<div class="sleep-tile-val">'+npTasks.length+' task'+(npTasks.length===1?'':'s')+'</div><div class="kpi-sub">'+(np.note?escapeHtml(np.note.slice(0,70))+(np.note.length>70?'…':''):'no note')+'</div>' : '<div class="sleep-tile-val">Not planned</div><div class="kpi-sub">Tap to plan</div>')+'</button>'+
    '</div>'+
    '<div class="sleep-note"><div class="kpi-label" style="text-align:left;">&#127769; Note for '+escapeHtml(morningLabel(morningNoteTarget()))+'</div>'+morningNoteBoxHtml('sleepNoteInput')+'</div>'+
    '<div class="row" style="justify-content:center;margin-top:16px;gap:10px;">'+
      '<button class="btn" style="border-color:var(--border-strong);color:var(--text);" data-action="endMode">I\'m up</button>'+
    '</div>'+
  '</div></div>';
}
// Winding down: tomorrow's wake-up, the plan and going to sleep (a dropdown in the Today
// hero, evenings only).
function renderEveningCard(){ return ''; }
function windDownTilesHtml(){
  const target = planTargetDate();
  const np = state.focus.nightPlan && state.focus.nightPlan.date===target ? state.focus.nightPlan : null;
  const nw = nextWake();
  const count = np ? arr(np.taskIds).length : 0;
  const ml = morningLabel(target);
  return '<div class="evening-tiles">'+
      '<button class="evening-tile" data-action="openWakeSetup"><span class="evening-tile-k">Wake-up</span><span class="evening-tile-v">'+(nw ? fmt12Hour(nw.time) : 'Not set')+'</span><span class="kpi-sub">'+(nw ? morningLabel(nw.date)+' &middot; in '+untilLabel(nw.ts) : 'Set your alarm')+'</span></button>'+
      '<button class="evening-tile" data-action="openNightPlan"><span class="evening-tile-k">'+escapeHtml(ml[0].toUpperCase()+ml.slice(1))+'</span><span class="evening-tile-v">'+(np ? count+' task'+(count===1?'':'s') : 'Plan it')+'</span><span class="kpi-sub">'+(np ? 'Edit plan' : 'Tasks + a note')+'</span></button>'+
      '<button class="evening-tile" data-action="openDayRecap"><span class="evening-tile-k">Recap</span><span class="evening-tile-v">'+fmtHours(deepWorkMinutesTodayLive())+'</span><span class="kpi-sub">See how today went</span></button>'+
      '<button class="evening-tile evening-sleep" data-action="startSleepMode"><span class="evening-moon">&#127769;</span><span class="evening-tile-v">Go to sleep</span><span class="kpi-sub">Pauses auto lock-in</span></button>'+
    '</div>';
}
