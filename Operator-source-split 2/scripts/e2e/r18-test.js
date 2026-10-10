// Round 18: keys tell you exactly why they won't save (old launcher / not running); the Operator talks
// in a floating bubble and from anywhere (mic in the dock); Good morning — the month and the week
// (one message), the quarter countdown, a quiet level HUD, the note you just wrote, sports that never
// vanish, quicker panels; the work page's business message; Calendar asks once a month and once a
// week (and it waits in notifications); XP — slower levels, goals that count after a day; the You page
// (no paragraphs, how-it-works page, 30-day chart); minimal views — the player (☕ ▶ ■), ✓ Done, breaks
// that wait for you, Flowtime explained, minimal Today; Knock these out; a short right-click menu; no
// quick-links; Time Worked; Packages; dimmer light mode; Instagram (token in the launcher only).
const { instrument, launch, newPage, check, report, OUT } = require('./common.js');
const path = require('path');
const hexDecode = h => Buffer.from(h, 'hex').toString('utf8');
const CORS = {'Access-Control-Allow-Origin':'*'};
const okJ = {status:200, body:'{"ok":true}', headers:CORS};
async function ctxPage(b, seed, opts){
  opts = opts || {};
  const ctx = await b.newContext({viewport: opts.viewport || {width:1440, height:900}}); const p = await ctx.newPage(); p.errors = []; p.on('pageerror', e => p.errors.push(e.message));
  if(opts.clock) await p.clock.install({time:opts.clock});
  if(opts.fixed) await p.clock.setFixedTime(opts.fixed);
  await p.addInitScript((seed) => { if(sessionStorage.getItem('s')) return; sessionStorage.setItem('s', '1'); Object.keys(seed).forEach(k => localStorage.setItem('opsdash:'+k, JSON.stringify(seed[k]))); }, seed);
  if(opts.route) await p.route('http://127.0.0.1:8935/**', opts.route);
  await p.goto('file://'+path.resolve(OUT+'/r18.html')); await p.waitForTimeout(500);
  return p;
}
(async () => {
  instrument(process.argv[2], OUT+'/r18.html');
  const b = await launch();
  const MON = new Date(2026,9,12,7,0,5).getTime();
  const tasks = [{id:'t0', title:'Edit JJS reel', status:'today', priority:'high', clients:['c1'], notes:'Cut to 30s, add captions, color pass.'}, {id:'t1', title:'Send proposal', status:'today', priority:'med', clients:['personal']}];
  const clients = [{id:'c1', name:'JJS', business:'JJS Fitness', stage:'active', status:'active', mrr:3000}];
  const WAKE = {enabled:true, time:'07:00', days:[0,1,2,3,4,5,6], news:true, newsSports:'Giants', newsTech:'AI', intro:'quick', introChosen:true, voice:false};

  // ---- keys: the reason when they won't save ----
  {
    let helperV = 9;
    const p = await ctxPage(b, {profile:{name:'Andre'}, focus:{wake:Object.assign({}, WAKE, {voice:true})}}, {route: r => { const u = r.request().url();
      if(u.includes('/ping')) return r.fulfill({status:200, headers:CORS, body:JSON.stringify({ok:true, helper:helperV})});
      if(u.includes('/tts/key') || u.includes('/ai/key')) return r.fulfill({status:404, headers:CORS, body:'{"ok":false}'});
      return r.fulfill(okJ); }});
    const E = c => p.evaluate(x => window.__op.ev(x), c);
    check('an older launcher still running is named as the reason', /older Operator \(launcher v9\)/.test(await E("opLauncherWhy()")));
    helperV = 10;
    check('the up-to-date launcher is recognised (v10 is what this version needs)', await E("OP_HELPER_NEEDS")===10 && /couldn’t write/.test(await E("opLauncherWhy()")));
    await p.unroute('http://127.0.0.1:8935/**'); await p.route('http://127.0.0.1:8935/**', r => r.abort());
    check('no launcher at all: "isn’t running — open it from its icon"', /isn’t running/.test(await E("opLauncherWhy()")));
    check('no page errors (keys)', p.errors.length===0, p.errors);
    await p.context().close();
  }

  // ---- the Operator's bubble, the mic in the dock, the dock while skipping ----
  {
    const p = await ctxPage(b, {profile:{name:'Andre'}, tasks:{items:tasks}, business:{clients, pipeline:[]}, focus:{wake:WAKE}}, {clock:MON, route: r => r.fulfill(okJ)});
    const E = c => p.evaluate(x => window.__op.ev(x), c);
    check('a mic in the corner dock: talk to the Operator from anywhere', await p.isVisible('#musicDock .md-op[data-action="opTalk"]'));
    await E("fireWake({})"); await p.click('[data-action="wakeStartDay"]'); await p.waitForTimeout(500); await E("briefRevealAll()"); await p.waitForTimeout(900);
    const top0 = await p.evaluate(() => document.querySelector('.b4-grid').getBoundingClientRect().top);
    await p.click('.op-ask[data-id="business"]'); await p.waitForTimeout(700);
    const top1 = await p.evaluate(() => document.querySelector('.b4-grid').getBoundingClientRect().top);
    check('what the Operator says floats in a bubble (bottom centre) …', await p.isVisible('#opBub.is-in') && /Today you’ve got 2 things/.test(await p.textContent('#opBubText')));
    check('… and the page doesn’t move', Math.abs(top0 - top1) < 1, [top0, top1]);
    await E("ACTIONS.opBubClose()"); await p.waitForTimeout(400);
    check('× closes it', !(await p.isVisible('#opBub.is-in')));
    await E("endBriefing()"); await p.waitForTimeout(300);
    await E("ACTIONS.dockFm()"); await p.waitForTimeout(200);
    await E("ACTIONS.dockNext()");
    check('skipping a song: the dock stays open (no blink back to the little button)', await E("musicOn()") && await p.$('#musicDock .md-now')!==null);
    await p.clock.runFor(1200); await E("ACTIONS.dockFm()");
    check('no page errors (bubble / dock)', p.errors.length===0, p.errors);
    await p.context().close();
  }

  // ---- the browser voice gets a fair chance (a slow first start isn't "broken") ----
  {
    const ctx = await b.newContext(); const p = await ctx.newPage(); p.errors = []; p.on('pageerror', e => p.errors.push(e.message));
    await p.clock.install({time:MON});
    await p.addInitScript(() => { const S = {getVoices(){ return [{name:'Daniel', lang:'en-GB'}]; }, addEventListener(){}, speak(){}, cancel(){}}; Object.defineProperty(window, 'speechSynthesis', {value:S}); window.SpeechSynthesisUtterance = function(t){ this.text = t; }; });
    await p.addInitScript((seed) => { Object.keys(seed).forEach(k => localStorage.setItem('opsdash:'+k, JSON.stringify(seed[k]))); }, {profile:{name:'Andre'}, focus:{wake:Object.assign({}, WAKE, {voice:true, voiceEngine:'browser'})}});
    await p.goto('file://'+path.resolve(OUT+'/r18.html')); await p.waitForTimeout(400);
    const E = c => p.evaluate(x => window.__op.ev(x), c);
    await E("opSay('Hello there.'), 1"); await p.clock.runFor(2500);
    check('2.5 s without starting: still waiting (it used to give up after 1.5 s and stay silent)', await E("OV.pending && !OV.broken"));
    await p.clock.runFor(4000); await p.waitForTimeout(50);
    check('one miss doesn’t switch the voice off for the session', !(await E("OV.broken")) && await E("OV.misses")===1);
    await E("opSay('Again.'), 1"); await p.clock.runFor(6500); await p.waitForTimeout(50);
    check('two misses in a row: captions only', await E("OV.broken"));
    check('no page errors (voice start)', p.errors.length===0, p.errors);
    await ctx.close();
  }

  // ---- the note you just wrote; the business message on the work page ----
  {
    const T = new Date(2026,9,12,17,0).getTime();
    const p = await ctxPage(b, {profile:{name:'Andre'}, tasks:{items:tasks}, business:{clients, pipeline:[]}, focus:{wake:WAKE, morningNotes:[{id:'n0', text:'chicken bone, too tired to plan', forDate:'2026-10-12', at:T-86400000}]}}, {clock:T, route: r => r.fulfill(okJ)});
    const E = c => p.evaluate(x => window.__op.ev(x), c);
    await E("openTomorrowNote()"); await p.waitForTimeout(200);
    check('the note form: Headline, Good morning, Business message', /Headline/.test(await p.textContent('#tnContent')) && /Good morning/.test(await p.textContent('#tnContent')) && /Business message/.test(await p.textContent('#tnContent')));
    await p.fill('#tnHead', 'Big day. Go.'); await p.fill('#tnWork', 'Close the JJS upsell first.'); await p.click('[data-action="saveTomorrowNote"]'); await p.waitForTimeout(200);
    await E("fireWake({test:true})"); await p.click('[data-action="wakeStartDay"]'); await p.waitForTimeout(400); await E("briefRevealAll()"); await p.waitForTimeout(700);
    check('Good morning shows the note you just wrote (not last night’s “chicken bone”)', /Big day\. Go\./.test(await p.textContent('#wakeContent')) && !/chicken bone/.test(await p.textContent('#wakeContent')));
    await E("endBriefing(); clockIn({})"); await p.waitForTimeout(900);
    check('the work page: your business message', /Close the JJS upsell first/.test(await p.textContent('#planOverlay .wi-msg')));
    check('…and one quote (the second one made way for it)', (await p.$$('#planOverlay .wi-side')).length===1 && (await p.$$('#planOverlay .wi-act')).length===0);
    check('the journal orb sits in the corner on the work page (no + there)', await p.evaluate(() => getComputedStyle(document.querySelector('.quick-journal-fab.jorb')).bottom)==='28px');
    check('no page errors (notes)', p.errors.length===0, p.errors);
    await p.context().close();
  }

  // ---- the month and the week: Calendar asks, notifications remember, Good morning shows one ----
  {
    const p = await ctxPage(b, {profile:{name:'Andre'}, tasks:{items:tasks}, focus:{wake:WAKE}}, {clock:MON, route: r => { const u = r.request().url(); if(u.includes('/sports')) return r.fulfill({status:502, headers:CORS, body:'{}'}); if(u.includes('/news')) return r.fulfill({status:200, headers:CORS, body:'<?xml version="1.0"?><rss><channel><item><title>Top story</title><link>https://x.com/1</link></item></channel></rss>'}); r.fulfill(okJ); }});
    const E = c => p.evaluate(x => window.__op.ev(x), c);
    await E("ui.view='calendar'; renderView()"); await p.waitForTimeout(1600);
    check('Calendar asks for the month — cinematic', await p.isVisible('#intOverlay.is-in.is-cine') && /October/.test(await p.textContent('#intContent')) && (await p.$$('#intContent .int-in')).length===3);
    await p.click('#intOverlay .int-x'); await p.waitForTimeout(400);
    check('close it and it waits in the notifications', await E("notifList().some(n => n.key.indexOf('intent:month:2026-10')===0)"));
    check('the Calendar has a strip with the month and the week', (await p.$$('.int-strip .int-pill')).length===3);
    await E("openIntentForm('month')"); await p.waitForTimeout(300);
    await p.fill('#int_habit', 'Phone in bed'); await p.fill('#int_goal', 'Sign two new clients'); await p.click('[data-action="saveIntent"]'); await p.waitForTimeout(1300);
    check('saving the month brings up the week next', await p.isVisible('#intOverlay.is-in') && /This week/.test(await p.textContent('#intContent')));
    await p.fill('#int_focus', 'Finish the JJS launch'); await p.click('[data-action="saveIntent"]'); await p.waitForTimeout(500);
    check('…and they leave the notifications', !(await E("notifList().some(n => n.kind==='intent')")));
    await E("fireWake({})"); await p.click('[data-action="wakeStartDay"]'); await p.waitForTimeout(500); await E("briefRevealAll()"); await p.waitForTimeout(900);
    const one = await p.textContent('.br-intent .bi-one p');
    check('Good morning: one message from your month/week, big — not a list', ['Phone in bed', 'Sign two new clients', 'Finish the JJS launch'].includes(one.trim()) && await p.$('.br-intent .bi-rest')===null, one);
    check('no "You, lately" and no "a month ago you wrote"', !/You, Lately|you wrote/i.test(await p.textContent('#wakeContent')));
    check('the quarter: Q4 · 81 days left', /Q4/.test(await p.textContent('.bi-q')) && /81\s*days left/.test(await p.textContent('.bi-q')));
    check('your level is a quiet HUD in the top bar', await p.isVisible('.brief-top .b4-hud') && /LVL 0/.test(await p.textContent('.brief-top .b4-hud')));
    check('sports never just vanishes (no scores, no headlines → it says so)', await p.isVisible('.br-sports') && /No games/.test(await p.textContent('.br-sports')));
    check('panels come quicker (whole page built in under 11 s)', await E("ui.briefLines[ui.briefLines.length-1].at") < 11000);
    check('no page errors (month / week)', p.errors.length===0, p.errors);
    await p.context().close();
  }

  // ---- XP: slow levels, goals that count after a day ----
  {
    const T = new Date(2026,9,12,10,0).getTime();
    const p = await newPage(b, OUT+'/r18.html', {profile:{name:'Andre', heightIn:70}, goals:{items:[{id:'g1', label:'Post 3 reels', target:3, current:2, unit:'reels', done:false}]}, health:{gymLog:[], weightLog:[{id:'w', date:'2026-10-11', weight:205}]}}, T);
    const E = c => p.evaluate(x => window.__op.ev(x), c);
    await p.waitForTimeout(400);
    await E("const g = state.goals.items[0]; g.current = 3; g.done = true; xpLast = null");
    const g1 = JSON.parse(await E("JSON.stringify(xpSummaryFresh().goals)"));
    check('a goal you just ticked doesn’t pay yet (waits a day — no accidental XP)', g1.pending===1 && g1.counted===0, g1);
    await E("state.profile.xpGoalSeen.g1 -= 25*3600000; xpLast = null");
    check('a day later it counts: +500', await E("xpSummaryFresh().goalXp")===500);
    await E("state.goals.items[0].done = false; xpLast = null");
    check('un-tick it and it’s gone again', await E("xpSummaryFresh().goalXp")===0 && !(await E("'g1' in state.profile.xpGoalSeen")));
    await E("ui.view='personal'; ui.personalTab='you'; renderView()"); await p.waitForTimeout(400);
    check('You: no paragraphs — a "How leveling works" link instead', await p.$('.you .you-how')===null && await p.isVisible('[data-action="openXpHow"]'));
    await p.click('[data-action="openXpHow"]'); await p.waitForTimeout(200);
    check('…which opens its own page (earning, levels, ranks, ratings)', await p.isVisible('#xpHowOverlay:not(.hidden)') && (await p.$$('#xpHowContent .xph-r')).length>15);
    await E("ACTIONS.closeXpHow()");
    check('the last 30 days of XP, a bar a day', (await p.$$('.you-bars i')).length===30);
    check('the body panel: numbers on a scale, no wall of text', await p.$('.you-body .you-note')===null && await p.isVisible('.you-body .bmi-legend'));
    await E("ui.view='settings'; ui.settingsTab='focus'; renderView()"); await p.waitForTimeout(300);
    const where = await E("!!document.getElementById('setWeightNow')") ? 'focus' : 'you';
    if(where==='you'){ await E("ui.settingsTab='you'; renderView()"); await p.waitForTimeout(300); }
    await p.fill('#setWeightNow', '203'); await E("ACTIONS.saveProfile ? ACTIONS.saveProfile() : saveProfile()"); await p.waitForTimeout(300);
    check('weight lives in Settings with height (it logs a weigh-in)', await E("state.health.weightLog.some(w => w.date===todayStr() && Number(w.weight)===203)"));
    check('no page errors (XP)', p.errors.length===0, p.errors);
    await p.context().close();
  }

  // ---- minimal views: the player, ✓ Done, breaks that wait, Flowtime explained, minimal Today ----
  {
    const p = await newPage(b, OUT+'/r18.html', {profile:{name:'Andre', lockedView:'minimal'}, tasks:{items:tasks}, business:{clients, pipeline:[]}}, new Date(2026,9,12,10,0).getTime());
    const E = c => p.evaluate(x => window.__op.ev(x), c);
    await E("ui.currentTaskId='t0'; startFocus(); state.focus.activeSession.method={id:'flow'}; renderView()"); await p.waitForTimeout(700);
    check('the player: ☕ · ▶ (big) · ■ — lock out is one button, in the player', await p.isVisible('.np-ctl .np-music.is-main') && await p.isVisible('.np-ctl .np-out') && await p.$('.np-top .lv-out')===null);
    check('✓ Done for the task you’re on, and what’s next', await p.isVisible('.np-task .np-task-done') && /Next · Send proposal/.test(await p.textContent('.np-task')));
    check('Flowtime: spaced, with a ? that explains it', await p.$('.np-sub .ml-sep')!==null && await p.$('.np-sub .qtip')!==null && /a fifth as long/.test(await p.getAttribute('.np-sub .qtip', 'data-tip')));
    await E("methodBreak(5, 'Stretch')"); await p.waitForTimeout(200);
    await E("state.focus.activeSession.breakEndsAt = Date.now() - 2000; checkBreakTimer(); renderView()"); await p.waitForTimeout(300);
    check('a timed break that runs out waits for you (still on break)', await E("state.focus.activeSession.onBreak && !!state.focus.activeSession.breakOverAt"));
    check('…and says so: lock back in when you’re back', /Break’s over/.test(await p.textContent('.np-locked')) && await p.isVisible('.np-ctl [data-action="endBreakModeFromFocus"]'));
    await E("endBreakModeFromFocus(); renderView()"); await p.waitForTimeout(200);
    check('locking back in ends it', !(await E("state.focus.activeSession.onBreak")) && !(await E("state.focus.activeSession.breakOverAt")));
    await E("ACTIONS.toggleLockedView()"); await p.waitForTimeout(100);
    check('leaving the minimal view: a plain fade', await p.$('.np.is-leaving')!==null);
    await p.waitForTimeout(500);
    check('Knock these out: one tidy line each — number, title, the client', (await p.$$('.knock-out-list .ko-row')).length===2 && /JJS Fitness/.test(await p.textContent('.knock-out-list')) && await p.$('.knock-out-list .ko-notes')===null);
    await p.click('.ko-row [data-action="koToggle"]'); await p.waitForTimeout(200);
    check('…▾ opens the description', /Cut to 30s/.test(await p.textContent('.knock-out-list .ko-notes')));
    await E("reallyConfirmStopFocus(); ui.view='today'; renderView()"); await p.waitForTimeout(400);
    check('Today has a Minimal button with the others', await p.isVisible('.th-actions .th-btn-min'));
    await p.click('.th-actions .th-btn-min'); await p.waitForTimeout(500);
    check('…and Today goes minimal: clock, level, streak, LOCK IN', await p.isVisible('#viewRoot .np-home .hm-go'));
    await E("ACTIONS.toggleFocusMinimal()"); await p.waitForTimeout(500);
    check('no page errors (minimal)', p.errors.length===0, p.errors);
    await p.context().close();
  }

  // ---- around the app: right-click, no quick-links, Time Worked, Packages, light mode ----
  {
    const p = await newPage(b, OUT+'/r18.html', {profile:{name:'Andre'}, tasks:{items:tasks}, business:{clients, pipeline:[], packages:[{id:'pk1', name:'Growth', price:1500, deliverables:[{id:'d', title:'Reels', weeklyTarget:3}]}]}}, new Date(2026,9,12,10,0).getTime());
    const E = c => p.evaluate(x => window.__op.ev(x), c);
    await p.click('.th-greet', {button:'right'}); await p.waitForTimeout(200);
    const menu = await p.textContent('#appCtxMenu');
    check('right-click: short and about where you are (no theme / scene / sky / go-to)', /Lock in/.test(menu) && /New task/.test(menu) && /Minimal view/.test(menu) && !/Theme|Scene|Sky|Cards|Go to/.test(menu), menu);
    await E("ctxClose()");
    check('the ☰ quick-links are gone (page and Settings)', await p.$('.quick-access-dock, .quick-access-toggle')===null && !(await E("ui.view='settings'; ui.settingsTab='display'; renderView(); !!document.getElementById('setQuickFiles')")));
    await E("ui.view='today'; renderView()"); await p.waitForTimeout(300);
    check('Time Worked: the week, yesterday, and a bar a day', (await p.$$('.tw-bars i')).length===7 && /this week/.test(await p.textContent('.tw-chip')));
    await E("ui.view='business'; ui.businessTab='packages'; renderView()"); await p.waitForTimeout(300);
    check('Packages: plan cards, no big Add button (the + adds one)', (await p.$$('.pk-card')).length===1 && /\$1,500/.test(await p.textContent('.pk-card')) && await p.$('[data-action="openNewPackageModal"].btn-good')===null);
    await E("setThemePref('light')"); await p.waitForTimeout(300);
    check('light mode is dimmer (grey paper, not white)', (await p.evaluate(() => getComputedStyle(document.documentElement).getPropertyValue('--bg').trim().toUpperCase()))==='#B4BAC5');
    check('no page errors (around the app)', p.errors.length===0, p.errors);
    await p.context().close();
  }

  // ---- Instagram: token in the launcher only; accounts; stats; it feeds your card ----
  {
    const asked = [];
    const now = new Date(2026,9,12,10,0);
    const media = []; for(let i=0;i<8;i++){ const d = new Date(2026,9,11-i*3,12); media.push({id:'m'+i, caption:'Post '+i, media_type:'VIDEO', media_product_type:'REELS', timestamp:d.toISOString(), like_count:100+i, comments_count:5+i, permalink:'https://instagram.com/p/'+i, thumbnail_url:''}); }
    const p = await ctxPage(b, {profile:{name:'Andre'}}, {clock:now.getTime(), route: r => { const u = r.request().url(); asked.push(u.replace(/^.*8935/, ''));
      if(u.includes('/ig/api')){ const pth = hexDecode(u.split('p=')[1]);
        if(pth.startsWith('/me/accounts')) return r.fulfill({status:200, headers:CORS, body:JSON.stringify({data:[{name:'Page', instagram_business_account:{id:'ig1', username:'andre.builds', followers_count:4800}}]})});
        if(pth.startsWith('/ig1/media')) return r.fulfill({status:200, headers:CORS, body:JSON.stringify({data:media})});
        if(pth.includes('/insights')) return r.fulfill({status:200, headers:CORS, body:JSON.stringify({data:[{name:'reach', values:[{value:2500}]}]})});
        if(pth.startsWith('/ig1')) return r.fulfill({status:200, headers:CORS, body:JSON.stringify({username:'andre.builds', followers_count:4800, media_count:120})});
      }
      if(u.includes('/ig/status')) return r.fulfill({status:200, headers:CORS, body:'{"ok":true,"hasKey":false}'});
      return r.fulfill(okJ); }});
    const E = c => p.evaluate(x => window.__op.ev(x), c);
    await E("ui.view='convos'; renderView()"); await p.waitForTimeout(300);
    check('Social: a Connect Instagram card when it isn’t connected', await p.isVisible('.ig-connect'));
    await E("ui.view='settings'; ui.settingsTab='integrations'; renderView()"); await p.waitForTimeout(400);
    await p.fill('#igToken', 'EAAB-SECRET-IG'); await p.click('[data-action="igSave"]'); await p.waitForTimeout(800);
    check('the token goes to the launcher', asked.some(u => u.startsWith('/ig/key?t=') && hexDecode(u.split('t=')[1])==='EAAB-SECRET-IG'));
    check('…your accounts are found', await p.isVisible('[data-action="igAdd"][data-id="ig1"]'));
    await p.click('[data-action="igAdd"][data-id="ig1"]'); await p.waitForTimeout(1200);
    check('…added as your business account, and its stats come in', await E("igCfg().accounts[0].role")==='business' && await E("igCfg().cache && igCfg().cache.data.ig1.followers")===4800 && await E("igCfg().cache.data.ig1.posts[0].reach")===2500);
    await E("ui.view='convos'; renderView()"); await p.waitForTimeout(300);
    check('Social: followers, posts, likes, reach, the posting strip, top posts', /4,800/.test(await p.textContent('.ig-acct')) && (await p.$$('.ig-strip i')).length===30 && (await p.$$('.ig-top .ig-post')).length===6);
    check('business posts count on your card by themselves', await E("igPostsByRole('business')")===8 && await E("xpFollowersNow()")===4800);
    check('the token is never in Operator’s data', !(await p.evaluate(() => { let s = ''; for(let i=0;i<localStorage.length;i++) s += localStorage.getItem(localStorage.key(i)); return /SECRET/.test(s) || /SECRET/.test(JSON.stringify(window.__op.state)); })));
    check('no page errors (Instagram)', p.errors.length===0, p.errors);
    await p.context().close();
  }

  await b.close();
  process.exit(report() ? 1 : 0);
})();
