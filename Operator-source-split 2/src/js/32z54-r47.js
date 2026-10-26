// ============ ROUND 47: SOCIAL — ADS BY CLIENT / BY AD ACCOUNT; NO GHL TABS ============
//  • Ads reads every ad account you have in Zernio (not just the first), and every campaign knows its account.
//  • Group them By client or By ad account, and narrow to one with the chips on top. A whole ad account can be
//    given to a client in one go (most clients' ads run in their own account); a single campaign can still be
//    set to someone else.
//  • GoHighLevel's Chats and Contacts are gone from Social.

// ---- every ad account ----
znAdsLoad = async function(force){
  const st = znAdsSt(), c = igCfg(); if(st.loading || !znAccs().length) return;
  if(c.znAdsCache && c.znAdsCache.v===2 && c.znAdsCache.days===st.days && !force && Date.now() - c.znAdsCache.at < 30*60000) return;
  st.loading = true; st.err = null; st.none = false; renderView();
  try{
    const accs = await znApi('/v1/accounts?category=ads');
    const conns = arr(accs.accounts).filter(function(x){ return /meta|facebook|instagram/i.test(String(x.platform || '')); });
    const list = conns.length ? conns : arr(accs.accounts);
    if(!list.length){ st.none = true; return; }
    const to = todayStr(), from = addDays(to, -(st.days - 1)), camps = [], accts = {};
    for(const conn of list){
      let r = null; try{ r = await znApi('/v1/ads/campaigns?accountId='+encodeURIComponent(conn._id)+'&fromDate='+from+'&toDate='+to+'&limit=100&source=all'); }catch(e){ if(list.length===1) throw e; continue; }
      const connName = conn.username || conn.displayName || conn.name || 'Meta Ads';
      arr(r && r.campaigns).forEach(function(k){
        const aid = String(k.adAccountId || k.platformAdAccountId || k.accountId || (k.adAccount && k.adAccount.id) || conn._id);
        const an = k.adAccountName || (k.adAccount && k.adAccount.name) || connName;
        if(!accts[aid]) accts[aid] = {id:aid, name:an, conn:conn._id};
        camps.push({id:k.platformCampaignId || k.id, name:k.campaignName || k.name, status:k.status || k.platformCampaignStatus, currency:k.currency, objective:k.platformObjective, m:k.metrics || {}, acct:aid});
      });
    }
    c.znAdsCache = {v:2, at:Date.now(), days:st.days, from:from, to:to, conn:{id:list[0]._id, name:list[0].username || list[0].displayName || 'Meta Ads'}, accts:Object.keys(accts).map(function(k){ return accts[k]; }), camps:camps};
    persist('settings');
  }catch(e){ st.err = e.message; }
  finally { st.loading = false; renderView(); }
};
function adAcctLinks(){ const c = igCfg(); if(!c.adAcctLinks || typeof c.adAcctLinks!=='object') c.adAcctLinks = {}; return c.adAcctLinks; }
// a campaign's client: its own setting first, then its ad account's
function adClientOf(k){ const l = adLinks(); if(l[k.id]) return l[k.id]===' none' ? null : l[k.id]; return k.acct ? adAcctLinks()[k.acct] || null : null; }
clientAdTotals = function(cid){
  const c = igCfg(); if(!c.znAdsCache) return null;
  const mine = c.znAdsCache.camps.filter(function(k){ return adClientOf(k)===cid; }); if(!mine.length) return null;
  const t = {n:mine.length, spend:0, leads:0, results:0, currency:mine[0].currency, days:c.znAdsCache.days};
  mine.forEach(function(k){ const x = adNums(k.m); t.spend += x.spend; t.leads += x.leads || 0; t.results += x.results || 0; });
  return t;
};
document.addEventListener('change', function(e){
  const t = e.target; if(!t || !t.dataset || !t.dataset.acctlink) return;
  const l = adAcctLinks(); if(t.value) l[t.dataset.acctlink] = t.value; else delete l[t.dataset.acctlink];
  persist('settings'); playTick(); renderView();
});
ACTIONS.adGroupBy = function(el, e, id){ ui.adGroup = id==='acct' ? 'acct' : 'client'; ui.adPick = ''; renderView(); };
ACTIONS.adPick = function(el, e, id){ ui.adPick = ui.adPick===id ? '' : id; renderView(); };
function adTotals(list){
  const T = {spend:0, leads:0, results:0, imp:0, clicks:0, n:list.length, cur:(list[0] && list[0].currency) || 'USD'};
  list.forEach(function(k){ const x = k.x || adNums(k.m); T.spend += x.spend; T.leads += x.leads || 0; T.results += x.results || 0; T.imp += x.impressions; T.clicks += x.clicks; });
  return T;
}
sxAdsHtml = function(){
  if(!znAccs().length) return typeof adsSectionHtml==='function' && adsSectionHtml() ? adsSectionHtml() : '<div class="llx-empty">Your Meta ads come through Zernio: connect Zernio on Overview, then in Zernio connect Meta Ads.</div>';
  const st = znAdsSt(), c = igCfg(); znAdsLoad(false);
  const range = '<div class="sx-sort"><span>Last</span>'+[7, 30, 90].map(function(d){ return '<button class="'+(st.days===d ? 'is-on' : '')+'" data-action="znAdsDays" data-id="'+d+'">'+d+' days</button>'; }).join('')+'</div>';
  if(st.none) return range+'<div class="llx-empty">No Meta Ads connection in Zernio yet. In Zernio: Accounts → connect Meta Ads. Then refresh here.</div>';
  const cache = c.znAdsCache;
  if(!cache || cache.days!==st.days || cache.v!==2) return range+'<div class="gp-loading">'+(st.err ? '&#9888; '+escapeHtml(st.err) : 'Loading your campaigns…')+'</div>';
  const cs = arr(state.business.clients).filter(function(x){ return clientStageActive(x.stage); }), links = adLinks(), alinks = adAcctLinks();
  const cname = function(id){ const x = arr(state.business.clients).find(function(z){ return z.id===id; }); return x ? (x.business || x.name) : 'Client'; };
  const ccolor = function(id){ const x = arr(state.business.clients).find(function(z){ return z.id===id; }); return (x && x.color) || '#8A90A2'; };
  const accts = arr(cache.accts), aname = function(id){ const a = accts.find(function(z){ return z.id===id; }); return a ? a.name : 'Ad account'; };
  const all = cache.camps.map(function(k){ return Object.assign({x:adNums(k.m)}, k); }).sort(function(a, b){ return b.x.spend - a.x.spend; });
  const by = ui.adGroup==='acct' ? 'acct' : 'client';
  // groups
  const groups = {}, order = [];
  all.forEach(function(k){ const key = by==='acct' ? (k.acct || '-') : (adClientOf(k) || '-'); if(!groups[key]){ groups[key] = []; order.push(key); } groups[key].push(k); });
  order.sort(function(a, b){ if(a==='-') return 1; if(b==='-') return -1; return adTotals(groups[b]).spend - adTotals(groups[a]).spend; });
  const pick = ui.adPick && groups[ui.adPick] ? ui.adPick : '';
  const shown = pick ? groups[pick] : all, T = adTotals(shown), cur = T.cur;
  const hooks = shown.filter(function(k){ return k.x.hook!=null; });
  const seg = '<div class="r47-by"><button class="'+(by==='client' ? 'is-on' : '')+'" data-action="adGroupBy" data-id="client">By client</button><button class="'+(by==='acct' ? 'is-on' : '')+'" data-action="adGroupBy" data-id="acct">By ad account</button></div>';
  const chips = '<div class="r47-chips"><button class="r47-chip'+(!pick ? ' is-on' : '')+'" data-action="adPick" data-id="">All <b>'+adsMoney(adTotals(all).spend, cur)+'</b></button>'+order.map(function(key){
    const t = adTotals(groups[key]), label = key==='-' ? (by==='acct' ? 'Unknown account' : 'No client') : by==='acct' ? aname(key) : cname(key);
    return '<button class="r47-chip'+(pick===key ? ' is-on' : '')+'" data-action="adPick" data-id="'+escapeHtml(key)+'"'+(by==='client' && key!=='-' ? ' style="--c:'+ccolor(key)+'"' : '')+'><i></i>'+escapeHtml(label)+' <b>'+adsMoney(t.spend, t.cur)+'</b></button>';
  }).join('')+'</div>';
  const sum = '<div class="sx-sum">'+[['spent', adsMoney(T.spend, cur)], ['leads', T.leads ? sxNum(T.leads) : '–'], ['per lead', T.leads ? adsMoney(T.spend/T.leads, cur) : '–'], ['results', T.results ? sxNum(T.results) : '–'], ['CTR', T.imp ? sxPct(T.clicks/T.imp*100) : '–'], ['CPM', T.imp ? adsMoney(T.spend/T.imp*1000, cur) : '–'], ['hook rate', hooks.length ? sxPct(sxAvg(hooks, function(k){ return k.x.hook; })) : '–']].map(function(x){ return '<div><b>'+x[1]+'</b><span>'+x[0]+'</span></div>'; }).join('')+'</div>';
  const guess = function(k){ const n = String(k.name || '').toLowerCase(); return cs.find(function(x){ const a = String(x.business || '').toLowerCase(), b = String(x.name || '').toLowerCase(); return (a && n.indexOf(a) >= 0) || (b && b.length > 3 && n.indexOf(b) >= 0); }); };
  const row = function(k){
    const cl = adClientOf(k), g = !cl ? guess(k) : null, on = /active/i.test(String(k.status || '')), fromAcct = !links[k.id] && k.acct && alinks[k.acct];
    return '<div class="sx-ad">'+
      '<span class="sx-ad-n"><i class="'+(on ? 'is-on' : '')+'"></i><b>'+escapeHtml(k.name || 'Campaign')+'</b><small>'+escapeHtml((by==='client' && accts.length > 1 ? aname(k.acct)+' · ' : '')+String(k.objective || k.status || '').replace(/^OUTCOME_/, '').toLowerCase())+'</small></span>'+
      '<span>'+adsMoney(k.x.spend, k.currency || cur)+'</span>'+
      '<span>'+(k.x.leads!=null ? sxNum(k.x.leads)+' leads' : k.x.results!=null ? sxNum(k.x.results) : '–')+'</span>'+
      '<span>'+(k.x.cpr!=null ? adsMoney(k.x.cpr, k.currency || cur) : k.x.leads ? adsMoney(k.x.spend/k.x.leads, k.currency || cur) : '–')+'</span>'+
      '<span>'+sxPct(k.x.ctr)+'</span><span>'+sxPct(k.x.hook)+'</span>'+
      '<span class="sx-ad-c">'+(g ? '<button class="sx-ad-g" data-action="adLinkTo" data-camp="'+escapeHtml(k.id)+'" data-client="'+g.id+'">Link to '+escapeHtml(g.business || g.name)+'?</button>' : '')+
        '<select class="input'+(fromAcct ? ' is-inherit' : '')+'" data-adlink="'+escapeHtml(k.id)+'"><option value="">'+(k.acct && alinks[k.acct] ? 'Same as account' : 'No client')+'</option>'+cs.map(function(x){ return '<option value="'+x.id+'"'+(links[k.id]===x.id ? ' selected' : '')+'>'+escapeHtml(x.business || x.name)+'</option>'; }).join('')+'</select></span>'+
    '</div>';
  };
  const head = '<div class="sx-ad is-h"><span>Campaign</span><span>Spent</span><span>Results</span><span>Cost each</span><span>CTR</span><span>Hook</span><span>Client</span></div>';
  const sections = (pick ? [pick] : order).map(function(key){
    const list = groups[key], t = adTotals(list);
    let title, extra = '';
    if(by==='acct'){
      title = key==='-' ? 'Unknown account' : aname(key);
      if(key!=='-') extra = '<label class="r47-acl">Client <select class="input" data-acctlink="'+escapeHtml(key)+'"><option value="">None</option>'+cs.map(function(x){ return '<option value="'+x.id+'"'+(alinks[key]===x.id ? ' selected' : '')+'>'+escapeHtml(x.business || x.name)+'</option>'; }).join('')+'</select></label>';
    } else title = key==='-' ? 'No client' : cname(key);
    return '<section class="r47-grp"'+(by==='client' && key!=='-' ? ' style="--c:'+ccolor(key)+'"' : '')+'><div class="r47-gh"><b><i></i>'+escapeHtml(title)+'</b><span>'+adsMoney(t.spend, t.cur)+(t.leads ? ' · '+sxNum(t.leads)+' leads · '+adsMoney(t.spend/t.leads, t.cur)+' each' : '')+' · '+t.n+' campaign'+(t.n===1 ? '' : 's')+'</span>'+extra+'</div>'+
      '<div class="sx-ads">'+head+list.map(row).join('')+'</div></section>';
  }).join('');
  return '<div class="r47-top">'+range+seg+'</div>'+chips+sum+(all.length ? sections : '<div class="llx-empty">No campaigns in this range.</div>');
};

// ---- GoHighLevel's Chats and Contacts are gone from Social ----
renderConversations = (function(base){
  return function(){
    if(ui.socTab==='chats' || ui.socTab==='contacts') ui.socTab = 'overview';
    const was = ghlCfg;
    ghlCfg = function(){ const g = Object.assign({}, was.apply(this, arguments)); g.connected = false; return g; };
    try{ return base.apply(this, arguments); } finally { ghlCfg = was; }
  };
})(renderConversations);
