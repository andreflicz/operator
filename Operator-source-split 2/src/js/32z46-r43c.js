// ============ ROUND 43 (build 3c): THE GOALS PAGE ============
// Master goals across the top (targets go up 10% when you hit them), then the month and the week side by
// side, each with its line, then your own goals as big cards, just as big as the master ones. Every goal is
// completed by holding for 1.2 seconds, and hitting one gets its moment. Plan next week from Thursday and
// next month from the 20th. Numbers goals track themselves from the app and draw a graph.

// ---- hold to complete ----
function r43HoldHtml(act, id, label, cls){ return '<button type="button" class="r43-hold'+(cls ? ' '+cls : '')+'" data-hold-act="'+act+'" data-id="'+escapeHtml(id)+'"><i class="r43-hold-f"></i><span class="r43-hold-l">'+(label || 'Hold to complete')+'</span></button>'; }
(function(){
  let cur = null;
  const stop = function(){ if(!cur) return; clearTimeout(cur.t); cur.el.classList.remove('is-holding'); const l = cur.el.querySelector('.r43-hold-l'); if(l && cur.label!=null) l.textContent = cur.label; cur = null; };
  document.addEventListener('pointerdown', function(e){
    const b = e.target.closest && e.target.closest('.r43-hold'); if(!b || b.disabled || e.button > 0) return;
    e.preventDefault(); stop();
    const l = b.querySelector('.r43-hold-l');
    cur = {el:b, label:l ? l.textContent : null};
    b.style.setProperty('--hold', XP_BOOK.goals.hold+'ms'); b.classList.add('is-holding');
    if(l && b.classList.contains('is-wide')) l.textContent = 'Keep holding…';
    cur.t = setTimeout(function(){
      const el = cur && cur.el; if(!el) return; cur = null;
      el.classList.remove('is-holding'); el.classList.add('is-done');
      const fn = ACTIONS[el.dataset.holdAct]; if(fn) fn(el, null, el.dataset.id);
    }, XP_BOOK.goals.hold);
  });
  ['pointerup', 'pointercancel'].forEach(function(k){ document.addEventListener(k, stop); });
  document.addEventListener('pointerout', function(e){ if(cur && e.target===cur.el && !cur.el.contains(e.relatedTarget)) stop(); });
  // (the keyboard: hold Space or Enter)
  document.addEventListener('keydown', function(e){ const b = document.activeElement; if(!b || !b.classList || !b.classList.contains('r43-hold') || (e.key!==' ' && e.key!=='Enter') || e.repeat) return; e.preventDefault(); b.dispatchEvent(new PointerEvent('pointerdown', {bubbles:true})); });
  document.addEventListener('keyup', function(e){ if(e.key===' ' || e.key==='Enter') stop(); });
})();

// completing: weekly / monthly goals and your own, with the moment
ACTIONS.r43GoalDone = function(el, e, id){
  const g = state.goals.items.find(function(x){ return x.id===id; }); if(!g || g.done) return;
  if(g.tier && checkedOut(g.tier, g.pk)){ showToast('That '+(g.tier==='month' ? 'month' : 'week')+' is checked out. It’s on the record.', {icon:'&#128274;'}); return; }
  xpLast = null; const before = xpSummary();
  g.done = true; g.missed = false; g.doneAt = todayStr(); persist('goals');
  xpLast = null; const after = xpSummary();
  if(after.total > before.total){ xpSeen().total = after.total; persist('profile'); }
  playSessionComplete();
  r43GoalFx(g, Math.max(0, after.total - before.total), before, after);
  setTimeout(renderView, 60);
};
ACTIONS.r43GoalUndo = function(el, e, id){
  const g = state.goals.items.find(function(x){ return x.id===id; }); if(!g || !g.done) return;
  if(g.tier && checkedOut(g.tier, g.pk)){ showToast('Checked out: reopen the '+(g.tier==='month' ? 'month' : 'week')+' first.', {icon:'&#128274;'}); return; }
  g.done = false; g.doneAt = null; persist('goals'); xpLast = null; playTick(); renderView();
  showToast('Undone. Its XP came back off.', {icon:'&#8634;'});
};
// (a single click never completes a goal any more)
toggleGoal = (function(base){
  return function(id){
    const g = state.goals.items.find(function(x){ return x.id===id; });
    if(g && !g.done){ showToast('Hold to complete.', {icon:'&#9995;'}); return; }
    return base.apply(this, arguments);
  };
})(toggleGoal);
ACTIONS.tierGoalToggle = (function(base){
  return function(el, e, id){
    const g = arr(state.goals.items).find(function(x){ return x.id===id; });
    if(g && !g.done){ showToast('Hold to complete.', {icon:'&#9995;'}); return; }
    return base.apply(this, arguments);
  };
})(ACTIONS.tierGoalToggle);
tierGoalRowHtml = (function(base){
  return function(g){
    let h = base.apply(this, arguments);
    if(!g.done && !checkedOut(g.tier, g.pk)) h = h.replace('<button class="tg-hit" data-action="tierGoalToggle"', '<button class="tg-hit r43-hold is-row" data-hold-act="r43GoalDone"').replace('<span class="tg-box">', '<i class="r43-hold-f"></i><span class="tg-box">');
    return h.replace(/ title="[^"]*"(?=>\+)/, '');
  };
})(tierGoalRowHtml);

// the moment: confetti, the tick, what it paid, the level bar moving
function r43GoalFx(g, gained, before, after){
  const old = document.getElementById('r43GoalFx'); if(old) old.remove();
  const where = g.tier==='week' ? 'This week' : g.tier==='month' ? monthName(g.pk) : g.life ? 'Life milestone' : 'Your goal';
  let left = '';
  if(g.tier){ const gs = tierGoals(g.tier, g.pk), d = gs.filter(function(x){ return x.done; }).length, n = gs.length - d; left = d+' of '+gs.length+' '+(g.tier==='month' ? monthName(g.pk) : 'weekly')+' goals done.'+(n===0 ? (gs.length >= 2 ? ' Clean sweep.' : '') : n===1 ? ' One left.' : ' '+n+' left.'); }
  const p0 = before.levelPct, up = after.level > before.level || after.canLevel && !before.canLevel;
  const d = document.createElement('div'); d.id = 'r43GoalFx'; d.className = 'r43-gfx'+(g.life ? ' is-life' : '');
  const conf = Array.from({length:18}, function(_, i){ return '<i style="--i:'+i+';--x:'+(Math.round(Math.cos(i*2.1)*220))+'px;--y:'+(-120 - (i*37 % 160))+'px;--r:'+(i*47 % 360)+'deg;--c:'+['#3FBE8E', '#FFB86B', '#8FDCFF', '#C58FFF', '#F2E27A'][i % 5]+'"></i>'; }).join('');
  d.innerHTML = '<div class="r43-gfx-c"><div class="r43-gfx-conf">'+conf+'</div><div class="r43-gfx-tick">&#10003;</div>'+
    '<div class="r43-gfx-k">Goal hit · '+escapeHtml(where)+'</div><div class="r43-gfx-t">'+escapeHtml(goalTitle(g))+'</div>'+
    (gained ? '<div class="r43-gfx-xp">+'+gained.toLocaleString()+' XP</div>' : '')+
    '<div class="r43-gfx-lv"><div><span>Level '+after.level+'</span><span>'+(after.canLevel ? 'Level '+(after.level+1)+' is ready' : (after.levelHi - after.total).toLocaleString()+' to level '+(after.level+1))+'</span></div><i><u style="width:'+(p0*100).toFixed(1)+'%" data-to="'+(after.levelPct*100).toFixed(1)+'"></u></i></div>'+
    (left ? '<div class="r43-gfx-l">'+escapeHtml(left)+'</div>' : '')+'</div>';
  document.body.appendChild(d);
  requestAnimationFrame(function(){ d.classList.add('is-in'); setTimeout(function(){ const u = d.querySelector('.r43-gfx-lv u'); if(u) u.style.width = u.dataset.to+'%'; }, 450); });
  if(typeof tone==='function'){ tone([523, 659], 0.25, 0.16); setTimeout(function(){ tone([784, 1047], 0.6, 0.18); }, 180); }
  const close = function(){ if(!d.parentNode) return; d.classList.add('is-out'); setTimeout(function(){ if(d.parentNode) d.remove(); }, 400); };
  d.addEventListener('click', close); setTimeout(close, up ? 3200 : 2800);
}

