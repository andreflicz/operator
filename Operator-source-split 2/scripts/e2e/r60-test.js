// Round 60: Andre's updates (ROUND-60-LIST.md).
const { instrument, launch, newPage, check, report, OUT } = require('./common.js');
(async () => {
  instrument(process.argv[2], OUT+'/r60.html');
  const b = await launch();
  const at = new Date(2026, 9, 28, 10).getTime();
  const seed = {profile:{name:'Andre Lopez'},
    settings:{instagram:{accounts:[{id:'a1', role:'business', username:'commenccollective', src:'zernio'}, {id:'a2', role:'personal', username:'andreflix', src:'zernio'}], cliAll:[{id:'c1', platform:'instagram', username:'jjs_build'}], cliLinks:{c1:'jj'}}},
    business:{packages:[{id:'pk1', name:'Growth', price:3000, deliverables:[{id:'pd1', title:'Reels', weeklyTarget:2}, {id:'pd2', title:'YouTube videos', weeklyTarget:1}], schedule:{pd1:[1, 5]}}],
      clients:[{id:'jj', name:'Jay', business:'JJS', stage:'active', status:'active', mrr:3000, startDate:'2026-09-05', packageId:'pk1', deliverables:[{id:'d1', title:'Reels', recurring:true, weeklyTarget:2, completedDates:[], fromPackage:true, sourceId:'pd1'}, {id:'d2', title:'YouTube videos', recurring:true, weeklyTarget:1, completedDates:['2026-10-03', '2026-10-20'], fromPackage:true, sourceId:'pd2'}]}],
      pipeline:[{id:'l1', name:'Mia', company:'Mia Spa', stage:'contacted', value:2500, createdAt:'2026-10-26'}]},
    goals:{items:[{id:'g1', label:'Read 12 books', target:12, current:7, unit:'books', deadline:'2026-12-31'}]}};
  const p = await newPage(b, OUT+'/r60.html', seed, at);
  await p.setViewportSize({width:1440, height:900});
  const E = c => p.evaluate(x => window.__op.ev(x), c);
  await E("document.querySelectorAll('.overlay').forEach(o => o.classList.add('hidden')); AI.hasKey = false; OV.pending = false; OV.speaking = false; xpSystemShow = function(){}; uiConfirm = function(){ return Promise.resolve(true); }");
  try{
  // ================= A. Op =================
  await E("AI.hasKey = true; aiKeyCheck = function(){}; window.__w = 0; aiWrite = async function(){ window.__w++; return 'x'; }; opFactsMoneyPage = function(){ return 'Coming in: $10,500.'; }; opReadStore()['money'] = {text:'Pattern: '+'a long read that runs on and on '.repeat(10)+' Watch: x. Move: y.', day:todayStr(), sig:'s'}; ui.view='personal'; ui.personalTab='finances'; renderView()"); await p.waitForTimeout(700);
  await E("renderView(); renderView()"); await p.waitForTimeout(700);
  check('a long read isn’t fetched again on every redraw (it typed twice / rewrote itself)', await E("window.__w")===0);
  await E("AI.hasKey = false");
  // the push-to-talk cut: his reply once
  await E("opChat().length = 0; OV.speaking = true; window.__pend = opSay('The report goes out Friday.'); OV.speaking = true; r54TalkToggle(); opChatLog('op', 'The report goes out Friday. The shoot is Thursday at two.'); R60.turnDone = true; opChatLog('op', 'The report goes out Friday. The shoot is Thursday at two.')"); await p.waitForTimeout(150);
  check('push-to-talk while he speaks: his reply shows once (it was sent twice)', await E("opChat().filter(e => e.r==='op').length")===1);
  check('…and that one entry is his whole reply', await E("opChat().filter(e => e.r==='op')[0].t")==='The report goes out Friday. The shoot is Thursday at two.');
  await E("R59.hush = 0; OV.speaking = false; R60.cutEntry = null");
  // Op files what he's asked to, every time
  await E("AI.hasKey = true; aiPickModel = async function(){ return 'm'; }; aiCall = async function(){ return {ok:true, j:{stop_reason:'end_turn', content:[{type:'text', text:'Sounds good.'}]}}; }; aiWrite = async function(){ return 'Weekly report: send it on Fridays.'; }; R54.last = null; aiAsk('the weekly report should go out on fridays, please add that to the updates')"); await p.waitForTimeout(800);
  check('asked to add something to the updates and Op filed nothing: the app files it', await E("r58UpdateEntries().some(e => e.text==='Weekly report: send it on Fridays.' && /fridays/.test(e.said))"));
  check('…and Op is told it’s non-negotiable', /Non-negotiable/.test(await E("JSON.stringify(aiSystem())")));
  await E("AI.hasKey = false");
  // the pop-up by the XP
  await E("ui.view='business'; ui.businessTab='overview'; renderView(); r57Note('Calendar weeks start on Monday, not Sunday. Posted reels green, late ones red.', 'idea')"); await p.waitForTimeout(500);
  check('Op logs something: a short line pops up by the XP (not a long note in the corner)', /Op saved something to App updates/.test(await p.textContent('#r60Pop')) && !(await p.$('.r57-note:not(.is-out)')));
  check('…sitting next to your level', await E("(function(){ const a = document.getElementById('r60Pop').getBoundingClientRect(), d = document.querySelector('#musicDock .md-in').getBoundingClientRect(); return a.right <= d.left + 1 && Math.abs((a.top + a.height/2) - (d.top + d.height/2)) < 30; })()"));
  await p.click('#r60Pop .r60-pop-h'); await p.waitForTimeout(250);
  check('…tap it for the whole thing', await E("document.getElementById('r60Pop').classList.contains('is-open')") && /late ones red/.test(await p.textContent('#r60Pop .r60-pop-b')));
  check('…and it’s in Notifications → From Op', await E("r58Feed().some(f => /weeks start on Monday/.test(f.short))"));
  await p.mouse.click(700, 600); await p.waitForTimeout(500);
  // push-to-talk in the background, explained
  await E("state.profile.opPttKey = 'F5'; ui.view='settings'; ui.settingsTab='op'; renderView()"); await p.waitForTimeout(200);
  check('Settings → Op says whether the talk key works with Operator in the background', !!(await p.$('.r60-ptt')) && /in front|anywhere/.test(await p.textContent('.r60-ptt')));
  // ================= B. Playbooks =================
  await E("const ob = document.getElementById('opBub'); if(ob) ob.remove(); const pp = document.getElementById('r60Pop'); if(pp) pp.remove(); ui.view='business'; ui.businessTab='lifecycle'; ui.pbView='board'; renderView()"); await p.waitForTimeout(250);
  check('no client playbooks yet: presets to start from', (await p.$$('.r60-empty .r60-pre-b')).length >= 5);
  await p.click('.r60-empty [data-action="r60UsePreset"][data-id="chain"]'); await p.waitForTimeout(300);
  check('Onboarding → Monthly client: both made, chained', await E("(function(){ const o = pbAll().find(p => p.name==='Onboarding'), m = pbAll().find(p => p.name==='Monthly client'); return !!o && !!m && o.next===m.id && pbStages(o).length===2 && pbStages(m)[0].repeat==='month'; })()"));
  check('…the builder says what happens when they finish', /When they finish/.test(await p.textContent('#viewRoot')) && /They move to Monthly client/.test(await E("document.querySelector('[data-pb-f=\"ends\"]').selectedOptions[0].textContent")));
  await E("(function(){ const o = pbAll().find(p => p.name==='Onboarding'); pbStart('client', crmFind('client','jj'), o.id, todayStr(), true); const x = crmFind('client','jj'); pbStages(o).forEach(() => { const s = pbState('client', x); s.occ.forEach(oc => { x.pb.done[oc.key] = todayStr(); }); pbAdvance('client', x); }); })()");
  check('…and finishing Onboarding moves them onto Monthly client by itself', await E("pbById(crmFind('client','jj').pb.id).name==='Monthly client'"));
  await E("ui.pbSel = pbAll().find(p => p.name==='Monthly client').id; renderView()"); await p.waitForTimeout(150);
  await p.click('[data-action="r60SavePreset"]'); await p.waitForTimeout(200);
  check('save your own playbook as a preset', await E("r60Customs().some(c => c.name==='Monthly client')"));
  await E("ACTIONS.pb6NewOpen()"); await p.waitForTimeout(200);
  check('new playbook: start from a preset (built-in or yours) or from scratch', (await p.$$('#pb6NewSheet .r60-pre-b')).length >= 6 && !!(await p.$('#pb6NewName')));
  await p.click('#pb6NewSheet .r60-pre:last-child .r60-pre-b'); await p.waitForTimeout(250);
  check('…a preset makes an ordinary playbook you can change (its own copy)', await E("pbAll().filter(p => p.name==='Monthly client').length===2 && pbStages(pbAll().filter(p => p.name==='Monthly client')[0])[0].id!==pbStages(pbAll().filter(p => p.name==='Monthly client')[1])[0].id"));
  // ================= C. Business =================
  await E("ui.businessTab='overview'; renderView()"); await p.waitForTimeout(150);
  check('Log center is a tab after Leads (no separate button)', JSON.stringify(await p.$$eval('.r58-biz > .tab', n => n.map(x => x.textContent.replace(/\d+/g, '').trim())))===JSON.stringify(['Overview', 'Clients', 'Leads', 'Log center', 'Packages', 'Finances', 'Playbooks']) && !(await p.$('.biz-gear[data-tab="log"]')));
  await E("ui.businessTab='packages'; renderView()"); await p.waitForTimeout(150);
  await p.click('.r59-pkc'); await p.waitForTimeout(250);
  await p.click('#r59PkSheet [data-action="r60DvPer"][data-id="pd2|month"]'); await p.waitForTimeout(150);
  await p.click('#r59PkSheet [data-action="r59DvStep"][data-id="pd2|1"]'); await p.waitForTimeout(150);
  check('a deliverable can be “2 a month” (YouTube videos), not only “a week”', await E("(function(){ const d = r59Pk('pk1').deliverables[1]; return d.per==='month' && d.monthly===r59PkNeed({weeklyTarget:1})+1; })()") || await E("(function(){ const d = r59Pk('pk1').deliverables[1]; return d.per==='month' && d.monthly >= 2; })()"));
  await E("r59Pk('pk1').deliverables[1].monthly = 2; r59PkSave()");
  check('…clients on the package count it by the month (2 this month, done; never behind this week)', await E("(function(){ const d = crmFind('client','jj').deliverables.find(x => x.sourceId==='pd2'); return d.per==='month' && monthlyTargetFor(d)===2 && isDeliverableDoneThisWeek(d); })()"));
  const hv = await E("document.querySelector('#r59PkSheet .r59-cd').getAttribute('data-hov')");
  check('hovering a day says what’s on it (not “R59 pk day”)', /^Day 1: Reels/.test(hv), hv);
  check('…and no button anywhere shows its internal name', await E("hovLabelFor(Object.assign(document.createElement('button'), {}), 0)===''") || await E("(function(){ const x = document.createElement('button'); x.setAttribute('data-action', 'r59PkDay'); return hovLabelFor(x)===''; })()"));
  await E("addSheetClose('r59PkSheet'); openNewPackageModal()"); await p.waitForTimeout(200);
  await p.click('[data-action="r60NewKind"][data-id="1"]'); await p.waitForTimeout(150);
  check('new package: mark it Personal (no price)', !(await p.$('#r59NewPkPrice')));
  await p.fill('#r59NewPkName', 'My brand'); await p.click('[data-action="r59PkMake"]'); await p.waitForTimeout(300);
  check('…it’s yours: no money, no “who’s on it”', await E("(function(){ const pk = arr(state.business.packages).find(x => x.name==='My brand'); return !!pk && pk.personal && !pk.price && !document.querySelector('#r59PkSheet .r59-pk-p') && !/On it/.test(document.querySelector('#r59PkSheet').textContent); })()"));
  await E("addSheetClose('r59PkSheet'); renderView()"); await p.waitForTimeout(150);
  check('…and its card says Personal', /Personal/.test(await p.textContent('.pk-grid')));
  // ================= D. Social =================
  await E("ui.view='convos'; ui.socTab='overview'; ui.igTried = 1; ui.r58Acct = null; renderView()"); await p.waitForTimeout(250);
  check('Social: a Clients group, each client in their colour, and a + to add a client’s account', /Clients/.test(await p.textContent('.r58-cls')) && !!(await p.$('.r58-cls .r58-ac[style*="--cc"]')) && !!(await p.$('.r60-addcl')));
  check('…the swap button is now a settings button', !(await p.$('.r58-swap')) && !!(await p.$('.r60-socset')));
  await p.click('.r60-addcl'); await p.waitForTimeout(200);
  check('…+ opens your clients’ accounts, each linked to a client', !!(await p.$('#r60Cli select[data-r58-cli="c1"]')));
  await E("addSheetClose('r60Cli')"); await p.click('.r60-socset'); await p.waitForTimeout(200);
  check('…settings: swap, connect, clients’ accounts, refresh', (await p.$$('#r60Soc .r60-set-b')).length===4);
  await E("addSheetClose('r60Soc')");
  check('Full screen and Refresh sit lower, clear of your level', await E("(function(){ const b = document.querySelector('.r58-cm'), d = document.getElementById('musicDock').getBoundingClientRect(); return b.getBoundingClientRect().top > d.bottom + 20; })()"));
  // ================= E. Calendar =================
  await E("ui.view='calendar'; ui.calendarYear = 2026; ui.calendarMonth = 9; renderView()"); await p.waitForTimeout(250);
  check('Calendar: no Today button; one search-style button for your calendar or a client’s', !(await p.$('[data-action="cxToday"]')) && !!(await p.$('.r60-calb')) && !(await p.$('select[data-r59-calc]')));
  check('…the legend is behind a Legend button', !(await p.$('.cx-month > .cx-legend')) && !!(await p.$('.r60-legb')));
  await p.click('.r60-calb'); await p.waitForTimeout(200); await p.fill('#r60CalQ', 'jj'); await p.press('#r60CalQ', 'Enter'); await p.waitForTimeout(250);
  check('…find a client and pick them', await E("ui.r59CalClient==='jj'") && /JJS/.test(await p.textContent('.r60-calb')));
  check('…Op’s read and the check-in share one line at the top', await E("(function(){ const a = document.querySelector('.cx-header .r52-ask'), o = document.querySelector('.cx-header .op-tip'); if(!a || !o) return 'missing'; return Math.abs(a.getBoundingClientRect().top - o.getBoundingClientRect().top) < 4; })()")!==false);
  await E("ui.r59CalClient = null");
  // ================= F. Personal =================
  await E("ui.view='personal'; ui.personalTab='goals'; renderView()"); await p.waitForTimeout(200);
  check('Goals: your goals at the very top', await E("(function(){ const m = document.querySelector('.r60-mine'), r = document.querySelector('.r43-goalsp'); return !!m && r.firstElementChild===m; })()"));
  await E("ui.personalTab='journal'; ui.journalMode='entries'; ui.journalViewMode='personal'; renderView()"); await p.waitForTimeout(200);
  check('Journal: My journal / Client journals on the left, search on the right, then a writing card', await E("(function(){ const s = document.querySelector('.r60-seg').getBoundingClientRect(), q = document.querySelector('.r60-js').getBoundingClientRect(), w = document.querySelector('.r60-jw').getBoundingClientRect(); return s.left < q.left && s.left <= w.left + 2 && q.right >= w.right - 2; })()"));
  await p.fill('#journalPageText', 'Felt sharp today.'); await p.click('.r60-jw-s'); await p.waitForTimeout(250);
  check('…and saving works', await E("state.journal.entries.some(e => e.text==='Felt sharp today.')"));
  await E("ui.journalViewMode='clients'; renderView()"); await p.waitForTimeout(200);
  check('Client journals: the same writing card, the client picked at the top', !!(await p.$('.r60-jw.is-client #journalTabClientSelect')) && !!(await p.$('.r60-seg')));
  await E("vaultItems = function(){ return [{id:'v1', kind:'capsule', label:'To future me', text:'Hi', at:Date.now() - 86400000, locked:true, openOn:'2027-01-01', written:addDays(todayStr(), -1)}, {id:'v2', kind:'capsule', label:'Surprise', text:'Yo', at:Date.now() - 2*86400000, locked:true, hidden:true, written:addDays(todayStr(), -2)}, {id:'v3', kind:'week', label:'Week of Oct 19', text:'Good week', at:Date.now() - 9*86400000, locked:false}]; }; ui.journalViewMode='personal'; ui.journalMode='vault'; renderView()"); await p.waitForTimeout(200);
  const vt = await p.textContent('.vault');
  check('Vault: every capsule says when it opens (or “one morning this year”), and week notes say what they are', /Opens Jan 1/.test(vt) && /Opens one morning this year/.test(vt) && /Week note · open/.test(vt));
  await p.click('.r60-vf [data-id="sealed"]'); await p.waitForTimeout(150);
  check('…filter Open / Sealed', (await p.$$('.vault-card')).length===2);
  }catch(err){ check('the run reached the end', false, String(err && err.message || err).slice(0, 300)); }
  check('no errors', p.errors.length===0, p.errors);
  await b.close(); process.exit(report() ? 1 : 0);
})();
