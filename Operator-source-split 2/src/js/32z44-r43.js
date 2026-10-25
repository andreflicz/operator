// ============ ROUND 43 (October batch, build 3a): THE XP BOOK ============
// One table (XP_BOOK) holds every number. The engine reads it, and the in-app guide (How XP works) is
// written from it, so the two can never disagree. Made for anyone, not one person:
//  • Areas: everyone tracks the areas that matter to them. Work, Health and Personal by default; rename
//    them, turn one off, or add your own (up to 5 in all). Added areas earn through what you tag to them.
//  • Work has optional pieces that only count when you use them: Clients and Content.
//  • Every action belongs to one area. A day that touches all of them pays more (balance), and balanced
//    days in a row add a little more (streak).
//  • Levels measure effort (cheaper curve: level 100 in months, not years). Ranks measure achievement:
//    the level plus a rating in every area, judged by the lowest one.
//  • XP is earned once and kept. It only comes off when it was marked wrong; the level follows.

const XP_BOOK = {
  work:{deepBase:15, deepStep:3, deepHours:8, deepPast:25, longDay:40, longAt:360, goldDay:100, goldAt:480, pastNormal:5,
    taskMax:20, deliv:15, early:60, outreach:10, outreachEach:6, outreachMax:15, shoot:25, noClients:1.4, touch:100},
  health:{workouts:[200, 180, 160, 140], workoutAfter:60, firstFive:250, food:15, onTarget:50, band:[.8, 1.1], weighIn:10, weekToward:100, bed:50, touch:50},
  personal:{journal:80, insp:45, inspBig:65, inspMax:2, habit:30, skill:40, video:50, money:75, debtPer:4, debtMax:600, onTime:15, touch:50},
  added:{habit:30, habitMax:3, session:30, touch:50},
  balance:{all:1.25, half:1.10, streakEach:.02, streakMax:.14},
  goals:{weekIn:50, monthIn:150, weekOut:25, monthOut:50, maxPer:5, sweepWeek:300, sweepMonth:1500, habit:500, newLong:50, newLongMax:2,
    week:[75, 300, 150], month:[250, 1000, 500], long:[500, 15000, 3000], life:[10000, 50000, 30000],
    mrrPerK:600, perLb:150, perDay:100, ring:100, raise:.10, hold:1200, weekFrom:4, monthFrom:20},
  oneoff:{client:1500, reactivated:300, mrrPerK:600, follower:1},
  level:{base:500, lin:45, sq:.3, max:100},
  areas:{max:5, defaults:[{id:'work', name:'Work'}, {id:'health', name:'Health'}, {id:'personal', name:'Personal'}]},
  ranks:[
    {name:'Locked In', level:0,  low:0,  mrr:0,     color:'#8fd3ff', tag:'Showing up for yourself'},
    {name:'Operator',  level:8,  low:40, mrr:2500,  color:'#5fd4c4', tag:'Every day, on purpose'},
    {name:'Specialist',level:18, low:50, mrr:5000,  color:'#6fc3ff', tag:'Good at the thing'},
    {name:'Pro',       level:30, low:55, mrr:10000, color:'#a98bff', tag:'It shows'},
    {name:'Captain',   level:42, low:60, mrr:20000, color:'#ff8fb1', tag:'Others follow'},
    {name:'Commander', level:55, low:65, mrr:35000, color:'#ffc56b', tag:'Runs the field'},
    {name:'Director',  level:68, low:70, mrr:50000, color:'#ff9a6b', tag:'Built to last'},
    {name:'Elite',     level:80, low:75, mrr:70000, color:'#7ef0c0', tag:'Few get here', biz:'Mogul'},
    {name:'Legend',    level:92, low:80, mrr:83400, color:'#fff2b0', tag:'The whole life, handled', biz:'Millionaire'}
  ]
};
const R43_AREA_COLORS = {work:'#ffc56b', health:'#7ef0c0', personal:'#c3a6ff'};
const R43_EXTRA_COLORS = ['#8fd3ff', '#ff8fb1', '#f2e27a', '#b5e06a'];

// ---- the old tables follow the book (everything that reads them now reads the book) ----
Object.assign(CHECKIN_XP, {weekGoal:XP_BOOK.goals.week[2], monthGoal:XP_BOOK.goals.month[2], habit:XP_BOOK.goals.habit,
  weekIn:XP_BOOK.goals.weekIn, weekOut:XP_BOOK.goals.weekOut, monthIn:XP_BOOK.goals.monthIn, monthOut:XP_BOOK.goals.monthOut, maxGoals:XP_BOOK.goals.maxPer});
Object.assign(XP_RATES, {mrrPerK:XP_BOOK.oneoff.mrrPerK, client:XP_BOOK.oneoff.client, follower:XP_BOOK.oneoff.follower, goal:XP_BOOK.goals.long[2],
  longDay:XP_BOOK.work.longDay, goldDay:XP_BOOK.work.goldDay, outreach:XP_BOOK.work.outreach, outreachEach:XP_BOOK.work.outreachEach, outreachMax:XP_BOOK.work.outreachMax, taskMax:XP_BOOK.work.taskMax});
MASTER_XP.weekly = XP_BOOK.goals.ring;
GOAL_XP_BAND.week = XP_BOOK.goals.week; GOAL_XP_BAND.month = XP_BOOK.goals.month; GOAL_XP_BAND.long = XP_BOOK.goals.long; GOAL_XP_BAND.life = XP_BOOK.goals.life;
// ranks: neutral names for everyone; on the Clients track each also needs MRR and the top two take business names
RANKS.splice(0, RANKS.length);
XP_BOOK.ranks.forEach(function(r){
  const o = {level:r.level, low:r.low, mrr:r.mrr, color:r.color, tag:r.tag};
  Object.defineProperty(o, 'name', {enumerable:true, get:function(){ return r.biz && r43ClientsTrack() ? r.biz : r.name; }});
  Object.defineProperty(o, 'health', {enumerable:true, get:function(){ return r.low; }});
  RANKS.push(o);
});

// ---- levels: the cost of each level is 500 + 45L + 0.3L² (level 100 ≈ 371k in all) ----
function r43LevelCost(L){ const b = XP_BOOK.level; return Math.round(b.base + b.lin*L + b.sq*L*L); }
const R43_LEVEL_AT = (function(){ const a = [0]; for(let L = 0; L < XP_BOOK.level.max; L++) a.push(a[L] + r43LevelCost(L)); return a; })();
xpForLevel = function(L){ return L <= 0 ? 0 : R43_LEVEL_AT[Math.min(XP_BOOK.level.max, L)]; };

