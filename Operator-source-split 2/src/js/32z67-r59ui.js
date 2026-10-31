// ============ ROUND 59: THE PAGES ============
// Business Setup (the lead pipeline you can drag), the Log center's calendar for everyone, Packages with their own
// calendars (by cycle day), putting yourself on a plan, each client's calendar, the Calendar's client filter,
// animations on every tab, Health's weight & fuel, and the Journal.
const R59_COLORS = ['#E8A23D', '#5BC0EB', '#9B7BFF', '#3DDC97', '#FF7A6B', '#F5D547', '#FF8FCF', '#7BD3C4'];

// ================= C9. Business Setup =================
const R59_BS = [['pipeline', '&#9776;', 'Lead pipeline'], ['clients', '&#9673;', 'Client stages'], ['reach', '&#128075;', 'Reach-out'], ['msgs', '&#128172;', 'Messages']];
function r59StagesHtml(kind){
  const list = crmStages(kind), people = crmList(kind);
  const row = function(s){
    const n = people.filter(function(x){ return x.stage===s.id && (kind==='client' || leadIsOpen(x) || s.kind); }).length, locked = !!s.kind;
    return '<div class="r59-st'+(locked ? ' is-lock' : '')+'"'+(locked ? '' : ' draggable="true" data-r59-st="'+kind+':'+s.id+'"')+' style="--c:'+s.color+'">'+
      '<span class="r59-grip">'+(locked ? '' : '&#8942;&#8942;')+'</span>'+
      '<button class="r59-dot" data-action="cycleStageColor" data-kind="'+kind+'" data-id="'+s.id+'" aria-label="Colour"></button>'+
      '<input class="r59-stn" data-stage-label="'+kind+':'+s.id+'" value="'+escapeHtml(s.label)+'" maxlength="40" aria-label="Stage name">'+
      (kind==='client' && !locked ? '<label class="r59-act" title="Counts as an active client"><input type="checkbox" data-stage-active="'+s.id+'"'+(s.active!==false ? ' checked' : '')+'><i></i><span>Active</span></label>' : '')+
      (locked ? '<span class="r59-lk">'+(s.kind==='won' ? 'Becomes a client' : 'Closed')+'</span>' : '')+
      '<span class="r59-n">'+n+'</span>'+
      (locked ? '<span class="r59-x"></span>' : '<button class="r59-x" data-action="removeStage" data-kind="'+kind+'" data-id="'+s.id+'" aria-label="Remove">&#10005;</button>')+
    '</div>';
  };
  return '<div class="r59-pipe" data-kind="'+kind+'">'+list.map(row).join('')+
    '<div class="r59-st is-new"><span class="r59-grip"></span><span class="r59-dot is-new">+</span><input class="r59-stn" id="newStage-'+kind+'" placeholder="Add a stage" maxlength="40"></div></div>';
}
var r59BizSetupBase = bizSetupHtml;   // (Reach-out and Messages keep their fields)
bizSetupHtml = function(){
  let tab = ui.bsTab || 'pipeline'; if(tab==='leads') tab = 'pipeline'; if(!R59_BS.some(function(x){ return x[0]===tab; })) tab = 'pipeline';
  let body = '';
  if(tab==='pipeline') body = '<div class="r59-bs-h">Lead pipeline</div>'+r59StagesHtml('lead');
  else if(tab==='clients') body = '<div class="r59-bs-h">Client stages</div>'+r59StagesHtml('client');
  else {
    const was = ui.bsTab; ui.bsTab = tab;
    try{ const t = document.createElement('template'); t.innerHTML = r59BizSetupBase(); const b = t.content.querySelector('.bs-body'); body = '<div class="r59-bs-h">'+(tab==='reach' ? 'Reach-out' : 'Messages')+'</div>'+(b ? b.innerHTML : ''); } finally { ui.bsTab = was; }
  }
  return '<button class="int-x hs-x" data-action="addSheetClose" title="Close">&#10005;</button>'+
    '<div class="r59-bs"><nav class="r59-bs-nav"><div class="r59-bs-t">Setup</div>'+R59_BS.map(function(x){ return '<button class="'+(tab===x[0] ? 'is-on' : '')+'" data-action="bsTab" data-id="'+x[0]+'"><i>'+x[1]+'</i>'+x[2]+'</button>'; }).join('')+
      '<button data-action="r59BsPlaybooks"><i>&#128203;</i>Playbooks</button></nav>'+
    '<div class="r59-bs-b" data-key="r59bs-'+tab+'">'+body+'</div></div>';
};
ACTIONS.r59BsPlaybooks = function(){ addSheetClose('bizSetup'); ui.view = 'business'; ui.businessTab = 'lifecycle'; ui.pbView = 'board'; renderView(); };
ACTIONS.bizSetupOpen = function(){ ui.bsTab = ui.bsTab && ui.bsTab!=='leads' && ui.bsTab!=='cycles' ? ui.bsTab : 'pipeline'; addSheetOpen('bizSetup', bizSetupHtml); const o = document.getElementById('bizSetup'); if(o) o.classList.add('r59-bs-sheet'); };
// (drag a stage to reorder it; Won and Lost stay at the end)
document.addEventListener('dragstart', function(e){ const r = e.target.closest && e.target.closest('[data-r59-st]'); if(!r) return; e.dataTransfer.setData('text/r59st', r.getAttribute('data-r59-st')); e.dataTransfer.effectAllowed = 'move'; r.classList.add('is-drag'); });
document.addEventListener('dragend', function(e){ document.querySelectorAll('.r59-st.is-drag, .r59-st.is-over').forEach(function(x){ x.classList.remove('is-drag', 'is-over'); }); });
document.addEventListener('dragover', function(e){ const r = e.target.closest && e.target.closest('.r59-st[data-r59-st]'); if(!r || !Array.from(e.dataTransfer.types || []).includes('text/r59st')) return; e.preventDefault(); document.querySelectorAll('.r59-st.is-over').forEach(function(x){ if(x!==r) x.classList.remove('is-over'); }); r.classList.add('is-over'); });
document.addEventListener('drop', function(e){
  const r = e.target.closest && e.target.closest('.r59-st[data-r59-st]'); if(!r) return;
  const v = e.dataTransfer.getData('text/r59st'); if(!v) return; e.preventDefault();
  const a = v.split(':'), b = r.getAttribute('data-r59-st').split(':'); if(a[0]!==b[0] || a[1]===b[1]) return;
  r59MoveStage(a[0], a[1], b[1]);
});
function r59MoveStage(kind, id, beforeId){
  const L = crmStages(kind), i = L.findIndex(function(s){ return s.id===id; }), j = L.findIndex(function(s){ return s.id===beforeId; });
  if(i < 0 || j < 0 || L[i].kind || L[j].kind) return;
  const s = L.splice(i, 1)[0]; L.splice(i < j ? j : j, 0, s);
  persist('business'); playTick(); try{ r59LeadSync(); }catch(err){} renderView(); addSheetRefresh('bizSetup');
}
// C10. A renamed stage shows everywhere at once (it only saved before: the Lead Center kept the old name)
document.addEventListener('change', function(e){ const t = e.target; if(!t || !t.dataset || !t.dataset.stageLabel) return; setTimeout(function(){ try{ r59LeadSync(); }catch(err){} renderView(); }, 0); });

