// Round 42 (October batch, build 2): deliverables by posting week (made the week before, due before the
// week starts), the tap-to-set counter, snooze, waiting on a client, client colours and client tasks in health.
const { instrument, launch, newPage, check, report, OUT } = require('./common.js');
(async () => {
  instrument(process.argv[2], OUT+'/r42.html');
  const b = await launch();
  const T = new Date(2026,9,25,11,0).getTime();   // Sun Oct 25: this week posts Oct 19–25, next week Oct 26–Nov 1
  const biz = {clients:[
    {id:'jj', name:'Jay', business:'JJS', stage:'active', status:'active', mrr:3000, startDate:'2026-08-01', createdAt:'2026-08-01', touches:['2026-10-24'],
      deliverables:[{id:'d1', title:'Reels', recurring:true, monthlyTarget:30, completedDates:['2026-10-12','2026-10-13','2026-10-14','2026-10-15','2026-10-16','2026-10-17','2026-10-18']}]},
    {id:'bm', name:'Mike', business:'Brothers Mechanical', stage:'active', status:'active', mrr:2000, startDate:'2026-08-01', createdAt:'2026-08-01', touches:['2026-10-24'],
      deliverables:[{id:'d2', title:'Reels', recurring:true, monthlyTarget:4, completedDates:[]}]}]};
  const p = await newPage(b, OUT+'/r42.html', {profile:{name:'Andre', lineupView:'list'}, business:biz, tasks:{items:[
    {id:'ct', title:'Set up Meta ads', status:'today', priority:'med', clients:['jj'], createdAt:'2026-10-20'}]}}, T);
  const E = c => p.evaluate(x => window.__op.ev(x), c);
  await E("document.querySelectorAll('.overlay').forEach(o => o.classList.add('hidden')); masterTasksSync()"); await p.waitForTimeout(300);

  // ---- the numbers ----
  const needs = await E("const d = state.business.clients[0].deliverables[0]; JSON.stringify(['2026-10-05','2026-10-12','2026-10-19','2026-10-26'].map(w => r42Need(d, w)))");
  check('30 a month → about 7 a week', JSON.parse(needs).every(n => n===7 || n===6), needs);
  check('4 a month → about 1 a week', await E("const d = state.business.clients[1].deliverables[0]; [r42Need(d,'2026-10-05'), r42Need(d,'2026-10-12'), r42Need(d,'2026-10-19')].every(n => n<=1) && [r42Need(d,'2026-10-05'), r42Need(d,'2026-10-12'), r42Need(d,'2026-10-19'), r42Need(d,'2026-10-26')].some(n => n===1)"));
  check('a month always adds up to its number', await E("const d = state.business.clients[0].deliverables[0]; let t = 0; for(let i = 1; i <= 31; i++){ const ds = '2026-10-'+String(i).padStart(2,'0'); t += Math.round(30*i/31) - Math.round(30*(i-1)/31); } t===30"));
  check('a posting week is due the Sunday before it', await E("r42Due('2026-10-26')")==='2026-10-25');

  // ---- the tasks ----
  const tk = await E("JSON.stringify(state.tasks.items.filter(t => t.master && t.master.kind==='dvw' && t.master.clientId==='jj').map(t => [t.master.post, t.deadline, t.status]))");
  check('this week you get next week\'s task (due before it starts) and this week\'s if it\'s still owed', /"2026-10-26","2026-10-25"/.test(tk) && /"2026-10-19","2026-10-18"/.test(tk), tk);
  check('this week\'s posts not made → the client is late (red)', await E("deliverablePaceStatus(state.business.clients[0].deliverables[0])")==='danger' && await E("clientHealthStatus(state.business.clients[0]).level")==='red');
  const nx = "state.tasks.items.find(t => t.master && t.master.post==='2026-10-26' && t.master.clientId==='jj')";
  await E("r42SetCount("+nx+", 3)");
  check('the counter sets exactly how many are done, for that week', await E("dvwFind("+nx+").done")===3 && await E("state.business.clients[0].deliverables[0].completedDates.length")===10);
  await E("r42SetCount("+nx+", 1)");
  check('…and setting it lower takes pieces back', await E("dvwFind("+nx+").done")===1 && await E("state.business.clients[0].deliverables[0].completedDates.length")===8);
  await E("dvwDone("+nx+")"); await p.waitForTimeout(200);
  check('Done fills the week and finishes the task', await E("dvwFind("+nx+").done")===await E("dvwFind("+nx+").need") && await E(nx+".status")==='done');
  await E("ACTIONS.mtDvUndo(null, null, "+nx+".id)"); await p.waitForTimeout(150);
  check('…Undo takes back what Done put in', await E("dvwFind("+nx+").done")===1 && await E(nx+".status")!=='done');
  await E("ui.view='focus'; ui.focusTab='tasks'; ui.focusTasksSubTab='clientBacklog'; renderView()"); await p.waitForTimeout(250);
  check('the Client backlog shows each week with its counter', (await p.$$('.r42-cbl')).length >= 2 && !!(await p.$('.r42-cbl .r42-seg')) && /Week of Oct 26/.test(await p.textContent('.cbl')));
  await p.click('.r42-cbl:last-child .r42-seg:nth-child(4)'); await p.waitForTimeout(250);
  check('…tap a block to set the count', await E("dvwFind("+nx+").done")===4);
  check('the calendar says whose and how many on the due day', await E("calDayInfo('2026-10-25').deadlines.some(t => /JJS · 7 reels/.test(t.title))"));

  // ---- snooze / waiting ----
  await E("ui.focusTasksSubTab='overview'; "+nx+".status='today'; persist('tasks'); renderView()"); await p.waitForTimeout(200);
  await E("ACTIONS.r42Snooze(null, null, "+nx+".id+':12h')"); await p.waitForTimeout(200);
  check('snoozing takes it out of the lineup', await E(nx+".status")==='parked' && !(await p.$('.tl-row[data-task-id="'+(await E(nx+".id"))+'"]')) && !!(await p.$('.r42-snz')));
  await E(nx+".snoozedUntil = Date.now() - 1000"); await p.waitForTimeout(31000);
  check('…and it comes back by itself', await E(nx+".status")==='today');
  await E("ACTIONS.r42WaitOpen(null, null, 'ct')"); await p.waitForTimeout(150);
  check('Waiting on: a sheet asks what you\'re waiting on', !!(await p.$('#r42WaitOverlay #r42WaitWhat')));
  await p.fill('#r42WaitWhat', 'Ad account access'); await p.click('#r42WaitOverlay [data-r42="yes"]'); await p.waitForTimeout(200);
  check('…it parks the task (out of the lineup, not counted against you)', await E("state.tasks.items.find(t => t.id==='ct').status")==='parked' && await E("state.tasks.items.find(t => t.id==='ct').waitingOn.what")==='Ad account access');
  await E("ui.view='business'; renderView()"); await p.waitForTimeout(200);
  await E("ui.view='focus'; ui.focusTasksSubTab='waiting'; renderView()"); await p.waitForTimeout(200);
  check('…it shows on the Waiting on clients tab', /Ad account access/.test(await p.textContent('#viewRoot')));
  check('…and on the client\'s card', /Ad account access/.test(await E("clientCardV2(state.business.clients[0])")));
  await E("state.tasks.items.find(t => t.id==='ct').waitingOn.next = '2026-10-25'");
  check('…and they show up in Reach out on the chase day', await E("reachNeeds().some(x => x.c.id==='jj' && x.chase)"));
  await E("ACTIONS.r42Unpark(null, null, 'ct')");
  check('…unparking puts it back', await E("state.tasks.items.find(t => t.id==='ct').status")==='today');

  // ---- colours, client tasks, settings ----
  await E("ACTIONS.r42ClientColor(null, null, 'bm:FF8FB1')");
  check('a client\'s colour is picked on their card', await E("state.business.clients[1].color")==='#FF8FB1' && /r42-cc-color/.test(await E("clientCardV2(state.business.clients[1])")));
  await E("state.business.clients[1].deliverables[0].completedDates = ['2026-10-20','2026-10-21']; state.tasks.items.push({id:'late', title:'Send invoice', status:'today', priority:'med', clients:['bm'], deadline:'2026-10-20', createdAt:'2026-10-18'})");
  check('an overdue client task drags their health down', await E("clientHealthStatus(state.business.clients[1]).level")==='red' && /overdue/.test(await E("clientHealthReason(state.business.clients[1], clientHealthStatus(state.business.clients[1]))")));
  await E("ui.view='settings'; ui.settingsTab='standards'; renderView()"); await p.waitForTimeout(200);
  check('Settings has "Content due"', await E("renderSettings().indexOf('setContentDueEarly') >= 0"));
  await E("state.standards.contentDueDaysEarly = 2");
  check('…and it moves the due date earlier', await E("r42Due('2026-10-26')")==='2026-10-23');

  check('no page errors (round 42)', p.errors.length===0, p.errors);
  await b.close();
  process.exit(report() ? 1 : 0);
})();
