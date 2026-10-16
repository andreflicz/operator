// ============ ROUND 40: SOCIAL ============
// Social is its own page with tabs: Overview (your Business and your Personal profile side by side, with
// the numbers that matter), Posts (every post with its views, reach, saves, shares, engagement and hook
// rate, sortable), Messages (your Instagram inbox through Zernio, to read) and Ads (your Meta campaigns
// through Zernio, each one linkable to a client so its spend and leads show on their card). GoHighLevel's
// Chats and Contacts stay as tabs when it's connected. Everything is read-only: Operator never posts,
// sends or changes anything.

// ---- more from each post (Zernio) ----
znPost = (function(base){
  return function(p){
    const x = base.apply(this, arguments), a = (p && p.analytics) || {};
    x.impressions = socNum(a.impressions);
    const skip = socNum(a.reelsSkipRate);
    x.hook = skip!=null && (x.type==='REELS' || /REEL/i.test(String(p.mediaProductType || ''))) ? Math.max(0, Math.min(100, 100 - skip)) : null;
    x.avgWatch = socNum(a.igReelsAvgWatchTime); x.dur = socNum(a.videoDurationSeconds);
    x.watchPct = x.avgWatch && x.dur ? Math.min(100, x.avgWatch/(x.dur*10)) : null;
    x.er = socNum(a.engagementRate); x.profileViews = socNum(a.profileViews); x.follows = socNum(a.follows);
    return x;
  };
})(znPost);
function postER(p){
  if(p.er!=null) return p.er;
  const base = p.reach || p.views || p.impressions; if(!base) return null;
  return ((p.likes || 0) + (p.comments || 0) + (p.saves || 0) + (p.shares || 0))/base*100;
}
// ---- account insights and follower growth (Zernio; every 6 hours) ----
znLoadAccount = (function(base){
  return async function(a){
    const d = await base.apply(this, arguments);
    if(!d || (d.insAt && Date.now() - d.insAt < 6*3600000 && !ui.znForce)) return d;
    const to = todayStr(), from = addDays(to, -29), id = encodeURIComponent(a.znId);
    try{
      const r = await znApi('/v1/analytics/instagram/account-insights?accountId='+id+'&fromDate='+from+'&toDate='+to+'&metrics=reach,views,accounts_engaged,total_interactions,profile_links_taps');
      d.ins = {}; Object.keys(r.metrics || {}).forEach(function(k){ const v = r.metrics[k]; d.ins[k] = v && v.total!=null ? Number(v.total) || 0 : null; });
    }catch(e){ d.insErr = e.message; }
    try{
      const r = await znApi('/v1/analytics/instagram/follower-history?accountId='+id+'&fromDate='+from+'&toDate='+to);
      const m = r.metrics || {}, tot = function(k){ return m[k] && m[k].total!=null ? Number(m[k].total) || 0 : null; };
      d.fh = {gained:tot('followers_gained'), lost:tot('followers_lost'), series:arr(m.follower_count && m.follower_count.values).map(function(v){ return [v.date, Number(v.value) || 0]; })};
    }catch(e){}
    d.insAt = Date.now(); persist('settings');
    return d;
  };
})(znLoadAccount);
function znAccs(){ return igCfg().accounts.filter(function(a){ return socialSrc(a)==='zernio'; }); }

// ---- Messages (read only) ----
function znIb(){ if(!ui.znIb) ui.znIb = {convs:null, msgs:{}, sel:null}; return ui.znIb; }
async function znInboxLoad(force){
  const st = znIb(); if(st.loading || !znAccs().length) return;
  if(st.convs && !force && Date.now() - (st.at || 0) < 120000) return;
  st.loading = true; st.err = null; renderView();
  try{
    const all = [];
    for(const a of znAccs()){
      try{
        const r = await znApi('/v1/inbox/conversations?accountId='+encodeURIComponent(a.znId)+'&limit=50&sortOrder=desc');
        arr(r.data).forEach(function(c){ all.push(Object.assign({}, c, {_acc:a.id, _role:a.role, _znId:a.znId})); });
      }catch(e){ st.err = e.message; }
    }
    all.sort(function(x, y){ return String(y.updatedTime || '').localeCompare(String(x.updatedTime || '')); });
    st.convs = all; st.at = Date.now();
  } finally { st.loading = false; renderView(); }
}
async function znMsgsLoad(conv){
  const st = znIb(); if(!conv) return;
  st.msgLoading = conv.id; renderView();
  try{
    const r = await znApi('/v1/inbox/conversations/'+encodeURIComponent(conv.id)+'/messages?accountId='+encodeURIComponent(conv._znId)+'&sortOrder=desc&limit=50');
    st.msgs[conv.id] = arr(r.messages).slice().reverse();
  }catch(e){ st.msgErr = e.message; }
  st.msgLoading = null; renderView();
  setTimeout(function(){ const b = document.querySelector('.sx-thread-b'); if(b) b.scrollTop = b.scrollHeight; }, 30);
}
ACTIONS.znConv = function(el, e, id){ const st = znIb(), c = arr(st.convs).find(function(x){ return x.id===id; }); st.sel = id; st.msgErr = null; renderView(); if(c && !st.msgs[id]) znMsgsLoad(c); };
ACTIONS.znInboxRefresh = function(){ const st = znIb(); st.msgs = {}; znInboxLoad(true); };

