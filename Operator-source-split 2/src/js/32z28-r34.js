// ============ ROUND 34: TODAY'S HERO MIXED, ONE WEEK EVERYWHERE, COCKPIT, ONE-CIRCLE PILL ============
// • The streak and Time worked are one card: this week's days as the streak's circles, each ring
//   filling with the hours you worked that day (a ✓ when the standard was met).
// • Under the business name is a line from Op (his own words with a key, a local line without).
// • The weather bar sits under the card and spreads across the whole width.
// • Settings → Look & Sound → Today: "Split" (Deep work and Tasks in their own chips) or "All in one"
//   (deep work, time worked, tasks and the streak in one panel).
// • Every "this week" number starts Monday (Time worked used to start Sunday, so it never matched
//   the This week panel or Analytics).
// • A second locked-in view, Cockpit, picked in Settings next to the timer styles.
// • The activity pill: the category color and the session timer are one ring.

// ---- one week, Monday to Sunday, the same everywhere ----
function weekWork(){
  const ws = startOfWeekStr(todayStr()), today = todayStr(), target = state.standards.deepWorkTargetMinutes || 180, days = [];
  let total = 0;
  for(let i = 0; i < 7; i++){
    const d = addDays(ws, i), m = d===today ? deepWorkMinutesTodayLive() : d > today ? null : deepWorkMinutesFor(d);
    days.push({d:d, m:m, today:d===today, future:d > today}); total += m || 0;
  }
  return {days:days, total:total, target:target, yesterday:deepWorkMinutesFor(addDays(today, -1))};
}
timeWorkedHtml = function(){
  const w = weekWork(), top = Math.max(w.target, ...w.days.map(function(x){ return x.m||0; }));
  return '<div class="stat-chip-label">Time Worked</div>'+
    '<div class="tw-top"><div><div class="tw-v">'+fmtDurationLabel(w.total)+'</div><div class="tw-s">this week &middot; yesterday '+fmtDurationLabel(w.yesterday)+'</div></div>'+
    '<div class="tw-bars">'+w.days.map(function(x){ return '<i class="'+(x.today?'is-today':'')+(x.m!=null && x.m>=w.target?' is-hit':'')+(x.future?' is-future':'')+'" title="'+weekdayShort(x.d)+(x.m!=null ? ': '+fmtDurationLabel(x.m) : '')+'"><u style="height:'+(x.m ? Math.max(6, x.m/top*100) : 0).toFixed(1)+'%"></u><span>'+weekdayShort(x.d).slice(0,1)+'</span></i>'; }).join('')+'</div></div>';
};
function fmtH(m){ if(!m) return '0'; const h = m/60; return h >= 10 ? Math.round(h)+'h' : h >= 1 ? (Math.round(h*10)/10)+'h' : m+'m'; }

