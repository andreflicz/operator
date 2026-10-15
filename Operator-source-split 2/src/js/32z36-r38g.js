// ============ ROUND 38g ============
// • Clock out → Plan of attack: it starts from your list as it is right now (every task on today that
//   isn't done, plus this week's client deliverables, the Reels and so on), not an old saved plan or the
//   first six. Anything you'd already picked for tomorrow stays, in your order, on top.

function windActiveIds(){
  const items = state.tasks.items.filter(function(t){
    if(t.status==='done' || isOngoingDoneToday(t)) return false;
    if(t.status==='today') return true;
    return !!(t.master && t.master.kind==='dvw' && t.status==='backlog' && typeof dvwIsNow==='function' && dvwIsNow(t));
  });
  const today = lineupOrdered(items.filter(function(t){ return t.status==='today'; }));
  const dv = items.filter(function(t){ return t.status!=='today'; });
  return today.concat(dv).map(function(t){ return t.id; });
}
openWindDown = (function(base){
  return function(){
    const r = base.apply(this, arguments);
    if(ui.wind){
      const np = state.focus.nightPlan && state.focus.nightPlan.date===ui.wind.target ? arr(state.focus.nightPlan.taskIds).filter(windTask) : [];
      const plan = np.slice();
      windActiveIds().forEach(function(id){ if(plan.indexOf(id) < 0) plan.push(id); });
      ui.wind.plan = plan;
      renderWindInto();
    }
    return r;
  };
})(openWindDown);

// ---- Today: the day streak, bigger and out of its pill (a line under it says where today stands) ----
streakWorkHtml = (function(base){
  return function(o){
    let h = base.apply(this, arguments);
    if(h.indexOf('is-r38') < 0) return h;
    const s = computeStreak(), ok = dayStandardsComplete(todayStr());
    const sub = ok ? 'Today’s in the bag' : s > 0 ? 'Keep it alive today' : 'Start one today';
    h = h.replace(/days?<br>streak<\/span>/, 'day streak</span><small class="sw-ss'+(ok ? ' is-ok' : '')+'">'+sub+'</small>');
    return h.replace(/<span class="streak-ok"[^>]*>&#10003;<\/span>/, '');
  };
})(streakWorkHtml);
