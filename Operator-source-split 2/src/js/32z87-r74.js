// ================= Round 74 =================
// Command View: one button, a board of its own while you're locked in, the right numbers, and it can go to the
// other screen. Tabs inside every section can be dragged into your own order. The XP page, redone.

// ---------------- Command View: the numbers were wrong ----------------
// "Done for the day" while locked in (it only looked at work hours, which end at 5), 0m while an hour was on the
// clock (it left out the session that's running), and 4h when your goal is 3h (it read a field that isn't there).
r71Today = function(){ try{ return deepWorkMinutesTodayLive() || 0; }catch(e){ try{ return deepWorkMinutesFor(todayStr()) || 0; }catch(x){ return 0; } } };
r71Target = function(){
  const c = r71Cfg(); if(c.target > 0) return c.target;
  try{ return Number(state.standards.deepWorkTargetMinutes) || Number(state.standards.deepWorkTarget) || 180; }catch(e){ return 180; }
};
r71Html = (function(base){
  return function(){
    let h = base.apply(this, arguments);
    if(state.focus && state.focus.activeSession) h = h.replace('<b>Done for the day</b><span>Off the clock</span>', '<b>Locked in</b><span>Working past your hours</span>');
    return h;
  };
})(r71Html);

// ---------------- Command View while you're locked in ----------------
function r74CvLockedOn(){ return r72P('cvLocked', true) !== false; }
function r74Elapsed(){
  const as = state.focus.activeSession; if(!as) return '';
  if(as.onBreak && as.breakEndsAt) return formatElapsed(Math.max(0, as.breakEndsAt - Date.now()));
  return formatElapsed(Math.max(0, Date.now() - as.startedAt));
}
function r74LockedBoard(){
  const as = state.focus.activeSession, onBreak = !!as.onBreak;
  const cur = ui.currentTaskId ? arr(state.tasks.items).find(function(t){ return t.id===ui.currentTaskId; }) : null;
  let nx = null; try{ nx = nextUpTask(); }catch(e){}
  const m = as.method && typeof LOCK_METHODS!=='undefined' ? LOCK_METHODS[as.method.id] : null;
  let st = null; try{ st = methodState(); }catch(e){}
  const done = r71Today(), target = r71Target(), pct = Math.max(0, Math.min(1, done/target)), left = Math.max(0, target - done);
  const kicker = onBreak ? '&#9749; On a break' : (m && as.method.id!=='block' ? m.icon+' '+escapeHtml(m.label) : '&#128274; Locked in');
  const title = onBreak ? (as.breakOverAt ? 'Break’s over. Lock back in.' : 'Breathe. Look away from the screen.') : (cur ? escapeHtml(typeof taskName==='function' ? taskName(cur) : cur.title) : 'Deep work');
  let sub = '';
  if(onBreak) sub = as.breakEndsAt ? 'Back at '+fmtTimeShort(as.breakEndsAt) : 'Back when you’re ready';
  else if(st) sub = '<span>'+npMethodLine(st)+'</span>';
  else sub = as.plannedMinutes ? 'Until '+fmtTimeShort(as.startedAt + as.plannedMinutes*60000) : 'Started '+fmtTimeShort(as.startedAt)+' · open-ended';
  const D = r71Deadlines(3);
  const dues = D.length ? D.map(function(d){
    const u = r71Urgency(d.days), when = d.days < 0 ? Math.abs(d.days)+'d late' : d.days===0 ? 'today' : d.days===1 ? 'tomorrow' : 'in '+d.days+'d';
    return '<div class="r74l-due'+(u ? ' is-'+u : '')+'"><b>'+escapeHtml(d.title)+'</b><span>'+when+'</span></div>';
  }).join('') : '<div class="r74l-none">Nothing with a date on it.</div>';
  const breaks = arr(as.breaks).length;
  return '<div class="r71 is-big r74l'+(onBreak ? ' is-break' : '')+'">'+
    '<div class="r74l-top"><span class="r74l-k">'+kicker+'</span><span class="r74l-clock">'+r72Clock()+'</span></div>'+
    '<div class="r74l-core">'+
      '<div class="r74l-t" data-r74t>'+r74Elapsed()+'</div>'+
      '<div class="r74l-task">'+title+'</div>'+
      '<div class="r74l-sub">'+sub+'</div>'+
    '</div>'+
    '<div class="r74l-prog">'+
      '<div class="r74l-bar"><i style="width:'+(pct*100).toFixed(1)+'%"></i>'+[0.25, 0.5, 0.75].map(function(q){ return '<u style="left:'+q*100+'%"></u>'; }).join('')+'</div>'+
      '<div class="r74l-pl"><span><b>'+escapeHtml(fmtDurationLabel(done) || '0m')+'</b> of '+escapeHtml(fmtDurationLabel(target))+' today</span><span>'+(left ? escapeHtml(fmtDurationLabel(left))+' to go' : '&#10003; Goal hit. Everything now is extra.')+'</span></div>'+
    '</div>'+
    '<div class="r74l-row">'+
      '<div class="r74l-c"><div class="r71-h">Up next</div>'+(nx && (!cur || nx.id!==cur.id) ? '<b>'+escapeHtml(nx.title)+'</b>' : '<span class="r74l-none">Nothing queued</span>')+'</div>'+
      '<div class="r74l-c r74l-dues"><div class="r71-h">What’s due</div>'+dues+'</div>'+
      '<div class="r74l-c"><div class="r71-h">This session</div><b>'+(breaks ? breaks+' break'+(breaks===1 ? '' : 's') : 'No breaks yet')+'</b><span>Started '+fmtTimeShort(as.startedAt)+'</span></div>'+
    '</div>'+
  '</div>';
}
r72CmdHtml = (function(base){
  return function(mode){
    const edit = mode!=='panel' && ui.r72CmdEdit;
    if(mode!=='panel' && !edit && state.focus.activeSession && r74CvLockedOn()){ try{ return r74LockedBoard(); }catch(e){} }
    let h = base.apply(this, arguments);
    if(edit) h = h.replace('<button class="btn btn-sm btn-primary" data-action="r72CmdEdit">Done</button>',
      '<button class="r74-sw'+(r74CvLockedOn() ? ' is-on' : '')+'" data-action="r74CvLocked" title="While you’re locked in, the board switches to the timer, what you’re on and your goal"><i></i>Locked-in board</button><button class="btn btn-sm btn-primary" data-action="r72CmdEdit">Done</button>');
    return h;
  };
})(r72CmdHtml);
ACTIONS.r74CvLocked = function(){ r72Set('cvLocked', !r74CvLockedOn()); playTick(); r71Open(); r74CvPush(); };

