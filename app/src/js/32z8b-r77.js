// ================= Round 77 =================
// The bed tags work exactly as asked, the desk tag locks in/out, the door tag starts a break. Op writes a whole
// playbook from a description. The tasks look is chosen in Settings → Appearance (with a picture of each).
// A client's cycle never touches the day you started with them. The phone gets a live view.

// ---------------- the tags by the bed ----------------
// SLEEP: the alarm is going → snooze it. Otherwise → you're asleep. Nothing else.
// AWAKE: the alarm is going (or snoozed) → it stops and you're up. No alarm and you're not up yet → you're up,
// and the wake alarm still goes off at its time. Already up → Good morning starts.
function r77WakeUpAlarm(){ try{ return r72WakeRinging() || !!(r72Snoozed() && r72Snoozed().wake); }catch(e){ return false; } }
function r77Asleep(){ const m = state.modes && state.modes.active, S = r70TSleep(); return !!(m && m.sleep) || !!(S.bed && !S.awake && Date.now() - S.bed < 18*3600000); }
function r77UpToday(){ const g = r70Gm(); return !!g.up; }
// up, without telling the alarm it already went off (that's what used to cancel it)
function r77MarkAwake(){
  const S = r70TSleep(), m = state.modes && state.modes.active; let out = '';
  if(S.bed && !S.awake){
    S.awake = Date.now(); S.minutes = Math.max(0, Math.round((S.awake - S.bed)/60000)); S.source = S.source || 'tag'; S.date = todayStr();
    const H = arr(state.focus.r70Sleeps); H.push({bed:S.bed, awake:S.awake, minutes:S.minutes, source:S.source, date:S.date}); if(H.length > 400) H.splice(0, H.length - 400); state.focus.r70Sleeps = H;
    out = fmtDurationLabel(S.minutes)+' of sleep';
  }
  if(m && m.sleep){ try{ finishActiveMode(true); }catch(e){} }
  r70MarkUp();
  persist('focus'); persist('modes'); try{ renderView(); }catch(e){}
  return out;
}
function r77NextWakeLine(){
  try{ const nw = nextWake(); if(nw && nw.ts > Date.now() && nw.ts - Date.now() < 14*3600000) return ' Your alarm still goes off at '+fmtTimeShort(nw.ts)+'.'; }catch(e){}
  return '';
}
r70TRunStep = (function(base){
  return function(s, g, value){
    const act = s && s.act, as = state.focus.activeSession;
    if(act==='sleep'){
      if(r72WakeRinging()){ wakeSnooze(); const sn = r72Snoozed(); return 'Snoozed'+(sn ? ' until '+fmtTimeShort(sn.ts) : '')+'.'; }
      if(r72WorkRinging()){ ACTIONS.workSnooze(); return 'Work alarm snoozed, 5 minutes.'; }
      if(r72ReminderRinging()){ try{ snoozeAlarm(); }catch(e){} return 'Snoozed.'; }
      { const sn = r72Snoozed(); if(sn && sn.wake) return 'Already snoozed until '+fmtTimeShort(sn.ts)+'. Back to sleep.'; }
      if(r77Asleep()) return 'Already down for the night.';
      r70TSleepStart();
      return 'Goodnight. You’re asleep.';
    }
    if(act==='awake'){
      if(r77WakeUpAlarm()){ const slept = r70TWakeUp(); return 'Alarm off. You’re up'+(slept ? ' ('+slept+')' : '')+'.'; }
      if(r77Asleep() || !r77UpToday()){ const slept = r77MarkAwake(); return 'Morning. You’re up'+(slept ? ', '+slept : '')+'.'+r77NextWakeLine(); }
      setTimeout(function(){ try{ if(ACTIONS.sleepGoodMorning) ACTIONS.sleepGoodMorning(); else if(ACTIONS.r70GmStart) ACTIONS.r70GmStart(); }catch(e){} }, 300);
      return 'Starting Good morning.';
    }
    if(act==='locktoggle'){
      if(as){ const mins = r70LockOutNow(); return 'Locked out. '+fmtDurationLabel(mins)+' this session.'; }
      return r72TagLockIn();
    }
    if(act==='breakstart'){
      if(!as) return 'You’re not locked in, so there’s nothing to break from.';
      if(as.onBreak) return 'Already on a break.';
      return base.call(this, {act:'break', min:s.min || 15}, g, value);
    }
    return base.apply(this, arguments);
  };
})(r70TRunStep);
if(!R70T_ACTS.some(function(a){ return a.id==='breakstart'; })) R70T_ACTS.push({id:'breakstart', g:'Focus', label:'Start a break (never ends one)', icon:'&#9749;', place:'the door', num:{key:'min', label:'minutes', def:15}});
(function(){
  const a = R70T_ACTS.find(function(x){ return x.id==='awake'; }); if(a) a.label = 'I’m awake (stops the alarm if it’s going; tap again for Good morning)';
  const s = R70T_ACTS.find(function(x){ return x.id==='sleep'; }); if(s) s.label = 'I’m asleep (snoozes only if the alarm is going)';
  const set = function(id, about, steps){ const t = R70T_STARTERS.find(function(x){ return x.id===id; }); if(t){ t.about = about; if(steps) t.steps = steps; } };
  set('sleep', 'Asleep. If the alarm is going, it snoozes it instead.');
  set('awake', 'Alarm going: stops it, you’re up. Not up yet: you’re up (the alarm still rings). Up already: Good morning.', [{act:'awake'}]);
  set('desk', 'Lock in. Tap again to lock out.', [{act:'locktoggle'}]);
  set('door', 'Starts a break.', [{act:'breakstart', min:15}]);
})();
// once: your existing Desk, Door, Sleep and Awake tags do the above
setTimeout(function(){
  try{
    if(!state.tags || state.tags.r77Mig) return;
    r70TagList().forEach(function(g){
      if(g.starter==='desk') g.steps = [{id:uid(), act:'locktoggle', when:{}}];
      if(g.starter==='door') g.steps = [{id:uid(), act:'breakstart', min:15, when:{}}];
      if(g.starter==='sleep') g.steps = [{id:uid(), act:'sleep', when:{}}];
      if(g.starter==='awake') g.steps = [{id:uid(), act:'awake', when:{}}];
    });
    state.tags.r77Mig = true; persist('tags');
  }catch(e){}
}, 0);

