
// ============ CLIENT CYCLES (your playbooks for onboarding + running clients) ============
// You design any number of cycles — e.g. "Retainer client", "One-off shoot" — each a list of
// steps (Onboarding → Kick-off → …) with checklist items. Items have a type: a meeting/call
// you can schedule straight onto the calendar, a form / video / document you send by link
// (saved once on the item, copied per client), or a plain to-do. Every client follows one
// cycle; their page shows the current step and what's left, and finishing the last step
// marks the cycle done (an Onboarding client then becomes Active).
//
// Separate from cycles, the client *status* (Onboarding / Active / At risk / Paused /
// Churned) is still the CRM stage.
const LC_ITEM_TYPES = [
  {id:'task', icon:'&#9744;', label:'To-do'},
  {id:'meeting', icon:'&#128222;', label:'Call / meeting'},
  {id:'form', icon:'&#128221;', label:'Form'},
  {id:'video', icon:'&#127916;', label:'Video'},
  {id:'doc', icon:'&#128196;', label:'Document'},
  {id:'link', icon:'&#128279;', label:'Link'}
];
// The starter checklists from the previous (single checklist per status) version — only used
// to tell whether you had customised them before cycles existed.
const DEFAULT_LIFECYCLE_CHECKLISTS = {
  onboarding: ['Send welcome message','Contract signed','First invoice paid','Collect brand assets & logins','Book kickoff call'],
  active: ['Monthly content plan sent','Weekly check-in','Monthly results recap'],
  atrisk: ['Call to understand what\'s off','Send a quick win / results summary','Agree on a fix plan']
};
function lcType(id){ return LC_ITEM_TYPES.find(function(t){ return t.id===id; }) || LC_ITEM_TYPES[0]; }
function lcItem(text, type, link){ return {id:uid(), text:text, type:type||'task', link:link||''}; }
function lcStep(label, color, items){ return {id:uid(), label:label, color:color, checklist:items}; }
function defaultCycles(){
  return [
    {id:uid(), name:'Retainer client', color:'#3FBE8E', finishStage:'active', steps:[
      lcStep('Onboarding', '#8fdcff', [lcItem('Onboarding call / meeting','meeting'), lcItem('Send onboarding form','form'), lcItem('Send onboarding videos','video'), lcItem('Contract signed','doc'), lcItem('First invoice paid','task')]),
      lcStep('Kick-off', '#E8A23D', [lcItem('Kick-off call','meeting'), lcItem('Agree goals & content plan','task'), lcItem('Collect brand assets & logins','task')]),
      lcStep('First delivery', '#b39ddb', [lcItem('First deliverables sent','task'), lcItem('Feedback call','meeting')]),
      lcStep('Ongoing', '#3FBE8E', [lcItem('Weekly check-in','meeting'), lcItem('Monthly results report','doc')])
    ]},
    {id:uid(), name:'One-off shoot', color:'#C58FFF', finishStage:'active', steps:[
      lcStep('Booking', '#8fdcff', [lcItem('Discovery call','meeting'), lcItem('Send shoot brief form','form'), lcItem('Deposit paid','task')]),
      lcStep('Pre-production', '#E8A23D', [lcItem('Shot list approved','doc'), lcItem('Location & time confirmed','task')]),
      lcStep('Shoot day', '#C58FFF', [lcItem('Shoot','meeting'), lcItem('Footage backed up','task')]),
      lcStep('Delivery', '#3FBE8E', [lcItem('Edits delivered','link'), lcItem('Revisions done','task'), lcItem('Final invoice paid','task'), lcItem('Ask for a testimonial','task')])
    ]}
  ];
}
// Called from normalizeCrmData. Upgrades the single-checklist-per-stage version (from the
// previous update) into cycles without losing anything that was checked or customised.
function normalizeLifecycle(b){
  const crmD = b.crm;
  if(!Array.isArray(crmD.cycles)){
    const path = crmD.clientStages.filter(function(s){ return s.active!==false && !s.kind && Array.isArray(s.checklist); });
    const anyChecks = b.clients.some(function(c){ return c.lifecycle && c.lifecycle.checks && Object.keys(c.lifecycle.checks).some(function(k){ return arr(c.lifecycle.checks[k]).length; }); });
    const anyTasks = arr(state.tasks && state.tasks.items).some(function(t){ return !!t.lifecycleRef; });
    const edited = path.some(function(s){
      const def = DEFAULT_LIFECYCLE_CHECKLISTS[s.id] || [];
      return s.checklist.length!==def.length || s.checklist.some(function(it, i){ return it.text!==def[i]; });
    }) || path.some(function(s){ return ['onboarding','active','atrisk'].indexOf(s.id)<0; });
    crmD.cycles = defaultCycles();
    if(crmD.lifecycleSeeded && (anyChecks || anyTasks || edited)){
      // Keep the steps you'd built (same ids, so checked items and linked tasks still match).
      const mine = {id:uid(), name:'My client cycle', color:'#E8A23D', finishStage:'active', steps: path.map(function(s){
        return {id:s.id, label:s.label, color:s.color, checklist: s.checklist.map(function(it){ return {id:it.id, text:it.text, type:it.type||'task', link:it.link||''}; })};
      })};
      crmD.cycles.unshift(mine);
      b.clients.forEach(function(c){ if(path.some(function(s){ return s.id===c.stage; })){ c.cycleId = mine.id; c.cycleStepId = c.stage; } });
    }
    crmD.defaultCycleId = crmD.cycles[0].id;
  }
  crmD.cycles.forEach(function(cy){
    cy.steps = arr(cy.steps);
    cy.steps.forEach(function(st){ st.checklist = arr(st.checklist); st.checklist.forEach(function(it){ if(!it.type) it.type='task'; if(it.link==null) it.link=''; }); });
    if(cy.finishStage===undefined) cy.finishStage = 'active';
  });
  if(!crmD.cycles.some(function(cy){ return cy.id===crmD.defaultCycleId; })) crmD.defaultCycleId = crmD.cycles.length ? crmD.cycles[0].id : null;
  crmD.lifecycleSeeded = true;
  b.clients.forEach(function(c){
    if(!c.lifecycle || typeof c.lifecycle!=='object') c.lifecycle = {};
    ensureLifecycle(c);
    if(c.cycleId===undefined){
      // Clients still onboarding start the default cycle; established clients can pick one.
      c.cycleId = (c.stage==='onboarding' && crmD.defaultCycleId) ? crmD.defaultCycleId : null;
      c.cycleStepId = null;
    }
    const cy = c.cycleId ? crmD.cycles.find(function(x){ return x.id===c.cycleId; }) : null;
    if(c.cycleId && !cy){ c.cycleId = null; c.cycleStepId = null; }
    if(cy && !cy.steps.some(function(s){ return s.id===c.cycleStepId; })) c.cycleStepId = cy.steps.length ? cy.steps[0].id : null;
    if(c.cycleDone===undefined) c.cycleDone = false;
  });
}
// Clients created before this loaded (or through older paths) may lack the progress object.
function ensureLifecycle(c){
  if(!c.lifecycle || typeof c.lifecycle!=='object') c.lifecycle = {};
  ['checks','enteredAt','events','links','lastStep'].forEach(function(k){ if(!c.lifecycle[k] || typeof c.lifecycle[k]!=='object') c.lifecycle[k] = {}; });
  return c.lifecycle;
}
function cycles(){ return arr(crm().cycles); }
function cycleById(id){ return cycles().find(function(c){ return c.id===id; }) || null; }
function clientCycle(c){ return c && c.cycleId ? cycleById(c.cycleId) : null; }
function clientStep(c){ const cy = clientCycle(c); return cy ? (cy.steps.find(function(s){ return s.id===c.cycleStepId; }) || null) : null; }
function lcRef(c, st, it){ return c.id+':'+st.id+':'+it.id; }
function lcItemDone(c, st, it){
  if(arr(c.lifecycle && c.lifecycle.checks && c.lifecycle.checks[st.id]).indexOf(it.id)>=0) return true;
  const ref = lcRef(c, st, it);
  return state.tasks.items.some(function(t){ return t.lifecycleRef===ref && t.status==='done'; });
}
function lcProgress(c){
  const st = clientStep(c);
  const items = st ? st.checklist : [];
  const done = st ? items.filter(function(it){ return lcItemDone(c, st, it); }).length : 0;
  return {step:st, total:items.length, done:done};
}
function cycleStepIndex(c){ const cy = clientCycle(c); return cy ? cy.steps.findIndex(function(s){ return s.id===c.cycleStepId; }) : -1; }
function setClientStep(c, stepId, opts){
  ensureLifecycle(c);
  const cy = clientCycle(c); if(!cy) return;
  const st = cy.steps.find(function(s){ return s.id===stepId; }); if(!st) return;
  const from = clientStep(c);
  c.cycleStepId = st.id; c.cycleDone = false;
  c.lifecycle.enteredAt[st.id] = Date.now();
  c.lifecycle.lastStep[cy.id] = st.id;
  crmTimeline(c, 'stage', cy.name+': '+(from?from.label:'—')+' → '+st.label);
  if(!(opts && opts.quiet)) playTick();
}
function assignCycle(c, cycleId){
  ensureLifecycle(c);
  if(c.cycleId && c.cycleStepId) c.lifecycle.lastStep[c.cycleId] = c.cycleStepId;
  const cy = cycleById(cycleId);
  c.cycleId = cy ? cy.id : null;
  // Switching back to a cycle resumes where the client left off.
  const resume = cy && c.lifecycle.lastStep[cy.id];
  c.cycleStepId = cy && cy.steps.length ? (cy.steps.some(function(s){ return s.id===resume; }) ? resume : cy.steps[0].id) : null;
  c.cycleDone = false;
  if(cy && c.cycleStepId) c.lifecycle.enteredAt[c.cycleStepId] = Date.now();
  crmTimeline(c, 'stage', cy ? 'Started cycle: '+cy.name : 'Cycle removed');
}
function finishCycle(c){
  const cy = clientCycle(c); if(!cy) return;
  c.cycleDone = true;
  crmTimeline(c, 'stage', 'Finished cycle: '+cy.name);
  if(cy.finishStage && c.stage==='onboarding' && crmStage('client', cy.finishStage)) setStage('client', c.id, cy.finishStage);
  playSessionComplete();
  showToast(crmName('client', c)+' finished '+cy.name, {icon:'&#127881;'});
}
// ---- client view ----
function lcItemHtml(c, st, it, compact){
  ensureLifecycle(c);
  const done = lcItemDone(c, st, it);
  const ty = lcType(it.type);
  const ref = lcRef(c, st, it);
  const evId = c.lifecycle.events && c.lifecycle.events[ref];
  const ev = evId ? state.calendar.events.find(function(e){ return e.id===evId; }) : null;
  const link = (c.lifecycle.links && c.lifecycle.links[ref]) || it.link;
  const linkedTask = state.tasks.items.find(function(t){ return t.lifecycleRef===ref && t.status!=='done'; });
  let actions = '';
  if(!compact && !done){
    if(it.type==='meeting') actions += ev ? '<span class="lc-meta">&#128197; '+fmtDateShort(ev.date)+(ev.time?' '+fmt12Hour(ev.time):'')+'</span><button class="mini-move" data-action="lcOpenEvent" data-id="'+ev.id+'">Edit</button>'
                                          : '<button class="mini-move mini-move-today" data-action="lcSchedule" data-ref="'+ref+'">Schedule</button>';
    if(link) actions += '<button class="mini-move" data-action="lcOpenLink" data-url="'+escapeHtml(link)+'">Open</button><button class="mini-move mini-move-today" data-action="lcCopyLink" data-url="'+escapeHtml(link)+'">Copy link</button>';
    else if(it.type==='form' || it.type==='video' || it.type==='doc' || it.type==='link') actions += '<button class="mini-move" data-action="openLifecycleEditor" data-cycle="'+c.cycleId+'" title="Save the link on this item once and it shows up for every client">+ add link</button>';
    if(linkedTask) actions += '<span class="tag tag-ongoing">in tasks</span>';
  }
  return '<div class="lc-item'+(done?' is-done':'')+'" data-key="lci-'+it.id+'">'+
    '<input type="checkbox" data-lc-check="'+ref+'" '+(done?'checked':'')+' aria-label="Done">'+
    '<span class="lc-type" title="'+ty.label+'">'+ty.icon+'</span>'+
    '<span class="lc-text">'+escapeHtml(it.text)+'</span>'+
    (actions ? '<span class="lc-actions">'+actions+'</span>' : '')+
  '</div>';
}
function renderClientLifecycle(c){
  ensureLifecycle(c);
  const cy = clientCycle(c);
  const picker = '<select class="input input-sm lc-cycle-select" data-cycle-assign="'+c.id+'" title="Which cycle this client follows">'+
    '<option value="">No cycle</option>'+cycles().map(function(x){ return '<option value="'+x.id+'" '+(c.cycleId===x.id?'selected':'')+'>'+escapeHtml(x.name)+'</option>'; }).join('')+'</select>';
  const head = '<div class="row" style="justify-content:space-between;align-items:center;gap:8px;margin-bottom:10px;">'+
      '<div class="row" style="gap:8px;align-items:center;"><div class="kind-label" style="margin:0;">Client cycle'+tip('The playbook this client follows — you\'ll see each step\'s calls, forms and videos as you go.')+'</div>'+picker+'</div>'+
      '<button class="mini-move" data-action="openLifecycleEditor" data-cycle="'+(c.cycleId||'')+'">&#9881; Edit cycles</button>'+
    '</div>';
  if(!cy){
    return '<div class="lc-card">'+head+
      '<div class="row" style="gap:6px;">'+cycles().map(function(x){ return '<button class="btn btn-sm lc-start-btn" style="--lc:'+x.color+'" data-action="lcStartCycle" data-id="'+c.id+'" data-cycle="'+x.id+'">Start '+escapeHtml(x.name)+'</button>'; }).join('')+
      (cycles().length ? '' : '<button class="btn btn-primary btn-sm" data-action="openLifecycleEditor">Create your first cycle</button>')+'</div>'+
    '</div>';
  }
  const idx = cycleStepIndex(c);
  const st = clientStep(c);
  const prog = lcProgress(c);
  const isLast = idx===cy.steps.length-1;
  const next = idx>=0 && !isLast ? cy.steps[idx+1] : null;
  const prev = idx>0 ? cy.steps[idx-1] : null;
  const entered = st && c.lifecycle.enteredAt[st.id];
  const days = entered ? Math.max(0, Math.floor((Date.now()-entered)/86400000)) : null;
  const allDone = prog.total>0 && prog.done===prog.total;
  return '<div class="lc-card" style="--cy:'+cy.color+'">'+head+
    '<div class="lc-track">'+cy.steps.map(function(s, i){
      const cls = c.cycleDone || i<idx ? 'is-past' : i===idx ? 'is-current' : '';
      return (i ? '<span class="lc-arrow">&rarr;</span>' : '')+
        '<button class="lc-step '+cls+'" data-action="lcGoStep" data-id="'+c.id+'" data-step="'+s.id+'" title="Move to '+escapeHtml(s.label)+'" style="--lc:'+s.color+'">'+((c.cycleDone || i<idx)?'&#10003; ':'')+escapeHtml(s.label)+'</button>';
    }).join('')+(c.cycleDone ? '<span class="lc-arrow">&rarr;</span><span class="lc-step is-done-all">&#127881; Done</span>' : '')+'</div>'+
    (c.cycleDone ? '<div class="lc-now"><div class="kpi-sub">Cycle finished. <span class="mini-move" data-action="lcGoStep" data-id="'+c.id+'" data-step="'+cy.steps[cy.steps.length-1].id+'">Reopen last step</span></div></div>' : (st ? '<div class="lc-now">'+
      '<div class="row" style="justify-content:space-between;align-items:baseline;">'+
        '<div><span class="lc-now-title" style="color:'+st.color+'">'+escapeHtml(st.label)+'</span><span class="kpi-sub" style="margin-left:8px;">step '+(idx+1)+' of '+cy.steps.length+(prog.total?' &middot; '+prog.done+' / '+prog.total+' done':'')+'</span></div>'+
        (days!=null ? '<span class="kpi-sub">'+(days===0?'started today':days+' day'+(days===1?'':'s')+' in this step')+'</span>' : '')+
      '</div>'+
      (prog.total ? '<div class="progress" style="margin:8px 0 10px;"><div class="progress-bar'+(allDone?' good':'')+'" style="width:'+Math.round(prog.done/prog.total*100)+'%"></div></div>' : '')+
      (prog.total ? '<div class="lc-checklist">'+st.checklist.map(function(it){ return lcItemHtml(c, st, it, false); }).join('')+'</div>'
        : '<div class="kpi-sub">Nothing on this step yet — <span class="mini-move mini-move-today" data-action="openLifecycleEditor" data-cycle="'+cy.id+'">add items</span>.</div>')+
      '<div class="row" style="justify-content:space-between;margin-top:12px;gap:8px;">'+
        '<div class="row" style="gap:6px;">'+
          (prev ? '<button class="btn btn-ghost btn-sm" data-action="lcGoStep" data-id="'+c.id+'" data-step="'+prev.id+'">&larr; '+escapeHtml(prev.label)+'</button>' : '')+
          (prog.total && prog.done<prog.total ? '<button class="btn btn-ghost btn-sm" data-action="lcToTasks" data-id="'+c.id+'" title="Add the unchecked items to your task list">Add to my tasks</button>' : '')+
        '</div>'+
        (next ? '<button class="btn btn-sm '+(allDone?'btn-good lc-next-ready':'')+'" data-action="lcGoStep" data-id="'+c.id+'" data-step="'+next.id+'">Next: '+escapeHtml(next.label)+' &rarr;</button>'
              : '<button class="btn btn-sm '+(allDone?'btn-good lc-next-ready':'')+'" data-action="lcFinish" data-id="'+c.id+'">Finish cycle &#10003;</button>')+
      '</div>'+
    '</div>' : ''))+
  '</div>';
}
document.addEventListener('change', function(e){
  const t = e.target; if(!t || !t.dataset) return;
  if(t.dataset.cycleAssign){
    const c = crmFind('client', t.dataset.cycleAssign); if(!c) return;
    assignCycle(c, t.value); persist('business'); renderView(); rerenderContactModal();
    return;
  }
  if(!t.dataset.lcCheck) return;
  const p = t.dataset.lcCheck.split(':');
  const c = crmFind('client', p[0]); if(!c) return;
  ensureLifecycle(c);
  const list = c.lifecycle.checks[p[1]] || (c.lifecycle.checks[p[1]] = []);
  const i = list.indexOf(p[2]);
  if(t.checked && i<0) list.push(p[2]);
  if(!t.checked && i>=0) list.splice(i,1);
  if(!t.checked){ const tk = state.tasks.items.find(function(x){ return x.lifecycleRef===t.dataset.lcCheck && x.status==='done'; }); if(tk){ tk.status='backlog'; tk.completedAt=null; persist('tasks'); } }
  const prog = lcProgress(c);
  if(t.checked && prog.step && p[1]===prog.step.id && prog.total && prog.done===prog.total){
    playSessionComplete();
    const idx = cycleStepIndex(c), cy = clientCycle(c);
    const nx = cy && idx>=0 && idx<cy.steps.length-1 ? cy.steps[idx+1] : null;
    showToast(crmName('client',c)+': '+prog.step.label+' done'+(nx?' — next up: '+nx.label:' — finish the cycle'), {icon:'&#9989;'});
  } else if(t.checked) playTick();
  persist('business'); renderView(); rerenderContactModal();
});
ACTIONS.lcStartCycle = function(el){ const c = crmFind('client', el.dataset.id); if(!c) return; assignCycle(c, el.dataset.cycle); playPositive(); persist('business'); renderView(); rerenderContactModal(); };
ACTIONS.lcGoStep = function(el){ const c = crmFind('client', el.dataset.id); if(!c) return; setClientStep(c, el.dataset.step); persist('business'); renderView(); rerenderContactModal(); };
ACTIONS.lcFinish = function(el){ const c = crmFind('client', el.dataset.id); if(!c) return; finishCycle(c); persist('business'); renderView(); rerenderContactModal(); };
ACTIONS.lcOpenLink = function(el){ const u = el.dataset.url; if(u) window.open(safariizeUrl(/^[a-z]+:\/\//i.test(u)?u:'https://'+u), '_blank'); };
ACTIONS.lcCopyLink = function(el){
  const u = el.dataset.url; if(!u) return;
  // Synchronous copy inside the click is the most reliable; the async clipboard API is only
  // a backup (it can wait on a permission prompt and never confirm).
  if(!fallbackCopy(u)){ try{ navigator.clipboard.writeText(u); }catch(err){} }
  showToast('Link copied — paste it to your client', {icon:'&#128203;', duration:2200});
};
function fallbackCopy(text){
  const ta = document.createElement('textarea'); ta.value = text; ta.setAttribute('readonly',''); ta.style.position='fixed'; ta.style.opacity='0';
  document.body.appendChild(ta); ta.select();
  let ok = false; try{ ok = document.execCommand('copy'); }catch(e){}
  ta.remove(); return ok;
}
// "Schedule" on a meeting item: opens the event editor pre-filled for this client.
ACTIONS.lcSchedule = function(el){
  const ref = el.dataset.ref; const p = ref.split(':');
  const c = crmFind('client', p[0]); const cy = clientCycle(c); if(!c || !cy) return;
  const st = cy.steps.find(function(s){ return s.id===p[1]; }); const it = st && st.checklist.find(function(x){ return x.id===p[2]; }); if(!it) return;
  ui.lcScheduleRef = ref;
  openCalEventModal();
  const title = document.getElementById('calEventTitle'); if(title) title.value = it.text+' — '+crmName('client', c);
  const linked = document.getElementById('calEventLinkedClient'); if(linked) linked.value = c.id;
  const call = arr(state.calendar.categories).find(function(x){ return x.id==='call'; }); const cat = document.getElementById('calEventCategory'); if(call && cat) cat.value = call.id;
  const date = document.getElementById('calEventDate'); if(date) date.focus();
};
ACTIONS.lcOpenEvent = function(el){ openCalEventModal(el.dataset.id); };
// called by saveCalEvent
function onCalEventSaved(ev){
  if(!ui.lcScheduleRef) return;
  const p = ui.lcScheduleRef.split(':');
  const c = crmFind('client', p[0]);
  if(c){ ensureLifecycle(c).events[ui.lcScheduleRef] = ev.id; crmTimeline(c, 'note', 'Scheduled: '+ev.title+' ('+fmtDateShort(ev.date)+(ev.time?' '+fmt12Hour(ev.time):'')+')'); persist('business'); }
  ui.lcScheduleRef = null;
}
ACTIONS.lcToTasks = function(el){
  const c = crmFind('client', el.dataset.id); if(!c) return;
  const st = clientStep(c); if(!st) return;
  let added = 0;
  st.checklist.forEach(function(it){
    const ref = lcRef(c, st, it);
    if(lcItemDone(c, st, it) || state.tasks.items.some(function(t){ return t.lifecycleRef===ref; })) return;
    const link = (c.lifecycle.links && c.lifecycle.links[ref]) || it.link;
    state.tasks.items.push({id:uid(), title:it.text+' — '+crmName('client',c), client:c.id, clients:[c.id], priority:'med', deadline:null, notes:st.label+' step for '+crmName('client',c)+(link?'\n'+link:''), status:'backlog', createdAt:todayStr(), completedAt:null, lifecycleRef:ref});
    added++;
  });
  if(added){ playTaskAdded(); showToast(added+' item'+(added===1?'':'s')+' added to your backlog', {icon:'&#9745;'}); }
  persist('tasks'); renderView(); rerenderContactModal();
};
// Card / list badge: step name + progress
function lcBadgeHtml(c){
  const cy = clientCycle(c); if(!cy) return '';
  if(c.cycleDone) return '<div class="lc-badge"><span class="kpi-sub">&#10003; '+escapeHtml(cy.name)+' done</span></div>';
  const p = lcProgress(c); if(!p.step) return '';
  return '<div class="lc-badge" title="'+escapeHtml(cy.name)+'"><span class="lc-badge-step" style="color:'+p.step.color+'">'+escapeHtml(p.step.label)+'</span>'+
    (p.total ? '<span class="lc-badge-bar"><span style="width:'+Math.round(p.done/p.total*100)+'%;background:'+p.step.color+'"></span></span><span class="kpi-sub">'+p.done+'/'+p.total+'</span>' : '')+'</div>';
}
// ---- "Client next steps" on Today ----
function renderClientStepsPanel(){
  const rows = [];
  crmList('client').forEach(function(c){
    if(!clientStageActive(c.stage) || c.cycleDone) return;
    const st = clientStep(c); if(!st) return;
    const open = st.checklist.filter(function(it){ return !lcItemDone(c, st, it); });
    if(open.length) rows.push({c:c, st:st, cy:clientCycle(c), open:open});
  });
  if(!rows.length) return '';
  return '<div class="section"><div class="section-title">Client Next Steps'+tip('Pulled from your client cycles.')+'<span class="view-all-link" data-action="openLifecycleEditor">Edit cycles</span></div>'+
    '<div class="lc-steps-grid">'+rows.map(function(r){
      return '<div class="card lc-steps-card" data-key="lcs-'+r.c.id+'">'+
        '<div class="row" style="justify-content:space-between;align-items:center;margin-bottom:6px;gap:6px;">'+
          '<span class="task-card-title" style="font-size:14px;cursor:pointer;" data-action="openContact" data-kind="client" data-id="'+r.c.id+'">'+escapeHtml(crmName('client', r.c))+'</span>'+
          '<span class="tag" style="background:'+r.st.color+'22;color:'+r.st.color+';" title="'+escapeHtml(r.cy.name)+'">'+escapeHtml(r.st.label)+'</span>'+
        '</div>'+
        r.open.slice(0,3).map(function(it){ return lcItemHtml(r.c, r.st, it, true); }).join('')+
        (r.open.length>3 ? '<div class="kpi-sub" style="margin-top:2px;cursor:pointer;" data-action="openContact" data-kind="client" data-id="'+r.c.id+'">+'+(r.open.length-3)+' more</div>' : '')+
      '</div>';
    }).join('')+'</div></div>';
}
// ---- board grouped by cycle step ----
function renderCycleBoard(){
  const f = crmUi('client');
  const cy = cycleById(f.cycleId) || cycles()[0];
  if(!cy) return '<div class="empty">No cycles yet — <span class="mini-move mini-move-today" data-action="openLifecycleEditor">create one</span>.</div>';
  const list = crmFiltered('client').filter(function(c){ return c.cycleId===cy.id; });
  const cols = cy.steps.map(function(s){ return {id:s.id, label:s.label, color:s.color, items:list.filter(function(c){ return !c.cycleDone && c.cycleStepId===s.id; })}; })
    .concat([{id:'__done', label:'Done', color:'#3FBE8E', items:list.filter(function(c){ return c.cycleDone; }), closed:true}]);
  return '<div class="crm-board">'+cols.map(function(col){
    return '<div class="crm-col'+(col.closed?' is-closed':'')+'" data-cycle-drop="'+cy.id+':'+col.id+'" data-key="cyc-'+col.id+'">'+
      '<div class="crm-col-head"><span class="crm-col-dot" style="background:'+col.color+'"></span><span class="crm-col-title">'+escapeHtml(col.label)+'</span><span class="crm-col-count">'+col.items.length+'</span></div>'+
      '<div class="crm-col-body">'+col.items.map(function(c){ return crmCard('client', c); }).join('')+(!col.items.length?'<div class="crm-col-empty">Drop here</div>':'')+'</div>'+
    '</div>';
  }).join('')+'</div>';
}
function cycleGroupBar(){
  const f = crmUi('client');
  if(f.group!=='cycle') return '';
  const cy = cycleById(f.cycleId) || cycles()[0];
  const notIn = crmList('client').filter(function(c){ return clientStageActive(c.stage) && (!cy || c.cycleId!==cy.id); }).length;
  return '<div class="row" style="gap:8px;margin:-4px 0 12px;align-items:center;">'+
    '<span class="kpi-sub">Cycle:</span><select class="input input-sm" data-cycle-board>'+cycles().map(function(x){ return '<option value="'+x.id+'" '+(cy && cy.id===x.id?'selected':'')+'>'+escapeHtml(x.name)+'</option>'; }).join('')+'</select>'+
    (notIn ? '<span class="kpi-sub">'+notIn+' active client'+(notIn===1?' isn\'t':'s aren\'t')+' in this cycle</span>'+tip('Assign a cycle from the client\'s page.') : '')+
  '</div>';
}
document.addEventListener('change', function(e){ const t = e.target; if(t && t.dataset && t.dataset.cycleBoard!==undefined){ crmUi('client').cycleId = t.value; renderView(); } });
ACTIONS.crmGroup = function(el, e, id){ crmUi('client').group = id; renderView(); };
document.addEventListener('dragover', function(e){
  const col = e.target.closest && e.target.closest('[data-cycle-drop]');
  if(!col || !e.dataTransfer || Array.prototype.indexOf.call(e.dataTransfer.types,'text/x-crm')<0) return;
  e.preventDefault(); col.classList.add('drop-over');
});
document.addEventListener('drop', function(e){
  const col = e.target.closest && e.target.closest('[data-cycle-drop]'); if(!col) return;
  const data = e.dataTransfer.getData('text/x-crm'); if(!data) return;
  e.preventDefault(); col.classList.remove('drop-over');
  const src = data.split(':'); if(src[0]!=='client') return;
  const c = crmFind('client', src[1]); if(!c) return;
  const dst = col.dataset.cycleDrop.split(':');
  if(c.cycleId!==dst[0]) assignCycle(c, dst[0]);
  if(dst[1]==='__done') finishCycle(c); else setClientStep(c, dst[1]);
  persist('business'); renderView();
});
// ---- cycle editor ----
function openLifecycleEditor(cycleId){
  if(cycleId && cycleById(cycleId)) ui.editingCycleId = cycleId;
  if(!cycleById(ui.editingCycleId)) ui.editingCycleId = (cycles()[0]||{}).id || null;
  showOverlay('lifecycleOverlay'); renderLifecycleEditorInto();
}
ACTIONS.openLifecycleEditor = function(el){ openLifecycleEditor(el && el.dataset && el.dataset.cycle); };
ACTIONS.closeLifecycleEditor = function(){ hideOverlay('lifecycleOverlay'); renderView(); };
function renderLifecycleEditor(){
  const all = cycles();
  const cy = cycleById(ui.editingCycleId);
  const usage = {}; crmList('client').forEach(function(c){ if(c.cycleId) usage[c.cycleId] = (usage[c.cycleId]||0)+1; });
  const stepCount = {}; crmList('client').forEach(function(c){ if(c.cycleStepId && !c.cycleDone) stepCount[c.cycleStepId] = (stepCount[c.cycleStepId]||0)+1; });
  return '<div class="section-title" style="margin-bottom:14px;">Client cycles'+tip('Build a playbook for each kind of client. Every step lists what to do — calls to book, forms and videos to send, to-dos. Save a link on an item once and it\'s ready to copy for every client.')+'</div>'+
    '<div class="cy-tabs">'+all.map(function(x){ return '<button class="cy-tab'+(cy && x.id===cy.id?' active':'')+'" data-action="cyPick" data-id="'+x.id+'" style="--cy:'+x.color+'"><span class="crm-col-dot" style="background:'+x.color+'"></span>'+escapeHtml(x.name)+'<span class="kpi-sub">'+(usage[x.id]||0)+'</span></button>'; }).join('')+
      '<button class="cy-tab cy-tab-add" data-action="cyNew">+ New cycle</button></div>'+
    (!cy ? '<div class="empty">No cycles yet.</div>' :
    '<div class="cy-head">'+
      '<span class="swatch" style="background:'+cy.color+';width:18px;height:18px;flex-shrink:0;" data-action="cyColor" data-id="'+cy.id+'" title="Change color"></span>'+
      '<input class="input cy-name" data-cy-name="'+cy.id+'" value="'+escapeHtml(cy.name)+'">'+
      (crm().defaultCycleId===cy.id ? '<span class="tag tag-good">Default for new clients</span>' : '<button class="mini-move" data-action="cyDefault" data-id="'+cy.id+'">Make default</button>')+
      '<span style="flex:1"></span>'+
      '<button class="mini-move" data-action="cyDuplicate" data-id="'+cy.id+'">Duplicate</button>'+
      '<button class="mini-move mini-move-danger" data-action="cyDelete" data-id="'+cy.id+'">Delete</button>'+
    '</div>'+
    '<div class="lc-editor">'+cy.steps.map(function(s, i){
      return (i ? '<div class="lc-editor-arrow">&darr;</div>' : '')+
      '<div class="lc-editor-step" data-key="lce-'+s.id+'">'+
        '<div class="row" style="gap:8px;align-items:center;">'+
          '<span class="lc-step-num" style="background:'+s.color+'">'+(i+1)+'</span>'+
          '<input class="input lc-step-name" data-cy-step-name="'+cy.id+':'+s.id+'" value="'+escapeHtml(s.label)+'">'+
          '<span class="swatch" style="background:'+s.color+';width:14px;height:14px;flex-shrink:0;" data-action="cyStepColor" data-id="'+cy.id+'" data-step="'+s.id+'" title="Change color"></span>'+
          '<span class="kpi-sub" style="white-space:nowrap;">'+(stepCount[s.id]||0)+' here</span>'+
          '<span style="flex:1"></span>'+
          '<button class="btn btn-ghost btn-sm" data-action="cyStepMove" data-id="'+cy.id+'" data-step="'+s.id+'" data-dir="-1" '+(i===0?'disabled':'')+'>&uarr;</button>'+
          '<button class="btn btn-ghost btn-sm" data-action="cyStepMove" data-id="'+cy.id+'" data-step="'+s.id+'" data-dir="1" '+(i===cy.steps.length-1?'disabled':'')+'>&darr;</button>'+
          '<button class="btn btn-ghost btn-sm mini-move-danger" data-action="cyStepRemove" data-id="'+cy.id+'" data-step="'+s.id+'" title="Remove step">&#10005;</button>'+
        '</div>'+
        '<div class="lc-editor-items">'+s.checklist.map(function(it, j){
          const needsLink = it.type!=='task' && it.type!=='meeting';
          return '<div class="lc-editor-item" data-key="lcei-'+it.id+'">'+
            '<select class="input input-sm lc-type-select" data-cy-item-type="'+cy.id+':'+s.id+':'+it.id+'" title="Type">'+LC_ITEM_TYPES.map(function(t){ return '<option value="'+t.id+'" '+(it.type===t.id?'selected':'')+'>'+t.label+'</option>'; }).join('')+'</select>'+
            '<input class="input input-sm" data-cy-item-text="'+cy.id+':'+s.id+':'+it.id+'" value="'+escapeHtml(it.text)+'" style="flex:1.4;">'+
            (needsLink || it.link ? '<input class="input input-sm" data-cy-item-link="'+cy.id+':'+s.id+':'+it.id+'" value="'+escapeHtml(it.link||'')+'" placeholder="Link to '+(it.type==='form'?'the form':it.type==='video'?'the video(s)':it.type==='doc'?'the document':'it')+'" style="flex:1;">' : '<span style="flex:1;"></span>')+
            '<button class="mini-move" data-action="cyItemMove" data-id="'+cy.id+'" data-step="'+s.id+'" data-item="'+it.id+'" data-dir="-1" '+(j===0?'disabled':'')+'>&uarr;</button>'+
            '<button class="mini-move" data-action="cyItemMove" data-id="'+cy.id+'" data-step="'+s.id+'" data-item="'+it.id+'" data-dir="1" '+(j===s.checklist.length-1?'disabled':'')+'>&darr;</button>'+
            '<button class="mini-move mini-move-danger" data-action="cyItemRemove" data-id="'+cy.id+'" data-step="'+s.id+'" data-item="'+it.id+'">&#10005;</button>'+
          '</div>';
        }).join('')+
          '<div class="lc-editor-item">'+
            '<select class="input input-sm lc-type-select" id="cyNewType-'+s.id+'">'+LC_ITEM_TYPES.map(function(t){ return '<option value="'+t.id+'">'+t.label+'</option>'; }).join('')+'</select>'+
            '<input class="input input-sm" id="cyNewItem-'+s.id+'" data-cy-new-item="'+cy.id+':'+s.id+'" placeholder="Add an item, e.g. Send onboarding videos (Enter)" style="flex:2.4;">'+
            '<button class="btn btn-sm" data-action="cyItemAdd" data-id="'+cy.id+'" data-step="'+s.id+'">Add</button>'+
          '</div>'+
        '</div>'+
      '</div>';
    }).join('')+'</div>'+
    '<div class="row" style="margin-top:14px;gap:8px;"><input class="input" id="cyNewStep" placeholder="New step, e.g. Kick-off" style="flex:1;"><button class="btn btn-primary btn-sm" data-action="cyStepAdd" data-id="'+cy.id+'">+ Add step</button></div>'+
    '<div class="row kpi-sub" style="margin-top:10px;gap:6px;align-items:center;">When a client finishes this cycle, move Onboarding clients to'+
      '<select class="input input-sm" data-cy-finish="'+cy.id+'"><option value="">— leave status as is</option>'+crmStages('client').map(function(s){ return '<option value="'+s.id+'" '+(cy.finishStage===s.id?'selected':'')+'>'+escapeHtml(s.label)+'</option>'; }).join('')+'</select></div>')+
    '<div class="row" style="margin-top:18px;justify-content:flex-end;"><button class="btn btn-primary" data-action="closeLifecycleEditor">Done</button></div>';
}
function renderLifecycleEditorInto(){ const el=document.getElementById('lifecycleContent'); if(el) morphInto(el, renderLifecycleEditor(), {form:true}); }
registerModal('lifecycleOverlay', renderLifecycleEditorInto);
function cyFind(id){ return cycleById(id); }
function cyStepFind(cy, stepId){ return cy ? cy.steps.find(function(s){ return s.id===stepId; }) : null; }
function cySave(){ persist('business'); renderView(); }
ACTIONS.cyPick = function(el, e, id){ ui.editingCycleId = id; renderLifecycleEditorInto(); };
ACTIONS.cyNew = function(){
  const cy = {id:uid(), name:'New cycle', color:SWATCHES[cycles().length % SWATCHES.length], finishStage:'active', steps:[lcStep('Onboarding','#8fdcff',[lcItem('Onboarding call / meeting','meeting')])]};
  crm().cycles.push(cy); ui.editingCycleId = cy.id;
  if(!crm().defaultCycleId) crm().defaultCycleId = cy.id;
  cySave();
  setTimeout(function(){ const n = document.querySelector('[data-cy-name="'+cy.id+'"]'); if(n){ n.focus(); n.select(); } }, 0);
};
ACTIONS.cyDuplicate = function(el, e, id){
  const src = cyFind(id); if(!src) return;
  const copy = JSON.parse(JSON.stringify(src));
  copy.id = uid(); copy.name = src.name+' (copy)';
  copy.steps.forEach(function(s){ s.id = uid(); s.checklist.forEach(function(it){ it.id = uid(); }); });
  crm().cycles.push(copy); ui.editingCycleId = copy.id; cySave();
};
let lastDeletedCycle = null;
ACTIONS.cyDelete = function(el, e, id){
  const idx = crm().cycles.findIndex(function(c){ return c.id===id; }); if(idx<0) return;
  const cy = crm().cycles[idx];
  const wasDefault = crm().defaultCycleId===id;
  const affected = crmList('client').filter(function(c){ return c.cycleId===id; }).map(function(c){ return {id:c.id, step:c.cycleStepId, done:c.cycleDone}; });
  crm().cycles.splice(idx,1);
  crmList('client').forEach(function(c){ if(c.cycleId===id){ c.cycleId = null; c.cycleStepId = null; c.cycleDone = false; } });
  if(crm().defaultCycleId===id) crm().defaultCycleId = crm().cycles.length ? crm().cycles[0].id : null;
  lastDeletedCycle = {cycle:cy, index:idx, affected:affected, wasDefault:wasDefault};
  ui.editingCycleId = crm().cycles.length ? crm().cycles[0].id : null;
  cySave();
  showToast('Deleted cycle “'+cy.name+'”'+(affected.length?' ('+affected.length+' client'+(affected.length===1?'':'s')+' unassigned)':''), {icon:'&#128465;', actionLabel:'Undo', actionAction:'undoDeleteCycle', duration:8000});
};
ACTIONS.undoDeleteCycle = function(){
  const d = lastDeletedCycle; if(!d) return;
  crm().cycles.splice(Math.min(d.index, crm().cycles.length), 0, d.cycle);
  d.affected.forEach(function(a){ const c = crmFind('client', a.id); if(c){ c.cycleId = d.cycle.id; c.cycleStepId = a.step; c.cycleDone = a.done; } });
  if(d.wasDefault) crm().defaultCycleId = d.cycle.id;
  ui.editingCycleId = d.cycle.id;
  lastDeletedCycle = null;
  const t = document.getElementById('toastContainer'); if(t) t.innerHTML='';
  cySave();
};
ACTIONS.cyDefault = function(el, e, id){ crm().defaultCycleId = id; cySave(); };
ACTIONS.cyColor = function(el, e, id){ const cy = cyFind(id); if(!cy) return; const i = SWATCHES.indexOf(cy.color); cy.color = SWATCHES[(i+1)%SWATCHES.length]; cySave(); };
ACTIONS.cyStepColor = function(el){ const st = cyStepFind(cyFind(el.dataset.id), el.dataset.step); if(!st) return; const i = SWATCHES.indexOf(st.color); st.color = SWATCHES[(i+1)%SWATCHES.length]; cySave(); };
ACTIONS.cyStepAdd = function(el){
  const cy = cyFind(el.dataset.id); if(!cy) return;
  const inp = document.getElementById('cyNewStep'); const label = inp ? inp.value.trim() : ''; if(!label) return;
  cy.steps.push(lcStep(label, SWATCHES[cy.steps.length % SWATCHES.length], []));
  inp.value = ''; cySave();
};
ACTIONS.cyStepMove = function(el){
  const cy = cyFind(el.dataset.id); if(!cy) return;
  const i = cy.steps.findIndex(function(s){ return s.id===el.dataset.step; }); const j = i+Number(el.dataset.dir);
  if(i<0 || j<0 || j>=cy.steps.length) return;
  const t = cy.steps[i]; cy.steps[i] = cy.steps[j]; cy.steps[j] = t; cySave();
};
ACTIONS.cyStepRemove = function(el){
  const cy = cyFind(el.dataset.id); if(!cy || cy.steps.length<=1) { showToast('A cycle needs at least one step.', {icon:'&#9888;'}); return; }
  const i = cy.steps.findIndex(function(s){ return s.id===el.dataset.step; }); if(i<0) return;
  const fallback = cy.steps[i+1] || cy.steps[i-1];
  cy.steps.splice(i,1);
  crmList('client').forEach(function(c){ if(c.cycleId===cy.id && c.cycleStepId===el.dataset.step) c.cycleStepId = fallback.id; });
  cySave();
};
ACTIONS.cyItemAdd = function(el){
  const cy = cyFind(el.dataset.id); const st = cyStepFind(cy, el.dataset.step); if(!st) return;
  const inp = document.getElementById('cyNewItem-'+st.id); const text = inp ? inp.value.trim() : ''; if(!text) return;
  const typeEl = document.getElementById('cyNewType-'+st.id);
  st.checklist.push(lcItem(text, typeEl ? typeEl.value : 'task'));
  inp.value = ''; cySave();
  const again = document.getElementById('cyNewItem-'+st.id); if(again) again.focus();
};
ACTIONS.cyItemRemove = function(el){
  const st = cyStepFind(cyFind(el.dataset.id), el.dataset.step); if(!st) return;
  st.checklist = st.checklist.filter(function(it){ return it.id!==el.dataset.item; }); cySave();
};
ACTIONS.cyItemMove = function(el){
  const st = cyStepFind(cyFind(el.dataset.id), el.dataset.step); if(!st) return;
  const list = st.checklist; const i = list.findIndex(function(it){ return it.id===el.dataset.item; }); const j = i+Number(el.dataset.dir);
  if(i<0 || j<0 || j>=list.length) return;
  const t = list[i]; list[i] = list[j]; list[j] = t; cySave();
};
document.addEventListener('change', function(e){
  const t = e.target; if(!t || !t.dataset) return;
  const ds = t.dataset;
  if(ds.cyName){ const cy = cyFind(ds.cyName); if(cy && t.value.trim()){ cy.name = t.value.trim(); cySave(); } }
  if(ds.cyFinish!==undefined){ const cy = cyFind(ds.cyFinish); if(cy){ cy.finishStage = t.value || null; persist('business'); } }
  if(ds.cyStepName){ const p = ds.cyStepName.split(':'); const st = cyStepFind(cyFind(p[0]), p[1]); if(st && t.value.trim()){ st.label = t.value.trim(); cySave(); } }
  const itemKey = ds.cyItemText || ds.cyItemLink || ds.cyItemType;
  if(itemKey){
    const p = itemKey.split(':'); const st = cyStepFind(cyFind(p[0]), p[1]);
    const it = st && st.checklist.find(function(x){ return x.id===p[2]; }); if(!it) return;
    if(ds.cyItemText && t.value.trim()) it.text = t.value.trim();
    if(ds.cyItemLink!==undefined && ds.cyItemLink) it.link = t.value.trim();
    if(ds.cyItemType) it.type = t.value;
    cySave();
  }
});
document.addEventListener('keydown', function(e){
  if(e.key!=='Enter' || !e.target || !e.target.dataset) return;
  if(e.target.dataset.cyNewItem){ e.preventDefault(); const p = e.target.dataset.cyNewItem.split(':'); ACTIONS.cyItemAdd({dataset:{id:p[0], step:p[1]}}); }
  if(e.target.id==='cyNewStep'){ e.preventDefault(); ACTIONS.cyStepAdd({dataset:{id:ui.editingCycleId}}); }
});
