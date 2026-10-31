// ============ ROUND 57: OP ============
// Op is Jarvis, not Batman: he guides, he never refuses or defies. This round:
//  1. No more "not outside work hours" / "go to sleep" rules: whatever you ask, any hour, he does it now, with at
//     most one short caring line.
//  2. A session ends only when you end it (ending it when you're away is a switch in Settings, off by default, and
//     talking to Op counts as being there).
//  3. Away from the Mac (the idle tracking): he doesn't talk to an empty chair; what he'd have said waits till you're
//     back. Asking how a shoot or an event went waits for you too.
//  4. After a calendar event (any event, or just client ones, or none: Settings → Op) he asks how it went; what you
//     say goes in the journal, and a sales call gets a review task.
//  5. Goodnight: warm and short, the alarm time, "see you then", then quiet until morning.
//  6. When he asks you something: by voice he listens right away; in text mode or with a hold-to-talk key, the reply
//     box opens and is ready to type.
//  7. Hold to talk (any key you pick, like a Discord bind): nothing ends what you're saying while the key is down.
//  8. Break: "take a break" starts one, straight away (locked in or not).
//  9. Ducking: a switch, a level, and what lowers other audio. The mic no longer turns on the Mac's voice processing
//     (which dropped every other sound while it was on).
// 10. The double input: the mic opened 350 ms after he finished, while his last words were still coming out of the
//     speakers (his voice plays outside the page, so echo cancelling can't hear it), and it sent his own closing
//     line back as yours. The mic now waits for the tail, and anything that's his own last line is dropped.
// 11. add_journal takes a tag (Update, Win, …).
// 12. Everything Op logs or does for you: a white note types itself out top right (with the time), and it's in
//     Settings (Op's notes) and in App updates.
const R57 = {lastSaid:null, saidAt:0, held:[], quietUntil:0};
function r57Opt(k, d){ const o = state.settings.r57Op || (state.settings.r57Op = {}); return o[k]===undefined ? d : o[k]; }
function r57Set(k, v){ (state.settings.r57Op || (state.settings.r57Op = {}))[k] = v; persist('settings'); }

// ---- 1. the prompt: no hours, no bedtime lectures ----
aiSystem = (function(base){
  return function(){
    const s = base.apply(this, arguments);
    if(!Array.isArray(s)) return s;
    const out = s.filter(function(b){ return !(b && typeof b.text==='string' && /^The time, and what it means/.test(b.text)); });
    try{
      const c = opTimeCtx(), w = typeof workToday==='function' ? workToday() : null;
      const t = c.now.toLocaleTimeString(undefined, {hour:'numeric', minute:'2-digit'})+' on '+c.now.toLocaleDateString(undefined, {weekday:'long'});
      const hours = w && w.enabled && typeof workDayToday==='function' && workDayToday() ? 'His work hours today: '+fmt12Hour(w.start)+' to '+fmt12Hour(w.end)+'.' : '';
      const bed = c.bed ? 'His alarm tomorrow means bed around '+new Date(c.bed).toLocaleTimeString(undefined, {hour:'numeric', minute:'2-digit'})+'.' : '';
      out.push({type:'text', text:'The time (for context only, never a reason to say no):\n- It’s '+t+'. '+hours+' '+bed+'\n'+
        '- He decides. Whatever he asks (lock in, start a task, work on a client, a lead, anything), at any hour, do it right away with your tools. His asking is the yes.\n'+
        '- You may add one short, warm line if it’s late (like “Late one. Your alarm’s at 6.”), once. Never refuse, never say it can wait for tomorrow, never tell him to go to sleep, never lecture.'});
    }catch(e){}
    return out;
  };
})(aiSystem);
// (his own nudges and check-ins still don't start late at night on their own; anything you ask, he does)

