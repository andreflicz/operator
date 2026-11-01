// ============ ROUND 60: THE PAGES ============
// Op's little pop-up by the XP, the push-to-talk explainer, presets on the page, the Log center tab, deliverable
// cadence and personal packages in the package sheet, the hover labels, Social's clients and settings, the Calendar's
// controls, Goals order, the Journal and the Vault.

// ================= A4. When Op logs something: a short glow by the XP =================
// No long note in the corner: one short line slides out next to your level, glowing white like Op. Tap it to read the
// whole thing. (Everything still goes to Notifications → From Op.)
function r60PopLine(text, kind){
  if(kind==='idea') return 'Op saved something to App updates';
  const t = String(text || '').replace(/\s+/g, ' ').trim();
  return 'Op: '+(t.length > 46 ? t.slice(0, 44).replace(/\s+\S*$/, '')+'…' : t);
}
r57Note = function(text, kind, more){
  text = String(text || '').trim(); if(!text) return;
  more = more || {};
  const it = r58FeedAdd({kind:kind==='idea' ? 'update' : 'did', short:text.slice(0, 160), full:more.full || text, title:more.title || '', entry:more.entry || null});
  let pop = document.getElementById('r60Pop');
  if(pop){ clearTimeout(pop._out); pop.remove(); }
  pop = document.createElement('div'); pop.id = 'r60Pop'; pop.className = 'r60-pop'+(kind==='idea' ? ' is-idea' : ''); pop.setAttribute('data-feed', it.id);
  pop.innerHTML = '<button class="r60-pop-h" data-action="r60PopOpen"><i class="r60-pop-o"></i><span>'+escapeHtml(r60PopLine(text, kind))+'</span></button><div class="r60-pop-b"><p>'+escapeHtml(more.full || text)+'</p><time>'+r57Clock()+'</time></div>';
  document.body.appendChild(pop);
  r60PopPlace(pop);
  requestAnimationFrame(function(){ pop.classList.add('is-in'); });
  const out = function(){ pop._out = setTimeout(function(){ if(pop.classList.contains('is-open')) return; pop.classList.remove('is-in'); setTimeout(function(){ pop.remove(); }, 420); }, 4500); };
  out();
  pop.addEventListener('mouseenter', function(){ clearTimeout(pop._out); });
  pop.addEventListener('mouseleave', function(){ if(!pop.classList.contains('is-open')) out(); });
};
function r60PopPlace(pop){
  const d = document.querySelector('#musicDock .md-in') || document.getElementById('musicDock');
  if(d){ const r = d.getBoundingClientRect(); pop.style.top = Math.max(8, r.top + r.height/2 - 17)+'px'; pop.style.right = Math.max(8, window.innerWidth - r.left + 10)+'px'; }
  else { pop.style.top = '14px'; pop.style.right = '16px'; }
}
ACTIONS.r60PopOpen = function(el){ const p = el.closest('.r60-pop'); if(!p) return; clearTimeout(p._out); p.classList.toggle('is-open'); if(!p.classList.contains('is-open')){ p._out = setTimeout(function(){ p.classList.remove('is-in'); setTimeout(function(){ p.remove(); }, 420); }, 2000); } };
document.addEventListener('mousedown', function(e){ const p = document.getElementById('r60Pop'); if(p && p.classList.contains('is-open') && !p.contains(e.target)){ p.classList.remove('is-open', 'is-in'); setTimeout(function(){ p.remove(); }, 420); } });
window.addEventListener('resize', function(){ const p = document.getElementById('r60Pop'); if(p) r60PopPlace(p); });

// ================= A5. Push-to-talk away from the app =================
// Settings → Op says plainly whether the key works with Operator in the background, and what to turn on if it doesn't.
r57KeyWarn = (function(base){
  return function(){
    const warn = base.apply(this, arguments), h = (typeof R57!=='undefined' && R57.keyHealth) || {};
    let info;
    if(!OPAPP) info = '<b>Only while this window is in front.</b> In the Operator Mac app the key works anywhere on your Mac.';
    else if(warn) info = '';
    else if(h.ok===true) info = '<b>Works anywhere on your Mac</b>, even with Operator hidden (it keeps running from the menu bar).';
    else info = '<b>Works anywhere on your Mac while Operator is running.</b> It needs Input Monitoring and Accessibility for Operator in System Settings → Privacy &amp; Security. <button class="btn btn-sm" data-action="r57OpenPrivacy">Check</button>';
    return warn+(info ? '<div class="r60-ptt">'+info+'</div>' : '');
  };
})(r57KeyWarn);

// ================= B. Presets and chains on the page =================
function r60PresetCards(){
  const card = function(key, icon, name, line, del){ return '<div class="r60-pre"><button class="r60-pre-b" data-action="r60UsePreset" data-id="'+key+'"><i>'+icon+'</i><b>'+escapeHtml(name)+'</b><small>'+escapeHtml(line)+'</small></button>'+(del ? '<button class="r60-pre-x" data-action="r60DelPreset" data-id="'+key+'" aria-label="Remove this preset" data-hov="Remove this preset">&#10005;</button>' : '')+'</div>'; };
  return '<div class="r60-pres">'+
    card('chain', '&#10145;&#65039;', 'Onboarding → Monthly client', 'Both, chained: when onboarding’s done they move on by themselves')+
    R60_PRESETS.map(function(p){ return card(p.key, p.icon, p.name, p.line); }).join('')+
    r60Customs().map(function(c){ return card(c.id, '&#11088;', c.name, pbStages({stages:c.stages}).length+' stage'+(c.stages.length===1 ? '' : 's')+' · your preset', true); }).join('')+
  '</div>';
}
pb6NewHtml = (function(base){
  return function(){
    const h = base.apply(this, arguments), i = h.indexOf('<div class="r59-nf">');
    if(i < 0) return h;
    return h.slice(0, i)+'<div class="r60-pk-k">Start from</div>'+r60PresetCards()+'<div class="r60-pk-k">Or from scratch</div>'+h.slice(i);
  };
})(pb6NewHtml);
r58PbOverview = (function(base){
  return function(){
    let h = base.apply(this, arguments);
    // (a chain shows on its column: "then Monthly client")
    pbAll().forEach(function(p){ const nx = p.next && pbById(p.next); if(!nx) return; h = h.replace(new RegExp('(data-pb6-col="'+p.id+'"[\\s\\S]*?<small class="pb6-cmeta">[^<]*)'), '$1 · then '+escapeHtml(nx.name).replace(/\$/g, '$$$$')); });
    if(!pbAll().some(function(p){ return pbFor(p)==='client'; })) h += '<section class="r60-empty"><div class="r60-empty-h"><b>Start your client playbooks</b></div>'+r60PresetCards()+'</section>';
    return h;
  };
})(r58PbOverview);
renderBusiness = (function(base){
  return function(){
    let h = base.apply(this, arguments);
    const t = ui.businessTab || 'overview';
    // C9. the Log center is a tab, after Leads (no separate button)
    h = h.replace(/<button class="biz-gear is-lane[^"]*" data-action="businessTab" data-tab="log">[\s\S]*?<\/button>/, '');
    if(h.indexOf('data-tab="log"') < 0 || !/<div class="tab[^"]*" data-action="businessTab" data-tab="log"/.test(h)){
      h = h.replace(/(<div class="tab[^"]*" data-action="businessTab" data-tab="leads">[\s\S]*?<\/div>)/, function(m0){ return m0+'<div class="tab '+(t==='log' ? 'active' : '')+'" data-action="businessTab" data-tab="log">Log center'+(typeof reachNeeds==='function' && reachNeeds().length ? ' <span class="r58-tn">'+reachNeeds().length+'</span>' : '')+'</div>'; });
    }
    if(t==='lifecycle' && ui.pbView==='build'){
      const p = pbSel();
      if(p && !p.master) h = h.replace(/(<button class="pb6-del" data-action="pbDelete")/, '<button class="btn btn-sm r60-save" data-action="r60SavePreset" data-id="'+p.id+'">'+(r60Customs().some(function(x){ return x.from===p.id; }) ? 'Update preset' : 'Save as preset')+'</button>$1');
      h = h.replace('<span>After the last stage</span>', '<span>When they finish</span>').replace(/>It ends<\/option>/, '>They’re done</option>').replace(/>Back to the first stage<\/option>/, '>They start over</option>').replace(/>On to ([^<]*)<\/option>/g, '>They move to $1</option>');
    }
    return h;
  };
})(renderBusiness);

