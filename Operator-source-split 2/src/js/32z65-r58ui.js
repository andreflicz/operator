// ============ ROUND 58: THE PAGES ============
// Business tabs in his order; Playbooks in one place (Overview of who's on what, Builder, a ★ default); Social as the
// content command center (every account up top, his own set apart, tap one for its numbers, its package and its
// content calendar; full screen when you want it); a delivery calendar on every package (and packages just for you);
// Settings: one App updates list, no Payments header outside Integrations; Op's window, bigger and readable.

// ================= G. Business: Overview, Clients, Leads, Packages, Finances, Playbooks =================
renderBusiness = (function(base){
  return function(){
    const h = base.apply(this, arguments), t = ui.businessTab || 'overview';
    const cn = arr(state.business.clients).filter(function(c){ return clientStageActive(c.stage); }).length, ln = arr(state.business.pipeline).filter(leadIsOpen).length;
    const tab = function(id, label, n){ return '<div class="tab '+(t===id ? 'active' : '')+'" data-action="businessTab" data-tab="'+id+'">'+label+(n!=null ? ' <span class="r58-tn">'+n+'</span>' : '')+'</div>'; };
    const lane = '<div class="tabs tabs-with-tools biz-tabs r58-biz">'+tab('overview', 'Overview')+tab('clients', 'Clients', cn)+tab('leads', 'Leads', ln)+tab('packages', 'Packages')+tab('finances', 'Finances')+tab('lifecycle', 'Playbooks')+
      '<div class="tabs-tools"><button class="biz-gear is-lane'+(t==='log' ? ' is-on' : '')+'" data-action="businessTab" data-tab="log">&#128203;<span>Log center</span></button><button class="biz-gear is-lane" data-action="bizSetupOpen" aria-label="Business setup">&#9881;&#65038;<span>Setup</span></button></div></div><div class="tab-panel"';
    return h.replace(/<div class="tabs[^"]*biz-tabs[^"]*">[\s\S]*?<div class="tab-panel"/, function(){ return lane; });
  };
})(renderBusiness);

