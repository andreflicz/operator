
// ============ CLICK OUTSIDE / ESC CLOSES POP-UPS ============
// Clicking the dark area around a pop-up (or pressing Esc) closes it. Pop-ups that edit
// something that already exists save on the way out (the same as their Save button), so
// nothing typed is lost; "add new" pop-ups just close. Alarms and the wake screen never
// close this way.
const OVERLAY_KEEP_OPEN = ['alarmOverlay','wakeOverlay','timesUpOverlay','finalStopOverlay','multiBreakOverlay','stopFocusOverlay'];
const OVERLAY_DISMISS = {
  taskEditOverlay: function(){ if(ui.editingTaskId) saveEditTask(ui.editingTaskId); else closeTaskEditModal(); },
  clientModalOverlay: function(){ closeClientModalAndSave(); },
  contactOverlay: function(){ if(ui.contactLeadId) ACTIONS.saveLead(null, null, ui.contactLeadId); else hideOverlay('contactOverlay'); },
  journalEditOverlay: function(){ if(ui.editingJournalId) saveEditJournal(ui.editingJournalId); else closeJournalEditModal(); },
  goalEditOverlay: function(){ if(ui.editingGoalId) saveEditGoal(ui.editingGoalId); else closeGoalEditModal(); },
  workoutEditOverlay: function(){ if(ui.editingWorkoutId) saveEditWorkout(ui.editingWorkoutId); else closeWorkoutEditModal(); },
  videoIdeaEditOverlay: function(){ if(ui.editingVideoIdeaId) saveVideoIdeaEdit(ui.editingVideoIdeaId); else closeVideoIdeaEditModal(); }
};
function dismissOverlay(o){
  if(!o || o.classList.contains('hidden') || OVERLAY_KEEP_OPEN.indexOf(o.id)>=0) return false;
  if(OVERLAY_DISMISS[o.id]){ OVERLAY_DISMISS[o.id](); return true; }
  const btn = o.querySelector('[data-action^="close"], [data-action^="cancel"]');
  if(btn){ btn.click(); return true; }
  o.classList.add('hidden');
  return true;
}
let pressedOnBackdrop = null;
document.addEventListener('pointerdown', function(e){
  const t = e.target;
  pressedOnBackdrop = (t && t.classList && t.classList.contains('overlay') && !t.classList.contains('hidden')) ? t : null;
}, true);
document.addEventListener('click', function(e){
  const o = pressedOnBackdrop; pressedOnBackdrop = null;
  if(o && e.target===o) dismissOverlay(o);
}, true);
document.addEventListener('keydown', function(e){
  if(e.key!=='Escape' || e.defaultPrevented) return;
  const open = Array.prototype.filter.call(document.querySelectorAll('.overlay'), function(o){ return !o.classList.contains('hidden'); });
  if(!open.length) return;
  if(dismissOverlay(open[open.length-1])) e.preventDefault();
});
