// Round 73 — icons, Personal without You, calendar scroll, XP fill, task looks, Command View, and the Mind view.
// Run: node scripts/e2e/r73-test.js dist/command-center-2.html
const path = require('path');
const { instrument, launch, newPage, check, report, OUT } = require('./common');
const SRC = process.argv[2] || 'dist/command-center-2.html';
const FILE = path.join(OUT, 'r73.html');
instrument(SRC, FILE);
const ds = (off) => { const d = new Date(); d.setDate(d.getDate() + (off || 0)); return d.toISOString().slice(0, 10); };
const seed = {
  profile: {name: 'Andre'},
  tasks: {items: [{id: 't1', title: 'Cut 3 reels', status: 'today', deadline: ds(0)}, {id: 't2', title: 'Pitch deck', status: 'today', deadline: ds(3)}, {id: 't3', title: 'Invoice run', status: 'backlog'}]},
  business: {clients: [{id: 'c1', name: 'Batusha Corp', status: 'active', mrr: 1200, touches: [ds(-1)]}, {id: 'c2', name: 'Brothers Mechanical', status: 'active', mrr: 1800, touches: [ds(-12)]}], pipeline: []}
};
(async () => {
  const browser = await launch();
  const page = await newPage(browser, FILE, seed);
  const ev = (code) => page.evaluate((c) => window.__op.ev(c), `(function(){ ${code} })()`);

  const nav = await ev(`renderView(); const q = (v) => { const e = document.querySelector('.nav-item[data-view="'+v+'"] .nav-icon'); return e ? e.innerHTML : ''; };
    return {personal:/<svg/.test(q('personal')), xp:/<svg/.test(q('xp')), cal:/<svg/.test(q('calendar')), cmd:!!document.querySelector('.r73NavCmd, [data-action="r73NavCmd"]'), mind:!!document.querySelector('[data-action="r73NavMind"]'), dock:!!document.querySelector('.r73-cvb')};`);
  check('sidebar: new SVG icons for Personal and Calendar (XP left the sidebar in Round 76)', nav.personal && nav.cal, nav);
  check('sidebar has Mind view (Command View lives top right since Round 74)', !nav.cmd && nav.mind, nav);
  check('Command View button lives in the top-right dock', nav.dock, nav);

  const lk = await ev(`state.focus.locked = true; ui.view='focus'; renderView(); return !!document.querySelector('.r73-cvb');`);
  check('Command View button still there while locked in', lk, lk);

  const pers = await ev(`ui.view='personal'; ui.personalTab='you'; renderView(); const h = document.getElementById('viewRoot').innerHTML; return {tab:ui.personalTab, you:/data-id="you"|>You</.test(h)};`);
  check('Personal has no "You" tab and never lands on it', pers.tab !== 'you' && !pers.you, pers);

  const looks = await ev(`const out = {}; ['board','timeline','focus','orbit','classic'].forEach(function(l){ r72Set('taskLook', l); ui.view='focus'; renderView(); out[l] = l==='classic' ? !document.querySelector('.r73-look') : !!document.querySelector('.r73-look.is-'+l); // (Round 77: the switcher moved to Settings → Appearance) }); return out;`);
  check('all five task looks render', Object.values(looks).every(Boolean), looks);
  const set = await ev(`ui.view='settings'; ui.settingsTab='display'; renderView(); return !!document.getElementById('r77Looks');`);
  check('Settings → Appearance has the Tasks overview look card (Round 77)', set, set);

  const cv = await ev(`r71Open(); const o = document.querySelector('.r73cv'); const sky = !!document.querySelector('.r73cv canvas'); return {cls:!!o, sky:sky};`);
  check('Command View opens with the surreal sky', cv.cls && cv.sky, cv);
  await ev(`const x = document.querySelector('.r73cv [data-action="r71Close"], .r73cv .r71-x'); if(x) x.click(); state.focus.locked = false;`);

  const mind = await ev(`state.profile.viewMode = 'mind'; renderView(); return {on:r73MindOn(), root:!!document.getElementById('mindRoot')};`);
  check('Mind view boots when the setting is on', mind.on && mind.root, mind);
  await page.waitForTimeout(900);
  const boot = await ev(`const a = document.getElementById('app'); a.classList.add('app-in'); const o = getComputedStyle(a).opacity; return {o:o};`);
  check('a real launch (boot fade-in) still hides the classic window behind the map', boot.o === '0', boot);
  const nodes = await ev(`r73MindBuild(); const k = {}; MIND.nodes.forEach(function(n){ k[n.kind] = (k[n.kind]||0)+1; }); const br = MIND.nodes.find(function(n){ return n.label==='Brothers Mechanical'; }); return {k:k, sectors:MIND.nodes.filter(function(n){ return n.kind==='sector'; }).length, neg:!!(br && br.neglected)};`);
  check('the map has Op and 7 sectors', nodes.k.op === 1 && nodes.sectors === 7, nodes);
  check('a client untouched 12 days drifts out as neglected', nodes.neg, nodes);
  const hid = await ev(`const v = (id) => { const e = document.getElementById(id); return e ? getComputedStyle(e).display : 'none'; }; return {pill:v('activityPill'), fab:v('fabAdd')};`);
  check('classic pill and + are hidden over the map', hid.pill === 'none' && hid.fab === 'none', hid);
  const dive = await ev(`r73Dive({view:'business'}); const a = document.body.classList.contains('mind-dive') && ui.view==='business'; r73Surface(); return {a:a, back:!document.body.classList.contains('mind-dive')};`);
  check('diving opens the classic page and Esc surfaces', dive.a && dive.back, dive);
  const pal = await ev(`r73Pal(true); const i = document.querySelector('#r73Pal input'); i.value = 'batu'; i.dispatchEvent(new Event('input')); const n = document.querySelectorAll('#r73Pal .r73p-it, #r73Pal [data-i]').length; r73Pal(false); return n;`);
  check('⌘K finds things on the map', pal > 0, pal);

  await browser.close();
  report('Round 73');
})();