// ---------------- one button, and the other screen ----------------
const R74CV = {ext:false, ds:[], last:0, cssAt:0};
function r74App(){ const A = window.operatorApp; return A && A.cvDisplays ? A : null; }
function r74Displays(){
  const A = r74App(); if(!A) return Promise.resolve([]);
  return A.cvDisplays().then(function(d){ R74CV.ds = Array.isArray(d) ? d : []; return R74CV.ds; }).catch(function(){ return []; });
}
function r74OtherDisplays(){ return R74CV.ds.filter(function(d){ return !d.current; }); }
window.r74CvExt = function(on){
  R74CV.ext = !!on; R74CV.cssAt = 0;
  if(on){ if(document.getElementById('r71Full')) ACTIONS.r71Close(); r74CvPush(true); }
  try{ dockRefresh(); }catch(e){}
  document.querySelectorAll('.r73-cvb').forEach(function(b){ b.classList.toggle('is-on', R74CV.ext); });
};
function r74CvPayload(full){
  const keep = ui.r72CmdEdit; ui.r72CmdEdit = false;
  let html = ''; try{ html = '<button class="r71-x" aria-label="Close">&#10005;</button>'+r72CmdHtml('full'); }finally{ ui.r72CmdEdit = keep; }
  const p = {html:html};
  if(full){
    p.css = Array.prototype.map.call(document.querySelectorAll('style'), function(s){ return s.textContent; }).join('\n');
    p.htmlCls = document.documentElement.className;
    p.bodyCls = document.body.className.split(/\s+/).filter(function(c){ return c && !/^(mind-|r71-on|np-|op-near)/.test(c); }).join(' ');
    p.rootStyle = document.documentElement.getAttribute('style') || '';
    try{ p.sky = 'var R73CV={};'+r73CvSky.toString()+';r73CvSky();'; }catch(e){}
  }
  return p;
}
function r74CvPush(full){
  const A = r74App(); if(!A || !R74CV.ext || !A.cvPush) return;
  const needCss = full || !R74CV.cssAt;
  try{ A.cvPush(r74CvPayload(needCss)); R74CV.last = Date.now(); if(needCss) R74CV.cssAt = Date.now(); }catch(e){}
}
function r74CvOpenOn(id){
  const A = r74App(); if(!A) return;
  r74CvMenuClose();
  A.cvOpen(id).then(function(){ showToast('Command View is on the other screen. Esc there, or the button again, closes it.', {icon:'&#128250;', duration:5000}); });
}
function r74CvMenuClose(){ const m = document.getElementById('r74CvMenu'); if(m) m.remove(); }
function r74CvMenu(btn, ds){
  r74CvMenuClose();
  const m = document.createElement('div'); m.id = 'r74CvMenu'; m.className = 'r74-cvm';
  m.innerHTML = '<div class="r74-cvm-h">Command View</div>'+
    '<button data-action="r74CvHere"><i>&#9635;</i><span>Here<small>Full screen on this one</small></span></button>'+
    ds.filter(function(d){ return !d.current; }).map(function(d){ return '<button data-action="r74CvOn" data-id="'+d.id+'"><i>&#10697;</i><span>'+escapeHtml(d.label)+'<small>'+d.w+' × '+d.h+'</small></span></button>'; }).join('');
  document.body.appendChild(m);
  const r = btn.getBoundingClientRect();
  m.style.top = Math.round(r.bottom + 8)+'px'; m.style.right = Math.round(innerWidth - r.right)+'px';
  setTimeout(function(){ document.addEventListener('pointerdown', function off(e){ if(!m.contains(e.target)){ r74CvMenuClose(); document.removeEventListener('pointerdown', off, true); } }, true); }, 0);
}
ACTIONS.r74Cv = function(el){
  if(document.getElementById('r71Full')){ ACTIONS.r71Close(); return; }
  const A = r74App();
  if(A && R74CV.ext){ A.cvClose(); return; }
  if(!A){ r71Open(); return; }
  r74Displays().then(function(ds){ if(ds.length > 1) r74CvMenu(el || document.querySelector('.r73-cvb'), ds); else r71Open(); });
};
ACTIONS.r74CvHere = function(){ r74CvMenuClose(); r71Open(); };
ACTIONS.r74CvOn = function(el, e, id){ if(document.getElementById('r71Full')) ACTIONS.r71Close(); r74CvOpenOn(Number(id)); };
// on the board itself: send it to the other screen
r71Open = (function(base){
  return function(){
    const r = base.apply(this, arguments);
    const v = document.getElementById('r71Full'), o = r74OtherDisplays();
    if(v && o.length && !ui.r72CmdEdit && !v.querySelector('.r74-send')){
      const b = document.createElement('button'); b.className = 'r74-send'; b.dataset.action = 'r74CvOn'; b.dataset.id = o[0].id;
      b.innerHTML = '&#10697; Send to '+escapeHtml(o[0].label); v.appendChild(b);
    }
    return r;
  };
})(r71Open);
// ⌘⇧C and the Mind view's button go through the same door
document.addEventListener('keydown', function(e){
  if((e.metaKey || e.ctrlKey) && e.shiftKey && (e.key==='c' || e.key==='C') && R74CV.ext){ const A = r74App(); if(A){ e.stopImmediatePropagation(); A.cvClose(); } }
}, true);
// the board ticks: the timer every second, the other screen with it
setInterval(function(){
  const t = document.querySelector('#r71Full [data-r74t]'); if(t){ const v = r74Elapsed(); if(t.textContent!==v) t.textContent = v; }
  if(R74CV.ext && (state.focus.activeSession ? Date.now() - R74CV.last > 900 : Date.now() - R74CV.last > 20000)) r74CvPush();
}, 1000);
afterRenderHooks.push(function(){ if(R74CV.ext && Date.now() - R74CV.last > 1500) r74CvPush(); document.querySelectorAll('.r73-cvb').forEach(function(b){ b.classList.toggle('is-on', R74CV.ext); }); });
setTimeout(function(){ r74Displays(); const A = r74App(); if(A && A.cvIsOpen) A.cvIsOpen().then(function(o){ if(o) window.r74CvExt(true); }); }, 1500);
// the menu bar's Command View (one screen) opens it here
(function(){ try{ if(window.operatorPage) window.operatorPage = Object.freeze(Object.assign({}, window.operatorPage, {commandView:function(){ r71Open(); }})); }catch(e){} })();

