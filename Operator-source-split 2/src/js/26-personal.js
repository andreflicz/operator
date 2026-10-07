// ============ PERSONAL (Goals / Fitness / Journal) ============
function renderPersonal(){
  return '<div class="view-header"><div>'+businessNameTagHtml()+'<div class="view-title">Personal</div><div class="view-sub">Goals first, then body, then the running log of what\'s on your mind.</div></div></div>'+
  '<div class="tabs">'+
    '<div class="tab '+(ui.personalTab==='goals'?'active':'')+'" data-action="personalTab" data-tab="goals">Goals</div>'+
    '<div class="tab '+(ui.personalTab==='fitness'?'active':'')+'" data-action="personalTab" data-tab="fitness">Fitness</div>'+
    '<div class="tab '+(ui.personalTab==='journal'?'active':'')+'" data-action="personalTab" data-tab="journal">Journal</div>'+
    '<div class="tab '+(ui.personalTab==='vision'?'active':'')+'" data-action="personalTab" data-tab="vision">Vision Board</div>'+
    '<div class="tab '+(ui.personalTab==='wishlist'?'active':'')+'" data-action="personalTab" data-tab="wishlist">Wish List</div>'+
  '</div>'+
  '<div class="tab-panel" data-key="personal-'+ui.personalTab+'">'+(ui.personalTab==='goals' ? renderGoalsTab() : ui.personalTab==='fitness' ? renderFitness() : ui.personalTab==='wishlist' ? renderWishlistTab() : ui.personalTab==='vision' ? renderVisionTab() : renderJournalTab())+'</div>';
}

