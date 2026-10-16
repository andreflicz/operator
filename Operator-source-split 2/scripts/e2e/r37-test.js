// Round 37: Add it back counts the time (no loop), Op never stuck thinking (Stop, talk over him, time
// limits), lock in with a work method, skills done for the day everywhere, Today's full-screen view,
// Player ↔ Cockpit in the minimal view, one clock per timer, the Cockpit's break, Calendar's Op line,
// Standing's breakdown, voice profiles, the Good morning quote every 20 s.
const { instrument, launch, newPage, check, report, OUT } = require('./common.js');
const CORS = {'Access-Control-Allow-Origin':'*'};
(async () => {
  instrument(process.argv[2], OUT+'/r37.html');
  const b = await launch();
  const T = new Date(2026,9,13,14,20).getTime();

  // ---- Add it back ----
  {
    const p = await newPage(b, OUT+'/r37.html', {profile:{name:'Andre'}}, T);
    const E = c => p.evaluate(x => window.__op.ev(x), c);
    await E("state.focus.sessions.push({id:'aw', type:'deep', date:todayStr(), startedAt:Date.now()-90*60000, endedAt:Date.now()-33*60000, minutes:57, completedTasks:[], away:true, reviewed:false}); state.focus.awayStop = {sessionId:'aw', active:{startedAt:Date.now()-90*60000, breaks:[], completedTasks:[]}, endedAt:Date.now()-33*60000, at:Date.now(), shown:true}; ACTIONS.restoreAwaySession()");
    const s = await E("state.focus.sessions.find(x => x.id==='aw')");
    check('Add it back counts the time (to now) and leaves you locked out', !(await E("!!state.focus.activeSession")) && s.minutes >= 89 && !s.away && s.reviewed, s);
    check('…and says how much went back on', /Added back: 33m/.test(await p.textContent('#toastContainer')));
    check('no page errors (add it back)', p.errors.length===0, p.errors);
    await p.context().close();
  }

  // ---- Op: never stuck, never ignoring you; lock in with a method ----
  {
    const p = await newPage(b, OUT+'/r37.html', {profile:{name:'Andre'}, tasks:{items:[{id:'t1', title:'Editing batch', status:'today'}]}}, T);
    let hang = true;
    await p.route('http://127.0.0.1:8935/**', async r => {
      const u = r.request().url();
      if(u.includes('/ai/status')) return r.fulfill({status:200, headers:CORS, body:'{"hasKey":true}'});
      if(u.includes('/ai/models')) return r.fulfill({status:200, headers:CORS, body:'{"data":[{"id":"claude-haiku-5-5"}]}'});
      if(u.includes('/ai/chat')){
        if(hang) return;   // never answers
        const body = JSON.parse(Buffer.from(decodeURIComponent(u.split('b=')[1]), 'hex').toString()), last = body.messages[body.messages.length-1];
        if(typeof last.content==='string' && /90/.test(last.content)) return r.fulfill({status:200, headers:CORS, body:JSON.stringify({stop_reason:'tool_use', content:[{type:'tool_use', id:'u1', name:'lock_in', input:{method:'ultradian'}}]})});
        return r.fulfill({status:200, headers:CORS, body:JSON.stringify({stop_reason:'end_turn', content:[{type:'text', text:'On it.'}]})});
      }
      return r.fulfill({status:200, headers:CORS, body:'{}'});
    });
    const E = c => p.evaluate(x => window.__op.ev(x), c);
    await E("AI.hasKey = true; wakeCfg().voice = false");
    E("aiAsk('what should I do', 'opBubText')");
    await p.waitForTimeout(2000);
    check('Op thinking: a Stop button (round 39: in his pop-up)', await E("AI.busy") && await p.isVisible('#opBub .ob-status [data-action="opCancelThink"]'));
    await p.click('#opBub .ob-status [data-action="opCancelThink"]'); await p.waitForTimeout(300);
    check('…Stop drops it right away', !(await E("AI.busy")) && /dropped it/.test(await E("document.getElementById('opBubText').textContent")));
    E("aiAsk('first thing', 'opBubText')"); await p.waitForTimeout(800);
    hang = false;
    await E("aiAsk('start a work block, do the 90-20', 'opBubText')"); await p.waitForTimeout(1500);
    check('talking while he thinks: the new thing wins (not ignored)', !(await E("AI.busy")) && /On it/.test(await E("document.getElementById('opBubText').textContent")));
    check('"do the 90-20": he locks you in with the 90 / 20 method', await E("!!(state.focus.activeSession && state.focus.activeSession.method && state.focus.activeSession.method.id==='ultradian')"));
    check('the "Operator" ear only listens while Operator is in front', /hasFocus/.test(await E("heyQuietNow.toString()")));
    check('no page errors (Op)', p.errors.length===0, p.errors);
    await p.context().close();
  }

  // ---- skills and ongoing tasks: done for today is done ----
  {
    const p = await newPage(b, OUT+'/r37.html', {profile:{name:'Andre'}, tasks:{items:[{id:'s1', title:'Piano practice', status:'today', skill:true, ongoing:true, ongoingDoneDates:[]}, {id:'t1', title:'Editing batch', status:'today'}]}}, T);
    const E = c => p.evaluate(x => window.__op.ev(x), c);
    await E("completeTask('s1')"); await p.waitForTimeout(1200);
    check('a skill done for today is off Op’s list', JSON.stringify(await E("opOpen().map(c => c.t)"))==='["Editing batch"]');
    check('…his check-in facts count it done', await E("acctFacts().done")===1 && await E("acctFacts().total")===2);
    check('…and his background says so', /done: Piano practice/.test(await E("aiContext()")));
    check('…the task itself still comes back tomorrow', await E("state.tasks.items[0].status")==='today');
    await E("ui.view='today'; renderView()"); await p.waitForTimeout(200);
    check('…and the Today row counts it done', /^1/.test((await p.textContent('.swt-n')).trim()));
    check('no page errors (skills)', p.errors.length===0, p.errors);
    await p.context().close();
  }

  // ---- Today's full screen, the minimal views, the timers ----
  {
    const p = await newPage(b, OUT+'/r37.html', {profile:{name:'Andre', lockedView:'minimal'}, tasks:{items:[{id:'t1', title:'Edit reel', status:'today'}]}}, T);
    const E = c => p.evaluate(x => window.__op.ev(x), c);
    await E("ui.view='today'; renderView()"); await p.waitForTimeout(200);
    check('Today has a full-screen icon in the panel corner (r38e: not a chip by the name, not top right)', await p.isVisible('.today-hero .th-full') && !(await p.$('.th-min')));
    await p.click('.today-hero .th-full'); await p.waitForTimeout(400);
    check('…a full-screen Today: the clock, your level, LOCK IN', await p.isVisible('#viewRoot .np-home') && await E("document.body.classList.contains('np-on')"));
    await p.keyboard.press('m'); await p.waitForTimeout(700);
    check('…M takes you back', !(await p.$('#viewRoot .np-home')));
    await E("ui.pendingLockMethod = {id:'pomodoro'}; startFocus(null); ui.pendingLockMethod = null; ui.view='today'; renderView()"); await p.waitForTimeout(400);
    check('locked in, minimal: a round counts down big (one clock)', /^2[45]:\d\d$/.test((await p.textContent('#npBig')).trim()) && /break at/.test(await p.textContent('#msLine')));
    check('…a Cockpit switch right there', await p.isVisible('.np .np-v[data-action="lockedStyleSet"][data-id="cockpit"]'));
    await p.click('.np .np-v[data-action="lockedStyleSet"]'); await p.waitForTimeout(400);
    check('…switches to the Cockpit (and back is there too)', await p.isVisible('.np.is-cockpit .ckp') && await p.isVisible('.np .np-v[data-action="lockedStyleSet"][data-id="player"]'));
    check('…its timer face counts the round down too', /^2[45]:\d\d$/.test((await p.textContent('.ckp .tm-t')).trim()));
    await E("state.focus.activeSession.startedAt -= 25*60000 + 3000"); await p.clock.runFor(3000); await p.waitForTimeout(400);
    check('the Cockpit has its own break: the time left, big', await E("state.focus.activeSession.onBreak") && await p.isVisible('.np.is-cockpit.is-break .ckp') && /^0[45]:\d\d$/.test((await p.textContent('.ckp .tm-t')).trim()));
    await E("ACTIONS.lockedStyleSet(null, null, 'player')"); await p.waitForTimeout(300);
    check('the Player’s break: the time left is the big number', await p.evaluate(() => { const r = document.getElementById('breakRemaining'); return !!r && parseFloat(getComputedStyle(r).fontSize) >= 28; }));
    check('no page errors (minimal)', p.errors.length===0, p.errors);
    await p.context().close();
  }

  // ---- the recap: who started each lock-in ----
  {
    const p = await newPage(b, OUT+'/r37.html', {profile:{name:'Andre'}, tasks:{items:[{id:'t1', title:'Edit reel', status:'today'}]}}, T);
    const E = c => p.evaluate(x => window.__op.ev(x), c);
    const end = "state.focus.activeSession.startedAt -= 30*60000; lockOriginSync(); autoEndFocusSession(Date.now()); state.focus.lastManualStopAt = null";
    await E("startFocus(null)"); await p.waitForTimeout(100); await E(end);
    await E("opRunTool('lock_in', {})"); await p.waitForTimeout(100); await E(end);
    await E("ACTIONS.pillLockNow()"); await p.waitForTimeout(100); await E(end);
    await E("startFocus(null); state.focus.activeSession.autoStarted = true; state.focus.activeSession.autoApp = 'Final Cut Pro'"); await p.waitForTimeout(100); await E(end);
    await E("openDayRecap(todayStr())"); await p.waitForTimeout(400);
    const by = await p.$$eval('.rcx-row .rcx-by', e => e.map(x => x.textContent.trim()));
    check('the recap says who started each lock-in (not "you" for all)', by.some(t => /^\W*You$/.test(t)) && by.some(t => /Op locked you in/.test(t)) && by.some(t => /Op bar/.test(t)) && by.some(t => /Auto · Final Cut Pro/.test(t)), by);
    check('…counts them by who', /by you/.test(await p.textContent('.rcx-sh')) && /by Op/.test(await p.textContent('.rcx-sh')));
    check('…and the timeline blocks say it too', (await p.$$('.rc-blk[data-by]')).length===4);
    check('no page errors (recap)', p.errors.length===0, p.errors);
    await p.context().close();
  }

  // ---- from Op's memory: the app learns it ----
  {
    const p = await newPage(b, OUT+'/r37.html', {profile:{name:'Andre'}, tasks:{items:[{id:'t1', title:'Overdue video run', status:'today', deadline:'2026-10-10'}]},
      business:{clients:[{id:'c1', name:'JJS Construction', stage:'active', status:'active', mrr:3000}], pipeline:[{id:'v1', name:'Vigo', stage:'closed', value:2000}]},
      focus:{reminders:[{id:'r1', label:'Call the dentist', date:'2026-10-19'}]}, goals:{items:[{id:'g1', tier:'week', pk:'2026-10-12', label:'test'}]}}, T);
    const E = c => p.evaluate(x => window.__op.ev(x), c);
    await p.waitForTimeout(1600);
    check('you talk slowly: Op waits longer before he sends (and there’s a setting)', await E("opPauseMs()") >= 3500 && /When you talk/.test(await E("opSettingsHtml()")));
    check('check-ins every couple of hours by default (and a setting)', await E("workCfg().pace")==='twohours' && /Every couple of hours/.test(await E("opSettingsHtml()")));
    check('Op’s rules: short, quiet when you’re good, no morning walkthrough', /One or two sentences/.test(JSON.stringify(await E("aiSystem()"))) && /he’s good, no, not now/.test(JSON.stringify(await E("aiSystem()"))));
    check('a lead marked won but never touched is flagged', /never touched/.test(await E("crmCard('lead', state.business.pipeline[0])")) && /don’t add up/.test(await E("aiContext()")));
    check('placeholder goals ("test") are pointed out to Op', /Placeholder goals/.test(await E("aiContext()")));
    check('Op can clear a reminder', /cleared/.test(await E("opRunTool('clear_reminder', {label_contains:'dentist'})")) && (await E("state.focus.reminders.length"))===0);
    check('…remove a deadline', /removed/.test(await E("opRunTool('set_task_deadline', {task:'video run', date:'none'})")) && await E("state.tasks.items[0].deadline")===null);
    check('…set the MRR target', /10,000/.test(await E("opRunTool('set_mrr_goal', {amount:10000})")) && await E("state.profile.revenueGoalMonthly")===10000);
    check('…rename a placeholder goal', /renamed/.test(await E("opRunTool('edit_goal', {label_contains:'test', new_label:'Sign one new client'})")));
    check('…set what a client is owed next (round 40: kept for Op, no longer a row on the card)', /next for/.test(await E("opRunTool('set_client_next_action', {who:'JJS', action:'Send the October reel cut'})")) && await E("state.business.clients.some(c => c.nextAction==='Send the October reel cut')"));
    check('…and switch views (the Cockpit, his own screen)', /cockpit/.test(await E("opRunTool('set_view', {view:'cockpit'})")) && await E("state.profile.lockedStyle")==='cockpit');
    await E("opMemory().push({id:'m1', text:'Andre may travel to China within the next week and is setting up systems so JJS Construction and Batusha Corp stay looked after while he is away.', at:1})");
    check('memory: the same thing said again updates it instead of adding another', await E("opRunTool('remember', {fact:'Andre may travel to China within the next week or so; he is setting up systems so JJS Construction and Batusha Corp stay looked after while he is away.'})")==='updated' && await E("opMemory().length")===1);
    await E("ui.view='business'; ui.businessTab='clients'; renderView()"); await p.waitForTimeout(200);
    check('round 40: no “Next step” row on client cards', !(await p.$('.cn-row')));
    check('no page errors (memory → app)', p.errors.length===0, p.errors);
    await p.context().close();
  }

  // ---- Calendar, Standing, voice profiles, Good morning's quote ----
  {
    const p = await newPage(b, OUT+'/r37.html', {profile:{name:'Andre'}, tasks:{items:[{id:'t1', title:'Edit reel', status:'today', deadline:'2026-10-15'}]}}, T);
    const E = c => p.evaluate(x => window.__op.ev(x), c);
    await E("intentStore().prompted['W'+weekKey()]=1; intentStore().prompted['M'+monthKey()]=1; ui._intAsked='x'; (typeof checkoutDue==='function') && checkoutDue().forEach(c => intentStore().prompted['O'+c.kind+':'+c.key] = 1)");
    await E("ui.view='calendar'; renderView()"); await p.waitForTimeout(300);
    check('Calendar: Op’s line runs the width of the header', await p.evaluate(() => { const t = document.querySelector('.cx-header .op-tip'), h = document.querySelector('.cx-header'); return !!t && t.getBoundingClientRect().width > h.getBoundingClientRect().width*0.6; }));
    await E("acct().log.push({id:'a1', at:Date.now()-3600000, date:todayStr(), status:'working', prod:4}); opfOpen({})"); await p.waitForTimeout(700);
    check('Standing: hover it for the breakdown (four parts, the weakest called out)', (await p.$$('.oa-stand .osp .osp-r')).length===4 && /Weakest link|Solid|builds/.test(await p.textContent('.osp-read')));
    await p.hover('.oa-stand'); await p.waitForTimeout(300);
    check('…and it shows on hover', await p.isVisible('.oa-stand .osp'));
    await E("document.getElementById('opFull') && ACTIONS.opfClose ? ACTIONS.opfClose() : null");
    await E("wakeCfg().voiceEngine='eleven'; wakeCfg().elevenVoice='21m00Tcm4TlvDq8ikWAM'; wakeCfg().voiceSpeed=1.1; ui.view='settings'; ui.settingsTab='connections'; renderView()"); await p.waitForTimeout(300);
    // Op's color
    const opc = () => p.evaluate(() => getComputedStyle(document.documentElement).getPropertyValue('--op-c').replace(/\s/g, '').toLowerCase());
    // (the color fades in, so allow a few points either way)
    const near = (v, rgb) => { const m = /rgb\((\d+),(\d+),(\d+)/.exec(v); if(!m) return false; return [1, 2, 3].every(i => Math.abs(+m[i] - rgb[i-1]) <= 8); };
    await E("ACTIONS.opColorSet(null, null, '#7aa2ff')"); await p.waitForTimeout(1200);
    check('Op’s color: pick one and his light takes it', near(await opc(), [122, 162, 255]) && /op-col/.test(await E("opSettingsHtml()")), await opc());
    await E("opMood('stern', 60000)"); await p.waitForTimeout(1200);
    const stern = await opc();
    await E("state.profile.opMoodColors = false; opColorApply()"); await p.waitForTimeout(1200);
    const still = await opc();
    check('…his moods still tint him, unless you turn that off', near(stern, [255, 98, 98]) && near(still, [122, 162, 255]), [stern, still]);
    check('…and he can change it when you ask', /color set/.test(await E("opRunTool('set_my_color', {hex:'#6ff0c0'})")) && await E("state.profile.opColor")==='#6ff0c0');
    await E("opMood('neutral'); state.profile.opMoodColors = true; ACTIONS.opColorSet(null, null, '#ffffff')");
    check('voice: more ElevenLabs voices to pick', await E("ELEVEN_VOICES.length") >= 12);
    const has = await E("opVoiceSettingsHtml().indexOf('vp-add') >= 0");
    check('voice profiles: save the voice under a name', has);
    await E("document.body.insertAdjacentHTML('beforeend', '<input id=vpName value=\"Coach\">'); ACTIONS.voiceProfileSave(); document.getElementById('vpName').remove()");
    await E("wakeCfg().elevenVoice='JBFqnCBsd6RMkjVDRZzb'; wakeCfg().voiceSpeed=1");
    await E("ACTIONS.voiceProfileUse(null, null, voiceProfiles()[0].id)");
    check('…one tap and that’s who’s talking (voice and speed)', await E("wakeCfg().elevenVoice")==='21m00Tcm4TlvDq8ikWAM' && await E("wakeCfg().voiceSpeed")===1.1);
    check('…and Op can switch it when asked', /switched to Coach/.test(await E("opRunTool('set_voice', {profile:'coach'})")));
    await E("state.focus.wake={enabled:true, time:'07:00', days:[0,1,2,3,4,5,6], news:false, intro:'quick', introChosen:true, voice:false}; fireWake({})");
    await p.click('[data-action="wakeStartDay"]'); await p.waitForTimeout(500); await E("briefRevealAll()"); await p.waitForTimeout(900);
    const q0 = await p.textContent('.qt[data-q="morning"] blockquote');
    check('Good morning: the quote’s button is a ring by its corner, always there', await p.isVisible('.qt[data-q="morning"] .qt-next'));
    check('…and the Op bar steps aside', !(await p.isVisible('#activityPill')));
    await p.mouse.move(5, 5); await p.clock.runFor(32000); await p.waitForTimeout(500);
    check('…the quote turns over every 20 seconds on its own', (await p.textContent('.qt[data-q="morning"] blockquote'))!==q0);
    check('no page errors (round 37)', p.errors.length===0, p.errors);
    await p.context().close();
  }

  await b.close();
  process.exit(report() ? 1 : 0);
})();
