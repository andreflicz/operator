// ============ ROUND 38b: master tasks that track the work ============
// • Deliverable tasks: each month's deliverable split into the client's cycle weeks 1 to 4, named after
//   the deliverable, kept in their own Client backlog. You finish them one piece at a time; they read and
//   write the client's deliverable count, so the card, pace, health and stats all move with them.
// • Reach out to clients: one task, only there while someone's due a touch. It's tagged with exactly
//   those clients and its priority follows their health and how long it's been.
// • Log center: a Clients sub-tab with every client and just what needs logging (touches), most urgent
//   first, with one-tap logging.
// • Today's date gets a little calendar tile.

// ---- the deliverable tasks: each month's deliverable, split into the cycle's four weeks ----
// Brothers Mechanical gets 16 reels a month → four tasks called "Reels", tagged with the client and
// Week 1 to 4 of their cycle (the cycle starts on their billing day), each due at the end of its week.
// They sit in the Client backlog, not the regular one. Each done logs one reel: the cycle's reels fill
// Week 1 first, then Week 2, and so on, and a week's task finishes when its share is in. Same count as
// the client card, so health and stats move with it.
function dvwCycle(c, date){
  const bd = Math.max(1, Math.min(28, Number(c.billingDay) || 1));
  const d = new Date((date || todayStr())+'T12:00:00');
  let y = d.getFullYear(), m = d.getMonth();
  if(d.getDate() < bd){ m--; if(m < 0){ m = 11; y--; } }
  return {start:todayStr(new Date(y, m, bd)), end:addDays(todayStr(new Date(y, m + 1, bd)), -1)};
}
function dvwWeeks(cy){ return [0, 1, 2, 3].map(function(k){ return {k:k + 1, start:addDays(cy.start, 7*k), end:k < 3 ? addDays(cy.start, 7*k + 6) : cy.end}; }); }
function dvwNeeds(d){ const n = monthlyTargetFor(d), b = Math.floor(n/4), r = n % 4; return [0, 1, 2, 3].map(function(k){ return b + (k < r ? 1 : 0); }); }
function dvwCycleCount(d, cy){ return arr(d.completedDates).filter(function(x){ return x >= cy.start && x <= cy.end; }).length; }
function dvwAlloc(d, cy){ let left = dvwCycleCount(d, cy); return dvwNeeds(d).map(function(n){ const v = Math.min(n, left); left -= v; return v; }); }
function dvwFind(t){
  const m = t && t.master; if(!m || m.kind!=='dvw') return null;
  const hit = delivFind(m.clientId, m.delivId); if(!hit) return null;
  const cy = {start:m.cycle, end:m.cycleEnd};
  return {c:hit.c, d:hit.d, cy:cy, k:m.wk, need:dvwNeeds(hit.d)[m.wk - 1], done:dvwAlloc(hit.d, cy)[m.wk - 1], total:monthlyTargetFor(hit.d), count:dvwCycleCount(hit.d, cy)};
}
function dvwIsNow(t){ const m = t.master, today = todayStr(); return m && m.start <= today && today <= (t.deadline || m.cycleEnd); }
function reachNeeds(){
  return mtActiveClients().map(function(c){
    const n = crmOverdueDays('client', c), hs = clientHealthStatus(c);
    return {c:c, n:n, red:hs.level==='red', score:(n==null ? -99 : n) + (hs.level==='red' ? 3 : hs.level==='yellow' ? 1 : 0)};
  }).filter(function(x){ return x.n!=null && x.n >= 0; }).sort(function(a, b){ return b.score - a.score; });
}
function reachPriority(list){
  if(list.some(function(x){ return x.red && x.n >= 3; }) || list.some(function(x){ return x.n >= 7; })) return 'high';
  if(list.some(function(x){ return x.n >= 1 || x.red; })) return 'med';
  return 'low';
}
let mt38Busy = false;
function masterTasksSync(){
  if(mt38Busy || !state || !state.tasks || !state.business) return; mt38Busy = true;
  try{
    const wk = thisWeekKey(), made = mtStore(), today = todayStr(), cs = mtActiveClients();
    let changed = false;
    // the older kinds (a weekly check-in batch, a deliverables task per client, one per week) make way
    state.tasks.items = state.tasks.items.filter(function(t){
      const old = t.master && (t.master.kind==='care' || t.master.kind==='deliv' || t.master.kind==='dv') && t.status!=='done';
      if(old) changed = true; return !old;
    });
    // this cycle's four weeks, per client, per recurring deliverable
    const live = {};
    cs.forEach(function(c){
      const cy = dvwCycle(c), weeks = dvwWeeks(cy);
      arr(c.deliverables).forEach(function(d){
        if(!d.recurring) return;
        const needs = dvwNeeds(d);
        weeks.forEach(function(w){
          if(!needs[w.k - 1]) return;
          live[c.id+':'+d.id+':'+cy.start+':'+w.k] = 1;
          const key = cy.start+':dvw:'+c.id+':'+d.id+':'+w.k;
          if(made[key]) return;
          made[key] = 1; changed = true;
          state.tasks.items.push({id:uid(), title:String(d.title || 'Deliverable').trim(), client:c.id, clients:[c.id], priority:'med', deadline:w.end, notes:'', status:'backlog', createdAt:today, completedAt:null,
            master:{kind:'dvw', cycle:cy.start, cycleEnd:cy.end, wk:w.k, start:w.start, clientId:c.id, delivId:d.id}});
        });
      });
    });
    state.tasks.items = state.tasks.items.filter(function(t){
      const m = t.master;
      // a client, a deliverable or a week that's gone takes its open task with it
      const gone = m && m.kind==='dvw' && t.status!=='done' && m.cycleEnd >= today && !live[m.clientId+':'+m.delivId+':'+m.cycle+':'+m.wk];
      if(gone) changed = true; return !gone;
    });
    state.tasks.items.forEach(function(t){
      const m = t.master; if(!m || m.kind!=='dvw') return;
      if(m.cycleEnd < today){
        // a cycle that's over: what never got there is history
        if(t.status!=='done' && !m.retired){ m.retired = true; t.status = 'done'; t.completedAt = m.cycleEnd; t.missed = true; changed = true; }
        return;
      }
      const x = dvwFind(t); if(!x) return;
      const title = String(x.d.title || 'Deliverable').trim(); if(t.title!==title){ t.title = title; changed = true; }
      if(t.status!=='done' && x.done >= x.need){ m.prev = t.status; t.status = 'done'; t.completedAt = today; changed = true; }
      else if(t.status==='done' && x.done < x.need){ t.status = m.prev && m.prev!=='done' ? m.prev : 'backlog'; t.completedAt = null; changed = true; }
    });
    // reach out to clients: one task, there only while someone's due
    const need = reachNeeds();
    let rt = state.tasks.items.find(function(t){ return t.master && t.master.kind==='reach' && t.status!=='done'; });
    if(need.length){
      if(!rt){ rt = {id:uid(), title:'', client:'personal', clients:[], priority:'med', deadline:null, notes:'', status:'today', createdAt:today, completedAt:null, master:{kind:'reach', week:wk}}; state.tasks.items.push(rt); changed = true; }
      const ids = need.map(function(x){ return x.c.id; }), title = 'Reach out to clients ('+need.length+')', pr = reachPriority(need);
      if(JSON.stringify(rt.clients)!==JSON.stringify(ids)){ rt.clients = ids; rt.client = ids[0]; changed = true; }
      if(rt.title!==title){ rt.title = title; changed = true; }
      if(rt.priority!==pr){ rt.priority = pr; changed = true; }
      if(rt.master.week!==wk){ rt.master.week = wk; changed = true; }
    } else if(rt){ rt.status = 'done'; rt.completedAt = today; changed = true; }
    Object.keys(made).forEach(function(k){ if(k.slice(0, 10) < addDays(wk, -70)) delete made[k]; });
    if(changed){ persist('tasks'); persist('focus'); setTimeout(function(){ try{ renderView(); }catch(e){} }, 0); }
  }finally{ mt38Busy = false; }
}
// hitting done on a deliverable task logs one; the week's task finishes when its share is in
function dvwLogLine(x){ return (x.c.business || x.c.name)+' · '+x.d.title+' '+x.count+'/'+x.total+' this cycle'; }
completeTask = (function(base){
  return function(id){
    const t = state.tasks.items.find(function(x){ return x.id===id; });
    if(t && t.master && t.master.kind==='dvw'){
      const x = dvwFind(t); if(!x) return;
      if(x.count >= x.total){ showToast('All '+x.total+' '+x.d.title.toLowerCase()+' for '+(x.c.business || x.c.name)+' are in for this cycle.', {icon:'&#10003;'}); return; }
      const before = dvwAlloc(x.d, x.cy);
      delivLogOne({c:x.c, d:x.d}, todayStr());
      const after = dvwAlloc(x.d, x.cy), wkGot = after.findIndex(function(v, i){ return v!==before[i]; }) + 1;
      const y = dvwFind(t);
      if(y.done >= y.need && t.status!=='done'){ t.master.prev = t.status; t.status = 'done'; t.completedAt = todayStr(); playTaskComplete(); } else playTick();
      persist('business'); persist('tasks'); renderView();
      const wkNeed = dvwNeeds(x.d)[wkGot - 1];
      showToast(delivOne(x.d)+' logged: Week '+wkGot+' '+after[wkGot - 1]+'/'+wkNeed+(wkGot!==x.k ? ' (Week '+wkGot+' fills first)' : '')+' · '+dvwLogLine(y)+'.', {icon:'&#128230;', actionLabel:'Undo', actionAction:'mtDvUndo', actionId:t.id, duration:4500});
      return;
    }
    if(t && t.master && t.master.kind==='reach' && t.status!=='done'){
      // finishing it yourself: a touch for each client it's tagged with
      const left = reachNeeds();
      left.forEach(function(x){ const c = crmFind('client', x.c.id); if(!c) return; if(!Array.isArray(c.touches)) c.touches = []; c.touches.push(todayStr()); if(!Array.isArray(c.touchpoints)) c.touchpoints = []; c.touchpoints.push({id:uid(), type:c.lastTouchType || 'text', date:todayStr(), note:'Reached out', ts:Date.now()}); });
      if(left.length){ persist('business'); setTimeout(function(){ showToast('Reached out to '+left.map(function(x){ return x.c.business || x.c.name; }).join(', ')+': a touch logged for each.', {icon:'&#128075;'}); }, 750); }
    }
    return base.apply(this, arguments);
  };
})(completeTask);
// take one back: the cycle's latest one comes off (weeks empty from the last one back)
ACTIONS.mtDvUndo = function(el, e, id){
  const t = state.tasks.items.find(function(x){ return x.id===id; }), x = dvwFind(t); if(!x) return;
  const l = arr(x.d.completedDates); let i = -1;
  for(let k = l.length - 1; k >= 0; k--){ if(l[k] >= x.cy.start && l[k] <= x.cy.end){ i = k; break; } }
  if(i < 0) return;
  l.splice(i, 1); x.d.completedDates = l;
  playTick(); persist('business'); renderView();
};
ACTIONS.dvwToday = function(el, e, id){
  if(e && e.stopPropagation) e.stopPropagation();
  const t = state.tasks.items.find(function(x){ return x.id===id; }); if(!t || t.status==='done') return;
  t.status = t.status==='today' ? 'backlog' : 'today';
  playTick(); persist('tasks'); renderView();
  showToast(t.status==='today' ? t.title+' (Week '+t.master.wk+') is on today.' : t.title+' (Week '+t.master.wk+') is back in the Client backlog.', {icon:'&#128230;'});
};
undoTask = (function(base){
  return function(id){
    const t = state.tasks.items.find(function(x){ return x.id===id; });
    if(t && t.master && t.master.kind==='dvw'){ ACTIONS.mtDvUndo(null, null, id); return; }
    return base.apply(this, arguments);
  };
})(undoTask);
// the card: its own color, the week, progress in pieces
function dvwSegs(done, need){ return '<span class="mt-segs">'+Array.from({length:need}, function(_, i){ return '<i'+(i < done ? ' class="on"' : '')+'></i>'; }).join('')+'</span>'; }
function dvProgHtml(t){
  const x = dvwFind(t); if(!x) return '';
  return '<div class="mt-prog" title="Week '+x.k+': '+x.done+' of '+x.need+' · '+x.count+'/'+x.total+' this cycle">'+dvwSegs(x.done, x.need)+'<b>'+x.done+'/'+x.need+'</b>'+
    (x.done > 0 ? '<button class="mt-undo" data-action="mtDvUndo" data-id="'+t.id+'" title="Take one back">&minus;</button>' : '')+
    (x.done < x.need ? '<button class="mt-plus" data-action="completeTask" data-id="'+t.id+'" title="Log one">+1</button>' : '')+
  '</div>';
}
taskCard = (function(base){
  return function(t){
    let h = base.apply(this, arguments);
    if(!t || !t.master) return h;
    if(t.master.kind==='dvw'){
      h = h.replace('<div class="task-card ', '<div class="task-card dlv-card ');
      h = h.replace(/<span class="mt-badge"[^>]*>[\s\S]*?<\/span>/, '<span class="mt-badge is-dv" title="A client deliverable: this cycle’s Week '+t.master.wk+'">&#128230; Week '+t.master.wk+'</span>');
      return h.replace(/(<div class="task-card-title">[\s\S]*?<\/div>)/, '$1'+dvProgHtml(t));
    }
    if(t.master.kind==='reach'){
      h = h.replace(/<span class="mt-badge"[^>]*>[\s\S]*?<\/span>/, '<span class="mt-badge is-reach" title="Shows up while a client is due a touch">&#128075; Reach out</span>');
      return h.replace(/(<div class="task-card-title">[\s\S]*?<\/div>)/, '$1<div class="mt-reach"><span class="mt-reach-k">The clients due a touch are tagged below</span><button class="mt-log" data-action="openLogCenter">Log center &rarr;</button></div>');
    }
    return h;
  };
})(taskCard);
// the right-click menu says what done means here
openTaskMenu = (function(base){
  return function(t){
    const r = base.apply(this, arguments);
    const m = document.getElementById('taskCtxMenu'), x = t && dvwFind(t);
    if(m && x){
      const b = m.querySelector('[data-op="done"]'); if(b) b.innerHTML = '+1 Log one (Week '+x.k+': '+x.done+'/'+x.need+')';
      const u = m.querySelector('[data-op="undo"]'); if(u) u.innerHTML = '&minus;1 Take one back';
      if(x.count > 0 && !u){ const y = document.createElement('button'); y.className = 'ctx-item'; y.dataset.action = 'mtDvUndo'; y.dataset.id = t.id; y.innerHTML = '&minus;1 Take one back'; (b || m.querySelector('.ctx-sep')).insertAdjacentElement('afterend', y); }
      const bk = m.querySelector('[data-op="backlog"]'); if(bk) bk.innerHTML = '&larr; Back to the Client backlog';
    }
    return r;
  };
})(openTaskMenu);
// the client care ring counts this week's deliverable tasks and the reach-out
masterGoalDefs = (function(base){
  return function(){
    const out = base.apply(this, arguments).filter(function(m){ return m.key!=='care'; });
    const ts = state.tasks.items.filter(function(t){ return t.master && ((t.master.kind==='dvw' && dvwIsNow(t)) || (t.master.kind==='reach' && t.master.week===thisWeekKey())); });
    if(ts.length) out.push({key:'care', icon:'&#129309;', label:'Client care this week', cur:ts.filter(function(t){ return t.status==='done'; }).length, target:ts.length, field:null, fmt:function(n){ return fmtGoalNum(n); }, suffix:'',
      src:'client deliverables and reach-outs', go:'goToClients', color:'#b18cff', color2:'#e0d0ff'});
    return out;
  };
})(masterGoalDefs);
// Op: a deliverable task is "log one", and he knows who's due a touch
aiContext = (function(base){
  return function(){
    let s = base.apply(this, arguments);
    const dv = state.tasks.items.filter(function(t){ return t.master && t.master.kind==='dvw' && dvwIsNow(t); }).map(function(t){ const x = dvwFind(t); return x ? (x.c.business || x.c.name)+': '+t.title+' Week '+x.k+' ('+x.done+'/'+x.need+', '+x.count+'/'+x.total+' this cycle)' : ''; }).filter(Boolean);
    if(dv.length) s += '\nThis week’s client deliverable tasks (each month’s deliverable is split into four weekly tasks named after it; completing one logs ONE piece): '+dv.join('; ')+'.';
    const r = reachNeeds();
    if(r.length) s += '\nClients due a touch (the "Reach out to clients" task): '+r.map(function(x){ return (x.c.business || x.c.name)+(x.n > 0 ? ' ('+x.n+'d overdue)' : ' (due today)'); }).join(', ')+'.';
    return s;
  };
})(aiContext);

