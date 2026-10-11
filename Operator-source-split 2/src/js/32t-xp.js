// ============ XP, LEVELS, RANKS & YOUR CARD ============
// A game you play by living the right way. Everyone starts at level 0, rank 0 ("Locked In"): the
// point is to stay consistent and not lose yourself to brain fog.
// Like a ranked game: your level is your account. It only goes up, nothing gates it, and it runs to
// 100. Levels cost a lot: level 1 is about a client won, level 2 about two more, and every level after
// costs more than the last, so the top is years of locked-in living. Rank is the real thing: it needs
// the level, the MRR and your Health score, so you can't rank up on work alone.
// XP comes from:
//   the day      deep work (8 hours is the gold standard: every hour pays more than the one before,
//                with extra for going past your normal), tasks (each one pays more than the last that
//                day), workouts (the first ones count big), shooting, outreach; strong days in a row
//                multiply it
//   goals        a weekly goal hit +150 (up to three a week), a monthly goal +500 (up to three a
//                month), beating the month's habit +500, checking in and out of the week and month
//                (+25/+50, +50/+100), a master goal reached +4,000 (MRR, weight, streak; raise the
//                bar and it pays again), every finished week you hit a weekly ring +100, your own
//                goals +500
//   the business every $1k of MRR above where you started +800 (taken back if it drops), a client
//                won +1,000, +1 a follower gained
// Your card (NBA 2K style) rates you 25 to 100 on four things, and an overall (see xpAttributes).
const RANKS = [
  {name:'Locked In',   level:0,  mrr:0,     health:0,  color:'#8fd3ff', tag:'Entrepreneur mode'},
  {name:'Operator',    level:5,  mrr:2500,  health:40, color:'#5fd4c4', tag:'Showing up'},
  {name:'Specialist',  level:12, mrr:5000,  health:50, color:'#6fc3ff', tag:'Good at the thing'},
  {name:'Closer',      level:20, mrr:10000, health:55, color:'#a98bff', tag:'Deals get done'},
  {name:'Captain',     level:30, mrr:20000, health:60, color:'#ff8fb1', tag:'Others follow'},
  {name:'Commander',   level:42, mrr:35000, health:65, color:'#ffc56b', tag:'Runs the field'},
  {name:'Director',    level:55, mrr:50000, health:70, color:'#ff9a6b', tag:'Built to last'},
  {name:'Mogul',       level:70, mrr:70000, health:75, color:'#7ef0c0', tag:'Owns the game'},
  {name:'Millionaire', level:85, mrr:83400, health:80, color:'#fff2b0', tag:'A million a year'}
];
const XP_RATES = {mrrPerK:800, client:1000, follower:1, goal:500, video:50, longDay:40, goldDay:100, outreach:10, outreachEach:6, outreachMax:15, taskMax:20};
const MASTER_XP = {milestone:4000, weekly:100};
// deep work: 8 hours a day is the gold standard. Hour 1 pays 10, each hour after pays 2.5 more (hour 8
// pays 27.5, 150 for the full eight), past 8 it's 15 an hour. On top: +8 an hour for the time past
// your own normal, +40 at 6 hours and +100 when you hit the full 8.
const DEEP_GOLD = 480;
function deepHourRate(h){ return h < 8 ? 10 + 2.5*h : 15; }
function xpDeep(min, normal){
  let xp = 0;
  for(let h = 0; h*60 < min; h++) xp += deepHourRate(h)*Math.min(60, min - h*60)/60;
  const above = normal > 0 ? Math.max(0, min - normal) : 0;
  xp += above/60*8;
  return {xp:xp, above:above};
}
// tasks: the more you finish in a day, the more each one pays (5, 7, 9 … up to 25 a task), counted
// up to 20 a day
function taskXpAt(i){ return Math.min(25, 3 + 2*i); }
function xpTasks(n){ let x = 0; for(let i=1;i<=Math.min(n, XP_RATES.taskMax);i++) x += taskXpAt(i); return x; }
// total XP to reach level L. Level 1 is 1,500 (about a client won), level 2 is 4,100, and each one
// after costs more: level 5 is about 15k, 20 about 115k, 50 about 440k, 100 about 1.2M.
const LEVEL_MAX = 100;
function xpForLevel(L){ return L <= 0 ? 0 : Math.round(1500*Math.pow(L, 1.45)/50)*50; }
function xpLevelOf(total){ let L = 0; while(L < LEVEL_MAX && xpForLevel(L+1) <= total) L++; return L; }
// (levels aren't gated: MRR and Health gate ranks, not levels)
function xpLevelGate(L){ return null; }
// the level you've claimed. The first time, you're given what you'd already reached (as far as the
// gates allow) — after that it only moves when you press Level up.
function xpClaimedLevel(earned, mrr, health){
  const p = state.profile;
  if(typeof p.xpLevel!=='number'){
    p.xpLevel = earned; p.xpCurve = 2; persist('profile');
  }
  // levels got steeper (round 22): a level claimed on the old, cheaper curve comes back down to what
  // your XP pays for now. Nothing earned is lost, it just buys less.
  if(p.xpCurve!==2){
    p.xpCurve = 2; p.xpLevel = Math.min(p.xpLevel, earned); p.xpReadyFor = null;
    if(p.xpSeen && typeof p.xpSeen==='object') p.xpSeen.level = p.xpLevel;
    persist('profile');
  }
  return p.xpLevel;
}
// your own goals count once they've stayed done for a day (an accidental tick doesn't pay; un-ticking or
// deleting one takes it away again); periodic ones (this week's workouts…) and the weekly / monthly
// check-in goals (xpCheckins) don't count here
function xpGoals(){
  const p = state.profile, seen = (p.xpGoalSeen && typeof p.xpGoalSeen==='object') ? p.xpGoalSeen : (p.xpGoalSeen = {});
  const now = Date.now(), done = arr(state.goals && state.goals.items).filter(function(g){ return g.done && !g.tier && !(typeof goalIsPeriodic==='function' && goalIsPeriodic(g)); });
  const ids = {}; let changed = false, counted = 0, pending = 0, xp = 0;
  done.forEach(function(g){ ids[g.id] = 1; if(!seen[g.id]){ seen[g.id] = now; changed = true; } if(now - seen[g.id] >= 86400000){ counted++; xp += goalXpOf(g); } else pending++; });
  Object.keys(seen).forEach(function(id){ if(!ids[id]){ delete seen[id]; changed = true; } });
  if(changed) persist('profile');
  return {counted:counted, pending:pending, xp:xp};
}
// the week and the month (32u): goals hit (three a period at most), the habit beaten, and showing up to
// check in and out — from the period the game began in
function xpCheckins(){
  const parts = {weekGoals:0, monthGoals:0, habits:0, shows:0};
  if(typeof intentStore!=='function') return {xp:0, parts:parts};
  const s = intentStore(), start = xpStart(), ws0 = weekKey(start), ms0 = monthKey(start);
  Object.keys(s.weeks).forEach(function(k){ if(k < ws0) return; const r = s.weeks[k] || {}; if(r.at) parts.shows += CHECKIN_XP.weekIn; if(r.out) parts.shows += CHECKIN_XP.weekOut; });
  Object.keys(s.months).forEach(function(k){ if(k < ms0) return; const r = s.months[k] || {}; if(r.at) parts.shows += CHECKIN_XP.monthIn; if(r.out){ parts.shows += CHECKIN_XP.monthOut; if(r.out.habit) parts.habits += CHECKIN_XP.habit; } });
  const per = {};
  arr(state.goals && state.goals.items).forEach(function(g){
    if(!g.tier || !g.done || (g.tier==='week' ? g.pk < ws0 : g.pk < ms0)) return;
    const k = g.tier+g.pk; per[k] = (per[k]||0) + 1; if(per[k] > CHECKIN_XP.maxGoals) return;
    if(g.tier==='week') parts.weekGoals += goalXpOf(g); else parts.monthGoals += goalXpOf(g);
  });
  return {xp:parts.weekGoals + parts.monthGoals + parts.habits + parts.shows, parts:parts};
}
// master goals (24c): the big milestones pay big, once each — MRR, your weight, your streak. Raise the
// bar and the next one pays again, as long as it's a real step (not a target nudged to farm it). The
// weekly rings (workouts, deep work) pay a little for every finished week you hit them.
function xpMaster(ctx){
  if(typeof masterGoalDefs!=='function') return {xp:0, hits:0, weeks:0};
  const p = state.profile, hit = (p.xpMasterHit && typeof p.xpMasterHit==='object') ? p.xpMasterHit : (p.xpMasterHit = {});
  let changed = false;
  masterGoalDefs().forEach(function(m){
    if(['mrr', 'weight', 'streak'].indexOf(m.key) < 0 || m.cur==null || !(m.target > 0) || masterPct(m) < 100) return;
    const list = hit[m.key] = arr(hit[m.key]), last = list.length ? list[list.length-1] : null, t = Number(m.target);
    const real = m.key==='mrr' ? t >= 1000 && (last==null || t >= last + 1000)
      : m.key==='streak' ? t >= 14 && (last==null || t >= last + 7)
      : m.start!=null && Math.abs(m.start - t) >= 5 && (last==null || Math.abs(last - t) >= 5);
    if(real && list.indexOf(t) < 0){ list.push(t); changed = true; }
  });
  if(changed) persist('profile');
  const hits = ['mrr', 'weight', 'streak'].reduce(function(a, k){ return a + arr(hit[k]).length; }, 0);
  let bigXp = 0; ['mrr', 'weight', 'streak'].forEach(function(k){ arr(hit[k]).forEach(function(t, i){ bigXp += masterXpFor(k, i ? hit[k][i-1] : masterBase(k), t); }); });
  const wT = p.weeklyWorkoutTarget || 0, dT = (p.weeklyDeepHoursGoal || Math.round((state.standards.deepWorkTargetMinutes||180)*5/60))*60;
  let weeks = 0, w = weekKey(xpStart()); if(w < xpStart()) w = addDays(w, 7);
  for(; addDays(w, 6) < todayStr(); w = addDays(w, 7)){
    if(wT){ let n = 0; for(let i=0;i<7;i++) if(ctx.trained(addDays(w, i))) n++; if(n >= wT) weeks++; }
    if(dT){ let m = 0; for(let i=0;i<7;i++) m += ctx.deep(addDays(w, i)); if(m >= dT) weeks++; }
  }
  return {xp:bigXp + weeks*MASTER_XP.weekly, hits:hits, weeks:weeks, bigXp:bigXp};
}
// What a master goal is worth scales with how big it is (so it's consistent, and a big one levels you up
// a lot): weight 150 XP a pound you set out to lose (or gain), MRR 600 XP for every $1k of growth, a streak
// 100 XP a day. At least 2,000 (1,500 for a streak), at most 20,000. Raising the bar pays for the step.
function masterBase(k){
  if(k==='weight') return typeof firstWeight==='function' ? firstWeight() : null;
  if(k==='mrr') return Number(state.profile.xpMrrBase || 0);
  return 0;
}
function masterXpFor(k, from, t){
  t = Number(t); from = from==null ? null : Number(from);
  if(k==='weight') return Math.min(20000, Math.max(2000, Math.round(Math.abs((from==null ? t : from) - t)*150/50)*50));
  if(k==='mrr') return Math.min(20000, Math.max(2000, Math.round((t - (from||0))/1000*600/50)*50));
  return Math.min(15000, Math.max(1500, Math.round((t - (from||0))*100)));
}
// what the master goal on screen pays when you reach it
function masterXpNow(m){
  const hit = (state.profile.xpMasterHit || {})[m.key], list = arr(hit), last = list.length ? list[list.length-1] : masterBase(m.key);
  return m.target > 0 ? masterXpFor(m.key, m.key==='weight' ? (list.length ? last : m.start) : last, m.target) : 0;
}
// a goal's own XP: Op sizes each one up when you add it (see 32y); until then, the usual amount
function goalXpOf(g){
  if(g && Number(g.xp) > 0) return Number(g.xp);
  return g && g.tier==='week' ? CHECKIN_XP.weekGoal : g && g.tier==='month' ? CHECKIN_XP.monthGoal : XP_RATES.goal;
}
// followers you've gained since you started (GoHighLevel / Instagram, when connected)
function xpFollowersNow(){
  try{
    let total = 0, any = false;
    // (from Metricool, an imported file or Meta; GoHighLevel's numbers aren't used)
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
    const dx = xpDeep(deep, std);
    add('time', dx.xp, fmtDurationLabel(deep)+' of deep work'+(dx.above>0 && std>0 ? ' ('+fmtDurationLabel(dx.above)+' past your normal)' : ''));
    if(deep >= DEEP_GOLD) add('gold', XP_RATES.goldDay, 'The gold standard: 8 hours');
    else if(deep >= 360) add('long', XP_RATES.longDay, 'Long day (6 hours or more)');
  }
  const done = ctx.doneOn[d] || {tasks:0, videos:0};
  if(done.tasks) add('tasks', xpTasks(done.tasks), done.tasks+' task'+(done.tasks===1?'':'s')+' done');
  if(done.videos) add('videos', done.videos*XP_RATES.video, done.videos+' video'+(done.videos===1?'':'s')+' finished');
  // the body is a big part of this: training pays more than an hour of work
  if(ctx.trained(d)){
    const k = ctx.workoutIndex[d], w = ctx.workoutWeekIndex[d];
    add('workout', k<=5 ? 150 : w===1 ? 70 : w===2 ? 60 : w===3 ? 50 : 25, k<=5 ? 'Workout #'+k+' (your first five count big)' : 'Workout, '+w+(w===1?'st':w===2?'nd':w===3?'rd':'th')+' this week');
  }
  const shoot = ctx.shootMin[d]||0; if(shoot) add('shoot', shoot/60*8, fmtDurationLabel(shoot)+' shooting');
  const t = ctx.touches[d]||0; if(t) add('outreach', XP_RATES.outreach + XP_RATES.outreachEach*(Math.min(t, XP_RATES.outreachMax) - 1), t+' reach-out'+(t===1?'':'s')+' to clients and leads');
  // consistency: strong days in the last week multiply the day's effort
  let strong = 0; for(let i=0;i<7;i++) if(ctx.deep(addDays(d, -i)) >= ctx.target) strong++;
  const mult = 1 + 0.04*strong, base = items.reduce(function(a, x){ return a + x.xp; }, 0);
  if(strong >= 2 && base) items.push({k:'streak', xp:Math.round(base*(mult-1)), why:'×'+mult.toFixed(2)+' for '+strong+' strong days this week'});
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
  // every reach-out you log on a client or a lead (the 👋 / Text / Email / Call buttons, and meetings
  // linked to them on the calendar). Older clients only kept the dates, so those count when there's
  // no touchpoint list.
  ['clients', 'pipeline'].forEach(function(k){ arr(state.business[k]).forEach(function(x){
    const list = arr(x.touchpoints).length ? arr(x.touchpoints) : arr(x.touches);
    list.forEach(function(t){ const d = typeof t==='string' ? t : t && t.date; if(d) touches[d] = (touches[d]||0) + 1; });
  }); });
  const deepMemo = {};
  return {doneOn:doneOn, trained:function(d){ return !!gymSet[d]; }, gymDays:gymDays, workoutIndex:workoutIndex, workoutWeekIndex:workoutWeekIndex, shootMin:shootMin, touches:touches,
    target: state.standards.deepWorkTargetMinutes || 180,
    deep:function(d){ if(deepMemo[d]==null) deepMemo[d] = d===todayStr() ? deepWorkMinutesTodayLive() : deepWorkMinutesFor(d); return deepMemo[d]; }};
}
// past days don't change often: keep them, recount only today (and everything when the data changes)
let xpCache = {sig:'', days:{}};
function xpSig(){ return [arr(state.focus.sessions).length, state.tasks.items.filter(function(t){ return t.status==='done'; }).length, arr(state.health.gymLog).length, arr(state.modes.history).length, state.standards.deepWorkTargetMinutes, state.profile.xpStart, arr(state.goals && state.goals.items).filter(function(g){ return g.done; }).length, arr(state.goals && state.goals.items).length, xpIntentSig(), state.profile.weeklyWorkoutTarget, state.profile.revenueGoalMonthly, state.profile.goalWeight, state.profile.streakGoal, xpTouchSig(), arr(state.health.calorieEntries).length, arr(state.health.weightLog).length, state.profile.calorieTarget, state.profile.heightIn].join('|'); }
function xpTouchSig(){ let n = 0; ['clients', 'pipeline'].forEach(function(k){ arr(state.business[k]).forEach(function(x){ n += arr(x.touchpoints).length + arr(x.touches).length; }); }); return n; }
function xpIntentSig(){ const s = state.journal && state.journal.intentions; if(!s) return ''; let n = 0; ['weeks', 'months'].forEach(function(k){ const o = s[k] || {}; Object.keys(o).forEach(function(x){ if(o[x] && o[x].at) n++; if(o[x] && o[x].out) n += 100 + (o[x].out.habit ? 1000 : 0); }); }); return n; }
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
  const goals = xpGoals(), ci = xpCheckins(), ms = xpMaster(ctx), goalXp = goals.xp + ci.xp + ms.xp;
  // (followers come from a new place since round 23: start counting gains from here, nothing taken away)
  if(p.xpFollowersSrc!==2){ p.xpFollowersKept = Math.max(0, Number(p.xpFollowersKept||0) + (p.xpFollowersBase!=null && p.xpFollowersLast!=null ? Math.max(0, p.xpFollowersLast - p.xpFollowersBase) : 0)); p.xpFollowersBase = null; p.xpFollowersSrc = 2; persist('profile'); }
  const fNow = xpFollowersNow(); if(fNow!=null && p.xpFollowersBase==null){ p.xpFollowersBase = fNow; persist('profile'); }
  if(fNow!=null && p.xpFollowersLast!==fNow){ p.xpFollowersLast = fNow; persist('profile'); }
  const followers = (fNow!=null && p.xpFollowersBase!=null ? fNow - p.xpFollowersBase : 0) + Number(p.xpFollowersKept||0), followerXp = Math.round(followers*XP_RATES.follower);
  total = Math.max(0, total + mrrXp + clientXp + goalXp + followerXp);
  const todayItems = xpDay(today, ctx);
  const attrs = xpAttributes(ctx);
  // Levels are claimed, not handed out: XP keeps stacking (nothing you do is ever wasted), and when you
  // have the XP for the next level a Level up button appears. You press it; it's yours.
  const earned = xpLevelOf(total), level = Math.min(LEVEL_MAX, xpClaimedLevel(earned, mrr, attrs.HLT.v)), maxed = level >= LEVEL_MAX;
  const lo = xpForLevel(level), hi = maxed ? lo : xpForLevel(level+1), gate = null;
  const pct = maxed ? 1 : Math.min(1, (total - lo)/(hi - lo));
  const canLevel = !maxed && total >= hi;
  const blocked = [];
  // rank = the highest one where you have the level, the MRR and the body
  let rank = 0; RANKS.forEach(function(r, i){ if(level >= r.level && mrr >= r.mrr && attrs.HLT.v >= r.health) rank = i; });
  const next = RANKS[rank+1] || null;
  const needs = next ? [level < next.level ? 'level '+next.level : '', mrr < next.mrr ? money(next.mrr)+' MRR' : '', attrs.HLT.v < next.health ? 'Health '+next.health : ''].filter(Boolean) : [];
  return {total:total, week:week, today:todayItems, todayXp:todayItems.reduce(function(a, x){ return a + x.xp; }, 0),
    mrr:mrr, mrrBase:base, mrrXp:mrrXp, clientXp:clientXp, won:won, start:start, goalXp:goalXp, goals:goals, ownGoalXp:goals.xp, checkins:ci, master:ms, followers:followers, followerXp:followerXp,
    level:level, earned:earned, levelLo:lo, levelHi:hi, levelPct:pct, banked:Math.max(0, total - hi), canLevel:canLevel, blocked:blocked, gate:gate, maxed:maxed,
    rank:rank, next:next, needs:needs, attrs:attrs, ovr:attrs.OVR};
}

