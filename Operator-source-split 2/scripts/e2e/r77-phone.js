// Round 77 — the phone's live view and its journal (newest first), against a stand-in Mac.
// Run: node scripts/e2e/r77-phone.js
const path = require('path');
const { launch, check, report } = require('./common');
(async () => {
  const b = await launch();
  const ctx = await b.newContext({viewport: {width: 390, height: 844}, deviceScaleFactor: 2});
  const p = await ctx.newPage();
  const started = Date.now() - (68*60 + 21)*1000;
  const html = require('fs').readFileSync(path.join(__dirname, '..', '..', 'mac', 'phone.html'), 'utf8');
  await p.route(/^http:\/\/op\.local\/(\?.*)?$/, (r) => r.fulfill({status: 200, contentType: 'text/html', body: html}));
  await p.route('**/api/**', (r) => {
    const req = r.request(), url = req.url(), body = JSON.parse(req.postData() || '{}');
    let out = {};
    if(/\/api\/state/.test(url)) out = {out: {locked: true, mins: '1h 8m', today: '2h 55m', todayMins: 175, task: 'Cut 3 reels for Batusha'}};
    else if(body.name === 'live') out = {out: {now: Date.now(), locked: true, onBreak: false, startedAt: started, deep: 175, target: 180, pct: 0.97, left: 5, task: 'Cut 3 reels for Batusha', tasksDone: 2, tasksAll: 7, streak: 4, quests: {done: 3, all: 10}, day: 'Normal day'}};
    else if(body.name === 'journal') out = {out: [{id: 'a', date: '2026-11-21', ts: Date.parse('2026-11-21T09:00:00'), title: 'Older', text: 'older one'}, {id: 'b', date: '2026-11-23', ts: Date.parse('2026-11-23T22:10:00'), title: 'Newest', text: 'newest one'}, {id: 'c', date: '2026-11-23', ts: Date.parse('2026-11-23T08:00:00'), title: 'Morning', text: 'this morning'}]};
    else if(body.name === 'dash') out = {out: {deep: 175, target: 180, shoot: 0, brk: 10, awake: 600, asleep: 420, streak: 4, mrr: 7800, next: {title: 'Call JJS', time: '3:00 PM'}}};
    else if(body.name === 'alarms') out = {out: {ringing: false, snoozed: false, wake: {on: true, label: '7:00 AM'}, work: {on: true, label: '10–6'}}};
    else out = {out: {}};
    r.fulfill({status: 200, contentType: 'application/json', body: JSON.stringify(out)});
  });
  await p.addInitScript(() => { try{ localStorage.setItem('opCode', '123456'); }catch(e){} });
  await p.goto('http://op.local/');
  await p.waitForTimeout(1500);
  const t1 = await p.textContent('#hT'); await p.waitForTimeout(1200); const t2 = await p.textContent('#hT');
  check('the phone opens on a live view: Locked in, a ticking timer', /Locked in/i.test(await p.textContent('#hK')) && /^1:08:2\d$/.test(t1) && t1 !== t2, {t1, t2});
  check('…with today’s deep work against the goal, what you’re on, tasks, streak and quests', /2h 55m of 3h/.test(await p.textContent('#hS')) && /Cut 3 reels/.test(await p.textContent('#hTask')) && (await p.textContent('#hTasks')) === '2/7' && (await p.textContent('#hQ')) === '3/10');
  await p.screenshot({path: path.join(__dirname, '.out', 'phone-live.png')});
  await p.click('nav [data-tab="More"]'); await p.waitForTimeout(300);
  await p.click('#moreSeg [data-more="journal"]'); await p.waitForTimeout(600);
  const order = await p.$$eval('#jList .je b, #jList .je p', (els) => els.map((e) => e.textContent));
  check('the journal on the phone: newest on top', order.indexOf('Newest') >= 0 && order.indexOf('Newest') < order.indexOf('Morning') && order.indexOf('Morning') < order.indexOf('Older'), order);
  await b.close();
  report('Round 77 phone');
})();
