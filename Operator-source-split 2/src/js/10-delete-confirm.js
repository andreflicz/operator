// ============ DELETE (armed confirm pattern) ============
function deleteBtn(scope, id){
  const key = scope+':'+id;
  if(armed.has(key)) return '<button class="btn btn-danger btn-sm" data-action="confirmDelete" data-scope="'+scope+'" data-id="'+id+'">Confirm?</button>';
  return '<button class="btn btn-ghost btn-sm" data-action="armDelete" data-scope="'+scope+'" data-id="'+id+'">Remove</button>';
}
function armDelete(scope,id){
  const key=scope+':'+id;
  armed.add(key); renderView();
  setTimeout(function(){ if(armed.has(key)){ armed.delete(key); renderView(); } }, 3000);
}
function performDelete(scope, id){
  armed.delete(scope+':'+id);
  if(scope==='task'){
    state.tasks.items = state.tasks.items.filter(function(x){return x.id!==id;});
    if(ui.editingTaskId===id) closeTaskEditModal();
    if(ui.editingVideoIdeaId===id) closeVideoIdeaEditModal();
    if(ui.currentTaskId===id){ ui.currentTaskId = null; ui.currentTaskStartedAt = null; }
    if(ui.stagedTaskId===id) ui.stagedTaskId = null;
    if(ui.pendingCurrentTaskId===id) ui.pendingCurrentTaskId = null;
  }
  if(scope==='alarm'){ state.focus.alarms = state.focus.alarms.filter(function(x){return x.id!==id;}); if(ui.editingAlarmId===id) closeAlarmEditModal(); }
  if(scope==='session') state.focus.sessions = state.focus.sessions.filter(function(x){return x.id!==id;});
  if(scope==='prep') state.focus.prepItems = state.focus.prepItems.filter(function(x){return x.id!==id;});
  if(scope==='motivation'){
    state.focus.motivations.toward = state.focus.motivations.toward.filter(function(x){return x.id!==id;});
    state.focus.motivations.away = state.focus.motivations.away.filter(function(x){return x.id!==id;});
  }
  if(scope==='standard') state.standards.items = state.standards.items.filter(function(x){return x.id!==id;});
  if(scope==='gym'){ state.health.gymLog = state.health.gymLog.filter(function(x){return x.id!==id;}); if(ui.editingWorkoutId===id) closeWorkoutEditModal(); }
  if(scope==='weight') state.health.weightLog = state.health.weightLog.filter(function(x){return x.id!==id;});
  if(scope==='calorie') state.health.calorieEntries = state.health.calorieEntries.filter(function(x){return x.id!==id;});
  if(scope==='meal') state.meals.library = state.meals.library.filter(function(x){return x.id!==id;});
  if(scope==='journal'){ state.journal.entries = state.journal.entries.filter(function(x){return x.id!==id;}); if(ui.editingJournalId===id) closeJournalEditModal(); }
  if(scope==='debt') state.finances.debts = state.finances.debts.filter(function(x){return x.id!==id;});
  if(scope==='income') state.finances.income = state.finances.income.filter(function(x){return x.id!==id;});
  if(scope==='invoice') state.finances.invoices = state.finances.invoices.filter(function(x){return x.id!==id;});
  if(scope==='prospect'){ state.business.pipeline = state.business.pipeline.filter(function(x){return x.id!==id;}); if(ui.editingProspectId===id) closeProspectEditModal(); }
  if(scope==='client'){ state.business.clients = state.business.clients.filter(function(x){return x.id!==id;}); if(ui.showClientModal===id) closeClientModal(); }
  if(scope==='calevent'){ state.calendar.events = state.calendar.events.filter(function(x){return x.id!==id;}); if(ui.editingCalEventId===id) closeCalEventModal(); }
  if(scope==='calcat'){
    if(state.calendar.categories.length>1){
      let fallback = state.calendar.categories.find(function(c){ return c.id==='other'; });
      if(!fallback || fallback.id===id){
        fallback = state.calendar.categories.find(function(c){ return c.id!==id; });
      }
      state.calendar.events.forEach(function(ev){ if(ev.categoryId===id) ev.categoryId = fallback.id; });
      state.calendar.categories = state.calendar.categories.filter(function(x){return x.id!==id;});
    }
  }
  if(scope==='journaltype') state.journal.types = arr(state.journal.types).filter(function(x){return x.id!==id;});
  if(scope==='taskcat'){
    state.tasks.items.forEach(function(t){ if(t.categoryId===id) t.categoryId=null; });
    state.tasks.categories = arr(state.tasks.categories).filter(function(x){return x.id!==id;});
  }
  if(scope==='videotype'){
    state.tasks.items.forEach(function(t){ if(t.videoType===id) t.videoType=null; });
    state.tasks.videoTypes = arr(state.tasks.videoTypes).filter(function(x){return x.id!==id;});
  }
  if(scope==='goal'){ state.goals.items = state.goals.items.filter(function(x){return x.id!==id;}); if(ui.editingGoalId===id) closeGoalEditModal(); }
  if(scope==='package'){ state.business.packages = arr(state.business.packages).filter(function(x){return x.id!==id;}); if(ui.editingPackageId===id) closePackageEditModal(); }
  if(scope==='clientjournal'){ arr(state.business.clients).forEach(function(cl){ cl.journal = arr(cl.journal).filter(function(x){return x.id!==id;}); }); }
  const map = {task:'tasks', alarm:'focus', session:'focus', prep:'focus', motivation:'focus', standard:'standards', gym:'health', weight:'health', calorie:'health', meal:'meals', journal:'journal', journaltype:'journal', debt:'finances', income:'finances', invoice:'finances', prospect:'business', client:'business', calevent:'calendar', calcat:'calendar', goal:'goals', package:'business', clientjournal:'business', taskcat:'tasks', videotype:'tasks'};
  persist(map[scope]);
  renderView();
}

