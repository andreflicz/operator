// ============ APP ACTIVITY TRACKING ============
// Data flow: the native Operator wrapper script polls the frontmost macOS app every
// ~10s (via osascript/System Events) and serves recent "<timestamp>\t<appName>[\t<idleSeconds>]"
// lines (idleSeconds = time since the last keyboard/mouse input; older wrappers omit it)
// over a local, loopback-only HTTP endpoint (APP_ACTIVITY_URL). This page polls that
// endpoint, turns the raw samples into continuous per-app intervals, keeps a rolling
// per-day minutes total, and (optionally) auto-starts/ends a real focus session when
// the same app holds the foreground for a while. None of this leaves the machine.
const APP_ACTIVITY_GAP_MS = 30000; // >30s with no matching sample = treat as a gap/idle
let autoLockInMeta = { app:null, intervalStart:null };
function parseActivityLogText(text){
  const lines = String(text||'').split('\n');
  const out = [];
  for(let i=0;i<lines.length;i++){
    const line = lines[i];
    if(!line) continue;
    const tab = line.indexOf('\t');
    if(tab<0) continue;
    const ts = parseInt(line.slice(0,tab),10);
    // <ts>\t<app>[\t<idleSeconds>[\t<site>]] — in a browser the site's domain stands in for
    // the app, so websites are tracked (and sorted into work / not work) like apps.
    const parts = line.slice(tab+1).split('\t');
    const host = (parts[0]||'').trim();
    const idle = parts.length>1 ? parseInt(parts[1],10) : null;
    const site = (parts[2]||'').trim();
    if(!ts || !host) continue;
    out.push({ts:ts, app:site || host, via:site ? host : null, idle:(idle==null || isNaN(idle)) ? null : idle});
  }
  return out;
}
function samplesToIntervals(samples){
  const intervals = [];
  let cur = null;
  samples.forEach(function(s){
    if(cur && cur.app===s.app && (s.ts-cur.end)<=APP_ACTIVITY_GAP_MS){
      cur.end = s.ts;
    } else {
      if(cur) intervals.push(cur);
      cur = {app:s.app, start:s.ts, end:s.ts};
    }
  });
  if(cur) intervals.push(cur);
  return intervals;
}
function intervalsToAppMinutes(intervals){
  const map = {};
  arr(intervals).forEach(function(iv){
    const mins = Math.max(0, Math.round((iv.end-iv.start)/60000));
    if(mins<=0) return;
    map[iv.app] = (map[iv.app]||0) + mins;
  });
  return map;
}
function maxAppMinutes(base, add){
  const out = Object.assign({}, base||{});
  Object.keys(add||{}).forEach(function(k){ out[k]=Math.max(out[k]||0, add[k]); });
  return out;
}
function appMinutesForDate(dateStr){
  if(dateStr===todayStr()) return intervalsToAppMinutes(state.appActivity.todayIntervals);
  return state.appActivity.days[dateStr] || {};
}
function topAppsForDate(dateStr, n){
  const mins = appMinutesForDate(dateStr);
  return Object.keys(mins).map(function(app){ return {app:app, minutes:mins[app]}; })
    .sort(function(a,b){ return b.minutes-a.minutes; }).slice(0, n||8);
}
function topAppsAllTime(n){
  const totals = {};
  Object.keys(state.appActivity.days).forEach(function(d){
    const m = state.appActivity.days[d];
    Object.keys(m).forEach(function(app){ totals[app]=(totals[app]||0)+m[app]; });
  });
  const todayMins = intervalsToAppMinutes(state.appActivity.todayIntervals);
  Object.keys(todayMins).forEach(function(app){ totals[app]=(totals[app]||0)+todayMins[app]; });
  return Object.keys(totals).map(function(app){ return {app:app, minutes:totals[app]}; })
    .sort(function(a,b){ return b.minutes-a.minutes; }).slice(0, n||8);
}
function currentForegroundApp(){
  const ivs = state.appActivity.todayIntervals;
  if(!ivs.length) return null;
  const last = ivs[ivs.length-1];
  if(Date.now()-last.end > APP_ACTIVITY_GAP_MS) return null; // stale sample — likely idle/asleep
  return last.app;
}
function updateCurrentAppIndicator(){
  const el = document.getElementById('currentAppIndicator');
  if(!el) return;
  const st = state.settings.appTracking;
  if(!st || st.enabled===false){ el.textContent=''; el.style.display='none'; return; }
  const app = currentForegroundApp();
  if(app){ el.textContent = '\u25CF '+app; el.style.display = 'block'; }
  else { el.textContent=''; el.style.display='none'; }
  if(typeof updateActivityPill==='function') updateActivityPill();
}
let lastActivitySig = '', pastDayCounts = {};
async function pollAppActivity(){
  const st = state.settings.appTracking;
  if(!st || st.enabled===false) { updateCurrentAppIndicator(); return; }
  let text;
  try{
    const res = await fetch(APP_ACTIVITY_URL, {cache:'no-store'});
    if(!res.ok) return;
    text = await res.text();
  }catch(e){ return; } // no wrapper/server running — silently do nothing
  // Nothing new since the last poll → nothing to recompute or save.
  const sig = text.length+':'+text.slice(-80);
  if(sig===lastActivitySig){ updateCurrentAppIndicator(); checkAutoLockIn(); return; }
  lastActivitySig = sig;
  // Only count active usage: a sample taken after the keyboard/mouse has been idle for a
  // while is dropped, which leaves a gap that splits the interval (an app just sitting in
  // the foreground no longer counts as "being on it").
  const idleLimit = Number(st.idleSeconds)||60;
  const samples = parseActivityLogText(text).filter(function(s){ return s.idle==null || s.idle < idleLimit; });
  if(!samples.length){ updateCurrentAppIndicator(); return; }
  const today = todayStr();
  const byDate = {};
  samples.forEach(function(s){ const d = todayStr(new Date(s.ts)); (byDate[d]=byDate[d]||[]).push(s); });
  Object.keys(byDate).forEach(function(d){
    if(d===today) return; // only finalize PAST days; today stays live below
    if(pastDayCounts[d]===byDate[d].length) return; // already finalized with these exact samples
    const ivs = samplesToIntervals(byDate[d].sort(function(a,b){return a.ts-b.ts;}));
    // The log is re-read in full on every poll, so a past day's samples show up again and
    // again. Keep the larger of stored vs. recomputed per app (idempotent) instead of adding,
    // which used to inflate past days by another copy every 15 seconds.
    state.appActivity.days[d] = maxAppMinutes(state.appActivity.days[d], intervalsToAppMinutes(ivs));
    // Also keep the part that happened while locked in (Analytics shows that first).
    if(!state.appActivity.lockedDays) state.appActivity.lockedDays = {};
    state.appActivity.lockedDays[d] = maxAppMinutes(state.appActivity.lockedDays[d], clipIntervalsToWindows(ivs, sessionWindowsFor(d)));
    pastDayCounts[d] = byDate[d].length;
  });
  const todaySamples = (byDate[today]||[]).sort(function(a,b){return a.ts-b.ts;});
  state.appActivity.todayIntervals = samplesToIntervals(todaySamples);
  state.appActivity.todayDate = today;
  persist('appActivity');
  updateCurrentAppIndicator();
  checkAutoLockIn();
  checkDistraction();
  if(ui.view==='focus' && ui.focusTab==='analytics') renderView();
}
// Why auto lock-in is currently held back (or null when it's allowed to run).
function autoLockInBlockedReason(){
  if(isDayOff(todayStr())) return 'dayoff';
  if(state.modes.active) return 'mode';
  const st = state.settings.appTracking || {};
  const cooldownMs = Math.max(0, Number(st.cooldownMinutes)||0)*60000;
  const lastStop = state.focus.lastManualStopAt;
  if(lastStop && Date.now()-lastStop < cooldownMs) return 'cooldown';
  return null;
}
// Steady usage only counts from the latest point that resets it: the current app interval's
// start, the end of the last session (manual or auto), the end of the cooldown after a
// manual lock-out, or the end of off-time/shooting. Without this, an app that had been in
// the foreground during the session itself counted toward auto lock-in the moment you
// locked out.
function autoLockInCountFrom(interval){
  const st = state.settings.appTracking || {};
  const cooldownMs = Math.max(0, Number(st.cooldownMinutes)||0)*60000;
  let from = interval.start;
  if(state.focus.lastSessionEndedAt) from = Math.max(from, state.focus.lastSessionEndedAt);
  if(state.focus.lastManualStopAt) from = Math.max(from, state.focus.lastManualStopAt + cooldownMs);
  if(state.modes.lastEndedAt) from = Math.max(from, state.modes.lastEndedAt);
  return from;
}
// Auto lock-in only counts time on apps/sites marked "work" (Operator itself is neutral:
// it neither starts nor ends a session). Once you've been on work apps for the threshold,
// a session starts, dated back to when that work stretch began — no prompt; you review the
// day's sessions in the end-of-day recap. It ends (at the last moment you were on a work
// app) once you've been on non-work apps — or away — for the grace period.
function workStretchStart(ivs){
  let i = ivs.length-1;
  if(i<0 || activityCategory(ivs[i].app)!=='work') return null;
  let start = ivs[i].start;
  for(i=i-1; i>=0; i--){
    const iv = ivs[i];
    if(start - iv.end > APP_ACTIVITY_GAP_MS) break;
    const c = activityCategory(iv.app);
    if(c==='work' || c==='neutral') start = iv.start; else break;
  }
  return start;
}
function lastWorkEnd(ivs){
  for(let i=ivs.length-1;i>=0;i--) if(activityCategory(ivs[i].app)==='work') return ivs[i].end;
  return null;
}
function checkAutoLockIn(){
  const st = state.settings.appTracking;
  if(!st || st.enabled===false || st.autoLockIn===false) return;
  const ivs = state.appActivity.todayIntervals;
  if(!ivs.length) return;
  const last = ivs[ivs.length-1];
  const isLive = (Date.now()-last.end) <= APP_ACTIVITY_GAP_MS;
  const activeSession = state.focus.activeSession;

  if(isLive && !activeSession){
    if(autoLockInBlockedReason()) return;
    const stretch = workStretchStart(ivs);
    if(stretch==null) return;
    const from = Math.max(stretch, autoLockInCountFrom({start:stretch}));
    const elapsedMin = (last.end-from)/60000;
    if(elapsedMin >= (st.thresholdMinutes||12) && autoLockInMeta.intervalStart!==from){
      autoLockInMeta = {app:last.app, intervalStart:from};
      startFocus(null);
      const s = state.focus.activeSession;
      if(s){ s.autoStarted = true; s.startedAt = from; s.autoApp = last.app; }
      persist('focus'); renderView();
      showToast('Locked in automatically — on '+last.app+' since '+fmt12Hour(nowHM(new Date(from))), {icon:'&#128274;'});
    }
    return;
  }

  if(activeSession && activeSession.autoStarted && !activeSession.onBreak){
    const cat = activityCategory(last.app);
    const lw = lastWorkEnd(ivs) || activeSession.startedAt;
    const grace = (st.graceMinutes||3)*60000;
    if(isLive && cat==='work') return;
    if(isLive && cat==='neutral' && Date.now()-lw < grace*3) return;
    const awayLimit = isLive ? grace : Math.max(10*60000, grace*2);
    if(Date.now()-lw >= awayLimit){
      autoEndFocusSession(Math.max(lw, activeSession.startedAt+60000));
      autoLockInMeta = {app:null, intervalStart:null};
    }
  }
}
function autoEndFocusSession(endAt){
  const s = state.focus.activeSession;
  if(!s) return;
  const endedAt = Math.min(Date.now(), endAt || Date.now());
  const minutes = Math.max(1, Math.round((endedAt-s.startedAt)/60000));
  if(ui.currentTaskId){ accumulateCurrentTaskTime(ui.currentTaskId); persist('tasks'); }
  state.focus.sessions.push({id:uid(), type:sessionType(s), date:todayStr(new Date(s.startedAt)), startedAt:s.startedAt, endedAt:endedAt, minutes:minutes, completedTasks:arr(s.completedTasks), note:'', autoStopped:true, auto:!!s.autoStarted, reviewed:false, app:s.autoApp||null});
  state.focus.activeSession = null;
  state.focus.lastSessionEndedAt = endedAt;
  if(state.modes.active && state.modes.active.linkedFocus){ endMode(); }
  playStopSound();
  persist('focus'); renderView();
  showToast('Session ended — you moved off work apps at '+fmt12Hour(nowHM(new Date(endedAt)))+' ('+fmtDurationLabel(minutes)+' logged)', {icon:'&#9209;'});
}
function startAppActivityPolling(){
  pollAppActivity();
  setInterval(pollAppActivity, 15000);
}

