
// ============ ACTION + MODAL REGISTRY ============
// Newer features register their click actions and modals here instead of growing the big
// switch in 33-event-delegation.js / the overlay list in renderView. Same dispatch pattern:
// an element with data-action="x" calls ACTIONS.x(el, event, el.dataset.id).
const ACTIONS = {};
const MODAL_RENDERERS = []; // [overlayId, renderIntoFn] — re-rendered by renderView while open
const afterRenderHooks = []; // run after every renderView (e.g. mounting the board canvas)
function registerModal(overlayId, fn){ MODAL_RENDERERS.push([overlayId, fn]); }
function showOverlay(id){ const o=document.getElementById(id); if(o) o.classList.remove('hidden'); return o; }
function hideOverlay(id){ const o=document.getElementById(id); if(o) o.classList.add('hidden'); }
function overlayOpen(id){ const o=document.getElementById(id); return !!(o && !o.classList.contains('hidden')); }
// Coalesces several "something finished loading" re-renders into one frame.
let renderScheduled = false;
function scheduleRender(){
  if(renderScheduled) return;
  renderScheduled = true;
  requestAnimationFrame(function(){ renderScheduled = false; renderView(); });
}
