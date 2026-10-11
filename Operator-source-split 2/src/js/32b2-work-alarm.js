// ============ THE WORK ALARM AND YOUR WORK HOURS ============
// A second master alarm, for work. It rings when your work day starts (on your work days, unless you've
// already started), and Next takes you to the work page, the same one Good morning's Get to work opens.
// Your work hours, lunch and a break live with it: Op keeps to them (lunch and breaks are yours, and
// it's only during work hours that it checks in on you).
const WORK_DEFAULT = {enabled:false, start:'09:00', end:'17:00', days:[1,2,3,4,5], lunch:'12:30', lunchMin:45, brk:'15:30', brkMin:15, checkins:true, pace:'normal', sound:'standard'};
function workCfg(){
  const f = state.focus;
  if(!f.work || typeof f.work!=='object') f.work = {};
  const w = f.work;
  Object.keys(WORK_DEFAULT).forEach(function(k){ if(w[k]===undefined) w[k] = Array.isArray(WORK_DEFAULT[k]) ? WORK_DEFAULT[k].slice() : WORK_DEFAULT[k]; });
  if(!Array.isArray(w.days)) w.days = WORK_DEFAULT.days.slice();
  return w;
}
function hmMin(hm){ const m = /^(\d{1,2}):(\d{2})/.exec(hm||''); return m ? Number(m[1])*60 + Number(m[2]) : null; }
function nowMin(){ const d = new Date(); return d.getHours()*60 + d.getMinutes(); }
function workDayToday(){ const t = todayStr(), w = workCfg(); return arr(w.days).indexOf(dowOf(t))>=0 && !(typeof isDayOff==='function' && isDayOff(t)); }
// where in the work day you are: off (not a work day / no hours), before, work, lunch, break, after
function workPhase(){
  const w = workCfg(); if(!w.enabled || !workDayToday()) return 'off';
  const m = nowMin(), s = hmMin(w.start), e = hmMin(w.end), l = hmMin(w.lunch), b = hmMin(w.brk);
  if(s==null || e==null) return 'off';
  if(m < s) return 'before'; if(m >= e) return 'after';
  if(l!=null && m >= l && m < l + (Number(w.lunchMin)||0)) return 'lunch';
  if(b!=null && m >= b && m < b + (Number(w.brkMin)||0)) return 'break';
  return 'work';
}
// minutes of work hours gone by today (lunch and the break don't count)
function workMinutesElapsed(){
  const w = workCfg(), m = nowMin(), s = hmMin(w.start), e = hmMin(w.end); if(s==null || e==null || m <= s) return 0;
  let n = Math.min(m, e) - s;
  [[hmMin(w.lunch), Number(w.lunchMin)||0], [hmMin(w.brk), Number(w.brkMin)||0]].forEach(function(x){ if(x[0]==null) return; n -= Math.max(0, Math.min(Math.min(m, e), x[0] + x[1]) - x[0]); });
  return Math.max(0, n);
}
function workDayState(){ const f = state.focus, t = todayStr(); if(!f.workDay || f.workDay.date!==t) f.workDay = {date:t}; return f.workDay; }
// you've started work today: clocked in, locked in, or some deep work on the books
function workStartedToday(){ const d = workDayState(); return !!(d.clockedInAt || state.focus.activeSession || (typeof deepWorkMinutesTodayLive==='function' && deepWorkMinutesTodayLive() > 0)); }

