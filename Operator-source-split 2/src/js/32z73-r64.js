// ============ ROUND 64 ============
// The list is ROUND-64-LIST.md (with Andre's answers). Op as a small tab (his state only, no typing), one message per
// reply when you cut him off, everything you've said about the app in App updates, the streak panel as one console,
// a BMI scale that fills its panel, Fuel laid out properly, the Clients widget's bottom, Goals not flying in on a page
// switch, Focus analytics ranges (🔍) with a recap for the range, and a stage board for Playbooks like the Lead center.
const R64 = {readyAt:0};

// ================= A1. Op as a small tab =================
// No chat box and no typing: his state ("Listening…", "Thinking…", "Adding a task…", "Speaking"), his three buttons,
// close. Tap the state to open the whole conversation (full screen). While he works with the tab closed, a small
// pulsing dot in its place says he's still at it.
function r64State(){
  if(AI.listening) return {k:'listen', t:'Listening…'};
  if(OV.speaking || OV.pending) return {k:'speak', t:'Speaking'};
  if(AI.busy){ const w = (typeof r62WorkText==='function' && r62WorkText()) || 'Thinking…'; return {k:'work', t:w}; }
  if(typeof R62!=='undefined' && R62.queue) return {k:'work', t:'Up next…'};
  return {k:'idle', t:R64.replied && Date.now() - R64.replied < 60000 ? 'Replied · open' : 'Ready'};
}
opBubShow = (function(base){
  return function(){
    const b = base.apply(this, arguments);
    if(b && !b.classList.contains('r64-mini')){
      b.classList.add('r64-mini');
      const h = b.querySelector('.op-bub-h');
      if(h && !h.querySelector('.r64-st')){
        const st = document.createElement('button'); st.className = 'r64-st'; st.setAttribute('data-action', 'r57OpOpen'); st.setAttribute('aria-label', 'Open the conversation');
        st.innerHTML = '<i class="r64-ind"></i><span></span>';
        const k = h.querySelector('b'); if(k) k.after(st); else h.prepend(st);
      }
    }
    if(b){ b.style.removeProperty('width'); r64Tick(); }
    return b;
  };
})(opBubShow);
function r64Tick(){
  const b = document.getElementById('opBub'), s = r64State();
  const busy = s.k!=='idle';
  if(b){
    if(b.style.width) b.style.removeProperty('width');
    const st = b.querySelector('.r64-st span'); if(st && st.textContent!==s.t) st.textContent = s.t;
    ['listen', 'speak', 'work', 'idle'].forEach(function(k){ b.classList.toggle('r64-'+k, s.k===k); });
    const open = b.classList.contains('is-in');
    // (it tucks itself away a few seconds after he's done, unless you're on it)
    if(open && !busy){ if(!R64.readyAt) R64.readyAt = Date.now(); if(Date.now() - R64.readyAt > 7000 && !b.matches(':hover')){ b.classList.remove('is-in'); R64.readyAt = 0; } }
    else R64.readyAt = 0;
  }
  // working in the background: the tab is closed but he's busy
  const hidden = !b || !b.classList.contains('is-in');
  let dot = document.getElementById('r64Dot');
  if(busy && hidden && s.k!=='listen'){
    if(!dot){ dot = document.createElement('button'); dot.id = 'r64Dot'; dot.className = 'r64-dot'; dot.setAttribute('data-action', 'r64DotOpen'); dot.setAttribute('aria-label', 'Op is working'); document.body.appendChild(dot); }
    dot.setAttribute('data-hov', s.t); dot.classList.add('is-on');
  } else if(dot) dot.classList.remove('is-on');
}
setInterval(r64Tick, 250);
ACTIONS.r64DotOpen = function(){ if(typeof R62!=='undefined') R62.quiet = false; opBubShow(); const b = document.getElementById('opBub'); if(b) b.classList.add('is-in'); };
// (with his voice off, a reply is noted on the tab: "Replied · open")
aiAsk = (function(base){ return function(){ const r = base.apply(this, arguments); Promise.resolve(r).then(function(){ try{ if(!opVoiceOn()) R64.replied = Date.now(); }catch(e){} }).catch(function(){}); return r; }; })(aiAsk);

