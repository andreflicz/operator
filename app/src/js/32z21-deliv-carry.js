// ============ DELIVERABLES: WHAT YOU DID AHEAD CARRIES OVER (round 31) ============
// A reel plan of 4 a week: do 7 one week and the next week starts at 3 of 4, not 0 of 4 in red.
// Within the month, every week's extra rolls forward (spent once, not counted twice); a week that came
// up short doesn't put the next one in debt. A new month starts clean. (The first week of a month,
// if it's only part of a week, asks for its share.)
function deliverableWeekRaw(d, weekStart){
  const end = addDays(weekStart, 6), mk = thisMonthKey();
  return arr(d.completedDates).filter(function(dt){ return dt>=weekStart && dt<=end && monthKeyOf(dt)===mk; }).length;
}
function deliverableCarry(d){
  const target = d.weeklyTarget||1, ms = thisMonthKey()+'-01', wk = thisWeekKey();
  let bank = 0;
  for(let w = startOfWeekStr(ms); w < wk; w = addDays(w, 7)){
    if(d.createdAt && d.createdAt > addDays(w, 6)) continue;
    let days = 7; for(let i = 0; i < 7; i++){ if(addDays(w, i) < ms) days--; }
    const need = days===7 ? target : Math.max(0, Math.round(target*days/7));
    bank = Math.max(0, deliverableWeekRaw(d, w) + bank - need);
  }
  return bank;
}
// this week = what you did this week + what you carried in
deliverableWeekCount = function(d){
  const wk = thisWeekKey(), wkEnd = endOfWeekStr(todayStr());
  const done = arr(d.completedDates).filter(function(dt){ return dt>=wk && dt<=wkEnd; }).length;
  return done + (d.recurring===false ? 0 : deliverableCarry(d));
};
// (the pace memo is per render; carried work counts toward it the same way)
