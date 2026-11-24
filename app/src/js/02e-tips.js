
// ============ "?" HELP TIPS ============
// Explanations live behind a small "?" — hover it (or click it) to read. Pages stay down to what
// you act on; the how-and-why is one hover away. One shared bubble, positioned on the fly so it's
// never clipped by a scrolling modal.
function tip(text, cls){
  const t = escapeHtml(text);
  return '<span class="qtip'+(cls?' '+cls:'')+'" role="img" aria-label="'+t+'" data-tip="'+t+'">?</span>';
}
let tipEl = null, tipFor = null;
function showTip(el){
  if(tipFor===el && tipEl && tipEl.classList.contains('on')) return;
  if(!tipEl){ tipEl = document.createElement('div'); tipEl.className = 'qtip-pop'; tipEl.setAttribute('role', 'tooltip'); document.body.appendChild(tipEl); }
  if(tipFor && tipFor!==el) tipFor.classList.remove('is-on');
  tipFor = el;
  el.classList.add('is-on');
  tipEl.textContent = el.getAttribute('data-tip') || '';
  tipEl.classList.remove('on', 'below');
  const r = el.getBoundingClientRect(), w = tipEl.offsetWidth, h = tipEl.offsetHeight;
  const left = Math.max(8, Math.min(window.innerWidth-w-8, Math.round(r.left+r.width/2-w/2)));
  let top = Math.round(r.top-h-8);
  if(top<8){ top = Math.round(r.bottom+8); tipEl.classList.add('below'); }
  tipEl.style.left = left+'px'; tipEl.style.top = top+'px';
  requestAnimationFrame(function(){ if(tipFor===el) tipEl.classList.add('on'); });
}
function hideTip(){
  if(tipFor) tipFor.classList.remove('is-on');
  tipFor = null;
  if(tipEl) tipEl.classList.remove('on');
}
document.addEventListener('mouseover', function(e){
  const q = e.target.closest && e.target.closest('.qtip');
  if(q && q!==tipFor) showTip(q);
});
document.addEventListener('mouseout', function(e){
  const q = e.target.closest && e.target.closest('.qtip');
  if(q && q===tipFor && !q.contains(e.relatedTarget)) hideTip();
});
// Clicking "?" only shows the tip — it never ticks the checkbox or opens the card it sits in.
document.addEventListener('click', function(e){
  const q = e.target.closest && e.target.closest('.qtip');
  if(!q){ if(tipFor) hideTip(); return; }
  e.preventDefault(); e.stopPropagation();
  showTip(q);
}, true);
window.addEventListener('scroll', function(){ if(tipFor) hideTip(); }, {capture:true, passive:true});
window.addEventListener('keydown', function(e){ if(e.key==='Escape' && tipFor) hideTip(); }, true);
afterRenderHooks.push(function(){ if(tipFor && !tipFor.isConnected) hideTip(); });
