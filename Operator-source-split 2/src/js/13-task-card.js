// ============ TASK CARD (with edit) ============
function deadlineTag(t){
  if(!t.deadline) return '';
  const overdue = t.status!=='done' && t.deadline < todayStr();
  const dueToday = t.deadline === todayStr();
  const color = overdue ? 'var(--danger)' : dueToday ? 'var(--accent)' : 'var(--text-faint)';
  return '<span class="kpi-sub" style="color:'+color+';">Due '+fmtDateShort(t.deadline)+'</span>';
}
function selectBoxHtml(id, selected){
  return '<div class="select-box'+(selected?' checked':'')+'" data-action="toggleTaskSelect" data-id="'+id+'" title="Select"></div>';
}
function taskRow(t){
  const selected = ui.selectedTaskIds.has(t.id);
  return '<div class="task-item-v2 '+(t.status==='done'?'done':'')+(selected?' row-selected':'')+'">'+
    selectBoxHtml(t.id, selected)+
    '<div style="flex:1;min-width:140px;">'+
      '<div class="task-title-row">'+priorityTag(t.priority)+(t.ongoing?'<span class="tag tag-ongoing">Ongoing</span>':'')+'<span class="task-title">'+escapeHtml(t.title)+'</span></div>'+
      (t.notes ? '<div class="task-notes">'+escapeHtml(t.notes)+'</div>' : '')+
    '</div>'+
    clientTagsHtml(t.clients)+
    deadlineTag(t)+
  '</div>';
}
function moveTaskToBacklog(id){
  const t = state.tasks.items.find(function(x){return x.id===id;}); if(!t) return;
  if(ui.currentTaskId===id) accumulateCurrentTaskTime(id);
  t.status='backlog';
  playTick();
  persist('tasks'); renderView();
}
function taskCard(t){
  const draggable = (t.status==='done'?false:true);
  const selected = ui.selectedTaskIds.has(t.id);
  const isCurrent = ui.currentTaskId===t.id;
  const pending = justCompletedTaskId===t.id;
  const doneToday = isOngoingDoneToday(t) || pending;
  const isStaged = !state.focus.activeSession && ui.stagedTaskId===t.id;
  const cat = t.categoryId ? taskCategoryById(t.categoryId) : null;
  const whiteAccent = t.isVideoIdea===true;
  return '<div class="task-card '+(t.status==='done'?'done':'')+(t.ongoing?' ongoing-task-card':'')+(selected?' card-selected':'')+(isCurrent?' current-task-active':'')+(pending?' just-completed':'')+(isStaged?' staged-task-card':'')+(whiteAccent?' video-idea-card':'')+'" data-action="'+(ui.taskSelectMode?'toggleTaskSelect':'openTaskEditModal')+'" data-id="'+t.id+'" style="cursor:pointer;'+(cat && !whiteAccent?'border-left:3px solid '+cat.color+';':'')+'" '+(draggable?'draggable="true" data-task-id="'+t.id+'"':'')+'>'+
    '<div class="row" style="justify-content:space-between;">'+(ui.taskSelectMode?selectBoxHtml(t.id, selected):'')+priorityTag(t.priority)+(isCurrent?'<span class="tag" style="border:1px solid var(--accent);color:var(--accent);background:transparent;">'+currentTaskLabel()+'</span>':'')+(isStaged?'<span class="tag" style="border:1px solid var(--accent);color:var(--accent);background:transparent;">&#128204; Up Next</span>':'')+(t.ongoing?'<span class="tag tag-ongoing">&#128204; Ongoing</span>':'')+(doneToday?'<span class="tag tag-good">&#10003; Done today</span>':'')+'</div>'+
    '<div class="task-card-title">'+escapeHtml(t.title)+'</div>'+
    (t.notes ? '<div class="task-notes">'+escapeHtml(t.notes)+'</div>' : '')+
    (t.isVideoIdea && t.videoType ? '<div style="margin-top:2px;"><span class="tag" style="background:rgba(255,255,255,.1);color:#fff;">'+escapeHtml((taskVideoTypeById(t.videoType)||{}).label||'')+'</span></div>' : '')+
    (cat ? '<div style="margin-top:4px;">'+taskCategoryTagHtml(t)+'</div>' : '')+
    (t.ongoing ? '<div class="ongoing-days-pill" style="align-self:flex-start;">'+daysInProgress(t)+' day'+(daysInProgress(t)===1?'':'s')+' in progress</div>' : '')+
    '<div class="row" style="justify-content:space-between;margin-top:auto;padding-top:6px;">'+
      clientTagsHtml(t.clients)+
      (t.deadline ? deadlineTag(t) : '')+
    '</div>'+
    (t.status==='backlog' ? '<button class="btn btn-primary btn-sm" style="margin-top:6px;" data-action="pullSpecificFromBacklog" data-id="'+t.id+'">+ Add to Today</button>' : '')+
    (t.status==='today' ? '<button class="btn btn-ghost btn-sm" style="margin-top:6px;" data-action="moveTaskToBacklog" data-id="'+t.id+'">&rarr; Move to Backlog</button>' : '')+
    (t.ongoing ? '<div class="row" style="margin-top:8px;"><button class="btn btn-sm '+(doneToday?'btn-ghost':'btn-good')+'" data-action="'+(doneToday?'undoTask':'completeTask')+'" data-id="'+t.id+'" style="width:100%;">'+(doneToday?'Undo — done for today':'&#10003; Mark done for today')+'</button></div>' : '')+
  '</div>';
}
function finishedTaskRow(t){
  const selected = ui.selectedTaskIds.has(t.id);
  return '<div class="finished-row'+(selected?' row-selected':'')+(t.isVideoIdea?' video-idea-card':'')+'" draggable="true" data-task-id="'+t.id+'">'+
    (ui.taskSelectMode?selectBoxHtml(t.id, selected):'')+
    '<div style="min-width:0;flex:1;">'+
      '<div class="task-title-row">'+priorityTag(t.priority)+'<span class="task-title" style="text-decoration:line-through;opacity:.7;">'+escapeHtml(t.title)+'</span></div>'+
      (t.notes ? '<div class="task-notes">'+escapeHtml(t.notes)+'</div>' : '')+
    '</div>'+
    '<span class="kpi-sub">'+(t.completedAt ? fmtDateShort(t.completedAt) : (isOngoingDoneToday(t) ? 'Today &middot; resets tomorrow' : ''))+'</span>'+
    '<button class="btn btn-ghost btn-sm" data-action="undoTask" data-id="'+t.id+'" title="Move back to Today">&#8634; Undo</button>'+
  '</div>';
}
function daysInProgress(t){
  if(!t.createdAt) return 0;
  const parts = t.createdAt.split('-').map(Number);
  const start = new Date(parts[0],parts[1]-1,parts[2]);
  const now = new Date(todayStr());
  return Math.max(0, Math.round((now-start)/86400000));
}
function daysAgoFrom(dateStr){
  if(!dateStr) return null;
  const p = dateStr.split('-').map(Number);
  const d = new Date(p[0],p[1]-1,p[2]);
  const tp = todayStr().split('-').map(Number);
  const now = new Date(tp[0],tp[1]-1,tp[2]);
  return Math.round((now-d)/86400000);
}
function relativeDayLabel(dateStr){
  const d = daysAgoFrom(dateStr);
  if(d===null) return null;
  if(d<=0) return 'today';
  if(d===1) return 'yesterday';
  return d+' days ago';
}
function toggleShowAllFinished(){ ui.showAllFinished = !ui.showAllFinished; renderView(); }
function toggleTaskSelect(id){
  if(ui.selectedTaskIds.has(id)) ui.selectedTaskIds.delete(id); else ui.selectedTaskIds.add(id);
  renderView();
}
function clearTaskSelection(){ ui.selectedTaskIds.clear(); renderView(); }
function renderTaskToolbar(){
  const ids = Array.from(ui.selectedTaskIds).filter(function(id){ return state.tasks.items.some(function(t){return t.id===id;}); });
  if(!ids.length){
    return '<div class="row" style="justify-content:flex-end;margin-bottom:8px;">'+
      '<button class="btn btn-ghost btn-sm" data-action="toggleTaskSelectMode">'+(ui.taskSelectMode?'Done Selecting':'Select Multiple')+'</button>'+
    '</div>';
  }
  const selectedTasks = ids.map(function(id){ return state.tasks.items.find(function(t){return t.id===id;}); }).filter(Boolean);
  const anyToday = selectedTasks.some(function(t){return t.status==='today';});
  const anyBacklog = selectedTasks.some(function(t){return t.status==='backlog';});
  const anyDone = selectedTasks.some(function(t){return t.status==='done';});
  const anyNotDone = selectedTasks.some(function(t){return t.status!=='done';});
  return '<div class="bulk-toolbar section">'+
    '<span class="toolbar-label">'+ids.length+' selected</span>'+
    '<div class="toolbar-actions">'+
      (ids.length===1 ? '<button class="btn btn-sm" data-action="openTaskEditModal" data-id="'+ids[0]+'">Edit</button>' : '')+
      (anyNotDone ? '<button class="btn btn-good btn-sm" data-action="bulkCompleteTasks">Complete</button>' : '')+
      (anyDone ? '<button class="btn btn-ghost btn-sm" data-action="bulkUndoTasks">Undo</button>' : '')+
      ((anyBacklog||anyDone) ? '<button class="btn btn-ghost btn-sm" data-action="bulkMoveTasks" data-target="today">Move to Today</button>' : '')+
      ((anyToday||anyDone) ? '<button class="btn btn-ghost btn-sm" data-action="bulkMoveTasks" data-target="backlog">Move to Backlog</button>' : '')+
      '<button class="btn btn-danger-ghost btn-sm" data-action="bulkRemoveTasks">Remove</button>'+
    '</div>'+
    '<button class="btn btn-ghost btn-sm toolbar-cancel" data-action="clearTaskSelection">Cancel</button>'+
  '</div>';
}
function toggleTaskSelectMode(){
  ui.taskSelectMode = !ui.taskSelectMode;
  if(!ui.taskSelectMode) ui.selectedTaskIds.clear();
  renderView();
}
function bulkCompleteTasks(){ Array.from(ui.selectedTaskIds).forEach(function(id){ const t=state.tasks.items.find(function(x){return x.id===id;}); if(t && t.status!=='done') completeTask(id); }); ui.selectedTaskIds.clear(); renderView(); }
function bulkUndoTasks(){ Array.from(ui.selectedTaskIds).forEach(function(id){ const t=state.tasks.items.find(function(x){return x.id===id;}); if(t && t.status==='done') undoTask(id); }); ui.selectedTaskIds.clear(); renderView(); }
function bulkMoveTasks(target){
  Array.from(ui.selectedTaskIds).forEach(function(id){
    const t = state.tasks.items.find(function(x){return x.id===id;}); if(!t) return;
    t.status = target; t.completedAt = target==='done' ? todayStr() : null;
  });
  ui.selectedTaskIds.clear();
  persist('tasks'); renderView();
}
function bulkRemoveTasks(){
  const ids = new Set(ui.selectedTaskIds);
  state.tasks.items = state.tasks.items.filter(function(t){ return !ids.has(t.id); });
  ui.selectedTaskIds.clear();
  persist('tasks'); renderView();
}
function openTaskEditModal(id){
  ui.editingTaskId = id;
  const t = state.tasks.items.find(function(x){return x.id===id;});
  ui.editTaskClientsSel = t ? t.clients.slice() : ['personal'];
  const o = document.getElementById('taskEditOverlay');
  if(!o) return;
  o.classList.remove('hidden');
  renderTaskEditModalInto();
}
function closeTaskEditModal(){ ui.editingTaskId = null; ui.selectedTaskIds.clear(); const o=document.getElementById('taskEditOverlay'); if(o) o.classList.add('hidden'); }
function renderTaskEditModal(){
  const t = state.tasks.items.find(function(x){return x.id===ui.editingTaskId;});
  if(!t) return '';
  return '<div class="section-title" style="margin-bottom:14px;">Edit Task</div>'+
    '<div class="field"><label>Title</label><input class="input" id="editTitle-'+t.id+'" value="'+escapeHtml(t.title)+'" style="width:100%;"></div>'+
    '<div class="field" style="margin-top:10px;"><label>Client(s) / Lead(s)</label>'+clientChipPickerHtml(ui.editTaskClientsSel, 'toggleEditClientChip')+'</div>'+
    '<div class="field" style="margin-top:10px;"><label>Priority</label><select class="input" id="editPriority-'+t.id+'"><option value="low" '+(t.priority==='low'?'selected':'')+'>Low</option><option value="med" '+(t.priority==='med'?'selected':'')+'>Medium</option><option value="high" '+(t.priority==='high'?'selected':'')+'>High</option></select></div>'+
    '<div class="field" style="margin-top:10px;"><label>Category</label><select class="input" id="editCategory-'+t.id+'"><option value="">&mdash; None &mdash;</option>'+arr(state.tasks.categories).map(function(c){ return '<option value="'+c.id+'" '+(t.categoryId===c.id?'selected':'')+'>'+escapeHtml(c.label)+'</option>'; }).join('')+'</select></div>'+
    '<div class="field" style="margin-top:10px;"><label>Deadline</label><div class="row"><input class="input" type="date" id="editDeadline-'+t.id+'" value="'+(t.deadline||'')+'"><button class="btn btn-ghost btn-sm" data-action="openDatePicker" data-target="editDeadline-'+t.id+'">&#128197;</button><button class="btn btn-ghost btn-sm" data-action="setFieldToday" data-target="editDeadline-'+t.id+'">Today</button>'+(t.deadline?'<button class="btn btn-ghost btn-sm" data-action="clearField" data-target="editDeadline-'+t.id+'" title="Remove deadline">Clear</button>':'')+'</div></div>'+
    '<div class="field" style="margin-top:10px;"><label>Notes</label><textarea class="input" id="editNotes-'+t.id+'" style="width:100%;min-height:60px;">'+escapeHtml(t.notes||'')+'</textarea></div>'+
    '<label class="row" style="margin-top:10px;font-size:12.5px;color:var(--text-dim);"><input type="checkbox" id="editOngoing-'+t.id+'" '+(t.ongoing?'checked':'')+' style="margin-right:6px;">&#128204; Ongoing (may take more than one day)</label>'+
    '<div id="editTaskOngoingExtra-'+t.id+'" style="display:'+(t.ongoing?'block':'none')+';">'+
    '<div class="field" style="margin-top:10px;"><label>Ongoing target date (optional)</label><div class="row"><input class="input" type="date" id="editOngoingDeadline-'+t.id+'" value="'+(t.ongoingDeadline||'')+'"><button class="btn btn-ghost btn-sm" data-action="openDatePicker" data-target="editOngoingDeadline-'+t.id+'">&#128197;</button><button class="btn btn-ghost btn-sm" data-action="clearField" data-target="editOngoingDeadline-'+t.id+'">Clear</button></div></div>'+
    '<div class="field" style="margin-top:10px;"><label>Frequency (optional)</label><select class="input" id="editOngoingFrequency-'+t.id+'">'+
      ['', 'daily', 'few', 'weekly'].map(function(v){ const lbl = v==='' ? '&mdash;' : v==='daily'?'Daily':v==='few'?'A few times a week':'Weekly'; return '<option value="'+v+'" '+((t.ongoingFrequency||'')===v?'selected':'')+'>'+lbl+'</option>'; }).join('')+
    '</select></div>'+
    '<label class="row" style="margin-top:10px;font-size:12.5px;color:var(--text-dim);"><input type="checkbox" id="editIncludeStandard-'+t.id+'" '+(t.includeInStandard?'checked':'')+' style="margin-right:6px;">Include in Today\'s Standard</label>'+
    '</div>'+
    '<div class="row" style="margin-top:20px;justify-content:flex-end;">'+
      '<button class="btn btn-ghost" data-action="closeTaskEditModal">Cancel</button>'+
      '<button class="btn btn-primary" data-action="saveEditTask" data-id="'+t.id+'">Save</button>'+
    '</div>';
}
function renderTaskEditModalInto(){ const el=document.getElementById('taskEditContent'); if(el) el.innerHTML = renderTaskEditModal(); }
function saveEditTask(id){
  const t = state.tasks.items.find(function(x){return x.id===id;}); if(!t) return;
  const titleEl = document.getElementById('editTitle-'+id);
  t.title = titleEl.value.trim() || t.title;
  t.clients = ui.editTaskClientsSel.length ? ui.editTaskClientsSel.slice() : ['personal'];
  t.client = t.clients[0];
  t.priority = document.getElementById('editPriority-'+id).value;
  const catEl = document.getElementById('editCategory-'+id);
  t.categoryId = catEl && catEl.value ? catEl.value : null;
  t.deadline = document.getElementById('editDeadline-'+id).value || null;
  t.notes = document.getElementById('editNotes-'+id).value.trim();
  const ongoingEl = document.getElementById('editOngoing-'+id);
  t.ongoing = !!(ongoingEl && ongoingEl.checked);
  if(t.ongoing){
    const ongoingDeadlineEl = document.getElementById('editOngoingDeadline-'+id);
    t.ongoingDeadline = ongoingDeadlineEl ? (ongoingDeadlineEl.value || null) : t.ongoingDeadline;
    const ongoingFrequencyEl = document.getElementById('editOngoingFrequency-'+id);
    t.ongoingFrequency = ongoingFrequencyEl ? (ongoingFrequencyEl.value || null) : t.ongoingFrequency;
    const includeStandardEl = document.getElementById('editIncludeStandard-'+id);
    t.includeInStandard = !!(includeStandardEl && includeStandardEl.checked);
  } else {
    t.ongoingDeadline = null;
    t.ongoingFrequency = null;
    t.includeInStandard = false;
  }
  ui.selectedTaskIds.clear();
  closeTaskEditModal();
  persist('tasks'); renderView();
}
function setFieldToday(targetId){
  const el = document.getElementById(targetId);
  if(el) el.value = todayStr();
}
function clearField(targetId){
  const el = document.getElementById(targetId);
  if(el) el.value = '';
}

