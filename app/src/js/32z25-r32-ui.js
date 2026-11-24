// ============ ROUND 32: ONE WAY TO ADD, CLEANER PAGES ============
//  • The + in the corner is the only way to add anything. Each page asks what you want to add:
//    Business → a client or a lead (Lifecycle makes a cycle, Packages a package, Finances an
//    invoice); Calendar → an event, an alarm or a reminder; Today → a task, a video idea, a skill
//    or a reminder. The add rows and "+ Add…" buttons on the pages themselves are gone.
//  • Business setup is a quiet gear by the title that opens one clean sheet (no Setup tab)
//  • Op's reads on the Calendar and Goals are one line, a tip, not a panel
//  • Goals is one panel: the big ones, this week and this month, your own goals, divided like
//    the Business overview instead of stacked cards

// ---- the + menus ----
const R32_ADD = {
  client:function(){ return ['&#129309;', 'A client', function(){ openNewContactModal('client'); }, 'Someone you work with']; },
  lead:function(){ return ['&#127919;', 'A lead', function(){ openNewContactModal('lead'); }, 'Someone you’re chasing']; },
  event:function(){ return ['&#128197;', 'An event', function(){ openCalEventModal(); }, 'A call, a shoot, anything with a time']; },
  alarm:function(){ return ['&#9200;', 'An alarm', function(){ openAlarmSheet(); }, 'Rings at a time you pick']; },
  reminder:function(){ return ['&#128276;', 'A reminder', function(){ openReminderSheet(); }, 'A nudge on a day, with or without a time']; }
};
fabContext = (function(base){
  return function(){
    const v = ui.view;
    if(v==='calendar') return {label:'Add something', menu:[R32_ADD.event(), R32_ADD.alarm(), R32_ADD.reminder()]};
    if(v==='business'){
      const t = ui.businessTab;
      if(t==='lifecycle') return {label:'New client cycle', run:function(){ ACTIONS.cyNew(); openLifecycleEditor(ui.editingCycleId); }};
      if(t==='packages' || t==='finances') return base.apply(this, arguments);
      return {label:'Add something', menu:t==='leads' ? [R32_ADD.lead(), R32_ADD.client()] : [R32_ADD.client(), R32_ADD.lead()]};
    }
    const c = base.apply(this, arguments);
    if(c && c.menu && v==='today') c.menu = c.menu.concat([R32_ADD.reminder()]);
    return c;
  };
})(fabContext);

// ---- an alarm ----
function alarmSheetHtml(){
  const rep = ui.alarmRepeat || 'daily';
  return asHead('&#9200;', 'New alarm', 'It rings with your alarm sound. Wake-up and work hours live on the Calendar.')+
    '<div class="hs-body">'+
      '<div class="hs-big as-time"><input class="input" type="time" id="alSheetTime" value="'+(ui.alarmSheetTime || '09:00')+'"></div>'+
      '<input class="input hs-in as-name" id="alSheetLabel" placeholder="What for? e.g. Call the bank" maxlength="80">'+
      '<div class="as-lbl">Repeats</div>'+
      '<div class="hs-seg">'+[['daily', 'Every day'], ['weekdays', 'Weekdays'], ['once', 'Just once']].map(function(x){ return '<button class="'+(rep===x[0] ? 'is-on' : '')+'" data-action="alarmRepeat" data-id="'+x[0]+'">'+x[1]+'</button>'; }).join('')+'</div>'+
      '<button class="btn btn-primary hs-go" data-action="alarmSheetAdd">&#9200; Set the alarm</button>'+
    '</div>';
}
function openAlarmSheet(){ ui.alarmRepeat = 'daily'; ui.alarmSheetTime = null; addSheetOpen('alarmSheet', alarmSheetHtml, 'alSheetLabel'); }
ACTIONS.openAlarmSheet = function(){ openAlarmSheet(); };
ACTIONS.alarmRepeat = function(el, e, id){
  const t = document.getElementById('alSheetTime'); if(t) ui.alarmSheetTime = t.value;
  ui.alarmRepeat = id; addSheetRefresh('alarmSheet');
};
ACTIONS.alarmSheetAdd = function(){
  const t = document.getElementById('alSheetTime'), l = document.getElementById('alSheetLabel');
  const time = t && t.value; if(!time){ if(t) t.focus(); return; }
  const rep = ui.alarmRepeat || 'daily', a = {id:uid(), time:time, label:(l && l.value.trim()) || '', days:rep==='weekdays' ? [1,2,3,4,5] : [0,1,2,3,4,5,6], enabled:true};
  // (just once: the next time that clock time comes round)
  if(rep==='once') a.date = hmMin(time) > nowMin() ? todayStr() : addDays(todayStr(), 1);
  state.focus.alarms.push(a);
  persist('focus'); playPositive(); addSheetClose('alarmSheet'); renderView();
  showToast('Alarm set for '+fmt12Hour(time)+(a.date ? (a.date===todayStr() ? ' today' : ' tomorrow') : rep==='weekdays' ? ' on weekdays' : ' every day'));
};

