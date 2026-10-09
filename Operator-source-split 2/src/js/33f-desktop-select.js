
// ============ DESKTOP-STYLE SELECTING ============
// Like the Finder: drag a box across empty space to pick up every task it touches, ⌘- or
// ⇧-click cards to add or drop them, ⌘A for every task on the page — then right-click any
// picked card for actions on all of them at once. Esc or a click on empty space lets go.
const SEL_CARD = '.task-card[data-id], .tl-row[data-task-id], .task-item-v2[data-task-id], .finished-row[data-task-id], .video-idea-compact[data-task-id]';
function selCardId(el){ return el.getAttribute('data-id') || el.getAttribute('data-task-id'); }
function selVisibleCards(){
  return Array.prototype.filter.call(document.querySelectorAll('#viewRoot '+SEL_CARD.split(', ').join(', #viewRoot ')), function(el){
    return !el.classList.contains('car-clone') && !el.closest('.car-clone') && el.getClientRects().length;
  });
}
function selectableView(){ return ui.view==='focus' || ui.view==='today'; }
function setTaskSelection(ids, additive){
  if(!additive) ui.selectedTaskIds.clear();
  ids.forEach(function(id){ if(state.tasks.items.some(function(t){ return t.id===id; })) ui.selectedTaskIds.add(id); });
  renderView();
}
// ---- drag a box ----
let marq = null;
function marqIsEmptySpot(t){
  if(!t || !t.closest) return false;
  if(!t.closest('#viewRoot')) return false;
  return !t.closest(SEL_CARD+', button, a, input, textarea, select, label, [contenteditable="true"], [data-action], [draggable="true"], .ctx-menu, .bulk-toolbar, .overlay, #boardHost, .bel, .car-arrow, svg, canvas, video, .chip, .tag');
}
document.addEventListener('pointerdown', function(e){
  if(e.button!==0 || e.pointerType==='touch' || !selectableView()) return;
  if(document.querySelector('.overlay:not(.hidden)')) return;
  if(!marqIsEmptySpot(e.target)) return;
  marq = {x:e.clientX, y:e.clientY, add:e.shiftKey || e.metaKey, box:null, cards:null, hits:new Set(), raf:0, lx:0, ly:0};
}, true);
function marqUpdate(){
  marq.raf = 0;
  const x1 = Math.min(marq.x, marq.lx), y1 = Math.min(marq.y, marq.ly), x2 = Math.max(marq.x, marq.lx), y2 = Math.max(marq.y, marq.ly);
  marq.box.style.transform = 'translate('+x1+'px,'+y1+'px)'; marq.box.style.width = (x2-x1)+'px'; marq.box.style.height = (y2-y1)+'px';
  marq.cards.forEach(function(c){
    const r = c.el.getBoundingClientRect();
    const hit = r.right > x1 && r.left < x2 && r.bottom > y1 && r.top < y2;
    if(hit!==c.hit){ c.hit = hit; c.el.classList.toggle('marquee-hit', hit); if(hit) marq.hits.add(c.id); else marq.hits.delete(c.id); }
  });
}
document.addEventListener('pointermove', function(e){
  if(!marq) return;
  marq.lx = e.clientX; marq.ly = e.clientY;
  if(!marq.box){
    if(Math.abs(e.clientX-marq.x) < 6 && Math.abs(e.clientY-marq.y) < 6) return;
    marq.box = document.createElement('div'); marq.box.className = 'marquee-box'; document.body.appendChild(marq.box);
    document.body.classList.add('marquee-on');
    marq.cards = selVisibleCards().map(function(el){ return {el:el, id:selCardId(el), hit:false}; });
    try{ window.getSelection().removeAllRanges(); }catch(err){}
  }
  e.preventDefault();
  if(!marq.raf) marq.raf = requestAnimationFrame(marqUpdate);
}, true);
function marqEnd(e){
  if(!marq) return;
  const m = marq; marq = null;
  if(m.raf) cancelAnimationFrame(m.raf);
  if(!m.box){
    // a plain click on empty space lets go of the selection (like clicking the desktop)
    if(e && e.type==='pointerup' && ui.selectedTaskIds.size && !m.add && !ui.taskSelectMode){ ui.selectedTaskIds.clear(); renderView(); }
    return;
  }
  m.box.remove(); document.body.classList.remove('marquee-on');
  m.cards.forEach(function(c){ c.el.classList.remove('marquee-hit'); });
  const swallow = function(ev){ ev.stopImmediatePropagation(); ev.preventDefault(); };
  document.addEventListener('click', swallow, true); setTimeout(function(){ document.removeEventListener('click', swallow, true); }, 0);
  if(m.hits.size || !m.add) setTaskSelection(Array.from(m.hits), m.add);
}
document.addEventListener('pointerup', marqEnd, true);
document.addEventListener('pointercancel', marqEnd, true);
// ---- ⌘ / ⇧ click a card to add or drop it ----
document.addEventListener('click', function(e){
  if(!(e.metaKey || e.shiftKey) || e.button!==0 || !selectableView()) return;
  const card = e.target.closest && e.target.closest(SEL_CARD); if(!card || card.closest('.car-clone')) return;
  if(e.target.closest('input, textarea, select, .card-more')) return;
  const id = selCardId(card); if(!id) return;
  e.preventDefault(); e.stopImmediatePropagation();
  if(ui.selectedTaskIds.has(id)) ui.selectedTaskIds.delete(id); else ui.selectedTaskIds.add(id);
  renderView();
}, true);
// ---- ⌘A / Esc ----
function selectAllVisibleTasks(){ setTaskSelection(selVisibleCards().map(selCardId), false); }
document.addEventListener('keydown', function(e){
  if(!selectableView() || typingInField(e.target) || document.querySelector('.overlay:not(.hidden)')) return;
  if((e.metaKey || e.ctrlKey) && (e.key==='a' || e.key==='A') && selVisibleCards().length){ e.preventDefault(); selectAllVisibleTasks(); }
  else if(e.key==='Escape' && ui.selectedTaskIds.size && !document.getElementById('taskCtxMenu')){ ui.selectedTaskIds.clear(); renderView(); }
});
// ---- right-click a picked card: one menu for all of them ----
document.addEventListener('contextmenu', function(e){
  if(e.altKey || ui.selectedTaskIds.size < 2) return;
  const card = e.target.closest && e.target.closest(SEL_CARD); if(!card) return;
  const id = selCardId(card); if(!ui.selectedTaskIds.has(id)) return;
  e.preventDefault(); e.stopImmediatePropagation();
  openBulkTaskMenu(e.clientX, e.clientY);
}, true);
function openBulkTaskMenu(x, y){
  closeTaskMenu();
  const ids = Array.from(ui.selectedTaskIds), tasks = ids.map(function(id){ return state.tasks.items.find(function(t){ return t.id===id; }); }).filter(Boolean);
  const any = function(fn){ return tasks.some(fn); };
  const item = function(op, label, extra){ return '<button class="ctx-item'+(extra||'')+'" data-action="taskBulk" data-op="'+op+'">'+label+'</button>'; };
  const m = document.createElement('div');
  m.id = 'taskCtxMenu'; m.className = 'ctx-menu'; m.dataset.id = '__bulk'; m.dataset.at = Date.now();
  m.innerHTML = '<div class="ctx-title">'+tasks.length+' tasks selected</div>'+
    (any(function(t){ return t.status!=='done'; }) ? item('done', '&#10003; Mark done') : '')+
    (any(function(t){ return t.status==='done'; }) ? item('undo', '&#8634; Back to today') : '')+
    (any(function(t){ return t.status!=='today'; }) ? item('today', '&rarr; Move to today') : '')+
    (any(function(t){ return t.status!=='backlog'; }) ? item('backlog', '&larr; Move to backlog') : '')+
    '<div class="ctx-sep"></div>'+
    '<div class="ctx-row"><span class="ctx-k">Due</span>'+item('dueToday','Today',' ctx-chip')+item('dueTomorrow','Tomorrow',' ctx-chip')+item('dueClear','Clear',' ctx-chip')+'</div>'+
    '<div class="ctx-row"><span class="ctx-k">Priority</span>'+item('pri-high','High',' ctx-chip')+item('pri-med','Med',' ctx-chip')+item('pri-low','Low',' ctx-chip')+'</div>'+
    '<div class="ctx-sep"></div>'+
    item('clear', 'Deselect all')+
    item('delete', '&#128465; Delete '+tasks.length, ' ctx-danger');
  document.body.appendChild(m);
  const r = m.getBoundingClientRect();
  m.style.left = Math.min(x, window.innerWidth-r.width-8)+'px';
  m.style.top = Math.min(y, window.innerHeight-r.height-8)+'px';
}
ACTIONS.taskBulk = function(el){
  const op = el.dataset.op; closeTaskMenu();
  const ids = Array.from(ui.selectedTaskIds);
  const each = function(fn){ ids.forEach(function(id){ const t = state.tasks.items.find(function(x){ return x.id===id; }); if(t) fn(t); }); };
  if(op==='done'){ holdRenders(function(){ each(function(t){ if(t.status!=='done' && !isOngoingDoneToday(t)) completeTask(t.id); }); }); ui.selectedTaskIds.clear(); renderView(); }
  else if(op==='undo'){ holdRenders(function(){ each(function(t){ if(t.status==='done') undoTask(t.id); }); }); ui.selectedTaskIds.clear(); renderView(); }
  else if(op==='today' || op==='backlog'){ each(function(t){ if(t.status==='done') return; if(op==='backlog' && ui.currentTaskId===t.id) accumulateCurrentTaskTime(t.id); t.status = op; }); ui.selectedTaskIds.clear(); playTick(); persist('tasks'); renderView(); }
  else if(op.indexOf('pri-')===0){ each(function(t){ t.priority = op.slice(4); }); persist('tasks'); renderView(); }
  else if(op==='dueToday' || op==='dueTomorrow' || op==='dueClear'){ const d = op==='dueClear' ? null : op==='dueToday' ? todayStr() : addDays(todayStr(), 1); each(function(t){ t.deadline = d; if(!d) t.deadlineTime = null; }); persist('tasks'); renderView(); }
  else if(op==='clear'){ ui.selectedTaskIds.clear(); renderView(); }
  else if(op==='delete'){ ui.selectedTaskIds.clear(); deleteTasksUndoable(ids); }
};
