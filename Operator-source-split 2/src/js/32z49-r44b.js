// ============ ROUND 44 (build 4b): SOCIAL, A CONTROL PANEL ============
// Overview is built to get you posting and to show what works: switch between your Business and Personal
// account (and swap which is which without reconnecting), this week's posts as a 7-day strip against your
// target, the next video up with Mark posted, four numbers with their trend, views of the last posts
// against your average, and what's working (best format, best time, weakest hook).

function sxRole(){ const c = igCfg(), has = function(r){ return c.accounts.some(function(a){ return a.role===r; }); }; const r = ui.sxRole || 'business'; return has(r) || !has(r==='business' ? 'personal' : 'business') ? r : (r==='business' ? 'personal' : 'business'); }
function sxRolePosts(role){ const c = igCfg(), out = []; c.accounts.filter(function(a){ return a.role===role; }).forEach(function(a){ const d = sxAccountData(a); if(d) arr(d.posts).forEach(function(p){ out.push(Object.assign({_user:d.username || a.username}, p)); }); }); return out.sort(function(a, b){ return String(b.date || '').localeCompare(String(a.date || '')); }); }
function sxRoleData(role){ const c = igCfg(); const ds = c.accounts.filter(function(a){ return a.role===role; }).map(sxAccountData).filter(Boolean); return ds; }
function sxWeekTarget(role){ const t = state.standards.contentTargets && state.standards.contentTargets[role]; return t && t.n ? (t.per==='day' ? t.n*7 : t.n) : 4; }
function sxPostedIn(posts, from, to){ return posts.filter(function(p){ return p.date && p.date >= from && p.date <= to; }); }
function sxStreak(posts, role){
  const tgt = sxWeekTarget(role); let n = 0, w = addDays(startOfWeekStr(todayStr()), -7);
  for(let i = 0; i < 52; i++){ if(sxPostedIn(posts, w, addDays(w, 6)).length >= tgt){ n++; w = addDays(w, -7); } else break; }
  if(sxPostedIn(posts, startOfWeekStr(todayStr()), todayStr()).length >= tgt) n++;
  return n;
}
function sxNextVideo(role){
  const today = todayStr();
  return state.tasks.items.filter(function(t){ return t.isVideoIdea && t.status!=='done' && contentRoleOf(t)===role; })
    .sort(function(a, b){ return (a.status==='today' ? 0 : 1) - (b.status==='today' ? 0 : 1) || String(a.deadline || '9999').localeCompare(String(b.deadline || '9999')); })[0] || null;
}
function sxSparkLine(vals, color){
  if(!vals || vals.length < 2) return '';
  const lo = Math.min.apply(null, vals), hi = Math.max.apply(null, vals), r = hi - lo || 1;
  return '<svg class="sx2-spark" viewBox="0 0 200 34" preserveAspectRatio="none" aria-hidden="true"><polyline fill="none" stroke="'+color+'" stroke-width="2.5" stroke-linejoin="round" points="'+vals.map(function(v, i){ return (i*200/(vals.length - 1)).toFixed(1)+','+(31 - (v - lo)/r*27).toFixed(1); }).join(' ')+'"/></svg>';
}
function sxDelta(now, before, unit){
  if(now==null || before==null || !isFinite(now) || !isFinite(before) || before===0) return '';
  if(unit==='pts'){ const d = Math.round(now - before); return '<small class="'+(d >= 0 ? 'is-up' : 'is-down')+'">'+(d >= 0 ? '+' : '−')+Math.abs(d).toFixed(0)+' pts</small>'; }
  const d = Math.round((now - before)/before*100); return '<small class="'+(d >= 0 ? 'is-up' : 'is-down')+'">'+(d >= 0 ? '+' : '−')+Math.abs(d).toFixed(0)+'%</small>';
}
function sxWorking(posts){
  const recent = posts.filter(function(p){ return p.date > addDays(todayStr(), -60) && (p.views || p.reach); });
  if(recent.length < 4) return [];
  const v = function(p){ return p.views || p.reach || 0; }, avg = sxAvg(recent, v) || 1, out = [];
  const fmt = function(p){ const t = String(p.type || ''); return /REEL/i.test(t) ? 'Reels' : /CAROUSEL/i.test(t) ? 'Carousels' : /IMAGE|PHOTO/i.test(t) ? 'Photos' : 'Videos'; };
  const groups = {}; recent.forEach(function(p){ (groups[fmt(p)] = groups[fmt(p)] || []).push(p); });
  const g = Object.keys(groups).filter(function(k){ return groups[k].length >= 2; }).map(function(k){ return {k:k, a:sxAvg(groups[k], v)}; }).sort(function(a, b){ return b.a - a.a; });
  if(g.length) out.push({icon:'&#9650;', color:'#3FBE8E', t:g[0].k, s:'best format', x:(g[0].a/avg).toFixed(1)+'×', cls:'is-up'});
  const slot = function(p){ const t = Date.parse(p.at || ''); if(!isFinite(t)) return null; const d = new Date(t), wk = d.getDay()===0 || d.getDay()===6 ? 'Weekends' : 'Weekdays', h = d.getHours(); return wk+', '+(h < 12 ? 'mornings' : h < 17 ? 'afternoons' : 'evenings'); };
  const sl = {}; recent.forEach(function(p){ const k = slot(p); if(k) (sl[k] = sl[k] || []).push(p); });
  const s = Object.keys(sl).filter(function(k){ return sl[k].length >= 2; }).map(function(k){ return {k:k, a:sxAvg(sl[k], v)}; }).sort(function(a, b){ return b.a - a.a; });
  if(s.length) out.push({icon:'&#9719;', color:'#8FDCFF', t:s[0].k, s:'best time', x:'+'+Math.max(0, Math.round((s[0].a/avg - 1)*100))+'%', cls:'is-blue'});
  const reels = recent.filter(function(p){ return p.hook!=null; });
  if(reels.length >= 3){ const ha = sxAvg(reels, function(p){ return p.hook; }), w = reels.slice().sort(function(a, b){ return a.hook - b.hook; })[0]; out.push({icon:'&#9660;', color:'#FF7A6B', t:String(w.cap || 'Your weakest reel').split(/\n|\.|!|\?/)[0].slice(0, 42) || 'Your weakest reel', s:'weakest hook', x:'−'+Math.max(0, Math.round(ha - w.hook)), cls:'is-down'}); }
  else if(g.length > 1){ const w = g[g.length - 1]; out.push({icon:'&#9660;', color:'#FF7A6B', t:w.k, s:'weakest format', x:(w.a/avg).toFixed(1)+'×', cls:'is-down'}); }
  return out;
}
sxOverviewHtml = function(){
  igMaybeRefresh();
  const c = igCfg();
  if(!c.accounts.length) return '<div class="sx2-empty card"><b>Connect your Instagram</b><span>Your business account, your own, or both.</span><button class="btn btn-primary" data-action="socAddRole" data-id="business">Connect an account</button></div>'+(ui.socAdd ? '<div class="sx-add">'+socialConnectHtml()+'</div>' : '')+'<div class="sx-sec-k">Connections</div>'+(typeof socialSourcesHtml==='function' ? socialSourcesHtml() : '');
  const role = sxRole(), posts = sxRolePosts(role), ds = sxRoleData(role), today = todayStr(), ws = startOfWeekStr(today);
  const accSw = '<div class="sx2-acc">'+['business', 'personal'].map(function(r){ const a = c.accounts.find(function(x){ return x.role===r; }), d = a && sxAccountData(a), u = (d && d.username) || (a && a.username);
      return '<button class="'+(role===r ? 'is-on' : '')+'" data-action="sxRole" data-id="'+r+'"'+(a ? '' : ' disabled')+'>'+(d && d.pic ? '<img src="'+escapeHtml(d.pic)+'" alt="">' : '<i>'+escapeHtml(String(u || (r==='business' ? 'B' : 'P')).slice(0, 1).toUpperCase())+'</i>')+(u ? '@'+escapeHtml(u) : (r==='business' ? 'Business' : 'Personal'))+'</button>'; }).join('')+
    (c.accounts.length > 1 ? '<button class="sx2-swap" data-action="sxSwapRoles" title="Swap which account is business and which is personal" aria-label="Swap business and personal">&#8644;</button>' : '')+'</div>';
  // this week
  const tgt = sxWeekTarget(role), wk = sxPostedIn(posts, ws, addDays(ws, 6)), streak = sxStreak(posts, role);
  const planned = {}; state.tasks.items.forEach(function(t){ if(t.isVideoIdea && t.status!=='done' && contentRoleOf(t)===role && t.deadline && t.deadline >= ws && t.deadline <= addDays(ws, 6)) planned[t.deadline] = t; });
  const days = []; for(let i = 0; i < 7; i++){ const d = addDays(ws, i), ps = posts.filter(function(p){ return p.date===d; }), dt = new Date(d+'T12:00');
    const cls = ps.length ? 'is-p' : d===today ? 'is-t' : planned[d] && d < today ? 'is-m' : planned[d] ? 'is-pl' : '';
    days.push('<div class="sx2-d '+cls+'"><small>'+(d===today ? 'TODAY' : dt.toLocaleDateString(undefined, {weekday:'short'}).toUpperCase())+'</small><div class="sx2-th">'+(ps[0] && ps[0].thumb ? '<img src="'+escapeHtml(ps[0].thumb)+'" alt="" loading="lazy">' : d===today && !ps.length ? '+' : '')+'</div><b>'+(ps.length ? (/REEL/i.test(ps[0].type || '') ? 'Reel' : /CAROUSEL/i.test(ps[0].type || '') ? 'Carousel' : 'Post')+(ps.length > 1 ? ' ×'+ps.length : '') : planned[d] && d < today ? 'Missed' : planned[d] ? 'Planned' : '')+'</b></div>'); }
  const next = sxNextVideo(role);
  const hero = '<div class="sx2-hero">'+
    '<section class="card sx2-week"><div class="sx2-wk-h"><div><span class="sx2-k">This week</span><div class="sx2-wk-n"><b>'+wk.length+'</b><span>/ '+tgt+' posted</span></div></div>'+(streak ? '<span class="sx2-tag is-gold">&#128293; '+streak+'-week streak</span>' : '')+'</div><div class="sx2-days">'+days.join('')+'</div></section>'+
    '<section class="card sx2-next"><span class="sx2-k" style="color:#C49A5A">Up next'+(next && next.deadline ? ' · '+(next.deadline===today ? 'today' : fmtDateShort(next.deadline)) : '')+'</span>'+
      (next ? '<h3>'+escapeHtml(next.title)+'</h3>'+(next.notes ? '<div class="sx2-hook">'+escapeHtml(String(next.notes).split('\n')[0].slice(0, 140))+'</div>' : '')+
        '<div class="sx2-tags">'+(next.videoType ? '<span class="sx2-tag">'+escapeHtml((arr(state.tasks.videoTypes).find(function(v){ return v.id===next.videoType; }) || {label:next.videoType}).label)+'</span>' : '')+(sxWorking(posts)[1] ? '<span class="sx2-tag">Post '+escapeHtml(sxWorking(posts)[1].t.toLowerCase())+'</span>' : '')+'</div>'+
        '<div class="sx2-acts"><button class="btn btn-primary" data-action="sxPosted" data-id="'+next.id+'">Mark posted</button><button class="btn btn-ghost" data-action="sxOpenContent">Open in Content</button></div>'
       : '<h3>Nothing lined up</h3><div class="sx2-acts"><button class="btn btn-ghost" data-action="sxOpenContent">Open Content</button></div>')+'</section></div>';
  // the four numbers
  const fol = ds.reduce(function(s, d){ return s + (d.followers || 0); }, 0);
  const gained = ds.reduce(function(s, d){ return s + (d.fh && d.fh.gained!=null ? (d.fh.gained || 0) - (d.fh.lost || 0) : 0); }, 0);
  const series = (function(){ const d = ds[0]; if(d && d.fh && arr(d.fh.series).length > 1) return d.fh.series.map(function(x){ return x[1]; }); const h = c.history || {}; return Object.keys(h).sort().slice(-30).map(function(k){ return h[k]; }); })();
  const last30 = sxPostedIn(posts, addDays(today, -29), today), prev30 = sxPostedIn(posts, addDays(today, -59), addDays(today, -30));
  const vw = function(p){ return p.views || p.reach; }, reels30 = last30.filter(function(p){ return p.hook!=null; }), reelsP = prev30.filter(function(p){ return p.hook!=null; });
  const av = sxAvg(last30, vw), avP = sxAvg(prev30, vw), hk = sxAvg(reels30, function(p){ return p.hook; }), hkP = sxAvg(reelsP, function(p){ return p.hook; }), er = sxAvg(last30, postER), erP = sxAvg(prev30, postER);
  const bySeries = function(list, f){ return list.slice().reverse().map(f).filter(function(v){ return v!=null && isFinite(v); }); };
  const kpi = function(k, v, delta, spark){ return '<div class="card sx2-kpi"><span class="sx2-k">'+k+'</span><b>'+v+'</b>'+(delta || '<small class="sx2-faint">&nbsp;</small>')+spark+'</div>'; };
  const kpis = '<div class="sx2-kpis">'+
    kpi('Followers', sxNum(fol), gained ? '<small class="'+(gained >= 0 ? 'is-up' : 'is-down')+'">'+(gained >= 0 ? '+' : '')+sxNum(gained)+' · 30 days</small>' : '', sxSparkLine(series, '#7CF0C4'))+
    kpi('Avg views', sxNum(av), sxDelta(av, avP), sxSparkLine(bySeries(last30, vw), '#FF5A8A'))+
    kpi('Hook rate', sxPct(hk), sxDelta(hk, hkP, 'pts'), sxSparkLine(bySeries(reels30, function(p){ return p.hook; }), '#FF9A8A'))+
    kpi('Engagement', sxPct(er), sxDelta(er, erP, 'pts'), sxSparkLine(bySeries(last30, postER), '#F3C988'))+'</div>';
  // the last posts against your average
  const metric = ['views', 'hook', 'saves'].indexOf(ui.sxMetric)>=0 ? ui.sxMetric : 'views';
  const mv = function(p){ return metric==='views' ? vw(p) : p[metric]; };
  const lastN = posts.filter(function(p){ return mv(p)!=null; }).slice(0, 8).reverse(), mAvg = sxAvg(posts.slice(0, 30), mv), mx = Math.max.apply(null, lastN.map(mv).concat([mAvg || 0, 1]))*1.1;
  const chart = '<section class="card sx2-chart"><div class="sx2-ch-h"><span class="sx2-k">'+(metric==='views' ? 'Views' : metric==='hook' ? 'Hook rate' : 'Saves')+', last '+lastN.length+' posts</span><div class="sx2-pills">'+[['views', 'Views'], ['hook', 'Hook'], ['saves', 'Saves']].map(function(m){ return '<button class="'+(metric===m[0] ? 'is-on' : '')+'" data-action="sxMetric" data-id="'+m[0]+'">'+m[1]+'</button>'; }).join('')+'</div></div>'+
    (lastN.length ? '<div class="sx2-bars">'+(mAvg ? '<div class="sx2-avg" style="bottom:'+(mAvg/mx*100).toFixed(1)+'%"><span>avg '+(metric==='hook' ? sxPct(mAvg) : sxNum(mAvg))+'</span></div>' : '')+
      lastN.map(function(p){ const val = mv(p); return '<a class="sx2-b '+(mAvg && val >= mAvg ? 'is-up' : 'is-dn')+'" href="'+escapeHtml(p.link || '#')+'" target="_blank" rel="noopener" title="'+escapeHtml(p.cap || '')+'"><em>'+(metric==='hook' ? sxPct(val) : sxNum(val))+'</em><u style="height:'+(val/mx*100).toFixed(1)+'%"></u></a>'; }).join('')+'</div>'+
      '<div class="sx2-xl">'+lastN.map(function(p){ return '<span>'+escapeHtml(p.date ? fmtDateShort(p.date) : '')+'</span>'; }).join('')+'</div>' : '<div class="sx2-none">No numbers for this yet.</div>')+'</section>';
  const wk2 = sxWorking(posts);
  const working = '<section class="card sx2-work"><span class="sx2-k">What’s working</span>'+(wk2.length ? wk2.map(function(w){ return '<div class="sx2-w"><span class="sx2-wi" style="--c:'+w.color+'">'+w.icon+'</span><div><b>'+escapeHtml(w.t)+'</b><small>'+w.s+'</small></div><span class="sx2-wx '+w.cls+'">'+w.x+'</span></div>'; }).join('') : '<div class="sx2-none">A few more posts and this fills in.</div>')+'</section>';
  return accSw+hero+kpis+'<div class="sx2-perf">'+chart+working+'</div>'+
    (ui.socAdd ? '<div class="sx-add">'+socialConnectHtml()+'</div>' : '')+
    '<details class="sx2-conn"><summary>Connections</summary>'+(typeof socialSourcesHtml==='function' ? socialSourcesHtml() : '')+'</details>';
};
ACTIONS.sxRole = function(el, e, id){ ui.sxRole = id; playTick(); renderView(); };
ACTIONS.sxMetric = function(el, e, id){ ui.sxMetric = id; renderView(); };
// swap which account is business and which is personal: nothing to reconnect, the numbers follow
ACTIONS.sxSwapRoles = function(){
  const c = igCfg(); c.accounts.forEach(function(a){ a.role = a.role==='business' ? 'personal' : 'business'; });
  persist('settings'); xpLast = null; ui.sxRole = ui.sxRole==='personal' ? 'business' : 'personal'; playTick(); renderView();
  showToast('Swapped: business and personal changed places.', {icon:'&#8644;'});
};
ACTIONS.sxPosted = function(el, e, id){
  const t = state.tasks.items.find(function(x){ return x.id===id; }); if(!t) return;
  t.status = 'done'; t.completedAt = todayStr(); persist('tasks'); xpLast = null; playPositive(); renderView();
  showToast('Posted: '+t.title+'.', {icon:'&#127916;'});
};
ACTIONS.sxOpenContent = function(){ ui.view = 'focus'; ui.focusTab = 'tasks'; ui.focusTasksSubTab = 'videoIdeas'; renderView(); };
