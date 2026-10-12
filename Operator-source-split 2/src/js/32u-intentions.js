// ============ CHECK IN, CHECK OUT: THE WEEK AND THE MONTH ============
// Master goals are the long haul. The week and the month are how you get there:
//  • Check in at the start — up to three goals for the week (or the month), and the one thing to
//    focus on (or, for the month, the habit you're beating), plus a note to yourself.
//  • Tick them off as you go (Goals tab, the Calendar strip, Good morning).
//  • Check out at the end — what you hit, what you missed, what went well, what you'll fix.
// They're real goals: they live in Goals (This week / This month) and stay there as a record, and
// they pay XP — a weekly goal a little, a monthly one a decent chunk, and showing up to check in and
// out pays too (see CHECKIN_XP). The Calendar asks once a week and once a month; close it and it
// waits in the notifications. Good morning brings them back every day.
const CHECKIN_XP = {weekGoal:150, monthGoal:500, habit:500, weekIn:25, weekOut:50, monthIn:50, monthOut:100, maxGoals:3};
function intentStore(){
  const j = state.journal;
  if(!j.intentions || typeof j.intentions!=='object') j.intentions = {};
  const s = j.intentions;
  if(!s.months || typeof s.months!=='object') s.months = {};
  if(!s.weeks || typeof s.weeks!=='object') s.weeks = {};
  if(!s.prompted || typeof s.prompted!=='object') s.prompted = {};
  // (before check-ins, the month had one goal and the week a "win" written as text: they become goals)
  if(!s.goalsMoved && state.goals && Array.isArray(state.goals.items)){
    s.goalsMoved = 1;
    Object.keys(s.months).forEach(function(k){ const m = s.months[k]; if(m && m.goal && !tierGoals('month', k).length) state.goals.items.push(newTierGoal('month', k, m.goal)); });
    Object.keys(s.weeks).forEach(function(k){ const w = s.weeks[k]; if(w && w.win && !tierGoals('week', k).length) state.goals.items.push(newTierGoal('week', k, w.win)); });
    persist('goals'); persist('journal');
  }
  return s;
}
function monthKey(d){ return String(d || todayStr()).slice(0, 7); }
function weekKey(d){ return startOfWeekStr(d || todayStr()); }
function periodKey(kind, d){ return kind==='month' ? monthKey(d) : weekKey(d); }
function prevPeriodKey(kind, key){ if(kind==='week') return addDays(key, -7); const p = key.split('-').map(Number); return p[1]===1 ? (p[0]-1)+'-12' : p[0]+'-'+pad2(p[1]-1); }
function periodEnd(kind, key){ if(kind==='week') return addDays(key, 6); const p = key.split('-').map(Number); return todayStr(new Date(p[0], p[1], 0)); }
function monthName(k){ return new Date(k+'-15T12:00').toLocaleDateString(undefined, {month:'long'}); }
function weekLabel(k){ const a = new Date(k+'T12:00'), b = new Date(addDays(k, 6)+'T12:00'); return a.toLocaleDateString(undefined, {month:'short', day:'numeric'})+' – '+b.toLocaleDateString(undefined, a.getMonth()===b.getMonth() ? {day:'numeric'} : {month:'short', day:'numeric'}); }
function periodLabel(kind, key){ return kind==='month' ? monthName(key) : 'the week of '+weekLabel(key); }
// ---- the goals themselves (state.goals.items with tier 'week' / 'month' and the period they're for) ----
function newTierGoal(kind, key, label){ return {id:uid(), tier:kind, pk:key, label:String(label||'').slice(0, 140), done:false, missed:false, target:null, current:0, unit:'', deadline:periodEnd(kind, key), autoTrack:null, period:null, start:null, createdAt:todayStr()}; }
function tierGoals(kind, key){ return arr(state.goals && state.goals.items).filter(function(g){ return g.tier===kind && g.pk===key; }); }
function periodRec(kind, key){ return (kind==='month' ? intentStore().months : intentStore().weeks)[key] || null; }
function checkedIn(kind, key){ const r = periodRec(kind, key); return !!((r && r.at) || tierGoals(kind, key).length); }
function checkedOut(kind, key){ const r = periodRec(kind, key); return !!(r && r.out); }
// (kept for older callers: "the month / the week has been set")
function monthIntent(d){ const k = monthKey(d), m = intentStore().months[k]; return checkedIn('month', k) ? (m || {}) : null; }
function weekIntent(d){ const k = weekKey(d), w = intentStore().weeks[k]; return checkedIn('week', k) ? (w || {}) : null; }
// Check out: the week from its Sunday until the next Sunday; the month from its last two days until
// the 10th of the next one. Only a period you checked into has anything to check out of.
function checkoutDue(){
  const today = todayStr(), out = [];
  const wk = weekKey(), wPrev = prevPeriodKey('week', wk);
  [wPrev, wk].forEach(function(k){ if(today >= periodEnd('week', k) && today <= addDays(periodEnd('week', k), 7) && checkedIn('week', k) && !checkedOut('week', k)) out.push({kind:'week', key:k}); });
  const mk = monthKey(), mPrev = prevPeriodKey('month', mk);
  [mPrev, mk].forEach(function(k){ const end = periodEnd('month', k); if(today >= addDays(end, -1) && today <= addDays(end, 10) && checkedIn('month', k) && !checkedOut('month', k)) out.push({kind:'month', key:k}); });
  return out.sort(function(a, b){ return a.kind===b.kind ? 0 : a.kind==='month' ? -1 : 1; });
}
// what still needs doing (these sit in the notifications until they're done)
function intentPending(){
  const out = [], mk = monthKey(), wk = weekKey();
  checkoutDue().forEach(function(c){
    out.push({key:'checkout:'+c.kind+':'+c.key, kind:'intent', level:'info', icon:c.kind==='month' ? '&#127942;' : '&#9989;', title:'Check out of '+(c.kind==='month' ? monthName(c.key) : 'the week'),
      sub:(c.kind==='month' ? 'How did '+monthName(c.key)+' go?' : weekLabel(c.key)+': what did you hit?')+' Collect your XP.', act:{a:'openCheckout', id:c.kind+':'+c.key}, sort:1});
  });
  if(!checkedIn('month', mk)) out.push({key:'intent:month:'+mk, kind:'intent', level:'info', icon:'&#127769;', title:'Check in for '+monthName(mk), sub:'Up to three goals and a habit to beat for the month', act:{a:'openIntent', id:'month'}, sort:2});
  if(!checkedIn('week', wk)) out.push({key:'intent:week:'+wk, kind:'intent', level:'info', icon:'&#128197;', title:'Check in for the week', sub:weekLabel(wk)+': what makes it a win?', act:{a:'openIntent', id:'week'}, sort:2});
  return out;
}
const INTENT_FIELDS = {
  month:{goals:['e.g. Sign two new clients', 'e.g. Launch the JJS funnel', 'e.g. Down to 200 lbs'], extra:[['habit', 'One habit to beat this month', 'e.g. Phone in bed. Snoozing.'], ['note', 'A note to yourself for the month', 'Who you want to be by the end of it.']]},
  week:{goals:['e.g. 20 hours of deep work', 'e.g. 4 workouts', 'e.g. Post 3 reels'], extra:[['focus', 'The one thing to focus on', 'e.g. Finish the JJS launch.'], ['note', 'A note for the week', 'Anything you want to hear on Monday morning.']]}
};
function overlayShell(){
  let o = document.getElementById('intOverlay');
  if(!o){ o = document.createElement('div'); o.id = 'intOverlay'; o.className = 'overlay int-ov'; o.innerHTML = '<div class="int" id="intContent"></div>'; document.body.appendChild(o); o.addEventListener('pointerdown', function(e){ if(e.target===o) ACTIONS.closeIntent(); }); }
  return o;
}
function overlayIn(o, cinematic){ o.classList.toggle('is-cine', !!cinematic); o.classList.remove('hidden'); void o.offsetWidth; o.classList.add('is-in'); }
// ---- check in: a dark screen, the month (or week) comes up big, then the goals ----
function openIntentForm(kind, cinematic){
  kind = kind==='week' ? 'week' : 'month';
  const o = overlayShell();
  const key = periodKey(kind), cur = periodRec(kind, key) || {}, gs = tierGoals(kind, key), F = INTENT_FIELDS[kind];
  const head = kind==='month' ? monthName(key) : 'This week';
  const sub = kind==='month' ? 'A new month. Three goals, one habit to beat.' : weekLabel(key)+' · what makes it a win?';
  const xp = kind==='month' ? '+'+CHECKIN_XP.monthGoal+' XP a goal you hit · +'+CHECKIN_XP.habit+' if you beat the habit' : '+'+CHECKIN_XP.weekGoal+' XP a goal you hit';
  document.getElementById('intContent').innerHTML =
    '<button class="int-x" data-action="closeIntent" title="Later (it stays in your notifications)">&#10005;</button>'+
    '<div class="int-k">'+(kind==='month' ? '&#127769; Month check-in' : '&#128197; Week check-in')+'</div>'+
    '<div class="int-h">'+escapeHtml(head)+'</div><div class="int-s">'+escapeHtml(sub)+'</div>'+
    '<div class="int-fs">'+
      '<div class="int-f int-goals" style="--i:0"><span>'+(kind==='month' ? 'Goals for the month' : 'Goals for the week')+'<em class="int-xp">'+xp+'</em></span>'+
        F.goals.map(function(ph, i){ const g = gs[i]; return '<div class="int-g'+(g && g.done ? ' is-done' : '')+'"><b>'+(i+1)+'</b><input class="int-in" id="int_goal'+(i ? i+1 : '')+'" maxlength="140" placeholder="'+escapeHtml(ph)+'" value="'+escapeHtml(g ? g.label : '')+'"></div>'; }).join('')+'</div>'+
      F.extra.map(function(f, i){ return '<label class="int-f" style="--i:'+(i+1)+'"><span>'+f[1]+'</span><input class="int-in" id="int_'+f[0]+'" maxlength="140" placeholder="'+escapeHtml(f[2])+'" value="'+escapeHtml(cur[f[0]]||'')+'"></label>'; }).join('')+
    '</div>'+
    '<div class="int-a">'+(checkedIn(kind, key) ? '<button class="int-reset" data-action="intentReset" data-id="'+kind+'" title="Delete this '+kind+'’s goals and check-in">Start over</button>' : '')+'<span class="int-a-xp">Checking in: +'+(kind==='month' ? CHECKIN_XP.monthIn : CHECKIN_XP.weekIn)+' XP</span><button class="int-save" data-action="saveIntent" data-id="'+kind+'">'+(checkedIn(kind, key) ? 'Save' : kind==='month' ? 'Start the month' : 'Start the week')+' &#8594;</button></div>';
  o.dataset.kind = kind; o.dataset.mode = 'in';
  overlayIn(o, cinematic);
  setTimeout(function(){ const i = document.getElementById('int_goal'); if(i) i.focus(); }, cinematic ? 1300 : 120);
}
ACTIONS.openIntent = function(el, e, id){ openIntentForm(id || (el && el.dataset.id) || 'month'); };
function closeIntentOverlay(){ const o = document.getElementById('intOverlay'); if(!o) return; o.classList.remove('is-in'); setTimeout(function(){ o.classList.add('hidden'); }, 260); }
ACTIONS.closeIntent = function(){
  const o = document.getElementById('intOverlay'); if(!o) return;
  const kind = o.dataset.kind || 'month';
  if(o.dataset.mode==='in') intentStore().prompted[kind==='month' ? 'M'+monthKey() : 'W'+weekKey()] = todayStr();
  else intentStore().prompted['O'+(o.dataset.key||'')] = todayStr();
  persist('journal');
  closeIntentOverlay();
  if(typeof notifBadge==='function') notifBadge();
};
ACTIONS.saveIntent = function(el, e, id){
  const kind = id==='week' ? 'week' : 'month', key = periodKey(kind), F = INTENT_FIELDS[kind];
  const val = function(i){ const n = document.getElementById(i); return n ? n.value.trim() : ''; };
  const labels = F.goals.map(function(_, i){ return val('int_goal'+(i ? i+1 : '')); });
  const store = kind==='month' ? intentStore().months : intentStore().weeks, rec = Object.assign({}, store[key] || {});
  F.extra.forEach(function(f){ rec[f[0]] = val('int_'+f[0]); });
  if(!labels.some(Boolean) && !F.extra.some(function(f){ return rec[f[0]]; })){ const i = document.getElementById('int_goal'); if(i) i.focus(); return; }
  // the goals, in order: rename what's there, add what's new, drop what was cleared (unless it's done)
  const gs = tierGoals(kind, key);
  labels.forEach(function(l, i){ const g = gs[i]; if(g){ if(l) g.label = l; else if(!g.done) state.goals.items = state.goals.items.filter(function(x){ return x!==g; }); } else if(l) state.goals.items.push(newTierGoal(kind, key, l)); });
  const first = !rec.at; rec.at = rec.at || Date.now(); store[key] = rec;
  intentStore().prompted[kind==='month' ? 'M'+key : 'W'+key] = todayStr();
  persist('journal'); persist('goals'); playPositive();
  closeIntentOverlay();
  showToast(kind==='month' ? 'Checked in for '+monthName(key)+'.' : 'Checked in for the week.', {icon:'&#127769;'});
  if(first && typeof xpToast==='function') setTimeout(function(){ xpToast(kind==='month' ? CHECKIN_XP.monthIn : CHECKIN_XP.weekIn, kind==='month' ? 'Month check-in.' : 'Week check-in.'); }, 500);
  if(typeof notifBadge==='function') notifBadge();
  // the month first, then the week — and once you're set, Op's word on the plan
  if(kind==='month' && !checkedIn('week', weekKey())) setTimeout(function(){ openIntentForm('week', true); }, 700);
  else if(first && typeof opCheckinRemark==='function') opCheckinRemark(kind);
  renderView();
};
// ---- check out: what you hit, what you missed, what went well, what you'll fix ----
function openCheckoutForm(kind, key, cinematic){
  kind = kind==='month' ? 'month' : 'week'; key = key || periodKey(kind);
  const o = overlayShell(), rec = periodRec(kind, key) || {}, gs = tierGoals(kind, key);
  ui.coPick = ui.coPick && ui.coPick.key===kind+key ? ui.coPick : {key:kind+key, v:{}};
  gs.forEach(function(g){ if(ui.coPick.v[g.id]==null) ui.coPick.v[g.id] = g.done ? 1 : 0; });
  if(kind==='month' && rec.habit && ui.coPick.v.habit==null) ui.coPick.v.habit = rec.out && rec.out.habit ? 1 : 0;
  const pick = function(id, on){ return '<span class="co-pick" data-id="'+id+'"><button class="co-b'+(on ? ' is-hit' : '')+'" data-action="coPick" data-id="'+id+'" data-v="1">&#10003; Hit</button><button class="co-b'+(!on ? ' is-miss' : '')+'" data-action="coPick" data-id="'+id+'" data-v="0">Missed</button></span>'; };
  const xpEach = kind==='month' ? CHECKIN_XP.monthGoal : CHECKIN_XP.weekGoal;
  document.getElementById('intContent').innerHTML =
    '<button class="int-x" data-action="closeIntent" title="Later (it stays in your notifications)">&#10005;</button>'+
    '<div class="int-k">'+(kind==='month' ? '&#127942; Month check-out' : '&#9989; Week check-out')+'</div>'+
    '<div class="int-h">'+escapeHtml(kind==='month' ? monthName(key) : 'This week')+'</div><div class="int-s">'+escapeHtml(kind==='month' ? 'How did it go? Be honest: it’s only for you.' : weekLabel(key)+' · how did it go?')+'</div>'+
    '<div class="int-fs">'+
      (gs.length ? '<div class="co-list">'+gs.map(function(g){ return '<div class="co-row"><span class="co-l">'+escapeHtml(g.label)+'<small>+'+xpEach+' XP</small></span>'+pick(g.id, ui.coPick.v[g.id]===1)+'</div>'; }).join('')+'</div>' : '<div class="co-none">No goals were set for '+escapeHtml(periodLabel(kind, key))+': check out anyway, and set some for the next one.</div>')+
      (kind==='month' && rec.habit ? '<div class="co-row is-habit"><span class="co-l">Beat the habit: '+escapeHtml(rec.habit)+'<small>+'+CHECKIN_XP.habit+' XP</small></span>'+pick('habit', ui.coPick.v.habit===1)+'</div>' : '')+
      '<label class="int-f"><span>What went well?</span><input class="int-in" id="co_well" maxlength="200" placeholder="The win you want to remember." value="'+escapeHtml((rec.out && rec.out.well)||'')+'"></label>'+
      '<label class="int-f"><span>What will you fix next '+(kind==='month' ? 'month' : 'week')+'?</span><input class="int-in" id="co_fix" maxlength="200" placeholder="One thing. Make it specific." value="'+escapeHtml((rec.out && rec.out.fix)||'')+'"></label>'+
      // a message to lock away: sealed in the vault (Personal → Journal → Vault), and it can come back one morning
      '<label class="int-f co-seal"><span>&#128274; Lock a message away <small>optional</small></span><textarea class="int-in" id="co_seal" maxlength="2000" rows="3" placeholder="Anything you want to say to yourself. It’s sealed and kept in the vault.">'+escapeHtml(ui.coSealDraft||'')+'</textarea></label>'+
      '<label class="co-seal-back"><input type="checkbox" id="co_seal_back" checked> Bring it back on a morning '+(kind==='month' ? 'three months from now' : 'a month from now')+'</label>'+
    '</div>'+
    '<div class="int-a"><span class="int-a-xp">Checking out: +'+(kind==='month' ? CHECKIN_XP.monthOut : CHECKIN_XP.weekOut)+' XP</span><button class="int-save" data-action="saveCheckout" data-id="'+kind+':'+key+'">Check out &#8594;</button></div>';
  o.dataset.kind = kind; o.dataset.mode = 'out'; o.dataset.key = kind+':'+key;
  overlayIn(o, cinematic);
}
ACTIONS.openCheckout = function(el, e, id){ const p = String(id || (el && el.dataset.id) || '').split(':'); openCheckoutForm(p[0], p[1]); };
ACTIONS.coPick = function(el, e, id){
  if(!ui.coPick) return; ui.coPick.v[id] = Number(el.dataset.v) ? 1 : 0;
  const row = el.closest('.co-pick'); if(row) row.querySelectorAll('.co-b').forEach(function(b){ const on = Number(b.dataset.v)===ui.coPick.v[id]; b.classList.toggle('is-hit', on && b.dataset.v==='1'); b.classList.toggle('is-miss', on && b.dataset.v==='0'); });
  playTick();
};
ACTIONS.saveCheckout = function(el, e, id){
  const p = String(id||'').split(':'), kind = p[0]==='month' ? 'month' : 'week', key = p[1];
  if(!key) return;
  const before = typeof xpSummary==='function' ? (xpLast = null, xpSummary()) : null;
  const store = kind==='month' ? intentStore().months : intentStore().weeks, rec = Object.assign({}, store[key] || {});
  const v = (ui.coPick && ui.coPick.key===kind+key) ? ui.coPick.v : {};
  const lines = [];
  const xpEach = kind==='month' ? CHECKIN_XP.monthGoal : CHECKIN_XP.weekGoal;
  let paid = 0;
  tierGoals(kind, key).forEach(function(g){
    const hit = v[g.id]===1;
    g.done = hit; g.missed = !hit; if(hit && !g.doneAt) g.doneAt = todayStr() > periodEnd(kind, key) ? periodEnd(kind, key) : todayStr();
    if(hit && paid < CHECKIN_XP.maxGoals){ paid++; lines.push({why:g.label, xp:xpEach}); }
  });
  rec.at = rec.at || Date.now();
  rec.out = {at:Date.now(), well:(document.getElementById('co_well')||{}).value||'', fix:(document.getElementById('co_fix')||{}).value||''};
  const seal = ((document.getElementById('co_seal')||{}).value||'').trim();
  if(seal){
    const back = !!(document.getElementById('co_seal_back')||{}).checked, label = kind==='month' ? monthName(key) : 'The week of '+fmtDateShort(key);
    vaultStore().push({id:uid(), kind:kind, key:key, label:label, text:seal.slice(0, 2000), at:Date.now(), back:back});
    if(back && typeof capsules==='function') capsules().push({id:uid(), text:seal.slice(0, 2000), title:'Sealed at the end of '+(kind==='month' ? monthName(key) : 'the week of '+fmtDateShort(key)), writtenOn:todayStr(), openOn:addDays(todayStr(), kind==='month' ? 91 : 30)});
    ui.coSealDraft = '';
  }
  if(kind==='month' && rec.habit){ rec.out.habit = v.habit===1; if(rec.out.habit) lines.push({why:'Beat: '+rec.habit, xp:CHECKIN_XP.habit}); }
  lines.push({why:kind==='month' ? 'Month check-out' : 'Week check-out', xp:kind==='month' ? CHECKIN_XP.monthOut : CHECKIN_XP.weekOut});
  store[key] = rec; ui.coPick = null;
  persist('journal'); persist('goals');
  closeIntentOverlay();
  if(before && typeof xpSystemShow==='function'){
    xpLast = null; const x = xpSummary(), seen = xpSeen(), gained = Math.max(0, x.total - before.total);
    seen.total = x.total; persist('profile');
    setTimeout(function(){ xpSystemShow({title:(kind==='month' ? monthName(key) : 'The week')+' · checked out.', sub:lines.length > 1 ? (lines.length-1)+' thing'+(lines.length===2?'':'s')+' hit.' : 'On to the next one.', lines:lines, gained:gained, level:x.level, levelUp:false, ready:x.canLevel,
      fromPct:(before.total - x.levelLo)/(x.levelHi - x.levelLo), toPct:x.levelPct}); }, 350);
  } else playPositive();
  if(typeof notifBadge==='function') notifBadge();
  renderView();
  // Op's read on how it went (spoken if the voice is on)
  if(typeof opPeriodRemark==='function') opPeriodRemark(kind, key);
  // done with the old one: straight into the new one, if it isn't set yet
  const nk = periodKey(kind);
  if(nk!==key && !checkedIn(kind, nk)) setTimeout(function(){ openIntentForm(kind, true); }, 9000);
};
// rename or delete one (deleting asks twice; a checked-out period can still be cleaned up)
ACTIONS.tierGoalRename = function(el, e, id){
  const g = arr(state.goals.items).find(function(x){ return x.id===id; }); if(!g) return;
  const v = prompt('Rename this goal', g.label); if(v==null) return;
  const t = v.trim(); if(!t) return;
  g.label = t.slice(0, 140); persist('goals'); renderView();
};
ACTIONS.tierGoalDelete = function(el, e, id){
  const key = 'tgdel:'+id;
  if(!armed.has(key)){ armed.add(key); renderView(); setTimeout(function(){ if(armed.has(key)){ armed.delete(key); renderView(); } }, 3000); return; }
  armed.delete(key);
  state.goals.items = state.goals.items.filter(function(x){ return x.id!==id; }); persist('goals'); playTick(); renderView();
};
// start a week (or month) over: its goals, its check-in and its check-out go — like it never happened
ACTIONS.intentReset = function(el, e, id){
  const kind = id==='month' ? 'month' : 'week', key = periodKey(kind), k = 'intreset:'+kind;
  if(!armed.has(k)){ armed.add(k); el.textContent = 'Sure? Tap again'; setTimeout(function(){ armed.delete(k); }, 3000); return; }
  armed.delete(k);
  state.goals.items = state.goals.items.filter(function(g){ return !(g.tier===kind && g.pk===key); });
  delete (kind==='month' ? intentStore().months : intentStore().weeks)[key];
  delete intentStore().prompted[(kind==='month' ? 'M' : 'W')+key];
  persist('goals'); persist('journal');
  openIntentForm(kind);
  showToast(kind==='month' ? 'The month is a clean slate.' : 'This week is a clean slate.', {icon:'&#129529;'});
  renderView();
};
// tick a weekly / monthly goal off (or back on) from anywhere
ACTIONS.tierGoalToggle = function(el, e, id){
  const g = arr(state.goals.items).find(function(x){ return x.id===id; }); if(!g) return;
  if(checkedOut(g.tier, g.pk)){ showToast('That '+(g.tier==='month' ? 'month' : 'week')+' is checked out. It’s on the record.', {icon:'&#128274;'}); return; }
  const before = typeof xpSummary==='function' ? (xpLast = null, xpSummary().total) : 0;
  g.done = !g.done; g.missed = false; g.doneAt = g.done ? todayStr() : null;
  persist('goals');
  if(g.done){ playPositive(); xpLast = null; const x = xpSummary(), gained = x.total - before; if(gained > 0){ xpSeen().total = x.total; persist('profile'); xpToast(gained, (g.tier==='month' ? 'Monthly' : 'Weekly')+' goal hit.'); } }
  else playTick();
  renderView();
};
ACTIONS.tierGoalAdd = function(el, e, id){
  const kind = id==='month' ? 'month' : 'week', key = periodKey(kind), inp = document.getElementById('tierAdd-'+kind);
  const l = inp ? inp.value.trim() : ''; if(!l){ if(inp) inp.focus(); return; }
  state.goals.items.push(newTierGoal(kind, key, l));
  const store = kind==='month' ? intentStore().months : intentStore().weeks; if(!store[key]) store[key] = {at:Date.now()};
  persist('goals'); persist('journal'); playTick(); renderView();
  setTimeout(function(){ const i = document.getElementById('tierAdd-'+kind); if(i) i.focus(); }, 30);
};
document.addEventListener('keydown', function(e){
  const t = e.target; if(!t || !t.id) return;
  if(t.id.indexOf('tierAdd-')===0 && e.key==='Enter'){ e.preventDefault(); ACTIONS.tierGoalAdd(null, null, t.id.slice(8)); }
  else if(t.closest && t.closest('#intOverlay') && e.key==='Enter' && t.classList.contains('int-in')){ e.preventDefault(); const b = document.querySelector('#intOverlay .int-save'); if(b) b.click(); }
});
// the Calendar asks: a check-out that's due first, then the month, then the week
afterRenderHooks.push(function(){
  if(ui.view!=='calendar' || document.querySelector('.overlay:not(.hidden)')) return;
  const p = intentStore().prompted, mk = 'M'+monthKey(), wk = 'W'+weekKey();
  const due = checkoutDue().filter(function(c){ return !p['O'+c.kind+':'+c.key]; })[0];
  const ask = due ? {id:'O'+due.kind+':'+due.key, run:function(){ openCheckoutForm(due.kind, due.key, true); }}
    : !checkedIn('month', monthKey()) && !p[mk] ? {id:mk, run:function(){ openIntentForm('month', true); }}
    : !checkedIn('week', weekKey()) && !p[wk] ? {id:wk, run:function(){ openIntentForm('week', true); }} : null;
  if(!ask || ui._intAsked===ask.id) return;
  ui._intAsked = ask.id;
  // never on top of something you just opened — it asks again on the next visit
  setTimeout(function(){ if(ui.view!=='calendar') return; if(document.querySelector('.overlay:not(.hidden):not(#intOverlay)')){ ui._intAsked = null; return; } ask.run(); }, 450);
});
// ---- the week and the month as lists you tick (Calendar strip and the Goals tab) ----
function tierGoalRowHtml(g){
  const locked = checkedOut(g.tier, g.pk);
  const delArmed = armed.has('tgdel:'+g.id);
  return '<div class="tg-row'+(g.done ? ' is-done' : '')+(g.missed ? ' is-missed' : '')+'">'+
    '<button class="tg-hit" data-action="tierGoalToggle" data-id="'+g.id+'"'+(locked ? ' title="Checked out: on the record"' : '')+'><span class="tg-box">'+(g.done ? '&#10003;' : g.missed ? '&#10005;' : '')+'</span><span class="tg-l">'+escapeHtml(g.label)+'</span>'+
    '<span class="tg-xp'+(g.xpPending ? ' is-sizing' : '')+'"'+(g.xpWhy ? ' title="'+escapeHtml(g.xpWhy)+'"' : '')+'>+'+goalXpOf(g)+'</span></button>'+
    '<span class="tg-acts"><button class="tg-a" data-action="tierGoalRename" data-id="'+g.id+'" title="Rename">&#9998;</button><button class="tg-a'+(delArmed ? ' is-armed' : '')+'" data-action="tierGoalDelete" data-id="'+g.id+'" title="'+(delArmed ? 'Tap again to delete' : 'Delete')+'">'+(delArmed ? 'Delete?' : '&#10005;')+'</button></span></div>';
}
function tierCardHtml(kind, opts){
  opts = opts || {};
  const key = periodKey(kind), gs = tierGoals(kind, key), rec = periodRec(kind, key) || {}, done = gs.filter(function(g){ return g.done; }).length;
  const due = checkoutDue().find(function(c){ return c.kind===kind; });
  const sub = kind==='month' ? (rec.habit ? 'Beating: '+rec.habit : '') : (rec.focus ? 'Focus: '+rec.focus : '');
  return '<div class="tg-card is-'+kind+'">'+
    '<div class="tg-h"><span class="tg-k">'+(kind==='month' ? monthName(key) : 'This week')+'</span>'+(gs.length ? '<span class="tg-n">'+done+'/'+gs.length+'</span>' : '')+
      '<span style="flex:1"></span>'+(due ? '<button class="tg-edit is-due" data-action="openCheckout" data-id="'+due.kind+':'+due.key+'" title="Check out of '+(kind==='month' ? monthName(due.key) : 'the week')+'">&#9998;</button>' : '<button class="tg-edit'+(checkedIn(kind, key) ? '' : ' is-due')+'" data-action="openIntent" data-id="'+kind+'" title="'+(checkedIn(kind, key) ? 'Edit your check-in' : 'Check in')+'">&#9998;</button>')+'</div>'+
    (sub ? '<div class="tg-sub">'+escapeHtml(sub)+'</div>' : '')+
    (gs.length ? '<div class="tg-list">'+gs.map(tierGoalRowHtml).join('')+'</div>' : '<div class="tg-empty">'+(kind==='month' ? 'No goals for the month yet.' : 'No goals for the week yet.')+'</div>')+
    (opts.add==='sheet' ? (checkedOut(kind, key) ? '<div class="tg-addrow"><button class="tg-addbtn" data-action="tierReopen" data-id="'+kind+'">&#8634; Reopen the '+(kind==='month' ? 'month' : 'week')+'</button></div>' : '') :
     opts.add && gs.length < 5 && !checkedOut(kind, key) ? '<div class="tg-add"><input class="input" id="tierAdd-'+kind+'" maxlength="140" placeholder="+ Add a '+(kind==='month' ? 'monthly' : 'weekly')+' goal"><button class="btn btn-sm" data-action="tierGoalAdd" data-id="'+kind+'">Add</button></div>' : '')+
  '</div>';
}
// the Calendar: the week and the month, side by side, tick right there
function intentStripHtml(){ return '<div class="int-strip tg-strip">'+tierCardHtml('week')+tierCardHtml('month')+'</div>'; }
// past weeks and months, at a glance: how many you hit
function tierHistoryHtml(kind, n){
  const out = []; let k = prevPeriodKey(kind, periodKey(kind));
  for(let i=0;i<n;i++){ const gs = tierGoals(kind, k); if(gs.length || checkedIn(kind, k)) out.push({k:k, gs:gs, out:checkedOut(kind, k)}); k = prevPeriodKey(kind, k); }
  if(!out.length) return '';
  return '<div class="tg-hist">'+out.map(function(x){ const d = x.gs.filter(function(g){ return g.done; }).length; return '<span class="'+(x.gs.length && d===x.gs.length ? 'is-all' : '')+'" title="'+escapeHtml(x.gs.map(function(g){ return (g.done ? '✓ ' : '✕ ')+g.label; }).join('\n'))+'"><b>'+d+'/'+x.gs.length+'</b><small>'+(kind==='month' ? monthName(x.k).slice(0, 3) : fmtDateShort(x.k))+'</small>'+(x.out ? '' : '<i title="Not checked out">&bull;</i>')+'</span>'; }).join('')+'</div>';
}
// ---- Good morning: the quarter on top, and the week and the month rolling underneath ----
function intentReelItems(){
  const mk = monthKey(), wk = weekKey(), m = periodRec('month', mk) || {}, w = periodRec('week', wk) || {}, list = [];
  const goal = function(g, k){ return {k:k, v:g.label, done:g.done, say:(g.done ? 'Done already: ' : '')+g.label+'.'}; };
  tierGoals('week', wk).filter(function(g){ return !g.done; }).forEach(function(g){ list.push(goal(g, 'A goal this week')); });
  if(m.habit) list.push({k:'The habit you’re beating', v:m.habit, say:'Remember the habit you’re beating: '+m.habit+'.'});
  tierGoals('month', mk).filter(function(g){ return !g.done; }).forEach(function(g){ list.push(goal(g, monthName(mk)+'’s goal')); });
  if(w.focus) list.push({k:'This week’s focus', v:w.focus, say:'This week, it’s about '+w.focus+'.'});
  tierGoals('week', wk).concat(tierGoals('month', mk)).filter(function(g){ return g.done; }).forEach(function(g){ list.push(goal(g, (g.tier==='month' ? 'Hit this month' : 'Hit this week'))); });
  if(m.note) list.push({k:'You told yourself this month', v:m.note, say:'Something you told yourself this month.'});
  if(w.note) list.push({k:'For the week', v:w.note, say:'A note you left for the week.'});
  return list;
}
// (kept for older callers: one of them, a different one each day)
function intentOfDay(){ const l = intentReelItems(); return l.length ? l[dayNum() % l.length] : null; }
function briefIntentHtml(){
  const cap = typeof dueCapsule==='function' ? dueCapsule() : null;
  if(cap){
    openCapsule(cap);
    return {voice:'And a message from you, from '+fmtDateShort(cap.writtenOn)+'.', html:'<div class="br-k bi-k">&#9203; From Past You</div><div class="bi-one"><small>Written '+fmtDateShort(cap.writtenOn)+(cap.title ? ' &middot; '+escapeHtml(cap.title) : '')+'</small><p>'+escapeHtml(cap.text)+'</p></div>'};
  }
  const items = intentReelItems(), qh = quarterHeadHtml(), wk = tierGoals('week', weekKey()), mo = tierGoals('month', monthKey());
  const tally = (wk.length || mo.length) ? '<div class="bi-tally">'+(wk.length ? '<span><b>'+wk.filter(function(g){ return g.done; }).length+'/'+wk.length+'</b> this week</span>' : '')+(mo.length ? '<span><b>'+mo.filter(function(g){ return g.done; }).length+'/'+mo.length+'</b> '+escapeHtml(monthName(monthKey()))+'</span>' : '')+'</div>' : '';
  if(!items.length) return {voice:'A new step. Check in for '+(checkedIn('month', monthKey()) ? 'the week' : 'the month')+' when you get a minute.', html:qh+'<div class="bi-one is-empty"><p>What’s this '+(checkedIn('month', monthKey()) ? 'week' : 'month')+' about?</p><button class="bi-set" data-action="openIntent" data-id="'+(checkedIn('month', monthKey()) ? 'week' : 'month')+'">Check in &#8594;</button></div>'};
  const n = items.length, i = ((ui.biIdx==null ? dayNum() : ui.biIdx) % n + n) % n;
  return {voice:items[i].say, html:qh+
    '<div class="bi-reel'+(n > 1 ? ' is-multi' : '')+'" data-n="'+n+'">'+items.map(function(it, k){ return '<div class="bi-one bi-slide'+(k===i ? ' is-on' : '')+(it.done ? ' is-done' : '')+'"><small>'+(it.done ? '&#10003; ' : '')+escapeHtml(it.k)+'</small><p>'+escapeHtml(it.v)+'</p></div>'; }).join('')+'</div>'+
    '<div class="bi-foot">'+tally+(n > 1 ? '<span class="bi-nav"><button class="rl-arr" data-action="biStep" data-id="-1" title="Back">&#8249;</button><span class="rl-dots">'+items.map(function(_, k){ return '<i class="'+(k===i ? 'on' : '')+'" data-action="biGo" data-id="'+k+'"></i>'; }).join('')+'</span><button class="rl-arr" data-action="biStep" data-id="1" title="Next">&#8250;</button></span>' : '')+'</div>'};
}
function biShow(i){
  const reel = document.querySelector('#wakeContent .bi-reel'); if(!reel) return;
  const slides = reel.querySelectorAll('.bi-slide'), n = slides.length; if(!n) return;
  ui.biIdx = ((i % n) + n) % n;
  slides.forEach(function(s, k){ s.classList.toggle('is-on', k===ui.biIdx); });
  document.querySelectorAll('#wakeContent .bi-nav .rl-dots i').forEach(function(d, k){ d.classList.toggle('on', k===ui.biIdx); });
}
ACTIONS.biStep = function(el, e, id){ ui.biHold = Date.now(); biShow((ui.biIdx==null ? dayNum() : ui.biIdx) + Number(id||1)); playTick(); };
ACTIONS.biGo = function(el, e, id){ ui.biHold = Date.now(); biShow(Number(id)||0); playTick(); };
// it swaps by itself every few seconds (a manual swipe holds it for a while)
setInterval(function(){
  if(ui.wakeMode!=='brief' || typeof overlayOpen!=='function' || !overlayOpen('wakeOverlay')) return;
  if(ui.biHold && Date.now() - ui.biHold < 15000) return;
  if(document.querySelector('#wakeContent .bi-reel.is-multi')) biShow((ui.biIdx==null ? dayNum() : ui.biIdx) + 1);
}, 7000);
// the quarter, business-style: how many days are left in this one (and in the year)
function quarterInfo(d){
  d = d ? new Date(d+'T12:00') : new Date(); d.setHours(12, 0, 0, 0);
  const q = Math.floor(d.getMonth()/3), start = new Date(d.getFullYear(), q*3, 1, 12), end = new Date(d.getFullYear(), q*3+3, 1, 12);
  const day = 86400000, total = Math.round((end - start)/day), left = Math.round((end - d)/day), yEnd = new Date(d.getFullYear()+1, 0, 1, 12);
  return {q:q+1, year:d.getFullYear(), left:left, total:total, pct:(total - left)/total, yearLeft:Math.round((yEnd - d)/day), nextQ:q===3 ? 'Q1 '+(d.getFullYear()+1) : 'Q'+(q+2)};
}
// the panel's head: the quarter, the days left, a thin bar — and ✎ to your check-in
function quarterHeadHtml(){
  const x = quarterInfo();
  return '<div class="bi-q bi-qh"><div class="bi-q-t"><b>Q'+x.q+'</b><span><b>'+x.left+'</b> day'+(x.left===1?'':'s')+' left</span><em>Day '+(x.total - x.left + 1)+' of '+x.total+(x.q < 4 ? ' &middot; '+x.yearLeft+' left in '+x.year : '')+'</em>'+
    '<button class="bi-edit" data-action="openIntent" data-id="'+(checkedIn('week', weekKey()) ? 'month' : 'week')+'" title="Your check-ins">&#9998;</button></div>'+
    '<i class="bi-q-bar"><u style="width:'+(x.pct*100).toFixed(1)+'%"></u></i></div>';
}
// (older callers)
function quarterHtml(){ return quarterHeadHtml(); }
// the HUD on Good morning: your level like a game shows it — badge, level, rank, XP, streak
function briefHudHtml(){
  if(typeof xpSummary!=='function') return '';
  const x = xpSummary(), r = RANKS[x.rank], streak = computeStreak();
  return '<div class="b4-hud" data-action="openYou" title="Your card" style="--rc:'+r.color+'">'+rankBadgeSvg(x.rank, 38)+
    '<div class="b4-hud-m"><div class="b4-hud-t"><b>LVL '+x.level+'</b><span>'+escapeHtml(r.name)+'</span></div>'+
    '<i class="b4-hud-bar"><u style="width:'+(x.levelPct*100).toFixed(1)+'%"></u></i>'+
    '<div class="b4-hud-s"><span>'+(x.canLevel ? '<em class="b4-hud-up">Level up ready</em>' : x.blocked && x.blocked.length ? '<em class="b4-hud-warn">&#9888; needs '+escapeHtml(x.blocked.join(' & '))+'</em>' : Math.min(x.total - x.levelLo, x.levelHi - x.levelLo).toLocaleString()+' / '+(x.levelHi - x.levelLo).toLocaleString()+' XP')+'</span><span>&#128293; '+streak+'</span></div></div></div>';
}
// ---- the vault: messages you lock away when you close out a week or a month ----
// Kept sealed (Personal → Journal → Vault); open one to read it. They can also come back to you one
// morning, as a note from past you.
function vaultStore(){ const s = intentStore(); if(!Array.isArray(s.vault)) s.vault = []; return s.vault; }
// the vault holds the time capsules from the journal too: the ones that have come back can be read; the rest
// stay sealed until their morning (a surprise one doesn't even say when)
function vaultItems(){
  const sealed = vaultStore(), texts = {}; sealed.forEach(function(m){ texts[m.text] = 1; });
  const caps = typeof capsules==='function' ? capsules().filter(function(c){ return !texts[c.text]; }).map(function(c){
    return {id:'cap:'+c.id, kind:'capsule', label:c.title || 'A note to future you', text:c.text, at:localTs(c.writtenOn, '12:00'), locked:!c.openedOn, openOn:c.openOn, hidden:!!c.hidden, written:c.writtenOn};
  }) : [];
  return sealed.concat(caps).sort(function(a, b){ return b.at - a.at; });
}
function vaultHtml(){
  const v = vaultItems(), open = ui.vaultOpen || {};
  if(!v.length) return '<div class="vault-empty"><div class="vault-empty-i">&#128274;</div><b>Nothing locked away yet.</b><span>When you check out of a week or a month, you can seal a message to yourself. Time capsules from the journal live here too.</span></div>';
  return '<div class="vault">'+v.map(function(m, i){ const o = !!open[m.id];
    return '<div class="vault-card'+(o ? ' is-open' : '')+(m.locked ? ' is-locked' : '')+' is-'+m.kind+'" style="--i:'+Math.min(i, 12)+'">'+
      '<button class="vault-seal" data-action="vaultToggle" data-id="'+m.id+'" title="'+(m.locked ? 'Still sealed' : o ? 'Seal it again' : 'Open it')+'"><span class="vault-wax">'+(m.kind==='capsule' ? (m.locked ? '&#9203;' : '&#128140;') : m.kind==='month' ? '&#127942;' : '&#9989;')+'</span>'+
        '<span class="vault-meta"><b>'+escapeHtml(m.label)+'</b><small>'+(m.kind==='capsule' ? 'Time capsule · written '+fmtDateShort(m.written)+(m.locked ? (m.hidden ? ' · opens one morning, you won’t know when' : ' · opens '+fmtDateShort(m.openOn)) : ' · opened') : 'Sealed '+fmtDateShort(todayStr(new Date(m.at)))+(m.back ? ' · coming back one morning' : ''))+'</small></span><span class="vault-chev">'+(m.locked ? '&#128274;' : o ? '&#9652;' : '&#9662;')+'</span></button>'+
      '<div class="vault-body"><div class="vault-text">'+(m.locked ? '<i class="vault-locked">Still sealed. It opens itself when its morning comes.</i>' : escapeHtml(m.text))+'</div></div>'+
    '</div>'; }).join('')+'</div>';
}
ACTIONS.vaultToggle = function(el, e, id){ ui.vaultOpen = ui.vaultOpen || {}; ui.vaultOpen[id] = !ui.vaultOpen[id]; renderView(); };
document.addEventListener('input', function(e){ if(e.target && e.target.id==='co_seal') ui.coSealDraft = e.target.value; });