// ---- areas ----
function r43AreasRaw(){
  const p = state.profile;
  if(!Array.isArray(p.xpAreas) || !p.xpAreas.length) p.xpAreas = XP_BOOK.areas.defaults.map(function(a){ return {id:a.id, name:a.name, on:true}; });
  return p.xpAreas;
}
function r43Areas(){ return r43AreasRaw().filter(function(a){ return a.on!==false; }); }
function r43Area(id){ return r43AreasRaw().find(function(a){ return a.id===id; }) || null; }
function r43AreaOn(id){ const a = r43Area(id); return !!(a && a.on!==false); }
function r43AreaName(id){ const a = r43Area(id); return a ? a.name : id; }
function r43AreaColor(id){ if(R43_AREA_COLORS[id]) return R43_AREA_COLORS[id]; const i = r43AreasRaw().filter(function(a){ return !R43_AREA_COLORS[a.id]; }).findIndex(function(a){ return a.id===id; }); return R43_EXTRA_COLORS[Math.max(0, i) % R43_EXTRA_COLORS.length]; }
function r43AreaShort(id){ return String(r43AreaName(id)).replace(/[^A-Za-z0-9]/g, '').slice(0, 3).toUpperCase() || 'ARE'; }
function r43Builtin(id){ return id==='work' || id==='health' || id==='personal'; }
// was this area tracked on that day? (turning one off keeps what it already earned)
function r43AreaOnAt(a, d){
  if(!a) return false;
  if(a.since && d < a.since) return false;
  const offs = arr(a.offs);
  for(let i = 0; i < offs.length; i++){ const o = offs[i]; if(d >= o[0] && (!o[1] || d < o[1])) return false; }
  return true;
}
function r43AreasAt(d){ return r43AreasRaw().filter(function(a){ return r43AreaOnAt(a, d); }); }
// the optional pieces of Work
function r43ClientsOn(){ return arr(state.business && state.business.clients).length > 0 || arr(state.business && state.business.pipeline).length > 0; }
function r43ContentOn(){
  const ct = state.standards && state.standards.contentTargets;
  return !!((ct && ct.business && ct.business.n) || arr(state.modes && state.modes.history).some(function(m){ return m.type==='shooting'; }) || state.tasks.items.some(function(t){ return t.isVideoIdea && contentRoleOf(t)!=='personal'; }));
}
function r43ClientsTrack(){ return !!(state && state.profile && state.profile.rankClientsTrack && r43ClientsOn()); }

// every task belongs to one area: the one it's tagged with, or work for client work and business videos,
// personal for the rest
function r43TaskAreaAuto(t){
  if(t.isVideoIdea) return contentRoleOf(t)==='personal' ? 'personal' : 'work';
  const cs = arr(t.clients).concat(t.client ? [t.client] : []);
  if(cs.some(function(c){ return c && c!=='personal' && c!=='general'; })) return 'work';
  return 'personal';
}
function r43TaskArea(t){ return t.area && r43Area(t.area) ? t.area : r43TaskAreaAuto(t); }
function r43GoalArea(g){ if(g.area && r43Area(g.area)) return g.area; if(['mrr', 'clients', 'newclients', 'reels', 'hours', 'avghours'].indexOf(g.autoTrack)>=0) return 'work'; if(['weight', 'workouts'].indexOf(g.autoTrack)>=0) return 'health'; return 'personal'; }
function taskXpAtN(i){ return Math.min(25, 3 + 2*i); }
function r43Tasks(n){ let x = 0; for(let i = 1; i <= Math.min(n, XP_BOOK.work.taskMax); i++) x += taskXpAtN(i); return x; }
function r43Deep(min){ const W = XP_BOOK.work; let xp = 0; for(let h = 0; h*60 < min; h++) xp += (h < W.deepHours ? W.deepBase + W.deepStep*h : W.deepPast)*Math.min(60, min - h*60)/60; return xp; }
function r43BedMins(){ const b = state.profile.bedtime; if(!b || !/^\d\d:\d\d$/.test(b)) return null; const m = Number(b.slice(0, 2))*60 + Number(b.slice(3)); return m < 300 ? m + 1440 : m; }
function r43Habits(a){ return arr(a && a.habits).slice(0, XP_BOOK.added.habitMax); }
function r43Store(){ const p = state.personal || (state.personal = {}); if(!p.areaLog || typeof p.areaLog!=='object') p.areaLog = {sessions:[], timer:null}; p.areaLog.sessions = arr(p.areaLog.sessions); return p.areaLog; }

// ---- what the day counts from (built once with the rest of the context) ----
xpCtx = (function(base){
  return function(){
    const ctx = base.apply(this, arguments), P = XP_BOOK.personal;
    const tasks = {}, pvid = {};
    state.tasks.items.forEach(function(t){
      if(t.status!=='done' || !t.completedAt || t.missed) return;
      if(t.master && t.master.kind==='dvw') return;          // a client's week pays through its pieces
      const d = t.completedAt;
      if(t.isVideoIdea && contentRoleOf(t)==='personal'){ pvid[d] = (pvid[d]||0) + 1; return; }
      const a = r43TaskArea(t), o = tasks[d] || (tasks[d] = {}); o[a] = (o[a]||0) + 1;
    });
    const deliv = {};
    arr(state.business && state.business.clients).forEach(function(c){ arr(c.deliverables).forEach(function(dv){ arr(dv.completedDates).forEach(function(d){ deliv[d] = (deliv[d]||0) + 1; }); }); });
    const early = {}; const E = state.profile.xpEarly || {}; Object.keys(E).forEach(function(k){ const d = E[k]; if(d) early[d] = (early[d]||0) + 1; });
    const food = {}; arr(state.health.calorieEntries).forEach(function(c){ if(c.date) food[c.date] = (food[c.date]||0) + Math.max(0, Number(c.calories)||0) + 0.0001; });
    const weigh = {}, wl = arr(state.health.weightLog).filter(function(w){ return w && w.date && w.weight!=null; }).sort(function(a, b){ return a.date.localeCompare(b.date); });
    wl.forEach(function(w){ weigh[w.date] = Number(w.weight); });
    const journal = {}; arr(state.journal && state.journal.entries).forEach(function(e){ if(e && e.date) journal[e.date] = 1; });
    const insp = {}; try{ arr(inspStore().log).forEach(function(x){ if(!x.date) return; (insp[x.date] = insp[x.date] || []).push((inspAct(x.act).pts || 1) >= 2 ? P.inspBig : P.insp); }); }catch(e){}
    const habit = {}; try{ const ms = intentStore().months; Object.keys(ms).forEach(function(k){ Object.keys((ms[k] && ms[k].habitDays) || {}).forEach(function(d){ habit[d] = 1; }); }); }catch(e){}
    const skill = {}; try{ state.tasks.items.filter(function(t){ return t.skill; }).forEach(function(t){ const by = taskMinutesByDay(t.id) || {}; Object.keys(by).forEach(function(d){ skill[d] = (skill[d]||0) + by[d]; }); }); }catch(e){}
    const money = {}; arr(state.finances && state.finances.checkins).forEach(function(c){ const d = typeof c==='string' ? c : c && c.date; if(d){ const w = startOfWeekStr(d); if(!money[w] || d < money[w]) money[w] = d; } });
    const moneyDay = {}; Object.keys(money).forEach(function(w){ moneyDay[money[w]] = 1; });
    // payments: on time +15 (one a debt a day), above the minimum 1 XP per $4 (600 a month at most)
    const pay = {}, debts = {}, monthPaid = {};
    arr(state.finances && state.finances.debts).forEach(function(d){ debts[d.id] = d; });
    arr(state.finances && state.finances.payments).slice().sort(function(a, b){ return String(a.date).localeCompare(String(b.date)); }).forEach(function(p){
      if(!p.date) return; const o = pay[p.date] || (pay[p.date] = {on:{}, extra:0}), d = debts[p.debtId] || {};
      const due = Number(d.dueDay)||0, day = Number(p.date.slice(8));
      if(!due || day <= due) o.on[p.debtId || p.id] = 1;
      const min = Number(d.minPayment || d.minimum || 0), above = min > 0 ? Math.max(0, Number(p.amount||0) - min) : 0;
      if(above){ const mk = p.date.slice(0, 7), room = Math.max(0, P.debtMax - (monthPaid[mk]||0)), x = Math.min(room, above/P.debtPer); monthPaid[mk] = (monthPaid[mk]||0) + x; o.extra += x; }
    });
    const bed = state.profile.xpBed || {};
    const ah = {}; r43AreasRaw().forEach(function(a){ r43Habits(a).forEach(function(h){ Object.keys(h.days || {}).forEach(function(d){ const o = ah[d] || (ah[d] = {}); o[a.id] = (o[a.id]||0) + 1; }); }); });
    const as = {}; r43Store().sessions.forEach(function(s){ if(!s.date) return; const o = as[s.date] || (as[s.date] = {}); o[s.area] = (o[s.area]||0) + Math.max(0, Number(s.minutes)||0); });
    return Object.assign(ctx, {r43:{tasks:tasks, pvid:pvid, deliv:deliv, early:early, food:food, weigh:weigh, wl:wl, journal:journal, insp:insp, habit:habit, skill:skill, money:moneyDay, pay:pay, bed:bed, ah:ah, as:as,
      clients:r43ClientsOn(), content:r43ContentOn(), calTarget:state.profile.calorieTarget || 2000, perWk:state.profile.weeklyWorkoutTarget || 4, goalW:state.profile.goalWeight, bedMins:r43BedMins()}});
  };
})(xpCtx);

