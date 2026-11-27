// Round 80 — streaks feed Today's standard (the app checks what it can see), master streaks, the calorie goal,
// the schedule (presets, the week, yes or no, the month, holidays, vacations) running the alarms, cleaner check-ins.
// Run: node scripts/e2e/r80-test.js dist/command-center-2.html
const path = require('path');
const { instrument, launch, newPage, check, report, OUT } = require('./common');
const SRC = process.argv[2] || 'dist/command-center-2.html';
const FILE = path.join(OUT, 'r80.html');
instrument(SRC, FILE);
const money = require('./r79-seed')();
(async () => {
  const browser = await launch();
  const page = await newPage(browser, FILE, Object.assign({profile:{name:'Andre'}, health:{weightLog:[{date:'2026-11-20', weight:198}], calorieEntries:[], gymLog:[]}}, money));
  const errs = []; page.on('pageerror', (e) => errs.push(e.message));
  const ev = (code) => page.evaluate((c) => window.__op.ev(c), `(function(){ ${code} })()`);
  await page.waitForTimeout(1800);

  // ---------- streaks and Today's standard ----------
  const lk = await ev(`state.standards.items = [{id:'cal', label:'Stayed within calorie target', createdAt:addDays(todayStr(), -3)}]; ACTIONS.r63Setup(null, null, 'lockedin'); ACTIONS.r63Start(); return {items:state.standards.items.map(i=>i.label+'|'+(i.track||'')), master:Object.keys(state.standards.master)};`);
  check('a streak’s rules join Today’s standard; work hours and a workout are its own deep work and Trained (no duplicates)', lk.items.indexOf('Work hours|') < 0 && lk.items.indexOf('Workout|') < 0 && lk.items.some(x => /\|outreach$/.test(x)) && lk.items.some(x => /\|journal$/.test(x)), lk);
  check('…and they become master streaks, kept app-wide', ['work', 'workout', 'outreach', 'journal'].every(k => lk.master.indexOf(k) >= 0), lk.master);
  const jr = await ev(`const it = state.standards.items.find(i=>i.track==='journal'); const before = manualStandardsDoneFor ? (getStandardRec(todayStr()).doneIds.indexOf(it.id) >= 0) : null; state.journal.entries.push({id:'j1', date:todayStr(), text:'hi'}); r80Sync(); return {before:before, after:getStandardRec(todayStr()).doneIds.indexOf(it.id) >= 0};`);
  check('a tracked item ticks itself when the app sees it (a journal entry)', jr.before===false && jr.after===true, jr);
  const tg = await ev(`const it = state.standards.items.find(i=>i.track==='outreach'); toggleStandard(it.id); return getStandardRec(todayStr()).doneIds.indexOf(it.id) >= 0;`);
  check('…and your tap can’t override what the app sees', tg===false);
  const df = await ev(`ACTIONS.r80Master(null, null, 'deficit'); return state.standards.items.map(i=>i.label+'|'+(i.track||''));`);
  check('Calorie deficit as a master streak turns "Stayed within calorie target" into the tracked one (no second item)', df.filter(x => /calorie/i.test(x)).length===1 && df.indexOf('Calorie deficit|deficit') >= 0, df);
  const today = await ev(`ui.view='today'; renderView(); return [...document.querySelectorAll('.r60-std-c .chip')].map(c=>c.className+'|'+c.textContent.trim());`);
  check('on Today, the app-checked items are marked and can’t be tapped', today.filter(c => /is-auto/.test(c)).length >= 3, today);
  const own = await ev(`ui.r63Draft = {preset:'own', name:'Gym month', days:30, strict:'twice', useStd:false, rules:[{label:'Two workouts', cue:'', track:'workout2'}, {label:'Stretch', cue:''}]}; ACTIONS.r63Start(); const c = r63Active().find(x=>x.name==='Gym month'); state.health.gymLog.push({date:todayStr(), type:'Lift'}, {date:todayStr(), type:'Run'}); r80Sync(); return {track:c.rules[0].track, ticked:((c.log||{})[todayStr()]||[]).indexOf(c.rules[0].id) >= 0};`);
  check('a streak of its own: a rule the app can check ticks itself (two workouts logged)', own.track==='workout2' && own.ticked, own);
  const ms = await ev(`ui.view='personal'; ui.personalTab='streaks'; renderView(); return {cards:document.querySelectorAll('.r80-mc').length, on:document.querySelectorAll('.r80-mc.is-on').length, auto:document.querySelectorAll('.r80-autot').length};`);
  check('the Streaks page: master streaks (work hours, workout, calorie deficit, reach out, journal) and AUTO on the tracked ones', ms.cards===5 && ms.on >= 4 && ms.auto >= 3, ms);

  // ---------- health ----------
  const hg = await ev(`state.profile.maintCal = 2700; state.profile.deficitCal = 750; r80SetTarget(); ui.personalTab='fitness'; renderView(); return {t:state.profile.calorieTarget, card:!!document.querySelector('.r80-hg'), tip:document.querySelector('.r80-tip').textContent.length > 20};`);
  check('Health: what you burn and the deficit you pick set the calorie target (2700 − 750 = 1950), with Op’s tip', hg.t===1950 && hg.card && hg.tip, hg);
  const est = await ev(`ACTIONS.r80Estimate(); return state.profile.maintCal;`);
  check('…and an estimate from your weight to start with', est===2970, est);

  // ---------- the schedule ----------
  const pre = await ev(`ACTIONS.r80Preset(null, null, 'creator'); const S = r80S(); return {tue:S.week[2].kind, sun:S.week[0].kind, rules:S.rules.length};`);
  check('a preset fills the week and the rules (Creator: Tuesday shoots, Sunday off)', pre.tue==='shoot' && pre.sun==='off' && pre.rules >= 3, pre);
  const al = await ev(`state.focus.wake = state.focus.wake || {}; Object.assign(state.focus.wake, {enabled:false, time:'07:00', days:[1,2,3,4,5], override:null}); state.focus.work = state.focus.work || {}; state.focus.work.enabled = false; state.focus.work.override = null;
    ACTIONS.r80On(); const y = 2026, sun = '2026-12-06', tue = '2026-12-01', thu = '2026-12-03', tg = holThanksgiving(y), xmas = '2026-12-25', mlk = r80NthDow(2027, 0, 1, 3);
    return {on:state.focus.schedule.on, wakeEn:state.focus.wake.enabled, workEn:state.focus.work.enabled, sun:wakeTimeFor(sun), tue:wakeTimeFor(tue), tueWork:workHoursFor(tue).start, sunOff:isDayOff(sun), tueOff:isDayOff(tue), tg:r80Day(tg).kind+'|'+wakeTimeFor(tg), xmas:isDayOff(xmas), mlk:r80Day(mlk).start};`);
  check('on: it runs the wake-up and work alarms (Tuesday: up 6:00, work 7:30; Sunday: up 8:30, off)', al.on && al.wakeEn && al.workEn && al.tue==='06:00' && al.tueWork==='07:30' && al.sun==='08:30' && al.sunOff && !al.tueOff, al);
  check('holidays: Thanksgiving and Christmas off (the alarm sleeps in), MLK Day a work day', /^off\|08:30$/.test(al.tg) && al.xmas && !!al.mlk, al);
  const ov = await ev(`state.focus.wake.override = {date:'2026-12-01', time:'05:00'}; const a = wakeTimeFor('2026-12-01'); state.focus.wake.override = null; return a;`);
  check('a change you make for one morning still wins', ov==='05:00', ov);
  const vac = await ev(`r80S().vacations.push({from:'2027-02-10', to:'2027-02-17', label:'DR'}); return {w:wakeTimeFor('2027-02-12'), off:isDayOff('2027-02-12'), kind:r80Day('2027-02-12').kind};`);
  check('a vacation: no alarm, a day off', vac.w===null && vac.off && vac.kind==='vacation', vac);
  const hp = await ev(`ACTIONS.r80Hol(null, null, 'christmas|work'); return r80Day('2026-12-25').start;`);
  check('change what a holiday is (Christmas as a work day)', !!hp, hp);
  // should I say yes?
  const dec = await ev(`const tue = '2026-12-01', sun = '2026-12-06', wed = '2026-12-02';
    return {during:r80Decide({kind:'social', date:tue, time:'12:00'}), off:r80Decide({kind:'social', date:sun, time:'20:00'}), beforeShoot:r80Decide({kind:'social', date:wed, time:'21:00'}), opp:r80Decide({kind:'opp', date:sun, time:'10:00', paid:false}), fam:r80Decide({kind:'family', date:tue, time:'12:00'})};`);
  check('should I say yes: no during work hours, yes on a day off', !dec.during.yes && /work hours/.test(dec.during.why) && dec.off.yes, dec);
  check('…no to a late night before a shoot, no to unpaid work on your day off, yes to family', !dec.beforeShoot.yes && /shoot/.test(dec.beforeShoot.why) && !dec.opp.yes && dec.fam.yes, dec);
  const cap = await ev(`const S = r80S(); S.social = 2; const ws = startOfWeekStr(todayStr()); S.decisions.push({date:ws, kind:'social', go:true}, {date:addDays(ws, 1), kind:'social', go:true}); const r = r80Decide({kind:'social', date:addDays(ws, 5) > todayStr() ? addDays(ws, 5) : todayStr(), time:'20:00'}); return r;`);
  check('…and it counts your social nights against your limit', !cap.yes && /limit/.test(cap.why), cap);
  const tab = await ev(`ui.view='personal'; ui.personalTab='schedule'; renderView(); return {tab:!!document.querySelector('.tab.active[data-tab="schedule"]'), strip:document.querySelectorAll('.r80-sd').length, week:document.querySelectorAll('.r80-wr').length, hols:document.querySelectorAll('.r80-hol').length, pre:document.querySelectorAll('.r80-pc').length};`);
  check('Personal → Schedule: two weeks at a glance, presets, the week, holidays for the year', tab.tab && tab.strip===14 && tab.week===7 && tab.hols >= 15 && tab.pre===4, tab);
  const mt = await ev(`masterTasksSync(); const t = todayStr(), y = Number(t.slice(0,4)), m = Number(t.slice(5,7)) - 1; const lf = r80LastDow(y, m, 5); return {wrap:state.tasks.items.some(x=>x.master && x.master.kind==='monthWrap'), due:t >= lf};`);
  check('the month: wrap-up and planning show up as tasks on their day', mt.wrap===mt.due, mt);
  const op = await ev(`const s = aiSystem(); const t = s.map(x=>x.text).join('\\n'); return {sched:/His schedule/.test(t), rules:/His rules/.test(t), cal:/Calorie goal/.test(t), ms:/Master streaks/.test(t)};`);
  check('Op knows the schedule, your rules, the calorie goal and the master streaks', op.sched && op.rules && op.cal && op.ms, op);
  const off = await ev(`ACTIONS.r80On(); return {on:state.focus.schedule.on, wake:state.focus.wake.enabled, w:wakeTimeFor('2026-12-01')};`);
  check('turned off, the alarms go back to how they were', !off.on && off.wake===false, off);

  // ---------- check-ins ----------
  const ci = await ev(`r55McOpen(); return new Promise(function(res){ setTimeout(function(){ const box = document.getElementById('r55MoneyContent').getBoundingClientRect(); res({prog:!!document.querySelector('#r55Money .r80-prog'), w:Math.round(box.width)}); }, 300); });`);
  check('the money check-in: a progress line, and a wider sheet', ci.prog && ci.w >= 700, ci);
  check('no page errors', !errs.length, errs);
  await browser.close();
  report('Round 80');
})();
