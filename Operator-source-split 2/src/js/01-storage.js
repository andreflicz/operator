// ============ STORAGE ============
const hasCloud = !!(window.storage && typeof window.storage.get === 'function');
async function storageGetRaw(key){
  if(hasCloud){ try{ const r = await window.storage.get(key, false); return r ? r.value : null; }catch(e){ return null; } }
  try{ return localStorage.getItem('opsdash:'+key); }catch(e){ return null; }
}
async function storageSetRaw(key, val){
  if(hasCloud){ try{ await window.storage.set(key, val, false); return true; }catch(e){ return false; } }
  try{ localStorage.setItem('opsdash:'+key, val); return true; }catch(e){ return false; }
}
async function loadKey(key, fallback){
  const raw = await storageGetRaw(key);
  if(!raw) return fallback;
  try{ const p = JSON.parse(raw); return p==null ? fallback : p; }catch(e){ return fallback; }
}
let persistWarnedAt = 0;
// Saving is batched: a burst of clicks writes each part of the data once, a moment later and off
// the click itself (turning a big part like Focus into text on every click made clicks feel slow).
// Anything still waiting is written the moment the window hides or closes.
const persistPending = {}; let persistTimer = 0, persistWaiters = [];
function persist(key){
  persistPending[key] = true;
  if(!persistTimer) persistTimer = setTimeout(persistFlush, 250);
  return new Promise(function(res){ persistWaiters.push(res); });
}
function persistFlush(){
  clearTimeout(persistTimer); persistTimer = 0;
  const keys = Object.keys(persistPending), waiters = persistWaiters;
  keys.forEach(function(k){ delete persistPending[k]; });
  persistWaiters = [];
  let ok = true;
  keys.forEach(function(k){ try{ ok = persistNow(k) && ok; }catch(e){ ok = false; } });
  waiters.forEach(function(r){ r(ok); });
  return ok;
}
window.addEventListener('pagehide', persistFlush);
window.addEventListener('beforeunload', persistFlush);
document.addEventListener('visibilitychange', function(){ if(document.hidden) persistFlush(); });
function persistNow(key){
  const val = JSON.stringify(state[key]);
  if(hasCloud){ storageSetRaw(key, val).then(function(ok){ if(!ok) persistFailed(); }); return true; }
  let ok = true; try{ localStorage.setItem('opsdash:'+key, val); }catch(e){ ok = false; }
  if(!ok) persistFailed();
  return ok;
}
function persistFailed(){
  if(Date.now()-persistWarnedAt > 15000 && typeof showToast==='function'){
    persistWarnedAt = Date.now();
    showToast("Couldn't save — browser storage is full. Export your data from Settings.", {icon:'&#9888;', duration:6000});
  }
}
async function persistOld(key){
  const ok = await storageSetRaw(key, JSON.stringify(state[key]));
  // A failed write used to be silent — the change looked saved but vanished on reload.
  if(!ok && Date.now()-persistWarnedAt > 15000 && typeof showToast==='function'){
    persistWarnedAt = Date.now();
    showToast("Couldn't save — browser storage is full. Export your data from Settings.", {icon:'&#9888;', duration:6000});
  }
  return ok;
}
const STATE_KEYS = ['profile','tasks','focus','health','meals','journal','finances','business','calendar','standards','daysOff','goals','dashboardPanels','modes','settings','appActivity','personal','boards'];
// The native Operator wrapper script (if running as the packaged .app) polls the
// frontmost macOS app in the background and serves recent samples over a local,
// loopback-only HTTP endpoint. When running as a plain file in a regular browser
// (no wrapper), this endpoint simply won't respond and the feature no-ops.
const APP_ACTIVITY_PORT = 8934;
const APP_ACTIVITY_URL = 'http://127.0.0.1:'+APP_ACTIVITY_PORT+'/';

