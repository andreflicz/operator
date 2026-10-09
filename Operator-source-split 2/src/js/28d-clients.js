
// ============ CLIENTS: cards + health, Lifecycle tab, Clients dashboard panel ============
// Clients tab = one card per client (health, deliverables, next touch, where they are in
// their cycle). The cycle board lives in its own Lifecycle tab. On Today, one Clients panel
// replaces Client Health / Reach Out Today / Client Next Steps.
const HEALTH_RANK = {red:0, yellow:1, green:2};
function clientInitials(c){
  const n = String(crmName('client', c)||'?').trim().split(/\s+/);
  return ((n[0]||'?')[0] + (n.length>1 ? n[n.length-1][0] : (n[0][1]||''))).toUpperCase();
}
function clientColor(c){
  const s = String((c.business||'')+(c.name||'')+c.id); let h = 2166136261;
  for(let i=0;i<s.length;i++){ h ^= s.charCodeAt(i); h = Math.imul(h, 16777619); }
  return 'hsl('+(Math.abs(h)%360)+',42%,40%)';
}
// Health is color only (the card edge and a ring round the initials); hover for the why.
function clientHealthTitle(c){ const hs = clientHealthStatus(c); return CLIENT_HEALTH_META[hs.level].label+' — '+clientHealthReason(c, hs); }
function clientAvatarHtml(c, small, withHealth){
  const hs = withHealth ? clientHealthStatus(c) : null;
  return '<span class="cc2-avatar'+(small?' cc2-avatar-sm':'')+(hs?' ring-'+hs.level:'')+'" style="background:'+clientColor(c)+'"'+(hs?' title="'+escapeHtml(clientHealthTitle(c))+'"':'')+'>'+escapeHtml(clientInitials(c))+'</span>';
}
function paceColorOf(p){ return p==='good' ? 'var(--good)' : p==='warn' ? 'var(--accent)' : 'var(--danger)'; }
function weekDotsHtml(done, target, pace){
  if(target>7) return '<span class="cc2-deliv-bar"><span style="width:'+Math.min(100, Math.round(done/target*100))+'%;background:'+paceColorOf(pace)+'"></span></span>';
  let h = '<span class="wk-dots">';
  for(let i=0;i<target;i++) h += '<span class="wk-dot'+(i<done?' on':'')+'" style="'+(i<done?'background:'+paceColorOf(pace)+';border-color:'+paceColorOf(pace):'')+'"></span>';
  return h+'</span>';
}
function clientDelivRowsHtml(c, compact){
  const recurring = arr(c.deliverables).filter(function(d){ return d.recurring; });
  if(!recurring.length) return '';
  return '<div class="cc2-delivs">'+recurring.map(function(d){
    const done = deliverableWeekCount(d), target = d.weeklyTarget||1;
    const pace = deliverablePaceStatus(d);
    const lw = deliverableLastWeek(d);
    const caughtUp = done>=lw.missed;
    const today = arr(d.completedDates).indexOf(todayStr())>=0;
    return '<div class="cc2-deliv" data-key="dv-'+c.id+'-'+d.id+'" title="'+escapeHtml(d.title)+': '+done+' of '+target+' this week · '+deliverableMonthCount(d)+' this month">'+
      '<span class="cc2-deliv-title">'+escapeHtml(d.title)+'</span>'+
      weekDotsHtml(Math.min(done, target), target, pace)+
      '<span class="cc2-deliv-count" style="color:'+paceColorOf(pace)+'">'+done+'/'+target+'</span>'+
      (lw.missed ? '<span class="cc2-owed'+(caughtUp?' is-caught':'')+'" title="Last week ended at '+lw.done+'/'+lw.target+(caughtUp?' — caught up this week':' — log '+lw.missed+' this week to catch up')+'">last wk '+lw.done+'/'+lw.target+'</span>' : '')+
      '<button class="cc2-deliv-btn cc2-plus'+(today?' did-today':'')+'" data-action="incrementDeliverableProgress" data-client="'+c.id+'" data-id="'+d.id+'" title="Log one">+</button>'+
    '</div>';
  }).join('')+'</div>';
}
function clientNextTouchHtml(c){
  if(!crmTracked('client', c)) return '<span class="kpi-sub">—</span>';
  const n = crmOverdueDays('client', c);
  return '<span class="crm-due '+overdueLevel(n)+'">'+dueLabel(n)+'</span>';
}
function clientCardV2(c){
  const active = clientStageActive(c.stage);
  const hs = active ? clientHealthStatus(c) : null;
  const st = crmStage('client', c.stage);
  return '<div class="cc2'+(hs?' hl-'+hs.level:' is-inactive')+'" data-key="cc2-'+c.id+'"'+(hs?' title="'+escapeHtml(clientHealthTitle(c))+'"':'')+'>'+
    '<div class="cc2-top" data-action="openContact" data-kind="client" data-id="'+c.id+'">'+
      clientAvatarHtml(c, false, !!hs)+
      '<div class="cc2-name"><div class="cc2-title">'+escapeHtml(crmName('client', c))+'</div>'+(crmSubName('client', c)?'<div class="kpi-sub">'+escapeHtml(crmSubName('client', c))+'</div>':'')+'</div>'+
      (hs ? (Number(c.mrr) ? '<span class="cc2-mrr">$'+Number(c.mrr).toLocaleString()+'<span>/mo</span></span>' : '')
          : '<span class="tag" style="background:'+(st?st.color:'#8A90A2')+'22;color:'+(st?st.color:'#8A90A2')+';">'+escapeHtml(st?st.label:'Inactive')+'</span>')+
    '</div>'+
    clientDelivRowsHtml(c, true)+
    (active ? '<div class="cc2-foot">'+clientNextTouchHtml(c)+'<span style="flex:1"></span>'+touchButtonsHtml('client', c)+'</div>'+touchMenuHtml('client', c) : '')+
  '</div>';
}
function clientSortFn(sort){
  const due = function(c){ const n = crmOverdueDays('client', c); return n==null ? -9999 : n; };
  if(sort==='name') return function(a,b){ return crmName('client',a).localeCompare(crmName('client',b)); };
  if(sort==='mrr') return function(a,b){ return (Number(b.mrr)||0)-(Number(a.mrr)||0); };
  if(sort==='due') return function(a,b){ return due(b)-due(a); };
  return function(a,b){ return HEALTH_RANK[clientHealthStatus(a).level]-HEALTH_RANK[clientHealthStatus(b).level] || due(b)-due(a); };
}
function renderClientsHome(){
  const f = crmUi('client');
  const q = (f.q||'').trim().toLowerCase();
  const all = crmList('client').filter(function(c){ return !q || [c.name, c.business, c.email, c.phone, c.notes].join(' ').toLowerCase().indexOf(q)>=0; });
  const active = all.filter(function(c){ return clientStageActive(c.stage); }).sort(clientSortFn(f.csort||'health'));
  const rest = all.filter(function(c){ return !clientStageActive(c.stage); });
  const levels = crmList('client').filter(function(c){ return clientStageActive(c.stage); }).map(function(c){ return clientHealthStatus(c).level; });
  const mrr = crmList('client').filter(function(c){ return clientStageActive(c.stage); }).reduce(function(a,c){ return a+(Number(c.mrr)||0); }, 0);
  const due = crmList('client').filter(function(c){ const n = crmOverdueDays('client', c); return n!=null && n>=0; }).length;
  const stat = function(v, k, cls){ return '<div class="cc2-stat'+(cls?' '+cls:'')+'"><div class="cc2-stat-v">'+v+'</div><div class="cc2-stat-k">'+k+'</div></div>'; };
  return '<div class="cc2-statrow">'+
      stat(levels.length, 'active client'+(levels.length===1?'':'s'))+
      stat('$'+mrr.toLocaleString(), 'MRR')+
      stat(levels.filter(function(l){ return l==='green'; }).length, 'healthy', 'is-good')+
      stat(levels.filter(function(l){ return l!=='green'; }).length, 'need attention', levels.some(function(l){ return l!=='green'; })?'is-warn':'')+
      stat(due, 'to reach out to', due?'is-warn':'')+
    '</div>'+
    '<div class="crm-toolbar">'+
      '<input class="input" id="crmSearch-client" placeholder="Search clients…" value="'+escapeHtml(f.q||'')+'" style="flex:1;min-width:180px;">'+
      '<select class="input" data-client-sort>'+[['health','Sort: needs attention first'],['due','Sort: most overdue touch'],['mrr','Sort: MRR'],['name','Sort: name']].map(function(o){ return '<option value="'+o[0]+'" '+((f.csort||'health')===o[0]?'selected':'')+'>'+o[1]+'</option>'; }).join('')+'</select>'+
      '<button class="btn btn-primary btn-sm" data-action="openNewContact" data-kind="client">+ Add client</button>'+
    '</div>'+
    '<div class="subtab-panel" data-key="clients-home">'+
      (active.length ? '<div class="cc2-grid">'+active.map(clientCardV2).join('')+'</div>' : '<div class="empty">'+(q?'No clients match.':'No active clients yet — add one, or win a lead.')+'</div>')+
      (rest.length ? '<div class="cc2-past"><button class="cc2-past-toggle" data-action="toggleClientsPast">'+(ui.clientsPastOpen?'&#9662;':'&#9656;')+' Paused &amp; past clients ('+rest.length+')</button>'+
        (ui.clientsPastOpen ? '<div class="cc2-grid cc2-grid-sm">'+rest.map(clientCardV2).join('')+'</div>' : '')+'</div>' : '')+
    '</div>';
}
ACTIONS.toggleClientsPast = function(){ ui.clientsPastOpen = !ui.clientsPastOpen; renderView(); };
document.addEventListener('change', function(e){ const t = e.target; if(t && t.dataset && t.dataset.clientSort!==undefined){ crmUi('client').csort = t.value; renderView(); } });
// ---- Lifecycle tab ----
function renderLifecycleTab(){
  const f = crmUi('client');
  const list = cycles();
  if(!list.length) return '<div class="empty">No client cycles yet. <button class="btn btn-primary btn-sm" data-action="openLifecycleEditor">Create your first cycle</button></div>';
  const cy = cycleById(f.cycleId) || list[0];
  f.cycleId = cy.id;
  const activeClients = crmList('client').filter(function(c){ return clientStageActive(c.stage); });
  const notIn = activeClients.filter(function(c){ return !c.cycleId || (c.cycleDone && c.cycleId!==cy.id); });
  const inCycle = activeClients.filter(function(c){ return c.cycleId===cy.id && !c.cycleDone; }).length;
  return '<div class="lc-tab-head">'+
      '<div class="cy-tabs" style="margin:0;">'+list.map(function(x){
        const n = activeClients.filter(function(c){ return c.cycleId===x.id && !c.cycleDone; }).length;
        return '<button class="cy-tab'+(x.id===cy.id?' active':'')+'" style="--cy:'+(x.color||'#E8A23D')+'" data-action="lcTabCycle" data-id="'+x.id+'"><span class="crm-col-dot" style="background:'+(x.color||'#E8A23D')+'"></span>'+escapeHtml(x.name)+'<span class="crm-col-count">'+n+'</span></button>';
      }).join('')+'</div>'+
      '<span style="flex:1"></span>'+
      '<button class="btn btn-ghost btn-sm" data-action="openLifecycleEditor" data-cycle="'+cy.id+'">&#9881; Edit cycles &amp; steps</button>'+
    '</div>'+
    '<div class="kpi-sub" style="margin:4px 0 12px;">'+inCycle+' client'+(inCycle===1?'':'s')+' going through '+escapeHtml(cy.name)+' &middot; drag a card to move them to another step.</div>'+
    '<div class="subtab-panel" data-key="lc-board-'+cy.id+'">'+renderCycleBoard()+'</div>'+
    (notIn.length ? '<div class="section" style="margin-top:18px;"><div class="section-title">Not in a cycle<span class="kpi-sub">active clients without a running cycle</span></div>'+
      '<div class="lc-notin">'+notIn.map(function(c){
        return '<div class="lc-notin-row" data-key="lcn-'+c.id+'"><span class="cc2-avatar cc2-avatar-sm" style="background:'+clientColor(c)+'">'+escapeHtml(clientInitials(c))+'</span>'+
          '<span class="lc-notin-name" data-action="openContact" data-kind="client" data-id="'+c.id+'">'+escapeHtml(crmName('client', c))+'</span>'+
          (c.cycleDone ? '<span class="kpi-sub">finished '+escapeHtml((clientCycle(c)||{}).name||'')+'</span>' : '')+
          '<span style="flex:1"></span><button class="mini-move mini-move-today" data-action="lcStartCycle" data-id="'+c.id+'" data-cycle="'+cy.id+'">Start '+escapeHtml(cy.name)+' &rarr;</button></div>';
      }).join('')+'</div></div>' : '');
}
ACTIONS.lcTabCycle = function(el, e, id){ crmUi('client').cycleId = id; renderView(); };
// ---- Clients panel on Today ----
function clientNextStepHtml(c){
  if(c.cycleDone || !clientCycle(c)) return '';
  const st = clientStep(c); if(!st) return '';
  const open = st.checklist.filter(function(it){ return !lcItemDone(c, st, it); });
  return '<div class="hub-step"><span class="tag" style="background:'+st.color+'22;color:'+st.color+';">'+escapeHtml(st.label)+'</span>'+
    (open.length ? lcItemHtml(c, st, open[0], true)+(open.length>1?'<span class="kpi-sub" style="cursor:pointer;" data-action="openContact" data-kind="client" data-id="'+c.id+'">+'+(open.length-1)+'</span>':'')
                 : '<span class="kpi-sub">step done &mdash; move them on</span>')+
  '</div>';
}
function renderClientHubPanel(){
  const clients = crmList('client').filter(function(c){ return clientStageActive(c.stage); }).sort(clientSortFn('health'));
  const leadsDue = reachOutList().filter(function(r){ return r.kind==='lead'; });
  if(!clients.length && !leadsDue.length) return '';
  return '<div class="section client-hub">'+
    '<div class="section-title">Clients<span class="view-all-link" data-action="goToClients">All clients &rarr;</span></div>'+
    (clients.length ? '<div class="hub-grid">'+clients.map(function(c){
      const hs = clientHealthStatus(c);
      return '<div class="hub-card hl-'+hs.level+'" data-key="hub-'+c.id+'">'+
        '<div class="hub-head" title="'+escapeHtml(clientHealthTitle(c))+'">'+clientAvatarHtml(c, true, true)+
          '<span class="hub-name" data-action="openContact" data-kind="client" data-id="'+c.id+'">'+escapeHtml(crmName('client', c))+'</span></div>'+
        clientDelivRowsHtml(c, true)+
        clientNextStepHtml(c)+
        '<div class="hub-foot">'+clientNextTouchHtml(c)+'<span style="flex:1"></span>'+touchButtonsHtml('client', c)+'</div>'+touchMenuHtml('client', c)+
      '</div>';
    }).join('')+'</div>' : '')+
    (leadsDue.length ? '<div class="hub-leads"><span class="kind-label" style="margin:0 6px 0 0;">Leads to reach out to</span>'+leadsDue.slice(0, 8).map(function(r){
      return '<span class="hub-lead '+overdueLevel(r.n)+'" data-key="hl-'+r.x.id+'"><span class="hub-lead-name" data-action="openContact" data-kind="lead" data-id="'+r.x.id+'">'+escapeHtml(crmName('lead', r.x))+'</span><span class="crm-due '+overdueLevel(r.n)+'">'+dueLabel(r.n)+'</span>'+touchButtonsHtml('lead', r.x)+touchMenuHtml('lead', r.x)+'</span>';
    }).join('')+(leadsDue.length>8?'<span class="view-all-link" data-action="goToLeads">+'+(leadsDue.length-8)+' more</span>':'')+'</div>' : '')+
  '</div>';
}
ACTIONS.goToClients = function(){ ui.view='business'; ui.businessTab='clients'; renderView(); };
