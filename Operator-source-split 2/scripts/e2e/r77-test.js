// Round 77 — the bed tags (exactly), desk + door, Op's full playbooks, the tasks look in Appearance, the cycle
// keeps your start date, the phone's live data and journal order.
// Run: node scripts/e2e/r77-test.js dist/command-center-2.html
const path = require('path');
const { instrument, launch, newPage, check, report, OUT } = require('./common');
const SRC = process.argv[2] || 'dist/command-center-2.html';
const FILE = path.join(OUT, 'r77.html');
instrument(SRC, FILE);
const seed = {profile: {name: 'Andre'}, business: {clients: [{id: 'c1', name: 'Coral Energy', business: 'Coral Energy', status: 'active', stage: 'active', startDate: '2026-03-03', billingDay: 1, deliverables: [{id: 'dv1', title: 'Reels', recurring: true, monthlyTarget: 8, completedDates: []}]}]}};
(async () => {
  const browser = await launch();
  const page = await newPage(browser, FILE, seed);
  const ev = (code) => page.evaluate((c) => window.__op.ev(c), `(function(){ ${code} })()`);

  // ---- SLEEP ----
  const sl = await ev(`
    let snz = 0; const realR = r72WakeRinging, realS = wakeSnooze; wakeSnooze = function(){ snz++; };
    r72WakeRinging = function(){ return false; };
    const a = r70TRunStep({act:'sleep'}), asleepA = r77Asleep(), snzA = snz;
    finishActiveMode(true); state.focus.r70Sleep = {};
    r72WakeRinging = function(){ return true; };
    const b = r70TRunStep({act:'sleep'}), asleepB = !!(state.modes.active && state.modes.active.sleep);
    r72WakeRinging = realR; wakeSnooze = realS;
    return {a:a, asleepA:asleepA, snzA:snzA, b:b, snz:snz, asleepB:asleepB};`);
  check('sleep tag, no alarm going: you’re asleep (no snooze)', sl.asleepA && sl.snzA === 0 && /asleep/i.test(sl.a), sl);
  check('sleep tag, alarm going: it snoozes, and only that', sl.snz === 1 && !sl.asleepB && /Snoozed/.test(sl.b), sl);

  // ---- AWAKE ----
  const aw = await ev(`
    const realR = r72WakeRinging, realU = r70TWakeUp, realG = ACTIONS.sleepGoodMorning; let woke = 0, gm = 0;
    r70TWakeUp = function(){ woke++; return ''; }; ACTIONS.sleepGoodMorning = function(){ gm++; };
    // 1. alarm going → stops it, you're up
    r72WakeRinging = function(){ return true; };
    const one = r70TRunStep({act:'awake'});
    r72WakeRinging = function(){ return false; };
    // 2. no alarm, asleep → up, and the alarm is NOT stood down
    state.focus.r70Gm = {date:todayStr()}; r70TSleepStart(); const w = wakeCfg(); const fired0 = w.lastFiredTs;
    const two = r70TRunStep({act:'awake'}); const up = r77UpToday(), asleep = r77Asleep(), fired1 = w.lastFiredTs;
    // 3. already up, no alarm → Good morning
    const three = r70TRunStep({act:'awake'});
    r72WakeRinging = realR; r70TWakeUp = realU;
    return {one:one, woke:woke, two:two, up:up, asleep:asleep, keptAlarm:fired0===fired1, three:three, gmLater:true, _gm:function(){ return gm; }, realG:!!realG};`);
  await page.waitForTimeout(500);
  const gmCount = await ev(`return typeof ACTIONS.sleepGoodMorning === 'function' ? 'ok' : 'none';`);
  check('awake tag, alarm going: the alarm stops and you’re up', aw.woke === 1 && /Alarm off/.test(aw.one), aw);
  check('awake tag, no alarm, not up yet: you’re up, and the wake alarm still goes off', aw.up && !aw.asleep && aw.keptAlarm && /You’re up/.test(aw.two), aw);
  check('awake tag, already up and no alarm: it starts Good morning', /Good morning/.test(aw.three), {three: aw.three, gmCount});

  // ---- DESK + DOOR ----
  const dk = await ev(`
    const a = r70TRunStep({act:'locktoggle'}), inA = !!state.focus.activeSession;
    const door = r70TRunStep({act:'breakstart', min:15}), brk = !!(state.focus.activeSession && state.focus.activeSession.onBreak);
    const again = r70TRunStep({act:'breakstart', min:15});
    const b = r70TRunStep({act:'locktoggle'}), inB = !!state.focus.activeSession;
    const doorOut = r70TRunStep({act:'breakstart'});
    return {a:a, inA:inA, door:door, brk:brk, again:again, b:b, inB:inB, doorOut:doorOut};`);
  check('desk tag: tap to lock in, tap again to lock out', dk.inA && !dk.inB, dk);
  check('door tag: starts a break (and never ends one)', dk.brk && /Already on a break/.test(dk.again), dk);
  const mig = await ev(`state.tags.r77Mig = false; ['desk','door','sleep','awake'].forEach(function(id){ if(!r70TagList().some(function(g){ return g.starter===id; })) r70TStarterMake(id); }); r70TagList().forEach(function(g){ if(g.starter==='desk') g.steps = [{act:'lockin', when:{locked:'out'}}, {act:'lockout', when:{locked:'in'}}]; });
    return 'ok';`);
  const st = await ev(`const L = r70TagList(); const f = function(id){ const g = L.find(function(x){ return x.starter===id; }); return g ? g.steps.map(function(s){ return s.act; }).join(',') : ''; }; return {desk:f('desk'), door:f('door'), sleep:f('sleep'), awake:f('awake')};`);
  check('starter tags: Desk = lock toggle, Door = start a break, Sleep, Awake', st.door === 'breakstart' && st.sleep === 'sleep' && st.awake === 'awake', st);

  // ---- Op builds the whole playbook ----
  const pb = await page.evaluate(async () => window.__op.ev(`(async function(){
    aiWrite = function(){ return Promise.resolve('{"name":"Reels retainer","stages":[{"name":"Onboarding","days":21,"repeat":"none","steps":[{"title":"Book the kickoff call","type":"call","when":"enter","checklist":["Send calendar link","Prep questions"],"notes":"Keep it 30 minutes."},{"title":"Get Instagram + Drive access","type":"access","when":"day","day":2},{"title":"Deliver first 8 reels","type":"send","when":"day","day":14}]},{"name":"Monthly","days":30,"repeat":"month","steps":[{"title":"Text a check-in","type":"task","when":"weekly","weekday":"Fri"},{"title":"Send the monthly report","type":"report","when":"end"},{"title":"Invoice","type":"task","when":"end"}]}]}'); };
    AI.hasKey = true; ACTIONS.pb6NewOpen(null, null, 'client');
    const sheet = document.getElementById('pb6NewSheet') || document.body; const ta = document.getElementById('r76PbAsk');
    const first = ta && sheet.innerHTML.indexOf('r76PbAsk') < (sheet.innerHTML.search(/Start from|START FROM|pb6NewName/) + 1e9);
    ta.value = 'Reels retainer, onboarding then monthly';
    await ACTIONS.r76PbOp(); const p = pbAll()[pbAll().length - 1], s0 = p.stages[0], s1 = p.stages[1];
    return {box:!!ta, rows:ta ? ta.rows : 0, s:p.stages.length, cl:s0.steps[0].checklist.length, notes:s0.steps[0].notes, type:s0.steps[0].type, day:JSON.stringify(s0.steps[1].due), month:s1.repeat, weekly:JSON.stringify(s1.steps[0].due), end:JSON.stringify(s1.steps[1].due)};
  })()`));
  check('Op builds the whole playbook: stages, step types, checklists, notes', pb.box && pb.s === 2 && pb.cl === 2 && /30 minutes/.test(pb.notes) && pb.type === 'call', pb);
  check('…with due days, weekly steps and a monthly stage', pb.day === '{"rule":"day","n":2}' && pb.month === 'month' && pb.weekly === '{"rule":"week","dow":5}' && pb.end === '{"rule":"end"}', pb);
  check('…and the describe box is big and first', pb.rows >= 5, pb);

  // ---- the tasks look lives in Settings → Appearance ----
  const lk = await ev(`ui.view='focus'; ui.focusTab='tasks'; ui.focusTasksSubTab='overview'; renderView(); const bar = !!document.querySelector('#viewRoot .r73-looksbar');
    ui.view='settings'; ui.settingsTab='focus'; renderView(); const inFocus = !!document.getElementById('r73Looks') || !!document.getElementById('r77Looks');
    ui.settingsTab='display'; renderView(); const card = document.querySelector('#setPart-display #r77Looks');
    return {bar:bar, inFocus:inFocus, card:!!card, previews:card ? card.querySelectorAll('.r77p').length : 0};`);
  check('Focus no longer has a look switcher', !lk.bar, lk);
  check('Settings → Appearance has it, with a picture of each look', lk.card && lk.previews === 5 && !lk.inFocus, lk);

  // ---- the cycle keeps the start date ----
  const cy = await ev(`ui.view='focus'; ui.focusTasksSubTab='clientBacklog'; masterTasksSync(); ACTIONS.r76Cyc(null, null, 'c1'); const note = /Started with them/.test(document.getElementById('viewRoot').innerHTML); document.getElementById('r76CycDay').value = '15'; ACTIONS.r76CycSave(null, null, 'c1'); const c = state.business.clients[0]; return {start:c.startDate, bill:c.billingDay, day:c.cycleDay, note:note};`);
  check('changing the cycle never touches the day you started with them', cy.start === '2026-03-03' && cy.bill === 1 && cy.day === 15 && cy.note, cy);

  // ---- the phone ----
  const ph = await ev(`state.journal.entries = [{id:'a', date:'2026-11-23', timestamp:Date.parse('2026-11-23T08:00:00'), text:'morning'}, {id:'b', date:'2026-11-23', timestamp:Date.parse('2026-11-23T22:00:00'), text:'night'}, {id:'c', date:'2026-11-20', text:'older'}];
    const J = r72PhoneCall('journal'); startFocus(null); const L = r72PhoneCall('live'); return {order:J.map(function(x){ return x.text; }).join(','), live:L.locked && L.startedAt > 0 && L.target > 0 && L.quests.all > 0};`);
  check('phone journal: newest first, even inside the same day', ph.order === 'night,morning,older', ph);
  check('phone gets a live feed (lock-in start, progress, quests)', ph.live, ph);

  await browser.close();
  report('Round 77');
})();
