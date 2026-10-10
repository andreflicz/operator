// Round 13: I'm up → one-screen Good morning → Start my morning (leave animation) → business preview
// (one screen, two balanced columns, week chart, quotes that change, corner ✕ only) → Lock in; the calm
// snooze screen; breaks (pop-up, tasks paused, minimal break view); the minimal locked view; day off
// (automatic from the alarm days, full screen, flash on/off) and the weekend clock-out; shooting toggles
// off; "Hear them"; client card sections; settings groups; journal titles and hidden types; batched saves.
const { instrument, launch, newPage, check, report, OUT } = require('./common.js');
(async () => {
  instrument(process.argv[2], OUT+'/r13.html');
  const b = await launch();
  const tasks = Array.from({length:5}, (_, i) => ({id:'t'+i, title:'Task '+(i+1), status:'today', priority:['high','med','low'][i%3], clients:['personal']}));
  const clients = [{id:'c1', name:'JJS', stage:'active', status:'active', mrr:3500}, {id:'c2', name:'Bloom', stage:'active', status:'active', mrr:2000}];
  const route = p => p.route('http://127.0.0.1:8935/**', r => r.fulfill({status:200, body:'{"ok":true}', headers:{'Access-Control-Allow-Origin':'*'}}));

  // ---- the morning: alarm → I'm up → Good morning → Start my morning → business preview ----
  {
    const T = new Date(2026,9,12,7,0,5).getTime(); // a Monday, right at the alarm
    const p = await newPage(b, OUT+'/r13.html', {profile:{name:'Andre', revenueGoalMonthly:20000}, tasks:{items:tasks}, business:{clients, pipeline:[]},
      focus:{wake:{enabled:true, time:'07:00', days:[0,1,2,3,4,5,6], intro:'quick', news:false}}}, T);
    const E = c => p.evaluate(x => window.__op.ev(x), c);
    await route(p);
    await p.clock.runFor(2000); await p.waitForTimeout(300);
    if(await E("ui.wakeMode")!=='ring') await E("fireWake({})");
    check('the alarm: "I\'m up" and Snooze', await p.isVisible('[data-action="wakeStartDay"]') && await p.isVisible('[data-action="wakeSnooze"]'));
    await p.click('[data-action="wakeSnooze"]'); await p.waitForTimeout(500);
    check('Snooze → a calm snooze screen (the overlay stays)', await E("ui.wakeMode")==='snooze' && await p.isVisible('.snz'));
    await p.click('[data-action="snoozeUp"]'); await p.waitForTimeout(500);
    check('…and "I\'m up" from there goes to Good morning', await E("ui.wakeMode")==='brief');
    check('one corner button: Skip', await p.isVisible('.brief-skipall') && !(await p.$('.brief-x')));
    await E("briefRevealAll()"); await p.waitForTimeout(900);
    const fits = await p.evaluate(() => { const o = document.querySelector('#wakeOverlay .brief, #wakeOverlay'); return o.scrollHeight <= o.clientHeight + 2; });
    check('Good morning fits one screen (no scrolling)', fits);
    check('no work in Good morning', !/Monthly recurring|Plan of attack|LOCK IN/i.test(await p.textContent('#wakeOverlay')));
    const q1 = await p.textContent('.br-quote .qt blockquote').catch(()=>null);
    if(q1!=null){ await p.$eval('.br-quote .qt-next', e => e.click()); await p.waitForTimeout(700); }
    check('the quote ↻ button brings a different quote', q1!=null && (await p.textContent('.br-quote .qt blockquote'))!==q1);
    await p.click('[data-action="wakeStartMorning"]'); await p.waitForTimeout(120);
    check('Start my morning: Good morning lifts off over the preview (no black gap)', await p.$('#wakeOverlay.is-leaving')!==null && await p.isVisible('#planOverlay .wi'));
    await p.waitForTimeout(1600);
    check('…then the business preview opens (no Morning-mode detour)', await p.isVisible('#planOverlay .wi') && !(await p.$('.mm-clockin')));
    const wi = await p.textContent('#planOverlay');
    check('preview: business numbers, the plan, clients, the week', /Monthly recurring/.test(wi) && (await p.$$('#planOverlay .pr-row')).length===5 && await p.isVisible('#planOverlay .wi-clients') && await p.isVisible('#planOverlay .wi-week'));
    check('no "Not yet" — a corner ✕ closes it', !/Not yet/.test(wi) && await p.isVisible('#planOverlay .wd-close'));
    const geo = await p.evaluate(() => { const r = s => document.querySelector(s).getBoundingClientRect(); const cols = document.querySelectorAll('#planOverlay .wi-col'); return {go:r('#planOverlay .pr-go').bottom, h:innerHeight, l:cols[0] && cols[0].getBoundingClientRect().height, rr:cols[1] && cols[1].getBoundingClientRect().height}; });
    check('one screen: LOCK IN is on screen', geo.go <= geo.h, geo);
    check('balanced: both columns carry content', geo.l > 150 && geo.rr > 150, geo);
    await p.click('#planOverlay .wd-close'); await p.waitForTimeout(400);
    check('✕ closes the preview', !(await p.isVisible('#planOverlay .wi')));
    check('no page errors in the morning', p.errors.length===0, p.errors);
    await p.context().close();
  }

  // ---- locked in: minimal view, breaks pause the tasks ----
  {
    const p = await newPage(b, OUT+'/r13.html', {profile:{name:'Andre'}, tasks:{items:tasks}});
    const E = c => p.evaluate(x => window.__op.ev(x), c);
    await E("ui.currentTaskId='t0'; startFocus(); renderView()"); await p.waitForTimeout(600);
    check('locked in', await E("!!state.focus.activeSession"));
    await E("ACTIONS.toggleLockedView()"); await p.waitForTimeout(400);
    check('minimal view: full screen, the task as the title', await p.isVisible('.np') && await E("document.body.classList.contains('np-on')") && /Task 1/.test(await p.textContent('.np-title')));
    await E("openBreakNotePrompt()"); await p.waitForTimeout(400);
    check('break pop-up: length tiles, a note, Start break', (await p.$$('#breakNoteContent .brk-len')).length===6 && await p.isVisible('#breakNoteInput') && await p.isVisible('.brk-go'));
    await p.click('.brk-len[data-minutes="10"]'); await p.waitForTimeout(200);
    check('picking 10 shows when you\'re back', /Back at/.test(await p.textContent('.brk-back')));
    await p.click('.brk-chip[data-id="Walk"]'); await p.click('.brk-go'); await p.waitForSelector('.np.is-break #npBreakBar', {timeout:5000}).catch(()=>{}); await p.waitForTimeout(300);
    check('on a break, 10 minutes, note kept', await E("state.focus.activeSession.onBreak") && /Walk/.test(await p.textContent('.np-title')));
    check('the minimal break view shows the timer, not the tasks', await p.isVisible('.np.is-break #npBreakBar') && !(await p.$('.np .np-next')));
    await E("(function(){ const b = document.createElement('button'); b.dataset.action='finishCurrentTask'; document.body.appendChild(b); b.click(); b.remove(); })()"); await p.waitForTimeout(300);
    check('tasks are paused on a break (finish does nothing)', await E("state.tasks.items.find(t=>t.id==='t0').status")!=='done');
    await E("ACTIONS.toggleLockedView()"); await p.waitForTimeout(700);
    check('the view switch keeps the state', await E("state.profile.lockedView")==='full' && await E("state.focus.activeSession.onBreak"));
    check('no page errors while locked in', p.errors.length===0, p.errors);
    await p.context().close();
  }

  // ---- day off: automatic from the alarm days, full screen, flash both ways ----
  {
    const wake = {wake:{enabled:true, time:'07:00', days:[1,2,3,4,5,6]}};
    const p = await newPage(b, OUT+'/r13.html', {profile:{name:'Andre'}, focus:wake}, new Date(2026,9,11,10,0).getTime()); // Sunday
    const E = c => p.evaluate(x => window.__op.ev(x), c);
    await p.waitForTimeout(900);
    check('Sunday (no alarm that day) → day off automatically', await E("isDayOff(todayStr())") && await p.isVisible('.np.rest.is-dayoff'));
    check('minimal: "Day off." and a few stats', /Day off\./.test(await p.textContent('.rest-h')) && (await p.$$('.rest-s')).length>=2 && !/Rest is part of the plan/.test(await p.textContent('#viewRoot')));
    check('full screen by default (sidebar steps aside)', await E("document.body.classList.contains('np-on')"));
    await p.click('[data-action="toggleRestFull"]'); await p.waitForTimeout(300);
    check('the corner button gives the sidebar back', !(await E("document.body.classList.contains('np-on')")) && await p.isVisible('.np.rest'));
    await p.click('[data-action="quickDayOff"]'); await p.waitForTimeout(500); // (the day off fades out first)
    check('turning it off plays a flash', await p.$('.lock-flash.is-dayoff')!==null);
    await p.waitForTimeout(400);
    check('…and today counts again', !(await E("isDayOff(todayStr())")) && !(await p.$('.np.rest')));
    await E("renderView()"); await p.waitForTimeout(300);
    check('it doesn\'t switch itself back on the same day', !(await E("isDayOff(todayStr())")));
    check('no page errors on the day off', p.errors.length===0, p.errors);
    await p.context().close();
  }
  {
    const p = await newPage(b, OUT+'/r13.html', {profile:{name:'Andre'}, focus:{wake:{enabled:true, time:'07:00', days:[1,2,3,4,5,6]}}}, new Date(2026,9,10,18,0).getTime()); // Saturday
    const E = c => p.evaluate(x => window.__op.ev(x), c);
    await p.waitForTimeout(500);
    check('Saturday is a work day', !(await E("isDayOff(todayStr())")));
    await E("ACTIONS.clockOut()"); await p.waitForTimeout(500);
    check('clocking out before a day off → the full-screen weekend view', await p.isVisible('.np.rest.is-weekend') && /That’s the week/.test(await p.textContent('.dayoff-h')) && await E("document.body.classList.contains('np-on')"));
    await E("ui.view='today'; renderView()");
    await p.click('[data-action="clockIn"]').catch(()=>{}); await p.waitForTimeout(500);
    await E("typeof hideOverlay==='function' && hideOverlay('planOverlay'); ui.planReveal=false; renderView()"); await p.waitForTimeout(300);
    await p.click('[data-action="quickMode"][data-type="shooting"]'); await p.waitForTimeout(300);
    const on = await E("state.modes.active && state.modes.active.type");
    await p.click('[data-action="quickMode"][data-type="shooting"]'); await p.waitForTimeout(300);
    check('shooting: click to start, click again to end', on==='shooting' && !(await E("state.modes.active && state.modes.active.type==='shooting'")));
    check('no page errors on the weekend', p.errors.length===0, p.errors);
    await p.context().close();
  }

  // ---- sounds, client card, settings, journal, saves ----
  {
    const p = await newPage(b, OUT+'/r13.html', {profile:{name:'Andre'}, business:{clients, pipeline:[]}});
    const E = c => p.evaluate(x => window.__op.ev(x), c);
    check('"Hear them" has a handler', await E("typeof ACTIONS.previewSounds==='function'"));
    await E("ACTIONS.previewSounds()"); await p.waitForTimeout(200);
    await E("openClientModal('c1')"); await p.waitForTimeout(400);
    check('client card: settings-like sections', (await p.$$('#clientModalContent [data-action="clientSec"]')).length===6);
    await p.click('#clientModalContent [data-action="clientSec"][data-id="notes"]'); await p.waitForTimeout(300);
    await p.fill('#clientModalNotes', 'Loves short hooks');
    await p.click('#clientModalContent [data-action="clientSec"][data-id="overview"]'); await p.waitForTimeout(300);
    check('notes save when you switch sections', await E("state.business.clients.find(c=>c.id==='c1').notes")==='Loves short hooks');
    await E("closeClientModal ? closeClientModal() : null").catch(()=>{});
    await E("ui.view='settings'; renderView()"); await p.waitForTimeout(400);
    check('settings: five groups on the left', (await p.$$('.settings-sidenav .settings-nav-item')).length===5);
    await E("ui.view='today'; renderView(); openQuickJournalModal()"); await p.waitForTimeout(500);
    await p.fill('#quickJournalModalTextTitle', 'Pitch ideas'); await p.fill('#quickJournalModalText', 'Hook-first openers');
    await E("addJournalEntry('quickJournalModalText')"); await p.waitForTimeout(200);
    check('quick note: the heading is the name', await E("state.journal.entries.slice(-1)[0].title")==='Pitch ideas');
    const tid = await E("journalTypes()[0].id");
    await E("ACTIONS.toggleJournalTypeHidden(null, null, '"+tid+"')");
    check('a journal type can be hidden (entries stay)', !(await E("visibleJournalTypes().some(t=>t.id==='"+tid+"')")) && await E("state.journal.entries.length")>=1);
    await E("ACTIONS.toggleJournalTypeHidden(null, null, '"+tid+"')");
    check('…and brought back', await E("visibleJournalTypes().some(t=>t.id==='"+tid+"')"));
    await E("state.profile.name='Andy'; persist('profile')");
    await p.waitForTimeout(400);
    check('saves are batched and land shortly after', JSON.parse(await p.evaluate(() => localStorage.getItem('opsdash:profile'))).name==='Andy');
    check('no page errors in settings / journal / clients', p.errors.length===0, p.errors);
    await p.context().close();
  }

  await b.close();
  process.exit(report() ? 1 : 0);
})();