// ================= C11. The Log center's calendar: clients and leads together =================
function r59LcItems(from, to, who){
  const today = todayStr(), out = [];
  const put = function(kind, x, date, t, color, late){ if(date >= from && date <= to) out.push({kind:kind, x:x, date:date, t:t, c:color, late:late}); };
  const each = function(kind, list){
    list.forEach(function(x){
      const n = crmOverdueDays(kind, x);
      if(n!=null){ put(kind, x, n >= 0 ? today : addDays(today, -n), 'Reach out', '#E8A23D', n > 0); }
      if(x.pb && x.pb.id){ const s = pbState(kind, x); if(s) s.occ.forEach(function(o){ if(!o.done) put(kind, x, o.date, o.it.title, (PB_TYPES[o.it.type] || PB_TYPES.task).color, o.date < today); }); }
    });
  };
  if(who!=='leads') each('client', mtActiveClients());
  if(who!=='clients') each('lead', arr(state.business.pipeline).filter(leadIsOpen));
  return out;
}
function r59LcCalHtml(){
  const who = ui.r59LcWho || 'all', today = todayStr(), base = new Date(localTs(today, '12:00')); base.setDate(1); base.setMonth(base.getMonth() + (ui.r56LeadMo || 0));
  const y = base.getFullYear(), mo = base.getMonth(), days = new Date(y, mo + 1, 0).getDate(), lead = (new Date(y, mo, 1).getDay() + 6) % 7;
  const from = todayStr(new Date(y, mo, 1)), to = todayStr(new Date(y, mo, days)), by = {};
  r59LcItems(from, to, who).forEach(function(it){ (by[it.date] = by[it.date] || []).push(it); });
  let cells = ''; for(let i = 0; i < lead; i++) cells += '<div class="r56-lc-d is-empty"></div>';
  for(let i = 1; i <= days; i++){
    const d = todayStr(new Date(y, mo, i)), its = by[d] || [];
    cells += '<div class="r56-lc-d'+(d===today ? ' is-today' : '')+(d < today ? ' is-past' : '')+'"><span class="r56-lc-n">'+i+'</span>'+its.slice(0, 3).map(function(x){ return '<button class="r56-lc-i r59-lci is-'+x.kind+(x.late ? ' is-late' : '')+'" style="--lc:'+x.c+'" data-action="'+(x.kind==='client' ? 'openClientModal' : 'openContact')+'" data-kind="'+x.kind+'" data-id="'+x.x.id+'"><b>'+escapeHtml(crmName(x.kind, x.x))+'</b><small>'+escapeHtml(x.t)+'</small></button>'; }).join('')+(its.length > 3 ? '<small class="r59-more">+'+(its.length - 3)+'</small>' : '')+'</div>';
  }
  const chip = function(id, label){ return '<button class="'+(who===id ? 'is-on' : '')+'" data-action="r59LcWho" data-id="'+id+'">'+label+'</button>'; };
  return '<div class="r56-lc r59-lc"><div class="r56-lc-h"><button data-action="r56LeadMonth" data-id="-1">&lsaquo;</button><b>'+new Date(y, mo, 1).toLocaleDateString(undefined, {month:'long', year:'numeric'})+'</b><button data-action="r56LeadMonth" data-id="1">&rsaquo;</button>'+
    '<span class="r59-lcf">'+chip('all', 'Everyone')+chip('clients', 'Clients')+chip('leads', 'Leads')+'</span></div>'+
    '<div class="r56-lc-w">'+['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'].map(function(w){ return '<span>'+w+'</span>'; }).join('')+'</div><div class="r56-lc-g">'+cells+'</div></div>';
}
ACTIONS.r59LcWho = function(el, e, id){ ui.r59LcWho = id; playTick(); renderView(); };
ACTIONS.r59LcView = function(el, e, v){ ui.r59LcCal = v==='cal'; playTick(); renderView(); };
ACTIONS.openClientModal = ACTIONS.openClientModal || function(el, e, id){ openClientModal(id || (el && el.dataset.id)); };
logCenterHtml = (function(base){
  return function(){
    ui.r56LeadCal = false;
    const view = '<div class="r59-lcv"><button class="'+(ui.r59LcCal ? '' : 'is-on')+'" data-action="r59LcView" data-id="list">List</button><button class="'+(ui.r59LcCal ? 'is-on' : '')+'" data-action="r59LcView" data-id="cal">Calendar</button></div>';
    if(ui.r59LcCal) return '<div class="lc r59-lcc"><div class="r59-lct">'+view+'</div>'+r59LcCalHtml()+'</div>';
    const h = base.apply(this, arguments).replace(/<div class="r56-lv">[\s\S]*?<\/div>/, '');
    return h.replace(/(<div class="r54-lcw">[\s\S]*?<\/div>)/, '<div class="r59-lct">$1'+view+'</div>');
  };
})(logCenterHtml);

