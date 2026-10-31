// ============ OP RUNS THE APP, AND STAYS ON YOU ALL DAY (round 30) ============
// Op can do almost anything you can in the app now: finish, reopen, change, delete and reorder tasks,
// say what's next, put follow-ups on clients and leads, add a lead and move it along, write in the
// journal, log food, add video ideas, start a break, open the lock-out, play the music, set your alarm,
// clock in and out, open any page. Two things stay yours: Social, and anything with real consequences
// out in the world (sending messages, posting, paying, moving money).
// He's also your accountability partner all day, not only in work hours: every hour or so, when you're
// not locked in, he presses you. One thing at a time, the thing that matters now (never your list read
// back), and now and then something older that's still hanging, like a note from a client log.

// ---- what he's told about how to use it ----
aiSystem = (function(base){
  return function(){
    const s = base.apply(this, arguments);
    if(Array.isArray(s)) s.push({type:'text', text:
      'More on how you work (round 30):\n'+
      '- You can run most of the app for him with your tools: finish, reopen, edit, delete and reorder tasks, set what’s next, set follow-ups on clients and leads, add a lead and move it along, write journal entries, log food, weight and workouts, add video ideas, start a break, open the lock-out, play or stop the music, set his wake-up alarm, clock in or out, open any page or your own full screen. Do it when he asks or clearly agrees, then say it in a few words. Never touch Social, and never send messages, post, pay or move money: he does those himself.\n'+
      '- When you bring up what’s on his plate, bring up ONE thing: what matters right now. Never read his list back or list his tasks unless he asks for the list. Keep it current and relevant; now and then it’s fine to raise something older that’s still hanging (a client who said something worth following up, a lead gone quiet).\n'+
      '- You are his accountability partner all day, not only in work hours. Press him: ask what he’s doing, hold him to what he said he’d do, call it when he’s drifting, and offer to do the thing for him (lock him in, start the task, set the reminder). Pushy, with grace and humor, never preachy.'});
    return s;
  };
})(aiSystem);

