// ============ XP, LEVELS, RANKS & YOUR CARD ============
// A game you play by living the right way. Everyone starts at level 0, rank 0 — "Locked In": the
// point is to stay consistent and not lose yourself to brain fog. Levels are slow on purpose: each
// one costs 1,000 XP plus 150 for every level you already have — a good week of work for the first,
// more after that. Every session still moves the bar (20 minutes is about 3 XP); the big jumps come
// from what changes the business and the body: clients won, MRR added, followers gained, goals done.
// Ranks need three things: the level, the MRR, and the body (your Health score) — you can't
// rank up on work alone.
// XP comes from the day (deep work, tasks, workouts — the first ones count big — shooting,
// outreach), consistency (strong days in a row multiply the day), clients you win, and MRR: every
// $1k above where you started is worth 800 XP — and it's taken back if MRR drops.
// Your card (NBA 2K style) rates you 25–100 on four things, and an overall. 100 is you at your very
// best — the body, the business and the decisions all there at once — so it's meant to be rare:
//   Business (MRR, clients, time put in, client growth, business content)
//   Personal (personal content, video ideas, your goals, reflection)
//   Health (BMI for your height — scales with any weight — and training, how often and how steady)
//   Discipline (days on target, your streak, how often you lock in)
const RANKS = [
  {name:'Locked In',   level:0,  mrr:0,     health:0,  color:'#8fd3ff', tag:'Entrepreneur mode'},
  {name:'Operator',    level:3,  mrr:2500,  health:40, color:'#5fd4c4', tag:'Showing up'},
  {name:'Specialist',  level:6,  mrr:5000,  health:50, color:'#6fc3ff', tag:'Good at the thing'},
  {name:'Closer',      level:10, mrr:10000, health:55, color:'#a98bff', tag:'Deals get done'},
  {name:'Captain',     level:15, mrr:20000, health:60, color:'#ff8fb1', tag:'Others follow'},
  {name:'Commander',   level:20, mrr:35000, health:65, color:'#ffc56b', tag:'Runs the field'},
  {name:'Director',    level:26, mrr:50000, health:70, color:'#ff9a6b', tag:'Built to last'},
  {name:'Mogul',       level:33, mrr:70000, health:75, color:'#7ef0c0', tag:'Owns the game'},
  {name:'Millionaire', level:40, mrr:83400, health:80, color:'#fff2b0', tag:'A million a year'}
];
const XP_RATES = {mrrPerK:800, client:750, follower:1, goal:500, video:50, hourBase:10, hourAbove:18, longDay:40, outreach:20};
// total XP to reach level L: 1,000 a level plus 150 more for each level before it
function xpForLevel(L){ return 1000*L + 75*L*(L-1); }
function xpLevelOf(total){ let L = 0; while(xpForLevel(L+1) <= total) L++; return L; }
// goals count once they've stayed done for a day (an accidental tick doesn't pay; un-ticking or
// deleting one takes it away again); periodic ones (this week's workouts…) don't count here
function xpGoals(){
  const p = state.profile, seen = (p.xpGoalSeen && typeof p.xpGoalSeen==='object') ? p.xpGoalSeen : (p.xpGoalSeen = {});
  const now = Date.now(), done = arr(state.goals && state.goals.items).filter(function(g){ return g.done && !(typeof goalIsPeriodic==='function' && goalIsPeriodic(g)); });
  const ids = {}; let changed = false, counted = 0, pending = 0;
  done.forEach(function(g){ ids[g.id] = 1; if(!seen[g.id]){ seen[g.id] = now; changed = true; } if(now - seen[g.id] >= 86400000) counted++; else pending++; });
  Object.keys(seen).forEach(function(id){ if(!ids[id]){ delete seen[id]; changed = true; } });
  if(changed) persist('profile');
  return {counted:counted, pending:pending};
}
// followers you've gained since you started (GoHighLevel / Instagram, when connected)
function xpFollowersNow(){
  try{
    let total = 0, any = false;
    const sd = typeof socialData==='function' ? socialData() : null, f = sd && sd.platformTotals && sd.platformTotals.followers;
    if(f) Object.keys(f).forEach(function(k){ const n = Number(f[k] && f[k].total); if(n){ total += n; any = true; } });
    if(typeof igFollowersTotal==='function'){ const ig = igFollowersTotal(); if(ig!=null){ total = Math.max(total, ig); any = true; } }
    return any ? total : null;
  }catch(e){ return null; }
}
function xpMrr(){ return arr(state.business.clients).filter(function(c){ return clientStageActive(c.stage); }).reduce(function(a, c){ return a + Number(c.mrr||0); }, 0); }
// the day the game began (you start at 0 — nothing before it counts), and where MRR stood then
function xpStart(){
  const p = state.profile;
  if(!p.xpStart){ p.xpStart = todayStr(); p.xpMrrBase = xpMrr(); p.xpClientsBase = arr(state.business.clients).map(function(c){ return c.id; }); persist('profile'); }
  return p.xpStart;
}
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
  // the body is a big part of this: training pays more than an hour of work
  if(ctx.trained(d)){
    const k = ctx.workoutIndex[d], w = ctx.workoutWeekIndex[d];
    add('workout', k<=5 ? 150 : w===1 ? 70 : w===2 ? 60 : w===3 ? 50 : 25, k<=5 ? 'Workout #'+k+' — the first few count big' : 'Workout ('+w+(w===1?'st':w===2?'nd':w===3?'rd':'th')+' this week)');
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
  gym.forEach(function(d){ gymSet[d] = true; });
  const gymDays = Object.keys(gymSet).sort();
  let k = 0; gymDays.forEach(function(d){ k++; workoutIndex[d] = k; const ws = startOfWeekStr(d); workoutWeekIndex[d] = gymDays.filter(function(x){ return x>=ws && x<=d; }).length; });
  const shootMin = {}; arr(state.modes.history).forEach(function(m){ if(m.type==='shooting') shootMin[m.date] = (shootMin[m.date]||0) + Number(m.minutes||0); });
  const touches = {};
  ['clients', 'pipeline'].forEach(function(k){ arr(state.business[k]).forEach(function(x){ arr(x.touches).forEach(function(t){ const d = typeof t==='string' ? t : t && t.date; if(d) touches[d] = (touches[d]||0) + 1; }); }); });
  const jDays = {}; arr(state.journal.entries).forEach(function(e){ if(e.date) jDays[e.date] = true; });
  const deepMemo = {};
  return {doneOn:doneOn, trained:function(d){ return !!gymSet[d]; }, gymDays:gymDays, workoutIndex:workoutIndex, workoutWeekIndex:workoutWeekIndex, shootMin:shootMin, touches:touches,
    journaled:function(d){ return !!jDays[d]; }, jDays:jDays,
    target: state.standards.deepWorkTargetMinutes || 180,
    deep:function(d){ if(deepMemo[d]==null) deepMemo[d] = d===todayStr() ? deepWorkMinutesTodayLive() : deepWorkMinutesFor(d); return deepMemo[d]; }};
}
// past days don't change often: keep them, recount only today (and everything when the data changes)
let xpCache = {sig:'', days:{}};
function xpSig(){ return [arr(state.focus.sessions).length, state.tasks.items.filter(function(t){ return t.status==='done'; }).length, arr(state.health.gymLog).length, arr(state.modes.history).length, arr(state.journal.entries).length, state.standards.deepWorkTargetMinutes, state.profile.xpStart, arr(state.goals && state.goals.items).filter(function(g){ return g.done; }).length].join('|'); }
// (renders often — the full count is reused for a few seconds unless something changed)
let xpLast = null;
function xpSummary(){
  const sig = xpSig(), mrrNow = xpMrr();
  if(xpLast && xpLast.sig===sig && xpLast.mrr===mrrNow && Date.now()-xpLast.at < 15000) return xpLast.v;
  const v = xpSummaryFresh(); xpLast = {sig:sig, mrr:mrrNow, at:Date.now(), v:v}; return v;
}
function xpSummaryFresh(){
  const start = xpStart();
  const sig = xpSig(); if(sig!==xpCache.sig) xpCache = {sig:sig, days:{}};
  const ctx = xpCtx(), today = todayStr();
  let total = 0, week = 0; const ws = startOfWeekStr(today);
  for(let d = start; d <= today; d = addDays(d, 1)){
    let items = d===today ? null : xpCache.days[d];
    if(!items){ items = xpDay(d, ctx); if(d!==today) xpCache.days[d] = items; }
    const sum = items.reduce(function(a, x){ return a + x.xp; }, 0);
    total += sum; if(d >= ws) week += sum;
  }
  const p = state.profile, mrr = xpMrr(), base = Number(p.xpMrrBase||0);
  const won = arr(state.business.clients).filter(function(c){ return arr(p.xpClientsBase).indexOf(c.id) < 0; }).length;
  const mrrXp = Math.round((mrr - base)/1000*XP_RATES.mrrPerK), clientXp = won*XP_RATES.client;
  const goals = xpGoals(), goalXp = goals.counted*XP_RATES.goal;
  const fNow = xpFollowersNow(); if(fNow!=null && p.xpFollowersBase==null){ p.xpFollowersBase = fNow; persist('profile'); }
  const followers = fNow!=null && p.xpFollowersBase!=null ? fNow - p.xpFollowersBase : 0, followerXp = Math.round(followers*XP_RATES.follower);
  total = Math.max(0, total + mrrXp + clientXp + goalXp + followerXp);
  const todayItems = xpDay(today, ctx);
  const level = xpLevelOf(total), lo = xpForLevel(level), hi = xpForLevel(level+1);
  const attrs = xpAttributes(ctx);
  // rank = the highest one where you have the level, the MRR and the body
  let rank = 0; RANKS.forEach(function(r, i){ if(level >= r.level && mrr >= r.mrr && attrs.HLT.v >= r.health) rank = i; });
  const next = RANKS[rank+1] || null;
  const needs = next ? [level < next.level ? 'level '+next.level : '', mrr < next.mrr ? money(next.mrr)+' MRR' : '', attrs.HLT.v < next.health ? 'Health '+next.health : ''].filter(Boolean) : [];
  return {total:total, week:week, today:todayItems, todayXp:todayItems.reduce(function(a, x){ return a + x.xp; }, 0),
    mrr:mrr, mrrBase:base, mrrXp:mrrXp, clientXp:clientXp, won:won, start:start, goalXp:goalXp, goals:goals, followers:followers, followerXp:followerXp,
    level:level, levelLo:lo, levelHi:hi, levelPct:(total - lo)/(hi - lo),
    rank:rank, next:next, needs:needs, attrs:attrs, ovr:attrs.OVR};
}

