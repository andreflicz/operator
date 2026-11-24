// ============ ROUND 72: alarms, tags, mornings, your time, music, Op ============
// The list is ROUND-72-LIST.md. UI fixes (calendar, XP page, widgets, Command View) are in 32z84-r72ui.js.
const R72 = {};
function r72P(k, d){ const p = state.profile || {}, o = p.r72 || {}; return o[k]===undefined || o[k]===null ? d : o[k]; }
function r72Set(k, v){ const p = state.profile; if(!p.r72 || typeof p.r72!=='object') p.r72 = {}; p.r72[k] = v; persist('profile'); }
function r72Clock(ts){ return new Date(ts || Date.now()).toLocaleTimeString(undefined, {hour:'numeric', minute:'2-digit'}); }
function r72Pick(list, key, days){
  // a line not used in the last `days` days (14 by default), remembered across mornings
  const f = state.focus, mem = f.r72Said && typeof f.r72Said==='object' ? f.r72Said : (f.r72Said = {});
  const used = arr(mem[key]), cut = Date.now() - (days || 14)*86400000;
  const recent = used.filter(function(u){ return u.at > cut; }).map(function(u){ return u.i; });
  let open = list.map(function(x, i){ return i; }).filter(function(i){ return recent.indexOf(i) < 0; });
  if(!open.length) open = list.map(function(x, i){ return i; });
  const i = open[Math.floor(Math.random()*open.length)];
  mem[key] = used.filter(function(u){ return u.at > cut; }).concat([{i:i, at:Date.now()}]).slice(-60);
  persist('focus');
  return list[i];
}
function r72Name(){ return (String(state.profile.name || '').trim().split(' ')[0]) || ''; }

// =====================================================================================
// 1–4. THE ALARM: snooze, I'm up, turn off, and the screen goes back to the time
// =====================================================================================
function r72WakeRinging(){ return !!(typeof wakeRing!=='undefined' && wakeRing && !wakeRing.work && overlayOpen('wakeOverlay') && ui.wakeMode==='ring'); }
function r72WorkRinging(){ return !!(typeof wakeRing!=='undefined' && wakeRing && wakeRing.work && overlayOpen('wakeOverlay') && ui.wakeMode==='work'); }
function r72ReminderRinging(){ return overlayOpen('alarmOverlay'); }
function r72Snoozed(){ const sn = state.focus.snooze; return sn && sn.ts > Date.now() ? sn : null; }
// snooze: the real one. The screen shows the time, the music stops (a setting, on by default).
wakeSnooze = (function(base){
  return function(){
    const r = base.apply(this, arguments);
    if(r72P('snoozeStopsMusic', true)){ try{ r70StopMusic(); }catch(e){} }
    return r;
  };
})(wakeSnooze);
// the snooze screen: the time, big, and when it rings again
snoozeHtml = function(){
  const sn = state.focus.snooze, name = r72Name();
  const left = sn ? Math.max(0, sn.ts - Date.now()) : 0;
  return '<div class="wk2 wk3 r72-clockface is-snooze" data-sky="'+(typeof skyLook==='function' ? skyLook() : 'night')+'">'+
    '<div class="wk2-aura"><i></i><i></i><i></i></div>'+
    '<div class="wk2-center">'+
      '<div class="wk2-greet">&#128164; Snoozed'+(name ? ', '+escapeHtml(name) : '')+'</div>'+
      '<div class="wk2-clock" id="wakeClock">'+r72Clock()+'</div>'+
      '<div class="wk3-date">'+(sn ? 'Rings again at '+fmtTimeShort(sn.ts)+' &middot; <span id="snzLeft">'+formatElapsed(left)+'</span>' : 'Not ringing')+'</div>'+
      '<div class="wk2-actions wk3-actions r72-acts">'+
        '<button class="wk2-snooze" data-action="r72AlarmOff">Turn off</button>'+
        '<button class="wk2-up" data-action="r72Up"><span>I’m up</span></button>'+
      '</div>'+
      '<button class="r72-gm-link" data-action="snoozeUp">&#9728;&#65039; Start Good morning</button>'+
    '</div>'+
  '</div>';
};
// the ring: Snooze / I'm up / Turn off, and Good morning underneath
wakeRingHtml = (function(base){
  return function(){
    const w = wakeCfg();
    return base.apply(this, arguments).replace(/<div class="wk2-actions wk3-actions">[\s\S]*?<\/div>/,
      '<div class="wk2-actions wk3-actions r72-acts">'+
        '<button class="wk2-snooze" data-action="wakeSnooze">&#128164; Snooze '+(w.snoozeMinutes || 9)+' min</button>'+
        '<button class="wk2-up" data-action="r72Up"><span>I’m up</span></button>'+
        '<button class="wk2-snooze r72-off" data-action="r72AlarmOff">Turn off</button>'+
      '</div><button class="r72-gm-link" data-action="wakeStartDay">&#9728;&#65039; Start Good morning</button>');
  };
})(wakeRingHtml);
// after Turn off: just the time
function r72ClockHtml(){
  const now = typeof wxNow==='function' ? wxNow() : null;
  return '<div class="wk2 wk3 r72-clockface" data-sky="'+(typeof skyLook==='function' ? skyLook() : 'day')+'">'+
    '<div class="wk2-aura"><i></i><i></i><i></i></div>'+
    '<div class="wk2-center">'+
      '<div class="wk2-clock" id="wakeClock">'+r72Clock()+'</div>'+
      '<div class="wk3-date">'+new Date().toLocaleDateString(undefined, {weekday:'long', month:'long', day:'numeric'})+(now ? ' &middot; '+now.temp+'&deg; '+escapeHtml(wxLabel(now.code).toLowerCase()) : '')+'</div>'+
      '<div class="wk2-actions wk3-actions r72-acts">'+
        '<button class="wk2-snooze" data-action="r72ClockClose">Close</button>'+
        '<button class="wk2-up" data-action="wakeStartDay"><span>&#9728;&#65039; Good morning</span></button>'+
      '</div>'+
    '</div>'+
  '</div>';
}
renderWakeScreen = (function(base){ return function(){ return ui.wakeMode==='r72clock' ? r72ClockHtml() : base.apply(this, arguments); }; })(renderWakeScreen);
// "I'm up" (and the Awake tag): the alarm stops, you're logged as up, and the song keeps going unless you said otherwise
r70QuietUp = function(o){
  o = o || {};
  const keep = !r72P('awakeStopsMusic', false) && !o.stopMusic;
  try{ clearInterval(wakeBeepTimer); wakeBeepTimer = null; }catch(e){}
  try{ if(keep) finishWakeMedia(); else stopWakeMedia(false); }catch(e){}
  const wasTest = !!(wakeRing && wakeRing.test);
  wakeRing = null; ui.snzPlaying = false;
  if(state.focus.snooze && state.focus.snooze.wake) state.focus.snooze = null;
  if(!wasTest){
    try{ wakeStandDown(); }catch(e){}
    if(state.modes.active && state.modes.active.sleep) finishActiveMode(true);
    try{ if(typeof applyNightPlanAuto==='function') applyNightPlanAuto(); }catch(e){}
    r70MarkUp();
  }
  persist('focus');
  if(o.stay) return;
  // (from a tag while you're using the app: you stay where you are)
  if(!overlayOpen('wakeOverlay')){ try{ renderView(); }catch(e){} return; }
  ui.view = 'today'; try{ renderView(); }catch(e){}
  const done = function(){ ui.wakeMode = null; hideOverlay('wakeOverlay'); try{ renderView(); }catch(e){} };
  if(overlayOpen('wakeOverlay')) wakeLiftAway(done); else done();
};
ACTIONS.r72Up = function(){ r70QuietUp(); };
// Turn off: everything stops (the song too), and the screen is just the clock
function r72AlarmOff(){
  const wasTest = !!(wakeRing && wakeRing.test);
  try{ clearInterval(wakeBeepTimer); wakeBeepTimer = null; }catch(e){}
  try{ stopWakeMedia(true); const m = wakeCfg().media; if(m && m.type==='music') musicApp('stop'); }catch(e){}
  try{ r70StopMusic(); }catch(e){}
  if(r72ReminderRinging()){ try{ dismissAlarm(); }catch(e){} }
  wakeRing = null; ui.snzPlaying = false;
  const sn = state.focus.snooze; if(sn && (sn.wake || sn.work || sn.alarm)) state.focus.snooze = null;
  if(!wasTest){
    try{ wakeStandDown(); }catch(e){}
    if(state.modes.active && state.modes.active.sleep) finishActiveMode(true);
    r70MarkUp();
  }
  persist('focus');
  ui.wakeMode = 'r72clock';
  if(!overlayOpen('wakeOverlay')) showOverlay('wakeOverlay');
  renderWakeOverlayInto();
  return 'Alarm off.';
}
ACTIONS.r72AlarmOff = function(){ r72AlarmOff(); };
ACTIONS.r72ClockClose = function(){ ui.view = 'today'; try{ renderView(); }catch(e){} wakeLiftAway(function(){ ui.wakeMode = null; hideOverlay('wakeOverlay'); try{ renderView(); }catch(e){} }); };
// the snooze countdown ticks with the clock
const _r72TickSnooze = tickSnooze;
tickSnooze = function(){ try{ _r72TickSnooze(); }catch(e){} };