// ---- 2. a session ends when you end it ----
function r57AwayEnds(){ const st = state.settings.appTracking || {}; return st.awayEnds===true; }
function r57TalkingNow(){ const last = Math.max(OPX.userAt || 0, OV.lastEnd || 0, R57.saidAt || 0); return AI.listening || AI.busy || AI.transcribing || OV.speaking || Date.now() - last < awayLimitMs(); }
checkAwayFromSession = (function(base){
  return function(){
    const s = state.focus && state.focus.activeSession;
    if(s && !r57AwayEnds()) return;          // (the switch is off: nothing ends it)
    if(s && r57TalkingNow()) return;          // (talking to Op is being here)
    return base.apply(this, arguments);
  };
})(checkAwayFromSession);
// with the switch on, going away really ends it (the round-21 behaviour, with Add it back)
autoEndFocusSession = function(endAt){
  if(!r57AwayEnds()){ r56AwayAsk(); return; }
  const s = state.focus.activeSession; if(!s) return;
  const endedAt = Math.min(Date.now(), endAt || Date.now()), minutes = Math.max(1, Math.round((endedAt - s.startedAt)/60000));
  if(ui.currentTaskId){ accumulateCurrentTaskTime(ui.currentTaskId); persist('tasks'); }
  state.focus.sessions.push({id:uid(), type:sessionType(s), date:todayStr(new Date(s.startedAt)), startedAt:s.startedAt, endedAt:endedAt, minutes:minutes, completedTasks:arr(s.completedTasks), note:'', autoStopped:true, auto:!!s.autoStarted, reviewed:false});
  state.focus.activeSession = null; state.focus.lastSessionEndedAt = endedAt;
  if(state.modes.active && state.modes.active.linkedFocus) endMode();
  playStopSound(); persist('focus'); renderView();
  showToast('Session ended: away since '+fmt12Hour(nowHM(new Date(endedAt)))+' ('+fmtDurationLabel(minutes)+' logged).', {icon:'&#9209;'});
};
endSessionForAway = function(endAt, now, why, app){
  if(!r57AwayEnds()){ r56AwayAsk(); return; }
  const s = state.focus.activeSession; if(!s || endAt >= now) return;
  const copy = JSON.parse(JSON.stringify(s));
  if(ui.currentTaskId){ accumulateCurrentTaskTime(ui.currentTaskId, endAt); persist('tasks'); }
  const id = uid(), minutes = Math.max(1, Math.round((endAt - s.startedAt)/60000));
  state.focus.sessions.push({id:id, type:sessionType(s), date:todayStr(new Date(s.startedAt)), startedAt:s.startedAt, endedAt:endAt, minutes:minutes, completedTasks:arr(s.completedTasks), note:'', autoStopped:true, away:true, reviewed:false});
  state.focus.activeSession = null; state.focus.lastSessionEndedAt = endAt;
  state.focus.awayStop = {sessionId:id, active:copy, endedAt:endAt, at:now, shown:why==='offwork', why:why || 'away', app:app || null};
  if(state.modes.active && state.modes.active.linkedFocus) endMode();
  persist('focus'); renderView();
  if(why==='offwork') showToast('Session stopped at '+fmt12Hour(nowHM(new Date(endAt)))+'.', {icon:'&#9209;', actionLabel:'Add it back', actionAction:'restoreAwaySession', duration:20000});
};
// (the switch is off: the one "still locked in" note doesn't come while you're talking to him)
r56AwayAsk = (function(base){ return function(){ if(r57TalkingNow()) return; return base.apply(this, arguments); }; })(r56AwayAsk);
// Settings → Focus & Lock in: the switch, above the minutes
renderSettings = (function(base){
  return function(){
    const h = base.apply(this, arguments);
    if(h.indexOf('id="setAppTrackingAway"') < 0) return h;
    return h.replace(/(<div class="field"><label>Stop any session after \(minutes away\))/, function(m0){ return '<div class="r51-row r57-away"><span class="r51-rl">End a session when I’m away</span><span class="r51-rc">'+r51Sw(r57AwayEnds(), 'r57AwayToggle')+'</span></div>'+m0; });
  };
})(renderSettings);
ACTIONS.r57AwayToggle = function(){ const st = state.settings.appTracking || (state.settings.appTracking = {}); st.awayEnds = !r57AwayEnds(); persist('settings'); playTick(); renderView(); };

// ---- 3. away from the Mac: no talking to an empty chair ----
// (the activity helper's samples carry the seconds since the last key or mouse; the browser has no such thing,
// so there it never counts you away)
function r57IdleSec(){
  if(typeof actSamples==='undefined' || !actSamples || !actSamples.length || !lastRawSampleAt) return 0;
  const s = actSamples[actSamples.length - 1], since = (Date.now() - Math.max(s.ts || 0, lastRawSampleAt))/1000;
  if(Date.now() - lastRawSampleAt > 120000) return since + 60;           // (the Mac's asleep, or the tracker stopped)
  return Math.max(0, Number(s.idle) || 0) + Math.max(0, (Date.now() - (s.ts || Date.now()))/1000);
}
function r57Away(){ if(r57TalkingNow()) return false; return r57IdleSec() > Number(r57Opt('afkSec', 150)); }
// what he'd say on his own waits for you to be back (the latest one, within a few hours)
function r57Hold(fn, args, what){ R57.held = R57.held.filter(function(h){ return Date.now() - h.at < 4*3600000 && h.what!==what; }); R57.held.push({fn:fn, args:args, at:Date.now(), what:what || ''}); }
function r57NightQuiet(){ return R57.quietUntil > Date.now() || Number(state.focus && state.focus.r57QuietUntil) > Date.now(); }
r54Speak = (function(base){
  return function(line){
    if(r57NightQuiet() && !r54UserTurn()) return;
    if(r57Away()){ r57Hold(base, arguments, 'speak:'+String(line).slice(0, 30)); return; }
    return base.apply(this, arguments);
  };
})(r54Speak);
opNotify = (function(base){
  return function(text){
    if(r57NightQuiet() && !r54UserTurn()) return;
    if(r57Away()){ r57Hold(base, arguments, 'note:'+String(text).slice(0, 30)); return; }
    return base.apply(this, arguments);
  };
})(opNotify);
setInterval(function(){
  try{
    if(!R57.held.length || r57Away() || r57NightQuiet() || !r54Free()) return;
    const h = R57.held.pop(); R57.held = [];
    if(Date.now() - h.at < 4*3600000) h.fn.apply(null, h.args);
  }catch(e){}
}, 15000);

