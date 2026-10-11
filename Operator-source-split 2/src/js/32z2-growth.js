// ============ GROWTH: SKILLS AND WHAT FEEDS YOUR HEAD ============
// A task can be a skill (Meta ads, editing, sales): it stays on your list like an ongoing task, you time
// it the same way, and the time adds up here, week by week. Under it, the life side, from Inspiration:
// books, meditating, walks and the rest. Personal → Growth. Skill time also counts toward Mind.
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
function growthHtml(){
  const sk = skillTasks(), t = todayStr(), s = typeof inspStore==='function' ? inspStore() : {log:[]};
  const weekStart = addDays(t, -6);
  const lifeKinds = [['read', '&#128214;', 'Reading'], ['meditate', '&#129496;', 'Meditating'], ['walk', '&#128694;', 'Walks'], ['journal', '&#9997;&#65039;', 'Writing'], ['inspire', '&#127916;', 'Inspiring things'], ['unplug', '&#128245;', 'No-phone hours']];
  const lifeOf = function(id){ const xs = s.log.filter(function(x){ return (x.act===id || (id==='walk' && /^place/.test(x.act))) && x.date >= weekStart; }); return {n:xs.length, min:xs.reduce(function(a, x){ return a + (x.min||0); }, 0)}; };
  const bars = function(id){ const by = taskMinutesByDay(id); const wk = []; for(let k=3;k>=0;k--){ let m = 0; for(let i=0;i<7;i++) m += by[addDays(t, -(7*k + i))] || 0; wk.push(m); } const mx = Math.max(60, Math.max.apply(null, wk));
    return '<div class="gr-bars">'+wk.map(function(m, i){ return '<i title="'+(i===3 ? 'This week' : (3-i)+' week'+(3-i===1?'':'s')+' ago')+': '+fmtDurationLabel(Math.round(m))+'"><u style="height:'+Math.max(4, m/mx*100).toFixed(0)+'%"></u></i>'; }).join('')+'</div>'; };
  const insp = typeof inspRate==='function' ? inspRate() : null;
  return '<div class="gr">'+
    '<div class="section"><div class="section-title">Skills'+tip('Any task can be a skill (in its editor, tick Skill). It stays on your list; time it like any task and it adds up here. Half an hour a day on your skills is the aim, and it counts toward Mind.')+'</div>'+
      (ui.forms.skill ? '<div class="card gr-new"><input class="input" id="skillName" placeholder="A skill you’re building, e.g. Meta ads" maxlength="80"><button class="btn btn-primary" data-action="skillAdd">Add skill</button><button class="btn btn-ghost" data-action="toggleForm" data-form="skill">Close</button></div>' : '')+
      (sk.length ? '<div class="gr-skills">'+sk.map(function(x){ const wk = skillMinutes(x.id, 7), on = ui.currentTaskId===x.id;
        return '<div class="gr-skill'+(on ? ' is-on' : '')+'"><div class="gr-sk-h"><b>'+escapeHtml(x.title)+'</b>'+(on ? '<span class="gr-live">&#9679; timing</span>' : '')+'</div>'+
          '<div class="gr-sk-n"><span><b>'+fmtDurationLabel(wk)+'</b> this week</span><span>'+fmtDurationLabel(Math.round(x.trackedMinutes||0))+' in all</span></div>'+bars(x.id)+
          '<div class="gr-sk-a">'+(on ? '<button class="btn btn-sm" data-action="releaseCurrentTask">Stop</button>' : '<button class="btn btn-sm btn-primary" data-action="skillStart" data-id="'+x.id+'">&#9654; Work on it</button>')+'<button class="btn btn-ghost btn-sm" data-action="openTaskEditModal" data-id="'+x.id+'">Edit</button></div></div>'; }).join('')+'</div>'
        : '<div class="card gr-empty">No skills yet. The + in the corner adds one, or tick <b>Skill</b> on any task.</div>')+
    '</div>'+
    '<div class="section"><div class="section-title">For your head, this week<button class="gr-insp" data-action="openInspire">&#10023; Inspiration'+(insp!=null ? ' <b>'+insp+'</b>' : '')+'</button></div>'+
      '<div class="gr-life">'+lifeKinds.map(function(k){ const v = lifeOf(k[0]); return '<div class="gr-l'+(v.n ? '' : ' is-zero')+'"><span>'+k[1]+'</span><b>'+v.n+'</b><small>'+k[2]+(v.min ? ' · '+fmtDurationLabel(v.min) : '')+'</small></div>'; }).join('')+'</div>'+
    '</div>'+
  '</div>';
}
ACTIONS.skillAdd = function(){
  const el = document.getElementById('skillName'), name = el ? el.value.trim() : ''; if(!name){ if(el) el.focus(); return; }
  state.tasks.items.push({id:uid(), title:name.slice(0, 120), status:'backlog', priority:'med', clients:['personal'], client:'personal', skill:true, ongoing:true, ongoingDoneDates:[], trackedMinutes:0, createdAt:todayStr()});
  ui.forms.skill = false; persist('tasks'); renderView();
};
ACTIONS.skillStart = function(el, e, id){ const t = state.tasks.items.find(function(x){ return x.id===id; }); if(!t) return; if(t.status==='backlog'){ t.status = 'today'; persist('tasks'); } setCurrentTask(id); };