// ================= C12. Packages: each with its own calendar, by cycle day =================
// A package is a month template: Day 1 is the day a client's cycle starts (or the day you lock yourself in), and
// each deliverable goes out on the days you mark. Clients' calendars turn those days into dates from their cycle.
function r59Pk(id){ return arr(state.business.packages).find(function(p){ return p.id===id; }) || null; }
function r59PkDays(pk, d){ return arr(pk && pk.schedule && pk.schedule[d.id]).map(Number).filter(function(n){ return n >= 1 && n <= 31; }).sort(function(a, b){ return a - b; }); }
function r59PkNeed(d){ return Math.max(1, Math.round((Number(d.weeklyTarget) || 1)*52/12)); }
function r59DelivColor(pk, d){ const i = arr(pk.deliverables).indexOf(d); return R59_COLORS[(i < 0 ? 0 : i) % R59_COLORS.length]; }
function r59PkPeople(pk){
  const cl = arr(state.business.clients).filter(function(c){ return (c.packageId===pk.id || c.package===pk.id) && clientStageActive(c.stage); }).map(function(c){ return {name:c.business || c.name, color:clientAccent(c)}; });
  const me = r59Plans(), mine = Object.keys(me).filter(function(a){ return me[a] && me[a].pk===pk.id; }).map(function(a){ const o = r58Own().find(function(x){ return x.id===a; }); return o ? {name:'@'+o.handle, color:'#F5B342', me:true} : null; }).filter(Boolean);
  return mine.concat(cl);
}
function r59MiniCal(pk){
  let cells = '';
  for(let i = 1; i <= 30; i++){
    const on = arr(pk.deliverables).filter(function(d){ return r59PkDays(pk, d).indexOf(i) >= 0; });
    cells += '<i'+(on.length ? ' style="--c:'+r59DelivColor(pk, on[0])+'"' : '')+(on.length ? ' class="has"' : '')+'></i>';
  }
  return '<div class="r59-mini" aria-hidden="true">'+cells+'</div>';
}
packageRow = function(pk){
  const D = arr(pk.deliverables), people = r59PkPeople(pk);
  return '<button class="pk-card r59-pkc" data-action="openPackageEditModal" data-id="'+pk.id+'">'+
    '<div class="r59-pkc-h"><div class="pk-name">'+escapeHtml(pk.name)+'</div><div class="pk-price">'+(pk.price ? '$'+Number(pk.price).toLocaleString()+'<small>/mo</small>' : '')+'</div></div>'+
    '<div class="r59-pkc-d">'+(D.length ? D.map(function(d){ const n = r59PkDays(pk, d).length || r59PkNeed(d); return '<span style="--c:'+r59DelivColor(pk, d)+'"><i></i>'+n+' '+escapeHtml(d.title)+'</span>'; }).join('') : '<span class="is-none">No deliverables yet</span>')+'</div>'+
    r59MiniCal(pk)+
    '<div class="r59-pkc-f">'+(people.length ? '<span class="r59-ppl">'+people.slice(0, 4).map(function(x){ return '<i style="--c:'+x.color+'" title="'+escapeHtml(x.name)+'">'+escapeHtml(String(x.name).replace('@', '').slice(0, 1).toUpperCase())+'</i>'; }).join('')+'</span>'+people.length+' on it' : 'Nobody on it yet')+'</div>'+
  '</button>';
};
renderPackagesTab = (function(base){ return function(){ return base.apply(this, arguments).replace(/<section class="r58-pkc">[\s\S]*$/, ''); }; })(renderPackagesTab);
// the package itself: what's in it, its calendar, who's on it
function r59PkSheetHtml(){
  const pk = r59Pk(ui.r59PkId); if(!pk) return '';
  const D = arr(pk.deliverables); let brush = D.find(function(d){ return d.id===ui.r59Brush; }) || D[0] || null; ui.r59Brush = brush ? brush.id : null;
  const rows = D.map(function(d){ return '<div class="r59-dv" style="--c:'+r59DelivColor(pk, d)+'"><i></i><input class="r59-dv-t" data-r59-dv="title:'+d.id+'" value="'+escapeHtml(d.title)+'" maxlength="40"><span class="r59-step"><button data-action="r59DvStep" data-id="'+d.id+'|-1">&minus;</button><b>'+(d.weeklyTarget || 1)+'</b><button data-action="r59DvStep" data-id="'+d.id+'|1">+</button></span><small>a week</small><button class="r59-x" data-action="r59DvDel" data-id="'+d.id+'" aria-label="Remove">&#10005;</button></div>'; }).join('');
  const brushes = D.map(function(d){ const n = r59PkDays(pk, d).length, need = r59PkNeed(d); return '<button class="r59-br'+(brush===d ? ' is-on' : '')+'" style="--c:'+r59DelivColor(pk, d)+'" data-action="r59Brush" data-id="'+d.id+'"><i></i>'+escapeHtml(d.title)+'<em class="'+(n===need ? 'is-ok' : '')+'">'+n+'/'+need+'</em></button>'; }).join('');
  let cells = '';
  for(let i = 1; i <= 30; i++){
    const on = D.filter(function(d){ return r59PkDays(pk, d).indexOf(i) >= 0; });
    cells += '<button class="r59-cd'+(brush && on.indexOf(brush) >= 0 ? ' is-on' : '')+'" data-action="r59PkDay" data-id="'+i+'"><span>'+i+'</span>'+on.map(function(d){ return '<b style="--c:'+r59DelivColor(pk, d)+'">'+escapeHtml(d.title)+'</b>'; }).join('')+'</button>';
  }
  const people = r59PkPeople(pk);
  return '<button class="int-x hs-x" data-action="r59PkClose" title="Close">&#10005;</button>'+
    '<div class="r59-pk">'+
      '<div class="r59-pk-h"><input class="r59-pk-n" data-r59-pk="name" value="'+escapeHtml(pk.name)+'" maxlength="40" aria-label="Package name"><label class="r59-pk-p"><span>$</span><input data-r59-pk="price" type="number" min="0" value="'+(pk.price || '')+'" placeholder="0"><small>/mo</small></label></div>'+
      '<div class="r59-pk-sec">What’s in it</div><div class="r59-dvs">'+rows+'<div class="r59-dv is-new"><i></i><input class="r59-dv-t" id="r59NewDv" placeholder="Add a deliverable (Reels, Carousels…)" maxlength="40"></div></div>'+
      (D.length ? '<div class="r59-pk-sec">The month<span>Day 1 is when their cycle starts</span></div><div class="r59-brs">'+brushes+(brush ? '<button class="r59-even" data-action="r59PkEven" data-id="'+brush.id+'">Spread '+escapeHtml(brush.title)+' out</button>' : '')+'</div>'+
        '<div class="r59-cal">'+cells+'</div>' : '')+
      (people.length ? '<div class="r59-pk-sec">On it</div><div class="r59-on">'+people.map(function(x){ return '<span class="'+(x.me ? 'is-me' : '')+'" style="--c:'+x.color+'"><i></i>'+escapeHtml(x.name)+'</span>'; }).join('')+'</div>' : '')+
      '<div class="r59-pk-f"><button class="btn btn-ghost btn-sm r59-del" data-action="r59PkDelete">Delete package</button><button class="btn btn-primary" data-action="r59PkClose">Done</button></div>'+
    '</div>';
}
openPackageEditModal = function(id){ ui.r59PkId = id; ui.r59Brush = null; addSheetOpen('r59PkSheet', r59PkSheetHtml); const o = document.getElementById('r59PkSheet'); if(o) o.classList.add('r59-wide'); };
// (a change to a package reaches the clients on it straight away: new pieces added, renamed ones follow, removed ones go)
function r59PkSync(pk){
  arr(state.business.clients).forEach(function(c){
    if(c.packageId!==pk.id) return;
    c.deliverables = arr(c.deliverables).filter(function(d){ return !d.fromPackage || arr(pk.deliverables).some(function(pd){ return pd.id===d.sourceId; }); });
    arr(pk.deliverables).forEach(function(pd){
      const d = c.deliverables.find(function(x){ return x.fromPackage && x.sourceId===pd.id; });
      if(d){ d.title = pd.title; d.weeklyTarget = pd.weeklyTarget || 1; }
      else c.deliverables.push({id:uid(), title:pd.title, dueDate:null, status:'pending', linkedTaskId:null, fromPackage:true, recurring:true, completedDates:[], weeklyTarget:pd.weeklyTarget || 1, sourceId:pd.id});
    });
  });
}
function r59PkSave(){ const pk = r59Pk(ui.r59PkId); if(pk) r59PkSync(pk); persist('business'); }
ACTIONS.r59PkClose = function(){ addSheetClose('r59PkSheet'); renderView(); };
ACTIONS.r59Brush = function(el, e, id){ ui.r59Brush = id; playTick(); addSheetRefresh('r59PkSheet'); };
ACTIONS.r59PkDay = function(el, e, n){ const pk = r59Pk(ui.r59PkId), d = pk && arr(pk.deliverables).find(function(x){ return x.id===ui.r59Brush; }); if(!d) return; n = Number(n); pk.schedule = pk.schedule || {}; const L = r59PkDays(pk, d); pk.schedule[d.id] = L.indexOf(n) >= 0 ? L.filter(function(x){ return x!==n; }) : L.concat([n]).sort(function(a, b){ return a - b; }); r59PkSave(); playTick(); addSheetRefresh('r59PkSheet'); };
ACTIONS.r59PkEven = function(el, e, id){ const pk = r59Pk(ui.r59PkId), d = pk && arr(pk.deliverables).find(function(x){ return x.id===id; }); if(!d) return; const n = r59PkNeed(d), out = []; for(let k = 0; k < n; k++) out.push(1 + Math.floor(k*30/n)); pk.schedule = pk.schedule || {}; pk.schedule[id] = Array.from(new Set(out)).sort(function(a, b){ return a - b; }); r59PkSave(); playTick(); addSheetRefresh('r59PkSheet'); };
ACTIONS.r59DvStep = function(el, e, v){ const q = String(v).split('|'), pk = r59Pk(ui.r59PkId), d = pk && arr(pk.deliverables).find(function(x){ return x.id===q[0]; }); if(!d) return; d.weeklyTarget = Math.max(1, Math.min(21, (Number(d.weeklyTarget) || 1) + Number(q[1]))); r59PkSave(); playTick(); addSheetRefresh('r59PkSheet'); };
ACTIONS.r59DvDel = function(el, e, id){ const pk = r59Pk(ui.r59PkId); if(!pk) return; pk.deliverables = arr(pk.deliverables).filter(function(x){ return x.id!==id; }); if(pk.schedule) delete pk.schedule[id]; r59PkSave(); addSheetRefresh('r59PkSheet'); };
ACTIONS.r59PkDelete = function(){ const pk = r59Pk(ui.r59PkId); if(!pk) return; uiConfirm({title:'Delete '+pk.name+'?', text:'Clients on it keep their deliverables.', ok:'Delete', danger:true}).then(function(yes){ if(!yes) return; state.business.packages = arr(state.business.packages).filter(function(x){ return x!==pk; }); persist('business'); addSheetClose('r59PkSheet'); renderView(); }); };
document.addEventListener('change', function(e){
  const t = e.target; if(!t || !t.getAttribute) return;
  const pk = r59Pk(ui.r59PkId); if(!pk) return;
  const f = t.getAttribute('data-r59-pk'), dv = t.getAttribute('data-r59-dv');
  if(f==='name' && t.value.trim()){ pk.name = t.value.trim(); r59PkSave(); }
  else if(f==='price'){ pk.price = Math.max(0, Number(t.value) || 0); r59PkSave(); }
  else if(dv){ const q = dv.split(':'), d = arr(pk.deliverables).find(function(x){ return x.id===q[1]; }); if(d && t.value.trim()){ d.title = t.value.trim(); r59PkSave(); addSheetRefresh('r59PkSheet'); } }
});
document.addEventListener('keydown', function(e){
  const t = e.target; if(!t || e.key!=='Enter') return;
  if(t.id==='r59NewDv'){ e.preventDefault(); const pk = r59Pk(ui.r59PkId), v = t.value.trim(); if(!pk || !v) return; pk.deliverables = arr(pk.deliverables).concat([{id:uid(), title:v, weeklyTarget:1}]); ui.r59Brush = pk.deliverables[pk.deliverables.length - 1].id; r59PkSave(); addSheetRefresh('r59PkSheet'); setTimeout(function(){ const n = document.getElementById('r59NewDv'); if(n) n.focus(); }, 30); }
  if(t.id==='r59NewPkName'){ e.preventDefault(); ACTIONS.r59PkMake(); }
}, true);
// adding a package: a name and a price, then straight into it
openNewPackageModal = function(){ addSheetOpen('r59PkNew', function(){ return asHead('&#128230;', 'New package')+'<div class="r59-nf"><input class="input r59-nf-n" id="r59NewPkName" maxlength="40" placeholder="Name it (Growth, Starter…)"></div><div class="r59-nf-row"><span>Price a month</span><label class="r59-pk-p"><span>$</span><input id="r59NewPkPrice" type="number" min="0" placeholder="0"></label></div><div class="as-f"><button class="btn btn-primary hs-go" data-action="r59PkMake">Make it</button></div>'; }, 'r59NewPkName'); };
ACTIONS.r59PkMake = function(){ const n = document.getElementById('r59NewPkName'), p = document.getElementById('r59NewPkPrice'), name = n ? n.value.trim() : ''; if(!name){ if(n) n.focus(); return; } const pk = {id:uid(), name:name, description:'', price:Number(p && p.value) || 0, deliverables:[], schedule:{}, createdAt:todayStr()}; state.business.packages.push(pk); persist('business'); playPositive(); addSheetClose('r59PkNew'); renderView(); openPackageEditModal(pk.id); setTimeout(function(){ const d = document.getElementById('r59NewDv'); if(d) d.focus(); }, 60); };

