// ============ ROUND 65 ============
// The list is ROUND-65-LIST.md (with Andre's answers). Playbooks are SOPs: Task, Call / event and Document steps only;
// only Task steps make tasks; calls go on the Calendar; documents stay on the client's card until ticked. Reports are
// out of the app for now. Streaks: End / Restart work, the tab redone, and on Today a streak's rules are simply part of
// Today's standard. Op's tab can be dragged anywhere. No "?" on the activity pill.
const R65 = {};

// ================= A1. Three kinds of step =================
['report', 'access', 'send'].forEach(function(k){ delete PB_TYPES[k]; });
PB_TYPES.call.label = 'Call / event';
PB57_TYPES.length = 0; PB57_TYPES.push('task', 'call', 'doc');
const R65_GONE = /^(report|access|send)$/;
// (the presets lose those steps too)
r60Sp = (function(base){ return function(title, type){ if(R65_GONE.test(String(type || ''))) return null; return base.apply(this, arguments); }; })(r60Sp);
r60St = (function(base){ return function(name, extra, steps){ return base.call(this, name, extra, arr(steps).filter(Boolean)); }; })(r60St);
// (Andre: delete every Report, Access / info and Send / link step there is, and the open tasks they made)
function r65Clean(){
  let ch = false;
  pbAll().forEach(function(p){ arr(p.stages).forEach(function(st){ const n = arr(st.steps).length; st.steps = arr(st.steps).filter(function(it){ return !R65_GONE.test(String(it.type || '')); }); if(st.steps.length!==n) ch = true; }); });
  // only Task steps make tasks: an open task from any other kind of step comes off the list
  // (in place: other code holds on to this same list)
  const L = state.tasks.items;
  for(let i = L.length - 1; i >= 0; i--){ const t = L[i], m = t && t.master; if(m && m.kind==='pb' && t.status!=='done' && m.type && m.type!=='task'){ L.splice(i, 1); ch = true; } }
  return ch;
}

