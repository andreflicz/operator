// ============ ROUND 54 ============
// ============ OP, REDONE: when he talks, how you talk to him ============
// The rules (every way he could speak up on his own goes through r54May; the old ways are gone):
//  • Working (a focus session, or shooting): nothing. Nothing is saved up for later either.
//  • In your work hours (the Work alarm's), not working: every 2–3 hours he calls it out, out loud, in his own
//    words each time. No task lists, no questions about your life.
//  • At the end of your work hours: he taps in once (after your session, if you're in one) and you take it.
//  • After hours, days off, and once you've clocked out: silence. Except: you talk to him first; the moment a
//    work session ends (one line); the Good morning you start; and the debrief after a shoot or a client
//    meeting, which he files in that client's journal.
//  • He never opens two lines the same way, and he brings up a given task at most once a day.

// ---- 1. the gate ----
function r54Working(){ const s = state.focus && state.focus.activeSession, m = state.modes && state.modes.active; return !!s || !!(m && m.type==='shooting'); }
function r54ClockedOut(){ const m = state.modes && state.modes.active; return !!(m && m.clockedOut); }
function r54InHours(){ if(typeof workPhase!=='function') return false; const p = workPhase(); return p==='work' || p==='lunch' || p==='break'; }
// (you're talking to him, or you just pressed something that makes him answer)
const R54 = {tapAt:0, autoLeft:1};
document.addEventListener('pointerdown', function(){ R54.tapAt = Date.now(); }, true);
document.addEventListener('keydown', function(){ R54.tapAt = Date.now(); }, true);
function r54UserTurn(){ return Date.now() - (OPX.userAt || 0) < 180000 || AI.busy || AI.listening || AI.transcribing || Date.now() - R54.tapAt < 8000; }
function r54Morning(){ return typeof overlayOpen==='function' && overlayOpen('wakeOverlay'); }
function r54May(kind){
  if(!opOn()) return false;
  if(r54UserTurn() || r54Morning()) return true;
  if(r54Working()) return false;
  if(kind==='sessionEnd' || kind==='debrief') return true;
  if(r54ClockedOut() || opBusyNow()) return false;
  return r54InHours();
}
opHoldBack = function(){ return !r54May('auto'); };
// what he'd have said while you were busy just goes (it doesn't wait for you)
opHeld = function(){};
// the old ways he spoke up on his own: the accountability check-ins, the plan/due-today moments, nudges,
// presses, the question a day, the morning/midday/evening check-ups and the wrap-ups
acctTick = function(){ try{ acctProgressTick(); const a = acct(); if(a.pending){ a.pending = null; persist('focus'); } }catch(e){} };
opDayMoments = function(){};
if(typeof opNudgeDue==='function') opNudgeDue = function(){ return false; };
if(typeof opPressDue==='function') opPressDue = function(){ return false; };
opQuestionDue = function(){ return false; };
if(typeof opAccTick==='function') opAccTick = function(){};
opWrapUp = function(){};
// (goodnight is you going to sleep: that's you starting it)
if(typeof opGoodnight==='function') opGoodnight = (function(base){ return function(){ OPX.userAt = Date.now(); return base.apply(this, arguments); }; })(opGoodnight);
// (the end-of-hours line from the Work alarm becomes his tap-in)
opNotify = (function(base){
  return function(text){
    if(/^That’s the end of your work hours/.test(String(text || ''))) return;
    if(!r54May('auto')) return;
    return base.apply(this, arguments);
  };
})(opNotify);

