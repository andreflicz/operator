// Round 20: ratings where nothing counts twice (Grind, Scaling, Goals, Finances like a credit score, Sleep,
// Discipline = standards kept / follow-through / check-ins); the week and the month — check in, tick
// goals, check out, XP for each (weekly a little, monthly more, master a lot); Health on one page (Body &
// Fuel, the + sheet, no log form); your level always in the corner; Good morning — Today with room, the
// quarter on top with the week and month swapping, a good-day reel you can move, local headlines,
// sports that retries and says why, more leagues, no strip of sky at the bottom.
const { instrument, launch, check, report, OUT } = require('./common.js');
const path = require('path');
const CORS = {'Access-Control-Allow-Origin':'*'};
const okJ = {status:200, body:'{"ok":true}', headers:CORS};
async function ctxPage(b, seed, opts){
  opts = opts || {};
  const ctx = await b.newContext({viewport: opts.viewport || {width:1440, height:900}}); const p = await ctx.newPage(); p.errors = []; p.on('pageerror', e => p.errors.push(e.message));
  if(opts.clock) await p.clock.install({time:opts.clock});
  await p.addInitScript((seed) => { if(sessionStorage.getItem('s')) return; sessionStorage.setItem('s', '1'); Object.keys(seed).forEach(k => localStorage.setItem('opsdash:'+k, JSON.stringify(seed[k]))); }, seed);
  await p.route('http://127.0.0.1:8935/**', opts.route || (r => r.fulfill(okJ)));
  if(opts.routeAll) await p.route(/^https:\/\//, opts.routeAll);
  await p.goto('file://'+path.resolve(OUT+'/r20.html')); await p.waitForTimeout(500);
  return p;
}
(async () => {
  instrument(process.argv[2], OUT+'/r20.html');
  const b = await launch();
  const WED = new Date(2026,9,14,10,0,5).getTime(), SUN = new Date(2026,9,18,19,0,5).getTime();
  const WAKE = {enabled:true, time:'07:00', days:[0,1,2,3,4,5,6], news:true, newsSports:'Giants', intro:'quick', introChosen:true, voice:false};

  // ---- the ratings: each thing once ----
  {
    const p = await ctxPage(b, {profile:{name:'Andre', heightIn:70}, finances:{debts:[{id:'d', name:'Card', balance:5000, originalAmount:10000}], payments:[{id:'p1', date:'2026-10-01', amount:200}, {id:'p2', date:'2026-09-05', amount:200}], income:[]}}, {clock:WED});
    const E = c => p.evaluate(x => window.__op.ev(x), c);
    const subs = JSON.parse(await E("JSON.stringify(Object.fromEntries(['BUS','PER','HLT','DIS'].map(k => [k, xpSummaryFresh().attrs[k].subs.map(s => s.label)])))"));
    // (round 22: every stat one word, three a rating; one Content stat; no Sleep)
    // (round 23: Content is on both, just called Content)
    check('Business: MRR · Grind · Scaling · Content (no Clients, no "Time put in")', JSON.stringify(subs.BUS)===JSON.stringify(['MRR', 'Grind', 'Scaling', 'Content']), subs.BUS);
    check('Personal: Content · Goals · Finances · Mind (no Reflection)', JSON.stringify(subs.PER)===JSON.stringify(['Content', 'Goals', 'Finances', 'Mind']), subs.PER);
    check('Health: Training · Diet · Weight', JSON.stringify(subs.HLT)===JSON.stringify(['Training', 'Diet', 'Weight']), subs.HLT);
    check('Discipline: Reliability · Consistency (no On target, no Streak)', JSON.stringify(subs.DIS)===JSON.stringify(['Reliability', 'Consistency']), subs.DIS);
    const all = [].concat(subs.BUS, subs.PER, subs.HLT, subs.DIS);
    check('…and no stat appears twice in a rating', ['BUS','PER','HLT','DIS'].every(k => new Set(subs[k]).size===subs[k].length));
    const inDebt = JSON.parse(await E("JSON.stringify(financeRating())"));
    check('Finances reads like a credit score — in debt, half paid, paying: mid', inDebt.score > 500 && inDebt.score < 740 && /Score \d{3}/.test(inDebt.note), inDebt);
    await E("state.finances.payments = []");
    const noPay = JSON.parse(await E("JSON.stringify(financeRating())"));
    check('…stop paying and it drops', noPay.score < inDebt.score, [noPay.score, inDebt.score]);
    await E("state.finances.debts[0].balance = 0; state.finances.income = [{id:'i', date:'2026-10-10', amount:20000}]; state.profile.revenueGoalMonthly = 20000");
    const free = JSON.parse(await E("JSON.stringify(financeRating())"));
    check('…debt-free and earning: top of the scale', free.score >= 840, free);
    await E("state.finances = {debts:[], payments:[], income:[]}");
    check('…nothing entered: not rated (no free points)', await E("financeRating().f")===null);
    await E("ui.view='personal'; ui.personalTab='you'; renderView(); ACTIONS.openXpHow()"); await p.waitForTimeout(200);
    const guide = await p.textContent('#xpHowContent');
    check('the guide explains Grind, Scaling, check-ins and master goals', /Grind/.test(guide) && /Scaling/.test(guide) && /check out/i.test(guide) && /master goal/i.test(guide) && !/Reflection/.test(guide));
    check('no page errors (ratings)', p.errors.length===0, p.errors);
    await p.context().close();
  }

  // ---- check in: the month, then the week; goals you tick; XP ----
  {
    const p = await ctxPage(b, {profile:{name:'Andre'}, focus:{wake:WAKE}, journal:{entries:[], intentions:{months:{'2026-09':{goal:'Old month goal', at:1}}, weeks:{'2026-09-28':{win:'Old week win', at:1}}, prompted:{}}}}, {clock:WED});
    const E = c => p.evaluate(x => window.__op.ev(x), c);
    check('older month/week text became goals (kept on the record)', await E("tierGoals('month','2026-09').length===1 && tierGoals('week','2026-09-28')[0].label==='Old week win'"));
    await E("ui.view='calendar'; renderView()"); await p.waitForTimeout(1700);
    check('Calendar asks for the month check-in — three goals, a habit, a note', await p.isVisible('#intOverlay.is-in') && /Month check-in/.test(await p.textContent('#intContent')) && (await p.$$('#intContent .int-g')).length===3 && await p.isVisible('#int_habit'));
    await p.fill('#int_goal', 'Sign two new clients'); await p.fill('#int_goal2', 'Launch the funnel'); await p.fill('#int_habit', 'Phone in bed');
    await p.click('[data-action="saveIntent"]'); await p.waitForTimeout(1500);
    check('saving makes two monthly goals', await E("tierGoals('month', monthKey()).map(g=>g.label).join('|')")==='Sign two new clients|Launch the funnel');
    check('…and the week check-in comes next', await p.isVisible('#intOverlay.is-in') && /Week check-in/.test(await p.textContent('#intContent')));
    for (const [i, l] of [['', '20h deep work'], ['2', '4 workouts'], ['3', 'Post 3 reels']]) await p.fill('#int_goal'+i, l);
    await p.fill('#int_focus', 'Finish the JJS launch');
    await p.click('[data-action="saveIntent"]'); await p.waitForTimeout(600);
    check('three weekly goals', await E("tierGoals('week', weekKey()).length")===3);
    check('…and nothing left in the notifications', !(await E("notifList().some(n => n.kind==='intent')")));
    check('the Calendar shows the week and the month as lists you tick', (await p.$$('.tg-strip .tg-card')).length===2 && (await p.$$('.tg-strip .tg-row')).length===5);
    const x0 = await E("xpLast=null, xpSummaryFresh().total");
    await p.click('.tg-strip .tg-card.is-week .tg-row >> nth=0'); await p.waitForTimeout(300);
    const x1 = await E("xpLast=null, xpSummaryFresh().total");
    check('a weekly goal hit: +150 XP', x1 - x0===150, [x0, x1]);
    await p.click('.tg-strip .tg-card.is-month .tg-row >> nth=0'); await p.waitForTimeout(300);
    const x2 = await E("xpLast=null, xpSummaryFresh().total");
    check('a monthly goal hit: +500 XP', x2 - x1===500, [x1, x2]);
    await p.click('.tg-strip .tg-card.is-month .tg-row >> nth=0'); await p.waitForTimeout(300);
    check('un-tick it and it’s taken back', await E("xpLast=null, xpSummaryFresh().total")===x1);
    await E("['a','b','c'].forEach(l => state.goals.items.push(newTierGoal('week', weekKey(), l))); tierGoals('week', weekKey()).forEach(g => g.done = true)");
    check('only three weekly goals pay a week (6 ticked → +450)', await E("xpLast=null, xpCheckins().parts.weekGoals")===450);
    await E("ui.view='personal'; ui.personalTab='goals'; renderView()"); await p.waitForTimeout(300);
    // (round 25: no + on the cards; the + in the corner adds a goal)
    check('Goals tab: The week & the month (adding is the + in the corner)', (await p.$$('.tab-panel .tg-card')).length===2 && !(await p.$('.tg-card [data-action="openGoalSheet"]')));
    check('…and they’re not mixed into "Your goals"', (await p.$$('.tab-panel .goal-card')).length===0);
    check('master goals say what they pay (round 23: scaled to the goal)', /\+[\d,]+ XP/.test(await p.textContent('.mg-wrap')));
    check('no page errors (check in)', p.errors.length===0, p.errors);
    await p.context().close();
  }

  // ---- check out: Sunday — hit or missed, what went well, XP ----
  {
    const wk = '2026-10-12';
    const goals = [{id:'w1', tier:'week', pk:wk, label:'20h deep work', done:true}, {id:'w2', tier:'week', pk:wk, label:'4 workouts', done:false}];
    const p = await ctxPage(b, {profile:{name:'Andre', xpStart:'2026-10-01'}, focus:{wake:WAKE}, goals:{items:goals}, journal:{entries:[], intentions:{months:{'2026-10':{habit:'Phone in bed', at:1}}, weeks:{[wk]:{focus:'JJS', at:1}}, prompted:{}, goalsMoved:1}}}, {clock:SUN});
    const E = c => p.evaluate(x => window.__op.ev(x), c);
    check('Sunday: the week is due for check-out (and it’s in the notifications)', await E("checkoutDue().some(c => c.kind==='week' && c.key==='"+wk+"')") && await E("notifList().some(n => n.key==='checkout:week:"+wk+"')"));
    await E("ui.view='calendar'; renderView()"); await p.waitForTimeout(1700);
    check('the Calendar opens the check-out first', await p.isVisible('#intOverlay.is-in') && /Week check-out/.test(await p.textContent('#intContent')) && (await p.$$('#intContent .co-row')).length===2);
    const before = await E("xpLast=null, xpSummaryFresh().total");
    await p.click('#intContent .co-row >> nth=1 >> [data-v="1"]');
    await p.fill('#co_well', 'Shipped the launch'); await p.fill('#co_fix', 'Earlier gym');
    await p.click('[data-action="saveCheckout"]'); await p.waitForTimeout(700);
    const after = await E("xpLast=null, xpSummaryFresh().total");
    check('checking out: both hit (+150 +150 already one ticked) and +50 for the check-out', after - before===150 + 50, [before, after]);
    check('…the record is kept (what went well)', await E("periodRec('week','"+wk+"').out.well")==='Shipped the launch');
    check('…the SYSTEM window shows what it paid', await p.isVisible('#sysWin') && /checked out/i.test(await p.textContent('#sysWin')));
    await E("ACTIONS.sysClose()");
    await E("ACTIONS.tierGoalToggle(null, null, 'w1')");
    check('a checked-out week is locked (on the record)', await E("state.goals.items.find(g => g.id==='w1').done")===true);
    check('no page errors (check out)', p.errors.length===0, p.errors);
    await p.context().close();
  }

  // ---- master goals pay big, once a milestone ----
  {
    const p = await ctxPage(b, {profile:{name:'Andre', revenueGoalMonthly:5000, xpStart:'2026-10-13', xpMrrBase:5000}, business:{clients:[{id:'a', name:'A', stage:'active', status:'active', mrr:6000}]}}, {clock:WED});
    const E = c => p.evaluate(x => window.__op.ev(x), c);
    // (round 23: master goals pay by size, 2,000 at least)
    check('MRR goal reached: pays (2,000 at least)', await E("xpLast=null, xpSummaryFresh().master.hits")===1 && await E("xpMaster(xpCtx()).xp")===2000);
    await E("state.profile.revenueGoalMonthly = 5500");
    check('…nudging the target up a little doesn’t pay again', await E("xpLast=null, xpSummaryFresh().master.hits")===1);
    await E("state.profile.revenueGoalMonthly = 6000");
    check('…a real step up (+$1k) and reaching it does', await E("xpLast=null, xpSummaryFresh().master.hits")===2);
    check('no page errors (master)', p.errors.length===0, p.errors);
    await p.context().close();
  }

  // ---- Health: one page; the + sheet logs things ----
  {
    const p = await ctxPage(b, {profile:{name:'Andre', calorieTarget:2200, weeklyWorkoutTarget:4}, health:{gymLog:[], weightLog:[{id:'a', date:'2026-10-05', weight:210}, {id:'b', date:'2026-10-13', weight:208.5}], calorieEntries:[]}, meals:{library:[{id:'m1', name:'Chicken bowl', calories:780}]}}, {clock:WED});
    const E = c => p.evaluate(x => window.__op.ev(x), c);
    await E("ui.view='personal'; ui.personalTab='fitness'; renderView()"); await p.waitForTimeout(300);
    check('Health is one page: no Workouts/Weight/Calories tabs', (await p.$$('.tab-panel .subtab')).length===0);
    check('…Body & Fuel together in one card (weight, trend, goal; calories ring, go-tos)', await p.isVisible('#bodyFuel .bf-body') && await p.isVisible('#bodyFuel .bf-fuel') && /208.5/.test(await p.textContent('#bodyFuel .bf-now')) && await p.$('#bodyFuel .bf-spark')!==null);
    check('…no "Log a workout" form on the page', await p.$('#viewRoot [data-action="fitLog"]')===null && await p.$('#viewRoot #gymType')===null);
    // (round 21: no log buttons on the page — the + sheet does it)
    await E("openHealthSheet('weight')"); await p.fill('#hsWeight', '208'); await p.click('[data-action="hsWeight"]'); await p.waitForTimeout(200);
    check('log a weigh-in (the + sheet)', await E("state.health.weightLog.length")===3);
    await p.click('#bodyFuel .hc-pick'); await p.waitForTimeout(200);
    check('one tap logs a go-to meal', await E("state.health.calorieEntries.length")===1 && /1420/.test(await p.textContent('#bodyFuel .hc-left')));
    await p.click('#fabAdd'); await p.waitForTimeout(250);
    check('the + opens a small sheet: Workout · Weight · Food', await p.isVisible('#healthSheet:not(.hidden)') && (await p.$$('#healthSheet .hs-seg button')).length===3);
    await p.click('#healthSheet [data-action="fitPickType"][data-id="Run"]'); await p.click('#healthSheet [data-action="fitPickDur"][data-id="30"]'); await p.click('#healthSheet [data-action="fitLog"]'); await p.waitForTimeout(250);
    check('…a workout in three taps', await E("state.health.gymLog.length===1 && state.health.gymLog[0].type==='Run' && state.health.gymLog[0].duration===30") && await p.isHidden('#healthSheet'));
    check('…and the week strip shows it', await p.isVisible('.fit-day.is-today.is-done'));
    await E("openHealthSheet('weight')"); await p.fill('#hsWeight', '207.6'); await p.keyboard.press('Enter'); await p.waitForTimeout(200);
    check('…a weigh-in from the sheet (Enter logs it)', await E("state.health.weightLog.some(w => Number(w.weight)===207.6)"));
    await E("openHealthSheet('food')"); await p.fill('#hsFood', 'Eggs'); await p.fill('#hsCal', '400'); await p.click('#healthSheet .hs-go'); await p.waitForTimeout(200);
    check('…and food', await E("state.health.calorieEntries.length")===2);
    check('no page errors (health)', p.errors.length===0, p.errors);
    await p.context().close();
  }

  // ---- your level, always in the corner ----
  {
    const p = await ctxPage(b, {profile:{name:'Andre'}}, {clock:WED});
    const E = c => p.evaluate(x => window.__op.ev(x), c);
    await E("ui.view='calendar'; renderView()"); await p.waitForTimeout(1600); await E("ACTIONS.closeIntent()"); await p.waitForTimeout(400);
    check('the level chip sits in the top-right corner', await p.isVisible('#musicDock .md-lvl') && /0/.test(await p.textContent('#musicDock .md-lvl')));
    await p.click('#musicDock .md-lvl'); await p.waitForTimeout(300);
    check('…click it: level, the bar, XP to go, the four ratings', await p.isVisible('#lvlPop.is-in') && /Level/.test(await p.textContent('#lvlPop')) && (await p.$$('#lvlPop .lp-attrs span')).length===4 && /to go/.test(await p.textContent('#lvlPop')));
    await p.mouse.click(600, 600); await p.waitForTimeout(300);
    check('…click anywhere else and it closes', !(await p.$('#lvlPop.is-in')));
    await E("ui.view='today'; renderView()"); await p.waitForTimeout(400);
    const away = await E("!!document.querySelector('#viewRoot .pcf, #viewRoot .pc')");
    if(away) check('on Today, with the level card on screen, the chip steps aside', await p.$('#musicDock .md-lvl.is-away')!==null);
    check('no page errors (level chip)', p.errors.length===0, p.errors);
    await p.context().close();
  }

  // ---- Good morning ----
  {
    const TEAM = {NYG:'New York Giants', DAL:'Dallas Cowboys', NYY:'New York Yankees', BOS:'Boston Red Sox'};
    const ev = (id, h, a, hs, as, st, date) => ({id, date, status:{type:{state:st, shortDetail: st==='post'?'Final':'7:05 PM'}}, competitions:[{competitors:[{homeAway:'home', score:hs, winner: st==='post' && +hs>+as, team:{abbreviation:h, displayName:TEAM[h], shortDisplayName:TEAM[h].split(' ').pop()}},{homeAway:'away', score:as, winner: st==='post' && +as>+hs, team:{abbreviation:a, displayName:TEAM[a], shortDisplayName:TEAM[a].split(' ').pop()}}]}]});
    const seen = [];
    let sportsFail = true;
    const route = r => { const u = r.request().url(); seen.push(u);
      if(u.includes('/sports')){ if(sportsFail) return r.fulfill({status:502, headers:CORS, body:'{}'}); return r.fulfill({status:200, headers:CORS, body:JSON.stringify({events: u.includes('l=nfl') ? [ev('1','NYG','DAL','24','17','post','2026-10-13T23:00Z')] : u.includes('l=mlb') ? [ev('2','NYY','BOS','','','pre','2026-10-14T23:05Z')] : []})}); }
      if(u.includes('/news')){ const q = (u.match(/[?&]q=([0-9a-f]+)/)||[])[1]; const local = q && Buffer.from(q, 'hex').toString('utf8').includes('Brooklyn');
        return r.fulfill({status:200, headers:CORS, body:'<rss><channel>'+[1,2,3,4,5,6,7,8].map(i => '<item><title>'+(local ? 'Brooklyn story '+i : 'Top story '+i)+' - Wire</title><link>https://x.com/'+i+'</link></item>').join('')+'</channel></rss>'}); }
      return r.fulfill(okJ); };
    const routeAll = r => r.fulfill({status:500, body:''});
    const p = await ctxPage(b, {profile:{name:'Andre'}, settings:{weather:{lat:40.68, lon:-73.94, place:'Brooklyn, New York'}}, focus:{wake:WAKE},
      calendar:{events:[{id:'e1', date:'2026-10-14', time:'13:00', title:'Call with JJS'}, {id:'e2', date:'2026-10-14', time:'16:00', title:'Shoot B-roll'}, {id:'e3', date:'2026-10-14', time:'18:00', title:'Dinner with Mia'}]},
      goals:{items:[{id:'w1', tier:'week', pk:'2026-10-12', label:'20h deep work'}, {id:'m1', tier:'month', pk:'2026-10', label:'Sign two clients'}]},
      journal:{entries:[], intentions:{months:{'2026-10':{habit:'Phone in bed', at:1}}, weeks:{'2026-10-12':{focus:'JJS launch', at:1}}, prompted:{}, goalsMoved:1}}}, {clock:WED, route, routeAll});
    const E = c => p.evaluate(x => window.__op.ev(x), c);
    await E("fireWake({})"); await p.click('[data-action="wakeStartDay"]'); await p.waitForTimeout(900);
    await E("briefRevealAll()"); await p.clock.runFor(3000); await p.waitForTimeout(900);
    const today = await p.textContent('.br-day');
    const shown = (await p.$$('.br-day .bd-r:not(.is-cut)')).length, more = await p.evaluate(() => { const m = document.querySelector('.br-day .bd-more'); return m && !m.hidden ? m.textContent : ''; });
    check('Today: the calendar with room — what doesn’t fit says "+N more" (nothing half-cut, nothing silently gone)', /Call with JJS/.test(today) && shown >= 2 && (shown===3 || new RegExp('\\+'+(3-shown)+' more').test(more)), [shown, more]);
    check('the quote always fits its box (no words cut off)', await p.evaluate(() => { const b = document.querySelector('.br-quote .qt blockquote'); return b && b.scrollHeight <= b.clientHeight + 1; }));
    check('the month panel leads with the quarter (Q4 · days left)', /Q4/.test(await p.textContent('.br-intent .bi-qh')) && /days? left/.test(await p.textContent('.br-intent .bi-qh')));
    const s0 = await p.textContent('.br-intent .bi-slide.is-on p');
    await p.click('.br-intent [data-action="biStep"][data-id="1"]'); await p.waitForTimeout(200);
    const s1 = await p.textContent('.br-intent .bi-slide.is-on p');
    check('…and underneath it swaps between the week’s goals, the month’s, the habit (‹ › to move it)', s0!==s1 && ['20h deep work', 'Sign two clients', 'Phone in bed', 'JJS launch'].includes(s1.trim()), [s0, s1]);
    const g0 = await E("ui.gdIdx||0");
    await p.click('.br-goodday [data-action="gdStep"][data-id="1"]'); await p.waitForTimeout(200);
    check('For a Good Day: › moves it by hand', await E("ui.gdIdx||0")===g0+1);
    await p.hover('.br-goodday .gd-reel'); await p.mouse.wheel(0, 80); await p.waitForTimeout(200);
    check('…so does a swipe', await E("ui.gdIdx||0")===g0+2);
    await p.click('.br-goodday .gd-dots i >> nth=0'); await p.waitForTimeout(200);
    check('…and a dot jumps to that one', await E("ui.gdIdx||0")===0);
    check('the reel’s rows share the panel’s height (no empty space under it)', await p.evaluate(() => { const r = document.querySelector('.br-goodday .gd-reel'), pn = document.querySelector('.br-goodday'); const nav = pn.querySelector('.gd-nav'); return pn.getBoundingClientRect().bottom - nav.getBoundingClientRect().bottom < 40; }));
    check('headlines: local ones from where you are, tagged', /Brooklyn story/.test(await p.textContent('.br-news')) && /Local/.test(await p.textContent('.br-news .br-tag')) && seen.some(u => u.includes('/news?q=') && Buffer.from(u.match(/q=([0-9a-f]+)/)[1], 'hex').toString().includes('Brooklyn')));
    check('…top stories ask for the top (not one radio network)', seen.some(u => /\/news\?t=top/.test(u)));
    check('…as many as fit — nothing half-cut, no big gap under them', await p.evaluate(() => { const l = document.querySelector('.br-news-list'); const vis = [...l.children].filter(c => !c.classList.contains('is-cut')); const last = vis[vis.length-1]; return vis.length >= 4 && l.getBoundingClientRect().bottom - last.getBoundingClientRect().bottom < 60; }));
    check('sports that can’t be reached says so (and offers to try now)', /Couldn’t reach ESPN/.test(await p.textContent('.br-sports')) && await p.isVisible('.br-sports [data-action="scoresRetry"]'));
    check('…it asks for MLB and NHL too, not just NFL/NBA', ['nfl', 'nba', 'mlb', 'nhl'].every(l => seen.some(u => u.includes('/sports?l='+l))));
    sportsFail = false;
    await p.clock.runFor(21000); await p.waitForTimeout(800);
    check('…and tries again on its own: the scores show up (yesterday’s result, tonight’s game)', (await p.$$('.br-sports .sb-row')).length>=2 && /Giants/.test(await p.textContent('.br-sports')) && /Yankees|Red Sox/.test(await p.textContent('.br-sports')), await p.textContent('.br-sports'));
    check('no strip of plain sky at the bottom while it rises in (the wash covers the whole screen)', await p.evaluate(() => { const st = [...document.styleSheets].flatMap(s => { try{ return [...s.cssRules]; }catch(e){ return []; } }).filter(r => r.selectorText==='#wakeOverlay.is-entering::after'); return st.some(r => /-25vh/.test(r.style.inset || r.style.top)); }));
    check('no page errors (Good morning)', p.errors.length===0, p.errors);
    await p.context().close();
  }

  await b.close();
  process.exit(report()?1:0);
})();
