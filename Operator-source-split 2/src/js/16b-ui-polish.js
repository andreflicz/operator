
// ============ UI POLISH (Phase 2) ============
// Now / Next — the task being timed and what's lined up after it, shown prominently while
// locked in (Today header + Focus → Tasks).
function nextUpTask(){
  const items = state.tasks.items;
  const pick = function(id){ return id ? items.find(function(x){ return x.id===id && x.status!=='done'; }) : null; };
  return pick(ui.pendingCurrentTaskId) || pick(ui.stagedTaskId) || (state.focus.nextTaskId!==ui.currentTaskId ? pick(state.focus.nextTaskId) : null) ||
    lineupOrdered(items.filter(function(t){ return t.status==='today' && t.id!==ui.currentTaskId && !isOngoingDoneToday(t); }))[0] || null;
}
function renderNowNextBar(standalone){
  const cur = ui.currentTaskId ? state.tasks.items.find(function(x){ return x.id===ui.currentTaskId; }) : null;
  const next = nextUpTask();
  if(!cur && !next && ui.nextPicker!=='bar' && !state.tasks.items.some(function(t){ return t.status==='today'; })) return '';
  return '<div class="now-next'+(standalone?' now-next-standalone':'')+'">'+
    '<div class="now-next-cell now-cell">'+
      '<span class="now-next-label">Now</span>'+
      (cur ? '<span class="now-next-title">'+escapeHtml(cur.title)+'</span><span class="now-next-timer" id="currentTaskElapsedBar">'+formatElapsed(Date.now()-(ui.currentTaskStartedAt||Date.now()))+'</span>'
           : '<span class="now-next-title now-next-empty">Pick a task to start timing</span>')+
    '</div>'+
    '<div class="now-next-cell next-cell"'+(next && !cur ? '' : '')+'>'+
      '<span class="now-next-label">Next</span>'+
      (next ? '<span class="now-next-title">'+escapeHtml(next.title)+'</span>'+
              '<button class="mini-move mini-move-today" data-action="'+(state.focus.activeSession?'setCurrentTask':'stagePendingCurrentTask')+'" data-id="'+next.id+'">'+(cur?'Switch':'Start')+' &rarr;</button>'
            : '<span class="now-next-title now-next-empty">Nothing lined up</span>')+
      '<button class="mini-move" data-action="toggleNextPicker" data-where="bar" title="Pick what\'s next">Change</button>'+
    '</div>'+
  '</div>'+nextPickerHtml('bar');
}
// Compact video idea card: title + type/due at a glance, notes and actions on click.
const expandedVideoIdeas = new Set();
function videoIdeaCompactCard(t){
  const open = expandedVideoIdeas.has(t.id);
  const vt = t.videoType ? taskVideoTypeById(t.videoType) : null;
  return '<div class="video-idea-compact'+(open?' is-open':'')+(t.status==='today'?' in-today':'')+(justCompletedTaskId===t.id?' just-completed':'')+'" draggable="true" data-task-id="'+t.id+'">'+
    '<div class="vic-head" data-action="toggleVideoIdeaExpand" data-id="'+t.id+'">'+
      '<span class="vic-title">'+escapeHtml(t.title)+'</span>'+
      '<span class="vic-meta">'+
        (vt ? '<span class="tag" style="background:rgba(var(--ink),.08);color:var(--text);">'+escapeHtml(vt.label)+'</span>' : '')+
        (t.status==='today' ? '<span class="tag tag-good">Today</span>' : '')+
        (t.deadline ? deadlineTag(t) : '')+
        '<span class="vic-chevron">'+(open?'&#9652;':'&#9662;')+'</span>'+
      '</span>'+
    '</div>'+
    (open ? '<div class="vic-body">'+
      (t.notes ? '<div class="task-notes">'+escapeHtml(t.notes)+'</div>' : '<div class="kpi-sub">No notes yet.</div>')+
      '<div class="vic-actions">'+
        (t.status==='today' ? '<button class="mini-move" data-action="moveTaskToBacklog" data-id="'+t.id+'">&larr; Move back to video ideas</button>'
                            : '<button class="mini-move mini-move-today" data-action="pullSpecificFromBacklog" data-id="'+t.id+'">+ Move to today</button>')+
        '<button class="mini-move" data-action="openTaskEditModal" data-id="'+t.id+'">Edit</button>'+
        '<button class="mini-move mini-move-danger" data-action="deleteTaskUndoable" data-id="'+t.id+'">Delete</button>'+
      '</div>'+
    '</div>' : '')+
  '</div>';
}
ACTIONS.toggleVideoIdeaExpand = function(el, e, id){
  if(expandedVideoIdeas.has(id)) expandedVideoIdeas.delete(id); else expandedVideoIdeas.add(id);
  renderView();
};
// "View all" links on the Today dashboard.
ACTIONS.goToLeads = function(){ ui.view='business'; ui.businessTab='leads'; renderView(); };
ACTIONS.goToDeadlines = function(){ ui.view='calendar'; ui.calendarShowAllDeadlines = true; renderView(); };
ACTIONS.toggleAllDeadlines = function(){ ui.calendarShowAllDeadlines = !ui.calendarShowAllDeadlines; renderView(); };
function renderAllDeadlinesSection(){
  const open = state.tasks.items.filter(function(t){ return t.deadline && t.status!=='done'; })
    .sort(function(a,b){ return (a.deadline+(a.deadlineTime||'')).localeCompare(b.deadline+(b.deadlineTime||'')); });
  if(!ui.calendarShowAllDeadlines){
    return '<div class="row" style="justify-content:center;margin:0 auto 14px;"><button class="btn btn-ghost btn-sm" data-action="toggleAllDeadlines">&#9888; All deadlines ('+open.length+')</button></div>';
  }
  return '<div class="section" style="max-width:680px;margin:0 auto 20px;"><div class="section-title">All Deadlines<span class="kpi-sub">'+open.length+' open &middot; overdue first</span><button class="btn btn-ghost btn-sm" data-action="toggleAllDeadlines">Hide</button></div>'+
    '<div class="task-list">'+(open.map(function(t){
      const overdue = t.deadline < todayStr();
      return '<div class="task-item-v2 cal-item-clickable" data-action="openCalItem" data-kind="deadline" data-id="'+t.id+'">'+
        '<div style="width:86px;font-family:var(--font-display);font-weight:700;color:'+(overdue?'var(--danger)':'var(--text)')+';">'+fmtDateShort(t.deadline)+(t.deadlineTime?'<div class="kpi-sub">'+fmt12Hour(t.deadlineTime)+'</div>':'')+'</div>'+
        (t.isVideoIdea ? '' : priorityTag(t.priority))+
        '<div class="task-title" style="flex:1;">'+escapeHtml(t.title)+'</div>'+
        clientTagsHtml(t.clients)+
        (overdue ? '<span class="tag tag-danger">Overdue</span>' : '')+
      '</div>';
    }).join('') || '<div class="empty">No open deadlines.</div>')+'</div></div>';
}
// Context-aware "+" button (bottom-right): adds whatever the current page is about.
function fabContext(){
  const v = ui.view;
  if(v==='focus' && ui.focusTab!=='analytics' && ui.focusTasksSubTab==='videoIdeas') return {label:'Add video idea', run:openAddVideoIdeaModal};
  if(v==='focus' || v==='today') return {label:'Add task', run:openAddTaskModal};
  if(v==='business'){
    if(ui.businessTab==='clients' || ui.businessTab==='lifecycle') return {label:'Add client', run:function(){ if(typeof openNewContactModal==='function') openNewContactModal('client'); else { ui.forms.client=true; renderView(); } }};
    if(ui.businessTab==='packages') return {label:'Add package', run:openNewPackageModal};
    if(ui.businessTab==='finances') return {label:'Add invoice', run:function(){ openInvoiceModal('personal'); }};
    return {label:'Add lead', run:function(){ if(typeof openNewContactModal==='function') openNewContactModal('lead'); else { ui.forms.prospect=true; renderView(); } }};
  }
  if(v==='calendar') return {label:'Add event', run:function(){ openCalEventModal(); }};
  if(v==='personal'){
    if(ui.personalTab==='journal' && ui.journalMode==='boards' && typeof canvasAddNote==='function') return {label:'Add note to board', run:function(){ canvasAddNote(); }};
    if(ui.personalTab==='journal') return {label:'New journal entry', run:openQuickJournalModal};
    if(ui.personalTab==='wishlist' && typeof openWishItemModal==='function') return {label:'Add wish list item', run:function(){ openWishItemModal(null); }};
    if(ui.personalTab==='fitness') return {label:'Log workout', run:function(){ ui.healthTab='workouts'; renderView(); const el=document.getElementById('gymType'); if(el){ el.focus(); el.scrollIntoView({behavior:'smooth', block:'center'}); } }};
    return {label:'Add goal', run:function(){ ui.forms.newGoal = true; renderView(); setTimeout(function(){ const el = document.getElementById('newGoalLabel'); if(el){ el.focus(); el.scrollIntoView({behavior:'smooth', block:'center'}); } }, 30); }};
  }
  return null;
}
ACTIONS.fabAdd = function(){ const c = fabContext(); if(c) c.run(); };
afterRenderHooks.push(function(){
  const fab = document.getElementById('fabAdd');
  if(!fab) return;
  const c = fabContext();
  fab.classList.toggle('fab-hidden', !c);
  if(c && fab.dataset.label!==c.label){ fab.title = c.label; fab.setAttribute('aria-label', c.label); fab.dataset.label = c.label; }
});
// Crosshair cursor (Settings → Display). A thin accent crosshair everywhere; a filled
// centre on clickable things; normal I-beam in text fields.
function applyCursorSetting(){
  document.body.classList.toggle('crosshair-cursor', state.profile.crosshairCursor!==false);
  const accent = (state.profile.accentColor||'#E8A23D');
  const svg = function(dot){
    return "url(\"data:image/svg+xml;utf8,"+encodeURIComponent(
      '<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24">'+
      '<g stroke="'+accent+'" stroke-width="1.5" stroke-linecap="round"><line x1="12" y1="2" x2="12" y2="8"/><line x1="12" y1="16" x2="12" y2="22"/><line x1="2" y1="12" x2="8" y2="12"/><line x1="16" y1="12" x2="22" y2="12"/></g>'+
      (dot ? '<circle cx="12" cy="12" r="3" fill="'+accent+'"/>' : '<circle cx="12" cy="12" r="1.3" fill="'+(document.documentElement.getAttribute('data-theme')==='light'?'#161A23':'#E7E9EE')+'"/>')+
      '</svg>')+"\") 12 12";
  };
  document.documentElement.style.setProperty('--cursor-default', svg(false)+', crosshair');
  document.documentElement.style.setProperty('--cursor-pointer', svg(true)+', pointer');
}
// Delete with undo (tasks + video ideas). The item is removed right away and a toast
// offers Undo for a few seconds, which puts it back exactly where it was.
let lastDeletedTasks = null;
function deleteTasksUndoable(ids){
  ids = ids.filter(function(id){ return state.tasks.items.some(function(t){ return t.id===id; }); });
  if(!ids.length) return;
  const removed = [];
  state.tasks.items = state.tasks.items.filter(function(t, idx){
    if(ids.indexOf(t.id)>=0){ removed.push({task:t, index:idx}); return false; }
    return true;
  });
  ids.forEach(function(id){
    if(ui.editingTaskId===id) closeTaskEditModal();
    if(ui.editingVideoIdeaId===id) closeVideoIdeaEditModal();
    if(ui.currentTaskId===id){ accumulateCurrentTaskTime(id); }
    if(ui.stagedTaskId===id) ui.stagedTaskId = null;
    if(ui.pendingCurrentTaskId===id) ui.pendingCurrentTaskId = null;
    ui.selectedTaskIds.delete(id);
  });
  lastDeletedTasks = removed;
  state.tasks.trash = removed.map(function(r){ return {task:r.task, index:r.index, at:Date.now()}; }).concat(arr(state.tasks.trash)).slice(0, 300);
  persist('tasks'); renderView();
  const label = removed.length===1 ? 'Deleted “'+removed[0].task.title+'”' : 'Deleted '+removed.length+' items';
  showToast(label, {icon:'&#128465;', actionLabel:'Undo', actionAction:'undoDeleteTasks', duration:7000});
}
ACTIONS.deleteTaskUndoable = function(el, e, id){ deleteTasksUndoable([id]); };
ACTIONS.undoDeleteTasks = function(){
  if(!lastDeletedTasks) return;
  lastDeletedTasks.slice().sort(function(a,b){ return a.index-b.index; }).forEach(function(r){
    if(state.tasks.items.some(function(t){ return t.id===r.task.id; })) return;
    state.tasks.items.splice(Math.min(r.index, state.tasks.items.length), 0, r.task);
    state.tasks.trash = arr(state.tasks.trash).filter(function(x){ return x.task.id!==r.task.id; });
  });
  lastDeletedTasks = null;
  const c = document.getElementById('toastContainer'); if(c) c.innerHTML='';
  playTick();
  persist('tasks'); renderView();
};