// ---- the four ratings (25–99) ----
const rate99 = function(f){ return Math.round(25 + 75*Math.max(0, Math.min(1, f))); };
// height in inches (Settings → You); weight from your weigh-ins (lb, or kg if you've set kg)
function bodyStats(){
  const p = state.profile, h = Number(p.heightIn)||0;
  const log = arr(state.health.weightLog).filter(function(w){ return Number(w.weight) > 0; }).sort(function(a, b){ return a.date.localeCompare(b.date); });
  const w = log.length ? Number(log[log.length-1].weight) : 0, kg = p.weightUnit==='kg';
  if(!h || !w) return {h:h, w:w, kg:kg, bmi:null};
  const lb = kg ? w*2.20462 : w, bmi = 703*lb/(h*h);
  // the lines for your height: where "healthy" ends (BMI 25) and "obese" starts (BMI 30)
  const at = function(b){ const v = b*h*h/703; return Math.round(kg ? v/2.20462 : v); };
  return {h:h, w:w, kg:kg, bmi:bmi, healthyMax:at(25), obeseAt:at(30), healthyMin:at(18.5),
    cls: bmi < 18.5 ? 'Underweight' : bmi < 25 ? 'Healthy' : bmi < 30 ? 'Overweight' : bmi < 35 ? 'Obese' : 'Obese (class 2+)'};
}
// any weight, any height: the score falls off smoothly the further BMI is from the healthy range
// (the very top is the lean middle of the healthy range — "the best you've looked", not just "not overweight")
function bmiFactor(b){ if(b==null) return null; if(b < 18.5) return Math.max(0, 0.85 - (18.5-b)/5); if(b < 20) return 0.9; if(b <= 24) return 1; if(b <= 25) return 0.92; if(b <= 30) return 0.85 - (b-25)*0.07; return Math.max(0, 0.5 - (b-30)*0.05); }
function xpAttributes(ctx){
  const today = todayStr(), target = ctx.target;
  const daysBack = function(n, f){ let c = 0; for(let i=0;i<n;i++) if(f(addDays(today, -i))) c++; return c; };
  const within = function(d, n){ return d && d > addDays(today, -n) && d <= today; };
  const tasks = state.tasks.items, cs = arr(state.business.clients);
  const isPersonal = function(t){ return arr(t.clients).indexOf('personal')>=0 || t.client==='personal'; };
  const mix = function(parts){ let s = 0, w = 0; parts.forEach(function(p){ if(p[1]==null) return; s += p[0]*p[1]; w += p[0]; }); return w ? s/w : 0; };
  const sub = function(label, f, note){ return {label:label, v:f==null ? null : rate99(f), note:note||''}; };
  // business
  const mrr = xpMrr(), active = cs.filter(function(c){ return clientStageActive(c.stage); }).length;
  let deep14 = 0; for(let i=1;i<=14;i++) deep14 += ctx.deep(addDays(today, -i)); deep14 /= 14;
  const newClients = cs.filter(function(c){ return within(c.startDate || c.createdAt, 90); }).length;
  // (posts on your Instagram business account count too, when it's connected)
  const bizVids = Math.max(tasks.filter(function(t){ return t.isVideoIdea && t.status==='done' && within(t.completedAt, 30) && !isPersonal(t); }).length, (typeof igPostsByRole==='function' && igPostsByRole('business')) || 0);
  // (each one at 100 is the best version: a million a year, a full roster, well past your daily target…)
  const B = [sub('MRR', Math.sqrt(mrr/83400), money(mrr)+' a month'), sub('Clients', active/15, active+' active'), sub('Time put in', deep14/(target*1.33), fmtHours(Math.round(deep14))+' a day lately'),
    sub('Client growth', newClients/4, newClients+' new in 90 days'), sub('Business content', bizVids/12, bizVids+' posted in 30 days')];
  // personal
  const perVids = Math.max(tasks.filter(function(t){ return t.isVideoIdea && t.status==='done' && within(t.completedAt, 30) && isPersonal(t); }).length, (typeof igPostsByRole==='function' && igPostsByRole('personal')) || 0);
  const ideas = tasks.filter(function(t){ return t.isVideoIdea && within(t.createdAt, 30); }).length;
  const goals = arr(state.goals && state.goals.items).filter(function(g){ return !g.autoTrack; });
  const goalF = goals.length && typeof goalPct==='function' ? goals.reduce(function(a, g){ return a + (g.done ? 100 : goalPct(g)); }, 0)/goals.length/100 : null;
  const jd = daysBack(14, ctx.journaled);
  const P = [sub('Personal content', perVids/12, perVids+' posted in 30 days'), sub('Video ideas', ideas/15, ideas+' new in 30 days'), sub('Your goals', goalF, goals.length ? Math.round(goalF*100)+'% of the way' : 'Add a goal'),
    sub('Reflection', jd/10, jd+' journal days in 2 weeks')];
  // health
  const body = bodyStats(), w28 = ctx.gymDays.filter(function(d){ return within(d, 28); }).length;
  let steady = 0; for(let i=0;i<4;i++){ const a = addDays(today, -7*(i+1)), b = addDays(today, -7*i); if(ctx.gymDays.filter(function(d){ return d > a && d <= b; }).length >= 4) steady++; }
  const H = [sub('Body (BMI)', bmiFactor(body.bmi), body.bmi ? body.bmi.toFixed(1)+' · '+body.cls : 'Add height & weight'), sub('Training', w28/20, w28+' workouts in 4 weeks'), sub('Consistency', steady/4, steady+' of 4 weeks with 4+')];
  // discipline
  const onTarget = daysBack(14, function(d){ return ctx.deep(d) >= target; }), streak = computeStreak();
  const lockIns = arr(state.focus.sessions).filter(function(s){ return within(s.date, 14); }).length;
  const D = [sub('On target', onTarget/13, onTarget+' of 14 days'), sub('Streak', streak/30, streak+' day'+(streak===1?'':'s')), sub('Locking in', lockIns/28, lockIns+' sessions in 2 weeks')];
  const score = function(list, ws){ return rate99(mix(list.map(function(s, i){ return [ws[i], s.v==null ? null : (s.v-25)/74]; }))); };
  const out = {
    BUS:{name:'Business', short:'BUS', v:score(B, [.35, .15, .25, .15, .10]), subs:B, color:'#ffc56b'},
    PER:{name:'Personal', short:'PER', v:score(P, [.3, .2, .25, .25]), subs:P, color:'#c3a6ff'},
    HLT:{name:'Health', short:'HLT', v:score(H, [.5, .3, .2]), subs:H, color:'#7ef0c0', body:body},
    DIS:{name:'Discipline', short:'DIS', v:score(D, [.4, .3, .3]), subs:D, color:'#8fd3ff'}
  };
  // 100 overall only when every rating is 100
  const ovr = .3*out.BUS.v + .3*out.HLT.v + .2*out.DIS.v + .2*out.PER.v;
  out.OVR = ovr >= 99.999 ? 100 : Math.min(99, Math.floor(ovr));
  return out;
}

