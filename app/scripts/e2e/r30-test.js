// Round 30: the mic opens when Op asks (and keeps your words), Op runs the app (tasks, leads, follow-ups,
// journal, food, music, the alarm…), presses you all day, knows what clients said, his full screen (the
// white plane, chat, action mode), one "review X sessions" SYSTEM window, and your projected self.
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
      if(/Write his projected self/.test(body)) res.content[0].text = JSON.stringify({looks:['a','b','c','d','e','f'].map(x => 'Look '+x+'.'), lives:['a','b','c','d','e','f'].map(x => 'Life '+x+'.'), ranks:[0,1,2,3,4,5,6,7,8].map(i => 'Rank life '+i+'.')});
      else if(/mark the reel done/.test(body) && !/tool_result/.test(body)) res = {stop_reason:'tool_use', content:[{type:'tool_use', id:'tu1', name:'complete_task', input:{task:'reel'}}]};
      else if(/tool_result/.test(body)) res.content[0].text = 'Done. The reel’s off your plate.';
      else if(/pressing him right now/.test(body)) res.content[0].text = 'It’s two and the board’s empty. What are you doing right now?';
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
  // a stand-in for the browser's speech recognition, so the mic can be driven from the test
  await p.addInitScript(() => {
    window.__recs = [];
    function FakeRec(){ this.started = false; window.__recs.push(this); }
    FakeRec.prototype.start = function(){ if(window.__recFailNext){ window.__recFailNext--; const s = this; setTimeout(function(){ s.onerror && s.onerror({error:'audio-capture'}); s.onend && s.onend(); }, 20); return; } this.started = true; const s = this; setTimeout(function(){ s.onstart && s.onstart(); }, 10); };
    FakeRec.prototype.stop = function(){ const s = this; this.started = false; setTimeout(function(){ s.onend && s.onend(); }, 10); };
    FakeRec.prototype.abort = FakeRec.prototype.stop;
    window.SpeechRecognition = FakeRec; window.webkitSpeechRecognition = FakeRec;
  });
  p.calls = [];
  await p.route('http://127.0.0.1:8935/**', helperRoute(p.calls));
  await p.goto('file://'+path.resolve(OUT+'/r30.html')); await p.waitForTimeout(600);
  return p;
}
(async () => {
  instrument(process.argv[2], OUT+'/r30.html');
  const b = await launch();
  const NOW = new Date(2026,9,13,14,5,0).getTime();   // a Tuesday afternoon
  const tasks = {items:[{id:'t1', title:'Edit JJS reel', status:'today', priority:'high', clients:[], createdAt:'2026-10-01'}, {id:'t2', title:'Send Mike the invoice', status:'today', priority:'med', clients:[], createdAt:'2026-10-05'}, {id:'t3', title:'Plan Q4 content', status:'backlog', priority:'low', clients:[], createdAt:'2026-09-20'}]};
  const business = {clients:[{id:'c1', name:'Jay', business:'JJS Fitness', mrr:1500, status:'active', stage:'active', journal:[{id:'j1', date:'2026-10-11', text:'Jay said he wants the contract renewed by Friday and asked about adding ads.'}], touchpoints:[], deliverables:[]}], pipeline:[{id:'l1', name:'Rosa', company:'Rosa Bakery', stage:'contacted', notes:'', createdAt:'2026-10-01'}]};
  const base = {profile:{name:'Andre', heightIn:70}, tasks, business, health:{gymLog:[], weightLog:[{id:'w1', date:'2026-10-12', weight:230}], calorieEntries:[]}};

  // ---- the mic ----
  {
    const p = await ctxPage(b, base, {clock:NOW});
    const E = c => p.evaluate(x => window.__op.ev(x), c);
    await E("HW.on = true; HW.rec = new SpeechRecognition(); OV.cap = 'opBubText'; opBubShow(); aiListen('opBubText')");
    check('the "Hey Operator" ear lets go before Op listens', await E("HW.on===false"));
    await p.clock.runFor(500); await p.waitForTimeout(100);
    check('…then the mic opens', await E("AI.listening===true"));
    await E("const r = window.__recs[window.__recs.length-1]; r.onresult({resultIndex:0, results:[Object.assign([{transcript:'hello wor'}], {isFinal:false})]}); r.started = false; r.onend()");
    await p.clock.runFor(100); await p.waitForTimeout(50);
    await E("const r = window.__recs[window.__recs.length-1]; r.onresult({resultIndex:0, results:[Object.assign([{transcript:'ld are you there'}], {isFinal:true})]})");
    check('words it was still making out when Chrome restarted are kept', /hello wor/.test(await p.textContent('#opBubMe')) && /are you there/.test(await p.textContent('#opBubMe')), await p.textContent('#opBubMe'));
    await E("AI.cancelListen && AI.cancelListen()"); await p.clock.runFor(200);
    await E("window.__recFailNext = 1; AI.closedAt = 0; aiListen('opBubText')"); await p.clock.runFor(1200); await p.waitForTimeout(100);
    check('a mic that was still busy gets tried again (and opens)', await E("AI.listening===true"));
    await E("AI.cancelListen && AI.cancelListen()"); await p.clock.runFor(200);
    check('the waiting gap before it sends is a little longer (pauses don’t cut you off)', (await E("opPauseMs()")) >= 2500 && await E("[].some.call(document.scripts, s => /setTimeout\\(send, typeof opPauseMs/.test(s.textContent))"));
    await E("OV.lastEnd = Date.now()");
    check('(r38f) right after Op speaks the "Hey Operator" ear ignores what it hears (the mic stays steady, Discord-style)', await E("heySoftQuiet()===true"));
    check('no page errors (mic)', p.errors.length===0, p.errors);
    await p.context().close();
  }

  // ---- Op runs the app ----
  {
    const p = await ctxPage(b, base, {clock:NOW});
    const E = c => p.evaluate(x => window.__op.ev(x), c);
    const names = await E("OP_TOOLS.map(t => t.name).join()");
    check('Op has the new tools', ['complete_task', 'reopen_task', 'update_task', 'delete_task', 'arrange_tasks', 'set_next_task', 'done_reminder', 'set_follow_up', 'add_lead', 'move_lead', 'add_journal', 'log_food', 'add_video_idea', 'take_break', 'lock_out', 'clock', 'music', 'set_wake_alarm'].every(n => names.split(',').includes(n)), names);
    check('…and none for Social, sending or money', !/post|send_|pay|social|transfer/i.test(names.replace('suggest_improvement', '')));
    await E("opRunTool('complete_task', {task:'reel'})"); await p.clock.runFor(800); await p.waitForTimeout(100);
    check('he marks a task done', await E("state.tasks.items.find(t => t.id==='t1').status")==='done');
    await E("opRunTool('reopen_task', {task:'reel'})");
    check('…and can bring it back', await E("state.tasks.items.find(t => t.id==='t1').status")==='today');
    await E("opRunTool('arrange_tasks', {order:['invoice', 'reel']})");
    check('he arranges today (first = first)', await E("state.focus.lineupOrder.slice(0, 2).join()")==='t2,t1');
    await E("opRunTool('set_next_task', {task:'Q4'})");
    check('he sets what’s next (pulled onto today)', await E("state.focus.nextTaskId")==='t3' && await E("state.tasks.items.find(t => t.id==='t3').status")==='today');
    await E("opRunTool('update_task', {task:'Q4', deadline:'2026-10-20', priority:'high', list:'later'})");
    check('he changes a task (deadline, priority, list)', await E("JSON.stringify((({deadline, priority, status}) => ({deadline, priority, status}))(state.tasks.items.find(t => t.id==='t3')))")==='{"deadline":"2026-10-20","priority":"high","status":"backlog"}');
    await E("opRunTool('delete_task', {task:'Q4'})"); await p.clock.runFor(400); await p.waitForTimeout(100);
    check('he deletes one when asked, with an Undo', !(await E("state.tasks.items.some(t => t.id==='t3')")) && /Undo/.test(await p.textContent('body')));
    await E("ACTIONS.opUndoDelete()");
    check('…Undo brings it back', await E("state.tasks.items.some(t => t.id==='t3')"));
    await E("opRunTool('set_follow_up', {who:'JJS', date:'2026-10-16', note:'contract renewal'})");
    check('he puts a follow-up on a client', await E("state.business.clients[0].followUp.date")==='2026-10-16');
    await E("opRunTool('add_lead', {name:'Tom', company:'Tom’s Tacos', value:800, note:'met at the gym'})");
    await E("opRunTool('move_lead', {who:'Rosa', stage:'proposal'})");
    check('he adds a lead and moves one along', await E("state.business.pipeline.some(l => l.company==='Tom’s Tacos' && l.value===800)") && await E("state.business.pipeline.find(l => l.id==='l1').stage")==='proposal');
    await E("opRunTool('add_journal', {text:'Felt sharp today.'}); opRunTool('log_food', {name:'Chicken bowl', calories:650}); opRunTool('add_video_idea', {title:'Day in the life'})");
    check('he writes in the journal, logs food, adds a video idea', await E("state.journal.entries.some(e => e.text==='Felt sharp today.')") && await E("state.health.calorieEntries.some(e => e.calories===650)") && await E("state.tasks.items.some(t => t.isVideoIdea && t.title==='Day in the life')"));
    await E("opRunTool('set_wake_alarm', {time:'06:30'})");
    check('he sets your alarm', await E("wakeCfg().time")==='06:30' && await E("wakeCfg().enabled")===true);
    check('he can open the recap, How XP works, your projected self and his full screen', await E("['recap','xp','projected','operator'].every(x => OP_TOOLS.find(t => t.name==='open_page').input_schema.properties.page.enum.includes(x))"));
    const sys = await E("JSON.stringify(aiSystem())");
    check('he’s told: one thing at a time, never the list read back; an accountability partner all day', /bring up ONE thing/.test(sys) && /accountability partner all day/.test(sys) && /Never touch Social/.test(sys));
    const ctx = await E("aiContext()");
    check('he knows the other open tasks (to find them), and what clients said lately', /Other open tasks/.test(ctx) && /contract renewed by Friday/.test(ctx));
    check('…and a client’s note can be a nudge (once a day)', await E("opNudgeItems().some(x => /^cl:/.test(x.id) && /JJS Fitness/.test(x.short))"));
    check('no page errors (tools)', p.errors.length===0, p.errors);
    await p.context().close();
  }

  // ---- pressing you, all day ----
  {
    const p = await ctxPage(b, base, {clock:NOW});
    const E = c => p.evaluate(x => window.__op.ev(x), c);
    await E("AI.hasKey = true; OV.lastEnd = 0; ui._opActiveAt = 0; AI.lastAskAt = 0");
    check('outside work hours, not locked in: he still presses (when it’s time)', await E("opPressStore().next = Date.now() - 1000, opPressDue()"));
    await E("opPress(true)"); await p.clock.runFor(1500); await p.waitForTimeout(600);
    check('…one pointed line that ends on a question', /What are you doing right now\?/.test(await p.textContent('#opBubText')), await p.textContent('#opBubText'));
    check('…and not again for a while', !(await E("opPressDue()")) && await E("opPressStore().n")===1);
    await E("state.focus.activeSession = {startedAt:Date.now(), type:'deep'}; opPressStore().next = 0; OV.lastEnd = 0; ui._opActiveAt = 0; AI.lastAskAt = 0");
    check('…never while you’re locked in (his quick taps cover that)', !(await E("opPressStore().next = Date.now() - 1, opPressDue()")));
    await E("state.focus.activeSession = null; state.profile.opPress = 'off'");
    check('…and you can turn it down or off in Settings', !(await E("opPressDue()")) && /How hard Op presses you/.test(await E("operatorSettingsHtml()")));
    check('no page errors (press)', p.errors.length===0, p.errors);
    await p.context().close();
  }

  // ---- Op, full screen ----
  {
    const p = await ctxPage(b, base, {clock:NOW});
    const E = c => p.evaluate(x => window.__op.ev(x), c);
    await E("AI.hasKey = true; OV.cap = 'opBubText'; opBubShow()");
    check('his bubble has a full-screen button', !!(await p.$('#opBub .op-bub-full')));
    await p.click('#opBub .op-bub-full'); await p.clock.runFor(700); await p.waitForTimeout(200);
    check('a white plane: his full screen', await E("document.getElementById('opFull').classList.contains('is-in') && document.body.classList.contains('opf-on')") && await E("getComputedStyle(document.querySelector('.opf')).backgroundColor")==='rgb(246, 247, 251)');
    // (round 33: one screen, one conversation: his light on top, the talk under it, a box to type in)
    check('one conversation: his light on top, no Plane / Chat switch', !!(await p.$('#opfChat .opf-orb')) && !(await p.$('.opf-m[data-id="plane"]')) && await E("document.getElementById('opFull').dataset.mode")==='chat');
    await E("document.activeElement && document.activeElement.blur()"); await p.mouse.click(1300, 500); await p.waitForTimeout(100);
    check('click anywhere and you’re typing to him', await E("document.activeElement && document.activeElement.id")==='opfInput');
    await E("document.activeElement.blur()"); await p.keyboard.type('how is my week going'); await p.keyboard.press('Enter'); await p.clock.runFor(1500); await p.waitForTimeout(400);
    check('…or just start typing: it lands in the box, and he answers in line', /how is my week going/.test(await p.textContent('#opfLog .opc-me')) && /Noted/.test(await p.textContent('#opfLog .opc-op')));
    await p.fill('#opfInput', 'and today?'); await p.press('#opfInput', 'Enter'); await p.clock.runFor(1500); await p.waitForTimeout(400);
    check('…the whole conversation, in order', (await p.$$eval('#opfLog .opc-me', e => e.map(x => x.textContent))).some(t => /and today\?/.test(t)) && (await p.$$('#opfLog .opc-op')).length >= 2);
    await E("document.activeElement.blur()"); await p.keyboard.press('Escape'); await p.waitForTimeout(700);
    check('Esc takes you back to the app', !(await E("document.getElementById('opFull').classList.contains('is-in')")));
    // action mode: he does something, and you see it happen here
    await E("AI.typedAt = 0; aiAsk('mark the reel done', 'opBubText')"); await p.clock.runFor(900); await p.waitForTimeout(400);
    check('r36: when Op gets to work, he doesn’t pop up: a notice says what he did', !(await E("document.getElementById('opFull').classList.contains('is-in')")) && /Done: Edit JJS reel/.test(await p.textContent('#toastContainer')));
    check('…the task really is done, and it’s in the chat as an action', await E("state.tasks.items.find(t => t.id==='t1').status")==='done' && await E("opChat().some(e => e.r==='act' && /Edit JJS reel/.test(e.t))"));
    check('no page errors (full screen)', p.errors.length===0, p.errors);
    await p.context().close();
  }

  // ---- review: one notice, the SYSTEM way ----
  {
    const sess = (id, h) => ({id, date:'2026-10-13', type:'deep', auto:true, startedAt:new Date(2026,9,13,h,0).getTime(), endedAt:new Date(2026,9,13,h,40).getTime(), minutes:40});
    const p = await ctxPage(b, Object.assign({}, base, {focus:{sessions:[sess('s1', 9), sess('s2', 10), sess('s3', 11)]}}), {clock:NOW});
    const E = c => p.evaluate(x => window.__op.ev(x), c);
    const list = await E("JSON.stringify(notifList().filter(n => n.kind==='review').map(n => n.title))");
    check('the bell: one line for all of them', list==='["You need to review 3 sessions"]', list);
    await E("ACTIONS.toggleNotifs()"); await p.waitForTimeout(200);
    check('…under “Review”, at the top', /Review/.test(await p.textContent('#notifPanel .nt-group .nt-k')) && /review 3 sessions/.test(await p.textContent('#notifPanel')));
    await E("ACTIONS.toggleNotifs(); sysRevTick()"); await p.waitForTimeout(500);
    check('a SYSTEM window pops up in the middle: review your work', await p.isVisible('#sysRev .sys-card') && /Review your work/.test(await p.textContent('#sysRev')) && (await p.textContent('#sysRev .sys-rev-n b'))==='3');
    await E("sysRevTick()");
    check('…once (it doesn’t stack or repeat right away)', (await p.$$('#sysRev')).length===1 && await E("sysRevDue()")===0);
    await p.clock.runFor(31000); await p.waitForTimeout(500);
    check('…and closes itself after 30 seconds', !(await p.$('#sysRev')));
    await E("sysRevShow(3)"); await p.waitForTimeout(300); await p.click('#sysRev .sys-rev-go'); await p.waitForTimeout(500);
    check('Review now opens the recap', await E("overlayOpen('recapOverlay')"));
    check('no page errors (review)', p.errors.length===0, p.errors);
    await p.context().close();
  }

  // ---- your projected self ----
  {
    const p = await ctxPage(b, base, {clock:NOW});
    const E = c => p.evaluate(x => window.__op.ev(x), c);
    await E("AI.hasKey = true");
    check('it starts today', await E("projBase().start")===await E("todayStr()"));
    const y = JSON.parse(await E("JSON.stringify(projAt(365))"));
    check('a year locked in: more clients, more MRR, a higher level, lighter', y.clients > 1 && y.mrr > 1500 && y.level > 0 && y.w < 230, y);
    check('…weight comes off at a healthy pace (no crash diet)', await E("projAt(28).w") >= 230 - 4*2);
    await E("ACTIONS.openXpHow()"); await p.waitForTimeout(300);
    check('How XP works shows a glimpse of it, and a button', !!(await p.$('#xpHowContent .pj-tease')) && !!(await p.$('#xpHowContent .xpg-top [data-action="openProjected"]')));
    await p.click('#xpHowContent .pj-tease'); await p.waitForTimeout(300);
    check('Your projected self: today, locked in vs you', /Your projected self/.test(await p.textContent('#xpHowContent h1')) && (await p.$$('.pj-now .pj-row')).length >= 7);
    check('…where it goes: a month to five years, each with the rank, the money, the body', (await p.$$('.pj-card')).length===6 && (await p.$$('.pj-card .pj-fig')).length===6 && /A year/.test(await p.textContent('.pj-card')));
    check('…how each rank lives, and where you are', (await p.$$('.pj-rk')).length===9 && !!(await p.$('.pj-rk.is-you')) && /parents/.test(await p.textContent('.pj-rk')));
    await E("ACTIONS.projAiWrite()"); await p.waitForTimeout(1500);
    check('Op writes it for you (how you’d look, how you live, each rank)', /Life a\./.test(await p.textContent('.pj-card')) && /Look a\./.test(await p.textContent('.pj-card')) && /Rank life 0\./.test(await p.textContent('.pj-rk')));
    check('no page errors (projected)', p.errors.length===0, p.errors);
    await p.context().close();
  }

  await b.close();
  process.exit(report() ? 1 : 0);
})();