// ---------------- Op writes the whole playbook ----------------
// Describe it; he fills in everything: stages (and whether they repeat monthly), every step with its type, when
// it's due (a day, the last day, or weekly on a weekday), a checklist and a note.
pb6NewHtml = (function(base){
  return function(){
    let h = base.apply(this, arguments);
    const cut = r60Cut(h, '<div class="r76-pbop">'); if(!cut) return h;
    h = cut.rest;
    const op = '<div class="r76-pbop r77-pbop"><div class="r76-pbop-h"><b>&#10024; Describe it. Op builds it.</b><span>Who it’s for, what happens and when. He writes every stage and step, with checklists, notes and due days. You can change anything after.</span></div>'+
      '<textarea class="input" id="r76PbAsk" rows="5" placeholder="e.g. Onboarding for a new reels retainer ($1,800 / 16 reels). Kickoff call in the first 2 days, get Instagram + Drive access, content plan by day 5, shoot day in week 2, first 8 reels delivered by day 14, ads live by day 21. Then a monthly cycle: 2 shoots, 16 reels, weekly check-in text on Fridays, monthly report and invoice on the last day."></textarea>'+
      '<button class="btn btn-primary r76-pbop-go" data-action="r76PbOp"'+(ui.r76PbBusy ? ' disabled' : '')+'>'+(ui.r76PbBusy ? 'Op is building it…' : '&#10024; Build it with Op')+'</button></div>'+
      '<div class="r77-or"><span>or set it up yourself</span></div>';
    const at = h.indexOf('<div class="pb6-nf">') >= 0 ? h.indexOf('<div class="pb6-nf">') : h.indexOf('<div class="as-f">');
    const head = h.indexOf('</div>', h.indexOf('class="as-h')) ;
    // straight under the sheet's title
    const t = h.search(/<(div|span|label)[^>]*>(Start from|START FROM)/i);
    const pos = t > 0 ? t : at;
    return pos > 0 ? h.slice(0, pos)+op+h.slice(pos) : op+h;
  };
})(pb6NewHtml);
ACTIONS.r76PbOp = async function(){
  const N = pb6NewRead(), ask = String((document.getElementById('r76PbAsk') || {}).value || '').trim();
  if(!ask){ const t = document.getElementById('r76PbAsk'); if(t) t.focus(); return; }
  if(AI.hasKey===false){ showToast('Op needs his AI key for this: Settings → Connections & Data.', {icon:'&#9888;'}); return; }
  ui.r76PbBusy = true; addSheetOpen('pb6NewSheet', pb6NewHtml);
  const who = N.for==='lead' ? 'lead' : 'client', crmSt = crmStages(who).filter(function(s){ return s.kind!=='lost'; }).map(function(s){ return s.label; });
  const task = 'Build a complete '+(who==='lead' ? 'lead follow-up' : 'client')+' playbook for my business from this description:\n"""'+ask+'"""\n'+
    (N.name ? 'Name it: '+N.name+'\n' : '')+
    'My '+(who==='lead' ? 'lead' : 'client')+' stages in the app: '+crmSt.join(', ')+'. Reuse those stage names where they fit.\n'+
    'Include everything the description implies and what a sharp operator would add (access, approvals, reminders, reports, invoices, check-ins). Reply with ONLY JSON:\n'+
    '{"name":"…","stages":[{"name":"…","days":14,"repeat":"none|month","steps":[{"title":"…","type":"task|call|report|send|access|doc","when":"enter|day|end|weekly","day":3,"weekday":"Mon|Tue|Wed|Thu|Fri|Sat|Sun","checklist":["…"],"notes":"…"}]}]}\n'+
    'Rules: 2 to 6 stages; 3 to 10 steps each; titles short, start with a verb; "when":"day" uses "day" (1 = the day they enter the stage); "weekly" uses "weekday"; a monthly service stage has "repeat":"month"; checklists 0 to 6 short items; notes one or two sentences or empty.';
  let txt = null; try{ txt = await aiWrite(task, {max:3500}); }catch(e){}
  ui.r76PbBusy = false;
  let J = null; try{ const m = String(txt || '').match(/\{[\s\S]*\}/); J = m ? JSON.parse(m[0]) : null; }catch(e){}
  if(!J || !Array.isArray(J.stages) || !J.stages.length){ addSheetOpen('pb6NewSheet', pb6NewHtml); showToast('Op couldn’t put that one together. Try saying it another way.', {icon:'&#9888;'}); return; }
  const p = r76PbFromJson(J, who, N);
  pbAll().push(p); ui.pbSel = p.id; ui.pbView = 'build'; ui.pbItem = null; ui.pbWho = who; ui.pb57Stage = p.stages[0].id; ui.pb57StageEdit = false;
  addSheetClose('pb6NewSheet'); pbSave(); playPositive(); renderView();
  showToast('Op built “'+p.name+'”: '+p.stages.length+' stages, '+p.stages.reduce(function(a, s){ return a + s.steps.length; }, 0)+' steps.', {icon:'&#10024;', duration:6000});
};
const R77_DOW = {sun:0, mon:1, tue:2, wed:3, thu:4, fri:5, sat:6};
r76PbFromJson = function(J, who, N){
  const name = String(N.name || J.name || 'New playbook').trim().slice(0, 60);
  const p = pbNew(who, name, 30, {for:who, repeats:N.ends==='again', next:N.ends && N.ends!=='again' ? N.ends : null});
  const st = crmStages(who);
  p.stages = J.stages.slice(0, 8).map(function(s){
    const days = Math.max(1, Math.min(60, Math.round(Number(s.days) || 7))), monthly = String(s.repeat || '').toLowerCase()==='month';
    const m = st.find(function(c){ return r76Norm(c.label)===r76Norm(s.name); });
    const S = pb57Stage(String(s.name || 'Stage').slice(0, 50), {crm:m ? m.id : null, days:days, repeat:monthly ? 'month' : null});
    S.steps = arr(s.steps).slice(0, 14).map(function(x){
      if(typeof x==='string') x = {title:x};
      const w = String(x.when || '').toLowerCase(), d = Math.max(1, Math.round(Number(x.day) || 1));
      let due = {rule:'enter'};
      if(w==='weekly') due = {rule:'week', dow:R77_DOW[String(x.weekday || 'fri').slice(0, 3).toLowerCase()] != null ? R77_DOW[String(x.weekday || 'fri').slice(0, 3).toLowerCase()] : 5};
      else if(w==='end') due = {rule:'end'};
      else if(w==='day' || d > 1) due = d >= days && !monthly ? {rule:'end'} : d <= 1 ? {rule:'enter'} : {rule:'day', n:d};
      const type = PB_TYPES[x.type] ? x.type : 'task';
      return pb57Step(String(x.title || 'Step').slice(0, 80), type, due, {checklist:arr(x.checklist).slice(0, 8).map(function(t){ return {id:uid(), t:String(t).slice(0, 120)}; }), notes:String(x.notes || '').slice(0, 600)});
    });
    return S;
  });
  if(!p.stages.length) p.stages = [pb57Stage('Stage 1')];
  p.postDays = []; p.fromOp = true;
  return p;
};

