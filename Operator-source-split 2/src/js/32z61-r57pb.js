// ============ ROUND 57: PLAYBOOKS ARE PIPELINES ============
// A playbook is a pipeline you move people through by hand: its stages (Discovery → Proposal → Onboarding →
// Monthly service, or whatever you make) each hold the steps you do there. Lead playbooks mirror the Lead
// Center's stages and client playbooks mirror the client stages (a stage can say which one it mirrors: moving
// someone in the Lead Center moves them here, and the other way round). Nothing runs on a fixed day count:
//  • entering a stage puts its steps on your task list (once: where you put them, what you rename or reschedule
//    stays; done/undone still syncs both ways);
//  • finishing a stage's steps moves them on; moving them on ticks off what was left;
//  • a stage can run every month (Monthly service): its steps come back each month and it doesn't finish.
// Each step is a task, a call / event (linked to a calendar event; until there is one it's "Book …"), a document
// to send, or a report (it opens the report writer). It can be due when they enter, on a day of the stage, on its
// last day, N days before the end, or every week on a weekday. Steps carry a checklist, links, attachments (real
// files) and notes, so a playbook is also the SOP library. The calendar is only a guide: the ideal month, your
// posting days and each stage's steps on it.
// Health has one rule ("behind the guide"): someone is behind only when a past week of their stage's guide still
// has open steps. Health, the sidebar, notifications and the stats all read it from pbBehind().
PB_TYPES.call.label = 'Call / event';
PB_TYPES.doc = {label:'Document', color:'#C9B37E', icon:'&#128196;'};
const PB57_TYPES = ['task', 'call', 'doc', 'report', 'send', 'access'];
const PB57_RULES = [['enter', 'When they enter'], ['day', 'On day'], ['end', 'Last day'], ['before', 'Days before the end'], ['week', 'Every week on']];
let pb57Mirroring = false;

// ---- the data: stages and steps (old day-based playbooks and old client cycles come over) ----
function pb57Stage(name, extra){ return Object.assign({id:uid(), name:name || 'New stage', crm:null, repeat:null, days:7, steps:[]}, extra || {}); }
function pb57Step(title, type, due, extra){ return Object.assign({id:uid(), title:title || 'New step', type:type || 'task', due:due || {rule:'enter'}, checklist:[], links:[], files:[], notes:''}, extra || {}); }
function pb57FromItem(it, days){
  const s = pb57Step(it.title, it.type, null, {id:it.id, checklist:arr(it.checklist), links:arr(it.links), files:arr(it.files), notes:it.notes || '', every:Number(it.every) || 1});
  if(it.repeat==='week') s.due = {rule:'week', dow:Number(it.dow==null ? 5 : it.dow)};
  else { const d = Math.max(1, Number(it.day) || 1); s.due = d >= days ? {rule:'end'} : {rule:'day', n:d}; }
  return s;
}
// (an old client cycle's step becomes a stage; an item that repeated monthly is due on the last day of the month,
// or the day of the month it said; a once item counts its days from entering the stage, not from its position)
function pb57FromCycle(cy){
  return arr(cy.steps).map(function(st){
    const month = arr(st.checklist).some(function(it){ return it.repeat==='month'; });
    const S = pb57Stage(st.label || st.name || 'Stage', {repeat:month ? 'month' : null, days:month ? 30 : 7});
    arr(st.checklist).forEach(function(it){
      const t = /meeting|call/i.test(it.type || '') ? 'call' : /report/i.test(it.text || '') ? 'report' : /doc/.test(it.type || '') ? 'doc' : /form|link|video/.test(it.type || '') ? 'send' : 'task';
      let due;
      if(it.repeat==='week') due = {rule:'week', dow:it.dueDow==null || it.dueDow==='' ? 5 : Number(it.dueDow)};
      else if(it.repeat==='month') due = Number(it.dueDom) ? {rule:'day', n:Number(it.dueDom)} : {rule:'end'};
      else if(it.dueDays!=null && it.dueDays!=='') due = Number(it.dueDays) > 0 ? {rule:'day', n:Number(it.dueDays) + 1} : {rule:'enter'};
      else due = {rule:'enter'};
      S.steps.push(pb57Step(it.text, t, due, {links:it.link ? [{label:'Link', url:it.link}] : []}));
    });
    return S;
  });
}
// (a playbook made from an old cycle by round 55: its items' titles are the cycle's items)
function pb57CycleOf(p){
  const titles = arr(p.items).map(function(i){ return i.title; });
  return arr(crm().cycles).find(function(cy){
    const its = []; arr(cy.steps).forEach(function(st){ arr(st.checklist).forEach(function(it){ its.push(it.text); }); });
    return (cy.name || 'Client playbook')===p.name && its.length && its.length===titles.length && its.every(function(t){ return titles.indexOf(t) >= 0; });
  }) || null;
}
function pb57Migrate(p){
  if(!p || Array.isArray(p.stages)) return false;
  const cy = pbFor(p)==='client' ? pb57CycleOf(p) : null;
  if(cy){ p.stages = pb57FromCycle(cy); p.fromCycle = cy.id; }
  else {
    const days = Math.max(1, Number(p.days) || 30);
    p.stages = [pb57Stage(p.name, {repeat:pbRepeats(p) ? 'month' : null, days:days, crm:pbFor(p)==='lead' && p.stage ? p.stage : null, steps:arr(p.items).map(function(it){ return pb57FromItem(it, days); })})];
  }
  p.postDays = arr(p.postDays);
  return true;
}
function pbStages(p){ if(p && !Array.isArray(p.stages)) pb57Migrate(p); return p ? p.stages : []; }
function pb57StageOf(p, id){ const L = pbStages(p); return L.find(function(s){ return s.id===id; }) || null; }
// where someone is: their stage (the first one if they had none) and the day they entered it
function pb57Where(x, p){
  const L = pbStages(p); if(!L.length) return null;
  let st = x.pb.stage ? L.find(function(s){ return s.id===x.pb.stage; }) : null;
  if(!st){
    // (people on a playbook from before stages: an old cycle's client goes to the stage their old step was)
    st = L[0];
    if(p.fromCycle && x.cycleId===p.fromCycle && x.cycleStep!=null){ const cy = arr(crm().cycles).find(function(c){ return c.id===p.fromCycle; }); const i = cy ? arr(cy.steps).findIndex(function(s){ return s.id===x.cycleStep; }) : -1; if(i >= 0 && L[i]) st = L[i]; }
    x.pb.stage = st.id;
  }
  if(!x.pb.enteredAt) x.pb.enteredAt = x.pb.start || todayStr();
  return st;
}
// (the first stage of a run counts from the playbook's day 1, which you can change; later ones from when they got there)
function pb57In(x){ return !Number(x.pb.seq) && x.pb.start ? x.pb.start : (x.pb.enteredAt || x.pb.start || todayStr()); }

// ---- dates: a stage's guide (its length, or each month) and each step's day in it ----
pbCycle = function(x, p, at){
  at = at || todayStr();
  const st = pb57Where(x, p), s = pb57In(x) || at;
  if(st && st.repeat==='month'){ let n = 0; while(pbMonths(s, n + 1) <= at && n < 600) n++; return {start:pbMonths(s, n), end:addDays(pbMonths(s, n + 1), -1), n:n, month:true}; }
  const L = Math.max(1, Number(st && st.days) || 7);
  return {start:s, end:addDays(s, L - 1), n:0};
};
function pb57Due(step, cyc){
  const d = step.due || {rule:'enter'}, len = pbDaysBetween(cyc.start, cyc.end) + 1;
  if(d.rule==='day') return addDays(cyc.start, Math.max(0, Math.min(len, Number(d.n) || 1) - 1));
  if(d.rule==='end') return cyc.end;
  if(d.rule==='before') return addDays(cyc.end, -Math.max(0, Math.min(len - 1, Number(d.n) || 0)));
  return cyc.start;
}
function pb57RuleText(step, stage){
  const d = step.due || {rule:'enter'};
  if(d.rule==='week') return 'Every '+(PB_DOW.find(function(x){ return x[0]===String(d.dow); }) || ['', 'Fri'])[1];
  if(d.rule==='day') return 'Day '+(Number(d.n) || 1);
  if(d.rule==='end') return stage && stage.repeat==='month' ? 'Last day of the month' : 'Last day';
  if(d.rule==='before') return (Number(d.n) || 0)+' day'+(Number(d.n)===1 ? '' : 's')+' before the end';
  return 'When they enter';
}
pbOccs = function(x, p, cyc){
  const st = pb57Where(x, p); if(!st) return [];
  // (each time they enter a stage is its own: coming back to it later starts it fresh)
  const out = [], len = pbDaysBetween(cyc.start, cyc.end) + 1, pre = (x.pb && x.pb.run ? x.pb.run+'~' : '')+(x.pb && x.pb.seq ? x.pb.seq+'@' : '')+cyc.start;
  arr(st.steps).forEach(function(it){
    if(it.due && it.due.rule==='week'){
      for(let i = 0; i < len; i++){ const d = addDays(cyc.start, i); if(String(dowOf(d))===String(it.due.dow)) out.push({it:it, date:d, key:pre+':'+it.id+':'+d, stage:st}); }
      return;
    }
    if(st.repeat==='month' && Number(it.every) > 1 && cyc.n % Number(it.every)!==0) return;
    let date = pb57Due(it, cyc);
    // (a call that's on your calendar is due the day it's booked for)
    const evId = x.pb.ev && x.pb.ev[pre+':'+it.id], ev = evId ? arr(state.calendar.events).find(function(e){ return e.id===evId; }) : null;
    if(ev && ev.date) date = ev.date;
    out.push({it:it, date:date, key:pre+':'+it.id, stage:st, ev:ev});
  });
  return out.sort(function(a, b){ return a.date.localeCompare(b.date); });
};
pbState = function(kind, x){
  if(!x || !x.pb || !x.pb.id) return null;
  const p = pbById(x.pb.id); if(!p) return null;
  x.pb.done = x.pb.done && typeof x.pb.done==='object' ? x.pb.done : {}; x.pb.auto = x.pb.auto || {}; x.pb.hist = arr(x.pb.hist);
  const stage = pb57Where(x, p); if(!stage) return {p:p, stage:null, si:-1, cyc:{start:todayStr(), end:todayStr(), n:0}, occ:[], open:[], next:null, day:0, future:false, late:[]};
  const today = todayStr(), future = pb57In(x) > today, cyc = pbCycle(x, p, future ? pb57In(x) : today), occ = pbOccs(x, p, cyc);
  occ.forEach(function(o){ o.done = !!x.pb.done[o.key]; o.late = !o.done && o.date < today; o.wkEnd = pb57WeekEnd(cyc, o.date); });
  const open = occ.filter(function(o){ return !o.done; });
  return {p:p, stage:stage, si:pbStages(p).indexOf(stage), stages:pbStages(p), cyc:cyc, occ:occ, open:open, next:open[0] || null, day:future ? 0 : pbDaysBetween(cyc.start, today) + 1, future:future, late:occ.filter(function(o){ return o.late; })};
};
// the guide's weeks run from the day the stage (or the month) started: day 1–7 is week 1, and so on
function pb57WeekEnd(cyc, date){ const i = Math.max(0, pbDaysBetween(cyc.start, date)); return addDays(cyc.start, Math.floor(i/7)*7 + 6 > pbDaysBetween(cyc.start, cyc.end) ? pbDaysBetween(cyc.start, cyc.end) : Math.floor(i/7)*7 + 6); }

