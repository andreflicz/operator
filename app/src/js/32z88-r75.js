// ================= Round 75 =================
// Command View becomes the Command Center and takes Minimal view's place: one full screen (no scrolling, no Mac
// title bar), the essentials to look at (focus first) and a few things to do (tick tasks off, a journal line in
// the bubble, one lock button). It opens by itself when you lock in (Settings). Quotes rotate and every one can be
// edited or removed. Today loses its duplicates, the day's progress moves up by the streak, Your time goes full
// width. Tags become one list with one way to add. Credit cards count as debt. The season stops fighting the top.

// ---------------- small helpers ----------------
function r75Min12(m){ if(m==null) return ''; const h = Math.floor(m/60), mm = m % 60; return ((h % 12) || 12)+':'+(mm < 10 ? '0' : '')+mm+' '+(h < 12 ? 'AM' : 'PM'); }
function r75Hash(s){ s = String(s || ''); let h = 5381; for(let i = 0; i < s.length; i++) h = ((h << 5) + h + s.charCodeAt(i)) | 0; return 'q'+(h >>> 0).toString(36); }
function r75App(){ return window.operatorApp || null; }

// ---------------- quotes: every one editable, removable ----------------
function r75Q(){ const s = state.settings; if(!s.r75Q || typeof s.r75Q!=='object') s.r75Q = {}; const q = s.r75Q; if(!q.edit || typeof q.edit!=='object') q.edit = {}; if(!q.gone || typeof q.gone!=='object') q.gone = {}; return q; }
Object.keys(QUOTE_SETS).forEach(function(kind){
  QUOTE_SETS[kind] = (function(base){
    return function(){
      const list = base.apply(this, arguments) || [], Q = r75Q(), out = [];
      list.forEach(function(q){
        if(!q) return; const k = r75Hash(q[0]); if(Q.gone[k]) return;
        const e = Q.edit[k], x = e ? [e[0], e[1] || ''] : [q[0], q[1] || '']; x.key = k; out.push(x);
      });
      if(out.length) return out;
      return list.length ? list.slice(0, 1).map(function(q){ const x = [q[0], q[1] || '']; x.key = r75Hash(q[0]); return x; }) : [['Do the work.', '']];
    };
  })(QUOTE_SETS[kind]);
});
quoteHtml = (function(base){
  return function(q){
    const h = base.apply(this, arguments);
    if(!q || !q.key) return h;
    return h.replace('<blockquote>', '<button class="qt-edit" data-action="r75QEdit" data-id="'+q.key+'" title="Edit or remove this quote">&#9998;</button><blockquote>');
  };
})(quoteHtml);
// every quote you can see is in some set; find the one with this key, from any set
function r75QFind(key){
  let hit = null;
  Object.keys(QUOTE_SETS).forEach(function(kind){ if(hit) return; try{ (QUOTE_SETS[kind]() || []).forEach(function(q){ if(!hit && q.key===key) hit = q; }); }catch(e){} });
  return hit;
}
ACTIONS.r75QEdit = function(el, e, key){
  if(e && e.stopPropagation) e.stopPropagation();
  const q = r75QFind(key); if(!q) return;
  r75QClose();
  const m = document.createElement('div'); m.id = 'r75QE'; m.className = 'r75-qe';
  m.innerHTML = '<div class="r75-qe-c" role="dialog" aria-label="Edit quote"><div class="r75-qe-h">Edit this quote</div>'+
    '<textarea class="input" id="r75QT" rows="3">'+escapeHtml(q[0])+'</textarea>'+
    '<input class="input" id="r75QW" placeholder="Who said it (leave empty for nothing)" value="'+escapeHtml(q[1] || '')+'">'+
    '<div class="r75-qe-f"><button class="btn btn-sm r75-qe-del" data-action="r75QGone" data-id="'+key+'">Remove it</button><span></span>'+
    '<button class="btn btn-sm btn-ghost" data-action="r75QClose">Cancel</button><button class="btn btn-sm btn-primary" data-action="r75QSave" data-id="'+key+'">Save</button></div></div>';
  document.body.appendChild(m);
  setTimeout(function(){ const t = document.getElementById('r75QT'); if(t){ t.focus(); t.setSelectionRange(t.value.length, t.value.length); } }, 30);
};
function r75QClose(){ const m = document.getElementById('r75QE'); if(m) m.remove(); }
ACTIONS.r75QClose = function(){ r75QClose(); };
function r75QRefresh(){ r75QClose(); try{ renderView(); }catch(e){} if(document.getElementById('r71Full')) r71Open(); }
ACTIONS.r75QSave = function(el, e, key){
  const t = (document.getElementById('r75QT') || {}).value, w = (document.getElementById('r75QW') || {}).value;
  if(!String(t || '').trim()){ ACTIONS.r75QGone(el, e, key); return; }
  r75Q().edit[key] = [String(t).trim().slice(0, 300), String(w || '').trim().slice(0, 60)]; persist('settings'); playTick(); r75QRefresh();
};
ACTIONS.r75QGone = function(el, e, key){ r75Q().gone[key] = 1; delete r75Q().edit[key]; persist('settings'); playTick(); r75QRefresh(); showToast('That quote won’t come up again.', {icon:'&#9998;'}); };
ACTIONS.r75QReset = function(){ state.settings.r75Q = {}; persist('settings'); playTick(); renderView(); showToast('Every quote is back, as it was.', {icon:'&#8634;'}); };
document.addEventListener('keydown', function(e){ if(e.key==='Escape' && document.getElementById('r75QE')){ e.stopImmediatePropagation(); r75QClose(); } }, true);
// the board's quote: its own list (work + starting), turning every 40 seconds
function r75QList(){ let L = []; try{ L = QUOTE_SETS.work().concat(QUOTE_SETS.action()); }catch(e){} return L.length ? L : [['Do the work.', '']]; }
function r75QNow(){ const L = r75QList(); if(ui.r75Qi==null) ui.r75Qi = dayNum() % L.length; return L[((ui.r75Qi % L.length) + L.length) % L.length]; }
ACTIONS.r75QNext = function(){ ui.r75Qi = (ui.r75Qi || 0) + 1; ui.r75QAt = Date.now(); if(document.getElementById('r71Full')) r71Open(); r74CvPush(); };