// ================= H. Playbooks: one place =================
// Overview: every playbook someone is on, as a column of their cards (like the Leads board), and everyone who isn't on
// one at the bottom (drag a card onto a playbook). Builder: every playbook in one row of pills, clients' and leads'
// together, ★ for the default (it's the one picked for you when you add someone).
function r58Star(p){ return !!(p && p.star); }
function r58Default(kind){ return pbAll().find(function(p){ return r58Star(p) && pbFor(p)===(kind==='lead' ? 'lead' : 'client'); }) || null; }
pbEditorHtml = function(){
  pbSeed(); pbAll().forEach(pb57Migrate);
  const view = ui.pbView==='build' ? 'build' : 'board';
  const bar = '<div class="pb6-bar"><div class="seg-tabs seg-sm"><button class="seg-tab'+(view==='board' ? ' active' : '')+'" data-action="pb6View" data-id="board">Overview</button><button class="seg-tab'+(view==='build' ? ' active' : '')+'" data-action="pb6View" data-id="build">Builder</button></div>'+
    '<span class="pb6-sp"></span><button class="btn btn-sm btn-primary" data-action="pb6NewOpen">+ New playbook</button></div>';
  if(!pbAll().length) return '<div class="pb6">'+bar+'<div class="pb6-empty"><b>No playbooks yet</b><button class="btn btn-sm btn-primary" data-action="pb6NewOpen">+ New playbook</button></div></div>';
  if(view==='board') return '<div class="pb6 r58-pb">'+bar+r58PbOverview()+'</div>';
  let p = pbById(ui.pbSel); if(!p){ p = pbAll()[0]; ui.pbSel = p.id; }
  ui.pbWho = pbFor(p);
  const pills = '<div class="pb6-pills">'+pbAll().map(function(x){ return '<span class="r58-pill'+(x.id===p.id ? ' is-on' : '')+'"><button class="r58-star'+(r58Star(x) ? ' is-on' : '')+'" data-action="r58Star" data-id="'+x.id+'" aria-label="Make it the default">'+(r58Star(x) ? '&#9733;' : '&#9734;')+'</button><button class="r58-pn" data-action="pbPick" data-id="'+x.id+'">'+escapeHtml(x.name)+'<em>'+(pbFor(x)==='lead' ? 'Leads' : 'Clients')+'</em></button></span>'; }).join('')+'</div>';
  return '<div class="pb6 pb57">'+bar+pills+pb57BuildHtml(p)+'</div>';
};
function r58PbOverview(){
  const people = pbCountsFor('client').map(function(x){ return {k:'client', x:x}; }).concat(pbCountsFor('lead').map(function(x){ return {k:'lead', x:x}; }));
  const on = function(p){ return people.filter(function(P){ return P.x.pb && P.x.pb.id===p.id; }); };
  const active = pbAll().filter(function(p){ return on(p).length; }), idle = pbAll().filter(function(p){ return !on(p).length; });
  const off = people.filter(function(P){ return !P.x.pb || !P.x.pb.id || !pbById(P.x.pb.id); });
  const col = function(p){
    const L = on(p);
    return '<section class="pb6-col r58-col" data-pb6-col="'+p.id+'"><header>'+(r58Star(p) ? '<i class="r58-sti">&#9733;</i>' : '')+'<b>'+escapeHtml(p.name)+'</b><span>'+L.length+'</span><button class="pb6-cedit" data-action="pb6Build" data-id="'+p.id+'" aria-label="Open it in the Builder">&#9998;</button></header>'+
      '<small class="pb6-cmeta">'+(pbFor(p)==='lead' ? 'Leads' : 'Clients')+' · '+pbStages(p).length+' stage'+(pbStages(p).length===1 ? '' : 's')+'</small>'+
      '<div class="pb6-cards">'+L.map(function(P){ return pbCardHtml(P.k, P.x); }).join('')+'</div></section>';
  };
  const offCard = function(P){
    const d = r58Default(P.k), cc = P.k==='client' ? clientAccent(P.x) : '#8B95A7';
    return '<div class="pb6-card r58-off" draggable="true" data-pb6-drag="'+P.k+':'+P.x.id+'" style="--cc:'+cc+'"><div class="pb6-ch"><i></i><b>'+escapeHtml(pbName(P.k, P.x))+'</b><span class="r58-kind">'+(P.k==='lead' ? 'Lead' : 'Client')+'</span></div>'+
      (d ? '<button class="r58-put" data-action="r58PutDefault" data-id="'+P.k+':'+P.x.id+'">&#9733; '+escapeHtml(d.name)+'</button>' : '')+'</div>';
  };
  return (active.length ? '<div class="pb6-board r58-board">'+active.map(col).join('')+'</div>' : '<div class="r58-none">Nobody’s on a playbook yet. Drag someone from below onto one in the Builder, or use ★.</div>')+
    (idle.length ? '<div class="r58-idle"><span>Not running</span>'+idle.map(function(p){ return '<button class="pb6-pill r58-drop" data-action="pb6Build" data-id="'+p.id+'" data-pb6-col="'+p.id+'">'+(r58Star(p) ? '&#9733; ' : '')+escapeHtml(p.name)+'</button>'; }).join('')+'</div>' : '')+
    '<section class="pb6-col is-off r58-offs" data-pb6-col=""><header><b>Not on a playbook</b><span>'+off.length+'</span></header><div class="r58-offg">'+off.map(offCard).join('')+'</div></section>';
}
// a playbook nobody's on yet is a pill; drop someone on it to start them
document.addEventListener('dragover', function(e){ const d = e.target.closest && e.target.closest('.r58-drop'); if(!d || !Array.from(e.dataTransfer.types || []).includes('text/pb6')) return; e.preventDefault(); d.classList.add('is-over'); });
document.addEventListener('dragleave', function(e){ const d = e.target.closest && e.target.closest('.r58-drop'); if(d) d.classList.remove('is-over'); });
document.addEventListener('drop', function(e){ const d = e.target.closest && e.target.closest('.r58-drop'); if(!d) return; const v = e.dataTransfer.getData('text/pb6'); if(!v) return; e.preventDefault(); d.classList.remove('is-over'); const q = v.split(':'); pbMoveTo(q[0], q[1], d.getAttribute('data-pb6-col')); });
ACTIONS.r58Star = function(el, e, id){
  const p = pbById(id); if(!p) return; const on = !r58Star(p);
  pbAll().forEach(function(x){ if(pbFor(x)===pbFor(p)) x.star = false; }); p.star = on;
  playTick(); pbSave(); renderView();
};
ACTIONS.r58PutDefault = function(el, e, v){ const q = String(v).split(':'), d = r58Default(q[0]); if(d) pbMoveTo(q[0], q[1], d.id); };
// (a lead can't go on a client playbook or the other way round)
pbMoveTo = (function(base){
  return function(kind, id, pbId){
    const to = pbId ? pbById(pbId) : null;
    if(to && pbFor(to)!==(kind==='lead' ? 'lead' : 'client')){ showToast(to.name+' is a playbook for '+(pbFor(to)==='lead' ? 'leads' : 'clients')+'.', {icon:'&#9776;'}); return Promise.resolve(false); }
    return base.apply(this, arguments);
  };
})(pbMoveTo);
ACTIONS.pb6Build = function(el, e, id){ ui.pbSel = id; ui.pbView = 'build'; ui.pbItem = null; ui.pb57Stage = null; renderView(); };
// adding someone: the ★ playbook is picked for you
renderNewContact = (function(base){
  return function(){
    const h = base.apply(this, arguments), d = r58Default(ui.newContactKind || 'lead'); if(!d) return h;
    return h.replace('<option value="'+d.id+'">', '<option value="'+d.id+'" selected>');
  };
})(renderNewContact);

