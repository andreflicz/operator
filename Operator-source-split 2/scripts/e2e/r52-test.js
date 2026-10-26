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
  await b.close(); process.exit(report() ? 1 : 0);
})().catch((e) => { console.error(e); process.exit(1); });
