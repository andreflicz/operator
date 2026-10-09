
// ============ WORK vs NOT-WORK APPS, ACTIVITY PILL, END-OF-DAY RECAP ============
// Every app (and website, when you're in a browser) is "work", "not work", or — until you
// sort it — unsorted (treated as not work). Only work apps start an automatic lock-in.
const DEFAULT_WORK_ACTIVITY = ['final cut pro','adobe premiere pro','davinci resolve','capcut','adobe photoshop','adobe lightroom classic','lightroom','adobe after effects','adobe illustrator','figma','notion','code','visual studio code','cursor','xcode','canva','frame.io','logic pro','garageband',
  'docs.google.com','sheets.google.com','slides.google.com','drive.google.com','app.gohighlevel.com','adsmanager.facebook.com','business.facebook.com','canva.com','figma.com','notion.so','frame.io','chatgpt.com','chat.openai.com','claude.ai','capcut.com','studio.youtube.com'];
const NEUTRAL_ACTIVITY = ['operator','finder','system settings','system preferences','loginwindow'];
function activityKey(name){ return String(name||'').trim().toLowerCase(); }
function activityCats(){ const st = state.settings.appTracking; if(!st.categories || typeof st.categories!=='object') st.categories = {}; return st.categories; }
function activityCategory(name){
  const k = activityKey(name);
  const set = activityCats()[k];
  if(set) return set;
  if(NEUTRAL_ACTIVITY.indexOf(k)>=0) return 'neutral';
  if(DEFAULT_WORK_ACTIVITY.indexOf(k)>=0) return 'work';
  return 'unsorted';
}
function setActivityCategory(name, cat){
  const k = activityKey(name); if(!k) return;
  activityCats()[k] = cat;
  persist('settings');
}
const CAT_META = {work:{label:'Work', color:'var(--good)'}, other:{label:'Not work', color:'var(--danger)'}, neutral:{label:'Neutral', color:'var(--text-faint)'}, unsorted:{label:'Unsorted', color:'#8A90A2'}};
// ---- the always-visible pill (bottom-left, works with the sidebar closed) ----
function updateActivityPill(){
  const el = document.getElementById('activityPill'); if(!el) return;
  const st = state.settings.appTracking;
  const app = (st && st.enabled!==false) ? currentForegroundApp() : null;
  const s = state.focus.activeSession;
  if(!app && !s){ el.classList.add('is-hidden'); return; }
  el.classList.remove('is-hidden');
  const cat = app ? activityCategory(app) : 'neutral';
  el.dataset.cat = cat;
  const lock = s ? (s.onBreak ? '&#9749; on break' : '&#128274; '+fmtDurationLabel(Math.max(0, Math.round((Date.now()-s.startedAt)/60000)))) : '';
  const html = '<span class="ap-dot"></span><span class="ap-name">'+(app ? escapeHtml(app) : 'Away')+'</span>'+(lock ? '<span class="ap-lock">'+lock+'</span>' : '');
  if(el._html!==html){ el.innerHTML = html; el._html = html; }
  el.title = app ? app+' — '+CAT_META[cat].label+' (click to change)' : '';
}
setInterval(function(){ try{ if(state && state.settings) updateActivityPill(); }catch(e){} }, 5000);
afterRenderHooks.push(function(){ updateActivityPill(); document.body.classList.toggle('sb-collapsed', !!state.profile.sidebarCollapsed); });
ACTIONS.activityPillMenu = function(){
  const app = currentForegroundApp();
  ui.pillMenu = ui.pillMenu ? null : (app || '__none');
  renderPillMenu();
};
function renderPillMenu(){
  let m = document.getElementById('activityPillMenu');
  if(!ui.pillMenu){ if(m) m.remove(); return; }
  if(!m){ m = document.createElement('div'); m.id = 'activityPillMenu'; m.className = 'ap-menu'; document.body.appendChild(m); }
  const app = ui.pillMenu==='__none' ? null : ui.pillMenu;
  const cat = app ? activityCategory(app) : null;
  m.innerHTML = (app ? '<div class="ap-menu-title">'+escapeHtml(app)+'</div>'+
      '<div class="ap-menu-k">Is this work?</div>'+
      '<div class="ap-seg">'+['work','other'].map(function(c){ return '<button class="ap-seg-btn'+(cat===c?' is-on':'')+'" data-action="pillSetCat" data-id="'+c+'">'+CAT_META[c].label+'</button>'; }).join('')+'</div>'+
      '<div class="ap-menu-hint">Only work apps &amp; sites start an automatic lock-in.</div>' : '<div class="ap-menu-title">Nothing in front right now</div>')+
    '<button class="ap-menu-link" data-action="goToActivitySettings">All apps &amp; sites &rarr;</button>';
}
ACTIONS.pillSetCat = function(el, e, id){ if(ui.pillMenu && ui.pillMenu!=='__none') setActivityCategory(ui.pillMenu, id); renderPillMenu(); updateActivityPill(); playTick(); };
ACTIONS.goToActivitySettings = function(){ ui.pillMenu = null; renderPillMenu(); ui.view='settings'; ui.settingsTab='focus'; renderView(); setTimeout(function(){ const s = document.getElementById('workAppsSection'); if(s) s.scrollIntoView({behavior:'smooth', block:'start'}); }, 40); };
document.addEventListener('pointerdown', function(e){ if(!ui.pillMenu) return; if(e.target.closest && (e.target.closest('#activityPillMenu') || e.target.closest('#activityPill'))) return; ui.pillMenu = null; renderPillMenu(); }, true);
// ---- Settings: sort apps & sites ----
function recentActivityTotals(days){
  const totals = {};
  for(let i=0;i<days;i++){
    const d = addDays(todayStr(), -i);
    const m = appMinutesForDate(d);
    Object.keys(m).forEach(function(k){ totals[k] = (totals[k]||0)+m[k]; });
  }
  Object.keys(activityCats()).forEach(function(k){ if(!Object.keys(totals).some(function(t){ return activityKey(t)===k; })) totals[k] = 0; });
  return Object.keys(totals).map(function(k){ return {name:k, minutes:totals[k]}; }).sort(function(a,b){ return b.minutes-a.minutes; });
}
function workAppsSettingsHtml(){
  const list = recentActivityTotals(14).filter(function(x){ return activityCategory(x.name)!=='neutral'; });
  const filter = ui.workAppFilter || 'all';
  const shown = list.filter(function(x){ const c = activityCategory(x.name); return filter==='all' || c===filter || (filter==='other' && c==='unsorted'); }).slice(0, 60);
  const unsorted = list.filter(function(x){ return activityCategory(x.name)==='unsorted'; }).length;
  return '<div class="card section" id="workAppsSection">'+
    '<div class="section-title">Work apps &amp; sites<span class="kpi-sub">only work ones start an automatic lock-in</span></div>'+
    '<div class="row" style="gap:6px;margin-bottom:10px;flex-wrap:wrap;">'+
      [['all','All'],['work','Work'],['other','Not work']].map(function(f){ return '<button class="btn btn-sm '+(filter===f[0]?'btn-primary':'btn-ghost')+'" data-action="workAppFilter" data-id="'+f[0]+'">'+f[1]+'</button>'; }).join('')+
      (unsorted ? '<span class="kpi-sub" style="align-self:center;">'+unsorted+' not sorted yet (counted as not work)</span>' : '')+
    '</div>'+
    '<div class="wa-list">'+(shown.map(function(x){
      const c = activityCategory(x.name);
      return '<div class="wa-row" data-key="wa-'+escapeHtml(x.name)+'"><span class="wa-dot" style="background:'+CAT_META[c].color+'"></span><span class="wa-name">'+escapeHtml(x.name)+'</span><span class="kpi-sub">'+(x.minutes?fmtDurationLabel(x.minutes)+' / 2 wks':'')+'</span>'+
        '<span class="ap-seg">'+['work','other'].map(function(k){ return '<button class="ap-seg-btn'+(c===k?' is-on':'')+'" data-action="setWorkApp" data-name="'+escapeHtml(x.name)+'" data-id="'+k+'">'+CAT_META[k].label+'</button>'; }).join('')+'</span></div>';
    }).join('') || '<div class="empty">Nothing tracked yet — apps and sites show up here as you use them.</div>')+'</div>'+
    '<div class="row" style="gap:8px;margin-top:10px;"><input class="input" id="newWorkApp" placeholder="Add an app or site (e.g. Final Cut Pro, figma.com)" style="flex:1;"><button class="btn btn-sm" data-action="addWorkApp">Add as work</button></div>'+
  '</div>';
}
ACTIONS.workAppFilter = function(el, e, id){ ui.workAppFilter = id; renderView(); };
ACTIONS.setWorkApp = function(el, e, id){ setActivityCategory(el.dataset.name, id); playTick(); renderView(); };
ACTIONS.addWorkApp = function(){ const i = document.getElementById('newWorkApp'); const v = i && i.value.trim(); if(!v) return; setActivityCategory(v.replace(/^https?:\/\//,'').replace(/^www\./,'').replace(/\/.*$/,''), 'work'); i.value=''; renderView(); };
// ---- End-of-day recap: what you did, how you worked, approve the sessions ----
function sessionsOn(date){ return state.focus.sessions.filter(function(s){ return s.date===date; }).sort(function(a,b){ return a.startedAt-b.startedAt; }); }
function recapNeeded(date){ return sessionsOn(date).some(function(s){ return s.auto && !s.reviewed; }); }
function openDayRecap(date){ ui.recapDate = date || todayStr(); showOverlay('recapOverlay'); renderRecapInto(); }
ACTIONS.openDayRecap = function(el){ openDayRecap(el && el.dataset && el.dataset.date); };
ACTIONS.closeDayRecap = function(){ state.focus.recapSeen = state.focus.recapSeen || {}; state.focus.recapSeen[ui.recapDate] = true; persist('focus'); hideOverlay('recapOverlay'); renderView(); };
function recapTimelineHtml(date, sessions){
  const dayStart = localTs(date, '06:00'), dayEnd = localTs(addDays(date,1), '00:00');
  const span = dayEnd-dayStart;
  const pos = function(ts){ return clamp((ts-dayStart)/span*100, 0, 100); };
  const blocks = sessions.map(function(s){ return '<span class="rc-blk'+(s.auto?' is-auto':'')+(s.auto && !s.reviewed?' is-pending':'')+'" style="left:'+pos(s.startedAt)+'%;width:'+Math.max(0.6, pos(s.endedAt)-pos(s.startedAt))+'%" title="'+fmt12Hour(nowHM(new Date(s.startedAt)))+'–'+fmt12Hour(nowHM(new Date(s.endedAt)))+'"></span>'; }).join('');
  const modes = state.modes.history.filter(function(m){ return m.date===date && m.type==='break'; }).map(function(m){ return '<span class="rc-blk is-break" style="left:'+pos(m.startedAt)+'%;width:'+Math.max(0.4, pos(m.endedAt)-pos(m.startedAt))+'%" title="Break"></span>'; }).join('');
  const ticks = [6,9,12,15,18,21].map(function(h){ return '<span class="rc-tick" style="left:'+pos(localTs(date, pad2(h)+':00'))+'%">'+(h===12?'12p':h>12?(h-12)+'p':h+'a')+'</span>'; }).join('');
  return '<div class="rc-timeline"><div class="rc-track">'+modes+blocks+'</div><div class="rc-ticks">'+ticks+'</div></div>';
}
function renderRecap(){
  const date = ui.recapDate || todayStr();
  const sessions = sessionsOn(date);
  const deep = date===todayStr() ? deepWorkMinutesTodayLive() : deepWorkMinutesFor(date);
  const target = state.standards.deepWorkTargetMinutes || 180;
  const tasksDone = state.tasks.items.filter(function(t){ return t.status==='done' && t.completedAt===date; });
  const breaks = state.modes.history.filter(function(m){ return m.date===date && m.type==='break'; });
  const apps = topAppsForDate(date, 30);
  let workMin = 0, otherMin = 0;
  apps.forEach(function(a){ const c = activityCategory(a.app); if(c==='work') workMin += a.minutes; else if(c!=='neutral') otherMin += a.minutes; });
  const longest = sessions.reduce(function(m,s){ return Math.max(m, s.minutes||0); }, 0);
  const first = sessions[0];
  const pending = sessions.filter(function(s){ return s.auto && !s.reviewed; }).length;
  const stat = function(v, k, cls){ return '<div class="rc-stat'+(cls?' '+cls:'')+'"><div class="stat-tile-v">'+v+'</div><div class="stat-tile-sub">'+k+'</div></div>'; };
  const dayLabel = date===todayStr() ? 'Today' : date===addDays(todayStr(),-1) ? 'Yesterday' : weekdayShort(date);
  return '<div class="rc">'+
    '<div class="rc-head"><div><div class="stat-tile-k">Day recap</div><div class="rc-title">'+dayLabel+' &middot; '+new Date(localTs(date,'12:00')).toLocaleDateString(undefined,{weekday:'long', month:'long', day:'numeric'})+'</div></div>'+
      '<span class="tag '+(dayStandardsComplete(date)?'tag-good':'')+'">'+(dayStandardsComplete(date)?'&#10003; Standard hit':'Standard not hit')+'</span></div>'+
    '<div class="rc-stats">'+
      stat(fmtHours(deep), 'deep work &middot; '+Math.round(deep/target*100)+'% of goal', deep>=target?'is-good':'')+
      stat(sessions.length, 'session'+(sessions.length===1?'':'s')+(longest?' &middot; longest '+fmtDurationLabel(longest):''))+
      stat(tasksDone.length, 'task'+(tasksDone.length===1?'':'s')+' done')+
      stat(first ? fmt12Hour(nowHM(new Date(first.startedAt))) : '—', 'first lock-in')+
    '</div>'+
    recapTimelineHtml(date, sessions)+
    ((workMin || otherMin) ? '<div class="rc-split"><div class="rc-split-bar"><span style="width:'+(workMin/Math.max(1,workMin+otherMin)*100)+'%"></span></div>'+
      '<div class="kpi-sub"><b style="color:var(--good);">'+fmtDurationLabel(workMin)+'</b> on work apps &middot; <b style="color:#ffb3b8;">'+fmtDurationLabel(otherMin)+'</b> on everything else'+(breaks.length?' &middot; '+breaks.length+' break'+(breaks.length===1?'':'s'):'')+'</div></div>' : '')+
    (apps.length ? '<div class="rc-apps">'+apps.slice(0, 6).map(function(a){ const c = activityCategory(a.app); return '<span class="rc-app"><span class="wa-dot" style="background:'+CAT_META[c].color+'"></span>'+escapeHtml(a.app)+'<span class="kpi-sub">'+fmtDurationLabel(a.minutes)+'</span></span>'; }).join('')+'</div>' : '')+
    '<div class="kind-label" style="margin-top:16px;">Sessions'+(pending?' &middot; '+pending+' started automatically to check':'')+'</div>'+
    (sessions.length ? '<div class="rc-sessions">'+sessions.map(function(s){
      return '<div class="rc-sess'+(s.auto && !s.reviewed?' is-pending':'')+'" data-key="rcs-'+s.id+'">'+
        '<span class="rc-sess-time">'+fmt12Hour(nowHM(new Date(s.startedAt)))+' – '+fmt12Hour(nowHM(new Date(s.endedAt)))+'</span>'+
        '<span class="rc-sess-len">'+fmtDurationLabel(s.minutes||0)+'</span>'+
        (s.auto ? '<span class="tag">auto'+(s.app?' &middot; '+escapeHtml(s.app):'')+'</span>' : '<span class="tag tag-good">you</span>')+
        '<span style="flex:1"></span>'+
        (s.auto && !s.reviewed ? '<button class="mini-move mini-move-today" data-action="recapApprove" data-id="'+s.id+'">&#10003; Keep</button>' : (s.auto ? '<span class="kpi-sub">kept</span>' : ''))+
        '<button class="mini-move" data-action="recapEdit" data-id="'+s.id+'">Edit</button>'+
        '<button class="mini-move mini-move-danger" data-action="recapDiscard" data-id="'+s.id+'" title="Wasn\'t real work — remove it">&#10005;</button>'+
      '</div>';
    }).join('')+'</div>' : '<div class="kpi-sub">No locked-in sessions this day.</div>')+
    '<div class="row" style="justify-content:space-between;margin-top:18px;gap:8px;flex-wrap:wrap;">'+
      '<button class="btn btn-ghost btn-sm" data-action="goToActivitySettings">Sort work apps</button>'+
      '<div class="row" style="gap:8px;">'+(pending ? '<button class="btn btn-good" data-action="recapApproveAll">&#10003; Keep all &amp; close</button>' : '<button class="btn btn-primary" data-action="closeDayRecap">Done</button>')+'</div>'+
    '</div>'+
  '</div>';
}
function renderRecapInto(){ const el = document.getElementById('recapContent'); if(el) morphInto(el, renderRecap()); }
registerModal('recapOverlay', renderRecapInto);
function recapSession(id){ return state.focus.sessions.find(function(s){ return s.id===id; }); }
ACTIONS.recapApprove = function(el, e, id){ const s = recapSession(id); if(s){ s.reviewed = true; persist('focus'); playTick(); renderRecapInto(); } };
ACTIONS.recapApproveAll = function(){ sessionsOn(ui.recapDate).forEach(function(s){ if(s.auto) s.reviewed = true; }); persist('focus'); playPositive(); ACTIONS.closeDayRecap(); };
let lastDiscardedSession = null;
ACTIONS.recapDiscard = function(el, e, id){
  const i = state.focus.sessions.findIndex(function(s){ return s.id===id; }); if(i<0) return;
  lastDiscardedSession = {s:state.focus.sessions[i], i:i};
  state.focus.sessions.splice(i, 1);
  persist('focus'); renderRecapInto(); renderView();
  showToast('Session removed', {icon:'&#128465;', actionLabel:'Undo', actionAction:'undoRecapDiscard', duration:7000});
};
ACTIONS.undoRecapDiscard = function(){ if(!lastDiscardedSession) return; state.focus.sessions.splice(lastDiscardedSession.i, 0, lastDiscardedSession.s); lastDiscardedSession = null; persist('focus'); renderView(); if(overlayOpen('recapOverlay')) renderRecapInto(); };
ACTIONS.recapEdit = function(el, e, id){ const s = recapSession(id); if(s) s.reviewed = true; hideOverlay('recapOverlay'); openTimeBlockEdit('session', id); };
// When it pops up: going to sleep, at the recap time in the evening (once), or the next
// morning if yesterday still has automatic sessions to check.
function maybeShowRecap(){
  if(isWakeDisplay || state.focus.activeSession || document.querySelector('.overlay:not(.hidden)')) return;
  const seen = state.focus.recapSeen || {};
  const today = todayStr(), yest = addDays(today, -1);
  const rt = (state.settings.appTracking && state.settings.appTracking.recapTime) || '21:30';
  if(!seen[yest] && recapNeeded(yest) && new Date().getHours()>=5){ openDayRecap(yest); return; }
  if(!seen[today] && nowHM()>=rt && sessionsOn(today).length){ openDayRecap(today); }
}
setInterval(function(){ try{ if(state && state.focus) maybeShowRecap(); }catch(e){} }, 60000);
setTimeout(function(){ try{ maybeShowRecap(); }catch(e){} }, 4000);
