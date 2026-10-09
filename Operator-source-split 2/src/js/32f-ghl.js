
// ============ GOHIGHLEVEL ============
// Settings → Integrations. Paste a Private Integration key + your Location ID; the Operator app
// on your Mac keeps the key (not this page, not your exports) and makes the calls for us at
// 127.0.0.1:8936. Every 10 minutes (and on Sync now):
//  • Leads — open opportunities in the pipeline you pick come in as leads, each GHL stage mapped
//    to one of yours. Move a lead here and it moves in GHL (and back).
//  • Appointments — the next two weeks of bookings land in the Calendar, linked to the lead or
//    client, so meetings get logged as touches on their own.
//  • Messages — a text, email, call or DM you send from GHL counts as a touch, so "who to reach
//    out to" stays honest.
const GHL_HELPER = 'http://127.0.0.1:8936/ghl/';
function ghlCfg(){
  const s = state.settings;
  if(!s.ghl || typeof s.ghl!=='object') s.ghl = {};
  const g = s.ghl;
  if(g.locationId===undefined) g.locationId = '';
  if(g.pipelineId===undefined) g.pipelineId = '';
  if(!g.stageMap || typeof g.stageMap!=='object') g.stageMap = {};
  if(!Array.isArray(g.pipelines)) g.pipelines = [];
  ['syncCalendar', 'syncMessages', 'pushStages', 'autoSync', 'pushNewLeads'].forEach(function(k){ if(g[k]===undefined) g[k] = true; });
  return g;
}
function ghlOn(){ const g = ghlCfg(); return !!(g.connected && g.locationId && g.pipelineId); }
// The Operator app's GHL bridge answers one request at a time and needs a moment between them,
// so requests go out one by one (queued), and a refused one is retried a few times before
// we decide the bridge isn't there.
const GHL_RETRY_MS = [120, 250, 450, 700, 1000, 1500];
let ghlQueue = Promise.resolve();
function ghlSleep(ms){ return new Promise(function(r){ setTimeout(r, ms); }); }
async function ghlFetchOnce(url){
  for(let i=0; ; i++){
    try{ return await fetch(url, {cache:'no-store'}); }
    catch(e){
      if(i >= GHL_RETRY_MS.length){
        const err = new Error('Can\'t reach Operator\'s GoHighLevel connection on this Mac. Quit Operator completely (⌘Q) and open it again from the Operator app — if an older Operator window was still open, the new connection never started.');
        err.noHelper = true; throw err;
      }
      await ghlSleep(GHL_RETRY_MS[i]);
    }
  }
}
function ghlFetch(url){
  const run = ghlQueue.then(async function(){
    const res = await ghlFetchOnce(url);
    const text = await res.text(); let json = null; try{ json = JSON.parse(text); }catch(e){}
    if(!res.ok){
      const msg = json && (json.message || json.error || json.msg);
      const err = new Error(res.status===401 ? 'GoHighLevel didn\'t accept the key (401) — check it and its scopes.' : res.status===403 ? 'Not allowed (403) — the key is missing a scope for this.' : (Array.isArray(msg) ? msg.join(', ') : msg) || ('GoHighLevel said '+res.status));
      err.status = res.status; throw err;
    }
    await ghlSleep(40); // a breath before the next request
    return json || {};
  });
  ghlQueue = run.catch(function(){});
  return run;
}
// Is the bridge there? Checked when Integrations opens, so a missing bridge shows up front.
ACTIONS.ghlCheckBridge = function(){ ghlCheckBridge(true); };
function ghlCheckBridge(force){
  if(ui.ghlBridge && !force && Date.now()-ui.ghlBridge.at < 30000) return;
  ui.ghlBridge = {state:'checking', at:Date.now()};
  ghlFetch(GHL_HELPER+'status').then(function(r){ ui.ghlBridge = {state:'ok', hasKey:!!r.hasKey, at:Date.now()}; renderView(); })
    .catch(function(e){ ui.ghlBridge = {state:'missing', at:Date.now(), msg:e.message}; renderView(); });
}
function ghlCall(method, path, body){ return ghlFetch(GHL_HELPER+'api?m='+method+'&p='+hexUtf8(path)+(body ? '&b='+hexUtf8(JSON.stringify(body)) : '')); }
function ghlQ(obj){ return Object.keys(obj).filter(function(k){ return obj[k]!=null && obj[k]!==''; }).map(function(k){ return encodeURIComponent(k)+'='+encodeURIComponent(obj[k]); }).join('&'); }
function ghlDate(v){ if(v==null || v==='') return todayStr(); const d = new Date(typeof v==='number' || /^\d+$/.test(String(v)) ? Number(v) : v); return isNaN(d) ? todayStr() : todayStr(d); }
function digits(s){ return String(s||'').replace(/\D/g, '').slice(-10); }
// ---- stage mapping ----
function ghlGuessStage(name, i, n){
  const s = String(name||'').toLowerCase();
  if(/lost|dead|unqualif|no.?show|not interested/.test(s)) return 'lost';
  if(/won|closed|sold|signed|client/.test(s)) return 'closed';
  if(/proposal|quote|offer|contract/.test(s)) return 'proposal';
  if(/book|appoint|call|meet|discovery|demo|consult/.test(s)) return 'discovery';
  if(/contact|reached|follow|engag|replied|respond/.test(s)) return 'contacted';
  if(/new|lead|incoming|fresh/.test(s)) return 'lead';
  const open = ['lead', 'contacted', 'discovery', 'proposal'];
  return open[Math.min(open.length-1, Math.floor(i/Math.max(1, n)*open.length))];
}
function ghlPipeline(){ const g = ghlCfg(); return g.pipelines.find(function(p){ return p.id===g.pipelineId; }) || null; }
function ghlAutoMap(){
  const g = ghlCfg(), p = ghlPipeline(); if(!p) return;
  const valid = crmStages('lead').map(function(s){ return s.id; });
  p.stages.forEach(function(st, i){ if(!g.stageMap[st.id] || valid.indexOf(g.stageMap[st.id])<0) g.stageMap[st.id] = ghlGuessStage(st.name, i, p.stages.length); });
}
function ghlStageFor(opStage){
  const g = ghlCfg(), p = ghlPipeline(); if(!p) return null;
  const hit = p.stages.find(function(st){ return g.stageMap[st.id]===opStage; });
  return hit ? hit.id : null;
}
// ---- connecting ----
ACTIONS.ghlConnect = async function(){
  const keyEl = document.getElementById('ghlKey'), locEl = document.getElementById('ghlLoc');
  const key = keyEl ? keyEl.value.trim() : '', loc = locEl ? locEl.value.trim() : '';
  const g = ghlCfg();
  if(!loc){ showToast('Add your Location ID first.', {icon:'&#9888;'}); return; }
  ui.ghlBusy = 'Connecting…'; ui.ghlError = null; renderView();
  try{
    if(key) await ghlFetch(GHL_HELPER+'save?t='+hexUtf8(key));
    else { const st = await ghlFetch(GHL_HELPER+'status'); if(!st.hasKey) throw new Error('Paste your Private Integration key.'); }
    g.locationId = loc;
    const r = await ghlCall('GET', '/opportunities/pipelines?'+ghlQ({locationId:loc}));
    g.pipelines = arr(r.pipelines).map(function(p){ return {id:p.id, name:p.name, stages:arr(p.stages).slice().sort(function(a, b){ return (a.position||0)-(b.position||0); }).map(function(s){ return {id:s.id, name:s.name}; })}; });
    if(!g.pipelines.length) throw new Error('Connected, but this location has no pipelines yet.');
    if(!g.pipelines.some(function(p){ return p.id===g.pipelineId; })) g.pipelineId = g.pipelines[0].id;
    g.connected = true; if(!g.connectedAt) g.connectedAt = Date.now();
    ghlAutoMap();
    persist('settings');
    ui.ghlBusy = null; renderView();
    showToast('Connected to GoHighLevel — '+g.pipelines.length+' pipeline'+(g.pipelines.length===1?'':'s')+' found. Check the stage matches, then Sync now.', {icon:'&#9989;', duration:6000});
  }catch(e){ ui.ghlBusy = null; ui.ghlError = e.message; renderView(); }
};
ACTIONS.ghlDisconnect = async function(){
  if(!confirm('Disconnect GoHighLevel? Leads and appointments already brought in stay where they are.')) return;
  try{ await ghlFetch(GHL_HELPER+'forget'); }catch(e){}
  const g = ghlCfg(); g.connected = false; g.lastSync = null; g.lastResult = null;
  persist('settings'); renderView();
};
ACTIONS.ghlPickPipeline = function(el){ const g = ghlCfg(); g.pipelineId = el.value; ghlAutoMap(); persist('settings'); renderView(); };
document.addEventListener('change', function(e){
  const t = e.target; if(!t || !t.dataset) return;
  if(t.dataset.ghlStage){ ghlCfg().stageMap[t.dataset.ghlStage] = t.value; persist('settings'); }
  else if(t.id==='ghlPipeline') ACTIONS.ghlPickPipeline(t);
  else if(t.dataset.ghlToggle){ ghlCfg()[t.dataset.ghlToggle] = t.checked; persist('settings'); }
});
// ---- syncing ----
let ghlSyncing = false;
ACTIONS.ghlSyncNow = function(){ ghlSync(true); };
async function ghlSync(manual){
  if(!ghlOn() || ghlSyncing) return;
  ghlSyncing = true; ui.ghlBusy = 'Syncing…'; ui.ghlError = null; if(manual) renderView();
  const g = ghlCfg(), out = {newLeads:0, movedLeads:0, events:0, touches:0, linked:0};
  const contacts = {}; // contactId → {id, name, email, phone, company}
  try{
    await ghlPushLocal(g, out);
    await ghlPullOpportunities(g, out, contacts);
    ghlLinkClients(contacts, out);
    if(g.syncCalendar) await ghlPullAppointments(g, out);
    if(g.syncMessages) await ghlPullMessages(g, out, contacts);
    g.lastSync = Date.now(); g.lastResult = out;
    persist('settings'); persist('business'); persist('calendar');
    ui.ghlBusy = null; renderView();
    if(manual) showToast('GoHighLevel synced — '+ghlResultLine(out)+'.', {icon:'&#128260;', duration:5000});
  }catch(e){
    ui.ghlBusy = null; ui.ghlError = e.message; g.lastError = {at:Date.now(), msg:e.message}; persist('settings');
    if(manual) renderView();
  }finally{ ghlSyncing = false; }
}
function ghlResultLine(r){
  if(!r) return '';
  const bits = [];
  bits.push(r.newLeads+' new lead'+(r.newLeads===1?'':'s'));
  if(r.movedLeads) bits.push(r.movedLeads+' moved');
  bits.push(r.events+' appointment'+(r.events===1?'':'s'));
  bits.push(r.touches+' message'+(r.touches===1?'':'s')+' counted');
  return bits.join(' · ');
}
async function ghlPullOpportunities(g, out, contacts){
  const leads = state.business.pipeline;
  let page = 0, after = null, afterId = null;
  while(page++ < 10){
    const r = await ghlCall('GET', '/opportunities/search?'+ghlQ({location_id:g.locationId, pipeline_id:g.pipelineId, status:'open', limit:100, startAfter:after, startAfterId:afterId}));
    const opps = arr(r.opportunities);
    opps.forEach(function(o){
      const c = o.contact || {};
      const cid = o.contactId || c.id || null;
      if(cid) contacts[cid] = {id:cid, name:c.name || o.name || '', email:c.email || '', phone:c.phone || '', company:c.companyName || ''};
      const mapped = g.stageMap[o.pipelineStageId] || 'lead';
      // already here? by GHL id first, then — so your existing leads aren't doubled on the first
      // sync — by email, phone, or the same company/name
      const em = String(c.email||'').toLowerCase(), ph = digits(c.phone), co = String(c.companyName||o.name||'').trim().toLowerCase(), nm = String(c.name||'').trim().toLowerCase();
      let x = leads.find(function(l){ return l.ghlOppId===o.id; }) ||
        (cid ? leads.find(function(l){ return l.ghlContactId===cid && !l.ghlOppId; }) : null) ||
        leads.find(function(l){
          if(l.ghlOppId || l.convertedClientId) return false;
          return (em && String(l.email||'').toLowerCase()===em) || (ph.length>=7 && digits(l.phone)===ph) ||
            (co && String(l.company||'').trim().toLowerCase()===co) || (nm && nm.length>3 && String(l.name||'').trim().toLowerCase()===nm);
        });
      if(!x){
        x = {id:uid(), name:c.name || o.name || '', company:c.companyName || o.name || c.name || 'Lead', phone:c.phone || '', email:c.email || '', notes:'', leadSource:null, stage:mapped,
          createdAt:ghlDate(o.createdAt), touchpoints:[], timeline:[], files:[], cadenceDays:null, value:Number(o.monetaryValue)||0, trade:'', nextFollowUp:null, stageHistory:[], convertedClientId:null,
          ghlOppId:o.id, ghlContactId:cid, ghlStageId:o.pipelineStageId};
        crmTimeline(x, 'note', 'Came in from GoHighLevel');
        x.ghlSig = ghlSig(x);
        leads.push(x); out.newLeads++;
        if(g.lastSync) g.recentLeads = [{id:x.id, name:x.company || x.name || 'Lead', at:Date.now()}].concat(arr(g.recentLeads)).slice(0, 20);
      } else {
        x.ghlOppId = o.id; x.ghlContactId = cid || x.ghlContactId;
        if(o.pipelineStageId && o.pipelineStageId!==x.ghlStageId){
          x.ghlStageId = o.pipelineStageId;
          if(x.stage!==mapped && crmStage('lead', mapped)){
            if(!Array.isArray(x.stageHistory)) x.stageHistory = [];
            x.stageHistory.push(x.stage);
            const from = crmStage('lead', x.stage), to = crmStage('lead', mapped);
            x.stage = mapped; crmTimeline(x, 'stage', (from?from.label:'—')+' → '+to.label+' (in GoHighLevel)');
            if(to.kind==='won' && !x.convertedClientId) convertProspectToClient(x);
            out.movedLeads++;
          }
        }
        if(o.monetaryValue!=null && Number(o.monetaryValue)!==Number(x.value)) x.value = Number(o.monetaryValue)||0;
        if(!x.phone && c.phone) x.phone = c.phone;
        if(!x.email && c.email) x.email = c.email;
        if(!x.ghlSig) x.ghlSig = ghlSig(x);
      }
    });
    const meta = r.meta || {};
    if(opps.length < 100 || !meta.startAfter) break;
    after = meta.startAfter; afterId = meta.startAfterId;
  }
}
// clients you already have get matched to their GHL contact by email or phone
function ghlLinkClients(contacts, out){
  const list = Object.keys(contacts).map(function(k){ return contacts[k]; });
  state.business.clients.forEach(function(cl){
    if(cl.ghlContactId) return;
    const em = String(cl.email||'').toLowerCase(), ph = digits(cl.phone);
    const hit = list.find(function(c){ return (em && String(c.email||'').toLowerCase()===em) || (ph.length>=7 && digits(c.phone)===ph); });
    if(hit){ cl.ghlContactId = hit.id; out.linked++; }
  });
}
function ghlRecordForContact(cid){
  if(!cid) return null;
  const cl = state.business.clients.find(function(c){ return c.ghlContactId===cid; }); if(cl) return {kind:'client', x:cl};
  const ld = state.business.pipeline.find(function(l){ return l.ghlContactId===cid && !l.convertedClientId; }); if(ld) return {kind:'lead', x:ld};
  return null;
}
function ghlCalendarCategory(){
  const cats = arr(state.calendar.categories);
  const hit = cats.find(function(c){ return /call|meet|appoint|client/i.test(c.label||''); }) || cats.find(function(c){ return /work/i.test(c.label||'') || c.id==='work'; }) || cats[0];
  return hit ? hit.id : null;
}
async function ghlPullAppointments(g, out){
  const cals = arr((await ghlCall('GET', '/calendars/?'+ghlQ({locationId:g.locationId}))).calendars);
  const start = Date.now()-86400000, end = Date.now()+14*86400000;
  const seen = {};
  for(const cal of cals.slice(0, 25)){
    const evs = arr((await ghlCall('GET', '/calendars/events?'+ghlQ({locationId:g.locationId, calendarId:cal.id, startTime:start, endTime:end}))).events);
    evs.forEach(function(ev){
      const cancelled = /cancel|invalid|noshow/i.test(ev.appointmentStatus||ev.status||'');
      let x = state.calendar.events.find(function(e){ return e.ghlEventId===ev.id; });
      if(cancelled){ if(x) state.calendar.events = state.calendar.events.filter(function(e){ return e!==x; }); return; }
      const d = new Date(ev.startTime);
      if(isNaN(d)) return;
      const rec = ghlRecordForContact(ev.contactId);
      const fields = {date:todayStr(d), time:pad2(d.getHours())+':'+pad2(d.getMinutes()), title:ev.title || cal.name || 'Appointment',
        linkedClient: rec ? (rec.kind==='lead' ? 'lead:'+rec.x.id : rec.x.id) : null,
        meetingLink: /^https?:\/\//.test(ev.address||'') ? ev.address : null};
      if(!x){ x = Object.assign({id:uid(), categoryId:ghlCalendarCategory(), alarmId:null, ghlEventId:ev.id, source:'ghl'}, fields); state.calendar.events.push(x); }
      else Object.assign(x, fields);
      seen[ev.id] = true; out.events++;
      // a booked call moves a new/contacted lead to the "call booked" stage (if you have one mapped)
      if(rec && rec.kind==='lead' && (rec.x.stage==='lead' || rec.x.stage==='contacted') && crmStage('lead', 'discovery')){ rec.x.stage = 'discovery'; crmTimeline(rec.x, 'stage', 'Call booked (GoHighLevel)'); }
    });
  }
}
function ghlTouchType(t){
  const s = String(t||'').toUpperCase();
  if(/EMAIL/.test(s)) return 'email';
  if(/CALL|VOICE/.test(s)) return 'call';
  if(/FB|INSTAGRAM|IG|WHATSAPP|GMB|LIVE_CHAT|CHAT/.test(s)) return 'dm';
  return 'text';
}
async function ghlPullMessages(g, out, contacts){
  const r = await ghlCall('GET', '/conversations/search?'+ghlQ({locationId:g.locationId, limit:100, sort:'desc', sortBy:'last_message_date'}));
  // unread messages from people → the bell (and a heads-up for ones that just came in)
  const prev = {}; arr(g.inbox).forEach(function(m){ prev[m.contactId+':'+m.at] = true; });
  g.inbox = arr(r.conversations).filter(function(cv){ return cv.contactId && Number(cv.unreadCount)>0 && /in/i.test(cv.lastMessageDirection||''); }).slice(0, 30).map(function(cv){
    return {contactId:cv.contactId, convId:cv.id, name:cv.fullName || cv.contactName || '', body:cv.lastMessageBody || '', at:Number(cv.lastMessageDate) || Date.parse(cv.lastMessageDate) || 0};
  });
  const fresh = g.inbox.filter(function(m){ return !prev[m.contactId+':'+m.at]; });
  if(fresh.length && g.lastSync){
    playPositive();
    showToast(fresh.length===1 ? '&#128172; '+escapeHtml(fresh[0].name || 'Someone')+': '+escapeHtml(String(fresh[0].body||'').slice(0, 80)) : fresh.length+' new messages in GoHighLevel', {icon:'&#128172;', duration:7000, actionLabel:'Open', actionAction:fresh.length===1 ? 'openGhlContact' : 'toggleNotifs', actionId:fresh[0].contactId});
  }
  arr(r.conversations).forEach(function(cv){
    const cid = cv.contactId; if(!cid) return;
    if(!contacts[cid]) contacts[cid] = {id:cid, name:cv.fullName || cv.contactName || '', email:cv.email || '', phone:cv.phone || ''};
    if(!/out/i.test(cv.lastMessageDirection||'')) return; // only what you sent counts as you reaching out
    const at = Number(cv.lastMessageDate) || Date.parse(cv.lastMessageDate) || 0; if(!at) return;
    let rec = ghlRecordForContact(cid);
    if(!rec){ ghlLinkClients(contacts, out); rec = ghlRecordForContact(cid); }
    if(!rec || (rec.x.ghlLastMsgAt && rec.x.ghlLastMsgAt >= at)) return;
    rec.x.ghlLastMsgAt = at;
    const date = todayStr(new Date(at));
    if(!Array.isArray(rec.x.touchpoints)) rec.x.touchpoints = [];
    rec.x.touchpoints.push({id:uid(), type:ghlTouchType(cv.lastMessageType), date:date, note:'Sent from GoHighLevel', ts:at, via:'ghl'});
    if(rec.kind==='client'){ if(!Array.isArray(rec.x.touches)) rec.x.touches = []; rec.x.touches.push(date); }
    if(rec.x.followUp && rec.x.followUp.date && date >= rec.x.followUp.date) rec.x.followUp = null;
    out.touches++;
  });
}
// moving a linked lead here moves it in GHL too
function ghlPushStage(x){
  if(!ghlOn() || !ghlCfg().pushStages || !x || !x.ghlOppId) return;
  const st = crmStage('lead', x.stage); if(!st) return;
  let body = null;
  if(st.kind==='won') body = {status:'won'};
  else if(st.kind==='lost') body = {status:'lost'};
  else { const sid = ghlStageFor(x.stage); if(!sid || sid===x.ghlStageId) return; body = {pipelineStageId:sid, pipelineId:ghlCfg().pipelineId}; x.ghlStageId = sid; }
  ghlCall('PUT', '/opportunities/'+encodeURIComponent(x.ghlOppId), body)
    .catch(function(e){ showToast('Couldn\'t update GoHighLevel: '+e.message, {icon:'&#9888;', duration:5000}); });
}
// every 3 minutes while Operator is on screen (new leads and messages show up fast), every 10 otherwise
setInterval(function(){
  if(typeof state==='undefined' || !state || !state.settings || !ghlOn() || !ghlCfg().autoSync) return;
  const every = (document.hidden ? 10 : 3)*60000;
  if(Date.now()-(ghlCfg().lastSync||0) >= every) ghlSync(false);
}, 60000);
setTimeout(function wait(){ if(typeof state!=='undefined' && state && state.settings && state.business && state.business.crm){ if(ghlOn() && ghlCfg().autoSync) ghlSync(false); } else setTimeout(wait, 2000); }, 15000);
// ---- the settings card ----
function ghlSettingsHtml(){
  const g = ghlCfg(), p = ghlPipeline();
  const ago = g.lastSync ? Math.max(0, Math.round((Date.now()-g.lastSync)/60000)) : null;
  const toggle = function(k, label){ return '<label class="row" style="gap:8px;font-size:13px;color:var(--text-dim);cursor:pointer;"><input type="checkbox" data-ghl-toggle="'+k+'" '+(g[k]?'checked':'')+'>'+label+'</label>'; };
  const head = '<div class="ghl-head"><span class="ghl-logo">GHL</span><div><div class="ghl-title">GoHighLevel</div><div class="kpi-sub">Leads, appointments and messages, in sync with your pipeline.</div></div>'+
    (g.connected ? '<span class="tag tag-good" style="margin-left:auto;">&#10003; Connected</span>' : '')+'</div>';
  if(!ui.ghlBridge || (ui.ghlBridge.state!=='checking' && Date.now()-ui.ghlBridge.at > 30000)) setTimeout(function(){ ghlCheckBridge(false); }, 0);
  const br = ui.ghlBridge || {state:'checking'};
  const bridge = '<div class="ghl-bridge is-'+br.state+'">'+(br.state==='ok' ? '&#9679; Operator app connection ready' : br.state==='checking' ? '&#9675; Checking the Operator app connection…' :
    '&#9679; The Operator app connection isn\'t running. Quit Operator completely (&#8984;Q) and open it again from the Operator app. <button class="btn btn-ghost btn-sm" data-action="ghlCheckBridge">Check again</button>')+'</div>';
  const err = ui.ghlError && !(br.state==='missing' && /reach Operator/.test(ui.ghlError)) ? '<div class="ghl-err">&#9888; '+escapeHtml(ui.ghlError)+'</div>' : '';
  const busy = ui.ghlBusy ? '<span class="kpi-sub">'+escapeHtml(ui.ghlBusy)+'</span>' : '';
  if(!g.connected){
    return '<div class="section"><div class="card ghl-card">'+head+
      '<ol class="ghl-steps">'+
        '<li>In GoHighLevel, open the sub-account &rarr; <b>Settings &rarr; Private Integrations</b> &rarr; <b>Create new integration</b>.</li>'+
        '<li>Give it these scopes: <code>contacts.readonly</code> <code>contacts.write</code> <code>opportunities.readonly</code> <code>opportunities.write</code> <code>calendars.readonly</code> <code>calendars/events.readonly</code> <code>conversations.readonly</code> <code>conversations.write</code> <code>conversations/message.readonly</code> <code>conversations/message.write</code> <code>locations.readonly</code>.</li>'+
        '<li>Copy the key it shows you, and your <b>Location ID</b> (Settings &rarr; Business Profile, or the part of the URL after <code>/location/</code>).</li>'+
      '</ol>'+bridge+
      '<div class="grid grid-2" style="margin-top:12px;">'+
        '<div class="field"><label>Private Integration key'+tip('Saved on this Mac by the Operator app — not in Operator\'s data, exports or backups.')+'</label><input class="input" type="password" id="ghlKey" placeholder="pit-…" autocomplete="off"></div>'+
        '<div class="field"><label>Location ID</label><input class="input" id="ghlLoc" value="'+escapeHtml(g.locationId||'')+'" placeholder="e.g. ve9EPM428h8vShlRW1KT" autocomplete="off"></div>'+
      '</div>'+err+
      '<div class="row" style="margin-top:12px;justify-content:flex-end;gap:10px;">'+busy+'<button class="btn btn-primary" data-action="ghlConnect"'+(ui.ghlBusy?' disabled':'')+'>Connect</button></div>'+
    '</div></div>';
  }
  return '<div class="section"><div class="card ghl-card">'+head+
    bridge+'<div class="ghl-status">'+(g.lastSync ? 'Last sync '+(ago<1 ? 'just now' : ago<60 ? ago+' min ago' : fmtTimeShort(g.lastSync))+(g.lastResult ? ' &middot; '+escapeHtml(ghlResultLine(g.lastResult)) : '') : 'Not synced yet')+'</div>'+err+
    '<div class="grid grid-2" style="margin-top:12px;">'+
      '<div class="field"><label>Pipeline</label><select class="input" id="ghlPipeline">'+g.pipelines.map(function(x){ return '<option value="'+escapeHtml(x.id)+'"'+(x.id===g.pipelineId?' selected':'')+'>'+escapeHtml(x.name)+'</option>'; }).join('')+'</select></div>'+
      '<div class="field"><label>Location</label><div class="kpi-sub" style="padding:9px 0;">'+escapeHtml(g.locationId)+'</div></div>'+
    '</div>'+
    (p ? '<div class="kind-label" style="margin-top:6px;">Stages'+tip('Which of your lead stages each GoHighLevel stage counts as. Moving a lead in either place moves it in the other.')+'</div><div class="ghl-map">'+p.stages.map(function(st){
      return '<div class="ghl-map-row"><span class="ghl-map-k">'+escapeHtml(st.name)+'</span><span class="kpi-sub">&rarr;</span><select class="input" data-ghl-stage="'+escapeHtml(st.id)+'">'+crmStages('lead').map(function(s){ return '<option value="'+s.id+'"'+(g.stageMap[st.id]===s.id?' selected':'')+'>'+escapeHtml(s.label)+'</option>'; }).join('')+'</select></div>';
    }).join('')+'</div>' : '')+
    '<div class="ghl-toggles">'+toggle('syncCalendar', 'Bring in appointments (next 2 weeks)')+toggle('syncMessages', 'Messages: count what you send as touches, and show new ones in the bell')+toggle('pushStages', 'Send stage changes back to GHL')+toggle('pushNewLeads', 'Send leads you add in Operator (and their detail changes) to GHL')+toggle('autoSync', 'Keep in sync on its own (every 3 min while Operator is open)')+'</div>'+
    '<div class="kpi-sub" style="margin-top:8px;">Open any lead or client and hit <b>&#128172; GoHighLevel</b> to text, email, add notes and tasks, and see their appointments — right here. Added scopes since you connected? Messages need <code>conversations/message.write</code> and editing contacts needs <code>contacts.write</code>.</div>'+
    '<div class="row" style="margin-top:14px;justify-content:space-between;gap:10px;">'+
      '<button class="btn btn-ghost btn-sm" data-action="ghlDisconnect">Disconnect</button>'+
      '<span class="row" style="gap:10px;">'+busy+'<button class="btn btn-primary" data-action="ghlSyncNow"'+(ui.ghlBusy?' disabled':'')+'>&#128260; Sync now</button></span>'+
    '</div>'+
  '</div></div>';
}
