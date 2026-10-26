// ============ ROUND 49: SQUARE + STRIPE ============
// The payments you get come in on their own: connect Square and/or Stripe (Settings → Connections & Data), and
// every payment from the last 90 days lands in Finances. A payment from a client (matched by their email, their
// name or their business) is logged as that client's payment, so the month shows Received by itself. Anything
// it can't place waits at the top of Finances with a client picker. Zelle, cash and the rest stay a tap: Received.
// Read only: Operator never charges, refunds or sends anything. The tokens stay in the Operator app.
function payCfg(){ const s = state.settings; if(!s.payments || typeof s.payments!=='object') s.payments = {}; const p = s.payments; if(!p.seen || typeof p.seen!=='object') p.seen = {}; if(!Array.isArray(p.unmatched)) p.unmatched = []; return p; }
const PAY = {status:null, busy:false, err:{}};
function payStatus(){
  if(PAY.status || PAY._asking) return PAY.status;
  PAY._asking = true;
  fetchWithin(WAKE_HELPER+'pay/status', 5000).then(function(r){ return r && r.ok ? r.json() : null; }).then(function(j){ PAY._asking = false; PAY.status = j || {square:false, stripe:false, down:true}; if(ui.view==='settings' || (ui.view==='personal' && ui.personalTab==='finances')) renderView(); }).catch(function(){ PAY._asking = false; });
  return null;
}
async function payApi(which, path){
  const r = await fetchWithin(WAKE_HELPER+'pay/api?s='+which+'&p='+hexUtf8(path), 35000);
  let j = null; try{ j = r ? await r.json() : null; }catch(e){}
  if(!r || !r.ok) throw new Error((j && (j.error && (j.error.message || j.error) || (j.errors && j.errors[0] && j.errors[0].detail))) || (r ? (which==='square' ? 'Square' : 'Stripe')+' said no ('+r.status+')' : 'the Operator app didn’t answer'));
  return j;
}
function payNorm(t){ return String(t || '').toLowerCase().replace(/[^a-z0-9@.]+/g, ' ').trim(); }
// which client paid: email first, then the business or the person's name in the payer or the note
function payClientFor(p){
  const cs = arr(state.business.clients), em = payNorm(p.email), hay = payNorm([p.name, p.company, p.note].join(' '));
  if(em){ const c = cs.find(function(c){ return c.email && payNorm(c.email)===em; }); if(c) return c; }
  return cs.find(function(c){ const b = payNorm(c.business), n = payNorm(c.name); return (b && b.length > 2 && hay.indexOf(b) >= 0) || (n && n.length > 3 && hay.indexOf(n) >= 0); }) || null;
}
function payRecord(p){
  const cfg = payCfg(), f = state.finances; if(cfg.seen[p.id]) return 0;
  cfg.seen[p.id] = p.date;
  const c = payClientFor(p);
  if(c){ f.invoices.push({id:'pay_'+p.id, client:c.id, description:(p.src==='square' ? 'Square' : 'Stripe')+(p.note ? ': '+p.note : ' payment'), amount:p.amount, date:p.date, status:'paid', src:p.src, payId:p.id, attachmentName:null, attachmentData:null}); return 1; }
  cfg.unmatched.push(p); return 1;
}
async function paySquare(since){
  const out = [], cust = {};
  let cursor = '', n = 0;
  do{
    const j = await payApi('square', '/v2/payments?begin_time='+encodeURIComponent(new Date(since).toISOString())+'&sort_order=DESC&limit=100'+(cursor ? '&cursor='+encodeURIComponent(cursor) : ''));
    arr(j.payments).forEach(function(x){ if(x.status==='COMPLETED' && x.amount_money) out.push(x); });
    cursor = j.cursor || ''; n++;
  } while(cursor && n < 5);
  for(const x of out){ if(x.customer_id && !cust[x.customer_id]){ try{ const c = await payApi('square', '/v2/customers/'+encodeURIComponent(x.customer_id)); cust[x.customer_id] = c.customer || {}; }catch(e){ cust[x.customer_id] = {}; } } }
  return out.map(function(x){
    const c = cust[x.customer_id] || {}, refunded = x.refunded_money ? Number(x.refunded_money.amount) || 0 : 0;
    return {id:'sq_'+x.id, src:'square', amount:Math.round((Number(x.amount_money.amount) - refunded))/100, currency:x.amount_money.currency, date:String(x.created_at || '').slice(0, 10),
      email:x.buyer_email_address || c.email_address || '', name:[c.given_name, c.family_name].filter(Boolean).join(' '), company:c.company_name || '', note:x.note || ''};
  }).filter(function(p){ return p.amount > 0; });
}
async function payStripe(since){
  const out = [], cust = {};
  let after = '', n = 0, more = true;
  while(more && n < 5){
    const j = await payApi('stripe', '/v1/charges?limit=100&created[gte]='+Math.floor(since/1000)+(after ? '&starting_after='+encodeURIComponent(after) : ''));
    arr(j.data).forEach(function(x){ if(x.paid && x.status==='succeeded') out.push(x); });
    more = !!j.has_more && j.data && j.data.length; after = more ? j.data[j.data.length - 1].id : ''; n++;
  }
  for(const x of out){ const id = typeof x.customer==='string' ? x.customer : null; if(id && !cust[id]){ try{ cust[id] = await payApi('stripe', '/v1/customers/'+encodeURIComponent(id)); }catch(e){ cust[id] = {}; } } }
  return out.map(function(x){
    const c = (typeof x.customer==='string' ? cust[x.customer] : x.customer) || {}, bd = x.billing_details || {};
    return {id:'st_'+x.id, src:'stripe', amount:Math.round(Number(x.amount) - Number(x.amount_refunded || 0))/100, currency:String(x.currency || 'usd').toUpperCase(), date:new Date(x.created*1000).toISOString().slice(0, 10),
      email:bd.email || x.receipt_email || c.email || '', name:bd.name || c.name || '', company:(c.metadata && c.metadata.company) || '', note:x.description || ''};
  }).filter(function(p){ return p.amount > 0; });
}
async function paySync(quiet){
  const st = PAY.status; if(PAY.busy || !st || (!st.square && !st.stripe)) return;
  PAY.busy = true; PAY.err = {}; if(!quiet) renderView();
  const cfg = payCfg(), since = Date.now() - 90*86400000; let added = 0;
  for(const which of ['square', 'stripe']){
    if(!st[which]) continue;
    try{ const list = which==='square' ? await paySquare(since) : await payStripe(since); list.forEach(function(p){ added += payRecord(p); }); cfg[which+'At'] = Date.now(); }
    catch(e){ PAY.err[which] = e.message; }
  }
  PAY.busy = false; cfg.at = Date.now(); persist('settings'); persist('finances'); xpLast = null;
  if(added && !quiet) showToast(added+' payment'+(added===1 ? '' : 's')+' came in.', {icon:'&#127974;'});
  renderView();
}
// (on its own when Finances opens, at most every 30 minutes)
afterRenderHooks.push(function(){
  if(ui.view!=='personal' || ui.personalTab!=='finances') return;
  const st = payStatus(); if(!st || (!st.square && !st.stripe)) return;
  if(Date.now() - (payCfg().at || 0) > 30*60000 && !PAY.busy) setTimeout(function(){ paySync(true); }, 300);
});
ACTIONS.paySync = function(){ paySync(false); };
ACTIONS.payKeySave = function(el, e, which){
  const i = document.getElementById('payKey-'+which), v = i ? i.value.trim() : ''; if(!v){ if(i) i.focus(); return; }
  fetchWithin(WAKE_HELPER+'pay/key?s='+which+'&t='+hexUtf8(v), 6000).then(function(r){
    if(r && r.ok){ if(i) i.value = ''; PAY.status = null; showToast((which==='square' ? 'Square' : 'Stripe')+' is connected. Pulling your payments…', {icon:'&#128274;'}); payCfg().at = 0; setTimeout(function(){ payStatus(); setTimeout(function(){ paySync(false); }, 800); }, 200); }
    else showToast('Couldn’t save it. Is the Operator app running?', {icon:'&#9888;'});
  });
};
ACTIONS.payForget = function(el, e, which){ fetchWithin(WAKE_HELPER+'pay/forget?s='+which, 6000).then(function(){ PAY.status = null; payStatus(); renderView(); }); };
ACTIONS.payAssign = function(el, e, id){
  const sel = document.getElementById('payAs-'+id), cid = sel ? sel.value : ''; if(!cid) return;
  const cfg = payCfg(), p = cfg.unmatched.find(function(x){ return x.id===id; }); if(!p) return;
  const c = arr(state.business.clients).find(function(x){ return x.id===cid; });
  state.finances.invoices.push({id:'pay_'+p.id, client:cid, description:(p.src==='square' ? 'Square' : 'Stripe')+(p.note ? ': '+p.note : ' payment'), amount:p.amount, date:p.date, status:'paid', src:p.src, payId:p.id, attachmentName:null, attachmentData:null});
  // (and next time, the same payer goes to them by itself)
  if(c && p.email && !c.email){ c.email = p.email; persist('business'); }
  cfg.unmatched = cfg.unmatched.filter(function(x){ return x.id!==id; });
  persist('settings'); persist('finances'); xpLast = null; playPositive(); renderView();
};
ACTIONS.payNotClient = function(el, e, id){
  const cfg = payCfg(), p = cfg.unmatched.find(function(x){ return x.id===id; }); if(!p) return;
  state.finances.income.push({id:'pay_'+p.id, date:p.date, source:(p.name || p.company || (p.src==='square' ? 'Square' : 'Stripe'))+(p.note ? ' · '+p.note : ''), amount:p.amount, src:p.src});
  cfg.unmatched = cfg.unmatched.filter(function(x){ return x.id!==id; });
  persist('settings'); persist('finances'); renderView();
};
// ---- Finances: what came in, and what to place ----
function payStripHtml(){
  const st = payStatus(), cfg = payCfg();
  if(!st || (!st.square && !st.stripe)) return '';
  const names = [st.square ? 'Square' : '', st.stripe ? 'Stripe' : ''].filter(Boolean).join(' · ');
  const err = Object.keys(PAY.err).map(function(k){ return (k==='square' ? 'Square' : 'Stripe')+': '+PAY.err[k]; }).join(' · ');
  const cs = arr(state.business.clients).filter(function(c){ return clientStageActive(c.stage); });
  const un = cfg.unmatched.slice().sort(function(a, b){ return String(b.date).localeCompare(String(a.date)); });
  return '<div class="r49-pay"><div class="r49-ph"><span class="r49-pdot'+(err ? ' is-err' : '')+'"></span><b>'+names+'</b><span class="r49-pat">'+(PAY.busy ? 'Syncing…' : err ? escapeHtml(err) : cfg.at ? 'Synced '+ghlAgo(cfg.at) : '')+'</span><button class="btn btn-ghost btn-sm" data-action="paySync"'+(PAY.busy ? ' disabled' : '')+'>&#8635;</button></div>'+
    (un.length ? '<div class="r49-un">'+un.slice(0, 6).map(function(p){
      return '<div class="r49-u"><span class="r49-usrc is-'+p.src+'">'+(p.src==='square' ? 'Square' : 'Stripe')+'</span><span class="r49-uw"><b>'+escapeHtml(p.name || p.company || p.email || 'A payment')+'</b><small>'+fmtDateShort(p.date)+(p.note ? ' · '+escapeHtml(p.note.slice(0, 60)) : '')+'</small></span>'+
        '<b class="r49-ua">+'+r44Money(p.amount)+'</b><select class="input" id="payAs-'+escapeHtml(p.id)+'"><option value="">Which client?</option>'+cs.map(function(c){ return '<option value="'+c.id+'">'+escapeHtml(c.business || c.name)+'</option>'; }).join('')+'</select>'+
        '<button class="btn btn-sm" data-action="payAssign" data-id="'+escapeHtml(p.id)+'">Log it</button><button class="btn btn-ghost btn-sm" data-action="payNotClient" data-id="'+escapeHtml(p.id)+'">Not a client</button></div>';
    }).join('')+(un.length > 6 ? '<div class="r49-more">+'+(un.length - 6)+' more</div>' : '')+'</div>' : '')+
  '</div>';
}
renderPersonalFinances = (function(base){
  return function(){
    const h = base.apply(this, arguments), strip = payStripHtml();
    if(!strip) return h;
    const i = h.indexOf('<div class="r44-hub'); if(i >= 0) return h.slice(0, i)+strip+h.slice(i);
    return strip+h;
  };
})(renderPersonalFinances);
// ---- Settings → Connections & Data: Payments ----
function payCardHtml(){
  const st = payStatus() || {}, row = function(which, label, ph, help){
    const on = !!st[which];
    return '<div class="r49-sr"><div class="r49-sl"><b>'+label+'</b>'+(on ? '<span class="r49-on">Connected</span>' : '')+'</div>'+
      (on ? '<div class="row" style="gap:8px"><button class="btn btn-ghost btn-sm" data-action="paySync">Sync now</button><button class="btn btn-ghost btn-sm" data-action="payForget" data-id="'+which+'">Disconnect</button></div>'
          : '<div class="op-set-key"><input class="input" type="password" id="payKey-'+which+'" placeholder="'+ph+'" autocomplete="off"><button class="btn btn-sm btn-primary" data-action="payKeySave" data-id="'+which+'">Connect</button></div><small class="r49-help">'+help+'</small>')+'</div>';
  };
  return '<div class="card section r49-set"><div class="section-title">Payments</div>'+
    row('square', 'Square', 'Square access token', 'Square Developer → your app → Credentials → Production access token.')+
    row('stripe', 'Stripe', 'Stripe restricted key (rk_live_…)', 'Stripe → Developers → API keys → Create restricted key, with Read on Charges and Customers.')+
  '</div>';
}
renderSettings = (function(base){
  return function(){
    const h = base.apply(this, arguments);
    if(!/data-key="settings-system"/.test(h)) return h;
    return h.replace(/(<div class="settings-content tab-panel" data-key="settings-system">)/, '$1'+payCardHtml());
  };
})(renderSettings);

