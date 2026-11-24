// ============ ADDING A GOAL, AND WHAT IT'S WORTH ============
// One sheet for every kind of goal: this week, this month, or one of your own (long-term, with a number
// to hit). Op sizes each goal up when you add it and sets its XP, so the XP is consistent and scales with
// how hard the goal really is: a weekly goal 75 to 300, a monthly one 250 to 1,000, your own 200 to
// 10,000. Without a key it's the usual amount (150 / 500 / 500). Master goals scale by their size (32t).
const GOAL_XP_BAND = {week:[75, 300, 150], month:[250, 1000, 500], long:[200, 10000, 500]};
function openGoalSheet(kind){
  ui.gsKind = kind==='month' || kind==='long' ? kind : 'week';
  let o = document.getElementById('goalSheet');
  if(!o){ o = document.createElement('div'); o.id = 'goalSheet'; o.className = 'overlay gs-ov hidden'; o.innerHTML = '<div class="card gs" id="goalSheetContent"></div>'; document.body.appendChild(o); }
  o.classList.remove('hidden'); goalSheetRefresh();
  setTimeout(function(){ const i = document.getElementById('gsLabel'); if(i) i.focus(); }, 60);
}
function closeGoalSheet(){ const o = document.getElementById('goalSheet'); if(o) o.classList.add('hidden'); }
// it closes when you go somewhere else
afterRenderHooks.push(function(){ const k = ui.view+'|'+(ui.personalTab||''); if(ui._gsView && ui._gsView!==k) closeGoalSheet(); ui._gsView = k; });
function goalSheetRefresh(){ const c = document.getElementById('goalSheetContent'); if(c) morphInto(c, goalSheetHtml(), {form:true}); }
function goalSheetHtml(){
  const k = ui.gsKind || 'week', band = GOAL_XP_BAND[k];
  const key = k==='long' ? null : periodKey(k), gs = key ? tierGoals(k, key) : [];
  const full = key && gs.length >= 5, locked = key && checkedOut(k, key);
  const seg = '<div class="gs-seg">'+[['week', 'This week'], ['month', monthName(monthKey())], ['long', 'Long-term']].map(function(x){ return '<button class="'+(k===x[0] ? 'is-on' : '')+'" data-action="gsKind" data-id="'+x[0]+'">'+x[1]+'</button>'; }).join('')+'</div>';
  let body = '<input class="input gs-label" id="gsLabel" maxlength="140" placeholder="'+(k==='week' ? 'e.g. 20 hours of deep work' : k==='month' ? 'e.g. Sign two new clients' : 'e.g. 10k Instagram followers')+'">';
  // long-term: one the app tracks live (followers, weight, MRR…), or a number of your own
  const trk = ui.gsTrack || 'own', T = trk!=='own' ? GOAL_TRACKERS[trk] : null;
  if(k==='long') body = '<div class="gs-trk">'+GS_TRACK.map(function(x){ return '<button class="'+(trk===x ? 'is-on' : '')+'" data-action="gsTrack" data-id="'+x+'">'+(x==='own' ? '&#9998; Your own number' : GOAL_TRACKERS[x].icon+' '+GOAL_TRACKERS[x].label)+'</button>'; }).join('')+'</div>'+body;
  if(k==='long' && T){
    const now = goalLiveCurrentRaw({autoTrack:trk});
    body += '<div class="gs-row is-2"><label><span>Target ('+T.unit+')</span><input class="input" type="number" step="any" id="gsTarget" placeholder="'+(trk==='weight' ? '190' : trk==='followers' ? '10000' : trk==='mrr' ? '20000' : '10')+'"></label>'+
      '<label><span>Right now</span><div class="gs-now">'+(now==null ? (trk==='followers' ? 'Connect your social numbers first' : 'Nothing logged yet') : fmtGoalNum(now)+' '+escapeHtml(T.unit))+'</div></label></div>'+
      '<label class="gs-by"><span>By when</span><input class="input" type="date" id="gsDeadline"><em>optional</em></label>';
  }
  else if(k==='long') body +=
    '<div class="gs-row"><label><span>Target</span><input class="input" type="number" step="any" id="gsTarget" placeholder="10000"></label>'+
    '<label><span>Unit</span><input class="input" id="gsUnit" placeholder="followers"></label>'+
    '<label><span>Where you are</span><input class="input" type="number" step="any" id="gsCurrent" placeholder="0"></label></div>'+
    '<label class="gs-by"><span>By when</span><input class="input" type="date" id="gsDeadline"><em>optional</em></label>';
  const note = locked ? 'This '+(k==='month' ? 'month' : 'week')+' is checked out. Reopen it to add more.' : full ? 'That’s five already. Finish one first.' : '';
  const have = k!=='long' && gs.length ? '<div class="gs-have">'+gs.map(function(g){ return '<span class="'+(g.done ? 'is-done' : '')+'">'+(g.done ? '&#10003; ' : '')+escapeHtml(g.label)+'</span>'; }).join('')+'</div>' : '';
  return '<button class="int-x hs-x" data-action="closeGoalSheet" title="Close">&#10005;</button>'+
    '<div class="gs-h">New goal</div>'+seg+
    '<div class="gs-body">'+body+have+(note ? '<div class="gs-note">'+escapeHtml(note)+'</div>' : '')+'</div>'+
    '<div class="gs-foot"><span class="gs-xp" title="'+(k==='long' && (ui.gsTrack||'own')!=='own' ? 'The bigger the goal, the more it pays' : 'Op sizes it up when you add it')+'">&#9733; '+(k==='long' && (ui.gsTrack||'own')!=='own' ? 'Pays by size: 1,500 to 20,000 XP' : band[0].toLocaleString()+' to '+band[1].toLocaleString()+' XP')+'</span>'+
      '<button class="btn btn-primary gs-go" data-action="gsSave"'+(locked || full ? ' disabled' : '')+'>Add goal</button></div>';
}
ACTIONS.openGoalSheet = function(el, e, id){ openGoalSheet(id); };
ACTIONS.closeGoalSheet = function(){ closeGoalSheet(); };
ACTIONS.gsKind = function(el, e, id){
  const l = (document.getElementById('gsLabel')||{}).value || '';
  ui.gsKind = id; goalSheetRefresh();
  const i = document.getElementById('gsLabel'); if(i){ i.value = l; i.focus(); }
};
const GS_TRACK = ['own', 'followers', 'weight', 'mrr', 'clients', 'streak', 'avghours'];
ACTIONS.gsTrack = function(el, e, id){ const l = (document.getElementById('gsLabel')||{}).value || ''; ui.gsTrack = id; goalSheetRefresh(); const i = document.getElementById('gsLabel'); if(i) i.value = l; };
// what a big tracked goal is worth: by how big it is (the same scale as the built-in big ones)
function trackedGoalXp(kind, from, to){
  const d = Math.abs(Number(to) - Number(from||0)), cl = function(v, lo, hi){ return Math.round(Math.min(hi, Math.max(lo, v))/50)*50; };
  if(kind==='weight') return cl(d*150, 2000, 20000);
  if(kind==='mrr') return cl(d/1000*600, 2000, 20000);
  if(kind==='followers') return cl(d*0.5, 1500, 20000);
  if(kind==='clients') return cl(d*1500, 1500, 20000);
  if(kind==='streak') return cl(d*100, 1500, 15000);
  if(kind==='avghours') return cl(d*1500, 1500, 15000);
  return 2000;
}
ACTIONS.gsSave = function(){
  const k = ui.gsKind || 'week', v = function(id){ const el = document.getElementById(id); return el ? el.value.trim() : ''; };
  const tracked = k==='long' && ui.gsTrack && ui.gsTrack!=='own';
  let label = v('gsLabel'); if(!label && !tracked){ const i = document.getElementById('gsLabel'); if(i) i.focus(); return; }
  let g;
  if(k==='long' && ui.gsTrack && ui.gsTrack!=='own'){
    const kind = ui.gsTrack, target = Number(v('gsTarget'));
    if(!(target > 0)){ const t = document.getElementById('gsTarget'); if(t){ t.focus(); t.classList.add('is-bad'); } return; }
    const now = goalLiveCurrentRaw({autoTrack:kind});
    label = label || GOAL_TRACKERS[kind].name({target:target, period:'all'});
    g = {id:uid(), label:label, done:false, target:target, current:0, unit:GOAL_TRACKERS[kind].unit, deadline:v('gsDeadline') || null, autoTrack:kind, master:true, start:now, createdAt:todayStr()};
    g.xp = trackedGoalXp(kind, now, target);
    state.goals.items.push(g);
    persist('goals'); playPositive(); closeGoalSheet(); renderView();
    showToast('A new big one: '+label+' (+'+g.xp.toLocaleString()+' XP when you get there).', {icon:'&#127942;'});
    return;
  }
  if(k==='long'){
    const target = Number(v('gsTarget'));
    if(!(target > 0)){ const t = document.getElementById('gsTarget'); if(t){ t.focus(); t.classList.add('is-bad'); } showToast('Give it a number to hit (1 for a one-time thing).', {icon:'&#127919;'}); return; }
    const cur = Number(v('gsCurrent'));
    g = {id:uid(), label:label, done:false, target:target, current:isNaN(cur) ? 0 : cur, unit:v('gsUnit'), deadline:v('gsDeadline') || null, autoTrack:null, createdAt:todayStr()};
    state.goals.items.push(g);
  } else {
    const key = periodKey(k);
    if(checkedOut(k, key) || tierGoals(k, key).length >= 5) return;
    g = newTierGoal(k, key, label);
    state.goals.items.push(g);
    const store = k==='month' ? intentStore().months : intentStore().weeks; if(!store[key]) store[key] = {at:Date.now()};
    persist('journal');
  }
  g.xpPending = true;
  persist('goals'); playPositive(); closeGoalSheet(); renderView();
  opRateGoal(g);
};
document.addEventListener('keydown', function(e){
  if(e.key!=='Enter' || !e.target || !e.target.closest || !e.target.closest('#goalSheet')) return;
  e.preventDefault(); ACTIONS.gsSave();
});
// Op sizes a goal up: how hard it is for him, right now, given what he's doing. A number in the band.
async function opRateGoal(g){
  const k = g.tier || 'long', band = GOAL_XP_BAND[k];
  let xp = null, why = '';
  try{
    if(typeof aiWrite==='function'){
      const ask = 'Size up this goal for XP in my app. '+(k==='week' ? 'It is a goal for this week.' : k==='month' ? 'It is a goal for this month.' : 'It is a long-term goal'+(g.deadline ? ' by '+g.deadline : '')+'.')+
        ' Goal: "'+g.label+'"'+(g.target ? ' (target '+g.target+(g.unit ? ' '+g.unit : '')+(g.current ? ', starting at '+g.current : '')+')' : '')+'.'+
        ' Judge how hard it is for me given what you know (my numbers, my business, my habits). XP range: '+band[0]+' to '+band[1]+', a typical one is about '+band[2]+'. Easy or vague goals sit low, real stretches high.'+
        ' Reply with only JSON: {"xp": number, "why": "one short sentence"}.';
      const t = await aiWrite(ask, {max:160});
      const m = t && /\{[\s\S]*\}/.exec(t);
      if(m){ const j = JSON.parse(m[0]); if(Number(j.xp) > 0){ xp = Math.round(Math.min(band[1], Math.max(band[0], Number(j.xp)))/5)*5; why = String(j.why||'').slice(0, 160); } }
    }
  }catch(e){}
  const live = state.goals.items.find(function(x){ return x.id===g.id; }); if(!live) return;
  delete live.xpPending;
  if(xp){ live.xp = xp; live.xpWhy = why ? opNoDash(why) : ''; }
  persist('goals'); if(typeof xpLast!=='undefined') xpLast = null; renderView();
  if(xp && typeof sysNote==='function') sysNote('Op sized it up: '+live.label+' is worth +'+xp.toLocaleString()+' XP.');
}
// reopen a week or month you checked out of (by accident, or too early): the goals come back to life
ACTIONS.tierReopen = function(el, e, id){
  const kind = id==='month' ? 'month' : 'week', key = periodKey(kind), rec = periodRec(kind, key);
  if(!rec || !rec.out) return;
  delete rec.out;
  tierGoals(kind, key).forEach(function(g){ if(g.missed){ g.missed = false; } });
  delete intentStore().prompted['O'+kind+':'+key];
  persist('journal'); persist('goals'); if(typeof xpLast!=='undefined') xpLast = null; playTick(); renderView();
  showToast('The '+kind+' is open again.', {icon:'&#8634;'});
};
// ---- a new video (Content): the same kind of sheet. Business or personal, what it is, a type if you
// use them, a note. The + in the corner is the only way in (no buttons on the lanes) ----
function openContentSheet(role){
  ui.csRole = role==='personal' ? 'personal' : role==='business' ? 'business' : (ui.csRole || 'business');
  let o = document.getElementById('contentSheet');
  if(!o){ o = document.createElement('div'); o.id = 'contentSheet'; o.className = 'overlay gs-ov hidden'; o.innerHTML = '<div class="card gs" id="contentSheetContent"></div>'; document.body.appendChild(o); }
  o.classList.remove('hidden'); contentSheetRefresh();
  setTimeout(function(){ const i = document.getElementById('csTitle'); if(i) i.focus(); }, 60);
}
function closeContentSheet(){ const o = document.getElementById('contentSheet'); if(o) o.classList.add('hidden'); }
function contentSheetRefresh(){ const c = document.getElementById('contentSheetContent'); if(c) morphInto(c, contentSheetHtml(), {form:true}); }
function contentSheetHtml(){
  const r = ui.csRole || 'business', types = arr(state.tasks.videoTypes);
  return '<button class="int-x hs-x" data-action="closeContentSheet" title="Close">&#10005;</button>'+
    '<div class="gs-h">New video</div>'+
    '<div class="gs-seg">'+[['business', 'Business'], ['personal', 'Personal']].map(function(x){ return '<button class="'+(r===x[0] ? 'is-on' : '')+'" data-action="csRole" data-id="'+x[0]+'">'+x[1]+'</button>'; }).join('')+'</div>'+
    '<div class="gs-body"><input class="input gs-label" id="csTitle" maxlength="140" placeholder="'+(r==='business' ? 'e.g. Client results reel' : 'e.g. Day in the life')+'">'+
      (types.length ? '<div class="cs-types">'+types.map(function(vt){ return '<button class="cs-type'+(ui.csType===vt.id ? ' is-on' : '')+'" data-action="csType" data-id="'+vt.id+'">'+escapeHtml(vt.label)+'</button>'; }).join('')+'</div>' : '')+
      '<textarea class="input cs-notes" id="csNotes" rows="2" placeholder="Notes (optional)"></textarea></div>'+
    '<div class="gs-foot"><span class="gs-xp">&#127916; '+(r==='business' ? 'Counts toward Business content' : 'Counts toward Personal content')+'</span><button class="btn btn-primary gs-go" data-action="csSave">Add video</button></div>';
}
ACTIONS.closeContentSheet = function(){ closeContentSheet(); };
ACTIONS.csRole = function(el, e, id){ const t = (document.getElementById('csTitle')||{}).value || '', n = (document.getElementById('csNotes')||{}).value || ''; ui.csRole = id; contentSheetRefresh(); const i = document.getElementById('csTitle'); if(i){ i.value = t; i.focus(); } const nn = document.getElementById('csNotes'); if(nn) nn.value = n; };
ACTIONS.csType = function(el, e, id){ const t = (document.getElementById('csTitle')||{}).value || '', n = (document.getElementById('csNotes')||{}).value || ''; ui.csType = ui.csType===id ? null : id; contentSheetRefresh(); const i = document.getElementById('csTitle'); if(i) i.value = t; const nn = document.getElementById('csNotes'); if(nn) nn.value = n; };
ACTIONS.csSave = function(){
  const ti = document.getElementById('csTitle'), title = ti ? ti.value.trim() : ''; if(!title){ if(ti) ti.focus(); return; }
  const notes = ((document.getElementById('csNotes')||{}).value || '').trim();
  const t = {id:uid(), title:title.slice(0, 200), client:'personal', clients:['personal'], priority:'med', deadline:null, notes:notes, status:'backlog', ongoing:false, ongoingDeadline:null, ongoingFrequency:null, includeInStandard:false, categoryId:null, isVideoIdea:true, videoType:ui.csType || null, createdAt:todayStr()};
  setContentRole(t, ui.csRole==='personal' ? 'personal' : 'business');
  state.tasks.items.push(t); ui.csType = null;
  if(typeof playTaskAdded==='function') playTaskAdded();
  closeContentSheet(); persist('tasks'); renderView();
};
document.addEventListener('keydown', function(e){
  if(e.key!=='Enter' || !e.target || e.target.id!=='csTitle') return;
  e.preventDefault(); ACTIONS.csSave();
});
afterRenderHooks.push(function(){ const k = ui.view+'|'+(ui.focusTasksSubTab||''); if(ui._csView && ui._csView!==k) closeContentSheet(); ui._csView = k; });
