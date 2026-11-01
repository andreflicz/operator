// ============ ROUND 66 (part 2) ============
// Notifications you set up yourself (what, and how each shows up), social notifications for your page and your clients'
// ad leads, XP for engagement on your page (small and steady, a bonus when a post takes off), the bell in the player at
// the top right, and the client report back (Social only): a designed PDF, with your own words and their journal.
// Everything stored here is kept small (capped lists, totals instead of history).

// ================= XP from outside the day (engagement, challenges) =================
function r66XpLog(){ const p = state.profile; if(!Array.isArray(p.r66XpLog)) p.r66XpLog = []; return p.r66XpLog; }
function r66XpAdd(e){
  if(!e || !(e.xp > 0)) return;
  const L = r66XpLog(), same = L.find(function(x){ return x.d===e.d && x.k===e.k && e.k==='social' && x.why===e.why; });
  if(same) same.xp += Math.round(e.xp); else L.push({d:e.d, why:String(e.why).slice(0, 80), xp:Math.round(e.xp), k:e.k, a:e.a || 'personal'});
  if(L.length > 400) L.splice(0, L.length - 400);
  persist('profile');
  try{ if(typeof xpCache!=='undefined' && xpCache) xpCache.sum = null; }catch(err){}
}
r43OneOffs = (function(base){
  return function(){ const o = base.apply(this, arguments); r66XpLog().forEach(function(e){ o.events.push({d:e.d, why:e.why, xp:e.xp, k:e.k, a:e.a}); }); return o; };
})(r43OneOffs);
xpSummary = (function(base){
  return function(){ const x = base.apply(this, arguments); if(x && Array.isArray(x.oneOffs)) x.won = x.oneOffs.filter(function(e){ return e.k==='client'; }).length; return x; };
})(xpSummary);
xpSig = (function(base){ return function(){ const L = r66XpLog(); return base.apply(this, arguments)+'|r66:'+L.length+':'+L.reduce(function(a, e){ return a + e.xp; }, 0); }; })(xpSig);
// (the XP guide says so)
r43GuideHtml = (function(base){
  return function(){
    const h = base.apply(this, arguments);
    const rows = [['Likes on your page', '+1 per 10', 'Your personal account; '+R66_XP.cap+' a day at most from likes, comments and shares'], ['A comment on your page', '+'+R66_XP.comment, ''], ['A share', '+'+R66_XP.share, ''], ['A post that takes off', '+'+R66_XP.viral, 'Once per post: '+R66_XP.viralLikes+'+ likes at once, or triple its usual'],
      ['Finishing a challenge', 'By level and length', 'Warm-up 20 a day, Build 30, Commit 40, Hard 60 (×1.2 when a miss means day 1)']];
    return h+'<div class="xpg-sec">Your page and your challenges</div>'+r43Tbl(['Action', 'XP', 'Notes'], rows);
  };
})(r43GuideHtml);
const R66_XP = {perLikes:10, comment:5, share:8, cap:300, viral:250, viralLikes:500};

