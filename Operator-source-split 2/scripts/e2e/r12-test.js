// Round 12: dawn before the alarm, the alarm (Snooze / Start your day), human Good morning (weather
// and sun, sleep, quote, good-day thoughts, one Skip/✕), Start work → work intro → Lock in; Lock in
// techniques (explained, hover times, one slim bar on the timer, heads-up, rounds), list arrows and
// drop lines; deep work counts everything; Current Lineup; Social stats; quick note; Analytics and
// the Sessions page; Sound settings; no browser full screen; sky pill; client cycle off Today.
const { instrument, launch, newPage, check, report, OUT } = require('./common.js');
const RSS = '<?xml version="1.0"?><rss><channel><title>NPR Topics: News</title><item><title>Fed holds rates steady</title><link>https://www.npr.org/a</link></item><item><title>Parks make a comeback</title><link>https://www.npr.org/b</link></item></channel></rss>';
(async () => {
  instrument(process.argv[2], OUT+'/r12.html');
  const b = await launch();
  const tasks = Array.from({length:12}, (_, i) => ({id:'t'+i, title:'Task '+(i+1), status:'today', priority:['high','med','low'][i%3], clients:['personal']}));
  const weather = {lat:40.7, lon:-74, place:'Brooklyn'};

  // ---- the morning, start to finish ----
  {
    const T = new Date(2026,9,10,6,45).getTime();
    weather.current = {at:T, temp:58, code:1, hi:66, lo:51, feels:56};
    const p = await newPage(b, OUT+'/r12.html', {profile:{name:'Andre', revenueGoalMonthly:20000}, tasks:{items:tasks.slice(0, 3)}, settings:{weather},
      business:{clients:[{id:'c1', name:'JJS', stage:'active', status:'active', mrr:3500}], pipeline:[{id:'l1', name:'Nova', stage:'new', value:2500}]},
      focus:{wake:{enabled:true, time:'07:00', days:[0,1,2,3,4,5,6], intro:'quick', news:true}}}, T);
    const E = c => p.evaluate(x => window.__op.ev(x), c);
    await p.route('http://127.0.0.1:8935/**', r => r.request().url().includes('/news') ? r.fulfill({status:200, body:RSS, headers:{'Access-Control-Allow-Origin':'*'}}) : r.fulfill({status:200, body:'{"ok":true}', headers:{'Access-Control-Allow-Origin':'*'}}));
    await E("startMode('offtime', {sleep:true, note:'Sleep'}); state.modes.active.startedAt -= 7*3600000");
    await p.clock.runFor(3000); await p.waitForTimeout(300);
    check('dawn: 20 minutes out, asleep → the screen starts coming up', await E("ui.wakeMode")==='dawn' && await p.isVisible('.dawn'));
    const p1 = await E("dawnProgress()");
    await p.clock.runFor(10*60000); await p.waitForTimeout(300);
    check('…and it brightens as the alarm gets closer', await E("dawnProgress()") > p1 + 0.3);
    check('the dawn never says "Still up"', !/Still up/.test(await p.textContent('#wakeOverlay')));
    await p.clock.runFor(6*60000); await p.waitForTimeout(400);
    check('the alarm: Good morning, the time, a quote', await E("ui.wakeMode")==='ring' && /Good morning, Andre/.test(await p.textContent('.wk2-greet')) && await p.isVisible('.wk3-quote .qt blockquote'));
    // round 13: the get-up button reads "I'm up" (still data-action="wakeStartDay")
    check('two buttons: Snooze and I\'m up', await p.isVisible('[data-action="wakeSnooze"]') && /I’m up/.test(await p.textContent('[data-action="wakeStartDay"]')) && !(await p.$('[data-action="wakeImUp"]')));
    await p.click('[data-action="wakeStartDay"]'); await p.waitForTimeout(300);
    check('I\'m up → Good morning, and sleep mode ends', await E("ui.wakeMode")==='brief' && !(await E("state.modes.active && state.modes.active.sleep")));
    check('only one corner button while it builds (Skip, no ✕)', await p.isVisible('.brief-skipall') && !(await p.$('.brief-x')));
    await p.$eval('[data-action="briefSkip"]', e => e.click()); await p.waitForTimeout(900);
    check('…then the ✕ (and no Skip)', await p.isVisible('.brief-x') && !(await p.$('.brief-skipall')));
    const brief = await p.textContent('#wakeOverlay');
    check('the weather and the sun lead it: temp, sunrise / sunset arc', /58°/.test(await p.textContent('.br-hero')) && await p.isVisible('.br-hero .sun-arc') && /Sunrise/.test(await p.textContent('.br-hero')));
    check('how you slept last night', await p.isVisible('.brh-sleep') && /Slept/.test(await p.textContent('.brh-sleep')));
    // round 13: the one-screen brief shows four good-day thoughts (thoughtsOfDay(4)), and "The Day Ahead" is now "Today"
    check('human things: a quote, four things for a good day, headlines, today', await p.isVisible('.br-quote .qt') && (await p.$$('.br-thoughts .br-th')).length===4 && /Fed holds rates steady/.test(brief) && /Today/.test(await p.textContent('.br-day .br-k')));
    check('no business numbers in Good morning', !/Monthly recurring|Open leads/.test(brief));
    check('it ends on "Get ready to start your day."', await p.textContent('#brVoice')==='Get ready to start your day.');
    check('one way forward: Start my morning', await p.isVisible('[data-action="wakeStartMorning"]') && !(await p.$('[data-action="wakeClockIn"]')));
    // round 13: Start my morning no longer opens Morning mode — Good morning lifts away (520 ms) and
    // you're clocked in straight to the business preview (#planOverlay)
    await p.click('[data-action="wakeStartMorning"]'); await p.waitForTimeout(1200);
    check('Start my morning: Good morning closes, no Morning mode in between', !(await p.isVisible('#wakeOverlay:not(.hidden)')) && !(await E("!!(state.modes.active && state.modes.active.morning)")) && !(await p.$('.mm-clockin')) && await p.isVisible('#planOverlay:not(.hidden)'));
    const wi = await p.textContent('#planOverlay');
    check('the business preview: business numbers, a quote, the plan, the week', /Let’s get to work/.test(wi) && /\$3,500/.test(wi) && /Open leads/.test(wi) && await p.isVisible('#planOverlay .qt') && (await p.$$('#planOverlay .pr-row')).length===3 && (await p.$$('#planOverlay .wi-wk')).length===7);
    check('…with LOCK IN and a corner ✕ (no "Not yet")', await p.isVisible('#planOverlay .pr-go') && await p.isVisible('#planOverlay .wd-close[data-action="closePlanReveal"]') && !/Not yet/.test(wi));
    await p.click('#planOverlay .pr-go'); await p.waitForTimeout(300);
    check('…and LOCK IN goes straight into the Lock in steps on #1', await p.isVisible('#lockSeqOverlay:not(.hidden)') && await E("ui.lockSeq.nowId")==='t0');
    await E("closeLockSeq()");
    check('no errors (morning)', !p.errors.length, p.errors);
    await p.context().close();
  }

  // ---- news falls back when the launcher can't fetch it ----
  {
    const p = await newPage(b, OUT+'/r12.html', {profile:{name:'Andre'}});
    const E = c => p.evaluate(x => window.__op.ev(x), c);
    await p.route('http://127.0.0.1:8935/**', r => r.fulfill({status:404, body:'{}', headers:{'Access-Control-Allow-Origin':'*'}}));
    await p.route('https://api.rss2json.com/**', r => r.fulfill({status:200, body:JSON.stringify({items:[{title:'Backup headline', link:'https://npr.org/x'}]}), headers:{'Access-Control-Allow-Origin':'*', 'Content-Type':'application/json'}}));
    await E("loadMorningNews()"); await p.waitForTimeout(600);
    check('headlines still come through an older launcher', await E("ui.morningNews.items && ui.morningNews.items[0].title")==='Backup headline');
    await p.context().close();
  }

  // ---- Lock in: techniques, lists, the timer ----
  {
    const T = new Date(2026,9,10,9,0).getTime();
    const p = await newPage(b, OUT+'/r12.html', {profile:{name:'Andre'}, tasks:{items:tasks}, focus:{prepItems:[{id:'p1', label:'Water'}]}}, T);
    const E = c => p.evaluate(x => window.__op.ev(x), c);
    await E("openLockSeq()"); await p.waitForTimeout(500);
    check('the whole lineup shows (no cap at 10)', (await p.$$('.ls-row')).length===12);
    check('every row has ↑ ↓ to move it', (await p.$$('.ls-row [data-action="lockMove"]')).length===24);
    await p.click('.ls-row[data-id="t0"] [data-action="lockMove"][data-dir="1"]'); await p.waitForTimeout(200);
    check('↓ moves it down one', await E("lockLineup()[1].id")==='t0');
    await E("ui.lockSeq.dragId='t5'; markDropLine('.ls-row', document.querySelector('.ls-row[data-id=\"t2\"]'), false)");
    check('dragging shows a glowing line where it will land', await p.isVisible('.ls-row.drop-above[data-id="t2"]'));
    await E("markDropLine('.ls-row', null); ui.lockSeq.dragId=null");
    await E("lockGoTo(1); ui.lockSeq.method='pomodoro'; renderLockSeqInto()"); await p.waitForTimeout(500);
    const about = await p.textContent('.ls-about');
    check('the technique is explained: how it works / best for', /How it works/i.test(about) && /Best for/i.test(about) && /25-minute/.test(about));
    check('hovering the bar tells you what each piece is and when', (await p.getAttribute('.ls-preview i:nth-child(2)', 'data-tip'))==='Break · 5 min' && /AM/.test(await p.getAttribute('.ls-preview i:nth-child(1)', 'data-when')));
    check('…with a legend: focus 1h 40m, breaks 15m', /Focus\s*1h 40m/.test(await p.textContent('.ls-legend')) && /Breaks\s*15m/.test(await p.textContent('.ls-legend')));
    await E("ui.lockSeq.prep=['p1']; lockGo()"); await p.waitForTimeout(400);
    check('locking in: the stamp covers the page while it switches', await p.isVisible('.lock-flash.is-hold'));
    await p.waitForTimeout(1500); await p.clock.runFor(1600); await p.waitForTimeout(900);
    check('…then lifts, and the session carries the technique', !(await p.$('.lock-flash.is-hold')) && await E("state.focus.activeSession.method.id")==='pomodoro');
    await E("ui.view='today'; renderView()"); await p.waitForTimeout(200);
    check('the timer shows ONE slim technique bar (no second progress bar)', (await p.$$('#focusHeroCard .ms-bar')).length===1 && !(await p.$('#focusHeroCard #focusProgressBar')));
    check('…and one line: round and when the break is', /Round 1 of 4/.test(await p.textContent('#focusHeroCard .ms-line')) && /Break in/.test(await p.textContent('#focusHeroCard .ms-line')));
    await p.clock.runFor(24.2*60000); await p.waitForTimeout(400);
    check('a minute before the break: a heads-up', await E("state.focus.activeSession.warnedRound")===1);
    await p.clock.runFor(70000); await p.waitForTimeout(400);
    check('the round ends → a 5 min break on its own, round 2 next', await E("state.focus.activeSession.onBreak") && await E("state.focus.activeSession.round")===2 && /Round 1 of 4 done/.test(await p.textContent('#focusHeroCard .ms-line')));
    await p.clock.runFor(5.2*60000); await p.waitForTimeout(400);
    check('the break ends on its own → Round 2', !(await E("state.focus.activeSession.onBreak")) && /Round 2 of 4/.test(await p.textContent('#focusHeroCard .ms-line')));
    check('no errors (lock in)', !p.errors.length, p.errors);
    await p.context().close();
  }

  // ---- deep work, lineup, social, quick note, client cycle, sky ----
  {
    const T = new Date(2026,9,10,14,0).getTime();
    const social = {platformTotals:{followers:{instagram:{total:4382, series:[4300, 4340, 4382]}, tiktok:{total:1200, series:[1150, 1200]}}}, breakdowns:{reach:{total:12840, totalChange:12}, impressions:{total:30410}, posts:{total:4}, engagement:{instagram:{likes:800, comments:90, shares:30}}}};
    const p = await newPage(b, OUT+'/r12.html', {profile:{name:'Andre'}, settings:{weather:Object.assign({}, weather, {current:{at:T, temp:61, code:63, hi:66, lo:52, feels:59}})},
      tasks:{items:[{id:'a', title:'Admin stuff', status:'today', priority:'low', clients:['personal'], countsDeepWork:false}]},
      business:{clients:[{id:'c1', name:'JJS', stage:'active', status:'active', mrr:3500, cycleId:'x', cycleStepId:'y'}]},
      }, T);
    const E = c => p.evaluate(x => window.__op.ev(x), c);
    await p.evaluate(x => window.__op.ev("Object.assign(ghlCfg(), {connected:true, socialCache:{at:Date.now(), data:"+JSON.stringify(x)+"}})"), social);
    await p.route('http://127.0.0.1:8936/**', r => r.fulfill({status:200, body:'{}', headers:{'Access-Control-Allow-Origin':'*'}}));
    await E("setCurrentTask('a')"); await p.clock.runFor(30*60000); await p.waitForTimeout(200);
    check('time on a task counts as deep work even without locking in (and old "doesn\'t count" flags are ignored)', await E("deepWorkMinutesTodayLive()")>=29);
    await E("ui.view='focus'; ui.focusTab='tasks'; renderView()"); await p.waitForTimeout(200);
    check('"Current Lineup", not "Today\'s Lineup"', /Current Lineup/.test(await p.textContent('#viewRoot')) && !/Today's Lineup/.test(await p.textContent('#viewRoot')));
    await E("ui.view='today'; renderView()"); await p.waitForTimeout(200);
    check('the sky on Today is one tidy pill with the sun\'s arc', await p.isVisible('.skyp .sun-arc') && /61°/.test(await p.textContent('.skyp')));
    check('the client cycle step isn\'t on the front page', !(await p.$('.hub-step')));
    await p.click('#sidebarNav [data-view="convos"]'); await p.waitForTimeout(300);
    check('the sidebar says Social and it opens on the stats', /Social/.test(await p.textContent('#sidebarNav [data-view="convos"]')) && await E("inboxState().mode")==='social');
    const soc = await p.textContent('#viewRoot');
    check('Social: total followers, this week\'s change, engagement rate, per platform', /5,582/.test(soc) && /\+132 this week/.test(soc) && /Engagement rate/.test(soc) && (await p.$$('.sc-plats .sc-plat')).length===2 && await p.isVisible('.sc-eng'));
    await p.click('.quick-journal-fab'); await p.waitForTimeout(300);
    check('quick note pops up from the corner, focused', await p.isVisible('.qj3') && await p.evaluate(() => document.activeElement && document.activeElement.id==='quickJournalModalText'));
    await p.keyboard.type('Big win today'); await p.keyboard.press('Meta+Enter'); await p.waitForTimeout(300);
    check('⌘↵ saves it', await E("state.journal.entries.some(e=>e.text==='Big win today')") && await p.isVisible('.qj3.is-saved'));
    check('no errors (misc)', !p.errors.length, p.errors);
    await p.context().close();
  }

  // ---- analytics, sessions page, sound settings, full screen ----
  {
    const T = new Date(2026,9,10,12,0).getTime();
    const sessions = []; for(let i=0;i<20;i++){ const d = new Date(2026,9,10-i,9,0); const ds = '2026-10-'+String(10-i).padStart(2,'0'); if(10-i<1) break; sessions.push({id:'s'+i, date:ds, startedAt:d.getTime(), endedAt:d.getTime()+(30+i*5)*60000, minutes:30+i*5, type:'deep', completedTasks:i%2?[{title:'Reel '+i}]:[]}); }
    const p = await newPage(b, OUT+'/r12.html', {profile:{name:'Andre'}, focus:{sessions}, fitness:{workouts:[{id:'w1', date:'2026-10-09', type:'Run', minutes:30}]}}, T);
    const E = c => p.evaluate(x => window.__op.ev(x), c);
    await E("ui.view='focus'; ui.focusTab='analytics'; ui.analyticsRange='all'; renderView()"); await p.waitForTimeout(300);
    const top = await p.evaluate(() => [...document.querySelectorAll('.an-over .an-card')].map(c => c.querySelector('.an-h').textContent));
    check('Analytics opens with deep work, tasks and fitness side by side', top.length===3 && /Deep Work/.test(top[0]) && /Tasks/.test(top[1]) && /Fitness/.test(top[2]));
    check('…above the charts', await p.evaluate(() => { const a = document.querySelector('.an-over'), c = document.querySelector('.an-charts'); return a && c && (a.compareDocumentPosition(c) & Node.DOCUMENT_POSITION_FOLLOWING); }));
    check('only a few recent sessions on Analytics, with "All sessions →"', (await p.$$('.an-recent .sx-row')).length===6 && await p.isVisible('[data-action="openSessionsPage"]') && !(await p.$('.section-title:has-text("Session History")')));
    await p.click('[data-action="openSessionsPage"]'); await p.waitForTimeout(300);
    check('the Sessions page lists them (last 30 days)', (await p.$$('.sx .sx-row')).length===10);
    await p.selectOption('select[data-sx="sort"]', 'long'); await p.waitForTimeout(200);
    check('sort: longest first', /1h 15m/.test(await p.textContent('.sx .sx-row:first-child .sx-len')));
    await p.fill('#sxSearch', 'Reel 9'); await p.waitForTimeout(400);
    check('search by task', (await p.$$('.sx .sx-row')).length===1);
    await p.fill('#sxSearch', ''); await p.waitForTimeout(400);
    const [dl] = await Promise.all([p.waitForEvent('download'), p.click('[data-action="sxCsv"]')]);
    check('download as CSV', /operator-sessions-.*\.csv/.test(dl.suggestedFilename()));
    await p.context().grantPermissions(['clipboard-read', 'clipboard-write']).catch(()=>{});
    await p.click('[data-action="sxCopy"]'); await p.waitForTimeout(300);
    check('copy for Claude', /Copied|paste it into Claude/.test(await p.textContent('#toastContainer')) || await p.evaluate(() => !!document.querySelector('a[download]')));
    await p.click('[data-action="closeSessionsPage"]'); await p.waitForTimeout(200);
    check('back to Analytics', await p.isVisible('.an-over'));
    // sound settings
    await E("ui.view='settings'; ui.settingsTab='sound'; renderView()"); await p.waitForTimeout(200);
    check('Settings → Sound: effects style, volume, lock-in sound, mornings', await p.isVisible('#sndVol') && (await p.$$('.snd-tile')).length===4 && await p.isVisible('.snd-row:has([data-snd="dawn"])'));
    check('the chill intro is what plays by default when you lock in', await p.isVisible('.snd-tile.is-on[data-id="chill"]'));
    await p.click('.snd-tile[data-id="music"]'); await p.waitForTimeout(200);
    await p.fill('#sndLockQuery', 'Lo-fi beats'); await p.click('[data-action="sndLockSet"]'); await p.waitForTimeout(200);
    check('or your own music', await E("state.profile.lockSound")==='music' && await E("state.profile.lockMusic.q")==='Lo-fi beats');
    await p.fill('#sndVol', '40'); await p.dispatchEvent('#sndVol', 'input'); await p.waitForTimeout(300);
    check('volume is saved', Math.abs(await E("sfxVolume()") - 0.4) < 0.01);
    await p.click('.snd-row:has([data-snd="nav"])'); await p.waitForTimeout(100);
    check('turn page-switch clicks off', await E("soundPref('nav', true)")===false);
    // full screen
    await E("ui.view='today'; renderView(); ACTIONS.openVisionFull()"); await p.waitForTimeout(200);
    check('vision board full screen doesn\'t use browser full screen (no "hold Esc" banner)', await p.evaluate(() => !document.fullscreenElement));
    check('no errors (analytics/sound)', !p.errors.length, p.errors);
    await p.context().close();
  }
  await b.close();
  process.exit(report() ? 1 : 0);
})();
