const { instrument, ds, launch, newPage, check, report } = require('./common.js');
const SP = require('./common.js').OUT;
(async () => {
  instrument(process.argv[2], SP+'/t.html');
  const b = await launch();
  const now = new Date(2026, 9, 7, 21, 0, 0); // Wed Oct 7 2026, 9 PM
  const today = ds(now), y = ds(new Date(2026,9,6));
  const at = (d,h,m) => +new Date(2026,9,d,h,m);
  const seed = {
    tasks:{categories:[{id:'ads', label:'Meta Ads', color:'#4267ff'}], items:[
      {id:'t1', title:'Edit reel', clients:['personal'], client:'personal', priority:'high', status:'today', createdAt:today},
      {id:'t2', title:'Meta ads tweaks', clients:['personal'], client:'personal', priority:'med', status:'today', createdAt:today, categoryId:'ads'},
      {id:'t3', title:'Call Nina', clients:['personal'], client:'personal', priority:'med', status:'backlog', createdAt:today, deadline:today, deadlineTime:'22:30'}
    ]},
    focus:{activeSession:null, alarms:[], reminders:[], sessions:[
      {id:'s1', date:today, startedAt:at(7,9,0), endedAt:at(7,11,0), minutes:120, completedTasks:[]},
      {id:'s2', date:y, startedAt:at(6,9,0), endedAt:at(6,10,0), minutes:60, completedTasks:[]}
    ], taskSegments:[{id:'g1', taskId:'t2', start:at(7,10,0), end:at(7,10,30), date:today, inSession:true}]},
    modes:{active:null, history:[{id:'m1', type:'shooting', date:y, startedAt:at(6,13,0), endedAt:at(6,16,0), minutes:180}]},
    standards:{items:[], deepWorkTargetMinutes:180, completions:[]},
    health:{gymLog:[{id:'w1', date:y, type:'Lift'}], weightLog:[], calorieEntries:[]}
  };
  let p = await newPage(b, SP+'/t.html', seed, now);
  const E = (code) => p.evaluate(c => window.__op.ev(c), code);
  // deep work exclusions
  // round 12: deep work counts everything you time — category / task switches no longer take time off
  const dw0 = await E("deepWorkMinutesFor(todayStr())");
  await E("taskCategoryById('ads').countsDeepWork=false");
  check('a category set to "doesn\'t count" no longer takes time off deep work', await E("deepWorkMinutesFor(todayStr())")===dw0, dw0);
  check('shooting counts toward standard (yesterday 60+180)', await E("standardWorkMinutesFor(addDays(todayStr(),-1))")===240);
  check('yesterday standard complete via shoot', await E("dayStandardsComplete(addDays(todayStr(),-1))")===true);
  // analytics
  await p.click('[data-action="nav"][data-view="focus"]');
  await p.click('[data-action="focusMainTab"][data-tab="analytics"]');
  check('analytics Today tab', await p.isVisible('.hour-strip') && await p.isVisible('.mode-tiles'));
  await p.click('[data-action="analyticsRange"][data-id="week"]');
  check('week chart', await p.isVisible('.wk-chart'));
  await p.click('.wk-bar[data-id="'+y+'"]');
  check('pick day shows its detail', (await p.textContent('.day-detail')).includes('Yesterday'));
  check('day detail shows shooting 3h', (await p.textContent('.day-detail .mode-tiles')).includes('3h'));
  await p.click('[data-action="analyticsRange"][data-id="lastweek"]');
  check('last week renders', await p.isVisible('.wk-chart'));
  // session edit
  await p.click('[data-action="analyticsRange"][data-id="today"]');
  await p.click('.day-detail [data-action="editTimeBlock"][data-id="s1"]');
  await p.fill('#tbEnd', '11:45');
  await p.click('[data-action="saveTimeBlock"]');
  check('session edited to 165m', await E("state.focus.sessions.find(s=>s.id==='s1').minutes")===165);
  await p.click('.day-detail [data-action="editTimeBlock"][data-id="s1"]');
  check('Training is no longer offered as a type', (await p.$$('#sessionEditContent input[value="training"]')).length===0);
  await p.click('#sessionEditContent label:has(input[value="shooting"])');
  await p.click('[data-action="saveTimeBlock"]');
  check('session retyped to shooting (not deep)', await E("deepWorkMinutesFor(todayStr())")===0 && await E("dayModeTotals(todayStr()).shooting")===165);
  await p.click('.day-detail [data-action="editTimeBlock"][data-id="s1"]');
  await p.click('[data-action="deleteTimeBlock"]');
  check('session deleted', await E("state.focus.sessions.some(s=>s.id==='s1')")===false);
  await p.click('.toast .toast-action');
  check('session undo', await E("state.focus.sessions.some(s=>s.id==='s1')")===true);
  // streak edit
  await p.click('[data-action="nav"][data-view="today"]');
  await p.click('.streak-edit-btn');
  check('streak editor open', await p.isVisible('#streakEditOverlay:not(.hidden) .streak-edit-grid'));
  await p.click('[data-action="cycleStreakDay"][data-id="'+today+'"]');
  check('today forced counted', await E("dayStandardsComplete(todayStr())")===true);
  await p.fill('#streakSetCount', '12'); await p.click('[data-action="setStreakCount"]');
  check('streak count set to 12', await E("computeStreak()")===12, await E("computeStreak()"));
  await p.click('[data-action="closeStreakEdit"]');
  check('streak card shows 12', (await p.textContent('.streak-card .streak-num')).trim()==='12');
  // events + shoot prep
  await p.click('[data-action="nav"][data-view="calendar"]');
  await p.click('#fabAdd');
  await p.fill('#calEventDate', ds(new Date(2026,9,8)));
  await p.fill('#calEventTime', '08:00'); await p.fill('#calEventTitle', 'Shoot with Nina');
  await p.fill('#calEventLocation', 'Studio 4');
  await p.selectOption('#calEventRemindBefore', '30');
  await p.check('#calEventIsShoot');
  await p.fill('#calEventReadyTime', '06:00'); await p.fill('#calEventTravel', '60');
  await p.check('#calEventContent [data-event-task="t1"]');
  await p.click('[data-action="saveCalEvent"]');
  const ev = await E("state.calendar.events[0]");
  const al = await E("state.focus.alarms.filter(a=>a.eventId)");
  check('event saved with location/shoot/tasks', ev.location==='Studio 4' && ev.isShoot && ev.taskIds.includes('t1'), ev);
  check('task linked back to event', await E("state.tasks.items.find(t=>t.id==='t1').eventId")===ev.id);
  const times = al.map(a=>a.kind+'@'+a.time).sort();
  check('prep alarms: ready 6:00, leave 7:00, remind 7:30', JSON.stringify(times)===JSON.stringify(['leave@07:00','ready@06:00','remind@07:30']), times);
  await E("triggerAlarm(state.focus.alarms.find(a=>a.kind==='ready'))");
  check('ready alarm auto-starts shooting mode', await E("state.modes.active && state.modes.active.type")==='shooting');
  check('alarm overlay shows event + location', (await p.textContent('#alarmExtra')).includes('Studio 4'));
  await p.click('[data-action="dismissAlarm"]');
  await E("endMode()");
  // reminders mini alarm
  await E("state.focus.reminders.push({id:'r1', label:'Stretch', date:todayStr(), time:nowHM()}); checkReminders();");
  check('reminder fired (mini alarm toast)', await E("!!state.focus.reminders.find(r=>r.id==='r1').firedAt") && (await p.textContent('#toastContainer')).includes('Stretch'));
  // task -> reminder
  await p.click('[data-action="nav"][data-view="focus"]'); await p.click('[data-action="focusMainTab"][data-tab="tasks"]');
  await E("openTaskEditModal('t3')");
  await p.click('[data-action="taskToReminder"]');
  check('task became reminder with time', await E("!!state.focus.reminders.find(r=>r.fromTaskId==='t3' && r.time==='22:30')") && await E("!state.tasks.items.some(t=>t.id==='t3')"));
  // night plan
  await p.click('[data-action="nav"][data-view="today"]');
  check('wind down shown at 9pm', await p.isVisible('[data-action="openWindDown"]'));
  await p.click('[data-action="openWindDown"]');
  check('wind down opens on the recap', await p.isVisible('#windOverlay:not(.hidden) .wd-steps'));
  await p.click('#windOverlay [data-action="windNext"]');
  await E("ui.wind.plan = []; renderWindInto();");
  await p.click('#windOverlay [data-action="windAdd"][data-id="t1"]');
  await p.fill('#windNewTask', 'Write hooks'); await p.click('#windOverlay [data-action="windNewTask"]');
  await p.click('#windOverlay [data-action="windNext"]');
  await p.fill('#windNote', 'Big shoot day. Eat first.');
  await p.click('#windOverlay [data-action="windNext"]');
  await p.fill('#windAlarm', '05:45');
  await p.click('#windOverlay [data-action="windGoToSleep"]');
  const np = await E("state.focus.nightPlan");
  check('night plan saved for tomorrow w/ 2 tasks', np.date===ds(new Date(2026,9,8)) && np.taskIds.length===2 && np.taskIds[0]==='t1', np);
  check('note saved for that morning', await E("morningNotesFor('"+np.date+"').some(n=>n.text.includes('Big shoot'))"));
  check('wake alarm set for that morning', await E("const o=state.focus.wake.override; o && o.time==='05:45' && o.date==='"+np.date+"'"));
  // sleep mode — straight in, no crowded recap popup
  check('no recap popup on sleep', !(await p.isVisible('#recapOverlay:not(.hidden)')));
  check('sleep view', (await p.textContent('#viewRoot')).includes('Sleep mode') && await p.isVisible('.sleep-card'));
  check('sleep shows next alarm 5:45', (await p.textContent('.sleep-card')).includes('5:45'));
  check('auto lock-in blocked in sleep', await E("autoLockInBlockedReason()")==='mode');
  // morning: alarm fires with plan
  await p.clock.setSystemTime(new Date(2026,9,8,5,45,10));
  await p.clock.runFor(5000);
  await p.waitForTimeout(200);
  check('the alarm shows last night\'s note', (await p.textContent('#wakeOverlay')).includes('Big shoot day'));
  await p.click('[data-action="wakeStartDay"]');
  await E("ui.wakeIntroDone = true; renderWakeOverlayInto();");
  check('the morning briefing shows the note', (await p.textContent('#wakeOverlay')).includes('Big shoot day'));
  check('plan tasks moved to today, in order', await E("state.tasks.items.filter(t=>state.focus.nightPlan.taskIds.includes(t.id)).every(t=>t.status==='today') && state.focus.lineupOrder[0]==='t1'"));
  await p.click('[data-action="wakeStartMorning"]'); await p.waitForTimeout(200); await p.click('.mm-clockin'); await p.waitForTimeout(200);
  check('Clock in shows the plan of attack', (await p.textContent('#planOverlay')).includes('Write hooks'));
  await p.click('[data-action="closePlanReveal"]');
  // old training blocks still load and count (as Other) — nothing recorded is lost
  await E("startMode('training')");
  check('legacy training mode still runs', await E("state.modes.active.type")==='training');
  await E("endMode()");
  check('legacy training minutes fold into Other', await E("dayModeTotals(todayStr()).other")>=await E("modeMinutesFor(todayStr(),'training')"));
  // wish list
  await p.click('[data-action="nav"][data-view="personal"]'); await p.click('[data-action="personalTab"][data-tab="wishlist"]');
  check('FAB = wish list', (await p.getAttribute('#fabAdd','title'))==='Add wish list item');
  await p.click('#fabAdd');
  await p.fill('#wishName','Sony FX3'); await p.fill('#wishPrice','3899.99'); await p.selectOption('#wishPriority','high'); await p.fill('#wishLink','https://example.com/fx3');
  await p.click('[data-action="saveWishItem"]');
  await p.click('#fabAdd'); await p.fill('#wishName','Mic'); await p.fill('#wishPrice','100'); await p.click('[data-action="saveWishItem"]');
  check('wish total', (await p.textContent('.wish-total-val')).includes('3,999.99'));
  await p.check('[data-wish-bought]:near(:text("Mic"))');
  await p.waitForTimeout(100);
  check('purchased drops from total', (await p.textContent('.wish-total-val')).includes('3,899.99'));
  await p.screenshot({path:SP+'/p3-wish.png'});
  await p.click('[data-action="nav"][data-view="focus"]'); await p.click('[data-action="focusMainTab"][data-tab="analytics"]'); await p.click('[data-action="analyticsRange"][data-id="week"]');
  await p.screenshot({path:SP+'/p3-analytics.png', fullPage:true});
  check('no page errors', p.errors.length===0, p.errors);
  await b.close();
  process.exit(report()?1:0);
})();
