// Today page v2: hero + Lock In, hold-to-take-the-day-off, picking what's next, right-click
// task menu, new panels, goals and fitness.
const { instrument, launch, newPage, check, report, OUT } = require('./common.js');
(async () => {
  instrument(process.argv[2], OUT+'/td.html');
  const b = await launch();
  const seed = {profile:{name:'Andre', revenueGoalMonthly:10000, weeklyWorkoutTarget:4},
    focus:{wake:{enabled:true, time:'07:00', days:[0,1,2,3,4,5,6]}, motivations:{toward:[{id:'m1', text:'Freedom of time'}], away:[]}},
    tasks:{items:[{id:'t1', title:'Edit Nina reel', status:'today', priority:'med', clients:['personal']}, {id:'t2', title:'Send invoice', status:'today', priority:'high', clients:['personal']}, {id:'t3', title:'Script hooks', status:'backlog', priority:'low', clients:['personal']}]},
    calendar:{events:[{id:'e1', date:'2026-10-08', time:'14:00', title:'Client call', categoryId:'call'}]}};
  let p = await newPage(b, OUT+'/td.html', seed, new Date(2026,9,8,11,0).getTime());
  const E = (code) => p.evaluate(c => window.__op.ev(c), code);
  check('hero with a big Lock In button', await p.isVisible('.today-hero .lockin-cta'));
  check('Lock In shows what\'s up next (highest priority by default)', (await p.textContent('.lockin-sub')).includes('Send invoice'));
  await p.click('.lockin-cta');
  check('Lock In opens the lock-in chooser', await p.isVisible('#lockInOverlay:not(.hidden)'));
  await E("closeLockInChooser()");
  await p.keyboard.press('l');
  check('"L" opens it too', await p.isVisible('#lockInOverlay:not(.hidden)'));
  await E("closeLockInChooser()");
  // pick what's next
  await p.click('[data-action="toggleNextPicker"][data-where="hero"]');
  check('next picker lists today + backlog', (await p.$$('.next-picker .np-row')).length===3);
  await p.click('.next-picker [data-action="pickNextTask"][data-id="t3"]');
  check('picking a backlog task moves it to today and makes it next', await E("state.tasks.items.find(t=>t.id==='t3').status")==='today' && (await p.textContent('.lockin-sub')).includes('Script hooks'));
  check('next pick is saved', await E("state.focus.nextTaskId")==='t3');
  // take today off: one click, with an Undo right there
  await p.click('[data-action="quickDayOff"]');
  check('one click takes the day off', await E("isDayOff(todayStr())"));
  check('…with an Undo', await p.isVisible('#toastContainer [data-action="quickDayOffUndo"]'));
  await p.click('#toastContainer [data-action="quickDayOffUndo"]');
  check('undo puts the day back', !(await E("isDayOff(todayStr())")));
  // right-click a task
  await p.click('[data-action="nav"][data-view="focus"]'); await p.click('[data-action="focusMainTab"][data-tab="tasks"]');
  await p.click('[data-task-id="t1"]', {button:'right'});
  check('right-click opens the task menu', await p.isVisible('#taskCtxMenu'));
  await p.click('#taskCtxMenu [data-op="dueToday"]');
  check('menu: due today', await E("state.tasks.items.find(t=>t.id==='t1').deadline")==='2026-10-08' && !(await p.isVisible('#taskCtxMenu')));
  await p.click('[data-task-id="t1"]', {button:'right'});
  await p.click('#taskCtxMenu [data-op="pri-high"]');
  check('menu: priority', await E("state.tasks.items.find(t=>t.id==='t1').priority")==='high');
  await p.click('[data-task-id="t1"]', {button:'right'});
  await p.click('#taskCtxMenu [data-op="next"]');
  check('menu: make it next up', await E("state.focus.nextTaskId")==='t1');
  await p.click('[data-task-id="t2"]', {button:'right'});
  await p.click('#taskCtxMenu [data-op="delete"]');
  check('menu: delete (with undo)', !(await E("state.tasks.items.some(t=>t.id==='t2')")) && (await p.textContent('#toastContainer')).includes('Undo'));
  await p.click('[data-task-id="t1"]', {button:'right'});
  await p.keyboard.press('Escape');
  check('Esc closes the menu', !(await p.isVisible('#taskCtxMenu')));
  // panels on Today
  await p.click('[data-action="nav"][data-view="today"]');
  check('morning: no wind down, streak in the hero', !(await p.isVisible('[data-action="toggleWindDown"]')) && await p.isVisible('.today-hero .streak-num'));
  check('Today timeline panel is off', (await p.$$('.agenda-panel')).length===0);
  await p.locator('.progress-panel').scrollIntoViewIfNeeded();
  check('week chart + heatmap in one panel, and why panel', await p.isVisible('.progress-panel .wk-bars') && (await p.$$('.progress-panel .hm-cell')).length>100 && (await p.$$('.heatmap-panel, .week-panel')).length===0 && (await p.textContent('.why-panel')).includes('Freedom of time'));
  await p.locator('.biz-card').scrollIntoViewIfNeeded();
  check('business snapshot redesigned', await p.isVisible('.biz-card .biz-mrr'));
  check('panel subtitles hidden', await p.evaluate(() => [...document.querySelectorAll('.today-panels .section-title > .kpi-sub')].every(e => getComputedStyle(e).display==='none')));
  // next survives a restart
  await p.reload(); await p.waitForTimeout(400);
  check('next-up survives a reload', (await p.textContent('.lockin-sub')).includes('Edit Nina reel'));
  // goals
  await p.click('[data-action="nav"][data-view="personal"]'); await p.click('[data-action="personalTab"][data-tab="goals"]');
  await p.click('[data-action="toggleForm"][data-form="newGoal"]');
  await p.fill('#newGoalLabel', 'Post 3 reels'); await p.fill('#newGoalTarget', '3'); await p.fill('#newGoalUnit', 'reels');
  await p.click('[data-action="addGoal"]');
  check('goal card added', (await p.$$('.goal-card')).length===1);
  for(let i=0;i<3;i++) await p.click('.goal-card [data-action="goalStep"][data-delta="1"]');
  check('+1 steps reach the goal and mark it achieved', await E("state.goals.items[0].done===true && state.goals.items[0].current===3"));
  // fitness
  await p.click('[data-action="personalTab"][data-tab="fitness"]');
  await p.click('[data-action="fitPickType"][data-id="Run"]');
  await p.click('[data-action="fitPickDur"][data-id="30"]');
  await p.click('[data-action="fitLog"]');
  check('one-tap workout log', await E("state.health.gymLog.length===1 && state.health.gymLog[0].type==='Run' && state.health.gymLog[0].duration===30"));
  check('week strip shows it', await p.isVisible('.fit-day.is-today.is-done'));
  check('no page errors', p.errors.length===0, p.errors);
  await b.close();
  process.exit(report()?1:0);
})();