// ---- the ring ----
function fireWorkAlarm(opts){
  opts = opts || {};
  const w = workCfg();
  workDayState().rangAt = Date.now(); persist('focus');
  wakeRing = {startedAt:Date.now(), test:!!opts.test, work:true};
  ui.wakeMode = 'work';
  if(typeof closeOtherOverlaysForWake==='function') closeOtherOverlaysForWake();
  showOverlay('wakeOverlay'); renderWakeOverlayInto();
  clearInterval(wakeBeepTimer); playAlarmSound(w.sound || 'standard'); wakeBeepTimer = setInterval(function(){ playAlarmSound(w.sound || 'standard'); }, 2600);
  try{ if('Notification' in window && Notification.permission==='granted') new Notification('Operator: Time to work'); }catch(e){}
}
function workRingHtml(){
  const w = workCfg(), name = state.profile.name || '';
  const plan = typeof todaysPlan==='function' ? todaysPlan().filter(function(t){ return t.status!=='done'; }) : [];
  return '<div class="wk2 wk3 wkw" data-sky="'+(typeof skyLook==='function' ? skyLook() : 'day')+'">'+
    '<div class="wk2-aura"><i></i><i></i><i></i></div>'+
    '<div class="wk2-center">'+
      '<div class="wk2-greet">Time to work'+(name ? ', '+escapeHtml(name.split(' ')[0]) : '')+(wakeRing && wakeRing.test ? ' <span class="tag">TEST</span>' : '')+'</div>'+
      '<div class="wk2-clock" id="wakeClock">'+new Date().toLocaleTimeString(undefined, {hour:'numeric', minute:'2-digit'})+'</div>'+
      '<div class="wk3-date">Work hours '+fmt12Hour(w.start)+' to '+fmt12Hour(w.end)+'</div>'+
      '<div class="wkw-plan">'+(plan.length ? '<b>'+plan.length+' thing'+(plan.length===1?'':'s')+' today</b><span>First up: '+escapeHtml(plan[0].title)+'</span>' : '<b>Nothing lined up yet</b><span>Pick your first move on the next page.</span>')+'</div>'+
      '<div class="wk2-actions wk3-actions">'+
        '<button class="wk2-snooze" data-action="workSnooze">5 more minutes</button>'+
        '<button class="wk2-up wkw-go" data-action="workRingNext"><span>Next &#8594;</span></button>'+
      '</div>'+
    '</div>'+
  '</div>';
}
function workRingStop(){ clearInterval(wakeBeepTimer); wakeBeepTimer = null; wakeRing = null; }
ACTIONS.workRingNext = function(){
  workRingStop(); hideOverlay('wakeOverlay'); ui.wakeMode = null;
  clockIn({from:'workalarm'});
};
ACTIONS.workSnooze = function(){
  workRingStop(); hideOverlay('wakeOverlay'); ui.wakeMode = null;
  state.focus.snooze = {ts:Date.now() + 5*60000, work:true}; persist('focus');
  showToast('Ringing again in 5 minutes.', {icon:'&#128188;'});
};
// ---- watching the clock: the alarm, lunch, the break, the end of the day ----
function checkWorkAlarm(){
  const w = workCfg(); if(!w.enabled || !workDayToday()) return;
  const d = workDayState(), m = nowMin(), s = hmMin(w.start), e = hmMin(w.end);
  if(s==null) return;
  // the alarm: once, at the start (or within an hour after, if the app wasn't open)
  if(!d.rangAt && m >= s && m < s + 60 && !workStartedToday() && !overlayOpen('planOverlay')){
    if(overlayOpen('wakeOverlay') && ui.wakeMode==='brief'){
      // still on Good morning: no second alarm, just Op
      d.rangAt = Date.now(); persist('focus');
      opNotify('It’s '+fmt12Hour(w.start)+'. Work starts now. Hit Get to work when you’re ready.', 'concern');
      document.querySelectorAll('#wakeContent .brief-go').forEach(function(b){ b.classList.add('is-nudge'); });
    } else if(!overlayOpen('wakeOverlay')) fireWorkAlarm({});
    return;
  }
  const say = function(key, at, text, mood){ if(at==null || d[key] || m < at || m > at + 20) return; d[key] = Date.now(); persist('focus'); opNotify(text, mood); };
  if(workStartedToday() || state.focus.activeSession){
    const l = hmMin(w.lunch), b = hmMin(w.brk);
    say('lunchSaid', l, 'Lunch. Take your '+(w.lunchMin||45)+' minutes, eat something real. I’ll leave you be.');
    say('lunchBack', l!=null ? l + (Number(w.lunchMin)||0) : null, 'Lunch is over. Back at it.');
    say('brkSaid', b, 'Break time. '+(w.brkMin||15)+' minutes: water, stretch, get away from the screen.');
    say('brkBack', b!=null ? b + (Number(w.brkMin)||0) : null, 'Break’s over. Let’s finish strong.');
  }
  if(e!=null && !d.endSaid && m >= e && m < e + 30 && workStartedToday() && !(state.modes.active && state.modes.active.clockedOut)){
    d.endSaid = Date.now(); persist('focus');
    opNotify('That’s the end of your work hours. Wrap up what you’re on, then clock out.', null);
  }
}
// Op says something on its own (the bubble, and out loud if the voice is on)
function opNotify(text, mood){
  if(typeof opBubShow!=='function') return;
  if(mood && typeof opMood==='function') opMood(mood, 10000);
  OV.cap = overlayOpen('wakeOverlay') && ui.wakeMode==='brief' && document.getElementById('brVoice') ? 'brVoice' : 'opBubText';
  if(OV.cap==='opBubText') opBubShow();
  if(opVoiceOn() && !OV.speaking && !OV.pending && !AI.listening) opSay(text, {cap:OV.cap}); else opCaption(text);
  if(typeof AI!=='undefined'){ AI.history.push({role:'assistant', content:text}); if(AI.history.length > 16) AI.history = AI.history.slice(-16); }
}
setInterval(function(){ try{ checkWorkAlarm(); }catch(e){} }, 20000);
setTimeout(function(){ try{ checkWorkAlarm(); }catch(e){} }, 4000);

