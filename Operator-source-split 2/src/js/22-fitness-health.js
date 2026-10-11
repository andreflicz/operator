// ============ FITNESS (Health) ============
// One page, no tabs: the week of training on top; then Body & Fuel together (your weight and what
// you're eating go hand in hand) — log a weigh-in or food right there; then the history. Logging a
// workout (or a weigh-in, or food) is the + in the corner: a small sheet, three taps.
function renderFitness(){
  return '<div class="hl">'+renderWorkoutsHero()+renderBodyFuel()+
    '<div class="hl-cols">'+renderWorkoutHistory()+renderHealthLists()+'</div>'+
  '</div>';
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
function renderWorkoutsHero(){
  const log = state.health.gymLog;
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
  const hit = target && wk>=target;
  return '<div class="card fit-hero hl-hero section">'+
      '<div class="fit-ring">'+svgRing(target ? clamp(wk/target*100,0,100) : 0, 112, hit ? 'var(--good)' : 'var(--accent)', wk+(target?'/'+target:''), 'this week')+'</div>'+
      '<div class="fit-mid"><div class="hl-k">Training</div><div class="fit-strip">'+strip+'</div>'+
        '<div class="fit-today">'+(trainedDoneFor(todayStr()) ? '<span class="hl-ok">&#10003; Trained today</span>' : '<span>Not trained yet today</span> <button class="hl-link" data-action="healthLog" data-id="workout">Log one &#8594;</button>')+'</div></div>'+
      '<div class="fit-stats">'+
        '<div><div class="stat-tile-v">'+weeksOnTargetStreak()+'</div><div class="stat-tile-sub">weeks on target</div></div>'+
        '<div><div class="stat-tile-v">'+fmtDurationLabel(weekMins)+'</div><div class="stat-tile-sub">trained this week</div></div>'+
        '<div><div class="stat-tile-v">'+monthCount+'</div><div class="stat-tile-sub">this month</div></div>'+
      '</div>'+
    '</div>';
}
function renderWorkoutHistory(){
  const log = state.health.gymLog.slice().sort(function(a,b){ return b.date.localeCompare(a.date); });
  const ws = startOfWeekStr(todayStr()), groups = {};
  log.forEach(function(g){ const k = startOfWeekStr(g.date); (groups[k] = groups[k]||[]).push(g); });
  const weekLabel = function(k){ return k===ws ? 'This week' : k===addDays(ws,-7) ? 'Last week' : 'Week of '+fmtDateShort(k); };
  return '<div class="section hl-hist"><div class="section-title">Workouts</div>'+
    (log.length ? Object.keys(groups).sort().reverse().slice(0, 6).map(function(k){
      const items = groups[k];
      return '<div class="fit-week"><div class="fit-week-head"><span>'+weekLabel(k)+'</span><span class="kpi-sub">'+items.length+' &middot; '+fmtDurationLabel(items.reduce(function(a,g){ return a+(Number(g.duration)||0); },0))+'</span></div>'+
        items.map(function(g){
          return '<div class="fit-entry" data-key="gym-'+g.id+'"><span class="fit-entry-i">'+workoutIcon(g.type)+'</span>'+
            '<div class="fit-entry-main"><div class="fit-entry-title">'+escapeHtml(g.type)+(g.duration?' <span class="kpi-sub">&middot; '+fmtDurationLabel(g.duration)+'</span>':'')+'</div>'+(g.notes?'<div class="kpi-sub">'+escapeHtml(g.notes)+'</div>':'')+'</div>'+
            '<span class="fit-entry-date">'+weekdayShort(g.date)+' '+fmtDateShort(g.date)+'</span>'+
            '<span class="fit-entry-acts"><button class="btn btn-ghost btn-sm" data-action="openWorkoutEditModal" data-id="'+g.id+'">Edit</button>'+deleteBtn('gym', g.id)+'</span>'+
          '</div>';
        }).join('')+'</div>';
    }).join('') : '<div class="empty">No workouts yet — the + in the corner logs one.</div>')+
  '</div>';
}
// (older callers)
function renderWorkouts(){ return renderWorkoutsHero()+renderWorkoutHistory(); }
ACTIONS.fitPickType = function(el, e, id){ ui.fitType = ui.fitType===id ? '' : id; const t = document.getElementById('gymType'); if(t) t.value = ui.fitType; healthSheetRefresh(); };
ACTIONS.fitPickDur = function(el, e, id){ ui.fitDur = Number(id); healthSheetRefresh(); };
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
  persist('health'); closeHealthSheet(); renderView();
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
// Body & Fuel: one card, two halves — your weight (now, the change, the goal, a little trend line, log
// it right there) and today's food (the ring, what's left, one-tap go-tos, add anything)
function weightSpark(vals){
  if(vals.length < 2) return '';
  const W = 220, H = 46, min = Math.min.apply(null, vals), max = Math.max.apply(null, vals), span = (max - min) || 1;
  const pts = vals.map(function(v, i){ return (i/(vals.length-1)*W).toFixed(1)+','+(4 + (1-(v-min)/span)*(H-8)).toFixed(1); });
  return '<svg class="bf-spark" viewBox="0 0 '+W+' '+H+'" preserveAspectRatio="none"><defs><linearGradient id="bfSg" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#5BB4E5" stop-opacity=".35"/><stop offset="1" stop-color="#5BB4E5" stop-opacity="0"/></linearGradient></defs>'+
    '<path d="M'+pts.join(' L')+' L'+W+','+H+' L0,'+H+' Z" fill="url(#bfSg)"/><path d="M'+pts.join(' L')+'" class="bf-spark-l"/><circle cx="'+pts[pts.length-1].split(',')[0]+'" cy="'+pts[pts.length-1].split(',')[1]+'" r="3.2" class="bf-spark-d"/></svg>';
}
function renderBodyFuel(){
  const log = state.health.weightLog.slice().sort(function(a,b){ return a.date.localeCompare(b.date); });
  const latest = log[log.length-1], start = log[0], goal = state.profile.goalWeight;
  const weekAgo = log.filter(function(w){ return w.date <= addDays(todayStr(), -7); }).slice(-1)[0];
  const delta = latest && weekAgo ? latest.weight - weekAgo.weight : (latest && start && start!==latest ? latest.weight - start.weight : null);
  const deltaFrom = latest && weekAgo ? 'this week' : start && latest && start!==latest ? 'since '+fmtDateShort(start.date) : '';
  let goalHtml = '<button class="hl-link" data-action="goToProfileSettings">Set a goal weight &#8594;</button>';
  if(goal){
    const startW = start ? start.weight : (latest ? latest.weight : goal), total = startW - goal, done = latest ? startW - latest.weight : 0;
    const pct = total>0 ? clamp(Math.round(done/total*100), 0, 100) : (latest && latest.weight<=goal ? 100 : 0), left = latest ? latest.weight - goal : null;
    goalHtml = '<div class="bf-goal"><div class="bf-goal-k"><span>Goal '+goal+'</span><b>'+(left==null ? '' : left>0 ? left.toFixed(1)+' to go' : 'Reached &#127881;')+'</b></div><div class="hw-bar"><i style="width:'+pct+'%"></i></div></div>';
  }
  const body = typeof bodyStats==='function' ? bodyStats() : {};
  const loggedToday = latest && latest.date===todayStr();
  // fuel
  const today = state.health.calorieEntries.filter(function(c){ return c.date===todayStr(); });
  const total = today.reduce(function(a,c){ return a+Number(c.calories||0); },0);
  const target = state.profile.calorieTarget || 2000;
  const pct = clamp(Math.round(total/target*100), 0, 999), left = target - total;
  const color = pct>110 ? 'var(--danger)' : pct>=85 ? 'var(--good)' : 'var(--accent)';
  const picks = state.meals.library.slice().sort(function(a, b){ return (b.uses||0) - (a.uses||0); }).slice(0, 4);
  return '<div class="card bf section" id="bodyFuel">'+
    '<div class="bf-half bf-body">'+
      '<div class="hl-k">Body</div>'+
      '<div class="bf-now"><span class="hw-v">'+(latest ? latest.weight : '—')+'</span><small>'+(state.profile.weightUnit==='kg' ? 'kg' : 'lbs')+'</small>'+
        (delta!=null ? '<span class="hw-delta '+(delta<0?'is-down':delta>0?'is-up':'')+'">'+(delta<0?'&#9660; ':delta>0?'&#9650; ':'')+Math.abs(delta).toFixed(1)+' '+deltaFrom+'</span>' : '')+
        (body.bmi ? '<span class="bf-bmi" title="BMI for your height">BMI '+body.bmi.toFixed(1)+'</span>' : '')+'</div>'+
      weightSpark(log.slice(-30).map(function(r){ return Number(r.weight); }))+
      goalHtml+
      '<div class="bf-log"><input class="input" type="number" step="0.1" id="weightValue" placeholder="'+(loggedToday ? 'Logged today — again?' : 'Today’s weight')+'"><input type="hidden" id="weightDate" value="'+todayStr()+'"><button class="btn btn-primary btn-sm" data-action="addWeight">Log</button></div>'+
    '</div>'+
    '<div class="bf-half bf-fuel">'+
      '<div class="hl-k">Fuel<span class="kpi-sub">'+today.length+' item'+(today.length===1?'':'s')+' today</span></div>'+
      '<div class="bf-fuel-top"><div class="hc-ring">'+svgRing(clamp(pct, 0, 100), 92, color, String(total), 'of '+target)+'</div>'+
        '<div class="hc-left'+(left<0?' is-over':'')+'">'+(left>=0 ? '<b>'+left+'</b> cal left today' : '<b>'+(-left)+'</b> cal over today')+'</div></div>'+
      '<div class="hc-picks">'+(picks.map(function(m){ return '<button class="hc-pick" data-action="quickMeal" data-id="'+m.id+'"><span>'+escapeHtml(m.name)+'</span><b>'+m.calories+'</b></button>'; }).join('') || '<span class="kpi-sub">Save your go-to meals below.</span>')+'</div>'+
      '<div class="bf-log"><input class="input" id="calName" placeholder="Something else…"><input class="input bf-cal" type="number" id="calAmount" placeholder="cal"><button class="btn btn-sm" data-action="addCalorieEntry">Add</button></div>'+
    '</div>'+
  '</div>';
}
// under it: today's food and your weigh-ins, small, and the meal library tucked away
function renderHealthLists(){
  const log = state.health.weightLog.slice().sort(function(a,b){ return a.date.localeCompare(b.date); });
  const today = state.health.calorieEntries.filter(function(c){ return c.date===todayStr(); });
  return '<div class="hl-side">'+
    '<div class="section"><div class="section-title">Today’s food</div><div class="hw-list">'+
      (today.map(function(c){ return '<div class="hw-row"><span class="hw-row-d" style="flex:1;color:var(--text);">'+escapeHtml(c.name||'Food')+'</span><span class="hw-row-v">'+c.calories+'<small> cal</small></span><span class="hw-row-x">'+deleteBtn('calorie', c.id)+'</span></div>'; }).join('') || '<div class="empty">Nothing logged today.</div>')+
    '</div></div>'+
    '<div class="section"><div class="section-title">Weigh-ins</div><div class="hw-list">'+
      (log.slice().reverse().slice(0, 6).map(function(w, i, arr2){ const prev = arr2[i+1]; const d = prev ? w.weight - prev.weight : null;
        return '<div class="hw-row"><span class="hw-row-d">'+weekdayShort(w.date)+' '+fmtDateShort(w.date)+'</span><span class="hw-row-v">'+w.weight+'</span>'+
          (d!=null && d!==0 ? '<span class="hw-chip '+(d<0?'is-down':'is-up')+'">'+(d<0?'&#9660;':'&#9650;')+' '+Math.abs(d).toFixed(1)+'</span>' : '<span></span>')+'<span class="hw-row-x">'+deleteBtn('weight', w.id)+'</span></div>'; }).join('') || '<div class="empty">No weigh-ins yet.</div>')+
    '</div></div>'+
    '<details class="section hc-lib"'+(ui.mealLibOpen?' open':'')+'><summary class="section-title">Meal library<span class="kpi-sub">'+state.meals.library.length+'</span>'+tip('Your go-to meals — one tap logs them.')+'</summary>'+
      '<div class="hc-add" style="margin-bottom:10px;"><input class="input" id="mealName" placeholder="e.g. Turkey chili" style="flex:1;"><input class="input" type="number" id="mealCalories" placeholder="cal" style="width:90px;"><button class="btn" data-action="addMeal">Save meal</button></div>'+
      '<div class="hw-list">'+(state.meals.library.map(function(m){ return '<div class="hw-row"><span class="hw-row-d" style="flex:1;color:var(--text);">'+escapeHtml(m.name)+'</span><span class="hw-row-v">'+m.calories+'<small> cal</small></span><span class="hw-row-x">'+deleteBtn('meal', m.id)+'</span></div>'; }).join('') || '<div class="empty">No meals saved yet.</div>')+'</div>'+
    '</details>'+
  '</div>';
}
// (older callers — the weight and calories tabs are one card now)
function renderWeight(){ return renderBodyFuel(); }
function renderCalories(){ return renderBodyFuel(); }
ACTIONS.goToProfileSettings = function(){ ui.view = 'settings'; ui.settingsTab = 'you'; renderView(); setTimeout(function(){ const el = document.getElementById('setGoalWeight'); if(el){ el.scrollIntoView({block:'center', behavior:'smooth'}); el.focus(); } }, 60); };
// ---- the quick-log sheet (the + on Health, or "Log one"): Workout · Weight · Food ----
function healthSheetHtml(){
  const k = ui.hlogKind || 'workout', sel = ui.fitType || '', dur = ui.fitDur==null ? 45 : ui.fitDur;
  const seg = '<div class="hs-seg">'+[['workout', '&#127947;&#65039; Workout'], ['weight', '&#9878;&#65039; Weight'], ['food', '&#129367; Food']].map(function(x){ return '<button class="'+(k===x[0] ? 'is-on' : '')+'" data-action="healthLog" data-id="'+x[0]+'">'+x[1]+'</button>'; }).join('')+'</div>';
  let body = '';
  if(k==='workout') body =
    '<div class="fit-types">'+workoutTypeChoices().map(function(t){ return '<button class="fit-type'+(sel===t.id?' is-on':'')+'" data-action="fitPickType" data-id="'+escapeHtml(t.id)+'"><span class="fit-type-i">'+t.icon+'</span>'+escapeHtml(t.id)+'</button>'; }).join('')+'</div>'+
    '<input class="input hs-in" id="gymType" placeholder="…or type it (e.g. Push day)" value="'+escapeHtml(sel)+'">'+
    '<div class="fit-durs">'+[15,30,45,60,90,120].map(function(m){ return '<button class="fit-dur'+(dur===m?' is-on':'')+'" data-action="fitPickDur" data-id="'+m+'">'+(m<60?m+'m':(m/60)+'h')+'</button>'; }).join('')+'</div>'+
    '<div class="hs-row"><input class="input" type="date" id="gymDate" value="'+(ui.fitDate||todayStr())+'"><input class="input" id="gymNotes" placeholder="Notes — PRs, how it felt"></div>'+
    '<button class="btn btn-good hs-go" data-action="fitLog">&#10003; Log workout</button>';
  else if(k==='weight') body =
    '<div class="hs-big"><input class="input" type="number" step="0.1" id="hsWeight" placeholder="'+(latestWeight()!=null ? latestWeight() : 'e.g. 205')+'"><span>'+(state.profile.weightUnit==='kg' ? 'kg' : 'lbs')+'</span></div>'+
    '<button class="btn btn-primary hs-go" data-action="hsWeight">Log weigh-in</button>';
  else body =
    '<div class="hc-picks">'+state.meals.library.map(function(m){ return '<button class="hc-pick" data-action="hsMeal" data-id="'+m.id+'"><span>'+escapeHtml(m.name)+'</span><b>'+m.calories+'</b></button>'; }).join('')+'</div>'+
    '<div class="hs-row"><input class="input" id="hsFood" placeholder="What did you eat?"><input class="input bf-cal" type="number" id="hsCal" placeholder="cal"></div>'+
    '<button class="btn btn-primary hs-go" data-action="hsFood">Add</button>';
  return '<button class="int-x hs-x" data-action="closeHealthSheet" title="Close">&#10005;</button><div class="hs-h">Log it</div>'+seg+'<div class="hs-body">'+body+'</div>';
}
function openHealthSheet(kind){
  ui.hlogKind = kind || ui.hlogKind || 'workout';
  let o = document.getElementById('healthSheet');
  if(!o){ o = document.createElement('div'); o.id = 'healthSheet'; o.className = 'overlay hs-ov hidden'; o.innerHTML = '<div class="card hs" id="healthSheetContent"></div>'; document.body.appendChild(o); }
  o.classList.remove('hidden'); healthSheetRefresh();
  setTimeout(function(){ const i = document.getElementById(ui.hlogKind==='weight' ? 'hsWeight' : ui.hlogKind==='food' ? 'hsFood' : 'gymType'); if(i && ui.hlogKind!=='workout') i.focus(); }, 60);
}
function healthSheetRefresh(){ const c = document.getElementById('healthSheetContent'); if(c && !c.closest('.hidden')) morphInto(c, healthSheetHtml(), {form:true}); }
function closeHealthSheet(){ const o = document.getElementById('healthSheet'); if(o) o.classList.add('hidden'); }
ACTIONS.healthLog = function(el, e, id){ openHealthSheet(id); };
ACTIONS.closeHealthSheet = function(){ closeHealthSheet(); };
ACTIONS.hsWeight = function(){
  const v = Number((document.getElementById('hsWeight')||{}).value); if(!v){ const i = document.getElementById('hsWeight'); if(i) i.focus(); return; }
  state.health.weightLog.push({id:uid(), date:todayStr(), weight:v}); persist('health'); playPositive(); closeHealthSheet(); renderView(); showToast('Weigh-in logged: '+v+'.', {icon:'&#9878;&#65039;'});
};
ACTIONS.hsMeal = function(el, e, id){ quickMeal(id); closeHealthSheet(); const m = state.meals.library.find(function(x){ return x.id===id; }); if(m) showToast(m.name+' — '+m.calories+' cal.', {icon:'&#129367;'}); };
ACTIONS.hsFood = function(){
  const n = ((document.getElementById('hsFood')||{}).value||'').trim(), c = Number((document.getElementById('hsCal')||{}).value)||0;
  if(!n || !c){ const i = document.getElementById(!n ? 'hsFood' : 'hsCal'); if(i) i.focus(); return; }
  state.health.calorieEntries.push({id:uid(), date:todayStr(), name:n, calories:c}); persist('health'); playPositive(); closeHealthSheet(); renderView();
};
document.addEventListener('keydown', function(e){
  if(e.key!=='Enter' || !e.target || !e.target.closest || !e.target.closest('#healthSheet')) return;
  const b = document.querySelector('#healthSheet .hs-go'); if(b){ e.preventDefault(); b.click(); }
});
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
  playPositive(); persist('health'); renderView();
}
function quickMeal(mealId){
  const m = state.meals.library.find(function(x){ return x.id===mealId; }); if(!m) return;
  state.health.calorieEntries.push({id:uid(), date:todayStr(), name:m.name, calories:m.calories});
  m.uses = (m.uses||0) + 1; persist('meals');
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

