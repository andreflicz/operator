// ============ ROUND 38h ============
// • Client deliverable tasks are automatic. A package's deliverable becomes four tasks for the client's
//   cycle, named like "16 Reels 1/4" (2/4, 3/4, 4/4), each due at the end of its week. Finishing one is
//   one click: it logs that week's share (4 reels) on the client's card. Undo takes them back.
// • A one-off deliverable becomes one task of its own (same client, its due date). Done on either side
//   is done on both.
// • Logging on the client card still counts: once there's enough for a week, that week's task is done.
// • Editing one of these tasks doesn't offer a deliverable picker (nothing to pick: it comes from the
//   deliverable), and its name, client and due date stay tied to the deliverable.
// • Lock-in sequence: the Task / Method / Set up / Begin steps sit in the middle of the screen.

// ---- the split: a month into four weeks, the extras spread out (6 → 2,1,2,1; 2 → 1,0,1,0) ----
const DVW_SPREAD = [0, 2, 1, 3];
dvwNeeds = function(d){
  const n = Math.max(0, Math.round(monthlyTargetFor(d) || 0)), b = Math.floor(n/4), r = n % 4, out = [b, b, b, b];
  for(let i = 0; i < r; i++) out[DVW_SPREAD[i]]++;
  return out;
};
function dvwParts(d){ return dvwNeeds(d).map(function(n, i){ return n ? i + 1 : 0; }).filter(Boolean); }
function dvwBaseName(d){
  const t = String(d.title || 'Deliverable').trim(), n = monthlyTargetFor(d);
  return /^\d/.test(t) || !n ? t : n+' '+t;
}
function dvwTitle(d, wk){ const p = dvwParts(d); return dvwBaseName(d)+' '+(p.indexOf(wk) + 1)+'/'+p.length; }
function dvwPieces(d, n){ const one = delivOne(d).toLowerCase(), many = String(d.title || '').toLowerCase(); return n+' '+(n===1 ? one : many); }
dvwFind = function(t){
  const m = t && t.master; if(!m || m.kind!=='dvw') return null;
  const hit = delivFind(m.clientId, m.delivId); if(!hit) return null;
  if(m.oneOff) return {c:hit.c, d:hit.d, cy:null, k:0, need:1, done:hit.d.status==='done' ? 1 : 0, total:1, count:hit.d.status==='done' ? 1 : 0, oneOff:true};
  const cy = {start:m.cycle, end:m.cycleEnd}, need = dvwNeeds(hit.d)[m.wk - 1] || 0;
  return {c:hit.c, d:hit.d, cy:cy, k:m.wk, need:need, done:t.status==='done' ? need : 0, total:monthlyTargetFor(hit.d), count:dvwCycleCount(hit.d, cy)};
};
// pieces this cycle that came from the card (not from finishing a task) fill the weeks in order
function dvwSettle(c, d, cy, today){
  let changed = false;
  const ts = dvwTasksFor(c, d, cy).filter(function(t){ return !t.master.retired; }), needs = dvwNeeds(d);
  let free = dvwCycleCount(d, cy) - ts.reduce(function(a, t){ return a + (t.status==='done' && t.master.logged > 0 ? t.master.logged : 0); }, 0);
  ts.forEach(function(t){
    const m = t.master;
    if(t.status==='done' && m.logged > 0) return;
    const need = needs[m.wk - 1] || 0;
    if(need && free >= need){
      if(t.status!=='done'){ m.prev = t.status; t.status = 'done'; t.completedAt = today; changed = true; }
      free -= need;
    } else if(t.status==='done'){ t.status = m.prev && m.prev!=='done' ? m.prev : 'backlog'; t.completedAt = null; changed = true; }
  });
  return changed;
}

