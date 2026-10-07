// ============ RESET SPECIFIC DATA ============
function resetPart(id){
  if(id==='focusSessions'){ state.focus.sessions=[]; persist('focus'); }
  if(id==='tasks'){ state.tasks={items:[]}; persist('tasks'); }
  if(id==='journal'){ state.journal={entries:[]}; persist('journal'); }
  if(id==='goals'){ state.goals={items:[]}; persist('goals'); }
  if(id==='health'){ state.health={gymLog:[],weightLog:[],calorieEntries:[]}; persist('health'); }
  if(id==='finances'){ state.finances={debts:[],payments:[],income:[],invoices:[]}; persist('finances'); }
  if(id==='business'){ state.business={pipeline:[],clients:[]}; persist('business'); }
  if(id==='calendarEvents'){ state.calendar.events=[]; persist('calendar'); }
  if(id==='standardsHistory'){ state.standards.completions=[]; persist('standards'); }
  if(id==='daysOff'){ state.daysOff={dates:[]}; persist('daysOff'); }
  if(id==='appActivity'){ state.appActivity=defaultAppActivity(); persist('appActivity'); }
  renderView();
}
function armResetPart(id){
  const key='resetpart:'+id;
  armed.add(key); renderView();
  setTimeout(function(){ if(armed.has(key)){ armed.delete(key); renderView(); } }, 3000);
}
function confirmResetPart(id){ armed.delete('resetpart:'+id); resetPart(id); }
function resetPartBtn(target){
  const key = 'resetpart:'+target.id;
  if(armed.has(key)){
    if(target.id==='journal'){
      return '<button class="btn btn-danger btn-sm" data-action="openJournalClearConfirm">Confirm?</button>';
    }
    return '<button class="btn btn-danger btn-sm" data-action="confirmResetPart" data-id="'+target.id+'">Confirm?</button>';
  }
  return '<button class="btn btn-ghost btn-sm" data-action="armResetPart" data-id="'+target.id+'">Reset</button>';
}

