// Round 74 — Command View (one button, locked-in board, right numbers), tabs you can drag, the new XP page.
// Run: node scripts/e2e/r74-test.js dist/command-center-2.html
const path = require('path');
const { instrument, launch, newPage, check, report, OUT } = require('./common');
const SRC = process.argv[2] || 'dist/command-center-2.html';
const FILE = path.join(OUT, 'r74.html');
instrument(SRC, FILE);
const seed = {
  profile: {name: 'Andre'},
  focus: {sessions: [], work: {enabled: true, start: '00:00', end: '00:01', days: [0, 1, 2, 3, 4, 5, 6]}},
  standards: {deepWorkTargetMinutes: 180},
  tasks: {items: [{id: 't1', title: 'Cut 3 reels', status: 'today'}]}
};
(async () => {
  const browser = await launch();
  const page = await newPage(browser, FILE, seed);
  await page.setViewportSize({width: 1440, height: 900});
  const ev = (code) => page.evaluate((c) => window.__op.ev(c), `(function(){ ${code} })()`);

  const btns = await ev(`ui.view='today'; renderView(); return {side:!!document.querySelector('.sidebar [data-action="r73NavCmd"]'), dock:document.querySelectorAll('.r73-cvb').length, head:!!document.querySelector('#viewRoot .r71-cb')};`);
  check('one Command View button (top right), none in the sidebar or Today header', !btns.side && btns.dock === 1 && !btns.head, btns);

  const lk = await ev(`startFocus(null); state.focus.activeSession.startedAt = Date.now() - 68*60000; r71Open(); const v = document.getElementById('r71Full'); return {board:!!v.querySelector('.r74l'), done:/Done for the day/.test(v.innerHTML), t:(v.querySelector('[data-r74t]')||{}).textContent, pl:(v.querySelector('.r74l-pl')||{}).textContent};`);
  check('locked in, Command View is the locked-in board', lk.board, lk);
  check('it never says "Done for the day" while you are locked in', !lk.done, lk);
  check('it counts the session that is running, against your real goal (3h)', /1h 8m/.test(lk.pl) && /of 3h/.test(lk.pl), lk);
  await page.waitForTimeout(1300);
  const tick = await ev(`return document.querySelector('#r71Full [data-r74t]').textContent;`);
  check('the timer ticks every second', tick !== lk.t, {a: lk.t, b: tick});
  const off = await ev(`r72Set('cvLocked', false); r71Open(); const v = document.getElementById('r71Full'); const r = {board:!!v.querySelector('.r74l'), done:/Done for the day/.test(v.innerHTML), locked:/Locked in/.test(v.innerHTML)}; r72Set('cvLocked', true); ACTIONS.r71Close(); return r;`);
  check('with the locked-in board off, the regular board says Locked in, not Done', !off.board && !off.done && off.locked, off);
  await ev(`state.focus.activeSession = null; renderView();`);

  // tabs: drag Finances to the front
  await ev(`ui.view='personal'; ui.personalTab='goals'; renderView();`);
  const box = async (t) => (await page.locator(`.tabs .tab[data-tab="${t}"]`).boundingBox());
  const a = await box('finances'), b = await box('goals');
  await page.mouse.move(a.x + a.width/2, a.y + a.height/2); await page.mouse.down();
  await page.mouse.move(a.x - 30, a.y + a.height/2, {steps: 6});
  await page.mouse.move(b.x + 5, b.y + b.height/2, {steps: 10});
  await page.mouse.up();
  await page.waitForTimeout(200);
  const ord = await ev(`const tab = ui.personalTab; renderView(); return {order:[...document.querySelectorAll('.tabs .tab')].map(t=>t.dataset.tab), saved:state.settings.r74Tabs.personalTab, tab:tab};`);
  check('dragging a tab moves it, and the order survives a redraw', ord.order[0] === 'finances' && ord.saved && ord.saved[0] === 'finances', ord);
  const clickOk = await ev(`document.querySelector('.tabs .tab[data-tab="journal"]').click(); return ui.personalTab;`);
  check('a plain click still opens a tab', clickOk === 'journal', clickOk);
  const biz = await ev(`ui.view='business'; renderView(); return [...document.querySelectorAll('.tabs .tab[data-r74drag]')].length;`);
  check('Business tabs are draggable too', biz >= 5, biz);
  const reset = await ev(`ACTIONS.r74TabsReset(); ui.view='personal'; renderView(); return document.querySelector('.tabs .tab').dataset.tab;`);
  check('Reset puts the tabs back', reset === 'goals', reset);

  const xp = await ev(`ui.view='xp'; renderView(); return {hero:!!document.querySelector('.r74x-hero .r74x-me'), week:document.querySelectorAll('.r74x-b').length, chips:document.querySelectorAll('.r74x-chips div').length, ladder:document.querySelectorAll('.r74x-r').length, now:!!document.querySelector('.r74x-r.is-now em')};`);
  check('XP: hero with card, totals under it and the last 7 days', xp.hero && xp.week === 7 && xp.chips === 3, xp);
  check('XP: ranks as a ladder with you on it', xp.ladder > 3 && xp.now, xp);
  const gap = await page.evaluate(() => { const me = document.querySelector('.r74x-me'), lv = document.querySelector('.r74x-lv'); return Math.abs(me.getBoundingClientRect().height - lv.getBoundingClientRect().height); });
  check('XP: the card column is as tall as the level column (no empty gap)', gap < 4, gap);

  await browser.close();
  report('Round 74');
})();