// everything one day earned, by area, before balance
function r43DayRaw(d, ctx){
  const R = ctx.r43, W = XP_BOOK.work, H = XP_BOOK.health, P = XP_BOOK.personal, A = XP_BOOK.added, items = [], area = {};
  const on = {}; r43AreasAt(d).forEach(function(a){ on[a.id] = 1; });
  const add = function(a, k, xp, why){ xp = Math.round(xp); if(!xp || !on[a]) return; items.push({a:a, k:k, xp:xp, why:why}); area[a] = (area[a]||0) + xp; };
  const tk = R.tasks[d] || {};
  // Work
  const mult = R.clients ? 1 : W.noClients, deep = ctx.deep(d), std = xpStandardFor(d, ctx.deep);
  if(deep){
    add('work', 'time', r43Deep(deep)*mult, fmtDurationLabel(deep)+' of deep work'+(mult > 1 ? ' (×'+mult+')' : ''));
    if(deep >= W.goldAt) add('work', 'gold', W.goldDay, 'Gold day: 8 hours');
    else if(deep >= W.longAt) add('work', 'long', W.longDay, 'Long day: 6 hours');
    if(std > 0 && deep > std) add('work', 'normal', (deep - std)/60*W.pastNormal, fmtDurationLabel(deep - std)+' past your normal');
  }
  if(tk.work) add('work', 'tasks', r43Tasks(tk.work)*mult, tk.work+' work task'+(tk.work===1 ? '' : 's')+' done');
  if(R.clients){
    if(R.deliv[d]) add('work', 'deliv', R.deliv[d]*W.deliv, R.deliv[d]+' deliverable'+(R.deliv[d]===1 ? '' : 's')+' done');
    if(R.early[d]) add('work', 'early', R.early[d]*W.early, R.early[d]+' client week'+(R.early[d]===1 ? '' : 's')+' done before it starts');
    const t = ctx.touches[d] || 0; if(t) add('work', 'outreach', W.outreach + W.outreachEach*(Math.min(t, W.outreachMax) - 1), t+' reach-out'+(t===1 ? '' : 's'));
  }
  const shoot = ctx.shootMin[d] || 0; if(shoot) add('work', 'shoot', shoot/60*W.shoot, fmtDurationLabel(shoot)+' shooting');
  // Health
  if(ctx.trained(d)){
    const k = ctx.workoutIndex[d], w = ctx.workoutWeekIndex[d];
    if(k <= 5) add('health', 'workout', H.firstFive, 'Workout #'+k+' (your first five pay big)');
    else if(w <= Math.min(H.workouts.length, R.perWk)) add('health', 'workout', H.workouts[w-1], 'Workout, '+w+(w===1 ? 'st' : w===2 ? 'nd' : w===3 ? 'rd' : 'th')+' this week');
    else add('health', 'workout', H.workoutAfter, 'Workout');
  }
  if(tk.health) add('health', 'tasks', r43Tasks(tk.health), tk.health+' health task'+(tk.health===1 ? '' : 's')+' done');
  if(R.food[d]){
    add('health', 'food', H.food, 'Food logged');
    const r = Math.round(R.food[d])/R.calTarget; if(r >= H.band[0] && r <= H.band[1]) add('health', 'ontarget', H.onTarget, 'Inside your calorie target');
  }
  if(R.weigh[d]!=null) add('health', 'weigh', H.weighIn, 'Weigh-in');
  if(R.goalW && new Date(d+'T12:00').getDay()===0){
    const ws = addDays(d, -6), before = R.wl.filter(function(w){ return w.date < ws; }).pop(), inWk = R.wl.filter(function(w){ return w.date >= ws && w.date <= d; }).pop();
    if(before && inWk && Math.abs(inWk.weight - R.goalW) < Math.abs(before.weight - R.goalW) - 0.05) add('health', 'toward', H.weekToward, 'A week closer to your goal weight');
  }
  if(R.bedMins!=null && R.bed[d]!=null && R.bed[d] <= R.bedMins) add('health', 'bed', H.bed, 'In bed on time');
  // Personal
  if(R.journal[d]) add('personal', 'journal', P.journal, 'Journal entry');
  const ins = arr(R.insp[d]).slice(0, P.inspMax); if(ins.length) add('personal', 'insp', ins.reduce(function(a, x){ return a + x; }, 0), ins.length+' inspiration log'+(ins.length===1 ? '' : 's'));
  if(R.habit[d]) add('personal', 'habit', P.habit, 'The month’s habit, kept');
  if(R.skill[d]) add('personal', 'skill', R.skill[d]/60*P.skill, fmtDurationLabel(Math.round(R.skill[d]))+' on your skills');
  if(R.pvid[d]) add('personal', 'video', R.pvid[d]*P.video, R.pvid[d]+' video'+(R.pvid[d]===1 ? '' : 's')+' of your own');
  if(tk.personal) add('personal', 'tasks', r43Tasks(tk.personal), tk.personal+' personal task'+(tk.personal===1 ? '' : 's')+' done');
  if(R.money[d]) add('personal', 'money', P.money, 'Weekly money check-in');
  const py = R.pay[d]; if(py){ const n = Object.keys(py.on).length; if(n) add('personal', 'paid', n*P.onTime, n+' payment'+(n===1 ? '' : 's')+' on time'); if(py.extra) add('personal', 'debt', py.extra, 'Paid above the minimum'); }
  // areas you added
  r43AreasRaw().filter(function(a){ return !r43Builtin(a.id); }).forEach(function(a){
    if(tk[a.id]) add(a.id, 'tasks', r43Tasks(tk[a.id]), tk[a.id]+' task'+(tk[a.id]===1 ? '' : 's')+' done');
    const hb = Math.min(A.habitMax, (R.ah[d] || {})[a.id] || 0); if(hb) add(a.id, 'habit', hb*A.habit, hb+' habit'+(hb===1 ? '' : 's')+' kept');
    const sm = (R.as[d] || {})[a.id] || 0; if(sm) add(a.id, 'session', sm/60*A.session, fmtDurationLabel(Math.round(sm))+' of '+a.name);
  });
  return {items:items, area:area, on:Object.keys(on)};
}
function r43Touched(d, raw){
  const T = {work:XP_BOOK.work.touch, health:XP_BOOK.health.touch, personal:XP_BOOK.personal.touch};
  return raw.on.filter(function(a){ return (raw.area[a]||0) >= (T[a] || XP_BOOK.added.touch) || (a==='work' && isDayOff(d)); });
}
function r43Balanced(raw, d){ if(raw.on.length <= 1) return true; return r43Touched(d, raw).length===raw.on.length; }
// past days don't change unless the data does: keep them
let r43Cache = {sig:'', raw:{}};
function r43RawOf(d, ctx){
  if(d===todayStr()) return r43DayRaw(d, ctx);
  return r43Cache.raw[d] || (r43Cache.raw[d] = r43DayRaw(d, ctx));
}
xpDay = function(d, ctx){
  const raw = r43RawOf(d, ctx), items = raw.items.slice(), base = items.reduce(function(a, x){ return a + x.xp; }, 0);
  if(!base) return items;
  const B = XP_BOOK.balance, n = raw.on.length, t = r43Touched(d, raw).length;
  const bal = n <= 1 || t===n ? B.all : t*2 >= n ? B.half : 1;
  if(bal > 1) items.push({a:'all', k:'balance', xp:Math.round(base*(bal - 1)), why:(t===n ? 'Balanced day: every area' : 'Half your areas')+' ×'+bal.toFixed(2)});
  let streak = 0; const start = xpStart();
  for(let i = 1; i <= 7; i++){ const dd = addDays(d, -i); if(dd < start) break; const r = r43RawOf(dd, ctx); if(r.items.length && r43Balanced(r, dd)) streak++; }
  const st = Math.min(B.streakMax, streak*B.streakEach);
  if(st > 0) items.push({a:'all', k:'streak', xp:Math.round(base*bal*st), why:streak+' balanced day'+(streak===1 ? '' : 's')+' this week +'+Math.round(st*100)+'%'});
  return items;
};
xpSig = (function(base){
  return function(){
    let n = 0; arr(state.business && state.business.clients).forEach(function(c){ arr(c.deliverables).forEach(function(d){ n += arr(d.completedDates).length; }); });
    const p = state.profile;
    return [base.apply(this, arguments), n, arr(state.health.calorieEntries).length, arr(state.health.weightLog).length, arr(state.journal && state.journal.entries).length,
      (function(){ try{ return inspStore().log.length; }catch(e){ return 0; } })(), arr(state.finances && state.finances.payments).length, arr(state.finances && state.finances.checkins).length,
      JSON.stringify(p.xpAreas || ''), JSON.stringify(p.xpBed || ''), p.bedtime, JSON.stringify(p.xpEarly || ''), r43Store().sessions.length, p.calorieTarget, p.weeklyWorkoutTarget, p.goalWeight,
      state.tasks.items.filter(function(t){ return t.area; }).map(function(t){ return t.id+t.area; }).join(''),
      (function(){ try{ const ms = intentStore().months; return Object.keys(ms).map(function(k){ return k+Object.keys((ms[k] && ms[k].habitDays) || {}).length; }).join(); }catch(e){ return ''; } })()].join('|');
  };
})(xpSig);

