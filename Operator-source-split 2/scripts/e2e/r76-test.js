// Round 76 — client cycles, holidays (no app music, Apple Music), XP + Quests, idle in the background, quotes
// that only turn, Op's playbooks and personalities, lead↔client touches, the 3D Mind view.
// Run: node scripts/e2e/r76-test.js dist/command-center-2.html
const path = require('path');
const { instrument, launch, newPage, check, report, OUT } = require('./common');
const SRC = process.argv[2] || 'dist/command-center-2.html';
const FILE = path.join(OUT, 'r76.html');
instrument(SRC, FILE);
const d = (n) => { const x = new Date(); x.setDate(x.getDate() + n); return x.toISOString().slice(0, 10); };
const seed = {
  profile: {name: 'Andre'},
  business: {clients: [{id: 'c1', name: 'Mike', business: 'Coral Energy', status: 'active', stage: 'active', mrr: 2000, billingDay: 1, touches: [d(-12)], touchpoints: [{id: 'tp0', type: 'text', date: d(-12), ts: 1}], deliverables: [{id: 'dv1', title: 'Reels', recurring: true, monthlyTarget: 8, completedDates: []}]}],
    pipeline: [{id: 'L1', name: 'Mike', company: 'Coral Energy', stage: 'new', createdAt: d(-12), touchpoints: [{id: 't0', type: 'text', date: d(-12), ts: 1}]}]}
};
(async () => {
  const browser = await launch();
  const page = await newPage(browser, FILE, seed);
  await page.setViewportSize({width: 1440, height: 900});
  const ev = (code) => page.evaluate((c) => window.__op.ev(c), `(function(){ ${code} })()`);

  // ---- a touch on the lead counts on the client card ----
  const tw = await ev(`const c = state.business.clients[0], L = state.business.pipeline[0]; const before = crmOverdueDays('client', c); logTouch('lead', 'L1', 'call'); return {before:before, after:crmOverdueDays('client', c), lead:crmOverdueDays('lead', L)};`);
  check('a touch logged on a lead counts on the same company’s client card', tw.before > 0 && tw.after < 0 && tw.lead < 0, tw);

  // ---- client cycle ----
  const cy = await ev(`ui.view='focus'; ui.focusTab='tasks'; ui.focusTasksSubTab='clientBacklog'; masterTasksSync(); renderView(); const link = !!document.querySelector('[data-action="r76Cyc"][data-id="c1"]'); ACTIONS.r76Cyc(null, null, 'c1'); const ed = !!document.getElementById('r76CycDay'); document.getElementById('r76CycDay').value = '15'; ACTIONS.r76CycSave(null, null, 'c1'); const c = state.business.clients[0], C = dvwCycle(c); const ts = state.tasks.items.filter(t => t.master && t.master.kind==='dvw' && t.master.clientId==='c1' && t.status!=='done'); return {link:link, ed:ed, day:c.cycleDay, start:C.start, cyc:ts.every(t => t.master.cycle===C.start), n:ts.length, txt:(document.querySelector('[data-action="r76Cyc"][data-id="c1"]')||{}).textContent};`);
  check('client backlog: the cycle dates are a button that opens a day picker', cy.link && cy.ed, cy);
  check('changing the start day moves the cycle and re-makes its weeks', cy.day === 15 && /-15$/.test(cy.start) && cy.cyc && cy.n > 0, cy);

  // ---- holidays ----
  const hol = await ev(`ui.holPreview = 'thanksgiving'; renderView(); try{ dockRefresh(); }catch(e){} const urls = []; helperFetch = function(u){ urls.push(u); return Promise.resolve({ok:true}); }; r60MusicPlay('thanksgiving'); const appMusic = !!(typeof R60!=='undefined' && R60.music); const b = document.querySelector('#musicDock .r76-holb'); if(b) b.click(); return {appMusic:appMusic, btn:!!b, url:urls[0] || ''};`);
  check('holiday music in the app is gone', !hol.appMusic, hol);
  check('the holiday button plays a playlist through Apple Music', hol.btn && /music\/pick/.test(hol.url), hol);
  await page.waitForTimeout(200);
  const bunt = await page.evaluate(() => { const b = document.querySelector('.hx-bunt'), d = document.querySelector('#musicDock .md-in') || document.getElementById('musicDock'); if(!b || !d) return {none:true}; return {bRight:b.getBoundingClientRect().right, dLeft:d.getBoundingClientRect().left}; });
  check('the bunting stops before the buttons at the top', bunt.none || bunt.bRight <= bunt.dLeft + 1, bunt);
  await ev(`ui.holPreview = null; renderView();`);

  // ---- XP ----
  const xp = await ev(`ui.view='today'; renderView(); const side = !!document.querySelector('.sidebar [data-view="xp"], .nav-item[data-view="xp"]'); ui.view='xp'; ui.r76XpTab=null; renderView(); const r = document.getElementById('viewRoot'); const q = {tabs:!!r.querySelector('.r76x-tabs'), quests:r.querySelectorAll('.r76q').length, ring:!!r.querySelector('.r76x-ring')}; ACTIONS.r76XpTab(null, null, 'progress'); q.prog = !!r.querySelector('.r74x-hero') && !r.querySelector('.r74x-qs'); q.side = side; return q;`);
  check('XP is out of the sidebar', !xp.side, xp);
  check('XP opens on its own Quests section (ring + a card per quest)', xp.tabs && xp.ring && xp.quests >= 5, xp);
  check('Progress has the level, stats and ranks (without the quests again)', xp.prog, xp);

  // ---- quotes only turn ----
  const qt = await ev(`r71Open(); const v = document.getElementById('r71Full'); const pens = [...v.querySelectorAll('button')].filter(b => b.offsetParent!==null && /✎/.test(b.textContent)).length; const a = v.querySelector('.r75-qt').textContent; v.querySelector('.r75-qt').click(); const b = document.querySelector('#r71Full .r75-qt').textContent; const fb = ['work','action','morning'].some(k => QUOTE_SETS[k]().some(x => /Facebook office poster/.test(x[1]))); const ed = !!document.getElementById('r75QE'); ACTIONS.r71Close(); return {pens:pens, turned:a!==b, fb:fb, editor:ed};`);
  check('Command Center: one pen icon (the journal), not two', qt.pens === 1, qt);
  check('clicking a quote shows the next one; no editor', qt.turned && !qt.editor, qt);
  check('"Facebook office poster" is gone', !qt.fb, qt);
  await page.waitForTimeout(400);

  // ---- idle ----
  await page.evaluate(() => { Object.defineProperty(document, 'hasFocus', {value: () => false, configurable: true}); window.dispatchEvent(new Event('blur')); });
  await page.waitForTimeout(2900);
  const idle = await page.evaluate(() => document.body.classList.contains('op-idle'));
  await page.evaluate(() => { Object.defineProperty(document, 'hasFocus', {value: () => true, configurable: true}); window.dispatchEvent(new Event('focus')); });
  const back = await page.evaluate(() => document.body.classList.contains('op-idle'));
  check('in the background it goes idle (animations paused), and wakes when you come back', idle && !back, {idle, back});

  // ---- Op ----
  const sys = await ev(`const t = aiSystem().map(b => b.text).join('\\n'); return {edge:/Business edge/.test(t) && /Hormozi/.test(t), mode:/Mode right now: The Operator/.test(t)};`);
  check('Op has the business edge in him (and a mode)', sys.edge && sys.mode, sys);
  const per = await ev(`ACTIONS.r76Persona(null, null, 'closer'); const w = wakeCfg(); const t = aiSystem().map(b => b.text).join('\\n'); return {mode:state.profile.opMode, voice:w.elevenVoice, prompt:/Mode right now: The Closer/.test(t)};`);
  check('picking a personality changes how he talks and his voice', per.mode === 'closer' && per.voice === 'N2lVS1w4EtoT3dr4eOWO' && per.prompt, per);
  const pb = await page.evaluate(async () => window.__op.ev(`(async function(){
    aiWrite = function(){ return Promise.resolve('Here: {"name":"Reels onboarding","stages":[{"name":"Kickoff","days":7,"steps":[{"title":"Book the kickoff call","day":1},{"title":"Send the content plan","day":3}]},{"name":"Production","days":14,"steps":[{"title":"Shoot day","day":5},{"title":"Deliver first 8 reels","day":14}]}]}'); };
    AI.hasKey = true; ACTIONS.pb6NewOpen(null, null, 'client');
    const box = !!document.getElementById('r76PbAsk'); document.getElementById('r76PbAsk').value = 'Onboarding a reels retainer';
    const n0 = pbAll().length; await ACTIONS.r76PbOp(); const p = pbAll()[pbAll().length - 1];
    return {box:box, made:pbAll().length === n0 + 1, name:p.name, stages:p.stages.length, steps:p.stages.reduce((a, s) => a + s.steps.length, 0)};
  })()`));
  check('Op makes a playbook from a sentence', pb.box && pb.made && pb.stages === 2 && pb.steps === 4, pb);

  // ---- the Mind view, in 3D ----
  const m3 = await ev(`state.profile.viewMode = 'mind'; renderView(); return {p:r73W2S(100, 0, 50).length === 4, yaw:typeof MIND.yaw === 'number'};`);
  await page.waitForTimeout(600);
  const m3b = await ev(`const a = r73W2S(0, 0, 0), b = r73W2S(0, 0, 100); startFocus(null); return {lift:b[1] < a[1], noCC:!document.getElementById('r71Full')};`);
  await page.waitForTimeout(600);
  const m3c = await ev(`return {noCC:!document.getElementById('r71Full')};`);
  check('Mind view projects in 3D (height lifts a node up the screen)', m3.p && m3.yaw && m3b.lift, {m3, m3b});
  check('locking in from the Mind view doesn’t throw the Command Center over the map', m3c.noCC, m3c);

  await browser.close();
  report('Round 76');
})();