// ---- 2. his words: different every time ----
function r54Said(){ const f = state.focus; if(!Array.isArray(f.r54Said)) f.r54Said = []; return f.r54Said; }
function r54Remember(t){ const s = r54Said(); s.push({t:String(t).slice(0, 200), at:Date.now()}); if(s.length > 30) s.splice(0, s.length - 30); persist('focus'); }
function r54Opener(t){ return String(t || '').toLowerCase().replace(/[^a-z' ]/g, ' ').trim().split(/\s+/).slice(0, 3).join(' '); }
function r54Fresh(t){ const o = r54Opener(t); return !r54Said().slice(-12).some(function(x){ return r54Opener(x.t)===o || x.t===t; }); }
function r54Pick(pool){ const ok = pool.filter(r54Fresh); return pickOne(ok.length ? ok : pool); }
function r54Name(){ return (state.profile.name || '').split(' ')[0]; }
async function r54Write(ask, pool, facts){
  let line = null;
  if(AI.hasKey!==false && typeof aiWrite==='function'){
    const avoid = r54Said().slice(-10).map(function(x){ return '- '+x.t; }).join('\n');
    try{ line = await Promise.race([aiWrite(ask+'\n\nRules: one or two short spoken sentences. Sound like a person, not an app. Don’t start with his name. Don’t list tasks, don’t bring up what he hasn’t done, don’t ask about his life. Open differently from all of these lines you said recently, and don’t reuse their phrasing:\n'+(avoid || '(none yet)')+(facts ? '\n\nFacts:\n'+facts : ''), {max:120}), new Promise(function(r){ setTimeout(r, 9000); })]); }catch(e){}
    if(line){ line = String(line).replace(/^["“]|["”]$/g, '').trim(); if(!r54Fresh(line)) line = null; }
  }
  return line || r54Pick(pool);
}
function r54Speak(line, listen){
  if(!line) return;
  r54Remember(line);
  OV.cap = 'opBubText'; opBubShow();
  AI.history.push({role:'assistant', content:line}); if(AI.history.length > 16) AI.history = AI.history.slice(-16);
  if(typeof opChatLog==='function') try{ opChatLog('op', line); }catch(e){}
  if(listen) OPX.userAt = Date.now();
  if(opVoiceOn()) opSay(line, {cap:'opBubText', force:true}); else opCaption(line);
  if(listen && typeof opListenWhenDone==='function') opListenWhenDone('opBubText');
}
function r54Free(){ return !AI.busy && !AI.listening && !AI.transcribing && !OV.speaking && !OV.pending && !document.querySelector('.overlay:not(.hidden)'); }

// ---- 3. not working, in your hours: every 2–3 hours, called out ----
function r54Day(){ const f = state.focus, t = todayStr(); if(!f.r54Day || f.r54Day.date!==t) f.r54Day = {date:t}; return f.r54Day; }
function r54OffSince(){
  const d = workDayState(), w = workToday(), start = typeof localTs==='function' && w.start ? localTs(todayStr(), w.start) : 0;
  const lastEnd = arr(state.focus.sessions).filter(function(x){ return x.date===todayStr() && x.endedAt; }).reduce(function(m, x){ return Math.max(m, x.endedAt); }, 0);
  const shot = Number(state.modes && state.modes.lastEndedAt) || 0;
  return Math.max(start, lastEnd, shot, d.clockedInAt || 0, r54Day().calloutAt || 0);
}
const R54_OFF = ['You’ve been off the clock a while now.', 'It’s been a stretch since your last session.', 'Long gap since you last locked in.', 'Haven’t seen a session in a couple of hours.',
  'Been a minute since you were in it.', 'That’s a long break you’re on.', 'You’ve been away from the work for a good while.', 'Quiet couple of hours on the work side.',
  'No session since a while back. Just saying.', 'Two hours and change since you were locked in.', 'It’s been a hot minute since the last session.', 'Long time, no focus session.',
  'Checking in: it’s been a while since you worked.', 'Some time’s gone by since your last block.', 'Haven’t clocked a block in a bit.', 'Feels like it’s been a while since you were in the zone.'];
function r54CalloutTick(){
  if(!state || !state.focus || !opOn() || !r54InHours() || r54Working() || r54ClockedOut() || opBusyNow() || !r54Free()) return;
  if(state.profile.opCallouts===false) return;
  const d = r54Day(); if(!d.gap) { d.gap = 120 + Math.round(Math.random()*60); persist('focus'); }
  const off = (Date.now() - r54OffSince())/60000; if(off < d.gap) return;
  d.calloutAt = Date.now(); d.gap = 120 + Math.round(Math.random()*60); d.n = (d.n || 0) + 1; persist('focus');
  const h = off >= 90 ? (Math.round(off/30)/2)+' hours' : Math.round(off)+' minutes';
  r54Write('He’s in his work hours but hasn’t been working (no focus session) for about '+h+'. Call that out, plainly, in your own words. You can be dry or warm; it’s '+fmt12Hour(nowHM())+'. Don’t tell him what to do next and don’t ask how he’s doing.', R54_OFF, 'Off for about '+h+'. Sessions today: '+arr(state.focus.sessions).filter(function(x){ return x.date===todayStr(); }).length+'.').then(function(line){ if(r54Free() && !r54Working()) r54Speak(line, false); });
}
setInterval(function(){ try{ r54CalloutTick(); }catch(e){} }, 60000);

// ---- 4. the end of your work hours: he taps in, once ----
const R54_END = ['That’s your hours. How’d today feel?', 'Work hours are up. Talk to me.', 'And that’s the clock. What’s on your mind?', 'End of the work day. How’d it go?', 'Hours are done. You good?', 'That’s time on the work day. Anything you want to get out?', 'Day’s hours are in. What’s the word?'];
function r54EndTick(){
  if(!state || !state.focus || !opOn() || typeof workToday!=='function') return;
  const w = workToday(); if(!w.enabled || !workDayToday()) return;
  const e = hmMin(w.end), m = nowMin(), d = r54Day(); if(e==null || d.endAt || m < e || m > e + 180) return;
  if(r54ClockedOut()){ d.endAt = Date.now(); persist('focus'); return; }
  if(r54Working() || !r54Free()) return;
  d.endAt = Date.now(); persist('focus');
  r54Write('His work hours just ended. Tap in with one short opener and let him take it from there. No recap, no list, no advice.', R54_END).then(function(line){ r54Speak(line, true); });
}
setInterval(function(){ try{ r54EndTick(); }catch(e){} }, 30000);

// ---- 5. a work session ends after hours: one line, right then ----
const R54_DONE = ['That’s a wrap on that one.', 'Session done. Nice.', 'Good block.', 'And that’s that session in the books.', 'Solid. Done for that one.', 'There it is. Session closed.'];
(function(){
  let was = null;
  setInterval(function(){
    try{
      const s = state && state.focus && state.focus.activeSession;
      if(was && !s && opOn() && !r54InHours() && !r54ClockedOut() && !AI.busy && !OV.speaking){
        const mins = Math.round((Date.now() - was)/60000);
        r54Write('He just ended a '+mins+'-minute work session, after his work hours. One line about it, then leave him be.', R54_DONE).then(function(line){ r54Speak(line, false); });
      }
      was = s ? s.startedAt : null;
    }catch(e){}
  }, 3000);
})();

// ---- 6. the debrief: after a shoot, or a meeting with a client ----
// He asks how it went. What you tell him that's worth keeping (what got shot or decided, next steps, anything
// notable) goes in that client's journal. The whole back-and-forth isn't saved.
const R54_DEBRIEF = {shoot:['How’d the shoot go?', 'Shoot’s done. How was it?', 'So, the shoot. How’d it turn out?', 'Back from shooting. What’d you get?'], meet:['How’d the meeting go?', 'How was the call?', 'So, how’d that go?', 'Meeting’s done. Anything come out of it?']};
function r54Who(id){ id = String(id || ''); if(!id) return null; if(id.indexOf('lead:')===0){ const l = crmFind('lead', id.slice(5)); return l ? {kind:'lead', x:l} : null; } const c = crmFind('client', id); if(c) return {kind:'client', x:c}; const l = crmFind('lead', id); return l ? {kind:'lead', x:l} : null; }
function r54DebriefAsk(kind, clientId, what){
  if(!opOn()) return;
  const w = r54Who(clientId), c = w && w.x, who = c ? (c.business || c.name || c.company) : '';
  R54.debrief = {kind:kind, clientId:clientId || null, what:what || '', at:Date.now(), n:0};
  const pool = R54_DEBRIEF[kind==='shoot' ? 'shoot' : 'meet'].map(function(l){ return who ? l.replace(/(shoot|meeting|call)(?= go| was| turn| done)/, '$1 with '+who) : l; });
  r54Write('He just finished '+(kind==='shoot' ? 'a shoot' : 'a meeting')+(who ? ' with '+who : '')+(what ? ' ('+what+')' : '')+'. Ask him how it went, in one short line.', pool).then(function(line){ r54Speak(line, true); });
}
// (shooting mode ends)
finishActiveMode = (function(base){
  return function(){
    const a = state.modes.active, r = base.apply(this, arguments);
    if(a && a.type==='shooting' && Date.now() - a.startedAt > 10*60000){
      const ev = a.eventId ? arr(state.calendar.events).find(function(x){ return x.id===a.eventId; }) : null;
      const cid = (ev && ev.linkedClient) || a.clientId || null;
      setTimeout(function(){ if(!r54Working()) r54DebriefAsk('shoot', cid, ev ? ev.title : a.note); }, 90000);
    }
    return r;
  };
})(finishActiveMode);
// (a calendar event with a client: about an hour after it started)
function r54MeetTick(){
  if(!state || !state.calendar || !opOn() || r54Working() || !r54Free()) return;
  const t = todayStr(), m = nowMin();
  const ev = arr(state.calendar.events).find(function(e){
    if(e.date!==t || !e.time || !e.linkedClient || e.isShoot || e.r54Asked) return false;
    const s = hmMin(e.time); return s!=null && m >= s + 60 && m <= s + 240;
  });
  if(!ev) return;
  ev.r54Asked = true; persist('calendar');
  r54DebriefAsk('meet', ev.linkedClient, ev.title);
}
setInterval(function(){ try{ r54MeetTick(); }catch(e){} }, 60000);
// what he hears back goes to the client's journal (only what's worth keeping)
function r54File(text){
  const D = R54.debrief; if(!D || Date.now() - D.at > 20*60000 || D.n >= 3) return;
  D.n++;
  const save = function(who, note){
    note = String(note || '').trim(); if(!note || /^none\.?$/i.test(note)) return;
    const hit = who ? (r54Who(who) || opFindContact(who)) : null;
    if(!hit){ return; }
    if(hit.kind==='client'){ if(!Array.isArray(hit.x.journal)) hit.x.journal = []; hit.x.journal.push({id:uid(), date:todayStr(), text:note, createdAt:new Date().toISOString(), by:'op', kind:'debrief'}); }
    else hit.x.notes = (hit.x.notes ? hit.x.notes+'\n' : '')+todayStr()+': '+note;
    if(typeof crmTimeline==='function') crmTimeline(hit.x, 'note', 'Op noted: '+note.slice(0, 120));
    persist('business'); if(document.getElementById('contactOverlay') && typeof rerenderContactModal==='function') rerenderContactModal();
  };
  if(AI.hasKey===false || typeof aiWrite!=='function'){ if(D.clientId) save(D.clientId, text); return; }
  const W = r54Who(D.clientId), who = W ? crmName(W.kind, W.x) : '';
  aiWrite('He just told you this about '+(D.kind==='shoot' ? 'a shoot' : 'a meeting')+(who ? ' with '+who : '')+(D.what ? ' ('+D.what+')' : '')+':\n"'+text+'"\n\nWrite the note for the client’s record: only what’s worth keeping later (what was shot or decided, next steps, how the client felt, anything notable), in a few short plain lines. Leave out small talk. Reply with JSON only: {"client": "'+(who || 'the client’s name, or null')+'", "note": "… or NONE"}', {max:260}).then(function(t){
    const m = /\{[\s\S]*\}/.exec(String(t || '')); if(!m) return;
    let j = null; try{ j = JSON.parse(m[0]); }catch(e){ return; }
    save(D.clientId || j.client, j.note);
  }).catch(function(){});
}

// ---- 7. one answer per message; no live conversation ----
// Live conversation is gone: one brain (Anthropic) and the voice you picked. The same words are never answered
// twice, a new message never starts while he's still answering one, and the mic only opens on its own once in a
// row (so background noise can't keep him going).
opLiveOn = function(){ return false; };
OPRT.start = async function(){ return false; };
setTimeout(function(){ try{ if(state.settings.opLive){ state.settings.opLive = false; persist('settings'); } }catch(e){} }, 0);
function r54Norm(t){ return String(t || '').toLowerCase().replace(/[^a-z0-9 ]/g, ' ').replace(/\s+/g, ' ').trim(); }
aiAsk = (function(base){
  return function(text, cap){
    const t = String(text || '').trim(); if(!t) return;
    const k = r54Norm(t), typed = Date.now() - Math.max(AI.typedAt || 0, OP1.inputAt || 0) < 4000;
    if(R54.last && R54.last.k===k && Date.now() - R54.last.at < 30000) return;
    if(R54.last && Date.now() - R54.last.at < 20000 && !typed && r51Same(t, R54.last.t)) return;
    if(AI.busy && !typed) return;
    R54.last = {k:k, t:t, at:Date.now()};
    OPX.userAt = Date.now();
    if(!R54.auto) R54.autoLeft = 1;   // you started this one: he may open the mic once after
    R54.auto = false;
    const D = R54.debrief, filing = D && Date.now() - D.at < 20*60000;
    const r = base.apply(this, arguments);
    if(filing) r54File(t);
    return r;
  };
})(aiAsk);
aiAutoListen = (function(base){
  return function(){
    if(R54.autoLeft <= 0) return;
    const was = AI.listening, r = base.apply(this, arguments);
    if(!was && AI.listening){ R54.autoLeft--; R54.auto = true; r54Blip('on'); }
    return r;
  };
})(aiAutoListen);
// the same line is never spoken twice in a row
opSay = (function(base){
  return function(text){
    const k = r54Norm(text);
    if(k && R54.spoke && R54.spoke.k===k && Date.now() - R54.spoke.at < 20000) return Promise.resolve(false);
    R54.spoke = {k:k, at:Date.now()};
    return base.apply(this, arguments);
  };
})(opSay);
// how he talks when you're talking to him
aiSystem = (function(base){
  return function(){
    const s = base.apply(this, arguments);
    if(Array.isArray(s)){
      const recent = r54Said().slice(-8).map(function(x){ return '- '+x.t; }).join('\n');
      const D = R54.debrief, deb = D && Date.now() - D.at < 20*60000 ? '\n- You just asked him how '+(D.kind==='shoot' ? 'the shoot' : 'the meeting')+' went. Listen, react like a person, and ask at most one thing about next steps. The app files the useful parts in the client’s journal; don’t call add_client_note for it.' : '';
      s.push({type:'text', text:'How you sound (this overrides anything above):\n- Don’t open with his name, and don’t open two replies the same way.\n- Don’t remind him of open tasks unless he asks, or unless one really matters to what he’s saying right now; never the same task twice in a day.\n- No lectures, no stakes speeches, no “you still have…”.\n- Lines you said recently (don’t repeat their openings or phrasing):\n'+(recent || '(none)')+deb});
    }
    return s;
  };
})(aiSystem);

// ---- 8. talking to him: one key (or "Hey Operator"), on and off ----
// Press the key: a sound, the bars move with your voice, and he's listening. Press again, or stop talking for a
// few seconds, and it goes. In the Mac app the key works anywhere, even when Operator isn't in front.
opTalkMode = function(){ return 'free'; };   // (the old hold-to-talk handlers stay out of it)
function r54KeyOn(){ return state.profile.opKeyOn!==false; }
function r54Blip(kind){
  try{
    const ctx = getAudioCtx(), t0 = ctx.currentTime, o = ctx.createOscillator(), g = ctx.createGain();
    o.type = 'sine'; o.connect(g); g.connect(ctx.destination);
    const f = kind==='on' ? [660, 990] : kind==='send' ? [880, 590] : [440, 330];
    o.frequency.setValueAtTime(f[0], t0); o.frequency.exponentialRampToValueAtTime(f[1], t0 + 0.12);
    g.gain.setValueAtTime(0.0001, t0); g.gain.exponentialRampToValueAtTime(0.16, t0 + 0.015); g.gain.exponentialRampToValueAtTime(0.0001, t0 + 0.16);
    o.start(t0); o.stop(t0 + 0.18);
  }catch(e){}
}
function r54TalkToggle(){
  if(!opOn()){ showToast('Op is off. Turn him on in Settings → Op.', {icon:'&#129302;'}); return; }
  if(AI.listening){ r54Blip('send'); if(AI.sendNow) AI.sendNow(); return; }
  if(AI.transcribing || AI.busy){ r54Blip('off'); return; }
  if(OV.speaking || OV.pending){ try{ opStop(); }catch(e){} OV.userCut = true; }
  OPX.userAt = Date.now(); R54.autoLeft = 1; AI.closedAt = 0;
  OV.cap = 'opBubText'; opBubShow();
  const go = function(){ r54Blip('on'); aiListen('opBubText'); };
  if(OPAPP && typeof SCR!=='undefined' && SCR.on!==true){ try{ scribeCheck(); }catch(e){} setTimeout(go, 900); }
  else go();
}
// (the bars: your voice moves them, quiet or loud)
(function(){
  let raw = 0;
  try{ Object.defineProperty(SCR, 'level', {configurable:true, get:function(){ if(raw <= 0) return 0; const db = 20*Math.log10(raw); return Math.max(0, Math.min(1, (db + 58)/40))/14; }, set:function(v){ raw = Number(v) || 0; }}); }catch(e){}
})();
// the key, inside the page (the Mac app takes it over everywhere once it can)
document.addEventListener('keydown', function(e){
  if(!r54KeyOn() || window.__opGlobalKey || e.code!==opPttKey() || e.repeat) return;
  R54.keyDown = {code:e.code, other:false};
}, true);
document.addEventListener('keydown', function(e){ if(R54.keyDown && e.code!==R54.keyDown.code) R54.keyDown.other = true; }, true);
document.addEventListener('keyup', function(e){
  const k = R54.keyDown; if(!k || e.code!==k.code) return; R54.keyDown = null;
  if(!k.other){ e.preventDefault(); r54TalkToggle(); }
}, true);
// his light: a tap is the same toggle
ACTIONS.opLightTap = (function(base){
  return function(){
    if(!opOn() || opBusyNow()) return base.apply(this, arguments);
    r54TalkToggle();
  };
})(ACTIONS.opLightTap);
ACTIONS.opTalk = function(){ r54TalkToggle(); };
opPttDown = function(){}; opPttUp = function(){};
// tell the Mac app which key, and whether it's on
function r54TalkPrefs(){ try{ if(OPAPP && OPAPP.talkPrefs) OPAPP.talkPrefs({on:r54KeyOn() && opOn(), key:opPttKey()}); }catch(e){} }
setTimeout(r54TalkPrefs, 1200);
// (the menu bar says when he's listening, so you know even with the window away)
(function(){ let was = false; setInterval(function(){ const now = !!(AI.listening || AI.transcribing); if(now!==was){ was = now; try{ if(r46StatusFn) r46StatusFn(); }catch(e){} } }, 250); })();

// ---- "Hey Operator" in the Mac app ----
// Chrome's speech recognition doesn't exist in the app, so the app listens for short bursts of speech and
// asks ElevenLabs if one was "Hey Operator". Only bursts of a second or two are sent, never while he talks or
// while the mic is already open.
const R54H = {on:false, stream:null, ctx:null, an:null, buf:null, rec:null, t:null, busy:false, lastAt:0};
function r54HeyWanted(){ return !!OPAPP && state.profile.heyOp===true && opOn() && typeof SCR!=='undefined' && SCR.on===true; }
async function r54HeyStart(){
  if(R54H.on || !r54HeyWanted()) return;
  R54H.on = true;
  try{ R54H.stream = await navigator.mediaDevices.getUserMedia({audio:{echoCancellation:true, noiseSuppression:true, autoGainControl:true, channelCount:1}}); }
  catch(e){ R54H.on = false; return; }
  const ctx = new (window.AudioContext || window.webkitAudioContext)(), an = ctx.createAnalyser(); an.fftSize = 1024;
  ctx.createMediaStreamSource(R54H.stream).connect(an);
  R54H.ctx = ctx; R54H.an = an; R54H.buf = new Float32Array(an.fftSize);
  let floor = 0.006, loudAt = 0, startAt = 0, chunks = [];
  const mime = MediaRecorder.isTypeSupported('audio/webm;codecs=opus') ? 'audio/webm;codecs=opus' : 'audio/webm';
  R54H.t = setInterval(function(){
    if(!r54HeyWanted()){ r54HeyStop(); return; }
    const quiet = AI.listening || AI.busy || AI.transcribing || OV.speaking || OV.pending;
    an.getFloatTimeDomainData(R54H.buf); let s = 0; for(let i = 0; i < R54H.buf.length; i++) s += R54H.buf[i]*R54H.buf[i]; const rms = Math.sqrt(s/R54H.buf.length);
    if(!R54H.rec) floor = floor*0.97 + Math.min(rms, 0.05)*0.03;
    const loud = rms > Math.max(0.018, floor*3);
    if(quiet){ if(R54H.rec){ try{ R54H.rec.onstop = null; R54H.rec.stop(); }catch(e){} R54H.rec = null; } return; }
    if(!R54H.rec && loud && !R54H.busy && Date.now() - R54H.lastAt > 1500){
      chunks = []; startAt = Date.now(); loudAt = Date.now();
      const rec = new MediaRecorder(R54H.stream, {mimeType:mime}); R54H.rec = rec;
      rec.ondataavailable = function(e){ if(e.data && e.data.size) chunks.push(e.data); };
      rec.onstop = function(){
        const len = Date.now() - startAt; R54H.rec = null;
        if(len < 450 || len > 4200) return;
        R54H.busy = true; R54H.lastAt = Date.now();
        scribeText(new Blob(chunks, {type:mime}), mime).then(function(text){
          const m = /\b(?:hey|hi|okay|ok|yo|a)?[\s,]*operator\b[\s,.!?]*(.*)$/i.exec(String(text || ''));
          if(!m) return;
          const rest = m[1].trim();
          OPX.userAt = Date.now();
          if(rest.split(/\s+/).length >= 3){ OV.cap = 'opBubText'; opBubShow(); r54Blip('send'); aiAsk(rest, 'opBubText'); }
          else r54TalkToggle();
        }).catch(function(){}).finally(function(){ R54H.busy = false; });
      };
      rec.start(200);
    }
    if(R54H.rec){ if(loud) loudAt = Date.now(); if(Date.now() - loudAt > 650 || Date.now() - startAt > 4000){ try{ R54H.rec.stop(); }catch(e){ R54H.rec = null; } } }
  }, 60);
}
function r54HeyStop(){
  clearInterval(R54H.t); R54H.t = null;
  try{ if(R54H.rec){ R54H.rec.onstop = null; R54H.rec.stop(); } }catch(e){} R54H.rec = null;
  try{ R54H.stream && R54H.stream.getTracks().forEach(function(t){ t.stop(); }); }catch(e){}
  try{ R54H.ctx && R54H.ctx.close(); }catch(e){}
  R54H.stream = R54H.ctx = R54H.an = null; R54H.on = false;
}
setInterval(function(){ try{ if(r54HeyWanted()) r54HeyStart(); else if(R54H.on) r54HeyStop(); }catch(e){} }, 3000);

// ---- Settings → Op: the rows, simple ----
r51OpRowsHtml = function(){
  const keys = '<div class="r51-sub"><div class="seg-tabs seg-sm">'+Object.keys(OP_PTT_KEYS).map(function(k){ return r51Seg('opPttKeySet', opPttKey(), k, OP_PTT_KEYS[k]); }).join('')+'</div></div>';
  const busy = opBusyNow() ? '<div class="r51-row r51-busyrow"><span class="r45-busy">Quiet until '+fmtTimeShort(state.focus.opBusyUntil)+'</span> <button class="btn btn-ghost btn-sm" data-action="opBusyEnd">Bring him back</button></div>' : '';
  return '<div class="r51-rows">'+busy+
    r51Row('Talk key', r51Sw(r54KeyOn(), 'r54KeyToggle'), r54KeyOn() ? keys : '')+
    r51Row('“Hey Operator”', OPAPP ? r51Sw(state.profile.heyOp===true, 'r54HeyToggle') : '<label class="ws-switch"><input type="checkbox" data-action="heyOpToggle" '+(state.profile.heyOp!==false ? 'checked' : '')+'><span></span></label>')+
    r51Row('Calls out long breaks', r51Sw(state.profile.opCallouts!==false, 'r54CalloutToggle'))+
  '</div>';
};
ACTIONS.r54KeyToggle = function(){ state.profile.opKeyOn = !r54KeyOn(); persist('profile'); r54TalkPrefs(); renderView(); };
ACTIONS.r54HeyToggle = function(){ state.profile.heyOp = state.profile.heyOp!==true; persist('profile'); renderView(); if(state.profile.heyOp && SCR.on!==true) showToast('“Hey Operator” needs your ElevenLabs key (Connections & data → Op’s voice).', {icon:'&#127908;'}); };
ACTIONS.r54CalloutToggle = function(){ state.profile.opCallouts = state.profile.opCallouts===false; persist('profile'); renderView(); };
ACTIONS.opPttKeySet = (function(base){ return function(){ const r = base ? base.apply(this, arguments) : null; r54TalkPrefs(); return r; }; })(ACTIONS.opPttKeySet);
ACTIONS.opPower = (function(base){ return function(){ const r = base.apply(this, arguments); r54TalkPrefs(); return r; }; })(ACTIONS.opPower);

// ============ LEADS ============
// A lead you've never reached out to is due right away; after that, every X days (2 by default, or what you
// set for that lead). The Log center has its own Leads part (separate from clients); the Reach out to leads
// task opens it.
crmNextDue = (function(base){
  return function(kind, x){
    if(kind==='lead' && x && !(x.followUp && x.followUp.date) && !crmLastTouch('lead', x)) return x.createdAt && x.createdAt < todayStr() ? x.createdAt : todayStr();
    return base.apply(this, arguments);
  };
})(crmNextDue);
setTimeout(function(){ try{ const cm = crm(); if(!cm.r54Lead){ cm.leadCadenceDays = 2; cm.r54Lead = true; persist('business'); } }catch(e){} }, 0);
function r54LeadRows(){
  return arr(state.business.pipeline).filter(leadIsOpen).map(function(l){
    const n = crmOverdueDays('lead', l), last = crmLastTouch('lead', l), st = crmStage('lead', l.stage);
    const tp = arr(l.touchpoints).slice().sort(function(a, b){ return (b.ts || 0) - (a.ts || 0); })[0];
    return {l:l, n:n, last:last, st:st, tp:tp, due:n!=null && n >= 0};
  }).sort(function(a, b){ return (b.n==null ? -99 : b.n) - (a.n==null ? -99 : a.n); });
}
function r54LeadsHtml(){
  const rows = r54LeadRows(), due = rows.filter(function(x){ return x.due; }), ok = rows.filter(function(x){ return !x.due; });
  const def = crm().leadCadenceDays || 2;
  const row = function(x){
    const l = x.l, today = x.last===todayStr(), cad = Number(l.cadenceDays) || def;
    const lastTxt = x.last ? (x.tp ? touchTypeById(x.tp.type).label+' · ' : '')+(today ? 'today' : daysAgoFrom(x.last)+'d ago') : 'Never';
    return '<div class="lc-row r54-lr'+(x.due ? ' is-due' : '')+'" data-key="lcl-'+l.id+'">'+
      '<span class="lc-av" style="background:'+(x.st ? x.st.color : '#8A90A2')+'">'+escapeHtml(String(crmName('lead', l) || '?').trim().slice(0, 1).toUpperCase())+'</span>'+
      '<span class="lc-who" data-action="openContact" data-kind="lead" data-id="'+l.id+'"><b>'+escapeHtml(crmName('lead', l))+'</b><small>'+escapeHtml(x.st ? x.st.label : '')+(Number(l.value) ? ' · '+money(l.value) : '')+'</small></span>'+
      '<span class="lc-last"><small>Last touch</small><b>'+lastTxt+'</b></span>'+
      '<span class="lc-due crm-due '+overdueLevel(x.n)+'">'+(today ? 'Logged today &#10003;' : !x.last ? 'Never reached out' : dueLabel(x.n, 'lead', l))+'</span>'+
      '<select class="input input-sm r54-cad" data-crm-cadence="lead:'+l.id+'" title="How often to reach out">'+[1, 2, 3, 4, 5, 7, 10, 14, 21, 30].map(function(d){ return '<option value="'+d+'"'+(cad===d ? ' selected' : '')+'>every '+(d===1 ? 'day' : d===7 ? 'week' : d+' days')+'</option>'; }).join('')+'</select>'+
      '<span class="lc-btns">'+TOUCH_TYPES.map(function(t){ return '<button class="lc-b" data-action="logTouchType" data-kind="lead" data-id="'+l.id+'" data-type="'+t.id+'" title="Log a '+t.label.toLowerCase()+'">'+t.icon+'<span>'+t.label+'</span></button>'; }).join('')+'</span>'+
    '</div>';
  };
  return '<div class="lc-k r54-lk"><span class="'+(due.length ? 'is-due' : 'is-ok')+'"><b>'+due.length+'</b> to reach out to</span><span><b>'+ok.length+'</b> in touch</span></div>'+
    (rows.length ? '' : '<div class="empty">No open leads.</div>')+
    (due.length ? '<div class="lc-sec">Reach out now</div>'+due.map(row).join('') : (rows.length ? '<div class="lc-clear">&#10003; Every lead’s been reached. Nothing to log right now.</div>' : ''))+
    (ok.length ? '<div class="lc-sec">In touch</div><div class="lc-ok">'+ok.map(row).join('')+'</div>' : '');
}
logCenterHtml = (function(base){
  return function(){
    const who = ui.r54Lc==='leads' ? 'leads' : 'clients', nL = r54LeadRows().filter(function(x){ return x.due; }).length;
    const top = '<div class="r54-lcw"><button class="'+(who==='clients' ? 'is-on' : '')+'" data-action="r54Lc" data-id="clients">Clients</button><button class="'+(who==='leads' ? 'is-on' : '')+'" data-action="r54Lc" data-id="leads">Leads'+(nL ? ' <span class="lc-badge">'+nL+'</span>' : '')+'</button></div>';
    if(who==='leads') return '<div class="lc r54-lcl">'+top+r54LeadsHtml()+'</div>';
    return base.apply(this, arguments).replace('<div class="lc">', '<div class="lc">'+top);
  };
})(logCenterHtml);
ACTIONS.r54Lc = function(el, e, id){ ui.r54Lc = id==='leads' ? 'leads' : 'clients'; playTick(); renderView(); };
ACTIONS.r54OpenLeads = function(el, e){ if(e && e.stopPropagation) e.stopPropagation(); ui.r54Lc = 'leads'; ui.view = 'business'; ui.businessTab = 'log'; renderView(); };
// the task: never-contacted leads count; tapping it opens the Leads part; a touch takes a lead off
r53LeadsDue = function(){ return r54LeadRows().filter(function(r){ return r.due; }).map(function(r){ return {x:r.l, n:r.n}; }); };
taskCard = (function(base){
  return function(t){
    let h = base.apply(this, arguments);
    if(t && t.master && t.master.kind==='reachLeads'){
      h = h.replace(/data-action="[^"]*"/, 'data-action="r54OpenLeads"').replace('data-action="openLogCenter">Log center', 'data-action="r54OpenLeads">Log center');
    }
    return h;
  };
})(taskCard);
openTaskEditModal = (function(base){ return function(id){ const t = state.tasks.items.find(function(x){ return x.id===id; }); if(t && t.master && t.master.kind==='reachLeads'){ ACTIONS.r54OpenLeads(); return; } return base.apply(this, arguments); }; })(openTaskEditModal);
// (done on the card = a touch for each one left, as before; logging touches one by one also clears it)

// ============ CLIENT LIFECYCLE ============
// A cycle is your steps; each step has its own tasks (or none) that have to be done to move on. Every client on
// a step gets those tasks, tagged with them, in the lifecycle colour. When a step's tasks are done the client
// moves to the next step on their own; a step with nothing to do can move on after a number of days you set.
// A task can be due a number of days into the step, or repeat every week / every month (a repeating task
// shows up each time and goes red when late, but never holds a client back, since it's never "finished").
// Finish a cycle and the client can roll into another one ("When finished, move to"), like First month into
// Regular. Move a client yourself: forward checks off what was left; back puts that step's tasks back.
var R54_LC = true;
function r54IsRep(it){ return it && (it.repeat==='week' || it.repeat==='month'); }
function r54Once(st){ return arr(st && st.checklist).filter(function(it){ return !r54IsRep(it); }); }
function r54StepDue(c, st, it){
  if(it.dueDays==null || it.dueDays==='') return null;
  const at = c.lifecycle && c.lifecycle.enteredAt && c.lifecycle.enteredAt[st.id];
  return addDays(at ? todayStr(new Date(at)) : todayStr(), Math.max(0, Number(it.dueDays) || 0));
}
function r54RepPeriod(c, it){
  if(it.repeat==='month'){ const cy = dvwCycle(c), dom = Number(it.dueDom) || 0; return {key:cy.start, due:dom ? (addDays(cy.start, dom - 1) > cy.end ? cy.end : addDays(cy.start, dom - 1)) : cy.end}; }
  const wk = thisWeekKey(), dow = it.dueDow==null || it.dueDow==='' ? 5 : Number(it.dueDow);
  return {key:wk, due:addDays(wk, (dow + 6) % 7)};
}
function r54LcCheck(c, st, it, on){
  ensureLifecycle(c);
  const list = c.lifecycle.checks[st.id] || (c.lifecycle.checks[st.id] = []), i = list.indexOf(it.id);
  if(on && i < 0) list.push(it.id); if(!on && i >= 0) list.splice(i, 1);
}
function r54Advance(c){
  const cy = clientCycle(c); if(!cy) return false;
  const idx = cycleStepIndex(c), next = idx >= 0 && idx < cy.steps.length - 1 ? cy.steps[idx + 1] : null;
  if(next){ setClientStep(c, next.id, {quiet:true}); showToast(crmName('client', c)+' moved to '+next.label+' ('+cy.name+')', {icon:'&#9654;'}); return true; }
  const to = cy.next && cy.next!==cy.id ? cycleById(cy.next) : null;
  if(to){ crmTimeline(c, 'stage', 'Finished cycle: '+cy.name); c.lifecycle.lastStep[to.id] = to.steps.length ? to.steps[0].id : null; assignCycle(c, to.id); showToast(crmName('client', c)+' finished '+cy.name+' and moved to '+to.name, {icon:'&#127881;'}); return true; }
  if(!c.cycleDone){ finishCycle(c); return true; }
  return false;
}
// putting clients on cycles: new clients start on the one marked "Default for new clients"; the clients you had
// when this came in go on the cycle that one finishes into (or the one you pick in the cycle editor)
function r54Place(){
  const cm = crm(); let ch = false;
  if(!cm.r54Known){ cm.r54Known = arr(state.business.clients).map(function(c){ return c.id; }); cm.r54Pending = arr(state.business.clients).filter(function(c){ return clientStageActive(c.stage) && !c.cycleId; }).map(function(c){ return c.id; }); ch = true; }
  const def = cycleById(cm.defaultCycleId), after = def && def.next ? cycleById(def.next) : null;
  if(after && arr(cm.r54Pending).length){ cm.r54Pending.forEach(function(id){ const c = crmFind('client', id); if(c && !c.cycleId){ assignCycle(c, after.id); } }); cm.r54Pending = []; ch = true; }
  arr(state.business.clients).forEach(function(c){
    if(cm.r54Known.indexOf(c.id) >= 0) return;
    cm.r54Known.push(c.id); ch = true;
    if(!c.cycleId && def && clientStageActive(c.stage) || (!c.cycleId && def && c.stage==='onboarding')) assignCycle(c, def.id);
  });
  return ch;
}
function r54LcSync(){
  const today = todayStr(), made = mtStore(); let changed = false;
  if(r54Place()) changed = true;
  const keep = {};
  arr(state.business.clients).forEach(function(c){
    const cy = clientCycle(c); if(!cy || !clientStageActive(c.stage) && c.stage!=='onboarding') return;
    ensureLifecycle(c);
    // moving on (a few at most, for steps that are already done)
    for(let i = 0; i < 4 && !c.cycleDone; i++){
      const st = clientStep(c); if(!st) break;
      const once = r54Once(st);
      const ready = once.length ? once.every(function(it){ return lcItemDone(c, st, it); }) : (Number(st.autoDays) > 0 && c.lifecycle.enteredAt[st.id] && Date.now() - c.lifecycle.enteredAt[st.id] >= Number(st.autoDays)*86400000);
      if(!ready || !r54Advance(c)) break;
      changed = true;
    }
    const cy2 = clientCycle(c), st = cy2 ? (c.cycleDone ? cy2.steps[cy2.steps.length - 1] : clientStep(c)) : null; if(!st) return;
    // this step's one-time tasks
    if(!c.cycleDone) r54Once(st).forEach(function(it){
      const ref = lcRef(c, st, it); keep[ref] = 1;
      const open = state.tasks.items.find(function(t){ return t.lifecycleRef===ref && t.status!=='done'; });
      if(lcItemDone(c, st, it)){ if(open){ open.status = 'done'; open.completedAt = today; changed = true; } return; }
      if(open){ const d = r54StepDue(c, st, it); if(open.deadline!==d){ open.deadline = d; changed = true; } if(open.status==='backlog' && d && addDays(today, 1) >= d){ open.status = 'today'; changed = true; } return; }
      const d = r54StepDue(c, st, it);
      state.tasks.items.push({id:uid(), title:it.text, client:c.id, clients:[c.id], priority:'med', deadline:d, notes:'', status:d && addDays(today, 1) >= d ? 'today' : 'backlog', createdAt:today, completedAt:null,
        lifecycleRef:ref, master:{kind:'lc', clientId:c.id, cycleId:cy2.id, stepId:st.id, itemId:it.id, step:st.label, cycle:cy2.name}});
      changed = true;
    });
    // this step's repeating tasks
    arr(st.checklist).filter(r54IsRep).forEach(function(it){
      const p = r54RepPeriod(c, it), key = 'lcrep:'+c.id+':'+it.id+':'+p.key; keep[key] = 1;
      if(made[key]) return;
      made[key] = 1; changed = true;
      state.tasks.items.push({id:uid(), title:it.text, client:c.id, clients:[c.id], priority:'med', deadline:p.due, notes:'', status:addDays(today, 1) >= p.due ? 'today' : 'backlog', createdAt:today, completedAt:null,
        master:{kind:'lcrep', clientId:c.id, itemId:it.id, stepId:st.id, period:p.key, every:it.repeat, step:st.label, cycle:cy2.name}});
    });
  });
  // tasks for steps a client isn't on any more go (open ones only); late repeats move to Today, and a week past due they're on the record as missed
  const before = state.tasks.items.length;
  state.tasks.items = state.tasks.items.filter(function(t){
    const m = t.master; if(!m || t.status==='done') return true;
    if(m.kind==='lc') return !!keep[t.lifecycleRef];
    if(m.kind==='lcrep'){ const c = crmFind('client', m.clientId), cy = c && clientCycle(c), st = cy && (c.cycleDone ? cy.steps[cy.steps.length - 1] : clientStep(c)), ok = !!(st && arr(st.checklist).some(function(it){ return it.id===m.itemId && r54IsRep(it); })); if(!ok) delete made['lcrep:'+m.clientId+':'+m.itemId+':'+m.period]; return ok; }
    return true;
  });
  if(state.tasks.items.length!==before) changed = true;
  state.tasks.items.forEach(function(t){
    const m = t.master; if(!m || m.kind!=='lcrep' || t.status==='done') return;
    if(t.status==='backlog' && t.deadline && addDays(today, 1) >= t.deadline){ t.status = 'today'; changed = true; }
    if(t.deadline && addDays(t.deadline, 7) < today){ t.status = 'done'; t.completedAt = t.deadline; t.missed = true; changed = true; }
  });
  return changed;
}
masterTasksSync = (function(base){
  return function(){
    const r = base.apply(this, arguments);
    if(mt38Busy || !state || !state.tasks || !state.business) return r;
    mt38Busy = true;
    try{ if(r54LcSync()){ persist('tasks'); persist('business'); persist('focus'); setTimeout(function(){ try{ renderView(); }catch(e){} }, 0); } }
    finally { mt38Busy = false; }
    return r;
  };
})(masterTasksSync);
// a lifecycle task done (or undone) on the task list is the item checked (or unchecked) on the client
completeTask = (function(base){
  return function(id){
    const r = base.apply(this, arguments);
    const t = state.tasks.items.find(function(x){ return x.id===id; });
    if(t && t.master && t.master.kind==='lc') setTimeout(function(){ try{ masterTasksSync(); }catch(e){} }, 1100);
    return r;
  };
})(completeTask);
// moving a client yourself
ACTIONS.lcGoStep = (function(base){
  return function(el){
    const c = crmFind('client', el.dataset.id), cy = c && clientCycle(c);
    if(c && cy){
      const from = c.cycleDone ? cy.steps.length : cycleStepIndex(c), to = cy.steps.findIndex(function(s){ return s.id===el.dataset.step; }), today = todayStr();
      if(to > from && from >= 0){
        for(let i = from; i < to; i++){ const st = cy.steps[i]; r54Once(st).forEach(function(it){ r54LcCheck(c, st, it, true); state.tasks.items.forEach(function(t){ if(t.lifecycleRef===lcRef(c, st, it) && t.status!=='done'){ t.status = 'done'; t.completedAt = today; } }); }); }
      } else if(to >= 0 && to < from){
        const st = cy.steps[to];
        r54Once(st).forEach(function(it){ r54LcCheck(c, st, it, false); state.tasks.items.forEach(function(t){ if(t.lifecycleRef===lcRef(c, st, it) && t.status==='done'){ t.status = 'backlog'; t.completedAt = null; } }); });
        c.r54Back = st.id;
      }
      persist('tasks');
    }
    const r = base.apply(this, arguments);
    try{ masterTasksSync(); }catch(e){}
    return r;
  };
})(ACTIONS.lcGoStep);
ACTIONS.lcFinish = (function(base){
  return function(el){
    const c = crmFind('client', el.dataset.id), cy = c && clientCycle(c), st = c && clientStep(c);
    if(c && cy && st){
      r54Once(st).forEach(function(it){ r54LcCheck(c, st, it, true); state.tasks.items.forEach(function(t){ if(t.lifecycleRef===lcRef(c, st, it) && t.status!=='done'){ t.status = 'done'; t.completedAt = todayStr(); } }); });
      if(cy.next && cycleById(cy.next)){ r54Advance(c); persist('business'); persist('tasks'); try{ masterTasksSync(); }catch(e){} renderView(); if(typeof rerenderContactModal==='function') rerenderContactModal(); return; }
    }
    return base.apply(this, arguments);
  };
})(ACTIONS.lcFinish);
// the cards: lifecycle tasks have their own colour and say which step
taskCard = (function(base){
  return function(t){
    let h = base.apply(this, arguments);
    const m = t && t.master; if(!m || (m.kind!=='lc' && m.kind!=='lcrep')) return h;
    const tag = '<span class="mt-badge is-lc">'+(m.kind==='lcrep' ? '&#8635; '+(m.every==='month' ? 'Monthly' : 'Weekly') : '&#9670; '+escapeHtml(m.step || 'Lifecycle'))+'</span>';
    h = h.replace(/class="task-card(?=[\s"])/, 'class="task-card r54-lc');
    if(/<span class="mt-badge[^"]*"[^>]*>[\s\S]*?<\/span>/.test(h)) return h.replace(/<span class="mt-badge[^"]*"[^>]*>[\s\S]*?<\/span>/, tag);
    return h.replace(/(<div class="task-card-title">)/, tag+'$1');
  };
})(taskCard);
// the cycle editor: what finishing leads to, when a step with nothing to do moves on, when each task is due
const R54_DOW = [['1', 'Mon'], ['2', 'Tue'], ['3', 'Wed'], ['4', 'Thu'], ['5', 'Fri'], ['6', 'Sat'], ['0', 'Sun']];
renderLifecycleEditor = (function(base){
  return function(){
    const h = base.apply(this, arguments), cy = cycleById(ui.editingCycleId);
    if(!cy) return h;
    const tpl = document.createElement('template'); tpl.innerHTML = h;
    const head = tpl.content.querySelector('.cy-head');
    if(head){
      const others = cycles().filter(function(x){ return x.id!==cy.id; });
      head.insertAdjacentHTML('afterend', '<div class="r54-cyn"><span>When finished, move to</span><select class="input input-sm" data-r54-next="'+cy.id+'"><option value="">Nothing (the cycle ends)</option>'+others.map(function(x){ return '<option value="'+x.id+'"'+(cy.next===x.id ? ' selected' : '')+'>'+escapeHtml(x.name)+'</option>'; }).join('')+'</select></div>'+
        (arr(crm().r54Pending).length ? '<div class="r54-cyn is-ask"><span>Put your current clients ('+crm().r54Pending.length+') on</span><select class="input input-sm" data-r54-place="1"><option value="">Pick a cycle…</option>'+cycles().map(function(x){ return '<option value="'+x.id+'">'+escapeHtml(x.name)+'</option>'; }).join('')+'</select></div>' : ''));
    }
    cy.steps.forEach(function(st){
      const box = tpl.content.querySelector('.lc-editor-step[data-key="lce-'+st.id+'"]'); if(!box) return;
      if(!r54Once(st).length) box.insertAdjacentHTML('beforeend', '<div class="r54-auto"><span>Nothing to do here: move on after</span><input class="input input-sm" type="number" min="0" placeholder="–" data-r54-auto="'+cy.id+':'+st.id+'" value="'+(Number(st.autoDays) || '')+'"><span>days (blank: stay until you move them)</span></div>');
    });
    tpl.content.querySelectorAll('select[data-cy-item-repeat]').forEach(function(sel){
      const p = sel.getAttribute('data-cy-item-repeat').split(':'), st = cy.steps.find(function(s){ return s.id===p[1]; }), it = st && st.checklist.find(function(x){ return x.id===p[2]; }); if(!it) return;
      const ref = p.join(':');
      const ctl = it.repeat==='week' ? '<select class="input input-sm r54-due" data-r54-dow="'+ref+'" title="Due on">'+R54_DOW.map(function(d){ return '<option value="'+d[0]+'"'+(String(it.dueDow==null || it.dueDow==='' ? 5 : it.dueDow)===d[0] ? ' selected' : '')+'>due '+d[1]+'</option>'; }).join('')+'</select>'
        : it.repeat==='month' ? '<span class="r54-due">due day <input class="input input-sm" type="number" min="1" max="31" placeholder="end" data-r54-dom="'+ref+'" value="'+(Number(it.dueDom) || '')+'"> of their month</span>'
        : '<span class="r54-due">due <input class="input input-sm" type="number" min="0" placeholder="–" data-r54-due="'+ref+'" value="'+(it.dueDays==null || it.dueDays==='' ? '' : Number(it.dueDays))+'"> days in</span>';
      // (the type on the left, the item, then when it's due: Once / Every week / Every month and its day)
      const row = sel.closest('.lc-editor-item'), text = row && row.querySelector('[data-cy-item-text]');
      const when = document.createElement('span'); when.className = 'r54-when'; when.appendChild(sel); when.insertAdjacentHTML('beforeend', ctl);
      if(text) text.insertAdjacentElement('afterend', when); else if(row) row.appendChild(when);
    });
    const out = document.createElement('div'); out.appendChild(tpl.content.cloneNode(true)); return out.innerHTML;
  };
})(renderLifecycleEditor);
function r54ItemAt(ref){ const p = String(ref).split(':'), cy = cycleById(p[0]), st = cy && cy.steps.find(function(s){ return s.id===p[1]; }), it = st && st.checklist.find(function(x){ return x.id===p[2]; }); return {cy:cy, st:st, it:it}; }
document.addEventListener('change', function(e){
  const t = e.target; if(!t || !t.getAttribute) return;
  let hit = false;
  if(t.hasAttribute('data-r54-next')){ const cy = cycleById(t.getAttribute('data-r54-next')); if(cy){ cy.next = t.value || null; hit = true; } }
  else if(t.hasAttribute('data-r54-place')){ const to = cycleById(t.value); if(to){ arr(crm().r54Pending).forEach(function(id){ const c = crmFind('client', id); if(c && !c.cycleId) assignCycle(c, to.id); }); const n = crm().r54Pending.length; crm().r54Pending = []; showToast(n+' client'+(n===1 ? '' : 's')+' put on '+to.name, {icon:'&#9654;'}); hit = true; } }
  else if(t.hasAttribute('data-r54-auto')){ const p = t.getAttribute('data-r54-auto').split(':'), cy = cycleById(p[0]), st = cy && cy.steps.find(function(s){ return s.id===p[1]; }); if(st){ st.autoDays = Number(t.value) > 0 ? Number(t.value) : null; hit = true; } }
  else if(t.hasAttribute('data-r54-due')){ const x = r54ItemAt(t.getAttribute('data-r54-due')); if(x.it){ x.it.dueDays = t.value==='' ? null : Math.max(0, Number(t.value) || 0); hit = true; } }
  else if(t.hasAttribute('data-r54-dow')){ const x = r54ItemAt(t.getAttribute('data-r54-dow')); if(x.it){ x.it.dueDow = Number(t.value); hit = true; } }
  else if(t.hasAttribute('data-r54-dom')){ const x = r54ItemAt(t.getAttribute('data-r54-dom')); if(x.it){ x.it.dueDom = Number(t.value) > 0 ? Math.min(31, Number(t.value)) : null; hit = true; } }
  else if(t.hasAttribute('data-cy-item-repeat')){ setTimeout(function(){ try{ renderLifecycleEditorInto(); }catch(err){} }, 0); return; }
  if(!hit) return;
  persist('business'); try{ masterTasksSync(); }catch(err){}
  try{ renderLifecycleEditorInto(); }catch(err){}
});

// ============ SMALLER FIXES ============
// the video idea forms start empty after you save one
addVideoIdea = (function(base){ return function(){ const r = base.apply(this, arguments); ['newVideoIdeaTitle', 'newVideoIdeaNotes', 'newVideoIdeaType'].forEach(function(id){ const el = document.getElementById(id); if(el) el.value = ''; }); return r; }; })(addVideoIdea);
ACTIONS.csSave = (function(base){ return function(){ const r = base.apply(this, arguments); ['csTitle', 'csNotes'].forEach(function(id){ const el = document.getElementById(id); if(el) el.value = ''; }); return r; }; })(ACTIONS.csSave);
// App updates: Since last update (what you wrote since this version came in), Today, 3 days, 7 days
setTimeout(function(){
  try{
    const s = state.settings; if(!Array.isArray(s.r54Builds)) s.r54Builds = [];
    if(!s.r54Builds.length || s.r54Builds[s.r54Builds.length - 1].b!==OP_BUILT){ s.r54Builds.push({b:OP_BUILT, at:Date.now()}); if(s.r54Builds.length > 20) s.r54Builds.splice(0, s.r54Builds.length - 20); persist('settings'); }
  }catch(e){}
}, 0);
function r54SinceUpdate(){ const b = arr(state.settings.r54Builds); return b.length ? b[b.length - 1].at : 0; }
updatesRange = function(){ const r = ui.updatesRange; return ['since', 'today', '3', '7'].indexOf(r) >= 0 ? r : 'since'; };
updateEntries = function(){
  const r = updatesRange(), q = (ui.updatesSearch || '').toLowerCase();
  const from = r==='since' ? r54SinceUpdate() : r==='today' ? localTs(todayStr(), '00:00') : localTs(addDays(todayStr(), -(Number(r) - 1)), '00:00');
  return state.journal.entries.filter(function(e){ return isUpdateEntry(e) && (e.timestamp || 0) >= from && (!q || String(e.text || '').toLowerCase().indexOf(q) >= 0); }).sort(function(a, b){ return b.timestamp - a.timestamp; });
};
renderUpdatesTab = (function(base){
  return function(){
    const h = base.apply(this, arguments);
    if(h.indexOf('updatesRangeSel') < 0) return h;
    const r = updatesRange(), opts = [['since', 'Since last update'], ['today', 'Today'], ['3', 'Last 3 days'], ['7', 'Last 7 days']];
    return h.replace(/(<select class="input upd-range" id="updatesRangeSel"[^>]*>)[\s\S]*?(<\/select>)/, '$1'+opts.map(function(x){ return '<option value="'+x[0]+'"'+(r===x[0] ? ' selected' : '')+'>'+x[1]+'</option>'; }).join('')+'$2');
  };
})(renderUpdatesTab);
// Add task: no "Counts as a client deliverable" (a deliverable is a deliverable; one-offs are for the rest)
delivPickerHtml = function(){ return ''; };
