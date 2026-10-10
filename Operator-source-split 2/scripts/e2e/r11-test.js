// Round 11: wake music never restarts, notifications you can dismiss, Recently deleted, dragging
// in and out of Now / Up next, Lock In v2 (methods, set-up gate, timer after the stamp), Good
// morning v2 (narration, quote, headlines, Start my morning / Clock in), Clock out, Conversations,
// the gold + button, Health, reminders, Settings → You / Data, the status pill, new scenes, sounds.
const { instrument, launch, newPage, check, report, OUT } = require('./common.js');
const RSS = '<?xml version="1.0"?><rss><channel><title>NPR Topics: News</title><item><title>Fed holds rates steady</title><link>https://www.npr.org/a</link></item><item><title>Walking after meals helps</title><link>https://www.npr.org/b</link></item></channel></rss>';
(async () => {
  instrument(process.argv[2], OUT+'/r11.html');
  const b = await launch();
  const T = new Date(2026,9,9,14,30).getTime();
  const tasks = [{id:'a', title:'Edit JJS reel 3', status:'today', priority:'high', clients:['personal']}, {id:'b', title:'Script Nova ad', status:'today', priority:'med', clients:['personal']},
    {id:'c', title:'Invoice clients', status:'today', priority:'low', clients:['personal']}, {id:'d', title:'Call Mike back', status:'backlog', priority:'high', clients:['personal']}];

  // ---- bugs: toast, music, deleted tasks, Now / Up next drag, streak hint ----
  {
    const p = await newPage(b, OUT+'/r11.html', {profile:{name:'Andre', lineupView:null}, tasks:{items:tasks}, focus:{lineupOrder:['c','a','b']}}, T);
    const E = c => p.evaluate(x => window.__op.ev(x), c);
    await E("showToast('Away since 3:12 PM — 24m not counted.', {icon:'x', actionLabel:'Add it back', actionAction:'dismissToast', duration:20000})"); await p.waitForTimeout(200);
    check('notifications have an ✕', await p.isVisible('#activeToast .toast-x'));
    await p.click('#activeToast .toast-x'); await p.waitForTimeout(400);
    check('…which dismisses them', !(await p.isVisible('#activeToast')));
    // a slow "play" is never sent twice (the old retry restarted the song)
    let plays = 0;
    await p.route('http://127.0.0.1:8935/**', async r => { if(r.request().url().includes('/music/play')){ plays++; await new Promise(res => setTimeout(res, 5000)); } r.fulfill({status:200, body:'{"ok":true}', headers:{'Access-Control-Allow-Origin':'*'}}).catch(()=>{}); });
    const ok = await E("musicApp('play', {type:'music', k:'song', q:'Morning'})");
    check('a slow music start isn\'t retried (no restart)', plays===1 && ok===true, {plays, ok});
    // deleting
    await E("performDelete('task', 'b')"); await p.waitForTimeout(100);
    check('a deleted task goes to Recently deleted', await E("state.tasks.trash.length")===1 && !(await E("state.tasks.items.some(t=>t.id==='b')")));
    await E("ui.view='focus'; ui.focusTab='tasks'; ui.focusTasksSubTab='deleted'; renderView()"); await p.waitForTimeout(150);
    await p.click('[data-action="restoreDeletedTask"][data-id="b"]'); await p.waitForTimeout(150);
    check('…and Restore brings it back', await E("state.tasks.items.some(t=>t.id==='b')") && await E("state.tasks.trash.length")===0);
    // drag Up next back onto the list, and Now across to Up next
    await E("ui.focusTasksSubTab='overview'; setNextUp('a'); renderView()"); await p.waitForTimeout(200);
    await p.locator('.nn-next .nn-drag').first().dragTo(p.locator('[data-dropzone="today"]').first()); await p.waitForTimeout(200);
    check('drag Up next onto the list → slot clears', await E("state.focus.nextTaskId")===null);
    await E("setCurrentTask('c'); renderView()"); await p.waitForTimeout(200);
    await p.locator('.nn-now .nn-drag').first().dragTo(p.locator('[data-dropzone="next"]').first()); await p.waitForTimeout(200);
    check('drag Now onto Up next → swaps', await E("ui.currentTaskId")===null && await E("state.focus.nextTaskId")==='c');
    await E("ui.view='today'; renderView()"); await p.waitForTimeout(150);
    check('the streak hint lives in the ? (no line to jump the layout)', !/Hit today.s standard/.test(await p.textContent('.th-streak .streak-status')));
    check('List is the first lineup view, and the default', await E("lineupView()")==='list');
    check('no errors (bugs)', !p.errors.length, p.errors);
    await p.context().close();
  }

  // ---- Lock In v2 ----
  {
    const p = await newPage(b, OUT+'/r11.html', {profile:{name:'Andre'}, tasks:{items:tasks}, focus:{lineupOrder:['c','a','b']}}, T);
    const E = c => p.evaluate(x => window.__op.ev(x), c);
    await E("ui.view='today'; renderView()"); await p.waitForTimeout(150);
    await p.click('.lockin-cta'); await p.waitForTimeout(250);
    check('one lock button, in the corner', (await p.$$('#lockSeqOverlay .ls-now')).length===1 && !(await p.$('#lockSeqOverlay .ls-brand')));
    check('later steps are locked until you get there', await p.isDisabled('#lockSeqOverlay .wd-step[data-id="why"]'));
    await p.click('#lockSeqOverlay .ls-row[data-id="a"] .ls-slot-now'); await p.click('#lockSeqOverlay .ls-row[data-id="b"] .ls-slot-next');
    check('pick Now and Next from the lineup', await E("ui.lockSeq.nowId")==='a' && await E("ui.lockSeq.nextId")==='b');
    await p.click('#lockSeqOverlay .wd-chip[data-id="d"]'); await p.waitForTimeout(100);
    check('add to today from your list', await E("state.tasks.items.find(t=>t.id==='d').status")==='today');
    await p.click('.ls-next'); await p.waitForTimeout(150);
    await p.click('[data-action="lockMethod"][data-id="pomodoro"]'); await p.waitForTimeout(100);
    check('methods: Pomodoro shows its rhythm', (await p.$$('.ls-preview i')).length >= 7 && /Done at/.test(await p.textContent('.ls-ends')));
    await p.click('.ls-next'); await p.waitForTimeout(150);
    await p.click('.ls-next'); await p.waitForTimeout(150);
    check('Set up: unticked boxes deny Next (red + shake)', await E("ui.lockSeq.step")==='prep' && await p.isVisible('.ls-checks.is-denied') && /Tick every box/.test(await p.textContent('.ls-ready')));
    const n = (await p.$$('.ls-check')).length; for(let i=0;i<n;i++) await p.click('.ls-check >> nth='+i);
    await p.click('.ls-next'); await p.waitForTimeout(150);
    await p.waitForTimeout(300);
    check('Why: the big LOCK IN in the middle, corner button out of the way', await p.isVisible('.ls-go') && !(await p.isVisible('#lockSeqOverlay .ls-now')));
    check('no filler text', !/No finish line|stop when you/.test(await p.textContent('#lockSeqOverlay')));
    await p.click('.ls-go'); await p.waitForTimeout(400);
    check('the clock doesn\'t start under the stamp', !(await E("!!state.focus.activeSession")) && await p.isVisible('.lock-flash'));
    await p.waitForTimeout(1500);
    const s = await E("JSON.stringify({p:state.focus.activeSession.plannedMinutes, m:state.focus.activeSession.method.id, cur:ui.currentTaskId, next:state.focus.nextTaskId})");
    check('then it starts: #a now, #b next, Pomodoro (4×25)', s==='{"p":100,"m":"pomodoro","cur":"a","next":"b"}', s);
    await E("state.focus.activeSession.startedAt -= 25*60000+500; checkMethodTimer()"); await p.waitForTimeout(150);
    check('after 25 min the break starts on its own', await E("state.focus.activeSession.onBreak") && Math.round(await E("(state.focus.activeSession.breakEndsAt-Date.now())/60000"))===5);
    await E("state.focus.activeSession.breakEndsAt = Date.now()-5; checkBreakTimer()"); await p.waitForTimeout(150);
    check('…and ends on its own, back to round 2', !(await E("state.focus.activeSession.onBreak")) && await E("state.focus.activeSession.round")===2);
    // the status pill
    await E("renderView(); updateActivityPill()"); await p.waitForTimeout(100);
    check('status pill knows you\'re locked in', await p.getAttribute('#activityPill', 'data-state')==='locked');
    await p.click('#activityPill'); await p.waitForTimeout(150);
    check('…and opens a status card with Break / Lock out', await p.isVisible('.ap-status [data-action="openBreakNotePrompt"]') && await p.isVisible('.ap-status [data-action="openStopFocus"]'));
    await E("ui.pillMenu=null; renderPillMenu(); reallyConfirmStopFocus()"); await p.waitForTimeout(200);
    check('locking out plays its own stamp', await p.isVisible('.lock-flash.is-out'));
    check('no errors (lock in)', !p.errors.length, p.errors);
    await p.context().close();
  }

  // ---- Good morning v2, Clock in / out ----
  {
    const W = new Date(2026,9,10,7,0).getTime();
    const p = await newPage(b, OUT+'/r11.html', {profile:{name:'Andre'}, tasks:{items:tasks}, settings:{weather:{lat:40.7, lon:-74, current:{at:W, temp:54, feels:52, code:1, hi:63, lo:48}}},
      focus:{morningNotes:[{id:'m1', forDate:'2026-10-10', text:'Call Mike first.'}], wake:{enabled:true, time:'07:00', days:[0,1,2,3,4,5,6]}}}, W);
    await p.route('http://127.0.0.1:8935/**', r => { const u = new URL(r.request().url()); if(u.pathname==='/news') return r.fulfill({status:200, body:RSS, headers:{'Access-Control-Allow-Origin':'*'}}); r.fulfill({status:200, body:'{"ok":true}', headers:{'Access-Control-Allow-Origin':'*'}}); });
    const E = c => p.evaluate(x => window.__op.ev(x), c);
    await E("checkAllAlarms()"); await p.waitForTimeout(400);
    await p.click('[data-action="wakeStartDay"]'); await p.waitForTimeout(500);
    check('the slow, cinematic intro is the default', await E("wakeCfg().intro")==='cinematic' && await p.isVisible('.brief-intro.is-cinematic'));
    await p.waitForTimeout(8600);
    check('the narration types itself out', (await p.textContent('#brVoice')).length > 2 || (await E("ui.briefLines.length")) > 4);
    check('pieces arrive one at a time, not all at once', await p.evaluate(() => { const els = Array.from(document.querySelectorAll('#wakeContent .br-p[data-k]')); return els.some(e => getComputedStyle(e).opacity < 0.5) && els.some(e => getComputedStyle(e).opacity > 0.9); }));
    await p.click('[data-action="briefSkip"]'); await p.waitForTimeout(900);
    const brief = await p.textContent('#wakeOverlay');
    check('your note, a line for today, and the weather', /Call Mike first/.test(brief) && await p.isVisible('.br-quote blockquote') && /54/.test(await p.textContent('.br-hero')));
    check('headlines (through the launcher)', /Fed holds rates steady/.test(brief));
    check('one way forward: Start my morning', await p.isVisible('[data-action="wakeStartMorning"]') && !(await p.$('[data-action="wakeClockIn"]')));
    await p.click('[data-action="wakeStartMorning"]'); await p.waitForTimeout(300);
    check('Start my morning: life first — routine, note, no work list', await E("state.modes.active && state.modes.active.morning") && await p.isVisible('.mm-routine') && !(await p.$('.mm .plan-list')));
    await p.click('.mm-clockin'); await p.waitForTimeout(1600);
    check('Clock in: the plan of attack, then Lock in', !(await E("state.modes.active")) && await p.isVisible('#planOverlay:not(.hidden) .pr-list') && await p.isVisible('#planOverlay .pr-go'));
    await p.click('#planOverlay .pr-go'); await p.waitForTimeout(250);
    check('…which opens the Lock In sequence on #1', await p.isVisible('#lockSeqOverlay:not(.hidden)'));
    await E("closeLockSeq()");
    await p.click('[data-action="clockOut"]'); await p.waitForTimeout(250);
    check('Clock out: done for the day', await E("state.modes.active && state.modes.active.clockedOut") && await p.isVisible('.lock-flash.is-clock') && /Clocked out/.test(await p.textContent('#viewRoot')) && await p.isVisible('.offtime-card [data-action="clockIn"]'));
    check('no errors (morning)', !p.errors.length, p.errors);
    await p.context().close();
  }

  // ---- pages: Conversations, + button, Health, reminders, settings, wind-down drag-in ----
  {
    const p = await newPage(b, OUT+'/r11.html', {profile:{name:'Andre', goalWeight:195}, tasks:{items:tasks}, health:{weightLog:[{id:'w1', date:'2026-10-01', weight:212},{id:'w2', date:'2026-10-08', weight:209.5}], calorieEntries:[], gymLog:[]}}, T);
    const E = c => p.evaluate(x => window.__op.ev(x), c);
    check('Conversations has its own place in the sidebar', await p.isVisible('#sidebarNav [data-view="convos"]'));
    await E("ui.view='business'; renderView()"); await p.waitForTimeout(150);
    check('…and Business no longer carries Inbox / Social', !(await p.$('[data-action="businessTab"][data-tab="inbox"]')) && !(await p.$('[data-action="businessTab"][data-tab="social"]')));
    await E("ACTIONS.goToSocial()"); await p.waitForTimeout(150);
    check('"Open" on the Social panel lands on Conversations → Social', await E("ui.view==='convos' && inboxState().mode==='social'"));
    await E("ui.view='personal'; ui.personalTab='goals'; renderView()"); await p.waitForTimeout(150);
    check('Goals: no separate "Add a goal" button — the + does it', !/Add a goal/.test(await p.textContent('#viewRoot')) && await p.getAttribute('#fabAdd', 'data-label')==='Add goal');
    await p.click('#fabAdd'); await p.waitForTimeout(200);
    check('…the gold + opens the goal form', await p.isVisible('#newGoalLabel'));
    await E("ui.personalTab='fitness'; ui.healthTab='weight'; renderView()"); await p.waitForTimeout(150);
    check('Weight: big number, change and goal progress, area chart', /209.5/.test(await p.textContent('.hw-now')) && /14.5 to go/.test(await p.textContent('.hw-goal')) && await p.isVisible('.hw-svg'));
    await p.fill('#weightValue', '208.8'); await p.click('[data-action="addWeight"]'); await p.waitForTimeout(150);
    check('…logging still works', await E("state.health.weightLog.length")===3);
    await E("ui.healthTab='calories'; renderView()"); await p.waitForTimeout(150);
    await p.click('.hc-pick >> nth=0'); await p.waitForTimeout(150);
    check('Calories: one tap from the quick picks', await E("state.health.calorieEntries.length")===1 && /left today/.test(await p.textContent('.hc-left')));
    await E("ui.view='calendar'; renderView()"); await p.waitForTimeout(150);
    await p.fill('#newReminderLabel', 'Pay rent'); await p.click('[data-action="remindDay"][data-id="1"]'); await p.press('#newReminderLabel', 'Enter'); await p.waitForTimeout(150);
    check('Reminders: type, pick Tomorrow, Enter', await E("state.focus.reminders.some(r=>r.label==='Pay rent' && r.date==='2026-10-10')"));
    await E("ui.view='settings'; ui.settingsTab='general'; renderView()"); await p.waitForTimeout(150);
    check('Settings: preferences and the wake-up alarm live in You', await p.isVisible('.settings-nav-item[data-tab="sound"]') && /Wake-up alarm/.test(await p.textContent('#viewRoot')) && await p.isVisible('.settings-nav-item[data-tab="data"]'));
    await E("ui.view='today'; renderView()"); await p.waitForTimeout(150);
    check('Quick journal: a way into the full journal', await p.isVisible('.qj2-open'));
    check('no errors (pages)', !p.errors.length, p.errors);
    await p.context().close();
  }

  // ---- scenes and sounds ----
  {
    const p = await newPage(b, OUT+'/r11.html', {profile:{name:'Andre'}});
    const E = c => p.evaluate(x => window.__op.ev(x), c);
    check('new scenes: Tokyo, Shanghai, Meadow (old one is Kyoto)', await E("['neotokyo','shanghai','meadow'].every(id => SCENE_DEFS[id]) && SCENES.find(s=>s.id==='tokyo').label==='Kyoto'"));
    for(const id of ['neotokyo', 'shanghai', 'meadow']){ await E("state.profile.scene='"+id+"'; sceneMount(); sceneTick(SC.x, SC.fx.getContext('2d'), 0.03, 5000)"); }
    check('…they draw without errors', !p.errors.length, p.errors);
    check('soft sounds play without errors', await E("(playNav(), playStep(2), playDrop(), playDragLift(), playLockOut(), playDeny(), true)"));
    await p.context().close();
  }
  await b.close();
  process.exit(report()?1:0);
})();
