// Wake-up alarm, on-time alarms (no more "only rings when I open the window"), wake
// screen, night plan → alarm, task travel/get-ready alarms, break timer, wake-up music.
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
  check('wake screen shows after a missed minute', await p.isVisible('#wakeOverlay .wk2'));
  check('wake screen has I\'m up + snooze', await p.isVisible('[data-action="wakeImUp"]') && await p.isVisible('[data-action="wakeSnooze"]'));
  check('it does not ring twice for the same morning', await E("state.focus.wake.lastFiredTs===localTs('2026-10-07','07:00')"));
  await p.click('[data-action="wakeSnooze"]');
  check('snooze hides it and schedules a re-ring', !(await p.isVisible('#wakeOverlay')) && await E("!!(state.focus.snooze && state.focus.snooze.wake)"));
  await p.clock.runFor(9*60000+3000);
  check('rings again after the snooze', await p.isVisible('#wakeOverlay .wk2'));
  await p.click('[data-action="wakeImUp"]');
  check('"I\'m up" opens the morning briefing and ends sleep mode', await p.isVisible('#wakeOverlay .brief') && await E("!state.modes.active"));
  await p.click('[data-action="wakeBriefDone"]');
  check('"Let\'s go" closes it', !(await p.isVisible('#wakeOverlay')));
  check('no page errors (wake)', p.errors.length===0, p.errors);
  await p.close();

  // --- set up at 1 AM for the same morning; one-morning change; settings modal ---
  p = await newPage(b, OUT+'/al.html', {focus:{wake:{enabled:true, time:'07:00', days:[1,2,3,4,5,6]}}}, at(1,0));
  E = (code) => p.evaluate(c => window.__op.ev(c), code);
  check('at 1 AM "tomorrow" means this morning', await E("wakeTargetDate()==='2026-10-07'"));
  await p.click('[data-action="openWindDown"]');
  await p.click('#windOverlay [data-action="windStep"][data-id="alarm"]');
  await p.click('#windOverlay [data-action="openWakeSetup"]');
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
  check('"ring in 1 min" test works', await p.isVisible('#wakeOverlay .wk2') && (await p.textContent('#wakeOverlay')).includes('TEST'));
  await p.click('[data-action="wakeImUp"]');
  await p.click('[data-action="wakeBriefDone"]');
  check('the override does not fire at the usual 7:00', await (async()=>{ await p.clock.setSystemTime(at(7,1)); await E('checkAllAlarms()'); return !(await p.isVisible('#wakeOverlay')); })());
  await p.clock.setSystemTime(at(8,31)); await E('checkAllAlarms()');
  check('…and fires at the changed time', await p.isVisible('#wakeOverlay .wk2'));
  await p.click('[data-action="wakeImUp"]');
  await p.click('[data-action="wakeBriefDone"]');
  check('no page errors (setup)', p.errors.length===0, p.errors);
  await p.close();

  // --- night plan changes the wake alarm for that morning; evening card merges sleep ---
  p = await newPage(b, OUT+'/al.html', {focus:{wake:{enabled:true, time:'07:00', days:[1,2,3,4,5,6]}}, tasks:{items:[{id:'t1', title:'Edit reel', status:'backlog', clients:['personal'], client:'personal', priority:'med'}]}}, at(22,0));
  E = (code) => p.evaluate(c => window.__op.ev(c), code);
  check('wind down is one button (evenings)', await p.isVisible('[data-action="openWindDown"]'));
  await p.click('[data-action="openWindDown"]');
  check('wind down walks today → plan → note → alarm', (await p.$$('#windOverlay .wd-step')).length===4);
  check('no wake chip in the hero', (await p.$$('.today-hero .wake-chip')).length===0);
  await p.click('#windOverlay [data-action="windStep"][data-id="plan"]');
  await p.click('#windOverlay [data-action="windAdd"][data-id="t1"]');
  await p.click('#windOverlay [data-action="windStep"][data-id="alarm"]');
  check('wind down pre-fills tomorrow\'s wake time', (await p.inputValue('#windAlarm'))==='07:00');
  await p.fill('#windAlarm', '06:15');
  await p.click('#windOverlay [data-action="windSaveOnly"]');
  check('night plan sets a one-morning wake time', await E("const o=state.focus.wake.override; o && o.date==='2026-10-08' && o.time==='06:15'"));
  check('no stray one-off alarm created', await E("state.focus.alarms.length===0"));
  await p.clock.setSystemTime(at(6,15,8)); await E('checkAllAlarms()');
  await p.click('[data-action="wakeImUp"]');
  await E("ACTIONS.briefSkip()");
  await p.click('[data-action="wakeClockIn"]'); await p.waitForTimeout(200);
  check('Clock in (after Good morning) shows the plan', (await p.textContent('#planOverlay')).includes('Edit reel'));
  await p.click('[data-action="closePlanReveal"]');
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

  // --- wake-up music: Apple Music through the Operator app, no beep, no screen-permission prompt ---
  const m = await newPage(b, OUT+'/al.html', {focus:{wake:{enabled:true, time:'07:00', days:[0,1,2,3,4,5,6]}}, boards:{boards:[{id:'v1', kind:'vision', name:'Vision Board', parentId:null, elements:[{id:'e1', type:'note', header:true, color:'#3FBE8E', title:'Mind + Body', body:'', x:0, y:0, w:300, h:96}], viewport:{x:0,y:0,zoom:1}}]}}, at(6,0));
  const M = (code) => m.evaluate(c => window.__op.ev(c), code);
  const calls = [];
  await m.route('http://127.0.0.1:8935/**', r => { calls.push(new URL(r.request().url()).pathname + new URL(r.request().url()).search); r.fulfill({status:200, body:'ok', headers:{'Access-Control-Allow-Origin':'*'}}); });
  await m.evaluate(() => { window.__screenAsked = 0; window.getScreenDetails = function(){ window.__screenAsked++; return Promise.reject(new Error('no')); }; });
  await M("(function(){ const o = playAlarmSound; window.__beeps = 0; playAlarmSound = function(x){ window.__beeps++; return o(x); }; })()");
  await M('openWakeSetup()');
  check('no second-screen option in the setup', !(await m.textContent('#wakeSetupContent')).includes('Second screen'));
  check('Music is one of the alarm sounds', await m.isVisible('.ws-sound-music'));
  await m.click('[data-action="wakeUseMusic"]'); await m.waitForTimeout(100);
  check('Apple Music is the first music option', await m.isVisible('#wakeMusicQuery'));
  await m.fill('#wakeMusicQuery', 'https://music.apple.com/us/album/lose-yourself/1440903625?i=1440903630');
  await m.click('[data-action="wakeSetAppleMusic"]');
  check('an Apple Music link becomes the song name', await M("JSON.stringify(state.focus.wake.media)")===JSON.stringify({type:'music', k:'song', q:'lose yourself'}));
  await m.click('[data-action="wakePreviewMusic"]'); await m.waitForTimeout(150);
  check('Test asks the Operator app to play it', calls.some(c => c.startsWith('/music/play?k=song&q=6c6f736520796f757273656c66')), calls);
  await m.click('[data-action="wakePreviewMusic"]'); await m.waitForTimeout(150);
  check('…and Stop pauses it', calls.some(c => c==='/music/stop'), calls);
  await M("hideOverlay('wakeSetupOverlay')");
  calls.length = 0; await M("window.__beeps = 0");
  await m.clock.setSystemTime(at(7,0)); await M('checkAllAlarms()'); await m.waitForTimeout(300);
  check('alarm rings: the wake screen comes up', await m.isVisible('#wakeOverlay .wk2'));
  check('it plays the song (and wakes / unmutes the Mac)', calls.some(c => c.startsWith('/music/play')) && calls.some(c => c==='/wake'), calls);
  await m.waitForTimeout(3000);
  check('no alarm beep while the song plays', await M("window.__beeps")===0);
  check('never asks for screen permissions', await m.evaluate(() => window.__screenAsked)===0);
  await m.click('[data-action="wakeImUp"]'); await m.waitForTimeout(300);
  check('"I\'m up" lets the song play out instead of cutting it off', calls.some(c => c==='/music/finish') && !calls.some(c => c==='/music/stop'), calls);
  check('…and the briefing has the vision board', (await m.textContent('#wakeOverlay')).includes('Mind + Body'));
  await m.click('[data-action="wakeStopMusic"]'); await m.waitForTimeout(300);
  check('the little ■ on the briefing stops it right away', calls.some(c => c==='/music/stop'), calls);
  await M("endBriefing()");
  // if the Operator app isn't there to play it, the alarm sound steps in
  await m.unroute('http://127.0.0.1:8935/**');
  await m.route('http://127.0.0.1:8935/**', r => r.abort());
  await M("window.__beeps = 0; fireWake({test:true})");
  for(let i=0;i<40;i++){ await m.clock.runFor(400); await m.waitForTimeout(40); }
  check('music can\'t start → the alarm sound rings instead, nothing to click', await M("window.__beeps")>0 && !(await m.isVisible('[data-action="wakePlayMusic"]')));
  await m.click('[data-action="wakeImUp"]');
  check('no page errors (music)', m.errors.length===0, m.errors);
  await b.close();
  process.exit(report()?1:0);
})();