// ---------------- the Command Center ----------------
const R75_PANELS = [
  {id:'tasks', label:'Today’s tasks (tick them off)'},
  {id:'due', label:'What’s due'},
  {id:'cal', label:'Today’s calendar'},
  {id:'time', label:'Your time'},
  {id:'weather', label:'Weather'},
  {id:'quote', label:'Quotes (they turn every 40s)'},
  {id:'bubble', label:'Journal bubble'}
];
function r75Cfg(){ const c = r71Cfg(); if(!c.cc || typeof c.cc!=='object') c.cc = {}; return c.cc; }
function r75On(id){ return r75Cfg()[id]!==false; }
function r75AutoOn(){ return r72P('cvAuto', true)!==false; }
function r75Live(){ const as = state.focus.activeSession, m = state.modes && state.modes.active; return as ? (as.onBreak ? 'break' : 'locked') : m ? (m.sleep ? 'asleep' : m.type==='shooting' ? 'shooting' : 'mode') : 'free'; }
function r75TodayTasks(){
  const all = arr(state.tasks.items);
  const open = all.filter(function(t){ return t.status==='today' && !(typeof isOngoingDoneToday==='function' && isOngoingDoneToday(t)); });
  const done = all.filter(function(t){ return (t.status==='done' && t.completedAt===todayStr()) || (typeof isOngoingDoneToday==='function' && isOngoingDoneToday(t)); });
  return {open:open, done:done};
}
function r75Progress(){ const d = r71Today(), t = r71Target(); return {done:d, target:t, pct:Math.max(0, Math.min(1, d/t)), left:Math.max(0, t - d)}; }
function r75RhythmLine(){
  let R = null; try{ R = r71Rhythm(); }catch(e){} if(!R) return '';
  if(R.today!=null){
    if(R.drift==null) return 'Started '+r75Min12(R.today);
    const a = Math.abs(R.drift);
    return 'Started '+r75Min12(R.today)+(a <= 20 ? ' · on rhythm' : R.drift > 0 ? ' · '+fmtDurationLabel(a)+' later than usual' : ' · '+fmtDurationLabel(a)+' earlier than usual');
  }
  return R.usual!=null ? 'You usually start around '+r75Min12(R.usual) : '';
}
function r75Ring(pct, size){
  const C = 2*Math.PI*42;
  return '<svg class="r75-ring" viewBox="0 0 100 100" style="width:'+size+';height:'+size+'"><circle cx="50" cy="50" r="42" class="r75-ring-t"/><circle cx="50" cy="50" r="42" class="r75-ring-a" stroke-dasharray="'+(C*pct).toFixed(1)+' '+C.toFixed(1)+'"/></svg>';
}
function r75FocusHtml(){
  const P = r75Progress(), as = state.focus.activeSession;
  const bar = '<div class="r75-pg"><div class="r75-pg-b"><i style="width:'+(P.pct*100).toFixed(1)+'%"></i></div><div class="r75-pg-l"><span><b>'+escapeHtml(fmtDurationLabel(P.done) || '0m')+'</b> of '+escapeHtml(fmtDurationLabel(P.target))+' today</span><span>'+(P.left ? escapeHtml(fmtDurationLabel(P.left))+' to go' : '&#10003; Goal hit')+'</span></div></div>';
  if(as){
    const onBreak = !!as.onBreak, cur = ui.currentTaskId ? arr(state.tasks.items).find(function(t){ return t.id===ui.currentTaskId; }) : null;
    const m = as.method && typeof LOCK_METHODS!=='undefined' ? LOCK_METHODS[as.method.id] : null;
    let st = null; try{ st = methodState(); }catch(e){}
    const kick = onBreak ? '&#9749; On a break' : (m && as.method.id!=='block' ? m.icon+' '+escapeHtml(m.label) : '&#128274; Locked in');
    const sub = onBreak ? (as.breakEndsAt ? 'Back at '+fmtTimeShort(as.breakEndsAt) : 'Back when you’re ready') : st ? npMethodLine(st) : (as.plannedMinutes ? 'Until '+fmtTimeShort(as.startedAt + as.plannedMinutes*60000) : 'Started '+fmtTimeShort(as.startedAt));
    return '<section class="r75-c r75-focus is-on'+(onBreak ? ' is-break' : '')+'"><div class="r75-k">'+kick+'</div>'+
      '<div class="r75-timer" data-r74t>'+r74Elapsed()+'</div>'+
      '<div class="r75-task">'+(cur ? escapeHtml(typeof taskName==='function' ? taskName(cur) : cur.title) : onBreak ? 'Breathe. Look away from the screen.' : 'Deep work')+'</div>'+
      '<div class="r75-sub">'+sub+'</div>'+bar+'</section>';
  }
  let nx = null; try{ nx = nextUpTask(); }catch(e){}
  const rh = r75RhythmLine();
  return '<section class="r75-c r75-focus"><div class="r75-k">Today</div>'+
    '<div class="r75-today">'+r75Ring(P.pct, 'clamp(110px, 17vh, 190px)')+'<div><b>'+escapeHtml(fmtDurationLabel(P.done) || '0m')+'</b><span>'+Math.round(P.pct*100)+'% of '+escapeHtml(fmtDurationLabel(P.target))+'</span></div></div>'+
    bar+
    (rh ? '<div class="r75-rh">'+escapeHtml(rh)+'</div>' : '')+
    (nx ? '<div class="r75-next"><span>Up next</span><b>'+escapeHtml(nx.title)+'</b></div>' : '')+
  '</section>';
}
function r75TasksHtml(){
  const T = r75TodayTasks(), n = T.open.length + T.done.length;
  const row = function(t, done){ return '<button class="r75-t'+(done ? ' is-done' : '')+(ui.currentTaskId===t.id ? ' is-cur' : '')+'" data-action="r75Task" data-id="'+t.id+'"><i>'+(done ? '&#10003;' : '')+'</i><span>'+escapeHtml(t.title)+'</span></button>'; };
  const max = 9, rows = T.open.slice(0, max).map(function(t){ return row(t, false); }).concat(T.done.slice(0, Math.max(0, max - T.open.length)).map(function(t){ return row(t, true); }));
  const more = n - rows.length;
  return '<section class="r75-c r75-tasks"><div class="r75-ch"><b>Tasks</b><span>'+T.done.length+' / '+n+' done</span></div>'+
    (n ? '<div class="r75-tl">'+rows.join('')+'</div>'+(more > 0 ? '<div class="r75-more">+'+more+' more</div>' : '') : '<div class="r75-none">Nothing on today.</div>')+'</section>';
}
function r75DueHtml(){
  const D = r71Deadlines(5);
  return '<section class="r75-c r75-due"><div class="r75-ch"><b>What’s due</b></div>'+(D.length ? '<div class="r75-ls">'+D.map(function(d){
    const u = r71Urgency(d.days), when = d.days < 0 ? Math.abs(d.days)+'d late' : d.days===0 ? 'today' : d.days===1 ? 'tomorrow' : 'in '+d.days+'d';
    return '<div class="r75-d'+(u ? ' is-'+u : '')+'"><b>'+escapeHtml(d.title)+'</b><span>'+when+'</span></div>';
  }).join('')+'</div>' : '<div class="r75-none">Nothing with a date on it.</div>')+'</section>';
}
function r75CalHtml(){
  const t = todayStr(), now = nowHM(), evs = arr(state.calendar.events).filter(function(e){ return e.date===t; }).sort(function(a, b){ return (a.time || '').localeCompare(b.time || ''); });
  const up = evs.filter(function(e){ return !e.time || e.time >= now; }), list = (up.length ? up : evs).slice(0, 5);
  return '<section class="r75-c r75-cal"><div class="r75-ch"><b>Today’s calendar</b><span>'+(evs.length ? evs.length+' thing'+(evs.length===1 ? '' : 's') : '')+'</span></div>'+(list.length ? '<div class="r75-ls">'+list.map(function(e){
    return '<div class="r75-e'+(e.time && e.time < now ? ' is-past' : '')+'"><b>'+(e.time ? fmt12Hour(e.time) : 'All day')+'</b><span>'+escapeHtml(e.title)+'</span></div>';
  }).join('')+'</div>' : '<div class="r75-none">Nothing on the calendar.</div>')+'</section>';
}
function r75TimeHtml(){
  let h = ''; try{ h = r72TimeHtml(true); }catch(e){ return ''; }
  h = h.replace(/<div class="r72t-f">[\s\S]*?<\/div>\s*<\/div>$/, '</div>');
  return '<section class="r75-c r75-time"><div class="r75-ch"><b>Your time</b></div>'+h+'</section>';
}
function r75WxLine(){
  if(!r75On('weather')) return '';
  try{ const now = typeof wxNow==='function' ? wxNow() : null; if(now) return ' · '+wxIcon(wxKind(now.code), skyPhase())+' '+now.temp+'&deg;'; }catch(e){}
  return '';
}
function r75BubbleHtml(){
  if(!r75On('bubble')) return '';
  if(!ui.r75Bub) return '<button class="r75-bub" data-action="r75Bub" title="A line for the journal"><i>&#9998;</i></button>';
  return '<div class="r75-bub is-open"><div class="r75-bub-h"><b>Journal</b><button data-action="r75Bub" aria-label="Close">&#10005;</button></div>'+
    '<textarea id="r75BubT" rows="4" placeholder="What’s on your mind…"></textarea>'+
    '<div class="r75-bub-f"><span>&#8984;&#9166; saves</span><button class="r75-btn is-pri" data-action="r75BubSave">Save</button></div></div>';
}
function r75QuoteHtml(){
  if(!r75On('quote')) return '';
  const q = r75QNow();
  return '<footer class="r75-q"><button class="r75-qt" data-action="r75QEdit" data-id="'+(q.key || '')+'" title="Click to edit or remove it">'+
    '<span>&ldquo;'+escapeHtml(q[0])+'&rdquo;</span>'+(q[1] ? '<small>'+escapeHtml(q[1])+'</small>' : '')+'</button>'+
    '<button class="r75-qn" data-action="r75QNext" title="Another one">&#8635;</button></footer>';
}
function r75LockBtn(){
  const as = state.focus.activeSession;
  return as ? '<button class="r75-btn is-out" data-action="r75Lock">&#9632; Lock out</button>' : '<button class="r75-btn is-in" data-action="r75Lock">&#128274; Lock in</button>';
}
function r75CcHtml(ext){
  const live = r75Live(), T = r71Type();
  const stLabel = {locked:'Locked in', break:'On a break', shooting:'Shooting', asleep:'Asleep', mode:'Away', free:'Off the clock'}[live];
  let music = ''; try{ if(r70MusicOn()) music = '<button class="r75-mus" data-action="r75Music" title="Pause the music">&#9835; <span>Pause</span></button>'; }catch(e){}
  const other = !ext && typeof r74OtherDisplays==='function' ? r74OtherDisplays() : [];
  const head = '<header class="r75-h">'+
    '<div class="r75-hl"><span class="r75-st is-'+live+'"><i></i>'+stLabel+'</span><span class="r75-day">'+escapeHtml(T.label)+'</span></div>'+
    '<div class="r75-hc"><b>'+r72Clock()+'</b><span>'+new Date().toLocaleDateString(undefined, {weekday:'long', month:'long', day:'numeric'})+r75WxLine()+'</span></div>'+
    '<div class="r75-hr">'+music+r75LockBtn()+
      (other.length ? '<button class="r75-ic" data-action="r74CvOn" data-id="'+other[0].id+'" title="Send to '+escapeHtml(other[0].label)+'">&#10697;</button>' : '')+
      (ext ? '' : '<button class="r75-ic" data-action="r72CmdEdit" title="Customize">&#9998;</button>')+
      '<button class="r75-ic" data-action="r71Close" title="Close (Esc)">&#10005;</button></div>'+
  '</header>';
  const cols = [];
  cols.push(r75FocusHtml());
  if(r75On('tasks')) cols.push(r75TasksHtml());
  const side = (r75On('due') ? r75DueHtml() : '')+(r75On('cal') ? r75CalHtml() : '');
  if(side) cols.push('<div class="r75-stack">'+side+'</div>');
  return '<div class="r75cc is-'+live+' n'+cols.length+'">'+head+
    '<main class="r75-g">'+cols.join('')+'</main>'+
    (r75On('time') ? r75TimeHtml() : '')+
    r75QuoteHtml()+r75BubbleHtml()+
  '</div>';
}
function r75EditHtml(){
  const sw = function(on, act, id, label, sub){ return '<button class="r75-row" data-action="'+act+'"'+(id ? ' data-id="'+id+'"' : '')+'><span><b>'+label+'</b>'+(sub ? '<small>'+sub+'</small>' : '')+'</span><i class="r74-sw'+(on ? ' is-on' : '')+'"><i></i></i></button>'; };
  return '<div class="r75cc is-edit"><div class="r75-ed"><div class="r75-ed-h"><b>Customize the Command Center</b><button class="r75-btn is-pri" data-action="r72CmdEdit">Done</button></div>'+
    '<div class="r75-ed-g"><div><h4>On the board</h4>'+R75_PANELS.map(function(p){ return sw(r75On(p.id), 'r75Panel', p.id, p.label); }).join('')+'</div>'+
    '<div><h4>When it shows up</h4>'+
      sw(r75AutoOn(), 'r75Auto', '', 'Open it by itself when I lock in', 'It closes again when you lock out')+
      sw(r74CvLockedOn(), 'r74CvLocked', '', 'Big timer while I’m locked in', 'Focus takes the left side while the clock runs')+
      '<h4>Quotes</h4><p class="r75-ed-p">Click any quote (here, on Today, in the morning) to change the words, the name under it, or remove it.</p>'+
      (Object.keys(r75Q().edit).length || Object.keys(r75Q().gone).length ? '<button class="r75-btn" data-action="r75QReset">Bring every quote back</button>' : '')+
    '</div></div></div></div>';
}
// the full board is the Command Center; the panel on Today keeps the old bands, minus what Today already shows
r72CmdHtml = (function(base){
  return function(mode){
    if(mode!=='panel'){ try{ return ui.r72CmdEdit ? r75EditHtml() : r75CcHtml(false); }catch(e){ console.error(e); } }
    if(mode==='panel'){
      const c = r72CmdCfg(), keep = {}, dupes = ['clock', 'numbers', 'bigclock', 'note', 'standard', 'vision', 'time'];
      dupes.forEach(function(k){ keep[k] = c.bands[k]; c.bands[k] = false; });
      try{
        let h = base.apply(this, arguments);
        const q = r71Quote(); if(q && q.key) h = h.replace('<div class="r71-quote">', '<div class="r71-quote" data-action="r75QEdit" data-id="'+q.key+'" title="Click to edit or remove it">');
        return h;
      } finally { dupes.forEach(function(k){ c.bands[k] = keep[k]; }); }
    }
    return base.apply(this, arguments);
  };
})(r72CmdHtml);
// the other screen gets the same board (without Customize), and what you press there is done here
r74CvPayload = (function(base){
  return function(full){
    const p = base.apply(this, arguments);
    try{ const keep = ui.r72CmdEdit; ui.r72CmdEdit = false; p.html = r75CcHtml(true); ui.r72CmdEdit = keep; }catch(e){}
    return p;
  };
})(r74CvPayload);
const R75_REMOTE = {r75Task:1, r75Lock:1, r75QNext:1, r75Bub:1, r75BubSave:1, r75Music:1};
window.r75CvRemote = function(m){
  if(!m || !R75_REMOTE[m.a] || !ACTIONS[m.a]) return;
  if(m.a==='r75BubSave'){ r75JournalAdd(m.v); ui.r75Bub = false; }
  else ACTIONS[m.a](null, null, m.id);
  r74CvPush();
};

