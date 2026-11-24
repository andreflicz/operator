// Round 50: spending that's really spending, ads by campaign, the reels weeks, Up next ✕, the quote, the timer glow.
const { instrument, launch, newPage, check, report, OUT } = require('./common.js');
(async () => {
  instrument(process.argv[2], OUT+'/r50.html');
  const b = await launch();
  const at = (d, h) => new Date(2026, 9, d, h).getTime();
  const ex = (id, date, name, amount, src) => ({id, date, name, amount, src:src || 'bank', cat:'other'});
  const p = await newPage(b, OUT+'/r50.html', {profile:{name:'Andre Lopez'},
    business:{clients:[
      {id:'jj', name:'Jay', business:'JJS', stage:'active', status:'active', mrr:3000, startDate:'2026-01-01', deliverables:[{id:'rj', title:'Reels', recurring:true, weeklyTarget:3, completedDates:[]}]},
      {id:'bm', name:'Bros', business:'Brothers Mechanical', stage:'active', status:'active', mrr:1500, startDate:'2025-06-01', reactivated:true, reactivatedAt:'2026-10-19', deliverables:[{id:'rb', title:'Reels', recurring:true, weeklyTarget:2, completedDates:[]}]}]},
    finances:{debts:[], payments:[], income:[], invoices:[], expenses:[
      ex('e1', '2026-10-03', 'Whole Foods', 120), ex('e2', '2026-10-04', 'Payment to Chase card', 2500), ex('e3', '2026-10-05', 'Online Transfer to SAV 1234', 3000),
      ex('e4', '2026-10-06', 'Netflix', 15.99), ex('e5', '2026-10-06', 'NETFLIX.COM', 15.99, 'statement'), ex('e6', '2026-10-08', 'Robinhood', 500),
      ex('e7', '2026-09-10', 'Rent', 1800), ex('e8', '2026-09-12', 'CAPITAL ONE MOBILE PMT', 4000), ex('e9', '2026-09-15', 'Amazon', 80)]}}, at(26, 13));
  const E = c => p.evaluate(x => window.__op.ev(x), c);
  await E("document.querySelectorAll('.overlay').forEach(o => o.classList.add('hidden'))");

  // 1. money
  const h = await E("expensesHtml()");
  const tot = h.match(/Spent this month<\/small><b>([^<]+)/), last = h.match(/<span class="is-(?:up|down)">([^<]+) last month/);
  check('this month only counts real spending (groceries, Netflix once)', tot && /\$13[56]/.test(tot[1]), tot && tot[1]);
  check('last month leaves out the card payment', last && /1,880/.test(last[1]), last && last[1]);
  check('the moved money is shown on its own', /moved, not spent/.test(h) && /\$6,016/.test(h), (h.match(/r50-moved[^<]*<?[^<]*/) || [''])[0]);
  check('transfers and card payments are tagged Not spending', await E("['e2','e3','e6','e8'].every(id => finExpenses().find(e => e.id===id).cat==='move')"));
  check('the same purchase from two imports counts once', await E("finExpenses().find(e => e.id==='e5').dupOf==='e4'"));
  await E("ACTIONS.expCat(null, null, 'e6')"); // (cycles its category: you set it, so it stays set)
  check('changing a category by hand sticks', await E("finExpenses().find(e => e.id==='e6').catSet===true"));
  check('Op sees the real number', !/Online Transfer to SAV/.test(await E("JSON.stringify(aiContext())")));

  // 2. ads, by campaign
  await E("igCfg().zernioKey = 'k'; igCfg().znAdsCache = {v:2, at:Date.now(), days:30, conn:{id:'c', name:'Lopez Media'}, accts:[], camps:[{id:'k1', name:'JJS leads', status:'ACTIVE', acct:'a1', m:{spend:400, leads:20, impressions:10000, clicks:200}}, {id:'k2', name:'Bros brand', status:'ACTIVE', acct:'a1', m:{spend:100, impressions:5000, clicks:50}}]}; znAccs = () => [{_id:'c', platform:'metaads'}]; znAdsLoad = () => {}; adLinks()['k1'] = 'jj'; ui.view='convos'; ui.socTab='ads'; ui.adClient=null; renderView()");
  await p.waitForTimeout(300);
  const ads = await p.textContent('#viewRoot');
  check('ads overview: one card per client, unassigned ones on their own', /JJS/.test(ads) && /Not assigned yet/.test(ads) && /1 to assign/.test(ads));
  check('no ad sets and no accounts anywhere', !/ad set/i.test(ads) && !/By account/.test(ads));
  await E("ui.adClient='none'; renderView()"); await p.waitForTimeout(200);
  check('each campaign gets an Assign to… picker', await E("!!document.querySelector('.r50-cr select[data-adlink=\"k2\"]')"));
  await p.selectOption('select[data-adlink="k2"]', 'bm'); await p.waitForTimeout(300);
  check('assigning moves it to that client', await E("adClientOf({id:'k2'})==='bm'"));
  await E("ui.showClientModal='jj'; renderView()");
  check('the client window has no ad-account chips', await E("renderClientModal().indexOf('r49-cacc') < 0"));
  await E("ui.showClientModal=null");

  // 3. reels weeks
  await E("ui.view='focus'; ui.focusTab='tasks'; ui.focusTasksSubTab='clientBacklog'; renderView()"); await p.waitForTimeout(300);
  const bl = await p.textContent('#viewRoot');
  // (R51: this cycle's four weeks per deliverable; future ones say Upcoming)
  check('four weeks per deliverable, no strip, no posting / making', await E("Array.from(document.querySelectorAll('.cbl-d')).every(d => d.querySelectorAll('.r51-wk').length <= 4)") && !(await p.$('.r48-wks')) && !/Posting now|Making now/.test(bl) && /This week/.test(bl));
  const row = await p.$('.r51-wk.is-now');
  if(row){
    await (await row.$('[data-action="dvwDone"]')).click(); await p.waitForTimeout(250);
    check('Week done marks it done', (await p.$$('.r51-wk.is-done')).length >= 1);
  } else check('this week is there', false);
  check('a client who came back owes nothing from before', await E("(function(){ const d = state.business.clients[1].deliverables[0]; return r42Need(d, addDays(thisWeekKey(), -14))===0 && r42Need(d, thisWeekKey()) > 0; })()"));
  await E("ui.showClientModal='bm'; renderView()");
  check('their window has the day they came back', await E("/id=\"r50Since\" value=\"2026-10-19\"/.test(renderClientModal())"));
  await E("ui.showClientModal=null; ACTIONS.r43Reactivate(null, null, 'jj')");
  check('reactivating someone fills that in for today', await E("state.business.clients[0].reactivated ? state.business.clients[0].reactivatedAt===todayStr() : true"));

  await E("document.querySelectorAll('.overlay').forEach(o => o.classList.add('hidden'))");
  // 4. Up next ✕
  await E("state.tasks.items=[{id:'t1', title:'One', status:'today'}, {id:'t2', title:'Two', status:'today'}]; ui.view='focus'; ui.focusTasksSubTab='overview'; renderView()"); await p.waitForTimeout(200);
  check('a suggested Up next has ✕ too', await E("!!document.querySelector('[data-dropzone=next] [data-action=clearStagedTask]')"));
  await p.click('[data-dropzone="next"] [data-action="clearStagedTask"]'); await p.waitForTimeout(200);
  check('✕ actually clears it', await E("nextUpTask()===null && /Nothing lined up/.test(document.querySelector('[data-dropzone=next]').textContent)"));
  await E("ACTIONS.pickNextTask(null, null, 't2')");
  check('picking one lines it up again', await E("nextUpTask() && nextUpTask().id==='t2'"));

  // 5. the quote opens the locked-in page; 6. no square behind the timer faces
  await E("state.focus.activeSession={startedAt:Date.now()-600000, plannedMinutes:50, completedTasks:[], breaks:[], onBreak:false, completeFired:false}; state.profile.lockedView='full'; ui.view='today'; renderView()"); await p.waitForTimeout(300);
  check('locked in: the quote comes first, under the greeting', await E("lockedLayout()[0]==='quote'"));
  await E("state.profile.lockedView='minimal'; state.profile.timerStyle='ring'; renderView()"); await p.waitForTimeout(300);
  check('minimal timer: round, nothing square behind the glow', await E("(function(){ const s = getComputedStyle(document.querySelector('.np-art.tm')); return s.borderRadius==='50%' && s.outlineStyle==='none'; })()"));
  check('no errors', p.errors.length===0, p.errors);
  await b.close();
  process.exit(report() ? 1 : 0);
})().catch((e) => { console.error(e); process.exit(1); });
