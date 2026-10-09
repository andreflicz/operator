
// ============ SUN, SKY & THEME ============
// The theme is dark, light, or auto — auto is light while the sun is up and dark after sunset.
// With a weather location set it follows the real sunrise / sunset there; otherwise the day and
// night times from Settings (7 AM / 7 PM unless changed). The same sun math drives the sky display.
function hmToMin(hm){ const p = String(hm||'').split(':'); return (Number(p[0])||0)*60 + (Number(p[1])||0); }
// Sunrise / sunset for a date at lat/lon (standard solar-position formulas). null = polar day/night.
function sunTimesFor(date, lat, lon){
  const rad = Math.PI/180, dayMs = 86400000, J1970 = 2440588, J2000 = 2451545, J0 = 0.0009;
  const days = date.valueOf()/dayMs - 0.5 + J1970 - J2000;
  const fromJ = function(j){ return new Date((j + 0.5 - J1970)*dayMs); };
  const lw = -lon*rad, phi = lat*rad, tilt = 23.4397*rad;
  const n = Math.round(days - J0 - lw/(2*Math.PI));
  const ds = J0 + lw/(2*Math.PI) + n;
  const M = rad*(357.5291 + 0.98560028*ds);
  const L = M + rad*(1.9148*Math.sin(M) + 0.02*Math.sin(2*M) + 0.0003*Math.sin(3*M)) + rad*102.9372 + Math.PI;
  const dec = Math.asin(Math.sin(tilt)*Math.sin(L));
  const transit = function(x){ return J2000 + x + 0.0053*Math.sin(M) - 0.0069*Math.sin(2*L); };
  const noon = transit(ds);
  const w = Math.acos((Math.sin(-0.833*rad) - Math.sin(phi)*Math.sin(dec)) / (Math.cos(phi)*Math.cos(dec)));
  if(isNaN(w)) return null;
  const set = transit(J0 + (w + lw)/(2*Math.PI) + n);
  return {rise:fromJ(noon - (set - noon)), set:fromJ(set), noon:fromJ(noon)};
}
function weatherCfg(){ const s = state.settings || {}; return s.weather || {}; }
// Minutes after midnight when the day starts and ends, for the date d.
function dayWindow(d){
  d = d || new Date();
  const w = weatherCfg();
  if(isFinite(w.lat) && isFinite(w.lon) && w.lat!==null && w.lon!==null){
    const st = sunTimesFor(new Date(d.getFullYear(), d.getMonth(), d.getDate(), 12), Number(w.lat), Number(w.lon));
    if(st) return {rise:st.rise.getHours()*60+st.rise.getMinutes(), set:st.set.getHours()*60+st.set.getMinutes(), real:true};
  }
  const p = state.profile || {};
  return {rise:hmToMin(p.dayStart||'07:00'), set:hmToMin(p.nightStart||'19:00'), real:false};
}
// What it looks like outside right now: night, dawn, morning, day, golden (the hour before sunset), dusk.
function skyPhase(d){
  d = d || new Date();
  const w = dayWindow(d), m = d.getHours()*60 + d.getMinutes();
  if(m < w.rise-50 || m >= w.set+50) return 'night';
  if(m < w.rise) return 'dawn';
  if(m < w.rise+90) return 'morning';
  if(m < w.set-75) return 'day';
  if(m < w.set) return 'golden';
  return 'dusk';
}
// The look of the sky (the Today header tint, the Sky scene, the wake screen): follows the sun by
// default, or keep the one you like — e.g. Sunset all day, even when it's light out.
const SKY_LOOKS = [['auto','&#127763; Follow the sun'],['dawn','Dawn'],['morning','Morning'],['day','Day'],['golden','&#127749; Sunset'],['dusk','Dusk'],['night','Night']];
function skyLook(){ const o = state.profile && state.profile.skyLook; return o && o!=='auto' && SKY_LOOKS.some(function(x){ return x[0]===o; }) ? o : skyPhase(); }
ACTIONS.setSkyLook = function(el, e, id){
  state.profile.skyLook = id==='auto' ? null : id; persist('profile');
  if(typeof sceneMount==='function') sceneMount();
  renderView();
};
function skyLookSettingsHtml(){
  const cur = (state.profile.skyLook || 'auto');
  return '<div class="section"><div class="section-title">Sky look'+tip('The color of the sky in the Today header, the Sky scene and the wake screen. Follow the sun, or keep one look all day — like Sunset.')+'</div><div class="card">'+
    '<div class="seg-tabs" style="margin:0;flex-wrap:wrap;">'+SKY_LOOKS.map(function(x){ return '<button class="seg-tab'+(cur===x[0]?' active':'')+'" data-action="setSkyLook" data-id="'+x[0]+'">'+x[1]+'</button>'; }).join('')+'</div>'+
  '</div></div>';
}
function effectiveTheme(d){
  const t = (state.profile && state.profile.theme) || 'dark';
  if(t==='auto'){
    d = d || new Date();
    const w = dayWindow(d), m = d.getHours()*60 + d.getMinutes();
    return (m>=w.rise && m<w.set) ? 'light' : 'dark';
  }
  return t==='light' ? 'light' : 'dark';
}
function applyThemeMode(animate){
  const t = effectiveTheme();
  const root = document.documentElement;
  // today's day window, so the first paint on the next launch already has the right theme
  try{ const d = new Date(), w = dayWindow(d); localStorage.setItem('opsdash:sunCache', JSON.stringify({date:todayStr(d), rise:w.rise, set:w.set})); }catch(e){}
  if(root.getAttribute('data-theme')===t) return;
  const go = function(){ root.setAttribute('data-theme', t); if(typeof applyCursorSetting==='function') applyCursorSetting(); if(typeof onThemeChanged==='function') onThemeChanged(t); };
  // a soft cross-fade when it flips at sunrise/sunset or from the menu
  if(animate && document.startViewTransition && !window.matchMedia('(prefers-reduced-motion: reduce)').matches) document.startViewTransition(go);
  else go();
}
function setThemePref(t){
  state.profile.theme = t;
  persist('profile');
  applyThemeMode(true);
  renderView();
}
ACTIONS.setTheme = function(el, e, id){ setThemePref(id); };
setInterval(function(){ if(typeof state!=='undefined' && state && state.profile && state.profile.theme==='auto') applyThemeMode(true); }, 60000);
function fmtMinOfDay(m){ return fmt12Hour(pad2(Math.floor(m/60)%24)+':'+pad2(m%60)); }
function themeSettingsHtml(){
  const t = state.profile.theme || 'dark';
  const w = dayWindow(), real = w.real, loc = weatherCfg();
  const opt = function(id, label){ return '<button class="seg-tab'+(t===id?' active':'')+'" data-action="setTheme" data-id="'+id+'">'+label+'</button>'; };
  return '<div class="section"><div class="section-title">Theme'+tip('Auto is light while the sun is up and dark after sunset. It follows the real sunrise and sunset once a weather location is set; otherwise the times you pick here.')+'</div><div class="card">'+
    '<div class="seg-tabs" style="margin:0;">'+opt('dark','&#127769; Dark')+opt('light','&#9728;&#65039; Light')+opt('auto','&#127763; Auto — day &amp; night')+'</div>'+
    (t==='auto' ? (real
      ? '<div class="kpi-sub" style="margin-top:10px;">Light from sunrise ('+fmtMinOfDay(w.rise)+') to sunset ('+fmtMinOfDay(w.set)+')'+(loc.place ? ' in '+escapeHtml(loc.place) : '')+'.</div>'
      : '<div class="row" style="gap:10px;margin-top:12px;flex-wrap:wrap;align-items:center;"><span class="kpi-sub">Light from</span><input class="input" type="time" id="setDayStart" value="'+(state.profile.dayStart||'07:00')+'" style="width:130px;"><span class="kpi-sub">to</span><input class="input" type="time" id="setNightStart" value="'+(state.profile.nightStart||'19:00')+'" style="width:130px;"></div>')
    : '')+
  '</div></div>';
}
document.addEventListener('change', function(e){
  const el = e.target; if(!el || (el.id!=='setDayStart' && el.id!=='setNightStart') || !el.value) return;
  state.profile[el.id==='setDayStart' ? 'dayStart' : 'nightStart'] = el.value;
  persist('profile'); applyThemeMode(true);
});
