// Round 51: one Op (no double answers), the cycle's four weeks, Settings → Op in one place.
const { instrument, launch, newPage, check, report, OUT } = require('./common.js');
(async () => {
  instrument(process.argv[2], OUT+'/r51.html');
  const b = await launch();
  const p = await newPage(b, OUT+'/r51.html', {profile:{name:'Andre Lopez'}, settings:{opLive:true, opAgentId:'ag1'},
    business:{clients:[{id:'jj', name:'Jay', business:'JJS', stage:'active', status:'active', mrr:3000, billingDay:1, startDate:'2026-01-01', deliverables:[{id:'d1', title:'Reels', recurring:true, weeklyTarget:3, completedDates:['2026-10-03', '2026-10-23']}]}]}}, new Date(2026, 9, 26, 10).getTime());
  const E = c => p.evaluate(x => window.__op.ev(x), c);
  await E("document.querySelectorAll('.overlay').forEach(o => o.classList.add('hidden')); masterTasksSync()"); await p.waitForTimeout(300);
  // (one Op: round 54 removed live conversation; r54-test checks one answer per message)
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
  check('Op settings: nothing doubled', !/Quiet while you work|How hard Op presses|Op checks in on you|Check-ins while you work/.test(st));
  check('no Anthropic key in Op (it is in Connections & Data)', !/Anthropic key/.test(st));
  await E("ui.settingsTab='system'; renderView()"); await p.waitForTimeout(250);
  check('Connections & Data has the Anthropic key and Links', /Anthropic/.test(await p.textContent('.settings-content')) && !!(await p.$('#setLinkBrowser')));
  check('no errors', p.errors.length===0, p.errors);
  await b.close(); process.exit(report() ? 1 : 0);
})().catch((e) => { console.error(e); process.exit(1); });
