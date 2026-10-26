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