// ================= Notification settings =================
const R66_CATS = [
  {id:'deadline', name:'Deadlines', icon:'&#9201;', how:'corner'},
  {id:'client', name:'Clients', icon:'&#128101;', how:'corner'},
  {id:'lead', name:'Leads', icon:'&#127919;', how:'corner'},
  {id:'calendar', name:'Calendar', icon:'&#128197;', how:'banner'},
  {id:'playbook', name:'Playbooks', icon:'&#9776;', how:'list'},
  {id:'social', name:'Your page', icon:'&#10084;&#65039;', how:'corner'},
  {id:'ads', name:'Clients’ ad leads', icon:'&#128226;', how:'banner'},
  {id:'other', name:'Everything else', icon:'&#128276;', how:'list'}
];
const R66_HOW = [['banner', 'Banner up top'], ['corner', 'Top right'], ['list', 'Just the list']];
function r66N(){
  const s = state.settings; if(!s.r66Notif || typeof s.r66Notif!=='object') s.r66Notif = {};
  const N = s.r66Notif; if(!N.cats || typeof N.cats!=='object') N.cats = {}; if(!N.social || typeof N.social!=='object') N.social = {likes:true, comments:true, shares:true, followers:true};
  R66_CATS.forEach(function(c){ if(!N.cats[c.id]) N.cats[c.id] = {on:true, how:c.how}; });
  return N;
}
function r66Cat(n){
  if(n.r66cat) return n.r66cat;
  const k = String(n.key || '');
  if(/^pbb:|^pbl:/.test(k)) return 'playbook';
  if(n.kind==='deadline' || n.kind==='client' || n.kind==='lead') return n.kind;
  if(n.kind==='calendar' || n.kind==='event' || /^cal|^ev:/.test(k)) return 'calendar';
  return 'other';
}
notifList = (function(base){
  return function(){
    const N = r66N(), dis = notifDismissed(), today = todayStr();
    const out = base.apply(this, arguments).concat(r66Feed().filter(function(f){ return dis[f.key]!==today && !dis[f.key + ':done']; }).map(function(f){ return {key:f.key, kind:f.cat, r66cat:f.cat, level:'info', icon:f.icon, title:f.title, sub:f.sub, act:{a:f.cat==='ads' ? 'r66GoAds' : 'r66GoSocial', id:f.cli || ''}, sort:4}; }));
    return out.filter(function(n){ const c = N.cats[r66Cat(n)]; return !c || c.on!==false; });
  };
})(notifList);
ACTIONS.notifOpen = (function(base){
  return function(el, e, key){
    const n = notifByKey(key);
    if(n && n.act && (n.act.a==='r66GoSocial' || n.act.a==='r66GoAds')){ ui.notifOpen = false; const p = document.getElementById('notifPanel'); if(p) p.hidden = true; notifDismissed()[key + ':done'] = todayStr(); persist('focus'); ui.view = 'convos'; ui.socTab = n.act.a==='r66GoAds' ? 'ads' : 'overview'; renderView(); return; }
    return base.apply(this, arguments);
  };
})(ACTIONS.notifOpen);