// ---- new trackers: new clients (reactivated don't count, and you can fix the count), reels, posts ----
GOAL_TRACKERS.newclients = {icon:'&#129309;', label:'New clients', unit:'clients', src:'from Business → Clients (reactivated ones don’t count)', periods:true, name:function(g){ return fmtGoalNum(g.target)+' new clients '+goalPeriodLabel(g); }};
GOAL_TRACKERS.reels = {icon:'&#127916;', label:'Deliverables', unit:'delivered', src:'from client deliverables', periods:true, name:function(g){ return fmtGoalNum(g.target)+' delivered '+goalPeriodLabel(g); }};
GOAL_TRACKERS.posts = {icon:'&#128248;', label:'Videos posted', unit:'videos', src:'from your finished videos', periods:true, name:function(g){ return fmtGoalNum(g.target)+' videos '+goalPeriodLabel(g); }};
function r43NewClientsIn(from, to){ return arr(state.business && state.business.clients).filter(function(c){ const d = c.startDate || (c.fromLeadId ? c.createdAt : null) || c.createdAt; return d && d >= from && d <= to && !c.reactivated; }); }
function r43PeriodRange(g){
  if(g.tier && g.pk) return [g.tier==='week' ? g.pk : g.pk+'-01', periodEnd(g.tier, g.pk)];
  return goalRange(g);
}
function r43TrackDay(kind, d){
  if(kind==='hours') return (d===todayStr() ? deepWorkMinutesTodayLive() : deepWorkMinutesFor(d))/60;
  if(kind==='workouts') return workoutDay(d).n;
  if(kind==='reels'){ let n = 0; arr(state.business.clients).forEach(function(c){ arr(c.deliverables).forEach(function(dv){ arr(dv.completedDates).forEach(function(x){ if(x===d) n++; }); }); }); return n; }
  if(kind==='posts') return state.tasks.items.filter(function(t){ return t.isVideoIdea && t.status==='done' && t.completedAt===d; }).length;
  if(kind==='newclients') return r43NewClientsIn(d, d).length;
  return 0;
}
goalLiveCurrentRaw = (function(base){
  return function(g){
    if(g && ['newclients', 'reels', 'posts', 'hours', 'workouts'].indexOf(g.autoTrack)>=0 && (g.tier || g.autoTrack==='newclients' || g.autoTrack==='reels' || g.autoTrack==='posts')){
      if(g.autoTrack==='newclients' && g.countFix!=null) return Number(g.countFix);
      const r = r43PeriodRange(g), to = r[1] < todayStr() ? r[1] : todayStr();
      const v = sumOverDays(r[0], to, function(d){ return r43TrackDay(g.autoTrack, d); });
      return g.autoTrack==='hours' ? Math.round(v*10)/10 : v;
    }
    return base.apply(this, arguments);
  };
})(goalLiveCurrentRaw);
// a tracked weekly / monthly goal ticks itself when it's reached (it's the app's own numbers)
afterRenderHooks.push(function(){
  if(!state.goals) return; let n = 0;
  state.goals.items.forEach(function(g){ if(!g.tier || g.done || !g.autoTrack || !(g.target > 0) || checkedOut(g.tier, g.pk) || g.pk!==periodKey(g.tier)) return; if(goalLiveCurrentRaw(g) >= g.target){ g.done = true; g.doneAt = todayStr(); n++; } });
  if(n){ persist('goals'); xpLast = null; playSessionComplete(); setTimeout(renderView, 30); }
});
// new clients this month: reactivated clients never count as new, and the count can be fixed by hand
mgMonthlyDefs = (function(base){
  return function(){
    const out = base.apply(this, arguments), mk = thisMonthKey(), fix = (state.profile.newClientsFix || {})[mk];
    out.forEach(function(m){ if(m.key!=='newclients') return; const list = r43NewClientsIn(mk+'-01', periodEnd('month', mk)); m.cur = fix!=null ? Number(fix) : list.length; m.names = list.map(function(c){ return c.business || c.name; }); m.fixed = fix!=null; });
    return out;
  };
})(mgMonthlyDefs);

// ---- fix a count: who counts as new, or the number yourself ----
ACTIONS.r43FixCount = function(el, e, id){ ui.r43Fix = id || 'master'; r43FixOpen(); };
function r43FixOpen(){
  let o = document.getElementById('r43FixOverlay');
  if(!o){ o = document.createElement('div'); o.id = 'r43FixOverlay'; o.className = 'overlay r43-sheet-ov'; o.innerHTML = '<div class="card r43-sheet" id="r43FixC"></div>'; document.body.appendChild(o); o.addEventListener('pointerdown', function(ev){ if(ev.target===o) o.classList.add('hidden'); }); }
  const id = ui.r43Fix, g = id==='master' ? null : state.goals.items.find(function(x){ return x.id===id; });
  const mk = thisMonthKey(), r = g ? r43PeriodRange(g) : [mk+'-01', periodEnd('month', mk)];
  const all = arr(state.business.clients).filter(function(c){ const d = c.startDate || c.createdAt; return d && d >= r[0] && d <= r[1]; });
  const fix = g ? g.countFix : (state.profile.newClientsFix || {})[mk];
  const auto = all.filter(function(c){ return !c.reactivated; }).length, shown = fix!=null ? Number(fix) : auto;
  const target = g ? g.target : (mgMonthlyDefs().find(function(m){ return m.key==='newclients'; }) || {}).target;
  document.getElementById('r43FixC').innerHTML = '<button class="int-x hs-x" data-action="r43FixClose">&#10005;</button>'+
    '<div class="r43-sh-k">Fix a count · '+escapeHtml(g ? goalTitle(g) : 'New clients this month')+'</div>'+
    '<div class="r43-fix-n"><b>'+shown+'</b><span>of '+(target || '–')+(fix!=null ? ' · set by you' : '')+'</span></div>'+
    (all.length ? all.map(function(c){ const re = !!c.reactivated; return '<div class="r43-fix-r'+(re ? ' is-re' : '')+'"><div><b>'+escapeHtml(c.business || c.name || 'Client')+'</b><small>'+(re ? 'Worked together before' : 'Signed '+fmtDateShort(c.startDate || c.createdAt)+' · counts as new')+'</small></div><span>'+(re ? 'Reactivated' : 'New')+'</span><button class="r43-sw'+(re ? ' is-on' : '')+'" role="switch" aria-checked="'+re+'" aria-label="Reactivated, not new" data-action="r43Reactivate" data-id="'+c.id+'"><span></span></button></div>'; }).join('') : '<div class="r43-sh-p">No clients started in this period.</div>')+
    '<div class="r43-fix-own"><span>Or set the number yourself</span><button class="btn btn-ghost btn-sm" data-action="r43FixStep" data-id="-1" aria-label="One less">&minus;</button><b>'+shown+'</b><button class="btn btn-ghost btn-sm" data-action="r43FixStep" data-id="1" aria-label="One more">+</button>'+(fix!=null ? '<button class="r43-link" data-action="r43FixStep" data-id="auto">Back to automatic</button>' : '')+'</div>';
  o.classList.remove('hidden');
}
ACTIONS.r43FixClose = function(){ const o = document.getElementById('r43FixOverlay'); if(o) o.classList.add('hidden'); renderView(); };
ACTIONS.r43Reactivate = function(el, e, id){ const c = arr(state.business.clients).find(function(x){ return x.id===id; }); if(!c) return; c.reactivated = !c.reactivated; persist('business'); xpLast = null; r43FixOpen(); };
ACTIONS.r43FixStep = function(el, e, id){
  const g = ui.r43Fix==='master' ? null : state.goals.items.find(function(x){ return x.id===ui.r43Fix; }), mk = thisMonthKey();
  const fixes = state.profile.newClientsFix = state.profile.newClientsFix || {};
  const cur = g ? (g.countFix!=null ? g.countFix : goalLiveCurrentRaw(Object.assign({}, g, {countFix:null}))) : (fixes[mk]!=null ? fixes[mk] : r43NewClientsIn(mk+'-01', periodEnd('month', mk)).length);
  const v = id==='auto' ? null : Math.max(0, Number(cur) + Number(id));
  if(g){ if(v==null) delete g.countFix; else g.countFix = v; persist('goals'); } else { if(v==null) delete fixes[mk]; else fixes[mk] = v; persist('profile'); }
  xpLast = null; r43FixOpen();
};

