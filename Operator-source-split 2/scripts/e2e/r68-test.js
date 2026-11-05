// Round 68: right-click everywhere, Client backlog by month, streaks that follow Today's standard (and rules you can
// change), editing the session you're in, voice memos that are only saved, Op reading every journal, goals in one row,
// the Journal tabs on the line, Op's errors, and the iPhone bridge.
const { instrument, launch, newPage, check, report, OUT } = require('./common.js');
(async () => {
  instrument(process.argv[2], OUT+'/r68.html');
  const b = await launch();
  const at = (d, h, m) => new Date(2026, 10, d, h, m || 0).getTime();
  const seed = {profile:{name:'Andre Lopez'},
    business:{clients:[{id:'jj', name:'Jay', business:'JJS', stage:'active', status:'active', mrr:3000, startDate:'2026-01-05', billingDay:1, deliverables:[{id:'rj', title:'Reels', recurring:true, weeklyTarget:2}], journal:[{id:'cj', date:'2026-11-02', text:'Wants the kitchen remodel reel first'}]}],
      pipeline:[{id:'l1', name:'Mia', company:'Mia Spa', stage:'contacted', value:2500, createdAt:'2026-11-01'}]},
    standards:{items:[{id:'s1', label:'Train', createdAt:'2026-10-01'}], completions:[], challenges:[]},
    boards:{boards:[{id:'b1', name:'Vision', kind:'vision', elements:[{id:'e1', type:'note', title:'', body:'Buy the studio in Miami'}], viewport:{x:0, y:0, zoom:1}}]}};
  const p = await newPage(b, OUT+'/r68.html', seed, at(4, 21));
  const E = c => p.evaluate(x => window.__op.ev(x), c);
  await E("document.querySelectorAll('.overlay').forEach(o => o.classList.add('hidden')); AI.hasKey = false; uiConfirm = function(o){ window.__conf = o; return Promise.resolve(true); }");

  // ---- right-click ----
  await E("ui.view='business'; ui.businessTab='log'; ui.r54Lc='leads'; ui.r56LeadCal=false; renderView()"); await p.waitForTimeout(250);
  await p.click('.lc-row .lc-av', {button:'right'}); await p.waitForTimeout(150);
  check('right-click a lead in the Log center: a menu with Mark lost', !!(await p.$('#appCtxMenu .r68-lost')));
  await p.click('#appCtxMenu .r68-lost'); await p.waitForTimeout(200);
  check('…Mark lost does it (and asks why, as always)', await E("crmFind('lead', 'l1').stage==='lost' || !document.getElementById('lostReasonOverlay').classList.contains('hidden')"));
  await E("document.querySelectorAll('.overlay').forEach(o => o.classList.add('hidden'))");
  await E("crmFind('lead', 'l1').stage = 'contacted'; persist('business'); ui.view='focus'; ui.focusTab='tasks'; ui.focusTasksSubTab='clientBacklog'; renderView()"); await p.waitForTimeout(250);
  const cb = await p.$('.cbl-client .cbl-h'); if(cb){ await cb.click({button:'right'}); await p.waitForTimeout(150); }
  check('right-click a card: its own buttons, then the app menu', await E("document.querySelectorAll('#appCtxMenu [data-op=\"r68Btn\"]').length >= 1"), await E("(document.getElementById('appCtxMenu')||{}).textContent || 'no menu'"));
  await E("ctxClose()");

  // ---- Client backlog by month ----
  await E("ui.view='focus'; ui.focusTab='tasks'; ui.focusTasksSubTab='clientBacklog'; renderView()"); await p.waitForTimeout(250);
  check('Client backlog shows the month, with ‹ ›', /November 2026/.test(await p.textContent('.r68-cbl')));
  await p.click('.r68-cbl [data-id="-1"]'); await p.waitForTimeout(200);
  check('‹ goes to last month (and its cycle)', /October 2026/.test(await p.textContent('.r68-cbl')) && /Oct 1/.test(await p.textContent('#viewRoot')));
  await p.click('.r68-cbl [data-id="0"]'); await p.waitForTimeout(150);

  // ---- streaks ----
  await E("ui.view='personal'; ui.personalTab='streaks'; renderView(); ACTIONS.r63Setup(null, null, 'own')"); await p.waitForTimeout(300);
  check('a new streak counts from Today’s standard by default', /Today’s standard/.test(await p.textContent('#r63Sheet')) && await E("ui.r63Draft.useStd===true"));
  await p.fill('#r63Name', 'November'); await p.fill('[data-r63-d="rule|0"]', 'No weed'); await p.dispatchEvent('[data-r63-d="rule|0"]', 'input');
  await E("ACTIONS.r63Start()"); await p.waitForTimeout(200);
  check('…its rules join Today’s standard', await E("state.standards.items.map(i => i.label).join(',')")==='Train,No weed');
  check('…and the streak follows it', await E("(function(){ const c = r63Active()[0]; return !!c && c.useStd===true; })()"));
  await E("toggleStandard('s1', todayStr()); toggleStandard(state.standards.items[1].id, todayStr())");
  check('doing Today’s standard is what counts the day', await E("r63Status(r63Active()[0]).doneToday===true"));
  await E("(function(){ const c = r63New(R63_PRESETS[0], {name:'Own rules', days:21, strict:'reset', rules:[{label:'Read'}]}); r63List().push(c); persist('standards'); })(); renderView()"); await p.waitForTimeout(200);
  await E("ACTIONS.r68RulesEdit(null, null, r63Active()[1].id)"); await p.waitForTimeout(200);
  await p.fill('#r68RuleNew', 'Cold shower'); await E("ACTIONS.r68RuleAdd()"); await p.waitForTimeout(150);
  check('a running streak’s rules can be added to', await E("r63Active()[1].rules.map(r => r.label).join(',')")==='Read,Cold shower');
  await E("addSheetClose('r68RulesSheet')");

  // ---- the session ----
  await E("state.focus.activeSession = {startedAt:Date.now() - 600000, completedTasks:[], breaks:[], onBreak:false}; persist('focus'); r68SessOpen()"); await p.waitForTimeout(200);
  await p.fill('#r68SessD', '2026-11-03'); await p.fill('#r68SessT', '22:00'); await E("ACTIONS.r68SessSave()"); await p.waitForTimeout(150);
  check('the session you’re in can start yesterday', await E("todayStr(new Date(state.focus.activeSession.startedAt))")==='2026-11-03');
  check('Op can do it too (edit_session)', await E("opRunTool('edit_session', {start:'2026-11-03 21:30'})").then(r => /21:30/.test(r)));

  // ---- memos ----
  await E("R67.queue.push({id:'q1', name:'Call with Jay', src:'paste|1', date:todayStr(), text:'Jay said the kitchen reel did well. Andre said we should post two more.', dur:20}); ui.view='personal'; ui.personalTab='journal'; ui.journalMode='memos'; renderView()"); await p.waitForTimeout(500);
  check('a memo is just saved (no summary, nothing else)', await E("r67Memos().length===1 && !r67Memos()[0].summary"));
  check('…with Analyze, and Analyze all', !!(await p.$('[data-action="r68MemoAnalyze"]')) && !!(await p.$('[data-action="r68MemoAll"]')));
  check('no cost card or Go queue any more', !(await p.$('.r67-cost')) && !(await p.$('[data-action="r67MemoGo"]')));

  // ---- Op reads everything ----
  const rj = await E("opRunTool('read_journal', {query:'studio kitchen'})");
  check('Op’s read_journal reaches boards and client journals', /Buy the studio/.test(rj) && /kitchen remodel/.test(rj), rj.slice(0, 200));
  check('…and memos only saved', /Call with Jay/.test(await E("opRunTool('read_journal', {query:'jay'})")));

  // ---- Op's errors ----
  check('Op says plainly when it’s the key', /turned the key down/.test(await E("aiErrLine({status:401, j:{error:{message:'invalid x-api-key'}}})")) || /add an Anthropic API key/.test(await E("aiErrLine({status:401, j:{}})")));
  check('…and when the helper is old', /out of date/.test(await E("aiErrLine({status:400, j:{error:{message:'The request body is not valid JSON: EOF while parsing a value at line 1 column 0'}}})")));

  // ---- the iPhone bridge (the page side) ----
  check('the phone can ask the page only a few things', await E("typeof window.operatorPage==='undefined' || (typeof operatorPage.phoneState==='function' && typeof operatorPage.ask==='function')"));
  check('no errors', p.errors.length===0, p.errors);
  await b.close();
  process.exit(report() ? 1 : 0);
})().catch((e) => { console.error(e); process.exit(1); });
