
// ============ NOTE FOR THE MORNING ============
// Something you tell yourself the night before — "call Mike first", "you said you'd be up at 6,
// don't negotiate" — waiting for you when the alarm goes off. Jot one down any time from the
// "Note for the morning" panel on Today (or the sleep screen); it shows up big at the top of the
// Good Morning briefing for the morning it's meant for. Several notes stack.
function morningNotes(){ return arr(state.focus.morningNotes); }
function morningNotesFor(date){ return morningNotes().filter(function(n){ return n.forDate===date; }); }
function morningNoteTarget(){ return typeof wakeTargetDate==='function' ? wakeTargetDate() : addDays(todayStr(), 1); }
// extra: {morning, work} — the note in parts: the headline (on the alarm), a message for the
// morning (Good morning) and one for before work (Start work)
function addMorningNote(text, extra){
  text = String(text||'').trim(); extra = extra || {};
  const morning = String(extra.morning||'').trim(), work = String(extra.work||'').trim();
  if(!text && !morning && !work) return false;
  const n = {id:uid(), text:text || morning || work, forDate:morningNoteTarget(), at:Date.now()};
  if(morning || work){ n.headline = text; n.morning = morning; n.work = work; }
  state.focus.morningNotes = morningNotes().concat([n])
    // keep a couple of weeks — older ones have done their job
    .filter(function(n){ return n.forDate >= addDays(todayStr(), -14); });
  persist('focus');
  return true;
}
ACTIONS.saveMorningNote = function(el){
  const box = document.getElementById(el.dataset.target || 'morningNoteInput');
  if(!box || !addMorningNote(box.value)) return;
  box.value = '';
  playJournalSound();
  renderView();
  showToast('Saved for '+morningLabel(morningNoteTarget())+' — it\'ll be the first thing you see.', {icon:'&#127769;'});
};
ACTIONS.removeMorningNote = function(el, e, id){ state.focus.morningNotes = morningNotes().filter(function(n){ return n.id!==id; }); persist('focus'); renderView(); };
document.addEventListener('keydown', function(e){
  const t = e.target;
  if(e.key==='Enter' && (e.metaKey || e.ctrlKey) && t && t.classList && t.classList.contains('mn-input')){ e.preventDefault(); ACTIONS.saveMorningNote({dataset:{target:t.id}}); }
});
function morningNoteBoxHtml(id){
  const target = morningNoteTarget(), list = morningNotesFor(target);
  return '<div class="mn-box">'+
    (list.length ? '<div class="mn-list">'+list.map(function(n){ return '<div class="mn-item"><span class="mn-text">'+escapeHtml(n.text)+'</span><button class="mn-x" data-action="removeMorningNote" data-id="'+n.id+'" title="Remove">&#10005;</button></div>'; }).join('')+'</div>' : '')+
    '<div class="mn-row"><textarea class="input mn-input" id="'+id+'" rows="2" placeholder="What does tomorrow-you need to hear?"></textarea>'+
    '<button class="btn btn-primary btn-sm" data-action="saveMorningNote" data-target="'+id+'" title="Save (⌘↵)">Save</button></div>'+
  '</div>';
}
function renderMorningNotePanel(){
  const target = morningNoteTarget();
  return '<div class="section mn-panel"><div class="section-title">&#127769; Note for '+escapeHtml(morningLabel(target))+tip('Shows up first thing in your Good Morning briefing when the alarm goes off.')+'</div>'+
    '<div class="card">'+morningNoteBoxHtml('morningNoteInput')+'</div></div>';
}
