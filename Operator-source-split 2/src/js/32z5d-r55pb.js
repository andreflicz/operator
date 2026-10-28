// ============ ROUND 55: PLAYBOOKS ============
// A playbook is a routine you run with a lead or a client, laid out on a calendar of 7, 14, 30 days (or any
// length). Day 1 is whenever they start, whatever the weekday. Three kinds:
//  • Lead: from first contact (discovery call → trial shoot → deliver the trial → closing call…). A lead stage
//    can start one: a lead that moves to that stage starts that playbook.
//  • Onboarding: once, from the day they sign or pay (onboarding call, get access, intake form, kick-off, first win…).
//  • Monthly service: runs again every month (a weekly report every Friday, book the monthly call, the call, the report…).
// Each one says what comes next: a closed lead goes to onboarding, onboarding into monthly service.
// Every item has a type (with its colour), and can carry a checklist, links (an SOP, a form: Open and Copy) and,
// for calls, a time you schedule. It's once, every week (on a weekday) or, in one that repeats, every N months.
// Items become tasks when they're due, tagged with the lead or client, coloured by type, apart from deliverables.
// Late ones go red, pull that client's health down and show up in notifications. Moving someone by hand shows what
// gets checked off first; moving back puts it back. A banner says when someone moves.
const PB_TYPES = {
  call:{label:'Call', color:'#5B9BFF', icon:'&#128222;'},
  report:{label:'Report', color:'#A98BFF', icon:'&#128202;'},
  task:{label:'Task', color:'#4FC3B8', icon:'&#10003;'},
  access:{label:'Access / info', color:'#E8A23D', icon:'&#128273;'},
  send:{label:'Send / link', color:'#FF8FB1', icon:'&#128279;'}
};
const PB_KINDS = {lead:{label:'Lead', plural:'Leads', who:'lead', start:'first contact'}, onboarding:{label:'Onboarding', plural:'Onboarding', who:'client', start:'the day they sign or pay'}, monthly:{label:'Monthly service', plural:'Monthly service', who:'client', start:'their start date'}};
const PB_DOW = [['1', 'Mon'], ['2', 'Tue'], ['3', 'Wed'], ['4', 'Thu'], ['5', 'Fri'], ['6', 'Sat'], ['0', 'Sun']];
function pbAll(){ const cm = crm(); if(!Array.isArray(cm.playbooks)) cm.playbooks = []; return cm.playbooks; }
function pbById(id){ return pbAll().find(function(p){ return p.id===id; }) || null; }
function pbItem(title, type, day, extra){ return Object.assign({id:uid(), title:title, type:type || 'task', day:day || 1, repeat:'once', dow:5, every:1, checklist:[], links:[], notes:''}, extra || {}); }
function pbNew(kind, name){ return {id:uid(), name:name || PB_KINDS[kind].label, kind:kind, days:kind==='lead' ? 14 : 30, next:null, isDefault:false, stage:null, items:[]}; }
function pbRepeats(p){ return p && p.kind==='monthly'; }
function pbDefault(kind){ return pbAll().find(function(p){ return p.kind===kind && p.isDefault; }) || null; }
function pbWho(kind){ return kind==='lead' ? 'lead' : 'client'; }
// ---- the starting set (and what the old client cycles had) ----
function pbSeed(){
  const cm = crm(); if(cm.pbSeeded) return false;
  const L = pbNew('lead', 'New lead'); L.isDefault = true;
  L.items = [pbItem('Discovery call', 'call', 1), pbItem('Plan the trial shoot', 'task', 3), pbItem('Trial shoot', 'task', 5), pbItem('Deliver the trial content', 'send', 6), pbItem('Closing call', 'call', 8)];
  const O = pbNew('onboarding', 'Onboarding'); O.isDefault = true;
  O.items = [pbItem('Onboarding call', 'call', 1), pbItem('Get access and info', 'access', 1, {checklist:[{id:uid(), t:'Meta Business Manager access'}, {id:uid(), t:'Ad account access'}, {id:uid(), t:'Service area and zip codes'}, {id:uid(), t:'Brand assets and logins'}]}),
    pbItem('Send the intake form', 'send', 2), pbItem('Kick-off call', 'call', 3), pbItem('Deliver the first win', 'task', 7), pbItem('First monthly report', 'report', 28), pbItem('Month-one review call', 'call', 30)];
  const M = pbNew('monthly', 'Monthly service'); M.isDefault = true;
  M.items = [pbItem('Weekly report', 'report', 1, {repeat:'week', dow:5}), pbItem('Book the monthly call', 'task', 24), pbItem('Monthly call', 'call', 28), pbItem('Monthly report', 'report', 30)];
  O.next = M.id;
  const list = pbAll(); list.push(L, O, M);
  // the old client cycles someone was on come over as playbooks, with those clients on them
  arr(cm.cycles).forEach(function(cy){
    const on = arr(state.business.clients).filter(function(c){ return c.cycleId===cy.id; });
    if(!on.length) return;
    const P = pbNew('onboarding', cy.name || 'Client playbook'); let day = 1;
    arr(cy.steps).forEach(function(st, si){
      arr(st.checklist).forEach(function(it){
        const t = /meeting|call/i.test(it.type || '') ? 'call' : /doc/.test(it.type || '') && /report/i.test(it.text) ? 'report' : /form|link|video/.test(it.type || '') ? 'send' : 'task';
        P.items.push(pbItem(it.text, t, it.dueDays!=null && it.dueDays!=='' ? Math.min(30, 1 + Number(it.dueDays) + si*3) : Math.min(30, day), it.repeat==='week' ? {repeat:'week', dow:it.dueDow==null ? 5 : Number(it.dueDow), links:it.link ? [{label:'Link', url:it.link}] : []} : {links:it.link ? [{label:'Link', url:it.link}] : []}));
      });
      day = Math.min(30, day + 4);
    });
    P.next = M.id; list.push(P);
    on.forEach(function(c){ const s = c.startDate && /^\d{4}-\d{2}-\d{2}$/.test(c.startDate) ? c.startDate : todayStr(); c.pb = {id:P.id, start:s, done:{}, auto:{}, hist:[]}; });
  });
  // everyone you already have waits for you to pick (nothing guessed); everyone new starts on the default
  cm.pbKnown = arr(state.business.clients).map(function(c){ return c.id; }).concat(arr(state.business.pipeline).map(function(l){ return 'L:'+l.id; }));
  cm.pbPending = {client:arr(state.business.clients).filter(function(c){ return !c.pb && clientStageActive(c.stage); }).map(function(c){ return c.id; }),
    lead:arr(state.business.pipeline).filter(function(l){ return !l.pb && leadIsOpen(l); }).map(function(l){ return l.id; })};
  cm.pbSeeded = true;
  return true;
}
// ---- where someone is ----
function pbMonths(a, n){ const p = a.split('-').map(Number), d = new Date(p[0], p[1] - 1 + n, 1), last = new Date(d.getFullYear(), d.getMonth() + 1, 0).getDate(); d.setDate(Math.min(p[2], last)); return todayStr(d); }
function pbDaysBetween(a, b){ return Math.round((localTs(b, '12:00') - localTs(a, '12:00'))/86400000); }
function pbCycle(x, p, at){
  at = at || todayStr();
  const s = x.pb.start || at;
  if(!pbRepeats(p)) return {start:s, end:addDays(s, p.days - 1), n:0};
  if(Number(p.days)===30){ let n = 0; while(pbMonths(s, n + 1) <= at && n < 600) n++; return {start:pbMonths(s, n), end:addDays(pbMonths(s, n + 1), -1), n:n}; }
  const n = Math.max(0, Math.floor(pbDaysBetween(s, at)/p.days)); const st = addDays(s, n*p.days); return {start:st, end:addDays(st, p.days - 1), n:n};
}
function pbOccs(x, p, cyc){
  const out = [], len = pbDaysBetween(cyc.start, cyc.end) + 1;
  arr(p.items).forEach(function(it){
    if(it.repeat==='week'){
      for(let i = 0; i < len; i++){ const d = addDays(cyc.start, i); if(String(dowOf(d))===String(it.dow)) out.push({it:it, date:d, key:cyc.start+':'+it.id+':'+d}); }
    } else {
      if(pbRepeats(p) && Number(it.every) > 1 && cyc.n % Number(it.every)!==0) return;
      out.push({it:it, date:addDays(cyc.start, Math.max(0, Math.min(len, Number(it.day) || 1) - 1)), key:cyc.start+':'+it.id});
    }
  });
  return out.sort(function(a, b){ return a.date.localeCompare(b.date); });
}
function pbState(kind, x){
  if(!x || !x.pb || !x.pb.id) return null;
  const p = pbById(x.pb.id); if(!p) return null;
  x.pb.done = x.pb.done && typeof x.pb.done==='object' ? x.pb.done : {}; x.pb.auto = x.pb.auto || {}; x.pb.hist = arr(x.pb.hist);
  const today = todayStr(), future = x.pb.start > today, cyc = pbCycle(x, p, future ? x.pb.start : today), occ = pbOccs(x, p, cyc);
  occ.forEach(function(o){ o.done = !!x.pb.done[o.key]; o.late = !o.done && o.date < today; });
  const open = occ.filter(function(o){ return !o.done; });
  return {p:p, cyc:cyc, occ:occ, open:open, next:open[0] || null, day:future ? 0 : pbDaysBetween(cyc.start, today) + 1, future:future, late:occ.filter(function(o){ return o.late; })};
}
function pbPeople(){
  const out = [];
  arr(state.business.clients).forEach(function(c){ if(c.pb && (clientStageActive(c.stage) || c.stage==='onboarding')) out.push({kind:'client', x:c}); });
  arr(state.business.pipeline).forEach(function(l){ if(l.pb && leadIsOpen(l)) out.push({kind:'lead', x:l}); });
  return out;
}
// (day 1 for someone you put on a playbook now: their start date if it's still inside the playbook's length, or
// for a monthly one always their start date (it runs from it); otherwise today)
function pbDay1(kind, x, p){
  const today = todayStr(), s = kind==='client' ? x.startDate : (x.createdAt || null);
  if(!s || !/^\d{4}-\d{2}-\d{2}$/.test(s) || s > today) return today;
  if(pbRepeats(p)) return s;
  return pbDaysBetween(s, today) < p.days ? s : today;
}
function pbName(kind, x){ return kind==='client' ? (x.business || x.name || 'Client') : crmName('lead', x); }
function pbStart(kind, x, pbId, start, quiet){
  const p = pbById(pbId); if(!p) return;
  if(x.pb && x.pb.id) x.pb.hist = arr(x.pb.hist).concat([{id:x.pb.id, start:x.pb.start, done:x.pb.done, auto:x.pb.auto}]).slice(-6);
  x.pb = {id:p.id, start:start || todayStr(), done:{}, auto:{}, hist:x.pb ? arr(x.pb.hist) : []};
  if(typeof crmTimeline==='function') crmTimeline(x, 'stage', 'Playbook: '+p.name);
  if(!quiet) r55Banner(pbName(kind, x)+' moved to '+p.name);
}
// (they finished it: on to what comes next; a month's service doesn't finish, it starts again)
function pbAdvance(kind, x, manual){
  const s = pbState(kind, x); if(!s || pbRepeats(s.p)) return false;
  const nx = s.p.next ? pbById(s.p.next) : null;
  if(!nx){ if(!x.pb.finished){ x.pb.finished = todayStr(); if(!manual) r55Banner(pbName(kind, x)+' finished '+s.p.name); } return false; }
  const end = addDays(s.cyc.end, 1), start = end > todayStr() ? end : todayStr();
  pbStart(kind, x, nx.id, nx.kind==='monthly' && x.startDate && kind==='client' ? (end > todayStr() ? end : todayStr()) : start);
  return true;
}
// ---- the tasks ----
function pbTaskTitle(o){ return o.it.title || 'Playbook item'; }
function pbSync(){
  if(!state || !state.business || !state.tasks) return false;
  let ch = false; if(pbSeed()) ch = true;
  const cm = crm(), today = todayStr(), soon = addDays(today, 3), live = {};
  cm.pbKnown = arr(cm.pbKnown);
  // new people start on the default playbook
  arr(state.business.clients).forEach(function(c){
    if(cm.pbKnown.indexOf(c.id) >= 0) return; cm.pbKnown.push(c.id); ch = true;
    if(c.pb) return;
    const lead = c.fromLeadId ? crmFind('lead', c.fromLeadId) : null; if(lead && lead.pb) lead.pb.ended = today;
    const d = pbDefault('onboarding'); if(d && (clientStageActive(c.stage) || c.stage==='onboarding')){ pbStart('client', c, d.id, c.startDate || today, true); r55Banner(pbName('client', c)+' started '+d.name); }
  });
  arr(state.business.pipeline).forEach(function(l){
    if(cm.pbKnown.indexOf('L:'+l.id) >= 0) return; cm.pbKnown.push('L:'+l.id); ch = true;
    if(l.pb || !leadIsOpen(l)) return;
    const st = pbAll().find(function(p){ return p.kind==='lead' && p.stage && p.stage===l.stage; }) || pbDefault('lead');
    if(st) pbStart('lead', l, st.id, l.createdAt || today, true);
  });
  pbPeople().forEach(function(P){
    const x = P.x;
    for(let i = 0; i < 3; i++){ const s = pbState(P.kind, x); if(!s || s.future || pbRepeats(s.p) || s.open.length || x.pb.finished) break; if(!pbAdvance(P.kind, x)) break; ch = true; }
    const s = pbState(P.kind, x); if(!s) return;
    s.occ.forEach(function(o){
      // (a weekly one a week past its day goes on the record as missed)
      if(!o.done && o.it.repeat==='week' && addDays(o.date, 7) < today){ x.pb.done[o.key] = 'missed'; ch = true; return; }
      if(o.date > soon) return;
      const k = P.kind+':'+x.id+':'+o.key; live[k] = 1;
      let t = state.tasks.items.find(function(t){ return t.master && t.master.kind==='pb' && t.master.k===k; });
      if(o.done){ if(t && t.status!=='done'){ t.status = 'done'; t.completedAt = today; ch = true; } return; }
      if(!t){
        const lines = arr(o.it.checklist).map(function(c){ return '• '+c.t; }).concat(arr(o.it.links).filter(function(l){ return l.url; }).map(function(l){ return (l.label || 'Link')+': '+l.url; }));
        state.tasks.items.push({id:uid(), title:pbTaskTitle(o), client:P.kind==='client' ? x.id : 'general', clients:P.kind==='client' ? [x.id] : ['general'], priority:o.it.type==='call' ? 'high' : 'med', deadline:o.date, notes:(o.it.notes ? o.it.notes+'\n' : '')+lines.join('\n'),
          status:o.date <= addDays(today, 1) ? 'today' : 'backlog', createdAt:today, completedAt:null, master:{kind:'pb', k:k, who:P.kind, id:x.id, key:o.key, item:o.it.id, type:o.it.type, pb:s.p.id, pbName:s.p.name}});
        ch = true;
      } else {
        if(t.status==='done' && !x.pb.done[o.key]){ x.pb.done[o.key] = t.completedAt || today; ch = true; }
        else if(t.status==='backlog' && o.date <= addDays(today, 1)){ t.status = 'today'; ch = true; }
        if(t.title!==pbTaskTitle(o)){ t.title = pbTaskTitle(o); ch = true; }
        if(t.deadline!==o.date){ t.deadline = o.date; ch = true; }
      }
    });
  });
  // open playbook tasks for a cycle or a playbook someone isn't on any more go
  const before = state.tasks.items.length;
  state.tasks.items = state.tasks.items.filter(function(t){ return !(t.master && t.master.kind==='pb' && t.status!=='done' && !live[t.master.k]); });
  if(state.tasks.items.length!==before) ch = true;
  return ch;
}
masterTasksSync = (function(base){
  return function(){
    const r = base.apply(this, arguments);
    if(mt38Busy || !state || !state.tasks || !state.business) return r;
    mt38Busy = true;
    try{ if(pbSync()){ persist('tasks'); persist('business'); setTimeout(function(){ try{ renderView(); }catch(e){} }, 0); } }
    finally { mt38Busy = false; }
    return r;
  };
})(masterTasksSync);
// done on the task list = done on the playbook (and undone)
function pbTaskPerson(t){ const m = t && t.master; if(!m || m.kind!=='pb') return null; const x = crmFind(m.who, m.id); return x && x.pb ? {kind:m.who, x:x} : null; }
completeTask = (function(base){
  return function(id){
    const t = state.tasks.items.find(function(x){ return x.id===id; }), P = pbTaskPerson(t);
    const r = base.apply(this, arguments);
    if(P) setTimeout(function(){ if(t.status==='done'){ P.x.pb.done[t.master.key] = todayStr(); persist('business'); try{ masterTasksSync(); }catch(e){} } }, 1100);
    return r;
  };
})(completeTask);
undoTask = (function(base){
  return function(id){
    const t = state.tasks.items.find(function(x){ return x.id===id; }), P = pbTaskPerson(t);
    const r = base.apply(this, arguments);
    if(P){ delete P.x.pb.done[t.master.key]; persist('business'); }
    return r;
  };
})(undoTask);
// ---- the old client cycles are gone ----
if(typeof r54LcSync==='function') r54LcSync = function(){ return false; };
setTimeout(function(){
  try{
    const n = state.tasks.items.length;
    state.tasks.items = state.tasks.items.filter(function(t){ return !(t.master && (t.master.kind==='lc' || t.master.kind==='lcrep') && t.status!=='done'); });
    if(state.tasks.items.length!==n) persist('tasks');
  }catch(e){}
}, 0);
if(typeof lcBadgeHtml==='function') lcBadgeHtml = function(){ return ''; };