// ---- behind the guide: the one rule (health, notifications, sidebar, stats) ----
// Behind = a week of the guide that's over still has an open step (today in week 2, something from week 1 open).
// One week behind is yellow, two or more is red.
function pbBehind(kind, x){
  const out = {behind:false, weeks:0, items:[]};
  if(!x || !x.pb || !x.pb.id) return out;
  const today = todayStr(), s = pbState(kind, x); if(!s || s.future) return out;
  const add = function(title, wkEnd, ref){ if(!wkEnd || wkEnd >= today) return; out.items.push({title:title, wkEnd:wkEnd, ref:ref}); out.weeks = Math.max(out.weeks, Math.floor((pbDaysBetween(wkEnd, today) - 1)/7) + 1); };
  s.open.forEach(function(o){ if(x.pb.done[o.key]) return; add(o.it.title, o.wkEnd, o.key); });
  // (still open from an earlier month or stage: the task says which week of the guide it was)
  if(kind==='client') state.tasks.items.forEach(function(t){
    const m = t.master; if(!m || m.kind!=='pb' || t.status==='done' || m.who!==kind || m.id!==x.id || m.pb!==x.pb.id) return;
    if(s.occ.some(function(o){ return o.key===m.key; })) return;
    add(t.title, m.wkEnd || t.deadline, m.key);
  });
  out.behind = out.items.length > 0;
  return out;
}
pbLateFor = function(kind, id){ const today = todayStr(); return state.tasks.items.filter(function(t){ const m = t.master; return t.status!=='done' && m && m.kind==='pb' && m.who===kind && m.id===id && (m.wkEnd || t.deadline) && (m.wkEnd || t.deadline) < today; }); };
clientHealthStatus = (function(base){
  return function(c){
    const s = base.apply(this, arguments);
    if(!c || !s || !c.pb || !c.pb.id) return s;
    const b = pbBehind('client', c); if(!b.behind) return s;
    const lvl = b.weeks >= 2 ? 'red' : 'yellow', rank = {green:0, yellow:1, red:2};
    return Object.assign({}, s, {pbBehind:b.items.length, pbWeeks:b.weeks}, rank[lvl] > rank[s.level] ? {level:lvl} : {});
  };
})(clientHealthStatus);
clientHealthLabel = (function(base){ return function(s){ if(s && s.pbBehind && s.level!=='green') return 'Behind the guide'; return base.apply(this, arguments); }; })(clientHealthLabel);
clientHealthReason = (function(base){ return function(c, s){ if(s && s.pbBehind && s.level!=='green') return s.pbBehind+' step'+(s.pbBehind===1 ? '' : 's')+' from a past week'; return base.apply(this, arguments); }; })(clientHealthReason);
notifList = (function(base){
  return function(){
    const today = todayStr(), dis = notifDismissed();
    // (the old "late since" rule for playbook tasks goes; behind the guide replaces it)
    const out = base.apply(this, arguments).filter(function(n){ return !/^pb:/.test(n.key) && !/^pbl:/.test(n.key); });
    pbPeople().forEach(function(P){
      const b = pbBehind(P.kind, P.x); if(!b.behind) return;
      const key = 'pbb:'+P.kind+':'+P.x.id+':'+b.items.length; if(dis[key]===today) return;
      out.push({key:key, kind:P.kind, level:b.weeks >= 2 ? 'danger' : 'warn', icon:'&#9776;', title:pbName(P.kind, P.x)+' · behind the guide', sub:b.items.slice(0, 2).map(function(i){ return i.title; }).join(', ')+(b.items.length > 2 ? ' +'+(b.items.length - 2) : ''), act:P.kind==='lead' ? {a:'r54OpenLeads'} : {a:'openContact', kind:'client', id:P.x.id}, sort:0});
    });
    // (a lead's step due today still shows, as before, so it reaches the Reach out list)
    // (a lead has no tasks, so each step that's due shows here until it's done; one from a past week is "behind" above)
    r56LeadPbDue().forEach(function(r){ r.items.forEach(function(o){ if(o.wkEnd < today) return; const key = 'pbl:'+r.x.id+':'+o.key; if(dis[key]===today) return; out.push({key:key, kind:'lead', level:'warn', icon:(PB_TYPES[o.it.type] || PB_TYPES.task).icon, title:crmName('lead', r.x)+' · '+o.it.title, sub:o.date < today ? 'Since '+fmtDateShort(o.date) : 'Today', act:{a:'r54OpenLeads'}, sort:1}); }); });
    return out;
  };
})(notifList);
r55Signals = (function(base){
  return function(){
    const out = base.apply(this, arguments);
    if(out.business) out.business = out.business.filter(function(w){ return !/playbook task/.test(w); });
    const n = pbPeople().filter(function(P){ return pbBehind(P.kind, P.x).behind; }).length;
    if(n) (out.business = out.business || []).push(n+' behind the guide');
    if(out.business && !out.business.length) delete out.business;
    return out;
  };
})(r55Signals);

// ---- moving: entering a stage, moving on, going back ----
// (a stage they leave before getting to its steps: those come off the list, and come back fresh if they return)
function pb57DropOpen(kind, x, stageId){
  state.tasks.items = state.tasks.items.filter(function(t){
    const m = t.master, drop = m && m.kind==='pb' && m.who===kind && m.id===x.id && m.stage===stageId && t.status!=='done';
    if(drop && x.pb.made) delete x.pb.made[m.key];
    return !drop;
  });
}
function pb57Enter(kind, x, stageId, opts){
  opts = opts || {};
  const p = pbById(x.pb && x.pb.id), st = p && pb57StageOf(p, stageId); if(!st) return false;
  const cur = pb57Where(x, p), s = pbState(kind, x), today = todayStr();
  if(cur && cur.id===st.id && !opts.again) return false;
  // what was left on the stage they leave is ticked off (and put back if they come back)
  const auto = [];
  if(s && !opts.keepOpen) s.open.forEach(function(o){ x.pb.done[o.key] = today; auto.push(o.key); });
  if(opts.keepOpen && cur) pb57DropOpen(kind, x, cur.id);
  if(!opts.keepOpen) state.tasks.items.forEach(function(t){ const m = t.master; if(m && m.kind==='pb' && m.who===kind && m.id===x.id && m.pb===p.id && t.status!=='done' && (auto.indexOf(m.key) >= 0 || m.stage===(cur && cur.id))){ m.prev = t.status; m.autoDone = true; t.status = 'done'; t.completedAt = today; if(auto.indexOf(m.key) < 0){ auto.push(m.key); x.pb.done[m.key] = x.pb.done[m.key] || today; } } });
  x.pb.hist = arr(x.pb.hist).concat([{id:p.id, stage:cur ? cur.id : null, enteredAt:x.pb.enteredAt, run:x.pb.run, seq:x.pb.seq || 0, auto:auto, at:today}]).slice(-12);
  x.pb.stage = st.id; x.pb.enteredAt = today; x.pb.seq = (Number(x.pb.seq) || 0) + 1; delete x.pb.finished;
  if(typeof crmTimeline==='function') crmTimeline(x, 'stage', p.name+': '+st.name);
  // (the stage mirrors a Lead Center / client stage: they move there too)
  if(st.crm && x.stage!==st.crm && !pb57Mirroring && crmStage(kind, st.crm)){
    const cs = crmStage(kind, st.crm);
    if(!(kind==='lead' && cs.kind==='lost')){ pb57Mirroring = true; try{ setStage(kind, x.id, st.crm, {reasonGiven:true}); }catch(e){} finally { pb57Mirroring = false; } }
  }
  if(!opts.quiet) r55Banner(pbName(kind, x)+' → '+st.name);
  return true;
}
pbAdvance = function(kind, x, manual){
  const s = pbState(kind, x); if(!s || !s.stage) return false;
  if(s.stage.repeat==='month' && !manual) return false;
  const L = s.stages, nx = L[s.si + 1];
  if(nx) return pb57Enter(kind, x, nx.id, {quiet:!manual});
  // the last stage: what the playbook does when it ends
  const np = s.p.next ? pbById(s.p.next) : null;
  if(np){ pbStart(kind, x, np.id, todayStr(), !manual); return true; }
  if(pbRepeats(s.p)){ const first = L[0]; x.pb.run = Date.now().toString(36).slice(-5); return pb57Enter(kind, x, first.id, {again:true, quiet:!manual}); }
  if(!x.pb.finished){ x.pb.finished = todayStr(); r55Banner(pbName(kind, x)+' finished '+s.p.name); }
  return false;
};
pbStart = (function(base){
  return function(kind, x, pbId, start, quiet, stageId){
    const was = x.pb && x.pb.id ? {stage:x.pb.stage, enteredAt:x.pb.enteredAt} : null;
    base.apply(this, arguments);
    if(was && x.pb && arr(x.pb.hist).length){ const h = x.pb.hist[x.pb.hist.length - 1]; if(!h.stage){ h.stage = was.stage; h.enteredAt = was.enteredAt; } }
    const p = pbById(pbId); if(!p || !x.pb || x.pb.id!==pbId) return;
    const L = pbStages(p), st = (stageId && L.find(function(s){ return s.id===stageId; })) || (kind && x.stage && L.find(function(s){ return s.crm && s.crm===x.stage; })) || L[0];
    x.pb.stage = st ? st.id : null; x.pb.enteredAt = x.pb.start; x.pb.made = {}; x.pb.joined = todayStr();
    if(st && st.crm && x.stage!==st.crm && !pb57Mirroring && crmStage(kind, st.crm) && !(kind==='lead' && crmStage(kind, st.crm).kind==='lost')){ pb57Mirroring = true; try{ setStage(kind, x.id, st.crm, {reasonGiven:true}); }catch(e){} finally { pb57Mirroring = false; } }
  };
})(pbStart);
// moving someone in the Lead Center (or a client's stage) moves them in their playbook
setStage = (function(base){
  return function(kind, id, stageId){
    const r = base.apply(this, arguments);
    if(pb57Mirroring) return r;
    const x = crmFind(kind, id); if(!x || !x.pb || !x.pb.id || x.stage!==stageId) return r;
    const p = pbById(x.pb.id), st = p && pbStages(p).find(function(s){ return s.crm===stageId; });
    if(st && x.pb.stage!==st.id){ pb57Mirroring = true; try{ pb57Enter(kind, x, st.id); }finally{ pb57Mirroring = false; } persist('business'); persist('tasks'); try{ masterTasksSync(); }catch(e){} }
    return r;
  };
})(setStage);
// by hand: on to the next stage (it says first what gets ticked off), or back to the one before
pbMoveNext = function(kind, id){
  const x = crmFind(kind, id), s = pbState(kind, x); if(!s || !s.stage) return;
  const nx = s.stages[s.si + 1], np = !nx && s.p.next ? pbById(s.p.next) : null, left = s.open, names = left.slice(0, 5).map(function(o){ return o.it.title; });
  const to = nx ? nx.name : np ? np.name : null;
  uiConfirm({title:to ? 'Move '+pbName(kind, x)+' to '+to+'?' : 'Finish '+s.p.name+' for '+pbName(kind, x)+'?',
    text:left.length ? 'This ticks off '+left.length+' step'+(left.length===1 ? '' : 's')+' still open on '+s.stage.name+': '+names.join(', ')+(left.length > 5 ? ' and '+(left.length - 5)+' more' : '')+'.' : 'Everything on '+s.stage.name+' is done.', ok:to ? 'Move them' : 'Finish it'}).then(function(yes){
    if(!yes) return;
    if(!nx){ const today = todayStr(); left.forEach(function(o){ x.pb.done[o.key] = today; x.pb.auto[o.key] = 1; }); state.tasks.items.forEach(function(t){ const m = t.master; if(m && m.kind==='pb' && m.who===kind && m.id===id && t.status!=='done'){ m.prev = t.status; m.autoDone = true; t.status = 'done'; t.completedAt = today; } }); }
    if(nx) pb57Enter(kind, x, nx.id); else if(np) pbStart(kind, x, np.id, todayStr()); else { x.pb.finished = todayStr(); r55Banner(pbName(kind, x)+' finished '+s.p.name); }
    persist('business'); persist('tasks'); try{ masterTasksSync(); }catch(e){} renderView(); try{ rerenderContactModal(); renderClientModalInto(); }catch(e){}
  });
};
function pb57Back(kind, x){
  const h = arr(x.pb.hist), last = h[h.length - 1]; if(!last || last.id!==x.pb.id || !last.stage) return false;
  const p = pbById(last.id), st = p && pb57StageOf(p, last.stage); if(!st) return false;
  arr(last.auto).forEach(function(k){ delete x.pb.done[k]; });
  state.tasks.items.forEach(function(t){ const m = t.master; if(m && m.kind==='pb' && m.who===kind && m.id===x.id && arr(last.auto).indexOf(m.key) >= 0 && t.status==='done'){ t.status = m.prev && m.prev!=='done' ? m.prev : 'backlog'; t.completedAt = null; delete m.autoDone; } });
  // (the stage they're leaving: its steps they never got to come off the list)
  const cur = x.pb.stage;
  pb57DropOpen(kind, x, cur);
  x.pb.stage = st.id; x.pb.enteredAt = last.enteredAt || todayStr(); x.pb.run = last.run || x.pb.run; x.pb.seq = last.seq || 0; x.pb.hist = h.slice(0, -1); delete x.pb.finished;
  if(st.crm && x.stage!==st.crm && crmStage(kind, st.crm)){ pb57Mirroring = true; try{ setStage(kind, x.id, st.crm, {reasonGiven:true}); }catch(e){} finally { pb57Mirroring = false; } }
  return true;
}
pbMoveBack = function(kind, id){
  const x = crmFind(kind, id); if(!x || !x.pb) return;
  const h = arr(x.pb.hist), last = h[h.length - 1]; if(!last) return;
  const p = pbById(last.id), st = last.stage && p ? pb57StageOf(p, last.stage) : null;
  if(!st || last.id!==x.pb.id){
    // (back to the playbook they were on before)
    if(!p) return;
    uiConfirm({title:'Move '+pbName(kind, x)+' back to '+p.name+'?', text:'What was ticked off when they moved on comes back.', ok:'Move back'}).then(function(yes){
      if(!yes) return;
      x.pb = {id:last.id, start:last.start || last.enteredAt, stage:last.stage || null, enteredAt:last.enteredAt || last.start, run:last.run, done:Object.assign({}, last.done || {}), auto:{}, made:{}, hist:h.slice(0, -1)};
      Object.keys(last.auto || {}).forEach(function(k){ delete x.pb.done[k]; });
      // (the tasks it ticked off open again, where they were)
      state.tasks.items.forEach(function(t){ const m = t.master; if(m && m.kind==='pb' && m.who===kind && m.id===id && m.pb===last.id && (last.auto || {})[m.key] && t.status==='done'){ t.status = m.prev && m.prev!=='done' ? m.prev : 'backlog'; t.completedAt = null; delete m.autoDone; } });
      state.tasks.items = state.tasks.items.filter(function(t){ return !(t.master && t.master.kind==='pb' && t.master.who===kind && t.master.id===id && t.master.pb!==last.id && t.status!=='done'); });
      r55Banner(pbName(kind, x)+' moved back to '+p.name);
      persist('business'); persist('tasks'); try{ masterTasksSync(); }catch(e){} renderView(); try{ rerenderContactModal(); renderClientModalInto(); }catch(e){}
    });
    return;
  }
  uiConfirm({title:'Move '+pbName(kind, x)+' back to '+st.name+'?', text:'What was ticked off when they moved on comes back.', ok:'Move back'}).then(function(yes){
    if(!yes || !pb57Back(kind, x)) return;
    r55Banner(pbName(kind, x)+' moved back to '+st.name);
    persist('business'); persist('tasks'); try{ masterTasksSync(); }catch(e){} renderView(); try{ rerenderContactModal(); renderClientModalInto(); }catch(e){}
  });
};
// (moving between playbooks: the same as before; someone put on one starts on the stage that mirrors theirs)

