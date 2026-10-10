// ============ PERSONAL (Goals / Fitness / Journal) ============
function renderPersonal(){
  if(ui.personalTab==='vision' || ui.personalTab==='milanote'){ ui.personalTab = 'journal'; ui.journalMode = 'boards'; }
  return '<div class="view-header"><div>'+businessNameTagHtml()+'<div class="view-title">Personal'+tip('Goals first, then body, then the running log of what\'s on your mind — journal entries and boards, including your vision board.')+'</div></div></div>'+
  '<div class="tabs">'+
    '<div class="tab '+(ui.personalTab==='you'?'active':'')+'" data-action="personalTab" data-tab="you">You</div>'+
    '<div class="tab '+(ui.personalTab==='goals'?'active':'')+'" data-action="personalTab" data-tab="goals">Goals</div>'+
    '<div class="tab '+(ui.personalTab==='fitness'?'active':'')+'" data-action="personalTab" data-tab="fitness">Health</div>'+
    '<div class="tab '+(ui.personalTab==='journal'?'active':'')+'" data-action="personalTab" data-tab="journal">Journal</div>'+
    '<div class="tab '+(ui.personalTab==='wishlist'?'active':'')+'" data-action="personalTab" data-tab="wishlist">Wish List</div>'+
  '</div>'+
  '<div class="tab-panel" data-key="personal-'+ui.personalTab+'">'+(ui.personalTab==='you' && typeof renderYouTab==='function' ? renderYouTab() : ui.personalTab==='goals' ? renderGoalsTab() : ui.personalTab==='fitness' ? renderFitness() : ui.personalTab==='wishlist' ? renderWishlistTab() :  renderJournalTab())+'</div>';
}

