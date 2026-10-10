
// ============ BUSINESS → INBOX: GoHighLevel, inside Operator ============
// Chats     — every conversation, newest first, unread on top; open one and reply right there.
// Contacts  — everyone in GoHighLevel, searchable; open, edit, text/email, or make them a lead.
// Social    — the last 7 days from GHL's Social Planner (followers, reach, impressions,
//             engagement), with a "followers" goal of yours kept up to date from it.
// It refreshes itself every 45 seconds while you're looking at it.
function inboxState(){ if(!ui.inbox) ui.inbox = {mode:'social', chats:null, contacts:null, social:null, q:'', cq:'', loading:{}, err:null, at:0}; return ui.inbox; }
function inboxUnread(){ const g = state.settings && state.settings.ghl; return g && g.connected ? arr(g.inbox).length : 0; }
function initialsOf(n){ return String(n||'?').trim().split(/\s+/).slice(0, 2).map(function(w){ return w[0] ? w[0].toUpperCase() : ''; }).join('') || '?'; }
function ghlAgo(ts){ const t = typeof ts==='number' ? ts : Date.parse(ts); if(!t) return ''; const m = Math.round((Date.now()-t)/60000); return m<1 ? 'now' : m<60 ? m+'m' : m<1440 ? Math.round(m/60)+'h' : todayStr(new Date(t))===addDays(todayStr(), -1) ? 'yesterday' : fmtDateShort(todayStr(new Date(t))); }
async function inboxLoad(what, quiet){
  const s = inboxState(), g = ghlCfg(); if(!ghlOn()) return;
  s.loading[what] = true; if(!quiet) renderView();
  try{
    if(what==='chats'){
      const r = await ghlCall('GET', '/conversations/search?'+ghlQ({locationId:g.locationId, limit:60, sort:'desc', sortBy:'last_message_date', query:s.q||null}));
      s.chats = arr(r.conversations);
      // keep the bell honest
      g.inbox = s.chats.filter(function(cv){ return cv.contactId && Number(cv.unreadCount)>0 && /in/i.test(cv.lastMessageDirection||''); }).map(function(cv){ return {contactId:cv.contactId, convId:cv.id, name:cv.fullName || cv.contactName || '', body:cv.lastMessageBody || '', at:Number(cv.lastMessageDate) || Date.parse(cv.lastMessageDate) || 0}; });
    } else if(what==='contacts'){
      let r;
      try{ r = await ghlCall('POST', '/contacts/search', {locationId:g.locationId, pageLimit:100, query:s.cq||undefined}); }
      catch(e){ r = await ghlCall('GET', '/contacts/?'+ghlQ({locationId:g.locationId, limit:100, query:s.cq||null})); }
      s.contacts = arr(r.contacts);
    } else if(what==='social'){
      const acc = await ghlCall('GET', '/social-media-posting/'+encodeURIComponent(g.locationId)+'/accounts');
      const list = arr((acc.results && acc.results.accounts) || acc.accounts || acc.results);
      const ids = list.map(function(a){ return a.profileId || a.id || a._id; }).filter(Boolean);
      s.socialAccounts = list;
      if(!ids.length){ s.social = {empty:true}; g.socialCache = {at:Date.now(), data:{empty:true}}; }
      else {
        const st = await ghlCall('POST', '/social-media-posting/statistics?'+ghlQ({locationId:g.locationId}), {profileIds:ids});
        s.social = st.results || st;
        socialFeedGoals(s.social);
        s.socialScope = false;
        g.socialCache = {at:Date.now(), data:s.social};
      }
    }
    s.err = null; s.at = Date.now();
    persist('settings');
  }catch(e){ s.err = e.message; if(what==='social' && /403|scope/i.test(e.message)) s.socialScope = true; }
  s.loading[what] = false;
  if(ui.view==='convos' || what==='social') renderView(); else notifBadge();
  convoBadge();
}
// keep a "followers" goal (e.g. "IG followers") in step with the real number
function socialFeedGoals(st){
  const f = st && st.platformTotals && st.platformTotals.followers; if(!f) return;
  arr(state.goals && state.goals.items).forEach(function(gl){
    if(gl.autoTrack || gl.done || !/follower/i.test(gl.label||'')) return;
    const want = /insta|\big\b/i.test(gl.label) ? 'instagram' : /face|\bfb\b/i.test(gl.label) ? 'facebook' : /tiktok/i.test(gl.label) ? 'tiktok' : /youtube|\byt\b/i.test(gl.label) ? 'youtube' : /linkedin/i.test(gl.label) ? 'linkedin' : null;
    const v = want ? (f[want] && f[want].total) : Object.keys(f).reduce(function(a, k){ return a + (Number(f[k].total)||0); }, 0);
    if(v!=null && Number(v)!==Number(gl.current)){ gl.current = Number(v); gl.syncedFrom = 'ghl'; }
  });
  persist('goals');
}
let inboxTimer = null;
function inboxTick(){
  clearTimeout(inboxTimer);
  inboxTimer = setTimeout(function(){
    if(ui.view==='convos' && !document.hidden && ghlOn()){ const s = inboxState(); if(s.mode!=='social') inboxLoad(s.mode, true); }
    inboxTick();
  }, 45000);
}
ACTIONS.inboxMode = function(el, e, id){ const s = inboxState(); if(s.mode!==id) playNav(); s.mode = id; renderView(); if(id!=='social' && !s[id] && !s.loading[id]) inboxLoad(id); };
ACTIONS.inboxRefresh = function(){ inboxLoad(inboxState().mode); };
ACTIONS.inboxOpen = function(el, e, id){
  const r = ghlRecordForContact(id);
  ui.ghlPane = {cid:id, kind:r ? r.kind : null, id:r ? r.x.id : null, tab:'messages', channel:'SMS', data:{}, loading:{}, err:null, inline:true};
  renderView();
  ghlLoadTab('contact').then(function(){ ghlLoadTab('messages').then(function(){ const s = inboxState(); arr(s.chats).forEach(function(cv){ if(cv.contactId===id) cv.unreadCount = 0; }); renderView(); }); });
};
document.addEventListener('input', function(e){
  const t = e.target; if(!t) return;
  if(t.id==='inboxQ'){ inboxState().q = t.value; clearTimeout(ui._inQ); ui._inQ = setTimeout(function(){ inboxLoad('chats', true); }, 350); }
  if(t.id==='contactQ'){ inboxState().cq = t.value; clearTimeout(ui._inC); ui._inC = setTimeout(function(){ inboxLoad('contacts', true); }, 350); }
});
// a new contact (and, if you like, a lead here at the same time)
ACTIONS.inboxNewContact = function(){ const s = inboxState(); s.adding = !s.adding; renderView(); };
ACTIONS.inboxSaveContact = async function(){
  const v = function(id){ const el = document.getElementById(id); return el ? el.value.trim() : ''; };
  const name = v('ncName'); if(!name) return;
  const g = ghlCfg(), body = Object.assign({locationId:g.locationId, source:'Operator', email:v('ncEmail') || undefined, phone:v('ncPhone') || undefined, companyName:v('ncCompany') || undefined, name:name}, ghlSplitName(name));
  try{
    const r = await ghlCall('POST', '/contacts/upsert', body);
    const c = r.contact || r;
    const asLead = document.getElementById('ncLead');
    if(asLead && asLead.checked && c && c.id){
      const x = {id:uid(), name:name, company:v('ncCompany') || name, phone:v('ncPhone'), email:v('ncEmail'), notes:'', leadSource:null, stage:'lead', createdAt:todayStr(), touchpoints:[], timeline:[], files:[], cadenceDays:null, value:0, trade:'', nextFollowUp:null, stageHistory:[], convertedClientId:null, ghlContactId:c.id};
      x.ghlSig = ghlSig(x);
      crmTimeline(x, 'note', 'Added from the Inbox'); state.business.pipeline.push(x); persist('business');
      ghlPushRecord('lead', x).catch(function(){});
    }
    inboxState().adding = false; playPositive(); showToast(name+' added to GoHighLevel.', {icon:'&#10003;'});
    inboxLoad('contacts');
  }catch(e){ inboxState().err = 'Couldn\'t add them: '+e.message; renderView(); }
};
ACTIONS.inboxMakeLead = function(el, e, id){
  const c = arr(inboxState().contacts).find(function(x){ return x.id===id; }); if(!c) return;
  const name = c.contactName || [c.firstName, c.lastName].filter(Boolean).join(' ') || c.email || 'Contact';
  const x = {id:uid(), name:name, company:c.companyName || name, phone:c.phone || '', email:c.email || '', notes:'', leadSource:null, stage:'lead', createdAt:todayStr(), touchpoints:[], timeline:[], files:[], cadenceDays:null, value:0, trade:'', nextFollowUp:null, stageHistory:[], convertedClientId:null, ghlContactId:c.id};
  x.ghlSig = ghlSig(x); crmTimeline(x, 'note', 'Added from GoHighLevel contacts');
  state.business.pipeline.push(x); persist('business'); playTaskAdded();
  ghlPushRecord('lead', x).catch(function(){});
  showToast(name+' is a lead now.', {icon:'&#127919;', actionLabel:'Open', actionAction:'openProspectEditModal', actionId:x.id});
  renderView();
};
function inboxChatsHtml(s){
  const list = arr(s.chats).slice().sort(function(a, b){ return (Number(b.unreadCount)>0) - (Number(a.unreadCount)>0) || (Number(b.lastMessageDate)||Date.parse(b.lastMessageDate)||0) - (Number(a.lastMessageDate)||Date.parse(a.lastMessageDate)||0); });
  const open = ui.ghlPane && ui.ghlPane.inline ? ui.ghlPane.cid : null;
  return '<div class="ib-split">'+
    '<div class="ib-list">'+
      '<input class="input ib-search" id="inboxQ" placeholder="Search conversations…" value="'+escapeHtml(s.q||'')+'">'+
      (s.chats==null ? '<div class="gp-loading">Loading your conversations…</div>' : list.length ? list.map(function(cv){
        const name = cv.fullName || cv.contactName || cv.email || cv.phone || 'Someone', unread = Number(cv.unreadCount)>0, rec = ghlRecordForContact(cv.contactId);
        return '<button class="ib-row'+(unread?' is-unread':'')+(open===cv.contactId?' is-open':'')+'" data-action="inboxOpen" data-id="'+escapeHtml(cv.contactId)+'">'+
          '<span class="ib-av">'+escapeHtml(initialsOf(name))+'</span>'+
          '<span class="ib-txt"><span class="ib-name">'+escapeHtml(name)+(rec ? '<span class="ib-tag">'+(rec.kind==='client'?'Client':'Lead')+'</span>' : '')+'</span><span class="ib-last">'+(/out/i.test(cv.lastMessageDirection||'') ? 'You: ' : '')+escapeHtml(String(cv.lastMessageBody||'').slice(0, 90))+'</span></span>'+
          '<span class="ib-when">'+ghlAgo(cv.lastMessageDate)+(unread ? '<i class="ib-dot"></i>' : '')+'</span></button>';
      }).join('') : '<div class="gp-loading">No conversations'+(s.q ? ' match' : ' yet')+'.</div>')+
    '</div>'+
    '<div class="ib-pane">'+(ui.ghlPane && ui.ghlPane.inline ? ghlPaneHtml() : '<div class="ib-empty"><div style="font-size:32px;">&#128172;</div>Pick a conversation to read and reply.</div>')+'</div>'+
  '</div>';
}
function inboxContactsHtml(s){
  const open = ui.ghlPane && ui.ghlPane.inline ? ui.ghlPane.cid : null;
  return '<div class="ib-split">'+
    '<div class="ib-list">'+
      '<div class="row" style="gap:6px;"><input class="input ib-search" id="contactQ" placeholder="Search contacts…" value="'+escapeHtml(s.cq||'')+'" style="flex:1;"><button class="btn btn-primary btn-sm" data-action="inboxNewContact">'+(s.adding ? 'Cancel' : '+ New')+'</button></div>'+
      (s.adding ? '<div class="ib-new"><input class="input" id="ncName" placeholder="Name"><input class="input" id="ncPhone" placeholder="Phone"><input class="input" id="ncEmail" placeholder="Email"><input class="input" id="ncCompany" placeholder="Company">'+
        '<label class="kpi-sub" style="display:flex;gap:6px;align-items:center;"><input type="checkbox" id="ncLead" checked>Also a lead in Operator</label><button class="btn btn-good btn-sm" data-action="inboxSaveContact">Add to GoHighLevel</button></div>' : '')+
      (s.contacts==null ? '<div class="gp-loading">Loading contacts…</div>' : s.contacts.length ? s.contacts.map(function(c){
        const name = c.contactName || [c.firstName, c.lastName].filter(Boolean).join(' ') || c.email || c.phone || 'Contact', rec = ghlRecordForContact(c.id);
        return '<div class="ib-row ib-crow'+(open===c.id?' is-open':'')+'"><button class="ib-row-main" data-action="inboxOpen" data-id="'+escapeHtml(c.id)+'"><span class="ib-av">'+escapeHtml(initialsOf(name))+'</span>'+
          '<span class="ib-txt"><span class="ib-name">'+escapeHtml(name)+(rec ? '<span class="ib-tag">'+(rec.kind==='client'?'Client':'Lead')+'</span>' : '')+'</span><span class="ib-last">'+escapeHtml([c.companyName, c.phone, c.email].filter(Boolean).join(' · '))+'</span></span></button>'+
          (rec ? '' : '<button class="btn btn-ghost btn-sm" data-action="inboxMakeLead" data-id="'+escapeHtml(c.id)+'" title="Track them as a lead here">+ Lead</button>')+'</div>';
      }).join('') : '<div class="gp-loading">No contacts'+(s.cq ? ' match' : '')+'.</div>')+
    '</div>'+
    '<div class="ib-pane">'+(ui.ghlPane && ui.ghlPane.inline ? ghlPaneHtml() : '<div class="ib-empty"><div style="font-size:32px;">&#128101;</div>Pick someone to see everything about them.</div>')+'</div>'+
  '</div>';
}
function socialMetric(label, block, icon){
  if(!block) return '';
  const total = block.total!=null ? block.total : Object.keys(block.platforms||{}).reduce(function(a, k){ return a + (Number(block.platforms[k].value)||0); }, 0);
  const ch = Number(block.totalChange);
  return '<div class="sc-card"><div class="sc-k">'+icon+' '+label+'</div><div class="sc-v">'+Number(total||0).toLocaleString()+'</div>'+
    (isFinite(ch) && block.totalChange!=null ? '<div class="sc-ch '+(ch>=0?'is-up':'is-down')+'">'+(ch>=0?'&#9650; ':'&#9660; ')+Math.abs(ch).toFixed(ch%1?1:0)+'% vs last week</div>' : '')+
  '</div>';
}
function sparkline(series){
  const s = arr(series).map(Number); if(s.length<2) return '';
  const max = Math.max.apply(null, s), min = Math.min.apply(null, s), w = 120, h = 30;
  const pts = s.map(function(v, i){ return (i/(s.length-1)*w).toFixed(1)+','+(h - (max===min ? h/2 : (v-min)/(max-min)*h)).toFixed(1); }).join(' ');
  return '<svg class="sc-spark" viewBox="0 0 '+w+' '+h+'" preserveAspectRatio="none"><polyline points="'+pts+'"/></svg>';
}
function inboxSocialHtml(s){
  if(!s.social && !s.loading.social && s.err) return '<div class="ib-empty" style="padding:30px;">Couldn\'t get your social numbers from GoHighLevel. <button class="btn btn-ghost btn-sm" data-action="socialRefresh">Try again</button></div>';
  if(s.loading.social && !s.social) return '<div class="gp-loading">Loading your social stats…</div>';
  if(s.socialScope) return '<div class="ib-empty" style="padding:30px;"><div style="font-size:30px;">&#128202;</div><div>GoHighLevel needs two more permissions for this: <code>socialplanner/account.readonly</code> and <code>socialplanner/stat.readonly</code>.</div><div class="kpi-sub" style="margin-top:6px;">Add them to your Private Integration, then Disconnect and Connect again in Settings &rarr; Integrations.</div></div>';
  if(!s.social) return '<div class="ib-empty" style="padding:30px;">No social numbers yet. <button class="btn btn-ghost btn-sm" data-action="socialRefresh">Load them</button></div>';
  if(s.social.empty) return '<div class="ib-empty" style="padding:30px;"><div style="font-size:30px;">&#128247;</div>No social accounts connected in GoHighLevel\'s Social Planner yet — connect Instagram, Facebook or TikTok there and they\'ll show up here.</div>';
  const st = s.social, br = st.breakdowns || {}, f = st.platformTotals && st.platformTotals.followers || {};
  const eng = br.engagement || {};
  const sum = function(o, key){ return Object.keys(o).reduce(function(a, k){ const x = o[k]||{}; return a + (Number(x[key])||0); }, 0); };
  const likes = sum(eng, 'likes'), comments = sum(eng, 'comments'), shares = sum(eng, 'shares'), engTotal = likes + comments + shares;
  const tot = function(block){ return !block ? 0 : block.total!=null ? Number(block.total)||0 : Object.keys(block.platforms||{}).reduce(function(a, k){ return a + (Number(block.platforms[k].value)||0); }, 0); };
  const reach = tot(br.reach), posts = tot(br.posts);
  const plats = Object.keys(f).map(function(k){ const ser = arr(f[k].series).map(Number), total = Number(f[k].total)||0; const first = ser.length ? ser[0] : total; return {k:k, total:total, series:ser, gain: ser.length>1 ? ser[ser.length-1] - first : null}; }).sort(function(a, b){ return b.total - a.total; });
  const followers = plats.reduce(function(a, x){ return a + x.total; }, 0);
  const gain = plats.reduce(function(a, x){ return a + (x.gain||0); }, 0), hasGain = plats.some(function(x){ return x.gain!=null; });
  const pct = function(n){ return (n*100).toFixed(n<0.1 ? 1 : 0)+'%'; };
  const nice = function(k){ return escapeHtml(k[0].toUpperCase()+k.slice(1)); };
  const PI = {instagram:'&#128247;', facebook:'&#128216;', tiktok:'&#127925;', youtube:'&#9654;&#65039;', linkedin:'&#128188;', twitter:'&#120143;', x:'&#120143;', google:'&#127760;', pinterest:'&#128204;'};
  return '<div class="sc sc2">'+
    // the headline: everyone who follows you, and how that moved this week
    '<div class="sc-hero">'+
      '<div><div class="sc-k">Total followers</div><div class="sc-big">'+followers.toLocaleString()+'</div>'+
        (hasGain ? '<div class="sc-ch '+(gain>=0?'is-up':'is-down')+'">'+(gain>=0?'&#9650; +':'&#9660; ')+gain.toLocaleString()+' this week</div>' : '')+'</div>'+
      '<div class="sc-hero-stats">'+
        '<div><b>'+reach.toLocaleString()+'</b><span>Reach</span></div>'+
        '<div><b>'+engTotal.toLocaleString()+'</b><span>Engagements</span></div>'+
        '<div><b>'+(reach ? pct(engTotal/reach) : '—')+'</b><span>Engagement rate</span></div>'+
        '<div><b>'+(posts ? Math.round(reach/posts).toLocaleString() : '—')+'</b><span>Reach per post</span></div>'+
      '</div>'+
    '</div>'+
    // each platform
    (plats.length ? '<div class="sc-plats">'+plats.map(function(x){ return '<div class="sc-card sc-plat"><div class="sc-plat-h"><span class="sc-plat-i">'+(PI[x.k.toLowerCase()]||'&#128241;')+'</span><b>'+nice(x.k)+'</b>'+
        (x.gain!=null ? '<span class="sc-ch '+(x.gain>=0?'is-up':'is-down')+'">'+(x.gain>=0?'+':'')+x.gain.toLocaleString()+'</span>' : '')+'</div>'+
        '<div class="sc-v">'+x.total.toLocaleString()+'</div><div class="kpi-sub">followers'+(followers ? ' &middot; '+Math.round(x.total/followers*100)+'% of all' : '')+'</div>'+sparkline(x.series)+'</div>'; }).join('')+'</div>' : '')+
    '<div class="sc-grid">'+
      socialMetric('Reach', br.reach, '&#128065;')+socialMetric('Impressions', br.impressions, '&#128200;')+socialMetric('Posts', br.posts, '&#128221;')+
    '</div>'+
    (engTotal ? '<div class="sc-card sc-eng"><div class="sc-k">&#10084;&#65039; Engagement</div><div class="sc-eng-bars">'+
      [['Likes', likes, '#ff6b8a'], ['Comments', comments, '#7fd4ff'], ['Shares', shares, '#7ef0c0']].map(function(r){ return '<div class="sc-eng-r"><span>'+r[0]+'</span><i><u style="width:'+(r[1]/Math.max(1, engTotal)*100).toFixed(1)+'%;background:'+r[2]+'"></u></i><b>'+r[1].toLocaleString()+'</b></div>'; }).join('')+'</div></div>' : '')+
    '<div class="kpi-sub" style="margin-top:10px;">Last 7 days, from GoHighLevel\'s Social Planner. A goal with "followers" in its name (like "IG followers") stays updated from these numbers.</div>'+
  '</div>';
}
function renderInboxTab(){
  if(!ghlCfg().connected) return '<div class="ib-empty" style="padding:40px;"><div style="font-size:34px;">&#128172;</div><div class="section-title" style="justify-content:center;">Your GoHighLevel inbox, here</div><div class="kpi-sub" style="margin:6px auto 14px;max-width:420px;">Connect GoHighLevel and your conversations, contacts and social stats live in this tab — reply without leaving Operator.</div><button class="btn btn-primary" data-action="goToIntegrations">Connect GoHighLevel</button></div>';
  const s = inboxState();
  if(s.mode==='social') return renderSocialTab();
  if(s[s.mode]==null && !s.loading[s.mode]) setTimeout(function(){ inboxLoad(s.mode); }, 0);
  if(!inboxTimer) inboxTick();
  return '<div class="ib">'+
    (s.err ? '<div class="ghl-err">&#9888; '+escapeHtml(s.err)+'</div>' : '')+
    (s.mode==='contacts' ? inboxContactsHtml(s) : inboxChatsHtml(s))+
  '</div>';
}
// ---- Conversations: its own place in the sidebar — Chats, Contacts and Social ----
function renderConversations(){
  const s = inboxState(), on = ghlCfg().connected;
  const tab = function(id, label, n){ return '<button class="seg-tab'+(s.mode===id?' active':'')+'" data-action="inboxMode" data-id="'+id+'">'+label+(n ? ' <span class="ib-badge">'+n+'</span>' : '')+'</button>'; };
  const at = s.mode==='social' ? (ghlCfg().socialCache && ghlCfg().socialCache.at) : s.at;
  return '<div class="view-header"><div><div class="view-title">Social'+tip('Your followers and how your posts are doing, plus your GoHighLevel chats and contacts.')+'</div></div>'+
      (on ? '<div class="row" style="gap:8px;align-items:center;">'+(at ? '<span class="kpi-sub">Updated '+ghlAgo(at)+'</span>' : '')+'<button class="btn btn-ghost btn-sm" data-action="'+(s.mode==='social' ? 'socialRefresh' : 'inboxRefresh')+'" title="Refresh">&#8635;</button></div>' : '')+'</div>'+
    // Instagram, straight from Instagram, up top (on the Stats tab, or always when GoHighLevel isn't connected)
    ((!on || s.mode==='social') && typeof igSectionHtml==='function' ? igSectionHtml() : '')+
    (on ? '<div class="seg-tabs cv-tabs">'+tab('social', '&#128202; Stats')+tab('chats', '&#128172; Chats', inboxUnread())+tab('contacts', '&#128101; Contacts')+'</div>' : '')+
    '<div class="tab-panel" data-key="convos-'+s.mode+'">'+renderInboxTab()+'</div>';
}
function convoBadge(){ const b = document.getElementById('convoBadge'); if(!b) return; const n = inboxUnread(); b.textContent = n ? String(n) : ''; b.classList.toggle('is-on', !!n); }
afterRenderHooks.push(convoBadge);
ACTIONS.goToIntegrations = function(){ ui.view = 'settings'; ui.settingsTab = 'integrations'; renderView(); };