// ---- the stats row under the hero: one compact card ----
// the streak, this week as the streak's circles (each ring is the hours worked that day), deep work
// today and tasks today. (This week's total lives in the This week panel; it shows here only when
// that panel is off.)
function weekPanelOn(){ return state.dashboardPanels.enabled.week!==false && arr(state.dashboardPanels.order).indexOf('week')>=0; }
function streakWorkHtml(o){
  o = o || {};
  const w = weekWork(), streak = computeStreak(), allDone = dayStandardsComplete(todayStr()), full = !o.compact;
  const C = 2*Math.PI*15;
  const days = w.days.map(function(x){
    const status = isBreakDay(x.d) ? 'broken' : dayVisualStatus(x.d), off = isDayOff(x.d) && status!=='worked';
    const f = x.m ? Math.min(1, x.m/w.target) : 0;
    const cls = 'sw-day is-'+(off ? 'off' : status)+(x.today ? ' is-today' : '')+(x.m!=null && x.m >= w.target ? ' is-hit' : '');
    const title = weekdayShort(x.d)+(x.m!=null ? ' · '+fmtDurationLabel(x.m)+' worked' : '')+' · '+(status==='worked' ? 'standard met' : status==='broken' ? 'streak broke' : off ? 'day off' : status==='failed' ? 'missed' : x.future ? 'upcoming' : 'in progress');
    return '<div class="'+cls+'" title="'+escapeHtml(title)+'">'+
      '<span class="sw-c"><svg viewBox="0 0 36 36" aria-hidden="true"><circle class="sw-tr" cx="18" cy="18" r="15"/>'+(f ? '<circle class="sw-ar" cx="18" cy="18" r="15" stroke-dasharray="'+(C*f).toFixed(1)+' '+C.toFixed(1)+'"/>' : '')+'</svg>'+
        '<b>'+(status==='worked' ? '&#10003;' : status==='broken' ? '&#10005;' : weekdayShort(x.d).slice(0,1))+'</b></span>'+
      '<span class="sw-h">'+(x.future ? '' : fmtH(x.m))+'</span></div>';
  }).join('');
  const dwToday = deepWorkMinutesTodayLive();
  const todayTasks = state.tasks.items.filter(function(t){ return t.status==='today' && !isOngoingDoneToday(t); });
  const doneToday = state.tasks.items.filter(function(t){ return (t.status==='done' && t.completedAt===todayStr()) || isOngoingDoneToday(t); });
  const showTotal = !full || !weekPanelOn();
  return '<div class="sw'+(full ? ' is-row' : '')+(streak > 0 ? ' is-hot' : '')+'">'+
    '<div class="sw-l"><div class="sw-streak"><span class="sw-flame">&#128293;</span><b class="'+(o.ticked ? 'streak-tick-pop' : '')+'">'+streak+'</b><span>day'+(streak===1 ? '' : 's')+'<br>streak</span>'+(allDone ? '<span class="streak-ok" title="Today\'s standard: done">&#10003;</span>' : '')+(full ? tip((streak===0 ? 'Hit today\'s standard to start one. ' : allDone ? 'Today\'s in the bag. ' : 'Hit today\'s standard to keep it going. ')+'The streak counts days in a row you hit Today\'s Standard: the deep-work target plus your checklist. Each circle is a day this week; its ring fills with the hours you worked.') : '')+'</div>'+
      (showTotal ? '<div class="sw-tw"><b>'+fmtDurationLabel(w.total)+'</b><span>this week</span></div>' : '')+'</div>'+
    '<div class="sw-days">'+days+'</div>'+
    (full ? '<div class="sw-k" id="swDeep" title="Deep work today"><span>Deep work today</span><b>'+fmtHours(dwToday)+'<small> / '+fmtHours(w.target)+'</small></b><i class="sw-bar"><u style="width:'+Math.min(100, dwToday/w.target*100).toFixed(1)+'%"></u></i></div>'+
      '<div class="sw-k" data-action="goToFinishedTasks" title="Tasks done today"><span>Tasks today</span><b>'+doneToday.length+'<small> / '+(doneToday.length+todayTasks.length)+'</small></b></div>' : '')+
    '<button class="streak-edit-btn sw-edit" data-action="openStreakEdit" title="Edit streak days">Edit</button>'+
  '</div>';
}

