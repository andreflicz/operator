// ---- Round 57: Andre's fix list (Oct 31) ----
// Playbook tasks stay where you put them (32z5d), health uses "behind the guide" (32z5d), Op never refuses and never ends
// your session on his own (32z40, 21), the bedtime goodnight is warm and short (32z52), break starts for real (32z17).
// The rest layers on here.

// ---- the reply box opens when Op asks a question, also with push to talk on ----
aiAutoListen = (function(base){
  return function(cap){
    try{
      if(opOn() && !opHoldBack() && opTalkMode()==='ptt' && OPRT.state==='off' && !AI.listening && !AI.busy){
        OV.cap = cap || 'opBubText'; opBubShow();
        if(typeof aiTypeFocus==='function') setTimeout(function(){ try{ aiTypeFocus(); }catch(e){} }, 60);
        return;
      }
    }catch(e){}
    return base.apply(this, arguments);
  };
})(aiAutoListen);

// ---- one reply, said once: the same line twice in a row within a few seconds is dropped ----
opSay = (function(base){
  let last = {t:'', at:0};
  return function(text){
    const t = String(text == null ? '' : text).trim();
    if(t && t===last.t && Date.now() - last.at < 8000) return Promise.resolve(false);
    last = {t:t, at:Date.now()};
    return base.apply(this, arguments);
  };
})(opSay);

// ---- talking to Op counts as being here (it only matters if you turned "stop when I'm away" on) ----
checkAwayFromSession = (function(base){
  return function(){
    try{ if(OPRT.state!=='off' || AI.listening || AI.busy || (OPX && OPX.userAt && Date.now() - OPX.userAt < awayLimitMs())) return; }catch(e){}
    return base.apply(this, arguments);
  };
})(checkAwayFromSession);
