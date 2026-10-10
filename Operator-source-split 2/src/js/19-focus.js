// ============ FOCUS ============
function formatElapsed(ms){
  ms = Math.max(0, ms);
  const totalSec = Math.floor(ms/1000);
  const h = Math.floor(totalSec/3600), m = Math.floor((totalSec%3600)/60), s = totalSec%60;
  return (h>0?h+':':'')+pad2(m)+':'+pad2(s);
}
// Timers past an hour get one more group of digits — the class lets the clock shrink to fit its card.
function hoursCls(ms){ return ms>=3600000 ? ' has-hours' : ''; }
function setTimerText(el, ms){
  const t = formatElapsed(ms);
  if(el.textContent!==t) el.textContent = t;
  const long = ms>=3600000;
  if(el.classList.contains('has-hours')!==long) el.classList.toggle('has-hours', long);
}
function computeTimeOfDayBuckets(){
  const buckets = [
    {label:'6-9a', start:6, end:9, minutes:0},
    {label:'9-12p', start:9, end:12, minutes:0},
    {label:'12-3p', start:12, end:15, minutes:0},
    {label:'3-6p', start:15, end:18, minutes:0},
    {label:'6-9p', start:18, end:21, minutes:0},
    {label:'9p-12a', start:21, end:24, minutes:0}
  ];
  qualifyingSessions().forEach(function(s){
    const hour = new Date(s.startedAt).getHours();
    const b = buckets.find(function(b){ return hour>=b.start && hour<b.end; });
    if(b) b.minutes += s.minutes;
  });
  return buckets;
}
function qualifyingSessions(){ return state.focus.sessions.filter(function(s){ return (s.minutes||0)>=5 && sessionType(s)==='deep'; }); }
function deepWorkMinutesForQualifying(dateStr){
  return qualifyingSessions().filter(function(s){ return s.date===dateStr; }).reduce(function(a,s){ return a+s.minutes; },0);
}
function renderFocus(){
  const tab = ui.focusTab || 'tasks';
  return '<div class="view-header"><div>'+businessNameTagHtml()+'<div class="view-title">Focus'+tip('Manage the work itself — what you\'re on now, what\'s next, the backlog and video ideas. Analytics shows where the time went.')+'</div></div></div>'+
  '<div class="tabs tabs-with-tools">'+
    '<div class="tab '+(tab==='tasks'?'active':'')+'" data-action="focusMainTab" data-tab="tasks">Tasks</div>'+
    '<div class="tab '+(tab==='analytics'?'active':'')+'" data-action="focusMainTab" data-tab="analytics">Analytics</div>'+
    '<div class="tabs-tools">'+(tab==='analytics' ? analyticsRangeTabs() : focusTasksSubtabsHtml())+'</div>'+
  '</div>'+
  '<div class="tab-panel" data-key="focus-'+tab+'">'+
  (tab==='analytics' ? renderFocusAnalyticsTab() : renderFocusTasksTab())+
  '</div>';
}
function quickAccessItemHtml(key, url, emoji, bg, label){
  return '<a class="quick-link-item" draggable="false" '+(url ? 'href="'+escapeHtml(url)+'" target="_blank" rel="noopener"' : 'data-action="quickLinkNotSet"')+' title="'+escapeHtml(label)+'">'+
    '<span class="quick-link-circle">'+quickLinkIconInnerHtml(key, emoji, bg)+'</span>'+
    '<span class="quick-link-label">'+escapeHtml(label)+'</span>'+
  '</a>';
}
function toggleQuickAccess(){ ui.quickAccessOpen = !ui.quickAccessOpen; renderView(); }
function renderFocusQuickLinks(){
  const q = quickLinksSettings();
  const lastTool = AI_TOOLS.find(function(t){return t.id===q.lastAiUsed;}) || AI_TOOLS[0];
  const lastToolUrl = safariizeUrl(lastTool.url);
  const open = !!ui.quickAccessOpen;
  return '<div class="quick-access-dock'+(open?' open':'')+'">'+
      '<button class="quick-access-toggle" data-action="toggleQuickAccess" title="'+(open?'Collapse':'Quick Access')+'">'+(open?'&#10005;':'&#9776;')+'</button>'+
      '<div class="quick-access-items">'+
      QUICK_LINK_DEFS.map(function(ql){
        return quickAccessItemHtml(ql.key, quickLinkHrefUrl(ql.key), ql.emoji, ql.bg, ql.label);
      }).join('')+
      '<div id="aiQuickLinkWrap" style="position:relative;">'+
        '<a class="quick-link-item" draggable="false" data-action="aiButtonPress" href="'+escapeHtml(lastToolUrl)+'" target="_blank" rel="noopener" title="Click to open '+escapeHtml(lastTool.label)+'. Hold to switch AI.">'+
          '<span class="quick-link-circle">'+quickLinkIconInnerHtml(lastTool.id, lastTool.emoji, lastTool.bg)+'</span>'+
          '<span class="quick-link-label">'+escapeHtml(lastTool.label)+'</span>'+
          (AI_TOOLS.length>1 ? '<span class="quick-link-multi-badge" title="'+AI_TOOLS.length+' AI tools — hold to switch">'+AI_TOOLS.length+'</span>' : '')+
        '</a>'+
      '</div>'+
      '</div>'+
  '</div>';
}
function renderActiveFocusHero(big){
  const active = state.focus.activeSession;
  const onBreak = !!active.onBreak;
  const elapsed = onBreak ? (active.frozenElapsedMs||0) : (Date.now()-active.startedAt);
  const pct = active.plannedMinutes ? clamp(Math.round((elapsed/60000/active.plannedMinutes)*100),0,100) : null;
  // in your order (the same order as Today's Lineup), numbered
  const todayTasksForSession = lineupOrdered(state.tasks.items.filter(function(t){ return t.status==='today' && (!isOngoingDoneToday(t) || justCompletedTaskId===t.id); }));
  const sizeClass = big ? 'hero-num-xl' : 'hero-num-lg';
  const VISIBLE_TASK_LIMIT = 6;

  let timerCardInner;
  if(onBreak){
    const breakInfo = active.breaks[active.breaks.length-1];
    timerCardInner = '<div class="kpi-label" style="color:var(--info);">'+modeIcon('break')+' ON BREAK</div>'+
      '<div class="hero-num '+sizeClass+hoursCls(Date.now()-(active.breakStartedAt||Date.now()))+'" id="modeElapsed" style="color:var(--info);">'+formatElapsed(Date.now()-(active.breakStartedAt||Date.now()))+'</div>'+
      (breakInfo&&breakInfo.note&&!active.method ? '<div class="kpi-sub">'+escapeHtml(breakInfo.note)+'</div>' : '')+
      (typeof methodStripHtml==='function' ? methodStripHtml(active) : '')+
      (active.breakEndsAt ? '<div class="break-remaining" id="breakRemaining">'+formatElapsed(Math.max(0, active.breakEndsAt-Date.now()))+' left</div>' : '')+
      '<div class="row" style="justify-content:center;gap:6px;margin-top:10px;">'+
        (active.breakEndsAt ? '<button class="btn btn-ghost btn-sm" data-action="extendBreak" data-minutes="5">+5 min</button>' : '')+
        '<button class="btn btn-primary btn-sm" data-action="endBreakModeFromFocus">End Break</button>'+
      '</div>';
  } else {
    const dwTarget = state.standards.deepWorkTargetMinutes || 180;
    const liveToday = deepWorkMinutesTodayLive();
    const openPct = clamp(Math.round((liveToday/dwTarget)*100),0,100);
    const strip = typeof methodStripHtml==='function' ? methodStripHtml(active) : '';
    timerCardInner = '<div class="hero-num '+sizeClass+hoursCls(elapsed)+'" id="focusElapsed">'+formatElapsed(elapsed)+'</div>'+
      // a technique gets its own single bar instead of the plain progress bar
      (strip ? strip : active.plannedMinutes
        ? '<div class="progress"><div class="progress-bar" id="focusProgressBar" style="width:'+pct+'%"></div></div>'+
          '<div class="kpi-sub">'+fmtDurationLabel(active.plannedMinutes)+' session &middot; ends around '+fmtTimeShort(active.startedAt + active.plannedMinutes*60000)+'</div>'
        : '<div class="progress"><div class="progress-bar'+(openPct>=100?' good':'')+'" id="focusProgressBar" style="width:'+openPct+'%"></div></div>'+
          '<div class="kpi-sub">Open-ended &middot; '+fmtDurationLabel(liveToday)+' of '+fmtDurationLabel(dwTarget)+' today\'s goal</div>')+
      '<div class="row" style="margin-top:8px;justify-content:center;">'+
        '<button class="btn btn-ghost btn-sm" data-action="openBreakNotePrompt">'+modeIcon('break')+' Break Mode</button>'+
      '</div>';
  }

  const visibleTasks = todayTasksForSession.slice(0, VISIBLE_TASK_LIMIT);
  const overflowCount = todayTasksForSession.length - visibleTasks.length;

  return '<div class="hero-card focus-hero-col '+(onBreak?'':'focus-active-glow')+'" id="focusHeroCard" style="min-width:260px;flex:'+(big?'1.2':'1.4')+';">'+
      timerCardInner+
      '<button class="btn btn-primary" data-action="openStopFocus" style="margin-top:12px;">Stop &amp; Log</button>'+
    '</div>'+
    '<div class="card knock-out-card" style="flex:'+(big?'1.8':'1.4')+';min-width:260px;">'+
      '<div class="section-title" style="margin-bottom:8px;">Knock These Out</div>'+
      '<div class="task-list knock-out-list">'+(visibleTasks.map(function(t, i){ return focusKnockOutRow(t, i+1); }).join('') || '<div class="empty">Nothing queued for today — add one from Tasks.</div>')+'</div>'+
      (overflowCount>0 ? '<div class="row" style="justify-content:center;margin-top:8px;"><button class="btn btn-ghost btn-sm" data-action="goToFocusToday">See all '+todayTasksForSession.length+' tasks</button></div>' : '')+
    '</div>';
}
function renderFocusTimer(){
  const fs = state.focus;
  const active = fs.activeSession;
  const heroHtml = active ? renderActiveFocusHero() : renderLockInCard();
  return renderStandardsWidget()+
  '<div class="hero-row section" style="justify-content:'+(active?'flex-start':'center')+';">'+heroHtml+'</div>'+
  renderOngoingTasksPanel()+
  '<div class="section">'+
    renderManualLogForm()+
  '</div>';
}
function ongoingFrequencyLabel(freq){
  if(freq==='daily') return 'Daily';
  if(freq==='few') return 'A few times a week';
  if(freq==='weekly') return 'Weekly';
  return '';
}
function renderOngoingTasksPanel(){
  const ongoing = state.tasks.items.filter(function(t){ return t.ongoing && t.status!=='done'; });
  if(!ongoing.length) return '';
  return '<div class="section"><div class="section-title">Ongoing'+tip('Ongoing tasks stay live until they\'re actually done — check one off for today and it comes back tomorrow.')+'</div>'+
    (carouselOn() ? carouselWrap(ongoing.map(function(t){ return taskCard(t); }).join(''), 'ongoing', {w:236, loop:true, count:ongoing.length}) : '<div class="task-card-grid">'+ongoing.map(function(t){ return taskCard(t); }).join('')+'</div>')+
  '</div>';
}
function reminderWhen(r){
  const d = r.date===todayStr() ? 'Today' : r.date===addDays(todayStr(), 1) ? 'Tomorrow' : weekdayShort(r.date)+' '+fmtDateShort(r.date);
  return d+(r.time ? ' · '+fmt12Hour(r.time) : '');
}
function reminderRow(r){
  const late = r.date < todayStr() || (r.date===todayStr() && r.time && r.time < nowHM());
  return '<div class="rm-row'+(late?' is-late':'')+'"><span class="rm-bell">&#128276;</span>'+
    '<span class="rm-label">'+escapeHtml(r.label||'Reminder')+'</span>'+
    '<span class="rm-when">'+escapeHtml(reminderWhen(r))+'</span>'+
    '<button class="rm-done" data-action="dismissReminder" data-id="'+r.id+'" title="Done">&#10003;</button>'+
  '</div>';
}
function dismissReminder(id){ state.focus.reminders = state.focus.reminders.filter(function(x){return x.id!==id;}); persist('focus'); renderView(); }
function addReminder(){
  const labelEl = document.getElementById('newReminderLabel');
  const label = labelEl ? labelEl.value.trim() : '';
  if(!label) return;
  const date = document.getElementById('newReminderDate').value || todayStr();
  const time = document.getElementById('newReminderTime').value || null;
  state.focus.reminders.push({id:uid(), label:label, date:date, time:time});
  labelEl.value = '';
  playPositive();
  persist('focus'); renderView();
}
function setNewReminderType(t){ ui.newReminderType = (t==='alarm') ? 'alarm' : 'reminder'; renderView(); }
function addReminderOrAlarm(){
  const type = ui.newReminderType==='alarm' ? 'alarm' : 'reminder';
  const labelEl = document.getElementById('newReminderLabel');
  const label = labelEl ? labelEl.value.trim() : '';
  if(!label) return;
  const timeEl = document.getElementById('newReminderTime');
  const time = timeEl ? timeEl.value : '';
  if(type==='alarm'){
    if(!time) return;
    state.focus.alarms.push({id:uid(), time:time, label:label, days:[0,1,2,3,4,5,6], enabled:true});
  } else {
    const dateEl = document.getElementById('newReminderDate');
    const date = dateEl && dateEl.value ? dateEl.value : todayStr();
    state.focus.reminders.push({id:uid(), label:label, date:date, time: time || null});
  }
  labelEl.value = '';
  playPositive();
  persist('focus'); renderView();
}
function renderRemindersCard(){
  const upcomingReminders = state.focus.reminders.slice().sort(function(a,b){ return (a.date+String(a.time||'')).localeCompare(b.date+String(b.time||'')); });
  const rows = upcomingReminders.map(reminderRow).join('');
  const chip = function(n, label){ return '<button class="rm-chip'+(n===0?' is-on':'')+'" data-action="remindDay" data-id="'+n+'">'+label+'</button>'; };
  return '<div class="section"><div class="section-title">Reminders<span class="kpi-sub">'+upcomingReminders.length+'</span></div>'+
    '<div class="rm-compose">'+
      '<span class="rm-bell">&#128276;</span>'+
      '<input class="rm-input" id="newReminderLabel" placeholder="Remind me to…">'+
      '<span class="rm-chips">'+chip(0, 'Today')+chip(1, 'Tomorrow')+chip(7, 'Next week')+'</span>'+
      '<input class="rm-date" type="date" id="newReminderDate" value="'+todayStr()+'" title="Pick a day">'+
      '<input class="rm-time" type="time" id="newReminderTime" title="Time (optional)">'+
      '<button class="rm-add" data-action="addReminder">Add</button>'+
    '</div>'+
    '<div class="rm-list">'+(rows || '<div class="empty">Nothing coming up.</div>')+'</div>'+
  '</div>';
}
ACTIONS.remindDay = function(el, e, id){
  const d = document.getElementById('newReminderDate'); if(d) d.value = addDays(todayStr(), Number(id)||0);
  document.querySelectorAll('.rm-chip').forEach(function(c){ c.classList.toggle('is-on', c===el); });
  playTick();
};
document.addEventListener('keydown', function(e){ if(e.key==='Enter' && e.target && e.target.id==='newReminderLabel'){ e.preventDefault(); addReminder(); } });
document.addEventListener('change', function(e){ if(e.target && e.target.id==='newReminderDate'){ document.querySelectorAll('.rm-chip').forEach(function(c){ c.classList.toggle('is-on', addDays(todayStr(), Number(c.dataset.id))===e.target.value); }); } });
function renderBreakForm(){
  return '<div class="card" style="margin-top:8px;padding:10px;">'+
    '<div class="row" style="justify-content:center;">'+
      '<button class="btn btn-ghost btn-sm" data-action="startBreak" data-minutes="15">15 Min</button>'+
      '<button class="btn btn-ghost btn-sm" data-action="startBreak" data-minutes="30">30 Min</button>'+
    '</div>'+
    '<input class="input" id="breakNote" placeholder="What kind of break? (optional)" style="width:100%;margin-top:6px;">'+
  '</div>';
}
function renderManualLogForm(){
  return '<div class="row" style="justify-content:center;gap:10px;">'+
    '<button class="btn btn-ghost btn-sm" data-action="openManualLogModal">+ Log Time Manually</button>'+
    '<button class="btn btn-ghost btn-sm" data-action="goToFitness">&#127947; Log a Workout</button>'+
    '<button class="btn btn-ghost btn-sm" data-action="viewAllSessions">View All Sessions</button>'+
  '</div>';
}
function openManualLogModal(){
  const o = document.getElementById('manualLogOverlay');
  if(!o) return;
  o.classList.remove('hidden');
  renderManualLogModalInto();
}
function closeManualLogModal(){ const o=document.getElementById('manualLogOverlay'); if(o) o.classList.add('hidden'); }
function renderManualLogModal(){
  return '<div class="section-title" style="margin-bottom:12px;">Log Time Manually</div>'+
    '<div class="row" style="align-items:flex-end;flex-wrap:wrap;">'+
      '<div class="field" style="flex:1.6;min-width:170px;"><label>Date</label><div class="row" style="flex-wrap:nowrap;gap:6px;"><input class="input" type="date" id="manualLogDate" value="'+todayStr()+'" style="width:100%;min-width:0;"><button class="btn btn-ghost btn-sm" data-action="openDatePicker" data-target="manualLogDate" style="flex-shrink:0;">&#128197;</button></div></div>'+
      '<div class="field" style="flex:1;min-width:90px;"><label>Start</label><input class="input" type="time" id="manualLogStart" style="width:100%;"></div>'+
      '<div class="field" style="flex:1;min-width:90px;"><label>End</label><input class="input" type="time" id="manualLogEnd" style="width:100%;"></div>'+
    '</div>'+
    '<div class="row" style="justify-content:flex-end;margin-top:16px;">'+
      '<button class="btn btn-ghost" data-action="closeManualLogModal">Cancel</button>'+
      '<button class="btn btn-primary" data-action="addManualFocusLog">Log It</button>'+
    '</div>';
}
function renderManualLogModalInto(){ const el=document.getElementById('manualLogContent'); if(el) morphInto(el, renderManualLogModal(), {form:true}); }
function renderRecentSessionsPreview(){
  const sessions = state.focus.sessions.slice().sort(function(a,b){ return b.startedAt-a.startedAt; }).slice(0,4);
  return '<div style="margin-top:16px;padding-top:14px;border-top:1px solid var(--border);">'+
    '<div class="kpi-label" style="margin-bottom:8px;">Recent Sessions</div>'+
    '<div class="task-list">'+
    (sessions.map(function(s){
      return '<div class="task-item-v2"><div style="width:60px;font-family:var(--font-display);font-weight:700;font-size:12.5px;">'+fmtDateShort(s.date)+'</div><div class="task-title" style="flex:1;font-size:13px;">'+fmtDurationLabel(s.minutes)+(s.manual?' &middot; manual':'')+'</div></div>';
    }).join('') || '<div class="empty">No sessions yet.</div>')+
    '</div>'+
  '</div>';
}
function renderSessionHistory(){
  const sessions = state.focus.sessions.slice().sort(function(a,b){ return b.startedAt-a.startedAt; }).slice(0,30);
  return '<div class="section"><div class="section-title">Session History</div><div class="task-list">'+
    (sessions.map(function(s){
      const titles = arr(s.completedTasks).map(function(t){return t.title;});
      return '<div class="task-item-v2 cal-item-clickable" data-action="editTimeBlock" data-kind="session" data-id="'+s.id+'"><div style="width:70px;font-family:var(--font-display);font-weight:700;">'+fmtDateShort(s.date)+'</div>'+
        '<div style="flex:1;min-width:160px;">'+
        '<div class="task-title">'+fmtDurationLabel(s.minutes)+(sessionType(s)!=='deep'?' &middot; '+sessionType(s):'')+(s.manual?' &middot; manual':'')+'</div>'+
        (titles.length ? '<div class="task-notes">Finished: '+titles.map(escapeHtml).join(', ')+'</div>' : '')+
        '</div><span class="kpi-sub">Edit</span></div>';
    }).join('') || '<div class="empty">No sessions logged yet — start one above.</div>')+
  '</div></div>';
}
function stasisMinutesForDate(dateStr){
  const dw = deepWorkMinutesFor(dateStr);
  const br = modeMinutesFor(dateStr,'break');
  const off = modeMinutesFor(dateStr,'offtime');
  const shoot = modeMinutesFor(dateStr,'shooting');
  let windowMins;
  if(dateStr===todayStr()){
    const now = new Date();
    windowMins = now.getHours()*60+now.getMinutes();
  } else {
    windowMins = 1440;
  }
  return Math.max(0, windowMins - dw - br - off - shoot);
}
function allTimeStasisMinutes(){
  const days = new Set();
  state.focus.sessions.forEach(function(s){ days.add(s.date); });
  state.modes.history.forEach(function(m){ days.add(m.date); });
  let total = 0;
  days.forEach(function(d){ total += stasisMinutesForDate(d); });
  return total;
}
function renderFocusAnalytics(){
  const fs = state.focus;
  const qs = qualifyingSessions();
  const todaySessions = qs.filter(function(s){return s.date===todayStr();});
  const todayMinutes = todaySessions.reduce(function(a,s){return a+s.minutes;},0);
  const last7=[]; for(let i=6;i>=0;i--) last7.push(addDays(todayStr(),-i));
  const last7Minutes = qs.filter(function(s){return last7.indexOf(s.date)>=0;}).reduce(function(a,s){return a+s.minutes;},0);
  const buckets = computeTimeOfDayBuckets();
  const last30=[]; for(let i=29;i>=0;i--) last30.push(addDays(todayStr(),-i));
  const minutesByDay = last30.map(deepWorkMinutesForQualifying);
  const totalAllTime = qs.reduce(function(a,s){return a+s.minutes;},0);
  const avgSession = qs.length?Math.round(totalAllTime/qs.length):0;
  const daysWithSession = new Set(qs.map(function(s){return s.date;})).size;
  const longestSession = qs.length ? Math.max.apply(null, qs.map(function(s){return s.minutes;})) : 0;
  const bestBucket = buckets.slice().sort(function(a,b){return b.minutes-a.minutes;})[0];
  const breakToday = modeMinutesFor(todayStr(),'break');
  const offToday = modeMinutesFor(todayStr(),'offtime');
  const shootToday = modeMinutesFor(todayStr(),'shooting');
  const breakAllTime = state.modes.history.filter(function(m){return m.type==='break';}).reduce(function(a,m){return a+m.minutes;},0);
  const offAllTime = state.modes.history.filter(function(m){return m.type==='offtime';}).reduce(function(a,m){return a+m.minutes;},0);
  const shootAllTime = state.modes.history.filter(function(m){return m.type==='shooting';}).reduce(function(a,m){return a+m.minutes;},0);
  const stasisAllTime = allTimeStasisMinutes();
  const stasisToday = stasisMinutesForDate(todayStr());
  return '<div class="section"><div class="grid grid-5">'+
    '<div class="hero-card" style="text-align:center;"><div class="hero-num" style="color:var(--accent);">'+fmtDurationLabel(totalAllTime)+'</div><div class="hero-label">All-Time Deep Work</div></div>'+
    '<div class="hero-card" style="text-align:center;"><div class="hero-num" style="color:var(--info);">'+fmtDurationLabel(breakAllTime)+'</div><div class="hero-label">All-Time Break</div></div>'+
    '<div class="hero-card" style="text-align:center;"><div class="hero-num" style="color:var(--shoot);">'+fmtDurationLabel(shootAllTime)+'</div><div class="hero-label">All-Time Shooting</div></div>'+
    '<div class="hero-card" style="text-align:center;"><div class="hero-num" style="color:var(--text-dim);">'+fmtDurationLabel(offAllTime)+'</div><div class="hero-label">All-Time Off-Time</div></div>'+
    '<div class="hero-card" style="text-align:center;"><div class="hero-num" style="color:var(--text-faint);">'+fmtDurationLabel(stasisAllTime)+'</div><div class="hero-label">All-Time Stasis</div></div>'+
  '</div></div>'+
  '<div class="section" style="max-width:300px;margin:0 auto;"><div class="stat-chip" style="text-align:center;"><div class="stat-chip-label">Deep Work, Last 7 Days</div><div class="stat-chip-value">'+fmtDurationLabel(last7Minutes)+'</div></div></div>'+
  '<div class="section"><div class="section-title">Today\'s Breakdown'+tip('For reference — the totals above are what matter.')+'</div><div class="grid grid-5">'+
    '<div class="card" style="text-align:center;"><div class="kpi-label">Deep Work</div><div class="kpi-value" style="color:var(--accent);">'+fmtDurationLabel(todayMinutes)+'</div></div>'+
    '<div class="card" style="text-align:center;"><div class="kpi-label">Break Mode</div><div class="kpi-value" style="color:var(--info);">'+fmtDurationLabel(breakToday)+'</div></div>'+
    '<div class="card" style="text-align:center;"><div class="kpi-label">Shooting Mode</div><div class="kpi-value" style="color:var(--shoot);">'+fmtDurationLabel(shootToday)+'</div></div>'+
    '<div class="card" style="text-align:center;"><div class="kpi-label">Off-Time Mode</div><div class="kpi-value" style="color:var(--text-dim);">'+fmtDurationLabel(offToday)+'</div></div>'+
    '<div class="card" style="text-align:center;"><div class="kpi-label">Stasis</div><div class="kpi-value" style="color:var(--text-faint);">'+fmtDurationLabel(stasisToday)+'</div></div>'+
  '</div></div>'+
  '<div class="grid grid-4 section">'+
    '<div class="card"><div class="kpi-label">Total Sessions</div><div class="kpi-value">'+qs.length+'</div></div>'+
    '<div class="card"><div class="kpi-label">Average Session</div><div class="kpi-value">'+fmtDurationLabel(avgSession)+'</div></div>'+
    '<div class="card"><div class="kpi-label">Longest Session</div><div class="kpi-value">'+fmtDurationLabel(longestSession)+'</div></div>'+
    '<div class="card"><div class="kpi-label">Days With A Session</div><div class="kpi-value">'+daysWithSession+'</div></div>'+
  '</div>'+
  '<div class="card section"><div class="kpi-label">Best Time Block'+tip('Based on all your logged deep work.')+'</div><div class="kpi-value">'+(bestBucket?bestBucket.label:'—')+'</div></div>'+
  '<div class="section"><div class="section-title">When You Work</div><div class="card">'+svgBarChart(buckets.map(function(b){return b.minutes;}), buckets.map(function(b){return b.label;}))+'</div></div>'+
  '<div class="section"><div class="section-title">Deep Work, Last 30 Days</div><div class="card">'+svgBarChart(minutesByDay, last30.map(function(d){return fmtDateShort(d).slice(0,3);}), {max:state.standards.deepWorkTargetMinutes})+'</div></div>'+
  renderMostUsedAppsSection()+
  renderSessionHistory()+
  renderModeHistorySection();
}
function renderMostUsedAppsSection(){
  if(!state.settings.appTracking || state.settings.appTracking.enabled===false) return '';
  const todayApps = topAppsForDate(todayStr(), 6);
  const allTimeApps = topAppsAllTime(6);
  const maxToday = todayApps.length ? todayApps[0].minutes : 0;
  const maxAllTime = allTimeApps.length ? allTimeApps[0].minutes : 0;
  function barRow(a, max){
    const pct = max>0 ? Math.round((a.minutes/max)*100) : 0;
    return '<div class="task-item-v2" style="align-items:center;">'+
      '<div style="width:120px;flex-shrink:0;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;" title="'+escapeHtml(a.app)+'">'+escapeHtml(a.app)+'</div>'+
      '<div style="flex:1;background:var(--panel-2);border-radius:4px;height:10px;overflow:hidden;"><div style="width:'+pct+'%;height:100%;background:var(--accent);"></div></div>'+
      '<div style="width:64px;text-align:right;flex-shrink:0;" class="kpi-sub">'+fmtDurationLabel(a.minutes)+'</div>'+
    '</div>';
  }
  return '<div class="section"><div class="section-title">Most Used Apps'+tip('Tracked from the app in front on this Mac while Operator is open.')+'</div>'+
    '<div class="grid grid-2">'+
      '<div class="card"><div class="kind-label" style="margin-bottom:8px;">Today</div>'+
        (todayApps.length ? todayApps.map(function(a){ return barRow(a, maxToday); }).join('') : '<div class="empty">No app activity tracked yet today.</div>')+
      '</div>'+
      '<div class="card"><div class="kind-label" style="margin-bottom:8px;">All-Time</div>'+
        (allTimeApps.length ? allTimeApps.map(function(a){ return barRow(a, maxAllTime); }).join('') : '<div class="empty">No app activity tracked yet.</div>')+
      '</div>'+
    '</div></div>';
}
function renderTimeByTaskSection(){
  const tracked = state.tasks.items.filter(function(t){ return (t.trackedMinutes||0)>0; })
    .sort(function(a,b){ return (b.trackedMinutes||0)-(a.trackedMinutes||0); })
    .slice(0,10);
  return '<div class="section"><div class="section-title">Time By Task'+tip('Time tracked while a task is your Current task.')+'</div><div class="task-list">'+
    (tracked.map(function(t){
      return '<div class="task-item-v2">'+
        '<div class="task-title-row">'+priorityTag(t.priority)+'<span class="task-title">'+escapeHtml(t.title)+'</span>'+(t.ongoing?'<span class="tag tag-personal">&#128204; Ongoing</span>':'')+'</div>'+
        '<span class="kpi-value" style="font-size:15px;">'+fmtDurationLabel(t.trackedMinutes)+'</span>'+
      '</div>';
    }).join('') || '<div class="empty">No time tracked on individual tasks yet — set a task as Current from the Tasks page, Focus tab, or Today dashboard to start timing it.</div>')+
  '</div></div>';
}
function timeBlockLabel(m){
  const startT = fmtTimeShort(m.startedAt);
  const endT = m.endedAt ? fmtTimeShort(m.endedAt) : null;
  return endT ? (startT+' – '+endT) : startT;
}
function renderModeHistorySection(){
  const history = state.modes.history.slice().sort(function(a,b){ return b.startedAt-a.startedAt; }).slice(0,20);
  return '<div class="section"><div class="section-title">Break, Shooting &amp; Off-Time History'+tip('Saved permanently for day / week / month analysis.')+'</div><div class="task-list">'+
    (history.map(function(m){
      const label = MODE_LABELS[m.type] || 'Mode';
      const color = modeColor(m.type);
      return '<div class="task-item-v2 cal-item-clickable" data-action="editTimeBlock" data-kind="mode" data-id="'+m.id+'">'+
        '<div style="width:70px;font-family:var(--font-display);font-weight:700;">'+fmtDateShort(m.date)+'</div>'+
        '<span class="tag" style="background:'+color+'22;color:'+color+';">'+modeIcon(m.type)+' '+label+'</span>'+
        '<div style="min-width:0;flex:1;">'+
          '<div class="task-title">'+fmtDurationLabel(m.minutes)+'</div>'+
          '<div class="kpi-sub">'+timeBlockLabel(m)+'</div>'+
        '</div>'+
        (m.note ? '<div class="kpi-sub" style="max-width:200px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;">'+escapeHtml(m.note)+'</div>' : '')+
      '</div>';
    }).join('') || '<div class="empty">No breaks or off-time logged yet.</div>')+
  '</div></div>';
}
function openBreakDetail(id){
  const m = state.modes.history.find(function(x){ return x.id===id; }); if(!m) return;
  ui.viewingModeId = id;
  const o = document.getElementById('breakDetailOverlay');
  if(!o) return;
  o.classList.remove('hidden');
  renderBreakDetailModalInto();
}
function closeBreakDetail(){ ui.viewingModeId = null; const o=document.getElementById('breakDetailOverlay'); if(o) o.classList.add('hidden'); }
function renderBreakDetailModal(){
  const m = state.modes.history.find(function(x){ return x.id===ui.viewingModeId; });
  if(!m) return '';
  const label = MODE_LABELS[m.type] || 'Mode';
  const h = Math.floor(m.minutes/60), mins = m.minutes%60;
  const timeLabel = (h>0 ? h+' hour'+(h===1?'':'s')+' ' : '')+mins+' minute'+(mins===1?'':'s');
  return '<div class="section-title" style="margin-bottom:8px;">'+modeIcon(m.type)+' '+label+'</div>'+
    '<div class="kpi-sub" style="margin-bottom:14px;">'+fmtDateShort(m.date)+' &middot; '+timeBlockLabel(m)+'</div>'+
    '<div class="hero-num hero-num-md">'+timeLabel+'</div>'+
    '<div class="modal-note-box">'+(m.note ? escapeHtml(m.note) : 'No note added for this one.')+'</div>'+
    '<div class="row" style="margin-top:20px;justify-content:flex-end;">'+
      '<button class="btn btn-primary" data-action="closeBreakDetail">Close</button>'+
    '</div>';
}
function renderBreakDetailModalInto(){ const el=document.getElementById('breakDetailContent'); if(el) morphInto(el, renderBreakDetailModal(), {form:true}); }
function alarmRow(a){
  return '<div class="task-item-v2">'+
    '<div style="font-family:var(--font-display);font-weight:700; width:78px;">'+fmt12Hour(a.time)+'</div>'+
    '<div class="task-title" style="flex:1;">'+escapeHtml(a.label||'Reminder')+(a.date?' <span class="kpi-sub">'+fmtDateShort(a.date)+' only</span>':'')+'</div>'+
    (a.date ? '' : '<div class="row">'+DAY_LETTERS.map(function(l,i){ return '<span class="chip '+(a.days.indexOf(i)>=0?'active':'')+'" style="padding:3px 7px;font-size:10px;" data-action="toggleAlarmDay" data-id="'+a.id+'" data-day="'+i+'">'+l+'</span>'; }).join('')+'</div>')+
    '<button class="btn btn-ghost btn-sm" data-action="toggleAlarmEnabled" data-id="'+a.id+'">'+(a.enabled?'On':'Off')+'</button>'+
    '<button class="btn btn-ghost btn-sm" data-action="openAlarmEditModal" data-id="'+a.id+'">Edit</button>'+
    deleteBtn('alarm', a.id)+
  '</div>';
}
function openAlarmEditModal(id){
  ui.editingAlarmId = id;
  const o = document.getElementById('alarmEditOverlay');
  if(!o) return;
  o.classList.remove('hidden');
  renderAlarmEditModalInto();
}
function closeAlarmEditModal(){ ui.editingAlarmId = null; const o=document.getElementById('alarmEditOverlay'); if(o) o.classList.add('hidden'); }
function renderAlarmEditModal(){
  const a = state.focus.alarms.find(function(x){return x.id===ui.editingAlarmId;});
  if(!a) return '';
  return '<div class="section-title" style="margin-bottom:14px;">Edit Alarm</div>'+
    '<div class="grid grid-2">'+
      '<div class="field"><label>Time</label><input class="input" type="time" id="editAlarmTime-'+a.id+'" value="'+a.time+'"></div>'+
      '<div class="field"><label>Label</label><input class="input" id="editAlarmLabel-'+a.id+'" value="'+escapeHtml(a.label||'')+'"></div>'+
    '</div>'+
    '<div class="field" style="margin-top:10px;"><label>Note to show when it goes off (optional)</label><textarea class="input" id="editAlarmNote-'+a.id+'" style="width:100%;min-height:60px;" placeholder="Written the night before — what matters today.">'+escapeHtml(a.wakeNote||'')+'</textarea></div>'+
    '<div class="field" style="margin-top:10px;"><label>Song or YouTube link (optional)</label><input class="input" id="editAlarmMedia-'+a.id+'" value="'+escapeHtml(a.mediaUrl||'')+'" placeholder="https://…"></div>'+
    '<label class="row" style="margin-top:10px;font-size:12.5px;color:var(--text-dim);"><input type="checkbox" id="editAlarmWake-'+a.id+'" '+(a.wake?'checked':'')+' style="margin-right:6px;">Wake-up alarm — also show last night\'s plan</label>'+
    '<div class="row" style="margin-top:20px;justify-content:space-between;">'+
      deleteBtn('alarm', a.id)+
      '<div class="row">'+
        '<button class="btn btn-ghost" data-action="closeAlarmEditModal">Cancel</button>'+
        '<button class="btn btn-primary" data-action="saveAlarmEdit" data-id="'+a.id+'">Save</button>'+
      '</div>'+
    '</div>';
}
function renderAlarmEditModalInto(){ const el=document.getElementById('alarmEditContent'); if(el) morphInto(el, renderAlarmEditModal(), {form:true}); }
function saveAlarmEdit(id){
  const a = state.focus.alarms.find(function(x){return x.id===id;}); if(!a) return;
  a.time = document.getElementById('editAlarmTime-'+id).value || a.time;
  a.label = document.getElementById('editAlarmLabel-'+id).value.trim();
  const noteEl = document.getElementById('editAlarmNote-'+id); if(noteEl) a.wakeNote = noteEl.value.trim();
  const mediaEl = document.getElementById('editAlarmMedia-'+id); if(mediaEl) a.mediaUrl = mediaEl.value.trim();
  const wakeEl = document.getElementById('editAlarmWake-'+id); if(wakeEl) a.wake = wakeEl.checked;
  closeAlarmEditModal();
  persist('focus'); renderView();
}
function chooseOpenEnded(){
  ui.focusOpenEnded = false;
  closeLockInChooser();
  openPreFocusModal(null);
}
// every Lock In button opens the Lock In sequence (32m-lock-in.js)
function openLockInChooser(){ openLockSeq(); }
function openLockLengthPicker(){
  const o = document.getElementById('lockInOverlay');
  if(!o) return;
  o.classList.remove('hidden');
  renderLockInModalInto();
  setTimeout(function(){ if(!ui.focusOpenEnded) initScrollPicker('startPicker', 60); }, 0);
}
function closeLockInChooser(){ const o=document.getElementById('lockInOverlay'); if(o) o.classList.add('hidden'); }
function renderLockInModal(){
  return '<div class="section-title" style="justify-content:center;">Choose a Length</div>'+
    '<div style="max-width:220px;margin:0 auto;">'+buildScrollPicker('startPicker', durationOptions(240), 60)+'</div>'+
    '<div class="row" style="justify-content:center;margin-top:12px;">'+
      '<span class="chip" data-action="chooseOpenEnded">Open-Ended Instead</span>'+
    '</div>'+
    '<button class="btn btn-good lock-in-btn" data-action="lockInFocus" style="margin-top:16px;">&#128274; LOCK IN</button>'+
    '<button class="btn btn-ghost" data-action="closeLockInChooser" style="margin-top:8px;width:100%;">Cancel</button>';
}
function renderLockInModalInto(){ const el=document.getElementById('lockInModalContent'); if(el) morphInto(el, renderLockInModal(), {form:true}); }
function lockInFocus(){
  closeLockInChooser();
  const minutes = getPickerValue('startPicker');
  openPreFocusModal(minutes || null);
}
function viewAllSessions(){ ui.focusTab='analytics'; renderView(); }
function startFocus(minutes){
  // Locking in exits off-time / shooting cleanly (logging that block) instead of silently
  // refusing and leaving the app stuck in the old mode.
  if(state.modes.active && !state.modes.active.linkedFocus) finishActiveMode(true);
  if(state.modes.active) return;
  state.focus.activeSession = {startedAt: Date.now(), plannedMinutes: minutes || null, completedTasks:[], breaks:[], onBreak:false, completeFired:false};
  if(ui.pendingLockMethod){ state.focus.activeSession.method = ui.pendingLockMethod; state.focus.activeSession.round = 1; state.focus.activeSession.segStart = 0; }
  if(ui.stagedTaskId){
    const st = state.tasks.items.find(function(x){return x.id===ui.stagedTaskId;});
    if(st){ ui.currentTaskId = ui.stagedTaskId; ui.currentTaskStartedAt = Date.now(); }
    if(state.focus.nextTaskId===ui.stagedTaskId) state.focus.nextTaskId = null;
    ui.stagedTaskId = null;
  }
  persist('focus'); renderView();
}
function stageNextTask(taskId){
  const t = state.tasks.items.find(function(x){return x.id===taskId;}); if(!t) return;
  ui.stagedTaskId = taskId;
  state.focus.nextTaskId = taskId; persist('focus');
  ui.justStaged = true;
  playTick();
  renderView();
  setTimeout(function(){ ui.justStaged = false; renderView(); }, 1000);
}
function clearStagedTask(){ ui.stagedTaskId = null; if(state.focus.nextTaskId){ state.focus.nextTaskId = null; persist('focus'); } renderView(); }
function openStopFocus(){
  const overlay = document.getElementById('stopFocusOverlay');
  overlay.classList.remove('hidden');
  renderStopFocusModalInto();
}
function closeStopFocus(){ document.getElementById('stopFocusOverlay').classList.add('hidden'); }
function requestStopConfirm(){
  closeStopFocus();
  const o = document.getElementById('finalStopOverlay');
  if(!o) return;
  o.classList.remove('hidden');
  renderFinalStopModalInto();
}
function closeFinalStopConfirm(){ const o=document.getElementById('finalStopOverlay'); if(o) o.classList.add('hidden'); }
function renderFinalStopModal(){
  return '<div class="section-title" style="margin-bottom:8px;">Wrapping Up?</div>'+
    '<div class="kpi-sub" style="margin-bottom:18px;">Are you sure you\'re done working for now?</div>'+
    '<div class="row" style="justify-content:flex-end;">'+
      '<button class="btn btn-ghost" data-action="cancelFinalStop">No, Keep Going</button>'+
      '<button class="btn btn-danger" data-action="reallyConfirmStopFocus">Yes, I\'m Done</button>'+
    '</div>';
}
function renderFinalStopModalInto(){ const el=document.getElementById('finalStopContent'); if(el) morphInto(el, renderFinalStopModal(), {form:true}); }
function cancelFinalStop(){ closeFinalStopConfirm(); }
function reallyConfirmStopFocus(){
  const s = state.focus.activeSession;
  closeFinalStopConfirm();
  if(!s) return;
  const endedAt = Date.now();
  const minutes = Math.max(1, Math.round((endedAt - s.startedAt)/60000));
  // Close out the current task's timing while the session still counts as active.
  if(ui.currentTaskId){ accumulateCurrentTaskTime(ui.currentTaskId); persist('tasks'); }
  state.focus.sessions.push({id:uid(), type:sessionType(s), date:todayStr(new Date(s.startedAt)), startedAt:s.startedAt, endedAt:endedAt, minutes:minutes, completedTasks: arr(s.completedTasks), note:''});
  state.focus.activeSession = null;
  // Remember the manual lock-out so auto lock-in respects its cooldown.
  state.focus.lastManualStopAt = endedAt;
  state.focus.lastSessionEndedAt = endedAt;
  if(ui.currentTaskId){ accumulateCurrentTaskTime(ui.currentTaskId); persist('tasks'); }
  if(state.modes.active && state.modes.active.linkedFocus){ finishActiveMode(true); }
  playLockOut(); lockOutFlash(minutes, arr(s.completedTasks).length);
  persist('focus'); renderView();
}
function renderStopFocusModal(){
  const as = state.focus.activeSession;
  const toward = arr(state.focus.motivations.toward);
  const away = arr(state.focus.motivations.away);
  const completed = as ? arr(as.completedTasks) : [];
  const todayTasksRemaining = state.tasks.items.filter(function(t){ return t.status==='today'; });
  const upcomingDeadlines = state.tasks.items.filter(function(t){ return t.deadline && t.status!=='done' && t.deadline>=todayStr(); }).sort(function(a,b){ return a.deadline.localeCompare(b.deadline); }).slice(0,3);
  const backlogCount = state.tasks.items.filter(function(t){ return t.status==='backlog'; }).length;

  return '<div class="section-title" style="margin-bottom:8px;">Before You Stop</div>'+
    '<div class="kpi-sub" style="margin-bottom:14px;">Did you get done what you needed to?</div>'+
    '<div class="grid grid-2">'+
      '<div><div class="kind-label" style="color:var(--good);">Remember You Want</div>'+(toward.map(function(m){ return '<div class="motiv-toward">+ '+escapeHtml(m.text)+'</div>'; }).join('') || '<div class="kpi-sub">Nothing set.</div>')+'</div>'+
      '<div><div class="kind-label" style="color:var(--danger);">Remember You\'re Avoiding</div>'+(away.map(function(m){ return '<div class="motiv-away">&minus; '+escapeHtml(m.text)+'</div>'; }).join('') || '<div class="kpi-sub">Nothing set.</div>')+'</div>'+
    '</div>'+
    '<div class="section-title" style="margin-top:18px;margin-bottom:8px;">Remaining Tasks for Today</div>'+
    (todayTasksRemaining.length ? '<div class="task-list">'+todayTasksRemaining.map(function(t){ return '<div class="task-item-v2"><div class="task-title" style="flex:1;">'+escapeHtml(t.title)+'</div></div>'; }).join('')+'</div>' : '<div class="empty">Nothing left on today\'s list.</div>')+
    (upcomingDeadlines.length ? '<div class="kind-label">Upcoming Deadlines</div><div class="task-list">'+upcomingDeadlines.map(function(t){ return '<div class="task-item-v2"><span class="tag" style="background:var(--danger-dim);color:var(--danger-text);">'+fmtDateShort(t.deadline)+'</span><div class="task-title" style="flex:1;">'+escapeHtml(t.title)+'</div></div>'; }).join('')+'</div>' : '')+
    '<div class="kpi-sub" style="margin-top:10px;">'+backlogCount+' more item'+(backlogCount===1?'':'s')+' waiting in your backlog.</div>'+
    '<div class="section-title" style="margin-top:18px;margin-bottom:8px;">Finished This Session</div>'+
    (completed.length ? '<div class="task-list">'+completed.map(function(t){ return '<div class="task-item-v2" style="border-color:var(--good);"><div class="task-title" style="color:var(--good);">&#10003; '+escapeHtml(t.title)+'</div></div>'; }).join('')+'</div>' : '<div class="empty">Nothing marked complete yet — still time to knock one out before you stop.</div>')+
    '<div class="row" style="margin-top:22px;justify-content:flex-end;">'+
      '<button class="btn btn-ghost" data-action="cancelStopFocus">Keep Going</button>'+
      '<button class="btn btn-danger" data-action="requestStopConfirm">Stop &amp; Log</button>'+
    '</div>';
}
function renderStopFocusModalInto(){ const el=document.getElementById('stopFocusContent'); if(el) morphInto(el, renderStopFocusModal(), {form:true}); }
function openTimesUpModal(){
  const overlay = document.getElementById('timesUpOverlay');
  if(!overlay) return;
  overlay.classList.remove('hidden');
  renderTimesUpModalInto();
}
function closeTimesUpModal(){ const o=document.getElementById('timesUpOverlay'); if(o) o.classList.add('hidden'); }
function renderTimesUpModal(){
  const as = state.focus.activeSession;
  return '<div class="section-title" style="margin-bottom:8px;">Time\'s Up!</div>'+
    '<div class="kpi-sub" style="margin-bottom:18px;">You hit your '+(as&&as.plannedMinutes?fmtDurationLabel(as.plannedMinutes):'')+' goal. Keep going, or wrap it up?</div>'+
    '<div class="row" style="justify-content:flex-end;">'+
      '<button class="btn" data-action="continueFocusFromTimesUp">Keep Going</button>'+
      '<button class="btn btn-danger" data-action="stopFromTimesUp">End Session</button>'+
    '</div>';
}
function renderTimesUpModalInto(){ const el=document.getElementById('timesUpContent'); if(el) morphInto(el, renderTimesUpModal(), {form:true}); }
function continueFocusFromTimesUp(){
  const as = state.focus.activeSession; if(as){ as.plannedMinutes = null; persist('focus'); }
  closeTimesUpModal(); renderView();
}
function stopFromTimesUp(){ closeTimesUpModal(); openStopFocus(); }
function saveDoneTaskNote(id){
  const as = state.focus.activeSession; if(!as) return;
  const t = arr(as.completedTasks).find(function(x){ return x.id===id; }); if(!t) return;
  const el = document.getElementById('donenote-'+id);
  t.note = el ? el.value : '';
  t.noteFinalized = true;
  persist('focus'); renderView();
}
function addPrepItem(){
  const el = document.getElementById('newPrepLabel');
  const label = el ? el.value.trim() : '';
  if(!label) return;
  state.focus.prepItems.push({id:uid(), label:label});
  persist('focus'); renderView();
}
function addMotivation(kind){
  const inputId = kind==='toward' ? 'newMotivToward' : 'newMotivAway';
  const el = document.getElementById(inputId);
  const text = el ? el.value.trim() : '';
  if(!text) return;
  state.focus.motivations[kind].push({id:uid(), text:text});
  persist('focus'); renderView();
}
function addAlarm(){
  const time = document.getElementById('newAlarmTime').value;
  const label = document.getElementById('newAlarmLabel').value.trim();
  if(!time) return;
  state.focus.alarms.push({id:uid(), time:time, label:label, days:[0,1,2,3,4,5,6], enabled:true});
  persist('focus'); renderView();
}
function toggleAlarmDay(id, day){
  const a = state.focus.alarms.find(function(x){ return x.id===id; }); if(!a) return;
  day = Number(day);
  const idx = a.days.indexOf(day);
  if(idx>=0) a.days.splice(idx,1); else a.days.push(day);
  persist('focus'); renderView();
}
function toggleAlarmEnabled(id){ const a=state.focus.alarms.find(function(x){return x.id===id;}); if(!a) return; a.enabled=!a.enabled; persist('focus'); renderView(); }
function requestNotifs(){ try{ if('Notification' in window) Notification.requestPermission(); }catch(e){} }
function addFocusTime(minutes){
  const as = state.focus.activeSession;
  if(!as || !as.plannedMinutes) return;
  as.plannedMinutes += minutes;
  as.completeFired = false;
  persist('focus'); renderView();
}
function openBreakNotePrompt(){
  const as = state.focus.activeSession; if(!as || as.onBreak) return;
  const fb = flowBreakMinutes(); if(fb) ui.breakMinutes = fb;
  const o = document.getElementById('breakNoteOverlay');
  if(!o) return;
  o.classList.remove('hidden');
  renderBreakNoteModalInto();
}
function closeBreakNotePrompt(){ const o=document.getElementById('breakNoteOverlay'); if(o) o.classList.add('hidden'); }
function renderBreakNoteModal(){
  return '<div class="section-title" style="margin-bottom:8px;">'+modeIcon('break')+' Break Mode</div>'+
    '<div class="kpi-sub" style="margin-bottom:12px;">What\'s this break for? A quick note helps you see your break patterns later.</div>'+
    '<input class="input" id="breakNoteInput" placeholder="e.g. Lunch, quick walk, phone call" style="width:100%;">'+
    '<div class="kind-label" style="margin-top:14px;">How long?</div>'+
    '<div class="row break-len-row" style="gap:6px;flex-wrap:wrap;">'+[5,10,15,20,30,45,60,'open'].map(function(m){ const on = (ui.breakMinutes==null ? 15 : ui.breakMinutes)===m; return '<button class="btn btn-sm '+(on?'btn-primary':'btn-ghost')+'" data-action="pickBreakMinutes" data-minutes="'+m+'">'+(m==='open'?'No timer':m+' min')+'</button>'; }).join('')+'</div>'+
    '<div class="kpi-sub" style="margin-top:6px;">'+((ui.breakMinutes==null?15:ui.breakMinutes)==='open' ? 'The break runs until you end it.' : 'Ends by itself after '+(ui.breakMinutes==null?15:ui.breakMinutes)+' min and you\'re back in the session.')+'</div>'+
    '<div class="row" style="margin-top:20px;justify-content:flex-end;">'+
      '<button class="btn btn-ghost" data-action="closeBreakNotePrompt">Cancel</button>'+
      '<button class="btn btn-primary" data-action="confirmStartBreakMode">'+modeIcon('break')+' Start Break</button>'+
    '</div>';
}
function renderBreakNoteModalInto(){ const el=document.getElementById('breakNoteContent'); if(el) morphInto(el, renderBreakNoteModal(), {form:true}); }
function confirmStartBreakMode(){
  const as = state.focus.activeSession; if(!as || as.onBreak) { closeBreakNotePrompt(); return; }
  const noteEl = document.getElementById('breakNoteInput');
  const note = noteEl ? noteEl.value.trim() : '';
  closeBreakNotePrompt();
  if(!Array.isArray(as.breaks)) as.breaks=[];
  const breakLen = ui.breakMinutes==null ? 15 : ui.breakMinutes;
  as.breaks.push({start:Date.now(), note:note, minutes:breakLen==='open'?null:breakLen});
  as.onBreak = true;
  as.breakStartedAt = Date.now();
  as.breakEndsAt = breakLen==='open' ? null : Date.now()+breakLen*60000;
  as.frozenElapsedMs = Date.now() - as.startedAt;
  as.segStart = as.frozenElapsedMs;
  state.modes.active = {type:'break', startedAt:Date.now(), note:note, linkedFocus:true};
  if(ui.currentTaskId){ ui.pausedTaskId = ui.currentTaskId; accumulateCurrentTaskTime(ui.currentTaskId); persist('tasks'); }
  ui.pendingCurrentTaskId = null;
  playRestSound();
  persist('focus'); persist('modes'); renderView();
}
function endBreakModeFromFocus(){
  const as = state.focus.activeSession; if(!as || !as.onBreak) return;
  const lastBreak = as.breaks[as.breaks.length-1];
  const startedAt = as.breakStartedAt || lastBreak.start;
  const actualBreakMs = Date.now() - startedAt;
  as.startedAt += actualBreakMs;
  as.onBreak = false;
  as.breakEndsAt = null;
  const minutes = Math.max(1, Math.round(actualBreakMs/60000));
  state.modes.history.push({id:uid(), type:'break', date:todayStr(new Date(startedAt)), startedAt:startedAt, endedAt:Date.now(), minutes:minutes, note:lastBreak.note||''});
  state.modes.active = null;
  if(ui.pausedTaskId){
    const pt = state.tasks.items.find(function(x){return x.id===ui.pausedTaskId;});
    if(pt && pt.status!=='done') ui.pendingCurrentTaskId = ui.pausedTaskId;
    ui.pausedTaskId = null;
  }
  playStopSound();
  persist('focus'); persist('modes'); renderView();
}
function startBreak(minutes){
  const as = state.focus.activeSession; if(!as) return;
  const priorBreaks = arr(as.breaks).length;
  const isShortSession = !as.plannedMinutes || as.plannedMinutes<=240;
  const multiWarning = priorBreaks>=1 && isShortSession;
  openBreakConfirm(minutes, multiWarning);
}
function actuallyStartBreak(minutes){
  const as = state.focus.activeSession; if(!as) return;
  const noteEl = document.getElementById('breakNote');
  const note = noteEl ? noteEl.value.trim() : '';
  if(!Array.isArray(as.breaks)) as.breaks=[];
  as.breaks.push({start:Date.now(), minutes:minutes, note:note});
  as.onBreak = true;
  as.breakEndsAt = Date.now() + minutes*60000;
  as.frozenElapsedMs = Date.now() - as.startedAt;
  if(ui.currentTaskId){ ui.pausedTaskId = ui.currentTaskId; accumulateCurrentTaskTime(ui.currentTaskId); persist('tasks'); }
  ui.pendingCurrentTaskId = null;
  ui.forms.breakForm = false;
  persist('focus'); renderView();
}
function endBreakNow(){
  const as = state.focus.activeSession; if(!as || !as.onBreak) return;
  const lastBreak = as.breaks[as.breaks.length-1];
  const actualBreakMs = Date.now() - lastBreak.start;
  as.startedAt += actualBreakMs;
  as.onBreak = false;
  if(ui.pausedTaskId){
    const pt = state.tasks.items.find(function(x){return x.id===ui.pausedTaskId;});
    if(pt && pt.status!=='done') ui.pendingCurrentTaskId = ui.pausedTaskId;
    ui.pausedTaskId = null;
  }
  persist('focus'); renderView();
}
function openBreakConfirm(minutes, multiWarning){
  pendingBreakMinutes = minutes;
  ui.breakConfirmMultiWarning = !!multiWarning;
  const o = document.getElementById('multiBreakOverlay');
  if(!o) return;
  o.classList.remove('hidden');
  renderMultiBreakModalInto();
}
function closeMultiBreakWarning(){ const o=document.getElementById('multiBreakOverlay'); if(o) o.classList.add('hidden'); }
function renderMultiBreakModal(){
  const extra = ui.breakConfirmMultiWarning ? 'That would be more than one break in a shorter work session. ' : '';
  return '<div class="section-title" style="margin-bottom:8px;">Take a Break?</div>'+
    '<div class="kpi-sub" style="margin-bottom:18px;">'+extra+'Sure you want to take a '+fmtDurationLabel(pendingBreakMinutes)+' break?</div>'+
    '<div class="row" style="justify-content:flex-end;">'+
      '<button class="btn btn-ghost" data-action="cancelMultiBreak">Never Mind</button>'+
      '<button class="btn btn-primary" data-action="confirmMultiBreak">Take The Break</button>'+
    '</div>';
}
function renderMultiBreakModalInto(){ const el=document.getElementById('multiBreakContent'); if(el) morphInto(el, renderMultiBreakModal(), {form:true}); }
function confirmMultiBreak(){ const m=pendingBreakMinutes; closeMultiBreakWarning(); actuallyStartBreak(m); }
function cancelMultiBreak(){ closeMultiBreakWarning(); }
function addManualFocusLog(){
  const date = document.getElementById('manualLogDate').value || todayStr();
  const startT = document.getElementById('manualLogStart').value;
  const endT = document.getElementById('manualLogEnd').value;
  if(!startT || !endT) return;
  const s = startT.split(':').map(Number), e = endT.split(':').map(Number);
  let mins = (e[0]*60+e[1]) - (s[0]*60+s[1]);
  if(mins<=0) mins += 24*60;
  // Store the real start/end so the session shows (and can be edited) at the right time.
  const startedAt = localTs(date, startT);
  state.focus.sessions.push({id:uid(), type:'deep', date:date, startedAt:startedAt, endedAt:startedAt+mins*60000, minutes:mins, completedTasks:[], manual:true});
  playPositive();
  closeManualLogModal();
  persist('focus'); renderView();
}
function openPreFocusModal(minutes){ openLockSeq(minutes!==undefined && minutes!==null ? {minutes:minutes} : {}); }
function openPreFocusChecklist(minutes){
  ui.pendingFocusMinutes = minutes;
  ui.preFocusStep = 'before';
  const overlay = document.getElementById('preFocusOverlay');
  overlay.classList.remove('hidden');
  renderPreFocusModalInto();
}

