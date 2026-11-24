// Round 75 — the Command Center replaces Minimal view; Today without duplicates; editable quotes; simple tags;
// credit cards count as debt; the season off the top.
// Run: node scripts/e2e/r75-test.js dist/command-center-2.html
const path = require('path');
const { instrument, launch, newPage, check, report, OUT } = require('./common');
const SRC = process.argv[2] || 'dist/command-center-2.html';
const FILE = path.join(OUT, 'r75.html');
instrument(SRC, FILE);
const seed = {
  profile: {name: 'Andre', lockedView: 'minimal'},
  standards: {deepWorkTargetMinutes: 180},
  tasks: {items: [{id: 't1', title: 'Cut 3 reels', status: 'today'}, {id: 't2', title: 'Pitch deck', status: 'today'}]}
};
(async () => {
  const browser = await launch();
  const page = await newPage(browser, FILE, seed);
  await page.setViewportSize({width: 1440, height: 900});
  const ev = (code) => page.evaluate((c) => window.__op.ev(c), `(function(){ ${code} })()`);

  // ---- the Command Center ----
  const cc = await ev(`r71Open(); const v = document.getElementById('r71Full'); return {cc:!!v.querySelector('.r75cc'), journal:/r71-journal|r72c-note/.test(v.innerHTML), shoot:/Start shooting|r72Shoot/.test(v.innerHTML), lock:v.querySelectorAll('[data-action="r75Lock"]').length, tasks:v.querySelectorAll('[data-action="r75Task"]').length, time:!!v.querySelector('.r75-time .r72-time'), quote:!!v.querySelector('.r75-qt'), bub:!!v.querySelector('button.r75-bub')};`);
  check('Command View is the Command Center', cc.cc, cc);
  check('one lock button, no Start shooting', cc.lock === 1 && !cc.shoot, cc);
  check('tasks to tick off, Your time, a quote and the journal bubble', cc.tasks >= 2 && cc.time && cc.quote && cc.bub, cc);
  const fit = await page.evaluate(() => { const v = document.getElementById('r71Full'), c = v.querySelector('.r75cc'); return {sh:v.scrollHeight, h:innerHeight, ch:c.getBoundingClientRect().height}; });
  check('it is one screen: nothing to scroll (1440×900)', fit.sh <= fit.h + 1 && fit.ch <= fit.h + 1, fit);
  await page.setViewportSize({width: 1280, height: 720}); await page.waitForTimeout(200);
  const fit2 = await page.evaluate(() => { const v = document.getElementById('r71Full'); return {sh:v.scrollHeight, h:innerHeight}; });
  check('…and on a small screen (1280×720)', fit2.sh <= fit2.h + 1, fit2);
  await page.setViewportSize({width: 1440, height: 900});
  await ev(`document.querySelector('[data-action="r75Task"][data-id="t1"]').click();`); await page.waitForTimeout(1600);
  const tick = await ev(`const t = state.tasks.items.find(x=>x.id==='t1'); return {st:t.status, done:!!document.querySelector('.r75-t.is-done[data-id="t1"]')};`);
  check('ticking a task off on the board finishes it', tick.st === 'done' && tick.done, tick);
  const bub = await ev(`ACTIONS.r75Bub(); const t = document.getElementById('r75BubT'); t.value = 'Idea from the board'; ACTIONS.r75BubSave(); return {saved:state.journal.entries.some(e=>e.text==='Idea from the board'), closed:!document.getElementById('r75BubT')};`);
  check('the bubble writes a journal line', bub.saved && bub.closed, bub);
  // quotes
  const q = await ev(`const k = document.querySelector('.r75-qt').dataset.id; ACTIONS.r75QEdit(null, null, k); const open = !!document.getElementById('r75QE'); document.getElementById('r75QT').value = 'Ship it today.'; document.getElementById('r75QW').value = ''; ACTIONS.r75QSave(null, null, k); const txt = document.querySelector('.r75-qt').textContent; return {open:open, txt:txt, k:k};`);
  check('every quote can be edited (words and who said it)', q.open && /Ship it today\./.test(q.txt) && !/Bruce|Facebook/.test(q.txt), q);
  const gone = await ev(`let found = false; ['work','action','morning'].forEach(function(k){ QUOTE_SETS[k]().forEach(function(x){ if(/Facebook office poster/.test(x[1])) found = x.key; }); }); if(found) ACTIONS.r75QGone(null, null, found); let still = false; ['work','action','morning'].forEach(function(k){ QUOTE_SETS[k]().forEach(function(x){ if(/Facebook office poster/.test(x[1])) still = true; }); }); return {found:!!found, still:still};`);
  check('…or removed ("Facebook office poster" gone)', gone.found && !gone.still, gone);
  const nq = await ev(`const a = document.querySelector('.r75-qt').textContent; ACTIONS.r75QNext(); return a !== document.querySelector('.r75-qt').textContent;`);
  check('quotes turn', nq, nq);
  await ev(`ACTIONS.r71Close();`); await page.waitForTimeout(400);

  // ---- it opens itself when you lock in, and goes when you lock out ----
  await ev(`startFocus(null);`); await page.waitForTimeout(700);
  const auto = await ev(`return !!document.querySelector('#r71Full .r75cc.is-locked');`);
  check('locking in opens the Command Center by itself', auto, auto);
  await ev(`ACTIONS.r75Lock();`); await page.waitForTimeout(2200);
  const away = await ev(`return {open:!!document.getElementById('r71Full'), locked:!!state.focus.activeSession};`);
  check('Lock out on the board ends it, and the board goes with it', !away.locked && !away.open, away);
  await ev(`r72Set('cvAuto', false); startFocus(null);`); await page.waitForTimeout(700);
  const noauto = await ev(`const o = !!document.getElementById('r71Full'); r70LockOutNow(); return o;`);
  check('with the setting off it stays put', !noauto, noauto);
  await ev(`r72Set('cvAuto', true);`);
  const mini = await ev(`ui.view='focus'; renderView(); return {lm:lockedMinimal(), fm:focusMinimalOn(), btn:!!document.querySelector("#viewRoot .lv-btn:not([hidden])"), prof:state.profile.lockedView};`);
  check('Minimal view is gone (no button, the old setting cleared)', !mini.lm && !mini.fm && !mini.btn && mini.prof !== 'minimal', mini);
  const set = await ev(`ui.view='settings'; ui.settingsTab='look'; renderView(); const h = document.getElementById('viewRoot').innerHTML; return {cc:/Command Center/.test(h) && /data-action="r75Auto"/.test(h), old:/Locked-in view \\(the Minimal/.test(h)};`);
  check('Settings → Look & Sound has the Command Center switch, not Minimal styles', set.cc && !set.old, set);

  // ---- Today ----
  const today = await ev(`ui.view='today'; renderView(); const r = document.getElementById('viewRoot'); return {dp:!!r.querySelector('.r75-swd'), clock:!!r.querySelector('.ck-panel'), qj:/Quick journal/.test(r.innerHTML), shoot:!!r.querySelector('[data-action="r72Shoot"]'), dup:/Done for the day|Off the clock<\\/span>/.test((r.querySelector('.r75-panel')||{}).innerHTML||''), cvHead:/Full screen<\\/button>/.test(r.innerHTML), span:state.dashboardPanels.r60Span.r72time};`);
  check('Today: the day’s progress sits with the streak and tasks', today.dp, today);
  check('Today: no clock block, no quick journal, no Start shooting', !today.clock && !today.qj && !today.shoot, today);
  check('Today: the Command View panel drops its duplicates and its header', !today.dup && !today.cvHead, today);
  check('Today: Your time is full width', today.span === 12, today);
  const pq = await ev(`const q = document.querySelector('#viewRoot .r71-quote'); return q ? q.dataset.action : 'none';`);
  check('Today: its quote can be edited too', pq === 'r75QEdit', pq);

  // ---- debt ----
  const debt = await ev(`state.finances.debts = [{id:'d1', name:'Car loan', balance:-2400}]; state.finances.bank = {accounts:[{id:'a1', name:'Checking', org:'Chase', balance:3200}, {id:'a2', name:'Freedom Visa', org:'Chase', balance:-1850}]}; ui.view='personal'; ui.personalTab='finances'; renderView(); const t = [...document.querySelectorAll('.r44-tile')].find(x=>/All debt/.test(x.textContent)); return {txt:t.textContent, bal:state.finances.debts[0].balance};`);
  check('a debt typed as negative counts (and is stored as owed)', debt.bal === 2400, debt);
  check('credit cards from the bank count in All debt', /\$4,250/.test(debt.txt), debt);

  // ---- tags ----
  const tg = await ev(`ui.view='settings'; ui.settingsTab='tags'; renderView(); ACTIONS.r70TWizOpen(); const h = document.getElementById('viewRoot').innerHTML; return {hands:/No pop-ups: make your tags hands-free/.test(h), more:/More to start from/.test(h), pick:document.querySelectorAll('[data-action="r75TagPick"]').length, own:!!document.querySelector('[data-action="r75TagOwn"]')};`);
  check('tags: one section, no separate hands-free block, no "More to start from"', !tg.hands && !tg.more, tg);
  check('tags: + Add a tag is one picker with the ready ones and "something else"', tg.pick > 5 && tg.own, tg);
  const made = await ev(`ACTIONS.r75TagPick(null, null, 'desk'); const g = r70TagList().find(x=>x.starter==='desk'); const h = document.getElementById('viewRoot').innerHTML; return {g:!!g, sc:/Shortcuts → Automation/.test(h), place:!!document.querySelector('.r75-tplace'), nfc:/NFC Tools/.test(h)};`);
  check('a picked tag opens set up for Shortcuts, with an optional place', made.g && made.sc && made.place && !made.nfc, made);

  // ---- the season ----
  const hol = await ev(`ui.holPreview = 'thanksgiving'; ui.view='today'; renderView(); try{ holApply(); }catch(e){} const r = {box:!!document.querySelector('#viewRoot .hol-ban'), b:!!document.querySelector('.hx-bunt.r75b')}; ui.holPreview = null; return r;`);
  check('the season: no box on top of Today', !hol.box, hol);

  await browser.close();
  report('Round 75');
})();