// ---------------- drag tabs into your own order ----------------
// Any row of tabs (Personal, Business, Focus, Social, Settings…): hold one and slide it. The order sticks.
function r74TabStore(){ if(!state.settings.r74Tabs || typeof state.settings.r74Tabs!=='object') state.settings.r74Tabs = {}; return state.settings.r74Tabs; }
function r74TabId(t){ return t.dataset.tab || t.dataset.id || ''; }
function r74TabsIn(bar){
  const kids = Array.prototype.slice.call(bar.children);
  const tabs = kids.filter(function(t){ return t.dataset && t.dataset.action && r74TabId(t) && (t.classList.contains('tab') || t.classList.contains('subtab') || bar.classList.contains('settings-sidenav')); });
  if(tabs.length < 2) return null;
  const act = tabs[0].dataset.action; if(tabs.some(function(t){ return t.dataset.action!==act; })) return null;
  const i0 = kids.indexOf(tabs[0]), i1 = kids.indexOf(tabs[tabs.length - 1]); if(i1 - i0 !== tabs.length - 1) return null;
  return {act:act, tabs:tabs};
}
function r74TabsApply(){
  document.querySelectorAll('#viewRoot .tabs, #viewRoot .subtabs, #viewRoot .settings-sidenav').forEach(function(bar){
    const T = r74TabsIn(bar); if(!T) return;
    T.tabs.forEach(function(t){ t.dataset.r74drag = '1'; });
    const ord = r74TabStore()[T.act]; if(!Array.isArray(ord) || !ord.length) return;
    const pos = function(t){ const i = ord.indexOf(r74TabId(t)); return i < 0 ? 1000 + T.tabs.indexOf(t) : i; };
    const sorted = T.tabs.slice().sort(function(a, b){ return pos(a) - pos(b); });
    if(sorted.every(function(t, i){ return t===T.tabs[i]; })) return;
    const anchor = T.tabs[T.tabs.length - 1].nextSibling;
    sorted.forEach(function(t){ bar.insertBefore(t, anchor); });
  });
}
afterRenderHooks.push(function(){ try{ r74TabsApply(); }catch(e){} });
(function(){
  let D = null, eatClick = 0;
  document.addEventListener('pointerdown', function(e){
    if(e.button!==0) return;
    const t = e.target.closest && e.target.closest('[data-r74drag]'); if(!t) return;
    D = {t:t, bar:t.parentElement, act:t.dataset.action, id:r74TabId(t), x:e.clientX, y:e.clientY, on:false};
  }, true);
  // (tabs open on press, so the page may have redrawn under the finger: find the tab again by what it is)
  const fresh = function(){
    if(D.t.isConnected && D.t.dataset.action===D.act && r74TabId(D.t)===D.id) return true;
    D.t.classList.remove('r74-dragging');
    const n = Array.prototype.find.call(document.querySelectorAll('[data-r74drag]'), function(x){ return x.dataset.action===D.act && r74TabId(x)===D.id; });
    if(!n) return false; D.t = n; D.bar = n.parentElement; if(D.on) n.classList.add('r74-dragging'); return true;
  };
  document.addEventListener('pointermove', function(e){
    if(!D || !fresh()) return;
    if(!D.on){ if(Math.abs(e.clientX - D.x) + Math.abs(e.clientY - D.y) < 7) return; D.on = true; D.t.classList.add('r74-dragging'); document.body.classList.add('r74-tabdrag'); }
    e.preventDefault();
    const over = document.elementFromPoint(e.clientX, e.clientY), o = over && over.closest && over.closest('[data-r74drag]');
    if(!o || o===D.t || o.parentElement!==D.bar) return;
    const r = o.getBoundingClientRect(), vertical = D.bar.classList.contains('settings-sidenav');
    const after = vertical ? e.clientY > r.top + r.height/2 : e.clientX > r.left + r.width/2;
    D.bar.insertBefore(D.t, after ? o.nextSibling : o);
  });
  const end = function(){
    if(!D) return;
    const d = D; D = null;
    if(!d.on) return;
    { D = d; const ok = fresh(); D = null; if(!ok){ document.body.classList.remove('r74-tabdrag'); return; } }
    d.t.classList.remove('r74-dragging'); document.body.classList.remove('r74-tabdrag');
    const T = r74TabsIn(d.bar);
    if(T){ r74TabStore()[T.act] = T.tabs.map(r74TabId); persist('settings'); try{ playTick(); }catch(e){} }
    eatClick = Date.now();
  };
  document.addEventListener('pointerup', end); document.addEventListener('pointercancel', end);
  // the click at the end of a drag doesn't open the tab
  document.addEventListener('click', function(e){ if(eatClick && e.isTrusted && Date.now() - eatClick < 400 && e.target.closest && e.target.closest('[data-r74drag]')){ e.stopImmediatePropagation(); e.preventDefault(); eatClick = 0; } }, true);
})();
ACTIONS.r74TabsReset = function(){ state.settings.r74Tabs = {}; persist('settings'); playTick(); renderView(); showToast('Tabs are back in their first order.', {icon:'&#8634;'}); };
r73InterfaceSetHtml = (function(base){
  return function(){
    const h = base.apply(this, arguments), n = Object.keys(r74TabStore()).length;
    return h.replace(/<\/div>$/, r51Row('Tab order: drag any tab to move it'+(n ? ' ('+n+' row'+(n===1 ? '' : 's')+' moved)' : ''), n ? '<button class="btn btn-ghost btn-sm" data-action="r74TabsReset">Reset</button>' : '<span class="r74-muted">Nothing moved</span>')+'</div>');
  };
})(r73InterfaceSetHtml);