// ---- a numbers goal, up close: the graph against the pace line ----
ACTIONS.r43GoalOpen = function(el, e, id){ ui.r43Detail = id; r43DetailOpen(); };
function r43DetailOpen(){
  const g = state.goals.items.find(function(x){ return x.id===ui.r43Detail; }); if(!g) return;
  let o = document.getElementById('r43DetOverlay');
  if(!o){ o = document.createElement('div'); o.id = 'r43DetOverlay'; o.className = 'overlay r43-sheet-ov'; o.innerHTML = '<div class="card r43-sheet is-wide" id="r43DetC"></div>'; document.body.appendChild(o); o.addEventListener('pointerdown', function(ev){ if(ev.target===o) o.classList.add('hidden'); }); }
  const T = goalTracker(g), r = r43PeriodRange(g), today = todayStr(), kind = g.autoTrack;
  const unit = kind==='hours' ? 'h' : '', cur = goalLiveCurrentRaw(g), target = Number(g.target) || 0;
  const days = []; for(let d = r[0]; d <= r[1]; d = addDays(d, 1)) days.push(d);
  let run = 0; const pts = []; let best = 0;
  days.forEach(function(d){ if(d > today) return; const v = kind && ['hours', 'workouts', 'reels', 'posts', 'newclients'].indexOf(kind)>=0 ? r43TrackDay(kind, d) : 0; best = Math.max(best, v); run += v; pts.push(run); });
  if(g.countFix!=null && pts.length) pts[pts.length-1] = Number(g.countFix);
  const n = days.length, W = 460, Hh = 200, x0 = 34, y0 = 186, top = Math.max(target, run, 1)*1.05;
  const X = function(i){ return x0 + (W - x0 - 10)*i/Math.max(1, n - 1); }, Y = function(v){ return y0 - (y0 - 18)*v/top; };
  const left = Math.max(0, days.filter(function(d){ return d >= today; }).length), need = Math.max(0, target - cur);
  const paceNow = target*(pts.length/n);
  const fmt = function(v){ return unit==='h' ? (Math.round(v*10)/10)+'h' : fmtGoalNum(Math.round(v*10)/10); };
  const svg = '<svg viewBox="0 0 '+W+' 220" width="100%" role="img" aria-label="'+escapeHtml(goalTitle(g))+': '+fmt(cur)+' of '+fmt(target)+'">'+
    '<line x1="'+x0+'" y1="'+y0+'" x2="'+(W-10)+'" y2="'+y0+'" class="r43-ax"/><line x1="'+x0+'" y1="'+Y(target)+'" x2="'+(W-10)+'" y2="'+Y(target)+'" class="r43-gl"/>'+
    '<text x="0" y="'+(Y(target)+4)+'" class="r43-tx">'+fmt(target)+'</text><text x="12" y="'+(y0+4)+'" class="r43-tx">0</text>'+
    '<line x1="'+X(0)+'" y1="'+y0+'" x2="'+X(n-1)+'" y2="'+Y(target)+'" class="r43-pace"/>'+
    (pts.length ? '<polyline fill="none" class="r43-pl" points="'+pts.map(function(v, i){ return X(i).toFixed(1)+','+Y(v).toFixed(1); }).join(' ')+'"/><circle cx="'+X(pts.length-1).toFixed(1)+'" cy="'+Y(pts[pts.length-1]).toFixed(1)+'" r="5" class="r43-dot"/>'+
      '<text x="'+Math.min(W - 90, X(pts.length-1) + 8).toFixed(1)+'" y="'+(Y(pts[pts.length-1]) - 6).toFixed(1)+'" class="r43-tx is-v">'+fmt(cur)+' today</text>' : '')+
    '<text x="'+x0+'" y="212" class="r43-tx">'+fmtDateShort(r[0])+'</text><text x="'+(W - 50)+'" y="212" class="r43-tx">'+fmtDateShort(r[1])+'</text></svg>';
  const kinds = ['hours', 'workouts'].concat(r43ClientsOn() ? ['reels', 'newclients'] : [], ['posts']);
  document.getElementById('r43DetC').innerHTML = '<button class="int-x hs-x" data-action="r43DetClose">&#10005;</button>'+
    '<div class="r43-sh-k">Numbers goal'+(T ? ' · '+escapeHtml(T.src.replace(/^from /, 'from ')) : '')+'</div>'+
    '<div class="r43-det-t">'+escapeHtml(goalTitle(g))+'</div>'+
    (T ? '<div class="r43-det-n"><b>'+fmt(cur)+'</b><span>of '+fmt(target)+(g.done ? ' · done' : pts.length < n ? ' · on pace needs '+fmt(paceNow)+' by today' : '')+'</span></div><figure class="r43-det-g">'+svg+'</figure>'+
      '<div class="r43-det-s"><div><small>Per day needed</small><b>'+(left && need ? fmt(need/left) : '–')+'</b></div><div><small>Best day</small><b>'+fmt(best)+'</b></div><div><small>XP at goal</small><b>+'+goalXpOf(g).toLocaleString()+'</b></div></div>'
      : '')+
    (g.done ? '' : '<div class="r43-det-src"><span>Track it from</span><div>'+kinds.map(function(k){ return '<button class="r43-chip'+(kind===k ? ' is-on' : '')+'" data-action="r43SetTrack" data-id="'+k+'">'+GOAL_TRACKERS[k].label+'</button>'; }).join('')+'<button class="r43-chip'+(!kind ? ' is-on' : '')+'" data-action="r43SetTrack" data-id="own">I’ll log it myself</button></div>'+
      (kind && !(g.target > 0) ? '' : '')+'<label class="r43-det-tg"><span>Target</span><input class="input" type="number" min="1" step="any" id="r43DetTarget" value="'+(target || '')+'"><button class="btn btn-sm" data-action="r43SetTarget">Save</button></label></div>');
  o.classList.remove('hidden');
}
ACTIONS.r43DetClose = function(){ const o = document.getElementById('r43DetOverlay'); if(o) o.classList.add('hidden'); renderView(); };
ACTIONS.r43SetTrack = function(el, e, id){
  const g = state.goals.items.find(function(x){ return x.id===ui.r43Detail; }); if(!g) return;
  if(id==='own'){ g.autoTrack = null; g.period = null; } else { g.autoTrack = id; g.period = g.tier || null; g.unit = GOAL_TRACKERS[id].unit; if(!(g.target > 0)) g.target = id==='hours' ? (g.tier==='week' ? 20 : 80) : id==='workouts' ? (g.tier==='week' ? 4 : 16) : 2; }
  persist('goals'); xpLast = null; r43DetailOpen();
};
ACTIONS.r43SetTarget = function(){
  const g = state.goals.items.find(function(x){ return x.id===ui.r43Detail; }), i = document.getElementById('r43DetTarget'); if(!g || !i) return;
  const v = Number(i.value); if(!(v > 0)){ i.focus(); return; }
  g.target = v; persist('goals'); xpLast = null; r43DetailOpen();
};

