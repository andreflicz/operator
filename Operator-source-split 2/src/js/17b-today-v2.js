
// ============ TODAY (not locked in): hero, next-task picker, task right-click menu ============
// The page opens on a hero: greeting + clock on the left, a big Lock In button on the right
// with what's up next (which you can pick yourself), and a hold-to-confirm Take Today Off.
function isWindDownTime(){ const h = new Date().getHours(); return h>=18 || h<4; }
function renderTodayHero(greeting){
  const p = state.profile;
  const next = nextUpTask();
  const streak = computeStreak();
  const ticked = (lastRenderedStreak!==null && streak!==lastRenderedStreak);
  lastRenderedStreak = streak;
  const allDone = dayStandardsComplete(todayStr());
  const evening = isWindDownTime();
  const sky = state.profile.skyChip===false ? '' : ' data-sky="'+skyLook()+'" data-wx="'+(wxNow() ? wxKind(wxNow().code) : 'clear')+'"';
  return '<div class="today-hero"'+sky+' data-key="today-hero">'+
    '<div class="th-left">'+
      businessNameTagHtml()+
      '<div class="th-greet">'+greeting+', '+escapeHtml(p.name)+'.</div>'+
      (p.bigClockOnToday ? '<div id="liveClockBig" class="cal-big-clock th-bigclock"></div>'+skyChipHtml() : '<div class="th-subrow"><div class="th-sub" id="liveClock"></div>'+skyChipHtml()+'</div>')+
      '<div class="th-streak">'+renderStreakCard(streak, {compact:true, ticked:ticked, editable:true, status: (allDone ? '<span class="streak-ok" title="Today\'s standard: done">&#10003;</span>' : '')+tip((streak===0 ? 'Hit today\'s standard to start one. ' : allDone ? 'Today\'s in the bag. ' : 'Hit today\'s standard to keep it going. ')+'The streak counts days in a row you hit Today\'s Standard — the deep-work target plus your checklist. Rest days you take off don\'t break it.')})+'</div>'+
    '</div>'+
    '<div class="th-right">'+
      // in Shooting (or another mode): show it, with its own clock and an End button
      ((state.modes.active && (state.modes.active.type!=='offtime' || state.modes.active.clockedOut)) ? '<div class="th-modecard is-'+state.modes.active.type+'">'+
          '<span class="th-modecard-i">'+modeIcon(state.modes.active.type)+'</span>'+
          '<span class="th-modecard-copy"><span class="th-modecard-k">'+(state.modes.active.clockedOut ? 'Clocked out' : escapeHtml(MODE_LABELS[state.modes.active.type]||'Mode'))+'</span><span class="th-modecard-t" id="modeElapsed">'+formatElapsed(Date.now()-state.modes.active.startedAt)+'</span></span>'+
          (state.modes.active.clockedOut ? '<button class="btn btn-sm th-modecard-end" data-action="clockIn">Clock in</button>' : '<button class="btn btn-sm th-modecard-end" data-action="endMode">End</button>')+
        '</div>' : '')+
      '<button class="lockin-cta'+(state.modes.active && state.modes.active.type!=='offtime' ? ' is-secondary' : '')+'" data-action="openLockInChooser" title="Lock in (L)">'+
        '<span class="lockin-icon">&#128274;</span>'+
        '<span class="lockin-copy"><span class="lockin-title">Lock in</span><span class="lockin-sub">'+(next ? 'Up next: '+escapeHtml(next.title) : 'Start a focus session')+'</span></span>'+
        '<span class="lockin-key">L</span>'+
      '</button>'+
      '<div class="th-actions">'+
        '<button class="th-btn" data-action="toggleNextPicker" data-where="hero"><span class="th-btn-i">&#128204;</span>'+(next ? 'Change next' : 'Pick next')+'</button>'+
        (!evening ? (function(){ const n = recapPendingCount(); return '<button class="th-btn" data-action="openDayRecap" title="How the day is going — sessions, tasks, apps"><span class="th-btn-i">&#128202;</span>Recap'+(n?'<span class="th-badge">'+n+'</span>':'')+'</button>'; })() : '')+
        (evening ? '<button class="th-btn th-btn-night" data-action="openWindDown"><span class="th-btn-i">&#127769;</span>Wind down</button>' : '')+
      '</div>'+
      '<div class="th-modes">'+holdModeBtnHtml('shooting', '&#127916;', 'Shooting')+'<button class="th-mode th-mode-offtime" data-action="clockOut" title="Done working for the day"><span class="th-mode-i">&#127937;</span><span>Clock out</span></button>'+dayOffButtonHtml()+'</div>'+
      nextPickerHtml('hero')+
    '</div>'+
  '</div>';
}
ACTIONS.toggleWindDown = function(){ ui.windDownOpen = !ui.windDownOpen; ui.nextPicker = null; renderView(); };
// ---- Take Today Off: hold to confirm (a click alone does nothing but explain) ----
function dayOffButtonHtml(){
  return '<button class="th-mode" data-action="quickDayOff" title="Take today off (you can undo)"><span class="th-mode-i">&#127796;</span><span>Day off</span></button>';
}
// Shooting / Off-time sit next to Day off as small pills — hold to start, so a stray click never flips you into a mode.
// One click starts it; a toast offers Undo for a few seconds (the old hold-to-start looked like it did nothing).
function holdModeBtnHtml(type, icon, label){
  const on = !!(state.modes.active && state.modes.active.type===type);
  return '<button class="th-mode th-mode-'+type+(on?' is-on':'')+'" data-action="quickMode" data-type="'+type+'" title="'+(on ? 'End '+label : 'Start '+label+' (you can undo)')+'"><span class="th-mode-i">'+icon+'</span><span>'+(on ? 'End '+label.toLowerCase() : label)+'</span></button>';
}
ACTIONS.quickMode = function(el){
  const type = el.dataset.type, prev = state.modes.active ? Object.assign({}, state.modes.active) : null;
  // the same button ends it once it's running
  if(prev && prev.type===type){ finishActiveMode(true); playStopSound(); renderView(); showToast((MODE_LABELS[type]||'Mode')+' ended.', {icon:modeIcon(type), duration:3000}); return; }
  if(state.focus.activeSession){ showToast('Stop your session first.', {icon:'&#128274;'}); return; }
  startMode(type);
  ui.undoMode = {prev:prev, at:Date.now()};
  showToast((MODE_LABELS[type]||'Mode')+' started.', {icon:modeIcon(type), actionLabel:'Undo', actionAction:'undoQuickMode', duration:6000});
};
ACTIONS.undoQuickMode = function(){
  const u = ui.undoMode; ui.undoMode = null; if(!u || !state.modes.active) return;
  state.modes.active = u.prev; persist('modes'); clearToasts(); renderView();
};
ACTIONS.quickDayOff = function(){
  toggleDayOff();
  dayOffFlash(isDayOff(todayStr()));
  showToast(isDayOff(todayStr()) ? 'Today is a rest day — the streak is safe. Enjoy it.' : 'Back on — today counts.', {icon:'&#127796;', actionLabel:'Undo', actionAction:'quickDayOffUndo', duration:6000});
};
ACTIONS.quickDayOffUndo = function(){ toggleDayOff(); clearToasts(); };
let holdTimer = null, holdEl = null;
function cancelHold(){ clearTimeout(holdTimer); holdTimer = null; if(holdEl) holdEl.classList.remove('holding'); holdEl = null; }
document.addEventListener('pointerdown', function(e){
  const el = e.target.closest && e.target.closest('[data-hold]'); if(!el || e.button!==0) return;
  cancelHold();
  holdEl = el; el.classList.add('holding');
  holdTimer = setTimeout(function(){
    const kind = el.dataset.hold;
    el.classList.remove('holding'); el.classList.add('held');
    holdTimer = null; holdEl = null;
    if(kind==='dayoff') setTimeout(function(){ toggleDayOff(); showToast('Today is a rest day — the streak is safe. Enjoy it.', {icon:'&#127796;'}); }, 180);
    else if(kind==='mode') setTimeout(function(){ startMode(el.dataset.type); }, 180);
  }, 900);
});
function endHold(e){
  if(!holdEl) return;
  if(e.type==='pointerleave' && e.target!==holdEl) return;
  const el = holdEl, pending = !!holdTimer;
  cancelHold();
  if(pending && e.type==='pointerup'){ el.classList.add('nudge'); setTimeout(function(){ el.classList.remove('nudge'); }, 500); }
}
['pointerup','pointerleave','pointercancel'].forEach(function(t){ document.addEventListener(t, endHold, true); });
// ---- picking what's next ----
function setNextUp(id){
  state.focus.nextTaskId = id || null;
  if(!state.focus.activeSession) ui.stagedTaskId = id || null;
  persist('focus');
}
function nextPickerHtml(where){
  if(ui.nextPicker!==where) return '';
  const cur = ui.currentTaskId;
  const today = sortByPriorityAndDeadline(state.tasks.items.filter(function(t){ return t.status==='today' && t.id!==cur && !isOngoingDoneToday(t); }));
  const backlog = sortByPriorityAndDeadline(state.tasks.items.filter(function(t){ return t.status==='backlog'; })).slice(0, 6);
  const next = nextUpTask();
  const row = function(t, fromBacklog){
    return '<button class="np-row'+(next && next.id===t.id?' is-on':'')+'" data-action="pickNextTask" data-id="'+t.id+'">'+priorityTag(t.priority)+'<span class="npk-title">'+escapeHtml(t.title)+'</span>'+(fromBacklog?'<span class="kpi-sub">backlog</span>':'')+(next && next.id===t.id?'<span class="np-check">&#10003;</span>':'')+'</button>';
  };
  return '<div class="next-picker" data-key="np-'+where+'">'+
    '<div class="np-head"><span class="kind-label" style="margin:0;">What\'s next?</span><button class="mini-move" data-action="toggleNextPicker" data-where="'+where+'">&#10005;</button></div>'+
    (today.length ? today.map(function(t){ return row(t, false); }).join('') : '<div class="kpi-sub" style="padding:4px 2px;">Nothing on today\'s list yet.</div>')+
    (backlog.length ? '<div class="kind-label" style="margin:8px 0 4px;">From the backlog</div>'+backlog.map(function(t){ return row(t, true); }).join('') : '')+
    (state.focus.nextTaskId ? '<button class="np-row np-auto" data-action="pickNextTask" data-id="">Let Operator pick (highest priority)</button>' : '')+
  '</div>';
}
ACTIONS.toggleNextPicker = function(el){ const w = el.dataset.where||'hero'; ui.nextPicker = ui.nextPicker===w ? null : w; ui.windDownOpen = false; renderView(); };
ACTIONS.pickNextTask = function(el, e, id){
  const t = id ? state.tasks.items.find(function(x){ return x.id===id; }) : null;
  if(t && t.status==='backlog'){ t.status = 'today'; persist('tasks'); }
  if(state.focus.activeSession && t) ui.pendingCurrentTaskId = null;
  setNextUp(t ? t.id : null);
  ui.nextPicker = null;
  playTick();
  renderView();
};
// L = lock in, from anywhere outside a text field
document.addEventListener('keydown', function(e){
  if(e.key!=='l' && e.key!=='L') return;
  if(e.metaKey || e.ctrlKey || e.altKey || typingInField(e.target) || document.querySelector('.overlay:not(.hidden)')) return;
  if(state.focus.activeSession || !(ui.view==='today' || ui.view==='focus')) return;
  e.preventDefault(); openLockInChooser();
});
// ---- right-click a task ----
function taskFromEl(el){
  const id = el && (el.getAttribute('data-task-id') || el.getAttribute('data-id'));
  return id ? state.tasks.items.find(function(t){ return t.id===id; }) : null;
}
let taskMenuClosed = {id:null, at:0};
function closeTaskMenu(){ const m = document.getElementById('taskCtxMenu'); if(m){ taskMenuClosed = {id:m.dataset.id, at:Date.now()}; m.remove(); } }
function openTaskMenu(t, x, y){
  closeTaskMenu();
  const inSession = !!state.focus.activeSession;
  const isNext = (nextUpTask()||{}).id===t.id;
  const item = function(op, label, extra){ return '<button class="ctx-item'+(extra||'')+'" data-action="taskCtx" data-op="'+op+'" data-id="'+t.id+'">'+label+'</button>'; };
  const m = document.createElement('div');
  m.id = 'taskCtxMenu'; m.className = 'ctx-menu'; m.dataset.id = t.id; m.dataset.at = Date.now();
  m.innerHTML = '<div class="ctx-title">'+escapeHtml(t.title)+'</div>'+
    (t.status!=='done' ? item('start', inSession ? '&#9654; Start timing now' : '&#128274; Lock in on this') : '')+
    (t.status!=='done' && !isNext ? item('next', '&#128204; Make it next up') : '')+
    item('edit', '&#9998; Edit…')+
    (t.status==='done' ? item('undo', '&#8634; Back to today')
      : t.ongoing ? (isOngoingDoneToday(t) ? item('undo', '&#8634; Undo — done for today') : item('done', '&#10003; Mark done for today'))
      : item('done', '&#10003; Mark done'))+
    (t.status==='backlog' ? item('today', '&rarr; Move to today') : t.status==='today' ? item('backlog', '&larr; Move back to '+(t.isVideoIdea?'video ideas':'backlog')) : '')+
    '<div class="ctx-sep"></div>'+
    '<div class="ctx-row"><span class="ctx-k">Due</span>'+item('dueToday','Today',' ctx-chip')+item('dueTomorrow','Tomorrow',' ctx-chip')+(t.deadline?item('dueClear','Clear',' ctx-chip'):'')+'</div>'+
    '<div class="ctx-row"><span class="ctx-k">Priority</span>'+['high','med','low'].map(function(pr){ return item('pri-'+pr, pr==='med'?'Med':pr[0].toUpperCase()+pr.slice(1), ' ctx-chip'+(t.priority===pr?' is-on':'')); }).join('')+'</div>'+
    '<div class="ctx-sep"></div>'+
    item('delete', '&#128465; Delete', ' ctx-danger');
  document.body.appendChild(m);
  const r = m.getBoundingClientRect();
  m.style.left = Math.min(x, window.innerWidth-r.width-8)+'px';
  m.style.top = Math.min(y, window.innerHeight-r.height-8)+'px';
}
document.addEventListener('contextmenu', function(e){
  const el = e.target.closest && e.target.closest('[data-task-id], .task-card[data-id], .task-item-v2[data-id], .vic-head[data-id]');
  const t = taskFromEl(el);
  if(!t){ closeTaskMenu(); return; }
  e.preventDefault();
  openTaskMenu(t, e.clientX, e.clientY);
});
document.addEventListener('pointerdown', function(e){ const m = document.getElementById('taskCtxMenu'); if(m && !m.contains(e.target)) closeTaskMenu(); }, true);
document.addEventListener('keydown', function(e){ if(e.key==='Escape') closeTaskMenu(); });
window.addEventListener('blur', closeTaskMenu);
document.addEventListener('scroll', function(){ const m = document.getElementById('taskCtxMenu'); if(m && Date.now()-Number(m.dataset.at||0) > 200) closeTaskMenu(); }, true);
// The ⋯ on a task card opens the same menu, tucked under the button.
ACTIONS.taskMenuBtn = function(el, e, id){
  const t = state.tasks.items.find(function(x){ return x.id===id; }); if(!t) return;
  if(taskMenuClosed.id===id && Date.now()-taskMenuClosed.at < 400) return; // this press just closed it
  const r = el.getBoundingClientRect();
  openTaskMenu(t, r.right-200, r.bottom+4);
};
ACTIONS.taskCtx = function(el, e, id){
  const t = state.tasks.items.find(function(x){ return x.id===id; });
  closeTaskMenu();
  if(!t) return;
  const op = el.dataset.op;
  const save = function(){ persist('tasks'); renderView(); };
  if(op==='start'){
    if(t.status!=='today'){ t.status = 'today'; persist('tasks'); }
    if(state.focus.activeSession) setCurrentTask(t.id); else { setNextUp(t.id); renderView(); openLockInChooser(); }
  }
  else if(op==='next'){ if(t.status==='backlog') t.status = 'today'; setNextUp(t.id); playTick(); save(); }
  else if(op==='edit') openTaskEditModal(t.id);
  else if(op==='done') completeTask(t.id);
  else if(op==='undo') undoTask(t.id);
  else if(op==='today') pullSpecificFromBacklog(t.id);
  else if(op==='backlog') moveTaskToBacklog(t.id);
  else if(op==='dueToday'){ t.deadline = todayStr(); save(); }
  else if(op==='dueTomorrow'){ t.deadline = addDays(todayStr(), 1); save(); }
  else if(op==='dueClear'){ t.deadline = null; t.deadlineTime = null; save(); }
  else if(op.indexOf('pri-')===0){ t.priority = op.slice(4); save(); }
  else if(op==='delete') deleteTasksUndoable([t.id]);
};