// ---- Ads (Meta, through Zernio; read only) ----
function znAdsSt(){ if(!ui.znAds) ui.znAds = {days:30}; return ui.znAds; }
async function znAdsLoad(force){
  const st = znAdsSt(), c = igCfg(); if(st.loading || !znAccs().length) return;
  if(c.znAdsCache && c.znAdsCache.days===st.days && !force && Date.now() - c.znAdsCache.at < 30*60000) return;
  st.loading = true; st.err = null; st.none = false; renderView();
  try{
    const accs = await znApi('/v1/accounts?category=ads');
    const conn = arr(accs.accounts).find(function(x){ return /meta/i.test(String(x.platform || '')); }) || arr(accs.accounts)[0];
    if(!conn){ st.none = true; return; }
    const to = todayStr(), from = addDays(to, -(st.days - 1));
    const r = await znApi('/v1/ads/campaigns?accountId='+encodeURIComponent(conn._id)+'&fromDate='+from+'&toDate='+to+'&limit=100&source=all');
    c.znAdsCache = {at:Date.now(), days:st.days, from:from, to:to, conn:{id:conn._id, name:conn.username || conn.displayName || 'Meta Ads'}, camps:arr(r.campaigns).map(function(k){ return {id:k.platformCampaignId, name:k.campaignName, status:k.status || k.platformCampaignStatus, currency:k.currency, objective:k.platformObjective, m:k.metrics || {}}; })};
    persist('settings');
  }catch(e){ st.err = e.message; }
  finally { st.loading = false; renderView(); }
}
function adNums(m){
  m = m || {}; const eb = m.engagementBreakdown || {}, f = m.funnel || {}, ac = m.actions || {};
  const leads = socNum(f.leads, ac.lead, ac['onsite_conversion.lead_grouped'], ac['offsite_conversion.fb_pixel_lead']);
  const hook = eb.videoViews && m.impressions ? eb.videoViews/m.impressions*100 : (m.videoP25WatchedActions && m.videoPlayActions ? m.videoP25WatchedActions/m.videoPlayActions*100 : null);
  return {spend:Number(m.spend) || 0, impressions:Number(m.impressions) || 0, reach:Number(m.reach) || 0, clicks:Number(m.clicks) || 0, ctr:socNum(m.ctr), cpm:socNum(m.cpm), results:socNum(m.conversions), cpr:socNum(m.costPerConversion), leads:leads, hook:hook};
}
function adLinks(){ const c = igCfg(); if(!c.adLinks || typeof c.adLinks!=='object') c.adLinks = {}; return c.adLinks; }
function clientAdTotals(cid){
  const c = igCfg(); if(!c.znAdsCache) return null;
  const links = adLinks(), mine = c.znAdsCache.camps.filter(function(k){ return links[k.id]===cid; }); if(!mine.length) return null;
  const t = {n:mine.length, spend:0, leads:0, results:0, currency:mine[0].currency, days:c.znAdsCache.days};
  mine.forEach(function(k){ const x = adNums(k.m); t.spend += x.spend; t.leads += x.leads || 0; t.results += x.results || 0; });
  return t;
}
document.addEventListener('change', function(e){
  const t = e.target; if(!t || !t.dataset || !t.dataset.adlink) return;
  const l = adLinks(); if(t.value) l[t.dataset.adlink] = t.value; else delete l[t.dataset.adlink];
  persist('settings'); playTick(); renderView();
});
ACTIONS.adLinkTo = function(el){ adLinks()[el.dataset.camp] = el.dataset.client; persist('settings'); playTick(); renderView(); };
ACTIONS.znAdsDays = function(el, e, id){ znAdsSt().days = Number(id) || 30; znAdsLoad(true); };
ACTIONS.znAdsRefresh = function(){ znAdsLoad(true); };
// the client card shows what their linked campaigns did
clientCardV2 = (function(base){
  return function(c){
    const h = base.apply(this, arguments), t = clientAdTotals(c.id); if(!t) return h;
    const line = '<div class="cc2-ads" title="'+t.n+' Meta campaign'+(t.n===1 ? '' : 's')+' linked on Social → Ads">&#128226; '+adsMoney(t.spend, t.currency)+' on ads ('+t.days+'d)'+(t.leads ? ' &middot; '+t.leads+' lead'+(t.leads===1 ? '' : 's')+' &middot; '+adsMoney(t.spend/t.leads, t.currency)+'/lead' : t.results ? ' &middot; '+t.results+' results' : '')+'</div>';
    return h.indexOf('<div class="cc2-foot">') >= 0 ? h.replace('<div class="cc2-foot">', line+'<div class="cc2-foot">') : h;
  };
})(clientCardV2);