// ---- a reminder ----
function reminderSheetHtml(){
  const d = ui.remSheetDate || todayStr(), chip = function(n, label){ const ds = addDays(todayStr(), n); return '<button class="as-chip'+(d===ds ? ' is-on' : '')+'" data-action="remSheetDay" data-id="'+n+'">'+label+'</button>'; };
  return asHead('&#128276;', 'New reminder', 'Shows on the day in your Calendar and on Today, and Op brings it up.')+
    '<div class="hs-body">'+
      '<input class="input hs-in as-name" id="rmSheetLabel" placeholder="Remind me to…" maxlength="140" value="'+escapeHtml(ui.remSheetLabel || '')+'">'+
      '<div class="as-chips">'+chip(0, 'Today')+chip(1, 'Tomorrow')+chip(7, 'Next week')+'</div>'+
      '<div class="as-two"><label><span class="as-lbl">Day</span><input class="input" type="date" id="rmSheetDate" value="'+d+'"></label><label><span class="as-lbl">Time <em>optional</em></span><input class="input" type="time" id="rmSheetTime" value="'+(ui.remSheetTime || '')+'"></label></div>'+
      '<button class="btn btn-primary hs-go" data-action="remSheetAdd">&#128276; Remind me</button>'+
    '</div>';
}
function openReminderSheet(){ ui.remSheetDate = todayStr(); ui.remSheetLabel = ''; ui.remSheetTime = ''; addSheetOpen('reminderSheet', reminderSheetHtml, 'rmSheetLabel'); }
ACTIONS.openReminderSheet = function(){ openReminderSheet(); };
ACTIONS.remSheetDay = function(el, e, id){
  const l = document.getElementById('rmSheetLabel'), t = document.getElementById('rmSheetTime');
  ui.remSheetLabel = l ? l.value : ''; ui.remSheetTime = t ? t.value : '';
  ui.remSheetDate = addDays(todayStr(), Number(id) || 0); addSheetRefresh('reminderSheet'); playTick();
};
document.addEventListener('change', function(e){ if(e.target && e.target.id==='rmSheetDate'){ ui.remSheetDate = e.target.value || todayStr(); document.querySelectorAll('#reminderSheet .as-chip').forEach(function(c){ c.classList.toggle('is-on', addDays(todayStr(), Number(c.dataset.id))===ui.remSheetDate); }); } });
ACTIONS.remSheetAdd = function(){
  const l = document.getElementById('rmSheetLabel'), label = l ? l.value.trim() : '';
  if(!label){ if(l) l.focus(); return; }
  const dEl = document.getElementById('rmSheetDate'), tEl = document.getElementById('rmSheetTime');
  const date = (dEl && dEl.value) || todayStr(), time = (tEl && tEl.value) || null;
  state.focus.reminders.push({id:uid(), label:label, date:date, time:time});
  persist('focus'); playPositive(); addSheetClose('reminderSheet'); renderView();
};

