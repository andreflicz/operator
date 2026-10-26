// ============ ROUND 50 ============
// ---- 1. Spending counts spending ----
// Money moving between your own accounts, paying off a card, a loan payment or an investment isn't spending,
// and counting it (plus the card purchases it pays for) doubled the month. Those are "Not spending" now: kept,
// visible, left out of the totals. A purchase that came in twice (the bank and a statement) counts once.
// Tap the icon on any one to change it.
const R50_MOVE_RE = /\b(transfer|xfer|trnsfr|tfr|to sav(ings)?|to chk|to checking|from sav(ings)?|from chk|from checking|internal|online pmt|online payment|e-?payment|epay|autopay|auto pay|automatic payment|card pmt|crd pmt|card payment|credit card|payment to (chase|amex|american express|discover|citi|capital one|barclay|synchrony|apple card|gs bank|wells|bank of america|boa)|capital one.{0,20}(pmt|payment)|amex.{0,20}(pmt|payment)|discover.{0,20}(pmt|payment)|chase.{0,20}(pmt|payment|card)|citi.{0,20}(pmt|payment|autopay)|applecard|gsbank|gs bank|barclaycard|synchrony|loan (pmt|payment)|student loan|navient|nelnet|sallie mae|robinhood|coinbase|acorns|wealthfront|betterment|fidelity|vanguard|schwab|webull|venmo cashout|cash app transfer|savings)\b/i;
if(!EXP_CATS.some(function(c){ return c.id==='move'; })) EXP_CATS.unshift({id:'move', label:'Not spending', icon:'&#8644;', re:R50_MOVE_RE});
function r50Norm(t){ return String(t || '').toLowerCase().replace(/[^a-z]/g, '').slice(0, 8); }
// (sort old ones once: anything that looks like a transfer or a card payment, unless you set its category yourself)
function r50Retag(){
  const ex = finExpenses(); let n = 0;
  ex.forEach(function(e){ if(!e.catSet && e.cat!=='move' && R50_MOVE_RE.test(e.name || '')){ e.cat = 'move'; n++; } });
  // duplicates: same amount, within a day, the same start of the name (NETFLIX.COM = Netflix), from a different import
  const seen = {};
  ex.slice().sort(function(a, b){ return String(a.date).localeCompare(String(b.date)); }).forEach(function(e){
    if(e.dupOf) return;
    const k = Math.round(Number(e.amount)*100), nm = r50Norm(e.name), list = seen[k] = seen[k] || [];
    const prev = list.find(function(x){ const a = r50Norm(x.name), m = Math.min(a.length, nm.length); return m >= 4 && a.slice(0, m)===nm.slice(0, m) && (x.src || 'manual')!==(e.src || 'manual') && Math.abs(new Date(e.date) - new Date(x.date)) <= 86400000; });
    if(prev){ e.dupOf = prev.id; n++; } else list.push(e);
  });
  return n;
}
function r50Counts(e){ return e.cat!=='move' && !e.dupOf; }
ACTIONS.expCat = (function(base){ return function(el, e, id){ const r = base.apply(this, arguments); const x = finExpenses().find(function(z){ return z.id===id; }); if(x) x.catSet = true; persist('finances'); return r; }; })(ACTIONS.expCat);
// every place that adds up the month only sees what counts
expensesHtml = (function(base){
  return function(){
    const f = state.finances, all = finExpenses();
    if(r50Retag()) persist('finances');
    const mk = thisMonthKey(), moved = all.filter(function(e){ return monthKeyOf(e.date)===mk && !r50Counts(e); });
    f.expenses = all.filter(r50Counts);
    let h; try{ h = base.apply(this, arguments); } finally { f.expenses = all; }
    if(moved.length){
      const sum = moved.reduce(function(a, e){ return a + Number(e.amount || 0); }, 0);
      const chip = '<button class="r50-moved" data-action="r50ShowMoved" title="Transfers, card payments, loans and investments, and anything counted twice">&#8644; '+'$'+Math.round(sum).toLocaleString()+' moved, not spent</button>';
      h = h.replace(/(<div class="ex-total">[\s\S]*?)(<\/div>)/, function(m, a, b){ return a+chip+b; });
    }
    return h;
  };
})(expensesHtml);
ACTIONS.r50ShowMoved = function(){ ui.view = 'personal'; ui.personalTab = 'finances'; ui.finTab = 'transactions'; ui.r44Cat = 'move'; renderView(); };
// (Op sees the real number too)
aiContext = (function(base){
  return function(){
    const f = state.finances, all = arr(f && f.expenses);
    if(f) f.expenses = all.filter(r50Counts);
    try{ return base.apply(this, arguments); } finally { if(f) f.expenses = all; }
  };
})(aiContext);