// ---- the tasks: placed once, yours from then on ----
function pb57TaskTitle(o){ return o.it.type==='call' && !o.ev ? 'Book: '+(o.it.title || 'the call') : (o.it.title || 'Playbook step'); }
function pb57Notes(o){
  const it = o.it;
  return (it.notes ? it.notes+'\n' : '')+arr(it.checklist).map(function(c){ return '• '+c.t; }).concat(arr(it.links).filter(function(l){ return l.url; }).map(function(l){ return (l.label || 'Link')+': '+l.url; })).join('\n');
}
pbSync = function(){
  if(!state || !state.business || !state.tasks) return false;
  let ch = false; if(pbSeed()) ch = true;
  const cm = crm(), today = todayStr();
  pbAll().forEach(function(p){ if(pb57Migrate(p)) ch = true; });
  cm.pbKnown = arr(cm.pbKnown);
  arr(state.business.clients).forEach(function(c){ if(cm.pbKnown.indexOf(c.id) >= 0) return; cm.pbKnown.push(c.id); ch = true; if(c.pb) return; const lead = c.fromLeadId ? crmFind('lead', c.fromLeadId) : null; if(lead && lead.pb) lead.pb.ended = today; });
  arr(state.business.pipeline).forEach(function(l){
    if(cm.pbKnown.indexOf('L:'+l.id) >= 0 || ui.r56Adding) return; cm.pbKnown.push('L:'+l.id); ch = true;
    if(l.pb || !leadIsOpen(l)) return;
    const st = pbAll().find(function(p){ return pbFor(p)==='lead' && p.stage && p.stage===l.stage; });
    if(st) pbStart('lead', l, st.id, todayStr(), true);
  });
  const live = {};
  pbPeople().forEach(function(P){
    const x = P.x; if(!x.pb || !x.pb.id) return;
    // a stage whose steps are all done moves them on (never a monthly stage, never an empty one)
    for(let i = 0; i < 8; i++){ const s = pbState(P.kind, x); if(!s || !s.stage || s.future || x.pb.finished || s.stage.repeat==='month' || !s.occ.length || s.open.length) break; if(!pbAdvance(P.kind, x)) break; ch = true; }
    { const s0 = pbState(P.kind, x); if(s0 && x.pb.finished && s0.open.length){ delete x.pb.finished; ch = true; } }
    if(P.kind==='lead') return;
    const s = pbState(P.kind, x); if(!s || !s.stage) return;
    x.pb.made = x.pb.made && typeof x.pb.made==='object' ? x.pb.made : {};
    s.occ.forEach(function(o){
      const k = P.kind+':'+x.id+':'+o.key; live[k] = 1;
      let t = state.tasks.items.find(function(t){ return t.master && t.master.kind==='pb' && t.master.k===k; });
      if(t && !x.pb.made[o.key]){ x.pb.made[o.key] = t.createdAt || today; ch = true; }
      if(t && t.master.wkEnd!==o.wkEnd){ t.master.wkEnd = o.wkEnd; if(s.stage && !t.master.stage){ t.master.stage = s.stage.id; t.master.stageName = s.stage.name; } ch = true; }
      if(o.done){ if(t && t.status!=='done'){ t.master.prev = t.status; t.status = 'done'; t.completedAt = today; ch = true; } return; }
      const weekly = o.it.due && o.it.due.rule==='week';
      if(!t){
        if(x.pb.made[o.key]){ x.pb.done[o.key] = 'skipped'; ch = true; return; }   // (you deleted it: it's off the guide)
        if(weekly && o.date > addDays(today, 6)) return;
        if(weekly && addDays(o.date, 7) < today){ x.pb.done[o.key] = 'missed'; ch = true; return; }
        // (a weekly step from before they were put on it isn't theirs to catch up on)
        if(weekly && x.pb.joined && o.date < x.pb.joined){ x.pb.done[o.key] = 'before'; ch = true; return; }
        t = {id:uid(), title:pb57TaskTitle(o), client:x.id, clients:[x.id], priority:o.it.type==='call' ? 'high' : 'med', deadline:o.date, notes:pb57Notes(o),
          status:o.date <= addDays(today, 1) ? 'today' : 'backlog', createdAt:today, completedAt:null,
          master:{kind:'pb', k:k, who:P.kind, id:x.id, key:o.key, item:o.it.id, type:o.it.type, pb:s.p.id, pbName:s.p.name, stage:s.stage.id, stageName:s.stage.name, wkEnd:o.wkEnd, book:o.it.type==='call' && !o.ev}};
        state.tasks.items.push(t); x.pb.made[o.key] = today; ch = true; return;
      }
      if(t.status==='done' && !x.pb.done[o.key]){
        // (a "Book the call" task done means it's booked; the call itself is done once it's happened)
        if(t.master.book && !o.ev){ x.pb.done[o.key] = t.completedAt || today; ch = true; }
        else if(!t.master.book){ x.pb.done[o.key] = t.completedAt || today; ch = true; }
      }
      // (once the call is on the calendar, the "Book" task is done and the step is the call: due that day)
      if(t.master.book && o.ev){
        t.master.book = false;
        if(t.title==='Book: '+(o.it.title || 'the call')) t.title = o.it.title;
        if(t.deadline===pb57Due(o.it, s.cyc) || !t.deadline) t.deadline = o.ev.date;
        if(t.status==='done'){ t.status = 'backlog'; t.completedAt = null; }
        ch = true;
      }
      if(!t.master.book && o.ev && t.status!=='done' && (o.ev.date < today || (o.ev.date===today && o.ev.time && localTs(o.ev.date, o.ev.time) + 60*60000 < Date.now()))){ t.status = 'done'; t.completedAt = today; x.pb.done[o.key] = today; ch = true; }
    });
  });
  // open tasks for someone who isn't on that playbook any more (or is gone) come off; the rest stay where you put them
  const before = state.tasks.items.length;
  state.tasks.items = state.tasks.items.filter(function(t){
    const m = t.master; if(!m || m.kind!=='pb' || t.status==='done') return true;
    const x = crmFind(m.who, m.id); if(!x) return false;
    if(m.who==='lead') return false;
    return !!(x.pb && x.pb.id===m.pb);
  });
  if(state.tasks.items.length!==before) ch = true;
  return ch;
};
// done on the list = done on the playbook (and a finished stage moves them on); undo puts it back, and moves them
// back if finishing it had moved them on
undoTask = (function(base){
  return function(id){
    const t = state.tasks.items.find(function(x){ return x.id===id; }), m = t && t.master;
    const r = base.apply(this, arguments);
    if(m && m.kind==='pb'){
      const x = crmFind(m.who, m.id);
      if(x && x.pb && x.pb.id===m.pb && m.stage && x.pb.stage!==m.stage){ const h = arr(x.pb.hist), last = h[h.length - 1]; if(last && last.stage===m.stage && last.at===todayStr()) pb57Back(m.who, x); }
      if(x && x.pb && x.pb.done) delete x.pb.done[m.key];
      persist('business'); persist('tasks');
    }
    return r;
  };
})(undoTask);
// the Book task and the call: scheduling it from the step links the event (and the guide follows the booking)
onCalEventSaved = (function(base){
  return function(ev){
    const S = ui.r55PbSched;
    const r = base.apply(this, arguments);
    if(S && ev){ try{ masterTasksSync(); }catch(e){} }
    return r;
  };
})(onCalEventSaved);
// (a task's Schedule button for a Book task)
ACTIONS.pb57Book = function(el, e, id){
  const t = state.tasks.items.find(function(x){ return x.id===id; }), m = t && t.master; if(!m) return;
  const x = crmFind(m.who, m.id); if(!x) return;
  ACTIONS.pbSchedule({dataset:{id:m.who+'|'+m.id+'|'+m.key}});
};