// a client's posting week finished before it starts: +60 for that client, that week (kept once earned)
function r43EarlyScan(){
  if(typeof r42Alloc!=='function') return;
  const p = state.profile, E = p.xpEarly && typeof p.xpEarly==='object' ? p.xpEarly : (p.xpEarly = {}), today = todayStr(), start = xpStart();
  let changed = false;
  arr(state.business && state.business.clients).forEach(function(c){
    const ds = arr(c.deliverables).filter(function(d){ return d.recurring!==false; }); if(!ds.length) return;
    const allocs = ds.map(function(d){ try{ return r42Alloc(d); }catch(e){ return null; } }).filter(Boolean); if(!allocs.length) return;
    allocs[0].posts.forEach(function(post){
      const key = c.id+':'+post;
      if(post < start || (E[key] && post <= today)) return;          // past weeks are on the record
      let need = 0, ok = true, last = '';
      allocs.forEach(function(a){ const n = a.need[post] || 0; need += n; if((a.fill[post]||0) < n) ok = false; arr(a.dates[post]).forEach(function(x){ if(x > last) last = x; }); });
      const early = need > 0 && ok && last && last < post;
      if(early && E[key]!==last){ E[key] = last; changed = true; }
      else if(!early && E[key] && post > today){ delete E[key]; changed = true; }
    });
  });
  if(changed) persist('profile');
}