// ---- the tools ----
const OPC_TASK = {type:'string', description:'part of the task’s title'};
OP_TOOLS.push(
  {name:'complete_task', description:'Mark a task done (by part of its title).', input_schema:{type:'object', properties:{task:OPC_TASK}, required:['task'], additionalProperties:false}},
  {name:'reopen_task', description:'Bring a finished task back (by part of its title).', input_schema:{type:'object', properties:{task:OPC_TASK, list:{type:'string', enum:['today', 'later']}}, required:['task'], additionalProperties:false}},
  {name:'update_task', description:'Change a task: its title, deadline, priority, notes, or move it between today and later (the backlog).', input_schema:{type:'object', properties:{task:OPC_TASK, title:{type:'string'}, deadline:{type:'string', description:'YYYY-MM-DD, or "none" to clear it'}, priority:{type:'string', enum:['low', 'med', 'high']}, list:{type:'string', enum:['today', 'later']}, notes:{type:'string'}}, required:['task'], additionalProperties:false}},
  {name:'delete_task', description:'Delete a task (only when he clearly asks). He gets an Undo.', input_schema:{type:'object', properties:{task:OPC_TASK}, required:['task'], additionalProperties:false}},
  {name:'arrange_tasks', description:'Put today’s tasks in an order (first = do it first). List titles or parts of titles; anything left out keeps its place after them. Tasks named that aren’t on today get pulled onto today.', input_schema:{type:'object', properties:{order:{type:'array', items:{type:'string'}}}, required:['order'], additionalProperties:false}},
  {name:'set_next_task', description:'Make a task the next one up (pulled onto today if needed).', input_schema:{type:'object', properties:{task:OPC_TASK}, required:['task'], additionalProperties:false}},
  {name:'done_reminder', description:'Mark one of his reminders done (by part of its label).', input_schema:{type:'object', properties:{label_contains:{type:'string'}}, required:['label_contains'], additionalProperties:false}},
  {name:'set_follow_up', description:'Set (or clear, with date "none") a follow-up reminder on a client or lead.', input_schema:{type:'object', properties:{who:{type:'string'}, date:{type:'string', description:'YYYY-MM-DD or "none"'}, note:{type:'string'}}, required:['who', 'date'], additionalProperties:false}},
  {name:'add_lead', description:'Add a lead to the pipeline.', input_schema:{type:'object', properties:{name:{type:'string'}, company:{type:'string'}, value:{type:'number', description:'what they’d pay a month'}, note:{type:'string'}, follow_up:OP_DATE}, required:['name'], additionalProperties:false}},
  {name:'move_lead', description:'Move a lead to a stage of the pipeline.', input_schema:{type:'object', properties:{who:{type:'string'}, stage:{type:'string', enum:PIPELINE_STAGES.slice()}}, required:['who', 'stage'], additionalProperties:false}},
  {name:'add_journal', description:'Write an entry in his journal (his words, or a note he asked you to keep). Use tag "update" for notes about changes to the app (App updates, improvements, bugs he reports).', input_schema:{type:'object', properties:{text:{type:'string'}, title:{type:'string'}, tag:{type:'string', enum:['update']}}, required:['text'], additionalProperties:false}},
  {name:'log_food', description:'Log something he ate, with its calories (estimate sensibly if he doesn’t say).', input_schema:{type:'object', properties:{name:{type:'string'}, calories:{type:'integer'}, date:OP_DATE}, required:['name', 'calories'], additionalProperties:false}},
  {name:'add_video_idea', description:'Add a content video idea.', input_schema:{type:'object', properties:{title:{type:'string'}, notes:{type:'string'}}, required:['title'], additionalProperties:false}},
  {name:'take_break', description:'Start a break in his locked-in session.', input_schema:{type:'object', properties:{minutes:{type:'integer'}}, additionalProperties:false}},
  {name:'lock_out', description:'Open the lock-out for his session (he confirms it).', input_schema:{type:'object', properties:{}, additionalProperties:false}},
  {name:'clock', description:'Clock him in for the work day, or out (clocking out starts the wind-down).', input_schema:{type:'object', properties:{action:{type:'string', enum:['in', 'out']}}, required:['action'], additionalProperties:false}},
  {name:'music', description:'Play, stop or skip the app’s music.', input_schema:{type:'object', properties:{action:{type:'string', enum:['play', 'stop', 'next']}}, required:['action'], additionalProperties:false}},
  {name:'set_wake_alarm', description:'Set his wake-up alarm time (and turn it on or off).', input_schema:{type:'object', properties:{time:{type:'string', description:'HH:MM, 24-hour'}, on:{type:'boolean'}}, additionalProperties:false}}
);
// (more pages to open)
(function(){ const t = OP_TOOLS.find(function(x){ return x.name==='open_page'; }); if(t) ['recap', 'xp', 'projected', 'operator', 'notifications'].forEach(function(p){ t.input_schema.properties.page.enum.push(p); }); })();
// the ones that change things (these are what Op's full screen shows him doing)
const OP_ACTION_TOOLS = ['add_task', 'add_event', 'set_reminder', 'log_workout', 'log_weight', 'add_goal', 'complete_goal', 'add_client_note', 'log_touch', 'complete_task', 'reopen_task', 'update_task', 'delete_task', 'arrange_tasks', 'set_next_task', 'done_reminder', 'set_follow_up', 'add_lead', 'move_lead', 'add_journal', 'log_food', 'add_video_idea', 'set_wake_alarm'];
const OP_NAV_TOOLS = ['open_page', 'lock_in', 'start_task', 'start_reset', 'take_break', 'lock_out', 'clock'];
function opcFindAny(q){
  const w = String(q||'').toLowerCase().trim(); if(!w) return null;
  return opFindTask(w) || state.tasks.items.find(function(t){ return t.title.toLowerCase().indexOf(w) >= 0; }) || null;
}
function opcNeedTask(q){ const t = opFindTask(q); if(!t) throw new Error('no open task matches "'+q+'"'); return t; }
const opcYmd = function(s){ return /^\d{4}-\d{2}-\d{2}$/.test(String(s||'')); };
opRunTool = (function(base){
  return function(name, x){
    x = x || {};
    switch(name){
      case 'complete_task': {
        const t = opcNeedTask(x.task);
        completeTask(t.id);
        return 'done: '+t.title;
      }
      case 'reopen_task': {
        const w = String(x.task||'').toLowerCase();
        const t = state.tasks.items.filter(function(t){ return t.status==='done' && t.title.toLowerCase().indexOf(w) >= 0; }).sort(function(a, b){ return String(b.completedAt||'').localeCompare(String(a.completedAt||'')); })[0];
        if(!t) throw new Error('no finished task matches "'+x.task+'"');
        t.status = x.list==='later' ? 'backlog' : 'today'; t.completedAt = null; persist('tasks');
        return 'reopened: '+t.title+' ('+(t.status==='today' ? 'today' : 'later')+')';
      }
      case 'update_task': {
        const t = opcNeedTask(x.task), did = [];
        if(x.title){ t.title = String(x.title).slice(0, 200); did.push('renamed'); }
        if(x.deadline){ if(x.deadline==='none'){ t.deadline = null; did.push('no deadline'); } else { if(!opcYmd(x.deadline)) throw new Error('deadline must be YYYY-MM-DD'); t.deadline = x.deadline; did.push('due '+x.deadline); } }
        if(x.priority){ t.priority = x.priority; did.push(x.priority+' priority'); }
        if(x.notes!=null){ t.notes = String(x.notes).slice(0, 2000); did.push('notes'); }
        if(x.list){ if(x.list==='later'){ if(ui.currentTaskId===t.id) accumulateCurrentTaskTime(t.id); t.status = 'backlog'; } else t.status = 'today'; did.push(x.list==='later' ? 'moved to later' : 'on today'); }
        persist('tasks'); return t.title+': '+(did.join(', ') || 'nothing changed');
      }
      case 'delete_task': {
        const t = opcFindAny(x.task); if(!t) throw new Error('no task matches "'+x.task+'"');
        const i = state.tasks.items.indexOf(t); state.tasks.items.splice(i, 1);
        if(ui.currentTaskId===t.id) ui.currentTaskId = null;
        ui._opDeleted = {t:t, i:i}; persist('tasks');
        setTimeout(function(){ showToast('Op deleted “'+t.title+'”.', {icon:'&#128465;', actionLabel:'Undo', actionAction:'opUndoDelete', duration:12000}); }, 200);
        return 'deleted: '+t.title;
      }
      case 'arrange_tasks': {
        const order = arr(x.order), ids = [];
        order.forEach(function(q){ const t = opFindTask(q); if(t && ids.indexOf(t.id) < 0){ if(t.status!=='today') t.status = 'today'; ids.push(t.id); } });
        if(!ids.length) throw new Error('none of those match an open task');
        const rest = lineupOrdered(state.tasks.items.filter(function(t){ return t.status==='today' && ids.indexOf(t.id) < 0; })).map(function(t){ return t.id; });
        state.focus.lineupOrder = ids.concat(rest);
        const np = state.focus.nightPlan; if(np && np.date===todayStr()) np.taskIds = ids.concat(arr(np.taskIds).filter(function(id){ return ids.indexOf(id) < 0; }));
        persist('tasks'); persist('focus');
        return 'today, in order: '+state.focus.lineupOrder.map(function(id){ return (state.tasks.items.find(function(t){ return t.id===id; }) || {}).title; }).filter(Boolean).join('; ');
      }
      case 'set_next_task': {
        const t = opcNeedTask(x.task); if(t.status!=='today'){ t.status = 'today'; persist('tasks'); }
        state.focus.nextTaskId = t.id;
        const o = arr(state.focus.lineupOrder).filter(function(id){ return id!==t.id; }); const cur = ui.currentTaskId ? o.indexOf(ui.currentTaskId) : -1; o.splice(cur + 1, 0, t.id); state.focus.lineupOrder = o;
        persist('focus'); return 'up next: '+t.title;
      }
      case 'done_reminder': {
        const w = String(x.label_contains||'').toLowerCase(), r = arr(state.focus.reminders).find(function(r){ return !r.done && String(r.label||'').toLowerCase().indexOf(w) >= 0; });
        if(!r) throw new Error('no open reminder matches "'+x.label_contains+'"');
        r.done = true; persist('focus'); return 'done: '+r.label;
      }
      case 'set_follow_up': {
        const hit = opFindContact(x.who); if(!hit) throw new Error('no client or lead matches "'+x.who+'"');
        if(x.date!=='none' && !opcYmd(x.date)) throw new Error('date must be YYYY-MM-DD or "none"');
        setFollowUp(hit.kind, hit.x.id, x.date==='none' ? null : x.date, x.note || '');
        return x.date==='none' ? 'follow-up cleared on '+crmName(hit.kind, hit.x) : 'follow-up with '+crmName(hit.kind, hit.x)+' on '+x.date;
      }
      case 'add_lead': {
        if(x.follow_up && !opcYmd(x.follow_up)) throw new Error('follow_up must be YYYY-MM-DD');
        const l = {id:uid(), name:String(x.name||'').slice(0, 120), company:String(x.company||'').slice(0, 120), trade:'', phone:'', value:Number(x.value)||0, nextFollowUp:null, leadSource:null, stage:'lead', notes:x.note ? todayStr()+': '+String(x.note).slice(0, 1000) : '', createdAt:todayStr()};
        if(x.follow_up) l.followUp = {date:x.follow_up, note:'', set:Date.now()};
        state.business.pipeline.push(l); persist('business'); return 'lead added: '+(l.company || l.name);
      }
      case 'move_lead': {
        const hit = opFindContact(x.who); if(!hit || hit.kind!=='lead') throw new Error('no lead matches "'+x.who+'"');
        if(PIPELINE_STAGES.indexOf(x.stage) < 0) throw new Error('unknown stage');
        hit.x.stage = x.stage; if(typeof crmTimeline==='function') crmTimeline(hit.x, 'stage', 'Op moved it to '+x.stage);
        persist('business'); return crmName('lead', hit.x)+' is now at '+x.stage;
      }
      case 'add_journal': {
        const e = {id:uid(), date:todayStr(), timestamp:Date.now(), text:String(x.text||'').slice(0, 6000), title:String(x.title||'').slice(0, 120), type:'freeform', mood:null, pinned:false, photos:[]};
        if(!e.text) throw new Error('missing text');
        // (round 57: a tag files it where it belongs; "update" goes under the Updates type, with its emoji)
        if(String(x.tag||'').toLowerCase()==='update'){ let tid = updatesTypeId(); if(!tid){ try{ ACTIONS.createUpdatesType(); }catch(err){} tid = updatesTypeId(); } if(tid) e.mood = tid; }
        state.journal.entries.push(e); persist('journal');
        try{ showToast((x.tag ? 'Logged under '+x.tag+': ' : 'Journal: ')+(e.title || e.text.slice(0, 48)), {icon:'&#128221;', duration:5000}); }catch(err){}
        return x.tag ? 'filed under '+x.tag : 'in the journal';
      }
      case 'log_food': {
        const c = Math.round(Number(x.calories)); if(!(c > 0)) throw new Error('calories must be a number');
        if(x.date && !opcYmd(x.date)) throw new Error('date must be YYYY-MM-DD');
        state.health.calorieEntries.push({id:uid(), date:x.date || todayStr(), name:String(x.name||'Food').slice(0, 80), calories:c}); persist('health');
        const tot = state.health.calorieEntries.filter(function(e){ return e.date===(x.date || todayStr()); }).reduce(function(a, e){ return a + (Number(e.calories)||0); }, 0);
        return 'logged '+c+' cal ('+tot+' today)';
      }
      case 'add_video_idea': {
        const t = {id:uid(), title:String(x.title||'').slice(0, 200), client:'personal', clients:['personal'], priority:'med', deadline:null, notes:String(x.notes||''), status:'backlog', ongoing:false, ongoingDeadline:null, ongoingFrequency:null, includeInStandard:false, categoryId:null, isVideoIdea:true, videoType:null, createdAt:todayStr(), completedAt:null};
        if(!t.title) throw new Error('missing title');
        state.tasks.items.push(t); persist('tasks'); return 'video idea added: '+t.title;
      }
      case 'take_break': {
        if(!state.focus.activeSession) return 'he isn’t locked in';
        if(state.focus.activeSession.onBreak) return 'already on a break';
        actuallyStartBreak(Number(x.minutes) > 0 ? Math.round(Number(x.minutes)) : 10); return 'break started';
      }
      case 'lock_out': {
        if(!state.focus.activeSession) return 'he isn’t locked in';
        setTimeout(function(){ if(ACTIONS.openStopFocus) ACTIONS.openStopFocus(); }, 400); return 'the lock-out is open for him to confirm';
      }
      case 'clock': {
        if(x.action==='in'){ setTimeout(function(){ if(ACTIONS.clockIn) ACTIONS.clockIn(); }, 300); return 'clocking in'; }
        if(state.focus.activeSession) return 'he has to lock out first';
        setTimeout(function(){ if(ACTIONS.clockOut) ACTIONS.clockOut(); }, 300); return 'clocking out (wind-down)';
      }
      case 'music': {
        if(x.action==='stop'){ if(typeof focusMusicStop==='function') focusMusicStop(); return 'music off'; }
        if(x.action==='next'){ if(ACTIONS.mctlNext) ACTIONS.mctlNext(); return 'next track'; }
        if(typeof focusMusicPlay==='function') focusMusicPlay(); return 'music on';
      }
      case 'set_wake_alarm': {
        const w = wakeCfg();
        if(x.time){ if(!/^\d{2}:\d{2}$/.test(x.time)) throw new Error('time must be HH:MM'); w.time = x.time; }
        if(x.on!=null) w.enabled = !!x.on; else if(x.time) w.enabled = true;
        persist('focus'); return 'alarm '+(w.enabled ? 'on for '+fmt12Hour(w.time) : 'off');
      }
      case 'open_page': {
        if(x.page==='recap'){ setTimeout(function(){ if(typeof openDayRecap==='function') openDayRecap(); }, 300); return 'opened the recap'; }
        if(x.page==='xp'){ setTimeout(function(){ ACTIONS.openXpHow(); }, 300); return 'opened How XP works'; }
        if(x.page==='projected'){ setTimeout(function(){ if(ACTIONS.openProjected) ACTIONS.openProjected(); }, 300); return 'opened his projected self'; }
        if(x.page==='operator'){ setTimeout(function(){ if(typeof opfOpen==='function') opfOpen(); }, 300); return 'opened your full screen'; }
        if(x.page==='notifications'){ setTimeout(function(){ if(!ui.notifOpen) ACTIONS.toggleNotifs(); }, 300); return 'opened notifications'; }
        break;
      }
    }
    return base.apply(this, arguments);
  };
})(opRunTool);
ACTIONS.opUndoDelete = function(){ const d = ui._opDeleted; if(!d) return; state.tasks.items.splice(Math.min(d.i, state.tasks.items.length), 0, d.t); ui._opDeleted = null; persist('tasks'); renderView(); showToast('Back: '+d.t.title, {icon:'&#8617;'}); };

