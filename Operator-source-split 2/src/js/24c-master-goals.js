
// ============ MASTER GOALS ============
// The big ones, always there — nothing to set up. Each reads a number the app already keeps:
//  • Revenue  — MRR from your active clients (Business)
//  • Weight   — your latest weigh-in (Health → Weight), measured from your first one
//  • Workouts — workouts logged this week (Health → Workouts)
//  • Deep work — hours locked in this week
//  • Streak   — days in a row you've hit Today's Standard
// Targets are the ones in Settings (revenue, goal weight, workouts a week) plus two of their own;
// tap a target to change it right here. Anything the app can't see (IG followers, a first
// sponsor deal) goes under Your goals, which you update yourself.
function masterGoalDefs(){
  const p = state.profile;
  const deepTarget = p.weeklyDeepHoursGoal || Math.round((state.standards.deepWorkTargetMinutes||180)*5/60);
  const w = latestWeight(), w0 = firstWeight();
  const ws = startOfWeekStr(todayStr());
  const wk = sumOverDays(ws, todayStr(), function(d){ return workoutDay(d).n; });
  const deepMin = sumOverDays(ws, todayStr(), function(d){ return d===todayStr() ? deepWorkMinutesTodayLive() : deepWorkMinutesFor(d); });
  const active = arr(state.business.clients).filter(function(c){ return c.status==='active'; }).length;
  return [
    {key:'mrr', icon:'&#128176;', label:'Monthly revenue', cur:activeMrr(), target:p.revenueGoalMonthly||0, field:'revenueGoalMonthly', fmt:function(n){ return '$'+fmtGoalNum(n); }, suffix:'/mo',
      src:active+' active client'+(active===1?'':'s'), go:'goToClients', color:'#3FBE8E', color2:'#8fe3c2'},
    {key:'weight', icon:'&#9878;&#65039;', label:'Body weight', cur:w, start:w0, target:p.goalWeight, field:'goalWeight', fmt:function(n){ return fmtGoalNum(n); }, suffix:' lbs',
      src: w==null ? 'log a weigh-in in Health' : 'from '+fmtGoalNum(w0)+' lbs', go:'goToWeight', color:'#5BB4E5', color2:'#a9dcf7'},
    {key:'workouts', icon:'&#127947;&#65039;', label:'Workouts this week', cur:wk, target:p.weeklyWorkoutTarget||0, field:'weeklyWorkoutTarget', fmt:function(n){ return fmtGoalNum(n); }, suffix:'',
      src:'logged in Health', go:'goToFitness', color:'#E8A23D', color2:'#f5cf8e'},
    {key:'deep', icon:'&#9201;&#65039;', label:'Deep work this week', cur:Math.round(deepMin/6)/10, target:deepTarget, field:'weeklyDeepHoursGoal', fmt:function(n){ return fmtGoalNum(n)+'h'; }, suffix:'',
      src:'hours locked in', go:'goToAnalytics', color:'#B39DDB', color2:'#ddd0f3'},
    {key:'streak', icon:'&#128293;', label:'Days in a row', cur:computeStreak(), target:p.streakGoal||30, field:'streakGoal', fmt:function(n){ return fmtGoalNum(n); }, suffix:' days',
      src:'Today\'s Standard', go:null, color:'#FF7A45', color2:'#ffc0a3'}
  ];
}
function masterPct(m){
  if(m.cur==null || !(m.target>0)) return 0;
  if(m.key==='weight'){
    if(m.start==null || m.start===m.target) return m.cur===m.target ? 100 : 0;
    return clamp((m.start-m.cur)/(m.start-m.target)*100, 0, 100);
  }
  return clamp(m.cur/m.target*100, 0, 100);
}
function masterToGo(m){
  if(m.cur==null) return '';
  if(!(m.target>0)) return 'set a target';
  if(m.key==='weight'){ const d = Math.abs(m.cur-m.target); return masterPct(m)>=100 || d<0.05 ? 'reached' : fmtGoalNum(d)+' lbs to go'; }
  const left = m.target-m.cur;
  if(left<=0) return m.key==='mrr' ? 'reached — raise the bar' : 'hit';
  return m.fmt(Math.round(left*10)/10)+(m.key==='mrr'?'/mo':'')+' to go';
}
function ringSvg(pct, c1, c2, id, size){
  size = size || 112; const r = size/2 - 8, C = 2*Math.PI*r, off = C*(1-pct/100);
  return '<svg class="mg-ring-svg" viewBox="0 0 '+size+' '+size+'" width="'+size+'" height="'+size+'">'+
    '<defs><linearGradient id="mgg-'+id+'" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="'+c2+'"/><stop offset="1" stop-color="'+c1+'"/></linearGradient></defs>'+
    '<circle cx="'+size/2+'" cy="'+size/2+'" r="'+r+'" fill="none" style="stroke:rgba(var(--ink),.07)" stroke-width="9"/>'+
    '<circle cx="'+size/2+'" cy="'+size/2+'" r="'+r+'" fill="none" stroke="url(#mgg-'+id+')" stroke-width="9" stroke-linecap="round" stroke-dasharray="'+C.toFixed(1)+'" stroke-dashoffset="'+off.toFixed(1)+'" transform="rotate(-90 '+size/2+' '+size/2+')" class="mg-ring-arc"/>'+
  '</svg>';
}
function masterTargetHtml(m){
  if(ui.editMaster===m.key){
    return '<span class="mg-edit"><input class="input mg-edit-in" id="mgEdit-'+m.key+'" type="number" step="any" value="'+(m.target!=null?m.target:'')+'" placeholder="target"><button class="btn btn-primary btn-sm" data-action="saveMasterTarget" data-id="'+m.key+'">Set</button></span>';
  }
  return '<button class="mg-target" data-action="editMasterTarget" data-id="'+m.key+'" title="Change the target">'+(m.target>0 || (m.key==='weight' && m.target!=null) ? 'goal '+m.fmt(m.target)+m.suffix : 'set a goal')+' <span class="mg-pen">&#9998;</span></button>';
}
// the money goal, front and center
function masterHeroHtml(m){
  const pct = masterPct(m);
  return '<div class="mg-hero" style="--mg1:'+m.color+';--mg2:'+m.color2+';">'+
    '<div class="mg-hero-top"><span class="mg-k">'+m.icon+' '+m.label+'</span>'+masterTargetHtml(m)+'</div>'+
    '<div class="mg-hero-num"><span class="mg-big">'+m.fmt(m.cur)+'</span><span class="mg-of">'+m.suffix+'</span><span class="mg-pct">'+Math.round(pct)+'%</span></div>'+
    '<div class="mg-bar"><div class="mg-bar-fill" style="width:'+pct.toFixed(1)+'%"></div>'+[25,50,75].map(function(t){ return '<span class="mg-tick'+(pct>=t?' is-past':'')+'" style="left:'+t+'%"></span>'; }).join('')+'</div>'+
    '<div class="mg-hero-foot"><span>'+escapeHtml(masterToGo(m))+'</span><span class="mg-src"'+(m.go?' data-action="'+m.go+'"':'')+'>'+escapeHtml(m.src)+(m.go?' &rarr;':'')+'</span></div>'+
  '</div>';
}
function masterRingHtml(m, compact){
  const pct = masterPct(m), hit = pct>=100;
  return '<div class="mg-card'+(hit?' is-hit':'')+(compact?' is-compact':'')+'"'+(compact?' data-action="nav" data-view="personal" data-tab="goals" title="Goals"':'')+' style="--mg1:'+m.color+';--mg2:'+m.color2+';">'+
    '<div class="mg-ring">'+ringSvg(pct, m.color, m.color2, m.key+(compact?'c':''), compact ? 84 : 112)+
      '<div class="mg-ring-in"><span class="mg-ring-v">'+(m.cur==null ? '—' : m.fmt(m.cur))+'</span>'+(compact ? '' : '<span class="mg-ring-pct">'+(hit ? '&#10003;' : Math.round(pct)+'%')+'</span>')+'</div>'+
    '</div>'+
    '<div class="mg-card-k">'+m.icon+' '+m.label+'</div>'+
    (compact ? '<div class="mg-card-sub">'+escapeHtml(masterToGo(m))+'</div>'
      : masterTargetHtml(m)+'<div class="mg-card-sub">'+escapeHtml(masterToGo(m))+'</div><div class="mg-src"'+(m.go?' data-action="'+m.go+'"':'')+'>'+escapeHtml(m.src)+(m.go?' &rarr;':'')+'</div>')+
  '</div>';
}
function masterGoalsHtml(compact){
  const defs = masterGoalDefs();
  // On Today it's one row of rings (the Business panel above already shows MRR big); the Goals
  // tab gets the full hero.
  if(compact) return '<div class="mg-wrap is-compact"><div class="mg-row mg-row-5">'+defs.map(function(m){ return masterRingHtml(m, true); }).join('')+'</div></div>';
  return '<div class="mg-wrap">'+masterHeroHtml(defs[0])+'<div class="mg-row">'+defs.slice(1).map(function(m){ return masterRingHtml(m, false); }).join('')+'</div></div>';
}
ACTIONS.editMasterTarget = function(el, e, id){ ui.editMaster = id; renderView(); setTimeout(function(){ const i = document.getElementById('mgEdit-'+id); if(i){ i.focus(); i.select(); } }, 30); };
ACTIONS.saveMasterTarget = function(el, e, id){
  const m = masterGoalDefs().find(function(x){ return x.key===id; }); const i = document.getElementById('mgEdit-'+id);
  if(m && i){ const raw = i.value.trim(), n = Number(raw); state.profile[m.field] = raw==='' ? (id==='weight' ? null : 0) : (isNaN(n) ? state.profile[m.field] : n); persist('profile'); playTick(); }
  ui.editMaster = null; renderView();
};
document.addEventListener('keydown', function(e){
  const t = e.target; if(!t || !t.id || t.id.indexOf('mgEdit-')!==0) return;
  if(e.key==='Enter'){ e.preventDefault(); ACTIONS.saveMasterTarget(null, null, t.id.slice(7)); }
  else if(e.key==='Escape'){ ui.editMaster = null; renderView(); }
});
ACTIONS.goToClients = function(){ ui.view='business'; ui.businessTab='clients'; renderView(); };
