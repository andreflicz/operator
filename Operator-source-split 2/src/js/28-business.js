// ============ BUSINESS ============
function nextStageLabel(stage){
  const idx = STAGE_ORDER.indexOf(stage);
  if(idx<0 || idx>=STAGE_ORDER.length-1) return null;
  return STAGE_LABELS[STAGE_ORDER[idx+1]];
}
function renderBusiness(){
  return '<div class="view-header"><div>'+businessNameTagHtml()+'<div class="view-title">Business'+tip('Recurring revenue, who you\'re serving, who you\'re chasing, and what you owe.')+'</div></div></div>'+
  '<div class="tabs">'+
    '<div class="tab '+(ui.businessTab==='overview'?'active':'')+'" data-action="businessTab" data-tab="overview">Overview</div>'+
    '<div class="tab '+(ui.businessTab==='leads'?'active':'')+'" data-action="businessTab" data-tab="leads">Leads</div>'+
    '<div class="tab '+(ui.businessTab==='clients'?'active':'')+'" data-action="businessTab" data-tab="clients">Clients</div>'+
    '<div class="tab '+(ui.businessTab==='lifecycle'?'active':'')+'" data-action="businessTab" data-tab="lifecycle">Lifecycle</div>'+
    '<div class="tab '+(ui.businessTab==='packages'?'active':'')+'" data-action="businessTab" data-tab="packages">Packages</div>'+
    '<div class="tab '+(ui.businessTab==='finances'?'active':'')+'" data-action="businessTab" data-tab="finances">Finances</div>'+
  '</div>'+
  '<div class="tab-panel" data-key="business-'+ui.businessTab+'">'+(ui.businessTab==='leads' ? renderCrmTab('lead') : ui.businessTab==='clients' ? renderClientsHome() : ui.businessTab==='lifecycle' ? renderLifecycleTab() : ui.businessTab==='packages' ? renderPackagesTab() : ui.businessTab==='finances' ? renderFinances() : renderBusinessOverview())+'</div>';
}
// Business → Overview: one card — revenue on top, clients and pipeline side by side.
function renderBusinessOverview(){
  const active = arr(state.business.clients).filter(function(c){ return clientStageActive(c.stage); });
  const mrr = active.reduce(function(a,c){ return a+Number(c.mrr||0); }, 0);
  const goal = Number(state.profile.revenueGoalMonthly)||0;
  const openLeads = arr(state.business.pipeline).filter(leadIsOpen);
  const pipe = openLeads.reduce(function(a,p){ return a+Number(p.value||0); }, 0);
  const months = []; const now = new Date();
  for(let k=5;k>=0;k--){ const d = new Date(now.getFullYear(), now.getMonth()-k, 1); const key = d.getFullYear()+'-'+pad2(d.getMonth()+1); months.push({label:d.toLocaleDateString(undefined,{month:'short'}), v:collectedByMonth(key)}); }
  const maxV = Math.max.apply(null, months.map(function(m){ return m.v; }).concat([1]));
  const clients = active.slice().sort(clientSortFn('health'));
  const stages = crmStages('lead').filter(function(s){ return s.kind!=='won' && s.kind!=='lost'; });
  const stageRows = stages.map(function(s){
    const items = openLeads.filter(function(p){ return p.stage===s.id; });
    return {s:s, n:items.length, v:items.reduce(function(a,p){ return a+Number(p.value||0); }, 0)};
  });
  const maxStage = Math.max.apply(null, stageRows.map(function(r){ return r.n; }).concat([1]));
  const leadsDue = reachOutList().filter(function(r){ return r.kind==='lead'; });
  // Laid out as the page itself — no card around it: the number up top, then clients | pipeline.
  return '<div class="hq">'+
    '<div class="hq-top">'+
      '<div class="hq-mrr">'+
        '<div class="stat-tile-k">Monthly recurring</div>'+
        '<div class="biz-mrr">$'+mrr.toLocaleString()+'</div>'+
        (goal ? '<div class="biz-bar"><span class="biz-bar-mrr" style="width:'+Math.min(100, mrr/goal*100)+'%"></span>'+(pipe ? '<span class="biz-bar-pipe" style="width:'+Math.max(0, Math.min(100-mrr/goal*100, pipe/goal*100))+'%"></span>' : '')+'<span class="biz-bar-end" title="Goal">'+money(goal)+'</span></div>'+
          '<div class="biz-goal-k">'+Math.round(mrr/goal*100)+'% of '+money(goal)+(pipe ? ' &middot; '+money(pipe)+' in pipeline' : '')+'</div>' : '')+
      '</div>'+
      '<div class="hq-months" title="Collected per month"><div class="biz-mbars">'+months.map(function(m, i){
        return '<div class="biz-mcol'+(i===5?' is-now':'')+'" title="'+m.label+': $'+m.v.toLocaleString()+'"><div class="biz-mbar-wrap"><div class="biz-mbar" style="height:'+Math.max(m.v?4:0, m.v/maxV*100)+'%"></div></div><span>'+m.label+'</span></div>';
      }).join('')+'</div></div>'+
    '</div>'+
    '<div class="hq-cols">'+
      '<div class="hq-col">'+
        '<div class="hq-col-head" data-action="businessTab" data-tab="clients"><span>Clients</span><span class="hq-count">'+active.length+'</span><span class="view-all-link">All &rarr;</span></div>'+
        (clients.length ? clients.slice(0, 8).map(function(c){
          return '<div class="hq-row" data-action="openContact" data-kind="client" data-id="'+c.id+'" data-key="hqc-'+c.id+'">'+clientAvatarHtml(c, true, true)+
            '<span class="hq-name">'+escapeHtml(crmName('client', c))+'</span>'+
            '<span class="hq-meta">'+clientNextTouchHtml(c)+'</span>'+
            '<span class="hq-val">'+(Number(c.mrr) ? money(c.mrr) : '')+'</span></div>';
        }).join('')+(clients.length>8 ? '<div class="hq-more" data-action="businessTab" data-tab="clients">+'+(clients.length-8)+' more</div>' : '')
        : '<div class="kpi-sub" style="padding:8px 2px;">No active clients yet.</div>')+
      '</div>'+
      '<div class="hq-col">'+
        '<div class="hq-col-head" data-action="businessTab" data-tab="leads"><span>Pipeline</span><span class="hq-count">'+openLeads.length+'</span><span class="view-all-link">Leads &rarr;</span></div>'+
        stageRows.map(function(r){
          return '<div class="hq-stage" data-action="crmJumpStage" data-id="'+r.s.id+'"><span class="hq-stage-name"><span class="crm-col-dot" style="background:'+r.s.color+'"></span>'+escapeHtml(r.s.label)+'</span>'+
            '<span class="hq-stage-bar"><span style="width:'+(r.n/maxStage*100)+'%;background:'+r.s.color+'"></span></span><span class="hq-stage-n">'+r.n+'</span><span class="hq-val">'+(r.v ? money(r.v) : '')+'</span></div>';
        }).join('')+
        (leadsDue.length ? '<div class="hq-due"><span class="kind-label" style="margin:0;">Reach out</span>'+leadsDue.slice(0, 4).map(function(r){ return '<span class="hq-due-lead" data-action="openContact" data-kind="lead" data-id="'+r.x.id+'">'+escapeHtml(crmName('lead', r.x))+'</span>'; }).join('')+(leadsDue.length>4 ? '<span class="kpi-sub">+'+(leadsDue.length-4)+'</span>' : '')+'</div>' : '')+
      '</div>'+
    '</div>'+
    outreachWeekHtml()+
  '</div>';
}
function renderPipelineGlance(){
  const stages = crmStages('lead');
  const pipeline = arr(state.business.pipeline);
  return '<div class="section"><div class="section-title">Pipeline<span class="view-all-link" data-action="businessTab" data-tab="leads">Open Leads &rarr;</span></div>'+
    '<div class="pipeline-glance">'+stages.map(function(s){
      const items = pipeline.filter(function(p){ return p.stage===s.id; });
      const val = items.reduce(function(a,p){ return a+Number(p.value||0); },0);
      return '<div class="pipeline-glance-col" data-action="crmJumpStage" data-id="'+s.id+'"><span class="crm-col-dot" style="background:'+s.color+'"></span><div class="pipeline-col-count">'+items.length+'</div><div class="pipeline-col-label">'+escapeHtml(s.label)+'</div><div class="kpi-sub">$'+val.toLocaleString()+'</div></div>';
    }).join('')+'</div></div>';
}
ACTIONS.crmJumpStage = function(el, e, id){ ui.businessTab='leads'; crmUi('lead').stage = id; renderView(); };
function renderLeadsTab(){
  const pipeline = arr(state.business.pipeline);
  const active = pipeline.filter(function(p){ return p.stage!=='lost'; });
  return '<div class="section"><div class="section-title">Leads &amp; Pipeline<button class="btn btn-sm" data-action="toggleForm" data-form="prospect">'+(ui.forms.prospect?'Close':'+ Add Prospect')+'</button></div>'+
    (ui.forms.prospect ? '<div class="card" style="margin-bottom:12px;"><div class="row">'+
      '<input class="input" id="pName" placeholder="Contact name" style="width:130px;">'+
      '<input class="input" id="pCompany" placeholder="Company" style="width:130px;">'+
      '<input class="input" id="pTrade" placeholder="Trade" style="width:110px;">'+
      '<input class="input" id="pPhone" placeholder="Phone" style="width:110px;">'+
      '<input class="input" type="number" id="pValue" placeholder="Est. value" style="width:100px;">'+
      '<input class="input" type="date" id="pFollowUp">'+
      '<button class="btn btn-ghost btn-sm" data-action="openDatePicker" data-target="pFollowUp">&#128197;</button>'+
      '<button class="btn btn-ghost btn-sm" data-action="setFieldToday" data-target="pFollowUp">Today</button>'+
      '<button class="btn btn-primary" data-action="addProspect" style="margin-left:auto;">Add</button>'+
    '</div>'+
    '<div class="field" style="margin-top:10px;"><label>Lead source</label><div class="row" style="gap:6px;">'+LEAD_SOURCES.map(function(s){ const active=ui.newProspectLeadSource===s.id; return '<span class="chip'+(active?' active':'')+'" data-action="setNewProspectLeadSource" data-value="'+s.id+'">'+s.emoji+' '+s.label+'</span>'; }).join('')+'</div></div>'+
    '</div>' : '')+
    '<div class="pipeline-cols">'+PIPELINE_STAGES.map(function(s){
      const items = pipeline.filter(function(p){ return p.stage===s; });
      const val = items.reduce(function(a,p){ return a+Number(p.value||0); },0);
      return '<div class="card"><div class="pipeline-col-count">'+items.length+'</div><div class="pipeline-col-label">'+STAGE_LABELS[s]+'</div><div class="kpi-sub">$'+val.toLocaleString()+'</div></div>';
    }).join('')+'</div>'+
    '<div class="task-list">'+(active.map(prospectRow).join('') || '<div class="empty">No prospects yet.</div>')+'</div>'+
  '</div>';
}
function renderClientsTab(){
  const clients = arr(state.business.clients);
  return '<div class="section"><div class="section-title">Clients<button class="btn btn-good btn-sm" data-action="toggleForm" data-form="client">'+(ui.forms.client?'Close':'+ Add Client')+'</button></div>'+
    (ui.forms.client ? '<div class="card" style="margin-bottom:14px;max-width:500px;"><div class="grid grid-2">'+
      '<input class="input" id="clientName" placeholder="Contact name">'+
      '<input class="input" id="clientBusiness" placeholder="Business">'+
    '</div>'+
      '<textarea class="input" id="clientNotes" placeholder="What are they like to work with? Anything worth remembering." style="width:100%;min-height:70px;margin-top:8px;"></textarea>'+
      '<button class="btn btn-good" style="margin-top:10px;" data-action="addClient">Add Client</button>'+
    '</div>' : '')+
    '<div class="client-card-grid">'+(clients.map(clientCard).join('') || '<div class="empty">No clients yet. Add one above, or convert a closed lead from the Pipeline.</div>')+'</div>'+
  '</div>';
}
function manualTouchesThisWeek(c){
  const wk = thisWeekKey();
  return arr(c.touches).filter(function(t){ return startOfWeekStr(t)===wk; }).length;
}
function deliverableWeekCount(d){
  const wk = thisWeekKey(), wkEnd = endOfWeekStr(todayStr());
  return arr(d.completedDates).filter(function(dt){ return dt>=wk && dt<=wkEnd; }).length;
}
function deliverableMonthCount(d){
  const mk = thisMonthKey();
  return arr(d.completedDates).filter(function(dt){ return monthKeyOf(dt)===mk; }).length;
}
function monthlyTargetFor(d){
  const target = d.weeklyTarget||1;
  const now = new Date();
  const daysInMonth = new Date(now.getFullYear(), now.getMonth()+1, 0).getDate();
  return Math.max(1, Math.round(target * daysInMonth/7));
}
// Week counts for a deliverable (weeks run Monday–Sunday).
function deliverableWeekCountFor(d, weekStart){
  const end = addDays(weekStart, 6);
  return arr(d.completedDates).filter(function(dt){ return dt>=weekStart && dt<=end; }).length;
}
function deliverableLastWeek(d){
  const target = d.weeklyTarget||1;
  const start = addDays(thisWeekKey(), -7);
  // only count weeks the deliverable existed for
  if(d.createdAt && d.createdAt > addDays(start, 6)) return {done:0, target:target, missed:0};
  const done = deliverableWeekCountFor(d, start);
  return {done:done, target:target, missed:Math.max(0, target-done)};
}
function deliverablePaceStatus(d){
  if(RC && d.id) return memo('dps:'+d.id, function(){ return deliverablePaceStatusRaw(d); });
  return deliverablePaceStatusRaw(d);
}
// Always be ahead of the curve. Green = ahead of where the week should be by today. Yellow =
// exactly on the curve (on time, not ahead — e.g. 2 of 2 on Sunday). Red = behind it.
// The curve is per week (an 8-a-month reel plan = 2 a week) and fills up as the week goes;
// anything missed last week is added on top, and shown as "owed" so the count adds up.
function deliverableOwed(d){ return Math.min(d.weeklyTarget||1, deliverableLastWeek(d).missed); }
function deliverableWeekNeed(d){ return (d.weeklyTarget||1) + deliverableOwed(d); }
function deliverableDueByToday(d){
  const daysIn = ((new Date().getDay()+6)%7)+1; // Mon = 1 … Sun = 7
  return deliverableOwed(d) + Math.floor((d.weeklyTarget||1)*daysIn/7);
}
function deliverablePaceStatusRaw(d){
  const done = deliverableWeekCount(d), due = deliverableDueByToday(d);
  return done > due ? 'good' : done===due ? 'warn' : 'danger';
}
function paceWord(pace){ return pace==='good' ? 'ahead' : pace==='warn' ? 'on pace' : 'behind'; }
function isDeliverableDoneThisWeek(d){
  if(d.recurring){
    if(deliverableMonthCount(d) >= monthlyTargetFor(d)) return true;
    return deliverableWeekCount(d) >= (d.weeklyTarget||1);
  }
  return d.status==='done';
}
function deliverablesDoneThisWeek(c){
  const wk = thisWeekKey();
  return arr(c.deliverables).filter(function(d){
    if(d.recurring) return isDeliverableDoneThisWeek(d);
    return d.status==='done' && d.completedAt && startOfWeekStr(d.completedAt)===wk;
  }).length;
}
function incrementDeliverableProgress(clientId, deliverableId){
  const c = state.business.clients.find(function(x){return x.id===clientId;}); if(!c) return;
  const d = arr(c.deliverables).find(function(x){return x.id===deliverableId;}); if(!d) return;
  if(!Array.isArray(d.completedDates)) d.completedDates=[];
  const target = d.weeklyTarget||1;
  const count = deliverableWeekCount(d);
  d.completedDates.push(todayStr());
  if(count+1>=target) playTaskComplete(); else playTick();
  persist('business'); renderView();
  // Logging progress always counts, locked in or not — just a heads-up, not a gate.
  if(!state.focus.activeSession) showLockInToast();
}
function undoDeliverableProgress(clientId, deliverableId){
  const c = state.business.clients.find(function(x){return x.id===clientId;}); if(!c) return;
  const d = arr(c.deliverables).find(function(x){return x.id===deliverableId;}); if(!d) return;
  const list = arr(d.completedDates);
  if(list.length){ list.pop(); d.completedDates = list; playTick(); persist('business'); renderView(); }
}
function recurringDeliverableRowHtml(clientId, d, readOnly){
  const monthCount = deliverableMonthCount(d);
  const monthlyTarget = monthlyTargetFor(d);
  const weekCount = deliverableWeekCount(d);
  const weekTarget = deliverableWeekNeed(d), owed = deliverableOwed(d);
  const pace = deliverablePaceStatus(d);
  const paceColor = pace==='good' ? 'var(--good)' : pace==='warn' ? 'var(--accent)' : 'var(--danger)';
  return '<div class="deliv-counter">'+
    '<div class="deliv-counter-ring" style="border-color:'+paceColor+';color:'+paceColor+';">'+monthCount+'</div>'+
    '<div class="deliv-counter-info">'+
      '<div class="deliv-counter-title">'+escapeHtml(d.title)+'</div>'+
      '<div class="kpi-sub">'+monthCount+' / '+monthlyTarget+' this month &middot; '+weekCount+'/'+weekTarget+' this week'+(owed?' (incl. '+owed+' owed from last week)':'')+' &middot; <span style="color:'+paceColor+';">'+paceWord(pace)+'</span></div>'+
    '</div>'+
    (readOnly ? '' :
      '<div class="deliv-counter-actions">'+
        '<button class="deliv-step-btn" data-action="undoDeliverableProgress" data-client="'+clientId+'" data-id="'+d.id+'" title="Remove one" '+(monthCount<=0?'disabled':'')+'>&#8722;</button>'+
        '<button class="deliv-step-btn" data-action="incrementDeliverableProgress" data-client="'+clientId+'" data-id="'+d.id+'" title="Log one">&#43;</button>'+
      '</div>'
    )+
  '</div>';
}
function clientGreenlitThisWeek(c){
  const recurring = arr(c.deliverables).filter(function(d){ return d.recurring; });
  const deliverablesOk = recurring.length ? recurring.every(isDeliverableDoneThisWeek) : true;
  const touched = manualTouchesThisWeek(c) > 0;
  return deliverablesOk && touched;
}
function clientHealthStatus(c){
  if(RC) return memo('hs:'+c.id, function(){ return clientHealthStatusRaw(c); });
  return clientHealthStatusRaw(c);
}
function clientHealthStatusRaw(c){
  // Health is the worse of: deliverable pace (are we on track for reels/ads this month?)
  // and communication (how recently have we logged a touch with this client?).
  const recurring = arr(c.deliverables).filter(function(d){ return d.recurring; });
  const paceLevels = recurring.map(deliverablePaceStatus);
  const worstPace = paceLevels.indexOf('danger')>=0 ? 'danger' : paceLevels.indexOf('warn')>=0 ? 'warn' : 'good';
  const careTier = clientCareTier(c);
  const careLevel = careTier.cls==='tag-danger' ? 'danger' : careTier.cls==='tag-warn' ? 'warn' : 'good';
  const rank = {good:0, warn:1, danger:2};
  const worst = rank[worstPace] >= rank[careLevel] ? worstPace : careLevel;
  const level = worst==='danger' ? 'red' : worst==='warn' ? 'yellow' : 'green';
  return {level:level, paceLevel:worstPace, careLevel:careLevel, hasDeliverables:recurring.length>0};
}
// kept as an alias so any lingering references keep working
function clientWeeklyStatus(c){ return clientHealthStatus(c); }
const CLIENT_HEALTH_META = {
  green:{cls:'tag-good', emoji:'&#128994;', label:'Healthy'},
  yellow:{cls:'tag-warn', emoji:'&#128993;', label:'On pace'},
  red:{cls:'tag-danger', emoji:'&#128308;', label:'Needs attention'}
};
const CLIENT_STATUS_META = CLIENT_HEALTH_META;
// Health is shown as a colored status pill: dot + label + the short reason behind it.
// Says which thing set the color: deliverables (ahead / on pace / behind) or keeping in touch.
function clientHealthCause(status){ const rank = {good:0, warn:1, danger:2}; return status.hasDeliverables && rank[status.paceLevel] >= rank[status.careLevel] ? 'pace' : 'care'; }
function clientHealthReason(c, status){
  if(status.level==='green') return status.hasDeliverables ? 'ahead of the week' : 'in touch';
  if(clientHealthCause(status)==='care') return clientCareTier(c).label.toLowerCase();
  if(status.level==='yellow') return 'right on the curve — get ahead';
  const owed = arr(c.deliverables).filter(function(d){ return d.recurring; }).reduce(function(a, d){ return a + deliverableOwed(d); }, 0);
  return owed ? owed+' owed from last week' : 'behind on deliverables';
}
function clientHealthLabel(status){
  if(status.level==='green') return status.hasDeliverables ? 'Ahead' : 'Healthy';
  if(status.level==='yellow') return 'On pace';
  return clientHealthCause(status)==='care' ? 'Check in' : 'Behind';
}
function clientHealthTagHtml(c){
  const status = clientHealthStatus(c);
  return '<span class="health-pill health-'+status.level+'" title="Green = ahead of the week · Yellow = right on pace · Red = behind, or a check-in is due">'+
    '<span class="health-dot"></span><span class="health-label">'+clientHealthLabel(status)+'</span>'+
    '<span class="health-reason">'+escapeHtml(clientHealthReason(c, status))+'</span>'+
  '</span>';
}
function clientStatusTagHtml(c){ return clientHealthTagHtml(c); }
function clientTouchCountThisWeek(c){ return manualTouchesThisWeek(c) + deliverablesDoneThisWeek(c); }
function clientTendedThisWeek(c){ return clientTouchCountThisWeek(c) > 0; }
function lastTouchInfo(c){
  const dates = arr(c.touches).slice();
  arr(c.deliverables).forEach(function(d){ if(d.status==='done' && d.completedAt) dates.push(d.completedAt); });
  if(!dates.length) return null;
  dates.sort();
  return dates[dates.length-1];
}
function logClientTouch(id){
  const c = state.business.clients.find(function(x){ return x.id===id; }); if(!c) return;
  logTouch('client', id);
  // The touch always counts, locked in or not — this is just a heads-up, not a gate.
  if(!state.focus.activeSession) showLockInToast();
}
function undoClientTouch(id){
  const c = state.business.clients.find(function(x){ return x.id===id; }); if(!c) return;
  if(!Array.isArray(c.touches) || !c.touches.length) return;
  const d = c.touches.pop();
  const tpIdx = arr(c.touchpoints).map(function(t){ return t.date; }).lastIndexOf(d);
  if(tpIdx>=0) c.touchpoints.splice(tpIdx,1);
  playTick();
  persist('business'); renderView();
}
function clientCareSettings(){
  return (state.settings && state.settings.clientCare) || defaultSettings().clientCare;
}
// Communication health follows the client's touch cadence: fine until the next touch is
// due, amber once it's overdue, red when overdue by more than half the cadence.
function clientCareTier(c){
  const last = crmLastTouch('client', c) || lastTouchInfo(c);
  // A client with no touch yet is measured from when they were added (same as the cadence).
  const base = last || c.createdAt || c.startDate;
  if(!base) return {cls:'tag-danger', label:'Never touched'};
  if(last && daysAgoFrom(last)<=0) return {cls:'tag-good', label:'Touched today'};
  const cad = crmCadence('client', c);
  const over = daysAgoFrom(addDays(base, cad));
  if(over < 0) return {cls:'tag-good', label: last ? 'In touch' : 'New — no touch yet'};
  // due (or overdue) for a touch = red: reach out
  return {cls:'tag-danger', label: over===0 ? 'Touch due today' : last ? 'No touch in '+daysAgoFrom(last)+'d' : 'Touch overdue '+over+'d'};
}
function clientCareTagHtml(c){
  const count = clientTouchCountThisWeek(c);
  const tier = clientCareTier(c);
  if(!count) return '<span class="tag '+tier.cls+'">'+tier.label+'</span>';
  return '<span class="tag '+tier.cls+'">&#10003; Tended '+(count>1?count+'&times; ':'')+'this week</span>';
}
function clientCard(c){
  const deliverables = arr(c.deliverables);
  const doneCount = deliverables.filter(isDeliverableDoneThisWeek).length;
  const isActive = c.status==='active';
  const pkg = c.packageId ? arr(state.business.packages).find(function(x){return x.id===c.packageId;}) : null;
  return '<div class="client-card">'+
    '<div class="row" style="justify-content:space-between;align-items:flex-start;cursor:pointer;" data-action="openClientModal" data-id="'+c.id+'">'+
      '<div>'+
        '<div class="task-card-title" style="font-size:18px;">'+escapeHtml(c.business||c.name||'Client')+'</div>'+
        (c.name && c.business ? '<div class="kpi-sub">'+escapeHtml(c.name)+'</div>' : '')+
      '</div>'+
      '<span class="tag '+(isActive?'tag-good':'tag-danger')+'">'+(isActive?'Active':'Paused')+'</span>'+
    '</div>'+
    '<div class="card" style="padding:12px 14px;cursor:pointer;" data-action="openClientModal" data-id="'+c.id+'">'+
      '<div class="row" style="justify-content:space-between;align-items:center;">'+
        (pkg ? '<span class="tag" style="background:var(--good-dim);color:var(--good);font-weight:600;">'+escapeHtml(pkg.name)+'</span>' : '<span class="kpi-sub">No package assigned</span>')+
        (pkg && deliverables.length ? '<span class="kpi-sub">'+doneCount+' / '+deliverables.length+' done this week</span>' : '')+
      '</div>'+
    '</div>'+
    (isActive ? '<div class="row" style="align-items:center;gap:8px;flex-wrap:wrap;">'+clientStatusTagHtml(c)+'</div>' : '')+
    (c.notes ? '<div class="kpi-sub" style="line-height:1.5;overflow:hidden;display:-webkit-box;-webkit-line-clamp:2;-webkit-box-orient:vertical;">'+escapeHtml(c.notes)+'</div>' : '')+
    '<div class="row" style="margin-top:auto;padding-top:10px;justify-content:flex-end;align-items:center;">'+
      (isActive ? clientTouchControlHtml(c) : '')+
    '</div>'+
  '</div>';
}
// Opens on the card face; Edit flips it over. A client you just added or won opens straight
// on the back, ready to set up.
function openClientModal(id, edit){
  ui.showClientModal = id;
  ui.clientEdit = !!edit;
  ui.pickingPackageForClient = null;
  ui.newClientJournalTag = null;
  ui.newClientJournalDraft = '';
  const o = document.getElementById('clientModalOverlay');
  if(!o) return;
  o.classList.remove('hidden');
  renderClientModalInto();
}
function closeClientModal(){ ui.showClientModal = null; ui.pickingPackageForClient = null; const o=document.getElementById('clientModalOverlay'); if(o) o.classList.add('hidden'); }
function closeClientModalAndSave(){
  const c = state.business.clients.find(function(x){return x.id===ui.showClientModal;});
  if(c){
    const notesEl = document.getElementById('clientModalNotes');
    if(notesEl) c.notes = notesEl.value.trim();
    const startDateEl = document.getElementById('clientModalStartDate');
    if(startDateEl) c.startDate = startDateEl.value || null;
    const billingDayEl = document.getElementById('clientModalBillingDay');
    if(billingDayEl) c.billingDay = clamp(Number(billingDayEl.value)||1, 1, 28);
    persist('business');
  }
  closeClientModal();
  renderView();
}
function viewClientJournalFromModal(id){
  closeClientModal();
  ui.view = 'personal';
  ui.personalTab = 'journal';
  ui.journalViewMode = 'clients';
  ui.journalTabClientId = id;
  renderView();
  openClientJournalPopover(id);
}
function setClientLeadSource(id, val){
  const c = state.business.clients.find(function(x){return x.id===id;}); if(!c) return;
  c.leadSource = (c.leadSource===val) ? null : val;
  persist('business'); renderClientModalInto();
}
function renderClientModal(){
  const c = state.business.clients.find(function(x){return x.id===ui.showClientModal;});
  if(!c) return '';
  if(!ui.clientEdit) return clientCardFrontHtml(c);
  const deliverables = arr(c.deliverables);
  const pendingCount = deliverables.filter(function(d){return !isDeliverableDoneThisWeek(d);}).length;
  const isActive = c.status==='active';
  const pkg = c.packageId ? arr(state.business.packages).find(function(x){return x.id===c.packageId;}) : null;
  return '<div class="row" style="justify-content:space-between;margin-bottom:10px;"><button class="btn btn-ghost btn-sm" data-action="clientFlip" data-id="front">&larr; Card</button><span class="kpi-sub">Editing</span></div>'+
    '<div class="card" style="margin-bottom:16px;">'+
      '<div class="row" style="justify-content:space-between;align-items:flex-start;">'+
        '<div class="client-name-edit"><input class="client-name-input" data-client-field="business" data-id="'+c.id+'" value="'+escapeHtml(c.business||'')+'" placeholder="Business name" title="Click to rename">'+
        '<input class="client-contact-input" data-client-field="name" data-id="'+c.id+'" value="'+escapeHtml(c.name||'')+'" placeholder="Contact name"></div>'+
        (function(){ const st = crmStage('client', c.stage); return '<span class="tag" style="background:'+(st?st.color:'#8A90A2')+'22;color:'+(st?st.color:'#8A90A2')+';">'+escapeHtml(st?st.label:(isActive?'Active':'Paused'))+'</span>'; })()+
      '</div>'+
      '<div class="row" style="margin-top:10px;gap:6px;flex-wrap:wrap;align-items:center;">'+
        clientHealthTagHtml(c)+
        (isActive ? clientCareTagHtml(c) : '')+
        (pkg ? '<span class="tag" style="background:var(--good-dim);color:var(--good);font-weight:600;">'+escapeHtml(pkg.name)+'</span>' : '<span class="kpi-sub">No package assigned</span>')+
      '</div>'+
      (isActive ? '<div class="row" style="justify-content:flex-end;margin-top:8px;">'+clientTouchControlHtml(c)+'</div>' : '')+
    '</div>'+
    renderClientLifecycle(c)+
    renderCrmBlock('client', c)+
    '<div class="kpi-label" style="margin:16px 0 8px;">Deliverables<span class="kpi-sub" style="margin-left:6px;">'+pendingCount+' pending</span></div>'+
    '<div class="task-list" style="margin-bottom:8px;">'+(deliverables.map(function(d){return deliverableRow(c.id,d);}).join('') || '<div class="empty">No deliverables yet — assign a package above, or add a one-off below.</div>')+'</div>'+
    '<span style="display:inline-block;margin-bottom:16px;font-size:12.5px;color:var(--accent);cursor:pointer;" data-action="openCustomDeliverableDrawer" data-id="'+c.id+'">&#8618; Add custom deliverable</span>'+
    '<div class="section-title" style="margin-bottom:8px;">Plan</div>'+
    renderClientPackageField(c)+
    '<div class="field" style="margin-bottom:16px;"><label>How we acquired them</label><div class="row" style="gap:6px;flex-wrap:wrap;">'+LEAD_SOURCES.map(function(s){ const active=c.leadSource===s.id; return '<span class="chip'+(active?' active':'')+'" data-action="setClientLeadSource" data-id="'+c.id+'" data-value="'+s.id+'">'+s.emoji+' '+s.label+'</span>'; }).join('')+'</div></div>'+
    clientBillingCycleFieldHtml(c)+
    '<div class="row" style="justify-content:center;margin-bottom:16px;"><button class="btn btn-ghost btn-sm" data-action="viewClientJournalFromModal" data-id="'+c.id+'">View Client Journal &rarr;</button></div>'+
    renderClientEventsSection(c)+
    '<div class="field" style="margin-bottom:16px;"><label>Notes</label><textarea class="input" id="clientModalNotes" style="width:100%;min-height:80px;" placeholder="What are they like to work with? Preferences, history, anything worth remembering.">'+escapeHtml(c.notes||'')+'</textarea></div>'+
    '<div class="row" style="justify-content:space-between;align-items:flex-end;margin-top:16px;">'+
      renderClientDeleteControl(c)+
      '<button class="btn btn-primary" data-action="closeClientModalAndSave">Done</button>'+
    '</div>';
}
// ---- the card face: just the things you glance at ----
function clientTenureLabel(c){
  const since = c.startDate || c.createdAt; if(!since) return '—';
  const d = Math.max(0, daysAgoFrom(since));
  if(d < 14) return d+' day'+(d===1?'':'s');
  if(d < 60) return Math.round(d/7)+' weeks';
  const m = Math.round(d/30.4);
  return m < 24 ? m+' months' : (Math.round(m/12*10)/10)+' years';
}
function clientCardFrontHtml(c){
  const pkg = c.packageId ? arr(state.business.packages).find(function(x){ return x.id===c.packageId; }) : null;
  const src = c.leadSource ? LEAD_SOURCES.find(function(s){ return s.id===c.leadSource; }) : null;
  const delivs = arr(c.deliverables);
  const recurring = delivs.filter(function(d){ return d.recurring; }), oneOff = delivs.filter(function(d){ return !d.recurring && d.status!=='done'; });
  const st = crmStage('client', c.stage);
  return '<div class="cf">'+
    '<div class="cf-head">'+clientAvatarHtml(c, false, true)+
      '<div class="cf-names"><div class="cf-biz">'+escapeHtml(c.business||c.name||'Client')+'</div>'+(c.name && c.business ? '<div class="kpi-sub">'+escapeHtml(c.name)+'</div>' : '')+'</div>'+
      clientHealthTagHtml(c)+
    '</div>'+
    '<div class="cf-facts">'+
      '<div class="cf-fact"><span class="cf-k">Working together</span><span class="cf-v">'+clientTenureLabel(c)+'</span>'+((c.startDate||c.createdAt) ? '<span class="cf-s">since '+fmtDateShort(c.startDate||c.createdAt)+'</span>' : '')+'</div>'+
      '<div class="cf-fact"><span class="cf-k">How we got them</span><span class="cf-v">'+(src ? src.emoji+' '+escapeHtml(src.label) : '—')+'</span></div>'+
      '<div class="cf-fact"><span class="cf-k">Monthly</span><span class="cf-v">'+(Number(c.mrr) ? '$'+Number(c.mrr).toLocaleString() : '—')+'</span>'+(st ? '<span class="cf-s">'+escapeHtml(st.label)+'</span>' : '')+'</div>'+
    '</div>'+
    '<div class="cf-sec"><div class="cf-sec-k">Plan &amp; deliverables</div>'+
      '<div class="cf-plan">'+(pkg ? '<span class="cf-plan-name">'+escapeHtml(pkg.name)+'</span>'+(pkg.price ? '<span class="kpi-sub">$'+Number(pkg.price).toLocaleString()+'/mo</span>' : '') : '<span class="kpi-sub">No plan assigned</span>')+'</div>'+
      (recurring.length || oneOff.length ? '<div class="cf-delivs">'+
        recurring.map(function(d){
          const done = deliverableWeekCount(d), need = deliverableWeekNeed(d), pace = deliverablePaceStatus(d);
          return '<div class="cf-deliv"><span class="cf-deliv-t">'+escapeHtml(d.title)+'</span>'+weekDotsHtml(Math.min(done, need), need, pace)+'<span class="cf-deliv-n" style="color:'+paceColorOf(pace)+'">'+done+'/'+need+' &middot; '+paceWord(pace)+'</span></div>';
        }).join('')+
        oneOff.map(function(d){ return '<div class="cf-deliv"><span class="cf-deliv-t">'+escapeHtml(d.title)+'</span><span class="cf-deliv-n kpi-sub">one-off'+(d.dueDate ? ' &middot; due '+fmtDateShort(d.dueDate) : '')+'</span></div>'; }).join('')+
      '</div>' : '<div class="kpi-sub" style="margin-top:6px;">No deliverables yet.</div>')+
    '</div>'+
    '<div class="cf-sec"><div class="cf-sec-k">Notes</div>'+(c.notes ? '<div class="cf-notes">'+escapeHtml(c.notes)+'</div>' : '<div class="kpi-sub">No notes yet — add some on the back of the card.</div>')+'</div>'+
    '<div class="cf-foot"><button class="btn btn-ghost" data-action="closeClientModalAndSave">Close</button><button class="btn btn-primary" data-action="clientFlip" data-id="back">&#9998; Edit</button></div>'+
  '</div>';
}
ACTIONS.clientFlip = function(el, e, id){
  if(id==='front'){ // keep what was typed on the back before flipping
    const c = state.business.clients.find(function(x){ return x.id===ui.showClientModal; });
    const notesEl = document.getElementById('clientModalNotes'); if(c && notesEl){ c.notes = notesEl.value.trim(); persist('business'); }
  }
  ui.clientEdit = id==='back';
  const box = document.getElementById('clientModalContent');
  if(box){ box.classList.remove('cm-flip'); void box.offsetWidth; box.classList.add('cm-flip'); }
  renderClientModalInto();
  if(box) box.scrollTop = 0;
};
function clientBillingCycleFieldHtml(c){
  const todayDay = new Date().getDate();
  const hasMrr = Number(c.mrr)>0;
  const invoiced = hasMrr && clientInvoicedThisMonth(c.id);
  const billingDay = c.billingDay||1;
  const overdue = hasMrr && !invoiced && todayDay>=billingDay;
  return '<div class="field" style="margin-bottom:16px;"><label>Working together since &amp; billing cycle</label>'+
    '<div class="card">'+
      '<div class="row"><input class="input" type="date" id="clientModalStartDate" value="'+(c.startDate||'')+'" style="flex:1;min-width:120px;"><button class="btn btn-ghost btn-sm" data-action="openDatePicker" data-target="clientModalStartDate">&#128197;</button></div>'+
      (c.startDate ? '<div class="kpi-sub" style="margin-top:6px;">'+daysAgoFrom(c.startDate)+' days working together</div>' : '')+
      '<div class="row" style="margin-top:10px;align-items:center;gap:8px;flex-wrap:wrap;">'+
        '<label style="font-size:12.5px;color:var(--text-dim);white-space:nowrap;">Cycle resets on day</label>'+
        '<input class="input" type="number" min="1" max="28" id="clientModalBillingDay" value="'+billingDay+'" style="width:70px;">'+
        (hasMrr ? (invoiced ? '<span class="tag tag-general">Invoiced this month</span>' : (overdue ? '<span class="tag tag-high">&#9888; Overdue for invoice</span>' : '<span class="tag tag-med">Bills the '+ordinal(billingDay)+'</span>')) : '<span class="kpi-sub">No retainer set</span>')+
      '</div>'+
    '</div>'+
  '</div>';
}
function renderClientDeleteControl(c){
  const label = c.business || c.name || 'this client';
  return '<div style="text-align:left;">'+
    '<div class="kpi-sub" style="margin-bottom:6px;">Type "'+escapeHtml(label)+'" to remove this client.</div>'+
    '<div class="row" style="gap:6px;">'+
      '<input class="input" id="clientDeleteConfirmInput" data-client-name="'+escapeHtml(label)+'" placeholder="'+escapeHtml(label)+'" style="max-width:200px;">'+
      '<button class="btn btn-danger btn-sm" id="clientDeleteConfirmBtn" data-action="confirmDeleteClientTyped" data-id="'+c.id+'" disabled>Remove Client</button>'+
    '</div>'+
  '</div>';
}
function renderClientEventsSection(c){
  const events = arr(state.calendar.events).filter(function(e){ return e.linkedClient===c.id; }).sort(function(a,b){ return (a.date+String(a.time||'')).localeCompare(b.date+String(b.time||'')); });
  const upcoming = events.filter(function(e){ return e.date>=todayStr(); });
  if(!upcoming.length) return '';
  return '<div class="section-title" style="margin-top:16px;margin-bottom:8px;">Upcoming Calendar Events</div>'+
    '<div class="task-list" style="margin-bottom:16px;">'+upcoming.map(function(e){
      return '<div class="task-item-v2">'+
        '<div style="font-family:var(--font-display);font-weight:700;width:80px;">'+fmtDateShort(e.date)+'</div>'+
        '<div class="task-title" style="flex:1;">'+escapeHtml(e.title)+(e.time?' &middot; '+fmt12Hour(e.time):'')+'</div>'+
        '<button class="btn btn-ghost btn-sm" data-action="openCalEventModal" data-id="'+e.id+'">Edit</button>'+
      '</div>';
    }).join('')+'</div>';
}
function renderClientPackageField(c){
  const packages = arr(state.business.packages);
  const assigned = c.packageId ? packages.find(function(x){return x.id===c.packageId;}) : null;
  const picking = ui.pickingPackageForClient === c.id;
  let body;
  if(picking){
    if(!packages.length){
      body = '<div class="kpi-sub">No packages yet — add one in Business &rarr; Packages first.</div><button class="btn btn-ghost btn-sm" style="margin-top:8px;" data-action="cancelPickPackage">Cancel</button>';
    } else {
      body = '<div class="row"><select class="input" id="clientPackageSelect" style="flex:1;">'+
          packages.map(function(pk){ return '<option value="'+pk.id+'" '+(c.packageId===pk.id?'selected':'')+'>'+escapeHtml(pk.name)+' ('+arr(pk.deliverables).length+' deliverables)</option>'; }).join('')+
        '</select>'+
        '<button class="btn btn-good btn-sm" data-action="assignClientPackage" data-id="'+c.id+'">Assign</button>'+
        '<button class="btn btn-ghost btn-sm" data-action="cancelPickPackage">Cancel</button>'+
      '</div>';
    }
  } else if(assigned){
    body = '<div class="row" style="justify-content:space-between;align-items:center;">'+
      '<span class="tag" style="background:var(--good-dim);color:var(--good);">'+escapeHtml(assigned.name)+(assigned.price?' &middot; $'+Number(assigned.price).toLocaleString():'')+'</span>'+
      '<div class="row"><button class="btn btn-ghost btn-sm" data-action="pickPackageForClient" data-id="'+c.id+'">Change</button><button class="btn btn-ghost btn-sm" data-action="clearClientPackage" data-id="'+c.id+'">Remove</button></div>'+
    '</div>';
  } else {
    body = '<button class="btn btn-ghost btn-sm" data-action="pickPackageForClient" data-id="'+c.id+'">+ Set Package</button>';
  }
  return '<div class="field" style="margin-bottom:16px;"><label>Package</label><div class="card">'+body+'</div></div>';
}
function pickPackageForClient(id){ ui.pickingPackageForClient = id; renderClientModalInto(); }
function cancelPickPackage(){ ui.pickingPackageForClient = null; renderClientModalInto(); }
function assignClientPackage(clientId){
  const c = state.business.clients.find(function(x){return x.id===clientId;}); if(!c) return;
  const sel = document.getElementById('clientPackageSelect');
  const pk = sel ? arr(state.business.packages).find(function(x){return x.id===sel.value;}) : null;
  if(!pk) return;
  archivePackageProgress(c);
  c.deliverables = arr(c.deliverables).filter(function(d){ return !d.fromPackage; });
  arr(pk.deliverables).forEach(function(d){
    c.deliverables.push({id:uid(), title:d.title, dueDate:null, status:'pending', linkedTaskId:null, fromPackage:true, recurring:true, completedDates:restoredPackageProgress(c, d), weeklyTarget:d.weeklyTarget||1, sourceId:d.id, createdAt:todayStr()});
  });
  c.packageId = pk.id;
  ui.pickingPackageForClient = null;
  playPositive();
  persist('business'); renderClientModalInto(); renderView();
}
// Swapping or removing a client's package used to throw away every logged deliverable
// (all the dated "+1"s) for that client. Progress is now kept per deliverable title and
// handed back whenever a package with a matching deliverable is assigned again.
function packageProgressKey(title){ return String(title||'').trim().toLowerCase(); }
function archivePackageProgress(c){
  if(!c.packageProgressArchive || typeof c.packageProgressArchive!=='object') c.packageProgressArchive = {};
  arr(c.deliverables).forEach(function(d){
    if(!d.fromPackage || !arr(d.completedDates).length) return;
    const k = packageProgressKey(d.title);
    const prev = arr(c.packageProgressArchive[k]);
    const merged = prev.concat(arr(d.completedDates));
    c.packageProgressArchive[k] = merged;
  });
}
function restoredPackageProgress(c, pkgDeliverable){
  const k = packageProgressKey(pkgDeliverable.title);
  const archive = c.packageProgressArchive || {};
  const dates = arr(archive[k]).slice();
  if(dates.length) delete archive[k];
  return dates;
}
function clearClientPackage(clientId){
  const c = state.business.clients.find(function(x){return x.id===clientId;}); if(!c) return;
  archivePackageProgress(c);
  c.deliverables = arr(c.deliverables).filter(function(d){ return !d.fromPackage; });
  c.packageId = null;
  persist('business'); renderClientModalInto(); renderView();
}
function openCustomDeliverableDrawer(clientId){
  ui.customDeliverableClientId = clientId;
  const o = document.getElementById('customDeliverableOverlay');
  if(!o) return;
  o.classList.remove('hidden');
  renderCustomDeliverableDrawerInto();
}
function closeCustomDeliverableDrawer(){ ui.customDeliverableClientId = null; const o=document.getElementById('customDeliverableOverlay'); if(o) o.classList.add('hidden'); }
function renderCustomDeliverableDrawer(){
  const c = state.business.clients.find(function(x){return x.id===ui.customDeliverableClientId;});
  if(!c) return '';
  return '<div class="section-title" style="margin-bottom:14px;">Custom Deliverable<span class="kpi-sub">'+escapeHtml(c.business||c.name||'')+'</span></div>'+
    '<div class="field"><label>Title</label><input class="input" id="newDeliverableTitle" placeholder="e.g. 4 reels" style="width:100%;"></div>'+
    '<div class="field" style="margin-top:10px;"><label>Due date (optional)</label><div class="row"><input class="input" type="date" id="newDeliverableDue" style="flex:1;"><button class="btn btn-ghost btn-sm" data-action="openDatePicker" data-target="newDeliverableDue">&#128197;</button><button class="btn btn-ghost btn-sm" data-action="setFieldToday" data-target="newDeliverableDue">Today</button></div></div>'+
    '<label class="row" style="margin-top:12px;font-size:12.5px;color:var(--text-dim);"><input type="checkbox" id="newDeliverableLinkTask" checked style="margin-right:6px;">Also add to Tasks &amp; Calendar</label>'+
    '<div class="row" style="margin-top:20px;justify-content:flex-end;">'+
      '<button class="btn btn-ghost" data-action="closeCustomDeliverableDrawer">Cancel</button>'+
      '<button class="btn btn-primary" data-action="addDeliverable" data-id="'+c.id+'">Add Deliverable</button>'+
    '</div>';
}
function renderCustomDeliverableDrawerInto(){ const el=document.getElementById('customDeliverableContent'); if(el) morphInto(el, renderCustomDeliverableDrawer(), {form:true}); }
function renderClientModalInto(){ const el=document.getElementById('clientModalContent'); if(el) morphInto(el, renderClientModal(), {form:true}); }
function deliverableRow(clientId, d){
  if(d.recurring){
    const target = d.weeklyTarget||1;
    return '<div class="task-item-v2">'+
      '<div style="flex:1;min-width:100px;">'+recurringDeliverableRowHtml(clientId, d, false)+'</div>'+
      '<span class="tag" style="background:var(--good-dim);color:var(--good);">'+(target>1?target+'&times;/week':'Weekly')+'</span>'+
      '<button class="btn btn-ghost btn-sm" data-action="removeDeliverable" data-client="'+clientId+'" data-id="'+d.id+'" title="'+(d.fromPackage?"Doesn't apply to this client — won't affect the package":'Remove')+'">Remove</button>'+
    '</div>';
  }
  const overdue = d.status!=='done' && d.dueDate && d.dueDate<todayStr();
  const dueThisWeek = d.status!=='done' && d.dueDate && !overdue && d.dueDate>=thisWeekKey() && d.dueDate<=endOfWeekStr(todayStr());
  return '<div class="task-item-v2 '+(d.status==='done'?'done':'')+'">'+
    '<div class="checkbox '+(d.status==='done'?'checked':'')+'" data-action="toggleDeliverable" data-client="'+clientId+'" data-id="'+d.id+'">'+(d.status==='done'?'&#10003;':'')+'</div>'+
    '<div style="flex:1;min-width:100px;"><div class="task-title">'+escapeHtml(d.title)+'</div></div>'+
    (d.fromPackage ? '<span class="tag" style="background:var(--good-dim);color:var(--good);">Package</span>' : '')+
    (dueThisWeek ? '<span class="tag tag-med">This week</span>' : '')+
    (d.dueDate ? '<span class="kpi-sub" style="color:'+(overdue?'var(--danger)':'var(--text-faint)')+';">Due '+fmtDateShort(d.dueDate)+'</span>' : '')+
    '<button class="btn btn-ghost btn-sm" data-action="removeDeliverable" data-client="'+clientId+'" data-id="'+d.id+'" title="'+(d.fromPackage?"Doesn't apply to this client — won't affect the package":'Remove')+'">Remove</button>'+
  '</div>';
}
function addDeliverable(clientId){
  const c = state.business.clients.find(function(x){return x.id===clientId;}); if(!c) return;
  const titleEl = document.getElementById('newDeliverableTitle');
  const title = titleEl.value.trim();
  if(!title) return;
  const dueDate = document.getElementById('newDeliverableDue').value || null;
  const linkTask = document.getElementById('newDeliverableLinkTask').checked;
  if(!Array.isArray(c.deliverables)) c.deliverables = [];
  const deliverable = {id:uid(), title:title, dueDate:dueDate, status:'pending', linkedTaskId:null};
  if(linkTask){
    const taskId = uid();
    state.tasks.items.push({id:taskId, title:title+' — '+(c.business||c.name||'Client'), client:c.id, clients:[c.id], priority:'med', deadline:dueDate, notes:'Deliverable for '+(c.business||c.name||'client'), status:'backlog', createdAt:todayStr(), completedAt:null});
    deliverable.linkedTaskId = taskId;
    persist('tasks');
  }
  c.deliverables.push(deliverable);
  playPositive();
  closeCustomDeliverableDrawer();
  persist('business'); renderView();
}
function toggleDeliverable(clientId, deliverableId){
  const c = state.business.clients.find(function(x){return x.id===clientId;}); if(!c) return;
  const d = arr(c.deliverables).find(function(x){return x.id===deliverableId;}); if(!d) return;
  if(d.recurring){
    incrementDeliverableProgress(clientId, deliverableId);
    return;
  }
  d.status = d.status==='done' ? 'pending' : 'done';
  d.completedAt = d.status==='done' ? todayStr() : null;
  if(d.linkedTaskId){
    const t = state.tasks.items.find(function(x){return x.id===d.linkedTaskId;});
    if(t){
      if(d.status==='done'){ t.status='done'; t.completedAt=todayStr(); } else { t.status='backlog'; t.completedAt=null; }
      persist('tasks');
    }
  }
  if(d.status==='done') playTaskComplete();
  persist('business'); renderView();
}
function removeDeliverable(clientId, deliverableId){
  const c = state.business.clients.find(function(x){return x.id===clientId;}); if(!c) return;
  const d = arr(c.deliverables).find(function(x){return x.id===deliverableId;});
  c.deliverables = arr(c.deliverables).filter(function(x){return x.id!==deliverableId;});
  if(d && d.linkedTaskId){
    state.tasks.items = state.tasks.items.filter(function(x){return x.id!==d.linkedTaskId;});
    persist('tasks');
  }
  persist('business'); renderView();
}
function prospectRow(p){
  const nsl = nextStageLabel(p.stage);
  const primaryName = p.company || p.name;
  const secondaryName = (p.company && p.name) ? p.name : '';
  const canUndo = Array.isArray(p.stageHistory) && p.stageHistory.length>0;
  const src = p.leadSource ? leadSourceById(p.leadSource) : null;
  return '<div class="lead-card" data-action="openProspectEditModal" data-id="'+p.id+'" style="cursor:pointer;">'+
    '<div class="lead-row" style="grid-template-columns:minmax(120px,2fr) 118px 130px 90px 100px 28px;align-items:center;">'+
      '<div class="lead-name">'+escapeHtml(primaryName)+(secondaryName?' <span class="kpi-sub">'+escapeHtml(secondaryName)+'</span>':'')+'</div>'+
      '<span class="tag stage-'+p.stage+'" '+(nsl?'data-action="advanceStage" data-id="'+p.id+'" style="cursor:pointer;" title="Click to move to '+nsl+'"':'')+'>'+STAGE_LABELS[p.stage]+'</span>'+
      (src ? '<span class="tag" style="background:'+src.color+'22;color:'+src.color+';">'+src.emoji+' '+escapeHtml(src.label)+'</span>' : '<span></span>')+
      '<div class="lead-value">$'+Number(p.value||0).toLocaleString()+'</div>'+
      '<div class="lead-followup kpi-sub">'+(p.nextFollowUp?fmtDateShort(p.nextFollowUp):'—')+'</div>'+
      (canUndo ? '<button class="btn btn-ghost btn-sm" data-action="undoStage" data-id="'+p.id+'" title="Undo last stage change" style="padding:4px 6px;">&#8630;</button>' : '<span></span>')+
    '</div>'+
    (p.stage==='closed' ? (p.convertedClientId ?
      '<div class="kpi-sub" style="padding-left:4px;margin-top:4px;color:var(--good);">&#10003; Added as client</div>' :
      '<div style="padding-left:4px;margin-top:6px;"><button class="btn btn-good btn-sm" data-action="convertToClient" data-id="'+p.id+'">+ Add as Client</button></div>'
    ) : '')+
  '</div>';
}
function toggleProspectSelect(id){
  if(ui.selectedProspectIds.has(id)) ui.selectedProspectIds.delete(id); else ui.selectedProspectIds.add(id);
  renderView();
}
function clearProspectSelection(){ ui.selectedProspectIds.clear(); renderView(); }
function renderProspectToolbar(){
  const ids = Array.from(ui.selectedProspectIds).filter(function(id){ return state.business.pipeline.some(function(p){return p.id===id;}); });
  if(!ids.length) return '';
  const selected = ids.map(function(id){ return state.business.pipeline.find(function(p){return p.id===id;}); }).filter(Boolean);
  const anyAdvanceable = selected.some(function(p){ return !!nextStageLabel(p.stage); });
  const anyNotLost = selected.some(function(p){ return p.stage!=='lost'; });
  const oneClosedSelected = ids.length===1 && selected[0].stage==='closed' && !selected[0].convertedClientId;
  return '<div class="bulk-toolbar section">'+
    '<span class="toolbar-label">'+ids.length+' selected</span>'+
    '<div class="toolbar-actions">'+
      (ids.length===1 ? '<button class="btn btn-sm" data-action="openProspectEditModal" data-id="'+ids[0]+'">Edit</button>' : '')+
      (anyAdvanceable ? '<button class="btn btn-ghost btn-sm" data-action="bulkAdvanceStage">Advance Stage</button>' : '')+
      (oneClosedSelected ? '<button class="btn btn-good btn-sm" data-action="convertToClient" data-id="'+ids[0]+'">Add as Client</button>' : '')+
      (anyNotLost ? '<button class="btn btn-ghost btn-sm" data-action="bulkMarkLost">Mark as Lost</button>' : '')+
      '<button class="btn btn-danger btn-sm" data-action="bulkRemoveProspects">Remove</button>'+
    '</div>'+
    '<button class="btn btn-ghost btn-sm toolbar-cancel" data-action="clearProspectSelection">Cancel</button>'+
  '</div>';
}
function bulkAdvanceStage(){ Array.from(ui.selectedProspectIds).forEach(function(id){ advanceStageQuiet(id); }); ui.selectedProspectIds.clear(); persist('business'); renderView(); }
function bulkMarkLost(){ Array.from(ui.selectedProspectIds).forEach(function(id){ const p=state.business.pipeline.find(function(x){return x.id===id;}); if(p) p.stage='lost'; }); ui.selectedProspectIds.clear(); persist('business'); renderView(); }
function bulkRemoveProspects(){
  const ids = new Set(ui.selectedProspectIds);
  state.business.pipeline = state.business.pipeline.filter(function(p){ return !ids.has(p.id); });
  ui.selectedProspectIds.clear();
  persist('business'); renderView();
}
function openProspectEditModal(id){
  // The lead editor is now the CRM contact view.
  if(typeof openContact==='function'){ openContact('lead', id); return; }
  ui.editingProspectId = id;
  const o = document.getElementById('prospectEditOverlay');
  if(!o) return;
  o.classList.remove('hidden');
  renderProspectEditModalInto();
}
function closeProspectEditModal(){ ui.editingProspectId = null; ui.selectedProspectIds.clear(); const o=document.getElementById('prospectEditOverlay'); if(o) o.classList.add('hidden'); }
function setEditingProspectLeadSource(val){
  const p = state.business.pipeline.find(function(x){return x.id===ui.editingProspectId;});
  if(!p) return;
  p.leadSource = val;
  renderProspectEditModalInto();
}
function renderProspectEditModal(){
  const p = state.business.pipeline.find(function(x){return x.id===ui.editingProspectId;});
  if(!p) return '';
  return '<div class="section-title" style="margin-bottom:14px;">Edit Lead</div>'+
    '<div class="grid grid-2">'+
      '<div class="field"><label>Contact name</label><input class="input" id="editPName-'+p.id+'" value="'+escapeHtml(p.name)+'"></div>'+
      '<div class="field"><label>Company</label><input class="input" id="editPCompany-'+p.id+'" value="'+escapeHtml(p.company||'')+'"></div>'+
    '</div>'+
    '<div class="grid grid-2" style="margin-top:10px;">'+
      '<div class="field"><label>Est. value</label><input class="input" type="number" id="editPValue-'+p.id+'" value="'+(p.value||0)+'"></div>'+
      '<div class="field"><label>Follow-up date</label><div class="row"><input class="input" type="date" id="editPFollowUp-'+p.id+'" value="'+(p.nextFollowUp||'')+'"><button class="btn btn-ghost btn-sm" data-action="openDatePicker" data-target="editPFollowUp-'+p.id+'">&#128197;</button><button class="btn btn-ghost btn-sm" data-action="setFieldToday" data-target="editPFollowUp-'+p.id+'">Today</button></div></div>'+
    '</div>'+
    '<div class="field" style="margin-top:10px;"><label>Lead source</label><div class="row" style="gap:6px;">'+LEAD_SOURCES.map(function(s){ const active=p.leadSource===s.id; return '<span class="chip'+(active?' active':'')+'" data-action="setEditingProspectLeadSource" data-value="'+s.id+'">'+s.emoji+' '+s.label+'</span>'; }).join('')+'</div></div>'+
    '<div class="row" style="margin-top:20px;justify-content:space-between;align-items:center;">'+
      deleteBtn('prospect', p.id)+
      '<div class="row">'+
        '<button class="btn btn-ghost" data-action="closeProspectEditModal">Cancel</button>'+
        '<button class="btn btn-primary" data-action="saveEditProspect" data-id="'+p.id+'">Save</button>'+
      '</div>'+
    '</div>';
}
function renderProspectEditModalInto(){ const el=document.getElementById('prospectEditContent'); if(el) morphInto(el, renderProspectEditModal(), {form:true}); }
function saveEditProspect(id){
  const p = state.business.pipeline.find(function(x){return x.id===id;}); if(!p) return;
  p.name = document.getElementById('editPName-'+id).value.trim() || p.name;
  p.company = document.getElementById('editPCompany-'+id).value.trim();
  p.value = Number(document.getElementById('editPValue-'+id).value)||0;
  p.nextFollowUp = document.getElementById('editPFollowUp-'+id).value || null;
  closeProspectEditModal();
  persist('business'); renderView();
}
function addClient(){
  const name = document.getElementById('clientName').value.trim();
  const business = document.getElementById('clientBusiness').value.trim();
  const notesEl = document.getElementById('clientNotes');
  const notes = notesEl ? notesEl.value.trim() : '';
  if(!name && !business) return;
  state.business.clients.push({id:uid(), name:name, business:business, leadSource:null, mrr:0, billingDay:1, status:'active', stage:'active', notes:notes, deliverables:[], journal:[], touches:[], touchpoints:[], timeline:[], files:[], cadenceDays:null, createdAt:todayStr()});
  ui.forms.client = false;
  playPositive();
  persist('business'); renderView();
}
function toggleClientStatus(id){
  const c = state.business.clients.find(function(x){ return x.id===id; }); if(!c) return;
  setStage('client', id, c.status==='active' ? 'paused' : 'active');
}
function addProspect(){
  const name = document.getElementById('pName').value.trim();
  if(!name) return;
  state.business.pipeline.push({
    id:uid(), name:name,
    company: document.getElementById('pCompany').value.trim(),
    trade: document.getElementById('pTrade').value.trim(),
    phone: document.getElementById('pPhone').value.trim(),
    value: Number(document.getElementById('pValue').value)||0,
    nextFollowUp: document.getElementById('pFollowUp').value || null,
    leadSource: ui.newProspectLeadSource || null,
    stage:'lead', notes:'', createdAt:todayStr()
  });
  ui.newProspectLeadSource = null;
  playPositive();
  persist('business'); renderView();
}
function convertProspectToClient(p){
  if(!p) return null;
  if(p.convertedClientId) return p.convertedClientId;
  const clientId = uid();
  // Carry the whole lead history across: touchpoints, files, notes and timeline.
  const tps = arr(p.touchpoints).map(function(t){ return Object.assign({}, t); });
  state.business.clients.push({id:clientId, name:p.name, business:p.company, phone:p.phone||'', email:p.email||'', leadSource:p.leadSource||null, mrr:p.value||0, billingDay:1, status:'active', stage:'onboarding', notes:p.notes||'', deliverables:[], journal:[],
    touchpoints:tps, touches:tps.map(function(t){ return t.date; }), files:arr(p.files).map(function(f){ return Object.assign({}, f); }),
    timeline:arr(p.timeline).map(function(t){ return Object.assign({}, t); }).concat([{id:uid(), ts:Date.now(), type:'stage', text:'Won — converted from lead'}]),
    lifecycle:{checks:{}, enteredAt:{}, events:{}, links:{}},
    cadenceDays:null, fromLeadId:p.id, startDate:todayStr(), createdAt:todayStr()});
  p.convertedClientId = clientId;
  remapConvertedLeadRefs();
  // won clients start the default cycle straight away
  const nc = state.business.clients[state.business.clients.length-1];
  nc.cycleId = null; nc.cycleDone = false;
  if(crm().defaultCycleId) assignCycle(nc, crm().defaultCycleId);
  return clientId;
}
function advanceStageQuiet(id){
  const p = state.business.pipeline.find(function(x){ return x.id===id; }); if(!p) return;
  const idx = STAGE_ORDER.indexOf(p.stage);
  if(idx>=0 && idx<STAGE_ORDER.length-1){
    if(!Array.isArray(p.stageHistory)) p.stageHistory=[];
    p.stageHistory.push(p.stage);
    p.stage = STAGE_ORDER[idx+1];
  }
  if(p.stage==='closed') convertProspectToClient(p);
}
function advanceStage(id){
  const p = state.business.pipeline.find(function(x){ return x.id===id; }); if(!p) return;
  const idx = STAGE_ORDER.indexOf(p.stage);
  if(idx>=0 && idx<STAGE_ORDER.length-1){
    if(!Array.isArray(p.stageHistory)) p.stageHistory=[];
    p.stageHistory.push(p.stage);
    p.stage = STAGE_ORDER[idx+1];
  }
  let newClientId = null;
  if(p.stage==='closed'){
    newClientId = convertProspectToClient(p);
    playPositive();
  }
  persist('business');
  if(newClientId){
    openClientModal(newClientId, true);
    ui.pickingPackageForClient = newClientId;
    renderClientModalInto();
  } else {
    renderView();
  }
}
function undoStage(id){
  const p = state.business.pipeline.find(function(x){ return x.id===id; }); if(!p) return;
  if(!Array.isArray(p.stageHistory) || !p.stageHistory.length) return;
  const wasClosed = p.stage==='closed';
  p.stage = p.stageHistory.pop();
  if(wasClosed && p.stage!=='closed' && p.convertedClientId){
    const c = state.business.clients.find(function(x){ return x.id===p.convertedClientId; });
    if(c && !arr(c.deliverables).length && Number(c.mrr)===Number(p.value||0)){
      state.business.clients = state.business.clients.filter(function(x){ return x.id!==c.id; });
    }
    p.convertedClientId = null;
  }
  playTick();
  persist('business'); renderView();
}
function markLost(id){
  const p=state.business.pipeline.find(function(x){return x.id===id;}); if(!p) return;
  if(!Array.isArray(p.stageHistory)) p.stageHistory=[];
  p.stageHistory.push(p.stage);
  p.stage='lost'; persist('business'); renderView();
}
function setNewProspectLeadSource(val){
  ui.newProspectLeadSource = (ui.newProspectLeadSource===val) ? null : val;
  document.querySelectorAll('[data-action="setNewProspectLeadSource"]').forEach(function(chipEl){
    chipEl.classList.toggle('active', chipEl.dataset.value===ui.newProspectLeadSource);
  });
}
function convertToClient(id){
  const p = state.business.pipeline.find(function(x){ return x.id===id; }); if(!p) return;
  const already = !!p.convertedClientId;
  convertProspectToClient(p);
  if(!already) playPositive();
  persist('business'); renderView();
}

// Rename a client right from their page (business + contact name).
document.addEventListener('change', function(e){
  const t = e.target; if(!t || !t.dataset || !t.dataset.clientField) return;
  const c = state.business.clients.find(function(x){ return x.id===t.dataset.id; }); if(!c) return;
  const v = t.value.trim();
  if(t.dataset.clientField==='business'){ if(!v && !c.name){ t.value = c.business||''; return; } c.business = v; }
  else c.name = v;
  persist('business'); renderView();
});
