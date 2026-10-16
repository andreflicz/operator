// Round 39: deliverable tasks look like client work (week, deliverable, client, the week meter, due);
// Today's client cards open the client; the touch menu floats and can retype a quick log; Op hears you
// through ElevenLabs Scribe, opens the mic when he asks, can be stopped, shows thinking in his pop-up,
// and does what you ask (client_deliverables). Then (11–24): rank up is yours to press, level-ups vary, goals land with a
// pop-up, the lock-in song plays through the player, the Cockpit lists the songs, That's the day, tabs open once, demo
// controls, Zernio and the Goals page.
const { chromium } = require('playwright');
const { instrument, newPage, check, report, OUT } = require('./common.js');
(async () => {
  instrument(process.argv[2], OUT+'/r39.html');
  const b = await chromium.launch({ executablePath:'/opt/pw-browsers/chromium-1194/chrome-linux/chrome', args:['--no-sandbox', '--use-fake-device-for-media-stream', '--use-fake-ui-for-media-stream', '--autoplay-policy=no-user-gesture-required'] });
  const T = new Date(2026,9,14,14,20).getTime();   // Wed Oct 14
  const biz = {clients:[
    {id:'bm', name:'Mike', business:'Brothers Mechanical', stage:'active', status:'active', mrr:2000, startDate:'2026-09-01', createdAt:'2026-09-01', touches:['2026-10-12'],
      deliverables:[{id:'d1', title:'Reels', weeklyTarget:4, recurring:true, status:'pending', completedDates:[]}]},
    {id:'jj', name:'Jay', business:'JJS Construction', stage:'active', status:'active', mrr:1500, startDate:'2026-09-01', createdAt:'2026-09-01', touches:['2026-10-12'],
      deliverables:[{id:'d2', title:'Ad creatives', weeklyTarget:3, recurring:true, status:'pending', completedDates:[]}]}],
    pipeline:[{id:'l1', name:'Bloom Florals', stage:'contacted', createdAt:'2026-09-20', touchpoints:[{id:'t0', type:'text', date:'2026-09-25'}], followUp:{date:'2026-10-04'}},
               {id:'l2', name:'Atlas Realty', stage:'contacted', createdAt:'2026-09-20', touchpoints:[{id:'t9', type:'text', date:'2026-09-28'}], followUp:{date:'2026-10-06'}}]};
  const J = (r, o, st) => r.fulfill({status:st || 200, body:JSON.stringify(o), headers:{'Access-Control-Allow-Origin':'*'}});

  // ---- 1–3 ----
  {
    const p = await newPage(b, OUT+'/r39.html', {profile:{name:'Andre', lineupView:'cards'}, business:biz, tasks:{items:[]}}, T);
    const E = c => p.evaluate(x => window.__op.ev(x), c);
    await p.waitForTimeout(1500);
    await E("state.tasks.items.filter(t => t.master && t.master.kind==='dvw' && t.master.clientId==='bm' && t.master.wk<=2).forEach(t => t.status='today'); ui.view='focus'; ui.focusTab='tasks'; ui.focusTasksSubTab='overview'; renderView()"); await p.waitForTimeout(300);
    const cs = '.task-card.dvc:not(.car-clone)';
    const txt = await p.textContent(cs);
    check('a deliverable task: the week, the deliverable, the client (violet)', /Week 1/i.test(await p.textContent(cs+' .dvc-wkp')) && (await p.textContent(cs+' .dvc-title'))==='16 Reels' && /Brothers Mechanical/.test(await p.textContent(cs+' .dvc-who')), txt);
    check('…with the week meter and the due date', (await p.evaluate(s => document.querySelector(s).querySelectorAll('.dvc-dots i').length, cs))===4 && /1\/4/.test(await p.textContent(cs+' .dvc-n')) && /Oct 7/.test(await p.textContent(cs+' .dvc-due')), await p.textContent(cs));
    check('…and no priority tag', !(await p.$(cs+' .tag-med')));
    await E("state.profile.lineupView='list'; renderView()"); await p.waitForTimeout(200);
    check('the list view row matches (week pill, name, meter, client chip)', !!(await p.$('.tl-row.tl-dlv .dvc-wkp')) && !!(await p.$('.tl-row.tl-dlv .dvc-dots')) && !!(await p.$('.tl-row.tl-dlv .dvc-who')) && !(await p.$('.tl-row.tl-dlv .tag-client')));
    await E("ui.view='today'; renderView()"); await p.waitForTimeout(300);
    await p.click('.hub-card[data-id="jj"] .hub-foot', {position:{x:20, y:8}}).catch(() => p.click('.hub-card[data-id="jj"]')); await p.waitForTimeout(300);
    check('Today: clicking a client card opens that client', await p.isVisible('#clientModalOverlay:not(.hidden)') && /JJS Construction/.test(await p.textContent('#clientModalOverlay')));
    await E("hideOverlay('clientModalOverlay'); renderView()"); await p.waitForTimeout(200);
    await (await p.$('.hub-lead[data-key="hl-l1"] .touch-more-btn')).scrollIntoViewIfNeeded(); await p.click('.hub-lead[data-key="hl-l1"] .touch-more-btn'); await p.waitForTimeout(250);
    check('the lead’s touch-type menu floats above the page (it was hidden under the next panel)', await p.isVisible('body > .touch-menu.is-float') && (await p.$$('body > .touch-menu.is-float .touch-menu-btn')).length >= 5);
    await p.click('body > .touch-menu.is-float [data-type="call"]'); await p.waitForTimeout(250);
    check('…a type logs that type', await E("state.business.pipeline[0].touchpoints.slice(-1)[0].type")==='call');
    await p.click('.hub-lead[data-key="hl-l2"] .touch-log-btn'); await p.waitForTimeout(300);
    check('a quick log opens “Was it something else?”', await p.isVisible('body > .touch-menu.is-float .touch-menu-h'));
    await p.click('body > .touch-menu.is-float [data-type="meeting"]'); await p.waitForTimeout(250);
    check('…and changes the one you just logged', await E("state.business.pipeline[1].touchpoints.slice(-1)[0].type")==='meeting' && await E("state.business.pipeline[1].touchpoints.length")===2);
    check('no page errors (round 39: 1–3)', p.errors.length===0, p.errors);
    await p.context().close();
  }

  // ---- 4–9: Op ----
  {
    const p = await newPage(b, OUT+'/r39.html', {profile:{name:'Andre'}, business:biz, tasks:{items:[]}}, T);
    const E = c => p.evaluate(x => window.__op.ev(x), c);
    const asked = []; let sttCalls = 0, sttType = '';
    await p.route('http://127.0.0.1:8935/**', async r => {
      const u = new URL(r.request().url()); asked.push(u.pathname);
      if(u.pathname==='/tts/status') return J(r, {ok:true, hasKey:true});
      if(u.pathname==='/stt'){ sttCalls++; sttType = r.request().headers()['content-type'] || ''; return J(r, {text:'Add next week of deliverables for Brothers Mechanical. (laughs)'}); }
      return J(r, {ok:true});
    });
    await p.waitForTimeout(2200);
    check('with an ElevenLabs key, Op listens through Scribe', await E("scribeWanted()"));
    await E("window.__asked=[]; aiAsk=(function(base){ return function(t){ window.__asked.push(t); return Promise.resolve(); }; })(aiAsk); ACTIONS.opTalk()"); await p.waitForTimeout(1200);
    check('…the mic opens and his pop-up says “Listening” with a Stop', await E("AI.listening") && await p.isVisible('#opBub .ob-status.is-on [data-action="opStopListen"]') && /Listening/.test(await p.textContent('#opBub .ob-status')));
    await E("AI.sendNow && AI.sendNow()"); await p.waitForTimeout(1200);
    check('…your clip goes to the Operator app and your words come back (sound tags dropped)', sttCalls===1 && /audio\/webm/.test(sttType) && await E("JSON.stringify(window.__asked)")==='["Add next week of deliverables for Brothers Mechanical."]', [sttCalls, sttType, await E("JSON.stringify(window.__asked)")]);
    await E("ACTIONS.opTalk()"); await p.waitForTimeout(800);
    await p.keyboard.press('Escape'); await p.waitForTimeout(400);
    check('Esc stops him listening (nothing sent)', !(await E("AI.listening")) && sttCalls===1 && /not listening/i.test(await p.textContent('#opBubText')));
    await E("AI.busy=true"); await p.waitForTimeout(400);
    check('his thinking shows in his pop-up (with a Stop), not a chip by the light', /Thinking/.test(await p.textContent('#opBub .ob-status')) && !!(await p.$('#opBub .ob-status [data-action="opCancelThink"]')) && !(await p.isVisible('#opThink')));
    await E("AI.busy=false"); await p.waitForTimeout(300);
    check('a question anywhere near the end opens the mic (not only a final “?”)', await E("opAsked('Want me to put those on today? Say the word.')") && await E("opAsked('Done. Anything else?')") && !(await E("opAsked('Done, all three are on today.')")));
    const sys = await E("JSON.stringify(aiSystem())");
    check('his rules: he does what you ask, never questions what you finished, then one line of advice at most', /Never refuse/.test(sys) && /never mention “fake completions”/.test(sys) && /do what he asked FIRST/.test(sys));
    await E("masterTasksSync()"); await p.waitForTimeout(100);
    const r1 = await E("opRunTool('client_deliverables', {client:'brothers', action:'today', week:'next'})");
    check('“add next week of deliverables for Brothers Mechanical” puts just their Week 3 on today', /16 Reels 3\/4/.test(r1) && await E("state.tasks.items.filter(t => t.status==='today' && t.master && t.master.kind==='dvw').map(t => t.title).join()")==='16 Reels 3/4', r1);
    const r2 = await E("opRunTool('client_deliverables', {client:'JJS', action:'done', week:'2'})");
    check('…and “JJS week 2 is done” finishes just that one (logging its 3 ad creatives)', /12 Ad creatives 2\/4/.test(r2) && await E("dvwCycleCount(state.business.clients[1].deliverables[0], dvwCycle(state.business.clients[1]))")===3, r2);
    check('no page errors (round 39: Op)', p.errors.length===0, p.errors);
    await p.context().close();
  }

  // ---- 11–21, 24: levels, ranks, goals, music, the Cockpit, toasts, That's the day, tabs, the Goals page ----
  {
    const p = await newPage(b, OUT+'/r39.html', {profile:{name:'Andre', lockSound:'chill'}, business:biz, tasks:{items:[{id:'t1', title:'Write the script', status:'today', priority:'med', client:'personal', clients:[], createdAt:'2026-10-10'}]},
      goals:{items:[{id:'g1', label:'Read 12 books', target:12, current:3}]}}, T);
    const E = c => p.evaluate(x => window.__op.ev(x), c);
    await p.waitForTimeout(1500);
    check('top right: just the level (no bar)', await p.evaluate(() => { const c = document.querySelector('#musicDock .md-lvl'); if(!c) return false; const i = c.querySelector('i'); return !i || getComputedStyle(i).display==='none'; }));
    await E("RANKS[1].level=0; RANKS[1].mrr=0; RANKS[1].health=0; state.profile.rankClaimed=0; xpLast=null; ui.view='personal'; ui.personalTab='you'; renderView()"); await p.waitForTimeout(300);
    check('a rank you’ve earned waits for you: a Rank up button on your card and in the level pop-over (your shown rank stays until you press it)', !!(await p.$('.rank-up-btn')) && /rank-up-btn/.test(await E('lvlPopHtml()')) && await E("xpSummary().rank")===0 && await E("xpSummary().rankReady")===1);
    await E("document.querySelector('.rank-up-btn').click()"); await p.waitForTimeout(1500);
    check('…pressing it: the ceremony (the room goes dark, the new badge and its name)', await p.isVisible('#rankFx') && /Operator/i.test(await p.textContent('#rankFx')) && await E("state.profile.rankClaimed")===1);
    await p.click('#rankFx [data-action="rankFxClose"]'); await p.waitForTimeout(3000);
    check('…“Wear it” closes it and the button is gone', !(await p.$('#rankFx')) && !(await p.$('.rank-up-btn')));
    const kinds = [];
    for(const L of [4, 5, 6, 7]){ await E("levelUpFx("+L+")"); await p.waitForTimeout(80); kinds.push(await E("[...document.getElementById('lvlFx').classList].find(c => /^lv-/.test(c))")); }
    await E("document.getElementById('lvlFx') && document.getElementById('lvlFx').remove()");
    check('level-ups don’t all look the same (four ways in)', new Set(kinds).size===4, kinds);
    await E("goalSetFx({label:'Hit $30k MRR', tier:'month'}); showToast('Added: Hit $30k MRR')"); await p.waitForTimeout(300);
    check('a new goal lands like a level up (GOAL SET, the goal, where it lives), not a plain toast', await p.isVisible('#goalFx') && /GOAL SET/.test(await p.textContent('#goalFx')) && /This month/.test(await p.textContent('#goalFx')) && !/Added:/.test(await p.textContent('#toastContainer')));
    await p.waitForTimeout(3200);
    // 15: the lock-in song goes through the player, and hands over to the lock-in music
    await E("playLockInSong()"); await p.waitForTimeout(900);
    check('the lock-in song plays through the top-right player (“Lock In”), nothing on top of it', await E("FM.playing && FOCUS_TRACKS[FM.idx].name==='Lock In'") && /Lock In/.test(await p.textContent('#musicDock')));
    await E("FM.bar = 1; FM.nextAt = 0; fmSchedule()");
    check('…when it ends, the low lock-in music carries on (soft)', await E("!!FOCUS_TRACKS[FM.idx].lock && FM.soft===true"));
    await E("ACTIONS.fmNext()"); await p.waitForTimeout(1100);
    check('⏭ never lands on the lock-in song', await E("!FOCUS_TRACKS[FM.idx].special"));
    // 16–17: the Cockpit
    await E("focusMusicStop(); state.profile.lockedStyle='cockpit'; startFocus(); state.profile.lockedView='minimal'; ui.view='today'; renderView()"); await p.waitForTimeout(500);
    check('Cockpit: the right side lists every song', (await p.$$('#ckSongs .ckm-s')).length===await E("FOCUS_TRACKS.length"));
    check('…and no Done button on the session screen', !(await p.$('.ckx [data-action="finishCurrentTask"]')));
    await p.click('#ckSongs .ckm-s[data-id="2"]'); await p.waitForTimeout(1200);
    check('…tap one and it plays (marked in the list)', await E("FM.playing && FM.idx===2") && !!(await p.$('#ckSongs .ckm-s.is-on[data-id="2"]')));
    await p.click('.ckm-tabs [data-id="day"]'); await p.waitForTimeout(300);
    check('…Your day is one tap away', !!(await p.$('.ckd-week')) && !(await p.$('#ckSongs')));
    await E("focusMusicStop(); state.profile.ckpPane='songs'; ACTIONS.openStopFocus && 0; state.focus.activeSession=null; renderView()"); await p.waitForTimeout(300);
    // 18
    await E("showToast('&#127911; Listen, properly. Logged.', {icon:'&#10024;'})"); await p.waitForTimeout(200);
    const tmsg = await p.textContent('#activeToast .toast-msg');
    check('a toast shows the emoji, never the raw code', tmsg.startsWith('🎧') && !/&#/.test(tmsg), tmsg);
    // 19–20: That's the day
    await E("state.modes.active={type:'offtime', startedAt:Date.now()-3600000}; ui.view='today'; renderView()"); await p.waitForTimeout(400);
    check('That’s the day: lock, gear and moon line icons in white on the buttons', (await p.$$('.dayoff-row .r39-ico svg')).length===3);
    const qi = await E("[...document.querySelectorAll('.rd-slide')].findIndex(s => s.querySelector('.qt[data-q=\"evening\"]'))");
    const q1 = await E("document.querySelector('.qt[data-q=\"evening\"] blockquote').textContent");
    await E("rdMove("+qi+"+1); rdMove("+qi+")"); await p.waitForTimeout(300);
    const q2 = await E("document.querySelector('.qt[data-q=\"evening\"] blockquote').textContent");
    check('…its quote is set like Good morning’s, centred, and changes each time it comes round', qi >= 0 && q1!==q2 && await p.evaluate(() => getComputedStyle(document.querySelector('.qt.is-rest')).textAlign)==='center', [q1, q2]);
    await E("state.modes.active=null; renderView()");
    // 21: tabs open once
    await E("ui.view='personal'; ui.personalTab='you'; renderView()"); await p.waitForTimeout(500);
    await p.click('[data-action="personalTab"][data-tab="journal"]'); await p.waitForTimeout(100);
    check('changing tabs fades only the tab (the title and tab bar stay put)', await p.evaluate(() => getComputedStyle(document.querySelector('#viewRoot > .view-header')).animationName==='none' && getComputedStyle(document.querySelector('#viewRoot > .tabs')).animationName==='none'));
    await p.waitForTimeout(600);
    check('…and it stays that way (no second fade when the first ends)', await p.evaluate(() => getComputedStyle(document.querySelector('#viewRoot > .view-header')).animationName==='none'));
    await E("openDayRecap()"); await p.waitForTimeout(900);
    check('the Recap opens once (its open animation doesn’t restart when it finishes)', await p.evaluate(() => getComputedStyle(document.getElementById('recapContent')).animationName==='none'));
    await E("hideOverlay('recapOverlay')");
    // 24: the Goals page
    await E("ui.personalTab='goals'; renderView()"); await p.waitForTimeout(400);
    check('Goals: revenue is one slim strip across the top', !!(await p.$('.g39 .g39-rev')) && (await p.evaluate(() => document.querySelector('.g39-rev').getBoundingClientRect().height)) < 160);
    check('…then three even columns: Master, This month, This week', await E("[...document.querySelectorAll('.g39-cols > .g39-col')].map(c => c.className.split(' ')[1]).join()")==='is-master,is-month,is-week');
    check('…Customize sits on the page’s own bar, top right', !!(await p.$('.g39-bar > .g39-cust')));
    check('…and your goals are cards in a grid', !!(await p.$('.g39-mine .g39-grid .gx-g')) && /Read 12 books/.test(await p.textContent('.g39-mine')));
    check('no page errors (round 39: 11–24)', p.errors.length===0, p.errors);
    await p.context().close();
  }

  // ---- 22: demo mode ----
  {
    const ctx = await b.newContext({viewport:{width:1400, height:900}}); const p = await ctx.newPage(); const errs = [];
    p.on('pageerror', e => errs.push(e.message));
    await p.addInitScript(() => { localStorage.setItem('opsdash-mode', 'demo'); });
    await p.clock.install({time:T});
    await p.goto('file://'+OUT+'/r39.html'); await p.waitForTimeout(3500);
    const E = c => p.evaluate(x => window.__op.ev(x), c);
    check('demo mode opens clean: no “Session complete”, no level left waiting', !(await p.$('.xp-sys')) && await E("!xpSummary().canLevel") && await E("xpSummary().total") > 0);
    await p.click('#demoBanner [data-action="demoPanel"]'); await p.waitForTimeout(300);
    check('the demo banner has Controls: a panel to set the numbers and set off moments', await p.isVisible('#demoSheet') && (await p.$$('#demoSheet [data-action="demoFx"]')).length >= 9);
    await p.fill('#dmMrr', '30000'); await p.click('#demoSheet [data-action="demoSetMrr"]'); await p.waitForTimeout(200);
    check('…set MRR to anything', await E("xpMrr()")===30000);
    const before = await E("xpSummary().total");
    await p.click('#demoSheet [data-action="demoXp"][data-id="2500"]'); await p.waitForTimeout(200);
    check('…add XP', await E("xpSummary().total")===before + 2500);
    await p.click('#demoSheet [data-action="demoFx"][data-id="level"]'); await p.waitForTimeout(900);
    check('…and set off a level up', !!(await p.$('#lvlFx')));
    check('no page errors (round 39: demo)', errs.length===0, errs);
    await ctx.close();
  }

  // ---- 23: Zernio ----
  {
    const p = await newPage(b, OUT+'/r39.html', {profile:{name:'Andre'}, business:biz}, T);
    const E = c => p.evaluate(x => window.__op.ev(x), c);
    let keyHex = '', paths = [];
    await p.route('http://127.0.0.1:8935/**', async r => {
      const u = new URL(r.request().url());
      if(u.pathname==='/zn/key'){ keyHex = u.searchParams.get('t'); return J(r, {ok:true}); }
      if(u.pathname==='/zn/status') return J(r, {ok:true, hasKey:true});
      if(u.pathname==='/zn/api'){
        const path = Buffer.from(u.searchParams.get('p'), 'hex').toString(); paths.push(path);
        if(path.startsWith('/v1/accounts')) return J(r, {accounts:[{_id:'z1', platform:'instagram', username:'andre.makes', followersCount:4321}], hasAnalyticsAccess:true});
        if(path.startsWith('/v1/analytics')) return J(r, {posts:[{_id:'p1', content:'Behind the scenes', publishedAt:'2026-10-10T17:00:00Z', platformPostUrl:'https://www.instagram.com/p/abc/', mediaProductType:'REELS', analytics:{impressions:2100, reach:1800, likes:120, comments:9, shares:14, saves:31, views:3400}}]});
      }
      return J(r, {ok:true});
    });
    await E("ACTIONS.goToSocial ? ACTIONS.goToSocial() : (ui.view='business', renderView())"); await p.waitForTimeout(500);
    await E("ui.socShow='zn'; renderView()"); await p.waitForTimeout(200);
    check('Zernio is a way in (first in the list)', !!(await p.$('.soc-opts > .soc-opt:first-child [data-id="zn"]')) && !!(await p.$('#znKey')));
    await p.fill('#znKey', 'sk_test_123'); await p.click('[data-action="znConnect"]'); await p.waitForTimeout(1500);
    check('…the key goes to the Operator app on the Mac (not into your data)', Buffer.from(keyHex, 'hex').toString()==='sk_test_123' && !(await E("JSON.stringify(state)")).includes('sk_test_123'));
    const d = await E("JSON.stringify(igCfg().cache && igCfg().cache.data['zernio-z1'])");
    const dj = JSON.parse(d || 'null');
    check('…followers and every post with reach, saves, shares and views come in', !!dj && dj.followers===4321 && dj.posts[0].reach===1800 && dj.posts[0].saves===31 && dj.posts[0].shares===14 && dj.posts[0].views===3400 && dj.posts[0].type==='REELS', d);
    check('…it counts for XP like any account', await E("igFollowersTotal()")===4321);
    check('…only the accounts list and analytics are asked for', paths.length >= 2 && paths.every(x => /^\/v1\/(accounts|analytics)/.test(x)), paths);
    check('…and it shows as Zernio with Refresh now', /Zernio/.test(await p.textContent('.soc-srcs')) && !!(await p.$('.soc-srcs [data-action="znRefresh"]')));
    check('no page errors (round 39: Zernio)', p.errors.length===0, p.errors);
    await p.context().close();
  }

  await b.close();
  process.exit(report() ? 1 : 0);
})();