// ---- 4. after a calendar event: how did it go? ----
// Settings → Op: after every event (the default), only events with a client or lead, or never. It asks once you're
// back at the Mac and free, from the event's end (or an hour in) to six hours later.
function r57DebriefMode(){ return r57Opt('debrief', 'all'); }
function r57EvEnd(e){ const s = hmMin(e.time); if(s==null) return null; const en = e.endTime ? hmMin(e.endTime) : null; return en!=null && en > s ? en : s + 60; }
r54MeetTick = function(){
  if(!state || !state.calendar || !opOn() || r54Working() || !r54Free() || r57Away() || r57NightQuiet()) return;
  const mode = r57DebriefMode(); if(mode==='off') return;
  const t = todayStr(), m = nowMin();
  const ev = arr(state.calendar.events).find(function(e){
    if(e.date!==t || !e.time || e.isShoot || e.r54Asked || e.allDay) return false;
    if(mode==='clients' && !e.linkedClient && !e.linkedLead) return false;
    const end = r57EvEnd(e); return end!=null && m >= end && m <= end + 360;
  });
  if(!ev) return;
  ev.r54Asked = true; persist('calendar');
  R57.debriefEv = {id:ev.id, title:ev.title, at:Date.now(), lead:ev.linkedLead || null, client:ev.linkedClient || null};
  r54DebriefAsk('meet', ev.linkedClient || (ev.linkedLead ? 'lead:'+ev.linkedLead : null), ev.title);
};
// (a shoot's "how'd it go" waits for you too)
r54DebriefAsk = (function(base){
  return function(){
    if(r57Away() || r57NightQuiet()){ r57Hold(base, arguments, 'debrief'); return; }
    return base.apply(this, arguments);
  };
})(r54DebriefAsk);
// what you say back: the client's or lead's record as before; an event with nobody on it goes in your journal;
// a sales call (a lead, or "sales"/"discovery"/"closing" in its name) gets a review task with the framing
function r57IsSales(D){ return !!(D && (D.lead || /sales|discovery|closing|consult/i.test(D.title || ''))); }
r54File = (function(base){
  return function(text){
    const D = R54.debrief, E = R57.debriefEv;
    const r = base.apply(this, arguments);
    try{
      if(!D || !E || Date.now() - E.at > 20*60000) return r;
      if(!D.clientId){
        const note = String(text || '').trim();
        if(note && !E.filed){ E.filed = true; state.journal.entries.push({id:uid(), date:todayStr(), timestamp:Date.now(), title:'After '+(E.title || 'the event'), text:note, type:'freeform', mood:null, pinned:false, photos:[], by:'op'}); persist('journal'); r57Did('Wrote down how '+(E.title || 'the event')+' went in your journal.'); }
      }
      if(r57IsSales(E) && !E.task){
        E.task = true;
        const who = E.lead ? crmFind('lead', E.lead) : E.client ? crmFind('client', E.client) : null;
        state.tasks.items.push({id:uid(), title:'Review the call: '+(who ? (E.lead ? crmName('lead', who) : crmName('client', who)) : (E.title || 'sales call')), client:E.client || 'general', clients:E.client ? [E.client] : ['general'], priority:'high', deadline:todayStr(), status:'today', createdAt:todayStr(), completedAt:null,
          notes:'What they said: '+String(text || '').slice(0, 400)+'\n\nNext time, before the price:\n'+PB57_SALES_FRAME.map(function(l){ return '• '+l; }).join('\n'), master:{kind:'review', event:E.id}});
        persist('tasks'); r57Did('Added a task: review the call, with how to frame the price next time.');
      }
    }catch(e){}
    return r;
  };
})(r54File);

// ---- 5. goodnight ----
opGoodnight = async function(){
  if(!opOn()) return;
  const f = state.focus, t = todayStr(); if(f.opNightSaid===t) return; f.opNightSaid = t;
  OPX.userAt = Date.now();
  const facts = opDayFacts(), name = (state.profile.name || '').split(' ')[0];
  const ack = facts.done.length ? 'Good day: '+facts.done[0]+' got done.' : facts.deep ? 'Good work today.' : 'Long day.';
  let line = ack+' Time to wind down'+(name ? ', '+name : '')+'.'+(facts.wake ? ' Your alarm’s set for '+fmt12Hour(facts.wake)+'.' : '')+' Goodnight, see you then.';
  if(AI.hasKey===true && typeof aiWrite==='function'){
    const tx = await Promise.race([aiWrite('I’m going to bed now. Say goodnight like a friend: warm and short. Acknowledge the day in a few words (one thing from it), say it’s time to wind down, mention my alarm time, and end with “Goodnight, see you then.” Two or three short spoken sentences. No tasks, nothing about tomorrow’s work, no advice.\n\nFacts: '+(facts.done.length ? 'got done: '+facts.done.slice(0, 2).join('; ')+'. ' : '')+(facts.deep ? 'deep work '+fmtDurationLabel(facts.deep)+'. ' : '')+(facts.wake ? 'alarm '+fmt12Hour(facts.wake)+'.' : 'no alarm set.'), {max:110}), new Promise(function(r){ setTimeout(r, 7000); })]);
    if(tx && /goodnight|good night/i.test(tx) && !/tomorrow.{0,40}(task|first thing|start with)/i.test(tx)) line = String(tx).trim();
  }
  // then quiet until the morning (the alarm), unless you talk to him
  const nw = typeof nextWake==='function' ? nextWake() : null;
  f.r57QuietUntil = nw && nw.ts ? nw.ts : Date.now() + 9*3600000; persist('focus');
  OV.cap = 'opBubText'; opBubShow();
  if(typeof opChatLog==='function') try{ opChatLog('op', line); }catch(e){}
  if(opVoiceOn()) opSay(line, {cap:'opBubText', force:true}); else opCaption(line);
};
// (the end-of-hours tap-in and the "session done" line don't come once he's said goodnight)
opWrapUp = function(){};

