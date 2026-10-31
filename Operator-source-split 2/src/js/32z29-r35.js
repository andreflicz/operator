// ============ ROUND 35: SMOOTH DAY LOOP, SLEEP FROM "THAT'S THE DAY", AUTO LOCK-IN / LOCK-OUT ============

// ---- full-screen changes go through a dark veil ----
// Clocking out, Done, going to sleep, Good morning, clocking back in: the full-screen views used to fade
// through transparency, so for a beat you saw the regular app behind them. Now the screen dips to the
// night color, the change happens behind it, and the new view comes up out of it.
// (the change itself happens right away, so nothing that calls these waits on it)
let fsVeilEl = null;
function fsVeil(then, hold){
  let v = fsVeilEl;
  if(!v){ v = fsVeilEl = document.createElement('div'); v.className = 'fs-veil is-on'; document.body.appendChild(v); }
  try{ then(); }finally{
    clearTimeout(v._t);
    requestAnimationFrame(function(){ requestAnimationFrame(function(){
      v._t = setTimeout(function(){ v.classList.add('is-out'); if(fsVeilEl===v) fsVeilEl = null; setTimeout(function(){ v.remove(); }, 420); }, hold || 110);
    }); });
  }
}
// leaving a full-screen view: through the veil too (it used to fade the view out over the app)
npLeave = function(then){ fsVeil(then); };
['clockIn', 'windDone', 'startSleepMode', 'sleepUp', 'sleepGoodMorning', 'toggleLockedView', 'toggleFocusMinimal'].forEach(function(k){
  const base = ACTIONS[k]; if(typeof base!=='function') return;
  // (the ones that open a full-screen overlay hold the dark a little longer, while it comes in)
  const hold = {clockIn:340, sleepGoodMorning:460, sleepUp:200}[k];
  ACTIONS[k] = function(){ const a = arguments, self = this; fsVeil(function(){ base.apply(self, a); }, hold); };
});
// Clock out: straight into the wind-down behind the veil (no flash of the clocked-out page first)
ACTIONS.clockOut = (function(base){
  return function(){
    if(state.focus.activeSession){ showToast('Lock out of your session first.', {icon:'&#128274;'}); return; }
    const a = arguments, self = this;
    fsVeil(function(){
      base.apply(self, a);
      if(typeof openWindDown==='function' && state.modes.active && state.modes.active.clockedOut && !overlayOpen('windOverlay')) openWindDown('recap');
    }, 280);
  };
})(ACTIONS.clockOut);

// ---- the end of the wind-down: just Done. Sleep lives on That's the day ----
windHtml = (function(base){
  return function(){
    return base.apply(this, arguments).replace(/<button class="wd-alt" data-action="windGoToSleep"[^>]*>[\s\S]*?<\/button>/, '');
  };
})(windHtml);
// That's the day: the Tomorrow button becomes the way to bed. "Tmrw 10 AM" → the sleep screen.
function sleepBtnLabel(){
  const target = typeof wakeTargetDate==='function' ? wakeTargetDate() : addDays(todayStr(), 1), wake = typeof wakeTimeFor==='function' ? wakeTimeFor(target) : null;
  if(!wake) return '&#127769; Go to sleep';
  return '&#127769; '+(target===addDays(todayStr(), 1) ? 'Tmrw' : target===todayStr() ? 'Today' : weekdayShort(target))+' '+fmt12Hour(wake);
}
renderWeekendOffView = (function(base){
  return function(){
    return base.apply(this, arguments).replace(/<button class="dayoff-back" data-action="openWindDown" data-step="alarm"[^>]*>[\s\S]*?<\/button>/,
      '<button class="dayoff-back is-sleep" data-action="startSleepMode" title="Going to sleep: the screen goes dark until the alarm">'+sleepBtnLabel()+'</button>');
  };
})(renderWeekendOffView);