function masterTasksSync(){
  if(mt38Busy || !state || !state.tasks || !state.business) return; mt38Busy = true;
  try{
    const wk = thisWeekKey(), made = mtStore(), today = todayStr(), cs = mtActiveClients();
    let changed = false;
    state.tasks.items = state.tasks.items.filter(function(t){
      const old = t.master && (t.master.kind==='care' || t.master.kind==='deliv' || t.master.kind==='dv') && t.status!=='done';
      if(old) changed = true; return !old;
    });
    const live = {};
    cs.forEach(function(c){
      const cy = dvwCycle(c), weeks = dvwWeeks(cy);
      arr(c.deliverables).forEach(function(d){
        // a one-off: one task, tied both ways
        if(!d.recurring){
          live[c.id+':'+d.id+':oneoff:0'] = 1;
          let t = d.linkedTaskId ? state.tasks.items.find(function(x){ return x.id===d.linkedTaskId; }) : null;
          if(!t && d.status==='done') return;
          if(!t){
            t = {id:uid(), title:'', client:c.id, clients:[c.id], priority:'med', deadline:d.dueDate || null, notes:'', status:'backlog', createdAt:today, completedAt:null};
            state.tasks.items.push(t); d.linkedTaskId = t.id; changed = true; persist('business');
          }
          if(!t.master || t.master.kind!=='dvw'){ t.master = {kind:'dvw', oneOff:true, cycle:'oneoff', cycleEnd:'9999-12-31', wk:0, start:t.createdAt || today, clientId:c.id, delivId:d.id}; changed = true; }
          const title = String(d.title || 'Deliverable').trim();
          if(t.title!==title){ t.title = title; changed = true; }
          if((t.deadline || null)!==(d.dueDate || null)){ t.deadline = d.dueDate || null; changed = true; }
          if(JSON.stringify(t.clients)!==JSON.stringify([c.id])){ t.clients = [c.id]; t.client = c.id; changed = true; }
          if(d.status==='done' && t.status!=='done'){ t.master.prev = t.status; t.status = 'done'; t.completedAt = d.completedAt || today; changed = true; }
          else if(d.status!=='done' && t.status==='done'){ t.status = t.master.prev && t.master.prev!=='done' ? t.master.prev : 'backlog'; t.completedAt = null; changed = true; }
          return;
        }
        // a monthly one: the cycle's weeks
        const needs = dvwNeeds(d);
        weeks.forEach(function(w){
          if(!needs[w.k - 1]) return;
          live[c.id+':'+d.id+':'+cy.start+':'+w.k] = 1;
          const key = cy.start+':dvw:'+c.id+':'+d.id+':'+w.k;
          if(made[key]) return;
          made[key] = 1; changed = true;
          state.tasks.items.push({id:uid(), title:dvwTitle(d, w.k), client:c.id, clients:[c.id], priority:'med', deadline:w.end, notes:'', status:'backlog', createdAt:today, completedAt:null,
            master:{kind:'dvw', cycle:cy.start, cycleEnd:cy.end, wk:w.k, start:w.start, clientId:c.id, delivId:d.id}});
        });
        state.tasks.items.forEach(function(t){
          const m = t.master; if(!m || m.kind!=='dvw' || m.oneOff || m.clientId!==c.id || m.delivId!==d.id || m.cycle!==cy.start) return;
          const title = dvwTitle(d, m.wk); if(t.title!==title){ t.title = title; changed = true; }
        });
        if(dvwSettle(c, d, cy, today)) changed = true;
      });
    });
    state.tasks.items = state.tasks.items.filter(function(t){
      const m = t.master;
      const gone = m && m.kind==='dvw' && t.status!=='done' && m.cycleEnd >= today && !live[m.clientId+':'+m.delivId+':'+m.cycle+':'+m.wk];
      if(gone) changed = true; return !gone;
    });
    state.tasks.items.forEach(function(t){
      const m = t.master; if(!m || m.kind!=='dvw' || m.oneOff) return;
      if(m.cycleEnd < today && t.status!=='done' && !m.retired){ m.retired = true; t.status = 'done'; t.completedAt = m.cycleEnd; t.missed = true; changed = true; }
    });
    // reach out to clients (unchanged)
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
    Object.keys(made).forEach(function(k){ if(/^\d{4}-/.test(k) && k.slice(0, 10) < addDays(wk, -70)) delete made[k]; });
    if(changed){ persist('tasks'); persist('focus'); setTimeout(function(){ try{ renderView(); }catch(e){} }, 0); }
  }finally{ mt38Busy = false; }
}

