// ============ ANALYTICS, ORGANIZED ============
// The numbers first: deep work, tasks and fitness for the range you're looking at, side by side.
// Then the charts (when you work, the last 30 days, apps, time by task). The long history of
// sessions has its own page — Analytics shows the last few and "All sessions →" opens it, where
// you can filter, sort, and download it (CSV / JSON) or copy a plain-text summary.

function rangeDays(r){
  if(r==='today') return [todayStr()];
  if(r==='week') return weekDays(0);
  if(r==='lastweek') return weekDays(-1);
  return null; // all time
}
function inRange(days, d){ return !days || days.indexOf(d)>=0; }
function anTile(label, value, sub, color){
  return '<div class="an-tile"><div class="an-k">'+label+'</div><div class="an-v"'+(color ? ' style="color:'+color+'"' : '')+'>'+value+'</div>'+(sub ? '<div class="an-s">'+sub+'</div>' : '')+'</div>';
}
// the top of every range: deep work · tasks · fitness, each as a card of a few numbers
function analyticsOverviewHtml(r){
  const days = rangeDays(r), today = todayStr();
  const sess = state.focus.sessions.filter(function(s){ return sessionType(s)==='deep' && inRange(days, s.date); });
  // every day's deep work the same way Today counts it (locked-in sessions + timed tasks)
  const allDates = days ? days.filter(function(d){ return d<=today; }) : Array.from(new Set(state.focus.sessions.map(function(s){ return s.date; }).concat(arr(state.focus.taskSegments).map(function(sg){ return sg.date; })).concat([today])));
  const deep = allDates.reduce(function(a, d){ return a + (d===today ? deepWorkMinutesTodayLive() : deepWorkMinutesFor(d)); }, 0);
  const longest = sess.length ? Math.max.apply(null, sess.map(function(s){ return s.minutes||0; })) : 0;
  const activeDays = new Set(sess.map(function(s){ return s.date; })).size;
  const target = state.standards.deepWorkTargetMinutes || 180;
  const items = state.tasks.items;
  const done = items.filter(function(t){ return t.status==='done' && t.completedAt && inRange(days, t.completedAt); });
  const openHigh = items.filter(function(t){ return t.status!=='done' && t.priority==='high'; }).length;
  const lineup = items.filter(function(t){ return t.status==='today'; }).length;
  const wdays = days || Object.keys(workoutDayMap());
  const wk = workoutTotals(wdays);
  const label = {today:'Today', week:'This week', lastweek:'Last week', all:'All time'}[r] || 'All time';
  const elapsed = days ? Math.max(1, days.filter(function(d){ return d<=today; }).length) : Math.max(1, activeDays);
  return '<div class="an-over">'+
    '<div class="an-card an-deep"><div class="an-h"><span class="an-dot" style="background:#E8A23D"></span>Deep Work <small>'+label+'</small></div><div class="an-grid">'+
      anTile('Total', fmtDurationLabel(deep), days && days.length===1 ? Math.round(deep/target*100)+'% of your '+fmtHours(target)+' target' : fmtDurationLabel(Math.round(deep/elapsed))+' a day', '#E8A23D')+
      anTile('Sessions', sess.length, sess.length ? fmtDurationLabel(Math.round(sess.reduce(function(a, s){ return a+(s.minutes||0); }, 0)/sess.length))+' on average' : '')+
      anTile('Longest', fmtDurationLabel(longest), '')+
      anTile(days && days.length===1 ? 'Streak' : 'Days worked', days && days.length===1 ? computeStreak()+'d' : activeDays, days && days.length===1 ? 'days in a row' : '')+
    '</div></div>'+
    '<div class="an-card an-tasks"><div class="an-h"><span class="an-dot" style="background:#3fbe8e"></span>Tasks <small>'+label+'</small></div><div class="an-grid">'+
      anTile('Finished', done.length, days && days.length>1 ? (done.length/elapsed).toFixed(1).replace(/\.0$/, '')+' a day' : '', '#3fbe8e')+
      anTile('In the lineup', lineup, 'right now')+
      anTile('High priority', openHigh, 'still open', openHigh ? 'var(--danger)' : null)+
      anTile('Ongoing', items.filter(function(t){ return t.ongoing && t.status!=='done'; }).length, 'recurring')+
    '</div></div>'+
    '<div class="an-card an-fit" data-action="goToFitness" title="Open Health"><div class="an-h"><span class="an-dot" style="background:#7AA2FF"></span>Fitness <small>'+label+'</small><span class="an-link">Log a workout &rarr;</span></div><div class="an-grid">'+
      anTile('Workouts', wk.n, '', '#7AA2FF')+
      anTile('Time', fmtDurationLabel(wk.m), wk.n ? fmtDurationLabel(Math.round(wk.m/wk.n))+' each' : '')+
      anTile('This week', workoutTotals(weekDays(0)).n, (state.profile.weeklyWorkoutTarget ? 'of '+state.profile.weeklyWorkoutTarget+' planned' : ''))+
      anTile('Last 30 days', workoutTotals(lastNDays(30)).n, fmtDurationLabel(workoutTotals(lastNDays(30)).m))+
    '</div></div>'+
  '</div>';
}
function lastNDays(n){ const out = []; for(let i=n-1;i>=0;i--) out.push(addDays(todayStr(), -i)); return out; }
// where the time went, all time, in one row
function modeTotalsRow(){
  const sumType = function(t){ return state.modes.history.filter(function(m){ return m.type===t; }).reduce(function(a, m){ return a+(m.minutes||0); }, 0); };
  return '<div class="an-modes">'+
    [['Breaks', sumType('break'), 'var(--info)'], ['Shooting', sumType('shooting'), 'var(--shoot)'], ['Off time', sumType('offtime'), 'var(--text-dim)'], ['Unaccounted', allTimeStasisMinutes(), 'var(--text-faint)']]
      .map(function(x){ return '<div><i style="background:'+x[2]+'"></i><span>'+x[0]+'</span><b>'+fmtDurationLabel(x[1])+'</b></div>'; }).join('')+
  '</div>';
}
function renderAnalyticsAllTime(){
  const qs = qualifyingSessions();
  const buckets = computeTimeOfDayBuckets();
  const last30 = lastNDays(30);
  const best = buckets.slice().sort(function(a, b){ return b.minutes-a.minutes; })[0];
  return modeTotalsRow()+
    '<div class="an-charts">'+
      '<div class="card"><div class="an-ch-h">Deep work, last 30 days</div>'+svgBarChart(last30.map(deepWorkMinutesForQualifying), last30.map(function(d){ return fmtDateShort(d).slice(0,3); }), {max:state.standards.deepWorkTargetMinutes})+'</div>'+
      '<div class="card"><div class="an-ch-h">When you work'+(best && best.minutes ? ' <span>Best: '+best.label+'</span>' : '')+'</div>'+svgBarChart(buckets.map(function(b){ return b.minutes; }), buckets.map(function(b){ return b.label; }))+'</div>'+
    '</div>'+
    renderMostUsedAppsSection()+
    renderTimeByTaskSection()+
    (qs.length ? '' : '');
}
// the last few sessions, and the way into all of them
function recentSessionsHtml(){
  const rows = sessionRows().slice(0, 6);
  return '<div class="section an-recent"><div class="section-title">Recent Sessions<span class="view-all-link" data-action="openSessionsPage">All sessions &rarr;</span></div>'+
    (rows.length ? '<div class="sx-list">'+rows.map(sessionRowHtml).join('')+'</div>' : '<div class="empty">No sessions logged yet.</div>')+'</div>';
}
function renderFocusAnalyticsTab(){
  if(ui.sessionsPage) return renderSessionsPage();
  const r = ui.analyticsRange || 'today';
  let body;
  if(r==='today') body = renderAnalyticsToday();
  else if(r==='week') body = renderAnalyticsWeek(0);
  else if(r==='lastweek') body = renderAnalyticsWeek(-1);
  else body = renderAnalyticsAllTime();
  return '<div class="subtab-panel" data-key="analytics-'+r+'">'+analyticsOverviewHtml(r)+body+recentSessionsHtml()+'</div>'+
    '<div class="section" style="margin-top:16px;">'+renderManualLogForm()+'</div>';
}