// ---- 2. Ads: campaigns, and you say whose each one is ----
// Zernio gives one Meta connection with every ad account under the same name, so accounts mean nothing here.
// Every campaign is assigned to a client (or isn't yet); the overview adds them up by client. No ad sets
// (Zernio doesn't give them).
adClientOf = function(k){ const l = adLinks()[k.id]; return l && l!==' none' ? l : null; };
renderClientModal = (function(base){ return function(){ return base.apply(this, arguments).replace(/<div class="r49-cacc">[\s\S]*?<\/div>(?=<div class="r48-ccol">)/, ''); }; })(renderClientModal);
function r50AssignSel(k){
  const cs = arr(state.business.clients).filter(function(x){ return clientStageActive(x.stage); }), cur = adClientOf(k);
  return '<select class="r50-asg'+(cur ? '' : ' is-none')+'" data-adlink="'+escapeHtml(k.id)+'" title="Whose campaign is this?"><option value="">'+(cur ? 'Unassign' : 'Assign to…')+'</option>'+cs.map(function(x){ return '<option value="'+x.id+'"'+(cur===x.id ? ' selected' : '')+'>'+escapeHtml(x.business || x.name)+'</option>'; }).join('')+'</select>';
}
sxAdsHtml = function(){
  if(!znAccs().length) return typeof adsSectionHtml==='function' && adsSectionHtml() ? adsSectionHtml() : '<div class="llx-empty">Your Meta ads come through Zernio: connect Zernio on Overview, then in Zernio connect Meta Ads.</div>';
  const st = znAdsSt(), c = igCfg(); znAdsLoad(false);
  const range = '<div class="sx-sort"><span>Last</span>'+[7, 30, 90].map(function(d){ return '<button class="'+(st.days===d ? 'is-on' : '')+'" data-action="znAdsDays" data-id="'+d+'">'+d+' days</button>'; }).join('')+'</div>';
  if(st.none) return range+'<div class="llx-empty">No Meta Ads connection in Zernio yet. In Zernio: Accounts → connect Meta Ads. Then refresh here.</div>';
  const cache = c.znAdsCache;
  if(!cache || cache.days!==st.days || cache.v!==2) return range+'<div class="gp-loading">'+(st.err ? '&#9888; '+escapeHtml(st.err) : 'Loading your campaigns…')+'</div>';
  const all = cache.camps.map(function(k){ return Object.assign({x:adNums(k.m)}, k); }), cur = (all[0] && all[0].currency) || 'USD';
  const by = {}; all.forEach(function(k){ const id = adClientOf(k) || 'none'; (by[id] = by[id] || []).push(k); });
  const client = function(id){ return arr(state.business.clients).find(function(x){ return x.id===id; }); };
  const campRow = function(k){
    const on = /active/i.test(String(k.status || ''));
    return '<div class="r50-cr"><span class="r49-cn"><span><i class="'+(on ? 'is-on' : '')+'"></i><b>'+escapeHtml(k.name || 'Campaign')+'</b></span><small>'+escapeHtml(String(k.objective || k.status || '').replace(/^OUTCOME_/, '').toLowerCase())+'</small></span>'+
      '<span><b>'+adsMoney(k.x.spend, k.currency || cur)+'</b><small>spent</small></span><span><b>'+(k.x.leads!=null ? sxNum(k.x.leads) : k.x.results!=null ? sxNum(k.x.results) : '–')+'</b><small>'+(k.x.leads!=null ? 'leads' : 'results')+'</small></span>'+
      '<span><b>'+(k.x.cpr!=null ? adsMoney(k.x.cpr, k.currency || cur) : k.x.leads ? adsMoney(k.x.spend/k.x.leads, k.currency || cur) : '–')+'</b><small>each</small></span><span><b>'+sxPct(k.x.ctr)+'</b><small>CTR</small></span><span><b>'+sxPct(k.x.hook)+'</b><small>hook</small></span>'+
      '<span class="r50-cra">'+r50AssignSel(k)+'</span></div>';
  };
  // one client (or the unassigned ones), in detail
  if(ui.adClient && by[ui.adClient]){
    const id = ui.adClient, list = by[id].slice().sort(function(a, b){ return b.x.spend - a.x.spend; }), cl = client(id);
    return '<div class="r49-adh"><button class="r49-back" data-action="adClientOpen" data-id="">&larr; All clients</button>'+range+'</div>'+
      '<div class="r49-adt" style="--cc:'+(cl ? clientAccent(cl) : '#8A90A2')+'"><i></i><b>'+escapeHtml(cl ? (cl.business || cl.name) : 'Not assigned yet')+'</b><span>'+list.length+' campaign'+(list.length===1 ? '' : 's')+'</span></div>'+
      '<div class="sx-sum r49-sum">'+adStatsHtml(list, cur)+'</div><div class="r49-camps">'+list.map(campRow).join('')+'</div>';
  }
  const keys = Object.keys(by).sort(function(a, b){ if(a==='none') return 1; if(b==='none') return -1; return adTotals(by[b]).spend - adTotals(by[a]).spend; });
  const cards = keys.map(function(id){
    const list = by[id], T = adTotals(list), cl = id==='none' ? null : client(id), act = list.filter(function(k){ return /active/i.test(String(k.status || '')); }).length;
    return '<div class="r49-ac'+(cl ? '' : ' is-unlinked')+'" style="--cc:'+(cl ? clientAccent(cl) : '#8A90A2')+'">'+
      '<button class="r49-acb" data-action="adClientOpen" data-id="'+escapeHtml(id)+'"><div class="r49-ach"><i></i><b>'+escapeHtml(cl ? (cl.business || cl.name) : 'Not assigned yet')+'</b><span>'+(cl ? (act ? act+' running' : 'Nothing running') : list.length+' to assign')+'</span></div>'+
        '<div class="r49-acs"><div class="r49-acm"><b>'+adsMoney(T.spend, cur)+'</b><span>spent</span></div>'+
        '<div><b>'+(T.leads ? sxNum(T.leads) : '–')+'</b><span>leads</span></div><div><b>'+(T.leads ? adsMoney(T.spend/T.leads, cur) : '–')+'</b><span>per lead</span></div><div><b>'+(T.imp ? sxPct(T.clicks/T.imp*100) : '–')+'</b><span>CTR</span></div></div></button></div>';
  }).join('');
  return '<div class="r49-adh">'+range+'</div><div class="sx-sum">'+adStatsHtml(all, cur)+'</div>'+(keys.length ? '<div class="r49-acg">'+cards+'</div>' : '<div class="llx-empty">No campaigns in this range.</div>');
};

