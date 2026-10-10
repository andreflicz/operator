// ============ INSTAGRAM ============
// Your Instagram numbers, straight from Instagram (the Meta Graph API): followers, every post with its
// likes, comments and reach. Connect once in Settings → Integrations with an access token — the
// Operator app keeps the token in its own file on this Mac (never in Operator's data, exports or
// backups). Mark each account Business or Personal and your posts count as business or personal
// content on your card by themselves; followers you gain count as XP.
// (Needs an Instagram professional account — Business or Creator — linked to a Facebook Page.)
function igCfg(){
  const s = state.settings;
  if(!s.instagram || typeof s.instagram!=='object') s.instagram = {accounts:[], cache:null};
  if(!Array.isArray(s.instagram.accounts)) s.instagram.accounts = [];
  return s.instagram;
}
function igOn(){ return igCfg().accounts.length > 0; }
async function igApi(path){
  const r = await fetchWithin(WAKE_HELPER+'ig/api?p='+hexUtf8(path), 20000);
  let j = null; try{ j = r ? await r.json() : null; }catch(e){}
  if(!r || !r.ok || !j || j.error) throw new Error((j && j.error && j.error.message) || (r ? 'Instagram said no ('+r.status+')' : 'the Operator app isn’t answering'));
  return j;
}
// the Instagram accounts your token can see (through the Facebook Pages they're linked to)
async function igFindAccounts(){
  const j = await igApi('/me/accounts?fields=name,instagram_business_account{id,username,followers_count,profile_picture_url}&limit=50');
  return (j.data || []).map(function(p){ return p.instagram_business_account; }).filter(Boolean).map(function(a){ return {id:a.id, username:a.username, followers:a.followers_count, pic:a.profile_picture_url}; });
}
// everything for one account: followers, and the last 30 posts with likes, comments and reach
async function igLoadAccount(acc){
  const info = await igApi('/'+acc.id+'?fields=username,followers_count,media_count,profile_picture_url');
  const media = await igApi('/'+acc.id+'/media?fields=id,caption,media_type,media_product_type,timestamp,like_count,comments_count,permalink,thumbnail_url,media_url&limit=30');
  const posts = (media.data || []).map(function(m){ return {id:m.id, cap:String(m.caption||'').slice(0, 140), type:m.media_product_type || m.media_type, at:m.timestamp, date:m.timestamp ? ds2(new Date(m.timestamp)) : '', likes:Number(m.like_count)||0, comments:Number(m.comments_count)||0, link:m.permalink, thumb:m.thumbnail_url || (m.media_type!=='VIDEO' ? m.media_url : '')}; });
  // reach for the newest dozen (each is its own call; older posts keep what they had)
  await Promise.all(posts.slice(0, 12).map(async function(p){ try{ const ins = await igApi('/'+p.id+'/insights?metric=reach'); const v = (ins.data || [])[0]; if(v && v.values && v.values[0]) p.reach = Number(v.values[0].value)||0; }catch(e){} }));
  return {username:info.username, followers:Number(info.followers_count)||0, mediaCount:Number(info.media_count)||0, pic:info.profile_picture_url, posts:posts};
}
async function igRefresh(quiet){
  const c = igCfg(); if(!c.accounts.length || ui.igLoading) return;
  ui.igLoading = true; ui.igErr = null; if(!quiet) renderView();
  try{
    const data = {};
    for(const a of c.accounts){ data[a.id] = await igLoadAccount(a); }
    c.cache = {at:Date.now(), data:data};
    // follower history (a point a day) for the trend line
    c.history = c.history && typeof c.history==='object' ? c.history : {};
    c.history[todayStr()] = c.accounts.reduce(function(t, a){ return t + ((data[a.id] && data[a.id].followers) || 0); }, 0);
    persist('settings');
  }catch(e){ ui.igErr = e.message; }
  ui.igLoading = false; renderView();
}
function igMaybeRefresh(){ const c = igCfg(); if(igOn() && !ui.igLoading && (!c.cache || Date.now() - c.cache.at > 30*60000) && !ui.igTried){ ui.igTried = Date.now(); setTimeout(function(){ igRefresh(true); }, 0); } }
// for XP: your total followers right now (null when not connected)
function igFollowersTotal(){ const c = igCfg(); if(!c.cache || !c.cache.data) return null; let t = 0; Object.keys(c.cache.data).forEach(function(k){ t += c.cache.data[k].followers||0; }); return t; }
// for your card: posts in the last 30 days from your business / personal accounts
function igPostsByRole(role, days){
  const c = igCfg(); if(!c.cache || !c.cache.data) return null;
  const since = addDays(todayStr(), -(days||30)); let n = 0;
  c.accounts.filter(function(a){ return a.role===role; }).forEach(function(a){ const d = c.cache.data[a.id]; if(d) n += d.posts.filter(function(p){ return p.date > since; }).length; });
  return n;
}