// ---- what he knows: the rest of the open tasks (by name, to find them), and what clients said lately ----
const OPC_CUE = /\b(send|call|text|email|follow|invoice|pay|paid|owe|waiting|wants?|needs?|asked|promised|by (?:mon|tue|wed|thu|fri|sat|sun|tomorrow|next|end)|deadline|contract|proposal|deliver|due|renew|cancel|raise|upsell|referr)/i;
function opClientCues(){
  const out = [], cut = addDays(todayStr(), -21);
  arr(state.business.clients).filter(function(c){ return typeof clientStageActive!=='function' || clientStageActive(c.stage); }).forEach(function(c){
    arr(c.journal).filter(function(j){ return j.date >= cut && OPC_CUE.test(j.text||''); }).slice(-2).forEach(function(j){ out.push({who:c.business || c.name, date:j.date, text:String(j.text).replace(/\s+/g, ' ').slice(0, 220)}); });
  });
  arr(state.business.pipeline).filter(function(l){ return !l.convertedClientId && l.stage!=='lost' && l.stage!=='closed'; }).forEach(function(l){
    String(l.notes||'').split('\n').filter(function(n){ const m = /^(\d{4}-\d{2}-\d{2}):/.exec(n); return m && m[1] >= cut && OPC_CUE.test(n); }).slice(-2).forEach(function(n){ out.push({who:l.company || l.name, date:n.slice(0, 10), text:n.slice(12, 232)}); });
  });
  return out.sort(function(a, b){ return b.date.localeCompare(a.date); });
}
aiContext = (function(base){
  return function(){
    let s = base.apply(this, arguments);
    const later = state.tasks.items.filter(function(t){ return t.status==='backlog'; }).slice(-25).map(function(t){ return t.title; });
    if(later.length) s += '\nOther open tasks, not on today (so you can find them by name; don’t read these out): '+later.join('; ')+'.';
    const cues = opClientCues().slice(0, 8);
    if(cues.length) s += '\nFrom his client logs lately (bring one up only when it’s relevant or it’s been hanging): '+cues.map(function(c){ return c.who+' ('+c.date+'): '+c.text; }).join(' | ');
    return s;
  };
})(aiContext);
// a client log note can be a nudge too (one a day at most, and only a fresh one)
opNudgeItems = (function(base){
  return function(){
    const out = base.apply(this, arguments), s = typeof opNudgeStore==='function' ? opNudgeStore() : {said:[]};
    if(!s.said.some(function(id){ return /^cl:/.test(id); })){
      const c = opClientCues().find(function(c){ return c.date >= addDays(todayStr(), -7); });
      if(c) out.push({id:'cl:'+c.who+':'+c.date, w:1, short:'what '+c.who+' said', fact:'In his notes on '+c.who+' from '+fmtDateShort(c.date)+': "'+c.text+'". It may need a follow-up.'});
    }
    return out;
  };
})(opNudgeItems);