// ================= I. Social: the content command center =================
// No Clients tab. Overview starts with every account: yours (business, personal) set apart in gold, then clients'.
// Tap one: its numbers, the package it's on, its content calendar (and, for a client, the report). "Full screen"
// gives Social the whole window, like Inspiration.
function r58Own(){ return arr(igCfg().accounts).map(function(a){ const d = sxAccountData(a) || {}; return {id:a.id, own:true, role:a.role, handle:d.username || a.username || '', pic:d.pic || '', a:a}; }); }
function r58Clients(){ const L = r55CliLinks(), mine = r58Own(), ids = {}, names = {}; mine.forEach(function(x){ ids[x.id] = 1; ['zid', 'accountId', 'znId'].forEach(function(k){ if(x.a[k]) ids[x.a[k]] = 1; }); if(x.handle) names[String(x.handle).toLowerCase()] = 1; });
  return arr(ui.r55CliAll || igCfg().cliAll).filter(function(a){ return L[a.id] || !(ids[a.id] || names[String(a.username || '').toLowerCase()]); }).map(function(a){ const c = L[a.id] ? crmFind('client', L[a.id]) : null; return {id:a.id, own:false, handle:a.username || '', platform:a.platform, client:c, a:a}; }); }
function r58AcctPkg(id){ const m = igCfg().r58Pkg || {}, P = arr(state.business.packages); if(m[id]) return P.find(function(p){ return p.id===m[id]; }) || null; const cid = r55CliLinks()[id], c = cid ? crmFind('client', cid) : null; return c && c.packageId ? P.find(function(p){ return p.id===c.packageId; }) || null : null; }
function r58StripHtml(){
  // the client accounts load here now (they used to load when the old Clients tab opened)
  if(!ui.r55CliAll && !ui.r55CliBusy && !ui.r55CliTried){ ui.r55CliTried = true; ui.r55CliAll = igCfg().cliAll || null; try{ r55CliLoad(false); }catch(e){} }
  const own = r58Own(), cl = r58Clients(), sel = ui.r58Acct;
  const role = sxRole(), clientOpen = sel && !own.some(function(x){ return x.id===sel; });
  const chip = function(x){ return '<button class="r58-ac'+(x.own ? ' is-own' : '')+((x.own ? !clientOpen && x.role===role : sel===x.id) ? ' is-on' : '')+'" data-action="r58Acct" data-id="'+x.id+'"'+(x.client ? ' style="--cc:'+clientAccent(x.client)+'"' : '')+'>'+(x.pic ? '<img src="'+escapeHtml(x.pic)+'" alt="">' : '<span class="r58-av">'+escapeHtml(String(x.handle || '?').slice(0, 1).toUpperCase())+'</span>')+'<b>@'+escapeHtml(x.handle)+'</b>'+(x.own ? '<small>'+(x.role==='personal' ? 'You' : 'Your business')+'</small>' : x.client ? '<small>'+escapeHtml(x.client.business || x.client.name)+'</small>' : '')+'</button>'; };
  const swap = own.length > 1 ? '<button class="r58-swap" data-action="sxSwapRoles" title="Swap which account is business and which is personal" aria-label="Swap business and personal">&#8644;</button>' : '';
  return '<div class="r58-strip">'+(own.length ? '<div class="r58-own">'+own.map(chip).join('')+swap+'</div>' : '')+(cl.length ? '<div class="r58-cls">'+cl.map(chip).join('')+'</div>' : '')+'</div>';
}
function r58PkgPick(id){
  const pk = r58AcctPkg(id), list = arr(state.business.packages);
  return '<label class="r58-pk"><span>Package</span><select class="input input-sm" data-r58-pkg="'+id+'"><option value="">None</option>'+list.map(function(p){ return '<option value="'+p.id+'"'+(pk && pk.id===p.id ? ' selected' : '')+'>'+escapeHtml(p.name)+(p.type==='self' ? ' (just me)' : '')+'</option>'; }).join('')+'</select></label>';
}
function r58FocusHtml(){
  const id = ui.r58Acct, own = r58Own().find(function(x){ return x.id===id; }), cl = !own ? r58Clients().find(function(x){ return x.id===id; }) : null;
  if(!own && !cl){ ui.r58Acct = null; return null; }
  let numbers = '';
  if(own){ const c = igCfg(), all = c.accounts; c.accounts = all.filter(function(a){ return a.id===id; }); try{ numbers = sxProfileCard(own.role); } finally { c.accounts = all; } }
  else { const d = r55CliData(id) || {}; numbers = '<div class="sx-prof"><div class="sx-prof-h"><span class="sx-av">'+escapeHtml(String(cl.handle || '?').slice(0, 1).toUpperCase())+'</span><div><div class="sx-prof-k">'+escapeHtml(cl.client ? cl.client.business || cl.client.name : 'Client account')+'</div><b>@'+escapeHtml(cl.handle)+'</b></div></div>'+
    '<div class="sx-tiles"><div class="sx-t"><b>'+(d.followers || cl.a.followers ? sxNum(d.followers || cl.a.followers) : '–')+'</b><span>followers</span></div><div class="sx-t"><b>'+(d.p30!=null ? d.p30 : '–')+'</b><span>posts</span><small>30 days</small></div><div class="sx-t"><b>'+(d.views ? sxNum(d.views) : '–')+'</b><span>views</span><small>30 days</small></div></div>'+
    (d.best ? '<div class="r58-best"><small>Best this month</small><b>'+escapeHtml((d.best.cap || '').slice(0, 90))+'</b><span>'+sxNum(d.best.views || 0)+' views</span></div>' : '')+'</div>'; }
  const c = cl && cl.client, cal = c ? r57CalHtml(c) : r58OwnCalHtml(id);
  const who = cl ? '<label class="r58-pk"><span>Client</span><select class="input input-sm" data-r58-cli="'+id+'"><option value="">Not linked</option>'+arr(state.business.clients).map(function(x){ return '<option value="'+x.id+'"'+(c && c.id===x.id ? ' selected' : '')+'>'+escapeHtml(x.business || x.name)+'</option>'; }).join('')+'</select></label>' : '';
  const acts = '<div class="r58-facts">'+who+r58PkgPick(id)+(c ? '<button class="btn btn-primary btn-sm" data-action="r55Report" data-id="'+c.id+'">Write their report</button><button class="btn btn-sm" data-action="r57CliExport" data-id="'+c.id+'">Export the calendar</button>' : '')+'</div>';
  return '<div class="r58-focus"><section>'+numbers+'</section><section>'+acts+cal+'</section></div>';
}
// your own account's month: the package's pieces on their days, done as you post
function r58OwnCalHtml(id){
  const pk = r58AcctPkg(id); if(!pk) return '<div class="r57-cc"><div class="r57-cc-none">Link a package to see this account’s content calendar.</div></div>';
  const fake = {id:'own:'+id, business:'', name:'', deliverables:arr(pk.deliverables).map(function(d){ return {id:d.id, sourceId:d.id, title:d.title, recurring:true, weeklyTarget:d.weeklyTarget || 1, completedDates:r58PostedDates(id)}; }), packageId:pk.id, pb:null};
  return r57CalHtml(fake);
}
function r58PostedDates(id){ const a = arr(igCfg().accounts).find(function(x){ return x.id===id; }), d = a ? sxAccountData(a) : null; return arr(d && d.posts).map(function(p){ return p.date; }).filter(Boolean).sort(); }
sxOverviewHtml = (function(base){
  return function(){
    const strip = r58StripHtml(), mine = r58Own(), cur = ui.r58Acct && !mine.some(function(x){ return x.id===ui.r58Acct; }) ? r58FocusHtml() : null;
    if(cur) return strip+cur;
    ui.r58Acct = null;
    const me = mine.find(function(x){ return x.role===sxRole(); }) || mine[0];
    const dash = base.apply(this, arguments).replace(/<div class="sx2-acc">[\s\S]*?<\/div>/, '');
    return strip+dash+(me ? r58OwnPanelHtml(me.id) : '');
  };
})(sxOverviewHtml);
ACTIONS.r58Acct = function(el, e, id){ const o = r58Own().find(function(x){ return x.id===id; }); if(o){ ui.sxRole = o.role; ui.r58Acct = null; } else ui.r58Acct = id || null; ui.socTab = 'overview'; playTick(); renderView(); };
// your own account under its numbers: its package and its month of content
function r58OwnPanelHtml(id){ return '<div class="r58-focus r58-ownp" data-acct="'+id+'"><section><div class="r58-facts">'+r58PkgPick(id)+'</div>'+r58OwnCalHtml(id)+'</section></div>'; }
document.addEventListener('change', function(e){ const t = e.target; if(!t || !t.getAttribute || !t.hasAttribute('data-r58-pkg')) return; const c = igCfg(); c.r58Pkg = c.r58Pkg || {}; if(t.value) c.r58Pkg[t.getAttribute('data-r58-pkg')] = t.value; else delete c.r58Pkg[t.getAttribute('data-r58-pkg')]; persist('settings'); renderView(); });
document.addEventListener('change', function(e){ const t = e.target; if(!t || !t.getAttribute || !t.hasAttribute('data-r58-cli')) return; const L = r55CliLinks(), a = t.getAttribute('data-r58-cli'); if(t.value) L[a] = t.value; else delete L[a]; persist('settings'); try{ r55CliLoad(true); }catch(err){} renderView(); });
renderConversations = (function(base){
  return function(){
    if(ui.socTab==='clients') ui.socTab = 'overview';
    const full = document.documentElement.classList.contains('r58-content');
    return base.apply(this, arguments)
      .replace(/<button class="seg-tab[^"]*" data-action="socTab" data-id="clients">[\s\S]*?<\/button>/, '')
      .replace(/(<div class="row" style="gap:8px;align-items:center;">)/, function(m0){ return m0+'<button class="btn btn-sm r58-cm" data-action="r58Content">'+(full ? 'Exit full screen' : '&#10530; Full screen')+'</button>'; });
  };
})(renderConversations);
ACTIONS.r58Content = function(){ document.documentElement.classList.toggle('r58-content'); playTick(); renderView(); };
document.addEventListener('keydown', function(e){ if(e.key==='Escape' && document.documentElement.classList.contains('r58-content') && !document.querySelector('.overlay:not(.hidden)')){ document.documentElement.classList.remove('r58-content'); renderView(); } });
afterRenderHooks.push(function(){ if(ui.view!=='convos' && document.documentElement.classList.contains('r58-content')) document.documentElement.classList.remove('r58-content'); });