// ---- the look ----
function rankBadgeSvg(i, size){
  const r = RANKS[i], s = size||34;
  return '<svg class="xp-badge" viewBox="0 0 40 40" width="'+s+'" height="'+s+'" aria-hidden="true"><defs><linearGradient id="xpg'+i+'" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="#fff" stop-opacity=".9"/><stop offset=".45" stop-color="'+r.color+'"/><stop offset="1" stop-color="'+r.color+'" stop-opacity=".55"/></linearGradient></defs>'+
    '<path d="M20 2 L35 10 L35 26 Q35 33 20 38 Q5 33 5 26 L5 10 Z" fill="url(#xpg'+i+')" stroke="rgba(255,255,255,.55)" stroke-width="1"/>'+
    '<text x="20" y="25" text-anchor="middle" font-size="13" font-weight="800" fill="#10131a" font-family="var(--font-display)">'+i+'</text></svg>';
}
function initialsOf(n){ const p = String(n||'').trim().split(/\s+/).filter(Boolean); return ((p[0]||'?')[0]+(p[1] ? p[1][0] : '')).toUpperCase(); }
// the card, NBA 2K style: overall, rank, level, the four ratings, the bar to the next level
function playerCardHtml(where){
  const x = xpSummary(), r = RANKS[x.rank], name = state.profile.name || 'You';
  return '<button class="pc pc-'+(where||'hero')+' tier-'+x.rank+'" data-action="openYou" style="--rc:'+r.color+'" title="Your card — open the overview">'+
    '<span class="pc-shine"></span>'+
    '<span class="pc-top"><span class="pc-ovr"><b>'+x.ovr+'</b><small>OVR</small></span><span class="pc-rk">'+rankBadgeSvg(x.rank, 30)+'<small>RANK '+x.rank+'</small></span></span>'+
    '<span class="pc-face"><span>'+escapeHtml(initialsOf(name))+'</span></span>'+
    '<span class="pc-name">'+escapeHtml(name)+'</span>'+
    '<span class="pc-pos">'+escapeHtml(r.name)+' &middot; LVL '+x.level+'</span>'+
    '<span class="pc-attrs">'+['BUS', 'PER', 'HLT', 'DIS'].map(function(k){ const a = x.attrs[k]; return '<span style="--ac:'+a.color+'"><b>'+a.v+'</b><small>'+k+'</small></span>'; }).join('')+'</span>'+
    '<span class="pc-xp"><i><u style="width:'+(x.levelPct*100).toFixed(1)+'%"></u></i><small>'+(x.total - x.levelLo).toLocaleString()+' / '+(x.levelHi - x.levelLo).toLocaleString()+' XP</small></span>'+
  '</button>';
}
// next to LOCK IN: the front of the card is just your level (and rank); click and it turns over to
// the overall, the four ratings and the XP — and "Your card →" for everything else (Personal → You)
function playerCardMiniHtml(){
  const x = xpSummary(), r = RANKS[x.rank];
  return '<div class="pcf'+(ui.pcFlip ? ' is-flipped' : '')+'" style="--rc:'+r.color+'">'+
    '<button class="pcf-face pcf-front" data-action="pcFlip" title="Turn the card over">'+
      '<span class="pc-shine"></span><small class="pcf-k">LEVEL</small><b class="pcf-lvl">'+x.level+'</b>'+
      '<span class="pcf-rank">'+rankBadgeSvg(x.rank, 22)+escapeHtml(r.name)+'</span>'+
      '<i class="pcf-bar"><u style="width:'+(x.levelPct*100).toFixed(1)+'%"></u></i></button>'+
    '<div class="pcf-face pcf-back" data-action="pcFlip" title="Turn it back">'+
      '<span class="pcf-ovr"><b>'+x.ovr+'</b><small>OVR</small></span>'+
      '<span class="pc-attrs">'+['BUS', 'PER', 'HLT', 'DIS'].map(function(k){ const a = x.attrs[k]; return '<span style="--ac:'+a.color+'"><b>'+a.v+'</b><small>'+k+'</small></span>'; }).join('')+'</span>'+
      '<small class="pcf-xp">'+(x.levelHi - x.total).toLocaleString()+' XP to level '+(x.level+1)+'</small>'+
      '<button class="pcf-open" data-action="openYou">Your card &rarr;</button></div>'+
  '</div>';
}
ACTIONS.pcFlip = function(el){ ui.pcFlip = !ui.pcFlip; const c = el && el.closest('.pcf'); if(c) c.classList.toggle('is-flipped', !!ui.pcFlip); playTick(); };
// (kept for older callers)
function xpChipHtml(){ return playerCardHtml('hero'); }