// ---- the dates: a package's days from a cycle's start ----
function r59MonthsAfter(s, n){ const p = s.split('-').map(Number), d = new Date(p[0], p[1] - 1 + n, 1), last = new Date(d.getFullYear(), d.getMonth() + 1, 0).getDate(); return todayStr(new Date(d.getFullYear(), d.getMonth(), Math.min(p[2], last))); }
function r59Cycles(anchor, from, to){ const out = []; if(!anchor) return out; let k = 0; while(r59MonthsAfter(anchor, k + 1) <= from && k < 600) k++; for(; k < 600; k++){ const s = r59MonthsAfter(anchor, k); if(s > to) break; out.push({start:s, end:addDays(r59MonthsAfter(anchor, k + 1), -1), n:k}); } return out; }
function r59PlanFor(pk, anchor, from, to, doneDates, delivFor){
  const out = [], today = todayStr();
  r59Cycles(anchor, from, to).forEach(function(cy){
    arr(pk.deliverables).forEach(function(pd){
      const days = r59PkDays(pk, pd); if(!days.length) return;
      const d = delivFor ? delivFor(pd) : pd; if(!d) return;
      const done = arr(doneDates(d)).filter(function(x){ return x >= cy.start && x <= cy.end; }).sort(), one = (typeof delivOne==='function' ? delivOne(d) : '') || pd.title;
      days.forEach(function(n, k){ const date = addDays(cy.start, n - 1); if(date > cy.end || date < from || date > to) return; out.push({n:k + 1, of:days.length, what:one, date:date, st:k < done.length ? 'done' : date < today ? 'late' : date===today ? 'today' : 'planned', doneOn:done[k] || null, d:d, cycle:cy}); });
    });
  });
  return out.sort(function(a, b){ return a.date.localeCompare(b.date) || a.n - b.n; });
}
r57ContentPlan = (function(base){
  return function(c, ym){
    ym = ym || thisMonthKey();
    const pk = c && c.packageId ? r59Pk(c.packageId) : null;
    if(!pk || !arr(pk.deliverables).some(function(d){ return r59PkDays(pk, d).length; }) || !c.startDate) return base.apply(this, arguments);
    const y = Number(ym.slice(0, 4)), m = Number(ym.slice(5, 7)) - 1, from = todayStr(new Date(y, m, 1)), to = todayStr(new Date(y, m + 1, 0));
    const scheduled = r59PlanFor(pk, c.startDate, from, to, function(d){ return d.completedDates; }, function(pd){ return arr(c.deliverables).find(function(d){ return (d.sourceId || d.id)===pd.id || d.title===pd.title; }); });
    const keep = base.apply(this, arguments).filter(function(x){ return !arr(pk.deliverables).some(function(pd){ return r59PkDays(pk, pd).length && ((x.d.sourceId || x.d.id)===pd.id || x.d.title===pd.title); }); });
    return keep.concat(scheduled).sort(function(a, b){ return a.date.localeCompare(b.date) || a.n - b.n; });
  };
})(r57ContentPlan);
// (the old content plan dropped its own day-of-month version: the package days above are by cycle)