// ---- the Client backlog: the deliverable tasks, compact, by client ----
function dvwTasksFor(c, d, cy){ return state.tasks.items.filter(function(t){ const m = t.master; return m && m.kind==='dvw' && m.clientId===c.id && m.delivId===d.id && m.cycle===cy.start; }).sort(function(a, b){ return a.master.wk - b.master.wk; }); }
function clientBacklogHtml(){
  const today = todayStr();
  const blocks = mtActiveClients().map(function(c){
    const cy = dvwCycle(c), ds = arr(c.deliverables).filter(function(d){ return d.recurring; });
    if(!ds.length) return '';
    const hs = clientHealthStatus(c);
    return '<div class="cbl-client">'+
      '<div class="cbl-h"><span class="lc-av" style="background:'+clientColor(c)+'">'+escapeHtml(clientInitials(c))+'</span>'+
        '<span class="cbl-n"><b>'+escapeHtml(c.business || c.name)+'</b><small>Cycle '+fmtDateShort(cy.start)+' to '+fmtDateShort(cy.end)+'</small></span>'+
        '<span class="cbl-hs"><i class="lc-hs is-'+hs.level+'"></i>'+escapeHtml(clientHealthLabel(hs))+'</span></div>'+
      ds.map(function(d){
        const ts = dvwTasksFor(c, d, cy), count = dvwCycleCount(d, cy), total = monthlyTargetFor(d);
        return '<div class="cbl-d"><div class="cbl-dh"><b>'+escapeHtml(d.title)+'</b><span>'+count+'/'+total+' this cycle</span></div><div class="cbl-weeks">'+
          ts.map(function(t){
            const x = dvwFind(t); if(!x) return '';
            const done = t.status==='done', late = !done && t.deadline < today, now = !done && dvwIsNow(t);
            return '<div class="cbl-w'+(done ? ' is-done' : late ? ' is-late' : now ? ' is-now' : '')+'" data-id="'+t.id+'">'+
              '<button class="cbl-wk" data-action="openTaskEditModal" data-id="'+t.id+'"><b>Week '+x.k+'</b><small>'+(done ? 'Done' : late ? 'Overdue · '+fmtDateShort(t.deadline) : 'Due '+fmtDateShort(t.deadline))+'</small></button>'+
              dvwSegs(x.done, x.need)+
              '<span class="cbl-wb"><b>'+x.done+'/'+x.need+'</b>'+
                (done ? '<span class="cbl-ok">&#10003;</span>' : '<button class="mt-plus" data-action="completeTask" data-id="'+t.id+'" title="Log one">+1</button><button class="cbl-today'+(t.status==='today' ? ' is-on' : '')+'" data-action="dvwToday" data-id="'+t.id+'" title="'+(t.status==='today' ? 'On today: tap to send it back' : 'Put it on today')+'">'+(t.status==='today' ? 'On today' : '&rarr; Today')+'</button>')+
              '</span></div>';
          }).join('')+'</div></div>';
      }).join('')+
    '</div>';
  }).filter(Boolean);
  return '<div class="cbl">'+
    '<div class="lc-h"><div><div class="lc-t">Client backlog</div><div class="lc-s">Each client’s monthly deliverables, split into the four weeks of their cycle. Hit +1 for each one you finish.</div></div></div>'+
    (blocks.length ? blocks.join('') : '<div class="empty">No retainer deliverables yet. Give a client a package with deliverables and their weeks show up here.</div>')+
  '</div>';
}
// they're kept out of the regular backlog (and its counts and preview)
function dvwHiddenFromBacklog(fn, self, args){
  const off = state.tasks.items.filter(function(t){ return t.master && t.master.kind==='dvw' && t.status==='backlog'; });
  off.forEach(function(t){ t.status = '_clientBacklog'; });
  try{ return fn.apply(self, args); } finally { off.forEach(function(t){ t.status = 'backlog'; }); }
}
renderFocusBacklogTab = (function(base){ return function(){ return dvwHiddenFromBacklog(base, this, arguments); }; })(renderFocusBacklogTab);
renderFocusTasksOverview = (function(base){ return function(){ return dvwHiddenFromBacklog(base, this, arguments); }; })(renderFocusTasksOverview);
focusTasksSubtabsHtml = (function(base){
  return function(){
    const h = dvwHiddenFromBacklog(base, this, arguments);
    const n = state.tasks.items.filter(function(t){ return t.master && t.master.kind==='dvw' && t.status!=='done'; }).length;
    const on = ui.focusTasksSubTab==='clientBacklog';
    const pill = '<div class="subtab is-dlv'+(on ? ' active' : '')+'" data-action="focusTasksSubTab" data-tab="clientBacklog">&#128230; Client backlog'+(n ? ' <span style="opacity:.7;">'+n+'</span>' : '')+'</div>';
    return h.replace(/(<div class="subtab[^"]*" data-action="focusTasksSubTab" data-tab="backlog">[\s\S]*?<\/div>)/, '$1'+pill);
  };
})(focusTasksSubtabsHtml);
renderFocusTasksTab = (function(base){
  return function(){
    if(ui.focusTasksSubTab==='clientBacklog') return '<div class="subtab-panel" data-key="tasks-clientBacklog">'+clientBacklogHtml()+'</div>';
    return base.apply(this, arguments);
  };
})(renderFocusTasksTab);
ACTIONS.openClientBacklog = function(){ ui.view = 'focus'; ui.focusTab = 'tasks'; ui.focusTasksSubTab = 'clientBacklog'; renderView(); };
// the client card's strip: this week's deliverables and whether they're due a touch
crmCard = (function(base){
  return function(kind, x){
    const h = base.apply(this, arguments);
    if(kind!=='client') return h;
    return h.replace(/Checked in/, function(m){ const n = crmOverdueDays('client', x); return n!=null && n >= 0 ? 'Due a touch' : 'In touch'; });
  };
})(crmCard);
clientCardV2 = (function(base){
  return function(c){
    const h = base.apply(this, arguments), n = crmOverdueDays('client', c), due = n!=null && n >= 0;
    return h.replace(/<span class="mt-chip[^"]*"[^>]*>[\s\S]*?<\/span>/, '<span class="mt-chip'+(due ? '' : ' is-done')+'" title="'+(due ? 'Due a touch: it’s on your Reach out task' : 'In touch')+'">'+(due ? '&#9675; Due a touch' : '&#10003; In touch')+'</span>');
  };
})(clientCardV2);

// ---- the Log center: who needs a touch, and one tap to log it ----
BIZ_PEOPLE.push(['log', 'Log center']);
function logCenterHtml(){
  const cs = mtActiveClients().map(function(c){
    const n = crmOverdueDays('client', c), hs = clientHealthStatus(c), last = crmLastTouch('client', c);
    const tp = arr(c.touchpoints).slice().sort(function(a, b){ return (b.ts||0) - (a.ts||0); })[0];
    return {c:c, n:n, hs:hs, last:last, tp:tp, due:n!=null && n >= 0, score:(n==null ? -99 : n) + (hs.level==='red' ? 3 : hs.level==='yellow' ? 1 : 0)};
  }).sort(function(a, b){ return b.score - a.score; });
  const due = cs.filter(function(x){ return x.due; }), ok = cs.filter(function(x){ return !x.due; });
  const row = function(x){
    const c = x.c, today = x.last===todayStr();
    const lastTxt = x.last ? (x.tp ? touchTypeById(x.tp.type).label+' · ' : '')+(today ? 'today' : daysAgoFrom(x.last)+'d ago') : 'Never';
    return '<div class="lc-row'+(x.due ? ' is-due' : '')+'" data-key="lc-'+c.id+'">'+
      '<span class="lc-av" style="background:'+clientColor(c)+'">'+escapeHtml(clientInitials(c))+'</span>'+
      '<span class="lc-who"><b>'+escapeHtml(c.business || c.name)+'</b><small><i class="lc-hs is-'+x.hs.level+'"></i>'+escapeHtml(clientHealthLabel(x.hs))+'</small></span>'+
      '<span class="lc-last"><small>Last touch</small><b>'+lastTxt+'</b></span>'+
      '<span class="lc-due crm-due '+overdueLevel(x.n)+'">'+(today ? 'Logged today &#10003;' : dueLabel(x.n, 'client', c))+'</span>'+
      '<span class="lc-btns">'+TOUCH_TYPES.map(function(t){ return '<button class="lc-b" data-action="logTouchType" data-kind="client" data-id="'+c.id+'" data-type="'+t.id+'" title="Log a '+t.label.toLowerCase()+'">'+t.icon+'<span>'+t.label+'</span></button>'; }).join('')+'</span>'+
    '</div>';
  };
  return '<div class="lc">'+
    '<div class="lc-h"><div><div class="lc-t">Log center</div><div class="lc-s">Every client and just what needs logging: touches. Most urgent first.</div></div>'+
      '<div class="lc-k"><span class="'+(due.length ? 'is-due' : 'is-ok')+'"><b>'+due.length+'</b> due a touch</span><span><b>'+ok.length+'</b> in touch</span></div></div>'+
    (cs.length ? '' : '<div class="empty">No active clients yet.</div>')+
    (due.length ? '<div class="lc-sec">Due now</div>'+due.map(row).join('') : (cs.length ? '<div class="lc-clear">&#10003; Everyone’s in touch. Nothing to log right now.</div>' : ''))+
    (ok.length ? '<div class="lc-sec">In touch</div><div class="lc-ok">'+ok.map(row).join('')+'</div>' : '')+
  '</div>';
}
renderBusiness = (function(base){
  return function(){
    let h = base.apply(this, arguments);
    if(ui.businessTab!=='log') return h;
    const tpl = document.createElement('template'); tpl.innerHTML = h;
    const panel = tpl.content.querySelector('.tab-panel');
    if(panel){ panel.setAttribute('data-key', 'business-log'); panel.innerHTML = logCenterHtml(); }
    h = tpl.innerHTML;
    const n = reachNeeds().length;
    return h.replace(/(data-tab="log">Log center)/, '$1'+(n ? ' <span class="lc-badge">'+n+'</span>' : ''));
  };
})(renderBusiness);
ACTIONS.openLogCenter = function(el, e){ if(e && e.stopPropagation) e.stopPropagation(); ui.view = 'business'; ui.businessTab = 'log'; renderView(); };

// ---- Today: the date, on a little calendar tile ----
function isoWeekNum(d){ const t = new Date(Date.UTC(d.getFullYear(), d.getMonth(), d.getDate())), day = t.getUTCDay() || 7; t.setUTCDate(t.getUTCDate() + 4 - day); const y0 = new Date(Date.UTC(t.getUTCFullYear(), 0, 1)); return Math.ceil(((t - y0)/86400000 + 1)/7); }
function thDateHtml(){
  const d = new Date(), end = new Date(d.getFullYear(), 11, 31), left = Math.round((end - new Date(d.getFullYear(), d.getMonth(), d.getDate()))/86400000);
  return '<div class="th-date" data-day="'+todayStr()+'">'+
    '<span class="thd-cal"><i>'+d.toLocaleDateString(undefined, {month:'short'}).toUpperCase()+'</i><b>'+d.getDate()+'</b></span>'+
    '<span class="thd-t"><b>'+d.toLocaleDateString(undefined, {weekday:'long'})+'</b><small>'+d.toLocaleDateString(undefined, {month:'long', day:'numeric'})+' &middot; Week '+isoWeekNum(d)+' &middot; '+left+' days left in '+d.getFullYear()+'</small></span>'+
  '</div>';
}
renderToday = (function(base){
  return function(){
    const h = base.apply(this, arguments);
    return h.replace('<div class="th-sub" id="liveClock"></div>', thDateHtml());
  };
})(renderToday);
setInterval(function(){ try{ const el = document.querySelector('.th-date'); if(el && el.dataset.day!==todayStr()) renderView(); }catch(e){} }, 60000);

// ---- skills (and anything ongoing) done for the day leave the lineup until tomorrow ----
// (they're still on Training Skills; a small line by "Current Lineup" says how many are done for today)
renderFocusTasksOverview = (function(base){
  return function(){
    const off = state.tasks.items.filter(function(t){ return t.status==='today' && isOngoingDoneToday(t); });
    off.forEach(function(t){ t.status = '_doneForToday'; });
    let h;
    try{ h = base.apply(this, arguments); } finally { off.forEach(function(t){ t.status = 'today'; }); }
    if(!off.length) return h;
    const note = '<button class="dfd-note" data-action="focusTasksSubTab" data-tab="skills" title="'+escapeHtml(off.map(function(t){ return t.title; }).join(', '))+'">&#10003; '+off.length+' done for today &middot; back tomorrow</button>';
    return h.replace(/(Current Lineup <span class="kpi-sub">\d+<\/span>)/, '$1'+note);
  };
})(renderFocusTasksOverview);
renderOngoingTasksPanel = (function(base){
  return function(){
    const off = state.tasks.items.filter(function(t){ return t.ongoing && t.status!=='done' && isOngoingDoneToday(t); }), was = off.map(function(t){ return t.status; });
    off.forEach(function(t){ t.status = 'done'; });
    try{ return base.apply(this, arguments); } finally { off.forEach(function(t, i){ t.status = was[i]; }); }
  };
})(renderOngoingTasksPanel);