// ---- late: red, health, notifications ----
function pbLateFor(kind, id){ return state.tasks.items.filter(function(t){ return t.status!=='done' && t.master && t.master.kind==='pb' && t.master.who===kind && t.master.id===id && t.deadline && t.deadline < todayStr(); }); }
clientHealthStatus = (function(base){
  return function(c){
    const s = base.apply(this, arguments);
    if(!c || !s) return s;
    const late = pbLateFor('client', c.id); if(!late.length) return s;
    const worst = Math.max.apply(null, late.map(function(t){ return daysAgoFrom(t.deadline); }));
    const lvl = worst >= 3 ? 'red' : 'yellow', rank = {green:0, yellow:1, red:2};
    if(rank[lvl] > rank[s.level]) return Object.assign({}, s, {level:lvl, pbLate:late.length});
    return Object.assign({}, s, {pbLate:late.length});
  };
})(clientHealthStatus);
clientHealthLabel = (function(base){ return function(s){ if(s && s.pbLate && s.level!=='green') return 'Playbook late'; return base.apply(this, arguments); }; })(clientHealthLabel);
notifList = (function(base){
  return function(){
    const out = base.apply(this, arguments), today = todayStr(), dis = notifDismissed();
    state.tasks.items.forEach(function(t){
      const m = t.master; if(!m || m.kind!=='pb' || t.status==='done' || !t.deadline || t.deadline >= today) return;
      const x = crmFind(m.who, m.id); if(!x) return;
      const key = 'pb:'+m.k; if(dis[key]===today) return;
      out.push({key:key, kind:m.who==='lead' ? 'lead' : 'client', level:'danger', icon:PB_TYPES[m.type] ? PB_TYPES[m.type].icon : '&#9201;', title:pbName(m.who, x)+' · '+t.title, sub:'Playbook · late since '+fmtDateShort(t.deadline), act:{a:'openTaskEditModal', id:t.id}, sort:0});
    });
    return out;
  };
})(notifList);