// ---- 3. Client backlog: tap any week; plain labels; a client who came back starts fresh ----
// The weeks are named by the week their posts go out ("Oct 26"), the current one says "This week". Tap a week
// and it opens under the strip with its counter (log one, take one back) and → Today. No rows popping up on
// their own. A client you reactivated doesn't owe anything for the weeks before they came back (set the day in
// their window; it's filled in the day you reactivate them).
function r50DelivClient(d){ return arr(state.business.clients).find(function(c){ return arr(c.deliverables).indexOf(d) >= 0 || arr(c.deliverables).some(function(x){ return x.id===d.id; }); }) || null; }
function r50Since(c){ if(!c) return null; return (c.reactivated && c.reactivatedAt) || c.startDate || null; }
r42Need = (function(base){
  return function(d, post){
    const c = r50DelivClient(d), since = r50Since(c);
    if(since && addDays(post, 6) < since) return 0;
    return base.apply(this, arguments);
  };
})(r42Need);
ACTIONS.r43Reactivate = (function(base){
  return function(el, e, id){
    const r = base.apply(this, arguments), c = arr(state.business.clients).find(function(x){ return x.id===id; });
    if(c){ if(c.reactivated && !c.reactivatedAt) c.reactivatedAt = todayStr(); if(!c.reactivated) delete c.reactivatedAt; persist('business'); }
    return r;
  };
})(ACTIONS.r43Reactivate);
renderClientModal = (function(base){
  return function(){
    const h = base.apply(this, arguments), c = arr(state.business.clients).find(function(x){ return x.id===ui.showClientModal; });
    if(!h || !c || !c.reactivated) return h;
    const row = '<div class="r50-back"><span>Back with you since</span><input type="date" class="input" id="r50Since" value="'+escapeHtml(c.reactivatedAt || '')+'"></div>';
    const i = h.indexOf('<div class="r48-ccol">'); return i >= 0 ? h.slice(0, i)+row+h.slice(i) : row+h;
  };
})(renderClientModal);
document.addEventListener('change', function(e){
  if(!e.target || e.target.id!=='r50Since') return;
  const c = arr(state.business.clients).find(function(x){ return x.id===ui.showClientModal; }); if(!c) return;
  c.reactivatedAt = e.target.value || null; persist('business'); xpLast = null; renderView();
});
function r50Key(c, d){ return c.id+'|'+d.id; }
r48WeekStrip = function(c, d){
  const a = r42Alloc(d), now = thisWeekKey(), posts = a.posts.filter(function(p){ return p >= addDays(now, -21) && p <= addDays(now, 14); });
  if(!ui.r50Wk) ui.r50Wk = {};
  const pick = ui.r50Wk[r50Key(c, d)] || now;
  const strip = '<div class="r48-wks">'+posts.map(function(p){
    const need = a.need[p] || 0, done = Math.min(need, a.fill[p] || 0), past = addDays(p, 6) < todayStr(), full = need && done >= need;
    const st = !need ? 'is-none' : full ? 'is-done' : past ? 'is-miss' : p===now ? 'is-post' : 'is-next';
    let dots = ''; for(let i = 0; i < Math.min(need, 7); i++) dots += '<i class="'+(i < done ? 'on' : '')+'"></i>';
    return '<button class="r48-wk '+st+(p===pick ? ' is-pick' : '')+'" data-action="r50WkPick" data-id="'+c.id+'|'+d.id+'|'+p+'">'+
      '<small>'+(p===now ? 'This week' : fmtDateShort(p))+'</small><b>'+(need ? done+'/'+need : '–')+'</b><span class="r48-dots">'+dots+'</span></button>';
  }).join('')+'</div>';
  // the week you picked
  const need = a.need[pick] || 0, done = Math.min(need, a.fill[pick] || 0), t = r42TaskFor(c, d, pick), dates = arr(a.dates[pick]);
  const detail = '<div class="r50-wd">'+
    '<div class="r50-wdh"><b>'+(pick===now ? 'This week' : 'Week of '+fmtDateShort(pick))+'</b><span>'+(need ? (done >= need ? 'Done' : (need - done)+' to go') : 'Nothing due')+'</span></div>'+
    (need ? '<div class="r50-wdc"><button class="r50-step" data-action="r50WkStep" data-id="'+c.id+'|'+d.id+'|'+pick+'|-1"'+(done ? '' : ' disabled')+' aria-label="One less">&minus;</button>'+
      '<b>'+done+'<small> / '+need+'</small></b><button class="r50-step is-add" data-action="r50WkStep" data-id="'+c.id+'|'+d.id+'|'+pick+'|1"'+(done >= need ? ' disabled' : '')+' aria-label="One more">+</button>'+
      (dates.length ? '<span class="r50-wdd">'+dates.map(function(x){ return fmtDateShort(x); }).join(' · ')+'</span>' : '')+
      (t && t.status!=='done' ? '<button class="cbl-today'+(t.status==='today' ? ' is-on' : '')+'" data-action="dvwToday" data-id="'+t.id+'">'+(t.status==='today' ? 'On today' : '&rarr; Today')+'</button>' : '')+'</div>' : '')+
  '</div>';
  return strip+detail;
};
ACTIONS.r50WkPick = function(el, e, id){ const p = String(id).split('|'); if(!ui.r50Wk) ui.r50Wk = {}; ui.r50Wk[p[0]+'|'+p[1]] = p[2]; playTick(); renderView(); };
ACTIONS.r50WkStep = function(el, e, id){
  const p = String(id).split('|'), c = arr(state.business.clients).find(function(x){ return x.id===p[0]; }), d = c && arr(c.deliverables).find(function(x){ return x.id===p[1]; }); if(!d) return;
  const post = p[2], step = Number(p[3]);
  if(!Array.isArray(d.completedDates)) d.completedDates = [];
  if(!d.r42Tags || typeof d.r42Tags!=='object') d.r42Tags = {};
  const tags = d.r42Tags[post] = arr(d.r42Tags[post]);
  if(step > 0){
    const when = todayStr() <= addDays(post, 6) ? todayStr() : post;
    d.completedDates.push(when); tags.push(when); playPositive();
  } else {
    let x = tags.pop();
    if(!x){ const a = r42Alloc(d), ds = arr(a.dates[post]); x = ds[ds.length - 1]; }
    if(x){ const i = d.completedDates.lastIndexOf(x); if(i >= 0) d.completedDates.splice(i, 1); }
    playTick();
  }
  persist('business'); xpLast = null; renderView();
};
// (and the late / current rows under the strip are gone: the week you pick is the one you work on)
clientBacklogHtml = (function(base){
  return function(){
    const tpl = document.createElement('template'); tpl.innerHTML = base.apply(this, arguments);
    tpl.content.querySelectorAll('.r48-wks').forEach(function(s){ const d = s.closest('.cbl-d'); if(d) d.querySelectorAll('.cbl-weeks').forEach(function(w){ w.remove(); }); });
    const out = document.createElement('div'); out.appendChild(tpl.content.cloneNode(true)); return out.innerHTML;
  };
})(clientBacklogHtml);

