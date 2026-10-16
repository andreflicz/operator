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
    // (r38h) editing a task has no deliverable picker
    await E("openTaskEditModal('e')"); await p.waitForTimeout(200);
    check('(r38h) Edit has no "counts as a client deliverable" picker', !(await p.$('#taskEditOverlay .tdv')));
    await E("closeTaskEditModal ? closeTaskEditModal() : hideOverlay('taskEditOverlay')"); await p.waitForTimeout(100);
    // the deliverable tasks: each month's deliverable split into the cycle's four weeks, named after it
    await E("renderView()"); await p.waitForTimeout(150);
    const W = "(k, c, d) => state.tasks.items.find(t => t.master && t.master.kind==='dvw' && t.master.clientId===(c||'bm') && t.master.delivId===(d||'d1') && t.master.wk===k)";
    const wk = async (k, c, d) => JSON.parse(await E("JSON.stringify((({id, title, status, deadline}) => ({id, title, status, deadline}))(("+W+")("+k+", '"+(c||'bm')+"', '"+(d||'d1')+"')))"));
    const w1 = await wk(1), w2 = await wk(2), w3 = await wk(3), w4 = await wk(4);
    check('16 reels a month → four tasks "16 Reels 1/4" to "4/4", due weekly', [w1, w2, w3, w4].map(t => t.title).join('|')==='16 Reels 1/4|16 Reels 2/4|16 Reels 3/4|16 Reels 4/4' && [w1, w2, w3, w4].map(t => t.deadline).join()==='2026-10-07,2026-10-14,2026-10-21,2026-10-31', [w1, w2, w3, w4]);
    check('…all in the backlog', [w1, w2, w3, w4].every(t => t.status==='backlog'));
    check('…JJS: 12 ad creatives → four tasks of 3', await E("dvwNeeds(state.business.clients[1].deliverables[0]).join()")==='3,3,3,3' && (await wk(4, 'jj', 'd2')).title==='12 Ad creatives 4/4');
    check('…uneven months spread out (6 → 2,1,2,1; 2 → 1,0,1,0)', await E("[6,2].map(n => dvwNeeds({weeklyTarget:0, monthlyTarget:n}).join()).join('|')")==='2,1,2,1|1,0,1,0');
    check('…no old weekly "Complete 4 reels" or "Deliverables for…" tasks', await E("!state.tasks.items.some(t => t.master && /^(dv|deliv|care)$/.test(t.master.kind) && t.status!=='done')"));
    await E("ui.view='focus'; ui.focusTab='tasks'; ui.focusTasksSubTab='backlog'; renderView()"); await p.waitForTimeout(200);
    check('…not in the regular Backlog', !/Reels|Ad creatives/.test(await p.textContent('#viewRoot .subtab-panel')));
    check('…a Client backlog tab next to it', /Client backlog\s*8/.test(await p.textContent('.subtab.is-dlv')));
    await p.click('.subtab.is-dlv'); await p.waitForTimeout(200);
    check('the Client backlog: by client, each deliverable with its four weeks', (await p.$$('.cbl-client')).length===2 && (await p.$$('.cbl-w')).length===8 && /Brothers Mechanical/.test(await p.textContent('.cbl')) && /16 Reels 2\/4/.test(await p.textContent('.cbl')));
    check('…this week is lit (Week 2, due today)', await p.isVisible('.cbl-w.is-now[data-id="'+w2.id+'"]'));
    const CC = "dvwCycleCount(state.business.clients[0].deliverables[0], dvwCycle(state.business.clients[0]))";
    const c0 = await E(CC);
    await p.click('.cbl-w[data-id="'+w1.id+'"] .cbl-done'); await p.waitForTimeout(300);
    check('one click: Done logs the week’s 4 reels and the task is done ('+(c0+4)+')', await E(CC)===c0+4 && await E("("+W+")(1).status")==='done' && /16 Reels 1\/4 done: 4 reels logged/.test(await p.textContent('#toastContainer')));
    await p.click('.cbl-w[data-id="'+w1.id+'"] .cbl-undo'); await p.waitForTimeout(250);
    check('…Undo takes the 4 back and reopens it', await E(CC)===c0 && await E("("+W+")(1).status")==='backlog');
    await E("for(let i = 0; i < 4 - "+c0+"; i++) incrementDeliverableProgress('bm', 'd1'); renderView()"); await p.waitForTimeout(150);
    check('…logging on the client card counts too (4 in: Week 1 done)', await E("("+W+")(1).status")==='done' && await E("("+W+")(2).status")==='backlog');
    await p.click('.cbl-w[data-id="'+w2.id+'"] .cbl-today'); await p.waitForTimeout(200);
    check('→ Today puts Week 2 on today', await E("("+W+")(2).status")==='today');
    await E("ui.focusTasksSubTab='overview'; renderView()"); await p.waitForTimeout(200);
    { const cs = '.task-card.dlv-card:not(.car-clone)[data-task-id="'+w2.id+'"]';
      check('…its card: its own color, "Week 2", the client, what it’s worth (no +1 counter; round 39 look)', !!(await p.$(cs)) && /Week 2/.test(await p.textContent(cs+' .dvc-wkp')) && /Brothers Mechanical/.test(await p.textContent(cs+' .dvc-who')) && /16 Reels/.test(await p.textContent(cs+' .dvc-title')) && !(await p.$(cs+' .mt-plus'))); }
    await E("openTaskEditModal('"+w2.id+"')"); await p.waitForTimeout(200);
    check('editing it: no deliverable picker, it says it’s automatic, the name is locked', !(await p.$('#taskEditOverlay .tdv')) && /Automatic: from Brothers Mechanical/.test(await p.textContent('#taskEditOverlay .dvw-auto')) && await E("document.getElementById('editTitle-"+w2.id+"').readOnly"));
    await E("document.getElementById('editPriority-"+w2.id+"').value='high'; document.getElementById('editTitle-"+w2.id+"').value='Something else'; saveEditTask('"+w2.id+"')"); await p.waitForTimeout(150);
    check('…priority changes; the name and due date stay the deliverable’s', await E("("+W+")(2).priority")==='high' && await E("("+W+")(2).title")==='16 Reels 2/4' && await E("("+W+")(2).deadline")==='2026-10-14');
    await E("closeTaskEditModal ? closeTaskEditModal() : hideOverlay('taskEditOverlay')");
    // a one-off: one task of its own, done on either side is done on both
    await E("state.business.clients[0].deliverables.push({id:'o1', title:'Brand video', recurring:false, dueDate:'2026-10-20', status:'pending', linkedTaskId:null}); masterTasksSync()"); await p.waitForTimeout(150);
    const O = "state.tasks.items.find(t => t.master && t.master.delivId==='o1')";
    check('a one-off deliverable → one task, same client, its due date', await E("JSON.stringify((({title, deadline, clients}) => ({title, deadline, clients}))("+O+"))")==='{"title":"Brand video","deadline":"2026-10-20","clients":["bm"]}');
    await E("completeTask("+O+".id)"); await p.waitForTimeout(200);
    check('…done in one click marks the deliverable done', await E("state.business.clients[0].deliverables.find(d => d.id==='o1').status")==='done');
    await E("toggleDeliverable('bm', 'o1'); masterTasksSync()"); await p.waitForTimeout(150);
    check('…and reopening it on the card reopens the task', await E(O+".status")!=='done');
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
    check('…bigger than before', s.fs >= 22, s);
    check('…how many are left, no “up next”', /2 left/.test(await p.textContent('.swt')) && !/up next/i.test(await p.textContent('.swt')));
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
    await p.dispatchEvent('.ycf-back', 'click'); await p.waitForTimeout(700);
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

  // ---- round 38f/g: sidebar, minimal-view links, goals, calendar, work alarm, Op and alarms, the mic ----
  {
    const p = await newPage(b, OUT+'/r38.html', {profile:{name:'Andre', businessName:'Flicz Media', mrrGoal:20000}, business:biz, tasks}, T);
    const E = c => p.evaluate(x => window.__op.ev(x), c);
    await p.waitForTimeout(1500);
    await E("document.body.classList.add('np-on'); ui.view='focus'; ui.focusTab='tasks'; renderView()"); await p.waitForTimeout(200);
    check('the sidebar comes back when no full-screen view is on screen', !(await E("document.body.classList.contains('np-on')")));
    await E("ui.view='today'; state.profile.focusMinimal=true; renderView()"); await p.waitForTimeout(300);
    check('minimal view: Full view is a small link on the panel (not a corner button)', !!(await p.$('#viewRoot .np-views .np-v')) && !(await p.$('#viewRoot .np-top .lv-btn')));
    await E("state.profile.focusMinimal=false; renderView()");
    await E("ui.view='personal'; ui.personalTab='goals'; renderView()"); await p.waitForTimeout(300);
    const secs = await E("[...document.querySelectorAll('.g39-col')].map(c=>c.classList.contains('is-master') ? 'Master' : c.classList.contains('is-month') ? 'This month' : 'This week').join('|')");
    check('Goals: the master goals sit in Master / This month / This week (round 39: three columns)', secs==='Master|This month|This week' && !!(await p.$('.g39-col.is-month .mg-card')) && !!(await p.$('.g39-col.is-week .mg-card')), secs);
    await p.click('.g39-cust'); await p.waitForTimeout(250);
    check('…Customize opens a sheet with every master goal grouped', await p.isVisible('#mgcSheet') && (await p.$$('#mgcSheet .mgc-g')).length===3);
    await p.click('#mgcSheet .mgc-row:has([data-mgc="newclients"]) .ws-switch'); await p.waitForTimeout(150);
    check('…switching one off hides it', await E("!!state.profile.mgHide.newclients"));
    await p.fill('#mgcSheet [data-mgt="deep"]', '30'); await p.dispatchEvent('#mgcSheet [data-mgt="deep"]', 'change'); await p.waitForTimeout(100);
    await p.click('#mgcSheet [data-action="mgCustomizeClose"].btn'); await p.waitForTimeout(250);
    check('…and its target sticks; This month is gone from Goals', !(await p.$('.g39-col.is-month .mg-card')) && await E("masterGoalDefs().find(m=>m.key==='deep').target")===30);
    await E("state.goals.items.push({id:'gm', label:'MRR', master:true, autoTrack:'mrr', target:7000, start:3500, createdAt:'2026-10-01'})");
    check('a big goal is measured against its target (3.5k MRR of 7k = 50%, not from where you started)', Math.round(await E("goalPct(state.goals.items.find(g=>g.id==='gm'))"))===50);
    await E("openGoalSheet('long'); ui.gsTrack='own'; goalSheetRefresh()"); await p.waitForTimeout(200);
    await p.fill('#gsLabel', 'Run a marathon'); await p.click('#goalSheet [data-action="gsSave"]'); await p.waitForTimeout(600);
    check('a goal of your own with no number is added (and says so: round 39, with the GOAL SET pop-up)', await E("state.goals.items.some(g=>g.label==='Run a marathon')") && /marathon/i.test(await p.textContent('#goalFx')));
    await E("document.getElementById('goalSheet') && document.getElementById('goalSheet').classList.add('hidden')");
    // calendar: a long This week list fits, and green only on goal days
    await E("for(let i=0;i<9;i++) state.goals.items.push({id:'tw'+i, tier:'week', pk:periodKey('week'), label:'Week goal number '+i, target:1, done:i<3}); state.standards.deepWorkTargetMinutes=60; state.focus.sessions=(state.focus.sessions||[]).concat([{id:'s1', date:'2026-10-12', minutes:90, type:'deep', start:0, end:0}, {id:'s2', date:'2026-10-13', minutes:20, type:'deep', start:0, end:0}]); ui.view='calendar'; renderView()"); await p.waitForTimeout(600);
    const fit = await p.evaluate(() => { const b = document.querySelector('.calx .cx-tierbody'); return b ? {sh:b.scrollHeight, ch:b.clientHeight, more:(document.querySelector('.tg-more')||{}).textContent||'', doneShown:[...b.querySelectorAll('.tg-row.is-done')].filter(r=>r.style.display!=='none').length, openShown:[...b.querySelectorAll('.tg-row:not(.is-done)')].filter(r=>r.style.display!=='none').length} : null; });
    check('Calendar: This week fits its card, no scrolling (+N more if it runs over, done ones first)', fit && fit.sh <= fit.ch + 1 && (!fit.more || /\+\d+ more on Goals/.test(fit.more)) && (fit.doneShown===0 || fit.openShown===6), fit);
    const heat = await p.evaluate(() => { const g = d => { const e = document.querySelector('.calx [data-date="'+d+'"]'); return e ? Number((e.getAttribute('style')||'').replace(/.*--h:([0-9.]+).*/, '$1')) : -1; }; return [g('2026-10-12'), g('2026-10-13')]; });
    check('…green only on days you beat your deep-work goal', heat[0] > 0.5 && heat[1]===0, heat);
    // the work alarm when you're already going: a pop-up
    await E("state.focus.work={enabled:true, start:'14:00', end:'18:00', days:[0,1,2,3,4,5,6]}; workDayState().clockedInAt=Date.now(); ui.view='today'; renderView(); checkWorkAlarm()"); await p.waitForTimeout(400);
    check('the work alarm always shows up (a pop-up when you’re already at it)', await p.isVisible('#workPop.is-in') && /Work hours start now/.test(await p.textContent('#workPop')));
    await p.click('#workPop [data-action="workPopX"]'); await p.waitForTimeout(300);
    check('…and it closes', !(await E("document.getElementById('workPop').classList.contains('is-in')")));
    // Op waits while an alarm rings, and knows about alarms
    await E("window.__said=0; let o=document.getElementById('alarmOverlay'); if(!o){ o=document.createElement('div'); o.id='alarmOverlay'; o.className='overlay'; document.body.appendChild(o); } o.classList.remove('hidden'); opSay('test').then(()=>{ window.__said=1; }); 1"); await p.waitForTimeout(1600);
    { const said = await E("window.__said"), cx = await E("aiContext()"); check('Op doesn’t talk over a ringing alarm', said===0 && /ALARM IS RINGING/.test(cx), [said, cx.slice(-400)]); }
    const ctxRing = await E("aiContext()"); await E("document.getElementById('alarmOverlay').classList.add('hidden')"); for(let i=0; i<12 && !(await E("window.__said")); i++) await p.waitForTimeout(500);
    check('…he speaks once it’s dealt with, and he knows the work alarm', await E("window.__said")===1 && /work alarm 2(:00)? ?PM/i.test(await E("aiContext()")), ctxRing.slice(-300));
    check('Settings → Test & demo: no "can’t get going" button', !/tbStuck/.test(await E("testDemoHtml()")));
    await E("state.profile.heyOp=true; OV.speaking=true");
    { const m = await E("[heySoftQuiet(), (AI.listening=false, heyQuietNow()), document.hasFocus()]"); check('the mic stays steady: Op talking doesn’t stop the wake word (Discord-style)', m[0]===true && m[1]===!m[2], m); }
    await E("OV.speaking=false");
    check('no page errors (round 38f)', p.errors.length===0, p.errors);
    await p.context().close();
  }

  // ---- round 38g: clock-out plan of attack = the list as it is now; the streak ----
  {
    const many = {items:[1,2,3,4,5,6,7,8].map(i => ({id:'t'+i, title:'Task '+i, status:'today', client:'personal', clients:['personal'], priority:'med', createdAt:'2026-10-10'})).concat([{id:'tx', title:'Old done', status:'done', client:'personal', priority:'med', createdAt:'2026-10-10', completedAt:'2026-10-14'}])};
    const p = await newPage(b, OUT+'/r38.html', {profile:{name:'Andre', businessName:'Flicz Media'}, business:biz, tasks:many, focus:{nightPlan:{date:'2026-10-15', taskIds:['t3']}}}, T);
    const E = c => p.evaluate(x => window.__op.ev(x), c);
    await p.waitForTimeout(1500);
    await E("masterTasksSync && masterTasksSync(); openWindDown('plan')"); await p.waitForTimeout(400);
    const rows = await E("[...document.querySelectorAll('#windContent .wd-row .wd-title')].map(e=>e.textContent)");
    check('Clock out → Plan of attack: every open task on your list (not just six), your pick first', rows.length >= 8 && rows[0]==='Task 3' && [1,2,4,5,6,7,8].every(i => rows.includes('Task '+i)) && !rows.includes('Old done'), rows);
    check('…and this week’s client deliverables (the Reels) are in it', rows.some(r => /^16 Reels \d\/4$/.test(r)), rows);
    await E("ACTIONS.closeWindDown()"); await E("ui.view='today'; renderView()"); await p.waitForTimeout(200);
    check('Today: the day streak is out of its pill, bigger, with a line on where today stands', !!(await p.$('.sw.is-r38 .sw-ss')) && /day streak/i.test(await p.textContent('.sw.is-r38 .sw-streak')) && await p.evaluate(() => parseFloat(getComputedStyle(document.querySelector('.sw.is-r38 .sw-streak > b')).fontSize) >= 30));
    check('no page errors (round 38g)', p.errors.length===0, p.errors);
    await p.context().close();
  }

  // ---- round 38i: Apify for social numbers; the guide; the You card ----
  {
    const p = await newPage(b, OUT+'/r38.html', {profile:{name:'Andre', businessName:'Flicz Media'}}, T);
    const E = c => p.evaluate(x => window.__op.ev(x), c);
    const asked = [];
    const J = (r, o, st) => r.fulfill({status:st || 200, body:JSON.stringify(o), headers:{'Access-Control-Allow-Origin':'*'}});
    await p.route('http://127.0.0.1:8935/**', r => {
      const u = new URL(r.request().url()); asked.push(u.pathname+u.search);
      if(u.pathname==='/ap/key') return J(r, {ok:true});
      if(u.pathname==='/ap/status') return J(r, {ok:true, hasKey:true});
      if(u.pathname==='/ap/start') return J(r, {data:{id:'RUN1', status:'READY', defaultDatasetId:'DS1'}}, 201);
      if(u.pathname==='/ap/run') return J(r, {data:{id:'RUN1', status:'SUCCEEDED', defaultDatasetId:'DS1'}});
      if(u.pathname==='/ap/items') return J(r, [{username:'flicz.media', followersCount:1234, postsCount:80, profilePicUrl:'',
        latestPosts:[{id:'p1', shortCode:'AAA', caption:'Reel one', type:'Video', productType:'clips', likesCount:120, commentsCount:9, videoPlayCount:5400, timestamp:'2026-10-12T15:00:00.000Z', url:'https://www.instagram.com/p/AAA/'},
                     {id:'p2', shortCode:'BBB', caption:'A photo', type:'Image', likesCount:40, commentsCount:2, timestamp:'2026-10-09T15:00:00.000Z'}]}]);
      return J(r, {ok:true});
    });
    await p.waitForTimeout(1200);
    await E("ui.socShow='ap'; ui.socRole='business'; const d = document.createElement('div'); d.id='apT'; d.innerHTML = socialConnectHtml(); document.body.appendChild(d)");
    check('Social: Apify replaces Metricool (CSV and Meta still there)', /Apify/.test(await p.textContent('#apT')) && !/Metricool/.test(await p.textContent('#apT')) && /Import a CSV/.test(await p.textContent('#apT')) && /Meta directly/.test(await p.textContent('#apT')));
    await p.fill('#apT #apHandle', 'https://www.instagram.com/flicz.media/'); await p.fill('#apT #apToken', 'apify_api_TEST123');
    await E("ACTIONS.apConnect()"); await p.waitForTimeout(7500);
    check('…the token goes to the Operator app only (never into the app’s data)', asked.some(a => a.startsWith('/ap/key?t=')) && !/apify_api_TEST123/.test(await E("JSON.stringify(state)")));
    check('…it starts a run for the handle (from a pasted link), checks on it and reads the results', asked.some(a => a==='/ap/start?u=flicz.media') && asked.some(a => a.startsWith('/ap/run?r=RUN1')) && asked.some(a => a==='/ap/items?d=DS1'), asked);
    check('…followers and posts land where the rest of the app reads them', await E("igFollowersTotal()")===1234 && await E("igCfg().cache.data['apify-flicz.media'].posts.length")===2 && await E("igCfg().cache.data['apify-flicz.media'].posts[0].views")===5400);
    const n0 = asked.filter(a => a.startsWith('/ap/start')).length;
    await E("ui.igTried=0; igRefresh(true)"); await p.waitForTimeout(500);
    check('…a refresh within 12 hours doesn’t spend another run', asked.filter(a => a.startsWith('/ap/start')).length===n0);
    await E("document.getElementById('apT').innerHTML = socialSourcesHtml()");
    check('…its row: Apify, the handle, when it was checked, Refresh now', /Apify · @flicz\.media/.test(await p.textContent('#apT')) && /checked just now/.test(await p.textContent('#apT')) && !!(await p.$('#apT [data-action="apRefresh"]')));
    // the guide
    await E("ACTIONS.openXpHow()"); await p.waitForTimeout(300);
    check('the XP guide: Discipline has all four (Standing too), client deliverable tasks and the Log center', /Standing/.test(await p.textContent('.xph-rates')) && /16 Reels 1\/4/.test(await p.textContent('#xpHowContent')) && /Log center/.test(await p.textContent('#xpHowContent')));
    await E("ACTIONS.closeXpHow && ACTIONS.closeXpHow()");
    // a missed deliverable week pays nothing and isn't on time
    await E("state.tasks.items.push({id:'mx', title:'Missed', status:'done', completedAt:'2026-10-10', deadline:'2026-10-10', missed:true, client:'personal', priority:'med', createdAt:'2026-10-01'}); xpCache && (xpCache.days = {})");
    check('a deliverable week that ran out unfinished doesn’t count as done', await E("xpCtx ? (function(){ const c = xpCtx(); return !(c.doneOn && c.doneOn['2026-10-10'] && c.doneOn['2026-10-10'].tasks); })() : true"));
    // the You card
    await E("ui.view='personal'; ui.personalTab='you'; ui.ycFlip=false; renderView()"); await p.waitForTimeout(300);
    const bb = await (await p.$('.ycf')).boundingBox();
    await p.mouse.move(bb.x + bb.width/2, bb.y + bb.height/2); await p.waitForTimeout(350);
    const tf = await p.evaluate(() => [getComputedStyle(document.querySelector('.ycf-in > .pc:first-child')).transform, getComputedStyle(document.querySelector('.ycf-back')).transform]);
    check('Personal → You: hovering the card lifts it without twisting the faces', tf[0]==='none' && /matrix3d/.test(tf[1]), tf);
    await p.mouse.click(bb.x + bb.width/2, bb.y + bb.height/2); await p.waitForTimeout(800);
    check('…a click turns it over (only the back shows)', await E("document.querySelector('.ycf').classList.contains('is-flipped')") && await p.evaluate(() => getComputedStyle(document.querySelector('.ycf-in > .pc:first-child')).visibility==='hidden' && getComputedStyle(document.querySelector('.ycf-back')).visibility==='visible'));
    check('no page errors (round 38i)', p.errors.length===0, p.errors);
    await p.context().close();
  }

  await b.close();
  process.exit(report() ? 1 : 0);
})();
