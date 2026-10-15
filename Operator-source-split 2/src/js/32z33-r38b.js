// ============ ROUND 38b: master tasks that track the work ============
// • Deliverable tasks: one per client per retainer deliverable, made for you every week ("Complete 4
//   reels", "Meta ads"). You don't finish them in one go: each time you hit done it logs one (1 of 4 =
//   25%) and the task stays until the week's number is in. They read and write the client's deliverable
//   count, so the card, pace, health and stats all move with them.
// • Reach out to clients: one task, only there while someone's due a touch. It's tagged with exactly
//   those clients and its priority follows their health and how long it's been.
// • Log center: a Clients sub-tab with every client and just what needs logging (touches), most urgent
//   first, with one-tap logging.
// • Today's date gets a little calendar tile.

// ---- the deliverable tasks ----
function dvFind(t){
  const m = t && t.master; if(!m || m.kind!=='dv') return null;
  return delivFind(m.clientId, m.delivId);
}
function dvNeed(d){ return Math.max(1, d.weeklyTarget || 1); }
function dvDone(d){ return Math.min(dvNeed(d), deliverableWeekCount(d)); }
function dvTitle(d){
  const n = dvNeed(d), t = String(d.title||'Deliverable').trim();
  if(n===1) return t;
  return 'Complete '+n+' '+t.toLowerCase();
}
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
    // the old kinds (a weekly check-in batch, one deliverables task per client) make way for these
    state.tasks.items = state.tasks.items.filter(function(t){
      const old = t.master && (t.master.kind==='care' || t.master.kind==='deliv') && t.status!=='done';
      if(old) changed = true; return !old;
    });
    // one task per client per recurring deliverable, this week
    const live = {};
    cs.forEach(function(c){ arr(c.deliverables).forEach(function(d){
      if(!d.recurring) return;
      const key = wk+':dv:'+c.id+':'+d.id; live[c.id+':'+d.id] = 1;
      if(made[key]) return;
      made[key] = 1; changed = true;
      state.tasks.items.push({id:uid(), title:dvTitle(d), client:c.id, clients:[c.id], priority:'med', deadline:addDays(wk, 6), notes:'', status:'today', createdAt:today, completedAt:null,
        master:{kind:'dv', week:wk, clientId:c.id, delivId:d.id}});
    }); });
    state.tasks.items = state.tasks.items.filter(function(t){
      // a client who's gone (or a deliverable that's gone) takes its open task with it
      const gone = t.master && t.master.kind==='dv' && t.master.week===wk && t.status!=='done' && !live[t.master.clientId+':'+t.master.delivId];
      if(gone) changed = true; return !gone;
    });
    state.tasks.items.forEach(function(t){
      const m = t.master; if(!m) return;
      if(m.kind==='dv' && m.week===wk){
        const hit = dvFind(t); if(!hit) return;
        const title = dvTitle(hit.d); if(t.title!==title){ t.title = title; changed = true; }
        const done = dvDone(hit.d), need = dvNeed(hit.d);
        if(t.status!=='done' && done >= need){ t.status = 'done'; t.completedAt = today; changed = true; }
        else if(t.status==='done' && done < need){ t.status = 'today'; t.completedAt = null; changed = true; }
        else if(t.status==='backlog'){ t.status = 'today'; changed = true; }
      }
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
    // last week's deliverable tasks that never got there are history now
    state.tasks.items.forEach(function(t){ if(t.master && t.master.week < wk && t.master.kind==='dv' && t.status!=='done' && !t.master.retired){ t.master.retired = true; t.status = 'done'; t.completedAt = addDays(t.master.week, 6); t.missed = true; changed = true; } });
    Object.keys(made).forEach(function(k){ if(k.slice(0, 10) < addDays(wk, -35)) delete made[k]; });
    if(changed){ persist('tasks'); persist('focus'); setTimeout(function(){ try{ renderView(); }catch(e){} }, 0); }
  }finally{ mt38Busy = false; }
}
// hitting done on a deliverable task logs one; it finishes when the week's number is in
completeTask = (function(base){
  return function(id){
    const t = state.tasks.items.find(function(x){ return x.id===id; });
    if(t && t.master && t.master.kind==='dv'){
      const hit = dvFind(t); if(!hit) return;
      const need = dvNeed(hit.d);
      if(t.status==='done' || dvDone(hit.d) >= need){ showToast('This week’s '+hit.d.title.toLowerCase()+' for '+(hit.c.business || hit.c.name)+' are already in.', {icon:'&#10003;'}); return; }
      delivLogOne(hit, todayStr());
      const done = dvDone(hit.d);
      if(done >= need){ t.status = 'done'; t.completedAt = todayStr(); playTaskComplete(); }
      else playTick();
      persist('business'); persist('tasks'); renderView();
      showToast(done >= need ? 'Done for the week: '+need+' '+(need===1 ? delivOne(hit.d) : hit.d.title).toLowerCase()+' for '+(hit.c.business || hit.c.name)+'.' : delivOne(hit.d)+' '+done+' of '+need+' for '+(hit.c.business || hit.c.name)+' ('+Math.round(done/need*100)+'%).', {icon:'&#128230;', actionLabel:'Undo', actionAction:'mtDvUndo', actionId:t.id, duration:4500});
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
ACTIONS.mtDvUndo = function(el, e, id){
  const t = state.tasks.items.find(function(x){ return x.id===id; }), hit = dvFind(t); if(!hit) return;
  const l = arr(hit.d.completedDates); if(!l.length) return;
  const wk = thisWeekKey(); let i = -1;
  for(let k = l.length - 1; k >= 0; k--){ if(l[k] >= wk){ i = k; break; } }
  if(i < 0) return;
  l.splice(i, 1); hit.d.completedDates = l;
  playTick(); persist('business'); renderView();
};
// undoing a finished deliverable task takes one back (not the whole week)
undoTask = (function(base){
  return function(id){
    const t = state.tasks.items.find(function(x){ return x.id===id; });
    if(t && t.master && t.master.kind==='dv'){ ACTIONS.mtDvUndo(null, null, id); return; }
    return base.apply(this, arguments);
  };
})(undoTask);
// the card: progress in pieces, and a way to take one back
function dvProgHtml(t){
  const hit = dvFind(t); if(!hit) return '';
  const need = dvNeed(hit.d), done = dvDone(hit.d);
  return '<div class="mt-prog" title="'+done+' of '+need+' this week · '+delivMonthLine(hit.d)+'">'+
    '<span class="mt-segs">'+Array.from({length:need}, function(_, i){ return '<i'+(i < done ? ' class="on"' : '')+'></i>'; }).join('')+'</span>'+
    '<b>'+done+'/'+need+'</b>'+
    (done > 0 ? '<button class="mt-undo" data-action="mtDvUndo" data-id="'+t.id+'" title="Take one back">&minus;</button>' : '')+
    (done < need ? '<button class="mt-plus" data-action="completeTask" data-id="'+t.id+'" title="Log one">+1</button>' : '')+
  '</div>';
}
taskCard = (function(base){
  return function(t){
    let h = base.apply(this, arguments);
    if(!t || !t.master) return h;
    if(t.master.kind==='dv'){
      h = h.replace(/<span class="mt-badge"[^>]*>[\s\S]*?<\/span>/, '<span class="mt-badge is-dv" title="A deliverable: it comes back every week while they’re a client">&#9638; Deliverable</span>');
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
    const m = document.getElementById('taskCtxMenu'), hit = t && dvFind(t);
    if(m && hit){
      const need = dvNeed(hit.d), done = dvDone(hit.d);
      const b = m.querySelector('[data-op="done"]'); if(b) b.innerHTML = '+1 Log one ('+done+'/'+need+')';
      const u = m.querySelector('[data-op="undo"]'); if(u) u.innerHTML = '&minus;1 Take one back';
      if(done > 0 && !u){ const x = document.createElement('button'); x.className = 'ctx-item'; x.dataset.action = 'mtDvUndo'; x.dataset.id = t.id; x.innerHTML = '&minus;1 Take one back'; (b || m.querySelector('.ctx-sep')).insertAdjacentElement('afterend', x); }
    }
    return r;
  };
})(openTaskMenu);
// Op: a deliverable task is "log one", and he knows who's due a touch
aiContext = (function(base){
  return function(){
    let s = base.apply(this, arguments);
    const dv = state.tasks.items.filter(function(t){ return t.master && t.master.kind==='dv' && t.master.week===thisWeekKey(); }).map(function(t){ const h = dvFind(t); return h ? (h.c.business || h.c.name)+': '+t.title+' ('+dvDone(h.d)+'/'+dvNeed(h.d)+')' : ''; }).filter(Boolean);
    if(dv.length) s += '\nThis week’s deliverable tasks (completing one logs ONE piece; it finishes when the week’s number is in): '+dv.join('; ')+'.';
    const r = reachNeeds();
    if(r.length) s += '\nClients due a touch (the "Reach out to clients" task): '+r.map(function(x){ return (x.c.business || x.c.name)+(x.n > 0 ? ' ('+x.n+'d overdue)' : ' (due today)'); }).join(', ')+'.';
    return s;
  };
})(aiContext);
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
