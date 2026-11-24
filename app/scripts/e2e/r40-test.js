// Round 40: deliverable tasks named for the client on the work and clock-out pages; one-offs on client cards,
// no "Next step"; no deliverable in the +; the You card turns cleanly and trends are the number's colour; the
// lock-out screen (why, a quote, hold to lock out); Op hears long messages and knows the time; music volume in
// the minimal views; the locked-in Overview panels; Social with Overview / Posts / Messages / Ads (Zernio).
const { chromium } = require('playwright');
const { instrument, newPage, check, report, OUT } = require('./common.js');
(async () => {
  instrument(process.argv[2], OUT+'/r40.html');
  const b = await chromium.launch({ executablePath:(process.env.OP_CHROME || require('fs').readdirSync('/opt/pw-browsers').filter(n => /^chromium-\d+$/.test(n)).sort().map(d => ['chrome-linux/chrome', 'chrome-linux64/chrome'].map(s => '/opt/pw-browsers/'+d+'/'+s).find(f => require('fs').existsSync(f))).filter(Boolean).pop()), args:['--no-sandbox', '--autoplay-policy=no-user-gesture-required'] });
  const T = new Date(2026,9,14,14,20).getTime();
  const biz = {clients:[
    {id:'bm', name:'Mike', business:'Brothers Mechanical', stage:'active', status:'active', mrr:2000, startDate:'2026-09-01', createdAt:'2026-09-01', touches:['2026-10-12'],
      deliverables:[{id:'d1', title:'Reels', weeklyTarget:4, recurring:true, status:'pending', completedDates:[]}, {id:'o1', title:'Launch video', recurring:false, status:'pending', dueDate:'2026-10-20'}]}]};
  const J = (r, o) => r.fulfill({status:200, body:JSON.stringify(o), headers:{'Access-Control-Allow-Origin':'*'}});

  {
    const p = await newPage(b, OUT+'/r40.html', {profile:{name:'Andre'}, business:biz, tasks:{items:[]}, focus:{motivations:{toward:[{id:'w1', text:'Pay off debt'}], away:[{id:'a1', text:'Staying stuck'}]}}}, T);
    const E = c => p.evaluate(x => window.__op.ev(x), c);
    await p.waitForTimeout(1500);
    await E("masterTasksSync(); const t = state.tasks.items.find(t => t.master && t.master.kind==='dvw' && t.master.wk===1); t.status='today'; clockIn({quiet:true})"); await p.waitForTimeout(1200);
    const wk = await p.textContent('#planOverlay');
    check('work mode: a deliverable task says whose and what (“Brothers Mechanical: 4 reels, week 1”), not “16 Reels 1/4”', /Brothers Mechanical: 4 reels, week 1/.test(wk) && !/16 Reels 1\/4/.test(wk), wk.slice(0, 300));
    await E("hideOverlay('planOverlay'); ui.view='business'; ui.businessTab='clients'; renderView()"); await p.waitForTimeout(400);
    check('client cards show one-off deliverables (with a tick box)', /Launch video/.test(await p.textContent('.cc2-one')) && !!(await p.$('.cc2-one [data-action="oneOffToggle"]')));
    check('…and no “Next step” row', !(await p.$('.cn-row')));
    await p.click('.cc2-one [data-action="oneOffToggle"]'); await p.waitForTimeout(300);
    check('…ticking a one-off marks it (and its task) done', await E("state.business.clients[0].deliverables[1].status")==='done');
    check('the + on Focus → Tasks has no “A client deliverable”', !(await E("JSON.stringify(focusAddMenu().map(x => x && x[1]))")).includes('client deliverable'));
    // the You card
    await E("ui.view='personal'; ui.personalTab='you'; renderView()"); await p.waitForTimeout(400);
    await p.click('.ycf .ycf-in > .pc:first-child'); await p.waitForTimeout(80);
    check('the You card turns edge-on first (no blank 3D half-way)', await E("document.querySelector('.ycf-in').classList.contains('is-turn-out')"));
    await p.waitForTimeout(600);
    check('…then shows its back, in the same box', await E("document.querySelector('.ycf').classList.contains('is-flipped')") && await p.evaluate(() => { const a = document.querySelector('.ycf .ycf-in > .pc:first-child').getBoundingClientRect(), c = document.querySelector('.ycf-back').getBoundingClientRect(); return Math.abs(a.height - c.height) < 2 && Math.abs(a.top - c.top) < 2; }));
    check('no ▲ / ▼ wedged into the stat labels', !(await p.$('.you-sub em.you-tr')));
    // lock-out
    await E("startFocus(); state.focus.activeSession.startedAt = Date.now() - 50*60000; ui.view='today'; renderView(); ACTIONS.openStopFocus()"); await p.waitForTimeout(400);
    const lo = await p.textContent('#stopFocusOverlay');
    check('lock-out: one screen with how long, your why, a hard-work quote and what’s left', /50m/.test(lo) && /Pay off debt/.test(lo) && !!(await p.$('.lo-q blockquote')) && /left today|list is clear/.test(lo) && !/Remaining Tasks/.test(lo));
    await p.click('.lo-hold'); await p.waitForTimeout(300);
    check('…a click on “Hold to lock out” isn’t enough', await E("!!state.focus.activeSession"));
    { const bb = await (await p.$('#loHold')).boundingBox(); await p.mouse.move(bb.x + bb.width/2, bb.y + bb.height/2); await p.mouse.down(); await p.waitForTimeout(1900); await p.mouse.up(); await p.waitForTimeout(300); }
    check('…holding it locks you out', !(await E("!!state.focus.activeSession")) && await E("state.focus.sessions.length") >= 1);
    // volume
    await E("state.profile.lockedStyle='player'; state.profile.lockedView='minimal'; startFocus(); ui.view='today'; renderView()"); await p.waitForTimeout(500);
    check('minimal view: a volume slider right there', !!(await p.$('.np-vol .mvol-in')));
    await E("const i = document.querySelector('.np-vol .mvol-in'); i.value = 30; i.dispatchEvent(new Event('input', {bubbles:true}))"); await p.waitForTimeout(100);
    check('…and it sets the music volume', Math.round(await E("state.profile.musicVolume*100"))===30);
    await E("state.profile.lockedStyle='cockpit'; renderView()"); await p.waitForTimeout(300);
    check('the Cockpit’s songs have a volume slider too', !!(await p.$('.ckm-vol .mvol-in')));
    // the locked-in Overview panels
    await E("state.profile.lockedView='full'; renderView()"); await p.waitForTimeout(400);
    check('locked-in Overview: Worth doing soon and Clients are the new cards', (await p.$$('.llx')).length===2 && !!(await p.$('.llx-c[data-id="bm"]')) && !!(await p.$('.llx-row')));
    check('no page errors (round 40)', p.errors.length===0, p.errors);
    await p.context().close();
  }

  // Op: the time
  {
    const p = await newPage(b, OUT+'/r40.html', {profile:{name:'Andre'}}, new Date(2026,9,14,22,5).getTime());
    const E = c => p.evaluate(x => window.__op.ev(x), c);
    await p.waitForTimeout(1500);
    const sys = await E("JSON.stringify(aiSystem())");
    check('Op knows it’s 10:05 PM and that it’s late: wind down, not work', /10:05 PM/.test(sys) && /Right now it’s late/.test(sys) && /don’t bring up work/.test(sys));
    check('…and his own work nudges stay quiet', !(await E("opNudgeDue()")) && await E("opLateNow()"));
    check('his listening waits longer the more you talk, up to 5 minutes', /300000/.test(await E("scribeListen.toString()")) && /talked\*0\.12/.test(await E("scribeListen.toString()")));
    await p.context().close();
  }

  // Social
  {
    const seed = {profile:{name:'Andre'}, business:biz, settings:{instagram:{accounts:[{id:'zernio-z1', src:'zernio', role:'business', znId:'z1', username:'brand'}]}}};
    const p = await newPage(b, OUT+'/r40.html', seed, T);
    const E = c => p.evaluate(x => window.__op.ev(x), c);
    const paths = [];
    await p.route('http://127.0.0.1:8935/**', async r => {
      const u = new URL(r.request().url());
      if(u.pathname!=='/zn/api') return J(r, {ok:true});
      const q = Buffer.from(u.searchParams.get('p'), 'hex').toString(); paths.push(q);
      if(q.startsWith('/v1/accounts?category=ads')) return J(r, {accounts:[{_id:'ads1', platform:'metaads'}]});
      if(q.startsWith('/v1/accounts')) return J(r, {accounts:[{_id:'z1', platform:'instagram', username:'brand', followersCount:5400}], hasAnalyticsAccess:true});
      if(q.startsWith('/v1/analytics/instagram/account-insights')) return J(r, {metrics:{reach:{total:42000}, profile_links_taps:{total:88}}});
      if(q.startsWith('/v1/analytics/instagram/follower-history')) return J(r, {metrics:{followers_gained:{total:320}, followers_lost:{total:40}, follower_count:{values:[{date:'2026-09-20', value:5120}, {date:'2026-10-13', value:5400}]}}});
      if(q.startsWith('/v1/analytics')) return J(r, {posts:[{_id:'a1', content:'Furnace fix', publishedAt:'2026-10-10T17:00:00Z', mediaProductType:'REELS', analytics:{impressions:9000, reach:8000, likes:400, comments:30, shares:55, saves:90, views:12000, reelsSkipRate:38, igReelsAvgWatchTime:9000, videoDurationSeconds:20}}]});
      if(q.startsWith('/v1/inbox/conversations/c1/messages')) return J(r, {messages:[{id:'m2', message:'Thursday works', direction:'incoming', createdAt:'2026-10-14T13:00:00Z'}]});
      if(q.startsWith('/v1/inbox/conversations')) return J(r, {data:[{id:'c1', participantName:'Sara Lee', lastMessage:'Thursday works', updatedTime:'2026-10-14T13:00:00Z', unreadCount:1, url:'https://instagram.com/direct/t/1'}]});
      if(q.startsWith('/v1/ads/campaigns')) return J(r, {campaigns:[{platformCampaignId:'k1', campaignName:'Brothers Mechanical - Furnace leads', status:'ACTIVE', currency:'USD', metrics:{spend:620, impressions:41000, clicks:820, ctr:2, conversions:31, costPerConversion:20, funnel:{leads:31}, engagementBreakdown:{videoViews:12300}}}]});
      return J(r, {});
    });
    await p.waitForTimeout(1500);
    await E("ACTIONS.goToSocial()"); await p.waitForTimeout(3000);
    check('Social: tabs for Overview, Posts, Messages and Ads', (await p.$$('.sx-tabs .seg-tab')).length >= 4);
    check('Overview: the Business profile with followers, growth, hook rate and reach; a slot for your Personal one', /5,400/.test(await p.textContent('.sx-prof')) && /\+280 in 30 days/.test(await p.textContent('.sx-prof')) && /62%/.test(await p.textContent('.sx-prof')) && /42\.0k/.test(await p.textContent('.sx-prof')) && !!(await p.$('.sx-prof.is-empty [data-action="socAddRole"][data-id="personal"]')));
    await E("ui.socTab='posts'; renderView()"); await p.waitForTimeout(300);
    check('Posts: each post with views, reach, saves, shares, engagement and hook rate', /12\.0k/.test(await p.textContent('.sx-post')) && /Hook 62%/.test(await p.textContent('.sx-post')) && /Watched 45%/.test(await p.textContent('.sx-post')));
    await E("ui.socTab='messages'; renderView()"); await p.waitForTimeout(800);
    await p.click('.sx-conv'); await p.waitForTimeout(600);
    check('Messages: your Instagram DMs (read-only, reply in Instagram)', /Thursday works/.test(await p.textContent('.sx-thread')) && /Reply in Instagram/.test(await p.textContent('.sx-thread')) && !(await p.$('.sx-thread textarea, .sx-thread input')));
    await E("ui.socTab='ads'; renderView()"); await p.waitForTimeout(900);
    check('Ads: Meta campaigns with spend, leads, cost per lead, CTR and hook rate', /\$620/.test(await p.textContent('.sx-ads')) && /31 leads/.test(await p.textContent('.sx-ads')) && /30%/.test(await p.textContent('.sx-ads')));
    await p.click('.sx-ad-g'); await p.waitForTimeout(300);
    check('…a campaign named for a client offers to link it; linked, its spend shows on their card', await E("igCfg().adLinks.k1")==='bm' && /\$620 on ads/.test(await E("clientCardV2(state.business.clients[0])")));
    check('only read calls (accounts, analytics, inbox, ads)', paths.every(x => /^\/v1\/(accounts|analytics|inbox\/conversations|ads)/.test(x)), paths);
    check('no page errors (round 40: Social)', p.errors.length===0, p.errors);
    await p.context().close();
  }
  await b.close();
  process.exit(report() ? 1 : 0);
})();
