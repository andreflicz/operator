// ============ DAYS OFF / STANDARD / STREAK ============
function isDayOff(dateStr){ return state.daysOff.dates.indexOf(dateStr)>=0; }
function toggleDayOff(){
  const d = todayStr();
  const idx = state.daysOff.dates.indexOf(d);
  const wasOff = idx>=0;
  if(wasOff) state.daysOff.dates.splice(idx,1); else state.daysOff.dates.push(d);
  if(wasOff) playStartChime(); else playRestSound();
  persist('daysOff'); renderView();
}
function getStandardRec(dateStr){
  return state.standards.completions.find(function(c){ return c.date===dateStr; }) || {date:dateStr, doneIds:[]};
}
// Deep work = locked-in sessions of type "deep", minus time spent on tasks (or task
// categories) marked "doesn't count toward deep work" (e.g. Meta ads).
function sessionType(s){ return s.type || 'deep'; }
function rawSessionMinutesFor(dateStr, type){
  type = type||'deep';
  if(RC){
    const idx = memo('sessIdx', function(){
      const m = {};
      state.focus.sessions.forEach(function(s){ const d = m[s.date] || (m[s.date] = {}); const t = sessionType(s); d[t] = (d[t]||0) + (s.minutes||0); });
      return m;
    });
    return (idx[dateStr] && idx[dateStr][type]) || 0;
  }
  return state.focus.sessions.filter(function(s){ return s.date===dateStr && sessionType(s)===type; }).reduce(function(a,s){ return a+(s.minutes||0); },0);
}
// Deep work counts almost everything: every locked-in session, plus the time you timed a task
// as "Now" without locking in. (Only time on not-work apps inside a session comes off.)
function deepWorkMinutesFor(dateStr){
  return Math.max(0, rawSessionMinutesFor(dateStr,'deep') + looseTaskMinutesFor(dateStr) - distractionMinutesFor(dateStr));
}
function looseTaskMinutesFor(dateStr){
  if(RC){
    const idx = memo('looseIdx', function(){ const m = {}; arr(state.focus.taskSegments).forEach(function(sg){ if(sg.inSession!==false) return; m[sg.date] = (m[sg.date]||0) + Math.max(0, Math.round((sg.end-sg.start)/60000)); }); return m; });
    return idx[dateStr] || 0;
  }
  return arr(state.focus.taskSegments).filter(function(sg){ return sg.date===dateStr && sg.inSession===false; }).reduce(function(a, sg){ return a + Math.max(0, Math.round((sg.end-sg.start)/60000)); }, 0);
}
// The finished part of today's deep work is cached between renders (the timer asks every second;
// recomputing it from every session and the app-activity log each time made ticks heavy).
let dwTodayCache = null;
function deepWorkMinutesTodayLive(){
  const today = todayStr();
  if(RC || !dwTodayCache || dwTodayCache.date!==today || dwTodayCache.gen!==renderGen || Date.now()-dwTodayCache.at > 30000)
    dwTodayCache = {date:today, gen:renderGen, at:Date.now(), v:deepWorkMinutesFor(today)};
  let mins = dwTodayCache.v;
  const as = state.focus.activeSession;
  if(as && sessionType(as)==='deep'){
    if(as.onBreak) mins += Math.floor((as.frozenElapsedMs||0)/60000);
    else mins += Math.floor((Date.now()-as.startedAt)/60000);
  } else if(!as && ui.currentTaskId && ui.currentTaskStartedAt){
    mins += Math.floor((Date.now()-ui.currentTaskStartedAt)/60000);
  }
  return Math.max(0, mins);
}
function taskCountsAsDeepWork(taskOrId){
  const t = typeof taskOrId!=='string' ? taskOrId : RC
    ? memo('taskById', function(){ const m = {}; state.tasks.items.forEach(function(x){ m[x.id] = x; }); return m; })[taskOrId]
    : state.tasks.items.find(function(x){ return x.id===taskOrId; });
  return true;
}
function excludedTaskMinutesFor(dateStr){
  if(RC){
    const idx = memo('exclIdx', function(){
      const m = {};
      arr(state.focus.taskSegments).forEach(function(sg){ if(sg.inSession===false || taskCountsAsDeepWork(sg.taskId)) return; m[sg.date] = (m[sg.date]||0) + Math.max(0, Math.round((sg.end-sg.start)/60000)); });
      return m;
    });
    return idx[dateStr] || 0;
  }
  return arr(state.focus.taskSegments).filter(function(sg){ return sg.date===dateStr && sg.inSession!==false && !taskCountsAsDeepWork(sg.taskId); })
    .reduce(function(a,sg){ return a+Math.max(0, Math.round((sg.end-sg.start)/60000)); },0);
}
// Shooting time counts toward the daily standard target alongside deep work.
function standardWorkMinutesFor(dateStr){
  return deepWorkMinutesFor(dateStr) + rawSessionMinutesFor(dateStr,'shooting') + modeMinutesFor(dateStr,'shooting');
}
function fmtHours(mins){ return ((Number(mins)||0)/60).toFixed(1)+'h'; }
function manualStandardsDoneFor(dateStr){
  const items = arr(state.standards.items).filter(function(it){ return !it.createdAt || it.createdAt<=dateStr; });
  if(!items.length) return true;
  const rec = RC ? memo('complByDate', function(){ const m = {}; state.standards.completions.forEach(function(c){ m[c.date] = c; }); return m; })[dateStr]
                 : state.standards.completions.find(function(c){ return c.date===dateStr; });
  if(!rec) return false;
  return items.every(function(it){ return rec.doneIds.indexOf(it.id)>=0; });
}
function trainedDoneFor(dateStr){
  if(RC) return !!memo('gymDates', function(){ const m = {}; arr(state.health.gymLog).forEach(function(g){ m[g.date] = true; }); return m; })[dateStr];
  return arr(state.health.gymLog).some(function(g){ return g.date===dateStr; });
}
function ongoingStandardTasksDoneFor(dateStr){
  // Only count tasks that already existed (and were still active) on that date — a task
  // added later can't retroactively require a check-off on days before it existed, or
  // every day before its creation would wrongly show as an incomplete standard forever.
  const pool = RC ? memo('stdOngoing', function(){ return arr(state.tasks.items).filter(function(t){ return t.ongoing && t.includeInStandard && t.status!=='done'; }); })
                  : arr(state.tasks.items).filter(function(t){ return t.ongoing && t.includeInStandard && t.status!=='done'; });
  const tasks = pool.filter(function(t){ return (t.createdAt||dateStr)<=dateStr; });
  if(!tasks.length) return true;
  return tasks.every(function(t){ return arr(t.ongoingDoneDates).indexOf(dateStr)>=0; });
}
function dayStandardsComplete(dateStr){
  if(RC) return memo('dsc:'+dateStr, function(){ return dayStandardsCompleteRaw(dateStr); });
  return dayStandardsCompleteRaw(dateStr);
}
function dayStandardsCompleteRaw(dateStr){
  const target = state.standards.deepWorkTargetMinutes || 180;
  const ov = state.standards.dayOverrides && state.standards.dayOverrides[dateStr];
  if(ov==='done') return true;
  if(ov==='missed') return false;
  const deepWorkDone = standardWorkMinutesFor(dateStr) >= target;
  const trainedOk = trainedDoneFor(dateStr);
  return deepWorkDone && trainedOk && manualStandardsDoneFor(dateStr) && ongoingStandardTasksDoneFor(dateStr);
}
function toggleStandard(id, dateStr){
  const d = dateStr || todayStr();
  let rec = state.standards.completions.find(function(c){ return c.date===d; });
  if(!rec){ rec = {date:d, doneIds:[]}; state.standards.completions.push(rec); }
  const wasAllDone = dayStandardsComplete(d);
  const idx = rec.doneIds.indexOf(id);
  if(idx>=0) rec.doneIds.splice(idx,1); else rec.doneIds.push(id);
  const nowAllDone = dayStandardsComplete(d);
  if(!wasAllDone && nowAllDone) playFanfare(); else playTick();
  persist('standards'); renderView();
}
// A day can look "incomplete" purely because the manual standards checklist (e.g. "Stayed within
// calorie target") was never tapped before midnight — even though deep work, training, and ongoing
// tasks were all genuinely done. Since that checklist can only ever be toggled for the day it applies
// to, once the date rolls over there was previously no way to go back and correct a simple missed tap,
// which silently and permanently broke the streak. This surfaces a small fixup prompt for exactly that
// case — yesterday only, and only when the real work was actually done — so it can't be used to fudge
// a day that was genuinely incomplete.
function yesterdayStandardsFixup(){
  const y = addDays(todayStr(), -1);
  if(dayStandardsComplete(y) || isDayOff(y)) return null;
  const target = state.standards.deepWorkTargetMinutes || 180;
  const deepWorkDone = standardWorkMinutesFor(y) >= target;
  const trainedOk = trainedDoneFor(y);
  const tasksOk = ongoingStandardTasksDoneFor(y);
  if(!(deepWorkDone && trainedOk && tasksOk)) return null;
  const rec = getStandardRec(y);
  const missing = arr(state.standards.items).filter(function(it){ return rec.doneIds.indexOf(it.id)<0; });
  if(!missing.length) return null;
  return { date:y, rec:rec, missing:missing };
}
function yesterdayStandardsFixupHtml(){
  const fix = yesterdayStandardsFixup();
  if(!fix) return '';
  return '<div class="card" style="text-align:center;border-color:var(--accent);margin-top:10px;">'+
    '<div class="kpi-label" style="margin-bottom:6px;">Looks like you did the work yesterday — just missing this:'+tip('Tap it to confirm and restore yesterday to your streak.')+'</div>'+
    '<div class="row" style="justify-content:center;">'+
      fix.missing.map(function(it){ return '<span class="chip" data-action="toggleStandard" data-id="'+it.id+'" data-date="'+fix.date+'">'+escapeHtml(it.label)+'</span>'; }).join('')+
    '</div>'+
  '</div>';
}
function requiredWorkingDays(){ return 7 - (state.standards.daysOffAllowedPerWeek!=null ? state.standards.daysOffAllowedPerWeek : 2); }
function trailingWeekWorkingDays(dateStr){
  let count = 0;
  for(let i=0;i<7;i++){ if(dayStandardsComplete(addDays(dateStr,-i))) count++; }
  return count;
}
function trailingWeekQualifies(dateStr){ return trailingWeekWorkingDays(dateStr) >= requiredWorkingDays(); }
function computeStreak(){ return memo('streak', computeStreakRaw); }
function computeStreakRaw(){
  let count = 0;
  let d = new Date();
  if(!dayStandardsComplete(todayStr(d)) && !isDayOff(todayStr(d))){
    d.setDate(d.getDate()-1);
  }
  const base = state.standards.streakBase;
  while(true){
    const ds = todayStr(d);
    // A manually set count ("my streak was N as of this day") anchors the walk back.
    if(base && base.date===ds){ count += Number(base.count)||0; break; }
    if(dayStandardsComplete(ds)){ count++; d.setDate(d.getDate()-1); continue; }
    if(isDayOff(ds)){ d.setDate(d.getDate()-1); continue; }
    break;
  }
  return count;
}
function firstEverWorkedDate(){ return memo('firstWorked', firstEverWorkedDateRaw); }
function firstEverWorkedDateRaw(){
  const dates = state.focus.sessions.map(function(s){return s.date;}).concat(
    state.standards.completions.filter(function(c){ return c.doneIds && c.doneIds.length>0; }).map(function(c){return c.date;})
  );
  if(!dates.length) return null;
  return dates.sort()[0];
}
function dayVisualStatus(dateStr){ return memo('dvs:'+dateStr, function(){ return dayVisualStatusRaw(dateStr); }); }
function dayVisualStatusRaw(dateStr){
  if(dateStr > todayStr()) return 'future';
  const startDate = firstEverWorkedDate();
  if(!startDate || dateStr < startDate) return 'neutral';
  if(dayStandardsComplete(dateStr)) return 'worked';
  let notWorkedCount = 0;
  for(let i=0;i<7;i++){
    const d = addDays(dateStr,-i);
    if(d < startDate) continue;
    if(!dayStandardsComplete(d)) notWorkedCount++;
  }
  const maxOff = state.standards.daysOffAllowedPerWeek!=null ? state.standards.daysOffAllowedPerWeek : 2;
  return notWorkedCount > maxOff ? 'failed' : 'neutral';
}
function isBreakDay(dateStr){
  if(dateStr > todayStr()) return false;
  return dayVisualStatus(dateStr)==='failed' && dayVisualStatus(addDays(dateStr,-1))!=='failed';
}
// Compact week strip for the streak card: one dot per day (3 back, today, 3 ahead).
function renderStreakWeekDots(){
  const today = todayStr();
  const days = []; for(let i=-3;i<=3;i++) days.push(addDays(today,i));
  return '<div class="streak-week">'+days.map(function(d){
    const status = isBreakDay(d) ? 'broken' : dayVisualStatus(d);
    const off = isDayOff(d) && status!=='worked';
    const cls = 'streak-dot streak-dot-'+(off?'off':status)+(d===today?' is-today':'');
    const title = weekdayShort(d)+' · '+(status==='worked'?'standard met':status==='broken'?'streak broke':off?'day off':status==='failed'?'missed':status==='future'?'upcoming':'—');
    return '<div class="streak-day" title="'+escapeHtml(title)+'"><span class="'+cls+'">'+(status==='worked'?'&#10003;':status==='broken'?'&#10005;':'')+'</span><span class="streak-day-letter">'+weekdayShort(d).slice(0,1)+'</span></div>';
  }).join('')+'</div>';
}
function renderStreakCard(streak, opts){
  opts = opts || {};
  const hot = streak>0;
  return '<div class="streak-card'+(hot?' is-hot':'')+(opts.compact?' is-compact':'')+'">'+
    '<div class="streak-main">'+
      '<span class="streak-flame">&#128293;</span>'+
      '<span class="streak-num'+(opts.ticked?' streak-tick-pop':'')+'">'+streak+'</span>'+
      '<span class="streak-unit">day'+(streak===1?'':'s')+'<br>streak</span>'+
    '</div>'+
    renderStreakWeekDots()+
    (opts.status ? '<div class="streak-status">'+opts.status+'</div>' : '')+
    (opts.editable ? '<button class="streak-edit-btn" data-action="openStreakEdit" title="Edit streak days">Edit</button>' : '')+
  '</div>';
}
function renderWeekGrid(){
  const today = todayStr();
  const days = []; for(let i=-3;i<=3;i++) days.push(addDays(today,i));
  return '<div class="row" style="justify-content:center;">'+days.map(function(d){
    const isToday = d===today;
    const broken = isBreakDay(d);
    const status = dayVisualStatus(d);
    if(broken){
      return '<div class="week-chip week-chip-broken" title="Streak broke here">'+weekdayShort(d).toUpperCase()+'<span class="week-chip-x">&#10005;</span></div>';
    }
    const border = status==='worked' ? '#3FBE8E' : status==='failed' ? '#E8636B' : '#262B38';
    const bg = status==='worked' ? 'rgba(63,190,142,.14)' : status==='failed' ? 'rgba(232,99,107,.14)' : '#191D27';
    return '<div class="week-chip'+(isToday?' week-chip-today':'')+'" style="border:2px solid '+border+';background:'+bg+';color:var(--text);">'+weekdayShort(d).toUpperCase()+'</div>';
  }).join('')+'</div>';
}