// ---- what you can do on it ----
ACTIONS.r75Task = function(el, e, id){
  const t = arr(state.tasks.items).find(function(x){ return x.id===id; }); if(!t) return;
  if(t.status==='done'){ t.status = 'today'; t.completedAt = null; persist('tasks'); playTick(); }
  else { completeTask(id); const v = document.querySelector('#r71Full .r75-t[data-id="'+id+'"]'); if(v) v.classList.add('is-done'); setTimeout(function(){ if(document.getElementById('r71Full')) r71Open(); r74CvPush(); }, 1200); }
  try{ renderView(); }catch(x){} if(document.getElementById('r71Full')) r71Open(); r74CvPush();
};
ACTIONS.r75Lock = function(){
  if(state.focus.activeSession){ try{ r70LockOutNow(); }catch(e){ if(ACTIONS.openStopFocus) ACTIONS.openStopFocus(); } }
  else { try{ opRunTool('lock_in', {}); }catch(e){ try{ startFocus(null); }catch(x){} } }
  try{ renderView(); }catch(e){} if(document.getElementById('r71Full')) r71Open(); r74CvPush();
};
ACTIONS.r75Music = function(){ try{ r70StopMusic(); }catch(e){} if(document.getElementById('r71Full')) r71Open(); r74CvPush(); };
ACTIONS.r75Bub = function(){ ui.r75Bub = !ui.r75Bub; if(document.getElementById('r71Full')) r71Open(); setTimeout(function(){ const t = document.getElementById('r75BubT'); if(t) t.focus(); }, 40); r74CvPush(); };
function r75JournalAdd(text){
  text = String(text || '').trim(); if(!text) return false;
  if(!state.journal) state.journal = {entries:[]}; if(!Array.isArray(state.journal.entries)) state.journal.entries = [];
  const first = text.split('\n')[0];
  state.journal.entries.push({id:uid(), date:todayStr(), timestamp:Date.now(), text:text, title:first.length > 60 ? first.slice(0, 57)+'…' : first, type:'freeform', mood:null, pinned:false, photos:[], from:'bubble'});
  persist('journal'); showToast('In the journal.', {icon:'&#9998;'});
  return true;
}
ACTIONS.r75BubSave = function(){ const t = document.getElementById('r75BubT'); if(t && r75JournalAdd(t.value)){ ui.r75Bub = false; playPositive(); if(document.getElementById('r71Full')) r71Open(); } };
document.addEventListener('keydown', function(e){ if(e.key==='Enter' && (e.metaKey || e.ctrlKey) && document.activeElement && document.activeElement.id==='r75BubT'){ e.preventDefault(); ACTIONS.r75BubSave(); } });
ACTIONS.r75Panel = function(el, e, id){ const c = r75Cfg(); c[id] = !r75On(id); persist('settings'); playTick(); r71Open(); r74CvPush(); };
ACTIONS.r75Auto = function(){ r72Set('cvAuto', !r75AutoOn()); playTick(); if(document.getElementById('r71Full')) r71Open(); try{ renderView(); }catch(e){} };