// ---------------- the tasks look: only in Settings → Appearance, with a picture of each ----------------
renderFocusTasksOverview = (function(base){ return function(){ return base.apply(this, arguments).replace(/<div class="r73-looksbar">[\s\S]*?<\/div><\/div>/, '').replace(/<div class="r73-looksbar">[\s\S]*?<\/div>/, ''); }; })(renderFocusTasksOverview);
function r77LookPreview(id){
  const bar = function(w, c){ return '<i style="width:'+w+'%'+(c ? ';background:'+c : '')+'"></i>'; };
  if(id==='classic') return '<div class="r77p r77p-classic"><u>'+bar(60, '#F5C451')+'</u><div>'+'<s></s><s></s><s></s><s></s><s></s><s></s>'+'</div></div>';
  if(id==='board') return '<div class="r77p r77p-board">'+['Today', 'Soon', 'Later'].map(function(){ return '<div><b></b><s></s><s></s><s></s></div>'; }).join('')+'</div>';
  if(id==='timeline') return '<div class="r77p r77p-time"><em></em>'+[12, 34, 52, 70, 88].map(function(x, i){ return '<i style="left:'+x+'%;top:'+(i % 2 ? 58 : 22)+'%"></i>'; }).join('')+'</div>';
  if(id==='focus') return '<div class="r77p r77p-one"><div><b></b><s></s><s></s></div></div>';
  return '<div class="r77p r77p-orbit"><span></span><span></span><span></span><i style="left:18%;top:40%"></i><i style="left:70%;top:22%"></i><i style="left:62%;top:72%"></i><i style="left:40%;top:12%"></i><b></b></div>';
}
function r77LookCardHtml(){
  const cur = r73TaskLook();
  return '<div class="card section op-settings" id="r77Looks"><div class="section-title">&#128221; Tasks overview</div>'+
    '<p class="r77-lp">How the first Focus page shows your tasks. You change it here only.</p>'+
    '<div class="r77-lg">'+R73_TASK_LOOKS.map(function(l){ return '<button class="r77-lc'+(cur===l[0] ? ' is-on' : '')+'" data-action="r73TaskLook" data-id="'+l[0]+'">'+r77LookPreview(l[0])+'<b>'+escapeHtml(l[1])+(cur===l[0] ? ' <em>&#10003;</em>' : '')+'</b><span>'+escapeHtml(l[2])+'</span></button>'; }).join('')+'</div></div>';
}
renderSettings = (function(base){
  return function(){
    let h = base.apply(this, arguments);
    const c = r60Cut(h, '<div class="card section op-settings" id="r73Looks">'); if(c) h = c.rest;
    const m = '<div class="set-part" id="setPart-display">'; const i = h.indexOf(m);
    if(i >= 0 && h.indexOf('id="r77Looks"') < 0){
      let at = i + m.length; const hh = '<div class="set-part-h">'; if(h.slice(at, at + hh.length)===hh) at = h.indexOf('</div>', at) + 6;
      h = h.slice(0, at)+r77LookCardHtml()+h.slice(at);
    }
    return h;
  };
})(renderSettings);
ACTIONS.r73TaskLook = (function(base){ return function(el, e, id){ const r = base.apply(this, arguments); try{ showToast('Tasks overview: '+((R73_TASK_LOOKS.find(function(l){ return l[0]===id; }) || [0, id])[1])+'.', {icon:'&#128221;'}); }catch(x){} return r; }; })(ACTIONS.r73TaskLook);