// ---- the page ----
function sxNum(v, d){ return v==null || !isFinite(v) ? '–' : Math.abs(v) >= 10000 ? (v/1000).toFixed(v >= 100000 ? 0 : 1)+'k' : Number(v).toLocaleString(undefined, {maximumFractionDigits:d==null ? 0 : d}); }
function sxPct(v){ return v==null || !isFinite(v) ? '–' : v.toFixed(v < 10 ? 1 : 0)+'%'; }
function sxAvg(list, f){ const xs = list.map(f).filter(function(v){ return v!=null && isFinite(v); }); return xs.length ? xs.reduce(function(t, v){ return t + v; }, 0)/xs.length : null; }
function sxSum(list, k){ const xs = list.map(function(p){ return p[k]; }).filter(function(v){ return v!=null; }); return xs.length ? xs.reduce(function(t, v){ return t + v; }, 0) : null; }
function sxSpark(series){
  if(!series || series.length < 2) return '';
  const vs = series.map(function(x){ return x[1]; }), lo = Math.min.apply(null, vs), hi = Math.max.apply(null, vs), r = hi - lo || 1;
  const pts = vs.map(function(v, i){ return (i/(vs.length - 1)*100).toFixed(1)+','+(28 - (v - lo)/r*24).toFixed(1); }).join(' ');
  return '<svg class="sx-spark" viewBox="0 0 100 30" preserveAspectRatio="none"><polyline points="'+pts+'"/></svg>';
}
function sxAccountData(a){ const c = igCfg(); return c.cache && c.cache.data ? c.cache.data[a.id] : null; }
function sxProfileCard(role){
  const c = igCfg(), accs = c.accounts.filter(function(a){ return a.role===role; }), label = role==='business' ? 'Business profile' : 'Personal profile';
  if(!accs.length) return '<div class="sx-prof is-empty"><div class="sx-prof-k">'+label+'</div><p>'+(role==='business' ? 'Your brand’s account.' : 'Your own account, side by side with the business.')+'</p><button class="btn btn-primary btn-sm" data-action="socAddRole" data-id="'+role+'">&#65291; Connect your '+(role==='business' ? 'business' : 'personal')+' profile</button></div>';
  return accs.map(function(a){
    const d = sxAccountData(a);
    if(!d) return '<div class="sx-prof"><div class="sx-prof-k">'+label+'</div><div class="gp-loading">'+(ui.igLoading ? 'Loading @'+escapeHtml(a.username)+'…' : ui.igErr ? '&#9888; '+escapeHtml(ui.igErr) : 'Waiting for numbers…')+'</div></div>';
    const since = addDays(todayStr(), -30), recent = arr(d.posts).filter(function(p){ return p.date > since; });
    const reels = recent.filter(function(p){ return p.hook!=null; });
    const growth = d.fh && d.fh.gained!=null ? (d.fh.gained || 0) - (d.fh.lost || 0) : null;
    const tile = function(k, v, sub, cls){ return '<div class="sx-t'+(cls ? ' '+cls : '')+'"><b>'+v+'</b><span>'+k+'</span>'+(sub ? '<small>'+sub+'</small>' : '')+'</div>'; };
    const best = recent.slice().sort(function(x, y){ return (y.views || y.reach || y.likes || 0) - (x.views || x.reach || x.likes || 0); }).slice(0, 4);
    const src = socialSrc(a);
    return '<div class="sx-prof">'+
      '<div class="sx-prof-h">'+(d.pic ? '<img src="'+escapeHtml(d.pic)+'" alt="">' : '<span class="sx-av">'+escapeHtml(String(d.username || a.username || '?').slice(0, 1).toUpperCase())+'</span>')+
        '<div><div class="sx-prof-k">'+label+'</div><b>@'+escapeHtml(d.username || a.username)+'</b></div><span style="flex:1"></span><span class="sx-src">'+(({zernio:'Zernio', apify:'Apify', csv:'CSV', metricool:'Metricool'})[src] || 'Meta')+'</span></div>'+
      '<div class="sx-fol"><div><b>'+sxNum(d.followers)+'</b><span>followers</span>'+(growth!=null ? '<em class="'+(growth >= 0 ? 'is-up' : 'is-down')+'">'+(growth >= 0 ? '+' : '')+sxNum(growth)+' in 30 days</em>' : '')+'</div>'+sxSpark(d.fh && d.fh.series)+'</div>'+
      '<div class="sx-tiles">'+
        tile('posts', recent.length, '30 days')+
        tile('avg views', sxNum(sxAvg(recent, function(p){ return p.views; })))+
        tile('avg reach', sxNum(sxAvg(recent, function(p){ return p.reach; })))+
        tile('engagement', sxPct(sxAvg(recent, postER)), 'per post')+
        tile('hook rate', sxPct(sxAvg(reels, function(p){ return p.hook; })), reels.length ? reels.length+' reels' : 'reels only', 'is-hook')+
        tile('watched', sxPct(sxAvg(reels, function(p){ return p.watchPct; })), 'of each reel')+
        tile('saves', sxNum(sxSum(recent, 'saves')))+
        tile('shares', sxNum(sxSum(recent, 'shares')))+
        (d.ins ? tile('accounts reached', sxNum(d.ins.reach))+tile('link taps', sxNum(d.ins.profile_links_taps)) : '')+
      '</div>'+
      '<div class="sx-strip-k">Posting, last 30 days</div><div class="ig-strip sx-strip">'+(function(){ const days = {}; recent.forEach(function(p){ days[p.date] = (days[p.date] || 0) + 1; }); const o = []; for(let i = 29; i >= 0; i--){ const dd = addDays(todayStr(), -i); o.push('<i class="'+(days[dd] ? 'is-on' : '')+'" title="'+escapeHtml(fmtDateShort(dd))+(days[dd] ? ': '+days[dd]+' post'+(days[dd]===1 ? '' : 's') : '')+'"></i>'); } return o.join(''); })()+'</div>'+
      (best.length ? '<div class="sx-best">'+best.map(function(p){ return '<a href="'+escapeHtml(p.link || '#')+'" target="_blank" rel="noopener" title="'+escapeHtml(p.cap || '')+'">'+(p.thumb ? '<img src="'+escapeHtml(p.thumb)+'" alt="" loading="lazy">' : '<span></span>')+'<small>'+sxNum(p.views || p.reach || p.likes)+'</small></a>'; }).join('')+'</div>' : '')+
      (role==='personal' && src==='zernio' && d.insErr ? '<div class="sx-note">A personal Instagram shares fewer numbers with apps. Switching it to a free Creator account (Instagram settings) unlocks reach and insights.</div>' : '')+
    '</div>';
  }).join('');
}
function sxOverviewHtml(){
  igMaybeRefresh();
  const read = typeof opRead==='function' && typeof opFactsSocial==='function' ? opRead('social', opFactsSocial, 'Give him your read on his Instagram'+(igCfg().znAdsCache ? ' and his ads' : '')+': what’s working, what isn’t, and what to do next.', {angles:'social'}) : '';
  return read+'<div class="sx-profs">'+sxProfileCard('business')+sxProfileCard('personal')+'</div>'+
    (ui.socAdd ? '<div class="sx-add">'+socialConnectHtml()+'</div>' : '')+
    '<div class="sx-sec-k">Connections</div>'+(typeof socialSourcesHtml==='function' ? socialSourcesHtml() : '');
}
const SX_SORTS = [['date', 'Newest'], ['views', 'Views'], ['reach', 'Reach'], ['er', 'Engagement'], ['hook', 'Hook rate'], ['saves', 'Saves'], ['shares', 'Shares'], ['comments', 'Comments']];
function sxPostsHtml(){
  igMaybeRefresh();
  const c = igCfg(), sel = ui.socPostAcc || 'all', sort = ui.socSort || 'date';
  let posts = [];
  c.accounts.forEach(function(a){ if(sel!=='all' && sel!==a.id) return; const d = sxAccountData(a); if(d) arr(d.posts).forEach(function(p){ posts.push(Object.assign({_role:a.role, _user:d.username || a.username}, p)); }); });
  const val = function(p){ return sort==='er' ? postER(p) : sort==='date' ? p.date : p[sort]; };
  posts.sort(function(x, y){ const a = val(x), b = val(y); if(sort==='date') return String(b || '').localeCompare(String(a || '')); return (b==null ? -1 : b) - (a==null ? -1 : a); });
  const shown = posts.slice(0, 60), last30 = posts.filter(function(p){ return p.date > addDays(todayStr(), -30); });
  const chips = '<div class="sx-chips">'+[['all', 'All']].concat(c.accounts.map(function(a){ const d = sxAccountData(a); return [a.id, '@'+((d && d.username) || a.username)+' &middot; '+(a.role==='business' ? 'Business' : 'Personal')]; })).map(function(x){ return '<button class="'+(sel===x[0] ? 'is-on' : '')+'" data-action="socPostAcc" data-id="'+escapeHtml(x[0])+'">'+x[1]+'</button>'; }).join('')+'</div>';
  const sorts = '<div class="sx-sort"><span>Sort</span>'+SX_SORTS.map(function(s){ return '<button class="'+(sort===s[0] ? 'is-on' : '')+'" data-action="socSort" data-id="'+s[0]+'">'+s[1]+'</button>'; }).join('')+'</div>';
  const sum = '<div class="sx-sum">'+[['posts (30d)', last30.length], ['avg views', sxNum(sxAvg(last30, function(p){ return p.views; }))], ['avg reach', sxNum(sxAvg(last30, function(p){ return p.reach; }))], ['engagement', sxPct(sxAvg(last30, postER))], ['hook rate', sxPct(sxAvg(last30, function(p){ return p.hook; }))], ['saves', sxNum(sxSum(last30, 'saves'))], ['shares', sxNum(sxSum(last30, 'shares'))]].map(function(x){ return '<div><b>'+x[1]+'</b><span>'+x[0]+'</span></div>'; }).join('')+'</div>';
  const m = function(icon, v, t){ return v==null || v==='–' ? '' : '<span title="'+t+'">'+icon+' '+v+'</span>'; };
  return chips+sum+sorts+(shown.length ? '<div class="sx-posts">'+shown.map(function(p){
    const er = postER(p);
    return '<a class="sx-post" href="'+escapeHtml(p.link || '#')+'" target="_blank" rel="noopener">'+
      '<span class="sx-post-img">'+(p.thumb ? '<img src="'+escapeHtml(p.thumb)+'" alt="" loading="lazy">' : '')+(p.type ? '<em>'+escapeHtml(/REEL/.test(p.type) ? 'Reel' : p.type.charAt(0)+p.type.slice(1).toLowerCase())+'</em>' : '')+'</span>'+
      '<span class="sx-post-b"><small>'+escapeHtml(p.date ? fmtDateShort(p.date) : '')+' &middot; @'+escapeHtml(p._user || '')+'</small><span class="sx-cap">'+escapeHtml(p.cap || '(no caption)')+'</span>'+
        '<span class="sx-m">'+m('&#128065;', p.views!=null ? sxNum(p.views) : null, 'views')+m('&#128225;', p.reach!=null ? sxNum(p.reach) : null, 'reach')+m('&#10084;&#65039;', sxNum(p.likes), 'likes')+m('&#128172;', sxNum(p.comments), 'comments')+m('&#128278;', p.saves!=null ? sxNum(p.saves) : null, 'saves')+m('&#8599;', p.shares!=null ? sxNum(p.shares) : null, 'shares')+'</span>'+
        '<span class="sx-m2">'+(er!=null ? '<span title="Engagement: likes, comments, saves and shares over reach">ER <b>'+sxPct(er)+'</b></span>' : '')+(p.hook!=null ? '<span class="is-hook" title="Hook rate: share of viewers who didn’t skip in the first 3 seconds (Meta’s estimate)">Hook <b>'+sxPct(p.hook)+'</b></span>' : '')+(p.watchPct!=null ? '<span title="How much of the reel the average view watched">Watched <b>'+sxPct(p.watchPct)+'</b></span>' : '')+'</span>'+
      '</span></a>';
  }).join('')+'</div>' : '<div class="llx-empty">No posts yet.'+(c.accounts.length ? '' : ' Connect an account on Overview.')+'</div>');
}
ACTIONS.socPostAcc = function(el, e, id){ ui.socPostAcc = id; renderView(); };
ACTIONS.socSort = function(el, e, id){ ui.socSort = id; renderView(); };
ACTIONS.socAddRole = function(el, e, id){ ui.socRole = id; ui.socAdd = true; ui.socShow = 'zn'; ui.socTab = 'overview'; renderView(); setTimeout(function(){ const x = document.querySelector('.sx-add'); if(x) x.scrollIntoView({behavior:'smooth', block:'center'}); }, 60); };
function sxAgo(iso){ const t = Date.parse(iso || ''); if(!isFinite(t)) return ''; const m = Math.round((Date.now() - t)/60000); return m < 60 ? Math.max(1, m)+'m' : m < 1440 ? Math.round(m/60)+'h' : Math.round(m/1440)+'d'; }
function sxMessagesHtml(){
  if(!znAccs().length) return '<div class="llx-empty">Messages come through Zernio. Connect your Instagram with Zernio on Overview and your DMs show up here.</div>';
  const st = znIb(); znInboxLoad(false);
  if(!st.convs) return '<div class="gp-loading">'+(st.err ? '&#9888; '+escapeHtml(st.err) : 'Loading your messages…')+'</div>';
  const sel = arr(st.convs).find(function(c){ return c.id===st.sel; });
  const list = '<div class="sx-convs">'+(st.convs.length ? st.convs.map(function(c){
    return '<button class="sx-conv'+(c.id===st.sel ? ' is-on' : '')+(c.unreadCount ? ' is-unread' : '')+'" data-action="znConv" data-id="'+escapeHtml(c.id)+'">'+
      (c.participantPicture ? '<img src="'+escapeHtml(c.participantPicture)+'" alt="">' : '<span class="sx-av">'+escapeHtml(String(c.participantName || '?').slice(0, 1).toUpperCase())+'</span>')+
      '<span class="sx-conv-b"><b>'+escapeHtml(c.participantName || 'Someone')+'</b><small>'+escapeHtml(String(c.lastMessage || '').slice(0, 80))+'</small></span>'+
      '<span class="sx-conv-r"><small>'+sxAgo(c.updatedTime)+'</small>'+(c.unreadCount ? '<i>'+c.unreadCount+'</i>' : '')+'<em class="is-'+c._role+'">'+(c._role==='business' ? 'B' : 'P')+'</em></span></button>';
  }).join('') : '<div class="llx-empty">No conversations.</div>')+'</div>';
  const msgs = sel ? st.msgs[sel.id] : null;
  const thread = '<div class="sx-thread">'+(sel ? '<div class="sx-thread-h"><b>'+escapeHtml(sel.participantName || 'Someone')+'</b>'+(sel.instagramProfile && sel.instagramProfile.followerCount!=null ? '<small>'+sxNum(sel.instagramProfile.followerCount)+' followers'+(sel.instagramProfile.isFollower ? ' &middot; follows you' : '')+'</small>' : '')+'<span style="flex:1"></span>'+(sel.url ? '<a class="btn btn-ghost btn-sm" href="'+escapeHtml(sel.url)+'" target="_blank" rel="noopener">Reply in Instagram &#8599;</a>' : '')+'</div>'+
      '<div class="sx-thread-b">'+(st.msgLoading===sel.id ? '<div class="gp-loading">Loading…</div>' : msgs ? msgs.map(function(m){ return '<div class="sx-msg is-'+(m.direction==='outgoing' ? 'out' : 'in')+'"><span>'+escapeHtml(m.message || (arr(m.attachments).length ? '[attachment]' : m.storyReply ? '[replied to your story]' : ''))+'</span><small>'+sxAgo(m.createdAt)+'</small></div>'; }).join('') || '<div class="llx-empty">No messages.</div>' : (st.msgErr ? '&#9888; '+escapeHtml(st.msgErr) : ''))+'</div>'+
      '<div class="sx-thread-f">Read-only here. Operator never sends messages: reply in Instagram.</div>'
    : '<div class="llx-empty">Pick a conversation.</div>')+'</div>';
  return '<div class="sx-inbox">'+list+thread+'</div>';
}
function sxAdsHtml(){
  if(!znAccs().length) return typeof adsSectionHtml==='function' && adsSectionHtml() ? adsSectionHtml() : '<div class="llx-empty">Your Meta ads come through Zernio: connect Zernio on Overview, then in Zernio connect Meta Ads (it needs your Facebook Page). Or connect Meta directly.</div>';
  const st = znAdsSt(), c = igCfg(); znAdsLoad(false);
  const range = '<div class="sx-sort"><span>Last</span>'+[7, 30, 90].map(function(d){ return '<button class="'+(st.days===d ? 'is-on' : '')+'" data-action="znAdsDays" data-id="'+d+'">'+d+' days</button>'; }).join('')+'</div>';
  if(st.none) return range+'<div class="llx-empty">No Meta Ads connection in Zernio yet. In Zernio: Accounts → connect Meta Ads (it uses your Facebook Page). Then refresh here.</div>';
  const cache = c.znAdsCache;
  if(!cache || cache.days!==st.days) return range+'<div class="gp-loading">'+(st.err ? '&#9888; '+escapeHtml(st.err) : 'Loading your campaigns…')+'</div>';
  const cs = arr(state.business.clients).filter(function(x){ return clientStageActive(x.stage); }), links = adLinks();
  const all = cache.camps.map(function(k){ return Object.assign({x:adNums(k.m)}, k); }).sort(function(a, b){ return b.x.spend - a.x.spend; });
  const cur = (all[0] && all[0].currency) || 'USD', T = {spend:0, leads:0, results:0, imp:0, clicks:0};
  all.forEach(function(k){ T.spend += k.x.spend; T.leads += k.x.leads || 0; T.results += k.x.results || 0; T.imp += k.x.impressions; T.clicks += k.x.clicks; });
  const hooks = all.filter(function(k){ return k.x.hook!=null; });
  const sum = '<div class="sx-sum">'+[['spent', adsMoney(T.spend, cur)], ['leads', T.leads ? sxNum(T.leads) : '–'], ['per lead', T.leads ? adsMoney(T.spend/T.leads, cur) : '–'], ['results', T.results ? sxNum(T.results) : '–'], ['CTR', T.imp ? sxPct(T.clicks/T.imp*100) : '–'], ['CPM', T.imp ? adsMoney(T.spend/T.imp*1000, cur) : '–'], ['hook rate', hooks.length ? sxPct(sxAvg(hooks, function(k){ return k.x.hook; })) : '–']].map(function(x){ return '<div><b>'+x[1]+'</b><span>'+x[0]+'</span></div>'; }).join('')+'</div>';
  const guess = function(k){ const n = String(k.name || '').toLowerCase(); return cs.find(function(x){ const a = String(x.business || '').toLowerCase(), b = String(x.name || '').toLowerCase(); return (a && n.indexOf(a) >= 0) || (b && b.length > 3 && n.indexOf(b) >= 0); }); };
  const rows = all.map(function(k){
    const g = !links[k.id] ? guess(k) : null, on = /active/i.test(String(k.status || ''));
    return '<div class="sx-ad">'+
      '<span class="sx-ad-n"><i class="'+(on ? 'is-on' : '')+'"></i><b>'+escapeHtml(k.name || 'Campaign')+'</b><small>'+escapeHtml(String(k.objective || k.status || '').replace(/^OUTCOME_/, '').toLowerCase())+'</small></span>'+
      '<span>'+adsMoney(k.x.spend, k.currency || cur)+'</span>'+
      '<span>'+(k.x.leads!=null ? sxNum(k.x.leads)+' leads' : k.x.results!=null ? sxNum(k.x.results) : '–')+'</span>'+
      '<span>'+(k.x.cpr!=null ? adsMoney(k.x.cpr, k.currency || cur) : k.x.leads ? adsMoney(k.x.spend/k.x.leads, k.currency || cur) : '–')+'</span>'+
      '<span>'+sxPct(k.x.ctr)+'</span>'+
      '<span>'+sxPct(k.x.hook)+'</span>'+
      '<span class="sx-ad-c">'+(g ? '<button class="sx-ad-g" data-action="adLinkTo" data-camp="'+escapeHtml(k.id)+'" data-client="'+g.id+'">Link to '+escapeHtml(g.business || g.name)+'?</button>' : '')+
        '<select class="input" data-adlink="'+escapeHtml(k.id)+'"><option value="">No client</option>'+cs.map(function(x){ return '<option value="'+x.id+'"'+(links[k.id]===x.id ? ' selected' : '')+'>'+escapeHtml(x.business || x.name)+'</option>'; }).join('')+'</select></span>'+
    '</div>';
  }).join('');
  return range+sum+'<div class="sx-ads"><div class="sx-ad is-h"><span>Campaign</span><span>Spent</span><span>Results</span><span>Cost each</span><span>CTR</span><span>Hook</span><span>Client</span></div>'+(rows || '<div class="llx-empty">No campaigns in this range.</div>')+'</div>'+
    '<div class="sx-note">Hook rate on ads: 3-second video views over impressions. Link a campaign to a client and its spend and leads show on their card.</div>';
}
renderConversations = function(){
  const s = inboxState(), ghl = ghlCfg().connected;
  let tab = ui.socTab || 'overview';
  const tabs = [['overview', '&#128202; Overview'], ['posts', '&#127902;&#65039; Posts'], ['messages', '&#128172; Messages'], ['ads', '&#128226; Ads']].concat(ghl ? [['chats', '&#128172; GHL chats'], ['contacts', '&#128101; Contacts']] : []);
  if(!tabs.some(function(t){ return t[0]===tab; })) tab = 'overview';
  const refresh = {overview:'igRefreshAll', posts:'igRefreshAll', messages:'znInboxRefresh', ads:'znAdsRefresh', chats:'inboxRefresh', contacts:'inboxRefresh'}[tab];
  let body = '';
  if(!igOn() && (tab==='overview' || tab==='posts')) body = socialConnectHtml();
  else if(tab==='overview') body = sxOverviewHtml();
  else if(tab==='posts') body = sxPostsHtml();
  else if(tab==='messages') body = sxMessagesHtml();
  else if(tab==='ads') body = sxAdsHtml();
  else { s.mode = tab; body = renderInboxTab(); }
  return '<div class="view-header"><div><div class="view-title">Social'+tip('Your Business and Personal profiles, every post’s numbers, your messages and your Meta ads. Read-only: Operator never posts or sends.')+'</div></div>'+
      '<div class="row" style="gap:8px;align-items:center;"><button class="btn btn-ghost btn-sm" data-action="'+refresh+'" title="Refresh">&#8635; Refresh</button></div></div>'+
    '<div class="seg-tabs sx-tabs">'+tabs.map(function(t){ return '<button class="seg-tab'+(tab===t[0] ? ' active' : '')+'" '+(ghl && (t[0]==='overview' || t[0]==='chats' || t[0]==='contacts') ? 'data-action="inboxMode" data-id="'+(t[0]==='overview' ? 'social' : t[0])+'"' : 'data-action="socTab" data-id="'+t[0]+'"')+'>'+t[1]+(t[0]==='messages' && ui.znIb && ui.znIb.convs ? (function(){ const n = ui.znIb.convs.reduce(function(a, c){ return a + (c.unreadCount || 0); }, 0); return n ? ' <span class="ib-badge">'+n+'</span>' : ''; })() : t[0]==='chats' && inboxUnread() ? ' <span class="ib-badge">'+inboxUnread()+'</span>' : '')+'</button>'; }).join('')+'</div>'+
    '<div class="tab-panel sx" data-key="sx-'+tab+'">'+body+'</div>';
};
ACTIONS.socTab = function(el, e, id){ ui.socTab = id; if(id==='chats' || id==='contacts') inboxState().mode = id; renderView(); };
ACTIONS.igRefreshAll = function(){ ui.znForce = true; ui.apForce = true; ui.igTried = 0; igRefresh(false).then(function(){ ui.znForce = false; ui.apForce = false; }); };
ACTIONS.goToSocial = function(){ ui.view = 'convos'; ui.socTab = 'overview'; inboxState().mode = 'social'; renderView(); };
// Op reads the new numbers too: engagement and hook rate on the last month's posts, and what each
// client's ads did
if(typeof opFactsSocial==='function') opFactsSocial = (function(base){
  return function(){
    let s = ''; try{ s = base.apply(this, arguments) || ''; }catch(e){}
    const c = igCfg(), since = addDays(todayStr(), -30), lines = [];
    c.accounts.forEach(function(a){
      const d = sxAccountData(a); if(!d) return;
      const r = arr(d.posts).filter(function(p){ return p.date > since; }), reels = r.filter(function(p){ return p.hook!=null; });
      const er = sxAvg(r, postER), hook = sxAvg(reels, function(p){ return p.hook; }), w = sxAvg(reels, function(p){ return p.watchPct; });
      lines.push('@'+(d.username || a.username)+' ('+a.role+'): '+r.length+' posts in 30 days'+(er!=null ? ', engagement '+er.toFixed(1)+'%' : '')+(hook!=null ? ', reel hook rate '+hook.toFixed(0)+'% (viewers who didn’t skip in 3s)' : '')+(w!=null ? ', watched '+w.toFixed(0)+'% of each reel' : '')+(d.fh && d.fh.gained!=null ? ', followers +'+((d.fh.gained || 0) - (d.fh.lost || 0))+' in 30 days' : ''));
    });
    if(c.znAdsCache){
      const links = adLinks();
      c.znAdsCache.camps.forEach(function(k){ const x = adNums(k.m); if(!x.spend) return; const cl = links[k.id] ? arr(state.business.clients).find(function(z){ return z.id===links[k.id]; }) : null;
        lines.push('Ad "'+k.name+'"'+(cl ? ' for '+(cl.business || cl.name) : '')+': '+adsMoney(x.spend, k.currency)+' in '+c.znAdsCache.days+' days'+(x.leads ? ', '+x.leads+' leads ('+adsMoney(x.spend/x.leads, k.currency)+' each)' : '')+(x.ctr!=null ? ', CTR '+x.ctr.toFixed(1)+'%' : '')+(x.hook!=null ? ', hook '+x.hook.toFixed(0)+'%' : '')); });
    }
    return lines.length ? (s ? s+'\n' : '')+lines.join('\n') : s;
  };
})(opFactsSocial);
// (GoHighLevel's own tab switch lands on the same tabs)
ACTIONS.inboxMode = (function(base){
  return function(el, e, id){ ui.socTab = id==='chats' || id==='contacts' ? id : 'overview'; return base ? base.apply(this, arguments) : renderView(); };
})(ACTIONS.inboxMode);
