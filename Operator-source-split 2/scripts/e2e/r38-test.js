// Round 38: deliverables count by the plan (16 reels is 16 a month) and finished tasks count on the
// client's card; a task can be a client's retainer deliverable (picked when you add it); Outreach as a
// way you got a client; Op's light without the eclipse, and Rainbow; Today's top panel (full-screen
// button with the time, the weather card, the streak smaller with a wide Tasks bar).
const { instrument, launch, newPage, check, report, OUT } = require('./common.js');
(async () => {
  instrument(process.argv[2], OUT+'/r38.html');
  const b = await launch();
  const T = new Date(2026,9,14,14,20).getTime();   // Wed Oct 14
  const tk = (id, title, st, clients, done) => ({id, title, status:st, client:clients[0], clients, priority:'med', createdAt:'2026-10-01', completedAt:done || null});
  const biz = {packages:[{id:'pk', name:'16 Reels', price:2000, deliverables:[{id:'pd', title:'Reels', weeklyTarget:4}]}],
    clients:[
      {id:'bm', name:'Mike', business:'Brothers Mechanical', stage:'active', status:'active', mrr:2000, packageId:'pk', startDate:'2026-09-01', createdAt:'2026-09-01', touches:['2026-10-12'],
        deliverables:[{id:'d1', title:'Reels', weeklyTarget:4, recurring:true, fromPackage:true, sourceId:'pd', status:'pending', completedDates:['2026-09-08', '2026-09-09']}]},
      {id:'jj', name:'Jay', business:'JJS Construction', stage:'active', status:'active', mrr:1500, startDate:'2026-09-01', createdAt:'2026-09-01', touches:['2026-10-12'],
        deliverables:[{id:'d2', title:'Ad creatives', weeklyTarget:3, recurring:true, status:'pending', completedDates:[]}]}]};
  const tasks = {items:[
    tk('a', 'Edit reel for Brothers Mechanical', 'done', ['bm'], '2026-10-06'),
    tk('b', 'Reel #2', 'done', ['bm'], '2026-10-08'),
    tk('c', 'Plan the week', 'done', ['personal'], '2026-10-08'),
    tk('d', 'Cut BM reel 3', 'today', ['bm']),
    tk('e', 'Invoice Batusha', 'today', ['personal'])]};

  // ---- deliverables ----
  {
    const p = await newPage(b, OUT+'/r38.html', {profile:{name:'Andre', businessName:'Flicz Media'}, business:biz, tasks}, T);
    const E = c => p.evaluate(x => window.__op.ev(x), c);
    await p.waitForTimeout(3200);
    const D = "state.business.clients[0].deliverables[0]";
    check('a "16 Reels" plan is 16 a month (not 18)', await E("monthlyTargetFor("+D+")")===16);
    check('no number in the plan: four weeks of the weekly number (3 a week → 12)', await E("monthlyTargetFor(state.business.clients[1].deliverables[0])")===12);
    check('this month’s finished reel tasks for them count on the card (0 → 2)', await E("deliverableMonthCount("+D+")")===2, await E("JSON.stringify("+D+".completedDates)"));
    check('…a task that isn’t theirs doesn’t', !(await E("!!state.tasks.items.find(t => t.id==='c').delivLog")));
    check('…and it says so', /2 finished tasks this month now count/.test(await p.textContent('#toastContainer')));
    await E("ui.view='business'; ui.businessTab='clients'; renderView()"); await p.waitForTimeout(200);
    check('the client card shows the month: 2/16 this month', /2\/16 this month/.test(await p.textContent('.cc2-deliv')));
    // finishing a task that's their reel
    await E("ui.view='today'; renderView(); completeTask('d')"); await p.waitForTimeout(2000);
    check('finishing "Cut BM reel 3" logs a reel for them (3/16)', await E("deliverableMonthCount("+D+")")===3 && /Counted for Brothers Mechanical: Reels, 3\/16 this month/.test(await p.textContent('#toastContainer')));
    await E("state.tasks.items.find(t => t.id==='d').status='today'; renderView()"); await p.waitForTimeout(200);
    check('un-finish it and the reel comes back off (2/16)', await E("deliverableMonthCount("+D+")")===2 && !(await E("!!state.tasks.items.find(t => t.id==='d').delivLog")));
    // picking the deliverable when adding a task
    await E("openAddTaskModal()"); await p.waitForTimeout(200);
    check('adding a task: "Counts as a client deliverable" lists their retainer pieces', await p.isVisible('#addTaskOverlay .tdv') && (await p.$$('#addTaskOverlay .tdv-chip')).length===2);
    await p.click('#addTaskOverlay .tdv-chip[data-id="jj:d2"]'); await p.waitForTimeout(150);
    check('…picking one names the task and the client', await p.inputValue('#newTaskTitle')==='Ad creative for JJS Construction' && JSON.stringify(await E("ui.newTaskClients"))==='["jj"]' && /logs one Ad creative for JJS Construction/.test(await p.textContent('#addTaskOverlay .tdv-hint')));
    await p.fill('#newTaskTitle', 'Spring promo'); await p.click('#addTaskOverlay [data-action="addTaskToday"]'); await p.waitForTimeout(300);
    const nt = await E("JSON.stringify(state.tasks.items[state.tasks.items.length-1].deliv)");
    check('…the task is tied to that deliverable (whatever you call it)', nt==='{"c":"jj","d":"d2"}', nt);
    await E("ui.view='focus'; ui.focusTab='tasks'; renderView()"); await p.waitForTimeout(250);
    check('…its card says which deliverable it is', /Ad creatives/.test(await p.evaluate(() => [...document.querySelectorAll('.tdv-badge')].map(e => e.textContent).join(' '))));
    await E("completeTask(state.tasks.items[state.tasks.items.length-1].id)"); await p.waitForTimeout(1300);
    check('…finishing it counts for JJS (their health reads it)', await E("deliverableMonthCount(state.business.clients[1].deliverables[0])")===1 && await E("deliverableWeekCount(state.business.clients[1].deliverables[0])")===1);
    // editing a task can tie it too
    await E("openTaskEditModal('e')"); await p.waitForTimeout(200);
    await p.click('#taskEditOverlay .tdv-chip[data-id="bm:d1"]'); await p.waitForTimeout(100);
    await E("saveEditTask('e')");
    check('editing a task can tie it to a deliverable', await E("JSON.stringify(state.tasks.items.find(t => t.id==='e').deliv)")==='{"c":"bm","d":"d1"}');
    // the weekly master task, finished by hand
    // the deliverable tasks: one per client per deliverable, done by logging one at a time
    await E("renderView()"); await p.waitForTimeout(150);
    const dv = await E("(state.tasks.items.find(t => t.master && t.master.kind==='dv' && t.master.clientId==='bm' && t.master.delivId==='d1')||{}).id");
    check('a deliverable task is made for you: "Complete 4 reels" (Brothers Mechanical)', !!dv && await E("state.tasks.items.find(t => t.id==='"+dv+"').title")==='Complete 4 reels' && JSON.stringify(await E("state.tasks.items.find(t => t.id==='"+dv+"').clients"))==='["bm"]');
    check('…and "Complete 3 ad creatives" for JJS (split by deliverable)', await E("!!state.tasks.items.find(t => t.master && t.master.kind==='dv' && t.master.clientId==='jj' && t.title==='Complete 3 ad creatives')"));
    check('…no old "Deliverables for…" or weekly check-in tasks', await E("!state.tasks.items.some(t => t.master && (t.master.kind==='deliv' || t.master.kind==='care') && t.status!=='done')"));
    const w0 = await E("deliverableWeekCount("+D+")");
    await E("completeTask('"+dv+"')"); await p.waitForTimeout(250);
    check('hitting done logs ONE reel and the task stays ('+(w0+1)+'/4)', await E("deliverableWeekCount("+D+")")===w0+1 && await E("state.tasks.items.find(t => t.id==='"+dv+"').status")==='today' && new RegExp((w0+1)+' of 4').test(await p.textContent('#toastContainer')));
    await E("ui.view='focus'; ui.focusTab='tasks'; renderView()"); await p.waitForTimeout(200);
    check('…its card shows the pieces ('+(w0+1)+'/4) with +1 and take-one-back', await p.isVisible('[data-task-id="'+dv+'"] .mt-prog') && (await p.textContent('[data-task-id="'+dv+'"] .mt-prog b'))===(w0+1)+'/4' && (await p.$$('[data-task-id="'+dv+'"] .mt-segs i.on')).length===w0+1);
    for(let k = w0 + 1; k < 4; k++){ await E("completeTask('"+dv+"')"); await p.waitForTimeout(120); }
    check('…the fourth one finishes it for the week', await E("state.tasks.items.find(t => t.id==='"+dv+"').status")==='done' && await E("deliverableWeekCount("+D+")")>=4);
    await E("completeTask('"+dv+"')"); await p.waitForTimeout(120);
    check('…a fifth hit doesn’t over-log', await E("deliverableWeekCount("+D+")")===4);
    await E("ACTIONS.mtDvUndo(null, null, '"+dv+"'); renderView()"); await p.waitForTimeout(150);
    check('…take one back and it’s open again (3/4)', await E("state.tasks.items.find(t => t.id==='"+dv+"').status")==='today' && await E("deliverableWeekCount("+D+")")===3);
    await E("incrementDeliverableProgress('bm', 'd1'); renderView()"); await p.waitForTimeout(150);
    check('…logging on the client card counts for the task too (4/4 → done)', await E("state.tasks.items.find(t => t.id==='"+dv+"').status")==='done');
    check('…and the client’s health reads it (Brothers Mechanical ahead)', await E("clientHealthStatus(state.business.clients[0]).paceLevel")==='good');
    // reach out to clients
    check('no Reach out task while nobody’s due', await E("!state.tasks.items.some(t => t.master && t.master.kind==='reach' && t.status!=='done')"));
    await E("state.business.clients[1].touches=['2026-09-20']; state.business.clients[1].touchpoints=[{id:'tq', type:'text', date:'2026-09-20', note:''}]; renderView()"); await p.waitForTimeout(200);
    const rt = await E("JSON.stringify((({title, clients, priority}) => ({title, clients, priority}))(state.tasks.items.find(t => t.master && t.master.kind==='reach' && t.status!=='done')||{}))");
    check('JJS 17 days overdue: "Reach out to clients (1)", tagged JJS only, high priority', rt==='{"title":"Reach out to clients (1)","clients":["jj"],"priority":"high"}', rt);
    await E("ui.view='business'; ui.businessTab='log'; renderView()"); await p.waitForTimeout(200);
    check('the Log center is a Clients sub-tab: who’s due first, then who’s in touch', await p.isVisible('.lc') && (await p.$$('.lc-row.is-due')).length===1 && /JJS Construction/.test(await p.textContent('.lc-row.is-due')) && (await p.$$('.lc-ok .lc-row')).length===1 && /1/.test(await p.textContent('.subtab.active .lc-badge')));
    await p.click('.lc-row.is-due [data-type="call"]'); await p.waitForTimeout(250);
    check('…one tap logs the call', await E("state.business.clients[1].touches.indexOf(todayStr())>=0") && /Logged a call with/.test(await p.textContent('#toastContainer')));
    check('…and the Reach out task is done (nobody left)', await E("!state.tasks.items.some(t => t.master && t.master.kind==='reach' && t.status!=='done')") && (await p.$$('.lc-row.is-due')).length===0);
    // the + menu
    check('the + menu has "A client deliverable"', JSON.stringify(await E("focusAddMenu().map(x => x[1])")).indexOf('A client deliverable') > 0);
    // Outreach
    check('"How we got them" has Outreach', await E("LEAD_SOURCES.some(s => s.id==='outreach' && s.label==='Outreach')"));
    await E("opRunTool('set_client_source', {who:'Brothers Mechanical', source:'outreach'})");
    check('…Op can set it ("I got him from outreach")', await E("state.business.clients[0].leadSource")==='outreach' && /Outreach/.test(await E("clientCardFrontHtml(state.business.clients[0])")));
    check('Op’s background has where clients came from and the month’s deliverables', /Brothers Mechanical \(came from Outreach\): Reels \d+\/16 this month/.test(await E("aiContext()")));
    check('no page errors (deliverables)', p.errors.length===0, p.errors);
    await p.context().close();
  }

  // ---- Op's light ----
  {
    const p = await newPage(b, OUT+'/r38.html', {profile:{name:'Andre'}}, T);
    const E = c => p.evaluate(x => window.__op.ev(x), c);
    await p.waitForTimeout(300);
    check('Op’s light has no eclipse (no dark moon over it)', await p.evaluate(() => { const l = document.querySelector('.op-light'); return !l || getComputedStyle(l, '::after').display==='none'; }));
    check('Settings has a Rainbow swatch', /data-id="rainbow"/.test(await E("opSettingsHtml()")) && !/value="rainbow"/.test(await E("opSettingsHtml()")));
    await E("ACTIONS.opColorSet(null, null, 'rainbow')");
    check('Rainbow: his color walks the spectrum', await E("state.profile.opColor")==='rainbow' && /opRainbow/.test(await E("document.getElementById('opColorCss').textContent")) && await E("getComputedStyle(document.documentElement).animationName")==='opRainbow');
    await E("opRunTool('set_my_color', {hex:'#ffffff'})");
    check('…and back to white', await E("state.profile.opColor")==='#ffffff' && await E("getComputedStyle(document.documentElement).animationName")==='none');
    await E("opRunTool('set_my_color', {hex:'rainbow'})");
    check('Op can go rainbow himself', await E("state.profile.opColor")==='rainbow');
    check('no page errors (Op’s light)', p.errors.length===0, p.errors);
    await p.context().close();
  }

  // ---- Today's top panel ----
  {
    const p = await newPage(b, OUT+'/r38.html', {profile:{name:'Andre', businessName:'Flicz Media'}, tasks, settings:{weather:{place:'Brooklyn, New York', lat:40.65, lon:-73.95, current:{at:T, temp:64, feels:62, hi:68, lo:55, code:2}}}}, T);
    const E = c => p.evaluate(x => window.__op.ev(x), c);
    await E("ui.view='today'; renderView()"); await p.waitForTimeout(300);
    check('no "◉ Minimal" chip by the name', !(await p.$('.th-min')) && !(await p.$('.th-bizrow')));
    check('the full-screen view is an icon with the time, top right', await p.isVisible('#musicDock .md-full'));
    await p.click('#musicDock .md-full'); await p.waitForTimeout(400);
    check('…it opens Today full screen', await E("document.body.classList.contains('np-on')"));
    check('…and the icon steps aside there', !(await p.isVisible('#musicDock .md-full')));
    await p.keyboard.press('m'); await p.waitForTimeout(500);
    check('…M brings the page back', !(await E("document.body.classList.contains('np-on')")));
    check('the weather is a card: 64°, partly cloudy, high and low, the sun’s day', await p.isVisible('.th-wx .twx') && /64°/.test(await p.textContent('.twx')) && /H 68° · L 55°/.test(await p.textContent('.twx')) && await p.isVisible('.twx .sun-arc'));
    const g = await p.evaluate(() => { const h = document.querySelector('.today-hero').getBoundingClientRect(), w = document.querySelector('.twx').getBoundingClientRect(); return {gap:Math.round(h.bottom - w.bottom)}; });
    check('…sitting at the bottom of the panel (the left side fills it)', g.gap <= 34, g);
    const s = await p.evaluate(() => { const sw = document.querySelector('.sw.is-r38').getBoundingClientRect(), t = document.querySelector('.swt').getBoundingClientRect(), k = document.querySelector('.sw-streak').getBoundingClientRect(); return {w:t.width/sw.width, below:t.top >= k.bottom - 1, n:document.querySelector('.swt-n').textContent, fs:parseFloat(getComputedStyle(document.querySelector('.swt-n')).fontSize), sf:parseFloat(getComputedStyle(document.querySelector('.sw-streak > b')).fontSize)}; });
    check('Tasks is a wide bar right under the streak (0/2 today here)', s.w > .9 && s.below && s.n==='0/2', s);
    check('…bigger than before, the streak smaller', s.fs >= 22 && s.sf <= 20, s);
    check('…with what’s next', /2 left · up next Cut BM reel 3/i.test(await p.textContent('.swt')));
    check('the date is a little calendar tile: OCT 14, Wednesday, week 42', (await p.textContent('.th-date .thd-cal')).replace(/\s/g,'')==='OCT14' && /Wednesday/.test(await p.textContent('.th-date')) && /Week 42/.test(await p.textContent('.th-date')));
    check('no page errors (Today)', p.errors.length===0, p.errors);
    await p.context().close();
  }

  // ---- a skill done for the day leaves the lineup ----
  {
    const p = await newPage(b, OUT+'/r38.html', {profile:{name:'Andre'}, tasks:{items:[{id:'sk', title:'Piano practice', status:'today', ongoing:true, skill:true, client:'personal', clients:['personal'], priority:'med', ongoingDoneDates:[]}, {id:'g', title:'Edit', status:'today', client:'personal', clients:['personal'], priority:'med'}]}}, T);
    const E = c => p.evaluate(x => window.__op.ev(x), c);
    await E("ui.view='focus'; ui.focusTab='tasks'; renderView()"); await p.waitForTimeout(200);
    await E("completeTask('sk')"); await p.waitForTimeout(1300);
    check('a skill done for the day leaves the lineup (and Ongoing) until tomorrow', !/Piano practice/.test(await E("[...document.querySelectorAll('.task-card-title')].map(e=>e.textContent).join('|')")) && await E("state.tasks.items.find(t=>t.id==='sk').status")==='today');
    check('…a small line says it’s done for today', /1 done for today · back tomorrow/.test(await p.textContent('.dfd-note')));
    await p.click('.dfd-note'); await p.waitForTimeout(250);
    check('…and it’s still on Training Skills', /Training Skills/.test(await p.textContent('.subtab.active')) && /Piano practice/.test(await p.textContent('#viewRoot')));
    await p.clock.setSystemTime(T + 86400000); await E("renderView()"); await p.waitForTimeout(200);
    await E("ui.focusTasksSubTab='overview'; renderView()"); await p.waitForTimeout(200);
    check('…tomorrow it’s back', /Piano practice/.test(await E("[...document.querySelectorAll('.task-card-title')].map(e=>e.textContent).join('|')")));
    check('no page errors (skills)', p.errors.length===0, p.errors);
    await p.context().close();
  }

  await b.close();
  process.exit(report() ? 1 : 0);
})();
