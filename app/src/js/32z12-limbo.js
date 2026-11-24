// ============ LIMBO: NOT WORKING, NOT RESTING, WORK STILL ON YOU ============
// Some days you're in between: you don't feel like working, you don't feel like anything good, and the
// pressure's still there. The way out is usually small and easy: cook a meal, clean up, a walk, a shower.
// Inspiration has a Reset for exactly that: pick one, it runs on a gentle timer, you come back, it's
// logged, and the next step is right there: lock in for 25.
// Op knows this about you. When he checks on your work and you're stuck (not a real reason, just limbo),
// he stays on you but gives you a way out: one reset, named, time-boxed, then straight back to it. He can
// start the reset for you, and when it's over he's there to get you locked in.

const RESET_MIN = {walk:15, bath:10, clean:15, cook:25, mealprep:30, stretch:10, sun:10, meditate:10, nature:20, call:10, listen:10, cozy:15};
// your resets: what you told Op resets you, then the classics (cook, clean, a walk, a shower), then what you log most
function resetActs(){
  const out = [], seen = {}, add = function(a){ if(a && !seen[a.id] && (typeof inspHidden!=='function' || inspHidden().indexOf(a.id) < 0)){ seen[a.id] = 1; out.push(a); } };
  (typeof aboutResetActs==='function' ? aboutResetActs() : []).forEach(add);
  ['cook', 'clean', 'walk', 'bath'].forEach(function(id){ add(INSP_ACTS.find(function(a){ return a.id===id; })); });
  const n = {}; inspStore().log.slice(-200).forEach(function(x){ n[x.act] = (n[x.act]||0) + 1; });
  Object.keys(n).sort(function(a, b){ return n[b] - n[a]; }).forEach(function(id){ if(out.length < 6) add(inspActs().find(function(a){ return a.id===id; })); });
  ['stretch', 'sun', 'meditate'].forEach(function(id){ if(out.length < 6) add(INSP_ACTS.find(function(a){ return a.id===id; })); });
  return out.slice(0, 6);
}
function resetMinutes(a){ return RESET_MIN[a.id] || 15; }
function resetNow(){ const r = state.profile.inspReset; return r && r.date===todayStr() ? r : null; }
function resetLeftMs(r){ return Math.max(0, r.start + r.min*60000 - Date.now()); }
function resetStart(id, min){
  const a = inspActs().find(function(x){ return x.id===id; }) || INSP_ACTS.find(function(x){ return x.id===id; }); if(!a) return null;
  state.profile.inspReset = {id:a.id, label:a.label, e:a.e, min:Math.max(5, Math.min(60, Number(min) || resetMinutes(a))), start:Date.now(), date:todayStr()};
  persist('profile'); ui.inspResetSheet = false;
  if(typeof inspChime==='function') inspChime(3);
  return state.profile.inspReset;
}
// done (back early, or the time's up): it's logged, and the way back to work is right there
function resetFinish(){
  const r = resetNow(); if(!r || r.doneAt) return;
  r.doneAt = Date.now(); const mins = Math.max(1, Math.round((r.doneAt - r.start)/60000));
  if(typeof inspLogAct==='function') inspLogAct(r.id, {min:mins, note:'A reset'});
  persist('profile');
  if(typeof inspChime==='function') inspChime(2);
  if(typeof inspRipple==='function') inspRipple();
}
ACTIONS.inspResetOpen = function(){ ui.inspResetSheet = !ui.inspResetSheet; ui.inspSheet = false; inspRender(); };
ACTIONS.inspResetMin = function(el, e, id){ ui.inspResetMinPick = Number(id); inspRender(); };
ACTIONS.inspResetGo = function(el, e, id){ resetStart(id, ui.inspResetMinPick); ui.inspResetMinPick = null; inspRender(); };
ACTIONS.inspResetDone = function(){ resetFinish(); inspRender(); };
ACTIONS.inspResetCancel = function(){ state.profile.inspReset = null; persist('profile'); if(typeof inspLetGoChime==='function') inspLetGoChime(); inspRender(); };
ACTIONS.inspResetDismiss = function(){ const r = resetNow(); if(r) r.dismissed = true; persist('profile'); inspRender(); };
ACTIONS.inspResetLockIn = function(){
  const r = resetNow(); if(r) r.dismissed = true; persist('profile');
  if(typeof closeInspire==='function') closeInspire();
  setTimeout(function(){ if(typeof openLockSeq==='function') openLockSeq({minutes:25}); }, 350);
};
function resetSheetHtml(){
  const acts = resetActs(), pick = ui.inspResetMinPick;
  return '<div class="insp-sheet-bg" data-action="inspResetOpen"></div><div class="insp-sheet irs">'+
    '<div class="izs-h">Stuck in between?</div><p class="irs-sub">Not working, not resting, and it’s still on you. Do one easy thing for your head, then get back to it.</p>'+
    '<div class="irs-grid">'+acts.map(function(a, i){ return '<button class="irs-t c-'+a.cat+'" data-action="inspResetGo" data-id="'+a.id+'" style="--i:'+i+'"><span class="irs-e">'+a.e+'</span><b>'+escapeHtml(a.label)+'</b><small>'+(pick || resetMinutes(a))+' min</small></button>'; }).join('')+'</div>'+
    '<div class="irs-min"><small>How long</small>'+[['', 'Its own'], ['10', '10 min'], ['15', '15'], ['20', '20'], ['30', '30']].map(function(m){ return '<button class="isx-s'+((pick ? String(pick) : '')===m[0] ? ' is-on' : '')+'" data-action="inspResetMin" data-id="'+m[0]+'">'+m[1]+'</button>'; }).join('')+'</div>'+
  '</div>';
}
function resetCardHtml(){
  const r = resetNow(); if(!r || r.dismissed) return '';
  if(r.doneAt) return '<div class="irc is-done"><span class="irc-e">'+r.e+'</span><div class="irc-m"><b>Feel a little lighter?</b><small>'+escapeHtml(r.label)+' &middot; logged</small></div>'+
    '<button class="irc-go" data-action="inspResetLockIn">&#128274; Lock in for 25</button><button class="irc-x" data-action="inspResetDismiss" title="In a bit">In a bit</button></div>';
  const left = resetLeftMs(r), pct = 1 - left/(r.min*60000), C = 2*Math.PI*17;
  return '<div class="irc"><span class="irc-ring"><svg viewBox="0 0 40 40" width="40" height="40"><circle cx="20" cy="20" r="17" class="irc-tr"/><circle cx="20" cy="20" r="17" class="irc-fl" stroke-dasharray="'+(C*pct).toFixed(1)+' '+C.toFixed(1)+'" transform="rotate(-90 20 20)"/></svg><i>'+r.e+'</i></span>'+
    '<div class="irc-m"><b>'+escapeHtml(r.label)+'</b><small><span id="ircLeft">'+fmtClockLeft(left)+'</span> left &middot; then back to it</small></div>'+
    '<button class="irc-go" data-action="inspResetDone">I’m back</button><button class="irc-x" data-action="inspResetCancel" title="Cancel">&#10005;</button></div>';
}
function fmtClockLeft(ms){ const s = Math.ceil(ms/1000), m = Math.floor(s/60); return m+':'+String(s % 60).padStart(2, '0'); }
inspHtml = (function(base){
  return function(){
    let h = base.apply(this, arguments);
    h = h.replace('<button class="izh-log" data-action="inspLogSheet">Log something</button>', '<button class="izh-log" data-action="inspLogSheet">Log something</button><button class="izh-reset" data-action="inspResetOpen">&#8635; Stuck? Reset</button>');
    return h+resetCardHtml()+(ui.inspResetSheet ? resetSheetHtml() : '');
  };
})(inspHtml);
// the clock, and what happens when the time's up
setInterval(function(){
  const r = resetNow(); if(!r || r.doneAt || r.dismissed) return;
  const left = resetLeftMs(r), el = document.getElementById('ircLeft');
  if(el) el.textContent = fmtClockLeft(left);
  if(left > 0) return;
  resetFinish();
  if(typeof inspOpenNow==='function' && inspOpenNow()){ inspRender(); return; }
  // you left Inspiration to go do it: Op's there when the time's up
  if(state.focus.activeSession) return;
  const line = pickOne(['That’s your '+r.label.toLowerCase()+' done. Feel better? Let’s lock in for 25. Want me to start it?', 'Time’s up on the reset. You’ve got the head for it now: 25 minutes, locked in. Should I start it?', 'Good. That was the easy part. Now 25 minutes on the real thing. Want me to lock you in?']);
  AI.history.push({role:'assistant', content:line}); if(AI.history.length > 16) AI.history = AI.history.slice(-16);
  OV.cap = 'opBubText'; opBubShow(); if(opVoiceOn()) opSay(line, {cap:'opBubText'}); else opCaption(line);
}, 1000);