// ---- 6. when he asks you something ----
// By voice: the mic opens as soon as he's done (and his last words have left the speakers). Typing, or with a
// hold-to-talk key: the reply box opens, ready.
function r57HoldMode(){ return state.profile.opKeyMode!=='tap'; }
opTalkMode = function(){ return r57HoldMode() && r54KeyOn() ? 'ptt' : 'free'; };
aiAutoListen = (function(base){
  return function(cap){
    if(!opOn() || AI.listening || AI.busy) return;
    if(opTextMode() || opTalkMode()==='ptt'){ OV.cap = 'opBubText'; opBubShow(); const i = document.getElementById('opBubInput'); if(i) setTimeout(function(){ i.focus(); }, 60); return; }
    // (wait for the tail of what he said, so the mic doesn't hear him)
    const go = function(){ if(!AI.listening && !AI.busy && !OV.speaking && !OV.pending) base.apply(null, [cap]); };
    const wait = Math.max(0, 900 - (Date.now() - (OV.lastEnd || 0)));
    if(wait) setTimeout(go, wait); else go();
  };
})(aiAutoListen);
// what he said last, so his own words coming back through the mic aren't taken as yours
opSay = (function(base){ return function(text){ R57.lastSaid = String(text || ''); R57.saidAt = Date.now(); return base.apply(this, arguments); }; })(opSay);
opCaption = (function(base){ return function(t){ if(typeof t==='string' && t.length > 12 && !/^(Listening|“)/.test(t) && t!=='…') { R57.capText = t; R57.capAt = Date.now(); } return base.apply(this, arguments); }; })(opCaption);
function r57Echo(t){
  const recent = [[R57.lastSaid, R57.saidAt], [R57.capText, R57.capAt]].filter(function(x){ return x[0] && Date.now() - x[1] < 25000; });
  return recent.some(function(x){ const sents = String(x[0]).split(/(?<=[.!?])\s+/).filter(Boolean), last = sents.slice(-2).join(' '); return r51Same(t, last) || r51Same(t, x[0]); });
}
aiAsk = (function(base){
  return function(text, cap){
    const t = String(text || '').trim(); if(!t) return;
    const typed = Date.now() - Math.max(AI.typedAt || 0, OP1.inputAt || 0) < 4000;
    if(!typed && r57Echo(t)){ opCaption(''); return; }   // (his own closing line, heard back)
    return base.apply(this, arguments);
  };
})(aiAsk);

