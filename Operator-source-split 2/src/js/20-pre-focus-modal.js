// ============ PRE-FOCUS MODAL ============
function renderPreFocusNextTaskCard(){
  const st = ui.stagedTaskId ? state.tasks.items.find(function(x){ return x.id===ui.stagedTaskId; }) : null;
  if(st){
    return '<div class="task-card current-task-card staged-task-card" style="margin-bottom:14px;align-items:center;justify-content:center;text-align:center;padding:12px 16px;">'+
      '<div class="ctb-label">&#128204; This starts the moment you lock in</div>'+
      '<div class="task-card-title" style="font-size:16px;margin-top:4px;">'+escapeHtml(st.title)+'</div>'+
      '<button class="btn btn-ghost btn-sm" style="margin-top:8px;" data-action="clearStagedTaskFromPreFocus">Not this one — clear it</button>'+
    '</div>';
  }
  if(ui.preFocusPicking){
    const q = (ui.preFocusPickSearch||'').trim().toLowerCase();
    const candidates = state.tasks.items.filter(function(t){
      if(t.status!=='today' && t.status!=='backlog') return false;
      if(q && t.title.toLowerCase().indexOf(q)<0) return false;
      return true;
    }).slice(0,30);
    return '<div class="task-card current-task-card" style="margin-bottom:14px;padding:12px 14px;">'+
      '<div class="ctb-label" style="margin-bottom:6px;">Pick a Task</div>'+
      '<input class="input" id="preFocusPickSearchInput" placeholder="Search tasks…" value="'+escapeHtml(ui.preFocusPickSearch||'')+'" style="width:100%;margin-bottom:8px;" autofocus>'+
      '<div class="task-list" style="max-height:220px;overflow-y:auto;" id="preFocusPickResults">'+preFocusPickResultsHtml(candidates)+'</div>'+
      '<button class="btn btn-ghost btn-sm" style="margin-top:8px;" data-action="cancelPreFocusPick">Cancel</button>'+
    '</div>';
  }
  return '<div class="task-card current-task-card" style="margin-bottom:14px;align-items:center;justify-content:center;text-align:center;padding:12px 16px;">'+
    '<div class="ctb-label">Next Task</div>'+
    '<div class="ctb-empty">Nothing lined up — nothing will start automatically.</div>'+
    '<div class="row" style="margin-top:8px;justify-content:center;gap:8px;">'+
      '<button class="btn btn-ghost btn-sm" data-action="openPreFocusPick">Pick Existing</button>'+
      '<button class="btn btn-ghost btn-sm" data-action="addTaskFromPreFocus">+ New Task</button>'+
    '</div>'+
  '</div>';
}
function preFocusPickResultsHtml(candidates){
  return candidates.map(function(t){ return '<div class="task-item-v2" data-action="stageExistingTaskFromPreFocus" data-id="'+t.id+'" style="cursor:pointer;padding:6px 8px;">'+priorityTag(t.priority)+'<span class="task-title" style="flex:1;font-size:13px;">'+escapeHtml(t.title)+'</span>'+(t.status==='backlog'?'<span class="kpi-sub">backlog</span>':'')+'</div>'; }).join('') || '<div class="empty" style="padding:10px;">Nothing matches.</div>';
}
function updatePreFocusPickResults(){
  const q = (ui.preFocusPickSearch||'').trim().toLowerCase();
  const candidates = state.tasks.items.filter(function(t){
    if(t.status!=='today' && t.status!=='backlog') return false;
    if(q && t.title.toLowerCase().indexOf(q)<0) return false;
    return true;
  }).slice(0,30);
  const el = document.getElementById('preFocusPickResults');
  if(el) el.innerHTML = preFocusPickResultsHtml(candidates);
}
function openPreFocusPick(){ ui.preFocusPicking = true; ui.preFocusPickSearch=''; renderPreFocusModalInto(); }
function cancelPreFocusPick(){ ui.preFocusPicking = false; renderPreFocusModalInto(); }
function stageExistingTaskFromPreFocus(id){ ui.stagedTaskId = id; ui.preFocusPicking = false; renderPreFocusModalInto(); }
function renderPreFocusModal(){
  const step = ui.preFocusStep || 'before';
  if(step==='why') return renderPreFocusWhyStep();
  const prepItems = arr(state.focus.prepItems);
  const hasNextTask = !!ui.stagedTaskId;
  return '<div class="section-title" style="margin-bottom:8px;justify-content:center;">Before You Start</div>'+
    renderPreFocusNextTaskCard()+
    '<ul class="prep-list">'+(prepItems.map(function(item){ return '<li>'+escapeHtml(item.label)+'</li>'; }).join('') || '<li class="kpi-sub">Add reminders in Settings.</li>')+'</ul>'+
    (!hasNextTask ? '<div class="kpi-sub" style="text-align:center;margin-top:10px;color:var(--danger);">Pick or add a next task to continue.</div>' : '')+
    '<div class="row" style="margin-top:22px;justify-content:flex-end;">'+
      '<button class="btn btn-ghost" data-action="cancelPreFocus">Cancel</button>'+
      '<button class="btn btn-primary" data-action="preFocusGoToWhy" '+(hasNextTask?'':'disabled')+'>Next &rarr;</button>'+
    '</div>';
}
function renderPreFocusWhyStep(){
  const toward = arr(state.focus.motivations && state.focus.motivations.toward);
  const away = arr(state.focus.motivations && state.focus.motivations.away);
  return '<div class="section-title" style="margin-bottom:14px;justify-content:center;">Why You\'re Doing This</div>'+
    '<div class="grid grid-2">'+
      '<div><div class="kind-label" style="color:var(--good);">Getting</div>'+(toward.map(function(m){ return '<div class="motiv-toward">+ '+escapeHtml(m.text)+'</div>'; }).join('') || '<div class="kpi-sub">Add these in Settings.</div>')+'</div>'+
      '<div><div class="kind-label" style="color:var(--danger);">Avoiding</div>'+(away.map(function(m){ return '<div class="motiv-away">&minus; '+escapeHtml(m.text)+'</div>'; }).join('') || '<div class="kpi-sub">Add these in Settings.</div>')+'</div>'+
    '</div>'+
    (function(){ const me = nextMeetingEventToday(); return me ? '<div class="row" style="justify-content:center;margin-top:14px;"><button class="btn btn-good btn-sm" data-action="joinCall" data-url="'+escapeHtml(me.meetingLink)+'">&#128222; Join Call — '+escapeHtml(me.title)+(me.time?' at '+fmt12Hour(me.time):'')+'</button></div>' : ''; })()+
    '<div class="row" style="margin-top:22px;justify-content:space-between;">'+
      '<button class="btn btn-ghost" data-action="preFocusBackToStart">&larr; Back</button>'+
      '<button class="btn btn-primary" data-action="confirmStartFocus">&#128274; Start '+(ui.pendingFocusMinutes?fmtDurationLabel(ui.pendingFocusMinutes):'Session')+'</button>'+
    '</div>';
}
function preFocusGoToWhy(){ if(!ui.stagedTaskId) return; ui.preFocusStep='why'; renderPreFocusModalInto(); }
function preFocusBackToStart(){ ui.preFocusStep='before'; renderPreFocusModalInto(); }
function renderPreFocusModalInto(){ const el=document.getElementById('preFocusContent'); if(el) morphInto(el, renderPreFocusModal(), {form:true}); }
function closePreFocusModal(){ document.getElementById('preFocusOverlay').classList.add('hidden'); }
function clearStagedTaskFromPreFocus(){ ui.stagedTaskId = null; ui.preFocusPicking = false; renderPreFocusModalInto(); }
function addTaskFromPreFocus(){ closePreFocusModal(); openAddTaskModal(); }
function confirmStartFocus(){
  const minutes = ui.pendingFocusMinutes;
  closePreFocusModal();
  startFocus(minutes);
  playStartChime();
}
function renderLockInCard(){
  const active = state.modes.active;
  if(active){
    return '<div class="card" style="text-align:center;padding:28px 20px;width:100%;display:flex;flex-direction:column;justify-content:center;min-height:220px;">'+renderActiveModeHero()+'</div>';
  }
  const meetingEvent = nextMeetingEventToday();
  return '<div class="card" style="text-align:center;padding:28px 20px;width:100%;display:flex;flex-direction:column;justify-content:center;align-items:center;min-height:220px;">'+
    (meetingEvent ? '<button class="btn btn-good btn-sm" style="margin-bottom:12px;" data-action="joinCall" data-url="'+escapeHtml(meetingEvent.meetingLink)+'">&#128222; Join Call — '+escapeHtml(meetingEvent.title)+(meetingEvent.time?' at '+fmt12Hour(meetingEvent.time):'')+'</button>' : '')+
    '<button class="btn btn-good lock-in-btn" data-action="openLockInChooser">&#128274; LOCK IN</button>'+
    '<div class="mode-btn-row">'+
      '<button class="btn shooting-btn" data-action="startMode" data-type="shooting">&#127916; SHOOTING</button>'+
      '<button class="btn training-btn" data-action="startMode" data-type="training">&#128218; TRAINING</button>'+
    '</div>'+
    '<button class="btn offtime-btn" style="margin-top:12px;" data-action="startMode" data-type="offtime">&#127937; OFF-TIME MODE</button>'+
  '</div>';
}
function modeIcon(type){ return type==='break' ? '☕' : type==='shooting' ? '\u{1F3AC}' : type==='training' ? '\u{1F4DA}' : type==='offtime' && state.modes.active && state.modes.active.sleep ? '\u{1F319}' : '\u{1F3C1}'; }
function renderActiveModeHero(){
  const active = state.modes.active;
  const elapsed = Date.now() - active.startedAt;
  const label = MODE_LABELS[active.type] || 'Mode';
  const color = modeColor(active.type);
  return '<div class="hero-card focus-active-glow" style="border-color:'+color+';box-shadow:none;">'+
    '<div class="kpi-label" style="color:'+color+';">'+modeIcon(active.type)+' '+label.toUpperCase()+'</div>'+
    '<div class="hero-num hero-num-lg" id="modeElapsed" style="color:'+color+';">'+formatElapsed(elapsed)+'</div>'+
    (active.note ? '<div class="kpi-sub">'+escapeHtml(active.note)+'</div>' : '')+
    '<button class="btn btn-primary" style="margin-top:12px;" data-action="endMode">End '+label+'</button>'+
  '</div>';
}
function startMode(type, extra){
  if(state.focus.activeSession) return;
  if(state.modes.active && !state.modes.active.linkedFocus) finishActiveMode(true);
  state.modes.active = Object.assign({type:type, startedAt:Date.now()}, extra||{});
  playRestSound();
  persist('modes'); renderView();
}
function finishActiveMode(silent){
  const active = state.modes.active; if(!active) return;
  const endedAt = Date.now();
  const minutes = Math.max(1, Math.round((endedAt-active.startedAt)/60000));
  state.modes.history.push({id:uid(), type:active.type, date:todayStr(new Date(active.startedAt)), startedAt:active.startedAt, endedAt:endedAt, minutes:minutes, note:active.note||'', sleep:!!active.sleep, eventId:active.eventId||null});
  state.modes.active = null;
  state.modes.lastEndedAt = endedAt;
  if(!silent) playStopSound();
  persist('modes');
}
function endMode(){
  if(!state.modes.active) return;
  finishActiveMode(false);
  renderView();
}
function modeMinutesFor(dateStr, type){
  if(RC){
    const idx = memo('modeIdx', function(){
      const m = {};
      state.modes.history.forEach(function(h){ const d = m[h.date] || (m[h.date] = {'*':0}); d[h.type] = (d[h.type]||0) + (h.minutes||0); d['*'] += (h.minutes||0); });
      return m;
    });
    const d = idx[dateStr]; return d ? (d[type||'*']||0) : 0;
  }
  return state.modes.history.filter(function(m){ return m.date===dateStr && (!type || m.type===type); }).reduce(function(a,m){ return a+m.minutes; },0);
}

