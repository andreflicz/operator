// ============ THE CALENDAR, REBUILT (round 31) ============
// One page, no scrolling, everything about time in one place:
//  • Now: a live clock (the ring is the minute going by) and your day as a ribbon: when you wake,
//    work, eat, break, and what's on, with a line for right now
//  • This week / This month (one card, flip between them)
//  • Alarms | Reminders (one card, flip between them): your wake-up, your work hours and the rest,
//    switched on and off right there (they used to live in Settings); the full setup opens from here
//  • The month: every day shaded by how much you worked, dots in each category's color, deadlines in
//    red, reminders in gold; pick a day and its agenda is right under it
//  • Op's read on the week as one line up top. Adding anything (an event, an alarm, a reminder) is
//    the + in the corner (round 32), and the month takes the rest of the page
// Cards ease in, the month slides when you turn it, the ribbon grows in. Nothing else moves.

// the day as a ribbon, 5 AM to midnight
function cxRibbonHtml(){
  const today = todayStr(), A = 5*60, B = 24*60, pct = function(m){ return Math.max(0, Math.min(100, (m - A)/(B - A)*100)); };
  const seg = function(a, b, cls, title, color, i){ if(a==null || b==null || b <= a) return ''; return '<i class="cx-seg '+cls+'" style="left:'+pct(a).toFixed(2)+'%;width:'+(pct(b) - pct(a)).toFixed(2)+'%;'+(color ? '--c:'+color+';' : '')+'animation-delay:'+(i||0)*60+'ms" title="'+escapeHtml(title)+'"></i>'; };
  let h = '', i = 0;
  const wt = typeof wakeTimeFor==='function' ? wakeTimeFor(today) : null, wm = hmMin(wt);
  if(wm!=null) h += seg(A, wm, 'is-sleep', 'Asleep until '+fmt12Hour(wt), null, i++);
  const w = typeof workToday==='function' ? workToday() : null, works = w && w.enabled && typeof workDayToday==='function' && workDayToday();
  if(works){
    h += seg(hmMin(w.start), hmMin(w.end), 'is-work', 'Work, '+fmt12Hour(w.start)+' to '+fmt12Hour(w.end), null, i++);
    if(w.lunch) h += seg(hmMin(w.lunch), hmMin(w.lunch) + (Number(w.lunchMin)||45), 'is-lunch', 'Lunch', null, i++);
    if(w.brk) h += seg(hmMin(w.brk), hmMin(w.brk) + (Number(w.brkMin)||15), 'is-lunch', 'Break', null, i++);
  }
  arr(state.calendar.events).filter(function(e){ return e.date===today && e.time; }).forEach(function(e){ const m = hmMin(e.time); h += seg(m, m + 60, 'is-event', e.title+', '+fmt12Hour(e.time), (categoryById(e.categoryId)||{}).color, i++); });
  const n = nowMin(), marks = [];
  if(wm!=null) marks.push([wm, '&#9728;&#65039; '+fmt12Hour(wt)]);
  if(works){ marks.push([hmMin(w.start), fmt12Hour(w.start)]); marks.push([hmMin(w.end), fmt12Hour(w.end)]); }
  // (labels that would sit on top of each other: only the first shows)
  marks.sort(function(a, b){ return a[0] - b[0]; }); for(let k = marks.length - 1; k > 0; k--){ if(pct(marks[k][0]) - pct(marks[k-1][0]) < 13) marks.splice(k, 1); }
  return '<div class="cx-ribbon"><div class="cx-track">'+h+(n >= A ? '<b class="cx-nowline" style="left:'+pct(n).toFixed(2)+'%"></b>' : '')+'</div>'+
    '<div class="cx-marks">'+marks.map(function(m){ return '<span style="left:'+pct(m[0]).toFixed(2)+'%">'+m[1]+'</span>'; }).join('')+'</div></div>';
}
function cxNowCardHtml(){
  return '<section class="cx-card cx-now" style="--i:0">'+
    '<div class="cx-clock"><svg class="cx-ring" viewBox="0 0 120 120" aria-hidden="true"><circle cx="60" cy="60" r="54"/><circle id="cxRingArc" cx="60" cy="60" r="54" pathLength="60" style="stroke-dashoffset:'+(60 - new Date().getSeconds())+'"/></svg>'+
      '<div class="cx-clock-t"><div id="calendarBigClock" class="cx-time"></div><div id="calendarBigClockDate" class="cx-date"></div></div></div>'+
    '<div class="cx-sub">Your day</div>'+cxRibbonHtml()+
  '</section>';
}
function cxSwitch(on, act, title){ return '<button class="cx-switch'+(on ? ' is-on' : '')+'" data-action="'+act+'" role="switch" aria-checked="'+(on ? 'true' : 'false')+'" aria-label="'+title+'"><i></i></button>'; }
function cxAlarmsBodyHtml(){
  const wk = wakeCfg(), nw = typeof nextWake==='function' ? nextWake() : null, w = workCfg(), p = state.profile;
  const others = arr(state.focus.alarms).filter(function(a){ return !a.eventId; }).slice().sort(function(a, b){ return String(a.time).localeCompare(String(b.time)); });
  return '<div class="cx-alarms">'+
    '<div class="cx-al is-wake'+(wk.enabled ? '' : ' is-off')+'"><span class="cx-al-i">&#9728;&#65039;</span><button class="cx-al-main" data-action="cxAlarmSetup" data-id="wake"><small>Wake up'+(nw && nw.override ? ' &middot; just tomorrow' : '')+'</small><b>'+fmt12Hour(nw && wk.enabled ? nw.time : wk.time || '07:00')+'</b><span>'+(typeof wakeDaysLabel==='function' ? wakeDaysLabel(wk.days || []) : '')+'</span></button>'+cxSwitch(!!wk.enabled, 'cxWakeToggle', 'Wake-up alarm')+'</div>'+
    '<div class="cx-al is-work'+(w.enabled ? '' : ' is-off')+'"><span class="cx-al-i">&#128188;</span><button class="cx-al-main" data-action="cxAlarmSetup" data-id="work"><small>Work hours</small><b>'+fmt12Hour(w.start)+' &ndash; '+fmt12Hour(w.end)+'</b><span>'+(typeof wakeDaysLabel==='function' ? wakeDaysLabel(w.days || []) : '')+(w.lunchOn!==false ? ' &middot; lunch '+fmt12Hour(w.lunch) : '')+'</span></button>'+cxSwitch(!!w.enabled, 'cxWorkToggle', 'Work alarm')+'</div>'+
    // (Good morning's setup lives behind the wake-up alarm now)
    '<button class="cx-gm" data-action="cxAlarmSetup" data-id="wake"><span>&#127749;</span><b>Good morning</b><em>'+[wk.voice!==false ? 'Op speaks' : 'quiet', wk.news ? 'the news' : '', wk.useMusic ? 'a wake-up song' : ''].filter(Boolean).join(' &middot; ')+'</em><i>&#8250;</i></button>'+
    (others.length ? '<div class="cx-sub" style="margin-top:6px;">Other alarms</div>' : '')+
    '<div class="cx-others">'+others.map(function(a){ return '<div class="cx-o'+(a.enabled ? '' : ' is-off')+'"><b>'+fmt12Hour(a.time)+'</b><span>'+escapeHtml(a.label || 'Alarm')+(a.date ? ' <em>'+fmtDateShort(a.date)+'</em>' : '')+'</span><button class="cx-o-t" data-action="toggleAlarmEnabled" data-id="'+a.id+'">'+(a.enabled ? 'On' : 'Off')+'</button><button class="cx-o-x" data-action="openAlarmEditModal" data-id="'+a.id+'" title="Edit">&#9998;</button></div>'; }).join('')+'</div>'+
    '<div class="cx-snd"><span>Sound</span>'+['peaceful', 'standard', 'loud'].map(function(s){ return '<button class="cx-chip'+(p.alarmSound===s ? ' is-on' : '')+'" data-action="pickAlarmSound" data-sound="'+s+'">'+s[0].toUpperCase()+s.slice(1)+'</button>'; }).join('')+'<button class="cx-chip" data-action="previewAlarmSound" title="Hear it" aria-label="Hear it">&#9654;</button></div>'+
  '</div>';
}
// reminders, compact: what, when, a circle to tick it off
function cxRemindersBodyHtml(){
  const list = arr(state.focus.reminders).slice().sort(function(a, b){ return (a.date+String(a.time||'')).localeCompare(b.date+String(b.time||'')); });
  return '<div class="cx-rems">'+(list.map(function(r){
    const late = r.date < todayStr() || (r.date===todayStr() && r.time && r.time < nowHM());
    return '<div class="cx-r'+(late ? ' is-late' : '')+'"><button class="cx-r-c" data-action="dismissReminder" data-id="'+r.id+'" title="Done" aria-label="Done"></button><span><b>'+escapeHtml(r.label || 'Reminder')+'</b><small>'+escapeHtml(reminderWhen(r))+'</small></span></div>';
  }).join('') || '<div class="cx-empty">Nothing coming up.</div>')+'</div>';
}
// alarms and reminders share one card (round 32: the month gets the room)
function cxDeskHtml(){
  const rems = arr(state.focus.reminders), dueNow = rems.some(function(r){ return r.date <= todayStr(); });
  const t = ui.cxDesk || (dueNow ? 'reminders' : 'alarms');
  return '<section class="cx-card cx-desk" style="--i:2"><div class="cx-seg2'+(t==='reminders' ? ' is-m' : '')+'"><i></i><button data-action="cxDesk" data-id="alarms" class="'+(t==='alarms' ? 'is-on' : '')+'">Alarms</button><button data-action="cxDesk" data-id="reminders" class="'+(t==='reminders' ? 'is-on' : '')+'">Reminders'+(rems.length ? ' <small>'+rems.length+'</small>' : '')+'</button></div>'+
    '<div class="cx-deskbody" data-key="cxd-'+t+'">'+(t==='reminders' ? cxRemindersBodyHtml() : cxAlarmsBodyHtml())+'</div></section>';
}
function cxMonthCardHtml(){
  const y = ui.calendarYear, m = ui.calendarMonth, startDow = new Date(y, m, 1).getDay(), dim = new Date(y, m + 1, 0).getDate();
  const selected = ui.calendarSelectedDate || todayStr(), today = todayStr(), target = state.standards.deepWorkTargetMinutes || 180;
  const cats = arr(state.calendar.categories);
  let cells = '';
  for(let i = 0; i < startDow; i++) cells += '<div class="cx-d is-empty"></div>';
  for(let d = 1; d <= dim; d++){
    const ds = y+'-'+pad2(m + 1)+'-'+pad2(d), info = calDayInfo(ds), dw = ds <= today ? deepWorkMinutesFor(ds) : 0;
    const heat = dw ? Math.min(1, dw/target) : 0;
    const rem = arr(state.focus.reminders).filter(function(r){ return r.date===ds && !r.done; }).length;
    const catIds = Array.from(new Set(info.events.map(function(e){ return e.categoryId; }))).slice(0, 3);
    const dots = catIds.map(function(cid){ return '<i style="background:'+((categoryById(cid)||{}).color || '#8A90A2')+'"></i>'; }).join('')+(info.deadlines.length ? '<i class="cxdot-dl"></i>' : '')+(rem ? '<i class="cxdot-rm"></i>' : '');
    const evs = info.events.slice().sort(function(a, b){ return (a.time||'').localeCompare(b.time||''); }), first = evs[0] || (info.deadlines[0] ? {title:info.deadlines[0].title, dl:true} : null);
    const peek = first ? '<small class="cx-peek'+(first.dl ? ' is-dl' : '')+'" style="--c:'+(first.dl ? '#ff6b6b' : ((categoryById(first.categoryId)||{}).color || '#8A90A2'))+'">'+escapeHtml(first.title)+'</small>'+(evs.length + info.deadlines.length > 1 ? '<small class="cx-more">+'+(evs.length + info.deadlines.length - 1)+'</small>' : '') : '';
    cells += '<button class="cx-d'+(ds===today ? ' is-today' : '')+(ds===selected ? ' is-sel' : '')+(ds < today ? ' is-past' : '')+'" data-action="selectCalDay" data-date="'+ds+'" style="--h:'+heat.toFixed(2)+'" title="'+(dw ? fmtDurationLabel(dw)+' of deep work' : '')+'"><span>'+d+'</span>'+peek+'<em>'+dots+'</em></button>';
  }
  const label = new Date(y, m, 1).toLocaleDateString(undefined, {month:'long', year:'numeric'});
  return '<section class="cx-card cx-month" style="--i:3">'+
    '<div class="cx-mh"><button class="cx-arrow" data-action="calPrevMonth" aria-label="Previous month">&#8249;</button><b>'+label+'</b><button class="cx-arrow" data-action="calNextMonth" aria-label="Next month">&#8250;</button>'+
      '<span style="flex:1"></span><button class="cx-chip" data-action="openUpcomingPopover" title="Upcoming: the next two weeks" aria-label="Upcoming">&#128197;</button><button class="cx-chip" data-action="cxToday">Today</button></div>'+
    '<div class="cx-wk">'+DAY_LETTERS.map(function(l){ return '<span>'+l+'</span>'; }).join('')+'</div>'+
    '<div class="cx-grid '+(ui.cxDir < 0 ? 'from-left' : 'from-right')+'" data-key="cxm-'+y+'-'+m+'">'+cells+'</div>'+
    '<div class="cx-legend"><span><i class="is-heat"></i>Worked</span>'+cats.map(function(c){ return '<span><i style="background:'+c.color+'"></i>'+escapeHtml(c.label)+'</span>'; }).join('')+'<span><i class="cxdot-dl"></i>Deadline</span><span><i class="cxdot-rm"></i>Reminder</span></div>'+
    (ui.calendarShowAllDeadlines ? '<div class="cx-agenda cx-alldl" data-key="cxa-all">'+renderAllDeadlinesSection()+'</div>' : cxAgendaHtml(selected))+
  '</section>';
}
function cxAgendaHtml(ds){
  const info = calDayInfo(ds), p = ds.split('-').map(Number), lab = ds===todayStr() ? 'Today' : new Date(p[0], p[1] - 1, p[2]).toLocaleDateString(undefined, {weekday:'long', month:'short', day:'numeric'});
  const evs = info.events.slice().sort(function(a, b){ return (a.time||'').localeCompare(b.time||''); });
  const rems = arr(state.focus.reminders).filter(function(r){ return r.date===ds && !r.done; });
  const dw = ds <= todayStr() ? deepWorkMinutesFor(ds) : 0;
  const rows = evs.map(function(e){ const c = categoryById(e.categoryId); return '<button class="cx-ag is-ev" data-action="openCalItem" data-kind="event" data-id="'+e.id+'" style="--c:'+((c||{}).color || '#8A90A2')+'"><b>'+(e.time ? fmt12Hour(e.time) : 'All day')+'</b><span>'+escapeHtml(e.title)+'</span><em>'+escapeHtml((c||{}).label || '')+'</em></button>'; }).join('')+
    info.deadlines.map(function(t){ return '<button class="cx-ag is-dl" data-action="openCalItem" data-kind="deadline" data-id="'+t.id+'"><b>Due</b><span>'+escapeHtml(t.title)+'</span><em>'+(t.status==='done' ? '&#10003; done' : 'task')+'</em></button>'; }).join('')+
    rems.map(function(r){ return '<div class="cx-ag is-rm"><b>'+(r.time ? fmt12Hour(r.time) : '&#128276;')+'</b><span>'+escapeHtml(r.label)+'</span><em>reminder</em></div>'; }).join('');
  return '<div class="cx-agenda" data-key="cxa-'+ds+'"><div class="cx-ah"><b>'+lab+'</b>'+(dw ? '<span>'+fmtDurationLabel(dw)+' locked in</span>' : '')+'</div>'+
    '<div class="cx-ag-list">'+(rows || '<div class="cx-empty">Nothing on.</div>')+'</div></div>';
}
function cxTierCardHtml(){
  const t = ui.cxTier==='month' ? 'month' : 'week';
  return '<section class="cx-card cx-tier" style="--i:1"><div class="cx-seg2'+(t==='month' ? ' is-m' : '')+'"><i></i><button data-action="cxTier" data-id="week" class="'+(t==='week' ? 'is-on' : '')+'">This week</button><button data-action="cxTier" data-id="month" class="'+(t==='month' ? 'is-on' : '')+'">This month</button></div>'+
    '<div class="cx-tierbody" data-key="cxt-'+t+'">'+(typeof tierCardHtml==='function' ? tierCardHtml(t) : '')+'</div></section>';
}
renderCalendar = function(){
  return '<div class="view-header cx-header"><div>'+businessNameTagHtml()+'<div class="view-title">Calendar'+tip('Your day, your alarms, the month and your goals for the week and month, in one place. The + in the corner adds an event, an alarm or a reminder.')+'</div></div>'+(typeof opTipHtml==='function' ? opTipHtml('week') : '')+'</div>'+
    '<div class="calx">'+
      '<div class="cx-left">'+cxNowCardHtml()+cxTierCardHtml()+cxDeskHtml()+'</div>'+
      cxMonthCardHtml()+
    '</div>';
};
// ---- what the buttons do ----
calPrevMonth = (function(base){ return function(){ ui.cxDir = -1; return base.apply(this, arguments); }; })(calPrevMonth);
calNextMonth = (function(base){ return function(){ ui.cxDir = 1; return base.apply(this, arguments); }; })(calNextMonth);
ACTIONS.cxToday = function(){ const n = new Date(); ui.cxDir = (n.getFullYear()*12 + n.getMonth()) < (ui.calendarYear*12 + ui.calendarMonth) ? -1 : 1; ui.calendarYear = n.getFullYear(); ui.calendarMonth = n.getMonth(); ui.calendarSelectedDate = todayStr(); renderView(); };
ACTIONS.cxTier = function(el, e, id){ ui.cxTier = id==='month' ? 'month' : 'week'; renderView(); };
ACTIONS.cxDesk = function(el, e, id){ ui.cxDesk = id==='reminders' ? 'reminders' : 'alarms'; renderView(); };
ACTIONS.cxWakeToggle = function(){ const w = wakeCfg(); w.enabled = !w.enabled; persist('focus'); playTick(); renderView(); };
ACTIONS.cxWorkToggle = function(){ const w = workCfg(); w.enabled = !w.enabled; if(w.enabled){ const d = workDayState(); if(!d.rangAt && hmMin(w.start)!=null && hmMin(w.start) <= nowMin()) d.rangAt = Date.now(); } persist('focus'); playTick(); renderView(); };
ACTIONS.cxAlarmSetup = function(el, e, id){ ui.alarmTab = id==='work' ? 'work' : 'wake'; if(typeof openWakeSetup==='function') openWakeSetup(); };
// the minute ring
setInterval(function(){ const a = document.getElementById('cxRingArc'); if(a) a.style.strokeDashoffset = String(60 - new Date().getSeconds()); }, 1000);
// (the now line keeps up)
setInterval(function(){ if(ui.view==='calendar' && !document.querySelector('.overlay:not(.hidden)') && !(document.activeElement && /INPUT|TEXTAREA|SELECT/.test(document.activeElement.tagName))) renderView(); }, 60000);
