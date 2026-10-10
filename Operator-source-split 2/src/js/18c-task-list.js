
// ============ TODAY'S LIST (your order) ============
// Today's Lineup as a numbered list in the order you'll do things. Drag rows to reorder; tick
// one off (⋯ or right-click → Done) and the next moves up. Clicking a row opens it — nothing
// gets finished by a stray click. The top of the list is what's suggested Up next (unless you've
// lined something else up yourself), and the cards view follows the same order.
// The order is stored as a list of task ids — tasks you haven't placed yet go after, by priority.
function lineupOrdered(list){
  const pos = {}; arr(state.focus.lineupOrder).forEach(function(id, i){ pos[id] = i; });
  const placed = list.filter(function(t){ return pos[t.id]!==undefined; }).sort(function(a, b){ return pos[a.id]-pos[b.id]; });
  return placed.concat(sortByPriorityAndDeadline(list.filter(function(t){ return pos[t.id]===undefined; })));
}
// the list is the default (it does more: order, Now/Next, drag); cards if you pick them
function lineupView(){ return state.profile.lineupView==='cards' ? 'cards' : 'list'; }
ACTIONS.setLineupView = function(el, e, id){ state.profile.lineupView = id==='list' ? 'list' : 'cards'; persist('profile'); renderView(); };
function lineupToggleHtml(){
  const v = lineupView();
  return '<div class="seg-tabs seg-sm" style="margin:0;">'+
    '<button class="seg-tab'+(v==='list'?' active':'')+'" data-action="setLineupView" data-id="list" title="A list, in the order you\'ll do them">&#9776; List</button>'+
    '<button class="seg-tab'+(v==='cards'?' active':'')+'" data-action="setLineupView" data-id="cards" title="Cards">&#9638; Cards</button>'+
  '</div>';
}
function lineupListHtml(today){
  if(!today.length) return '<div class="empty">Nothing lined up yet. Drag a card here, or add one above.</div>';
  const next = nextUpTask(), nextId = next ? next.id : null;
  return '<ol class="tl-list">'+today.map(function(t, i){
    const isNow = ui.currentTaskId===t.id, isNext = !isNow && nextId===t.id, doneToday = isOngoingDoneToday(t);
    const selected = ui.selectedTaskIds.has(t.id);
    return '<li class="tl-row'+(isNow?' is-now':'')+(isNext?' is-next':'')+(doneToday?' is-done':'')+(selected?' row-selected':'')+(justCompletedTaskId===t.id?' just-completed':'')+'" draggable="true" data-task-id="'+t.id+'" data-dropzone="order" data-id="'+t.id+'" data-action="openTaskEditModal" title="Open — right-click for more">'+
      '<span class="tl-grip" title="Drag to reorder">&#8942;&#8942;</span>'+
      '<span class="tl-num">'+(i+1)+'</span>'+
      '<span class="tl-main">'+priorityTag(t.priority)+'<span class="tl-title">'+escapeHtml(t.title)+'</span>'+(t.ongoing?'<span class="tag tag-ongoing">&#128204;</span>':'')+'</span>'+
      clientTagsHtml(t.clients)+
      (t.deadline ? deadlineTag(t) : '')+
      (isNow ? '<span class="tl-badge is-now">Now</span>' : isNext ? '<span class="tl-badge">Up next</span>' : '')+
      '<button class="card-more" data-action="taskMenuBtn" data-id="'+t.id+'" title="More — or right-click">&#8943;</button>'+
    '</li>';
  }).join('')+'</ol>';
}
// drop a task onto a row: it goes just above or below it (pulled onto today's list if needed)
function reorderLineup(taskId, targetId, after){
  const t = state.tasks.items.find(function(x){ return x.id===taskId; }); if(!t || taskId===targetId) return;
  if(t.status!=='today'){ if(t.status==='done') return; t.status = 'today'; persist('tasks'); }
  const ids = lineupOrdered(state.tasks.items.filter(function(x){ return x.status==='today'; })).map(function(x){ return x.id; }).filter(function(id){ return id!==taskId; });
  let at = ids.indexOf(targetId); if(at<0) at = ids.length; else if(after) at++;
  ids.splice(at, 0, taskId);
  state.focus.lineupOrder = ids;
  playTick(); persist('focus'); renderView();
}
document.addEventListener('dragover', function(e){
  const row = e.target.closest && e.target.closest('.tl-row'); if(!row) return;
  const r = row.getBoundingClientRect(), below = e.clientY > r.top + r.height/2;
  if(row.classList.contains('drop-below')!==below || !(row.classList.contains('drop-above') || row.classList.contains('drop-below'))){
    document.querySelectorAll('.tl-row.drop-above, .tl-row.drop-below').forEach(function(x){ if(x!==row) x.classList.remove('drop-above', 'drop-below'); });
    row.classList.toggle('drop-below', below); row.classList.toggle('drop-above', !below);
  }
});
function clearTlDropMarks(){ document.querySelectorAll('.tl-row.drop-above, .tl-row.drop-below').forEach(function(x){ x.classList.remove('drop-above', 'drop-below'); }); }
document.addEventListener('dragend', clearTlDropMarks);
document.addEventListener('drop', function(){ setTimeout(clearTlDropMarks, 0); });