// ---- 7. hold to talk: any key, as long as you like ----
// Down: he listens. Up: it sends. Nothing else ends it while the key is down (no 60-second stop, no "didn't hear
// anything", no five-minute cap). Tap mode (press, talk, press again) is still there.
function r57KeyLabel(code){
  if(!code) return 'a key';
  if(OP_PTT_KEYS[code]) return OP_PTT_KEYS[code];
  const m = {Space:'Space', Backquote:'`', CapsLock:'Caps Lock', ShiftLeft:'Left ⇧', ShiftRight:'Right ⇧', MetaLeft:'Left ⌘', MetaRight:'Right ⌘', ControlLeft:'Left ⌃', Mouse4:'Mouse 4', Mouse5:'Mouse 5', Mouse3:'Middle click'};
  if(m[code]) return m[code];
  return code.replace(/^Key/, '').replace(/^Digit/, '').replace(/^Numpad/, 'Num ');
}
function r57Down(){
  if(!opOn() || OPX.ptt) return;
  OPX.ptt = true; OPX.pttFrom = Date.now(); OPX.userAt = Date.now(); R54.autoLeft = 1; AI.closedAt = 0;
  if(OV.speaking || OV.pending){ try{ opStop(); }catch(e){} OV.userCut = true; }
  try{ opLightMark(); }catch(e){}
  OV.cap = 'opBubText'; opBubShow(); r54Blip('on');
  if(!AI.listening) aiListen('opBubText');
}
function r57Up(){
  if(!OPX.ptt) return;
  OPX.ptt = false; OPX.pttUsed = Date.now();
  try{ opLightMark(); }catch(e){}
  r54Blip('send');
  // (one send per hold: the key, the window losing focus and a tap can't send it twice)
  if(AI.sendNow){ const s = AI.sendNow; AI.sendNow = null; s(); }
  else { let n = 0; const iv = setInterval(function(){ n++; if(AI.sendNow){ clearInterval(iv); const s = AI.sendNow; AI.sendNow = null; s(); } else if(n > 40 || !AI.listening) clearInterval(iv); }, 100); }
}
// in the page (the window has focus): the key down/up. A Mac-wide key comes from the app while it's in the back.
window.addEventListener('keydown', function(e){
  if(!r54KeyOn() || e.code!==opPttKey()) return;
  const t = e.target, typing = t && (t.tagName==='INPUT' || t.tagName==='TEXTAREA' || t.isContentEditable);
  if(typing && !/^(Alt|Control|Meta|Shift|F\d)/.test(e.code)) return;
  if(r57Capture.on) return;
  e.stopImmediatePropagation(); e.stopPropagation();
  if(!r57HoldMode()){ if(!e.repeat) R54.keyDown = {code:e.code, other:false}; return; }
  e.preventDefault(); if(!e.repeat) r57Down(); R57.keySeen = Date.now();
}, true);
window.addEventListener('keyup', function(e){
  if(!r54KeyOn() || e.code!==opPttKey() || r57Capture.on) return;
  e.stopImmediatePropagation(); e.stopPropagation();
  if(!r57HoldMode()){ const k = R54.keyDown; R54.keyDown = null; if(k){ e.preventDefault(); r54TalkToggle(); } return; }
  e.preventDefault(); r57Up();
}, true);
// (a mouse button as the key: 3 = middle, 4/5 = the side buttons)
window.addEventListener('mousedown', function(e){ if(r57Capture.on || !r54KeyOn() || opPttKey()!=='Mouse'+(e.button + 1) || e.button < 2) return; e.preventDefault(); if(r57HoldMode()) r57Down(); }, true);
window.addEventListener('mouseup', function(e){ if(r57Capture.on || !r54KeyOn() || opPttKey()!=='Mouse'+(e.button + 1) || e.button < 2) return; e.preventDefault(); if(r57HoldMode()) r57Up(); else r54TalkToggle(); }, true);
window.addEventListener('blur', function(){ if(OPX.ptt && !R57.globalHeld) r57Up(); });
// the Mac app calls these when the key is pressed with Operator in the back
(function(){
  if(typeof window==='undefined' || !window.operatorPage) return;
  const P = Object.assign({}, window.operatorPage);
  P.talkDown = function(){ R57.globalHeld = true; if(r57HoldMode()) r57Down(); };
  P.talkUp = function(){ R57.globalHeld = false; if(r57HoldMode()) r57Up(); else r54TalkToggle(); };
  P.talkKeyHealth = function(h){ R57.keyHealth = h; try{ if(ui.view==='settings') renderView(); }catch(e){} };
  try{ window.operatorPage = Object.freeze(P); }catch(e){}
})();
// tell the Mac app the key, the mode, and that it's on
r54TalkPrefs = function(){ try{ if(OPAPP && OPAPP.talkPrefs) OPAPP.talkPrefs({on:r54KeyOn() && opOn(), key:opPttKey(), mode:r57HoldMode() ? 'hold' : 'tap'}); }catch(e){} };
// while the key is down, nothing stops the listening: the speech engine's own 60-second stop (in the browser)
// is held until you let go, and Scribe's silence / pause / five-minute stops don't apply
(function(){
  const st = window.setTimeout;
  window.setTimeout = function(fn, ms){
    if(ms===60000 && typeof fn==='function' && AI && AI.listening){ return st.call(window, function(){ if(OPX.ptt){ R57.srPending = fn; return; } fn(); }, ms); }
    return st.apply(window, arguments);
  };
})();
scribeListen = async function(cap){
  if(AI.listening){ if(AI.sendNow) AI.sendNow(); return; }
  if(typeof opStop==='function') opStop();
  const heyWas = typeof HW!=='undefined' && HW.on; if(heyWas && typeof heyStop==='function') heyStop();
  OV.cap = cap || 'opBubText'; AI.listening = true; AI.typedAt = 0; aiUiRefresh(); opCaption('Listening…');
  let stream = null;
  // (no voice processing: with it on, macOS turns every other sound down while the mic is open)
  try{ stream = await navigator.mediaDevices.getUserMedia({audio:r57MicOpts()}); }
  catch(e){ AI.listening = false; aiUiRefresh(); opCaption(e && e.name==='NotAllowedError' ? 'I need the microphone. Allow it for Operator (or type instead).' : 'The mic isn’t working: type instead.'); return; }
  r57Duck('mic', true);
  const mime = MediaRecorder.isTypeSupported('audio/webm;codecs=opus') ? 'audio/webm;codecs=opus' : (MediaRecorder.isTypeSupported('audio/webm') ? 'audio/webm' : '');
  const rec = new MediaRecorder(stream, mime ? {mimeType:mime} : undefined), chunks = [];
  rec.ondataavailable = function(e){ if(e.data && e.data.size) chunks.push(e.data); };
  let ctx = null, an = null, buf = null;
  try{ ctx = new (window.AudioContext || window.webkitAudioContext)(); an = ctx.createAnalyser(); an.fftSize = 1024; ctx.createMediaStreamSource(stream).connect(an); buf = new Float32Array(an.fftSize); }catch(e){}
  let floor = 0.006, spoke = false, lastLoud = Date.now(), why = null, talked = 0; AI._longWarn = false;
  const t0 = Date.now(), held = !!OPX.ptt;
  const finish = function(reason){ if(why) return; why = reason; clearInterval(tick); try{ if(rec.state!=='inactive') rec.stop(); }catch(e){ rec.onstop(); } };
  AI.sendNow = function(){ finish(spoke || !an ? 'send' : 'silence'); };
  AI.cancelListen = function(){ finish('cancel'); };
  const tick = setInterval(function(){
    let rms = 0;
    if(an){ an.getFloatTimeDomainData(buf); let s = 0; for(let i = 0; i < buf.length; i++) s += buf[i]*buf[i]; rms = Math.sqrt(s/buf.length); }
    SCR.level = rms;
    if(!spoke) floor = floor*0.94 + Math.min(rms, 0.04)*0.06;
    const loud = spoke ? Math.max(0.008, floor*2) : Math.max(0.014, floor*3);
    if(rms > loud){ if(spoke) talked += 100; lastLoud = Date.now(); if(!spoke && Date.now() - t0 > 120){ spoke = true; if(!held) opCaption('Listening… take your time'); } }
    if(held || OPX.ptt) return;    // (holding the key: only letting go sends it)
    const pause = (typeof opPauseMs==='function' ? opPauseMs() : 2500) + Math.min(3500, talked*0.12);
    if(spoke && Date.now() - lastLoud > pause) finish('send');
    else if(!spoke && Date.now() - t0 > (an ? 9000 : 6000)) finish(an ? 'silence' : 'send');
    else if(Date.now() - t0 > 300000) finish('send');
  }, 100);
  rec.onstop = async function(){
    stream.getTracks().forEach(function(t){ t.stop(); }); try{ if(ctx) ctx.close(); }catch(e){}
    AI.listening = false; AI.sendNow = null; AI.cancelListen = null; SCR.level = 0; aiUiRefresh(); r57Duck('mic', false);
    if(why==='cancel') return;
    if(why==='silence'){ opCaption('Didn’t hear anything.'); return; }
    AI.transcribing = true; opCaption('…');
    let text = '';
    try{ text = await scribeText(new Blob(chunks, {type:mime || 'audio/webm'}), mime || 'audio/webm'); }
    catch(e){ AI.transcribing = false; if(/no ElevenLabs key/i.test(e.message)) SCR.on = false; opCaption('Couldn’t make that out ('+(e.name==='AbortError' ? 'it took too long' : e.message)+'). Try again, or type.'); return; }
    AI.transcribing = false;
    if(text) aiAsk(text, OV.cap || cap); else opCaption('Didn’t catch that.');
  };
  rec.start(250);
};
if(typeof r51Busy==='function') scribeListen = (function(base){ return function(){ if(r51Busy()) return; return base.apply(this, arguments); }; })(scribeListen);
// the key: any key (or a mouse button). Press "Change", then the key.
const r57Capture = {on:false};
ACTIONS.r57KeyCapture = function(){ r57Capture.on = true; renderView(); };
window.addEventListener('keydown', function(e){
  if(!r57Capture.on) return;
  e.preventDefault(); e.stopImmediatePropagation();
  if(e.key==='Escape'){ r57Capture.on = false; renderView(); return; }
  state.profile.opPttKey = e.code; persist('profile'); r57Capture.on = false; r54TalkPrefs(); playTick(); renderView();
}, true);
window.addEventListener('mousedown', function(e){
  if(!r57Capture.on || e.button < 2) return;
  e.preventDefault(); e.stopImmediatePropagation();
  state.profile.opPttKey = 'Mouse'+(e.button + 1); persist('profile'); r57Capture.on = false; r54TalkPrefs(); playTick(); renderView();
}, true);
ACTIONS.r57KeyMode = function(el, e, v){ state.profile.opKeyMode = v==='tap' ? 'tap' : 'hold'; persist('profile'); r54TalkPrefs(); playTick(); renderView(); };
ACTIONS.r57OpenPrivacy = function(){ try{ if(OPAPP && OPAPP.openPrivacy) OPAPP.openPrivacy(R57.keyHealth && R57.keyHealth.need || 'ListenEvent'); }catch(e){} };
// (in the Mac app: the key works with Operator in the front; if the Mac-wide part can't see it, say what to turn on)
function r57KeyWarn(){
  if(!OPAPP) return '';
  if(OPAPP.talkHealth && Date.now() - (R57.healthAt || 0) > 5000){ R57.healthAt = Date.now(); OPAPP.talkHealth().then(function(h){ const was = JSON.stringify(R57.keyHealth || {}); R57.keyHealth = h; if(JSON.stringify(h)!==was && ui.view==='settings') renderView(); }).catch(function(){}); }
  const h = R57.keyHealth || {};
  if(h.ok===false || (h.hooked && R57.keySeen && h.last && h.last < R57.keySeen - 1500)) return '<div class="r57-keywarn">Operator can’t hear the key outside its window. Turn Operator on in System Settings → Privacy &amp; Security → '+(h.need==='Accessibility' ? 'Accessibility' : 'Input Monitoring')+', then quit and reopen it. <button class="btn btn-sm" data-action="r57OpenPrivacy">Open it</button></div>';
  return '';
}