// ---- the cards: the stage on the badge, attachments, and the Book button ----
taskCard = (function(base){
  return function(t){
    let h = base.apply(this, arguments);
    const m = t && t.master; if(!m || m.kind!=='pb') return h;
    const p = pbById(m.pb), st = p && m.stage ? pb57StageOf(p, m.stage) : null, ty = PB_TYPES[m.type] || PB_TYPES.task;
    h = h.replace(/<span class="mt-badge r55-pbb">[\s\S]*?<\/span>/, function(){ return '<span class="mt-badge r55-pbb">'+ty.icon+' '+escapeHtml(st ? st.name : (m.stageName || ty.label))+'</span>'; });
    const files = pb57StepOf(t), n = files ? arr(files.files).length : 0;
    if(n) h = h.replace(/(<div class="task-card-title">[\s\S]*?<\/div>)/, function(m0){ return m0+'<div class="pb57-att">&#128206; '+n+' attached</div>'; });
    return h;
  };
})(taskCard);
function pb57StepOf(t){ const m = t && t.master; if(!m || m.kind!=='pb') return null; const p = pbById(m.pb); if(!p) return null; let hit = null; pbStages(p).forEach(function(s){ arr(s.steps).forEach(function(st){ if(st.id===m.item) hit = st; }); }); return hit; }

// ---- attachments: real files on a step (SOPs, templates, checklists), shown wherever the step shows ----
async function pb57Attach(stepRef, files){
  const st = pb57FindStep(stepRef); if(!st || !files || !files.length) return;
  st.files = arr(st.files);
  for(const file of files){
    const isImg = file.type && file.type.indexOf('image/')===0;
    const ref = isImg ? await storeImageFile(file) : await blobStore(file);
    st.files.push({id:uid(), kind:'file', name:file.name || 'file', mime:file.type || '', size:file.size || 0, ref:ref, addedAt:Date.now()});
  }
  playTick(); pbSave(); renderView(); try{ renderTaskEditModalInto(); }catch(e){}
}
function pb57FindStep(ref){ const q = String(ref || '').split('|'), p = pbById(q[0]); if(!p) return null; let hit = null; pbStages(p).forEach(function(s){ arr(s.steps).forEach(function(st){ if(st.id===q[1]) hit = st; }); }); return hit; }
ACTIONS.pb57Attach = function(el){ const inp = document.createElement('input'); inp.type = 'file'; inp.multiple = true; inp.onchange = function(){ pb57Attach(el.dataset.id, Array.prototype.slice.call(inp.files || [])); }; inp.click(); };
ACTIONS.pb57FileOpen = function(el){ const st = pb57FindStep(el.dataset.id), f = st && arr(st.files).find(function(x){ return x.id===el.dataset.file; }); if(!f) return; ui.previewFile = f; showOverlay('filePreviewOverlay'); try{ renderFilePreviewInto(); }catch(e){} };
ACTIONS.pb57FileDel = function(el){ const st = pb57FindStep(el.dataset.id); if(!st) return; const f = arr(st.files).find(function(x){ return x.id===el.dataset.file; }); st.files = arr(st.files).filter(function(x){ return x!==f; }); if(f) try{ blobRemove(f.ref); }catch(e){} pbSave(); renderView(); };
function pb57FilesHtml(p, st, edit){
  const ref = p.id+'|'+st.id, fs = arr(st.files);
  if(!fs.length && !edit) return '';
  return '<div class="pb57-files">'+fs.map(function(f){ return '<span class="pb57-file"><button data-action="pb57FileOpen" data-id="'+ref+'" data-file="'+f.id+'">&#128196; '+escapeHtml(f.name)+'</button>'+(edit ? '<button class="pb57-fx" data-action="pb57FileDel" data-id="'+ref+'" data-file="'+f.id+'" aria-label="Remove">&#10005;</button>' : '')+'</span>'; }).join('')+(edit ? '<button class="pb6-more" data-action="pb57Attach" data-id="'+ref+'">+ Attach a file</button>' : '')+'</div>';
}
// in the task's own window
renderTaskEditModal = (function(base){
  return function(){
    const h = base.apply(this, arguments), t = state.tasks.items.find(function(x){ return x.id===ui.editingTaskId; });
    const m = t && t.master; if(!m || m.kind!=='pb') return h;
    const p = pbById(m.pb), st = pb57StepOf(t); if(!p || !st) return h;
    const stage = m.stage ? pb57StageOf(p, m.stage) : null;
    const blk = '<div class="pb57-tm"><div class="pb57-tm-h"><b>'+escapeHtml(p.name)+(stage ? ' · '+escapeHtml(stage.name) : '')+'</b>'+(m.book ? '<button class="btn btn-sm btn-primary" data-action="pb57Book" data-id="'+t.id+'">Book it</button>' : '')+'</div>'+
      (arr(st.checklist).length ? '<div class="r55-pbp-cl">'+st.checklist.map(function(c){ return '<span>'+escapeHtml(c.t)+'</span>'; }).join('')+'</div>' : '')+
      (arr(st.links).filter(function(l){ return l.url; }).length ? '<div class="pb57-files">'+st.links.filter(function(l){ return l.url; }).map(function(l){ return '<span class="pb57-file"><button data-action="pbOpen" data-url="'+escapeHtml(l.url)+'">&#128279; '+escapeHtml(l.label || 'Link')+'</button></span>'; }).join('')+'</div>' : '')+
      pb57FilesHtml(p, st, false)+'</div>';
    const i = h.lastIndexOf('<div class="row" style="margin-top:20px');
    return i > 0 ? h.slice(0, i)+blk+h.slice(i) : h+blk;
  };
})(renderTaskEditModal);

// ---- Client backlog: each client's playbook tasks under their stage, Today and Done right there ----
pbBacklogBlock = function(c){
  const ts = pbBacklogRows(c); if(!ts.length || !c.pb) return '';
  const p = pbById(c.pb.id), today = todayStr(), s = pbState('client', c);
  return '<div class="cbl-d pb6-cbl"><div class="cbl-dh"><b>'+escapeHtml(p ? p.name : 'Playbook')+(s && s.stage ? ' · '+escapeHtml(s.stage.name) : '')+'</b><span>'+ts.filter(function(t){ return t.status!=='done'; }).length+' open</span></div><div class="cbl-weeks">'+
    ts.map(function(t){
      const ty = PB_TYPES[t.master.type] || PB_TYPES.task, behind = t.status!=='done' && t.master.wkEnd && t.master.wkEnd < today, st = pb57StepOf(t), n = st ? arr(st.files).length : 0;
      return '<div class="cbl-w r51-wk pb6-cw'+(t.status==='done' ? ' is-done' : behind ? ' is-late' : '')+'" style="--pbc:'+ty.color+'"><div class="r51-wl"><b><i>'+ty.icon+'</i> '+escapeHtml(t.title)+(n ? ' <em class="pb57-n">&#128206;'+n+'</em>' : '')+'</b><small>'+(t.status==='done' ? 'Done' : behind ? 'Behind the guide' : t.deadline===today ? 'Today' : t.deadline ? 'Due '+fmtDateShort(t.deadline) : 'No date')+'</small></div><div class="r51-wb">'+
        (t.status==='done' ? '<span class="r51-sub">Done</span>' : '<button class="cbl-today'+(t.status==='today' ? ' is-on' : '')+'" data-action="pb6Today" data-id="'+t.id+'">'+(t.status==='today' ? 'On today' : '&rarr; Today')+'</button><button class="cbl-done" data-action="pb6Done" data-id="'+t.id+'">Done</button>')+'</div></div>';
    }).join('')+'</div></div>';
};
ACTIONS.pb6Done = function(el, e, id){
  const t = state.tasks.items.find(function(x){ return x.id===id; }); if(!t || t.status==='done') return;
  const P = pbTaskPerson(t), today = todayStr();
  t.status = 'done'; t.completedAt = today; if(P) P.x.pb.done[t.master.key] = today;
  playTick(); persist('tasks'); persist('business'); try{ xpLast = null; }catch(err){} try{ masterTasksSync(); }catch(err){} renderView();
};