// ================= C12b. Your own account on a plan: a commitment =================
function r59Plans(){ const c = igCfg(); if(!c.r59Plans || typeof c.r59Plans!=='object') c.r59Plans = {}; return c.r59Plans; }
function r59PlanOf(id){ const p = r59Plans()[id]; return p && r59Pk(p.pk) ? p : null; }
r58AcctPkg = (function(base){ return function(id){ if(r58Own().some(function(x){ return x.id===id; })){ const p = r59PlanOf(id); return p ? r59Pk(p.pk) : null; } return base.apply(this, arguments); }; })(r58AcctPkg);
r58PkgPick = function(id){
  const own = r58Own().find(function(x){ return x.id===id; });
  if(own){
    const p = r59PlanOf(id); if(!p) return '';
    const pk = r59Pk(p.pk), day = Math.max(1, pbDaysBetween ? pbDaysBetween(r59Cycles(p.start, todayStr(), todayStr()).map(function(c){ return c.start; })[0] || p.start, todayStr()) + 1 : 1);
    return '<div class="r59-plan"><span class="r59-plan-k">Locked in</span><b>'+escapeHtml(pk.name)+'</b><span>Day '+day+' &middot; since '+escapeHtml(fmtDateShort(p.start))+'</span><button class="r59-plan-x" data-action="r59PlanStop" data-id="'+id+'">End it</button></div>';
  }
  const cl = r58Clients().find(function(x){ return x.id===id; }), pk = cl && cl.client && cl.client.packageId ? r59Pk(cl.client.packageId) : null;
  return pk ? '<div class="r59-plan is-client"><span class="r59-plan-k">Package</span><b>'+escapeHtml(pk.name)+'</b><span>their cycle'+(cl.client.startDate ? ', from the '+ordinal(Number(cl.client.startDate.slice(8, 10))) : '')+'</span></div>' : '';
};
if(typeof ordinal!=='function') var ordinal = function(n){ const s = ['th', 'st', 'nd', 'rd'], v = n % 100; return n+(s[(v - 20) % 10] || s[v] || s[0]); };
r58OwnCalHtml = function(id){
  const p = r59PlanOf(id), o = r58Own().find(function(x){ return x.id===id; });
  if(!p) return '<div class="r59-commit-cta"><b>Lock in on content'+(o ? ' for @'+escapeHtml(o.handle) : '')+'</b><span>Pick a plan, commit, and your month starts today.</span><button class="btn btn-primary" data-action="r59PlanOpen" data-id="'+id+'">Lock in</button></div>';
  const pk = r59Pk(p.pk), posted = r58PostedDates(id);
  const fake = {id:'own:'+id, business:o ? '@'+o.handle : 'You', name:'', packageId:pk.id, startDate:p.start, deliverables:arr(pk.deliverables).map(function(d){ return {id:d.id, sourceId:d.id, title:d.title, recurring:true, weeklyTarget:d.weeklyTarget || 1, completedDates:posted}; })};
  return r57CalHtml(fake);
};
// the commitment: pick the plan, see what you're signing up for, hold to lock in
function r59PlanSheetHtml(){
  const id = ui.r59PlanAcct, o = r58Own().find(function(x){ return x.id===id; }), L = arr(state.business.packages);
  let pk = r59Pk(ui.r59PlanPk) || L.find(function(x){ return x.type==='self'; }) || L[0] || null; ui.r59PlanPk = pk ? pk.id : null;
  const end = addDays(r59MonthsAfter(todayStr(), 1), -1);
  const what = pk ? arr(pk.deliverables).map(function(d){ const n = r59PkDays(pk, d).length || r59PkNeed(d); return '<span style="--c:'+r59DelivColor(pk, d)+'"><b>'+n+'</b>'+escapeHtml(d.title)+'</span>'; }).join('') : '';
  return '<button class="int-x hs-x" data-action="addSheetClose" title="Close">&#10005;</button>'+
    '<div class="r59-commit">'+
      '<div class="r59-commit-k">Lock in on content</div><div class="r59-commit-t">'+(o ? '@'+escapeHtml(o.handle) : 'Your account')+'</div>'+
      (L.length ? '<div class="r59-commit-pks">'+L.map(function(x){ return '<button class="'+(pk===x ? 'is-on' : '')+'" data-action="r59PlanPk" data-id="'+x.id+'"><b>'+escapeHtml(x.name)+'</b><small>'+arr(x.deliverables).map(function(d){ return (r59PkDays(x, d).length || r59PkNeed(d))+' '+escapeHtml(d.title); }).join(' · ')+'</small></button>'; }).join('')+'</div>' : '<div class="r59-commit-none">Make a package first (Business → Packages).</div>')+
      (pk ? '<div class="r59-commit-what">'+what+'</div><div class="r59-commit-when">Day 1 is today. By <b>'+escapeHtml(fmtDateShort(end))+'</b> it’s all out.</div>'+
        '<button class="r59-hold" data-r59-hold="'+id+'"><span class="r59-hold-f"></span><span class="r59-hold-l">Hold to lock in</span></button>' : '')+
    '</div>';
}
ACTIONS.r59PlanOpen = function(el, e, id){ ui.r59PlanAcct = id; ui.r59PlanPk = null; addSheetOpen('r59Plan', r59PlanSheetHtml); };
ACTIONS.r59PlanPk = function(el, e, id){ ui.r59PlanPk = id; playTick(); addSheetRefresh('r59Plan'); };
ACTIONS.r59PlanStop = function(el, e, id){ uiConfirm({title:'End this plan?', text:'Your posts stay; the calendar stops counting.', ok:'End it', danger:true}).then(function(y){ if(!y) return; delete r59Plans()[id]; persist('settings'); renderView(); }); };
function r59Commit(id){
  const pk = r59Pk(ui.r59PlanPk); if(!pk) return;
  r59Plans()[id] = {pk:pk.id, start:todayStr(), at:Date.now()}; persist('settings');
  addSheetClose('r59Plan'); playPositive();
  const o = r58Own().find(function(x){ return x.id===id; });
  showToast('Locked in: '+pk.name+(o ? ' on @'+o.handle : '')+'. Day 1 is today.', {icon:'&#128274;', duration:4200});
  try{ if(typeof xpAward==='function') xpAward('work', 'commit', 25, 'Locked in on content'); }catch(e){}
  ui.r58Acct = null; ui.sxRole = o ? o.role : ui.sxRole; renderView();
}
(function(){
  let t = null, el = null;
  const stop = function(){ clearTimeout(t); t = null; if(el){ el.classList.remove('is-holding'); el = null; } };
  const start = function(e){ const b = e.target.closest && e.target.closest('[data-r59-hold]'); if(!b) return; e.preventDefault(); el = b; b.classList.add('is-holding'); t = setTimeout(function(){ const id = b.getAttribute('data-r59-hold'); stop(); r59Commit(id); }, 1400); };
  document.addEventListener('mousedown', start); document.addEventListener('touchstart', start, {passive:false});
  ['mouseup', 'mouseleave', 'touchend', 'touchcancel'].forEach(function(k){ document.addEventListener(k, function(e){ if(el && (k!=='mouseleave' || e.target===document)) stop(); }); });
  document.addEventListener('keydown', function(e){ const b = e.target.closest && e.target.closest('[data-r59-hold]'); if(b && (e.key==='Enter' || e.key===' ') && !e.repeat){ start({target:b, preventDefault:function(){}}); } });
  document.addEventListener('keyup', function(e){ if(el && (e.key==='Enter' || e.key===' ')) stop(); });
})();

