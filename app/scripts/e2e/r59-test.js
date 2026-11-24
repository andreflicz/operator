// Round 59: Andre's list (ROUND-59-LIST.md).
const { instrument, launch, newPage, check, report, OUT } = require('./common.js');
(async () => {
  instrument(process.argv[2], OUT+'/r59.html');
  const b = await launch();
  const at = new Date(2026, 9, 28, 10).getTime();
  const seed = {profile:{name:'Andre Lopez', goalWeight:175},
    settings:{instagram:{accounts:[{id:'a1', role:'business', username:'commenccollective', src:'zernio'}, {id:'a2', role:'personal', username:'andreflix', src:'zernio'}], cliAll:[{id:'c1', platform:'instagram', username:'jjs_build', followers:1800}], cliLinks:{c1:'jj'}}},
    health:{weightLog:[{date:'2026-10-01', weight:183.4}, {date:'2026-10-14', weight:181.68294196}, {date:'2026-10-27', weight:179.2}], calorieEntries:[]},
    business:{packages:[{id:'pk1', name:'Growth', price:3000, deliverables:[{id:'pd1', title:'Reels', weeklyTarget:2}], schedule:{pd1:[1, 5, 10, 15]}}],
      clients:[{id:'jj', name:'Jay', business:'JJS', stage:'active', status:'active', touches:['2026-10-01'], lastTouchDate:'2026-10-01', mrr:3000, startDate:'2026-09-05', billingDay:5, packageId:'pk1', deliverables:[{id:'d1', title:'Reels', recurring:true, weeklyTarget:2, completedDates:['2026-10-06'], fromPackage:true, sourceId:'pd1'}]},
               {id:'kk', name:'Kiko', business:'Kiko', stage:'active', status:'active', mrr:2000, startDate:'2026-10-20', deliverables:[]}],
      pipeline:[{id:'l1', name:'Mia', company:'Mia Spa', stage:'contacted', value:2500, createdAt:'2026-10-26'}, {id:'l2', name:'Luis', company:'Luis Auto', stage:'new', value:3000, createdAt:'2026-10-20'}]},
    calendar:{events:[{id:'ev1', title:'JJS shoot', date:'2026-10-29', time:'14:00', linkedClient:'jj'}]}};
  const p = await newPage(b, OUT+'/r59.html', seed, at);
  await p.setViewportSize({width:1440, height:900});
  const E = c => p.evaluate(x => window.__op.ev(x), c);
  await E("document.querySelectorAll('.overlay').forEach(o => o.classList.add('hidden')); AI.hasKey = false; OV.pending = false; OV.speaking = false; xpSystemShow = function(){}; uiConfirm = function(){ return Promise.resolve(true); }");
  try{
  // ================= A. Op =================
  await E("AI.hasKey = true; aiKeyCheck = function(){}; window.__asks = []; opFactsMoneyPage = function(){ return 'Coming in: $10,500. Going out: $0.'; }; aiWrite = async function(t){ window.__asks.push(t); return 'Pattern: money in, none out. Watch: no bank linked. Move: link one today.'; }; ui.view='personal'; ui.personalTab='finances'; renderView()"); await p.waitForTimeout(900);
  check('Op is asked for a read that fits three lines', await E("window.__asks.some(t => /9 words at most|30 words at most/.test(t))"));
  check('Finances: Op’s read is the first thing under the tabs', await E("(function(){ const r = document.querySelector('#viewRoot .r44'); return !!r && r.firstElementChild && r.firstElementChild.classList.contains('opi'); })()"));
  const h1 = await E("document.querySelector('#viewRoot .r58-opl').getBoundingClientRect().height");
  await E("opReadStore()['money'] = {text:'Pattern: '+('a lot of words here '.repeat(20))+' Watch: x. Move: y.', day:todayStr(), sig:'x'}; R58T['money'] = null; delete R58T['money']; renderView()"); await p.waitForTimeout(200);
  const h2 = await E("document.querySelector('#viewRoot .r58-opl').getBoundingClientRect().height");
  check('…and it has one fixed height: a long read doesn’t grow it and push the page', h1 > 60 && Math.abs(h1 - h2) < 1, [h1, h2]);
  await E("ui.view='business'; ui.businessTab='overview'; renderView()"); await p.waitForTimeout(300);
  check('Business → Overview: the read sits above the numbers', await E("(function(){ const r = document.querySelector('.r53-hq'); return !!r && r.firstElementChild.classList.contains('opi'); })()"));
  // the talk button while he speaks
  await E("AI.hasKey = false; window.__said = []; opChat().length = 0; OV.speaking = true; window.__pend = opSay('The weekly report goes out Friday and the shoot is Thursday.'); OV.speaking = true; r54TalkToggle()"); await p.waitForTimeout(150);
  check('tap the talk button while Op speaks: his whole line is written out in the chat', await E("opChat().some(e => e.r==='op' && /shoot is Thursday/.test(e.t))"));
  check('…what he was saying lets the rest of the turn go on', await E("Promise.race([window.__pend.then(() => 'done'), new Promise(r => setTimeout(() => r('stuck'), 300))])")==='done');
  check('…and nothing new is spoken for the rest of the turn (no new voice)', await E("(function(){ let spoke = false; const was = OV.token; opSay('Another line'); return R59.hush > Date.now() && OV.token===was; })()"));
  // (round 60: it goes into the same chat entry, not a second one)
  check('…and it says it in the chat instead', await E("opChat().some(e => e.r==='op' && /Another line/.test(e.t))"));
  await E("R59.hush = 0; OV.speaking = false");
  // app updates: Op's write-up, his words folded
  await E("opChat().push({r:'me', t:'ok so the calendar should start on monday and also posted reels should be green and late ones red', at:Date.now()}); R58.turn = {text:'ok so the calendar should start on monday and also posted reels should be green and late ones red', tools:[], filed:false, at:Date.now()}; opRunTool('suggest_improvement', {idea:'Calendar: weeks start on Monday. Posted reels show green, late ones red.'}); R58.turn = null");
  check('App updates: the entry is Op’s write-up, not his words copied', await E("r58UpdateEntries().some(e => e.text==='Calendar: weeks start on Monday. Posted reels show green, late ones red.')"));
  check('…and his own words are kept with it (folded)', await E("r58UpdateEntries().some(e => /posted reels should be green/.test(e.said))"));
  await E("ui.view='settings'; ui.settingsTab='system'; ui.r52Sub = {'settings-system':'updates'}; renderView()"); await p.waitForTimeout(200);
  check('…“What you said” opens under the write-up', !!(await p.$('.upd-card details.r59-said summary')));
  check('Op is told: write it up fully, never file a message about filing', await E("JSON.stringify(aiSystem())").then(s => /every point he made/.test(s) && /nope, it.s not there/i.test(s)));
  // ================= B. Playbooks =================
  await E("ui.view='business'; ui.businessTab='lifecycle'; ui.pbView='build'; renderView()"); await p.waitForTimeout(300);
  check('one permanent lead playbook, its stages the lead pipeline', await E("(function(){ const P = r59LeadPb(); return !!P && P.master && JSON.stringify(pbStages(P).map(s => s.name))===JSON.stringify(crmStages('lead').filter(s => s.kind!=='won' && s.kind!=='lost').map(s => s.label)); })()"));
  check('…every open lead is on it', await E("arr(state.business.pipeline).every(l => l.pb && l.pb.id===r59LeadPb().id)"));
  check('…it can’t be deleted', await E("(function(){ ACTIONS.pbDelete(null, null, r59LeadPb().id); return !!r59LeadPb(); })()"));
  await E("ui.pbSel = r59LeadPb().id; renderView()"); await p.waitForTimeout(150);
  check('…and its stages aren’t added here (they come from the pipeline)', await E("(function(){ const n = pbStages(r59LeadPb()).length; ACTIONS.pb57StageAdd(); return pbStages(r59LeadPb()).length===n; })()"));
  check('no “+ New playbook” buttons on the page (the + in the corner makes one)', !(await p.$('#viewRoot [data-action="pb6NewOpen"]')));
  await E("ACTIONS.pb6NewOpen(null, null, 'lead')"); await p.waitForTimeout(200);
  check('the new-playbook sheet doesn’t offer Clients / Leads', !(await p.$('[data-action="pb6NewSet"][data-id^="for:"]')) && !!(await p.$('#pb6NewName')));
  await E("addSheetClose('pb6NewSheet')");
  await E("const C = pbNew('client', 'Client journey', 30, {for:'client'}); C.stages = [pb57Stage('Onboarding', {days:14})]; C.postDays = ['1','3']; pbAll().push(C); pbSave(); ui.pbSel = C.id; ui.pb57Cal = true; ui.pb57Stage = C.stages[0].id; renderView()"); await p.waitForTimeout(200);
  check('playbooks have no posting days', !(await p.$('.pb57-post')) && !(await p.$('.pb6-day.is-post')));
  // ================= C. Business =================
  await E("ui.pb57Cal = false; ACTIONS.bizSetupOpen()"); await p.waitForTimeout(250);
  check('Setup opens on the lead pipeline: every stage a row you can rename, drag, recolour', (await p.$$('#bizSetup .r59-st[data-r59-st^="lead:"]')).length===4 && !!(await p.$('#bizSetup .r59-st.is-lock')));
  await p.fill('#bizSetup input[data-stage-label="lead:'+(await E("crmStages('lead')[1].id"))+'"]', 'Reached out'); await p.press('#bizSetup input[data-stage-label^="lead:'+(await E("crmStages('lead')[1].id"))+'"]', 'Tab'); await p.waitForTimeout(250);
  await E("addSheetClose('bizSetup'); ui.businessTab='leads'; renderView()"); await p.waitForTimeout(250);
  check('rename a lead stage: the Lead Center shows the new name straight away', /Reached out/.test(await p.textContent('#viewRoot')));
  check('…and so does the lead playbook', await E("pbStages(r59LeadPb()).some(s => s.name==='Reached out')"));
  await E("r59MoveStage('lead', crmStages('lead')[2].id, crmStages('lead')[0].id)");
  check('drag a stage up: the pipeline and the playbook follow', await E("crmStages('lead')[0].label==='Call booked' && pbStages(r59LeadPb())[0].name==='Call booked'"));
  await E("ui.businessTab='log'; ui.r59LcCal = true; renderView()"); await p.waitForTimeout(200);
  check('Log center → Calendar: clients and leads together', await E("(function(){ const t = document.querySelector('.r59-lc').textContent; return /Mia Spa|Luis Auto/.test(t) && /JJS|Kiko/.test(t); })()"));
  await E("ACTIONS.r59LcWho(null, null, 'leads')"); await p.waitForTimeout(100);
  check('…filter it to leads only', await E("!/JJS|Kiko/.test(document.querySelector('.r59-lc .r56-lc-g').textContent)"));
  // packages
  await E("ui.r59LcCal = false; ui.businessTab='packages'; renderView()"); await p.waitForTimeout(200);
  check('Packages: no bottom panel; each package card has its own little calendar', !(await p.$('.r58-pkc')) && !!(await p.$('.r59-pkc .r59-mini')));
  await p.click('.r59-pkc'); await p.waitForTimeout(250);
  check('open a package: its month by cycle day (Day 1–30), not day buttons', (await p.$$('#r59PkSheet .r59-cd')).length===30);
  await p.click('#r59PkSheet .r59-cd:nth-child(20)'); await p.waitForTimeout(150);
  check('…tap a day to put a piece on it', await E("r59Pk('pk1').schedule.pd1.indexOf(20) >= 0"));
  await p.fill('#r59NewDv', 'Carousels'); await p.press('#r59NewDv', 'Enter'); await p.waitForTimeout(200);
  check('…add a deliverable right there, and clients on the package get it', await E("r59Pk('pk1').deliverables.length===2 && crmFind('client','jj').deliverables.some(d => d.title==='Carousels' && d.fromPackage)"));
  await E("addSheetClose('r59PkSheet')");
  check('a client’s pieces fall on their cycle days (Day 1 = their start day)', await E("(function(){ const pl = r57ContentPlan(crmFind('client','jj'), '2026-10'); return pl.some(x => x.date==='2026-10-05') && pl.some(x => x.date==='2026-10-09') && pl.some(x => x.date==='2026-10-14'); })()"));
  await E("ACTIONS.openNewPackageModal ? null : null; openNewPackageModal()"); await p.waitForTimeout(200);
  await p.fill('#r59NewPkName', 'My brand'); await p.click('[data-action="r59PkMake"]'); await p.waitForTimeout(250);
  check('adding a package: a name and price, then straight into it', await E("arr(state.business.packages).some(x => x.name==='My brand') && !!document.querySelector('#r59PkSheet .r59-pk-n')"));
  await E("addSheetClose('r59PkSheet'); const mb = arr(state.business.packages).find(x => x.name==='My brand'); mb.deliverables = [{id:'mb1', title:'Reels', weeklyTarget:3}]; mb.schedule = {mb1:[1, 3, 5]}; persist('business')");
  // your own account: lock in
  await E("ui.view='convos'; ui.socTab='overview'; ui.igTried = 1; ui.r58Acct = null; ui.sxRole = 'personal'; renderView()"); await p.waitForTimeout(300);
  check('Social: your own account without a plan asks you to lock in', !!(await p.$('.r59-commit-cta [data-action="r59PlanOpen"]')));
  await p.click('.r59-commit-cta [data-action="r59PlanOpen"]'); await p.waitForTimeout(200);
  await p.click('.r59-commit-pks button:has-text("My brand")'); await p.waitForTimeout(150);
  check('locking in: what you’re signing up for, and Day 1 is today', /Day 1 is today/.test(await p.textContent('.r59-commit')) && !!(await p.$('.r59-hold')));
  await p.click('.r59-hold', {delay:200}); await p.waitForTimeout(200);
  check('…a quick click doesn’t lock you in (you hold it)', await E("!r59PlanOf('a2')"));
  const hb = await (await p.$('.r59-hold')).boundingBox();
  await p.mouse.move(hb.x + hb.width/2, hb.y + hb.height/2); await p.mouse.down(); await p.waitForTimeout(1600); await p.mouse.up(); await p.waitForTimeout(300);
  check('…hold it: you’re on the plan from today', await E("(function(){ const pl = r59PlanOf('a2'); return !!pl && pl.start===todayStr() && r59Pk(pl.pk).name==='My brand'; })()"));
  check('…and your calendar starts today (not the 1st of the month)', await E("(function(){ const pl = r57ContentPlan({id:'x', packageId:r59PlanOf('a2').pk, startDate:todayStr(), deliverables:[{id:'q', sourceId:'mb1', title:'Reels', recurring:true, weeklyTarget:3, completedDates:[]}]}, '2026-10'); return pl.length && pl[0].date===todayStr(); })()"));
  check('…the account shows it’s locked in', /Locked in/.test(await p.textContent('#viewRoot')));
  await E("ui.r58Acct = 'c1'; renderView()"); await p.waitForTimeout(200);
  check('a client’s account: their package, from their cycle', /Growth/.test(await p.textContent('.r59-plan.is-client')) && /5th/.test(await p.textContent('.r59-plan.is-client')));
  // the client's calendar
  await E("ui.r58Acct = null; ui.view='business'; ui.businessTab='clients'; renderView(); openClientModal('jj'); ui.clientSec='calendar'; renderClientModalInto()"); await p.waitForTimeout(300);
  const cal = await p.textContent('.r59-cc');
  check('each client has a Calendar: their content, cycle, billing and events', /Reels/.test(cal) && /Cycle \d+ starts/.test(cal) && /Bill/.test(cal) && /JJS shoot/.test(cal));
  await E("ACTIONS.r59CcKind(null, null, 'content')"); await p.waitForTimeout(150);
  check('…filter it by kind', (await p.$$('.r59-cc-d b.is-content')).length===0 && (await p.$$('.r59-cc-d b.is-cycle')).length > 0);
  await E("ui.r59CcOff = {}; document.querySelectorAll('.overlay').forEach(o => o.classList.add('hidden')); ui.showClientModal = null");
  await E("ui.view='calendar'; ui.calendarYear = 2026; ui.calendarMonth = 9; renderView()"); await p.waitForTimeout(300);
  // (round 60: one search-style picker instead of the select)
  check('Calendar: filter it to one client', !!(await p.$('.r60-calb')));
  await E("ACTIONS.r60CalSet(null, null, 'jj')"); await p.waitForTimeout(250);
  check('…and the month shows that client’s content, playbook, cycle and events', await E("(function(){ const t = document.querySelector('.cx-month').textContent; return /Reels/.test(t) && /JJS shoot|Cycle/.test(t); })()"));
  await E("ui.r59CalClient = null; renderView()");
  // ================= D. Look and feel =================
  await E("ui.view='focus'; ui.focusTab='tasks'; ui.focusTasksSubTab='overview'; renderView()"); await p.waitForTimeout(200);
  await E("ui.focusTasksSubTab='backlog'; renderView()");
  check('switching a sub-tab animates what changed (the tab bars stay still)', await E("document.querySelectorAll('#viewRoot .r59-in').length > 0 && !document.querySelector('#viewRoot .tabs.r59-in, #viewRoot .seg-tabs.r59-in')"));
  await E("ui.view='business'; ui.businessTab='overview'; renderView()"); await p.waitForTimeout(500); await E("ui.businessTab='leads'; renderView()");
  check('switching a main tab animates the page under it', await E("document.querySelectorAll('#viewRoot .tab-panel .r59-in, #viewRoot .tab-panel.r59-in').length > 0"));
  await E("ui.view='personal'; ui.personalTab='fitness'; ui.healthSub='body'; renderView()"); await p.waitForTimeout(300);
  check('Weight & fuel: two even halves, everything inside its panel', await E("(function(){ const bf = document.getElementById('bodyFuel'), r = bf.getBoundingClientRect(); return [...bf.querySelectorAll('section *')].every(el => { const q = el.getBoundingClientRect(); return !q.width || (q.left >= r.left - 1 && q.right <= r.right + 1); }); })()"));
  check('…and numbers are rounded (no 181.68294196)', !/\.\d{4,}/.test(await p.textContent('#viewRoot')));
  await E("ui.healthSub='overview'; renderView()"); await p.waitForTimeout(200);
  check('Health → Overview uses the same weight & fuel panel', !!(await p.$('#viewRoot .r59-bf')));
  await E("ui.personalTab='journal'; ui.journalMode='entries'; renderView()"); await p.waitForTimeout(200);
  // (round 60: the journal was redone as one column: the writing card, then your entries)
  check('Journal: a place to write, then your entries', await E("(function(){ const w = document.querySelector('.r60-jw').getBoundingClientRect(), f = document.getElementById('journalHistoryContainer').getBoundingClientRect(); return w.bottom <= f.top + 2; })()"));
  }catch(err){ check('the run reached the end', false, String(err && err.message || err).slice(0, 300)); }
  check('no errors', p.errors.length===0, p.errors);
  await b.close(); process.exit(report() ? 1 : 0);
})();