// ---- 8. a break, straight away ----
opRunTool = (function(base){
  return function(name, x){
    if(name==='take_break'){
      const m = Number(x && x.minutes) > 0 ? Math.round(Number(x.minutes)) : 15;
      const as = state.focus.activeSession;
      if(as && as.onBreak) return 'already on a break';
      if(as){ ui.breakMinutes = m; ui.breakNoteDraft = String(x && x.note || ''); confirmStartBreakMode(); return 'break started: '+m+' minutes, back at '+fmtTimeShort(Date.now() + m*60000); }
      if(state.modes.active && state.modes.active.type==='break') return 'already on a break';
      startMode('break', {note:String(x && x.note || ''), endsAt:Date.now() + m*60000, minutes:m});
      return 'break started: '+m+' minutes';
    }
    return base.apply(this, arguments);
  };
})(opRunTool);
(function(){ const t = OP_TOOLS.find(function(t){ return t.name==='take_break'; }); if(t){ t.description = 'Start a break right now (locked in or not). It starts the moment you call it.'; t.input_schema = {type:'object', properties:{minutes:{type:'integer'}, note:{type:'string'}}, additionalProperties:false}; } })();
// a break with its own end (from Op, not locked in) ends by itself
setInterval(function(){ try{ const m = state.modes && state.modes.active; if(m && m.type==='break' && !m.linkedFocus && m.endsAt && Date.now() >= m.endsAt){ endMode(); showToast('Break’s over.', {icon:'&#9749;'}); } }catch(e){} }, 15000);
// the break window doesn't redraw under your click (it only redraws when it's opened or you change something in it)
(function(){
  let downIn = null;
  document.addEventListener('pointerdown', function(e){ const o = document.getElementById('breakNoteOverlay'); downIn = o && !o.classList.contains('hidden') && o.firstElementChild && o.firstElementChild.contains(e.target) ? Date.now() : null; }, true);
  renderBreakNoteModalInto = (function(base){ return function(){ if(downIn && Date.now() - downIn < 600 && !ui.r57BreakPick) return; ui.r57BreakPick = false; return base.apply(this, arguments); }; })(renderBreakNoteModalInto);
  ACTIONS.pickBreakMinutes = (function(base){ return function(){ ui.r57BreakPick = true; return base ? base.apply(this, arguments) : undefined; }; })(ACTIONS.pickBreakMinutes);
})();