// ================= C13. Each client's calendar =================
function r59ClientItems(c, from, to){
  const out = [], today = todayStr();
  const put = function(date, kind, t, color, extra){ if(date && date >= from && date <= to) out.push(Object.assign({date:date, kind:kind, t:t, c:color}, extra || {})); };
  // deliverables (their content, from their package's days)
  for(let k = 0; ; k++){ const d0 = new Date(Number(from.slice(0, 4)), Number(from.slice(5, 7)) - 1 + k, 1); const ym = d0.getFullYear()+'-'+pad2(d0.getMonth() + 1); if(ym > to.slice(0, 7) || k > 3) break; try{ r57ContentPlan(c, ym).forEach(function(x){ put(x.date, 'content', x.what+' '+x.n, '#9B7BFF', {st:x.st}); }); }catch(e){} }
  // their playbook's steps (this cycle and the next)
  if(c.pb && c.pb.id){ try{ const s = pbState('client', c); if(s){ s.occ.forEach(function(o){ put(o.date, 'step', o.it.title, (PB_TYPES[o.it.type] || PB_TYPES.task).color, {st:o.done ? 'done' : o.date < today ? 'late' : 'planned'}); }); const p = pbById(c.pb.id); if(p && s.cyc && s.stage && s.stage.repeat==='month'){ const nx = pbCycle(c, p, addDays(s.cyc.end, 1)); pbOccs(c, p, nx).forEach(function(o){ put(o.date, 'step', o.it.title, (PB_TYPES[o.it.type] || PB_TYPES.task).color, {st:'planned'}); }); } } }catch(e){} }
  // tasks with a date
  arr(state.tasks.items).forEach(function(t){ if(t.client===c.id && t.deadline && !(t.master && t.master.kind==='pb')) put(t.deadline, 'task', t.title, '#5BC0EB', {st:t.status==='done' ? 'done' : t.deadline < today ? 'late' : 'planned'}); });
  // calendar events
  arr(state.calendar.events).forEach(function(e){ if(e.linkedClient===c.id) put(e.date, 'event', (e.time ? fmt12Hour(e.time)+' ' : '')+e.title, '#3DDC97'); });
  // their cycle and billing
  if(c.startDate) r59Cycles(c.startDate, from, to).forEach(function(cy){ put(cy.start, 'cycle', 'Cycle '+(cy.n + 1)+' starts', '#F5B342'); });
  if(Number(c.mrr) > 0){ const bd = Number(c.billingDay) || 1; for(let k = 0; k < 3; k++){ const d0 = new Date(Number(from.slice(0, 4)), Number(from.slice(5, 7)) - 1 + k, 1), last = new Date(d0.getFullYear(), d0.getMonth() + 1, 0).getDate(); put(todayStr(new Date(d0.getFullYear(), d0.getMonth(), Math.min(bd, last))), 'bill', 'Bill '+(typeof money==='function' ? money(c.mrr) : '$'+c.mrr), '#FF8FCF'); } }
  return out;
}
const R59_KINDS = [['content', 'Content'], ['step', 'Playbook'], ['task', 'Tasks'], ['event', 'Events'], ['cycle', 'Cycle'], ['bill', 'Billing']];
function r59ClientCalHtml(c){
  const ym = ui.r59CcMonth || thisMonthKey(), y = Number(ym.slice(0, 4)), m = Number(ym.slice(5, 7)) - 1, days = new Date(y, m + 1, 0).getDate(), lead = (new Date(y, m, 1).getDay() + 6) % 7, today = todayStr();
  const off = ui.r59CcOff || {}, items = r59ClientItems(c, todayStr(new Date(y, m, 1)), todayStr(new Date(y, m, days))).filter(function(x){ return !off[x.kind]; }), by = {};
  items.forEach(function(x){ (by[x.date] = by[x.date] || []).push(x); });
  let cells = ''; for(let i = 0; i < lead; i++) cells += '<div class="r59-cc-d is-empty"></div>';
  for(let i = 1; i <= days; i++){ const d = todayStr(new Date(y, m, i)), its = (by[d] || []).sort(function(a, b){ return R59_KINDS.findIndex(function(k){ return k[0]===a.kind; }) - R59_KINDS.findIndex(function(k){ return k[0]===b.kind; }); });
    cells += '<div class="r59-cc-d'+(d===today ? ' is-today' : '')+(d < today ? ' is-past' : '')+'"><span>'+i+'</span>'+its.slice(0, 4).map(function(x){ return '<b class="is-'+x.kind+(x.st ? ' is-'+x.st : '')+'" style="--c:'+x.c+'" title="'+escapeHtml(x.t)+'">'+escapeHtml(x.t)+'</b>'; }).join('')+(its.length > 4 ? '<small>+'+(its.length - 4)+'</small>' : '')+'</div>'; }
  return '<div class="r59-cc">'+
    '<div class="r59-cc-h"><button data-action="r59CcMonth" data-id="-1" aria-label="Last month">&lsaquo;</button><b>'+new Date(y, m, 1).toLocaleDateString(undefined, {month:'long', year:'numeric'})+'</b><button data-action="r59CcMonth" data-id="1" aria-label="Next month">&rsaquo;</button>'+
      '<span class="r59-cc-f">'+R59_KINDS.map(function(k){ const col = {content:'#9B7BFF', step:'#E8A23D', task:'#5BC0EB', event:'#3DDC97', cycle:'#F5B342', bill:'#FF8FCF'}[k[0]]; return '<button class="'+(off[k[0]] ? '' : 'is-on')+'" style="--c:'+col+'" data-action="r59CcKind" data-id="'+k[0]+'"><i></i>'+k[1]+'</button>'; }).join('')+'</span></div>'+
    '<div class="r59-cc-w">'+['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'].map(function(w){ return '<span>'+w+'</span>'; }).join('')+'</div><div class="r59-cc-g">'+cells+'</div></div>';
}
ACTIONS.r59CcMonth = function(el, e, d){ const ym = ui.r59CcMonth || thisMonthKey(), dt = new Date(Number(ym.slice(0, 4)), Number(ym.slice(5, 7)) - 1 + Number(d), 1); ui.r59CcMonth = dt.getFullYear()+'-'+pad2(dt.getMonth() + 1); playTick(); r59CcRefresh(); };
ACTIONS.r59CcKind = function(el, e, k){ ui.r59CcOff = ui.r59CcOff || {}; ui.r59CcOff[k] = !ui.r59CcOff[k]; playTick(); r59CcRefresh(); };
function r59CcRefresh(){ if(document.getElementById('clientModalContent') && ui.showClientModal) renderClientModalInto(); renderView(); }
(function(){ const i = CLIENT_SECTIONS.findIndex(function(s){ return s[0]==='overview'; }); if(!CLIENT_SECTIONS.some(function(s){ return s[0]==='calendar'; })) CLIENT_SECTIONS.splice(i + 1, 0, ['calendar', '&#128197;', 'Calendar']); })();
renderClientModal = (function(base){
  return function(){
    if(ui.clientSec!=='calendar') return base.apply(this, arguments);
    const c = arr(state.business.clients).find(function(x){ return x.id===ui.showClientModal; }); if(!c) return '';
    ui.clientSec = 'overview'; let h; try{ h = base.apply(this, arguments); } finally { ui.clientSec = 'calendar'; }
    h = h.replace(/(<button class="cm-nav-i) is-on(" data-action="clientSec" data-id="overview")/, '$1$2').replace(/(<button class="cm-nav-i)(" data-action="clientSec" data-id="calendar")/, '$1 is-on$2');
    return h.replace(/<div class="cm-pane" data-key="cm-overview">[\s\S]*?(<button class="cm-x")/, function(m0, x){ return '<div class="cm-pane r59-cm-cal" data-key="cm-calendar"><div class="cm-h">Calendar</div>'+r59ClientCalHtml(c)+'</div>'+x; });
  };
})(renderClientModal);

