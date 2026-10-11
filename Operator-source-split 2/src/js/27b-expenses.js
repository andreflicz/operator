// ============ EXPENSES, AND YOUR BANK, LIVE ============
// Personal → Finances gets Expenses: what went out this month, by kind, and every one of them. They come
// in by themselves once your bank is connected (SimpleFIN Bridge: you connect your banks there, paste the
// setup token here once, and the Operator app keeps the private access on this Mac, never in Operator's
// data). You can add one by hand too. Money coming in stays under Income.
const EXP_CATS = [
  {id:'food', label:'Food', icon:'&#127828;', re:/restaurant|cafe|coffee|starbucks|dunkin|mcdonald|chipotle|burger|pizza|taco|wendy|subway|doordash|uber ?eats|grubhub|postmates|kitchen|grill|bar\b|deli|bakery|chick-fil|panera|sushi/i},
  {id:'groceries', label:'Groceries', icon:'&#128722;', re:/grocery|whole foods|trader joe|kroger|safeway|aldi|publix|wegmans|costco|walmart|target|h-e-b|heb\b|market/i},
  {id:'transport', label:'Transport', icon:'&#128663;', re:/uber|lyft|shell|chevron|exxon|mobil|bp\b|gas|fuel|parking|toll|transit|mta|metro|airline|delta|united|american air|southwest/i},
  {id:'subs', label:'Subscriptions', icon:'&#128257;', re:/netflix|spotify|apple\.com|icloud|google|youtube|hulu|disney|amazon prime|adobe|notion|openai|anthropic|chatgpt|canva|gohighlevel|highlevel|zoom|slack|subscription|patreon/i},
  {id:'bills', label:'Bills', icon:'&#128161;', re:/rent|mortgage|electric|utility|water|internet|comcast|xfinity|verizon|at&t|t-mobile|insurance|geico|progressive|state farm|loan|payment to/i},
  {id:'shopping', label:'Shopping', icon:'&#128717;', re:/amazon|amzn|ebay|etsy|best buy|apple store|nike|zara|h&m|shop|store/i},
  {id:'health', label:'Health', icon:'&#128170;', re:/gym|fitness|pharmacy|cvs|walgreens|doctor|dental|clinic|equinox|planet fitness/i},
  {id:'other', label:'Other', icon:'&#128184;', re:null}
];
function expCat(id){ return EXP_CATS.find(function(c){ return c.id===id; }) || EXP_CATS[EXP_CATS.length-1]; }
function expGuessCat(text){ const t = String(text||''); const c = EXP_CATS.find(function(c){ return c.re && c.re.test(t); }); return c ? c.id : 'other'; }
function finBank(){ const f = state.finances; if(!f.bank || typeof f.bank!=='object') f.bank = {}; return f.bank; }
function finExpenses(){ const f = state.finances; if(!Array.isArray(f.expenses)) f.expenses = []; return f.expenses; }
// ---- the bank ----
ACTIONS.finConnect = async function(){
  const i = document.getElementById('finToken'), t = i ? i.value.trim() : '';
  if(!t){ if(i) i.focus(); return; }
  const b = finBank(); b.busy = true; b.err = null; renderView();
  const r = await fetchWithin(WAKE_HELPER+'fin/claim?t='+hexUtf8(t), 30000);
  let j = null; try{ j = r ? await r.json() : null; }catch(e){}
  b.busy = false;
  if(!r){ b.err = 'The Operator app isn’t answering. Open Operator from its icon and try again.'; renderView(); return; }
  if(!r.ok || !j || !j.ok){ b.err = (j && j.error) || 'SimpleFIN didn’t take that token. Make a new one and paste it right away (each works once).'; renderView(); return; }
  b.connected = true; b.lastSync = 0; persist('finances'); showToast('Your bank is connected. Pulling in the last 60 days…', {icon:'&#127974;'});
  finSync(true);
};
ACTIONS.finSync = function(){ finSync(true); };
ACTIONS.finDisconnect = async function(el){
  if(!armed.has('findis')){ armed.add('findis'); el.textContent = 'Sure? Tap again'; setTimeout(function(){ armed.delete('findis'); }, 3000); return; }
  armed.delete('findis');
  await fetchWithin(WAKE_HELPER+'fin/forget', 6000);
  const b = finBank(); b.connected = false; b.accounts = []; b.lastSync = 0; persist('finances'); renderView();
};
async function finSync(loud){
  const b = finBank(); if(b.busy) return;
  b.busy = true; if(loud) renderView();
  // first time: 60 days back; after that, a week of overlap so late-posting charges are caught
  const since = Math.floor((b.lastSync ? b.lastSync - 7*86400000 : Date.now() - 60*86400000)/1000);
  const r = await fetchWithin(WAKE_HELPER+'fin/accounts?s='+since, 50000);
  let j = null; try{ j = r ? await r.json() : null; }catch(e){}
  b.busy = false;
  if(!r || !r.ok || !j || !Array.isArray(j.accounts)){
    if(r && r.status===401){ b.connected = false; }
    b.err = !r ? 'The Operator app isn’t answering.' : r.status===401 ? 'Not connected.' : 'Couldn’t reach your bank just now ('+((j && (j.error || (arr(j.errors)[0]))) || r.status)+').';
    persist('finances'); if(loud) renderView(); return;
  }
  b.err = arr(j.errors).length ? String(j.errors[0]) : null;
  b.connected = true;
  b.accounts = j.accounts.map(function(a){ return {id:a.id, name:a.name, org:(a.org && (a.org.name || a.org.domain)) || '', balance:Number(a.balance), at:Number(a['balance-date'])*1000 || Date.now()}; });
  const ex = finExpenses(), have = {}; ex.forEach(function(e){ if(e.txId) have[e.txId] = e; });
  let added = 0;
  j.accounts.forEach(function(a){
    arr(a.transactions).forEach(function(t){
      const amt = Number(t.amount); if(!(amt < 0) || t.pending) return;
      const id = a.id+':'+t.id; if(have[id]) return;
      const name = String(t.payee || t.description || t.memo || 'Card purchase').replace(/\s+/g, ' ').trim().slice(0, 80);
      const when = Number(t.transacted_at || t.posted) * 1000;
      ex.push({id:uid(), txId:id, date:todayStr(new Date(when || Date.now())), amount:Math.round(-amt*100)/100, name:name, cat:expGuessCat(name+' '+(t.description||'')), src:'bank', account:a.name});
      added++;
    });
  });
  b.lastSync = Date.now();
  persist('finances');
  if(loud || added) renderView();
  if(loud) showToast(added ? added+' new expense'+(added===1?'':'s')+' from your bank.' : 'Up to date with your bank.', {icon:'&#127974;'});
}
// on its own: when Finances opens (if it's been a few hours) and every few hours while the app is open
afterRenderHooks.push(function(){
  const b = state.finances && finBank(); if(!b || !b.connected || b.busy) return;
  if(ui.view==='personal' && ui.personalTab==='finances' && Date.now() - (b.lastSync||0) > 3*3600000) finSync(false);
});
setInterval(function(){ const b = state && state.finances && finBank(); if(b && b.connected && !b.busy && Date.now() - (b.lastSync||0) > 6*3600000) finSync(false); }, 15*60000);
// ---- by hand ----
ACTIONS.expAdd = function(){
  const v = function(id){ const el = document.getElementById(id); return el ? el.value.trim() : ''; };
  const name = v('expName'), amt = Number(v('expAmount'));
  if(!name || !(amt > 0)){ const el = document.getElementById(!name ? 'expName' : 'expAmount'); if(el) el.focus(); return; }
  finExpenses().push({id:uid(), date:v('expDate') || todayStr(), amount:Math.round(amt*100)/100, name:name.slice(0, 80), cat:v('expCat') || expGuessCat(name), src:'manual'});
  ui.forms.expense = false; persist('finances'); playTick(); renderView();
};
ACTIONS.expCat = function(el, e, id){
  const x = finExpenses().find(function(z){ return z.id===id; }); if(!x) return;
  const i = EXP_CATS.findIndex(function(c){ return c.id===x.cat; });
  x.cat = EXP_CATS[(i + 1) % EXP_CATS.length].id; persist('finances'); renderView();
};
ACTIONS.expDel = function(el, e, id){ state.finances.expenses = finExpenses().filter(function(z){ return z.id!==id; }); persist('finances'); renderView(); };
// ---- the section ----
function expensesHtml(){
  const b = finBank(), ex = finExpenses(), mk = thisMonthKey();
  const month = ex.filter(function(e){ return monthKeyOf(e.date)===mk; });
  const total = month.reduce(function(a, e){ return a + e.amount; }, 0);
  const last = ex.filter(function(e){ return monthKeyOf(e.date)===monthKeyOf(addDays(todayStr().slice(0, 8)+'01', -1)); }).reduce(function(a, e){ return a + e.amount; }, 0);
  const by = {}; month.forEach(function(e){ by[e.cat] = (by[e.cat]||0) + e.amount; });
  const cats = Object.keys(by).sort(function(a, c){ return by[c] - by[a]; }), top = Math.max(1, ...cats.map(function(c){ return by[c]; }));
  const money2 = function(n){ return '$'+Math.round(n).toLocaleString(); };
  const bankBit = b.connected
    ? '<div class="ex-bank"><span class="ex-dot'+(b.err ? ' is-err' : '')+'"></span><span>'+(b.busy ? 'Syncing…' : b.lastSync ? 'Synced '+timeAgoShort(b.lastSync) : 'Connected')+(b.err ? ' · '+escapeHtml(b.err) : '')+'</span>'+
        '<button class="ex-link" data-action="finSync"'+(b.busy ? ' disabled' : '')+'>Sync now</button><button class="ex-link is-quiet" data-action="finDisconnect">Disconnect</button></div>'+
      (arr(b.accounts).length ? '<div class="ex-accts">'+b.accounts.map(function(a){ return '<span><b>'+money2(a.balance)+'</b><small>'+escapeHtml(a.name)+(a.org ? ' · '+escapeHtml(a.org) : '')+'</small></span>'; }).join('')+'</div>' : '')
    : '<div class="ex-connect"><div class="ex-connect-t">&#127974; Connect your bank</div>'+
        '<div class="ex-connect-s"><b>Free:</b> download a CSV statement from your bank’s website. When it lands in Downloads, Operator adds the purchases by itself (or use Import statement).</div>'+
        '<div class="ex-connect-s">Or live, with balances: <b>SimpleFIN Bridge</b> (about $15 a year). Connect your banks at bridge.simplefin.org, make a setup token, paste it here. The access stays on this Mac.</div>'+
        '<div class="ex-connect-r"><input class="input" id="finToken" placeholder="Paste your SimpleFIN setup token"><button class="btn btn-primary" data-action="finConnect"'+(b.busy ? ' disabled' : '')+'>'+(b.busy ? 'Connecting…' : 'Connect')+'</button></div>'+
        (b.err ? '<div class="ex-err">'+escapeHtml(b.err)+'</div>' : '')+'</div>';
  return '<div class="section ex">'+
    '<div class="section-title">Expenses<span class="ex-hbtns"><button class="btn btn-sm btn-ghost" data-action="bankCsvPick" title="A CSV statement from your bank’s website">Import statement</button><button class="btn btn-sm" data-action="toggleForm" data-form="expense">'+(ui.forms.expense ? 'Close' : '+ Add expense')+'</button></span></div>'+
    (ui.forms.expense ? '<div class="card ex-form"><input class="input" id="expName" placeholder="What was it?"><input class="input" type="number" step="0.01" id="expAmount" placeholder="$">'+
      '<select class="input" id="expCat"><option value="">Kind (auto)</option>'+EXP_CATS.map(function(c){ return '<option value="'+c.id+'">'+c.label+'</option>'; }).join('')+'</select>'+
      '<input class="input" type="date" id="expDate" value="'+todayStr()+'"><button class="btn btn-good" data-action="expAdd">Add</button></div>' : '')+
    '<div class="ex-top card">'+
      '<div class="ex-total"><small>Spent this month</small><b>'+money2(total)+'</b>'+(last ? '<span class="'+(total > last ? 'is-up' : 'is-down')+'">'+money2(last)+' last month</span>' : '')+'</div>'+
      '<div class="ex-cats">'+(cats.length ? cats.map(function(c){ const k = expCat(c); return '<div class="ex-c"><span>'+k.icon+' '+k.label+'</span><i><u style="width:'+(by[c]/top*100).toFixed(1)+'%"></u></i><b>'+money2(by[c])+'</b></div>'; }).join('') : '<div class="kpi-sub">Nothing yet this month.</div>')+'</div>'+
    '</div>'+
    bankBit+
    (ex.length ? '<div class="ex-list">'+ex.slice().sort(function(a, c){ return c.date.localeCompare(a.date); }).slice(0, ui.expAll ? 300 : 12).map(function(e){ const k = expCat(e.cat);
      return '<div class="ex-row"><button class="ex-ic" data-action="expCat" data-id="'+e.id+'" title="'+k.label+' (tap to change)">'+k.icon+'</button><span class="ex-n">'+escapeHtml(e.name)+'<small>'+fmtDateShort(e.date)+(e.src==='bank' ? ' · '+escapeHtml(e.account || 'bank') : e.src==='csv' ? ' · statement' : '')+'</small></span><b>'+'$'+e.amount.toFixed(2)+'</b><button class="ex-x" data-action="expDel" data-id="'+e.id+'" title="Remove">&#10005;</button></div>'; }).join('')+
      (ex.length > 12 ? '<button class="ex-more" data-action="expAllToggle">'+(ui.expAll ? 'Show fewer' : 'Show all '+ex.length)+'</button>' : '')+'</div>' : '')+
  '</div>';
}
ACTIONS.expAllToggle = function(){ ui.expAll = !ui.expAll; renderView(); };
function timeAgoShort(ts){ const m = Math.round((Date.now() - ts)/60000); return m < 1 ? 'just now' : m < 60 ? m+'m ago' : m < 1440 ? Math.round(m/60)+'h ago' : Math.round(m/1440)+'d ago'; }
