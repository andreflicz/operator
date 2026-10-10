
// ============ WEATHER ============
// Live conditions for the sky display and the Sky scene, from Open-Meteo (free, no account).
// Pick a city in Settings → Display (or use this Mac's location); it refreshes every ~20 minutes
// while Operator is open and simply keeps the last reading when offline.
const WX_URL = 'https://api.open-meteo.com/v1/forecast';
const GEO_URL = 'https://geocoding-api.open-meteo.com/v1/search';
const WX_CODES = {0:['clear','Clear'], 1:['clear','Mostly clear'], 2:['partly','Partly cloudy'], 3:['cloudy','Overcast'],
  45:['fog','Fog'], 48:['fog','Fog'], 51:['drizzle','Drizzle'], 53:['drizzle','Drizzle'], 55:['drizzle','Drizzle'], 56:['drizzle','Freezing drizzle'], 57:['drizzle','Freezing drizzle'],
  61:['rain','Light rain'], 63:['rain','Rain'], 65:['rain','Heavy rain'], 66:['rain','Freezing rain'], 67:['rain','Freezing rain'],
  71:['snow','Light snow'], 73:['snow','Snow'], 75:['snow','Heavy snow'], 77:['snow','Snow'], 80:['rain','Showers'], 81:['rain','Showers'], 82:['rain','Heavy showers'],
  85:['snow','Snow showers'], 86:['snow','Snow showers'], 95:['storm','Thunderstorm'], 96:['storm','Thunderstorm'], 99:['storm','Thunderstorm']};
function wxKind(code){ return (WX_CODES[code]||['clear'])[0]; }
function wxLabel(code){ return (WX_CODES[code]||['clear','Clear'])[1]; }
function wxHasPlace(){ const w = weatherCfg(); return w.lat!=null && w.lon!=null && isFinite(w.lat) && isFinite(w.lon); }
function wxUnits(){ const w = weatherCfg(); return w.units || (/^en-(US|LR|MM)/i.test(navigator.language||'') ? 'f' : 'c'); }
// the latest reading, if it's fresh enough to describe "right now"
function wxNow(){ const c = weatherCfg().current; return c && Date.now()-c.at < 3*3600000 ? c : null; }
function ensureWeatherCfg(){ if(!state.settings.weather || typeof state.settings.weather!=='object') state.settings.weather = {}; return state.settings.weather; }
let wxBusy = false;
async function refreshWeather(force){
  if(!wxHasPlace() || wxBusy) return;
  const w = weatherCfg();
  if(!force && w.current && Date.now()-w.current.at < 20*60000) return;
  wxBusy = true;
  try{
    const u = wxUnits();
    const url = WX_URL+'?latitude='+w.lat+'&longitude='+w.lon+'&current=temperature_2m,apparent_temperature,weather_code,is_day,cloud_cover,precipitation,wind_speed_10m&daily=temperature_2m_max,temperature_2m_min&timezone=auto&forecast_days=1&temperature_unit='+(u==='f'?'fahrenheit':'celsius');
    const ctl = new AbortController(), tm = setTimeout(function(){ ctl.abort(); }, 8000);
    const res = await fetch(url, {signal:ctl.signal}); clearTimeout(tm);
    if(!res.ok) throw new Error('weather '+res.status);
    const j = await res.json(), c = j.current || {}, d = j.daily || {};
    const prevKind = w.current ? wxKind(w.current.code) : null;
    ensureWeatherCfg().current = {at:Date.now(), units:u, temp:Math.round(c.temperature_2m), feels:Math.round(c.apparent_temperature), code:c.weather_code,
      cloud:c.cloud_cover, wind:c.wind_speed_10m, hi:d.temperature_2m_max ? Math.round(d.temperature_2m_max[0]) : null, lo:d.temperature_2m_min ? Math.round(d.temperature_2m_min[0]) : null};
    persist('settings');
    if(ui.view==='today' || ui.view==='settings') renderView();
    if(typeof sceneRefresh==='function' && prevKind!==wxKind(c.weather_code)) sceneRefresh();
  }catch(e){ /* offline or blocked — keep the last reading */ }
  finally{ wxBusy = false; }
}
setInterval(function(){ if(typeof state!=='undefined' && state && state.settings) refreshWeather(false); }, 5*60000);
// ---- what it looks like outside ----
const SKY_META = {night:{icon:'&#127769;', label:'Night'}, dawn:{icon:'&#127748;', label:'Dawn'}, morning:{icon:'&#127749;', label:'Morning'},
  day:{icon:'&#9728;&#65039;', label:'Daytime'}, golden:{icon:'&#127751;', label:'Golden hour'}, dusk:{icon:'&#127750;', label:'Dusk'}};
