// Round 53: Reach out to leads, lifecycle reports as tasks, getting ahead, Business overview, ads all time,
// pop-ups you can drag, the journal bubble's entry point.
const { instrument, launch, newPage, check, report, OUT } = require('./common.js');
(async () => {
  instrument(process.argv[2], OUT+'/r53.html');
  const b = await launch();
  const p = await newPage(b, OUT+'/r53.html', {profile:{name:'Andre Lopez', revenueGoalMonthly:10000},
    business:{clients:[
      {id:'jj', name:'Jay', business:'JJS', stage:'active', status:'active', mrr:3000, startDate:'2026-01-25', deliverables:[{id:'rj', title:'Reels', recurring:true, weeklyTarget:3, completedDates:[]}]},
      {id:'bm', name:'Bros', business:'Brothers Mechanical', stage:'active', status:'active', mrr:1500, startDate:'2025-06-01', deliverables:[]}],
      pipeline:[{id:'l1', name:'Mia', business:'Mia Spa', stage:'contacted', value:2500, touchpoints:[{id:'tp1', date:'2026-10-01', type:'call'}]}, {id:'l2', name:'Tom', business:'Tom Roofing', stage:'contacted', value:4000, touchpoints:[{id:'tp2', date:'2026-10-02', type:'dm'}]}]}}, null);
  const E = c => p.evaluate(x => window.__op.ev(x), c);
  await E("document.querySelectorAll('.overlay').forEach(o => o.classList.add('hidden'))");
  await E("masterTasksSync()"); await p.waitForTimeout(200);

  // 1. Reach out to leads
  const lt = await E("JSON.stringify(state.tasks.items.filter(t => t.master && t.master.kind==='reachLeads' && t.status!=='done'))");
  const L = JSON.parse(lt);
  check('there is a Reach out to leads task, like the clients one', L.length===1 && /Reach out to leads/.test(L[0].title), lt);
  check('it names the leads who are due', L[0] && L[0].leads && L[0].leads.length >= 1);
  const card = await E("taskCard(state.tasks.items.find(t => t.master && t.master.kind==='reachLeads'))");
  check('its card says who', /Leads/.test(card) && /Mia|Tom/.test(card));
  await E("completeTask(state.tasks.items.find(t => t.master && t.master.kind==='reachLeads').id)");
  check('done logs a touch on each one', await E("state.business.pipeline.every(l => crmOverdueDays('lead', l)==null || crmOverdueDays('lead', l) < 0)"), await E("state.business.pipeline.map(l => crmOverdueDays('lead', l))"));
  await E("masterTasksSync()");
  check('and it does not come right back', await E("!state.tasks.items.some(t => t.master && t.master.kind==='reachLeads' && t.status!=='done')"));

  // 2. lifecycle reports
  // (round 54: clients go on a cycle first; the reports are that cycle's repeating tasks)
  await E("(function(){ const cy = r53RegularCycle(), last = cy.steps[cy.steps.length - 1]; last.checklist = last.checklist.filter(it => !/check-in/i.test(it.text)); last.checklist.forEach(it => { if(/monthly/i.test(it.text)) it.repeat = 'month'; }); last.checklist.push({id:'wr', text:'Weekly report', type:'doc', repeat:'week'}); state.business.clients.forEach(c => { assignCycle(c, cy.id); c.cycleStepId = last.id; }); crm().r54Pending = []; })(); masterTasksSync()");
  const reps = JSON.parse(await E("JSON.stringify(state.tasks.items.filter(t => t.master && t.master.kind==='lcrep').map(t => ({c:t.client, t:t.title, e:t.master.every, d:t.deadline})))"));
  check('each regular client gets a Weekly report task', ['jj', 'bm'].every(id => reps.some(r => r.c===id && r.e==='week' && /weekly report/i.test(r.t))), reps);
  check('and a Monthly results report', ['jj', 'bm'].every(id => reps.some(r => r.c===id && r.e==='month')), reps);
  check('weekly check-ins are not a second task (Reach out to clients covers them)', !reps.some(r => /check-in/i.test(r.t)));
  const n0 = reps.length; await E("masterTasksSync(); masterTasksSync()");
  check('syncing again makes no copies', await E("state.tasks.items.filter(t => t.master && t.master.kind==='lcrep').length")===n0);
  await E("(function(){ const t = state.tasks.items.find(t => t.master && t.master.kind==='lcrep' && t.master.every==='week'); completeTask(t.id); })()"); await p.waitForTimeout(1300); await E("masterTasksSync()");
  check('a done report stays done this week', await E("state.tasks.items.filter(t => t.master && t.master.kind==='lcrep' && t.master.every==='week' && t.status==='done').length===1 && state.tasks.items.filter(t => t.master && t.master.kind==='lcrep').length===" + n0));
  await E("ui.view='business'; ui.businessTab='lifecycle'; renderView()"); await p.waitForTimeout(200);
  const ed = await E("(ui.editingCycleId = r53RegularCycle().id, renderLifecycleEditor())");
  check('the cycle editor has a repeat picker on each item', /data-cy-item-repeat/.test(ed) && /Every week/.test(ed));

  // 4. Business overview
  await E("ui.view='business'; ui.businessTab='overview'; renderView()"); await p.waitForTimeout(300);
  const bz = await p.textContent('#viewRoot');
  check('overview: MRR, pipeline value, collected, clients across the top', (await p.$$('.r53-kpi')).length===4 && /\$6,500/.test(bz) && /Pipeline/.test(bz));
  check('no outreach-this-week graph', !(await p.$('.ow-wrap, .outreach-week, .r53-hq .ow')) && !/Outreach this week/i.test(bz));
  check('pipeline stages with their value, leads listed', (await p.$$('.r53-st')).length >= 1 && (await p.$$('.r53-ld')).length===2);

  // 5. ads
  await E("igCfg().zernioKey = 'k'; igCfg().znAdsCache = {v:2, at:Date.now(), days:30, conn:{id:'c', name:'Lopez Media'}, accts:[], camps:[{id:'k1', name:'JJS leads', status:'ACTIVE', acct:'a1', m:{spend:400, leads:20, impressions:10000, clicks:200}}]}; znAccs = () => [{_id:'c', platform:'metaads'}]; znAdsLoad = () => {}; r53AdsAllLoad = () => {}; adLinks()['k1'] = 'jj'; igCfg().adLedger = {old1:{name:'Old campaign', spend:900, leads:30, acct:'a1'}}; adLinks()['old1'] = 'jj'; ui.view='convos'; ui.socTab='ads'; ui.adClient=null; renderView()");
  await p.waitForTimeout(300);
  check('ads: no totals strip on top', !(await p.$('#viewRoot .r49-acg ~ .sx-sum, #viewRoot .r49-adh + .sx-sum')));
  const at = await p.textContent('#viewRoot');
  check('each client card has its all-time spend and leads', /All time/.test(at) && /\$1,300/.test(at) && /30 leads/.test(at), at.slice(0, 600));
  check('and all of it adds up at the bottom', !!(await p.$('.r53-alltot')));
  check('a campaign seen once stays in the ledger', await E("!!igCfg().adLedger.k1 && igCfg().adLedger.k1.spend===400"));

  // 6. drag a pop-up by its top
  await E("ui.view='today'; renderView(); document.querySelectorAll('.overlay').forEach(o => o.classList.add('hidden'))");
  const ov = await E("(function(){ const o = Array.from(document.querySelectorAll('.overlay')).find(o => o.firstElementChild); if(!o) return null; o.classList.remove('hidden'); return o.id || o.className; })()");
  if(ov){
    const box = await E("(function(){ const o = Array.from(document.querySelectorAll('.overlay')).find(o => !o.classList.contains('hidden') && o.firstElementChild); const r = o.firstElementChild.getBoundingClientRect(); return {x:r.left + r.width/2 - 60, y:r.top + 10}; })()");
    await p.mouse.move(box.x, box.y); await p.mouse.down(); await p.mouse.move(box.x + 80, box.y + 40, {steps:5}); await p.mouse.up();
    check('a pop-up moves when you drag its top', /translate\(80px, 40px\)/.test(await E("Array.from(document.querySelectorAll('.overlay')).find(o => !o.classList.contains('hidden') && o.firstElementChild).firstElementChild.style.transform")));
    await E("document.querySelectorAll('.overlay').forEach(o => o.classList.add('hidden'))"); await p.waitForTimeout(50);
    check('closed, it goes back to the middle', await E("Array.from(document.querySelectorAll('.overlay')).every(o => !o.firstElementChild || !o.firstElementChild.style.transform)"));
  } else check('there is a pop-up to drag', false);
  check('no errors', p.errors.length===0, p.errors);
  await b.close();

  // 3. get ahead (early in a cycle, so there are weeks still to come)
  { const b3 = await launch();
  const g = await newPage(b3, OUT+'/r53.html', {business:{clients:[{id:'jj', name:'Jay', business:'JJS', stage:'active', status:'active', mrr:3000, startDate:'2026-01-01', deliverables:[{id:'rj', title:'Reels', recurring:true, weeklyTarget:3, completedDates:[]}]}]}}, new Date(2026, 9, 5, 13).getTime());
  const G = c => g.evaluate(x => window.__op.ev(x), c);
  await G("document.querySelectorAll('.overlay').forEach(o => o.classList.add('hidden')); masterTasksSync(); ui.view='focus'; ui.focusTab='tasks'; ui.focusTasksSubTab='clientBacklog'; renderView()"); await g.waitForTimeout(300);
  const fut = await g.$('.r51-wk.is-future');
  if(fut){
    check('an upcoming week has its counter', !!(await fut.$('.r42-ctr, [data-action*="r51"], .r42-count, button')));
    const btn = await fut.$('[data-action="dvwDone"]');
    check('and a Done early button', !!btn);
    if(btn){ await btn.click(); await g.waitForTimeout(300); check('done early: it is done, still marked Upcoming', (await g.$$('.r51-wk.is-future, .r51-wk.is-done')).length >= 1 && /Done early/.test(await g.textContent('#viewRoot'))); }
  } else check('there is an upcoming week to get ahead on', false);

  check('no errors (get ahead)', g.errors.length===0, g.errors); await b3.close(); }

  // 7. the bubble's way in (only inside the Mac app)
  const b2 = await launch(), ctx = await b2.newContext(), q = await ctx.newPage(); q.errors = []; q.on('pageerror', e => q.errors.push(e.message));
  await q.addInitScript(() => { window.operatorApp = {isApp:true, version:'t', status(){}, loginItem(){ return Promise.resolve(false); }, setLoginItem(){ return Promise.resolve(false); }, importFile(){}, show(){}}; localStorage.setItem('opsdash:profile', JSON.stringify({name:'Andre'})); });
  await q.goto('file://'+require('path').resolve(OUT+'/r53.html')); await q.waitForTimeout(500);
  const ok = await q.evaluate(() => window.operatorPage.addJournal('Bubble thought\nmore'));
  check('the bubble saves an entry to the journal', ok===true && await q.evaluate(() => window.__op.ev("state.journal.entries.some(e => e.title==='Bubble thought' && e.from==='bubble')")));
  check('no errors in the app', q.errors.length===0, q.errors);
  await b2.close();
  process.exit(report() ? 1 : 0);
})().catch((e) => { console.error(e); process.exit(1); });
