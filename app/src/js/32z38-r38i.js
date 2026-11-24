// ============ ROUND 38i ============
// • Social numbers: Apify instead of Metricool. Apify's Instagram scraper reads your public profile
//   (followers, your latest posts with likes, comments and views) with no Meta login and no developer
//   app. Its free plan comes with $5 of use a month and one check of a profile costs a fraction of a
//   cent, so checking twice a day is free in practice. The token stays in the Operator app's file on
//   this Mac (never in the app's data). The CSV import and Meta directly are still there.
// • The XP guide is up to date (Standing under Discipline, client deliverable tasks, the Log center).
// • Personal → You: the card turns cleanly (styles only).

// ---- Apify ----
const AP_FRESH = 12*3600000;   // a profile is checked at most twice a day (Refresh now skips the wait)
async function apGet(path, ms){
  const r = await fetchWithin(WAKE_HELPER+path, ms || 35000);
  let j = null; try{ j = r ? await r.json() : null; }catch(e){}
  if(!r || !r.ok || !j) throw new Error((j && j.error && (j.error.message || j.error)) || (r ? 'Apify said no ('+r.status+')' : 'the Operator app isn’t answering'));
  return j;
}
function apHandle(v){ return String(v || '').trim().replace(/^https?:\/\/(www\.)?instagram\.com\//i, '').replace(/^@/, '').split(/[/?#\s]/)[0].replace(/[^A-Za-z0-9._]/g, ''); }
function apPost(m){
  const t = Date.parse(m.timestamp || m.takenAt || '');
  const when = isFinite(t) ? new Date(t) : null;
  return {id:String(m.id || m.shortCode || m.url || Math.random()), cap:String(m.caption || '').slice(0, 140), type:m.productType==='clips' ? 'REELS' : String(m.type || ''),
    at:when ? when.toISOString() : '', date:when ? ds2(when) : '', likes:Math.max(0, socNum(m.likesCount, m.likes) || 0), comments:socNum(m.commentsCount, m.comments) || 0,
    views:socNum(m.videoPlayCount, m.videoViewCount, m.playCount), reach:null, saves:null, shares:null,
    link:m.url || (m.shortCode ? 'https://www.instagram.com/p/'+m.shortCode+'/' : ''), thumb:m.displayUrl || ''};
}
async function apLoadAccount(a){
  const c = igCfg(); if(!c.apData || typeof c.apData!=='object') c.apData = {};
  const prev = c.apData[a.id];
  if(prev && !ui.apForce && Date.now() - (prev.at || 0) < AP_FRESH) return prev;
  const run = await apGet('ap/start?u='+encodeURIComponent(a.username));
  let st = run && run.data; if(!st || !st.id) throw new Error('Apify didn’t start the check');
  const t0 = Date.now();
  while(!/^(SUCCEEDED|FAILED|ABORTED|TIMED-OUT|TIMED_OUT)$/.test(st.status) && Date.now() - t0 < 180000){
    await new Promise(function(res){ setTimeout(res, 5000); });
    const s2 = await apGet('ap/run?r='+encodeURIComponent(st.id)); if(s2 && s2.data) st = s2.data;
  }
  if(st.status!=='SUCCEEDED'){
    if(prev) return prev;
    throw new Error(/RUNNING|READY/.test(st.status) ? 'Apify is still on it. It’ll fill in on the next refresh.' : 'Apify’s check '+String(st.status || 'failed').toLowerCase().replace(/[-_]/g, ' ')+'.');
  }
  const items = await apGet('ap/items?d='+encodeURIComponent(st.defaultDatasetId), 45000);
  const p = Array.isArray(items) ? items[0] : null;
  if(!p || p.error){ if(prev) return prev; throw new Error(p && p.error ? 'Instagram: '+(p.errorDescription || p.error) : 'Apify found nothing for @'+a.username+'. Is the account public?'); }
  const fresh = arr(p.latestPosts).map(apPost).filter(function(x){ return x.date; });
  // the latest posts get fresh numbers; older ones keep the last numbers they had
  const seen = {};
  const posts = fresh.concat(prev ? arr(prev.posts) : []).filter(function(x){ if(seen[x.id]) return false; seen[x.id] = 1; return true; })
    .sort(function(x, y){ return y.date.localeCompare(x.date); }).slice(0, 400);
  const d = {username:p.username || a.username, followers:Number(p.followersCount) || (prev ? prev.followers : 0), mediaCount:Number(p.postsCount) || 0, pic:p.profilePicUrl || '', posts:posts, at:Date.now()};
  c.apData[a.id] = d; persist('settings');
  return d;
}
igLoadAccount = (function(base){
  return function(acc){ return socialSrc(acc)==='apify' ? apLoadAccount(acc) : base.apply(this, arguments); };
})(igLoadAccount);
ACTIONS.apConnect = async function(){
  const v = function(id){ const el = document.getElementById(id); return el ? el.value.trim() : ''; };
  const tok = v('apToken'), h = apHandle(v('apHandle'));
  if(!h){ const el = document.getElementById('apHandle'); if(el) el.focus(); return; }
  ui.socErr = null; ui.socBusy = true; renderView();
  if(tok){
    const r = await fetchWithin(WAKE_HELPER+'ap/key?t='+hexUtf8(tok), 25000);
    let j = null; try{ j = r ? await r.json() : null; }catch(e){}
    if(!r || !r.ok){ ui.socBusy = false; ui.socErr = j && j.error ? j.error : r ? 'The Operator app didn’t take that.' : 'The Operator app isn’t answering. Open Operator from its icon.'; renderView(); return; }
  } else {
    const s = await fetchWithin(WAKE_HELPER+'ap/status', 8000); let j = null; try{ j = s ? await s.json() : null; }catch(e){}
    if(!j || !j.hasKey){ ui.socBusy = false; ui.socErr = 'Paste your Apify API token first (apify.com → Settings → API & Integrations).'; renderView(); const el = document.getElementById('apToken'); if(el) el.focus(); return; }
  }
  const c = igCfg(), role = ui.socRole || 'business', id = 'apify-'+h.toLowerCase();
  c.accounts = c.accounts.filter(function(a){ return a.id!==id; });
  c.accounts.push({id:id, src:'apify', role:role, username:h});
  persist('settings'); ui.socBusy = false; ui.igTried = 0; ui.apForce = true;
  showToast('Checking @'+h+' on Apify. It takes about a minute.', {icon:'&#128269;'});
  await igRefresh(false); ui.apForce = false;
  if(ui.igErr && !(c.apData && c.apData[id])){ ui.socErr = ui.igErr; c.accounts = c.accounts.filter(function(a){ return a.id!==id; }); persist('settings'); renderView(); }
  else showToast('@'+h+' is connected through Apify.', {icon:'&#128202;'});
};
ACTIONS.apRefresh = async function(){ if(ui.igLoading) return; ui.apForce = true; ui.igTried = 0; await igRefresh(false); ui.apForce = false; };
ACTIONS.socRemove = (function(base){
  return function(el, e, id){ const c = igCfg(); if(c.apData) delete c.apData[id]; return base.apply(this, arguments); };
})(ACTIONS.socRemove);

// ---- how you connect: Apify (live, nearly free), a CSV (free), or Meta directly ----
function socialConnectHtml(){
  const role = ui.socRole || 'business', sh = ui.socShow;
  const roleSeg = '<div class="soc-role">'+[['business', 'Business account'], ['personal', 'Personal account']].map(function(x){ return '<button class="'+(role===x[0] ? 'is-on' : '')+'" data-action="socRole" data-id="'+x[0]+'">'+x[1]+'</button>'; }).join('')+'</div>';
  return '<div class="soc-connect">'+
    '<div class="soc-h"><b>Your social numbers</b><span>No Meta developer app, no GoHighLevel. Live for free, or a CSV.</span></div>'+roleSeg+
    '<div class="soc-opts">'+
      '<div class="soc-opt'+(sh==='ap' ? ' is-open' : '')+'"><button class="soc-opt-h" data-action="socShow" data-id="ap"><span>&#128269;</span><div><b>Apify <em class="soc-free">free plan</em></b><small>Live. Your public Instagram numbers (followers, posts, likes, comments, views) with no Meta login. The free plan’s $5 a month covers checking twice a day many times over.</small></div></button>'+
        (sh==='ap' ? '<div class="soc-form"><input class="input" id="apHandle" placeholder="@yourhandle (a public account)"><input class="input" id="apToken" placeholder="Apify API token (only the first time)">'+
          '<div class="soc-hint">Sign up free at apify.com, then Settings → API &amp; Integrations → copy your Personal API token. It’s kept in the Operator app on this Mac, never in your data. Reach and saves aren’t public, so those stay empty.</div>'+
          '<button class="btn btn-primary" data-action="apConnect"'+(ui.socBusy ? ' disabled' : '')+'>'+(ui.socBusy ? 'Connecting…' : 'Connect')+'</button></div>' : '')+'</div>'+
      '<div class="soc-opt"><button class="soc-opt-h" data-action="socCsvPick" data-id="'+role+'"><span>&#128196;</span><div><b>Import a CSV</b><small>Free, no connection at all. Meta Business Suite → Insights → Content → Export data. Once it’s in Downloads, Operator picks it up by itself (or click here to choose it).</small></div></button></div>'+
      '<div class="soc-opt is-quiet"><button class="soc-opt-h" data-action="igConnect"><span>&#128279;</span><div><b>Meta directly</b><small>Every post with reach and your ad spend, with a read-only token. More setup.</small></div></button></div>'+
    '</div>'+
    (ui.socErr ? '<div class="soc-err">&#9888; '+escapeHtml(ui.socErr)+'</div>' : '')+
  '</div>';
}
function socialSourcesHtml(){
  const c = igCfg(); if(!c.accounts.length) return '';
  return '<div class="soc-srcs">'+c.accounts.map(function(a){
    const s = socialSrc(a), d = c.cache && c.cache.data && c.cache.data[a.id], ap = s==='apify' && c.apData && c.apData[a.id];
    const label = s==='apify' ? '&#128269; Apify &middot; @'+escapeHtml(a.username) : s==='metricool' ? '&#128202; Metricool' : s==='csv' ? '&#128196; Imported' : '&#128279; Meta';
    return '<div class="soc-src"><span class="soc-src-k">'+label+' &middot; '+(a.role==='business' ? 'Business' : 'Personal')+(ap ? ' <small class="soc-when">checked '+escapeHtml(fmtAgo(ap.at))+'</small>' : '')+'</span>'+
      (s==='csv' || s==='metricool' ? '<span class="soc-src-f"><input class="input" type="number" id="socFol-'+a.id+'" value="'+((d && d.followers) || a.followers || '')+'" placeholder="followers"><button class="btn btn-ghost btn-sm" data-action="socFollowersSet" data-id="'+a.id+'">Set</button></span>' : '')+
      (s==='csv' ? '<button class="btn btn-ghost btn-sm" data-action="socCsvPick" data-id="'+a.role+'">Import a newer file</button>' : '')+
      (s==='apify' ? '<button class="btn btn-ghost btn-sm" data-action="apRefresh"'+(ui.igLoading ? ' disabled' : '')+'>'+(ui.igLoading ? 'Checking…' : 'Refresh now')+'</button>' : '')+
      '<button class="btn btn-ghost btn-sm soc-x" data-action="socRemove" data-id="'+a.id+'">Remove</button></div>';
  }).join('')+'<button class="btn btn-ghost btn-sm" data-action="socShowAdd">&#65291; Another account</button>'+
  (ui.socAdd ? socialConnectHtml() : '')+'</div>';
}
function fmtAgo(ts){
  const m = Math.max(0, Math.round((Date.now() - (ts || 0))/60000));
  return m < 2 ? 'just now' : m < 60 ? m+' min ago' : m < 1440 ? Math.round(m/60)+'h ago' : Math.round(m/1440)+'d ago';
}
