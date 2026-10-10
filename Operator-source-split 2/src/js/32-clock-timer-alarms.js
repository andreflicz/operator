// ============ CLOCK / TIMER / ALARMS ============
// The locked-in header's tint + divider run edge to edge of the content area. Measured from
// the view container (not the header itself, whose margins this sets), and re-run whenever
// the content area changes size — collapsing the sidebar used to leave a black strip
// because the header was measured mid-animation.
function stretchLockedHeaderLine(){
  const header = document.querySelector('.locked-in-header');
  const main = document.querySelector('.main');
  const root = document.getElementById('viewRoot');
  if(!header || !main || !root) return;
  const mainRect = main.getBoundingClientRect();
  const rootRect = root.getBoundingClientRect();
  const rs = getComputedStyle(root);
  const leftGap = Math.max(0, rootRect.left + (parseFloat(rs.paddingLeft)||0) - mainRect.left);
  const rightGap = Math.max(0, mainRect.right - (main.offsetWidth - main.clientWidth) - (rootRect.right - (parseFloat(rs.paddingRight)||0)));
  header.style.marginLeft = (-leftGap)+'px';
  header.style.marginRight = (-rightGap)+'px';
  header.style.paddingLeft = (leftGap+16)+'px';
  header.style.paddingRight = (rightGap+16)+'px';
  const padTop = parseFloat(getComputedStyle(main).paddingTop)||0;
  header.style.marginTop = (-padTop)+'px';
}
(function(){
  const watch = function(){
    const main = document.querySelector('.main');
    if(!main || !window.ResizeObserver) return;
    new ResizeObserver(function(){ stretchLockedHeaderLine(); }).observe(main);
    const nav = document.getElementById('sidebarNav');
    if(nav) nav.addEventListener('transitionend', stretchLockedHeaderLine);
  };
  if(document.readyState==='loading') document.addEventListener('DOMContentLoaded', watch); else watch();
})();
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
    if(el) setTimerText(el, Date.now()-active.startedAt);
  }, 1000);
}
// Deep work only changes once a minute — rebuild those boxes only when the number actually moves,
// not on every tick (rebuilding them every second made the page relayout constantly).
let lastLiveDeepMins = null;
function tickLiveDeepWork(){
  const mins = deepWorkMinutesTodayLive();
  if(mins===lastLiveDeepMins) return;   // a render in between already shows the current value
  lastLiveDeepMins = mins;
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
    checkBreakTimer();
    checkMethodTimer();
    if(!as) return;
    tickMethodStrip();
    if(as.onBreak){
      return;
    }
    const el = document.getElementById('focusElapsed');
    if(el) setTimerText(el, Date.now() - as.startedAt);
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
        // Only touch the DOM when something actually changed — rewriting the same text every
        // second re-lays-out the card under the clock.
        if(bar.style.width!==openPct+'%') bar.style.width = openPct+'%';
        if(bar.classList.contains('good')!==(openPct>=100)) bar.classList.toggle('good', openPct>=100);
        const sub = bar.parentElement && bar.parentElement.nextElementSibling;
        const txt = 'Open-ended · '+fmtDurationLabel(liveToday)+' of '+fmtDurationLabel(dwTarget)+" today's goal";
        if(sub && sub.classList.contains('kpi-sub') && sub.textContent!==txt) sub.textContent = txt;
      }
    }
  }, 1000);
}
let ringInterval = null;
// Checks every 2 s (and the moment the window comes back into view). See 32b-wake.js for
// how missed minutes are caught up instead of skipped.
function startAlarmChecker(){
  const run = function(){
    try{ checkReminders(); checkTouchReminder(); }catch(e){}
    checkAllAlarms();
  };
  run();
  setInterval(run, 2000);
}
let lastFiredAlarm = null;
function triggerAlarm(al){
  lastFiredAlarm = al;
  document.getElementById('alarmLabel').textContent = (al && al.label) || 'Reminder';
  const extra = document.getElementById('alarmExtra');
  if(extra) extra.innerHTML = renderAlarmExtra(al);
  onEventAlarm(al);
  document.getElementById('alarmOverlay').classList.remove('hidden');
  pingWrapper();
  clearInterval(ringInterval);
  if(!startAlarmMediaIfAny(al)){
    playBeep();
    ringInterval = setInterval(playBeep, 2400);
  }
  try{
    if('Notification' in window && Notification.permission==='granted'){
      new Notification('Operator: ' + ((al && al.label) || 'Reminder'));
    }
  }catch(e){}
}
function dismissAlarm(){ clearInterval(ringInterval); stopWakeMedia(false); document.getElementById('alarmOverlay').classList.add('hidden'); }
function snoozeAlarm(){ const al = lastFiredAlarm; dismissAlarm(); snoozeRegularAlarm(al); }

