// Round 43 (October batch, build 3): the XP book (areas, balanced days, the cheaper level curve, ranks by the
// lowest area, clawbacks), the guide written from it, Settings → XP & Areas, and the new Goals page
// (hold to complete, the moment, fix a count, plan ahead, numbers goals with a graph).
const { instrument, launch, newPage, check, report, OUT } = require('./common.js');
(async () => {
  instrument(process.argv[2], OUT+'/r43.html');
  const b = await launch();
  const T = new Date(2026,9,25,11,0).getTime();   // Sun Oct 25
  const biz = {clients:[
    {id:'jj', name:'Jay', business:'JJS', stage:'active', status:'active', mrr:3000, startDate:'2026-10-03', createdAt:'2026-10-03', deliverables:[]},
    {id:'pk', name:'Pat', business:'Peak Fitness', stage:'active', status:'active', mrr:1000, startDate:'2026-10-14', createdAt:'2026-10-14', deliverables:[]}]};
  const seed = {profile:{name:'Andre', lineupView:'list', xpStart:'2026-10-12', xpMrrBase:0, xpClientsBase:[], calorieTarget:2000, weeklyWorkoutTarget:4, goalWeight:190, bedtime:'23:00', xpBook:43, xpLevel:0, revenueGoalMonthly:20000},
    business:biz,
    tasks:{items:[
      {id:'w1', title:'Edit JJS reel', status:'done', priority:'med', clients:['jj'], completedAt:'2026-10-23', createdAt:'2026-10-20'},
      {id:'p1', title:'Clean room', status:'done', priority:'low', clients:['personal'], completedAt:'2026-10-23', createdAt:'2026-10-20'}]},
    health:{gymLog:[{id:'g1', date:'2026-10-23', duration:60}], weightLog:[{id:'w', date:'2026-10-20', weight:206}, {id:'w2', date:'2026-10-24', weight:205}], calorieEntries:[{id:'c1', date:'2026-10-23', name:'Day', calories:1900}]},
    journal:{entries:[{id:'j1', date:'2026-10-23', text:'Good day.'}]},
    goals:{items:[{id:'lg', label:'Buy my first car', done:false, target:null, createdAt:'2026-10-20', life:true, xp:45000, xpBy:'op'}]}};
  const p = await newPage(b, OUT+'/r43.html', seed, T);
  const E = c => p.evaluate(x => window.__op.ev(x), c);
  await E("document.querySelectorAll('.overlay').forEach(o => o.classList.add('hidden'))");

  // ---- the book ----
  check('level 100 costs about 371k in all', Math.abs(await E("xpForLevel(100)") - 371255) < 50);
  check('a full 8 hours of deep work pays 204 (+100 gold)', await E("Math.round(r43Deep(480))")===204);
  check('the old tables follow the book', await E("CHECKIN_XP.weekIn===50 && CHECKIN_XP.monthIn===150 && CHECKIN_XP.maxGoals===5 && GOAL_XP_BAND.life[1]===50000"));
  check('default areas: Work, Health, Personal', await E("r43Areas().map(a => a.name).join()")==='Work,Health,Personal');
  check('client tasks go to Work, the rest to Personal', await E("r43TaskArea(state.tasks.items.find(t => t.id==='w1'))")==='work' && await E("r43TaskArea(state.tasks.items.find(t => t.id==='p1'))")==='personal');
  const day = JSON.parse(await E("xpLast = null; xpSummary(); JSON.stringify(xpDay('2026-10-23', xpCtx()))"));
  const by = {}; day.forEach(i => by[i.a] = (by[i.a]||0) + i.xp);
  check('a day earns in each area (workout, food, journal, tasks)', by.health >= 250 && by.personal >= 80 && by.work > 0, by);
  check('touching only some areas pays the half bonus (×1.10)', day.some(i => i.k==='balance' && /1\.10/.test(i.why)), day);
  await E("state.focus.sessions.push({id:'s1', date:'2026-10-23', minutes:360, start:Date.now(), end:Date.now()}); persist('focus'); xpLast = null");
  const day2 = JSON.parse(await E("xpCache = {sig:'', days:{}}; r43Cache = {sig:'', raw:{}}; xpSummary(); JSON.stringify(xpDay('2026-10-23', xpCtx()))"));
  check('…and every area touched pays ×1.25', day2.some(i => i.k==='balance' && /1\.25/.test(i.why)), day2);
  check('ranks have neutral names', await E("RANKS.map(r => r.name).join()")==='Locked In,Operator,Specialist,Pro,Captain,Commander,Director,Elite,Legend');
  await E("state.profile.rankClientsTrack = true");
  check('…and the Clients track names the top two Mogul and Millionaire', await E("RANKS[7].name+RANKS[8].name")==='MogulMillionaire');
  await E("state.profile.rankClientsTrack = false");
  const x = JSON.parse(await E("xpLast = null; const x = xpSummary(); JSON.stringify({areas:x.attrs.areas.map(a => a.id), low:x.attrs.low, ovr:x.ovr, clientXp:x.clientXp})"));
  check('the card has one rating per area, and Overall is their average', x.areas.join()==='work,health,personal' && x.ovr >= 25, x);
  check('two new clients pay 1,500 each', x.clientXp===3000, x);
  await E("state.business.clients[1].reactivated = true; persist('business'); xpLast = null");
  check('a reactivated client pays 300 and isn’t new', await E("xpSummary().clientXp")===1800 && await E("mgMonthlyDefs().find(m => m.key==='newclients').cur")===1);
  const t0 = await E("xpLast = null; xpSummary().total");
  await E("state.business.clients[0].mrr = 1000; persist('business'); xpLast = null");
  check('MRR dipping takes no XP away (new highs only)', await E("xpSummary().total")===t0 - 0 || await E("xpSummary().mrrXp") >= 2400);

  // ---- clawbacks ----
  await E("ui.r43Src = null; xpLast = null; xpSummary(); state.profile.xpLevel = xpSummary().earned; persist('profile')");
  await E("state.goals.items.push({id:'wg', tier:'week', pk:'2026-10-19', label:'Ship it', done:true, doneAt:'2026-10-24', xp:300}); persist('goals'); xpLast = null; xpSummary()");
  const lvBefore = await E("xpSummary().total");
  await E("state.goals.items = state.goals.items.filter(g => g.id!=='wg'); persist('goals'); xpLast = null; xpSummary()");
  check('deleting a done goal takes its XP back, with a minus line', await E("xpSummary().total") < lvBefore && await E("arr(state.profile.xpMinus).some(m => m.xp < 0)"));
  await E("state.profile.xpLevel = 30; persist('profile'); xpLast = null; xpSummary()");
  check('…and a level above what the XP pays for comes back down', await E("state.profile.xpLevel")===await E("xpSummary().earned"));

  // ---- settings ----
  await E("ui.view='settings'; ui.settingsTab='xp'; renderView()"); await p.waitForTimeout(200);
  check('Settings has XP & Areas', !!(await p.$('.settings-nav-item.active[data-tab="xp"]')) && !!(await p.$('.r43-areas')));
  await p.fill('[data-r43-area="work"]', 'Business'); await p.dispatchEvent('[data-r43-area="work"]', 'change'); await p.waitForTimeout(150);
  check('an area can be renamed', await E("r43AreaName('work')")==='Business');
  await E("r43AreasRaw().push({id:'afam', name:'Family', on:true, since:'2026-10-25', habits:[{id:'h1', label:'Call mom', days:{}}]}); persist('profile'); renderView()");
  await E("ACTIONS.r43AreaHabit(null, null, 'afam:h1')");
  check('an added area earns from its habits', await E("xpLast = null; (xpSummary().todayArea || {}).afam")===30);
  await E("ACTIONS.r43AreaToggle(null, null, 'afam')");
  check('turning an area off keeps what it earned', await E("r43AreaOn('afam')")===false && await E("xpLast = null; xpSummary().byArea.afam || 0")===30);
  check('bedtime is a setting', !!(await p.$('#r43Bedtime')));

  // ---- the guide ----
  await E("ACTIONS.openXpHow()"); await p.waitForTimeout(250);
  const guide = await p.textContent('#xpHowContent');
  check('the guide is written from the book (the new name, the tables)', /Business/.test(guide) && /Balanced days and streaks/.test(guide) && /204/.test(guide) && /Life milestone/.test(guide), guide.slice(0, 300));
  check('…and is general (no pillars, no Discipline rating, no day-off pay)', !/pillar/i.test(guide) && !/Discipline/.test(guide) && !/day off/i.test(guide.replace(/Days off you/,'')));
  await E("ACTIONS.closeXpHow()");

  // ---- the goals page ----
  await E("ui.view='personal'; ui.personalTab='goals'; renderView()"); await p.waitForTimeout(300);
  check('Goals: master goals, the month and the week, your goals', !!(await p.$('.g39-rev, .r43-mrings .mg-card')) && (await p.$$('.r43-panel')).length===2 && !!(await p.$('.r43-owns .r43-own')));
  await p.screenshot({path:OUT+'/r43-goals.png', fullPage:true});
  await E("state.goals.items.push({id:'og', label:'Read 12 books', done:false, createdAt:'2026-10-21'}); persist('goals'); renderView()"); await p.waitForTimeout(150);
  await E("toggleGoal('og')");
  check('a single click never completes a goal', await E("state.goals.items.find(g => g.id==='og').done")===false);
  const hb = await p.$('.r43-own [data-hold-act="r43GoalDone"][data-id="og"]'); await hb.scrollIntoViewIfNeeded(); const box = await hb.boundingBox();
  await p.mouse.move(box.x + 20, box.y + 10); await p.mouse.down(); await p.waitForTimeout(400); await p.mouse.up(); await p.waitForTimeout(200);
  check('…letting go early does nothing', await E("state.goals.items.find(g => g.id==='og').done")===false);
  await p.mouse.move(box.x + 20, box.y + 10); await p.mouse.down(); await p.waitForTimeout(1400); await p.mouse.up(); await p.waitForTimeout(300);
  check('holding 1.2 seconds completes it, with the moment', await E("state.goals.items.find(g => g.id==='og').done")===true && !!(await p.$('#r43GoalFx')), [await E("state.goals.items.find(g => g.id==='og').done"), !!(await p.$('#r43GoalFx'))]);
  await p.screenshot({path:OUT+'/r43-moment.png'});
  await E("const f = document.getElementById('r43GoalFx'); if(f) f.remove()");
  await E("ACTIONS.r43FixCount(null, null, 'master')"); await p.waitForTimeout(150);
  check('fix a count: who counts as new, with a switch', (await p.$$('#r43FixOverlay .r43-fix-r')).length===2);
  await p.screenshot({path:OUT+'/r43-fix.png'});
  await E("ACTIONS.r43FixStep(null, null, '1')");
  check('…or set the number yourself', await E("mgMonthlyDefs().find(m => m.key==='newclients').cur")===2);
  await E("ACTIONS.r43FixClose()");
  // plan ahead (Sunday the 25th: both open)
  await E("ui.r43GoalsMode='plan'; renderView()"); await p.waitForTimeout(200);
  check('plan ahead: next month and next week', (await p.$$('.r43-plan:not(.is-closed)')).length===2);
  await p.fill('#r43PlanLine-month', 'Ahead of the content.');
  const lk = await p.$('.r43-plan[data-kind="month"] .r43-hold'); const lb = await lk.boundingBox();
  const tb = await E("xpLast = null; xpSummary().total");
  await p.mouse.move(lb.x + 40, lb.y + 10); await p.mouse.down(); await p.waitForTimeout(1400); await p.mouse.up(); await p.waitForTimeout(300);
  check('…holding locks it in and pays +150', !!(await E("intentStore().months['2026-11'] && intentStore().months['2026-11'].at")) && await E("xpLast = null; xpSummary().total") - tb===150);
  await p.screenshot({path:OUT+'/r43-plan.png', fullPage:true});
  // a numbers goal
  await E("ui.r43GoalsMode='now'; state.goals.items.push({id:'hg', tier:'week', pk:'2026-10-19', label:'20 hours of deep work', done:false, autoTrack:'hours', period:'week', target:20, unit:'h', createdAt:'2026-10-19'}); persist('goals'); renderView(); ACTIONS.r43GoalOpen(null, null, 'hg')"); await p.waitForTimeout(250);
  check('a numbers goal opens with its graph and pace', !!(await p.$('#r43DetOverlay svg polyline')) && /Per day needed/.test(await p.textContent('#r43DetOverlay')));
  await p.screenshot({path:OUT+'/r43-graph.png'});
  await E("ACTIONS.r43DetClose()");
  await E("ui.view='personal'; ui.personalTab='you'; renderView()"); await p.waitForTimeout(250);
  check('You: today by area and one rating card per area', !!(await p.$('.r43-today')) && (await p.$$('.r43-you-attrs .you-attr')).length===3);
  await p.screenshot({path:OUT+'/r43-you.png', fullPage:true});

  // ---- the switch-over, for someone coming from the old XP ----
  const p2 = await newPage(b, OUT+'/r43.html', Object.assign({}, seed, {profile:Object.assign({}, seed.profile, {xpBook:undefined, xpLevel:7, xpSeen:{total:40000, level:7, init:1}})}), T);
  await p2.waitForTimeout(400);
  check('upgraders see old → new before anything changes', !!(await p2.$('#r43Rebal')) && await p2.evaluate(() => window.__op.ev("state.profile.xpLevel"))===7);
  await p2.click('#r43Rebal [data-action="r43RebalApply"]'); await p2.waitForTimeout(250);
  check('…and Switch over applies it', await p2.evaluate(() => window.__op.ev("state.profile.xpBook===43 && state.profile.xpLevel===xpSummary().earned")));

  check('no page errors (round 43)', p.errors.length===0 && p2.errors.length===0, p.errors.concat(p2.errors));
  await b.close();
  process.exit(report() ? 1 : 0);
})();