// ================= A2. Only Task steps make tasks; calls on the Calendar; documents on the card =================
// While the playbooks sync, the task-making part sees only Task steps (a stage still waits for every step before it
// moves them on). Calls become events on your Calendar on their due day, with the client's name; once the day has
// passed the call counts as done. Documents show on the client's card in Playbooks until you tick them.
pbState = (function(base){
  return function(){
    const s = base.apply(this, arguments);
    if(!R65.inSync || !s || !Array.isArray(s.occ)) return s;
    return Object.assign({}, s, {occ:s.occ.filter(function(o){ return (o.it.type || 'task')==='task'; })});
  };
})(pbState);
pbSync = (function(base){
  return function(){
    let ch = false;
    try{ if(r65Clean()) ch = true; }catch(e){}
    R65.inSync = true;
    let r;
    try{ r = base.apply(this, arguments); } finally { R65.inSync = false; }
    try{ if(r65AfterSync()) ch = true; }catch(e){}
    if(ch){ persist('business'); persist('tasks'); persist('calendar'); }
    return r || ch;
  };
})(pbSync);
function r65AfterSync(){
  let ch = false; const today = todayStr();
  pbPeople().forEach(function(P){
    const x = P.x; if(!x.pb || !x.pb.id) return;
    let s = pbState(P.kind, x); if(!s || !s.stage || s.future) return;
    x.pb.ev = x.pb.ev || {}; x.pb.r65ev = x.pb.r65ev || {};
    // (leads keep their calls as before: they fold into "Reach out to leads"; the Calendar is for clients' calls)
    if(P.kind==='client') s.occ.forEach(function(o){
      if((o.it.type || 'task')!=='call' || o.done) return;
      const when = o.ev ? o.ev.date : o.date;
      // done once it has happened
      if(when && when < today){ x.pb.done[o.key] = when; ch = true; return; }
      if(P.kind!=='client' || o.ev || x.pb.r65ev[o.key]) return;
      if(!o.date || o.date > addDays(today, 60)) return;
      const e = {id:uid(), title:pbName('client', x)+' · '+(o.it.title || 'Call'), date:o.date, time:'', linkedClient:x.id, notes:(s.p.name+' · '+s.stage.name), r65pb:o.key};
      state.calendar.events.push(e);
      x.pb.r65ev[o.key] = e.id;
      // (the step follows the event: move the event and the call moves with it)
      if(!/:\d{4}-\d\d-\d\d$/.test(o.key)) x.pb.ev[o.key] = e.id;
      ch = true;
    });
    // a stage whose steps are all done moves them on (calls and documents count too)
    s = pbState(P.kind, x);
    if(s && s.stage && !s.future && !x.pb.finished && !pb57Rep(s.stage) && s.occ.length && !s.open.length){ if(pbAdvance(P.kind, x)) ch = true; }
  });
  return ch;
}
// documents: on the client's card until ticked (with the file or link to open)
pbCardHtml = (function(base){
  return function(kind, x){
    const h = base.apply(this, arguments), s = pbState(kind, x); if(!s || !s.stage) return h;
    const docs = s.open.filter(function(o){ return o.it.type==='doc'; }); if(!docs.length) return h;
    const rows = docs.map(function(o){
      const links = arr(o.it.links).map(function(l){ const u = typeof l==='string' ? l : (l && (l.url || l.href)) || ''; return /^https?:\/\//.test(u) ? '<a class="r65-dl" href="'+escapeHtml(u)+'" target="_blank" rel="noopener" data-hov="Open it">&#128279;</a>' : ''; }).join('');
      return '<div class="r65-doc"><span class="r65-di">&#128196;</span><span class="r65-dt">'+escapeHtml(o.it.title || 'Document')+'</span>'+links+'<button class="r65-dk" data-action="r65DocDone" data-id="'+kind+'|'+x.id+'|'+escapeHtml(o.key)+'" aria-label="Done" data-hov="Done">&#10003;</button></div>';
    }).join('');
    return h.replace(/<\/div>$/, '<div class="r65-docs">'+rows+'</div></div>');
  };
})(pbCardHtml);
ACTIONS.r65DocDone = function(el, e, v){
  if(e && e.stopPropagation) e.stopPropagation();
  const a = String(v || '').split('|'), x = crmFind(a[0], a[1]); if(!x || !x.pb) return;
  x.pb.done = x.pb.done || {}; x.pb.done[a.slice(2).join('|')] = todayStr();
  playTick(); pbSave(); try{ pbSync(); }catch(err){} renderView();
};
// (a tap on the ✓ or the link doesn't open the person)
document.addEventListener('click', function(e){ if(e.target.closest && e.target.closest('.r65-docs a')) e.stopPropagation(); }, true);

// ================= A3. No reports =================
ACTIONS.r55Report = function(){};
ACTIONS.r57CliExport = function(){};
(function(){ const i = OP_TOOLS.findIndex(function(t){ return t.name==='client_report'; }); if(i >= 0) OP_TOOLS.splice(i, 1); })();
opRunTool = (function(base){ return function(name){ if(name==='client_report') return 'reports are switched off for now'; return base.apply(this, arguments); }; })(opRunTool);
// (the buttons are gone wherever they were drawn: Social, a client, Op's full screen)
afterRenderHooks.push(function(){ try{ document.querySelectorAll('[data-action="r55Report"], [data-action="r57CliExport"], .r55-opab').forEach(function(b){ b.remove(); }); }catch(e){} });

// ================= B4–5. Streaks: End / Restart work; the tab redone =================
ACTIONS.r63Restart = function(el, e, id){
  const c = r63List().find(function(x){ return x.id===id; }); if(!c) return;
  uiConfirm({title:'Restart '+c.name+'?', text:'Day 1 starts today.', ok:'Restart'}).then(function(ok){ if(!ok) return; c.start = todayStr(); c.log = {}; delete c.ended; persist('standards'); playTick(); renderView(); });
};
ACTIONS.r63End = function(el, e, id){
  const c = r63List().find(function(x){ return x.id===id; }); if(!c) return;
  const s = r63Status(c);
  uiConfirm({title:'End '+c.name+'?', text:'You’re on day '+s.day+' of '+c.days+'. It moves to your past streaks.', ok:'End it', danger:true}).then(function(ok){ if(!ok) return; c.ended = {date:todayStr(), done:false, at:Date.now()}; persist('standards'); showToast(c.name+' ended on day '+s.day+'.', {icon:'&#9209;'}); renderView(); });
};
r63Tab = function(){
  r63Settle();
  const act = r63Active(), past = r63List().filter(function(c){ return c.ended; }).slice().reverse();
  return '<div class="r65s">'+
    act.map(r65RunHtml).join('')+
    (act.length ? '' : r63NextHtml())+
    r65StdHtml()+
    '<section class="r65-sec"><div class="r65-h">'+(act.length ? 'Start another' : 'Start a streak')+'</div><div class="r65-pre">'+R63_PRESETS.map(function(p){ return '<button class="r65-pc" data-action="r63Setup" data-id="'+p.id+'"><span class="r65-pc-i">'+p.icon+'</span><b>'+p.name+'</b><small>'+(p.id==='own' ? 'Your rules' : p.days+' days')+'</small></button>'; }).join('')+'</div></section>'+
    (past.length ? '<section class="r65-sec"><div class="r65-h">Past streaks</div><div class="r65-past">'+past.slice(0, 8).map(function(c){ const s = r63Status(c); return '<div class="r65-pr"><b>'+escapeHtml(c.name)+'</b><span>'+(c.ended.done ? '&#127942; '+c.days+' days' : 'Day '+s.day+' of '+c.days)+'</span><small>'+escapeHtml(fmtDateShort(c.start))+'</small></div>'; }).join('')+'</div></section>' : '')+
    '<div class="r65-foot"><button class="r65-how" data-action="r65How">How streaks stick</button></div>'+
  '</div>';
};
function r65RunHtml(c){
  const s = r63Status(c), today = todayStr(), L = (c.log || {})[today] || [], done = c.rules.filter(function(r){ return L.indexOf(r.id) >= 0; }).length;
  const pct = Math.max(0, Math.min(100, Math.round(100*(s.day - (s.doneToday ? 0 : 1))/c.days)));
  let chain = '';
  for(let i = 0; i < c.days; i++){
    const d = addDays(c.strict==='track' ? c.start : s.runStart, i);
    chain += '<i class="'+(d > today ? '' : d===today ? (s.doneToday ? 'is-ok is-t' : 'is-t') : r63DayDone(c, d) ? 'is-ok' : s.slips.indexOf(d) >= 0 ? 'is-slip' : 'is-miss')+'"></i>';
  }
  const warn = s.slips.length && c.strict==='twice' && s.slips[s.slips.length - 1]===addDays(today, -1) ? '<span class="r65-warn">Missed yesterday. Don’t miss twice.</span>' : '';
  return '<section class="r65-run">'+
    '<div class="r65-run-l">'+
      '<div class="r65-name">'+escapeHtml(c.name)+'</div>'+
      '<div class="r65-ring" style="--p:'+pct+'"><div><b>'+s.day+'</b><span>of '+c.days+'</span></div></div>'+
      '<div class="r65-tag">'+R63_STRICT[c.strict]+(s.best > 1 && s.restarts ? ' · best '+s.best : '')+'</div>'+warn+
      '<div class="r65-acts"><button data-action="r63Restart" data-id="'+c.id+'">Restart</button><button data-action="r63End" data-id="'+c.id+'">End</button></div>'+
    '</div>'+
    '<div class="r65-run-r">'+
      '<div class="r65-th"><b>Today</b><span>'+done+' / '+c.rules.length+'</span></div>'+
      '<div class="r65-rules">'+c.rules.map(function(r){ const on = L.indexOf(r.id) >= 0; return '<button class="r65-rule'+(on ? ' is-on' : '')+'" data-action="r63Tick" data-id="'+c.id+'|'+r.id+'"><i>'+(on ? '&#10003;' : '')+'</i><span>'+escapeHtml(r.label)+'</span>'+(r.cue ? '<em>'+escapeHtml(r.cue)+'</em>' : '')+'</button>'; }).join('')+'</div>'+
      '<div class="r65-chain'+(c.days > 40 ? ' is-long' : '')+'">'+chain+'</div>'+
    '</div>'+
  '</section>';
}
function r65StdHtml(){
  const S = state.standards, items = arr(S.items), dw = S.deepWorkTargetMinutes || 180, off = S.daysOffAllowedPerWeek!=null ? S.daysOffAllowedPerWeek : 2;
  const opts = [60, 90, 120, 150, 180, 210, 240, 300, 360, 420, 480];
  return '<section class="r65-sec r65-std" id="r63Std"><div class="r65-h">Today’s standard</div><div class="r65-std-c">'+
    '<div class="r65-std-r"><label><span>Deep work</span><select class="input" data-r63-std="dw">'+opts.map(function(m){ return '<option value="'+m+'"'+(m===dw ? ' selected' : '')+'>'+fmtDurationLabel(m)+'</option>'; }).join('')+'</select></label>'+
      '<label><span>Days off a week</span><select class="input" data-r63-std="off">'+[0, 1, 2, 3].map(function(n){ return '<option value="'+n+'"'+(n===off ? ' selected' : '')+'>'+n+'</option>'; }).join('')+'</select></label></div>'+
    '<div class="r65-items">'+items.map(function(it){ return '<span class="r65-it"><input value="'+escapeHtml(it.label)+'" data-r63-item="'+it.id+'" aria-label="Rename"><button data-action="r63StdDel" data-id="'+it.id+'" aria-label="Remove">&#10005;</button></span>'; }).join('')+
      '<span class="r65-it is-add"><input id="r63StdNew" placeholder="+ Add to the standard"></span></div>'+
  '</div></section>';
}
ACTIONS.r65How = function(){ addSheetOpen('r65How', function(){ return asHead('&#128293;', 'How streaks stick')+'<div class="r65-tips">'+R63_TIPS.map(function(t){ return '<div><b>'+t[0]+'</b><span>'+t[1]+'</span></div>'; }).join('')+'</div>'; }); };

// ================= C6–7. Today: the day streak and hours worked; a streak's rules are part of the standard =================
PANEL_RENDERERS.personalStats = (function(base){
  return function(){
    let h = base.apply(this, arguments);
    for(let g = 0; g < 5; g++){ const c = r60Cut(h, '<div class="r64-runs">'); if(!c) break; h = c.rest; }
    h = h.replace('<span class="r64-sep" aria-hidden="true"></span>', '');
    // the left side: the day streak and the hours worked this week, nothing else
    h = h.replace(/<small class="sw-ss">[\s\S]*?<\/small>/, '');
    if(h.indexOf('class="sw-tw"') < 0){ let tw = ''; try{ tw = '<div class="sw-tw r65-tw"><b>'+fmtDurationLabel(weekWork().total)+'</b><span>worked this week</span></div>'; }catch(e){} h = h.replace(/(<div class="sw-streak">[\s\S]*?<\/div>)/, function(m0){ return m0+tw; }); }
    // (the same chips as the standard's own)
    return h.replace(/<button class="r63-chip r64-chip( is-on)?" data-action="r63Tick" data-id="([^"]+)" data-hov="[^"]*">(?:&#10003; )?([\s\S]*?)<\/button>/g, function(m0, on, id, label){ return '<span class="chip'+(on ? ' active' : '')+'" data-action="r63Tick" data-id="'+id+'">'+label+'</span>'; });
  };
})(PANEL_RENDERERS.personalStats);

// ================= D8. Op's tab: drag it anywhere; a better place to start =================
function r65OpPlace(b){
  if(!b || !b.classList.contains('r64-mini')) return;
  const r = b.getBoundingClientRect(), w = r.width || 260, hh = r.height || 44, P = state.profile.r65OpPos;
  let x, y;
  if(P && P.x!=null){ x = P.x; y = P.y; }
  else { const sb = document.querySelector('.sidebar, #sidebar'), l = sb ? sb.getBoundingClientRect().right : 0; x = Math.round(l + (window.innerWidth - l)/2 - w/2); y = window.innerHeight - hh - 28; }
  x = Math.max(8, Math.min(window.innerWidth - w - 8, x)); y = Math.max(8, Math.min(window.innerHeight - hh - 8, y));
  b.style.setProperty('left', x+'px', 'important'); b.style.setProperty('top', y+'px', 'important');
  b.style.setProperty('bottom', 'auto', 'important'); b.style.setProperty('right', 'auto', 'important');
  const dot = document.getElementById('r64Dot'); if(dot){ dot.style.left = (x + 4)+'px'; dot.style.top = (y + 7)+'px'; dot.style.bottom = 'auto'; }
}
opBubShow = (function(base){ return function(){ const b = base.apply(this, arguments); try{ r65OpPlace(b); }catch(e){} return b; }; })(opBubShow);
window.addEventListener('resize', function(){ r65OpPlace(document.getElementById('opBub')); });
(function(){
  let d = null;
  document.addEventListener('pointerdown', function(e){
    const b = e.target.closest && e.target.closest('#opBub.r64-mini'); if(!b || e.button!==0 || e.target.closest('.r58-round, .op-bub-x')) return;
    const r = b.getBoundingClientRect(); d = {b:b, dx:e.clientX - r.left, dy:e.clientY - r.top, x0:e.clientX, y0:e.clientY, moved:false};
  }, true);
  document.addEventListener('pointermove', function(e){
    if(!d) return;
    if(!d.moved && Math.abs(e.clientX - d.x0) + Math.abs(e.clientY - d.y0) < 5) return;
    d.moved = true; d.b.classList.add('is-dragging');
    state.profile.r65OpPos = {x:Math.round(e.clientX - d.dx), y:Math.round(e.clientY - d.dy)};
    r65OpPlace(d.b);
  });
  document.addEventListener('pointerup', function(){
    if(!d) return; const was = d.moved, b = d.b; d = null; b.classList.remove('is-dragging');
    if(was){ persist('profile'); R65.noClick = Date.now(); }
  });
  // (letting go after a drag isn't a tap)
  document.addEventListener('click', function(e){ if(R65.noClick && Date.now() - R65.noClick < 300 && e.target.closest && e.target.closest('#opBub')){ e.stopPropagation(); e.preventDefault(); R65.noClick = 0; } }, true);
})();
// double-click the tab: back to its usual place
document.addEventListener('dblclick', function(e){ const b = e.target.closest && e.target.closest('#opBub.r64-mini'); if(!b || e.target.closest('.r58-round')) return; state.profile.r65OpPos = null; persist('profile'); r65OpPlace(b); });

// ================= D9. The activity pill: no "?" (CSS) =================
setTimeout(function(){ try{ pbSync(); }catch(e){} }, 0);