// ================= C10–C12. The package sheet: cadence, personal, the hover =================
ACTIONS.r60DvPer = function(el, e, v){
  const q = String(v).split('|'), pk = r59Pk(ui.r59PkId), d = pk && arr(pk.deliverables).find(function(x){ return x.id===q[0]; }); if(!d) return;
  if(q[1]==='month'){ d.per = 'month'; d.monthly = d.monthly || Math.max(1, Math.round((Number(d.weeklyTarget) || 1)*52/12)); } else { delete d.per; }
  r59PkSave(); playTick(); addSheetRefresh('r59PkSheet');
};
ACTIONS.r59DvStep = (function(base){ return function(el, e, v){ const q = String(v).split('|'), pk = r59Pk(ui.r59PkId), d = pk && arr(pk.deliverables).find(function(x){ return x.id===q[0]; }); if(d && r60PerMonth(d)){ d.monthly = Math.max(1, Math.min(60, r60Monthly(d) + Number(q[1]))); r59PkSave(); playTick(); addSheetRefresh('r59PkSheet'); return; } return base.apply(this, arguments); }; })(ACTIONS.r59DvStep);
ACTIONS.r60PkPersonal = function(el, e, v){ const pk = r59Pk(ui.r59PkId); if(!pk) return; pk.personal = v==='1'; if(pk.personal){ pk.type = 'self'; pk.price = 0; } else if(pk.type==='self') delete pk.type; r59PkSave(); playTick(); addSheetRefresh('r59PkSheet'); };
r59PkSheetHtml = (function(base){
  return function(){
    let h = base.apply(this, arguments);
    const pk = r59Pk(ui.r59PkId); if(!pk) return h;
    arr(pk.deliverables).forEach(function(d){
      const re = new RegExp('(<button data-action="r59DvStep" data-id="'+d.id+'\\|-1">&minus;</button><b>)\\d+(</b>[\\s\\S]*?</span>)<small>a week</small>');
      h = h.replace(re, function(m0, a, b){ return a+(r60PerMonth(d) ? r60Monthly(d) : (d.weeklyTarget || 1))+b+'<span class="r60-per"><button class="'+(r60PerMonth(d) ? '' : 'is-on')+'" data-action="r60DvPer" data-id="'+d.id+'|week">a week</button><button class="'+(r60PerMonth(d) ? 'is-on' : '')+'" data-action="r60DvPer" data-id="'+d.id+'|month">a month</button></span>'; });
    });
    // (hover a day: what goes out that day)
    h = h.replace(/<button class="r59-cd([^"]*)" data-action="r59PkDay" data-id="(\d+)">/g, function(m0, cls, n){
      const on = arr(pk.deliverables).filter(function(d){ return r59PkDays(pk, d).indexOf(Number(n)) >= 0; }).map(function(d){ return d.title; });
      const brush = arr(pk.deliverables).find(function(d){ return d.id===ui.r59Brush; });
      const lab = 'Day '+n+': '+(on.length ? on.join(', ') : 'nothing yet')+(brush ? (on.indexOf(brush.title) >= 0 ? ' · tap to take '+brush.title+' off' : ' · tap to add '+brush.title) : '');
      return '<button class="r59-cd'+cls+'" data-action="r59PkDay" data-id="'+n+'" title="'+escapeHtml(lab)+'" data-hov="'+escapeHtml(lab)+'">';
    });
    const per = '<div class="r60-kind"><button class="'+(r60Personal(pk) ? '' : 'is-on')+'" data-action="r60PkPersonal" data-id="0">For clients</button><button class="'+(r60Personal(pk) ? 'is-on' : '')+'" data-action="r60PkPersonal" data-id="1">Personal</button></div>';
    h = h.replace('<div class="r59-pk-sec">What’s in it</div>', per+'<div class="r59-pk-sec">What’s in it</div>');
    if(r60Personal(pk)){
      h = h.replace(/<label class="r59-pk-p">[\s\S]*?<\/label>/, '<span class="r60-me">Personal</span>');
      h = h.replace(/<div class="r59-pk-sec">On it<\/div><div class="r59-on">[\s\S]*?<\/div>/, '');
      h = h.replace('<span>Day 1 is when their cycle starts</span>', '<span>Day 1 is the day you lock in</span>');
    }
    return h;
  };
})(r59PkSheetHtml);
packageRow = (function(base){
  return function(pk){
    let h = base.apply(this, arguments);
    if(r60Personal(pk)){
      const me = Object.keys(r59Plans()).some(function(a){ return r59Plans()[a] && r59Plans()[a].pk===pk.id; });
      h = h.replace(/<div class="pk-price">[\s\S]*?<\/div><\/div>/, '<span class="r60-me">Personal</span></div>').replace(/<div class="r59-pkc-f">[\s\S]*?<\/div>\s*<\/button>$/, '<div class="r59-pkc-f">'+(me ? 'You’re locked in on it' : 'Lock in on it from Social')+'</div></button>');
    }
    arr(pk.deliverables).forEach(function(d){ if(r60PerMonth(d)) return; });
    return h;
  };
})(packageRow);
openNewPackageModal = function(){
  ui.r60NewPersonal = false;
  addSheetOpen('r59PkNew', function(){
    const me = !!ui.r60NewPersonal;
    return asHead('&#128230;', 'New package')+
      '<div class="r60-kind"><button class="'+(me ? '' : 'is-on')+'" data-action="r60NewKind" data-id="0">For clients</button><button class="'+(me ? 'is-on' : '')+'" data-action="r60NewKind" data-id="1">Personal</button></div>'+
      '<div class="r59-nf"><input class="input r59-nf-n" id="r59NewPkName" maxlength="40" placeholder="'+(me ? 'Name it (My brand, Daily content…)' : 'Name it (Growth, Starter…)')+'" value="'+escapeHtml(ui.r60NewPkName || '')+'"></div>'+
      (me ? '' : '<div class="r59-nf-row"><span>Price a month</span><label class="r59-pk-p"><span>$</span><input id="r59NewPkPrice" type="number" min="0" placeholder="0"></label></div>')+
      '<div class="as-f"><button class="btn btn-primary hs-go" data-action="r59PkMake">Make it</button></div>';
  }, 'r59NewPkName');
};
ACTIONS.r60NewKind = function(el, e, v){ const n = document.getElementById('r59NewPkName'); ui.r60NewPkName = n ? n.value : ''; ui.r60NewPersonal = v==='1'; playTick(); addSheetRefresh('r59PkNew'); };
ACTIONS.r59PkMake = (function(base){ return function(){ const me = !!ui.r60NewPersonal, n0 = arr(state.business.packages).length; const r = base.apply(this, arguments); const L = arr(state.business.packages); if(L.length > n0 && me){ const pk = L[L.length - 1]; pk.personal = true; pk.type = 'self'; pk.price = 0; persist('business'); addSheetRefresh('r59PkSheet'); } ui.r60NewPkName = ''; return r; }; })(ACTIONS.r59PkMake);
// (packages for clients don't offer a personal one, and the lock-in sheet offers personal ones first)
// (C12, everywhere: a button with no label never shows its internal name, like "R59 pk day", on hover)
hovLabelFor = (function(base){ return function(el){ const own = el.getAttribute('data-hov') || el.getAttribute('title') || el.getAttribute('aria-label'); if(own) return own; const a = el.getAttribute('data-action') || ''; if(/^r\d/i.test(a) || /\d/.test(a)) return ''; return base.apply(this, arguments); }; })(hovLabelFor);