// ---- 4. Clearing Up next actually clears it ----
// (the ✕ used to drop your pick, then the suggestion slid straight back into the same spot, so nothing seemed to
// happen. Now ✕ leaves it empty until you pick or drag one in, and it shows on a suggestion too.)
nextUpTask = (function(base){
  return function(){
    if(state.focus.nextCleared && !ui.pendingCurrentTaskId && !ui.stagedTaskId && !state.focus.nextTaskId) return null;
    return base.apply(this, arguments);
  };
})(nextUpTask);
setNextUp = (function(base){ return function(id){ if(id) delete state.focus.nextCleared; return base.apply(this, arguments); }; })(setNextUp);
clearStagedTask = function(){ ui.stagedTaskId = null; state.focus.nextTaskId = null; state.focus.nextCleared = todayStr(); persist('focus'); playTick(); renderView(); };
// a new day lines one up again
(function(){ try{ if(state.focus.nextCleared && state.focus.nextCleared!==todayStr()){ delete state.focus.nextCleared; persist('focus'); } }catch(e){} })();
nowNextPanelHtml = (function(base){
  return function(){
    const h = base.apply(this, arguments);
    if(h.indexOf('nnStartNext') < 0 && h.indexOf('nnLockInNext') < 0) return h;
    const tpl = document.createElement('template'); tpl.innerHTML = h;
    tpl.content.querySelectorAll('[data-dropzone="next"]').forEach(function(z){
      if(z.querySelector('[data-action="clearStagedTask"]')) return;
      const b = z.querySelector('[data-action="nnStartNext"], [data-action="nnLockInNext"]'); if(!b) return;
      const x = document.createElement('button'); x.className = 'btn btn-ghost btn-sm'; x.setAttribute('data-action', 'clearStagedTask'); x.title = 'Clear what\'s next'; x.innerHTML = '&#10005;';
      b.parentNode.appendChild(x);
    });
    const out = document.createElement('div'); out.appendChild(tpl.content.cloneNode(true)); return out.innerHTML;
  };
})(nowNextPanelHtml);
ACTIONS.pickNextTask = (function(base){ return function(){ delete state.focus.nextCleared; return base.apply(this, arguments); }; })(ACTIONS.pickNextTask);

// ---- 5. Locked in: the quote opens the page (right under the greeting), no box ----
lockedLayout = (function(base){
  return function(){
    const saved = state.profile.lockedLayout;
    if(saved && Array.isArray(saved.order) && !saved.quoteTop){ const i = saved.order.indexOf('quote'); if(i >= 0){ saved.order.splice(i, 1); saved.order.unshift('quote'); } saved.quoteTop = true; persist('profile'); }
    const o = base.apply(this, arguments);
    if(!saved){ const i = o.indexOf('quote'); if(i > 0){ o.splice(i, 1); o.unshift('quote'); } }
    return o;
  };
})(lockedLayout);
