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
