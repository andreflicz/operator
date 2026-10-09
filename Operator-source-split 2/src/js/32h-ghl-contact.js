
// ============ GOHIGHLEVEL, INSIDE OPERATOR ============
// Open any lead or client's GoHighLevel side without leaving the app: the whole conversation
// (reply by text or email right here), their notes, GHL tasks, appointments, and their contact
// details (edit them here and GHL updates). A lead that isn't in GoHighLevel yet gets an
// "Add to GoHighLevel" button — and new leads you add in Operator go to GHL on their own.
// Everything goes through the same Operator-app bridge as the sync.
function ghlRec(kind, id){ return kind==='client' ? state.business.clients.find(function(c){ return c.id===id; }) : state.business.pipeline.find(function(l){ return l.id===id; }); }
function ghlRecName(kind, x){ return kind==='client' ? (x.business || x.name || 'Client') : (x.company || x.name || 'Lead'); }
function ghlSplitName(n){ const p = String(n||'').trim().split(/\s+/); return {firstName:p[0]||'', lastName:p.slice(1).join(' ')}; }
function ghlSig(x){ return [x.name||'', x.email||'', x.phone||'', x.company||x.business||''].join('|'); }
function ghlContactBody(kind, x){
  const nm = x.name || (kind==='client' ? x.business : x.company) || '';
  return Object.assign({name:nm, email:x.email || undefined, phone:x.phone || undefined, companyName:(kind==='client' ? x.business : x.company) || undefined}, ghlSplitName(nm));
}
// a lead/client that isn't in GHL yet → contact (+ opportunity for an open lead)
async function ghlPushRecord(kind, x){
  const g = ghlCfg();
  const r = await ghlCall('POST', '/contacts/upsert', Object.assign({locationId:g.locationId, source:'Operator'}, ghlContactBody(kind, x)));
  const c = r.contact || r; if(!c || !c.id) throw new Error('GoHighLevel didn\'t send back a contact.');
  x.ghlContactId = c.id; x.ghlSig = ghlSig(x);
  if(kind==='lead' && !x.ghlOppId && g.pipelineId && leadIsOpen(x)){
    const p = ghlPipeline(), sid = ghlStageFor(x.stage) || (p && p.stages[0] && p.stages[0].id);
    if(sid){
      const o = await ghlCall('POST', '/opportunities/', {pipelineId:g.pipelineId, locationId:g.locationId, name:ghlRecName(kind, x), pipelineStageId:sid, status:'open', contactId:c.id, monetaryValue:Number(x.value)||0});
      const opp = o.opportunity || o; if(opp && opp.id){ x.ghlOppId = opp.id; x.ghlStageId = sid; }
    }
  }
  crmTimeline(x, 'note', 'Added to GoHighLevel');
  persist('business');
}
// during a sync: new leads made here go to GHL, and details you changed here go back up
async function ghlPushLocal(g, out){
  if(!g.connectedAt){ g.connectedAt = Date.now(); return; }
  const since = todayStr(new Date(g.connectedAt));
  for(const x of state.business.pipeline){
    if(x.convertedClientId || !leadIsOpen(x)) continue;
    if(!x.ghlContactId){
      if(g.pushNewLeads!==false && (x.createdAt||'') >= since && !x.ghlPushFailed){
        try{ await ghlPushRecord('lead', x); out.pushed = (out.pushed||0)+1; }catch(e){ x.ghlPushFailed = true; }
      }
    } else if(x.ghlSig && x.ghlSig!==ghlSig(x)){
      try{ await ghlCall('PUT', '/contacts/'+encodeURIComponent(x.ghlContactId), ghlContactBody('lead', x)); x.ghlSig = ghlSig(x); out.updated = (out.updated||0)+1; }catch(e){}
    } else if(!x.ghlSig) x.ghlSig = ghlSig(x);
  }
}
// ---- the pane ----
function ghlPane(){ return ui.ghlPane || null; }
ACTIONS.openGhlContact = function(el, e, id){
  if(e) e.stopPropagation();
  let kind = el && el.dataset ? el.dataset.kind : null, rec = null, cid = null;
  if(kind){ rec = ghlRec(kind, id); cid = rec && rec.ghlContactId; }
  else { cid = id; const r = ghlRecordForContact(cid); if(r){ kind = r.kind; rec = r.x; } }
  ui.ghlPane = {cid:cid, kind:kind, id:rec ? rec.id : null, tab:'messages', channel:'SMS', data:{}, loading:{}, err:null};
  showOverlay('ghlOverlay'); renderGhlPaneInto();
  if(cid) ghlLoadTab('contact').then(function(){ ghlLoadTab('messages'); });
};
ACTIONS.closeGhlPane = function(){ ui.ghlPane = null; hideOverlay('ghlOverlay'); renderView(); };
ACTIONS.ghlTab = function(el, e, id){ const p = ghlPane(); if(!p) return; p.tab = id; renderGhlPaneInto(); if(!p.data[id]) ghlLoadTab(id); };
ACTIONS.ghlChannel = function(el, e, id){ const p = ghlPane(); if(!p) return; p.channel = id; renderGhlPaneInto(); };
async function ghlLoadTab(tab){
  const p = ghlPane(); if(!p || !p.cid) return;
  const g = ghlCfg(), cid = encodeURIComponent(p.cid);
  p.loading[tab] = true; renderGhlPaneInto();
  try{
    if(tab==='contact'){ const r = await ghlCall('GET', '/contacts/'+cid); p.data.contact = r.contact || r; }
    else if(tab==='messages'){
      const s = await ghlCall('GET', '/conversations/search?'+ghlQ({locationId:g.locationId, contactId:p.cid, limit:1}));
      const cv = arr(s.conversations)[0];
      p.convId = cv ? cv.id : null;
      if(p.convId){
        const r = await ghlCall('GET', '/conversations/'+encodeURIComponent(p.convId)+'/messages?limit=40');
        const m = r.messages && Array.isArray(r.messages.messages) ? r.messages.messages : arr(r.messages);
        p.data.messages = m.slice().sort(function(a, b){ return Date.parse(a.dateAdded||0)-Date.parse(b.dateAdded||0); });
        // seen it here → it's read (in GHL too), and off the notifications
        if(cv.unreadCount){ ghlCall('PUT', '/conversations/'+encodeURIComponent(p.convId), {unreadCount:0}).catch(function(){}); }
        g.inbox = arr(g.inbox).filter(function(x){ return x.contactId!==p.cid; }); persist('settings');
      } else p.data.messages = [];
    }
    else if(tab==='notes'){ const r = await ghlCall('GET', '/contacts/'+cid+'/notes'); p.data.notes = arr(r.notes).sort(function(a, b){ return Date.parse(b.dateAdded||0)-Date.parse(a.dateAdded||0); }); }
    else if(tab==='tasks'){ const r = await ghlCall('GET', '/contacts/'+cid+'/tasks'); p.data.tasks = arr(r.tasks); }
    else if(tab==='appts'){ const r = await ghlCall('GET', '/contacts/'+cid+'/appointments'); p.data.appts = arr(r.events || r.appointments); }
    p.err = null;
  }catch(e){ p.err = e.message; }
  p.loading[tab] = false;
  if(ghlPane()===p){ renderGhlPaneInto(); if(tab==='messages') ghlScrollThread(); }
}
function ghlScrollThread(){ requestAnimationFrame(function(){ const t = document.getElementById('ghlThread'); if(t) t.scrollTop = t.scrollHeight; }); }
function ghlWhen(v){ const d = new Date(typeof v==='number' ? v : Date.parse(v)); if(isNaN(d)) return ''; return (todayStr(d)===todayStr() ? '' : fmtDateShort(todayStr(d))+' ')+d.toLocaleTimeString(undefined, {hour:'numeric', minute:'2-digit'}); }
function ghlMsgType(m){ const t = String(m.messageType||m.type||''); return /EMAIL/i.test(t) ? 'Email' : /CALL/i.test(t) ? 'Call' : /FB|INSTAGRAM|IG/i.test(t) ? 'DM' : 'SMS'; }
function ghlPaneHtml(){
  const p = ghlPane(); if(!p) return '';
  const rec = p.kind ? ghlRec(p.kind, p.id) : null;
  const c = p.data.contact || {};
  const name = c.contactName || c.name || [c.firstName, c.lastName].filter(Boolean).join(' ') || (rec ? ghlRecName(p.kind, rec) : 'Contact');
  const head = '<div class="gp-head"><span class="ghl-logo">GHL</span><div class="gp-who"><div class="gp-name">'+escapeHtml(name)+'</div><div class="kpi-sub">'+
      [c.companyName || (rec && (rec.company || rec.business)), c.phone || (rec && rec.phone), c.email || (rec && rec.email)].filter(Boolean).map(escapeHtml).join(' &middot; ')+'</div></div>'+
      '<span style="flex:1"></span>'+(p.cid ? '<button class="btn btn-ghost btn-sm" data-action="ghlRefresh" title="Reload from GoHighLevel">&#8635;</button>' : '')+
      '<button class="btn btn-ghost btn-sm" data-action="closeGhlPane">Close</button></div>';
  if(!ghlOn()) return head+'<div class="empty">Connect GoHighLevel in Settings &rarr; Integrations first.</div>';
  if(!p.cid){
    return head+'<div class="gp-empty"><div style="font-size:28px;">&#128228;</div><div>'+escapeHtml(rec ? ghlRecName(p.kind, rec) : 'This contact')+' isn\'t in GoHighLevel yet.</div>'+
      (rec ? '<button class="btn btn-primary" data-action="ghlPushOne"'+(p.busy?' disabled':'')+'>'+(p.busy ? 'Adding…' : 'Add to GoHighLevel')+'</button>' : '')+
      (p.err ? '<div class="ghl-err">&#9888; '+escapeHtml(p.err)+'</div>' : '')+'</div>';
  }
  const tab = function(id, label){ return '<button class="seg-tab'+(p.tab===id?' active':'')+'" data-action="ghlTab" data-id="'+id+'">'+label+'</button>'; };
  let body = '';
  const loading = p.loading[p.tab] && !p.data[p.tab];
  if(loading) body = '<div class="gp-loading">Loading from GoHighLevel…</div>';
  else if(p.tab==='messages'){
    const msgs = arr(p.data.messages);
    body = '<div class="gp-thread" id="ghlThread">'+(msgs.length ? msgs.map(function(m){
        const out = /out/i.test(m.direction||'');
        return '<div class="gp-msg '+(out?'is-out':'is-in')+'"><div class="gp-bubble">'+escapeHtml(m.body || m.subject || (ghlMsgType(m)==='Call' ? 'Call' : ''))+'</div><div class="gp-meta">'+ghlMsgType(m)+' &middot; '+ghlWhen(m.dateAdded)+'</div></div>';
      }).join('') : '<div class="gp-loading">No messages yet — say hi.</div>')+'</div>'+
      '<div class="gp-compose">'+
        '<div class="seg-tabs seg-sm" style="margin:0;"><button class="seg-tab'+(p.channel==='SMS'?' active':'')+'" data-action="ghlChannel" data-id="SMS">Text</button><button class="seg-tab'+(p.channel==='Email'?' active':'')+'" data-action="ghlChannel" data-id="Email">Email</button></div>'+
        (p.channel==='Email' ? '<input class="input" id="ghlSubject" placeholder="Subject">' : '')+
        '<div class="gp-send-row"><textarea class="input" id="ghlMsg" rows="2" placeholder="'+(p.channel==='Email'?'Write an email…':'Write a text…')+' (⌘↵ to send)"></textarea><button class="btn btn-primary" data-action="ghlSend"'+(p.sending?' disabled':'')+'>'+(p.sending?'Sending…':'Send')+'</button></div>'+
      '</div>';
  }
  else if(p.tab==='notes'){
    body = '<div class="gp-add"><textarea class="input" id="ghlNote" rows="2" placeholder="Add a note…"></textarea><button class="btn btn-primary btn-sm" data-action="ghlAddNote">Add</button></div>'+
      '<div class="gp-list">'+(arr(p.data.notes).map(function(n){ return '<div class="gp-note"><div class="gp-note-b">'+escapeHtml(n.body||'')+'</div><div class="gp-meta">'+ghlWhen(n.dateAdded)+'</div></div>'; }).join('') || '<div class="gp-loading">No notes yet.</div>')+'</div>';
  }
  else if(p.tab==='tasks'){
    body = '<div class="gp-add"><input class="input" id="ghlTaskTitle" placeholder="New task…" style="flex:1;"><input class="input" type="date" id="ghlTaskDue" value="'+addDays(todayStr(), 1)+'" style="width:150px;">'+
        '<label class="kpi-sub" style="display:flex;gap:4px;align-items:center;white-space:nowrap;"><input type="checkbox" id="ghlTaskMine" checked>also in my tasks</label><button class="btn btn-primary btn-sm" data-action="ghlAddTask">Add</button></div>'+
      '<div class="gp-list">'+(arr(p.data.tasks).map(function(t){
        return '<div class="gp-task'+(t.completed?' is-done':'')+'"><button class="gp-tick" data-action="ghlTaskDone" data-id="'+escapeHtml(t.id)+'" title="'+(t.completed?'Done':'Mark done')+'">'+(t.completed?'&#10003;':'')+'</button><span class="gp-task-t">'+escapeHtml(t.title||'')+'</span><span class="gp-meta">'+(t.dueDate ? 'due '+fmtDateShort(todayStr(new Date(t.dueDate))) : '')+'</span></div>';
      }).join('') || '<div class="gp-loading">No tasks.</div>')+'</div>';
  }
  else if(p.tab==='appts'){
    body = '<div class="gp-list">'+(arr(p.data.appts).sort(function(a, b){ return Date.parse(a.startTime||0)-Date.parse(b.startTime||0); }).map(function(a){
      return '<div class="gp-appt"><span class="gp-appt-d">'+ghlWhen(a.startTime)+'</span><span>'+escapeHtml(a.title || 'Appointment')+'</span><span class="kpi-sub">'+escapeHtml(a.appointmentStatus || a.status || '')+'</span></div>';
    }).join('') || '<div class="gp-loading">No appointments.</div>')+'</div>';
  }
  else if(p.tab==='details'){
    const v = function(k){ return escapeHtml(c[k] || ''); };
    body = '<div class="grid grid-2 gp-details">'+
      '<div class="field"><label>First name</label><input class="input" id="ghlFirst" value="'+v('firstName')+'"></div>'+
      '<div class="field"><label>Last name</label><input class="input" id="ghlLast" value="'+v('lastName')+'"></div>'+
      '<div class="field"><label>Phone</label><input class="input" id="ghlPhone" value="'+v('phone')+'"></div>'+
      '<div class="field"><label>Email</label><input class="input" id="ghlEmail" value="'+v('email')+'"></div>'+
      '<div class="field"><label>Company</label><input class="input" id="ghlCompany" value="'+v('companyName')+'"></div>'+
      '<div class="field"><label>Tags</label><input class="input" id="ghlTags" value="'+escapeHtml(arr(c.tags).join(', '))+'" placeholder="comma, separated"></div>'+
    '</div><div class="row" style="justify-content:flex-end;margin-top:12px;"><button class="btn btn-primary" data-action="ghlSaveContact"'+(p.saving?' disabled':'')+'>'+(p.saving?'Saving…':'Save to GoHighLevel')+'</button></div>';
  }
  return head+
    '<div class="seg-tabs" style="margin:10px 0 12px;">'+tab('messages','&#128172; Conversation')+tab('notes','&#128221; Notes')+tab('tasks','&#9745; Tasks')+tab('appts','&#128197; Appointments')+tab('details','&#9998; Details')+'</div>'+
    (p.err ? '<div class="ghl-err">&#9888; '+escapeHtml(p.err)+'</div>' : '')+
    '<div class="gp-body">'+body+'</div>';
}
function renderGhlPaneInto(){ const el = document.getElementById('ghlContent'); if(el) morphInto(el, ghlPaneHtml(), {form:true}); }
registerModal('ghlOverlay', renderGhlPaneInto);
ACTIONS.ghlRefresh = function(){ const p = ghlPane(); if(!p) return; p.data = {}; ghlLoadTab('contact').then(function(){ ghlLoadTab(p.tab); }); };
ACTIONS.ghlPushOne = async function(){
  const p = ghlPane(); if(!p) return; const rec = ghlRec(p.kind, p.id); if(!rec) return;
  p.busy = true; p.err = null; renderGhlPaneInto();
  try{ await ghlPushRecord(p.kind, rec); p.cid = rec.ghlContactId; p.busy = false; renderGhlPaneInto(); await ghlLoadTab('contact'); ghlLoadTab('messages'); showToast('Added to GoHighLevel.', {icon:'&#10003;'}); }
  catch(e){ p.busy = false; p.err = e.message; renderGhlPaneInto(); }
};
// log what you sent as a touch on the lead/client, the same as one sent from GHL
function ghlLogTouch(p, type, note){
  const rec = p.kind ? ghlRec(p.kind, p.id) : null; if(!rec) return;
  if(!Array.isArray(rec.touchpoints)) rec.touchpoints = [];
  rec.touchpoints.push({id:uid(), type:type, date:todayStr(), note:note, ts:Date.now(), via:'ghl'});
  rec.ghlLastMsgAt = Date.now();
  if(p.kind==='client'){ if(!Array.isArray(rec.touches)) rec.touches = []; rec.touches.push(todayStr()); }
  if(rec.followUp && rec.followUp.date && todayStr() >= rec.followUp.date) rec.followUp = null;
  persist('business');
}
ACTIONS.ghlSend = async function(){
  const p = ghlPane(); if(!p || p.sending) return;
  const box = document.getElementById('ghlMsg'), text = box ? box.value.trim() : ''; if(!text) return;
  const subjEl = document.getElementById('ghlSubject'), subject = subjEl ? subjEl.value.trim() : '';
  const body = p.channel==='Email' ? {type:'Email', contactId:p.cid, subject:subject || 'Quick note', html:escapeHtml(text).replace(/\n/g, '<br>'), message:text} : {type:'SMS', contactId:p.cid, message:text};
  p.sending = true; renderGhlPaneInto();
  try{
    await ghlCall('POST', '/conversations/messages', body);
    p.data.messages = arr(p.data.messages).concat([{direction:'outbound', body:text, messageType:p.channel==='Email'?'TYPE_EMAIL':'TYPE_SMS', dateAdded:new Date().toISOString()}]);
    if(box) box.value = ''; if(subjEl) subjEl.value = '';
    ghlLogTouch(p, p.channel==='Email' ? 'email' : 'text', 'Sent from Operator');
    playTick(); p.err = null;
  }catch(e){ p.err = 'Couldn\'t send: '+e.message; }
  p.sending = false; renderGhlPaneInto(); ghlScrollThread();
};
document.addEventListener('keydown', function(e){
  if(e.key==='Enter' && (e.metaKey || e.ctrlKey) && e.target && e.target.id==='ghlMsg'){ e.preventDefault(); ACTIONS.ghlSend(); }
  if(e.key==='Enter' && (e.metaKey || e.ctrlKey) && e.target && e.target.id==='ghlNote'){ e.preventDefault(); ACTIONS.ghlAddNote(); }
  if(e.key==='Enter' && e.target && e.target.id==='ghlTaskTitle'){ e.preventDefault(); ACTIONS.ghlAddTask(); }
});
ACTIONS.ghlAddNote = async function(){
  const p = ghlPane(); if(!p) return; const box = document.getElementById('ghlNote'), text = box ? box.value.trim() : ''; if(!text) return;
  try{
    const r = await ghlCall('POST', '/contacts/'+encodeURIComponent(p.cid)+'/notes', {body:text});
    p.data.notes = [r.note || {body:text, dateAdded:new Date().toISOString()}].concat(arr(p.data.notes));
    if(box) box.value = '';
    const rec = p.kind ? ghlRec(p.kind, p.id) : null; if(rec){ crmTimeline(rec, 'note', text); persist('business'); }
    p.err = null; playTick();
  }catch(e){ p.err = 'Couldn\'t save the note: '+e.message; }
  renderGhlPaneInto();
};
ACTIONS.ghlAddTask = async function(){
  const p = ghlPane(); if(!p) return;
  const t = document.getElementById('ghlTaskTitle'), d = document.getElementById('ghlTaskDue'), mine = document.getElementById('ghlTaskMine');
  const title = t ? t.value.trim() : ''; if(!title) return;
  const due = (d && d.value) || addDays(todayStr(), 1);
  try{
    const r = await ghlCall('POST', '/contacts/'+encodeURIComponent(p.cid)+'/tasks', {title:title, body:'', dueDate:new Date(localTs(due, '17:00')).toISOString(), completed:false});
    const gt = r.task || {id:'', title:title, dueDate:due};
    p.data.tasks = arr(p.data.tasks).concat([gt]);
    if(mine && mine.checked){
      const rec = p.kind ? ghlRec(p.kind, p.id) : null;
      const cl = rec ? (p.kind==='lead' ? 'lead:'+rec.id : rec.id) : 'personal';
      state.tasks.items.push({id:uid(), title:title, client:cl, clients:[cl], priority:'med', deadline:due, notes:'', status:'backlog', createdAt:todayStr(), completedAt:null, ghlTaskId:gt.id||null, ghlContactId:p.cid});
      persist('tasks');
    }
    if(t) t.value = ''; p.err = null; playTaskAdded();
  }catch(e){ p.err = 'Couldn\'t add the task: '+e.message; }
  renderGhlPaneInto();
};
ACTIONS.ghlTaskDone = async function(el, e, id){
  const p = ghlPane(); if(!p) return; const t = arr(p.data.tasks).find(function(x){ return x.id===id; }); if(!t || t.completed) return;
  t.completed = true; renderGhlPaneInto();
  try{ await ghlCall('PUT', '/contacts/'+encodeURIComponent(p.cid)+'/tasks/'+encodeURIComponent(id)+'/completed', {completed:true}); playTaskComplete(); }
  catch(err){ t.completed = false; p.err = err.message; renderGhlPaneInto(); }
};
ACTIONS.ghlSaveContact = async function(){
  const p = ghlPane(); if(!p) return;
  const v = function(id){ const el = document.getElementById(id); return el ? el.value.trim() : ''; };
  const body = {firstName:v('ghlFirst'), lastName:v('ghlLast'), phone:v('ghlPhone') || undefined, email:v('ghlEmail') || undefined, companyName:v('ghlCompany') || undefined,
    tags:v('ghlTags').split(',').map(function(s){ return s.trim(); }).filter(Boolean)};
  body.name = [body.firstName, body.lastName].filter(Boolean).join(' ');
  p.saving = true; renderGhlPaneInto();
  try{
    const r = await ghlCall('PUT', '/contacts/'+encodeURIComponent(p.cid), body);
    p.data.contact = Object.assign({}, p.data.contact, r.contact || body);
    const rec = p.kind ? ghlRec(p.kind, p.id) : null;
    if(rec){ if(body.name) rec.name = body.name; if(body.email) rec.email = body.email; if(body.phone) rec.phone = body.phone; if(p.kind==='lead' && body.companyName) rec.company = body.companyName; rec.ghlSig = ghlSig(rec); persist('business'); }
    p.err = null; showToast('Saved to GoHighLevel.', {icon:'&#10003;'});
  }catch(e){ p.err = 'Couldn\'t save: '+e.message; }
  p.saving = false; renderGhlPaneInto();
};
function ghlPaneBtnHtml(kind, x){
  if(!ghlCfg().connected || !x) return '';
  return '<button class="btn btn-ghost btn-sm gp-open" data-action="openGhlContact" data-kind="'+kind+'" data-id="'+x.id+'" title="Messages, notes, tasks and appointments in GoHighLevel">&#128172; '+(x.ghlContactId ? 'GoHighLevel' : 'Add to GHL')+'</button>';
}
