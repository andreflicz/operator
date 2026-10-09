
// ============ LOCKED IN: YOUR LAYOUT ============
// The locked-in page is a stack of blocks you arrange yourself: Customize → move blocks up or
// down, hide them, or add ones that aren't there (Journal, Goals, This week, Your why…). The
// timer can move but never hides. Two half-width blocks next to each other share a row.
const LOCKED_BLOCKS = {
  stats:     {label:'Streak, tasks & deep work', render:function(c){ return '<div class="grid grid-3 stat-chip-row" style="max-width:800px;margin:0 auto;">'+
      '<div class="stat-chip" style="text-align:center;"><div class="stat-chip-label">Day Streak</div><div class="stat-chip-value">'+computeStreak()+'</div><div class="kpi-sub">rest days still count</div></div>'+
      '<div class="stat-chip" data-action="goToFinishedTasks" style="text-align:center;cursor:pointer;"><div class="stat-chip-label">Completed Today</div><div class="stat-chip-value">'+c.doneToday.length+' task'+(c.doneToday.length===1?'':'s')+'</div></div>'+
      '<div class="stat-chip" id="statDeepWorkTodayBox" style="text-align:center;"><div class="stat-chip-label">Deep Work Today</div><div class="stat-chip-value">'+fmtHours(c.deepWorkToday)+'</div><div class="kpi-sub">'+fmtDurationLabel(c.deepWorkToday)+'</div></div>'+
    '</div>'; }},
  timer:     {label:'Timer & current task', pinned:true, render:function(){ return '<div class="hero-row">'+renderActiveFocusHero(true)+renderCurrentTaskCard(false,false,true)+'</div>'; }},
  vision:    {label:'Vision board', render:function(){ return renderVisionSlideshow(); }},
  standards: {label:'Today\'s Standard', render:function(){ return renderStandardsWidget(); }},
  calendar:  {label:'Today on the calendar', render:function(c){
      if(!c.todayNotices.length) return lockedEditing() ? '<div class="empty" style="max-width:640px;margin:0 auto;">Nothing on the calendar today.</div>' : '';
      return '<div style="max-width:640px;margin:0 auto;"><div class="section-title" style="justify-content:center;">Today on the Calendar</div><div class="card"><div class="task-list">'+
        c.todayNotices.map(function(n){
          return '<div class="task-item-v2 cal-item-clickable" data-action="openCalItem" data-kind="'+n.kind+'" data-id="'+n.id+'">'+
            (n.kind==='deadline' ? '<span class="tag" style="background:var(--danger-dim);color:var(--danger-text);">Deadline</span>' : '<span class="tag" style="background:'+n.color+'22;color:'+n.color+';">'+(n.time?fmt12Hour(n.time):'Event')+'</span>')+
            '<div class="task-title" style="flex:1;">'+escapeHtml(n.label)+'</div>'+
          '</div>';
        }).join('')+'</div></div></div>'; }},
  reachout:  {label:'Reach out', render:function(){ return '<div style="max-width:900px;margin:0 auto;">'+renderReachOutPanel(true)+'</div>'; }},
  backlog:   {label:'Worth doing soon', half:true, render:function(c){ return '<div><div class="section-title" style="justify-content:center;">Worth Doing Soon<span class="kpi-sub" style="margin-left:8px;">&middot; '+c.backlog.length+' waiting</span></div><div class="card" style="max-height:600px;overflow-y:auto;"><div class="task-list">'+(c.backlog.map(focusModeBacklogRow).join('') || '<div class="empty">Backlog is empty.</div>')+'</div></div></div>'; }},
  clients:   {label:'Clients', half:true, render:function(c){ return '<div><div class="section-title" style="justify-content:center;">Clients<span class="kpi-sub" style="margin-left:8px;">&middot; '+c.activeClients.length+' active</span></div><div class="task-list" style="display:flex;flex-direction:column;gap:12px;max-height:600px;overflow-y:auto;">'+(c.activeClients.length ? c.activeClients.map(function(x){ return renderClientHealthCard(x); }).join('') : '<div class="empty">No active clients yet.</div>')+'</div></div>'; }},
  journal:   {label:'Quick journal', render:function(){ return '<div style="max-width:900px;margin:0 auto;">'+renderJournalPanel()+'</div>'; }},
  goals:     {label:'Goals', render:function(){ return '<div style="max-width:1100px;margin:0 auto;">'+renderGoalsPanel()+'</div>'; }},
  week:      {label:'This week', render:function(){ return '<div style="max-width:1100px;margin:0 auto;">'+renderProgressPanel()+'</div>'; }},
  why:       {label:'Your why', render:function(){ return '<div style="max-width:1000px;margin:0 auto;">'+renderWhyPanel()+'</div>'; }},
  tasks:     {label:'Today\'s tasks', render:function(){ return '<div style="max-width:1100px;margin:0 auto;">'+renderTodayTasksPanel()+'</div>'; }}
};
const LOCKED_DEFAULT = ['stats', 'timer', 'vision', 'standards', 'calendar', 'reachout', 'backlog', 'clients'];
function lockedLayout(){
  const saved = state.profile.lockedLayout;
  const order = (saved && Array.isArray(saved.order) ? saved.order : LOCKED_DEFAULT).filter(function(id){ return LOCKED_BLOCKS[id]; });
  if(order.indexOf('timer')<0) order.unshift('timer');
  return order;
}
function lockedEditing(){ return !!ui.lockedEdit; }
function saveLockedLayout(order){ state.profile.lockedLayout = {order:order}; persist('profile'); renderView(); }
function lockedLayoutToolbarHtml(){
  return '<div class="ll-bar"><button class="ll-btn'+(lockedEditing()?' is-on':'')+'" data-action="toggleLockedEdit" title="Choose what\'s on this page">'+(lockedEditing() ? '&#10003; Done' : '&#9998; Customize')+'</button></div>';
}
function lockedBlocksHtml(c){
  const order = lockedLayout(), editing = lockedEditing();
  let out = '', i = 0;
  const wrap = function(id, inner, idx){
    if(!editing) return inner ? '<div class="ll-block section" data-key="ll-'+id+'">'+inner+'</div>' : '';
    const b = LOCKED_BLOCKS[id];
    return '<div class="ll-block section is-editing" data-key="ll-'+id+'">'+
      '<div class="ll-head"><span class="ll-name">'+b.label+'</span>'+
        '<button class="ll-ctl" data-action="lockedMove" data-id="'+id+'" data-dir="-1" title="Move up"'+(idx===0?' disabled':'')+'>&#8593;</button>'+
        '<button class="ll-ctl" data-action="lockedMove" data-id="'+id+'" data-dir="1" title="Move down"'+(idx===order.length-1?' disabled':'')+'>&#8595;</button>'+
        (b.pinned ? '' : '<button class="ll-ctl ll-hide" data-action="lockedHide" data-id="'+id+'" title="Take it off this page">&#10005;</button>')+
      '</div>'+(inner || '<div class="empty">Nothing to show right now.</div>')+'</div>';
  };
  while(i < order.length){
    const id = order[i], b = LOCKED_BLOCKS[id];
    if(!editing && b.half && order[i+1] && LOCKED_BLOCKS[order[i+1]].half){
      out += '<div class="section grid grid-2" style="max-width:1200px;margin:32px auto 0;align-items:start;">'+b.render(c)+LOCKED_BLOCKS[order[i+1]].render(c)+'</div>';
      i += 2; continue;
    }
    out += wrap(id, b.render(c), i); i++;
  }
  if(editing){
    const hidden = Object.keys(LOCKED_BLOCKS).filter(function(id){ return order.indexOf(id)<0; });
    out += '<div class="ll-tray"><span class="kind-label" style="margin:0;">Add to this page</span>'+
      (hidden.length ? hidden.map(function(id){ return '<button class="ll-add" data-action="lockedAdd" data-id="'+id+'">+ '+LOCKED_BLOCKS[id].label+'</button>'; }).join('') : '<span class="kpi-sub">Everything\'s already here.</span>')+
      '<button class="btn btn-ghost btn-sm" data-action="lockedReset" style="margin-left:auto;">Reset to default</button></div>';
  }
  return out;
}
ACTIONS.toggleLockedEdit = function(){ ui.lockedEdit = !ui.lockedEdit; renderView(); };
ACTIONS.lockedMove = function(el, e, id){
  const order = lockedLayout(), i = order.indexOf(id), j = i + Number(el.dataset.dir);
  if(i<0 || j<0 || j>=order.length) return;
  order.splice(i, 1); order.splice(j, 0, id); saveLockedLayout(order);
};
ACTIONS.lockedHide = function(el, e, id){ if(LOCKED_BLOCKS[id] && LOCKED_BLOCKS[id].pinned) return; saveLockedLayout(lockedLayout().filter(function(x){ return x!==id; })); };
ACTIONS.lockedAdd = function(el, e, id){ const o = lockedLayout(); if(o.indexOf(id)<0) o.push(id); saveLockedLayout(o); };
ACTIONS.lockedReset = function(){ state.profile.lockedLayout = null; persist('profile'); renderView(); };
