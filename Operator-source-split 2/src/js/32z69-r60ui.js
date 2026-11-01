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
