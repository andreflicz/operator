// Round 7: no more flicker when something new appears (picker, selection), carousel copies marked
// properly, one clear Now / Up next with nothing starting on its own, highlighting instead of
// Select Multiple, pace = ahead / on pace / behind, goals that track themselves, and the
// App updates in Settings (out of the journal).
const { instrument, launch, newPage, check, report, OUT } = require('./common.js');
(async () => {
  instrument(process.argv[2], OUT+'/r7.html');
  const b = await launch();
  const NOW = new Date(2026,9,8,11,0).getTime();
  const T = (id, title, status) => ({id, title, client:'personal', clients:['personal'], priority:'med', status, createdAt:'2026-10-01'});
  const many = []; for(let i=0;i<9;i++) many.push(T('t'+i, 'Task '+i, i<6?'today':'backlog'));
  const locked = {activeSession:{startedAt:NOW-20*60000, breaks:[], onBreak:false, completedTasks:[]}};

  // ---- no flicker: opening the picker or picking tasks only adds what's new ----
  {
    const p = await newPage(b, OUT+'/r7.html', {profile:{name:'Andre', cardLayout:'carousel'}, tasks:{items:many}, focus:locked}, NOW);
    const E = c => p.evaluate(x => window.__op.ev(x), c);
    await p.click('[data-action="nav"][data-view="focus"]'); await p.waitForTimeout(300);
    const clones = await p.evaluate(() => { const t = document.querySelector('.task-column .car-track'); const kids = [...t.children]; return {n:kids.length, cloneCount:kids.filter(k => k.classList.contains('car-clone')).length, real:kids.filter(k => !k.classList.contains('car-clone')).length}; });
    check('every carousel copy is marked as a copy (only the real cards are live)', clones.cloneCount===12 && clones.real===6, clones);
    const tag = () => p.evaluate(() => { const els = [...document.querySelectorAll('#viewRoot .section, #viewRoot .task-card, #viewRoot .carousel')]; els.forEach((e, i) => e.__keep = i); return els.length; });
    const kept = () => p.evaluate(() => { const els = [...document.querySelectorAll('#viewRoot .section, #viewRoot .task-card, #viewRoot .carousel')]; return {total:els.length, kept:els.filter(e => e.__keep!==undefined).length}; });
    const before = await tag();
    await p.click('.nn-next [data-action="toggleNextPicker"]'); await p.waitForTimeout(200);
    const k1 = await kept();
    check('opening Change only adds the picker — nothing else on the page is rebuilt', k1.kept===before && k1.total===before, {before, k1});
    const arrows = await p.evaluate(() => document.querySelector('.task-column .carousel').className);
    check('the carousel keeps its arrows/fades through a re-render (no blink)', /can-prev/.test(arrows) && /can-next/.test(arrows), arrows);
    await p.keyboard.press('Escape'); await p.click('.nn-next [data-action="toggleNextPicker"]'); await p.waitForTimeout(150);
    await tag();
    await p.click('.task-column .task-card[data-id="t2"]:not(.car-clone)', {modifiers:['Meta']}); await p.waitForTimeout(200);
    const k2 = await kept();
    check('picking the first task doesn\'t rebuild the page either', k2.kept===k2.total, k2);
    check('the actions for picked tasks float outside the page', await p.isVisible('#bulkBar .bulk-toolbar') && !(await p.$('#viewRoot .bulk-toolbar')));
    check('there\'s no Select Multiple button any more', !(await p.$('[data-action="toggleTaskSelectMode"]')));
    await p.keyboard.press('Escape'); await p.waitForTimeout(150);
    check('the floating bar goes when nothing is picked', !(await p.$('#bulkBar')));

    // ---- Now / Up next ----
    check('locked in: Now and Up next sit side by side', await p.isVisible('.nn-panel.is-locked .nn-now') && await p.isVisible('.nn-panel .nn-next'));
    await p.dragAndDrop('.task-column .task-card[data-id="t3"]:not(.car-clone)', '.nn-now', {force:true}); await p.waitForTimeout(150);
    check('dropping a card on Now asks first — it doesn\'t start timing', (await E("ui.currentTaskId"))===null && (await E("ui.pendingCurrentTaskId"))==='t3' && await p.isVisible('.nn-now [data-action="confirmPendingCurrentTask"]'));
    await p.click('[data-action="nnPendingToNext"]'); await p.waitForTimeout(150);
    check('"Make it next" lines it up instead', (await E("state.focus.nextTaskId"))==='t3' && (await E("ui.currentTaskId"))===null);
    await p.dragAndDrop('.task-column .task-card[data-id="t4"]:not(.car-clone)', '.nn-next', {force:true}); await p.waitForTimeout(150);
    check('dropping on Up next just lines it up', (await E("state.focus.nextTaskId"))==='t4' && (await E("ui.currentTaskId"))===null);
    await p.click('[data-action="nnStartNext"]'); await p.waitForTimeout(150);
    check('Start now is what starts it', (await E("ui.currentTaskId"))==='t4' && await p.isVisible('.nn-now #currentTaskElapsedBar'));
    check('Now has Done and Release', await p.isVisible('.nn-now [data-action="finishCurrentTask"]') && await p.isVisible('.nn-now [data-action="releaseCurrentTask"]'));
    await p.click('.nn-now [data-action="releaseCurrentTask"]'); await p.waitForTimeout(150);
    check('Release stops timing it and leaves it on today\'s list', (await E("ui.currentTaskId"))===null && (await E("state.tasks.items.find(t=>t.id==='t4').status"))==='today');
    await E("setCurrentTask('t5')"); await p.waitForTimeout(100);
    await p.click('.nn-now [data-action="finishCurrentTask"]'); await p.waitForTimeout(1500);
    check('Done finishes it', (await E("state.tasks.items.find(t=>t.id==='t5').status"))==='done');
    check('no errors (focus)', !p.errors.length, p.errors);
    await p.context().close();
  }
  {
    const p = await newPage(b, OUT+'/r7.html', {profile:{name:'Andre'}, tasks:{items:many}}, NOW);
    const E = c => p.evaluate(x => window.__op.ev(x), c);
    await p.click('[data-action="nav"][data-view="focus"]'); await p.waitForTimeout(300);
    check('not locked in: Up next has Lock in on it', await p.isVisible('.nn-next [data-action="nnLockInNext"]'));
    await p.click('[data-action="nnLockInNext"]'); await p.waitForTimeout(200);
    check('Lock in on it opens the lock-in chooser with that task lined up', (await E("ui.stagedTaskId"))!==null && await p.isVisible('#lockInChooserOverlay:not(.hidden), .overlay:not(.hidden)'));
    await p.context().close();
  }

  // ---- master goals: always there, reading numbers the app already keeps ----
  {
    const p = await newPage(b, OUT+'/r7.html', {profile:{name:'Andre', goalWeight:180, revenueGoalMonthly:10000, weeklyWorkoutTarget:4},
      health:{gymLog:[{id:'g1',date:'2026-10-06',type:'Push',duration:50},{id:'g2',date:'2026-10-07',type:'Run',duration:30}], weightLog:[{id:'w1',date:'2026-09-01',weight:198},{id:'w2',date:'2026-10-07',weight:191.4}], calorieEntries:[]},
      focus:{sessions:[{id:'s1',date:'2026-10-06',startedAt:new Date(2026,9,6,9).getTime(),endedAt:new Date(2026,9,6,12).getTime(),minutes:180,type:'deep'}]},
      business:{packages:[], pipeline:[], clients:[{id:'c1',name:'Nina',business:'Nina Co',status:'active',stage:'active',mrr:2500,createdAt:'2026-09-01',touches:[],touchpoints:[],deliverables:[],journal:[]}]},
      goals:{items:[{id:'old', label:'Post 3 reels', target:3, current:1, unit:'reels', done:false}]}}, NOW);
    const E = c => p.evaluate(x => window.__op.ev(x), c);
    await E("ui.view='personal'; ui.personalTab='goals'; renderView()"); await p.waitForTimeout(200);
    check('the Personal tab says Health, not Fitness', /Health/.test(await p.textContent('[data-action="personalTab"][data-tab="fitness"]')));
    const m = await E("masterGoalDefs().map(m=>({k:m.key, cur:m.cur, t:m.target, pct:Math.round(masterPct(m))}))");
    const by = k => m.find(x => x.k===k) || {};
    check('master goals are built in — nothing to set up', m.length===5 && (await p.$$('.mg-hero')).length===1 && (await p.$$('.mg-card')).length===4, m);
    check('revenue reads MRR from Business, against the Settings goal', by('mrr').cur===2500 && by('mrr').t===10000 && /\$2,500/.test(await p.textContent('.mg-hero')));
    check('weight reads Health → Weight, measured from the first weigh-in', by('weight').cur===191.4 && by('weight').pct===37, by('weight'));
    check('workouts count this week\'s logged workouts', by('workouts').cur===2 && by('workouts').t===4);
    check('deep work counts hours locked in this week', by('deep').cur===3, by('deep'));
    check('no "tracked for you" / quick-start clutter', !/tracked for you|quick start/i.test(await p.textContent('#viewRoot')));
    await p.click('[data-action="editMasterTarget"][data-id="mrr"]'); await p.fill('#mgEdit-mrr', '20000'); await p.keyboard.press('Enter'); await p.waitForTimeout(150);
    check('tap a target to change it in place (saved to Settings)', (await E("state.profile.revenueGoalMonthly"))===20000 && /\$20,000/.test(await p.textContent('.mg-hero')));
    check('older goals still load under Your goals', /Post 3 reels/.test(await p.textContent('.goal-grid')));
    await p.click('#fabAdd'); await p.waitForTimeout(150);
    await p.fill('#newGoalLabel', '10k IG followers'); await p.fill('#newGoalTarget', '10000'); await p.fill('#newGoalUnit', 'followers'); await p.fill('#newGoalCurrent', '4200');
    await p.click('[data-action="addGoal"]'); await p.waitForTimeout(150);
    check('your own goals take a name, target, unit and where you are now', await E("(g => g && g.current===4200 && g.target===10000 && !g.autoTrack)(state.goals.items.find(g=>g.label==='10k IG followers'))"));
    await E("ui.view='today'; renderView()"); await p.waitForTimeout(200);
    check('Today shows the master goals as one row of rings', (await p.$$('.goals-panel .mg-row-5 .mg-card')).length===5 && (await p.$$('.goals-panel .mg-hero')).length===0);
    check('no errors (goals)', !p.errors.length, p.errors);
    await p.context().close();
  }

  // ---- Today's list: your order ----
  {
    const items = [T('a','Reply to Nina','today'), T('b','Edit JJS reel','today'), T('c','Send proposal','today'), T('d','Invoice October','today')];
    items[1].priority = 'high';
    const p = await newPage(b, OUT+'/r7.html', {profile:{name:'Andre'}, tasks:{items}}, NOW);
    const E = c => p.evaluate(x => window.__op.ev(x), c);
    await p.click('[data-action="nav"][data-view="focus"]'); await p.waitForTimeout(200);
    await p.click('[data-action="setLineupView"][data-id="list"]'); await p.waitForTimeout(150);
    const order = () => p.$$eval('.tl-row', r => r.map(x => x.dataset.taskId).join(''));
    check('List shows Today\'s Lineup numbered, highest priority first until you set an order', (await order())[0]==='b' && (await p.$$('.tl-num')).length===4);
    await p.dragAndDrop('.tl-row[data-task-id="d"]', '.tl-row[data-task-id="b"]', {targetPosition:{x:200, y:4}}); await p.waitForTimeout(150);
    check('drag a row to put it where you want it', (await order())==='dbac' || (await order()).startsWith('db'), await order());
    check('the top of the list is what\'s Up next', (await E("nextUpTask().id"))==='d' && await p.isVisible('.tl-row[data-task-id="d"] .tl-badge'));
    check('rows have no tick circles — a stray click never finishes a task', !(await p.$('.tl-row .tl-check')));
    await p.click('.tl-row[data-task-id="d"] .tl-title'); await p.waitForTimeout(200);
    check('clicking a row opens it', await E("ui.editingTaskId==='d' || !document.getElementById('taskEditOverlay').classList.contains('hidden')"));
    await E("closeTaskEditModal(); completeTask('d')"); await p.waitForTimeout(1500);
    check('tick it off and the next one moves up', (await E("nextUpTask().id"))==='b');
    check('the order sticks (saved)', (await E("state.focus.lineupOrder.indexOf('b')")) < (await E("state.focus.lineupOrder.indexOf('a')")));
    await p.click('[data-action="setLineupView"][data-id="cards"]'); await p.waitForTimeout(150);
    check('the cards follow the same order', (await p.$$eval('.task-column .task-card[data-id]:not(.car-clone)', r => r.map(x => x.dataset.id).join('')))==='bac');
    check('no errors (list)', !p.errors.length, p.errors);
    await p.context().close();
  }

  // ---- App updates (Settings) ----
  {
    const entries = [
      {id:'e1', date:'2026-10-08', timestamp:new Date(2026,9,8,9,30).getTime(), text:'JJS — weekly update\n'+'Lots of detail. '.repeat(30), mood:'u1', photos:[]},
      {id:'e2', date:'2026-09-01', timestamp:new Date(2026,8,1,9,0).getTime(), text:'Old update from September', mood:'u1', photos:[]},
      {id:'e3', date:'2026-10-07', timestamp:new Date(2026,9,7,12,0).getTime(), text:'Personal note', mood:null, photos:[]}];
    const p = await newPage(b, OUT+'/r7.html', {profile:{name:'Andre'}, journal:{entries, types:[{id:'starred',emoji:'⭐',label:'Starred',color:'#FFD700'},{id:'u1',emoji:'📣',label:'Updates',color:'#8fdcff'}]}}, NOW);
    const E = c => p.evaluate(x => window.__op.ev(x), c);
    await p.context().grantPermissions(['clipboard-read','clipboard-write']).catch(()=>{});
    await E("ui.view='personal'; ui.personalTab='journal'; renderView()"); await p.waitForTimeout(200);
    check('updates are kept out of My Journal', (await p.$$('.journal-entry')).length===1);
    check('the journal has no Updates tab — app updates aren\'t part of the everyday journal', !(await p.$('[data-action="journalMode"][data-id="updates"]')));
    await p.click('[data-action="nav"][data-view="settings"]'); await p.click('[data-action="settingsTab"][data-tab="updates"]'); await p.waitForTimeout(200);
    await p.selectOption('#updatesRangeSel', 'all'); await p.waitForTimeout(100);
    check('Settings → App updates lists every update', (await p.$$('.upd-card')).length===2);
    check('…in full, with no Read More', (await p.textContent('.upd-card[data-journal-id="e1"] .upd-text')).length > 300 && !(await p.$('.upd-card [data-action="toggleJournalExpand"]')));
    await p.click('.upd-card[data-journal-id="e1"] [data-action="copyUpdate"]'); await p.waitForTimeout(150);
    check('Copy puts one update on the clipboard', (await p.evaluate(() => navigator.clipboard.readText())).startsWith('JJS — weekly update'));
    await p.selectOption('#updatesRangeSel', '7'); await p.waitForTimeout(150);
    check('the range narrows to the last 7 days', (await p.$$('.upd-card')).length===1);
    await p.click('[data-action="copyAllUpdates"]'); await p.waitForTimeout(150);
    check('Copy all copies everything in range, dated', /^Oct 8 · /.test(await p.evaluate(() => navigator.clipboard.readText())));
    check('no errors (updates)', !p.errors.length, p.errors);
    await p.context().close();
  }
  {
    const p = await newPage(b, OUT+'/r7.html', {profile:{name:'Andre'}, journal:{entries:[], types:[]}}, NOW);
    const E = c => p.evaluate(x => window.__op.ev(x), c);
    await E("ui.view='settings'; ui.settingsTab='updates'; renderView()"); await p.waitForTimeout(200);
    await p.click('[data-action="createUpdatesType"]'); await p.waitForTimeout(150);
    check('with no Updates type yet, one tap makes it', (await E("updatesTypeId()"))==='updates' && await E("journalTypes().some(t=>t.id==='updates')"));
    await p.context().close();
  }

  await b.close();
  process.exit(report() ? 1 : 0);
})();
