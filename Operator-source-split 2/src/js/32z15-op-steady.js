// ============ OP NEVER GETS STUCK (round 29) ============
// Op used to go quiet for good after some lines (one said on Inspiration, then you left): a voice that
// never reported it had finished, a mic that never closed, or a reply that never came left him "busy",
// and every check-in, nudge and tap waits until he isn't. Now nothing holds him longer than it should:
// a line that runs well past its length is let go (its words stay in the bubble), and so is a mic or a
// reply that hangs. And tapping his light (or closing the bubble) only cuts what he's saying now; it
// doesn't stop the mic opening on his next question.
const OPS = {busySince:0, listenSince:0, lastT:-1, stillSince:0};
opSay = (function(base){
  return function(text, opts){
    opts = opts || {};
    OV.sayAt = Date.now(); OV.sayText = speakable(text);
    // (a new line from Op is a new moment: an earlier "stop" was for the last one)
    if(opts.cap==='opBubText' && OV.userCut && Date.now() - (OV.userCutAt||0) > 1500) OV.userCut = false;
    return base(text, opts);
  };
})(opSay);
// when you cut Op off, it's remembered as *when*
ACTIONS.opLightTap = (function(base){ return function(){ const r = base.apply(this, arguments); if(OV.userCut) OV.userCutAt = Date.now(); return r; }; })(ACTIONS.opLightTap);
ACTIONS.opBubClose = (function(base){ return function(){ const r = base.apply(this, arguments); OV.userCutAt = Date.now(); return r; }; })(ACTIONS.opBubClose);
// whenever Op starts talking into the bubble, the bubble is up
opStarted = (function(base){ return function(tok, opts){ const r = base.apply(this, arguments); if(OV.cap==='opBubText' && typeof opBubShow==='function') opBubShow(); return r; }; })(opStarted);
function opLineLimit(){ const n = String(OV.sayText||'').split(/\s+/).length; return Math.max(20000, n*700/Math.max(0.5, opSpeed()) + 15000); }
function opSteadyTick(){
  const now = Date.now();
  // a line that should have ended a while ago
  if((OV.speaking || OV.pending) && OV.sayAt && now - OV.sayAt > opLineLimit()){
    const a = OV.audio, moving = a && !a.paused && !a.ended && a.currentTime!==OPS.lastT;
    OPS.lastT = a ? a.currentTime : -1;
    if(!moving){
      const said = OV.sayText;
      try{ if(a) a.pause(); }catch(e){}
      try{ speechSynthesis.cancel(); }catch(e){}
      OV.audio = null; OV.speaking = false; OV.pending = false; OV.token++; OV.lastEnd = now; OV.sayAt = 0;
      document.body.classList.remove('op-speaking');
      if(typeof opDuck==='function') opDuck(false);
      if(said && OV.cap==='opBubText'){ const el = document.getElementById('opBubText'); if(el && !el.textContent) capSet(el, said); if(typeof opBubHideLater==='function') opBubHideLater(); }
    }
  }
  // a mic that's been open far longer than anyone talks
  if(AI.listening){ if(!OPS.listenSince) OPS.listenSince = now; else if(now - OPS.listenSince > 80000){ OPS.listenSince = 0; if(AI.cancelListen) AI.cancelListen(); else { AI.listening = false; AI.sendNow = null; } if(typeof aiUiRefresh==='function') aiUiRefresh(); } }
  else OPS.listenSince = 0;
  // a reply that never came back (each call gives up at 55s; five rounds of tools at most)
  if(AI.busy){ if(!OPS.busySince) OPS.busySince = now; else if(now - OPS.busySince > 300000){ OPS.busySince = 0; AI.busy = false; if(typeof aiUiRefresh==='function') aiUiRefresh(); } }
  else OPS.busySince = 0;
}
setInterval(function(){ try{ opSteadyTick(); }catch(e){} }, 2000);
// leaving Inspiration (or any full-screen page) puts a bubble that's up back where it belongs
closeInspire = (function(base){ return function(){ const r = base.apply(this, arguments); const b = document.getElementById('opBub'); if(b && typeof opBubPlace==='function') opBubPlace(b); return r; }; })(closeInspire);