// ---- a client's (or lead's) playbook, in their window: the stages across, this stage's steps ----
pbPersonHtml = (function(base){
  return function(kind, x){
    const s = pbState(kind, x); if(!s || !s.stage) return base.apply(this, arguments);
    const today = todayStr(), p = s.p, L = s.stages, b = pbBehind(kind, x);
    const choices = pbAll().filter(function(q){ return pbFor(q)===(kind==='lead' ? 'lead' : 'client'); });
    const pick = '<select class="input input-sm" data-pb-assign="'+kind+':'+x.id+'"><option value="">No playbook</option>'+choices.map(function(q){ return '<option value="'+q.id+'"'+(q.id===p.id ? ' selected' : '')+'>'+escapeHtml(q.name)+'</option>'; }).join('')+'</select>';
    const pipe = '<div class="pb57-pipe">'+L.map(function(st, i){ const on = i===s.si, past = i < s.si; return '<button class="pb57-ps'+(on ? ' is-on' : past ? ' is-past' : '')+'" data-action="pb57PutStage" data-id="'+kind+'|'+x.id+'|'+st.id+'"><i>'+(past ? '&#10003;' : i + 1)+'</i><span>'+escapeHtml(st.name)+'</span></button>'; }).join('')+'</div>';
    const row = function(o){
      const ty = PB_TYPES[o.it.type] || PB_TYPES.task, id = kind+'|'+x.id+'|'+o.key, late = !o.done && o.wkEnd < today;
      const links = arr(o.it.links).filter(function(l){ return l.url; }).map(function(l){ return '<button class="r55-pbp-lk" data-action="pbOpen" data-url="'+escapeHtml(l.url)+'">'+escapeHtml(l.label || 'Open')+'</button><button class="r55-pbp-lk is-c" data-action="pbCopy" data-url="'+escapeHtml(l.url)+'" title="Copy to send">Copy</button>'; }).join('');
      const sched = o.it.type==='call' && !o.done ? (o.ev ? '<span class="r55-pbp-ev">&#128197; '+fmtDateShort(o.ev.date)+(o.ev.time ? ' '+fmt12Hour(o.ev.time) : '')+'</span>' : '<button class="r55-pbp-lk" data-action="pbSchedule" data-id="'+escapeHtml(id)+'">Book</button>') : '';
      const files = arr(o.it.files).map(function(f){ return '<button class="r55-pbp-lk" data-action="pb57FileOpen" data-id="'+p.id+'|'+o.it.id+'" data-file="'+f.id+'">&#128206; '+escapeHtml(f.name)+'</button>'; }).join('');
      return '<div class="r55-pbp-r'+(o.done ? ' is-done' : late ? ' is-late' : '')+'" style="--pbc:'+ty.color+'">'+
        '<button class="r55-pbp-ck" data-action="pbTick" data-id="'+escapeHtml(id)+'">'+(o.done ? '&#10003;' : '')+'</button>'+
        '<span class="r55-pbp-t"><b>'+escapeHtml(o.it.title)+'</b><small><i></i>'+ty.label+' · '+(o.done ? (x.pb.done[o.key]==='missed' ? 'missed' : x.pb.done[o.key]==='skipped' ? 'taken off' : x.pb.done[o.key]==='before' ? 'before they joined' : 'done') : late ? 'behind the guide' : o.date===today ? 'today' : fmtDateShort(o.date))+'</small></span>'+
        '<span class="r55-pbp-a">'+sched+links+files+'</span></div>';
    };
    const done = s.occ.filter(function(o){ return o.done; }).length, nx = L[s.si + 1], np = !nx && p.next ? pbById(p.next) : null;
    const last = arr(x.pb.hist)[arr(x.pb.hist).length - 1], backTo = last ? (last.id===p.id && last.stage ? (pb57StageOf(p, last.stage) || {}).name : (pbById(last.id) || {}).name) : null;
    return '<div class="r55-pbp pb57-pp">'+
      '<div class="r55-pbp-h">'+pick+'<button class="btn btn-ghost btn-sm" data-action="pbEdit" data-id="'+p.id+'">Open playbook</button></div>'+pipe+
      '<div class="r55-pbp-s"><b>'+escapeHtml(s.stage.name)+'</b><label class="r55-pbp-st"><span>Since</span><input class="input input-sm" type="date" data-pb-start="'+kind+':'+x.id+'" value="'+escapeHtml(pb57In(x))+'"></label><span>'+(s.future ? 'Starts '+fmtDateShort(pb57In(x)) : s.stage.repeat==='month' ? fmtDateShort(s.cyc.start)+' – '+fmtDateShort(s.cyc.end) : 'Day '+s.day)+'</span><em>'+done+'/'+s.occ.length+' done'+(b.behind ? ' · <b class="is-late">behind</b>' : '')+'</em></div>'+
      '<i class="r55-pbs-bar"><u style="width:'+(s.occ.length ? Math.round(done/s.occ.length*100) : 0)+'%"></u></i>'+
      '<div class="r55-pbp-list">'+(s.occ.length ? s.occ.map(row).join('') : '<div class="pb57-none">Nothing to do on this stage.</div>')+'</div>'+
      '<div class="r55-pbp-f">'+(backTo ? '<button class="btn btn-ghost btn-sm" data-action="pbBack" data-kind="'+kind+'" data-id="'+x.id+'">&larr; '+escapeHtml(backTo)+'</button>' : '<span></span>')+
        (s.stage.repeat==='month' && !nx && !np ? '' : '<button class="btn btn-sm" data-action="pbNext" data-kind="'+kind+'" data-id="'+x.id+'">'+(nx ? escapeHtml(nx.name)+' &rarr;' : np ? escapeHtml(np.name)+' &rarr;' : 'Finish &#10003;')+'</button>')+'</div></div>';
  };
})(pbPersonHtml);
// put them on a stage straight from the pipeline in their window
ACTIONS.pb57PutStage = function(el){
  const q = String(el.dataset.id).split('|'), x = crmFind(q[0], q[1]); if(!x || !x.pb) return;
  const s = pbState(q[0], x); if(!s || !s.stage || s.stage.id===q[2]) return;
  const to = pb57StageOf(s.p, q[2]), fwd = s.stages.indexOf(to) > s.si, left = s.open;
  uiConfirm({title:'Move '+pbName(q[0], x)+' to '+to.name+'?', text:fwd && left.length ? 'This ticks off '+left.length+' open step'+(left.length===1 ? '' : 's')+' on '+s.stage.name+'.' : fwd ? 'Everything on '+s.stage.name+' is done.' : 'They go back to '+to.name+'.', ok:'Move them'}).then(function(yes){
    if(!yes) return;
    pb57Enter(q[0], x, to.id, {keepOpen:!fwd});
    persist('business'); persist('tasks'); try{ masterTasksSync(); }catch(e){} renderView(); try{ rerenderContactModal(); renderClientModalInto(); }catch(e){}
  });
};
// the board card says the stage and what's next
pbCardHtml = function(kind, x){
  const s = pbState(kind, x), nm = pbName(kind, x), b = pbBehind(kind, x);
  let meta = '', next = '';
  if(s && s.stage){
    meta = s.future ? 'Starts '+fmtDateShort(pb57In(x)) : x.pb.finished ? 'Finished' : s.stage.repeat==='month' ? 'Month '+(s.cyc.n + 1) : 'Day '+s.day;
    if(s.next){ const ty = PB_TYPES[s.next.it.type] || PB_TYPES.task; next = '<div class="pb6-cn" style="--pbc:'+ty.color+'"><i></i><span>'+escapeHtml(s.next.it.title)+'</span><small>'+(s.next.wkEnd < todayStr() ? '<em>behind</em>' : s.next.date===todayStr() ? 'today' : fmtDateShort(s.next.date))+'</small></div>'; }
    else next = '<div class="pb6-cn is-clear"><span>All caught up</span></div>';
  }
  const cc = kind==='client' ? clientAccent(x) : '#8B95A7';
  return '<div class="pb6-card'+(b.behind ? ' is-late' : '')+'" draggable="true" data-pb6-drag="'+kind+':'+x.id+'" data-action="pb6OpenPerson" data-kind="'+kind+'" data-id="'+x.id+'" style="--cc:'+cc+'">'+
    '<div class="pb6-ch"><i></i><b>'+escapeHtml(nm)+'</b>'+(b.behind ? '<span class="pb6-late">behind</span>' : '')+'</div>'+
    (meta ? '<small class="pb6-cm">'+meta+'</small>' : '')+next+'</div>';
};
pbStripHtml = function(kind, x){
  const s = pbState(kind, x); if(!s || !s.stage) return '';
  const nx = s.next, pct = s.occ.length ? Math.round(s.occ.filter(function(o){ return o.done; }).length/s.occ.length*100) : 0;
  const when = function(o){ return o.wkEnd < todayStr() ? '<em class="is-late">behind</em>' : o.date===todayStr() ? 'today' : o.date===addDays(todayStr(), 1) ? 'tomorrow' : fmtDateShort(o.date); };
  return '<div class="r55-pbs" data-action="openContact" data-kind="'+kind+'" data-id="'+x.id+'"><div class="r55-pbs-h"><b>'+escapeHtml(s.p.name)+'</b><span>'+(s.stage.name!==s.p.name ? escapeHtml(s.stage.name)+' · ' : '')+(s.future ? 'starts '+fmtDateShort(pb57In(x)) : x.pb.finished ? 'done' : s.stage.repeat==='month' ? 'month '+(s.cyc.n + 1) : 'Day '+s.day)+'</span></div>'+
    '<i class="r55-pbs-bar"><u style="width:'+pct+'%"></u></i>'+
    (nx ? '<div class="r55-pbs-n" style="--pbc:'+(PB_TYPES[nx.it.type] || PB_TYPES.task).color+'"><i></i><span>'+escapeHtml(nx.it.title)+'</span><small>'+when(nx)+'</small></div>' : '<div class="r55-pbs-n is-clear"><span>All caught up</span></div>')+'</div>';
};

// ============ Business → Clients & leads → Playbooks ============
// Board: pick a playbook; its stages are the columns (and one for people not on it). Drag a card to move them.
// Build: the stages across the top, the open stage's steps below it, the step (or the stage) on the right; the
// calendar is one switch away, as the guide.
pbEditorHtml = function(){
  pbSeed(); pbAll().forEach(pb57Migrate);
  const view = ui.pbView==='build' ? 'build' : 'board', who = ui.pbWho==='lead' ? 'lead' : 'client';
  const list = pbAll().filter(function(p){ return pbFor(p)===who; });
  let p = pbById(ui.pbSel); if(!p || pbFor(p)!==who){ p = list[0] || null; ui.pbSel = p ? p.id : null; }
  const bar = '<div class="pb6-bar"><div class="seg-tabs seg-sm"><button class="seg-tab'+(view==='board' ? ' active' : '')+'" data-action="pb6View" data-id="board">Board</button><button class="seg-tab'+(view==='build' ? ' active' : '')+'" data-action="pb6View" data-id="build">Build</button></div>'+
    '<div class="seg-tabs seg-sm"><button class="seg-tab'+(who==='client' ? ' active' : '')+'" data-action="pb6Who" data-id="client">Clients</button><button class="seg-tab'+(who==='lead' ? ' active' : '')+'" data-action="pb6Who" data-id="lead">Leads</button></div>'+
    '<span class="pb6-sp"></span><button class="btn btn-sm btn-primary" data-action="pb6NewOpen" data-id="'+who+'">+ New playbook</button></div>';
  const pills = list.length > 1 || view==='build' ? '<div class="pb6-pills">'+list.map(function(x){ return '<button class="pb6-pill'+(p && p.id===x.id ? ' is-on' : '')+'" data-action="pbPick" data-id="'+x.id+'">'+escapeHtml(x.name)+'</button>'; }).join('')+'</div>' : '';
  if(!p) return '<div class="pb6">'+bar+'<div class="pb6-empty"><b>No playbooks for '+(who==='lead' ? 'leads' : 'clients')+' yet</b><button class="btn btn-sm btn-primary" data-action="pb6NewOpen" data-id="'+who+'">+ New playbook</button></div></div>';
  return '<div class="pb6 pb57">'+bar+pills+(view==='board' ? pb57BoardHtml(p) : pb57BuildHtml(p))+'</div>';
};
renderLifecycleTab = function(){ return pbEditorHtml(); };
function pb57BoardHtml(p){
  const who = pbFor(p), people = pbCountsFor(who), L = pbStages(p);
  const off = people.filter(function(x){ return !x.pb || !x.pb.id || x.pb.id!==p.id; });
  const col = function(st){
    const on = st ? people.filter(function(x){ return x.pb && x.pb.id===p.id && pb57Where(x, p)===st; }) : off;
    return '<section class="pb6-col'+(st ? '' : ' is-off')+'" data-pb6-col="'+(st ? p.id+'|'+st.id : '')+'">'+
      '<header><b>'+(st ? escapeHtml(st.name) : 'Not on '+escapeHtml(p.name))+'</b><span>'+on.length+'</span></header>'+
      (st ? '<small class="pb6-cmeta">'+(st.repeat==='month' ? 'Every month' : arr(st.steps).length+' step'+(arr(st.steps).length===1 ? '' : 's'))+(st.crm && crmStage(who, st.crm) ? ' · '+escapeHtml(crmStage(who, st.crm).label) : '')+'</small>' : '')+
      '<div class="pb6-cards">'+on.map(function(x){ return st ? pbCardHtml(who, x) : pb57OffCard(who, x); }).join('')+'</div></section>';
  };
  return '<div class="pb6-board">'+col(null)+L.map(col).join('')+'</div>';
}
function pb57OffCard(kind, x){
  const on = x.pb && x.pb.id ? pbById(x.pb.id) : null, cc = kind==='client' ? clientAccent(x) : '#8B95A7';
  return '<div class="pb6-card" draggable="true" data-pb6-drag="'+kind+':'+x.id+'" data-action="pb6OpenPerson" data-kind="'+kind+'" data-id="'+x.id+'" style="--cc:'+cc+'"><div class="pb6-ch"><i></i><b>'+escapeHtml(pbName(kind, x))+'</b></div>'+(on ? '<small class="pb6-cm">On '+escapeHtml(on.name)+'</small>' : '')+'</div>';
}
// drop on a stage: onto this playbook at that stage (or to that stage if already on it); on "Not on": off it
document.addEventListener('drop', function(e){
  const d = e.target.closest && e.target.closest('.pb57 .pb6-col'); if(!d) return;
  const v = e.dataTransfer.getData('text/pb6'); if(!v) return;
  e.preventDefault(); e.stopImmediatePropagation(); d.classList.remove('is-over');
  const q = v.split(':'), kind = q[0], x = crmFind(kind, q[1]); if(!x) return;
  const col = d.getAttribute('data-pb6-col') || '', c = col.split('|'), p = pbById(c[0]);
  if(!col){ const cur = x.pb && x.pb.id ? pbById(x.pb.id) : null; if(cur && cur.id===ui.pbSel) pbMoveTo(kind, x.id, null); return; }
  if(!p) return;
  if(x.pb && x.pb.id===p.id){ ACTIONS.pb57PutStage({dataset:{id:kind+'|'+x.id+'|'+c[1]}}); return; }
  pbMoveTo(kind, x.id, p.id).then(function(ok){ if(ok && x.pb && x.pb.id===p.id && x.pb.stage!==c[1]){ pb57Enter(kind, x, c[1], {quiet:true, keepOpen:true}); persist('business'); persist('tasks'); try{ masterTasksSync(); }catch(err){} renderView(); } });
}, true);

