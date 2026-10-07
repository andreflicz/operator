// ============ CALENDAR ============
function categoryById(id){ return arr(state.calendar.categories).find(function(c){ return c.id===id; }); }
function calDayInfo(dateStr){
  const events = state.calendar.events.filter(function(e){ return e.date===dateStr; });
  const deadlines = state.tasks.items.filter(function(t){ return t.deadline===dateStr; });
  return {events:events, deadlines:deadlines};
}
function nextMeetingEventToday(){
  const events = arr(state.calendar.events).filter(function(e){ return e.date===todayStr() && e.meetingLink; });
  if(!events.length) return null;
  const nowHm = nowHM();
  const upcoming = events.filter(function(e){ return !e.time || e.time>=nowHm; }).sort(function(a,b){ return (a.time||'').localeCompare(b.time||''); });
  return upcoming[0] || events.slice().sort(function(a,b){ return (a.time||'').localeCompare(b.time||''); })[0];
}
function renderCalendar(){
  const y = ui.calendarYear, m = ui.calendarMonth;
  const startDow = new Date(y, m, 1).getDay();
  const daysInMonth = new Date(y, m+1, 0).getDate();
  const monthLabel = new Date(y, m, 1).toLocaleDateString(undefined,{month:'long', year:'numeric'});
  const selected = ui.calendarSelectedDate || todayStr();
  const categories = arr(state.calendar.categories);

  let cells = '';
  for(let i=0;i<startDow;i++) cells += '<div class="cal-cell cal-empty"></div>';
  for(let d=1; d<=daysInMonth; d++){
    const dateStr = y+'-'+pad2(m+1)+'-'+pad2(d);
    const info = calDayInfo(dateStr);
    const isToday = dateStr===todayStr();
    const isSelected = dateStr===selected;
    const worked = dayVisualStatus(dateStr)==='worked';
    const catIds = Array.from(new Set(info.events.map(function(e){return e.categoryId;})));
    const dots = (worked ? '<span class="cal-dot" style="background:#3FBE8E;"></span>' : '')+
      catIds.map(function(cid){ const cat=categoryById(cid); return '<span class="cal-dot" style="background:'+(cat?cat.color:'#8A90A2')+';"></span>'; }).join('')+
      (info.deadlines.length ? '<span class="cal-dot" style="background:var(--danger);"></span>' : '');
    cells += '<div class="cal-cell '+(isToday?'cal-today':'')+' '+(isSelected?'cal-selected':'')+'" data-action="selectCalDay" data-date="'+dateStr+'"><div class="cal-daynum">'+d+'</div><div class="cal-dots">'+dots+'</div></div>';
  }

  const selInfo = calDayInfo(selected);
  const selParts = selected.split('-').map(Number);
  const dayLabel = new Date(selParts[0],selParts[1]-1,selParts[2]).toLocaleDateString(undefined,{weekday:'long', month:'long', day:'numeric'});
  const sortedEvents = selInfo.events.slice().sort(function(a,b){ return (a.time||'').localeCompare(b.time||''); });
  const upcoming = buildUpcomingList(14);

  return '<div class="view-header"><div>'+businessNameTagHtml()+'<div class="view-title">Calendar</div><div class="view-sub">Work blocks, calls, and task deadlines in one place.</div></div>'+
    '<div class="row" style="gap:8px;">'+
    '<button class="btn btn-ghost btn-sm" data-action="goToAlarmSettings" title="Alarm settings" style="opacity:.65;">&#9200; Alarms</button>'+
    '<button class="btn" data-action="openUpcomingPopover">&#128197; Upcoming ('+upcoming.length+')</button>'+
    '</div>'+
  '</div>'+
  '<div class="section" style="max-width:640px;margin:0 auto 20px;text-align:center;">'+
    '<div id="calendarBigClock" class="cal-big-clock"></div>'+
    '<div id="calendarBigClockDate" class="kpi-sub" style="margin-top:2px;"></div>'+
  '</div>'+
  renderAllDeadlinesSection()+
  '<div class="card section" style="max-width:640px;margin:14px auto 0;">'+
    '<div class="row" style="justify-content:space-between;margin-bottom:12px;">'+
      '<button class="btn btn-ghost btn-sm" data-action="calPrevMonth">&larr;</button>'+
      '<div style="font-family:var(--font-display);font-weight:600;font-size:14px;">'+monthLabel+'</div>'+
      '<button class="btn btn-ghost btn-sm" data-action="calNextMonth">&rarr;</button>'+
    '</div>'+
    '<div class="cal-grid" style="margin-bottom:4px;">'+DAY_LETTERS.map(function(l){ return '<div class="cal-heading">'+l+'</div>'; }).join('')+'</div>'+
    '<div class="cal-grid">'+cells+'</div>'+
    '<div class="row" style="margin-top:12px;justify-content:center;">'+
      '<button class="btn btn-ghost btn-sm" data-action="toggleCalLegend">'+(ui.showCalLegend?'Hide Legend':'Show Legend')+'</button>'+
    '</div>'+
    (ui.showCalLegend ? (
      '<div class="row" style="margin-top:8px;justify-content:center;">'+
        '<span class="kpi-sub"><span class="cal-dot" style="background:#3FBE8E;display:inline-block;margin-right:3px;"></span>Worked</span>'+
        categories.map(function(c){ return '<span class="kpi-sub"><span class="cal-dot" style="background:'+c.color+';display:inline-block;margin-right:3px;"></span>'+escapeHtml(c.label)+'</span>'; }).join(' ')+
        ' <span class="kpi-sub"><span class="cal-dot" style="background:var(--danger);display:inline-block;margin-right:3px;"></span>Deadline</span>'+
      '</div>'
    ) : '')+
  '</div>'+
  '<div class="section" style="max-width:680px;margin:20px auto 0;"><div class="section-title">'+dayLabel+'<button class="btn btn-primary btn-sm" data-action="openCalEventModal">+ Add Event</button></div>'+
    '<div class="task-list">'+
      selInfo.deadlines.map(function(t){ return '<div class="task-item-v2 cal-item-clickable" data-action="openCalItem" data-kind="deadline" data-id="'+t.id+'" title="Open to edit or delete"><span class="tag" style="background:var(--danger-dim);color:#ffb3b8;">Deadline</span><div class="task-title" style="flex:1;'+(t.status==='done'?'text-decoration:line-through;opacity:.6;':'')+'">'+escapeHtml(t.title)+'</div>'+(t.isVideoIdea?'<span class="kpi-sub">&#127916; video idea</span>':'')+'</div>'; }).join('')+
      sortedEvents.map(function(e){ const cat=categoryById(e.categoryId); return '<div class="task-item-v2 cal-item-clickable" data-action="openCalItem" data-kind="event" data-id="'+e.id+'" title="Open to edit or delete">'+(e.time?'<div style="font-family:var(--font-display);font-weight:700;width:70px;">'+fmt12Hour(e.time)+'</div>':'')+'<span class="tag" style="background:'+(cat?cat.color:'#8A90A2')+'22;color:'+(cat?cat.color:'#8A90A2')+';">'+(e.isShoot?'&#127916; ':'')+(cat?escapeHtml(cat.label):'Event')+'</span>'+(e.linkedClient?clientTagHtml(e.linkedClient):'')+'<div class="task-title" style="flex:1;">'+escapeHtml(e.title)+(e.location?'<div class="kpi-sub">&#128205; '+escapeHtml(e.location)+'</div>':'')+(arr(e.taskIds).length?'<div class="kpi-sub">'+arr(e.taskIds).length+' task'+(arr(e.taskIds).length===1?'':'s')+'</div>':'')+'</div>'+(e.isShoot && e.date===todayStr() && !(state.modes.active && state.modes.active.type==='shooting') ? '<button class="btn btn-sm shooting-btn-sm" data-action="startShootFromEvent" data-id="'+e.id+'">&#127916; Start shoot</button>' : '')+(e.meetingLink?'<button class="btn btn-good btn-sm" data-action="joinCall" data-url="'+escapeHtml(e.meetingLink)+'">&#128222; Join Call</button>':'')+'<button class="btn btn-ghost btn-sm" data-action="openCalEventModal" data-id="'+e.id+'">Edit</button>'+deleteBtn('calevent', e.id)+'</div>'; }).join('')+
      ((selInfo.deadlines.length+selInfo.events.length)===0 ? '<div class="empty">Nothing scheduled this day.</div>' : '')+
    '</div>'+
  '</div>'+
  renderRemindersCard();
}
function calPrevMonth(){ ui.calendarMonth--; if(ui.calendarMonth<0){ ui.calendarMonth=11; ui.calendarYear--; } renderView(); }
function calNextMonth(){ ui.calendarMonth++; if(ui.calendarMonth>11){ ui.calendarMonth=0; ui.calendarYear++; } renderView(); }
function selectCalDay(dateStr){ ui.calendarSelectedDate = dateStr; renderView(); }
function openCalEventModal(id){
  ui.editingCalEventId = id || null;
  const o = document.getElementById('calEventOverlay');
  if(!o) return;
  o.classList.remove('hidden');
  renderCalEventModalInto();
}
function closeCalEventModal(){ ui.editingCalEventId = null; const o=document.getElementById('calEventOverlay'); if(o) o.classList.add('hidden'); }
function renderCalEventModal(){
  const categories = arr(state.calendar.categories);
  const editing = ui.editingCalEventId ? state.calendar.events.find(function(x){return x.id===ui.editingCalEventId;}) : null;
  const e = editing || {date:(ui.calendarSelectedDate||todayStr()), time:'', title:'', categoryId:(categories[0]?categories[0].id:''), meetingLink:''};
  const defaultCat = categoryById(e.categoryId);
  const wantsAlarm = editing ? !!e.alarmId : !!(defaultCat && defaultCat.autoRemind);
  return '<div class="section-title" style="margin-bottom:14px;">'+(editing?'Edit Event':'Add Event')+'</div>'+
    '<div class="field"><label>Date</label><div class="row" style="gap:6px;"><input class="input" type="date" id="calEventDate" value="'+(e.date||todayStr())+'" style="width:100%;"><button class="btn btn-ghost btn-sm" data-action="openDatePicker" data-target="calEventDate">&#128197;</button></div></div>'+
    '<div class="field" style="margin-top:10px;"><label>Time (optional)</label><input class="input" type="time" id="calEventTime" value="'+(e.time||'')+'" style="width:100%;"></div>'+
    '<div class="field" style="margin-top:10px;"><label>What is it?</label><input class="input" id="calEventTitle" value="'+escapeHtml(e.title||'')+'" placeholder="Shoot with Nina, client call, etc." style="width:100%;"></div>'+
    '<div class="field" style="margin-top:10px;"><label>Category</label><select class="input" id="calEventCategory" style="width:100%;">'+categories.map(function(c){ return '<option value="'+c.id+'" '+(e.categoryId===c.id?'selected':'')+'>'+escapeHtml(c.label)+'</option>'; }).join('')+'</select></div>'+
    '<div class="field" style="margin-top:10px;"><label>Meeting link (optional)</label><input class="input" id="calEventMeetingLink" value="'+escapeHtml(e.meetingLink||'')+'" placeholder="Google Meet / Zoom URL" style="width:100%;"></div>'+
    '<div class="field" style="margin-top:10px;"><label>Link to client or lead (optional)</label><select class="input" id="calEventLinkedClient" style="width:100%;"><option value="">&mdash;</option>'+clientCheckboxOptions().filter(function(o){return o.value!=='personal'&&o.value!=='general';}).map(function(o){ return '<option value="'+o.value+'" '+(e.linkedClient===o.value?'selected':'')+'>'+escapeHtml(o.label)+'</option>'; }).join('')+'</select></div>'+
    '<div class="field" style="margin-top:10px;"><label>Location (optional)</label><input class="input" id="calEventLocation" value="'+escapeHtml(e.location||'')+'" placeholder="Address or place" style="width:100%;"></div>'+
    '<label class="row" style="margin-top:12px;font-size:12.5px;color:var(--text-dim);"><input type="checkbox" id="calEventSetAlarm" '+(wantsAlarm?'checked':'')+' style="margin-right:6px;">&#128276; Alarm at the event time (needs a time)</label>'+
    '<div class="field" style="margin-top:10px;"><label>Remind me before</label><select class="input" id="calEventRemindBefore" style="width:100%;">'+[[0,'&mdash; No extra reminder'],[10,'10 min before'],[15,'15 min before'],[30,'30 min before'],[60,'1 hour before'],[120,'2 hours before'],[1440,'1 day before']].map(function(o){ return '<option value="'+o[0]+'" '+(Number(e.remindBefore||0)===o[0]?'selected':'')+'>'+o[1]+'</option>'; }).join('')+'</select></div>'+
    '<label class="row" style="margin-top:12px;font-size:12.5px;color:var(--text-dim);"><input type="checkbox" id="calEventIsShoot" '+(e.isShoot?'checked':'')+' style="margin-right:6px;">&#127916; This is a shoot — add prep alarms</label>'+
    '<div id="calEventShootExtra" class="card" style="display:'+(e.isShoot?'block':'none')+';margin-top:8px;padding:12px 14px;">'+
      '<div class="grid grid-2">'+
        '<div class="field"><label>Start getting ready at</label><input class="input" type="time" id="calEventReadyTime" value="'+(e.readyTime||'')+'"></div>'+
        '<div class="field"><label>Travel time (minutes)</label><input class="input" type="number" min="0" step="5" id="calEventTravel" value="'+(e.travelMinutes||'')+'" placeholder="e.g. 60"></div>'+
      '</div>'+
      '<div class="kpi-sub" style="margin-top:6px;" id="calEventLeaveHint">'+(e.time && e.travelMinutes ? 'Leave alarm at '+fmt12Hour(shiftHM(e.time, -Number(e.travelMinutes)))+'.' : 'A "Leave" alarm goes off at event time minus travel time.')+'</div>'+
      '<label class="row" style="margin-top:8px;font-size:12.5px;color:var(--text-dim);"><input type="checkbox" id="calEventAutoShoot" '+(e.autoShootMode!==false?'checked':'')+' style="margin-right:6px;">Start Shooting Mode automatically at the first prep alarm (prep + travel + shoot tracked together)</label>'+
    '</div>'+
    '<div class="field" style="margin-top:12px;"><label>Tasks for this event</label>'+renderEventTaskPicker(e)+'</div>'+
    '<div class="row" style="margin-top:20px;justify-content:'+(editing?'space-between':'flex-end')+';">'+
      (editing ? '<button class="btn btn-ghost" style="color:var(--danger);" data-action="deleteCalEventFromModal" data-id="'+e.id+'">Delete</button>' : '')+
      '<div class="row">'+
        '<button class="btn btn-ghost" data-action="closeCalEventModal">Cancel</button>'+
        '<button class="btn btn-primary" data-action="saveCalEvent">'+(editing?'Save':'Add')+'</button>'+
      '</div>'+
    '</div>';
}
function renderCalEventModalInto(){ const el=document.getElementById('calEventContent'); if(el) morphInto(el, renderCalEventModal(), {form:true}); }
function syncCalEventAlarm(ev, wantsAlarm){
  if(wantsAlarm && ev.time){
    if(ev.alarmId){
      const existing = state.focus.alarms.find(function(x){return x.id===ev.alarmId;});
      if(existing){ existing.time=ev.time; existing.label=ev.title; existing.date=ev.date; existing.enabled=true; return; }
    }
    const alarm = {id:uid(), time:ev.time, label:ev.title, days:[], enabled:true, date:ev.date};
    state.focus.alarms.push(alarm);
    ev.alarmId = alarm.id;
  } else if(ev.alarmId){
    state.focus.alarms = state.focus.alarms.filter(function(x){ return x.id!==ev.alarmId; });
    ev.alarmId = null;
  }
}
function saveCalEvent(){
  const title = document.getElementById('calEventTitle').value.trim();
  if(!title) return;
  const date = document.getElementById('calEventDate').value || ui.calendarSelectedDate || todayStr();
  const time = document.getElementById('calEventTime').value || null;
  const categoryId = document.getElementById('calEventCategory').value;
  const meetingLink = document.getElementById('calEventMeetingLink').value.trim() || null;
  const linkedEl = document.getElementById('calEventLinkedClient');
  const linkedClient = linkedEl && linkedEl.value ? linkedEl.value : null;
  const wantsAlarm = document.getElementById('calEventSetAlarm').checked;
  if(ui.editingCalEventId){
    const ev = state.calendar.events.find(function(x){return x.id===ui.editingCalEventId;});
    if(ev){ ev.date=date; ev.time=time; ev.title=title; ev.categoryId=categoryId; ev.meetingLink=meetingLink; ev.linkedClient=linkedClient; readEventExtras(ev); syncCalEventAlarm(ev, wantsAlarm); syncEventExtraAlarms(ev); }
  } else {
    const ev = {id:uid(), date:date, time:time, title:title, categoryId:categoryId, meetingLink:meetingLink, linkedClient:linkedClient, alarmId:null};
    readEventExtras(ev);
    syncCalEventAlarm(ev, wantsAlarm);
    syncEventExtraAlarms(ev);
    state.calendar.events.push(ev);
  }
  persist('tasks');
  ui.calendarSelectedDate = date;
  closeCalEventModal();
  persist('calendar'); persist('focus'); renderView();
}
function deleteCalEventFromModal(id){
  const ev = state.calendar.events.find(function(x){return x.id===id;});
  if(ev && ev.alarmId) state.focus.alarms = state.focus.alarms.filter(function(x){return x.id!==ev.alarmId;});
  if(ev){ state.focus.alarms = state.focus.alarms.filter(function(x){ return x.eventId!==ev.id; }); state.tasks.items.forEach(function(t){ if(t.eventId===ev.id) t.eventId=null; }); persist('tasks'); }
  state.calendar.events = state.calendar.events.filter(function(x){ return x.id!==id; });
  closeCalEventModal();
  persist('calendar'); persist('focus'); renderView();
}
// Opens whatever a calendar row points at (event or task deadline) in its editor, which
// carries both the edit fields and Delete. Closes the Upcoming popover first so the editor
// isn't hidden behind it.
function openCalItem(kind, id){
  closeUpcomingPopover();
  if(kind==='event') openCalEventModal(id);
  else openTaskEditModal(id);
}
function joinCall(url){ if(url) window.open(url, '_blank'); }

