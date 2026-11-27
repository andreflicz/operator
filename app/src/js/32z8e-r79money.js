// ================= Round 79: money =================
// Where the money actually goes: a Spending tab (by category, then by who you paid), "Other" you can open and sort
// (sort one, and every charge from that place follows, now and later), your own categories, more categories out
// of the box, and "Not spending" renamed Transfers. Transactions: every expense in one list, Other included,
// sortable, and you can change a category right on the row. Debts sort by highest or lowest rate (or balance),
// the extra "+ Debt" button is gone (the + in the corner does it, now with the rate). The weekly check-in can fix
// what's wrong ("I got paid" right there). A monthly review shows up on the 1st as a master task: get your
// statements, drop them in (CSV, OFX or PDF; Op reads PDFs), see where it went, and the bills that repeat.
// Bills that repeat are found in your bank and put on the finance calendar by themselves.

// ---------------- categories ----------------
(function(){
  const m = EXP_CATS.find(function(c){ return c.id==='move'; });
  if(m){ m.label = 'Transfers'; m.note = 'Moving your own money (between accounts, paying off a card). Not spending.'; }
  const add = [
    {id:'business', label:'Business', icon:'&#128188;', re:/facebook|facebk|meta ?(ads|platforms)|fb ?ads|google ?ads|adwords|gohighlevel|highlevel|\bghl\b|squarespace|\bwix\b|godaddy|namecheap|shopify|adobe|canva|capcut|envato|artlist|epidemic sound|frame\.io|dropbox|google ?workspace|g ?suite|calendly|zapier|upwork|fiverr|quickbooks|intuit|b&h|bhphoto|adorama|vimeo|later\.com|hootsuite|linktree/i},
    {id:'travel', label:'Travel', icon:'&#9992;&#65039;', re:/airbnb|hotel|marriott|hilton|hyatt|expedia|booking\.com|amtrak|greyhound|jetblue|spirit air|frontier air|kayak|vrbo/i},
    {id:'fun', label:'Fun', icon:'&#127915;', re:/ticketmaster|stubhub|seatgeek|\bamc\b|regal|cinema|theat(er|re)|bowling|steam(games|powered)?|playstation|xbox|nintendo|twitch|topgolf|dave ?& ?buster/i},
    {id:'people', label:'Sent to people', icon:'&#129309;', re:/zelle|venmo|cash ?app|square cash|apple cash/i},
    {id:'cash', label:'Cash', icon:'&#128181;', re:/\batm\b|cash withdrawal|withdrawal/i},
    {id:'fees', label:'Fees & interest', icon:'&#129534;', re:/\bfees?\b|interest charge|finance charge|overdraft|late charge/i}
  ];
  const oi = EXP_CATS.findIndex(function(c){ return c.id==='other'; });
  add.forEach(function(c){ if(!EXP_CATS.some(function(x){ return x.id===c.id; })) EXP_CATS.splice(oi < 0 ? EXP_CATS.length : EXP_CATS.findIndex(function(x){ return x.id==='other'; }), 0, c); });
  Object.assign(R44_CAT_COLORS, {move:'#64748B', business:'#38BDF8', travel:'#22D3EE', fun:'#F472B6', people:'#A3E635', cash:'#FACC15', fees:'#F87171'});
})();
function r79F(){ const f = r44F(); f.catRules = f.catRules && typeof f.catRules==='object' ? f.catRules : {}; f.myCats = arr(f.myCats); f.recurOff = f.recurOff && typeof f.recurOff==='object' ? f.recurOff : {}; f.monthReviews = f.monthReviews && typeof f.monthReviews==='object' ? f.monthReviews : {}; return f; }
// your own categories go in before Other
function r79MyCats(){
  const f = r79F();
  f.myCats.forEach(function(c, i){
    if(EXP_CATS.some(function(x){ return x.id===c.id; })) return;
    EXP_CATS.splice(EXP_CATS.findIndex(function(x){ return x.id==='other'; }), 0, {id:c.id, label:c.label, icon:c.icon || '&#9679;', re:null, mine:true});
    R44_CAT_COLORS[c.id] = c.color || ['#FB923C', '#34D399', '#818CF8', '#F59E0B', '#2DD4BF', '#E879F9'][i % 6];
  });
}
// "SQ *JOE'S COFFEE #1234 NEW YORK NY" and "JOES COFFEE 0412" are the same place
function r79MKey(name){
  let s = String(name || '').toLowerCase()
    .replace(/^(pos |debit card |dbt crd |card |purchase |recurring |checkcard |chkcard |visa |ach )+/g, '')
    .replace(/\b(sq|tst|sp|pp|paypal|py|dd|wpy|ckc|in) ?\*\s*/g, '')
    .replace(/[#*][\w-]*/g, ' ').replace(/\b\d[\d\/.-]*\b/g, ' ').replace(/\b(www|com|net|inc|llc|co|corp|the|payment|pmt|pymt|purchase|debit|card|ach|web|ppd|ccd|des|id|indn|online|recurring|autopay|bill|us|usa|ny|nj|ca|tx|fl)\b/g, ' ')
    .replace(/[^a-z& ]/g, ' ').replace(/\s+/g, ' ').trim();
  const w = s.split(' ').filter(Boolean).slice(0, 2).join(' ');
  return w || String(name || '').toLowerCase().trim().slice(0, 24);
}
function r79Nice(name){ const k = r79MKey(name); return k ? k.replace(/\b\w/g, function(c){ return c.toUpperCase(); }) : String(name || ''); }
// a rule you made wins over the guess
expGuessCat = (function(base){
  return function(text){ try{ const r = r79F().catRules[r79MKey(text)]; if(r && EXP_CATS.some(function(c){ return c.id===r; })) return r; }catch(e){} return base.apply(this, arguments); };
})(expGuessCat);
// existing charges: rules apply, and Other gets another look with the new categories (yours stay yours)
function r79Recat(){
  let ch = 0; const f = r79F();
  finExpenses().forEach(function(e){
    if(e.catSet) return;
    const r = f.catRules[r79MKey(e.name)];
    if(r && e.cat!==r){ e.cat = r; ch++; return; }
    if(!e.cat || e.cat==='other'){ const g = expGuessCat(e.name || ''); if(g && g!=='other'){ e.cat = g; ch++; } }
  });
  if(ch) persist('finances');
  return ch;
}
function r79Rule(key, cat){
  const f = r79F(); f.catRules[key] = cat; let n = 0;
  finExpenses().forEach(function(e){ if(r79MKey(e.name)===key){ e.cat = cat; e.catSet = true; n++; } });
  persist('finances'); return n;
}

// ---------------- what a month looks like ----------------
function r79MonthTx(ym){ return finExpenses().filter(function(e){ return !e.dupOf && String(e.date).slice(0, 7)===ym; }); }
function r79Spend(ym){
  const tx = r79MonthTx(ym), cats = {};
  let total = 0, moved = 0;
  tx.forEach(function(e){
    const a = Math.abs(Number(e.amount || 0)); if(!a) return;
    if(e.cat==='move'){ moved += a; return; }
    const k = e.cat && EXP_CATS.some(function(c){ return c.id===e.cat; }) ? e.cat : 'other';
    const c = cats[k] || (cats[k] = {id:k, total:0, n:0, places:{}});
    c.total += a; c.n++; total += a;
    const pk = r79MKey(e.name), p = c.places[pk] || (c.places[pk] = {key:pk, name:r79Nice(e.name), total:0, n:0, last:''});
    p.total += a; p.n++; if(e.date > p.last){ p.last = e.date; p.raw = e.name; }
  });
  return {ym:ym, total:total, moved:moved, n:tx.length, cats:Object.keys(cats).map(function(k){ return cats[k]; }).sort(function(a, b){ return b.total - a.total; })};
}
function r79YmAdd(ym, n){ const p = ym.split('-').map(Number), d = new Date(p[0], p[1] - 1 + n, 1); return d.getFullYear()+'-'+pad2(d.getMonth() + 1); }
function r79YmName(ym){ const p = ym.split('-').map(Number); return new Date(p[0], p[1] - 1, 1).toLocaleDateString(undefined, {month:'long', year:'numeric'}); }
function r79Cents(n){ return '$'+Number(n || 0).toLocaleString(undefined, {minimumFractionDigits:2, maximumFractionDigits:2}); }
function r79CatOpts(sel){ return EXP_CATS.map(function(c){ return '<option value="'+c.id+'"'+(c.id===sel ? ' selected' : '')+'>'+escapeHtml(c.label)+'</option>'; }).join(''); }

// ---------------- bills that repeat ----------------
function r79Recurring(){
  const by = {};
  finExpenses().forEach(function(e){ if(e.dupOf || e.cat==='move' || !(Math.abs(Number(e.amount)) > 0)) return; const k = r79MKey(e.name); (by[k] = by[k] || []).push(e); });
  const out = [], recentFrom = addDays(todayStr(), -50);
  Object.keys(by).forEach(function(k){
    const months = {};
    by[k].forEach(function(e){ const ym = String(e.date).slice(0, 7); (months[ym] = months[ym] || []).push(e); });
    const yms = Object.keys(months).sort(); if(yms.length < 2) return;
    const last4 = yms.slice(-4);
    // the months it shows up in have to follow on from each other
    for(let i = 1; i < last4.length; i++) if(r79YmAdd(last4[i - 1], 1)!==last4[i] && r79YmAdd(last4[i - 1], 2)!==last4[i]) return;
    // one charge a month (a place you shop at weekly isn't a bill)
    if(last4.some(function(ym){ return months[ym].length > 2; })) return;
    const pick = last4.map(function(ym){ return months[ym].slice().sort(function(a, b){ return String(b.date).localeCompare(String(a.date)); })[0]; });
    const amts = pick.map(function(e){ return Math.abs(Number(e.amount)); }), avg = amts.reduce(function(s, v){ return s + v; }, 0)/amts.length;
    // a bill costs about the same each time (a phone bill can move a little; a store you go to doesn't count)
    const billish = ['bills', 'subs', 'business', 'health', 'fees'].indexOf(pick[pick.length - 1].cat) >= 0 || /^my_/.test(pick[pick.length - 1].cat || '');
    if(['food', 'groceries', 'transport', 'shopping', 'fun', 'cash', 'people', 'travel'].indexOf(pick[pick.length - 1].cat) >= 0) return;
    const lastCat = pick[pick.length - 1].cat, tol = lastCat==='bills' ? Math.max(3, avg*0.15) : billish ? Math.max(1, avg*0.05) : Math.max(1, avg*0.03);
    if(amts.some(function(v){ return Math.abs(v - avg) > tol; })) return;
    if(avg < 4) return;
    const days = pick.map(function(e){ return Number(String(e.date).slice(8, 10)); }), spread = Math.max.apply(null, days) - Math.min.apply(null, days);
    if(spread > 6 && spread < 24) return;
    const last = pick[pick.length - 1]; if(last.date < recentFrom) return;
    out.push({key:k, name:r79Nice(last.name), raw:last.name, amount:Math.round(Math.abs(Number(last.amount))*100)/100, day:Number(String(last.date).slice(8, 10)), months:yms.length, cat:last.cat, last:last.date});
  });
  return out.sort(function(a, b){ return b.amount - a.amount; });
}
// they go on the finance calendar by themselves (and come off if you say it isn't one)
function r79SyncBills(){
  const f = r79F(); let ch = false;
  r79Recurring().forEach(function(r){
    if(f.recurOff[r.key]) return;
    let b = f.bills.find(function(x){ return x.rkey===r.key; });
    if(!b) b = f.bills.find(function(x){ return !x.rkey && r79MKey(x.name)===r.key; });
    if(!b){ f.bills.push({id:uid(), name:r.name, amount:r.amount, dueDay:r.day, auto:true, rkey:r.key, cat:r.cat}); ch = true; return; }
    if(b.auto && (Number(b.amount)!==r.amount || Number(b.dueDay)!==r.day)){ b.amount = r.amount; b.dueDay = r.day; ch = true; }
  });
  if(ch) persist('finances');
  return ch;
}
// on the calendar: a found bill says so, and it counts as paid once the charge shows up in your bank
r44Events = (function(base){
  return function(from, to){
    const out = base.apply(this, arguments);
    try{
      const f = r79F();
      out.forEach(function(e){
        if(!e.billId) return; const b = f.bills.find(function(x){ return x.id===e.billId; }); if(!b || !b.rkey) return;
        e.sub = 'Repeats every month'; e.icon = '&#128257;';
        if(!e.done){ const ym = e.date.slice(0, 7); if(finExpenses().some(function(x){ return String(x.date).slice(0, 7)===ym && r79MKey(x.name)===b.rkey; })) e.done = true; }
      });
    }catch(err){}
    return out;
  };
})(r44Events);

// ---------------- the Spending tab ----------------
function r79SpendHtml(){
  const ym = ui.r79Ym || thisMonthKey(), S = r79Spend(ym), P = r79Spend(r79YmAdd(ym, -1));
  const open = ui.r79Cat === undefined ? (S.cats.find(function(c){ return c.id==='other'; }) && S.cats.find(function(c){ return c.id==='other'; }).total > S.total*0.2 ? 'other' : null) : ui.r79Cat;
  const diff = P.total ? Math.round((S.total - P.total)/P.total*100) : null, max = S.cats.length ? S.cats[0].total : 1;
  let h = '<div class="r79-sp">';
  h += '<div class="r79-sp-top"><div><small>Spent in '+escapeHtml(r79YmName(ym))+'</small><b>'+r79Cents(S.total)+'</b>'+
    (diff!=null ? '<em class="'+(diff > 0 ? 'is-up' : 'is-down')+'">'+(diff > 0 ? '▲ ' : '▼ ')+Math.abs(diff)+'% vs '+escapeHtml(r79YmName(r79YmAdd(ym, -1)).split(' ')[0])+'</em>' : '')+'</div>'+
    (S.moved ? '<div class="r79-sp-mv" title="'+escapeHtml(expCat('move').note || '')+'"><small>Transfers (not counted)</small><b>'+r79Cents(S.moved)+'</b></div>' : '')+'</div>';
  if(!S.cats.length) return h+'<div class="r44-empty">Nothing spent in '+escapeHtml(r79YmName(ym))+' yet. Connect a bank in Accounts, or drop in a statement.</div></div>';
  h += '<div class="r79-cats">'+S.cats.map(function(c){
    const k = expCat(c.id), col = R44_CAT_COLORS[c.id] || '#8A90A2', on = open===c.id, pct = Math.round(c.total/S.total*100);
    let row = '<button class="r79-cat'+(on ? ' is-on' : '')+'" style="--c:'+col+'" data-action="r79Cat" data-id="'+c.id+'"><span class="r79-cn">'+(k.icon || '')+' '+escapeHtml(k.label)+'<small>'+c.n+' charge'+(c.n===1 ? '' : 's')+'</small></span><i class="r79-bar"><u style="width:'+Math.max(2, Math.round(c.total/max*100))+'%"></u></i><b>'+r79Cents(c.total)+'</b><em>'+pct+'%</em></button>';
    if(on){
      const places = Object.keys(c.places).map(function(p){ return c.places[p]; }).sort(function(a, b){ return b.total - a.total; });
      row += '<div class="r79-places">'+(c.id==='other' ? '<p class="r79-hint">These didn’t match a category. Pick one for a place and every charge from it moves, now and from now on.</p>' : '')+
        places.map(function(p){ return '<div class="r79-pl"><span><b>'+escapeHtml(p.name)+'</b><small>'+p.n+'× · last '+escapeHtml(fmtDateShort(p.last))+(p.raw && p.raw.toLowerCase()!==p.name.toLowerCase() ? ' · '+escapeHtml(String(p.raw).slice(0, 40)) : '')+'</small></span><b>'+r79Cents(p.total)+'</b><select class="input input-sm" data-r79-rule="'+escapeHtml(p.key)+'">'+r79CatOpts(c.id)+'<option value="__new">+ New category…</option></select></div>'; }).join('')+'</div>';
    }
    return row;
  }).join('')+'</div>';
  // the bills that repeat
  const R = r79Recurring(), f = r79F();
  if(R.length){
    h += '<div class="r79-rec"><div class="r79-rec-h"><b>&#128257; Repeats every month</b><span>Found in your bank. They’re on the finance calendar.</span></div>'+R.map(function(r){
      const off = !!f.recurOff[r.key];
      return '<div class="r79-rr'+(off ? ' is-off' : '')+'"><span><b>'+escapeHtml(r.name)+'</b><small>around the '+holOrdinal(r.day)+' · '+r.months+' months</small></span><b>'+r79Cents(r.amount)+'</b>'+
        (off ? '<button class="r43-link" data-action="r79RecOn" data-id="'+escapeHtml(r.key)+'">Put it back</button>' : '<button class="r43-link" data-action="r79RecOff" data-id="'+escapeHtml(r.key)+'">Not a bill</button>')+'</div>';
    }).join('')+'</div>';
  }
  return h+'</div>';
}
ACTIONS.r79Cat = function(el, e, id){ ui.r79Cat = ui.r79Cat===id ? null : id; playTick(); renderView(); };
ACTIONS.r79Ym = function(el, e, id){ ui.r79Ym = r79YmAdd(ui.r79Ym || thisMonthKey(), Number(id)); ui.r79Cat = undefined; renderView(); };
ACTIONS.r79RecOff = function(el, e, key){ const f = r79F(); f.recurOff[key] = 1; f.bills = f.bills.filter(function(b){ return b.rkey!==key; }); persist('finances'); renderView(); showToast('Off the calendar.', {icon:'&#128257;'}); };
ACTIONS.r79RecOn = function(el, e, key){ const f = r79F(); delete f.recurOff[key]; persist('finances'); r79SyncBills(); renderView(); };
document.addEventListener('change', function(e){
  const t = e.target; if(!t || !t.getAttribute) return;
  const key = t.getAttribute('data-r79-rule');
  if(key!=null){
    if(t.value==='__new'){ r79NewCat(function(id){ const n = r79Rule(key, id); renderView(); showToast(n+' charge'+(n===1 ? '' : 's')+' moved.', {icon:'&#9989;'}); }); return; }
    const n = r79Rule(key, t.value); renderView(); try{ addSheetRefresh('r79Month'); }catch(x){}
    showToast(n+' charge'+(n===1 ? '' : 's')+' from '+r79Nice(key)+' → '+expCat(t.value).label+'. New ones will follow.', {icon:'&#9989;'});
    return;
  }
  const tx = t.getAttribute('data-r79-tx');
  if(tx!=null){
    const x = finExpenses().find(function(v){ return v.id===tx; }); if(!x) return;
    if(t.value==='__new'){ r79NewCat(function(id){ x.cat = id; x.catSet = true; persist('finances'); renderView(); }); return; }
    x.cat = t.value; x.catSet = true; persist('finances'); renderView();
    const others = finExpenses().filter(function(v){ return v!==x && r79MKey(v.name)===r79MKey(x.name) && v.cat!==x.cat; }).length;
    showToast(expCat(x.cat).label+'.', others ? {icon:'&#9989;', actionLabel:'All '+(others + 1)+' from '+r79Nice(x.name), actionAction:'r79RuleFrom', actionId:x.id, duration:9000} : {icon:'&#9989;'});
  }
});
ACTIONS.r79RuleFrom = function(el, e, id){ const x = finExpenses().find(function(v){ return v.id===id; }); if(!x) return; const n = r79Rule(r79MKey(x.name), x.cat); if(typeof dismissToast==='function') dismissToast(); renderView(); showToast(n+' moved, and new ones will follow.', {icon:'&#9989;'}); };
// (a small box of our own: the Mac app has no browser prompt)
function r79NewCat(done){
  let o = document.getElementById('r79Ask'); if(o) o.remove();
  o = document.createElement('div'); o.id = 'r79Ask'; o.className = 'r79-ask';
  o.innerHTML = '<div class="r79-ask-b"><b>New category</b><input class="input" id="r79AskIn" maxlength="30" placeholder="e.g. Studio gear, Gifts, Courses"><div><button class="btn btn-ghost btn-sm" id="r79AskNo">Cancel</button><button class="btn btn-primary btn-sm" id="r79AskGo">Add</button></div></div>';
  document.body.appendChild(o);
  const inp = document.getElementById('r79AskIn'), close = function(){ o.remove(); renderView(); };
  const go = function(){
    const label = inp.value.trim().slice(0, 30); if(!label){ inp.focus(); return; }
    const f = r79F(), id = 'my_'+label.toLowerCase().replace(/[^a-z0-9]+/g, '_').slice(0, 20);
    if(!f.myCats.some(function(c){ return c.id===id; })) f.myCats.push({id:id, label:label, icon:'&#9679;'});
    persist('finances'); r79MyCats(); o.remove(); if(done) done(id); else renderView();
  };
  document.getElementById('r79AskGo').onclick = go; document.getElementById('r79AskNo').onclick = close;
  o.onclick = function(e){ if(e.target===o) close(); };
  inp.onkeydown = function(e){ if(e.key==='Enter'){ e.preventDefault(); go(); } else if(e.key==='Escape'){ e.preventDefault(); e.stopPropagation(); close(); } };
  setTimeout(function(){ inp.focus(); }, 20);
}

// ---------------- the Finances page: Spending tab, debts sort, transactions ----------------
renderPersonalFinances = (function(base){
  return function(){
    const want = ui.finTab;
    if(want==='spending') ui.finTab = 'upcoming';
    let h = base.apply(this, arguments);
    ui.finTab = want;
    // the tab
    h = h.replace(/(<button class="[^"]*" data-action="r44Tab" data-id="upcoming">Upcoming<\/button>)/, function(m){ return m+'<button class="'+(want==='spending' ? 'is-on' : '')+'" data-action="r44Tab" data-id="spending">Spending</button>'; });
    if(want==='spending'){
      h = h.replace('<button class="is-on" data-action="r44Tab" data-id="upcoming">', '<button class="" data-action="r44Tab" data-id="upcoming">');
      const ym = ui.r79Ym || thisMonthKey();
      const tools = '<button class="r44-btn" data-action="r79Ym" data-id="-1">&#8249;</button><span class="r79-ym">'+escapeHtml(r79YmName(ym))+'</span><button class="r44-btn" data-action="r79Ym" data-id="1"'+(ym >= thisMonthKey() ? ' disabled' : '')+'>&#8250;</button><button class="r44-btn" data-action="r79StmtPick">Upload statements</button><button class="r44-btn is-gold" data-action="r79MonthOpen">Monthly review</button>';
      const body = '<div class="r44-tools">'+tools+'</div><div class="r44-body">'+r79SpendHtml()+'</div></section>';
      h = h.replace(/<div class="r44-tools">[\s\S]*?<\/div><div class="r44-body">[\s\S]*<\/div><\/section>/, function(){ return body; });
    }
    // debts: one sort menu, no second add button (the + in the corner adds debts)
    h = h.replace(/<button class="r44-btn" data-action="r44DebtSort">[\s\S]*?<\/button><button class="r44-btn" data-action="r44DebtEdit" data-id="">\+ Debt<\/button>/,
      '<label class="r79-sort">Sort <select class="input input-sm" data-r79-dsort>'+[['rateHi', 'Highest rate'], ['rateLo', 'Lowest rate'], ['balHi', 'Biggest balance'], ['balLo', 'Smallest balance']].map(function(o){ return '<option value="'+o[0]+'"'+(r79DSort()===o[0] ? ' selected' : '')+'>'+o[1]+'</option>'; }).join('')+'</select></label>');
    h = h.replace('Add one with + Debt to track it down to zero.', 'Add one with the + button to track it down to zero.');
    // transactions: the statement button takes PDFs too
    h = h.replace('data-action="bankCsvPick">Import statement</button>', 'data-action="r79StmtPick">Upload statements</button>');
    return h;
  };
})(renderPersonalFinances);
function r79DSort(){ const s = ui.r44Sort; return s==='small' ? 'balLo' : ['rateHi', 'rateLo', 'balHi', 'balLo'].indexOf(s) >= 0 ? s : 'rateHi'; }
function r79Apr(d){ const v = d.apr!=null && d.apr!=='' ? d.apr : d.interestRate!=null && d.interestRate!=='' ? d.interestRate : d.rate; const n = Number(String(v==null ? '' : v).replace('%', '')); return v==null || v==='' || isNaN(n) ? null : n; }
document.addEventListener('change', function(e){ if(e.target && e.target.hasAttribute && e.target.hasAttribute('data-r79-dsort')){ ui.r44Sort = e.target.value; playTick(); renderView(); } });
// the rows come out of the old sort; this puts them in the order you picked (no rate yet: always last)
r44DebtsHtml = (function(base){
  return function(){
    const h = base.apply(this, arguments), i = h.indexOf('<div class="r44-debt'), j = h.indexOf('<div class="r44-net">');
    if(i < 0 || j < 0) return h;
    const f = r44F(), rows = h.slice(i, j).split(/(?=<div class="r44-debt)/), mode = r79DSort();
    const of = function(row){ const m = row.match(/data-action="r44DebtEdit" data-id="([^"]+)"/); return m ? f.debts.find(function(d){ return d.id===m[1]; }) : null; };
    const key = function(d){ if(!d) return null; return mode.indexOf('rate')===0 ? r79Apr(d) : Math.max(0, Number(d.balance || 0)); };
    rows.sort(function(a, b){
      const x = key(of(a)), y = key(of(b));
      if(x==null && y==null) return 0; if(x==null) return 1; if(y==null) return -1;
      return /Hi$/.test(mode) ? y - x : x - y;
    });
    const noRate = f.debts.filter(function(d){ return Number(d.balance) > 0 && r79Apr(d)==null; }).length;
    return h.slice(0, i)+(mode.indexOf('rate')===0 && noRate ? '<div class="r79-dnote">'+noRate+' debt'+(noRate===1 ? ' has' : 's have')+' no rate yet, so '+(noRate===1 ? 'it sits' : 'they sit')+' at the bottom. Tap &#9998; to add it.</div>' : '')+rows.join('')+h.slice(j);
  };
})(r44DebtsHtml);
// the + button's debt form asks for the rate, minimum and due day too
finSheetHtml = (function(base){
  return function(){
    const h = base.apply(this, arguments);
    if((ui.finSheet || 'expense')!=='debt') return h;
    return h.replace('<input class="input hs-in" id="debtCreditor"', '<div class="hs-row r79-drow"><input class="input" type="number" step="0.01" min="0" id="debtApr" placeholder="Rate (APR %)"><input class="input" type="number" step="0.01" min="0" id="debtMin" placeholder="Minimum / month"><input class="input" type="number" min="1" max="31" id="debtDue" placeholder="Due day (1–31)"></div><input class="input hs-in" id="debtCreditor"');
  };
})(finSheetHtml);
addDebt = (function(base){
  return function(){
    const v = function(id){ const el = document.getElementById(id); return el ? el.value.trim() : ''; };
    const apr = v('debtApr'), min = v('debtMin'), due = v('debtDue'), n = state.finances.debts.length;
    const r = base.apply(this, arguments);
    const d = state.finances.debts.length > n ? state.finances.debts[state.finances.debts.length - 1] : null;
    if(d){ if(apr!=='') d.apr = Number(apr); if(min!=='') d.minPayment = Number(min); if(due!=='') d.dueDay = Math.max(1, Math.min(31, Math.round(Number(due)))); persist('finances'); renderView(); }
    return r;
  };
})(addDebt);
// Transactions: everything, Other included; sorted how you want; change a category right on the row.
// (Layered on top of Round 55's day groups and Round 70's Personal / Business / Client type, not instead of them.)
const R79TX = {on:false};
r44Transactions = (function(base){
  return function(){
    let list = base.apply(this, arguments);
    if(!R79TX.on) return list;
    const ym = ui.r79TxYm || 'all', sort = ui.r79TxSort || 'new';
    if(ym!=='all') list = list.filter(function(t){ return String(t.date).slice(0, 7)===ym; });
    if(R79TX.spend) list = list.filter(function(t){ return t.kind==='exp' && t.cat!=='move'; });
    const by = {old:function(a, b){ return String(a.date).localeCompare(String(b.date)); }, big:function(a, b){ return Math.abs(b.amount) - Math.abs(a.amount); }, small:function(a, b){ return Math.abs(a.amount) - Math.abs(b.amount); }, az:function(a, b){ return String(a.name).localeCompare(String(b.name)); }};
    if(by[sort]) list = list.slice().sort(by[sort]);
    R79TX.count = list.length; R79TX.spent = list.filter(function(t){ return t.amount < 0 && t.cat!=='move'; }).reduce(function(s, t){ return s + Math.abs(t.amount); }, 0);
    return list;
  };
})(r44Transactions);
r44TxHtml = (function(base){
  return function(){
    const want = ui.r44Cat || 'all', sort = ui.r79TxSort || 'new', ym = ui.r79TxYm || 'all';
    R79TX.on = true; R79TX.spend = want==='spend'; if(want==='spend') ui.r44Cat = 'all';
    let h; try{ h = base.apply(this, arguments); } finally { R79TX.on = false; R79TX.spend = false; ui.r44Cat = want; }
    const tpl = document.createElement('template'); tpl.innerHTML = h;
    // the category chips: Other and Spending included, with counts
    const present = {}; r44Transactions().forEach(function(t){ present[t.cat] = (present[t.cat] || 0) + 1; });
    const cats = ['all', 'spend'].concat(EXP_CATS.map(function(c){ return c.id; }).filter(function(id){ return present[id]; }), present.income ? ['income'] : []);
    const chips = '<div class="r44-chips r79-chips">'+cats.map(function(c){ const k = c==='all' ? {label:'All'} : c==='spend' ? {label:'Spending'} : c==='income' ? {label:'Income'} : expCat(c); return '<button class="'+(want===c ? 'is-on' : '')+'" style="--c:'+(R44_CAT_COLORS[c] || '#E8A23D')+'" data-action="r44Cat" data-id="'+c+'">'+(c==='all' || c==='spend' ? '' : '<i></i>')+escapeHtml(k.label)+(present[c] && c!=='income' ? ' <small>'+present[c]+'</small>' : '')+'</button>'; }).join('')+'</div>';
    const months = []; { let m = thisMonthKey(); for(let i = 0; i < 12; i++){ months.push(m); m = r79YmAdd(m, -1); } }
    const bar = '<div class="r79-txbar"><select class="input input-sm" data-r79-txym><option value="all">All time</option>'+months.map(function(m){ return '<option value="'+m+'"'+(ym===m ? ' selected' : '')+'>'+escapeHtml(r79YmName(m))+'</option>'; }).join('')+'</select>'+
      '<select class="input input-sm" data-r79-txsort>'+[['new', 'Newest first'], ['old', 'Oldest first'], ['big', 'Biggest first'], ['small', 'Smallest first'], ['az', 'A to Z']].map(function(o){ return '<option value="'+o[0]+'"'+(sort===o[0] ? ' selected' : '')+'>'+o[1]+'</option>'; }).join('')+'</select>'+
      '<span class="r79-txsum">'+(R79TX.count || 0)+' · '+r79Cents(R79TX.spent || 0)+' spent</span></div>';
    const first = tpl.content.querySelector('.r44-chips:not(.r70-typs)');
    if(first){ first.insertAdjacentHTML('beforebegin', chips); first.remove(); } else tpl.innerHTML = chips+tpl.innerHTML;
    const typs = tpl.content.querySelector('.r70-typs'), anchor = typs || tpl.content.querySelector('.r79-chips');
    if(anchor) anchor.insertAdjacentHTML('afterend', bar);
    // the category on each expense row becomes a menu
    tpl.content.querySelectorAll('.r44-tx').forEach(function(r){
      const ts = r.querySelector('[data-r70-typ]'), cat = r.querySelector('.r44-cat'); if(!ts || !cat) return;
      const x = finExpenses().find(function(e){ return e.id===ts.getAttribute('data-r70-typ'); }); if(!x) return;
      const c = R44_CAT_COLORS[x.cat] || '#8A90A2';
      cat.outerHTML = '<select class="r79-catsel" style="--c:'+c+'" data-r79-tx="'+escapeHtml(x.id)+'" aria-label="Category">'+r79CatOpts(x.cat || 'other')+'<option value="__new">+ New category…</option></select>';
    });
    // sorted by amount or name, day headers don't help: each row says its own day instead
    if(sort!=='new' && sort!=='old'){
      tpl.content.querySelectorAll('.r55-txd').forEach(function(d){ d.remove(); });
    }
    return tpl.innerHTML;
  };
})(r44TxHtml);
// (by amount or name, the day goes on each row; Round 55 takes the date off rows to make its day headers)
r44Transactions = (function(base){
  return function(){
    const list = base.apply(this, arguments), sort = ui.r79TxSort || 'new';
    if(!R79TX.on || sort==='new' || sort==='old') return list;
    return list.map(function(t){ return Object.assign({}, t, {name:String(t.name || '')+' · '+fmtDateShort(t.date)}); });
  };
})(r44Transactions);
document.addEventListener('change', function(e){
  const t = e.target; if(!t || !t.hasAttribute) return;
  if(t.hasAttribute('data-r79-txym')){ ui.r79TxYm = t.value; ui.r44TxN = 50; renderView(); }
  else if(t.hasAttribute('data-r79-txsort')){ ui.r79TxSort = t.value; renderView(); }
});

// ---------------- the weekly check-in: fix what's wrong, right there ----------------
function r79FixHtml(){
  const f = r44F(), today = todayStr(), ev = r44Events(addDays(today, -21), addDays(today, 14)).filter(function(e){ return !e.done; });
  const late = ev.filter(function(e){ return e.date < today; }), soon = ev.filter(function(e){ return e.date >= today; });
  const row = function(e){ return '<div class="r79-fx"><span><b>'+escapeHtml(e.name)+'</b><small>'+(e.kind==='in' ? 'coming in' : 'going out')+' · '+escapeHtml(fmtDateShort(e.date))+(e.date < today ? ' · <em>not marked yet</em>' : '')+'</small></span><b class="'+(e.kind==='in' ? 'is-g' : '')+'">'+(e.kind==='in' ? '+' : '−')+r44Money(e.amount)+'</b><button class="btn btn-sm '+(e.kind==='in' ? 'btn-good' : 'btn-ghost')+'" data-action="r79Mark" data-id="'+escapeHtml(e.key)+'">'+(e.kind==='in' ? 'Got it' : 'Paid')+'</button></div>'; };
  const ui79 = ui.r79Paid || {};
  return '<div class="r79-fix"><div class="r79-fix-h"><b>Something off?</b><span>Mark what came in or went out, or add money you got.</span></div>'+
    (late.length ? late.map(row).join('') : '')+(soon.length ? soon.slice(0, 6).map(row).join('') : '')+
    (ui79.open ? '<div class="r79-paid"><input class="input input-sm" type="number" step="0.01" min="0" id="r79PaidAmt" placeholder="Amount"><input class="input input-sm" id="r79PaidFrom" placeholder="From (a client, a sale…)" maxlength="60"><input class="input input-sm" type="date" id="r79PaidDate" value="'+today+'"><button class="btn btn-sm btn-good" data-action="r79PaidSave">Add</button></div>'
      : '<div class="r79-fix-b"><button class="btn btn-sm btn-good" data-action="r79Paid">+ I got paid</button><button class="btn btn-sm btn-ghost" data-action="finSync">Refresh the bank</button><button class="btn btn-sm btn-ghost" data-action="r79FixDebts">Fix a debt balance</button></div>')+'</div>';
}
r55McHtml = (function(base){
  return function(){
    const h = base.apply(this, arguments);
    const fx = r79FixHtml(); return h.replace(/(<div class="r55-mc-tiles">[\s\S]*?<\/div><\/div>)/, function(m){ return m+fx; });
  };
})(r55McHtml);
ACTIONS.r79Mark = function(el, e, key){ ACTIONS.r44Mark(el, e, key); try{ addSheetRefresh('r55Money'); }catch(x){} };
ACTIONS.r79Paid = function(){ ui.r79Paid = {open:true}; try{ addSheetRefresh('r55Money'); }catch(x){} setTimeout(function(){ const i = document.getElementById('r79PaidAmt'); if(i) i.focus(); }, 30); };
ACTIONS.r79PaidSave = function(){
  const v = function(id){ const el = document.getElementById(id); return el ? el.value.trim() : ''; }, amt = Number(v('r79PaidAmt'));
  if(!(amt > 0)){ const i = document.getElementById('r79PaidAmt'); if(i) i.focus(); return; }
  const from = v('r79PaidFrom') || 'Income', date = v('r79PaidDate') || todayStr(), f = r44F();
  // a client's name: it's their payment (and this month's retainer counts as received)
  const c = arr(state.business && state.business.clients).find(function(x){ const n = String(x.business || x.name || '').toLowerCase(); return n && from.toLowerCase().indexOf(n.split(' ')[0]) >= 0; });
  if(c){ f.invoices.push({id:uid(), client:c.id, description:'Payment', amount:amt, date:date, status:'paid', attachmentName:null, attachmentData:null}); }
  else f.income.push({id:uid(), date:date, amount:amt, source:from});
  persist('finances'); xpLast = null; ui.r79Paid = null; playPositive(); renderView(); try{ addSheetRefresh('r55Money'); }catch(x){}
  showToast('+'+r44Money(amt)+(c ? ' from '+(c.business || c.name) : '')+'.', {icon:'&#127974;'});
};
ACTIONS.r79FixDebts = function(){ try{ addSheetClose('r55Money'); addSheetClose('r79Month'); }catch(x){} ui.view = 'personal'; ui.personalTab = 'finances'; ui.finTab = 'debts'; renderView(); };

// ---------------- statements: CSV, OFX, and PDFs (Op reads those) ----------------
ACTIONS.r79StmtPick = ACTIONS.bankCsvPick = function(){
  let f = document.getElementById('r79StmtFile');
  if(!f){ f = document.createElement('input'); f.type = 'file'; f.id = 'r79StmtFile'; f.multiple = true; f.accept = '.csv,.pdf,.ofx,.qfx,.qbo,text/csv,application/pdf'; f.style.display = 'none'; document.body.appendChild(f); }
  f.value = ''; f.click();
};
const R79ST = {busy:0, log:[]};
function r79StLog(t){ R79ST.log.unshift({t:t, at:Date.now()}); R79ST.log = R79ST.log.slice(0, 8); try{ addSheetRefresh('r79Month'); }catch(e){} }
document.addEventListener('change', function(e){
  if(!e.target || e.target.id!=='r79StmtFile' || !e.target.files) return;
  Array.prototype.slice.call(e.target.files).forEach(function(file){ r79StmtFile(file); });
});
function r79StmtFile(file){
  const name = file.name || 'statement', ext = (name.split('.').pop() || '').toLowerCase(), rd = new FileReader();
  if(ext==='pdf' || file.type==='application/pdf'){
    rd.onload = function(){ const b64 = String(rd.result || '').split(',')[1] || ''; r79PdfScan(b64, name); };
    rd.readAsDataURL(file); return;
  }
  rd.onload = function(){
    const text = String(rd.result || '');
    if(/<OFX>|OFXHEADER|<STMTTRN>/i.test(text)){ const n = r79ImportList(r79Ofx(text), name); r79StLog(name+': '+n+' new.'); return; }
    let n = 0; try{ n = bankImportCsv(text, name) || 0; }catch(err){ n = 0; }
    r79Recat(); r79SyncBills(); r79StLog(name+': '+n+' new.');
  };
  rd.readAsText(file);
}
function r79Ofx(text){
  const out = [];
  String(text).split(/<STMTTRN>/i).slice(1).forEach(function(b){
    const g = function(tag){ const m = b.match(new RegExp('<'+tag+'>([^<\\r\\n]+)', 'i')); return m ? m[1].trim() : ''; };
    const d = g('DTPOSTED'), amt = Number(g('TRNAMT')); if(!/^\d{8}/.test(d) || !isFinite(amt)) return;
    out.push({date:d.slice(0, 4)+'-'+d.slice(4, 6)+'-'+d.slice(6, 8), name:g('NAME') || g('MEMO') || 'Charge', amount:amt});
  });
  return out;
}
// what a statement had: charges go in (money in on a statement is left to your income and client payments)
function r79ImportList(list, name){
  const ex = finExpenses(), have = {}, batch = uid(); let added = 0, skipped = 0;
  ex.forEach(function(e){ if(e.txId) have[e.txId] = 1; });
  list.forEach(function(x){
    const amt = Math.abs(Number(x.amount || 0)); if(!(amt > 0) || !/^\d{4}-\d\d-\d\d$/.test(x.date || '')) return;
    if(Number(x.amount) > 0 && x.dir!=='out') return;            // credits: payments to the card, refunds, deposits
    const nm = String(x.name || 'Charge').slice(0, 80), id = 'stmt:'+x.date+'|'+amt.toFixed(2)+'|'+nm.toLowerCase();
    if(have[id]){ skipped++; return; }
    // already here from the bank (same amount, within 3 days, same place)
    const k = r79MKey(nm);
    if(ex.some(function(e){ return Math.abs(Math.abs(Number(e.amount || 0)) - amt) < 0.01 && Math.abs((new Date(e.date) - new Date(x.date))/86400000) <= 3 && (r79MKey(e.name)===k || !k); })){ skipped++; return; }
    have[id] = 1;
    ex.push({id:uid(), txId:id, date:x.date, amount:amt, name:nm, cat:expGuessCat(nm), src:'statement', account:x.account || 'Statement', batch:batch});
    added++;
  });
  persist('finances'); r79Recat(); r79SyncBills(); renderView();
  showToast(added ? added+' charge'+(added===1 ? '' : 's')+' from '+name+(skipped ? ' ('+skipped+' already here)' : '')+'.' : 'Nothing new in '+name+'.', added ? {icon:'&#127974;', actionLabel:'Undo', actionAction:'inboxUndoBank', actionId:batch, duration:9000} : {icon:'&#127974;'});
  return added;
}
async function r79PdfScan(b64, name){
  if(!b64){ r79StLog(name+': couldn’t read the file.'); return; }
  if(typeof AI!=='undefined' && AI.hasKey===false){ r79StLog(name+': Op needs your Anthropic key to read PDFs (Settings → Connections & data → Op). CSV works without it.'); return; }
  R79ST.busy++; r79StLog('Op is reading '+name+'…'); showToast('Op is reading '+name+'…', {icon:'&#128196;'});
  try{
    const model = await aiPickModel(); if(!model) throw new Error('no model');
    const res = await aiCall({model:model, max_tokens:12000, system:'You read bank and credit card statements and return the transactions exactly as printed. Output JSON only, no prose.',
      messages:[{role:'user', content:[{type:'document', source:{type:'base64', media_type:'application/pdf', data:b64}},
        {type:'text', text:'List every transaction on this statement. Return only JSON: {"account":"bank and account name","t":[["YYYY-MM-DD","description as printed",12.34,"out"|"in"]]}. "out" is money leaving (a purchase, a bill, a fee, a withdrawal), "in" is money coming in (a deposit, a payment to the card, a refund). Amounts are positive numbers. Use the year from the statement period.'}]}]});
    if(!res.ok) throw new Error(res.j && res.j.error ? (res.j.error.message || 'error') : 'Op didn’t answer');
    const txt = arr(res.j.content).filter(function(c){ return c.type==='text'; }).map(function(c){ return c.text; }).join('');
    const m = txt.match(/\{[\s\S]*\}/); const j = m ? JSON.parse(m[0]) : null;
    const list = arr(j && j.t).map(function(r){ return {date:String(r[0] || ''), name:String(r[1] || ''), amount:r[3]==='in' ? Math.abs(Number(r[2])) : -Math.abs(Number(r[2])), dir:r[3]==='in' ? 'in' : 'out', account:j.account ? String(j.account).slice(0, 40) : 'Statement'}; });
    if(!list.length) throw new Error('no transactions found');
    const n = r79ImportList(list, name);
    r79StLog(name+': Op found '+list.length+' transactions, '+n+' new charge'+(n===1 ? '' : 's')+' added.');
  }catch(err){ r79StLog(name+': '+(String(err && err.message || err).slice(0, 120))+'.'); showToast('Couldn’t read '+name+'.', {icon:'&#9888;&#65039;'}); }
  finally{ R79ST.busy--; try{ addSheetRefresh('r79Month'); }catch(e){} }
}

// ---------------- the monthly review (a master task, from the 1st) ----------------
function r79ReviewYm(){ return r79YmAdd(thisMonthKey(), -1); }
function r79ReviewDone(ym){ return !!r79F().monthReviews[ym || r79ReviewYm()]; }
function r79MonthHtml(){
  const ym = ui.r79MonthYm || r79ReviewYm(), S = ui.r79Ms || (ui.r79Ms = {}), Sp = r79Spend(ym), accts = r44Accounts(), f = r79F();
  const places = accts.map(function(a){ return (a.org ? a.org+' · ' : '')+a.name; }).concat(f.debts.filter(function(d){ return Number(d.balance) > 0; }).map(function(d){ return d.name; }));
  const step = function(n, k, title, sub, body, btn){ const ok = S[k]; return '<section class="r55-mc-s'+(ok ? ' is-ok' : '')+'"><div class="r55-mc-h"><span class="r55-mc-i">'+(ok ? '&#10003;' : n)+'</span><b>'+title+'</b><em>'+sub+'</em><button class="btn btn-sm '+(ok ? 'btn-ghost' : 'btn-primary')+'" data-action="r79Ms" data-id="'+k+'">'+(ok ? 'Done' : btn || 'Done')+'</button></div>'+body+'</section>'; };
  const other = Sp.cats.find(function(c){ return c.id==='other'; }), R = r79Recurring();
  return '<button class="int-x hs-x" data-action="addSheetClose" title="Close">&#10005;</button>'+
    '<div class="as-h"><span class="as-ic">&#128197;</span><div><div class="hs-h">Monthly money review</div><div class="hs-s">'+escapeHtml(r79YmName(ym))+'. Look at all of it, once a month.</div></div></div>'+
    step(1, 'get', 'Get your statements', 'from every account and card',
      '<p class="r79-mp">Download last month’s statement from each one (PDF or CSV, from their website or app):</p><ul class="r79-ml">'+(places.length ? places.map(function(p){ return '<li>'+escapeHtml(p)+'</li>'; }).join('') : '<li>Your checking, your cards, anything with a balance</li>')+'</ul>', 'Got them')+
    step(2, 'up', 'Drop them in', 'Op reads PDFs; CSV and OFX too',
      '<button class="btn btn-sm btn-good r79-up" data-action="r79StmtPick">&#128196; Upload statements</button>'+(R79ST.busy ? ' <span class="r79-busy">reading…</span>' : '')+
      (R79ST.log.length ? '<div class="r79-stlog">'+R79ST.log.map(function(l){ return '<div>'+escapeHtml(l.t)+'</div>'; }).join('')+'</div>' : '<p class="r79-mp">Anything your bank already sent over is skipped, so nothing counts twice.</p>'), 'Done')+
    step(3, 'where', 'Where it went', r79Cents(Sp.total)+' spent'+(other ? ' · '+r79Cents(other.total)+' in Other' : ''),
      '<div class="r79-mcats">'+Sp.cats.slice(0, 8).map(function(c){ const k = expCat(c.id); return '<div style="--c:'+(R44_CAT_COLORS[c.id] || '#8A90A2')+'"><span>'+escapeHtml(k.label)+'</span><i><u style="width:'+Math.round(c.total/(Sp.cats[0].total || 1)*100)+'%"></u></i><b>'+r79Cents(c.total)+'</b></div>'; }).join('')+'</div>'+
      (other ? '<button class="r43-link" data-action="r79SortOther" data-id="'+ym+'">Sort what’s in Other &#8594;</button>' : ''), 'Looks right')+
    step(4, 'bills', 'Bills that repeat', R.length ? R.length+' found, on the calendar' : 'none found yet',
      R.length ? '<div class="r79-mrec">'+R.slice(0, 10).map(function(r){ return '<div><span>'+escapeHtml(r.name)+'</span><b>'+r79Cents(r.amount)+'</b><small>the '+holOrdinal(r.day)+'</small></div>'; }).join('')+'</div>' : '<p class="r79-mp">Once a charge shows up two months running, it lands here and on the finance calendar.</p>', 'Checked')+
    step(5, 'next', 'One change for next month', 'a cancel, a cap, a goal',
      '<input class="input" id="r79MNote" maxlength="140" placeholder="e.g. Cancel the second Adobe plan" value="'+escapeHtml(S.note || '')+'">', 'Set')+
    '<div class="r55-mc-f">'+(['get', 'up', 'where', 'bills'].every(function(k){ return S[k]; }) ? '<button class="btn btn-primary r55-mc-go" data-action="r79MonthFinish">Finish the review</button>' : '<span class="r55-mc-wait">Go through the steps to finish</span>')+'</div>';
}
function r79MonthOpen(ym){ ui.r79MonthYm = ym || r79ReviewYm(); ui.r79Ms = {}; addSheetOpen('r79Month', r79MonthHtml); }
ACTIONS.r79MonthOpen = function(){ r79MonthOpen(); };
ACTIONS.r79Ms = function(el, e, k){ const S = ui.r79Ms || (ui.r79Ms = {}); if(k==='next'){ const i = document.getElementById('r79MNote'); S.note = i ? i.value.trim() : ''; } S[k] = !S[k]; playTick(); addSheetRefresh('r79Month'); };
ACTIONS.r79SortOther = function(el, e, ym){ addSheetClose('r79Month'); ui.view = 'personal'; ui.personalTab = 'finances'; ui.finTab = 'spending'; ui.r79Ym = ym; ui.r79Cat = 'other'; renderView(); };
ACTIONS.r79MonthFinish = function(){
  const ym = ui.r79MonthYm || r79ReviewYm(), S = ui.r79Ms || {}, f = r79F();
  const i = document.getElementById('r79MNote'); const note = (i ? i.value.trim() : '') || S.note || '';
  f.monthReviews[ym] = {at:Date.now(), date:todayStr(), note:note, spent:Math.round(r79Spend(ym).total)};
  persist('finances'); playPositive(); addSheetClose('r79Month');
  try{ masterTasksSync(); }catch(e){} renderView();
  showToast(r79YmName(ym)+' reviewed.'+(note ? ' Next month: '+note : ''), {icon:'&#128197;', duration:7000});
};
masterTasksSync = (function(base){
  return function(){
    const r = base.apply(this, arguments);
    if(mt38Busy || !state || !state.tasks || !state.finances) return r;
    try{
      const ym = r79ReviewYm(), done = r79ReviewDone(ym);
      let t = state.tasks.items.find(function(x){ return x.master && x.master.kind==='moneyMonth' && x.master.ym===ym; });
      // (only for someone who keeps money in here; made late in the month, it's due in a few days, not already late)
      const hasMoney = finExpenses().length > 0 || r44Accounts().length > 0;
      const due = todayStr() <= thisMonthKey()+'-07' ? thisMonthKey()+'-07' : addDays(todayStr(), 3);
      if(!t && !done && hasMoney){ state.tasks.items.push({id:uid(), title:'Monthly money review ('+r79YmName(ym).split(' ')[0]+')', client:'personal', clients:['personal'], priority:'high', deadline:due, notes:'Download every statement, drop them in, and see where it all went.', status:'today', createdAt:todayStr(), completedAt:null, master:{kind:'moneyMonth', ym:ym}}); persist('tasks'); }
      else if(t && done && t.status!=='done'){ t.status = 'done'; t.completedAt = todayStr(); persist('tasks'); }
      const before = state.tasks.items.length;
      state.tasks.items = state.tasks.items.filter(function(x){ return !(x.master && x.master.kind==='moneyMonth' && x.master.ym < ym && x.status!=='done'); });
      if(state.tasks.items.length!==before) persist('tasks');
    }catch(e){}
    return r;
  };
})(masterTasksSync);
completeTask = (function(base){
  return function(id){
    const t = state.tasks.items.find(function(x){ return x.id===id; });
    if(t && t.master && t.master.kind==='moneyMonth' && t.status!=='done'){ r79MonthOpen(t.master.ym); return; }
    return base.apply(this, arguments);
  };
})(completeTask);
openTaskEditModal = (function(base){ return function(id){ const t = state.tasks.items.find(function(x){ return x.id===id; }); if(!ui.r55Raw && t && t.master && t.master.kind==='moneyMonth' && t.status!=='done'){ r79MonthOpen(t.master.ym); return; } return base.apply(this, arguments); }; })(openTaskEditModal);

// ---------------- holidays: picked by date, and over when the holiday is ----------------
holToday = function(d){
  d = d || todayStr(); const y = Number(d.slice(0, 4)), md = d.slice(5), p = state.profile;
  if(p.birthday && /^\d{4}-\d\d-\d\d$/.test(p.birthday) && p.birthday.slice(5)===md) return 'birthday';
  if(md >= '10-24' && md <= '10-31') return 'halloween';
  const tg = holThanksgiving(y); if(d >= addDays(tg, -3) && d <= tg) return 'thanksgiving';
  if(md >= '12-18' && md <= '12-25') return 'christmas';
  if(md==='12-31' || md==='01-01') return 'newyear';
  // (Round 60's: each one on its day; Easter from Good Friday)
  if(md==='02-14') return 'valentines';
  if(md==='03-17') return 'stpatricks';
  if(typeof r60Easter==='function'){ const ea = r60Easter(y); if(d >= addDays(ea, -2) && d <= ea) return 'easter'; }
  if(md==='07-04') return 'july4';
  return null;
};
// the last day a holiday you picked by hand stays on (its next one, or this one if it's on now)
function r79HolEnd(id){
  const t = todayStr(), y = Number(t.slice(0, 4));
  const next = function(fn){ const a = fn(y); return a >= t ? a : fn(y + 1); };
  if(id==='halloween') return next(function(yy){ return yy+'-10-31'; });
  if(id==='thanksgiving') return next(holThanksgiving);
  if(id==='christmas') return next(function(yy){ return yy+'-12-25'; });
  if(id==='newyear') return t.slice(5)==='01-01' ? t : (y + 1)+'-01-01';
  if(id==='valentines') return next(function(yy){ return yy+'-02-14'; });
  if(id==='stpatricks') return next(function(yy){ return yy+'-03-17'; });
  if(id==='easter' && typeof r60Easter==='function') return next(r60Easter);
  if(id==='july4') return next(function(yy){ return yy+'-07-04'; });
  if(id==='birthday'){ const b = state.profile.birthday; if(!b) return t; return next(function(yy){ return yy+'-'+b.slice(5); }); }
  return t;
}
holActive = function(){
  if(ui.holPreview) return ui.holPreview;
  if(holMode()==='off') return null;
  const p = state.profile.holidayPick;
  if(p && p.id && p.until){
    if(todayStr() <= p.until) return p.id;
    state.profile.holidayPick = null; try{ persist('profile'); }catch(e){}
  }
  return holToday();
};
themeSettingsHtml = (function(base){
  return function(){
    const h = base.apply(this, arguments), p = state.profile.holidayPick, cur = p && p.id && p.until >= todayStr() ? p.id : 'auto';
    const row = '<div class="hol-row r79-holpick"><span>Which one</span><div class="r43-seg">'+[['auto', 'Automatic'], ['newyear', 'New Year'], ['valentines', 'Valentine’s'], ['stpatricks', 'St. Patrick’s'], ['easter', 'Easter'], ['july4', 'July 4th'], ['halloween', 'Halloween'], ['thanksgiving', 'Thanksgiving'], ['christmas', 'Christmas']].map(function(o){ return '<button type="button" class="'+(cur===o[0] ? 'is-on' : '')+'" data-action="r79HolPick" data-id="'+o[0]+'">'+o[1]+'</button>'; }).join('')+'</div>'+
      '<em>'+(cur==='auto' ? 'Picks the holiday by the date and turns off when it’s over.' : 'On until '+escapeHtml(fmtDateShort(p.until))+', then back to automatic.')+'</em></div>';
    return h.replace(/(<div class="section-title">Holiday themes<\/div><div class="r43-seg">[\s\S]*?<\/div>)/, function(m){ return m+row; });
  };
})(themeSettingsHtml);
ACTIONS.r79HolPick = function(el, e, id){
  if(id==='auto') state.profile.holidayPick = null;
  else state.profile.holidayPick = {id:id, until:r79HolEnd(id)};
  persist('profile'); playTick(); renderView();
};

// ---------------- start up ----------------
setTimeout(function(){ try{ r79MyCats(); r79Recat(); r79SyncBills(); }catch(e){ console.error(e); } }, 1200);
setInterval(function(){ try{ r79SyncBills(); }catch(e){} }, 30*60000);
if(typeof ACTIONS.finSync==='function') ACTIONS.finSync = (function(base){ return async function(){ const r = await base.apply(this, arguments); try{ r79Recat(); r79SyncBills(); renderView(); }catch(e){} return r; }; })(ACTIONS.finSync);