// ---- weeks, months, goals: setting up pays a little, finishing a lot, finishing all of it a bonus ----
goalXpOf = function(g){
  if(g && Number(g.xp) > 0) return Number(g.xp);
  const G = XP_BOOK.goals;
  return g && g.tier==='week' ? G.week[2] : g && g.tier==='month' ? G.month[2] : g && g.life ? G.life[2] : G.long[2];
};
function r43GoalLines(){
  const G = XP_BOOK.goals, lines = [], start = xpStart(), ws0 = weekKey(start), ms0 = monthKey(start);
  const push = function(d, why, xp, k, area){ if(xp) lines.push({d:d < start ? start : d, why:why, xp:Math.round(xp), k:k || 'goal', a:area || null}); };
  if(typeof intentStore==='function'){
    const s = intentStore();
    Object.keys(s.weeks).forEach(function(k){ if(k < ws0) return; const r = s.weeks[k] || {}; if(r.at) push(r.atDay || k, 'Set up the week of '+fmtDateShort(k), G.weekIn, 'checkin'); if(r.out) push(periodEnd('week', k), 'Checked out of the week', G.weekOut, 'checkin'); });
    Object.keys(s.months).forEach(function(k){ if(k < ms0) return; const r = s.months[k] || {}; if(r.at) push(r.atDay || k+'-01', 'Set up '+monthName(k), G.monthIn, 'checkin'); if(r.out){ push(periodEnd('month', k), 'Checked out of '+monthName(k), G.monthOut, 'checkin'); if(r.out.habit) push(periodEnd('month', k), 'Beat the habit: '+(r.habit || 'the month’s habit'), G.habit, 'goal'); } });
  }
  const per = {};
  arr(state.goals && state.goals.items).forEach(function(g){ if(!g.tier || (g.tier==='week' ? g.pk < ws0 : g.pk < ms0)) return; (per[g.tier+'|'+g.pk] = per[g.tier+'|'+g.pk] || []).push(g); });
  Object.keys(per).forEach(function(k){
    const gs = per[k], tier = k.split('|')[0], done = gs.filter(function(g){ return g.done; }).sort(function(a, b){ return String(a.doneAt||'').localeCompare(String(b.doneAt||'')); });
    done.slice(0, G.maxPer).forEach(function(g){ push(g.doneAt || g.pk, (tier==='week' ? 'Weekly goal: ' : 'Monthly goal: ')+g.label, goalXpOf(g), 'goal', r43GoalArea(g)); });
    if(gs.length >= 2 && done.length===gs.length) push(done[done.length-1].doneAt || gs[0].pk, 'Clean sweep: every '+(tier==='week' ? 'weekly' : 'monthly')+' goal', tier==='week' ? G.sweepWeek : G.sweepMonth, 'goal');
  });
  // long-term and life goals you write: +50 for setting one (two a month), then what Op (or you) set it at
  const setPer = {};
  arr(state.goals && state.goals.items).filter(function(g){ return !g.tier; }).sort(function(a, b){ return String(a.createdAt||'').localeCompare(String(b.createdAt||'')); }).forEach(function(g){
    const made = g.createdAt || start, mk = String(made).slice(0, 7);
    if(made >= start && g.label){ setPer[mk] = (setPer[mk]||0) + 1; if(setPer[mk] <= G.newLongMax) push(made, 'New '+(g.life ? 'life milestone' : 'long-term goal')+': '+g.label, G.newLong, 'goal', r43GoalArea(g)); }
    if(g.done && !(typeof goalIsPeriodic==='function' && goalIsPeriodic(g))) push(g.doneAt || todayStr(), (g.life ? 'Life milestone: ' : 'Goal reached: ')+(g.label || goalTitle(g)), goalXpOf(g), 'goal', r43GoalArea(g));
  });
  return lines;
}
// clients and audience: big moves pay once, on new highs, and never come back off when numbers dip
function r43OneOffs(){
  const p = state.profile, O = XP_BOOK.oneoff, start = xpStart(), out = [];
  arr(state.business.clients).filter(function(c){ return arr(p.xpClientsBase).indexOf(c.id) < 0; }).forEach(function(c){
    out.push({d:c.startDate || c.createdAt || start, why:(c.reactivated ? 'Client back: ' : 'Client won: ')+(c.business || c.name || 'a client'), xp:c.reactivated ? O.reactivated : O.client, k:'client', a:'work'});
  });
  const mrr = xpMrr(), base = Number(p.xpMrrBase || 0);
  if(!(Number(p.xpMrrBest) >= base)) p.xpMrrBest = Math.max(base, mrr);
  if(mrr > p.xpMrrBest){ p.xpMrrBest = mrr; persist('profile'); }
  const mrrXp = Math.max(0, Math.round((p.xpMrrBest - base)/1000*O.mrrPerK));
  const fNow = xpFollowersNow();
  if(fNow!=null && p.xpFollowersBase==null){ p.xpFollowersBase = fNow; persist('profile'); }
  if(fNow!=null && !(Number(p.xpFolBest) >= fNow)){ p.xpFolBest = fNow; persist('profile'); }
  const folGain = (p.xpFolBest!=null && p.xpFollowersBase!=null ? Math.max(0, p.xpFolBest - p.xpFollowersBase) : 0) + Number(p.xpFollowersKept || 0);
  return {events:out, mrr:mrr, mrrBase:base, mrrBest:p.xpMrrBest, mrrXp:mrrXp, followers:folGain, followerXp:Math.round(folGain*O.follower)};
}
// master goals pay by size; when one is hit its target goes up 10% (a real step) and the next one pays again
function r43AutoRaise(){
  if(typeof masterGoalDefs!=='function') return;
  const p = state.profile, raised = p.xpRaised && typeof p.xpRaised==='object' ? p.xpRaised : (p.xpRaised = {});
  masterGoalDefs().forEach(function(m){
    if(['mrr', 'weight', 'streak'].indexOf(m.key) < 0 || m.cur==null || !(m.target > 0) || masterPct(m) < 100) return;
    const hit = arr((p.xpMasterHit || {})[m.key]);
    if(hit.indexOf(Number(m.target)) < 0 || raised[m.key]===Number(m.target)) return;   // only once it's paid
    const t = Number(m.target); let next;
    if(m.key==='mrr') next = Math.max(t + 1000, Math.round(t*(1 + XP_BOOK.goals.raise)/100)*100);
    else if(m.key==='streak') next = Math.max(t + 7, Math.round(t*(1 + XP_BOOK.goals.raise)));
    else { const down = m.start!=null ? Number(m.start) > t : true, step = Math.max(5, Math.round(Math.abs((m.start!=null ? Number(m.start) : t) - t)*XP_BOOK.goals.raise)); next = down ? t - step : t + step; }
    raised[m.key] = t; p[m.field] = next; persist('profile');
    if(typeof sysNote==='function') setTimeout(function(){ sysNote(m.label+' hit. New target: '+m.fmt(next)+(m.suffix||'')+'.'); }, 700);
  });
}