function wxIcon(kind, phase){
  const night = phase==='night' || phase==='dusk';
  return {clear: night ? '&#127769;' : SKY_META[phase].icon, partly: night ? '&#9729;&#65039;' : '&#9925;', cloudy:'&#9729;&#65039;', fog:'&#127787;&#65039;',
    drizzle:'&#127782;&#65039;', rain:'&#127783;&#65039;', snow:'&#127784;&#65039;', storm:'&#9928;&#65039;'}[kind] || SKY_META[phase].icon;
}
function skyChipHtml(){
  if(state.profile.skyChip===false) return '';
  const phase = skyPhase(), now = wxNow(), w = dayWindow();
  const m = new Date().getHours()*60 + new Date().getMinutes();
  let when = '';
  if(phase==='golden' || (phase==='day' && w.set-m <= 120)) when = 'sunset '+fmtMinOfDay(w.set);
  else if(phase==='dawn' || phase==='night' && m < w.rise) when = 'sunrise '+fmtMinOfDay(w.rise);
  const kind = now ? wxKind(now.code) : 'clear';
  const parts = [SKY_META[phase].label];
  if(now) parts.push('<b>'+now.temp+'&deg;</b> '+escapeHtml(wxLabel(now.code).toLowerCase()));
  if(when) parts.push(when);
  return '<span class="sky-chip sky-text" data-sky="'+phase+'" title="'+(now ? 'Feels like '+now.feels+'° · high '+now.hi+'° / low '+now.lo+'°'+(weatherCfg().place ? ' · '+escapeHtml(weatherCfg().place) : '') : 'Set a weather location in Settings → Display')+'">'+
    '<span class="sky-chip-i">'+wxIcon(kind, phase)+'</span>'+parts.join(' &middot; ')+'</span>';
}
// ---- settings ----
function weatherSettingsHtml(){
  const w = weatherCfg(), now = wxNow(), u = wxUnits();
  const results = ui.wxResults || null;
  return '<div class="section"><div class="section-title">Weather &amp; sky'+tip('Shows what it looks like outside — morning, golden hour, night — plus the live weather, on Today and in the Sky scene. Auto theme follows the real sunrise and sunset here.')+'</div><div class="card">'+
    (wxHasPlace()
      ? '<div class="row" style="gap:10px;align-items:center;flex-wrap:wrap;"><span class="wx-place">&#128205; '+escapeHtml(w.place||'My location')+'</span>'+
          (now ? '<span class="kpi-sub">'+now.temp+'&deg;'+u.toUpperCase()+' &middot; '+escapeHtml(wxLabel(now.code))+'</span>' : '<span class="kpi-sub">Fetching the weather…</span>')+
          '<span style="flex:1"></span>'+
          '<div class="seg-tabs" style="margin:0;"><button class="seg-tab'+(u==='f'?' active':'')+'" data-action="wxUnits" data-id="f">&deg;F</button><button class="seg-tab'+(u==='c'?' active':'')+'" data-action="wxUnits" data-id="c">&deg;C</button></div>'+
          '<button class="btn btn-ghost btn-sm" data-action="wxChange">Change</button></div>'
      : '')+
    (!wxHasPlace() || ui.wxEditing
      ? '<div class="row" style="gap:8px;flex-wrap:wrap;'+(wxHasPlace()?'margin-top:12px;':'')+'"><input class="input" id="wxQuery" placeholder="Search a city — e.g. Brooklyn" style="flex:1;min-width:200px;" value="'+escapeHtml(ui.wxQuery||'')+'">'+
          '<button class="btn btn-sm" data-action="wxSearch">Find</button><button class="btn btn-ghost btn-sm" data-action="wxUseMyLocation">&#128205; Use my location</button></div>'+
        (results ? (results.length ? '<div class="wx-results">'+results.map(function(r, i){ return '<button class="wx-result" data-action="wxPick" data-id="'+i+'">'+escapeHtml(r.label)+'</button>'; }).join('')+'</div>' : '<div class="kpi-sub" style="margin-top:8px;">No places found.</div>') : '')+
        (ui.wxError ? '<div class="kpi-sub" style="margin-top:8px;color:var(--danger-text);">'+escapeHtml(ui.wxError)+'</div>' : '')
      : '')+
    '<label class="row" style="gap:8px;margin-top:12px;font-size:13px;color:var(--text-dim);cursor:pointer;"><input type="checkbox" id="setSkyChip" '+(state.profile.skyChip!==false?'checked':'')+'>Show the sky on Today</label>'+
  '</div></div>';
}
ACTIONS.wxChange = function(){ ui.wxEditing = !ui.wxEditing; ui.wxResults = null; renderView(); };
ACTIONS.wxSearch = async function(){
  const q = (document.getElementById('wxQuery')||{}).value || ''; ui.wxQuery = q.trim(); ui.wxError = '';
  if(!ui.wxQuery) return;
  try{
    const res = await fetch(GEO_URL+'?name='+encodeURIComponent(ui.wxQuery)+'&count=6&language=en&format=json');
    const j = await res.json();
    ui.wxResults = (j.results||[]).map(function(r){ return {lat:r.latitude, lon:r.longitude, label:[r.name, r.admin1, r.country_code||r.country].filter(Boolean).join(', '), place:r.name+(r.admin1 && r.admin1!==r.name ? ', '+r.admin1 : '')}; });
  }catch(e){ ui.wxResults = null; ui.wxError = 'Couldn\'t reach the weather service — check the internet connection.'; }
  renderView();
};
document.addEventListener('keydown', function(e){ if(e.key==='Enter' && e.target && e.target.id==='wxQuery'){ e.preventDefault(); ACTIONS.wxSearch(); } });
function setWeatherPlace(lat, lon, place){
  const w = ensureWeatherCfg();
  w.lat = Math.round(lat*1000)/1000; w.lon = Math.round(lon*1000)/1000; w.place = place; w.current = null;
  ui.wxEditing = false; ui.wxResults = null; ui.wxQuery = ''; ui.wxError = '';
  persist('settings'); applyThemeMode(true); renderView();
  refreshWeather(true);
  if(typeof sceneRefresh==='function') sceneRefresh();
}
ACTIONS.wxPick = function(el, e, id){ const r = (ui.wxResults||[])[Number(id)]; if(r) setWeatherPlace(r.lat, r.lon, r.place); };
ACTIONS.wxUseMyLocation = function(){
  if(!navigator.geolocation){ ui.wxError = 'Location isn\'t available here — search for your city instead.'; renderView(); return; }
  navigator.geolocation.getCurrentPosition(function(pos){ setWeatherPlace(pos.coords.latitude, pos.coords.longitude, 'My location'); },
    function(){ ui.wxError = 'Location was blocked — search for your city instead.'; renderView(); }, {timeout:10000, maximumAge:3600000});
};
ACTIONS.wxUnits = function(el, e, id){ const w = ensureWeatherCfg(); w.units = id; w.current = null; persist('settings'); renderView(); refreshWeather(true); };
document.addEventListener('change', function(e){ if(e.target && e.target.id==='setSkyChip'){ state.profile.skyChip = e.target.checked; persist('profile'); } });
