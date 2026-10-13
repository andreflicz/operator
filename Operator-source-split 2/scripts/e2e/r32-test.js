// Round 32: the + is the only way to add (per page: Business, Calendar, Today); Business setup is a
// gear and one sheet; the Calendar's Op read is one line, no Next up, a bigger month, alarms and
// reminders in one card; Goals in one panel; Op's screen: type or talk any time, the journal stays,
// the scoreboard; Op as an accountability partner (today's tasks are the commitment, the ask,
// escalation, the review).
const { instrument, launch, newPage, check, report, OUT } = require('./common.js');
(async () => {
  instrument(process.argv[2], OUT+'/r32.html');
  const b = await launch();
  const T = new Date(2026,9,13,14,20,0).getTime();   // Tuesday Oct 13
  const seed = {profile:{name:'Andre', revenueGoalMonthly:20000},
    business:{clients:[{id:'c1', name:'Jay', business:'JJS Fitness', mrr:1500, status:'active', stage:'active', startDate:'2026-10-02', journal:[], touchpoints:[]}], pipeline:[{id:'l1', name:'Rosa', stage:'contacted', value:800, createdAt:'2026-10-01'}]},
    tasks:{items:[{id:'t1', title:'JJS launch edit', status:'today', deadline:'2026-10-15', clients:[]}]},
    calendar:{events:[{id:'e1', date:'2026-10-15', time:'10:00', title:'Shoot B-roll'}]},
    focus:{reminders:[{id:'r1', label:'Call Mike back', date:'2026-10-13', time:'16:00'}], opMuted:true},
    goals:{items:[{id:'g1', label:'Read 12 books', target:12, current:4, unit:'books'}, {id:'w1', tier:'week', pk:'2026-10-12', label:'Ship the launch'}]},
    journal:{entries:[], intentions:{months:{'2026-10':{at:1}}, weeks:{'2026-10-12':{at:1}}, prompted:{'W2026-10-12':1, 'M2026-10':1}}}};

  // ---------- the + menus, the sheets, nothing inline ----------
  {
    const p = await newPage(b, OUT+'/r32.html', seed, T);
    const E = c => p.evaluate(x => window.__op.ev(x), c);
    const menu = async () => E("(ui.fabMenu||[]).map(m => m[1]).join('|')");
    await E("ui.view='calendar'; renderView(); ACTIONS.fabAdd()"); await p.waitForTimeout(200);
    check('Calendar +: an event, an alarm or a reminder', await menu()==='An event|An alarm|A reminder', await menu());
    await E("addSheetClose('addPick'); ui.view='business'; ui.businessTab='overview'; renderView(); ACTIONS.fabAdd()");
    check('Business overview +: a client or a lead', await menu()==='A client|A lead', await menu());
    await E("addSheetClose('addPick'); ui.businessTab='leads'; renderView(); ACTIONS.fabAdd()");
    check('…on Leads, the lead comes first', await menu()==='A lead|A client', await menu());
    await E("addSheetClose('addPick'); ui.view='today'; renderView(); ACTIONS.fabAdd()");
    check('Today +: a task, a video idea, a skill and now a reminder', /A task\|A video idea\|A training skill\|A reminder/.test(await menu()), await menu());
    await E("addSheetClose('addPick'); ui.view='business'; ui.businessTab='lifecycle'; renderView()");
    const nc = await E("cycles().length"); await E("ACTIONS.fabAdd()"); await p.waitForTimeout(200);
    check('Lifecycle +: makes a new cycle and opens it', await E("cycles().length")===nc + 1 && await E("overlayOpen('lifecycleOverlay')"));
    await E("hideOverlay('lifecycleOverlay'); ui.businessTab='packages'; renderView()");
    check('Packages + adds a package, Finances + an invoice', await E("fabContext().label")==='Add package' && await E("ui.businessTab='finances'; fabContext().label")==='Add invoice');

    // an alarm
    await E("ui.view='calendar'; renderView(); openAlarmSheet()"); await p.waitForTimeout(150);
    await p.fill('#alSheetLabel', 'Call the bank'); await p.fill('#alSheetTime', '16:30');
    await p.click('#alarmSheet [data-action="alarmRepeat"][data-id="once"]'); await p.waitForTimeout(100);
    await p.click('#alarmSheet .hs-go'); await p.waitForTimeout(150);
    const al = await E("JSON.stringify(state.focus.alarms.find(a => a.label==='Call the bank'))");
    check('an alarm from the +: time, label, just once (today, since 4:30 is still ahead)', /"time":"16:30"/.test(al||'') && /"date":"2026-10-13"/.test(al||''), al);
    check('…the sheet closes', await E("document.getElementById('alarmSheet').classList.contains('hidden')"));
    await E("openAlarmSheet()"); await p.fill('#alSheetTime', '07:15'); await p.click('#alarmSheet [data-action="alarmRepeat"][data-id="weekdays"]'); await p.click('#alarmSheet .hs-go'); await p.waitForTimeout(150);
    check('…weekdays means Monday to Friday', await E("JSON.stringify(state.focus.alarms.find(a => a.time==='07:15').days)")==='[1,2,3,4,5]');
    // a reminder
    await E("openReminderSheet()"); await p.waitForTimeout(150);
    const n0 = await E("state.focus.reminders.length");
    await p.click('#reminderSheet .hs-go'); await p.waitForTimeout(100);
    check('a reminder needs words', await E("state.focus.reminders.length")===n0 && !(await E("document.getElementById('reminderSheet').classList.contains('hidden')")));
    await p.fill('#rmSheetLabel', 'Renew the domain'); await p.click('#reminderSheet [data-action="remSheetDay"][data-id="1"]'); await p.waitForTimeout(100);
    check('…picking Tomorrow keeps what you typed', await p.inputValue('#rmSheetLabel')==='Renew the domain' && await p.inputValue('#rmSheetDate')==='2026-10-14');
    await p.fill('#rmSheetTime', '09:00'); await p.press('#rmSheetLabel', 'Enter'); await p.waitForTimeout(150);
    check('…Enter adds it, for tomorrow at 9', await E("JSON.stringify(state.focus.reminders.find(r => r.label==='Renew the domain'))").then(s => /"date":"2026-10-14"/.test(s) && /"time":"09:00"/.test(s)));

    // nothing to add on the pages themselves
    await E("ui.view='calendar'; renderView()"); await p.waitForTimeout(200);
    const cal = await p.evaluate(() => document.getElementById('viewRoot').innerHTML);
    check('Calendar: no add rows or + Event, no Next up', !/newAlarmLabel|cx-add\b|rm-compose|Add something|Next up/.test(cal));
    check('Calendar: Op’s read is one line, and useful (the deadline this week)', !!(await p.$('.cx-header .op-tip')) && /JJS launch edit/.test(await p.textContent('.op-tip')) && !(await p.$('.cx-op')));
    check('Calendar: days show what’s on them', /Shoot B-roll/.test(await p.textContent('.cx-d[data-date="2026-10-15"]')));
    check('Calendar: reminders and alarms share a card (reminders first when one’s due)', !!(await p.$('.cx-desk .cx-r')) && /Call Mike back/.test(await p.textContent('.cx-desk')));
    await p.click('.cx-desk [data-action="cxDesk"][data-id="alarms"]'); await p.waitForTimeout(250);
    check('…and flip to alarms (wake up, work hours, the sound)', !!(await p.$('.cx-desk .cx-al.is-wake')) && !!(await p.$('.cx-desk .cx-snd')));
    check('Calendar: the month gets the room', await p.evaluate(() => document.querySelector('.cx-month').getBoundingClientRect().width) > 700);
    await E("ui.view='today'; state.tasks.items.forEach(t => t.status='backlog'); renderView()");
    check('Today: no “+ Add Tasks for Today” button', !/Add Tasks for Today/.test(await p.evaluate(() => document.getElementById('viewRoot').innerHTML)));
    check('Today’s reminders panel: no add box', !/miniReminderLabel/.test(await E("renderRemindersMiniPanel()")));
    check('Lifecycle with no cycles: no “Create your first cycle” button', !/Create your first cycle/.test(await E("crm().cycles = []; renderLifecycleTab()")));
    check('Training skills, none yet: no add button', !/Add a training skill/.test(await E("trainingSkillsHtml()")));
    check('Finances: a client’s payment is logged, not “+ Invoice”', /Log payment/.test(await E("renderFinances()")) && !/\+ Invoice/.test(await E("renderFinances()")));
    // music volume, right on the music button
    await E("ui.view='focus'; renderView()"); await p.waitForTimeout(150);
    await p.click('#musicDock .md-vol'); await p.waitForTimeout(150);
    check('music volume: the speaker on the music button opens a slider', !!(await p.$('#musicDock .md-volpop .mvol-in')) && await p.inputValue('#musicDock .mvol-in')==='70');
    await p.fill('#musicDock .mvol-in', '35'); await p.waitForTimeout(100);
    check('…moving it sets the music volume (same setting as Settings)', Math.abs(await E("state.profile.musicVolume") - 0.35) < 0.001 && /35%/.test(await p.textContent('#musicDock .mvol-v')) && /mvol-in/.test(await E("soundSettingsHtml()")));
    await p.mouse.move(1300, 30); await p.mouse.wheel(0, -100); await p.waitForTimeout(100);
    check('…and scrolling over it nudges it', Math.abs(await E("state.profile.musicVolume") - 0.40) < 0.001);
    check('no page errors (adding)', p.errors.length===0, p.errors);
    await p.context().close();
  }

  // ---------- Business setup ----------
  {
    const p = await newPage(b, OUT+'/r32.html', seed, T);
    const E = c => p.evaluate(x => window.__op.ev(x), c);
    await E("ui.view='business'; ui.businessTab='overview'; renderView()"); await p.waitForTimeout(200);
    check('no Setup tab; a gear by the title', !(await p.$('.tab-setup')) && !(await p.$('[data-tab="setup"]')) && !!(await p.$('.view-title .biz-gear')));
    await p.click('.biz-gear'); await p.waitForTimeout(250);
    check('the gear opens one clean sheet (reach-out first)', !!(await p.$('#bizSetup:not(.hidden) .bs-nav')) && !!(await p.$('#bizSetup #setLeadCadence')));
    await p.fill('#setLeadCadence', '3'); await p.dispatchEvent('#setLeadCadence', 'change'); await p.waitForTimeout(100);
    check('…changing the cadence saves', await E("crm().leadCadenceDays")===3);
    await p.click('#bizSetup [data-action="bsTab"][data-id="msgs"]'); await p.waitForTimeout(150);
    check('Messages: a lead’s templates, flip to a client’s', !!(await p.$('#bizSetup [data-tpl="leadText"]')) && await (async () => { await p.click('#bizSetup [data-action="bsWho"][data-id="client"]'); await p.waitForTimeout(120); return !!(await p.$('#bizSetup [data-tpl="clientText"]')); })());
    await p.click('#bizSetup [data-action="bsTab"][data-id="leads"]'); await p.waitForTimeout(150);
    const ns = await E("crmStages('lead').length");
    await p.fill('#newStage-lead', 'Demo booked'); await p.press('#newStage-lead', 'Enter'); await p.waitForTimeout(250);
    check('Lead stages: type a new one and Enter adds it, the sheet stays open', await E("crmStages('lead').length")===ns + 1 && await p.$$eval('#bizSetup .bs-name', n => n.some(i => i.value==='Demo booked')) && !(await E("document.getElementById('bizSetup').classList.contains('hidden')")));
    await p.click('#bizSetup [data-action="bsTab"][data-id="cycles"]'); await p.waitForTimeout(150);
    const cy = await p.$('#bizSetup .bs-cy');
    check('Client cycles: listed, and one opens the editor', !!cy && await (async () => { await cy.click(); await p.waitForTimeout(250); return await E("overlayOpen('lifecycleOverlay')") && await E("document.getElementById('bizSetup').classList.contains('hidden')"); })());
    check('no page errors (Business setup)', p.errors.length===0, p.errors);
    await p.context().close();
  }

  // ---------- Goals: one panel ----------
  {
    const p = await newPage(b, OUT+'/r32.html', seed, T);
    const E = c => p.evaluate(x => window.__op.ev(x), c);
    await E("ui.view='personal'; ui.personalTab='goals'; renderView()"); await p.waitForTimeout(300);
    check('Goals: one card (the big ones, the week and month, yours), not stacked panels', await p.$$eval('.gx-card', n => n.length)===1 && !!(await p.$('.gx-card .mg-hero')) && !!(await p.$('.gx-card .gx-split .tg-card.is-week')) && !!(await p.$('.gx-card .gx-mine .gx-g')) && !(await p.$('.gl-sec')));
    check('…Op’s read is one line up top', !!(await p.$('.gx > .op-tip')) && !(await p.$('.gx .opi')));
    check('…your goals are rows with their numbers', /Read 12 books/.test(await p.textContent('.gx-g')) && /4/.test(await p.textContent('.gx-g .gx-g-n')));
    await p.click('.gx-g [data-action="goalStep"][data-delta="1"]'); await p.waitForTimeout(200);
    check('…+ steps it', await E("state.goals.items.find(g => g.id==='g1').current")===5);
    await p.click('.gx-g .gx-done'); await p.waitForTimeout(150);
    check('…Done asks once', /Sure\?/.test(await p.textContent('.gx-g .gx-done')));
    await p.click('.gx-g .gx-done'); await p.waitForTimeout(250);
    check('…then it’s achieved', await E("state.goals.items.find(g => g.id==='g1').done")===true);
    check('no page errors (Goals)', p.errors.length===0, p.errors);
    await p.context().close();
  }

  // ---------- Op: type or talk, any time; the journal stays; the scoreboard ----------
  {
    const p = await newPage(b, OUT+'/r32.html', seed, T);
    const E = c => p.evaluate(x => window.__op.ev(x), c);
    await E("ui.view='today'; renderView(); opfOpen({})"); await p.waitForTimeout(500);
    check('the journal button stays on Op’s screen', await p.evaluate(() => { const j = document.querySelector('.quick-journal-fab'); return !!j && getComputedStyle(j).visibility==='visible' && Number(getComputedStyle(j).zIndex) > 9400; }));
    check('his screen has the scoreboard and a status line', !!(await p.$('#opfAcc .oa-h')) && !!(await p.$('#opfStatus')));
    await E("window._cl = 0; AI.listening = true; AI.cancelListen = function(){ window._cl++; AI.listening = false; }");
    await p.mouse.click(700, 300); await p.waitForTimeout(150);
    check('starting to write while he listens lets go of the mic', await E("window._cl")===1 && await E("AI.listening")===false);
    await E("window._asked = []; window._base = aiAsk; AI.busy = true");
    await p.keyboard.type('what first?'); await p.keyboard.press('Enter'); await p.waitForTimeout(150);
    check('typing while he’s thinking waits its turn (not lost)', await E("OPQ.list.length")===1 && /yours is next/.test(await p.textContent('#opfStatus')));
    await E("AI.busy = false"); await p.waitForTimeout(900);
    check('…then it goes', await E("OPQ.list.length")===0 && await E("opChat().some(e => e.r==='me' && e.t==='what first?')"));
    await E("opfClose(); state.profile.opfMode='chat'; opfOpen({})"); await p.waitForTimeout(300);
    check('the chat has a mic of its own', !!(await p.$('.opf-prompt .opf-pmic')));
    await E("window._cl = 0; AI.listening = true; AI.cancelListen = function(){ window._cl++; AI.listening = false; }");
    await E("document.activeElement && document.activeElement.blur()"); await p.focus('#opfInput'); await p.waitForTimeout(100);
    check('…and clicking into the box lets go of the mic too', await E("window._cl")===1);
    check('no page errors (Op screen)', p.errors.length===0, p.errors);
    await p.context().close();
  }

  // ---------- Op: today's tasks are the commitment; the ask, escalation, the review ----------
  {
    const T9 = new Date(2026,9,13,9,40,0).getTime();
    const s2 = JSON.parse(JSON.stringify(seed)); s2.tasks = {items:[]};
    const p = await newPage(b, OUT+'/r32.html', s2, T9);
    const E = c => p.evaluate(x => window.__op.ev(x), c);
    await E("document.querySelectorAll('.overlay').forEach(o => o.classList.add('hidden')); OV.lastEnd = 0; AI.lastAskAt = 0; AI.lastUserAt = 0; AI.hasKey = false");
    await E("opAccTick()"); await p.waitForTimeout(400);
    const cap = await E("(document.getElementById('opBubText')||{}).textContent || ''");
    check('the morning, nothing on today’s list: he asks what’s on today', /today/i.test(cap) && /\?/.test(cap) && await E("opDay().askedAt") > 0, cap);
    await E("aiAsk('ship the JJS edit, call three leads and hit the gym', 'opBubText')"); await p.waitForTimeout(300);
    check('…adding them is Op at work: his screen shows it', await E("OPF.open") && /Added|added/.test(await E("document.getElementById('opfActs').textContent")));
    await E("opfClose()");
    check('…what you say becomes today’s tasks (once, nothing else to fill in)', await E("state.tasks.items.filter(t => t.status==='today').map(t => t.title).join('|')")==='Ship the JJS edit|Call three leads|Hit the gym', await E("state.tasks.items.map(t => t.title+':'+t.status).join('|')"));
    check('…and those are what he holds you to', await E("opCommits().map(c => c.t).join('|')")==='Ship the JJS edit|Call three leads|Hit the gym');
    check('no separate "three" tools or lists', await E("!OP_TOOLS.some(t => /commitment/.test(t.name)) && typeof opSetCommits==='undefined'"));
    await E("completeTask(state.tasks.items.find(t => t.title==='Call three leads').id)"); await p.clock.runFor(800); await p.waitForTimeout(200);
    check('…finishing a task counts', await E("opCommits().filter(c => c.done).map(c => c.t).join('|')")==='Call three leads');
    check('…he knows the list (context)', /Today’s list \(his commitments, in order\): 1\) Ship the JJS edit; 2\) Hit the gym; 3\) Call three leads \[done\]/.test(await E("aiContext()")), await E("aiContext().split('\\n').filter(l => /Today’s list/.test(l)).join('')"));
    check('…and how to hold you to it, without asking twice (system)', await E("JSON.stringify(aiSystem())").then(s => /accountability partner/.test(s) && /never make him enter anything twice/i.test(s)));
    await E("ui.view='today'; renderView()"); await p.waitForTimeout(200);
    check('Today has no separate "your three" strip', !(await p.$('.op3')));
    // a day that starts with tasks already on the list: he names the top and asks where you're starting
    await E("opDay().askedAt = 0; OV.lastEnd = 0; OV.capAt = 0; AI.lastAskAt = 0; AI.lastUserAt = 0; ui._opPressAt = 0; ui._opActiveAt = 0; opAskThree(true)"); await p.waitForTimeout(300);
    const top = await E("(document.getElementById(OV.cap)||{}).textContent || ''");
    check('…with tasks on the list: the top of it, and where are you starting', /Ship the JJS edit/.test(top) && /starting/.test(top), top);
    // ignored: firmer, then his screen
    await E("const d = opDay(); d.waitFrom = Date.now() - 26*60000; d.midAt = Date.now(); OV.lastEnd = 0; OV.capAt = 0; AI.lastAskAt = 0; AI.lastUserAt = 0; ui._opPressAt = 0; ui._opActiveAt = 0; OV.speaking = false; OV.pending = false");
    await E("opAccTick()"); await p.waitForTimeout(400);
    check('ignored for 25 minutes with no work: he comes back firmer', await E("opDay().esc")===1 && !(await E("OPF.open")));
    await p.clock.runFor(52*60000); await p.waitForTimeout(200);
    await E("const d = opDay(); d.waitFrom = Date.now() - 26*60000; OV.lastEnd = 0; OV.capAt = 0; AI.lastAskAt = 0; AI.lastUserAt = 0; ui._opPressAt = 0; ui._opActiveAt = 0; OV.speaking = false; OV.pending = false; AI.busy = false; AI.listening = false");
    await E("opAccTick()"); await p.waitForTimeout(500);
    check('…ignored again: his screen opens and he makes you choose', await E("opDay().esc")===2 && await E("OPF.open") && /lock in|what’s really going on/i.test(await E("document.getElementById('opFull').textContent")));
    await E("aiAsk('ok ok, starting now', 'opBubText')"); await p.waitForTimeout(200);
    check('…answering him resets it', await E("opDay().esc")===0 && await E("opDay().waitFrom")===0);
    await E("opAccDraw()"); await p.waitForTimeout(150);
    check('the scoreboard: up next from your tasks, deep work, kept this week', (await p.$$('#opfAcc .oa-c')).length===2 && /1 of 3 done/.test(await p.textContent('#opfAcc')) && /Deep work/i.test(await p.textContent('#opfAcc')) && /Kept this week/i.test(await p.textContent('#opfAcc')));
    await p.click('#opfAcc .oa-c .oa-tick'); await p.clock.runFor(800); await p.waitForTimeout(300);
    check('…tick one off right there (it’s the task)', await E("state.tasks.items.find(t => t.title==='Ship the JJS edit').status")==='done' && /2 of 3 done/.test(await p.textContent('#opfAcc')));
    // the evening review
    await E("opfClose(); opDay().waitFrom = 0; opDay().midAt = Date.now()");
    await p.clock.setSystemTime(new Date(2026,9,13,19,20,0)); await p.waitForTimeout(100);
    await E("OV.lastEnd = 0; OV.capAt = 0; AI.lastAskAt = 0; AI.lastUserAt = 0; ui._opPressAt = 0; ui._opActiveAt = 0; OV.speaking = false; OV.pending = false; AI.busy = false; AI.listening = false; opAccTick()"); await p.waitForTimeout(400);
    const rv = await E("(document.getElementById(OV.cap)||{}).textContent || ''");
    check('the end of the day: he goes through it and asks about what you missed', await E("opDay().reviewAt") > 0 && /2 of 3/.test(rv) && /Hit the gym/.test(rv), rv);
    check('…and it goes on the record (kept this week)', await E("JSON.stringify(state.focus.opDays)").then(s => /"made":3,"kept":2/.test(s)));
    // never while asleep
    await E("opDay().reviewAt = 0; startMode('offtime', {sleep:true, note:'Sleep'}); OV.lastEnd = 0; AI.lastAskAt = 0; AI.lastUserAt = 0");
    check('quiet while you sleep', await E("opCanSpeakUp()")===false);
    check('no page errors (accountability)', p.errors.length===0, p.errors);
    await p.context().close();
  }

  await b.close();
  process.exit(report() ? 1 : 0);
})();