// ================= J. Packages: a delivery calendar, and packages just for you =================
// Under the packages: pick one, then for each of its deliverables tap the days of the month each piece goes out (a
// reel on the 3rd, the 10th…). Clients on that package get their content calendar from it (and accounts linked to it
// in Social); a package "just for me" isn't billed to anyone.
function r58PkSel(){ const L = arr(state.business.packages); let p = L.find(function(x){ return x.id===ui.r58Pk; }); if(!p){ p = L[0] || null; ui.r58Pk = p ? p.id : null; } return p; }
function r58PkMonthly(d){ return Math.max(1, Math.round((Number(d.weeklyTarget) || 1)*52/12)); }
renderPackagesTab = (function(base){
  return function(){
    const h = base.apply(this, arguments), pk = r58PkSel(); if(!pk) return h;
    const L = arr(state.business.packages), sch = pk.schedule || {};
    const linked = r58Own().concat(r58Clients()).filter(function(x){ const q = r58AcctPkg(x.id); return q && q.id===pk.id; }).map(function(x){ return '@'+x.handle; });
    const rows = arr(pk.deliverables).map(function(d){
      const days = arr(sch[d.id]).map(Number), need = r58PkMonthly(d);
      let cells = ''; for(let i = 1; i <= 31; i++) cells += '<button class="'+(days.indexOf(i) >= 0 ? 'is-on' : '')+'" data-action="r58PkDay" data-id="'+d.id+'|'+i+'">'+i+'</button>';
      return '<div class="r58-pkr"><div class="r58-pkh"><b>'+escapeHtml(d.title)+'</b><span class="'+(days.length===need ? 'is-ok' : days.length > need ? 'is-over' : '')+'">'+days.length+' of '+need+' placed</span><button class="r58-even" data-action="r58PkEven" data-id="'+d.id+'">Spread them out</button></div><div class="r58-days">'+cells+'</div></div>';
    }).join('');
    const panel = '<section class="r58-pkc"><div class="r58-pkc-h">'+(L.length > 1 ? '<div class="pb6-pills">'+L.map(function(x){ return '<button class="pb6-pill'+(x.id===pk.id ? ' is-on' : '')+'" data-action="r58Pk" data-id="'+x.id+'">'+escapeHtml(x.name)+'</button>'; }).join('')+'</div>' : '<b>'+escapeHtml(pk.name)+'</b>')+
      '<div class="seg-tabs seg-sm"><button class="seg-tab'+(pk.type==='self' ? '' : ' active')+'" data-action="r58PkType" data-id="client">For clients</button><button class="seg-tab'+(pk.type==='self' ? ' active' : '')+'" data-action="r58PkType" data-id="self">Just me</button></div></div>'+
      '<div class="r58-pkc-k">When each piece goes out, every month'+(linked.length ? ' · '+escapeHtml(linked.join(', ')) : '')+'</div>'+(rows || '<div class="r58-none">This package has no deliverables yet.</div>')+'</section>';
    return h+panel;
  };
})(renderPackagesTab);
ACTIONS.r58Pk = function(el, e, id){ ui.r58Pk = id; playTick(); renderView(); };
ACTIONS.r58PkType = function(el, e, v){ const pk = r58PkSel(); if(!pk) return; pk.type = v==='self' ? 'self' : 'client'; persist('business'); playTick(); renderView(); };
ACTIONS.r58PkDay = function(el, e, v){ const q = String(v).split('|'), pk = r58PkSel(); if(!pk) return; pk.schedule = pk.schedule || {}; const L = arr(pk.schedule[q[0]]).map(Number), n = Number(q[1]); pk.schedule[q[0]] = L.indexOf(n) >= 0 ? L.filter(function(x){ return x!==n; }) : L.concat([n]).sort(function(a, b){ return a - b; }); persist('business'); playTick(); renderView(); };
ACTIONS.r58PkEven = function(el, e, id){ const pk = r58PkSel(), d = pk && arr(pk.deliverables).find(function(x){ return x.id===id; }); if(!d) return; const n = r58PkMonthly(d), out = []; for(let k = 0; k < n; k++) out.push(Math.min(28, 1 + Math.floor(k*28/n) + 1)); pk.schedule = pk.schedule || {}; pk.schedule[id] = Array.from(new Set(out)).sort(function(a, b){ return a - b; }); persist('business'); playTick(); renderView(); };
packageRow = (function(base){ return function(pk){ const h = base.apply(this, arguments); return pk.type==='self' ? h.replace('<div class="pk-name">', '<div class="pk-name"><span class="r58-self">Just me</span>') : h; }; })(packageRow);
// a client's (or your account's) content calendar follows the package's days when they're set
r57ContentPlan = (function(base){
  return function(c, ym){
    const out = base.apply(this, arguments);
    const pk = c && c.packageId ? arr(state.business.packages).find(function(p){ return p.id===c.packageId; }) : null; if(!pk || !pk.schedule) return out;
    ym = ym || thisMonthKey();
    const y = Number(ym.slice(0, 4)), m = Number(ym.slice(5, 7)) - 1, last = new Date(y, m + 1, 0).getDate(), today = todayStr();
    let res = out;
    arr(c.deliverables).filter(function(d){ return d.recurring; }).forEach(function(d){
      const days = arr(pk.schedule[d.sourceId || d.id]); if(!days.length) return;
      const done = arr(d.completedDates).filter(function(x){ return monthKeyOf(x)===ym; }).sort(), one = delivOne(d) || 'Piece';
      res = res.filter(function(x){ return x.d!==d; });
      days.slice().sort(function(a, b){ return a - b; }).forEach(function(day, k){ const date = todayStr(new Date(y, m, Math.min(last, Number(day)))); const st = k < done.length ? 'done' : date < today ? 'late' : date===today ? 'today' : 'planned'; res.push({n:k + 1, of:days.length, what:one, date:date, st:st, doneOn:done[k] || null, d:d}); });
    });
    return res.sort(function(a, b){ return a.date.localeCompare(b.date) || a.n - b.n; });
  };
})(r57ContentPlan);

