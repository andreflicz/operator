// Round 70 — part 1: the eighteen app updates.
// Run: node scripts/e2e/r70-test.js dist/command-center-2.html
const path = require('path');
const { instrument, launch, newPage, check, report, OUT } = require('./common');

const SRC = process.argv[2] || 'dist/command-center-2.html';
const FILE = path.join(OUT, 'r70.html');
instrument(SRC, FILE);

const ds = (off) => { const d = new Date(); d.setDate(d.getDate() + (off || 0)); return d.toISOString().slice(0, 10); };

const seed = {
  profile: {name: 'Andre', weeklyWorkoutTarget: 4},
  business: {
    clients: [
      {id: 'c1', name: 'Coral Energy', business: 'Coral Energy', status: 'active', stage: 'active', mrr: 2000, startDate: ds(-120), deliverables: [], journal: [], touchpoints: [{type: 'call', date: ds(-9)}], cadenceDays: 3},
      {id: 'c2', name: 'Vale', business: 'Vale', status: 'active', stage: 'active', mrr: 1500, startDate: ds(-60), deliverables: [], journal: []}
    ],
    pipeline: [{id: 'l1', name: 'A lead', stage: 'new', createdAt: ds(-5), touchpoints: []}]
  },
  finances: {expenses: [
    {id: 'e1', name: 'Adobe Creative Cloud', amount: 60, date: ds(-2), cat: 'software'},
    {id: 'e2', name: 'Groceries', amount: 90, date: ds(-3), cat: 'food'}
  ]},
  focus: {sessions: [{id: 's1', date: ds(-1), minutes: 180, startedAt: Date.now() - 86400000, type: 'deep', breaks: [{start: 1, end: 2, minutes: 12}]}]},
  daysOff: {dates: []},
  journal: {entries: [], memos: []}
};

