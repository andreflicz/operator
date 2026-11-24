// Round 78 — Mind view opens things in one click and switches in place, the galaxy (sun, planets, beacons),
// no accidental text selection, Today without the work bars, XP and a real workout log for the phone.
// Run: node scripts/e2e/r78-test.js dist/command-center-2.html
const path = require('path');
const { instrument, launch, newPage, check, report, OUT } = require('./common');
const SRC = process.argv[2] || 'dist/command-center-2.html';
const FILE = path.join(OUT, 'r78.html');
instrument(SRC, FILE);
const ds = (o) => { const d = new Date(); d.setDate(d.getDate() + o); return d.toISOString().slice(0, 10); };
const seed = {
  profile: {name: 'Andre', viewMode: 'mind'},
  tasks: {items: [{id: 't1', title: 'Cut reels', status: 'today', deadline: ds(-2)}, {id: 't2', title: 'Pitch deck', status: 'today', deadline: ds(2)}]},
  business: {clients: [{id: 'c1', name: 'Batusha Corp', status: 'active', mrr: 1200, touches: [ds(-1)]}, {id: 'c2', name: 'Brothers GC', status: 'active', mrr: 1800, touches: [ds(-14)]}], pipeline: []}
};
(async () => {
  const browser = await launch();
  const page = await newPage(browser, FILE, seed);
  const errs = []; page.on('pageerror', (e) => errs.push(e.message));
  const ev = (code) => page.evaluate((c) => window.__op.ev(c), `(function(){ ${code} })()`);
  await page.waitForTimeout(2000);

  const imp = await ev(`return {tasks:MIND.nodes.filter(n=>n.imp && n.kind==='task').map(n=>n.label), clients:MIND.nodes.filter(n=>n.imp && n.kind==='client').map(n=>n.label), focus:MIND.byId['s:focus'].impN, biz:MIND.byId['s:business'].impN};`);
  check('important things get a beacon: the overdue task and the drifting client, and their planets count them', imp.tasks.indexOf('Cut reels') >= 0 && imp.tasks.indexOf('Pitch deck') < 0 && imp.clients.indexOf('Brothers GC') >= 0 && imp.focus >= 1 && imp.biz >= 1, imp);

  const opened = {};
  for (const id of ['focus', 'business', 'social', 'calendar', 'personal', 'xp']) {
    const sp = await ev(`const n = MIND.byId['s:${id}']; return n.sp[2] > 0 ? [n.sp[0], n.sp[1]] : null;`);
    if(!sp){ opened[id] = 'off'; continue; }
    await page.mouse.click(sp[0], sp[1]); await page.waitForTimeout(1100);
    opened[id] = await ev(`return MIND.dive && getComputedStyle(document.getElementById('app')).opacity==='1' && document.getElementById('viewRoot').innerText.length > 50 ? ui.view : 'no';`);
    await page.keyboard.press('Escape'); await page.waitForTimeout(600);
  }
  check('one click on each planet opens its page', Object.values(opened).every((v) => v && v !== 'no' && v !== 'off'), opened);

  const insp = await ev(`r73Inspect(MIND.byId['s:focus']); r73Dive({view:'settings'}); return getComputedStyle(document.getElementById('r73Insp')).display;`);
  check('the side card steps aside once a page is open', insp === 'none', insp);
  const tab = await page.evaluate(() => { const b = [...document.querySelectorAll('.settings-nav-item')].find((x) => /Look/.test(x.textContent)); const r = b.getBoundingClientRect(); return [r.x + r.width/2, r.y + r.height/2]; });
  await page.mouse.click(tab[0], tab[1]); await page.waitForTimeout(400);
  check('tabs inside an opened page work', await ev(`return ui.view==='settings' && ui.settingsTab==='look';`));
  await ev(`r73Surface(); return 1;`); await page.waitForTimeout(500);

  // a double-click on a task: the camera moving between clicks doesn't lose it
  const tp = await ev(`const n = MIND.nodes.find(n=>n.kind==='task' && n.sp[2]>0); return n ? [n.sp[0], n.sp[1], n.ref.id] : null;`);
  if(tp){ await page.mouse.dblclick(tp[0], tp[1]); await page.waitForTimeout(600); }
  check('double-clicking a task opens it', !!tp && await ev(`return !!document.querySelector('.overlay:not(.hidden), .modal.open, #taskEditModal:not(.hidden)');`), tp);
  await page.keyboard.press('Escape'); await page.waitForTimeout(300);
  await ev(`try{ document.querySelectorAll('.overlay').forEach(o=>o.classList.add('hidden')); }catch(e){} return 1;`);

  // zooming right in doesn't blow up (things behind the camera drop out)
  await page.mouse.move(700, 450); for (let i = 0; i < 16; i++){ await page.mouse.wheel(0, -140); await page.waitForTimeout(30); }
  await page.waitForTimeout(500);
  check('zooms in much further than before, with no errors', await ev(`return MIND.cam.k > 4;`) && !errs.length, errs);

  const sel = await ev(`const s = getComputedStyle(document.body).userSelect || getComputedStyle(document.body).webkitUserSelect; const i = document.createElement('input'); document.body.appendChild(i); const si = getComputedStyle(i).userSelect || getComputedStyle(i).webkitUserSelect; i.remove(); return [s, si];`);
  check('labels and buttons can’t be highlighted by accident; text boxes still can', sel[0] === 'none' && sel[1] !== 'none', sel);

  const sw = await ev(`r73MindSwitch('classic'); return 1;`); await page.waitForTimeout(1000);
  const cl = await ev(`return {root:!!document.getElementById('mindRoot'), on:document.body.classList.contains('mind-on'), booted:MIND.booted, mode:state.profile.viewMode};`);
  check('leaving the Mind view happens in place (no restart)', !cl.root && !cl.on && !cl.booted && cl.mode === 'classic', cl);
  await ev(`r73MindSwitch('mind'); return 1;`); await page.waitForTimeout(1300);
  const mi = await ev(`return {root:!!document.getElementById('mindRoot'), on:document.body.classList.contains('mind-on'), canvas:!!MIND.canvas, raf:!!MIND.raf};`);
  check('…and coming back in does too', mi.root && mi.on && mi.canvas, mi);
  check('the Interface card no longer says it restarts', await ev(`return !/restarts Operator/.test(r73InterfaceSetHtml());`));

  await ev(`r73MindSwitch('classic'); return 1;`); await page.waitForTimeout(1000);
  const td = await ev(`ui.view='today'; renderView(); const h = document.getElementById('viewRoot').innerHTML; return {swt:(h.match(/class="swt/g) || []).length, streak:/DAY STREAK|day streak/i.test(document.getElementById('viewRoot').innerText)};`);
  check('Today: the deep-work and tasks bars are gone, the streak stays', td.swt === 0 && td.streak, td);

  const ph = await ev(`const x = r72PhoneCall('xp'); const w = r72PhoneCall('workoutTypes'); const before = state.health.gymLog.length; const r = r72PhoneCall('workout', {type:'Boxing', minutes:60}); const g = state.health.gymLog[state.health.gymLog.length - 1]; return {x:x, types:w.types.length, ok:r.ok, say:r.say, added:state.health.gymLog.length - before, g:g};`);
  check('phone: XP (level, progress, quests)', typeof ph.x.level === 'number' && typeof ph.x.pct === 'number' && Array.isArray(ph.x.quests), ph.x);
  check('phone: Log workout saves a real workout', ph.ok && ph.added === 1 && ph.g.type === 'Boxing' && ph.g.duration === 60, ph);

  const card = await ev(`if(!window.operatorApp) window.operatorApp = {phoneInfo:function(){ return Promise.resolve({}); }}; ui.r68Phone = {on:true, url:'http://192.168.1.20:8940', home:'http://Andres-Mac.local:8940', code:'123456'}; r70Tags().tailnet = 'andres-mac.tail1234.ts.net'; const h = r68PhoneCardHtml(); return {od:/VPN On Demand/.test(h), home:/Andres-Mac\\.local/.test(h)};`);
  check('Settings → Your iPhone explains VPN On Demand, and offers a home-only address', card.od && card.home, card);

  check('no page errors', !errs.length, errs);
  await browser.close();
  report('Round 78');
})();