// ---- the board refreshes without stepping on what you're typing; the clock and quote keep moving ----
r71Open = (function(base){
  return function(){
    const v = document.getElementById('r71Full'), a = document.activeElement;
    if(v && a && v.contains(a) && /TEXTAREA|INPUT/.test(a.tagName)) return;
    if(v && document.getElementById('r75QE')) return;
    const first = !v, r = base.apply(this, arguments);
    if(first){ try{ const A = r75App(); if(A && A.immersive) A.immersive(true); }catch(e){} }
    return r;
  };
})(r71Open);
ACTIONS.r71Close = (function(base){
  return function(){ ui.r75Auto = false; ui.r75Bub = false; r75QClose(); try{ const A = r75App(); if(A && A.immersive) A.immersive(false); }catch(e){} return base.apply(this, arguments); };
})(ACTIONS.r71Close);
setInterval(function(){
  const v = document.getElementById('r71Full'); if(!v) return;
  const c = v.querySelector('.r75-hc b'); if(c){ const t = r72Clock(); if(c.textContent!==t) c.textContent = t; }
  if(r75On('quote') && Date.now() - (ui.r75QAt || 0) > 40000 && !document.getElementById('r75QE')){
    ui.r75QAt = Date.now(); if(ui.r75QAt0){ ui.r75Qi = (ui.r75Qi || 0) + 1; const q = v.querySelector('.r75-q'); if(q){ q.classList.add('is-swap'); setTimeout(function(){ r71Open(); }, 380); } } ui.r75QAt0 = 1;
  }
}, 1000);

