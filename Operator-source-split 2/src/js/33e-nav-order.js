
// ============ MOVABLE SIDEBAR TABS ============
// Drag a sidebar tab up or down to put it where you want it; the order is remembered.
const NAV_VIEWS = ['today', 'focus', 'business', 'calendar', 'personal', 'settings'];
function navOrder(){
  const saved = arr(state.profile.navOrder).filter(function(v){ return NAV_VIEWS.indexOf(v)>=0; });
  NAV_VIEWS.forEach(function(v){ if(saved.indexOf(v)<0) saved.push(v); });
  return saved;
}
function navItems(){ return Array.prototype.slice.call(document.querySelectorAll('#sidebarNav > .nav-item')); }
function applyNavOrder(){
  const items = navItems(); if(!items.length) return;
  const anchor = items[0].previousElementSibling;
  const byView = {}; items.forEach(function(b){ byView[b.dataset.view] = b; });
  let after = anchor;
  navOrder().forEach(function(v){
    const b = byView[v]; if(!b) return;
    if(after ? after.nextElementSibling!==b : b.parentNode.firstElementChild!==b) b.parentNode.insertBefore(b, after ? after.nextElementSibling : b.parentNode.firstElementChild);
    after = b;
  });
}
let navDrag = null;
document.addEventListener('pointerdown', function(e){
  if(e.button!==0) return;
  const b = e.target.closest && e.target.closest('#sidebarNav > .nav-item'); if(!b) return;
  navDrag = {el:b, y:e.clientY, moving:false};
}, true);
document.addEventListener('pointermove', function(e){
  if(!navDrag) return;
  if(!navDrag.moving){
    if(Math.abs(e.clientY - navDrag.y) < 6) return;
    navDrag.moving = true; navDrag.el.classList.add('nav-dragging'); document.body.classList.add('nav-sorting');
  }
  const others = navItems().filter(function(x){ return x!==navDrag.el; });
  let before = null;
  for(let i=0;i<others.length;i++){ const r = others[i].getBoundingClientRect(); if(e.clientY < r.top + r.height/2){ before = others[i]; break; } }
  const parent = navDrag.el.parentNode;
  if(before){ if(navDrag.el.nextElementSibling!==before) parent.insertBefore(navDrag.el, before); }
  else { const last = others[others.length-1]; if(last && last.nextElementSibling!==navDrag.el) parent.insertBefore(navDrag.el, last.nextElementSibling); }
  e.preventDefault();
}, true);
function endNavDrag(){
  if(!navDrag) return;
  const d = navDrag; navDrag = null;
  if(!d.moving) return;
  d.el.classList.remove('nav-dragging'); document.body.classList.remove('nav-sorting');
  const order = navItems().map(function(b){ return b.dataset.view; });
  if(order.join()!==navOrder().join()){ state.profile.navOrder = order; persist('profile'); playTick(); }
  // the click that ends a drag shouldn't count as a click
  const swallow = function(ev){ ev.stopImmediatePropagation(); ev.preventDefault(); };
  document.addEventListener('click', swallow, true);
  setTimeout(function(){ document.removeEventListener('click', swallow, true); }, 0);
}
document.addEventListener('pointerup', endNavDrag, true);
document.addEventListener('pointercancel', endNavDrag, true);
