// Round 51: one Op (no double answers), the cycle's four weeks, Settings → Op in one place.
const { instrument, launch, newPage, check, report, OUT } = require('./common.js');
(async () => {
  instrument(process.argv[2], OUT+'/r51.html');
  const b = await launch();
  const p = await newPage(b, OUT+'/r51.html', {profile:{name:'Andre Lopez'}, settings:{opLive:true, opAgentId:'ag1'},
    business:{clients:[{id:'jj', name:'Jay', business:'JJS', stage:'active', status:'active', mrr:3000, billingDay:1, startDate:'2026-01-01', deliverables:[{id:'d1', title:'Reels', recurring:true, weeklyTarget:3, completedDates:['2026-10-03', '2026-10-23']}]}]}}, new Date(2026, 9, 26, 10).getTime());
  const E = c => p.evaluate(x => window.__op.ev(x), c);
  await E("document.querySelectorAll('.overlay').forEach(o => o.classList.add('hidden')); masterTasksSync()"); await p.waitForTimeout(300);
  // one Op
  const r = await E("(async function(){ const sent = []; OPRT.send = o => sent.push(o); OPRT.state = 'live'; const out = [];"+
    "aiAsk('hello there friend'); out.push(sent.length);"+
    "OP1.inputAt = Date.now(); aiAsk('what is up today'); out.push(sent.length);"+
    "OPRT.onMsg({type:'user_transcript', user_transcription_event:{user_transcript:'how is everything going'}}); OP1.inputAt = Date.now(); aiAsk('How is everything going?'); out.push(sent.length);"+
    "OPRT.state = 'connecting'; aiAsk('add a task'); OPRT.onMsg({type:'conversation_initiation_metadata', conversation_initiation_metadata_event:{}}); out.push(sent.filter(o => o.type==='user_message').map(o => o.text).join('|'));"+
    "OPRT.state = 'live'; out.push(await opSay('hi')); OPRT.state = 'off'; return out; })()");
  check('live: words another ear picked up don\'t get sent again', r[0]===0);
  check('live: what you type goes to him once', r[1]===1);
  check('live: words he just heard you say aren\'t sent again', r[2]===1);
  check('connecting: what you ask waits and goes to him when he\'s up', r[3]==='what is up today|add a task', r[3]);
  check('the old voice never talks over him', r[4]===false);
  check('his voice uses the same model as Op\'s normal voice', await E("R51_TTS[0].model_id")==='eleven_multilingual_v2');
  // cycle weeks
  const tk = await E("JSON.stringify(state.tasks.items.filter(t => t.master && t.master.kind==='dvw' && !t.master.post).map(t => t.master.wk).sort())");
  check('four tasks a cycle for a deliverable', tk==='[1,2,3,4]', tk);
  check('a reel made in week 4 counts for week 4', await E("dvwFind(state.tasks.items.find(t => t.master && t.master.wk===4)).done")===1);
  check('the client card reads the same week', await E("deliverableWeekCount(state.business.clients[0].deliverables[0])")===1);
  await E("ui.view='focus'; ui.focusTab='tasks'; ui.focusTasksSubTab='clientBacklog'; renderView()"); await p.waitForTimeout(250);
  check('the backlog shows the four weeks, this one marked', (await p.$$('.r51-wk')).length===4 && !!(await p.$('.r51-wk.is-now')));
  // settings
  await E("ui.view='settings'; ui.settingsTab='op'; renderView()"); await p.waitForTimeout(250);
  const st = await p.textContent('.settings-content');
  check('Op settings: one Check-ins row, nothing doubled', /Check-ins/.test(st) && !/Quiet while you work|How hard Op presses|Op checks in on you|Check-ins while you work/.test(st));
  check('with live on: no Brain, no Anthropic key in Op', !/Brain/.test(st) && !/Anthropic key/.test(st));
  await p.click('[data-action="r51CheckSet"][data-id="off"]'); await p.waitForTimeout(150);
  check('Check-ins Off turns both kinds off', await E("workCfg().checkins===false && opPressLevel()==='off'"));
  await E("ui.settingsTab='system'; renderView()"); await p.waitForTimeout(250);
  check('Connections & Data has the Anthropic key and Links', /Anthropic/.test(await p.textContent('.settings-content')) && !!(await p.$('#setLinkBrowser')));
  check('no errors', p.errors.length===0, p.errors);
  await b.close(); process.exit(report() ? 1 : 0);
})().catch((e) => { console.error(e); process.exit(1); });