// ---- the ratings: one per area you track, and an Overall that's their average ----
function r43Mix(list){ let s = 0, w = 0; list.forEach(function(x){ if(x==null || isNaN(x)) return; s += Math.max(0, Math.min(1, x)); w++; }); return w ? s/w : null; }
function r43Sub(label, f, note){ return {label:label, v:f==null ? null : rate99(f), note:note || ''}; }
function r43F(sub){ return sub && sub.v!=null ? (sub.v - 25)/75 : null; }
function r43ByDeadline(area){
  const today = todayStr(), due = state.tasks.items.filter(function(t){ return t.deadline && t.deadline < today && t.deadline >= addDays(today, -30) && !(t.master && t.master.kind==='dvw') && r43TaskArea(t)===area; });
  if(due.length < 2) return null;
  const on = due.filter(function(t){ return t.status==='done' && !t.missed && t.completedAt && t.completedAt <= t.deadline; }).length;
  return {f:on/due.length, on:on, n:due.length};
}
function r43ClientWeeks(){
  if(typeof r42Alloc!=='function') return null;
  const today = todayStr(); let n = 0, ok = 0;
  arr(state.business.clients).forEach(function(c){ arr(c.deliverables).forEach(function(d){ let a; try{ a = r42Alloc(d); }catch(e){ return; } a.posts.forEach(function(p){ if(p > today || !(a.need[p] > 0)) return; n++; if((a.fill[p]||0) >= a.need[p] && arr(a.dates[p]).every(function(x){ return x < p; })) ok++; }); }); });
  return n ? {f:ok/n, ok:ok, n:n} : null;
}
function r43AreaRatings(ctx, base){
  const sub = function(list, label){ return arr(list).find(function(s){ return s.label===label; }) || null; };
  const B = base.BUS.subs, Pp = base.PER.subs, Hh = base.HLT.subs, D = base.DIS.subs, today = todayStr(), out = [];
  r43Areas().forEach(function(a){
    let subs = [];
    if(a.id==='work'){
      const dl = r43ByDeadline('work');
      subs.push(sub(B, 'Focus'), r43Sub('Deadlines', dl ? dl.f : null, dl ? dl.on+' of '+dl.n+' work deadlines met (30 days)' : 'Give work tasks a deadline and it counts'));
      if(r43ClientsOn()){ const cw = r43ClientWeeks(); subs.push(sub(B, 'MRR'), sub(B, 'Scaling'), r43Sub('Reliability', cw ? cw.f : null, cw ? cw.ok+' of '+cw.n+' client weeks done before they started' : 'Client weeks done before they start')); }
      if(r43ContentOn()) subs.push(sub(B, 'Content'));
    } else if(a.id==='health'){
      subs.push(sub(Hh, 'Training'), sub(Hh, 'Diet'), sub(Hh, 'Weight'));
      const bm = r43BedMins(), bed = state.profile.xpBed || {};
      if(bm!=null){ let n = 0, on = 0; for(let i = 1; i <= 14; i++){ const d = addDays(today, -i); if(bed[d]!=null){ n++; if(bed[d] <= bm) on++; } } subs.push(r43Sub('Sleep', n ? on/14 : null, n ? on+' of the last 14 nights in bed by '+state.profile.bedtime : 'Press Goodnight (Sleep mode) at bedtime and it counts')); }
    } else if(a.id==='personal'){
      subs.push(sub(Pp, 'Mind'), sub(Pp, 'Goals'), sub(Pp, 'Finances'));
      let jd = 0, hd = 0; const R = ctx.r43; for(let i = 0; i < 14; i++){ const d = addDays(today, -i); if(R.journal[d]) jd++; if(R.habit[d]) hd++; }
      const hasHabit = (function(){ try{ return !!(periodRec('month', monthKey()) || {}).habit; }catch(e){ return false; } })();
      const anyJ = Object.keys(R.journal).length > 0;
      subs.push(r43Sub('Consistency', anyJ || hasHabit ? r43Mix([anyJ ? jd/10 : null, hasHabit ? hd/12 : null]) : null, (anyJ ? jd+' journal days' : 'no journal yet')+(hasHabit ? ' · habit kept '+hd+' of 14 days' : '')+' (last 14 days)'));
      const ct = state.standards.contentTargets || {}, pc = sub(Pp, 'Content');
      if((ct.personal && ct.personal.n) || state.tasks.items.some(function(t){ return t.isVideoIdea && contentRoleOf(t)==='personal'; })) subs.push(pc);
    } else {
      const R = ctx.r43, hs = r43Habits(a); let kept = 0, mins = 0;
      for(let i = 0; i < 14; i++){ const d = addDays(today, -i); kept += Math.min(hs.length, (R.ah[d] || {})[a.id] || 0); mins += (R.as[d] || {})[a.id] || 0; }
      const cf = r43Mix([hs.length ? kept/(hs.length*12) : null, mins ? Math.min(1, mins/(14*30)) : null]);
      const dl = r43ByDeadline(a.id), gs = arr(state.goals.items).filter(function(g){ return g.tier && r43GoalArea(g)===a.id && (g.done || g.missed || (g.pk && periodEnd(g.tier, g.pk) < today)); });
      subs.push(r43Sub('Consistency', cf, (hs.length ? kept+' habit days' : 'no habits yet')+' · '+fmtDurationLabel(Math.round(mins))+' logged (14 days)'),
        r43Sub('Deadlines', dl ? dl.f : null, dl ? dl.on+' of '+dl.n+' deadlines met' : 'Tasks with a deadline count'),
        r43Sub('Goals', gs.length ? gs.filter(function(g){ return g.done; }).length/gs.length : null, gs.length ? gs.filter(function(g){ return g.done; }).length+' of '+gs.length+' goals hit' : 'Goals tagged to '+a.name+' count'));
    }
    subs = subs.filter(Boolean);
    const f = r43Mix(subs.map(r43F));
    let v = f==null ? 25 : rate99(f), cap = null, capped = false;
    if(a.id==='health'){ cap = base.HLT.cap || null; if(cap!=null && v > cap){ v = cap; capped = true; } }
    if(a.id==='work' && base.BUS.supercharged) v = Math.min(99, v + 4);
    out.push({id:a.id, name:a.name, short:r43AreaShort(a.id), v:v, subs:subs, color:r43AreaColor(a.id), cap:cap, capped:capped, empty:f==null, body:a.id==='health' ? base.HLT.body : null});
  });
  return out;
}
xpAttributes = (function(base){
  return function(ctx){
    const b = base.apply(this, arguments), areas = r43AreaRatings(ctx, b);
    const avg = areas.length ? areas.reduce(function(s, a){ return s + a.v; }, 0)/areas.length : 25;
    const ovr = areas.length && areas.every(function(a){ return a.v >= 100; }) ? 100 : Math.min(99, Math.floor(avg));
    const find = function(id){ return areas.find(function(a){ return a.id===id; }); };
    const asAttr = function(a, fall){ return a ? {name:a.name, short:a.short, v:a.v, subs:a.subs, color:a.color, cap:a.cap, capped:a.capped, body:a.body} : fall; };
    const out = {areas:areas, OVR:ovr, low:areas.length ? Math.min.apply(null, areas.map(function(a){ return a.v; })) : 25,
      BUS:asAttr(find('work'), b.BUS), PER:asAttr(find('personal'), b.PER), HLT:asAttr(find('health'), b.HLT)};
    out.DIS = {name:'Overall', short:'OVR', v:ovr, subs:[], color:'#8fd3ff'};
    return out;
  };
})(xpAttributes);

