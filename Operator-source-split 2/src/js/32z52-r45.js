// ============ ROUND 45 (build 5): OP ============
//  • An on/off switch. Off, he's silent everywhere: no check-ins, no voice, no bubble. The light stays, dimmed;
//    tap it to turn him back on.
//  • Quiet while you work. Locked in or shooting, he doesn't interrupt. Anything he'd have said waits, and you
//    get it as one line when you come out (a break, or the end of the session). Talk to him and he answers.
//  • "I'm busy." Say it (or tap Busy) and he backs off for an hour, or as long as you said. A check-in you
//    answer that way counts as a real reason.
//  • The wrap-up and goodnight. At the end of work hours (or when you clock out) he wraps the day: what got
//    done, what's left, the first thing tomorrow. Going to sleep, he says goodnight.
//  • Push to talk: hold Right ⌥ (or hold his light) and talk, let go and it sends. Hands-free stays the default.
//  • Live conversation: an ElevenLabs agent, real-time, with his tools, so you can talk over him like a person.
//    The key stays in the Operator app; the page gets a one-time signed link.
//  • His memory works the same, but the list of what he remembers is gone from Settings.

const OPX = {userAt:0, held:[], wasHold:false, ptt:false, pttFrom:0};
function opOn(){ return !(state && state.profile && state.profile.opOn===false); }
function opQuietWork(){ return state.profile.opQuietWork!==false; }
function opInWork(){ const s = state.focus && state.focus.activeSession, m = state.modes && state.modes.active; return !!((s && !s.onBreak) || (m && m.type==='shooting')); }
function opBusyNow(){ return (Number(state.focus && state.focus.opBusyUntil) || 0) > Date.now(); }
// (you spoke to him in the last three minutes: that's a conversation, and he answers)
function opUserTurn(){ return Date.now() - (OPX.userAt || 0) < 180000; }
function opHoldBack(){ return !opOn() || (((opQuietWork() && opInWork()) || opBusyNow()) && !opUserTurn()); }
function opTalkMode(){ return state.profile.opTalk==='ptt' ? 'ptt' : 'free'; }
function opPttKey(){ return state.profile.opPttKey || 'AltRight'; }
const OP_PTT_KEYS = {AltRight:'Right ⌥', AltLeft:'Left ⌥', Backquote:'` key', ControlRight:'Right ⌃'};
function opHeld(t){
  t = String(t || '').trim(); if(!t || t==='…') return;
  if(OPX.held.some(function(h){ return h.t===t; })) return;
  OPX.held.push({t:t, at:Date.now()}); if(OPX.held.length > 6) OPX.held.shift();
  if(typeof opChatLog==='function') try{ opChatLog('op', t); }catch(e){}
  opLightMark();
}
function opLightMark(){
  const l = document.getElementById('opLight'); if(!l) return;
  l.classList.toggle('has-held', OPX.held.length > 0 && opOn());
  l.classList.toggle('is-snooze', opBusyNow());
  document.body.classList.toggle('op-off', !opOn());
  document.body.classList.toggle('op-ptt-on', OPX.ptt);
}

// ---- the gates: every way he speaks up on his own goes through here ----
opSay = (function(base){
  return function(text, opts){
    opts = opts || {};
    if(!opOn()) return Promise.resolve(false);
    if(opHoldBack() && opts.cap!=='opTestCap' && !opts.force){ opHeld(text); return Promise.resolve(false); }
    if(OPRT.state!=='off' && !opts.force) return Promise.resolve(false);
    return base.apply(this, arguments);
  };
})(opSay);
opCaption = (function(base){
  return function(txt){
    if(!opOn()) return;
    if(txt && OV.cap==='opBubText' && opHoldBack() && !OV.speaking && !OV.pending && !AI.listening && !AI.busy && OPRT.state==='off'){ opHeld(txt); return; }
    return base.apply(this, arguments);
  };
})(opCaption);
opNotify = (function(base){
  return function(text, mood){
    if(!opOn()) return;
    if(/^That’s the end of your work hours/.test(String(text || ''))){ opWrapUp('end'); return; }
    if(opHoldBack()){ opHeld(text); return; }
    return base.apply(this, arguments);
  };
})(opNotify);
acctTick = (function(base){
  return function(){
    if(!opOn()) return;
    const a = typeof acct==='function' ? acct() : null;
    if(a && a.pending) return base.apply(this, arguments);
    if(opBusyNow() || (opQuietWork() && opInWork())){ if(typeof acctProgressTick==='function') acctProgressTick(); return; }
    return base.apply(this, arguments);
  };
})(acctTick);
aiAutoListen = (function(base){ return function(){ if(!opOn() || opHoldBack() || opTalkMode()==='ptt' || OPRT.state!=='off') return; return base.apply(this, arguments); }; })(aiAutoListen);
if(typeof opPressDue==='function') opPressDue = (function(base){ return function(){ return opOn() && !opHoldBack() && base.apply(this, arguments); }; })(opPressDue);
if(typeof opQuestionDue==='function') opQuestionDue = (function(base){ return function(){ return opOn() && !opBusyNow() && base.apply(this, arguments); }; })(opQuestionDue);
if(typeof opDayMoments==='function') opDayMoments = (function(base){ return function(){ if(!opOn() || opHoldBack()) return; return base.apply(this, arguments); }; })(opDayMoments);
if(typeof heyOpOn==='function') heyOpOn = (function(base){ return function(){ return opOn() && OPRT.state==='off' && base.apply(this, arguments); }; })(heyOpOn);
if(typeof opPauseMs==='function') opPauseMs = (function(base){ return function(){ return OPX.ptt ? 600000 : base.apply(this, arguments); }; })(opPauseMs);
// what he held back, as one line when you come out
setInterval(function(){
  try{
    if(!state || !state.profile) return;
    if(OPX.held.length && opOn() && !opInWork() && !opBusyNow() && !OV.speaking && !OV.pending && !AI.busy && !AI.listening && OPRT.state==='off'){
      const fresh = OPX.held.filter(function(x){ return Date.now() - x.at < 3*3600000; }); OPX.held = [];
      if(fresh.length){
        const last = fresh[fresh.length - 1].t;
        const line = fresh.length===1 ? last : 'While you were in it: '+last+' And '+(fresh.length - 1)+' more in the chat.';
        setTimeout(function(){ opNotify(line, null); }, 1200);
      }
    }
    opLightMark();
  }catch(e){}
}, 4000);

