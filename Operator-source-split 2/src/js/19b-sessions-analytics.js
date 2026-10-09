
// ============ SESSIONS (edit) + ANALYTICS (Screen Time style) ============
// ---- Editing locked-in sessions and mode blocks (break / off-time / shooting / training) ----
function timeBlockFind(kind, id){
  return kind==='mode' ? state.modes.history.find(function(x){ return x.id===id; }) : state.focus.sessions.find(function(x){ return x.id===id; });
}
function openTimeBlockEdit(kind, id){
  if(!timeBlockFind(kind, id)) return;
  ui.editingTimeBlock = {kind:kind, id:id};
  showOverlay('sessionEditOverlay');
  renderSessionEditModalInto();
}
function hmOf(ts){ return ts ? nowHM(new Date(ts)) : ''; }
function renderSessionEditModal(){
  const eb = ui.editingTimeBlock; if(!eb) return '';
  const b = timeBlockFind(eb.kind, eb.id); if(!b) return '';
  const cur = eb.kind==='mode' ? b.type : sessionType(b);
  const types = (eb.kind==='mode'
    ? [['break','Break'],['offtime','Off-time'],['shooting','Shooting']]
    : [['deep','Deep work'],['shooting','Shooting']]).concat(cur==='training' ? [['training','Training (old)']] : []);
  // Older manual logs only stored a duration; show their start as "unknown" until edited.
  const hasTimes = !(b.manual && b.startedAt===b.endedAt);
  return '<div class="section-title" style="margin-bottom:4px;">Edit '+(eb.kind==='mode'?'Time Block':'Session')+'</div>'+
    '<div class="kpi-sub" style="margin-bottom:14px;">'+fmtDurationLabel(b.minutes)+' on '+fmtDateShort(b.date)+(b.manual?' &middot; logged manually':'')+(b.autoStopped?' &middot; auto-ended':'')+'</div>'+
    '<div class="grid grid-3">'+
      '<div class="field"><label>Date</label><input class="input" type="date" id="tbDate" value="'+b.date+'"></div>'+
      '<div class="field"><label>Start</label><input class="input" type="time" id="tbStart" value="'+(hasTimes?hmOf(b.startedAt):'')+'"></div>'+
      '<div class="field"><label>End</label><input class="input" type="time" id="tbEnd" value="'+(hasTimes?hmOf(b.endedAt):'')+'"></div>'+
    '</div>'+
    '<div class="field" style="margin-top:10px;"><label>Type'+tip('Only deep work counts toward deep-work stats. Shooting also counts toward the daily standard.')+'</label><div class="row" style="gap:6px;">'+types.map(function(t){
      return '<label class="chip'+(cur===t[0]?' active':'')+'" style="cursor:pointer;"><input type="radio" name="tbType" value="'+t[0]+'" '+(cur===t[0]?'checked':'')+' style="display:none;">'+t[1]+'</label>';
    }).join('')+'</div></div>'+
    '<div class="field" style="margin-top:10px;"><label>Note</label><input class="input" id="tbNote" value="'+escapeHtml(b.note||'')+'" placeholder="Optional"></div>'+
    (arr(b.completedTasks).length ? '<div class="kpi-sub" style="margin-top:10px;">Finished: '+arr(b.completedTasks).map(function(t){ return escapeHtml(t.title); }).join(', ')+'</div>' : '')+
    '<div class="row" style="margin-top:20px;justify-content:space-between;">'+
      '<button class="btn btn-ghost btn-sm mini-move-danger" data-action="deleteTimeBlock">Delete</button>'+
      '<div class="row"><button class="btn btn-ghost" data-action="closeTimeBlockEdit">Cancel</button><button class="btn btn-primary" data-action="saveTimeBlock">Save</button></div>'+
    '</div>';
}
function renderSessionEditModalInto(){ const el=document.getElementById('sessionEditContent'); if(el) morphInto(el, renderSessionEditModal(), {form:true}); }
registerModal('sessionEditOverlay', renderSessionEditModalInto);
function localTs(dateStr, hm){
  const p = dateStr.split('-').map(Number), t = hm.split(':').map(Number);
  return new Date(p[0], p[1]-1, p[2], t[0], t[1]).getTime();
}
ACTIONS.editTimeBlock = function(el){ openTimeBlockEdit(el.dataset.kind||'session', el.dataset.id); };
ACTIONS.closeTimeBlockEdit = function(){ ui.editingTimeBlock = null; hideOverlay('sessionEditOverlay'); };
ACTIONS.saveTimeBlock = function(){
  const eb = ui.editingTimeBlock; if(!eb) return;
  const b = timeBlockFind(eb.kind, eb.id); if(!b) return;
  const date = document.getElementById('tbDate').value || b.date;
  const st = document.getElementById('tbStart').value, en = document.getElementById('tbEnd').value;
  if(st && en){
    const start = localTs(date, st);
    let end = localTs(date, en);
    if(end<=start) end += 24*3600000; // ran past midnight
    b.startedAt = start; b.endedAt = end;
    b.minutes = Math.max(1, Math.round((end-start)/60000));
    b.timesEdited = true;
  }
  b.date = date;
  const typeEl = document.querySelector('#sessionEditContent input[name="tbType"]:checked');
  if(typeEl) b.type = typeEl.value;
  b.note = document.getElementById('tbNote').value.trim();
  ui.editingTimeBlock = null;
  hideOverlay('sessionEditOverlay');
  persist(eb.kind==='mode'?'modes':'focus'); playTick(); renderView();
};
let lastDeletedBlock = null;
ACTIONS.deleteTimeBlock = function(){
  const eb = ui.editingTimeBlock; if(!eb) return;
  const list = eb.kind==='mode' ? state.modes.history : state.focus.sessions;
  const idx = list.findIndex(function(x){ return x.id===eb.id; }); if(idx<0) return;
  lastDeletedBlock = {kind:eb.kind, index:idx, block:list[idx]};
  list.splice(idx,1);
  ui.editingTimeBlock = null; hideOverlay('sessionEditOverlay');
  persist(eb.kind==='mode'?'modes':'focus'); renderView();
  showToast('Deleted '+fmtDurationLabel(lastDeletedBlock.block.minutes)+' '+(eb.kind==='mode'?'block':'session'), {icon:'&#128465;', actionLabel:'Undo', actionAction:'undoDeleteTimeBlock', duration:7000});
};
ACTIONS.undoDeleteTimeBlock = function(){
  const d = lastDeletedBlock; if(!d) return;
  const list = d.kind==='mode' ? state.modes.history : state.focus.sessions;
  list.splice(Math.min(d.index, list.length), 0, d.block);
  lastDeletedBlock = null;
  const c = document.getElementById('toastContainer'); if(c) c.innerHTML='';
  persist(d.kind==='mode'?'modes':'focus'); renderView();
};
// Radio chips inside the editor: reflect the selection without a re-render.
document.addEventListener('change', function(e){
  if(e.target && e.target.name==='tbType'){
    document.querySelectorAll('#sessionEditContent input[name="tbType"]').forEach(function(r){ r.parentElement.classList.toggle('active', r.checked); });
  }
});