// ---- the sheet for a new goal: area, a number you set (or Op's), life milestones, tracked numbers ----
goalSheetHtml = (function(base){
  return function(){
    const h = base.apply(this, arguments), k = ui.gsKind || 'week';
    const tpl = document.createElement('template'); tpl.innerHTML = h; const root = tpl.content;
    const body = root.querySelector('.gs-body'); if(!body) return h;
    let extra = '';
    if(k!=='long'){
      const kinds = ['hours', 'workouts'].concat(r43ClientsOn() ? ['reels', 'newclients'] : [], ['posts']), cur = ui.gsTierTrack || 'own';
      extra += '<div class="r43-gs-row"><span>Track it from</span><div class="r43-gs-chips">'+kinds.map(function(x){ return '<button type="button" class="r43-chip'+(cur===x ? ' is-on' : '')+'" data-action="r43GsTrack" data-id="'+x+'">'+GOAL_TRACKERS[x].label+'</button>'; }).join('')+'<button type="button" class="r43-chip'+(cur==='own' ? ' is-on' : '')+'" data-action="r43GsTrack" data-id="own">Done or not</button></div></div>'+
        (cur!=='own' ? '<label class="r43-gs-row"><span>Target ('+escapeHtml(GOAL_TRACKERS[cur].unit)+')</span><input class="input" type="number" min="1" step="any" id="r43GsTarget" placeholder="'+(cur==='hours' ? (k==='week' ? '20' : '80') : cur==='workouts' ? (k==='week' ? '4' : '16') : '2')+'"></label>' : '');
    } else {
      extra += '<label class="r43-gs-life"><button type="button" class="r43-sw'+(ui.gsLife ? ' is-on' : '')+'" role="switch" aria-checked="'+!!ui.gsLife+'" data-action="r43GsLife"><span></span></button><span><b>Life milestone</b><small>A first or a once-in-a-life thing: first car, first home, graduating, first hire</small></span></label>';
    }
    const areas = r43Areas();
    if(areas.length > 1) extra += '<div class="r43-gs-row"><span>Area</span><div class="r43-gs-chips"><button type="button" class="r43-chip'+(!ui.gsArea ? ' is-on' : '')+'" data-action="r43GsArea" data-id="">Op picks</button>'+areas.map(function(a){ return '<button type="button" class="r43-chip'+(ui.gsArea===a.id ? ' is-on' : '')+'" style="--ac:'+r43AreaColor(a.id)+'" data-action="r43GsArea" data-id="'+a.id+'">'+escapeHtml(a.name)+'</button>'; }).join('')+'</div></div>';
    const band = XP_BOOK.goals[k==='long' ? (ui.gsLife ? 'life' : 'long') : k];
    extra += '<label class="r43-gs-row"><span>XP</span><input class="input r43-gs-xp" type="number" step="5" id="r43GsXp" placeholder="Op sets it ('+band[0].toLocaleString()+'–'+band[1].toLocaleString()+')"></label>';
    const have = body.querySelector('.gs-have'); if(have) have.insertAdjacentHTML('beforebegin', extra); else body.insertAdjacentHTML('beforeend', extra);
    const xp = root.querySelector('.gs-xp'); if(xp) xp.remove();
    return tpl.innerHTML;
  };
})(goalSheetHtml);
function r43GsKeep(fn){ const ids = ['gsLabel', 'gsTarget', 'gsUnit', 'gsCurrent', 'gsDeadline', 'r43GsTarget', 'r43GsXp'], v = {}; ids.forEach(function(i){ const el = document.getElementById(i); if(el) v[i] = el.value; }); fn(); goalSheetRefresh(); ids.forEach(function(i){ const el = document.getElementById(i); if(el && v[i]!=null) el.value = v[i]; }); }
ACTIONS.r43GsTrack = function(el, e, id){ r43GsKeep(function(){ ui.gsTierTrack = id; }); };
ACTIONS.r43GsArea = function(el, e, id){ r43GsKeep(function(){ ui.gsArea = id || null; }); };
ACTIONS.r43GsLife = function(){ r43GsKeep(function(){ ui.gsLife = !ui.gsLife; }); };
openGoalSheet = (function(base){ return function(){ ui.gsTierTrack = null; ui.gsArea = null; ui.gsLife = false; ui.r43GsFor = ui.r43GsForNext || null; ui.r43GsForNext = null; return base.apply(this, arguments); }; })(openGoalSheet);
ACTIONS.gsSave = (function(base){
  return function(){
    const k = ui.gsKind || 'week', xpEl = document.getElementById('r43GsXp'), tgEl = document.getElementById('r43GsTarget');
    const xpV = xpEl && xpEl.value.trim() ? Number(xpEl.value) : null, track = k!=='long' ? ui.gsTierTrack : null, target = tgEl ? Number(tgEl.value) : null;
    if(track && track!=='own' && !(target > 0)){ if(tgEl){ tgEl.focus(); tgEl.classList.add('is-bad'); } return; }
    const n = state.goals.items.length, r = base.apply(this, arguments);
    if(state.goals.items.length > n){
      const g = state.goals.items[state.goals.items.length - 1];
      if(k==='long' && ui.gsLife) g.life = true;
      if(ui.gsArea){ g.area = ui.gsArea; g.areaBy = 'you'; }
      if(track && track!=='own'){ g.autoTrack = track; g.period = g.tier; g.target = target; g.unit = GOAL_TRACKERS[track].unit; if(!g.label) g.label = GOAL_TRACKERS[track].name(g); }
      if(xpV > 0){ const band = XP_BOOK.goals[g.tier || (g.life ? 'life' : 'long')]; g.xp = Math.round(Math.min(band[1], Math.max(band[0], xpV))/5)*5; g.xpBy = 'you'; delete g.xpPending; }
      // planned for next week / month from Plan ahead
      if(ui.r43GsFor && g.tier===ui.r43GsFor.kind){ g.pk = ui.r43GsFor.key; g.deadline = periodEnd(g.tier, g.pk); }
      persist('goals'); xpLast = null; setTimeout(renderView, 30);
    }
    ui.r43GsFor = null;
    return r;
  };
})(ACTIONS.gsSave);
opRateGoal = (function(base){ return async function(g){ await null; return base.apply(this, arguments); }; })(opRateGoal);

