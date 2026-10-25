// ============ ROUND 44 (October batch, build 4a): FINANCES, ONE MONEY HUB ============
// Personal → Finances: four numbers on top (cash, all debt, coming in and going out in the next 14 days),
// then one hub with a single tab bar: Upcoming · Debts · Accounts · Transactions. The payment calendar is a
// button that opens over the page. Client payments come from each client's retainer and billing day, debts
// from their minimum and due day, bills from what you add. Every client keeps its own color everywhere.

function r44Money(n, cents){ const v = Math.abs(Number(n)||0); return (n < 0 ? '−' : '')+'$'+(cents ? v.toLocaleString(undefined, {minimumFractionDigits:2, maximumFractionDigits:2}) : Math.round(v).toLocaleString()); }
function r44F(){ const f = state.finances; f.bills = arr(f.bills); f.done = f.done && typeof f.done==='object' ? f.done : {}; f.debts = arr(f.debts); f.payments = arr(f.payments); f.income = arr(f.income); f.invoices = arr(f.invoices); return f; }
function r44Ym(d){ return String(d).slice(0, 7); }
function r44DayIn(ym, day){ const p = ym.split('-').map(Number), last = new Date(p[0], p[1], 0).getDate(); return ym+'-'+pad2(Math.max(1, Math.min(last, Number(day)||1))); }
function r44DebtColor(d){ const r = Number(d.apr); return r >= 15 ? '#FF7A6B' : r > 0 ? '#E8A23D' : '#FF8FB1'; }
// ---- what's due: client payments, debt minimums and bills, for any range of days ----
function r44Events(from, to){
  const f = r44F(), out = [], yms = [];
  { const p = from.slice(0, 7).split('-').map(Number), q = to.slice(0, 7); let y = p[0], m = p[1]; for(let g = 0; g < 40; g++){ const ym = y+'-'+pad2(m); if(ym > q) break; yms.push(ym); m++; if(m > 12){ m = 1; y++; } } }
  yms.forEach(function(ym){
    arr(state.business && state.business.clients).forEach(function(c){
      if(!(Number(c.mrr) > 0) || !clientStageActive(c.stage)) return;
      const date = r44DayIn(ym, c.billingDay || 1); if(date < from || date > to) return;
      const key = 'c:'+c.id+':'+ym;
      const got = f.done[key] || f.invoices.some(function(i){ return i.client===c.id && monthKeyOf(i.date)===ym; });
      out.push({key:key, date:date, kind:'in', amount:Number(c.mrr), name:c.business || c.name || 'Client', sub:'Client payment', color:clientAccent(c), icon:'&#127974;', done:!!got, clientId:c.id});
    });
    f.debts.forEach(function(d){
      const min = Number(d.minPayment || d.minimum || 0); if(!(min > 0) || !(Number(d.balance) > 0) || !d.dueDay) return;
      const date = r44DayIn(ym, d.dueDay); if(date < from || date > to) return;
      const key = 'd:'+d.id+':'+ym;
      const paid = f.done[key] || f.payments.some(function(p){ return p.debtId===d.id && monthKeyOf(p.date)===ym; });
      out.push({key:key, date:date, kind:'out', amount:min, name:d.name, sub:'Minimum', color:r44DebtColor(d), icon:'&#128179;', done:!!paid, debtId:d.id});
    });
    f.bills.forEach(function(b){
      const date = r44DayIn(ym, b.dueDay); if(date < from || date > to) return;
      const key = 'b:'+b.id+':'+ym;
      out.push({key:key, date:date, kind:'out', amount:Number(b.amount)||0, name:b.name, sub:'Bill', color:'#E8A23D', icon:'&#129534;', done:!!f.done[key], billId:b.id});
    });
  });
  return out.sort(function(a, b){ return a.date.localeCompare(b.date) || (a.kind==='in' ? -1 : 1); });
}
function r44Accounts(){
  const b = typeof finBank==='function' ? finBank() : {};
  return arr(b.accounts).map(function(a){
    const n = (a.name+' '+(a.org||'')).toLowerCase(), credit = /credit|card|visa|amex|mastercard|discover/.test(n) || Number(a.balance) < 0, saving = /sav/.test(n);
    return Object.assign({}, a, {type:credit ? 'credit' : saving ? 'savings' : 'checking', color:credit ? '#FF7A6B' : saving ? '#3FBE8E' : '#5B9BFF'});
  });
}
const R44_CAT_COLORS = {food:'#FFB86B', groceries:'#B5E06A', transport:'#5B9BFF', subs:'#C58FFF', bills:'#E8A23D', shopping:'#FF8FB1', health:'#4FC3B8', other:'#8A90A2', income:'#3FBE8E'};
function r44Transactions(){
  const f = r44F(), list = [];
  (typeof finExpenses==='function' ? finExpenses() : []).forEach(function(e){ list.push({id:e.id, date:e.date, name:e.name, cat:e.cat || 'other', account:e.account || (e.src==='manual' ? 'Added by hand' : ''), amount:-Number(e.amount||0), kind:'exp'}); });
  f.income.forEach(function(i){ list.push({id:i.id, date:i.date, name:i.source || 'Income', cat:'income', account:'', amount:Number(i.amount||0), kind:'inc'}); });
  f.invoices.forEach(function(i){ const c = arr(state.business.clients).find(function(x){ return x.id===i.client; }); list.push({id:i.id, date:i.date, name:c ? (c.business || c.name) : 'Client payment', cat:'income', account:'', amount:Number(i.amount||0), kind:'inv', color:c ? clientAccent(c) : null}); });
  return list.sort(function(a, b){ return String(b.date).localeCompare(String(a.date)); });
}