// ---- it opens by itself when you lock in, and goes when you lock out (if it came by itself) ----
startFocus = (function(base){
  return function(){
    const r = base.apply(this, arguments);
    try{ if(r75AutoOn() && state.focus.activeSession && !document.getElementById('r71Full') && !(typeof R74CV!=='undefined' && R74CV.ext)){ setTimeout(function(){ if(state.focus.activeSession && !document.getElementById('r71Full')){ ui.r72CmdEdit = false; r71Open(); ui.r75Auto = true; } }, 350); } }catch(e){}
    return r;
  };
})(startFocus);
setInterval(function(){ if(ui.r75Auto && !state.focus.activeSession && document.getElementById('r71Full')){ ACTIONS.r71Close(); } }, 1500);

// ---- Minimal view is gone: M and its old buttons open the Command Center ----
lockedMinimal = function(){ return false; };
focusMinimalOn = function(){ return false; };
// (an empty placeholder: older code strips this corner by matching up to its closing </button>)
lockedViewBtnHtml = function(){ return '<button class="lv-btn" hidden style="display:none" tabindex="-1" aria-hidden="true"></button>'; };
focusMinimalBtnHtml = lockedViewBtnHtml;
ACTIONS.toggleLockedView = ACTIONS.toggleFocusMinimal = function(){ if(document.getElementById('r71Full')) ACTIONS.r71Close(); else r71Open(); };
setTimeout(function(){ try{ let ch = false; if(state.profile.lockedView==='minimal'){ state.profile.lockedView = 'full'; ch = true; } if(state.profile.focusMinimal){ state.profile.focusMinimal = false; ch = true; } if(ch) persist('profile'); }catch(e){} }, 0);
// Settings → Look & Sound: the "Locked in" (Minimal styles) card becomes the Command Center's
soundSettingsHtml = (function(base){
  return function(){
    let h = base.apply(this, arguments);
    const cut = r60Cut(h, '<div class="section r34-set"><div class="section-title">Locked in</div>');
    const card = '<div class="section r75-set"><div class="section-title">Command Center</div><div class="card">'+
      r51Row('Open it full screen by itself when I lock in', r51Sw(r75AutoOn(), 'r75Auto'))+
      r51Row('Big timer while I’m locked in', r51Sw(r74CvLockedOn(), 'r74CvLocked'))+
      '<div class="r75-set-f"><button class="btn btn-sm" data-action="r71Open">Open it</button><button class="btn btn-sm btn-ghost" data-action="r71Settings">Customize</button><span>The screen icon (top right), M, or &#8984;&#8679;C</span></div>'+
    '</div></div>';
    return cut ? h.replace(cut.html, card) : h+card;
  };
})(soundSettingsHtml);
ACTIONS.r71Settings = function(){ ui.r72CmdEdit = true; r71Open(); };