// ---- planning ahead: next week from Thursday, next month from the 20th ----
function r43NextKey(kind){ return kind==='month' ? (function(){ const p = monthKey().split('-').map(Number); return p[1]===12 ? (p[0]+1)+'-01' : p[0]+'-'+pad2(p[1]+1); })() : addDays(weekKey(), 7); }
function r43PlanOpen(kind){ const d = new Date(todayStr()+'T12:00'); return kind==='month' ? d.getDate() >= XP_BOOK.goals.monthFrom : [4, 5, 6, 0].indexOf(d.getDay())>=0; }
function r43PlanCardHtml(kind){
  const key = r43NextKey(kind), name = kind==='month' ? monthName(key) : 'the week of '+fmtDateShort(key), store = kind==='month' ? intentStore().months : intentStore().weeks, rec = store[key] || {}, locked = !!rec.at;
  const days = Math.round((new Date((kind==='month' ? key+'-01' : key)+'T12:00') - new Date(todayStr()+'T12:00'))/86400000);
  if(!r43PlanOpen(kind) && !locked) return '<section class="r43-plan is-closed"><span class="r43-k" style="color:'+(kind==='month' ? '#F3C988' : '#8FDCFF')+'">Plan ahead · '+escapeHtml(kind==='month' ? monthName(key) : 'next week')+'</span><b>'+(kind==='month' ? 'Opens on the '+XP_BOOK.goals.monthFrom+'th' : 'Opens Thursday')+'</b></section>';
  const gs = tierGoals(kind, key), G = XP_BOOK.goals;
  return '<section class="r43-plan" data-kind="'+kind+'">'+
    '<div class="r43-plan-h"><span class="r43-k" style="color:'+(kind==='month' ? '#F3C988' : '#8FDCFF')+'">Plan ahead · '+escapeHtml(kind==='month' ? monthName(key) : 'Next week')+'</span><span class="r43-chipr">starts in '+days+' day'+(days===1 ? '' : 's')+'</span></div>'+
    '<div class="r43-plan-t">Set up '+escapeHtml(name)+'</div>'+
    '<label class="r43-fld">Your line for the '+(kind==='month' ? 'month' : 'week')+'<input class="input" id="r43PlanLine-'+kind+'" maxlength="80" value="'+escapeHtml(rec.line || '')+'" placeholder="'+(kind==='month' ? 'e.g. Ahead of the content, every week.' : 'e.g. Finish the launch.')+'"></label>'+
    (kind==='month' ? '<label class="r43-fld">Habit to beat<input class="input" id="r43PlanHabit" maxlength="80" value="'+escapeHtml(rec.habit || '')+'" placeholder="e.g. Scrolling before 10 AM"></label>' : '')+
    '<div class="r43-plan-g"><span>Goals</span>'+gs.map(function(g){ return '<div class="r43-plan-gr"><span>'+escapeHtml(g.label)+'</span>'+(g.autoTrack ? '<small>tracked'+(['hours', 'workouts', 'reels', 'posts', 'newclients'].indexOf(g.autoTrack)>=0 ? ' · graph' : '')+'</small>' : '<small></small>')+'<button class="r43-xpc'+(g.xpPending ? ' is-sizing' : '')+'" data-action="r43GoalXp" data-id="'+g.id+'">+'+goalXpOf(g).toLocaleString()+'</button><button class="r43-x" data-action="tierGoalDelete" data-id="'+g.id+'" title="Remove">&#10005;</button></div>'; }).join('')+
      (gs.length < G.maxPer ? '<button class="btn btn-ghost btn-sm" data-action="r43PlanAdd" data-id="'+kind+'">+ Add a goal</button>' : '')+'</div>'+
    '<div class="r43-plan-f">Setting up the '+(kind==='month' ? 'month' : 'week')+' <b>+'+(kind==='month' ? G.monthIn : G.weekIn)+' XP</b> · clean sweep '+(kind==='month' ? 'at month’s end' : 'on Sunday')+' <b>+'+(kind==='month' ? G.sweepMonth : G.sweepWeek).toLocaleString()+' XP</b></div>'+
    (locked ? '<div class="r43-plan-done">&#10003; Locked in<button class="btn btn-sm" data-action="r43PlanSave" data-id="'+kind+'">Save changes</button></div>' : r43HoldHtml('r43PlanLock', kind, 'Hold to lock in '+(kind==='month' ? monthName(key) : 'next week'), 'is-wide is-gold'))+
  '</section>';
}
function r43PlanWrite(kind){
  const key = r43NextKey(kind), store = kind==='month' ? intentStore().months : intentStore().weeks, rec = store[key] = Object.assign({}, store[key] || {});
  const l = document.getElementById('r43PlanLine-'+kind), h = document.getElementById('r43PlanHabit');
  if(l) rec.line = l.value.trim(); if(h && kind==='month') rec.habit = h.value.trim();
  return rec;
}
ACTIONS.r43PlanLock = function(el, e, kind){
  const rec = r43PlanWrite(kind), key = r43NextKey(kind);
  if(!rec.line && !tierGoals(kind, key).length){ showToast('Give it a line or a goal first.', {icon:'&#9998;'}); if(el) el.classList.remove('is-done'); return; }
  const first = !rec.at; rec.at = rec.at || Date.now(); rec.atDay = rec.atDay || todayStr();
  intentStore().prompted[(kind==='month' ? 'M' : 'W')+key] = todayStr();
  persist('journal'); xpLast = null; playPositive(); renderView();
  if(first) xpToast(kind==='month' ? XP_BOOK.goals.monthIn : XP_BOOK.goals.weekIn, (kind==='month' ? monthName(key) : 'Next week')+' is set up.');
};
ACTIONS.r43PlanSave = function(el, e, kind){ r43PlanWrite(kind); persist('journal'); playTick(); renderView(); showToast('Saved.', {icon:'&#10003;'}); };
ACTIONS.r43PlanAdd = function(el, e, kind){ r43PlanWrite(kind); persist('journal'); ui.r43GsForNext = {kind:kind, key:r43NextKey(kind)}; openGoalSheet(kind); };
// (the sheet adds to the next period, and doesn't stop at a checked-out or full current one)
goalSheetHtml = (function(base){
  return function(){
    if(!ui.r43GsFor) return base.apply(this, arguments);
    const k = ui.gsKind, f = ui.r43GsFor; if(f.kind!==k) return base.apply(this, arguments);
    const pk = periodKey;
    periodKey = function(kind){ return kind===f.kind ? f.key : pk.apply(this, arguments); };
    try{ return base.apply(this, arguments).replace(/<button class="btn btn-primary gs-go" data-action="gsSave" disabled>/, '<button class="btn btn-primary gs-go" data-action="gsSave">'); } finally { periodKey = pk; }
  };
})(goalSheetHtml);
ACTIONS.gsSave = (function(base){
  return function(){
    const f = ui.r43GsFor; if(!f || f.kind!==(ui.gsKind || 'week')) return base.apply(this, arguments);
    const store = f.kind==='month' ? intentStore().months : intentStore().weeks, had = store[f.key] && store[f.key].at;
    const pk = periodKey; periodKey = function(kind){ return kind===f.kind ? f.key : pk.apply(this, arguments); };
    try{ return base.apply(this, arguments); } finally { periodKey = pk; if(!had && store[f.key]){ delete store[f.key].at; persist('journal'); } }
  };
})(ACTIONS.gsSave);