// ---- the page ----
renderPersonalFinances = function(){
  const f = r44F(), today = todayStr(), to = addDays(today, 13), ev = r44Events(today, to).filter(function(e){ return !e.done; });
  const accts = r44Accounts(), cash = accts.filter(function(a){ return a.type!=='credit'; }).reduce(function(s, a){ return s + Number(a.balance||0); }, 0);
  const debt = f.debts.reduce(function(s, d){ return s + Math.max(0, Number(d.balance||0)); }, 0), mins = f.debts.reduce(function(s, d){ return s + (Number(d.balance) > 0 ? Number(d.minPayment||0) : 0); }, 0);
  const inN = ev.filter(function(e){ return e.kind==='in'; }), outN = ev.filter(function(e){ return e.kind==='out'; });
  const inSum = inN.reduce(function(s, e){ return s + e.amount; }, 0), outSum = outN.reduce(function(s, e){ return s + e.amount; }, 0);
  const tab = ['upcoming', 'debts', 'accounts', 'transactions'].indexOf(ui.finTab)>=0 ? ui.finTab : 'upcoming';
  const checked = (f.checkins || []).some(function(c){ const d = typeof c==='string' ? c : c.date; return d >= startOfWeekStr(today); });
  const tile = function(k, v, sub, cls){ return '<div class="card r44-tile"><span class="r44-k">'+k+'</span><b class="'+(cls||'')+'">'+v+'</b><small>'+sub+'</small></div>'; };
  const tabs = '<div class="r44-pills">'+[['upcoming', 'Upcoming'], ['debts', 'Debts'], ['accounts', 'Accounts'], ['transactions', 'Transactions']].map(function(t){ return '<button class="'+(tab===t[0] ? 'is-on' : '')+'" data-action="r44Tab" data-id="'+t[0]+'">'+t[1]+'</button>'; }).join('')+'</div>';
  const tools = tab==='upcoming' ? '<button class="r44-btn" data-action="r44CalOpen">&#9638; Calendar</button>'+(checked ? '<span class="r44-btn is-done">&#10003; Checked in this week</span>' : '<button class="r44-btn is-gold" data-action="r43MoneyCheckin">Weekly check-in <b>+'+XP_BOOK.personal.money+' XP</b></button>')
    : tab==='debts' ? '<button class="r44-btn" data-action="r44DebtSort">'+(ui.r44Sort==='small' ? 'Smallest first' : 'Highest rate first')+' &#9662;</button><button class="r44-btn" data-action="r44DebtEdit" data-id="">+ Debt</button>'
    : tab==='accounts' ? (accts.length ? '<button class="r44-btn" data-action="finSync">Sync now</button>' : '')
    : '<input class="input r44-search" id="r44Search" placeholder="Search" value="'+escapeHtml(ui.r44Q || '')+'"><button class="r44-btn" data-action="bankCsvPick">Import statement</button>';
  const body = tab==='upcoming' ? r44UpcomingHtml(ev, inSum - outSum) : tab==='debts' ? r44DebtsHtml() : tab==='accounts' ? r44AccountsHtml(accts) : r44TxHtml();
  return '<div class="r44">'+
    '<div class="r44-tiles">'+
      tile('Cash', accts.length ? r44Money(cash) : '–', accts.length ? escapeHtml(accts.filter(function(a){ return a.type!=='credit'; }).map(function(a){ return a.org || a.name; }).filter(function(v, i, s){ return s.indexOf(v)===i; }).join(' · ') || 'Your accounts') : 'Connect a bank in Accounts')+
      tile('All debt', debt ? r44Money(debt) : 'None', f.debts.length ? f.debts.filter(function(d){ return Number(d.balance) > 0; }).length+' debt'+(f.debts.length===1 ? '' : 's')+(mins ? ' · '+r44Money(mins)+' a month minimum' : '') : 'Debt-free', debt ? 'is-out' : 'is-in')+
      tile('Coming in · 14 days', inSum ? '+'+r44Money(inSum) : '$0', inN.length+' client payment'+(inN.length===1 ? '' : 's'), 'is-in')+
      tile('Going out · 14 days', outSum ? '−'+r44Money(outSum) : '$0', outN.length ? outN.length+' payment'+(outN.length===1 ? '' : 's') : 'Nothing due')+
    '</div>'+
    (typeof opReadMoney==='function' ? opReadMoney() : '')+
    '<section class="card r44-hub"><div class="r44-hub-h">'+tabs+'<div class="r44-tools">'+tools+'</div></div><div class="r44-body">'+body+'</div></section>'+
    r44SpentHtml()+
  '</div>';
};
function r44Row(e, withMark){
  const amt = (e.kind==='in' ? '+' : '−')+r44Money(e.amount);
  return '<div class="r44-row'+(e.done ? ' is-done' : '')+'" style="--c:'+e.color+'"><span class="r44-ic">'+e.icon+'</span><div class="r44-t"><b>'+escapeHtml(e.name)+'</b><small>'+escapeHtml(e.sub)+'</small></div>'+
    '<span class="r44-a '+(e.kind==='in' ? 'is-in' : 'is-out')+'">'+amt+'</span>'+
    (withMark ? (e.done ? '<span class="r44-mark is-done">&#10003; '+(e.kind==='in' ? 'Received' : 'Paid')+'</span>' : '<button class="r44-mark" data-action="r44Mark" data-id="'+escapeHtml(e.key)+'">'+(e.kind==='in' ? 'Received' : 'Paid')+'</button>') : '')+'</div>';
}
function r44UpcomingHtml(ev, net){
  if(!ev.length) return '<div class="r44-empty">Nothing coming in or going out in the next two weeks. Client retainers and billing days, debt minimums and due days fill this in.</div>';
  const by = {}; ev.forEach(function(e){ (by[e.date] = by[e.date] || []).push(e); });
  return Object.keys(by).sort().map(function(d){ const dt = new Date(d+'T12:00');
    return '<div class="r44-day"><div class="r44-dd"><b>'+dt.getDate()+'</b><small>'+dt.toLocaleDateString(undefined, {weekday:'short'})+' · '+dt.toLocaleDateString(undefined, {month:'short'})+'</small></div><div class="r44-rows">'+by[d].map(function(e){ return r44Row(e, true); }).join('')+'</div></div>'; }).join('')+
    '<div class="r44-net"><span>Net, next 14 days</span><b class="'+(net >= 0 ? 'is-in' : 'is-out')+'">'+(net >= 0 ? '+' : '−')+r44Money(net)+'</b></div>';
}
function r44DebtsHtml(){
  const f = r44F(); let ds = f.debts.slice();
  if(!ds.length) return '<div class="r44-empty">No debts. Add one with + Debt to track it down to zero.</div>';
  ds.sort(ui.r44Sort==='small' ? function(a, b){ return Number(a.balance) - Number(b.balance); } : function(a, b){ return (Number(b.apr)||0) - (Number(a.apr)||0); });
  const total = ds.reduce(function(s, d){ return s + Math.max(0, Number(d.balance||0)); }, 0);
  return '<div class="r44-dhead"><span>Debt</span><span>Balance</span><span>Rate</span><span>Minimum</span><span>Paid off</span><span></span></div>'+ds.map(function(d){
    const orig = Number(d.originalAmount || d.balance || 0), bal = Math.max(0, Number(d.balance||0)), pct = orig ? Math.round((1 - bal/orig)*100) : 0, min = Number(d.minPayment||0);
    const months = min > 0 && bal > 0 ? Math.ceil(bal/min) : null, free = months ? new Date(new Date().getFullYear(), new Date().getMonth() + months, 1).toLocaleDateString(undefined, {month:'short', year:'numeric'}) : null;
    const rc = r44DebtColor(d);
    return '<div class="r44-debt'+(bal <= 0 ? ' is-paid' : '')+'"><b><i style="background:'+rc+'"></i>'+escapeHtml(d.name)+'</b><span class="r44-bal">'+(bal > 0 ? r44Money(bal) : 'Paid off')+'</span>'+
      '<span>'+(d.apr!=null && d.apr!=='' ? '<span class="r44-rate" style="--c:'+rc+'">'+Number(d.apr)+'%</span>' : '<span class="r44-faint">–</span>')+'</span><span>'+(min ? r44Money(min)+' / mo' : '<span class="r44-faint">–</span>')+'</span>'+
      '<div><i class="r44-pb"><u style="width:'+pct+'%"></u></i><small><b>'+pct+'% paid</b>'+(free ? ' · free by '+free : '')+'</small></div>'+
      '<span class="r44-dacts"><button class="r44-mark" data-action="openLogPaymentModal" data-id="'+d.id+'">Pay</button><button class="r44-x" data-action="r44DebtEdit" data-id="'+d.id+'" title="Edit">&#9998;</button></span></div>';
  }).join('')+'<div class="r44-net"><span>Left to pay</span><b class="is-out">'+r44Money(total)+'</b></div>';
}
function r44AccountsHtml(accts){
  if(!accts.length){
    const h = typeof expensesHtml==='function' ? expensesHtml() : '', tpl = document.createElement('template'); tpl.innerHTML = h;
    const c = tpl.content.querySelector('.ex-connect'); return '<div class="r44-connect">'+(c ? c.outerHTML : '')+'</div>';
  }
  const sel = ui.r44Acct || null;
  return '<div class="r44-accts">'+accts.map(function(a){ return '<button class="r44-acct'+(sel===a.id ? ' is-on' : '')+'" style="--c:'+a.color+'" data-action="r44Acct" data-id="'+escapeHtml(a.id)+'"><span class="r44-at"><i></i>'+escapeHtml((a.org ? a.org+' · ' : '')+a.name)+'</span><b class="'+(a.type==='credit' ? 'is-out' : '')+'">'+r44Money(a.balance)+'</b><small>'+(a.at ? 'synced '+timeAgoShort(a.at) : '')+'</small></button>'; }).join('')+'</div>'+
    (sel ? '<div class="r44-hint">Transactions are filtered to this account. <button class="r43-link" data-action="r44Acct" data-id="">Show all</button></div>' : '');
}
function r44TxHtml(){
  const cat = ui.r44Cat || 'all', q = String(ui.r44Q || '').toLowerCase(), acct = ui.r44Acct ? r44Accounts().find(function(a){ return a.id===ui.r44Acct; }) : null;
  let list = r44Transactions();
  if(acct) list = list.filter(function(t){ return t.account===acct.name; });
  if(cat!=='all') list = list.filter(function(t){ return t.cat===cat; });
  if(q) list = list.filter(function(t){ return String(t.name).toLowerCase().indexOf(q)>=0; });
  const cats = ['all'].concat(EXP_CATS.map(function(c){ return c.id; }).filter(function(id){ return id!=='other'; }), ['income']);
  const chips = '<div class="r44-chips">'+cats.map(function(c){ const k = c==='all' ? {label:'All'} : c==='income' ? {label:'Income'} : expCat(c); return '<button class="'+(cat===c ? 'is-on' : '')+'" style="--c:'+(R44_CAT_COLORS[c] || '#E8A23D')+'" data-action="r44Cat" data-id="'+c+'">'+(c==='all' ? '' : '<i></i>')+escapeHtml(k.label)+'</button>'; }).join('')+'</div>';
  const n = ui.r44TxN || 25;
  return chips+(list.length ? list.slice(0, n).map(function(t){
    const k = t.cat==='income' ? {label:t.kind==='inv' ? 'Client payment' : 'Income'} : expCat(t.cat), c = t.color || R44_CAT_COLORS[t.cat] || '#8A90A2';
    return '<div class="r44-tx"><span class="r44-txn"><b>'+escapeHtml(t.name)+'</b> <span class="r44-faint">· '+escapeHtml(fmtDateShort(t.date))+'</span></span><span class="r44-cat" style="--c:'+c+'"><i></i>'+escapeHtml(k.label)+'</span><span class="r44-faint">'+escapeHtml(t.account || '')+'</span><span class="r44-a '+(t.amount > 0 ? 'is-in' : '')+'">'+(t.amount > 0 ? '+' : '−')+r44Money(t.amount, true)+'</span></div>';
  }).join('')+(list.length > n ? '<button class="r44-more" data-action="r44TxMore">Show more</button>' : '') : '<div class="r44-empty">Nothing here.</div>');
}
function r44SpentHtml(){
  const h = typeof expensesHtml==='function' ? expensesHtml() : '', tpl = document.createElement('template'); tpl.innerHTML = h;
  const top = tpl.content.querySelector('.ex-top'); if(!top) return '';
  return '<div class="section ex r44-spent"><div class="section-title">Expenses</div>'+top.outerHTML+'</div>';
}
ACTIONS.r44Tab = function(el, e, id){ ui.finTab = id; playTick(); renderView(); };
ACTIONS.r44Cat = function(el, e, id){ ui.r44Cat = id; ui.r44TxN = 25; renderView(); };
ACTIONS.r44Acct = function(el, e, id){ ui.r44Acct = id || null; if(id) ui.finTab = 'transactions'; renderView(); };
ACTIONS.r44TxMore = function(){ ui.r44TxN = (ui.r44TxN || 25) + 50; renderView(); };
ACTIONS.r44DebtSort = function(){ ui.r44Sort = ui.r44Sort==='small' ? 'rate' : 'small'; renderView(); };
document.addEventListener('input', function(e){ if(e.target && e.target.id==='r44Search'){ ui.r44Q = e.target.value; clearTimeout(ui._r44q); ui._r44q = setTimeout(function(){ const pos = e.target.selectionStart; renderView(); const i = document.getElementById('r44Search'); if(i){ i.focus(); try{ i.setSelectionRange(pos, pos); }catch(x){} } }, 220); } });
// Received / Paid: a client payment is logged as that month's payment, a debt minimum as a payment on the debt
ACTIONS.r44Mark = function(el, e, key){
  const f = r44F(), today = todayStr(), parts = String(key).split(':'), ev = r44Events(addDays(today, -40), addDays(today, 400)).find(function(x){ return x.key===key; });
  if(!ev) return;
  if(ev.kind==='in' && ev.clientId){ f.invoices.push({id:uid(), client:ev.clientId, description:monthName(parts[2])+' retainer', amount:ev.amount, date:today, status:'paid', attachmentName:null, attachmentData:null}); }
  else if(ev.debtId){ const d = f.debts.find(function(x){ return x.id===ev.debtId; }); if(d){ d.balance = Math.max(0, Number(d.balance) - ev.amount); f.payments.push({id:uid(), debtId:d.id, amount:ev.amount, date:today}); } }
  f.done[key] = today;
  persist('finances'); xpLast = null; playPositive(); renderView();
  showToast((ev.kind==='in' ? 'Received: ' : 'Paid: ')+ev.name+' '+r44Money(ev.amount)+'.', {icon:ev.kind==='in' ? '&#127974;' : '&#128179;', actionLabel:'Undo', actionAction:'r44Unmark', actionId:key});
};
ACTIONS.r44Unmark = function(el, e, key){
  const f = r44F(), ev = r44Events(addDays(todayStr(), -40), addDays(todayStr(), 400)).find(function(x){ return x.key===key; }), when = f.done[key];
  delete f.done[key];
  if(ev && ev.clientId){ const i = f.invoices.map(function(x){ return x; }).reverse().find(function(x){ return x.client===ev.clientId && x.date===when && Number(x.amount)===ev.amount; }); if(i) f.invoices = f.invoices.filter(function(x){ return x!==i; }); }
  if(ev && ev.debtId){ const p = f.payments.slice().reverse().find(function(x){ return x.debtId===ev.debtId && x.date===when && Number(x.amount)===ev.amount; }); if(p){ f.payments = f.payments.filter(function(x){ return x!==p; }); const d = f.debts.find(function(x){ return x.id===ev.debtId; }); if(d) d.balance = Number(d.balance) + ev.amount; } }
  persist('finances'); xpLast = null; if(typeof dismissToast==='function') dismissToast(); renderView();
};
// a debt: name, balance, rate, minimum and the day it's due
ACTIONS.r44DebtEdit = function(el, e, id){ ui.r44Debt = id || ''; r44DebtSheet(); };
function r44DebtSheet(){
  let o = document.getElementById('r44DebtOv');
  if(!o){ o = document.createElement('div'); o.id = 'r44DebtOv'; o.className = 'overlay r43-sheet-ov'; o.innerHTML = '<div class="card r43-sheet" id="r44DebtC"></div>'; document.body.appendChild(o); o.addEventListener('pointerdown', function(ev){ if(ev.target===o) o.classList.add('hidden'); }); }
  const d = r44F().debts.find(function(x){ return x.id===ui.r44Debt; }) || {};
  const fld = function(id, label, v, type, ph){ return '<label class="r44-fld"><span>'+label+'</span><input class="input" id="'+id+'" type="'+(type||'text')+'" value="'+escapeHtml(v==null ? '' : String(v))+'" placeholder="'+(ph||'')+'"></label>'; };
  document.getElementById('r44DebtC').innerHTML = '<button class="int-x hs-x" data-action="r44DebtClose">&#10005;</button><div class="r43-sh-k">'+(d.id ? 'Edit debt' : 'New debt')+'</div>'+
    fld('r44dName', 'Name', d.name, 'text', 'e.g. Visa card')+'<div class="r44-fr">'+fld('r44dBal', 'Balance', d.balance, 'number', '2140')+fld('r44dApr', 'Rate (APR %)', d.apr, 'number', '24.9')+'</div>'+
    '<div class="r44-fr">'+fld('r44dMin', 'Minimum a month', d.minPayment, 'number', '85')+fld('r44dDue', 'Due day', d.dueDay, 'number', '1–31')+'</div>'+
    '<div class="r44-sh-a">'+(d.id ? '<button class="btn btn-ghost r41-danger" data-action="r44DebtDelete">Delete</button>' : '')+'<span style="flex:1"></span><button class="btn btn-primary" data-action="r44DebtSave">Save</button></div>';
  o.classList.remove('hidden'); setTimeout(function(){ const i = document.getElementById('r44dName'); if(i && !d.id) i.focus(); }, 50);
}
ACTIONS.r44DebtClose = function(){ const o = document.getElementById('r44DebtOv'); if(o) o.classList.add('hidden'); };
ACTIONS.r44DebtSave = function(){
  const v = function(id){ const el = document.getElementById(id); return el ? el.value.trim() : ''; }, f = r44F();
  const name = v('r44dName'), bal = Number(v('r44dBal')); if(!name){ document.getElementById('r44dName').focus(); return; }
  let d = f.debts.find(function(x){ return x.id===ui.r44Debt; });
  if(!d){ d = {id:uid(), name:name, balance:bal||0, originalAmount:bal||0, creditor:'', description:''}; f.debts.push(d); }
  d.name = name; if(!isNaN(bal) && v('r44dBal')!==''){ if(Number(d.originalAmount||0) < bal) d.originalAmount = bal; d.balance = bal; }
  d.apr = v('r44dApr')==='' ? null : Number(v('r44dApr')); d.minPayment = v('r44dMin')==='' ? null : Number(v('r44dMin')); d.dueDay = v('r44dDue')==='' ? null : Math.max(1, Math.min(31, Math.round(Number(v('r44dDue')))));
  persist('finances'); xpLast = null; ACTIONS.r44DebtClose(); playPositive(); renderView();
};
ACTIONS.r44DebtDelete = async function(){
  const f = r44F(), d = f.debts.find(function(x){ return x.id===ui.r44Debt; }); if(!d) return;
  if(!(await uiConfirm({title:'Delete '+d.name+'?', text:'Its payments stay in your history.', ok:'Delete', danger:true}))) return;
  f.debts = f.debts.filter(function(x){ return x!==d; }); persist('finances'); ACTIONS.r44DebtClose(); renderView();
};