// ================= D13–D14. Social: your clients, and a settings button =================
// The accounts row ends with your clients (each in their own colour) and a + to add a client's account; the ⇄ swap
// becomes a ⚙ with the account settings in it. Full screen and Refresh sit a little lower, clear of your level.
r58StripHtml = (function(base){
  return function(){
    let h = base.apply(this, arguments);
    h = h.replace(/<button class="r58-swap"[^>]*>[\s\S]*?<\/button>/, '');
    const cls = r58Clients(), add = '<button class="r60-addcl" data-action="r60CliOpen" data-hov="Add or link a client’s account"><i>+</i>'+(cls.length ? '' : 'Add a client’s account')+'</button>';
    const gear = '<button class="r60-socset" data-action="r60SocSettings" aria-label="Social settings" data-hov="Social settings">&#9881;&#65038;</button>';
    if(h.indexOf('<div class="r58-cls">') >= 0) h = h.replace('<div class="r58-cls">', '<div class="r58-cls"><span class="r60-k">Clients</span>').replace(/(<div class="r58-cls">[\s\S]*?)(<\/div><\/div>)$/, '$1'+add+'$2');
    else h = h.replace(/<\/div>$/, '<div class="r58-cls"><span class="r60-k">Clients</span>'+add+'</div></div>');
    return h.replace(/<\/div>$/, gear+'</div>');
  };
})(r58StripHtml);
function r60CliSheetHtml(){
  const L = r58Clients(), cs = arr(state.business.clients).filter(function(c){ return clientStageActive(c.stage); });
  const row = function(x){ const c = x.client; return '<div class="r60-cl" style="--cc:'+(c ? clientAccent(c) : 'var(--border-strong)')+'"><i></i><b>@'+escapeHtml(x.handle)+'</b><small>'+escapeHtml(x.platform==='facebook' ? 'Facebook' : 'Instagram')+'</small><select class="input input-sm" data-r58-cli="'+x.id+'"><option value="">Not a client</option>'+cs.map(function(k){ return '<option value="'+k.id+'"'+(c && c.id===k.id ? ' selected' : '')+'>'+escapeHtml(k.business || k.name)+'</option>'; }).join('')+'</select></div>'; };
  return asHead('&#128101;', 'Clients’ accounts')+
    (L.length ? '<div class="r60-cls">'+L.map(row).join('')+'</div>' : '<div class="r60-none"><b>No client accounts yet</b><span>Connect each client’s Instagram or Facebook in Zernio (the same Zernio as yours), then tap Refresh: they show up here to link to a client.</span></div>')+
    '<div class="as-f"><button class="btn" data-action="r60CliRefresh">Refresh</button><button class="btn btn-primary" data-action="addSheetClose">Done</button></div>';
}
ACTIONS.r60CliOpen = function(){ addSheetOpen('r60Cli', r60CliSheetHtml); };
ACTIONS.r60CliRefresh = function(){ try{ ACTIONS.r55CliRefresh(); }catch(e){} setTimeout(function(){ addSheetRefresh('r60Cli'); }, 1500); };
document.addEventListener('change', function(e){ if(e.target && e.target.hasAttribute && e.target.hasAttribute('data-r58-cli')) setTimeout(function(){ try{ addSheetRefresh('r60Cli'); }catch(err){} }, 50); });
ACTIONS.r60SocSettings = function(){
  addSheetOpen('r60Soc', function(){
    const own = r58Own();
    return asHead('&#9881;&#65038;', 'Social settings')+
      '<div class="r60-set">'+
        own.map(function(o){ return '<div class="r60-set-r"><b>@'+escapeHtml(o.handle)+'</b><span>'+(o.role==='personal' ? 'You' : 'Your business')+'</span></div>'; }).join('')+
        (own.length > 1 ? '<button class="r60-set-b" data-action="r60SwapRoles">&#8644; Swap which is business and which is personal</button>' : '')+
        '<button class="r60-set-b" data-action="r60SocAdd">&#43; Connect another account</button>'+
        '<button class="r60-set-b" data-action="r60CliOpen">&#128101; Clients’ accounts</button>'+
        '<button class="r60-set-b" data-action="r60SocRefresh">&#8635; Refresh the numbers</button>'+
      '</div>';
  });
};
ACTIONS.r60SwapRoles = function(){ ACTIONS.sxSwapRoles(); addSheetClose('r60Soc'); };
ACTIONS.r60SocAdd = function(){ addSheetClose('r60Soc'); ACTIONS.socAddRole(null, null, r58Own().some(function(o){ return o.role==='business'; }) ? 'personal' : 'business'); };
ACTIONS.r60SocRefresh = function(){ addSheetClose('r60Soc'); try{ igMaybeRefresh(true); }catch(e){} try{ r55CliLoad(true); }catch(e){} renderView(); };

