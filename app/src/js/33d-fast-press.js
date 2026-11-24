
// ============ RESPOND ON PRESS ============
// Switching pages and tabs happens the moment the mouse button goes down — not when it comes back
// up — which takes the 80–150ms a click is held off every switch. The real click that follows is
// recognised and ignored, so nothing runs twice.
const FAST_ACTIONS = {nav:1, businessTab:1, settingsTab:1, personalTab:1, focusMainTab:1, focusTasksSubTab:1, journalMode:1, analyticsRange:1, crmView:1, healthTab:1};
let fastPress = null;
function pressSig(el){ return [el.dataset.action, el.dataset.view||'', el.dataset.tab||'', el.dataset.id||'', el.dataset.kind||''].join('|'); }
document.addEventListener('pointerdown', function(e){
  if(e.button!==0 || e.metaKey || e.ctrlKey || e.shiftKey || e.altKey) return;
  const el = e.target.closest && e.target.closest('[data-action]');
  if(!el || !FAST_ACTIONS[el.dataset.action] || el.disabled) return;
  fastPress = {sig:pressSig(el), at:Date.now()};
  el.dispatchEvent(new MouseEvent('click', {bubbles:true, cancelable:true}));
}, true);
document.addEventListener('click', function(e){
  if(!fastPress || !e.isTrusted) return;
  const fp = fastPress; fastPress = null;
  if(Date.now()-fp.at > 1500) return;
  const el = e.target.closest && e.target.closest('[data-action]');
  if(el && pressSig(el)===fp.sig){ e.stopImmediatePropagation(); e.preventDefault(); }
}, true);
// "Show more" buttons marked data-autoload press themselves as they scroll into view.
let autoloadIO = null;
afterRenderHooks.push(function(){
  const btns = document.querySelectorAll('[data-autoload]'); if(!btns.length || !('IntersectionObserver' in window)) return;
  if(!autoloadIO) autoloadIO = new IntersectionObserver(function(entries){
    entries.forEach(function(en){ if(en.isIntersecting && en.target.isConnected && !en.target._fired){ en.target._fired = true; autoloadIO.unobserve(en.target); setTimeout(function(){ en.target.click(); }, 0); } });
  }, {rootMargin:'600px 0px'});
  btns.forEach(function(b){ if(!b._observed){ b._observed = true; autoloadIO.observe(b); } });
});