// ---- moving someone by hand ----
function pbMoveNext(kind, id){
  const x = crmFind(kind, id), s = pbState(kind, x); if(!s) return;
  const nx = s.p.next ? pbById(s.p.next) : null;
  const left = s.open, names = left.slice(0, 6).map(function(o){ return o.it.title; });
  uiConfirm({title:nx ? 'Move '+pbName(kind, x)+' to '+nx.name+'?' : 'Finish '+s.p.name+' for '+pbName(kind, x)+'?',
    text:left.length ? 'This checks off '+left.length+' thing'+(left.length===1 ? '' : 's')+' still open: '+names.join(', ')+(left.length > 6 ? ' and '+(left.length - 6)+' more' : '')+'.' : 'Everything on it is done.', ok:nx ? 'Move them' : 'Finish it'}).then(function(yes){
    if(!yes) return;
    left.forEach(function(o){ x.pb.done[o.key] = todayStr(); x.pb.auto[o.key] = 1; });
    state.tasks.items.forEach(function(t){ if(t.master && t.master.kind==='pb' && t.master.who===kind && t.master.id===id && t.status!=='done'){ t.status = 'done'; t.completedAt = todayStr(); } });
    if(nx) pbStart(kind, x, nx.id, todayStr()); else { x.pb.finished = todayStr(); r55Banner(pbName(kind, x)+' finished '+s.p.name); }
    persist('business'); persist('tasks'); try{ masterTasksSync(); }catch(e){} renderView(); rerenderContactModal();
  });
}
function pbMoveBack(kind, id){
  const x = crmFind(kind, id); if(!x || !x.pb || !arr(x.pb.hist).length) return;
  const h = x.pb.hist[x.pb.hist.length - 1], p = pbById(h.id); if(!p) return;
  uiConfirm({title:'Move '+pbName(kind, x)+' back to '+p.name+'?', text:'What was checked off when they moved on comes back.', ok:'Move back'}).then(function(yes){
    if(!yes) return;
    const done = Object.assign({}, h.done); Object.keys(h.auto || {}).forEach(function(k){ delete done[k]; });
    x.pb = {id:h.id, start:h.start, done:done, auto:{}, hist:x.pb.hist.slice(0, -1)};
    // (the tasks it checked off come back too: drop them and let the list make them fresh)
    state.tasks.items = state.tasks.items.filter(function(t){ return !(t.master && t.master.kind==='pb' && t.master.who===kind && t.master.id===id && (h.auto || {})[t.master.key]); });
    // (and the next playbook's tasks go)
    state.tasks.items = state.tasks.items.filter(function(t){ return !(t.master && t.master.kind==='pb' && t.master.who===kind && t.master.id===id && t.master.pb!==h.id && t.status!=='done'); });
    r55Banner(pbName(kind, x)+' moved back to '+p.name);
    persist('business'); persist('tasks'); try{ masterTasksSync(); }catch(e){} renderView(); rerenderContactModal();
  });
}
ACTIONS.pbNext = function(el){ pbMoveNext(el.dataset.kind, el.dataset.id); };
ACTIONS.pbBack = function(el){ pbMoveBack(el.dataset.kind, el.dataset.id); };
ACTIONS.pbAssign = function(el){ const x = crmFind(el.dataset.kind, el.dataset.id), p = pbById(el.dataset.pb); if(!x || !p) return; pbStart(el.dataset.kind, x, p.id, pbDay1(el.dataset.kind, x, p)); persist('business'); try{ masterTasksSync(); }catch(e){} renderView(); rerenderContactModal(); };
ACTIONS.pbTick = function(el){
  const p = String(el.dataset.id).split('|'), x = crmFind(p[0], p[1]); if(!x || !x.pb) return;
  const key = p.slice(2).join('|');
  if(x.pb.done[key]) delete x.pb.done[key]; else x.pb.done[key] = todayStr();
  state.tasks.items.forEach(function(t){ if(t.master && t.master.kind==='pb' && t.master.who===p[0] && t.master.id===p[1] && t.master.key===key){ t.status = x.pb.done[key] ? 'done' : 'today'; t.completedAt = x.pb.done[key] ? todayStr() : null; } });
  playTick(); persist('business'); persist('tasks'); try{ masterTasksSync(); }catch(e){} renderView(); rerenderContactModal();
};
// a call on a playbook: Schedule puts it on your calendar
ACTIONS.pbSchedule = function(el){
  const p = String(el.dataset.id).split('|'), x = crmFind(p[0], p[1]); if(!x) return;
  const key = p.slice(2).join('|'), s = pbState(p[0], x), o = s && s.occ.find(function(v){ return v.key===key; }); if(!o) return;
  ui.r55PbSched = {kind:p[0], id:p[1], key:key};
  openCalEventModal();
  const set = function(i, v){ const n = document.getElementById(i); if(n) n.value = v; };
  set('calEventTitle', o.it.title+' · '+pbName(p[0], x)); set('calEventDate', o.date);
  if(p[0]==='client') set('calEventLinkedClient', x.id);
  const call = arr(state.calendar.categories).find(function(c){ return c.id==='call'; }); if(call) set('calEventCategory', call.id);
};
if(typeof onCalEventSaved==='function') onCalEventSaved = (function(base){
  return function(ev){
    const S = ui.r55PbSched;
    if(S && ev){ const x = crmFind(S.kind, S.id); if(x && x.pb){ x.pb.ev = x.pb.ev || {}; x.pb.ev[S.key] = ev.id; persist('business'); } ui.r55PbSched = null; }
    return base.apply(this, arguments);
  };
})(onCalEventSaved);
ACTIONS.pbCopy = function(el){ const u = el.dataset.url; if(!u) return; if(!fallbackCopy(u)){ try{ navigator.clipboard.writeText(u); }catch(e){} } showToast('Copied: ready to send', {icon:'&#128203;', duration:1800}); };
ACTIONS.pbOpen = function(el){ const u = el.dataset.url; if(u) window.open(/^[a-z]+:\/\//i.test(u) ? u : 'https://'+u, '_blank'); };
// (a lead moving to a stage a playbook starts on)
setStage = (function(base){
  return function(kind, id, stageId){
    const r = base.apply(this, arguments);
    if(kind==='lead'){ const l = crmFind('lead', id), p = pbAll().find(function(x){ return x.kind==='lead' && x.stage===stageId; }); if(l && p && leadIsOpen(l) && (!l.pb || l.pb.id!==p.id)){ pbStart('lead', l, p.id, todayStr()); persist('business'); try{ masterTasksSync(); }catch(e){} } }
    return r;
  };
})(setStage);

// ---- the banner: someone moved ----
function r55Banner(text){
  let b = document.getElementById('r55Banner');
  if(!b){ b = document.createElement('div'); b.id = 'r55Banner'; b.className = 'r55-banner'; document.body.appendChild(b); }
  b.innerHTML = '<span class="r55-bn-i">&#10148;</span><b>'+escapeHtml(text)+'</b>';
  b.classList.remove('is-in'); void b.offsetWidth; b.classList.add('is-in');
  clearTimeout(r55Banner._t); r55Banner._t = setTimeout(function(){ b.classList.remove('is-in'); }, 4200);
  if(typeof tone==='function') try{ tone([587, 784], 0.22, 0.12); }catch(e){}
}

// ---- the cards ----
taskCard = (function(base){
  return function(t){
    let h = base.apply(this, arguments);
    const m = t && t.master; if(!m || m.kind!=='pb') return h;
    const ty = PB_TYPES[m.type] || PB_TYPES.task, x = crmFind(m.who, m.id);
    h = h.replace(/class="task-card(?=[\s"])/, 'class="task-card r55-pbt" style="--pbc:'+ty.color+'"');
    const tag = '<span class="mt-badge r55-pbb">'+ty.icon+' '+escapeHtml(ty.label)+'</span>';
    h = /<span class="mt-badge[^"]*"[^>]*>[\s\S]*?<\/span>/.test(h) ? h.replace(/<span class="mt-badge[^"]*"[^>]*>[\s\S]*?<\/span>/, tag) : h.replace(/(<div class="task-card-title">)/, '$1'+tag);
    if(m.who==='lead' && x) h = h.replace(/(<div class="task-card-title">[\s\S]*?<\/div>)/, '$1<div class="r55-pbw">'+escapeHtml(pbName('lead', x))+' · lead</div>');
    return h;
  };
})(taskCard);
function pbStripHtml(kind, x){
  const s = pbState(kind, x); if(!s) return '';
  const nx = s.next, pct = s.occ.length ? Math.round(s.occ.filter(function(o){ return o.done; }).length/s.occ.length*100) : 0;
  const when = function(o){ return o.late ? '<em class="is-late">late</em>' : o.date===todayStr() ? 'today' : o.date===addDays(todayStr(), 1) ? 'tomorrow' : pbDaysBetween(todayStr(), o.date) < 7 ? new Date(localTs(o.date, '12:00')).toLocaleDateString(undefined, {weekday:'short'}) : fmtDateShort(o.date); };
  return '<div class="r55-pbs" data-action="openContact" data-kind="'+kind+'" data-id="'+x.id+'"><div class="r55-pbs-h"><b>'+escapeHtml(s.p.name)+'</b><span>'+(s.future ? 'starts '+fmtDateShort(x.pb.start) : x.pb.finished ? 'done' : s.day > pbDaysBetween(s.cyc.start, s.cyc.end) + 1 ? 'past day '+(pbDaysBetween(s.cyc.start, s.cyc.end) + 1) : 'Day '+s.day)+'</span></div>'+
    '<i class="r55-pbs-bar"><u style="width:'+pct+'%"></u></i>'+
    (nx ? '<div class="r55-pbs-n" style="--pbc:'+(PB_TYPES[nx.it.type] || PB_TYPES.task).color+'"><i></i><span>'+escapeHtml(nx.it.title)+'</span><small>'+when(nx)+'</small></div>' : '<div class="r55-pbs-n is-clear"><span>All caught up</span></div>')+'</div>';
}
clientCardV2 = (function(base){
  return function(c){
    const h = base.apply(this, arguments), st = pbStripHtml('client', c); if(!st) return h;
    const i = h.lastIndexOf('<div class="cc2-foot'); return i > 0 ? h.slice(0, i)+st+h.slice(i) : h.replace(/<\/div>$/, st+'</div>');
  };
})(clientCardV2);
if(typeof crmCard==='function') crmCard = (function(base){
  return function(kind, x){
    const h = base.apply(this, arguments); if(kind!=='lead' || !x || !x.pb) return h;
    const s = pbState('lead', x); if(!s || !s.next) return h;
    const ty = PB_TYPES[s.next.it.type] || PB_TYPES.task;
    return h.replace(/<\/div>\s*$/, '<div class="r55-pbl" style="--pbc:'+ty.color+'"><i></i>'+escapeHtml(s.next.it.title)+(s.next.late ? ' <em>late</em>' : '')+'</div></div>');
  };
})(crmCard);

