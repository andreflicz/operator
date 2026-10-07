// ============ CLOCK / TIMER / ALARMS ============
function stretchLockedHeaderLine(){
  const header = document.querySelector('.locked-in-header');
  const main = document.querySelector('.main');
  if(!header || !main) return;
  const mainRect = main.getBoundingClientRect();
  const headerRect = header.getBoundingClientRect();
  const leftGap = Math.max(0, headerRect.left - mainRect.left);
  const rightGap = Math.max(0, mainRect.right - headerRect.right);
  header.style.marginLeft = (-leftGap)+'px';
  header.style.marginRight = (-rightGap)+'px';
  header.style.paddingLeft = (leftGap+16)+'px';
  header.style.paddingRight = (rightGap+16)+'px';
  // Pull the header up over .main's top padding — that padding used to leave an empty
  // black band above the locked-in header.
  const padTop = parseFloat(getComputedStyle(main).paddingTop)||0;
  header.style.marginTop = (-padTop)+'px';
}
window.addEventListener('resize', stretchLockedHeaderLine);
function tickClocks(){
  const now = new Date();
  const el = document.getElementById('liveClock');
  if(el){
    el.textContent = now.toLocaleDateString(undefined,{weekday:'long', month:'long', day:'numeric'}) + ' \u00b7 ' + now.toLocaleTimeString(undefined,{hour:'numeric', minute:'2-digit'});
  }
  const bigClock = document.getElementById('calendarBigClock');
  if(bigClock){
    bigClock.textContent = now.toLocaleTimeString(undefined,{hour:'numeric', minute:'2-digit', second:'2-digit'});
  }
  const bigClockDate = document.getElementById('calendarBigClockDate');
  if(bigClockDate){
    bigClockDate.textContent = now.toLocaleDateString(undefined,{weekday:'long', month:'long', day:'numeric'});
  }
  const liveClockBig = document.getElementById('liveClockBig');
  if(liveClockBig){
    liveClockBig.textContent = now.toLocaleTimeString(undefined,{hour:'numeric', minute:'2-digit', second:'2-digit'});
  }
}
function startClocks(){
  tickClocks();
  setInterval(function(){
    tickClocks();
    if(lastRenderedDay && todayStr()!==lastRenderedDay) handleDayRollover(lastRenderedDay);
  }, 1000);
}
// Midnight rollover. Previously nothing re-rendered at 12 AM unless a session was running,
// so on a non-working day the app stayed on yesterday until you clicked something.
function handleDayRollover(prevDay){
  splitActiveModeAtMidnight();
  if(ui.calendarSelectedDate===prevDay){
    ui.calendarSelectedDate = todayStr();
    ui.calendarYear = new Date().getFullYear();
    ui.calendarMonth = new Date().getMonth();
  }
  renderView();
}
// An off-time / shooting block that runs past midnight is logged per day: the part before
// midnight is saved to the day it belongs to and the block carries on from 12 AM. Break
// mode is tied to the focus session, so it's left alone.
function splitActiveModeAtMidnight(){
  const active = state.modes.active;
  if(!active || active.linkedFocus) return;
  let changed = false;
  while(todayStr(new Date(active.startedAt)) < todayStr()){
    const start = new Date(active.startedAt);
    const midnight = new Date(start.getFullYear(), start.getMonth(), start.getDate()+1).getTime();
    const minutes = Math.max(1, Math.round((midnight-active.startedAt)/60000));
    state.modes.history.push({id:uid(), type:active.type, date:todayStr(start), startedAt:active.startedAt, endedAt:midnight, minutes:minutes, note:active.note||'', sleep:!!active.sleep, splitAtMidnight:true});
    active.startedAt = midnight;
    changed = true;
  }
  if(changed) persist('modes');
}
function startModeTicker(){
  setInterval(function(){
    const active = state.modes.active;
    if(!active) return;
    const el = document.getElementById('modeElapsed');
    if(el) el.textContent = formatElapsed(Date.now()-active.startedAt);
  }, 1000);
}
function tickLiveDeepWork(){
  const mins = deepWorkMinutesTodayLive();
  const statBox = document.getElementById('statDeepWorkBox');
  if(statBox) statBox.innerHTML = deepWorkStatInnerHtml(mins);
  const focusBox = document.getElementById('statDeepWorkTodayBox');
  if(focusBox) focusBox.innerHTML = '<div class="stat-chip-label">Deep Work Today</div><div class="stat-chip-value">'+fmtHours(mins)+'</div><div class="kpi-sub">'+fmtDurationLabel(mins)+'</div>';
  const chip1 = document.getElementById('stdDeepWorkChip');
  if(chip1) chip1.outerHTML = deepWorkChipHtml('stdDeepWorkChip');
  const chip2 = document.getElementById('stdDeepWorkChip2');
  if(chip2) chip2.outerHTML = deepWorkChipHtml('stdDeepWorkChip2');
}
function startFocusTicker(){
  setInterval(function(){
    const as0 = state.focus.activeSession;
    if(ui.currentTaskId && ui.currentTaskStartedAt && (!as0 || !as0.onBreak)){
      const ctEl = document.getElementById('currentTaskElapsed');
      if(ctEl) ctEl.textContent = formatElapsed(Date.now()-ui.currentTaskStartedAt);
      const ctBar = document.getElementById('currentTaskElapsedBar');
      if(ctBar) ctBar.textContent = formatElapsed(Date.now()-ui.currentTaskStartedAt);
    }
    const as = state.focus.activeSession;
    if(as && !as.onBreak) tickLiveDeepWork();
    if(!as) return;
    if(as.onBreak){
      return;
    }
    const el = document.getElementById('focusElapsed');
    if(el){
      const ms = Date.now() - as.startedAt;
      el.textContent = formatElapsed(ms);
    }
    if(as.plannedMinutes){
      const ms = Date.now() - as.startedAt;
      const pct = clamp(Math.round((ms/60000/as.plannedMinutes)*100),0,100);
      const bar = document.getElementById('focusProgressBar');
      if(bar) bar.style.width = pct+'%';
      if(pct>=100 && !as.completeFired){
        as.completeFired = true;
        playSessionComplete();
        const card = document.getElementById('focusHeroCard');
        if(card) card.classList.add('focus-complete-pulse');
        openTimesUpModal();
        if(state.profile.notifyOnFocusEnd !== false){
          try{ if('Notification' in window && Notification.permission==='granted'){ new Notification('Operator: Focus time is up!'); } }catch(e){}        }
        persist('focus');
      }
    } else {
      const bar = document.getElementById('focusProgressBar');
      if(bar){
        const dwTarget = state.standards.deepWorkTargetMinutes || 180;
        const liveToday = deepWorkMinutesTodayLive();
        const openPct = clamp(Math.round((liveToday/dwTarget)*100),0,100);
        bar.style.width = openPct+'%';
        bar.classList.toggle('good', openPct>=100);
        const sub = bar.parentElement && bar.parentElement.nextElementSibling;
        if(sub && sub.classList.contains('kpi-sub')) sub.textContent = 'Open-ended · '+fmtDurationLabel(liveToday)+' of '+fmtDurationLabel(dwTarget)+" today's goal";
      }
    }
  }, 1000);
}
let firedKeys = new Set();
let lastMinute = '';
let ringInterval = null;
function startAlarmChecker(){
  setInterval(function(){
    checkReminders();
    const now = new Date();
    const hm = nowHM(now);
    const dateKey = todayStr(now);
    const minuteKey = dateKey+'T'+hm;
    if(minuteKey!==lastMinute){ firedKeys.clear(); lastMinute=minuteKey; }
    (state.focus.alarms||[]).forEach(function(al){
      if(!al.enabled) return;
      if(al.time!==hm) return;
      if(al.date){ if(al.date!==dateKey) return; } else { if(al.days.indexOf(now.getDay())<0) return; }
      const fk = al.id+minuteKey;
      if(firedKeys.has(fk)) return;
      firedKeys.add(fk);
      triggerAlarm(al);
      if(al.date){
        state.focus.alarms = state.focus.alarms.filter(function(x){ return x.id!==al.id; });
        persist('focus'); renderView();
      }
    });
  }, 4000);
}
let lastFiredAlarm = null;
function triggerAlarm(al){
  lastFiredAlarm = al;
  document.getElementById('alarmLabel').textContent = (al && al.label) || 'Reminder';
  const extra = document.getElementById('alarmExtra');
  if(extra) extra.innerHTML = renderAlarmExtra(al);
  onEventAlarm(al);
  document.getElementById('alarmOverlay').classList.remove('hidden');
  playBeep();
  clearInterval(ringInterval);
  ringInterval = setInterval(playBeep, 2400);
  try{
    if('Notification' in window && Notification.permission==='granted'){
      new Notification('Operator: ' + ((al && al.label) || 'Reminder'));
    }
  }catch(e){}
}
function dismissAlarm(){ clearInterval(ringInterval); document.getElementById('alarmOverlay').classList.add('hidden'); }
function snoozeAlarm(){ const al = lastFiredAlarm; dismissAlarm(); setTimeout(function(){ triggerAlarm(Object.assign({}, al||{}, {label:((al&&al.label)||'Reminder')+' (snoozed)', eventId:null})); }, 5*60*1000); }