// ---- the add rows on the pages go ----
// Reminders (Calendar): just the list
renderRemindersCard = function(){
  const list = arr(state.focus.reminders).slice().sort(function(a, b){ return (a.date+String(a.time||'')).localeCompare(b.date+String(b.time||'')); });
  return '<div class="section"><div class="section-title">Reminders<span class="kpi-sub">'+list.length+'</span></div>'+
    '<div class="rm-list">'+(list.map(reminderRow).join('') || '<div class="empty">Nothing coming up.</div>')+'</div></div>';
};
// Today's reminders panel: the next one, no input
renderRemindersMiniPanel = (function(base){ return function(){ return base.apply(this, arguments).replace(/<div class="row" style="gap:6px;margin-top:12px;justify-content:center;">[\s\S]*?data-action="addMiniReminder">Add<\/button><\/div>/, ''); }; })(renderRemindersMiniPanel);
// Today's tasks, empty: a line, not a big "+ Add Tasks for Today" button
renderTodayTasksPanel = (function(base){
  return function(){
    const h = base.apply(this, arguments);
    return h.indexOf('data-form="quickAddToday">+ Add Tasks for Today</button>') < 0 ? h
      : h.replace(/<button class="btn btn-good"[^>]*data-form="quickAddToday">\+ Add Tasks for Today<\/button>/, '<div class="r32-hint">The + in the corner adds one.</div>');
  };
})(renderTodayTasksPanel);
// (Today's panel list holds the functions themselves: point it at the new one)
PANEL_RENDERERS.tasks = function(){ return renderTodayTasksPanel(); };
// Lifecycle with no cycles yet
renderLifecycleTab = (function(base){ return function(){ return base.apply(this, arguments).replace(/<button class="btn btn-primary btn-sm" data-action="openLifecycleEditor">Create your first cycle<\/button>/, '<span class="r32-hint">The + in the corner makes one.</span>'); }; })(renderLifecycleTab);
// Training skills, none yet
trainingSkillsHtml = (function(base){ return function(){ return base.apply(this, arguments).replace(/<button class="btn gr-go" data-action="openSkillSheet">Add a training skill<\/button>/, ''); }; })(trainingSkillsHtml);
// Finances: a client's payment is logged, not "+ Invoice"
renderFinances = (function(base){ return function(){ return base.apply(this, arguments).replace(/<button class="btn btn-good btn-sm" data-action="openInvoiceModal"([^>]*)>\+ Invoice<\/button>/g, '<button class="btn btn-ghost btn-sm fin-pay" data-action="openInvoiceModal"$1>Log payment</button>'); }; })(renderFinances);