// ---- setting it up: a Work tab in the alarm settings ----
function alarmTabsHtml(){
  const t = ui.alarmTab || 'wake';
  return '<div class="seg-tabs al-tabs"><button class="seg-tab'+(t==='wake'?' active':'')+'" data-action="alarmTab" data-id="wake">&#9728;&#65039; Wake up</button><button class="seg-tab'+(t==='work'?' active':'')+'" data-action="alarmTab" data-id="work">&#128188; Work</button></div>';
}
ACTIONS.alarmTab = function(el, e, id){ ui.alarmTab = id; renderWakeSetupInto(); };
function workSetupHtml(){
  const w = workCfg(), names = ['S','M','T','W','T','F','S'];
  const mins = function(key, opts){ return '<select class="input" data-work="'+key+'">'+opts.map(function(m){ return '<option value="'+m+'"'+(Number(w[key])===m?' selected':'')+'>'+m+' min</option>'; }).join('')+'</select>'; };
  const seg = function(key, opts){ return '<div class="seg-tabs" style="margin:0;">'+opts.map(function(o){ return '<button class="seg-tab'+(String(w[key])===String(o[0])?' active':'')+'" data-action="workSet" data-k="'+key+'" data-id="'+o[0]+'">'+o[1]+'</button>'; }).join('')+'</div>'; };
  return '<div class="wake-setup ws-work">'+alarmTabsHtml()+
    '<div class="row" style="justify-content:space-between;align-items:flex-start;gap:12px;">'+
      '<div class="section-title" style="margin:0;">&#128188; Work alarm'+tip('Rings when your work day starts. Next takes you to the work page. Your work hours are when Op checks in on you.')+'</div>'+
      '<label class="ws-switch" title="Turn the work alarm on/off"><input type="checkbox" data-work="enabled" '+(w.enabled?'checked':'')+'><span></span></label>'+
    '</div>'+
    '<div class="ws-main'+(w.enabled?'':' is-off')+'">'+
      '<div class="wsw-hours"><input class="ws-time" type="time" data-work="start" value="'+w.start+'"><span>to</span><input class="ws-time" type="time" data-work="end" value="'+w.end+'"></div>'+
      '<div class="ws-days">'+names.map(function(n, d){ return '<button class="ws-day'+(w.days.indexOf(d)>=0?' is-on':'')+'" data-action="workDayToggle" data-id="'+d+'">'+n+'</button>'; }).join('')+'</div>'+
      '<div class="kpi-sub">'+(w.enabled ? 'Rings at '+fmt12Hour(w.start)+' '+(typeof wakeDaysLabel==='function' ? wakeDaysLabel(w.days) : '') : 'The work alarm is off')+'</div>'+
    '</div>'+
    '<div class="ws-block grid grid-2">'+
      '<div class="field"><label>Lunch</label><div class="row" style="gap:6px;"><input class="input" type="time" data-work="lunch" value="'+(w.lunch||'')+'" style="width:130px;">'+mins('lunchMin', [30, 45, 60, 90])+'</div></div>'+
      '<div class="field"><label>Break</label><div class="row" style="gap:6px;"><input class="input" type="time" data-work="brk" value="'+(w.brk||'')+'" style="width:130px;">'+mins('brkMin', [10, 15, 20, 30])+'</div></div>'+
      '<div class="field"><label>Op checks in on you'+tip('During work hours (not at lunch, on a break, in Shooting, or right after you lock in), Op looks in now and then. Working: it asks if you need anything. Not working: it wants to know why.')+'</label>'+seg('checkins', [[true, 'On'], [false, 'Off']])+'</div>'+
      '<div class="field"><label>How often</label>'+seg('pace', [['light', 'Now and then'], ['normal', 'Normal'], ['strict', 'Strict']])+'</div>'+
      '<div class="field"><label>Alarm sound</label>'+seg('sound', [['peaceful', 'Peaceful'], ['standard', 'Standard'], ['loud', 'Loud']])+'</div>'+
    '</div>'+
    '<div class="row" style="margin-top:18px;justify-content:space-between;gap:8px;flex-wrap:wrap;">'+
      '<button class="btn btn-ghost btn-sm" data-action="workTestNow">&#128276; Test the work alarm</button>'+
      '<button class="btn btn-primary" data-action="closeWakeSetup">Done</button>'+
    '</div>'+
  '</div>';
}
ACTIONS.workDayToggle = function(el, e, id){ const w = workCfg(), d = Number(id), i = w.days.indexOf(d); if(i>=0) w.days.splice(i, 1); else w.days.push(d); w.days.sort(); persist('focus'); renderWakeSetupInto(); };
ACTIONS.workSet = function(el){ const w = workCfg(), k = el.dataset.k, v = el.dataset.id; w[k] = v==='true' ? true : v==='false' ? false : v; persist('focus'); renderWakeSetupInto(); };
ACTIONS.workTestNow = function(){ hideOverlay('wakeSetupOverlay'); fireWorkAlarm({test:true}); };
document.addEventListener('change', function(e){
  const t = e.target, key = t && t.dataset && t.dataset.work; if(!key) return;
  const w = workCfg();
  if(key==='enabled') w.enabled = t.checked;
  else if(key==='lunchMin' || key==='brkMin') w[key] = Number(t.value) || 0;
  else w[key] = t.value;
  // (turning it on, or moving the start, after today's start time doesn't ring it straight away)
  if((key==='enabled' && t.checked) || key==='start'){ const d = workDayState(); if(!d.rangAt && hmMin(w.start)!=null && hmMin(w.start) <= nowMin()) d.rangAt = Date.now(); }
  persist('focus'); renderWakeSetupInto(); renderView();
});
