// ============ ROUND 55: OP WRITES CLIENT REPORTS · YOUR CLIENTS' SOCIALS ============
// ---- 1. "Write a client report", on Op's screen (and on every report task) ----
// Op reads everything the app knows about that client for the period: deliverables, shoots, calls and touches,
// their journal (debriefs included), the playbook, their ads and their socials. You get a version to send (edit it,
// copy it, save it as a PDF) and private notes for you. Saving files the report in their journal.
function r55RepFacts(c, days){
  const to = todayStr(), from = addDays(to, -(days - 1)), L = [];
  const name = c.business || c.name || 'Client';
  L.push('Client: '+name+(c.name && c.business ? ' (contact: '+c.name+')' : '')+'. Period: '+fmtDateShort(from)+' to '+fmtDateShort(to)+'.'+(Number(c.mrr) ? ' Retainer: '+money(c.mrr)+'/month.' : ''));
  arr(c.deliverables).forEach(function(d){
    const n = arr(d.completedDates).filter(function(x){ return x >= from && x <= to; }).length;
    if(d.recurring) L.push('Deliverable “'+d.title+'”: '+n+' delivered in the period'+(d.weeklyTarget ? ' (target '+d.weeklyTarget+' a week)' : '')+'.');
    else if(d.status==='done' || n) L.push('One-off “'+d.title+'”: done.');
    else if(d.dueDate) L.push('One-off “'+d.title+'”: due '+fmtDateShort(d.dueDate)+'.');
  });
  const shoots = arr(state.modes && state.modes.history).filter(function(h){ if(h.type!=='shooting' || h.date < from) return false; const ev = h.eventId ? arr(state.calendar.events).find(function(e){ return e.id===h.eventId; }) : null; return (ev && ev.linkedClient===c.id) || new RegExp(name.split(' ')[0], 'i').test(h.note || ''); });
  if(shoots.length) L.push('Shoots: '+shoots.length+' ('+shoots.map(function(h){ return fmtDateShort(h.date)+', '+fmtDurationLabel(h.minutes); }).join('; ')+').');
  const tps = arr(c.touchpoints).filter(function(t){ return t.date >= from; });
  if(tps.length){ const by = {}; tps.forEach(function(t){ by[t.type] = (by[t.type] || 0) + 1; }); L.push('Contact with them: '+Object.keys(by).map(function(k){ return by[k]+' '+(touchTypeById(k).label || k).toLowerCase(); }).join(', ')+'.'); }
  const evs = arr(state.calendar.events).filter(function(e){ return e.linkedClient===c.id && e.date >= from && e.date <= addDays(to, 14); });
  if(evs.length) L.push('On the calendar: '+evs.map(function(e){ return e.title+' ('+fmtDateShort(e.date)+')'; }).join('; ')+'.');
  const notes = arr(c.journal).filter(function(j){ return (j.date || '') >= from; }).slice(-8);
  if(notes.length) L.push('Notes from the period:\n'+notes.map(function(j){ return '- '+fmtDateShort(j.date)+': '+String(j.text || '').replace(/\s+/g, ' ').slice(0, 300); }).join('\n'));
  try{ const s = pbState('client', c); if(s){ const done = s.occ.filter(function(o){ return o.done && o.date >= from; }).map(function(o){ return o.it.title; }), open = s.open.map(function(o){ return o.it.title+(o.late ? ' (late)' : ''); }); L.push('Playbook ('+s.p.name+'): done: '+(done.join(', ') || 'nothing yet')+'; still open: '+(open.join(', ') || 'nothing')+'.'); } }catch(e){}
  try{ const a = clientAdTotals(c.id); if(a && a.spend) L.push('Ads (last '+a.days+' days): '+adsMoney(a.spend, a.currency)+' spent'+(a.leads ? ', '+a.leads+' leads at '+adsMoney(a.spend/a.leads, a.currency)+' each' : '')+(a.results ? ', '+a.results+' results' : '')+'.'); }catch(e){}
  try{ const T = r53AllFor(c.id); if(T && T.n && T.spend) L.push('Ads all time: '+adsMoney(T.spend, T.currency || 'USD')+(T.leads ? ', '+T.leads+' leads' : '')+'.'); }catch(e){}
  try{ r55CliAccounts(c.id).forEach(function(a){ const d = r55CliData(a.id); if(d) L.push('Their '+a.platform+' @'+a.username+': '+(d.followers ? d.followers.toLocaleString()+' followers, ' : '')+d.p30+' posts in 30 days'+(d.views ? ', '+d.views.toLocaleString()+' views' : '')+(d.best ? ', best: “'+d.best.cap.slice(0, 60)+'” ('+(d.best.views || d.best.likes || 0).toLocaleString()+')' : '')+'.'); }); }catch(e){}
  return L.join('\n');
}
function r55RepTemplate(c, days, facts){
  const name = c.business || c.name;
  return {client:'Hi '+(c.name || name)+',\n\nHere’s where we are for the last '+(days===7 ? 'week' : days+' days')+':\n\n'+facts.split('\n').slice(1).filter(function(l){ return !/^Notes|^- |Playbook/.test(l); }).map(function(l){ return '• '+l; }).join('\n')+'\n\nNext up: we keep the momentum going. Talk soon.\n',
    mine:facts};
}
async function r55RepWrite(c, days){
  const facts = r55RepFacts(c, days);
  if(AI.hasKey===false || typeof aiWrite!=='function') return r55RepTemplate(c, days, facts);
  const t = await Promise.race([aiWrite('Write a status report for my client '+(c.business || c.name)+', for the '+(days===7 ? 'past week' : 'past '+days+' days')+', from these facts (only these; don’t invent numbers):\n\n'+facts+
    '\n\nReply with JSON only: {"client": "the report I send them: warm, plain and confident, short paragraphs, what we did, what it got them, what’s next; no internal stuff, nothing late or behind framed as an excuse", "mine": "private notes for me: what went well, what slipped, risks, and the one thing to do next with this client"}', {max:1100}), new Promise(function(r){ setTimeout(r, 30000); })]);
  const m = /\{[\s\S]*\}/.exec(String(t || '')); let j = null; try{ j = m ? JSON.parse(m[0]) : null; }catch(e){}
  return j && j.client ? {client:String(j.client), mine:String(j.mine || '')} : r55RepTemplate(c, days, facts);
}
function r55RepHtml(){
  const R = ui.r55Rep || {}, cs = mtActiveClients(), c = R.cid ? crmFind('client', R.cid) : null;
  const pick = '<select class="input input-sm" data-r55-rep="cid"><option value="">Pick a client</option>'+cs.map(function(x){ return '<option value="'+x.id+'"'+(x.id===R.cid ? ' selected' : '')+'>'+escapeHtml(x.business || x.name)+'</option>'; }).join('')+'</select>';
  const per = '<div class="seg-tabs seg-sm">'+[[7, 'Week'], [30, 'Month'], [60, '2 months']].map(function(x){ return '<button class="seg-tab'+((R.days || 30)===x[0] ? ' active' : '')+'" data-action="r55RepDays" data-id="'+x[0]+'">'+x[1]+'</button>'; }).join('')+'</div>';
  const body = !c ? '<div class="r55-rep-empty">Pick a client and Op writes it from everything the app knows about them.</div>'
    : R.busy ? '<div class="r55-rep-empty"><span class="obs-dots"><i></i><i></i><i></i></span> Op is reading '+escapeHtml(c.business || c.name)+'’s '+((R.days || 30)===7 ? 'week' : 'month')+'…</div>'
    : !R.out ? '<div class="r55-rep-empty"><button class="btn btn-primary" data-action="r55RepGo">&#10024; Write it</button></div>'
    : '<div class="r55-rep-sec"><small>For '+escapeHtml(c.name || c.business)+'</small><textarea class="input" id="r55RepClient" rows="12">'+escapeHtml(R.out.client)+'</textarea>'+
        '<div class="r55-rep-a"><button class="btn btn-sm" data-action="r55RepCopy">Copy</button><button class="btn btn-sm" data-action="r55RepPdf">Save as PDF</button><button class="btn btn-sm btn-ghost" data-action="r55RepGo">&#8635; Write it again</button></div></div>'+
      '<div class="r55-rep-sec is-mine"><small>Just for you</small><textarea class="input" id="r55RepMine" rows="6">'+escapeHtml(R.out.mine)+'</textarea></div>'+
      '<div class="r55-rep-f"><button class="btn btn-primary" data-action="r55RepSave">'+(R.task ? 'Save to their journal and mark the task done' : 'Save to their journal')+'</button></div>';
  return '<button class="int-x hs-x" data-action="addSheetClose" title="Close">&#10005;</button>'+
    '<div class="as-h"><span class="as-ic">&#128196;</span><div><div class="hs-h">Client report</div></div></div>'+
    '<div class="r55-rep-h">'+pick+per+'</div>'+body;
}
function r55RepOpen(cid, task){ ui.r55Rep = {cid:cid || null, days:30, out:null, busy:false, task:task || null}; addSheetOpen('r55Report', r55RepHtml); if(cid) ACTIONS.r55RepGo(); }
ACTIONS.r55RepDays = function(el, e, n){ const R = ui.r55Rep; if(!R) return; R.days = Number(n); R.out = null; addSheetRefresh('r55Report'); };
ACTIONS.r55RepGo = function(){
  const R = ui.r55Rep, c = R && crmFind('client', R.cid); if(!c) return;
  R.busy = true; R.out = null; addSheetRefresh('r55Report');
  r55RepWrite(c, R.days || 30).then(function(o){ R.busy = false; R.out = o; addSheetRefresh('r55Report'); }).catch(function(){ R.busy = false; R.out = r55RepTemplate(c, R.days || 30, r55RepFacts(c, R.days || 30)); addSheetRefresh('r55Report'); });
};
function r55RepText(id){ const n = document.getElementById(id); return n ? n.value : ''; }
ACTIONS.r55RepCopy = function(){ const t = r55RepText('r55RepClient'); if(!fallbackCopy(t)){ try{ navigator.clipboard.writeText(t); }catch(e){} } showToast('Copied: ready to send', {icon:'&#128203;'}); };
ACTIONS.r55RepPdf = function(){
  const R = ui.r55Rep, c = R && crmFind('client', R.cid); if(!c) return;
  const t = r55RepText('r55RepClient'), me = state.profile.name || '', f = document.createElement('iframe');
  f.style.cssText = 'position:fixed;right:0;bottom:0;width:0;height:0;border:0;'; document.body.appendChild(f);
  const d = f.contentWindow.document;
  d.open(); d.write('<!doctype html><html><head><meta charset="utf-8"><title>'+escapeHtml((c.business || c.name)+' · report · '+fmtDateShort(todayStr()))+'</title><style>body{font:15px/1.6 -apple-system,Helvetica,Arial,sans-serif;color:#15171c;margin:56px 64px;} h1{font-size:24px;margin:0 0 4px;} .s{color:#6b7280;margin-bottom:28px;} p{white-space:pre-wrap;margin:0;} .f{margin-top:40px;color:#6b7280;font-size:13px;}</style></head><body>'+
    '<h1>'+escapeHtml(c.business || c.name)+'</h1><div class="s">Status report · '+escapeHtml(fmtDateShort(addDays(todayStr(), -((R.days || 30) - 1))))+' – '+escapeHtml(fmtDateShort(todayStr()))+'</div><p>'+escapeHtml(t)+'</p>'+(me ? '<div class="f">'+escapeHtml(me)+'</div>' : '')+'</body></html>');
  d.close();
  setTimeout(function(){ try{ f.contentWindow.focus(); f.contentWindow.print(); }catch(e){} setTimeout(function(){ f.remove(); }, 60000); }, 300);
};
ACTIONS.r55RepSave = function(){
  const R = ui.r55Rep, c = R && crmFind('client', R.cid); if(!c) return;
  if(!Array.isArray(c.journal)) c.journal = [];
  c.journal.push({id:uid(), date:todayStr(), text:'Report ('+((R.days || 30)===7 ? 'week' : (R.days || 30)+' days')+'):\n'+r55RepText('r55RepClient')+(r55RepText('r55RepMine').trim() ? '\n\nMy notes:\n'+r55RepText('r55RepMine') : ''), createdAt:new Date().toISOString(), by:'op', kind:'report'});
  persist('business');
  if(R.task){ const t = state.tasks.items.find(function(x){ return x.id===R.task; }); if(t && t.status!=='done') completeTask(t.id); }
  addSheetClose('r55Report'); playPositive(); showToast('Saved to '+(c.business || c.name)+'’s journal.', {icon:'&#128196;'});
};
document.addEventListener('change', function(e){ const t = e.target; if(!t || !t.getAttribute || t.getAttribute('data-r55-rep')!=='cid') return; const R = ui.r55Rep; if(!R) return; R.cid = t.value || null; R.out = null; addSheetRefresh('r55Report'); if(R.cid) ACTIONS.r55RepGo(); });
ACTIONS.r55Report = function(el, e, id){ r55RepOpen(id || null); };
// (on Op's screen: the ability, always there)
opfEl = (function(base){
  return function(){
    const el = base.apply(this, arguments);
    if(el && !el.querySelector('.r55-opab')){ const top = el.querySelector('.opf-top'); if(top) top.insertAdjacentHTML('beforeend', '<div class="r55-opab"><button class="r55-opab-b" data-action="r55Report">&#128196; Write a client report</button></div>'); }
    return el;
  };
})(opfEl);
// (a report task on a playbook opens it, with the draft already started)
openTaskEditModal = (function(base){
  return function(id){
    const t = state.tasks.items.find(function(x){ return x.id===id; }), m = t && t.master;
    if(m && m.kind==='pb' && m.type==='report' && m.who==='client' && t.status!=='done'){ r55RepOpen(m.id, t.id); return; }
    return base.apply(this, arguments);
  };
})(openTaskEditModal);
// Op can do it when you ask ("write JJS's report")
if(Array.isArray(typeof OP_TOOLS!=='undefined' ? OP_TOOLS : null) && !OP_TOOLS.some(function(t){ return t.name==='client_report'; })){
  OP_TOOLS.push({name:'client_report', description:'Open a status report for one client, written from everything the app knows (deliverables, shoots, calls, notes, playbook, ads, socials), for him to edit and send.', input_schema:{type:'object', properties:{who:{type:'string', description:'client name'}, days:{type:'number', description:'7, 30 or 60'}}, required:['who']}});
  opRunTool = (function(base){
    return function(name, x){
      if(name==='client_report'){ const h = opFindContact(String((x && x.who) || '')); if(!h || h.kind!=='client') throw new Error('no client matches "'+(x && x.who)+'"'); r55RepOpen(h.x.id); if(x && x.days && ui.r55Rep) ui.r55Rep.days = Number(x.days) || 30; return 'opened the report for '+crmName('client', h.x)+'; Op is drafting it'; }
      return base.apply(this, arguments);
    };
  })(opRunTool);
}