// ---- Business setup: one sheet ----
const BS_TABS = [['reach', 'Reach-out'], ['msgs', 'Messages'], ['leads', 'Lead stages'], ['clients', 'Client statuses'], ['cycles', 'Client cycles']];
function bsStagesHtml(kind){
  const list = crmStages(kind);
  return '<div class="bs-stages">'+list.map(function(s, i){
    return '<div class="bs-st">'+
      '<button class="bs-dot" style="background:'+s.color+'" data-action="cycleStageColor" data-kind="'+kind+'" data-id="'+s.id+'" title="Change the color"></button>'+
      '<input class="bs-name" data-stage-label="'+kind+':'+s.id+'" value="'+escapeHtml(s.label)+'" maxlength="40">'+
      (s.kind ? '<span class="bs-tag">'+(s.kind==='won' ? 'becomes a client' : s.kind==='lost' ? 'closed, lost' : 'closed')+'</span>'
        : kind==='client' ? '<label class="bs-tag bs-act" title="Clients here count as active (MRR, check-ins)"><input type="checkbox" data-stage-active="'+s.id+'"'+(s.active!==false ? ' checked' : '')+'><i></i>active</label>' : '<span class="bs-tag"></span>')+
      '<span class="bs-mv"><button data-action="moveStage" data-kind="'+kind+'" data-id="'+s.id+'" data-dir="-1"'+(i===0 ? ' disabled' : '')+' title="Up">&#8593;</button><button data-action="moveStage" data-kind="'+kind+'" data-id="'+s.id+'" data-dir="1"'+(i===list.length - 1 ? ' disabled' : '')+' title="Down">&#8595;</button></span>'+
      (s.kind ? '<span class="bs-x"></span>' : '<button class="bs-x" data-action="removeStage" data-kind="'+kind+'" data-id="'+s.id+'" title="Remove (anyone here moves to the first stage)">&#10005;</button>')+
    '</div>';
  }).join('')+
  '<div class="bs-st is-new"><span class="bs-dot is-new">+</span><input class="bs-name" id="newStage-'+kind+'" placeholder="New '+(kind==='lead' ? 'stage' : 'status')+', then Enter" maxlength="40"></div></div>';
}
function bizSetupHtml(){
  const tab = ui.bsTab || 'reach', c = crm(), t = crmTemplates(), who = ui.bsWho==='client' ? 'client' : 'lead';
  let body = '';
  if(tab==='reach') body =
    '<div class="bs-row"><div><b>New leads</b><small>How often you touch base until they answer</small></div><span class="bs-num">every <input class="input" type="number" min="1" id="setLeadCadence" value="'+c.leadCadenceDays+'"> days</span></div>'+
    '<div class="bs-row"><div><b>Clients</b><small>A client goes red once a touch is due</small></div><span class="bs-num">every <input class="input" type="number" min="1" id="setClientCadence" value="'+c.clientCadenceDays+'"> days</span></div>'+
    '<div class="bs-row"><div><b>Daily reach-out reminder</b><small>One nudge with everyone who’s due</small></div><span class="bs-num"><input class="input" type="time" id="setTouchReminderTime" value="'+c.dailyReminder.time+'"><label class="bs-sw"><input type="checkbox" id="setTouchReminder"'+(c.dailyReminder.enabled ? ' checked' : '')+'><i></i></label></span></div>';
  else if(tab==='msgs'){
    const f = function(key, label, rows){ return '<label class="bs-f"><span>'+label+'</span>'+(rows ? '<textarea class="input" data-tpl="'+key+'" rows="'+rows+'">'+escapeHtml(t[key])+'</textarea>' : '<input class="input" data-tpl="'+key+'" value="'+escapeHtml(t[key])+'">')+'</label>'; };
    body = '<div class="hs-seg bs-who">'+[['lead', 'To a lead'], ['client', 'To a client']].map(function(x){ return '<button class="'+(who===x[0] ? 'is-on' : '')+'" data-action="bsWho" data-id="'+x[0]+'">'+x[1]+'</button>'; }).join('')+'</div>'+
      f(who+'Text', 'Text message', 3)+f(who+'EmailSubject', 'Email subject')+f(who+'EmailBody', 'Email', 5)+
      '<div class="bs-note">{first} their first name &middot; {name} the business &middot; {me} you &middot; {note} the follow-up reason</div>';
  }
  else if(tab==='leads') body = '<div class="bs-note is-top">The columns on Leads, in order. Won and Lost always close a lead.</div>'+bsStagesHtml('lead');
  else if(tab==='clients') body = '<div class="bs-note is-top">Where a client stands. Active ones count toward MRR and check-ins.</div>'+bsStagesHtml('client');
  else {
    const n = {}; crmList('client').forEach(function(x){ if(x.cycleId) n[x.cycleId] = (n[x.cycleId]||0) + 1; });
    body = '<div class="bs-note is-top">Your playbooks: the steps each kind of client goes through, with the calls, forms and to-dos.</div>'+
      '<div class="bs-cys">'+(cycles().map(function(cy){ return '<button class="bs-cy" data-action="bsCycle" data-id="'+cy.id+'" style="--c:'+cy.color+'"><i></i><b>'+escapeHtml(cy.name)+'</b><small>'+arr(cy.steps).length+' step'+(arr(cy.steps).length===1 ? '' : 's')+' &middot; '+(n[cy.id]||0)+' client'+((n[cy.id]||0)===1 ? '' : 's')+'</small><em>Edit &#8250;</em></button>'; }).join('') || '<div class="bs-note">None yet. Lifecycle’s + makes one.</div>')+'</div>';
  }
  return '<button class="int-x hs-x" data-action="addSheetClose" title="Close">&#10005;</button>'+
    '<div class="as-h"><span class="as-ic">&#9881;&#65038;</span><div><div class="hs-h">Business setup</div><div class="as-sub">How you reach out, what you say, and the stages people move through.</div></div></div>'+
    '<div class="bs">'+
      '<nav class="bs-nav">'+BS_TABS.map(function(x){ return '<button class="'+(tab===x[0] ? 'is-on' : '')+'" data-action="bsTab" data-id="'+x[0]+'">'+x[1]+'</button>'; }).join('')+'</nav>'+
      '<div class="bs-body" data-key="bs-'+tab+'-'+who+'">'+body+'</div>'+
    '</div>';
}
ACTIONS.bizSetupOpen = function(){ ui.bsTab = ui.bsTab || 'reach'; addSheetOpen('bizSetup', bizSetupHtml); };
ACTIONS.bsTab = function(el, e, id){ ui.bsTab = id; addSheetRefresh('bizSetup'); playTick(); };
ACTIONS.bsWho = function(el, e, id){ ui.bsWho = id; addSheetRefresh('bizSetup'); };
ACTIONS.bsCycle = function(el, e, id){ addSheetClose('bizSetup'); openLifecycleEditor(id); };
// (stage edits re-render the page; the sheet follows)
afterRenderHooks.push(function(){ const o = document.getElementById('bizSetup'); if(o && !o.classList.contains('hidden') && !(document.activeElement && o.contains(document.activeElement) && /INPUT|TEXTAREA/.test(document.activeElement.tagName))) addSheetRefresh('bizSetup'); });
document.addEventListener('keydown', function(e){
  const t = e.target; if(!t || !t.id || t.id.indexOf('newStage-')!==0 || e.key!=='Enter') return;
  e.preventDefault(); e.stopPropagation(); ACTIONS.addStage({dataset:{kind:t.id.slice(9)}});
  setTimeout(function(){ addSheetRefresh('bizSetup'); const n = document.getElementById(t.id); if(n) n.focus(); }, 30);
}, true);

