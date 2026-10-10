// ============ DEFAULTS ============
function defaultProfile(){
  return { name:'Operator', businessName:'', calorieTarget:2000, goalWeight:null, weeklyWorkoutTarget:5, revenueGoalMonthly:10000,
    soundEnabled:true, focusNotePromptEnabled:true, notifyOnFocusEnd:true, accentColor:'#E8A23D', goalAccentColor:'#3FBE8E', alarmSound:'standard', linkBrowser:'default', sidebarCollapsed:false, bigClockOnToday:false, crosshairCursor:true };
}
function defaultMeals(){
  return { library:[
    {id:uid(), name:'Chicken, rice & veggies', calories:650},
    {id:uid(), name:'Steak & potatoes', calories:700},
    {id:uid(), name:'Eggs & turkey bacon', calories:450},
    {id:uid(), name:'Protein shake', calories:220},
    {id:uid(), name:'Chicken wrap', calories:520}
  ]};
}
function defaultFocus(){
  return {
    activeSession:null, sessions:[],
    alarms:[],
    reminders:[],
    prepItems:[
      {id:uid(), label:'Phone physically far away'},
      {id:uid(), label:'Today\u2019s task ready to work on'}
    ],
    motivations:{
      toward:[{id:uid(), text:'Pay off debt'}, {id:uid(), text:'Build the agency'}, {id:uid(), text:'Lose the weight'}],
      away:[{id:uid(), text:'Staying stuck'}, {id:uid(), text:'More debt'}, {id:uid(), text:'Feeling like garbage tomorrow morning'}]
    }
  };
}
function defaultStandards(){
  return { items:[{id:uid(), label:'Stayed within calorie target'}], deepWorkTargetMinutes: 180, daysOffAllowedPerWeek:2, completions:[], trainedEnabled:false };
}
function defaultDaysOff(){ return { dates:[] }; }
function defaultGoals(){ return { items:[] }; }
function defaultCalendar(){
  return { events:[], categories:[
    {id:'work', label:'Work Block', color:'#E8A23D'},
    {id:'call', label:'Call', color:'#8fdcff'},
    {id:'other', label:'Other', color:'#8A90A2'}
  ]};
}
function defaultDashboardPanels(){
  return { order: PANEL_DEFS.map(function(p){return p.id;}), enabled:{} };
}
function defaultModes(){ return { active:null, history:[] }; }
const MODE_LABELS = { break:'Break Mode', offtime:'Off-Time Mode', shooting:'Shooting Mode', training:'Training Mode' };
// Training mode is retired: old Training minutes now count as Other, and "Working out" is the
// time you log on each workout in Fitness.
// Session/time types used by analytics. Deep work is the only one that counts as deep work;
// shooting also counts toward the daily standard (a shoot day doesn't break the streak).
const TIME_TYPES = [
  {id:'deep', label:'Deep work', color:'#E8A23D'},
  {id:'workout', label:'Working out', color:'#7AA2FF'},
  {id:'shooting', label:'Shooting', color:'#C58FFF'},
  {id:'other', label:'Other', color:'#8A90A2'}
];
function modeColor(type){ return type==='break' ? 'var(--info)' : type==='shooting' ? 'var(--shoot)' : type==='training' ? 'var(--train)' : 'var(--text-dim)'; }
function defaultPersonal(){ return { wishlist:[] }; }
function defaultBoards(){ return { boards:[] }; }
function defaultAppActivity(){ return { days:{}, todayDate:null, todayIntervals:[] }; }
function businessNameTagHtml(){
  const name = state.profile.businessName;
  if(!name) return '';
  return '<div class="business-name-tag">'+escapeHtml(name)+'</div>';
}
function defaultJournalTypes(){
  return [
    {id:'starred', emoji:'⭐', label:'Starred', color:'#FFD700'}
  ];
}
function defaultSettings(){
  return { clientCare: { yellowHours:48, redHours:72 }, quickLinks: { businessFilesPath:'', metaAdsUrl:'https://adsmanager.facebook.com', ghlUrl:'https://app.gohighlevel.com', driveUrl:'https://drive.google.com', lastAiUsed:'chatgpt', icons:{} },
    appTracking: { enabled:true, autoLockIn:true, thresholdMinutes:12, graceMinutes:3, cooldownMinutes:15, idleSeconds:60, awayMinutes:10 } };
}
const AI_TOOLS = [
  {id:'chatgpt', emoji:'🤖', label:'ChatGPT', url:'https://chat.openai.com', bg:'#10a37f'},
  {id:'gemini', emoji:'✨', label:'Gemini', url:'https://gemini.google.com', bg:'#4285f4'}
];
const QUICK_LINK_DEFS = [
  {key:'files', label:'Files', emoji:'📁', bg:'#5b6472'},
  {key:'ghl', label:'GHL', emoji:'⚡', bg:'#0b6e6e'},
  {key:'meta', label:'Meta Ads', emoji:'📣', bg:'#4267ff'}
];
function quickLinksSettings(){ return (state.settings && state.settings.quickLinks) || defaultSettings().quickLinks; }
function resolveQuickLinkUrl(raw){
  if(!raw) return null;
  if(/^https?:\/\//i.test(raw) || /^file:\/\//i.test(raw)) return raw;
  return 'file://'+raw;
}
// This app runs inside a Chrome app-shell window, so a normal http(s) link
// just opens another Chrome window/tab — it can never land in Safari on its
// own. macOS Safari registers the x-safari-https/x-safari-http URL schemes
// specifically to force a link open in Safari regardless of default browser,
// so we rewrite web links to use that scheme. Chrome will hand the unknown
// scheme off to macOS, which routes it to Safari (may show a one-time
// "open in another app?" prompt the first time, which can be set to Always Allow).
function safariizeUrl(raw){
  if(!raw) return raw;
  const pref = state.profile.linkBrowser || 'default';
  if(pref!=='safari') return raw;
  if(/^https:\/\//i.test(raw)) return 'x-safari-https://'+raw.slice(8);
  if(/^http:\/\//i.test(raw)) return 'x-safari-http://'+raw.slice(7);
  return raw;
}
function quickLinkHrefUrl(key){
  const q = quickLinksSettings();
  if(key==='files') return resolveQuickLinkUrl(q.businessFilesPath);
  if(key==='ghl') return safariizeUrl(q.ghlUrl);
  if(key==='drive') return safariizeUrl(q.driveUrl);
  if(key==='meta') return safariizeUrl(q.metaAdsUrl);
  return null;
}
function quickLinkIconInnerHtml(key, emoji, bg){
  const q = quickLinksSettings();
  const custom = q.icons && q.icons[key];
  if(custom) return '<img src="'+custom+'" alt="">';
  return '<span class="quick-link-fallback" style="background:'+bg+';">'+emoji+'</span>';
}
function goToSettingsQuickLinks(){ ui.view='settings'; ui.settingsTab='display'; renderView(); const el=document.getElementById('quickLinksSettingsAnchor'); if(el) el.scrollIntoView({behavior:'smooth'}); }
const LEAD_SOURCES = [
  {id:'google', emoji:'🔍', label:'Google', color:'#8fdcff'},
  {id:'organic', emoji:'🌱', label:'Organic', color:'#f48fb1'},
  {id:'metaads', emoji:'📣', label:'Meta Ads', color:'#c792ea'},
  {id:'referral', emoji:'🤝', label:'Referral', color:'#3FBE8E'},
  {id:'website', emoji:'🌐', label:'Website', color:'#E8A23D'},
  {id:'other', emoji:'❓', label:'Other', color:'#8A90A2'}
];
function leadSourceById(id){
  if(id==='meta') return LEAD_SOURCES.find(function(s){ return s.id==='organic'; });
  return LEAD_SOURCES.find(function(s){ return s.id===id; });
}

