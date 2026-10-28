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
// (round 56: no kinds and no defaults. A playbook is for clients or for leads, has its length (set when you make it),
// and says what happens when it ends: it stops, it starts again, or they move to another one. `kind` is kept only
// as a mirror of those, for the code that reads it.)
function pbFor(p){ return p && (p.for || (p.kind==='lead' ? 'lead' : 'client')); }
function pbRepeats(p){ return !!p && (p.repeats!=null ? !!p.repeats : p.kind==='monthly'); }
function pbKindSync(p){ if(!p) return p; p.for = pbFor(p); p.repeats = pbRepeats(p); p.kind = p.for==='lead' ? 'lead' : p.repeats ? 'monthly' : 'onboarding'; if(p.repeats) p.next = null; p.isDefault = false; return p; }
function pbNew(kind, name, days, opts){
  const o = opts || {}, f = o.for || (kind==='lead' ? 'lead' : 'client');
  return pbKindSync({id:uid(), name:name || 'New playbook', for:f, repeats:o.repeats!=null ? !!o.repeats : kind==='monthly', days:Number(days) || (f==='lead' ? 14 : 30), next:o.next || null, isDefault:false, stage:null, items:[]});
}
function pbDefault(){ return null; }
function pbWho(kind){ return kind==='lead' ? 'lead' : 'client'; }
// ---- the starting set (and what the old client cycles had) ----
function pbSeed(){
  const cm = crm(); if(cm.pbSeeded) return false;
  // (round 56: no starting set. You make your own; only the old client cycles someone was on come over)
  const list = pbAll();
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
    list.push(P);
    on.forEach(function(c){ const s = c.startDate && /^\d{4}-\d{2}-\d{2}$/.test(c.startDate) ? c.startDate : todayStr(); c.pb = {id:P.id, start:s, done:{}, auto:{}, hist:[]}; });
  });
  // everyone you already have waits for you to pick (nothing guessed); everyone new starts on the default
  cm.pbKnown = arr(state.business.clients).map(function(c){ return c.id; }).concat(arr(state.business.pipeline).map(function(l){ return 'L:'+l.id; }));
  cm.pbPending = {client:[], lead:[]};
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
  if(Number(p.days) >= 28 && Number(p.days) <= 31){ let n = 0; while(pbMonths(s, n + 1) <= at && n < 600) n++; return {start:pbMonths(s, n), end:addDays(pbMonths(s, n + 1), -1), n:n}; }
  { const L = Math.max(1, Number(p.days) || 30), n = Math.max(0, Math.floor(pbDaysBetween(s, at)/L)), st = addDays(s, n*L); return {start:st, end:addDays(st, L - 1), n:n}; }
}
function pbOccs(x, p, cyc){
  const out = [], len = pbDaysBetween(cyc.start, cyc.end) + 1, pre = (x.pb && x.pb.run ? x.pb.run+'~' : '')+cyc.start;
  arr(p.items).forEach(function(it){
    if(it.repeat==='week'){
      for(let i = 0; i < len; i++){ const d = addDays(cyc.start, i); if(String(dowOf(d))===String(it.dow)) out.push({it:it, date:d, key:pre+':'+it.id+':'+d}); }
    } else {
      if(pbRepeats(p) && Number(it.every) > 1 && cyc.n % Number(it.every)!==0) return;
      out.push({it:it, date:addDays(cyc.start, Math.max(0, Math.min(len, Number(it.day) || 1) - 1)), key:pre+':'+it.id});
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
  if(x.pb && x.pb.id) x.pb.hist = arr(x.pb.hist).concat([{id:x.pb.id, start:x.pb.start, run:x.pb.run, done:x.pb.done, auto:x.pb.auto}]).slice(-6);
  // (each time on a playbook is its own run, so going back on one later starts it clean)
  x.pb = {id:p.id, start:start || todayStr(), run:Date.now().toString(36).slice(-5), done:{}, auto:{}, hist:x.pb ? arr(x.pb.hist) : []};
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
  const cm = crm(), today = todayStr(), live = {};
  cm.pbKnown = arr(cm.pbKnown);
  // new people start on the default playbook
  arr(state.business.clients).forEach(function(c){
    if(cm.pbKnown.indexOf(c.id) >= 0) return; cm.pbKnown.push(c.id); ch = true;
    if(c.pb) return;
    const lead = c.fromLeadId ? crmFind('lead', c.fromLeadId) : null; if(lead && lead.pb) lead.pb.ended = today;
    const d = pbDefault('onboarding'); if(d && (clientStageActive(c.stage) || c.stage==='onboarding')){ pbStart('client', c, d.id, pbDay1('client', c, d), true); r55Banner(pbName('client', c)+' started '+d.name); }
  });
  arr(state.business.pipeline).forEach(function(l){
    if(cm.pbKnown.indexOf('L:'+l.id) >= 0) return; cm.pbKnown.push('L:'+l.id); ch = true;
    if(l.pb || !leadIsOpen(l)) return;
    const st = pbAll().find(function(p){ return p.kind==='lead' && p.stage && p.stage===l.stage; }) || pbDefault('lead');
    if(st) pbStart('lead', l, st.id, pbDay1('lead', l, st), true);
  });
  pbPeople().forEach(function(P){
    const x = P.x;
    for(let i = 0; i < 3; i++){ const s = pbState(P.kind, x); if(!s || s.future || pbRepeats(s.p) || s.open.length || x.pb.finished) break; if(!pbAdvance(P.kind, x)) break; ch = true; }
    const s = pbState(P.kind, x); if(!s) return;
    // (still open from last month: it stays on your list, late, for two weeks; then it goes on the record as missed)
    state.tasks.items.forEach(function(t){
      const m = t.master; if(!m || m.kind!=='pb' || t.status==='done' || m.who!==P.kind || m.id!==x.id || m.pb!==s.p.id) return;
      if(s.occ.some(function(o){ return o.key===m.key; }) || x.pb.done[m.key]) return;
      if(!t.deadline || t.deadline >= s.cyc.start || String(m.key).indexOf(x.pb.run ? x.pb.run+'~' : '')!==0) return;
      if(addDays(t.deadline, 14) >= today) live[m.k] = 1; else { x.pb.done[m.key] = 'missed'; ch = true; }
    });
    s.occ.forEach(function(o){
      // (a weekly one a week past its day goes on the record as missed)
      if(!o.done && o.it.repeat==='week' && addDays(o.date, 7) < today){ x.pb.done[o.key] = 'missed'; ch = true; return; }
      if(o.it.repeat==='week' ? o.date > addDays(today, 6) : false) return;
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
    x.pb = {id:h.id, start:h.start, run:h.run, done:done, auto:{}, hist:x.pb.hist.slice(0, -1)};
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
    if(m.who==='lead' && x) { const w = '<div class="r55-pbw">'+escapeHtml(pbName('lead', x))+' · lead</div>'; h = h.replace(/(<div class="task-card-title">[\s\S]*?<\/div>)/, function(m0){ return m0+w; }); }
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
    const pbl = '<div class="r55-pbl" style="--pbc:'+ty.color+'"><i></i>'+escapeHtml(s.next.it.title)+(s.next.late ? ' <em>late</em>' : '')+'</div></div>'; return h.replace(/<\/div>\s*$/, function(){ return pbl; });
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
    const pbh = '<div class="kind-label">Playbook</div>'+pbPersonHtml('lead', l)+'<div class="kind-label">Details</div>'; return h.replace('<div class="kind-label">Details</div>', function(){ return pbh; });
  };
})(renderContact);

// ============ PLAYBOOKS (Business → Clients & leads → Playbooks) ============
// Two views of the same thing:
//  • Board: a column for every playbook (and one for people not on any), clients or leads as cards in them.
//    Drag a card to another column to move them (it says first what gets checked off); drag to "Not on a
//    playbook" to take them off.
//  • Build: one playbook's days as a calendar. Items sit on their day (drag to move, + to add); the weekly ones
//    sit on their weekday, above. The right side shows who's on it, or the item you opened.
// A new playbook asks its name, who it's for and how long it runs; the length is set there.
(function(){ const i = BIZ_PEOPLE.findIndex(function(b){ return b[0]==='lifecycle'; }); if(i >= 0) BIZ_PEOPLE[i] = ['lifecycle', 'Playbooks']; })();
renderLifecycleTab = function(){ return pbEditorHtml(); };
function pbSel(){ let p = pbById(ui.pbSel); if(!p){ p = pbAll()[0] || null; ui.pbSel = p ? p.id : null; } return p; }
function pbOn(p){ return pbPeople().filter(function(P){ return P.x.pb && P.x.pb.id===p.id; }); }
function pbEndsText(p){ if(pbRepeats(p)) return 'starts again'; const nx = p.next ? pbById(p.next) : null; return nx ? 'then '+nx.name : 'ends'; }
function pbCountsFor(f){ return f==='lead' ? arr(state.business.pipeline).filter(function(l){ return leadIsOpen(l); }) : arr(state.business.clients).filter(function(c){ return clientStageActive(c.stage) || c.stage==='onboarding'; }); }
function pbEditorHtml(){
  pbSeed();
  const view = ui.pbView==='build' ? 'build' : 'board';
  const bar = '<div class="pb6-bar"><div class="seg-tabs seg-sm"><button class="seg-tab'+(view==='board' ? ' active' : '')+'" data-action="pb6View" data-id="board">Board</button><button class="seg-tab'+(view==='build' ? ' active' : '')+'" data-action="pb6View" data-id="build">Build</button></div>'+
    (view==='board' ? '<div class="seg-tabs seg-sm"><button class="seg-tab'+(ui.pbWho!=='lead' ? ' active' : '')+'" data-action="pb6Who" data-id="client">Clients</button><button class="seg-tab'+(ui.pbWho==='lead' ? ' active' : '')+'" data-action="pb6Who" data-id="lead">Leads</button></div>' : '')+
    '<span class="pb6-sp"></span><button class="btn btn-sm btn-primary" data-action="pb6NewOpen">+ New playbook</button></div>';
  return '<div class="pb6">'+(view==='board' ? bar+pbBoardHtml() : pbBuildHtml(bar))+'</div>';
}
// ---- Board ----
function pbCardHtml(kind, x){
  const s = pbState(kind, x), nm = pbName(kind, x);
  let meta = '', next = '';
  if(s){
    const len = pbDaysBetween(s.cyc.start, s.cyc.end) + 1;
    meta = s.future ? 'Starts '+fmtDateShort(x.pb.start) : x.pb.finished ? 'Finished' : s.day > len ? 'Past day '+len : 'Day '+s.day+' of '+len;
    if(s.next){ const ty = PB_TYPES[s.next.it.type] || PB_TYPES.task; next = '<div class="pb6-cn" style="--pbc:'+ty.color+'"><i></i><span>'+escapeHtml(s.next.it.title)+'</span><small>'+(s.next.late ? '<em>late</em>' : s.next.date===todayStr() ? 'today' : fmtDateShort(s.next.date))+'</small></div>'; }
    else next = '<div class="pb6-cn is-clear"><span>All caught up</span></div>';
  }
  const late = s ? s.late.length : 0, cc = kind==='client' ? clientAccent(x) : '#8B95A7';
  return '<div class="pb6-card'+(late ? ' is-late' : '')+'" draggable="true" data-pb6-drag="'+kind+':'+x.id+'" data-action="pb6OpenPerson" data-kind="'+kind+'" data-id="'+x.id+'" style="--cc:'+cc+'">'+
    '<div class="pb6-ch"><i></i><b>'+escapeHtml(nm)+'</b>'+(late ? '<span class="pb6-late">'+late+' late</span>' : '')+'</div>'+
    (meta ? '<small class="pb6-cm">'+meta+'</small>' : '')+next+'</div>';
}
function pbBoardHtml(){
  const who = ui.pbWho==='lead' ? 'lead' : 'client', list = pbAll().filter(function(p){ return pbFor(p)===who; });
  const people = pbCountsFor(who);
  const off = people.filter(function(x){ return !x.pb || !pbById(x.pb.id); });
  const col = function(p){
    const on = p ? people.filter(function(x){ return x.pb && x.pb.id===p.id; }) : off;
    return '<section class="pb6-col'+(p ? '' : ' is-off')+'" data-pb6-col="'+(p ? p.id : '')+'">'+
      '<header><b>'+(p ? escapeHtml(p.name) : 'Not on a playbook')+'</b><span>'+on.length+'</span>'+(p ? '<button class="pb6-cedit" data-action="pb6Build" data-id="'+p.id+'" title="Build it">&#9998;</button>' : '')+'</header>'+
      (p ? '<small class="pb6-cmeta">'+p.days+' days · '+escapeHtml(pbEndsText(p))+'</small>' : '<small class="pb6-cmeta">Drag them onto one</small>')+
      '<div class="pb6-cards">'+on.map(function(x){ return pbCardHtml(who, x); }).join('')+'</div></section>';
  };
  if(!list.length) return '<div class="pb6-empty"><b>No playbooks for '+(who==='lead' ? 'leads' : 'clients')+' yet</b><button class="btn btn-sm btn-primary" data-action="pb6NewOpen" data-id="'+who+'">+ New playbook</button></div>';
  return '<div class="pb6-board">'+col(null)+list.map(col).join('')+'</div>';
}
ACTIONS.pb6View = function(el, e, v){ ui.pbView = v; ui.pbItem = null; playTick(); renderView(); };
ACTIONS.pb6Who = function(el, e, v){ ui.pbWho = v; playTick(); renderView(); };
ACTIONS.pb6Build = function(el, e, id){ ui.pbSel = id; ui.pbView = 'build'; ui.pbItem = null; renderView(); };
ACTIONS.pb6OpenPerson = function(el){ const k = el.dataset.kind, id = el.dataset.id; if(k==='client') openClientModal(id); else openContact('lead', id); if(k==='client'){ ui.clientSec = 'cycle'; try{ renderClientModalInto(); }catch(e){} } };
// moving someone (from the board, their window, or a new contact): what gets checked off is said first
function pbMoveTo(kind, id, pbId){
  const x = crmFind(kind, id); if(!x) return Promise.resolve(false);
  const cur = x.pb && pbById(x.pb.id) ? pbById(x.pb.id) : null, to = pbId ? pbById(pbId) : null, nm = pbName(kind, x);
  if((cur && to && cur.id===to.id) || (!cur && !to)) return Promise.resolve(false);
  const s = cur ? pbState(kind, x) : null, left = s ? s.open : [];
  const go = function(){
    if(cur){
      left.forEach(function(o){ x.pb.done[o.key] = todayStr(); x.pb.auto[o.key] = 1; });
      state.tasks.items.forEach(function(t){ if(t.master && t.master.kind==='pb' && t.master.who===kind && t.master.id===id && t.status!=='done'){ t.status = 'done'; t.completedAt = todayStr(); } });
    }
    if(to){ pbStart(kind, x, to.id, cur ? todayStr() : pbDay1(kind, x, to), true); r55Banner(nm+(cur ? ' moved to ' : ' started ')+to.name); }
    else { x.pb.hist = arr(x.pb.hist).concat([{id:x.pb.id, start:x.pb.start, run:x.pb.run, done:x.pb.done, auto:x.pb.auto}]).slice(-6); x.pb = {id:null, hist:x.pb.hist}; r55Banner(nm+' is off '+cur.name); }
    persist('business'); persist('tasks'); try{ masterTasksSync(); }catch(e){} renderView(); try{ rerenderContactModal(); }catch(e){} try{ renderClientModalInto(); }catch(e){}
    return true;
  };
  if(!cur) return Promise.resolve(go());
  const names = left.slice(0, 5).map(function(o){ return o.it.title; });
  return uiConfirm({title:to ? 'Move '+nm+' to '+to.name+'?' : 'Take '+nm+' off '+cur.name+'?',
    text:left.length ? (to ? 'This checks off ' : 'Its ')+left.length+' open thing'+(left.length===1 ? '' : 's')+(to ? ' on '+cur.name : ' come off your list')+': '+names.join(', ')+(left.length > 5 ? ' and '+(left.length - 5)+' more' : '')+'.' : 'Everything on '+cur.name+' is done.',
    ok:to ? 'Move them' : 'Take them off'}).then(function(yes){ return yes ? go() : false; });
}
document.addEventListener('dragstart', function(e){ const c = e.target.closest && e.target.closest('[data-pb6-drag]'); if(!c) return; e.dataTransfer.setData('text/pb6', c.getAttribute('data-pb6-drag')); e.dataTransfer.effectAllowed = 'move'; c.classList.add('is-drag'); });
document.addEventListener('dragend', function(e){ const c = e.target.closest && e.target.closest('[data-pb6-drag]'); if(c) c.classList.remove('is-drag'); document.querySelectorAll('.pb6-col.is-over').forEach(function(d){ d.classList.remove('is-over'); }); });
document.addEventListener('dragover', function(e){ const d = e.target.closest && e.target.closest('.pb6-col'); if(!d || !Array.from(e.dataTransfer.types || []).includes('text/pb6')) return; e.preventDefault(); document.querySelectorAll('.pb6-col.is-over').forEach(function(x){ if(x!==d) x.classList.remove('is-over'); }); d.classList.add('is-over'); });
document.addEventListener('drop', function(e){
  const d = e.target.closest && e.target.closest('.pb6-col'); if(!d) return;
  const v = e.dataTransfer.getData('text/pb6'); if(!v) return; e.preventDefault(); d.classList.remove('is-over');
  const q = v.split(':'); pbMoveTo(q[0], q[1], d.getAttribute('data-pb6-col') || null);
});
// ---- Build ----
function pbBuildHtml(bar){
  const p = pbSel();
  const pills = '<div class="pb6-pills">'+pbAll().map(function(x){ return '<button class="pb6-pill'+(p && p.id===x.id ? ' is-on' : '')+'" data-action="pbPick" data-id="'+x.id+'">'+escapeHtml(x.name)+(pbFor(x)==='lead' ? '<em>leads</em>' : '')+'</button>'; }).join('')+'</div>';
  if(!p) return (bar || '')+'<div class="pb6-empty"><b>No playbooks yet</b><button class="btn btn-sm btn-primary" data-action="pb6NewOpen">+ New playbook</button></div>';
  const others = pbAll().filter(function(x){ return x.id!==p.id && pbFor(x)===pbFor(p); });
  const ends = pbRepeats(p) ? 'again' : p.next && pbById(p.next) ? p.next : '';
  const head = '<div class="pb6-head">'+
    '<input class="pb6-name" data-pb-f="name" value="'+escapeHtml(p.name)+'" maxlength="60" aria-label="Playbook name">'+
    '<span class="pb6-meta">'+p.days+' days · for '+(pbFor(p)==='lead' ? 'leads' : 'clients')+'</span>'+
    '<label class="pb6-rule"><span>When it ends</span><select class="input input-sm" data-pb-f="ends"><option value=""'+(ends==='' ? ' selected' : '')+'>It stops</option><option value="again"'+(ends==='again' ? ' selected' : '')+'>It starts again</option>'+others.map(function(x){ return '<option value="'+x.id+'"'+(ends===x.id ? ' selected' : '')+'>They move to '+escapeHtml(x.name)+'</option>'; }).join('')+'</select></label>'+
    (pbFor(p)==='lead' ? '<label class="pb6-rule"><span>Starts when a lead reaches</span><select class="input input-sm" data-pb-f="stage"><option value="">Any time you add them</option>'+crmStages('lead').filter(function(s){ return s.kind!=='won' && s.kind!=='lost'; }).map(function(s){ return '<option value="'+s.id+'"'+(p.stage===s.id ? ' selected' : '')+'>'+escapeHtml(s.label)+'</option>'; }).join('')+'</select></label>' : '')+
    '<button class="pb6-del" data-action="pbDelete" data-id="'+p.id+'" title="Delete this playbook" aria-label="Delete this playbook">&#128465;</button>'+
  '</div>';
  const chip = function(it){ const ty = PB_TYPES[it.type] || PB_TYPES.task; return '<button class="pb6-chip'+(ui.pbItem===it.id ? ' is-on' : '')+'" draggable="true" data-pb-drag="'+it.id+'" data-action="pbItemPick" data-id="'+it.id+'" style="--pbc:'+ty.color+'" title="'+escapeHtml(ty.label)+'"><i>'+ty.icon+'</i><span>'+escapeHtml(it.title)+'</span>'+(pbRepeats(p) && Number(it.every) > 1 ? '<small>every '+it.every+' mo</small>' : '')+'</button>'; };
  const week = '<div class="pb6-week"><div class="pb6-wl">Every week</div>'+PB_DOW.map(function(d){
      const here = p.items.filter(function(it){ return it.repeat==='week' && String(it.dow)===d[0]; });
      return '<div class="pb6-wd'+(here.length ? ' has' : '')+'" data-pb-dow="'+d[0]+'"><span class="pb6-dn">'+d[1]+'</span>'+here.map(chip).join('')+'<button class="pb6-plus" data-action="pb6AddWeek" data-id="'+d[0]+'" title="Every '+d[1]+'">+</button></div>';
    }).join('')+'</div>';
  let cells = '';
  for(let d = 1; d <= p.days; d++){
    const here = p.items.filter(function(it){ return it.repeat!=='week' && Math.min(p.days, Number(it.day) || 1)===d; });
    cells += '<div class="pb6-day'+(here.length ? ' has' : '')+'" data-pb-day="'+d+'"><span class="pb6-dn">'+d+'</span>'+here.map(chip).join('')+'<button class="pb6-plus" data-action="pbAdd" data-id="'+d+'" title="Add on day '+d+'">+</button></div>';
  }
  const grid = '<div class="pb6-cal" style="--cols:'+Math.min(7, p.days)+'">'+cells+'</div>';
  const side = ui.pbItem && p.items.some(function(x){ return x.id===ui.pbItem; }) ? pbItemPanelHtml(p) : pbOnHtml(p);
  return '<div class="pb6-build" style="--rows:'+Math.ceil(p.days/Math.min(7, p.days))+'"><div class="pb6-main">'+(bar || '')+pills+head+week+grid+'</div>'+side+'</div>';
}
// who's on it (and putting someone on it)
function pbOnHtml(p){
  const f = pbFor(p), on = pbCountsFor(f).filter(function(x){ return x.pb && x.pb.id===p.id; }), off = pbCountsFor(f).filter(function(x){ return !x.pb || !x.pb.id || x.pb.id!==p.id; });
  return '<aside class="pb6-side"><div class="pb6-sh"><b>On it</b><span>'+on.length+'</span></div>'+
    (on.length ? '<div class="pb6-cards">'+on.map(function(x){ return pbCardHtml(f, x); }).join('')+'</div>' : '')+
    (off.length ? '<select class="input input-sm pb6-addp" data-pb6-addp="'+p.id+'"><option value="">+ Put '+(f==='lead' ? 'a lead' : 'a client')+' on it</option>'+off.map(function(x){ return '<option value="'+x.id+'">'+escapeHtml(pbName(f, x))+(x.pb && pbById(x.pb.id) ? ' (on '+escapeHtml(pbById(x.pb.id).name)+')' : '')+'</option>'; }).join('')+'</select>' : '')+
  '</aside>';
}
function pbItemPanelHtml(p){
  const it = p.items.find(function(x){ return x.id===ui.pbItem; }); if(!it) return '';
  const f = function(k){ return 'data-pbi-f="'+k+'"'; }, ty = PB_TYPES[it.type] || PB_TYPES.task;
  const when = it.repeat==='week'
    ? '<select class="input input-sm" '+f('dow')+'>'+PB_DOW.map(function(d){ return '<option value="'+d[0]+'"'+(String(it.dow)===d[0] ? ' selected' : '')+'>'+d[1]+'</option>'; }).join('')+'</select>'
    : '<span class="pb6-dayin">Day <input class="input input-sm" type="number" min="1" max="'+p.days+'" '+f('day')+' value="'+(Number(it.day) || 1)+'"></span>'+
      (pbRepeats(p) ? '<select class="input input-sm" '+f('every')+'>'+[1, 2, 3, 6].map(function(n){ return '<option value="'+n+'"'+(Number(it.every || 1)===n ? ' selected' : '')+'>'+(n===1 ? 'every time' : 'every '+n+' months')+'</option>'; }).join('')+'</select>' : '');
  return '<aside class="pb6-side pb6-item" style="--pbc:'+ty.color+'">'+
    '<div class="pb6-ih"><input class="pb6-it" '+f('title')+' value="'+escapeHtml(it.title)+'" maxlength="90" aria-label="Item"><button class="pb6-x" data-action="pbItemClose" title="Close">&#10005;</button></div>'+
    '<div class="pb6-types">'+Object.keys(PB_TYPES).map(function(k){ const t = PB_TYPES[k]; return '<button class="'+(it.type===k ? 'is-on' : '')+'" style="--pbc:'+t.color+'" data-action="pbItemType" data-id="'+k+'"><i>'+t.icon+'</i>'+t.label+'</button>'; }).join('')+'</div>'+
    '<div class="pb6-when"><div class="seg-tabs seg-sm"><button class="seg-tab'+(it.repeat!=='week' ? ' active' : '')+'" data-action="pbItemRep" data-id="once">On a day</button><button class="seg-tab'+(it.repeat==='week' ? ' active' : '')+'" data-action="pbItemRep" data-id="week">Every week</button></div>'+when+'</div>'+
    '<div class="pb6-sec"><small>Checklist</small>'+arr(it.checklist).map(function(c){ return '<div class="pb6-li"><input class="input input-sm" data-pbi-cl="'+c.id+'" value="'+escapeHtml(c.t)+'"><button data-action="pbClDel" data-id="'+c.id+'" title="Remove">&#10005;</button></div>'; }).join('')+'<input class="input input-sm" id="pbClNew" placeholder="Add a line"></div>'+
    '<div class="pb6-sec"><small>Links</small>'+arr(it.links).map(function(l, i){ return '<div class="pb6-lk"><input class="input input-sm" data-pbi-lk="'+i+':label" value="'+escapeHtml(l.label || '')+'" placeholder="Name"><input class="input input-sm" data-pbi-lk="'+i+':url" value="'+escapeHtml(l.url || '')+'" placeholder="https://"><button data-action="pbLkDel" data-id="'+i+'" title="Remove">&#10005;</button></div>'; }).join('')+'<button class="pb6-more" data-action="pbLkAdd">+ Link</button></div>'+
    '<div class="pb6-sec"><small>Notes</small><textarea class="input input-sm" rows="3" '+f('notes')+'>'+escapeHtml(it.notes || '')+'</textarea></div>'+
    '<div class="pb6-if"><button class="pb6-idel" data-action="pbItemDel">Delete</button><button class="btn btn-sm btn-primary" data-action="pbItemClose">Done</button></div>'+
  '</aside>';
}
// ---- a new playbook: name, who it's for, how long, what happens when it ends ----
function pb6NewHtml(){
  const N = ui.pb6New || (ui.pb6New = {for:'client', days:30, ends:''});
  const lens = [7, 14, 30], others = pbAll().filter(function(x){ return pbFor(x)===N.for; });
  return asHead('&#9776;', 'New playbook')+
    '<div class="pb6-nf"><label>Name</label><input class="input" id="pb6NewName" maxlength="60" value="'+escapeHtml(N.name || '')+'"></div>'+
    '<div class="pb6-nf"><label>For</label><div class="seg-tabs seg-sm"><button class="seg-tab'+(N.for==='client' ? ' active' : '')+'" data-action="pb6NewSet" data-id="for:client">Clients</button><button class="seg-tab'+(N.for==='lead' ? ' active' : '')+'" data-action="pb6NewSet" data-id="for:lead">Leads</button></div></div>'+
    '<div class="pb6-nf"><label>Length</label><div class="pb6-len">'+lens.map(function(n){ return '<button class="'+(N.days===n ? 'is-on' : '')+'" data-action="pb6NewSet" data-id="days:'+n+'">'+n+' days</button>'; }).join('')+'<input class="input input-sm" type="number" min="1" max="120" id="pb6NewDays" placeholder="Other" value="'+(lens.indexOf(N.days) < 0 ? N.days : '')+'"></div></div>'+
    '<div class="pb6-nf"><label>When it ends</label><select class="input" id="pb6NewEnds"><option value="">It stops</option><option value="again"'+(N.ends==='again' ? ' selected' : '')+'>It starts again</option>'+others.map(function(x){ return '<option value="'+x.id+'"'+(N.ends===x.id ? ' selected' : '')+'>They move to '+escapeHtml(x.name)+'</option>'; }).join('')+'</select></div>'+
    '<div class="as-f"><button class="btn btn-primary hs-go" data-action="pb6Create">Make it</button></div>';
}
function pb6NewRead(){ const N = ui.pb6New || {}; const n = document.getElementById('pb6NewName'), d = document.getElementById('pb6NewDays'), e = document.getElementById('pb6NewEnds'); if(n) N.name = n.value; if(d && d.value) N.days = Math.max(1, Math.min(120, Math.round(Number(d.value) || 30))); if(e) N.ends = e.value; return N; }
ACTIONS.pb6NewOpen = function(el, e, who){ ui.pb6New = {for:who==='lead' ? 'lead' : (ui.pbView!=='build' && ui.pbWho==='lead' ? 'lead' : 'client'), days:30, ends:''}; if(ui.pb6New.for==='lead') ui.pb6New.days = 14; addSheetOpen('pb6NewSheet', pb6NewHtml, 'pb6NewName'); ['pb6NewName', 'pb6NewDays'].forEach(function(i){ const n = document.getElementById(i); if(n) n.value = ''; }); const en = document.getElementById('pb6NewEnds'); if(en) en.value = ''; };
ACTIONS.pb6NewSet = function(el, e, v){ const N = pb6NewRead(), q = String(v).split(':'); if(q[0]==='for'){ N.for = q[1]; N.ends = ''; } else if(q[0]==='days'){ N.days = Number(q[1]); const d = document.getElementById('pb6NewDays'); if(d) d.value = ''; } playTick(); addSheetRefresh('pb6NewSheet'); };
ACTIONS.pb6Create = function(){
  const N = pb6NewRead(), name = String(N.name || '').trim();
  if(!name){ const i = document.getElementById('pb6NewName'); if(i) i.focus(); return; }
  const p = pbNew(N.for==='lead' ? 'lead' : 'client', name, N.days, {for:N.for, repeats:N.ends==='again', next:N.ends && N.ends!=='again' ? N.ends : null});
  pbAll().push(p); ui.pbSel = p.id; ui.pbView = 'build'; ui.pbItem = null; ui.pbWho = N.for;
  addSheetClose('pb6NewSheet'); pbSave(); playPositive(); renderView();
};
ACTIONS.pb6AddWeek = function(el, e, dow){ const p = pbSel(); if(!p) return; const it = pbItem('New item', 'task', 1, {repeat:'week', dow:Number(dow)}); p.items.push(it); ui.pbItem = it.id; pbSave(); renderView(); setTimeout(function(){ const i = document.querySelector('.pb6-it'); if(i){ i.focus(); i.select(); } }, 60); };
function pbSave(){ persist('business'); try{ masterTasksSync(); }catch(e){} }
function pbCur(){ const p = pbSel(); return {p:p, it:p ? p.items.find(function(x){ return x.id===ui.pbItem; }) : null}; }
ACTIONS.pbPick = function(el, e, id){ ui.pbSel = id; ui.pbItem = null; ui.pbView = 'build'; playTick(); renderView(); };
ACTIONS.pbEdit = function(el, e, id){ if(typeof closeClientModal==='function' && overlayOpen('clientModalOverlay')) closeClientModal(); if(overlayOpen('contactOverlay')) hideOverlay('contactOverlay'); ui.pbSel = id || ui.pbSel; ui.pbItem = null; ui.pbView = id ? 'build' : 'board'; ui.view = 'business'; ui.businessTab = 'lifecycle'; renderView(); };
ACTIONS.pbNew = function(el, e, kind){ ACTIONS.pb6NewOpen(el, e, kind==='lead' ? 'lead' : 'client'); };
ACTIONS.pbDelete = function(el, e, id){
  const p = pbById(id); if(!p) return; const on = pbOn(p);
  uiConfirm({title:'Delete '+p.name+'?', text:on.length ? on.length+' '+(on.length===1 ? 'is' : 'are')+' on it: they’ll come off, and its open tasks go.' : 'Nobody’s on it.', ok:'Delete', danger:true}).then(function(yes){
    if(!yes) return; const cm = crm(); cm.playbooks = pbAll().filter(function(x){ return x.id!==id; }); pbAll().forEach(function(x){ if(x.next===id) x.next = null; });
    on.forEach(function(P){ P.x.pb = null; }); ui.pbSel = null; pbSave(); renderView();
  });
};
ACTIONS.pbAdd = function(el, e, d){ const p = pbSel(); if(!p) return; const it = pbItem('New item', 'task', Number(d)); p.items.push(it); ui.pbItem = it.id; pbSave(); renderView(); setTimeout(function(){ const i = document.querySelector('.pb6-it'); if(i){ i.focus(); i.select(); } }, 60); };
ACTIONS.pbItemPick = function(el, e, id){ ui.pbItem = ui.pbItem===id ? null : id; renderView(); };
ACTIONS.pbItemClose = function(){ ui.pbItem = null; renderView(); };
ACTIONS.pbItemType = function(el, e, k){ const c = pbCur(); if(!c.it) return; c.it.type = k; pbSave(); renderView(); };
ACTIONS.pbItemRep = function(el, e, k){ const c = pbCur(); if(!c.it) return; c.it.repeat = k==='week' ? 'week' : 'once'; pbSave(); renderView(); };
ACTIONS.pbItemDel = function(){ const c = pbCur(); if(!c.it) return; c.p.items = c.p.items.filter(function(x){ return x!==c.it; }); ui.pbItem = null; pbSave(); renderView(); };
ACTIONS.pbClDel = function(el, e, id){ const c = pbCur(); if(!c.it) return; c.it.checklist = arr(c.it.checklist).filter(function(x){ return x.id!==id; }); pbSave(); renderView(); };
ACTIONS.pbLkAdd = function(){ const c = pbCur(); if(!c.it) return; c.it.links = arr(c.it.links).concat([{label:'', url:''}]); pbSave(); renderView(); };
ACTIONS.pbLkDel = function(el, e, i){ const c = pbCur(); if(!c.it) return; c.it.links = arr(c.it.links).filter(function(_, j){ return j!==Number(i); }); pbSave(); renderView(); };
document.addEventListener('change', function(e){
  const t = e.target; if(!t || !t.getAttribute) return;
  if(t.hasAttribute('data-pb6-addp')){ const v = t.value, pid = t.getAttribute('data-pb6-addp'), p = pbById(pid); t.value = ''; if(v && p) pbMoveTo(pbFor(p), v, pid); return; }
  const p = pbSel(); if(!p) return;
  if(t.hasAttribute('data-pb-f')){
    const k = t.getAttribute('data-pb-f');
    if(k==='name') p.name = t.value.trim() || p.name;
    else if(k==='ends'){ p.repeats = t.value==='again'; p.next = t.value && t.value!=='again' ? t.value : null; pbKindSync(p); }
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
// drag an item to another day, or onto a weekday in the weekly row
document.addEventListener('dragstart', function(e){ const c = e.target.closest && e.target.closest('[data-pb-drag]'); if(!c) return; e.dataTransfer.setData('text/pb', c.getAttribute('data-pb-drag')); e.dataTransfer.effectAllowed = 'move'; c.classList.add('is-drag'); });
document.addEventListener('dragend', function(e){ const c = e.target.closest && e.target.closest('[data-pb-drag]'); if(c) c.classList.remove('is-drag'); document.querySelectorAll('.pb6-day.is-over, .pb6-wd.is-over').forEach(function(d){ d.classList.remove('is-over'); }); });
document.addEventListener('dragover', function(e){ const d = e.target.closest && e.target.closest('.pb6-day, .pb6-wd'); if(!d || !Array.from(e.dataTransfer.types || []).includes('text/pb')) return; e.preventDefault(); document.querySelectorAll('.pb6-day.is-over, .pb6-wd.is-over').forEach(function(x){ if(x!==d) x.classList.remove('is-over'); }); d.classList.add('is-over'); });
document.addEventListener('drop', function(e){
  const d = e.target.closest && e.target.closest('.pb6-day, .pb6-wd'); if(!d) return;
  const id = e.dataTransfer.getData('text/pb'); if(!id) return; e.preventDefault();
  const p = pbSel(), it = p && p.items.find(function(x){ return x.id===id; }); if(!it) return;
  if(d.classList.contains('pb6-wd')){ it.repeat = 'week'; it.dow = Number(d.getAttribute('data-pb-dow')); } else { it.repeat = 'once'; it.day = Number(d.getAttribute('data-pb-day')) || 1; }
  pbSave(); playTick(); renderView();
});
// (playbooks made before round 56 lose their kind and their ★: what they're for and what happens when they end stays)
setTimeout(function(){ try{ if(!state || !state.business) return; const cm = crm(); let ch = false; pbAll().forEach(function(p){ const was = JSON.stringify([p.for, p.repeats, p.isDefault, p.kind]); pbKindSync(p); if(JSON.stringify([p.for, p.repeats, p.isDefault, p.kind])!==was) ch = true; }); if(cm.pbPending && (arr(cm.pbPending.client).length || arr(cm.pbPending.lead).length)){ cm.pbPending = {client:[], lead:[]}; ch = true; } if(ch) persist('business'); }catch(e){} }, 0);
// (the reason says which: playbook items, by count)
clientHealthReason = (function(base){ return function(c, s){ if(s && s.pbLate && s.level!=='green') return s.pbLate+' playbook item'+(s.pbLate===1 ? '' : 's')+' late'; return base.apply(this, arguments); }; })(clientHealthReason);

// ---- putting someone on a playbook when you add them (it replaces the old "Client cycle" pick) ----
renderNewContact = (function(base){
  return function(){
    let h = base.apply(this, arguments); const kind = ui.newContactKind || 'lead';
    const list = pbAll().filter(function(p){ return pbFor(p)===(kind==='lead' ? 'lead' : 'client'); });
    const f = list.length ? '<div class="field" style="margin-top:10px;"><label>Playbook</label><select class="input" id="ncPlaybook"><option value="">None for now</option>'+list.map(function(p){ return '<option value="'+p.id+'">'+escapeHtml(p.name)+'</option>'; }).join('')+'</select></div>' : '';
    h = h.replace(/<div class="field" style="margin-top:10px;"><label>Client cycle[\s\S]*?<\/select><\/div>/, '');
    const i = h.indexOf('<div class="field" style="margin-top:10px;"><label>Source</label>');
    return i > 0 ? h.slice(0, i)+f+h.slice(i) : h;
  };
})(renderNewContact);
ACTIONS.saveNewContact = (function(base){
  return function(){
    const kind = ui.newContactKind || 'lead', el = document.getElementById('ncPlaybook'), pid = el ? el.value : '';
    const before = (kind==='lead' ? state.business.pipeline : state.business.clients).length;
    const r = base.apply(this, arguments);
    const list = kind==='lead' ? state.business.pipeline : state.business.clients;
    if(pid && list.length > before){ const x = list[list.length - 1], p = pbById(pid); if(x && p){ const k = kind==='lead' ? 'lead' : 'client'; crm().pbKnown = arr(crm().pbKnown).concat([k==='lead' ? 'L:'+x.id : x.id]); pbStart(k, x, p.id, todayStr(), true); persist('business'); try{ masterTasksSync(); }catch(e){} r55Banner(pbName(k, x)+' started '+p.name); } }
    return r;
  };
})(ACTIONS.saveNewContact);
// ---- their window, when they're not on one: just the pick ----
pbPersonHtml = (function(base){
  return function(kind, x){
    if(x && x.pb && pbById(x.pb.id)) return base.apply(this, arguments);
    const list = pbAll().filter(function(p){ return pbFor(p)===(kind==='lead' ? 'lead' : 'client'); });
    return '<div class="r55-pbp is-none"><div class="pb6-none"><b>Not on a playbook</b>'+
      (list.length ? '<select class="input input-sm" data-pb6-put="'+kind+':'+x.id+'"><option value="">Put '+(kind==='lead' ? 'them' : 'them')+' on one</option>'+list.map(function(p){ return '<option value="'+p.id+'">'+escapeHtml(p.name)+'</option>'; }).join('')+'</select>' : '<button class="btn btn-sm" data-action="pbEdit">Make a playbook</button>')+'</div></div>';
  };
})(pbPersonHtml);
document.addEventListener('change', function(e){
  const t = e.target; if(!t || !t.getAttribute) return;
  if(t.hasAttribute('data-pb6-put')){ const q = t.getAttribute('data-pb6-put').split(':'); if(t.value) pbMoveTo(q[0], q[1], t.value); return; }
  // (switching playbook from their window goes through the same move: it says what gets checked off)
  if(t.hasAttribute('data-pb-assign')){ e.stopImmediatePropagation(); const q = t.getAttribute('data-pb-assign').split(':'); pbMoveTo(q[0], q[1], t.value || null).then(function(ok){ if(!ok) try{ rerenderContactModal(); renderClientModalInto(); }catch(err){} }); }
}, true);

// ---- Focus → Tasks → Client backlog: each client's playbook tasks, next to their deliverables ----
function pbBacklogRows(c){
  const today = todayStr();
  return state.tasks.items.filter(function(t){ return t.master && t.master.kind==='pb' && t.master.who==='client' && t.master.id===c.id && (t.status!=='done' || t.completedAt===today); })
    .sort(function(a, b){ return String(a.deadline || '').localeCompare(String(b.deadline || '')); });
}
function pbBacklogBlock(c){
  const ts = pbBacklogRows(c); if(!ts.length || !c.pb) return '';
  const p = pbById(c.pb.id), today = todayStr();
  return '<div class="cbl-d pb6-cbl"><div class="cbl-dh"><b>'+escapeHtml(p ? p.name : 'Playbook')+'</b><span>'+ts.filter(function(t){ return t.status!=='done'; }).length+' open</span></div><div class="cbl-weeks">'+
    ts.map(function(t){
      const ty = PB_TYPES[t.master.type] || PB_TYPES.task, late = t.status!=='done' && t.deadline && t.deadline < today;
      return '<div class="cbl-w r51-wk pb6-cw'+(t.status==='done' ? ' is-done' : late ? ' is-late' : '')+'" style="--pbc:'+ty.color+'"><div class="r51-wl"><b><i>'+ty.icon+'</i> '+escapeHtml(t.title)+'</b><small>'+(t.status==='done' ? 'Done' : late ? 'Late since '+fmtDateShort(t.deadline) : t.deadline===today ? 'Today' : 'Due '+fmtDateShort(t.deadline))+'</small></div><div class="r51-wb">'+
        (t.status==='done' ? '<span class="r51-sub">Done</span>' : '<button class="cbl-today'+(t.status==='today' ? ' is-on' : '')+'" data-action="pb6Today" data-id="'+t.id+'">'+(t.status==='today' ? 'On today' : '&rarr; Today')+'</button><button class="cbl-done" data-action="completeTask" data-id="'+t.id+'">Done</button>')+'</div></div>';
    }).join('')+'</div></div>';
}
ACTIONS.pb6Today = function(el, e, id){ const t = state.tasks.items.find(function(x){ return x.id===id; }); if(!t) return; t.status = t.status==='today' ? 'backlog' : 'today'; playTick(); persist('tasks'); renderView(); };
clientBacklogHtml = (function(base){
  return function(){
    const h = base.apply(this, arguments);
    const cs = mtActiveClients().filter(function(c){ return pbBacklogRows(c).length && c.pb; }); if(!cs.length) return h;
    const tpl = document.createElement('template'); tpl.innerHTML = h;
    const root = tpl.content.querySelector('.cbl'); if(!root) return h;
    const empty = root.querySelector(':scope > .empty'); if(empty) empty.remove();
    cs.forEach(function(c){
      const nm = c.business || c.name, blk = Array.from(root.querySelectorAll('.cbl-client')).find(function(b){ const n = b.querySelector('.cbl-n b'); return n && n.textContent===nm; });
      const extra = document.createElement('template'); extra.innerHTML = pbBacklogBlock(c);
      if(blk) blk.appendChild(extra.content);
      else {
        const hs = clientHealthStatus(c), wrap = document.createElement('template');
        wrap.innerHTML = '<div class="cbl-client" style="--cc:'+clientAccent(c)+'"><div class="cbl-h"><span class="r42-cdot"></span><span class="cbl-n"><b>'+escapeHtml(nm)+'</b></span><span class="cbl-hs"><i class="lc-hs is-'+hs.level+'"></i>'+escapeHtml(clientHealthLabel(hs))+'</span></div>'+pbBacklogBlock(c)+'</div>';
        root.appendChild(wrap.content);
      }
    });
    return tpl.innerHTML;
  };
})(clientBacklogHtml);