// ---- the user's turn: talking, typing, the mic ----
aiAsk = (function(base){
  return function(text, cap){
    text = String(text || '').trim(); if(!text) return;
    OPX.userAt = Date.now();
    if(opBusySays(text)){ opBusy(opBusyMins(text), text); return; }
    if(OPRT.state==='live'){ OPRT.sendText(text); return; }
    return base.apply(this, arguments);
  };
})(aiAsk);
aiListen = (function(base){
  return function(cap){
    if(!opOn()) return;
    OPX.userAt = Date.now();
    if(opLiveOn() && OPRT.state==='off'){ OPRT.start().then(function(ok){ if(!ok) base.call(null, cap); }); return; }
    if(OPRT.state!=='off'){ if(OPRT.state==='live' && !OPX.ptt) OPRT.stop('tap'); return; }
    return base.apply(this, arguments);
  };
})(aiListen);
document.addEventListener('focusin', function(e){ if(e.target && e.target.id==='opBubInput') OPX.userAt = Date.now(); }, true);

// ---- "I'm busy" ----
const OP_BUSY_RE = /^(?:(?:sorry|nah|no|not now|hey|yo|man|bro|dude)[,.! ]+)*(?:(?:i['’]?m|im|i am)\s+(?:(?:a little|a bit|kinda|really|so|very)\s+)?(?:busy|slammed|swamped|tied up|on (?:a|the) (?:call|phone)|in (?:a )?(?:meeting|call)|with (?:a )?(?:client|someone|people)|driving|shooting|filming|out)|busy|not now|can['’]?t (?:talk|right now)|give me (?:a )?(?:minute|sec|bit|hour))\b/i;
function opBusySays(t){
  t = String(t || '').trim();
  if(t.split(/\s+/).length > 12 || /\b(add|remind|schedule|calendar|book|put|set|log|tomorrow|tonight|next week|at \d)/i.test(t)) return false;
  return OP_BUSY_RE.test(t);
}
function opBusyMins(t){
  t = String(t || '').toLowerCase();
  let m = /(\d+)\s*(?:min|minute|m\b)/.exec(t); if(m) return Math.max(10, Math.min(240, Number(m[1])));
  m = /(\d+(?:\.\d)?)\s*(?:hour|hr|h\b)/.exec(t); if(m) return Math.max(10, Math.min(240, Math.round(Number(m[1])*60)));
  if(/half (?:an )?hour/.test(t)) return 30; if(/couple (?:of )?hours/.test(t)) return 120; if(/\b(?:minute|sec|bit)\b/.test(t)) return 20;
  return 60;
}
function opBusy(mins, text){
  mins = Number(mins) || 60;
  state.focus.opBusyUntil = Date.now() + mins*60000; persist('focus');
  const a = typeof acct==='function' ? acct() : null;
  if(a && a.pending){
    const e = a.log.find(function(x){ return x.id===a.pending.id; });
    if(e){ e.status = e.status==='working' ? 'working' : 'excused'; e.why = 'Busy'; e.response = String(text || 'Busy').slice(0, 400); e.settledAt = Date.now(); }
    a.pending = null; if(typeof acctSchedule==='function') acctSchedule(); persist('focus'); if(typeof acctRescore==='function') try{ acctRescore(); }catch(err){}
  }
  ui.opMoodLock = false; if(typeof opMood==='function') opMood('neutral');
  if(AI.cancelListen) try{ AI.cancelListen(); }catch(e){}
  if(OPRT.state!=='off') OPRT.stop('busy');
  OPX.userAt = Date.now();
  const back = mins >= 60 ? (mins % 60 ? (mins/60).toFixed(1).replace('.0', '')+' hours' : (mins/60)+' hour'+(mins===60 ? '' : 's')) : mins+' minutes';
  const line = pickOne(['Got it. I’ll leave you to it.', 'Understood. I’ll be quiet.', 'Say no more.', 'Go. I’ve got the rest.'])+' Back in '+back+'.';
  AI.history.push({role:'user', content:String(text || 'I’m busy')}, {role:'assistant', content:line}); if(AI.history.length > 16) AI.history = AI.history.slice(-16);
  OV.cap = 'opBubText'; opBubShow();
  if(opVoiceOn()) opSay(line, {cap:'opBubText', force:true}); else opCaption(line);
  opLightMark(); if(ui.view==='settings') renderView();
}
ACTIONS.opBusyTap = function(){ opBusy(60, 'Busy'); };
ACTIONS.opBusyEnd = function(){ state.focus.opBusyUntil = 0; persist('focus'); opLightMark(); showToast('Op’s back.', {icon:'&#129302;'}); if(ui.view==='settings') renderView(); };
opBubShow = (function(base){
  return function(){
    const b = base.apply(this, arguments);
    if(b && !b.querySelector('.op-bub-busy')){
      const h = b.querySelector('.op-bub-h'), x = b.querySelector('.op-bub-x');
      if(h){
        const busy = document.createElement('button'); busy.className = 'op-bub-busy'; busy.setAttribute('data-action', 'opBusyTap'); busy.title = 'Leave me be for an hour'; busy.textContent = 'Busy';
        const pw = document.createElement('button'); pw.className = 'op-bub-pw'; pw.setAttribute('data-action', 'opPower'); pw.title = 'Turn Op off'; pw.innerHTML = '&#9211;';
        h.insertBefore(busy, x || null); h.insertBefore(pw, x || null);
      }
    }
    return b;
  };
})(opBubShow);

// ---- on / off ----
ACTIONS.opPower = function(){
  const on = !opOn();
  state.profile.opOn = on; persist('profile');
  if(!on){ try{ opStop(); }catch(e){} if(AI.cancelListen) try{ AI.cancelListen(); }catch(e){} if(OPRT.state!=='off') OPRT.stop('off'); if(typeof heyStop==='function') heyStop(); const b = document.getElementById('opBub'); if(b) b.classList.remove('is-in'); OPX.held = []; }
  opLightMark();
  showToast(on ? 'Op is on.' : 'Op is off. Tap his light to bring him back.', {icon:'&#129302;'});
  if(ui.view==='settings') renderView();
};
ACTIONS.opLightTap = (function(base){
  return function(){
    if(!opOn()){ ACTIONS.opPower(); return; }
    if(OPX.pttUsed && Date.now() - OPX.pttUsed < 400) return;   // (that was a hold: push to talk)
    if(opBusyNow()){ ACTIONS.opBusyEnd(); return; }
    OPX.userAt = Date.now();
    return base.apply(this, arguments);
  };
})(ACTIONS.opLightTap);

// ---- the wrap-up, and goodnight ----
function opDayFacts(){
  const t = todayStr(), tm = addDays(t, 1);
  const done = state.tasks.items.filter(function(x){ return x.status==='done' && x.completedAt===t; }).map(function(x){ return x.title; });
  const left = (typeof todaysPlan==='function' ? todaysPlan() : state.tasks.items.filter(function(x){ return x.status==='today'; })).filter(function(x){ return x.status!=='done'; }).map(function(x){ return x.title; });
  const deep = deepWorkMinutesTodayLive(), target = state.standards.deepWorkTargetMinutes || 180;
  let xp = 0; try{ xp = xpDay(t, xpCtx()).reduce(function(s, x){ return s + x.xp; }, 0); }catch(e){}
  const evT = arr(state.calendar.events).filter(function(e){ return e.date===tm; }).sort(function(a, b){ return (a.time || '99').localeCompare(b.time || '99'); })[0];
  const wake = typeof wakeTimeFor==='function' ? wakeTimeFor(tm) : null;
  return {done:done, left:left, deep:deep, target:target, xp:xp, tomorrow:evT ? (evT.time ? fmt12Hour(evT.time)+' ' : '')+evT.title : (left[0] || ''), wake:wake};
}
function opFactsLine(f){
  return 'Done today: '+(f.done.length ? f.done.slice(0, 5).join('; ') : 'nothing ticked off')+'. Still open: '+(f.left.length ? f.left.slice(0, 3).join('; ') : 'nothing')+'. Deep work: '+fmtDurationLabel(f.deep)+' of a '+fmtDurationLabel(f.target)+' target. XP today: '+f.xp+'.'+
    (f.tomorrow ? ' First thing tomorrow: '+f.tomorrow+'.' : '')+(f.wake ? ' Alarm tomorrow: '+fmt12Hour(f.wake)+'.' : '');
}
async function opWrapUp(why){
  if(!opOn()) return;
  const d = workDayState(); if(d.wrapSaid) return; d.wrapSaid = Date.now(); persist('focus');
  const f = opDayFacts();
  let line = (f.done.length ? 'That’s the day. You got '+f.done.slice(0, 2).join(' and ')+' done' : 'That’s the day')+
    (f.deep >= f.target ? ', and you hit your hours.' : f.deep ? ', '+fmtDurationLabel(f.deep)+' of real work.' : '.')+
    (f.left.length ? ' '+f.left[0]+' is still open.' : '')+(f.tomorrow ? ' Tomorrow starts with '+f.tomorrow+'.' : '')+' Wrap up and clock out.';
  if(AI.hasKey===true && typeof aiWrite==='function'){
    const t = await Promise.race([aiWrite('My work day just ended'+(why==='clockout' ? ' (I clocked out)' : '')+'. Wrap it up for me like a friend at the door: what I got done (one or two by name), how the day went in plain words, the one thing still open that matters, and the first thing tomorrow. Three or four spoken sentences. No pep talk, no numbers unless one really matters.\n\nFacts: '+opFactsLine(f), {max:220}), new Promise(function(r){ setTimeout(r, 9000); })]);
    if(t) line = t;
  }
  ui.opWrap = {at:Date.now(), line:line};
  if(opHoldBack()){ opHeld(line); return; }
  OV.cap = 'opBubText'; opBubShow();
  AI.history.push({role:'assistant', content:line}); if(AI.history.length > 16) AI.history = AI.history.slice(-16);
  if(typeof opChatLog==='function') try{ opChatLog('op', line); }catch(e){}
  if(opVoiceOn()) opSay(line, {cap:'opBubText', force:true}); else opCaption(line);
}
ACTIONS.clockOut = (function(base){ return function(){ const r = base.apply(this, arguments); setTimeout(function(){ if(state.modes.active && state.modes.active.clockedOut) opWrapUp('clockout'); }, 900); return r; }; })(ACTIONS.clockOut);
async function opGoodnight(){
  if(!opOn()) return;
  const f = state.focus, t = todayStr(); if(f.opNightSaid===t) return; f.opNightSaid = t; persist('focus');
  const facts = opDayFacts(), name = (state.profile.name || '').split(' ')[0];
  let line = 'Hope today was a good one'+(name ? ', '+name : '')+', whether it was productive or not. Time to wind down. '+(facts.wake ? 'Your alarm is set for '+fmt12Hour(facts.wake)+'. ' : '')+'Goodnight, see you then.';
  if(AI.hasKey===true && typeof aiWrite==='function'){
    const tx = await Promise.race([aiWrite('I’m going to sleep now. Say goodnight like a kind friend: acknowledge my day (productive or not, hope it was good), say it’s time to wind down, mention my alarm time, and say goodnight, see you then. Do NOT mention tomorrow’s tasks or plans. Short, warm and low, three sentences at most.\n\nFacts: '+opFactsLine(Object.assign({}, facts, {tomorrow:''})), {max:120}), new Promise(function(r){ setTimeout(r, 7000); })]);
    if(tx) line = tx;
  }
  OV.cap = 'opBubText'; opBubShow();
  if(typeof opChatLog==='function') try{ opChatLog('op', line); }catch(e){}
  if(opVoiceOn()) opSay(line, {cap:'opBubText', force:true}); else opCaption(line);
}
ACTIONS.startSleepMode = (function(base){ return function(){ const r = base.apply(this, arguments); setTimeout(opGoodnight, 900); return r; }; })(ACTIONS.startSleepMode);

// ---- push to talk: hold the key (or his light), talk, let go ----
function opPttDown(){
  if(!opOn() || OPX.ptt) return;
  OPX.ptt = true; OPX.pttFrom = Date.now(); OPX.userAt = Date.now(); opLightMark();
  if(opLiveOn()){ if(OPRT.state==='off') OPRT.start({ptt:true}).then(function(ok){ if(!ok && OPX.ptt){ OV.cap = 'opBubText'; opBubShow(); opPttClassic(); } }); else OPRT.pttSet(true); return; }
  OV.cap = 'opBubText'; opBubShow(); opPttClassic();
}
function opPttClassic(){ try{ opStop(); }catch(e){} if(!AI.listening) aiListen('opBubText'); }
function opPttUp(){
  if(!OPX.ptt) return;
  OPX.ptt = false; OPX.pttUsed = Date.now(); opLightMark();
  if(OPRT.state!=='off'){ OPRT.pttSet(false); return; }
  setTimeout(function(){ if(AI.sendNow) AI.sendNow(); }, 350);
}
document.addEventListener('keydown', function(e){
  if(opTalkMode()!=='ptt' || e.code!==opPttKey() || e.repeat) return;
  const t = e.target, typing = t && (t.tagName==='INPUT' || t.tagName==='TEXTAREA' || t.isContentEditable);
  if(typing && !/^(Alt|Control)/.test(e.code)) return;
  e.preventDefault(); opPttDown();
}, true);
document.addEventListener('keyup', function(e){ if(e.code===opPttKey() && OPX.ptt) { e.preventDefault(); opPttUp(); } }, true);
window.addEventListener('blur', function(){ if(OPX.ptt) opPttUp(); });
// (holding his light is push to talk in either mode)
document.addEventListener('pointerdown', function(e){
  const l = e.target.closest && e.target.closest('#opLight'); if(!l || e.button!==0) return;
  clearTimeout(OPX.holdT); OPX.holdT = setTimeout(function(){ opPttDown(); }, 280);
  const up = function(){ clearTimeout(OPX.holdT); document.removeEventListener('pointerup', up, true); document.removeEventListener('pointercancel', up, true); if(OPX.ptt) opPttUp(); };
  document.addEventListener('pointerup', up, true); document.addEventListener('pointercancel', up, true);
}, true);

// ============ LIVE: an ElevenLabs agent, in real time ============
function opAgentId(){ return String(state.settings.opAgentId || '').trim(); }
function opLiveOn(){ return state.settings.opLive===true && !!opAgentId() && opOn(); }
const OPRT = {state:'off', ws:null, stream:null, ctxIn:null, proc:null, src:null, ctxOut:null, nodes:[], playAt:0, inRate:16000, outFmt:'pcm_16000', lastAct:0, ptt:false, flush:0, err:'', noOverride:false, idleT:null};
function opLivePrompt(){
  try{ return aiSystem().map(function(s){ return s.text; }).join('\n\n').replace('Everything you say is spoken aloud by a text-to-speech voice.', 'This is a live voice conversation: he can talk over you, and you answer like a person in the room.'); }
  catch(e){ return opPersona()+'\n\n'+OP_RULES; }
}
function opLiveInit(){
  const w = typeof wakeCfg==='function' ? wakeCfg() || {} : {}, v = w.elevenVoice && w.elevenVoice!=='paste-id' ? w.elevenVoice : null;
  const m = {type:'conversation_initiation_client_data', dynamic_variables:{user_name:(state.profile.name || '').split(' ')[0] || 'there'}};
  if(!OPRT.noOverride){ m.conversation_config_override = {agent:{prompt:{prompt:opLivePrompt()}, first_message:'', language:'en'}}; if(v) m.conversation_config_override.tts = {voice_id:v}; }
  return m;
}
async function opLiveUrl(){
  const r = await fetchWithin(WAKE_HELPER+'tts/agent/url?a='+encodeURIComponent(opAgentId()), 12000);
  if(!r) return {err:'the Operator app didn’t answer'};
  let j = null; try{ j = await r.json(); }catch(e){}
  if(!r.ok || !j || !j.signed_url) return {err:(j && (j.error || (j.detail && (j.detail.message || j.detail)))) || 'ElevenLabs said no ('+r.status+')'};
  return {url:j.signed_url};
}
OPRT.send = function(o){ try{ if(OPRT.ws && OPRT.ws.readyState===1) OPRT.ws.send(JSON.stringify(o)); }catch(e){} };
OPRT.start = async function(opts){
  opts = opts || {};
  if(OPRT.state!=='off') return true;
  OPRT.state = 'connecting'; OPRT.ptt = !!opts.ptt || opTalkMode()==='ptt'; OPRT.err = ''; OPRT.lastAct = Date.now();
  try{ opStop(); }catch(e){} if(typeof heyStop==='function') heyStop();
  OV.cap = 'opBubText'; opBubShow(); opCaption('…');
  const u = await opLiveUrl();
  if(!u.url){ OPRT.state = 'off'; OPRT.err = String(u.err); showToast('Live mode couldn’t start: '+OPRT.err+'. Using the normal voice.', {icon:'&#9888;', duration:9000}); return false; }
  try{ OPRT.stream = await navigator.mediaDevices.getUserMedia({audio:{echoCancellation:true, noiseSuppression:true, autoGainControl:true, channelCount:1}}); }
  catch(e){ OPRT.state = 'off'; opCaption('I need the microphone. Allow it for Operator (or type instead).'); return true; }
  let ws; try{ ws = new WebSocket(u.url); }catch(e){ OPRT.cleanup(); OPRT.state = 'off'; return false; }
  OPRT.ws = ws;
  ws.onopen = function(){ OPRT.send(opLiveInit()); };
  ws.onmessage = function(ev){ let m = null; try{ m = JSON.parse(ev.data); }catch(e){ return; } try{ OPRT.onMsg(m); }catch(e){} };
  ws.onclose = function(ev){
    const why = String(ev && ev.reason || '');
    if(OPRT.state==='connecting' && /override/i.test(why) && !OPRT.noOverride){ OPRT.noOverride = true; OPRT.cleanup(); OPRT.state = 'off'; OPRT.start(opts); return; }
    if(OPRT.state==='connecting') showToast('Live mode closed: '+(why || 'no reason given')+'.', {icon:'&#9888;', duration:8000});
    OPRT.stop('closed');
  };
  ws.onerror = function(){};
  return true;
};
OPRT.onMsg = function(m){
  const type = m.type;
  if(type==='conversation_initiation_metadata'){
    const e = m.conversation_initiation_metadata_event || m;
    OPRT.outFmt = e.agent_output_audio_format || 'pcm_16000';
    const r = /pcm_(\d+)/.exec(e.user_input_audio_format || 'pcm_16000'); OPRT.inRate = r ? Number(r[1]) : 16000;
    OPRT.state = 'live'; OPRT.lastAct = Date.now(); OPRT.mic(); OPRT.ui();
    opCaption(OPRT.ptt ? 'Hold '+(OP_PTT_KEYS[opPttKey()] || 'the key')+' to talk.' : 'Listening…');
    return;
  }
  if(type==='ping'){ const e = m.ping_event || {}; setTimeout(function(){ OPRT.send({type:'pong', event_id:e.event_id}); }, Number(e.ping_ms) || 0); return; }
  if(type==='audio'){ const e = m.audio_event || m; if(e.audio_base_64) OPRT.play(e.audio_base_64); OPRT.lastAct = Date.now(); return; }
  if(type==='interruption'){ OPRT.hush(); return; }
  if(type==='user_transcript'){
    const t = String((m.user_transcription_event || m).user_transcript || '').trim(); if(!t) return;
    OPRT.lastAct = Date.now(); OPX.userAt = Date.now();
    if(typeof opMeSet==='function') opMeSet(t); if(typeof opChatLog==='function') try{ opChatLog('me', t); }catch(e){}
    AI.history.push({role:'user', content:t}); if(AI.history.length > 16) AI.history = AI.history.slice(-16);
    if(opBusySays(t)) opBusy(opBusyMins(t), t);
    return;
  }
  if(type==='agent_response'){
    const t = opNoDash(String((m.agent_response_event || m).agent_response || '').trim()); if(!t) return;
    OPRT.lastAct = Date.now(); OPRT.lastSaid = t;
    OV.cap = 'opBubText'; opCaption(t);
    if(typeof opChatLog==='function') try{ opChatLog('op', t); }catch(e){}
    AI.history.push({role:'assistant', content:t}); if(AI.history.length > 16) AI.history = AI.history.slice(-16);
    return;
  }
  if(type==='agent_response_correction'){ const e = m.agent_response_correction_event || m; if(e.corrected_agent_response){ OV.cap = 'opBubText'; opCaption(opNoDash(e.corrected_agent_response)); } return; }
  if(type==='client_tool_call'){
    const c = m.client_tool_call || m; let result = '', err = false;
    try{ result = String(opRunTool(c.tool_name, c.parameters || {})); if(c.tool_name!=='remember' && c.tool_name!=='forget') setTimeout(renderView, 0); }
    catch(e){ result = String(e && e.message || e); err = true; }
    OPRT.send({type:'client_tool_result', tool_call_id:c.tool_call_id, result:result, is_error:err});
    OPRT.lastAct = Date.now();
    return;
  }
  if(type==='vad_score'){ if(Number((m.vad_score_event || m).vad_score) > .6) OPRT.lastAct = Date.now(); }
};
// the mic: 16-bit PCM at the rate the agent asked for, in small chunks
OPRT.mic = function(){
  if(!OPRT.stream || OPRT.proc) return;
  const Ctx = window.AudioContext || window.webkitAudioContext; const ctx = new Ctx(); OPRT.ctxIn = ctx;
  const src = ctx.createMediaStreamSource(OPRT.stream), proc = ctx.createScriptProcessor(4096, 1, 1);
  OPRT.src = src; OPRT.proc = proc; src.connect(proc); proc.connect(ctx.destination);
  proc.onaudioprocess = function(ev){
    const out = ev.outputBuffer.getChannelData(0); out.fill(0);
    if(OPRT.state!=='live') return;
    const sending = !OPRT.ptt || OPX.ptt;
    if(!sending && OPRT.flush <= 0) return;
    const inp = sending ? ev.inputBuffer.getChannelData(0) : new Float32Array(4096);
    if(!sending) OPRT.flush--;
    OPRT.send({user_audio_chunk:opPcmB64(opResample(inp, ctx.sampleRate, OPRT.inRate))});
  };
};
OPRT.pttSet = function(on){
  OPRT.ptt = true;
  if(on){ OPRT.hush(); OPRT.lastAct = Date.now(); if(OPRT.state==='live') opCaption('Listening…'); }
  else OPRT.flush = 4;   // a beat of quiet so his ear knows you finished
  OPRT.ui();
};
function opResample(f, from, to){
  if(from===to) return f;
  const ratio = from/to, n = Math.floor(f.length/ratio), o = new Float32Array(n);
  for(let i = 0; i < n; i++){ const a = Math.floor(i*ratio), b = Math.min(f.length, Math.floor((i + 1)*ratio)); let s = 0; for(let k = a; k < b; k++) s += f[k]; o[i] = b > a ? s/(b - a) : f[a]; }
  return o;
}
function opPcmB64(f){
  const b = new Uint8Array(f.length*2);
  for(let i = 0; i < f.length; i++){ const s = Math.max(-1, Math.min(1, f[i])), v = s < 0 ? s*0x8000 : s*0x7FFF, x = v | 0; b[i*2] = x & 255; b[i*2 + 1] = (x >> 8) & 255; }
  let s = ''; for(let i = 0; i < b.length; i += 0x8000) s += String.fromCharCode.apply(null, b.subarray(i, i + 0x8000));
  return btoa(s);
}
function opUlaw(u){ u = ~u & 255; const sign = u & 0x80, ex = (u >> 4) & 7, man = u & 15; let x = ((man << 3) + 0x84) << ex; x -= 0x84; return (sign ? -x : x)/32768; }
OPRT.play = function(b64){
  const raw = atob(b64), n = raw.length, Ctx = window.AudioContext || window.webkitAudioContext;
  if(!OPRT.ctxOut) OPRT.ctxOut = new Ctx();
  const ctx = OPRT.ctxOut, ul = /ulaw/.test(OPRT.outFmt), r = /_(\d+)/.exec(OPRT.outFmt), rate = r ? Number(r[1]) : 16000;
  let f;
  if(ul){ f = new Float32Array(n); for(let i = 0; i < n; i++) f[i] = opUlaw(raw.charCodeAt(i)); }
  else { const m = n >> 1; f = new Float32Array(m); for(let i = 0; i < m; i++){ let v = raw.charCodeAt(i*2) | (raw.charCodeAt(i*2 + 1) << 8); if(v & 0x8000) v -= 0x10000; f[i] = v/32768; } }
  if(!f.length) return;
  const buf = ctx.createBuffer(1, f.length, rate); buf.getChannelData(0).set(f);
  const node = ctx.createBufferSource(); node.buffer = buf; node.connect(ctx.destination);
  const at = Math.max(ctx.currentTime + 0.04, OPRT.playAt); node.start(at); OPRT.playAt = at + buf.duration;
  OPRT.nodes.push(node); OV.speaking = true; OPRT.ui();
  node.onended = function(){ OPRT.nodes = OPRT.nodes.filter(function(x){ return x!==node; }); if(!OPRT.nodes.length){ OV.speaking = false; OV.lastEnd = Date.now(); OPRT.lastAct = Date.now(); OPRT.ui(); } };
};
OPRT.hush = function(){ OPRT.nodes.forEach(function(nd){ try{ nd.onended = null; nd.stop(); }catch(e){} }); OPRT.nodes = []; OPRT.playAt = 0; OV.speaking = false; OPRT.ui(); };
OPRT.sendText = function(t){ OPRT.lastAct = Date.now(); if(typeof opMeSet==='function') opMeSet(t); if(typeof opChatLog==='function') try{ opChatLog('me', t); }catch(e){} OPRT.send({type:'user_message', text:t}); };
OPRT.ui = function(){
  AI.listening = OPRT.state==='live' && !OV.speaking && (!OPRT.ptt || OPX.ptt);
  document.body.classList.toggle('op-live', OPRT.state!=='off');
  if(typeof aiUiRefresh==='function') aiUiRefresh(); opLightMark();
};
OPRT.cleanup = function(){
  try{ if(OPRT.proc){ OPRT.proc.onaudioprocess = null; OPRT.proc.disconnect(); } }catch(e){} try{ if(OPRT.src) OPRT.src.disconnect(); }catch(e){}
  try{ if(OPRT.ctxIn) OPRT.ctxIn.close(); }catch(e){}
  try{ if(OPRT.stream) OPRT.stream.getTracks().forEach(function(t){ t.stop(); }); }catch(e){}
  OPRT.proc = OPRT.src = OPRT.ctxIn = OPRT.stream = null;
};
OPRT.stop = function(why){
  if(OPRT.state==='off' && !OPRT.ws) return;
  OPRT.state = 'off';
  const ws = OPRT.ws; OPRT.ws = null; try{ if(ws && ws.readyState < 2) ws.close(); }catch(e){}
  OPRT.cleanup(); OPRT.hush(); AI.listening = false; OPRT.ui();
  if(typeof opBubHideLater==='function') opBubHideLater();
};
// it hangs up on its own when the conversation goes quiet (it costs by the minute)
setInterval(function(){ if(OPRT.state==='live' && !OV.speaking && !OPX.ptt && Date.now() - OPRT.lastAct > (OPRT.ptt ? 90000 : 30000)) OPRT.stop('idle'); }, 2000);
// the agent, made for you: his brief, his voice and every tool he has in the app
function opLiveTools(){
  return OP_TOOLS.map(function(t){
    const s = t.input_schema || {}, props = {};
    Object.keys(s.properties || {}).forEach(function(k){
      const p = s.properties[k] || {}, q = {type:p.type || 'string', description:p.description || k.replace(/_/g, ' ')};
      if(p.enum) q.enum = p.enum; if(p.type==='array') q.items = {type:(p.items && p.items.type) || 'string', description:k};
      props[k] = q;
    });
    return {type:'client', name:t.name, description:String(t.description || t.name).slice(0, 900), expects_response:true, response_timeout_secs:20, parameters:{type:'object', properties:props, required:arr(s.required)}};
  });
}
function opLiveAgentBody(){
  const w = typeof wakeCfg==='function' ? wakeCfg() || {} : {}, v = w.elevenVoice && w.elevenVoice!=='paste-id' ? w.elevenVoice : 'JBFqnCBsd6RMkjVDRZzb';
  return {name:'Op (Operator)', conversation_config:{agent:{first_message:'', language:'en', prompt:{prompt:opPersona()+'\n\n'+OP_RULES, tools:opLiveTools()}}, tts:{voice_id:v, model_id:'eleven_flash_v2'}},
    platform_settings:{overrides:{conversation_config_override:{agent:{prompt:{prompt:true}, first_message:true, language:true}, tts:{voice_id:true}}}}};
}
ACTIONS.opLiveCreate = async function(el){
  if(el){ el.disabled = true; el.textContent = 'Setting it up…'; }
  const id = opAgentId(), path = id ? 'tts/agent/update?a='+encodeURIComponent(id)+'&' : 'tts/agent/create?';
  const r = await fetchWithin(WAKE_HELPER+path+'b='+hexUtf8(JSON.stringify(opLiveAgentBody())), 30000);
  let j = null; try{ j = r ? await r.json() : null; }catch(e){}
  if(r && r.ok && j && (j.agent_id || id)){
    state.settings.opAgentId = j.agent_id || id; state.settings.opLive = true; OPRT.noOverride = false; persist('settings');
    showToast(id ? 'Op’s live agent is up to date.' : 'Op’s live agent is ready. Talk to him.', {icon:'&#129302;'});
  } else {
    const why = !r ? 'the Operator app didn’t answer' : (j && (j.error || (j.detail && (j.detail.message || JSON.stringify(j.detail))))) || 'ElevenLabs said no ('+(r ? r.status : 0)+')';
    showToast('Couldn’t set up the live agent: '+String(why).slice(0, 200), {icon:'&#9888;', duration:12000});
  }
  renderView();
};
ACTIONS.opLiveToggle = function(){ state.settings.opLive = !(state.settings.opLive===true); persist('settings'); if(!state.settings.opLive && OPRT.state!=='off') OPRT.stop('off'); renderView(); };
ACTIONS.opTalkSet = function(el, e, id){ state.profile.opTalk = id==='ptt' ? 'ptt' : 'free'; persist('profile'); renderView(); };
ACTIONS.opPttKeySet = function(el, e, id){ if(OP_PTT_KEYS[id]){ state.profile.opPttKey = id; persist('profile'); renderView(); } };
ACTIONS.opQuietToggle = function(){ state.profile.opQuietWork = !opQuietWork(); persist('profile'); renderView(); };
document.addEventListener('change', function(e){ const t = e.target; if(t && t.id==='opAgentIdIn'){ state.settings.opAgentId = t.value.trim().replace(/[^0-9a-zA-Z_-]/g, ''); OPRT.noOverride = false; persist('settings'); renderView(); } });

// ---- Settings → Op: the switch, how you talk, live mode; no memory list ----
opSettingsHtml = (function(base){
  return function(){
    const tpl = document.createElement('template'); tpl.innerHTML = base.apply(this, arguments);
    const card = tpl.content.querySelector('.op-settings') || tpl.content.firstElementChild;
    tpl.content.querySelectorAll('.field.op-set').forEach(function(f){ const l = f.querySelector('label'); if(l && /^What Op remembers/.test(l.textContent.trim())) f.remove(); });
    tpl.content.querySelectorAll('.op-danger, .op-mem-tools, [data-action="opMemClear"], [data-action="opMemClearAsk"]').forEach(function(x){ x.remove(); });
    if(card){
      const on = opOn(), mode = opTalkMode(), live = state.settings.opLive===true, seg = function(act, cur, id, label){ return '<button class="seg-tab'+(cur===id ? ' active' : '')+'" data-action="'+act+'" data-id="'+id+'">'+label+'</button>'; };
      const busy = opBusyNow() ? '<div class="r45-busy">Quiet until '+fmtTimeShort(state.focus.opBusyUntil)+' <button class="btn btn-ghost btn-sm" data-action="opBusyEnd">Bring him back</button></div>' : '';
      const top = '<div class="r45-top"><div class="r45-pw'+(on ? ' is-on' : '')+'"><b>'+(on ? 'Op is on' : 'Op is off')+'</b><button class="r45-sw'+(on ? ' on' : '')+'" data-action="opPower" aria-label="Op on or off"><span></span></button></div>'+busy+'</div>'+
        '<div class="field op-set"><label>Talking</label><div class="seg-tabs" style="margin:0;">'+seg('opTalkSet', mode, 'free', 'Hands-free')+seg('opTalkSet', mode, 'ptt', 'Push to talk')+'</div>'+
          (mode==='ptt' ? '<div class="seg-tabs r45-keys">'+Object.keys(OP_PTT_KEYS).map(function(k){ return seg('opPttKeySet', opPttKey(), k, 'Hold '+OP_PTT_KEYS[k]); }).join('')+'</div>' : '')+'</div>'+
        '<div class="field op-set r45-row"><label>Quiet while you work</label><button class="r45-sw'+(opQuietWork() ? ' on' : '')+'" data-action="opQuietToggle"><span></span></button></div>'+
        '<div class="field op-set"><label>Live conversation</label><div class="r45-live">'+
          '<div class="r45-row"><span>Real time, talk over him</span><button class="r45-sw'+(live ? ' on' : '')+'" data-action="opLiveToggle"><span></span></button></div>'+
          (live ? '<input class="input" id="opAgentIdIn" placeholder="ElevenLabs agent ID" value="'+escapeHtml(opAgentId())+'" autocomplete="off" spellcheck="false">'+
            '<button class="btn btn-sm '+(opAgentId() ? '' : 'btn-primary')+'" data-action="opLiveCreate">'+(opAgentId() ? 'Update his agent' : 'Make his agent')+'</button>'+(OPRT.err ? '<small class="r45-err">'+escapeHtml(OPRT.err)+'</small>' : '') : '')+
        '</div></div>';
      const after = card.querySelector('.section-title'), wrap = document.createElement('div'); wrap.innerHTML = top;
      if(after && after.nextSibling) card.insertBefore(wrap, after.nextSibling); else card.appendChild(wrap);
    }
    const d = document.createElement('div'); d.appendChild(tpl.content.cloneNode(true)); return d.innerHTML;
  };
})(opSettingsHtml);
afterRenderHooks.push(function(){ opLightMark(); });
