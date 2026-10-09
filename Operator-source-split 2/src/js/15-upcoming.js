// ============ UPCOMING (shared by Today panel + Calendar page) ============
function buildUpcomingList(days){
  const cutoff = addDays(todayStr(), days||14);
  const upcoming = [];
  state.tasks.items.forEach(function(t){
    if(t.deadline && t.status!=='done' && t.deadline<=cutoff && t.deadline>=todayStr()) upcoming.push({date:t.deadline, label:t.title, kind:'deadline', id:t.id});
  });
  state.calendar.events.forEach(function(e){
    if(e.date<=cutoff && e.date>=todayStr()){
      const cat = categoryById(e.categoryId);
      upcoming.push({date:e.date, label:e.title, kind:'event', id:e.id, color: cat?cat.color:'#8A90A2'});
    }
  });
  upcoming.sort(function(a,b){ return a.date.localeCompare(b.date); });
  return upcoming;
}
function renderUpcomingRow(u){
  return '<div class="task-item-v2 cal-item-clickable" data-action="openCalItem" data-kind="'+u.kind+'" data-id="'+u.id+'" title="Open"><div style="width:70px;font-family:var(--font-display);font-weight:700;">'+fmtDateShort(u.date)+'</div>'+
    (u.kind==='deadline' ? '<span class="tag" style="background:var(--danger-dim);color:var(--danger-text);">Deadline</span>' : '<span class="tag" style="background:'+u.color+'22;color:'+u.color+';">Event</span>')+
    '<div class="task-title" style="flex:1;">'+escapeHtml(u.label)+'</div></div>';
}
function openUpcomingPopover(){
  const o = document.getElementById('upcomingOverlay');
  if(!o) return;
  o.classList.remove('hidden');
  renderUpcomingPopoverInto();
}
function closeUpcomingPopover(){ const o=document.getElementById('upcomingOverlay'); if(o) o.classList.add('hidden'); }
function renderUpcomingPopover(){
  const upcoming = buildUpcomingList(14);
  return '<div class="section-title" style="margin-bottom:10px;">&#128276; Upcoming</div>'+
    '<div class="task-list">'+(upcoming.map(renderUpcomingRow).join('') || '<div class="empty">Nothing coming up in the next two weeks.</div>')+'</div>'+
    '<div class="row" style="margin-top:16px;justify-content:flex-end;">'+
      '<button class="btn btn-primary" data-action="closeUpcomingPopover">Close</button>'+
    '</div>';
}
function renderUpcomingPopoverInto(){ const el=document.getElementById('upcomingContent'); if(el) morphInto(el, renderUpcomingPopover(), {form:true}); }

