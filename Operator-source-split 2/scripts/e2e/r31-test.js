// Round 31: deliverables carry over within the month; Op takes breaks for real (check back, no lock-in),
// one offer at a time, stays quiet asleep or shooting; goals connect to the business; Inspiration's
// Breeze (tap / hold), the + menu, Want to's together, nothing stuck, the card on its bubble, words about
// life; Settings without Morning & Alarms (Colors & Labels, Op), Business → Setup; the Calendar, rebuilt.
const { instrument, launch, check, report, OUT } = require('./common.js');
const path = require('path');
const CORS = {'Access-Control-Allow-Origin':'*'};
function helperRoute(calls){
  return r => {
    const u = r.request().url(); calls.push(u.replace('http://127.0.0.1:8935', ''));
    if(u.includes('/ai/status')) return r.fulfill({status:200, headers:CORS, body:JSON.stringify({ok:true, hasKey:true})});
    if(u.includes('/ai/models')) return r.fulfill({status:200, headers:CORS, body:JSON.stringify({data:[{id:'claude-haiku-5-5'}]})});
    if(u.includes('/ai/chat')){
      const bm = /[?&]b=([0-9a-f]+)/.exec(u), body = (r.request().postData() || '')+(bm ? Buffer.from(bm[1], 'hex').toString() : '');
      let res = {stop_reason:'end_turn', content:[{type:'text', text:'Noted.'}]};
      if(/I need a break/.test(body) && !/tool_result/.test(body)) res = {stop_reason:'tool_use', content:[{type:'tool_use', id:'t1', name:'check_back', input:{minutes:20, reason:'break'}}, {type:'tool_use', id:'t2', name:'lock_in', input:{minutes:25}}]};
      else if(/tool_result/.test(body)) res.content[0].text = 'Take twenty. I’ll check back at quarter to.';
      else if(/drift across a calm night sky/.test(body)) res.content[0].text = JSON.stringify({lines:['The river does not rush and still reaches the sea.']});
      return r.fulfill({status:200, headers:CORS, body:JSON.stringify(res)});
    }
    return r.fulfill({status:200, body:'{"ok":true}', headers:CORS});
  };
}
async function ctxPage(b, seed, opts){
  opts = opts || {};
  const ctx = await b.newContext({viewport:{width:1440, height:900}}); const p = await ctx.newPage(); p.errors = []; p.on('pageerror', e => p.errors.push(e.message));
  if(opts.clock) await p.clock.install({time:opts.clock});
  await p.addInitScript((seed) => { if(sessionStorage.getItem('s')) return; sessionStorage.setItem('s', '1'); Object.keys(seed).forEach(k => localStorage.setItem('opsdash:'+k, JSON.stringify(seed[k]))); }, seed);
  p.calls = [];
  await p.route('http://127.0.0.1:8935/**', helperRoute(p.calls));
  await p.goto('file://'+path.resolve(OUT+'/r31.html')); await p.waitForTimeout(600);
  return p;
}
(async () => {
  instrument(process.argv[2], OUT+'/r31.html');
  const b = await launch();
  const NOW = new Date(2026,9,13,14,20,0).getTime();   // Tuesday Oct 13 (the week began Mon Oct 12)
  const done = ['2026-10-05','2026-10-06','2026-10-07','2026-10-08','2026-10-09','2026-10-10','2026-10-11'];   // 7 of 18 for the month, all of it last week
  const business = {clients:[{id:'c1', name:'Jay', business:'JJS Fitness', mrr:1500, status:'active', stage:'active', startDate:'2026-10-02', journal:[], touchpoints:[], deliverables:[{id:'d1', title:'Reels', recurring:true, weeklyTarget:4, completedDates:done, createdAt:'2026-09-01'}]}],
    pipeline:[{id:'l1', name:'Rosa', company:'Rosa Bakery', stage:'contacted', value:800, notes:'', createdAt:'2026-10-01'}]};
  const base = {profile:{name:'Andre', revenueGoalMonthly:10000}, business, tasks:{items:[]}, goals:{items:[{id:'g1', label:'Hit $10k MRR by spring', done:false, target:null, current:0, unit:'', autoTrack:null, createdAt:'2026-10-01'}]}};

  // ---- deliverables, goals, Op ----
  {
    const p = await ctxPage(b, base, {clock:NOW});
    const E = c => p.evaluate(x => window.__op.ev(x), c);
    const d = "state.business.clients[0].deliverables[0]";
    check('a week where you did extra carries into the next (7 last week vs 4: this week starts at 3 of 4)', await E("deliverableWeekCount("+d+")")===3, await E("deliverableWeekCount("+d+")"));
    check('…and it isn’t in the red for it', await E("deliverablePaceStatus("+d+")")!=='danger');
    await E("renderView()"); await p.waitForTimeout(200);
    check('a goal written as “$10k MRR” links itself to the live MRR', await E("state.goals.items.find(g => g.id==='g1').autoTrack")==='mrr' && await E("state.goals.items.find(g => g.id==='g1').target")===10000);
    check('…and its card shows who it’s coming from, and what the open leads would add', /JJS Fitness/.test(await E("goalCardHtml(state.goals.items.find(g => g.id==='g1'))")) && /open lead/.test(await E("goalCardHtml(state.goals.items.find(g => g.id==='g1'))")));
    check('“sign 3 new clients” and “20 leads” link up too', await E("goalGuessTrack('Sign 3 new clients this month').track")==='newclients' && await E("goalGuessTrack('Keep 20 leads in the pipeline').track")==='leads');
    check('the revenue goal lives in Goals (the profile number follows the MRR goal)', await E("state.profile.revenueGoalMonthly")===10000 && await E("state.goals.items.filter(g => g.autoTrack==='mrr').length")===1);
    check('Op knows your habits and schedule', /His habits/.test(await E("aiContext()")));
    const sys = await E("JSON.stringify(aiSystem())");
    check('Op: one offer per reply, never a break and a lock-in together; big moves need a plain yes', /One offer per reply/.test(sys) && /Never put a break and a lock-in in the same reply/.test(sys) && /plain yes/.test(sys));
    // the break: he sets a check-back; the lock-in he also tried is refused
    await E("AI.hasKey = true; aiAsk('I need a break, been at it all morning', 'opBubText')"); await p.clock.runFor(1500); await p.waitForTimeout(400);
    check('a break sets a time to check back', await E("!!state.focus.opHold && state.focus.opHold.reason==='break'"));
    check('…and no lock-in starts, even if he tries in the same breath', await E("!state.focus.activeSession"));
    check('…presses, nudges and check-ins hold off while it’s on', !(await E("opPressDue()")) && !(await E("opNudgeDue()")));
    check('…but if you ask to lock in, he can', /locked in/.test(await E("(AI.lastUserText = 'ok lock me in for 25', opRunTool('lock_in', {minutes:25}))")));
    await E("AI.hasKey = false; state.focus.activeSession = null; state.focus.opHold = {until:Date.now() - 1000, reason:'break', set:Date.now() - 1200000}; OV.speaking = false; OV.pending = false; AI.busy = false; AI.listening = false");
    await p.clock.runFor(21000); await p.waitForTimeout(300);
    check('when the break’s up, he checks back (once)', !(await E("state.focus.opHold")) && /break|feeling|ready/i.test(await E("AI.history.filter(m => m.role==='assistant').slice(-1)[0].content")));
    await E("state.modes.active = {type:'shooting', startedAt:Date.now()}");
    check('asleep or shooting: no check-ins, presses or nudges (no one to talk to)', await E("opQuietNow()") && !(await E("opPressDue()")) && !(await E("opQuestionDue()")));
    await E("state.modes.active = null");
    check('no page errors (Op)', p.errors.length===0, p.errors);
    await p.context().close();
  }

  // ---- Inspiration ----
  {
    const p = await ctxPage(b, base, {clock:NOW});
    const E = c => p.evaluate(x => window.__op.ev(x), c);
    await E("openInspire()"); await p.clock.runFor(1200); await p.waitForTimeout(300);
    const tools = await p.textContent('#insp .insp-tools');
    check('the toolbar: Thought, Wish, Words, a + in the middle, Drift, Breeze, Sounds (no Breathe or sky button)', /Thought/.test(tools) && /Breeze/.test(tools) && !/Breathe/.test(tools) && !(await p.$('#insp .insp-tools > .izk[data-action="inspSky"]')) && !!(await p.$('#insp .izk-plus')));
    check('“Stuck? Reset” is gone from the middle', !(await p.$('#insp .izh-reset')));
    await p.click('#insp .izk-plus'); await p.waitForTimeout(300);
    const menu = await p.textContent('#insp .izk-plusmenu');
    check('the + opens Log something, Reset, Breathe and the sky', /Log something/.test(menu) && /Reset/.test(menu) && /Breathe/.test(menu) && await p.$$eval('#insp .izk-plusmenu button', e => e.length)===4);
    await p.click('#insp .izk-plusmenu [data-action="inspResetOpen"]'); await p.waitForTimeout(300);
    check('…Reset opens from there (and the menu closes)', await E("ui.inspResetSheet===true && !ui.inspPlusOpen"));
    await E("ui.inspResetSheet = false; inspRender()");
    const ids = await E("Array.prototype.map.call(document.querySelectorAll('#inspWorld .izb'), b => b.dataset.id).slice(0, 4)");
    await E("inspWants().push('"+ids[0]+"', '"+ids[1]+"'); inspRender()");
    await E("ACTIONS.inspBreezeAway()"); await p.clock.runFor(4000); await p.waitForTimeout(300);
    check('Breeze clears the sky…', await E("parseFloat(document.querySelector('#inspWorld .izb[data-id=\""+ids[2]+"\"]').style.opacity || 1)") < 0.2);
    check('…but your Want to’s stay', await E("parseFloat(document.querySelector('#inspWorld .izb[data-id=\""+ids[0]+"\"]').style.opacity || 1)") > 0.8 && /A clear sky/.test(await p.textContent('#insp')));
    await E("ACTIONS.inspBreezeAway()"); await p.clock.runFor(4000);
    await p.dispatchEvent('#insp [data-action="inspBreezeAway"]', 'pointerdown', {button:0}); await p.clock.runFor(700); await p.waitForTimeout(200);
    check('hold Breeze down: it asks to clear everything, Want to’s too', !!(await p.$('#insp .izk-ask')) && /Want to’s too/.test(await p.textContent('#insp .izk-ask')));
    await p.dispatchEvent('#insp [data-action="inspBreezeAway"]', 'pointerup', {button:0});
    await E("ACTIONS.inspBreezeAll()"); await p.clock.runFor(2600); await p.waitForTimeout(200);
    check('…and does, with an Undo', await E("inspWants().length")===0 && /Undo/.test(await p.textContent('#toastContainer')));
    await E("ACTIONS.inspBreezeUndo()");
    check('…Undo brings the Want to’s back', await E("inspWants().length")===2);
    await E("if(IW.away) ACTIONS.inspBreezeAway()"); await p.clock.runFor(3500);
    await E("inspGroupJoin('"+ids[0]+"', '"+ids[1]+"'); inspRender()"); await p.clock.runFor(300); await p.waitForTimeout(200);
    check('Want to’s you put together stay together (a tag, a line between them)', /2 together/.test(await p.textContent('#inspWorld .izg-layer')) && (await p.$$('#inspWorld .izg-svg line')).length===1);
    await E("ACTIONS.inspGroupOpen(null, null, '0')"); await p.clock.runFor(300); await p.waitForTimeout(200);
    check('…open it: do them all at once, or split them up', !!(await p.$('#inspWorld .izg-card [data-action="inspGroupDone"]')) && !!(await p.$('#inspWorld .izg-card [data-action="inspGroupSplit"]')));
    await E("ACTIONS.inspGroupDone(null, null, '0')"); await p.clock.runFor(1200); await p.waitForTimeout(200);
    check('…“I did them all” logs every one of them', await E("inspStore().log.filter(x => ['"+ids[0]+"', '"+ids[1]+"'].includes(x.act)).length")===2 && await E("inspGroups().length")===0);
    await E("inspPosStore()['"+ids[3]+"'] = {x:40, y:20}; inspWants().push('"+ids[3]+"'); inspUnstick()");
    check('a bubble left under the middle is moved back out into the open (nothing in limbo)', await E("Math.hypot(inspPosStore()['"+ids[3]+"'].x, inspPosStore()['"+ids[3]+"'].y*1.15)") >= 330);
    check('…and the Want to list can find any of them', /inspWantFind/.test(await E("inspHtml()")));
    await E("ui.inspOpenAct = '"+ids[3]+"'; inspRender()"); await p.clock.runFor(400); await p.waitForTimeout(200);
    check('a bubble’s card opens on the bubble, wherever it is', await E("(function(){ const b = document.querySelector('#inspWorld .izb[data-id=\""+ids[3]+"\"]'), c = document.querySelector('#inspWorld .izb-card'); return !!c && c.style.left===b.style.left && c.style.top===b.style.top; })()"));
    const lines = await E("inspWhisperLines()");
    check('the words are about life, not your to-do list', lines.length > 40 && !lines.some(l => /step by step|workouts|MRR/i.test(l)));
    await E("AI.hasKey = true; inspSkyRefresh()"); await p.waitForTimeout(800);
    check('…and Op writes a few of his own in that spirit', (await E("inspWhisperLines()"))[0]==='The river does not rush and still reaches the sea.');
    check('no page errors (Inspiration)', p.errors.length===0, p.errors);
    await p.context().close();
  }

  // ---- Settings, Business, Calendar ----
  {
    const seed = Object.assign({}, base, {focus:{wake:{enabled:true, time:'07:00', days:[0,1,2,3,4,5,6]}, work:{enabled:true, start:'09:00', end:'17:30', days:[1,2,3,4,5], lunch:'12:30', lunchMin:45, lunchOn:true, brkOn:false, checkins:true},
      alarms:[{id:'a1', time:'21:30', label:'Kitchen closes', days:[0,1,2,3,4,5,6], enabled:true}], reminders:[{id:'r1', label:'Call Mike back', date:'2026-10-13', time:'16:00'}],
      sessions:[{id:'s1', date:'2026-10-12', type:'deep', startedAt:new Date(2026,9,12,9).getTime(), endedAt:new Date(2026,9,12,13).getTime(), minutes:240}]},
      calendar:{events:[{id:'e1', date:'2026-10-13', time:'15:00', title:'Client call: JJS', categoryId:null}], categories:[]}});
    const p = await ctxPage(b, seed, {clock:NOW});
    const E = c => p.evaluate(x => window.__op.ev(x), c);
    await E("ui.view = 'settings'; ui.settingsTab = 'you'; renderView()"); await p.waitForTimeout(300);
    const nav = await p.textContent('.settings-sidenav');
    check('Settings: no Morning & Alarms; Colors & Labels and Op have their own tabs', !/Morning/.test(nav) && /Colors & Labels/.test(nav) && /\bOp\b/.test(nav));
    await E("ui.settingsTab = 'work'; renderView()"); await p.waitForTimeout(300);
    check('Colors & Labels: task categories, content types, calendar categories and journal types on one screen (no revenue goal, no client cycles)', !!(await p.$('.set-colors')) && /Calendar Categories/.test(await p.textContent('.set-colors')) && /Journal Types/.test(await p.textContent('.set-colors')) && !(await p.$('#setRevGoal')) && !/Client cycles/.test(await p.textContent('.settings-content')));
    await E("ui.settingsTab = 'op'; renderView()"); await p.waitForTimeout(300);
    check('Op checks in on you is an Op setting now', /Op checks in on you/.test(await p.textContent('.settings-content')) && !!(await p.$('[data-action="opCheckinSet"][data-k="checkins"]')));
    check('…and gone from the work alarm', !/Op checks in on you/.test(await E("workSetupHtml()")));
    await E("ui.view = 'business'; ui.businessTab = 'setup'; renderView()"); await p.waitForTimeout(300);
    check('Business → Setup: reach-out cadence, stages and client cycles live with the business', /Reach-out cadence/.test(await p.textContent('.biz-setup')) && /Client cycles/.test(await p.textContent('.biz-setup')));
    await E("ui.view = 'calendar'; ui.calendarYear = 2026; ui.calendarMonth = 9; ui.calendarSelectedDate = null; renderView()"); await p.clock.runFor(800); await p.waitForTimeout(300);
    await E("document.querySelectorAll('.overlay').forEach(o => o.classList.add('hidden'))");
    check('the Calendar: one page, three columns (now + alarms, the month, the week and reminders)', !!(await p.$('.calx .cx-now')) && !!(await p.$('.calx .cx-alarms')) && !!(await p.$('.calx .cx-month')) && !!(await p.$('.calx .cx-tier')) && !!(await p.$('.calx .cx-rem')));
    check('…it fits the screen (no scrolling)', await E("document.querySelector('.calx').getBoundingClientRect().bottom <= innerHeight + 2"));
    check('Now: a live clock, what’s next and when, and your day as a ribbon', /Client call: JJS/.test(await p.textContent('.cx-next')) && /in 40m/.test(await p.textContent('.cx-next')) && (await p.$$('.cx-ribbon .cx-seg')).length >= 3 && !!(await p.$('.cx-nowline')));
    check('Alarms live here: wake-up, work hours and the rest', /7:00 AM/.test(await p.textContent('.cx-alarms')) && /9:00 AM/.test(await p.textContent('.cx-alarms')) && /Kitchen closes/.test(await p.textContent('.cx-alarms')));
    await p.click('.cx-al.is-wake .cx-switch'); await p.waitForTimeout(200);
    check('…switch the wake-up alarm off right there', await E("wakeCfg().enabled")===false && !!(await p.$('.cx-al.is-wake.is-off')));
    await p.click('.cx-al.is-work .cx-al-main'); await p.waitForTimeout(400);
    check('…and its full setup opens from here (work tab)', await E("overlayOpen('wakeSetupOverlay') && ui.alarmTab==='work'"));
    await E("hideOverlay('wakeSetupOverlay')");
    check('the month: days shaded by work, today ringed, dots for reminders', await E("parseFloat(getComputedStyle(document.querySelector('.cx-d[data-date=\"2026-10-12\"]')).getPropertyValue('--h'))") > 0.5 && !!(await p.$('.cx-d.is-today')) && !!(await p.$('.cx-d[data-date="2026-10-13"] .cxdot-rm')));
    check('…and the selected day’s agenda right under it', /Client call: JJS/.test(await p.textContent('.cx-agenda')) && /Call Mike back/.test(await p.textContent('.cx-agenda')));
    await p.click('.cx-arrow[data-action="calNextMonth"]'); await p.waitForTimeout(300);
    check('turning the month slides it', /November 2026/.test(await p.textContent('.cx-mh')) && !!(await p.$('.cx-grid.from-right')));
    await p.click('.cx-mh [data-action="cxToday"]'); await p.waitForTimeout(300);
    check('…Today brings you back', /October 2026/.test(await p.textContent('.cx-mh')));
    await p.click('.cx-seg2 [data-id="month"]'); await p.waitForTimeout(300);
    check('This week / This month flip in one card', !!(await p.$('.cx-seg2.is-m')) && /October/.test(await p.textContent('.cx-tierbody')));
    await E("ui.view = 'settings'; ui.settingsTab = 'morning'; renderView()"); await p.clock.runFor(300); await p.waitForTimeout(300);
    check('an old link to Morning & Alarms lands on the Calendar', await E("ui.view")==='calendar');
    check('no page errors (Settings, Business, Calendar)', p.errors.length===0, p.errors);
    await p.context().close();
  }

  await b.close();
  process.exit(report() ? 1 : 0);
})();