// ---- the Sessions page ----
const SX_TYPES = {deep:['Deep work', '#E8A23D'], shooting:['Shooting', '#C58FFF'], workout:['Working out', '#7AA2FF'], break:['Break', '#5BC0EB'], offtime:['Off time', '#8A90A2'], other:['Other', '#8A90A2']};
function sessionRows(){
  const out = [];
  state.focus.sessions.forEach(function(s){
    out.push({kind:'session', id:s.id, date:s.date, start:s.startedAt, end:s.endedAt, type:sessionType(s), minutes:s.minutes||0, tasks:arr(s.completedTasks).map(function(t){ return t.title; }), note:s.note||'', manual:!!s.manual,
      breaks:arr(s.breaks).length, method:s.method && typeof LOCK_METHODS!=='undefined' && LOCK_METHODS[s.method.id] ? LOCK_METHODS[s.method.id].label : ''});
  });
  state.modes.history.forEach(function(m){
    out.push({kind:'mode', id:m.id, date:m.date, start:m.startedAt, end:m.endedAt, type:m.type==='training' ? 'other' : m.type, minutes:m.minutes||0, tasks:[], note:m.note||'', manual:false, breaks:0, method:''});
  });
  return out.sort(function(a, b){ return (b.start||0) - (a.start||0); });
}
function sessionRowHtml(x){
  const t = SX_TYPES[x.type] || SX_TYPES.other;
  return '<div class="sx-row" data-action="editTimeBlock" data-kind="'+x.kind+'" data-id="'+x.id+'">'+
    '<span class="sx-date"><b>'+fmtDateShort(x.date)+'</b><small>'+(x.start ? fmtTimeShort(x.start)+(x.end ? ' – '+fmtTimeShort(x.end) : '') : '')+'</small></span>'+
    '<span class="sx-type" style="--c:'+t[1]+'"><i></i>'+t[0]+(x.method ? ' <em>'+escapeHtml(x.method)+'</em>' : '')+(x.manual ? ' <em>manual</em>' : '')+'</span>'+
    '<span class="sx-what">'+(x.tasks.length ? '&#10003; '+x.tasks.map(escapeHtml).join(', ') : x.note ? escapeHtml(x.note) : '<span class="kpi-sub">—</span>')+'</span>'+
    '<span class="sx-len">'+fmtDurationLabel(x.minutes)+'</span>'+
  '</div>';
}
function sessionsFiltered(){
  const f = ui.sx || (ui.sx = {range:'30', type:'all', sort:'new', q:''});
  const from = f.range==='all' ? '' : addDays(todayStr(), -(Number(f.range)-1));
  const q = (f.q||'').toLowerCase();
  let rows = sessionRows().filter(function(x){
    if(from && x.date < from) return false;
    if(f.type!=='all' && x.type!==f.type) return false;
    if(q && (x.tasks.join(' ')+' '+x.note+' '+x.method).toLowerCase().indexOf(q)<0) return false;
    return true;
  });
  const by = {new:function(a, b){ return (b.start||0)-(a.start||0); }, old:function(a, b){ return (a.start||0)-(b.start||0); }, long:function(a, b){ return b.minutes-a.minutes; }, short:function(a, b){ return a.minutes-b.minutes; }}[f.sort] || null;
  if(by) rows = rows.sort(by);
  return rows;
}
function renderSessionsPage(){
  const f = ui.sx || (ui.sx = {range:'30', type:'all', sort:'new', q:''});
  const rows = sessionsFiltered();
  const total = rows.reduce(function(a, x){ return a + x.minutes; }, 0), deep = rows.filter(function(x){ return x.type==='deep'; });
  const seg = function(key, opts){ return '<div class="seg-tabs" style="margin:0;">'+opts.map(function(o){ return '<button class="seg-tab'+(f[key]===o[0]?' active':'')+'" data-action="sxSet" data-k="'+key+'" data-id="'+o[0]+'">'+o[1]+'</button>'; }).join('')+'</div>'; };
  const shown = rows.slice(0, ui.sxShow || 100);
  return '<div class="sx">'+
    '<div class="sx-top"><button class="btn btn-ghost btn-sm" data-action="closeSessionsPage">&larr; Analytics</button><h2>All Sessions</h2>'+
      '<span class="sx-export"><button class="btn btn-ghost btn-sm" data-action="sxCopy" title="Copy a plain-text summary">&#10024; Copy summary</button><button class="btn btn-ghost btn-sm" data-action="sxCsv">&#11015; CSV</button><button class="btn btn-ghost btn-sm" data-action="sxJson">&#11015; JSON</button></span></div>'+
    '<div class="sx-filters">'+seg('range', [['7','7 days'],['30','30 days'],['90','90 days'],['all','All']])+
      '<select class="input sx-sel" data-sx="type">'+[['all','All types']].concat(Object.keys(SX_TYPES).filter(function(k){ return k!=='other'; }).map(function(k){ return [k, SX_TYPES[k][0]]; })).map(function(o){ return '<option value="'+o[0]+'"'+(f.type===o[0]?' selected':'')+'>'+o[1]+'</option>'; }).join('')+'</select>'+
      '<select class="input sx-sel" data-sx="sort">'+[['new','Newest first'],['old','Oldest first'],['long','Longest first'],['short','Shortest first']].map(function(o){ return '<option value="'+o[0]+'"'+(f.sort===o[0]?' selected':'')+'>'+o[1]+'</option>'; }).join('')+'</select>'+
      '<input class="input sx-q" id="sxSearch" placeholder="Search tasks and notes" value="'+escapeHtml(f.q||'')+'"></div>'+
    '<div class="sx-sum"><span><b>'+rows.length+'</b> entries</span><span><b>'+fmtDurationLabel(total)+'</b> total</span><span><b>'+fmtDurationLabel(deep.reduce(function(a, x){ return a+x.minutes; }, 0))+'</b> deep work in '+deep.length+' sessions</span></div>'+
    (rows.length ? '<div class="sx-list">'+shown.map(sessionRowHtml).join('')+'</div>'+(rows.length>shown.length ? '<div class="row" style="justify-content:center;margin-top:10px;"><button class="btn btn-ghost btn-sm" data-action="sxMore">Show more ('+(rows.length-shown.length)+')</button></div>' : '')
      : '<div class="empty">Nothing matches.</div>')+
  '</div>';
}
ACTIONS.openSessionsPage = function(){ ui.sessionsPage = true; ui.sxShow = 100; renderView(); const v = document.getElementById('viewRoot'); if(v) v.scrollTop = 0; };
ACTIONS.closeSessionsPage = function(){ ui.sessionsPage = false; renderView(); };
ACTIONS.sxSet = function(el, e, id){ ui.sx[el.dataset.k] = id; renderView(); };
ACTIONS.sxMore = function(){ ui.sxShow = (ui.sxShow||100) + 200; renderView(); };
document.addEventListener('change', function(e){ const t = e.target; if(t && t.dataset && t.dataset.sx && ui.sx){ ui.sx[t.dataset.sx] = t.value; renderView(); } });
document.addEventListener('input', function(e){ if(e.target && e.target.id==='sxSearch' && ui.sx){ ui.sx.q = e.target.value; clearTimeout(ui._sxT); ui._sxT = setTimeout(renderView, 180); } });
function sxExportRows(){ return sessionsFiltered().map(function(x){ return {date:x.date, start:x.start ? nowHM(new Date(x.start)) : '', end:x.end ? nowHM(new Date(x.end)) : '', type:(SX_TYPES[x.type]||SX_TYPES.other)[0], minutes:x.minutes, method:x.method, tasks_finished:x.tasks.join('; '), note:x.note, manual:x.manual}; }); }
function sxDownload(name, text, mime){
  const a = document.createElement('a'); a.href = URL.createObjectURL(new Blob([text], {type:mime})); a.download = name; document.body.appendChild(a); a.click();
  setTimeout(function(){ URL.revokeObjectURL(a.href); a.remove(); }, 500);
}
ACTIONS.sxCsv = function(){
  const rows = sxExportRows(), cols = ['date','start','end','type','minutes','method','tasks_finished','note','manual'];
  const esc = function(v){ v = String(v==null ? '' : v); return /[",\n]/.test(v) ? '"'+v.replace(/"/g, '""')+'"' : v; };
  sxDownload('operator-sessions-'+todayStr()+'.csv', cols.join(',')+'\n'+rows.map(function(r){ return cols.map(function(c){ return esc(r[c]); }).join(','); }).join('\n'), 'text/csv');
};
ACTIONS.sxJson = function(){ sxDownload('operator-sessions-'+todayStr()+'.json', JSON.stringify({exported:new Date().toISOString(), deepWorkTargetMinutes:state.standards.deepWorkTargetMinutes||180, sessions:sxExportRows()}, null, 2), 'application/json'); };
// a plain-text summary: the totals, the daily pattern, then every entry
ACTIONS.sxCopy = function(){
  const rows = sxExportRows(), f = ui.sx || {};
  const byDay = {}; rows.forEach(function(r){ if(r.type==='Deep work') byDay[r.date] = (byDay[r.date]||0) + r.minutes; });
  const days = Object.keys(byDay).sort();
  const total = days.reduce(function(a, d){ return a + byDay[d]; }, 0);
  const txt = 'Here is my work-session history from my productivity app (Operator). Please analyze my patterns: when I focus best, consistency, session lengths, and what to change.\n\n'+
    'Range: '+(f.range==='all' ? 'all time' : 'last '+(f.range||30)+' days')+' · Daily deep-work target: '+fmtDurationLabel(state.standards.deepWorkTargetMinutes||180)+'\n'+
    'Deep work: '+fmtDurationLabel(total)+' over '+days.length+' days ('+(days.length ? fmtDurationLabel(Math.round(total/days.length)) : '0m')+' per active day)\n\n'+
    'Deep work per day:\n'+days.map(function(d){ return d+': '+byDay[d]+' min'; }).join('\n')+'\n\n'+
    'All entries (date, start–end, type, minutes, method, tasks finished, note):\n'+
    rows.map(function(r){ return [r.date, r.start+(r.end ? '–'+r.end : ''), r.type, r.minutes+' min', r.method, r.tasks_finished, r.note].filter(function(x){ return x!==''; }).join(' | '); }).join('\n');
  const done = function(){ showToast('Copied '+rows.length+' entries.', {icon:'&#10024;'}); };
  try{ navigator.clipboard.writeText(txt).then(done, function(){ sxDownload('operator-sessions-summary.txt', txt, 'text/plain'); }); }catch(e){ sxDownload('operator-sessions-summary.txt', txt, 'text/plain'); }
};