// ---- the page ----
function r43Ring(pct, text, color, done){
  if(done) return '<span class="r43-ring is-done">&#10003;</span>';
  const r = 19, C = 2*Math.PI*r, off = C*(1 - Math.max(0, Math.min(100, pct))/100);
  return '<span class="r43-ring" style="--rc:'+color+'"><svg viewBox="0 0 46 46" width="46" height="46"><circle cx="23" cy="23" r="'+r+'" class="r43-ring-bg"/><circle cx="23" cy="23" r="'+r+'" class="r43-ring-fg" stroke-dasharray="'+C.toFixed(1)+'" stroke-dashoffset="'+off.toFixed(1)+'" transform="rotate(-90 23 23)"/></svg><b>'+text+'</b></span>';
}
function r43ShortNum(v, unit){ if(v==null) return '–'; const n = Math.round(Number(v)*10)/10; return unit==='h' || unit==='h/day' ? Math.round(n)+'h' : unit==='$/mo' ? '$'+(n >= 1000 ? Math.round(n/100)/10+'k' : n) : String(n); }
function r43TierRowHtml(g, kind){
  const T = goalTracker(g), has = g.target > 0, cur = T || has ? goalLiveCurrent(g) : null, unit = T ? T.unit : g.unit || '';
  const pct = has ? goalPct(g) : 0, color = kind==='month' ? '#C58FFF' : '#8FDCFF', locked = checkedOut(g.tier, g.pk);
  const ringT = has ? (unit==='h' ? r43ShortNum(cur, 'h') : r43ShortNum(cur)+'/'+r43ShortNum(g.target)) : '';
  const left = has && cur!=null ? Math.max(0, g.target - cur) : null;
  const sub = g.done ? 'Done '+fmtDateShort(g.doneAt || g.pk)+(g.doneAt && g.deadline && g.doneAt < g.deadline ? ' · '+Math.round((new Date(g.deadline+'T12:00') - new Date(g.doneAt+'T12:00'))/86400000)+' days early' : '')
    : g.missed ? 'Missed' : g.autoTrack==='newclients' ? (function(){ const r = r43PeriodRange(g), l = r43NewClientsIn(r[0], r[1]).map(function(c){ return c.business || c.name; }); return (l.length ? l.join(', ')+' · ' : '')+(left ? left+' to go' : 'hit'); })()
    : T ? 'Tracked from '+(g.autoTrack==='hours' ? 'Focus' : g.autoTrack==='workouts' ? 'Health' : g.autoTrack==='reels' ? 'deliverables' : 'your videos')+(left ? ' · '+(unit==='h' ? Math.round(left*10)/10+'h' : left)+' to go' : '')
    : '';
  const ai = r43GoalArea(g), areaChip = r43Areas().length > 1 ? '<i class="r43-dotc" style="--ac:'+r43AreaColor(ai)+'" title="'+escapeHtml(r43AreaName(ai))+'"></i>' : '';
  return '<div class="r43-goal'+(g.done ? ' is-done' : '')+(g.missed ? ' is-missed' : '')+'" data-flip="g-'+g.id+'">'+
    (has || g.done ? r43Ring(pct, ringT, color, g.done) : '<span class="r43-ring is-empty"></span>')+
    '<button class="r43-goal-m" data-action="'+(T || has ? 'r43GoalOpen' : 'tierGoalRename')+'" data-id="'+g.id+'"><b>'+areaChip+escapeHtml(goalTitle(g))+'</b>'+(sub ? '<small>'+escapeHtml(sub)+'</small>' : '')+'</button>'+
    (g.autoTrack==='newclients' && !g.done ? '<button class="r43-link" data-action="r43FixCount" data-id="'+g.id+'">Fix</button>' : '')+
    (g.done ? '<span class="r43-xpc is-earned">+'+goalXpOf(g).toLocaleString()+' earned</span>'+(locked ? '' : '<button class="r43-x" data-action="r43GoalUndo" data-id="'+g.id+'" title="Undo (takes the XP back)">&#8634;</button>')
      : '<button class="r43-xpc'+(g.xpPending ? ' is-sizing' : '')+'" data-action="r43GoalXp" data-id="'+g.id+'" title="Tap to set your own number">+'+goalXpOf(g).toLocaleString()+'</button>'+
        (T || locked ? '' : r43HoldHtml('r43GoalDone', g.id, 'Hold', 'is-sm')))+
  '</div>';
}
function r43RingRowHtml(m, xpTxt){
  const pct = masterPct(m), done = pct >= 100;
  const ringT = m.key==='deep' ? Math.round(m.cur)+'h' : fmtGoalNum(m.cur)+'/'+fmtGoalNum(m.target);
  const left = Math.max(0, (m.target || 0) - (m.cur || 0));
  return '<div class="r43-goal is-ring'+(done ? ' is-done' : '')+'">'+r43Ring(pct, ringT, m.color, false)+
    '<div class="r43-goal-m"><b>'+escapeHtml(m.label)+'</b><small>'+(m.key==='newclients' ? (arr(m.names).length ? m.names.join(', ')+' · ' : '')+(left ? left+' to go' : 'hit')+(m.fixed ? ' · fixed by you' : '') : done ? 'Hit' : (m.key==='deep' ? Math.round(left*10)/10+'h' : fmtGoalNum(left))+' to go')+'</small></div>'+
    (m.key==='newclients' ? '<button class="r43-link" data-action="r43FixCount" data-id="master">Fix</button>' : '')+
    (xpTxt ? '<span class="r43-xpc is-ring">'+xpTxt+'</span>' : '')+'</div>';
}
function r43PanelHtml(kind){
  const key = periodKey(kind), rec = periodRec(kind, key) || {}, gs = tierGoals(kind, key), done = gs.filter(function(g){ return g.done; }).length;
  const end = periodEnd(kind, key), daysLeft = Math.max(0, Math.round((new Date(end+'T12:00') - new Date(todayStr()+'T12:00'))/86400000));
  const due = checkoutDue().find(function(c){ return c.kind===kind; }), out = checkedOut(kind, key), G = XP_BOOK.goals;
  const hide = mgHidden(), vis = function(m){ return !hide[m.key]; };
  const rings = kind==='month' ? mgMonthlyDefs().filter(vis).map(function(m){ return r43RingRowHtml(m, ''); })
    : masterGoalDefs().filter(function(m){ return MG_PERIOD[m.key]==='week' && vis(m) && m.target > 0; }).map(function(m){ return r43RingRowHtml(m, '+'+G.ring); });
  const line = rec.line || (kind==='month' ? rec.note : rec.focus) || '';
  const habitOn = kind==='month' && rec.habit && rec.habitDays && rec.habitDays[todayStr()];
  const lineBox = checkedIn(kind, key)
    ? '<div class="r43-line is-'+kind+'"><div class="r43-k">Your line for the '+(kind==='month' ? 'month' : 'week')+'</div>'+(line ? '<div class="r43-line-t">'+escapeHtml(line)+'</div>' : '<button class="r43-line-add" data-action="openIntent" data-id="'+kind+'">+ Write your line</button>')+
        (kind==='month' && rec.habit ? '<div class="r43-line-h"><span>Beating: '+escapeHtml(rec.habit)+'</span><button class="r43-hab'+(habitOn ? ' is-on' : '')+'" data-action="r43HabitToday">'+(habitOn ? '&#10003; Kept today' : 'Kept it today <b>+'+XP_BOOK.personal.habit+'</b>')+'</button></div>' : '')+
        (kind==='week' && rec.line && rec.focus && rec.focus!==rec.line ? '<div class="r43-line-h"><span>Focus: '+escapeHtml(rec.focus)+'</span></div>' : '')+
        '<button class="r43-line-e" data-action="openIntent" data-id="'+kind+'" title="Edit">&#9998;</button></div>'
    : '<button class="r43-setup is-'+kind+'" data-action="openIntent" data-id="'+kind+'"><b>Set up '+(kind==='month' ? monthName(key) : 'the week')+'</b><span>Your line and your goals · +'+(kind==='month' ? G.monthIn : G.weekIn)+' XP</span></button>';
  return '<section class="r43-panel is-'+kind+'">'+
    '<div class="r43-panel-h"><div><span class="r43-k" style="color:'+(kind==='month' ? '#F3C988' : '#8FDCFF')+'">'+(kind==='month' ? monthName(key) : 'This week')+'</span>'+(gs.length ? '<span class="r43-chipr">'+done+' of '+gs.length+' hit</span>' : '')+'</div><small>'+(kind==='month' ? daysLeft+' day'+(daysLeft===1 ? '' : 's')+' left' : fmtDateShort(key)+' – '+fmtDateShort(end))+'</small></div>'+
    lineBox+
    '<div class="r43-goals">'+gs.map(function(g){ return r43TierRowHtml(g, kind); }).join('')+rings.join('')+'</div>'+
    (!out && gs.length < G.maxPer && checkedIn(kind, key) ? '<button class="r43-add" data-action="openGoalSheet" data-id="'+kind+'">+ Add a goal</button>' : '')+
    (gs.length >= 2 && done===gs.length ? '<div class="r43-sweep is-hit">&#9733; Clean sweep +'+(kind==='month' ? G.sweepMonth : G.sweepWeek).toLocaleString()+' XP</div>' : '')+
    (due ? '<button class="r43-co" data-action="openCheckout" data-id="'+due.kind+':'+due.key+'">Check out of '+(kind==='month' ? monthName(due.key) : 'the week')+' <b>+'+(kind==='month' ? G.monthOut : G.weekOut)+' XP</b></button>' : out ? '<div class="r43-out">Checked out<button class="r43-link" data-action="tierReopen" data-id="'+kind+'">Reopen</button></div>' : '')+
  '</section>';
}
function r43MasterCardHtml(m){
  const pct = masterPct(m), xp = typeof masterXpNow==='function' ? masterXpNow(m) : 0, hit = pct >= 100;
  const lab = {mrr:'Monthly revenue', weight:'Body weight', streak:'Days in a row'}[m.key] || m.label;
  let meter;
  if(m.key==='streak' && m.target <= 40) meter = '<div class="r43-dots" style="--n:'+m.target+'" aria-label="'+m.cur+' of '+m.target+' days">'+Array.from({length:m.target}, function(_, i){ return '<i class="'+(i < m.cur ? 'is-on' : '')+'"></i>'; }).join('')+'</div>';
  else meter = '<div class="r43-bar" style="--c:'+m.color+'"><i style="width:'+pct.toFixed(1)+'%"></i></div>';
  const sub = m.key==='mrr' ? escapeHtml(masterToGo(m))+' · '+escapeHtml(m.src || '') : m.key==='weight' ? escapeHtml(masterToGo(m)) : escapeHtml(masterToGo(m))+(state.profile.streakBest ? ' · best: '+state.profile.streakBest : '');
  return '<div class="r43-master'+(hit ? ' is-hit' : '')+'" style="--c:'+m.color+'">'+
    '<div class="r43-master-h"><span class="r43-k">'+escapeHtml(lab)+'</span>'+(xp ? '<span class="r43-chipx">+'+xp.toLocaleString()+' XP at goal</span>' : '')+'</div>'+
    '<div class="r43-master-n"><b>'+(m.cur==null ? '–' : m.fmt(m.cur))+'</b>'+masterTargetHtml(m).replace('class="mg-target"', 'class="mg-target r43-tgt"')+'</div>'+meter+
    '<div class="r43-master-f"><span>'+sub+'</span><b>'+Math.round(pct)+'%</b></div></div>';
}
function r43OwnCardHtml(g){
  const T = goalTracker(g), has = g.target > 0, cur = has ? goalLiveCurrent(g) : null, pct = has ? goalPct(g) : 0, unit = T ? T.unit : g.unit || '';
  const num = function(n){ return n==null ? '–' : unit==='$/mo' ? '$'+fmtGoalNum(n) : fmtGoalNum(n)+(unit && unit!=='$/mo' ? ' '+unit : ''); };
  const chip = g.life ? 'Life milestone' : 'Long-term';
  if(g.done) return '<div class="r43-own is-done" data-flip="o-'+g.id+'"><div class="r43-own-ok">&#10003;</div><div class="r43-own-b"><div class="r43-own-t">'+escapeHtml(goalTitle(g))+'</div><small>Done '+fmtDateShort(g.doneAt || todayStr())+(g.deadline && g.doneAt && g.doneAt < g.deadline ? ' · ahead of '+fmtDateShort(g.deadline) : '')+'</small></div>'+
    '<div class="r43-own-e"><b>+'+goalXpOf(g).toLocaleString()+'</b><small>XP earned</small><button class="r43-link" data-action="r43GoalUndo" data-id="'+g.id+'">Undo</button></div></div>';
  return '<div class="r43-own'+(g.life ? ' is-life' : '')+'" data-flip="o-'+g.id+'">'+
    '<div class="r43-own-h"><span class="r43-chipo">'+chip+'</span>'+(g.deadline ? '<small>by '+new Date(g.deadline+'T12:00').toLocaleDateString(undefined, {month:'short', year:'numeric'})+'</small>' : '')+'</div>'+
    '<button class="r43-own-t" data-action="openGoalEditModal" data-id="'+g.id+'">'+escapeHtml(goalTitle(g))+'</button>'+
    (has ? '<div class="r43-bar" style="--c:'+(g.life ? '#FFB86B' : '#C58FFF')+'"><i style="width:'+Math.min(100, pct).toFixed(1)+'%"></i></div>' : '')+
    '<div class="r43-own-f"><span>'+(has ? num(cur)+' of '+num(g.target)+(T ? '' : '<button class="r43-step" data-action="goalStep" data-id="'+g.id+'" data-delta="-1" aria-label="One less">&minus;</button><button class="r43-step" data-action="goalStep" data-id="'+g.id+'" data-delta="1" aria-label="One more">+</button>') : '')+'</span>'+
      '<button class="r43-xpc'+(g.xpPending ? ' is-sizing' : '')+(g.life ? ' is-life' : '')+'" data-action="r43GoalXp" data-id="'+g.id+'">+'+goalXpOf(g).toLocaleString()+' XP</button></div>'+
    (T ? '' : r43HoldHtml('r43GoalDone', g.id, 'Hold to complete', 'is-wide'))+
  '</div>';
}
// body weight and days in a row get the same weight as revenue: a ring, the big number, and their own meter
function r43MasterHeroHtml(m){
  const pct = masterPct(m), hit = pct >= 100, xp = typeof masterXpNow==='function' ? masterXpNow(m) : 0;
  let meter = '';
  if(m.key==='streak'){
    const n = Math.max(1, Math.min(60, Number(m.target) || 30)), cur = Number(m.cur) || 0;
    meter = '<div class="r43-mh-dots" style="--n:'+n+'">'+Array.from({length:n}, function(_, i){ return '<i class="'+(i < cur ? 'is-on' : '')+(i===cur - 1 ? ' is-now' : '')+'"></i>'; }).join('')+'</div>';
  } else {
    meter = '<div class="mg-bar"><div class="mg-bar-fill" style="width:'+pct.toFixed(1)+'%"></div></div>'+
      (m.start!=null && m.target!=null ? '<div class="r43-mh-ends"><span>'+m.fmt(m.start)+m.suffix+'</span><span>'+m.fmt(m.target)+m.suffix+'</span></div>' : '');
  }
  return '<section class="r43-mh'+(hit ? ' is-hit' : '')+' is-'+m.key+'" style="--mg1:'+m.color+';--mg2:'+m.color2+';">'+
    '<div class="r43-mh-top"><span class="g39-k">'+m.icon+' '+escapeHtml(m.label)+'</span>'+(xp ? '<span class="mg-xp">+'+xp.toLocaleString()+' XP</span>' : '')+'</div>'+
    '<div class="r43-mh-mid"><div class="r43-mh-ring">'+ringSvg(pct, m.color, m.color2, 'h'+m.key, 92)+'<span>'+(hit ? '&#10003;' : Math.round(pct)+'%')+'</span></div>'+
      '<div class="r43-mh-n"><div class="g39-rev-n"><b>'+(m.cur==null ? '–' : m.fmt(m.cur))+'</b><span>'+escapeHtml(m.suffix.trim())+'</span></div>'+masterTargetHtml(m)+'<small>'+escapeHtml(masterToGo(m))+'</small></div></div>'+
    meter+'</section>';
}
// master goals keep their earlier look: revenue as the strip across, the rest as ring cards beside each other
function r43MastersOldHtml(defs){
  const rev = defs.find(function(m){ return m.key==='mrr'; }), rest = defs.filter(function(m){ return m.key!=='mrr'; });
  return (rev ? g39RevHtml(rev) : '')+(rest.length ? '<div class="r43-mheros" style="--n:'+rest.length+'">'+rest.map(r43MasterHeroHtml).join('')+'</div>' : '');
}
renderGoalsTab = function(){
  const mode = ui.r43GoalsMode==='plan' ? 'plan' : 'now', hide = mgHidden();
  const defs = masterGoalDefs().filter(function(m){ return (MG_PERIOD[m.key] || 'master')==='master' && !hide[m.key]; })
    .filter(function(m){ return m.key!=='mrr' || r43ClientsOn() || m.target > 0; }).filter(function(m){ return m.key!=='weight' || m.cur!=null || m.target > 0; });
  const own = arr(state.goals.items).filter(function(g){ return !g.tier; });
  const open = own.filter(function(g){ return !g.done; }).sort(function(a, b){ return (b.life ? 1 : 0) - (a.life ? 1 : 0) || (a.deadline || '9999').localeCompare(b.deadline || '9999'); });
  const done = own.filter(function(g){ return g.done; }).sort(function(a, b){ return String(b.doneAt||'').localeCompare(String(a.doneAt||'')); });
  const nextM = r43NextKey('month');
  const head = '<div class="r43-gh"><div class="r43-seg"><button class="'+(mode==='now' ? 'is-on' : '')+'" data-action="r43GoalsMode" data-id="now">'+escapeHtml(monthName(monthKey()))+'</button><button class="'+(mode==='plan' ? 'is-on' : '')+'" data-action="r43GoalsMode" data-id="plan">Plan '+escapeHtml(r43PlanOpen('month') ? monthName(nextM) : 'ahead')+'</button></div>'+(defs.length ? '' : '<button class="r43-cust" data-action="mgCustomize">Customize</button>')+'</div>';
  if(mode==='plan') return '<div class="r43-goalsp">'+head+'<div class="r43-plans">'+r43PlanCardHtml('month')+r43PlanCardHtml('week')+'</div></div>';
  return '<div class="r43-goalsp g39">'+head+
    (defs.length ? '<div class="r43-sec"><span class="r43-k" style="color:#8FDCFF">Master goals</span><button class="r43-gear" data-action="mgCustomize" title="Choose and edit master goals" aria-label="Choose and edit master goals"><svg viewBox="0 0 24 24" width="15" height="15" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="3"/><path d="M19.4 15a1.7 1.7 0 0 0 .3 1.8l.1.1a2 2 0 1 1-2.8 2.8l-.1-.1a1.7 1.7 0 0 0-1.8-.3 1.7 1.7 0 0 0-1 1.5V21a2 2 0 1 1-4 0v-.1a1.7 1.7 0 0 0-1.1-1.5 1.7 1.7 0 0 0-1.8.3l-.1.1a2 2 0 1 1-2.8-2.8l.1-.1a1.7 1.7 0 0 0 .3-1.8 1.7 1.7 0 0 0-1.5-1H3a2 2 0 1 1 0-4h.1a1.7 1.7 0 0 0 1.5-1.1 1.7 1.7 0 0 0-.3-1.8l-.1-.1a2 2 0 1 1 2.8-2.8l.1.1a1.7 1.7 0 0 0 1.8.3H9a1.7 1.7 0 0 0 1-1.5V3a2 2 0 1 1 4 0v.1a1.7 1.7 0 0 0 1 1.5 1.7 1.7 0 0 0 1.8-.3l.1-.1a2 2 0 1 1 2.8 2.8l-.1.1a1.7 1.7 0 0 0-.3 1.8V9a1.7 1.7 0 0 0 1.5 1H21a2 2 0 1 1 0 4h-.1a1.7 1.7 0 0 0-1.5 1z"/></svg></button></div>'+r43MastersOldHtml(defs) : '')+
    '<div class="r43-panels">'+r43PanelHtml('month')+r43PanelHtml('week')+'</div>'+
    '<div class="r43-sec is-mine"><div><span class="r43-k" style="color:#FFB86B">Your goals</span></div><button class="btn btn-ghost btn-sm" data-action="openGoalSheet" data-id="long">+ New goal</button></div>'+
    '<div class="r43-owns">'+open.map(r43OwnCardHtml).join('')+'<button class="r43-own is-add" data-action="openGoalSheet" data-id="long"><b>Add a goal you actually care about</b></button></div>'+
    (done.length ? '<div class="r43-sec is-ach"><button class="r43-link" data-action="r43ShowAch">'+(ui.r43Ach ? '&#9662;' : '&#9656;')+' Achieved · '+done.length+'</button></div>'+(ui.r43Ach ? '<div class="r43-owns is-done">'+done.map(r43OwnCardHtml).join('')+'</div>' : '') : '')+
  '</div>';
};
ACTIONS.r43GoalsMode = function(el, e, id){ ui.r43GoalsMode = id; playTick(); renderView(); };
ACTIONS.r43ShowAch = function(){ ui.r43Ach = !ui.r43Ach; renderView(); };
// the line: check-ins ask for it now (the week's focus and the month's note stay as they were)
INTENT_FIELDS.month.extra.unshift(['line', 'Your line for the month', 'e.g. Be the guy.']);
INTENT_FIELDS.week.extra.unshift(['line', 'Your line for the week', 'e.g. Finish the launch.']);
if(INTENT_FIELDS.week.extra.length > 2) INTENT_FIELDS.week.extra = INTENT_FIELDS.week.extra.filter(function(f){ return f[0]!=='note'; });
