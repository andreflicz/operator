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

  // ---- a new playbook: name, for, length, what happens when it ends ----
  await p.click('.pb6-bar [data-action="pb6NewOpen"]'); await p.waitForTimeout(200);
  check('the new-playbook sheet asks the name, who it’s for, how long, and what happens when it ends', !!(await p.$('#pb6NewName')) && (await p.$$('#pb6NewSheet [data-action="pb6NewSet"][data-id^="for:"]')).length===2 && (await p.$$('#pb6NewSheet [data-action="pb6NewSet"][data-id^="days:"]')).length===3 && !!(await p.$('#pb6NewEnds')));
  await p.fill('#pb6NewName', 'Retainer'); await p.fill('#pb6NewDays', '28'); await p.selectOption('#pb6NewEnds', 'again');
  await p.click('[data-action="pb6Create"]'); await p.waitForTimeout(250);
  check('…made: 28 days, for clients, starts again', await E("JSON.stringify(pbAll().map(x => [x.name, x.days, pbFor(x), pbRepeats(x), !!x.isDefault]))")===JSON.stringify([['Retainer', 28, 'client', true, false]]));
  await E("ACTIONS.pb6NewOpen()"); await p.waitForTimeout(150); await p.fill('#pb6NewName', 'Onboarding'); await p.selectOption('#pb6NewEnds', pbId = await E("pbAll()[0].id")); await p.click('[data-action="pb6Create"]'); await p.waitForTimeout(250);
  check('…another that moves them on to Retainer when it ends', await E("pbAll()[1].next===pbAll()[0].id && !pbRepeats(pbAll()[1]) && pbAll()[1].days===30"));
  await E("ACTIONS.pb6NewOpen()"); await p.waitForTimeout(150); await p.click('[data-id="for:lead"]'); await p.waitForTimeout(100); await p.fill('#pb6NewName', 'New lead'); await p.click('[data-action="pb6Create"]'); await p.waitForTimeout(250);
  check('…and one for leads', await E("pbFor(pbAll()[2])==='lead'"));

  // ---- Build ----
  await E("ui.pbView='build'; ui.pbSel=pbAll()[1].id; ui.pbItem=null; renderView()"); await p.waitForTimeout(200);
  const head = await p.textContent('.pb6-head');
  check('Build: no Lead / Onboarding / Monthly service switch, no ★, no “new clients start here”', !(await p.$('[data-action="pbKind"]')) && !(await p.$('.pbx-star')) && !/start here/i.test(await p.textContent('#viewRoot')));
  check('the length is shown, not edited, in the header', /30 days/.test(head) && !(await p.$('[data-action="pbLen"]')) && !(await p.$('[data-pb-f="days"]')));
  check('no legend line', !(await p.$('.pbx-legend')) && !/Day 1 is/.test(await p.textContent('#viewRoot')));
  check('a calendar of its 30 days, and a weekly row with the seven weekdays', (await p.$$('.pb6-day')).length===30 && (await p.$$('.pb6-wd')).length===7);
  await E("ACTIONS.pbAdd(null, null, '1')"); await p.waitForTimeout(150);
  await p.fill('.pb6-item .pb6-it', 'Onboarding call'); await p.press('.pb6-item .pb6-it', 'Tab'); await p.waitForTimeout(100);
  await E("ACTIONS.pbItemType(null, null, 'call')"); await p.waitForTimeout(100);
  check('+ on a day: an item there, the panel opens on the right (name it, give it a type)', await E("JSON.stringify(pbAll()[1].items.map(i => [i.title, i.type, i.day]))")===JSON.stringify([['Onboarding call', 'call', 1]]));
  const box = await p.$eval('.pb6-item', n => { const r = n.getBoundingClientRect(); return {b:Math.round(r.bottom), r:Math.round(r.right), pos:getComputedStyle(n).position}; });
  check('the item panel sits beside the calendar, clear of the Op light and the + (not a fixed drawer)', box.pos==='sticky' && box.b < 900 - 90, box);
  await E("ACTIONS.pbItemClose(); ACTIONS.pbAdd(null, null, '10')"); await p.waitForTimeout(150); await p.fill('.pb6-item .pb6-it', 'Strategy doc'); await p.press('.pb6-item .pb6-it', 'Tab'); await E("ACTIONS.pbItemClose()"); await p.waitForTimeout(150);
  await E("ACTIONS.pb6AddWeek(null, null, '5')"); await p.waitForTimeout(150); await p.fill('.pb6-item .pb6-it', 'Weekly check-in'); await p.press('.pb6-item .pb6-it', 'Tab'); await E("ACTIONS.pbItemClose()"); await p.waitForTimeout(150);
  check('+ on a weekday makes a weekly item on that day', await E("JSON.stringify(pbAll()[1].items.filter(i => i.repeat==='week').map(i => [i.title, i.dow]))")===JSON.stringify([['Weekly check-in', 5]]));
  await p.dragAndDrop('.pb6-day[data-pb-day="10"] .pb6-chip', '.pb6-wd[data-pb-dow="1"]'); await p.waitForTimeout(250);
  check('drag an item onto a weekday: it’s every week, that day', await E("JSON.stringify((function(){ const i = pbAll()[1].items.find(x => x.title==='Strategy doc'); return [i.repeat, i.dow]; })())")===JSON.stringify(['week', 1]));
  await p.dragAndDrop('.pb6-wd[data-pb-dow="1"] .pb6-chip', '.pb6-day[data-pb-day="12"]'); await p.waitForTimeout(250);
  check('…and back onto a day', await E("JSON.stringify((function(){ const i = pbAll()[1].items.find(x => x.title==='Strategy doc'); return [i.repeat, i.day]; })())")===JSON.stringify(['once', 12]));
  check('the right side shows who’s on it (nobody) and how to put someone on', /On it/.test(await p.textContent('.pb6-side')) && !!(await p.$('.pb6-side select[data-pb6-addp]')));
  await p.selectOption('.pb6-side select[data-pb6-addp]', 'kk'); await p.waitForTimeout(250);
  check('put a client on it from there', await E("crmFind('client', 'kk').pb && crmFind('client', 'kk').pb.id===pbAll()[1].id"));

  // ---- the tasks ----
  const tasks = JSON.parse(await E("JSON.stringify(state.tasks.items.filter(t => t.master && t.master.kind==='pb' && t.master.id==='kk').map(t => [t.title, t.status, t.deadline]))"));
  check('every item on it is a task (day 1 = her start, Oct 20): what’s due or late on today, later ones in the backlog with their date', tasks.some(t => t[0]==='Onboarding call' && t[1]==='today') && tasks.some(t => t[0]==='Strategy doc' && t[1]==='backlog' && t[2]==='2026-10-31') && tasks.some(t => t[0]==='Weekly check-in'), tasks);
  await E("ui.view='focus'; ui.focusTab='tasks'; ui.focusTasksSubTab='overview'; renderView()"); await p.waitForTimeout(250);
  check('…on Focus → Tasks', /Onboarding call/.test(await p.textContent('#viewRoot')));
  await E("ui.focusTasksSubTab='clientBacklog'; renderView()"); await p.waitForTimeout(250);
  const cbl = await p.textContent('#viewRoot');
  check('…and in Client backlog, under the client, with Today and Done', /Kiko/.test(cbl) && /Strategy doc/.test(cbl) && /Onboarding call/.test(cbl) && (await p.$$('.pb6-cw [data-action="completeTask"]')).length >= 3);
  await p.click('.pb6-cw [data-action="pb6Today"]'); await p.waitForTimeout(150);
  check('→ Today from there puts it on today', await E("state.tasks.items.filter(t => t.master && t.master.kind==='pb' && t.master.id==='kk' && t.status==='today').length") >= 2);

  // ---- Board ----
  await E("ui.view='business'; ui.businessTab='lifecycle'; ui.pbView='board'; ui.pbWho='client'; renderView()"); await p.waitForTimeout(250);
  check('Board: a column for each playbook for clients, and one for those not on any', (await p.$$('.pb6-col')).length===3 && /Not on a playbook/.test(await p.textContent('.pb6-col.is-off')));
  check('the cards say the day and what’s next', /Day 9 of 30/.test(await p.textContent('.pb6-board')) && /Onboarding call/.test(await p.textContent('.pb6-board')));
  await p.dragAndDrop('.pb6-col.is-off .pb6-card[data-pb6-drag="client:jj"]', '.pb6-col[data-pb6-col="'+(await E("pbAll()[0].id"))+'"]'); await p.waitForTimeout(300);
  check('drag a client onto a playbook: they’re on it (day 1 their start date, for one that runs again)', await E("crmFind('client', 'jj').pb.id===pbAll()[0].id && crmFind('client', 'jj').pb.start==='2026-01-05'"));
  await p.dragAndDrop('.pb6-card[data-pb6-drag="client:kk"]', '.pb6-col[data-pb6-col="'+(await E("pbAll()[0].id"))+'"]'); await p.waitForTimeout(300);
  check('drag them from one to another: it says first what gets checked off', /checks off \d+ open thing/.test(await E("window.__conf.text")) && await E("crmFind('client', 'kk').pb.id===pbAll()[0].id"));
  check('…and the old one’s open tasks are done', await E("!state.tasks.items.some(t => t.master && t.master.kind==='pb' && t.master.id==='kk' && t.master.pb===pbAll()[1].id && t.status!=='done')"));
  await p.dragAndDrop('.pb6-card[data-pb6-drag="client:kk"]', '.pb6-col.is-off'); await p.waitForTimeout(300);
  check('drag onto “Not on a playbook”: off it', await E("!crmFind('client', 'kk').pb.id") && /Take Kiko off/.test(await E("window.__conf.title")));
  await E("ACTIONS.pb6Who(null, null, 'lead')"); await p.waitForTimeout(200);
  check('Leads: their own columns', (await p.$$('.pb6-col')).length===2 && /Mia/.test(await p.textContent('.pb6-board')));

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

  // ---- old playbooks lose their kind and ★ ----
  check('old ones: no ★, what they are for and what happens when they end kept', await E("(function(){ const o = {id:'old1', name:'Old', kind:'monthly', isDefault:true, days:30, items:[]}; pbKindSync(o); return o.for==='client' && o.repeats===true && o.isDefault===false; })()"));

  // ---- the build view fits the screen ----
  for(const [w, h] of [[3440, 1440], [1920, 1080]]){
    await p.setViewportSize({width:w, height:h}); await E("ui.view='business'; ui.businessTab='lifecycle'; ui.pbView='build'; ui.pbSel=pbAll()[1].id; ui.pbItem=null; renderView()"); await p.waitForTimeout(300);
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