// ================= K. Settings =================
// App updates: no "Counted as updates" picker (everything there is an update). Connections & Data: the Payments card
// only on Integrations. Op: no separate "Op's ideas" list (they're in App updates).
renderSettings = (function(base){
  return function(){
    let h = base.apply(this, arguments);
    const sub = (ui.r52Sub || {})['settings-system'] || 'integrations';
    if(/data-key="settings-system"/.test(h) && sub!=='integrations' && typeof payCardHtml==='function'){ const pc = payCardHtml(); if(pc && h.indexOf(pc) >= 0) h = h.replace(pc, ''); }
    if(h.indexOf('upd-foot') < 0 && h.indexOf('Op’s ideas for the app') < 0) return h;
    const t = document.createElement('template'); t.innerHTML = h;
    t.content.querySelectorAll('.upd-foot').forEach(function(x){ x.remove(); });
    t.content.querySelectorAll('.field.op-set > label').forEach(function(l){ if(/^Op’s ideas for the app/.test(l.textContent.trim())) l.parentNode.remove(); });
    const d = document.createElement('div'); d.appendChild(t.content.cloneNode(true)); return d.innerHTML;
  };
})(renderSettings);
// (the empty-state line on App updates without the "filed under …" explainer)
renderUpdatesTab = (function(base){ return function(){ return base.apply(this, arguments).replace(/No updates (yet|in this range)\.[^<]*/, function(m0, w){ return 'No updates '+w+'.'; }); }; })(renderUpdatesTab);

