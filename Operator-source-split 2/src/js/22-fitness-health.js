// ============ FITNESS (Health) ============
function renderFitness(){
  return '<div class="subtabs">'+
    '<div class="subtab '+(ui.healthTab==='workouts'?'active':'')+'" data-action="healthTab" data-tab="workouts">Workouts</div>'+
    '<div class="subtab '+(ui.healthTab==='weight'?'active':'')+'" data-action="healthTab" data-tab="weight">Weight</div>'+
    '<div class="subtab '+(ui.healthTab==='calories'?'active':'')+'" data-action="healthTab" data-tab="calories">Calories</div>'+
  '</div>'+
  (ui.healthTab==='workouts' ? renderWorkouts() : ui.healthTab==='weight' ? renderWeight() : renderCalories());
}
function renderWorkouts(){
  const log = state.health.gymLog.slice().sort(function(a,b){ return b.date.localeCompare(a.date); });
  const last7 = []; for(let i=0;i<7;i++) last7.push(addDays(todayStr(),-i));
  const trained7 = last7.filter(function(d){ return state.health.gymLog.some(function(g){return g.date===d;}); }).length;
  return '<div class="section"><div class="card" style="display:flex;align-items:center;justify-content:space-between;flex-wrap:wrap;gap:14px;"><div><div class="kpi-label">Trained</div><div class="kpi-value">'+trained7+'/'+state.profile.weeklyWorkoutTarget+'</div><div class="kpi-sub">last 7 days &middot; target set in Settings</div></div>'+'<span class="tag '+(trainedDoneFor(todayStr())?'tag-good':'tag-med')+'">'+(trainedDoneFor(todayStr())?'✓ Counted toward today\'s standard':'Not yet logged today')+'</span>'+'</div></div>'+
  '<div class="card section">'+
    '<div class="grid grid-2">'+
      '<div class="field"><label>Date</label><div class="row"><input class="input" type="date" id="gymDate" value="'+todayStr()+'"><button class="btn btn-ghost btn-sm" data-action="openDatePicker" data-target="gymDate">&#128197;</button></div></div>'+
      '<div class="field"><label>Type</label><input class="input" id="gymType" placeholder="Walk, lift, run, etc."></div>'+
    '</div>'+
    '<div class="grid grid-2" style="margin-top:10px;">'+
      '<div class="field"><label>Duration</label>'+buildScrollPicker('workoutPicker', durationOptions(180), 30)+'</div>'+
      '<div class="field"><label>Notes</label><input class="input" id="gymNotes"></div>'+
    '</div>'+
    '<button class="btn btn-primary" data-action="addWorkout" style="margin-top:10px;">Log</button>'+
  '</div>'+
  '<div class="task-list">'+(log.map(function(g){
    return '<div class="task-item-v2"><div style="width:60px;font-family:var(--font-display);font-weight:700;">'+fmtDateShort(g.date)+'</div><div class="task-title">'+escapeHtml(g.type)+(g.duration?' &middot; '+fmtDurationLabel(g.duration):'')+'</div><div class="kpi-sub">'+escapeHtml(g.notes||'')+'</div><button class="btn btn-ghost btn-sm" data-action="openWorkoutEditModal" data-id="'+g.id+'">Edit</button>'+deleteBtn('gym', g.id)+'</div>';
  }).join('') || '<div class="empty">No workouts logged yet.</div>')+'</div>';
}
function openWorkoutEditModal(id){
  ui.editingWorkoutId = id;
  const o = document.getElementById('workoutEditOverlay');
  if(!o) return;
  o.classList.remove('hidden');
  renderWorkoutEditModalInto();
}
function closeWorkoutEditModal(){ ui.editingWorkoutId = null; const o=document.getElementById('workoutEditOverlay'); if(o) o.classList.add('hidden'); }
function renderWorkoutEditModal(){
  const g = state.health.gymLog.find(function(x){return x.id===ui.editingWorkoutId;});
  if(!g) return '';
  return '<div class="section-title" style="margin-bottom:14px;">Edit Workout</div>'+
    '<div class="grid grid-2">'+
      '<div class="field"><label>Date</label><div class="row"><input class="input" type="date" id="editGymDate-'+g.id+'" value="'+g.date+'"><button class="btn btn-ghost btn-sm" data-action="openDatePicker" data-target="editGymDate-'+g.id+'">&#128197;</button></div></div>'+
      '<div class="field"><label>Type</label><input class="input" id="editGymType-'+g.id+'" value="'+escapeHtml(g.type)+'"></div>'+
    '</div>'+
    '<div class="grid grid-2" style="margin-top:10px;">'+
      '<div class="field"><label>Duration (minutes)</label><input class="input" type="number" id="editGymDuration-'+g.id+'" value="'+(g.duration||'')+'"></div>'+
      '<div class="field"><label>Notes</label><input class="input" id="editGymNotes-'+g.id+'" value="'+escapeHtml(g.notes||'')+'"></div>'+
    '</div>'+
    '<div class="row" style="margin-top:20px;justify-content:space-between;">'+
      deleteBtn('gym', g.id)+
      '<div class="row">'+
        '<button class="btn btn-ghost" data-action="closeWorkoutEditModal">Cancel</button>'+
        '<button class="btn btn-primary" data-action="saveEditWorkout" data-id="'+g.id+'">Save</button>'+
      '</div>'+
    '</div>';
}
function renderWorkoutEditModalInto(){ const el=document.getElementById('workoutEditContent'); if(el) morphInto(el, renderWorkoutEditModal(), {form:true}); }
function saveEditWorkout(id){
  const g = state.health.gymLog.find(function(x){return x.id===id;}); if(!g) return;
  g.date = document.getElementById('editGymDate-'+id).value || g.date;
  g.type = document.getElementById('editGymType-'+id).value.trim() || g.type;
  const dur = Number(document.getElementById('editGymDuration-'+id).value);
  g.duration = dur ? dur : null;
  g.notes = document.getElementById('editGymNotes-'+id).value.trim();
  closeWorkoutEditModal();
  persist('health'); renderView();
}
function renderWeight(){
  const log = state.health.weightLog.slice().sort(function(a,b){ return a.date.localeCompare(b.date); });
  const recent = log.slice(-20);
  const latest = log[log.length-1];
  const start = log[0];
  const goal = state.profile.goalWeight;
  let progressHtml = '';
  if(latest && goal){
    const startW = start ? start.weight : latest.weight;
    const total = startW - goal;
    const done = startW - latest.weight;
    const pct = total>0 ? clamp(Math.round((done/total)*100),0,100) : 0;
    progressHtml = '<div class="card section"><div class="kpi-label">Progress to Goal</div>'+
      '<div class="progress" style="margin:8px 0;"><div class="progress-bar" style="width:'+pct+'%;background:'+goalColor()+';'+goalGlowStyle(pct)+'"></div></div>'+
      '<div class="kpi-sub">'+latest.weight+' now &rarr; '+goal+' goal ('+(latest.weight-goal>0 ? (latest.weight-goal).toFixed(1)+' to go' : 'goal reached')+')</div>'+
    '</div>';
  }
  return '<div class="grid grid-2 section">'+
    '<div class="card"><div class="kpi-label">Latest</div><div class="kpi-value">'+(latest?latest.weight:'—')+'</div></div>'+
    '<div class="card"><div class="kpi-label">Goal Weight</div><div class="kpi-value">'+(goal!=null?goal:'not set')+'</div><div class="kpi-sub">set it in Settings</div></div>'+
  '</div>'+
  progressHtml+
  '<div class="card section">'+(recent.length>=2 ? svgLineChart(recent.map(function(r){return r.weight;}), recent.map(function(r){return fmtDateShort(r.date);})) : '<div class="empty">Log a couple entries to see a trend line.</div>')+'</div>'+
  '<div class="card section row">'+
    '<div class="field"><label>Date</label><div class="row"><input class="input" type="date" id="weightDate" value="'+todayStr()+'"><button class="btn btn-ghost btn-sm" data-action="openDatePicker" data-target="weightDate">&#128197;</button></div></div>'+
    '<div class="field"><label>Weight</label><input class="input" type="number" step="0.1" id="weightValue" style="width:100px;"></div>'+
    '<button class="btn btn-primary" data-action="addWeight" style="align-self:flex-end;">Log</button>'+
  '</div>'+
  '<table class="table"><tr><th>Date</th><th>Weight</th><th></th></tr>'+
    (log.slice().reverse().slice(0,10).map(function(w){ return '<tr><td>'+fmtDateShort(w.date)+'</td><td>'+w.weight+'</td><td>'+deleteBtn('weight', w.id)+'</td></tr>'; }).join('') || '<tr><td colspan="3" class="empty">Nothing logged yet.</td></tr>')+
  '</table>';
}
function renderCalories(){
  const today = state.health.calorieEntries.filter(function(c){ return c.date===todayStr(); });
  const total = today.reduce(function(a,c){ return a+Number(c.calories||0); },0);
  const pct = clamp(Math.round((total/(state.profile.calorieTarget||1))*100),0,999);
  return '<div class="grid grid-2 section">'+
    '<div class="card"><div class="kpi-label">Today</div><div class="kpi-value">'+total+' <span style="font-size:13px;color:var(--text-faint);">/ '+state.profile.calorieTarget+' cal</span></div>'+
      '<div class="progress" style="margin-top:8px;"><div class="progress-bar '+(pct>110?'danger':pct>=85?'good':'')+'" style="width:'+clamp(pct,0,100)+'%"></div></div>'+
    '</div>'+
    '<div class="card"><div class="kpi-label">Hungry? Pick One Instead Of Deciding</div><div class="row" style="margin-top:6px;">'+
      (state.meals.library.map(function(m){ return '<button class="meal-btn" data-action="quickMeal" data-id="'+m.id+'"><span class="mname">'+escapeHtml(m.name)+'</span><span class="mmeta">'+m.calories+' cal</span></button>'; }).join('') || '<div class="empty">No meals saved yet.</div>')+
    '</div></div>'+
  '</div>'+
  '<div class="card section row">'+
    '<div class="field" style="flex:1;"><label>Custom item</label><input class="input" id="calName" placeholder="What did you eat?"></div>'+
    '<div class="field"><label>Calories</label><input class="input" type="number" id="calAmount" style="width:100px;"></div>'+
    '<button class="btn btn-primary" data-action="addCalorieEntry" style="align-self:flex-end;">Add</button>'+
  '</div>'+
  '<div class="section"><div class="section-title">Today\'s Log</div><div class="task-list">'+
    (today.map(function(c){ return '<div class="task-item-v2"><div class="task-title">'+escapeHtml(c.name)+'</div><div class="kpi-sub">'+c.calories+' cal</div>'+deleteBtn('calorie',c.id)+'</div>'; }).join('') || '<div class="empty">Nothing logged today yet.</div>')+
  '</div></div>'+
  '<div class="section"><div class="section-title">Meal Library <span class="kpi-sub">edit your go-to options</span></div>'+
    '<div class="card row" style="margin-bottom:10px;">'+
      '<div class="field" style="flex:1;"><label>Name</label><input class="input" id="mealName" placeholder="e.g. Turkey chili"></div>'+
      '<div class="field"><label>Calories</label><input class="input" type="number" id="mealCalories" style="width:100px;"></div>'+
      '<button class="btn" data-action="addMeal" style="align-self:flex-end;">Add To Library</button>'+
    '</div>'+
    '<div class="task-list">'+(state.meals.library.map(function(m){ return '<div class="task-item-v2"><div class="task-title">'+escapeHtml(m.name)+'</div><div class="kpi-sub">'+m.calories+' cal</div>'+deleteBtn('meal', m.id)+'</div>'; }).join('') || '<div class="empty">No meals in your library yet.</div>')+'</div>'+
  '</div>';
}
function addWorkout(){
  const date = document.getElementById('gymDate').value || todayStr();
  const type = document.getElementById('gymType').value.trim();
  const duration = getPickerValue('workoutPicker');
  const notes = document.getElementById('gymNotes').value.trim();
  if(!type) return;
  state.health.gymLog.push({id:uid(), date:date, type:type, duration:duration, notes:notes});
  playPositive();
  persist('health'); renderView();
}
function addWeight(){
  const date = document.getElementById('weightDate').value || todayStr();
  const weight = Number(document.getElementById('weightValue').value);
  if(!weight) return;
  state.health.weightLog.push({id:uid(), date:date, weight:weight});
  persist('health'); renderView();
}
function quickMeal(mealId){
  const m = state.meals.library.find(function(x){ return x.id===mealId; }); if(!m) return;
  state.health.calorieEntries.push({id:uid(), date:todayStr(), name:m.name, calories:m.calories});
  persist('health'); renderView();
}
function addCalorieEntry(){
  const name = document.getElementById('calName').value.trim();
  const calories = Number(document.getElementById('calAmount').value)||0;
  if(!name || !calories) return;
  state.health.calorieEntries.push({id:uid(), date:todayStr(), name:name, calories:calories});
  persist('health'); renderView();
}
function addMeal(){
  const name = document.getElementById('mealName').value.trim();
  const calories = Number(document.getElementById('mealCalories').value)||0;
  if(!name || !calories) return;
  state.meals.library.push({id:uid(), name:name, calories:calories});
  persist('meals'); renderView();
}

