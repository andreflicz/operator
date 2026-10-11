// ============ SOCIAL INSIGHTS, WITHOUT META OR GOHIGHLEVEL ============
// Two ways in, neither touches your Meta account:
//  • Metricool: connect Instagram (and the rest) inside Metricool, which has its own approved Meta
//    connection. Operator reads your posts and their numbers through Metricool's API with your token
//    (Metricool's Advanced plan). The token stays in the Operator app's file on this Mac.
//  • A CSV: export your content insights (Meta Business Suite → Insights → Content → Export, or a
//    Metricool export) and drop the file in. Nothing to connect at all.
// Either way it lands in the same place as before (32v): your posts, likes, comments, reach, the posting
// strip, Op's read, business vs personal content on your card, followers for XP.
const MC_ID = 'metricool';
function socialSrc(a){ return (a && a.src) || 'meta'; }
// ---- Metricool ----
async function mcApi(path){
  const r = await fetchWithin(WAKE_HELPER+'mc/api?p='+hexUtf8(path), 30000);
  let j = null; try{ j = r ? await r.json() : null; }catch(e){}
  if(!r || !r.ok || !j) throw new Error((j && (j.error && (j.error.message || j.error) || j.message)) || (r ? 'Metricool said no ('+r.status+')' : 'the Operator app isn’t answering'));
  return j;
}
const socNum = function(){ for(let i=0;i<arguments.length;i++){ const v = Number(arguments[i]); if(arguments[i]!=null && arguments[i]!=='' && isFinite(v)) return v; } return null; };
function mcWhen(m){
  const d = (m.publishedAt && (m.publishedAt.dateTime || m.publishedAt)) || m.created || m.date || m.publicationDate || m.timestamp;
  const t = typeof d==='number' ? (d < 1e12 ? d*1000 : d) : Date.parse(String(d||''));
  return isFinite(t) ? new Date(t) : null;
}
function mcPost(m){
  const when = mcWhen(m);
  return {id:String(m.postId || m.id || m.url || m.permalink || Math.random()), cap:String(m.content || m.text || m.caption || m.description || '').slice(0, 140), type:String(m.type || m.mediaType || m.postType || ''),
    at:when ? when.toISOString() : '', date:when ? ds2(when) : '', likes:socNum(m.likes, m.likeCount, m.reactions) || 0, comments:socNum(m.comments, m.commentsCount, m.commentCount) || 0,
    reach:socNum(m.reach, m.reachTotal), views:socNum(m.views, m.videoViews, m.plays, m.impressions, m.impressionsTotal), saves:socNum(m.saved, m.saves), shares:socNum(m.shares, m.shared),
    link:m.url || m.permalink || '', thumb:m.imageUrl || m.thumbnailUrl || m.image || m.picture || ''};
}
async function mcLoadAccount(a){
  const f = function(d){ return ds2(d)+'T00:00:00'; };
  const j = await mcApi('/v2/analytics/posts/instagram?from='+encodeURIComponent(f(new Date(Date.now() - 60*86400000)))+'&to='+encodeURIComponent(f(new Date(Date.now() + 86400000))));
  const list = Array.isArray(j) ? j : Array.isArray(j.data) ? j.data : Array.isArray(j.posts) ? j.posts : [];
  const posts = list.map(mcPost).filter(function(p){ return p.date; }).sort(function(x, y){ return y.date.localeCompare(x.date); });
  const fol = socNum(j.followers, j.followersCount, list[0] && list[0].followers);
  return {username:a.username || 'Instagram (Metricool)', followers:fol!=null ? fol : (Number(a.followers) || 0), pic:'', posts:posts};
}
ACTIONS.mcConnect = async function(){
  const v = function(id){ const el = document.getElementById(id); return el ? el.value.trim() : ''; };
  const t = v('mcToken'), u = v('mcUser').replace(/\D/g, ''), b = v('mcBlog').replace(/\D/g, '');
  if(!t || !u || !b){ const el = document.getElementById(!t ? 'mcToken' : !u ? 'mcUser' : 'mcBlog'); if(el) el.focus(); return; }
  ui.socErr = null; ui.socBusy = true; renderView();
  const r = await fetchWithin(WAKE_HELPER+'mc/key?t='+hexUtf8(t)+'&u='+u+'&b='+b, 8000);
  if(!r || !r.ok){ ui.socBusy = false; ui.socErr = r ? 'The Operator app didn’t take that.' : 'The Operator app isn’t answering. Open Operator from its icon.'; renderView(); return; }
  const c = igCfg(), role = ui.socRole || 'business';
  c.accounts = c.accounts.filter(function(a){ return a.id!==MC_ID; });
  c.accounts.push({id:MC_ID, src:'metricool', role:role, username:v('mcName') || 'Instagram', followers:Number(v('mcFollowers')) || 0});
  persist('settings'); ui.socBusy = false; ui.igTried = 0;
  await igRefresh(false);
  if(ui.igErr){ ui.socErr = ui.igErr; c.accounts = c.accounts.filter(function(a){ return a.id!==MC_ID; }); persist('settings'); renderView(); }
  else showToast('Metricool is connected.', {icon:'&#128202;'});
};
// ---- a CSV export ----
function csvParse(text){
  const rows = [], s = String(text||'').replace(/^﻿/, ''); let row = [], cell = '', q = false;
  for(let i=0;i<s.length;i++){
    const ch = s[i];
    if(q){ if(ch==='"'){ if(s[i+1]==='"'){ cell += '"'; i++; } else q = false; } else cell += ch; continue; }
    if(ch==='"') q = true; else if(ch===',' || ch===';' || ch==='\t'){ row.push(cell); cell = ''; } else if(ch==='\n' || ch==='\r'){ if(ch==='\r' && s[i+1]==='\n') i++; row.push(cell); rows.push(row); row = []; cell = ''; } else cell += ch;
  }
  if(cell || row.length){ row.push(cell); rows.push(row); }
  return rows.filter(function(r){ return r.some(function(c){ return String(c).trim(); }); });
}
// which column is which (Meta Business Suite and Metricool name them differently)
const CSV_COLS = {date:/^(publish(ed)? ?time|date|published|created|post date|fecha)/i, cap:/^(description|text|caption|title|content|post)$/i, link:/^(permalink|url|link|post link)/i, type:/^(post type|type|media type|format)/i,
  likes:/^(likes|reactions|like count)/i, comments:/^(comments|comment count)/i, shares:/^(shares|shared)/i, saves:/^(saves|saved)/i, reach:/^(reach|accounts reached)/i, views:/^(views|plays|impressions|video views)/i, followers:/^(followers|follower count|followers count)/i};
