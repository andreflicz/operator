// Round 44d: Today and Calendar fixes on top of the current look.
const { instrument, launch, newPage, check, report, OUT } = require('./common.js');
(async () => {
  instrument(process.argv[2], OUT+'/r44d.html');
  const b = await launch();
  const at = (d, h, m) => new Date(2026, 9, d, h, m||0).getTime();
  const p = await newPage(b, OUT+'/r44d.html', {profile:{name:'Andre', xpBook:43, xpLevel:0},
    focus:{sessions:[{id:'s1', startedAt:at(24,9), endedAt:at(24,11,30)}, {id:'s2', startedAt:at(26-1,9), endedAt:at(25,10,15)}]},
    modes:{history:[{type:'shooting', startedAt:at(24,13), endedAt:at(24,14,30)}, {type:'break', startedAt:at(25,10,15), endedAt:at(25,10,30)}]},
    tasks:{items:[{id:'t1', title:'Edit JJS reel', status:'done', completedAt:'2026-10-24'}, {id:'t2', title:'Call Kiko', status:'done', completedAt:'2026-10-24'}]}}, at(25,13));
  const E = c => p.evaluate(x => window.__op.ev(x), c);
  await E("document.querySelectorAll('.overlay').forEach(o => o.classList.add('hidden'))");

  await E("state.focus.wake = Object.assign({}, state.focus.wake, {enabled:true, time:'07:30', days:[0,1,2,3,4,5,6]})");
  const rib = await E("cxRibbonHtml()");
  check('Your Day colors what you did: locked in, a break', /Locked in/.test(rib) && /Break/.test(rib) && /r44-leg2/.test(rib), rib.slice(0, 300));
  check('the sun is its own mark, not an emoji pushing the time off center', !/&#9728;/.test(rib) && /<svg/.test(rib));
  check('labels at the edges stay inside', !/left:(-|100\.)/.test(rib));
  const acts = JSON.parse(await E("JSON.stringify(r44DayActivity('2026-10-24'))"));
  check('a past day knows its locked-in and shooting time', acts.some(a => a.k==='locked' && a.b - a.a===150) && acts.some(a => a.k==='shooting' && a.b - a.a===90), acts);

  const ag = await E("cxAgendaHtml('2026-10-24')");
  check('yesterday on the Calendar shows its recap', /r44-recap/.test(ag) && /Locked in/.test(ag) && /Shooting/.test(ag) && /Edit JJS reel/.test(ag));
  check('today has no recap (it is still going)', !/r44-recap/.test(await E("cxAgendaHtml(todayStr())")));
  await E("ui.view='calendar'; renderView()"); await p.waitForTimeout(1600); if(await p.isVisible('#intOverlay.is-in')){ await p.click('#intOverlay .int-x'); await p.waitForTimeout(500); }
  check('This week uses its space: four numbers above the goals', (await p.$$('.r44-ts')).length===4 && /Deep/.test(await p.textContent('.r44-tstats')));
  await p.screenshot({path:OUT+'/r44d-cal.png'});

  await E("state.focus.activeSession = {startedAt:Date.now() - 20*60000, plannedMinutes:60, completedTasks:[], breaks:[], onBreak:false}; ui.view='today'; renderView()"); await p.waitForTimeout(400);
  check('locked in: the quote opens the page (R50)', !!(await p.$('.r44-quote')) && await E("lockedLayout()[0]==='quote'"));
  await E("document.querySelectorAll('.overlay').forEach(o => o.classList.add('hidden'))"); const q1 = await p.textContent('.r44-quote .qt'); await E("nextQuote('work')"); await p.waitForTimeout(150);
  check('tapping it shows another', (await p.textContent('.r44-quote .qt'))!==q1);
  check('no explainer line under the streak', !/rest days still count/.test(await p.textContent('#viewRoot')));
  await p.setViewportSize({width:1900, height:1000}); await p.waitForTimeout(200);
  const w = await E("document.querySelector('.ll-stack').getBoundingClientRect().width");
  check('the locked-in page uses a wide screen', w > 1300, w);
  await p.screenshot({path:OUT+'/r44d-locked.png'});
  await E("state.profile.lockedLayout={order:['timer','stats'], socialAdded:true}; renderView()");
  check('a saved layout gets the quote once', await E("lockedLayout().join(',')")==='timer,quote,stats');
  await E("state.profile.lockedLayout.order=['timer','stats']; renderView()");
  check('…and if you take it off it stays off', await E("lockedLayout().join(',')")==='timer,stats');

  await E("openQuickJournalModal()"); await p.waitForTimeout(250);
  await p.fill('#quickJournalModalText', 'Good day'); const y0 = await E("window.scrollY");
  await E("saveQuickJournal()"); await p.waitForTimeout(1300);
  check('journal saves once, the page doesn’t jump', await E("state.journal.entries.filter(e => e.text==='Good day').length")===1 && await E("window.scrollY")===y0 && await E("document.getElementById('quickJournalOverlay').classList.contains('hidden')"));
  check('no page errors (round 44d)', p.errors.length===0, p.errors);
  await b.close();
  process.exit(report() ? 1 : 0);
})();
