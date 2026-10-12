// Round 26: Op with a personality (greetings that never repeat, no "back to work" endings, asks before the
// rundown), Health in three sub-tabs, the lock-in "Begin" step, every + as a pop-up (a chooser of tiles first,
// then a proper sheet: Finances, Training skills), Training Skills on Focus (and Growth gone from Personal),
// the skill look wherever a skill shows, pencils on the week and month cards, Put it on Now from a right-click,
// the carousel fade while it moves, Op's reads across the app, and the dreamier Inspiration (wishes, words,
// breathing, skies, drift, five more tracks).
const { instrument, launch, check, report, OUT } = require('./common.js');
const path = require('path');
const CORS = {'Access-Control-Allow-Origin':'*'};
const okJ = {status:200, body:'{"ok":true}', headers:CORS};
function helperRoute(calls, opts){
  return r => {
    const u = r.request().url(); calls.push(u.replace('http://127.0.0.1:8935', ''));
    if(u.includes('/ai/status')) return r.fulfill({status:200, headers:CORS, body:JSON.stringify({ok:true, hasKey:!opts.noKey})});
    if(u.includes('/ai/models')) return r.fulfill({status:200, headers:CORS, body:JSON.stringify({data:[{id:'claude-haiku-5-5'}]})});
    if(u.includes('/ai/chat')){
      let t = '';
      try{ const body = JSON.parse(Buffer.from(u.split('b=')[1], 'hex').toString()), last = body.messages[body.messages.length-1].content; t = typeof last==='string' ? last : JSON.stringify(last); }catch(e){}
      calls.ai = (calls.ai || []).concat([t]);
      let txt = 'Noted.';
      if(/Pattern:/.test(t)) txt = 'Pattern: Training is steady, food is the gap.\nWatch: Three days with nothing logged.\nMove: Log dinner tonight, even roughly.';
      else if(/Greet me by name/.test(t)) txt = 'Morning, Andre. The coffee’s not going to drink itself.';
      return r.fulfill({status:200, headers:CORS, body:JSON.stringify({stop_reason:'end_turn', content:[{type:'text', text:txt}]})});
    }
    return r.fulfill(okJ);
  };
}
async function ctxPage(b, seed, opts){
  opts = opts || {};
  const ctx = await b.newContext({viewport: opts.viewport || {width:1440, height:900}}); const p = await ctx.newPage(); p.errors = []; p.on('pageerror', e => p.errors.push(e.message));
  if(opts.clock) await p.clock.install({time:opts.clock});
  await p.addInitScript((seed) => { if(sessionStorage.getItem('s')) return; sessionStorage.setItem('s', '1'); Object.keys(seed).forEach(k => localStorage.setItem('opsdash:'+k, JSON.stringify(seed[k]))); }, seed);
  p.calls = [];
  await p.route('http://127.0.0.1:8935/**', helperRoute(p.calls, opts));
  await p.goto('file://'+path.resolve(OUT+'/r26.html')); await p.waitForTimeout(500);
  return p;
}
(async () => {
  instrument(process.argv[2], OUT+'/r26.html');
  const b = await launch();
  const at = (h, m) => new Date(2026,9,14,h,m||0,5).getTime();
  const tasks = {items:[
    {id:'t1', title:'Edit JJS reel', status:'today', priority:'high', clients:[]},
    {id:'t2', title:'Send Bloom proposal', status:'today', priority:'med', clients:[]},
    {id:'t3', title:'Meta ads', status:'backlog', priority:'med', clients:['personal'], skill:true, skillGoal:180, ongoing:true, trackedMinutes:200},
    {id:'t4', title:'Fix the website footer', status:'backlog', priority:'low', clients:[]}]};
  const base = {profile:{name:'Andre', revenueGoalMonthly:20000, heightIn:70, weightUnit:'lbs'}, tasks,
    health:{weightLog:[{id:'w1', date:'2026-09-20', weight:210}, {id:'w2', date:'2026-10-12', weight:206}], gymLog:[{id:'g1', date:'2026-10-12', type:'Push day', duration:60}], calorieEntries:[{id:'c1', date:'2026-10-14', name:'Chicken bowl', calories:780}]},
    finances:{debts:[{id:'d1', name:'Car loan', balance:8000, originalAmount:12000}], income:[{id:'i1', date:'2026-10-03', source:'JJS', amount:3000}], payments:[], invoices:[], expenses:[]},
    business:{clients:[{id:'c1', name:'JJS', stage:'active', status:'active', mrr:3000, startDate:'2026-06-01'}], pipeline:[]}};

  // ---- Op: a personality, greetings that never repeat, the rundown only when asked ----
  {
    const p = await ctxPage(b, base, {clock:at(9, 5), noKey:true});
    const E = c => p.evaluate(x => window.__op.ev(x), c);
    check('Op never ends by steering you back to work (rule)', /NEVER end a reply by steering him to his next task/.test(await E("OP_RULES")));
    check('…and is told to be funny, a person, not a productivity bot', /Be a person, not a productivity bot/.test(await E("OP_RULES")) && /Humor/.test(await E("OP_PERSONA_DEFAULT")));
    const g = JSON.parse(await E("JSON.stringify([0,1,2,3,4,5].map(() => opGreetFallback('morning')))"));
    check('greetings without a key: never the same one twice in a row', g.every((x, i) => i===0 || x!==g[i-1]) && g.every(x => /Andre/.test(x)), g);
    check('…for work too', /Andre/.test(await E("opGreetFallback('work')")));
    check('the work brief asks first (rundown or not), it doesn’t just read it out', /Want the rundown|run through the day|Need the rundown|walk you through today/.test(await E("opAutoBusinessBrief.toString()")));
    await E("ui.opRundownAsked = Date.now()");
    check('“nah” to the rundown: Op lets it go (no rundown)', await E("opRundownYes('nah I’m good')")===true);
    await E("ui.opRundownAsked = 0");
    check('…and a reply that isn’t about the rundown is just a reply', await E("opRundownYes('yes')")===false);
    check('no page errors (op)', p.errors.length===0, p.errors);
    await p.context().close();
  }
  {
    const p = await ctxPage(b, base, {clock:at(7, 5)});
    const E = c => p.evaluate(x => window.__op.ev(x), c);
    await E("aiKeyCheck()"); await p.waitForTimeout(300);
    check('with a key, Op writes a fresh greeting in its own voice', /coffee/.test(await E("opGreet('morning')")));
    await p.context().close();
  }

  // ---- Health: Overview (the big three first), Weight & fuel, Training ----
  {
    const p = await ctxPage(b, base, {clock:at(10, 5)});
    const E = c => p.evaluate(x => window.__op.ev(x), c);
    await E("ui.view='personal'; ui.personalTab='fitness'; renderView()"); await p.waitForTimeout(400);
    const tabs = await p.$$eval('.hl .sub-pill', els => els.map(e => e.textContent.trim()));
    check('Health has three sub-tabs: Overview, Weight & fuel, Training', JSON.stringify(tabs)==='["Overview","Weight & fuel","Training"]', tabs);
    const order = await E("Array.from(document.querySelectorAll('.subtab-panel > *')).map(e => e.className).join(' | ')");
    check('Overview opens on the Health score (Training, Diet, Weight) first', /^[^|]*(hs-|health|hsc)/i.test(order), order);
    await p.click('.sub-pill[data-id="training"]'); await p.waitForTimeout(300);
    check('Training: the workouts on their own', await E("ui.healthSub")==='training' && /Push day/.test(await p.textContent('.subtab-panel')));
    await p.click('.sub-pill[data-id="body"]'); await p.waitForTimeout(300);
    check('Weight & fuel: weight and food', /206/.test(await p.textContent('.subtab-panel')) && /Chicken bowl/.test(await p.textContent('.subtab-panel')));
    await p.click('.sub-pill[data-id="overview"]'); await p.waitForTimeout(1200);
    check('Op’s read on Health (Pattern / Watch / Move)', /Food is the gap|food is the gap/.test(await p.textContent('#viewRoot')) && !!(await p.$('.opi.is-rows')));
    check('no page errors (health)', p.errors.length===0, p.errors);
    await p.context().close();
  }

  // ---- the + : a pop-up chooser first, then the right sheet ----
  {
    const p = await ctxPage(b, base, {clock:at(10, 5)});
    const E = c => p.evaluate(x => window.__op.ev(x), c);
    await E("ui.view='focus'; ui.focusTab='tasks'; ui.focusTasksSubTab='overview'; renderView()"); await p.waitForTimeout(300);
    await p.click('#fabAdd'); await p.waitForTimeout(400);
    const tiles = await p.$$eval('#addPick:not(.hidden) .ap-tile b', els => els.map(e => e.textContent));
    check('Focus: the + opens a pop-up asking what to add (round 28: task, video idea, then skill)', JSON.stringify(tiles)==='["A task","A video idea","A training skill"]', tiles);
    check('…nothing about events or goals (those live elsewhere)', !tiles.some(t => /event|goal/i.test(t)));
    check('…in the middle of the screen, like the other sheets', await E("(() => { const r = document.querySelector('#addPick .card').getBoundingClientRect(); return Math.abs((r.left + r.width/2) - innerWidth/2) < 30; })()"));
    await p.click('#addPick .ap-tile:has-text("training skill")'); await p.waitForTimeout(400);
    check('A training skill: its own sheet', await p.isVisible('#skillSheet #skillName') && await E("document.getElementById('addPick').classList.contains('hidden')"));
    await p.fill('#skillName', 'Copywriting'); await p.click('#skillSheet [data-action="skillGoalPick"][data-id="120"]'); await p.click('#skillSheet [data-action="skillAdd"]'); await p.waitForTimeout(300);
    check('…added as a skill with a weekly aim, the sheet closes', await E("(() => { const t = state.tasks.items.find(x => x.title==='Copywriting'); return !!t && t.skill===true && t.skillGoal===120 && t.ongoing===true; })()") && await E("document.getElementById('skillSheet').classList.contains('hidden')"));
    await E("ui.focusTasksSubTab='skills'; renderView()"); await p.waitForTimeout(300);
    await p.click('#fabAdd'); await p.waitForTimeout(400);
    check('on Training Skills, the + still asks, in the same order (round 28: always task first)', (await p.textContent('#addPick .ap-tile >> nth=0')).includes('task'));
    await p.keyboard.press('Escape'); await p.waitForTimeout(200);
    check('Esc closes it', await E("document.getElementById('addPick').classList.contains('hidden')"));
    await E("ui.focusTasksSubTab='overview'; renderView()"); await p.click('#fabAdd'); await p.waitForTimeout(300); await p.click('#addPick .ap-tile >> nth=0'); await p.waitForTimeout(300);
    check('A task: the add-task pop-up', await p.isVisible('#newTaskTitle'));
    check('…with priority as a switch, not a dropdown', !!(await p.$('.pri-seg')) && !(await p.$('select#newTaskPriority')));
    await p.fill('#newTaskTitle', 'Call the printer'); await p.click('.pri-seg .pri-high'); await p.click('#addTaskContent [data-action="addTaskToday"]'); await p.waitForTimeout(300);
    check('…and the priority you picked sticks', await E("(state.tasks.items.find(t => t.title==='Call the printer')||{}).priority")==='high');
    // finances
    await E("document.querySelectorAll('.overlay').forEach(o => o.classList.add('hidden')); ui.view='personal'; ui.personalTab='finances'; renderView()"); await p.waitForTimeout(300);
    check('Finances: no inline add forms', !(await p.$('#viewRoot #expName, #viewRoot #debtName, #viewRoot #incomeSource')));
    await p.click('#fabAdd'); await p.waitForTimeout(400);
    check('…the + asks: an expense, income or a debt', (await p.$$('#addPick:not(.hidden) .ap-tile')).length===3);
    await p.click('#addPick .ap-tile >> nth=0'); await p.waitForTimeout(400);
    check('An expense: a pop-up sheet', await p.isVisible('#finSheet #expAmount'));
    await p.fill('#expAmount', '42.5'); await p.fill('#expName', 'Dinner out'); await p.click('#finSheet [data-action="finSheetCat"][data-id="food"]'); await p.click('#finSheet [data-action="expAdd"]'); await p.waitForTimeout(300);
    check('…saved with the kind you picked, the sheet closes', await E("state.finances.expenses.some(e => e.name==='Dinner out' && e.amount===42.5 && e.cat==='food')") && await E("document.getElementById('finSheet').classList.contains('hidden')"));
    await E("openFinSheet('debt')"); await p.waitForTimeout(300);
    await p.fill('#debtName', 'Card'); await p.fill('#debtAmount', '900'); await p.click('#finSheet [data-action="addDebt"]'); await p.waitForTimeout(300);
    check('A debt: the same sheet', await E("state.finances.debts.some(d => d.name==='Card' && d.balance===900)"));
    await E("openFinSheet('income')"); await p.waitForTimeout(300);
    await p.fill('#incomeAmount', '1500'); await p.fill('#incomeSource', 'Bloom'); await p.click('#finSheet [data-action="addIncome"]'); await p.waitForTimeout(300);
    check('Income: the same sheet', await E("state.finances.income.some(i => i.source==='Bloom' && i.amount===1500)"));
    check('an empty sheet doesn’t save (and points at what’s missing)', await E("(() => { openFinSheet('expense'); const n = state.finances.expenses.length; ACTIONS.expAdd(); return state.finances.expenses.length===n && document.activeElement && document.activeElement.id==='expName'; })()"));
    check('no page errors (+)', p.errors.length===0, p.errors);
    await p.context().close();
  }

  // ---- Training Skills on Focus; no Growth on Personal; the skill look everywhere ----
  {
    const p = await ctxPage(b, Object.assign({}, base, {focus:{taskSegments:[{id:'s1', taskId:'t3', start:at(9, 0)-86400000, end:at(9, 50)-86400000, date:'2026-10-13'}]}}), {clock:at(10, 5)});
    const E = c => p.evaluate(x => window.__op.ev(x), c);
    await E("ui.view='personal'; ui.personalTab='you'; renderView()"); await p.waitForTimeout(300);
    check('Personal: no Growth tab', !/Growth/.test(await p.textContent('.tabs')));
    await E("ui.view='focus'; ui.focusTab='tasks'; ui.focusTasksSubTab='overview'; renderView()"); await p.waitForTimeout(300);
    check('Focus → Tasks has Training Skills', /Training Skills/.test(await p.textContent('.subtabs')));
    await p.click('.subtab[data-tab="skills"]'); await p.waitForTimeout(400);
    check('…your skills, with this week against the aim', /Meta ads/.test(await p.textContent('.gr-skills')) && /50m of 3h this week/.test(await p.textContent('.gr-skills')));
    check('Op can open it (open_page skills)', /"skills"/.test(await E("JSON.stringify(OP_TOOLS.find(t => t.name==='open_page').input_schema)")));
    await E("ui.view='focus'; ui.focusTasksSubTab='backlog'; renderView()"); await p.waitForTimeout(300);
    check('a skill’s card looks like one (its own badge and colour)', !!(await p.$('.task-card.skill-card .tag-skill')) && /Skill/.test(await p.textContent('.task-card.skill-card .tag-skill')));
    check('…and shows time trained instead of “days in progress”', /trained this week/.test(await p.textContent('.task-card.skill-card')) && !/in progress/.test(await p.textContent('.task-card.skill-card')));
    check('other tasks keep their priority', !!(await p.$('.task-card:not(.skill-card) .tag-low')));
    await E("openLockSeq()"); await p.waitForTimeout(400);
    check('the lock-in picker shows the skill badge too', /Skill/.test(await E("(document.getElementById('lockSeqOverlay')||{}).textContent || ''")) || !!(await p.$('#lockSeqOverlay .tag-skill')));
    check('lock-in: the last step is “Begin”', await E("LOCK_STEPS[3][1]")==='Begin');
    await E("ui.lockSeq.step='why'; ui.lockSeq.maxStep=3; renderLockSeqInto()"); await p.waitForTimeout(300);
    check('…and LOCK IN sits in the footer', !!(await p.$('#lockSeqOverlay .ls-go-foot')) && /Begin/.test(await p.textContent('#lockSeqOverlay')));
    await E("closeLockSeq()");
    check('Training skill (not just “Skill”) in the task editor', await E("(() => { openTaskEditModal('t4'); return /Training skill/.test(document.body.innerHTML); })()"));
    check('no page errors (skills)', p.errors.length===0, p.errors);
    await p.context().close();
  }

  // ---- Calendar pencils; right-click Put it on Now; the carousel fades while it moves; Op's reads ----
  {
    const p = await ctxPage(b, Object.assign({}, base, {goals:{items:[{id:'gw', tier:'week', pk:'2026-10-12', label:'Ship the reel', done:false}]}, calendar:{events:[{id:'e1', date:'2026-10-15', time:'10:00', title:'Shoot with Nina', category:'work'}], categories:[]}}), {clock:at(10, 5)});
    const E = c => p.evaluate(x => window.__op.ev(x), c);
    await E("const pr = intentStore().prompted; pr['M'+monthKey()] = 1; pr['W'+weekKey()] = 1; checkoutDue().forEach(c => pr['O'+c.kind+':'+c.key] = 1); ui._intAsked = 'x'; ui.view='calendar'; renderView()"); await p.waitForTimeout(800);
    await E("document.querySelectorAll('.int-ov').forEach(o => { o.classList.add('hidden'); o.classList.remove('is-in'); })");
    check('Calendar: the week and the month both have a pencil (no “Check out” button)', (await p.$$('.tg-strip .tg-edit')).length===2 && !(await p.$('.tg-strip .tg-out')));
    check('…the pencils look the same (✎)', JSON.stringify(await p.$$eval('.tg-strip .tg-edit', els => els.map(e => e.textContent)))==='["✎","✎"]');
    await p.waitForTimeout(800);
    await E("renderView()"); await p.waitForTimeout(200);
    check('Op’s read on the week ahead (Calendar)', !!(await p.$('.opi-wrap .opi')));
    await E("ui.view='today'; renderView()"); await p.waitForTimeout(400);
    const card = await p.$('[data-task-id="t2"], .task-card[data-id="t2"], .tl-row[data-id="t2"]');
    await card.click({button:'right'}); await p.waitForTimeout(200);
    check('right-click a task: Put it on Now', /Put it on Now/.test(await p.textContent('#taskCtxMenu')) && /Up next/.test(await p.textContent('#taskCtxMenu')));
    await p.click('#taskCtxMenu [data-op="now"]'); await p.waitForTimeout(300);
    check('…it’s on Now, timed', await E("ui.currentTaskId")==='t2' && await E("!!ui.currentTaskStartedAt"));
    await E("state.profile.cardLayout='carousel'; for(let i=0;i<8;i++) state.tasks.items.push({id:'x'+i, title:'Extra '+i, status:'today', priority:'med', clients:[]}); renderView()"); await p.waitForTimeout(500);
    const moving = await E("(() => { const t = document.querySelector('.car-track'); if(!t) return 'none'; t.scrollLeft = 300; t.dispatchEvent(new Event('scroll')); return t.classList.contains('is-moving'); })()");
    check('a carousel fades its edges while it moves', moving===true, moving);
    await p.waitForTimeout(400);
    check('…and stops fading once it settles', await E("!(document.querySelector('.car-track')||{classList:{contains:()=>false}}).classList.contains('is-moving')"));
    for(const [view, tab, label] of [['personal', 'finances', 'Finances'], ['personal', 'goals', 'Goals'], ['business', 'overview', 'Business']]){
      await E("ui.view='"+view+"'; ui."+(view==='business' ? 'businessTab' : 'personalTab')+"='"+tab+"'; renderView()"); await p.waitForTimeout(1300); await E("renderView()"); await p.waitForTimeout(200);
      check('Op’s read on '+label, !!(await p.$('#viewRoot .opi')));
    }
    check('no page errors (calendar / dashboard / reads)', p.errors.length===0, p.errors);
    await p.context().close();
  }

  // ---- Inspiration, dreamier ----
  {
    const p = await ctxPage(b, base, {clock:at(18, 5)});
    const E = c => p.evaluate(x => window.__op.ev(x), c);
    check('five more tracks, made to float (more since)', await E("FOCUS_TRACKS.filter(t => t.dream).length")>=5 && await E("FOCUS_TRACKS.some(t => t.name==='Cloud Nine') && FOCUS_TRACKS.some(t => t.name==='Tide')"));
    check('…each has its own sound', await E("['swell','musicbox','glass','ocean'].every(s => typeof fmDream(s)==='function') && fmDream('lofi')===null"));
    await E("openInspire()"); await p.waitForTimeout(900);
    check('Inspiration opens on one of the dreamy tracks', await E("FM.playing && FOCUS_TRACKS[FM.idx].dream===true"));
    check('the sky has aurora, rising lights and a glow that follows you', !!(await p.$('#insp .insp-aurora')) && (await p.$$('#insp .insp-bokeh i')).length===10 && !!(await p.$('#insp .insp-glow')));
    const tools = await p.$$eval('#insp .izk', els => els.map(e => e.textContent.trim()));
    check('a sandbox bar: Thought, Wish, Words, Breathe, the sky, Drift (round 28: plus Breeze and Sounds)', JSON.stringify(tools)==='["✎Thought","✦Wish","❝Words","❍Breathe","☾Dusk","≈Drift","🍃Breeze","🎵Sounds"]', tools);
    check('the week (reading, meditating, walks…) lives here now', /This week/.test(await p.textContent('#insp .insp-lately')) && (await p.$$('#insp .izl-w')).length===6);
    await p.click('#insp [data-action="inspToolWish"]'); await p.waitForTimeout(300);
    await p.keyboard.type('A house by the ocean'); await p.waitForTimeout(100);
    check('a wish: a little star you name (it stays)', await E("inspSandStore().wishes.length===1 && inspSandStore().wishes[0].text==='A house by the ocean'"));
    await p.click('#insp [data-action="inspToolWords"]'); await p.waitForTimeout(300);
    check('words worth keeping: a card of old wisdom on the plane', await E("inspSandStore().quotes.length")===1 && !!(await p.$('#insp .izq p')));
    await p.click('#insp [data-action="inspToolWords"]'); await p.waitForTimeout(300);
    check('…never the same words twice', await E("inspSandStore().quotes[0].q!==inspSandStore().quotes[1].q"));
    const qx = await E("inspSandStore().quotes[0].x"); const qb = await p.$('#insp .izq'); const bb = await qb.boundingBox();
    await p.mouse.move(bb.x + 40, bb.y + 20); await p.mouse.down(); await p.mouse.move(bb.x + 140, bb.y + 60, {steps:6}); await p.mouse.up(); await p.waitForTimeout(200);
    check('…you can move them anywhere', await E("inspSandStore().quotes[0].x") > qx + 50);
    await p.click('#insp [data-action="inspSky"]'); await p.waitForTimeout(300);
    check('the sky changes (and remembers)', await E("document.getElementById('insp').getAttribute('data-sky')")==='aurora' && await E("inspSandStore().sky")==='aurora' && /Aurora/.test(await p.textContent('#insp .insp-tools')));
    await p.mouse.click(1000, 140); await p.waitForTimeout(150);
    check('tap the sky: a bloom of light', !!(await p.$('.insp-bloom')));
    // (round 28: Drift is the wind now)
    await p.click('#insp [data-action="inspDrift"]'); await p.waitForTimeout(300);
    check('Drift: set the wind and the bubbles breeze across', await p.isVisible('#insp .izk-wind'));
    await p.keyboard.press('Escape'); await p.waitForTimeout(200);
    check('…Esc closes the wind panel and keeps you here', !(await p.$('#insp .izk-wind')) && !!(await p.$('#insp.is-in')));
    await p.click('#insp [data-action="inspDrift"]'); await p.waitForTimeout(200); await p.click('#insp .izk-wind [data-id="breeze"]'); await p.waitForTimeout(200);
    check('…the wind is set', await E("inspStore().wind")==='breeze');
    await E("inspStore().wind='calm'");
    await p.click('#insp [data-action="inspBreathe"]'); await p.waitForTimeout(300);
    check('Breathe: a breathing orb, full screen', await p.isVisible('#inspBreath .ibr-orb') && /Breathe in/.test(await p.textContent('#inspBreath')));
    await p.clock.runFor(4200); await p.waitForTimeout(100);
    check('…in, then hold, then out', /Hold/.test(await p.textContent('#inspBreath .ibr-t')));
    await p.clock.runFor(70000); await p.waitForTimeout(100);
    const n0 = await E("inspStore().log.filter(x => x.act==='meditate').length");
    await p.click('#inspBreath .ibr-done'); await p.waitForTimeout(700);
    check('…a minute or more counts as meditating', await E("inspStore().log.filter(x => x.act==='meditate').length")===n0 + 1 && !(await p.$('#inspBreath')));
    await p.keyboard.press('Escape'); await p.waitForTimeout(900);
    check('Esc: back out, the music stops', !(await p.$('#insp.is-in')) && await E("FM.playing")===false);
    check('no page errors (inspiration)', p.errors.length===0, p.errors);
    await p.context().close();
  }

  await b.close();
  process.exit(report()?1:0);
})();