// ---- Op's read as one line ----
function r32DayName(ds){ const p = ds.split('-').map(Number); return new Date(p[0], p[1] - 1, p[2]).toLocaleDateString(undefined, {weekday:'long'}); }
function opTipLocal(kind){
  const day = function(ds){ const p = ds.split('-').map(Number); return new Date(p[0], p[1] - 1, p[2]); };
  const t = todayStr(), end = addDays(startOfWeekStr(t), 6), daysLeft = Math.round((day(end) - day(t))/86400000) + 1;
  if(kind==='week'){
    const dls = state.tasks.items.filter(function(x){ return x.deadline && x.status!=='done' && x.deadline >= t && x.deadline <= end; }).sort(function(a, b){ return a.deadline.localeCompare(b.deadline); });
    if(dls.length===1) return '“'+dls[0].title+'” is due '+(dls[0].deadline===t ? 'today' : r32DayName(dls[0].deadline))+'. Get it out of the way while the week’s still quiet.';
    if(dls.length > 1) return dls.length+' deadlines before Sunday, “'+dls[0].title+'” first ('+(dls[0].deadline===t ? 'today' : r32DayName(dls[0].deadline))+'). Clear one a day.';
    const load = {}; for(let i = 0; i < daysLeft; i++){ const d = addDays(t, i); load[d] = arr(state.calendar.events).filter(function(e){ return e.date===d; }).length; }
    const heavy = Object.keys(load).sort(function(a, b){ return load[b] - load[a]; })[0];
    if(heavy && load[heavy] >= 2) return (heavy===t ? 'Today' : r32DayName(heavy))+' is your heaviest day, '+load[heavy]+' things on. Do the deep work before it starts.';
    const ws = startOfWeekStr(t), n = Math.round((day(t) - day(ws))/86400000);
    let now = 0, then = 0; for(let i = 0; i <= n; i++){ const d = addDays(ws, i); now += d===t ? deepWorkMinutesTodayLive() : deepWorkMinutesFor(d); then += deepWorkMinutesFor(addDays(d, -7)); }
    if(!now && !then) return 'A clean week. Block the first morning for the work that pays and guard it.';
    return fmtDurationLabel(now)+' locked in so far this week, '+(now >= then ? fmtDurationLabel(now - then)+' ahead of' : fmtDurationLabel(then - now)+' behind')+' this point last week.';
  }
  if(kind==='goals'){
    const wk = typeof tierGoals==='function' ? tierGoals('week', weekKey()) : [], left = wk.filter(function(g){ return !g.done && !g.missed; });
    if(!wk.length) return 'No goals for this week yet. Two or three you’d be proud of on Sunday, then go.';
    if(!left.length) return 'Every goal this week is hit. Push the month’s while you’ve got the momentum.';
    return left.length+' of '+wk.length+' week goals still open, '+daysLeft+' day'+(daysLeft===1 ? '' : 's')+' left. Start with “'+left[0].label+'”.';
  }
  return '';
}
function opTipText(kind){
  const r = opReadStore()[kind];
  if(r && r.text){
    const m = /Move:\s*([^\n]+?)(?=\s*(?:Pattern|Watch):|\n|$)/.exec(r.text) || /Watch:\s*([^\n]+?)(?=\s*(?:Pattern|Move):|\n|$)/.exec(r.text);
    if(m) return m[1].trim();
    const one = String(r.text).replace(/^(Pattern|Watch|Move):\s*/gm, '').split(/(?<=[.!?])\s/)[0];
    if(one) return one.trim();
  }
  return opTipLocal(kind);
}
function opTipHtml(kind){
  // (the AI read still runs in the background; its "Move" line is the tip once it's in)
  try{ ({week:opReadWeek, goals:opReadGoals, biz:opReadBiz})[kind](); }catch(e){}
  const tx = opTipText(kind); if(!tx) return '';
  return '<div class="op-tip" data-tip="'+kind+'"><i class="op-tip-o"></i><span class="op-tip-t">'+escapeHtml(tx)+'</span>'+
    (AI.hasKey===true ? '<button class="op-tip-r" data-action="opTipAgain" data-id="'+kind+'" title="Another take">&#8635;</button>' : '')+'</div>';
}
ACTIONS.opTipAgain = function(el, e, id){
  const f = ui.opReadFacts && ui.opReadFacts[id]; if(!f) return;
  const prev = opReadStore()[id] && opReadStore()[id].text; delete opReadStore()[id]; ui['opRead_'+id] = false;
  opReadKick(id, f.facts, f.ask, {force:true, angles:f.angles, triad:f.triad, prev:prev});
  const tip = el.closest('.op-tip'); if(tip) tip.classList.add('is-busy');
};
// (a new read lands: the tip on screen picks it up)
setInterval(function(){
  document.querySelectorAll('.op-tip[data-tip]').forEach(function(tip){
    const k = tip.dataset.tip, tx = opTipText(k), s = tip.querySelector('.op-tip-t');
    if(s && tx && s.textContent!==tx){ s.textContent = tx; tip.classList.remove('is-busy'); tip.classList.remove('is-new'); void tip.offsetWidth; tip.classList.add('is-new'); }
    else if(!ui['opRead_'+k]) tip.classList.remove('is-busy');
  });
}, 1500);