// ---- Op knows about limbo ----
function limboResetLine(){ return resetActs().slice(0, 5).map(function(a){ return a.label.toLowerCase()+' ('+resetMinutes(a)+' min)'; }).join(', '); }
const LIMBO_RE = /\b(don.?t feel like|not feeling it|no motivation|unmotivated|can.?t focus|can.?t get (going|started)|stuck|drained|burn(ed|t) out|tired|exhausted|lazy|bored|meh|scroll|tiktok|instagram|youtube|procrastinat|putting it off|in a funk|out of it|limbo)\b/i;
function limboSays(text){ return LIMBO_RE.test(String(text||'')); }
aiContext = (function(base){
  return function(){
    const r = resetNow();
    return base.apply(this, arguments)+'\nHis resets (easy things that clear his head and get him back to work; he often forgets them): '+limboResetLine()+'.'+
      ' He sometimes ends up in limbo: not working, not resting, pulled toward bad habits, with the pressure of work still on him. When that happens, or when you check on his work and he’s stuck without a real reason, be pushy but graceful: name one reset from his list with a time box, then a firm way back (lock in for 25). Offer to start it with start_reset.'+
      (r && !r.doneAt ? ' Right now he’s doing a reset: '+r.label+', '+Math.ceil(resetLeftMs(r)/60000)+' minutes left.' : r && r.doneAt && Date.now() - r.doneAt < 30*60000 ? ' He just finished a reset ('+r.label+'). Now is the moment to get him locked in.' : '');
  };
})(aiContext);
OP_TOOLS.push({name:'start_reset', description:'Start a short reset for him on the Inspiration page (cooking, cleaning, a walk, a shower or another of his resets) with a gentle timer. When it ends, you get him back to work. Use it when he’s in limbo and says yes to a reset.', input_schema:{type:'object', properties:{idea:{type:'string', description:'which reset, in plain words, e.g. walk, shower, clean, cook'}, minutes:{type:'integer', description:'how long, 5 to 60'}}, required:['idea']}});
function resetFind(words){
  const w = String(words||'').toLowerCase(), all = resetActs().concat(inspActs());
  const syn = {shower:'bath', bath:'bath', cook:'cook', cooking:'cook', meal:'cook', clean:'clean', cleaning:'clean', tidy:'clean', walk:'walk', stroll:'walk', stretch:'stretch', yoga:'stretch', sun:'sun', meditate:'meditate'};
  const k = Object.keys(syn).find(function(x){ return w.indexOf(x) >= 0; });
  return (k && all.find(function(a){ return a.id===syn[k]; })) || all.find(function(a){ return a.label.toLowerCase().indexOf(w) >= 0 || w.indexOf(a.label.toLowerCase()) >= 0; }) || null;
}
opRunTool = (function(base){
  return function(name, x){
    if(name!=='start_reset') return base.apply(this, arguments);
    const a = resetFind(x && x.idea); if(!a) throw new Error('no reset like "'+(x && x.idea)+'"; his resets: '+limboResetLine());
    const r = resetStart(a.id, x && x.minutes);
    if(typeof openInspire==='function' && !(typeof inspOpenNow==='function' && inspOpenNow())) openInspire(); else inspRender();
    return 'started: '+r.label+' for '+r.min+' minutes (it’s on his Inspiration page with a timer)';
  };
})(opRunTool);
// no AI key: a check-in answer that sounds like limbo still gets a way out (used by the check-in's judge)
function limboFallback(){ const a = resetActs()[0]; return a ? 'Sounds like you’re stuck in between. Here’s the way out: '+a.label.toLowerCase()+', '+resetMinutes(a)+' minutes, then we lock in for 25. Want me to start it?' : ''; }
// Esc closes whatever small panel is open (the wind, sounds, Reset) before it closes Inspiration
window.addEventListener('keydown', function(e){
  if(e.key!=='Escape' || typeof inspOpenNow!=='function' || !inspOpenNow()) return;
  if(ui.inspWindOpen || ui.inspSfxOpen || ui.inspResetSheet){ e.stopPropagation(); e.preventDefault(); ui.inspWindOpen = false; ui.inspSfxOpen = false; ui.inspResetSheet = false; inspRender(); }
}, true);