// ---- Op's line under the business name ----
function thOpLocal(){
  const h = new Date().getHours(), p = state.profile, name = (p.name || '').split(' ')[0];
  const greet = h < 5 ? 'Still up' : h < 12 ? 'Morning' : h < 18 ? 'Afternoon' : 'Evening';
  const dw = deepWorkMinutesTodayLive(), target = state.standards.deepWorkTargetMinutes || 180, nx = typeof nextUpTask==='function' ? nextUpTask() : null;
  if(h < 5) return greet+', '+name+'. Whatever it is, it’ll still be there after some sleep.';
  if(dw >= target) return greet+', '+name+'. Target’s hit. Anything else today is a bonus.';
  if(dw > 0) return greet+', '+name+'. '+fmtDurationLabel(dw)+' in, '+fmtDurationLabel(target - dw)+' to go.'+(nx ? ' “'+nx.title+'” is next.' : '');
  if(nx) return greet+', '+name+'. “'+nx.title+'” is up first when you’re ready.';
  return greet+', '+name+'. Clean slate today.';
}
function thOpKey(){ const h = new Date().getHours(); return todayStr()+':'+(h < 5 ? 0 : h < 12 ? 1 : h < 15 ? 2 : h < 18 ? 3 : 4); }
function thOpText(){
  const s = ui.thOp;
  if(s && s.k===thOpKey() && s.text) return s.text;
  thOpKick();
  return thOpLocal();
}
function thOpKick(force){
  if(typeof aiWrite!=='function' || AI.hasKey===false) return;
  const k = thOpKey();
  if(!force && ui.thOp && ui.thOp.k===k) return;   // (one try per part of the day: a failed call doesn't retry on every render)
  ui.thOp = {k:k, busy:true};
  const dw = deepWorkMinutesTodayLive(), target = state.standards.deepWorkTargetMinutes || 180, nx = typeof nextUpTask==='function' ? nextUpTask() : null;
  const todayTasks = state.tasks.items.filter(function(t){ return t.status==='today' && !isOngoingDoneToday(t); }).length, done = state.tasks.items.filter(function(t){ return (t.status==='done' && t.completedAt===todayStr()) || isOngoingDoneToday(t); }).length;
  const ev = arr(state.calendar.events).filter(function(e){ return e.date===todayStr() && e.time && e.time > nowHM(); }).sort(function(a, b){ return a.time.localeCompare(b.time); })[0];
  const facts = 'Time: '+fmt12Hour(nowHM())+', '+weekdayShort(todayStr())+'. Deep work today: '+fmtDurationLabel(dw)+' of '+fmtDurationLabel(target)+'. Tasks: '+done+' done, '+todayTasks+' open. Streak: '+computeStreak()+' days.'+(nx ? ' Next up: '+nx.title+'.' : '')+(ev ? ' Next on the calendar: '+ev.title+' at '+fmt12Hour(ev.time)+'.' : '');
  aiWrite('Write the one line I see under my business name at the top of my dashboard right now. You, talking to me, like a friend who knows my day: warm or witty, personal, a nod to where I stand. One sentence, under 16 words. Greet me by name if it fits. No quotes, no em dashes, nothing else.\n\nFacts: '+facts, {max:80}).then(function(t){
    t = String(t || '').trim().replace(/^["“]|["”]$/g, '').replace(/\s*[—–]\s*/g, ', ');
    ui.thOp = {k:k, text:t || null};
    const el = document.querySelector('.th-op-t');
    if(el && t){ el.textContent = t; const box = el.closest('.th-op'); if(box){ box.classList.remove('is-new'); void box.offsetWidth; box.classList.add('is-new'); } }
  }).catch(function(){ ui.thOp = {k:k, text:null}; });
}
ACTIONS.thOpAgain = function(el){ const b = el.closest('.th-op'); if(b) b.classList.add('is-busy'); thOpKick(true); };
function thOpHtml(){
  return '<div class="th-op" title="From Op"><i class="th-op-o"></i><span class="th-op-t">'+escapeHtml(thOpText())+'</span>'+
    (AI.hasKey===true ? '<button class="th-op-r" data-action="thOpAgain" title="Another line">&#8635;</button>' : '')+'</div>';
}

// ---- the hero's left side ----
renderTodayHero = (function(base){
  return function(greeting){
    const h = base.apply(this, arguments);
    const a = h.indexOf('<div class="th-left">'), b = h.indexOf('<div class="th-card">') >= 0 ? h.indexOf('<div class="th-card">') : h.indexOf('<div class="th-right">');
    if(a < 0 || b < 0) return h;
    const p = state.profile, streak = computeStreak(), ticked = /streak-tick-pop/.test(h.slice(a, b));
    const left = '<div class="th-left th-mix">'+
      '<div class="th-biz">'+escapeHtml(p.businessName || 'Operator')+'</div>'+
      thOpHtml()+
      (p.bigClockOnToday ? '<div id="liveClockBig" class="cal-big-clock th-bigclock"></div>' : '<div class="th-sub" id="liveClock"></div>')+
      (state.profile.skyChip===false ? '' : '<div class="th-wx">'+skyChipHtml()+'</div>')+
    '</div>';
    void streak;
    return h.slice(0, a)+left+h.slice(b);
  };
})(renderTodayHero);
// the sky pill, spread out: the weather on the left, the sun's whole day across the rest
skyChipHtml = (function(base){
  return function(){
    const h = base.apply(this, arguments);
    if(!h) return h;
    const w = dayWindow(), now = wxNow(), m = new Date().getHours()*60 + new Date().getMinutes();
    const left = m < w.rise ? 'Sun up in '+fmtDurationLabel(w.rise - m) : m < w.set ? fmtDurationLabel(w.set - m)+' of light left' : 'Sun’s down';
    return h.replace('<span class="skyp-sun">', (now ? '<span class="skyp-hl">H '+now.hi+'&deg; &middot; L '+now.lo+'&deg;</span>' : '')+'<span class="skyp-left">'+left+'</span><span class="skyp-sun">');
  };
})(skyChipHtml);

