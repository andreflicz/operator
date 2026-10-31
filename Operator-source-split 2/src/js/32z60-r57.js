// ============ ROUND 57 ============
// (playbooks are in 32z61-r57pb.js; Op in 32z62-r57op.js; the page revamps in 32z63-r57ui.js)

// ---- 1. One name for every task ----
// What went wrong: round 40 rewrote deliverable task names after every redraw by searching the page's text for a
// task's stored name ("8 reel") and swapping in "JJS Construction: 1 8 reel, week 0". Two tasks with the same stored
// name were each swapped into text the other had already changed, so it stacked up ("JJS Construction: 2 JJS
// Construction: 1 8 reel, week 0, week 2"), and the posting-week tasks have no week number (0). That sweep is gone.
// taskName(t) is the one place a task's name is made: on the task list (where the client chip sits next to it) it's
// the task's own name; on the pages with no client chip (Plan of Attack, Wind down, the lock-in pages, Op) it has
// the client in front. A deliverable task is the week's task ("Reels · this week"), never each single reel.
function taskName(t, opts){
  if(!t) return '';
  const m = t.master, short = !!(opts && opts.short);
  if(!m) return t.title || '';
  if(m.kind==='dvw' && typeof dvwFind==='function'){
    const x = dvwFind(t); if(!x) return t.title || '';
    const what = String(x.d.title || t.title || 'Deliverable').trim();
    const when = x.oneOff ? '' : x.post ? (x.post===thisWeekKey() ? 'this week' : x.post < thisWeekKey() ? 'week of '+fmtDateShort(x.post) : 'next week') : x.k ? 'week '+x.k : '';
    const name = what+(when ? ' · '+when : '');
    return short ? name : (x.c.business || x.c.name || 'Client')+' · '+name;
  }
  if(m.kind==='pb'){
    const x = typeof crmFind==='function' ? crmFind(m.who, m.id) : null;
    return short || !x ? t.title : pbName(m.who, x)+' · '+t.title;
  }
  return t.title || '';
}
// (the old sweep does nothing now)
niceTitlesHtml = function(h){ return h; };
niceTitlesIn = function(){};
niceTitlesSweep = function(){};
// pages without a client chip get the full name while they draw (and only then: nothing is saved with it)
let r57Naming = 0, r57Held = [];
persist = (function(base){ return function(key){ if(r57Naming && key==='tasks'){ if(r57Held.indexOf(key) < 0) r57Held.push(key); return; } return base.apply(this, arguments); }; })(persist);
function r57WithNames(fn){
  return function(){
    if(r57Naming) return fn.apply(this, arguments);
    const swap = [];
    try{ state.tasks.items.forEach(function(t){ if(t.master && (t.master.kind==='dvw' || t.master.kind==='pb') && t.status!=='done'){ const n = taskName(t); if(n && n!==t.title){ swap.push([t, t.title, n]); t.title = n; } } }); }catch(e){}
    r57Naming++;
    try{ return fn.apply(this, arguments); }
    finally {
      r57Naming--;
      // (anything that renamed one while it drew keeps its own change; the rest get their names back)
      swap.forEach(function(s){ if(s[0].title===s[2]) s[0].title = s[1]; });
      const held = r57Held; r57Held = []; held.forEach(function(k){ persist(k); });
    }
  };
}
['windHtml', 'renderPlanReveal', 'lockSeqHtml', 'renderRecap', 'renderStopFocusModal', 'renderTimesUpModal', 'renderLockedMinimal', 'renderFocusMinimal', 'renderWeekendOffView', 'aiContext'].forEach(function(k){
  try{
    if(k==='windHtml') windHtml = r57WithNames(windHtml);
    else if(k==='renderPlanReveal') renderPlanReveal = r57WithNames(renderPlanReveal);
    else if(k==='lockSeqHtml' && typeof lockSeqHtml==='function') lockSeqHtml = r57WithNames(lockSeqHtml);
    else if(k==='renderRecap') renderRecap = r57WithNames(renderRecap);
    else if(k==='renderStopFocusModal') renderStopFocusModal = r57WithNames(renderStopFocusModal);
    else if(k==='renderTimesUpModal') renderTimesUpModal = r57WithNames(renderTimesUpModal);
    else if(k==='renderLockedMinimal') renderLockedMinimal = r57WithNames(renderLockedMinimal);
    else if(k==='renderFocusMinimal') renderFocusMinimal = r57WithNames(renderFocusMinimal);
    else if(k==='renderWeekendOffView') renderWeekendOffView = r57WithNames(renderWeekendOffView);
    else if(k==='aiContext') aiContext = r57WithNames(aiContext);
  }catch(e){}
});
// (names already garbled by the old sweep get their real name back once, from the plan)
setTimeout(function(){
  try{
    let ch = false;
    state.tasks.items.forEach(function(t){
      const m = t.master; if(!m || m.kind!=='dvw') return;
      if(!/: \d+ .*, week \d|, week \d+, week \d+/.test(t.title || '')) return;
      const hit = typeof delivFind==='function' ? delivFind(m.clientId, m.delivId) : null; if(!hit) return;
      t.title = String(hit.d.title || 'Deliverable').trim(); ch = true;
    });
    if(ch) persist('tasks');
  }catch(e){}
}, 0);

