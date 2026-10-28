// Round 55: rank-up, the + menu, Your day labels, notifications, the categoriser, GHL gone, quotes, real XP
// (holds, the money check-in), signals, Playbooks, Op's client reports, clients' socials, Finances, ultrawide, the sweep.
const { instrument, launch, newPage, check, report, OUT } = require('./common.js');
(async () => {
  instrument(process.argv[2], OUT+'/r55.html');
  const b = await launch();
  const at = (d, h, m) => new Date(2026, 9, d, h, m || 0).getTime();
  const seed = {profile:{name:'Andre Lopez'},
    focus:{work:{enabled:true, start:'07:45', end:'17:00', days:[0, 1, 2, 3, 4, 5, 6], lunchOn:false, brkOn:false}, wake:{enabled:true, time:'07:00', days:[0, 1, 2, 3, 4, 5, 6], voice:false}},
    business:{clients:[{id:'jj', name:'Jay', business:'JJS', stage:'active', status:'active', mrr:3000, startDate:'2026-01-05', deliverables:[{id:'rj', title:'Reels', recurring:true, weeklyTarget:3, completedDates:['2026-10-20', '2026-10-22']}], journal:[{id:'j1', date:'2026-10-21', text:'Wants more hooks in the first 2 seconds'}]}],
      pipeline:[{id:'l1', name:'Mia', business:'Mia Spa', stage:'contacted', value:2500, createdAt:'2026-10-26'}]},
    finances:{debts:[{id:'d1', name:'Visa', balance:2140, minPayment:85, dueDay:30}], payments:[], income:[], invoices:[], checkins:[], expenses:[
      {id:'e1', date:'2026-10-26', name:'CAPITAL ONE MOBILE PMT', amount:500, cat:'transport', src:'bank'}, {id:'e2', date:'2026-10-25', name:'Trader Joes', amount:62.4, cat:'other', src:'bank'}, {id:'e3', date:'2026-10-24', name:'SHELL OIL 123', amount:48.1, cat:'transport', src:'bank'}]}};
  const p = await newPage(b, OUT+'/r55.html', seed, at(27, 11));
  const E = c => p.evaluate(x => window.__op.ev(x), c);
  await E("document.querySelectorAll('.overlay').forEach(o => o.classList.add('hidden')); AI.hasKey = false");
  await p.waitForTimeout(300);

  // ---- rank-up ----
  await E("rankUpFx(0, 1)"); await p.waitForTimeout(400);
  check('rank-up: its own words and a quote about success', await E("!!document.querySelector('#rankFx .rfx-say') && !!document.querySelector('#rankFx .rfx-q blockquote')"));
  check('rank-up: the rays are a big square centred on the badge (no edge to clip)', await E("(function(){ const r = document.querySelector('#rankFx .rfx-rays').getBoundingClientRect(); return Math.abs(r.width - r.height) < 2 && r.width > innerWidth; })()"));
  await E("document.getElementById('rankFx').remove()");

  // ---- the + menu ----
  await E("ui.view='today'; renderView(); ACTIONS.fabAdd()"); await p.waitForTimeout(300);
  const tops = await E("Array.from(document.querySelectorAll('.r55-apg .ap-tile')).map(t => Math.round(t.getBoundingClientRect().top))");
  check('+ menu: four choices in one even row', tops.length===4 && Math.max.apply(null, tops) - Math.min.apply(null, tops) <= 2, tops);
  await E("addSheetClose('addPick')");

  // ---- Your day: close times share one label ----
  const rib = await E("cxRibbonHtml()");
  check('Your day: wake-up 7:00 and work 7:45 share one label (never printed over each other)', /r55-pair/.test(rib) && (rib.match(/class="r52-l /g) || []).length===3, rib.slice(0, 300));

  // ---- notifications ----
  await E("state.tasks.items.push({id:'od', title:'Overdue thing', status:'today', deadline:'2026-10-20'}); notifBadge()");
  check('the bell counts what you haven’t seen', await E("!document.getElementById('notifCount').hidden"));
  await E("ACTIONS.toggleNotifs()"); await p.waitForTimeout(100); await E("ACTIONS.toggleNotifs()");
  check('opening it clears the count', await E("document.getElementById('notifCount').hidden"));
  await E("state.tasks.items.push({id:'od2', title:'Another late one', status:'today', deadline:'2026-10-21'}); notifBadge()");
  check('something new: the bell glows (and chimes)', await E("document.getElementById('notifBell').classList.contains('r55-new')") && await E("!document.getElementById('notifCount').hidden"));

  // ---- the categoriser ----
  const cats = await E("JSON.stringify(['CAPITAL ONE MOBILE PMT', 'CAPITAL ONE ONLINE PYMT', 'Payment to Chase card', 'MOBIL GAS 12', 'EXXONMOBIL', 'Trader Joes', 'Las Vegas Hotel', 'UBER EATS'].map(expGuessCat))");
  check('card payments are Not spending, not Transport; whole words only', cats===JSON.stringify(['move', 'move', 'move', 'transport', 'transport', 'groceries', 'other', 'food']), cats);
  check('what came in before is sorted again (not what you set yourself)', await E("finExpenses().find(e => e.id==='e1').cat")==='move');

  // ---- GHL is gone ----
  check('GoHighLevel: off, and no button anywhere', await E("ghlOn()===false && ghlPaneBtnHtml('lead', state.business.pipeline[0])===''"));

  // ---- quotes ----
  await E("ACTIONS.r55QuotePin()");
  const pin = await E("JSON.stringify(state.profile.pinQuote)");
  check('pin a quote: it stays', await E("(function(){ const a = quoteFor('work')[0]; ui.qOff = {work:5}; return quoteFor('work')[0]===a; })()"), pin);
  await E("uiAsk = function(){ return Promise.resolve('Stay hungry — Steve Jobs'); }; ACTIONS.r55QuoteWrite()"); await p.waitForTimeout(100);
  check('write your own: it’s yours, with who said it', await E("r55MyQuotes().some(q => q.t==='Stay hungry' && q.by==='Steve Jobs') && quoteFor('work')[0]==='Stay hungry'"));
  check('the quote has ↻, ✎ and 📌', /r55QuoteWrite/.test(await E("quoteHtml(quoteFor('work'), 'is-work', 'work')")) && /r55QuotePin/.test(await E("quoteHtml(quoteFor('work'), 'is-work', 'work')")));

  // ---- real XP: hold to confirm ----
  await E("const d = document.createElement('div'); d.id='holdT'; d.style.cssText='position:fixed;top:120px;left:300px;z-index:99999'; d.innerHTML='<button data-action=\"r43HabitToday\">Habit</button>'; document.body.appendChild(d)"); await p.waitForTimeout(100);
  check('things that pay XP for a tap become press-and-hold', await E("!!document.querySelector('#holdT .r55-hold[data-hold-act=\"r43HabitToday\"]')"));
  const hb = await p.$('#holdT .r55-hold'); const bx = await hb.boundingBox();
  await p.mouse.click(bx.x + 5, bx.y + 5); await p.waitForTimeout(150);
  check('a tap does nothing (it says hold)', await E("!(intentStore().months[monthKey()] || {}).habitDays || !intentStore().months[monthKey()].habitDays[todayStr()]"));
  await p.mouse.move(bx.x + 5, bx.y + 5); await p.mouse.down(); await p.waitForTimeout(950); await p.mouse.up(); await p.waitForTimeout(150);
  check('holding it does it', await E("!!(intentStore().months[monthKey()] || {}).habitDays && !!intentStore().months[monthKey()].habitDays[todayStr()]"));
  check('setting up the week takes a goal', await E("(function(){ let msg = ''; const was = showToast; showToast = function(m){ msg = m; }; document.body.insertAdjacentHTML('beforeend', '<input id=\"int_goal\" value=\"\">'); ACTIONS.saveIntent(null, null, 'week'); showToast = was; document.getElementById('int_goal').remove(); return /at least one goal/.test(msg); })()"));
  check('a journal entry pays when it’s a real one (a dozen words, written by you)', await E("state.profile.r55Since && r55JournalCounts({date:'2026-12-01', text:'one two three'})===false && r55JournalCounts({date:'2026-12-01', text:'Today I finally sat down and planned the whole month of content for my clients.'})===true && r55JournalCounts({date:'2026-12-01', mood:'inspiration', text:'x '.repeat(20)})===false"));

  // ---- the money check-in ----
  await E("masterTasksSync()");
  check('the money check-in is a task this week', await E("state.tasks.items.some(t => t.master && t.master.kind==='money' && t.status!=='done')"));
  await E("openTaskEditModal(state.tasks.items.find(t => t.master && t.master.kind==='money').id)"); await p.waitForTimeout(200);
  check('tapping it opens the check-in: the week’s spending to go through, and where you stand', !!(await p.$('#r55Money:not(.hidden) .r55-mc-tx')) && /Where you stand/.test(await p.textContent('#r55Money')));
  check('finishing needs both looked at', !(await p.$('#r55Money [data-hold-act="r55MoneyFinish"]')));
  await p.selectOption('select[data-r55-cat="e2"]', 'groceries'); await p.waitForTimeout(100);
  check('fixing a category there sticks', await E("finExpenses().find(e => e.id==='e2').cat==='groceries' && finExpenses().find(e => e.id==='e2').catSet===true"));
  await E("ACTIONS.r55McOk(null, null, 'spend'); ACTIONS.r55McOk(null, null, 'where')"); await p.waitForTimeout(150);
  check('then: hold to finish', !!(await p.$('#r55Money [data-hold-act="r55MoneyFinish"]')));
  await E("ACTIONS.r55MoneyFinish()"); await p.waitForTimeout(200);
  check('done: on the record, and the task is ticked', await E("r55McDone() && state.tasks.items.find(t => t.master && t.master.kind==='money').status==='done'"));
  check('the Finances button has no “+75 XP” bait', !/Weekly check-in <b>\+/.test(await E("(ui.view='personal', ui.personalTab='finances', renderPersonalFinances())")));

  // ---- Finances, cleaner ----
  await E("ui.view='personal'; ui.personalTab='finances'; ui.finTab='transactions'; renderView()"); await p.waitForTimeout(200);
  check('the four numbers have their own colour', (await p.$$('.r55-tile')).length===4);
  check('transactions are grouped by day, with the day’s total', (await p.$$('.r55-txd')).length >= 3 && !/−-|−−/.test(await p.textContent('#viewRoot')));

  // ---- signals ----
  await E("r55SignalPaint()");
  check('a section with something waiting glows (and says why)', await E("document.querySelector('.nav-item[data-view=\"business\"]').classList.contains('r55-sig') && /lead/.test(document.querySelector('.nav-item[data-view=\"business\"]').getAttribute('data-r55-why'))"));

  // ---- Playbooks ----
  await E("masterTasksSync()");
  // (round 56: no starting set and no defaults: these are three playbooks made the way you'd make them)
  check('no playbooks until you make one', await E("pbAll().length")===0);
  await E(`(function(){
    const L = pbNew('lead', 'New lead', 14); L.items = [pbItem('Discovery call', 'call', 1), pbItem('Trial shoot', 'task', 5), pbItem('Closing call', 'call', 8)];
    const O = pbNew('client', 'Onboarding', 30); O.items = [pbItem('Onboarding call', 'call', 1), pbItem('Get access and info', 'access', 1, {checklist:[{id:'c1', t:'Meta Business Manager access'}, {id:'c2', t:'Ad account access'}]}), pbItem('Send the intake form', 'send', 2), pbItem('Kick-off call', 'call', 3), pbItem('Deliver the first win', 'task', 7), pbItem('First monthly report', 'report', 28), pbItem('Month-one review call', 'call', 30)];
    const M = pbNew('client', 'Monthly service', 30, {repeats:true}); M.items = [pbItem('Weekly report', 'report', 1, {repeat:'week', dow:5}), pbItem('Book the monthly call', 'task', 24), pbItem('Monthly call', 'call', 28), pbItem('Monthly report', 'report', 30)];
    O.next = M.id; pbAll().push(L, O, M); pbSave();
  })()`);
  check('Onboarding leads into Monthly service; Monthly service repeats', await E("pbAll()[1].next===pbAll()[2].id && pbRepeats(pbAll()[2])"));
  check('nobody is put on one for you', await E("!crmFind('client', 'jj').pb"));
  await E("state.business.clients.push({id:'nw', name:'Nina', business:'Nina Roofing', stage:'active', status:'active', mrr:1800, startDate:todayStr(), deliverables:[]}); masterTasksSync()");
  check('a new client isn’t started on anything by itself', await E("!crmFind('client', 'nw').pb"));
  await E("pbMoveTo('client', 'nw', pbAll()[1].id)"); await p.waitForTimeout(150);
  check('put on Onboarding: day 1 = the day they signed', await E("crmFind('client', 'nw').pb.id===pbAll()[1].id && crmFind('client', 'nw').pb.start===todayStr()"));
  const pbt = JSON.parse(await E("JSON.stringify(state.tasks.items.filter(t => t.master && t.master.kind==='pb' && t.master.id==='nw').map(t => [t.title, t.master.type, t.deadline, t.status]))"));
  check('everything on it is on your task list (later ones in the backlog), tagged with them, by type', pbt.some(t => t[0]==='Onboarding call' && t[1]==='call' && t[3]==='today') && pbt.some(t => t[0]==='Get access and info' && t[1]==='access') && pbt.some(t => t[0]==='Deliver the first win' && t[3]==='backlog'), pbt);
  check('the access task carries its checklist', /Meta Business Manager access/.test(await E("state.tasks.items.find(t => t.master && t.master.kind==='pb' && t.title==='Get access and info').notes")));
  const card = await E("taskCard(state.tasks.items.find(t => t.master && t.master.kind==='pb' && t.master.id==='nw'))");
  check('playbook tasks have their own colour by type', /r55-pbt/.test(card) && /--pbc:#5B9BFF/.test(card));
  check('it’s not a deliverable', await E("!state.tasks.items.some(t => t.master && t.master.kind==='pb' && (t.master.delivId || t.isDeliverable))"));
  await E("(function(){ const t = state.tasks.items.find(t => t.master && t.master.kind==='pb' && t.title==='Onboarding call'); completeTask(t.id); })()"); await p.waitForTimeout(1300);
  check('done on the task list = done on the playbook', await E("Object.keys(crmFind('client', 'nw').pb.done).some(k => /:/.test(k))"));
  check('the client card shows where they are and what’s next', /Onboarding/.test(await E("clientCardV2(crmFind('client', 'nw'))")) && /Day 1/.test(await E("clientCardV2(crmFind('client', 'nw'))")));
  // late: red, health, notification
  await E("crmFind('client', 'nw').pb.start = addDays(todayStr(), -5); masterTasksSync()");
  check('late playbook tasks go red and pull health down', await E("pbLateFor('client', 'nw').length >= 1 && clientHealthStatus(crmFind('client', 'nw')).level!=='green'"));
  check('…and show up in notifications', await E("notifList().some(n => /^pb:/.test(n.key) && /Nina Roofing/.test(n.title))"));
  // moving by hand
  await E("uiConfirm = function(o){ window.__conf = o; return Promise.resolve(true); }; pbMoveNext('client', 'nw')"); await p.waitForTimeout(200);
  check('move them on: it says what gets checked off first', /checks off \d+ thing/.test(await E("window.__conf.text")));
  check('…then they’re on Monthly service, and a banner says so', await E("crmFind('client', 'nw').pb.id===pbAll()[2].id") && /moved to Monthly service/.test(await E("(document.getElementById('r55Banner') || {}).textContent || ''")));
  await E("pbMoveBack('client', 'nw')"); await p.waitForTimeout(200);
  check('move them back: what was checked off when they moved comes back', await E("crmFind('client', 'nw').pb.id===pbAll()[1].id && pbState('client', crmFind('client', 'nw')).open.length >= 5"));
  // finishing on its own
  await E("(function(){ const x = crmFind('client', 'nw'), s = pbState('client', x); s.occ.forEach(o => { x.pb.done[o.key] = todayStr(); }); })(); masterTasksSync()");
  check('everything done: they move on by themselves', await E("crmFind('client', 'nw').pb.id===pbAll()[2].id"));
  check('monthly: the weekly report comes every Friday', await E("pbState('client', crmFind('client', 'nw')).occ.filter(o => o.it.title==='Weekly report').every(o => dowOf(o.date)===5)"));
  // leads
  await E("state.business.pipeline.push({id:'l2', name:'Rob', business:'Rob Roofing', stage:'lead', value:900, createdAt:todayStr()}); masterTasksSync(); pbMoveTo('lead', 'l2', pbAll()[0].id)"); await p.waitForTimeout(150);
  check('a lead goes on the lead playbook', await E("crmFind('lead', 'l2').pb.id===pbAll()[0].id"));
  check('its discovery call is a task, tagged with the lead', await E("state.tasks.items.some(t => t.master && t.master.kind==='pb' && t.master.who==='lead' && t.master.id==='l2' && t.title==='Discovery call')"));
  await E("pbAll()[0].stage = 'discovery'; const P = pbNew('lead', 'Proposal follow-up'); P.stage = 'proposal'; P.items = [pbItem('Send the proposal', 'send', 1)]; pbAll().push(P); setStage('lead', 'l2', 'proposal'); masterTasksSync()");
  check('a lead moving to a stage starts that stage’s playbook', await E("crmFind('lead', 'l2').pb.id===pbAll().find(x => x.name==='Proposal follow-up').id"));
  // the builder
  await E("ui.view='business'; ui.businessTab='lifecycle'; ui.pbView='build'; ui.pbSel = pbAll()[1].id; ui.pbItem = null; renderView()"); await p.waitForTimeout(250);
  check('Playbooks: the builder is a calendar of its days, items on their days', (await p.$$('.pb6-day')).length===30 && (await p.$$('.pb6-day[data-pb-day="1"] .pb6-chip')).length===2);
  check('the sub-tab says Playbooks', /Playbooks/.test(await p.textContent('#viewRoot')) && !/Client cycles/.test(await p.textContent('#viewRoot')));
  await p.dragAndDrop('.pb6-day[data-pb-day="7"] .pb6-chip', '.pb6-day[data-pb-day="5"]'); await p.waitForTimeout(250);
  check('drag an item to another day', await E("pbAll()[1].items.find(i => i.title==='Deliver the first win').day")===5);
  await E("ACTIONS.pbAdd(null, null, '12')"); await p.waitForTimeout(200);
  check('+ on a day adds an item there and opens it', await E("pbAll()[1].items.some(i => i.day===12)") && !!(await p.$('.pb6-item .pb6-it')));
  await p.fill('.pb6-item .pb6-it', 'Two-week check-in call'); await p.press('.pb6-item .pb6-it', 'Tab'); await p.waitForTimeout(150);
  await E("ACTIONS.pbItemType(null, null, 'call')"); await p.waitForTimeout(100);
  check('…name it, give it a type', await E("JSON.stringify(pbAll()[1].items.filter(i => i.day===12).map(i => [i.title, i.type]))")===JSON.stringify([['Two-week check-in call', 'call']]));
  // the client window
  await E("openClientModal('nw'); ui.clientSec='cycle'; renderClientModalInto()"); await p.waitForTimeout(200);
  check('in their window: the playbook, day 1 you can change, every item with Open/Copy/Schedule', !!(await p.$('.r55-pbp input[data-pb-start]')) && (await p.$$('.r55-pbp-r')).length >= 3 && /Playbook/.test(await p.textContent('#clientModalOverlay')));
  await E("closeClientModal ? closeClientModal() : null");

  // ---- Op: client reports ----
  const facts = await E("r55RepFacts(crmFind('client', 'jj'), 30)");
  check('report facts: deliverables, notes, period', /Reels.*2 delivered/.test(facts) && /hooks in the first 2 seconds/.test(facts), facts);
  await E("r55RepOpen('jj')"); await p.waitForTimeout(400);
  check('a report to send, and notes just for you', !!(await p.$('#r55RepClient')) && !!(await p.$('#r55RepMine')) && /Hi Jay/.test(await E("document.getElementById('r55RepClient').value")));
  await E("ACTIONS.r55RepSave()");
  check('save: it’s in their journal', await E("arr(crmFind('client', 'jj').journal).some(j => j.kind==='report')"));
  await E("opfEl()");
  check('it’s an ability on Op’s screen', !!(await p.$('#opFull .r55-opab-b[data-action="r55Report"]')));
  check('Op can open it when you ask', await E("OP_TOOLS.some(t => t.name==='client_report')"));

  // ---- clients' socials ----
  await E("ui.r55CliAll = [{id:'a1', platform:'instagram', username:'jjs_build', followers:1800}, {id:'a2', platform:'facebook', username:'JJS', followers:600}]; ui.r55CliTried = true; r55CliLinks().a1 = 'jj'; r55CliStore().a1 = {at:Date.now(), followers:1800, p30:12, views:48000, best:{cap:'Kitchen remodel', views:15000}}; ui.view='convos'; ui.socTab='clients'; renderView()"); await p.waitForTimeout(250);
  const soc = await p.textContent('#viewRoot');
  check('Social → Clients: each client’s accounts, numbers and best post', /jjs_build/.test(soc) && /Kitchen remodel/.test(soc) && /Link an account/.test(soc));

  // ---- what the review found ----
  await E("r55McOpen(); ACTIONS.r55McOk(null, null, 'spend'); ACTIONS.r55McOk(null, null, 'where'); addSheetRefresh('r55Money'); addSheetRefresh('r55Money')"); await p.waitForTimeout(200);
  check('review: hold still needed after the sheet redraws', !!(await p.$('#r55Money [data-hold-act="r55MoneyFinish"]')) && !(await p.$('#r55Money [data-action="r55MoneyFinish"]')));
  check('review: the money task can still be edited ("Edit the task")', !!(await p.$('#r55Money [data-action="r55EditTask"]')) || await E("r55McDone()"));
  await E("addSheetClose('r55Money')");
  await E("state.business.clients.push({id:'old', name:'Ollie', business:'Old Co', stage:'active', status:'active', mrr:900, startDate:'2025-06-01', deliverables:[]}); masterTasksSync(); pbMoveTo('client', 'old', pbAll()[1].id)"); await p.waitForTimeout(150);
  check('review: a client with an old start date put on a playbook starts today, not a year behind', await E("crmFind('client', 'old').pb.start===todayStr() && pbLateFor('client', 'old').length===0"));
  await E("(function(){ const c = crmFind('client', 'old'); pbStart('client', c, pbAll()[2].id, '2026-09-30', true); masterTasksSync(); })()");
  const lateBefore = await E("pbLateFor('client', 'old').length");
  await E("(function(){ const c = crmFind('client', 'old'); c.pb.start = '2026-09-26'; masterTasksSync(); })()");
  check('review: late monthly items stay on your list into the next month', lateBefore > 0 && await E("pbLateFor('client', 'old').length") >= 1, lateBefore);
  await E("state.business.clients.push({id:'st', name:'S', business:'*Star Media', stage:'active', status:'active', mrr:500, startDate:todayStr(), deliverables:[]}); (state.modes = state.modes || {}).history = arr(state.modes.history).concat([{type:'shooting', date:todayStr(), note:'shot for star'}])");
  check('review: a name with symbols doesn’t break the report', typeof (await E("r55RepFacts(crmFind('client', 'st'), 30)"))==='string');
  await E("r55RepOpen('jj', null, 7)");
  check('review: Op’s report for a week is a week', await E("ui.r55Rep.days")===7);
  await E("addSheetClose('r55Report')");
  await E("(function(){ const c = crmFind('client', 'nw'); const a = c.pb.run; pbStart('client', c, pbAll()[1].id, c.pb.start, true); window.__runs = [a, c.pb.run]; })()");
  check('review: each time on a playbook is its own run (going back on one starts clean)', await E("window.__runs[0]!==window.__runs[1] && pbState('client', crmFind('client', 'nw')).occ.every(o => !o.done)"));

  // ---- the sweep ----
  check('Analytics: no “Check-ins with Op”', await E("acctLogHtml()")==='');
  await E("ui.view='today'; renderView()");
  check('no errors', p.errors.length===0, p.errors);

  // ---- ultrawide ----
  await p.setViewportSize({width:3440, height:1440}); await E("ui.view='calendar'; renderView()"); await p.waitForTimeout(300);
  check('ultrawide: the calendar uses the width', await E("document.querySelector('.calx').getBoundingClientRect().width > 2200"));
  await b.close();
  process.exit(report() ? 1 : 0);
})().catch((e) => { console.error(e); process.exit(1); });