// ---- the stat chips become that one card ----
renderPersonalStatsPanel = (function(base){
  return function(){
    const h = base.apply(this, arguments);
    return h.replace(/<div class="grid grid-3 stat-chip-row">[\s\S]*?<\/div><div class="card" style="text-align:center;margin-top:10px;">/, '<div class="sw-wrap">'+streakWorkHtml()+'</div><div class="card" style="text-align:center;margin-top:10px;">');
  };
})(renderPersonalStatsPanel);
PANEL_RENDERERS.personalStats = function(){ return renderPersonalStatsPanel(); };
// (deep work today keeps ticking while you work)
setInterval(function(){
  const k = document.querySelector('#swDeep b'); if(!k) return;
  const v = fmtHours(deepWorkMinutesTodayLive()); if(k.firstChild && k.firstChild.nodeType===3 && k.firstChild.textContent!==v) k.firstChild.textContent = v;
}, 30000);

// ---- Cockpit: a second locked-in view ----
const LOCKED_STYLES = [['player', 'Player', 'The task like a song playing: big cover, the timer as its progress.'], ['cockpit', 'Cockpit', 'Timer, task and your whole day at a glance: the week, deep work, what’s next.']];
function lockedStyle(){ return state.profile.lockedStyle==='cockpit' ? 'cockpit' : 'player'; }
function cockpitHtml(){
  const as = state.focus.activeSession;
  const cur = ui.currentTaskId ? state.tasks.items.find(function(t){ return t.id===ui.currentTaskId; }) : null;
  const nx = typeof nextUpTask==='function' ? nextUpTask() : null;
  const m = as.method && typeof LOCK_METHODS!=='undefined' ? LOCK_METHODS[as.method.id] : null;
  const st = typeof methodState==='function' ? methodState() : null;
  const elapsed = Date.now() - as.startedAt, target = state.standards.deepWorkTargetMinutes || 180, dw = deepWorkMinutesTodayLive();
  const face = (typeof timerFaceHtml==='function' && timerFaceHtml(m ? m.icon : '&#128274;')) ||
    '<button class="np-art tm tm-ring" data-action="timerNext" data-style="ring" title="Tap for another timer style"><svg viewBox="0 0 120 120" aria-hidden="true">'+timerFaceSvg('ring')+'</svg><span class="tm-in"><i>'+(m ? m.icon : '&#128274;')+'</i><b class="tm-t"></b></span></button>';
  const queue = state.tasks.items.filter(function(t){ return t.status==='today' && !isOngoingDoneToday(t) && (!cur || t.id!==cur.id); }).slice(0, 4);
  const done = state.tasks.items.filter(function(t){ return t.status==='done' && t.completedAt===todayStr(); }).length;
  const ev = arr(state.calendar.events).filter(function(e){ return e.date===todayStr() && e.time && e.time > nowHM(); }).sort(function(a, b){ return a.time.localeCompare(b.time); })[0];
  setTimeout(function(){ if(typeof timerTick==='function') timerTick(); }, 20);
  return '<div class="ckp">'+
    '<div class="ckp-timer">'+face+
      '<div class="ckp-k">'+(m && as.method.id!=='block' ? m.label : 'Locked in')+'</div>'+
      '<div class="ckp-sub">'+(st ? '<span id="msLine">'+methodLine(st)+'</span>' : (as.plannedMinutes ? 'until '+fmtTimeShort(as.startedAt + as.plannedMinutes*60000) : 'open-ended'))+'</div>'+
      '<span id="focusElapsed" class="ckp-hide">'+formatElapsed(elapsed)+'</span>'+
    '</div>'+
    '<div class="ckp-task">'+
      '<div class="ckp-cap">On it</div>'+
      '<div class="ckp-title">'+(cur ? escapeHtml(cur.title) : 'Deep work')+'</div>'+
      (cur ? '<button class="ckp-done" data-action="finishCurrentTask">&#10003; Done</button>' : '')+
      (queue.length ? '<div class="ckp-cap" style="margin-top:18px;">Then</div><div class="ckp-q">'+queue.map(function(t, i){ return '<div class="ckp-qi'+(nx && nx.id===t.id ? ' is-next' : '')+'"><span>'+(i+1)+'</span>'+escapeHtml(t.title)+'</div>'; }).join('')+'</div>' : '')+
      '<div class="ckp-ctl">'+
        '<button class="np-c" data-action="openBreakNotePrompt" title="Take a break">&#9749;</button>'+
        (typeof npMusicBtnHtml==='function' ? npMusicBtnHtml(true) : '')+
        '<button class="np-c np-out" data-action="openStopFocus" title="Lock out">&#9632;</button>'+
      '</div>'+
    '</div>'+
    '<div class="ckp-day">'+
      '<div class="ckp-cap">Today</div>'+
      '<div class="ckp-row"><span>Deep work</span><b>'+fmtHours(dw)+'<small> / '+fmtHours(target)+'</small></b></div><i class="sw-bar"><u style="width:'+Math.min(100, dw/target*100).toFixed(1)+'%"></u></i>'+
      '<div class="ckp-row"><span>Tasks done</span><b>'+done+'</b></div>'+
      (ev ? '<div class="ckp-row"><span>Next up</span><b class="ckp-ev">'+fmt12Hour(ev.time)+' &middot; '+escapeHtml(ev.title)+'</b></div>' : '')+
      '<div class="ckp-cap" style="margin-top:16px;">This week</div>'+streakWorkHtml({compact:true})+
    '</div>'+
  '</div>';
}
renderLockedMinimal = (function(base){
  return function(){
    const as = state.focus.activeSession;
    if(lockedStyle()!=='cockpit' || !as || as.onBreak) return base.apply(this, arguments);
    return '<div class="np np-locked is-cockpit">'+
      '<div class="np-bg"></div>'+
      '<div class="np-top">'+npClockHtml()+'<span style="flex:1"></span>'+(typeof mctlHtml==='function' ? mctlHtml('mctl-np') : '')+lockedViewBtnHtml()+'</div>'+
      '<div class="np-main">'+cockpitHtml()+'</div>'+
    '</div>';
  };
})(renderLockedMinimal);
ACTIONS.lockedStyleSet = function(el, e, id){ state.profile.lockedStyle = id; persist('profile'); playTick(); renderView(); };