// ---- Goals: one panel ----
function gxGoalRowHtml(g){
  const t = goalTracker(g), has = g.target!=null && g.target > 0, cur = goalLiveCurrent(g), pct = goalPct(g);
  const periodic = goalIsPeriodic(g), hit = g.done || (periodic && goalReached(g)), armedNow = armed.has('goalcomplete:'+g.id);
  const unit = t ? t.unit : (g.unit || ''), num = function(n){ return n==null ? '–' : unit==='$/mo' ? '$'+fmtGoalNum(n) : fmtGoalNum(n, unit); };
  const tail = unit && unit!=='$/mo' && !/^\$/.test(unit) ? ' '+escapeHtml(unit) : unit==='$/mo' ? '/mo' : '';
  return '<div class="gx-g'+(g.done ? ' is-done' : '')+(hit ? ' is-hit' : '')+(t ? ' is-live' : '')+'" data-key="gx-'+g.id+'">'+
    '<button class="gx-g-t" data-action="openGoalEditModal" data-id="'+g.id+'" title="Edit">'+(t ? '<span class="gx-g-i">'+t.icon+'</span>' : '')+'<span>'+escapeHtml(goalTitle(g))+'</span></button>'+
    '<div class="gx-g-bar">'+(has ? '<i style="width:'+Math.min(100, pct).toFixed(1)+'%"></i>' : '')+'</div>'+
    '<span class="gx-g-n">'+(has ? '<b>'+num(cur)+'</b> / '+num(g.target)+tail+(periodic ? ' <small>'+(g.period==='week' ? 'this week' : 'this month')+'</small>' : '') : '<small>'+(t ? '&#9889; live' : 'done or not')+'</small>')+'</span>'+
    '<span class="gx-g-d">'+goalDaysLeftChip(g)+'</span>'+
    '<span class="gx-g-xp">+'+goalXpOf(g).toLocaleString()+'</span>'+
    '<span class="gx-g-a">'+
      (!t && has && !g.done ? '<button data-action="goalStep" data-id="'+g.id+'" data-delta="-1" title="One less">&minus;</button><button data-action="goalStep" data-id="'+g.id+'" data-delta="1" title="One more">+</button>' : '')+
      (t && !g.done ? '' : '<button class="gx-done'+(g.done ? ' is-on' : armedNow ? ' is-armed' : '')+'" data-action="toggleGoal" data-id="'+g.id+'" title="'+(g.done ? 'Achieved' : 'Mark it done')+'">'+(g.done ? '&#10003;' : armedNow ? 'Sure?' : 'Done')+'</button>')+
    '</span>'+
  '</div>';
}
renderGoalsTab = function(){
  const items = state.goals.items.filter(function(g){ return !g.tier && !g.master; });
  const open = items.filter(function(g){ return !g.done; }).sort(function(a, b){ return (a.deadline||'9999').localeCompare(b.deadline||'9999'); });
  const done = items.filter(function(g){ return g.done; });
  const defs = masterGoalDefs(), mine = arr(state.goals && state.goals.items).filter(function(g){ return g.master && !g.tier; });
  const hist = function(kind, n, label){ const h = typeof tierHistoryHtml==='function' ? tierHistoryHtml(kind, n) : ''; return h ? '<div class="gx-hist"><small>'+label+'</small>'+h+'</div>' : ''; };
  return '<div class="gl gx">'+
    // (no add buttons here: the + in the corner adds a goal of any kind)
    opTipHtml('goals')+
    '<section class="gx-card">'+
      '<div class="gx-top">'+masterHeroHtml(defs[0])+'<div class="gx-rings">'+defs.slice(1).map(function(m){ return masterRingHtml(m, false); }).join('')+mine.map(userMasterRingHtml).join('')+'</div></div>'+
      (typeof tierCardHtml==='function' ? '<div class="gx-split">'+
        '<div class="gx-col">'+tierCardHtml('week', {add:'sheet'})+hist('week', 8, 'Past weeks')+'</div>'+
        '<div class="gx-col">'+tierCardHtml('month', {add:'sheet'})+hist('month', 6, 'Past months')+'</div></div>' : '')+
      '<div class="gx-mine"><div class="gx-h"><span>Your goals</span>'+(open.length ? '<small>'+open.length+'</small>' : '')+'<span style="flex:1"></span>'+
          (done.length ? '<button class="gx-ach" data-action="toggleForm" data-form="goalsDone">'+(ui.forms.goalsDone ? '&#9662;' : '&#9656;')+' Achieved '+done.length+'</button>' : '')+'</div>'+
        (open.length ? open.map(gxGoalRowHtml).join('') : '<div class="gx-none">Nothing of your own yet. The + in the corner adds one.</div>')+
        (done.length && ui.forms.goalsDone ? '<div class="gx-donelist">'+done.map(gxGoalRowHtml).join('')+'</div>' : '')+
      '</div>'+
    '</section>'+
  '</div>';
};