// ---- 2. Reach out to leads: N is the people on it, and once you reach out they're off it ----
// The count and the names come from one list, one entry per lead (a lead in the app twice under the same id is
// split into two leads once, so neither hides the other). Someone you reached out to today is off it entirely,
// whatever their playbook said; a touch ticks off every step that was due on their playbook, not just today's.
setTimeout(function(){
  try{
    const seen = {}; let ch = false;
    arr(state.business.pipeline).forEach(function(l){ if(!l || !l.id) return; if(seen[l.id]){ l.id = uid(); ch = true; } seen[l.id] = 1; });
    if(ch){ persist('business'); try{ masterTasksSync(); }catch(e){} }
  }catch(e){}
}, 0);
function r57TouchedToday(l){ return crmLastTouch('lead', l)===todayStr(); }
r56LeadPbDue = (function(base){ return function(){ return base.apply(this, arguments).filter(function(r){ return !r57TouchedToday(r.x); }); }; })(r56LeadPbDue);
r53LeadsDue = function(){
  const seen = {}, out = [];
  r54LeadRows().forEach(function(r){ if(r.due && !seen[r.l.id] && !r57TouchedToday(r.l)){ seen[r.l.id] = 1; out.push({x:r.l, n:r.n}); } });
  r56LeadPbDue().forEach(function(r){ if(!seen[r.x.id]){ seen[r.x.id] = 1; out.push({x:r.x, n:r.n}); } });
  return out.sort(function(a, b){ return b.n - a.n; });
};
logTouch = (function(base){
  return function(kind, id){
    const r = base.apply(this, arguments);
    try{
      if(kind==='lead'){
        const l = crmFind('lead', id), s = l && l.pb && l.pb.id ? pbState('lead', l) : null;
        if(s){ let n = 0; s.open.forEach(function(o){ if(o.date <= todayStr() && !l.pb.done[o.key]){ l.pb.done[o.key] = todayStr(); n++; } }); if(n) persist('business'); }
        masterTasksSync();
      }
    }catch(e){}
    return r;
  };
})(logTouch);
// the card names exactly the people it counts
taskCard = (function(base){
  return function(t){
    let h = base.apply(this, arguments);
    if(!t || !t.master || t.master.kind!=='reachLeads' || t.status==='done') return h;
    const due = r53LeadsDue(), names = due.map(function(d){ return crmName('lead', d.x); });
    h = h.replace(/(<div class="task-card-title">)[\s\S]*?(<\/div>)/, function(m0, a, b){ return a+escapeHtml('Reach out to leads ('+due.length+')')+b; });
    h = h.replace(/<span class="mt-reach-k">[\s\S]*?<\/span>/, function(){ return '<span class="mt-reach-k">'+escapeHtml(names.slice(0, 3).join(', ')+(names.length > 3 ? ' +'+(names.length - 3) : ''))+'</span>'; });
    return h;
  };
})(taskCard);
// the Log center's Leads: no "Logged today ✓" mark; someone you reached out to just shows when they're next due
r54LeadsHtml = (function(base){
  return function(){
    return base.apply(this, arguments).replace(/data-key="lcl-([^"]+)"([\s\S]*?)<span class="lc-due crm-due ([^"]*)">Logged today &#10003;<\/span>/g, function(m0, id, mid){
      const l = crmFind('lead', id), n = l ? crmOverdueDays('lead', l) : null;
      return 'data-key="lcl-'+id+'"'+mid+'<span class="lc-due crm-due '+overdueLevel(n)+'">'+(l ? dueLabel(n, 'lead', l) : '')+'</span>';
    });
  };
})(r54LeadsHtml);

