// ============ DASHBOARD PANELS (Today) ============
function renderPersonalStatsPanel(){
  const p = state.profile;
  const streak = computeStreak();
  const todayFocusMin = deepWorkMinutesTodayLive();
  const yesterdayFocusMin = deepWorkMinutesFor(addDays(todayStr(),-1));
  // This week = Sunday 12 AM through now (it used to be a rolling 7 days that never reset).
  let weekFocusMin = todayFocusMin;
  for(let d=startOfWeekSundayStr(todayStr()); d<todayStr(); d=addDays(d,1)){ weekFocusMin += deepWorkMinutesFor(d); }
  const todayTasks = state.tasks.items.filter(function(t){ return t.status==='today'; });
  const doneToday = state.tasks.items.filter(function(t){ return t.status==='done' && t.completedAt===todayStr(); });
  const manualItems = arr(state.standards.items);
  const rec = getStandardRec(todayStr());
  const target = state.standards.deepWorkTargetMinutes || 180;
  const deepWorkPct = clamp(Math.round(todayFocusMin/target*100),0,100);
  const allStandardsDone = dayStandardsComplete(todayStr());
  return '<div class="section">'+
  '<div class="grid grid-3 stat-chip-row">'+
    '<div class="stat-chip" id="statDeepWorkBox">'+deepWorkStatInnerHtml(todayFocusMin)+'</div>'+
    '<div class="stat-chip">'+
      '<div class="stat-chip-label">Time Worked</div>'+
      '<div class="time-worked-rows">'+
        '<div class="time-worked-row"><span class="time-worked-key">Yesterday</span><span class="time-worked-val">'+fmtDurationLabel(yesterdayFocusMin)+'</span></div>'+
        '<div class="time-worked-row"><span class="time-worked-key">This week</span><span class="time-worked-val">'+fmtDurationLabel(weekFocusMin)+'</span></div>'+
      '</div>'+
    '</div>'+
    '<div class="stat-chip" data-action="goToFinishedTasks" style="cursor:pointer;"><div class="stat-chip-label">Tasks</div><div class="stat-chip-value">'+doneToday.length+'<span class="stat-chip-of"> / '+(doneToday.length+todayTasks.length)+'</span></div><div class="kpi-sub" style="margin-top:6px;">completed today</div></div>'+
  '</div>'+
  '<div class="card" style="text-align:center;margin-top:10px;">'+
    '<div class="kpi-label" style="margin-bottom:8px;">Today\'s Standard'+(allStandardsDone?' <span class="tag tag-good">&#10003; Complete</span>':'')+'</div>'+
    '<div class="row" style="justify-content:center;">'+
      deepWorkChipHtml('stdDeepWorkChip')+
      trainedChipHtml()+
      manualItems.map(function(it){ return '<span class="chip '+(rec.doneIds.indexOf(it.id)>=0?'active':'')+'" data-action="toggleStandard" data-id="'+it.id+'">'+escapeHtml(it.label)+'</span>'; }).join('')+
      ongoingStandardTasksHtml()+
    '</div>'+
  '</div>'+
  yesterdayStandardsFixupHtml()+
  '</div>';
}
function collectedByMonth(monthKey){
  const inc = arr(state.finances.income).filter(function(x){ return monthKeyOf(x.date)===monthKey; }).reduce(function(a,x){ return a+Number(x.amount||0); }, 0);
  const inv = arr(state.finances.invoices).filter(function(x){ return monthKeyOf(x.date)===monthKey; }).reduce(function(a,x){ return a+Number(x.amount||0); }, 0);
  return inc+inv;
}
function money(n){ n = Number(n)||0; return n>=10000 ? '$'+(n/1000).toFixed(n>=100000?0:1).replace(/\.0$/,'')+'k' : '$'+n.toLocaleString(); }
function renderBusinessPanel(){
  const active = arr(state.business.clients).filter(function(c){ return c.status==='active'; });
  const mrr = active.reduce(function(a,c){ return a+Number(c.mrr||0); },0);
  const open = arr(state.business.pipeline).filter(function(p){ return typeof leadIsOpen==='function' ? leadIsOpen(p) : (p.stage!=='lost' && p.stage!=='closed'); });
  const pipe = open.reduce(function(a,p){ return a+Number(p.value||0); },0);
  const goal = Number(state.profile.revenueGoalMonthly)||0;
  const scale = Math.max(goal, mrr+pipe, 1);
  const cutoff = addDays(todayStr(),7);
  const due = state.tasks.items.filter(function(t){ return t.deadline && t.status!=='done' && t.deadline<=cutoff; }).sort(function(a,b){ return a.deadline.localeCompare(b.deadline); });
  // last 6 months collected
  const months = []; const now = new Date();
  for(let k=5;k>=0;k--){ const d = new Date(now.getFullYear(), now.getMonth()-k, 1); const key = d.getFullYear()+'-'+pad2(d.getMonth()+1); months.push({key:key, label:d.toLocaleDateString(undefined,{month:'short'}), v:collectedByMonth(key)}); }
  const maxV = Math.max.apply(null, months.map(function(m){ return m.v; }).concat([mrr, 1]));
  return '<div class="section biz-panel">'+
    '<div class="section-title">Business<span class="view-all-link" data-action="nav" data-view="business">Open Business &rarr;</span></div>'+
    '<div class="card biz-card">'+
      '<div class="biz-main">'+
        '<div class="stat-tile-k">MRR</div>'+
        '<div class="biz-mrr">$'+mrr.toLocaleString()+'</div>'+
        (goal ? '<div class="biz-bar" title="'+Math.round(mrr/goal*100)+'% of your $'+goal.toLocaleString()+'/mo goal'+(pipe?' · pipeline adds $'+pipe.toLocaleString():'')+'">'+
          '<span class="biz-bar-mrr" style="width:'+Math.min(100, mrr/goal*100)+'%"></span>'+
          (pipe ? '<span class="biz-bar-pipe" style="width:'+Math.max(0, Math.min(100-mrr/goal*100, pipe/goal*100))+'%"></span>' : '')+
        '</div><div class="biz-goal-k">'+Math.round(mrr/goal*100)+'% of '+money(goal)+'</div>' : '')+
      '</div>'+
      '<div class="biz-months" title="Collected per month">'+
        '<div class="biz-mbars">'+months.map(function(m, i){
          return '<div class="biz-mcol'+(i===5?' is-now':'')+'" title="'+m.label+': $'+m.v.toLocaleString()+'"><div class="biz-mbar-wrap"><div class="biz-mbar" style="height:'+Math.max(m.v?4:0, m.v/maxV*100)+'%"></div></div><span>'+m.label+'</span></div>';
        }).join('')+'</div>'+
      '</div>'+
      '<div class="biz-side">'+
        '<div class="biz-mini" data-action="goToClients"><span class="biz-mini-v">'+active.length+'</span><span class="biz-mini-k">clients</span></div>'+
        '<div class="biz-mini" data-action="goToLeads"><span class="biz-mini-v">'+money(pipe)+'</span><span class="biz-mini-k">pipeline</span></div>'+
        '<div class="biz-mini" data-action="goToDeadlines"><span class="biz-mini-v'+(due.length?' is-warn':'')+'">'+due.length+'</span><span class="biz-mini-k">due this week</span></div>'+
      '</div>'+
    '</div>'+
  '</div>';
}
function renderCalendarMiniPanel(){
  const upcoming = buildUpcomingList(14);
  if(!upcoming.length) return '<div class="section"><div class="card cal-mini-empty"><span class="kpi-sub">&#128197; Nothing coming up in the next two weeks</span><button class="btn btn-ghost btn-sm" data-action="nav" data-view="calendar">Open calendar &rarr;</button></div></div>';
  return '<div class="section"><div class="card">'+
    '<div class="task-list">'+upcoming.slice(0,6).map(renderUpcomingRow).join('')+'</div>'+
    '<button class="btn btn-ghost btn-sm" data-action="nav" data-view="calendar" style="margin-top:auto;padding-top:12px;">&#128197; Open Calendar</button>'+
  '</div></div>';
}
function renderTodayTasksPanel(){
  const todayTasks = state.tasks.items.filter(function(t){ return t.status==='today'; });
  const doneToday = state.tasks.items.filter(function(t){ return t.status==='done' && t.completedAt===todayStr(); });
  const backlog = state.tasks.items.filter(function(t){ return t.status==='backlog'; });
  const totalToday = todayTasks.length + doneToday.length;
  const isEmpty = totalToday === 0;
  const formOpen = !!ui.forms.quickAddToday;
  const mode = ui.quickAddMode==='new' ? 'new' : 'backlog';

  const addForm = '<div class="card" style="margin-bottom:14px;max-width:480px;margin-left:auto;margin-right:auto;">'+
    '<div class="subtabs" style="justify-content:center;margin-bottom:14px;">'+
      '<div class="subtab '+(mode==='backlog'?'active':'')+'" data-action="setQuickAddMode" data-mode="backlog">From Backlog'+(backlog.length?' ('+backlog.length+')':'')+'</div>'+
      '<div class="subtab '+(mode==='new'?'active':'')+'" data-action="setQuickAddMode" data-mode="new">New Task</div>'+
    '</div>'+
    (mode==='new' ? (
      '<div class="row" style="justify-content:center;"><input class="input" id="quickTaskInput" placeholder="What needs to happen today?" style="flex:1;min-width:180px;"><button class="btn btn-good btn-sm" data-action="quickAddToday">Create</button></div>'
    ) : (
      backlog.length ? '<div class="task-list">'+backlog.map(function(t){
        return '<div class="task-item-v2" data-action="pullSpecificFromBacklog" data-id="'+t.id+'" style="cursor:pointer;">'+
          '<div class="task-title-row">'+priorityTag(t.priority)+'<span class="task-title">'+escapeHtml(t.title)+'</span></div>'+
          '<button class="mini-move mini-move-today" data-action="pullSpecificFromBacklog" data-id="'+t.id+'" style="margin-left:auto;">+ Today</button>'+
        '</div>';
      }).join('')+'</div>' : '<div class="empty">Backlog is empty — switch to New Task.</div>'
    ))+
  '</div>';

  const currentTaskRow = '<div style="margin-bottom:16px;">'+renderCurrentTaskCard()+'</div>';

  if(isEmpty){
    return '<div class="section">'+
      currentTaskRow+
      '<div class="card" style="text-align:center;padding:'+(formOpen?'24px':'44px')+' 20px;">'+
        (formOpen ? '' : '<div class="kpi-sub" style="margin-bottom:16px;">Nothing queued for today yet.</div>')+
        (formOpen ? addForm : '<button class="btn btn-good" style="font-size:16px;padding:16px 30px;" data-action="toggleForm" data-form="quickAddToday">+ Add Tasks for Today</button>')+
        (formOpen ? '<button class="btn btn-ghost btn-sm" style="margin-top:10px;" data-action="toggleForm" data-form="quickAddToday">Cancel</button>' : '')+
      '</div>'+
    '</div>';
  }

  const currentId = ui.currentTaskId;
  const remaining = todayTasks.filter(function(t){ return t.id!==currentId; }).concat(doneToday);
  return '<div class="section">'+
    renderTaskToolbar(true)+
    (carouselOn() ? '<div>'+carouselWrap(renderCurrentTaskCard(false, true)+remaining.map(function(t){ return taskCard(t); }).join(''), 'today-tasks', {w:236})+'</div>' :
    '<div class="task-card-grid">'+
      renderCurrentTaskCard(false, true)+
      (remaining.map(function(t){ return taskCard(t); }).join('') || '<div class="empty">Nothing else queued for today.</div>')+
    '</div>')+
  '</div>';
}
function renderMoodPicker(){
  return '<div class="row" style="margin:10px 0;justify-content:center;">'+
    journalTypes().map(function(m){
      const active = ui.selectedMood===m.id;
      return '<span class="chip" data-action="selectMood" data-mood="'+m.id+'" style="'+(active?'background:'+m.color+';border-color:'+m.color+';color:#06231a;':'')+'">'+m.emoji+' '+m.label+'</span>';
    }).join('')+
  '</div>'+
  renderJournalPhotoAttachHtml();
}
function renderJournalPhotoAttachHtml(){
  const photos = arr(ui.journalDraftPhotos);
  return '<div class="row" style="margin-top:6px;justify-content:center;flex-wrap:wrap;gap:8px;">'+
    '<button class="btn btn-ghost btn-sm" data-action="triggerJournalPhotoInput">&#128247; Add Photo</button>'+
    photos.map(function(src, idx){
      return '<span style="position:relative;display:inline-block;">'+
        '<img src="'+escapeHtml(blobUrl(src))+'" class="journal-photo-thumb" style="width:36px;height:36px;">'+
        '<button class="btn btn-ghost btn-sm" data-action="removeJournalDraftPhoto" data-idx="'+idx+'" title="Remove" style="position:absolute;top:-9px;right:-9px;padding:0 4px;border-radius:50%;background:var(--panel);line-height:16px;">&times;</button>'+
      '</span>';
    }).join('')+
  '</div>';
}
function triggerJournalPhotoInput(){ const el=document.getElementById('journalPhotoInput'); if(el) el.click(); }
function removeJournalDraftPhoto(idx){ ui.journalDraftPhotos.splice(Number(idx),1); renderView(); }
// Photos attach to whichever journal composer/editor is open. They're stored in the blob
// store (IndexedDB) and the entry keeps "idb:" references.
async function handleJournalPhotoFiles(files){
  const list = Array.prototype.filter.call(files||[], function(f){ return f && f.type && f.type.indexOf('image/')===0; });
  for(const file of list){
    const ref = await storeImageFile(file);
    ui.journalDraftPhotos.push(ref);
  }
  if(list.length){ playTick(); renderView(); }
}
// Paste an image (e.g. a screenshot copied with Cmd+Ctrl+Shift+4) straight into any journal
// text box. Plain-text pastes behave normally.
const JOURNAL_TEXT_IDS = ['quickJournalText','journalPageText','quickJournalModalText','editJournalText'];
document.addEventListener('paste', function(e){
  const t = e.target;
  if(!t || JOURNAL_TEXT_IDS.indexOf(t.id)<0) return;
  const imgs = imageFilesFromTransfer(e.clipboardData);
  if(!imgs.length) return;
  e.preventDefault();
  handleJournalPhotoFiles(imgs);
});
// Drag images (including macOS screenshots dragged off the desktop) onto a journal card.
document.addEventListener('dragover', function(e){
  if(!transferHasFiles(e.dataTransfer)) return;
  // Never let a dropped file navigate the app window away from Operator.
  e.preventDefault();
  const zone = e.target.closest && e.target.closest('[data-photo-drop]');
  document.querySelectorAll('.photo-drop-hover').forEach(function(z){ if(z!==zone) z.classList.remove('photo-drop-hover'); });
  if(zone){ zone.classList.add('photo-drop-hover'); e.dataTransfer.dropEffect = 'copy'; }
  else e.dataTransfer.dropEffect = 'none';
});
document.addEventListener('dragleave', function(e){
  const zone = e.target.closest && e.target.closest('[data-photo-drop]');
  if(zone && !zone.contains(e.relatedTarget)) zone.classList.remove('photo-drop-hover');
});
document.addEventListener('drop', function(e){
  if(!transferHasFiles(e.dataTransfer)) return;
  e.preventDefault();
  document.querySelectorAll('.photo-drop-hover').forEach(function(z){ z.classList.remove('photo-drop-hover'); });
  const zone = e.target.closest && e.target.closest('[data-photo-drop]');
  if(!zone) return;
  const kind = zone.getAttribute('data-photo-drop');
  const files = Array.prototype.slice.call(e.dataTransfer.files||[]);
  if(kind==='journal') handleJournalPhotoFiles(imageFilesFromTransfer(e.dataTransfer));
  else if(typeof ACTIONS['drop:'+kind]==='function') ACTIONS['drop:'+kind](zone, files, e);
});
function renderJournalPanel(){
  const todaysJournalCount = state.journal.entries.filter(function(e){ return e.date===todayStr(); }).length;
  return '<div class="section"><div class="card journal-quick-card" data-photo-drop="journal" style="text-align:center;">'+
    '<div class="kpi-label" style="margin-bottom:8px;">Quick Journal'+tip('Paste or drop images in too.')+'</div>'+
    '<textarea class="input" id="quickJournalText" placeholder="Anything on your mind — a win, a worry, an idea…" style="width:100%;height:90px;flex-shrink:0;text-align:left;resize:none;">'+escapeHtml(ui.journalDraftText||'')+'</textarea>'+
    renderJournalPhotoThumbsRow()+
    '<div class="journal-compose-actions">'+
      '<div class="row" style="gap:6px;">'+renderJournalMoodChipsInline()+'<button class="btn btn-ghost btn-sm" data-action="triggerJournalPhotoInput" title="Add photo">&#128247;</button></div>'+
      '<button class="btn btn-primary" data-action="addJournal" data-target="quickJournalText">Save to Journal</button>'+
    '</div>'+
    (todaysJournalCount>0 ? '<div class="row" style="justify-content:center;margin-top:10px;"><button class="btn btn-ghost btn-sm" data-action="nav" data-view="personal" data-tab="journal">'+todaysJournalCount+' entr'+(todaysJournalCount===1?'y':'ies')+' today</button></div>' : '')+
  '</div></div>';
}
function deepWorkStatInnerHtml(mins){
  return '<div class="stat-chip-label">Deep work</div><div class="stat-chip-value">'+fmtHours(mins)+'</div><div class="kpi-sub">'+fmtDurationLabel(mins)+'</div>';
}
function deepWorkChipHtml(idAttr){
  const target = state.standards.deepWorkTargetMinutes || 180;
  const mins = deepWorkMinutesTodayLive();
  const pct = mins/target;
  return '<span class="chip chip-auto js-deepwork-chip" id="'+idAttr+'" '+(pct>=1?'style="background:var(--good);border-color:var(--good);color:#062230;"':'style="border-color:var(--good);color:var(--good);"')+' title="Auto-tracked from Focus — log time there to change it">'+fmtHours(mins)+' / '+fmtHours(target)+' deep work ('+fmtDurationLabel(mins)+')</span>';
}
function trainedChipHtml(){
  const done = trainedDoneFor(todayStr());
  return '<span class="chip chip-auto" '+(done?'style="background:var(--good);border-color:var(--good);color:#062230;"':'style="border-color:var(--good);color:var(--good);"')+' title="Auto-tracked — log a workout on the Fitness page to satisfy this" data-action="nav" data-view="personal" data-tab="fitness">&#127939; '+(done?'Trained today':'Trained')+'</span>';
}
function ongoingStandardTasksHtml(){
  const tasks = arr(state.tasks.items).filter(function(t){ return t.ongoing && t.includeInStandard && t.status!=='done'; });
  return tasks.map(function(t){
    const done = isOngoingDoneToday(t);
    return '<span class="chip '+(done?'active':'')+'" data-action="'+(done?'undoTask':'completeTask')+'" data-id="'+t.id+'" title="Ongoing standard task — knocks it out for today only">'+escapeHtml(t.title)+'</span>';
  }).join('');
}
function renderStandardsWidget(){
  const manualItems = arr(state.standards.items);
  const rec = getStandardRec(todayStr());
  return '<div class="section"><div class="section-title" style="justify-content:center;">Today\'s Standard</div>'+
    '<div class="card" style="text-align:center;"><div class="row" style="justify-content:center;">'+
      deepWorkChipHtml('stdDeepWorkChip2')+
      trainedChipHtml()+
      manualItems.map(function(it){ return '<span class="chip '+(rec.doneIds.indexOf(it.id)>=0?'active':'')+'" data-action="toggleStandard" data-id="'+it.id+'">'+escapeHtml(it.label)+'</span>'; }).join('')+
      ongoingStandardTasksHtml()+
    '</div>'+
    '</div>'+
    yesterdayStandardsFixupHtml()+
    '</div>';
}
// The mode buttons live in the hero now (hold to start) — this panel only shows a running mode.
function renderFocusMiniPanel(){
  if(state.modes.active) return '<div class="section">'+renderLockInCard()+'</div>';
  return '';
}
function renderRemindersMiniPanel(){
  const upcoming = arr(state.focus.reminders).slice().sort(function(a,b){ return (a.date+String(a.time||'')).localeCompare(b.date+String(b.time||'')); });
  const next = upcoming[0];
  return '<div class="section"><div class="card" style="text-align:center;">'+
    '<div class="kpi-label" style="margin-bottom:8px;letter-spacing:.05em;text-transform:uppercase;font-size:10.5px;">Reminders</div>'+
    (next ? '<div style="font-size:14.5px;color:var(--text);font-weight:600;line-height:1.3;">'+escapeHtml(next.label)+'</div>'+(upcoming.length>1?'<div class="kpi-sub" style="margin-top:3px;">+'+(upcoming.length-1)+' more pending</div>':'') : '<div class="kpi-sub">Nothing pending.</div>')+
    '<div class="row" style="gap:6px;margin-top:12px;justify-content:center;">'+
      '<input class="input" id="miniReminderLabel" placeholder="Remind me to…" style="flex:1;max-width:260px;">'+
      '<button class="btn btn-primary btn-sm" data-action="addMiniReminder">Add</button>'+
    '</div>'+
  '</div></div>';
}
function addMiniReminder(){
  const labelEl = document.getElementById('miniReminderLabel');
  const label = labelEl ? labelEl.value.trim() : '';
  if(!label) return;
  state.focus.reminders.push({id:uid(), label:label, date:todayStr(), time:null});
  labelEl.value = '';
  playPositive();
  persist('focus'); renderView();
}
const PANEL_RENDERERS = {
  personalStats: renderPersonalStatsPanel,
  business: renderBusinessPanel,
  goals: renderGoalsPanel,
  journal: renderJournalPanel,
  focusMini: renderFocusMiniPanel,
  calendarMini: renderCalendarMiniPanel,
  tasks: renderTodayTasksPanel,
  clientHub: function(){ return renderClientHubPanel(); },
  vision: function(){ return renderVisionPanel(); },
  agenda: renderAgendaPanel,
  week: renderProgressPanel,
  heatmap: function(){ return ''; },
  why: renderWhyPanel
};
function clientOpsDeliverableRow(clientId, d){
  return recurringDeliverableRowHtml(clientId, d, false);
}
function clientDeliverableReadOnlyRow(clientId, d){
  return recurringDeliverableRowHtml(clientId, d, true);
}
function clientHealthColor(c){
  const level = clientHealthStatus(c).level;
  return level==='green' ? 'var(--good)' : level==='yellow' ? 'var(--accent)' : 'var(--danger)';
}
// Shared, minimal touch control — used everywhere a client's weekly touch count can be
// logged (Business Overview, the locked-in Today dashboard, the Clients tab, the client modal)
// so the control looks and behaves identically no matter where it's used.
function clientTouchControlHtml(c){
  const touches = manualTouchesThisWeek(c);
  return '<div class="row" style="align-items:center;gap:4px;">'+
    (touches>0 ? '<button class="icon-btn-sm" data-action="undoClientTouch" data-id="'+c.id+'" title="Undo last touch">&#8630;</button>' : '')+
    '<button class="client-touch-btn" data-action="logClientTouch" data-id="'+c.id+'" title="'+touches+' touch'+(touches===1?'':'es')+' logged this week — tap to log one">&#128075;<span>'+touches+'</span></button>'+
  '</div>';
}
function renderClientHealthCard(c){
  const recurring = arr(c.deliverables).filter(function(d){ return d.recurring; });
  return '<div class="card client-health-card" style="border-left-color:'+clientHealthColor(c)+';">'+
    '<div class="row" style="justify-content:space-between;align-items:center;">'+
      '<div class="task-card-title" style="font-size:15px;cursor:pointer;" data-action="openClientModal" data-id="'+c.id+'">'+escapeHtml(c.business||c.name||'Client')+'</div>'+
      clientHealthTagHtml(c)+
    '</div>'+
    (recurring.length ? '<div class="client-health-delivs">'+recurring.map(function(d){
      const weekCount = deliverableWeekCount(d);
      const weekTarget = deliverableWeekNeed(d);
      const pace = deliverablePaceStatus(d);
      const paceColor = pace==='good' ? 'var(--good)' : pace==='warn' ? 'var(--accent)' : 'var(--danger)';
      return '<div class="row" style="justify-content:space-between;align-items:center;padding:4px 0;">'+
        '<span class="kpi-sub" style="color:var(--text);">'+escapeHtml(d.title)+'</span>'+
        '<span style="font-weight:700;color:'+paceColor+';">'+weekCount+'/'+weekTarget+'<span class="kpi-sub" style="font-weight:400;"> this week &middot; '+paceWord(pace)+'</span></span>'+
      '</div>';
    }).join('')+'</div>' : '<div class="kpi-sub" style="margin-top:2px;">No weekly deliverables — assign a package on their card.</div>')+
    '<div class="row client-touch-row" style="justify-content:flex-end;align-items:center;">'+
      clientTouchControlHtml(c)+
    '</div>'+
  '</div>';
}
function renderClientOpsPanel(){
  const clients = arr(state.business.clients).filter(function(c){ return c.status==='active'; });
  if(!clients.length) return '';
  return '<div class="section"><div class="section-title">Client Health</div>'+
    '<div class="client-ops-grid">'+clients.map(function(c){ return renderClientHealthCard(c); }).join('')+'</div>'+
  '</div>';
}

