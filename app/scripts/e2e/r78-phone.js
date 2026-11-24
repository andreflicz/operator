// Round 78 — Log workout and XP on the phone, against a stand-in Mac.
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
    else if(body.name === 'xp') out = {out: {level: 7, total: 4210, pct: 0.62, canLevel: false, toNext: 380, today: 85, week: 640, rank: 'Operator', quests: [{label: 'Lock in for 3h', icon: '🔒', done: true, xp: 60}, {label: 'Log a workout', icon: '💪', done: false, xp: 40}, {label: 'Touch every client', icon: '🤝', done: false, xp: 50}]}};
    else if(body.name === 'workoutTypes') out = {out: {types: [{id: 'Lift', label: 'Lift', icon: '🏋️'}, {id: 'Run', label: 'Run', icon: '🏃'}, {id: 'Walk', label: 'Walk', icon: '🚶'}, {id: 'Boxing', label: 'Boxing', icon: '🥊'}], week: 2, today: 0}};
    else if(body.name === 'workout'){ global.__wk = body.args; out = {out: {ok: true, say: body.args.type + ' · ' + body.args.minutes + ' min. Logged.'}}; }
    else out = {out: {}};
    r.fulfill({status: 200, contentType: 'application/json', body: JSON.stringify(out)});
  });
  await p.addInitScript(() => { try{ localStorage.setItem('opCode', '123456'); }catch(e){} });
  await p.goto('http://op.local/');
  await p.waitForTimeout(1500);
  const t1 = await p.textContent('#hT'); await p.waitForTimeout(1200); const t2 = await p.textContent('#hT');
  check('the phone opens on a live view: Locked in, a ticking timer', /Locked in/i.test(await p.textContent('#hK')) && /^1:08:2\d$/.test(t1) && t1 !== t2, {t1, t2});
  check('…with today’s deep work against the goal, what you’re on, tasks, streak and quests', /2h 55m of 3h/.test(await p.textContent('#hS')) && /Cut 3 reels/.test(await p.textContent('#hTask')) && (await p.textContent('#hTasks')) === '2/7' && (await p.textContent('#hQ')) === '3/10');
  await p.waitForTimeout(500);
  check('XP on the front: level, how far to the next, quests', (await p.textContent('#xpL')) === '7' && /380 XP to level 8/.test(await p.textContent('#xpS')) && (await p.$$('#xpQ > div')).length === 3);
  check('a big Log workout button on the front', await p.isVisible('#wkB'));
  await p.screenshot({path: path.join(__dirname, '.out', 'phone-r78.png'), fullPage: true});
  await p.click('#wkB'); await p.waitForTimeout(500);
  await p.click('#wkTypes [data-wt="Boxing"]'); await p.click('#wkMins [data-wm="60"]');
  await p.screenshot({path: path.join(__dirname, '.out', 'phone-r78-wk.png')});
  await p.click('#wkGo'); await p.waitForTimeout(500);
  check('it logs the real workout (type and minutes) and closes', global.__wk && global.__wk.type === 'Boxing' && global.__wk.minutes === 60 && await p.isHidden('#wkSheet'), global.__wk);
  await b.close();
  report('Round 78 phone');
})();
