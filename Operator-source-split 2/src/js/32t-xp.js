// ============ XP & RANKS ============
// The point of all this: a million a year. Nine ranks, few on purpose — each one needs XP *and* an
// MRR you actually hold (XP alone never gets you there). MRR is the biggest source of XP: every
// $1k of monthly recurring is worth a lot, and it goes back down if MRR does. New clients and
// finished videos (side quests) are next. Time, tasks, workouts, shooting and outreach are the
// everyday base — they pay less once they're your normal (your own recent average sets the bar),
// a few strong days in a row multiply them, and the first workouts are worth extra.
const RANKS = [
  {name:'Recruit',     mrr:0,     xp:0,      color:'#9aa3b5'},
  {name:'Operator',    mrr:2500,  xp:1500,   color:'#5fd4c4'},
  {name:'Specialist',  mrr:5000,  xp:5000,   color:'#6fc3ff'},
  {name:'Closer',      mrr:10000, xp:12000,  color:'#a98bff'},
  {name:'Captain',     mrr:20000, xp:28000,  color:'#ff8fb1'},
  {name:'Commander',   mrr:35000, xp:55000,  color:'#ffc56b'},
  {name:'Director',    mrr:50000, xp:95000,  color:'#ff9a6b'},
  {name:'Mogul',       mrr:70000, xp:150000, color:'#7ef0c0'},
  {name:'Millionaire', mrr:83400, xp:230000, color:'#fff2b0'}
];
const XP_RATES = {mrrPerK:400, client:300, video:50, hourBase:10, hourAbove:18, longDay:40, outreach:20};
function xpMrr(){ return arr(state.business.clients).filter(function(c){ return clientStageActive(c.stage); }).reduce(function(a, c){ return a + Number(c.mrr||0); }, 0); }
// your standard: the average deep work over the 14 days before this one (it rises as you do)
function xpStandardFor(d, deepOf){ let s = 0; for(let i=1;i<=14;i++) s += deepOf(addDays(d, -i)); return s/14; }
// everything earned on one day, itemised
function xpDay(d, ctx){
  const items = [];
  const add = function(k, xp, why){ if(xp) items.push({k:k, xp:Math.round(xp), why:why}); };
  const deep = ctx.deep(d), std = xpStandardFor(d, ctx.deep);
  if(deep){
    const base = Math.min(deep, std), above = Math.max(0, deep - std);
    add('time', base/60*XP_RATES.hourBase + above/60*XP_RATES.hourAbove, fmtDurationLabel(deep)+' of deep work'+(above>0 && std>0 ? ' ('+fmtDurationLabel(above)+' above your normal)' : ''));
    if(deep >= 360) add('long', XP_RATES.longDay, 'Long day (6h+)');
  }
  const done = ctx.doneOn[d] || {tasks:0, videos:0};
  if(done.tasks){ let x = 0; for(let i=0;i<done.tasks;i++) x += i<3 ? 12 : i<6 ? 8 : 4; add('tasks', x, done.tasks+' task'+(done.tasks===1?'':'s')+' done'); }
  if(done.videos) add('videos', done.videos*XP_RATES.video, done.videos+' video'+(done.videos===1?'':'s')+' finished');
  if(ctx.trained(d)){
    const k = ctx.workoutIndex[d], w = ctx.workoutWeekIndex[d];
    add('workout', k<=5 ? 120 : w===1 ? 45 : w===2 ? 35 : w===3 ? 25 : 15, k<=5 ? 'Workout #'+k+' — the first few count big' : 'Workout ('+w+(w===1?'st':w===2?'nd':w===3?'rd':'th')+' this week)');
  }
  const shoot = ctx.shootMin[d]||0; if(shoot) add('shoot', shoot/60*8, fmtDurationLabel(shoot)+' shooting');
  const t = ctx.touches[d]||0; if(t) add('outreach', XP_RATES.outreach + Math.min(30, (t-1)*3), t+' outreach touch'+(t===1?'':'es'));
  // consistency: strong days in the last week multiply the day's effort
  let strong = 0; for(let i=0;i<7;i++) if(ctx.deep(addDays(d, -i)) >= ctx.target) strong++;
  const mult = 1 + 0.04*strong, base = items.reduce(function(a, x){ return a + x.xp; }, 0);
  if(strong >= 2 && base) items.push({k:'streak', xp:Math.round(base*(mult-1)), why:'×'+mult.toFixed(2)+' — '+strong+' strong days this week'});
  return items;
}
function xpCtx(){
  const doneOn = {};
  state.tasks.items.forEach(function(t){ if(t.status!=='done' || !t.completedAt) return; const o = doneOn[t.completedAt] = doneOn[t.completedAt] || {tasks:0, videos:0}; if(t.isVideoIdea) o.videos++; else o.tasks++; });
  const gym = arr(state.health.gymLog).map(function(g){ return g.date; }).filter(Boolean).sort();
  const gymSet = {}, workoutIndex = {}, workoutWeekIndex = {};
  gym.forEach(function(d){ if(gymSet[d]) return; gymSet[d] = true; });
  let k = 0; Object.keys(gymSet).sort().forEach(function(d){ k++; workoutIndex[d] = k; const ws = startOfWeekStr(d); workoutWeekIndex[d] = Object.keys(gymSet).filter(function(x){ return x>=ws && x<=d; }).length; });
  const shootMin = {}; arr(state.modes.history).forEach(function(m){ if(m.type==='shooting') shootMin[m.date] = (shootMin[m.date]||0) + Number(m.minutes||0); });
  const touches = {};
  ['clients', 'pipeline'].forEach(function(k){ arr(state.business[k]).forEach(function(x){ arr(x.touches).forEach(function(t){ const d = typeof t==='string' ? t : t && t.date; if(d) touches[d] = (touches[d]||0) + 1; }); }); });
  const deepMemo = {};
  return {doneOn:doneOn, trained:function(d){ return !!gymSet[d]; }, workoutIndex:workoutIndex, workoutWeekIndex:workoutWeekIndex, shootMin:shootMin, touches:touches,
    target: state.standards.deepWorkTargetMinutes || 180,
    deep:function(d){ if(deepMemo[d]==null) deepMemo[d] = d===todayStr() ? deepWorkMinutesTodayLive() : deepWorkMinutesFor(d); return deepMemo[d]; }};
}
// the first day there's anything to count
function xpFirstDay(){
  let first = todayStr();
  arr(state.focus.sessions).forEach(function(s){ if(s.date && s.date < first) first = s.date; });
  state.tasks.items.forEach(function(t){ if(t.completedAt && t.completedAt < first) first = t.completedAt; });
  arr(state.health.gymLog).forEach(function(g){ if(g.date && g.date < first) first = g.date; });
  return first < addDays(todayStr(), -730) ? addDays(todayStr(), -730) : first;
}
// past days don't change often: keep them, recount only today (and everything when the data changes)
let xpCache = {sig:'', days:{}};
function xpSig(){ return [arr(state.focus.sessions).length, state.tasks.items.filter(function(t){ return t.status==='done'; }).length, arr(state.health.gymLog).length, arr(state.modes.history).length, state.standards.deepWorkTargetMinutes].join('|'); }
// (renders often — the full count is reused for a few seconds unless something changed)
let xpLast = null;
function xpSummary(){
  const sig = xpSig(), mrrNow = xpMrr();
  if(xpLast && xpLast.sig===sig && xpLast.mrr===mrrNow && Date.now()-xpLast.at < 15000) return xpLast.v;
  const v = xpSummaryFresh(); xpLast = {sig:sig, mrr:mrrNow, at:Date.now(), v:v}; return v;
}
function xpSummaryFresh(){
  const sig = xpSig(); if(sig!==xpCache.sig) xpCache = {sig:sig, days:{}};
  const ctx = xpCtx(), today = todayStr();
  let total = 0, week = 0; const ws = startOfWeekStr(today);
  for(let d = xpFirstDay(); d <= today; d = addDays(d, 1)){
    let items = d===today ? null : xpCache.days[d];
    if(!items){ items = xpDay(d, ctx); if(d!==today) xpCache.days[d] = items; }
    const sum = items.reduce(function(a, x){ return a + x.xp; }, 0);
    total += sum; if(d >= ws) week += sum;
  }
  const mrr = xpMrr(), clientsEver = arr(state.business.clients).length;
  const mrrXp = Math.floor(mrr/1000)*XP_RATES.mrrPerK, clientXp = clientsEver*XP_RATES.client;
  total += mrrXp + clientXp;
  const todayItems = xpDay(today, ctx);
  // rank = the highest one where you have both the XP and the MRR
  let rank = 0; RANKS.forEach(function(r, i){ if(total >= r.xp && mrr >= r.mrr) rank = i; });
  const next = RANKS[rank+1] || null;
  const lockedByMrr = !!(next && total >= next.xp && mrr < next.mrr);
  return {total:total, week:week, today:todayItems, todayXp:todayItems.reduce(function(a, x){ return a + x.xp; }, 0), mrr:mrr, mrrXp:mrrXp, clientXp:clientXp, clientsEver:clientsEver, rank:rank, next:next, lockedByMrr:lockedByMrr,
    pct: next ? Math.max(0, Math.min(1, (total - RANKS[rank].xp)/(next.xp - RANKS[rank].xp))) : 1};
}
function rankBadgeSvg(i, size){
  const r = RANKS[i], s = size||34, n = i+1;
  return '<svg class="xp-badge" viewBox="0 0 40 40" width="'+s+'" height="'+s+'" aria-hidden="true"><defs><linearGradient id="xpg'+i+'" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="#fff" stop-opacity=".9"/><stop offset=".45" stop-color="'+r.color+'"/><stop offset="1" stop-color="'+r.color+'" stop-opacity=".55"/></linearGradient></defs>'+
    '<path d="M20 2 L35 10 L35 26 Q35 33 20 38 Q5 33 5 26 L5 10 Z" fill="url(#xpg'+i+')" stroke="rgba(255,255,255,.55)" stroke-width="1"/>'+
    '<text x="20" y="25" text-anchor="middle" font-size="13" font-weight="800" fill="#10131a" font-family="var(--font-display)">'+n+'</text></svg>';
}
function xpChipHtml(){
  const x = xpSummary(), r = RANKS[x.rank];
  return '<button class="xp-chip" data-action="openXp" style="--rc:'+r.color+'" title="Your rank — click for the breakdown">'+rankBadgeSvg(x.rank, 30)+
    '<span class="xp-chip-t"><b>'+r.name+'</b><span>'+x.total.toLocaleString()+' XP'+(x.todayXp ? ' · +'+x.todayXp+' today' : '')+'</span>'+
      '<i class="xp-bar"><u style="width:'+(x.pct*100).toFixed(1)+'%"></u></i>'+
      (x.next ? '<small>'+(x.lockedByMrr ? '&#128274; '+x.next.name+' needs '+money(x.next.mrr)+' MRR' : (x.next.xp - x.total).toLocaleString()+' XP to '+x.next.name)+'</small>' : '<small>The top. A million a year.</small>')+
    '</span></button>';
}
ACTIONS.openXp = function(){
  let o = document.getElementById('xpOverlay');
  if(!o){ o = document.createElement('div'); o.id = 'xpOverlay'; o.className = 'overlay xp-ov'; o.innerHTML = '<div class="card xp-m" id="xpContent"></div>'; document.body.appendChild(o); o.addEventListener('pointerdown', function(e){ if(e.target===o) o.classList.add('hidden'); }); }
  const x = xpSummary(), r = RANKS[x.rank];
  document.getElementById('xpContent').innerHTML =
    '<button class="xp-x" data-action="closeXp">&#10005;</button>'+
    '<div class="xp-hero" style="--rc:'+r.color+'">'+rankBadgeSvg(x.rank, 76)+'<div><div class="xp-k">Rank '+(x.rank+1)+' of '+RANKS.length+'</div><div class="xp-name">'+r.name+'</div><div class="xp-sub">'+x.total.toLocaleString()+' XP &middot; +'+x.week.toLocaleString()+' this week</div></div></div>'+
    (x.next ? '<div class="xp-next"><i class="xp-bar is-big"><u style="width:'+(x.pct*100).toFixed(1)+'%"></u></i><div>'+(x.lockedByMrr ? '&#128274; You have the XP for <b>'+x.next.name+'</b> — it unlocks at <b>'+money(x.next.mrr)+'</b> MRR (you’re at '+money(x.mrr)+').' : '<b>'+(x.next.xp - x.total).toLocaleString()+' XP</b> and <b>'+money(x.next.mrr)+' MRR</b> to '+x.next.name+'.')+'</div></div>' : '')+
    '<div class="xp-cols"><div><div class="xp-sec">Today</div>'+(x.today.length ? x.today.map(function(i){ return '<div class="xp-row"><span>'+escapeHtml(i.why)+'</span><b>+'+i.xp+'</b></div>'; }).join('') : '<div class="xp-empty">Nothing yet today.</div>')+
      '<div class="xp-sec">Always on</div><div class="xp-row"><span>MRR '+money(x.mrr)+' ('+XP_RATES.mrrPerK+' per $1k — goes down if MRR does)</span><b>'+x.mrrXp.toLocaleString()+'</b></div><div class="xp-row"><span>'+x.clientsEver+' client'+(x.clientsEver===1?'':'s')+' won</span><b>'+x.clientXp.toLocaleString()+'</b></div></div>'+
      '<div><div class="xp-sec">The ladder</div>'+RANKS.map(function(rk, i){ const st = i<x.rank ? 'is-done' : i===x.rank ? 'is-cur' : ''; return '<div class="xp-step '+st+'" style="--rc:'+rk.color+'">'+rankBadgeSvg(i, 22)+'<b>'+rk.name+'</b><span>'+rk.xp.toLocaleString()+' XP &middot; '+(rk.mrr ? money(rk.mrr)+' MRR' : '—')+'</span></div>'; }).join('')+'</div></div>'+
    '<div class="xp-how"><b>How XP works.</b> MRR is the big one — '+XP_RATES.mrrPerK+' XP for every $1k of monthly recurring, taken back if it drops. Each client won is '+XP_RATES.client+'; each finished video '+XP_RATES.video+'. Time, tasks, workouts, shooting and outreach are the everyday base: deep work is '+XP_RATES.hourBase+' XP an hour up to your normal (your last two weeks) and '+XP_RATES.hourAbove+' above it; the first tasks of the day are worth the most; your first five workouts are 120 each. Strong days in a row multiply the day (up to ×1.28). Ranks need the MRR too — a million a year is the top.</div>';
  o.classList.remove('hidden');
};
ACTIONS.closeXp = function(){ const o = document.getElementById('xpOverlay'); if(o) o.classList.add('hidden'); };