// ---- Per-day totals by mode ----
function liveModeMinutes(dateStr, type){
  const a = state.modes.active;
  if(!a || a.type!==type || dateStr!==todayStr()) return 0;
  return Math.floor((Date.now()-Math.max(a.startedAt, localTs(dateStr,'00:00')))/60000);
}
function dayModeTotals(dateStr){
  const isToday = dateStr===todayStr();
  const deep = isToday ? deepWorkMinutesTodayLive() : deepWorkMinutesFor(dateStr);
  const as = state.focus.activeSession;
  const liveSession = function(type){ return (isToday && as && sessionType(as)===type && !as.onBreak) ? Math.floor((Date.now()-as.startedAt)/60000) : 0; };
  const training = rawSessionMinutesFor(dateStr,'training') + modeMinutesFor(dateStr,'training') + liveModeMinutes(dateStr,'training') + liveSession('training');
  const workout = workoutDay(dateStr).m;
  const shooting = rawSessionMinutesFor(dateStr,'shooting') + modeMinutesFor(dateStr,'shooting') + liveModeMinutes(dateStr,'shooting') + liveSession('shooting');
  let excludedLive = 0;
  if(isToday && as && !as.onBreak && ui.currentTaskId && ui.currentTaskStartedAt && !taskCountsAsDeepWork(ui.currentTaskId)) excludedLive = Math.floor((Date.now()-ui.currentTaskStartedAt)/60000);
  const other = modeMinutesFor(dateStr,'break') + liveModeMinutes(dateStr,'break') + excludedTaskMinutesFor(dateStr) + excludedLive + training;
  return {deep:deep, workout:workout, shooting:shooting, other:other, total:deep+workout+shooting+other};
}
// Workouts logged in Fitness, per day: how many and the minutes you entered for them.
function workoutDayMap(){
  const m = {};
  arr(state.health.gymLog).forEach(function(g){ if(!g || !g.date) return; const d = m[g.date] || (m[g.date] = {n:0, m:0}); d.n++; d.m += Math.max(0, Number(g.duration)||0); });
  return m;
}
function workoutDay(dateStr){ return (RC ? memo('workoutDays', workoutDayMap) : workoutDayMap())[dateStr] || {n:0, m:0}; }
function workoutTotals(days){ const t = {n:0, m:0}; days.forEach(function(d){ const x = workoutDay(d); t.n += x.n; t.m += x.m; }); return t; }
function fmtDelta(mins){
  if(!mins) return 'same';
  return (mins>0?'+':'−')+fmtDurationLabel(Math.abs(mins));
}
function deltaHtml(mins, label){
  const cls = mins>0 ? 'delta-up' : mins<0 ? 'delta-down' : 'delta-flat';
  return '<span class="delta '+cls+'">'+fmtDelta(mins)+'</span> <span class="kpi-sub">'+label+'</span>';
}
function weekDays(offsetWeeks){
  const start = addDays(startOfWeekSundayStr(todayStr()), (offsetWeeks||0)*7);
  const out = []; for(let i=0;i<7;i++) out.push(addDays(start,i));
  return out;
}
function sumTotals(days){
  const t = {deep:0, workout:0, shooting:0, other:0, total:0};
  days.forEach(function(d){ if(d>todayStr()) return; const x = dayModeTotals(d); Object.keys(t).forEach(function(k){ t[k]+=x[k]; }); });
  return t;
}
// Stacked, clickable weekly bar chart.
function weekStackChart(days, selected){
  const w=700, h=190, padB=28, padT=12;
  const totals = days.map(function(d){ return d>todayStr() ? null : dayModeTotals(d); });
  const max = Math.max(60, Math.max.apply(null, totals.map(function(t){ return t?t.total:0; })));
  const gap = w/7, barW = gap*0.5;
  let out = '';
  // hour gridlines
  const stepH = max>480 ? 120 : 60;
  for(let m=stepH; m<=max; m+=stepH){
    const y = h-padB-(h-padB-padT)*(m/max);
    out += '<line x1="0" x2="'+w+'" y1="'+y.toFixed(1)+'" y2="'+y.toFixed(1)+'" style="stroke:var(--chart-grid)" stroke-dasharray="3 4"/><text x="'+(w-2)+'" y="'+(y-3).toFixed(1)+'" font-size="9" style="fill:var(--text-faint)" text-anchor="end">'+(m/60)+'h</text>';
  }
  days.forEach(function(d, i){
    const t = totals[i];
    const x = i*gap+(gap-barW)/2;
    let y = h-padB;
    let segs = '';
    if(t){
      TIME_TYPES.forEach(function(tt){
        const v = t[tt.id]; if(!v) return;
        const bh = (h-padB-padT)*(v/max);
        y -= bh;
        segs += '<rect x="'+x.toFixed(1)+'" y="'+y.toFixed(1)+'" width="'+barW.toFixed(1)+'" height="'+Math.max(1,bh).toFixed(1)+'" fill="'+tt.color+'" rx="2"/>';
      });
    }
    const isSel = d===selected;
    out += '<g class="wk-bar'+(isSel?' is-selected':'')+(t?'':' is-future')+'" data-action="analyticsPickDay" data-id="'+d+'">'+
      '<title>'+weekdayShort(d)+' '+fmtDateShort(d)+(t?' — '+fmtDurationLabel(t.total)+' ('+TIME_TYPES.map(function(tt){ return tt.label+' '+fmtDurationLabel(t[tt.id]); }).join(', ')+')':'')+'</title>'+
      '<rect x="'+(i*gap+2).toFixed(1)+'" y="0" width="'+(gap-4).toFixed(1)+'" height="'+h+'" fill="'+(isSel?'rgba(232,162,61,.08)':'transparent')+'" rx="6"/>'+
      (t && !t.total ? '<rect x="'+x.toFixed(1)+'" y="'+(h-padB-2)+'" width="'+barW.toFixed(1)+'" height="2" style="fill:var(--border)"/>' : '')+
      segs+
      '<text x="'+(x+barW/2).toFixed(1)+'" y="'+(h-10)+'" font-size="11" style="fill:'+(isSel?'var(--text)':'var(--text-dim)')+'" text-anchor="middle" font-weight="'+(isSel?'700':'500')+'">'+weekdayShort(d).slice(0,3)+'</text>'+
      (t && t.total ? '<text x="'+(x+barW/2).toFixed(1)+'" y="'+(y-4).toFixed(1)+'" font-size="9.5" style="fill:var(--text-dim)" text-anchor="middle">'+fmtDurationLabel(t.total)+'</text>' : '')+
    '</g>';
  });
  return '<svg viewBox="0 0 '+w+' '+h+'" class="chart-svg wk-chart">'+out+'</svg>';
}
function modeLegendHtml(){
  return '<div class="mode-legend">'+TIME_TYPES.map(function(tt){ return '<span><i style="background:'+tt.color+'"></i>'+tt.label+'</span>'; }).join('')+'</div>';
}
// Apps for a day: time while locked in when we have it, otherwise all active app time.
function sessionWindowsFor(dateStr){
  const wins = state.focus.sessions.filter(function(s){ return s.date===dateStr && s.endedAt>s.startedAt; }).map(function(s){ return [s.startedAt, s.endedAt]; });
  const as = state.focus.activeSession;
  if(as && dateStr===todayStr()) wins.push([as.startedAt, Date.now()]);
  return wins;
}
function clipIntervalsToWindows(intervals, windows){
  const map = {};
  arr(intervals).forEach(function(iv){
    windows.forEach(function(w){
      const s = Math.max(iv.start, w[0]), e = Math.min(iv.end, w[1]);
      if(e>s) map[iv.app] = (map[iv.app]||0) + (e-s)/60000;
    });
  });
  Object.keys(map).forEach(function(k){ map[k] = Math.round(map[k]); if(!map[k]) delete map[k]; });
  return map;
}
function lockedInAppMinutesFor(dateStr){
  if(dateStr===todayStr()) return clipIntervalsToWindows(state.appActivity.todayIntervals, sessionWindowsFor(dateStr));
  return (state.appActivity.lockedDays||{})[dateStr] || null;
}
function topEntries(map, n){
  return Object.keys(map).map(function(k){ return {key:k, minutes:map[k]}; }).filter(function(x){ return x.minutes>0; }).sort(function(a,b){ return b.minutes-a.minutes; }).slice(0, n||5);
}
function barList(rows, colorFn, labelFn){
  const max = rows.length ? rows[0].minutes : 0;
  return rows.map(function(r){
    const pct = max ? Math.round(r.minutes/max*100) : 0;
    return '<div class="bar-row"><span class="bar-row-label" title="'+escapeHtml(labelFn(r))+'">'+escapeHtml(labelFn(r))+'</span><span class="bar-row-track"><span style="width:'+pct+'%;background:'+(colorFn?colorFn(r):'var(--accent)')+'"></span></span><span class="bar-row-val">'+fmtDurationLabel(r.minutes)+'</span></div>';
  }).join('');
}
function dayDetailHtml(dateStr){
  const t = dayModeTotals(dateStr);
  const prev = dayModeTotals(addDays(dateStr,-1));
  const lastWeekSame = dayModeTotals(addDays(dateStr,-7));
  // tasks + clients from the task timing log
  const taskMins = {};
  arr(state.focus.taskSegments).filter(function(sg){ return sg.date===dateStr; }).forEach(function(sg){ taskMins[sg.taskId] = (taskMins[sg.taskId]||0) + Math.round((sg.end-sg.start)/60000); });
  if(dateStr===todayStr() && ui.currentTaskId && ui.currentTaskStartedAt) taskMins[ui.currentTaskId] = (taskMins[ui.currentTaskId]||0) + Math.floor((Date.now()-ui.currentTaskStartedAt)/60000);
  const clientMins = {};
  Object.keys(taskMins).forEach(function(tid){
    const task = state.tasks.items.find(function(x){ return x.id===tid; });
    arr(task ? task.clients : ['personal']).forEach(function(c){ clientMins[c] = (clientMins[c]||0) + taskMins[tid]; });
  });
  const taskRows = topEntries(taskMins, 6);
  const clientRows = topEntries(clientMins, 5);
  const sessions = state.focus.sessions.filter(function(s){ return s.date===dateStr; }).map(function(s){ return {kind:'session', b:s}; })
    .concat(state.modes.history.filter(function(m){ return m.date===dateStr; }).map(function(m){ return {kind:'mode', b:m}; }))
    .sort(function(a,b){ return a.b.startedAt-b.b.startedAt; });
  const finished = state.tasks.items.filter(function(x){ return x.status==='done' && x.completedAt===dateStr; });
  const locked = lockedInAppMinutesFor(dateStr);
  const appMap = locked && Object.keys(locked).length ? locked : appMinutesForDate(dateStr);
  const appRows = topEntries(appMap, 6);
  const label = dateStr===todayStr() ? 'Today' : dateStr===addDays(todayStr(),-1) ? 'Yesterday' : weekdayShort(dateStr)+', '+fmtDateShort(dateStr);
  return '<div class="day-detail">'+
    '<div class="day-detail-head"><div><div class="section-title" style="margin:0;">'+label+'</div><div class="kpi-sub">'+fmtDurationLabel(t.total)+' tracked &middot; '+deltaHtml(t.deep-prev.deep,'deep work vs day before')+' &middot; '+deltaHtml(t.deep-lastWeekSame.deep,'vs last '+weekdayShort(dateStr))+'</div></div></div>'+
    '<div class="mode-tiles">'+TIME_TYPES.map(function(tt){
      return '<div class="mode-tile"><span class="mode-tile-dot" style="background:'+tt.color+'"></span><div class="mode-tile-val">'+fmtDurationLabel(t[tt.id])+'</div><div class="mode-tile-label">'+tt.label+'</div></div>';
    }).join('')+'</div>'+
    '<div class="grid grid-2" style="margin-top:14px;">'+
      '<div class="card"><div class="kind-label" style="margin-top:0;">Top Tasks</div>'+(taskRows.length ? barList(taskRows, function(r){ return taskCountsAsDeepWork(r.key)?'var(--accent)':'#8A90A2'; }, function(r){ const tk = state.tasks.items.find(function(x){ return x.id===r.key; }); return tk ? tk.title : 'Deleted task'; }) : '<div class="kpi-sub">No task timing yet — set a Current task while locked in.</div>')+
        (finished.length ? '<div class="kind-label">Finished</div><div class="kpi-sub" style="line-height:1.6;">'+finished.map(function(x){ return '&#10003; '+escapeHtml(x.title); }).join('<br>')+'</div>' : '')+'</div>'+
      '<div class="card"><div class="kind-label" style="margin-top:0;">Clients</div>'+(clientRows.length ? barList(clientRows, function(){ return 'var(--info)'; }, function(r){ return clientLabel(r.key); }) : '<div class="kpi-sub">Nothing attributed to clients.</div>')+
        '<div class="kind-label">Apps'+(locked && Object.keys(locked).length?' &middot; while locked in':' &middot; active time')+'</div>'+(appRows.length ? barList(appRows, function(){ return '#5b6472'; }, function(r){ return r.key; }) : '<div class="kpi-sub">No app activity recorded.</div>')+'</div>'+
    '</div>'+
    '<div class="card" style="margin-top:14px;"><div class="kind-label" style="margin-top:0;">Sessions &amp; Blocks'+tip('Click one to edit its times or delete it.')+'</div>'+
      (sessions.length ? '<div class="task-list">'+sessions.map(function(x){
        const b = x.b; const type = x.kind==='mode' ? b.type : sessionType(b);
        const tt = TIME_TYPES.find(function(q){ return q.id===type; });
        const color = tt ? tt.color : (type==='break' ? '#8fdcff' : '#8A90A2');
        const lbl = tt ? tt.label : (MODE_LABELS[type]||type);
        return '<div class="task-item-v2 cal-item-clickable" data-action="editTimeBlock" data-kind="'+x.kind+'" data-id="'+b.id+'" style="padding:10px 14px;align-items:center;">'+
          '<span class="tag" style="background:'+color+'22;color:'+color+';">'+escapeHtml(lbl)+'</span>'+
          '<div style="flex:1;min-width:0;"><div class="task-title" style="font-size:13.5px;">'+fmtDurationLabel(b.minutes)+(b.note?' <span class="kpi-sub">&middot; '+escapeHtml(b.note)+'</span>':'')+'</div></div>'+
          '<span class="kpi-sub">'+(b.manual && b.startedAt===b.endedAt ? 'manual' : timeBlockLabel(b))+'</span>'+
        '</div>';
      }).join('')+'</div>' : '<div class="kpi-sub">No sessions this day.</div>')+
    '</div>'+
  '</div>';
}
function analyticsRangeTabs(){
  const r = ui.analyticsRange || 'today';
  return '<button class="btn btn-ghost btn-sm" data-action="openDayRecap">&#128202; Day recap</button><div class="seg-tabs" style="margin:0;">'+[['today','Today'],['week','This week'],['lastweek','Last week'],['all','All time']].map(function(x){
    return '<button class="seg-tab'+(r===x[0]?' active':'')+'" data-action="analyticsRange" data-id="'+x[0]+'">'+x[1]+'</button>';
  }).join('')+'</div>';
}
ACTIONS.analyticsRange = function(el, e, id){ ui.analyticsRange = id; ui.analyticsDay = null; renderView(); };
ACTIONS.analyticsPickDay = function(el, e, id){ if(id>todayStr()) return; ui.analyticsDay = id; renderView(); };
function renderAnalyticsWeek(offset){
  const days = weekDays(offset);
  const prevDays = weekDays(offset-1);
  const sel = (ui.analyticsDay && days.indexOf(ui.analyticsDay)>=0) ? ui.analyticsDay : (days.indexOf(todayStr())>=0 ? todayStr() : days[6]);
  const t = sumTotals(days), p = sumTotals(prevDays);
  const elapsedDays = days.filter(function(d){ return d<=todayStr(); }).length || 1;
  return '<div class="card analytics-hero">'+
      '<div class="row" style="justify-content:space-between;align-items:flex-end;">'+
        '<div><div class="kpi-label">'+(offset===0?'This week':'Last week')+' &middot; '+fmtDateShort(days[0])+' – '+fmtDateShort(days[6])+'</div>'+
          '<div class="analytics-big">'+fmtDurationLabel(t.deep)+' <span class="kpi-sub" style="font-size:13px;">deep work</span></div>'+
          '<div>'+deltaHtml(t.deep-p.deep,'vs the week before')+' &middot; <span class="kpi-sub">'+fmtDurationLabel(Math.round(t.deep/elapsedDays))+'/day avg</span></div></div>'+
        modeLegendHtml()+
      '</div>'+
      weekStackChart(days, sel)+
      '<div class="mode-tiles mode-tiles-sm">'+TIME_TYPES.map(function(tt){ const wn = tt.id==='workout' ? workoutTotals(days).n : 0; return '<div class="mode-tile"'+(tt.id==='workout'?' data-action="goToFitness" style="cursor:pointer;"':'')+'><span class="mode-tile-dot" style="background:'+tt.color+'"></span><div class="mode-tile-val">'+fmtDurationLabel(t[tt.id])+'</div><div class="mode-tile-label">'+tt.label+(tt.id==='workout' ? ' &middot; '+wn+' workout'+(wn===1?'':'s') : ' &middot; '+fmtDelta(t[tt.id]-p[tt.id]))+'</div></div>'; }).join('')+'</div>'+
    '</div>'+
    '<div class="section" style="margin-top:16px;">'+dayDetailHtml(sel)+'</div>';
}
function renderAnalyticsToday(){
  const today = todayStr();
  // hour-by-hour strip for today
  const hours = []; for(let h=0;h<24;h++) hours.push(0);
  const addSpan = function(s, e){
    for(let h=0;h<24;h++){
      const hs = localTs(today, pad2(h)+':00'), he = hs+3600000;
      const ov = Math.min(e,he)-Math.max(s,hs);
      if(ov>0) hours[h] += ov/60000;
    }
  };
  state.focus.sessions.filter(function(s){ return s.date===today && sessionType(s)==='deep' && s.endedAt>s.startedAt; }).forEach(function(s){ addSpan(s.startedAt, s.endedAt); });
  const as = state.focus.activeSession;
  if(as && !as.onBreak && sessionType(as)==='deep') addSpan(as.startedAt, Date.now());
  const nowH = new Date().getHours();
  const strip = '<div class="hour-strip">'+hours.map(function(m,h){
    return '<div class="hour-cell'+(h===nowH?' is-now':'')+'" title="'+(h%12||12)+(h<12?'am':'pm')+' — '+Math.round(m)+'m deep work"><span style="height:'+Math.min(100,Math.round(m/60*100))+'%"></span></div>';
  }).join('')+'</div><div class="hour-strip-labels"><span>12a</span><span>6a</span><span>12p</span><span>6p</span><span>11p</span></div>';
  return '<div class="card analytics-hero"><div class="kpi-label">Deep work by hour</div>'+strip+'</div>'+
    '<div class="section" style="margin-top:16px;">'+dayDetailHtml(today)+'</div>';
}
function renderFocusAnalyticsTab(){
  const r = ui.analyticsRange || 'today';
  let body;
  if(r==='today') body = renderAnalyticsToday();
  else if(r==='week') body = renderAnalyticsWeek(0);
  else if(r==='lastweek') body = renderAnalyticsWeek(-1);
  else body = renderFocusAnalytics()+renderTaskStatsSection()+renderFitnessStatsSection()+renderTimeByTaskSection();
  return '<div class="subtab-panel" data-key="analytics-'+r+'">'+body+'</div>'+
    '<div class="section" style="margin-top:16px;">'+renderManualLogForm()+'</div>';
}
// Workouts you log in Fitness (with the minutes you enter) — totals for the analytics page.
function renderFitnessStatsSection(){
  const map = workoutDayMap(), dates = Object.keys(map);
  const all = dates.reduce(function(a, d){ a.n += map[d].n; a.m += map[d].m; return a; }, {n:0, m:0});
  const wk = workoutTotals(weekDays(0)), last30 = []; for(let i=29;i>=0;i--) last30.push(addDays(todayStr(), -i));
  const m30 = workoutTotals(last30);
  const tile = function(label, v, sub){ return '<div class="card" style="text-align:center;"><div class="kpi-label">'+label+'</div><div class="kpi-value" style="color:var(--train);">'+v+'</div>'+(sub?'<div class="kpi-sub">'+sub+'</div>':'')+'</div>'; };
  return '<div class="section"><div class="section-title">Fitness'+tip('From the workouts you log in Personal → Fitness — enter how long each one took and it lands here.')+'<span class="view-all-link" data-action="goToFitness">Log a workout &rarr;</span></div><div class="grid grid-4">'+
      tile('Total Workouts', all.n, dates.length ? 'since '+fmtDateShort(dates.sort()[0]) : 'none logged yet')+
      tile('Time Working Out', fmtDurationLabel(all.m), all.n ? fmtDurationLabel(Math.round(all.m/all.n))+' per workout' : '')+
      tile('This Week', wk.n, fmtDurationLabel(wk.m))+
      tile('Last 30 Days', m30.n, fmtDurationLabel(m30.m))+
    '</div></div>';
}
function renderTaskStatsSection(){
  const items = state.tasks.items;
  const doneAll = items.filter(function(t){ return t.status==='done'; });
  const last7=[]; for(let i=6;i>=0;i--) last7.push(addDays(todayStr(),-i));
  const doneLast7 = doneAll.filter(function(t){ return last7.indexOf(t.completedAt)>=0; });
  const openHigh = items.filter(function(t){ return t.status!=='done' && t.priority==='high'; }).length;
  const ongoingCount = items.filter(function(t){ return t.ongoing && t.status!=='done'; }).length;
  return '<div class="section"><div class="section-title">Task Stats</div><div class="grid grid-4">'+
      '<div class="card" style="text-align:center;"><div class="kpi-label">Completed All-Time</div><div class="kpi-value">'+doneAll.length+'</div></div>'+
      '<div class="card" style="text-align:center;"><div class="kpi-label">Completed Last 7 Days</div><div class="kpi-value">'+doneLast7.length+'</div></div>'+
      '<div class="card" style="text-align:center;"><div class="kpi-label">Open High Priority</div><div class="kpi-value" style="color:var(--danger);">'+openHigh+'</div></div>'+
      '<div class="card" style="text-align:center;"><div class="kpi-label">Ongoing Tasks</div><div class="kpi-value" style="color:var(--info);">'+ongoingCount+'</div></div>'+
    '</div></div>';
}
