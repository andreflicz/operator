// ============ FITNESS (Health) ============
function renderFitness(){
  return '<div class="subtabs">'+
    '<div class="subtab '+(ui.healthTab==='workouts'?'active':'')+'" data-action="healthTab" data-tab="workouts">Workouts</div>'+
    '<div class="subtab '+(ui.healthTab==='weight'?'active':'')+'" data-action="healthTab" data-tab="weight">Weight</div>'+
    '<div class="subtab '+(ui.healthTab==='calories'?'active':'')+'" data-action="healthTab" data-tab="calories">Calories</div>'+
  '</div>'+
  (ui.healthTab==='workouts' ? renderWorkouts() : ui.healthTab==='weight' ? renderWeight() : renderCalories());
}
const WORKOUT_TYPES = [
  {id:'Lift', icon:'&#127947;&#65039;'}, {id:'Run', icon:'&#127939;'}, {id:'Walk', icon:'&#128694;'}, {id:'Bike', icon:'&#128692;'},
  {id:'Yoga', icon:'&#129496;'}, {id:'Sports', icon:'&#9917;'}, {id:'Swim', icon:'&#127946;'}, {id:'Boxing', icon:'&#129354;'}
];
function workoutIcon(type){
  const t = String(type||'').toLowerCase();
  if(/lift|weight|gym|push|pull|leg|chest|back|arm|strength/.test(t)) return '&#127947;&#65039;';
  if(/run|jog|sprint/.test(t)) return '&#127939;';
  if(/walk|steps/.test(t)) return '&#128694;';
  if(/bike|cycl|spin/.test(t)) return '&#128692;';
  if(/yoga|stretch|mobility|pilates/.test(t)) return '&#129496;';
  if(/swim/.test(t)) return '&#127946;';
  if(/box|mma|fight|kick/.test(t)) return '&#129354;';
  if(/hike/.test(t)) return '&#129406;';
  if(/ball|soccer|football|tennis|sport|golf/.test(t)) return '&#9917;';
  return '&#128170;';
}
function workoutTypeChoices(){
  const counts = {};
  state.health.gymLog.forEach(function(g){ const k = String(g.type||'').trim(); if(k) counts[k] = (counts[k]||0)+1; });
  const mine = Object.keys(counts).sort(function(a,b){ return counts[b]-counts[a]; }).slice(0, 6);
  const out = mine.map(function(k){ return {id:k, icon:workoutIcon(k)}; });
  WORKOUT_TYPES.forEach(function(t){ if(out.length<8 && !out.some(function(o){ return o.id.toLowerCase()===t.id.toLowerCase(); })) out.push(t); });
  return out;
}
function weeksOnTargetStreak(){
  const target = state.profile.weeklyWorkoutTarget||0; if(!target) return 0;
  let n = 0, ws = addDays(startOfWeekStr(todayStr()), -7);
  for(let k=0;k<104;k++){
    let c = 0; for(let i=0;i<7;i++) if(trainedDoneFor(addDays(ws, i))) c++;
    if(c>=target){ n++; ws = addDays(ws, -7); } else break;
  }
  if(workoutsThisWeek()>=target) n++;
  return n;
}
function renderWorkouts(){
  const log = state.health.gymLog.slice().sort(function(a,b){ return b.date.localeCompare(a.date); });
  const target = state.profile.weeklyWorkoutTarget||0;
  const wk = workoutsThisWeek();
  const ws = startOfWeekStr(todayStr());
  const weekMins = log.filter(function(g){ return g.date>=ws && g.date<=todayStr(); }).reduce(function(a,g){ return a+(Number(g.duration)||0); }, 0);
  const monthCount = log.filter(function(g){ return monthKeyOf(g.date)===thisMonthKey(); }).length;
  const names = ['M','T','W','T','F','S','S'];
  const strip = names.map(function(n, i){
    const d = addDays(ws, i), done = log.filter(function(g){ return g.date===d; });
    return '<div class="fit-day'+(d===todayStr()?' is-today':'')+(done.length?' is-done':'')+(d>todayStr()?' is-future':'')+'" title="'+fmtDateShort(d)+(done.length?': '+escapeHtml(done.map(function(g){ return g.type; }).join(', ')):'')+'">'+
      '<span class="fit-day-dot">'+(done.length ? workoutIcon(done[0].type) : '')+'</span><span class="fit-day-n">'+n+'</span></div>';
  }).join('');
  const sel = ui.fitType || '', dur = ui.fitDur==null ? 45 : ui.fitDur;
  const groups = {};
  log.forEach(function(g){ const k = startOfWeekStr(g.date); (groups[k] = groups[k]||[]).push(g); });
  const weekLabel = function(k){ return k===ws ? 'This week' : k===addDays(ws,-7) ? 'Last week' : 'Week of '+fmtDateShort(k); };
  return '<div class="card fit-hero section">'+
      '<div class="fit-ring">'+svgRing(target ? clamp(wk/target*100,0,100) : 0, 112, wk>=target && target ? 'var(--good)' : 'var(--accent)', wk+(target?'/'+target:''), 'this week')+'</div>'+
      '<div class="fit-mid"><div class="fit-strip">'+strip+'</div>'+
        '<div class="fit-today">'+(trainedDoneFor(todayStr()) ? '<span style="color:var(--good);">&#10003; Trained today — counts toward today\'s standard</span>' : 'Not trained yet today')+'</div></div>'+
      '<div class="fit-stats">'+
        '<div><div class="stat-tile-v">'+weeksOnTargetStreak()+'</div><div class="stat-tile-sub">week streak on target</div></div>'+
        '<div><div class="stat-tile-v">'+fmtDurationLabel(weekMins)+'</div><div class="stat-tile-sub">trained this week</div></div>'+
        '<div><div class="stat-tile-v">'+monthCount+'</div><div class="stat-tile-sub">workouts this month</div></div>'+
      '</div>'+
    '</div>'+
    '<div class="section"><div class="section-title">Log a workout</div><div class="card fit-log">'+
      '<div class="fit-types">'+workoutTypeChoices().map(function(t){ return '<button class="fit-type'+(sel===t.id?' is-on':'')+'" data-action="fitPickType" data-id="'+escapeHtml(t.id)+'"><span class="fit-type-i">'+t.icon+'</span>'+escapeHtml(t.id)+'</button>'; }).join('')+'</div>'+
      '<div class="fit-row">'+
        '<input class="input" id="gymType" placeholder="…or type it (e.g. Push day)" value="'+escapeHtml(sel)+'" style="flex:1;min-width:180px;">'+
        '<div class="fit-durs">'+[15,30,45,60,90,120].map(function(m){ return '<button class="fit-dur'+(dur===m?' is-on':'')+'" data-action="fitPickDur" data-id="'+m+'">'+(m<60?m+'m':(m/60)+'h')+'</button>'; }).join('')+'</div>'+
      '</div>'+
      '<div class="fit-row">'+
        '<input class="input" type="date" id="gymDate" value="'+(ui.fitDate||todayStr())+'" style="width:160px;">'+
        '<input class="input" id="gymNotes" placeholder="Notes (optional) — PRs, how it felt" style="flex:1;min-width:180px;">'+
        '<button class="btn btn-good fit-log-btn" data-action="fitLog">&#10003; Log workout</button>'+
      '</div>'+
    '</div></div>'+
    '<div class="section"><div class="section-title">History</div>'+
      (log.length ? Object.keys(groups).sort().reverse().slice(0, 10).map(function(k){
        const items = groups[k];
        return '<div class="fit-week"><div class="fit-week-head"><span>'+weekLabel(k)+'</span><span class="kpi-sub">'+items.length+' workout'+(items.length===1?'':'s')+' &middot; '+fmtDurationLabel(items.reduce(function(a,g){ return a+(Number(g.duration)||0); },0))+'</span></div>'+
          items.map(function(g){
            return '<div class="fit-entry" data-key="gym-'+g.id+'"><span class="fit-entry-i">'+workoutIcon(g.type)+'</span>'+
              '<div class="fit-entry-main"><div class="fit-entry-title">'+escapeHtml(g.type)+(g.duration?' <span class="kpi-sub">&middot; '+fmtDurationLabel(g.duration)+'</span>':'')+'</div>'+(g.notes?'<div class="kpi-sub">'+escapeHtml(g.notes)+'</div>':'')+'</div>'+
              '<span class="kpi-sub">'+weekdayShort(g.date)+' '+fmtDateShort(g.date)+'</span>'+
              '<button class="btn btn-ghost btn-sm" data-action="openWorkoutEditModal" data-id="'+g.id+'">Edit</button>'+deleteBtn('gym', g.id)+
            '</div>';
          }).join('')+'</div>';
      }).join('') : '<div class="empty">No workouts logged yet — pick one above.</div>')+
    '</div>';
}
ACTIONS.fitPickType = function(el, e, id){ ui.fitType = ui.fitType===id ? '' : id; renderView(); };
ACTIONS.fitPickDur = function(el, e, id){ ui.fitDur = Number(id); renderView(); };
ACTIONS.fitLog = function(){
  const typeEl = document.getElementById('gymType');
  const type = (typeEl && typeEl.value.trim()) || ui.fitType;
  if(!type){ if(typeEl) typeEl.focus(); showToast('Pick or type what you did.', {icon:'&#128170;'}); return; }
  const date = (document.getElementById('gymDate')||{}).value || todayStr();
  const notes = ((document.getElementById('gymNotes')||{}).value||'').trim();
  const firstToday = date===todayStr() && !trainedDoneFor(date);
  state.health.gymLog.push({id:uid(), date:date, type:type, duration:ui.fitDur==null?45:ui.fitDur, notes:notes});
  ui.fitType = ''; ui.fitDate = null;
  if(typeEl) typeEl.value = '';
  const n = document.getElementById('gymNotes'); if(n) n.value = '';
  playPositive();
  persist('health'); renderView();
  showToast(firstToday ? 'Logged — today\'s training standard is done.' : 'Workout logged.', {icon:workoutIcon(type)});
};
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