// ================= The feed: your page, your clients' ad leads =================
function r66Feed(){ const f = state.focus; if(!Array.isArray(f.r66Feed)) f.r66Feed = []; return f.r66Feed; }
function r66FeedAdd(o){
  const F = r66Feed(); o.key = o.key || 'r66:'+uid(); o.at = Date.now();
  F.push(o); if(F.length > 60) F.splice(0, F.length - 60);
  const cutoff = Date.now() - 14*86400000; for(let i = F.length - 1; i >= 0; i--) if(F[i].at < cutoff) F.splice(i, 1);
  persist('focus');
}
function r66Personal(){
  let c; try{ c = igCfg(); }catch(e){ return null; } if(!c || !Array.isArray(c.accounts)) return null;
  const tot = {likes:0, comments:0, shares:0, followers:0, posts:{}}; let any = false;
  c.accounts.filter(function(a){ return a.role==='personal'; }).forEach(function(a){
    const d = sxAccountData(a); if(!d) return; any = true;
    tot.followers += Number(d.followers) || 0;
    arr(d.posts).slice(0, 40).forEach(function(p){ const l = Number(p.likes) || 0, cm = Number(p.comments) || 0, sh = Number(p.shares) || 0; tot.likes += l; tot.comments += cm; tot.shares += sh; tot.posts[String(p.id)] = [l, cm, sh, String(p.cap || '').slice(0, 60)]; });
  });
  return any ? tot : null;
}
function r66SocialTick(){
  const now = r66Personal(); if(!now) return;
  const s = state.settings, was = s.r66Soc, N = r66N(), today = todayStr();
  // (only totals and the last 40 posts' counts are kept)
  const keep = {likes:now.likes, comments:now.comments, shares:now.shares, followers:now.followers, posts:{}, at:Date.now()};
  Object.keys(now.posts).slice(0, 40).forEach(function(id){ keep.posts[id] = now.posts[id].slice(0, 3); });
  s.r66Soc = keep;
  if(!was){ persist('settings'); return; }
  const dl = Math.max(0, now.likes - was.likes), dc = Math.max(0, now.comments - was.comments), ds = Math.max(0, now.shares - was.shares), df = Math.max(0, now.followers - was.followers);
  // a post that took off
  Object.keys(now.posts).forEach(function(id){
    const p = now.posts[id], o = (was.posts || {})[id]; if(!o) return;
    const jump = p[0] - o[0];
    if((jump >= R66_XP.viralLikes || (o[0] >= 50 && p[0] >= o[0]*3)) && !(s.r66Viral || {})[id]){
      s.r66Viral = s.r66Viral || {}; s.r66Viral[id] = today;
      const ks = Object.keys(s.r66Viral); if(ks.length > 50) delete s.r66Viral[ks[0]];
      r66FeedAdd({cat:'social', icon:'&#128640;', title:'Your post is taking off', sub:'+'+jump.toLocaleString()+' likes'+(p[3] ? ' · “'+p[3]+'”' : '')});
      r66XpAdd({d:today, why:'A post that took off', xp:R66_XP.viral, k:'viral', a:'personal'});
    }
  });
  const bits = [];
  if(dl && N.social.likes) bits.push('&#10084;&#65039; '+dl.toLocaleString()+' like'+(dl===1 ? '' : 's'));
  if(dc && N.social.comments) bits.push('&#128172; '+dc+' comment'+(dc===1 ? '' : 's'));
  if(ds && N.social.shares) bits.push('&#8599; '+ds+' share'+(ds===1 ? '' : 's'));
  if(df && N.social.followers) bits.push('&#128100; '+df+' new follower'+(df===1 ? '' : 's'));
  if(bits.length) r66FeedAdd({cat:'social', icon:'&#10084;&#65039;', title:'Your page', sub:bits.join(' · ')});
  // XP: small and steady, up to a cap a day
  const xp = Math.floor(dl/R66_XP.perLikes) + dc*R66_XP.comment + ds*R66_XP.share;
  if(xp > 0){ const got = r66XpLog().filter(function(e){ return e.d===today && e.k==='social'; }).reduce(function(a, e){ return a + e.xp; }, 0), room = Math.max(0, R66_XP.cap - got); if(room) r66XpAdd({d:today, why:'Engagement on your page', xp:Math.min(room, xp), k:'social', a:'personal'}); }
  persist('settings');
}
function r66AdsTick(){
  if(typeof r53AdLedger!=='function' || typeof r53AllFor!=='function') return;
  const s = state.settings, was = s.r66AdSnap || null, now = {};
  mtActiveClients().forEach(function(c){ const T = r53AllFor(c.id); if(T && T.n) now[c.id] = Number(T.leads) || 0; });
  s.r66AdSnap = now;
  if(!was){ persist('settings'); return; }
  Object.keys(now).forEach(function(id){
    const d = now[id] - (was[id] || 0); if(d <= 0 || was[id]==null) return;
    const c = crmFind('client', id); if(!c) return;
    r66FeedAdd({cat:'ads', icon:'&#127919;', title:(c.business || c.name)+' got '+d+' new lead'+(d===1 ? '' : 's'), sub:'From their ad campaign', cli:id});
  });
  persist('settings');
}
setInterval(function(){ try{ r66SocialTick(); }catch(e){} try{ r66AdsTick(); }catch(e){} }, 60000);
setTimeout(function(){ try{ r66SocialTick(); }catch(e){} try{ r66AdsTick(); }catch(e){} }, 4000);
// (a refresh of the social numbers checks straight away)
if(typeof igRefreshAll==='function') igRefreshAll = (function(base){ return function(){ const r = base.apply(this, arguments); Promise.resolve(r).then(function(){ setTimeout(function(){ try{ r66SocialTick(); r66AdsTick(); }catch(e){} }, 500); }); return r; }; })(igRefreshAll);

