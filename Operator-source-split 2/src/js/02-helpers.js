// ============ HELPERS ============
function uid(){ return Date.now().toString(36)+Math.random().toString(36).slice(2,7); }
function pad2(n){ return String(n).padStart(2,'0'); }
function ordinal(n){
  n = Number(n)||1;
  const s = ['th','st','nd','rd'], v = n%100;
  return n+(s[(v-20)%10]||s[v]||s[0]);
}
function todayStr(d){ d=d||new Date(); return d.getFullYear()+'-'+pad2(d.getMonth()+1)+'-'+pad2(d.getDate()); }
function nowHM(d){ d=d||new Date(); return pad2(d.getHours())+':'+pad2(d.getMinutes()); }
// toLocaleDateString builds a new formatter on every call, which made each re-render spend
// most of its time formatting dates. One shared formatter per format + a small memo instead.
const FMT_MONTH_DAY = new Intl.DateTimeFormat(undefined,{month:'short', day:'numeric'});
const FMT_WEEKDAY = new Intl.DateTimeFormat(undefined,{weekday:'short'});
const FMT_TIME = new Intl.DateTimeFormat(undefined,{hour:'numeric', minute:'2-digit'});
const fmtMemo = {md:{}, wd:{}};
function fmtDateShort(s){
  if(!s) return '—';
  if(fmtMemo.md[s]) return fmtMemo.md[s];
  const parts = s.split('-').map(Number);
  return (fmtMemo.md[s] = FMT_MONTH_DAY.format(new Date(parts[0], parts[1]-1, parts[2])));
}
function weekdayShort(dateStr){
  if(fmtMemo.wd[dateStr]) return fmtMemo.wd[dateStr];
  const parts = dateStr.split('-').map(Number);
  return (fmtMemo.wd[dateStr] = FMT_WEEKDAY.format(new Date(parts[0], parts[1]-1, parts[2])));
}
function fmtTimeShort(ts){ const d = new Date(ts); return isNaN(d) ? '' : FMT_TIME.format(d); }
// Render-scoped cache: only active while renderView runs (state can't change mid-render),
// so repeated stats lookups — streak, per-day standards, per-day minutes — are computed once
// per render instead of re-scanning a year of sessions for every day they're asked about.
let RC = null;
function memo(key, fn){
  if(!RC) return fn();
  if(Object.prototype.hasOwnProperty.call(RC, key)) return RC[key];
  return (RC[key] = fn());
}
function addDays(dateStr, n){
  const parts = dateStr.split('-').map(Number);
  const dt = new Date(parts[0], parts[1]-1, parts[2]);
  dt.setDate(dt.getDate()+n);
  return todayStr(dt);
}
function monthKeyOf(dateStr){ return dateStr ? dateStr.slice(0,7) : ''; }
function startOfWeekStr(dateStr){
  const parts = (dateStr||todayStr()).split('-').map(Number);
  const dt = new Date(parts[0], parts[1]-1, parts[2]);
  const day = dt.getDay();
  const diff = (day===0) ? -6 : (1-day);
  dt.setDate(dt.getDate()+diff);
  return todayStr(dt);
}
// Sunday-based week start (local time) — used for "time worked this week", which resets
// every Sunday at 12 AM. Business deliverable weeks keep their Monday start.
function startOfWeekSundayStr(dateStr){
  const parts = (dateStr||todayStr()).split('-').map(Number);
  const dt = new Date(parts[0], parts[1]-1, parts[2]);
  dt.setDate(dt.getDate()-dt.getDay());
  return todayStr(dt);
}
function thisWeekKey(){ return startOfWeekStr(todayStr()); }
function endOfWeekStr(dateStr){ return addDays(startOfWeekStr(dateStr), 6); }
function thisMonthKey(){ return monthKeyOf(todayStr()); }
function escapeHtml(s){
  return String(s==null?'':s).replace(/[&<>"']/g, function(c){
    return {'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c];
  });
}
function clamp(n,min,max){ return Math.max(min, Math.min(max, n)); }
function arr(v){ return Array.isArray(v) ? v : []; }
function fmtDurationLabel(mins){
  mins = Number(mins)||0;
  const h = Math.floor(mins/60), m = mins%60;
  if(h===0) return m+'m';
  if(m===0) return h+'h';
  return h+'h '+m+'m';
}
function durationOptions(maxMinutes){
  maxMinutes = maxMinutes || 240;
  const opts = [];
  for(let m=15; m<=maxMinutes; m+=15) opts.push({value:m, label:fmtDurationLabel(m)});
  return opts;
}
function hexToRgba(hex, alpha){
  hex = String(hex||'#E8A23D').replace('#','');
  if(hex.length===3) hex = hex.split('').map(function(c){return c+c;}).join('');
  const r=parseInt(hex.substring(0,2),16), g=parseInt(hex.substring(2,4),16), b=parseInt(hex.substring(4,6),16);
  return 'rgba('+r+','+g+','+b+','+alpha+')';
}
function goalAccentColor(){ return (state.profile && state.profile.goalAccentColor) || '#3FBE8E'; }
function goalColor(){ return goalAccentColor(); }
function goalGlowStyle(pct){
  const intensity = clamp(pct,0,150)/150;
  const blur = Math.round(4 + intensity*22);
  const alpha = (0.15 + intensity*0.5).toFixed(2);
  return 'box-shadow:0 0 '+blur+'px '+hexToRgba(goalAccentColor(), alpha)+';';
}
function goalGlowFilter(pct){
  const intensity = clamp(pct,0,150)/150;
  const blur = Math.round(3 + intensity*14);
  const alpha = (0.25 + intensity*0.55).toFixed(2);
  return 'filter:drop-shadow(0 0 '+blur+'px '+hexToRgba(goalAccentColor(), alpha)+');';
}
function applyTheme(){
  try{
    const color = state.profile.accentColor || '#E8A23D';
    document.documentElement.style.setProperty('--accent', color);
    document.documentElement.style.setProperty('--accent-dim', hexToRgba(color, 0.14));
    applyThemeMode(false);
    applyCursorSetting();
  }catch(e){}
}
function applySidebarState(){
  const nav = document.getElementById('sidebarNav');
  if(!nav) return;
  nav.classList.toggle('collapsed', !!state.profile.sidebarCollapsed);
  document.body.classList.toggle('sb-collapsed', !!state.profile.sidebarCollapsed);
  setTimeout(function(){ if(typeof stretchLockedHeaderLine==='function') stretchLockedHeaderLine(); if(typeof sceneRefresh==='function') sceneRefresh(); }, 240);
}
function toggleSidebar(){
  state.profile.sidebarCollapsed = !state.profile.sidebarCollapsed;
  applySidebarState();
  persist('profile');
}
const DAY_LETTERS = ['S','M','T','W','T','F','S'];
const PIPELINE_STAGES = ['lead','contacted','discovery','proposal','closed','lost'];
const STAGE_LABELS = {lead:'Lead', contacted:'Contacted', discovery:'Discovery Call', proposal:'Proposal', closed:'Closed', lost:'Lost'};
const STAGE_ORDER = ['lead','contacted','discovery','proposal','closed'];
const SWATCHES = ['#E8A23D','#8fdcff','#3FBE8E','#E8636B','#b39ddb','#f48fb1','#8A90A2','#f3c988'];
const PANEL_DEFS = [
  {id:'personalStats', label:'Streak & Personal Stats (includes Standard)'},
  {id:'business', label:'Business Snapshot'},
  {id:'clientHub', label:'Clients — health, deliverables, next steps & who to reach out to'},
  {id:'goals', label:'Goals'},
  {id:'journal', label:'Journal'},
  {id:'focusMini', label:'Focus'},
  {id:'calendarMini', label:'Calendar'},
  {id:'tasks', label:"Today's Tasks"},
  {id:'vision', label:'Vision Board'},
  {id:'agenda', label:'Today — timeline of events, deadlines & alarms'},
  {id:'week', label:'This Week & Consistency — deep work per day + 6-month heatmap'},
  {id:'why', label:'Your Why'}
];
const SMALL_PANELS = ['focusMini', 'calendarMini']; // journal is full-width now that it sits near the top
const MOODS = [
  {id:'idea', emoji:'\uD83D\uDCA1', label:'Idea', color:'#8fdcff'},
  {id:'win', emoji:'\uD83C\uDF89', label:'Win', color:'#3FBE8E'},
  {id:'vent', emoji:'\uD83D\uDE24', label:'Vent', color:'#E8636B'},
  {id:'reflect', emoji:'\uD83E\uDD14', label:'Reflect', color:'#b39ddb'},
  {id:'tired', emoji:'\uD83D\uDE34', label:'Tired', color:'#8A90A2'}
];
function journalTypes(){ return (state.journal && Array.isArray(state.journal.types) && state.journal.types.length) ? state.journal.types : defaultJournalTypes(); }
function moodById(id){ return journalTypes().find(function(m){ return m.id===id; }) || MOODS.find(function(m){ return m.id===id; }); }
const RESET_TARGETS = [
  {id:'focusSessions', label:'Focus sessions (all-time deep work history)'},
  {id:'tasks', label:'Tasks (today, backlog & finished)'},
  {id:'journal', label:'Journal entries'},
  {id:'goals', label:'Goals'},
  {id:'health', label:'Health logs (workouts, weight, calories)'},
  {id:'finances', label:'Finances (debts & income)'},
  {id:'business', label:'Business (clients & pipeline)'},
  {id:'calendarEvents', label:'Calendar events'},
  {id:'standardsHistory', label:'Standard completions (streak history)'},
  {id:'daysOff', label:'Days off history'},
  {id:'appActivity', label:'App activity history (most-used apps)'},
  {id:'wishlist', label:'Wish list'},
  {id:'boards', label:'Vision & journal boards'}
];