// ---- the four ratings (25 to 100) ----
// Each thing is measured once, in one place. Nothing counts twice:
// Every stat is one word:
//   Business   MRR (to a million a year), Grind (hours of real work a day), Scaling (new clients
//              every month), Content (business videos)
//   Personal   Content (your own videos), Goals (weekly, monthly, master and
//              your own), Finances (like a credit score: debt drags it down, paying it off brings it up,
//              debt-free and earning tops it)
//   Health     what you've been doing lately counts most: Training and Diet (the last few weeks, the
//              latest week heaviest), then Weight (BMI for your height). Your weight also sets a
//              ceiling: carrying a lot of extra weight, even perfect training and eating top out around
//              60 until the weight comes down.
//   Discipline keeping your word: Reliability (things with a deadline, done by it) and Consistency
//              (completing everything, every week: the work, tasks, videos, training, food, goals, the
//              streak, and Op's check-ins; and which way it's going)
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
// diet: the last two weeks of food against your calorie target (this week counts double). A day on
// target (80% to 110%) is full marks; a bit over or a half-logged day counts some; a day you didn't log
// counts nothing. Today only counts once you've logged something.
function dietStats(){
  const ents = arr(state.health && state.health.calorieEntries);
  if(!ents.length) return null;
  const today = todayStr(), target = Number(state.profile.calorieTarget) || 2000, per = {};
  ents.forEach(function(c){ if(c.date) per[c.date] = (per[c.date]||0) + Number(c.calories||0); });
  let s = 0, w = 0, logged = 0, onT = 0;
  for(let i=0;i<14;i++){
    const d = addDays(today, -i), tot = per[d] || 0, wt = i < 7 ? 1 : 0.5;
    if(i===0 && !tot) continue;
    const r = tot/target;
    let f = !tot ? 0 : r < 0.5 ? (i===0 ? 1 : 0.5) : r < 0.8 ? (i===0 ? 1 : 0.85) : r <= 1.1 ? 1 : r <= 1.25 ? 0.6 : 0.25;
    if(tot){ logged++; if(r >= 0.8 && r <= 1.1) onT++; }
    s += f*wt; w += wt;
  }
  return w ? {f:s/w, logged:logged, onTarget:onT, target:target} : null;
}
// training: workouts against your number a week, the last four weeks, the latest week counting most
// (40%, 30%, 20%, 10%). A first good week back moves it straight away.
function trainingStats(ctx){
  const today = todayStr(), perWk = state.profile.weeklyWorkoutTarget || 4, wk = [0, 0, 0, 0];
  ctx.gymDays.forEach(function(d){ for(let k=0;k<4;k++) if(d > addDays(today, -7*(k+1)) && d <= addDays(today, -7*k)) wk[k]++; });
  const f = [.4, .3, .2, .1].reduce(function(a, x, k){ return a + x*Math.min(1, wk[k]/perWk); }, 0);
  return {f:f, weeks:wk, perWk:perWk, n:wk.reduce(function(a, x){ return a + x; }, 0)};
}
// the most your Health can be at your weight: no limit in the healthy range, then it comes down,
// about 78 at BMI 30, 60 at 35, 52 at 40, 45 past that
function healthCap(b){
  if(b==null) return 100;
  if(b < 18.5) return Math.max(70, Math.round(100 - (18.5-b)*12));
  if(b <= 25) return 100;
  if(b <= 30) return Math.round(100 - (b-25)*4.4);
  if(b <= 35) return Math.round(78 - (b-30)*3.6);
  if(b <= 40) return Math.round(60 - (b-35)*1.6);
  return Math.max(45, Math.round(52 - (b-40)*1.4));
}
// consistency: doing all of it, every week. For each of the last four weeks (the latest counts most):
// work days you hit your deep work target, workouts against your number, days you finished something,
// days you logged food (once you log food at all) and whether you checked in for the week (once you've
// started checking in). Then which way it's going: the last two weeks against the two before.
// Consistency: getting it all done, week after week: the work, your tasks, your videos, training (and
// food once you log it), then the weekly and monthly goals you hit, your streak, and how you've answered
// when Op checks in. The last two weeks count most, so it can turn around quickly.
function consistencyStats(ctx){
  const today = todayStr(), perWk = state.profile.weeklyWorkoutTarget || 4, target = ctx.target;
  const foodDays = {}; arr(state.health && state.health.calorieEntries).forEach(function(c){ if(c.date) foodDays[c.date] = 1; });
  const eatLogs = Object.keys(foodDays).length > 0;
  const checks = typeof checkedIn==='function' && typeof intentStore==='function' && Object.keys(intentStore().weeks||{}).length > 0;
  // videos: what you set for content (a week's worth), or two a week
  const ct = state.standards.contentTargets || {};
  const vidWk = ['business', 'personal'].reduce(function(a, r){ const t = ct[r]; return a + (t && t.n ? (t.per==='day' ? t.n*7 : t.n) : 0); }, 0) || 2;
  // from your first day of data (days before you used Operator don't count against you)
  const first = [xpStart()].concat(arr(state.focus.sessions).map(function(x){ return x.date; }), ctx.gymDays, Object.keys(ctx.doneOn)).filter(Boolean).sort()[0];
  const weeks = [];
  for(let k=0;k<4;k++){
    let workAim = 0, workHit = 0, taskDays = 0, vids = 0, trained = 0, food = 0, days = 0;
    for(let i=0;i<7;i++){
      const d = addDays(today, -(7*k + i));
      if(d < first) continue;
      const dn = ctx.doneOn[d] || {tasks:0, videos:0};
      const deepHit = ctx.deep(d) >= target, did = !!(dn.tasks || dn.videos);
      if(ctx.trained(d)) trained++;
      if(foodDays[d]) food++;
      vids += dn.videos || 0;
      if(d===today && !deepHit && !did) continue;
      days++;
      if(!isDayOff(d)){ workAim++; if(deepHit) workHit++; if(dn.tasks) taskDays++; }
    }
    if(!days){ weeks.push(null); continue; }
    const aim = Math.min(5, workAim) || 1, span = Math.min(7, days)/7;
    const parts = [Math.min(1, workHit/aim), Math.min(1, taskDays/aim), Math.min(1, vids/(vidWk*span || 1)), Math.min(1, trained/(perWk*span || 1))];
    if(eatLogs) parts.push(Math.min(1, food/Math.min(7, days)));
    if(checks) parts.push(checkedIn('week', weekKey(addDays(today, -7*k))) ? 1 : 0);
    weeks.push(parts.reduce(function(a, x){ return a + x; }, 0)/parts.length);
  }
  let s = 0, w = 0; [.4, .3, .2, .1].forEach(function(x, k){ if(weeks[k]!=null){ s += x*weeks[k]; w += x; } });
  const daily = w ? s/w : null;
  // the bigger picture: goals hit, the streak, and Op's check-ins (only the bad ones count against you)
  const wkF = tierHitRate('week', 4), moF = tierHitRate('month', 3);
  const streakF = Math.min(1, computeStreak()/21);
  const acctF = typeof acctScore==='function' ? acctScore() : null;
  const pieces = [[.55, daily], [.13, wkF], [.1, moF], [.1, streakF], [.12, acctF]];
  let ps = 0, pw = 0; pieces.forEach(function(p){ if(p[1]==null) return; ps += p[0]*p[1]; pw += p[0]; });
  if(!pw || (daily==null && acctF==null)) return null;
  const avg = function(a){ const v = a.filter(function(x){ return x!=null; }); return v.length ? v.reduce(function(p, x){ return p + x; }, 0)/v.length : null; };
  const now = avg(weeks.slice(0, 2)), before = avg(weeks.slice(2, 4));
  const trend = now==null || before==null ? 0 : now - before > 0.08 ? 1 : before - now > 0.08 ? -1 : 0;
  const parts = ['work', 'tasks', 'videos', 'training'].concat(eatLogs ? ['food'] : [], ['weekly and monthly goals', 'the streak'], acctF!=null ? ['check-ins'] : []);
  return {f:ps/pw, weeks:weeks, trend:trend, parts:parts};
}
// the weekly and monthly goals you hit, lately (a period still running only counts what's done)
function tierHitRate(kind, n){
  if(typeof tierGoals!=='function') return null;
  let d = 0, t = 0, k = periodKey(kind);
  for(let i=0;i<n;i++){ const gs = tierGoals(kind, k), hit = gs.filter(function(g){ return g.done; }).length; d += hit; t += i===0 ? hit : gs.length; k = prevPeriodKey(kind, k); }
  return t ? d/t : null;
}
function xpAttributes(ctx){
  const today = todayStr();
  const within = function(d, n){ return d && d > addDays(today, -n) && d <= today; };
  const tasks = state.tasks.items, cs = arr(state.business.clients);
  const isPersonal = function(t){ return arr(t.clients).indexOf('personal')>=0 || t.client==='personal'; };
  const mix = function(parts){ let s = 0, w = 0; parts.forEach(function(p){ if(p[1]==null) return; s += p[0]*p[1]; w += p[0]; }); return w ? s/w : 0; };
  const sub = function(label, f, note){ return {label:label, v:f==null ? null : rate99(f), note:note||''}; };
  // business
  const mrr = xpMrr();
  // grind: real, locked-in work a day over the last 30 days — 6 hours a day, every day, is 100
  let deep30 = 0; for(let i=1;i<=30;i++) deep30 += ctx.deep(addDays(today, -i)); deep30 /= 30;
  // scaling: landing your number of new clients every month, month after month — each of the last
  // three months counts on its own, so one big month can't carry it. (A client counts from its start
  // date — or the day a lead was won — not the day it was typed into Operator.)
  const perMonth = state.standards.newClientsPerMonth || 2;
  const newIn = function(a, b){ return cs.filter(function(c){ const sd = c.startDate || (c.fromLeadId ? c.createdAt : null); return sd && sd > addDays(today, -b) && sd <= addDays(today, -a); }).length; };
  const months = [newIn(0, 30), newIn(30, 60), newIn(60, 90)];
  const growthF = months.reduce(function(a, n){ return a + Math.min(1, n/perMonth); }, 0)/3;
  // content: what's out against what you set (Settings → Goals & Standards); Instagram posts count too
  const contentF = function(role){
    const tg = state.standards.contentTargets && state.standards.contentTargets[role];
    const done = Math.max(tasks.filter(function(t){ return t.isVideoIdea && t.status==='done' && within(t.completedAt, 30) && (typeof contentRoleOf==='function' ? contentRoleOf(t)===role : (role==='personal')===isPersonal(t)); }).length, (typeof igPostsByRole==='function' && igPostsByRole(role)) || 0);
    const want = tg && tg.n ? (tg.per==='day' ? tg.n*30 : tg.n*30/7) : 12;
    return {done:done, want:want};
  };
  // Content on both: business videos on Business, your own on Personal (both just called Content)
  const bc = contentF('business'), pc = contentF('personal');
  const cNote = function(c, kind){ return c.done+' '+kind+' video'+(c.done===1?'':'s')+' out in 30 days · aim '+Math.round(c.want); };
  const B = [sub('MRR', Math.sqrt(mrr/83400), money(mrr)+' a month · 100 at $83.4k (a million a year)'), sub('Grind', deep30/360*(typeof acctGrindMult==='function' ? acctGrindMult() : 1), fmtHours(Math.round(deep30))+' of real work a day (30 days) · 6h a day is 100'+(typeof acctGrindMult==='function' && acctGrindMult() < 1 ? ' · check-ins you were caught slacking pull it down' : '')),
    sub('Scaling', growthF, months[0]+' · '+months[1]+' · '+months[2]+' new (last 3 months) · aim '+perMonth+' a month'), sub('Content', bc.done/bc.want, cNote(bc, 'business'))];
  // personal
  const own = arr(state.goals && state.goals.items).filter(function(g){ return !g.tier && !(typeof goalIsPeriodic==='function' && goalIsPeriodic(g)) && g.target > 0; });
  const ownF = typeof goalPct==='function' && own.length ? own.reduce(function(a, g){ return a + (g.done ? 100 : goalPct(g)); }, 0)/own.length/100 : null;
  const masters = typeof masterGoalDefs==='function' ? masterGoalDefs().filter(function(m){ return ['mrr', 'weight', 'streak'].indexOf(m.key)>=0 && m.cur!=null && m.target > 0; }) : [];
  const masterF = masters.length ? masters.reduce(function(a, m){ return a + masterPct(m); }, 0)/masters.length/100 : null;
  const wkF = tierHitRate('week', 4), moF = tierHitRate('month', 3);
  const goalsF = (wkF==null && moF==null && masterF==null && ownF==null) ? null : mix([[.35, wkF], [.3, moF], [.2, masterF], [.15, ownF]]);
  const pct = function(f){ return f==null ? 'none yet' : Math.round(f*100)+'%'; };
  const fin = financeRating();
  const P = [sub('Content', pc.done/pc.want, cNote(pc, 'personal')),
    sub('Goals', goalsF, goalsF==null ? 'Check in for the week to start' : 'weekly '+pct(wkF)+' · monthly '+pct(moF)+' · master '+pct(masterF)+(ownF!=null ? ' · yours '+pct(ownF) : '')),
    sub('Finances', fin.f, fin.note)];
  // health: what you've done lately counts most, and your weight sets the ceiling
  const body = bodyStats(), tr = trainingStats(ctx), dt = dietStats();
  const H = [sub('Training', tr.f, tr.n+' workout'+(tr.n===1?'':'s')+' in 4 weeks, '+tr.weeks[0]+' in the last 7 days · aim '+tr.perWk+' a week'),
    sub('Diet', dt ? dt.f : null, dt ? dt.onTarget+' of the last 14 days on target, '+dt.logged+' logged · aim '+dt.target.toLocaleString()+' cal' : 'Log what you eat (the + on Health) and it counts'),
    sub('Weight', bmiFactor(body.bmi), body.bmi ? 'BMI '+body.bmi.toFixed(1)+' · '+body.cls : 'Add your height and weight')];
  // discipline: keeping your word
  const streak = computeStreak();
  const due = tasks.filter(function(t){ return t.deadline && t.deadline < today && t.deadline >= addDays(today, -30); });
  const onTime = due.filter(function(t){ return t.status==='done' && t.completedAt && t.completedAt <= t.deadline; }).length;
  const cs2 = consistencyStats(ctx);
  // (Integrity is gone: keeping your word day after day is what Consistency measures now)
  const D = [sub('Reliability', due.length >= 2 ? onTime/due.length : null, due.length >= 2 ? onTime+' of '+due.length+' deadlines met in 30 days' : 'Give tasks a deadline and it counts'),
    sub('Consistency', cs2 ? cs2.f : null, cs2 ? (cs2.trend > 0 ? 'Trending up' : cs2.trend < 0 ? 'Trending down' : 'Holding steady')+' · '+cs2.parts.join(', ')+', week by week' : 'Builds as you go')];
  if(cs2) D[1].trend = cs2.trend;
  const score = function(list, ws){ return rate99(mix(list.map(function(s, i){ return [ws[i], s.v==null ? null : (s.v-25)/75]; }))); };
  const out = {
    BUS:{name:'Business', short:'BUS', v:score(B, [.4, .25, .2, .15]), subs:B, color:'#ffc56b'},
    PER:{name:'Personal', short:'PER', v:score(P, [.3, .4, .3]), subs:P, color:'#c3a6ff'},
    HLT:{name:'Health', short:'HLT', v:0, subs:H, color:'#7ef0c0', body:body},
    DIS:{name:'Discipline', short:'DIS', v:0, subs:D, color:'#8fd3ff', streak:streak}
  };
  // Health can't go past what your weight allows
  const hRaw = score(H, [.45, .37, .18]), cap = healthCap(body.bmi);
  out.HLT.v = Math.min(hRaw, cap); out.HLT.cap = cap < 100 ? cap : null; out.HLT.capped = hRaw > cap;
  // discipline comes up quickly once you're consistent (the curve leans generous)
  const dMix = mix(D.map(function(x, i){ return [[.3, .7][i], x.v==null ? null : (x.v-25)/75]; }));
  out.DIS.v = rate99(Math.pow(dMix, 0.8));
  // Mind (on Personal): what you feed your head (Inspiration, logged on its own page) with your Health and Discipline
  const inspF = typeof inspScore==='function' ? inspScore() : null;
  const skF = typeof skillScore==='function' ? skillScore() : null;
  const mindF = inspF==null && skF==null ? null : mix([[.45, inspF], [.15, skF], [.2, (out.HLT.v-25)/75], [.2, (out.DIS.v-25)/75]]);
  P.push(sub('Mind', mindF,
    mindF==null ? 'Log walks, books, meditating, a clean room on Inspiration (and time your skills) and it counts' : (inspF!=null ? 'Inspiration '+rate99(inspF) : 'No Inspiration logged')+(skF!=null ? ' · skills '+rate99(skF) : '')+' · with your Health and Discipline'));
  out.PER.v = score(P, [.25, .3, .2, .25]);
  // 100 overall only when every rating is 100
  const ovr = .3*out.BUS.v + .3*out.HLT.v + .2*out.DIS.v + .2*out.PER.v;
  out.OVR = ovr >= 99.999 ? 100 : Math.min(99, Math.floor(ovr));
  return out;
}