// ---- Business → Social, and the Social panel (Focus, locked in, Today) ----
function socialData(){ const s = inboxState(), g = ghlCfg(); return s.social || (g.socialCache && g.socialCache.data) || null; }
function socialMaybeRefresh(maxAgeMs){
  const s = inboxState(), g = ghlCfg();
  if(!ghlOn() || s.loading.social) return;
  const at = (g.socialCache && g.socialCache.at) || 0;
  if(Date.now()-at > maxAgeMs) setTimeout(function(){ inboxLoad('social', true); }, 0);
}
function renderSocialTab(){
  const s = inboxState();
  if(!s.social && g_social()) s.social = g_social();
  socialMaybeRefresh(10*60000);
  return '<div class="ib">'+(s.err && s.mode==='social' && !s.social ? '<div class="ghl-err">&#9888; '+escapeHtml(s.err)+'</div>' : '')+inboxSocialHtml(s)+'</div>';
}
function g_social(){ const g = ghlCfg(); return g.socialCache && g.socialCache.data; }
ACTIONS.socialRefresh = function(){ inboxLoad('social'); };
ACTIONS.goToSocial = function(){ ui.view = 'convos'; inboxState().mode = 'social'; renderView(); };
ACTIONS.goToConvos = function(){ ui.view = 'convos'; renderView(); };
function renderSocialPanel(){
  if(!ghlOn()) return '';
  socialMaybeRefresh(60*60000);
  const d = socialData();
  if(!d || d.empty) return '';
  const br = d.breakdowns || {}, f = d.platformTotals && d.platformTotals.followers || {};
  const eng = br.engagement || {}, engTotal = Object.keys(eng).reduce(function(a, k){ const x = eng[k]||{}; return a + (Number(x.likes)||0) + (Number(x.comments)||0) + (Number(x.shares)||0); }, 0);
  const tile = function(k, v, ch, extra){ return '<div class="sp-tile"><div class="sp-k">'+k+'</div><div class="sp-v">'+Number(v||0).toLocaleString()+'</div>'+(ch!=null && isFinite(ch) ? '<div class="sc-ch '+(ch>=0?'is-up':'is-down')+'">'+(ch>=0?'&#9650; ':'&#9660; ')+Math.abs(ch).toFixed(ch%1?1:0)+'%</div>' : '')+(extra||'')+'</div>'; };
  const followers = Object.keys(f).reduce(function(a, k){ return a + (Number(f[k].total)||0); }, 0);
  return '<div class="section social-panel"><div class="sp-head" data-action="goToSocial" title="Open Social">'+
      '<span class="sp-icon">&#128241;</span><div class="sp-head-t"><div class="sp-title">Social</div><div class="sp-sub">'+(followers ? followers.toLocaleString()+' followers &middot; ' : '')+'last 7 days</div></div>'+
      '<span class="sp-more">Open &rarr;</span></div>'+
    '<div class="sp-row">'+
      Object.keys(f).map(function(k){ return tile(escapeHtml(k[0].toUpperCase()+k.slice(1))+' followers', f[k].total, null, sparkline(f[k].series)); }).join('')+
      (br.reach ? tile('Reach', br.reach.total, br.reach.totalChange) : '')+
      (br.impressions ? tile('Impressions', br.impressions.total, br.impressions.totalChange) : '')+
      (engTotal ? tile('Engagement', engTotal) : '')+
    '</div></div>';
}
