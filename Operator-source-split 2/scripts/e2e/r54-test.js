// Round 54: Op only speaks when he should, one answer per message, the talk key; leads in the Log center;
// lifecycle tasks; the small fixes.
const { instrument, launch, newPage, check, report, OUT } = require('./common.js');
(async () => {
  instrument(process.argv[2], OUT+'/r54.html');
  const b = await launch();
  const at = (h, m) => new Date(2026, 9, 27, h, m || 0).getTime();   // a Tuesday
  const seed = {profile:{name:'Andre Lopez', opOn:true},
    focus:{work:{enabled:true, start:'09:00', end:'17:00', days:[1, 2, 3, 4, 5], lunchOn:false, brkOn:false}, sessions:[]},
    business:{clients:[{id:'jj', name:'Jay', business:'JJS', stage:'active', status:'active', mrr:3000, startDate:'2026-01-01', deliverables:[]}],
      pipeline:[{id:'l1', name:'Mia', business:'Mia Spa', stage:'contacted', value:2500, createdAt:'2026-10-26'}, {id:'l2', name:'Tom', stage:'contacted', value:900, createdAt:'2026-10-20', touchpoints:[{id:'t', date:'2026-10-26', type:'dm'}]}]},
    calendar:{events:[{id:'ev1', title:'Shoot at JJS', date:'2026-10-27', time:'10:00', isShoot:true, linkedClient:'jj'}, {id:'ev2', title:'Strategy call', date:'2026-10-27', time:'13:00', linkedClient:'jj'}], categories:[]}};
  const p = await newPage(b, OUT+'/r54.html', seed, at(11, 0));
  const E = c => p.evaluate(x => window.__op.ev(x), c);
  await E("document.querySelectorAll('.overlay').forEach(o => o.classList.add('hidden')); AI.hasKey = false; window.__said = []; r54Speak = function(l, listen){ window.__said.push({l:l, listen:!!listen}); r54Remember(l); }; R54.tapAt = 0; OPX.userAt = 0");
  const said = () => E("window.__said.length");
  const quiet = () => E("R54.tapAt = 0; OPX.userAt = 0");

  // ---- the gate ----
  await E("state.focus.activeSession = {startedAt:Date.now() - 600000, plannedMinutes:50, completedTasks:[], breaks:[], onBreak:false}");
  await quiet();
  check('working: he may not speak up', await E("r54May('auto')")===false && await E("r54May('debrief')")===false);
  await E("state.focus.activeSession = null; state.modes.active = {type:'shooting', startedAt:Date.now() - 60000}"); await quiet();
  check('shooting counts as working', await E("r54May('auto')")===false);
  await E("state.modes.active = null"); await quiet();
  check('in your hours, not working: he may', await E("r54May('auto')")===true);
  check('the old check-ins are gone (accountability, moments, question a day)', await E("(acctTick(), !acct().pending) && opQuestionDue()===false && typeof opDayMoments==='function'"));
  // ---- the callout: every 2–3 hours off ----
  await E("state.focus.r54Day = {date:todayStr(), gap:100}; workDayState().clockedInAt = Date.now() - 3*3600000; state.focus.sessions = []"); await quiet();
  await E("r54CalloutTick()"); await p.waitForTimeout(100);
  check('off for 2+ hours in work hours: he calls it out', await said()===1, await E("window.__said"));
  await E("r54CalloutTick()"); await p.waitForTimeout(100);
  check('…and not again right away', await said()===1);
  await E("state.focus.sessions = [{date:todayStr(), startedAt:Date.now() - 3600000, endedAt:Date.now() - 1800000}]; state.focus.r54Day.calloutAt = 0"); await quiet();
  await E("r54CalloutTick()"); await p.waitForTimeout(100);
  check('worked half an hour ago: nothing', await said()===1);
  // variety
  const lines = await E("(function(){ const out = []; for(let i = 0; i < 8; i++){ out.push(r54Pick(R54_OFF)); r54Remember(out[out.length - 1]); } return out; })()");
  check('he says it differently every time (no repeated openings)', new Set(lines.map(l => l.toLowerCase().split(/\s+/).slice(0, 3).join(' '))).size===lines.length, lines);
  // ---- after hours / clocked out ----
  await p.clock.setFixedTime(at(18, 30)); await quiet();
  await E("state.focus.r54Day.calloutAt = 0; state.focus.sessions = []");
  check('after hours: he may not speak up', await E("r54May('auto')")===false);
  await E("r54CalloutTick()"); await p.waitForTimeout(100);
  check('after hours: no callout', await said()===1);
  await p.clock.setFixedTime(at(11, 0)); await E("state.modes.active = {type:'offtime', startedAt:Date.now(), clockedOut:true}"); await quiet();
  check('clocked out: silence', await E("r54May('auto')")===false);
  await E("state.modes.active = null");
  // ---- the end of work hours: a tap-in, once, not during a session ----
  await p.clock.setFixedTime(at(17, 5)); await quiet();
  await E("state.focus.activeSession = {startedAt:Date.now() - 600000, plannedMinutes:50, completedTasks:[], breaks:[], onBreak:false}; r54EndTick()"); await p.waitForTimeout(100);
  check('end of hours while you’re in a session: he waits', await said()===1);
  await E("state.focus.activeSession = null; r54EndTick()"); await p.waitForTimeout(100);
  check('…then taps in once, and opens the mic for you', await said()===2 && await E("window.__said[1].listen"));
  await E("r54EndTick()"); await p.waitForTimeout(100);
  check('…only once', await said()===2);
  // ---- a session ending after hours: one line right then ----
  await p.clock.setFixedTime(at(20, 0));
  await E("state.focus.activeSession = {startedAt:Date.now() - 1800000, plannedMinutes:50, completedTasks:[], breaks:[], onBreak:false}"); await p.waitForTimeout(3400);
  await E("state.focus.activeSession = null"); await p.waitForTimeout(3400);
  check('a session ends after hours: one line', await said()===3, await E("window.__said"));
  // ---- the debrief: after a shoot, into the client's journal ----
  await p.clock.setFixedTime(at(12, 0));
  await E("state.modes.active = {type:'shooting', startedAt:Date.now() - 40*60000, eventId:'ev1', note:'Shoot at JJS'}; finishActiveMode(true)");
  await E("(function(){ const real = r54DebriefAsk; window.__dbf = null; r54DebriefAsk = function(k, c, w){ window.__dbf = {k:k, c:c}; return real.apply(this, arguments); }; })()");
  await E("setTimeout(function(){ r54DebriefAsk('shoot', 'jj', 'Shoot at JJS'); }, 0)"); await p.waitForTimeout(200);
  check('after the shoot he asks how it went (about that client)', await E("!!R54.debrief && R54.debrief.clientId==='jj'") && /shoot/i.test(await E("window.__said[window.__said.length - 1].l")));
  await E("aiAsk('It went great, we got three reels and the owner wants a second shoot next week', 'opBubText')"); await p.waitForTimeout(300);
  check('what you say goes in the client’s journal', await E("arr(state.business.clients[0].journal).some(j => j.kind==='debrief' && /three reels/.test(j.text))"));
  // a meeting with a client, about an hour after it started
  await p.clock.setFixedTime(at(14, 10)); await E("R54.tapAt = 0; OPX.userAt = 0; R54.debrief = null; r54MeetTick()"); await p.waitForTimeout(200);
  check('an hour after a client call: he asks how it went', await E("!!R54.debrief && R54.debrief.kind==='meet'") && await E("state.calendar.events.find(e => e.id==='ev2').r54Asked===true"));

  // ---- one answer per message ----
  await E("R54.last = null; window.__asks = 0; acctIntercept = function(){ window.__asks++; return true; }");
  await E("aiAsk('add a task to call Mia', 'opBubText'); aiAsk('add a task to call Mia', 'opBubText'); aiAsk('Add a task to call Mia.', 'opBubText')");
  check('the same message three times: one answer', await E("window.__asks")===1);
  await E("aiAsk('add task call mia please', 'opBubText')");
  check('nearly the same words a moment later (another ear): still one', await E("window.__asks")===1);
  await E("AI.typedAt = Date.now(); aiAsk('what is on today', 'opBubText')");
  check('a new thing you type gets its answer', await E("window.__asks")===2);
  check('the same line is never spoken twice in a row', await E("(async function(){ R54.spoke = null; await opSay('Test line one', {cap:'opBubText', force:true}); return await opSay('Test line one', {cap:'opBubText', force:true}); })()")===false);
  check('no live conversation: one brain, one voice', await E("opLiveOn()===false") && await E("(async function(){ return await OPRT.start(); })()")===false);
  await E("ui.view='settings'; ui.settingsTab='op'; renderView()"); await p.waitForTimeout(200);
  const st = await p.textContent('#viewRoot');
  check('Settings → Op: Talk key, Hey Operator, long-break callouts; no live, no check-in levels', /Talk key/.test(st) && /Hey Operator/.test(st) && /Calls out long breaks/.test(st) && !/Live conversation/.test(st) && !/Now and then/.test(st));

  // ---- the talk key: a toggle, with a sound and moving bars ----
  await E("window.__listen = 0; aiListen = function(){ window.__listen++; AI.listening = true; AI.sendNow = function(){ AI.listening = false; window.__sent = (window.__sent||0) + 1; }; }; AI.listening = false; AI.busy = false; AI.transcribing = false; window.__opGlobalKey = false; state.profile.opKeyOn = true");
  await p.keyboard.down('AltRight'); await p.keyboard.up('AltRight'); await p.waitForTimeout(100);
  check('press the key: he listens', await E("window.__listen")===1 && await E("AI.listening"));
  await p.keyboard.down('AltRight'); await p.keyboard.up('AltRight'); await p.waitForTimeout(100);
  check('press again: it sends', await E("window.__sent")===1 && !(await E("AI.listening")));
  await p.keyboard.down('AltRight'); await p.keyboard.press('KeyK'); await p.keyboard.up('AltRight'); await p.waitForTimeout(100);
  check('the key used with another key (⌥K) does nothing', await E("window.__listen")===1);
  await E("window.__opGlobalKey = true"); await p.keyboard.down('AltRight'); await p.keyboard.up('AltRight'); await p.waitForTimeout(100);
  check('in the Mac app the app-wide key takes over (no double press)', await E("window.__listen")===1);
  await E("window.__opGlobalKey = false; state.profile.opKeyOn = false"); await p.keyboard.down('AltRight'); await p.keyboard.up('AltRight'); await p.waitForTimeout(100);
  check('Talk key off: nothing', await E("window.__listen")===1);
  check('the bars move with a normal speaking voice', await E("(SCR.level = 0.02, Math.min(1, SCR.level*14)) > 0.35") && await E("(SCR.level = 0.002, Math.min(1, SCR.level*14)) < 0.25"));
  await E("SCR.level = 0; AI.listening = false");

  // ---- leads ----
  await E("masterTasksSync()");
  check('a lead you never reached out to is due right away', await E("crmOverdueDays('lead', state.business.pipeline[0]) >= 0"));
  check('every 2 days by default', await E("crm().leadCadenceDays")===2);
  await E("ui.view='business'; ui.businessTab='log'; ui.r54Lc='clients'; renderView()"); await p.waitForTimeout(200);
  check('the Log center has Clients and Leads, separate', !!(await p.$('.r54-lcw [data-id="leads"]')) && !(await p.$('.r54-lr')));
  const card = await E("taskCard(state.tasks.items.find(t => t.master && t.master.kind==='reachLeads' && t.status!=='done'))");
  check('Reach out to leads lists the never-contacted lead', /Mia/.test(card));
  await E("openTaskEditModal(state.tasks.items.find(t => t.master && t.master.kind==='reachLeads' && t.status!=='done').id)"); await p.waitForTimeout(200);
  check('tapping the task opens the Log center’s Leads', await E("ui.businessTab==='log' && ui.r54Lc==='leads'") && (await p.$$('.r54-lr')).length===2);
  await p.selectOption('select[data-crm-cadence="lead:l1"]', '5'); await p.waitForTimeout(150);
  check('each lead has its own rhythm', await E("state.business.pipeline[0].cadenceDays")===5);
  await E("logTouch('lead', 'l1', 'call'); masterTasksSync()");
  check('a touch takes them off; nobody left, the task goes', await E("!state.tasks.items.some(t => t.master && t.master.kind==='reachLeads' && t.status!=='done')"));

  // ---- the lifecycle ----
  await E(`(function(){
    const cm = crm();
    const first = {id:'cyF', name:'First month', color:'#8fdcff', finishStage:'active', next:'cyR', steps:[
      {id:'sOn', label:'Onboarding', color:'#8fdcff', checklist:[{id:'i1', text:'Onboarding call', type:'meeting', dueDays:2}, {id:'i2', text:'Send onboarding form', type:'form'}]},
      {id:'sKo', label:'Kick-off', color:'#E8A23D', checklist:[{id:'i3', text:'Kick-off call', type:'meeting', dueDays:5}]},
      {id:'sWin', label:'First win', color:'#3FBE8E', checklist:[{id:'i4', text:'Deliver a quick win', type:'task'}]}]};
    const reg = {id:'cyR', name:'Regular', color:'#3FBE8E', finishStage:'active', steps:[{id:'sOg', label:'Ongoing', color:'#3FBE8E', checklist:[{id:'i5', text:'Weekly report', type:'doc', repeat:'week', dueDow:5}, {id:'i6', text:'Monthly meeting', type:'meeting', repeat:'month'}]}]};
    cm.cycles = [first, reg]; cm.defaultCycleId = 'cyF'; persist('business');
  })()`);
  await E("masterTasksSync()");
  check('your current clients go on Regular (what First month leads into)', await E("state.business.clients[0].cycleId")==='cyR');
  check('…and get Regular’s weekly report and monthly meeting', await E("state.tasks.items.filter(t => t.master && t.master.kind==='lcrep' && t.client==='jj').length")===2);
  check('the weekly report is due Friday', await E("state.tasks.items.find(t => t.title==='Weekly report').deadline")==='2026-10-30');
  await E("state.business.clients.push({id:'nw', name:'Nina', business:'Nina Nails', stage:'active', status:'active', mrr:1200, startDate:todayStr(), deliverables:[]}); masterTasksSync()");
  check('a new client starts First month', await E("crmFind('client', 'nw').cycleId")==='cyF');
  const t1 = await E("JSON.stringify(state.tasks.items.filter(t => t.client==='nw' && t.master && t.master.kind==='lc').map(t => [t.title, t.deadline]))");
  check('…with the Onboarding tasks, due when you set', /Onboarding call","2026-10-29/.test(t1) && /Send onboarding form/.test(t1), t1);
  check('lifecycle tasks have their own colour', /r54-lc/.test(await E("taskCard(state.tasks.items.find(t => t.title==='Onboarding call'))")) && /is-lc/.test(await E("taskCard(state.tasks.items.find(t => t.title==='Weekly report'))")));
  await E("state.tasks.items.filter(t => t.client==='nw' && t.master && t.master.kind==='lc').forEach(t => { t.status = 'done'; t.completedAt = todayStr(); }); masterTasksSync()");
  check('Onboarding’s tasks done: Nina moves to Kick-off on her own', await E("crmFind('client', 'nw').cycleStepId")==='sKo' && await E("state.tasks.items.some(t => t.title==='Kick-off call' && t.status!=='done')"));
  await E("ACTIONS.lcGoStep({dataset:{id:'nw', step:'sOn'}})");
  check('move her back: Onboarding’s tasks come back', await E("crmFind('client', 'nw').cycleStepId")==='sOn' && await E("state.tasks.items.filter(t => t.client==='nw' && /Onboarding call|Send onboarding form/.test(t.title) && t.status!=='done').length")===2 && !(await E("state.tasks.items.some(t => t.title==='Kick-off call' && t.status!=='done')")));
  await E("ACTIONS.lcGoStep({dataset:{id:'nw', step:'sWin'}})");
  check('move her forward two steps: what was left is checked off', await E("crmFind('client', 'nw').cycleStepId")==='sWin' && await E("state.tasks.items.filter(t => t.client==='nw' && /Onboarding call|Send onboarding form/.test(t.title) && t.status!=='done').length")===0);
  await E("state.tasks.items.filter(t => t.title==='Deliver a quick win').forEach(t => { t.status = 'done'; }); masterTasksSync()");
  check('First month done: she rolls into Regular', await E("crmFind('client', 'nw').cycleId")==='cyR' && await E("state.tasks.items.some(t => t.client==='nw' && t.title==='Weekly report')"));
  await E("ui.editingCycleId = 'cyF'"); const ed = await E("renderLifecycleEditor()");
  check('the cycle editor: what finishing leads to, and when each task is due', /When finished, move to/.test(ed) && /data-r54-due/.test(ed));
  await E("ui.editingCycleId = 'cyR'"); const ed2 = await E("renderLifecycleEditor()");
  check('…and repeating ones say which day', /data-r54-dow/.test(ed2) && /data-r54-dom/.test(ed2));

  // ---- small fixes ----
  check('Add task has no “Counts as a client deliverable”', !/Counts as a client deliverable/.test(await E("delivPickerHtml('', 'newTaskDeliv', [])")));
  await E("ACTIONS.createUpdatesType(); state.journal.entries.push({id:'u1', date:todayStr(), timestamp:Date.now(), text:'Note since this version', mood:'updates', photos:[]}, {id:'u0', date:'2026-10-01', timestamp:new Date(2026, 9, 1).getTime(), text:'Old note', mood:'updates', photos:[]})");
  const upd = await E("renderUpdatesTab()");
  check('“Since last update” shows only what you wrote since this version', await E("updateEntries().map(e => e.id).join(',')")==='u1');
  check('App updates: Since last update, Today, 3 days, 7 days', /Since last update/.test(upd) && /Last 3 days/.test(upd) && !/Last 2 hours/.test(upd));
  await E("ui.view='focus'; renderView(); openAddVideoIdeaModal ? openAddVideoIdeaModal() : null"); await p.waitForTimeout(200);
  const hasForm = await p.$('#newVideoIdeaTitle');
  if(hasForm){
    await p.fill('#newVideoIdeaTitle', 'Idea one'); await p.fill('#newVideoIdeaNotes', 'Some notes');
    await E("addVideoIdea()"); await E("openAddVideoIdeaModal()"); await p.waitForTimeout(150);
    check('the video idea form starts empty after a save', await E("document.getElementById('newVideoIdeaTitle').value===''") && await E("document.getElementById('newVideoIdeaNotes').value===''"));
  } else check('the video idea form opens', false);
  check('no errors', p.errors.length===0, p.errors);
  await b.close();
  process.exit(report() ? 1 : 0);
})().catch((e) => { console.error(e); process.exit(1); });
