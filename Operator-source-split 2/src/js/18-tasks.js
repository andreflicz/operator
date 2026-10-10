// ============ TASKS ============
function currentTaskLabel(){ return state.focus.activeSession ? 'Current Task' : 'Next Task'; }
function renderCurrentTaskCard(big, gridMode, heroFit){
  const sizeStyle = gridMode ? '' : (big ? 'width:100%;padding:20px 24px;' : (heroFit ? 'flex:1;min-width:240px;height:340px;overflow-y:auto;justify-content:center;' : 'max-width:420px;margin:0 auto;'));
  const inSession = !!state.focus.activeSession;
  if(!inSession && ui.stagedTaskId){
    const st = state.tasks.items.find(function(x){ return x.id===ui.stagedTaskId; });
    if(st){
      return '<div class="task-card current-task-card staged-task-card'+(ui.justStaged?' just-staged':'')+'" data-dropzone="current" style="align-items:center;justify-content:center;text-align:center;'+sizeStyle+'">'+
        '<div class="ctb-label">&#128204; Up Next'+tip('Lock in to start the clock on it.')+'</div>'+
        '<div class="task-card-title" style="font-size:19px;margin-top:6px;">'+escapeHtml(st.title)+'</div>'+
        '<div class="row" style="margin-top:16px;justify-content:center;">'+
          '<button class="btn btn-good" data-action="openLockInChooser">&#128274; Lock In to Start</button>'+
          '<button class="btn btn-ghost btn-sm" data-action="clearStagedTask">Clear</button>'+
        '</div>'+
      '</div>';
    }
  }
  if(inSession && ui.pendingCurrentTaskId){
    const pt = state.tasks.items.find(function(x){ return x.id===ui.pendingCurrentTaskId; });
    if(pt){
      const isSwap = !!ui.currentTaskId;
      return '<div class="task-card current-task-card staged-task-card" data-dropzone="current" style="align-items:center;justify-content:center;text-align:center;'+sizeStyle+'">'+
        '<div class="ctb-label">&#128204; Next Task</div>'+
        '<div class="task-card-title" style="font-size:19px;margin-top:6px;">'+escapeHtml(pt.title)+'</div>'+
        '<div class="row" style="margin-top:16px;justify-content:center;">'+
          '<button class="btn btn-good" data-action="confirmPendingCurrentTask">'+(isSwap?'&#8646; Swap':'&#9654; Start')+'</button>'+
          '<button class="btn btn-ghost btn-sm" data-action="cancelPendingCurrentTask">Cancel</button>'+
        '</div>'+
      '</div>';
    }
  }
  const t = ui.currentTaskId ? state.tasks.items.find(function(x){ return x.id===ui.currentTaskId; }) : null;
  if(!t){
    return '<div class="task-card current-task-card" data-dropzone="current" style="align-items:center;justify-content:center;text-align:center;'+sizeStyle+'">'+
      '<div class="ctb-label">'+currentTaskLabel()+'</div>'+
      '<div class="ctb-empty">Drag a task here'+tip(inSession ? 'Whatever sits here gets timed while you\'re locked in.' : 'Line it up here, then lock in to start the clock.')+'</div>'+
    '</div>';
  }
  if(big){
    return '<div class="task-card current-task-card has-task" data-dropzone="current" data-task-id="'+t.id+'" style="'+sizeStyle+'flex-direction:row;align-items:center;gap:20px;">'+
      '<div style="flex:1;min-width:0;">'+
        '<div class="row" style="gap:8px;"><span class="ctb-label">'+currentTaskLabel()+'</span>'+priorityTag(t.priority)+'</div>'+
        '<div class="task-card-title" style="font-size:19px;margin-top:4px;">'+escapeHtml(t.title)+'</div>'+
        (t.trackedMinutes ? '<div class="kpi-sub">'+fmtDurationLabel(t.trackedMinutes)+' tracked total</div>' : '')+
      '</div>'+
      '<div class="ctb-timer" id="currentTaskElapsed" style="font-size:30px;flex-shrink:0;">'+formatElapsed(Date.now()-ui.currentTaskStartedAt)+'</div>'+
      '<div class="row" style="flex-shrink:0;">'+
        '<button class="btn btn-ghost btn-sm" data-action="finishCurrentTask">&#10003; Finish</button>'+
        '<button class="btn btn-ghost btn-sm" data-action="releaseCurrentTask">Release</button>'+
      '</div>'+
    '</div>';
  }
  if(heroFit){
    return '<div class="task-card current-task-card has-task" data-dropzone="current" data-task-id="'+t.id+'" style="'+sizeStyle+'align-items:center;text-align:center;gap:10px;">'+
      '<div class="row" style="gap:8px;justify-content:center;">'+priorityTag(t.priority)+'<span class="ctb-label">'+currentTaskLabel()+'</span></div>'+
      '<div class="task-card-title" style="font-size:20px;">'+escapeHtml(t.title)+'</div>'+
      '<div class="ctb-timer" id="currentTaskElapsed" style="font-size:32px;">'+formatElapsed(Date.now()-ui.currentTaskStartedAt)+'</div>'+
      (t.trackedMinutes ? '<div class="kpi-sub">'+fmtDurationLabel(t.trackedMinutes)+' tracked total</div>' : '')+
      '<div class="row" style="margin-top:auto;padding-top:10px;justify-content:center;">'+
        '<button class="btn btn-ghost btn-sm" data-action="finishCurrentTask">&#10003; Finish</button>'+
        '<button class="btn btn-ghost btn-sm" data-action="releaseCurrentTask">Release</button>'+
      '</div>'+
    '</div>';
  }
  return '<div class="task-card current-task-card has-task" data-dropzone="current" data-task-id="'+t.id+'" style="'+sizeStyle+'">'+
    '<div class="row" style="justify-content:space-between;">'+priorityTag(t.priority)+'<span class="ctb-label">'+currentTaskLabel()+'</span></div>'+
    '<div class="task-card-title">'+escapeHtml(t.title)+'</div>'+
    '<div class="ctb-timer" id="currentTaskElapsed">'+formatElapsed(Date.now()-ui.currentTaskStartedAt)+'</div>'+
    (t.trackedMinutes ? '<div class="kpi-sub">'+fmtDurationLabel(t.trackedMinutes)+' tracked total</div>' : '')+
    '<div class="row" style="margin-top:auto;padding-top:8px;">'+
      '<button class="btn btn-ghost btn-sm" data-action="finishCurrentTask">&#10003; Finish</button>'+
      '<button class="btn btn-ghost btn-sm" data-action="releaseCurrentTask">Release</button>'+
    '</div>'+
  '</div>';
}
function taskPriorityRank(t){ return t.priority==='high'?0:t.priority==='med'?1:2; }
function taskDeadlineSortKey(t){ return t.deadline || '9999-99-99'; }
function sortByPriorityAndDeadline(list){
  return list.slice().sort(function(a,b){
    const ao = a.ongoing?1:0, bo = b.ongoing?1:0;
    if(ao!==bo) return ao-bo;
    const pr = taskPriorityRank(a)-taskPriorityRank(b);
    if(pr!==0) return pr;
    return taskDeadlineSortKey(a).localeCompare(taskDeadlineSortKey(b));
  });
}
function focusMainTab(el){ ui.focusTab = el.dataset.tab; renderView(); }
function focusTasksSubTab(el){ ui.focusTasksSubTab = el.dataset.tab; renderView(); }
// Overview / Backlog / Video Ideas / Finished sit on the same line as Tasks · Analytics,
// so the page opens straight onto what you're on now and what's next.
function focusTasksSubtabsHtml(){
  const sub = ui.focusTasksSubTab || 'overview';
  let backlogN = 0, ideasN = 0, doneN = 0;
  state.tasks.items.forEach(function(t){
    if(t.status==='done') doneN++;
    else if(t.isVideoIdea) ideasN++;
    else if(t.status==='backlog') backlogN++;
  });
  const pill = function(id, label, n){ return '<div class="subtab '+(sub===id?'active':'')+'" data-action="focusTasksSubTab" data-tab="'+id+'">'+label+(n===null?'':' <span style="opacity:.7;">'+n+'</span>')+'</div>'; };
  return '<div class="subtabs">'+pill('overview', 'Overview', null)+pill('backlog', 'Backlog', backlogN)+pill('videoIdeas', '&#127916; Video Ideas', ideasN)+pill('finished', 'Finished', doneN)+(arr(state.tasks.trash).length ? pill('deleted', '&#128465;', arr(state.tasks.trash).length) : '')+'</div>';
}
function renderFocusTasksTab(){
  const sub = ui.focusTasksSubTab || 'overview';
  return '<div class="subtab-panel" data-key="tasks-'+sub+'">'+
    (sub==='backlog' ? renderFocusBacklogTab() : sub==='videoIdeas' ? renderVideoIdeasTab() : sub==='finished' ? renderFocusFinishedTab() : sub==='deleted' ? renderFocusDeletedTab() : renderFocusTasksOverview())+
    '</div>';
}
function renderVideoIdeasTab(){
  const videoIdeas = state.tasks.items.filter(function(t){ return t.isVideoIdea && t.status!=='done'; });
  return '<div class="section">'+
    '<div class="video-idea-grid">'+(videoIdeas.map(videoIdeaCompactCard).join('') || '<div class="empty">No video ideas yet — drop one above whenever inspiration hits.</div>')+'</div>'+
  '</div>';
}
function openAddVideoIdeaModal(){
  const o = document.getElementById('videoIdeaOverlay');
  if(!o) return;
  o.classList.remove('hidden');
  renderAddVideoIdeaModalInto();
}
function closeAddVideoIdeaModal(){ const o=document.getElementById('videoIdeaOverlay'); if(o) o.classList.add('hidden'); }
function renderAddVideoIdeaModal(){
  const types = arr(state.tasks.videoTypes);
  return '<div class="section-title" style="margin-bottom:14px;">&#127916; Add Video Idea</div>'+
    '<div class="field"><label>What\'s the idea?</label><input class="input" id="newVideoIdeaTitle" placeholder="e.g. Behind-the-scenes B-roll" style="width:100%;" autofocus></div>'+
    (types.length ? '<div class="field" style="margin-top:10px;"><label>Type (optional)</label><select class="input" id="newVideoIdeaType" style="width:100%;"><option value="">&mdash; None &mdash;</option>'+types.map(function(vt){ return '<option value="'+vt.id+'">'+escapeHtml(vt.label)+'</option>'; }).join('')+'</select></div>' : '')+
    '<div class="field" style="margin-top:10px;"><label>Notes (optional)</label><textarea class="input" id="newVideoIdeaNotes" placeholder="Any details worth remembering" style="width:100%;min-height:70px;"></textarea></div>'+
    '<div class="row" style="margin-top:20px;justify-content:flex-end;">'+
      '<button class="btn btn-ghost" data-action="closeAddVideoIdeaModal">Cancel</button>'+
      '<button class="btn btn-primary" data-action="addVideoIdea">+ Add Video Idea</button>'+
    '</div>';
}
function renderAddVideoIdeaModalInto(){ const el=document.getElementById('videoIdeaContent'); if(el) morphInto(el, renderAddVideoIdeaModal(), {form:true}); }
function addVideoIdea(){
  const el = document.getElementById('newVideoIdeaTitle');
  const title = el ? el.value.trim() : '';
  if(!title) return;
  const typeEl = document.getElementById('newVideoIdeaType');
  const notesEl = document.getElementById('newVideoIdeaNotes');
  state.tasks.items.push({id:uid(), title:title, client:'personal', clients:['personal'], priority:'med', deadline:null, notes:(notesEl?notesEl.value.trim():''), status:'backlog', ongoing:false, ongoingDeadline:null, ongoingFrequency:null, includeInStandard:false, categoryId:null, isVideoIdea:true, videoType:(typeEl&&typeEl.value?typeEl.value:null), createdAt:todayStr(), completedAt:null});
  playTaskAdded();
  closeAddVideoIdeaModal();
  persist('tasks'); renderView();
}
function openVideoIdeaEditModal(id){
  const t = state.tasks.items.find(function(x){return x.id===id;}); if(!t) return;
  ui.editingVideoIdeaId = id;
  const o = document.getElementById('videoIdeaEditOverlay');
  if(!o) return;
  o.classList.remove('hidden');
  renderVideoIdeaEditModalInto();
}
function closeVideoIdeaEditModal(){ ui.editingVideoIdeaId = null; const o=document.getElementById('videoIdeaEditOverlay'); if(o) o.classList.add('hidden'); }
function renderVideoIdeaEditModal(){
  const t = state.tasks.items.find(function(x){return x.id===ui.editingVideoIdeaId;});
  if(!t) return '';
  const types = arr(state.tasks.videoTypes);
  const where = t.status==='today' ? "In today's lineup" : t.status==='done' ? 'Finished' : 'In Video Ideas';
  return '<div class="section-title" style="margin-bottom:4px;">&#127916; Video Idea</div>'+
    '<div class="kpi-sub" style="margin-bottom:14px;">'+where+'</div>'+
    '<div class="field"><label>Idea</label><input class="input" id="editVideoTitle-'+t.id+'" value="'+escapeHtml(t.title)+'" style="width:100%;"></div>'+
    (types.length ? '<div class="field" style="margin-top:10px;"><label>Type</label><select class="input" id="editVideoType-'+t.id+'" style="width:100%;"><option value="">&mdash; None &mdash;</option>'+types.map(function(vt){ return '<option value="'+vt.id+'" '+(t.videoType===vt.id?'selected':'')+'>'+escapeHtml(vt.label)+'</option>'; }).join('')+'</select></div>' : '')+
    '<div class="field" style="margin-top:10px;"><label>Due (optional)</label><div class="row"><input class="input" type="date" id="editVideoDeadline-'+t.id+'" value="'+(t.deadline||'')+'"><button class="btn btn-ghost btn-sm" data-action="openDatePicker" data-target="editVideoDeadline-'+t.id+'">&#128197;</button><button class="btn btn-ghost btn-sm" data-action="clearField" data-target="editVideoDeadline-'+t.id+'">Clear</button></div></div>'+
    '<div class="field" style="margin-top:10px;"><label>Notes</label><textarea class="input" id="editVideoNotes-'+t.id+'" style="width:100%;min-height:90px;" placeholder="Hook, shots, references…">'+escapeHtml(t.notes||'')+'</textarea></div>'+
    '<div class="row" style="margin-top:20px;justify-content:space-between;">'+
      '<button class="btn btn-ghost btn-sm mini-move-danger" data-action="deleteTaskUndoable" data-id="'+t.id+'">Delete</button>'+
      '<div class="row">'+
        '<button class="btn btn-ghost" data-action="closeVideoIdeaEditModal">Cancel</button>'+
        '<button class="btn btn-primary" data-action="saveVideoIdeaEdit" data-id="'+t.id+'">Save</button>'+
      '</div>'+
    '</div>';
}
function renderVideoIdeaEditModalInto(){ const el=document.getElementById('videoIdeaEditContent'); if(el) morphInto(el, renderVideoIdeaEditModal(), {form:true}); }
function saveVideoIdeaEdit(id){
  const t = state.tasks.items.find(function(x){return x.id===id;}); if(!t) return;
  const titleEl = document.getElementById('editVideoTitle-'+id);
  if(titleEl) t.title = titleEl.value.trim() || t.title;
  const typeEl = document.getElementById('editVideoType-'+id);
  if(typeEl) t.videoType = typeEl.value || null;
  const dlEl = document.getElementById('editVideoDeadline-'+id);
  if(dlEl) t.deadline = dlEl.value || null;
  const notesEl = document.getElementById('editVideoNotes-'+id);
  if(notesEl) t.notes = notesEl.value.trim();
  closeVideoIdeaEditModal();
  persist('tasks'); renderView();
}
function renderFocusTasksOverview(){
  const items = state.tasks.items;
  const today = lineupOrdered(items.filter(function(t){ return t.status==='today'; }));
  const listView = lineupView()==='list';
  const backlogPreview = sortByPriorityAndDeadline(items.filter(function(t){ return t.status==='backlog' && !t.isVideoIdea; })).slice(0,8);
  const backlogTotal = items.filter(function(t){ return t.status==='backlog' && !t.isVideoIdea; }).length;
  return nowNextPanelHtml()+
  renderTaskToolbar(true)+
  '<div class="section" style="margin-bottom:14px;">'+
    '<div class="section-title" style="align-items:center;">Today\'s Lineup <span class="kpi-sub">'+today.length+'</span>'+tip('In your order — switch to List and drag rows to set it (otherwise highest priority and closest deadlines first). Drag a card onto Up next to line it up. Drag a box around cards (or ⌘-click) to pick several.')+'<span class="row" style="margin-left:auto;gap:8px;">'+lineupToggleHtml()+'</span></div>'+
    (listView ? '<div class="task-column tl-wrap" data-dropzone="today">'+lineupListHtml(today)+'</div>' :
    '<div class="task-column fixed-size'+(carouselOn() && today.length?' is-car':'')+'" data-dropzone="today">'+(today.length && carouselOn() ? carouselWrap(today.map(function(t){ return taskCard(t); }).join(''), 'lineup', {w:236, loop:true, count:today.length}) : '<div class="task-card-grid">'+(today.map(function(t){ return taskCard(t); }).join('') || '<div class="empty">Nothing lined up yet. Drag a card here, or add one above.</div>')+'</div>')+'</div>')+
  '</div>'+
  (backlogTotal ? (
    '<div class="section" style="margin-bottom:14px;"><div class="section-title" style="align-items:center;">Worth Doing Soon<span class="kpi-sub">'+backlogTotal+' in the list</span><button class="btn btn-ghost btn-sm" style="margin-left:auto;" data-action="focusTasksSubTab" data-tab="backlog">See All &rarr;</button></div>'+
      (carouselOn() ? (function(){ const all = sortByPriorityAndDeadline(items.filter(function(t){ return t.status==='backlog' && !t.isVideoIdea; })); return carouselWrap(all.map(function(t){ return taskCard(t); }).join(''), 'soon', {w:236, loop:true, count:all.length}); })() : '<div class="task-card-grid">'+backlogPreview.map(function(t){ return taskCard(t); }).join('')+'</div>')+
    '</div>'
  ) : '')+
  renderOngoingTasksPanel();
}
function renderFocusBacklogTab(){
  const items = state.tasks.items;
  const backlog = sortByPriorityAndDeadline(items.filter(function(t){ return t.status==='backlog' && !t.isVideoIdea; }));
  const hasFilters = !!(ui.backlogSearchText || ui.backlogPriorityFilter);
  return renderTaskToolbar(true)+
  '<div class="section">'+
    '<div class="row" style="justify-content:space-between;align-items:center;flex-wrap:wrap;gap:10px;margin-bottom:10px;">'+
      '<div class="section-title" style="margin-bottom:0;">The Whole List<span class="kpi-sub">'+backlog.length+'</span>'+tip('Highest priority and closest deadlines first.')+'</div>'+
      '<div class="row" style="gap:8px;">'+
        (!ui.backlogSearchOpen && !hasFilters ? '<button class="btn btn-ghost btn-sm" data-action="toggleBacklogSearch" title="Search Entries">&#128269;</button>' : '')+
      '</div>'+
    '</div>'+
    (ui.backlogSearchOpen || hasFilters ? (
      '<div class="row" style="gap:8px;flex-wrap:wrap;margin-bottom:14px;">'+
        '<input class="input" id="backlogSearchInput" placeholder="Search the list…" value="'+escapeHtml(ui.backlogSearchText||'')+'" style="flex:1;min-width:160px;" autofocus>'+
        ['high','med','low'].map(function(p){ return '<span class="chip '+(ui.backlogPriorityFilter===p?'active':'')+'" data-action="setBacklogPriorityFilter" data-value="'+p+'">'+(p==='high'?'High':p==='med'?'Medium':'Low')+'</span>'; }).join('')+
        '<button class="btn btn-ghost btn-sm" data-action="toggleBacklogSearch">'+(hasFilters?'Hide':'Close')+'</button>'+
        (hasFilters ? '<button class="btn btn-ghost btn-sm" data-action="clearBacklogFilters">Clear</button>' : '')+
      '</div>'
    ) : '')+
    '<div class="task-card-grid" id="backlogResultsContainer">'+renderBacklogResultsList(backlog)+'</div>'+
  '</div>';
}
function renderBacklogResultsList(backlog){
  const q = (ui.backlogSearchText||'').trim().toLowerCase();
  const pf = ui.backlogPriorityFilter;
  const filtered = backlog.filter(function(t){
    if(pf && t.priority!==pf) return false;
    if(q && t.title.toLowerCase().indexOf(q)<0) return false;
    return true;
  });
  if(!filtered.length) return '<div class="empty">Nothing matches. Try clearing filters, or add a task above.</div>';
  // long lists render in pages that keep loading as you scroll (an endless list, without the cost)
  const lim = listLimit('backlog');
  return filtered.slice(0, lim).map(function(t){ return taskCard(t); }).join('')+moreLoader('backlog', filtered.length - lim);
}
const LIST_PAGE = 48;
function listLimit(key){ ui.listLimits = ui.listLimits || {}; return ui.listLimits[key] || LIST_PAGE; }
function moreLoader(key, hidden){ return hidden > 0 ? '<button class="load-more" data-action="loadMore" data-id="'+key+'" data-autoload="1">Show '+Math.min(hidden, LIST_PAGE)+' more</button>' : ''; }
ACTIONS.loadMore = function(el, e, key){ ui.listLimits = ui.listLimits || {}; ui.listLimits[key] = listLimit(key) + LIST_PAGE; renderView(); };
function setBacklogPriorityFilter(val){ ui.backlogPriorityFilter = (ui.backlogPriorityFilter===val)?null:val; refreshBacklogResults(); }
function clearBacklogFilters(){ ui.backlogSearchText=''; ui.backlogPriorityFilter=null; ui.backlogSearchOpen=false; renderView(); }
function toggleBacklogSearch(){
  ui.backlogSearchOpen = !ui.backlogSearchOpen;
  if(!ui.backlogSearchOpen){ ui.backlogSearchText=''; ui.backlogPriorityFilter=null; }
  renderView();
}
function refreshBacklogResults(){
  const items = state.tasks.items;
  const backlog = sortByPriorityAndDeadline(items.filter(function(t){ return t.status==='backlog' && !t.isVideoIdea; }));
  const el = document.getElementById('backlogResultsContainer');
  if(el) el.innerHTML = renderBacklogResultsList(backlog);
  document.querySelectorAll('[data-action="setBacklogPriorityFilter"]').forEach(function(chip){ chip.classList.toggle('active', chip.dataset.value===ui.backlogPriorityFilter); });
}
function renderFocusFinishedTab(){
  const items = state.tasks.items;
  const doneAll = items.filter(function(t){ return t.status==='done'; }).sort(function(a,b){ return (b.completedAt||'').localeCompare(a.completedAt||''); });
  const today = todayStr();
  const doneToday = doneAll.filter(function(t){ return t.completedAt===today; });
  const doneEarlier = doneAll.filter(function(t){ return t.completedAt!==today; });
  return '<div class="section">'+
    '<div class="section-title">Completed Today<span class="kpi-sub">'+doneToday.length+'</span></div>'+
    '<div class="task-list">'+(doneToday.map(finishedTaskRow).join('') || '<div class="empty">Nothing finished today yet.</div>')+'</div>'+
  '</div>'+
  '<div class="section">'+
    '<div class="section-title">Everything Knocked Out<span class="kpi-sub">'+doneEarlier.length+' more</span></div>'+
    '<div class="task-list">'+(doneEarlier.slice(0, listLimit('finished')).map(finishedTaskRow).join('') || '<div class="empty">Nothing else yet — it all starts today.</div>')+moreLoader('finished', doneEarlier.length - listLimit('finished'))+'</div>'+
  '</div>';
}
function openAddTaskModal(){
  ui.newTaskClients = ['personal'];
  const o = document.getElementById('addTaskOverlay');
  if(!o) return;
  o.classList.remove('hidden');
  renderAddTaskModalInto();
}
function closeAddTaskModal(){ const o=document.getElementById('addTaskOverlay'); if(o) o.classList.add('hidden'); }
function renderAddTaskModal(){
  return '<div class="section-title" style="margin-bottom:14px;">Add a Task</div>'+
    '<div class="field"><label>What needs to get done?</label><input class="input" id="newTaskTitle" placeholder="e.g. Edit the testimonial video" style="width:100%;"></div>'+
    '<div class="field" style="margin-top:10px;"><label>Client(s) / Lead(s)</label>'+clientChipPickerHtml(ui.newTaskClients, 'toggleNewClientChip')+'</div>'+
    '<div class="field" style="margin-top:10px;"><label>Priority</label><select class="input" id="newTaskPriority"><option value="low">Low</option><option value="med" selected>Medium</option><option value="high">High</option></select></div>'+
    '<div class="field" style="margin-top:10px;"><label>Category (optional)</label><select class="input" id="newTaskCategory"><option value="">&mdash; None &mdash;</option>'+arr(state.tasks.categories).map(function(c){ return '<option value="'+c.id+'">'+escapeHtml(c.label)+'</option>'; }).join('')+'</select></div>'+
    '<div class="field" style="margin-top:10px;"><label>Deadline (optional)</label><div class="row"><input class="input" type="date" id="newTaskDeadline"><input class="input" type="time" id="newTaskDeadlineTime" title="Time (optional)" style="width:110px;"><button class="btn btn-ghost btn-sm" data-action="openDatePicker" data-target="newTaskDeadline">&#128197;</button><button class="btn btn-ghost btn-sm" data-action="setFieldToday" data-target="newTaskDeadline">Today</button><button class="btn btn-ghost btn-sm" data-action="clearField" data-target="newTaskDeadline" title="Remove deadline">Clear</button></div></div>'+
    taskAlarmFieldsHtml('newTask', null)+
    '<div class="field" style="margin-top:10px;"><label>Notes (optional)</label><textarea class="input" id="newTaskNotes" placeholder="Any details worth remembering" style="width:100%;min-height:60px;"></textarea></div>'+
    '<label class="row" style="margin-top:10px;font-size:12.5px;color:var(--text-dim);"><input type="checkbox" id="newTaskOngoing" style="margin-right:6px;">&#128204; Ongoing — takes more than a day'+tip('It stays on your list day after day until it\'s actually finished: tick it off for today without closing it. When it\'s due is just the Deadline above.')+'</label>'+
    '<div id="newTaskOngoingExtra" style="display:none;">'+
    '<div class="field" style="margin-top:10px;"><label>How often you work on it (optional)</label><select class="input" id="newTaskOngoingFrequency"><option value="">&mdash;</option><option value="daily">Daily</option><option value="few">A few times a week</option><option value="weekly">Weekly</option></select></div>'+
    '<label class="row" style="margin-top:10px;font-size:12.5px;color:var(--text-dim);"><input type="checkbox" id="newTaskIncludeStandard" style="margin-right:6px;">Include in Today\'s Standard</label>'+
    '</div>'+
    '<div class="row" style="margin-top:20px;justify-content:flex-end;">'+
      '<button class="btn btn-ghost" data-action="closeAddTaskModal">Cancel</button>'+
      '<button class="btn" data-action="addTaskBacklog">Add to Backlog</button>'+
      '<button class="btn btn-good" data-action="addTaskToday">Add to Today</button>'+
    '</div>';
}
function renderAddTaskModalInto(){ const el=document.getElementById('addTaskContent'); if(el) morphInto(el, renderAddTaskModal(), {form:true}); }
function addTask(status){
  const title = document.getElementById('newTaskTitle').value.trim();
  if(!title) return;
  const clients = ui.newTaskClients.length ? ui.newTaskClients.slice() : ['personal'];
  const priority = document.getElementById('newTaskPriority').value;
  const deadline = document.getElementById('newTaskDeadline').value || null;
  const dlTimeEl = document.getElementById('newTaskDeadlineTime');
  const deadlineTime = (deadline && dlTimeEl && dlTimeEl.value) ? dlTimeEl.value : null;
  const notes = document.getElementById('newTaskNotes').value.trim();
  const ongoingEl = document.getElementById('newTaskOngoing');
  const ongoing = !!(ongoingEl && ongoingEl.checked);
  const ongoingDeadline = ongoing ? deadline : null;
  const ongoingFrequencyEl = document.getElementById('newTaskOngoingFrequency');
  const ongoingFrequency = (ongoing && ongoingFrequencyEl) ? (ongoingFrequencyEl.value || null) : null;
  const includeStandardEl = document.getElementById('newTaskIncludeStandard');
  const includeInStandard = ongoing && !!(includeStandardEl && includeStandardEl.checked);
  const categoryEl = document.getElementById('newTaskCategory');
  const categoryId = categoryEl && categoryEl.value ? categoryEl.value : null;
  state.tasks.items.push({id:uid(), title:title, client:clients[0], clients:clients, priority:priority, deadline:deadline, notes:notes, status:status, ongoing:ongoing, ongoingDeadline:ongoingDeadline, ongoingFrequency:ongoingFrequency, includeInStandard:includeInStandard, categoryId:categoryId, deadlineTime:deadlineTime, eventId:ui.newTaskEventId||null, createdAt:todayStr(), completedAt:null});
  const newT = state.tasks.items[state.tasks.items.length-1];
  const alarmCfg = readTaskAlarmFields('newTask');
  if(alarmCfg){ newT.alarm = alarmCfg; syncTaskAlarms(newT); if(deadline && deadlineTime) showToast('Alarms set: '+taskAlarmHint(newT).replace(/&middot;/g,'·'), {icon:'&#9200;', duration:5000}); }
  if(ui.newTaskEventId){ const ev = state.calendar.events.find(function(x){ return x.id===ui.newTaskEventId; }); if(ev){ ev.taskIds = arr(ev.taskIds).concat([state.tasks.items[state.tasks.items.length-1].id]); persist('calendar'); } ui.newTaskEventId = null; }
  closeAddTaskModal();
  playTaskAdded();
  persist('tasks'); renderView();
}
function quickAddToday(){
  const inp = document.getElementById('quickTaskInput');
  const title = inp.value.trim();
  if(!title) return;
  state.tasks.items.push({id:uid(), title:title, client:'personal', clients:['personal'], priority:'med', deadline:null, notes:'', status:'today', createdAt:todayStr(), completedAt:null});
  ui.forms.quickAddToday = false;
  playTaskAdded();
  persist('tasks'); renderView();
}
function setQuickAddMode(mode){ ui.quickAddMode = mode; renderView(); }
function pullSpecificFromBacklog(id){
  const t = state.tasks.items.find(function(x){ return x.id===id; });
  if(!t) return;
  t.status = 'today';
  ui.forms.quickAddToday = false;
  playTaskAdded();
  persist('tasks'); renderView();
}
function accumulateCurrentTaskTime(taskId, endAt){
  if(ui.currentTaskId!==taskId || !ui.currentTaskStartedAt) return;
  const t=state.tasks.items.find(function(x){return x.id===taskId;});
  if(t){
    const now = Math.max(ui.currentTaskStartedAt, Math.min(Date.now(), endAt || Date.now()));
    const mins = Math.max(0, Math.round((now-ui.currentTaskStartedAt)/60000));
    t.trackedMinutes = (t.trackedMinutes||0) + mins;
    // Timing log per task, so analytics can say what each session was spent on and
    // deep-work exclusions can be subtracted from the right day.
    if(now-ui.currentTaskStartedAt >= 30000){
      if(!Array.isArray(state.focus.taskSegments)) state.focus.taskSegments = [];
      const as = state.focus.activeSession;
      state.focus.taskSegments.push({id:uid(), taskId:taskId, start:ui.currentTaskStartedAt, end:now, date:todayStr(new Date(ui.currentTaskStartedAt)), inSession:!!as, sessionType: as ? sessionType(as) : null});
      persist('focus');
    }
  }
  ui.currentTaskId = null;
  ui.currentTaskStartedAt = null;
}
function setCurrentTask(taskId){
  const t = state.tasks.items.find(function(x){return x.id===taskId;});
  if(!t || t.status==='done' || ui.currentTaskId===taskId) return;
  const as = state.focus.activeSession;
  if(as && as.onBreak) return;
  if(ui.currentTaskId) accumulateCurrentTaskTime(ui.currentTaskId);
  if(state.focus.nextTaskId===taskId){ state.focus.nextTaskId = null; persist('focus'); }
  ui.currentTaskId = taskId;
  ui.currentTaskStartedAt = Date.now();
  persist('tasks'); renderView();
}
function releaseCurrentTask(){
  if(!ui.currentTaskId) return;
  accumulateCurrentTaskTime(ui.currentTaskId);
  persist('tasks'); renderView();
}
function finishCurrentTask(){
  if(!ui.currentTaskId) return;
  completeTask(ui.currentTaskId);
}
function isOngoingDoneToday(t){ return !!(t && t.ongoing && arr(t.ongoingDoneDates).indexOf(todayStr())>=0); }
function toggleTaskActive(id){
  const t = state.tasks.items.find(function(x){return x.id===id;}); if(!t) return;
  t.active = !t.active;
  playTick();
  persist('tasks'); renderView();
}
function completeTask(id){
  const t=state.tasks.items.find(function(x){return x.id===id;}); if(!t) return;
  if(justCompletedTaskId===id) return;
  methodTaskDone(id);
  if(ui.currentTaskId===id) accumulateCurrentTaskTime(id);
  if(t.ongoing){
    if(!Array.isArray(t.ongoingDoneDates)) t.ongoingDoneDates=[];
    if(t.ongoingDoneDates.indexOf(todayStr())<0) t.ongoingDoneDates.push(todayStr());
    playTaskComplete();
    justCompletedTaskId = id;
    persist('tasks'); renderView();
    setTimeout(function(){ if(justCompletedTaskId===id){ justCompletedTaskId=null; renderView(); } }, 950);
    showToast('Nice — logged for today. Resets tomorrow.', {icon:'&#128204;'});
    return;
  }
  playTaskComplete();
  justCompletedTaskId = id;
  renderView();
  setTimeout(function(){
    const t2 = state.tasks.items.find(function(x){return x.id===id;});
    if(t2 && justCompletedTaskId===id){
      t2.status='done'; t2.completedAt=todayStr();
      if(state.focus.activeSession){
        if(!Array.isArray(state.focus.activeSession.completedTasks)) state.focus.activeSession.completedTasks=[];
        state.focus.activeSession.completedTasks.push({id:t2.id, title:t2.title, client:t2.client, note:'', noteFinalized:false});
        persist('focus');
      }
      persist('tasks');
    }
    if(justCompletedTaskId===id) justCompletedTaskId=null;
    renderView();
  }, 550);
}
function undoTask(id){
  const t=state.tasks.items.find(function(x){return x.id===id;}); if(!t) return;
  if(justCompletedTaskId===id){ justCompletedTaskId=null; renderView(); return; }
  if(t.ongoing){
    t.ongoingDoneDates = arr(t.ongoingDoneDates).filter(function(d){ return d!==todayStr(); });
    persist('tasks'); renderView();
    return;
  }
  t.status='today'; t.completedAt=null;
  if(state.focus.activeSession && Array.isArray(state.focus.activeSession.completedTasks)){
    state.focus.activeSession.completedTasks = state.focus.activeSession.completedTasks.filter(function(x){ return x.id!==id; });
    persist('focus');
  }
  persist('tasks'); renderView();
}
function promoteTask(id){ const t=state.tasks.items.find(function(x){return x.id===id;}); if(t){ t.status='today'; persist('tasks'); renderView(); } }
function demoteTask(id){ const t=state.tasks.items.find(function(x){return x.id===id;}); if(t){ t.status='backlog'; persist('tasks'); renderView(); } }

