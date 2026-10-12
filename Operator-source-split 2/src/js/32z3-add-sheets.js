// ============ ADD SHEETS: EVERY + OPENS A PROPER POP-UP ============
// Finances (an expense, income, a debt) and Training Skills get the same kind of sheet as Log it on Health:
// one card in the middle, a segmented switch on top, big friendly inputs, one button. The fields keep
// their old ids, so the same add functions do the work (and close the sheet when they're done).
function addSheetOpen(id, htmlFn, focusId){
  let o = document.getElementById(id);
  if(!o){ o = document.createElement('div'); o.id = id; o.className = 'overlay hs-ov as-ov hidden'; o.innerHTML = '<div class="card hs as" id="'+id+'Content"></div>'; document.body.appendChild(o); }
  o._html = htmlFn; o.classList.remove('hidden');
  addSheetRefresh(id);
  setTimeout(function(){ const i = document.getElementById(focusId); if(i) i.focus(); }, 60);
}
function addSheetRefresh(id){ const o = document.getElementById(id), c = document.getElementById(id+'Content'); if(o && c && !o.classList.contains('hidden') && o._html) morphInto(c, o._html(), {form:true}); }
function addSheetClose(id){ const o = document.getElementById(id); if(o) o.classList.add('hidden'); }
ACTIONS.addSheetClose = function(el){ const o = el.closest('.as-ov'); if(o) o.classList.add('hidden'); };
document.addEventListener('mousedown', function(e){ if(e.target && e.target.classList && e.target.classList.contains('as-ov')) e.target.classList.add('hidden'); });
document.addEventListener('keydown', function(e){
  const ov = e.target && e.target.closest && e.target.closest('.as-ov'); if(!ov) return;
  if(e.key==='Escape'){ ov.classList.add('hidden'); return; }
  if(e.key==='Enter' && e.target.tagName!=='TEXTAREA'){ const b = ov.querySelector('.hs-go'); if(b){ e.preventDefault(); b.click(); } }
});
const asHead = function(icon, title, sub){ return '<button class="int-x hs-x" data-action="addSheetClose" title="Close">&#10005;</button><div class="as-h"><span class="as-ic">'+icon+'</span><div><div class="hs-h">'+title+'</div>'+(sub ? '<div class="as-sub">'+sub+'</div>' : '')+'</div></div>'; };
const asMoney = function(id, ph){ return '<div class="hs-big as-money"><span class="as-cur">$</span><input class="input" type="number" step="0.01" min="0" id="'+id+'" placeholder="'+(ph||'0')+'"></div>'; };