// ---- done in one click (and undo) ----
function dvwDone(t){
  const x = dvwFind(t); if(!x || t.status==='done') return;
  const m = t.master, today = todayStr();
  if(x.oneOff){ x.d.status = 'done'; x.d.completedAt = today; }
  else { for(let i = 0; i < x.need; i++) delivLogOne({c:x.c, d:x.d}, today); m.logged = x.need; }
  if(ui.currentTaskId===t.id && typeof releaseCurrentTask==='function') try{ releaseCurrentTask(); }catch(e){}
  m.prev = t.status; t.status = 'done'; t.completedAt = today;
  playTaskComplete(); persist('business'); persist('tasks'); renderView();
  const y = dvwFind(t), who = x.c.business || x.c.name;
  showToast(x.oneOff ? escapeHtml(t.title)+' for '+escapeHtml(who)+': done.' : escapeHtml(t.title)+' done: '+dvwPieces(x.d, x.need)+' logged for '+escapeHtml(who)+' · '+y.count+'/'+y.total+' this cycle.',
    {icon:'&#128230;', actionLabel:'Undo', actionAction:'mtDvUndo', actionId:t.id, duration:5000});
}
function dvwUndo(t){
  const x = dvwFind(t); if(!x || t.status!=='done') return;
  const m = t.master;
  if(x.oneOff){ x.d.status = 'pending'; x.d.completedAt = null; }
  else {
    // take back what this week put in (the latest pieces of the cycle)
    let n = m.logged > 0 ? m.logged : x.need;
    const l = arr(x.d.completedDates);
    for(let k = l.length - 1; k >= 0 && n > 0; k--){ if(l[k] >= x.cy.start && l[k] <= x.cy.end){ l.splice(k, 1); n--; } }
    x.d.completedDates = l; m.logged = 0;
  }
  t.status = m.prev && m.prev!=='done' ? m.prev : 'backlog'; t.completedAt = null; t.missed = false; m.retired = false;
  playTick(); persist('business'); persist('tasks'); renderView();
}
completeTask = (function(base){
  return function(id){
    const t = state.tasks.items.find(function(x){ return x.id===id; });
    if(t && t.master && t.master.kind==='dvw'){ dvwDone(t); return; }
    return base.apply(this, arguments);
  };
})(completeTask);
undoTask = (function(base){
  return function(id){
    const t = state.tasks.items.find(function(x){ return x.id===id; });
    if(t && t.master && t.master.kind==='dvw'){ dvwUndo(t); return; }
    return base.apply(this, arguments);
  };
})(undoTask);
ACTIONS.mtDvUndo = function(el, e, id){ const t = state.tasks.items.find(function(x){ return x.id===id; }); if(t) dvwUndo(t); };
ACTIONS.dvwDone = function(el, e, id){ if(e && e.stopPropagation) e.stopPropagation(); const t = state.tasks.items.find(function(x){ return x.id===id; }); if(t) dvwDone(t); };
// the card: what this one is worth, no counters
function dvProgHtml(t){
  const x = dvwFind(t); if(!x) return '';
  return '<div class="dvw-sub">'+(x.oneOff ? 'One-off for '+escapeHtml(x.c.business || x.c.name) : dvwPieces(x.d, x.need)+' &middot; '+x.count+'/'+x.total+' this cycle')+'</div>';
}
taskCard = (function(base){
  return function(t){
    const h = base.apply(this, arguments);
    if(!t || !t.master || t.master.kind!=='dvw') return h;
    return h.replace(/<span class="mt-badge is-dv"[^>]*>[\s\S]*?<\/span>/, '<span class="mt-badge is-dv" title="Made from the client’s deliverable">&#128230; '+(t.master.oneOff ? 'One-off' : 'Week '+t.master.wk)+'</span>');
  };
})(taskCard);
openTaskMenu = (function(base){
  return function(t){
    const r = base.apply(this, arguments);
    const m = document.getElementById('taskCtxMenu'), x = t && dvwFind(t);
    if(m && x){
      m.querySelectorAll('[data-action="mtDvUndo"]').forEach(function(b){ if(!b.dataset.op) b.remove(); });
      const b = m.querySelector('[data-op="done"]'); if(b) b.innerHTML = '&#10003; Done'+(x.oneOff ? '' : ' ('+dvwPieces(x.d, x.need)+')');
      const u = m.querySelector('[data-op="undo"]'); if(u) u.innerHTML = '&#8630; Not done';
    }
    return r;
  };
})(openTaskMenu);
// Op knows what done means now
aiContext = (function(base){
  return function(){
    let s = base.apply(this, arguments);
    s = s.replace(/ Week 0 \(\d\/1, \d\/1 this cycle\)/g, ' (one-off)');
    return s.replace(/This week’s client deliverable tasks \(each month’s deliverable is split into four weekly tasks named after it; completing one logs ONE piece\)/, 'This week’s client deliverable tasks (made automatically: each monthly deliverable is four weekly tasks like "16 Reels 1/4"; completing one logs that whole week’s share on the client’s card; a one-off deliverable is one task)');
  };
})(aiContext);

