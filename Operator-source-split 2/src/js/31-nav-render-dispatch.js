// ============ NAV / RENDER DISPATCH ============
function updateNavActive(){
  document.querySelectorAll('.nav-item').forEach(function(btn){
    btn.classList.toggle('active', btn.dataset.view===ui.view);
  });
}
let lastRenderedView = null;
let lastRenderedDay = null;
// While several things change at once (e.g. navigating closes every open pop-up first),
// renders are held so the page is drawn once at the end instead of once per step.
let renderHold = 0, renderGen = 0;
function holdRenders(fn){ renderHold++; try{ fn(); } finally{ renderHold--; } }
function renderView(){
  if(renderHold) return;
  renderGen++;
  RC = {};
  try{ renderViewInner(); } finally { RC = null; }
}
function renderViewInner(){
  if(ui.currentTaskId && (!state.focus.activeSession || state.focus.activeSession.onBreak)){ accumulateCurrentTaskTime(ui.currentTaskId); persist('tasks'); }
  const root = document.getElementById('viewRoot');
  let html = '';
  switch(ui.view){
    case 'today': html = renderToday(); break;
    case 'focus': html = renderFocus(); break;
    case 'calendar': html = renderCalendar(); break;
    case 'personal': html = renderPersonal(); break;
    case 'business': html = renderBusiness(); break;
    case 'settings': html = renderSettings(); break;
    default: html = renderToday();
  }
  if(lastRenderedView !== ui.view){
    // Navigating to another view: fresh content, scrolled to the top, with a soft fade.
    root.innerHTML = html;
    const main = root.closest('.main');
    if(main) main.scrollTop = 0;
    root.classList.remove('view-fade'); void root.offsetWidth; root.classList.add('view-fade');
    lastRenderedView = ui.view;
  } else {
    // Same view: patch in place so nothing that didn't change is touched (no flash,
    // no scroll jumps, no replayed entry animations).
    morphInto(root, html);
  }
  lastRenderedDay = todayStr();
  updateNavActive();
  document.querySelectorAll('.scroll-picker').forEach(function(pk){ initScrollPicker(pk.id, Number(pk.dataset.selected)); });
  const modalOverlay = document.getElementById('preFocusOverlay');
  if(modalOverlay && !modalOverlay.classList.contains('hidden')) renderPreFocusModalInto();
  const stopOverlay = document.getElementById('stopFocusOverlay');
  if(stopOverlay && !stopOverlay.classList.contains('hidden')) renderStopFocusModalInto();
  const timesUpOverlay = document.getElementById('timesUpOverlay');
  if(timesUpOverlay && !timesUpOverlay.classList.contains('hidden')) renderTimesUpModalInto();
  const taskEditOverlay = document.getElementById('taskEditOverlay');
  if(taskEditOverlay && !taskEditOverlay.classList.contains('hidden')) renderTaskEditModalInto();
  const prospectEditOverlay = document.getElementById('prospectEditOverlay');
  if(prospectEditOverlay && !prospectEditOverlay.classList.contains('hidden')) renderProspectEditModalInto();
  const clientModalOverlay = document.getElementById('clientModalOverlay');
  if(clientModalOverlay && !clientModalOverlay.classList.contains('hidden')) renderClientModalInto();
  const lockInOverlay = document.getElementById('lockInOverlay');
  if(lockInOverlay && !lockInOverlay.classList.contains('hidden')){
    renderLockInModalInto();
    const sp = document.getElementById('startPicker');
    if(!ui.focusOpenEnded) initScrollPicker('startPicker', sp && sp.dataset.selected ? Number(sp.dataset.selected) : 60);
  }
  const journalEditOverlay = document.getElementById('journalEditOverlay');
  if(journalEditOverlay && !journalEditOverlay.classList.contains('hidden')) renderJournalEditModalInto();
  const calEventOverlay = document.getElementById('calEventOverlay');
  if(calEventOverlay && !calEventOverlay.classList.contains('hidden')) renderCalEventModalInto();
  const alarmEditOverlay = document.getElementById('alarmEditOverlay');
  if(alarmEditOverlay && !alarmEditOverlay.classList.contains('hidden')) renderAlarmEditModalInto();
  const goalEditOverlay = document.getElementById('goalEditOverlay');
  if(goalEditOverlay && !goalEditOverlay.classList.contains('hidden')) renderGoalEditModalInto();
  const packageEditOverlay = document.getElementById('packageEditOverlay');
  if(packageEditOverlay && !packageEditOverlay.classList.contains('hidden')) renderPackageEditModalInto();
  const customDeliverableOverlay = document.getElementById('customDeliverableOverlay');
  if(customDeliverableOverlay && !customDeliverableOverlay.classList.contains('hidden')) renderCustomDeliverableDrawerInto();
  const workoutEditOverlay = document.getElementById('workoutEditOverlay');
  if(workoutEditOverlay && !workoutEditOverlay.classList.contains('hidden')) renderWorkoutEditModalInto();
  const addTaskOverlay = document.getElementById('addTaskOverlay');
  if(addTaskOverlay && !addTaskOverlay.classList.contains('hidden')) renderAddTaskModalInto();
  const videoIdeaEditOverlay = document.getElementById('videoIdeaEditOverlay');
  if(videoIdeaEditOverlay && !videoIdeaEditOverlay.classList.contains('hidden')) renderVideoIdeaEditModalInto();
  const videoIdeaOverlay = document.getElementById('videoIdeaOverlay');
  if(videoIdeaOverlay && !videoIdeaOverlay.classList.contains('hidden')) renderAddVideoIdeaModalInto();
  const miniCalOverlay = document.getElementById('miniCalOverlay');
  if(miniCalOverlay && !miniCalOverlay.classList.contains('hidden')) renderDatePickerModalInto();
  const retainerEditOverlay = document.getElementById('retainerEditOverlay');
  if(retainerEditOverlay && !retainerEditOverlay.classList.contains('hidden')) renderRetainerEditModalInto();
  const logPaymentOverlay = document.getElementById('logPaymentOverlay');
  if(logPaymentOverlay && !logPaymentOverlay.classList.contains('hidden')) renderLogPaymentModalInto();
  const upcomingOverlay = document.getElementById('upcomingOverlay');
  if(upcomingOverlay && !upcomingOverlay.classList.contains('hidden')) renderUpcomingPopoverInto();
  const clientJournalOverlay = document.getElementById('clientJournalOverlay');
  if(clientJournalOverlay && !clientJournalOverlay.classList.contains('hidden')) renderClientJournalPopoverInto();
  const quickJournalOverlay = document.getElementById('quickJournalOverlay');
  if(quickJournalOverlay && !quickJournalOverlay.classList.contains('hidden')) renderQuickJournalModalInto();
  const journalPhotoViewOverlay = document.getElementById('journalPhotoViewOverlay');
  if(journalPhotoViewOverlay && !journalPhotoViewOverlay.classList.contains('hidden')) renderJournalPhotoViewModalInto();
  MODAL_RENDERERS.forEach(function(m){ if(overlayOpen(m[0])) m[1](); });
  document.body.dataset.view = ui.view;
  tickClocks();
  stretchLockedHeaderLine();
  afterRenderHooks.forEach(function(fn){ try{ fn(); }catch(e){} });
}