// ---- 9. ducking ----
// On by default; how low other sound goes (20%); what lowers it: his voice and your conversation with him by
// default, and lock-in sounds if you want. The mic itself no longer turns everything down.
function r57DuckOn(){ return r57Opt('duck', true)!==false; }
function r57DuckLevel(){ return Math.max(0, Math.min(90, Number(r57Opt('duckLevel', 20)))); }
function r57DuckBy(k){ const by = r57Opt('duckBy', {voice:true, talk:true, sounds:false}); return !!by[k]; }
function r57MicOpts(){ return {echoCancellation:false, noiseSuppression:false, autoGainControl:false, channelCount:1}; }
const R57D = {why:{}};
function r57Duck(why, on){
  if(why==='mic') why = 'talk';
  R57D.why[why] = !!on;
  const want = r57DuckOn() && Object.keys(R57D.why).some(function(k){ return R57D.why[k] && r57DuckBy(k); });
  if(want===R57D.on) return; R57D.on = want;
  try{
    if(typeof FM!=='undefined' && FM.playing && FM.bus){ const c = getAudioCtx(), g = FM.bus.g.gain; g.cancelScheduledValues(c.currentTime); g.setValueAtTime(Math.max(0.0001, g.value), c.currentTime); g.exponentialRampToValueAtTime(Math.max(0.0002, fmVolume()*(want ? r57DuckLevel()/100 : 1)), c.currentTime + (want ? .25 : 1.2)); FM.ducked = want; }
    if(typeof wakeAudio!=='undefined' && wakeAudio){ if(want){ wakeAudio._duckFrom = wakeAudio._duckFrom==null ? wakeAudio.volume : wakeAudio._duckFrom; wakeAudio.volume = Math.min(wakeAudio.volume, wakeAudio._duckFrom*r57DuckLevel()/100); } else if(wakeAudio._duckFrom!=null){ wakeAudio.volume = wakeAudio._duckFrom; wakeAudio._duckFrom = null; } }
    helperFetch(WAKE_HELPER+'music/duck?on='+(want ? 1 : 0)+'&l='+r57DuckLevel(), 3000);
  }catch(e){}
}
// his voice: the old duck (music to a sixth) follows the setting now
opDuck = function(on){ if(on) r57Duck(AI.listening ? 'talk' : 'voice', true); else { r57Duck('voice', false); if(!AI.listening) r57Duck('talk', false); } };
// (lock-in sounds: only when you turn that on)
if(typeof fmDuckFor==='function') fmDuckFor = function(ms){ if(!r57DuckBy('sounds')) return; r57Duck('sounds', true); clearTimeout(fmDuckFor._t); fmDuckFor._t = setTimeout(function(){ r57Duck('sounds', false); }, ms); };
ACTIONS.r57DuckToggle = function(){ r57Set('duck', !r57DuckOn()); playTick(); renderView(); };
ACTIONS.r57DuckBy = function(el, e, k){ const by = Object.assign({voice:true, talk:true, sounds:false}, r57Opt('duckBy', {})); by[k] = !by[k]; r57Set('duckBy', by); playTick(); renderView(); };
document.addEventListener('input', function(e){ if(e.target && e.target.id==='r57DuckLevel'){ r57Set('duckLevel', Number(e.target.value)); const o = document.getElementById('r57DuckOut'); if(o) o.textContent = e.target.value+'%'; } });

// ---- 11. add_journal: a tag ----
(function(){ const t = OP_TOOLS.find(function(t){ return t.name==='add_journal'; }); if(t){ t.input_schema = Object.assign({}, t.input_schema); t.input_schema.properties = Object.assign({}, t.input_schema.properties, {tag:{type:'string', description:'Optional: file it under one of his journal tags by name, e.g. "Update" (app changes, kept in App updates), "Win", "Idea", "Reflect".'}}); t.description = 'Write an entry in his journal (his words, or a note he asked you to keep). Give it a tag when one fits; app changes and notes about the app go under "Update".'; } })();
function r57TagId(name){
  name = String(name || '').trim().toLowerCase(); if(!name) return null;
  const all = journalTypes().concat(MOODS), hit = all.find(function(m){ return String(m.label || '').toLowerCase()===name || m.id===name; }) || all.find(function(m){ return String(m.label || '').toLowerCase().indexOf(name) >= 0; });
  if(hit) return hit.id;
  if(/^updates?$/.test(name)) return r57UpdateType();
  return null;
}
// (no Update tag yet: one is made, with its emoji)
function r57UpdateType(){
  let id = updatesTypeId(); if(id) return id;
  if(!Array.isArray(state.journal.types) || !state.journal.types.length) state.journal.types = defaultJournalTypes().slice();
  const t = {id:'update', emoji:'🛠️', label:'Update', color:'#8fdcff'}; state.journal.types.push(t); state.journal.updatesType = t.id; persist('journal');
  return t.id;
}
opRunTool = (function(base){
  return function(name, x){
    if(name==='add_journal' && x && x.tag){
      const id = r57TagId(x.tag);
      const e = {id:uid(), date:todayStr(), timestamp:Date.now(), text:String(x.text || '').slice(0, 6000), title:String(x.title || '').slice(0, 120), type:'freeform', mood:id, pinned:false, photos:[], by:'op'};
      if(!e.text) throw new Error('missing text');
      state.journal.entries.push(e); persist('journal'); return 'in the journal'+(id ? ' under '+((moodById(id) || {}).label || x.tag) : ' (no tag called '+x.tag+')');
    }
    return base.apply(this, arguments);
  };
})(opRunTool);

