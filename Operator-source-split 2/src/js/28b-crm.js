
// ============ CRM: LEADS → CLIENTS LIFECYCLE ============
// One contact model across two lists: leads live in business.pipeline and clients in
// business.clients (existing records and every id that tasks, invoices, events and
// packages point at stay exactly as they were). Both share the same contact layer:
// editable stages, touchpoints with a cadence ("next touch due"), files, and a timeline.
// "Won" converts a lead into a client and carries all of that history across.
const TOUCH_TYPES = [
  {id:'call', icon:'&#128222;', label:'Call'},
  {id:'text', icon:'&#128172;', label:'Text'},
  {id:'dm', icon:'&#128241;', label:'DM'},
  {id:'email', icon:'&#9993;&#65039;', label:'Email'},
  {id:'meeting', icon:'&#129309;', label:'Meeting'},
  {id:'inperson', icon:'&#128694;', label:'In person'}
];
function touchTypeById(id){ return TOUCH_TYPES.find(function(t){ return t.id===id; }) || {id:'other', icon:'&#8226;', label:'Touch'}; }
function defaultCrm(){
  return {
    leadStages:[
      {id:'lead', label:'New', color:'#8A90A2'},
      {id:'contacted', label:'Contacted', color:'#8fdcff'},
      {id:'discovery', label:'Call booked', color:'#E8A23D'},
      {id:'proposal', label:'Proposal sent', color:'#f3c988'},
      {id:'closed', label:'Won', color:'#3FBE8E', kind:'won'},
      {id:'lost', label:'Lost', color:'#E8636B', kind:'lost'}
    ],
    clientStages:[
      {id:'onboarding', label:'Onboarding', color:'#8fdcff', active:true},
      {id:'active', label:'Active', color:'#3FBE8E', active:true},
      {id:'atrisk', label:'At risk', color:'#E8A23D', active:true},
      {id:'paused', label:'Paused', color:'#8A90A2', active:false},
      {id:'churned', label:'Churned', color:'#E8636B', active:false, kind:'churned'}
    ],
    leadCadenceDays:2, clientCadenceDays:7,
    dailyReminder:{enabled:false, time:'09:00'},
    lastTouchType:'text'
  };
}
let crmMigratedOnLoad = false;
// Called at the end of normalizeBusiness: fills in the CRM layer without changing anything
// that was already there.
function normalizeCrmData(b){
  const d = defaultCrm();
  if(!b.crm || typeof b.crm!=='object') b.crm = d;
  ['leadStages','clientStages'].forEach(function(k){ if(!Array.isArray(b.crm[k]) || !b.crm[k].length) b.crm[k] = d[k]; });
  ['leadCadenceDays','clientCadenceDays','lastTouchType'].forEach(function(k){ if(b.crm[k]==null) b.crm[k] = d[k]; });
  if(!b.crm.dailyReminder || typeof b.crm.dailyReminder!=='object') b.crm.dailyReminder = d.dailyReminder;
  const leadIds = b.crm.leadStages.map(function(s){ return s.id; });
  const clientIds = b.crm.clientStages.map(function(s){ return s.id; });
  const common = function(x){
    if(!Array.isArray(x.timeline)) x.timeline = [];
    if(!Array.isArray(x.files)) x.files = [];
    if(x.cadenceDays===undefined) x.cadenceDays = null;
  };
  b.pipeline.forEach(function(p){
    common(p);
    if(!Array.isArray(p.touchpoints)){ p.touchpoints = []; crmMigratedOnLoad = true; }
    if(leadIds.indexOf(p.stage)<0) p.stage = leadIds[0];
  });
  b.clients.forEach(function(c){
    common(c);
    if(!c.stage){ c.stage = c.status==='paused' ? 'paused' : 'active'; crmMigratedOnLoad = true; }
    if(clientIds.indexOf(c.stage)<0) c.stage = 'active';
    if(!Array.isArray(c.touchpoints)){
      // existing "touches" (dates only) become touchpoints so history isn't lost
      c.touchpoints = arr(c.touches).map(function(dt, i){ return {id:'tp'+c.id+'-'+i, type:'other', date:dt, note:''}; });
      crmMigratedOnLoad = true;
    }
    syncClientStatus(c, b);
  });
  normalizeLifecycle(b);
}
function crm(){ return state.business.crm; }
function crmStages(kind){ return kind==='lead' ? crm().leadStages : crm().clientStages; }
function crmStage(kind, id){ return crmStages(kind).find(function(s){ return s.id===id; }) || null; }
function crmList(kind){ return kind==='lead' ? state.business.pipeline : state.business.clients; }
function crmFind(kind, id){ return crmList(kind).find(function(x){ return x.id===id; }) || null; }
function crmName(kind, x){ return kind==='lead' ? (x.company||x.name||'Lead') : (x.business||x.name||'Client'); }
function crmSubName(kind, x){ const main = crmName(kind,x); const n = x.name||''; return n && n!==main ? n : ''; }
function clientStageActive(stageId, b){
  const stages = (b||state.business).crm ? (b||state.business).crm.clientStages : defaultCrm().clientStages;
  const st = stages.find(function(s){ return s.id===stageId; });
  return st ? st.active!==false : true;
}
function syncClientStatus(c, b){ c.status = clientStageActive(c.stage, b) ? 'active' : 'paused'; }
function leadIsOpen(p){ const st = crmStage('lead', p.stage); return !(st && (st.kind==='won' || st.kind==='lost')) && !p.convertedClientId; }
function crmTracked(kind, x){ return kind==='lead' ? leadIsOpen(x) : clientStageActive(x.stage); }
function crmCadence(kind, x){ return Number(x.cadenceDays) || (kind==='lead' ? crm().leadCadenceDays : crm().clientCadenceDays) || 7; }
function crmLastTouch(kind, x){
  if(RC) return memo('lt:'+kind+':'+x.id, function(){ return crmLastTouchRaw(kind, x); });
  return crmLastTouchRaw(kind, x);
}
function crmLastTouchRaw(kind, x){
  const dates = arr(x.touchpoints).map(function(t){ return t.date; });
  if(kind==='client') arr(x.touches).forEach(function(d){ dates.push(d); });
  if(!dates.length) return null;
  return dates.sort()[dates.length-1];
}
function crmNextDue(kind, x){
  const base = crmLastTouch(kind, x) || x.createdAt || todayStr();
  return addDays(base, crmCadence(kind, x));
}
function crmOverdueDays(kind, x){ return crmTracked(kind, x) ? daysAgoFrom(crmNextDue(kind, x)) : null; }
function overdueLevel(n){ if(n==null || n<0) return ''; if(n===0) return 'due-0'; if(n<=2) return 'due-1'; if(n<=6) return 'due-2'; return 'due-3'; }
function dueLabel(n, kind, x){
  if(n==null) return '';
  if(n<0) return 'touch in '+(-n)+'d';
  if(n===0) return 'touch due today';
  return n+'d overdue';
}
function crmTimeline(x, type, text){
  if(!Array.isArray(x.timeline)) x.timeline = [];
  x.timeline.push({id:uid(), ts:Date.now(), type:type, text:text});
}
// ---- touchpoints ----
let lastTouchLogged = null;
function logTouch(kind, id, type, date, note){
  const x = crmFind(kind, id); if(!x) return;
  type = type || x.lastTouchType || crm().lastTouchType || 'text';
  date = date || todayStr();
  const tp = {id:uid(), type:type, date:date, note:note||'', ts:Date.now()};
  if(!Array.isArray(x.touchpoints)) x.touchpoints = [];
  x.touchpoints.push(tp);
  if(kind==='client'){ if(!Array.isArray(x.touches)) x.touches=[]; x.touches.push(date); }
  x.lastTouchType = type;
  crm().lastTouchType = type;
  lastTouchLogged = {kind:kind, id:id, tpId:tp.id, date:date};
  playPositive();
  persist('business'); renderView();
  const tt = touchTypeById(type);
  showToast('Logged a '+tt.label.toLowerCase()+' with '+crmName(kind,x), {icon:tt.icon, actionLabel:'Undo', actionAction:'undoLastTouch', duration:5000});
}
ACTIONS.undoLastTouch = function(){
  const l = lastTouchLogged; if(!l) return;
  const x = crmFind(l.kind, l.id); if(!x) return;
  x.touchpoints = arr(x.touchpoints).filter(function(t){ return t.id!==l.tpId; });
  if(l.kind==='client'){ const i = arr(x.touches).lastIndexOf(l.date); if(i>=0) x.touches.splice(i,1); }
  lastTouchLogged = null;
  const c = document.getElementById('toastContainer'); if(c) c.innerHTML='';
  persist('business'); renderView();
};
ACTIONS.quickTouch = function(el){ logTouch(el.dataset.kind, el.dataset.id); };
ACTIONS.toggleTouchMenu = function(el){ const k = el.dataset.kind+':'+el.dataset.id; ui.touchMenu = ui.touchMenu===k ? null : k; renderView(); if(overlayOpen('clientModalOverlay')) renderClientModalInto(); };
ACTIONS.logTouchType = function(el){ ui.touchMenu = null; logTouch(el.dataset.kind, el.dataset.id, el.dataset.type); };
ACTIONS.logTouchFromForm = function(el){
  const kind = el.dataset.kind, id = el.dataset.id;
  const typeEl = document.querySelector('[name="crmTouchType-'+id+'"]:checked');
  const dateEl = document.getElementById('crmTouchDate-'+id);
  const noteEl = document.getElementById('crmTouchNote-'+id);
  logTouch(kind, id, typeEl ? typeEl.value : null, dateEl && dateEl.value ? dateEl.value : todayStr(), noteEl ? noteEl.value.trim() : '');
  if(noteEl) noteEl.value = '';
  rerenderContactModal();
};
ACTIONS.deleteTouchpoint = function(el){
  const x = crmFind(el.dataset.kind, el.dataset.id); if(!x) return;
  const tp = arr(x.touchpoints).find(function(t){ return t.id===el.dataset.tp; }); if(!tp) return;
  x.touchpoints = x.touchpoints.filter(function(t){ return t!==tp; });
  if(el.dataset.kind==='client'){ const i = arr(x.touches).lastIndexOf(tp.date); if(i>=0) x.touches.splice(i,1); }
  persist('business'); renderView(); rerenderContactModal();
};
function touchMenuHtml(kind, x){
  if(ui.touchMenu!==kind+':'+x.id) return '';
  return '<div class="touch-menu">'+TOUCH_TYPES.map(function(t){
    return '<button class="touch-menu-btn" data-action="logTouchType" data-kind="'+kind+'" data-id="'+x.id+'" data-type="'+t.id+'" title="Log a '+t.label.toLowerCase()+'">'+t.icon+'<span>'+t.label+'</span></button>';
  }).join('')+'</div>';
}
function touchButtonsHtml(kind, x){
  const last = touchTypeById(x.lastTouchType || crm().lastTouchType);
  const touched = crmLastTouch(kind, x)===todayStr();
  return '<div class="touch-btns'+(touched?' is-touched':'')+'">'+
    '<button class="touch-log-btn" data-action="quickTouch" data-kind="'+kind+'" data-id="'+x.id+'" title="'+(touched?'Touched today — log another ':'Log a ')+last.label.toLowerCase()+' (today)">'+(touched?'&#10003;':last.icon)+'</button>'+
    '<button class="touch-more-btn" data-action="toggleTouchMenu" data-kind="'+kind+'" data-id="'+x.id+'" title="Log a call, text, DM, email…">&#8964;</button>'+
  '</div>';
}
// ---- stages ----
function setStage(kind, id, stageId, opts){
  const x = crmFind(kind, id); if(!x || x.stage===stageId) return;
  const st = crmStage(kind, stageId); if(!st) return;
  if(kind==='lead' && st.kind==='lost' && !(opts && opts.reasonGiven)){ openLostReason(id); return; }
  const from = crmStage(kind, x.stage);
  if(kind==='lead'){ if(!Array.isArray(x.stageHistory)) x.stageHistory=[]; x.stageHistory.push(x.stage); }
  x.stage = stageId;
  crmTimeline(x, 'stage', (from?from.label:'—')+' → '+st.label);
  if(kind==='client'){ syncClientStatus(x); if(!x.lifecycle) x.lifecycle = {checks:{}, enteredAt:{}}; x.lifecycle.enteredAt[stageId] = Date.now(); }
  let newClientId = null;
  if(kind==='lead' && st.kind==='won' && !x.convertedClientId){ newClientId = convertProspectToClient(x); playSessionComplete(); }
  else playTick();
  persist('business');
  if(newClientId){
    showToast(crmName('lead',x)+' is now a client', {icon:'&#127881;', actionLabel:'Open', actionAction:'openConvertedClient', duration:6000});
    ui.lastConvertedClientId = newClientId;
  }
  renderView(); rerenderContactModal();
}
ACTIONS.openConvertedClient = function(){ if(ui.lastConvertedClientId){ hideOverlay('contactOverlay'); openClientModal(ui.lastConvertedClientId); } };
document.addEventListener('change', function(e){
  const t = e.target; if(!t || !t.dataset) return;
  if(t.dataset.crmStage){ const p = t.dataset.crmStage.split(':'); setStage(p[0], p[1], t.value); }
  if(t.dataset.crmCadence){ const p = t.dataset.crmCadence.split(':'); const x = crmFind(p[0], p[1]); if(x){ x.cadenceDays = Number(t.value)||null; persist('business'); renderView(); rerenderContactModal(); } }
  if(t.dataset.fileRename){ const p = t.dataset.fileRename.split(':'); const x = crmFind(p[0], p[1]); const f = x && arr(x.files).find(function(ff){ return ff.id===p[2]; }); if(f && t.value.trim()){ f.name = t.value.trim(); persist('business'); } }
});
// Lost (with optional reason)
function openLostReason(id){ ui.lostLeadId = id; showOverlay('lostReasonOverlay'); renderLostReasonInto(); }
function renderLostReason(){
  const p = crmFind('lead', ui.lostLeadId); if(!p) return '';
  return '<div class="section-title" style="margin-bottom:4px;">Mark '+escapeHtml(crmName('lead',p))+' as lost</div>'+
    '<div class="kpi-sub" style="margin-bottom:12px;">Optional — why didn\'t it close?</div>'+
    '<div class="row" style="gap:6px;margin-bottom:10px;">'+['Price','Timing','Went elsewhere','No response','Not a fit'].map(function(r){ return '<span class="chip" data-action="pickLostReason" data-id="'+escapeHtml(r)+'">'+r+'</span>'; }).join('')+'</div>'+
    '<input class="input" id="lostReasonInput" placeholder="Reason (optional)" style="width:100%;">'+
    '<div class="row" style="margin-top:16px;justify-content:flex-end;"><button class="btn btn-ghost" data-action="cancelLost">Cancel</button><button class="btn btn-danger" data-action="confirmLost">Mark lost</button></div>';
}
function renderLostReasonInto(){ const el=document.getElementById('lostReasonContent'); if(el) morphInto(el, renderLostReason(), {form:true}); }
registerModal('lostReasonOverlay', renderLostReasonInto);
ACTIONS.pickLostReason = function(el, e, id){ const i = document.getElementById('lostReasonInput'); if(i) i.value = id; };
ACTIONS.cancelLost = function(){ ui.lostLeadId = null; hideOverlay('lostReasonOverlay'); renderView(); };
ACTIONS.confirmLost = function(){
  const p = crmFind('lead', ui.lostLeadId); if(!p) return;
  const reason = (document.getElementById('lostReasonInput')||{}).value||'';
  p.lostReason = reason.trim() || null;
  hideOverlay('lostReasonOverlay');
  const lostStage = crmStages('lead').find(function(s){ return s.kind==='lost'; });
  ui.lostLeadId = null;
  setStage('lead', p.id, lostStage.id, {reasonGiven:true});
  if(p.lostReason){ crmTimeline(p, 'note', 'Lost reason: '+p.lostReason); persist('business'); }
};
// ---- drag between stages ----
document.addEventListener('dragstart', function(e){
  const card = e.target.closest && e.target.closest('[data-crm-drag]');
  if(!card) return;
  e.dataTransfer.setData('text/x-crm', card.dataset.crmDrag);
  e.dataTransfer.effectAllowed = 'move';
  card.classList.add('is-dragging');
});
document.addEventListener('dragend', function(e){
  const card = e.target.closest && e.target.closest('[data-crm-drag]');
  if(card) card.classList.remove('is-dragging');
  document.querySelectorAll('.crm-col.drop-over').forEach(function(c){ c.classList.remove('drop-over'); });
});
document.addEventListener('dragover', function(e){
  const col = e.target.closest && e.target.closest('[data-crm-drop]');
  if(!col || !e.dataTransfer || Array.prototype.indexOf.call(e.dataTransfer.types,'text/x-crm')<0) return;
  e.preventDefault();
  document.querySelectorAll('.crm-col.drop-over').forEach(function(c){ if(c!==col) c.classList.remove('drop-over'); });
  col.classList.add('drop-over');
});
document.addEventListener('drop', function(e){
  const col = e.target.closest && e.target.closest('[data-crm-drop]');
  if(!col) return;
  const data = e.dataTransfer.getData('text/x-crm'); if(!data) return;
  e.preventDefault();
  col.classList.remove('drop-over');
  const src = data.split(':'), dst = col.dataset.crmDrop.split(':');
  if(src[0]!==dst[0]) return;
  setStage(src[0], src[1], dst[1]);
});
// ---- board + list ----
function crmUi(kind){
  ui.crm = ui.crm || {};
  if(!ui.crm[kind]) ui.crm[kind] = {view:'board', q:'', stage:'', source:'', last:'', sort:'due'};
  return ui.crm[kind];
}
function crmFiltered(kind){
  const f = crmUi(kind);
  const q = (f.q||'').trim().toLowerCase();
  let list = crmList(kind).filter(function(x){
    if(q){
      const hay = [x.name, x.company, x.business, x.phone, x.email, x.trade, x.notes].join(' ').toLowerCase();
      if(hay.indexOf(q)<0) return false;
    }
    if(f.stage && x.stage!==f.stage) return false;
    if(f.source && (x.leadSource||'')!==f.source) return false;
    if(f.last){
      const lt = crmLastTouch(kind, x);
      if(f.last==='never'){ if(lt) return false; }
      else if(f.last==='due'){ const n = crmOverdueDays(kind,x); if(n==null || n<0) return false; }
      else { const days = Number(f.last); if(lt && daysAgoFrom(lt) < days) return false; }
    }
    return true;
  });
  const val = function(x){ return Number(kind==='lead' ? x.value : x.mrr)||0; };
  const sorts = {
    due: function(a,b){ const da = crmOverdueDays(kind,a), db = crmOverdueDays(kind,b); return (db==null?-9999:db)-(da==null?-9999:da); },
    last: function(a,b){ return (crmLastTouch(kind,a)||'').localeCompare(crmLastTouch(kind,b)||''); },
    value: function(a,b){ return val(b)-val(a); },
    name: function(a,b){ return crmName(kind,a).localeCompare(crmName(kind,b)); },
    created: function(a,b){ return (b.createdAt||'').localeCompare(a.createdAt||''); }
  };
  return list.slice().sort(sorts[f.sort]||sorts.due);
}
// Search, filters and sort sit behind one button so the page stays clean; a badge shows how
// many are active while it's closed.
function crmFiltersActive(kind){
  const f = crmUi(kind);
  return (f.q?1:0)+(f.stage?1:0)+(f.source?1:0)+(f.last?1:0)+((f.sort||'due')!=='due'?1:0);
}
function crmToolsBtnHtml(kind, active){
  const f = crmUi(kind);
  return (active ? '<button class="mini-move" data-action="crmClearFilters" data-kind="'+kind+'">Clear</button>' : '')+
    '<button class="crm-tools-btn'+(f.toolsOpen?' is-open':'')+'" data-action="crmToggleTools" data-kind="'+kind+'">&#128269; Search &amp; sort'+(active?'<span class="th-badge">'+active+'</span>':'')+'</button>';
}
function crmToolbar(kind, lead){
  const f = crmUi(kind);
  const sources = LEAD_SOURCES;
  const active = crmFiltersActive(kind);
  return '<div class="crm-toolbar crm-toolbar-slim">'+
      (lead||'')+
      '<span style="flex:1"></span>'+
      crmToolsBtnHtml(kind, active)+
      '<div class="seg-tabs" style="margin:0;">'+
        '<button class="seg-tab'+(f.view==='board'?' active':'')+'" data-action="crmView" data-kind="'+kind+'" data-id="board">Board</button>'+
        '<button class="seg-tab'+(f.view==='list'?' active':'')+'" data-action="crmView" data-kind="'+kind+'" data-id="list">List</button>'+
      '</div>'+
      '<button class="btn btn-primary crm-add-btn" data-action="openNewContact" data-kind="'+kind+'">+ Add '+(kind==='lead'?'lead':'client')+'</button>'+
    '</div>'+
    (f.toolsOpen ? '<div class="crm-toolbar crm-tools-row">'+
      '<input class="input" id="crmSearch-'+kind+'" placeholder="Search '+(kind==='lead'?'leads':'clients')+'…" value="'+escapeHtml(f.q||'')+'" style="flex:1;min-width:180px;">'+
      '<select class="input" data-crm-filter="'+kind+':stage"><option value="">All stages</option>'+crmStages(kind).map(function(s){ return '<option value="'+s.id+'" '+(f.stage===s.id?'selected':'')+'>'+escapeHtml(s.label)+'</option>'; }).join('')+'</select>'+
      '<select class="input" data-crm-filter="'+kind+':source"><option value="">Any source</option>'+sources.map(function(s){ return '<option value="'+s.id+'" '+(f.source===s.id?'selected':'')+'>'+s.label+'</option>'; }).join('')+'</select>'+
      '<select class="input" data-crm-filter="'+kind+':last"><option value="">Last contacted: any</option>'+[['due','Touch due / overdue'],['7','Not in 7+ days'],['14','Not in 14+ days'],['30','Not in 30+ days'],['never','Never contacted']].map(function(o){ return '<option value="'+o[0]+'" '+(f.last===o[0]?'selected':'')+'>'+o[1]+'</option>'; }).join('')+'</select>'+
      '<select class="input" data-crm-filter="'+kind+':sort">'+[['due','Sort: most overdue'],['last','Sort: last contacted'],['value','Sort: '+(kind==='lead'?'value':'MRR')],['name','Sort: name'],['created','Sort: newest']].map(function(o){ return '<option value="'+o[0]+'" '+(f.sort===o[0]?'selected':'')+'>'+o[1]+'</option>'; }).join('')+'</select>'+
    '</div>' : '');
}
ACTIONS.crmToggleTools = function(el){
  const kind = el.dataset.kind, f = crmUi(kind);
  f.toolsOpen = !f.toolsOpen; renderView();
  if(f.toolsOpen){ const i = document.getElementById('crmSearch-'+kind); if(i) i.focus(); }
};
ACTIONS.crmClearFilters = function(el){
  const f = crmUi(el.dataset.kind);
  f.q = ''; f.stage = ''; f.source = ''; f.last = ''; f.sort = 'due'; f.csort = 'health';
  renderView();
};
ACTIONS.crmView = function(el, e, id){ crmUi(el.dataset.kind).view = id; renderView(); };
document.addEventListener('change', function(e){
  const t = e.target; if(!t || !t.dataset || !t.dataset.crmFilter) return;
  const p = t.dataset.crmFilter.split(':'); crmUi(p[0])[p[1]] = t.value; renderView();
});
let crmSearchTimer = null;
document.addEventListener('input', function(e){
  const t = e.target; if(!t || !t.id || t.id.indexOf('crmSearch-')!==0) return;
  const kind = t.id.slice('crmSearch-'.length);
  crmUi(kind).q = t.value;
  clearTimeout(crmSearchTimer); crmSearchTimer = setTimeout(renderView, 120);
});
function crmCard(kind, x){
  const n = crmOverdueDays(kind, x);
  const lvl = overdueLevel(n);
  const src = x.leadSource ? leadSourceById(x.leadSource) : null;
  const money = Number(kind==='lead' ? x.value : x.mrr)||0;
  const lt = crmLastTouch(kind, x);
  const hl = kind==='client' && x.status==='active' ? ' hl-'+clientHealthStatus(x).level : '';
  return '<div class="crm-card '+lvl+hl+'" draggable="true" data-crm-drag="'+kind+':'+x.id+'" data-key="crm-'+x.id+'">'+
    '<div class="crm-card-main" data-action="openContact" data-kind="'+kind+'" data-id="'+x.id+'">'+
      '<div class="crm-card-name">'+escapeHtml(crmName(kind,x))+'</div>'+
      (crmSubName(kind,x) ? '<div class="kpi-sub">'+escapeHtml(crmSubName(kind,x))+'</div>' : '')+
      '<div class="crm-card-meta">'+
        (money ? '<span class="crm-money">$'+money.toLocaleString()+(kind==='client'?'/mo':'')+'</span>' : '')+
        (src ? '<span class="tag" style="background:'+src.color+'22;color:'+src.color+';">'+src.emoji+' '+escapeHtml(src.label)+'</span>' : '')+
        (kind==='client' && x.status==='active' ? '<span class="health-dot-sm hd-'+clientHealthStatus(x).level+'" title="'+escapeHtml(clientHealthTitle(x))+'"></span>' : '')+
      '</div>'+
      (kind==='client' ? lcBadgeHtml(x) : '')+
      (x.lostReason && x.stage==='lost' ? '<div class="kpi-sub">Lost: '+escapeHtml(x.lostReason)+'</div>' : '')+
      (x.convertedClientId ? '<div class="kpi-sub" style="color:var(--good);">&#10003; Now a client</div>' : '')+
    '</div>'+
    (crmTracked(kind,x) ? '<div class="crm-card-foot">'+
      '<span class="crm-due '+lvl+'" title="Last touch: '+(lt?fmtDateShort(lt):'never')+' · every '+crmCadence(kind,x)+'d">'+dueLabel(n)+'</span>'+
      touchButtonsHtml(kind, x)+
    '</div>'+touchMenuHtml(kind, x) : '')+
  '</div>';
}
function renderCrmBoard(kind){
  const list = crmFiltered(kind);
  const f = crmUi(kind);
  const stages = crmStages(kind).filter(function(s){ return !f.stage || s.id===f.stage; });
  return carouselWrap(stages.map(function(st){
    const items = list.filter(function(x){ return x.stage===st.id; });
    const total = items.reduce(function(a,x){ return a+(Number(kind==='lead'?x.value:x.mrr)||0); },0);
    const closed = st.kind==='won' || st.kind==='lost' || st.kind==='churned';
    const shown = closed ? items.slice(0, 12) : items;
    return '<div class="crm-col'+(closed?' is-closed':'')+'" data-crm-drop="'+kind+':'+st.id+'" data-key="col-'+kind+'-'+st.id+'">'+
      '<div class="crm-col-head"><span class="crm-col-dot" style="background:'+st.color+'"></span><span class="crm-col-title">'+escapeHtml(st.label)+'</span><span class="crm-col-count">'+items.length+'</span>'+(total?'<span class="kpi-sub" style="margin-left:auto;">$'+total.toLocaleString()+'</span>':'')+'</div>'+
      '<div class="crm-col-body">'+shown.map(function(x){ return crmCard(kind, x); }).join('')+
        (items.length>shown.length ? '<div class="kpi-sub" style="text-align:center;padding:6px;">+'+(items.length-shown.length)+' more — use List view</div>' : '')+
        (!items.length ? '<div class="crm-col-empty">Drop here</div>' : '')+
      '</div>'+
    '</div>';
  }).join(''), 'crm-'+kind, {fit:!carouselOn(), w:272, trackCls:'crm-board', cls:'crm-car'});
}
function renderCrmList(kind){
  const list = crmFiltered(kind);
  if(!list.length) return '<div class="empty">Nothing matches these filters.</div>';
  return '<div class="crm-list">'+
    '<div class="crm-row crm-row-head"><span>Name</span><span>Stage</span><span>Source</span><span>'+(kind==='lead'?'Value':'MRR')+'</span><span>Last contacted</span><span>Next touch</span><span></span></div>'+
    list.map(function(x){
      const n = crmOverdueDays(kind,x), lt = crmLastTouch(kind,x);
      const st = crmStage(kind, x.stage);
      const src = x.leadSource ? leadSourceById(x.leadSource) : null;
      return '<div class="crm-row '+overdueLevel(n)+'" data-key="row-'+x.id+'">'+
        '<span class="crm-row-name" data-action="openContact" data-kind="'+kind+'" data-id="'+x.id+'"><b>'+escapeHtml(crmName(kind,x))+'</b>'+(crmSubName(kind,x)?' <span class="kpi-sub">'+escapeHtml(crmSubName(kind,x))+'</span>':'')+'</span>'+
        '<span><select class="input input-sm" data-crm-stage="'+kind+':'+x.id+'">'+crmStages(kind).map(function(s){ return '<option value="'+s.id+'" '+(x.stage===s.id?'selected':'')+'>'+escapeHtml(s.label)+'</option>'; }).join('')+'</select></span>'+
        '<span class="kpi-sub">'+(src?src.emoji+' '+src.label:'—')+'</span>'+
        '<span>'+(Number(kind==='lead'?x.value:x.mrr) ? '$'+Number(kind==='lead'?x.value:x.mrr).toLocaleString() : '—')+'</span>'+
        '<span class="kpi-sub">'+(lt ? relativeDayLabel(lt) : 'never')+'</span>'+
        '<span class="crm-due '+overdueLevel(n)+'">'+(crmTracked(kind,x) ? dueLabel(n) : (st?st.label:''))+'</span>'+
        '<span>'+(crmTracked(kind,x) ? touchButtonsHtml(kind,x) : '')+'</span>'+
        touchMenuHtml(kind, x)+
      '</div>';
    }).join('')+
  '</div>';
}
function renderCrmTab(kind){
  const f = crmUi(kind);
  const all = crmList(kind);
  const tracked = all.filter(function(x){ return crmTracked(kind,x); });
  const due = tracked.filter(function(x){ return crmOverdueDays(kind,x)>=0; }).length;
  const header = kind==='lead'
    ? '<div class="crm-stats"><span><b>'+tracked.length+'</b> open leads</span><span><b>$'+tracked.reduce(function(a,p){ return a+(Number(p.value)||0); },0).toLocaleString()+'</b> in pipeline</span><span class="'+(due?'crm-stat-due':'')+'"><b>'+due+'</b> to reach out to</span></div>'
    : '<div class="crm-stats"><span><b>'+tracked.length+'</b> active clients</span><span><b>$'+tracked.reduce(function(a,c){ return a+(Number(c.mrr)||0); },0).toLocaleString()+'</b> MRR</span><span class="'+(due?'crm-stat-due':'')+'"><b>'+due+'</b> to reach out to</span></div>';
  const cycleMode = kind==='client' && f.group==='cycle';
  return crmToolbar(kind, header)+(cycleMode ? cycleGroupBar() : '')+'<div class="subtab-panel" data-key="crm-'+kind+'-'+f.view+(cycleMode?'-cy':'')+'">'+(f.view==='list' ? renderCrmList(kind) : cycleMode ? renderCycleBoard() : renderCrmBoard(kind))+'</div>';
}
// ---- Reach out today (Focus page) ----
function reachOutList(){
  const out = [];
  ['client','lead'].forEach(function(kind){
    crmList(kind).forEach(function(x){
      const n = crmOverdueDays(kind, x);
      if(n!=null && n>=0) out.push({kind:kind, x:x, n:n});
    });
  });
  return out.sort(function(a,b){ return b.n-a.n; });
}
function renderReachOutPanel(compact){
  const list = reachOutList();
  if(compact && !list.length) return '';
  return '<div class="section">'+
    '<div class="section-title" style="'+(compact?'justify-content:center;':'')+'">Reach Out Today<span class="kpi-sub">'+(list.length ? list.length+' due · most overdue first' : 'everyone\'s been touched')+'</span>'+(compact?'':'<span class="view-all-link" data-action="goToLeads">Leads &rarr;</span>')+'</div>'+
    (list.length ? '<div class="reach-list">'+list.slice(0, compact?6:12).map(function(r){
      const x = r.x;
      const lt = crmLastTouch(r.kind, x);
      return '<div class="reach-row '+overdueLevel(r.n)+'" data-key="reach-'+x.id+'">'+
        '<span class="reach-bar"></span>'+
        '<div class="reach-main" data-action="openContact" data-kind="'+r.kind+'" data-id="'+x.id+'">'+
          '<div class="reach-name">'+escapeHtml(crmName(r.kind,x))+' <span class="tag '+(r.kind==='lead'?'tag-warn':'tag-client')+'" style="margin-left:4px;">'+(r.kind==='lead'?'Lead':'Client')+'</span></div>'+
          '<div class="kpi-sub">'+(lt?'Last touch '+relativeDayLabel(lt):'Never contacted')+' &middot; every '+crmCadence(r.kind,x)+'d</div>'+
        '</div>'+
        '<span class="crm-due '+overdueLevel(r.n)+'">'+dueLabel(r.n)+'</span>'+
        touchButtonsHtml(r.kind, x)+
        touchMenuHtml(r.kind, x)+
      '</div>';
    }).join('')+'</div>'+(list.length>(compact?6:12) ? '<div class="kpi-sub" style="text-align:center;margin-top:6px;">+'+(list.length-(compact?6:12))+' more in Business</div>' : '')
    : '<div class="empty">All caught up. &#127881;</div>')+
  '</div>';
}
// ---- contact modal (leads) + CRM block (leads and clients) ----
ACTIONS.openContact = function(el){ openContact(el.dataset.kind, el.dataset.id); };
function openContact(kind, id){
  ui.touchMenu = null;
  if(kind==='client'){ openClientModal(id); return; }
  if(!crmFind('lead', id)) return;
  ui.contactLeadId = id;
  showOverlay('contactOverlay'); renderContactInto();
}
function rerenderContactModal(){
  if(overlayOpen('contactOverlay')) renderContactInto();
  if(overlayOpen('clientModalOverlay')) renderClientModalInto();
}
function renderContact(){
  const p = crmFind('lead', ui.contactLeadId); if(!p) return '';
  const st = crmStage('lead', p.stage);
  return '<div class="contact-head">'+
      '<div><div class="section-title" style="margin:0;">'+escapeHtml(crmName('lead',p))+'</div>'+(crmSubName('lead',p)?'<div class="kpi-sub">'+escapeHtml(crmSubName('lead',p))+'</div>':'')+'</div>'+
      '<span class="tag" style="background:'+(st?st.color:'#8A90A2')+'22;color:'+(st?st.color:'#8A90A2')+';">'+escapeHtml(st?st.label:'')+'</span>'+
    '</div>'+
    renderCrmBlock('lead', p)+
    '<div class="kind-label">Details</div>'+
    '<div class="grid grid-2">'+
      '<div class="field"><label>Contact name</label><input class="input" id="leadName-'+p.id+'" value="'+escapeHtml(p.name||'')+'"></div>'+
      '<div class="field"><label>Company</label><input class="input" id="leadCompany-'+p.id+'" value="'+escapeHtml(p.company||'')+'"></div>'+
      '<div class="field"><label>Phone</label><input class="input" id="leadPhone-'+p.id+'" value="'+escapeHtml(p.phone||'')+'"></div>'+
      '<div class="field"><label>Email</label><input class="input" id="leadEmail-'+p.id+'" value="'+escapeHtml(p.email||'')+'"></div>'+
      '<div class="field"><label>Trade</label><input class="input" id="leadTrade-'+p.id+'" value="'+escapeHtml(p.trade||'')+'"></div>'+
      '<div class="field"><label>Est. value ($)</label><input class="input" type="number" id="leadValue-'+p.id+'" value="'+(p.value||0)+'"></div>'+
      '<div class="field"><label>Follow-up date</label><input class="input" type="date" id="leadFollow-'+p.id+'" value="'+(p.nextFollowUp||'')+'"></div>'+
      '<div class="field"><label>Source</label><select class="input" id="leadSource-'+p.id+'"><option value="">&mdash;</option>'+LEAD_SOURCES.map(function(s){ return '<option value="'+s.id+'" '+(p.leadSource===s.id?'selected':'')+'>'+s.emoji+' '+s.label+'</option>'; }).join('')+'</select></div>'+
    '</div>'+
    '<div class="field" style="margin-top:10px;"><label>Notes</label><textarea class="input" id="leadNotes-'+p.id+'" style="width:100%;min-height:70px;">'+escapeHtml(p.notes||'')+'</textarea></div>'+
    '<div class="row" style="margin-top:18px;justify-content:space-between;">'+
      '<button class="btn btn-ghost btn-sm mini-move-danger" data-action="deleteContact" data-kind="lead" data-id="'+p.id+'">Delete lead</button>'+
      '<div class="row">'+
        (leadIsOpen(p) ? '<button class="btn btn-ghost btn-sm" data-action="markLeadLost" data-id="'+p.id+'">Mark lost</button><button class="btn btn-good btn-sm" data-action="markLeadWon" data-id="'+p.id+'">&#127881; Won → client</button>' : '')+
        '<button class="btn btn-primary" data-action="saveLead" data-id="'+p.id+'">Save</button>'+
      '</div>'+
    '</div>';
}
function renderContactInto(){ const el=document.getElementById('contactContent'); if(el) morphInto(el, renderContact(), {form:true}); }
registerModal('contactOverlay', renderContactInto);
function saveLeadFields(p){
  const v = function(k){ const el = document.getElementById(k+'-'+p.id); return el ? el.value : null; };
  if(v('leadName')!=null) p.name = v('leadName').trim() || p.name;
  if(v('leadCompany')!=null) p.company = v('leadCompany').trim();
  if(v('leadPhone')!=null) p.phone = v('leadPhone').trim();
  if(v('leadEmail')!=null) p.email = v('leadEmail').trim();
  if(v('leadTrade')!=null) p.trade = v('leadTrade').trim();
  if(v('leadValue')!=null) p.value = Number(v('leadValue'))||0;
  if(v('leadFollow')!=null) p.nextFollowUp = v('leadFollow') || null;
  if(v('leadSource')!=null) p.leadSource = v('leadSource') || null;
  if(v('leadNotes')!=null) p.notes = v('leadNotes');
}
ACTIONS.saveLead = function(el, e, id){
  const p = crmFind('lead', id); if(!p) return;
  saveLeadFields(p);
  hideOverlay('contactOverlay'); ui.contactLeadId = null;
  persist('business'); renderView();
};
ACTIONS.markLeadWon = function(el, e, id){
  const p = crmFind('lead', id); if(!p) return;
  saveLeadFields(p);
  const won = crmStages('lead').find(function(s){ return s.kind==='won'; });
  hideOverlay('contactOverlay');
  setStage('lead', id, won.id);
  if(p.convertedClientId) openClientModal(p.convertedClientId);
};
ACTIONS.markLeadLost = function(el, e, id){ const p = crmFind('lead', id); if(p) saveLeadFields(p); hideOverlay('contactOverlay'); openLostReason(id); };
let lastDeletedContact = null;
ACTIONS.deleteContact = function(el){
  const kind = el.dataset.kind, id = el.dataset.id;
  const list = crmList(kind);
  const idx = list.findIndex(function(x){ return x.id===id; }); if(idx<0) return;
  lastDeletedContact = {kind:kind, index:idx, item:list[idx]};
  list.splice(idx,1);
  hideOverlay('contactOverlay'); if(kind==='client') closeClientModal();
  persist('business'); renderView();
  showToast('Deleted '+crmName(kind, lastDeletedContact.item), {icon:'&#128465;', actionLabel:'Undo', actionAction:'undoDeleteContact', duration:7000});
};
ACTIONS.undoDeleteContact = function(){
  const d = lastDeletedContact; if(!d) return;
  const list = crmList(d.kind); list.splice(Math.min(d.index, list.length), 0, d.item);
  lastDeletedContact = null;
  const c = document.getElementById('toastContainer'); if(c) c.innerHTML='';
  persist('business'); renderView();
};
// Shared block: stage, cadence, quick touch log, touch history, files, timeline.
function renderCrmBlock(kind, x){
  const n = crmOverdueDays(kind, x);
  const lt = crmLastTouch(kind, x);
  const cad = crmCadence(kind, x);
  const lastType = x.lastTouchType || crm().lastTouchType || 'text';
  return '<div class="crm-block">'+
    '<div class="grid grid-3">'+
      '<div class="field"><label>Stage</label><select class="input" data-crm-stage="'+kind+':'+x.id+'">'+crmStages(kind).map(function(s){ return '<option value="'+s.id+'" '+(x.stage===s.id?'selected':'')+'>'+escapeHtml(s.label)+'</option>'; }).join('')+'</select></div>'+
      '<div class="field"><label>Contact cadence</label><select class="input" data-crm-cadence="'+kind+':'+x.id+'">'+[1,2,3,4,5,7,10,14,21,30].map(function(d){ return '<option value="'+d+'" '+(cad===d?'selected':'')+'>Every '+(d===1?'day':d===7?'week':d===14?'2 weeks':d===30?'month':d+' days')+(x.cadenceDays?'':(d===cad?' (default)':''))+'</option>'; }).join('')+'</select></div>'+
      '<div class="field"><label>Next touch</label><div class="crm-due '+overdueLevel(n)+'" style="padding-top:7px;">'+(crmTracked(kind,x) ? dueLabel(n)+' &middot; '+fmtDateShort(crmNextDue(kind,x)) : 'not tracked in this stage')+'</div><div class="kpi-sub">Last: '+(lt?fmtDateShort(lt)+' ('+relativeDayLabel(lt)+')':'never')+'</div></div>'+
    '</div>'+
    '<div class="kind-label">Log a touchpoint</div>'+
    '<div class="touch-form">'+
      '<div class="row" style="gap:4px;">'+TOUCH_TYPES.map(function(t){ return '<label class="chip touch-type-chip'+(lastType===t.id?' active':'')+'"><input type="radio" name="crmTouchType-'+x.id+'" value="'+t.id+'" '+(lastType===t.id?'checked':'')+' style="display:none;">'+t.icon+' '+t.label+'</label>'; }).join('')+'</div>'+
      '<div class="row" style="gap:6px;margin-top:8px;">'+
        '<input class="input" type="date" id="crmTouchDate-'+x.id+'" value="'+todayStr()+'" style="width:150px;">'+
        '<input class="input" id="crmTouchNote-'+x.id+'" placeholder="Short note (optional)" style="flex:1;min-width:140px;">'+
        '<button class="btn btn-good btn-sm" data-action="logTouchFromForm" data-kind="'+kind+'" data-id="'+x.id+'">Log</button>'+
      '</div>'+
    '</div>'+
    renderContactFiles(kind, x)+
    renderContactTimeline(kind, x)+
  '</div>';
}
document.addEventListener('change', function(e){
  if(e.target && e.target.name && e.target.name.indexOf('crmTouchType-')===0){
    const id = e.target.name.slice('crmTouchType-'.length);
    document.querySelectorAll('[name="crmTouchType-'+id+'"]').forEach(function(r){ r.parentElement.classList.toggle('active', r.checked); });
  }
});
function renderContactTimeline(kind, x){
  const items = [];
  arr(x.timeline).forEach(function(t){ items.push({ts:t.ts, icon: t.type==='stage'?'&#10140;':t.type==='file'?'&#128206;':t.type==='note'?'&#128221;':'&#8226;', text:t.text}); });
  arr(x.touchpoints).forEach(function(t){
    const tt = touchTypeById(t.type);
    items.push({ts: t.ts || localTs(t.date,'12:00'), icon:tt.icon, text:tt.label+(t.note?': '+t.note:''), touch:t});
  });
  const ref = kind==='lead' ? 'lead:'+x.id : x.id;
  state.tasks.items.forEach(function(t){
    if(arr(t.clients).indexOf(ref)<0) return;
    if(t.createdAt) items.push({ts:localTs(t.createdAt,'09:00'), icon:'&#9744;', text:'Task added: '+t.title});
    if(t.status==='done' && t.completedAt) items.push({ts:localTs(t.completedAt,'17:00'), icon:'&#9745;', text:'Task done: '+t.title});
  });
  if(kind==='client') arr(x.journal).forEach(function(j){ items.push({ts: j.createdAt ? Date.parse(j.createdAt) : localTs(j.date,'12:00'), icon:'&#128214;', text:'Journal: '+String(j.text||'').slice(0,120)}); });
  if(x.createdAt) items.push({ts:localTs(x.createdAt,'08:00'), icon:'&#10022;', text:(kind==='lead'?'Lead added':'Became a client')});
  items.sort(function(a,b){ return b.ts-a.ts; });
  const limit = ui.timelineExpanded===x.id ? 200 : 12;
  return '<div class="kind-label">Timeline</div>'+
    (items.length ? '<div class="timeline">'+items.slice(0,limit).map(function(it){
      return '<div class="timeline-row"><span class="timeline-icon">'+it.icon+'</span><span class="timeline-text">'+escapeHtml(it.text)+'</span><span class="timeline-date">'+fmtDateShort(todayStr(new Date(it.ts)))+'</span>'+
        (it.touch ? '<button class="mini-move mini-move-danger" data-action="deleteTouchpoint" data-kind="'+kind+'" data-id="'+x.id+'" data-tp="'+it.touch.id+'" title="Remove this touchpoint">&#10005;</button>' : '')+
      '</div>';
    }).join('')+'</div>'+(items.length>limit ? '<button class="mini-move" data-action="expandTimeline" data-id="'+x.id+'">Show all '+items.length+'</button>' : '')
    : '<div class="kpi-sub">Nothing yet.</div>');
}
ACTIONS.expandTimeline = function(el, e, id){ ui.timelineExpanded = id; rerenderContactModal(); };
// ---- files ----
function fileIcon(f){
  if(f.kind==='link') return '&#128279;';
  const m = f.mime||'';
  if(m.indexOf('image/')===0) return '&#128444;';
  if(m==='application/pdf') return '&#128196;';
  if(m.indexOf('video/')===0) return '&#127916;';
  if(m.indexOf('audio/')===0) return '&#127925;';
  return '&#128206;';
}
function fmtBytes(n){ n = Number(n)||0; if(n<1024) return n+' B'; if(n<1048576) return (n/1024).toFixed(0)+' KB'; return (n/1048576).toFixed(1)+' MB'; }
function renderContactFiles(kind, x){
  const files = arr(x.files);
  return '<div class="kind-label">Files</div>'+
    '<div class="file-drop" data-photo-drop="contactfiles" data-kind="'+kind+'" data-id="'+x.id+'">'+
      (files.length ? '<div class="file-list">'+files.map(function(f){
        const isImg = (f.mime||'').indexOf('image/')===0;
        return '<div class="file-row" data-key="file-'+f.id+'">'+
          '<span class="file-thumb" data-action="previewFile" data-kind="'+kind+'" data-id="'+x.id+'" data-file="'+f.id+'">'+(isImg ? '<img src="'+escapeHtml(blobUrl(f.ref))+'" alt="">' : fileIcon(f))+'</span>'+
          '<input class="input input-sm file-name" data-file-rename="'+kind+':'+x.id+':'+f.id+'" value="'+escapeHtml(f.name)+'">'+
          '<span class="kpi-sub">'+(f.kind==='link'?'link':fmtBytes(f.size))+'</span>'+
          '<button class="mini-move" data-action="previewFile" data-kind="'+kind+'" data-id="'+x.id+'" data-file="'+f.id+'">'+(f.kind==='link'?'Open':'View')+'</button>'+
          '<button class="mini-move mini-move-danger" data-action="deleteContactFile" data-kind="'+kind+'" data-id="'+x.id+'" data-file="'+f.id+'">Delete</button>'+
        '</div>';
      }).join('')+'</div>' : '')+
      '<div class="file-drop-hint">Drop contracts, briefs, invoices, images or PDFs here &middot; <span class="mini-move mini-move-today" data-action="pickContactFiles" data-kind="'+kind+'" data-id="'+x.id+'">browse</span></div>'+
      '<div class="row" style="gap:6px;margin-top:8px;"><input class="input input-sm" id="crmLink-'+x.id+'" placeholder="…or paste a link (footage, Drive folder, contract)" style="flex:1;"><button class="btn btn-sm" data-action="addContactLink" data-kind="'+kind+'" data-id="'+x.id+'">Add link</button></div>'+
    '</div>';
}
async function addContactFiles(kind, id, files){
  const x = crmFind(kind, id); if(!x || !files || !files.length) return;
  for(const file of files){
    const isImg = file.type && file.type.indexOf('image/')===0;
    const ref = isImg ? await storeImageFile(file) : await blobStore(file);
    x.files.push({id:uid(), kind:'file', name:file.name||'file', mime:file.type||'', size:file.size||0, ref:ref, addedAt:Date.now()});
    crmTimeline(x, 'file', 'File added: '+(file.name||'file'));
  }
  playTick();
  persist('business'); renderView(); rerenderContactModal();
}
ACTIONS['drop:contactfiles'] = function(zone, files){ addContactFiles(zone.dataset.kind, zone.dataset.id, files); };
ACTIONS.pickContactFiles = function(el){
  const inp = document.createElement('input'); inp.type='file'; inp.multiple = true;
  inp.onchange = function(){ addContactFiles(el.dataset.kind, el.dataset.id, Array.prototype.slice.call(inp.files||[])); };
  inp.click();
};
ACTIONS.addContactLink = function(el){
  const x = crmFind(el.dataset.kind, el.dataset.id); if(!x) return;
  const inp = document.getElementById('crmLink-'+x.id);
  let url = inp ? inp.value.trim() : '';
  if(!url) return;
  if(!/^[a-z]+:\/\//i.test(url)) url = 'https://'+url;
  let name = url; try{ const u = new URL(url); name = u.hostname+(u.pathname.length>1?u.pathname:''); }catch(e){}
  x.files.push({id:uid(), kind:'link', name:name.slice(0,80), url:url, addedAt:Date.now()});
  crmTimeline(x, 'file', 'Link added: '+name.slice(0,60));
  inp.value = '';
  persist('business'); renderView(); rerenderContactModal();
};
let lastDeletedFile = null;
ACTIONS.deleteContactFile = function(el){
  const x = crmFind(el.dataset.kind, el.dataset.id); if(!x) return;
  const idx = x.files.findIndex(function(f){ return f.id===el.dataset.file; }); if(idx<0) return;
  const f = x.files.splice(idx,1)[0];
  lastDeletedFile = {kind:el.dataset.kind, id:x.id, index:idx, file:f};
  crmTimeline(x, 'file', 'File removed: '+f.name);
  persist('business'); renderView(); rerenderContactModal();
  showToast('Deleted '+f.name, {icon:'&#128465;', actionLabel:'Undo', actionAction:'undoDeleteFile', duration:7000});
};
ACTIONS.undoDeleteFile = function(){
  const d = lastDeletedFile; if(!d) return;
  const x = crmFind(d.kind, d.id); if(x){ x.files.splice(Math.min(d.index, x.files.length), 0, d.file); x.timeline.pop(); }
  lastDeletedFile = null;
  const c = document.getElementById('toastContainer'); if(c) c.innerHTML='';
  persist('business'); renderView(); rerenderContactModal();
};
ACTIONS.previewFile = function(el){
  const x = crmFind(el.dataset.kind, el.dataset.id); if(!x) return;
  const f = arr(x.files).find(function(ff){ return ff.id===el.dataset.file; }); if(!f) return;
  if(f.kind==='link'){ window.open(safariizeUrl(f.url), '_blank'); return; }
  ui.previewFile = f; showOverlay('filePreviewOverlay'); renderFilePreviewInto();
};
function renderFilePreview(){
  const f = ui.previewFile; if(!f) return '';
  const url = blobUrl(f.ref), m = f.mime||'';
  let body;
  if(m.indexOf('image/')===0) body = '<img src="'+escapeHtml(url)+'" style="max-width:100%;max-height:72vh;border-radius:8px;display:block;margin:0 auto;">';
  else if(m==='application/pdf') body = '<iframe src="'+escapeHtml(url)+'" style="width:100%;height:72vh;border:none;border-radius:8px;background:#fff;"></iframe>';
  else if(m.indexOf('video/')===0) body = '<video src="'+escapeHtml(url)+'" controls style="max-width:100%;max-height:72vh;display:block;margin:0 auto;"></video>';
  else if(m.indexOf('audio/')===0) body = '<audio src="'+escapeHtml(url)+'" controls style="width:100%;"></audio>';
  else body = '<div class="empty">No preview for this file type.</div>';
  return '<div class="row" style="justify-content:space-between;margin-bottom:12px;"><div class="section-title" style="margin:0;">'+escapeHtml(f.name)+'</div><span class="kpi-sub">'+fmtBytes(f.size)+'</span></div>'+body+
    '<div class="row" style="justify-content:flex-end;margin-top:14px;gap:8px;"><a class="btn btn-ghost" href="'+escapeHtml(url)+'" download="'+escapeHtml(f.name)+'">Download</a><button class="btn btn-primary" data-action="closeFilePreview">Close</button></div>';
}
function renderFilePreviewInto(){ const el=document.getElementById('filePreviewContent'); if(el) morphInto(el, renderFilePreview(), {form:true}); }
registerModal('filePreviewOverlay', renderFilePreviewInto);
ACTIONS.closeFilePreview = function(){ ui.previewFile = null; hideOverlay('filePreviewOverlay'); };
// ---- new contact ----
function openNewContactModal(kind){ ui.newContactKind = kind; ui.newContactSource = null; showOverlay('newContactOverlay'); renderNewContactInto(); }
ACTIONS.openNewContact = function(el){ openNewContactModal(el.dataset.kind||'lead'); };
function renderNewContact(){
  const kind = ui.newContactKind || 'lead';
  const stages = crmStages(kind).filter(function(s){ return !s.kind; });
  return '<div class="section-title" style="margin-bottom:14px;">New '+(kind==='lead'?'lead':'client')+'</div>'+
    '<div class="grid grid-2">'+
      '<div class="field"><label>Contact name</label><input class="input" id="ncName" autofocus></div>'+
      '<div class="field"><label>'+(kind==='lead'?'Company':'Business')+'</label><input class="input" id="ncCompany"></div>'+
      '<div class="field"><label>Phone</label><input class="input" id="ncPhone"></div>'+
      '<div class="field"><label>Email</label><input class="input" id="ncEmail"></div>'+
      '<div class="field"><label>'+(kind==='lead'?'Est. value ($)':'Monthly retainer ($)')+'</label><input class="input" type="number" id="ncValue"></div>'+
      '<div class="field"><label>Stage</label><select class="input" id="ncStage">'+stages.map(function(s){ return '<option value="'+s.id+'" '+(kind==='client'&&s.id==='onboarding'?'selected':'')+'>'+escapeHtml(s.label)+'</option>'; }).join('')+'</select></div>'+
    '</div>'+
    (kind==='client' ? '<div class="field" style="margin-top:10px;"><label>Client cycle (the playbook they\'ll follow)</label><select class="input" id="ncCycle"><option value="">No cycle</option>'+cycles().map(function(x){ return '<option value="'+x.id+'" '+(crm().defaultCycleId===x.id?'selected':'')+'>'+escapeHtml(x.name)+' — '+x.steps.map(function(s){ return s.label; }).join(' → ')+'</option>'; }).join('')+'</select></div>' : '')+
    '<div class="field" style="margin-top:10px;"><label>Source</label><div class="row" style="gap:6px;">'+LEAD_SOURCES.map(function(s){ return '<span class="chip'+(ui.newContactSource===s.id?' active':'')+'" data-action="ncSource" data-id="'+s.id+'">'+s.emoji+' '+s.label+'</span>'; }).join('')+'</div></div>'+
    '<div class="field" style="margin-top:10px;"><label>Notes</label><textarea class="input" id="ncNotes" style="width:100%;min-height:60px;"></textarea></div>'+
    '<div class="row" style="margin-top:18px;justify-content:flex-end;"><button class="btn btn-ghost" data-action="closeNewContact">Cancel</button><button class="btn btn-primary" data-action="saveNewContact">Add '+(kind==='lead'?'lead':'client')+'</button></div>';
}
function renderNewContactInto(){ const el=document.getElementById('newContactContent'); if(el) morphInto(el, renderNewContact(), {form:true}); }
registerModal('newContactOverlay', renderNewContactInto);
ACTIONS.ncSource = function(el, e, id){ ui.newContactSource = ui.newContactSource===id ? null : id; renderNewContactInto(); };
ACTIONS.closeNewContact = function(){ hideOverlay('newContactOverlay'); };
ACTIONS.saveNewContact = function(){
  const kind = ui.newContactKind || 'lead';
  const g = function(id){ const el = document.getElementById(id); return el ? el.value.trim() : ''; };
  const name = g('ncName'), company = g('ncCompany');
  if(!name && !company){ document.getElementById('ncName').focus(); return; }
  const base = {id:uid(), name:name, phone:g('ncPhone'), email:g('ncEmail'), notes:g('ncNotes'), leadSource:ui.newContactSource||null, stage:g('ncStage'), createdAt:todayStr(), touchpoints:[], timeline:[], files:[], cadenceDays:null};
  if(kind==='lead'){
    state.business.pipeline.push(Object.assign(base, {company:company, value:Number(g('ncValue'))||0, trade:'', nextFollowUp:null, stageHistory:[], convertedClientId:null}));
  } else {
    const c = Object.assign(base, {business:company, mrr:Number(g('ncValue'))||0, billingDay:1, deliverables:[], journal:[], touches:[], packageId:null, startDate:todayStr(), lifecycle:{checks:{}, enteredAt:{}, events:{}, links:{}}, cycleId:null, cycleStepId:null, cycleDone:false});
    const cyEl = document.getElementById('ncCycle');
    if(cyEl && cyEl.value) assignCycle(c, cyEl.value);
    syncClientStatus(c);
    state.business.clients.push(c);
  }
  hideOverlay('newContactOverlay');
  playPositive(); persist('business'); renderView();
  // a new client opens straight onto their first lifecycle step
  if(kind==='client') openClientModal(base.id);
};
// ---- daily touch reminder ----
let lastTouchReminderDay = null;
function checkTouchReminder(){
  const dr = crm().dailyReminder; if(!dr || !dr.enabled) return;
  if(nowHM()!==dr.time || lastTouchReminderDay===todayStr()) return;
  lastTouchReminderDay = todayStr();
  const n = reachOutList().length; if(!n) return;
  showToast(n+' contact'+(n===1?'':'s')+' due for a touch today', {icon:'&#128075;', actionLabel:'Show', actionAction:'goToReachOut', duration:12000});
  try{ if('Notification' in window && Notification.permission==='granted') new Notification('Operator: '+n+' contact'+(n===1?'':'s')+' to reach out to today'); }catch(e){}
}
ACTIONS.goToReachOut = function(){ ui.view='today'; renderView(); const el = document.querySelector('.reach-list'); if(el) el.scrollIntoView({behavior:'smooth', block:'center'}); };
// ---- settings: cadences, reminder, stages ----
function renderCrmSettings(){
  const c = crm();
  const stageEditor = function(kind){
    return '<div class="task-list">'+crmStages(kind).map(function(s, i, all){
      return '<div class="task-item-v2" style="padding:8px 12px;align-items:center;">'+
        '<span class="swatch" style="background:'+s.color+';width:16px;height:16px;" data-action="cycleStageColor" data-kind="'+kind+'" data-id="'+s.id+'" title="Change color"></span>'+
        '<input class="input input-sm" data-stage-label="'+kind+':'+s.id+'" value="'+escapeHtml(s.label)+'" style="flex:1;max-width:220px;">'+
        (s.kind ? '<span class="kpi-sub">'+(s.kind==='won'?'converts to client':s.kind==='lost'?'closed lost':'closed')+'</span>' : (kind==='client' ? '<label class="row kpi-sub" style="gap:4px;"><input type="checkbox" data-stage-active="'+s.id+'" '+(s.active!==false?'checked':'')+'>counts as active</label>' : ''))+
        '<button class="btn btn-ghost btn-sm" data-action="moveStage" data-kind="'+kind+'" data-id="'+s.id+'" data-dir="-1" '+(i===0?'disabled':'')+'>&uarr;</button>'+
        '<button class="btn btn-ghost btn-sm" data-action="moveStage" data-kind="'+kind+'" data-id="'+s.id+'" data-dir="1" '+(i===all.length-1?'disabled':'')+'>&darr;</button>'+
        (s.kind ? '' : '<button class="btn btn-ghost btn-sm" data-action="removeStage" data-kind="'+kind+'" data-id="'+s.id+'" title="Contacts in this stage move to the first stage">Remove</button>')+
      '</div>';
    }).join('')+'</div>'+
    '<div class="row" style="margin-top:8px;"><input class="input input-sm" id="newStage-'+kind+'" placeholder="New stage name" style="width:200px;"><button class="btn btn-sm" data-action="addStage" data-kind="'+kind+'">Add stage</button></div>';
  };
  return '<div class="card section"><div class="section-title">Reach-out cadence'+tip('How often to touch base — each contact can override it. A client goes red once a touch is due. Deliverables: green on pace, yellow when behind but you\'ve done some this week, red when behind with none.')+'</div><div class="grid grid-3">'+
      '<div class="field"><label>New leads: every (days)</label><input class="input" type="number" min="1" id="setLeadCadence" value="'+c.leadCadenceDays+'"></div>'+
      '<div class="field"><label>Clients: every (days)</label><input class="input" type="number" min="1" id="setClientCadence" value="'+c.clientCadenceDays+'"></div>'+
      '<div class="field"><label>Daily "reach out" reminder</label><div class="row" style="gap:6px;"><input type="checkbox" id="setTouchReminder" '+(c.dailyReminder.enabled?'checked':'')+'><input class="input" type="time" id="setTouchReminderTime" value="'+c.dailyReminder.time+'" style="width:120px;"></div></div>'+
    '</div></div>'+
    '<div class="card section"><div class="section-title">Lead stages</div>'+stageEditor('lead')+'</div>'+
    '<div class="card section"><div class="section-title">Client cycles'+tip('Your playbooks — steps with calls, forms, videos and to-dos.')+'</div><button class="btn btn-primary btn-sm" data-action="openLifecycleEditor">&#9881; Edit client cycles</button></div>'+
    '<div class="card section"><div class="section-title">Client statuses</div>'+stageEditor('client')+'</div>';
}
function saveCrmSettingsFields(){
  const c = crm();
  const lc = document.getElementById('setLeadCadence'); if(lc) c.leadCadenceDays = Math.max(1, Number(lc.value)||2);
  const cc = document.getElementById('setClientCadence'); if(cc) c.clientCadenceDays = Math.max(1, Number(cc.value)||7);
  const tr = document.getElementById('setTouchReminder'); if(tr) c.dailyReminder.enabled = tr.checked;
  const tt = document.getElementById('setTouchReminderTime'); if(tt && tt.value) c.dailyReminder.time = tt.value;
}
document.addEventListener('change', function(e){
  const t = e.target; if(!t || !t.dataset) return;
  if(t.dataset.stageLabel){ const p = t.dataset.stageLabel.split(':'); const s = crmStage(p[0], p[1]); if(s && t.value.trim()){ s.label = t.value.trim(); persist('business'); } }
  if(t.dataset.stageActive){ const s = crmStage('client', t.dataset.stageActive); if(s){ s.active = t.checked; state.business.clients.forEach(function(c){ syncClientStatus(c); }); persist('business'); renderView(); } }
  if(['setLeadCadence','setClientCadence','setTouchReminder','setTouchReminderTime'].indexOf(t.id)>=0){ saveCrmSettingsFields(); persist('business'); if(t.id==='setTouchReminder' && t.checked) requestNotifs(); }
});
ACTIONS.cycleStageColor = function(el){ const s = crmStage(el.dataset.kind, el.dataset.id); if(!s) return; const i = SWATCHES.indexOf(s.color); s.color = SWATCHES[(i+1)%SWATCHES.length]; persist('business'); renderView(); };
ACTIONS.moveStage = function(el){
  const list = crmStages(el.dataset.kind); const i = list.findIndex(function(s){ return s.id===el.dataset.id; });
  const j = i+Number(el.dataset.dir); if(i<0 || j<0 || j>=list.length) return;
  const t = list[i]; list[i] = list[j]; list[j] = t;
  persist('business'); renderView();
};
ACTIONS.addStage = function(el){
  const kind = el.dataset.kind; const inp = document.getElementById('newStage-'+kind);
  const label = inp ? inp.value.trim() : ''; if(!label) return;
  const list = crmStages(kind);
  const st = {id:uid(), label:label, color:SWATCHES[list.length%SWATCHES.length]};
  if(kind==='client'){ st.active = true; st.checklist = []; }
  // New lead stages go before Won/Lost. New client steps go at the end of the active path
  // (after the last active step, before side states like Paused and Churned).
  let at;
  if(kind==='client'){
    let lastActive = -1; list.forEach(function(s, i){ if(s.active!==false && !s.kind) lastActive = i; });
    at = lastActive+1;
  } else {
    const firstClosed = list.findIndex(function(s){ return !!s.kind; });
    at = firstClosed<0 ? list.length : firstClosed;
  }
  list.splice(at, 0, st);
  inp.value = '';
  persist('business'); renderView();
};
ACTIONS.removeStage = function(el){
  const kind = el.dataset.kind, list = crmStages(kind);
  const idx = list.findIndex(function(s){ return s.id===el.dataset.id; }); if(idx<0 || list[idx].kind) return;
  const fallback = list.find(function(s){ return s.id!==el.dataset.id && !s.kind; }); if(!fallback) return;
  crmList(kind).forEach(function(x){ if(x.stage===el.dataset.id){ x.stage = fallback.id; crmTimeline(x,'stage','Stage removed → '+fallback.label); if(kind==='client') syncClientStatus(x); } });
  list.splice(idx,1);
  persist('business'); renderView();
};
