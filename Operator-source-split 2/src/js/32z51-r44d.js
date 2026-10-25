// ============ ROUND 44 (build 4d): TODAY AND THE CALENDAR, ON TOP OF HOW THEY LOOK ============
// Nothing restyled, only what was asked:
//  • Your Day: the times sit exactly under their marks (the sun is its own mark on the track), and what you
//    actually did today is colored on it: locked in, shooting, a break, and work time spent doing nothing.
//  • A past day on the Calendar shows its recap under the month: worked, locked in, shooting, idle, reels,
//    XP and what got done.
//  • This week / This month uses its space: four numbers above the goals.
//  • Locked in: a quote panel, the page uses a wide screen, and the little explainer lines are gone.

const R44_ACT = {locked:{c:'#E8A23D', l:'Locked in'}, shooting:{c:'#C58FFF', l:'Shooting'}, break:{c:'#8FDCFF', l:'Break'}, idle:{c:'#4A4F5E', l:'Not doing anything'}};
function r44Today(){ const t = todayStr(); const d0 = new Date(t+'T00:00').getTime(); return {t:t, d0:d0}; }
function r44DayActivity(ds){
  const d0 = new Date(ds+'T00:00').getTime(), d1 = d0 + 86400000, now = Date.now(), out = [];
  const clip = function(a, b, k){ a = Math.max(a, d0); b = Math.min(b, d1, now); if(b > a) out.push({a:(a - d0)/60000, b:(b - d0)/60000, k:k}); };
  arr(state.focus.sessions).forEach(function(s){ if(s.startedAt && s.endedAt) clip(s.startedAt, s.endedAt, 'locked'); });
  const as = state.focus.activeSession; if(as && as.startedAt) clip(as.startedAt, now, as.onBreak ? 'break' : 'locked');
  arr(state.modes.history).forEach(function(m){ if(m.startedAt && m.endedAt && (m.type==='shooting' || m.type==='break')) clip(m.startedAt, m.endedAt, m.type); });
  const am = state.modes.active; if(am && am.startedAt && (am.type==='shooting' || am.type==='break')) clip(am.startedAt, now, am.type);
  return out.sort(function(x, y){ return x.a - y.a; });
}
function r44Idle(ds, acts){
  const w = workHoursFor(ds); if(!w || !w.enabled || w.off || isDayOff(ds)) return [];
  if(ds===todayStr() ? !workDayToday() : arr(workCfg().days).indexOf(dowOf(ds))<0) return [];
  const s = hmMin(w.start), e = hmMin(w.end); if(s==null || e==null) return [];
  const end = ds===todayStr() ? Math.min(e, nowMin()) : e, gaps = []; let cur = s;
  acts.slice().sort(function(a, b){ return a.a - b.a; }).forEach(function(x){ if(x.b <= cur) return; if(x.a > cur && x.a < end) gaps.push({a:cur, b:Math.min(x.a, end), k:'idle'}); cur = Math.max(cur, x.b); });
  if(cur < end) gaps.push({a:cur, b:end, k:'idle'});
  // (lunch and planned breaks aren't idle)
  const skip = []; if(w.lunch) skip.push([hmMin(w.lunch), hmMin(w.lunch) + (Number(w.lunchMin)||45)]); if(w.brk) skip.push([hmMin(w.brk), hmMin(w.brk) + (Number(w.brkMin)||15)]);
  let res = gaps; skip.forEach(function(sk){ const n = []; res.forEach(function(g){ if(sk[1] <= g.a || sk[0] >= g.b) n.push(g); else { if(sk[0] > g.a) n.push({a:g.a, b:sk[0], k:'idle'}); if(sk[1] < g.b) n.push({a:sk[1], b:g.b, k:'idle'}); } }); res = n; });
  return res.filter(function(g){ return g.b - g.a >= 5; });
}
cxRibbonHtml = function(){
  const today = todayStr(), A = 5*60, B = 24*60, pct = function(m){ return Math.max(0, Math.min(100, (m - A)/(B - A)*100)); };
  const seg = function(a, b, cls, title, color, i){ if(a==null || b==null || b <= a) return ''; return '<i class="cx-seg '+cls+'" style="left:'+pct(a).toFixed(2)+'%;width:'+(pct(b) - pct(a)).toFixed(2)+'%;'+(color ? '--c:'+color+';' : '')+'animation-delay:'+(i*60)+'ms" title="'+escapeHtml(title)+'"></i>'; };
  let h = '', i = 0;
  const wt = typeof wakeTimeFor==='function' ? wakeTimeFor(today) : null, wm = hmMin(wt);
  if(wm!=null) h += seg(A, wm, 'is-sleep', 'Asleep until '+fmt12Hour(wt), null, i++);
  const w = typeof workToday==='function' ? workToday() : null, works = w && w.enabled && typeof workDayToday==='function' && workDayToday();
  if(works){
    h += seg(hmMin(w.start), hmMin(w.end), 'is-work', 'Work, '+fmt12Hour(w.start)+' to '+fmt12Hour(w.end), null, i++);
    if(w.lunch) h += seg(hmMin(w.lunch), hmMin(w.lunch) + (Number(w.lunchMin)||45), 'is-lunch', 'Lunch', null, i++);
    if(w.brk) h += seg(hmMin(w.brk), hmMin(w.brk) + (Number(w.brkMin)||15), 'is-lunch', 'Break', null, i++);
  }
  arr(state.calendar.events).filter(function(e){ return e.date===today && e.time; }).forEach(function(e){ const m = hmMin(e.time); h += seg(m, m + 60, 'is-event', e.title+', '+fmt12Hour(e.time), (categoryById(e.categoryId)||{}).color, i++); });
  const acts = r44DayActivity(today), idle = r44Idle(today, acts), used = {};
  acts.concat(idle).forEach(function(x){ used[x.k] = 1; h += seg(x.a, x.b, 'is-act', R44_ACT[x.k].l, R44_ACT[x.k].c, i++); });
  const n = nowMin(), marks = [];
  if(works){ marks.push([hmMin(w.start), fmt12Hour(w.start)]); marks.push([hmMin(w.end), fmt12Hour(w.end)]); }
  if(wm!=null) marks.push([wm, fmt12Hour(wt), 'sun']);
  if(n >= A) marks.push([n, fmt12Hour(pad2(Math.floor(n/60))+':'+pad2(n % 60)), 'now']);
  marks.sort(function(a, b){ return a[0] - b[0]; });
  // labels that would land on each other: now wins, then the sun
  const keep = []; marks.forEach(function(m){ const prev = keep[keep.length - 1]; if(prev && pct(m[0]) - pct(prev[0]) < 11){ if(m[2]==='now' || (m[2]==='sun' && prev[2]!=='now')) keep[keep.length - 1] = m; return; } keep.push(m); });
  const lbl = function(m){ const p = pct(m[0]), edge = p < 6 ? ' is-l' : p > 94 ? ' is-r' : '';
    return '<span class="r44-mk'+edge+(m[2]==='now' ? ' is-now' : '')+'" style="left:'+p.toFixed(2)+'%">'+(m[2]==='sun' ? '<svg viewBox="0 0 24 24" width="11" height="11" aria-hidden="true"><circle cx="12" cy="12" r="4.5" fill="#F3C988"/><path d="M12 2v2.5M12 19.5V22M2 12h2.5M19.5 12H22M4.9 4.9l1.8 1.8M17.3 17.3l1.8 1.8M4.9 19.1l1.8-1.8M17.3 6.7l1.8-1.8" stroke="#F3C988" stroke-width="2" stroke-linecap="round"/></svg>' : '')+m[1]+'</span>'; };
  const ticks = keep.filter(function(m){ return m[2]!=='now'; }).map(function(m){ return '<b class="r44-tick" style="left:'+pct(m[0]).toFixed(2)+'%"></b>'; }).join('');
  const legend = Object.keys(R44_ACT).filter(function(k){ return used[k]; });
  return '<div class="cx-ribbon r44-rib"><div class="cx-track">'+h+ticks+(n >= A ? '<b class="cx-nowline" style="left:'+pct(n).toFixed(2)+'%"></b>' : '')+'</div>'+
    '<div class="cx-marks r44-marks">'+keep.map(lbl).join('')+'</div>'+
    (legend.length ? '<div class="r44-leg2">'+legend.map(function(k){ return '<span><i style="background:'+R44_ACT[k].c+'"></i>'+R44_ACT[k].l+'</span>'; }).join('')+'</div>' : '')+'</div>';
};
// ---- a past day: its recap under the month ----
cxAgendaHtml = (function(base){
  return function(ds){
    const h = base.apply(this, arguments);
    if(!ds || ds >= todayStr()) return h;
    const acts = r44DayActivity(ds), idle = r44Idle(ds, acts), sum = function(list, k){ return list.filter(function(x){ return !k || x.k===k; }).reduce(function(s, x){ return s + (x.b - x.a); }, 0); };
    const locked = Math.max(sum(acts, 'locked'), deepWorkMinutesFor(ds)), shoot = sum(acts, 'shooting'), idleM = sum(idle);
    let reels = 0; arr(state.business && state.business.clients).forEach(function(c){ arr(c.deliverables).forEach(function(d){ arr(d.completedDates).forEach(function(x){ if(x===ds) reels++; }); }); });
    let xp = 0; try{ xpSummary(); xp = (xpCache.days[ds] || xpDay(ds, xpCtx())).reduce(function(s, x){ return s + x.xp; }, 0); }catch(e){}
    const done = state.tasks.items.filter(function(t){ return t.status==='done' && t.completedAt===ds; }).map(function(t){ return t.title; });
    if(arr(state.health.gymLog).some(function(g){ return g.date===ds; })) done.push('Gym');
    if(!locked && !shoot && !reels && !done.length && !xp) return h;
    const stat = function(k, v, c){ return '<div class="r44-rs"><small>'+k+'</small><b'+(c ? ' style="color:'+c+'"' : '')+'>'+v+'</b></div>'; };
    const recap = '<div class="r44-recap"><div class="r44-rgrid">'+stat('Worked', fmtDurationLabel(Math.round(locked + shoot)))+stat('Locked in', fmtDurationLabel(Math.round(locked)), '#F3C988')+
      (shoot ? stat('Shooting', fmtDurationLabel(Math.round(shoot)), '#E2C4FF') : '')+(idleM ? stat('Idle', fmtDurationLabel(Math.round(idleM))) : '')+(reels ? stat('Reels', reels, '#8FE3DA') : '')+(xp ? stat('XP', '+'+xp.toLocaleString(), '#7CF0C4') : '')+'</div>'+
      (done.length ? '<div class="r44-rdone"><span>Done</span>'+done.slice(0, 6).map(function(t){ return '<em>'+escapeHtml(t)+'</em>'; }).join('')+(done.length > 6 ? '<em>+'+(done.length - 6)+'</em>' : '')+'</div>' : '')+'</div>';
    return h.replace('<div class="cx-ag-list">', recap+'<div class="cx-ag-list">');
  };
})(cxAgendaHtml);
// ---- This week / This month: the numbers above the goals ----
cxTierCardHtml = (function(base){
  return function(){
    const h = base.apply(this, arguments), t = ui.cxTier==='month' ? 'month' : 'week', today = todayStr();
    const from = t==='week' ? startOfWeekStr(today) : today.slice(0, 8)+'01';
    let deep = 0, wk = 0; for(let d = from; d <= today; d = addDays(d, 1)){ deep += Math.max(d===today ? deepWorkMinutesTodayLive() : deepWorkMinutesFor(d), r44DayActivity(d).filter(function(x){ return x.k==='locked'; }).reduce(function(a, x){ return a + x.b - x.a; }, 0)); wk += workoutDay(d).n; }
    const wkT = t==='week' ? (state.profile.weeklyWorkoutTarget || 4) : Math.round((state.profile.weeklyWorkoutTarget || 4)*4.3);
    let reels = 0; arr(state.business && state.business.clients).forEach(function(c){ arr(c.deliverables).forEach(function(d){ arr(d.completedDates).forEach(function(x){ if(x >= from && x <= today) reels++; }); }); });
    const gs = typeof tierGoals==='function' ? tierGoals(t, periodKey(t)) : [], hit = gs.filter(function(g){ return g.done; }).length;
    const st = function(k, v){ return '<div class="r44-ts"><small>'+k+'</small><b>'+v+'</b></div>'; };
    const grid = '<div class="r44-tstats">'+st('Deep', (Math.round(deep/6)/10)+'h')+st('Gym', wk+' / '+wkT)+(r43ClientsOn() ? st('Reels', reels) : st('Tasks', state.tasks.items.filter(function(x){ return x.status==='done' && x.completedAt >= from && x.completedAt <= today; }).length))+st('Goals', hit+' / '+gs.length)+'</div>';
    return h.replace('<div class="cx-tierbody"', grid+'<div class="cx-tierbody"');
  };
})(cxTierCardHtml);
// ---- Locked in: a quote, the wide screen, no explainer lines ----
function r44Quote(){ const list = [].concat(typeof WORK_QUOTES!=='undefined' ? WORK_QUOTES : [], typeof ACTION_QUOTES!=='undefined' ? ACTION_QUOTES : []); if(!list.length) return null; const seed = Number(todayStr().replace(/-/g, '')) + (ui.r44QuoteN || 0); return list[seed % list.length]; }
LOCKED_BLOCKS.quote = {label:'Quote', render:function(){
  const q = r44Quote(); if(!q) return '';
  return '<section class="r44-quote" data-action="r44NextQuote" title="Another one"><span class="r44-qk">Today’s line</span><b>“'+escapeHtml(q[0])+'”</b>'+(q[1] ? '<small>'+escapeHtml(q[1])+'</small>' : '')+'</section>';
}};
ACTIONS.r44NextQuote = function(){ ui.r44QuoteN = (ui.r44QuoteN || 0) + 1; renderView(); };
lockedLayout = (function(base){
  return function(){
    const saved = state.profile.lockedLayout;
    if(saved && Array.isArray(saved.order) && !saved.quoteAdded){ const i = saved.order.indexOf('timer'); if(saved.order.indexOf('quote')<0) saved.order.splice(i >= 0 ? i + 1 : 1, 0, 'quote'); saved.quoteAdded = true; persist('profile'); }
    const o = base.apply(this, arguments);
    if(!saved && o.indexOf('quote')<0){ const i = o.indexOf('timer'); o.splice(i >= 0 ? i + 1 : 1, 0, 'quote'); }
    return o;
  };
})(lockedLayout);
LOCKED_BLOCKS.stats.render = (function(base){ return function(){ return base.apply(this, arguments).replace(/<div class="kpi-sub">rest days still count<\/div>/, '').replace('style="max-width:800px;margin:0 auto;"', ''); }; })(LOCKED_BLOCKS.stats.render);