// ---- 12. what Op logs or does: a note that types itself out, top right, and it's kept ----
function r57Clock(ts){ const d = new Date(ts || Date.now()); return r57Opt('clock12', true) ? d.toLocaleTimeString('en-US', {hour:'numeric', minute:'2-digit'}) : pad2(d.getHours())+':'+pad2(d.getMinutes()); }
function r57Note(text, kind){
  text = String(text || '').trim(); if(!text) return;
  let box = document.getElementById('r57Notes'); if(!box){ box = document.createElement('div'); box.id = 'r57Notes'; box.className = 'r57-notes'; document.body.appendChild(box); }
  const n = document.createElement('div'); n.className = 'r57-note'+(kind==='idea' ? ' is-idea' : '');
  n.innerHTML = '<div class="r57-nh"><i class="th-op-o op-note-o"></i><b>'+(kind==='idea' ? 'Op noted' : 'Op')+'</b><time>'+r57Clock()+'</time></div><p></p>';
  box.appendChild(n); while(box.children.length > 3) box.firstChild.remove();
  const p = n.querySelector('p'); let i = 0;
  const step = function(){ i = Math.min(text.length, i + 2); p.textContent = text.slice(0, i); if(i < text.length) n._t = setTimeout(step, 18); };
  step();
  setTimeout(function(){ n.classList.add('is-out'); setTimeout(function(){ n.remove(); }, 400); }, 5200 + text.length*30);
}
// one place it's all kept: Settings (Op's notes) and App updates (the journal, under Update)
function r57Log(text, kind){
  try{
    const s = state.settings; if(!Array.isArray(s.opIdeas)) s.opIdeas = [];
    if(!s.opIdeas.some(function(i){ return i.text===text && Date.now() - (i.at || 0) < 60000; })){ s.opIdeas.push({id:uid(), text:text, at:Date.now(), from:kind==='idea' ? 'op' : 'did'}); if(s.opIdeas.length > 120) s.opIdeas.splice(0, s.opIdeas.length - 120); persist('settings'); }
    const tag = r57UpdateType();
    state.journal.entries.push({id:uid(), date:todayStr(), timestamp:Date.now(), title:kind==='idea' ? 'Op’s idea' : 'Op did', text:text, type:'freeform', mood:tag, pinned:false, photos:[], by:'op'}); persist('journal');
  }catch(e){}
  r57Note(text, kind);
}
function r57Did(text){ r57Log(text, 'did'); }
const R57_SILENT_TOOLS = /^(remember|forget|suggest_improvement|open_page|music|read_|get_|look|search|check_back|settle_checkin|set_my_color)/;
opRunTool = (function(base){
  return function(name, x){
    const out = base.apply(this, arguments);
    try{
      if(!R57_SILENT_TOOLS.test(name) && typeof out==='string' && !/^(he isn’t|he has to|already|no |nothing|couldn)/i.test(out)) r57Did(r57DidLine(name, x, out));
    }catch(e){}
    return out;
  };
})(opRunTool);
function r57DidLine(name, x, out){ const s = String(out || '').trim(); return s.charAt(0).toUpperCase()+s.slice(1)+(/[.!?]$/.test(s) ? '' : '.'); }
// (the old idea log no longer adds a second copy: r57Log keeps it)
(function(){
  const b = opRunTool;
  opRunTool = function(name, x){
    if(name==='suggest_improvement'){ const idea = String(x && x.idea || '').trim().slice(0, 400); if(!idea) throw new Error('missing idea'); r57Log(idea, 'idea'); return 'logged'; }
    return b.apply(this, arguments);
  };
})();

// ---- Settings → Op: the rows ----
r51OpRowsHtml = (function(base){
  return function(){
    const h = base.apply(this, arguments);
    const key = opPttKey(), hold = r57HoldMode(), keyCtl = '<span class="r57-key">'+(r57Capture.on ? '<kbd class="is-wait">Press a key…</kbd>' : '<kbd>'+escapeHtml(r57KeyLabel(key))+'</kbd><button class="btn btn-ghost btn-sm" data-action="r57KeyCapture">Change</button>')+'</span>';
    const keyRow = '<div class="r51-sub r57-keyrow">'+keyCtl+'<div class="seg-tabs seg-sm">'+r51Seg('r57KeyMode', hold ? 'hold' : 'tap', 'hold', 'Hold to talk')+r51Seg('r57KeyMode', hold ? 'hold' : 'tap', 'tap', 'Tap on, tap off')+'</div></div>'+r57KeyWarn();
    const deb = '<div class="seg-tabs seg-sm">'+r51Seg('r57Debrief', r57DebriefMode(), 'all', 'Every event')+r51Seg('r57Debrief', r57DebriefMode(), 'clients', 'Clients &amp; leads')+r51Seg('r57Debrief', r57DebriefMode(), 'off', 'Never')+'</div>';
    const by = function(k, l){ return '<button class="r57-chip'+(r57DuckBy(k) ? ' is-on' : '')+'" data-action="r57DuckBy" data-id="'+k+'">'+l+'</button>'; };
    const duck = r57DuckOn() ? '<div class="r51-sub r57-duck"><label class="r57-lvl"><input type="range" min="0" max="80" step="5" id="r57DuckLevel" value="'+r57DuckLevel()+'"><output id="r57DuckOut">'+r57DuckLevel()+'%</output></label><span class="r57-chips">'+by('voice', 'His voice')+by('talk', 'Talking to him')+by('sounds', 'Lock-in sounds')+'</span></div>' : '';
    const clock = '<div class="seg-tabs seg-sm">'+r51Seg('r57Clock', r57Opt('clock12', true) ? '12' : '24', '12', '4:30 PM')+r51Seg('r57Clock', r57Opt('clock12', true) ? '12' : '24', '24', '16:30')+'</div>';
    const rows = r51Row('After an event, ask how it went', deb)+r51Row('Lower other sound', r51Sw(r57DuckOn(), 'r57DuckToggle'), duck)+r51Row('Time on his notes', clock);
    // (the key row: any key, hold or tap)
    let out = h.replace(/(<span class="r51-rl">Talk key<\/span>[\s\S]*?<\/div>)<div class="r51-sub">[\s\S]*?<\/div><\/div>/, function(m0, a){ return a+(r54KeyOn() ? keyRow : ''); });
    if(out===h && r54KeyOn()) out = h.replace(/(<span class="r51-rl">Talk key<\/span>[\s\S]*?<\/div>)/, function(m0){ return m0+keyRow; });
    return out.replace(/<\/div>$/, rows+'</div>');
  };
})(r51OpRowsHtml);
ACTIONS.r57Debrief = function(el, e, v){ r57Set('debrief', v==='off' ? 'off' : v==='clients' ? 'clients' : 'all'); playTick(); renderView(); };
ACTIONS.r57Clock = function(el, e, v){ r57Set('clock12', v!=='24'); playTick(); renderView(); };
setTimeout(function(){ try{ r54TalkPrefs(); }catch(e){} }, 1500);