// ---------------- Today: no duplicates, progress up top, Your time wide ----------------
setTimeout(function(){
  try{
    const dp = state.dashboardPanels; if(!dp || dp.r75) return;
    if(!dp.enabled || typeof dp.enabled!=='object') dp.enabled = {};
    dp.enabled.clock = false;      // the big clock face: its own block just for the time
    dp.enabled.journal = false;    // the journal has the bubble and its own tab
    if(!dp.r60Span || typeof dp.r60Span!=='object') dp.r60Span = {};
    dp.r60Span.r72time = 12;
    dp.r75 = true; persist('dashboardPanels');
    try{ if(ui.view==='today') renderView(); }catch(e){}
  }catch(e){}
}, 0);
// the day's progress, by the streak and the tasks
streakWorkHtml = (function(base){
  return function(o){
    const h = base.apply(this, arguments);
    if((o && o.compact) || h.indexOf('is-r38') < 0 || h.indexOf('class="swt"') < 0) return h;
    const P = r75Progress();
    const row = '<button class="swt r75-swd" data-action="r71Open" title="Today’s deep work (opens the Command Center)">'+
      '<span class="swt-k">Today</span><b class="swt-n">'+escapeHtml(fmtDurationLabel(P.done) || '0m')+'<small> / '+escapeHtml(fmtDurationLabel(P.target))+'</small></b>'+
      '<span class="swt-bar r75-swd-b"><i style="width:'+(P.pct*100).toFixed(1)+'%"></i></span>'+
      '<span class="swt-r">'+(P.left ? Math.round(P.pct*100)+'% · '+escapeHtml(fmtDurationLabel(P.left))+' to go' : 'Goal hit &#10003;')+'</span></button>';
    return h.replace('<button class="swt"', row+'<button class="swt"');
  };
})(streakWorkHtml);
// Your time: no "Start shooting" (that's a tag's job now)
r72TimeHtml = (function(base){ return function(){ return base.apply(this, arguments).replace(/<button class="btn btn-sm" data-action="r72Shoot">[\s\S]*?<\/button>/, ''); }; })(r72TimeHtml);
// the panel on Today: no "Command View · Full screen" header (the button's top right)
if(typeof PANEL_RENDERERS!=='undefined') PANEL_RENDERERS.command = function(){ return '<div class="r75-panel">'+r72CmdHtml('panel')+'</div>'; };
// quotes on the Today panel can be edited too
r71Quote = (function(base){ return function(){ const q = base.apply(this, arguments); if(q){ try{ const c = r71Cfg(), kind = c.tone==='action' ? 'action' : c.tone==='both' ? (dayNum() % 2 ? 'action' : 'work') : 'work'; const x = quoteFor(kind); q.key = x.key; }catch(e){} } return q; }; })(r71Quote);