// ---- a client's (or lead's) playbook, in their window ----
function pbPersonHtml(kind, x){
  const s = pbState(kind, x), choices = pbAll().filter(function(p){ return kind==='lead' ? p.kind==='lead' : p.kind!=='lead'; });
  const pick = '<select class="input input-sm" data-pb-assign="'+kind+':'+x.id+'"><option value="">No playbook</option>'+choices.map(function(p){ return '<option value="'+p.id+'"'+(s && s.p.id===p.id ? ' selected' : '')+'>'+escapeHtml(p.name)+'</option>'; }).join('')+'</select>';
  const start = x.pb ? '<label class="r55-pbp-st"><span>Day 1</span><input class="input input-sm" type="date" data-pb-start="'+kind+':'+x.id+'" value="'+escapeHtml(x.pb.start || '')+'"></label>' : '';
  const head = '<div class="r55-pbp-h">'+pick+start+'<button class="btn btn-ghost btn-sm" data-action="pbEdit" data-id="'+(s ? s.p.id : '')+'">Edit playbooks</button></div>';
  if(!s) return '<div class="r55-pbp">'+head+'<div class="r55-pbp-empty">Not on a playbook. '+choices.filter(function(p){ return p.isDefault; }).map(function(p){ return '<button class="btn btn-sm btn-primary" data-action="pbAssign" data-kind="'+kind+'" data-id="'+x.id+'" data-pb="'+p.id+'">Start '+escapeHtml(p.name)+'</button>'; }).join(' ')+'</div></div>';
  const today = todayStr(), done = s.occ.filter(function(o){ return o.done; }).length;
  const row = function(o){
    const ty = PB_TYPES[o.it.type] || PB_TYPES.task, ev = x.pb.ev && x.pb.ev[o.key] ? arr(state.calendar.events).find(function(e){ return e.id===x.pb.ev[o.key]; }) : null;
    const id = kind+'|'+x.id+'|'+o.key;
    const links = arr(o.it.links).filter(function(l){ return l.url; }).map(function(l){ return '<button class="r55-pbp-lk" data-action="pbOpen" data-url="'+escapeHtml(l.url)+'">'+escapeHtml(l.label || 'Open')+'</button><button class="r55-pbp-lk is-c" data-action="pbCopy" data-url="'+escapeHtml(l.url)+'" title="Copy to send">Copy</button>'; }).join('');
    const sched = o.it.type==='call' && !o.done ? (ev ? '<span class="r55-pbp-ev">&#128197; '+fmtDateShort(ev.date)+(ev.time ? ' '+fmt12Hour(ev.time) : '')+'</span>' : '<button class="r55-pbp-lk" data-action="pbSchedule" data-id="'+escapeHtml(id)+'">Schedule</button>') : '';
    const list = arr(o.it.checklist).length ? '<div class="r55-pbp-cl">'+o.it.checklist.map(function(c){ return '<span>'+escapeHtml(c.t)+'</span>'; }).join('')+'</div>' : '';
    return '<div class="r55-pbp-r'+(o.done ? ' is-done' : o.late ? ' is-late' : '')+'" style="--pbc:'+ty.color+'">'+
      '<button class="r55-pbp-ck" data-action="pbTick" data-id="'+escapeHtml(id)+'">'+(o.done ? '&#10003;' : '')+'</button>'+
      '<span class="r55-pbp-t"><b>'+escapeHtml(o.it.title)+'</b><small><i></i>'+ty.label+' · '+(o.done ? (x.pb.done[o.key]==='missed' ? 'missed' : 'done') : o.late ? 'late since '+fmtDateShort(o.date) : o.date===today ? 'today' : fmtDateShort(o.date))+'</small>'+list+'</span>'+
      '<span class="r55-pbp-a">'+sched+links+'</span></div>';
  };
  const nx = s.p.next ? pbById(s.p.next) : null;
  return '<div class="r55-pbp">'+head+
    '<div class="r55-pbp-s"><b>'+escapeHtml(s.p.name)+'</b><span>'+(s.future ? 'Starts '+fmtDateShort(x.pb.start) : x.pb.finished ? 'Finished' : s.day > pbDaysBetween(s.cyc.start, s.cyc.end) + 1 ? 'Ended '+fmtDateShort(s.cyc.end)+(s.open.length ? ' · still open' : '') : 'Day '+s.day+' of '+(pbDaysBetween(s.cyc.start, s.cyc.end) + 1))+(pbRepeats(s.p) ? ' · month '+(s.cyc.n + 1) : '')+'</span><em>'+done+'/'+s.occ.length+' done'+(s.late.length ? ' · <b class="is-late">'+s.late.length+' late</b>' : '')+'</em></div>'+
    '<i class="r55-pbs-bar"><u style="width:'+(s.occ.length ? Math.round(done/s.occ.length*100) : 0)+'%"></u></i>'+
    '<div class="r55-pbp-list">'+s.occ.map(row).join('')+'</div>'+
    '<div class="r55-pbp-f">'+(arr(x.pb.hist).length ? '<button class="btn btn-ghost btn-sm" data-action="pbBack" data-kind="'+kind+'" data-id="'+x.id+'">&larr; Back to '+escapeHtml((pbById(x.pb.hist[x.pb.hist.length - 1].id) || {}).name || 'the last one')+'</button>' : '<span></span>')+
      (pbRepeats(s.p) ? '' : '<button class="btn btn-sm" data-action="pbNext" data-kind="'+kind+'" data-id="'+x.id+'">'+(nx ? 'Move to '+escapeHtml(nx.name)+' &rarr;' : 'Finish it &#10003;')+'</button>')+'</div></div>';
}
document.addEventListener('change', function(e){
  const t = e.target; if(!t || !t.getAttribute) return;
  if(t.hasAttribute('data-pb-assign')){
    const p = t.getAttribute('data-pb-assign').split(':'), x = crmFind(p[0], p[1]); if(!x) return;
    if(!t.value){ if(x.pb) x.pb = null; }
    else pbStart(p[0], x, t.value, pbDay1(p[0], x, pbById(t.value)));
    persist('business'); try{ masterTasksSync(); }catch(err){} renderView(); rerenderContactModal();
  }
  if(t.hasAttribute('data-pb-start')){
    const p = t.getAttribute('data-pb-start').split(':'), x = crmFind(p[0], p[1]); if(!x || !x.pb || !/^\d{4}-\d{2}-\d{2}$/.test(t.value)) return;
    x.pb.start = t.value; if(p[0]==='client' && !x.startDate) x.startDate = t.value;
    persist('business'); try{ masterTasksSync(); }catch(err){} renderView(); rerenderContactModal();
  }
});
// the client window: "Client cycle" is now "Playbook"
(function(){ const i = CLIENT_SECTIONS.findIndex(function(s){ return s[0]==='cycle'; }); if(i >= 0) CLIENT_SECTIONS[i] = ['cycle', '&#9776;', 'Playbook']; })();
renderClientLifecycle = function(c){ return pbPersonHtml('client', c); };
renderClientModal = (function(base){ return function(){ return base.apply(this, arguments).replace('<div class="cm-h">Client cycle</div>', '<div class="cm-h">Playbook</div>'); }; })(renderClientModal);
renderContact = (function(base){
  return function(){
    const h = base.apply(this, arguments), l = crmFind('lead', ui.contactLeadId); if(!l || !leadIsOpen(l)) return h;
    return h.replace('<div class="kind-label">Details</div>', '<div class="kind-label">Playbook</div>'+pbPersonHtml('lead', l)+'<div class="kind-label">Details</div>');
  };
})(renderContact);