// ---- Build ----
function pb57BuildHtml(p){
  const L = pbStages(p), who = pbFor(p);
  let st = pb57StageOf(p, ui.pb57Stage); if(!st){ st = L[0] || null; ui.pb57Stage = st ? st.id : null; }
  const others = pbAll().filter(function(x){ return x.id!==p.id && pbFor(x)===who; }), ends = pbRepeats(p) ? 'again' : p.next && pbById(p.next) ? p.next : '';
  const head = '<div class="pb6-head">'+
    '<input class="pb6-name" data-pb-f="name" value="'+escapeHtml(p.name)+'" maxlength="60" aria-label="Playbook name">'+
    '<label class="pb6-rule"><span>After the last stage</span><select class="input input-sm" data-pb-f="ends"><option value=""'+(ends==='' ? ' selected' : '')+'>It ends</option><option value="again"'+(ends==='again' ? ' selected' : '')+'>Back to the first stage</option>'+others.map(function(x){ return '<option value="'+x.id+'"'+(ends===x.id ? ' selected' : '')+'>On to '+escapeHtml(x.name)+'</option>'; }).join('')+'</select></label>'+
    (who==='lead' ? '<label class="pb6-rule"><span>Starts when a lead reaches</span><select class="input input-sm" data-pb-f="stage"><option value="">Only when you put them on</option>'+crmStages('lead').filter(function(s){ return s.kind!=='won' && s.kind!=='lost'; }).map(function(s){ return '<option value="'+s.id+'"'+(p.stage===s.id ? ' selected' : '')+'>'+escapeHtml(s.label)+'</option>'; }).join('')+'</select></label>' : '')+
    '<button class="pb6-del" data-action="pbDelete" data-id="'+p.id+'" title="Delete this playbook" aria-label="Delete this playbook">&#128465;</button></div>';
  const people = pbCountsFor(who).filter(function(x){ return x.pb && x.pb.id===p.id; });
  const pipe = '<div class="pb57-stages">'+L.map(function(s, i){
      const n = people.filter(function(x){ return pb57Where(x, p)===s; }).length;
      return '<button class="pb57-st'+(st && s.id===st.id ? ' is-on' : '')+'" data-action="pb57Stage" data-id="'+s.id+'" draggable="true" data-pb57-sdrag="'+s.id+'"><i>'+(i + 1)+'</i><span><b>'+escapeHtml(s.name)+'</b><small>'+(s.repeat==='month' ? 'Every month' : arr(s.steps).length+' step'+(arr(s.steps).length===1 ? '' : 's'))+(n ? ' · '+n+' on it' : '')+'</small></span></button>';
    }).join('')+'<button class="pb57-st is-add" data-action="pb57StageAdd" title="Add a stage">+</button></div>';
  const cal = ui.pb57Cal===true;
  const sw = '<div class="pb57-sw"><div class="seg-tabs seg-sm"><button class="seg-tab'+(cal ? '' : ' active')+'" data-action="pb57Cal" data-id="steps">Steps</button><button class="seg-tab'+(cal ? ' active' : '')+'" data-action="pb57Cal" data-id="cal">Calendar</button></div></div>';
  const body = !st ? '<div class="pb6-empty"><b>No stages yet</b><button class="btn btn-sm btn-primary" data-action="pb57StageAdd">+ Add a stage</button></div>' : cal ? pb57CalHtml(p, st) : pb57StepsHtml(p, st);
  const side = st && ui.pbItem && arr(st.steps).some(function(x){ return x.id===ui.pbItem; }) ? pb57StepPanel(p, st) : st && ui.pb57StageEdit ? pb57StagePanel(p, st) : pbOnHtml(p);
  const rows = st && cal ? Math.ceil((st.repeat==='month' ? 31 : Math.max(7, Number(st.days) || 7))/7) : 5;
  return '<div class="pb6-build pb57-build'+(cal ? ' is-cal' : '')+'" style="--rows:'+rows+'"><div class="pb6-main">'+head+pipe+sw+body+'</div>'+side+'</div>';
}
function pb57StepsHtml(p, st){
  const steps = arr(st.steps);
  return '<div class="pb57-list" data-pb57-list="'+st.id+'">'+
    '<div class="pb57-lh"><b>'+escapeHtml(st.name)+'</b><span>'+(st.repeat==='month' ? 'Every month' : 'About '+st.days+' day'+(st.days===1 ? '' : 's'))+(st.crm && crmStage(pbFor(p), st.crm) ? ' · mirrors '+escapeHtml(crmStage(pbFor(p), st.crm).label) : '')+'</span><button class="pb6-cedit" data-action="pb57StageEdit" title="Stage settings">&#9881;</button></div>'+
    steps.map(function(it){
      const ty = PB_TYPES[it.type] || PB_TYPES.task, n = arr(it.files).length + arr(it.links).filter(function(l){ return l.url; }).length;
      return '<button class="pb57-row'+(ui.pbItem===it.id ? ' is-on' : '')+'" style="--pbc:'+ty.color+'" data-action="pbItemPick" data-id="'+it.id+'" draggable="true" data-pb57-drag="'+it.id+'"><i>'+ty.icon+'</i><b>'+escapeHtml(it.title)+'</b><small>'+escapeHtml(ty.label)+'</small><span>'+escapeHtml(pb57RuleText(it, st))+'</span><em>'+(n ? '&#128206; '+n : '')+'</em></button>';
    }).join('')+
    '<button class="pb57-add" data-action="pb57StepAdd">+ Step</button></div>';
}
// the guide: the ideal month (or the stage's days), the posting days, and every stage's steps on their days
function pb57CalHtml(p, st){
  const len = st.repeat==='month' ? 31 : Math.max(7, Number(st.days) || 7), cols = 7, post = arr(p.postDays).map(String);
  const by = {}; arr(st.steps).forEach(function(it){
    if(it.due && it.due.rule==='week'){ for(let d = 1; d <= len; d++) if(String((d - 1) % 7 + 1)===String(it.due.dow==0 ? 7 : it.due.dow)) (by[d] = by[d] || []).push(it); return; }
    const d = !it.due || it.due.rule==='enter' ? 1 : it.due.rule==='day' ? Math.min(len, Number(it.due.n) || 1) : it.due.rule==='end' ? len : Math.max(1, len - (Number(it.due.n) || 0));
    (by[d] = by[d] || []).push(it);
  });
  let cells = '';
  for(let d = 1; d <= len; d++){
    const wd = String(d % 7 === 0 ? 0 : d % 7);   // (the guide starts on a Monday)
    cells += '<div class="pb6-day'+((by[d] || []).length ? ' has' : '')+(post.indexOf(wd) >= 0 ? ' is-post' : '')+'" data-pb57-day="'+d+'"><span class="pb6-dn">'+d+'</span>'+(by[d] || []).map(function(it){ const ty = PB_TYPES[it.type] || PB_TYPES.task; return '<button class="pb6-chip'+(ui.pbItem===it.id ? ' is-on' : '')+'" draggable="true" data-pb57-drag="'+it.id+'" data-action="pbItemPick" data-id="'+it.id+'" style="--pbc:'+ty.color+'"><i>'+ty.icon+'</i><span>'+escapeHtml(it.title)+'</span></button>'; }).join('')+'</div>';
  }
  const days = '<div class="pb57-post"><span>Posting days</span>'+PB_DOW.map(function(d){ return '<button class="'+(post.indexOf(d[0]) >= 0 ? 'is-on' : '')+'" data-action="pb57Post" data-id="'+d[0]+'">'+d[1].slice(0, 2)+'</button>'; }).join('')+'</div>';
  return days+'<div class="pb57-wk">'+PB_DOW.map(function(d){ return '<span>'+d[1]+'</span>'; }).join('')+'</div><div class="pb6-cal pb57-cal" style="--cols:'+cols+'">'+cells+'</div>';
}
function pb57StagePanel(p, st){
  const who = pbFor(p), i = pbStages(p).indexOf(st);
  return '<aside class="pb6-side pb57-sp"><div class="pb6-ih"><input class="pb6-it" data-pb57-sf="name" value="'+escapeHtml(st.name)+'" maxlength="50" aria-label="Stage name"><button class="pb6-x" data-action="pb57StageEdit" data-id="close" title="Close">&#10005;</button></div>'+
    '<div class="pb6-sec"><small>Mirrors</small><select class="input input-sm" data-pb57-sf="crm"><option value="">Nothing</option>'+crmStages(who).filter(function(s){ return s.kind!=='lost'; }).map(function(s){ return '<option value="'+s.id+'"'+(st.crm===s.id ? ' selected' : '')+'>'+escapeHtml(s.label)+(who==='lead' ? ' (Lead Center)' : ' (client stage)')+'</option>'; }).join('')+'</select></div>'+
    '<div class="pb6-sec"><small>Runs</small><div class="seg-tabs seg-sm"><button class="seg-tab'+(st.repeat==='month' ? '' : ' active')+'" data-action="pb57StageRep" data-id="once">Once</button><button class="seg-tab'+(st.repeat==='month' ? ' active' : '')+'" data-action="pb57StageRep" data-id="month">Every month</button></div></div>'+
    (st.repeat==='month' ? '' : '<div class="pb6-sec"><small>Usually takes</small><span class="pb6-dayin"><input class="input input-sm" type="number" min="1" max="120" data-pb57-sf="days" value="'+(Number(st.days) || 7)+'"> days</span></div>')+
    '<div class="pb6-if"><span class="pb57-mv"><button data-action="pb57StageMove" data-id="-1"'+(i <= 0 ? ' disabled' : '')+' aria-label="Earlier">&larr;</button><button data-action="pb57StageMove" data-id="1"'+(i >= pbStages(p).length - 1 ? ' disabled' : '')+' aria-label="Later">&rarr;</button></span><button class="pb6-idel" data-action="pb57StageDel">Delete stage</button></div></aside>';
}
function pb57StepPanel(p, st){
  const it = arr(st.steps).find(function(x){ return x.id===ui.pbItem; }); if(!it) return '';
  const f = function(k){ return 'data-pbi-f="'+k+'"'; }, ty = PB_TYPES[it.type] || PB_TYPES.task, d = it.due || {rule:'enter'};
  const rule = '<select class="input input-sm" data-pb57-rule="1">'+PB57_RULES.map(function(r){ return '<option value="'+r[0]+'"'+(d.rule===r[0] ? ' selected' : '')+'>'+r[1]+'</option>'; }).join('')+'</select>';
  const arg = d.rule==='day' || d.rule==='before' ? '<input class="input input-sm pb57-n" type="number" min="'+(d.rule==='day' ? 1 : 0)+'" max="'+(st.repeat==='month' ? 31 : Math.max(1, Number(st.days) || 7))+'" data-pb57-n="1" value="'+(Number(d.n) || (d.rule==='day' ? 1 : 0))+'">'
    : d.rule==='week' ? '<select class="input input-sm" data-pb57-dow="1">'+PB_DOW.map(function(x){ return '<option value="'+x[0]+'"'+(String(d.dow)===x[0] ? ' selected' : '')+'>'+x[1]+'</option>'; }).join('')+'</select>' : '';
  return '<aside class="pb6-side pb6-item" style="--pbc:'+ty.color+'">'+
    '<div class="pb6-ih"><input class="pb6-it" '+f('title')+' value="'+escapeHtml(it.title)+'" maxlength="90" aria-label="Step"><button class="pb6-x" data-action="pbItemClose" title="Close">&#10005;</button></div>'+
    '<div class="pb6-types">'+PB57_TYPES.map(function(k){ const t = PB_TYPES[k]; return '<button class="'+(it.type===k ? 'is-on' : '')+'" style="--pbc:'+t.color+'" data-action="pbItemType" data-id="'+k+'"><i>'+t.icon+'</i>'+t.label+'</button>'; }).join('')+'</div>'+
    '<div class="pb6-when pb57-when">'+rule+arg+(st.repeat==='month' ? '<select class="input input-sm" '+f('every')+'>'+[1, 2, 3, 6].map(function(n){ return '<option value="'+n+'"'+(Number(it.every || 1)===n ? ' selected' : '')+'>'+(n===1 ? 'every month' : 'every '+n+' months')+'</option>'; }).join('')+'</select>' : '')+'</div>'+
    '<div class="pb6-sec"><small>Checklist</small>'+arr(it.checklist).map(function(c){ return '<div class="pb6-li"><input class="input input-sm" data-pbi-cl="'+c.id+'" value="'+escapeHtml(c.t)+'"><button data-action="pbClDel" data-id="'+c.id+'" title="Remove">&#10005;</button></div>'; }).join('')+'<input class="input input-sm" id="pbClNew" placeholder="Add a line"></div>'+
    '<div class="pb6-sec"><small>Files</small>'+pb57FilesHtml(p, it, true)+'</div>'+
    '<div class="pb6-sec"><small>Links</small>'+arr(it.links).map(function(l, i){ return '<div class="pb6-lk"><input class="input input-sm" data-pbi-lk="'+i+':label" value="'+escapeHtml(l.label || '')+'" placeholder="Name"><input class="input input-sm" data-pbi-lk="'+i+':url" value="'+escapeHtml(l.url || '')+'" placeholder="https://"><button data-action="pbLkDel" data-id="'+i+'" title="Remove">&#10005;</button></div>'; }).join('')+'<button class="pb6-more" data-action="pbLkAdd">+ Link</button></div>'+
    '<div class="pb6-sec"><small>Notes</small><textarea class="input input-sm" rows="3" '+f('notes')+'>'+escapeHtml(it.notes || '')+'</textarea></div>'+
    '<div class="pb6-if"><button class="pb6-idel" data-action="pbItemDel">Delete</button><button class="btn btn-sm btn-primary" data-action="pbItemClose">Done</button></div>'+
  '</aside>';
}
// the step being edited is in the open stage (the old item actions read pbCur())
pbCur = function(){ const p = pbSel(), st = p ? pb57StageOf(p, ui.pb57Stage) || pbStages(p)[0] : null; return {p:p, st:st, it:st ? arr(st.steps).find(function(x){ return x.id===ui.pbItem; }) : null}; };
ACTIONS.pbItemDel = function(){ const c = pbCur(); if(!c.it) return; c.st.steps = c.st.steps.filter(function(x){ return x!==c.it; }); ui.pbItem = null; pbSave(); renderView(); };
ACTIONS.pbItemRep = function(){};
ACTIONS.pb6View = function(el, e, v){ ui.pbView = v; ui.pbItem = null; ui.pb57StageEdit = false; playTick(); renderView(); };
ACTIONS.pb6Who = function(el, e, v){ ui.pbWho = v; ui.pbSel = null; ui.pbItem = null; playTick(); renderView(); };
ACTIONS.pbPick = function(el, e, id){ ui.pbSel = id; ui.pbItem = null; ui.pb57Stage = null; ui.pb57StageEdit = false; playTick(); renderView(); };
ACTIONS.pb6Build = function(el, e, id){ ui.pbSel = id; ui.pbView = 'build'; ui.pbItem = null; renderView(); };
ACTIONS.pbEdit = function(el, e, id){ if(typeof closeClientModal==='function' && overlayOpen('clientModalOverlay')) closeClientModal(); if(overlayOpen('contactOverlay')) hideOverlay('contactOverlay'); const p = pbById(id); if(p){ ui.pbSel = p.id; ui.pbWho = pbFor(p); } ui.pbItem = null; ui.pbView = p ? 'build' : 'board'; ui.view = 'business'; ui.businessTab = 'lifecycle'; renderView(); };
ACTIONS.pb57Stage = function(el, e, id){ ui.pb57Stage = id; ui.pbItem = null; ui.pb57StageEdit = false; playTick(); renderView(); };
ACTIONS.pb57StageEdit = function(el, e, v){ ui.pb57StageEdit = v==='close' ? false : !ui.pb57StageEdit; ui.pbItem = null; renderView(); };
ACTIONS.pb57Cal = function(el, e, v){ ui.pb57Cal = v==='cal'; playTick(); renderView(); };
ACTIONS.pb57StageAdd = function(){ const p = pbSel(); if(!p) return; const s = pb57Stage('New stage'); pbStages(p).push(s); ui.pb57Stage = s.id; ui.pb57StageEdit = true; ui.pbItem = null; pbSave(); renderView(); setTimeout(function(){ const i = document.querySelector('[data-pb57-sf="name"]'); if(i){ i.focus(); i.select(); } }, 60); };
ACTIONS.pb57StageRep = function(el, e, v){ const c = pbCur(); if(!c.st) return; c.st.repeat = v==='month' ? 'month' : null; pbSave(); renderView(); };
ACTIONS.pb57StageMove = function(el, e, d){ const c = pbCur(); if(!c.st) return; const L = pbStages(c.p), i = L.indexOf(c.st), j = i + Number(d); if(j < 0 || j >= L.length) return; L.splice(i, 1); L.splice(j, 0, c.st); pbSave(); renderView(); };
ACTIONS.pb57StageDel = function(){
  const c = pbCur(); if(!c.st) return; const L = pbStages(c.p), on = pbCountsFor(pbFor(c.p)).filter(function(x){ return x.pb && x.pb.id===c.p.id && x.pb.stage===c.st.id; });
  uiConfirm({title:'Delete '+c.st.name+'?', text:on.length ? on.length+' '+(on.length===1 ? 'is' : 'are')+' on it: they go to '+((L[L.indexOf(c.st) + 1] || L[L.indexOf(c.st) - 1] || {}).name || 'no stage')+', and its open steps come off your list.' : arr(c.st.steps).length+' step'+(arr(c.st.steps).length===1 ? '' : 's')+' go with it.', ok:'Delete', danger:true}).then(function(yes){
    if(!yes) return;
    const i = L.indexOf(c.st), to = L[i + 1] || L[i - 1] || null;
    state.tasks.items = state.tasks.items.filter(function(t){ return !(t.master && t.master.kind==='pb' && t.master.stage===c.st.id && t.status!=='done'); });
    L.splice(i, 1);
    on.forEach(function(x){ x.pb.stage = to ? to.id : null; x.pb.enteredAt = todayStr(); x.pb.seq = (Number(x.pb.seq) || 0) + 1; });
    ui.pb57Stage = to ? to.id : null; ui.pb57StageEdit = false; persist('tasks'); pbSave(); renderView();
  });
};
ACTIONS.pb57StepAdd = function(){ const c = pbCur(); if(!c.st) return; const it = pb57Step('New step', 'task', {rule:'enter'}); c.st.steps.push(it); ui.pbItem = it.id; ui.pb57StageEdit = false; pbSave(); renderView(); setTimeout(function(){ const i = document.querySelector('.pb6-it'); if(i){ i.focus(); i.select(); } }, 60); };
ACTIONS.pbAdd = function(el, e, d){ ACTIONS.pb57StepAdd(); const c = pbCur(); if(c.it && Number(d) > 1){ c.it.due = {rule:'day', n:Number(d)}; pbSave(); renderView(); } };
ACTIONS.pb6AddWeek = function(el, e, dow){ ACTIONS.pb57StepAdd(); const c = pbCur(); if(c.it){ c.it.due = {rule:'week', dow:Number(dow)}; pbSave(); renderView(); } };
ACTIONS.pb57Post = function(el, e, d){ const p = pbSel(); if(!p) return; const L = arr(p.postDays).map(String); p.postDays = L.indexOf(String(d)) >= 0 ? L.filter(function(x){ return x!==String(d); }) : L.concat([String(d)]); playTick(); pbSave(); renderView(); };
document.addEventListener('change', function(e){
  const t = e.target; if(!t || !t.getAttribute) return;
  const c = pbCur(); if(!c.p) return;
  if(t.hasAttribute('data-pb57-sf') && c.st){
    const k = t.getAttribute('data-pb57-sf');
    if(k==='name') c.st.name = t.value.trim() || c.st.name;
    else if(k==='crm') c.st.crm = t.value || null;
    else if(k==='days') c.st.days = Math.max(1, Math.min(120, Math.round(Number(t.value) || 7)));
    e.stopImmediatePropagation(); pbSave(); renderView(); return;
  }
  if(!c.it) return;
  if(t.hasAttribute('data-pb57-rule')){ const r = t.value; c.it.due = r==='day' ? {rule:'day', n:1} : r==='before' ? {rule:'before', n:3} : r==='week' ? {rule:'week', dow:5} : {rule:r}; e.stopImmediatePropagation(); pbSave(); renderView(); return; }
  if(t.hasAttribute('data-pb57-n')){ c.it.due = Object.assign({}, c.it.due, {n:Math.max(0, Math.round(Number(t.value) || 0))}); e.stopImmediatePropagation(); pbSave(); renderView(); return; }
  if(t.hasAttribute('data-pb57-dow')){ c.it.due = {rule:'week', dow:Number(t.value)}; e.stopImmediatePropagation(); pbSave(); renderView(); return; }
}, true);
// the date they got to this stage (Since): the first stage's is the playbook's day 1
document.addEventListener('change', function(e){
  const t = e.target; if(!t || !t.getAttribute || !t.hasAttribute('data-pb-start')) return;
  const q = t.getAttribute('data-pb-start').split(':'), x = crmFind(q[0], q[1]); if(!x || !x.pb || !/^\d{4}-\d{2}-\d{2}$/.test(t.value)) return;
  e.stopImmediatePropagation();
  if(Number(x.pb.seq)) x.pb.enteredAt = t.value; else { x.pb.start = t.value; x.pb.enteredAt = t.value; if(q[0]==='client' && !x.startDate) x.startDate = t.value; }
  persist('business'); try{ masterTasksSync(); }catch(err){} renderView(); try{ rerenderContactModal(); renderClientModalInto(); }catch(err){}
}, true);
// the old item-panel edits (title, notes, checklist, links, every) still land on the open step
document.addEventListener('change', function(e){
  const t = e.target; if(!t || !t.getAttribute || !t.closest || !t.closest('.pb57')) return;
  if(t.hasAttribute('data-pb-f')){
    const p = pbSel(); if(!p) return; const k = t.getAttribute('data-pb-f');
    if(k==='name') p.name = t.value.trim() || p.name;
    else if(k==='ends'){ p.repeats = t.value==='again'; p.next = t.value && t.value!=='again' ? t.value : null; pbKindSync(p); }
    else if(k==='stage') p.stage = t.value || null;
    e.stopImmediatePropagation(); pbSave(); renderView(); return;
  }
  const c = pbCur(); if(!c.it) return;
  if(t.hasAttribute('data-pbi-f')){
    const k = t.getAttribute('data-pbi-f');
    if(k==='title') c.it.title = t.value.trim() || 'Untitled';
    else if(k==='every') c.it.every = Number(t.value) || 1;
    else if(k==='notes') c.it.notes = t.value;
    e.stopImmediatePropagation(); pbSave(); renderView(); return;
  }
  if(t.hasAttribute('data-pbi-cl')){ const r = arr(c.it.checklist).find(function(x){ return x.id===t.getAttribute('data-pbi-cl'); }); if(r){ r.t = t.value.trim(); if(!r.t) c.it.checklist = c.it.checklist.filter(function(x){ return x!==r; }); } e.stopImmediatePropagation(); pbSave(); renderView(); return; }
  if(t.hasAttribute('data-pbi-lk')){ const q = t.getAttribute('data-pbi-lk').split(':'), l = arr(c.it.links)[Number(q[0])]; if(l){ l[q[1]] = t.value.trim(); pbSave(); } e.stopImmediatePropagation(); return; }
}, true);
// drag a step onto a day of the guide (it's due that day), or reorder steps in the list; drag a stage to reorder
document.addEventListener('dragstart', function(e){
  const c = e.target.closest && e.target.closest('[data-pb57-drag], [data-pb57-sdrag]'); if(!c) return;
  if(c.hasAttribute('data-pb57-drag')) e.dataTransfer.setData('text/pb57', c.getAttribute('data-pb57-drag')); else e.dataTransfer.setData('text/pb57s', c.getAttribute('data-pb57-sdrag'));
  e.dataTransfer.effectAllowed = 'move'; c.classList.add('is-drag'); e.stopImmediatePropagation();
}, true);
document.addEventListener('dragend', function(e){ const c = e.target.closest && e.target.closest('[data-pb57-drag], [data-pb57-sdrag]'); if(c) c.classList.remove('is-drag'); document.querySelectorAll('.pb57 .is-over').forEach(function(d){ d.classList.remove('is-over'); }); });
document.addEventListener('dragover', function(e){
  const types = Array.from(e.dataTransfer.types || []);
  const d = e.target.closest && e.target.closest(types.includes('text/pb57s') ? '.pb57-st' : '[data-pb57-day], .pb57-row'); if(!d || !(types.includes('text/pb57') || types.includes('text/pb57s'))) return;
  e.preventDefault(); document.querySelectorAll('.pb57 .is-over').forEach(function(x){ if(x!==d) x.classList.remove('is-over'); }); d.classList.add('is-over');
});
document.addEventListener('drop', function(e){
  const c = pbCur(); if(!c.p) return;
  const sid = e.dataTransfer.getData('text/pb57s');
  if(sid){ const d = e.target.closest && e.target.closest('.pb57-st'); if(!d) return; e.preventDefault(); const L = pbStages(c.p), a = L.findIndex(function(s){ return s.id===sid; }), b = L.findIndex(function(s){ return s.id===d.getAttribute('data-id'); }); if(a < 0 || b < 0 || a===b) return; const s = L.splice(a, 1)[0]; L.splice(b, 0, s); pbSave(); playTick(); renderView(); return; }
  const id = e.dataTransfer.getData('text/pb57'); if(!id || !c.st) return;
  const it = arr(c.st.steps).find(function(x){ return x.id===id; }); if(!it) return;
  const day = e.target.closest && e.target.closest('[data-pb57-day]'), row = e.target.closest && e.target.closest('.pb57-row');
  if(day){ e.preventDefault(); const n = Number(day.getAttribute('data-pb57-day')) || 1, len = c.st.repeat==='month' ? 31 : Math.max(7, Number(c.st.days) || 7); it.due = n===1 ? {rule:'enter'} : n===len ? {rule:'end'} : {rule:'day', n:n}; pbSave(); playTick(); renderView(); return; }
  if(row){ e.preventDefault(); const L = c.st.steps, a = L.indexOf(it), b = L.findIndex(function(x){ return x.id===row.getAttribute('data-id'); }); if(a < 0 || b < 0 || a===b) return; L.splice(a, 1); L.splice(b, 0, it); pbSave(); playTick(); renderView(); }
});

