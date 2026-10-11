// ============ OP, ALWAYS THERE: A SMALL LIGHT ============
// Op lives in a little light in the bottom-left corner, next to the pill that shows what you're on.
// It's always there: it drifts and breathes when it's quiet, brightens while Op talks, ripples while
// it listens and shimmers while it thinks. Click it to talk (click again to send right away, or to
// stop Op mid-sentence). What Op says shows in a small bubble just above it, never over the page's
// buttons, and it scrolls instead of growing when Op says a lot.
function opLightEnsure(){
  let l = document.getElementById('opLight');
  if(!l){
    l = document.createElement('button'); l.id = 'opLight'; l.className = 'op-light'; l.setAttribute('data-action', 'opLightTap');
    l.setAttribute('aria-label', 'Op'); l.innerHTML = '<span class="ol-halo"></span><span class="ol-core"></span><span class="ol-spark"></span>';
    document.body.appendChild(l);
  }
  return l;
}
function opLightState(){
  if(typeof AI==='undefined' || typeof OV==='undefined') return;
  const l = opLightEnsure();
  const st = AI.listening ? 'listen' : (OV.speaking || OV.pending) ? 'speak' : AI.busy ? 'think' : 'idle';
  if(l.dataset.st!==st) l.dataset.st = st;
  l.title = st==='listen' ? 'Listening… click to send' : st==='speak' ? 'Click to stop' : 'Op: click to talk';
  // Good morning has its own blue light; the corner one steps aside there
  const gm = typeof overlayOpen==='function' && overlayOpen('wakeOverlay');
  l.classList.toggle('is-away', !!gm);
  // (Good morning's blue light shows the same: listening, talking, thinking)
  document.querySelectorAll('.br-voice-dot').forEach(function(d){ if(d.dataset.st!==st) d.dataset.st = st; });
  document.body.classList.toggle('op-near-pill', !!document.querySelector('#activityPill:not(.is-hidden)'));
}
setInterval(opLightState, 250);
afterRenderHooks.push(function(){ try{ opLightState(); }catch(e){} });
ACTIONS.opLightTap = function(){
  if(AI.listening){ if(AI.sendNow) AI.sendNow(); return; }
  OV.userCut = true;
  if(OV.speaking || OV.pending){ opStop(); return; }
  OV.cap = 'opBubText'; opBubShow(); aiListen('opBubText');
};
// full-screen pages (the work preview, Lock in's sequence): the light and the bubble tuck into the
// bottom-left corner, side by side, away from the page's buttons
setInterval(function(){
  const ov = typeof overlayOpen==='function' && (overlayOpen('planOverlay') || overlayOpen('lockSeqOverlay'));
  if(document.body.classList.contains('op-ov')!==!!ov) document.body.classList.toggle('op-ov', !!ov);
}, 250);
// the bubble can be dragged by its top line anywhere it's out of the way; it stays where you put it
// (double-click the top line to put it back)
function opBubPlace(b){
  b = b || document.getElementById('opBub'); if(!b) return;
  const p = state.focus && state.focus.opBubPos;
  if(!p){ ['left', 'top', 'bottom'].forEach(function(k){ b.style.removeProperty(k); }); b.classList.remove('is-moved'); return; }
  const w = b.offsetWidth || 380, h = b.offsetHeight || 150;
  const x = Math.max(8, Math.min(window.innerWidth - w - 8, p.x * window.innerWidth)), y = Math.max(8, Math.min(window.innerHeight - h - 8, p.y * window.innerHeight));
  b.style.setProperty('left', x+'px', 'important'); b.style.setProperty('top', y+'px', 'important'); b.style.setProperty('bottom', 'auto', 'important');
  b.classList.add('is-moved');
}
document.addEventListener('mousedown', function(e){
  const h = e.target.closest && e.target.closest('#opBub .op-bub-h'); if(!h || e.target.closest('button') || e.button!==0) return;
  const b = document.getElementById('opBub'), r = b.getBoundingClientRect(), dx = e.clientX - r.left, dy = e.clientY - r.top;
  e.preventDefault(); b.classList.add('is-dragging');
  const move = function(ev){
    const x = Math.max(8, Math.min(window.innerWidth - r.width - 8, ev.clientX - dx)), y = Math.max(8, Math.min(window.innerHeight - r.height - 8, ev.clientY - dy));
    b.style.setProperty('left', x+'px', 'important'); b.style.setProperty('top', y+'px', 'important'); b.style.setProperty('bottom', 'auto', 'important');
  };
  const up = function(){
    document.removeEventListener('mousemove', move); document.removeEventListener('mouseup', up); b.classList.remove('is-dragging');
    const nr = b.getBoundingClientRect();
    if(Math.abs(nr.left - r.left) + Math.abs(nr.top - r.top) < 3) return;
    state.focus.opBubPos = {x:nr.left / window.innerWidth, y:nr.top / window.innerHeight}; persist('focus'); b.classList.add('is-moved');
  };
  document.addEventListener('mousemove', move); document.addEventListener('mouseup', up);
});
document.addEventListener('dblclick', function(e){
  if(!(e.target.closest && e.target.closest('#opBub .op-bub-h'))) return;
  state.focus.opBubPos = null; persist('focus'); opBubPlace();
});
window.addEventListener('resize', function(){ opBubPlace(); });
