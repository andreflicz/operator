// ============ APP ACTIVITY TRACKING ============
// Data flow: the native Operator wrapper script polls the frontmost macOS app every
// ~10s (via osascript/System Events) and serves recent "<timestamp>\t<appName>" lines
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
    const app = line.slice(tab+1).trim();
    if(!ts || !app) continue;
    out.push({ts:ts, app:app});
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
function mergeAppMinutes(base, add){
  const out = Object.assign({}, base||{});
  Object.keys(add||{}).forEach(function(k){ out[k]=(out[k]||0)+add[k]; });
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
}
async function pollAppActivity(){
  const st = state.settings.appTracking;
  if(!st || st.enabled===false) { updateCurrentAppIndicator(); return; }
  let text;
  try{
    const res = await fetch(APP_ACTIVITY_URL, {cache:'no-store'});
    if(!res.ok) return;
    text = await res.text();
  }catch(e){ return; } // no wrapper/server running — silently do nothing
  const samples = parseActivityLogText(text);
  if(!samples.length) return;
  const today = todayStr();
  const byDate = {};
  samples.forEach(function(s){ const d = todayStr(new Date(s.ts)); (byDate[d]=byDate[d]||[]).push(s); });
  Object.keys(byDate).forEach(function(d){
    if(d===today) return; // only finalize PAST days; today stays live below
    const ivs = samplesToIntervals(byDate[d].sort(function(a,b){return a.ts-b.ts;}));
    state.appActivity.days[d] = mergeAppMinutes(state.appActivity.days[d], intervalsToAppMinutes(ivs));
  });
  const todaySamples = (byDate[today]||[]).sort(function(a,b){return a.ts-b.ts;});
  state.appActivity.todayIntervals = samplesToIntervals(todaySamples);
  state.appActivity.todayDate = today;
  persist('appActivity');
  updateCurrentAppIndicator();
  checkAutoLockIn();
  if(ui.view==='focus' && ui.focusTab==='analytics') renderView();
}
function checkAutoLockIn(){
  const st = state.settings.appTracking;
  if(!st || st.enabled===false || st.autoLockIn===false) return;
  const ivs = state.appActivity.todayIntervals;
  if(!ivs.length) return;
  const last = ivs[ivs.length-1];
  const isLive = (Date.now()-last.end) <= APP_ACTIVITY_GAP_MS;
  const activeSession = state.focus.activeSession;

  if(isLive && !activeSession && !state.modes.active){
    const elapsedMin = (last.end-last.start)/60000;
    if(elapsedMin >= (st.thresholdMinutes||12) && autoLockInMeta.intervalStart!==last.start){
      autoLockInMeta = {app:last.app, intervalStart:last.start};
      startFocus(null);
      if(state.focus.activeSession) state.focus.activeSession.autoStarted = true;
      persist('focus');
      showToast('Auto-locked in \u2014 you\u2019ve been on '+last.app+' for '+Math.round(elapsedMin)+' min', {icon:'&#128274;'});
    }
    return;
  }

  if(activeSession && activeSession.autoStarted){
    if(!isLive) return; // idle/away — leave it running rather than guess
    if(last.app === autoLockInMeta.app){ autoLockInMeta.intervalStart = last.start; return; }
    const awayMin = (Date.now()-last.start)/60000;
    if(awayMin >= (st.graceMinutes||3)){
      autoEndFocusSession();
      autoLockInMeta = {app:null, intervalStart:null};
    }
  }
}
function autoEndFocusSession(){
  const s = state.focus.activeSession;
  if(!s) return;
  const endedAt = Date.now();
  const minutes = Math.max(1, Math.round((endedAt-s.startedAt)/60000));
  state.focus.sessions.push({id:uid(), date:todayStr(new Date(s.startedAt)), startedAt:s.startedAt, endedAt:endedAt, minutes:minutes, completedTasks:arr(s.completedTasks), note:'', autoStopped:true});
  state.focus.activeSession = null;
  if(ui.currentTaskId){ accumulateCurrentTaskTime(ui.currentTaskId); persist('tasks'); }
  if(state.modes.active && state.modes.active.linkedFocus){ endMode(); }
  playStopSound();
  persist('focus'); renderView();
  showToast('Auto-ended focus session \u2014 you switched apps', {icon:'&#9209;'});
}
function startAppActivityPolling(){
  pollAppActivity();
  setInterval(pollAppActivity, 15000);
}

