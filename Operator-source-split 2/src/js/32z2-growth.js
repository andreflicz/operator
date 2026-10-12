// ============ TRAINING SKILLS ============
// A task can be a training skill (Meta ads, editing, sales): it stays on your list like an ongoing task, you
// time it the same way, and the time adds up on Focus → Tasks → Training Skills, week by week, against the
// aim you set. Skill time also counts toward Mind. (The life side, books, walks, meditating, is on Inspiration.)
function skillTasks(){ return state.tasks.items.filter(function(t){ return t.skill && t.status!=='done'; }); }
// minutes on a task, by day, from the timing log (a task being timed right now counts too)
function taskMinutesByDay(id){
  const out = {};
  arr(state.focus.taskSegments).forEach(function(s){ if(s.taskId!==id || !s.end) return; out[s.date] = (out[s.date]||0) + Math.max(0, (s.end - s.start)/60000); });
  if(ui.currentTaskId===id && ui.currentTaskStartedAt){ const d = todayStr(); out[d] = (out[d]||0) + Math.max(0, (Date.now() - ui.currentTaskStartedAt)/60000); }
  return out;
}
function skillMinutes(id, days){ const by = taskMinutesByDay(id), t = todayStr(); let m = 0; for(let i=0;i<days;i++) m += by[addDays(t, -i)] || 0; return Math.round(m); }
// 0..1: about half an hour a day on your skills, over two weeks (null with no skills)
function skillScore(){ const sk = skillTasks(); if(!sk.length) return null; const m = sk.reduce(function(a, t){ return a + skillMinutes(t.id, 14); }, 0); return Math.min(1, m/(14*30)); }
// Focus → Tasks → Training Skills: a card for each skill, with this week against its aim and the last four weeks
function trainingSkillsHtml(){
  const sk = skillTasks(), t = todayStr();
  const bars = function(id){ const by = taskMinutesByDay(id); const wk = []; for(let k=3;k>=0;k--){ let m = 0; for(let i=0;i<7;i++) m += by[addDays(t, -(7*k + i))] || 0; wk.push(m); } const mx = Math.max(60, Math.max.apply(null, wk));
    return '<div class="gr-bars">'+wk.map(function(m, i){ return '<i title="'+(i===3 ? 'This week' : (3-i)+' week'+(3-i===1?'':'s')+' ago')+': '+fmtDurationLabel(Math.round(m))+'"><u style="height:'+Math.max(4, m/mx*100).toFixed(0)+'%"></u></i>'; }).join('')+'</div>'; };
  const ring = function(f){ const r = 19, c = 2*Math.PI*r; return '<svg class="gr-ring" viewBox="0 0 46 46" width="46" height="46"><circle cx="23" cy="23" r="'+r+'" class="gr-ring-t"/><circle cx="23" cy="23" r="'+r+'" class="gr-ring-f" stroke-dasharray="'+(c*Math.min(1, f)).toFixed(1)+' '+c.toFixed(1)+'" transform="rotate(-90 23 23)"/></svg>'; };
  const total = sk.reduce(function(a, x){ return a + skillMinutes(x.id, 7); }, 0);
  return '<div class="gr">'+
    '<div class="gr-top"><div class="gr-top-t"><span class="gr-top-ic">&#127919;</span><div><b>Training Skills</b><small>What you’re getting better at. Time it like any task; it adds up here and counts toward Mind.</small></div></div>'+
      (sk.length ? '<div class="gr-top-n"><b>'+fmtDurationLabel(total)+'</b><small>this week</small></div>' : '')+'</div>'+
    (sk.length ? '<div class="gr-skills">'+sk.map(function(x){ const wk = skillMinutes(x.id, 7), on = ui.currentTaskId===x.id, aim = Number(x.skillGoal)||0;
      return '<div class="gr-skill'+(on ? ' is-on' : '')+'"><div class="gr-sk-h">'+(aim ? ring(wk/aim) : '<span class="gr-sk-ic">&#127919;</span>')+'<div class="gr-sk-tt"><b>'+escapeHtml(x.title)+'</b><small>'+(on ? '<span class="gr-live">&#9679; training now</span>' : aim ? fmtDurationLabel(wk)+' of '+fmtDurationLabel(aim)+' this week' : fmtDurationLabel(wk)+' this week')+'</small></div></div>'+
        bars(x.id)+
        '<div class="gr-sk-n"><span>Last 4 weeks</span><span>'+fmtDurationLabel(Math.round(x.trackedMinutes||0))+' in all</span></div>'+
        '<div class="gr-sk-a">'+(on ? '<button class="btn btn-sm" data-action="releaseCurrentTask">Stop</button>' : '<button class="btn btn-sm gr-go" data-action="skillStart" data-id="'+x.id+'">&#9654; Train</button>')+'<button class="btn btn-ghost btn-sm" data-action="openTaskEditModal" data-id="'+x.id+'">Edit</button></div></div>'; }).join('')+'</div>'
      : '<div class="gr-empty"><span>&#127919;</span><b>No training skills yet</b><small>The + in the corner adds one, or tick <b>Training skill</b> on any task.</small><button class="btn gr-go" data-action="openSkillSheet">Add a training skill</button></div>')+
  '</div>';
}
// the life side, this week (lives on Inspiration now): books, meditating, walks and the rest
const LIFE_KINDS = [['read', '&#128214;', 'Reading'], ['meditate', '&#129496;', 'Meditating'], ['walk', '&#128694;', 'Walks'], ['journal', '&#9997;&#65039;', 'Writing'], ['inspire', '&#127916;', 'Inspiring'], ['unplug', '&#128245;', 'No phone']];
function lifeWeek(){
  const s = typeof inspStore==='function' ? inspStore() : {log:[]}, weekStart = addDays(todayStr(), -6);
  return LIFE_KINDS.map(function(k){ const xs = s.log.filter(function(x){ return (x.act===k[0] || (k[0]==='walk' && /^place/.test(x.act))) && x.date >= weekStart; }); return {id:k[0], e:k[1], label:k[2], n:xs.length, min:xs.reduce(function(a, x){ return a + (x.min||0); }, 0)}; });
}
ACTIONS.skillAdd = function(){
  const el = document.getElementById('skillName'), name = el ? el.value.trim() : ''; if(!name){ if(el) el.focus(); return; }
  state.tasks.items.push({id:uid(), title:name.slice(0, 120), status:'backlog', priority:'med', clients:['personal'], client:'personal', skill:true, skillGoal:ui.skillGoal==null ? 0 : ui.skillGoal, ongoing:true, ongoingDoneDates:[], trackedMinutes:0, createdAt:todayStr()});
  ui.forms.skill = false; if(typeof addSheetClose==='function') addSheetClose('skillSheet'); persist('tasks'); playPositive(); renderView();
  showToast('Training skill added: '+name.slice(0, 40)+'.', {icon:'&#127919;'});
};
ACTIONS.skillStart = function(el, e, id){ const t = state.tasks.items.find(function(x){ return x.id===id; }); if(!t) return; if(t.status==='backlog'){ t.status = 'today'; persist('tasks'); } setCurrentTask(id); };
