// ============ GOALS ============
function goalLiveCurrent(g){
  if(g.autoTrack==='streak') return computeStreak();
  return g.current||0;
}
function goalDeadlineTag(g){
  if(!g.deadline) return '';
  const days = Math.ceil((new Date(g.deadline+'T00:00:00') - new Date(todayStr()+'T00:00:00'))/86400000);
  let cls='tag', label;
  if(days<0){ cls='tag tag-danger'; label='Past due'; }
  else if(days===0){ cls='tag tag-med'; label='Due today'; }
  else if(days<=7){ cls='tag tag-med'; label=days+'d left'; }
  else { cls='tag'; label=fmtDateShort(g.deadline); }
  return '<span class="'+cls+'" style="margin-left:8px;">'+label+'</span>';
}
function goalRow(g){
  const hasTracker = g.target!=null && g.target>0;
  const current = goalLiveCurrent(g);
  if(g.autoTrack==='streak' && hasTracker && current>=g.target && !g.done){ g.done=true; }
  const pct = hasTracker ? clamp(Math.round(current/g.target*100),0,100) : 0;
  const isArmed = armed.has('goalcomplete:'+g.id);
  return '<div class="task-item-v2 '+(g.done?'done':'')+'" style="'+(hasTracker?'':'align-items:center;')+'">'+
    '<button class="btn btn-sm '+(g.done?'btn-good':(isArmed?'btn-primary':'btn-ghost'))+'" data-action="toggleGoal" data-id="'+g.id+'" style="flex-shrink:0;">'+(g.done?'&#10003; Done':(isArmed?'Confirm?':'Mark Done')) +'</button>'+
    '<div style="flex:1;min-width:160px;">'+
      '<div class="task-title">'+escapeHtml(g.label)+(g.autoTrack==='streak'?'<span class="tag" style="margin-left:8px;">&#128293; Streak</span>':'')+goalDeadlineTag(g)+'</div>'+
      (hasTracker ? (
        '<div class="progress" style="margin-top:6px;max-width:220px;"><div class="progress-bar" style="width:'+pct+'%;background:'+goalColor()+';'+goalGlowStyle(pct)+'"></div></div>'+
        '<div class="kpi-sub" style="margin-top:4px;">'+current+' / '+g.target+' '+escapeHtml(g.unit||'')+'</div>'
      ) : '')+
    '</div>'+
    '<button class="btn btn-ghost btn-sm" data-action="openGoalEditModal" data-id="'+g.id+'">Edit</button>'+
  '</div>';
}
function openGoalEditModal(id){
  ui.editingGoalId = id;
  const o = document.getElementById('goalEditOverlay');
  if(!o) return;
  o.classList.remove('hidden');
  renderGoalEditModalInto();
}
function closeGoalEditModal(){ ui.editingGoalId = null; const o=document.getElementById('goalEditOverlay'); if(o) o.classList.add('hidden'); }
function renderGoalEditModal(){
  const g = state.goals.items.find(function(x){return x.id===ui.editingGoalId;});
  if(!g) return '';
  const hasTracker = g.target!=null && g.target>0;
  const isStreak = g.autoTrack==='streak';
  return '<div class="section-title" style="margin-bottom:14px;">Edit Goal</div>'+
    '<div class="field"><label>Goal</label><input class="input" id="editGoalLabel-'+g.id+'" value="'+escapeHtml(g.label)+'" style="width:100%;"></div>'+
    '<div class="grid grid-2" style="margin-top:10px;">'+
      '<div class="field"><label>Target (optional)</label><input class="input" type="number" id="editGoalTarget-'+g.id+'" value="'+(g.target!=null?g.target:'')+'"></div>'+
      '<div class="field"><label>Unit (optional)</label><input class="input" id="editGoalUnit-'+g.id+'" value="'+escapeHtml(g.unit||'')+'"></div>'+
    '</div>'+
    '<div class="grid grid-2" style="margin-top:10px;">'+
      '<div class="field"><label>Deadline (optional)</label><div class="row"><input class="input" type="date" id="editGoalDeadline-'+g.id+'" value="'+(g.deadline||'')+'" style="flex:1;"><button class="btn btn-ghost btn-sm" data-action="openDatePicker" data-target="editGoalDeadline-'+g.id+'">&#128197;</button></div></div>'+
      '<div class="field"><label>Tracking</label><select class="input" id="editGoalTrackMode-'+g.id+'" style="width:100%;"><option value="manual" '+(!isStreak?'selected':'')+'>I\'ll update progress myself</option><option value="streak" '+(isStreak?'selected':'')+'>Auto-track from my streak</option></select></div>'+
    '</div>'+
    (hasTracker && !isStreak ? '<div class="field" style="margin-top:10px;"><label>Current progress</label><input class="input" type="number" id="editGoalCurrent-'+g.id+'" value="'+(g.current||0)+'"></div>' : '')+
    (isStreak ? '<div class="kpi-sub" style="margin-top:10px;">Progress = your live streak ('+computeStreak()+' days)'+tip('It updates on its own — no manual entry needed.')+'</div>' : '')+
    '<div class="row" style="margin-top:20px;justify-content:space-between;">'+
      deleteBtn('goal', g.id)+
      '<div class="row">'+
        '<button class="btn btn-ghost" data-action="closeGoalEditModal">Cancel</button>'+
        '<button class="btn btn-primary" data-action="saveEditGoal" data-id="'+g.id+'">Save</button>'+
      '</div>'+
    '</div>';
}
function renderGoalEditModalInto(){ const el=document.getElementById('goalEditContent'); if(el) morphInto(el, renderGoalEditModal(), {form:true}); }
function saveEditGoal(id){
  const g = state.goals.items.find(function(x){return x.id===id;}); if(!g) return;
  g.label = document.getElementById('editGoalLabel-'+id).value.trim() || g.label;
  g.target = Number(document.getElementById('editGoalTarget-'+id).value) || null;
  g.unit = document.getElementById('editGoalUnit-'+id).value.trim();
  const deadlineEl = document.getElementById('editGoalDeadline-'+id);
  g.deadline = deadlineEl && deadlineEl.value ? deadlineEl.value : null;
  const trackModeEl = document.getElementById('editGoalTrackMode-'+id);
  g.autoTrack = (trackModeEl && trackModeEl.value==='streak') ? 'streak' : null;
  if(g.autoTrack==='streak'){
    g.current = computeStreak();
  } else {
    const curEl = document.getElementById('editGoalCurrent-'+id);
    if(curEl){
      const val = Number(curEl.value);
      if(!isNaN(val)) g.current = val;
    }
  }
  if(g.target && g.current>=g.target && !g.done){ g.done=true; playSessionComplete(); }
  closeGoalEditModal();
  persist('goals'); renderView();
}
function addGoal(){
  const el = document.getElementById('newGoalLabel');
  const label = el.value.trim();
  if(!label) return;
  const target = Number(document.getElementById('newGoalTarget').value) || null;
  const unit = document.getElementById('newGoalUnit').value.trim();
  const deadlineEl = document.getElementById('newGoalDeadline');
  const deadline = deadlineEl && deadlineEl.value ? deadlineEl.value : null;
  const trackModeEl = document.getElementById('newGoalTrackMode');
  const autoTrack = (trackModeEl && trackModeEl.value==='streak') ? 'streak' : null;
  const current = autoTrack==='streak' ? computeStreak() : 0;
  state.goals.items.push({id:uid(), label:label, done:false, target:target, current:current, unit:unit, deadline:deadline, autoTrack:autoTrack, createdAt:todayStr()});
  playSessionComplete();
  persist('goals'); renderView();
}
function toggleGoal(id){
  const g = state.goals.items.find(function(x){ return x.id===id; }); if(!g) return;
  if(g.done){ g.done = false; playTick(); persist('goals'); renderView(); return; }
  const key = 'goalcomplete:'+id;
  if(!armed.has(key)){
    armed.add(key); renderView();
    setTimeout(function(){ if(armed.has(key)){ armed.delete(key); renderView(); } }, 3000);
    return;
  }
  armed.delete(key);
  g.done = true;
  playSessionComplete();
  persist('goals'); renderView();
}