// ---------------- the XP page, redone ----------------
// One hero: your card (with what it adds up to under it), your level and the road to the next rank, and the last
// seven days as bars. Then today (areas + quests) side by side, the stats, the ranks as a ladder, the sources.
function r74XpWeek(){
  const out = [], t = todayStr(); let ctx = null, st = ''; try{ ctx = xpCtx(); }catch(e){} try{ st = xpStart(); }catch(e){}
  for(let i = 6; i >= 0; i--){
    const d = addDays(t, -i); let v = 0;
    if(!(st && d < st)) try{ const items = (i && typeof xpCache!=='undefined' && xpCache.days && xpCache.days[d]) || xpDay(d, ctx); v = items.reduce(function(a, x){ return a + x.xp; }, 0); }catch(e){}
    out.push({d:d, v:v, today:i===0, l:['S', 'M', 'T', 'W', 'T', 'F', 'S'][new Date(d+'T12:00:00').getDay()]});
  }
  return out;
}
r72XpPage = function(){
  const x = xpSummary(), r = RANKS[x.rank] || RANKS[0], next = RANKS[x.rank + 1];
  let Q = []; try{ Q = r70Quests(); }catch(e){}
  const open = Q.filter(function(q){ return !q.done; }), got = Q.length - open.length;
  let card = ''; try{ card = playerCardHtml('you'); }catch(e){}
  let today = ''; try{ today = r43TodayAreasHtml(x); }catch(e){}
  let reward = ''; try{ reward = r43NextRewardHtml() || ''; }catch(e){}
  const pct = Math.min(100, (x.levelPct || 0)*100), W = r74XpWeek(), wkSum = W.reduce(function(a, d){ return a + d.v; }, 0), wkMax = Math.max(1, W.reduce(function(a, d){ return Math.max(a, d.v); }, 0));
  const best = W.reduce(function(a, d){ return d.v > a.v ? d : a; }, W[0]);
  let streak = 0; try{ const s0 = computeStreak(); streak = typeof s0==='number' ? s0 : (s0 && (s0.current != null ? s0.current : s0.count)) || 0; }catch(e){}
  const quest = function(q){ return '<button class="r72x-q'+(q.done ? ' is-done' : '')+'" data-action="'+q.act+'"><i>'+(q.done ? '&#10003;' : q.icon)+'</i><span>'+escapeHtml(q.label)+(q.weekly ? ' <em>this week</em>' : '')+'</span><b>'+(q.done ? 'done' : '+'+q.xp.toLocaleString())+'</b></button>'; };
  const areas = (x.attrs && x.attrs.areas) || [];
  const need = next ? [['Level', x.level+' / '+next.level, x.level >= next.level]]
    .concat(next.low ? [['Every area', areas.length ? Math.min.apply(null, areas.map(function(a){ return a.v; }))+' / '+next.low : '– / '+next.low, areas.length && areas.every(function(a){ return a.v >= next.low; })]] : [])
    .concat(next.mrr ? [['MRR', '$'+Math.round(xpMrr()).toLocaleString()+' / $'+next.mrr.toLocaleString(), xpMrr() >= next.mrr]] : []) : [];
  return '<div class="view-header"><div><div class="view-title">XP</div></div></div>'+
  '<div class="r74x" style="--rc:'+r.color+'">'+
    '<section class="r74x-hero">'+
      '<div class="r74x-me">'+card+
        '<div class="r74x-chips"><div><b>'+x.total.toLocaleString()+'</b><span>total XP</span></div><div><b>'+wkSum.toLocaleString()+'</b><span>last 7 days</span></div><div><b>'+(streak || 0)+'</b><span>day streak</span></div></div>'+
      '</div>'+
      '<div class="r74x-lv">'+
        '<div class="r74x-lh"><div class="r74x-big"><small>Level</small><b>'+x.level+'</b></div><div class="r74x-rank"><b>'+escapeHtml(r.name)+'</b><span>'+escapeHtml(r.tag || '')+'</span></div></div>'+
        '<div class="r74x-bar"><i style="width:'+pct.toFixed(1)+'%"></i></div>'+
        '<div class="r74x-ln"><span><b>'+x.total.toLocaleString()+'</b> XP</span><span>'+(x.maxed ? 'Maxed out' : x.canLevel ? 'Level '+(x.level + 1)+' is ready' : (x.levelHi - x.total).toLocaleString()+' to level '+(x.level + 1))+'</span></div>'+
        (x.canLevel ? '<button class="r72x-claim" data-action="r70Claim"><span>&#128293;</span> Claim level '+(x.level + 1)+'</button>' : '')+
        (next ? '<div class="r74x-next"><div class="r74x-nh">Next rank <b style="color:'+next.color+'">'+escapeHtml(next.name)+'</b></div><div class="r74x-need">'+need.map(function(n){ return '<div class="'+(n[2] ? 'is-ok' : '')+'"><span>'+n[0]+'</span><b>'+escapeHtml(n[1])+'</b><i>'+(n[2] ? '&#10003;' : '')+'</i></div>'; }).join('')+'</div></div>' : '')+
        reward+
      '</div>'+
      '<div class="r74x-wk"><div class="r74x-wh"><b>Last 7 days</b><span>'+(best && best.v ? 'Best: '+best.v.toLocaleString()+' XP' : 'Nothing yet')+'</span></div>'+
        '<div class="r74x-bars">'+W.map(function(d){ return '<div class="r74x-b'+(d.today ? ' is-today' : '')+'" title="'+escapeHtml(d.d)+' · '+d.v.toLocaleString()+' XP"><em>'+(d.v ? d.v.toLocaleString() : '')+'</em><i style="height:'+Math.max(3, d.v/wkMax*100).toFixed(1)+'%"></i><span>'+d.l+'</span></div>'; }).join('')+'</div>'+
        '<div class="r74x-wf"><span>'+wkSum.toLocaleString()+' XP this stretch</span><span>avg '+Math.round(wkSum/7).toLocaleString()+' / day</span></div>'+
      '</div>'+
    '</section>'+
    '<div class="r74x-row">'+
      '<section class="card r74x-today">'+today+'</section>'+
      (Q.length ? '<section class="card r74x-qs"><div class="r72x-h"><b>Today’s quests</b><span>'+(open.length ? got+' of '+Q.length+' done · '+open.reduce(function(a, q){ return a + q.xp; }, 0).toLocaleString()+' XP out there' : 'All done today')+'</span></div>'+
        '<div class="r72x-qs">'+open.map(quest).join('')+Q.filter(function(q){ return q.done; }).map(quest).join('')+'</div></section>' : '')+
    '</div>'+
    '<section class="r74x-sec"><div class="r72x-h"><b>Your stats</b><span>What each number is, and what moves it</span></div>'+
      '<div class="r72x-areas">'+areas.map(function(a){
        return '<div class="card r72x-a" style="--ac:'+a.color+'"><div class="r72x-ah"><b>'+a.v+'</b><span>'+escapeHtml(a.name)+'</span></div>'+
          arr(a.subs).map(function(s){
            const v = s.v==null ? null : s.v, doc = R72_STAT_DOC[s.label] || '';
            return '<div class="r72x-s'+(v==null ? ' is-empty' : '')+'"><div class="r72x-sl"><b>'+escapeHtml(s.label)+'</b><em>'+(v==null ? '–' : v)+'</em></div>'+
              '<i><u style="width:'+(v==null ? 0 : Math.max(0, Math.min(100, (v - 25)/75*100))).toFixed(0)+'%"></u></i>'+
              (doc ? '<p>'+escapeHtml(doc)+'</p>' : '')+(s.note ? '<small>'+escapeHtml(s.note)+'</small>' : '')+'</div>';
          }).join('')+'</div>';
      }).join('')+'</div></section>'+
    '<section class="card r74x-sec r74x-ladder"><div class="r72x-h"><b>Ranks</b><span>Each needs the level, every area at the number shown, and (with clients) the MRR</span></div>'+
      '<div class="r74x-track">'+RANKS.map(function(k, i){
        return '<div class="r74x-r'+(i===x.rank ? ' is-now' : i < x.rank ? ' is-past' : '')+'" style="--k:'+k.color+'"><i></i><b>'+escapeHtml(k.name)+'</b><span>Lv '+k.level+'</span><small>'+(k.low ? 'Areas '+k.low+'+' : 'Start')+(k.mrr ? ' · $'+(k.mrr >= 1000 ? Math.round(k.mrr/1000)+'k' : k.mrr) : '')+'</small>'+(i===x.rank ? '<em>You</em>' : '')+'</div>';
      }).join('')+'</div></section>'+
    '<section class="r74x-sec"><div class="r72x-h"><b>Where XP comes from</b><span>Real actions only. Nothing for opening the app</span></div>'+
      '<div class="r72x-src">'+r72XpSources().map(function(g){
        return '<div class="card r72x-g" style="--gc:'+g.c+'"><div class="r72x-gk">'+escapeHtml(g.k)+'</div>'+g.rows.map(function(rw){ return '<div class="r72x-gr"><b>'+escapeHtml(rw[0])+'</b><span>'+escapeHtml(rw[1])+'</span></div>'; }).join('')+'</div>';
      }).join('')+'</div></section>'+
  '</div>';
};
