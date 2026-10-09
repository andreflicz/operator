// ============ GOALS ============
// Two kinds:
//  • Tracked goals fill themselves from what the app already knows — MRR from your active
//    clients, weight from Health → Weight, workouts from Health → Workouts, hours from your
//    locked-in sessions, days in a row from the Today's Standard streak, active clients.
//  • Your own goals are for things the app can't see (IG followers, a first sponsor deal):
//    you bump them with + / − or type the number in.
const GOAL_TRACKERS = {
  mrr:      {icon:'&#128176;', label:'Monthly revenue', unit:'$/mo', src:'from your active clients\' MRR', name:function(g){ return '$'+fmtGoalNum(g.target)+'/mo MRR'; }},
  weight:   {icon:'&#9878;&#65039;', label:'Body weight', unit:'lbs', src:'from Health → Weight', name:function(g){ return 'Reach '+fmtGoalNum(g.target)+' lbs'; }},
  workouts: {icon:'&#127947;&#65039;', label:'Workouts', unit:'workouts', src:'from Health → Workouts', periods:true, name:function(g){ return fmtGoalNum(g.target)+' workouts '+goalPeriodLabel(g); }},
  hours:    {icon:'&#9201;&#65039;', label:'Hours of deep work', unit:'h', src:'from your locked-in sessions', periods:true, name:function(g){ return fmtGoalNum(g.target)+'h of deep work '+goalPeriodLabel(g); }},
  streak:   {icon:'&#128293;', label:'Days in a row', unit:'days', src:'from your Today\'s Standard streak', name:function(g){ return fmtGoalNum(g.target)+'-day streak'; }},
  clients:  {icon:'&#129309;', label:'Active clients', unit:'clients', src:'from Business → Clients', name:function(g){ return fmtGoalNum(g.target)+' active clients'; }}
};
const GOAL_KINDS = ['mrr', 'weight', 'workouts', 'hours', 'streak', 'clients', 'custom'];
function goalTracker(g){ return g && g.autoTrack ? GOAL_TRACKERS[g.autoTrack] || null : null; }
function goalPeriodLabel(g){ return g.period==='week' ? 'a week' : g.period==='month' ? 'a month' : 'in total'; }
function goalIsPeriodic(g){ const t = goalTracker(g); return !!(t && t.periods && (g.period==='week' || g.period==='month')); }
function goalRange(g){
  const today = todayStr();
  if(g.period==='week') return [startOfWeekStr(today), today];
  if(g.period==='month') return [today.slice(0, 8)+'01', today];
  return [g.createdAt || today, today];
}
function sumOverDays(from, to, fn){
  let t = 0, d = from, guard = 0;
  while(d<=to && guard++ < 1500){ t += fn(d); d = addDays(d, 1); }
  return t;
}
function latestWeight(){
  const log = arr(state.health.weightLog); let best = null;
  log.forEach(function(w){ if(w && w.weight!=null && (!best || w.date>=best.date)) best = w; });
  return best ? Number(best.weight) : null;
}
// where a weight goal is measured from: your first logged weight (same as Health → Weight)
function firstWeight(){
  const log = arr(state.health.weightLog); let first = null;
  log.forEach(function(w){ if(w && w.weight!=null && (!first || w.date<first.date)) first = w; });
  return first ? Number(first.weight) : null;
}
function goalLiveCurrentRaw(g){
  switch(g.autoTrack){
    case 'streak': return computeStreak();
    case 'mrr': return activeMrr();
    case 'clients': return arr(state.business.clients).filter(function(c){ return c.status==='active'; }).length;
    case 'weight': return latestWeight();
    case 'workouts': { const r = goalRange(g); return sumOverDays(r[0], r[1], function(d){ return workoutDay(d).n; }); }
    case 'hours': { const r = goalRange(g); const today = todayStr(); return Math.round(sumOverDays(r[0], r[1], function(d){ return d===today ? deepWorkMinutesTodayLive() : deepWorkMinutesFor(d); })/6)/10; }
    default: return Number(g.current)||0;
  }
}
function goalLiveCurrent(g){ return RC && g.id ? memo('goal:'+g.id, function(){ return goalLiveCurrentRaw(g); }) : goalLiveCurrentRaw(g); }
function goalPct(g){
  if(!(g.target>0)) return g.done ? 100 : 0;
  const cur = goalLiveCurrent(g);
  if(g.autoTrack==='weight'){
    if(cur==null || g.start==null || Number(g.start)===Number(g.target)) return cur!=null && goalReached(g) ? 100 : 0;
    return clamp((g.start-cur)/(g.start-g.target)*100, 0, 100);
  }
  return clamp(cur/g.target*100, 0, 100);
}
function goalReached(g){
  if(!(g.target>0)) return false;
  const cur = goalLiveCurrent(g);
  if(g.autoTrack==='weight') return cur!=null && (g.start!=null && Number(g.start) < Number(g.target) ? cur>=g.target : cur<=g.target);
  return cur>=g.target;
}
// Tracked goals tick themselves off the first time they're reached (weekly/monthly ones just show
// "done this week" and roll over).
function settleGoals(){
  let changed = false;
  state.goals.items.forEach(function(g){
    if(g.done || !g.autoTrack || goalIsPeriodic(g) || !goalReached(g)) return;
    g.done = true; g.doneAt = todayStr(); changed = true;
    showToast('Goal reached: '+goalTitle(g), {icon:'&#127942;'});
  });
  if(changed){ playSessionComplete(); persist('goals'); }
}
afterRenderHooks.push(function(){ if(state.goals && state.goals.items.some(function(g){ return g.autoTrack && !g.done; })) setTimeout(settleGoals, 0); });
function goalTitle(g){ const t = goalTracker(g); return g.label || (t ? t.name(g) : 'Goal'); }
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
// ---- the kind picker shared by the new-goal form and the editor ----
function goalKindChipsHtml(cur, action){
  return '<div class="goal-kinds">'+GOAL_KINDS.map(function(k){
    const t = GOAL_TRACKERS[k];
    return '<button class="goal-kind'+(cur===k?' is-on':'')+'" data-action="'+action+'" data-id="'+k+'">'+(t ? t.icon+' '+t.label : '&#9997;&#65039; Something else')+'</button>';
  }).join('')+'</div>';
}
function goalFieldsHtml(prefix, kind, g){
  g = g || {};
  const t = GOAL_TRACKERS[kind];
  const v = function(x){ return x!=null && x!=='' ? escapeHtml(String(x)) : ''; };
  const placeholder = {mrr:String(state.profile.revenueGoalMonthly||10000), weight:String(state.profile.goalWeight||180), workouts:String(state.profile.weeklyWorkoutTarget||4), hours:'20', streak:'30', clients:'10', custom:'10000'}[kind];
  return '<div class="grid grid-3" style="margin-top:12px;">'+
      '<div class="field"><label>Target'+(t ? ' ('+t.unit+')' : '')+'</label><input class="input" type="number" step="any" id="'+prefix+'Target" value="'+v(g.target)+'" placeholder="'+placeholder+'"></div>'+
      (t && t.periods
        ? '<div class="field"><label>Counted</label><select class="input" id="'+prefix+'Period">'+[['week','Every week'],['month','Every month'],['all','In total, from today']].map(function(o){ return '<option value="'+o[0]+'"'+((g.period||'week')===o[0]?' selected':'')+'>'+o[1]+'</option>'; }).join('')+'</select></div>'
        : !t ? '<div class="field"><label>Unit</label><input class="input" id="'+prefix+'Unit" value="'+v(g.unit)+'" placeholder="followers, $, reels…"></div>'
        : '<div class="field"><label>Right now</label><div class="goal-now">'+goalNowText(kind)+'</div></div>')+
      '<div class="field"><label>By when (optional)</label><input class="input" type="date" id="'+prefix+'Deadline" value="'+v(g.deadline)+'"></div>'+
    '</div>'+
    (!t ? '<div class="grid grid-2" style="margin-top:10px;"><div class="field"><label>Where you are now</label><input class="input" type="number" step="any" id="'+prefix+'Current" value="'+v(g.current)+'" placeholder="0"></div></div>' : '')+
    '<div class="field" style="margin-top:10px;"><label>Name it (optional)</label><input class="input" id="'+prefix+'Label" value="'+v(g.label)+'" placeholder="'+(t ? escapeHtml(t.name({target:Number(placeholder), period:g.period||'week'})) : 'e.g. 10k IG followers')+'" style="width:100%;"></div>'+
    (t ? '<div class="kpi-sub" style="margin-top:8px;">&#9889; Fills in by itself '+escapeHtml(t.src)+'.</div>' : '<div class="kpi-sub" style="margin-top:8px;">For things Operator can\'t see — you update the number yourself.</div>');
}
function goalNowText(kind){
  if(kind==='mrr') return '$'+fmtGoalNum(activeMrr())+'/mo';
  if(kind==='weight'){ const w = latestWeight(); return w!=null ? w+' lbs' : 'log your weight'; }
  if(kind==='streak') return computeStreak()+' days';
  if(kind==='clients') return arr(state.business.clients).filter(function(c){ return c.status==='active'; }).length+' active';
  return '';
}
function readGoalFields(prefix, kind){
  const val = function(id){ const el = document.getElementById(prefix+id); return el ? el.value.trim() : ''; };
  const out = {autoTrack: kind==='custom' ? null : kind, label: val('Label'), target: Number(val('Target')) || null, deadline: val('Deadline') || null};
  if(GOAL_TRACKERS[kind] && GOAL_TRACKERS[kind].periods) out.period = val('Period') || 'week';
  if(kind==='custom'){ out.unit = val('Unit'); const c = Number(val('Current')); out.current = isNaN(c) ? 0 : c; }
  else out.unit = GOAL_TRACKERS[kind].unit;
  return out;
}
// ---- editing ----
function openGoalEditModal(id){
  ui.editingGoalId = id;
  const g = state.goals.items.find(function(x){ return x.id===id; });
  ui.editGoalKind = g ? (g.autoTrack && GOAL_TRACKERS[g.autoTrack] ? g.autoTrack : 'custom') : 'custom';
  const o = document.getElementById('goalEditOverlay');
  if(!o) return;
  o.classList.remove('hidden');
  renderGoalEditModalInto();
}
function closeGoalEditModal(){ ui.editingGoalId = null; const o=document.getElementById('goalEditOverlay'); if(o) o.classList.add('hidden'); }
function renderGoalEditModal(){
  const g = state.goals.items.find(function(x){return x.id===ui.editingGoalId;});
  if(!g) return '';
  const kind = ui.editGoalKind || 'custom';
  return '<div class="section-title" style="margin-bottom:10px;">Edit Goal</div>'+
    goalFieldsHtml('editGoal', kind, g)+
    '<div class="row" style="margin-top:20px;justify-content:space-between;">'+
      deleteBtn('goal', g.id)+
      '<div class="row">'+
        '<button class="btn btn-ghost" data-action="closeGoalEditModal">Cancel</button>'+
        '<button class="btn btn-primary" data-action="saveEditGoal" data-id="'+g.id+'">Save</button>'+
      '</div>'+
    '</div>';
}
ACTIONS.editGoalKind = function(el, e, id){ ui.editGoalKind = id; renderGoalEditModalInto(); };
function renderGoalEditModalInto(){ const el=document.getElementById('goalEditContent'); if(el) morphInto(el, renderGoalEditModal(), {form:true}); }
function saveEditGoal(id){
  const g = state.goals.items.find(function(x){return x.id===id;}); if(!g) return;
  const kind = ui.editGoalKind || 'custom';
  const f = readGoalFields('editGoal', kind);
  if(f.autoTrack==='weight' && (g.autoTrack!=='weight' || g.start==null)) g.start = firstWeight();
  if(f.autoTrack && f.autoTrack!==g.autoTrack && f.period==='all') g.createdAt = todayStr();
  Object.assign(g, f);
  if(g.done && !goalIsPeriodic(g) && g.target && !goalReached(g) && g.autoTrack) g.done = false;
  if(!g.autoTrack && g.target && g.current>=g.target && !g.done){ g.done = true; playSessionComplete(); }
  closeGoalEditModal();
  persist('goals'); renderView();
}
// ---- adding ----
ACTIONS.newGoalKind = function(el, e, id){ ui.newGoalKind = id; renderView(); };
function addGoal(){
  const f = readGoalFields('newGoal', 'custom');
  if(!f.label){ showToast('Give it a name — e.g. 10k IG followers.', {icon:'&#127919;'}); return; }
  createGoal(f);
}
function createGoal(f){
  const g = Object.assign({id:uid(), label:'', done:false, target:null, current:0, unit:'', deadline:null, autoTrack:null, createdAt:todayStr()}, f);
  if(g.autoTrack==='weight') g.start = firstWeight();
  state.goals.items.push(g);
  ui.forms.newGoal = false;
  playSessionComplete();
  persist('goals'); renderView();
}
// One-tap master goals from the targets already set in Settings (revenue, goal weight, workouts a week).
function goalSuggestions(){
  const has = function(k){ return state.goals.items.some(function(g){ return g.autoTrack===k && !g.done; }); };
  const out = [];
  if(!has('mrr') && state.profile.revenueGoalMonthly) out.push({autoTrack:'mrr', target:state.profile.revenueGoalMonthly, unit:'$/mo'});
  if(!has('weight') && state.profile.goalWeight) out.push({autoTrack:'weight', target:state.profile.goalWeight, unit:'lbs'});
  if(!has('workouts') && state.profile.weeklyWorkoutTarget) out.push({autoTrack:'workouts', target:state.profile.weeklyWorkoutTarget, period:'week', unit:'workouts'});
  if(!has('hours')) out.push({autoTrack:'hours', target:Math.round((state.standards.deepWorkTargetMinutes||180)*5/60), period:'week', unit:'h'});
  if(!has('streak')) out.push({autoTrack:'streak', target:30, unit:'days'});
  return out;
}
ACTIONS.addSuggestedGoal = function(el, e, id){
  const s = goalSuggestions().find(function(x){ return x.autoTrack===id; }); if(s) createGoal(s);
};
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
  g.done = true; g.doneAt = todayStr();
  playSessionComplete();
  persist('goals'); renderView();
}
