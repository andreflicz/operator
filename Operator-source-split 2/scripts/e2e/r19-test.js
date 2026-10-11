// Round 19: ElevenLabs says why it won't speak (and the Mac's voice steps in); the page says hello and
// goodbye to the launcher; Settings in seven clear places (keys in Connections & data); Content —
// business and personal, with targets; You — minimal, the guide as its own page with charts; levels
// you claim (fire), the caution sign; Discipline = on target + streak; Finances in Personal; Good
// morning — the rolling good-day list, Today with room, the scoreboard, a caption that never moves the
// page; no Change on Up next while locked in; Flowtime earns nothing in the first 20 min; full screen
// you set yourself stays; Meta Ads on Social.
const { instrument, launch, check, report, OUT } = require('./common.js');
const path = require('path');
const CORS = {'Access-Control-Allow-Origin':'*'};
const okJ = {status:200, body:'{"ok":true}', headers:CORS};
async function ctxPage(b, seed, opts){
  opts = opts || {};
  const ctx = await b.newContext({viewport: opts.viewport || {width:1440, height:900}}); const p = await ctx.newPage(); p.errors = []; p.on('pageerror', e => p.errors.push(e.message));
  if(opts.clock) await p.clock.install({time:opts.clock});
  await p.addInitScript((seed) => { if(sessionStorage.getItem('s')) return; sessionStorage.setItem('s', '1'); Object.keys(seed).forEach(k => localStorage.setItem('opsdash:'+k, JSON.stringify(seed[k]))); }, seed);
  if(opts.route) await p.route('http://127.0.0.1:8935/**', opts.route);
  await p.goto('file://'+path.resolve(OUT+'/r19.html')); await p.waitForTimeout(500);
  return p;
}
(async () => {
  instrument(process.argv[2], OUT+'/r19.html');
  const b = await launch();
  const MON = new Date(2026,9,12,7,0,5).getTime();
  const WAKE = {enabled:true, time:'07:00', days:[0,1,2,3,4,5,6], news:true, newsSports:'Giants', intro:'quick', introChosen:true, voice:false};

  // ---- the voice: ElevenLabs' own reason, and the Mac's voice instead of silence; hello to the launcher ----
  {
    const seen = [];
    const p = await ctxPage(b, {profile:{name:'Andre'}, focus:{wake:Object.assign({}, WAKE, {voice:true, voiceEngine:'eleven'})}}, {route: r => { const u = r.request().url(); seen.push(u);
      if(u.includes('/tts/say') && u.includes('e=eleven')) return r.fulfill({status:502, headers:CORS, body:JSON.stringify({ok:false, code:402, error:'paid_plan_required: Free users cannot use library voices via the API'})});
      if(u.includes('/tts/say')) return r.fulfill({status:500, headers:CORS, body:'{}'});
      if(u.includes('/ping')) return r.fulfill({status:200, headers:CORS, body:'{"ok":true,"helper":11}'});
      return r.fulfill(okJ); }});
    const E = c => p.evaluate(x => window.__op.ev(x), c);
    check('the page says hello to the launcher when it opens', seen.some(u => /\/hello$/.test(u)));
    await E("ACTIONS.opTest()"); await p.waitForTimeout(1500);
    check('ElevenLabs saying no is explained (a paid-plan voice)', /paid ElevenLabs plan/.test(await E("OV.elevenErr || ''")), await E("OV.elevenErr"));
    check('…and the next try goes to the Mac’s voice, not silence', seen.some(u => u.includes('/tts/say') && u.includes('e=mac')));
    check('…and the toast says why', /ElevenLabs/.test(await p.textContent('#toastContainer')));
    check('the reasons read plainly', /Text to Speech/.test(await E("opElevenWhy(401, 'missing_permissions')")) && /credits/.test(await E("opElevenWhy(429, 'quota_exceeded')")) && /can’t find that voice/.test(await E("opElevenWhy(404, 'voice_not_found')")));
    check('no page errors (voice)', p.errors.length===0, p.errors);
    await p.context().close();
  }

  // ---- Settings: seven clear places; keys in Connections & data ----
  {
    const p = await ctxPage(b, {profile:{name:'Andre'}, focus:{wake:Object.assign({}, WAKE, {voice:true})}}, {route: r => { const u = r.request().url();
      if(u.includes('/engine')) return r.fulfill({status:200, headers:CORS, body:'{"ok":true,"on":true,"failed":false}'});
      if(u.includes('/ping')) return r.fulfill({status:200, headers:CORS, body:'{"ok":true,"helper":11}'});
      return r.fulfill(okJ); }});
    const E = c => p.evaluate(x => window.__op.ev(x), c);
    await E("ui.view='settings'; ui.settingsTab='you'; renderView()"); await p.waitForTimeout(200);
    const navs = await p.$$eval('.settings-nav-item', e => e.map(x => x.textContent.trim()));
    check('Settings: You · Goals & Standards · Focus & Lock in · Morning & Alarms · Look & Sound · Business & Calendar · Connections & Data', navs.length===7 && /Goals & Standards/.test(navs.join()) && /Morning & Alarms/.test(navs.join()), navs);
    check('You: about you, body & health, why — once (the alarm card isn’t here twice)', await p.isVisible('#setHeightFt') && (await p.$$('#wakeSettingsSection')).length===0);
    await E("ui.settingsTab='standards'; renderView()"); await p.waitForTimeout(200);
    check('Goals & Standards: average hours a day, new clients a month, content targets', await p.isVisible('#setAvgHoursTarget') && await p.isVisible('#setNewClientsPerMonth') && await p.isVisible('#setContentBusinessN') && await p.isVisible('#setContentPersonalPer'));
    await p.fill('#setContentBusinessN', '5'); await p.selectOption('#setContentBusinessPer', 'week'); await p.fill('#setContentPersonalN', '1'); await p.selectOption('#setContentPersonalPer', 'day');
    await p.click('[data-action="saveProfile"]'); await p.waitForTimeout(200);
    check('…and they save', await E("JSON.stringify(state.standards.contentTargets)")==='{"business":{"n":5,"per":"week"},"personal":{"n":1,"per":"day"}}');
    await E("ui.settingsTab='morning'; renderView()"); await p.waitForTimeout(200);
    check('Morning & Alarms: the wake-up card and the other alarms', await p.isVisible('#wakeSettingsSection') && await p.isVisible('#alarmsSettingsSection'));
    await E("ui.settingsTab='system'; renderView()"); await p.waitForTimeout(600);
    check('Connections & data → The Operator: the app, the voice keys, the Anthropic key', await p.isVisible('#opAppCard') && await p.isVisible('#opVoiceSet') && await p.isVisible('#aiKey') && (await p.$$('#aiKey')).length===1);
    check('…with the own-app switch (Operator / Google Chrome)', /Operator/.test(await p.textContent('#opAppCard')) && await p.isVisible('[data-action="opEngineSwitch"][data-id="0"]'));
    await E("openWakeSetup()"); await p.waitForTimeout(300);
    check('the alarm set-up just points to the voice settings', !(await p.$('#wakeSetupContent #opVoiceSet')) && await p.isVisible('#wakeSetupContent [data-action="goToOperatorSettings"]'));
    check('no page errors (settings)', p.errors.length===0, p.errors);
    await p.context().close();
  }

  // ---- Content: business and personal, with targets; finished = out ----
  {
    const p = await ctxPage(b, {profile:{name:'Andre'}, standards:{items:[], deepWorkTargetMinutes:180, contentTargets:{business:{n:3, per:'week'}, personal:{n:2, per:'week'}}},
      tasks:{items:[{id:'v1', title:'Client testimonial cut', isVideoIdea:true, status:'backlog', clients:['general'], contentRole:'business', createdAt:'2026-10-10'}, {id:'v2', title:'Day in the life', isVideoIdea:true, status:'backlog', clients:['personal'], createdAt:'2026-10-10'}]}}, {clock:MON});
    const E = c => p.evaluate(x => window.__op.ev(x), c);
    await E("ui.view='focus'; ui.focusTab='tasks'; ui.focusTasksSubTab='videoIdeas'; renderView()"); await p.waitForTimeout(300);
    check('“Video Ideas” is now Content', /Content/.test(await p.textContent('.subtabs')) && !/Video Ideas/.test(await p.textContent('.subtabs')));
    check('two lanes: Business content and Personal content, each with its target', (await p.$$('.ct-lane')).length===2 && /0 of 3 this week/.test(await p.textContent('.ct-lane[data-content-role="business"]')) && /0 of 2 this week/.test(await p.textContent('.ct-lane[data-content-role="personal"]')));
    check('each idea sits in its lane', /testimonial/.test(await p.textContent('.ct-lane[data-content-role="business"] .ct-list')) && /Day in the life/.test(await p.textContent('.ct-lane[data-content-role="personal"] .ct-list')));
    await p.click('.ct-lane[data-content-role="business"] .ct-add'); await p.waitForTimeout(200);
    await p.fill('#newVideoIdeaTitle', 'Agency ad'); await p.click('[data-action="addVideoIdea"]'); await p.waitForTimeout(200);
    check('+ in a lane adds business content', await E("(state.tasks.items.find(t=>t.title==='Agency ad')||{}).contentRole")==='business');
    await E("const t=state.tasks.items.find(x=>x.id==='v1'); t.status='done'; t.completedAt=todayStr(); persist('tasks'); renderView()"); await p.waitForTimeout(200);
    check('finishing it counts as a video out (1 of 3)', await E("contentProgress('business').done")===1 && /1 of 3/.test(await p.textContent('.ct-lane[data-content-role="business"]')));
    await E("ACTIONS.contentSwapRole(null, null, 'v2')");
    check('⇄ moves an idea to the other lane', await E("contentRoleOf(state.tasks.items.find(x=>x.id==='v2'))")==='business');
    check('no page errors (content)', p.errors.length===0, p.errors);
    await p.context().close();
  }

  // ---- XP: ratings, levels you claim, the guide ----
  {
    const p = await ctxPage(b, {profile:{name:'Andre', xpStart:'2026-10-01', xpMrrBase:0, xpClientsBase:['c1','c2'], xpLevel:0},
      business:{clients:[{id:'c1', name:'A', stage:'active', status:'active', mrr:2000, createdAt:'2026-10-08'}, {id:'c2', name:'B', stage:'active', status:'active', mrr:0, createdAt:'2026-10-09'}], pipeline:[]},
      finances:{debts:[{id:'d1', name:'Card', balance:600, originalAmount:1000}], payments:[{id:'p1', debtId:'d1', amount:100, date:'2026-10-05'}], income:[], invoices:[]}}, {clock:MON});
    const E = c => p.evaluate(x => window.__op.ev(x), c);
    const subs = await E("JSON.stringify(Object.fromEntries(['BUS','PER','DIS'].map(k=>[k, xpSummary().attrs[k].subs.map(s=>s.label)])))");
    check('Discipline is just On target and Streak', /"DIS":\["On target","Streak"\]/.test(subs), subs);
    check('Personal: content, goals, reflection, finances — no “Video ideas”', /"PER":\["Personal content","Your goals","Reflection","Finances"\]/.test(subs), subs);
    check('clients typed in recently don’t count as client growth (start dates do)', await E("xpSummary().attrs.BUS.subs.find(s=>s.label==='Client growth').v")===25);
    check('Finances: 40% paid off and a payment this month', /40% paid off/.test(await E("financeRating().note")) && await E("financeRating().f") > .3);
    // XP from the MRR you added (2k → 1,600 XP): the next level is ready, not handed out
    check('XP stacks past the level; the level waits to be claimed', await E("xpSummary().total")>=1000 && await E("xpSummary().level")===0 && await E("xpSummary().canLevel")===true);
    await E("ui.view='personal'; ui.personalTab='you'; renderView()"); await p.waitForTimeout(300);
    check('You: a Level up button, no “Next rank” paragraph', await p.isVisible('.you .lvl-up-btn') && !/Next rank/.test(await p.textContent('.you-main')));
    check('…and it waits in the notifications', await E("notifList().some(n=>n.key==='lvl:1')"));
    await p.click('.you .lvl-up-btn'); await p.waitForTimeout(400);
    check('pressing it: level 1, and the fire', await E("state.profile.xpLevel")===1 && await p.isVisible('#lvlFx') && /LEVEL UP/.test(await p.textContent('#lvlFx')));
    check('higher levels burn bigger: more rings, a new colour', await E("levelUpFx(12, null); document.querySelectorAll('#lvlFx .lvl-rings i').length")===5 && await E("document.getElementById('lvlFx').className").then(c => /tier-3/.test(c)));
    await E("document.getElementById('lvlFx').remove()");
    // the gate: level 3 is a rank's level — it needs Health 40 (no height and weight here)
    await E("state.profile.xpLevel = 2; state.business.clients[0].mrr = 6000; persist('business'); xpLast = null; renderView()"); await p.waitForTimeout(300);
    check('at a rank’s level without the Health: no button — the caution sign', await E("xpSummary().canLevel")===false && /Health 40/.test(await p.textContent('.xp-caution')));
    await p.click('.you-q'); await p.waitForTimeout(300);
    check('? opens the XP guide — its own page, with charts', await p.isVisible('#xpHowOverlay .xpg') && (await p.$$('#xpHowOverlay .xpg-chart')).length>=5 && /Finishing tasks/.test(await p.textContent('#xpHowOverlay')));
    await E("ACTIONS.closeXpHow()");
    check('master goal: average hours a day (8h)', await E("goalSuggestions().some(g=>g.autoTrack==='avghours' && g.target===8)") && await E("goalIsPeriodic({autoTrack:'avghours'})"));
    await E("ui.personalTab='goals'; ui.forms.newGoal=true; renderView()"); await p.waitForTimeout(200);
    check('a goal needs a number', await E("(function(){ const n = state.goals.items.length; const el = document.getElementById('newGoalLabel'); if(el) el.value='Launch the site'; addGoal(); return state.goals.items.length===n; })()"));
    await E("ui.personalTab='finances'; renderView()"); await p.waitForTimeout(200);
    check('Personal → Finances: your debts, paid off, and your rating', await p.isVisible('.fin-head') && /\$600 to go/.test(await p.textContent('.fin-head')) && /40% paid off/.test(await p.textContent('.fin-head')));
    check('no page errors (XP)', p.errors.length===0, p.errors);
    await p.context().close();
  }

  // ---- Good morning: the good-day list rolls, Today has room, the scoreboard, a still page ----
  for (const vw of [{width:1440, height:900}, {width:1920, height:1080}]) {
    const TEAM = {NYG:'New York Giants', DAL:'Dallas Cowboys', PHI:'Philadelphia Eagles'};
    const ev = (id, h, a, hs, as, st, date) => ({id, date, status:{type:{state:st, shortDetail: st==='post'?'Final':'Sun'}}, competitions:[{competitors:[{homeAway:'home', score:hs, winner: st==='post' && +hs>+as, team:{abbreviation:h, displayName:TEAM[h], shortDisplayName:TEAM[h].split(' ').pop()}},{homeAway:'away', score:as, winner: st==='post' && +as>+hs, team:{abbreviation:a, displayName:TEAM[a], shortDisplayName:TEAM[a].split(' ').pop()}}]}]});
    const p = await ctxPage(b, {profile:{name:'Andre'}, calendar:{events:[{id:'e1', date:'2026-10-12', time:'13:00', title:'Call with JJS'}, {id:'e2', date:'2026-10-12', time:'16:00', title:'Shoot B-roll'}]}, focus:{wake:WAKE}}, {clock:MON, viewport:vw, route: r => { const u = r.request().url();
      if(u.includes('/sports')) return r.fulfill({status:200, headers:CORS, body:JSON.stringify({events: u.includes('l=nfl') ? [ev('1','NYG','DAL','24','17','post','2026-10-11T17:00Z'), ev('2','PHI','NYG','','','pre','2026-10-18T17:00Z')] : []})});
      if(u.includes('/news')) return r.fulfill({status:200, headers:CORS, body:'<rss><channel><item><title>Headline one - Reuters</title><link>https://x.com/1</link></item><item><title>Headline two - Reuters</title><link>https://x.com/2</link></item></channel></rss>'});
      return r.fulfill(okJ); }});
    const E = c => p.evaluate(x => window.__op.ev(x), c);
    await E("fireWake({})"); await p.click('[data-action="wakeStartDay"]'); await p.waitForTimeout(900);
    await E("briefRevealAll()"); await p.clock.runFor(2500); await p.waitForTimeout(800);
    const wide = vw.width >= 1680;
    check(vw.width+': For a Good Day rolls (a reel of the morning, four at a time)', (await p.$$('.gd-reel .gd-i')).length >= 8 && await p.isVisible('.gd-dots'));
    const i0 = await E("ui.gdIdx||0"); await p.clock.runFor(5600); await p.waitForTimeout(200);
    check(vw.width+': …and it moves on by itself', await E("ui.gdIdx||0")!==i0);
    check(vw.width+': Today has its own room — '+(wide ? 'on top of the headlines' : 'under the weather'), await p.$(wide ? '.c-c .br-day' : '.c-a .br-day')!==null && /Call with JJS/.test(await p.textContent('.br-day')));
    check(vw.width+': sports is a scoreboard — results and what’s coming up', (await p.$$('.br-sports .sb-row')).length>=2 && /Results/.test(await p.textContent('.br-sports')) && /Coming up/.test(await p.textContent('.br-sports')));
    const box = await p.evaluate(() => { const v = document.querySelector('.brief4 .br-voice'); return v ? v.getBoundingClientRect().height : 0; });
    await E("document.getElementById('brVoice').textContent = 'A much longer line of narration that would have wrapped onto a second line and pushed every panel below it down the page'");
    const box2 = await p.evaluate(() => document.querySelector('.brief4 .br-voice').getBoundingClientRect().height);
    check(vw.width+': the caption never changes the page (its box is a fixed size)', box > 0 && Math.abs(box - box2) < 1, [box, box2]);
    check(vw.width+': the page stays put (no scrolling itself)', await p.evaluate(() => { const c = document.getElementById('wakeContent'); return !c || c.scrollTop===0; }));
    check(vw.width+': no page errors (Good morning)', p.errors.length===0, p.errors);
    await p.context().close();
  }

  // ---- I'm up: the alarm lifts away, then Good morning rises in ----
  {
    const p = await ctxPage(b, {profile:{name:'Andre'}, focus:{wake:WAKE}}, {clock:MON, route: r => r.fulfill(okJ)});
    const E = c => p.evaluate(x => window.__op.ev(x), c);
    await E("fireWake({})"); await p.waitForTimeout(300);
    await E("wakeImUp()");
    check('I’m up: the alarm lifts away first', await p.$('#wakeContent.is-waking')!==null);
    await p.clock.runFor(450); await p.waitForTimeout(150);
    check('…then Good morning rises in with the sunrise wash', await E("ui.wakeMode")==='brief' && await p.$('#wakeOverlay.is-entering')!==null);
    check('no page errors (I’m up)', p.errors.length===0, p.errors);
    await p.context().close();
  }

  // ---- locked in: Up next is drag and drop; Flowtime; full screen you set stays ----
  {
    let fullCalls = [];
    const p = await ctxPage(b, {profile:{name:'Andre'}, tasks:{items:[{id:'a', title:'Edit reel', status:'today', priority:'high', clients:['personal']}, {id:'b', title:'Send invoice', status:'today', priority:'med', clients:['personal']}]}}, {clock:MON, route: r => { const u = r.request().url();
      if(u.includes('/window/full')){ fullCalls.push(u); return r.fulfill({status:200, headers:CORS, body: u.includes('f=1') ? '{"ok":true,"already":true}' : '{"ok":true}'}); }
      return r.fulfill(okJ); }});
    const E = c => p.evaluate(x => window.__op.ev(x), c);
    await E("ui.view='today'; renderView()"); await p.waitForTimeout(200);
    check('not locked in: Up next can be changed', await p.$('.nn-next [data-action="toggleNextPicker"]')!==null);
    await E("ui.pendingLockMethod={id:'flow'}; startFocus(null); ui.pendingLockMethod=null; ui.view='today'; renderView()"); await p.waitForTimeout(300);
    check('locked in: no Change on Up next — drag and drop', await p.$('.nn-next [data-action="toggleNextPicker"]')===null);
    await E("state.focus.activeSession.startedAt = Date.now() - 12*60000");
    check('Flowtime at 12 min: no break “waiting” yet', await E("flowBreakMinutes()")===0 && /unlocks at/.test(await E("methodLine(methodState())")));
    await E("state.focus.activeSession.startedAt = Date.now() - 50*60000");
    check('…at 50 min: 10 min earned', await E("flowBreakMinutes()")===10);
    await E("document.body.classList.add('np-on'); trueFullSync()"); await p.waitForTimeout(400);
    await E("document.body.classList.remove('np-on'); trueFullSync()"); await p.waitForTimeout(400);
    check('a window you already made full screen stays full screen when you leave', fullCalls.some(u => u.includes('f=1')) && !fullCalls.some(u => u.includes('f=0')), fullCalls);
    check('no page errors (locked in)', p.errors.length===0, p.errors);
    await p.context().close();
  }

  // ---- Meta Ads on Social ----
  {
    const p = await ctxPage(b, {profile:{name:'Andre'}}, {route: r => { const u = r.request().url();
      if(u.includes('/ig/status')) return r.fulfill({status:200, headers:CORS, body:'{"ok":true,"hasKey":true}'});
      if(u.includes('/ig/api')){ const q = Buffer.from(new URL(u).searchParams.get('p'), 'hex').toString('utf8');
        if(q.startsWith('/me/adaccounts')) return r.fulfill({status:200, headers:CORS, body:JSON.stringify({data:[{account_id:'77', name:'Rivera Ads', currency:'USD', account_status:1}]})});
        if(q.includes('level=campaign')) return r.fulfill({status:200, headers:CORS, body:JSON.stringify({data:[{campaign_name:'JJS lead gen', spend:'640', clicks:'700', ctr:'1.8', actions:[{action_type:'lead', value:'38'}]}]})});
        if(q.includes('time_increment')) return r.fulfill({status:200, headers:CORS, body:JSON.stringify({data:[{date_start:'2026-10-01', spend:'20'}, {date_start:'2026-10-02', spend:'35'}]})});
        if(q.includes('/insights')) return r.fulfill({status:200, headers:CORS, body:JSON.stringify({data:[{spend:'1240.5', impressions:'84000', reach:'52000', clicks:'1310', ctr:'1.56', cpc:'0.95', cpm:'14.77', actions:[{action_type:'lead', value:'62'}]}]})});
        return r.fulfill({status:200, headers:CORS, body:'{"data":[]}'}); }
      return r.fulfill(okJ); }});
    const E = c => p.evaluate(x => window.__op.ev(x), c);
    await E("ui.view='settings'; ui.settingsTab='integrations'; renderView()"); await p.waitForTimeout(500);
    check('Settings: Instagram & Meta Ads, with a 4-step connect guide', /Meta Ads/.test(await p.textContent('.ig-set')) && (await p.$$('.meta-how li')).length===4);
    await E("ACTIONS.adsFind()"); await p.waitForTimeout(300);
    await p.click('[data-action="adsAdd"]'); await p.waitForTimeout(800);
    check('find your ad account, add it', await E("adsCfg().ads[0].id")==='act_77');
    await E("ui.view='convos'; renderView()"); await p.waitForTimeout(400);
    check('Social: spend, leads, cost per lead, the spend chart, campaigns', /\$1,241/.test(await p.textContent('.ads-acct')) && /62/.test(await p.textContent('.ads-acct')) && /per lead/.test(await p.textContent('.ads-acct')) && (await p.$$('.ads-bars i')).length===2 && /JJS lead gen/.test(await p.textContent('.ads-camps')));
    check('the token never touches Operator’s data', !(await p.evaluate(() => { let s = ''; for(let i=0;i<localStorage.length;i++) s += localStorage.getItem(localStorage.key(i)); return /access_token/.test(s); })));
    check('no page errors (ads)', p.errors.length===0, p.errors);
    await p.context().close();
  }

  await b.close();
  process.exit(report() ? 1 : 0);
})();
