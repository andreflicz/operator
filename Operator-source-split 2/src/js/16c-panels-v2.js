
// ============ TODAY PANELS v2: goals, agenda, week, consistency, your why ============
function progressBarHtml(pct, color){
  return '<div class="pb"><div class="pb-fill" style="width:'+clamp(Math.round(pct),0,100)+'%;background:'+(color||goalColor())+';"></div></div>';
}
function activeMrr(){ return arr(state.business.clients).filter(function(c){ return c.status==='active'; }).reduce(function(a,c){ return a+Number(c.mrr||0); }, 0); }
function weightProgress(){
  const log = state.health.weightLog.slice().sort(function(a,b){ return a.date.localeCompare(b.date); });
  const latest = log.length ? log[log.length-1].weight : null, start = log.length ? log[0].weight : null, goal = state.profile.goalWeight;
  let pct = 0;
  if(latest!=null && goal!=null && start!=null && start!==goal) pct = clamp(Math.round(((start-latest)/(start-goal))*100),0,100);
  return {latest:latest, start:start, goal:goal, pct:pct};
}
function workoutsThisWeek(){
  const ws = startOfWeekStr(todayStr()); let n = 0;
  for(let i=0;i<7;i++){ const d = addDays(ws, i); if(d<=todayStr() && trainedDoneFor(d)) n++; }
  return n;
}
function statTileHtml(label, value, sub, pct, color, action){
  return '<div class="stat-tile"'+(action?' data-action="'+action+'" style="cursor:pointer;"':'')+'>'+
    '<div class="stat-tile-k">'+label+'</div>'+
    '<div class="stat-tile-v">'+value+'</div>'+
    (pct!=null ? progressBarHtml(pct, color) : '')+
    '<div class="stat-tile-sub">'+sub+'</div>'+
  '</div>';
}
function goalDaysLeftChip(g){
  if(!g.deadline) return '';
  const days = Math.round((localTs(g.deadline,'12:00')-localTs(todayStr(),'12:00'))/86400000);
  const cls = days<0 ? 'is-late' : days<=7 ? 'is-soon' : '';
  return '<span class="goal-chip '+cls+'">'+(days<0 ? 'past due' : days===0 ? 'due today' : days<=60 ? days+'d left' : fmtDateShort(g.deadline))+'</span>';
}
function goalCardHtml(g, compact){
  const t = goalTracker(g);
  const hasTracker = g.target!=null && g.target>0;
  const current = goalLiveCurrent(g);
  const pct = goalPct(g);
  const periodic = goalIsPeriodic(g), reachedNow = periodic && goalReached(g);
  const armedNow = armed.has('goalcomplete:'+g.id);
  const unit = t ? t.unit : (g.unit||'');
  const num = function(n){ return n==null ? '—' : unit==='$/mo' ? '$'+fmtGoalNum(n) : fmtGoalNum(n, unit); };
  const unitTail = unit && unit!=='$/mo' && !/^\$/.test(unit) ? ' '+escapeHtml(unit) : unit==='$/mo' ? '/mo' : '';
  return '<div class="goal-card'+(g.done?' is-done':'')+(t?' is-tracked':'')+(reachedNow?' is-hit':'')+'" data-key="goal-'+g.id+'">'+
    '<div class="goal-card-head">'+(t ? '<span class="goal-icon">'+t.icon+'</span>' : '')+'<span class="goal-card-title" data-action="openGoalEditModal" data-id="'+g.id+'">'+escapeHtml(goalTitle(g))+'</span>'+goalDaysLeftChip(g)+'</div>'+
    (hasTracker ? progressBarHtml(pct)+'<div class="goal-card-nums"><b>'+num(current)+'</b> / '+num(g.target)+unitTail+
        (periodic ? ' <span class="kpi-sub">'+(g.period==='week'?'this week':'this month')+'</span>' : '')+
        (g.autoTrack==='weight' && g.start!=null ? ' <span class="kpi-sub">from '+fmtGoalNum(g.start)+'</span>' : '')+
        '<span class="goal-pct">'+(reachedNow ? '&#10003;' : Math.round(pct)+'%')+'</span></div>' : '')+
    (t ? '<div class="goal-src" title="Updates by itself">&#9889; live '+escapeHtml(t.src)+'</div>' : '')+
    (compact ? '' : '<div class="goal-card-actions">'+
      (!t && hasTracker && !g.done ? '<button class="goal-step" data-action="goalStep" data-id="'+g.id+'" data-delta="-1" title="One less">&minus;</button><button class="goal-step" data-action="goalStep" data-id="'+g.id+'" data-delta="1" title="One more">+</button><button class="btn btn-ghost btn-sm" data-action="goalSetNumber" data-id="'+g.id+'" title="Type in where you are now">Update</button>' : '')+
      '<span style="flex:1"></span>'+
      (t && !g.done ? '' : '<button class="btn btn-sm '+(g.done?'btn-good':(armedNow?'btn-primary':'btn-ghost'))+'" data-action="toggleGoal" data-id="'+g.id+'">'+(g.done?'&#10003; Achieved':(armedNow?'Confirm?':'Mark done'))+'</button>')+
      '<button class="btn btn-ghost btn-sm" data-action="openGoalEditModal" data-id="'+g.id+'">Edit</button>'+
    '</div>')+
  '</div>';
}
ACTIONS.goalSetNumber = function(el, e, id){
  const g = state.goals.items.find(function(x){ return x.id===id; }); if(!g) return;
  const v = prompt('Where are you now for "'+goalTitle(g)+'"?', String(g.current||0));
  if(v==null) return;
  const n = Number(String(v).replace(/[^0-9.\-]/g, '')); if(isNaN(n)) return;
  g.current = n;
  if(g.target && g.current>=g.target && !g.done){ g.done = true; g.doneAt = todayStr(); playFanfare(); showToast('Goal reached: '+goalTitle(g), {icon:'&#127942;'}); }
  else playTick();
  persist('goals'); renderView();
};
function fmtGoalNum(n, unit){ n = Number(n)||0; const s = n.toLocaleString(undefined, {maximumFractionDigits:1}); return /^\$/.test(unit||'') ? '$'+s : s; }
ACTIONS.goalStep = function(el, e, id){
  const g = state.goals.items.find(function(x){ return x.id===id; }); if(!g) return;
  g.current = Math.max(0, (Number(g.current)||0) + Number(el.dataset.delta||1));
  if(g.target && g.current>=g.target && !g.done){ g.done = true; playFanfare(); showToast('Goal reached: '+g.label, {icon:'&#127942;'}); }
  else playTick();
  persist('goals'); renderView();
};
function goalStatTilesHtml(){
  const mrr = activeMrr(), mrrGoal = state.profile.revenueGoalMonthly||0;
  const w = weightProgress();
  const wk = workoutsThisWeek(), wkT = state.profile.weeklyWorkoutTarget||0;
  const items = state.goals.items, done = items.filter(function(g){ return g.done; }).length;
  return '<div class="stat-tiles">'+
    statTileHtml('Revenue', '$'+mrr.toLocaleString(), mrrGoal ? 'of $'+mrrGoal.toLocaleString()+'/mo goal' : 'set a goal in Settings', mrrGoal ? mrr/mrrGoal*100 : null, 'var(--good)')+
    (w.goal!=null ? statTileHtml('Weight', w.latest!=null ? w.latest : '—', w.latest!=null ? 'goal '+w.goal+(w.latest!==w.goal?' · '+Math.abs(w.latest-w.goal).toFixed(1)+' to go':'') : 'log your weight', w.pct, 'var(--info)', 'goToWeight') : '')+
    statTileHtml('Workouts', wk+(wkT?'<span class="stat-tile-of">/'+wkT+'</span>':''), 'this week', wkT ? wk/wkT*100 : null, 'var(--accent)', 'goToFitness')+
    statTileHtml('Goals', done+'<span class="stat-tile-of">/'+items.length+'</span>', items.length ? 'achieved' : 'none set yet', items.length ? done/items.length*100 : null, goalColor())+
  '</div>';
}
ACTIONS.goToWeight = function(){ ui.view='personal'; ui.personalTab='fitness'; ui.healthTab='weight'; renderView(); };
ACTIONS.goToFitness = function(){ ui.view='personal'; ui.personalTab='fitness'; ui.healthTab='workouts'; renderView(); };
// Today panel: the master goals at a glance, plus your own open goals.
function renderGoalsPanel(){
  const own = state.goals.items.filter(function(g){ return !g.done; }).sort(function(a, b){ return (a.deadline||'9999').localeCompare(b.deadline||'9999'); }).slice(0, 3);
  return '<div class="section goals-panel">'+
    masterGoalsHtml(true)+
    (own.length ? '<div class="goal-grid" style="margin-top:12px;">'+own.map(function(g){ return goalCardHtml(g, true); }).join('')+'</div>' : '')+
    '<div class="mg-more"><span class="view-all-link" data-action="nav" data-view="personal" data-tab="goals">All goals &rarr;</span></div>'+
  '</div>';
}
// Goals tab: the master goals, big — then your own goals for anything the app can't see.
function renderGoalsTab(){
  const items = state.goals.items;
  const open = items.filter(function(g){ return !g.done; }).sort(function(a, b){ return (a.deadline||'9999').localeCompare(b.deadline||'9999'); });
  const done = items.filter(function(g){ return g.done; });
  const formOpen = !!ui.forms.newGoal;
  return '<div class="section">'+masterGoalsHtml(false)+'</div>'+
    '<div class="section">'+
      '<div class="section-title">Your goals'+tip('For things Operator can\'t see — IG followers, a first sponsor deal, a new camera. You update the number.')+(formOpen ? '<button class="btn btn-sm btn-ghost" data-action="toggleForm" data-form="newGoal">Close</button>' : '')+'</div>'+
      (formOpen ? '<div class="card goal-form">'+
        '<div class="grid grid-2"><div class="field"><label>Goal</label><input class="input" id="newGoalLabel" placeholder="e.g. 10k IG followers"></div>'+
          '<div class="field"><label>By when (optional)</label><input class="input" type="date" id="newGoalDeadline"></div></div>'+
        '<div class="grid grid-3" style="margin-top:10px;">'+
          '<div class="field"><label>Target</label><input class="input" type="number" step="any" id="newGoalTarget" placeholder="10000"></div>'+
          '<div class="field"><label>Unit</label><input class="input" id="newGoalUnit" placeholder="followers"></div>'+
          '<div class="field"><label>Where you are now</label><input class="input" type="number" step="any" id="newGoalCurrent" placeholder="0"></div>'+
        '</div>'+
        '<div class="row" style="margin-top:12px;justify-content:flex-end;"><button class="btn btn-good" data-action="addGoal">+ Add goal</button></div>'+
      '</div>' : '')+
      (open.length ? '<div class="goal-grid">'+open.map(function(g){ return goalCardHtml(g, false); }).join('')+'</div>' : (formOpen ? '' : '<div class="empty">Nothing here yet — add one for anything you track yourself.</div>'))+
    '</div>'+
    (done.length ? '<div class="section"><button class="cc2-past-toggle" data-action="toggleForm" data-form="goalsDone">'+(ui.forms.goalsDone?'&#9662;':'&#9656;')+' Achieved ('+done.length+')</button>'+
      (ui.forms.goalsDone ? '<div class="goal-grid" style="margin-top:10px;">'+done.map(function(g){ return goalCardHtml(g, false); }).join('')+'</div>' : '')+'</div>' : '');
}
// ---- agenda: today's timeline ----
function agendaItems(){
  const today = todayStr(), out = [];
  const wt = typeof wakeTimeFor==='function' ? wakeTimeFor(today) : null;
  if(wt) out.push({time:wt, label:'Wake up', icon:'&#9728;&#65039;', kind:'wake'});
  state.calendar.events.filter(function(e){ return e.date===today; }).forEach(function(e){ const c = categoryById(e.categoryId); out.push({time:e.time||'', label:e.title, icon:'&#128197;', kind:'event', color:c?c.color:null, action:'openCalItem', id:e.id, sub:e.location||''}); });
  state.tasks.items.filter(function(t){ return t.deadline===today && t.status!=='done'; }).forEach(function(t){ out.push({time:t.deadlineTime||'', label:t.title, icon:'&#9888;&#65039;', kind:'deadline', action:'openTaskEditModal', id:t.id}); });
  arr(state.focus.alarms).filter(function(a){ return a.enabled && a.time && !a.eventId && !a.taskId && (a.date ? a.date===today : arr(a.days).indexOf(new Date().getDay())>=0); }).forEach(function(a){ out.push({time:a.time, label:a.label||'Alarm', icon:'&#9200;', kind:'alarm'}); });
  arr(state.focus.reminders).filter(function(r){ return r.date===today; }).forEach(function(r){ out.push({time:r.time||'', label:r.label, icon:'&#128276;', kind:'reminder'}); });
  return out.sort(function(a,b){ return (a.time||'00:00').localeCompare(b.time||'00:00'); });
}
function renderAgendaPanel(){
  const items = agendaItems();
  const now = nowHM();
  let nowPlaced = false;
  const rows = items.map(function(it){
    let line = '';
    if(!nowPlaced && it.time && it.time>now){ nowPlaced = true; line = '<div class="ag-now"><span>now</span></div>'; }
    const past = it.time && it.time<=now;
    return line+'<div class="ag-row'+(past?' is-past':'')+' ag-'+it.kind+'"'+(it.action?' data-action="'+it.action+'" data-kind="'+(it.kind==='deadline'?'deadline':'event')+'" data-id="'+it.id+'"':'')+'>'+
      '<span class="ag-time">'+(it.time ? fmt12Hour(it.time) : 'Today')+'</span>'+
      '<span class="ag-dot"'+(it.color?' style="background:'+it.color+'"':'')+'></span>'+
      '<span class="ag-label">'+it.icon+' '+escapeHtml(it.label)+(it.sub?' <span class="kpi-sub">'+escapeHtml(it.sub)+'</span>':'')+'</span>'+
    '</div>';
  }).join('');
  return '<div class="section agenda-panel"><div class="section-title">Today<span class="view-all-link" data-action="nav" data-view="calendar">Calendar &rarr;</span></div>'+
    '<div class="card ag-card">'+(items.length ? rows+(nowPlaced?'':'<div class="ag-now"><span>now</span></div>') : '<div class="empty" style="padding:10px;">Nothing scheduled — a clean day to get work done.</div>')+'</div></div>';
}
// ---- this week: deep work per day ----
function renderWeekPanel(){
  return '<div class="section week-panel"><div class="section-title">This week<span class="view-all-link" data-action="goToAnalytics">Analytics &rarr;</span></div>'+
    '<div class="card wk-card">'+weekBlockHtml()+'</div></div>';
}
function weekBlockHtml(){
  const ws = startOfWeekStr(todayStr());
  const target = state.standards.deepWorkTargetMinutes || 180;
  const days = []; let total = 0, best = 0;
  for(let i=0;i<7;i++){
    const d = addDays(ws, i);
    const m = d===todayStr() ? deepWorkMinutesTodayLive() : (d<todayStr() ? deepWorkMinutesFor(d) : 0);
    days.push({d:d, m:m}); total += m; best = Math.max(best, m);
  }
  const scale = Math.max(target*1.2, best, 60);
  const names = ['M','T','W','T','F','S','S'];
  return ''+
      '<div class="wk-top"><div><div class="stat-tile-v">'+fmtHours(total)+'</div><div class="stat-tile-sub">deep work this week</div></div>'+
        '<div style="text-align:right;"><div class="stat-tile-v" style="font-size:18px;">'+days.filter(function(x){ return x.m>=target; }).length+'<span class="stat-tile-of">/7</span></div><div class="stat-tile-sub">days on target</div></div></div>'+
      '<div class="wk-bars"><div class="wk-target" style="bottom:'+(target/scale*100)+'%;" title="Daily target '+fmtDurationLabel(target)+'"></div>'+
        days.map(function(x, i){
          const future = x.d>todayStr(), isToday = x.d===todayStr();
          return '<div class="wk-col'+(isToday?' is-today':'')+(future?' is-future':'')+'" title="'+weekdayShort(x.d)+': '+fmtDurationLabel(x.m)+'">'+
            '<div class="wk-bar-wrap"><div class="wk-bar'+(x.m>=target?' hit':'')+'" style="height:'+Math.max(x.m?3:0, x.m/scale*100)+'%"></div></div>'+
            '<div class="wk-day">'+names[i]+'</div></div>';
        }).join('')+
      '</div>';
}
ACTIONS.goToAnalytics = function(){ ui.view='focus'; ui.focusTab='analytics'; renderView(); };
// ---- consistency heatmap (last 26 weeks) + streak stats ----
function renderHeatmapPanel(){
  return '<div class="section heatmap-panel"><div class="section-title">Consistency</div>'+
    '<div class="card hm-card">'+heatBlockHtml()+'</div></div>';
}
function heatBlockHtml(){
  const target = state.standards.deepWorkTargetMinutes || 180;
  const WEEKS = 26;
  const start = addDays(startOfWeekStr(todayStr()), -(WEEKS-1)*7);
  let cols = '', hit = 0, counted = 0, totalMin = 0, worked = 0, run = 0, best = 0;
  for(let w=0; w<WEEKS; w++){
    let cells = '';
    for(let i=0;i<7;i++){
      const d = addDays(start, w*7+i);
      if(d>todayStr()){ cells += '<span class="hm-cell is-future"></span>'; continue; }
      const m = d===todayStr() ? deepWorkMinutesTodayLive() : deepWorkMinutesFor(d);
      const off = isDayOff(d);
      const lvl = off ? 'off' : m<=0 ? 0 : m<target*0.34 ? 1 : m<target*0.67 ? 2 : m<target ? 3 : 4;
      const std = dayStandardsComplete(d);
      if(!off){ counted++; if(std) hit++; }
      if(m>0){ totalMin += m; worked++; }
      if(m>=target || off) { run++; best = Math.max(best, run); } else if(d!==todayStr()) run = 0;
      cells += '<span class="hm-cell hm-'+lvl+(std?' is-std':'')+'" title="'+fmtDateShort(d)+(off?' · day off':' · '+fmtDurationLabel(m)+(std?' · standard ✓':''))+'"></span>';
    }
    cols += '<div class="hm-col">'+cells+'</div>';
  }
  const stat = function(v, k){ return '<div class="hm-stat"><div class="stat-tile-v">'+v+'</div><div class="stat-tile-sub">'+k+'</div></div>'; };
  return ''+
      '<div class="hm-main"><div class="hm-grid">'+cols+'</div>'+
        '<div class="hm-foot"><span>Last 6 months'+tip('Darker = more deep work that day. Outlined days hit the standard.')+'</span><span class="hm-legend">less <span class="hm-cell hm-1"></span><span class="hm-cell hm-2"></span><span class="hm-cell hm-3"></span><span class="hm-cell hm-4"></span> more</span></div></div>'+
      '<div class="hm-stats">'+
        stat(counted ? Math.round(hit/counted*100)+'%' : '—', 'days the standard was hit')+
        stat(best+'d', 'longest run on target')+
        stat(worked ? fmtHours(Math.round(totalMin/worked)) : '—', 'average on days you worked')+
      '</div>';
}
// This week's bars and the 6-month heatmap, side by side in one panel.
function renderProgressPanel(){
  return '<div class="section progress-panel"><div class="section-title">This week<span class="view-all-link" data-action="goToAnalytics">Analytics &rarr;</span></div>'+
    '<div class="card pg-card"><div class="pg-week wk-card">'+weekBlockHtml()+'</div><div class="pg-heat hm-card">'+heatBlockHtml()+'</div></div></div>';
}
// ---- your why ----
function renderWhyPanel(){
  const m = state.focus.motivations || {toward:[], away:[]};
  const toward = arr(m.toward), away = arr(m.away);
  if(!toward.length && !away.length){
    return '<div class="section"><div class="card why-empty" data-action="goToWhySettings"><span style="font-size:20px;">&#129517;</span><div><div class="kpi-label" style="margin:0;">Your why</div><div class="kpi-sub">Write down what you\'re working toward and what you\'re getting away from &rarr;</div></div></div></div>';
  }
  return '<div class="section why-panel"><div class="section-title">Your why<span class="view-all-link" data-action="goToWhySettings">Edit &rarr;</span></div>'+
    '<div class="why-grid">'+
      (toward.length ? '<div class="why-col why-toward"><div class="why-k">Going after</div>'+toward.map(function(x){ return '<div class="why-item">'+escapeHtml(x.text)+'</div>'; }).join('')+'</div>' : '')+
      (away.length ? '<div class="why-col why-away"><div class="why-k">Leaving behind</div>'+away.map(function(x){ return '<div class="why-item">'+escapeHtml(x.text)+'</div>'; }).join('')+'</div>' : '')+
    '</div></div>';
}
ACTIONS.goToWhySettings = function(){ ui.view='settings'; ui.settingsTab='focus'; renderView(); setTimeout(function(){ const el = document.getElementById('newMotivToward'); if(el){ el.scrollIntoView({behavior:'smooth', block:'center'}); } }, 40); };