// ================= Op's window =================
// Bigger by default; it opens on your conversation (each line with its time, and it scrolls); the buttons are three
// matching round ones: open full screen, turn off (mute / an hour / off), close.
setTimeout(function(){ try{ const s = state.profile.opBubSize; if(!s || !s.w || s.w < 440){ state.profile.opBubSize = Object.assign({}, s || {}, {w:460}); persist('profile'); } }catch(e){} }, 0);
opBubShow = (function(base){
  return function(){
    const b = base.apply(this, arguments);
    if(b){
      if(!b.classList.contains('is-log')){ b.classList.add('is-log'); try{ OPCD.sig = ''; opChatDraw(); }catch(e){} }
      const off = b.querySelector('.r57-bub-off'); if(off && !off.classList.contains('r58-round')){ off.classList.add('r58-round'); off.innerHTML = '&#9211;'; off.setAttribute('aria-label', 'Turn Op off'); off.title = 'Turn Op off'; }
      const op = b.querySelector('.r57-bub-open'); if(op) op.classList.add('r58-round');
      const x = b.querySelector('.op-bub-x'); if(x) x.classList.add('r58-round');
      r58BubGrip(b); r58BubLogSize(b);
    }
    return b;
  };
})(opBubShow);
// resizing sizes the conversation itself (the old grip sized a line that's hidden in the conversation view), the size
// you drag to stays, and with no size set the conversation fits what's in it, up to most of the window
function r58BubLogSize(b){
  const log = b && b.querySelector('.op-bub-log'); if(!log) return;
  const s = state.profile.opBubSize || {};
  if(s.h) { log.style.setProperty('height', Math.max(140, Math.min(window.innerHeight*0.75, s.h))+'px', 'important'); log.style.removeProperty('max-height'); }
  else { log.style.removeProperty('height'); }
  b.classList.toggle('r58-sized', !!s.h);
}
function r58BubGrip(b){
  const g0 = b.querySelector('.op-bub-rs'); if(!g0 || g0.r58) return;
  const g = g0.cloneNode(true); g.r58 = true; g0.replaceWith(g); // drops the old handlers
  g.addEventListener('mousedown', function(e){
    e.preventDefault(); e.stopPropagation();
    const log = b.querySelector('.op-bub-log'), r = b.getBoundingClientRect(), h0 = log ? log.getBoundingClientRect().height : 300, x0 = e.clientX, y0 = e.clientY;
    b.classList.add('is-resizing');
    const mv = function(ev){
      const w = Math.max(340, Math.min(window.innerWidth - 40, r.width + (ev.clientX - x0)));
      const h = Math.max(140, Math.min(window.innerHeight*0.75, h0 - (ev.clientY - y0)));
      state.profile.opBubSize = {w:Math.round(w), h:Math.round(h)};
      b.style.setProperty('width', w+'px', 'important'); r58BubLogSize(b);
    };
    const up = function(){ document.removeEventListener('mousemove', mv); document.removeEventListener('mouseup', up); b.classList.remove('is-resizing'); persist('profile'); };
    document.addEventListener('mousemove', mv); document.addEventListener('mouseup', up);
  });
  g.addEventListener('dblclick', function(){ state.profile.opBubSize = {w:460, h:0}; persist('profile'); b.style.setProperty('width', '460px', 'important'); r58BubLogSize(b); });
}
