// ================= Round 79 =================
// Mind view, opening things: a click picks a planet (it glides to it and its card shows); Open, a double-click or
// Enter opens it. Opening shows the whole app (its sidebar and every tab) over the galaxy, which stops drawing
// while you're in there; "Map" at the top of the sidebar or Esc takes you back. Anything that changes page while
// you're on the map (a quest's Do it, ⌘K, Op) opens the app the same way, so nothing changes out of sight.

// the sidebar gets a way back to the map
function r79MapNav(){
  const nav = document.getElementById('sidebarNav'); if(!nav || document.getElementById('r79MapNav')) return;
  const b = document.createElement('button'); b.id = 'r79MapNav'; b.className = 'nav-item nav-map'; b.dataset.action = 'r73mSurface';
  b.title = 'Back to the Mind view (Esc)'; b.innerHTML = '<span class="nav-icon">&#9678;</span><span class="nav-label">Map</span><kbd>Esc</kbd>';
  const first = nav.querySelector('.nav-item'); nav.insertBefore(b, first);
}
r73Dive = (function(base){
  return function(go){
    const r = base.apply(this, arguments);
    try{ r79MapNav(); MIND.viewSeen = ui.view; }catch(e){}
    return r;
  };
})(r73Dive);
r73Surface = (function(base){
  return function(){
    const r = base.apply(this, arguments);
    try{ MIND.viewSeen = ui.view; }catch(e){}
    return r;
  };
})(r73Surface);
// a page change that happens while you're looking at the map opens the app (otherwise it changes out of sight)
renderView = (function(base){
  return function(){
    const r = base.apply(this, arguments);
    try{
      if(MIND.booted && !MIND.dive && !MIND.r79In && MIND.viewSeen && ui.view !== MIND.viewSeen){
        MIND.r79In = true;
        try{ r73Dive({view:ui.view}); }finally{ MIND.r79In = false; }
      }
      if(MIND.booted && !MIND.viewSeen) MIND.viewSeen = ui.view;
    }catch(e){}
    return r;
  };
})(renderView);

// ================= Round 79: asleep in the background =================
// The Mac app keeps the page "visible" even when its window is closed (so alarms fire on time), which meant every
// animation kept running behind a hidden window. Now the app tells the page when it's out of sight, and the page
// goes to sleep: animations stop, the decorations come off, nothing is drawn frame by frame. After two minutes
// hidden it also lets go of the page itself (it's rebuilt the moment you open the window). What keeps running:
// the lock-in clock and the menu bar timer, breaks, alarms and reminders, notifications, the phone and the tags.
const R79S = {shown:true, asleep:false, deep:false, t:0, q:[]};
function r79Sleep(on){
  if(R79S.asleep===on) return; R79S.asleep = on;
  document.body.classList.toggle('op-asleep', on);
  try{ r76IdleSet(on ? true : !(document.hasFocus && document.hasFocus())); }catch(e){}
  if(on){
    try{ const l = document.getElementById('holFx'); if(l) l.remove(); }catch(e){}
    try{ if(typeof sharedAudioCtx!=='undefined' && sharedAudioCtx && sharedAudioCtx.state==='running') sharedAudioCtx.suspend(); }catch(e){}
    clearTimeout(R79S.t); R79S.t = setTimeout(r79Deep, 120000);
  } else {
    clearTimeout(R79S.t);
    try{ if(typeof sharedAudioCtx!=='undefined' && sharedAudioCtx && sharedAudioCtx.state==='suspended') sharedAudioCtx.resume(); }catch(e){}
    const q = R79S.q.splice(0); q.forEach(function(cb){ try{ R79S.raf(cb); }catch(e){} });
    if(R79S.deep){ R79S.deep = false; document.body.classList.remove('op-deep'); }
    try{ renderView(); holApply(); }catch(e){}
  }
}
function r79Deep(){
  if(!R79S.asleep || (typeof R74CV!=='undefined' && R74CV.ext)) return;
  R79S.deep = true; document.body.classList.add('op-deep');
  try{ const v = document.getElementById('viewRoot'); if(v) v.innerHTML = ''; }catch(e){}
  try{ if(typeof MIND!=='undefined' && MIND.booted){ MIND.nodes = MIND.nodes || []; MIND.built = 0; } }catch(e){}
  // (sounds start a fresh one when an alarm or a ping needs it)
  try{ if(typeof sharedAudioCtx!=='undefined' && sharedAudioCtx && sharedAudioCtx.state!=='closed'){ sharedAudioCtx.close(); } }catch(e){}
  try{ if(window.gc) window.gc(); }catch(e){}
}
// nothing drawn frame by frame while asleep (it picks up where it left off when the window's back)
(function(){
  const prev = window.requestAnimationFrame.bind(window); R79S.raf = prev;
  window.requestAnimationFrame = function(cb){
    if(R79S.asleep && !(typeof R74CV!=='undefined' && R74CV.ext)){ if(R79S.q.length < 64) R79S.q.push(cb); return 0; }
    return prev(cb);
  };
})();
// while it's in a deep sleep, the page isn't rebuilt behind the closed window (the data still changes; it's drawn on wake)
renderView = (function(base){ return function(){ if(R79S.deep) return; return base.apply(this, arguments); }; })(renderView);
function r79WinState(st){
  st = st || {};
  R79S.shown = st.shown!==false;
  r79Sleep(!R79S.shown);
  if(R79S.shown){ try{ r76IdleCheck(); }catch(e){} }
  return {asleep:R79S.asleep, deep:R79S.deep};
}
// (the Mac app reaches the page through operatorPage; later rounds rebuild it, so this hooks on after them)
function r79Attach(){ try{ const P = window.operatorPage; if(P && !P.winState) window.operatorPage = Object.freeze(Object.assign({}, P, {winState:r79WinState})); }catch(e){} }
r79Attach(); setTimeout(r79Attach, 0); setTimeout(r79Attach, 1500);