// ---- auto lock-in: only work apps start it, and work minutes add up ----
// Time in Operator, Finder, a browser it can't see into (Firefox) or anything not marked work never
// starts a session and never counts toward one. Work minutes do add up across quick switches (a
// minute here, three there); a long stretch away from work apps starts the count over.
autoWorkStretch = function(ivs){
  let i = ivs.length - 1;
  if(i < 0 || activityCategory(ivs[i].app)!=='work') return null;
  let start = ivs[i].start, work = 0, away = 0;
  for(; i >= 0; i--){
    const iv = ivs[i], c = activityCategory(iv.app), len = Math.max(0, iv.end - iv.start);
    if(i < ivs.length - 1 && start - iv.end > 5*60000) break;           // a gap (idle or asleep)
    if(c==='work'){ work += len; away = 0; start = iv.start; }
    else { away += len; if(away > 5*60000) break; start = iv.start; }   // off work apps for 5+ minutes
  }
  return {start:start, workMs:work, lastRunMs:Infinity};
};
checkAutoLockIn = (function(){
  const endPart = checkAutoLockIn;   // (round 34's: starts are below; its own handling of a running session stays)
  return function(){
    const st = state.settings.appTracking;
    if(!st || st.enabled===false || st.autoLockIn===false) return;
    if(state.focus.activeSession) return endPart.apply(this, arguments);
    const ivs = state.appActivity.todayIntervals; if(!ivs.length) return;
    const last = ivs[ivs.length-1];
    if(Date.now() - last.end > APP_ACTIVITY_GAP_MS) return;
    if(activityCategory(last.app)!=='work') return;
    if(autoLockInBlockedReason()) return;
    const s = autoWorkStretch(ivs); if(!s) return;
    const from = Math.max(s.start, autoLockInCountFrom({start:s.start}));
    const workMin = autoWorkMsFrom(ivs, from)/60000;
    if(workMin < autoThresholdMin()) return;
    if(autoLockInMeta.intervalStart===from) return;
    // the session starts at your first work minute, not at a neutral app before it
    let first = from; for(let k = 0; k < ivs.length; k++){ if(ivs[k].end > from && activityCategory(ivs[k].app)==='work'){ first = Math.max(from, ivs[k].start); break; } }
    autoLockInMeta = {app:last.app, intervalStart:from};
    const staged = ui.stagedTaskId; ui.stagedTaskId = null; ui.currentTaskId = null; ui.currentTaskStartedAt = null;
    startFocus(null);
    ui.stagedTaskId = staged;
    const a = state.focus.activeSession;
    if(a){ a.autoStarted = true; a.startedAt = first; a.autoApp = last.app; a.noTask = true; }
    persist('focus'); renderView();
    showToast('Locked in automatically: on '+last.app+' since '+fmt12Hour(nowHM(new Date(first)))+'.', {icon:'&#128274;', actionLabel:'Not working', actionAction:'autoLockReject', duration:12000});
  };
})();

// ---- auto lock-out: a session ends where the work stopped ----
// Any deep-work session, yours or automatic: once there's been no work activity for a while (3
// minutes for an automatic one, your "away" time, 10 by default, for one you started), it stops at
// the last moment you were working. Sitting in Operator or Finder doesn't keep it going, and neither
// does a Mac left on. The real part is kept, the rest never counted, and
// "Add it back" is there if you were working away from the keys.
// (a session you started yourself also counts apps you haven't sorted, like a browser it can't see
// into: you might well be working there. Operator, Finder and not-work apps don't count for either.)
function lastWorkActivityEnd(ivs, since, loose){
  for(let i = ivs.length - 1; i >= 0; i--){ const iv = ivs[i]; if(iv.end < since) break; const c = activityCategory(iv.app); if(c==='work' || (loose && c==='unsorted')) return iv.end; }
  return null;
}
checkAwayFromSession = (function(base){
  return function(){
    base.apply(this, arguments);
    const s = state.focus.activeSession, st = state.settings.appTracking;
    if(!s || s.onBreak || !st || st.enabled===false || st.awayStop!==true) return;
    if(sessionType(s)!=='deep') return;
    if(state.modes.active && state.modes.active.type && state.modes.active.type!=='offtime' && !state.modes.active.linkedFocus) return;
    if(!lastRawSampleAt || Date.now() - lastRawSampleAt > 90000) return;   // the tracker has to be running
    if(todayStr(new Date(s.startedAt))!==todayStr()) return;
    const now = Date.now(), ivs = state.appActivity.todayIntervals;
    const lw = Math.max(lastWorkActivityEnd(ivs, s.startedAt, !s.autoStarted) || 0, s.startedAt);
    const limit = s.autoStarted ? Math.max(3, Number(st.graceMinutes)||3)*60000 : awayLimitMs();
    if(now - lw < limit) return;
    const last = ivs[ivs.length-1], app = last && now - last.end <= APP_ACTIVITY_GAP_MS ? last.app : null;
    if(s.autoStarted){ autoEndFocusSession(Math.max(lw, s.startedAt + 60000)); autoLockInMeta = {app:null, intervalStart:null}; return; }
    endSessionForAway(Math.max(lw, s.startedAt + 60000), now, 'offwork', app || 'nothing work-related');
  };
})(checkAwayFromSession);
// (the checks also run on their own every half minute, not only when new activity comes in)
setInterval(function(){ try{ if(state && state.focus && state.focus.activeSession){ checkAwayFromSession(); checkAutoLockIn(); } }catch(e){} }, 30000);