// ---- "You": the overview (Personal → You, or click the card) — the card, your level and the ranks,
// then the four ratings and your body side by side. Fits on one screen.
function renderYouTab(){
  const x = xpSummary(), r = RANKS[x.rank], body = x.attrs.HLT.body;
  const attrCard = function(k){ const a = x.attrs[k]; return '<div class="you-attr" style="--ac:'+a.color+'"><div class="you-attr-h"><b>'+a.v+'</b><span>'+a.name+'</span></div>'+
    a.subs.map(function(s){ return '<div class="you-sub" title="'+escapeHtml(s.note)+'"><span>'+escapeHtml(s.label)+'</span><i><u style="width:'+(s.v==null ? 0 : (s.v-25)/75*100).toFixed(1)+'%"></u></i><b>'+(s.v==null ? '—' : s.v)+'</b></div>'; }).join('')+'</div>'; };
  const u = body.kg ? 'kg' : 'lb';
  return '<div class="you">'+
    '<div class="you-top">'+playerCardHtml('big')+
      '<div class="you-main">'+
        '<div class="you-lvl">Level <b>'+x.level+'</b> <span style="color:'+r.color+'">'+escapeHtml(r.name)+'</span></div>'+
        '<div class="you-xpbar"><i><u style="width:'+(x.levelPct*100).toFixed(1)+'%"></u></i><span>'+(x.levelHi - x.total).toLocaleString()+' XP to level '+(x.level+1)+' &middot; +'+x.todayXp.toLocaleString()+' today &middot; +'+x.week.toLocaleString()+' this week</span></div>'+
        (x.next ? '<div class="you-next">Next rank: <b style="color:'+x.next.color+'">'+x.next.name+'</b> — '+(x.needs.length ? 'needs '+x.needs.map(function(n){ return '<b>'+escapeHtml(n)+'</b>'; }).join(', ') : 'yours')+'</div>' : '<div class="you-next">The top. A million a year.</div>')+
        // the ranks as one small track
        '<div class="you-track">'+RANKS.map(function(rk, i){ const st = i<x.rank ? 'is-done' : i===x.rank ? 'is-cur' : ''; return '<span class="you-tr '+st+'" style="--rc:'+rk.color+'" title="'+escapeHtml(rk.name)+' — level '+rk.level+(rk.mrr ? ', '+money(rk.mrr)+' MRR, Health '+rk.health : '')+'">'+rankBadgeSvg(i, 22)+'<small>'+escapeHtml(rk.name)+'</small></span>'; }).join('')+'</div>'+
        '<button class="you-howbtn" data-action="openXpHow">How leveling works &#8594;</button>'+
      '</div></div>'+
    '<div class="you-attrs">'+['BUS', 'PER', 'HLT', 'DIS'].map(attrCard).join('')+
      '<div class="you-body"><div class="you-sec">Your body</div>'+(body.bmi ?
        '<div class="you-bmi"><b>'+body.bmi.toFixed(1)+'</b><span>BMI &middot; '+body.cls+'</span></div>'+
        '<div class="you-bmi-scale">'+bmiScaleHtml(body)+'</div>'        : '<div class="you-note">Add your height and weight in Settings → You and your card rates your body too — ranks need it.</div><button class="btn btn-sm" data-action="goToProfileSettings">Add height &amp; weight</button>')+'</div>'+
    '</div>'+xpChartHtml()+'</div>';
}
// the last 30 days of XP, a bar a day — the climb, at a glance
function xpChartHtml(){
  const ctx = xpCtx(), today = todayStr(), start = xpStart(), days = [];
  for(let i=29;i>=0;i--){
    const d = addDays(today, -i);
    if(d < start){ days.push({d:d, xp:null}); continue; }
    const items = (d!==today && xpCache.days[d]) || xpDay(d, ctx);
    days.push({d:d, xp:items.reduce(function(a, x){ return a + x.xp; }, 0)});
  }
  const got = days.filter(function(x){ return x.xp!=null; }), sum = got.reduce(function(a, x){ return a + x.xp; }, 0);
  const top = Math.max(100, ...got.map(function(x){ return x.xp; })), best = got.reduce(function(b, x){ return !b || x.xp > b.xp ? x : b; }, null);
  return '<div class="you-chart"><div class="you-chart-h"><span class="you-sec">Last 30 days</span><span><b>'+sum.toLocaleString()+'</b> XP'+(best && best.xp ? ' &middot; best day <b>+'+best.xp+'</b>' : '')+'</span></div>'+
    '<div class="you-bars">'+days.map(function(x){
      const h = x.xp==null ? 0 : Math.max(x.xp ? 4 : 2, x.xp/top*100);
      return '<i class="'+(x.xp==null ? 'is-pre' : '')+(x.d===today ? ' is-today' : '')+'" title="'+escapeHtml(fmtDateShort(x.d))+(x.xp==null ? ' — before you started' : ': +'+x.xp+' XP')+'"><u style="height:'+h.toFixed(1)+'%"></u></i>';
    }).join('')+'</div></div>';
}
// the scale for your height, in pounds (or kg): healthy · overweight · obese, and where you are
function bmiScaleHtml(b){
  const lo = 15, hi = 40, pos = function(v){ return ((Math.max(lo, Math.min(hi, v)) - lo)/(hi - lo)*100).toFixed(1); }, u = b.kg ? 'kg' : 'lb';
  return '<div class="bmi-you" style="left:'+pos(b.bmi)+'%"><b>'+b.w+'</b> '+u+'</div>'+
    '<div class="bmi-bar"><i style="left:0;width:'+pos(18.5)+'%" class="u"></i><i style="left:'+pos(18.5)+'%;width:'+(pos(25)-pos(18.5))+'%" class="h"></i><i style="left:'+pos(25)+'%;width:'+(pos(30)-pos(25))+'%" class="o"></i><i style="left:'+pos(30)+'%;right:0" class="ob"></i>'+
    '<b style="left:'+pos(b.bmi)+'%"></b></div>'+
    '<div class="bmi-lab"><span style="left:'+pos(18.5)+'%">'+b.healthyMin+'</span><span style="left:'+pos(25)+'%">'+b.healthyMax+'</span><span style="left:'+pos(30)+'%">'+b.obeseAt+'</span></div>'+
    '<div class="bmi-legend"><span class="h">Healthy</span><span class="o">Overweight</span><span class="ob">Obese</span></div>';
}
ACTIONS.openYou = function(){ ui.view = 'personal'; ui.personalTab = 'you'; renderView(); };
ACTIONS.openXp = ACTIONS.openYou;
ACTIONS.closeXp = function(){};