// ---- the payment calendar: a pop-up from the Calendar button ----
ACTIONS.r44CalOpen = function(){ ui.r44CalYm = ui.r44CalYm || thisMonthKey(); ui.r44CalDay = ui.r44CalDay || todayStr(); r44CalRender(); };
ACTIONS.r44CalClose = function(){ const o = document.getElementById('r44CalOv'); if(o) o.classList.add('hidden'); };
ACTIONS.r44CalMove = function(el, e, id){ const p = ui.r44CalYm.split('-').map(Number), d = new Date(p[0], p[1] - 1 + Number(id), 1); ui.r44CalYm = d.getFullYear()+'-'+pad2(d.getMonth() + 1); ui.r44CalDay = ui.r44CalYm===thisMonthKey() ? todayStr() : ui.r44CalYm+'-01'; r44CalRender(); };
ACTIONS.r44CalDay = function(el, e, id){ ui.r44CalDay = id; r44CalRender(); };
function r44CalRender(){
  let o = document.getElementById('r44CalOv');
  if(!o){ o = document.createElement('div'); o.id = 'r44CalOv'; o.className = 'overlay r44-cal-ov'; o.innerHTML = '<div class="card r44-cal" id="r44CalC" role="dialog" aria-label="Payment calendar"></div>'; document.body.appendChild(o); o.addEventListener('pointerdown', function(ev){ if(ev.target===o) ACTIONS.r44CalClose(); }); }
  const ym = ui.r44CalYm, first = ym+'-01', p = ym.split('-').map(Number), last = new Date(p[0], p[1], 0).getDate(), lastD = ym+'-'+pad2(last);
  const ev = r44Events(first, lastD), by = {}; ev.forEach(function(e){ (by[e.date] = by[e.date] || []).push(e); });
  const lead = (new Date(first+'T12:00').getDay() + 6) % 7, today = todayStr(), sel = ui.r44CalDay && ui.r44CalDay.slice(0, 7)===ym ? ui.r44CalDay : first;
  let cells = ''; for(let i = 0; i < lead; i++) cells += '<span class="r44-cd is-e"></span>';
  for(let d = 1; d <= last; d++){
    const ds = ym+'-'+pad2(d), es = by[ds] || [], inDay = es.some(function(e){ return e.kind==='in'; });
    cells += '<button class="r44-cd'+(es.length ? ' has' : '')+(inDay ? ' in' : '')+(ds===sel ? ' sel' : '')+(ds===today ? ' today' : '')+'" data-action="r44CalDay" data-id="'+ds+'"><b>'+d+'</b>'+
      es.slice(0, 3).map(function(e){ return '<span class="r44-p'+(e.done ? ' is-done' : '')+'" style="--c:'+e.color+'">'+escapeHtml(String(e.name).split(' ')[0])+' '+(e.kind==='in' ? '+' : '−')+(e.amount >= 1000 ? (Math.round(e.amount/100)/10)+'k' : Math.round(e.amount))+'</span>'; }).join('')+(es.length > 3 ? '<span class="r44-more-d">+'+(es.length - 3)+'</span>' : '')+'</button>';
  }
  const dayEv = by[sel] || [], din = dayEv.filter(function(e){ return e.kind==='in'; }).reduce(function(s, e){ return s + e.amount; }, 0), dout = dayEv.filter(function(e){ return e.kind==='out'; }).reduce(function(s, e){ return s + e.amount; }, 0);
  const mIn = ev.filter(function(e){ return e.kind==='in'; }).reduce(function(s, e){ return s + e.amount; }, 0), mOut = ev.filter(function(e){ return e.kind==='out'; }).reduce(function(s, e){ return s + e.amount; }, 0);
  const seen = {}, legend = ev.filter(function(e){ const k = e.clientId ? e.name : e.kind==='out' ? (e.debtId ? 'Debts' : 'Bills') : e.name; if(seen[k]) return false; seen[k] = 1; e._lg = k; return true; });
  const sd = new Date(sel+'T12:00');
  document.getElementById('r44CalC').innerHTML =
    '<div class="r44-cal-m"><div class="r44-cal-h"><div><b>'+escapeHtml(new Date(first+'T12:00').toLocaleDateString(undefined, {month:'long', year:p[0]!==new Date().getFullYear() ? 'numeric' : undefined}))+'</b>'+
      '<small><span class="r44-sd">'+sd.toLocaleDateString(undefined, {weekday:'short'})+' '+sd.getDate()+'</span>'+(din ? '<span class="is-in">+'+r44Money(din)+' in</span>' : '')+(din && dout ? ' <span class="r44-faint">·</span> ' : '')+(dout ? '<span class="is-out">−'+r44Money(dout)+' out</span>' : '')+(din || dout ? '' : '<span class="r44-faint">nothing due</span>')+'</small></div>'+
      '<div class="r44-cal-nav"><button class="r44-btn" data-action="r44CalMove" data-id="-1" aria-label="Previous month">&#8249;</button><button class="r44-btn" data-action="r44CalMove" data-id="1" aria-label="Next month">&#8250;</button><button class="r44-btn" data-action="r44CalClose" aria-label="Close">&#10005;</button></div></div>'+
      '<div class="r44-cal-g">'+['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'].map(function(w){ return '<span class="r44-wd">'+w+'</span>'; }).join('')+cells+'</div></div>'+
    '<div class="r44-cal-s"><div class="r44-rows">'+(dayEv.length ? dayEv.map(function(e){ return r44Row(e, true); }).join('') : '<div class="r44-empty">Nothing on this day.</div>')+'</div>'+
      '<div class="r44-cal-t"><span class="r44-k">This month</span><div><span>In</span><b class="is-in">+'+r44Money(mIn)+'</b></div><div><span>Out</span><b class="is-out">−'+r44Money(mOut)+'</b></div>'+
      '<i class="r44-netbar"><u style="width:'+(mIn + mOut ? mIn/(mIn + mOut)*100 : 0).toFixed(1)+'%"></u></i>'+
      '<div class="r44-leg">'+legend.map(function(e){ return '<span style="--c:'+e.color+'"><i></i>'+escapeHtml(e._lg)+'</span>'; }).join('')+'</div></div></div>';
  o.classList.remove('hidden');
}
// the calendar keeps up when something's marked
ACTIONS.r44Mark = (function(base){ return function(){ const r = base.apply(this, arguments); const o = document.getElementById('r44CalOv'); if(o && !o.classList.contains('hidden')) r44CalRender(); return r; }; })(ACTIONS.r44Mark);