// ---- Settings → Integrations ----
function igSettingsHtml(){
  const c = igCfg();
  if(ui.igHasKey==null){ ui.igHasKey = false; fetchWithin(WAKE_HELPER+'ig/status', 5000).then(function(r){ return r && r.ok ? r.json() : null; }).then(function(j){ ui.igHasKey = !!(j && j.hasKey); if(ui.view==='settings') renderView(); }).catch(function(){}); }
  const acc = function(a){ return '<div class="ig-acc"><span class="ig-acc-n">@'+escapeHtml(a.username)+'</span>'+
    '<div class="seg-tabs" style="margin:0;">'+['business', 'personal'].map(function(r){ return '<button class="seg-tab'+(a.role===r?' active':'')+'" data-action="igRole" data-id="'+a.id+'" data-role="'+r+'">'+(r==='business' ? 'Business' : 'Personal')+'</button>'; }).join('')+'</div>'+
    '<button class="btn btn-ghost btn-sm" data-action="igDrop" data-id="'+a.id+'" title="Stop tracking it">&#10005;</button></div>'; };
  return '<div class="card section ig-set"><div class="section-title">&#128247; Instagram'+tip('Followers and post stats straight from Instagram. Needs an Instagram Business or Creator account linked to a Facebook Page, and an access token from developers.facebook.com (Graph API Explorer → your app → permissions instagram_basic, instagram_manage_insights, pages_show_list, pages_read_engagement → Generate token, then extend it to a long-lived one). The token is saved by the Operator app on this Mac only.')+'</div>'+
    (ui.igHasKey ? '<div class="op-set-key"><span>&#128274; Token saved on this Mac</span><button class="btn btn-ghost btn-sm" data-action="igFind">'+(c.accounts.length ? 'Find accounts again' : 'Find my accounts')+'</button><button class="btn btn-ghost btn-sm" data-action="igForget">Remove</button></div>'
      : '<div class="op-set-key"><input class="input" type="password" id="igToken" placeholder="Instagram / Meta access token" autocomplete="off"><button class="btn btn-sm btn-primary" data-action="igSave">Connect</button></div>')+
    (ui.igFound && ui.igFound.length ? '<div class="ig-found">'+ui.igFound.map(function(a){ const on = c.accounts.some(function(x){ return x.id===a.id; }); return '<button class="btn btn-sm'+(on?' btn-primary':'')+'" data-action="igAdd" data-id="'+a.id+'">'+(on ? '&#10003; ' : '+ ')+'@'+escapeHtml(a.username)+'</button>'; }).join('')+'</div>' : '')+
    (c.accounts.length ? '<div class="ig-accs">'+c.accounts.map(acc).join('')+'</div><div class="op-set-help">Business posts count as business content on your card, personal posts as personal content.</div>' : '')+
    (ui.igErr ? '<div class="op-set-warn">&#9888; '+escapeHtml(ui.igErr)+'</div>' : '')+'</div>';
}
ACTIONS.igSave = function(){
  const i = document.getElementById('igToken'), v = i ? i.value.trim() : '';
  if(!v){ if(i) i.focus(); return; }
  if(i) i.value = '';
  fetchWithin(WAKE_HELPER+'ig/key?t='+hexUtf8(v), 6000).then(function(r){
    if(r && r.ok){ ui.igHasKey = true; renderView(); ACTIONS.igFind(); }
    else (typeof opLauncherWhy==='function' ? opLauncherWhy() : Promise.resolve('the Operator app isn’t answering.')).then(function(why){ showToast('Couldn’t save the token — '+why, {icon:'&#9888;', duration:10000}); });
  });
};
ACTIONS.igFind = async function(){
  ui.igErr = null;
  try{ ui.igFound = await igFindAccounts(); if(!ui.igFound.length) ui.igErr = 'No Instagram Business/Creator accounts on this token — link one to a Facebook Page first.'; }
  catch(e){ ui.igErr = e.message; }
  renderView();
};
ACTIONS.igAdd = function(el, e, id){
  const c = igCfg(), a = (ui.igFound || []).find(function(x){ return x.id===id; }); if(!a) return;
  if(c.accounts.some(function(x){ return x.id===id; })) c.accounts = c.accounts.filter(function(x){ return x.id!==id; });
  else c.accounts.push({id:a.id, username:a.username, role:c.accounts.some(function(x){ return x.role==='business'; }) ? 'personal' : 'business'});
  persist('settings'); renderView(); if(c.accounts.length) igRefresh(true);
};
ACTIONS.igRole = function(el, e, id){ const a = igCfg().accounts.find(function(x){ return x.id===id; }); if(a){ a.role = el.dataset.role; persist('settings'); renderView(); } };
ACTIONS.igDrop = function(el, e, id){ const c = igCfg(); c.accounts = c.accounts.filter(function(x){ return x.id!==id; }); persist('settings'); renderView(); };
ACTIONS.igForget = function(){ fetchWithin(WAKE_HELPER+'ig/forget', 6000).then(function(){ ui.igHasKey = false; renderView(); }); };
ACTIONS.igRefresh = function(){ igRefresh(); };
ACTIONS.igConnect = function(){ ui.view = 'settings'; ui.settingsTab = 'integrations'; renderView(); };