function csvToPosts(rows){
  if(rows.length < 2) return {posts:[], followers:null};
  const head = rows[0].map(function(h){ return String(h).trim(); }), idx = {};
  Object.keys(CSV_COLS).forEach(function(k){ const i = head.findIndex(function(h){ return CSV_COLS[k].test(h); }); if(i >= 0) idx[k] = i; });
  if(idx.date==null) return {posts:[], followers:null, err:'That file has no date column. Export Content insights from Meta Business Suite (or Metricool) and try again.'};
  let fol = null;
  const posts = rows.slice(1).map(function(r, n){
    const g = function(k){ return idx[k]!=null ? String(r[idx[k]]||'').trim() : ''; }, nn = function(k){ const v = Number(g(k).replace(/[^\d.-]/g, '')); return g(k) && isFinite(v) ? v : null; };
    const t = Date.parse(g('date')); if(!isFinite(t)) return null;
    if(nn('followers')!=null) fol = Math.max(fol || 0, nn('followers'));
    return {id:'csv'+n+'-'+t, cap:g('cap').slice(0, 140), type:g('type'), at:new Date(t).toISOString(), date:ds2(new Date(t)), likes:nn('likes')||0, comments:nn('comments')||0, shares:nn('shares'), saves:nn('saves'), reach:nn('reach'), views:nn('views'), link:g('link'), thumb:''};
  }).filter(Boolean).sort(function(x, y){ return y.date.localeCompare(x.date); }).slice(0, 400);
  return {posts:posts, followers:fol};
}
ACTIONS.socCsvPick = function(el){
  ui.socRole = (el && el.dataset.id) || ui.socRole || 'business';
  let f = document.getElementById('socCsvFile');
  if(!f){ f = document.createElement('input'); f.type = 'file'; f.id = 'socCsvFile'; f.accept = '.csv,text/csv'; f.style.display = 'none'; document.body.appendChild(f); }
  f.click();
};
document.addEventListener('change', function(e){
  if(!e.target || e.target.id!=='socCsvFile' || !e.target.files || !e.target.files[0]) return;
  const file = e.target.files[0], rd = new FileReader();
  rd.onload = function(){ socImportCsv(String(rd.result||''), file.name); e.target.value = ''; };
  rd.readAsText(file);
});
function socImportCsv(text, name){
  const out = csvToPosts(csvParse(text));
  if(!out.posts.length){ ui.socErr = out.err || 'Couldn’t find any posts in '+(name || 'that file')+'.'; renderView(); return false; }
  const c = igCfg(), role = ui.socRole || 'business', id = 'csv-'+role;
  if(!c.csvData || typeof c.csvData!=='object') c.csvData = {};
  const prev = c.csvData[id], seen = {};
  // a newer export adds to what you had (same post, newest numbers win)
  const merged = out.posts.concat(prev ? prev.posts : []).filter(function(p){ const k = p.date+'|'+p.cap.slice(0, 40); if(seen[k]) return false; seen[k] = 1; return true; }).slice(0, 400);
  c.csvData[id] = {username:role==='business' ? 'Business account' : 'Personal account', followers:out.followers!=null ? out.followers : (prev ? prev.followers : 0), pic:'', posts:merged, at:Date.now()};
  if(!c.accounts.some(function(a){ return a.id===id; })) c.accounts.push({id:id, src:'csv', role:role});
  ui.socErr = null; persist('settings'); ui.igTried = 0; igRefresh(true);
  showToast(out.posts.length+' posts imported.', {icon:'&#128202;'});
  return true;
}
ACTIONS.socFollowersSet = function(el, e, id){
  const i = document.getElementById('socFol-'+id), n = Number(i && i.value); if(!(n >= 0)) return;
  const c = igCfg(), a = c.accounts.find(function(x){ return x.id===id; }); if(!a) return;
  a.followers = n; if(c.csvData && c.csvData[id]) c.csvData[id].followers = n;
  if(c.cache && c.cache.data && c.cache.data[id]) c.cache.data[id].followers = n;
  persist('settings'); renderView();
};
ACTIONS.socRemove = function(el, e, id){
  const c = igCfg(); c.accounts = c.accounts.filter(function(a){ return a.id!==id; });
  if(c.csvData) delete c.csvData[id]; if(c.cache && c.cache.data) delete c.cache.data[id];
  if(id===MC_ID) fetchWithin(WAKE_HELPER+'mc/forget', 5000);
  persist('settings'); renderView();
};
ACTIONS.socRole = function(el, e, id){ ui.socRole = id; renderView(); };
ACTIONS.socShow = function(el, e, id){ ui.socShow = ui.socShow===id ? null : id; renderView(); };
// ---- how you connect: Metricool, or a file, or (still there) Meta directly ----
function socialConnectHtml(){
  const role = ui.socRole || 'business', sh = ui.socShow;
  const roleSeg = '<div class="soc-role">'+[['business', 'Business account'], ['personal', 'Personal account']].map(function(x){ return '<button class="'+(role===x[0] ? 'is-on' : '')+'" data-action="socRole" data-id="'+x[0]+'">'+x[1]+'</button>'; }).join('')+'</div>';
  return '<div class="soc-connect">'+
    '<div class="soc-h"><b>Your social numbers</b><span>No Meta developer app, no GoHighLevel. Pick one.</span></div>'+roleSeg+
    '<div class="soc-opts">'+
      '<div class="soc-opt'+(sh==='mc' ? ' is-open' : '')+'"><button class="soc-opt-h" data-action="socShow" data-id="mc"><span>&#128202;</span><div><b>Metricool</b><small>Live. Connect Instagram in Metricool, paste your API token. Advanced plan.</small></div></button>'+
        (sh==='mc' ? '<div class="soc-form"><input class="input" id="mcToken" placeholder="API token (Metricool → Account settings → API)"><div class="soc-row"><input class="input" id="mcUser" placeholder="userId"><input class="input" id="mcBlog" placeholder="blogId"></div>'+
          '<div class="soc-row"><input class="input" id="mcName" placeholder="@handle (optional)"><input class="input" type="number" id="mcFollowers" placeholder="Followers now (optional)"></div>'+
          '<div class="soc-hint">userId and blogId are in the address when you open your brand in Metricool (…?blogId=123&userId=456).</div>'+
          '<button class="btn btn-primary" data-action="mcConnect"'+(ui.socBusy ? ' disabled' : '')+'>'+(ui.socBusy ? 'Connecting…' : 'Connect Metricool')+'</button></div>' : '')+'</div>'+
      '<div class="soc-opt"><button class="soc-opt-h" data-action="socCsvPick" data-id="'+role+'"><span>&#128196;</span><div><b>Import a CSV</b><small>No connection at all. Meta Business Suite → Insights → Content → Export (or a Metricool export), then drop it here.</small></div></button></div>'+
      '<div class="soc-opt is-quiet"><button class="soc-opt-h" data-action="igConnect"><span>&#128279;</span><div><b>Meta directly</b><small>Every post and your ad spend, with a read-only token. More setup.</small></div></button></div>'+
    '</div>'+
    (ui.socErr ? '<div class="soc-err">&#9888; '+escapeHtml(ui.socErr)+'</div>' : '')+
  '</div>';
}
// under your numbers: where they come from, update a CSV, set followers by hand for a source that doesn't send them
function socialSourcesHtml(){
  const c = igCfg(); if(!c.accounts.length) return '';
  return '<div class="soc-srcs">'+c.accounts.map(function(a){
    const s = socialSrc(a), d = c.cache && c.cache.data && c.cache.data[a.id];
    return '<div class="soc-src"><span class="soc-src-k">'+(s==='metricool' ? '&#128202; Metricool' : s==='csv' ? '&#128196; Imported' : '&#128279; Meta')+' &middot; '+(a.role==='business' ? 'Business' : 'Personal')+'</span>'+
      (s!=='meta' ? '<span class="soc-src-f"><input class="input" type="number" id="socFol-'+a.id+'" value="'+((d && d.followers) || a.followers || '')+'" placeholder="followers"><button class="btn btn-ghost btn-sm" data-action="socFollowersSet" data-id="'+a.id+'">Set</button></span>' : '')+
      (s==='csv' ? '<button class="btn btn-ghost btn-sm" data-action="socCsvPick" data-id="'+a.role+'">Import a newer file</button>' : '')+
      '<button class="btn btn-ghost btn-sm soc-x" data-action="socRemove" data-id="'+a.id+'">Remove</button></div>';
  }).join('')+'<button class="btn btn-ghost btn-sm" data-action="socShowAdd">&#65291; Another account</button>'+
  (ui.socAdd ? socialConnectHtml() : '')+'</div>';
}
ACTIONS.socShowAdd = function(){ ui.socAdd = !ui.socAdd; renderView(); };
