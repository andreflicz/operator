// Clients tab cards, Lifecycle tab, the one Clients panel on Today, lenient deliverable
// pace, and leads that became clients no longer showing their "(Lead)" tag.
const { instrument, launch, newPage, check, report, OUT } = require('./common.js');
(async () => {
  instrument(process.argv[2], OUT+'/cl.html');
  const b = await launch();
  const seed = {
    dashboardPanels:{order:['personalStats','journal','reachOut','clientSteps','business','clientOps','goals','focusMini','calendarMini','tasks'], enabled:{clientOps:false}, journalRaised:true, reachOutAdded:true, clientStepsAdded:true},
    tasks:{items:[{id:'t1', title:'Send Peak the proposal', status:'today', clients:['lead:l2'], client:'lead:l2', priority:'med'}, {id:'t2', title:'Old lead task', status:'backlog', clients:['personal','lead:l9'], client:'personal', priority:'med'}]},
    business:{packages:[], pipeline:[
      {id:'l1', company:'Peak Roofing', name:'Sam', stage:'proposal', createdAt:'2026-09-20', touchpoints:[{id:'x', type:'call', date:'2026-09-25'}]},
      {id:'l2', company:'Peak Roofing', name:'Sam', stage:'proposal', createdAt:'2026-09-20', touchpoints:[]},
      {id:'l9', company:'Already Won', name:'Wes', stage:'won', convertedClientId:'c9', createdAt:'2026-08-20', touchpoints:[]}],
    clients:[
      {id:'c1', name:'Nina', business:'Nina Co', status:'active', stage:'active', mrr:2000, createdAt:'2026-08-01', touches:['2026-10-08'], touchpoints:[{id:'a', type:'call', date:'2026-10-08'}], deliverables:[{id:'d1', title:'Reels', recurring:true, weeklyTarget:2, completedDates:[]}], journal:[]},
      {id:'c9', name:'Wes', business:'Already Won', status:'active', stage:'active', mrr:500, createdAt:'2026-08-21', touches:[], deliverables:[], journal:[]},
      {id:'c4', name:'Old', business:'Old LLC', status:'paused', stage:'paused', createdAt:'2026-01-05', touches:[], deliverables:[], journal:[]}]}
  };
  const p = await newPage(b, OUT+'/cl.html', seed, new Date(2026,9,3,10,0).getTime()); // Sat 3 Oct
  const E = (code) => p.evaluate(c => window.__op.ev(c), code);
  // panel merge
  const order = await E("state.dashboardPanels.order");
  check('one Clients panel replaces the three old ones, where they were', order.filter(x=>x!=='vision' && x!=='agenda').indexOf('clientHub')===2 && !order.some(id=>['reachOut','clientSteps','clientOps'].includes(id)), order);
  check('Clients panel shown on Today', await p.isVisible('.client-hub'));
  check('panel has client cards and leads to reach out', (await p.$$('.client-hub .hub-card')).length===2 && (await p.textContent('.client-hub .hub-leads')).includes('Peak Roofing'));
  // weekly pace: fine early in the week, amber late, red when the week can't be finished / was missed
  const D = "state.business.clients[0].deliverables[0]";
  await E(D+".createdAt='2026-10-05'; "+D+".completedDates=[]; "+D+".weeklyTarget=2");
  const at = async (day, code) => { await p.clock.setSystemTime(new Date(2026,9,day,10,0).getTime()); if(code) await E(code); return E("deliverablePaceStatus("+D+")"); };
  check('0/2 on Tuesday is fine', await at(6)==='good');
  await E(D+".completedDates=['2026-10-07']; renderView()");
  check('1/2 midweek is green', await at(8)==='good');
  check('1/2 on Saturday turns amber', await at(10)==='warn');
  await E(D+".completedDates=[]");
  check('0/2 on Sunday is red', await at(11)==='danger');
  await E(D+".completedDates=['2026-10-07']");
  check('a missed week stays red into the next week', await at(12)==='danger');
  await E("ui.view='today'; renderView()");
  check('card shows last week\'s shortfall', (await p.textContent('.hub-card[data-key="hub-c1"]')).includes('last wk 1/2'));
  await p.click('.client-hub [data-action="incrementDeliverableProgress"][data-id="d1"]');
  check('making it up turns it green again', await E("deliverablePaceStatus("+D+")")==='good' && await p.isVisible('.hub-card[data-key="hub-c1"] .cc2-owed.is-caught'));
  // converted leads
  check('already-converted lead: task re-tagged to the client on load', await E("JSON.stringify(state.tasks.items.find(t=>t.id==='t2').clients)")==='["personal","c9"]');
  check('converted lead is not offered as a (Lead) tag', await E("!clientCheckboxOptions().some(o=>o.value==='lead:l9')"));
  await E("setStage('lead','l2','closed')");
  const newId = await E("state.business.pipeline.find(x=>x.id==='l2').convertedClientId");
  check('winning a lead re-tags its tasks to the new client', await E("JSON.stringify(state.tasks.items.find(t=>t.id==='t1').clients)")===JSON.stringify([newId]) && await E("state.tasks.items.find(t=>t.id==='t1').client")===newId);
  check('…and the lead option is gone from the task picker', await E("!clientCheckboxOptions().some(o=>o.value==='lead:l2') && clientCheckboxOptions().some(o=>o.value==='"+newId+"')"));
  // Clients tab
  await p.click('[data-action="nav"][data-view="business"]'); await p.click('[data-action="businessTab"][data-tab="clients"]');
  check('Clients tab shows client cards with health', (await p.$$('.cc2')).length===3 && (await p.$$('.cc2 .cc2-avatar[class*="ring-"]')).length===3 && (await p.$$('.cc2 .health-pill')).length===0);
  check('paused clients tucked away', (await p.textContent('.cc2-past-toggle')).includes('(1)'));
  await p.click('.cc2-past-toggle');
  check('paused clients expand', (await p.$$('.cc2')).length===4);
  await p.fill('#crmSearch-client', 'nina'); await p.waitForTimeout(250);
  check('search filters the cards', (await p.$$('.cc2-grid:not(.cc2-grid-sm) .cc2')).length===1);
  await p.fill('#crmSearch-client', ''); await p.waitForTimeout(250);
  await p.click('.cc2[data-key="cc2-c1"] .cc2-top');
  check('card opens the client page', await p.isVisible('#clientModalOverlay:not(.hidden)'));
  await p.click('[data-action="closeClientModalAndSave"]');
  // Lifecycle tab
  await p.click('[data-action="businessTab"][data-tab="lifecycle"]');
  check('Lifecycle tab shows the cycle board', await p.isVisible('.crm-board [data-cycle-drop]'));
  check('clients without a cycle listed with a start button', (await p.$$('.lc-notin-row')).length>=2);
  await p.click('.lc-notin-row[data-key="lcn-c1"] [data-action="lcStartCycle"]');
  check('starting a cycle puts them on the board', await E("!!state.business.clients.find(c=>c.id==='c1').cycleId") && (await p.$$('.crm-board .crm-card[data-key="crm-c1"]')).length===1);
  check('FAB adds a client on the Lifecycle tab', (await p.getAttribute('#fabAdd','title'))==='Add client');
  check('no page errors', p.errors.length===0, p.errors);
  await b.close();
  process.exit(report()?1:0);
})();