// ---- Settings → Look & Sound: Today and the locked-in view ----
soundSettingsHtml = (function(base){
  return function(){
    const ls = lockedStyle();
    return base.apply(this, arguments)+
      '<div class="section r34-set"><div class="section-title">Locked in</div><div class="card">'+
        '<div class="kpi-sub">Locked-in view (the Minimal button on Focus, or M)</div>'+
        '<div class="ls-picks">'+LOCKED_STYLES.map(function(x){ return '<button class="ls-pick'+(x[0]===ls ? ' is-on' : '')+'" data-action="lockedStyleSet" data-id="'+x[0]+'"><span class="ls-mini is-'+x[0]+'"><i></i><i></i><i></i></span><b>'+x[1]+'</b><small>'+x[2]+'</small></button>'; }).join('')+'</div>'+
      '</div></div>';
  };
})(soundSettingsHtml);

// ---- the activity pill: one circle, color and timer together ----
updateActivityPill = (function(base){
  return function(){
    base.apply(this, arguments);
    const el = document.getElementById('activityPill'); if(!el) return;
    const ring = el.querySelector('.ap-ring'), dot = el.querySelector('.ap-dot');
    if(ring && dot) dot.remove();
    if(ring) ring.classList.add('is-cat');
  };
})(updateActivityPill);