// ---- the summary: XP, level, rank ----
xpSummaryFresh = function(){
  const start = xpStart(), p = state.profile;
  if(p.xpBook!==43 && typeof p.xpLevel!=='number'){ p.xpBook = 43; persist('profile'); }   // new here: nothing to switch over
  const sig = xpSig(); if(sig!==xpCache.sig){ xpCache = {sig:sig, days:{}}; r43Cache = {sig:sig, raw:{}}; }
  r43EarlyScan();
  const ctx = xpCtx(), today = todayStr(), ws = startOfWeekStr(today);
  let daily = 0, week = 0; const byArea = {}, areaWeek = {};
  for(let d = start; d <= today; d = addDays(d, 1)){
    let items = d===today ? null : xpCache.days[d];
    if(!items){ items = xpDay(d, ctx); if(d!==today) xpCache.days[d] = items; }
    items.forEach(function(x){ daily += x.xp; byArea[x.a || 'all'] = (byArea[x.a || 'all']||0) + x.xp; if(d >= ws){ week += x.xp; areaWeek[x.a || 'all'] = (areaWeek[x.a || 'all']||0) + x.xp; } });
  }
  const one = r43OneOffs(), gl = r43GoalLines(), ms = xpMaster(ctx);
  r43AutoRaise();
  const clientXp = one.events.reduce(function(a, e){ return a + e.xp; }, 0);
  const goalLineXp = gl.reduce(function(a, e){ return a + e.xp; }, 0);
  const demo = typeof DEMO_ON!=='undefined' && DEMO_ON && p.demoXp ? Math.max(0, Number(p.demoXp) || 0) : 0;
  const goalXp = goalLineXp + ms.xp + demo;
  gl.forEach(function(e){ if(e.d >= ws) week += e.xp; });
  const total = Math.max(0, Math.round(daily + clientXp + one.mrrXp + one.followerXp + goalXp));
  const todayItems = xpDay(today, ctx), raw = r43RawOf(today, ctx);
  const attrs = xpAttributes(ctx);
  // the level: claimed with the button. XP that was marked wrong takes it back down, with a notice.
  const earned = xpLevelOf(total);
  let level = Math.min(LEVEL_MAX, xpClaimedLevel(earned, one.mrr, attrs.HLT ? attrs.HLT.v : 25));
  if(p.xpBook===43 && level > earned && total < xpForLevel(level)){ const from = level; level = p.xpLevel = earned; if(p.xpSeen) p.xpSeen.level = earned; persist('profile'); r43LevelDropped(from, earned); }
  const maxed = level >= LEVEL_MAX, lo = xpForLevel(level), hi = maxed ? lo : xpForLevel(level + 1);
  const pct = maxed ? 1 : Math.max(0, Math.min(1, (total - lo)/(hi - lo)));
  // rank: the level and every area's rating (the lowest one), plus MRR on the Clients track
  const track = r43ClientsTrack();
  let rank = 0; RANKS.forEach(function(r, i){ if(level >= r.level && attrs.low >= r.low && (!track || one.mrr >= r.mrr)) rank = i; });
  const next = RANKS[rank + 1] || null;
  const weakest = attrs.areas.slice().sort(function(a, b){ return a.v - b.v; })[0];
  const needs = next ? [level < next.level ? 'level '+next.level : '', attrs.low < next.low ? (weakest ? weakest.name : 'every area')+' at '+next.low : '', track && one.mrr < next.mrr ? money(next.mrr)+' MRR' : ''].filter(Boolean) : [];
  const x = {total:total, week:Math.round(week), today:todayItems, todayXp:todayItems.reduce(function(a, i){ return a + i.xp; }, 0), todayArea:raw.area, byArea:byArea, areaWeek:areaWeek,
    mrr:one.mrr, mrrBase:one.mrrBase, mrrBest:one.mrrBest, mrrXp:one.mrrXp, clientXp:clientXp, won:one.events.length, start:start, goalXp:goalXp, goalLines:gl, oneOffs:one.events,
    goals:{counted:0, pending:0, xp:goalLineXp}, ownGoalXp:goalLineXp, checkins:{xp:0, parts:{}}, master:ms, followers:one.followers, followerXp:one.followerXp,
    level:level, earned:earned, levelLo:lo, levelHi:hi, levelPct:pct, banked:Math.max(0, total - hi), canLevel:!maxed && total >= hi, blocked:[], gate:null, maxed:maxed,
    rank:rank, next:next, needs:needs, attrs:attrs, ovr:attrs.OVR};
  r43TrackSources(x);
  return x;
};

// ---- when XP comes back off: a minus line in the history, and the level follows ----
function r43Sources(x){
  const s = {};
  Object.keys(x.byArea).forEach(function(a){ s['area:'+a] = x.byArea[a]; });
  s.clients = x.clientXp; s.goals = x.goalXp;
  return s;
}
const R43_SRC_NAMES = {clients:'Clients', goals:'Goals and check-ins', 'area:all':'Balance and streak bonus'};
function r43TrackSources(x){
  const p = state.profile, now = r43Sources(x), prev = ui.r43Src;
  ui.r43Src = now;
  if(!prev || p.xpBook!==43 || ui.r43SrcHold){ ui.r43SrcHold = false; return; }
  const lost = [];
  Object.keys(prev).forEach(function(k){ const d = (prev[k]||0) - (now[k]||0); if(d > 0) lost.push({k:k, xp:d}); });
  if(!lost.length) return;
  const list = p.xpMinus = arr(p.xpMinus);
  lost.forEach(function(l){ list.push({d:todayStr(), at:Date.now(), why:'Taken back: '+(R43_SRC_NAMES[l.k] || (l.k.indexOf('area:')===0 ? r43AreaName(l.k.slice(5)) : l.k))+' (something was removed or un-ticked)', xp:-Math.round(l.xp)}); });
  if(list.length > 120) list.splice(0, list.length - 120);
  persist('profile');
}
function r43LevelDropped(from, to){
  const p = state.profile; p.xpDrops = arr(p.xpDrops); p.xpDrops.push({at:Date.now(), from:from, to:to});
  setTimeout(function(){ if(typeof sysNote==='function') sysNote('Level '+from+' → '+to+'. XP that was marked wrong came off (see your XP history).'); }, 400);
}

// rank holds for 30 days below its line, then follows
xpSummary = (function(base){
  return function(){
    const x = base.apply(this, arguments); if(!x || !state.profile) return x;
    const p = state.profile, earned = x._rankEarned!=null ? x._rankEarned : x.rank;
    if(p.rankClaimed!=null && earned < p.rankClaimed){
      if(!p.rankBelowSince){ p.rankBelowSince = todayStr(); persist('profile'); }
      const days = Math.round((new Date(todayStr()+'T12:00') - new Date(p.rankBelowSince+'T12:00'))/86400000);
      if(days >= 30){ p.rankClaimed = earned; p.rankBelowSince = null; persist('profile'); x.rank = earned; }
      else { x.rank = p.rankClaimed; x.rankSlipping = 30 - days; }
    } else if(p.rankBelowSince){ p.rankBelowSince = null; persist('profile'); }
    return x;
  };
})(xpSummary);