// ---- the SYSTEM: XP you can see — when you lock out, finish things, level up ----
function sysSound(kind){
  if(typeof tone!=='function') return;
  if(kind==='level'){ [523, 659, 784, 1047].forEach(function(f, i){ setTimeout(function(){ tone([f], 0.22, 0.22); }, i*110); }); setTimeout(function(){ tone([784, 1047, 1319], 0.7, 0.2); }, 480); }
  else if(kind==='gain') tone([880, 1320], 0.16, 0.12);
}
// a "SYSTEM" window: the bar fills from where you were to where you are, like a fight won
function xpSystemShow(o){
  const old = document.getElementById('sysWin'); if(old) old.remove();
  const d = document.createElement('div'); d.id = 'sysWin'; d.className = 'sys-win'+(o.levelUp ? ' is-level' : '');
  const fromPct = Math.max(0, Math.min(100, o.fromPct*100)), toPct = Math.max(0, Math.min(100, o.toPct*100));
  d.innerHTML = '<div class="sys-card"><div class="sys-k">[ SYSTEM ]</div>'+
    '<div class="sys-title">'+o.title+'</div>'+(o.sub ? '<div class="sys-sub">'+o.sub+'</div>' : '')+
    (o.lines && o.lines.length ? '<div class="sys-lines">'+o.lines.map(function(l){ return '<div><span>'+escapeHtml(l.why)+'</span><b>+'+l.xp+' XP</b></div>'; }).join('')+'</div>' : '')+
    '<div class="sys-gain">+<span id="sysGainN">0</span> XP</div>'+
    '<div class="sys-bar"><i><u id="sysBarU" style="width:'+fromPct.toFixed(1)+'%"></u></i><span>LVL '+o.level+'</span></div>'+
    (o.levelUp ? '<div class="sys-lvl">LEVEL UP<small>You are now level '+o.level+'</small></div>' : '')+
    '<button class="sys-ok" data-action="sysClose">OK</button></div>';
  document.body.appendChild(d);
  requestAnimationFrame(function(){ d.classList.add('is-in'); });
  // the number counts up while the bar fills
  const n = d.querySelector('#sysGainN'), u = d.querySelector('#sysBarU'), t0 = Date.now(), dur = 1300;
  setTimeout(function(){ if(u){ u.style.transition = 'width 1.3s cubic-bezier(.2,.8,.2,1)'; u.style.width = (o.levelUp ? 100 : toPct).toFixed(1)+'%'; } }, 350);
  if(o.levelUp) setTimeout(function(){ if(u){ u.style.transition = 'none'; u.style.width = '0%'; requestAnimationFrame(function(){ u.style.transition = 'width .8s cubic-bezier(.2,.8,.2,1)'; u.style.width = toPct.toFixed(1)+'%'; }); } d.classList.add('is-leveled'); sysSound('level'); }, 1750);
  else sysSound('gain');
  const tick = setInterval(function(){ const k = Math.min(1, (Date.now()-t0-350)/dur); if(n) n.textContent = Math.max(0, Math.round(o.gained*k)).toLocaleString(); if(k>=1) clearInterval(tick); }, 40);
  clearTimeout(xpSystemShow._t); xpSystemShow._t = setTimeout(function(){ ACTIONS.sysClose(); }, o.levelUp ? 9000 : 6500);
}
ACTIONS.sysClose = function(){ const d = document.getElementById('sysWin'); if(!d) return; d.classList.remove('is-in'); d.classList.add('is-out'); setTimeout(function(){ if(d.parentNode) d.remove(); }, 300); };
// a small one for finishing a task
function xpToast(gained, why){
  if(!(gained > 0)) return;
  let t = document.getElementById('sysToast');
  if(!t){ t = document.createElement('div'); t.id = 'sysToast'; t.className = 'sys-toast'; document.body.appendChild(t); }
  t.innerHTML = '<span>[ SYSTEM ]</span> '+escapeHtml(why)+' <b>+'+gained+' XP</b>';
  t.classList.remove('is-in'); void t.offsetWidth; t.classList.add('is-in');
  clearTimeout(xpToast._t); xpToast._t = setTimeout(function(){ t.classList.remove('is-in'); }, 2600);
}
function sysNote(msg){
  let t = document.getElementById('sysToast');
  if(!t){ t = document.createElement('div'); t.id = 'sysToast'; t.className = 'sys-toast'; document.body.appendChild(t); }
  t.innerHTML = '<span>[ SYSTEM ]</span> '+escapeHtml(msg);
  t.classList.remove('is-in'); void t.offsetWidth; t.classList.add('is-in');
  clearTimeout(xpToast._t); xpToast._t = setTimeout(function(){ t.classList.remove('is-in'); }, 3200);
}
// What you've already been shown (kept, so a level up is celebrated once). Watching for changes:
// a lock-out shows the full window (after its own stamp), a finished task a small "+XP", and any
// level up gets the fanfare.
function xpSeen(){ const p = state.profile; if(!p.xpSeen || typeof p.xpSeen!=='object') p.xpSeen = {total:0, level:0}; return p.xpSeen; }
function xpWatch(){
  if(!state || !state.profile) return;
  xpStart();
  const sessions = arr(state.focus.sessions).length, doneN = state.tasks.items.filter(function(t){ return t.status==='done'; }).length, act = !!state.focus.activeSession;
  if(ui._xpW) ui._xpW.a = act;
  if(ui._xpW==null){ ui._xpW = {s:sessions, d:doneN, a:act}; const x0 = xpSummary(), seen = xpSeen(); if(!seen.init){ seen.total = x0.total; seen.level = x0.level; seen.init = 1; persist('profile'); } return; }
  const w = ui._xpW, lockedOut = sessions > w.s, finished = doneN > w.d;
  w.s = sessions; w.d = doneN;
  if(!lockedOut && !finished) return;
  const seen = xpSeen(), before = {total:seen.total, level:seen.level};
  xpLast = null; const x = xpSummary();
  const gained = x.total - before.total;
  seen.total = x.total; seen.level = Math.max(seen.level, x.level); persist('profile');
  const levelUp = x.level > before.level;
  if(lockedOut || levelUp){
    const last = arr(state.focus.sessions).slice(-1)[0];
    setTimeout(function(){ xpSystemShow({title: lockedOut ? 'Session complete.' : 'Level up.', sub: lockedOut && last ? fmtDurationLabel(last.minutes)+' of deep work logged.' : '',
      lines:[], gained:Math.max(0, gained), level:x.level, levelUp:levelUp,
      fromPct: levelUp ? (before.total - xpForLevel(before.level))/(xpForLevel(before.level+1) - xpForLevel(before.level)) : (before.total - x.levelLo)/(x.levelHi - x.levelLo), toPct:x.levelPct}); }, lockedOut ? 2300 : 300);
  } else if(finished) xpToast(gained, 'Task complete.');
}
afterRenderHooks.push(function(){ try{ xpWatch(); }catch(e){} });