// ================= E15–E16. The Calendar: one picker, no Today, the legend tucked away =================
function r60CalPickHtml(){
  const c = r59CalClient(), cs = mtActiveClients(), open = !!ui.r60CalPick;
  const btn = '<button class="r60-calb'+(c ? ' is-client' : '')+'" data-action="r60CalPick"'+(c ? ' style="--cc:'+clientAccent(c)+'"' : '')+'><svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round"><circle cx="11" cy="11" r="6.5"/><path d="M16 16l4.5 4.5"/></svg><span>'+(c ? escapeHtml(c.business || c.name) : 'Your calendar')+'</span><i>&#9662;</i></button>';
  if(!open) return '<span class="r60-calw">'+btn+'</span>';
  return '<span class="r60-calw">'+btn+'<div class="r60-calpop"><input class="r60-calq" id="r60CalQ" placeholder="Find a client" autocomplete="off"><button class="r60-calo'+(c ? '' : ' is-on')+'" data-action="r60CalSet" data-id=""><i style="--cc:var(--accent)"></i>Your calendar</button>'+
    (cs.length ? '<div class="r60-calk">Clients</div>' : '')+cs.map(function(x){ return '<button class="r60-calo'+(c && c.id===x.id ? ' is-on' : '')+'" data-action="r60CalSet" data-id="'+x.id+'" data-name="'+escapeHtml(String(x.business || x.name).toLowerCase())+'"><i style="--cc:'+clientAccent(x)+'"></i>'+escapeHtml(x.business || x.name)+'</button>'; }).join('')+'</div></span>';
}
cxMonthCardHtml = (function(base){
  return function(){
    let h = base.apply(this, arguments);
    h = h.replace(/<label class="r59-calf">[\s\S]*?<\/label>/, '').replace(/<button class="cx-chip" data-action="cxToday">Today<\/button>/, '');
    h = h.replace('<span style="flex:1"></span>', '<span style="flex:1"></span>'+r60CalPickHtml());
    // (the legend behind a button)
    const m = /<div class="cx-legend[^"]*">[\s\S]*?<\/div>/.exec(h);
    if(m){ h = h.replace(m[0], ''); h = h.replace(/(<button class="cx-chip" data-action="openUpcomingPopover")/, '<span class="r60-legw"><button class="cx-chip r60-legb'+(ui.r60Legend ? ' is-on' : '')+'" data-action="r60Legend">Legend</button>'+(ui.r60Legend ? '<div class="r60-legpop">'+m[0]+'</div>' : '')+'</span>$1'); }
    return h;
  };
})(cxMonthCardHtml);
ACTIONS.r60CalPick = function(){ ui.r60CalPick = !ui.r60CalPick; ui.r60Legend = false; playTick(); renderView(); if(ui.r60CalPick) setTimeout(function(){ const q = document.getElementById('r60CalQ'); if(q) q.focus(); }, 30); };
ACTIONS.r60CalSet = function(el, e, id){ ui.r59CalClient = id || null; ui.r60CalPick = false; playTick(); renderView(); };
ACTIONS.r60Legend = function(){ ui.r60Legend = !ui.r60Legend; ui.r60CalPick = false; playTick(); renderView(); };
document.addEventListener('input', function(e){ if(!e.target || e.target.id!=='r60CalQ') return; const q = e.target.value.trim().toLowerCase(); document.querySelectorAll('.r60-calpop [data-name]').forEach(function(b){ b.style.display = !q || b.getAttribute('data-name').indexOf(q) >= 0 ? '' : 'none'; }); });
document.addEventListener('keydown', function(e){ if(e.target && e.target.id==='r60CalQ' && e.key==='Enter'){ const b = Array.from(document.querySelectorAll('.r60-calpop [data-name]')).find(function(x){ return x.style.display!=='none'; }); if(b) ACTIONS.r60CalSet(b, e, b.getAttribute('data-id')); } if(e.key==='Escape' && (ui.r60CalPick || ui.r60Legend)){ ui.r60CalPick = false; ui.r60Legend = false; renderView(); } });
document.addEventListener('mousedown', function(e){ if((ui.r60CalPick && !e.target.closest('.r60-calw')) || (ui.r60Legend && !e.target.closest('.r60-legw'))){ ui.r60CalPick = false; ui.r60Legend = false; setTimeout(renderView, 0); } });

// ================= F17. Goals: your goals first =================
renderGoalsTab = (function(base){
  return function(){
    const h = base.apply(this, arguments), i = h.indexOf('<div class="r43-sec is-mine">'), top = '<div class="r43-goalsp g39">';
    if(i < 0 || h.indexOf(top)!==0) return h;
    let j = h.indexOf('<div class="r43-sec is-ach">'); if(j < 0) j = h.lastIndexOf('</div>');
    return top+'<div class="r60-mine">'+h.slice(i, j)+'</div>'+h.slice(top.length, i)+h.slice(j);
  };
})(renderGoalsTab);

// ================= F18. The Journal, redone =================
// One clean column: My journal / Client journals and search on one line at the top; a writing card that feels like a
// page (today's date, a title, room to write, your tags, Save); then your entries as a calm feed. Client journals get
// the same look. Boards and the Vault keep their own pages.
function r60JournalHead(clients){
  return '<div class="r60-jh"><div class="r60-seg"><button class="'+(clients ? '' : 'is-on')+'" data-action="setJournalViewMode" data-value="personal">My journal</button><button class="'+(clients ? 'is-on' : '')+'" data-action="setJournalViewMode" data-value="clients">Client journals</button></div>'+
    (clients ? '' : '<label class="r60-js"><svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round"><circle cx="11" cy="11" r="6.5"/><path d="M16 16l4.5 4.5"/></svg><input id="journalSearchInput" placeholder="Search your journal" value="'+escapeHtml(ui.journalSearchText || '')+'"></label>')+'</div>';
}
renderJournalEntriesTab = function(){
  const clients = ui.journalViewMode==='clients';
  if(clients) return '<div class="r60-j is-clients">'+r60JournalHead(true)+'<div class="r60-jc">'+renderClientJournalsAllTab()+'</div></div>';
  const d = new Date(), date = d.toLocaleDateString(undefined, {weekday:'long', month:'long', day:'numeric'});
  const tags = journalTypes().map(function(m){ const on = ui.selectedMood===m.id; return '<button class="r60-tag'+(on ? ' is-on' : '')+'" data-action="selectMood" data-mood="'+m.id+'" style="--tc:'+m.color+'">'+m.emoji+' '+escapeHtml(m.label)+'</button>'; }).join('');
  const write = '<div class="r60-jw" data-photo-drop="journal">'+
    '<div class="r60-jw-d">'+escapeHtml(date)+'</div>'+
    '<input class="r60-jw-t" id="journalPageTextTitle" placeholder="Give it a title" maxlength="120">'+
    '<textarea class="r60-jw-x" id="journalPageText" placeholder="What’s on your mind?">'+escapeHtml(ui.journalDraftText || '')+'</textarea>'+
    renderJournalPhotoThumbsRow()+
    '<div class="r60-jw-f"><div class="r60-tags">'+tags+'</div><button class="r60-jw-p" data-action="triggerJournalPhotoInput" data-hov="Add a photo" aria-label="Add a photo">&#128247;</button><button class="btn btn-primary r60-jw-s" data-action="addJournal" data-target="journalPageText">Save</button></div>'+
  '</div>';
  const filt = ui.journalFilterMood ? '<div class="r60-jf">Showing '+escapeHtml((moodById(ui.journalFilterMood) || {}).label || '')+' <button data-action="clearJournalFilters">Show all</button></div>' : '';
  return '<div class="r60-j">'+r60JournalHead(false)+write+filt+'<div class="r60-jfeed" id="journalHistoryContainer">'+renderJournalHistory(filteredJournalEntries())+'</div>'+(typeof journalTrashHtml==='function' ? journalTrashHtml() : '')+'</div>';
};
renderAllClientJournalRow = function(row){
  const e = row.entry, c = arr(state.business.clients).find(function(x){ return x.id===row.clientId; }), tag = e.tag ? moodById(e.tag) : null;
  return '<article class="r60-ce" style="--cc:'+(c ? clientAccent(c) : 'var(--accent)')+'"><header><span class="r60-ce-c"><i></i>'+escapeHtml(row.clientName)+'</span>'+(tag ? '<span class="r60-ce-t">'+tag.emoji+' '+escapeHtml(tag.label)+'</span>' : '')+'<time>'+escapeHtml(fmtDateShort(e.date))+'</time>'+deleteBtn('clientjournal', e.id)+'</header><p>'+escapeHtml(e.text || '')+'</p></article>';
};
document.addEventListener('input', function(e){ const t = e.target; if(t && t.id==='journalPageText' && t.classList.contains('r60-jw-x')){ t.style.height = 'auto'; t.style.height = Math.min(560, Math.max(150, t.scrollHeight + 2))+'px'; } });

