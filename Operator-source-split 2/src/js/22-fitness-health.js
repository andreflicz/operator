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
    '<div class="section"><div class="section-title">&#128170; Log a workout</div><div class="card fit-log">'+
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
              '<span class="fit-entry-date">'+weekdayShort(g.date)+' '+fmtDateShort(g.date)+'</span>'+
              '<span class="fit-entry-acts"><button class="btn btn-ghost btn-sm" data-action="openWorkoutEditModal" data-id="'+g.id+'">Edit</button>'+deleteBtn('gym', g.id)+'</span>'+
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
// a soft area chart for the weight trend: gradient fill, the last point called out
function healthAreaChart(vals, labels){
  const W = 640, H = 190, P = {l:8, r:46, t:18, b:26};
  const min = Math.min.apply(null, vals), max = Math.max.apply(null, vals), span = (max-min) || 1;
  const x = function(i){ return P.l + (vals.length===1 ? 0 : i/(vals.length-1))*(W-P.l-P.r); };
  const y = function(v){ return P.t + (1-(v-min)/span)*(H-P.t-P.b); };
  const pts = vals.map(function(v, i){ return x(i).toFixed(1)+','+y(v).toFixed(1); });
  const line = 'M'+pts.join(' L');
  const area = line+' L'+x(vals.length-1).toFixed(1)+','+(H-P.b)+' L'+x(0).toFixed(1)+','+(H-P.b)+' Z';
  const last = vals.length-1;
  return '<svg class="hw-svg" viewBox="0 0 '+W+' '+H+'" preserveAspectRatio="none"><defs><linearGradient id="hwGrad" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#e8a23d" stop-opacity=".38"/><stop offset="1" stop-color="#e8a23d" stop-opacity="0"/></linearGradient></defs>'+
    [0, .5, 1].map(function(f){ const yy = P.t + f*(H-P.t-P.b); return '<line x1="'+P.l+'" x2="'+(W-P.r)+'" y1="'+yy+'" y2="'+yy+'" class="hw-grid"/><text x="'+(W-P.r+8)+'" y="'+(yy+4)+'" class="hw-ax">'+(max - f*span).toFixed(1)+'</text>'; }).join('')+
    '<path d="'+area+'" fill="url(#hwGrad)"/><path d="'+line+'" class="hw-line"/>'+
    vals.map(function(v, i){ return '<circle cx="'+x(i).toFixed(1)+'" cy="'+y(v).toFixed(1)+'" r="'+(i===last?5:2.5)+'" class="hw-dot'+(i===last?' is-last':'')+'"><title>'+escapeHtml(labels[i])+': '+v+'</title></circle>'; }).join('')+
    '<text x="'+P.l+'" y="'+(H-6)+'" class="hw-ax">'+escapeHtml(labels[0])+'</text><text x="'+(W-P.r)+'" y="'+(H-6)+'" class="hw-ax" text-anchor="end">'+escapeHtml(labels[last])+'</text>'+
  '</svg>';
}
function renderWeight(){
  const log = state.health.weightLog.slice().sort(function(a,b){ return a.date.localeCompare(b.date); });
  const recent = log.slice(-30);
  const latest = log[log.length-1], start = log[0];
  const goal = state.profile.goalWeight;
  const weekAgo = log.filter(function(w){ return w.date <= addDays(todayStr(), -7); }).slice(-1)[0];
  const delta = latest && weekAgo ? latest.weight - weekAgo.weight : (latest && start && start!==latest ? latest.weight - start.weight : null);
  const deltaFrom = latest && weekAgo ? 'in a week' : start && latest && start!==latest ? 'since '+fmtDateShort(start.date) : '';
  let goalHtml = '<div class="hw-goal is-empty"><span>No goal weight yet</span><button class="btn btn-ghost btn-sm" data-action="goToProfileSettings">Set one</button></div>';
  if(goal){
    const startW = start ? start.weight : (latest ? latest.weight : goal);
    const total = startW - goal, done = latest ? startW - latest.weight : 0;
    const pct = total>0 ? clamp(Math.round(done/total*100), 0, 100) : (latest && latest.weight<=goal ? 100 : 0);
    const left = latest ? latest.weight - goal : null;
    goalHtml = '<div class="hw-goal"><div class="hw-goal-k"><span>Goal '+goal+'</span><b>'+(left==null ? '' : left>0 ? left.toFixed(1)+' to go' : 'Reached &#127881;')+'</b></div><div class="hw-bar"><i style="width:'+pct+'%"></i></div></div>';
  }
  return '<div class="card hw-hero section">'+
      '<div class="hw-now"><div class="hw-k">Now</div><div class="hw-v">'+(latest ? latest.weight : '—')+'</div>'+
        (delta!=null ? '<div class="hw-delta '+(delta<0?'is-down':delta>0?'is-up':'')+'">'+(delta<0?'&#9660; ':delta>0?'&#9650; ':'')+Math.abs(delta).toFixed(1)+' '+deltaFrom+'</div>' : '<div class="hw-delta">'+(latest ? 'logged '+fmtDateShort(latest.date) : 'nothing logged yet')+'</div>')+'</div>'+
      '<div class="hw-side">'+goalHtml+
        '<div class="hw-log"><input class="input hw-in" type="number" step="0.1" id="weightValue" placeholder="Today\'s weight"><input class="input" type="date" id="weightDate" value="'+todayStr()+'"><button class="btn btn-primary" data-action="addWeight">Log</button></div>'+
      '</div>'+
    '</div>'+
    '<div class="card hw-chart section">'+(recent.length>=2 ? healthAreaChart(recent.map(function(r){ return r.weight; }), recent.map(function(r){ return fmtDateShort(r.date); })) : '<div class="empty">Log a couple of days to see the trend.</div>')+'</div>'+
    '<div class="section"><div class="section-title">History</div><div class="hw-list">'+
      (log.slice().reverse().slice(0, 12).map(function(w, i, arr2){ const prev = arr2[i+1]; const d = prev ? w.weight - prev.weight : null;
        return '<div class="hw-row"><span class="hw-row-d">'+weekdayShort(w.date)+' '+fmtDateShort(w.date)+'</span><span class="hw-row-v">'+w.weight+'</span>'+
          (d!=null && d!==0 ? '<span class="hw-chip '+(d<0?'is-down':'is-up')+'">'+(d<0?'&#9660;':'&#9650;')+' '+Math.abs(d).toFixed(1)+'</span>' : '<span></span>')+'<span class="hw-row-x">'+deleteBtn('weight', w.id)+'</span></div>'; }).join('') || '<div class="empty">Nothing logged yet.</div>')+
    '</div></div>';
}
ACTIONS.goToProfileSettings = function(){ ui.view = 'settings'; ui.settingsTab = 'you'; renderView(); setTimeout(function(){ const el = document.getElementById('setGoalWeight'); if(el){ el.scrollIntoView({block:'center', behavior:'smooth'}); el.focus(); } }, 60); };
function renderCalories(){
  const today = state.health.calorieEntries.filter(function(c){ return c.date===todayStr(); });
  const total = today.reduce(function(a,c){ return a+Number(c.calories||0); },0);
  const target = state.profile.calorieTarget || 2000;
  const pct = clamp(Math.round(total/target*100), 0, 999), left = target - total;
  const color = pct>110 ? 'var(--danger)' : pct>=85 ? 'var(--good)' : 'var(--accent)';
  return '<div class="card hc-hero section">'+
      '<div class="hc-ring">'+svgRing(clamp(pct, 0, 100), 132, color, String(total), 'of '+target)+'</div>'+
      '<div class="hc-main">'+
        '<div class="hc-left'+(left<0?' is-over':'')+'">'+(left>=0 ? '<b>'+left+'</b> cal left today' : '<b>'+(-left)+'</b> cal over today')+'</div>'+
        '<div class="hc-k">Quick add</div>'+
        '<div class="hc-picks">'+(state.meals.library.map(function(m){ return '<button class="hc-pick" data-action="quickMeal" data-id="'+m.id+'"><span>'+escapeHtml(m.name)+'</span><b>'+m.calories+'</b></button>'; }).join('') || '<span class="kpi-sub">No saved meals yet.</span>')+'</div>'+
        '<div class="hc-add"><input class="input" id="calName" placeholder="Something else…" style="flex:1;"><input class="input" type="number" id="calAmount" placeholder="cal" style="width:90px;"><button class="btn btn-primary" data-action="addCalorieEntry">Add</button></div>'+
      '</div>'+
    '</div>'+
    '<div class="section"><div class="section-title">Today<span class="kpi-sub">'+today.length+' item'+(today.length===1?'':'s')+'</span></div><div class="hw-list">'+
      (today.map(function(c){ return '<div class="hw-row"><span class="hw-row-d" style="flex:1;color:var(--text);">'+escapeHtml(c.name||'Food')+'</span><span class="hw-row-v">'+c.calories+'<small> cal</small></span><span class="hw-row-x">'+deleteBtn('calorie', c.id)+'</span></div>'; }).join('') || '<div class="empty">Nothing logged today yet.</div>')+
    '</div></div>'+
    '<details class="section hc-lib"'+(ui.mealLibOpen?' open':'')+'><summary class="section-title">Meal library<span class="kpi-sub">'+state.meals.library.length+'</span>'+tip('Your go-to meals — one tap logs them.')+'</summary>'+
      '<div class="hc-add" style="margin-bottom:10px;"><input class="input" id="mealName" placeholder="e.g. Turkey chili" style="flex:1;"><input class="input" type="number" id="mealCalories" placeholder="cal" style="width:90px;"><button class="btn" data-action="addMeal">Save meal</button></div>'+
      '<div class="hw-list">'+(state.meals.library.map(function(m){ return '<div class="hw-row"><span class="hw-row-d" style="flex:1;color:var(--text);">'+escapeHtml(m.name)+'</span><span class="hw-row-v">'+m.calories+'<small> cal</small></span><span class="hw-row-x">'+deleteBtn('meal', m.id)+'</span></div>'; }).join('') || '<div class="empty">No meals saved yet.</div>')+'</div>'+
    '</details>';
}
document.addEventListener('toggle', function(e){ if(e.target && e.target.classList && e.target.classList.contains('hc-lib')) ui.mealLibOpen = e.target.open; }, true);
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