// ---- auto lock-in, stricter ----
// It used to start once the *latest* app was a work app and the stretch behind it (work and neutral
// apps like Finder or Operator itself) was 12 minutes long. A minute in Final Cut after ten in Finder
// was enough. Now:
//  • only minutes you were actually active on work apps count (neutral apps don't add, they just
//    don't break the stretch; a long stretch of neutral ends it)
//  • the work has to be steady: most of the time since the stretch began, not a few blips
//  • the latest work run has to be at least two minutes (no lock-in off a passing click)
//  • outside your work hours it takes longer
//  • it holds back for half an hour after you say an auto session wasn't work
//  • when it starts, the notice has a "Not working" button that throws it away on the spot
function autoWorkStretch(ivs){
  let i = ivs.length - 1;
  if(i < 0 || activityCategory(ivs[i].app)!=='work') return null;
  let start = ivs[i].start, work = 0, neutralRun = 0, lastRun = 0, inLast = true;
  for(; i >= 0; i--){
    const iv = ivs[i], c = activityCategory(iv.app), len = Math.max(0, iv.end - iv.start);
    if(i < ivs.length - 1 && start - iv.end > APP_ACTIVITY_GAP_MS*4) break;
    if(c==='work'){ work += len; neutralRun = 0; if(inLast) lastRun += len; start = iv.start; }
    else if(c==='neutral'){ neutralRun += len; inLast = false; if(neutralRun > 5*60000) break; start = iv.start; }
    else break;
  }
  return {start:start, workMs:work, lastRunMs:lastRun};
}
function autoWorkMsFrom(ivs, from){
  let ms = 0;
  ivs.forEach(function(iv){ if(activityCategory(iv.app)!=='work') return; const a = Math.max(iv.start, from), b = iv.end; if(b > a) ms += b - a; });
  return ms;
}
function autoThresholdMin(){
  const st = state.settings.appTracking || {}, base = Math.max(1, Number(st.thresholdMinutes)||12);
  const ph = typeof workPhase==='function' ? workPhase() : 'off';
  return ph==='work' || ph==='off' ? base : Math.round(base*1.75);
}
autoLockInBlockedReason = (function(base){
  return function(){
    const r = base.apply(this, arguments); if(r) return r;
    if(state.focus.autoRejectedAt && Date.now() - state.focus.autoRejectedAt < 30*60000) return 'rejected';
    return null;
  };
})(autoLockInBlockedReason);
checkAutoLockIn = (function(base){
  return function(){
    const st = state.settings.appTracking;
    if(!st || st.enabled===false || st.autoLockIn===false) return;
    if(state.focus.activeSession) return base.apply(this, arguments);   // (ending an auto session: unchanged)
    const ivs = state.appActivity.todayIntervals; if(!ivs.length) return;
    const last = ivs[ivs.length-1];
    if(Date.now() - last.end > APP_ACTIVITY_GAP_MS) return;
    if(autoLockInBlockedReason()) return;
    const s = autoWorkStretch(ivs); if(!s) return;
    const from = Math.max(s.start, autoLockInCountFrom({start:s.start}));
    const workMin = autoWorkMsFrom(ivs, from)/60000, wallMin = (last.end - from)/60000, need = autoThresholdMin();
    if(workMin < need) return;
    if(workMin < wallMin*0.7) return;
    if(s.lastRunMs < 2*60000) return;
    if(autoLockInMeta.intervalStart===from) return;
    autoLockInMeta = {app:last.app, intervalStart:from};
    const staged = ui.stagedTaskId; ui.stagedTaskId = null; ui.currentTaskId = null; ui.currentTaskStartedAt = null;
    startFocus(null);
    ui.stagedTaskId = staged;
    const a = state.focus.activeSession;
    if(a){ a.autoStarted = true; a.startedAt = from; a.autoApp = last.app; a.noTask = true; }
    persist('focus'); renderView();
    showToast('Locked in automatically: on '+last.app+' since '+fmt12Hour(nowHM(new Date(from)))+'.', {icon:'&#128274;', actionLabel:'Not working', actionAction:'autoLockReject', duration:12000});
  };
})(checkAutoLockIn);
ACTIONS.autoLockReject = function(){
  const a = state.focus.activeSession; if(!a || !a.autoStarted) return;
  state.focus.activeSession = null;
  state.focus.autoRejectedAt = Date.now();
  state.focus.lastSessionEndedAt = Date.now();
  autoLockInMeta = {app:null, intervalStart:null};
  persist('focus'); clearToasts(); renderView();
  showToast('Thrown away. Auto lock-in waits half an hour.', {icon:'&#128465;', duration:4000});
};

// ---- XP comes off with a session you throw out ----
// XP is counted from your sessions, so removing one rewinds what it paid. (The count is cached by
// a signature; edits to a session's length are part of it now, so an edit rewinds too.)
xpSig = (function(base){
  return function(){
    let h = 0; arr(state.focus.sessions).forEach(function(s){ h = (h*31 + (s.minutes||0)) % 1000000007; });
    return base.apply(this, arguments)+'|'+h;
  };
})(xpSig);
// the recap: throwing a session out says what it costs; an auto one shows its XP is waiting on you
ACTIONS.recapDiscard = (function(base){
  return function(el, e, id){
    const before = xpSummary().total;
    base.apply(this, arguments);
    xpLast = null;
    const lost = before - xpSummary().total;
    if(lost > 0){ clearToasts(); showToast('Session removed: '+lost.toLocaleString()+' XP came off with it', {icon:'&#128465;', actionLabel:'Undo', actionAction:'undoRecapDiscard', duration:7000}); }
  };
})(ACTIONS.recapDiscard);