// ================= How new ones show up: a banner up top, a card at the top right, or only the list =================
function r66Seen(){ const f = state.focus; if(!f.r66Seen || typeof f.r66Seen!=='object') f.r66Seen = {}; return f.r66Seen; }
function r66Pop(){
  if(document.hidden) return;
  const S = r66Seen(), N = r66N(), first = !state.focus.r66SeenInit, today = todayStr();
  let list; try{ list = notifList(); }catch(e){ return; }
  const fresh = list.filter(function(n){ return !S[n.key]; });
  fresh.forEach(function(n){ S[n.key] = today; });
  // (keep it small: two weeks of keys)
  const ks = Object.keys(S); if(ks.length > 500){ const cut = addDays(today, -14); ks.forEach(function(k){ if(S[k] < cut) delete S[k]; }); }
  if(first){ state.focus.r66SeenInit = true; persist('focus'); return; }
  if(fresh.length) persist('focus');
  fresh.slice(0, 3).forEach(function(n, i){ const c = N.cats[r66Cat(n)] || {}; setTimeout(function(){ r66Show(n, c.how || 'corner'); }, i*600); });
}
function r66Show(n, how){
  if(how==='list') return;
  if(how==='banner'){
    const old = document.getElementById('r66Ban'); if(old) old.remove();
    const b = document.createElement('div'); b.id = 'r66Ban'; b.className = 'r66-ban';
    b.innerHTML = '<div class="r66-ban-c" data-action="notifOpen" data-id="'+escapeHtml(n.key)+'"><span class="r66-ban-i">'+n.icon+'</span><div><b>'+escapeHtml(stripTags(n.title))+'</b>'+(n.sub ? '<span>'+n.sub+'</span>' : '')+'</div></div>';
    document.body.appendChild(b); requestAnimationFrame(function(){ b.classList.add('is-in'); });
    setTimeout(function(){ b.classList.remove('is-in'); setTimeout(function(){ b.remove(); }, 500); }, 5200);
    try{ playTick(); }catch(e){}
    return;
  }
  let box = document.getElementById('r66Toasts'); if(!box){ box = document.createElement('div'); box.id = 'r66Toasts'; box.className = 'r66-toasts'; document.body.appendChild(box); }
  const t = document.createElement('div'); t.className = 'r66-toast';
  t.innerHTML = '<button class="r66-toast-b" data-action="notifOpen" data-id="'+escapeHtml(n.key)+'"><span class="r66-toast-i">'+n.icon+'</span><span class="r66-toast-t"><b>'+escapeHtml(stripTags(n.title))+'</b>'+(n.sub ? '<small>'+n.sub+'</small>' : '')+'</span></button><button class="r66-toast-x" aria-label="Close">&#10005;</button>';
  t.querySelector('.r66-toast-x').addEventListener('click', function(ev){ ev.stopPropagation(); t.classList.remove('is-in'); setTimeout(function(){ t.remove(); }, 400); });
  box.appendChild(t); requestAnimationFrame(function(){ t.classList.add('is-in'); });
  while(box.children.length > 3) box.firstChild.remove();
  setTimeout(function(){ t.classList.remove('is-in'); setTimeout(function(){ t.remove(); }, 400); }, 6500);
}
function stripTags(s){ return String(s || '').replace(/<[^>]*>/g, ''); }
setInterval(function(){ try{ r66Pop(); }catch(e){} }, 45000);
setTimeout(function(){ try{ r66Pop(); }catch(e){} }, 6000);

// ================= The bell lives in the player (top right) =================
const R66_BELL_SVG = '<svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M6 8a6 6 0 0 1 12 0c0 7 3 9 3 9H3s3-2 3-9"/><path d="M10.3 21a1.94 1.94 0 0 0 3.4 0"/></svg>';
function r66BellCount(){ const c = document.getElementById('notifCount'), v = c ? String(c.textContent || '').trim() : ''; return c && v && v!=='0' && !c.hidden && getComputedStyle(c).display!=='none' ? v : ''; }
// (drawn as part of the player, so it never flickers)
if(typeof dockHtml==='function') dockHtml = (function(base){
  return function(){
    const h = base.apply(this, arguments), n = r66BellCount();
    return h.replace(/<div class="md-in[^"]*">/, function(m0){ return m0+'<button class="r66-bell'+(n ? ' has-n' : '')+(ui.notifOpen ? ' is-on' : '')+'" data-action="toggleNotifs" aria-label="Notifications" data-hov="Notifications">'+R66_BELL_SVG+'<i class="r66-bell-n">'+n+'</i></button>'; });
  };
})(dockHtml);
function r66Bell(){ try{ if(typeof dockRefresh==='function') dockRefresh(); }catch(e){} }
afterRenderHooks.push(function(){ try{ r66Bell(); }catch(e){} });
setInterval(function(){ try{ r66Bell(); }catch(e){} }, 1500);
document.addEventListener('pointerdown', function(e){ if(e.target.closest && e.target.closest('.r66-bell')) e.stopPropagation(); }, true);