// ---- music volume, right where the music is ----
// A speaker on the music dock (top right) opens a slider; scrolling over the dock nudges it; the
// minimal locked-in player has its own; Settings → Sound has it too. They're all the same setting.
function musicVolPct(){ return Math.round((typeof fmVolumeFull==='function' ? fmVolumeFull() : 0.7)*100); }
function musicVolSet(pct){
  pct = Math.max(0, Math.min(100, Math.round(pct)));
  state.profile.musicVolume = pct/100;
  if(typeof fmRamp==='function') fmRamp(0.2);
  document.querySelectorAll('.mvol-in').forEach(function(i){ if(document.activeElement!==i) i.value = pct; });
  document.querySelectorAll('.mvol-v').forEach(function(v){ v.textContent = pct ? pct+'%' : 'Off'; });
  document.querySelectorAll('.md-vol').forEach(function(b){ b.innerHTML = musicVolIcon(pct); });
  clearTimeout(ui._mvolT); ui._mvolT = setTimeout(function(){ persist('profile'); }, 250);
}
function musicVolIcon(p){ return p==null ? musicVolIcon(musicVolPct()) : p===0 ? '&#128263;' : p < 40 ? '&#128264;' : p < 75 ? '&#128265;' : '&#128266;'; }
function musicVolSliderHtml(cls){ return '<span class="mvol '+(cls||'')+'"><input class="mvol-in" type="range" min="0" max="100" step="1" aria-label="Music volume"><b class="mvol-v"></b></span>'; }
dockHtml = (function(base){
  return function(){
    const h = base.apply(this, arguments);
    const vol = '<button class="md-b md-vol'+(ui.mdVolOpen ? ' is-on' : '')+'" data-action="mdVol" title="Music volume" aria-label="Music volume">'+musicVolIcon()+'</button>';
    const pop = ui.mdVolOpen ? '<div class="md-volpop">'+musicVolSliderHtml()+'</div>' : '';
    return h.replace(/<\/div>$/, vol+'</div>')+pop;
  };
})(dockHtml);
dockRefresh = (function(base){ return function(){ const r = base.apply(this, arguments); musicVolSync(); return r; }; })(dockRefresh);
function musicVolSync(){ const p = musicVolPct(); document.querySelectorAll('.mvol-in').forEach(function(i){ if(document.activeElement!==i && Number(i.value)!==p) i.value = p; }); document.querySelectorAll('.mvol-v').forEach(function(v){ v.textContent = p ? p+'%' : 'Off'; }); }
ACTIONS.mdVol = function(){ ui.mdVolOpen = !ui.mdVolOpen; dockRefresh(); };
document.addEventListener('input', function(e){ if(e.target && e.target.classList && e.target.classList.contains('mvol-in')) musicVolSet(Number(e.target.value)); });
document.addEventListener('mousedown', function(e){ if(ui.mdVolOpen && e.target.closest && !e.target.closest('#musicDock')){ ui.mdVolOpen = false; dockRefresh(); } });
// (scroll over the dock: a little louder or quieter)
document.addEventListener('wheel', function(e){
  if(!e.target.closest || !e.target.closest('#musicDock, .np-mrow, .mvol')) return;
  e.preventDefault(); musicVolSet(musicVolPct() + (e.deltaY < 0 ? 5 : -5));
  if(!ui.mdVolOpen && e.target.closest('#musicDock')){ ui.mdVolOpen = true; dockRefresh(); }
}, {passive:false});
// the minimal player: a slider under what's playing
npMusicRowHtml = (function(base){ return function(){ const h = base.apply(this, arguments); return /is-empty/.test(h) ? h : h.replace(/<\/div>$/, musicVolSliderHtml('is-np')+'</div>'); }; })(npMusicRowHtml);
// Settings → Sound: Operator's music
soundSettingsHtml = (function(base){
  return function(){
    return base.apply(this, arguments).replace('<div class="snd">', '<div class="snd"><div class="card section"><div class="snd-h"><div><div class="section-title" style="margin:0;">&#9835; Music</div><div class="kpi-sub">Operator’s focus tracks.</div></div></div>'+
      '<div class="snd-vol"><span>&#128264;</span>'+musicVolSliderHtml('is-set')+'<span>&#128266;</span></div></div>');
  };
})(soundSettingsHtml);
afterRenderHooks.push(musicVolSync);