// ---- 2. Your clients' socials (Social → Clients) ----
// Every Instagram and Facebook account your Zernio sees: the ones you manage through your Business Manager show up
// once connected in Zernio (connect with your own Meta login and pick the client's page). Link each to a client:
// their followers, posts, views and best post show on their card here, and Op uses them in reports.
function r55CliLinks(){ const c = igCfg(); if(!c.cliLinks || typeof c.cliLinks!=='object') c.cliLinks = {}; return c.cliLinks; }
function r55CliStore(){ const c = igCfg(); if(!c.cliData || typeof c.cliData!=='object') c.cliData = {}; return c.cliData; }
function r55CliAccounts(cid){ const L = r55CliLinks(); return arr(ui.r55CliAll || igCfg().cliAll).filter(function(a){ return L[a.id]===cid; }); }
function r55CliData(id){ return r55CliStore()[id] || null; }
async function r55CliLoad(force){
  if(ui.r55CliBusy) return; ui.r55CliBusy = true; ui.r55CliErr = null;
  try{
    const list = await znApi('/v1/accounts');
    const all = arr(list.accounts).filter(function(x){ return /instagram|facebook/i.test(String(x.platform || '')); }).map(function(x){ return {id:x._id, platform:/facebook/i.test(x.platform) ? 'facebook' : 'instagram', username:x.username || x.displayName || x.name || 'account', name:x.displayName || x.name || '', followers:Number(x.followersCount) || 0}; });
    ui.r55CliAll = all; igCfg().cliAll = all; persist('settings');
    const L = r55CliLinks(), S = r55CliStore(), to = todayStr(), from = addDays(to, -30);
    for(const a of all){
      if(!L[a.id]) continue;
      const prev = S[a.id]; if(prev && !force && Date.now() - (prev.at || 0) < 6*3600000) continue;
      let posts = [];
      try{ const an = await znApi('/v1/analytics?accountId='+encodeURIComponent(a.id)+'&fromDate='+from+'&toDate='+to); posts = arr(an.posts || an.data).map(znPost).filter(function(p){ return p.date; }); }catch(e){}
      const views = posts.reduce(function(s, p){ return s + (Number(p.views) || 0); }, 0), best = posts.slice().sort(function(x, y){ return (y.views || y.likes || 0) - (x.views || x.likes || 0); })[0] || null;
      S[a.id] = {at:Date.now(), followers:a.followers, p30:posts.length, views:views, likes:posts.reduce(function(s, p){ return s + (p.likes || 0); }, 0), best:best ? {cap:best.cap || '', views:best.views, likes:best.likes, link:best.link, thumb:best.thumb} : null};
    }
    persist('settings');
  }catch(e){ ui.r55CliErr = String(e && e.message || e); }
  finally { ui.r55CliBusy = false; if(ui.view==='convos') renderView(); }
}
function r55CliHtml(){
  if(!ui.r55CliAll && !ui.r55CliBusy && !ui.r55CliTried){ ui.r55CliTried = true; ui.r55CliAll = igCfg().cliAll || null; r55CliLoad(false); }
  const all = arr(ui.r55CliAll), L = r55CliLinks(), cs = mtActiveClients();
  if(ui.r55CliErr && !all.length) return '<div class="r55-cli-empty"><b>Zernio isn’t answering</b><span>'+escapeHtml(ui.r55CliErr)+'</span><button class="btn btn-sm" data-action="r55CliRefresh">Try again</button></div>';
  if(!all.length) return '<div class="r55-cli-empty">'+(ui.r55CliBusy ? '<span class="obs-dots"><i></i><i></i><i></i></span> Reading your Zernio accounts…' : '<b>No client accounts in Zernio yet</b><span>In Zernio, connect Instagram or Facebook with your own Meta login and pick your client’s page (your Business Manager gives you access). It shows up here.</span><button class="btn btn-sm" data-action="r55CliRefresh">Check again</button>')+'</div>';
  const unlinked = all.filter(function(a){ return !L[a.id]; });
  const sel = function(cid){ return unlinked.length ? '<select class="input input-sm" data-r55-cli="'+cid+'"><option value="">+ Link an account</option>'+unlinked.map(function(a){ return '<option value="'+a.id+'">'+(a.platform==='facebook' ? 'Facebook' : 'Instagram')+' · @'+escapeHtml(a.username)+'</option>'; }).join('')+'</select>' : ''; };
  const acc = function(a){
    const d = r55CliData(a.id) || {};
    return '<div class="r55-cli-a"><div class="r55-cli-ah"><span class="r55-cli-p is-'+a.platform+'">'+(a.platform==='facebook' ? 'f' : '&#9711;')+'</span><b>@'+escapeHtml(a.username)+'</b><button class="r55-cli-x" data-action="r55CliUnlink" data-id="'+a.id+'" title="Unlink">&#10005;</button></div>'+
      '<div class="r55-cli-n"><span><b>'+((d.followers || a.followers) ? (d.followers || a.followers).toLocaleString() : '–')+'</b><small>followers</small></span><span><b>'+(d.p30!=null ? d.p30 : '–')+'</b><small>posts · 30d</small></span><span><b>'+(d.views ? sxNum(d.views) : '–')+'</b><small>views · 30d</small></span></div>'+
      (d.best ? '<a class="r55-cli-best"'+(d.best.link ? ' href="'+escapeHtml(d.best.link)+'" target="_blank" rel="noopener"' : '')+'>'+(d.best.thumb ? '<img src="'+escapeHtml(d.best.thumb)+'" alt="" loading="lazy">' : '')+'<span><small>Best this month</small>'+escapeHtml((d.best.cap || 'Post').slice(0, 70))+'</span><em>'+sxNum(d.best.views || d.best.likes || 0)+'</em></a>' : '')+'</div>';
  };
  const cards = cs.map(function(c){
    const mine = all.filter(function(a){ return L[a.id]===c.id; });
    return '<div class="r55-cli-c" style="--cc:'+clientAccent(c)+'"><div class="r55-cli-ch"><i></i><b>'+escapeHtml(c.business || c.name)+'</b>'+sel(c.id)+'</div>'+(mine.length ? '<div class="r55-cli-as">'+mine.map(acc).join('')+'</div>' : '<div class="r55-cli-none">No account linked.</div>')+'</div>';
  }).join('');
  return '<div class="r55-cli-top"><span>'+all.length+' account'+(all.length===1 ? '' : 's')+' in Zernio · '+(all.length - unlinked.length)+' linked</span></div><div class="r55-cli-g">'+cards+'</div>';
}
ACTIONS.r55CliRefresh = function(){ ui.r55CliTried = true; r55CliLoad(true); renderView(); };
ACTIONS.r55CliUnlink = function(el, e, id){ delete r55CliLinks()[id]; persist('settings'); renderView(); };
document.addEventListener('change', function(e){ const t = e.target; if(!t || !t.getAttribute || !t.hasAttribute('data-r55-cli') || !t.value) return; r55CliLinks()[t.value] = t.getAttribute('data-r55-cli'); persist('settings'); r55CliLoad(true); renderView(); });
renderConversations = (function(base){
  return function(){
    if(ui.socTab==='clients'){
      const was = ui.socTab; ui.socTab = 'overview';
      let h; try{ h = base.apply(this, arguments); } finally { ui.socTab = was; }
      const tpl = document.createElement('template'); tpl.innerHTML = h;
      const panel = tpl.content.querySelector('.tab-panel.sx'); if(panel){ panel.setAttribute('data-key', 'sx-clients'); panel.innerHTML = r55CliHtml(); }
      tpl.content.querySelectorAll('.sx-tabs .seg-tab').forEach(function(b){ b.classList.remove('active'); });
      h = tpl.innerHTML;
      return h.replace(/(<div class="seg-tabs sx-tabs">[\s\S]*?)(<\/div>)/, '$1<button class="seg-tab active" data-action="socTab" data-id="clients">&#128101; Clients</button>$2').replace(/data-action="igRefreshAll"/, 'data-action="r55CliRefresh"');
    }
    return base.apply(this, arguments).replace(/(<div class="seg-tabs sx-tabs">[\s\S]*?)(<\/div>)/, '$1<button class="seg-tab" data-action="socTab" data-id="clients">&#128101; Clients</button>$2');
  };
})(renderConversations);
