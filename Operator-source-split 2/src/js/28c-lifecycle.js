
// ============ CLIENT LIFECYCLE (your system for every new client) ============
// The client stages are the steps of a journey you design (Onboarding → Kickoff → …).
// Each step carries a checklist, so whenever a client lands on a step you see exactly what
// to do. Progress is stored per client; an item also counts as done when the task created
// from it is finished.
const DEFAULT_LIFECYCLE_CHECKLISTS = {
  onboarding: ['Send welcome message','Contract signed','First invoice paid','Collect brand assets & logins','Book kickoff call'],
  active: ['Monthly content plan sent','Weekly check-in','Monthly results recap'],
  atrisk: ['Call to understand what\'s off','Send a quick win / results summary','Agree on a fix plan'],
  paused: ['Confirm restart date'],
  churned: ['Ask for feedback','Ask for a testimonial / referral']
};
// Called from normalizeCrmData: every client stage gets a checklist array; the defaults
// above are filled in once (never again after you edit them).
function normalizeLifecycle(b){
  b.crm.clientStages.forEach(function(st){
    if(!Array.isArray(st.checklist)){
      st.checklist = (!b.crm.lifecycleSeeded ? (DEFAULT_LIFECYCLE_CHECKLISTS[st.id]||[]) : []).map(function(t, i){ return {id:'lc'+st.id+i, text:t}; });
    }
  });
  b.crm.lifecycleSeeded = true;
  b.clients.forEach(function(c){
    if(!c.lifecycle || typeof c.lifecycle!=='object') c.lifecycle = {};
    if(!c.lifecycle.checks || typeof c.lifecycle.checks!=='object') c.lifecycle.checks = {};
    if(!c.lifecycle.enteredAt || typeof c.lifecycle.enteredAt!=='object') c.lifecycle.enteredAt = {};
  });
}
function lifecycleSteps(){ return crmStages('client').filter(function(s){ return s.active!==false && !s.kind; }); }
function lcRef(c, st, it){ return c.id+':'+st.id+':'+it.id; }
function lcItemDone(c, st, it){
  if(arr((c.lifecycle||{}).checks && c.lifecycle.checks[st.id]).indexOf(it.id)>=0) return true;
  const ref = lcRef(c, st, it);
  return state.tasks.items.some(function(t){ return t.lifecycleRef===ref && t.status==='done'; });
}
function lcProgress(c){
  const st = crmStage('client', c.stage);
  const items = st ? arr(st.checklist) : [];
  const done = items.filter(function(it){ return lcItemDone(c, st, it); }).length;
  return {stage:st, total:items.length, done:done};
}
function lcNextStep(c){
  const steps = lifecycleSteps();
  const i = steps.findIndex(function(s){ return s.id===c.stage; });
  return i>=0 && i<steps.length-1 ? steps[i+1] : null;
}
function lcPrevStep(c){
  const steps = lifecycleSteps();
  const i = steps.findIndex(function(s){ return s.id===c.stage; });
  return i>0 ? steps[i-1] : null;
}
// ---- per-client tracker (top of the client view) ----
function renderClientLifecycle(c){
  const steps = lifecycleSteps();
  const cur = crmStage('client', c.stage);
  const curIdx = steps.findIndex(function(s){ return s.id===c.stage; });
  const prog = lcProgress(c);
  const next = lcNextStep(c), prev = lcPrevStep(c);
  const entered = (c.lifecycle && c.lifecycle.enteredAt && c.lifecycle.enteredAt[c.stage]) || null;
  const days = entered ? Math.max(0, Math.floor((Date.now()-entered)/86400000)) : null;
  const allDone = prog.total>0 && prog.done===prog.total;
  return '<div class="lc-card">'+
    '<div class="row" style="justify-content:space-between;align-items:center;margin-bottom:10px;">'+
      '<div class="kind-label" style="margin:0;">Client lifecycle</div>'+
      '<button class="mini-move" data-action="openLifecycleEditor">&#9881; Edit steps</button>'+
    '</div>'+
    '<div class="lc-track">'+steps.map(function(s, i){
      const state_ = i<curIdx ? 'is-past' : i===curIdx ? 'is-current' : '';
      return (i ? '<span class="lc-arrow">&rarr;</span>' : '')+
        '<button class="lc-step '+state_+'" data-action="lcGoStep" data-id="'+c.id+'" data-step="'+s.id+'" title="Move to '+escapeHtml(s.label)+'" style="--lc:'+s.color+'">'+(i<curIdx?'&#10003; ':'')+escapeHtml(s.label)+'</button>';
    }).join('')+
    (curIdx<0 && cur ? '<span class="lc-arrow">&middot;</span><span class="lc-step is-current" style="--lc:'+cur.color+'">'+escapeHtml(cur.label)+'</span>' : '')+
    '</div>'+
    (cur ? '<div class="lc-now">'+
      '<div class="row" style="justify-content:space-between;align-items:baseline;">'+
        '<div><span class="lc-now-title" style="color:'+cur.color+'">'+escapeHtml(cur.label)+'</span>'+(prog.total?'<span class="kpi-sub" style="margin-left:8px;">'+prog.done+' / '+prog.total+' done</span>':'')+'</div>'+
        (days!=null ? '<span class="kpi-sub">'+(days===0?'started today':days+' day'+(days===1?'':'s')+' in this step')+'</span>' : '')+
      '</div>'+
      (prog.total ? '<div class="progress" style="margin:8px 0 10px;"><div class="progress-bar'+(allDone?' good':'')+'" style="width:'+Math.round(prog.done/prog.total*100)+'%"></div></div>' : '')+
      (prog.total ? '<div class="lc-checklist">'+arr(cur.checklist).map(function(it){
        const done = lcItemDone(c, cur, it);
        const linked = state.tasks.items.find(function(t){ return t.lifecycleRef===lcRef(c,cur,it) && t.status!=='done'; });
        return '<label class="lc-item'+(done?' is-done':'')+'"><input type="checkbox" data-lc-check="'+c.id+':'+cur.id+':'+it.id+'" '+(done?'checked':'')+'><span>'+escapeHtml(it.text)+'</span>'+(linked?'<span class="tag tag-ongoing" style="margin-left:auto;">in tasks</span>':'')+'</label>';
      }).join('')+'</div>'
      : '<div class="kpi-sub">No checklist for this step yet — <span class="mini-move mini-move-today" data-action="openLifecycleEditor">add one</span>.</div>')+
      '<div class="row" style="justify-content:space-between;margin-top:12px;gap:8px;">'+
        '<div class="row" style="gap:6px;">'+
          (prev ? '<button class="btn btn-ghost btn-sm" data-action="lcGoStep" data-id="'+c.id+'" data-step="'+prev.id+'">&larr; '+escapeHtml(prev.label)+'</button>' : '')+
          (prog.total && prog.done<prog.total ? '<button class="btn btn-ghost btn-sm" data-action="lcToTasks" data-id="'+c.id+'" title="Add the unchecked items to your task list">Add to my tasks</button>' : '')+
        '</div>'+
        (next ? '<button class="btn btn-sm '+(allDone?'btn-good lc-next-ready':'')+'" data-action="lcGoStep" data-id="'+c.id+'" data-step="'+next.id+'">Next: '+escapeHtml(next.label)+' &rarr;</button>' : '')+
      '</div>'+
    '</div>' : '')+
  '</div>';
}
document.addEventListener('change', function(e){
  const t = e.target; if(!t || !t.dataset || !t.dataset.lcCheck) return;
  const p = t.dataset.lcCheck.split(':');
  const c = crmFind('client', p[0]); if(!c) return;
  const list = c.lifecycle.checks[p[1]] || (c.lifecycle.checks[p[1]] = []);
  const i = list.indexOf(p[2]);
  if(t.checked && i<0) list.push(p[2]);
  if(!t.checked && i>=0) list.splice(i,1);
  // unchecking also reopens a task created from this item
  if(!t.checked){ const tk = state.tasks.items.find(function(x){ return x.lifecycleRef===t.dataset.lcCheck && x.status==='done'; }); if(tk){ tk.status='backlog'; tk.completedAt=null; persist('tasks'); } }
  const prog = lcProgress(c);
  if(t.checked) (prog.total && prog.done===prog.total) ? playSessionComplete() : playTick();
  if(t.checked && prog.total && prog.done===prog.total){ const nx = lcNextStep(c); showToast((crmName('client',c))+': '+prog.stage.label+' complete'+(nx?' — ready for '+nx.label:''), {icon:'&#9989;'}); }
  persist('business'); renderView(); rerenderContactModal();
});
ACTIONS.lcGoStep = function(el){ setStage('client', el.dataset.id, el.dataset.step); };
ACTIONS.lcToTasks = function(el){
  const c = crmFind('client', el.dataset.id); if(!c) return;
  const st = crmStage('client', c.stage); if(!st) return;
  let added = 0;
  arr(st.checklist).forEach(function(it){
    const ref = lcRef(c, st, it);
    if(lcItemDone(c, st, it) || state.tasks.items.some(function(t){ return t.lifecycleRef===ref; })) return;
    state.tasks.items.push({id:uid(), title:it.text+' — '+crmName('client',c), client:c.id, clients:[c.id], priority:'med', deadline:null, notes:st.label+' step for '+crmName('client',c), status:'backlog', createdAt:todayStr(), completedAt:null, lifecycleRef:ref});
    added++;
  });
  if(added){ playTaskAdded(); showToast(added+' item'+(added===1?'':'s')+' added to your backlog', {icon:'&#9745;'}); }
  persist('tasks'); renderView(); rerenderContactModal();
};
// Card / list badge: "Onboarding · 2/5"
function lcBadgeHtml(c){
  const p = lcProgress(c);
  if(!p.stage || !p.total) return '';
  return '<div class="lc-badge"><span class="lc-badge-bar"><span style="width:'+Math.round(p.done/p.total*100)+'%;background:'+p.stage.color+'"></span></span><span class="kpi-sub">'+p.done+'/'+p.total+'</span></div>';
}
// ---- "Client next steps" on the Today dashboard ----
function renderClientStepsPanel(){
  const rows = [];
  crmList('client').forEach(function(c){
    if(!clientStageActive(c.stage)) return;
    const st = crmStage('client', c.stage); if(!st) return;
    const open = arr(st.checklist).filter(function(it){ return !lcItemDone(c, st, it); });
    if(open.length) rows.push({c:c, st:st, open:open});
  });
  if(!rows.length) return '';
  return '<div class="section"><div class="section-title">Client Next Steps<span class="kpi-sub">from your client lifecycle</span><span class="view-all-link" data-action="openLifecycleEditor">Edit steps</span></div>'+
    '<div class="lc-steps-grid">'+rows.map(function(r){
      return '<div class="card lc-steps-card" data-key="lcs-'+r.c.id+'">'+
        '<div class="row" style="justify-content:space-between;align-items:center;margin-bottom:6px;">'+
          '<span class="task-card-title" style="font-size:14px;cursor:pointer;" data-action="openContact" data-kind="client" data-id="'+r.c.id+'">'+escapeHtml(crmName('client', r.c))+'</span>'+
          '<span class="tag" style="background:'+r.st.color+'22;color:'+r.st.color+';">'+escapeHtml(r.st.label)+'</span>'+
        '</div>'+
        r.open.slice(0,3).map(function(it){ return '<label class="lc-item"><input type="checkbox" data-lc-check="'+r.c.id+':'+r.st.id+':'+it.id+'"><span>'+escapeHtml(it.text)+'</span></label>'; }).join('')+
        (r.open.length>3 ? '<div class="kpi-sub" style="margin-top:2px;">+'+(r.open.length-3)+' more</div>' : '')+
      '</div>';
    }).join('')+'</div></div>';
}
// ---- lifecycle editor ----
function openLifecycleEditor(){ showOverlay('lifecycleOverlay'); renderLifecycleEditorInto(); }
ACTIONS.openLifecycleEditor = openLifecycleEditor;
ACTIONS.closeLifecycleEditor = function(){ hideOverlay('lifecycleOverlay'); renderView(); };
function renderLifecycleEditor(){
  const stages = crmStages('client');
  const counts = {}; crmList('client').forEach(function(c){ counts[c.stage] = (counts[c.stage]||0)+1; });
  return '<div class="section-title" style="margin-bottom:4px;">Client lifecycle</div>'+
    '<div class="kpi-sub" style="margin-bottom:16px;">The steps every client goes through, in order. Give each step a checklist and you\'ll always know what to do next — it shows on the client and on your Today page.</div>'+
    '<div class="lc-editor">'+stages.map(function(s, i){
      const isPath = s.active!==false && !s.kind;
      return (i ? '<div class="lc-editor-arrow">'+(isPath && stages[i-1].active!==false && !stages[i-1].kind ? '&darr;' : '&middot;')+'</div>' : '')+
      '<div class="lc-editor-step'+(isPath?'':' is-side')+'" data-key="lce-'+s.id+'">'+
        '<div class="row" style="gap:8px;align-items:center;">'+
          '<span class="swatch" style="background:'+s.color+';width:16px;height:16px;flex-shrink:0;" data-action="cycleStageColor" data-kind="client" data-id="'+s.id+'" title="Change color"></span>'+
          '<input class="input lc-step-name" data-stage-label="client:'+s.id+'" value="'+escapeHtml(s.label)+'">'+
          '<span class="kpi-sub" style="white-space:nowrap;">'+(counts[s.id]||0)+' client'+((counts[s.id]||0)===1?'':'s')+'</span>'+
          '<span style="flex:1"></span>'+
          '<button class="btn btn-ghost btn-sm" data-action="moveStage" data-kind="client" data-id="'+s.id+'" data-dir="-1" '+(i===0?'disabled':'')+' title="Move up">&uarr;</button>'+
          '<button class="btn btn-ghost btn-sm" data-action="moveStage" data-kind="client" data-id="'+s.id+'" data-dir="1" '+(i===stages.length-1?'disabled':'')+' title="Move down">&darr;</button>'+
          (s.kind ? '' : '<button class="btn btn-ghost btn-sm mini-move-danger" data-action="removeStage" data-kind="client" data-id="'+s.id+'" title="Remove step — its clients move to the first step">&#10005;</button>')+
        '</div>'+
        (s.kind ? '<div class="kpi-sub" style="margin:4px 0 0 24px;">End of the relationship — not part of the active path.</div>'
                : '<label class="row kpi-sub" style="gap:6px;margin:6px 0 0 24px;cursor:pointer;"><input type="checkbox" data-stage-active="'+s.id+'" '+(s.active!==false?'checked':'')+'>Part of the active path (unchecked = side state like Paused)</label>')+
        '<div class="lc-editor-items">'+arr(s.checklist).map(function(it, j, all){
          return '<div class="lc-editor-item" data-key="lci-'+it.id+'">'+
            '<span class="lc-editor-bullet">&#9744;</span>'+
            '<input class="input input-sm" data-lc-item="'+s.id+':'+it.id+'" value="'+escapeHtml(it.text)+'">'+
            '<button class="mini-move" data-action="lcItemMove" data-id="'+s.id+'" data-item="'+it.id+'" data-dir="-1" '+(j===0?'disabled':'')+'>&uarr;</button>'+
            '<button class="mini-move" data-action="lcItemMove" data-id="'+s.id+'" data-item="'+it.id+'" data-dir="1" '+(j===all.length-1?'disabled':'')+'>&darr;</button>'+
            '<button class="mini-move mini-move-danger" data-action="lcItemRemove" data-id="'+s.id+'" data-item="'+it.id+'">&#10005;</button>'+
          '</div>';
        }).join('')+
          '<div class="lc-editor-item"><span class="lc-editor-bullet" style="opacity:.4;">+</span><input class="input input-sm" id="lcNewItem-'+s.id+'" data-lc-new-item="'+s.id+'" placeholder="Add a to-do for this step (Enter)"><button class="btn btn-sm" data-action="lcItemAdd" data-id="'+s.id+'">Add</button></div>'+
        '</div>'+
      '</div>';
    }).join('')+'</div>'+
    '<div class="row" style="margin-top:14px;gap:8px;"><input class="input" id="newStage-client" placeholder="New step name, e.g. Kickoff call" style="flex:1;"><button class="btn btn-primary btn-sm" data-action="addStage" data-kind="client">+ Add step</button></div>'+
    '<div class="row" style="margin-top:18px;justify-content:flex-end;"><button class="btn btn-primary" data-action="closeLifecycleEditor">Done</button></div>';
}
function renderLifecycleEditorInto(){ const el=document.getElementById('lifecycleContent'); if(el) morphInto(el, renderLifecycleEditor(), {form:true}); }
registerModal('lifecycleOverlay', renderLifecycleEditorInto);
function lcStage(id){ return crmStage('client', id); }
ACTIONS.lcItemAdd = function(el){
  const st = lcStage(el.dataset.id); if(!st) return;
  const inp = document.getElementById('lcNewItem-'+st.id);
  const text = inp ? inp.value.trim() : ''; if(!text) return;
  if(!Array.isArray(st.checklist)) st.checklist = [];
  st.checklist.push({id:uid(), text:text});
  inp.value = '';
  persist('business'); renderView();
  const again = document.getElementById('lcNewItem-'+st.id); if(again) again.focus();
};
ACTIONS.lcItemRemove = function(el){
  const st = lcStage(el.dataset.id); if(!st) return;
  st.checklist = arr(st.checklist).filter(function(it){ return it.id!==el.dataset.item; });
  persist('business'); renderView();
};
ACTIONS.lcItemMove = function(el){
  const st = lcStage(el.dataset.id); if(!st) return;
  const list = arr(st.checklist); const i = list.findIndex(function(it){ return it.id===el.dataset.item; });
  const j = i+Number(el.dataset.dir); if(i<0 || j<0 || j>=list.length) return;
  const t = list[i]; list[i] = list[j]; list[j] = t;
  persist('business'); renderView();
};
document.addEventListener('change', function(e){
  const t = e.target; if(!t || !t.dataset || !t.dataset.lcItem) return;
  const p = t.dataset.lcItem.split(':'); const st = lcStage(p[0]); if(!st) return;
  const it = arr(st.checklist).find(function(x){ return x.id===p[1]; });
  if(it && t.value.trim()){ it.text = t.value.trim(); persist('business'); }
});
document.addEventListener('keydown', function(e){
  if(e.key!=='Enter' || !e.target || !e.target.dataset) return;
  if(e.target.dataset.lcNewItem){ e.preventDefault(); ACTIONS.lcItemAdd({dataset:{id:e.target.dataset.lcNewItem}}); }
  if(e.target.id==='newStage-client'){ e.preventDefault(); ACTIONS.addStage({dataset:{kind:'client'}}); }
});