// ---- Finances ----
function finSheetHtml(){
  const k = ui.finSheet || 'expense';
  const seg = '<div class="hs-seg">'+[['expense', '&#128184; Expense'], ['income', '&#128176; Income'], ['debt', '&#128179; Debt']].map(function(x){ return '<button class="'+(k===x[0] ? 'is-on' : '')+'" data-action="finSheetKind" data-id="'+x[0]+'">'+x[1]+'</button>'; }).join('')+'</div>';
  let body = '';
  if(k==='expense'){
    const cat = ui.finSheetCat || '';
    body = asMoney('expAmount')+
      '<input class="input hs-in" id="expName" placeholder="What was it? (e.g. Groceries at Trader Joe’s)" maxlength="80">'+
      '<div class="as-chips">'+EXP_CATS.map(function(c){ return '<button class="as-chip'+(cat===c.id ? ' is-on' : '')+'" data-action="finSheetCat" data-id="'+c.id+'">'+c.icon+' '+c.label+'</button>'; }).join('')+'</div>'+
      '<input type="hidden" id="expCat" value="'+cat+'">'+
      '<div class="hs-row"><input class="input" type="date" id="expDate" value="'+todayStr()+'"><span class="as-note">No kind picked? Operator guesses from the name.</span></div>'+
      '<button class="btn btn-good hs-go" data-action="expAdd">Add expense</button>';
  } else if(k==='income'){
    body = asMoney('incomeAmount')+
      '<input class="input hs-in" id="incomeSource" placeholder="Where it came from (a client, a sale, a paycheck)" maxlength="80">'+
      '<div class="hs-row"><input class="input" type="date" id="incomeDate" value="'+todayStr()+'"></div>'+
      '<button class="btn btn-good hs-go" data-action="addIncome">Add income</button>';
  } else {
    body = '<input class="input hs-in as-name" id="debtName" placeholder="Name it (e.g. Car loan)" maxlength="80">'+
      asMoney('debtAmount', 'Balance owed')+
      '<input class="input hs-in" id="debtCreditor" placeholder="Who it’s owed to" maxlength="80">'+
      '<textarea class="input hs-in" id="debtDescription" placeholder="What is it for? (optional)" rows="2"></textarea>'+
      '<button class="btn btn-primary hs-go" data-action="addDebt">Add debt</button>';
  }
  return asHead('&#128181;', 'Add to Finances', k==='debt' ? 'Track it here and log payments as you go.' : k==='income' ? 'Money in. It counts toward this month.' : 'Money out. It lands in Expenses.')+seg+'<div class="hs-body">'+body+'</div>';
}
function openFinSheet(kind){
  ui.finSheet = kind || ui.finSheet || 'expense'; ui.finSheetCat = '';
  addSheetOpen('finSheet', finSheetHtml, ui.finSheet==='debt' ? 'debtName' : ui.finSheet==='income' ? 'incomeAmount' : 'expAmount');
}
function closeFinSheet(){ addSheetClose('finSheet'); }
ACTIONS.finSheetKind = function(el, e, id){ openFinSheet(id); };
ACTIONS.finSheetCat = function(el, e, id){
  ui.finSheetCat = ui.finSheetCat===id ? '' : id;
  const h = document.getElementById('expCat'); if(h) h.value = ui.finSheetCat;
  document.querySelectorAll('#finSheet .as-chip').forEach(function(b){ b.classList.toggle('is-on', b.dataset.id===ui.finSheetCat); });
};
ACTIONS.openFinSheet = function(el, e, id){ openFinSheet(id); };

// ---- Training skills ----
const SKILL_GOALS = [0, 60, 120, 180, 300, 420];
function skillSheetHtml(){
  const g = ui.skillGoal==null ? 180 : ui.skillGoal, ideas = ['Meta ads', 'Video editing', 'Sales calls', 'Copywriting', 'Public speaking', 'Design'];
  return asHead('&#127919;', 'New training skill', 'Something you’re getting better at. Time it like a task and it adds up week by week.')+
    '<div class="hs-body">'+
      '<input class="input hs-in as-name" id="skillName" placeholder="What are you training? e.g. Meta ads" maxlength="80">'+
      '<div class="as-chips is-quiet">'+ideas.map(function(x){ return '<button class="as-chip" data-action="skillIdea" data-id="'+escapeHtml(x)+'">'+escapeHtml(x)+'</button>'; }).join('')+'</div>'+
      '<div class="as-lbl">Aim each week</div>'+
      '<div class="fit-durs as-goals">'+SKILL_GOALS.map(function(m){ return '<button class="fit-dur'+(g===m ? ' is-on' : '')+'" data-action="skillGoalPick" data-id="'+m+'">'+(m ? fmtDurationLabel(m) : 'No aim')+'</button>'; }).join('')+'</div>'+
      '<button class="btn hs-go as-skill-go" data-action="skillAdd">&#127919; Start training it</button>'+
    '</div>';
}
function openSkillSheet(){ ui.skillGoal = 180; addSheetOpen('skillSheet', skillSheetHtml, 'skillName'); }
ACTIONS.openSkillSheet = function(){ openSkillSheet(); };
ACTIONS.skillIdea = function(el, e, id){ const i = document.getElementById('skillName'); if(i){ i.value = id; i.focus(); } };
ACTIONS.skillGoalPick = function(el, e, id){ ui.skillGoal = Number(id); document.querySelectorAll('#skillSheet .as-goals .fit-dur').forEach(function(b){ b.classList.toggle('is-on', Number(b.dataset.id)===ui.skillGoal); }); };

// ---- the + on Focus: what do you want to add? ----
function focusAddMenu(){
  return [
    ['&#9989;', 'A task', function(){ openAddTaskModal(); }, 'Something to get done'],
    ['&#127916;', 'A video idea', function(){ openContentSheet(); }, 'Business or your own channel'],
    ['&#127919;', 'A training skill', function(){ openSkillSheet(); }, 'Something you’re getting better at']
  ];
}