// ---------------- the season: no box at the top, and bunting that hangs right ----------------
renderToday = (function(base){
  return function(){
    let h = base.apply(this, arguments);
    if(typeof holActive==='function' && holActive() && holActive()!=='birthday'){ const cut = r60Cut(h, '<div class="hol-ban'); if(cut) h = cut.rest; }
    return h;
  };
})(renderToday);
holBunting = function(colors, n){
  // one string, two soft swags, and every pennant hangs from the string where it actually is
  const y = function(x){ return 3 + 13*Math.abs(Math.sin(x*Math.PI*2)); };
  let path = '', flags = '';
  for(let i = 0; i <= 60; i++){ const x = i/60; path += (i ? ' L' : 'M')+(x*1000).toFixed(1)+' '+y(x).toFixed(2); }
  for(let i = 0; i < n; i++){ const x = (i + .5)/n; flags += '<i style="left:'+(x*100).toFixed(2)+'%;top:'+y(x).toFixed(1)+'px;--c:'+colors[i % colors.length]+';--r:'+(Math.cos(x*Math.PI*4)*7).toFixed(1)+'deg"></i>'; }
  return '<div class="hx-bunt r75b" aria-hidden="true"><svg viewBox="0 0 1000 30" preserveAspectRatio="none"><path d="'+path+'" fill="none" stroke="rgba(255,236,210,.4)" stroke-width="1.1" vector-effect="non-scaling-stroke"/></svg><div class="hx-bunt-f">'+flags+'</div></div>';
};

// ---------------- debt: credit cards count ----------------
// A card typed in as a negative balance (−2,400) is $2,400 owed, not nothing. And a credit card from the bank that
// shows a balance owed counts too (unless you already track that card as a debt by name).
function r75BankCards(){
  const f = r44F(), names = f.debts.map(function(d){ return String(d.name || '').toLowerCase(); });
  return r44Accounts().filter(function(a){ return a.type==='credit' && Number(a.balance) < 0; }).filter(function(a){
    const n = String(a.name || '').toLowerCase(), o = String(a.org || '').toLowerCase();
    return !names.some(function(d){ return d && (n.indexOf(d) >= 0 || d.indexOf(n) >= 0 || (o && d.indexOf(o) >= 0)); });
  }).map(function(a){ return {name:(a.org ? a.org+' · ' : '')+a.name, owed:Math.abs(Number(a.balance))}; });
}
function r75DebtTotal(){
  const f = r44F();
  const manual = f.debts.reduce(function(s, d){ return s + Math.abs(Number(d.balance || 0)); }, 0);
  return {manual:manual, cards:r75BankCards(), total:manual + r75BankCards().reduce(function(s, c){ return s + c.owed; }, 0)};
}
setTimeout(function(){
  try{ const f = r44F(); let ch = false; f.debts.forEach(function(d){ if(Number(d.balance) < 0){ d.balance = Math.abs(Number(d.balance)); ch = true; } if(Number(d.originalAmount) < 0){ d.originalAmount = Math.abs(Number(d.originalAmount)); ch = true; } }); if(ch) persist('finances'); }catch(e){}
}, 0);
if(ACTIONS.r44DebtSave) ACTIONS.r44DebtSave = (function(base){ return function(){ const el = document.getElementById('r44dBal'); if(el && Number(el.value) < 0) el.value = String(Math.abs(Number(el.value))); return base.apply(this, arguments); }; })(ACTIONS.r44DebtSave);
function r75DebtFix(){ try{ const f = r44F(); let ch = false; f.debts.forEach(function(d){ if(Number(d.balance) < 0){ d.balance = Math.abs(Number(d.balance)); ch = true; } if(Number(d.originalAmount) < 0){ d.originalAmount = Math.abs(Number(d.originalAmount)); ch = true; } }); if(ch) persist('finances'); }catch(e){} }
renderPersonalFinances = (function(base){
  return function(){
    r75DebtFix();
    let h = base.apply(this, arguments);
    const D = r75DebtTotal(), f = r44F(), n = f.debts.filter(function(d){ return Math.abs(Number(d.balance)) > 0; }).length + D.cards.length;
    const mins = f.debts.reduce(function(s, d){ return s + (Math.abs(Number(d.balance)) > 0 ? Number(d.minPayment || 0) : 0); }, 0);
    const inner = '<span class="r44-k">All debt</span><b class="'+(D.total ? 'is-out' : 'is-in')+'">'+(D.total ? r44Money(D.total) : 'None')+'</b><small>'+
      (n ? n+' debt'+(n===1 ? '' : 's')+(D.cards.length ? ' · '+D.cards.length+' from the bank' : '')+(mins ? ' · '+r44Money(mins)+'/mo minimum' : '') : 'Debt-free')+'</small>';
    h = h.replace(/<span class="r44-k">All debt<\/span><b[^>]*>[\s\S]*?<\/small>/, inner);
    return h;
  };
})(renderPersonalFinances);
r44DebtsHtml = (function(base){
  return function(){
    const h = base.apply(this, arguments), C = r75BankCards();
    if(!C.length) return h;
    return h+'<div class="r75-cards"><div class="r75-cards-h"><b>Credit cards from your bank</b><span>Counted in All debt. Add one as a debt to track its rate and payments.</span></div>'+
      C.map(function(c){ return '<div class="r75-card"><span>&#128179; '+escapeHtml(c.name)+'</span><b>'+r44Money(c.owed)+'</b></div>'; }).join('')+'</div>';
  };
})(r44DebtsHtml);

