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
    check('…and flip to alarms (wake up, work hours, every other alarm in the same card style)', !!(await p.$('.cx-desk .cx-al.is-wake')) && (await p.$$('.cx-desk .cx-al.is-other')).length >= 1 && !(await p.isVisible('.cx-desk .cx-snd')) && !(await p.isVisible('.cx-desk .cx-gm')));
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
    check('no Setup tab; a gear by the title', !(await p.$('.tab-setup')) && !(await p.$('[data-tab="setup"]')) && !!(await p.$('.biz-tabs .biz-gear')));   // (round 36: on the tab lane)
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
    await E("document.activeElement && document.activeElement.blur()"); await p.keyboard.press('w'); await p.waitForTimeout(150);
    check('starting to write while he listens lets go of the mic', await E("window._cl")===1 && await E("AI.listening")===false);
    await E("window._asked = []; window._base = aiAsk; AI.busy = true");
    await p.keyboard.type('hat first?'); await p.fill('#opfInput', 'what first?'); await p.keyboard.press('Enter'); await p.waitForTimeout(150);
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
    check('…adding them is Op at work: a notice says so (r36: his screen doesn’t pop up)', !(await E("OPF.open")) && /Added|added/.test(await p.textContent('#toastContainer')));
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

  // ---------- round 33 ----------
  {
    const p = await newPage(b, OUT+'/r32.html', seed, T);
    const E = c => p.evaluate(x => window.__op.ev(x), c);
    await E("ui.view='today'; renderView(); opfOpen({})"); await p.waitForTimeout(500);
    const jb = await p.evaluate(() => { const r = document.querySelector('.quick-journal-fab').getBoundingClientRect(); return [r.x + r.width/2, r.y + r.height/2]; });
    await p.mouse.click(jb[0], jb[1]); await p.waitForTimeout(500);
    check('r33: the journal button works on Op’s screen (its window comes up on top)', await p.evaluate(() => { const c = document.getElementById('quickJournalContent'), r = c.getBoundingClientRect(), t = document.elementFromPoint(r.x + r.width/2, r.y + 30); return !!(t && t.closest('#quickJournalOverlay')); }));
    await E("document.querySelectorAll('.overlay').forEach(o => o.classList.add('hidden')); opfClose(); ui.view='calendar'; renderView()"); await p.waitForTimeout(300);
    check('r33: the Calendar page doesn’t scroll', await p.evaluate(() => { const m = document.querySelector('main') || document.scrollingElement; return m.scrollHeight <= m.clientHeight + 1 || getComputedStyle(m).overflowY==='hidden'; }));
    check('r33: the Calendar clock is a style you can change (Ring first)', !!(await p.$('.cx-now .ck.ck-ring')));
    await p.click('.cx-now .ck'); await p.waitForTimeout(200);
    check('r33: tap it: the next style (Minutes), saved', !!(await p.$('.cx-now .ck.ck-minutes')) && await E("state.profile.clockStyle")==='minutes');
    check('r33: six styles to pick in Settings, and a Clock panel for Today', /ck-picks/.test(await E("soundSettingsHtml()")) && (await E("soundSettingsHtml()")).match(/data-action="clockSet"/g).length===7 && (await E("soundSettingsHtml()")).match(/data-action="timerSet"/g).length===6 && /ck-big/.test(await E("PANEL_RENDERERS.clock()")));
    await E("state.focus.alarms.push({id:'am', time:'15:30', label:'Meds', emoji:'💊', days:[0,1,2,3,4,5,6], enabled:true}); ui.cxDesk='alarms'; renderView()"); await p.waitForTimeout(200);
    check('r33: an alarm you add looks like the masters (its emoji, the time, a switch)', /💊/.test(await p.textContent('.cx-al.is-other .cx-al-i')) && !!(await p.$('.cx-al.is-other .cx-switch')) && !(await p.isVisible('.cx-gm')) && !(await p.isVisible('.cx-snd')));
    await p.click('.cx-al.is-other .cx-switch'); await p.waitForTimeout(150);
    check('r33: …its switch turns it off', await E("state.focus.alarms.find(a => a.id==='am').enabled")===false);
    await E("openAlarmSheet()"); await p.waitForTimeout(150);
    check('r33: a new alarm picks an emoji', (await p.$$('#alarmSheet .al-emo .as-chip')).length >= 8);
    check('r33: the activity pill is white and wears Op’s color', await p.evaluate(() => { const el = document.querySelector('.activity-pill'); if (!el) return true; const cs = getComputedStyle(el); return /gradient/.test(cs.backgroundImage) && cs.zIndex==='9540'; }));
    // ---------- round 34 ----------
    await E("document.querySelectorAll('.overlay').forEach(o => o.classList.add('hidden')); state.profile.businessName='Flicz Media'; ui.view='today'; renderView()"); await p.waitForTimeout(300);
    check('r34: the hero is the business name, then a line from Op', (await p.textContent('.th-biz'))==='Flicz Media' && (await p.textContent('.th-op-t')).length > 5 && !(await p.$('.th-greet')));
    check('r35: the streak, this week (seven circles, Monday first), deep work and tasks are one row under the hero', !(await p.$('.today-hero .sw')) && (await p.$$('.sw-wrap .sw.is-row .sw-day')).length===7 && !!(await p.$('.sw-wrap .swt')) && await E("weekWork().days[0].d===startOfWeekStr(todayStr())") && !(await p.$('.tw-chip')));
    check('r34: time worked this week is the same number as the This week panel', await E("weekWork().total===(function(){ let t=0; for(let i=0;i<7;i++){ const d=addDays(startOfWeekStr(todayStr()), i); t += d===todayStr() ? deepWorkMinutesTodayLive() : d<todayStr() ? deepWorkMinutesFor(d) : 0; } return t; })()"));
    check('r34: the weather bar sits under the card and spans it', await p.evaluate(() => { const w = document.querySelector('.th-wx .skyp'), c = document.querySelector('.th-op'); if(!w) return true; const a = w.getBoundingClientRect(), b = c.getBoundingClientRect(), l = document.querySelector('.th-left').getBoundingClientRect(); return a.top >= b.bottom - 1 && a.width >= l.width - 8; }));
    check('r34: Settings has the two locked-in views', ((await E("soundSettingsHtml()")).match(/data-action="lockedStyleSet"/g)||[]).length===2);
    await E("state.profile.lockedStyle='cockpit'; state.profile.lockedView='minimal'; startFocus(50); ui.view='today'; renderView()"); await p.waitForTimeout(300);
    check('r34: the Cockpit locked-in view: timer, task, the day (r37: one panel)', !!(await p.$('.np.is-cockpit .ckx .ckx-face .tm')) && !!(await p.$('.np.is-cockpit .ckx .ckx-title')) && !!(await p.$('.np.is-cockpit .ckx .ckd .ckd-week')));
    await E("state.profile.lockedView='full'; state.appActivity.todayIntervals.push({app:'Final Cut Pro', start:Date.now()-60000, end:Date.now()}); ui.view='today'; renderView(); updateActivityPill()"); await p.waitForTimeout(200);
    check('r36: the Op bar: one status dot and the app', !!(await p.$('#activityPill .ob-dot')) && /Final Cut Pro/.test(await p.textContent('#activityPill .ap-name')));
    await p.click('#activityPill .ap-name'); await p.waitForTimeout(300);
    check('r34: …and tapping it still opens its menu, on top', await p.evaluate(() => { const m = document.getElementById('activityPillMenu'); if(!m) return false; const r = m.getBoundingClientRect(), t = document.elementFromPoint(r.x + r.width/2, r.y + 20); return !!(t && t.closest('#activityPillMenu')); }));
    // ---------- round 34: auto lock-in and XP ----------
    await E("if(state.focus.activeSession){ state.focus.activeSession=null; } state.focus.lastManualStopAt=null; state.focus.lastSessionEndedAt=null; state.focus.autoRejectedAt=null; state.modes.active=null; ui.view='today'; renderView()");
    const ivs = (spec) => E("(function(){ const now=Date.now(); let t=now; const out=[]; "+JSON.stringify(spec)+".slice().reverse().forEach(function(x){ out.unshift({app:x[0], start:t-x[1]*60000, end:t}); t-=x[1]*60000+5000; }); state.appActivity.todayIntervals=out; autoLockInMeta={app:null,intervalStart:null}; checkAutoLockIn(); return !!state.focus.activeSession; })()");
    check('r34 auto: ten minutes in Finder and a minute in Final Cut doesn’t lock you in', await ivs([['Finder', 11], ['Final Cut Pro', 1]])===false);
    check('r34 auto: a few blips on a work app between other things doesn’t either', await ivs([['Final Cut Pro', 4], ['Finder', 4], ['Final Cut Pro', 3], ['Finder', 4], ['Final Cut Pro', 1]])===false);
    check('r34 auto: a steady 14 minutes in Final Cut does', await ivs([['Final Cut Pro', 14]])===true);
    await E("ACTIONS.autoLockReject()");
    check('r34 auto: “Not working” throws it away and it waits', await E("!state.focus.activeSession && autoLockInBlockedReason()==='rejected'") && await ivs([['Final Cut Pro', 20]])===false);
    await E("state.focus.autoRejectedAt=null; xpLast=null");
    const x0 = await E("xpLast=null; xpSummary().total");
    await E("state.focus.sessions.push({id:'au1', type:'deep', date:todayStr(), startedAt:Date.now()-3*3600000, endedAt:Date.now()-3600000, minutes:120, auto:true, reviewed:false}); xpLast=null; dwTodayCache=null");
    check('r35 xp: a session pays as soon as it’s logged', await E("xpSummary().total") > x0);
    await E("state.focus.sessions.find(s=>s.id==='au1').reviewed=true; xpLast=null; dwTodayCache=null");
    const x1 = await E("xpSummary().total");
    check('r35 xp: keeping it changes nothing', x1 > x0);
    await E("ui.recapDate=todayStr(); ACTIONS.recapDiscard(null, null, 'au1')");
    check('r35 xp: throw it out and the XP rewinds', await E("xpLast=null; dwTodayCache=null; xpSummary().total")===x0);
    // ---------- round 35 ----------
    await E("state.focus.lastSessionEndedAt=null; state.focus.lastManualStopAt=null; state.focus.autoRejectedAt=null");
    check('r35 auto: time in Firefox or Operator never starts a session', await ivs([['firefox', 20], ['Operator', 10], ['Final Cut Pro', 1]])===false);
    check('r35 auto: work minutes add up across quick switches', await ivs([['Final Cut Pro', 5], ['Finder', 1], ['Final Cut Pro', 4], ['firefox', 2], ['Final Cut Pro', 4]])===true);
    await E("state.focus.activeSession=null; state.focus.lastSessionEndedAt=null; autoLockInMeta={app:null,intervalStart:null}");
    // a session you started: no work apps for 11 minutes (just sitting in Operator) and it stops where the work did
    const ended = await E("(function(){ const now=Date.now(); startFocus(null); const s=state.focus.activeSession; s.startedAt=now-40*60000; state.appActivity.todayIntervals=[{app:'Final Cut Pro', start:now-40*60000, end:now-11*60000}, {app:'Operator', start:now-11*60000+5000, end:now}]; lastRawSampleAt=now; checkAwayFromSession(); const last=state.focus.sessions[state.focus.sessions.length-1]; return JSON.stringify({active:!!state.focus.activeSession, min:last && last.minutes}); })()");
    check('r35 auto lock-out: nothing on work apps for a while ends the session where the work stopped', JSON.parse(ended).active===false && JSON.parse(ended).min===29, ended);
    await E("startMode('offtime',{clockedOut:true}); ui.restFull=true; openWindDown('alarm')"); await p.waitForTimeout(200);
    check('r35: the end of the wind-down is just Done', !(await p.$('#windOverlay [data-action="windGoToSleep"]')) && !!(await p.$('#windOverlay [data-action="windDone"]')));
    await E("ACTIONS.windDone()"); await p.waitForTimeout(500);
    check('r35: That’s the day: the sleep button sits where Tomorrow was', !!(await p.$('.dayoff-row [data-action="startSleepMode"]')) && !(await p.$('.dayoff-row [data-step="alarm"]')));
    await p.click('.dayoff-row [data-action="startSleepMode"]'); await p.waitForTimeout(700);
    check('r35: …and it puts you to sleep (the sleep screen)', !!(await p.$('.sleepv')) && await E("!!(state.modes.active && state.modes.active.sleep)"));
    check('r35: the change goes through the dark veil and it clears', !(await p.$('.fs-veil')));
    // ---------- round 36 ----------
    await E("if(state.modes.active) finishActiveMode(true); state.focus.activeSession=null; document.querySelectorAll('.overlay').forEach(o=>o.classList.add('hidden')); state.profile.opMemory=[{id:'m1',text:'Likes the China stuff'},{id:'m2',text:'The + should ask first'}]; ui.view='settings'; ui.settingsTab='operator'; renderView()"); await p.waitForTimeout(300);
    check('r36: forgetting Op’s memory isn’t a button by the list anymore', !(await p.$('[data-action="opMemClear"]')) && !!(await p.$('.op-danger [data-action="opMemClearAsk"]')));
    await E("ACTIONS.opMemClearAsk()"); await p.waitForTimeout(100);
    check('r36: …it asks you to type FORGET (Erase stays off till you do)', await p.evaluate(() => document.querySelector('#opForget [data-action="opMemClearDo"]').disabled===true));
    await p.fill('#opForgetIn', 'forget'); await p.click('#opForget [data-action="opMemClearDo"]'); await p.waitForTimeout(150);
    check('r36: …and only then it’s gone', await E("state.profile.opMemory.length")===0);
    await E("state.profile.opMemory=[{id:'m3',text:'Weekly client check-ins should be a task'}]; renderView()"); await p.waitForTimeout(100);
    await E("ACTIONS.opMemToApp(null,null,'m3')");
    check('r36: a memory about the app moves to Op’s ideas for the app', await E("state.profile.opMemory.length")===0 && /Weekly client check-ins/.test(await E("JSON.stringify(state.settings.opIdeas)")));
    // master tasks
    await E("state.business.clients=[{id:'c1',name:'JJS',stage:'active',status:'active',mrr:3000,touches:[],createdAt:addDays(todayStr(),-20),deliverables:[{id:'d1',title:'Reels',weeklyTarget:2,recurring:true,completedDates:[]}]},{id:'c2',name:'Kiko',stage:'active',status:'active',mrr:2000,touches:[],createdAt:addDays(todayStr(),-20)}]; state.focus.masterMade={}; state.tasks.items=state.tasks.items.filter(t=>!t.master); ui.view='today'; renderView(); renderView()"); await p.waitForTimeout(200);
    check('r36→r38: master tasks: the deliverable split into four weeks, and Reach out to clients while someone’s due', await E("JSON.stringify(state.tasks.items.filter(t=>t.master).map(t=>t.master.kind).sort())")==='["dvw","dvw","dvw","dvw","reach"]');
    await E("logTouch('client','c1'); renderView()"); await p.waitForTimeout(100);
    check('r36→r38: …a touch takes that client off the Reach out task', JSON.stringify(await E("state.tasks.items.find(t=>t.master&&t.master.kind==='reach'&&t.status!=='done').clients"))==='["c2"]');
    await E("completeTask(state.tasks.items.find(t=>t.master&&t.master.kind==='reach'&&t.status!=='done').id)"); await p.waitForTimeout(900);
    check('r36: …finishing Reach out logs a touch for whoever’s tagged', await E("state.business.clients.find(c=>c.id==='c2').touches.length")===1);
    check('r36: …and it rolls up into a master goal ring', await E("!!masterGoalDefs().find(m=>m.key==='care')"));
    // standing with Op, test bench, Business tabs
    check('r36: standing with Op is a Discipline sub-stat', await E("xpAttributes(xpCtx()).DIS.subs.some(s=>s.label==='Standing')"));
    await E("ui.view='business'; ui.businessTab='leads'; renderView()"); await p.waitForTimeout(150);
    check('r36: Business: Clients & leads is one tab with sub-tabs, Setup on the tab lane', (await p.$$('.biz-tabs > .tab')).length===4 && (await p.$$('.biz-tabs .subtab')).length===4 && !!(await p.$('.biz-tabs [data-action="bizSetupOpen"]')));
    await E("state.settings.testMode=false; ui.view='settings'; ui.settingsTab='system'; renderView()"); await p.waitForTimeout(150);
    check('r36: test buttons hide unless test mode is on', !(await p.isVisible('[data-action="wakeTestNow"]:not(.tb)')) && !!(await p.$('[data-action="demoToggle"]')));
    // clock-out pages
    await E("startMode('offtime',{clockedOut:true}); ui.restFull=true; ui.view='today'; renderView()"); await p.waitForTimeout(300);
    check('r36: That’s the day: three real buttons and a swipeable deck', (await p.$$('.dayoff-row.is-btns button')).length===3 && !!(await p.$('.rd .rd-slide')));
    await E("ACTIONS.startSleepMode()"); await p.waitForTimeout(300); await E("ACTIONS.sleepUp()"); await p.waitForTimeout(600);
    check('r36: I’m up → Up early (not That’s the day, not the sleep screen)', /Up early/.test(await p.textContent('#viewRoot')) && !/That’s the day/.test(await p.textContent('#viewRoot')) && !(await p.$('.sleepv')));
    check('r36/r38: the Op bar is Op | dot | app (no clock); top right is just level + music', !(await p.$('#activityPill .ap-ck')) && !!(await p.$('#activityPill .ob-dot')) && !(await p.$('#musicDock .md-time')) && !!(await p.$('#musicDock')));
    // the Op bar's Work / Not work drives auto lock-in
    await E("if(state.modes.active) endMode(); state.modes.lastEndedAt=null; state.focus.activeSession=null; state.focus.autoRejectedAt=null; state.focus.lastSessionEndedAt=null; state.focus.lastManualStopAt=null; ui.restFull=false; ui.view='today'; renderView(); state.appActivity.todayIntervals.push({app:'Pixelmator Pro', start:Date.now()-20*60000, end:Date.now()}); ui.pillMenu=null; updateActivityPill()"); await p.waitForTimeout(150);
    check('r36: an unsorted app asks "Work?" on the bar', !!(await p.$('#activityPill .ap-ask')));
    await E("ACTIONS.activityPillMenu()"); await p.waitForTimeout(100);
    await p.click('#activityPillMenu [data-action="pillSetCat"][data-id="work"]'); await p.waitForTimeout(200);
    check('r36: marking it Work locks you in right away (the time was already there)', await E("!!(state.focus.activeSession && state.focus.activeSession.autoStarted)"));
    const nSess = await E("state.focus.sessions.length");
    await p.click('#activityPillMenu [data-action="pillSetCat"][data-id="other"]'); await p.waitForTimeout(200);
    check('r36: …marking it Not work throws that session out (no session, no XP)', await E("!state.focus.activeSession && state.focus.sessions.length")===nSess);
    // in an automatic session, an app you haven't sorted gets asked about (instead of the session just ending)
    await E("ui.pillMenu=null; renderPillMenu(); ACTIONS.pillLockNow(); state.appActivity.todayIntervals.push({app:'Affinity Photo', start:Date.now()-70000, end:Date.now()}); unsortedNudge()"); await p.waitForTimeout(150);
    check('r36: in an auto session, an unsorted app gets asked about', /Affinity Photo work\?/.test(await p.textContent('#toastContainer')));
    await p.click('#toastContainer [data-action="sortAsWork"]'); await p.waitForTimeout(150);
    check('r36: …"It’s work" sorts it and the session keeps going', await E("activityCategory('Affinity Photo')")==='work' && await E("!!(state.focus.activeSession && state.focus.activeSession.autoStarted)"));
    check('no page errors (round 33)', p.errors.length===0, p.errors);
    await p.context().close();
  }

  await b.close();
  process.exit(report() ? 1 : 0);
})();