// ================= F19. The Vault: when each one opens, and Open / Sealed =================
// Same look. Every card says plainly where it stands (sealed until a date, sealed until a surprise morning this year,
// or open), the week and month notes say what they are, and you can show just the open or just the sealed ones.
vaultHtml = function(){
  const all = vaultItems(), f = ui.r60VaultF || 'all', open = ui.vaultOpen || {};
  if(!all.length) return '<div class="vault-empty"><div class="vault-empty-i">&#128274;</div><b>Nothing locked away yet.</b><span>Seal a note to yourself when you check out of a week or a month, or write a time capsule in the journal.</span></div>';
  const v = all.filter(function(m){ return f==='all' || (f==='sealed' ? m.locked : !m.locked); });
  const n = {open:all.filter(function(m){ return !m.locked; }).length, sealed:all.filter(function(m){ return m.locked; }).length};
  const chip = function(k, l){ return '<button class="'+(f===k ? 'is-on' : '')+'" data-action="r60VaultF" data-id="'+k+'">'+l+'</button>'; };
  const state0 = function(m){
    if(m.kind!=='capsule') return '<span class="r60-vs is-open">'+(m.kind==='month' ? 'Month note' : 'Week note')+' · open</span>';
    if(!m.locked) return '<span class="r60-vs is-open">Opened</span>';
    return '<span class="r60-vs is-sealed">'+(m.hidden ? 'Opens one morning this year' : 'Opens '+escapeHtml(fmtDateShort(m.openOn)))+'</span>';
  };
  return '<div class="r60-vf">'+chip('all', 'All '+all.length)+chip('open', 'Open '+n.open)+chip('sealed', 'Sealed '+n.sealed)+'</div>'+
    '<div class="vault">'+(v.length ? v.map(function(m, i){ const o = !!open[m.id];
    return '<div class="vault-card'+(o ? ' is-open' : '')+(m.locked ? ' is-locked' : '')+' is-'+m.kind+'" style="--i:'+Math.min(i, 12)+'">'+
      '<button class="vault-seal" data-action="vaultToggle" data-id="'+m.id+'" data-hov="'+(m.locked ? 'Still sealed' : o ? 'Close it' : 'Read it')+'"><span class="vault-wax">'+(m.kind==='capsule' ? (m.locked ? '&#9203;' : '&#128140;') : m.kind==='month' ? '&#127942;' : '&#128221;')+'</span>'+
        '<span class="vault-meta"><b>'+escapeHtml(m.label)+'</b><small>'+(m.kind==='capsule' ? 'Time capsule · written '+fmtDateShort(m.written) : 'Sealed '+fmtDateShort(todayStr(new Date(m.at))))+'</small>'+state0(m)+'</span></button>'+
      '<div class="vault-body"><div class="vault-text">'+(m.locked ? '<i class="vault-locked">Still sealed. It opens itself when its morning comes.</i>' : escapeHtml(m.text))+'</div></div>'+
    '</div>'; }).join('') : '<div class="r60-none"><span>Nothing '+(f==='sealed' ? 'sealed' : 'open')+' right now.</span></div>')+'</div>';
};
ACTIONS.r60VaultF = function(el, e, k){ ui.r60VaultF = k; playTick(); renderView(); };
afterRenderHooks.push(function(){ const p = document.getElementById('r60Pop'); if(p) r60PopPlace(p); });
// (Client journals: the same writing card, with the client picked at the top)
renderClientJournalComposeCard = function(){
  const clients = arr(state.business.clients).filter(function(c){ return c.status==='active'; });
  if(!clients.length) return '<div class="r60-none"><b>No active clients yet</b><span>Add one in Business → Clients, then keep notes on them here.</span></div>';
  if(ui.journalTabClientId===undefined || !clients.some(function(c){ return c.id===ui.journalTabClientId; })) ui.journalTabClientId = clients[0].id;
  const c = clients.find(function(x){ return x.id===ui.journalTabClientId; });
  return '<div class="r60-jw is-client" style="--cc:'+clientAccent(c)+'">'+
    '<div class="r60-jw-d"><span class="r60-jcl"><i></i><select id="journalTabClientSelect" aria-label="Client">'+clients.map(function(x){ return '<option value="'+x.id+'"'+(x.id===c.id ? ' selected' : '')+'>'+escapeHtml(x.business || x.name || 'Client')+'</option>'; }).join('')+'</select></span></div>'+
    '<textarea class="r60-jw-x" id="journalTabClientText" placeholder="What happened, what was said, what to remember next time…">'+escapeHtml(ui.journalTabClientDraft || '')+'</textarea>'+
    '<div class="r60-jw-f"><span style="flex:1"></span><button class="btn btn-primary r60-jw-s" data-action="addClientJournalEntryFromJournal">Save</button></div>'+
  '</div>';
};
document.addEventListener('change', function(e){ if(e.target && e.target.id==='journalTabClientSelect'){ ui.journalTabClientId = e.target.value; renderView(); } });

