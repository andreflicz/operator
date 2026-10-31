// Round 57: playbooks as pipelines (stages that mirror the Lead Center / client stages, steps placed once and yours
// from then on, due rules, attachments, behind-the-guide health), one name per task, Reach out to leads, Op
// (hours, sessions, break, journal tag, goodnight, push-to-talk), journal threads, the revamps, the audit.
const { instrument, launch, newPage, check, report, OUT } = require('./common.js');
(async () => {
  instrument(process.argv[2], OUT+'/r57.html');
  const b = await launch();
  const at = (d, h, m) => new Date(2026, 9, d, h, m || 0).getTime();
  const seed = {profile:{name:'Andre Lopez'},
    business:{clients:[
      {id:'kk', name:'Kiko', business:'Kiko', stage:'onboarding', status:'active', mrr:2000, startDate:'2026-10-26', deliverables:[]},
      {id:'jj', name:'Jay', business:'JJS Construction', stage:'active', status:'active', mrr:3000, startDate:'2026-01-05', deliverables:[{id:'d1', title:'8 reel', recurring:true, weeklyTarget:2, completedDates:[], fromPackage:true}]}],
      pipeline:[{id:'l1', name:'Mia', company:'Mia Spa', stage:'contacted', value:2500, createdAt:'2026-10-26'}]}};
  const p = await newPage(b, OUT+'/r57.html', seed, at(28, 10));
  await p.setViewportSize({width:1440, height:900});
  const E = c => p.evaluate(x => window.__op.ev(x), c);
  await E("document.querySelectorAll('.overlay').forEach(o => o.classList.add('hidden')); AI.hasKey = false; uiConfirm = function(o){ window.__conf = o; return Promise.resolve(true); }");
  await E("masterTasksSync(); ui.view='business'; ui.businessTab='lifecycle'; renderView()"); await p.waitForTimeout(250);
  try{

  // ================= A. PLAYBOOKS =================
  // a new playbook: its stages copied from the client stages
  await p.click('.pb6-bar [data-action="pb6NewOpen"]'); await p.waitForTimeout(200);
  check('new playbook: name, for, stages (the client stages, or my own), what happens after the last stage', !!(await p.$('#pb6NewName')) && (await p.$$('#pb6NewSheet [data-id^="mirror:"]')).length===2 && !!(await p.$('#pb6NewEnds')) && !(await p.$('#pb6NewDays')));
  await p.fill('#pb6NewName', 'Client journey'); await p.click('[data-action="pb6Create"]'); await p.waitForTimeout(250);
  // (the seed's onboarding client was on the old default cycle: it came over as its own playbook; keep ours first)
  await E("crm().playbooks.sort((a, b) => (a.name==='Client journey' ? 0 : 1) - (b.name==='Client journey' ? 0 : 1))");
  check('…its stages mirror the client stages', await E("JSON.stringify(pbStages(pbAll()[0]).map(s => [s.name, s.crm]))")===JSON.stringify([['Onboarding', 'onboarding'], ['Active', 'active'], ['At risk', 'atrisk']]));
  check('Build: the stages across the top, no weekly row, no day calendar first', (await p.$$('.pb57-st:not(.is-add)')).length===3 && !(await p.$('.pb6-week')) && !(await p.$('.pb6-cal')) && !!(await p.$('.pb57-list')));
  // steps on Onboarding
  await E(`(function(){ const P = pbAll()[0], S = pbStages(P);
    S[0].days = 7; S[0].steps.push(pb57Step('Onboarding call', 'call', {rule:'enter'}), pb57Step('Strategy doc', 'doc', {rule:'day', n:5}), pb57Step('Kick-off', 'task', {rule:'end'}));
    S[1].repeat = 'month'; S[1].steps.push(pb57Step('Monthly report', 'report', {rule:'end'}), pb57Step('Sales call review', 'task', {rule:'before', n:3}));
    S[2].steps.push(pb57Step('Save call', 'call', {rule:'enter'}));
    pbSave(); renderView(); })()`);
  check('steps say when they’re due: when they enter, a day, the last day, N days before the end', /When they enter/.test(await p.textContent('.pb57-list')) && /Day 5/.test(await p.textContent('.pb57-list')) && /Last day/.test(await p.textContent('.pb57-list')));
  await p.click('.pb57-row'); await p.waitForTimeout(150);
  check('a step opens on the right: type, due rule, checklist, files, links, notes', !!(await p.$('.pb6-item [data-pb57-rule]')) && /Files/.test(await p.textContent('.pb6-item')) && !!(await p.$('.pb6-item [data-action="pb57Attach"]')));
  await E("ui.pbItem = null; renderView()");
  // put Kiko on it: she's on Onboarding (her client stage) and its steps are tasks, placed once
  await E("(function(){ const c = crmFind('client','kk'); c.pb = null; c.cycleId = null; state.tasks.items = state.tasks.items.filter(t => !(t.master && t.master.id==='kk')); pbMoveTo('client', 'kk', pbAll()[0].id); })()"); await p.waitForTimeout(200); await E("masterTasksSync()");
  const kt = () => E("JSON.stringify(state.tasks.items.filter(t => t.master && t.master.kind==='pb' && t.master.id==='kk').map(t => [t.title, t.status, t.deadline]))").then(JSON.parse);
  let ts = await kt();
  check('on it at the stage she’s at (Onboarding), from her start date', await E("crmFind('client','kk').pb.stage===pbStages(pbAll()[0])[0].id && crmFind('client','kk').pb.enteredAt==='2026-10-26'"));
  check('entering the stage puts its steps on the list (a call with nothing booked is “Book: …”)', ts.some(t => t[0]==='Book: Onboarding call' && t[1]==='today') && ts.some(t => t[0]==='Strategy doc' && t[2]==='2026-10-30') && ts.some(t => t[0]==='Kick-off' && t[2]==='2026-11-01'), ts);
  // move them around, rename, reschedule: it sticks
  await E(`(function(){ const f = n => state.tasks.items.find(t => t.title===n); const a = f('Book: Onboarding call'), d = f('Strategy doc'), k = f('Kick-off');
    a.status = 'backlog'; d.status = 'today'; d.title = 'Kiko strategy (v2)'; k.deadline = '2026-11-09'; persist('tasks'); masterTasksSync(); masterTasksSync(); })()`);
  ts = await kt();
  check('moved to the backlog, it stays there (no snapping back to Today)', ts.some(t => t[0]==='Book: Onboarding call' && t[1]==='backlog'), ts);
  check('renamed and moved to Today, it keeps its name and its place', ts.some(t => t[0]==='Kiko strategy (v2)' && t[1]==='today'), ts);
  check('rescheduled, it keeps the new date', ts.some(t => t[0]==='Kick-off' && t[2]==='2026-11-09'), ts);
  // Good Morning / Lock in pick a task by setting it to today: same rule
  await E("(function(){ const k = state.tasks.items.find(t => t.title==='Kick-off'); promoteTask(k.id); masterTasksSync(); })()");
  check('pulled onto Today from the plan (Good Morning, Lock in), it stays on Today', (await kt()).some(t => t[0]==='Kick-off' && t[1]==='today'));
  // delete one: it's off the guide, not made again
  await E("(function(){ state.tasks.items = state.tasks.items.filter(t => t.title!=='Kiko strategy (v2)'); masterTasksSync(); masterTasksSync(); })()");
  check('a step’s task you delete isn’t made again (it’s off the guide, not counted against her)', !(await kt()).some(t => /strategy/i.test(t[0])) && await E("Object.values(crmFind('client','kk').pb.done).indexOf('skipped') >= 0"));
  // done both ways, and finishing the stage moves her on (and her client stage with it)
  for(const id of await E("state.tasks.items.filter(t => t.master && t.master.id==='kk' && t.status!=='done').map(t => t.id)")){ await E("completeTask('"+id+"')"); await p.waitForTimeout(700); }
  await p.waitForTimeout(1300); await E("masterTasksSync()");
  check('every step on the stage done: she moves on to Active', await E("crmFind('client','kk').pb.stage===pbStages(pbAll()[0])[1].id"));
  check('…and her client stage moves with it (it mirrors Active)', await E("crmFind('client','kk').stage==='active'"));
  check('…and Active’s steps are on the list', (await kt()).some(t => t[0]==='Monthly report'));
  check('a monthly stage: the monthly report is due on the last day of her month', await E("(function(){ const t = state.tasks.items.find(t => t.title==='Monthly report'); const s = pbState('client', crmFind('client','kk')); return t.deadline===s.cyc.end && s.cyc.end==='2026-11-27'; })()"));
  await E("(function(){ const t = state.tasks.items.filter(t => t.master && t.master.id==='kk' && t.status==='done').pop(); undoTask(t.id); masterTasksSync(); })()");
  check('undo the one that moved her on: she’s back on Onboarding with it open', await E("crmFind('client','kk').pb.stage===pbStages(pbAll()[0])[0].id"));
  await E("(function(){ state.tasks.items.filter(t => t.master && t.master.id==='kk' && t.status!=='done' && t.master.stage===pbStages(pbAll()[0])[0].id).forEach(t => { t.status='done'; t.completedAt=todayStr(); }); masterTasksSync(); })()");
  check('done on the list = done on the playbook (and she moves on again)', await E("crmFind('client','kk').pb.stage===pbStages(pbAll()[0])[1].id"));
  // moving by hand ticks off what's left
  await E("pbMoveNext('client', 'kk')"); await p.waitForTimeout(150);
  check('moving her on by hand says what gets ticked off, and ticks it', /ticks off \d+ step/.test(await E("window.__conf.text")) && await E("crmFind('client','kk').pb.stage===pbStages(pbAll()[0])[2].id"));
  check('…the tasks of the stage she left are done', await E("!state.tasks.items.some(t => t.master && t.master.id==='kk' && t.master.stage===pbStages(pbAll()[0])[1].id && t.status!=='done')"));
  await E("pbMoveBack('client', 'kk')"); await p.waitForTimeout(150);
  check('back: the stage before, with what was ticked off open again', await E("crmFind('client','kk').pb.stage===pbStages(pbAll()[0])[1].id && state.tasks.items.some(t => t.title==='Monthly report' && t.status!=='done')"));

  // ---- behind the guide: the one rule ----
  check('a step due earlier this week isn’t “behind” (that’s only a past week with open steps)', await E("(function(){ const c = crmFind('client','kk'); c.pb.enteredAt = '2026-10-24'; return !pbBehind('client', c).behind; })()"));
  await E("(function(){ const c = crmFind('client','kk'); c.pb.stage = pbStages(pbAll()[0])[0].id; c.pb.enteredAt = '2026-10-12'; c.pb.done = {}; c.pb.made = {}; c.touchpoints = [{id:'t', date:'2026-10-28', type:'call'}]; masterTasksSync(); })()");
  check('week 3 of the guide with week 1 still open: behind', await E("pbBehind('client', crmFind('client','kk')).behind"));
  check('…health says so (yellow for a week, red for two or more)', await E("(function(){ const s = clientHealthStatus(crmFind('client','kk')); return s.level==='red' && clientHealthLabel(s)==='Behind the guide'; })()"));
  check('…notifications use the same rule (no “late since” for playbook tasks)', await E("notifList().some(n => /^pbb:client:kk/.test(n.key)) && !notifList().some(n => /^pb:/.test(n.key))"));
  check('…and the sidebar says it the same way', await E("(r55Signals().business || []).some(w => /behind the guide/.test(w)) && !(r55Signals().business || []).some(w => /playbook task/.test(w))"));
  await E("(function(){ const c = crmFind('client','kk'); state.tasks.items.filter(t => t.master && t.master.id==='kk').forEach(t => { t.status = 'done'; t.completedAt = todayStr(); c.pb.done[t.master.key] = todayStr(); }); })()");

  // ---- attachments ----
  await E("(async function(){ const st = pbStages(pbAll()[0])[1].steps[0]; await pb57Attach(pbAll()[0].id+'|'+st.id, [new File(['# SOP\\nDo the thing'], 'Report SOP.md', {type:'text/markdown'})]); })()"); await p.waitForTimeout(300);
  check('a real file on a step (an SOP)', await E("arr(pbStages(pbAll()[0])[1].steps[0].files).length===1 && /^idb:|^data:/.test(pbStages(pbAll()[0])[1].steps[0].files[0].ref)"));
  await E("(function(){ const c = crmFind('client','kk'); pb57Enter('client', c, pbStages(pbAll()[0])[1].id, {quiet:true}); masterTasksSync(); ui.view='focus'; ui.focusTab='tasks'; ui.focusTasksSubTab='backlog'; renderView(); })()"); await p.waitForTimeout(200);
  check('…shown on its task card', await E("(function(){ const t = state.tasks.items.find(t => t.title==='Monthly report' && t.status!=='done'); return /1 attached/.test(taskCard(t)); })()"));
  await E("(function(){ const t = state.tasks.items.find(t => t.title==='Monthly report' && t.status!=='done'); ui.r55Raw = true; openTaskEditModal(t.id); ui.r55Raw = false; })()"); await p.waitForTimeout(200);
  check('…and in the task’s window, where it opens', /Report SOP\.md/.test(await E("document.getElementById('taskEditContent').textContent")) && !!(await p.$('#taskEditContent [data-action="pb57FileOpen"]')));
  await E("document.querySelectorAll('.overlay').forEach(o => o.classList.add('hidden'))");

  // ---- old playbooks and old client cycles come over ----
  check('a day-based playbook becomes one stage: day 1, the last day, every Friday', await E(`(function(){ const o = {id:'old', name:'Old', for:'client', repeats:true, days:30, items:[{id:'i1', title:'Call', type:'call', day:1, repeat:'once'}, {id:'i2', title:'Monthly report', type:'report', day:30, repeat:'once'}, {id:'i3', title:'Weekly report', type:'report', repeat:'week', dow:5}]}; pb57Migrate(o); const s = o.stages[0]; return o.stages.length===1 && s.repeat==='month' && JSON.stringify(s.steps.map(x => x.due))===JSON.stringify([{rule:'day', n:1}, {rule:'end'}, {rule:'week', dow:5}]) && s.steps[0].id==='i1'; })()`));
  check('an old client cycle: each step a stage; the monthly report on the last day (not a week early); days count from entering', await E(`(function(){ crm().cycles = [{id:'cy1', name:'Retainer client', steps:[{id:'s1', label:'Onboarding', checklist:[{id:'a', text:'Onboarding call', type:'meeting', dueDays:0}, {id:'b', text:'Contract signed', type:'doc', dueDays:3}]}, {id:'s2', label:'Ongoing', checklist:[{id:'c', text:'Monthly results report', type:'doc', repeat:'month'}, {id:'d', text:'Weekly check-in', type:'meeting', repeat:'week', dueDow:5}]}]}];
    const o = {id:'oc', name:'Retainer client', for:'client', days:30, items:[{id:'x1', title:'Onboarding call', day:1}, {id:'x2', title:'Contract signed', day:5}, {id:'x3', title:'Monthly results report', day:22}, {id:'x4', title:'Weekly check-in', repeat:'week', dow:5}]};
    pb57Migrate(o); const S = o.stages; crm().cycles = [];
    return S.length===2 && S[1].repeat==='month' && JSON.stringify(S[1].steps.map(x => x.due))===JSON.stringify([{rule:'end'}, {rule:'week', dow:5}]) && JSON.stringify(S[0].steps.map(x => x.due))===JSON.stringify([{rule:'enter'}, {rule:'day', n:4}]) && S[1].steps[0].type==='report'; })()`));

  // ---- leads: their playbook mirrors the Lead Center ----
  await E("(function(){ const P = pbNew('lead', 'Sales', 30, {for:'lead'}); P.stages = crmStages('lead').filter(s => s.kind!=='won' && s.kind!=='lost').map(s => pb57Stage(s.label, {crm:s.id})); P.stages[2].steps.push(pb57Step('Sales call', 'call', {rule:'enter'})); pbAll().push(P); pbSave(); pbMoveTo('lead', 'l1', P.id); })()"); await p.waitForTimeout(150);
  check('a lead put on a lead playbook starts on the stage that mirrors theirs (Contacted)', await E("(function(){ const l = crmFind('lead','l1'); return pb57StageOf(pbById(l.pb.id), l.pb.stage).crm==='contacted'; })()"));
  await E("setStage('lead', 'l1', 'discovery')"); await p.waitForTimeout(100);
  check('moving them in the Lead Center moves them on the playbook', await E("(function(){ const l = crmFind('lead','l1'); return pb57StageOf(pbById(l.pb.id), l.pb.stage).crm==='discovery'; })()"));
  await E("(function(){ const l = crmFind('lead','l1'); pb57Enter('lead', l, pbStages(pbById(l.pb.id))[3].id, {quiet:true}); })()");
  check('…and moving them on the playbook moves them in the Lead Center', await E("crmFind('lead','l1').stage==='proposal'"));
  check('leads still get no playbook tasks of their own', await E("!state.tasks.items.some(t => t.master && t.master.kind==='pb' && t.master.who==='lead' && t.status!=='done')"));
  check('the sales call carries the framing: what they want, how often, then the price', await E("(function(){ const st = pbStages(pbAll().find(x => x.name==='Sales'))[2].steps[0]; pb57SalesFrame(st); return st.checklist.map(c => c.t).join('|').indexOf('Only then name the monthly price') >= 0; })()"));

  // ---- the board and the guide ----
  await E("ui.view='business'; ui.businessTab='lifecycle'; ui.pbView='board'; ui.pbWho='client'; ui.pbSel=pbAll()[0].id; renderView()"); await p.waitForTimeout(200);
  check('Board: the playbook’s stages are the columns (and one for who’s not on it)', (await p.$$('.pb57 .pb6-col')).length===4 && /Not on Client journey/.test(await p.textContent('.pb6-col.is-off')));
  await E("ui.pbView='build'; ui.pb57Cal=true; ui.pb57Stage=pbStages(pbAll()[0])[1].id; renderView()"); await p.waitForTimeout(150);
  check('the calendar is the guide: the ideal month with posting days you pick', (await p.$$('.pb57-cal .pb6-day')).length >= 28 && (await p.$$('.pb57-post button')).length===7);
  await p.click('.pb57-post button'); await p.waitForTimeout(100);
  check('…a posting day marks the guide', (await p.$$('.pb57-cal .pb6-day.is-post')).length >= 4);
  await E("ui.pb57Cal=false; renderView()");

  // ================= task names =================
  await E("masterTasksSync(); state.tasks.items.filter(t => t.master && t.master.kind==='dvw' && t.master.clientId==='jj').forEach(t => { t.status = 'backlog'; }); persist('tasks'); openWindDown('plan')"); await p.waitForTimeout(400);
  await E("renderWindInto()"); await p.waitForTimeout(300);
  const wind = await p.textContent('#windContent');
  check('Plan of Attack: a deliverable task has one name, “JJS Construction · 8 reel · week N”, never stacked', /JJS Construction · 8 reel · week \d/.test(wind) && !/JJS Construction: \d/.test(wind) && !/week 0/.test(wind), wind.slice(0, 300));
  await p.waitForTimeout(600); await E("renderWindInto(); renderView()"); await p.waitForTimeout(300);
  check('…and it doesn’t change after the page draws (no sweep)', (await p.textContent('#windContent'))===wind || !/JJS Construction: \d|week 0|· .* · .* · /.test(await p.textContent('#windContent')));
  check('…drawing never saves the long name onto the task', await E("state.tasks.items.filter(t => t.master && t.master.kind==='dvw').every(t => /^8 reel \\d\\/4$/.test(t.title)) && JSON.parse(localStorage.getItem('opsdash:tasks')).items.filter(t => t.master && t.master.kind==='dvw').every(t => !/JJS/.test(t.title))"));
  await E("document.querySelectorAll('.overlay').forEach(o => o.classList.add('hidden')); ui.wind = null");

  // ================= B. leads =================
  await E(`(function(){ state.business.pipeline.push({id:'l2', name:'Tom', stage:'contacted', createdAt:'2026-10-20'}, {id:'l2', name:'Tina', stage:'contacted', createdAt:'2026-10-20'}); persist('business'); })()`);
  await p.reload(); await p.waitForTimeout(600);
  await E("document.querySelectorAll('.overlay').forEach(o => o.classList.add('hidden')); AI.hasKey = false; uiConfirm = function(o){ window.__conf = o; return Promise.resolve(true); }; masterTasksSync()");
  check('two leads sharing an id are split into two (neither hides the other)', await E("new Set(state.business.pipeline.map(l => l.id)).size===state.business.pipeline.length"));
  const reach = () => E("(function(){ const t = state.tasks.items.find(t => t.master && t.master.kind==='reachLeads' && t.status!=='done'); if(!t) return null; const h = taskCard(t); return {title:(h.match(/task-card-title\">([^<]*)/)||[])[1], names:(h.match(/mt-reach-k\">([^<]*)/)||[])[1]}; })()");
  let rc = await reach();
  check('Reach out to leads (N): N is the people it names', !!rc && Number((rc.title.match(/\((\d+)\)/) || [])[1])===rc.names.split(', ').length, rc);
  await E("logTouch('lead', state.business.pipeline.find(l => l.name==='Tom').id)"); await p.waitForTimeout(100);
  rc = await reach();
  check('reach out to one: they’re off the task right away', !!rc && !/Tom/.test(rc.names) && Number((rc.title.match(/\((\d+)\)/) || [])[1])===rc.names.split(', ').length, rc);
  await E("ui.r54Lc='leads'; ui.view='business'; ui.businessTab='log'; renderView()"); await p.waitForTimeout(200);
  check('…and no “Logged today ✓” mark on them', !/Logged today/.test(await p.textContent('#viewRoot')));

  // ================= C. OP =================
  // (no voice in the test browser: Op writes instead of speaking)
  await E("document.querySelectorAll('.overlay').forEach(o => o.classList.add('hidden')); AI.hasKey = false; OV.pending = false; OV.speaking = false; opVoiceOn = function(){ return false; }");
  const sys = await E("JSON.stringify(aiSystem())");
  check('Op’s prompt: no “not outside work hours”, no “go to sleep”', !/Outside work hours, don’t bring up work/.test(sys) && !/tell him plainly \(kind, firm\) to go to sleep/.test(sys) && !/lead with winding down and sleep/.test(sys));
  check('…instead: he decides, any hour, his asking is the yes, at most one caring line', /His asking is the yes/.test(sys) && /never tell him to go to sleep/.test(sys));
  // sessions
  await E("state.focus.activeSession = {startedAt:Date.now() - 3*3600000, plannedMinutes:null, completedTasks:[], breaks:[], onBreak:false}; state.appActivity.todayIntervals = [{app:'Figma', start:Date.now() - 3*3600000, end:Date.now() - 2*3600000}]; lastRawSampleAt = Date.now(); OPX.userAt = 0; OV.lastEnd = 0; R57.saidAt = 0; checkAwayFromSession()");
  check('an hour with no keyboard or mouse: the session is still on (it ends when you end it)', await E("!!state.focus.activeSession"));
  await E("ui.view='settings'; ui.settingsTab='focus'; renderView()"); await p.waitForTimeout(150);
  check('Settings → Focus: “End a session when I’m away”, off', await E("(function(){ const r = document.querySelector('.r57-away'); return !!r && !r.querySelector('.r45-sw.on'); })()"));
  await E("state.settings.appTracking.awayEnds = true; OPX.userAt = Date.now(); checkAwayFromSession()");
  check('switched on, talking to Op counts as being there', await E("!!state.focus.activeSession"));
  await E("OPX.userAt = 0; lastRawSampleAt = Date.now(); checkAwayFromSession()");
  check('…and away for real, it ends', await E("!state.focus.activeSession"));
  await E("state.settings.appTracking.awayEnds = false");
  // away from the Mac
  await E("actSamples = [{ts:Date.now() - 5000, app:'Finder', idle:900}]; lastRawSampleAt = Date.now(); OPX.userAt = 0; R54.tapAt = 0; R57.held = []; state.focus.r57QuietUntil = 0; R57.quietUntil = 0; opNotify('Quick one for you.')");
  check('away from the Mac (idle 15 min): he doesn’t talk to the empty chair; it waits', await E("R57.held.length===1 && r57Away()"));
  await E("actSamples = [{ts:Date.now(), app:'Finder', idle:2}]; R57.held = []");
  // a debrief after any event
  await E(`(function(){ state.calendar.events.push({id:'ev1', title:'Dentist', date:todayStr(), time:'07:00'}, {id:'ev2', title:'Sales call with Luis', date:todayStr(), time:'07:30', linkedLead:'l1'}); R54.tapAt = 0; OPX.userAt = 0; r57Set('debrief', 'clients'); r54MeetTick(); })()`);
  check('“How did it go?” setting: clients & leads only: the sales call yes, the dentist no', await E("!state.calendar.events.find(e => e.id==='ev1').r54Asked && state.calendar.events.find(e => e.id==='ev2').r54Asked"));
  await E("r54File('Went well, he wants 3 reels a week, asked about price.')");
  check('a sales call: a review task, with the framing before the price', await E("state.tasks.items.some(t => t.master && t.master.kind==='review' && /Review the call/.test(t.title) && /Only then name the monthly price/.test(t.notes))"));
  await E("R54.debrief = null; r57Set('debrief', 'all'); r54MeetTick()");
  check('…every event (the default): he asks about it', await E("state.calendar.events.find(e => e.id==='ev1').r54Asked && R54.debrief && R54.debrief.what==='Dentist'"));
  await E("r54File('All good, cleaning done, back in six months.')");
  check('…what you say goes in your journal', await E("state.journal.entries.some(e => /After Dentist/.test(e.title || '') && /six months/.test(e.text))"));
  // goodnight
  await E("state.focus.opNightSaid = null; opGoodnight()"); await p.waitForTimeout(300);
  const gn = await E("(document.getElementById('opBubText') || {}).textContent || ''");
  check('goodnight: warm, short, “Goodnight, see you then”, no task for tomorrow', /Goodnight, see you then/.test(gn) && !/Tomorrow starts with|first thing/i.test(gn), gn);
  check('…then quiet until the morning', await E("(OPX.userAt = 0, R54.tapAt = 0, AI.busy = false, true) && r57NightQuiet() && (function(){ R57.held = []; opNotify('Hey'); return R57.held.length===0; })()"));
  await E("state.focus.r57QuietUntil = 0");
  // the reply box / the mic
  await E("AI.typedAt = Date.now(); AI.listening = false; AI.busy = false; aiAutoListen('opBubText')"); await p.waitForTimeout(150);
  check('typing: when he asks something, the reply box opens and is ready', await E("!AI.listening && document.activeElement && document.activeElement.id==='opBubInput'"));
  check('hold to talk is the default, and the reply box opens for it too', await E("opTalkMode()==='ptt'"));
  // his own last line, heard back, isn't sent as yours
  await E("AI.typedAt = 0; OP1.inputAt = 0; R54.last = null; R57.lastSaid = 'Done, it’s on your list. Anything else on your mind?'; R57.saidAt = Date.now(); window.__h = AI.history.length; aiAsk('anything else on your mind')");
  check('the double input: his own closing line coming back through the mic is dropped', await E("AI.history.length===window.__h && !AI.busy"));
  // the key: any key
  await E("ui.view='settings'; ui.settingsTab='op'; renderView()"); await p.waitForTimeout(150);
  check('Settings → Op: the key you picked, Change, Hold to talk / Tap', !!(await p.$('.r57-keyrow kbd')) && /Hold to talk/.test(await p.textContent('.r57-keyrow')));
  await E("ACTIONS.r57KeyCapture()"); await p.keyboard.press('F12'); await p.waitForTimeout(100);
  check('…press Change, then any key (F12 here): that’s the key', await E("state.profile.opPttKey")==='F12');
  // holding: nothing ends it
  await E("AI.listening = true; OPX.ptt = true; window.__fired = 0; setTimeout(function(){ window.__fired++; }, 60000)");
  await p.clock.runFor(61000);
  check('while the key is held, the speech engine’s 60-second stop doesn’t end it', await E("window.__fired===0 && typeof R57.srPending==='function'"));
  await E("OPX.ptt = false; AI.listening = false; R57.srPending = null");
  check('the mic opens without macOS voice processing (no system-wide drop)', await E("JSON.stringify(r57MicOpts())")===JSON.stringify({echoCancellation:false, noiseSuppression:false, autoGainControl:false, channelCount:1}));
  check('ducking: on, a level, and what lowers it (his voice and talking to him by default)', /Lower other sound/.test(await p.textContent('#viewRoot')) && !!(await p.$('#r57DuckLevel')) && await E("r57DuckBy('voice') && r57DuckBy('talk') && !r57DuckBy('sounds')"));
  check('after an event: Every event / Clients & leads / Never, in Settings → Op', /After an event, ask how it went/.test(await p.textContent('#viewRoot')));
  // break
  await E("state.modes.active = null; state.focus.activeSession = {startedAt:Date.now() - 1800000, plannedMinutes:null, completedTasks:[], breaks:[], onBreak:false}; opRunTool('take_break', {minutes:10})");
  check('Op’s take_break starts the break right away (no dialog waiting)', await E("state.focus.activeSession.onBreak && state.modes.active && state.modes.active.type==='break' && document.getElementById('multiBreakOverlay').classList.contains('hidden')"));
  await E("endBreakNow ? (state.modes.active = null, state.focus.activeSession = null) : null; opRunTool('take_break', {minutes:5})");
  check('…not locked in, it’s a break too (and it ends by itself)', await E("state.modes.active && state.modes.active.type==='break' && state.modes.active.endsAt > Date.now()"));
  await E("state.modes.active = null");
  // journal tag, notes
  await E("opRunTool('add_journal', {text:'Playbooks now run as stages.', tag:'Update'})");
  check('add_journal takes a tag: “Update” files it under the Update tag (App updates)', await E("(function(){ const e = state.journal.entries.filter(e => e.text==='Playbooks now run as stages.').pop(); return !!e && e.mood===updatesTypeId() && isUpdateEntry(e); })()"));
  await E("document.querySelectorAll('#r57Notes .r57-note').forEach(n => n.remove()); opRunTool('suggest_improvement', {idea:'Let me drag tasks between days on the calendar.'})"); await p.waitForTimeout(400);
  check('an idea Op logs: the white note types out, top right, with the time', !!(await p.$('#r57Notes .r57-note.is-idea')) && /\d:\d\d/.test(await p.textContent('#r57Notes .r57-note time')));
  check('…and it’s in Settings (Op’s notes) and in App updates', await E("arr(state.settings.opIdeas).some(i => /drag tasks between days/.test(i.text)) && state.journal.entries.some(e => isUpdateEntry(e) && /drag tasks between days/.test(e.text))"));
  await E("opRunTool('add_task', {title:'Call the printer'})"); await p.waitForTimeout(1200);
  check('anything Op does for you: the same note, and kept the same way', /printer/i.test(await p.textContent('#r57Notes')) && await E("arr(state.settings.opIdeas).some(i => i.from==='did' && /printer/i.test(i.text)) && state.journal.entries.some(e => isUpdateEntry(e) && /printer/i.test(e.text))"));
  await E("r57Set('clock12', false)"); await E("opRunTool('add_task', {title:'Call the bank'})"); await p.waitForTimeout(1200);
  check('the note’s time can be 24-hour (Settings)', /^\d\d:\d\d$/.test((await p.$$eval('#r57Notes .r57-note time', n => n.map(x => x.textContent))).pop()));
  await E("r57Set('clock12', true)");

  }catch(err){ check('the run reached the end', false, String(err && err.message || err).slice(0, 300)); }
  check('no errors', p.errors.length===0, p.errors);
  await b.close();
  process.exit(report() ? 1 : 0);
})();