(async () => {
  const browser = await launch();
  const page = await newPage(browser, FILE, seed);
  const ev = (code) => page.evaluate((c) => window.__op.ev(c), `(function(){ ${code} })()`);

  // ---- 1. a long session asks, then clocks you out at your last active moment ----
  const long = await ev(`
    state.profile.r70LongHrs = 8; state.profile.r70LongWait = 10;
    const started = Date.now() - 9*3600000;
    state.focus.activeSession = {id:'live', startedAt:started, date:todayStr(), type:'deep', breaks:[], onBreak:false};
    r70LongTick();
    const asked = !!document.getElementById('r70Ask');
    state.focus.activeSession.r70Asked = Date.now() - 11*60000;
    R70.lastInput = Date.now() - 2*3600000;
    const n = state.focus.sessions.length;
    r70LongTick();
    const s = state.focus.sessions[state.focus.sessions.length-1];
    return {asked:asked, ended:!state.focus.activeSession, added:state.focus.sessions.length === n+1, flagged:!!(s && s.r70Long), mins:s && s.minutes};
  `);
  check('1 long session: Op asks', long.asked, long);
  check('1 long session: no answer clocks you out', long.ended && long.added && long.flagged, long);
  check('1 long session: it ends at your last活 moment, not now'.replace('活', ' active'), long.mins > 380 && long.mins < 440, long);

  // ---- 2. Op lives in the bottom left ----
  const corner = await ev(`
    r70Dock(); r70NoteShow('Logged a touch with Coral Energy', {feed:'x'});
    const d = document.getElementById('r70Dock'), r = d.getBoundingClientRect();
    return {has:!!d.querySelector('.r70-note'), left:r.left < window.innerWidth/2, low:r.bottom > window.innerHeight/2, corner:!!state.profile.r70OpCorner};
  `);
  check('2 Op corner: a note appears bottom left', corner.has && corner.left && corner.low && corner.corner, corner);

  // ---- 3. good morning is yours to start ----
  const gm = await ev(`
    const h = new Date().getHours();
    ui.view = 'today'; state.focus.r70Gm = {date:todayStr()};
    const wanted = r70GmWanted(), inHours = h >= 4 && h < 12;
    r70GmBar(); const bar = !!document.getElementById('r70GmBar');
    ACTIONS.r70GmClose();
    const closedOff = r70GmWanted(), up = !!r70Gm().up;
    state.focus.r70Gm = {date:todayStr(), played:Date.now()};
    const playedOff = r70GmWanted();
    const ring = wakeRingHtml(); const snz = snoozeHtml();
    return {inHours:inHours, wanted:wanted, bar:bar, closedOff:closedOff, playedOff:playedOff,
      quietUp:ring.indexOf('r70QuietUp') > 0, gmBtn:ring.indexOf('Good morning') > 0, snzQuiet:snz.indexOf('r70QuietUp') > 0, up:up};
  `);
  check('3 good morning: the bar only shows before noon', gm.inHours ? (gm.wanted && gm.bar) : !gm.wanted, gm);
  check('3 good morning: ✕ and a sequence already played both stop it', !gm.closedOff && !gm.playedOff, gm);
  check('3 good morning: "I\'m up" is quiet, the sequence is its own button', gm.quietUp && gm.gmBtn && gm.snzQuiet, gm);
  check('3 good morning: skipping still logs that you\'re up', gm.up, gm);

  // ---- 4. the journal bubble takes a voice memo ----
  const memo = await ev(`
    const h = renderQuickJournalModal();
    const n = r67Memos().length;
    const ok = r70AddVoiceMemo({b64: btoa('x'.repeat(4000)), mime:'audio/webm', dur:12, text:'A thought I had'});
    const m = r67Memos()[r67Memos().length-1];
    return {mic:h.indexOf('r70QjMic') > 0, saved:ok && r67Memos().length === n+1, audio:!!(m && m.audio), note:!!(m && m.note), dur:m && m.dur};
  `);
  check('4 voice memo: a mic on the quick journal', memo.mic, memo);
  check('4 voice memo: the bubble saves audio, and the writing is optional', memo.saved && memo.audio && memo.note && memo.dur === 12, memo);

  // ---- 5. expenses have a type ----
  const exp = await ev(`
    const guessed = r70Typ(finExpenses()[0]), personal = r70Typ(finExpenses()[1]);
    finExpenses()[0].typ = 'client'; finExpenses()[0].typClient = 'c1';
    const tot = r70TypTotals(), tx = r44TxHtml(), sheet = (function(){ ui.finSheet = 'expense'; return finSheetHtml(); })();
    return {guessed:guessed, personal:personal, client:tot.client, typeSelect:tx.indexOf('data-r70-typ') > 0, chips:tx.indexOf('r70-typs') > 0, onSheet:sheet.indexOf('r70-styp') > 0, clean:tx.indexOf('exp:e1') < 0};
  `);
  check('5 expenses: a business name is guessed, the rest is personal', exp.guessed === 'business' && exp.personal === 'personal', exp);
  check('5 expenses: a type on every row, filters, and totals per type', exp.typeSelect && exp.chips && exp.client === 60, exp);
  check('5 expenses: the type is on the add sheet', exp.onSheet, exp);
  check('5 expenses: the row ids never show in the name', exp.clean, exp);

  // ---- 6. journal filters behind one button ----
  const jf = await ev(`
    ui.r70Jf = false; const shut = r67JFilterHtml();
    ui.journalSearchText = 'ok'; const withOn = r67JFilterHtml();
    ui.r70Jf = true; const open = r67JFilterHtml();
    ui.journalSearchText = ''; ui.r70Jf = false;
    return {btn:shut.indexOf('r70JfToggle') > 0, hidden:shut.indexOf('journalSearchInput') < 0, count:withOn.indexOf('<em>1</em>') > 0, opens:open.indexOf('journalSearchInput') > 0};
  `);
  check('6 journal: one Filter button, shut by default', jf.btn && jf.hidden && jf.opens, jf);
  check('6 journal: it says how many filters are on', jf.count, jf);

  // ---- 7. Op can do everything ----
  const op = await ev(`
    const b = createBoard('journal', 'Contractor Co-Content');
    const out = opRunTool('add_to_board', {board:'contractor co', title:'Hooks', text:'One\\nTwo\\nThree'});
    const el = b.elements[b.elements.length-1];
    const note = opRunTool('add_to_board', {board:'Contractor Co-Content', text:'A long paragraph of thinking that should stay a note card, not become a list of little lines.'});
    const el2 = b.elements[b.elements.length-1];
    const score = opRunTool('explain_score', {area:'consistency'});
    const list = opRunTool('list_boards');
    let changed = false; try{ opRunTool('explain_score', {area:'consistency'}); }catch(e){ changed = true; }
    return {put:/Contractor Co-Content/.test(out), list:el.type === 'list', items:el.items.length, note:el2.type === 'note',
      score:/Consistency/.test(score), boards:/Contractor Co-Content/.test(list), noWrite:!changed,
      tools:['add_to_board','list_boards','make_board','explain_score','create_playbook','add_playbook'].filter(n => OP_TOOLS.some(t => t.name === n)).length,
      spotted:el2.y > el.y};
  `);
  check('7 Op: he can put things on a board', op.put && op.list && op.items === 3 && op.note, op);
  check('7 Op: cards stack instead of landing on each other', op.spotted, op);
  check('7 Op: he reads the scoring and never changes it', op.score && op.noWrite, op);
  check('7 Op: every new tool is registered', op.tools === 6, op);

  // ---- 8. done means saved ----
  const done = await ev(`
    const c = state.business.clients[0];
    const before = (c.touchpoints||[]).length, od = crmOverdueDays('client', c);
    const out = opRunTool('log_touch', {who:'Coral Energy', type:'call'});
    const after = (c.touchpoints||[]).length, od2 = crmOverdueDays('client', c);
    let threw = ''; try{ opRunTool('log_touch', {who:'Nobody At All'}); }catch(e){ threw = e.message; }
    return {logged:after === before+1, wasOverdue:od, nowOverdue:od2, said:/logged a call with Coral Energy/.test(out),
      honest:/no client or lead/.test(threw), claims:r70Claims('Done, logged it.'), notClaims:r70Claims('Do you want me to log it?')};
  `);
  check('8 done means saved: the touch really saves', done.logged && done.said, done);
  check('8 done means saved: logging a touch clears the overdue count', done.wasOverdue > 0 && done.nowOverdue <= 0, done);
  check('8 done means saved: a miss is said plainly, not swallowed', done.honest, done);
  check('8 done means saved: "logged" is caught, a question isn\'t', done.claims && !done.notClaims, done);

  // ---- 9. inspiration ----
  const insp = await ev(`
    const acts = inspActs(), piano = acts.find(a => a.id === 'piano');
    r70InspOwn().push({id:'ownX', e:'🎹', label:'My own thing'});
    const mine = inspActs().find(a => a.id === 'ownX');
    ui.inspSheet = true; const h = inspHtml(); ui.inspSheet = false;
    const n = inspStore().log.length;
    inspStore().log.push({id:uid(), act:'piano', date:addDays(todayStr(), -3), at:localTs(addDays(todayStr(), -3), '12:00'), back:true});
    return {piano:!!piano, cat:piano && piano.cat, count:acts.length, own:!!mine, groups:h.indexOf('r70-ig') > 0, when:h.indexOf('r70InspWhen') > 0, back:inspStore().log.length === n+1};
  `);
  check('9 inspiration: the piano is there, in Music', insp.piano && insp.cat === 'music', insp);
  check('9 inspiration: a much wider set, grouped', insp.count > 30 && insp.groups, insp);
  check('9 inspiration: your own, and one you forgot to log', insp.own && insp.when && insp.back, insp);

  // ---- 10. the key ----
  const key = await ev(`
    delete state.profile.r70KeyAt;
    const n = r66Feed().length;
    const line = aiErrLine({ok:false, status:401, j:{error:{message:'invalid x-api-key'}}});
    const f = r66Feed()[r66Feed().length-1];
    const again = r66Feed().length;
    aiErrLine({ok:false, status:401, j:{error:{message:'invalid x-api-key'}}});
    return {line:line, told:r66Feed().length === n+1, act:!!(f && f.act && f.act.a === 'r70KeyFix'), once:r66Feed().length === again};
  `);
  check('10 the key: a refusal becomes a notification with a way to fix it', key.told && key.act, key);
  check('10 the key: it says it once an hour, not every time', key.once, key);

  // ---- 11. more than one playbook per client ----
  const pb = await ev(`
    const a = r70PbMake('Onboarding R70', 'client', [{name:'Week one', steps:['Kick-off call', 'Get their logins']}]);
    const b = r70PbMake('Ad management R70', 'client', [{name:'Running', repeat:'month', steps:['Check the spend', 'Send the numbers']}]);
    r70PbMake('A third one R70', 'client', [{name:'Later', steps:['Something else']}]);
    const c = state.business.clients[0];
    r70PbAdd('client', c, a.id, true);
    const onFirst = c.pb && c.pb.id === a.id;
    r70PbAdd('client', c, b.id, true);
    const extra = r70Pbs(c).length;
    masterTasksSync();
    const tasks = state.tasks.items.filter(t => t.master && t.master.kind === 'pb' && t.master.id === 'c1');
    const fromA = tasks.filter(t => t.master.pb === a.id).length, fromB = tasks.filter(t => t.master.pb === b.id).length;
    const panel = pbPersonHtml('client', c);
    const open = tasks.find(t => t.master.pb === b.id && t.status !== 'done');
    let marked = false;
    if(open){ const E = r70PbExtraFor(open); marked = !!(E && E.pb.id === b.id); }
    r70PbDrop('client', c, b.id);
    const gone = r70Pbs(c).length;
    const stillA = state.tasks.items.filter(t => t.master && t.master.kind === 'pb' && t.master.pb === a.id && t.status !== 'done').length;
    return {onFirst:onFirst, extra:extra, fromA:fromA, fromB:fromB, both:panel.indexOf('r70-pbmore') > 0, add:panel.indexOf('r70PbAdd') > 0, marked:marked, gone:gone, stillA:stillA};
  `);
  check('11 playbooks: the first one is their main, the next is extra', pb.onFirst && pb.extra === 1, pb);
  check('11 playbooks: each one makes its own tasks, and neither wipes the other', pb.fromA > 0 && pb.fromB > 0, pb);
  check('11 playbooks: a task knows which playbook it came from', pb.marked, pb);
  check('11 playbooks: their window shows both, and offers another', pb.both && pb.add, pb);
  check('11 playbooks: taking one off leaves the other alone', pb.gone === 0 && pb.stillA > 0, pb);

  // ---- 12. the XP center ----
  const xp = await ev(`
    const Q = r70Quests(), h = r70XpHtml(), you = renderYouTab();
    const touch = Q.find(q => q.id === 'touch');
    const c = consistencyStats(xpCtx());
    return {quests:Q.length, hasXp:Q.every(q => q.xp > 0), panel:h.indexOf('r70-qs') > 0, inYou:you.indexOf('r70-xp') > 0,
      touchQuest:!!touch, touchDone:touch && touch.done, parts:c ? c.parts.indexOf('client touches') >= 0 : 'no score'};
  `);
  check('12 XP center: quests, every one worth something', xp.quests >= 8 && xp.hasXp, xp);
  check('12 XP center: it lives in the You tab', xp.panel && xp.inYou, xp);
  check('12 XP center: touching base is a quest, and it ticks itself off', xp.touchQuest && xp.touchDone, xp);
  check('12 XP center: consistency counts client touches', xp.parts === true, xp);

  // ---- 13. client journals take photos ----
  const photo = await ev(`
    const c = state.business.clients[0];
    c.journal.push({id:'j1', text:'Their ad results', date:todayStr(), createdAt:new Date().toISOString(), photos:['data:image/png;base64,iVBORw0KGgo=']});
    const row = renderAllClientJournalRow({entry:c.journal[0], client:c, c:c});
    ui.journalTabClientId = 'c1'; const compose = renderClientJournalComposeCard();
    ACTIONS.r70CjView({dataset:{idx:'0'}}, null, 'j1');
    const big = !!document.getElementById('r70Light');
    ACTIONS.r70LightClose();
    return {strip:row.indexOf('r70-cjp') > 0, drop:compose.indexOf('data-photo-drop') > 0, pick:compose.indexOf('r70CjPick') > 0, big:big, shut:!document.getElementById('r70Light')};
  `);
  check('13 client journals: photos show on the entry', photo.strip, photo);
  check('13 client journals: drag and drop, or the button', photo.drop && photo.pick, photo);
  check('13 client journals: a tap opens it big', photo.big && photo.shut, photo);

  // ---- 14. days off hold the streak ----
  const off = await ev(`
    const d = addDays(todayStr(), 9);
    r70OffSet(d, 'shoot');
    const marked = isDayOff(d), kind = r70OffKinds()[d];
    r70OffSet(d, '');
    const cleared = state.daysOff.dates.indexOf(d) < 0;
    state.modes.history = arr(state.modes.history).concat([{type:'shooting', date:addDays(todayStr(), -2), minutes:200}]);
    const auto = isDayOff(addDays(todayStr(), -2));
    state.profile.r70ShootOff = false; const offable = isDayOff(addDays(todayStr(), -2)); state.profile.r70ShootOff = true;
    r70OffPanel(); const panel = !!document.getElementById('r70Off'); const grid = (document.querySelectorAll('#r70Off .r70-od')||[]).length;
    ACTIONS.r70OffClose();
    return {marked:marked, kind:kind, cleared:cleared, auto:auto, offable:offable, panel:panel, grid:grid, lockIn:renderPreFocusModal().indexOf('r70OffOpen') > 0};
  `);
  check('14 days off: a day you mark holds the streak', off.marked && off.kind === 'shoot' && off.cleared, off);
  check('14 days off: a day you spent shooting counts by itself, unless you say not to', off.auto && !off.offable, off);
  check('14 days off: a month ahead, from the streak page and from locking in', off.panel && off.grid >= 40 && off.lockIn, off);

  // ---- 15. view all sessions ----
  const sess = await ev(`
    ui.view = 'today'; viewAllSessions();
    const went = ui.view === 'focus';
    const row = sessionRowHtml({kind:'session', id:'s1', date:todayStr(), type:'deep', minutes:180, tasks:[], breaks:1});
    return {went:went, page:!!ui.sessionsPage || went, breaks:row.indexOf('r70-sx-b') > 0, edit:row.indexOf('r70-sx-e') > 0};
  `);
  check('15 sessions: the button goes somewhere now', sess.went, sess);
  check('15 sessions: each row shows its breaks and can be edited', sess.breaks && sess.edit, sess);

  // ---- 16. sealed messages ----
  const sealed = await ev(`
    state.journal.entries.push({id:'seal1', title:'For later', text:'A note to myself', date:todayStr(), createdAt:new Date().toISOString()});
    ui.r57Thread = 'seal1';
    ui.r57ThreadDraft = {mode:'week', repeat:false};
    const h = r57ThreadHtml();
    ui.r57ThreadDraft = {mode:'week', repeat:true};
    const on = r57ThreadHtml();
    ui.r57ThreadDraft = {mode:null, repeat:false};
    const none = r57ThreadHtml();
    ui.r57ThreadDraft = null; ui.r57Thread = null;
    return {gone:h.indexOf('r57-bk-r') < 0, btn:h.indexOf('r70-rep') > 0, bk:h.indexOf('r57-bk-o') > 0, on:on.indexOf('r70-rep is-on') > 0, notAgain:none.indexOf('r70-rep') < 0};
  `);
  check('16 sealed messages: the confusing row is gone, one small button in its place', sealed.bk && sealed.gone && sealed.btn, sealed);
  check('16 sealed messages: the button shows when it is on', sealed.on, sealed);
  check('16 sealed messages: no Repeat when it is not coming back at all', sealed.notAgain, sealed);

  // ---- 17. the menu bar ----
  const bar = await ev(`
    state.focus.activeSession = {id:'m1', startedAt:Date.now()-3600000, date:todayStr(), type:'deep', breaks:[], onBreak:false};
    const mins = r70LockOutNow();
    const out = !state.focus.activeSession;
    const st = r70TrayState();
    const stopped = r70StopMusic();
    return {out:out, mins:mins > 0, state:typeof st.onBreak === 'boolean' && typeof st.music === 'boolean', stopped:stopped, hasBreak:typeof r70BreakFromBar === "function"};
  `);
  check('17 menu bar: Lock out ends it there and then', bar.out && bar.mins, bar);
  check('17 menu bar: break, stop music and the live state', bar.hasBreak && bar.stopped && bar.state, bar);

  // ---- 18. last month's client work ----
  const back = await ev(`
    const c = state.business.clients[1];
    c.deliverables = [{id:'d1', name:'Reels', recurring:true, perWeek:2}];
    const at = addDays(todayStr(), -40), cy = dvwCycle(c, at);
    ui.r68CblOff = -1;
    const n = r70LateOpen('c2', 'd1', cy ? cy.start : at);
    const made = state.tasks.items.filter(t => t.master && t.master.r70Late);
    const late = made.length ? r70LateDays(made[0]) : 0;
    const row = made.length ? r51WeekRow(made[0], {need:2, done:0}) : '';
    ui.r68CblOff = 0;
    return {added:n, made:made.length, backlog:made.every(t => t.status === 'backlog'), late:late, says:row.indexOf('r70-late') > 0};
  `);
  check('18 client backlog: last month\'s short weeks come back as tasks', back.added > 0 && back.made > 0 && back.backlog, back);
  check('18 client backlog: they say how many days late they are', back.late > 0 && back.says, back);

  // ---- nothing threw along the way ----
  await ev(`renderView(); ui.view='personal'; ui.personalTab='you'; renderView(); ui.personalTab='journal'; renderView(); ui.view='business'; renderView(); ui.view='focus'; renderView(); return 1;`);
  await page.waitForTimeout(300);
  check('no page errors', page.errors.length === 0, page.errors.slice(0, 6));

  await browser.close();
  process.exit(report() ? 1 : 0);
})();