// ---------------- tags: one list, one way in ----------------
// "+ Add a tag" opens one picker: the ready ones and "something else", all made the same way. Every tag is set up
// the way you actually use them: a Shortcuts automation with the link. Where it lives is a line on its card.
r72HandsHtml = function(){ return ''; };
r70TListHtml = function(){
  const L = r70TagList();
  const head = '<div class="section-title">&#128225; Your tags<button class="btn btn-sm btn-primary r70t-add" data-action="r70TWizOpen">+ Add a tag</button></div>';
  return '<div class="card section op-settings">'+head+
    (L.length ? '<div class="r70t-list">'+L.map(r70TCardHtml).join('')+'</div>' : '<p class="r70t-p">A tag is a sticker. Your phone reads it, a Shortcuts automation opens its link, and this Mac does the rest. Press <b>+ Add a tag</b>.</p>')+
  '</div>';
};
r70TWizHtml = (function(base){
  return function(){
    const W = r70TWiz();
    W.how = 'hands';
    if(W.step===1 && !W.custom){
      const have = {}; r70TagList().forEach(function(g){ if(g.starter) have[g.starter] = 1; });
      const left = R70T_STARTERS.filter(function(s){ return !have[s.id]; });
      return '<div class="card section op-settings r70t-wiz"><div class="section-title">&#10133; Add a tag<button class="r70t-wx" data-action="r70TWizClose" aria-label="Close">&#10005;</button></div>'+
        '<p class="r70t-p">Pick what it does. You can change any of it after.</p>'+
        '<div class="r70t-starters r75-pick">'+left.map(function(s){ return '<button class="r70t-st" data-action="r75TagPick" data-id="'+s.id+'"><i>'+s.icon+'</i><b>'+escapeHtml(s.name)+'</b><span>'+escapeHtml(s.about)+'</span></button>'; }).join('')+
          '<button class="r70t-st r75-own" data-action="r75TagOwn"><i>&#10133;</i><b>Something else</b><span>Pick the steps yourself.</span></button></div>'+
      '</div>';
    }
    let h = base.apply(this, arguments);
    // no "tap and open vs hands-free" choice: it's Shortcuts
    h = h.replace(/<div class="field"><label>How do you want to tap it\?<\/label>[\s\S]*?<\/div><\/div>/, '');
    h = h.replace(/<label>Where will it live\?<\/label>/, '<label>Where it lives (optional)</label>');
    return h;
  };
})(r70TWizHtml);
ACTIONS.r75TagPick = function(el, e, id){ const g = r70TStarterMake(id); ui.r70TWiz = null; if(g){ ui.r70TOpen = g.id; playPositive(); } renderView(); setTimeout(function(){ const c = document.getElementById('r70t-'+(g && g.id)); if(c) c.scrollIntoView({block:'center', behavior:'smooth'}); }, 80); };
ACTIONS.r75TagOwn = function(){ const W = r70TWiz(); W.custom = true; W.step = 1; playTick(); renderView(); };
r70TCardHtml = (function(base){
  return function(g){
    let h = base.apply(this, arguments);
    if(ui.r70TOpen!==g.id) return h;
    const link = r70TLink(g);
    // set up the way you use them: Shortcuts
    h = h.replace(/<div class="r70t-qrow">[\s\S]*?<\/ol><\/div>/, '<div class="r75-sc"><b>Set it up in Shortcuts (once)</b><ol class="r69-steps">'+
      '<li>iPhone: <b>Shortcuts → Automation → + → NFC → Scan</b>, and hold the sticker to the phone.</li>'+
      '<li>Pick <b>Run Immediately</b> and turn <b>Notify When Run</b> off.</li>'+
      '<li>Add <b>Get Contents of URL</b> and paste the link above. Done.</li></ol></div>');
    h = h.replace('<div class="r70t-link">', '<div class="r75-place"><label>Where it lives (optional)</label><input class="input input-sm r75-tplace" data-id="'+g.id+'" value="'+escapeHtml(g.place || '')+'" placeholder="Desk, nightstand, door…"></div><div class="r70t-link">');
    void link;
    return h;
  };
})(r70TCardHtml);
document.addEventListener('change', function(e){
  const t = e.target; if(!t || !t.classList || !t.classList.contains('r75-tplace')) return;
  const g = r70TagById(t.dataset.id); if(!g) return; g.place = String(t.value || '').trim().slice(0, 40); persist('tags'); playTick();
});
// the rest of the tag settings fold away under one line
r70TSettingsHtml = (function(base){
  return function(){
    const h = base.apply(this, arguments);
    let more = '';
    let rest = h;
    ['<div class="card section op-settings"><div class="section-title">&#127758; Away from home</div>', '<div class="card section op-settings"><div class="section-title">&#128483;&#65039; When a tag makes Op talk</div>'].forEach(function(m){
      const c = r60Cut(rest, m); if(c){ more += c.html; rest = c.rest; }
    });
    return more ? rest+'<details class="r75-more card section"><summary>Tag settings: away from home, Op’s voice, staying awake</summary>'+more+'</details>' : h;
  };
})(r70TSettingsHtml);