// ================= C14. The Calendar: one client at a time =================
function r59CalClient(){ const id = ui.r59CalClient; return id ? arr(state.business.clients).find(function(c){ return c.id===id; }) || null : null; }
cxMonthCardHtml = (function(base){
  return function(){
    const h = base.apply(this, arguments), c = r59CalClient(), cs = mtActiveClients();
    const pick = cs.length ? '<label class="r59-calf"><select data-r59-calc aria-label="Show"><option value="">Everything</option>'+cs.map(function(x){ return '<option value="'+x.id+'"'+(c && c.id===x.id ? ' selected' : '')+'>'+escapeHtml(x.business || x.name)+'</option>'; }).join('')+'</select></label>' : '';
    let out = h.replace('<span style="flex:1"></span>', '<span style="flex:1"></span>'+pick);
    if(!c) return out;
    const y = ui.calendarYear, m = ui.calendarMonth, dim = new Date(y, m + 1, 0).getDate(), today = todayStr(), sel = ui.calendarSelectedDate || today;
    const off = ui.r59CcOff || {}, items = r59ClientItems(c, todayStr(new Date(y, m, 1)), todayStr(new Date(y, m, dim))).filter(function(x){ return !off[x.kind]; }), by = {};
    items.forEach(function(x){ (by[x.date] = by[x.date] || []).push(x); });
    out = out.replace(/(<button class="cx-d[^"]*" data-action="selectCalDay" data-date="(\d{4}-\d{2}-\d{2})"[^>]*>)<span>(\d+)<\/span>[\s\S]*?<\/button>/g, function(m0, open, ds, n){
      const its = by[ds] || [];
      return open+'<span>'+n+'</span>'+(its.length ? '<small class="cx-peek" style="--c:'+its[0].c+'">'+escapeHtml(its[0].t)+'</small>'+(its.length > 1 ? '<small class="cx-more">+'+(its.length - 1)+'</small>' : '') : '')+'<em>'+Array.from(new Set(its.map(function(x){ return x.c; }))).slice(0, 4).map(function(col){ return '<i style="background:'+col+'"></i>'; }).join('')+'</em></button>';
    });
    const day = (by[sel] || []);
    const agenda = '<div class="cx-agenda r59-cxa" data-key="r59cxa-'+c.id+'-'+sel+'"><div class="r59-cxa-h">'+escapeHtml(c.business || c.name)+' &middot; '+escapeHtml(fmtDateShort(sel))+'</div>'+(day.length ? day.map(function(x){ return '<div class="r59-cxa-i" style="--c:'+x.c+'"><i></i><span>'+escapeHtml(x.t)+'</span><small>'+escapeHtml((R59_KINDS.find(function(k){ return k[0]===x.kind; }) || ['', ''])[1])+'</small></div>'; }).join('') : '<div class="r59-cxa-none">Nothing for them this day.</div>')+'</div>';
    out = out.replace(/<div class="cx-legend">[\s\S]*?<\/div>/, '<div class="cx-legend r59-cxl">'+R59_KINDS.map(function(k){ const col = {content:'#9B7BFF', step:'#E8A23D', task:'#5BC0EB', event:'#3DDC97', cycle:'#F5B342', bill:'#FF8FCF'}[k[0]]; return '<button class="'+(off[k[0]] ? '' : 'is-on')+'" data-action="r59CalKind" data-id="'+k[0]+'"><i style="background:'+col+'"></i>'+k[1]+'</button>'; }).join('')+'</div>');
    out = out.replace(/<div class="cx-agenda[\s\S]*<\/section>$/, agenda+'</section>');
    return out;
  };
})(cxMonthCardHtml);
document.addEventListener('change', function(e){ const t = e.target; if(!t || !t.hasAttribute || !t.hasAttribute('data-r59-calc')) return; ui.r59CalClient = t.value || null; playTick(); renderView(); });
ACTIONS.r59CalKind = function(el, e, k){ ui.r59CcOff = ui.r59CcOff || {}; ui.r59CcOff[k] = !ui.r59CcOff[k]; playTick(); renderView(); };

// ================= D15. Every page and sub-tab animates =================
// Switching tabs inside a page used to patch the page in place with no motion. Now whatever a tab switch changed
// slides in: the page's tab panel for a main tab, or the part under the sub-tabs for a sub-tab (the tab bars
// themselves stay put).
const R59_TOP = ['businessTab', 'personalTab', 'focusTab', 'settingsTab', 'healthTab', 'socTab'];
function r59TabSig(){
  const o = {};
  Object.keys(ui).forEach(function(k){
    if(!/(Tab|Sub|SubTab|View|Sec|Mode|Lc|LcCal|Who)$/.test(k) && k!=='r52Sub') return;
    const v = ui[k]; if(v==null || typeof v==='function') return;
    o[k] = typeof v==='object' ? JSON.stringify(v) : String(v);
  });
  return o;
}
function r59IsBar(el){ return /(^|\s)(tabs|seg-tabs|sub-pills|sub-tabs|pb6-bar|r58-biz|r54-lcw|r59-lct|r56-lv|seg|hs-seg|r52-sub|set-sub|view-header)(\s|$)/.test(el.className || '') || /tabs|pills/.test(el.className || '') && el.children.length <= 12 && !el.querySelector('.card'); }
function r59Animate(root){
  if(!root) return;
  let kids = Array.from(root.children).filter(function(k){ return !r59IsBar(k); });
  // (one wrapper that holds a sub-tab bar: go one level in, so the bar stays still)
  if(kids.length===1 && Array.from(kids[0].children).some(r59IsBar)) kids = Array.from(kids[0].children).filter(function(k){ return !r59IsBar(k); });
  kids.forEach(function(k, i){ k.classList.remove('r59-in'); void k.offsetWidth; k.style.setProperty('--r59-i', String(Math.min(i, 6))); k.classList.add('r59-in'); setTimeout(function(){ k.classList.remove('r59-in'); }, 700); });
}
renderView = (function(base){
  return function(){
    const r = base.apply(this, arguments);
    try{
      const v0 = R59.lastView, s0 = R59.lastSig || {}, s1 = r59TabSig(); R59.lastView = ui.view; R59.lastSig = s1;
      if(ui.view!==v0) return r;
      const changed = Object.keys(Object.assign({}, s0, s1)).filter(function(k){ return s0[k]!==s1[k]; });
      if(!changed.length) return r;
      const vr = document.getElementById('viewRoot'); if(!vr) return r;
      if(changed.some(function(k){ return R59_TOP.indexOf(k) >= 0; })){ r59Animate(vr.querySelector('.tab-panel') || vr); return r; }
      if(changed.indexOf('clientSec') >= 0){ r59Animate(document.querySelector('.cm-pane')); return r; }
      const panel = vr.querySelector('.tab-panel') || vr, sub = panel.querySelector('.subtab-panel');
      r59Animate(sub && sub.parentNode!==panel ? sub : sub || panel);
    }catch(e){}
    return r;
  };
})(renderView);
// (sheets: their own sections slide in too)
['bsTab', 'clientSec'].forEach(function(k){ const b = ACTIONS[k]; if(!b) return; ACTIONS[k] = function(){ const r = b.apply(this, arguments); setTimeout(function(){ r59Animate(document.querySelector(k==='bsTab' ? '.r59-bs-b' : '.cm-pane')); }, 0); return r; }; });