// =====================================================================================
// 5–7. GOOD MORNING HANDS OFF TO THE APP; THE WORK ALARM TAKES OVER THE SCREEN
// =====================================================================================
// Good morning's big button: into the app (Today), not the lock-in page. The lock-in page comes with the work alarm.
ACTIONS.wakeStartMorning = function(){
  try{ gmLeave(); }catch(e){}
  const m = state.modes.active;
  if(m && (m.morning || m.sleep)) { try{ finishActiveMode(true); }catch(e){} }
  try{ if(typeof applyNightPlanAuto==='function') applyNightPlanAuto(); }catch(e){}
  try{ if(typeof opStop==='function') opStop(); }catch(e){}
  ui.view = 'today'; try{ renderView(); }catch(e){}
  wakeLiftAway(function(){ ui.wakeMode = null; hideOverlay('wakeOverlay'); try{ renderView(); }catch(e){} });
};
wakeBriefHtml = (function(base){
  return function(){
    return base.apply(this, arguments)
      .replace(/<span class="gmm-go-t">Get to Work<\/span>/g, '<span class="gmm-go-t">Start the day</span>')
      .replace(/<span class="bgo-t">Get to work<\/span>/g, '<span class="bgo-t">Start the day</span>');
  };
})(wakeBriefHtml);
// the work alarm: full screen, like Good morning. Only when you're already locked in is it the small card.
function r72WorkLine(){
  return r72Pick([
    'First hour sets the tone. Make it count.', 'One thing at a time. Start with the hardest.', 'Phone down. Door shut. Let’s go.',
    'Nobody’s coming to do it for you. That’s the good news.', 'Show up like it matters, because it does.', 'Do the thing you’d be proudest of by lunch.',
    'Small, sharp, finished. Then the next one.', 'The work you skip today is the work you chase tomorrow.', 'Get the first win on the board.',
    'Clear head, full tank. This is the good part of the day.', 'Start before you feel ready.', 'Momentum is built, not found. Build it.',
    'Be the person your clients think they hired.', 'Ten focused minutes beats an hour of warming up.', 'You already know what to do first.'
  ], 'work');
}
workRingHtml = function(){
  const w = workToday(), name = r72Name();
  const now = typeof wxNow==='function' ? wxNow() : null;
  const today = todayStr();
  const plan = typeof todaysPlan==='function' ? todaysPlan().filter(function(t){ return t.status!=='done'; }) : [];
  const evs = arr(state.calendar.events).filter(function(e){ return e.date===today; }).sort(function(a, b){ return (a.time || '').localeCompare(b.time || ''); });
  const later = evs.filter(function(e){ return !e.time || e.time >= nowHM(); });
  const target = Number(state.standards && state.standards.deepWorkTargetMinutes) || 180;
  if(!ui.r72WorkLine || ui.r72WorkLine.date!==today) ui.r72WorkLine = {date:today, text:r72WorkLine()};
  const tile = function(k, html){ return '<div class="r72w-t"><small>'+k+'</small>'+html+'</div>'; };
  return '<div class="wk2 wk3 wkw r72-work" data-sky="'+(typeof skyLook==='function' ? skyLook() : 'day')+'">'+
    '<div class="wk2-aura"><i></i><i></i><i></i></div>'+
    '<div class="wk2-center">'+
      '<div class="wk2-greet">Time to work'+(name ? ', '+escapeHtml(name) : '')+(wakeRing && wakeRing.test ? ' <span class="tag">TEST</span>' : '')+'</div>'+
      '<div class="wk2-clock" id="wakeClock">'+r72Clock()+'</div>'+
      '<div class="wk3-date">'+fmt12Hour(w.start)+' to '+fmt12Hour(w.end)+(now ? ' &middot; '+now.temp+'&deg; '+escapeHtml(wxLabel(now.code).toLowerCase()) : '')+'</div>'+
      '<div class="r72w-line">'+escapeHtml(ui.r72WorkLine.text)+'</div>'+
      '<div class="r72w-tiles">'+
        tile('First up', plan.length ? '<b>'+escapeHtml(taskName(plan[0]))+'</b><span>'+plan.length+' thing'+(plan.length===1 ? '' : 's')+' today</span>' : '<b>Nothing lined up</b><span>Pick it on the next page</span>')+
        tile('Today', later.length ? '<b>'+escapeHtml(later[0].title)+'</b><span>'+(later[0].time ? fmt12Hour(later[0].time) : 'All day')+(later.length > 1 ? ' &middot; +'+(later.length - 1)+' more' : '')+'</span>' : '<b>Clear calendar</b><span>All yours</span>')+
        tile('Deep work', '<b>'+escapeHtml(fmtDurationLabel(target))+'</b><span>today’s target</span>')+
      '</div>'+
      '<div class="wk2-actions wk3-actions r72-acts">'+
        '<button class="wk2-snooze" data-action="workSnooze">5 more minutes</button>'+
        '<button class="wk2-up wkw-go" data-action="workRingNext"><span>Let’s work &#8594;</span></button>'+
      '</div>'+
    '</div>'+
  '</div>';
};
function r72WorkTakeover(test){
  // from Good morning (or anything else on the wake screen): the screen turns into the work alarm
  if(overlayOpen('wakeOverlay') && ui.wakeMode && ui.wakeMode!=='work'){
    try{ gmLeave(); }catch(e){}
    try{ if(typeof opStop==='function') opStop(); }catch(e){}
  }
  fireWorkAlarm({test:!!test});
}
checkWorkAlarm = (function(base){
  return function(){
    try{
      const w = workToday();
      if(w.enabled && workDayToday()){
        const d = workDayState(), m = nowMin(), s = hmMin(w.start);
        if(s!=null && !d.rangAt && m >= s && m < s + 60){
          d.rangAt = Date.now(); persist('focus');
          // only already being locked in (or on the lock-in page) makes it the small card
          if(state.focus.activeSession || overlayOpen('planOverlay') || overlayOpen('lockSeqOverlay')) workPopShow(!!state.focus.activeSession);
          else if(r72WakeRinging() || r72Snoozed()) workPopShow(false);
          else r72WorkTakeover(false);
        }
      }
    }catch(e){}
    return base.apply(this, arguments);
  };
})(checkWorkAlarm);

// =====================================================================================
// 9–10. TAGS: no pop-ups, no holds, and the morning ones do what they say
// =====================================================================================
// a lock-out tap right after a lock-in just locks out (it used to stop and ask on the Mac)
r70TConfirmOut = function(){ const m = r70LockOutNow(); return m; };
// heading out with "ask me which": no question. A shoot on the calendar (or a shoot day) means shooting.
function r72OutGuess(){
  const t = todayStr();
  try{ if(state.daysOff && state.daysOff.r70Kinds && state.daysOff.r70Kinds[t]==='shoot') return 'shooting'; }catch(e){}
  const shoot = arr(state.calendar.events).some(function(e){ return e.date===t && /shoot|filming|film\b|on.?site|b-?roll/i.test(e.title || ''); });
  return shoot ? 'shooting' : 'other';
}
// going out to shoot or train ends the lock-in (it used to sit on a break all day: "shooting since 7 but locked in")
r70TGoOut = function(kind, tagId){
  const as = state.focus.activeSession;
  let ended = 0;
  if(as && (kind==='shooting' || kind==='training')){ ended = r70LockOutNow(); }
  const broke = !!(state.focus.activeSession && !state.focus.activeSession.onBreak);
  state.focus.r70Out = {kind:kind, startedAt:Date.now(), tagId:tagId || null, brokeSession:broke};
  if(broke){
    try{ opRunTool('take_break', {minutes:90}); }catch(e){}
    try{ const s = state.focus.activeSession; if(s){ const b = arr(s.breaks); if(b.length) b[b.length - 1].note = r70TOutName(kind); } }catch(e){}
  } else if(kind==='shooting' || kind==='training'){
    try{ startMode(kind, {note:r70TOutName(kind)}); }catch(e){}
  } else {
    try{ startMode('offtime', {note:r70TOutName(kind)}); }catch(e){}
  }
  r70StopMusic();
  persist('focus');
  if(ended) return 'Locked out ('+fmtDurationLabel(ended)+') and out '+r70TOutName(kind)+'.';
  return broke ? 'Out for '+r70TOutName(kind)+'. Your session is on a break until you’re back.' : 'Out for '+r70TOutName(kind)+'.';
};
// startMode refused while locked in, so the Shooting button did nothing mid-session. Now shooting (and training,
// sleep, time off) ends the session first.
startMode = (function(base){
  return function(type, extra){
    if(state.focus.activeSession && /^(shooting|training|offtime)$/.test(type || '') && !(extra && extra.linkedFocus)){
      try{ r70LockOutNow(); }catch(e){}
    }
    return base.apply(this, arguments);
  };
})(startMode);
// the lock-in from a tag: a moment of animation first, then the session and its music, like doing it by hand
function r72LockFx(then){
  let el = document.getElementById('r72LockFx');
  if(!el){ el = document.createElement('div'); el.id = 'r72LockFx'; document.body.appendChild(el); }
  el.innerHTML = '<div class="r72lf-ring"><svg viewBox="0 0 120 120"><circle cx="60" cy="60" r="52" class="r72lf-bg"/><circle cx="60" cy="60" r="52" class="r72lf-fg"/></svg><span>&#128274;</span></div><b>Locking in</b>';
  el.classList.remove('is-out'); el.classList.add('is-in');
  try{ if(typeof soundPref!=='function' || soundPref('workintro', true)) playSfx('workintro', function(){ tone([523, 659, 784], 0.3, 0.25); }); }catch(e){}
  setTimeout(function(){ try{ then && then(); }catch(e){} const b = el.querySelector('b'); if(b) b.textContent = 'Locked in'; el.classList.add('is-done'); }, 1500);
  setTimeout(function(){ el.classList.add('is-out'); }, 2300);
  setTimeout(function(){ el.classList.remove('is-in', 'is-out', 'is-done'); }, 2800);
}
function r72TagLockIn(){
  // the session starts now (so the time and the phone are right away right); the screen catches up after the moment
  const was = ui.view;
  try{ opRunTool('lock_in', {}); }catch(e){ return 'Couldn’t lock in: '+(e.message || e); }
  ui.view = was; ui.focusTab = 'tasks';
  try{ renderView(); }catch(e){}
  r72LockFx(function(){
    ui.view = 'focus'; ui.focusTab = 'tasks';
    try{ playLockInSong(); }catch(e){}
    try{ renderView(); }catch(e){}
  });
  return 'Locked in.';
}
R70T_ACTS.splice(R70T_ACTS.findIndex(function(a){ return a.id==='sleep'; }) + 1, 0,
  {id:'snooze', g:'Your day', label:'Snooze the alarm', icon:'&#128164;', place:'the nightstand'},
  {id:'alarmoff', g:'Your day', label:'Turn the alarm off', icon:'&#128277;', place:'the nightstand'});
