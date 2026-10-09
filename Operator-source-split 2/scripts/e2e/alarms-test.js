// Wake-up alarm, on-time alarms (no more "only rings when I open the window"), wake
// screen, night plan → alarm, task travel/get-ready alarms, break timer, second screen.
const path = require('path');
const { instrument, launch, newPage, check, report, OUT } = require('./common.js');
const at = (h, m, day) => new Date(2026, 9, day||7, h, m, 0).getTime(); // Wed 7 Oct 2026
(async () => {
  instrument(process.argv[2], OUT+'/al.html');
  const b = await launch();
  // --- migration: an old repeating wake-up alarm becomes the master wake alarm ---
  let p = await newPage(b, OUT+'/al.html', {focus:{alarms:[{id:'w1', time:'06:45', label:'Wake', days:[1,2,3,4,5], enabled:true, wake:true, mediaUrl:'https://youtu.be/x'},{id:'a2', time:'13:00', label:'Lunch', days:[0,1,2,3,4,5,6], enabled:true}]}}, at(6,0));
  let E = (code) => p.evaluate(c => window.__op.ev(c), code);
  check('old wake alarm folded into the wake-up alarm', await E("const w=state.focus.wake; w.enabled && w.time==='06:45' && w.days.join()==='1,2,3,4,5' && w.media && w.media.url==='https://youtu.be/x'"));
  check('other alarms kept, old wake alarm removed', await E("state.focus.alarms.map(a=>a.id).join()==='a2'"));
  await p.close();

  // --- the wake alarm rings, even if the timer was held back while in the background ---
  p = await newPage(b, OUT+'/al.html', {focus:{wake:{enabled:true, time:'07:00', days:[1,2,3,4,5,6]}}, modes:{active:{type:'offtime', sleep:true, startedAt:at(23,0,6), note:'Sleep'}, history:[]}}, at(6,58));
  E = (code) => p.evaluate(c => window.__op.ev(c), code);
  check('next wake is 7:00 this morning', await E("const n=nextWake(); n && n.time==='07:00' && n.date==='2026-10-07'"));
  check('sleep view shows the wake-up time', (await p.textContent('#viewRoot')).includes('7:00 AM'));
  // jump the clock without letting timers run (like a throttled background window), then come back
  await p.clock.setSystemTime(at(7,3));
  await p.evaluate(() => document.dispatchEvent(new Event('visibilitychange')));
  await p.waitForTimeout(100);
  check('wake screen shows after a missed minute', await p.isVisible('#wakeOverlay .wake-screen.is-ringing'));
  check('wake screen has I\'m up + snooze', await p.isVisible('[data-action="wakeImUp"]') && await p.isVisible('[data-action="wakeSnooze"]'));
  check('it does not ring twice for the same morning', await E("state.focus.wake.lastFiredTs===localTs('2026-10-07','07:00')"));
  await p.click('[data-action="wakeSnooze"]');
  check('snooze hides it and schedules a re-ring', !(await p.isVisible('#wakeOverlay')) && await E("!!(state.focus.snooze && state.focus.snooze.wake)"));
  await p.clock.runFor(9*60000+3000);
  check('rings again after the snooze', await p.isVisible('#wakeOverlay .wake-screen.is-ringing'));
  await p.click('[data-action="wakeImUp"]');
  check('"I\'m up" closes the wake screen and ends sleep mode', !(await p.isVisible('#wakeOverlay')) && await E("!state.modes.active"));
  check('no page errors (wake)', p.errors.length===0, p.errors);
  await p.close();

  // --- set up at 1 AM for the same morning; one-morning change; settings modal ---
  p = await newPage(b, OUT+'/al.html', {focus:{wake:{enabled:true, time:'07:00', days:[1,2,3,4,5,6]}}}, at(1,0));
  E = (code) => p.evaluate(c => window.__op.ev(c), code);
  check('at 1 AM "tomorrow" means this morning', await E("wakeTargetDate()==='2026-10-07'"));
  await p.click('[data-action="toggleWindDown"]');
  await p.click('.wind-drop [data-action="openWakeSetup"]');
  check('wind down (at 1 AM) opens the wake-up alarm setup', await p.isVisible('#wakeSetupOverlay .ws-time'));
  await p.fill('[data-wake="overrideTime"]', '08:30'); await p.dispatchEvent('[data-wake="overrideTime"]', 'change');
  check('one-morning change is saved', await E("const o=state.focus.wake.override; o && o.date==='2026-10-07' && o.time==='08:30'"));
  check('next ring follows the change', await E("nextWake().time==='08:30'"));
  check('usual time is untouched', await E("state.focus.wake.time==='07:00'"));
  await p.click('[data-action="wakeDay"][data-id="0"]');
  check('day toggles', await E("state.focus.wake.days.indexOf(0)>=0"));
  await p.click('[data-action="wakeTestSoon"]');
  await p.click('[data-action="closeWakeSetup"]');
  await p.clock.runFor(62000);
  check('"ring in 1 min" test works', await p.isVisible('#wakeOverlay .wake-screen.is-ringing') && (await p.textContent('#wakeOverlay')).includes('TEST'));
  await p.click('[data-action="wakeImUp"]');
  check('the override does not fire at the usual 7:00', await (async()=>{ await p.clock.setSystemTime(at(7,1)); await E('checkAllAlarms()'); return !(await p.isVisible('#wakeOverlay')); })());
  await p.clock.setSystemTime(at(8,31)); await E('checkAllAlarms()');
  check('…and fires at the changed time', await p.isVisible('#wakeOverlay .wake-screen.is-ringing'));
  await p.click('[data-action="wakeImUp"]');
  check('no page errors (setup)', p.errors.length===0, p.errors);
  await p.close();

  // --- night plan changes the wake alarm for that morning; evening card merges sleep ---
  p = await newPage(b, OUT+'/al.html', {focus:{wake:{enabled:true, time:'07:00', days:[1,2,3,4,5,6]}}, tasks:{items:[{id:'t1', title:'Edit reel', status:'backlog', clients:['personal'], client:'personal', priority:'med'}]}}, at(22,0));
  E = (code) => p.evaluate(c => window.__op.ev(c), code);
  check('wind down is a dropdown (evenings)', await p.isVisible('[data-action="toggleWindDown"]') && !(await p.isVisible('.wind-drop')));
  await p.click('[data-action="toggleWindDown"]');
  check('wind down has wake-up, plan and sleep together', await p.isVisible('.wind-drop [data-action="openWakeSetup"]') && await p.isVisible('.wind-drop [data-action="startSleepMode"]'));
  check('no wake chip in the hero', (await p.$$('.today-hero .wake-chip')).length===0);
  await p.click('.wind-drop [data-action="openNightPlan"]');
  check('night plan pre-fills tomorrow\'s wake time', (await p.inputValue('#nightPlanAlarm'))==='07:00');
  await p.check('[data-plan-task="t1"]');
  await p.fill('#nightPlanAlarm', '06:15');
  await p.click('[data-action="saveNightPlan"]');
  check('night plan sets a one-morning wake time', await E("const o=state.focus.wake.override; o && o.date==='2026-10-08' && o.time==='06:15'"));
  check('no stray one-off alarm created', await E("state.focus.alarms.length===0"));
  await p.clock.setSystemTime(at(6,15,8)); await E('checkAllAlarms()');
  check('wake screen shows the plan', (await p.textContent('#wakeOverlay')).includes('Edit reel'));
  await p.click('[data-action="wakeImUp"]');
  await p.close();

  // --- regular alarms catch up instead of being skipped; task travel/ready alarms ---
  p = await newPage(b, OUT+'/al.html', {focus:{alarms:[{id:'a1', time:'09:00', label:'Call mom', days:[0,1,2,3,4,5,6], enabled:true}]}}, at(8,59));
  E = (code) => p.evaluate(c => window.__op.ev(c), code);
  await p.clock.setSystemTime(at(9,2)); await E('checkAllAlarms()');
  check('regular alarm rings late instead of never', await p.isVisible('#alarmOverlay') && (await p.textContent('#alarmLabel'))==='Call mom');
  await p.click('#alarmOverlay [data-action="dismissAlarm"]');
  await E("state.focus.alarms.push({id:'a3', time:'09:00', label:'Too late', days:[0,1,2,3,4,5,6], enabled:true}); checkAllAlarms()");
  check('an alarm added after its time does not ring right away', !(await p.isVisible('#alarmOverlay')));
  await E('openAddTaskModal()');
  await p.fill('#newTaskTitle', 'Shoot downtown');
  await p.fill('#newTaskDeadline', '2026-10-08'); await p.fill('#newTaskDeadlineTime', '09:00');
  await p.fill('#newTaskAlarmTravel', '60'); await p.fill('#newTaskAlarmReady', '60');
  await p.dispatchEvent('#newTaskAlarmReady', 'input');
  check('live hint shows get-ready and leave times', (await p.textContent('#newTaskAlarmHint')).includes('7:00 AM') && (await p.textContent('#newTaskAlarmHint')).includes('8:00 AM'));
  await p.click('[data-action="addTaskToday"]');
  check('task creates get-ready + leave alarms', await E("const a=state.focus.alarms.filter(x=>x.taskId); a.length===2 && a.some(x=>x.kind==='ready'&&x.time==='07:00'&&x.date==='2026-10-08') && a.some(x=>x.kind==='leave'&&x.time==='08:00')"));
  await E("const t=state.tasks.items.find(x=>x.title==='Shoot downtown'); openTaskEditModal(t.id)");
  check('edit modal shows the task alarm settings', (await p.inputValue('[id$="AlarmTravel"]'))==='60');
  await p.fill('[id$="AlarmReady"]', '30');
  await E("const t=state.tasks.items.find(x=>x.title==='Shoot downtown'); saveEditTask(t.id)");
  check('editing moves the get-ready alarm', await E("state.focus.alarms.some(x=>x.taskId && x.kind==='ready' && x.time==='07:30')"));
  await E("state.tasks.items.find(x=>x.title==='Shoot downtown').status='done'");
  await p.clock.setSystemTime(at(7,31,8)); await E('checkAllAlarms()');
  check('alarms of a finished task stay quiet', !(await p.isVisible('#alarmOverlay')));
  check('no page errors (alarms)', p.errors.length===0, p.errors);
  await p.close();

  // --- break timer ends the break by itself ---
  p = await newPage(b, OUT+'/al.html', {focus:{activeSession:{startedAt:at(9,0), breaks:[], onBreak:false, completedTasks:[]}}}, at(9,30));
  E = (code) => p.evaluate(c => window.__op.ev(c), code);
  await E('openBreakNotePrompt()');
  await p.click('[data-action="pickBreakMinutes"][data-minutes="10"]');
  await p.click('[data-action="confirmStartBreakMode"]');
  check('break is on with a countdown', await E("state.focus.activeSession.onBreak && !!state.focus.activeSession.breakEndsAt") && await p.isVisible('#breakRemaining'));
  await p.clock.runFor(10*60000+2000);
  check('break ends on its own after 10 min', await E("!state.focus.activeSession.onBreak && !state.modes.active"));
  check('no page errors (break)', p.errors.length===0, p.errors);
  await p.close();

  // --- second-screen view ---
  const ctx = await b.newContext({viewport:{width:1280, height:800}});
  const d = await ctx.newPage(); const derr = []; d.on('pageerror', e=>derr.push(e.message));
  await d.addInitScript(() => { localStorage.setItem('opsdash:focus', JSON.stringify({wake:{enabled:true, time:'07:00', days:[1,2,3,4,5,6]}})); localStorage.setItem('opsdash:boards', JSON.stringify({boards:[{id:'v1', kind:'vision', name:'Vision Board', parentId:null, elements:[{id:'e1', type:'note', header:true, color:'#3FBE8E', title:'Mind + Body', body:'', x:0, y:0, w:300, h:96}], viewport:{x:0,y:0,zoom:1}}]})); });
  await d.goto('file://'+path.resolve(OUT+'/al.html')+'#wake'); await d.waitForTimeout(400);
  check('second-screen view shows the wake screen + vision board', await d.isVisible('#wakeOverlay .wake-screen.is-display') && (await d.textContent('#wakeOverlay')).includes('Mind + Body'));
  check('second-screen view hides the app', !(await d.isVisible('#app')));
  check('static board is scaled to fit', await d.evaluate(() => /scale\(/.test(document.querySelector('.board-static-world').style.transform)));
  check('no page errors (display)', derr.length===0, derr);
  await b.close();
  process.exit(report()?1:0);
})();