// ================= G20. Holidays: on every scene, more of them, and music =================
// The scene layer painted over the holiday decorations (they only showed on Minimal); now they sit above it. The
// banner gets its own place at the top of Today, with a button for the holiday's music. New holidays: New Year,
// Valentine's, St. Patrick's, Easter and the Fourth of July.
function r60Easter(y){ const a = y % 19, b = Math.floor(y/100), c = y % 100, d = Math.floor(b/4), e = b % 4, f = Math.floor((b + 8)/25), g = Math.floor((b - f + 1)/3), h = (19*a + b - d - g + 15) % 30, i = Math.floor(c/4), k = c % 4, l = (32 + 2*e + 2*i - h - k) % 7, m = Math.floor((a + 11*h + 22*l)/451), mo = Math.floor((h + l - 7*m + 114)/31), da = ((h + l - 7*m + 114) % 31) + 1; return y+'-'+pad2(mo)+'-'+pad2(da); }
holToday = (function(base){
  return function(d){
    const h = base.apply(this, arguments); if(h) return h;
    d = d || todayStr(); const md = d.slice(5), y = Number(d.slice(0, 4));
    if(md==='12-31' || md==='01-01') return 'newyear';
    if(md==='02-14') return 'valentines';
    if(md==='03-17') return 'stpatricks';
    const ea = r60Easter(y); if(d >= addDays(ea, -2) && d <= ea) return 'easter';
    if(md==='07-04') return 'july4';
    return null;
  };
})(holToday);
Object.assign(HOL, {
  newyear:{k:'Happy New Year', h:function(n){ return 'New year, same mission, '+n+'.'; }},
  valentines:{k:'Valentine’s Day', h:function(){ return 'Love what you’re building.'; }},
  stpatricks:{k:'St. Patrick’s Day', h:function(){ return 'Make your own luck.'; }},
  easter:{k:'Happy Easter', h:function(){ return 'Fresh start, fresh push.'; }},
  july4:{k:'Fourth of July', h:function(){ return 'Independence, earned.'; }}
});
holFxHtml = (function(base){
  return function(h){
    const fall = function(glyphs, n, colors){ let s = ''; for(let i = 0; i < n; i++){ const R = function(k, m){ return (((i + k)*9301 + 49297) % 233280)/233280*m; }; s += '<i class="r60-fall" style="--x:'+R(1, 100).toFixed(1)+'%;--d:'+(9 + R(2, 9)).toFixed(1)+'s;--dl:-'+R(3, 14).toFixed(1)+'s;--z:'+(14 + Math.round(R(4, 14)))+'px;--c:'+colors[i % colors.length]+'">'+glyphs[i % glyphs.length]+'</i>'; } return s; };
    const sub = state.profile.holidayIntensity==='subtle', k = sub ? .5 : 1;
    if(h==='newyear' || h==='july4') return '<div class="r60-fw">'+[12, 34, 58, 80, 46].slice(0, sub ? 3 : 5).map(function(x, i){ return '<i style="--x:'+x+'%;--dl:'+(i*1.3).toFixed(1)+'s;--c:'+(h==='july4' ? ['#ff4d5e', '#ffffff', '#4d8bff'][i % 3] : ['#FFD86B', '#ffffff', '#C9A4FF'][i % 3])+'"></i>'; }).join('')+'</div>'+fall(['✦', '·', '✧'], Math.round(24*k), h==='july4' ? ['#ff4d5e', '#fff', '#4d8bff'] : ['#FFD86B', '#fff', '#C9A4FF']);
    if(h==='valentines') return fall(['❤', '♥', '❥'], Math.round(22*k), ['#FF5A8A', '#FF8FB1', '#FFC2D4']);
    if(h==='stpatricks') return fall(['☘', '✤', '☘'], Math.round(22*k), ['#3DDC97', '#7EE0A8', '#F5D547']);
    if(h==='easter') return fall(['❀', '✿', '●'], Math.round(22*k), ['#FFC2D4', '#C9E8FF', '#FFF0A8', '#D6F5C8']);
    return base.apply(this, arguments);
  };
})(holFxHtml);
// (the banner: out of the hero, across the top of Today, with the music button)
function r60Cut(h, marker){
  const i = h.indexOf(marker); if(i < 0) return null;
  let depth = 0, j = -1; const re = /<\/?div\b[^>]*>/g; re.lastIndex = i; let m;
  while((m = re.exec(h))){ depth += m[0][1]==='/' ? -1 : 1; if(depth===0){ j = re.lastIndex; break; } }
  return j > i ? {html:h.slice(i, j), rest:h.slice(0, i)+h.slice(j)} : null;
}
renderToday = (function(base){
  return function(){
    let h = base.apply(this, arguments);
    const cut = r60Cut(h, '<div class="hol-ban'); if(!cut) return h;
    const hol = holActive(), on = R60.music && R60.music.h===hol;
    const ban = cut.html.replace(/<\/div>$/, '<button class="r60-holm'+(on ? ' is-on' : '')+'" data-action="r60HolMusic">'+(on ? '&#10074;&#10074; Pause the music' : '&#9835; Holiday music')+'</button></div>');
    return ban+cut.rest;
  };
})(renderToday);
// the music: a short, gentle tune for each holiday, played by the app itself (no files), looping softly
const R60_TUNES = {
  halloween:{bpm:96, wave:'triangle', n:[['E4',1],['G4',1],['B4',1],['C5',2],['B4',1],['G4',1],['E4',2],['D#4',1],['F#4',1],['A4',1],['B4',2],['A4',1],['F#4',1],['D#4',2]]},
  thanksgiving:{bpm:88, wave:'sine', n:[['G4',1],['A4',1],['B4',2],['D5',1],['B4',1],['A4',2],['G4',1],['E4',1],['G4',2],['A4',1],['G4',1],['E4',1],['D4',3]]},
  christmas:{bpm:132, wave:'triangle', n:[['E5',1],['E5',1],['E5',2],['E5',1],['E5',1],['E5',2],['E5',1],['G5',1],['C5',1.5],['D5',.5],['E5',4],['F5',1],['F5',1],['F5',1.5],['F5',.5],['F5',1],['E5',1],['E5',1],['E5',.5],['E5',.5],['E5',1],['D5',1],['D5',1],['E5',1],['D5',2],['G5',2]]},
  birthday:{bpm:104, wave:'triangle', n:[['G4',.75],['G4',.25],['A4',1],['G4',1],['C5',1],['B4',2],['G4',.75],['G4',.25],['A4',1],['G4',1],['D5',1],['C5',2]]},
  newyear:{bpm:120, wave:'sine', n:[['C5',1],['E5',1],['G5',1],['C6',2],['G5',1],['E5',1],['C5',2],['D5',1],['F5',1],['A5',1],['D6',3]]},
  valentines:{bpm:84, wave:'sine', n:[['A4',1],['C#5',1],['E5',2],['F#5',1],['E5',1],['C#5',2],['D5',1],['C#5',1],['B4',1],['A4',3]]},
  stpatricks:{bpm:150, wave:'triangle', n:[['D5',.5],['E5',.5],['F#5',1],['A5',1],['F#5',1],['E5',.5],['D5',.5],['B4',1],['D5',1],['A4',2]]},
  easter:{bpm:100, wave:'sine', n:[['C5',1],['D5',1],['E5',1],['G5',2],['E5',1],['D5',1],['C5',2],['A4',1],['C5',1],['D5',3]]},
  july4:{bpm:116, wave:'triangle', n:[['G4',1],['C5',1],['E5',1],['G5',2],['E5',1],['C5',1],['D5',1],['F5',1],['A5',2],['G5',3]]}
};
function r60Hz(n){ const m = /^([A-G])(#?)(\d)$/.exec(n); if(!m) return 440; const i = {C:-9, D:-7, E:-5, F:-4, G:-2, A:0, B:2}[m[1]] + (m[2] ? 1 : 0) + (Number(m[3]) - 4)*12; return 440*Math.pow(2, i/12); }
function r60MusicStop(){ const M = R60.music; if(!M) return; clearTimeout(M.t); try{ M.g.gain.setTargetAtTime(0, M.ctx.currentTime, .15); setTimeout(function(){ try{ M.ctx.close(); }catch(e){} }, 600); }catch(e){} R60.music = null; }
function r60MusicPlay(h){
  r60MusicStop();
  const T = R60_TUNES[h]; if(!T) return;
  const Ctx = window.AudioContext || window.webkitAudioContext; if(!Ctx) return;
  const ctx = new Ctx(), g = ctx.createGain(); g.gain.value = .07; g.connect(ctx.destination);
  const M = R60.music = {h:h, ctx:ctx, g:g, t:null};
  const beat = 60/T.bpm;
  const loop = function(){
    if(R60.music!==M) return;
    let t = ctx.currentTime + .05, total = 0;
    T.n.forEach(function(x){ const dur = x[1]*beat, o = ctx.createOscillator(), e = ctx.createGain(); o.type = T.wave; o.frequency.value = r60Hz(x[0]); e.gain.setValueAtTime(0, t); e.gain.linearRampToValueAtTime(1, t + .02); e.gain.exponentialRampToValueAtTime(.001, t + Math.max(.12, dur*.95)); o.connect(e); e.connect(g); o.start(t); o.stop(t + dur); t += dur; total += dur; });
    M.t = setTimeout(loop, (total + beat*2)*1000);
  };
  loop();
}
ACTIONS.r60HolMusic = function(){ const h = holActive(); if(R60.music && R60.music.h===h) r60MusicStop(); else r60MusicPlay(h); renderView(); };

// ================= G21. Day streak and Today's Standard: one panel =================
PANEL_RENDERERS.personalStats = (function(base){
  return function(){
    const h = base.apply(this, arguments);
    const m = /<div class="card" style="text-align:center;margin-top:10px;"><div class="kpi-label"[^>]*>Today's Standard<\/div>(<div class="row"[^>]*>[\s\S]*?<\/div>)<\/div>/.exec(h);
    if(!m || h.indexOf('<div class="sw-wrap">') < 0) return h;
    const rest = h.replace(m[0], '');
    const std = '<div class="r60-std"><span class="r60-std-k">Today’s standard</span>'+m[1].replace('<div class="row"', '<div class="r60-std-c"')+'</div>';
    const cut = r60Cut(rest, '<div class="sw '); if(!cut) return h;
    const i = rest.indexOf('<div class="sw ');
    return rest.slice(0, i)+cut.html.replace(/<\/div>$/, std+'</div>')+rest.slice(i + cut.html.length);
  };
})(PANEL_RENDERERS.personalStats);

// ================= G22–23. Today's panels are widgets =================
// Every panel sits on a 12-column grid. In Customize (the pencil on Today) each one has sizes (S, M, L, Full), drag it
// by its title to move it, or drag its right edge to make it wider or narrower. Your layout is kept.
const R60_SPAN_DEF = {personalStats:12, tasks:12, clientHub:12, week:12, journal:6, vision:6, business:12, goals:12, why:12, focusMini:6, calendarMini:6, clock:6, social:6, agenda:6};
function r60Spans(){ const d = state.dashboardPanels; if(!d.r60Span || typeof d.r60Span!=='object') d.r60Span = {}; return d.r60Span; }
function r60Span(pid){ const s = Number(r60Spans()[pid]); return s >= 3 && s <= 12 ? s : (R60_SPAN_DEF[pid] || 6); }
SMALL_PANELS.length = 0;   // (no more fixed "small" rows: every panel sizes itself)
Object.keys(PANEL_RENDERERS).forEach(function(pid){
  const fn = PANEL_RENDERERS[pid]; if(pid==='heatmap') return;
  PANEL_RENDERERS[pid] = function(){ const h = fn.apply(this, arguments); if(!h || todayEditing()) return h; return '<div class="r60w" data-wid="'+pid+'" style="--span:'+r60Span(pid)+'">'+h+'</div>'; };
});
todayEditWrap = (function(base){
  return function(pid, inner, idx, count){
    const s = r60Span(pid), b = function(n, l){ return '<button class="r60-sz'+(s===n ? ' is-on' : '')+'" data-action="r60Size" data-id="'+pid+'|'+n+'">'+l+'</button>'; };
    const h = base.apply(this, arguments).replace('<div class="ll-head">', '<div class="ll-head" draggable="true" data-r60-drag="'+pid+'"><span class="r60-grip">&#8942;&#8942;</span>').replace('<button class="ll-ctl ll-hide"', '<span class="r60-szs">'+b(4, 'S')+b(6, 'M')+b(8, 'L')+b(12, 'Full')+'</span><button class="ll-ctl ll-hide"');
    return '<div class="r60w is-edit" data-wid="'+pid+'" style="--span:'+s+'">'+h+'<span class="r60-rs" data-r60-rs="'+pid+'" aria-hidden="true"></span></div>';
  };
})(todayEditWrap);
ACTIONS.r60Size = function(el, e, v){ const q = String(v).split('|'); r60Spans()[q[0]] = Number(q[1]); persist('dashboardPanels'); playTick(); renderView(); };
// drag a widget by its title to move it
document.addEventListener('dragstart', function(e){ const hd = e.target.closest && e.target.closest('[data-r60-drag]'); if(!hd) return; e.dataTransfer.setData('text/r60w', hd.getAttribute('data-r60-drag')); e.dataTransfer.effectAllowed = 'move'; const w = hd.closest('.r60w'); if(w) w.classList.add('is-drag'); });
document.addEventListener('dragend', function(){ document.querySelectorAll('.r60w.is-drag, .r60w.is-over').forEach(function(x){ x.classList.remove('is-drag', 'is-over'); }); });
document.addEventListener('dragover', function(e){ const w = e.target.closest && e.target.closest('.r60w.is-edit'); if(!w || !Array.from(e.dataTransfer.types || []).includes('text/r60w')) return; e.preventDefault(); document.querySelectorAll('.r60w.is-over').forEach(function(x){ if(x!==w) x.classList.remove('is-over'); }); w.classList.add('is-over'); });
document.addEventListener('drop', function(e){
  const w = e.target.closest && e.target.closest('.r60w.is-edit'); if(!w) return;
  const id = e.dataTransfer.getData('text/r60w'), to = w.getAttribute('data-wid'); if(!id || id===to) return; e.preventDefault();
  const L = state.dashboardPanels.order, a = L.indexOf(id); if(a < 0) return; L.splice(a, 1); L.splice(L.indexOf(to), 0, id);
  persist('dashboardPanels'); playTick(); renderView();
});
// drag the right edge to size it (it snaps to the columns)
document.addEventListener('mousedown', function(e){
  const hd = e.target.closest && e.target.closest('[data-r60-rs]'); if(!hd) return; e.preventDefault();
  const pid = hd.getAttribute('data-r60-rs'), w = hd.closest('.r60w'), grid = w.parentNode, gr = grid.getBoundingClientRect(), col = gr.width/12, left = w.getBoundingClientRect().left;
  w.classList.add('is-sizing');
  let cur = 0;
  const mv = function(ev){ const n = Math.max(3, Math.min(12, Math.round((ev.clientX - left)/col))); cur = n; const el = document.querySelector('.r60w[data-wid="'+pid+'"]') || w; el.style.setProperty('--span', n); };
  const up = function(){ document.removeEventListener('mousemove', mv, true); document.removeEventListener('mouseup', up, true); w.classList.remove('is-sizing'); R60.sizedAt = Date.now(); const n = cur; if(n){ r60Spans()[pid] = n; persist('dashboardPanels'); } renderView(); };
  document.addEventListener('mousemove', mv, true); document.addEventListener('mouseup', up, true);
}, true);
document.addEventListener('click', function(e){ if(R60.sizedAt && Date.now() - R60.sizedAt < 400){ e.preventDefault(); e.stopPropagation(); R60.sizedAt = 0; } }, true);   // (the click that ends a resize does nothing else)
// (the Customize button says what it does)
pageEditBtnHtml = (function(base){ return function(action, on){ const h = base.apply(this, arguments); return action==='toggleTodayEdit' ? h.replace(/(<button[^>]*>)[\s\S]*?(<\/button>)/, '$1'+(on ? '&#10003; Done' : '&#9998; Customize')+'$2') : h; }; })(pageEditBtnHtml);

// ================= G24. Log center: a date to reach out =================
// Each row gets a date: pick the day you'll reach out to them next (it replaces their usual rhythm until you do).
logCenterHtml = (function(base){
  return function(){
    return base.apply(this, arguments).replace(/(<div class="lc-row[^"]*" data-key="(lcl?)-([^"]+)">[\s\S]*?<span class="lc-due[^"]*">[\s\S]*?)(<\/span>)/g, function(m0, a, k, id, b){
      const kind = k==='lcl' ? 'lead' : 'client', x = crmFind(kind, id); if(!x) return m0;
      const fu = x.followUp && x.followUp.date ? x.followUp.date : '';
      return a+'<label class="r60-fu'+(fu ? ' is-set' : '')+'" data-hov="Pick the day to reach out"><span>'+(fu ? escapeHtml(fmtDateShort(fu)) : '&#128197;')+'</span><input type="date" data-r60-fu="'+kind+':'+id+'" value="'+fu+'"></label>'+b;
    });
  };
})(logCenterHtml);
document.addEventListener('change', function(e){
  const t = e.target; if(!t || !t.hasAttribute || !t.hasAttribute('data-r60-fu')) return;
  const q = t.getAttribute('data-r60-fu').split(':'), x = crmFind(q[0], q[1]); if(!x) return;
  if(t.value) x.followUp = Object.assign({}, x.followUp || {}, {date:t.value}); else delete x.followUp;
  persist('business'); playTick(); showToast(t.value ? 'Reach out to '+crmName(q[0], x)+' on '+fmtDateShort(t.value)+'.' : 'Back to their usual rhythm.', {icon:'&#128197;'}); renderView();
});

// ================= G25–26. Calendar: a settings button (check-ins, check-outs, goals), and the week =================
// The week runs Monday to Sunday everywhere (Oct 26 was a Monday); the menu says the dates.
function r60WeekRange(){ const s = startOfWeekStr(todayStr()); return fmtDateShort(s)+' – '+fmtDateShort(addDays(s, 6)); }
function r60CalSetHtml(){
  const wk = periodKey('week'), mk = monthKey(), due = typeof checkoutDue==='function' ? checkoutDue() : [];
  const row = function(act, id, label, sub){ return '<button class="r60-cso" data-action="'+act+'" data-id="'+id+'"><b>'+label+'</b>'+(sub ? '<small>'+sub+'</small>' : '')+'</button>'; };
  return '<div class="r60-legpop r60-csp">'+
    '<div class="r60-calk">This week · Mon to Sun</div>'+row('r48CheckIn', 'week', (checkedIn('week', wk) ? 'Your check-in' : 'Check in for the week'), escapeHtml(r60WeekRange()))+
    '<div class="r60-calk">This month</div>'+row('r48CheckIn', 'month', (checkedIn('month', mk) ? 'Your check-in' : 'Check in for '+escapeHtml(monthName(mk))), '')+
    due.map(function(c){ return row('r48CheckOut', c.kind+':'+c.key, 'Check out of '+escapeHtml(c.kind==='month' ? monthName(c.key) : 'the week'), ''); }).join('')+
    '<div class="r60-calk">Goals</div>'+row('r60GoGoals', '', 'Weekly &amp; monthly goals', '')+
  '</div>';
}
cxMonthCardHtml = (function(base){
  return function(){
    const h = base.apply(this, arguments);
    return h.replace(/(<span class="r60-legw">)/, '<span class="r60-legw r60-csw"><button class="cx-chip r60-csb'+(ui.r60CalSet ? ' is-on' : '')+'" data-action="r60CalSetOpen" aria-label="Check-ins and goals" data-hov="Check-ins, check-outs and goals">&#9881;&#65038;</button>'+(ui.r60CalSet ? r60CalSetHtml() : '')+'</span>$1');
  };
})(cxMonthCardHtml);
ACTIONS.r60CalSetOpen = function(){ ui.r60CalSet = !ui.r60CalSet; ui.r60CalPick = false; ui.r60Legend = false; playTick(); renderView(); };
ACTIONS.r60GoGoals = function(){ ui.r60CalSet = false; ui.view = 'personal'; ui.personalTab = 'goals'; renderView(); };
['r48CheckIn', 'r48CheckOut'].forEach(function(k){ const b = ACTIONS[k]; if(b) ACTIONS[k] = function(){ ui.r60CalSet = false; return b.apply(this, arguments); }; });
document.addEventListener('mousedown', function(e){ if(ui.r60CalSet && !e.target.closest('.r60-csw')){ ui.r60CalSet = false; setTimeout(renderView, 0); } });