// ============ SOCIAL → ADS: every client at a glance, then theirs in detail ============
// The overview is a card per client (spend, leads, cost per lead, CTR, hook, campaigns running). Tap one and
// you're in their campaigns; tap a campaign for its ad sets and ads. Which ad account is whose is set on the
// client (their window → Ad accounts); an account nobody has yet shows once at the end with a small Link.
function adGroups(){
  const c = igCfg(), cache = c.znAdsCache; if(!cache) return null;
  const all = cache.camps.map(function(k){ return Object.assign({x:adNums(k.m)}, k); });
  const by = {}; all.forEach(function(k){ const id = adClientOf(k) || ('acct:'+(k.acct || '-')); (by[id] = by[id] || []).push(k); });
  return {all:all, by:by, accts:arr(cache.accts)};
}
function adStatsHtml(list, cur){
  const T = adTotals(list), hooks = list.filter(function(k){ return k.x.hook!=null; });
  return [['Spent', adsMoney(T.spend, cur)], ['Leads', T.leads ? sxNum(T.leads) : '–'], ['Per lead', T.leads ? adsMoney(T.spend/T.leads, cur) : '–'], ['CTR', T.imp ? sxPct(T.clicks/T.imp*100) : '–'], ['Hook', hooks.length ? sxPct(sxAvg(hooks, function(k){ return k.x.hook; })) : '–']]
    .map(function(x){ return '<div><b>'+x[1]+'</b><span>'+x[0]+'</span></div>'; }).join('');
}
sxAdsHtml = function(){
  if(!znAccs().length) return typeof adsSectionHtml==='function' && adsSectionHtml() ? adsSectionHtml() : '<div class="llx-empty">Your Meta ads come through Zernio: connect Zernio on Overview, then in Zernio connect Meta Ads.</div>';
  const st = znAdsSt(), c = igCfg(); znAdsLoad(false);
  const range = '<div class="sx-sort"><span>Last</span>'+[7, 30, 90].map(function(d){ return '<button class="'+(st.days===d ? 'is-on' : '')+'" data-action="znAdsDays" data-id="'+d+'">'+d+' days</button>'; }).join('')+'</div>';
  if(st.none) return range+'<div class="llx-empty">No Meta Ads connection in Zernio yet. In Zernio: Accounts → connect Meta Ads. Then refresh here.</div>';
  const cache = c.znAdsCache;
  if(!cache || cache.days!==st.days || cache.v!==2) return range+'<div class="gp-loading">'+(st.err ? '&#9888; '+escapeHtml(st.err) : 'Loading your campaigns…')+'</div>';
  const g = adGroups(), cur = (g.all[0] && g.all[0].currency) || 'USD';
  const client = function(id){ return arr(state.business.clients).find(function(x){ return x.id===id; }); };
  const aname = function(id){ const a = g.accts.find(function(z){ return z.id===id; }); return a ? a.name : 'Ad account'; };
  // ---- one client, in detail ----
  if(ui.adClient && g.by[ui.adClient]){
    const id = ui.adClient, list = g.by[id].slice().sort(function(a, b){ return b.x.spend - a.x.spend; }), cl = client(id);
    const name = cl ? (cl.business || cl.name) : aname(id.slice(5));
    return '<div class="r49-adh"><button class="r49-back" data-action="adClientOpen" data-id="">&larr; All clients</button>'+range+'</div>'+
      '<div class="r49-adt" style="--cc:'+(cl ? clientAccent(cl) : '#8A90A2')+'"><i></i><b>'+escapeHtml(name)+'</b><span>'+list.length+' campaign'+(list.length===1 ? '' : 's')+'</span></div>'+
      '<div class="sx-sum r49-sum">'+adStatsHtml(list, cur)+'</div>'+
      '<div class="r49-camps">'+list.map(function(k){
        const on = /active/i.test(String(k.status || '')), open = ui.adOpen===k.id;
        return '<div class="r49-camp'+(open ? ' is-open' : '')+'"><button class="r49-cr" data-action="adCampOpen" data-id="'+escapeHtml(k.id)+'">'+
          '<span class="r49-cn"><i class="'+(on ? 'is-on' : '')+'"></i><b>'+escapeHtml(k.name || 'Campaign')+'</b><small>'+escapeHtml(String(k.objective || k.status || '').replace(/^OUTCOME_/, '').toLowerCase())+'</small></span>'+
          '<span><b>'+adsMoney(k.x.spend, k.currency || cur)+'</b><small>spent</small></span><span><b>'+(k.x.leads!=null ? sxNum(k.x.leads) : k.x.results!=null ? sxNum(k.x.results) : '–')+'</b><small>'+(k.x.leads!=null ? 'leads' : 'results')+'</small></span>'+
          '<span><b>'+(k.x.cpr!=null ? adsMoney(k.x.cpr, k.currency || cur) : k.x.leads ? adsMoney(k.x.spend/k.x.leads, k.currency || cur) : '–')+'</b><small>each</small></span><span><b>'+sxPct(k.x.ctr)+'</b><small>CTR</small></span><span><b>'+sxPct(k.x.hook)+'</b><small>hook</small></span>'+
          '<span class="r49-chev">'+(open ? '&#9662;' : '&#9656;')+'</span></button>'+(open ? adSetsHtml(k) : '')+'</div>';
      }).join('')+'</div>';
  }
  // ---- every client ----
  const keys = Object.keys(g.by).sort(function(a, b){ const A = a.indexOf('acct:')===0, B = b.indexOf('acct:')===0; if(A!==B) return A ? 1 : -1; return adTotals(g.by[b]).spend - adTotals(g.by[a]).spend; });
  const cs = arr(state.business.clients).filter(function(x){ return clientStageActive(x.stage); });
  const cards = keys.map(function(id){
    const list = g.by[id], T = adTotals(list), cl = id.indexOf('acct:')===0 ? null : client(id), act = list.filter(function(k){ return /active/i.test(String(k.status || '')); }).length;
    const unl = !cl, aid = unl ? id.slice(5) : null;
    return '<div class="r49-ac'+(unl ? ' is-unlinked' : '')+'" style="--cc:'+(cl ? clientAccent(cl) : '#8A90A2')+'">'+
      '<button class="r49-acb" data-action="adClientOpen" data-id="'+escapeHtml(id)+'"><div class="r49-ach"><i></i><b>'+escapeHtml(cl ? (cl.business || cl.name) : aname(aid))+'</b><span>'+(act ? act+' running' : 'Nothing running')+'</span></div>'+
        '<div class="r49-acs"><div class="r49-acm"><b>'+adsMoney(T.spend, cur)+'</b><span>spent</span></div>'+
        '<div><b>'+(T.leads ? sxNum(T.leads) : '–')+'</b><span>leads</span></div><div><b>'+(T.leads ? adsMoney(T.spend/T.leads, cur) : '–')+'</b><span>per lead</span></div><div><b>'+(T.imp ? sxPct(T.clicks/T.imp*100) : '–')+'</b><span>CTR</span></div></div></button>'+
      (unl ? '<div class="r49-link"><span>Not linked to a client</span><select class="input" data-acctlink="'+escapeHtml(aid)+'"><option value="">Link to…</option>'+cs.map(function(x){ return '<option value="'+x.id+'">'+escapeHtml(x.business || x.name)+'</option>'; }).join('')+'</select></div>' : '')+
    '</div>';
  }).join('');
  return '<div class="r49-adh">'+range+'</div><div class="sx-sum">'+adStatsHtml(g.all, cur)+'</div>'+(keys.length ? '<div class="r49-acg">'+cards+'</div>' : '<div class="llx-empty">No campaigns in this range.</div>');
};
ACTIONS.adClientOpen = function(el, e, id){ ui.adClient = id || null; ui.adOpen = null; playTick(); renderView(); };
ACTIONS.adCampOpen = function(el, e, id){ ui.adOpen = ui.adOpen===id ? null : id; if(ui.adOpen) adSetsLoad(id); renderView(); };
// ad sets and ads, for one campaign, when you open it
const ADSETS = {};
async function adSetsLoad(id){
  if(ADSETS[id] && (ADSETS[id].sets || ADSETS[id].loading)) return;
  ADSETS[id] = {loading:true}; const st = znAdsSt(), to = todayStr(), from = addDays(to, -(st.days - 1));
  const tries = ['/v1/ads/campaigns/'+encodeURIComponent(id)+'/adsets?fromDate='+from+'&toDate='+to, '/v1/ads/adsets?campaignId='+encodeURIComponent(id)+'&fromDate='+from+'&toDate='+to];
  for(const p of tries){
    try{
      const r = await znApi(p), sets = arr(r.adSets || r.adsets || r.data);
      if(sets.length || r.adSets || r.adsets){
        ADSETS[id] = {sets:sets.map(function(s){ return {id:s.platformAdSetId || s.id, name:s.adSetName || s.name, status:s.status, x:adNums(s.metrics || {}), ads:arr(s.ads).map(function(a){ return {id:a.platformAdId || a.id, name:a.adName || a.name, x:adNums(a.metrics || {}), thumb:a.thumbnailUrl || ''}; })}; })};
        renderView(); return;
      }
    }catch(e){}
  }
  ADSETS[id] = {none:true}; renderView();
}
function adSetsHtml(k){
  const s = ADSETS[k.id] || {}, cur = k.currency || 'USD';
  if(s.loading || !(s.sets || s.none)) return '<div class="r49-sets"><div class="gp-loading">Loading ad sets…</div></div>';
  if(s.none) return '<div class="r49-sets"><div class="r49-none">Zernio doesn’t hand over this campaign’s ad sets and ads. Open it in Ads Manager for those.</div></div>';
  return '<div class="r49-sets">'+s.sets.map(function(a){
    return '<div class="r49-set"><div class="r49-sr2"><b>'+escapeHtml(a.name || 'Ad set')+'</b><span>'+adsMoney(a.x.spend, cur)+'</span><span>'+(a.x.leads!=null ? sxNum(a.x.leads)+' leads' : '–')+'</span><span>'+sxPct(a.x.ctr)+'</span></div>'+
      (a.ads.length ? '<div class="r49-ads">'+a.ads.map(function(ad){ return '<div class="r49-ad">'+(ad.thumb ? '<img src="'+escapeHtml(ad.thumb)+'" alt="">' : '<i></i>')+'<b>'+escapeHtml(ad.name || 'Ad')+'</b><span>'+adsMoney(ad.x.spend, cur)+'</span><span>'+(ad.x.leads!=null ? sxNum(ad.x.leads)+' leads' : '–')+'</span><span>'+sxPct(ad.x.hook)+' hook</span></div>'; }).join('')+'</div>' : '')+'</div>';
  }).join('')+'</div>';
}
// the client's window: which ad accounts are theirs
renderClientModal = (function(base){
  return function(){
    const h = base.apply(this, arguments), c = arr(state.business.clients).find(function(x){ return x.id===ui.showClientModal; });
    const cache = igCfg().znAdsCache; if(!h || !c || !cache || !arr(cache.accts).length) return h;
    const links = adAcctLinks();
    const row = '<div class="r49-cacc"><span>Ad accounts</span>'+arr(cache.accts).map(function(a){ const on = links[a.id]===c.id, other = links[a.id] && links[a.id]!==c.id;
      return '<button class="r49-cachip'+(on ? ' is-on' : '')+'" data-action="adAcctToggle" data-id="'+escapeHtml(a.id)+'|'+c.id+'"'+(other ? ' title="Linked to another client: tap to move it here"' : '')+'>'+(on ? '&#10003; ' : '')+escapeHtml(a.name)+'</button>'; }).join('')+'</div>';
    const i = h.indexOf('<div class="r48-ccol">');
    return i >= 0 ? h.slice(0, i)+row+h.slice(i) : row+h;
  };
})(renderClientModal);
ACTIONS.adAcctToggle = function(el, e, id){
  const p = String(id || '').split('|'), l = adAcctLinks();
  if(l[p[0]]===p[1]) delete l[p[0]]; else l[p[0]] = p[1];
  persist('settings'); playTick(); if(typeof renderClientModalInto==='function') renderClientModalInto(); renderView();
};