// the average real work a day over the last n days (from your first day on Operator, if that's sooner;
// today counts once it's ahead of the average)
function avgWorkMinutes(n){
  const today = todayStr(), first = arr(state.focus.sessions).reduce(function(a, x){ return x.date && (!a || x.date < a) ? x.date : a; }, null);
  let from = addDays(today, -(n||14));
  if(first && first > from) from = first;
  let tot = 0, days = 0;
  for(let d = from; d < today; d = addDays(d, 1)){ tot += deepWorkMinutesFor(d); days++; }
  const live = deepWorkMinutesTodayLive();
  if(!days || live > tot/days){ tot += live; days++; }
  return days ? tot/days : 0;
}
// money, like a credit score (300–850): while you're in debt it sits low and climbs as you pay it down —
// paid off so far, and paying something every month (slow and steady counts). Debt-free starts high,
// and earning well on top of that tops it out.
function financeRating(){
  const f = state.finances || {}, debts = arr(f.debts), today = todayStr();
  const orig = debts.reduce(function(a, d){ return a + Number(d.originalAmount||d.balance||0); }, 0), bal = debts.reduce(function(a, d){ return a + Number(d.balance||0); }, 0);
  const pays = arr(f.payments), monthsPaid = [0, 1, 2].filter(function(i){ return pays.some(function(p){ return p.date && p.date > addDays(today, -30*(i+1)) && p.date <= addDays(today, -30*i); }); }).length;
  const earned = arr(f.income).concat(arr(f.invoices)).filter(function(x){ return x.date && x.date > addDays(today, -30); }).reduce(function(a, x){ return a + Number(x.amount||0); }, 0);
  const score = function(v){ return Math.round(300 + 550*Math.max(0, Math.min(1, v))); };
  if(!debts.length && !arr(f.income).length && !arr(f.invoices).length) return {f:null, note:'Add your debts or income in Personal → Finances'};
  if(bal <= 0){
    const want = state.profile.revenueGoalMonthly || 10000, inc = Math.max(earned, xpMrr());
    const v = .8 + .2*Math.min(1, inc/want);
    return {f:v, score:score(v), note:'Score '+score(v)+' · '+(debts.length ? 'debt-free' : 'no debt')+' · '+money(inc)+' in the last 30 days'};
  }
  const paid = orig > 0 ? Math.max(0, 1 - bal/orig) : 0, v = .12 + .38*paid + .3*monthsPaid/3;
  return {f:v, score:score(v), note:'Score '+score(v)+' · '+Math.round(paid*100)+'% paid off · paid '+monthsPaid+' of the last 3 months'};
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
  return '<button class="pc pc-'+(where||'hero')+' tier-'+x.rank+'" data-action="openYou" style="--rc:'+r.color+'" title="Your card: open the overview">'+
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
  return '<div class="pcf'+(ui.pcFlip ? ' is-flipped' : '')+(x.canLevel ? ' has-lvlup' : '')+'" style="--rc:'+r.color+'">'+(x.canLevel ? levelUpBtnHtml('card') : '')+
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

// ---- "You": the overview (Personal → You, or click the card). The card and your level with the last
// 30 days of XP beside it, your read from Op, the four ratings with what makes each one, then the last
// seven days against the seven before and your records. Ranks, the rules and your XP history live in
// the guide (?). Your weight on the BMI scale lives on Health.
function renderYouTab(){
  const x = xpSummary(), r = RANKS[x.rank];
  // every rating shows a number (25 is the floor, so nothing reads as blank; faded until there's data)
  const attrCard = function(k){ const a = x.attrs[k]; return '<div class="you-attr" style="--ac:'+a.color+'"><div class="you-attr-h"><b>'+a.v+'</b><span>'+a.name+'</span>'+
      (k==='HLT' && a.cap ? '<em class="you-cap'+(a.capped ? ' is-hit' : '')+'" title="At your weight, Health tops out at '+a.cap+'. It rises as the weight comes down.">max '+a.cap+'</em>' : '')+'</div>'+
    a.subs.map(function(s){ const v = s.v==null ? 25 : s.v; return '<div class="you-sub'+(s.v==null ? ' is-empty' : '')+(s.label==='Mind' ? ' is-link" data-action="openInspire' : '')+'" title="'+escapeHtml(s.note)+(s.label==='Mind' ? ' (open Inspiration)' : '')+'"><span>'+escapeHtml(s.label)+(s.trend ? ' <em class="you-tr '+(s.trend > 0 ? 'is-up' : 'is-down')+'" title="'+(s.trend > 0 ? 'Trending up' : 'Trending down')+'">'+(s.trend > 0 ? '&#9650;' : '&#9660;')+'</em>' : '')+'</span><i><u style="width:'+((v-25)/75*100).toFixed(1)+'%"></u></i><b>'+v+'</b></div>'; }).join('')+'</div>'; };
  return '<div class="you">'+
    '<div class="you-top">'+playerCardHtml('big')+
      '<div class="you-main">'+
        '<div class="you-lvlrow"><div class="you-lvl">Level <b>'+x.level+'</b> <span style="color:'+r.color+'">'+escapeHtml(r.name)+'</span></div>'+
          levelUpBtnHtml('you')+'<button class="you-q" data-action="openXpHow" title="How XP works, ranks and your XP history">?</button></div>'+
        '<div class="you-xpbar'+(x.levelPct>=1 ? ' is-full' : '')+'"><i><u style="width:'+(x.levelPct*100).toFixed(1)+'%"></u></i><span>'+
          (x.maxed ? '<b>Level '+LEVEL_MAX+'</b>, the top. '+x.total.toLocaleString()+' XP' : x.levelPct>=1 ? '<b>'+(x.total - x.levelLo).toLocaleString()+' XP</b> · level '+(x.level+1)+(x.canLevel ? ' ready' : '')+(x.banked ? ' · +'+x.banked.toLocaleString()+' stacked' : '') : '<b>'+(x.levelHi - x.total).toLocaleString()+' XP</b> to level '+(x.level+1))+'</span>'+xpCautionHtml(x)+'</div>'+
        xpChartHtml(x)+
      '</div></div>'+
    (typeof opRead==='function' ? opRead('card', opFactsCard, 'Give him your read on his card: where he stands, what’s holding him back, and what would move him up fastest.', {angles:'card'}) : '')+
    '<div class="you-attrs">'+['BUS', 'PER', 'HLT', 'DIS'].map(attrCard).join('')+'</div>'+
    youRecentHtml()+
    (typeof acctLogHtml==='function' ? acctLogHtml() : '')+
  '</div>';
}
// the last seven days against the seven before, and your records (bests since you started)
function youRecent(){
  const ctx = xpCtx(), today = todayStr(), start = xpStart();
  const span = function(a, b){ // days a..b ago (a < b), inclusive of a, exclusive of b
    const o = {xp:0, deep:0, workouts:0, tasks:0, reach:0, gold:0};
    for(let i=a;i<b;i++){
      const d = addDays(today, -i), dm = ctx.deep(d), dn = ctx.doneOn[d] || {tasks:0, videos:0};
      o.deep += dm; if(dm >= DEEP_GOLD) o.gold++;
      if(ctx.trained(d)) o.workouts++;
      o.tasks += dn.tasks + dn.videos; o.reach += ctx.touches[d] || 0;
      if(d >= start){ const it = (d!==today && xpCache.days[d]) || xpDay(d, ctx); o.xp += it.reduce(function(p, x){ return p + x.xp; }, 0); }
    }
    return o;
  };
  const now = span(0, 7), before = span(7, 14);
  // records: everything since your first day of data
  const first = [start].concat(arr(state.focus.sessions).map(function(s){ return s.date; }), ctx.gymDays).filter(Boolean).sort()[0] || today;
  const rec = {xp:null, deep:null, tasks:null, weekWorkouts:0, reachDay:null};
  for(let d = first, n = 0; d <= today && n < 1200; d = addDays(d, 1), n++){
    const dm = ctx.deep(d), dn = ctx.doneOn[d] || {tasks:0, videos:0}, t = dn.tasks + dn.videos;
    if(dm && (!rec.deep || dm > rec.deep.v)) rec.deep = {v:dm, d:d};
    if(t && (!rec.tasks || t > rec.tasks.v)) rec.tasks = {v:t, d:d};
    if(d >= start){ const it = (d!==today && xpCache.days[d]) || xpDay(d, ctx), sum = it.reduce(function(p, x){ return p + x.xp; }, 0); if(sum && (!rec.xp || sum > rec.xp.v)) rec.xp = {v:sum, d:d}; }
  }
  const wk = {}; ctx.gymDays.forEach(function(d){ const k = startOfWeekStr(d); wk[k] = (wk[k]||0) + 1; });
  Object.keys(wk).forEach(function(k){ if(wk[k] > rec.weekWorkouts) rec.weekWorkouts = wk[k]; });
  return {now:now, before:before, rec:rec, streak:computeStreak()};
}
function youRecentHtml(){
  const y = youRecent(), n = y.now, b = y.before;
  const tile = function(v, label, prev, fmt){
    const f = fmt || function(z){ return Math.round(z).toLocaleString(); }, dlt = v - prev;
    return '<div class="yr-t"><b>'+f(v)+'</b><span>'+label+'</span><small class="'+(dlt > 0 ? 'is-up' : dlt < 0 ? 'is-down' : '')+'">'+(dlt > 0 ? '&#9650; ' : dlt < 0 ? '&#9660; ' : '')+(dlt ? f(Math.abs(dlt)) : '&middot;')+'</small></div>';
  };
  const hrs = function(z){ return (z/60).toFixed(1)+'h'; };
  const rc = function(v, label, when){ return '<div class="yr-r"><b>'+v+'</b><span>'+label+'</span>'+(when ? '<small>'+escapeHtml(when)+'</small>' : '')+'</div>'; };
  const r = y.rec;
  return '<div class="you-recent">'+
    '<div class="yr-sec"><div class="you-sec">The last 7 days <span class="yr-vs">vs the 7 before</span></div><div class="yr-tiles">'+
      tile(n.xp, 'XP earned', b.xp)+tile(n.deep, 'deep work', b.deep, hrs)+tile(n.workouts, 'workouts', b.workouts)+tile(n.tasks, 'tasks done', b.tasks)+tile(n.reach, 'reach-outs', b.reach)+
      (n.gold || b.gold ? tile(n.gold, '8-hour days', b.gold) : '')+'</div></div>'+
    '<div class="yr-sec"><div class="you-sec">Your records</div><div class="yr-recs">'+
      rc(r.xp ? '+'+r.xp.v.toLocaleString() : '0', 'best day of XP', r.xp ? fmtDateShort(r.xp.d) : '')+
      rc(r.deep ? hrs(r.deep.v) : '0h', 'longest day of deep work', r.deep ? fmtDateShort(r.deep.d) : '')+
      rc(r.tasks ? r.tasks.v : 0, 'most tasks in a day', r.tasks ? fmtDateShort(r.tasks.d) : '')+
      rc(r.weekWorkouts, 'most workouts in a week', '')+
      rc(y.streak, 'day streak right now', '')+
    '</div></div></div>';
}
ACTIONS.youHelp = function(){ ui.youHelp = !ui.youHelp; renderView(); };
// the last 30 days of XP, a bar a day — the climb, at a glance (today and this week in its header)
function xpChartHtml(x){
  x = x || xpSummary();
  const ctx = xpCtx(), today = todayStr(), start = xpStart(), days = [], ws = startOfWeekSundayStr(today);
  for(let i=29;i>=0;i--){
    const d = addDays(today, -i);
    if(d < start){ days.push({d:d, xp:null}); continue; }
    const items = (d!==today && xpCache.days[d]) || xpDay(d, ctx);
    days.push({d:d, xp:items.reduce(function(a, x){ return a + x.xp; }, 0)});
  }
  const got = days.filter(function(x){ return x.xp!=null; }), sum = got.reduce(function(a, x){ return a + x.xp; }, 0);
  const top = Math.max(100, ...got.map(function(x){ return x.xp; })), best = got.reduce(function(b, x){ return !b || x.xp > b.xp ? x : b; }, null);
  const stat = function(v, l, cls){ return '<span class="you-cs'+(cls ? ' '+cls : '')+'"><b>'+v+'</b><small>'+l+'</small></span>'; };
  return '<div class="you-chart">'+
    '<div class="you-chart-h"><span class="you-sec">Last 30 days</span>'+
      '<span class="you-cstats">'+stat('+'+x.todayXp.toLocaleString(), 'today', 'is-today')+stat('+'+x.week.toLocaleString(), 'this week')+stat(sum.toLocaleString(), '30 days')+(best && best.xp ? stat('+'+best.xp.toLocaleString(), 'best day') : '')+'</span></div>'+
    '<div class="you-bars">'+days.map(function(x){
      const h = x.xp==null ? 0 : Math.max(x.xp ? 4 : 2, x.xp/top*100);
      return '<i class="'+(x.xp==null ? 'is-pre' : '')+(x.d===today ? ' is-today' : '')+(x.d >= ws ? ' is-week' : '')+'" title="'+escapeHtml(fmtDateShort(x.d))+(x.xp==null ? ' · before you started' : ': +'+x.xp+' XP')+'"><u style="height:'+h.toFixed(1)+'%"></u></i>';
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
    (o.ready ? '<div class="sys-ready">Level '+(o.level+1)+' is ready.<button class="lvl-up-btn" data-action="sysLevelUp"><span class="lvl-up-f">&#128293;</span>Level up<b>'+(o.level+1)+'</b></button></div>' : '')+
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
ACTIONS.sysLevelUp = function(){ ACTIONS.sysClose(); setTimeout(function(){ ACTIONS.levelUp(); }, 260); };
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
      lines:[], gained:Math.max(0, gained), level:x.level, levelUp:levelUp, ready:x.canLevel,
      fromPct: levelUp ? (before.total - xpForLevel(before.level))/(xpForLevel(before.level+1) - xpForLevel(before.level)) : (before.total - x.levelLo)/(x.levelHi - x.levelLo), toPct:x.levelPct}); }, lockedOut ? 2300 : 300);
  } else if(finished) xpToast(gained, 'Task complete.');
}
afterRenderHooks.push(function(){ try{ xpWatch(); }catch(e){} });