// ---- the Social page: Instagram up top ----
function igSectionHtml(){
  const c = igCfg();
  if(!igOn()) return '<div class="ig-connect"><div class="ig-connect-i">&#128247;</div><div><b>Connect Instagram</b><span>Followers, every post’s likes, comments and reach — and your business and personal posts counted on your card by themselves.</span></div><button class="btn btn-primary btn-sm" data-action="igConnect">Connect</button></div>';
  igMaybeRefresh();
  if(!c.cache) return '<div class="ig-sec"><div class="gp-loading">'+(ui.igErr ? '&#9888; '+escapeHtml(ui.igErr)+' <button class="btn btn-ghost btn-sm" data-action="igRefresh">Try again</button>' : 'Loading your Instagram…')+'</div></div>';
  const since30 = addDays(todayStr(), -30), today = todayStr();
  return '<div class="ig-sec">'+c.accounts.map(function(a){
    const d = c.cache.data[a.id]; if(!d) return '';
    const recent = d.posts.filter(function(p){ return p.date > since30; });
    const avg = function(k){ const xs = recent.filter(function(p){ return p[k]!=null; }); return xs.length ? Math.round(xs.reduce(function(t, p){ return t + p[k]; }, 0)/xs.length) : null; };
    const days = {}; recent.forEach(function(p){ days[p.date] = (days[p.date]||0) + 1; });
    const strip = []; for(let i=29;i>=0;i--){ const dd = addDays(today, -i); strip.push('<i class="'+(days[dd] ? 'is-on' : '')+'" title="'+escapeHtml(fmtDateShort(dd))+(days[dd] ? ': '+days[dd]+' post'+(days[dd]===1?'':'s') : '')+'"></i>'); }
    const top = d.posts.slice(0, 30).sort(function(x, y){ return (y.likes + y.comments*3) - (x.likes + x.comments*3); }).slice(0, 6);
    const stat = function(k, v){ return '<div class="ig-st"><b>'+(v==null ? '—' : Number(v).toLocaleString())+'</b><span>'+k+'</span></div>'; };
    return '<div class="ig-acct"><div class="ig-h">'+(d.pic ? '<img class="ig-pic" src="'+escapeHtml(d.pic)+'" alt="">' : '<span class="ig-pic"></span>')+
        '<div><b>@'+escapeHtml(d.username)+'</b><span class="ig-role is-'+a.role+'">'+(a.role==='business' ? 'Business' : 'Personal')+'</span></div></div>'+
      '<div class="ig-stats">'+stat('followers', d.followers)+stat('posts · 30 days', recent.length)+stat('avg likes', avg('likes'))+stat('avg comments', avg('comments'))+stat('avg reach', avg('reach'))+'</div>'+
      '<div class="ig-strip-k">Posting, last 30 days</div><div class="ig-strip">'+strip.join('')+'</div>'+
      (top.length ? '<div class="ig-top">'+top.map(function(p){ return '<a class="ig-post" href="'+escapeHtml(p.link||'#')+'" target="_blank" rel="noopener" title="'+escapeHtml(p.cap)+'">'+(p.thumb ? '<img src="'+escapeHtml(p.thumb)+'" alt="" loading="lazy">' : '<span class="ig-noimg">'+escapeHtml(String(p.type||'Post').toLowerCase())+'</span>')+'<span class="ig-post-s">&#9829; '+p.likes.toLocaleString()+' &middot; &#128172; '+p.comments.toLocaleString()+'</span></a>'; }).join('')+'</div>' : '')+
    '</div>';
  }).join('')+'<div class="ig-foot">Updated '+(typeof ghlAgo==='function' ? ghlAgo(c.cache.at) : new Date(c.cache.at).toLocaleTimeString())+' <button class="btn btn-ghost btn-sm" data-action="igRefresh">'+(ui.igLoading ? 'Refreshing…' : '&#8635; Refresh')+'</button></div></div>';
}
