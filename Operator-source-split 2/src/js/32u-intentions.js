// ============ THE MONTH AND THE WEEK ============
// A way through the year with good intentions. Each month: one habit to beat, one goal to get done,
// and a note to yourself. Each week: what makes it a win, one thing to focus on, a note. The Calendar
// tab asks once a month and once a week with a short cinematic prompt; close it and it waits in the
// notifications until it's done. Good morning brings them back every day (a different one each
// morning), so the month and the week stay in front of you as they go on.
function intentStore(){
  const j = state.journal;
  if(!j.intentions || typeof j.intentions!=='object') j.intentions = {};
  const s = j.intentions;
  if(!s.months || typeof s.months!=='object') s.months = {};
  if(!s.weeks || typeof s.weeks!=='object') s.weeks = {};
  if(!s.prompted || typeof s.prompted!=='object') s.prompted = {};
  return s;
}
function monthKey(d){ return String(d || todayStr()).slice(0, 7); }
function weekKey(d){ return startOfWeekStr(d || todayStr()); }
function monthIntent(d){ const m = intentStore().months[monthKey(d)]; return m && (m.habit || m.goal || m.note) ? m : null; }
function weekIntent(d){ const w = intentStore().weeks[weekKey(d)]; return w && (w.win || w.focus || w.note) ? w : null; }
function monthName(k){ return new Date(k+'-15T12:00').toLocaleDateString(undefined, {month:'long'}); }
function weekLabel(k){ const a = new Date(k+'T12:00'), b = new Date(addDays(k, 6)+'T12:00'); return a.toLocaleDateString(undefined, {month:'short', day:'numeric'})+' – '+b.toLocaleDateString(undefined, a.getMonth()===b.getMonth() ? {day:'numeric'} : {month:'short', day:'numeric'}); }
// what still needs writing (these sit in the notifications until they're done)
function intentPending(){
  const out = [], mk = monthKey(), wk = weekKey();
  if(!monthIntent()) out.push({key:'intent:month:'+mk, kind:'intent', level:'info', icon:'&#127769;', title:'Set your intentions for '+monthName(mk), sub:'A habit to beat, a goal, a note — for the month', act:{a:'openIntent', id:'month'}, sort:2});
  if(!weekIntent()) out.push({key:'intent:week:'+wk, kind:'intent', level:'info', icon:'&#128197;', title:'Set up this week', sub:weekLabel(wk)+' — what makes it a win?', act:{a:'openIntent', id:'week'}, sort:2});
  return out;
}
const INTENT_FIELDS = {
  month:[['habit', 'One habit to beat this month', 'e.g. Phone in bed. Snoozing.'], ['goal', 'One goal to get done this month', 'e.g. Sign two new clients.'], ['note', 'A note to yourself for the month', 'Who you want to be by the end of it.']],
  week:[['win', 'What makes this week a win?', 'e.g. 20 hours of deep work, 4 workouts.'], ['focus', 'The one thing to focus on', 'e.g. Finish the JJS launch.'], ['note', 'A note for the week', 'Anything you want to hear on Monday morning.']]
};
// the prompt: a dark screen, the month (or week) comes up big, then the questions
function openIntentForm(kind, cinematic){
  kind = kind==='week' ? 'week' : 'month';
  let o = document.getElementById('intOverlay');
  if(!o){ o = document.createElement('div'); o.id = 'intOverlay'; o.className = 'overlay int-ov'; o.innerHTML = '<div class="int" id="intContent"></div>'; document.body.appendChild(o); o.addEventListener('pointerdown', function(e){ if(e.target===o) ACTIONS.closeIntent(); }); }
  const key = kind==='month' ? monthKey() : weekKey(), cur = (kind==='month' ? intentStore().months : intentStore().weeks)[key] || {};
  const head = kind==='month' ? monthName(key) : 'This week';
  const sub = kind==='month' ? 'A new month. A new step.' : weekLabel(key)+' · a new step';
  document.getElementById('intContent').innerHTML =
    '<button class="int-x" data-action="closeIntent" title="Later (it stays in your notifications)">&#10005;</button>'+
    '<div class="int-k">'+(kind==='month' ? '&#127769; The month' : '&#128197; The week')+'</div>'+
    '<div class="int-h">'+escapeHtml(head)+'</div><div class="int-s">'+escapeHtml(sub)+'</div>'+
    '<div class="int-fs">'+INTENT_FIELDS[kind].map(function(f, i){ return '<label class="int-f" style="--i:'+i+'"><span>'+f[1]+'</span><input class="int-in" id="int_'+f[0]+'" maxlength="140" placeholder="'+escapeHtml(f[2])+'" value="'+escapeHtml(cur[f[0]]||'')+'"></label>'; }).join('')+'</div>'+
    '<div class="int-a"><button class="int-save" data-action="saveIntent" data-id="'+kind+'">'+(kind==='month' ? 'Start the month' : 'Start the week')+' &#8594;</button></div>';
  o.dataset.kind = kind;
  o.classList.toggle('is-cine', !!cinematic);
  o.classList.remove('hidden'); void o.offsetWidth; o.classList.add('is-in');
  setTimeout(function(){ const i = document.getElementById('int_'+INTENT_FIELDS[kind][0][0]); if(i) i.focus(); }, cinematic ? 1300 : 120);
}
ACTIONS.openIntent = function(el, e, id){ openIntentForm(id || (el && el.dataset.id) || 'month'); };
ACTIONS.closeIntent = function(){
  const o = document.getElementById('intOverlay'); if(!o) return;
  const kind = o.dataset.kind || 'month';
  intentStore().prompted[kind==='month' ? 'M'+monthKey() : 'W'+weekKey()] = todayStr(); persist('journal');
  o.classList.remove('is-in'); setTimeout(function(){ o.classList.add('hidden'); }, 260);
  if(typeof notifBadge==='function') notifBadge();
};
ACTIONS.saveIntent = function(el, e, id){
  const kind = id==='week' ? 'week' : 'month', key = kind==='month' ? monthKey() : weekKey();
  const rec = {at:Date.now()}; let any = false;
  INTENT_FIELDS[kind].forEach(function(f){ const i = document.getElementById('int_'+f[0]); const v = i ? i.value.trim() : ''; rec[f[0]] = v; if(v) any = true; });
  if(!any){ const i = document.getElementById('int_'+INTENT_FIELDS[kind][0][0]); if(i) i.focus(); return; }
  (kind==='month' ? intentStore().months : intentStore().weeks)[key] = rec;
  intentStore().prompted[kind==='month' ? 'M'+key : 'W'+key] = todayStr();
  persist('journal'); playPositive();
  const o = document.getElementById('intOverlay'); if(o){ o.classList.remove('is-in'); setTimeout(function(){ o.classList.add('hidden'); }, 260); }
  showToast(kind==='month' ? 'Locked in for '+monthName(key)+'.' : 'This week is set.', {icon:'&#127769;'});
  if(typeof notifBadge==='function') notifBadge();
  // the month first, then the week
  if(kind==='month' && !weekIntent()) setTimeout(function(){ openIntentForm('week', true); }, 700);
  renderView();
};
// the Calendar tab asks (once a month, once a week): month first
afterRenderHooks.push(function(){
  if(ui.view!=='calendar' || document.querySelector('.overlay:not(.hidden)')) return;
  const p = intentStore().prompted, mk = 'M'+monthKey(), wk = 'W'+weekKey();
  const kind = !monthIntent() && !p[mk] ? 'month' : !weekIntent() && !p[wk] ? 'week' : null;
  if(!kind || ui._intAsked===kind+(kind==='month' ? mk : wk)) return;
  ui._intAsked = kind+(kind==='month' ? mk : wk);
  // never on top of something you just opened — it asks again on the next visit
  setTimeout(function(){ if(ui.view!=='calendar') return; if(document.querySelector('.overlay:not(.hidden):not(#intOverlay)')){ ui._intAsked = null; return; } openIntentForm(kind, true); }, 450);
});
// a strip at the top of the Calendar: the month's and the week's, one click to change them
function intentStripHtml(){
  const m = monthIntent(), w = weekIntent();
  const pill = function(kind, label, val){ return '<button class="int-pill'+(val ? '' : ' is-empty')+'" data-action="openIntent" data-id="'+kind+'"><small>'+label+'</small><span>'+(val ? escapeHtml(val) : 'Set it &#8594;')+'</span></button>'; };
  return '<div class="int-strip">'+
    pill('month', monthName(monthKey())+' · goal', m && m.goal)+pill('month', 'Habit to beat', m && m.habit)+pill('week', 'This week', w && (w.focus || w.win))+'</div>';
}
// ---- Good morning: the month and the week, a different one each day (a time capsule, when one is
// due, takes the stage — they're rare). Your streak and level sit on top. ----
function intentOfDay(){
  const m = monthIntent() || {}, w = weekIntent() || {};
  const list = [];
  if(m.goal) list.push({k:'This month’s goal', v:m.goal, say:'This month’s goal: '+m.goal+'.'});
  if(w.focus) list.push({k:'This week’s focus', v:w.focus, say:'This week, it’s about '+w.focus+'.'});
  if(m.habit) list.push({k:'The habit you’re beating', v:m.habit, say:'And remember the habit you’re beating: '+m.habit+'.'});
  if(w.win) list.push({k:'This week is a win if', v:w.win, say:'This week is a win if '+w.win+'.'});
  if(m.note) list.push({k:'You told yourself this month', v:m.note, say:'Something you told yourself this month.'});
  if(w.note) list.push({k:'For the week', v:w.note, say:'A note you left for the week.'});
  if(!list.length) return null;
  return list[dayNum() % list.length];
}
function briefIntentHtml(){
  const cap = typeof dueCapsule==='function' ? dueCapsule() : null;
  if(cap){
    openCapsule(cap);
    return {voice:'And a message from you, from '+fmtDateShort(cap.writtenOn)+'.', html:'<div class="br-k bi-k">&#9203; From Past You</div><div class="bi-one"><small>Written '+fmtDateShort(cap.writtenOn)+(cap.title ? ' &middot; '+escapeHtml(cap.title) : '')+'</small><p>'+escapeHtml(cap.text)+'</p></div>'};
  }
  // one message a day — the month's goal, the week's focus, the habit you're beating… — big, with room
  const it = intentOfDay(), m = monthIntent(), mk = monthKey();
  if(!it) return {voice:'A new month’s a new step — set your intentions when you get a minute.', html:'<div class="br-k bi-k">&#127769; '+escapeHtml(monthName(mk))+'</div><div class="bi-one is-empty"><p>What’s this month about?</p><button class="bi-set" data-action="openIntent" data-id="'+(m ? 'week' : 'month')+'">Set '+(m ? 'this week' : 'the month')+' &#8594;</button></div>'+quarterHtml()};
  return {voice:it.say, html:'<div class="br-k bi-k">&#127769; '+escapeHtml(monthName(mk))+'<button class="bi-edit" data-action="openIntent" data-id="month" title="Your month and week">&#9998;</button></div>'+
    '<div class="bi-one"><small>'+escapeHtml(it.k)+'</small><p>'+escapeHtml(it.v)+'</p></div>'+quarterHtml()};
}
// the quarter, business-style: how many days are left in this one (and in the year)
function quarterInfo(d){
  d = d ? new Date(d+'T12:00') : new Date(); d.setHours(12, 0, 0, 0);
  const q = Math.floor(d.getMonth()/3), start = new Date(d.getFullYear(), q*3, 1, 12), end = new Date(d.getFullYear(), q*3+3, 1, 12);
  const day = 86400000, total = Math.round((end - start)/day), left = Math.round((end - d)/day), yEnd = new Date(d.getFullYear()+1, 0, 1, 12);
  return {q:q+1, year:d.getFullYear(), left:left, total:total, pct:(total - left)/total, yearLeft:Math.round((yEnd - d)/day), nextQ:q===3 ? 'Q1 '+(d.getFullYear()+1) : 'Q'+(q+2)};
}
function quarterHtml(){
  const x = quarterInfo();
  return '<div class="bi-q"><div class="bi-q-t"><b>Q'+x.q+'</b><span><b>'+x.left+'</b> day'+(x.left===1?'':'s')+' left</span><em>Day '+(x.total - x.left + 1)+' of '+x.total+'</em></div>'+
    '<i class="bi-q-bar"><u style="width:'+(x.pct*100).toFixed(1)+'%"></u></i>'+
    (x.q < 4 ? '<div class="bi-q-s">'+x.yearLeft+' days left in '+x.year+'</div>' : '')+'</div>';
}
// the HUD on Good morning: your level like a game shows it, bottom left — badge, level, rank, XP, streak
function briefHudHtml(){
  if(typeof xpSummary!=='function') return '';
  const x = xpSummary(), r = RANKS[x.rank], streak = computeStreak();
  return '<div class="b4-hud" data-action="openYou" title="Your card" style="--rc:'+r.color+'">'+rankBadgeSvg(x.rank, 38)+
    '<div class="b4-hud-m"><div class="b4-hud-t"><b>LVL '+x.level+'</b><span>'+escapeHtml(r.name)+'</span></div>'+
    '<i class="b4-hud-bar"><u style="width:'+(x.levelPct*100).toFixed(1)+'%"></u></i>'+
    '<div class="b4-hud-s"><span>'+(x.canLevel ? '<em class="b4-hud-up">Level up ready</em>' : x.blocked && x.blocked.length ? '<em class="b4-hud-warn">&#9888; needs '+escapeHtml(x.blocked.join(' & '))+'</em>' : Math.min(x.total - x.levelLo, x.levelHi - x.levelLo).toLocaleString()+' / '+(x.levelHi - x.levelLo).toLocaleString()+' XP')+'</span><span>&#128293; '+streak+'</span></div></div></div>';
}