// ---------------- the cycle never moves your start date ----------------
ACTIONS.r76CycSave = (function(base){
  return function(el, e, id){
    const c = arr(state.business.clients).find(function(x){ return x.id===id; }); const keep = c ? {start:c.startDate, bill:c.billingDay} : null;
    const r = base.apply(this, arguments);
    if(c && keep){ c.startDate = keep.start; c.billingDay = keep.bill; persist('business'); }
    return r;
  };
})(ACTIONS.r76CycSave);
clientBacklogHtml = (function(base){
  return function(){
    const h = base.apply(this, arguments); if(!ui.r76Cyc) return h;
    const c = arr(state.business.clients).find(function(x){ return x.id===ui.r76Cyc; }); if(!c) return h;
    return h.replace(/(<div class="r76-cyce">[\s\S]*?)(<button class="btn btn-sm btn-primary" data-action="r76CycSave")/, '$1<small class="r77-cs">'+(c.startDate ? 'Started with them '+fmtDateShort(c.startDate)+'. That stays.' : 'Your start date with them doesn’t change.')+'</small>$2');
  };
})(clientBacklogHtml);

// ---------------- the phone: a live view, and the journal newest first ----------------
function r77Ts(e){ return Number(e.timestamp) || Date.parse(e.createdAt || '') || Date.parse((e.date || '')+'T12:00:00') || 0; }
r72PhoneJournal = function(){
  return arr(state.journal.entries).slice().sort(function(a, b){ return r77Ts(b) - r77Ts(a); }).slice(0, 20)
    .map(function(e){ return {id:e.id, date:e.date, ts:r77Ts(e), title:e.title || '', text:String(e.text || '').slice(0, 400)}; });
};
r72PhoneCall = (function(base){
  return function(name, a){
    if(String(name)==='live'){
      try{
        const as = state.focus.activeSession, P = r75Progress(), T = r75TodayTasks();
        let nx = null; try{ nx = nextUpTask(); }catch(e){}
        const cur = ui.currentTaskId ? arr(state.tasks.items).find(function(t){ return t.id===ui.currentTaskId; }) : null;
        let streak = 0; try{ streak = computeStreak(); }catch(e){}
        let q = []; try{ q = r70Quests(); }catch(e){}
        const m = state.modes && state.modes.active;
        return {now:Date.now(), locked:!!as, onBreak:!!(as && as.onBreak), startedAt:as ? as.startedAt : null, breakEndsAt:as && as.breakEndsAt || null,
          mode:m ? (m.sleep ? 'Asleep' : m.type==='shooting' ? 'Shooting' : m.note || m.type) : null, modeSince:m ? m.startedAt : null,
          task:cur ? (typeof taskName==='function' ? taskName(cur) : cur.title) : null, next:nx ? nx.title : null,
          deep:P.done, target:P.target, pct:P.pct, left:P.left, tasksDone:T.done.length, tasksAll:T.done.length + T.open.length, streak:streak,
          quests:{done:q.filter(function(x){ return x.done; }).length, all:q.length}, day:r71Type().label};
      }catch(e){ return {error:String(e.message || e)}; }
    }
    return base.apply(this, arguments);
  };
})(r72PhoneCall);