// ============ THE PLAYBOOK BUILDER (Business → Playbooks) ============
// Your playbooks down the side, grouped by kind, in the order they lead into each other. Pick one: its calendar,
// day 1 to the last day, with every item on its day (drag one to another day; + on a day adds one). Weekly items
// sit in their own row, on their weekday. Click an item to edit it on the right.
(function(){ const i = BIZ_PEOPLE.findIndex(function(b){ return b[0]==='lifecycle'; }); if(i >= 0) BIZ_PEOPLE[i] = ['lifecycle', 'Playbooks']; })();
renderLifecycleTab = function(){ return pbEditorHtml(); };
function pbSel(){ let p = pbById(ui.pbSel); if(!p){ p = pbAll()[0] || null; ui.pbSel = p ? p.id : null; } return p; }
function pbChain(){
  // lead ones first, then each onboarding → what it leads into
  const all = pbAll(), out = [];
  ['lead', 'onboarding', 'monthly'].forEach(function(k){ all.filter(function(p){ return p.kind===k; }).forEach(function(p){ out.push(p); }); });
  return out;
}
function pbEditorHtml(){
  pbSeed();
  const p = pbSel(), cm = crm();
  const side = '<aside class="pbx-side">'+['lead', 'onboarding', 'monthly'].map(function(k){
      const list = pbAll().filter(function(x){ return x.kind===k; });
      return '<div class="pbx-g"><small>'+PB_KINDS[k].plural+'</small>'+list.map(function(x){
        const on = pbPeople().filter(function(P){ return P.x.pb.id===x.id; }).length, nx = x.next ? pbById(x.next) : null;
        return '<button class="pbx-pb'+(p && p.id===x.id ? ' is-on' : '')+'" data-action="pbPick" data-id="'+x.id+'"><b>'+escapeHtml(x.name)+(x.isDefault ? '<i class="pbx-star" title="New '+(k==='lead' ? 'leads' : 'clients')+' start here">&#9733;</i>' : '')+'</b>'+
          '<span>'+x.days+' days · '+x.items.length+' item'+(x.items.length===1 ? '' : 's')+(on ? ' · '+on+' on it' : '')+'</span>'+(nx ? '<em>then '+escapeHtml(nx.name)+'</em>' : pbRepeats(x) ? '<em>repeats every month</em>' : '')+'</button>';
      }).join('')+'<button class="pbx-add" data-action="pbNew" data-id="'+k+'">+ '+(k==='lead' ? 'Lead' : k==='onboarding' ? 'Onboarding' : 'Monthly service')+' playbook</button></div>';
    }).join('')+'</aside>';
  if(!p) return '<div class="pbx">'+side+'<section class="pbx-main"><div class="pbx-empty">Make your first playbook on the left.</div></section></div>';
  const others = pbAll().filter(function(x){ return x.id!==p.id; });
  const pend = cm.pbPending || {}, pc = arr(pend.client).filter(function(id){ const c = crmFind('client', id); return c && !c.pb; }), pl = arr(pend.lead).filter(function(id){ const l = crmFind('lead', id); return l && !l.pb && leadIsOpen(l); });
  const ask = (pc.length && p.kind!=='lead' ? '<div class="pbx-ask">'+pc.length+' of your current clients aren’t on a playbook yet. <button class="btn btn-sm" data-action="pbPutAll" data-id="client">Put them on '+escapeHtml(p.name)+'</button></div>' : '')+
    (pl.length && p.kind==='lead' ? '<div class="pbx-ask">'+pl.length+' open lead'+(pl.length===1 ? ' isn’t' : 's aren’t')+' on a playbook yet. <button class="btn btn-sm" data-action="pbPutAll" data-id="lead">Put them on '+escapeHtml(p.name)+'</button></div>' : '');
  const lens = [7, 14, 30];
  const head = '<div class="pbx-head">'+
    '<input class="input pbx-name" data-pb-f="name" value="'+escapeHtml(p.name)+'" maxlength="60">'+
    '<div class="seg-tabs seg-sm">'+Object.keys(PB_KINDS).map(function(k){ return '<button class="seg-tab'+(p.kind===k ? ' active' : '')+'" data-action="pbKind" data-id="'+k+'">'+PB_KINDS[k].label+'</button>'; }).join('')+'</div>'+
    '<div class="pbx-len"><span>Length</span>'+lens.map(function(n){ return '<button class="'+(p.days===n ? 'is-on' : '')+'" data-action="pbLen" data-id="'+n+'">'+n+'</button>'; }).join('')+'<input class="input input-sm" type="number" min="1" max="120" data-pb-f="days" value="'+(lens.indexOf(p.days) < 0 ? p.days : '')+'" placeholder="other"><span>days</span></div>'+
    '</div>'+
    '<div class="pbx-rules">'+
      '<label class="pbx-rule"><input type="checkbox" data-pb-f="isDefault"'+(p.isDefault ? ' checked' : '')+'><span>New '+(p.kind==='lead' ? 'leads' : 'clients')+' start here</span></label>'+
      (pbRepeats(p) ? '<span class="pbx-rule is-info">&#8635; Runs again every month, from each client’s start date</span>' :
        '<label class="pbx-rule"><span>When it’s done, they move to</span><select class="input input-sm" data-pb-f="next"><option value="">Nothing (it ends)</option>'+others.filter(function(x){ return p.kind==='lead' ? x.kind==='lead' : x.kind!=='lead'; }).map(function(x){ return '<option value="'+x.id+'"'+(p.next===x.id ? ' selected' : '')+'>'+escapeHtml(x.name)+'</option>'; }).join('')+'</select></label>')+
      (p.kind==='lead' ? '<label class="pbx-rule"><span>Also starts when a lead moves to</span><select class="input input-sm" data-pb-f="stage"><option value="">No stage</option>'+crmStages('lead').filter(function(s){ return s.kind!=='won' && s.kind!=='lost'; }).map(function(s){ return '<option value="'+s.id+'"'+(p.stage===s.id ? ' selected' : '')+'>'+escapeHtml(s.label)+'</option>'; }).join('')+'</select></label>' : '')+
      '<span class="pbx-sp"></span><button class="pbx-del" data-action="pbDelete" data-id="'+p.id+'" title="Delete this playbook">Delete playbook</button>'+
    '</div>';
  const chip = function(it){ const ty = PB_TYPES[it.type] || PB_TYPES.task; return '<button class="pbx-chip'+(ui.pbItem===it.id ? ' is-on' : '')+'" draggable="true" data-pb-drag="'+it.id+'" data-action="pbItemPick" data-id="'+it.id+'" style="--pbc:'+ty.color+'"><i>'+ty.icon+'</i><span>'+escapeHtml(it.title)+'</span>'+(pbRepeats(p) && Number(it.every) > 1 ? '<small>every '+it.every+' mo</small>' : '')+'</button>'; };
  const weekly = p.items.filter(function(it){ return it.repeat==='week'; });
  const wrow = '<div class="pbx-week"><small>Every week</small><div>'+(weekly.length ? weekly.map(function(it){ return '<span class="pbx-wk">'+chip(it)+'<em>'+(PB_DOW.find(function(d){ return d[0]===String(it.dow); }) || ['', 'Fri'])[1]+'</em></span>'; }).join('') : '<span class="pbx-faint">Nothing weekly. Set an item to “Every week” to put it here.</span>')+'</div></div>';
  let cells = '';
  for(let d = 1; d <= p.days; d++){
    const here = p.items.filter(function(it){ return it.repeat!=='week' && Math.min(p.days, Number(it.day) || 1)===d; });
    cells += '<div class="pbx-day'+(here.length ? ' has' : '')+'" data-pb-day="'+d+'"><span class="pbx-dn">'+d+'</span>'+here.map(chip).join('')+'<button class="pbx-plus" data-action="pbAdd" data-id="'+d+'" title="Add on day '+d+'">+</button></div>';
  }
  const grid = '<div class="pbx-cal" style="--cols:'+(p.days < 7 ? p.days : 7)+'">'+cells+'</div>';
  const legend = '<div class="pbx-legend"><span class="pbx-faint">Day 1 is '+PB_KINDS[p.kind].start+'. + on a day adds an item; drag items between days.</span>'+Object.keys(PB_TYPES).map(function(k){ const t = PB_TYPES[k]; return '<span style="--pbc:'+t.color+'"><i></i>'+t.label+'</span>'; }).join('')+'</div>';
  return '<div class="pbx'+(ui.pbItem ? ' has-item' : '')+'">'+side+'<section class="pbx-main">'+ask+head+legend+wrow+grid+'</section>'+pbItemPanelHtml(p)+'</div>';
}
function pbItemPanelHtml(p){
  const it = p.items.find(function(x){ return x.id===ui.pbItem; });
  if(!it) return '';
  const f = function(k){ return 'data-pbi-f="'+k+'"'; };
  return '<aside class="pbx-item">'+
    '<div class="pbx-ih"><input class="input pbx-it" '+f('title')+' value="'+escapeHtml(it.title)+'" maxlength="90"><button class="pbx-x" data-action="pbItemClose" title="Done">&#10005;</button></div>'+
    '<div class="pbx-types">'+Object.keys(PB_TYPES).map(function(k){ const t = PB_TYPES[k]; return '<button class="'+(it.type===k ? 'is-on' : '')+'" style="--pbc:'+t.color+'" data-action="pbItemType" data-id="'+k+'"><i>'+t.icon+'</i>'+t.label+'</button>'; }).join('')+'</div>'+
    '<div class="pbx-f"><span>When</span><div class="seg-tabs seg-sm"><button class="seg-tab'+(it.repeat!=='week' ? ' active' : '')+'" data-action="pbItemRep" data-id="once">'+(pbRepeats(p) ? 'Once a month' : 'Once')+'</button><button class="seg-tab'+(it.repeat==='week' ? ' active' : '')+'" data-action="pbItemRep" data-id="week">Every week</button></div></div>'+
    (it.repeat==='week' ? '<div class="pbx-f"><span>On</span><select class="input input-sm" '+f('dow')+'>'+PB_DOW.map(function(d){ return '<option value="'+d[0]+'"'+(String(it.dow)===d[0] ? ' selected' : '')+'>'+d[1]+'</option>'; }).join('')+'</select></div>'
      : '<div class="pbx-f"><span>Day</span><input class="input input-sm" type="number" min="1" max="'+p.days+'" '+f('day')+' value="'+(Number(it.day) || 1)+'"><em>of '+p.days+'</em></div>'+
        (pbRepeats(p) ? '<div class="pbx-f"><span>Every</span><select class="input input-sm" '+f('every')+'>'+[1, 2, 3, 6].map(function(n){ return '<option value="'+n+'"'+(Number(it.every || 1)===n ? ' selected' : '')+'>'+(n===1 ? 'month' : n+' months')+'</option>'; }).join('')+'</select></div>' : ''))+
    '<div class="pbx-sec"><small>Checklist</small>'+arr(it.checklist).map(function(c){ return '<div class="pbx-li"><input class="input input-sm" data-pbi-cl="'+c.id+'" value="'+escapeHtml(c.t)+'"><button data-action="pbClDel" data-id="'+c.id+'">&#10005;</button></div>'; }).join('')+'<div class="pbx-li"><input class="input input-sm" id="pbClNew" placeholder="+ Add a line (Enter)"></div></div>'+
    '<div class="pbx-sec"><small>Links</small>'+arr(it.links).map(function(l, i){ return '<div class="pbx-lk"><input class="input input-sm" data-pbi-lk="'+i+':label" value="'+escapeHtml(l.label || '')+'" placeholder="Name"><input class="input input-sm" data-pbi-lk="'+i+':url" value="'+escapeHtml(l.url || '')+'" placeholder="https://… (your SOP, a form)"><button data-action="pbLkDel" data-id="'+i+'">&#10005;</button></div>'; }).join('')+'<button class="pbx-more" data-action="pbLkAdd">+ Add a link</button></div>'+
    '<div class="pbx-sec"><small>Notes</small><textarea class="input input-sm" rows="3" '+f('notes')+' placeholder="How you do it, what to say">'+escapeHtml(it.notes || '')+'</textarea></div>'+
    '<div class="pbx-if"><button class="pbx-del" data-action="pbItemDel">Delete item</button><button class="btn btn-sm btn-primary" data-action="pbItemClose">Done</button></div>'+
  '</aside>';
}
function pbSave(){ persist('business'); try{ masterTasksSync(); }catch(e){} }
function pbCur(){ const p = pbSel(); return {p:p, it:p ? p.items.find(function(x){ return x.id===ui.pbItem; }) : null}; }
ACTIONS.pbPick = function(el, e, id){ ui.pbSel = id; ui.pbItem = null; playTick(); renderView(); };
ACTIONS.pbEdit = function(el, e, id){ if(typeof closeClientModal==='function' && overlayOpen('clientModalOverlay')) closeClientModal(); if(overlayOpen('contactOverlay')) hideOverlay('contactOverlay'); ui.pbSel = id || ui.pbSel; ui.pbItem = null; ui.view = 'business'; ui.businessTab = 'lifecycle'; renderView(); };
ACTIONS.pbNew = function(el, e, kind){ const p = pbNew(kind, 'New '+PB_KINDS[kind].label.toLowerCase()+' playbook'); if(!pbDefault(kind)) p.isDefault = true; pbAll().push(p); ui.pbSel = p.id; ui.pbItem = null; pbSave(); renderView(); setTimeout(function(){ const i = document.querySelector('.pbx-name'); if(i){ i.focus(); i.select(); } }, 60); };
ACTIONS.pbDelete = function(el, e, id){
  const p = pbById(id); if(!p) return; const on = pbPeople().filter(function(P){ return P.x.pb.id===id; });
  uiConfirm({title:'Delete '+p.name+'?', text:on.length ? on.length+' '+(on.length===1 ? 'is' : 'are')+' on it: they’ll come off, and its open tasks go.' : 'Nobody’s on it.', ok:'Delete', danger:true}).then(function(yes){
    if(!yes) return; const cm = crm(); cm.playbooks = pbAll().filter(function(x){ return x.id!==id; }); pbAll().forEach(function(x){ if(x.next===id) x.next = null; });
    on.forEach(function(P){ P.x.pb = null; }); ui.pbSel = null; pbSave(); renderView();
  });
};
ACTIONS.pbKind = function(el, e, k){ const p = pbSel(); if(!p) return; p.kind = k; if(k==='monthly') p.next = null; if(k==='lead' && p.days===30) p.days = 14; pbSave(); renderView(); };
ACTIONS.pbLen = function(el, e, n){ const p = pbSel(); if(!p) return; p.days = Number(n); pbSave(); renderView(); };
ACTIONS.pbAdd = function(el, e, d){ const p = pbSel(); if(!p) return; const it = pbItem('New item', 'task', Number(d)); p.items.push(it); ui.pbItem = it.id; pbSave(); renderView(); setTimeout(function(){ const i = document.querySelector('.pbx-it'); if(i){ i.focus(); i.select(); } }, 60); };
ACTIONS.pbItemPick = function(el, e, id){ ui.pbItem = ui.pbItem===id ? null : id; renderView(); };
ACTIONS.pbItemClose = function(){ ui.pbItem = null; renderView(); };
ACTIONS.pbItemType = function(el, e, k){ const c = pbCur(); if(!c.it) return; c.it.type = k; pbSave(); renderView(); };
ACTIONS.pbItemRep = function(el, e, k){ const c = pbCur(); if(!c.it) return; c.it.repeat = k==='week' ? 'week' : 'once'; pbSave(); renderView(); };
ACTIONS.pbItemDel = function(){ const c = pbCur(); if(!c.it) return; c.p.items = c.p.items.filter(function(x){ return x!==c.it; }); ui.pbItem = null; pbSave(); renderView(); };
ACTIONS.pbClDel = function(el, e, id){ const c = pbCur(); if(!c.it) return; c.it.checklist = arr(c.it.checklist).filter(function(x){ return x.id!==id; }); pbSave(); renderView(); };
ACTIONS.pbLkAdd = function(){ const c = pbCur(); if(!c.it) return; c.it.links = arr(c.it.links).concat([{label:'', url:''}]); pbSave(); renderView(); };
ACTIONS.pbLkDel = function(el, e, i){ const c = pbCur(); if(!c.it) return; c.it.links = arr(c.it.links).filter(function(_, j){ return j!==Number(i); }); pbSave(); renderView(); };
ACTIONS.pbPutAll = function(el, e, kind){
  const p = pbSel(), cm = crm(); if(!p) return; let n = 0;
  arr((cm.pbPending || {})[kind]).forEach(function(id){ const x = crmFind(kind, id); if(x && !x.pb && (kind==='client' || leadIsOpen(x))){ pbStart(kind, x, p.id, pbDay1(kind, x, p), true); n++; } });
  cm.pbPending[kind] = []; pbSave(); renderView(); if(n) r55Banner(n+' '+(kind==='client' ? 'client' : 'lead')+(n===1 ? '' : 's')+' started '+p.name);
};
document.addEventListener('change', function(e){
  const t = e.target; if(!t || !t.getAttribute) return;
  const p = pbSel(); if(!p) return;
  if(t.hasAttribute('data-pb-f')){
    const k = t.getAttribute('data-pb-f');
    if(k==='name') p.name = t.value.trim() || p.name;
    else if(k==='days'){ const n = Math.max(1, Math.min(120, Math.round(Number(t.value) || 0))); if(n) p.days = n; }
    else if(k==='isDefault'){ if(t.checked) pbAll().forEach(function(x){ if(x.kind===p.kind) x.isDefault = false; }); p.isDefault = !!t.checked; }
    else if(k==='next') p.next = t.value || null;
    else if(k==='stage') p.stage = t.value || null;
    pbSave(); renderView(); return;
  }
  const c = pbCur(); if(!c.it) return;
  if(t.hasAttribute('data-pbi-f')){
    const k = t.getAttribute('data-pbi-f');
    if(k==='title') c.it.title = t.value.trim() || 'Untitled';
    else if(k==='day') c.it.day = Math.max(1, Math.min(p.days, Math.round(Number(t.value) || 1)));
    else if(k==='dow') c.it.dow = Number(t.value);
    else if(k==='every') c.it.every = Number(t.value) || 1;
    else if(k==='notes') c.it.notes = t.value;
    pbSave(); renderView(); return;
  }
  if(t.hasAttribute('data-pbi-cl')){ const r = arr(c.it.checklist).find(function(x){ return x.id===t.getAttribute('data-pbi-cl'); }); if(r){ r.t = t.value.trim(); if(!r.t) c.it.checklist = c.it.checklist.filter(function(x){ return x!==r; }); pbSave(); renderView(); } return; }
  if(t.hasAttribute('data-pbi-lk')){ const q = t.getAttribute('data-pbi-lk').split(':'), l = arr(c.it.links)[Number(q[0])]; if(l){ l[q[1]] = t.value.trim(); pbSave(); } return; }
});
document.addEventListener('keydown', function(e){
  if(e.key!=='Enter' || !e.target || e.target.id!=='pbClNew') return;
  e.preventDefault(); const c = pbCur(), v = e.target.value.trim(); if(!c.it || !v) return;
  c.it.checklist = arr(c.it.checklist).concat([{id:uid(), t:v}]); pbSave(); renderView();
  setTimeout(function(){ const i = document.getElementById('pbClNew'); if(i) i.focus(); }, 40);
});
// drag an item to another day (or into the weekly row)
document.addEventListener('dragstart', function(e){ const c = e.target.closest && e.target.closest('[data-pb-drag]'); if(!c) return; e.dataTransfer.setData('text/pb', c.getAttribute('data-pb-drag')); e.dataTransfer.effectAllowed = 'move'; c.classList.add('is-drag'); });
document.addEventListener('dragend', function(e){ const c = e.target.closest && e.target.closest('[data-pb-drag]'); if(c) c.classList.remove('is-drag'); document.querySelectorAll('.pbx-day.is-over').forEach(function(d){ d.classList.remove('is-over'); }); });
document.addEventListener('dragover', function(e){ const d = e.target.closest && e.target.closest('.pbx-day, .pbx-week'); if(!d || !Array.from(e.dataTransfer.types || []).includes('text/pb')) return; e.preventDefault(); document.querySelectorAll('.pbx-day.is-over').forEach(function(x){ if(x!==d) x.classList.remove('is-over'); }); d.classList.add('is-over'); });
document.addEventListener('drop', function(e){
  const d = e.target.closest && e.target.closest('.pbx-day, .pbx-week'); if(!d) return;
  const id = e.dataTransfer.getData('text/pb'); if(!id) return; e.preventDefault();
  const p = pbSel(), it = p && p.items.find(function(x){ return x.id===id; }); if(!it) return;
  if(d.classList.contains('pbx-week')){ it.repeat = 'week'; } else { it.repeat = 'once'; it.day = Number(d.getAttribute('data-pb-day')) || 1; }
  pbSave(); playTick(); renderView();
});
