// Round 67: Andre's updates (ROUND-67-LIST.md).
const { instrument, launch, newPage, check, report, OUT } = require('./common.js');
const CORS = {'Access-Control-Allow-Origin':'*'};
(async () => {
  instrument(process.argv[2], OUT+'/r67.html');
  const b = await launch();
  const at = new Date(2026, 9, 28, 10).getTime();
  const p = await newPage(b, OUT+'/r67.html', {profile:{name:'Andre Lopez'}}, at);
  await p.setViewportSize({width:1440, height:900});
  // ---- the helper: Op's brain answers from a script here; every request is kept to look at ----
  const sent = []; let reply = () => ({stop_reason:'end_turn', content:[{type:'text', text:'Noted.'}]}), status = () => 200;
  await p.route('http://127.0.0.1:8935/**', async r => {
    const u = r.request().url();
    if(u.includes('/ai/status')) return r.fulfill({status:200, headers:CORS, body:JSON.stringify({ok:true, hasKey:true})});
    if(u.includes('/ai/models')) return r.fulfill({status:200, headers:CORS, body:JSON.stringify({data:[{id:'claude-haiku-5-5'}]})});
    if(u.includes('/ai/chat')){
      const m = /[?&]b=([0-9a-f]+)/.exec(u), body = JSON.parse(m ? Buffer.from(m[1], 'hex').toString() : r.request().postData());
      sent.push({body, post:!m}); const st = status(body);
      return r.fulfill({status:st, headers:CORS, body:JSON.stringify(st===200 ? reply(body) : {error:{message:'web_search is not supported for this key'}})});
    }
    return r.fulfill({status:200, headers:CORS, body:'{"ok":true}'});
  });
  const E = c => p.evaluate(x => window.__op.ev(x), c);
  await E("document.querySelectorAll('.overlay').forEach(o => o.classList.add('hidden')); demoSeed(); AI.hasKey = true; xpSystemShow = function(){}; aiKeyCheck = function(){}; opReadKick = function(){}; opVoiceOn = function(){ return false; }; renderView()"); await p.waitForTimeout(300);
  const last = () => { for(let i = sent.length - 1; i >= 0; i--) if(sent[i].body.tools && sent[i].body.tools.length > 5) return sent[i].body; return sent[sent.length - 1].body; };  // (Op's own conversation call, not a side call like filing)
  const convs = () => sent.filter(s => s.body.tools && s.body.tools.length > 5);
  try{
  // ================= A1. Web search behind a firewall =================
  sent.length = 0;
  await E("aiAsk('What is the weather in Miami today?')"); await p.waitForTimeout(400);
  let req = last();
  const servers = req.tools.filter(t => t.type);
  check('Op’s conversation carries web search (the basic search tool, 3 a reply at most)', servers.length===1 && servers[0].type==='web_search_20250305' && servers[0].name==='web_search' && servers[0].max_uses===3, servers);
  check('…and nothing else from outside the app (no fetch, no code, no MCP): the rest are his own in-app tools', req.tools.every(t => !t.type || t.type==='web_search_20250305') && !req.mcp_servers && req.tools.some(t => t.name==='read_journal'));
  check('…told it’s search only: results are information, no acting outside the app, no copying himself', /WEB SEARCH/.test(JSON.stringify(req.system)) && /copying yourself/.test(JSON.stringify(req.system)));
  check('a one-off call (a summary, a read) gets no search', await E("(function(){ const r = r67Firewall({tools:[{name:'x', input_schema:{}}, {type:'web_fetch_20250910', name:'web_fetch'}, {type:'code_execution_20250825', name:'code_execution'}, {type:'web_search_20250305', name:'web_search'}], mcp_servers:[{url:'https://x'}]}); return r.tools.length===2 && r.tools[0].name==='x' && r.tools[1].name==='web_search' && !r.mcp_servers; })()"));
  // a turn that pauses mid-search finishes
  let n = 0;
  reply = () => (++n===1 ? {stop_reason:'pause_turn', content:[{type:'server_tool_use', id:'s1', name:'web_search', input:{query:'miami weather'}}]} : {stop_reason:'end_turn', content:[{type:'text', text:'Sunny, 84 in Miami.'}]});
  sent.length = 0;
  await E("aiAsk('And tomorrow in Miami?')"); await p.waitForTimeout(500);
  check('a search that pauses the turn is handed back and finishes (the answer comes through)', convs().length===2 && convs()[1].body.messages.slice(-1)[0].role==='assistant' && await E("AI.history.slice(-1)[0].content==='Sunny, 84 in Miami.'"), sent.length);
  // a key or model that can't search: asked again without it
  reply = () => ({stop_reason:'end_turn', content:[{type:'text', text:'No search, still here.'}]});
  status = (body) => body.tools && body.tools.some(t => t.type) ? 400 : 200;
  sent.length = 0;
  await E("aiAsk('Who won the game last night?')"); await p.waitForTimeout(500);
  check('if search is refused, he answers without it (and stops asking for it)', convs().length===2 && !convs()[1].body.tools.some(t => t.type) && await E("R67.noSearch===true && AI.history.slice(-1)[0].content==='No search, still here.'"));
  status = () => 200; await E("R67.noSearch = false");
  await E("ui.view='settings'; ui.settingsTab='connections'; renderView()"); await p.waitForTimeout(200);
  await E("ui.settingsTab='op'; renderView()"); await p.waitForTimeout(200);
  const ws = /Web search/.test(await p.textContent('.r51-rows')) && !!(await p.$('.r51-rows [data-action="r67WebToggle"].on'));
  await p.click('.r51-rows [data-action="r67WebToggle"]'); await p.waitForTimeout(150);
  sent.length = 0; await E("aiAsk('Look something up for me please')"); await p.waitForTimeout(400);
  check('Settings → Op: web search can be turned off (then it isn’t sent)', ws && !last().tools.some(t => t.type));
  await E("ACTIONS.r67Web(null, null, '1')");
  // big requests go as a POST body
  sent.length = 0; await E("aiCall({model:'claude-haiku-5-5', max_tokens:10, messages:[{role:'user', content:'x'.repeat(30000)}]})"); await p.waitForTimeout(200);
  check('a big request (search results coming back) goes as a POST body, not in the address', sent.length===1 && sent[0].post===true);

  // ================= A2. Breaks really start =================
  await E("startFocus(null); renderView()"); await p.waitForTimeout(200);
  const out = await E("opRunTool('take_break', {until:'10:30'})");
  check('take_break with a time: Focus is paused and the app shows a break, back at that time', await E("state.focus.activeSession.onBreak===true") && /paused/.test(out) && /10:30/.test(out), out);
  check('…and Op is held off until then', await E("!!opHold() && opHold().reason==='break'"));
  await E("(function(){ state.focus.activeSession = null; state.modes.active = null; state.focus.opHold = null; persist('focus'); persist('modes'); })()");
  const cb = await E("opRunTool('check_back', {time:'11:57', reason:'break'})");
  check('“check back at 11:57, he’s on a break” (what Op used) now starts a real break too', await E("state.modes.active && state.modes.active.type==='break'") && /break started/.test(cb), cb);
  check('the break tool says to report it only once the app confirms it', await E("/only tell him it started if it says so/.test(OP_TOOLS.find(t => t.name==='take_break').description) && /DONE MEANS DONE/.test(JSON.stringify(aiSystem()))"));
  await E("endMode(); state.focus.opHold = null");

  // ================= A4. Op answers when spoken to =================
  await E("opChat().push({r:'op', t:'You did your workout at the gym today and you hit every set. Good work.', at:Date.now()}); OV.speaking = false; R67.spokeEnd = 0; AI.typedAt = 0");
  check('a question about his last answer isn’t taken for an echo (he isn’t speaking)', await E("!r62IsEcho(r62Norm('what did you say about the gym today'))"));
  await E("OV.speaking = true");
  check('…while he’s speaking, his own words heard back still are', await E("r62IsEcho(r62Norm('you did your workout at the gym today and you hit every set'))"));
  check('…but a short line never is', await E("!r62IsEcho(r62Norm('at the gym today'))"));
  await E("OV.speaking = false");
  sent.length = 0; reply = () => ({stop_reason:'end_turn', content:[{type:'text', text:'Yes.'}]});
  await E("R62.last = {n:r62Norm('can you add a task'), at:Date.now() - 6000}; aiAsk('can you add a task')"); await p.waitForTimeout(300);
  check('the same words again after 4 seconds go through (only a real double send is dropped)', convs().length===1);

  // ================= B5/B6. Voice memos =================
  await E("ui.view='personal'; ui.personalTab='journal'; ui.journalMode='entries'; renderView()"); await p.waitForTimeout(200);
  check('the Journal has Memos and Ask Op beside Entries, Boards and the Vault', /Entries[\s\S]*Boards[\s\S]*Memos[\s\S]*Vault[\s\S]*Ask Op/.test(await p.textContent('.r62-jtabs')));
  await p.click('[data-action="journalMode"][data-id="memos"]'); await p.waitForTimeout(250);
  check('Memos: record or upload, nothing to read yet', !!(await p.$('.r67-rec')) && !!(await p.$('#r67MemoFile[multiple]')) && !!(await p.$('.r67-empty')));
  // two old memos come in (the transcripts stand in for ElevenLabs here)
  await E("r67Scribe = async function(b){ return await b.text(); }; R67.queue.push({id:'q1', name:'Walk 12', src:'a', date:'2026-10-02', dur:3600, file:new Blob(['I want to raise my retainer to twenty five hundred and ask Harbor Dental first because they love the work.'], {type:'audio/mp4'})}, {id:'q2', name:'Car thoughts', src:'b', date:'2026-10-09', dur:1800, file:new Blob(['Hire an editor before December so I can film more and stop editing at night.'], {type:'audio/mp4'})}); renderView()"); await p.waitForTimeout(200);
  const cost = await p.textContent('.r67-cost');
  check('before anything runs: what it will cost (1 h 30 min → about $0.60 to transcribe, Op reading it, the total), and Go', /\$0\.60\s*to transcribe/.test(cost) && /for Op to read/.test(cost) && /total, once/.test(cost) && !!(await p.$('[data-action="r67MemoGo"]')), cost);
  reply = (body) => /voice memos, summed up/.test(JSON.stringify(body.messages)) ? {stop_reason:'end_turn', content:[{type:'text', text:'{"points":["Raise prices (twice)","Hire an editor"]}'}]}
    : /Harbor/.test(JSON.stringify(body.messages)) ? {stop_reason:'end_turn', content:[{type:'text', text:'{"title":"Raising the retainer","summary":"You talk about raising your retainer.","points":["Raise to $2,500","Ask Harbor Dental first"]}'}]}
    : {stop_reason:'end_turn', content:[{type:'text', text:'{"title":"An editor","summary":"You want to hire an editor.","points":["Hire before December"]}'}]};
  await p.click('[data-action="r67MemoGo"]'); await p.waitForTimeout(1200);
  check('Go: each memo is read once: a title, a summary, its key points', await E("r67Memos().length===2 && r67Memos().some(m => m.title==='Raising the retainer' && m.points.length===2 && /retainer/.test(m.summary))"));
  check('…and one full list across all of them', await E("state.journal.r67Overview && state.journal.r67Overview.points.join('|')==='Raise prices (twice)|Hire an editor'") && /Across all your memos/.test(await p.textContent('.r67-ov')));
  check('only text is kept: the transcript on this Mac (IndexedDB), not in the journal’s data; no audio', await E("(async () => { const m = r67Memos().find(m => m.title==='Raising the retainer'); const t = await r67MemoGet(m.id); return /twenty five hundred/.test(t) && JSON.stringify(state.journal).indexOf('twenty five hundred')<0 && !r67Memos().some(m => m.file || m.audio); })()"));
  await p.click('.r67-mc-h >> nth=1'); await p.waitForTimeout(200);
  await p.click('.r67-mc.is-open [data-action="r67MemoTxt"]'); await p.waitForTimeout(300);
  check('a memo opens to its points and its transcript', /Ask Harbor Dental first/.test(await p.textContent('.r67-mc.is-open')) && /twenty five hundred/.test(await p.textContent('.r67-tx')));
  // ---- free: transcripts instead of audio (the iPhone's own, pasted or as text files) ----
  require('fs').writeFileSync(OUT+'/walk-41.txt', 'Today I want to plan the studio move and call the landlord about the lease before Friday.');
  await p.setInputFiles('#r67MemoFile', OUT+'/walk-41.txt'); await p.waitForTimeout(400);
  await p.click('[data-action="r67PasteOpen"]'); await p.waitForTimeout(150);
  await p.fill('#r67PasteText', 'Thinking about hiring a second editor and raising prices in January.'); await p.fill('#r67PasteName', 'Car ride'); await p.click('[data-action="r67PasteAdd"]'); await p.waitForTimeout(250);
  const cost2 = await p.textContent('.r67-cost');
  check('free: a transcript (a text file, or pasted from the iPhone) costs nothing to transcribe, only Op reading it', /\$0\s*transcripts: free/.test(cost2) && await E("R67.queue.length===2 && R67.queue.every(q => q.text && !q.file)"), cost2);
  reply = () => ({stop_reason:'end_turn', content:[{type:'text', text:'{"title":"The studio move","summary":"You plan the move.","points":["Call the landlord"]}'}]});
  await p.click('[data-action="r67MemoGo"]'); await p.waitForTimeout(1200);
  check('…Go: read and summed up like the others (no transcription asked for)', await E("r67Memos().length===4 && r67Memos().some(m => m.name==='Car ride') && r67Memos().some(m => m.name==='walk-41')"));
  // ---- Op reads the journal from anywhere ----
  await E("state.journal.entries.push({id:'jx1', date:'2026-09-14', timestamp:new Date(2026, 8, 14, 9).getTime(), title:'Money', text:'Thinking about pricing and saving for the studio.', type:'freeform', mood:'starred'}); persist('journal')");
  const rj = await E("opRunTool('read_journal', {query:'pricing retainer'})");
  check('Op can read the journal and the memos (read_journal)', /saving for the studio/.test(rj) && /Raising the retainer/.test(rj), rj.slice(0, 200));
  check('…by month and by tag', /saving for the studio/.test(await E("opRunTool('read_journal', {month:'2026-09'})")) && /Money/.test(await E("opRunTool('read_journal', {tag:'starred'})")));
  const tr = await E("opRunTool('memo_transcript', {memo:'retainer'})");
  check('…and the exact words of a memo (memo_transcript)', /twenty five hundred/.test(tr));
  // ---- Ask Op ----
  reply = (body) => ({stop_reason:'end_turn', content:[{type:'text', text:'You keep coming back to **pricing**:\n\n- Raise to $2,500\n- Ask Harbor first'}]});
  await p.click('.r62-jtabs [data-action="r67AskOpen"]'); await p.waitForTimeout(500);
  check('Ask Op opens over the app, like Inspiration', await E("document.getElementById('r67Ask').classList.contains('is-in')") && (await p.$$('.r67-sug button')).length===4);
  sent.length = 0;
  await p.fill('#r67AskIn', 'What do I keep coming back to?'); await p.press('#r67AskIn', 'Enter'); await p.waitForTimeout(600);
  check('ask it: Op answers about the memos and the journal (he has them, and his tools)', /pricing/.test(await p.textContent('#r67AskB')) && !!(await p.$('#r67AskB ul li')) && /HIS VOICE MEMOS \(4\)/.test(JSON.stringify(last().system)) && /Raising the retainer/.test(JSON.stringify(last().system)) && last().tools.some(t => t.name==='memo_transcript'));
  check('…the chat is kept', await E("state.journal.r67Ask.length===2"));
  await p.keyboard.press('Escape'); await p.waitForTimeout(400);
  check('Esc closes it', await E("!document.getElementById('r67Ask').classList.contains('is-in')"));

  // ================= G11. My journal: search and filters =================
  await E("ui.journalMode='entries'; ui.journalViewMode='personal'; renderView()"); await p.waitForTimeout(250);
  check('My journal: search, month, day and the tags on one line above the entries', !!(await p.$('.r67-jf #journalSearchInput')) && !!(await p.$('.r67-jf #r67JMonth')) && !!(await p.$('.r67-jf #r67JDay')) && /Starred[\s\S]*Updates/.test(await p.textContent('.r67-jf-t')) && !(await p.$('.r61-js')));
  await p.selectOption('#r67JMonth', '2026-09'); await p.waitForTimeout(250);
  check('…a month shows just that month', /saving for the studio/.test(await p.textContent('#journalHistoryContainer')) && !/Harbor deal/.test(await p.textContent('#journalHistoryContainer')));
  await p.click('[data-action="r67JClear"]'); await p.waitForTimeout(200);
  await p.click('.r67-jf-t [data-id="starred"]'); await p.waitForTimeout(200);
  check('…Starred shows the starred ones', /saving for the studio/.test(await p.textContent('#journalHistoryContainer')) && !/Harbor deal/.test(await p.textContent('#journalHistoryContainer')));
  await p.click('[data-action="r67JClear"]'); await p.waitForTimeout(200);
  await p.fill('#journalSearchInput', 'money'); await p.waitForTimeout(250);
  check('…search finds titles too', /saving for the studio/.test(await p.textContent('#journalHistoryContainer')) && await E("filteredJournalEntries().length===1"));
  await E("ui.journalSearchText=''; renderView()");

  // ================= C7. New leads stay =================
  await E("state.business.pipeline.push({id:'nl1', name:'Mia Torres', company:'Torres Roofing', stage:state.business.pipeline[0].stage, createdAt:todayStr(), touchpoints:[], timeline:[], stageHistory:[]}); persist('business')");
  check('a new lead shows in notifications', await E("notifList().some(n => n.key==='r67new:nl1' && /Torres Roofing/.test(n.title))"));
  await E("ACTIONS.notifClearAll()");
  check('…Clear all doesn’t take it away', await E("notifList().some(n => n.key==='r67new:nl1')"));
  await E("const d = new Date(Date.now() + 2*86400000); window.__t = d");
  await E("logTouch('lead', 'nl1')");
  check('…a touch logged (acting on it) does', await E("!notifList().some(n => n.key==='r67new:nl1')"));
  await E("state.business.pipeline.push({id:'nl2', name:'Ray', company:'Ray HVAC', stage:state.business.pipeline[0].stage, createdAt:todayStr(), touchpoints:[], timeline:[], stageHistory:[]}); ACTIONS.notifDismiss(null, null, 'r67new:nl2')");
  check('…and so does its ✕', await E("!notifList().some(n => n.key==='r67new:nl2')"));

  // ================= D8. Not my campaign =================
  await E("(function(){ const c = state.business.clients[0], L = r53AdLedger(); L['k1'] = {name:'Spring Leads', acct:'act1', spend:300, leads:12, currency:'USD'}; L['k2'] = {name:'Someone else’s', acct:'act1', spend:900, leads:40, currency:'USD'}; adLinks()['k1'] = c.id; adLinks()['k2'] = c.id; })()");
  const before = await E("r53AllFor(state.business.clients[0].id).leads");
  await E("ACTIONS.r67NotMine(null, null, 'k2')");
  check('“Not mine” takes a campaign out of the client’s numbers (52 leads → 12)', before===52 && await E("r53AllFor(state.business.clients[0].id).leads===12 && r53AllFor('*').leads===12 && adClientOf({id:'k2', acct:'act1'})===null"));
  check('…nothing is deleted: it’s kept to bring back', await E("!!r53AdLedger()['k2'] && !!r67NotMine()['k2']"));
  await E("ACTIONS.r67Mine(null, null, 'k2')");
  check('…and it comes back', await E("r53AllFor(state.business.clients[0].id).leads===52"));

  // ---- whose campaign, from the client's page in Social ----
  await E("igCfg().accounts = [{id:'o1', role:'business', username:'commenccollective', src:'zernio'}]; igCfg().cliAll = [{id:'c1', platform:'instagram', username:'jjs_build'}]; ui.r55CliAll = null; ui.r55CliTried = true; r55CliLinks().c1 = state.business.clients[0].id; r53AdLedger()['k3'] = {name:'Brand awareness', acct:'act2', spend:150, leads:5, currency:'USD'}; delete adLinks()['k2']; ui.view='convos'; ui.socTab='overview'; ui.r58Acct='c1'; renderView()"); await p.waitForTimeout(300);
  check('a client’s page in Social: their ad campaigns, each with whose it is, and “Add a campaign…”', (await p.$$('.r67-cads .r67-car')).length===1 && !!(await p.$('.r67-cads [data-r67-add]')));
  await p.selectOption('.r67-cads [data-r67-add]', 'acct:act1'); await p.waitForTimeout(250);
  check('…give them a whole ad account at once', (await p.$$('.r67-cads .r67-car')).length===2 && await E("r53AllFor(state.business.clients[0].id).leads===52"));
  await p.selectOption('.r67-cads [data-r67-camp="k2"]', await E("state.business.clients[1].id")); await p.waitForTimeout(250);
  check('…or move one to another client (no fake “new leads” for them)', await E("adClientOf({id:'k2'})===state.business.clients[1].id && state.settings.r66AdSnap[state.business.clients[1].id]===40") && (await p.$$('.r67-cads .r67-car')).length===1);
  await p.selectOption('.r67-cads [data-r67-camp="k1"]', '__notmine'); await p.waitForTimeout(250);
  check('…or mark it Not mine right there', await E("!!r67NotMine()['k1'] && r53AllFor(state.business.clients[0].id).leads===0"));
  await E("ACTIONS.r67Mine(null, null, 'k1')");
  check('the Ads tab’s Assign menu has Not mine too', await E("r50AssignSel({id:'k3'}).indexOf('__notmine') > 0"));
  // ================= E9. Check-in frequency =================
  await E("ui.view='business'; ui.businessTab='log'; ui.r54Lc='clients'; renderView()"); await p.waitForTimeout(300);
  const sel = await p.$('.lc-row select[data-r67-every]');
  check('Log center: each client has a “Check in” choice', !!sel && (await p.$$('.lc-row select[data-r67-every]')).length===(await p.$$('.lc-row input[data-r60-fu^="client:"]')).length);
  const key = await sel.getAttribute('data-r67-every');
  await sel.selectOption('3'); await p.waitForTimeout(250);
  check('…set it: that client is checked in with every 3 days', await E("(function(){ const x = crmFind('client', '"+key.split(':')[1]+"'); return x.cadenceDays===3 && crmCadence('client', x)===3; })()"));

  // ================= F10. A task that logs something asks first =================
  await E("ui.view='today'; renderView()"); await p.waitForTimeout(300);
  const tcid = await E("(function(){ const t = state.tasks.items.find(t => t.master && t.master.kind==='reach' && t.status!=='done'); return t ? t.id : null; })()");
  await E("(function(){ const b = document.createElement('button'); b.id = 'tcBtn'; b.setAttribute('data-action', 'completeTask'); b.setAttribute('data-id', '"+tcid+"'); b.textContent = 'tick'; b.style.cssText = 'position:fixed;top:300px;left:600px;z-index:99999'; document.body.appendChild(b); })()");
  const what = await E("r67WhatLogs(state.tasks.items.find(t => t.id==='"+tcid+"'))");
  await p.click('#tcBtn'); await p.waitForTimeout(300);
  check('ticking it by hand: “Did you actually do it?” and what it will log', /Did you actually do it/.test(await p.textContent('#uiDialogOverlay .ui-dlg-t')) && /This logs a touch for Peak Fitness/.test(await p.textContent('#uiDialogOverlay .ui-dlg-p')), what);
  await p.click('#uiDialogOverlay [data-ui-dlg="no"]'); await p.waitForTimeout(250);
  check('…“Not yet”: nothing logged, the task stays', await E("state.tasks.items.find(t => t.id==='"+tcid+"').status!=='done'"));
  const t0 = await E("state.business.clients.reduce((a, c) => a + (c.touchpoints || []).length, 0)");
  await p.click('#tcBtn'); await p.waitForTimeout(300);
  await p.click('#uiDialogOverlay [data-ui-dlg="yes"]'); await p.waitForTimeout(400);
  check('…confirm: done, and the check-ins are logged', await E("state.tasks.items.find(t => t.id==='"+tcid+"').status==='done'") && await E("state.business.clients.reduce((a, c) => a + (c.touchpoints || []).length, 0)") > t0);
  check('Op and the app itself aren’t stopped by it (no pop-up when it isn’t his tap)', await E("(function(){ const c = state.business.clients.find(c => c.id==='dc1'); c.touches = []; c.touchpoints = []; const t = {id:'tc2', title:'Reach out', status:'today', master:{kind:'reach', week:'2099-01-05'}, createdAt:todayStr()}; state.tasks.items.push(t); const w = r67WhatLogs(t); completeTask('tc2'); return !!w && t.status==='done'; })()"));
  await E("document.getElementById('tcBtn').remove()");

  // ================= A3. The talk key check says if the key itself was heard =================
  check('the key check reads the talk key itself (not just any key)', await E("(function(){ R62.check = {at:Date.now() - 5000, h:{trusted:true, hooked:true, last:0, talkAt:Date.now(), via:'modifiers'}}; const h = r62CheckHtml(); R62.check = null; return /Operator heard your talk key/.test(h); })()"));
  }catch(err){ check('the run reached the end', false, String(err && err.message || err).slice(0, 300)); }
  check('no errors', p.errors.length===0, p.errors);
  await b.close(); process.exit(report() ? 1 : 0);
})();