// ---- how leveling works: its own page (the You tab stays clean) ----
// a small bar chart for the guide: one bar per value, the value on top, a label under
function xpgBars(vals, labels, color, note, sqrt){
  const f = sqrt ? Math.sqrt : function(v){ return v; }, top = f(Math.max.apply(null, vals.concat([1])));
  return '<div class="xpg-chart" style="--bc:'+color+'"><div class="xpg-bars">'+vals.map(function(v, i){ return '<div class="xpg-b"><em>'+(typeof v==='number' ? v.toLocaleString() : v)+'</em><i><u style="height:'+(f(v)/top*100).toFixed(1)+'%"></u></i><small>'+labels[i]+'</small></div>'; }).join('')+'</div>'+(note ? '<div class="xpg-note">'+note+'</div>' : '')+'</div>';
}
function xpHowOverlay(){
  let o = document.getElementById('xpHowOverlay');
  if(!o){ o = document.createElement('div'); o.id = 'xpHowOverlay'; o.className = 'overlay xph-ov xpg-page'; o.innerHTML = '<div class="xpg" id="xpHowContent"></div>'; document.body.appendChild(o); }
  return o;
}
ACTIONS.openXpHow = function(){
  const o = xpHowOverlay();
  const x = xpSummary(), st = state.standards, std = Math.round(xpStandardFor(todayStr(), xpCtx().deep));
  const rate = function(name, color, items){ return '<div class="xph-rate"><b style="color:'+color+'">'+name+'</b>'+items.map(function(it){ return '<div><span>'+it[0]+'</span>'+it[1]+'</div>'; }).join('')+'</div>'; };
  // the numbers behind the charts (the same rules the game uses)
  const taskXp = [1,2,3,4,5,6,7,8,9,10,11,12].map(taskXpAt);
  const hourXp = [1,2,3,4,5,6,7,8,9,10].map(function(h){ const m = h*60; return Math.round(xpDeep(m, 0).xp + (m >= DEEP_GOLD ? XP_RATES.goldDay : m >= 360 ? XP_RATES.longDay : 0)); });
  const LV = [1,2,3,5,10,20,30,50,70,85,100], levelAt = LV.map(xpForLevel);
  const k = function(n){ return n >= 1e6 ? (n/1e6).toFixed(2).replace(/\.?0+$/, '')+'M' : n >= 1e4 ? Math.round(n/1000)+'k' : n.toLocaleString(); };
  document.getElementById('xpHowContent').innerHTML =
    '<div class="xpg-top"><button class="xpg-back" data-action="closeXpHow">&larr; Back</button><div class="xph-k">[ SYSTEM ]</div><button class="xpg-hist-btn" data-action="openXpHistory">&#128220; Your XP history</button></div>'+
    '<h1>How XP works</h1>'+
    '<div class="xph-lead">Everything you do to lock in pays XP, and XP never goes away. When you have enough for the next level, a <b>Level up</b> button shows up and you press it to claim it. Levels go to '+LEVEL_MAX+' and they get expensive fast. <b>Rank</b> is the real climb: on top of the level it needs the MRR and the Health score, so the business and your body both have to come with you.</div>'+
    '<div class="xpg-you"><div><small>You</small><b>Level '+x.level+'</b></div><div><small>Total XP</small><b>'+x.total.toLocaleString()+'</b></div><div><small>Level '+(x.level+1)+' at</small><b>'+x.levelHi.toLocaleString()+'</b></div>'+(x.canLevel ? '<div>'+levelUpBtnHtml('guide')+'</div>' : '')+'</div>'+
    '<div class="xpg-sec">Ranks. Each one needs the level, the MRR and the Health score.</div>'+
    '<div class="xph-track">'+RANKS.map(function(rk, i){ const stt = i<x.rank ? 'is-done' : i===x.rank ? 'is-cur' : ''; return '<span class="xph-tr '+stt+'" style="--rc:'+rk.color+'">'+rankBadgeSvg(i, 30)+'<b>'+escapeHtml(rk.name)+'</b><small>LVL '+rk.level+(rk.mrr ? '<br>'+money(rk.mrr)+' · HLT '+rk.health : '')+'</small></span>'; }).join('')+'</div>'+
    '<div class="xpg-sec">Where XP comes from</div>'+
    '<div class="xpg-grid">'+
      '<div class="xpg-card"><h3>Deep work</h3><p>Eight hours a day is the gold standard: treat it like a 9 to 5. Every hour pays more than the one before it, so the back half of a long day is where the XP is. Past your own normal ('+fmtHours(std || st.deepWorkTargetMinutes || 180)+' a day lately) each hour pays 8 extra. Six hours pays a +'+XP_RATES.longDay+' bonus, the full eight +'+XP_RATES.goldDay+'.</p>'+xpgBars(hourXp, [1,2,3,4,5,6,7,8,9,10].map(function(h){ return h+'h'; }), '#8fd3ff', 'XP for a whole day of that much locked-in work (before the bonus for going past your normal).')+'</div>'+
      '<div class="xpg-card"><h3>Finishing tasks</h3><p>The more you get done in a day, the more each one pays: the first is worth 5, the tenth 23, and they top out at 25 each. Up to '+XP_RATES.taskMax+' a day count.</p>'+xpgBars(taskXp, taskXp.map(function(_, i){ return '#'+(i+1); }), '#ffc56b', 'Ten tasks in a day: '+xpTasks(10)+' XP. Twenty: '+xpTasks(20)+'. Each content video finished: +'+XP_RATES.video+'.')+'</div>'+
      '<div class="xpg-card"><h3>Workouts</h3><p>Your first five ever pay big to get you going. After that the first one each week pays the most, and every one still counts.</p>'+xpgBars([150, 70, 60, 50, 25], ['first 5', '1st a week', '2nd', '3rd', '4th+'], '#7ef0c0')+'</div>'+
      '<div class="xpg-card"><h3>Strong days in a row</h3><p>Every day in the last week you hit your deep work target ('+fmtHours(st.deepWorkTargetMinutes||180)+') makes the whole day pay more. Two strong days starts it.</p>'+xpgBars([0,1,2,3,4,5,6,7].map(function(n){ return n < 2 ? 1 : +(1 + .04*n).toFixed(2); }), [0,1,2,3,4,5,6,7].map(String), '#c3a6ff', 'Seven strong days: every XP that day is worth 1.28 times as much.')+'</div>'+
      '<div class="xpg-card is-wide"><h3>Goals: the week, the month, the big ones</h3><p>Check in at the start of the week and the month (the Calendar asks), tick the goals off as you go, then check out at the end. Every goal is worth what it takes: when you add one, Op sizes it up and sets its XP (a weekly goal 75 to 300, a monthly one 250 to 1,000, your own long-term goals 200 to 10,000). Master goals scale with how big they are: 150 XP for every pound you set out to lose, 600 for every $1k of MRR growth, 100 for every day of a streak. Losing 50 pounds is 7,500 XP.</p>'+
        xpgBars([CHECKIN_XP.weekGoal, CHECKIN_XP.monthGoal, CHECKIN_XP.habit, masterXpFor('mrr', 0, 10000), masterXpFor('weight', 50, 0)], ['weekly goal', 'monthly goal', 'habit beaten', '$10k MRR more', 'lose 50 lb'], '#7ef0c0',
          'Typical values. Up to three weekly and three monthly goals pay each time. Checking in and out pays +'+CHECKIN_XP.weekIn+' and +'+CHECKIN_XP.weekOut+' a week, +'+CHECKIN_XP.monthIn+' and +'+CHECKIN_XP.monthOut+' a month. Every finished week you hit a weekly ring (workouts or deep work) pays +'+MASTER_XP.weekly+'. Master goals (MRR, weight, streak) pay again when you raise the bar.')+'</div>'+
      '<div class="xpg-card is-wide"><h3>The business</h3><div class="xpg-jumps">'+
        [['A client won', '+'+XP_RATES.client.toLocaleString()], ['Each $1k of MRR', '+'+XP_RATES.mrrPerK], ['Each follower gained', '+'+XP_RATES.follower], ['Reaching out, a day', '+'+XP_RATES.outreach+' to +'+(XP_RATES.outreach + XP_RATES.outreachEach*(XP_RATES.outreachMax-1))]].map(function(j){ return '<div><b>'+j[1]+'</b><span>'+j[0]+'</span></div>'; }).join('')+
      '</div><p class="xpg-note">MRR XP counts from where you started and comes back off if MRR drops. Reaching out is every touch you log on a client or a lead: the &#128075; button, Text, Email or Call from their card, or a meeting on the calendar linked to them. The first one in a day pays '+XP_RATES.outreach+' and each one after pays '+XP_RATES.outreachEach+' more, up to '+XP_RATES.outreachMax+' a day.</p></div>'+
      '<div class="xpg-card is-wide"><h3>What it takes to level</h3><p>Level 1 is about one client won. Level 2 is about two more on top of that. From there each level costs more than the last: a strong week is roughly 3,000 to 4,000 XP, so the early levels come in weeks, the middle ones in months, and level '+LEVEL_MAX+' is years of living like this.</p>'+xpgBars(levelAt, LV.map(function(L){ return 'L'+L; }), '#ff9a3c', 'Total XP needed to reach each level. Level '+LEVEL_MAX+' is '+xpForLevel(LEVEL_MAX).toLocaleString()+' XP in all.', true).replace(/<em>([\d,]+)<\/em>/g, function(m, n){ return '<em>'+k(Number(n.replace(/,/g, '')))+'</em>'; })+'</div>'+
    '</div>'+
    '<div class="xpg-sec">Your ratings, 25 to 100 (100 is you at your best). Each thing counts in one place only.</div><div class="xph-rates">'+
      rate('Business', '#ffc56b', [['MRR', 'what clients pay you a month. 100 is a million a year.'], ['Grind', 'real, locked-in work a day over the last 30 days. Six hours a day, every day, is 100.'],
        ['Scaling', 'new clients each month against your number ('+(st.newClientsPerMonth||2)+' a month, set in Settings, Goals & Standards). Each of the last three months counts on its own, so it only hits 100 when you land them every month.'],
        ['Content', 'business videos out against your business target.']])+
      rate('Personal', '#c3a6ff', [['Content', 'your own videos out against your personal target.'], ['Goals', 'the weekly and monthly goals you hit, how close your master goals are, and your own goals.'], ['Finances', 'like a credit score. Debt keeps it low, paying it down every month brings it up, and debt-free while earning tops it out.']])+
      rate('Health', '#7ef0c0', [['Training', 'workouts against your number a week over the last four weeks, the latest week counting most. A first good week back moves it right away.'], ['Diet', 'days you ate within your calorie target over the last two weeks. Logging counts too: a day you never logged counts for nothing.'],
        ['Weight', 'your BMI for your height. It also sets a ceiling on the whole score: carrying a lot of extra weight, Health tops out around 60 even with perfect training and diet, and the ceiling lifts as the weight comes down.']])+
      rate('Discipline', '#8fd3ff', [['Reliability', 'things with a deadline, done by the deadline (last 30 days).'],
        ['Consistency', 'completing everything, every week: work days on target, tasks, videos, workouts, food logged, your weekly check-in, the weekly and monthly goals you hit and your streak. When Op checks in and catches you slacking (or you don’t answer), it comes off here. The latest weeks count most, and it shows whether you are trending up or down.']])+
    '</div><div class="xph-foot">The overall only hits 100 when all four do.</div>';
  o.classList.remove('hidden'); o.scrollTop = 0;
};
// ---- your XP history: every day you've played and everything that paid, newest first ----
// one-off XP (clients, goals, check-ins, master goals) with the day it landed; the running things
// (MRR, followers, weekly rings) as one line each
function xpLedger(){
  const x = xpSummary(), p = state.profile, start = xpStart(), out = [], ongoing = [];
  const ws0 = weekKey(start), ms0 = monthKey(start);
  arr(state.business.clients).filter(function(c){ return arr(p.xpClientsBase).indexOf(c.id) < 0; }).forEach(function(c){ out.push({d:c.startDate || c.createdAt || start, why:'Client won: '+(c.business || c.name || 'a client'), xp:XP_RATES.client, k:'client'}); });
  if(typeof intentStore==='function'){
    const s = intentStore();
    Object.keys(s.weeks).forEach(function(k){ if(k < ws0) return; const r = s.weeks[k] || {}; if(r.at) out.push({d:k, why:'Checked in for the week', xp:CHECKIN_XP.weekIn, k:'checkin'}); if(r.out) out.push({d:periodEnd('week', k), why:'Checked out of the week', xp:CHECKIN_XP.weekOut, k:'checkin'}); });
    Object.keys(s.months).forEach(function(k){ if(k < ms0) return; const r = s.months[k] || {}; if(r.at) out.push({d:k+'-01', why:'Checked in for '+monthName(k), xp:CHECKIN_XP.monthIn, k:'checkin'}); if(r.out){ out.push({d:periodEnd('month', k), why:'Checked out of '+monthName(k), xp:CHECKIN_XP.monthOut, k:'checkin'}); if(r.out.habit) out.push({d:periodEnd('month', k), why:'Beat the habit: '+(r.habit || 'the month’s habit'), xp:CHECKIN_XP.habit, k:'goal'}); } });
    const per = {};
    arr(state.goals && state.goals.items).forEach(function(g){
      if(!g.tier || !g.done || (g.tier==='week' ? g.pk < ws0 : g.pk < ms0)) return;
      const kk = g.tier+g.pk; per[kk] = (per[kk]||0) + 1; if(per[kk] > CHECKIN_XP.maxGoals) return;
      out.push({d:g.doneAt || g.pk, why:(g.tier==='week' ? 'Weekly goal: ' : 'Monthly goal: ')+g.label, xp:goalXpOf(g), k:'goal'});
    });
  }
  const seen = p.xpGoalSeen || {};
  arr(state.goals && state.goals.items).forEach(function(g){ if(g.done && !g.tier && seen[g.id] && Date.now() - seen[g.id] >= 86400000 && !(typeof goalIsPeriodic==='function' && goalIsPeriodic(g))) out.push({d:g.doneAt || todayStr(new Date(seen[g.id])), why:'Your goal: '+(g.label || g.name || 'a goal'), xp:goalXpOf(g), k:'goal'}); });
  const hit = p.xpMasterHit || {};
  ['mrr', 'weight', 'streak'].forEach(function(key){ arr(hit[key]).forEach(function(t, i){ ongoing.push({why:'Master goal reached: '+(key==='mrr' ? money(t)+' MRR' : key==='weight' ? t+' '+(p.weightUnit==='kg' ? 'kg' : 'lb') : t+'-day streak'), xp:masterXpFor(key, i ? hit[key][i-1] : masterBase(key), t)}); }); });
  if(x.master && x.master.weeks) ongoing.push({why:x.master.weeks+' week'+(x.master.weeks===1?'':'s')+' you hit a weekly ring', xp:x.master.weeks*MASTER_XP.weekly});
  if(x.mrrXp) ongoing.push({why:'MRR: '+money(x.mrrBase)+' when you started, '+money(x.mrr)+' now', xp:x.mrrXp});
  if(x.followerXp) ongoing.push({why:x.followers.toLocaleString()+' followers gained', xp:x.followerXp});
  out.forEach(function(e){ if(e.d < start) e.d = start; });
  return {events:out, ongoing:ongoing};
}
ACTIONS.openXpHistory = function(){
  const o = xpHowOverlay(), x = xpSummary(), ctx = xpCtx(), today = todayStr(), start = xpStart(), L = xpLedger();
  const n = ui.xhN || 30, byDay = {};
  L.events.forEach(function(e){ (byDay[e.d] = byDay[e.d] || []).push(e); });
  // the totals by where it came from
  const src = {}, addS = function(k, v){ if(v) src[k] = (src[k]||0) + v; };
  const names = {time:'Deep work', gold:'Deep work', long:'Deep work', tasks:'Tasks', videos:'Content', workout:'Workouts', shoot:'Shooting', outreach:'Reaching out', streak:'Strong-day bonus', client:'Clients won', goal:'Goals', checkin:'Check-ins'};
  const days = [];
  for(let d = today; d >= start; d = addDays(d, -1)){
    const it = (d!==today && xpCache.days[d]) || xpDay(d, ctx);
    it.forEach(function(i){ addS(names[i.k] || 'Other', i.xp); });
    const ev = byDay[d] || []; ev.forEach(function(e){ addS(names[e.k] || 'Other', e.xp); });
    const sum = it.concat(ev).reduce(function(a, i){ return a + i.xp; }, 0);
    if(sum) days.push({d:d, items:it.concat(ev), sum:sum});
  }
  L.ongoing.forEach(function(e){ addS(/MRR/.test(e.why) ? 'MRR' : /follower/.test(e.why) ? 'Followers' : 'Master goals', e.xp); });
  const srcKeys = Object.keys(src).sort(function(a, b){ return src[b] - src[a]; }), top = Math.max(1, ...srcKeys.map(function(k){ return src[k]; }));
  const line = function(i){ return '<div class="xh-i"><span>'+escapeHtml(i.why)+'</span><b class="'+(i.xp < 0 ? 'is-neg' : '')+'">'+(i.xp < 0 ? '' : '+')+i.xp.toLocaleString()+'</b></div>'; };
  document.getElementById('xpHowContent').innerHTML =
    '<div class="xpg-top"><button class="xpg-back" data-action="openXpHow">&larr; How XP works</button><div class="xph-k">[ SYSTEM ]</div></div>'+
    '<h1>Your XP history</h1>'+
    '<div class="xpg-you"><div><small>Total XP</small><b>'+x.total.toLocaleString()+'</b></div><div><small>Since</small><b>'+fmtDateShort(start)+'</b></div><div><small>Days with XP</small><b>'+days.length+'</b></div><div><small>This week</small><b>+'+x.week.toLocaleString()+'</b></div></div>'+
    '<div class="xpg-sec">Where it came from</div>'+
    '<div class="xh-src">'+srcKeys.map(function(k){ return '<div class="xh-s"><span>'+k+'</span><i><u style="width:'+(src[k]/top*100).toFixed(1)+'%"></u></i><b>'+src[k].toLocaleString()+'</b></div>'; }).join('')+'</div>'+
    (L.ongoing.length ? '<div class="xpg-sec">Running totals</div><div class="xh-day"><div class="xh-items">'+L.ongoing.map(line).join('')+'</div></div>' : '')+
    '<div class="xpg-sec">Day by day</div>'+
    (days.length ? days.slice(0, n).map(function(dd){ return '<div class="xh-day"><div class="xh-dh"><span>'+(dd.d===today ? 'Today' : weekdayShort(dd.d)+' '+fmtDateShort(dd.d))+'</span><b>+'+dd.sum.toLocaleString()+' XP</b></div><div class="xh-items">'+dd.items.map(line).join('')+'</div></div>'; }).join('') : '<div class="empty">Nothing yet. Lock in and it starts here.</div>')+
    (days.length > n ? '<button class="btn xh-more" data-action="xpHistMore">Show older days ('+(days.length - n)+' more)</button>' : '');
  o.classList.remove('hidden'); if(!ui._xhKeep) o.scrollTop = 0; ui._xhKeep = false;
};
ACTIONS.xpHistMore = function(){ ui.xhN = (ui.xhN || 30) + 60; ui._xhKeep = true; ACTIONS.openXpHistory(); };
ACTIONS.closeXpHow = function(){ const o = document.getElementById('xpHowOverlay'); if(o) o.classList.add('hidden'); };