(function(){ const a = R70T_ACTS.find(function(x){ return x.id==='awake'; }); if(a) a.label = 'I’m awake (stops the alarm, logs that I’m up)'; })();
r70TRunStep = (function(base){
  return function(s, g, value){
    const act = s && s.act, as = state.focus.activeSession;
    if(act==='lockin' || act==='locktoggle'){
      if(as && act==='locktoggle') return r70TRunStep({act:'lockout'}, g);
      if(as) return 'Already locked in, '+fmtDurationLabel(Math.max(1, Math.round((Date.now() - as.startedAt)/60000)))+'.';
      return r72TagLockIn();
    }
    if(act==='lockout'){
      if(!as) return 'You weren’t locked in.';
      const mins = r70LockOutNow();
      return 'Locked out. '+fmtDurationLabel(mins)+' this session.';
    }
    if(act==='sleep' || act==='snooze'){
      if(r72WakeRinging()){ wakeSnooze(); const sn = r72Snoozed(); return 'Snoozed'+(sn ? ' until '+fmtTimeShort(sn.ts) : '')+'.'; }
      if(r72WorkRinging()){ ACTIONS.workSnooze(); return 'Work alarm snoozed, 5 minutes.'; }
      if(r72ReminderRinging()){ try{ snoozeAlarm(); }catch(e){} return 'Snoozed.'; }
      const sn = r72Snoozed();
      if(sn && sn.wake) return 'Already snoozed until '+fmtTimeShort(sn.ts)+'.';
      if(act==='snooze') return 'No alarm going.';
      const m = state.modes && state.modes.active;
      if(m && m.sleep) return 'Already down for the night.';
      r70TSleepStart();
      return 'Goodnight. I’ll be quiet until the alarm.';
    }
    if(act==='alarmoff'){
      if(!r72WakeRinging() && !r72WorkRinging() && !r72ReminderRinging() && !r72Snoozed()) return 'No alarm going.';
      return r72AlarmOff();
    }
    if(act==='awake'){
      // up: the alarm stops (the song plays on unless you've said otherwise), and the sleep is saved
      const ringing = r72WakeRinging() || !!r72Snoozed();
      const slept = r70TWakeUp();
      return (ringing ? 'Alarm off. ' : '')+(slept ? 'Morning. '+slept+'.' : 'Morning.');
    }
    if(act==='out' && (s.kind || 'ask')==='ask' && !String(value || '')) return base.call(this, Object.assign({}, s, {kind:r72OutGuess()}), g, value);
    if(act==='read'){ const t = r72DayReadout(); try{ if(opVoiceOn()) opSay(t.replace(/\n/g, ' '), {cap:'opBubText'}); }catch(e){} return t.replace(/\n/g, ' '); }
    return base.apply(this, arguments);
  };
})(r70TRunStep);
// r70TWakeUp lifts the alarm through r70QuietUp, which now keeps the song unless you said otherwise
// the starter set: Awake just wakes you; Good morning is its own tag
(function(){
  const aw = R70T_STARTERS.find(function(s){ return s.id==='awake'; });
  if(aw){ aw.about = 'Up. Stops the alarm and saves how long you slept. Your song keeps playing.'; aw.steps = [{act:'awake'}]; }
  if(!R70T_STARTERS.some(function(s){ return s.id==='gm'; })){
    const i = R70T_STARTERS.findIndex(function(s){ return s.id==='awake'; });
    R70T_STARTERS.splice(i + 1, 0, {id:'gm', name:'Good morning', place:'the nightstand', icon:'&#127749;', about:'Starts Good morning (and logs that you’re up).', steps:[{act:'goodmorning'}]});
  }
  const sl = R70T_STARTERS.find(function(s){ return s.id==='sleep'; }); if(sl) sl.about = 'Goodnight. If the alarm is going, it snoozes it.';
})();
// once: the Awake tag you already have stops starting Good morning, and you get a Good morning tag next to it
setTimeout(function(){
  try{
    if(!state.tags || state.tags.r72Mig) return;
    const L = r70TagList(), aw = L.find(function(g){ return g.starter==='awake'; });
    if(aw && arr(aw.steps).length===1 && aw.steps[0].act==='goodmorning') aw.steps[0].act = 'awake';
    if(aw && !L.some(function(g){ return g.starter==='gm'; })) r70TStarterMake('gm');
    state.tags.r72Mig = true; persist('tags');
  }catch(e){}
}, 0);
// a new tag is hands-free by default: the banner (and having to tap it) was the pop-up getting in the way
ACTIONS.r70TWizOpen = function(){ ui.r70TWiz = {step:1, picks:[], name:'', place:'', how:'hands'}; playTick(); renderView(); };
r70TWizHtml = (function(base){
  return function(){
    return base.apply(this, arguments)
      .replace('Turn <b>Ask Before Running</b> off.</li>', 'Pick <b>Run Immediately</b> (on older iPhones: turn <b>Ask Before Running</b> off) and turn <b>Notify When Run</b> off.</li>')
      .replace('<b>Tap and open</b><span>Easiest. A banner pops up on your phone and you tap it. Nothing to install.</span>', '<b>Tap and open</b><span>A banner pops up and you have to tap it. Fine for a test.</span>')
      .replace('<b>Hands-free</b><span>No banner, nothing to tap. One Shortcuts automation to set up, once per tag.</span>', '<b>Hands-free</b><span>Recommended. No banner, nothing to tap or hold: it just happens. One Shortcuts automation per tag.</span>');
  };
})(r70TWizHtml);
// Settings → Tags: make the ones you have hands-free
function r72HandsHtml(){
  const L = r70TagList().filter(function(g){ return g.on; });
  if(!L.length) return '';
  return '<div class="card section op-settings r72-hands"><div class="section-title">&#9889; No pop-ups: make your tags hands-free</div>'+
    '<p class="r70t-p">With a plain link, the iPhone shows a banner you have to tap (and unlock for). A Shortcuts automation runs the tag the moment you tap it, with nothing on screen.</p>'+
    '<ol class="r69-steps"><li>iPhone: <b>Shortcuts → Automation → + → NFC → Scan</b>, and hold the sticker to the phone.</li>'+
      '<li>Pick <b>Run Immediately</b> and turn <b>Notify When Run</b> off.</li>'+
      '<li>Add <b>Get Contents of URL</b> and paste that tag’s link from below. Done.</li></ol>'+
    '<div class="r72-hl">'+L.map(function(g){ const link = r70TLink(g); return '<div class="r72-hr"><b>'+escapeHtml(g.name)+'</b><code>'+escapeHtml(link)+'</code><button class="btn btn-sm" data-action="r70TCopy" data-id="'+escapeHtml(link)+'">Copy</button></div>'; }).join('')+'</div>'+
  '</div>';
}
r70TSettingsHtml = (function(base){ return function(){ const h = base.apply(this, arguments); let x = ''; try{ x = r72HandsHtml(); }catch(e){} return h.replace(/(<div class="card section op-settings"><div class="section-title">&#128225; Your tags)/, function(m){ return x+m; }) || h; }; })(r70TSettingsHtml);

// =====================================================================================
// 11. GOOD MORNING SOUNDS LIKE A PERSON
// =====================================================================================
// Op says three things: hello (with the weather), one remark about the day, and something to get you ready.
// Different every morning; nothing about coffee; never the whole day read out.
const R72_GM_HELLO = [
  'Morning, {n}.', 'Good morning, {n}.', 'Hey {n}. You’re up.', 'There he is. Morning, {n}.', 'Rise and shine, {n}.', 'Morning, {n}. Let’s have a day.',
  'Up and at it, {n}.', 'Good to see you, {n}.', 'Morning, {n}. Fresh start.', 'Hey, {n}. New day.', 'Look who’s up. Morning, {n}.',
  'Morning, {n}. Hope you slept like a rock.', '{n}. Good morning.', 'Another one, {n}. Let’s go get it.', 'Morning, boss.', 'Top of the morning, {n}.'
];
const R72_GM_GO = [
  'Ease in, then lock in. The first hour is yours.', 'Get your head right. Then go win the morning.', 'Do one hard thing early and the day gets easy.',
  'Set the tone. Everything else follows it.', 'You know what matters today. Go get it.', 'Wake up properly, then let’s get to work.',
  'Win the first hour and you win the day.', 'Clear head, one goal. Let’s move.', 'Get moving. The work’s waiting and so is the money.',
  'Stretch, drink some water, then lock in.', 'Today’s a good day to be dangerous with your time.', 'Build something today you’re proud of tonight.',
  'Show up for the version of you that’s already winning.', 'Make today count. You won’t get it back.', 'Slow start is fine. A soft start isn’t. Let’s go.',
  'Light’s on, phone’s down, game face on.', 'Take your time waking up. Then don’t waste a minute.', 'Big things happen to people who start early. You started.'
];
function r72DayShape(){
  const t = todayStr(), now = nowHM();
  const evs = arr(state.calendar.events).filter(function(e){ return e.date===t; }).sort(function(a, b){ return (a.time || '').localeCompare(b.time || ''); });
  const shoots = evs.filter(function(e){ return /shoot|filming|on.?site/i.test(e.title || ''); });
  const calls = evs.filter(function(e){ return /call|meet|zoom|sync|pitch/i.test(e.title || ''); });
  const due = arr(state.tasks.items).filter(function(x){ return x.status!=='done' && x.deadline && x.deadline <= t; });
  const off = typeof isDayOff==='function' && isDayOff(t);
  const score = evs.length + shoots.length*2 + due.length;
  return {evs:evs, shoots:shoots, calls:calls, due:due, off:off, big:score >= 4, light:score <= 1, first:evs.find(function(e){ return !e.time || e.time >= now; })};
}
function r72DayComment(){
  const D = r72DayShape();
  const first = D.first ? (D.first.time ? fmt12Hour(D.first.time)+', ' : '')+D.first.title : '';
  if(!D.shoots.length && D.off) return r72Pick(['It’s a day off. Enjoy it, properly.', 'Day off today. Rest is part of the plan.', 'Nothing on the books. A day off is a day off.'], 'gmoff');
  if(D.shoots.length) return (D.big ? 'Big one today: ' : 'Shoot day: ')+D.shoots[0].title+(D.shoots[0].time ? ' at '+fmt12Hour(D.shoots[0].time) : '')+(D.evs.length > 1 ? ', and '+(D.evs.length - 1)+' more after.' : '.');
  if(D.big) return 'Busy one. '+D.evs.length+' on the calendar'+(D.due.length ? ' and '+D.due.length+' due' : '')+(first ? ', starting with '+first+'.' : '.');
  if(D.due.length) return D.due.length===1 ? 'One thing due today: '+taskName(D.due[0])+'.' : D.due.length+' things due today. Knock them out early.';
  if(D.evs.length) return 'Just '+(D.evs.length===1 ? 'one thing' : D.evs.length+' things')+' on the calendar'+(first ? ': '+first+'.' : '.')+' Plenty of room to get ahead.';
  return r72Pick(['Calendar’s clear. Good day to get ahead.', 'Nothing booked. The day is yours to shape.', 'Wide open today. Perfect for deep work.'], 'gmclear');
}
function r72Weather(){
  const now = typeof wxNow==='function' ? wxNow() : null; if(!now) return '';
  const label = String(wxLabel(now.code) || '').toLowerCase();
  return r72Pick(['{t} and {l} out there', 'It’s {t} and {l}', '{l}, {t} right now', 'Looking {l} outside, {t}'], 'gmwx').replace('{t}', now.temp+'°').replace('{l}', label)+
    (now.hi!=null && Math.abs(now.hi - now.temp) >= 3 ? ', up to '+now.hi+' later.' : '.');
}
function r72GmLines(){
  const today = todayStr(), f = state.focus;
  if(f.r72Gm && f.r72Gm.date===today && f.r72Gm.lines) return f.r72Gm.lines;
  const n = r72Name() || 'boss';
  const lines = {hello:r72Pick(R72_GM_HELLO, 'gmhello').replace(/\{n\}/g, n), wx:r72Weather(), day:r72DayComment(), go:r72Pick(R72_GM_GO, 'gmgo')};
  f.r72Gm = {date:today, lines:lines}; persist('focus');
  // with the key, Op writes his own three lines from the same facts (no coffee, never yesterday's)
  if(AI.hasKey===true && typeof aiWrite==='function'){
    const D = r72DayShape(), past = arr(f.r72GmPast).slice(-6).join(' | ');
    const facts = ['Name: '+n, 'Weather: '+(lines.wx || 'unknown'), 'Day: '+(D.off ? 'day off' : D.evs.length+' calendar items ('+D.evs.slice(0, 3).map(function(e){ return (e.time ? fmt12Hour(e.time)+' ' : '')+e.title; }).join('; ')+'), '+D.due.length+' tasks due'), 'Weekday: '+new Date().toLocaleDateString(undefined, {weekday:'long'})].join('\n');
    const task = 'You are Op, the voice of my productivity app, saying good morning to me out loud as I wake up. Write exactly three short spoken lines:\n'+
      'hello: a greeting by name with the weather in it (under 16 words)\nday: ONE remark on whether today is big or light, naming at most one thing (under 16 words). Never list the day.\n'+
      'go: one line that gets me in the mindset to lock in and work (under 14 words).\n'+
      'Sound like a real person who knows me: warm, direct, a little edge. Never mention coffee. Never use these lines again: '+(past || 'none')+'\n'+
      'Answer as three lines: hello: … / day: … / go: …\n\n'+facts;
    try{
      aiWrite(task, {max:220}).then(function(t){
        if(!t) return;
        const got = {}; String(t).split(/\n/).forEach(function(r){ const m = /^\s*(hello|day|go)\s*:\s*(.+?)\s*$/i.exec(r); if(m && m[2].length < 200 && !/coffee/i.test(m[2])) got[m[1].toLowerCase()] = m[2].replace(/^[“"]|[”"]$/g, ''); });
        if(got.hello && got.day && got.go){
          f.r72Gm = {date:today, lines:{hello:got.hello, wx:'', day:got.day, go:got.go}, ai:true};
          f.r72GmPast = arr(f.r72GmPast).concat([got.hello, got.go]).slice(-14);
          persist('focus');
          // not yet spoken? use them
          if(ui.wakeMode==='brief' && OV.idx < 0 && ui.briefLines) r72GmApply(ui.briefLines);
        }
      }).catch(function(){});
    }catch(e){}
  }
  return lines;
}
// the brief's narration becomes: hello + weather (with the first panel), the day (with Today), get ready (at the end)
function r72GmApply(lines){
  if(!lines || !lines.length) return lines;
  const L = r72GmLines();
  const first = lines[0], dayL = lines.find(function(l){ return l.key==='day'; }), last = lines[lines.length - 1];
  const out = [{at:first.at, text:(L.wx ? L.wx : ''), key:'r72hello'}];
  if(dayL && dayL!==first) out.push({at:dayL.at, text:L.day, key:'r72day'});
  else out.push({at:first.at + 2600, text:L.day, key:'r72day'});
  out.push({at:Math.max(last.at, out[out.length - 1].at + 2600), text:L.go, key:'r72go'});
  ui.briefLines = out;
  return out;
}
wakeBriefHtml = (function(base){
  return function(){
    const h = base.apply(this, arguments);
    try{ r72GmApply(ui.briefLines); }catch(e){}
    return h;
  };
})(wakeBriefHtml);
opBriefGreeting = function(){ try{ return r72GmLines().hello; }catch(e){ return 'Good morning'+(r72Name() ? ', '+r72Name() : '')+'.'; } };
// the old per-panel rewrite asked for lines "like you're talking to me over coffee": off
opBriefRewrite = function(){};
// and his stock greetings lose the coffee ones
try{ Object.keys(OP_GREETS).forEach(function(k){ OP_GREETS[k] = OP_GREETS[k].filter(function(l){ return !/coffee/i.test(l); }); }); }catch(e){}
try{ if(typeof OP_HELLOS!=='undefined') Object.keys(OP_HELLOS).forEach(function(k){ if(Array.isArray(OP_HELLOS[k])) OP_HELLOS[k] = OP_HELLOS[k].filter(function(l){ return !/coffee/i.test(l); }); }); }catch(e){}

// =====================================================================================
// 12. "READ ME THE DAY": three short lines
// =====================================================================================
function r72Where(){
  const as = state.focus.activeSession, m = state.modes && state.modes.active, o = state.focus.r70Out;
  const mins = function(t){ return fmtDurationLabel(Math.max(1, Math.round((Date.now() - t)/60000))); };
  if(as && as.onBreak) return 'On a break'+(as.breakEndsAt ? ', back at '+fmtTimeShort(as.breakEndsAt) : '')+'.';
  if(as) return 'Locked in for '+mins(as.startedAt)+(ui.currentTaskId ? ', on '+((state.tasks.items.find(function(t){ return t.id===ui.currentTaskId; }) || {}).title || 'a task') : '')+'.';
  if(m && m.type==='shooting') return 'Shooting, '+mins(m.startedAt)+' in.';
  if(m && m.type==='training') return 'Training, '+mins(m.startedAt)+' in.';
  if(m && m.sleep) return 'Down for the night.';
  if(m && m.type==='break') return 'On a break.';
  if(m && m.type==='offtime') return 'Off the clock'+(m.note ? ' ('+m.note+')' : '')+'.';
  if(o) return 'Out ('+r70TOutName(o.kind)+').';
  return 'Not locked in.';
}
function r72Next(){
  const D = r72DayShape();
  const plan = typeof todaysPlan==='function' ? todaysPlan().filter(function(t){ return t.status!=='done'; }) : [];
  const bits = [];
  if(D.first) bits.push((D.first.time ? fmt12Hour(D.first.time)+': ' : '')+D.first.title);
  if(plan.length) bits.push((bits.length ? 'then ' : '')+taskName(plan[0]));
  return bits.length ? 'Next: '+bits.join(', ')+'.' : 'Nothing lined up next.';
}
function r72Shape(){
  const done = typeof deepWorkMinutesFor==='function' ? deepWorkMinutesFor(todayStr()) || 0 : 0;
  const target = Number(state.standards && state.standards.deepWorkTargetMinutes) || 180;
  const shoot = typeof modeMinutesFor==='function' ? modeMinutesFor(todayStr(), 'shooting') : 0;
  const left = arr(state.tasks.items).filter(function(t){ return t.status==='today'; }).length;
  return fmtDurationLabel(done || 0)+' of '+fmtDurationLabel(target)+' deep work'+(shoot ? ', '+fmtDurationLabel(shoot)+' shooting' : '')+(left ? ', '+left+' task'+(left===1 ? '' : 's')+' left' : '')+'.';
}
function r72DayReadout(){ return [r72Where(), r72Next(), r72Shape()].join('\n'); }
// asking Op for it: answered on the spot, the same three lines, even without the key
const R72_READ_RE = /^\s*(op[, ]+)?(read me the day|read the day|run me through (the|my) day|where am i(\s+at)?(\s+today)?|what'?s my day( look(ing)? like)?|day (readout|summary))\b/i;
aiAsk = (function(base){
  return function(text){
    if(R72_READ_RE.test(String(text || ''))){
      const t = r72DayReadout();
      try{ opChatLog('me', String(text)); opChatLog('op', t.replace(/\n/g, ' ')); }catch(e){}
      try{ if(typeof opBubShow==='function') opBubShow(); }catch(e){}
      try{ if(opVoiceOn()) return opSay(t.replace(/\n/g, ' '), {cap:'opBubText'}); opCaption(t); }catch(e){}
      return Promise.resolve(t);
    }
    return base.apply(this, arguments);
  };
})(aiAsk);

// =====================================================================================
// 13. OP CAN DO EVERYTHING: sessions, time, and any button
// =====================================================================================
OP_TOOLS.push(
  {name:'list_sessions', description:'List his work sessions for a day (default today), with ids, start, end and length. Use before editing one.', input_schema:{type:'object', properties:{date:{type:'string', description:'YYYY-MM-DD'}}}},
  {name:'change_session', description:'Change any finished work session: its start, end, or take minutes off. Use list_sessions first for the id (or which:"last"). Times "YYYY-MM-DD HH:MM" 24h.', input_schema:{type:'object', properties:{id:{type:'string'}, which:{type:'string', description:'"last" or "longest_today"'}, start:{type:'string'}, end:{type:'string'}, minus_minutes:{type:'number'}, minutes:{type:'number', description:'set the length'}}}},
  {name:'add_session', description:'Add a work session after the fact (e.g. "I worked 2 to 5 yesterday").', input_schema:{type:'object', properties:{start:{type:'string'}, end:{type:'string'}, note:{type:'string'}}, required:['start', 'end']}},
  {name:'log_time', description:'Log a stretch of non-work time after the fact: shooting, training, a break or time off (e.g. "we shot from 7 to 1").', input_schema:{type:'object', properties:{kind:{type:'string', enum:['shooting', 'training', 'break', 'offtime']}, start:{type:'string'}, end:{type:'string'}, note:{type:'string'}}, required:['kind', 'start', 'end']}},
  {name:'start_mode', description:'Start shooting, training, a break or time off right now (ends a lock-in first).', input_schema:{type:'object', properties:{kind:{type:'string', enum:['shooting', 'training', 'break', 'offtime']}, note:{type:'string'}}, required:['kind']}},
  {name:'alarm', description:'Work the alarms: snooze, off (turn it off), up (I’m up), or set the wake time / switch it on or off.', input_schema:{type:'object', properties:{action:{type:'string', enum:['snooze', 'off', 'up', 'set', 'enable', 'disable']}, which:{type:'string', enum:['wake', 'work']}, time:{type:'string', description:'HH:MM 24h'}}, required:['action']}},
  {name:'press', description:'Press any button in the app by its action name (what a data-action attribute holds), with an optional id. For anything no other tool covers. list_buttons shows what’s on screen.', input_schema:{type:'object', properties:{action:{type:'string'}, id:{type:'string'}}, required:['action']}},
  {name:'list_buttons', description:'The buttons on the screen right now: their action names, ids and labels.', input_schema:{type:'object', properties:{}}},
  {name:'set_setting', description:'Change one of his app settings by key (profile, settings or focus.work / focus.wake). path like "profile.r72.autoMusic" and a value.', input_schema:{type:'object', properties:{path:{type:'string'}, value:{}}, required:['path', 'value']}}
);
function r72Ts(s){ const m = /^(\d{4}-\d{2}-\d{2})[ T](\d{1,2}):(\d{2})/.exec(String(s || '')); if(!m) return null; return localTs(m[1], (m[2].length===1 ? '0' : '')+m[2]+':'+m[3]); }
function r72FindSession(x){
  const S = state.focus.sessions;
  if(x.id) return S.find(function(s){ return s.id===x.id; }) || null;
  if(x.which==='longest_today'){ const t = todayStr(); return S.filter(function(s){ return s.date===t; }).sort(function(a, b){ return (b.minutes || 0) - (a.minutes || 0); })[0] || null; }
  return S.slice().sort(function(a, b){ return (b.endedAt || 0) - (a.endedAt || 0); })[0] || null;
}
function r72SessFix(s){
  s.minutes = Math.max(1, Math.round((s.endedAt - s.startedAt)/60000) - (arr(s.breaks).reduce(function(a, b){ return a + Math.max(0, Math.round(((b.end || b.endedAt || 0) - (b.start || b.startedAt || 0))/60000)); }, 0)));
  s.date = todayStr(new Date(s.startedAt)); s.edited = true;
}
opRunTool = (function(base){
  return function(name, x){
    x = x || {};
    if(name==='list_sessions'){
      const d = x.date || todayStr();
      const L = state.focus.sessions.filter(function(s){ return s.date===d; });
      return L.length ? L.map(function(s){ return s.id+': '+fmtTimeShort(s.startedAt)+'–'+fmtTimeShort(s.endedAt)+' ('+fmtDurationLabel(s.minutes)+')'+(s.auto ? ' auto' : ''); }).join('\n') : 'no sessions on '+d;
    }
    if(name==='change_session'){
      const s = r72FindSession(x); if(!s) throw new Error('no such session');
      const st = x.start ? r72Ts(x.start) : null, en = x.end ? r72Ts(x.end) : null;
      if(x.start && !st) throw new Error('start must be YYYY-MM-DD HH:MM');
      if(x.end && !en) throw new Error('end must be YYYY-MM-DD HH:MM');
      if(st) s.startedAt = st; if(en) s.endedAt = en;
      if(Number(x.minus_minutes) > 0) s.endedAt = Math.max(s.startedAt + 60000, s.endedAt - Math.round(Number(x.minus_minutes))*60000);
      if(Number(x.minutes) > 0) s.endedAt = s.startedAt + Math.round(Number(x.minutes))*60000;
      if(s.endedAt <= s.startedAt) throw new Error('the end has to be after the start');
      r72SessFix(s); persist('focus'); try{ renderView(); }catch(e){}
      return 'session is now '+fmtTimeShort(s.startedAt)+'–'+fmtTimeShort(s.endedAt)+' ('+fmtDurationLabel(s.minutes)+')';
    }
    if(name==='add_session'){
      const st = r72Ts(x.start), en = r72Ts(x.end); if(!st || !en || en <= st) throw new Error('start and end as YYYY-MM-DD HH:MM, end after start');
      if(en > Date.now() + 60000) throw new Error('that ends in the future');
      const s = {id:uid(), type:'deep', startedAt:st, endedAt:en, breaks:[], completedTasks:[], note:String(x.note || ''), manual:true};
      r72SessFix(s); state.focus.sessions.push(s); persist('focus'); try{ renderView(); }catch(e){}
      return 'added '+fmtDurationLabel(s.minutes)+' on '+s.date;
    }
    if(name==='log_time') return r72LogTime(x.kind, r72Ts(x.start), r72Ts(x.end), x.note);
    if(name==='start_mode'){
      const k = String(x.kind || '');
      if(k==='break'){ if(state.focus.activeSession) return opRunTool('take_break', {minutes:15}); startMode('break', {note:x.note || ''}); return 'on a break'; }
      startMode(k, {note:x.note || ''}); return k+' started';
    }
    if(name==='alarm'){
      const a = x.action, which = x.which || 'wake';
      if(a==='snooze') return r70TRunStep({act:'snooze'}, null);
      if(a==='off') return r72AlarmOff();
      if(a==='up'){ r70QuietUp(); return 'up'; }
      const cfg = which==='work' ? workCfg() : wakeCfg();
      if(a==='enable' || a==='disable'){ cfg.enabled = a==='enable'; persist('focus'); try{ renderView(); }catch(e){} return which+' alarm '+(cfg.enabled ? 'on' : 'off'); }
      if(a==='set'){ if(!/^\d{1,2}:\d{2}$/.test(String(x.time || ''))) throw new Error('time as HH:MM'); const tm = String(x.time).padStart(5, '0'); if(which==='work') cfg.start = tm; else cfg.time = tm; cfg.enabled = true; persist('focus'); try{ renderView(); }catch(e){} return which+' alarm set for '+fmt12Hour(tm); }
      throw new Error('unknown alarm action');
    }
    if(name==='list_buttons'){
      const seen = {}, out = [];
      document.querySelectorAll('[data-action]').forEach(function(el){
        if(el.offsetParent===null && !el.closest('.overlay:not(.hidden)')) return;
        const k = el.dataset.action+'|'+(el.dataset.id || el.dataset.tab || el.dataset.view || ''); if(seen[k] || out.length > 120) return; seen[k] = 1;
        out.push(el.dataset.action+(el.dataset.id ? ' id='+el.dataset.id : el.dataset.tab ? ' tab='+el.dataset.tab : el.dataset.view ? ' view='+el.dataset.view : '')+' — '+String(el.getAttribute('title') || el.textContent || '').replace(/\s+/g, ' ').trim().slice(0, 50));
      });
      return out.join('\n') || 'nothing to press';
    }
    if(name==='press'){
      const act = String(x.action || ''); if(!act) throw new Error('missing action');
      if(/^(r70TDel|resetAll|clearAll|confirmReset|deleteAll|wipe)/i.test(act)) throw new Error('that one deletes things: ask him to press it himself');
      const sel = '[data-action="'+act.replace(/"/g, '')+'"]'+(x.id ? '[data-id="'+String(x.id).replace(/"/g, '')+'"]' : '');
      const el = document.querySelector(sel);
      if(el){ el.click(); return 'pressed '+act; }
      if(typeof ACTIONS[act]==='function'){ const fake = document.createElement('button'); fake.dataset.action = act; if(x.id) fake.dataset.id = String(x.id); ACTIONS[act](fake, {target:fake, preventDefault:function(){}, stopPropagation:function(){}}, x.id || null); try{ renderView(); }catch(e){} return 'ran '+act; }
      throw new Error('no button called '+act);
    }
    if(name==='set_setting'){
      const p = String(x.path || '').split('.'); const roots = {profile:state.profile, settings:state.settings, focus:state.focus};
      if(p.length < 2 || !roots[p[0]]) throw new Error('path starts with profile, settings or focus');
      if(p[0]==='focus' && !/^(work|wake)$/.test(p[1])) throw new Error('only focus.work and focus.wake');
      let o = roots[p[0]]; for(let i = 1; i < p.length - 1; i++){ if(!o[p[i]] || typeof o[p[i]]!=='object') o[p[i]] = {}; o = o[p[i]]; }
      o[p[p.length - 1]] = x.value; persist(p[0]); try{ renderView(); }catch(e){}
      return 'set '+x.path;
    }
    return base.apply(this, arguments);
  };
})(opRunTool);
try{ if(typeof R62_TOOL_LABEL!=='undefined') Object.assign(R62_TOOL_LABEL, {list_sessions:'Looking at your sessions', change_session:'Fixing the session', add_session:'Adding the session', log_time:'Logging the time', start_mode:'Switching modes', alarm:'Working the alarm', press:'Pressing it', list_buttons:'Looking at the screen', set_setting:'Changing the setting'}); }catch(e){}
aiSystem = (function(base){
  return function(){
    const out = base.apply(this, arguments);
    const add = '\n\nYOU ARE THE APP. When he asks you to do something in Operator, do it with your tools. You can edit, add and delete any work session (list_sessions, change_session, add_session, delete_session), log shooting/training/break/off time after the fact (log_time), start modes, work the alarms, change settings, and press any button (list_buttons, press). Never tell him you can’t change something in the app: find the tool or the button. Never act unless he asked.';
    try{ if(Array.isArray(out)){ out.push({type:'text', text:add.trim()}); return out; } }catch(e){}
    return String(out || '')+add;
  };
})(aiSystem);

// =====================================================================================
// 14. OP'S MEMORY: less kept, less rewritten
// =====================================================================================
// his chat used to keep 600 lines of up to 4,000 characters inside the focus record, which is saved on almost every
// change. Now: 250 lines of up to 1,200 characters, trimmed once at startup and then as it grows.
function r72TrimOp(){
  const f = state.focus; let ch = false;
  if(Array.isArray(f.opChat)){
    if(f.opChat.length > 250){ f.opChat.splice(0, f.opChat.length - 250); ch = true; }
    f.opChat.forEach(function(e){ if(e && e.t && e.t.length > 1200){ e.t = e.t.slice(0, 1200)+'…'; ch = true; } });
  }
  if(Array.isArray(f.r58Feed) && f.r58Feed.length > 120){ f.r58Feed.splice(0, f.r58Feed.length - 120); ch = true; }
  if(Array.isArray(f.r58Feed)) f.r58Feed.forEach(function(e){ if(e && e.full && e.full.length > 2000){ e.full = e.full.slice(0, 2000)+'…'; ch = true; } });
  if(typeof AI!=='undefined' && Array.isArray(AI.history) && AI.history.length > 16) AI.history = AI.history.slice(-16);
  if(ch) persist('focus');
}
opChatLog = (function(base){ return function(r, t){ const x = base.apply(this, arguments); try{ const L = state.focus.opChat; if(L && L.length > 260) r72TrimOp(); const e = L && L[L.length - 1]; if(e && e.t && e.t.length > 1200) e.t = e.t.slice(0, 1200)+'…'; }catch(e){} return x; }; })(opChatLog);
setTimeout(function(){ try{ r72TrimOp(); }catch(e){} }, 0);

// =====================================================================================
// 15–16. AUTO LOCK-IN, REBUILT
// =====================================================================================
// What counts as working for the automatic lock-in: a work app, or a work site the app can actually see. A browser on
// its own never counts (it might be YouTube), whatever it was sorted as. Only time with hands on the Mac counts.
function r72IsBrowser(app){ return BROWSER_APPS.indexOf(activityKey(app)) >= 0; }
function r72AutoWork(app){ return !r72IsBrowser(app) && activityCategory(app)==='work'; }
function r72AutoOn(){ return r72P('autoLock', true)!==false; }
function r72AutoEndMin(){ return Math.max(3, Math.min(60, Number(r72P('autoEnd', 10)) || 10)); }
function r72AutoMaxHrs(){ return Math.max(1, Math.min(12, Number(r72P('autoMax', 4)) || 4)); }
function r72AutoHoursOnly(){ return r72P('autoHoursOnly', true)!==false; }
autoLockInBlockedReason = (function(base){
  return function(){
    const r = base.apply(this, arguments); if(r) return r;
    if(!r72AutoOn()) return 'off';
    const m = state.modes && state.modes.active;
    if(m && (m.sleep || /^(shooting|training|offtime|break)$/.test(m.type || '') || m.clockedOut)) return 'mode';
    if(state.focus.r70Out) return 'out';
    if(r72AutoHoursOnly()){ try{ const w = workToday(); if(w.enabled){ const ph = workPhase(); if(ph==='off' || ph==='before' || ph==='after') return 'hours'; } }catch(e){} }
    return null;
  };
})(autoLockInBlockedReason);
// the stretch only counts work apps / work sites; a browser doesn't start one and doesn't keep one going
autoWorkStretch = function(ivs){
  let i = ivs.length - 1;
  if(i < 0 || !r72AutoWork(ivs[i].app)) return null;
  let start = ivs[i].start, work = 0, away = 0;
  for(; i >= 0; i--){
    const iv = ivs[i], len = Math.max(0, iv.end - iv.start);
    if(i < ivs.length - 1 && start - iv.end > 5*60000) break;
    if(r72AutoWork(iv.app)){ work += len; away = 0; start = iv.start; }
    else { away += len; if(away > 5*60000) break; start = iv.start; }
  }
  return {start:start, workMs:work, lastRunMs:Infinity};
};
autoWorkMsFrom = (function(base){
  return function(ivs, from){
    let ms = 0; arr(ivs).forEach(function(iv){ if(iv.end <= from || !r72AutoWork(iv.app)) return; ms += iv.end - Math.max(iv.start, from); });
    return ms;
  };
})(typeof autoWorkMsFrom==='function' ? autoWorkMsFrom : function(){ return 0; });
checkAutoLockIn = (function(base){
  return function(){
    const ivs = state.appActivity.todayIntervals, last = ivs[ivs.length - 1];
    if(!state.focus.activeSession && last && !r72AutoWork(last.app)) return;   // (a browser or anything not work: never)
    return base.apply(this, arguments);
  };
})(checkAutoLockIn);
// an automatic session ends itself: 10 minutes after the work stops (keys, mouse, a work app), back-dated to when it stopped
function r72LastWork(s){
  const ivs = state.appActivity.todayIntervals; let t = 0;
  for(let i = ivs.length - 1; i >= 0; i--){ const iv = ivs[i]; if(iv.end < s.startedAt) break; if(s.autoStarted ? r72AutoWork(iv.app) : activityCategory(iv.app)!=='other' && activityCategory(iv.app)!=='neutral'){ t = iv.end; break; } }
  return Math.max(t, s.startedAt);
}
function r72SessionGuard(){
  try{
    const s = state.focus.activeSession; if(!s || s.onBreak) return;
    const now = Date.now();
    const tracking = typeof lastRawSampleAt!=='undefined' && lastRawSampleAt && now - lastRawSampleAt < 120000;
    if(s.autoStarted && tracking){
      const lw = r72LastWork(s);
      if(now - lw >= r72AutoEndMin()*60000){
        const mins = r70EndSessionAt(lw);
        try{ autoLockInMeta = {app:null, intervalStart:null}; }catch(e){}
        try{ renderView(); }catch(e){}
        showToast('Automatic session ended at '+fmtTimeShort(lw)+', when the work stopped ('+fmtDurationLabel(mins)+').', {icon:'&#9209;', duration:9000});
        return;
      }
    }
    // a session you started yourself: no keys or mouse at all for "away" minutes (30) ends it where you left
    if(!s.autoStarted && r72P('manualAway', true) && tracking){
      const away = (typeof r57IdleSec==='function' ? r57IdleSec() : 0)*1000, limit = Math.max(10, Number(r72P('manualAwayMin', 30)) || 30)*60000;
      if(away >= limit && !(typeof r57TalkingNow==='function' && r57TalkingNow())){
        const at = now - away, mins = r70EndSessionAt(at);
        try{ renderView(); }catch(e){}
        showToast('You were away from the Mac, so the session ended at '+fmtTimeShort(at)+' ('+fmtDurationLabel(mins)+').', {icon:'&#9209;', duration:12000});
        return;
      }
    }
    // an automatic one over 4 hours asks (Round 70's question, sooner)
    if(s.autoStarted && !s.r70Asked && !s.r70LongNext && now - s.startedAt >= r72AutoMaxHrs()*3600000){ s.r70Asked = now; persist('focus'); try{ r70LongTick(); }catch(e){} }
  }catch(e){}
}
setInterval(r72SessionGuard, 30000); setTimeout(r72SessionGuard, 6000);
// locking in lands on Tasks, never Analytics
startFocus = (function(base){ return function(){ const r = base.apply(this, arguments); ui.focusTab = 'tasks'; ui.focusTasksSubTab = ui.focusTasksSubTab || 'overview'; return r; }; })(startFocus);
// Settings → Focus & Lock in: the automatic lock-in's rules
function r72AutoSetHtml(){
  const sw = function(k, d){ return '<button class="r45-sw'+(r72P(k, d)!==false ? ' on' : '')+'" data-action="r72Toggle" data-id="'+k+'"><span></span></button>'; };
  const num = function(k, v, lo, hi, u){ return '<span class="r70-num"><input class="input" type="number" data-r72-num="'+k+'" value="'+v+'" min="'+lo+'" max="'+hi+'"><i>'+u+'</i></span>'; };
  return '<div class="card section op-settings" id="r72Auto"><div class="section-title">&#129302; Automatic lock-in</div>'+
    '<p class="r70t-p">It starts when you’ve been in work apps or on work sites for a while. A browser on its own never counts: it can be YouTube. Time with no keyboard or mouse never counts.</p>'+
    r51Row('Lock me in automatically', sw('autoLock', true))+
    r51Row('Only during my work hours', sw('autoHoursOnly', true))+
    r51Row('End an automatic session after no work for', num('autoEnd', r72AutoEndMin(), 3, 60, 'min'))+
    r51Row('Ask if I’m still there after (automatic)', num('autoMax', r72AutoMaxHrs(), 1, 12, 'hours'))+
    r51Row('End any session when I’m away from the Mac', sw('manualAway', true))+
    r51Row('…away for', num('manualAwayMin', Math.max(10, Number(r72P('manualAwayMin', 30)) || 30), 10, 240, 'min'))+
  '</div>';
}
ACTIONS.r72Toggle = function(el, e, id){ r72Set(id, !(r72P(id, true)!==false)); playTick(); renderView(); };
document.addEventListener('change', function(e){
  const el = e.target; if(!el || !el.getAttribute) return;
  const k = el.getAttribute('data-r72-num'); if(!k) return;
  const v = Number(el.value); if(!isFinite(v)) return;
  r72Set(k, Math.max(Number(el.min) || 0, Math.min(Number(el.max) || 999, Math.round(v)))); playTick();
});
renderSettings = (function(base){
  return function(){
    const h = base.apply(this, arguments);
    if(ui.settingsTab!=='focus' || h.indexOf('id="r72Auto"') >= 0) return h;
    // (Round 71's Command View card had landed beside the settings, in the shell's flex row, and squeezed the page
    // to a sliver. Both cards go inside the Focus & Lock in page, at the bottom, full width.)
    const tpl = document.createElement('template'); tpl.innerHTML = h;
    const part = tpl.content.querySelector('#setPart-focus') || tpl.content.querySelector('.settings-content');
    if(!part) return h.replace(/(<div class="card section op-settings" id="r71Set">)/, function(m){ return r72AutoSetHtml()+m; });
    const tmp = document.createElement('template'); tmp.innerHTML = r72AutoSetHtml();
    part.appendChild(tmp.content);
    const cv = tpl.content.querySelector('#r71Set'); if(cv) part.appendChild(cv);
    return tpl.innerHTML;
  };
})(renderSettings);

// =====================================================================================
// 17. YOUR TIME: focus, shooting, break, off, awake, asleep
// =====================================================================================
const R72_KINDS = [
  {id:'focus', label:'Focus', icon:'&#9201;&#65039;', c:'#7ef0c0'},
  {id:'shooting', label:'Shooting', icon:'&#127916;', c:'#ff9a6b'},
  {id:'break', label:'Break', icon:'&#9749;', c:'#ffd166'},
  {id:'offtime', label:'Off', icon:'&#127769;', c:'#8fd3ff'},
  {id:'awake', label:'Awake', icon:'&#9728;&#65039;', c:'#c3a6ff'},
  {id:'asleep', label:'Asleep', icon:'&#128164;', c:'#6b7a99'}
];
function r72ModeMins(date, type){
  let n = typeof modeMinutesFor==='function' ? modeMinutesFor(date, type) : 0;
  const m = state.modes.active;
  if(m && m.type===type && todayStr(new Date(m.startedAt))===date && !m.sleep) n += Math.max(0, Math.round((Date.now() - m.startedAt)/60000));
  return n;
}
function r72TimeFor(date){
  const t = todayStr(), isToday = date===t;
  const focus = (typeof deepWorkMinutesFor==='function' ? deepWorkMinutesFor(date) : 0) || 0;
  const shoot = r72ModeMins(date, 'shooting') + r72ModeMins(date, 'training')*0;
  let brk = r72ModeMins(date, 'break');
  // breaks inside sessions count as breaks too
  arr(state.focus.sessions).forEach(function(s){ if(s.date!==date) return; arr(s.breaks).forEach(function(b){ const a = b.start || b.startedAt, e = b.end || b.endedAt; if(a && e) brk += Math.max(0, Math.round((e - a)/60000)); }); });
  const as = state.focus.activeSession; if(isToday && as) arr(as.breaks).forEach(function(b){ const a = b.start || b.startedAt, e = b.end || b.endedAt || (as.onBreak ? Date.now() : 0); if(a && e) brk += Math.max(0, Math.round((e - a)/60000)); });
  const off = r72ModeMins(date, 'offtime');
  // asleep: the night that ended this morning; awake: from getting up to now (or to bed)
  let asleep = 0, up = null, bed = null;
  arr(state.focus.r70Sleeps).forEach(function(z){ if(z.date===date){ asleep = Math.max(asleep, z.minutes || 0); up = z.awake; } });
  if(!asleep && isToday){ try{ const ls = lastNightSleep(); if(ls){ asleep = ls.minutes || 0; up = ls.to || up; } }catch(e){} }
  arr(state.modes.history).forEach(function(h){ if(h.sleep && todayStr(new Date(h.endedAt))===date){ if(!asleep) asleep = h.minutes || 0; up = up || h.endedAt; } if(h.sleep && h.date===date && todayStr(new Date(h.endedAt))!==date) bed = h.startedAt; });
  if(!up){ try{ const g = state.focus.r70Gm; if(g && g.date===date && g.up) up = g.up; }catch(e){} }
  const endT = isToday ? (state.modes.active && state.modes.active.sleep ? state.modes.active.startedAt : Date.now()) : (bed || null);
  const awake = up && endT ? Math.max(0, Math.round((endT - up)/60000)) : 0;
  return {focus:focus, shooting:shoot, break:brk, offtime:off, awake:awake, asleep:asleep};
}
function r72TimeWeek(){
  const out = {focus:0, shooting:0, break:0, offtime:0, awake:0, asleep:0}, d = new Date();
  const dow = (d.getDay() + 6) % 7; // Monday first
  for(let i = 0; i <= dow; i++){ const x = new Date(); x.setDate(x.getDate() - i); const t = r72TimeFor(todayStr(x)); Object.keys(out).forEach(function(k){ out[k] += t[k] || 0; }); }
  return out;
}
function r72TimeHtml(compact){
  const T = r72TimeFor(todayStr()), W = r72TimeWeek();
  const m = state.modes.active, as = state.focus.activeSession;
  const now = as ? (as.onBreak ? 'break' : 'focus') : m ? (m.sleep ? 'asleep' : m.type) : 'awake';
  const h = function(n){ return n ? fmtDurationLabel(n) : '0m'; };
  const tot = Math.max(1, T.focus + T.shooting + T.break + T.offtime);
  return '<div class="r72-time'+(compact ? ' is-compact' : '')+'">'+
    '<div class="r72t-bar">'+['focus', 'shooting', 'break', 'offtime'].map(function(k){ const K = R72_KINDS.find(function(x){ return x.id===k; }); return T[k] ? '<i style="flex:'+T[k]+';background:'+K.c+'" title="'+K.label+' '+h(T[k])+'"></i>' : ''; }).join('')+(T.focus + T.shooting + T.break + T.offtime ? '' : '<i class="is-none"></i>')+'</div>'+
    '<div class="r72t-g">'+R72_KINDS.map(function(K){
      return '<div class="r72t-k'+(now===K.id ? ' is-now' : '')+'" style="--kc:'+K.c+'"><span>'+K.icon+' '+K.label+'</span><b>'+h(T[K.id])+'</b><small>'+h(W[K.id])+' this week</small></div>';
    }).join('')+'</div>'+
    '<div class="r72t-f">'+
      (m && m.type==='shooting' ? '<button class="btn btn-sm" data-action="endMode">&#9632; End shooting</button>' : '<button class="btn btn-sm" data-action="r72Shoot">&#127916; Start shooting</button>')+
      '<button class="btn btn-sm btn-ghost" data-action="r72LogOpen">+ Log time</button>'+
    '</div>'+
  '</div>';
}
ACTIONS.r72Shoot = function(){ startMode('shooting', {note:'Shooting'}); playTick(); renderView(); showToast('Shooting. It’s on the clock as shooting time.', {icon:'&#127916;'}); };
if(typeof PANEL_DEFS!=='undefined' && Array.isArray(PANEL_DEFS) && !PANEL_DEFS.some(function(p){ return p.id==='r72time'; })) PANEL_DEFS.push({id:'r72time', label:'Your time: focus, shooting, breaks, off, awake, asleep'});
if(typeof PANEL_RENDERERS!=='undefined') PANEL_RENDERERS.r72time = function(){ return '<div><div class="section-title">Your time</div>'+r72TimeHtml()+'</div>'; };
// once: the new panel goes on Today
setTimeout(function(){
  try{
    const dp = state.dashboardPanels; if(!dp || dp.r72Time) return;
    const ord = Array.isArray(dp.order) ? dp.order : null;
    if(ord && ord.indexOf('r72time') < 0) ord.splice(Math.min(2, ord.length), 0, 'r72time');
    if(dp.enabled && typeof dp.enabled==='object') dp.enabled.r72time = true;
    if(dp.r60Span && typeof dp.r60Span==='object') dp.r60Span.r72time = 6;
    dp.r72Time = true; persist('dashboardPanels');
  }catch(e){}
}, 0);
// logging time after the fact: "we shot from 7 to 1"
function r72LogTime(kind, st, en, note){
  if(!/^(shooting|training|break|offtime)$/.test(kind || '')) throw new Error('kind is shooting, training, break or offtime');
  if(!st || !en || en <= st) throw new Error('start and end as YYYY-MM-DD HH:MM, end after start');
  if(en > Date.now() + 60000) throw new Error('that ends in the future');
  const minutes = Math.max(1, Math.round((en - st)/60000));
  state.modes.history.push({id:uid(), type:kind, date:todayStr(new Date(st)), startedAt:st, endedAt:en, minutes:minutes, note:String(note || ''), logged:true});
  // a shoot logged over a stretch that was counted as a lock-in: the overlapping session time comes off
  if(kind==='shooting' || kind==='training'){
    state.focus.sessions.forEach(function(s){
      if(s.endedAt <= st || s.startedAt >= en) return;
      if(s.startedAt >= st && s.endedAt <= en){ s.r72Drop = true; return; }
      if(s.startedAt < st) s.endedAt = Math.min(s.endedAt, st); else s.startedAt = Math.max(s.startedAt, en);
      r72SessFix(s);
    });
    state.focus.sessions = state.focus.sessions.filter(function(s){ return !s.r72Drop; });
    persist('focus');
  }
  persist('modes'); try{ renderView(); }catch(e){}
  return 'logged '+fmtDurationLabel(minutes)+' of '+(kind==='offtime' ? 'time off' : kind);
}
ACTIONS.r72LogOpen = function(){ ui.r72Log = {kind:'shooting', date:todayStr(), from:'07:00', to:nowHM()}; r72LogSheet(); };
function r72LogSheet(){
  let el = document.getElementById('r72LogSheet');
  if(!ui.r72Log){ if(el) el.remove(); return; }
  if(!el){ el = document.createElement('div'); el.id = 'r72LogSheet'; el.className = 'r72-sheet'; document.body.appendChild(el); }
  const L = ui.r72Log;
  el.innerHTML = '<div class="r72s-card"><div class="r72s-h"><b>Log time</b><button data-action="r72LogX">&#10005;</button></div>'+
    '<div class="seg-tabs r72s-k">'+[['shooting', '&#127916; Shooting'], ['training', '&#128170; Training'], ['break', '&#9749; Break'], ['offtime', '&#127769; Off']].map(function(o){ return '<button class="seg-tab'+(L.kind===o[0] ? ' active' : '')+'" data-action="r72LogKind" data-id="'+o[0]+'">'+o[1]+'</button>'; }).join('')+'</div>'+
    '<div class="r72s-row"><label>Day<input class="input" type="date" id="r72LogDate" value="'+L.date+'" max="'+todayStr()+'"></label><label>From<input class="input" type="time" id="r72LogFrom" value="'+L.from+'"></label><label>To<input class="input" type="time" id="r72LogTo" value="'+L.to+'"></label></div>'+
    '<input class="input" id="r72LogNote" placeholder="What was it? (optional)" value="'+escapeHtml(L.note || '')+'">'+
    '<div class="r72s-f"><button class="btn btn-primary" data-action="r72LogSave">Save</button></div></div>';
}
ACTIONS.r72LogX = function(){ ui.r72Log = null; r72LogSheet(); };
ACTIONS.r72LogKind = function(el, e, id){ const L = ui.r72Log; if(!L) return; ['Date', 'From', 'To', 'Note'].forEach(function(k){ const i = document.getElementById('r72Log'+k); if(i) L[k==='Date' ? 'date' : k==='From' ? 'from' : k==='To' ? 'to' : 'note'] = i.value; }); L.kind = id; r72LogSheet(); };
ACTIONS.r72LogSave = function(){
  const g = function(id){ const i = document.getElementById(id); return i ? i.value : ''; };
  const d = g('r72LogDate') || todayStr(), a = g('r72LogFrom'), b = g('r72LogTo');
  let st = localTs(d, a), en = localTs(d, b);
  if(st && en && en <= st) en += 86400000;   // past midnight
  try{ const said = r72LogTime(ui.r72Log.kind, st, en, g('r72LogNote')); ui.r72Log = null; r72LogSheet(); showToast(said.charAt(0).toUpperCase()+said.slice(1)+'.', {icon:'&#9989;'}); }
  catch(e){ showToast(e.message || String(e), {icon:'&#9888;'}); }
};

// =====================================================================================
// 19. MUSIC: automatic music fades away (or doesn't play), and lots of control over it
// =====================================================================================
const R72_MOMENTS = [['lock', 'When I lock in'], ['work', 'Work music (work alarm, Clock in)'], ['morning', 'Good morning'], ['dream', 'Inspiration']];
function r72Music(){ return r72P('autoMusic', 'fade'); }           // on / fade / off
function r72MusicFadeMin(){ return Math.max(1, Math.min(60, Number(r72P('musicFadeMin', 6)) || 6)); }
function r72MomentOn(k){ const o = r72P('musicMoments', null) || {}; return o[k]!==false; }
R72.musicAuto = null;   // the moment the playing music was started for (null = you pressed play)
R72.fadeT = null;
function r72FadeOut(sec){
  sec = sec || 25;
  clearTimeout(R72.fadeT); R72.fadeT = null;
  try{
    if(FM.playing && FM.bus){
      const c = getAudioCtx(), g = FM.bus.g.gain;
      g.cancelScheduledValues(c.currentTime); g.setValueAtTime(Math.max(0.0001, g.value), c.currentTime); g.exponentialRampToValueAtTime(0.0001, c.currentTime + sec);
      setTimeout(function(){ if(R72.musicAuto){ R72.musicAuto = null; focusMusicStop(); try{ dockRefresh(); }catch(e){} } }, sec*1000 + 200);
    }
  }catch(e){}
  // the Music app (your lock-in song): step it down, then stop
  try{
    if(typeof lockSongPlaying!=='undefined' && lockSongPlaying){
      let l = 80; const step = setInterval(function(){ l -= 10; helperFetch(WAKE_HELPER+'music/duck?on=1&l='+Math.max(0, l), 2000); if(l <= 0){ clearInterval(step); musicApp('pause'); lockSongPlaying = false; helperFetch(WAKE_HELPER+'music/duck?on=0', 2000); } }, sec*100);
    }
  }catch(e){}
}
function r72ArmFade(){
  clearTimeout(R72.fadeT); R72.fadeT = null;
  if(r72Music()!=='fade' || !R72.musicAuto) return;
  R72.fadeT = setTimeout(function(){ if(R72.musicAuto) r72FadeOut(25); }, r72MusicFadeMin()*60000);
}
// every automatic start goes through here: it can be off, and it arms the fade
function r72AutoMusic(moment, run){
  return function(){
    if(r72Music()==='off' || !r72MomentOn(moment)) return;
    // the next start of the app's music (now, or after the lock-in intro) is this moment's
    R72.autoNext = {moment:moment, until:Date.now() + 20000};
    const r = run.apply(this, arguments);
    // already playing (it was just turned down, or it's your Music app song): it fades from now
    setTimeout(function(){ if(R72.autoNext && (FM.playing || (typeof lockSongPlaying!=='undefined' && lockSongPlaying)) && !R72.musicAuto){ R72.musicAuto = moment; r72ArmFade(); } }, 1500);
    return r;
  };
}
focusMusicPlay = (function(base){
  return function(){
    const a = R72.autoNext;
    if(a && Date.now() < a.until){ R72.autoNext = null; R72.musicAuto = a.moment; const r = base.apply(this, arguments); r72ArmFade(); return r; }
    return base.apply(this, arguments);
  };
})(focusMusicPlay);
lockMusicOn = r72AutoMusic('lock', lockMusicOn);
focusMusicAfterIntro = r72AutoMusic('lock', focusMusicAfterIntro);
playLockInSong = (function(base){ return function(){ const k = typeof lockStartSound==='function' ? lockStartSound() : ''; if(k==='chime' || k==='none') return base.apply(this, arguments); return r72AutoMusic('lock', base).apply(this, arguments); }; })(playLockInSong);
workMusicPlay = r72AutoMusic('work', workMusicPlay);
gmHandoff = r72AutoMusic('morning', gmHandoff);
inspPlayDream = r72AutoMusic('dream', inspPlayDream);
// you pressing play: yours, no fade
['mctlToggle', 'fmToggle', 'fmNext', 'mctlNext'].forEach(function(k){
  const base = ACTIONS[k]; if(typeof base!=='function') return;
  ACTIONS[k] = function(){ R72.musicAuto = null; R72.autoNext = null; clearTimeout(R72.fadeT); R72.fadeT = null; return base.apply(this, arguments); };
});
// a break, a lock-out: the music stops (settings)
r70StopMusic = (function(base){ return function(){ R72.musicAuto = null; clearTimeout(R72.fadeT); R72.fadeT = null; return base.apply(this, arguments); }; })(r70StopMusic);
afterRenderHooks.push(function(){
  const as = state.focus.activeSession, onB = !!(as && as.onBreak);
  if(R72._wasLocked && !as && r72P('musicStopOnOut', true)){ try{ if(FM.playing) r72FadeOut(3); }catch(e){} }
  if(!R72._wasBreak && onB && r72P('musicStopOnBreak', true)){ try{ if(FM.playing) r72FadeOut(3); }catch(e){} }
  R72._wasLocked = !!as; R72._wasBreak = onB;
});
// the volume of the app's own music
function r72MusicVolume(v){ state.profile.musicVolume = Math.max(0, Math.min(1, v)); persist('profile'); try{ if(FM.playing && FM.bus){ const c = getAudioCtx(); FM.bus.g.gain.setTargetAtTime(Math.max(0.0002, fmVolume()), c.currentTime, 0.2); } }catch(e){} }
function r72MusicSetHtml(){
  const mode = r72Music(), moments = r72P('musicMoments', null) || {};
  const seg = '<div class="seg-tabs r72m-seg">'+[['on', 'Plays'], ['fade', 'Fades away'], ['off', 'Off']].map(function(o){ return '<button class="seg-tab'+(mode===o[0] ? ' active' : '')+'" data-action="r72MusicMode" data-id="'+o[0]+'">'+o[1]+'</button>'; }).join('')+'</div>';
  const sw = function(k, d){ return '<button class="r45-sw'+(r72P(k, d)!==false ? ' on' : '')+'" data-action="r72Toggle" data-id="'+k+'"><span></span></button>'; };
  const msw = function(k){ return '<button class="r45-sw'+(moments[k]!==false ? ' on' : '')+'" data-action="r72Moment" data-id="'+k+'"><span></span></button>'; };
  const vol = Math.round(fmVolume()*100);
  return '<div class="card section op-settings" id="r72Music"><div class="section-title">&#127925; Music</div>'+
    '<p class="r70t-p">The music the app starts by itself. Anything you press play on is yours: it never fades.</p>'+
    r51Row('Automatic music', seg)+
    (mode==='fade' ? r51Row('Fade it away after', '<span class="r70-num"><input class="input" type="number" data-r72-num="musicFadeMin" value="'+r72MusicFadeMin()+'" min="1" max="60"><i>min</i></span>') : '')+
    (mode!=='off' ? '<div class="r72m-moments"><div class="r72m-k">Play it…</div>'+R72_MOMENTS.map(function(m){ return r51Row(m[1], msw(m[0])); }).join('')+'</div>' : '')+
    r51Row('Volume', '<span class="r72m-vol"><input type="range" min="0" max="100" step="5" value="'+vol+'" id="r72Vol"><b id="r72VolV">'+vol+'%</b></span>')+
    '<div class="r72m-k">Stop the music when…</div>'+
    r51Row('I lock out', sw('musicStopOnOut', true))+
    r51Row('I take a break', sw('musicStopOnBreak', true))+
    r51Row('I snooze the alarm', sw('snoozeStopsMusic', true))+
    r51Row('I say I’m awake (off: your wake-up song keeps playing)', sw('awakeStopsMusic', false))+
  '</div>';
}
ACTIONS.r72MusicMode = function(el, e, id){ r72Set('autoMusic', id); if(id==='off' && R72.musicAuto){ r72FadeOut(3); } playTick(); renderView(); };
ACTIONS.r72Moment = function(el, e, id){ const o = Object.assign({}, r72P('musicMoments', null) || {}); o[id] = o[id]===false; r72Set('musicMoments', o); playTick(); renderView(); };
document.addEventListener('input', function(e){ if(e.target && e.target.id==='r72Vol'){ const v = Number(e.target.value)/100; r72MusicVolume(v); const b = document.getElementById('r72VolV'); if(b) b.textContent = Math.round(v*100)+'%'; } });
// it lives at the top of Settings → Sound (and awakeStopsMusic is off by default, unlike the others)
ACTIONS.r72Toggle = (function(base){ return function(el, e, id){ if(id==='awakeStopsMusic'){ r72Set(id, !r72P(id, false)); playTick(); renderView(); return; } return base.apply(this, arguments); }; })(ACTIONS.r72Toggle);
soundSettingsHtml = (function(base){ return function(){ const h = base.apply(this, arguments); let x = ''; try{ x = r72MusicSetHtml(); }catch(e){} return h.replace('<div class="snd">', '<div class="snd">'+x); }; })(soundSettingsHtml);

// =====================================================================================
// 16. CLEAN UP THE LONG ONES (View all sessions)
// =====================================================================================
function r72LongSessions(){ const lim = 6*60; return state.focus.sessions.filter(function(s){ return (s.minutes || 0) >= lim; }).sort(function(a, b){ return (b.startedAt || 0) - (a.startedAt || 0); }); }
function r72LongHtml(){
  const L = r72LongSessions(); if(!L.length) return '';
  const show = ui.r72Long;
  return '<div class="card section r72-long'+(show ? ' is-open' : '')+'"><div class="r72l-h" data-action="r72LongOpen"><b>&#9888;&#65039; '+L.length+' session'+(L.length===1 ? '' : 's')+' over 6 hours</b><span>Most of these are the old automatic lock-in. Trim them or delete them.</span><i>'+(show ? '&#9650;' : '&#9660;')+'</i></div>'+
    (show ? '<div class="r72l-list">'+L.map(function(s){
      return '<div class="r72l-r"><span>'+fmtDateShort(s.date)+'</span><b>'+fmtTimeShort(s.startedAt)+' – '+fmtTimeShort(s.endedAt)+'</b><em>'+fmtDurationLabel(s.minutes)+(s.auto ? ' · auto' : '')+'</em>'+
        '<button class="btn btn-sm" data-action="r72LongCut" data-id="'+s.id+'">Cut to 3h</button><button class="btn btn-sm btn-ghost" data-action="r72LongDel" data-id="'+s.id+'">Delete</button></div>';
    }).join('')+'<div class="r72l-f"><button class="btn btn-sm btn-ghost" data-action="r72LongDelAll">Delete all '+L.length+'</button></div></div>' : '')+
  '</div>';
}
ACTIONS.r72LongOpen = function(){ ui.r72Long = !ui.r72Long; playTick(); renderView(); };
ACTIONS.r72LongCut = function(el, e, id){ const s = state.focus.sessions.find(function(x){ return x.id===id; }); if(!s) return; s.endedAt = s.startedAt + 180*60000; r72SessFix(s); persist('focus'); playTick(); renderView(); showToast('Cut to 3 hours.', {icon:'&#9986;&#65039;'}); };
ACTIONS.r72LongDel = function(el, e, id){ const i = state.focus.sessions.findIndex(function(x){ return x.id===id; }); if(i < 0) return; const s = state.focus.sessions.splice(i, 1)[0]; persist('focus'); renderView(); showToast('Deleted.', {icon:'&#128465;', actionLabel:'Undo', actionAction:'r72LongUndo', duration:8000}); R72.undo = [s]; };
ACTIONS.r72LongDelAll = function(){
  const L = r72LongSessions(); if(!L.length) return;
  uiConfirm({title:'Delete '+L.length+' sessions?', text:'Every session over 6 hours goes. You can undo it right after.', okLabel:'Delete them'}).then(function(yes){
    if(!yes) return; const ids = L.map(function(s){ return s.id; });
    R72.undo = state.focus.sessions.filter(function(s){ return ids.indexOf(s.id) >= 0; });
    state.focus.sessions = state.focus.sessions.filter(function(s){ return ids.indexOf(s.id) < 0; });
    persist('focus'); renderView(); showToast(L.length+' deleted.', {icon:'&#128465;', actionLabel:'Undo', actionAction:'r72LongUndo', duration:10000});
  });
};
ACTIONS.r72LongUndo = function(){ if(!R72.undo) return; state.focus.sessions = state.focus.sessions.concat(R72.undo).sort(function(a, b){ return a.startedAt - b.startedAt; }); R72.undo = null; persist('focus'); renderView(); };
renderSessionsPage = (function(base){
  return function(){
    const h = base.apply(this, arguments); let x = ''; try{ x = r72LongHtml(); }catch(e){}
    if(!x) return h;
    // under the page's header
    const i = h.indexOf('</div>', h.indexOf('view-header')); 
    return i > 0 ? h.slice(0, i + 6)+x+h.slice(i + 6) : x+h;
  };
})(renderSessionsPage);

// =====================================================================================
// 25–26. THE PHONE: a real dashboard, and Op's voice
// =====================================================================================
// one call for everything the phone shows: operatorPage.phoneCall(name, args). Read-mostly; the writes are the
// everyday ones (tick a task, add one, log a touch, write a journal line, an alarm on/off, shooting).
function r72PhoneDash(){
  const t = todayStr(), D = r72DayShape(), T = r72TimeFor(t);
  const target = Number(state.standards && state.standards.deepWorkTargetMinutes) || 180;
  const mrr = arr(state.business.clients).filter(function(c){ return c.status!=='lost' && c.status!=='churned'; }).reduce(function(a, c){ return a + (Number(c.mrr) || 0); }, 0);
  let streak = 0; try{ streak = computeStreak(); }catch(e){}
  return {deep:T.focus, target:target, shoot:T.shooting, brk:T.break, off:T.offtime, awake:T.awake, asleep:T.asleep, streak:streak, mrr:mrr,
    next:D.first ? {title:D.first.title, time:D.first.time ? fmt12Hour(D.first.time) : 'All day'} : null, readout:r72DayReadout(),
    shooting:!!(state.modes.active && state.modes.active.type==='shooting')};
}
function r72PhoneTasks(){
  const pick = function(x){ return {id:x.id, title:taskName(x), done:x.status==='done', due:x.deadline || '', client:(function(){ try{ return r42ClientOf(x) || ''; }catch(e){ return ''; } })()}; };
  const today = arr(state.tasks.items).filter(function(x){ return x.status==='today' || (x.status==='done' && x.completedAt===todayStr()); });
  const back = arr(state.tasks.items).filter(function(x){ return x.status==='backlog'; }).sort(function(a, b){ return String(a.deadline || '9999').localeCompare(String(b.deadline || '9999')); }).slice(0, 25);
  return {today:today.map(pick), backlog:back.map(pick)};
}
function r72PhoneCal(){
  const out = [];
  for(let i = 0; i < 14; i++){
    const d = new Date(); d.setDate(d.getDate() + i); const ds = todayStr(d);
    let info; try{ info = calDayInfo(ds); }catch(e){ info = {events:[], deadlines:[]}; }
    const items = arr(info.events).slice().sort(function(a, b){ return (a.time || '').localeCompare(b.time || ''); }).map(function(e){ return {time:e.time ? fmt12Hour(e.time) : 'All day', title:e.title, kind:'event'}; })
      .concat(arr(info.deadlines).map(function(x){ return {time:'Due', title:x.title, kind:'due'}; }));
    if(items.length || i===0) out.push({date:ds, label:i===0 ? 'Today' : i===1 ? 'Tomorrow' : d.toLocaleDateString(undefined, {weekday:'short', month:'short', day:'numeric'}), items:items});
  }
  return out;
}
function r72PhoneClients(){
  return arr(state.business.clients).filter(function(c){ return c.status!=='lost' && c.status!=='churned' && c.status!=='archived'; }).map(function(c){
    let hs = ''; try{ hs = clientHealthLabel(clientHealthStatus(c)); }catch(e){}
    let due = ''; try{ due = crmNextDue('client', c); }catch(e){}
    return {id:c.id, name:c.business || c.name, mrr:Number(c.mrr) || 0, health:hs, due:due, late:!!(due && due < todayStr())};
  });
}
function r72PhoneJournal(){
  return arr(state.journal.entries).slice().sort(function(a, b){ return String(b.createdAt || b.date).localeCompare(String(a.createdAt || a.date)); }).slice(0, 15)
    .map(function(e){ return {id:e.id, date:e.date, title:e.title || '', text:String(e.text || '').slice(0, 400)}; });
}
function r72PhoneAlarms(){
  const w = wakeCfg(), k = workCfg();
  return {wake:{on:!!w.enabled, time:w.time || '07:00', label:fmt12Hour(w.time || '07:00'), days:typeof wakeDaysLabel==='function' ? wakeDaysLabel(w.days || []) : ''},
    work:{on:!!k.enabled, time:k.start, label:fmt12Hour(k.start)+' – '+fmt12Hour(k.end), days:typeof wakeDaysLabel==='function' ? wakeDaysLabel(k.days || []) : ''},
    ringing:r72WakeRinging() || r72WorkRinging(), snoozed:!!r72Snoozed()};
}
function r72PhoneCall(name, a){
  a = a || {};
  try{
    switch(String(name)){
      case 'dash': return r72PhoneDash();
      case 'tasks': return r72PhoneTasks();
      case 'taskAdd': { const t = String(a.title || '').trim(); if(!t) return {ok:false}; opRunTool('add_task', {title:t.slice(0, 200)}); return r72PhoneTasks(); }
      case 'taskDone': { const x = state.tasks.items.find(function(t){ return t.id===a.id; }); if(x){ if(x.status==='done'){ try{ undoTask(x.id); }catch(e){} } else completeTask(x.id); try{ renderView(); }catch(e){} } return r72PhoneTasks(); }
      case 'cal': return r72PhoneCal();
      case 'clients': return r72PhoneClients();
      case 'touch': { logTouch('client', String(a.id || ''), a.type || null); try{ renderView(); }catch(e){} return r72PhoneClients(); }
      case 'journal': return r72PhoneJournal();
      case 'journalAdd': { const t = String(a.text || '').trim(); if(!t) return {ok:false}; state.journal.entries.push({id:uid(), title:String(a.title || '').slice(0, 120), text:t.slice(0, 20000), date:todayStr(), createdAt:new Date().toISOString(), tag:null}); persist('journal'); try{ renderView(); }catch(e){} return r72PhoneJournal(); }
      case 'alarms': return r72PhoneAlarms();
      case 'alarm': {
        const cfg = a.which==='work' ? workCfg() : wakeCfg();
        if(typeof a.on==='boolean') cfg.enabled = a.on;
        if(a.time && /^\d{1,2}:\d{2}$/.test(a.time)){ if(a.which==='work') cfg.start = String(a.time).padStart(5, '0'); else cfg.time = String(a.time).padStart(5, '0'); }
        persist('focus'); try{ renderView(); }catch(e){} return r72PhoneAlarms();
      }
      case 'alarmAct': { const r = a.act==='off' ? r72AlarmOff() : a.act==='up' ? (r70QuietUp(), 'Up.') : r70TRunStep({act:'snooze'}, null); return {say:r, alarms:r72PhoneAlarms()}; }
      case 'readout': return r72DayReadout();
      case 'shoot': { if(a.on) startMode('shooting', {note:'Shooting'}); else if(state.modes.active && state.modes.active.type==='shooting') endMode(); try{ renderView(); }catch(e){} return r72PhoneDash(); }
    }
  }catch(e){ return {ok:false, error:String(e && e.message || e)}; }
  return {ok:false, error:'unknown'};
}
(function(){
  if(!window.operatorPage) return;
  const P = window.operatorPage;
  try{
    window.operatorPage = Object.freeze(Object.assign({}, P, {
      phoneCall:function(name, args){ return r72PhoneCall(name, args); },
      // Op's voice on the phone even when the Mac's voice is on the system voice: the helper still makes the audio
      phoneSpeakUrl:function(text){
        try{
          const t = String(text || '').trim(); if(!t) return '';
          const u = P.phoneSpeakUrl ? P.phoneSpeakUrl(t) : '';
          if(u) return u;
          return typeof opTtsUrl==='function' ? opTtsUrl(typeof speakable==='function' ? speakable(t.slice(0, 2000)) : t.slice(0, 2000)) : '';
        }catch(e){ return ''; }
      }
    }));
  }catch(e){}
})();
