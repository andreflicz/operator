// Round 52: the Calendar without a pop-up on top, pop-ups close by tapping outside, settings sub-tabs.
const { instrument, launch, newPage, check, report, OUT } = require('./common.js');
(async () => {
  instrument(process.argv[2], OUT+'/r52.html');
  const b = await launch();
  const p = await newPage(b, OUT+'/r52.html', {profile:{name:'Andre Lopez'}, business:{clients:[{id:'jj', name:'Jay', business:'JJS', stage:'active', status:'active', mrr:3000}]}}, new Date(2026, 9, 26, 10).getTime());
  const E = c => p.evaluate(x => window.__op.ev(x), c);
  await E("document.querySelectorAll('.overlay').forEach(o => o.classList.add('hidden')); ui.view='calendar'; renderView()"); await p.waitForTimeout(1500);
  check('the Calendar opens with no check-in on top of it', !(await E("!!document.querySelector('#intOverlay:not(.hidden)')")));
  check('…what\'s waiting is one line at the top instead', /Check in for October/.test(await p.textContent('.r52-ask')));
  await p.click('.r52-ask'); await p.waitForTimeout(900);
  check('tap it and the check-in opens', await E("!!document.querySelector('#intOverlay:not(.hidden)')"));
  await p.mouse.click(30, 450); await p.waitForTimeout(700);
  check('tap outside and it closes', !(await E("!!document.querySelector('#intOverlay:not(.hidden)')")));
  await E("ui.view='business'; ui.businessTab='clients'; renderView(); ACTIONS.fabAdd()"); await p.waitForTimeout(500);
  check('the + pop-up has no ✕', !(await E("(function(){ const x = document.querySelector('#addPickContent .hs-x'); return !!x && getComputedStyle(x).display!=='none'; })()")));
  await p.mouse.click(30, 850); await p.waitForTimeout(400);
  check('…and closes when you tap outside', await E("document.getElementById('addPick').classList.contains('hidden')"));
  await E("ui.view='settings'; ui.settingsTab='look'; renderView()"); await p.waitForTimeout(300);
  check('Look & Sound: Appearance | Sound, one at a time', (await p.$$('.r52-sub .seg-tab')).length===2 && (await p.$$('.set-part:not(.r52-off)')).length===1);
  await p.click('.r52-sub [data-id$="|sound"]'); await p.waitForTimeout(250);
  check('…no locked-in timer picker (tap the timer instead)', !(await p.$('.tm-picks')) && !!(await p.$('#setPart-sound:not(.r52-off)')));
  await E("ui.settingsTab='op'; renderView()"); await p.waitForTimeout(250);
  check('Op: the switch is in the title, no second "Op" row, one voice', !!(await p.$('.r51-title [data-action="opPower"]')) && !/Mac voice/.test(await p.textContent('.settings-content')));
  check('no errors', p.errors.length===0, p.errors);
  // nothing re-renders on its own in a loop (real clock, every main screen)
  const LOOPSEED = {"business":{"packages":[{"id":"p1","name":"Growth · 12 reels","price":3000,"deliverables":[]}],"clients":[{"id":"jj","name":"Jay","business":"JJS","stage":"active","status":"active","mrr":3000,"packageId":"p1","color":"#4FC3B8","startDate":"2026-03-01","billingDay":1,"deliverables":[{"id":"d1","title":"Reels","recurring":true,"monthlyTarget":12,"completedDates":["2026-10-05","2026-10-06","2026-10-08","2026-10-12","2026-10-13","2026-10-20","2026-10-22"]},{"id":"d2","title":"Meta ads refresh","recurring":true,"monthlyTarget":4,"completedDates":["2026-10-07","2026-10-14"]}],"touchpoints":[{"id":"a1","type":"text","date":"2026-10-23","note":"Sent the weekly recap","ts":1792771200000},{"id":"a2","type":"call","date":"2026-10-19","note":"Monthly call","ts":1792436400000}],"journal":[{"id":"j1","date":"2026-10-21","text":"Wants more hooks in the first 2s"}]},{"id":"ki","name":"Kiko","business":"Kiko","stage":"active","status":"active","mrr":2000,"color":"#9B8CFF","startDate":"2026-05-01","billingDay":5,"deliverables":[],"touchpoints":[{"id":"b1","type":"dm","date":"2026-10-16","note":"","ts":1792159200000}]},{"id":"bm","name":"Tony","business":"Brothers Mechanical","stage":"active","status":"active","mrr":1500,"color":"#E8A23D","startDate":"2025-04-01","reactivated":true,"reactivatedAt":"2026-10-19","billingDay":15,"deliverables":[{"id":"d3","title":"Reels","recurring":true,"weeklyTarget":2,"completedDates":["2026-10-21"]}],"touchpoints":[{"id":"c1","type":"call","date":"2026-10-19","note":"Back on","ts":1792422000000}]}],"pipeline":[{"id":"l1","name":"Marco","company":"Marco Fitness","stage":"contacted","value":1500}]},"tasks":{"items":[{"id":"t1","title":"Edit JJS reel","status":"today","client":"jj","clients":["jj"],"priority":"high","notes":"Cut the hook to 2s, add captions."},{"id":"t2","title":"Send Kiko invoice","status":"today","clients":["personal"],"notes":"October retainer, net 7."},{"id":"t3","title":"Plan November content","status":"backlog","clients":["general"]},{"id":"t4","title":"Call the accountant","status":"done","completedAt":"2026-10-24"}]}};
  const q = await newPage(b, OUT+'/r52.html', Object.assign({profile:{name:'Andre Lopez'}}, LOOPSEED), null);
  const loops = await q.evaluate(async () => { const out = {}; window.__op.ev("window.__n = 0; if(!window.__rvB){ window.__rvB = renderView; renderView = function(){ window.__n++; return window.__rvB.apply(this, arguments); }; }"); for(const v of ['today', 'focus', 'calendar', 'business', 'personal', 'settings']){ window.__op.ev("document.querySelectorAll('.overlay').forEach(o => o.classList.add('hidden')); ui.view='"+v+"'; window.__rvB(); window.__n = 0"); await new Promise(r => setTimeout(r, 2500)); out[v] = window.__op.ev('window.__n'); } return out; });
  check('no screen re-renders itself in a loop', Object.values(loops).every(n => n < 6), loops);
  await b.close(); process.exit(report() ? 1 : 0);
})().catch((e) => { console.error(e); process.exit(1); });