// ---- the Client backlog: each deliverable's weeks, one Done each ----
function clientBacklogHtml(){
  const today = todayStr();
  const row = function(t, x, label, sub){
    const done = t.status==='done', late = !done && t.deadline && t.deadline < today, now = !done && !x.oneOff && dvwIsNow(t);
    return '<div class="cbl-w'+(done ? ' is-done' : late ? ' is-late' : now ? ' is-now' : '')+'" data-id="'+t.id+'">'+
      '<button class="cbl-wk" data-action="openTaskEditModal" data-id="'+t.id+'"><b>'+escapeHtml(label)+'</b><small>'+(done ? 'Done' : late ? 'Overdue · '+fmtDateShort(t.deadline) : t.deadline ? 'Due '+fmtDateShort(t.deadline) : 'No due date')+'</small></button>'+
      '<span class="cbl-q">'+sub+'</span>'+
      '<span class="cbl-wb">'+
        (done ? '<span class="cbl-ok">&#10003;</span><button class="cbl-undo" data-action="mtDvUndo" data-id="'+t.id+'" title="Not done after all">Undo</button>'
              : '<button class="cbl-today'+(t.status==='today' ? ' is-on' : '')+'" data-action="dvwToday" data-id="'+t.id+'" title="'+(t.status==='today' ? 'On today: tap to send it back' : 'Put it on today')+'">'+(t.status==='today' ? 'On today' : '&rarr; Today')+'</button><button class="cbl-done" data-action="dvwDone" data-id="'+t.id+'">&#10003; Done</button>')+
      '</span></div>';
  };
  const blocks = mtActiveClients().map(function(c){
    const cy = dvwCycle(c), ds = arr(c.deliverables).filter(function(d){ return d.recurring; });
    const ones = arr(c.deliverables).filter(function(d){ return !d.recurring; }).map(function(d){ return d.linkedTaskId ? state.tasks.items.find(function(t){ return t.id===d.linkedTaskId && t.master && t.master.kind==='dvw'; }) : null; })
      .filter(function(t){ return t && (t.status!=='done' || t.completedAt===today); });
    if(!ds.length && !ones.length) return '';
    const hs = clientHealthStatus(c);
    return '<div class="cbl-client">'+
      '<div class="cbl-h"><span class="lc-av" style="background:'+clientColor(c)+'">'+escapeHtml(clientInitials(c))+'</span>'+
        '<span class="cbl-n"><b>'+escapeHtml(c.business || c.name)+'</b><small>Cycle '+fmtDateShort(cy.start)+' to '+fmtDateShort(cy.end)+'</small></span>'+
        '<span class="cbl-hs"><i class="lc-hs is-'+hs.level+'"></i>'+escapeHtml(clientHealthLabel(hs))+'</span></div>'+
      ds.map(function(d){
        const ts = dvwTasksFor(c, d, cy), count = dvwCycleCount(d, cy), total = monthlyTargetFor(d);
        return '<div class="cbl-d"><div class="cbl-dh"><b>'+escapeHtml(dvwBaseName(d))+'</b><span>'+count+'/'+total+' this cycle</span></div><div class="cbl-weeks">'+
          ts.map(function(t){ const x = dvwFind(t); return x ? row(t, x, t.title, dvwPieces(x.d, x.need)+' &middot; Week '+x.k) : ''; }).join('')+'</div></div>';
      }).join('')+
      (ones.length ? '<div class="cbl-d"><div class="cbl-dh"><b>One-offs</b><span>'+ones.length+'</span></div><div class="cbl-weeks">'+
        ones.map(function(t){ const x = dvwFind(t); return x ? row(t, x, t.title, 'One-off') : ''; }).join('')+'</div></div>' : '')+
    '</div>';
  }).filter(Boolean);
  return '<div class="cbl">'+
    '<div class="lc-h"><div><div class="lc-t">Client backlog</div><div class="lc-s">Made from each client’s deliverables: a monthly one is four weekly tasks for their cycle, a one-off is one. Done logs the week’s share on their card.</div></div></div>'+
    (blocks.length ? blocks.join('') : '<div class="empty">No client deliverables yet. Give a client a package (or a one-off) and the tasks show up here.</div>')+
  '</div>';
}