// ================= D16. Health: weight & fuel =================
// One panel, two even halves with room around everything: your weight (the number, its trend, the goal, three plain
// stats) and your fuel (the day, the ring, the week, what you ate). Numbers are rounded to one decimal everywhere.
function r59N(v){ const n = Number(v); return isFinite(n) ? String(Math.round(n*10)/10) : '–'; }
function r59Spark(vals){
  if(vals.length < 2) return '<div class="r59-spark is-empty"></div>';
  const lo = Math.min.apply(null, vals), hi = Math.max.apply(null, vals), rg = Math.max(0.5, hi - lo), W = 300, H = 64;
  const pts = vals.map(function(v, i){ return [(i/(vals.length - 1))*W, H - 6 - ((v - lo)/rg)*(H - 14)]; });
  const d = pts.map(function(p, i){ return (i ? 'L' : 'M')+p[0].toFixed(1)+' '+p[1].toFixed(1); }).join(' ');
  const last = pts[pts.length - 1];
  return '<svg class="r59-spark" viewBox="0 0 '+W+' '+H+'" preserveAspectRatio="none"><path d="'+d+' L'+W+' '+H+' L0 '+H+' Z" class="a"/><path d="'+d+'" class="l"/><circle cx="'+last[0].toFixed(1)+'" cy="'+last[1].toFixed(1)+'" r="3.5" class="p"/></svg>';
}
renderBodyFuel = function(){
  const today = todayStr(), unit = state.profile.weightUnit==='kg' ? 'kg' : 'lbs';
  const log = arr(state.health.weightLog).slice().sort(function(a, b){ return a.date.localeCompare(b.date); });
  const latest = log[log.length - 1], goal = Number(state.profile.goalWeight) || null;
  const weekAgo = log.filter(function(w){ return w.date <= addDays(today, -7); }).slice(-1)[0];
  const delta = latest && weekAgo ? latest.weight - weekAgo.weight : null;
  const w30 = log.filter(function(w){ return w.date >= addDays(today, -30); }), chg = w30.length >= 2 ? w30[w30.length - 1].weight - w30[0].weight : null;
  let goalHtml = '<button class="r59-link" data-action="goToProfileSettings">Set a goal weight</button>';
  if(goal && latest){ const startW = log[0].weight, total = startW - goal, pct = total > 0 ? clamp(Math.round((startW - latest.weight)/total*100), 0, 100) : (latest.weight <= goal ? 100 : 0), left = latest.weight - goal;
    goalHtml = '<div class="r59-goal"><span>Goal '+r59N(goal)+'</span><i><u style="width:'+pct+'%"></u></i><b>'+(left > 0 ? r59N(left)+' to go' : 'Reached')+'</b></div>'; }
  const weight = '<section class="r59-wt">'+
    '<header><span class="r59-k">Weight</span>'+(delta!=null && Math.abs(delta) >= 0.05 ? '<span class="r59-chip '+(delta < 0 ? 'is-down' : 'is-up')+'">'+(delta < 0 ? '&#9660; ' : '&#9650; ')+r59N(Math.abs(delta))+' this week</span>' : '')+'</header>'+
    '<div class="r59-big"><b>'+(latest ? r59N(latest.weight) : '–')+'</b><small>'+unit+'</small></div>'+
    r59Spark(log.slice(-30).map(function(r){ return Number(r.weight); }))+goalHtml+
    '<div class="r59-stats"><div><b>'+(chg==null ? '–' : (chg > 0 ? '+' : '')+r59N(chg))+'</b><span>30 days</span></div><div><b>'+(log.length ? r59N(Math.min.apply(null, log.map(function(w){ return Number(w.weight); }))) : '–')+'</b><span>Lowest</span></div><div><b>'+w30.length+'</b><span>Weigh-ins</span></div></div>'+
  '</section>';
  const day = r57FuelDay(), items = arr(state.health.calorieEntries).filter(function(c){ return c.date===day; });
  const total = items.reduce(function(a, c){ return a + Number(c.calories || 0); }, 0), target = state.profile.calorieTarget || 2000;
  const pct = clamp(Math.round(total/target*100), 0, 999), left = target - total, color = pct > 110 ? 'var(--danger)' : pct >= 85 ? 'var(--good)' : 'var(--accent)';
  const label = day===today ? 'Today' : day===addDays(today, -1) ? 'Yesterday' : new Date(localTs(day, '12:00')).toLocaleDateString(undefined, {weekday:'short', month:'short', day:'numeric'});
  const week = []; for(let i = 6; i >= 0; i--){ const d = addDays(day, -i); week.push({d:d, t:arr(state.health.calorieEntries).filter(function(c){ return c.date===d; }).reduce(function(a, c){ return a + Number(c.calories || 0); }, 0)}); }
  const top = Math.max(target*1.2, Math.max.apply(null, week.map(function(w){ return w.t; })));
  const picks = arr(state.meals && state.meals.library).slice().sort(function(a, b){ return (b.uses || 0) - (a.uses || 0); }).slice(0, 4);
  const fuel = '<section class="r59-fu">'+
    '<header><span class="r59-k">Fuel</span><span class="r59-day"><button data-action="r57FuelDay" data-id="-1" aria-label="The day before">&lsaquo;</button><label><b>'+escapeHtml(label)+'</b><input type="date" id="r57FuelDate" max="'+today+'" value="'+day+'"></label><button data-action="r57FuelDay" data-id="1" aria-label="The day after"'+(day >= today ? ' disabled' : '')+'>&rsaquo;</button></span></header>'+
    '<div class="r59-fu-top"><div class="r59-ring">'+svgRing(clamp(pct, 0, 100), 84, color, String(total), 'of '+target)+'</div>'+
      '<div class="r59-left'+(left < 0 ? ' is-over' : '')+'"><b>'+Math.abs(left)+'</b><span>cal '+(left >= 0 ? 'left' : 'over')+(day===today ? ' today' : '')+'</span></div>'+
      '<div class="r59-wk">'+week.map(function(w){ return '<button class="'+(w.d===day ? 'is-on' : '')+(w.t > target*1.1 ? ' is-over' : w.t >= target*0.85 ? ' is-hit' : '')+'" data-action="r57FuelPick" data-id="'+w.d+'" title="'+fmtDateShort(w.d)+': '+w.t+' cal"><u style="height:'+(w.t ? Math.max(8, w.t/top*100) : 3).toFixed(0)+'%"></u><span>'+'SMTWTFS'.charAt(new Date(localTs(w.d, '12:00')).getDay())+'</span></button>'; }).join('')+'</div></div>'+
    '<div class="r59-food">'+(items.length ? items.map(function(c){ return '<div><span>'+escapeHtml(c.name || 'Food')+'</span><b>'+Number(c.calories || 0)+'</b>'+deleteBtn('calorie', c.id)+'</div>'; }).join('') : '<div class="is-none">Nothing logged'+(day===today ? ' yet' : '')+'</div>')+'</div>'+
    (picks.length ? '<div class="r59-picks">'+picks.map(function(m){ return '<button data-action="quickMeal" data-id="'+m.id+'"><span>'+escapeHtml(m.name)+'</span><b>'+m.calories+'</b></button>'; }).join('')+'</div>' : '')+
  '</section>';
  return '<div class="card r59-bf section" id="bodyFuel">'+weight+fuel+'</div>';
};
// (no number with a dozen decimals anywhere on Health)
renderFitness = (function(base){ return function(){ return base.apply(this, arguments).replace(/(>\s*-?\d+\.\d)\d{2,}/g, '$1'); }; })(renderFitness);

// ================= D17. The Journal =================
// Write on the left, read on the right: a compact composer (it grows as you write) and your entries as a clean feed.
renderJournalEntriesTab = (function(base){ return function(){ return '<div class="r59-jr'+(ui.journalViewMode==='clients' ? ' is-clients' : '')+'">'+base.apply(this, arguments)+'</div>'; }; })(renderJournalEntriesTab);
document.addEventListener('input', function(e){ const t = e.target; if(t && t.id==='journalPageText'){ t.style.height = 'auto'; t.style.height = Math.min(520, Math.max(130, t.scrollHeight + 2))+'px'; } });
