// ============ EVENT DELEGATION ============
document.body.addEventListener('click', function(e){
  const el = e.target.closest('[data-action]');
  if(!el) return;
  const a = el.dataset.action;
  const id = el.dataset.id;
  switch(a){
    case 'nav': {
      closePreFocusModal(); closeStopFocus(); closeTimesUpModal(); closeMultiBreakWarning(); closeFinalStopConfirm();
      closeTaskEditModal(); closeProspectEditModal(); closeClientModal(); closeLockInChooser(); closeJournalEditModal(); closeGoalEditModal();
      closeWorkoutEditModal(); closeJournalClearConfirm(); closeBreakNotePrompt(); closeBreakDetail(); closeInvoiceModal();
      closeAttachReceiptModal(); closeAddTaskModal(); closeDatePicker(); closeRetainerEdit(); closeLogPaymentModal();
      closeUpcomingPopover(); closeQuickJournalModal(); closeJournalPhotoView(); closeCalEventModal(); closeAlarmEditModal(); closePackageEditModal(); closeCustomDeliverableDrawer(); closeNewPackageModal(); closeVideoIdeaEditModal(); closeAddVideoIdeaModal();
      ui.selectedTaskIds.clear(); ui.selectedProspectIds.clear();
      const changing = el.dataset.view !== ui.view;
      ui.view = el.dataset.view;
      if(ui.view==='business' && changing) ui.businessTab='overview';
      if(ui.view==='personal' && el.dataset.tab) ui.personalTab = el.dataset.tab;
      else if(ui.view==='personal' && changing) ui.personalTab='goals';
      if(ui.view==='focus' && changing) ui.focusTab='timer';
      renderView(); break;
    }
    case 'healthTab': ui.healthTab = el.dataset.tab; renderView(); break;
    case 'businessTab': ui.businessTab = el.dataset.tab; renderView(); break;
    case 'settingsTab': ui.settingsTab = el.dataset.tab; renderView(); break;
    case 'goToAlarmSettings': {
      ui.view = 'settings';
      ui.settingsTab = 'focus';
      renderView();
      setTimeout(function(){ const s=document.getElementById('alarmsSettingsSection'); if(s) s.scrollIntoView({behavior:'smooth', block:'start'}); }, 30);
      break;
    }
    case 'personalTab': ui.personalTab = el.dataset.tab; renderView(); break;
    case 'focusTab': ui.focusTab = el.dataset.tab; renderView(); break;
    case 'toggleForm': ui.forms[el.dataset.form] = !ui.forms[el.dataset.form]; renderView(); break;
    case 'toggleDayOff': toggleDayOff(); break;
    case 'toggleStandard': toggleStandard(id, el.dataset.date); break;

    case 'toggleTaskSelect': toggleTaskSelect(id); break;
    case 'clearTaskSelection': clearTaskSelection(); break;
    case 'bulkCompleteTasks': bulkCompleteTasks(); break;
    case 'bulkUndoTasks': bulkUndoTasks(); break;
    case 'bulkMoveTasks': bulkMoveTasks(el.dataset.target); break;
    case 'bulkRemoveTasks': bulkRemoveTasks(); break;
    case 'openTaskEditModal': openTaskEditModal(id); break;
    case 'closeTaskEditModal': closeTaskEditModal(); break;
    case 'saveEditTask': saveEditTask(id); break;
    case 'finishCurrentTask': finishCurrentTask(); break;
    case 'releaseCurrentTask': releaseCurrentTask(); break;
    case 'setFieldToday': setFieldToday(el.dataset.target); break;
    case 'clearField': clearField(el.dataset.target); break;
    case 'openDatePicker': openDatePicker(el.dataset.target); break;
    case 'closeDatePicker': closeDatePicker(); break;
    case 'navigateCalMonth': navigateCalMonth(parseInt(el.dataset.delta,10)); break;
    case 'pickCalDay': pickCalDay(parseInt(el.dataset.day,10)); break;
    case 'pickCalToday': pickCalToday(); break;
    case 'openRetainerEdit': openRetainerEdit(el.dataset.id); break;
    case 'closeRetainerEdit': closeRetainerEdit(); break;
    case 'saveRetainerEdit': saveRetainerEdit(); break;
    case 'quickAddToday': quickAddToday(); break;
    case 'setQuickAddMode': setQuickAddMode(el.dataset.mode); break;
    case 'pullSpecificFromBacklog': pullSpecificFromBacklog(id); break;
    case 'addTaskToday': addTask('today'); break;
    case 'addTaskBacklog': addTask('backlog'); break;
    case 'openAddTaskModal': openAddTaskModal(); break;
    case 'closeAddTaskModal': closeAddTaskModal(); break;
    case 'toggleNewClientChip': toggleNewClientChip(el.dataset.value); break;
    case 'toggleEditClientChip': toggleEditClientChip(el.dataset.value); break;
    case 'completeTask': completeTask(id); break;
    case 'toggleTaskActive': toggleTaskActive(id); break;
    case 'clearStagedTask': clearStagedTask(); break;
    case 'quickLinkNotSet': goToSettingsQuickLinks(); break;
    case 'resetQuickLinkIcon': {
      if(state.settings.quickLinks.icons) delete state.settings.quickLinks.icons[el.dataset.value];
      persist('settings'); renderView();
      break;
    }
    case 'aiButtonPress': {
      if(aiHoldCycled){ e.preventDefault(); aiHoldCycled = false; }
      else if(!state.focus.activeSession){ e.preventDefault(); maybeNudgeLockIn(); }
      break;
    }
    case 'tasksBottomTab': ui.tasksBottomTab = el.dataset.tab; renderView(); break;
    case 'undoTask': undoTask(id); break;
    case 'promoteTask': promoteTask(id); break;
    case 'demoteTask': demoteTask(id); break;
    case 'toggleShowAllFinished': toggleShowAllFinished(); break;

    case 'quickMeal': quickMeal(id); break;

    case 'openPreFocus': openPreFocusModal(el.dataset.minutes ? Number(el.dataset.minutes) : null); break;
    case 'chooseOpenEnded': chooseOpenEnded(); break;
    case 'openLockInChooser': openLockInChooser(); break;
    case 'closeLockInChooser': closeLockInChooser(); break;
    case 'lockInFocus': lockInFocus(); break;
    case 'viewAllSessions': viewAllSessions(); break;
    case 'openManualLogModal': openManualLogModal(); break;
    case 'closeManualLogModal': closeManualLogModal(); break;
    case 'cancelPreFocus': closePreFocusModal(); break;
    case 'clearStagedTaskFromPreFocus': clearStagedTaskFromPreFocus(); break;
    case 'addTaskFromPreFocus': addTaskFromPreFocus(); break;
    case 'confirmStartFocus': confirmStartFocus(); break;
    case 'openStopFocus': openStopFocus(); break;
    case 'cancelStopFocus': closeStopFocus(); break;
    case 'requestStopConfirm': requestStopConfirm(); break;
    case 'cancelFinalStop': cancelFinalStop(); break;
    case 'reallyConfirmStopFocus': reallyConfirmStopFocus(); break;
    case 'continueFocusFromTimesUp': continueFocusFromTimesUp(); break;
    case 'stopFromTimesUp': stopFromTimesUp(); break;
    case 'addFocusTime': addFocusTime(Number(el.dataset.minutes)); break;
    case 'startBreak': startBreak(Number(el.dataset.minutes)); break;
    case 'endBreakNow': endBreakNow(); break;
    case 'confirmMultiBreak': confirmMultiBreak(); break;
    case 'cancelMultiBreak': cancelMultiBreak(); break;
    case 'openBreakNotePrompt': openBreakNotePrompt(); break;
    case 'closeBreakNotePrompt': closeBreakNotePrompt(); break;
    case 'confirmStartBreakMode': confirmStartBreakMode(); break;
    case 'endBreakModeFromFocus': endBreakModeFromFocus(); break;
    case 'openBreakDetail': openBreakDetail(id); break;
    case 'closeBreakDetail': closeBreakDetail(); break;
    case 'saveDoneTaskNote': saveDoneTaskNote(id); break;
    case 'addManualFocusLog': addManualFocusLog(); break;
    case 'addAlarm': addAlarm(); break;
    case 'setNewReminderType': setNewReminderType(el.dataset.type); break;
    case 'addReminderOrAlarm': addReminderOrAlarm(); break;
    case 'toggleAlarmDay': toggleAlarmDay(id, el.dataset.day); break;
    case 'toggleAlarmEnabled': toggleAlarmEnabled(id); break;
    case 'requestNotifs': requestNotifs(); break;
    case 'testAlarmSound': playBeep(); break;
    case 'pickAlarmSound': state.profile.alarmSound = el.dataset.sound; persist('profile'); playAlarmSound(el.dataset.sound); renderView(); break;
    case 'previewAlarmSound': playAlarmSound(); break;
    case 'dismissAlarm': dismissAlarm(); break;
    case 'snoozeAlarm': snoozeAlarm(); break;

    case 'addWorkout': addWorkout(); break;
    case 'openWorkoutEditModal': openWorkoutEditModal(id); break;
    case 'closeWorkoutEditModal': closeWorkoutEditModal(); break;
    case 'saveEditWorkout': saveEditWorkout(id); break;
    case 'addWeight': addWeight(); break;
    case 'addCalorieEntry': addCalorieEntry(); break;
    case 'addMeal': addMeal(); break;

    case 'toggleJournalExpand': toggleJournalExpand(id); break;
    case 'setJournalMoodFilter': setJournalMoodFilter(el.dataset.mood); break;
    case 'setJournalViewMode': setJournalViewMode(el.dataset.value); break;
    case 'clearJournalFilters': clearJournalFilters(); break;
    case 'toggleJournalSearch': toggleJournalSearch(); break;
    case 'openJournalEditModal': openJournalEditModal(id); break;
    case 'closeJournalEditModal': closeJournalEditModal(); break;
    case 'setEditingJournalMood': setEditingJournalMood(el.dataset.mood); break;
    case 'saveEditJournal': saveEditJournal(id); break;
    case 'togglePinJournal': togglePinJournal(id); break;
    case 'selectMood': selectMood(el.dataset.mood); break;
    case 'addJournal': addJournalEntry(el.dataset.target, el.dataset.type); break;

    case 'addGoal': addGoal(); break;
    case 'toggleGoal': toggleGoal(id); break;
    case 'openGoalEditModal': openGoalEditModal(id); break;
    case 'closeGoalEditModal': closeGoalEditModal(); break;
    case 'saveEditGoal': saveEditGoal(id); break;
    case 'addPackage': addPackage(); break;
    case 'openNewPackageModal': openNewPackageModal(); break;
    case 'closeNewPackageModal': closeNewPackageModal(); break;
    case 'openPackageEditModal': openPackageEditModal(id); break;
    case 'closePackageEditModal': closePackageEditModal(); break;
    case 'addPackageDeliverable': addPackageDeliverable(id); break;
    case 'removePackageDeliverable': removePackageDeliverable(id, el.dataset.did); break;
    case 'pickPackageForClient': pickPackageForClient(id); break;
    case 'cancelPickPackage': cancelPickPackage(); break;
    case 'assignClientPackage': assignClientPackage(id); break;
    case 'clearClientPackage': clearClientPackage(id); break;
    case 'openCustomDeliverableDrawer': openCustomDeliverableDrawer(id); break;
    case 'closeCustomDeliverableDrawer': closeCustomDeliverableDrawer(); break;

    case 'addDebt': addDebt(); break;
    case 'openLogPaymentModal': openLogPaymentModal(id); break;
    case 'closeLogPaymentModal': closeLogPaymentModal(); break;
    case 'confirmLogPayment': confirmLogPayment(); break;
    case 'addIncome': addIncome(); break;
    case 'openInvoiceModal': openInvoiceModal(el.dataset.client, el.dataset.amount?Number(el.dataset.amount):null, el.dataset.desc); break;
    case 'closeInvoiceModal': closeInvoiceModal(); break;
    case 'addInvoice': addInvoice(); break;
    case 'openAttachReceiptModal': openAttachReceiptModal(id); break;
    case 'closeAttachReceiptModal': closeAttachReceiptModal(); break;
    case 'confirmAttachReceipt': confirmAttachReceipt(); break;

    case 'addClient': addClient(); break;
    case 'toggleClientStatus': toggleClientStatus(id); break;
    case 'logClientTouch': logClientTouch(id); break;
    case 'undoClientTouch': undoClientTouch(id); break;
    case 'openClientModal': openClientModal(id); break;
    case 'closeClientModal': closeClientModal(); break;
    case 'closeClientModalAndSave': closeClientModalAndSave(); break;
    case 'addDeliverable': addDeliverable(id); break;
    case 'toggleDeliverable': toggleDeliverable(el.dataset.client, id); break;
    case 'incrementDeliverableProgress': incrementDeliverableProgress(el.dataset.client, id); break;
    case 'undoDeliverableProgress': undoDeliverableProgress(el.dataset.client, id); break;
    case 'lockInFromNudge': lockInFromNudge(); break;
    case 'dismissLockInNudge': dismissLockInNudge(); break;
    case 'lockInFromToast': lockInFromToast(); break;
    case 'removeDeliverable': removeDeliverable(el.dataset.client, id); break;
    case 'addProspect': addProspect(); break;
    case 'advanceStage': advanceStage(id); break;
    case 'undoStage': undoStage(id); break;
    case 'markLost': markLost(id); break;
    case 'convertToClient': convertToClient(id); break;
    case 'toggleProspectSelect': toggleProspectSelect(id); break;
    case 'clearProspectSelection': clearProspectSelection(); break;
    case 'bulkAdvanceStage': bulkAdvanceStage(); break;
    case 'bulkMarkLost': bulkMarkLost(); break;
    case 'bulkRemoveProspects': bulkRemoveProspects(); break;
    case 'openProspectEditModal': openProspectEditModal(id); break;
    case 'closeProspectEditModal': closeProspectEditModal(); break;
    case 'saveEditProspect': saveEditProspect(id); break;

    case 'calPrevMonth': calPrevMonth(); break;
    case 'calNextMonth': calNextMonth(); break;
    case 'toggleCalLegend': ui.showCalLegend = !ui.showCalLegend; renderView(); break;
    case 'selectCalDay': selectCalDay(el.dataset.date); break;
    case 'openCalEventModal': openCalEventModal(id); break;
    case 'openCalItem': openCalItem(el.dataset.kind, id); break;
    case 'closeCalEventModal': closeCalEventModal(); break;
    case 'saveCalEvent': saveCalEvent(); break;
    case 'deleteCalEventFromModal': deleteCalEventFromModal(id); break;
    case 'addReminder': addReminder(); break;
    case 'addMiniReminder': addMiniReminder(); break;
    case 'toggleQuickAccess': toggleQuickAccess(); break;
    case 'openPreFocusPick': openPreFocusPick(); break;
    case 'cancelPreFocusPick': cancelPreFocusPick(); break;
    case 'stageExistingTaskFromPreFocus': stageExistingTaskFromPreFocus(id); break;
    case 'openClientJournalPopover': openClientJournalPopover(el.dataset.client); break;
    case 'closeClientJournalPopover': closeClientJournalPopover(); break;
    case 'dismissReminder': dismissReminder(id); break;
    case 'openAlarmEditModal': openAlarmEditModal(id); break;
    case 'closeAlarmEditModal': closeAlarmEditModal(); break;
    case 'saveAlarmEdit': saveAlarmEdit(id); break;
    case 'joinCall': joinCall(el.dataset.url); break;
    case 'addCalCategory': addCalCategory(); break;
    case 'addTaskCategory': addTaskCategory(); break;
    case 'addVideoType': addVideoType(); break;
    case 'cycleTaskCategoryColor': cycleTaskCategoryColor(id); break;
    case 'pickSwatch': pickSwatch(el.dataset.color); break;
    case 'pickThemeColor': pickThemeColor(el.dataset.color); break;
    case 'pickGoalColor': pickGoalColor(el.dataset.color); break;
    case 'pickJournalTypeSwatch': pickJournalTypeSwatch(el.dataset.color); break;
    case 'cycleJournalTypeColor': cycleJournalTypeColor(id); break;
    case 'addJournalType': addJournalType(); break;
    case 'openUpcomingPopover': openUpcomingPopover(); break;
    case 'closeUpcomingPopover': closeUpcomingPopover(); break;
    case 'openQuickJournalModal': openQuickJournalModal(); break;
    case 'closeQuickJournalModal': closeQuickJournalModal(); break;
    case 'saveQuickJournal': saveQuickJournal(); break;
    case 'triggerJournalPhotoInput': triggerJournalPhotoInput(); break;
    case 'removeJournalDraftPhoto': removeJournalDraftPhoto(el.dataset.idx); break;
    case 'viewJournalPhoto': openJournalPhotoView(id, el.dataset.idx); break;
    case 'closeJournalPhotoView': closeJournalPhotoView(); break;
    case 'setNewProspectLeadSource': setNewProspectLeadSource(el.dataset.value); break;
    case 'setEditingProspectLeadSource': setEditingProspectLeadSource(el.dataset.value); break;
    case 'setClientLeadSource': setClientLeadSource(el.dataset.id, el.dataset.value); break;
    case 'addClientJournalEntryFromJournal': addClientJournalEntryFromJournal(); break;
    case 'viewClientJournalFromModal': viewClientJournalFromModal(el.dataset.id); break;
    case 'setClientJournalMoodFilter': setClientJournalMoodFilter(el.dataset.mood); break;
    case 'clearClientJournalFilters': clearClientJournalFilters(); break;

    case 'addPrepItem': addPrepItem(); break;
    case 'addMotivation': addMotivation(el.dataset.kind); break;
    case 'addStandardItem': addStandardItem(); break;
    case 'togglePanel': togglePanel(id); break;
    case 'movePanel': movePanel(id, Number(el.dataset.dir)); break;
    case 'armResetPart': armResetPart(id); break;
    case 'confirmResetPart': confirmResetPart(id); break;
    case 'openJournalClearConfirm': openJournalClearConfirm(); break;
    case 'closeJournalClearConfirm': closeJournalClearConfirm(); break;
    case 'confirmJournalClearFinal': confirmJournalClearFinal(); break;

    case 'startMode': startMode(el.dataset.type); break;
    case 'endMode': endMode(); break;

    case 'saveProfile': saveProfile(); break;
    case 'exportData': exportData(); break;
    case 'armReset': armReset(); break;
    case 'confirmReset': confirmReset(); break;

    case 'armDelete': armDelete(el.dataset.scope, id); break;
    case 'confirmDelete': performDelete(el.dataset.scope, id); break;
    case 'confirmDeleteClientTyped': performDelete('client', id); break;
    case 'setCurrentTask': setCurrentTask(id); break;
    case 'stagePendingCurrentTask': stagePendingCurrentTask(id); break;
    case 'cancelPendingCurrentTask': cancelPendingCurrentTask(); break;
    case 'confirmPendingCurrentTask': confirmPendingCurrentTask(); break;
    case 'goToFocusToday': ui.view='focus'; ui.focusTab='tasks'; ui.focusTasksSubTab='overview'; renderView(); break;
    case 'goToFinishedTasks': ui.view='focus'; ui.focusTab='tasks'; ui.focusTasksSubTab='finished'; renderView(); break;
    case 'focusMainTab': focusMainTab(el); break;
    case 'focusTasksSubTab': focusTasksSubTab(el); break;
    case 'setBacklogPriorityFilter': setBacklogPriorityFilter(el.dataset.value); break;
    case 'clearBacklogFilters': clearBacklogFilters(); break;
    case 'toggleBacklogSearch': toggleBacklogSearch(); break;
    case 'preFocusGoToWhy': preFocusGoToWhy(); break;
    case 'preFocusBackToStart': preFocusBackToStart(); break;
    case 'moveTaskToBacklog': moveTaskToBacklog(id); break;
    case 'addVideoIdea': addVideoIdea(); break;
    case 'openAddVideoIdeaModal': openAddVideoIdeaModal(); break;
    case 'closeAddVideoIdeaModal': closeAddVideoIdeaModal(); break;
    case 'closeVideoIdeaEditModal': closeVideoIdeaEditModal(); break;
    case 'saveVideoIdeaEdit': saveVideoIdeaEdit(id); break;
    case 'toggleTaskSelectMode': toggleTaskSelectMode(); break;
    case 'toggleSidebar': toggleSidebar(); break;
    default: if(ACTIONS[a]) ACTIONS[a](el, e, id);
  }
});
document.body.addEventListener('keydown', function(e){
  if(e.key!=='Enter') return;
  const id = e.target && e.target.id;
  if(id==='newVideoIdeaTitle'){ e.preventDefault(); addVideoIdea(); }
  if(id==='newTaskCatLabel'){ e.preventDefault(); addTaskCategory(); }
  if(id==='newVideoTypeLabel'){ e.preventDefault(); addVideoType(); }
  if(id==='miniReminderLabel'){ e.preventDefault(); addMiniReminder(); }
  if(id==='backlogSearchInput'){ e.preventDefault(); }
});
document.body.addEventListener('change', function(e){
  if(e.target && e.target.id==='importFile' && e.target.files[0]){
    importDataFile(e.target.files[0]);
  }
  if(e.target && e.target.id==='journalPhotoInput' && e.target.files && e.target.files.length){
    handleJournalPhotoFiles(e.target.files);
    e.target.value = '';
  }
  if(e.target && e.target.dataset){
    if(e.target.dataset.calCatLabel){ renameCalCategory(e.target.dataset.calCatLabel, e.target.value); }
    if(e.target.dataset.taskCatLabel){ renameTaskCategory(e.target.dataset.taskCatLabel, e.target.value); }
    if(e.target.dataset.videoTypeLabel){ renameVideoType(e.target.dataset.videoTypeLabel, e.target.value); }
    if(e.target.dataset.calCatAutoremind){
      const cat = categoryById(e.target.dataset.calCatAutoremind);
      if(cat){ cat.autoRemind = e.target.checked; persist('calendar'); }
    }
    if(e.target.dataset.journalTypeLabel){ renameJournalType(e.target.dataset.journalTypeLabel, e.target.value); }
    if(e.target.dataset.journalTypeEmoji){ renameJournalTypeEmoji(e.target.dataset.journalTypeEmoji, e.target.value); }
  }
  if(e.target && e.target.id==='newTaskOngoing'){
    const extra = document.getElementById('newTaskOngoingExtra');
    if(extra) extra.style.display = e.target.checked ? 'block' : 'none';
  }
  if(e.target && e.target.id && e.target.id.indexOf('editOngoing-')===0){
    const taskId = e.target.id.slice('editOngoing-'.length);
    const extra = document.getElementById('editTaskOngoingExtra-'+taskId);
    if(extra) extra.style.display = e.target.checked ? 'block' : 'none';
  }
  if(e.target && e.target.id==='journalTabClientSelect'){
    ui.journalTabClientId = e.target.value;
  }
});
document.body.addEventListener('click', function(e){
  const link = e.target.closest && e.target.closest('.quick-link-item[href]');
  if(!link || link.dataset.action==='aiButtonPress') return;
  if(!state.focus.activeSession){ e.preventDefault(); maybeNudgeLockIn(); }
}, true);
function updateAiButtonPreview(tool){
  const btn = document.querySelector('[data-action="aiButtonPress"]');
  if(!btn) return;
  const circle = btn.querySelector('.quick-link-circle');
  if(circle) circle.innerHTML = quickLinkIconInnerHtml(tool.id, tool.emoji, tool.bg);
  btn.setAttribute('href', safariizeUrl(tool.url));
  btn.title = 'Click to open '+tool.label+'. Hold to switch AI.';
}
document.body.addEventListener('mousedown', function(e){
  const btn = e.target.closest && e.target.closest('[data-action="aiButtonPress"]');
  if(!btn) return;
  aiHoldCycled = false;
  const q = quickLinksSettings();
  aiPreviewToolId = q.lastAiUsed;
  if(aiHoldTimer) clearTimeout(aiHoldTimer);
  if(aiHoldInterval) clearInterval(aiHoldInterval);
  aiHoldTimer = setTimeout(function(){
    aiHoldInterval = setInterval(function(){
      aiHoldCycled = true;
      const idx = AI_TOOLS.findIndex(function(t){ return t.id===aiPreviewToolId; });
      const next = AI_TOOLS[(idx+1)%AI_TOOLS.length];
      aiPreviewToolId = next.id;
      updateAiButtonPreview(next);
      playTick();
    }, 480);
  }, 350);
});
document.body.addEventListener('mouseup', function(){
  if(aiHoldTimer){ clearTimeout(aiHoldTimer); aiHoldTimer = null; }
  if(aiHoldInterval){ clearInterval(aiHoldInterval); aiHoldInterval = null; }
  if(aiHoldCycled && aiPreviewToolId){
    const q = quickLinksSettings();
    q.lastAiUsed = aiPreviewToolId;
    persist('settings');
    // defer the full re-render until after the click event (which fires right
    // after mouseup) has been handled — replacing the DOM synchronously here
    // can suppress that click, leaving the tool open unintentionally.
    setTimeout(function(){ renderView(); }, 0);
  }
});
document.body.addEventListener('dragstart', function(e){
  const card = e.target.closest && e.target.closest('[draggable="true"][data-task-id]');
  if(!card) return;
  e.dataTransfer.setData('text/plain', card.dataset.taskId);
  e.dataTransfer.effectAllowed = 'move';
});
document.body.addEventListener('dragover', function(e){
  const zone = e.target.closest && e.target.closest('[data-dropzone]');
  if(!zone) return;
  e.preventDefault();
  e.dataTransfer.dropEffect = 'move';
});
document.body.addEventListener('dragenter', function(e){
  const zone = e.target.closest && e.target.closest('[data-dropzone]');
  if(zone) zone.classList.add('drop-hover');
});
document.body.addEventListener('dragleave', function(e){
  const zone = e.target.closest && e.target.closest('[data-dropzone]');
  if(zone && !zone.contains(e.relatedTarget)) zone.classList.remove('drop-hover');
});
document.body.addEventListener('drop', function(e){
  const zone = e.target.closest && e.target.closest('[data-dropzone]');
  if(!zone) return;
  e.preventDefault();
  zone.classList.remove('drop-hover');
  const taskId = e.dataTransfer.getData('text/plain');
  const newZone = zone.dataset.dropzone;
  const t = state.tasks.items.find(function(x){ return x.id===taskId; });
  if(!t) return;
  if(newZone==='current'){ if(state.focus.activeSession){ setCurrentTask(taskId); } else { stageNextTask(taskId); } return; }
  if(t.status===newZone) return;
  if(newZone==='done'){
    completeTask(taskId);
  } else if(t.status==='done'){
    undoTask(taskId);
    const t2 = state.tasks.items.find(function(x){ return x.id===taskId; });
    if(t2){ t2.status = newZone; persist('tasks'); renderView(); }
  } else {
    t.status = newZone;
    persist('tasks'); renderView();
  }
});
document.body.addEventListener('input', function(e){
  if(e.target && (e.target.id==='quickJournalText' || e.target.id==='journalPageText' || e.target.id==='quickJournalModalText')){
    ui.journalDraftText = e.target.value;
  }
  if(e.target && e.target.id==='newClientJournalText'){
    ui.newClientJournalDraft = e.target.value;
  }
  if(e.target && e.target.id==='journalTabClientText'){
    ui.journalTabClientDraft = e.target.value;
  }
  if(e.target && e.target.id==='journalSearchInput'){
    ui.journalSearchText = e.target.value;
    updateJournalHistoryDisplay();
  }
  if(e.target && e.target.id==='clientJournalSearchInput'){
    ui.clientJournalSearchText = e.target.value;
    updateClientJournalResultsDisplay();
  }
  if(e.target && e.target.id==='journalTabAllClientSearchInput'){
    ui.clientJournalSearchText = e.target.value;
    updateJournalTabAllClientResultsDisplay();
  }
  if(e.target && e.target.id==='journalClearInput'){
    updateJournalClearText(e.target.value);
  }
  if(e.target && e.target.id==='backlogSearchInput'){
    ui.backlogSearchText = e.target.value;
    refreshBacklogResults();
  }
  if(e.target && e.target.id==='preFocusPickSearchInput'){
    ui.preFocusPickSearch = e.target.value;
    updatePreFocusPickResults();
  }
  if(e.target && e.target.id==='clientDeleteConfirmInput'){
    const btn = document.getElementById('clientDeleteConfirmBtn');
    if(btn){
      const expected = (e.target.dataset.clientName||'').trim().toLowerCase();
      btn.disabled = e.target.value.trim().toLowerCase() !== expected;
    }
  }
});
document.body.addEventListener('change', function(e){
  const el = e.target;
  if(el && el.id==='setCrosshair'){
    state.profile.crosshairCursor = el.checked;
    persist('profile'); applyCursorSetting();
  }
  if(el && el.id==='setBigClock'){
    state.profile.bigClockOnToday = el.checked;
    persist('profile'); renderView();
  }
  if(el && el.id==='clientJournalClientFilterSelect'){
    ui.clientJournalFilterClientId = el.value || null;
    updateClientJournalResultsDisplay();
  }
  if(el && el.id==='journalTabAllClientFilterSelect'){
    ui.clientJournalFilterClientId = el.value || null;
    updateJournalTabAllClientResultsDisplay();
  }
  if(el && el.dataset && el.dataset.actionInput==='packageDeliverableTarget'){
    const pk = arr(state.business.packages).find(function(x){return x.id===el.dataset.id;});
    if(pk){
      const d = arr(pk.deliverables).find(function(x){return x.id===el.dataset.did;});
      if(d){
        d.weeklyTarget = Math.max(1, Number(el.value)||1);
        // Keep already-assigned clients' copies of this deliverable in sync — otherwise
        // their counters keep showing the stale target from whenever they were assigned.
        arr(state.business.clients).forEach(function(c){
          arr(c.deliverables).forEach(function(cd){
            if(cd.fromPackage && cd.sourceId===d.id) cd.weeklyTarget = d.weeklyTarget;
          });
        });
        persist('business'); renderView();
      }
    }
  }
  if(el && el.dataset && el.dataset.iconUpload && el.files && el.files[0]){
    const key = el.dataset.iconUpload;
    const file = el.files[0];
    const reader = new FileReader();
    reader.onload = function(){
      if(!state.settings.quickLinks.icons) state.settings.quickLinks.icons = {};
      state.settings.quickLinks.icons[key] = reader.result;
      persist('settings'); renderView();
    };
    reader.readAsDataURL(file);
  }
});