// ---- 3. Journal: any entry can come back, and become a thread ----
// Bring it back… (an entry's ⋯ menu, or when it comes back): a week, a month, three months, a year, a day you pick,
// or some day you won't know. "Keep bringing it back" makes it repeat. When it's back it pops up: you read it,
// add to it underneath (a thread), and say when it comes back next. Time capsules come back the same way.
const R57_BACK = [['week', 'A week'], ['month', 'A month'], ['3m', '3 months'], ['year', 'A year'], ['random', 'Surprise me'], ['date', 'Pick a day']];
function r57BackNext(b, from){
  from = from || todayStr(); if(!b) return null;
  if(b.mode==='date') return b.date && b.date > from ? b.date : null;
  if(b.mode==='week') return addDays(from, 7);
  if(b.mode==='month') return pbMonths(from, 1);
  if(b.mode==='3m') return pbMonths(from, 3);
  if(b.mode==='year') return pbMonths(from, 12);
  if(b.mode==='random') return addDays(from, 21 + Math.floor(Math.random()*300));
  return null;
}
function r57BackLabel(b){
  if(!b || !b.next) return '';
  if(b.mode==='random') return 'Back some day'+(b.repeat ? ', again and again' : '');
  return 'Back '+fmtDateShort(b.next)+(b.repeat && b.mode!=='date' ? ' · every '+({week:'week', month:'month', '3m':'3 months', year:'year'})[b.mode] : '');
}
function r57Entry(id){ return state.journal.entries.find(function(x){ return x.id===id; }) || null; }
function r57Due(){ const t = todayStr(); return state.journal.entries.filter(function(e){ return e.back && e.back.next && e.back.next <= t && e.back.shownOn!==t; }).sort(function(a, b){ return a.back.next.localeCompare(b.back.next); })[0] || null; }
function r57ThreadHtml(){
  const e = r57Entry(ui.r57Thread); if(!e) return '';
  const D = ui.r57ThreadDraft || (ui.r57ThreadDraft = {mode:e.back && e.back.mode || null, date:e.back && e.back.date || '', repeat:!!(e.back && e.back.repeat)});
  const back = ui.r57ThreadDue ? 'It’s back. From '+fmtDateShort(e.date) : 'From '+fmtDateShort(e.date);
  const mood = e.mood ? moodById(e.mood) : null;
  return asHead('&#10227;', escapeHtml(e.title || (mood ? mood.label : 'An entry')), back)+
    '<div class="r57-th">'+
      '<blockquote class="r57-th-q">'+escapeHtml(e.text || '')+'</blockquote>'+
      arr(e.thread).map(function(t){ return '<div class="r57-th-i"><small>'+fmtDateShort(t.date)+'</small><p>'+escapeHtml(t.text)+'</p></div>'; }).join('')+
      '<textarea class="input r57-th-in" id="r57ThreadText" rows="3" placeholder="Add to it"></textarea>'+
    '</div>'+
    '<div class="r57-bk"><div class="r57-bk-h">Bring it back</div>'+
      '<div class="r57-bk-o">'+[['', 'Not again']].concat(R57_BACK).map(function(o){ const on = (D.mode || '')===o[0]; return '<button class="'+(on ? 'is-on' : '')+'" data-action="r57BackPick" data-id="'+o[0]+'">'+o[1]+'</button>'; }).join('')+'</div>'+
      (D.mode==='date' ? '<input class="input r57-bk-d" type="date" id="r57BackDate" min="'+addDays(todayStr(), 1)+'" value="'+escapeHtml(D.date || '')+'">' : '')+
      (D.mode && D.mode!=='date' ? '<div class="r51-row r57-bk-r"><span class="r51-rl">Keep bringing it back</span><span class="r51-rc">'+r51Sw(D.repeat, 'r57BackRepeat')+'</span></div>' : '')+
    '</div>'+
    '<div class="as-f"><button class="btn btn-primary hs-go" data-action="r57ThreadSave">Save</button></div>';
}
function r57ThreadOpen(id, due){ ui.r57Thread = id; ui.r57ThreadDue = !!due; ui.r57ThreadDraft = null; addSheetOpen('r57ThreadSheet', r57ThreadHtml, due ? null : 'r57ThreadText'); const t = document.getElementById('r57ThreadText'); if(t) t.value = ''; }
ACTIONS.r57BackPick = function(el, e, v){ const D = ui.r57ThreadDraft || {}; D.mode = v || null; if(v==='random' && D.repeat==null) D.repeat = false; playTick(); addSheetRefresh('r57ThreadSheet'); };
ACTIONS.r57BackRepeat = function(){ const D = ui.r57ThreadDraft || {}; D.repeat = !D.repeat; playTick(); addSheetRefresh('r57ThreadSheet'); };
document.addEventListener('change', function(e){ if(e.target && e.target.id==='r57BackDate'){ (ui.r57ThreadDraft || {}).date = e.target.value; } });
ACTIONS.r57ThreadSave = function(){
  const e = r57Entry(ui.r57Thread); if(!e) return;
  const D = ui.r57ThreadDraft || {}, ta = document.getElementById('r57ThreadText'), txt = ta ? ta.value.trim() : '';
  if(txt){ e.thread = arr(e.thread).concat([{id:uid(), date:todayStr(), at:Date.now(), text:txt.slice(0, 6000)}]); }
  if(!D.mode) delete e.back;
  else {
    const b = {mode:D.mode, date:D.mode==='date' ? (document.getElementById('r57BackDate') || {}).value || D.date || '' : '', repeat:D.mode!=='date' && !!D.repeat};
    b.next = r57BackNext(b, todayStr());
    if(b.next) e.back = b; else delete e.back;
  }
  if(e.back && ui.r57ThreadDue) e.back.shownOn = todayStr();
  persist('journal'); addSheetClose('r57ThreadSheet'); ui.r57Thread = null; playPositive(); renderView();
  if(txt || e.back) showToast(e.back ? escapeHtml(r57BackLabel(e.back))+'.' : 'Added to it.', {icon:'&#10227;', duration:2400});
};
// it's back: it pops up (not mid-lock-in, not over another window, not at night)
function r57SurfaceTick(){
  if(!state || !state.journal || state.focus.activeSession || document.querySelector('.overlay:not(.hidden)') || (typeof r57NightQuiet==='function' && r57NightQuiet())) return;
  const e = r57Due(); if(!e) return;
  e.back.shownOn = todayStr();
  // (it came back: if it doesn't repeat, it's done coming back unless you set it again)
  if(e.back.repeat) e.back.next = r57BackNext(e.back, todayStr()) || e.back.next; else e.back.next = null;
  persist('journal');
  ui.r57ThreadDraft = {mode:e.back.repeat ? e.back.mode : null, date:'', repeat:!!e.back.repeat};
  ui.r57Thread = e.id; ui.r57ThreadDue = true;
  addSheetOpen('r57ThreadSheet', r57ThreadHtml, null);
  try{ if(typeof tone==='function') tone([523, 659, 784], 0.2, 0.08); }catch(err){}
}
setInterval(function(){ try{ r57SurfaceTick(); }catch(e){} }, 60000);
setTimeout(function(){ try{ r57SurfaceTick(); }catch(e){} }, 6000);
// a time capsule that opens comes back the same way
openCapsule = (function(base){
  return function(c){
    const was = state.journal.entries.length, r = base.apply(this, arguments);
    const e = state.journal.entries.length > was ? state.journal.entries[state.journal.entries.length - 1] : null;
    if(e && e.capsuleFrom){ e.back = {mode:null, next:todayStr(), repeat:false}; persist('journal'); }
    return r;
  };
})(openCapsule);
// the entry, in the journal: its thread under it, and when it's back
journalEntryRow = (function(base){
  return function(e){
    const h = base.apply(this, arguments), th = arr(e.thread);
    if(!th.length && !(e.back && e.back.next)) return h;
    const add = '<div class="r57-jt">'+th.map(function(t){ return '<div class="r57-jt-i"><small>'+fmtDateShort(t.date)+'</small><span>'+escapeHtml(t.text)+'</span></div>'; }).join('')+
      (e.back && e.back.next ? '<button class="r57-jt-b" data-action="r57ThreadOpenBtn" data-id="'+e.id+'">&#10227; '+escapeHtml(r57BackLabel(e.back))+'</button>' : '')+'</div>';
    return h.replace(/<\/div>$/, function(){ return add+'</div>'; });
  };
})(journalEntryRow);
ACTIONS.r57ThreadOpenBtn = function(el, e, id){ r57ThreadOpen(id, false); };
journalMenuHtml = (function(base){ return function(e){ return base.apply(this, arguments).replace('<div class="ctx-sep"></div>', ci('jBack', '&#10227; Bring it back…', {a:e.id})+'<div class="ctx-sep"></div>'); }; })(journalMenuHtml);
// (the menu's actions are set up later in the build: wrap them once they are)
setTimeout(function(){ ACTIONS.ctx = (function(base){ return function(el){ if(el && el.dataset && el.dataset.op==='jBack'){ try{ ctxClose(); }catch(e){} r57ThreadOpen(el.dataset.a, false); return; } return base.apply(this, arguments); }; })(ACTIONS.ctx); }, 0);

