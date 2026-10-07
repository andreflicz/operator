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
async function persist(key){
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