// ---- the greeting under the business name is Op saying hi ----
// A few words in his voice, nothing about work: "Still up, Andre?" late at night, something warm or a
// little wry in the day. With a key he writes it (fresh each part of the day); without one he picks
// from his own lines. It comes in word by word, like his lines in Good morning.
const OP_HELLOS = {
  late:['Still up, {n}?', 'The night shift again, {n}?', 'Owls and you, {n}.', 'Can’t sleep either, {n}?'],
  early:['Early one, {n}.', 'Up with the sun, {n}.', 'Beat the alarm, {n}?', 'Quiet hours. Nice, {n}.'],
  morning:['Morning, {n}.', 'There you are. Morning, {n}.', 'Coffee first, {n}.', 'Fresh day, {n}.'],
  afternoon:['Afternoon, {n}.', 'Good to see you, {n}.', 'Hey, {n}. Still going strong?', 'Afternoon. Hydrated, {n}?'],
  evening:['Evening, {n}.', 'Evening, {n}. Easy does it.', 'Golden hour, {n}.', 'Hey you. Long day, {n}?']
};
function opHelloPart(){ const h = new Date().getHours(); return h < 5 ? 'late' : h < 9 ? 'early' : h < 12 ? 'morning' : h < 18 ? 'afternoon' : 'evening'; }
thOpLocal = function(){
  const part = opHelloPart(), list = OP_HELLOS[part], name = (state.profile.name || '').split(' ')[0] || 'friend';
  const d = Number(todayStr().replace(/-/g, ''));
  return list[d % list.length].replace('{n}', name);
};
thOpKick = function(force){
  if(typeof aiWrite!=='function' || AI.hasKey===false) return;
  const k = thOpKey();
  if(!force && ui.thOp && ui.thOp.k===k) return;   // (one try per part of the day: a failed call doesn't retry on every render)
  ui.thOp = {k:k, busy:true};
  const name = (state.profile.name || '').split(' ')[0];
  aiWrite('Say hi to me for the top of my dashboard, in your own voice: a tiny greeting, two to seven words, the way you would when I open the app. It’s '+fmt12Hour(nowHM())+' on a '+new Date().toLocaleDateString('en-US', {weekday:'long'})+'. Playful, warm or a little wry, your personality. Nothing about work, tasks, hours or plans. Use my name ('+name+') if it fits. For the feel: “Still up, '+name+'?” late at night. A different one every time. Only the greeting: no quotes, no em dashes.', {max:40}).then(function(t){
    t = String(t || '').trim().split('\n')[0].replace(/^["“']|["”']$/g, '').replace(/\s*[—–]\s*/g, ', ');
    if(t.split(/\s+/).length > 10) t = '';
    ui.thOp = {k:k, text:t || null};
    const el = document.querySelector('.th-op-t'); if(el && t) opHelloPaint(el, t);
  }).catch(function(){ ui.thOp = {k:k, text:null}; });
};
function opHelloWords(t){ return escapeHtml(t).split(' ').map(function(w, i){ return '<i style="--i:'+i+'">'+w+'</i>'; }).join(' '); }
function opHelloPaint(el, t){ el.innerHTML = opHelloWords(t); el.classList.remove('is-in'); void el.offsetWidth; el.classList.add('is-in'); ui.thOpShown = t; }
thOpHtml = function(){
  const t = thOpText(), fresh = ui.thOpShown!==t;
  if(fresh) setTimeout(function(){ ui.thOpShown = t; }, 50);
  return '<div class="th-op is-hello" title="Op"><i class="th-op-o"></i><span class="th-op-t'+(fresh ? ' is-in' : '')+'">'+opHelloWords(t)+'</span></div>';
};
ACTIONS.thOpAgain = function(){ thOpKick(true); };

// ---- Good morning: shorter, and it asks ----
// The panels come in at a quicker pace (the voice keeps up by moving to the newest line). Sports only
// names your teams' games; otherwise it's the gist ("Yesterday was NFL Sunday") and a question. The
// news is the gist and a question too. When a line asks something, the mic opens and the brief waits
// for you before it goes on.
const ASK_MORE = ['Want the rundown?', 'Want to hear about it?', 'Want more on that?'];
sportsTease = function(){
  const f = sportsTeaseFacts(); if(!f) return null;
  const cap = function(t){ return t.charAt(0).toUpperCase()+t.slice(1); };
  const fav = f.picks.filter(function(p){ return p.fav; })[0], parts = [];
  if(fav) parts.push(cap(teaseGameLine(fav))+'.');
  else if(f.soon.length){ const s = f.soon[0].g; parts.push('The '+(favWords().some(function(w){ return s.home.name.toLowerCase().indexOf(w) >= 0; }) ? s.home.short : s.away.short)+' play '+scoreWhen(s).replace('Today', 'today').replace('Tomorrow', 'tomorrow')+'.'); }
  if(!fav && f.busy.length){
    const b = f.busy.slice().sort(function(a, c){ return c.n - a.n; })[0], dow = new Date().getDay();
    parts.push(/NFL/i.test(b.league) && dow===1 ? 'Yesterday was NFL Sunday.' : b.n >= 7 ? 'Big night in the '+b.league+'.' : 'A busy night in the '+b.league+'.');
  } else if(!parts.length && f.picks.length) parts.push('A few games last night.');
  if(!parts.length) return null;
  parts.push(teasePick('askS', ASK_MORE));
  return {text:parts.join(' '), topics:fav ? ['the '+(fav.g.home.win ? fav.g.home : fav.g.away).short+' game'] : ['the games'], facts:f.picks.slice(0, 4).map(function(p){ return p.league+': '+p.g.away.name+' '+p.g.away.score+', '+p.g.home.name+' '+p.g.home.score+' ('+(p.g.detail||p.g.state)+')'+(p.fav ? ' [his team]' : ''); })};
};
newsTease = (function(base){
  return function(){
    const r = base.apply(this, arguments); if(!r) return r;
    if(r.big) return r;
    const t = String(r.text).split(/(?<=[.!?])\s/)[0];
    return Object.assign({}, r, {text:t+' '+teasePick('askN', ASK_MORE)});
  };
})(newsTease);
opBriefRewrite = function(lines){
  if(AI.hasKey!==true || typeof aiWrite!=='function') return;
  const today = todayStr(), b = ui.briefAi && ui.briefAi.date===today ? ui.briefAi : (ui.briefAi = {date:today, map:{}, asked:{}});
  const todo = lines.filter(function(l){ return l.key && !b.asked[l.key] && l.text; });
  if(!todo.length) return;
  todo.forEach(function(l){ b.asked[l.key] = 1; });
  b.asked.greet = 1;
  const task = 'Below are the lines you’ll say out loud on my Good morning screen, one as each panel appears, while I’m waking up. Say each one your own way, like you’re talking to me over coffee: warm, easy, your humor where it fits. Keep them SHORT: under 12 words each. I don’t want the morning to drag or to be told everything. Keep every fact exactly (times, temperatures, numbers, names) and invent nothing. Don’t start any with “Good morning” or my name. It’s about the morning, not work: nothing beyond what’s on today’s calendar.\n'+
    'For the news and sports lines: the gist only, then ask if I want to hear more (end that line with the question). Sports: name my teams if they played, otherwise generalize (“Yesterday was NFL Sunday”). News: a few words on what’s going on, never a list; only a genuinely big story gets said plainly.\n'+
    'Only say the lines themselves: never mention these instructions or comment on the request.\n'+
    'Also add one more line, greet: how you say good morning to me today, by name, with personality, different from any day before (under 10 words).\n'+
    'Answer with one line per key, exactly as key: text\n\n'+todo.map(function(l){ return l.key+': '+l.text; }).join('\n');
  aiWrite(task, {max:500}).then(function(t){
    if(!t) return;
    String(t).split(/\n|(?=\b[a-z][a-z0-9-]*: )/).forEach(function(row){ const m = /^\s*([a-z][a-z0-9-]*):\s*(.+?)\s*$/.exec(row); if(m && b.asked[m[1]] && m[2].length < 220) b.map[m[1]] = m[2].replace(/^[“"]|[”"]$/g, ''); });
  });
};
// a question in the brief opens the mic; the brief waits while you two talk
opSay = (function(base){
  return function(text, opts){
    if(opts && opts.cap==='brVoice' && opts.noListen && /\?["”’)]*\s*$/.test(String(text||''))) opts = Object.assign({}, opts, {noListen:false});
    return base.call(this, text, opts);
  };
})(opSay);
opBriefTick = (function(base){
  return function(lines, t){
    if(OV.idx >= 0 && (AI.listening || AI.busy)) return true;
    return base.apply(this, arguments);
  };
})(opBriefTick);

// ---- shoo him off and his box goes ----
// "I'm good", "nah", "that's all", "thanks": once he's answered, the box leaves in a couple of seconds
// (not the usual long read time). The ✕ closes it straight away, quicker than before.
const OP_SHOO = /^\s*(no|nah|nope|i'?m good|im good|i'?m fine|all good|that'?s (all|it)|nothing|not now|later|maybe later|stop|bye|goodbye|thanks?|thank you|ok(ay)?|cool|got it|leave it|never ?mind|we'?re good)\b/i;
aiAsk = (function(base){
  return function(text){
    const t = String(text||'').trim();
    AI.shooAt = (OP_SHOO.test(t) && t.split(/\s+/).length <= 6) ? Date.now() : 0;
    return base.apply(this, arguments);
  };
})(aiAsk);
opBubStay = (function(base){
  return function(){ if(AI.shooAt && Date.now() - AI.shooAt < 90000) return 2400; return base.apply(this, arguments); };
})(opBubStay);