// ---- editing one: no deliverable picker anywhere in Edit; these say where they come from ----
renderTaskEditModal = (function(base){
  return function(){
    const h = base.apply(this, arguments); if(!h) return h;
    const tpl = document.createElement('template'); tpl.innerHTML = h;
    tpl.content.querySelectorAll('.tdv').forEach(function(e){ e.remove(); });
    const t = state.tasks.items.find(function(x){ return x.id===ui.editingTaskId; }), x = t && dvwFind(t);
    if(x){
      const who = x.c.business || x.c.name;
      const info = document.createElement('div'); info.className = 'dvw-auto';
      info.innerHTML = '<span class="dvw-auto-i">&#128230;</span><span><b>Automatic: from '+escapeHtml(who)+'’s '+escapeHtml(x.oneOff ? x.d.title : dvwBaseName(x.d))+'</b><small>'+
        (x.oneOff ? 'A one-off deliverable. Its name, client and due date come from the deliverable.' : 'Week '+x.k+' of their cycle: '+dvwPieces(x.d, x.need)+', due '+fmtDateShort(t.deadline)+'. Done logs them on their card. Name, client and due date come from the deliverable.')+'</small></span>';
      const title = tpl.content.querySelector('#editTitle-'+t.id);
      tpl.content.querySelector('.section-title').insertAdjacentElement('afterend', info);
      if(title){ title.setAttribute('readonly', ''); title.closest('.field').classList.add('dvw-lock'); }
      ['editDeadline-'+t.id].forEach(function(id){ const e = tpl.content.querySelector('#'+id); if(e){ const f = e.closest('.field'); if(f) f.classList.add('dvw-hide'); } });
      tpl.content.querySelectorAll('.field').forEach(function(f){ const l = f.querySelector('label'); if(l && /Client\(s\)|How often/.test(l.textContent)) f.classList.add('dvw-hide'); });
      tpl.content.querySelectorAll('label').forEach(function(l){ if(l.querySelector('input[type="checkbox"]') && /Ongoing|Training skill/.test(l.textContent)) l.classList.add('dvw-hide'); });
    }
    return tpl.innerHTML;
  };
})(renderTaskEditModal);
saveEditTask = (function(base){
  return function(id){
    const t = state.tasks.items.find(function(x){ return x.id===id; });
    if(!t || !t.master || t.master.kind!=='dvw') return base.apply(this, arguments);
    // only what's yours to change: priority, category, notes; the rest stays the deliverable's
    const keep = {title:t.title, clients:arr(t.clients).slice(), client:t.client, deadline:t.deadline, skill:t.skill, ongoing:t.ongoing};
    const r = base.apply(this, arguments);
    Object.assign(t, keep); persist('tasks'); renderView();
    return r;
  };
})(saveEditTask);
