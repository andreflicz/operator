
// ============ OUTREACH ============
// The touch system, grown up a little:
//  · Follow up on a day, with a reason ("Thursday — about the proposal"). It replaces the usual
//    rhythm until you touch base on/after that day, and shows in every reach-out list meanwhile.
//  · Reach out in one tap: Text / Email / Call open Messages, Mail or FaceTime with a ready message
//    (your templates, Settings → Business) and log the touch.
//  · Calendar events linked to a client or lead log a "meeting" touch on their own once they start.
//  · The week at a glance on the Business overview: who you touched, who's due, your reach-out streak.
const DEFAULT_TEMPLATES = {
  leadText:'Hey {first}! {me} here — just checking in. Any questions on what we talked about?',
  clientText:'Hey {first}, quick check-in from {me} — how\'s everything going on your end?',
  leadEmailSubject:'Quick follow-up', leadEmailBody:'Hi {first},\n\nJust following up on our conversation — happy to answer any questions.\n\nBest,\n{me}',
  clientEmailSubject:'Checking in', clientEmailBody:'Hi {first},\n\nWanted to check in and see how everything\'s going.\n\nBest,\n{me}'
};
function crmTemplates(){ const c = crm(); if(!c.templates || typeof c.templates!=='object') c.templates = {}; Object.keys(DEFAULT_TEMPLATES).forEach(function(k){ if(typeof c.templates[k]!=='string') c.templates[k] = DEFAULT_TEMPLATES[k]; }); return c.templates; }
function fillTemplate(tpl, kind, x){
  const person = (x.name || crmName(kind, x) || '').trim();
  return String(tpl||'').replace(/\{first\}/g, person.split(/\s+/)[0] || 'there').replace(/\{name\}/g, crmName(kind, x)).replace(/\{me\}/g, (state.profile.name||'').trim()).replace(/\{note\}/g, x.followUp && x.followUp.note || '');
}
// ---- follow-ups ----
function setFollowUp(kind, id, date, note){
  const x = crmFind(kind, id); if(!x) return;
  x.followUp = date ? {date:date, note:(note||'').trim(), set:Date.now()} : null;
  crmTimeline(x, 'followup', date ? 'Follow-up set for '+fmtDateShort(date)+(note ? ' — '+note.trim() : '') : 'Follow-up cleared');
  persist('business'); renderView(); if(typeof rerenderContactModal==='function') rerenderContactModal();
}
function followUpMenuHtml(kind, x){
  const k = kind+':'+x.id;
  return crow('Follow up', chip('fu', 'Tomorrow', {a:k, b:'1'})+chip('fu', 'In 3 days', {a:k, b:'3'})+chip('fu', 'Next week', {a:k, b:'7'})+chip('fu', 'Pick…', {a:k, b:'0'})+(x.followUp ? chip('fuClear', 'Clear', {a:k}) : ''));
}
let fuAnchor = {x:0, y:0};
document.addEventListener('contextmenu', function(e){ fuAnchor = {x:e.clientX, y:e.clientY}; }, true);
function closeFollowUpPop(){ const m = document.getElementById('followUpPop'); if(m) m.remove(); }
function openFollowUpPop(kind, id, days){
  const x = crmFind(kind, id); if(!x) return;
  closeFollowUpPop();
  const date = x.followUp && !Number(days) ? x.followUp.date : addDays(todayStr(), Number(days) || 1);
  const m = document.createElement('div');
  m.id = 'followUpPop'; m.className = 'ctx-menu fu-pop';
  m.innerHTML = '<div class="ctx-title">Follow up with '+escapeHtml(crmName(kind, x))+'</div>'+
    '<div class="fu-body"><input class="input" type="date" id="fuDate" value="'+date+'" min="'+todayStr()+'">'+
    '<input class="input" id="fuNote" placeholder="What about? (optional)" value="'+escapeHtml(x.followUp && x.followUp.note || '')+'">'+
    '<div class="row" style="gap:6px;justify-content:flex-end;"><button class="btn btn-ghost btn-sm" data-action="fuCancel">Cancel</button><button class="btn btn-primary btn-sm" data-action="fuSave" data-kind="'+kind+'" data-id="'+id+'">Set follow-up</button></div></div>';
  document.body.appendChild(m);
  const r = m.getBoundingClientRect();
  m.style.left = Math.max(8, Math.min(fuAnchor.x, window.innerWidth-r.width-8))+'px';
  m.style.top = Math.max(8, Math.min(fuAnchor.y, window.innerHeight-r.height-8))+'px';
  setTimeout(function(){ const n = document.getElementById('fuNote'); if(n) n.focus(); }, 20);
}
ACTIONS.fuCancel = closeFollowUpPop;
ACTIONS.fuSave = function(el){
  const d = document.getElementById('fuDate'), n = document.getElementById('fuNote');
  if(!d || !d.value) return;
  setFollowUp(el.dataset.kind, el.dataset.id, d.value, n ? n.value : '');
  closeFollowUpPop(); playTick();
  showToast('Follow-up set for '+fmtDateShort(d.value), {icon:'&#128204;', duration:2500});
};
ACTIONS.fuOpen = function(el){ fuAnchor = (function(r){ return {x:r.left, y:r.bottom+6}; })(el.getBoundingClientRect()); openFollowUpPop(el.dataset.kind, el.dataset.id, el.dataset.days || 0); };
ACTIONS.fuClearBtn = function(el){ setFollowUp(el.dataset.kind, el.dataset.id, null); };
document.addEventListener('keydown', function(e){
  const pop = document.getElementById('followUpPop'); if(!pop) return;
  if(e.key==='Escape') closeFollowUpPop();
  else if(e.key==='Enter' && e.target && (e.target.id==='fuNote' || e.target.id==='fuDate')){ e.preventDefault(); const b = pop.querySelector('[data-action="fuSave"]'); if(b) ACTIONS.fuSave(b); }
});
document.addEventListener('pointerdown', function(e){ const m = document.getElementById('followUpPop'); if(m && !m.contains(e.target)) closeFollowUpPop(); }, true);
// in the contact card
function followUpFormHtml(kind, x){
  const fu = x.followUp;
  return '<div class="kind-label">Follow up'+tip('Pick a day (and why). It replaces the usual rhythm until you touch base on or after that day.')+'</div>'+
    '<div class="fu-card">'+(fu
      ? '<span class="fu-when">&#128204; '+escapeHtml(fmtDateShort(fu.date))+' ('+weekdayShort(fu.date)+')'+(fu.note ? ' — '+escapeHtml(fu.note) : '')+'</span><span style="flex:1"></span><button class="btn btn-ghost btn-sm" data-action="fuOpen" data-kind="'+kind+'" data-id="'+x.id+'">Change</button><button class="btn btn-ghost btn-sm" data-action="fuClearBtn" data-kind="'+kind+'" data-id="'+x.id+'">Clear</button>'
      : ['1','3','7'].map(function(d){ return '<button class="btn btn-ghost btn-sm" data-action="fuOpen" data-kind="'+kind+'" data-id="'+x.id+'" data-days="'+d+'">'+(d==='1'?'Tomorrow':d==='3'?'In 3 days':'Next week')+'</button>'; }).join('')+'<button class="btn btn-ghost btn-sm" data-action="fuOpen" data-kind="'+kind+'" data-id="'+x.id+'" data-days="0">Pick a day…</button>')+
    '</div>';
}
// ---- reach out in one tap ----
function contactDigits(x){ const p = String(x.phone||'').replace(/[^\d+]/g, ''); return p.length >= 7 ? p : ''; }
function reachButtonsHtml(kind, x, chips){
  const k = kind+':'+x.id, ph = contactDigits(x), em = String(x.email||'').indexOf('@')>0;
  const mk = chips ? function(how, label, ok, title){ return chip('reach', label, {a:k, b:how, cls:ok?'':'is-off', title:title}); }
    : function(how, label, ok, title){ return '<button class="touch-menu-btn reach-btn'+(ok?'':' is-off')+'" data-action="reachOut" data-kind="'+kind+'" data-id="'+x.id+'" data-how="'+how+'" title="'+escapeHtml(title)+'">'+label+'</button>'; };
  return mk('text', '&#128172; Text', ph, ph ? 'Opens Messages with your text ready, and logs it' : 'Add a phone number to text them')+
    mk('email', '&#9993;&#65039; Email', em, em ? 'Opens Mail with your email ready, and logs it' : 'Add an email address')+
    mk('call', '&#128222; Call', ph, ph ? 'Calls through FaceTime / your iPhone, and logs it' : 'Add a phone number to call them');
}
function contactReachHtml(kind, x){ return crow('Reach out', reachButtonsHtml(kind, x, true)); }
function openExternal(url){ const a = document.createElement('a'); a.href = url; a.rel = 'noopener'; a.style.display = 'none'; document.body.appendChild(a); a.click(); a.remove(); }
function reachOut(kind, id, how){
  const x = crmFind(kind, id); if(!x) return;
  const t = crmTemplates(), ph = contactDigits(x), em = String(x.email||'').trim();
  if((how==='text' || how==='call') && !ph){ showToast('Add a phone number for '+crmName(kind, x)+' first.', {icon:'&#128222;'}); openContact(kind, id); return; }
  if(how==='email' && em.indexOf('@')<1){ showToast('Add an email address for '+crmName(kind, x)+' first.', {icon:'&#9993;&#65039;'}); openContact(kind, id); return; }
  if(how==='text') openExternal('sms:'+ph+'&body='+encodeURIComponent(fillTemplate(kind==='lead' ? t.leadText : t.clientText, kind, x)));
  else if(how==='email') openExternal('mailto:'+encodeURIComponent(em)+'?subject='+encodeURIComponent(fillTemplate(kind==='lead' ? t.leadEmailSubject : t.clientEmailSubject, kind, x))+'&body='+encodeURIComponent(fillTemplate(kind==='lead' ? t.leadEmailBody : t.clientEmailBody, kind, x)));
  else if(how==='call') openExternal('tel:'+ph);
  logTouch(kind, id, how==='email' ? 'email' : how==='call' ? 'call' : 'text');
}
ACTIONS.reachOut = function(el){ ui.touchMenu = null; reachOut(el.dataset.kind, el.dataset.id, el.dataset.how); };
// right-click menu items that live here
function ctxExtra(op, a, b){
  const p = String(a||'').split(':');
  if(op==='fu') openFollowUpPop(p[0], p[1], b);
  else if(op==='fuClear') setFollowUp(p[0], p[1], null);
  else if(op==='reach') reachOut(p[0], p[1], b);
}
// ---- templates (Settings → Business) ----
function messageTemplatesHtml(){
  const t = crmTemplates();
  const f = function(key, label, rows){ return '<div class="field"><label>'+label+'</label>'+(rows ? '<textarea class="input" data-tpl="'+key+'" rows="'+rows+'" style="width:100%;">'+escapeHtml(t[key])+'</textarea>' : '<input class="input" data-tpl="'+key+'" value="'+escapeHtml(t[key])+'" style="width:100%;">')+'</div>'; };
  return '<div class="card section"><div class="section-title">Message templates'+tip('Used by Text and Email (right-click a client or lead, or the ⌄ next to the touch button). {first} = their first name, {name} = the business, {me} = you, {note} = the follow-up reason.')+'</div>'+
    '<div class="grid grid-2">'+f('leadText', 'Text to a lead', 3)+f('clientText', 'Text to a client', 3)+'</div>'+
    '<div class="grid grid-2" style="margin-top:8px;">'+
      '<div>'+f('leadEmailSubject', 'Email to a lead — subject')+f('leadEmailBody', 'Email to a lead', 5)+'</div>'+
      '<div>'+f('clientEmailSubject', 'Email to a client — subject')+f('clientEmailBody', 'Email to a client', 5)+'</div>'+
    '</div></div>';
}
let tplSaveT = 0;
document.addEventListener('input', function(e){
  const k = e.target && e.target.dataset && e.target.dataset.tpl; if(!k) return;
  crmTemplates()[k] = e.target.value;
  clearTimeout(tplSaveT); tplSaveT = setTimeout(function(){ persist('business'); }, 400);
});
// ---- meetings on the calendar count as touches ----
function autoLogMeetings(){
  if(typeof state==='undefined' || !state || !state.business || !state.calendar) return;
  const c = crm();
  if(!c.autoMeetingSince){ c.autoMeetingSince = todayStr(); persist('business'); }
  const today = todayStr(), hm = nowHM();
  let changed = false;
  arr(state.calendar.events).forEach(function(ev){
    if(!ev.linkedClient || ev.touchLogged || ev.date < c.autoMeetingSince) return;
    if(!(ev.date < today || (ev.date===today && ev.time && ev.time <= hm))) return;
    const kind = String(ev.linkedClient).indexOf('lead:')===0 ? 'lead' : 'client';
    const id = kind==='lead' ? ev.linkedClient.slice(5) : ev.linkedClient;
    if(!crmFind(kind, id)) return;
    ev.touchLogged = true; changed = true;
    logTouch(kind, id, 'meeting', ev.date, ev.title || 'Meeting');
  });
  if(changed) persist('calendar');
}
setInterval(autoLogMeetings, 60000);
setTimeout(function wait(){ if(typeof state!=='undefined' && state && state.calendar && state.business && state.business.crm) autoLogMeetings(); else setTimeout(wait, 1000); }, 4000);
// ---- the week at a glance ----
function outreachWeek(){
  const days = weekDays(0), set = {}, perDay = {}, people = {};
  days.forEach(function(d){ perDay[d] = 0; set[d] = true; });
  let total = 0;
  ['client','lead'].forEach(function(kind){
    crmList(kind).forEach(function(x){
      arr(x.touchpoints).forEach(function(t){ if(set[t.date]){ perDay[t.date]++; total++; people[kind+':'+x.id] = {kind:kind, x:x}; } });
    });
  });
  // streak: days in a row with at least one touch (today only counts once it has one; days off don't break it)
  const all = {};
  ['client','lead'].forEach(function(kind){ crmList(kind).forEach(function(x){ arr(x.touchpoints).forEach(function(t){ all[t.date] = true; }); }); });
  let streak = 0, d = all[todayStr()] ? todayStr() : addDays(todayStr(), -1);
  for(let i=0; i<400; i++){ if(all[d]) streak++; else if(!isDayOff(d)) break; d = addDays(d, -1); }
  return {days:days, perDay:perDay, total:total, people:Object.keys(people).map(function(k){ return people[k]; }), streak:streak};
}
function outreachWeekHtml(){
  const w = outreachWeek(), due = reachOutList().slice(0, 8);
  const upcoming = [];
  ['client','lead'].forEach(function(kind){ crmList(kind).forEach(function(x){ if(x.followUp && x.followUp.date > todayStr() && w.days.indexOf(x.followUp.date)>=0 && crmTracked(kind, x)) upcoming.push({kind:kind, x:x}); }); });
  const max = Math.max.apply(null, w.days.map(function(d){ return w.perDay[d]; }).concat([1]));
  const name = function(r, cls){ return '<span class="ow-chip '+(cls||'')+'" data-action="openContact" data-kind="'+r.kind+'" data-id="'+r.x.id+'">'+escapeHtml(crmName(r.kind, r.x))+'</span>'; };
  return '<div class="hq-outreach">'+
    '<div class="hq-col-head" style="cursor:default;"><span>Outreach this week</span><span class="hq-count">'+w.total+' touch'+(w.total===1?'':'es')+'</span></div>'+
    '<div class="ow-grid">'+
      '<div class="ow-stats"><div><b>'+w.people.length+'</b><span>people reached</span></div><div><b>'+w.streak+'</b><span>day streak'+(w.streak>=3?' &#128293;':'')+'</span></div><div><b>'+due.length+'</b><span>due now</span></div></div>'+
      '<div class="ow-days">'+w.days.map(function(d){ const n = w.perDay[d]; return '<div class="ow-day'+(d===todayStr()?' is-today':'')+(d>todayStr()?' is-future':'')+'" title="'+fmtDateShort(d)+': '+n+' touch'+(n===1?'':'es')+'"><div class="ow-bar"><span style="height:'+(n ? Math.max(14, n/max*100) : 0)+'%"></span></div><em>'+weekdayShort(d).slice(0,1)+'</em></div>'; }).join('')+'</div>'+
      '<div class="ow-lists">'+
        '<div><span class="kind-label" style="margin:0 0 6px;">Reached</span><div class="ow-chips">'+(w.people.length ? w.people.slice(0, 10).map(function(r){ return name(r, 'is-done'); }).join('') : '<span class="kpi-sub">No one yet this week</span>')+'</div></div>'+
        '<div><span class="kind-label" style="margin:0 0 6px;">Due</span><div class="ow-chips">'+(due.length ? due.map(function(r){ return name(r, 'is-due'); }).join('') : '<span class="kpi-sub">All caught up</span>')+upcoming.slice(0, 4).map(function(r){ return name(r, 'is-later'); }).join('')+'</div></div>'+
      '</div>'+
    '</div>'+
  '</div>';
}
