// ============ ROUND 29 ============

// ---- the recap opens already drawn (it used to show an empty window, then fill in with a jump) ----
openDayRecap = function(date){
  ui.recapDate = date || todayStr();
  renderRecapInto();
  const o = document.getElementById('recapOverlay');
  if(o){ o.classList.add('is-opening'); showOverlay('recapOverlay'); setTimeout(function(){ o.classList.remove('is-opening'); }, 520); }
};

// ---- Inspiration sounds: Shuffle picks a different one every time ----
INSP_SFX.splice(INSP_SFX.length - 1, 0, ['random', 'Shuffle']);
inspNote = (function(base){
  const kinds = ['chimes', 'glass', 'drops', 'soft'];
  return function(ctx, out, t, midi, vol){
    if(inspSfxStyle()!=='random') return base.apply(this, arguments);
    const cfg = inspSfxCfg(), was = cfg.style;
    cfg.style = kinds[Math.floor(Math.random()*kinds.length)];
    try{ return base.apply(this, arguments); } finally { cfg.style = was; }
  };
})(inspNote);

// ---- Op taps in while you're locked in: a quick "you good? still on it?" (any time you're locked in,
// not only in work hours), about every 45 to 70 minutes, never in the first half hour, never if he just did ----
function opTapTask(){ const id = ui.currentTaskId; const t = id && state.tasks.items.find(function(x){ return x.id===id; }); return t ? t.title : ''; }
function opTapDue(){
  const s = state.focus.activeSession; if(!s || s.onBreak || !opVoiceOn()) return false;
  if(AI.busy || AI.listening || OV.speaking || OV.pending || document.querySelector('.overlay:not(.hidden)')) return false;
  if(Date.now() - s.startedAt < 32*60000) return false;
  const last = Math.max(s.tapAt || 0, (typeof acct==='function' && acct().log.length ? acct().log[acct().log.length-1].at : 0));
  if(!s.tapGap) s.tapGap = (45 + Math.random()*25)*60000;
  return Date.now() - last > s.tapGap && Date.now() - (ui._opActiveAt || 0) > 60000;
}
async function opTap(){
  const s = state.focus.activeSession; if(!s) return;
  s.tapAt = Date.now(); s.tapGap = (45 + Math.random()*25)*60000; persist('focus');
  const task = opTapTask();
  let line = task ? pickOne(['You good, boss? Still on '+task+'?', 'Quick one: how’s '+task+' coming along?', 'Still locked in on '+task+'? Need anything?']) : pickOne(['You good, boss? Still in it?', 'Quick check: how’s it going in there?', 'Still locked in? Need anything?']);
  if(AI.hasKey===true && typeof aiWrite==='function'){
    const t = await Promise.race([aiWrite('I’m locked in working'+(task ? ' on "'+task+'"' : '')+', '+Math.round((Date.now()-s.startedAt)/60000)+' minutes in. Pop your head in like a friend: one very short casual question, like “you good, boss? still on '+(task ? 'that' : 'it')+'?”. Your own words, a few words, ends on the question.', {max:40}), new Promise(function(r){ setTimeout(r, 5000); })]);
    if(t) line = t;
  }
  if(!state.focus.activeSession || AI.listening || OV.speaking) return;
  if(!/\?["”’)]*\s*$/.test(line)) line = line.replace(/[.!]*\s*$/, '')+'. You good?';   // (it always asks)
  AI.history.push({role:'assistant', content:line}); if(AI.history.length > 16) AI.history = AI.history.slice(-16);
  OV.cap = 'opBubText'; opBubShow(); opSay(line, {cap:'opBubText'});
}
setInterval(function(){ try{ if(opTapDue()) opTap(); }catch(e){} }, 60000);

// ---- Good morning: your wake-up song is the morning's music. The app's own track only comes in when
// there's no song set (an alarm tone), or when you press play yourself ----
gmHandoff = (function(base){ return function(){ if(typeof wakeUsesMusic==='function' && wakeUsesMusic(wakeCfg())) return; return base.apply(this, arguments); }; })(gmHandoff);
// a question waiting on you in the bubble keeps the music down until you answer (or it goes)
setInterval(function(){
  try{
    const b = document.getElementById('opBub'), t = b && b.classList.contains('is-in') ? (document.getElementById('opBubText')||{}).textContent || '' : '';
    const waiting = /\?["”’)]*\s*$/.test(t.trim()) && Date.now() - (OV.lastEnd||0) < 30000;
    if(waiting && !OV.qDuck){ OV.qDuck = true; opDuck(true); }
    else if(!waiting && OV.qDuck){ OV.qDuck = false; if(!AI.listening && !OV.speaking) opDuck(false); }
  }catch(e){}
}, 700);
// (and nothing brings the music back up while a question's waiting or the mic's open)
opDuck = (function(base){ return function(on){ if(!on && (OV.qDuck || AI.listening)) return; return base.apply(this, arguments); }; })(opDuck);

// ---- the news, like a friend would say it: what's going on in a few words; only something genuinely big
// gets real time (and Op sounds like it). Everyday crime and tragedy don't make it in. ----
const NEWS_BIG = /\b(assassinat\w*|shot (?:dead|at|and|in|while)|was shot|is shot|gets shot|shooting|killed|dies|died|death toll|war\b|invades?|invasion|missile|airstrikes?|terror\w*|earthquake|tsunami|hurricane|wildfire|evacuat\w*|state of emergency|martial law|coup|nuclear|pandemic|outbreak|resigns|impeach\w*|collapse[sd]?|market crash|plunge[sd]?)\b/i;
const NEWS_WHO = /\b(president|prime minister|pope|king|queen|chancellor|leader|nation|nationwide|country|world|global|thousands|hundreds|dozens|millions|u\.?s\.?|america|europe|china|russia)\b/i;
function newsIsBig(n){ const t = sayHeadline(n.title||''); return NEWS_BIG.test(t) && NEWS_WHO.test(t); }
newsTease = function(){
  const nw = ui.morningNews; if(!nw || !nw.items) return null;
  const sec = nw.sec || {}, top = arr(nw.items), words = teaseInterestWords();
  const big = top.slice(0, 6).find(newsIsBig);
  ui.briefNewsBig = !!big;
  if(big){
    const h = sayHeadline(big.title).replace(/[.!?]+$/, '');
    return {text:'Something you should know: '+h+'.', big:true, topics:['that story'], facts:['- '+h+' (big)'].concat(top.slice(0, 6).filter(function(n){ return n!==big; }).map(function(n){ return '- '+sayHeadline(n.title); }))};
  }
  const cats = [];
  if(arr(sec.tech).length) cats.push('tech'); if(arr(sec.business).length) cats.push('business'); if(top.length) cats.push('the world'); if(arr(sec.local).length) cats.push('around town');
  if(!cats.length) return null;
  const all = top.concat(arr(sec.tech), arr(sec.business));
  const mine = words.find(function(w){ return all.some(function(n){ return (n.title||'').toLowerCase().indexOf(w) >= 0; }); });
  const list = cats.length > 1 ? cats.slice(0, -1).join(', ')+' and '+cats[cats.length-1] : cats[0];
  const text = teasePick('newsA', ['A bit going on in '+list+', nothing wild.', 'Some news in '+list+'. Nothing that can’t wait.', 'Little bits in '+list+'. Quiet morning, mostly.'])+(mine ? ' There’s some '+mine.replace(/^\w/, function(c){ return c.toUpperCase(); })+' stuff you’d like.' : '');
  return {text:text, topics:['the news'], facts:all.slice(0, 8).map(function(n){ return '- '+sayHeadline(n.title); })};
};

// ---- up before the alarm ----
// "I'm up" on the sleep screen: your sleep's logged (bed to now) and the morning's alarm stands down.
// "Good morning →": the same, then Good morning opens (quietly, no ringing).
function wakeStandDown(){
  const nw = typeof nextWake==='function' ? nextWake() : null, w = wakeCfg();
  if(nw && nw.ts - Date.now() < 10*3600000){ w.lastFiredTs = Math.max(w.lastFiredTs||0, nw.ts); try{ dawnDismissedTs = nw.ts; }catch(e){} persist('focus'); return nw; }
  return null;
}
function sleepUpNow(){
  const m = state.modes.active, wasSleep = !!(m && m.sleep), started = m && m.startedAt;
  const nw = wakeStandDown();
  if(wasSleep) endMode();
  const mins = wasSleep && started ? Math.round((Date.now() - started)/60000) : 0;
  return {mins:mins, alarm:nw};
}
ACTIONS.sleepUp = function(){
  const r = sleepUpNow();
  ui.view = 'today'; renderView();
  showToast('Morning.'+(r.mins >= 60 ? ' You slept '+fmtDurationLabel(r.mins)+'.' : '')+(r.alarm ? ' I let the '+fmt12Hour(r.alarm.time)+' alarm go.' : ''), {icon:'&#9728;&#65039;', actionLabel:'Good morning', actionAction:'sleepGoodMorning', duration:9000});
};
ACTIONS.sleepGoodMorning = function(){
  sleepUpNow(); clearToasts && clearToasts();
  // Good morning, without the ring: straight to the briefing
  wakeRing = {startedAt:Date.now(), test:false, snoozed:false, mediaFailed:false, silent:true};
  ui.wakeMode = 'ring'; closeOtherOverlaysForWake(); showOverlay('wakeOverlay');
  wakeImUpNow();
};
// already up and using the app when the alarm comes round: it doesn't ring; a quiet note offers Good morning instead
function lastInputAt(){ return ui._lastInputAt || 0; }
['pointerdown', 'keydown', 'wheel'].forEach(function(ev){ document.addEventListener(ev, function(){ ui._lastInputAt = Date.now(); }, {capture:true, passive:true}); });
fireWake = (function(base){
  return function(opts){
    opts = opts || {};
    const m = state.modes.active;
    if(opts.scheduled && !(m && m.sleep) && Date.now() - lastInputAt() < 15*60000){
      showToast('Morning. You were already up, so I let the alarm go.', {icon:'&#9728;&#65039;', actionLabel:'Good morning', actionAction:'sleepGoodMorning', duration:15000});
      return;
    }
    return base.apply(this, arguments);
  };
})(fireWake);

// ---- "Op" / "Operator" / "Hey Operator": say it and he's listening ----
// While the app is in front and Op's quiet, it listens for its name (only that: nothing is sent anywhere
// until you've said it). "Hey Operator" → a soft chime and the mic opens; "Operator, what's on today?" → asked
// straight away. Off in Settings → Connections & data → Op. Never during sleep.
const HEY_RE = /^(?:hey|hi|yo|ok|okay)?[\s,]*(?:op|opp|operator|operater)\b[\s,.!?]*(.*)$/i;
const HW = {rec:null, on:false, t:0, fails:0, blocked:false, hitAt:0};
function heyOpOn(){ return state.profile.heyOp!==false && typeof aiCanHear==='function' && aiCanHear(); }
function heyQuietNow(){
  const m = state.modes && state.modes.active;
  return AI.listening || AI.busy || OV.speaking || OV.pending || document.hidden || !document.hasFocus() || (m && m.sleep) || (typeof inspBreathOn!=='undefined' && ui.inspBreath);
}
function heyStart(){
  if(HW.on || HW.blocked || !heyOpOn() || heyQuietNow()) return;
  const SR = window.SpeechRecognition || window.webkitSpeechRecognition; if(!SR) return;
  const rec = new SR(); rec.continuous = true; rec.interimResults = true; rec.maxAlternatives = 1; rec.lang = navigator.language || 'en-US';
  HW.rec = rec; HW.on = true;
  rec.onresult = function(e){
    for(let i = e.resultIndex; i < e.results.length; i++){
      const r = e.results[i], t = String(r[0].transcript||'').trim(), m = HEY_RE.exec(t);
      HW.fails = 0;
      if(!m) continue;
      // "operator" or "hey op" is enough on its own; a bare "op" waits for the end of the phrase (fewer false starts)
      if(!r.isFinal && !/operat|hey|yo/i.test(t)) continue;
      heyHeard(r.isFinal ? m[1] : ''); return;
    }
  };
  rec.onerror = function(e){ if(e && (e.error==='not-allowed' || e.error==='service-not-allowed')) HW.blocked = true; else HW.fails++; };
  rec.onend = function(){ HW.on = false; HW.rec = null; };
  try{ rec.start(); }catch(e){ HW.on = false; HW.rec = null; }
}
function heyStop(){ if(HW.rec){ const r = HW.rec; HW.rec = null; HW.on = false; try{ r.abort(); }catch(e){ try{ r.stop(); }catch(e2){} } } }
function heyHeard(rest){
  if(Date.now() - HW.hitAt < 2500) return; HW.hitAt = Date.now();
  heyStop();
  AI.closedAt = 0; OV.userCut = false; ui._opActiveAt = Date.now();
  if(typeof inspChime==='function'){ try{ const ctx = getAudioCtx(); if(ctx) fmBell(ctx, sfxOut(ctx), ctx.currentTime, fmHz(84), 0.03); }catch(e){} }
  if(typeof opLightPulse==='function') try{ opLightPulse(); }catch(e){}
  OV.cap = 'opBubText'; opBubShow();
  rest = String(rest||'').trim();
  if(rest.split(/\s+/).length >= 2) setTimeout(function(){ aiAsk(rest, 'opBubText'); }, 120);
  else { opCaption(pickOne(['Yeah?', 'I’m here.', 'Go ahead.', 'What’s up?'])); setTimeout(function(){ if(!AI.listening) aiListen('opBubText'); }, 300); }
}
// keep it running when it should be, and out of the way when it shouldn't
setInterval(function(){
  try{
    if(!heyOpOn() || heyQuietNow()){ heyStop(); return; }
    if(HW.fails > 12){ HW.fails = 0; HW.t = Date.now() + 30000; }   // (offline or the mic's busy: back off a bit)
    if(!HW.on && Date.now() > HW.t) heyStart();
  }catch(e){}
}, 1500);
ACTIONS.heyOpToggle = function(){ state.profile.heyOp = state.profile.heyOp===false; persist('profile'); if(state.profile.heyOp===false) heyStop(); renderView(); };
operatorSettingsHtml = (function(base){
  return function(){
    const on = state.profile.heyOp!==false;
    return base.apply(this, arguments)+'<div class="card section op-settings"><div class="snd-h"><div><div class="section-title" style="margin:0;">&#128483;&#65039; “Hey Operator”</div><div class="kpi-sub">Say “Op” or “Hey Operator” to talk.'+(HW.blocked ? ' <b>Allow the mic for Operator.</b>' : '')+'</div></div>'+
      '<label class="ws-switch"><input type="checkbox" data-action="heyOpToggle" '+(on ? 'checked' : '')+'><span></span></label></div></div>';
  };
})(operatorSettingsHtml);