// ---- pressing you, all day ----
// how hard: Settings → Op (Light, Normal, Hard, Off). Normal is about every hour and a half.
const OPP_GAP = {light:[150, 40], normal:[85, 25], hard:[50, 15]};
function opPressLevel(){ const v = state.profile.opPress; return v==='off' || v==='light' || v==='hard' ? v : 'normal'; }
function opPressStore(){ const f = state.focus, t = todayStr(); if(!f.opPress || f.opPress.date!==t) f.opPress = {date:t, n:0, last:0, next:0, kinds:[]}; return f.opPress; }
function opPressGap(){ const g = OPP_GAP[opPressLevel()] || OPP_GAP.normal; return (g[0] + (Math.random()*2 - 1)*g[1])*60000; }
function opPressHours(){
  const w = typeof wakeCfg==='function' ? wakeCfg() : {}, hm = function(s){ const p = String(s||'').split(':'); return (+p[0])*60 + (+p[1] || 0); };
  return {from:w.enabled && w.time ? hm(w.time) + 60 : 9*60 + 30, to:22*60};
}
function opPressDue(){
  if(opPressLevel()==='off' || !state || !state.focus) return false;
  if(AI.busy || AI.listening || OV.speaking || OV.pending) return false;
  const m = state.modes && state.modes.active;
  if(m && (m.sleep || m.type==='shooting' || m.clockedOut)) return false;
  if(state.focus.activeSession) return false;                       // (locked in: his quick taps cover that)
  if(typeof workToday==='function'){ const w = workToday(); if(w.enabled && w.checkins && workPhase()==='work') return false; }   // (work-hours check-ins have it)
  if(typeof acct==='function' && acct().pending) return false;
  if(document.querySelector('.overlay:not(.hidden)') || (typeof inspOpenNow==='function' && inspOpenNow() && ui.inspReset)) return false;
  const h = opPressHours(), mm = nowMin(); if(mm < h.from || mm >= h.to) return false;
  const s = opPressStore(); if(s.n >= 9) return false;
  if(Date.now() - Math.max(OV.lastEnd||0, ui._opActiveAt||0, AI.lastAskAt||0) < 18*60000) return false;
  if(!s.next){ s.next = Date.now() + opPressGap()*0.5; persist('focus'); return false; }
  return Date.now() >= s.next;
}
// the one thing worth raising now (or, every third time, something older that's still hanging)
function opPressThing(s){
  const today = todayStr(), plan = typeof todaysPlan==='function' ? todaysPlan().filter(function(t){ return t.status!=='done'; }) : [];
  const over = state.tasks.items.filter(function(t){ return t.status!=='done' && t.deadline && t.deadline < today; })[0];
  const dueT = state.tasks.items.filter(function(t){ return t.status!=='done' && t.deadline===today; })[0];
  const fu = typeof followUpsDue==='function' ? followUpsDue(today)[0] : null;
  const old = (s.n % 3===2) ? (function(){
    const cue = opClientCues()[0]; if(cue) return 'From his notes on '+cue.who+' ('+fmtDateShort(cue.date)+'): "'+cue.text+'"';
    const stale = state.tasks.items.filter(function(t){ return t.status==='backlog' && !t.isVideoIdea && t.createdAt && t.createdAt < addDays(today, -10); })[0];
    return stale ? 'A task that’s been sitting since '+fmtDateShort(stale.createdAt)+': "'+stale.title+'"' : null;
  })() : null;
  return old || (over ? 'Overdue since '+fmtDateShort(over.deadline)+': "'+over.title+'"' : dueT ? 'Due today: "'+dueT.title+'"' : fu ? 'A follow-up with '+fu.name+(fu.late ? ' that’s late' : ' for today')+(fu.note ? ' ('+fu.note+')' : '') : plan[0] ? 'First thing on today’s plan: "'+plan[0].title+'"' : null);
}
function opPressFacts(){
  const dw = typeof deepWorkMinutesTodayLive==='function' ? deepWorkMinutesTodayLive() : 0, target = state.standards.deepWorkTargetMinutes || 180;
  const plan = typeof todaysPlan==='function' ? todaysPlan() : [], done = plan.filter(function(t){ return t.status==='done'; }).length;
  return {dw:dw, target:target, done:done, total:plan.length, now:nowHM()};
}
async function opPress(force){
  if(!force && !opPressDue()) return false;
  const s = opPressStore(), f = opPressFacts(), thing = opPressThing(s), mm = nowMin(), evening = mm >= 18*60;
  s.n++; s.last = Date.now(); s.next = Date.now() + opPressGap(); persist('focus');
  const name = (state.profile.name || '').split(' ')[0];
  // without a key: a plain, pointed line
  let line = evening ? pickOne(['Day’s winding down. What did you actually get done today?', 'Be straight with me: was today a good one? What got done?'])
    : !f.dw ? pickOne([(name ? name+', it' : 'It')+'’s '+fmt12Hour(f.now)+' and you haven’t locked in once. What’s going on?', 'Nothing on the board yet today. What’s the holdup?', 'You’ve been quiet. What are you doing right now?'])
    : f.dw < f.target ? pickOne(['You’ve got '+fmtDurationLabel(f.dw)+' in. What’s the next block?', fmtDurationLabel(f.dw)+' so far. Want me to lock you in for the next one?'])
    : pickOne(['You hit your hours today. Proud of you. What else is on your mind?', 'Target’s done. Anything you want to knock out while you’re hot?']);
  if(AI.hasKey===true && typeof aiWrite==='function'){
    const last = arr(s.kinds).slice(-1)[0];
    const t = await Promise.race([aiWrite('You’re his accountability partner and you’re pressing him right now (he isn’t locked in). '+
      'It’s '+fmt12Hour(f.now)+'. Deep work today: '+(f.dw ? fmtDurationLabel(f.dw) : 'none')+' of his '+fmtDurationLabel(f.target)+' target. '+(f.total ? f.done+' of '+f.total+' things on today’s plan done. ' : '')+
      (thing ? 'One thing you could raise, if it fits: '+thing+'. ' : '')+(last ? 'Last time you pressed him you went with: '+last+'. Do something different. ' : '')+
      'Say one or two short spoken sentences: '+(evening ? 'ask how the day really went and what got done.' : 'call out what’s real (pushy, with grace or humor), raise that one thing only if it fits, never list anything,')+
      ' and end with a direct question (what he’s doing right now, when he’s starting, or if you should lock him in).', {max:110}), new Promise(function(r){ setTimeout(r, 8000); })]);
    if(t) line = t;
  }
  if(AI.busy || AI.listening || OV.speaking || OV.pending || state.focus.activeSession) return false;
  s.kinds = arr(s.kinds).concat([line.slice(0, 80)]).slice(-4); persist('focus');
  ui._opPressAt = Date.now();
  AI.history.push({role:'assistant', content:line}); if(AI.history.length > 16) AI.history = AI.history.slice(-16);
  if(!f.dw && !evening && typeof opMood==='function') opMood('concern', 20000);
  OV.cap = 'opBubText'; opBubShow();
  if(opVoiceOn()) opSay(line, {cap:'opBubText'}); else opCaption(line);
  return true;
}
setInterval(function(){ try{ if(opPressDue()) opPress(); }catch(e){} }, 60000);
aiContext = (function(base){ return function(){ const at = ui._opPressAt; return base.apply(this, arguments)+(at && Date.now() - at < 20*60000 ? '\nYou just pressed him about what he’s doing. If he says he’s about to start something, offer to lock him in or start the task, and do it when he agrees. If he makes an excuse, call it, gently, and hold the line. If he’s genuinely resting or living his life, let him.' : ''); }; })(aiContext);
// (asking him something counts as Op being active: a press doesn't land right on top of a conversation)
aiAsk = (function(base){ return function(){ AI.lastAskAt = Date.now(); return base.apply(this, arguments); }; })(aiAsk);
// Settings → Op: how hard he presses
ACTIONS.opPressSet = function(el, e, id){ state.profile.opPress = id; persist('profile'); renderView(); };
if(typeof operatorSettingsHtml==='function') operatorSettingsHtml = (function(base){
  return function(){
    const v = opPressLevel(), b = function(k, l){ return '<button class="seg-tab'+(v===k ? ' active' : '')+'" data-action="opPressSet" data-id="'+k+'">'+l+'</button>'; };
    return base.apply(this, arguments)+'<div class="card section op-settings"><div class="snd-h"><div><div class="section-title" style="margin:0;">&#128170; How hard Op presses you</div><div class="kpi-sub">All day, when you’re not locked in.</div></div>'+
      '<div class="seg-tabs seg-sm" style="margin:0;">'+b('off', 'Off')+b('light', 'Light')+b('normal', 'Normal')+b('hard', 'Hard')+'</div></div></div>';
  };
})(operatorSettingsHtml);
