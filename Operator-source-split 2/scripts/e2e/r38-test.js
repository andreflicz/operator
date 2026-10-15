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
    // the deliverable tasks: each month's deliverable split into the cycle's four weeks, named after it
    await E("renderView()"); await p.waitForTimeout(150);
    const W = "(k, c, d) => state.tasks.items.find(t => t.master && t.master.kind==='dvw' && t.master.clientId===(c||'bm') && t.master.delivId===(d||'d1') && t.master.wk===k)";
    const wk = async (k, c, d) => JSON.parse(await E("JSON.stringify((({id, title, status, deadline}) => ({id, title, status, deadline}))(("+W+")("+k+", '"+(c||'bm')+"', '"+(d||'d1')+"')))"));
    const w1 = await wk(1), w2 = await wk(2), w3 = await wk(3), w4 = await wk(4);
    check('16 reels a month → four tasks named "Reels", Week 1 to 4, due weekly', [w1, w2, w3, w4].every(t => t.title==='Reels') && [w1, w2, w3, w4].map(t => t.deadline).join()==='2026-10-07,2026-10-14,2026-10-21,2026-10-31', [w1, w2, w3, w4]);
    check('…all in the backlog', [w1, w2, w3, w4].every(t => t.status==='backlog'));
    check('…JJS: 12 ad creatives → four tasks of 3', await E("dvwNeeds(state.business.clients[1].deliverables[0]).join()")==='3,3,3,3' && (await wk(4, 'jj', 'd2')).title==='Ad creatives');
    check('…no old weekly "Complete 4 reels" or "Deliverables for…" tasks', await E("!state.tasks.items.some(t => t.master && /^(dv|deliv|care)$/.test(t.master.kind) && t.status!=='done')"));
    await E("ui.view='focus'; ui.focusTab='tasks'; ui.focusTasksSubTab='backlog'; renderView()"); await p.waitForTimeout(200);
    check('…not in the regular Backlog', !/Reels|Ad creatives/.test(await p.textContent('#viewRoot .subtab-panel')));
    check('…a Client backlog tab next to it', /Client backlog\s*8/.test(await p.textContent('.subtab.is-dlv')));
    await p.click('.subtab.is-dlv'); await p.waitForTimeout(200);
    check('the Client backlog: by client, each deliverable with its four weeks', (await p.$$('.cbl-client')).length===2 && (await p.$$('.cbl-w')).length===8 && /Brothers Mechanical/.test(await p.textContent('.cbl')));
    check('…this week is lit (Week 2, due today)', await p.isVisible('.cbl-w.is-now[data-id="'+w2.id+'"]'));
    const c0 = await E("dvwCycleCount(state.business.clients[0].deliverables[0], dvwCycle(state.business.clients[0]))");
    await p.click('.cbl-w[data-id="'+w1.id+'"] .mt-plus'); await p.waitForTimeout(250);
    check('+1 logs ONE reel and the task stays ('+(c0+1)+'/4)', await E("dvwCycleCount(state.business.clients[0].deliverables[0], dvwCycle(state.business.clients[0]))")===c0+1 && await E("("+W+")(1).status")==='backlog' && /Week 1 3\/4/.test(await p.textContent('#toastContainer')));
    await E("completeTask('"+w2.id+"')"); await p.waitForTimeout(250);
    check('…a hit on Week 2 fills Week 1 first (and says so); Week 1 finishes', await E("("+W+")(1).status")==='done' && /Week 1 fills first/.test(await p.textContent('#toastContainer')));
    await E("completeTask('"+w2.id+"')"); await p.waitForTimeout(250);
    check('…then Week 2 starts filling (1/4)', await E("dvwFind(("+W+")(2)).done")===1);
    await E("ACTIONS.mtDvUndo(null, null, '"+w2.id+"'); ACTIONS.mtDvUndo(null, null, '"+w2.id+"'); renderView()"); await p.waitForTimeout(200);
    check('…take two back: Week 2 empty, Week 1 open again (back in the backlog)', await E("dvwFind(("+W+")(2)).done")===0 && await E("("+W+")(1).status")==='backlog');
    await E("incrementDeliverableProgress('bm', 'd1'); renderView()"); await p.waitForTimeout(150);
    check('…logging on the client card fills the weeks too (Week 1 done)', await E("("+W+")(1).status")==='done');
    await p.click('.cbl-w[data-id="'+w2.id+'"] .cbl-today'); await p.waitForTimeout(200);
    check('→ Today puts Week 2 on today', await E("("+W+")(2).status")==='today');
    await E("ui.focusTasksSubTab='overview'; renderView()"); await p.waitForTimeout(200);
    { const cs = '.task-card.dlv-card:not(.car-clone)[data-task-id="'+w2.id+'"]';
      check('…its card: its own color, "Week 2", the client, pieces with +1', !!(await p.$(cs)) && /Week 2/.test(await p.textContent(cs+' .mt-badge')) && /Brothers Mechanical/.test(await p.textContent(cs)) && !!(await p.$(cs+' .mt-plus'))); }
    check('…and the client’s health reads it', ['good', 'warn'].indexOf(await E("clientHealthStatus(state.business.clients[0]).paceLevel")) >= 0);
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
    check('the full-screen view is an icon in the panel’s corner (r38e: not top right)', await p.isVisible('.today-hero .th-full') && !(await p.$('#musicDock .md-full')));
    await p.click('.today-hero .th-full'); await p.waitForTimeout(400);
    check('…it opens Today full screen', await E("document.body.classList.contains('np-on')"));
    check('…and the icon steps aside there', !(await p.isVisible('.today-hero .th-full')));
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

  // ---- round 38e: top right, Focus, skills, the You card, Op's box ----
  {
    const p = await newPage(b, OUT+'/r38.html', {profile:{name:'Andre', businessName:'Flicz Media'}, tasks:{items:[{id:'sk', title:'Piano practice', status:'backlog', ongoing:true, skill:true, skillGoal:180, client:'personal', clients:['personal'], priority:'med', ongoingDoneDates:[]}, {id:'og', title:'Website rebuild', status:'today', ongoing:true, client:'personal', clients:['personal'], priority:'med', ongoingDoneDates:[]}]}}, T);
    const E = c => p.evaluate(x => window.__op.ev(x), c);
    await E("ui.view='today'; renderView(); dockRefresh()"); await p.waitForTimeout(200);
    check('top right: no clock and no full-screen icon (level and music only)', !(await p.$('#musicDock .md-time')) && !(await p.$('#musicDock .md-ck')) && !(await p.$('#musicDock .md-full')) && !!(await p.$('#musicDock [data-action="dockFm"]')));
    check('Today’s full screen is a small icon in the panel’s corner', await p.isVisible('.today-hero .th-full'));
    await p.click('.today-hero .th-full'); await p.waitForTimeout(400);
    check('…it opens the full-screen view', await E("document.body.classList.contains('np-on')"));
    await p.keyboard.press('m'); await p.waitForTimeout(500);
    await E("ui.view='focus'; ui.focusTab='tasks'; ui.focusTasksSubTab='overview'; state.profile.focusMinimal=true; renderView()"); await p.waitForTimeout(200);
    check('Focus: no Minimal button, and never the minimal view', !(await p.$('.lv-corner.is-focus')) && !(await p.$('#viewRoot .np-home')) && /Current Lineup/.test(await p.textContent('#viewRoot')));
    await E("state.profile.focusMinimal=false; renderView()");
    check('…and right-click there doesn’t offer it', !/Minimal view/.test(await E("appMenuHtml()")));
    check('skills never show under Ongoing (other ongoing tasks still do)', !/Piano practice/.test(await E("renderOngoingTasksPanel()")) && /Website rebuild/.test(await E("renderOngoingTasksPanel()")));
    await E("ui.focusTasksSubTab='skills'; renderView()"); await p.waitForTimeout(200);
    await p.click('[data-action="skillMove"][data-id="sk"]'); await p.waitForTimeout(150);
    check('a skill: → Today puts it on today', await E("state.tasks.items.find(t=>t.id==='sk').status")==='today' && /Backlog/.test(await p.textContent('[data-action="skillMove"][data-id="sk"]')));
    await p.click('[data-action="skillMove"][data-id="sk"]'); await p.waitForTimeout(150);
    check('…← Backlog sends it back (it keeps its look)', await E("state.tasks.items.find(t=>t.id==='sk').status")==='backlog' && !!(await p.$('.gr-sk, .skill-card, [class*="gr-sk"]')));
    await E("ui.view='personal'; ui.personalTab='you'; renderView()"); await p.waitForTimeout(200);
    await p.click('.ycf .pc:first-child'); await p.waitForTimeout(700);
    check('Personal → You: the card turns over (rank, next rank, what it needs)', await E("document.querySelector('.ycf').classList.contains('is-flipped')") && /Next rank/i.test(await p.textContent('.ycf-back')));
    await p.click('.ycf-back'); await p.waitForTimeout(700);
    check('…and back', !(await E("document.querySelector('.ycf').classList.contains('is-flipped')")));
    await E("ui.view='today'; renderView(); OV.cap='opBubText'; opCaption('Short line.')"); await p.waitForTimeout(500);
    const h1 = await p.evaluate(() => document.getElementById('opBubText').getBoundingClientRect().height);
    await E("opCaption('"+'A much longer answer that keeps going so the box has to grow to fit it all, line after line, without scrolling in jumps or cutting words off at the third line like before. '.repeat(2)+"')"); await p.waitForTimeout(700);
    const h2 = await p.evaluate(() => { const e = document.getElementById('opBubText'); return {h:e.getBoundingClientRect().height, sh:e.scrollHeight}; });
    check('Op’s box grows with what he says (no three-line cap)', h2.h > h1 + 30 && h2.h >= h2.sh - 4, [h1, h2]);
    check('…and it has a resize grip', await p.isVisible('#opBub .op-bub-rs'));
    const g = await (await p.$('#opBub .op-bub-rs')).boundingBox();
    await p.mouse.move(g.x + 5, g.y + 5); await p.mouse.down(); await p.mouse.move(g.x + 125, g.y - 15, {steps:4}); await p.mouse.up(); await p.waitForTimeout(200);
    check('…dragging it makes the box wider (and it remembers)', (await E("state.profile.opBubSize && state.profile.opBubSize.w")) >= 480);
    check('no page errors (round 38e)', p.errors.length===0, p.errors);
    await p.context().close();
  }

  await b.close();
  process.exit(report() ? 1 : 0);
})();
