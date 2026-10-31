// Round 56: Playbooks rebuilt (no kinds or defaults, Board + Build, a new-playbook sheet, the calendar sized to the
// screen, the weekly row, the item panel), every playbook item on the task list and in Client backlog, a playbook
// pick when adding someone, the quote's buttons on the author line, the Calendar fitting the screen.
const { instrument, launch, newPage, check, report, OUT } = require('./common.js');
(async () => {
  instrument(process.argv[2], OUT+'/r56.html');
  const b = await launch();
  const at = (d, h, m) => new Date(2026, 9, d, h, m || 0).getTime();
  const seed = {profile:{name:'Andre Lopez'},
    business:{clients:[
      {id:'jj', name:'Jay', business:'JJS', stage:'active', status:'active', mrr:3000, startDate:'2026-01-05', deliverables:[]},
      {id:'kk', name:'Kiko', business:'Kiko', stage:'active', status:'active', mrr:2000, startDate:'2026-10-20', deliverables:[]}],
      pipeline:[{id:'l1', name:'Mia', company:'Mia Spa', stage:'contacted', value:2500, createdAt:'2026-10-26'}]}};
  const p = await newPage(b, OUT+'/r56.html', seed, at(28, 10));
  await p.setViewportSize({width:1440, height:900});
  const E = c => p.evaluate(x => window.__op.ev(x), c);
  await E("document.querySelectorAll('.overlay').forEach(o => o.classList.add('hidden')); AI.hasKey = false; uiConfirm = function(o){ window.__conf = o; return Promise.resolve(true); }");
  await E("masterTasksSync(); ui.view='business'; ui.businessTab='lifecycle'; renderView()"); await p.waitForTimeout(250);

  // ---- no starting set, no defaults ----
  check('no playbooks you didn’t make, and nobody put on one', await E("pbAll().length===0 && !state.business.clients.some(c => c.pb)"));
  check('empty: one clear way to make one', !!(await p.$('.pb6-empty [data-action="pb6NewOpen"]')));

  // ---- a new playbook: name, for, its stages, what happens after the last stage ----
  // (round 57: a playbook is a pipeline of stages you move people through, so it has no length of its own; each
  // stage says roughly how long it takes, and a stage can run every month. These checks follow that.)
  await p.click('.pb6-bar [data-action="pb6NewOpen"]'); await p.waitForTimeout(200);
  check('the new-playbook sheet asks the name, who it’s for, its stages, and what happens when it ends', !!(await p.$('#pb6NewName')) && (await p.$$('#pb6NewSheet [data-action="pb6NewSet"][data-id^="for:"]')).length===2 && (await p.$$('#pb6NewSheet [data-action="pb6NewSet"][data-id^="mirror:"]')).length===2 && !!(await p.$('#pb6NewEnds')));
  await p.fill('#pb6NewName', 'Retainer'); await p.click('[data-id="mirror:0"]'); await p.waitForTimeout(100); await p.fill('#pb6NewName', 'Retainer'); await p.selectOption('#pb6NewEnds', 'again');
  await p.click('[data-action="pb6Create"]'); await p.waitForTimeout(250);
  await E("pbStages(pbAll()[0])[0].repeat = 'month'; pbStages(pbAll()[0])[0].name = 'Monthly service'; pbSave()");
  check('…made: for clients, starts again, its stage runs every month', await E("JSON.stringify(pbAll().map(x => [x.name, pbFor(x), pbRepeats(x), !!x.isDefault, pbStages(x)[0].repeat]))")===JSON.stringify([['Retainer', 'client', true, false, 'month']]));
  await E("ACTIONS.pb6NewOpen()"); await p.waitForTimeout(150); await p.fill('#pb6NewName', 'Onboarding'); await p.click('[data-id="mirror:0"]'); await p.waitForTimeout(100); await p.fill('#pb6NewName', 'Onboarding'); await p.selectOption('#pb6NewEnds', pbId = await E("pbAll()[0].id")); await p.click('[data-action="pb6Create"]'); await p.waitForTimeout(250);
  await E("pbStages(pbAll()[1])[0].days = 30; pbSave()");
  check('…another that moves them on to Retainer when it ends', await E("pbAll()[1].next===pbAll()[0].id && !pbRepeats(pbAll()[1])"));
  await E("ACTIONS.pb6NewOpen()"); await p.waitForTimeout(150); await p.click('[data-id="for:lead"]'); await p.waitForTimeout(100); await p.fill('#pb6NewName', 'New lead'); await p.click('[data-action="pb6Create"]'); await p.waitForTimeout(250);
  check('…and one for leads (its stages are the Lead Center’s)', await E("pbFor(pbAll()[2])==='lead' && pbStages(pbAll()[2]).every(s => !!s.crm)"));

  // ---- Build ----
  await E("ui.pbView='build'; ui.pbWho='client'; ui.pbSel=pbAll()[1].id; ui.pb57Stage=null; ui.pbItem=null; renderView()"); await p.waitForTimeout(200);
  check('Build: no Lead / Onboarding / Monthly service switch, no ★, no “new clients start here”', !(await p.$('[data-action="pbKind"]')) && !(await p.$('.pbx-star')) && !/start here/i.test(await p.textContent('#viewRoot')));
  check('a stage’s length is set on the stage (no fixed day count on the playbook)', !(await p.$('select[data-pb-f="days"]')) && !!(await p.$('[data-action="pb57StageEdit"]')));
  check('no legend line', !(await p.$('.pbx-legend')) && !/Day 1 is/.test(await p.textContent('#viewRoot')));
  check('its steps as a list; no separate weekly row', !!(await p.$('.pb57-list')) && !(await p.$('.pb6-wd')));
  await E("ACTIONS.pbAdd(null, null, '1')"); await p.waitForTimeout(150);
  await p.fill('.pb6-item .pb6-it', 'Onboarding call'); await p.press('.pb6-item .pb6-it', 'Tab'); await p.waitForTimeout(100);
  await E("ACTIONS.pbItemType(null, null, 'call')"); await p.waitForTimeout(100);
  check('+ Step: the panel opens on the right (name it, give it a type)', await E("JSON.stringify(pbStages(pbAll()[1])[0].steps.map(i => [i.title, i.type, i.due.rule]))")===JSON.stringify([['Onboarding call', 'call', 'enter']]));
  const box = await p.$eval('.pb6-item', n => { const r = n.getBoundingClientRect(); return {b:Math.round(r.bottom), r:Math.round(r.right), pos:getComputedStyle(n).position}; });
  check('the step panel sits beside the steps, clear of the Op light and the + (not a fixed drawer)', box.pos==='sticky' && box.b < 900 - 90, box);
  await E("ACTIONS.pbItemClose(); ACTIONS.pbAdd(null, null, '10')"); await p.waitForTimeout(150); await p.fill('.pb6-item .pb6-it', 'Strategy doc'); await p.press('.pb6-item .pb6-it', 'Tab'); await E("ACTIONS.pbItemClose()"); await p.waitForTimeout(150);
  await E("ACTIONS.pb6AddWeek(null, null, '5')"); await p.waitForTimeout(150); await p.fill('.pb6-item .pb6-it', 'Weekly check-in'); await p.press('.pb6-item .pb6-it', 'Tab'); await E("ACTIONS.pbItemClose()"); await p.waitForTimeout(150);
  check('a step can be every week on a weekday', await E("JSON.stringify(pbStages(pbAll()[1])[0].steps.filter(i => i.due.rule==='week').map(i => [i.title, i.due.dow]))")===JSON.stringify([['Weekly check-in', 5]]));
  await E("ui.pb57Cal = true; renderView()"); await p.waitForTimeout(150);
  await p.dragAndDrop('.pb6-day[data-pb57-day="10"] .pb6-chip', '.pb6-day[data-pb57-day="12"]'); await p.waitForTimeout(250);
  check('on the guide calendar, drag a step to another day', JSON.stringify(await E("pbStages(pbAll()[1])[0].steps.find(x => x.title==='Strategy doc').due"))===JSON.stringify({rule:'day', n:12}));
  await E("ui.pb57Cal = false; renderView()"); await p.waitForTimeout(100);
  check('the right side shows who’s on it (nobody) and how to put someone on', /On it/.test(await p.textContent('.pb6-side')) && !!(await p.$('.pb6-side select[data-pb6-addp]')));
  await p.selectOption('.pb6-side select[data-pb6-addp]', 'kk'); await p.waitForTimeout(250);
  check('put a client on it from there', await E("crmFind('client', 'kk').pb && crmFind('client', 'kk').pb.id===pbAll()[1].id"));

  // ---- the tasks ----
  const tasks = JSON.parse(await E("JSON.stringify(state.tasks.items.filter(t => t.master && t.master.kind==='pb' && t.master.id==='kk').map(t => [t.title, t.status, t.deadline]))"));
  check('every step on it is a task (day 1 = her start, Oct 20): what’s due or late on today, later ones in the backlog with their date', tasks.some(t => /Onboarding call/.test(t[0]) && t[1]==='today') && tasks.some(t => t[0]==='Strategy doc' && t[1]==='backlog' && t[2]==='2026-10-31') && tasks.some(t => t[0]==='Weekly check-in'), tasks);
  await E("ui.view='focus'; ui.focusTab='tasks'; ui.focusTasksSubTab='overview'; renderView()"); await p.waitForTimeout(250);
  check('…on Focus → Tasks', /Onboarding call/.test(await p.textContent('#viewRoot')));
  await E("ui.focusTasksSubTab='clientBacklog'; renderView()"); await p.waitForTimeout(250);
  const cbl = await p.textContent('#viewRoot');
  check('…and in Client backlog, under the client, with Today and Done', /Kiko/.test(cbl) && /Strategy doc/.test(cbl) && /Onboarding call/.test(cbl) && (await p.$$('.pb6-cw [data-action="pb6Done"]')).length >= 3);
  await p.click('.pb6-cw [data-action="pb6Today"]:not(.is-on)'); await p.waitForTimeout(150);
  check('→ Today from there puts it on today', await E("state.tasks.items.filter(t => t.master && t.master.kind==='pb' && t.master.id==='kk' && t.status==='today').length") >= 2);

  // ---- Board ----
  await E("ui.view='business'; ui.businessTab='lifecycle'; ui.pbView='board'; ui.pbWho='client'; ui.pbSel=pbAll()[1].id; renderView()"); await p.waitForTimeout(250);
  check('Board: a column for each stage of the playbook, and one for those not on it', (await p.$$('.pb6-col')).length===2 && /Not on Onboarding/.test(await p.textContent('.pb6-col.is-off')));
  check('the cards say the day and what’s next', /Day 9/.test(await p.textContent('.pb6-board')) && /Onboarding call/.test(await p.textContent('.pb6-board')));
  await E("ui.pbSel=pbAll()[0].id; renderView()"); await p.waitForTimeout(200);
  await p.dragAndDrop('.pb6-col.is-off .pb6-card[data-pb6-drag="client:jj"]', '.pb6-col[data-pb6-col^="'+(await E("pbAll()[0].id"))+'"]'); await p.waitForTimeout(300);
  check('drag a client onto a playbook: they’re on it (day 1 their start date, for a stage that runs every month)', await E("crmFind('client', 'jj').pb.id===pbAll()[0].id && crmFind('client', 'jj').pb.start==='2026-01-05'"));
  await p.dragAndDrop('.pb6-card[data-pb6-drag="client:kk"]', '.pb6-col[data-pb6-col^="'+(await E("pbAll()[0].id"))+'"]'); await p.waitForTimeout(300);
  check('drag them from one to another: it says first what gets checked off', /checks off \d+ open thing/.test(await E("window.__conf.text")) && await E("crmFind('client', 'kk').pb.id===pbAll()[0].id"));
  check('…and the old one’s open tasks are done', await E("!state.tasks.items.some(t => t.master && t.master.kind==='pb' && t.master.id==='kk' && t.master.pb===pbAll()[1].id && t.status!=='done')"));
  await p.dragAndDrop('.pb6-card[data-pb6-drag="client:kk"]', '.pb6-col.is-off'); await p.waitForTimeout(300);
  check('drag onto “Not on …”: off it', await E("!crmFind('client', 'kk').pb.id") && /Take Kiko off/.test(await E("window.__conf.title")));
  await E("ACTIONS.pb6Who(null, null, 'lead')"); await p.waitForTimeout(200);
  check('Leads: their own playbook, its stages the Lead Center’s', (await p.$$('.pb6-col')).length===1 + await E("pbStages(pbAll()[2]).length") && /Mia/.test(await p.textContent('.pb6-board')));

  // ---- adding someone ----
  await E("openNewContactModal('client')"); await p.waitForTimeout(200);
  check('adding a client: pick their playbook (and no old “Client cycle”)', !!(await p.$('#ncPlaybook')) && !/Client cycle/.test(await p.textContent('#newContactOverlay')));
  await p.fill('#ncName', 'Nina'); await p.fill('#ncCompany', 'Nina Roofing'); await p.selectOption('#ncPlaybook', await E("pbAll()[1].id"));
  await E("ACTIONS.saveNewContact()"); await p.waitForTimeout(300);
  check('…they start it', await E("(function(){ const c = state.business.clients.find(x => x.business==='Nina Roofing'); return !!c && c.pb && c.pb.id===pbAll()[1].id && c.pb.start===todayStr(); })()"));
  await E("document.querySelectorAll('.overlay').forEach(o => o.classList.add('hidden'))");

  // ---- their window ----
  await E("openClientModal('kk'); ui.clientSec='cycle'; renderClientModalInto()"); await p.waitForTimeout(200);
  check('in their window, not on one: put them on one', !!(await p.$('#clientModalOverlay select[data-pb6-put]')) && !/Start Onboarding/.test(await p.textContent('#clientModalOverlay')));
  await p.selectOption('#clientModalOverlay select[data-pb6-put]', await E("pbAll()[1].id")); await p.waitForTimeout(300);
  check('…picked: on it', await E("crmFind('client', 'kk').pb.id===pbAll()[1].id"));
  await E("document.querySelectorAll('.overlay').forEach(o => o.classList.add('hidden'))");

  // ---- what the review found ----
  await E("(function(){ const P = pbNew('client', 'Empty one', 30); pbAll().push(P); pbSave(); window.__empty = P.id; })(); state.business.clients.push({id:'em', name:'Em', business:'Em Co', stage:'active', status:'active', mrr:500, startDate:todayStr(), deliverables:[]}); pbMoveTo('client', 'em', window.__empty)"); await p.waitForTimeout(200); await E("masterTasksSync(); masterTasksSync()");
  check('review: someone on an empty playbook isn’t “finished” or moved on', await E("crmFind('client', 'em').pb.id===window.__empty && !crmFind('client', 'em').pb.finished"));
  await E("pbStages(pbById(window.__empty))[0].steps.push(pb57Step('First thing', 'task', {rule:'enter'})); pbSave()");
  check('…and once it has steps, they show up as tasks', await E("state.tasks.items.some(t => t.master && t.master.kind==='pb' && t.master.id==='em' && t.title==='First thing')"));
  await E("pbMoveTo('client', 'em', null)"); await p.waitForTimeout(200);
  check('review: taking someone off removes their open tasks (not marked done)', await E("!state.tasks.items.some(t => t.master && t.master.kind==='pb' && t.master.id==='em') && !state.tasks.items.some(t => t.title==='First thing' && t.status==='done')"));
  check('review: undoing an old playbook task after they’re off doesn’t throw', await E("(function(){ state.tasks.items.push({id:'ux', title:'Old one', status:'done', completedAt:todayStr(), master:{kind:'pb', k:'client:em:x', who:'client', id:'em', key:'x', pb:window.__empty, type:'task'}}); try{ undoTask('ux'); return true; }catch(e){ return String(e); } })()")===true);
  await E("state.business.clients.push({id:'tw', name:'Twin', business:'JJS', stage:'active', status:'active', mrr:500, startDate:todayStr(), deliverables:[]}); pbMoveTo('client', 'tw', pbAll()[1].id)"); await p.waitForTimeout(200);
  const cblTw = await E("(function(){ const t = document.createElement('template'); t.innerHTML = clientBacklogHtml(); return JSON.stringify([...t.content.querySelectorAll('.cbl-client')].map(b => [b.getAttribute('data-cid'), !!b.querySelector('.pb6-cbl')])); })()");
  check('review: two clients with the same name each get their own playbook block', /\["tw",true\]/.test(cblTw), cblTw);
  await E("(function(){ const S = pbNew('lead', 'Stage one', 14); S.stage = 'contacted'; pbAll().push(S); pbSave(); window.__stage = S.id; })(); openNewContactModal('lead')"); await p.waitForTimeout(200);
  await p.fill('#ncName', 'Lee'); await p.selectOption('#ncStage', 'contacted').catch(() => {}); await p.selectOption('#ncPlaybook', await E("pbAll()[2].id"));
  await E("ACTIONS.saveNewContact()"); await p.waitForTimeout(300);
  check('review: a new lead with a pick goes straight on it (no stray stage playbook first)', await E("(function(){ const l = state.business.pipeline.find(x => x.name==='Lee'); return !!l && l.pb.id===pbAll()[2].id && !arr(l.pb.hist).some(h => h.id!==pbAll()[2].id); })()"));
  await E("document.querySelectorAll('.overlay').forEach(o => o.classList.add('hidden'))");
  await E("pbMoveTo('client', 'tw', window.__stage2 = pbAll()[0].id)"); await p.waitForTimeout(150);
  await E("ACTIONS.pbDelete(null, null, pbAll()[1].id)"); await p.waitForTimeout(250);
  check('review: deleting a playbook takes it out of everyone’s history (no dead Back button)', await E("!state.business.clients.some(c => c.pb && arr(c.pb.hist).some(h => !pbById(h.id)))") && !/Back to the last one/.test(await E("pbPersonHtml('client', crmFind('client', 'tw'))")));
  check('review: a repeating playbook that isn’t a month says “runs”, not months', await E("(function(){ const P = pbNew('client', 'Fortnight', 14, {repeats:true}); return pbByMonth(P)===false && pbByMonth(pbNew('client', 'M', 30, {repeats:true}))===true; })()"));

  // ---- old playbooks lose their kind and ★ ----
  check('old ones: no ★, what they are for and what happens when they end kept', await E("(function(){ const o = {id:'old1', name:'Old', kind:'monthly', isDefault:true, days:30, items:[]}; pbKindSync(o); return o.for==='client' && o.repeats===true && o.isDefault===false; })()"));


  // ---- round 56, second batch ----
  await E("state.focus.activeSession = {startedAt:Date.now() - 3600000, plannedMinutes:null, completedTasks:[], breaks:[], onBreak:false, autoStarted:true}; persist('focus')");
  check('Op says nothing on his own during an automatic lock-in', await E("(OPX.userAt = 0, R54.tapAt = 0, AI.busy = false, AI.listening = false, AI.transcribing = false, true) && r54May('auto')===false && r54May('sessionEnd')===false"));
  await E("autoEndFocusSession(Date.now()); endSessionForAway(Date.now(), Date.now(), 'offwork', 'Safari')");
  check('going quiet doesn’t end a session (automatic or not): it stays until you stop it', await E("!!state.focus.activeSession"));
  check('…it asks once, with Stop right there', await E("!!state.focus.activeSession.r56Asked"));
  check('an automatic lock-in plays no music or intro (AirPods stay put) unless you turn it on', await E("(function(){ let played = false; const was = FM.playing; focusMusicAfterIntro(0); return soundPref('autoLockMusic', false)===false; })()") && /autoLockMusic/.test(await E("typeof soundSettingsHtml==='function' ? soundSettingsHtml() : (renderSettings ? (ui.settingsTab='look', renderSettings()) : '')")));
  await E("state.focus.activeSession = null; state.modes.active = {type:'offtime', clockedOut:true, startedAt:Date.now()}; persist('modes')");
  await E("opRunTool('lock_in', {})"); await p.waitForTimeout(200);
  check('Op locks you in when you ask, even clocked out / after hours', await E("!!state.focus.activeSession"));
  await E("state.focus.activeSession = null; persist('focus')");
  await E("(function(){ const c = state.business.clients[0]; c.deliverables = [{id:'dv1', title:'Reels', recurring:true, weeklyTarget:2}]; persist('business'); masterTasksSync(); const t = state.tasks.items.find(x => x.master && x.master.kind==='dvw' && x.master.clientId===c.id && x.status!=='done'); if(t) t.title = 'JJS: 2 JJS: 1 8 reel, week 0, week 2'; masterTasksSync(); window.__dvt = t && t.id; })()");
  check('a deliverable task with a garbled name gets its real name back', await E("(function(){ const t = state.tasks.items.find(x => x.id===window.__dvt); return !!t && !/week 0/.test(t.title) && /Reels/.test(t.title); })()"));
  check('Op can’t rename the tasks made from a client’s plan', await E("(function(){ const t = state.tasks.items.find(x => x.id===window.__dvt); const was = t.title; try{ opRunTool('update_task', {task:t.title, title:'Something else'}); }catch(e){} return t.title===was; })()"));
  check('the streak’s Edit (to add a day you forgot) is always visible', await E("(function(){ ui.view='today'; renderView(); const b = document.querySelector('.sw-edit, .streak-edit-btn'); return !!b && Number(getComputedStyle(b).opacity) > 0.5; })()"));
  check('hold buttons say “Hold to …”', await E("(function(){ const d = document.createElement('div'); d.innerHTML = '<button data-action=\"saveIntent\">Start the week →</button>'; document.body.appendChild(d); r55HoldPrep(d); const t = d.textContent; d.remove(); return /Hold to start the week/.test(t); })()"));
  // leads: no tasks, one reach-out task, notifications, a calendar in the Log center
  await E("(function(){ const L = pbAll().find(x => pbFor(x)==='lead') || (function(){ const n = pbNew('lead', 'Lead flow', 14); pbAll().push(n); return n; })(); (pbStages(L).find(s => s.crm==='contacted') || pbStages(L)[0]).steps.push(pb57Step('Discovery call', 'call', {rule:'enter'})); /* (round 57: steps live on a stage) */ pbSave(); pbMoveTo('lead', 'l1', L.id); })()"); await p.waitForTimeout(200); await E("masterTasksSync()");
  check('leads get no playbook tasks of their own', await E("!state.tasks.items.some(t => t.master && t.master.kind==='pb' && t.master.who==='lead' && t.status!=='done')"));
  check('…what’s due folds into the one “Reach out to leads” task', await E("state.tasks.items.some(t => t.master && t.master.kind==='reachLeads' && t.status!=='done' && arr(t.leads).indexOf('l1') >= 0)"));
  check('…and a notification', await E("notifList().some(n => /^pbl:l1/.test(n.key))"));
  await E("logTouch('lead', 'l1', 'call', todayStr(), 'talked')"); await p.waitForTimeout(100);
  check('logging a touch ticks off what was due on their playbook', await E("pbState('lead', crmFind('lead', 'l1')).open.every(o => o.date > todayStr())"));
  await E("ui.view='business'; ui.businessTab='log'; ui.r54Lc='leads'; ui.r56LeadCal=true; renderView()"); await p.waitForTimeout(250);
  check('Log center → Leads has a Calendar view of the month', (await p.$$('.r56-lc-d:not(.is-empty)')).length >= 28 && !!(await p.$('.r56-lv')));
  // a stage's usual length can be changed (its guide follows)
  await E("ui.view='business'; ui.businessTab='lifecycle'; ui.pbView='build'; ui.pbWho='client'; ui.pbSel=pbAll()[0].id; ui.pb57Stage=null; ui.pbItem=null; ui.pb57StageEdit=true; renderView()"); await p.waitForTimeout(200);
  await E("pbStages(pbAll()[0])[0].repeat = null; pbSave(); renderView()"); await p.waitForTimeout(150);
  await p.fill('[data-pb57-sf="days"]', '14'); await p.press('[data-pb57-sf="days"]', 'Tab'); await p.waitForTimeout(200);
  await E("ui.pb57StageEdit=false; ui.pb57Cal=true; renderView()"); await p.waitForTimeout(150);
  check('change how long a stage usually takes', await E("pbStages(pbAll()[0])[0].days")===14 && (await p.$$('.pb6-day')).length===14);

  // ---- the guide fits the screen ----
  for(const [w, h] of [[3440, 1440], [1920, 1080]]){
    await p.setViewportSize({width:w, height:h}); await E("ui.view='business'; ui.businessTab='lifecycle'; ui.pbView='build'; ui.pbSel=pbAll()[0].id; ui.pbItem=null; ui.pb57Cal=true; pbStages(pbAll()[0])[0].repeat='month'; renderView()"); await p.waitForTimeout(300);
    const f = await E("JSON.stringify((function(){ const c = document.querySelector('.pb6-cal').getBoundingClientRect(), d = document.querySelector('.pb6-day').getBoundingClientRect(); return {bottom:Math.round(c.bottom), w:Math.round(d.width), h:Math.round(d.height)}; })())");
    const F = JSON.parse(f);
    check('playbook calendar at '+w+'×'+h+': all of it on screen, days not squashed flat', F.bottom <= h && F.w/F.h < 1.6, f);
  }
  // ---- the Calendar fits the screen ----
  for(const [w, h] of [[3440, 1440], [2560, 1440], [1920, 1080], [1440, 900]]){
    await p.setViewportSize({width:w, height:h}); await E("ui.view='calendar'; renderView()"); await p.waitForTimeout(350);
    const f = JSON.parse(await E("JSON.stringify((function(){ const m = document.querySelector('main'), c = document.querySelector('.calx .cx-month').getBoundingClientRect(); return {scroll:m.scrollHeight - m.clientHeight, bottom:Math.round(c.bottom)}; })())"));
    check('Calendar at '+w+'×'+h+': nothing below the screen', f.scroll <= 2 && f.bottom <= h, f);
  }
  await p.setViewportSize({width:1440, height:900});

  // ---- the quote ----
  const q = await E("quoteHtml(quoteFor('work'), 'is-work', 'work')");
  check('the quote’s ↻ ✎ 📌 sit on the author line', /<figcaption[\s\S]*r55-qt[\s\S]*<\/figcaption>/.test(q));
  await E("ui.view='today'; renderView()");
  check('no errors', p.errors.length===0, p.errors);
  await b.close();
  process.exit(report() ? 1 : 0);
})().catch((e) => { console.error(e); process.exit(1); });
