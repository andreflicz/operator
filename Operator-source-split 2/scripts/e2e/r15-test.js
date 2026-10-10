// Round 15: Good morning is quicker and a click brings the next piece in; pieces that haven't
// appeared can't be clicked; no empty third column; true full screen for Good morning / work
// preview / full-screen views (and off in Settings); Notifications fixed (class clash with the
// minimal view) with whole lines instead of "…".
const { instrument, launch, newPage, check, report, OUT } = require('./common.js');
(async () => {
  instrument(process.argv[2], OUT+'/r15.html');
  const b = await launch();
  const okRoute = (p, asked) => p.route('http://127.0.0.1:8935/**', r => { if(asked) asked.push(r.request().url().replace(/^.*8935/, '')); r.fulfill({status:200, body:'{"ok":true}', headers:{'Access-Control-Allow-Origin':'*'}}); });

  // ---- Good morning pace ----
  {
    const asked = [];
    const p = await newPage(b, OUT+'/r15.html', {profile:{name:'Andre'}, focus:{wake:{enabled:true, time:'07:00', days:[0,1,2,3,4,5,6], news:false, intro:'quick', introChosen:true, voice:false}}}, new Date(2026,9,12,7,0,5).getTime()); // (spoken, it goes at the voice's pace — r16 covers that)
    await okRoute(p, asked);
    const E = c => p.evaluate(x => window.__op.ev(x), c);
    await E("fireWake({})"); await p.click('[data-action="wakeStartDay"]'); await p.waitForTimeout(300);
    const L = JSON.parse(await E("JSON.stringify(ui.briefLines)"));
    check('the whole Good morning builds in about 12 seconds (was ~30)', L[L.length-1].at < 13000, L.map(l => l.at));
    check('no empty third column when headlines are off', await p.$('.b4-grid.cols-2')!==null && (await p.$$('.b4-grid > .b4-col')).length===2);
    check('true full screen is asked for while Good morning is up', asked.some(u => u==='/window/full?f=1'));
    await p.clock.runFor(4200); await E("ui.wakeIntroDone=true; renderWakeOverlayInto()"); await p.waitForTimeout(400);
    const shown = "ui.briefLines.filter(function(l){ return Date.now()-ui.briefT0 >= l.at; }).length";
    const before = await E(shown);
    await p.click('.brief-hello'); await p.waitForTimeout(150); // anywhere on the page that isn't a button
    const b2 = await E(shown);
    await p.mouse.click(700, 880); await p.waitForTimeout(150); // where the (not yet shown) Start button sits
    check('a click brings the next piece in right away', b2 > before, [before, b2]);
    check('…and never presses a button that hasn\'t appeared yet', await E("overlayOpen('wakeOverlay') && ui.wakeMode==='brief'"));
    await E("briefRevealAll()"); await p.waitForTimeout(900);
    await p.click('.brief-skipall'); await p.clock.runFor(800); await p.waitForTimeout(700);
    check('leaving Good morning lets go of full screen', asked.filter(u => u.startsWith('/window/full')).slice(-1)[0]==='/window/full?f=0', asked);
    check('no page errors (Good morning)', p.errors.length===0, p.errors);
    await p.context().close();
  }

  // ---- full screen: minimal view, and the setting ----
  {
    const asked = [];
    const p = await newPage(b, OUT+'/r15.html', {profile:{name:'Andre'}, tasks:{items:[{id:'t0', title:'Edit reel', status:'today', priority:'high', clients:['personal']}]}});
    await okRoute(p, asked);
    const E = c => p.evaluate(x => window.__op.ev(x), c);
    await E("ui.currentTaskId='t0'; startFocus(); renderView()"); await p.waitForTimeout(500);
    await E("ACTIONS.toggleLockedView()"); await p.waitForTimeout(1000);
    check('minimal view → real full screen', asked.includes('/window/full?f=1'));
    await E("ACTIONS.toggleLockedView()"); await p.waitForTimeout(1000);
    check('back to the full view → out of full screen', asked.slice(-1)[0]==='/window/full?f=0', asked);
    await E("state.profile.trueFull=false; persist('profile')"); asked.length = 0;
    await E("ACTIONS.toggleLockedView()"); await p.waitForTimeout(1000);
    check('Full screen: Off keeps it in the window', !asked.some(u => u.startsWith('/window/full')), asked);
    await E("ACTIONS.toggleLockedView(); ui.view='settings'; ui.settingsTab='display'; renderView()"); await p.waitForTimeout(400);
    check('the setting is in Settings (Look & Sound)', (await p.$$('[data-action="toggleTrueFull"]')).length===1);
    check('no page errors (full screen)', p.errors.length===0, p.errors);
    await p.context().close();
  }

  // ---- notifications ----
  {
    const T = new Date(2026,9,12,10,0).getTime();
    const long = 'Finish the JJS October content calendar and send it over for approval before the call';
    const p = await newPage(b, OUT+'/r15.html', {profile:{name:'Andre'}, tasks:{items:[{id:'a', title:long, status:'today', priority:'high', deadline:'2026-10-11', clients:['personal']}, {id:'b', title:'Script hooks', status:'today', priority:'med', deadline:'2026-10-12', clients:['personal']}]}}, T);
    await p.click('#notifBell'); await p.waitForTimeout(300);
    const st = await p.evaluate(() => { const t = document.querySelector('#notifPanel .nt-title'), it = document.querySelector('#notifPanel .nt-t'); const a = getComputedStyle(t), c = getComputedStyle(it); return {fs:a.fontSize, ws:c.whiteSpace, to:c.textOverflow, h:it.getBoundingClientRect().height}; });
    check('the panel heading is normal size (no clash with the minimal view)', st.fs==='15px', st);
    check('long notifications show the whole line (no "…")', st.ws==='normal' && st.to!=='ellipsis' && st.h > 20, st);
    check('both deadlines are listed and clickable', (await p.$$('#notifPanel .nt-main')).length===2 && (await p.textContent('#notifPanel')).includes(long));
    await p.click('#notifPanel .nt-main >> nth=1'); await p.waitForTimeout(300);
    check('clicking one opens it', await p.evaluate(() => !!document.querySelector('#taskEditOverlay:not(.hidden), .overlay:not(.hidden)')));
    check('no page errors (notifications)', p.errors.length===0, p.errors);
    await p.context().close();
  }

  await b.close();
  process.exit(report() ? 1 : 0);
})();