// ================= A2. Cut him off: each reply once =================
// The double came from the cut: the half-said line went into the chat, and then the whole reply (or the caption of the
// rest) went in as another message. Now a line of his that's part of one already there (since your last message) is
// dropped, and a fuller version replaces the part.
function r64Norm(t){ return String(t || '').toLowerCase().replace(/[’']/g, '').replace(/[^a-z0-9]+/g, ' ').trim(); }
opChatLog = (function(base){
  return function(r, t){
    if(r!=='op') return base.apply(this, arguments);
    const s = r64Norm(t), full = String(t || '').replace(/\s+/g, ' ').trim(); if(!s) return base.apply(this, arguments);
    const L = opChat();
    for(let i = L.length - 1; i >= 0 && i >= L.length - 5; i--){
      const e = L[i]; if(e.r==='me') break;
      if(e.r!=='op' || Date.now() - (e.at || 0) > 300000) continue;
      const a = r64Norm(e.t); if(!a) continue;
      if(a===s || a.indexOf(s) >= 0){ R64.merged = (R64.merged || 0) + 1; return; }
      if(s.indexOf(a) >= 0){ e.t = full.slice(0, 4000); persist('focus'); R64.merged = (R64.merged || 0) + 1; try{ OPCD.sig = ''; opChatDraw(); }catch(err){} return; }
    }
    return base.apply(this, arguments);
  };
})(opChatLog);

// ================= A3. Everything said about the app, in App updates =================
// The app reads back through your conversation with Op and lists anything you asked of the app that isn't in App
// updates yet, at the top of App updates: file each one (or all), or skip it. Every filing shows its "Saved" note.
const R64_APP = /\b(app|operator|op'?s|button|panel|tab|page|screen|widget|settings|layout|siz(e|ing)|ui|feature|bug|glitch|calendar|journal|playbooks?|dashboard|analytics|notifications?|streaks?|lead center|log center|overview|scroll|font|colou?r|animation|push[- ]to[- ]talk|shortcut|chat box|window)\b/i;
const R64_ASK = /\b(should|can you|could you|i want|i'd like|i would like|please|make|fix|add|remove|change|move|update|need|wanna|get rid|put|take out|redo|improve)\b/i;
function r64Filed(t){
  const n = r64Norm(t); if(!n) return true;
  return r58UpdateEntries().some(function(e){
    return [e.text, e.said, e.title].concat(arr(e.summaries)).some(function(x){ const m = r64Norm(x); return m && (m===n || m.indexOf(n) >= 0 || n.indexOf(m) >= 0 && m.length > 40 || (typeof r62Sim==='function' && r62Sim(n, m) >= .75)); });
  });
}
function r64Unfiled(){
  const skip = state.settings.r64Skip || {}, since = Date.now() - 45*86400000;
  return opChat().filter(function(e){
    const t = String(e.t || '');
    return e.r==='me' && (e.at || 0) >= since && t.length >= 25 && !skip[e.at] && R64_APP.test(t) && R64_ASK.test(t) && !r64Filed(t);
  }).slice(-40).reverse();
}
renderUpdatesTab = (function(base){
  return function(){
    const h = base.apply(this, arguments), L = r64Unfiled(); if(!L.length) return h;
    return '<div class="r64-unf"><div class="r64-unf-h"><b>Not in App updates yet</b><span>'+L.length+'</span><button class="btn btn-primary btn-sm" data-action="r64FileAll">File all</button></div>'+
      L.map(function(e){ return '<div class="r64-unf-r"><p>'+escapeHtml(e.t)+'</p><small>'+escapeHtml(fmtDateShort(todayStr(new Date(e.at))))+'</small><button class="btn btn-sm" data-action="r64File" data-id="'+e.at+'">File</button><button class="btn btn-ghost btn-sm" data-action="r64Skip" data-id="'+e.at+'">Skip</button></div>'; }).join('')+
    '</div>'+h;
  };
})(renderUpdatesTab);
function r64FileOne(e){
  const words = String(e.t || '').trim(); if(!words) return Promise.resolve();
  return r59Summarize(words).then(function(s){ r59File(s || words, s ? words : '', e.at); });
}
ACTIONS.r64File = function(el, ev, id){ const e = opChat().find(function(x){ return String(x.at)===String(id) && x.r==='me'; }); if(!e) return; r64FileOne(e).then(function(){ renderView(); }); };
ACTIONS.r64Skip = function(el, ev, id){ state.settings.r64Skip = state.settings.r64Skip || {}; state.settings.r64Skip[id] = 1; persist('settings'); renderView(); };
ACTIONS.r64FileAll = function(){
  const L = r64Unfiled(); let p = Promise.resolve();
  L.forEach(function(e){ p = p.then(function(){ return r64FileOne(e); }); });
  p.then(function(){ showToast(L.length+' filed in App updates.', {icon:'&#9989;'}); renderView(); });
};

// ================= B5. Clients: the bottom =================
// (the leads to reach out to sit in a tidy row of equal cards under a hairline; CSS)

// ================= B6. The streak panel: one console =================
// The running streak's day count sits right beside the fire streak, and its rules join Today's standard on one line.
PANEL_RENDERERS.personalStats = (function(base){
  return function(){
    let h = base.apply(this, arguments);
    // (Round 63's separate row goes)
    for(let g = 0; g < 5; g++){ const c = r60Cut(h, '<div class="r63-today">'); if(!c) break; h = c.rest; }
    const act = typeof r63Active==='function' ? r63Active() : []; if(!act.length) return h;
    const runs = act.map(function(c){ const s = r63Status(c); return '<button class="r64-run" data-action="r63Open" data-hov="'+escapeHtml(R63_STRICT[c.strict])+'"><b>'+escapeHtml(c.name)+'</b><span>Day '+s.day+'<small>/'+c.days+'</small></span></button>'; }).join('');
    h = h.replace(/(<div class="sw-streak">[\s\S]*?<\/div>)/, function(m0){ return m0+'<div class="r64-runs">'+runs+'</div>'; });
    const chips = act.map(function(c){ const L = (c.log || {})[todayStr()] || []; return c.rules.map(function(r){ const on = L.indexOf(r.id) >= 0; return '<button class="r63-chip r64-chip'+(on ? ' is-on' : '')+'" data-action="r63Tick" data-id="'+c.id+'|'+r.id+'" data-hov="'+escapeHtml(c.name)+'">'+(on ? '&#10003; ' : '')+escapeHtml(r.label)+'</button>'; }).join(''); }).join('');
    const i = h.indexOf('<div class="r60-std-c"'); if(i < 0) return h;
    const cut = r60Cut(h, '<div class="r60-std-c"'); if(!cut) return h;
    return h.slice(0, i)+cut.html.replace(/<\/div>$/, '<span class="r64-sep" aria-hidden="true"></span>'+chips+'</div>')+h.slice(i + cut.html.length);
  };
})(PANEL_RENDERERS.personalStats);

// ================= C8. Weight: a BMI scale that fills its panel =================
bmiScaleHtml = function(b){
  const lo = 15, hi = 35, w = function(a, z){ return (z - a)/(hi - lo)*100; }, pos = Math.max(1, Math.min(99, (Math.max(lo, Math.min(hi, b.bmi)) - lo)/(hi - lo)*100)), u = b.kg ? 'kg' : 'lb';
  const k = b.bmi < 18.5 ? 'u' : b.bmi < 25 ? 'h' : b.bmi < 30 ? 'o' : 'ob';
  return '<div class="r64-bmi">'+
    '<div class="r64-bmi-top"><b>'+b.bmi.toFixed(1)+'</b><span>BMI</span><em class="is-'+k+'">'+escapeHtml(b.cls)+'</em><small><b>'+b.w+'</b> '+u+(k==='h' ? '' : ' · healthy up to '+b.healthyMax+' '+u)+'</small></div>'+
    '<div class="r64-bmi-bar"><i class="u" style="flex:'+w(lo, 18.5)+'"></i><i class="h" style="flex:'+w(18.5, 25)+'"></i><i class="o" style="flex:'+w(25, 30)+'"></i><i class="ob" style="flex:'+w(30, hi)+'"></i><b style="left:'+pos.toFixed(1)+'%"></b></div>'+
    '<div class="r64-bmi-z"><span style="flex:'+w(lo, 18.5)+'"></span><span style="flex:'+w(18.5, 25)+'">Healthy<small>'+b.healthyMin+'–'+b.healthyMax+'</small></span><span style="flex:'+w(25, 30)+'">Overweight<small>'+b.healthyMax+'–'+b.obeseAt+'</small></span><span style="flex:'+w(30, hi)+'">Obese<small>'+b.obeseAt+'+</small></span></div>'+
  '</div>';
};

// ================= C10. Goals: nothing flies in from another page =================
// Cards that glide to their new place after a change (the goals, the lineup) also glided when you switched pages,
// from where the same goal sat on Today: on the first open of Goals that looked broken. They glide only within a page now.
function r64PageSig(){ return [ui.view, ui.personalTab, ui.businessTab, ui.focusMainTab, ui.socTab, ui.settingsTab].join('|'); }
renderView = (function(base){
  return function(){
    const sig = r64PageSig();
    if(R64.pageSig && R64.pageSig!==sig){ try{ document.querySelectorAll('#viewRoot [data-flip]').forEach(function(el){ el.removeAttribute('data-flip'); }); }catch(e){} }
    R64.pageSig = sig;
    return base.apply(this, arguments);
  };
})(renderView);

// ================= D11–12. Focus analytics: the range (🔍), and a recap for it =================
const R64_RANGES = [['today', 'Today'], ['week', 'This week'], ['lastweek', 'Last week'], ['month', 'This month'], ['lastmonth', 'Last month'], ['all', 'All time'], ['custom', 'Custom']];
const R64_RECAP = {today:'Day recap', week:'Week recap', lastweek:'Last week’s recap', month:'Month recap', lastmonth:'Last month’s recap', all:'All-time recap', custom:'Recap'};
function r64DaysBetween(a, b){ const out = []; if(!a || !b || a > b) return out; for(let d = a; d <= b && out.length < 800; d = addDays(d, 1)) out.push(d); return out; }
function r64MonthDays(off){ const t = new Date(todayStr()+'T12:00:00'); const f = new Date(t.getFullYear(), t.getMonth() + off, 1, 12), l = new Date(t.getFullYear(), t.getMonth() + off + 1, 0, 12); return r64DaysBetween(todayStr(f), todayStr(l)); }
function r64RangeLabel(r){
  if(r==='custom' && ui.anFrom && ui.anTo) return fmtDateShort(ui.anFrom)+' – '+fmtDateShort(ui.anTo);
  const x = R64_RANGES.find(function(q){ return q[0]===r; }); return x ? x[1] : 'Today';
}
rangeDays = (function(base){
  return function(r){
    if(r==='month') return r64MonthDays(0);
    if(r==='lastmonth') return r64MonthDays(-1);
    if(r==='custom') return r64DaysBetween(ui.anFrom || todayStr(), ui.anTo || todayStr());
    return base.apply(this, arguments);
  };
})(rangeDays);
analyticsOverviewHtml = (function(base){
  return function(r){ const h = base.apply(this, arguments); return ['month', 'lastmonth', 'custom'].indexOf(r) >= 0 ? h.split('All time').join(r64RangeLabel(r)).split('Last 14 days').join(r64RangeLabel(r)) : h; };
})(analyticsOverviewHtml);
analyticsRangeTabs = function(){
  const r = ui.analyticsRange || 'today';
  const pop = ui.r64Rng ? '<div class="r64-pop">'+R64_RANGES.filter(function(x){ return x[0]!=='custom'; }).map(function(x){ return '<button class="'+(r===x[0] ? 'is-on' : '')+'" data-action="analyticsRange" data-id="'+x[0]+'">'+x[1]+'</button>'; }).join('')+
    '<div class="r64-cus"><span>Custom</span><input type="date" class="input" id="r64From" value="'+escapeHtml(ui.anFrom || addDays(todayStr(), -13))+'" max="'+todayStr()+'"><span>to</span><input type="date" class="input" id="r64To" value="'+escapeHtml(ui.anTo || todayStr())+'" max="'+todayStr()+'"><button class="btn btn-primary btn-sm" data-action="r64Custom">Show</button></div></div>' : '';
  return '<button class="btn btn-ghost btn-sm r64-rc" data-action="r64Recap">&#128202; '+(R64_RECAP[r] || 'Recap')+'</button>'+
    '<span class="r64-rng"><button class="r64-rb'+(ui.r64Rng ? ' is-on' : '')+'" data-action="r64RangeOpen" aria-label="Pick the time frame">&#128269; <b>'+escapeHtml(r64RangeLabel(r))+'</b></button>'+pop+'</span>';
};
ACTIONS.r64RangeOpen = function(){ ui.r64Rng = !ui.r64Rng; renderView(); };
ACTIONS.analyticsRange = (function(base){ return function(){ ui.r64Rng = false; return base.apply(this, arguments); }; })(ACTIONS.analyticsRange);
ACTIONS.r64Custom = function(){
  const a = (document.getElementById('r64From') || {}).value, b = (document.getElementById('r64To') || {}).value;
  if(!a || !b){ showToast('Pick both dates.'); return; }
  ui.anFrom = a <= b ? a : b; ui.anTo = a <= b ? b : a; ui.analyticsRange = 'custom'; ui.analyticsDay = null; ui.r64Rng = false; ui.sessionsPage = false; renderView();
};
document.addEventListener('mousedown', function(e){ if(ui.r64Rng && !(e.target.closest && e.target.closest('.r64-rng'))){ ui.r64Rng = false; try{ renderView(); }catch(err){} } });
// a month or your own dates: the same look as a week, over those days
renderFocusAnalyticsTab = (function(base){
  return function(){
    const r = ui.analyticsRange || 'today';
    if(ui.sessionsPage || ['month', 'lastmonth', 'custom'].indexOf(r) < 0) return base.apply(this, arguments);
    const days = rangeDays(r);
    return '<div class="subtab-panel" data-key="analytics-'+r+'">'+analyticsOverviewHtml(r)+r64SpanHtml(days, r64RangeLabel(r))+recentSessionsHtml()+'</div>'+
      '<div class="section" style="margin-top:16px;">'+renderManualLogForm()+'</div>';
  };
})(renderFocusAnalyticsTab);
function r64SpanHtml(days, label){
  if(!days.length) return '';
  const n = days.length, prev = r64DaysBetween(addDays(days[0], -n), addDays(days[0], -1));
  const t = sumTotals(days), p = sumTotals(prev), elapsed = days.filter(function(d){ return d <= todayStr(); }).length || 1;
  const sel = ui.analyticsDay && days.indexOf(ui.analyticsDay) >= 0 ? ui.analyticsDay : (days.indexOf(todayStr()) >= 0 ? todayStr() : days[days.length - 1]);
  return '<div class="card analytics-hero r64-span">'+
    '<div class="row" style="justify-content:space-between;align-items:flex-end;"><div><div class="kpi-label">'+escapeHtml(label)+' &middot; '+fmtDateShort(days[0])+' – '+fmtDateShort(days[n - 1])+'</div>'+
      '<div class="analytics-big">'+fmtDurationLabel(t.deep)+' <span class="kpi-sub" style="font-size:13px;">deep work</span></div>'+
      '<div>'+deltaHtml(t.deep - p.deep, 'vs the '+n+' days before')+' &middot; <span class="kpi-sub">'+fmtDurationLabel(Math.round(t.deep/elapsed))+'/day avg</span></div></div>'+modeLegendHtml()+'</div>'+
  '</div>'+
  '<div class="section" style="margin-top:16px;">'+dayDetailHtml(sel)+'</div>';
}
// the recap for the range: Today is the day recap you know; a week, a month or your dates get their own
ACTIONS.r64Recap = function(){
  const r = ui.analyticsRange || 'today';
  if(r==='today'){ openDayRecap(todayStr()); return; }
  let days = rangeDays(r);
  if(!days){ const first = state.focus.sessions.map(function(s){ return s.date; }).sort()[0] || todayStr(); days = r64DaysBetween(first < addDays(todayStr(), -365) ? addDays(todayStr(), -365) : first, todayStr()); }
  days = days.filter(function(d){ return d <= todayStr(); });
  addSheetOpen('r64Recap', function(){ return r64RecapHtml(r, days); });
};
function r64RecapHtml(r, days){
  const target = state.standards.deepWorkTargetMinutes || 180, today = todayStr();
  const deep = function(d){ return d===today ? deepWorkMinutesTodayLive() : deepWorkMinutesFor(d); };
  const rows = days.map(function(d){ const m = deep(d), tk = state.tasks.items.filter(function(t){ return t.status==='done' && t.completedAt===d; }).length; return {d:d, m:m, tk:tk, ok:m >= target}; });
  const tot = rows.reduce(function(a, x){ return a + x.m; }, 0), tasks = rows.reduce(function(a, x){ return a + x.tk; }, 0), hit = rows.filter(function(x){ return x.ok; }).length;
  const best = rows.slice().sort(function(a, b){ return b.m - a.m; })[0], wk = workoutTotals(days);
  const sess = state.focus.sessions.filter(function(s){ return days.indexOf(s.date) >= 0; }).length;
  const tile = function(v, k){ return '<div class="r64-rt"><b>'+v+'</b><span>'+k+'</span></div>'; };
  return asHead('&#128202;', R64_RECAP[r] || 'Recap', escapeHtml(r64RangeLabel(r))+' · '+fmtDateShort(days[0])+' – '+fmtDateShort(days[days.length - 1]))+
    '<div class="r64-rts">'+tile(fmtDurationLabel(tot), 'deep work')+tile(fmtDurationLabel(Math.round(tot/Math.max(1, days.length))), 'a day')+tile(hit+'<small>/'+days.length+'</small>', 'days on target')+tile(tasks, 'tasks done')+tile(sess, 'sessions')+tile(wk.n, 'workouts')+'</div>'+
    (best && best.m ? '<div class="r64-best">Best day: <b>'+escapeHtml(fmtDateShort(best.d))+'</b>, '+fmtDurationLabel(best.m)+'</div>' : '')+
    '<div class="r64-rl">'+rows.slice().reverse().map(function(x){ return '<button class="r64-rr'+(x.ok ? ' is-ok' : '')+'" data-action="r64RecapDay" data-id="'+x.d+'"><span>'+escapeHtml(fmtDateShort(x.d))+'</span><i style="--w:'+Math.min(100, Math.round(100*x.m/Math.max(1, target)))+'%"></i><b>'+fmtDurationLabel(x.m)+'</b><small>'+x.tk+' task'+(x.tk===1 ? '' : 's')+'</small></button>'; }).join('')+'</div>';
}
ACTIONS.r64RecapDay = function(el, e, d){ addSheetClose('r64Recap'); openDayRecap(d); };

// ================= E13. Playbooks: a stage board, like the Lead center =================
// Overview: pick a playbook at the top; its stages are columns, the people on it are cards; drag a card to another
// stage to move them (their tasks follow, as when you move them by hand). Anyone not on a playbook waits in the tray at
// the bottom: drag them onto a stage to start them there.
pbEditorHtml = (function(base){
  return function(){
    if(ui.pbView==='build') return base.apply(this, arguments);
    pbSeed(); pbAll().forEach(pb57Migrate);
    const bar = '<div class="pb6-bar"><div class="seg-tabs seg-sm"><button class="seg-tab active" data-action="pb6View" data-id="board">Overview</button><button class="seg-tab" data-action="pb6View" data-id="build">Builder</button></div>'+
      '<span class="pb6-sp"></span><button class="btn btn-sm btn-primary" data-action="pb6NewOpen">+ New playbook</button></div>';
    if(!pbAll().length) return base.apply(this, arguments);
    const peopleOf = function(p){ return pbCountsFor(pbFor(p)).filter(function(x){ return x.pb && x.pb.id===p.id; }); };
    let p = (ui.pbSel && ui.pbSel!==R64.lastSel ? pbById(ui.pbSel) : null) || pbById(ui.r64Pb) || pbById(ui.pbSel);
    if(!p){ p = pbAll().find(function(q){ return peopleOf(q).length; }) || pbAll()[0]; ui.r64Pb = p.id; }
    ui.r64Pb = p.id; ui.pbSel = R64.lastSel = p.id; ui.pbWho = pbFor(p);
    const pills = '<div class="r64-pbs">'+pbAll().map(function(q){ const n = peopleOf(q).length; return '<button class="r64-pbp r58-drop'+(q.id===p.id ? ' is-on' : '')+'" data-action="r64PbPick" data-id="'+q.id+'" data-pb6-col="'+q.id+'" data-hov="Drop someone here to start them on it">'+(r58Star(q) ? '<i>&#9733;</i>' : '')+escapeHtml(q.name)+'<span>'+n+'</span><em>'+(pbFor(q)==='lead' ? 'Leads' : 'Clients')+'</em></button>'; }).join('')+'</div>';
    const who = pbFor(p), on = peopleOf(p), L = pbStages(p);
    const col = function(st, i){
      const P = on.filter(function(x){ return pb57Where(x, p)===st; });
      const c = ['#8B95A7', '#5EB8FF', '#F5B342', '#C58FFF', '#3FBE8E', '#FF7A59', '#E8636B'][i % 7];
      return '<section class="pb6-col r64-col" data-pb6-col="'+p.id+'|'+st.id+'" style="--sc:'+c+'"><header><i></i><b>'+escapeHtml(st.name)+'</b><span>'+P.length+'</span></header>'+
        '<small class="pb6-cmeta">'+(st.repeat==='month' ? 'Every month' : st.repeat==='days' ? 'Every '+st.days+' days' : arr(st.steps).length+' step'+(arr(st.steps).length===1 ? '' : 's'))+'</small>'+
        '<div class="pb6-cards">'+(P.length ? P.map(function(x){ return pbCardHtml(who, x); }).join('') : '<div class="r64-drop">Drop here</div>')+'</div></section>';
    };
    // (the tray: everyone not on a playbook, clients and leads; a lead can't go on a client playbook or the other way)
    const off = ['client', 'lead'].reduce(function(a, k){ return a.concat(pbCountsFor(k).filter(function(x){ return !x.pb || !x.pb.id || !pbById(x.pb.id); }).map(function(x){ return {k:k, x:x}; })); }, []);
    const tray = '<section class="pb6-col is-off r64-tray" data-pb6-col=""><header><b>Not on a playbook</b><span>'+off.length+'</span></header><div class="r64-trayg">'+(off.length ? off.map(function(o){ const x = o.x, k = o.k, d = r58Default(k); return pb57OffCard(k, x).replace(/<\/div>$/, (d ? '<button class="r58-put" data-action="r58PutDefault" data-id="'+k+':'+x.id+'">&#9733; '+escapeHtml(d.name)+'</button>' : '')+'</div>'); }).join('') : '<div class="r64-drop">Everyone’s on a playbook</div>')+'</div></section>';
    const start = pbAll().some(function(q){ return pbFor(q)==='client'; }) || typeof r60PresetCards!=='function' ? '' : '<section class="r60-empty"><div class="r60-empty-h"><b>Start your client playbooks</b></div>'+r60PresetCards()+'</section>';
    return '<div class="pb6 pb57 r64-pb">'+bar+pills+'<div class="pb6-board r64-board">'+L.map(col).join('')+'</div>'+tray+start+'</div>';
  };
})(pbEditorHtml);
ACTIONS.r64PbPick = function(el, e, id){ ui.r64Pb = id; ui.pbSel = R64.lastSel = id; playTick(); renderView(); };