// ---- Business overview on one screen ----
// Op's read is a one-line tip, and "Outreach this week" sits as a third column beside Clients and
// Pipeline instead of a strip below them, so the whole overview fits without scrolling.
renderBusinessOverview = (function(base){
  return function(){
    const realRead = opReadBiz; let readHtml = '';
    opReadBiz = function(){ readHtml = realRead(); return '%%OPTIP%%'; };
    let h; try{ h = base.apply(this, arguments); } finally { opReadBiz = realRead; }
    h = h.replace('%%OPTIP%%', opTipHtml('biz'));
    const o = outreachWeekHtml(), i = h.lastIndexOf(o);
    // (…</div> pipeline col </div> cols, outreach, </div> hq: the outreach moves into the cols)
    if(i > 0) h = h.slice(0, i).replace(/<\/div>$/, '')+'<div class="hq-col hq-col-out">'+o+'</div></div>'+h.slice(i + o.length);
    return h.replace('<div class="hq-cols">', '<div class="hq-cols is-3">');
  };
})(renderBusinessOverview);
opTipLocal = (function(base){
  return function(kind){
    if(kind!=='biz') return base.apply(this, arguments);
    const due = typeof reachOutList==='function' ? reachOutList() : [], goal = Number(state.profile.revenueGoalMonthly)||0, mrr = typeof activeMrr==='function' ? activeMrr() : 0;
    const cs = arr(state.business.clients).filter(function(c){ return c.status==='active' && Number(c.mrr) > 0; }), avg = cs.length ? cs.reduce(function(a, c){ return a + Number(c.mrr); }, 0)/cs.length : 0;
    if(due.length) return due.length+' '+(due.length===1 ? 'person is' : 'people are')+' due a touch, '+crmName(due[0].kind, due[0].x)+' first. Ten minutes of outreach before anything else.';
    if(goal > mrr && avg) { const n = Math.ceil((goal - mrr)/avg); return n+' more client'+(n===1 ? '' : 's')+' at your average ('+money(Math.round(avg))+') gets you to '+money(goal)+'. The pipeline is where that starts.'; }
    return mrr ? 'Everyone’s been touched and you’re on goal. Raise the bar or go find the next one.' : '';
  };
})(opTipLocal);