// ================= Settings → Notifications =================
renderSettings = (function(base){
  return function(){
    const on = ui.settingsTab==='notif';
    if(on) ui.settingsTab = 'you';
    let h;
    try{ h = base.apply(this, arguments); } finally { if(on) ui.settingsTab = 'notif'; }
    const btn = '<button class="settings-nav-item'+(on ? ' active' : '')+'" data-action="settingsTab" data-tab="notif"><span style="margin-right:8px;">&#128276;</span>Notifications</button>';
    h = h.replace(/(<button class="settings-nav-item[^"]*" data-action="settingsTab" data-tab="op">[\s\S]*?<\/button>)/, '$1'+btn);
    if(!on) return h;
    h = h.replace(/<button class="settings-nav-item active" data-action="settingsTab" data-tab="you">/, '<button class="settings-nav-item" data-action="settingsTab" data-tab="you">');
    const cut = r60Cut(h, '<div class="settings-content'); if(!cut) return h;
    return h.replace(cut.html, '<div class="settings-content tab-panel" data-key="settings-notif">'+r66NotifSettingsHtml()+'</div>');
  };
})(renderSettings);
function r66NotifSettingsHtml(){
  const N = r66N();
  const row = function(c){
    const C = N.cats[c.id];
    return '<div class="r66-nr'+(C.on ? '' : ' is-off')+'"><span class="r66-nr-i">'+c.icon+'</span><b>'+c.name+'</b>'+
      '<div class="seg-tabs seg-sm r66-how">'+R66_HOW.map(function(h){ return '<button class="seg-tab'+(C.how===h[0] ? ' active' : '')+'" data-action="r66NHow" data-id="'+c.id+'|'+h[0]+'"'+(C.on ? '' : ' disabled')+'>'+h[1]+'</button>'; }).join('')+'</div>'+
      '<button class="r66-sw'+(C.on ? ' is-on' : '')+'" data-action="r66NOn" data-id="'+c.id+'" aria-label="'+(C.on ? 'Turn off' : 'Turn on')+'"><i></i></button></div>';
  };
  const sub = function(k, l){ return '<button class="r66-chip'+(N.social[k] ? ' is-on' : '')+'" data-action="r66NSoc" data-id="'+k+'">'+(N.social[k] ? '&#10003; ' : '')+l+'</button>'; };
  return '<div class="card section r66-ns"><div class="section-title">Notifications</div>'+
    '<div class="r66-nrs">'+R66_CATS.map(row).join('')+'</div>'+
    '<div class="r66-nsub"><span>Your page: tell me about</span>'+sub('likes', 'Likes')+sub('comments', 'Comments')+sub('shares', 'Shares')+sub('followers', 'New followers')+'</div>'+
    '<div class="r66-ntry"><button class="btn btn-sm" data-action="r66NTry" data-id="banner">See a banner</button><button class="btn btn-sm" data-action="r66NTry" data-id="corner">See a top-right one</button></div>'+
  '</div>';
}
ACTIONS.r66NOn = function(el, e, id){ const C = r66N().cats[id]; if(!C) return; C.on = !C.on; persist('settings'); playTick(); renderView(); try{ notifBadge(); }catch(err){} };
ACTIONS.r66NHow = function(el, e, v){ const a = String(v).split('|'), C = r66N().cats[a[0]]; if(!C) return; C.how = a[1]; persist('settings'); playTick(); renderView(); };
ACTIONS.r66NSoc = function(el, e, k){ const N = r66N(); N.social[k] = !N.social[k]; persist('settings'); playTick(); renderView(); };
ACTIONS.r66NTry = function(el, e, how){ r66Show({key:'r66:try', icon:'&#128276;', title:how==='banner' ? 'A banner, up top' : 'A note, top right', sub:'This is how they’ll show up.'}, how); };

// ================= G15. The client report: a designed PDF, only in Social =================
r58FocusHtml = (function(base){
  return function(){
    const h = base.apply(this, arguments); if(!h) return h;
    const id = ui.r58Acct, cl = typeof r58Clients==='function' ? r58Clients().find(function(x){ return x.id===id; }) : null;
    if(!cl || !cl.client) return h;
    return h.replace(/(<div class="r58-facts">)/, '$1<button class="btn btn-primary btn-sm r66-repb" data-action="r66RepOpen" data-id="'+cl.client.id+'">&#128196; Monthly report</button>');
  };
})(r58FocusHtml);
function r66RepData(c, ym){
  const y = Number(ym.slice(0, 4)), m = Number(ym.slice(5, 7)) - 1;
  const accs = typeof r55CliAccounts==='function' ? r55CliAccounts(c.id) : [];
  const soc = {followers:0, posts:0, views:0, likes:0, best:null, accounts:[]};
  accs.forEach(function(a){ const d = r55CliData(a.id) || {}; soc.accounts.push('@'+(a.username || '')); soc.followers += Number(d.followers || a.followers) || 0; soc.posts += Number(d.p30) || 0; soc.views += Number(d.views) || 0; soc.likes += Number(d.likes) || 0; if(d.best && (!soc.best || (d.best.views || 0) > (soc.best.views || 0))) soc.best = d.best; });
  const plan = typeof r57ContentPlan==='function' ? r57ContentPlan(c, ym) : [];
  const L = typeof r53AdLedger==='function' ? r53AdLedger() : {}, camps = [];
  Object.keys(L).forEach(function(id){ const k = L[id]; let cl = null; try{ cl = adClientOf({id:id, acct:k.acct}); }catch(e){} if(cl!==c.id) return; camps.push({name:k.name, spend:Number(k.spend) || 0, leads:Number(k.leads) || 0, imp:Number(k.imp) || 0, clicks:Number(k.clicks) || 0, cur:k.currency || 'USD'}); });
  camps.sort(function(a, b){ return b.spend - a.spend; });
  const ads = camps.reduce(function(a, k){ a.spend += k.spend; a.leads += k.leads; a.imp += k.imp; a.clicks += k.clicks; a.cur = a.cur || k.cur; return a; }, {spend:0, leads:0, imp:0, clicks:0, cur:null});
  const journal = arr(c.journal).filter(function(j){ return monthKeyOf(j.date || '')===ym; });
  return {c:c, ym:ym, label:new Date(y, m, 1).toLocaleDateString(undefined, {month:'long', year:'numeric'}), soc:soc, plan:plan, done:plan.filter(function(p){ return p.st==='done'; }).length, camps:camps, ads:ads, journal:journal};
}
function r66Store(c){ if(!c.r66Rep || typeof c.r66Rep!=='object') c.r66Rep = {}; return c.r66Rep; }
ACTIONS.r66RepOpen = function(el, e, id){ ui.r66Rep = {id:id, ym:thisMonthKey()}; r66RepRender(); };
function r66RepRender(){
  const R = ui.r66Rep; if(!R) return;
  const c = crmFind('client', R.id); if(!c) return;
  let o = document.getElementById('r66Rep');
  if(!o){ o = document.createElement('div'); o.id = 'r66Rep'; o.className = 'r66-rep-ov'; document.body.appendChild(o); }
  const D = r66RepData(c, R.ym), S = r66Store(c)[R.ym] || {};
  o.innerHTML = '<div class="r66-rep-bar"><button class="r66-rep-x" data-action="r66RepClose" aria-label="Close">&#10005;</button><div class="r66-rep-m"><button data-action="r66RepMonth" data-id="-1">&#8249;</button><b>'+escapeHtml(D.label)+'</b><button data-action="r66RepMonth" data-id="1">&#8250;</button></div>'+
    '<label class="r66-rep-f"><span>What you saw this month</span><textarea class="input" data-r66-rep="notes" rows="5" placeholder="The wins, what you learned, what you’re changing.">'+escapeHtml(S.notes || '')+'</textarea></label>'+
    '<button class="btn btn-sm" data-action="r66RepJournal"'+(D.journal.length ? '' : ' disabled')+'>&#128214; Pull from their journal'+(D.journal.length ? ' ('+D.journal.length+')' : '')+'</button>'+
    '<label class="r66-rep-f"><span>Next month</span><textarea class="input" data-r66-rep="next" rows="3" placeholder="The plan.">'+escapeHtml(S.next || '')+'</textarea></label>'+
    '<button class="btn btn-primary r66-rep-go" data-action="r66RepPdf">&#11015; Export PDF</button></div>'+
    '<div class="r66-rep-stage"><div class="r66-doc" id="r66Doc" style="--cc:'+clientAccent(c)+'">'+r66DocHtml(D, S)+'</div></div>';
}
function r66Money(v, cur){ try{ return adsMoney(v, cur || 'USD'); }catch(e){ return '$'+Math.round(v).toLocaleString(); } }
function r66DocHtml(D, S){
  const c = D.c, me = state.profile.businessName || state.profile.name || 'Your agency', n = function(v){ return v ? Number(v).toLocaleString() : '–'; };
  const tile = function(v, k){ return '<div class="r66d-t"><b>'+v+'</b><span>'+k+'</span></div>'; };
  const cpl = D.ads.leads ? r66Money(D.ads.spend/D.ads.leads, D.ads.cur) : '–', ctr = D.ads.imp ? (100*D.ads.clicks/D.ads.imp).toFixed(2)+'%' : '–';
  return '<section class="r66d-cover"><div class="r66d-brand">'+escapeHtml(me)+'</div><div class="r66d-k">Monthly report</div><h1>'+escapeHtml(c.business || c.name)+'</h1><div class="r66d-m">'+escapeHtml(D.label)+'</div>'+(D.soc.accounts.length ? '<div class="r66d-acc">'+escapeHtml(D.soc.accounts.join('  ·  '))+'</div>' : '')+'</section>'+
    '<section class="r66d-sec"><div class="r66d-h">The month in numbers</div><div class="r66d-tiles">'+tile(n(D.soc.followers), 'Followers')+tile(n(D.soc.views), 'Views (30 days)')+tile(n(D.soc.posts), 'Posts (30 days)')+tile(n(D.soc.likes), 'Likes (30 days)')+'</div></section>'+
    (D.plan.length ? '<section class="r66d-sec"><div class="r66d-h">Content delivered</div><div class="r66d-del"><div class="r66d-ring" style="--p:'+Math.round(100*D.done/D.plan.length)+'"><div><b>'+D.done+'</b><span>of '+D.plan.length+'</span></div></div><ul>'+D.plan.slice(0, 12).map(function(p){ return '<li class="is-'+p.st+'"><i></i>'+escapeHtml(p.what)+' '+p.n+'<small>'+escapeHtml(fmtDateShort(p.doneOn || p.date))+'</small></li>'; }).join('')+'</ul></div></section>' : '')+
    (D.camps.length ? '<section class="r66d-sec"><div class="r66d-h">Ads</div><div class="r66d-tiles">'+tile(r66Money(D.ads.spend, D.ads.cur), 'Spent')+tile(n(D.ads.leads), 'Leads')+tile(cpl, 'Cost per lead')+tile(ctr, 'Click-through')+'</div>'+
      '<table class="r66d-tbl"><thead><tr><th>Campaign</th><th>Spent</th><th>Leads</th><th>Per lead</th><th>CTR</th></tr></thead><tbody>'+D.camps.slice(0, 8).map(function(k){ return '<tr><td>'+escapeHtml(k.name)+'</td><td>'+r66Money(k.spend, k.cur)+'</td><td>'+n(k.leads)+'</td><td>'+(k.leads ? r66Money(k.spend/k.leads, k.cur) : '–')+'</td><td>'+(k.imp ? (100*k.clicks/k.imp).toFixed(2)+'%' : '–')+'</td></tr>'; }).join('')+'</tbody></table></section>' : '')+
    (D.soc.best ? '<section class="r66d-sec"><div class="r66d-h">Best post</div><div class="r66d-best"><b>'+n(D.soc.best.views)+' views</b><p>“'+escapeHtml(String(D.soc.best.cap || '').slice(0, 220))+'”</p></div></section>' : '')+
    (S.notes ? '<section class="r66d-sec"><div class="r66d-h">From '+escapeHtml(me)+'</div><div class="r66d-note">'+escapeHtml(S.notes).replace(/\n/g, '<br>')+'</div></section>' : '')+
    (S.next ? '<section class="r66d-sec"><div class="r66d-h">Next month</div><div class="r66d-note">'+escapeHtml(S.next).replace(/\n/g, '<br>')+'</div></section>' : '')+
    '<footer class="r66d-foot">'+escapeHtml(me)+' · '+escapeHtml(D.label)+'</footer>';
}
document.addEventListener('input', function(e){
  const t = e.target, k = t && t.getAttribute && t.getAttribute('data-r66-rep'); if(!k || !ui.r66Rep) return;
  const c = crmFind('client', ui.r66Rep.id); if(!c) return;
  const S = r66Store(c)[ui.r66Rep.ym] = r66Store(c)[ui.r66Rep.ym] || {}; S[k] = t.value.slice(0, 4000);
  clearTimeout(R66.repT); R66.repT = setTimeout(function(){ persist('business'); const d = document.getElementById('r66Doc'); if(d) d.innerHTML = r66DocHtml(r66RepData(c, ui.r66Rep.ym), S); }, 250);
});
ACTIONS.r66RepClose = function(){ ui.r66Rep = null; const o = document.getElementById('r66Rep'); if(o) o.remove(); };
ACTIONS.r66RepMonth = function(el, e, d){ const R = ui.r66Rep; if(!R) return; const y = Number(R.ym.slice(0, 4)), m = Number(R.ym.slice(5, 7)) - 1 + Number(d); const dt = new Date(y, m, 1); R.ym = dt.getFullYear()+'-'+pad2(dt.getMonth() + 1); r66RepRender(); };
ACTIONS.r66RepJournal = function(){
  const R = ui.r66Rep; if(!R) return; const c = crmFind('client', R.id); if(!c) return;
  const D = r66RepData(c, R.ym), S = r66Store(c)[R.ym] = r66Store(c)[R.ym] || {};
  const add = D.journal.map(function(j){ return '• '+String(j.text || '').replace(/\s+/g, ' ').trim().slice(0, 300); }).filter(function(t){ return (S.notes || '').indexOf(t) < 0; });
  if(!add.length){ showToast('Already in.'); return; }
  S.notes = ((S.notes || '').trim() ? S.notes.trim()+'\n' : '')+add.join('\n'); persist('business'); r66RepRender();
};
ACTIONS.r66RepPdf = function(){
  const R = ui.r66Rep; if(!R) return; const c = crmFind('client', R.id); if(!c) return;
  const name = (String(c.business || c.name).replace(/[^\w\- ]+/g, '').trim() || 'Client')+' – '+r66RepData(c, R.ym).label+'.pdf';
  document.body.classList.add('r66-printing');
  const done = function(){ setTimeout(function(){ document.body.classList.remove('r66-printing'); }, 400); };
  try{
    if(typeof OPAPP!=='undefined' && OPAPP && OPAPP.pdf){ OPAPP.pdf(name).then(function(r){ done(); if(r && r.saved) showToast('Saved: '+name, {icon:'&#128196;'}); }).catch(function(){ done(); }); return; }
  }catch(err){}
  setTimeout(function(){ try{ window.print(); }catch(err){} done(); }, 50);
};

// ================= G16. More from the ads (Zernio): a client's campaigns, right on their page in Social =================
r58FocusHtml = (function(base){
  return function(){
    const h = base.apply(this, arguments); if(!h) return h;
    const m = /data-action="r66RepOpen" data-id="([^"]+)"/.exec(h); if(!m) return h;
    const c = crmFind('client', m[1]); if(!c) return h;
    const D = r66RepData(c, thisMonthKey()); if(!D.camps.length) return h;
    const n = function(v){ return v ? Number(v).toLocaleString() : '–'; };
    const box = '<div class="r66-ads"><div class="r66-ads-h"><b>Ad campaigns</b><span>'+r66Money(D.ads.spend, D.ads.cur)+' spent · '+n(D.ads.leads)+' leads'+(D.ads.leads ? ' · '+r66Money(D.ads.spend/D.ads.leads, D.ads.cur)+' a lead' : '')+'</span></div>'+
      '<div class="r66-ads-t">'+D.camps.slice(0, 6).map(function(k){ return '<div class="r66-ads-r"><span>'+escapeHtml(k.name)+'</span><b>'+r66Money(k.spend, k.cur)+'</b><b>'+n(k.leads)+' leads</b><small>'+(k.leads ? r66Money(k.spend/k.leads, k.cur)+' each' : '–')+'</small><small>'+(k.imp ? (100*k.clicks/k.imp).toFixed(2)+'% CTR' : '')+'</small></div>'; }).join('')+'</div></div>';
    return h.replace(/<\/div>$/, box+'</div>');
  };
})(r58FocusHtml);
