// Round 22: levels that cost a lot (a client is about level 1, two more for level 2), tasks that pay more
// the more you do, deep work with 8 hours as the gold standard, a client 1,000, beating the month's habit
// 500, outreach to leads counts; every stat one word, three a rating (one Content stat, no Sleep);
// Health from what you've done lately (Training, Diet) with your weight as a ceiling; Discipline =
// Integrity · Reliability · Consistency (with a trend); You without "Your body" (it's on Health now),
// the last 7 days and your records; your XP history in the guide; no long dashes in the copy.
const { instrument, launch, check, report, OUT } = require('./common.js');
const path = require('path');
const CORS = {'Access-Control-Allow-Origin':'*'};
const okJ = {status:200, body:'{"ok":true}', headers:CORS};
async function ctxPage(b, seed, opts){
  opts = opts || {};
  const ctx = await b.newContext({viewport: opts.viewport || {width:1440, height:900}}); const p = await ctx.newPage(); p.errors = []; p.on('pageerror', e => p.errors.push(e.message));
  if(opts.clock) await p.clock.install({time:opts.clock});
  await p.addInitScript((seed) => { if(sessionStorage.getItem('s')) return; sessionStorage.setItem('s', '1'); Object.keys(seed).forEach(k => localStorage.setItem('opsdash:'+k, JSON.stringify(seed[k]))); }, seed);
  await p.route('http://127.0.0.1:8935/**', r => r.fulfill(okJ));
  await p.goto('file://'+path.resolve(OUT+'/r22.html')); await p.waitForTimeout(500);
  return p;
}
const day = (base, n) => { const d = new Date(base); d.setDate(d.getDate()+n); return d.getFullYear()+'-'+String(d.getMonth()+1).padStart(2, '0')+'-'+String(d.getDate()).padStart(2, '0'); };
(async () => {
  instrument(process.argv[2], OUT+'/r22.html');
  const b = await launch();
  const WED = new Date(2026,9,14,10,0,5).getTime(), T = new Date(2026,9,14,12);

  // ---- XP and levels ----
  {
    const p = await ctxPage(b, {profile:{name:'Andre', xpStart:'2026-09-01', xpLevel:8, xpMrrBase:0, xpClientsBase:[]}}, {clock:WED});
    const E = c => p.evaluate(x => window.__op.ev(x), c);
    check('a level claimed on the old curve comes down to what the XP buys now', await E("xpLast=null, xpSummaryFresh().level")===0 && await E("state.profile.xpCurve")===2);
    const L = JSON.parse(await E("JSON.stringify([1,2,3,5,10,20,50,100].map(xpForLevel))"));
    check('level 1 is about a client won (1,500)', L[0]===1500, L);
    check('level 2 takes at least two more clients on top', L[1] - L[0] >= 2*1000, L);
    check('each level costs more than the last, and the top is over a million', await E("(function(){ for(let i=1;i<100;i++) if(xpForLevel(i+1)-xpForLevel(i) <= xpForLevel(i)-xpForLevel(i-1)) return false; return true; })()") && L[7] > 1e6, L);
    check('a client won: +1,000', await E("XP_RATES.client")===1000);
    check('beating the month’s habit: +500', await E("CHECKIN_XP.habit")===500);
    const tx = JSON.parse(await E("JSON.stringify([1,2,3,10,11,12].map(taskXpAt))"));
    check('tasks pay more the more you do (5, 7, 9 … up to 25)', tx[0]===5 && tx[1]===7 && tx[2]===9 && tx[3]===23 && tx[4]===25 && tx[5]===25, tx);
    check('ten tasks in a day: 140 XP; past 20 they stop counting', await E("xpTasks(10)")===140 && await E("xpTasks(25)===xpTasks(20)"));
    const dw = JSON.parse(await E("JSON.stringify([60,240,480,600].map(m => Math.round(xpDeep(m,0).xp)))"));
    check('deep work: every hour pays more, 8 hours is 150 (then 15 an hour)', dw[0]===10 && dw[2]===150 && dw[3]===180 && dw[1] < dw[2]/2, dw);
    check('…and past your normal pays 8 an hour more', await E("Math.round(xpDeep(300,180).xp - xpDeep(300,0).xp)")===16);
    // an 8-hour day and ten tasks
    await E(`state.focus.sessions.push({id:'s1', date:'2026-10-13', minutes:480, type:'deep'}); for(let i=0;i<10;i++) state.tasks.items.push({id:'t'+i, title:'T'+i, status:'done', completedAt:'2026-10-13'}); xpCache={sig:'',days:{}}; xpLast=null`);
    const d13 = JSON.parse(await E("JSON.stringify(xpDay('2026-10-13', xpCtx()))"));
    check('an 8-hour day pays the gold standard bonus (+100)', d13.some(i => i.k==='gold' && i.xp===100) && !d13.some(i => i.k==='long'), d13);
    check('…and the ten tasks pay 140', d13.some(i => i.k==='tasks' && i.xp===140), d13);
    // outreach: touches on leads count now (they used to be missed)
    await E(`state.business.pipeline.push({id:'l1', name:'Lead', touchpoints:[{id:'a', date:'2026-10-13', type:'text'}, {id:'b', date:'2026-10-13', type:'call'}]}); state.business.clients.push({id:'c1', name:'Old', stage:'active', mrr:0, touches:['2026-10-13'], touchpoints:[{id:'c', date:'2026-10-13', type:'text'}]}); xpCache={sig:'',days:{}}; xpLast=null`);
    const o13 = JSON.parse(await E("JSON.stringify(xpDay('2026-10-13', xpCtx()).find(i => i.k==='outreach'))"));
    check('outreach: touches on leads count, a client’s touch isn’t counted twice (3 → 22 XP)', o13 && o13.xp===22 && /3 reach-outs/.test(o13.why), o13);
    // a client won pays 1,000
    const x0 = await E("xpLast=null, xpSummaryFresh().total");
    await E("state.business.clients.push({id:'c2', name:'New', business:'Acme', stage:'active', mrr:0, startDate:'2026-10-14'}); xpLast=null");
    check('winning a client: +1,000 XP', await E("xpSummaryFresh().total") - x0===1000);
    check('no page errors (XP)', p.errors.length===0, p.errors);
    await p.context().close();
  }

  // ---- Health: what you've done lately, your weight as the ceiling ----
  {
    const p = await ctxPage(b, {profile:{name:'Andre', heightIn:70, weeklyWorkoutTarget:4, calorieTarget:2200, xpStart:'2026-08-01'}, health:{gymLog:[], weightLog:[{id:'w', date:'2026-10-10', weight:250}], calorieEntries:[]}}, {clock:WED});
    const E = c => p.evaluate(x => window.__op.ev(x), c);
    const fresh = () => E("xpLast=null, JSON.stringify(xpSummaryFresh().attrs.HLT)").then(JSON.parse);
    let h = await fresh();
    const all = JSON.parse(await E("JSON.stringify(['BUS','PER','HLT','DIS'].map(k => xpSummaryFresh().attrs[k].subs.map(s => s.label)))"));
    // (round 23: Content is back on Business too, both just called Content)
    check('every stat is one word, Content on Business and Personal', all.flat().every(l => !/\s/.test(l)) && all[0][3]==='Content' && all[1][0]==='Content' && all[2].length===3 && all[3].length===3, all);
    check('Health: Training · Diet · Weight (no Sleep)', JSON.stringify(h.subs.map(s => s.label))==='["Training","Diet","Weight"]', h.subs.map(s => s.label));
    const h0 = h.v;
    check('at 250 lb and 5′10″ (BMI 35.9) the ceiling is about 60', h.cap >= 55 && h.cap <= 60, h.cap);
    const wk = [0,1,3,5].map(n => "{id:'g"+n+"', date:'"+day(T, -n)+"', type:'Lift'}");
    await E("state.health.gymLog.push("+wk.join(',')+")");
    h = await fresh();
    check('a first week of workouts after a long gap moves Health up right away', h.v >= h0 + 15, [h0, h.v]);
    // a perfect month: training on target and eating on target, every day
    const allW = []; for(let w=0; w<4; w++) for(const n of [0,1,3,5]) allW.push("{id:'G"+w+n+"', date:'"+day(T, -(7*w+n))+"', type:'Lift'}");
    const food = []; for(let i=0;i<14;i++) food.push("{id:'f"+i+"', date:'"+day(T, -i)+"', name:'Food', calories:2100}");
    await E("state.health.gymLog = ["+allW.join(',')+"]; state.health.calorieEntries = ["+food.join(',')+"]");
    h = await fresh();
    check('…perfect training and diet, but at that weight Health stops at the ceiling', h.capped && h.v===h.cap && h.v <= 60, h);
    await E("state.health.weightLog.push({id:'w2', date:'2026-10-14', weight:165})");
    h = await fresh();
    check('…at a healthy weight the same month is a high score', h.v >= 85 && !h.cap, h.v);
    // the page
    await E("ui.view='personal'; ui.personalTab='fitness'; renderView()"); await p.waitForTimeout(300);
    check('Health shows your score, the four parts and the BMI scale (moved from You)', await p.isVisible('#healthScore') && await p.isVisible('#healthScore .you-bmi-scale') && (await p.$$('#healthScore .hsc-t')).length===3);
    check('…the weight card is called Weight, not Body', /Weight/.test(await p.textContent('#bodyFuel .bf-body .hl-k')));
    await E("openHealthSheet('food')"); await p.waitForTimeout(200);
    check('no sleep anywhere: not in the + sheet, not on Health', (await p.$$('#healthSheet .hs-seg button')).length===3 && !/sleep/i.test(await p.textContent('#healthScore')));
    check('no page errors (health)', p.errors.length===0, p.errors);
    await p.context().close();
  }

  // ---- Discipline ----
  {
    const p = await ctxPage(b, {profile:{name:'Andre', xpStart:'2026-08-01', weeklyWorkoutTarget:3}, standards:{deepWorkTargetMinutes:120, items:[], completions:[]}}, {clock:WED});
    const E = c => p.evaluate(x => window.__op.ev(x), c);
    const D = () => E("xpLast=null, JSON.stringify(xpSummaryFresh().attrs.DIS)").then(JSON.parse);
    let d = await D();
    check('Discipline: Reliability · Consistency · Action (round 27)', JSON.stringify(d.subs.map(s => s.label))==='["Reliability","Consistency","Action"]', d.subs.map(s => s.label));
    // two weeks ago: nothing. The last two weeks: deep work and a task every day, workouts
    const ss = [], ts = [], gs = [];
    for(let i=1;i<=14;i++){ ss.push("{id:'s"+i+"', date:'"+day(T, -i)+"', minutes:150, type:'deep'}"); ts.push("{id:'t"+i+"', title:'x', status:'done', completedAt:'"+day(T, -i)+"'}"); }
    for(let n=1;n<=14;n++) gs.push("{id:'g"+n+"', date:'"+day(T, -n)+"', type:'Run'}");
    await E("state.focus.sessions.push("+ss.join(',')+"); state.tasks.items.push("+ts.join(',')+"); state.health.gymLog.push("+gs.join(',')+")");
    d = await D();
    const c = d.subs[1];
    check('Consistency rates doing all of it, and says it’s trending up', c.v > 60 && c.trend===1 && /Trending up/.test(c.note), c);
    check('Discipline comes up easily once you’re consistent', d.v >= 70, d);
    check('no page errors (discipline)', p.errors.length===0, p.errors);
    await p.context().close();
  }

  // ---- You, the guide, your XP history ----
  {
    const p = await ctxPage(b, {profile:{name:'Andre', heightIn:70, xpStart:'2026-10-01'}, health:{gymLog:[{id:'g', date:'2026-10-12', type:'Lift'}], weightLog:[{id:'w', date:'2026-10-10', weight:200}], calorieEntries:[]}, focus:{sessions:[{id:'s', date:'2026-10-13', minutes:300, type:'deep'}]}}, {clock:WED});
    const E = c => p.evaluate(x => window.__op.ev(x), c);
    await E("ui.view='personal'; ui.personalTab='you'; renderView()"); await p.waitForTimeout(300);
    check('You: no "Your body" panel any more', !(await p.$('.you .you-body')) && !/Your body/.test(await p.textContent('.you')));
    // (round 23: no text under the stats; it's in the guide and on hover)
    check('…every stat explains itself on hover (no text under it)', (await p.$$('.you .you-sub small')).length===0 && (await p.$$('.you .you-sub[title]')).length===14);
    check('…the last 7 days against the week before, and your records', await p.isVisible('.you-recent .yr-tiles') && (await p.$$('.yr-t')).length >= 5 && /longest day of deep work/.test(await p.textContent('.yr-recs')) && /5\.0h/.test(await p.textContent('.yr-recs')));
    await p.click('.you-q'); await p.waitForTimeout(200);
    const guide = await p.textContent('#xpHowContent');
    check('the guide: 8 hours is the gold standard, more tasks pay more, outreach explained', /gold standard/i.test(guide) && /more you get done/i.test(guide) && /touch you log on a client or a lead/i.test(guide));
    check('…and has a button for your XP history', await p.isVisible('[data-action="openXpHistory"]'));
    await p.click('[data-action="openXpHistory"]'); await p.waitForTimeout(200);
    check('XP history: where it came from and every day, newest first', (await p.$$('.xh-s')).length >= 2 && (await p.$$('.xh-day')).length >= 2 && /Deep work/.test(await p.textContent('.xh-src')));
    const hist = await p.textContent('#xpHowContent');
    check('…back to the guide from there', await p.isVisible('.xpg-back[data-action="openXpHow"]'));
    check('no long dashes in the guide or the history', !/—/.test(guide) && !/—/.test(hist));
    await p.click('.xpg-back[data-action="openXpHow"]'); await p.click('[data-action="closeXpHow"]');
    await E("ui.view='personal'; ui.personalTab='you'; renderView()"); await p.waitForTimeout(200);
    check('no long dashes on You', !/—/.test(await p.textContent('.you')));
    check('no page errors (you)', p.errors.length===0, p.errors);
    await p.context().close();
  }

  await b.close();
  process.exit(report()?1:0);
})();
