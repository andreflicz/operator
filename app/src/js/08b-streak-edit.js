
// ============ STREAK EDITING ============
// Fix the streak by hand: mark individual days as counted / not counted (overrides the
// automatic standard check for that day), or set the current count outright.
function openStreakEdit(){ ui.streakEditMonthOffset = 0; showOverlay('streakEditOverlay'); renderStreakEditModalInto(); }
function renderStreakEditModal(){
  const ov = state.standards.dayOverrides || {};
  const days = []; for(let i=27;i>=0;i--) days.push(addDays(todayStr(), -i));
  const streak = computeStreak();
  return '<div class="section-title" style="margin-bottom:14px;">Edit Streak'+tip('Tap a day to cycle: automatic → counted → not counted. Rest days you marked off stay neutral.')+'</div>'+
    '<div class="streak-edit-grid">'+days.map(function(d){
      const o = ov[d];
      const auto = (function(){ const save = ov[d]; delete ov[d]; const r = dayStandardsComplete(d); if(save) ov[d]=save; return r; })();
      const effective = o==='done' ? true : o==='missed' ? false : auto;
      const off = isDayOff(d);
      return '<button class="streak-edit-day'+(effective?' is-done':'')+(o?' is-override':'')+(off&&!effective?' is-off':'')+(d===todayStr()?' is-today':'')+'" data-action="cycleStreakDay" data-id="'+d+'" title="'+(o?'Manually '+(o==='done'?'counted':'not counted'):'Automatic')+'">'+
        '<span class="sed-dow">'+weekdayShort(d).slice(0,2)+'</span><span class="sed-num">'+Number(d.slice(8))+'</span>'+(o?'<span class="sed-pin">&#9679;</span>':'')+
      '</button>';
    }).join('')+'</div>'+
    '<div class="card" style="margin-top:14px;padding:14px;">'+
      '<div class="row" style="align-items:flex-end;gap:10px;">'+
        '<div class="field"><label>Current streak</label><input class="input" type="number" min="0" id="streakSetCount" value="'+streak+'" style="width:110px;"></div>'+
        '<button class="btn btn-sm" data-action="setStreakCount">Set count</button>'+
        (state.standards.streakBase ? '<button class="btn btn-ghost btn-sm" data-action="clearStreakBase">Back to automatic</button>' : '')+
      '</div>'+
      (state.standards.streakBase ? '<div class="kpi-sub" style="margin-top:8px;">Anchored: '+state.standards.streakBase.count+' days as of '+fmtDateShort(state.standards.streakBase.date)+'. New days add on top.</div>' : '')+
    '</div>'+
    '<div class="row" style="margin-top:18px;justify-content:flex-end;"><button class="btn btn-primary" data-action="closeStreakEdit">Done</button></div>';
}
function renderStreakEditModalInto(){ const el=document.getElementById('streakEditContent'); if(el) morphInto(el, renderStreakEditModal(), {form:true}); }
registerModal('streakEditOverlay', renderStreakEditModalInto);
ACTIONS.openStreakEdit = openStreakEdit;
ACTIONS.closeStreakEdit = function(){ hideOverlay('streakEditOverlay'); renderView(); };
ACTIONS.cycleStreakDay = function(el, e, d){
  const ov = state.standards.dayOverrides || (state.standards.dayOverrides = {});
  ov[d] = !ov[d] ? 'done' : ov[d]==='done' ? 'missed' : undefined;
  if(!ov[d]) delete ov[d];
  playTick();
  persist('standards'); renderView();
};
ACTIONS.setStreakCount = function(){
  const el = document.getElementById('streakSetCount');
  const n = Math.max(0, Math.round(Number(el && el.value)||0));
  // Anchor on the most recent day that currently starts the count: today if it already
  // counts (or is a day off), otherwise yesterday — so finishing today adds 1 on top.
  const t = todayStr();
  const anchor = (dayStandardsComplete(t) || isDayOff(t)) ? t : addDays(t,-1);
  state.standards.streakBase = {date:anchor, count:n};
  playPositive();
  persist('standards'); renderView();
};
ACTIONS.clearStreakBase = function(){ state.standards.streakBase = null; persist('standards'); renderView(); };