// ---- Recently deleted (Focus → Tasks → Deleted) ----
ACTIONS.restoreDeletedTask = function(el, e, id){
  const x = arr(state.tasks.trash).find(function(r){ return r.task.id===id; }); if(!x) return;
  state.tasks.trash = state.tasks.trash.filter(function(r){ return r!==x; });
  if(!state.tasks.items.some(function(t){ return t.id===id; })) state.tasks.items.splice(Math.min(x.index||0, state.tasks.items.length), 0, x.task);
  playTaskAdded(); persist('tasks');
  if(!state.tasks.trash.length && ui.focusTasksSubTab==='deleted') ui.focusTasksSubTab = 'overview';
  renderView();
  showToast('“'+x.task.title+'” is back.', {icon:'&#8634;'});
};
ACTIONS.emptyDeletedTasks = function(){ state.tasks.trash = []; persist('tasks'); ui.focusTasksSubTab = 'overview'; renderView(); };
function renderFocusDeletedTab(){
  const list = arr(state.tasks.trash);
  return '<div class="section">'+
    '<div class="section-title">Recently deleted<span class="kpi-sub">'+list.length+'</span>'+tip('Deleted tasks wait here for 30 days. Restore puts one back right where it was.')+
      (list.length ? '<button class="btn btn-ghost btn-sm" style="margin-left:auto;" data-action="emptyDeletedTasks">Empty</button>' : '')+'</div>'+
    '<div class="task-list">'+(list.map(function(r){
      const t = r.task;
      return '<div class="task-item-v2 trash-row">'+priorityTag(t.priority)+'<span class="task-title" style="flex:1;">'+escapeHtml(t.title)+'</span>'+
        '<span class="kpi-sub">'+ghlAgoLabel(r.at)+'</span><button class="btn btn-sm trash-restore" data-action="restoreDeletedTask" data-id="'+t.id+'">&#8634; Restore</button></div>';
    }).join('') || '<div class="empty">Nothing deleted.</div>')+'</div>'+
  '</div>';
}
function ghlAgoLabel(ts){ const m = Math.round((Date.now()-ts)/60000); return m<1 ? 'just now' : m<60 ? m+'m ago' : m<1440 ? Math.round(m/60)+'h ago' : Math.round(m/1440)+'d ago'; }
