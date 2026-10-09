// ============ TODAY ============
function renderDayOffView(){
  const streak = computeStreak();
  return '<div class="view-header today-header"><div>'+businessNameTagHtml()+'<div class="view-title">Taking today off<span class="sleepy-dots" aria-hidden="true"></span></div><div class="view-sub" id="liveClock"></div></div></div>'+
  '<div class="day-off-wrap"><div class="card day-off-card" style="border-color:var(--accent); box-shadow:0 0 50px '+hexToRgba(state.profile.accentColor||'#E8A23D',0.16)+';">'+
    '<div style="margin:4px 0 14px;">'+renderStreakCard(streak, {compact:true, status:'Rest days still count'})+'</div>'+
    '<div style="max-width:380px;margin:6px 0;font-size:14.5px;color:var(--text-dim);line-height:1.5;">Rest is part of the plan. Nothing else is tracked today — go live your life.</div>'+
    '<button class="btn" style="border-color:var(--accent);color:var(--accent);margin-top:10px;" data-action="toggleDayOff">Actually, I want to work today</button>'+
  '</div></div>';
}
function renderOffTimeView(){
  const active = state.modes.active;
  const elapsed = Date.now() - active.startedAt;
  return '<div class="view-header today-header"><div>'+businessNameTagHtml()+'<div class="view-title">Off the clock.</div><div class="view-sub" id="liveClock"></div></div></div>'+
  '<div class="day-off-wrap"><div class="card day-off-card offtime-card">'+
    '<div style="font-size:40px;">&#127937;</div>'+
    '<div class="hero-num" id="modeElapsed" style="color:var(--strong);">'+formatElapsed(elapsed)+'</div>'+
    '<div class="hero-label" style="color:var(--text-dim);">off-time'+(active.note?' — '+escapeHtml(active.note):'')+'</div>'+
    '<div style="max-width:380px;margin:16px 0 6px;font-size:14.5px;color:var(--text-dim);line-height:1.5;">The work day is done. Nothing else is tracked while you’re off — enjoy it.</div>'+
    '<button class="btn" style="border-color:var(--border-strong);color:var(--text);margin-top:10px;" data-action="endMode">End Off-Time</button>'+
  '</div></div>';
}
function focusKnockOutRow(t){
  const isCurrent = ui.currentTaskId===t.id;
  const isPending = ui.pendingCurrentTaskId===t.id;
  return '<div class="task-item-v2'+(isCurrent?' is-current-task':'')+(isPending?' is-pending-task':'')+(justCompletedTaskId===t.id?' just-completed':'')+'" draggable="true" data-task-id="'+t.id+'" title="'+(isCurrent?'This is your current task':(isPending?'Waiting to be confirmed in Next Task':'Click to queue as Next Task'))+'">'+
    '<div style="flex:1;min-width:140px;'+(isCurrent?'':'cursor:pointer;')+'" '+(isCurrent?'':'data-action="stagePendingCurrentTask" data-id="'+t.id+'"')+'>'+
      '<div class="task-title-row">'+priorityTag(t.priority)+'<span class="task-title">'+escapeHtml(t.title)+'</span>'+(t.ongoing?'<span class="tag tag-ongoing" style="margin-left:6px;">&#128204;</span>':'')+'</div>'+
      (t.notes ? '<div class="task-notes">'+escapeHtml(t.notes)+'</div>' : '')+
    '</div>'+
    clientTagsHtml(t.clients)+
    (isCurrent ? '<span class="tag tag-good">&#9673; Current</span>' : isPending ? '<span class="tag" style="border:1px solid var(--accent);color:var(--accent);background:transparent;">Queued</span>' : '')+
  '</div>';
}
function stagePendingCurrentTask(id){
  const as = state.focus.activeSession;
  if(as && as.onBreak) return;
  ui.pendingCurrentTaskId = id; renderView();
}
function cancelPendingCurrentTask(){ ui.pendingCurrentTaskId = null; renderView(); }
function confirmPendingCurrentTask(){
  const as = state.focus.activeSession;
  if(as && as.onBreak) return;
  const id = ui.pendingCurrentTaskId; if(!id) return;
  ui.pendingCurrentTaskId = null;
  setCurrentTask(id);
}
function focusModeBacklogRow(t){
  return '<div class="task-item-v2"><div style="flex:1;min-width:100px;"><div class="task-title-row">'+priorityTag(t.priority)+'<span class="task-title">'+escapeHtml(t.title)+'</span></div></div>'+
    '<button class="mini-move mini-move-today" data-action="promoteTask" data-id="'+t.id+'" title="Move to Today">+ Today</button>'+
  '</div>';
}
function renderMiniCalendarStrip(){
  const today = new Date(todayStr()+'T00:00:00');
  const dow = today.getDay();
  const monday = new Date(today); monday.setDate(today.getDate() - ((dow+6)%7));
  let cells = '';
  for(let i=0;i<7;i++){
    const d = new Date(monday); d.setDate(monday.getDate()+i);
    const dateStr = todayStr(d);
    const isToday = dateStr===todayStr();
    const info = calDayInfo(dateStr);
    const hasStuff = (info.events.length + info.deadlines.length) > 0;
    let dotColor = null;
    if(info.deadlines.length) dotColor = '#E8636B';
    else if(info.events.length){ const cat=categoryById(info.events[0].categoryId); dotColor = cat?cat.color:'#8A90A2'; }
    cells += '<div class="mini-cal-cell'+(isToday?' is-today':'')+'">'+
      '<div class="mini-cal-dow">'+DAY_LETTERS[d.getDay()]+'</div>'+
      '<div class="mini-cal-num">'+d.getDate()+'</div>'+
      (hasStuff ? '<span class="mini-cal-dot" style="background:'+dotColor+';"></span>' : '<span class="mini-cal-dot" style="background:transparent;"></span>')+
    '</div>';
  }
  return '<div class="mini-cal-strip" data-action="nav" data-view="calendar" title="Open Calendar">'+cells+'</div>';
}
function renderTodayFocusMode(p){
  const hour = new Date().getHours();
  const greeting = hour<5 ? 'Still up' : hour<12 ? 'Good morning' : hour<18 ? 'Good afternoon' : 'Good evening';
  const backlog = state.tasks.items.filter(function(t){ return t.status==='backlog'; }).slice(0,6);
  const doneToday = state.tasks.items.filter(function(t){ return t.status==='done' && t.completedAt===todayStr(); });
  const deepWorkToday = deepWorkMinutesTodayLive();
  const todayInfo = calDayInfo(todayStr());
  const todayNotices = arr(todayInfo.deadlines).filter(function(t){ return t.status!=='done'; }).map(function(t){ return {label:t.title, kind:'deadline', id:t.id}; })
    .concat(arr(todayInfo.events).map(function(e){ const cat=categoryById(e.categoryId); return {label:e.title, kind:'event', id:e.id, color:cat?cat.color:'#8A90A2', time:e.time}; }));
  const activeClients = arr(state.business.clients).filter(function(c){ return c.status==='active'; });

  return renderFocusQuickLinks()+
  '<div class="locked-in-header">'+
    businessNameTagHtml()+
    '<div class="locked-in-badge">&#128274; Locked In</div>'+
    '<div class="view-title" style="margin:0;">'+greeting+', '+escapeHtml(p.name)+'.</div>'+
    (state.profile.bigClockOnToday ? (
      '<div id="liveClockBig" class="cal-big-clock" style="font-size:38px;margin-top:6px;"></div>'+
      renderMiniCalendarStrip()
    ) : '<div class="view-sub" id="liveClock"></div>')+
    renderNowNextBar()+
  '</div>'+
  '<div class="grid grid-3 stat-chip-row section" style="max-width:800px;margin:0 auto 26px;">'+
    '<div class="stat-chip" style="text-align:center;"><div class="stat-chip-label">Day Streak</div><div class="stat-chip-value">'+computeStreak()+'</div><div class="kpi-sub">rest days still count</div></div>'+
    '<div class="stat-chip" data-action="goToFinishedTasks" style="text-align:center;cursor:pointer;"><div class="stat-chip-label">Completed Today</div><div class="stat-chip-value">'+doneToday.length+' task'+(doneToday.length===1?'':'s')+'</div></div>'+
    '<div class="stat-chip" id="statDeepWorkTodayBox" style="text-align:center;"><div class="stat-chip-label">Deep Work Today</div><div class="stat-chip-value">'+fmtHours(deepWorkToday)+'</div><div class="kpi-sub">'+fmtDurationLabel(deepWorkToday)+'</div></div>'+
  '</div>'+
  '<div class="hero-row section">'+renderActiveFocusHero(true)+renderCurrentTaskCard(false,false,true)+'</div>'+
  renderVisionSlideshow()+
  renderStandardsWidget()+
  (todayNotices.length ? (
    '<div class="section" style="max-width:640px;margin:0 auto;"><div class="section-title" style="justify-content:center;">Today on the Calendar</div><div class="card"><div class="task-list">'+
      todayNotices.map(function(n){
        return '<div class="task-item-v2 cal-item-clickable" data-action="openCalItem" data-kind="'+n.kind+'" data-id="'+n.id+'">'+
          (n.kind==='deadline' ? '<span class="tag" style="background:var(--danger-dim);color:var(--danger-text);">Deadline</span>' : '<span class="tag" style="background:'+n.color+'22;color:'+n.color+';">'+(n.time?fmt12Hour(n.time):'Event')+'</span>')+
          '<div class="task-title" style="flex:1;">'+escapeHtml(n.label)+'</div>'+
        '</div>';
      }).join('')+
    '</div></div></div>'
  ) : '')+
  '<div style="max-width:900px;margin:0 auto;">'+renderReachOutPanel(true)+'</div>'+
  '<div class="section grid grid-2" style="max-width:1200px;margin:32px auto 0;align-items:start;">'+
    '<div><div class="section-title" style="justify-content:center;">Worth Doing Soon<span class="kpi-sub" style="margin-left:8px;">&middot; '+backlog.length+' waiting</span></div><div class="card" style="max-height:600px;overflow-y:auto;"><div class="task-list">'+(backlog.map(focusModeBacklogRow).join('') || '<div class="empty">Backlog is empty.</div>')+'</div></div></div>'+
    '<div><div class="section-title" style="justify-content:center;">Clients<span class="kpi-sub" style="margin-left:8px;">&middot; '+activeClients.length+' active</span></div><div class="task-list" style="display:flex;flex-direction:column;gap:12px;max-height:600px;overflow-y:auto;">'+(activeClients.length ? activeClients.map(function(c){ return renderClientHealthCard(c); }).join('') : '<div class="empty">No active clients yet.</div>')+'</div></div>'+
  '</div>';
}
function renderToday(){
  const p = state.profile;
  // A session you started yourself always wins, even on a day off — otherwise locking in
  // left you staring at the "Taking today off" screen. The day stays marked as a rest day.
  if(state.focus.activeSession) return renderTodayFocusMode(p);
  if(isDayOff(todayStr())) return renderDayOffView();
  if(state.modes.active && state.modes.active.type==='offtime') return state.modes.active.sleep ? renderSleepView() : renderOffTimeView();
  const hour = new Date().getHours();
  const greeting = hour<5 ? 'Still up' : hour<12 ? 'Good morning' : hour<18 ? 'Good afternoon' : 'Good evening';
  const order = arr(state.dashboardPanels.order);
  const enabledOrder = order.filter(function(pid){ return state.dashboardPanels.enabled[pid]!==false; });
  let panelsHtml = '';
  let i = 0;
  while(i < enabledOrder.length){
    const pid = enabledOrder[i];
    if(SMALL_PANELS.indexOf(pid)>=0){
      const rowPanels = [];
      while(i<enabledOrder.length && SMALL_PANELS.indexOf(enabledOrder[i])>=0){ rowPanels.push(enabledOrder[i]); i++; }
      panelsHtml += '<div class="small-panels-row section">'+rowPanels.map(function(rpid){ const fn=PANEL_RENDERERS[rpid]; return fn ? '<div class="small-panel-box">'+fn()+'</div>' : ''; }).join('')+'</div>';
    } else {
      const fn = PANEL_RENDERERS[pid];
      if(fn) panelsHtml += fn();
      i++;
    }
  }
  return renderFocusQuickLinks()+
    renderTodayHero(greeting)+
    renderMorningPlanCard()+
    '<div class="today-panels">'+panelsHtml+'</div>';
}