// ---- 4. The video idea forms start empty every time ----
// What went wrong: the pop-ups redraw keeping whatever is typed in their boxes (so nothing you type is lost mid-edit),
// which also kept the last idea's title, type and notes when you opened it again. Now each one starts clean when it
// opens (and after a save), and editing one idea after another never shows the other one's words.
function r57Clear(ids){ ids.forEach(function(id){ const el = document.getElementById(id); if(el) el.value = ''; }); }
openAddVideoIdeaModal = (function(base){ return function(){ const c = document.getElementById('videoIdeaContent'); if(c) c.innerHTML = ''; const r = base.apply(this, arguments); r57Clear(['newVideoIdeaTitle', 'newVideoIdeaNotes', 'newVideoIdeaType']); return r; }; })(openAddVideoIdeaModal);
openContentSheet = (function(base){ return function(){ ui.csType = null; const c = document.getElementById('contentSheetContent'); if(c) c.innerHTML = ''; const r = base.apply(this, arguments); r57Clear(['csTitle', 'csNotes']); return r; }; })(openContentSheet);
addVideoIdea = (function(base){ return function(){ const r = base.apply(this, arguments); r57Clear(['newVideoIdeaTitle', 'newVideoIdeaNotes', 'newVideoIdeaType']); return r; }; })(addVideoIdea);
ACTIONS.csSave = (function(base){ return function(){ const r = base.apply(this, arguments); ui.csType = null; r57Clear(['csTitle', 'csNotes']); return r; }; })(ACTIONS.csSave);
openVideoIdeaEditModal = (function(base){ return function(){ const c = document.getElementById('videoIdeaEditContent'); if(c) c.innerHTML = ''; return base.apply(this, arguments); }; })(openVideoIdeaEditModal);
openTaskEditModal = (function(base){ return function(id){ const c = document.getElementById('taskEditContent'); if(c && ui.editingTaskId!==id) c.innerHTML = ''; return base.apply(this, arguments); }; })(openTaskEditModal);