// ---- going to sleep is the goodnight: it's when you were in bed ----
function r43MarkBed(){
  const now = new Date(), p = state.profile; let m = now.getHours()*60 + now.getMinutes(), d = todayStr();
  if(m < 300){ m += 1440; d = addDays(d, -1); }
  p.xpBed = p.xpBed && typeof p.xpBed==='object' ? p.xpBed : {};
  if(p.xpBed[d]==null || m < p.xpBed[d]) p.xpBed[d] = m;
  const keys = Object.keys(p.xpBed).sort(); if(keys.length > 120) keys.slice(0, keys.length - 120).forEach(function(k){ delete p.xpBed[k]; });
  persist('profile');
}
if(ACTIONS.startSleepMode) ACTIONS.startSleepMode = (function(base){ return function(){ const was = !!(state.modes.active && state.modes.active.sleep); const r = base.apply(this, arguments); try{ if(!was && state.modes.active && state.modes.active.sleep) r43MarkBed(); }catch(e){} return r; }; })(ACTIONS.startSleepMode);

// ---- the month's habit, kept today (+30) ----
ACTIONS.r43HabitToday = function(){
  const k = monthKey(), store = intentStore().months, rec = store[k] = store[k] || {at:Date.now()};
  rec.habitDays = rec.habitDays && typeof rec.habitDays==='object' ? rec.habitDays : {};
  const d = todayStr(); if(rec.habitDays[d]) delete rec.habitDays[d]; else rec.habitDays[d] = 1;
  persist('journal'); xpLast = null; playTick(); renderView();
  if(rec.habitDays[d]) xpToast(XP_BOOK.personal.habit, 'Habit kept.');
};
// ---- the weekly money check-in (+75) ----
ACTIONS.r43MoneyCheckin = function(){
  const f = state.finances; f.checkins = arr(f.checkins);
  const ws = startOfWeekStr(todayStr());
  if(f.checkins.some(function(c){ const d = typeof c==='string' ? c : c.date; return d >= ws; })){ showToast('Already checked in on your money this week.', {icon:'&#128181;'}); return; }
  f.checkins.push({date:todayStr(), at:Date.now()}); persist('finances'); xpLast = null; playPositive(); renderView();
  xpToast(XP_BOOK.personal.money, 'Money check-in.');
};

// ---- areas you added: their habits and their timer ----
ACTIONS.r43AreaHabit = function(el, e, id){
  const parts = String(id).split(':'), a = r43Area(parts[0]); if(!a) return;
  const h = arr(a.habits).find(function(x){ return x.id===parts[1]; }); if(!h) return;
  h.days = h.days && typeof h.days==='object' ? h.days : {}; const d = todayStr();
  if(h.days[d]) delete h.days[d]; else h.days[d] = 1;
  persist('profile'); xpLast = null; playTick(); renderView();
  if(h.days[d]) xpToast(XP_BOOK.added.habit, h.label+'.');
};
ACTIONS.r43AreaTimer = function(el, e, id){
  const L = r43Store();
  if(L.timer && L.timer.area===id){
    const mins = Math.round((Date.now() - L.timer.start)/60000);
    if(mins >= 1) L.sessions.push({id:uid(), area:id, date:todayStr(new Date(L.timer.start)), minutes:mins});
    L.timer = null; persist('personal'); xpLast = null; playPositive(); renderView();
    if(mins >= 1) xpToast(Math.round(mins/60*XP_BOOK.added.session), fmtDurationLabel(mins)+' of '+r43AreaName(id)+'.');
    return;
  }
  if(L.timer){ showToast('Stop '+r43AreaName(L.timer.area)+' first.', {icon:'&#9201;'}); return; }
  L.timer = {area:id, start:Date.now()}; persist('personal'); playTick(); renderView();
};
setInterval(function(){ const L = state && state.personal && state.personal.areaLog; if(!L || !L.timer) return; document.querySelectorAll('[data-r43-tick]').forEach(function(el){ el.textContent = fmtDurationLabel(Math.max(0, Math.floor((Date.now() - L.timer.start)/60000))); }); }, 20000);

// ---- the task sheet: which area a task counts toward ----
function r43AreaPickHtml(cur, auto, kind){
  const areas = r43Areas(); if(areas.length < 2) return '';
  return '<div class="field r43-area-f"><label>Area</label><div class="r43-area-seg" data-kind="'+kind+'">'+
    '<button type="button" class="'+(!cur ? 'is-on' : '')+'" data-action="r43PickArea" data-id="'+kind+':">Auto · '+escapeHtml(r43AreaName(auto))+'</button>'+
    areas.map(function(a){ return '<button type="button" class="'+(cur===a.id ? 'is-on' : '')+'" style="--ac:'+r43AreaColor(a.id)+'" data-action="r43PickArea" data-id="'+kind+':'+a.id+'"><i></i>'+escapeHtml(a.name)+'</button>'; }).join('')+
  '</div></div>';
}
ACTIONS.r43PickArea = function(el, e, id){
  const i = String(id).indexOf(':'), kind = id.slice(0, i), v = id.slice(i + 1) || null;
  if(kind==='add') ui.r43NewArea = v; else ui.r43EditArea = v || '';
  const seg = el && el.closest('.r43-area-seg'); if(seg) seg.querySelectorAll('button').forEach(function(b){ b.classList.toggle('is-on', b===el); });
};
r41TaskSheet = (function(base){
  return function(h, kind, t){
    let out = base.apply(this, arguments); if(!out) return out;
    const auto = kind==='edit' && t ? r43TaskAreaAuto(t) : (function(){ const cs = arr(ui.newTaskClients); return cs.some(function(c){ return c && c!=='personal' && c!=='general'; }) ? 'work' : 'personal'; })();
    const cur = kind==='edit' && t ? (ui.r43EditArea!=null ? ui.r43EditArea || null : t.area || null) : ui.r43NewArea || null;
    const pick = r43AreaPickHtml(cur, auto, kind);
    if(pick) out = out.replace('<div class="r41-ts-row">', pick+'<div class="r41-ts-row">');
    return out;
  };
})(r41TaskSheet);
openAddTaskModal = (function(base){ return function(){ ui.r43NewArea = null; return base.apply(this, arguments); }; })(openAddTaskModal);
openTaskEditModal = (function(base){ return function(){ ui.r43EditArea = null; return base.apply(this, arguments); }; })(openTaskEditModal);
addTask = (function(base){
  return function(){
    const n = state.tasks.items.length, r = base.apply(this, arguments);
    if(state.tasks.items.length > n && ui.r43NewArea){ state.tasks.items[state.tasks.items.length - 1].area = ui.r43NewArea; persist('tasks'); }
    ui.r43NewArea = null; return r;
  };
})(addTask);
saveEditTask = (function(base){
  return function(id){
    const t = state.tasks.items.find(function(x){ return x.id===id; }), v = ui.r43EditArea;
    const r = base.apply(this, arguments);
    if(t && v!=null){ if(v) t.area = v; else delete t.area; persist('tasks'); }
    ui.r43EditArea = null; return r;
  };
})(saveEditTask);