// ---- how leveling works: its own page (the You tab stays clean) ----
ACTIONS.openXpHow = function(){
  let o = document.getElementById('xpHowOverlay');
  if(!o){ o = document.createElement('div'); o.id = 'xpHowOverlay'; o.className = 'overlay xph-ov'; o.innerHTML = '<div class="card xph" id="xpHowContent"></div>'; document.body.appendChild(o); o.addEventListener('pointerdown', function(e){ if(e.target===o) o.classList.add('hidden'); }); }
  const row = function(a, b){ return '<div class="xph-r"><span>'+a+'</span><b>'+b+'</b></div>'; };
  document.getElementById('xpHowContent').innerHTML =
    '<button class="xph-x" data-action="closeXpHow">&#10005;</button>'+
    '<div class="xph-k">[ SYSTEM ]</div><h2>How leveling works</h2>'+
    '<div class="xph-cols">'+
      '<div><div class="xph-sec">Every day</div>'+
        row('Deep work', XP_RATES.hourBase+' XP an hour ('+XP_RATES.hourAbove+' above your usual)')+row('Long day (6h+)', '+'+XP_RATES.longDay)+row('Tasks done', '12 · 8 · 4 each')+
        row('Workout', '150 (first five), then 70 → 25 a week')+row('Shooting', '8 XP an hour')+row('Outreach', 'from '+XP_RATES.outreach)+row('Strong days in a row', 'up to ×1.28')+
      '</div>'+
      '<div><div class="xph-sec">The big jumps</div>'+
        row('Client won', '+'+XP_RATES.client)+row('Every $1k of MRR added', '+'+XP_RATES.mrrPerK+' (lost if it drops)')+row('Follower gained', '+'+XP_RATES.follower)+row('Goal done (stays done a day)', '+'+XP_RATES.goal)+
        '<div class="xph-sec">Levels</div>'+row('Level 1', xpForLevel(1).toLocaleString()+' XP')+row('Level 5', xpForLevel(5).toLocaleString()+' XP')+row('Level 10', xpForLevel(10).toLocaleString()+' XP')+row('Level 40', xpForLevel(40).toLocaleString()+' XP')+
      '</div>'+
      '<div><div class="xph-sec">Ranks need all three</div>'+RANKS.map(function(r, i){ return row('<span style="color:'+r.color+'">'+i+' · '+r.name+'</span>', 'LVL '+r.level+(r.mrr ? ' · '+money(r.mrr)+' · HLT '+r.health : '')); }).join('')+'</div>'+
    '</div>'+
    '<div class="xph-sec">Your ratings (25–100)</div><div class="xph-rates">'+
      '<div><b style="color:#ffc56b">Business</b>MRR, clients, time put in, client growth, business content</div>'+
      '<div><b style="color:#c3a6ff">Personal</b>Personal content, video ideas, your goals, journaling</div>'+
      '<div><b style="color:#7ef0c0">Health</b>BMI for your height, training, consistency</div>'+
      '<div><b style="color:#8fd3ff">Discipline</b>Days on target, streak, locking in</div>'+
    '</div><div class="xph-foot">100 is you at your best in everything — the overall only hits 100 when all four do.</div>';
  o.classList.remove('hidden');
};
ACTIONS.closeXpHow = function(){ const o = document.getElementById('xpHowOverlay'); if(o) o.classList.add('hidden'); };