// ---- a new playbook: name, for, its stages (copied from the Lead Center / client stages, or none) and the end ----
pb6NewHtml = function(){
  const N = ui.pb6New || (ui.pb6New = {for:'client', mirror:true, ends:''});
  const others = pbAll().filter(function(x){ return pbFor(x)===N.for; });
  return asHead('&#9776;', 'New playbook')+
    '<div class="pb6-nf"><label>Name</label><input class="input" id="pb6NewName" maxlength="60" value="'+escapeHtml(N.name || '')+'"></div>'+
    '<div class="pb6-nf"><label>For</label><div class="seg-tabs seg-sm"><button class="seg-tab'+(N.for==='client' ? ' active' : '')+'" data-action="pb6NewSet" data-id="for:client">Clients</button><button class="seg-tab'+(N.for==='lead' ? ' active' : '')+'" data-action="pb6NewSet" data-id="for:lead">Leads</button></div></div>'+
    '<div class="pb6-nf"><label>Stages</label><div class="seg-tabs seg-sm"><button class="seg-tab'+(N.mirror!==false ? ' active' : '')+'" data-action="pb6NewSet" data-id="mirror:1">'+(N.for==='lead' ? 'Lead Center stages' : 'Client stages')+'</button><button class="seg-tab'+(N.mirror===false ? ' active' : '')+'" data-action="pb6NewSet" data-id="mirror:0">My own</button></div></div>'+
    '<div class="pb6-nf"><label>After the last stage</label><select class="input" id="pb6NewEnds"><option value="">It ends</option><option value="again"'+(N.ends==='again' ? ' selected' : '')+'>Back to the first stage</option>'+others.map(function(x){ return '<option value="'+x.id+'"'+(N.ends===x.id ? ' selected' : '')+'>On to '+escapeHtml(x.name)+'</option>'; }).join('')+'</select></div>'+
    '<div class="as-f"><button class="btn btn-primary hs-go" data-action="pb6Create">Make it</button></div>';
};
pb6NewRead = function(){ const N = ui.pb6New || {}; const n = document.getElementById('pb6NewName'), e = document.getElementById('pb6NewEnds'); if(n) N.name = n.value; if(e) N.ends = e.value; return N; };
ACTIONS.pb6NewOpen = function(el, e, who){ ui.pb6New = {for:who==='lead' ? 'lead' : who==='client' ? 'client' : (ui.pbWho==='lead' ? 'lead' : 'client'), mirror:true, ends:''}; addSheetOpen('pb6NewSheet', pb6NewHtml, 'pb6NewName'); const n = document.getElementById('pb6NewName'); if(n) n.value = ''; const en = document.getElementById('pb6NewEnds'); if(en) en.value = ''; };
ACTIONS.pb6NewSet = function(el, e, v){ const N = pb6NewRead(), q = String(v).split(':'); if(q[0]==='for'){ N.for = q[1]; N.ends = ''; } else if(q[0]==='mirror') N.mirror = q[1]==='1'; playTick(); addSheetRefresh('pb6NewSheet'); };
ACTIONS.pb6Create = function(){
  const N = pb6NewRead(), name = String(N.name || '').trim();
  if(!name){ const i = document.getElementById('pb6NewName'); if(i) i.focus(); return; }
  const p = pbNew(N.for==='lead' ? 'lead' : 'client', name, 30, {for:N.for, repeats:N.ends==='again', next:N.ends && N.ends!=='again' ? N.ends : null});
  p.stages = N.mirror===false ? [pb57Stage(N.for==='lead' ? 'First touch' : 'Onboarding')] : crmStages(N.for).filter(function(s){ return N.for==='lead' ? s.kind!=='won' && s.kind!=='lost' : s.active!==false; }).map(function(s){ return pb57Stage(s.label, {crm:s.id}); });
  if(!p.stages.length) p.stages = [pb57Stage('Stage 1')];
  p.postDays = [];
  pbAll().push(p); ui.pbSel = p.id; ui.pbView = 'build'; ui.pbItem = null; ui.pbWho = N.for; ui.pb57Stage = p.stages[0].id; ui.pb57StageEdit = false;
  addSheetClose('pb6NewSheet'); pbSave(); playPositive(); renderView();
};
// someone put on a playbook starts on the stage that mirrors where they are (else the first)
// (their first day there: a monthly stage runs from their start date, so their month is their billing month; any
// other stage counts from their start date if that's still inside its usual length, otherwise from today)
pbDay1 = function(kind, x, p){
  const today = todayStr(), s = kind==='client' ? x.startDate : (x.createdAt || null), L = pbStages(p);
  const st = (x.stage && L.find(function(q){ return q.crm===x.stage; })) || L[0];
  if(!s || !/^\d{4}-\d{2}-\d{2}$/.test(s) || s > today || !st) return today;
  if(st.repeat==='month') return s;
  return pbDaysBetween(s, today) < (Number(st.days) || 7) ? s : today;
};

// ---- the sales call: frame what they want before the price ----
// (a playbook step whose name says it's the sales / discovery call carries the framing in its checklist)
const PB57_SALES_FRAME = ['Ask what they want: the result, not the deliverable', 'How often, how consistent (posts a week, months)', 'Play it back: what that’s worth to them', 'Only then name the monthly price'];
function pb57SalesFrame(st){
  if(!st || !/sales|discovery|closing/i.test(st.title || '') || st.salesFramed) return false;
  st.checklist = arr(st.checklist).concat(PB57_SALES_FRAME.map(function(t){ return {id:uid(), t:t}; })); st.salesFramed = true; return true;
}
setTimeout(function(){
  try{
    if(!state || !state.business) return; let ch = false;
    pbAll().forEach(function(p){ if(pb57Migrate(p)) ch = true; pbStages(p).forEach(function(s){ arr(s.steps).forEach(function(st){ if(pb57SalesFrame(st)) ch = true; }); }); });
    if(ch){ persist('business'); try{ masterTasksSync(); }catch(e){} }
  }catch(e){}
}, 0);
