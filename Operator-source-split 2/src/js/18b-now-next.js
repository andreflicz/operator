
// ============ NOW / UP NEXT (Focus → Tasks) ============
// One place that says what you're on and what comes after it.
//  • Now — the task you're on, timed (locked in or not — lock in and it counts as deep work).
//    ✓ Done finishes it; Release stops timing it and leaves it on today's list.
//  • Up next — one task lined up. Drag a card onto it or pick from the list.
// Nothing ever starts on its own: Start now / Lock in is always your click, and dropping a card
// onto Now while locked in asks first.
function nnTask(id){ return id ? state.tasks.items.find(function(t){ return t.id===id && t.status!=='done'; }) : null; }
function nnExplicitNext(){ const t = nnTask(state.focus.nextTaskId) || nnTask(ui.stagedTaskId); return t && t.id!==ui.currentTaskId ? t : null; }
// opts.stack: the two halves stacked (Now on top, Up next below) — the drop slot on Today and
// on the locked-in page.
function nowNextPanelHtml(opts){
  opts = opts || {};
  const where = opts.stack ? 'stack' : 'panel', timerId = opts.stack ? 'currentTaskElapsed' : 'currentTaskElapsedBar';
  const as = state.focus.activeSession, inS = !!as, onBreak = !!(inS && as.onBreak);
  const cur = nnTask(ui.currentTaskId);
  const pend = nnTask(ui.pendingCurrentTaskId);
  const explicit = nnExplicitNext();
  let next = explicit;
  if(!next){ const s = nextUpTask(); if(s && s.id!==ui.currentTaskId && !(pend && s.id===pend.id)) next = s; }
  // the task in each slot can be picked up: onto the list to clear the slot, or across to swap
  const title = function(t, from){ return '<div class="nn-title nn-drag" draggable="true" data-task-id="'+t.id+'" data-from="'+from+'" title="Drag to move it">'+priorityTag(t.priority)+'<span>'+escapeHtml(t.title)+'</span></div>'; };
  const picker = function(label){ return '<span class="nn-pick-wrap"><button class="btn btn-ghost btn-sm" data-action="toggleNextPicker" data-where="'+where+'">'+label+' &#9662;</button>'+nextPickerHtml(where)+'</span>'; };
  let now = '';
  {
    now = '<div class="nn-cell nn-now'+(cur?' has-task':'')+(pend?' is-asking':'')+'" data-dropzone="current">'+
      '<div class="nn-k">Now'+(!inS && cur ? '<span class="nn-sug">not locked in</span>' : '')+tip('What you\'re on, timed. Lock in and it counts as deep work. ✓ Done finishes it; Release stops timing it and leaves it on today\'s list.')+'</div>'+
      (pend
        ? '<div class="nn-title"><span>'+(cur?'Switch to':'Start')+' &ldquo;'+escapeHtml(pend.title)+'&rdquo;?</span></div>'+
          '<div class="nn-acts"><button class="btn btn-good btn-sm" data-action="confirmPendingCurrentTask">'+(cur?'&#8646; Switch':'&#9654; Start')+'</button>'+
            '<button class="btn btn-ghost btn-sm" data-action="nnPendingToNext">Make it next</button>'+
            '<button class="btn btn-ghost btn-sm" data-action="cancelPendingCurrentTask">Cancel</button></div>'
        : cur
          ? '<div class="nn-row">'+title(cur, 'now')+'<span class="nn-timer" id="'+timerId+'">'+formatElapsed(Date.now()-(ui.currentTaskStartedAt||Date.now()))+'</span></div>'+
            '<div class="nn-acts"><button class="btn btn-good btn-sm" data-action="finishCurrentTask">&#10003; Done</button>'+
              '<button class="btn btn-ghost btn-sm" data-action="releaseCurrentTask" title="Stop timing it — it stays on today\'s list">Release</button>'+
              (inS ? '' : '<button class="btn btn-ghost btn-sm" data-action="openLockInChooser" title="Lock in — it counts as deep work">&#128274; Lock in</button>')+'</div>'
          : '<div class="nn-title nn-empty">'+(onBreak ? 'On a break' : 'Nothing being timed')+'</div><div class="nn-hint">Start what\'s next, or drag a card here</div>')+
    '</div>';
  }
  const nextCell = '<div class="nn-cell nn-next" data-dropzone="next">'+
    '<div class="nn-k">Up next'+(next && !explicit ? '<span class="nn-sug">suggested</span>' : '')+tip('One task lined up for when you\'re ready. Drag a card here or pick one — it never starts by itself.')+'</div>'+
    (next
      ? title(next, 'next')+
        '<div class="nn-acts">'+
          (onBreak ? '' : '<button class="btn btn-primary btn-sm" data-action="nnStartNext" data-id="'+next.id+'">&#9654; '+(cur ? 'Switch to it' : 'Start now')+'</button>')+
          (inS ? '' : '<button class="btn btn-good btn-sm" data-action="nnLockInNext" data-id="'+next.id+'">&#128274; Lock in on it</button>')+
          picker('Change')+
          (explicit ? '<button class="btn btn-ghost btn-sm" data-action="clearStagedTask" title="Clear what\'s next">&#10005;</button>' : '')+
        '</div>'
      : '<div class="nn-title nn-empty">Nothing lined up</div><div class="nn-acts">'+picker('Pick one')+'<span class="nn-hint">or drag a card here</span></div>')+
  '</div>';
  if(opts.stack) return '<div class="nn-panel nn-stack'+(opts.hero?' nn-hero':'')+(inS ? '' : ' is-free')+'" data-key="nn-stack">'+now+nextCell+'</div>';
  return '<div class="nn-panel is-locked'+(inS ? '' : ' is-free')+'" data-key="nn-panel">'+now+nextCell+'</div>';
}
ACTIONS.nnStartNext = function(el, e, id){
  const t = nnTask(id); if(!t) return;
  if(t.status==='backlog'){ t.status = 'today'; persist('tasks'); }
  ui.pendingCurrentTaskId = null;
  setCurrentTask(id);
};
ACTIONS.nnLockInNext = function(el, e, id){
  const t = nnTask(id); if(!t) return;
  if(t.status==='backlog'){ t.status = 'today'; persist('tasks'); }
  setNextUp(id); renderView(); openLockInChooser();
};
ACTIONS.nnPendingToNext = function(){
  const id = ui.pendingCurrentTaskId; ui.pendingCurrentTaskId = null;
  if(id) setNextUp(id);
  playTick(); renderView();
};
// a card dropped on Up next just lines it up
function dropOnNext(taskId){
  const t = nnTask(taskId); if(!t) return;
  if(t.status==='backlog'){ t.status = 'today'; persist('tasks'); }
  if(ui.pendingCurrentTaskId===taskId) ui.pendingCurrentTaskId = null;
  setNextUp(taskId); playTick(); renderView();
}
