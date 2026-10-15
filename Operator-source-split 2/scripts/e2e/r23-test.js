// Round 23: the minimal view lives on Focus only (no scrolling, Full view out of the way, the level chip
// compact on Focus and fading away elsewhere); no text under stats; Health score as a ring with the
// ceiling as a notch; Content on Business and Personal; Goals organized with an add-goal sheet, Op sizing
// each goal's XP, master goals that pay by size, reopening a checked-out week; Op that knows the clients
// (notes, touches, ideas for the app), builds its own memory and always has captions; Good morning that
// lets the music play until you talk to Op, ducks it when Op speaks, and a good-day reel with no gap at the
// end; manual sessions stop when you've moved off work apps; the journal box keeps its size when it saves;
// carousel arrows inside the row; Expenses with your bank, live.
const { instrument, launch, check, report, OUT } = require('./common.js');
const path = require('path');
const CORS = {'Access-Control-Allow-Origin':'*'};
const okJ = {status:200, body:'{"ok":true}', headers:CORS};
const now0 = Math.floor(new Date(2026,9,14,10).getTime()/1000);
function helperRoute(calls){
  return r => {
    const u = r.request().url(); calls.push(u.replace('http://127.0.0.1:8935', ''));
    if(u.includes('/ai/status')) return r.fulfill({status:200, headers:CORS, body:'{"ok":true,"hasKey":true}'});
    if(u.includes('/ai/models')) return r.fulfill({status:200, headers:CORS, body:JSON.stringify({data:[{id:'claude-haiku-5-5'}]})});
    if(u.includes('/ai/chat')){
      const body = JSON.parse(Buffer.from(u.split('b=')[1], 'hex').toString()), last = body.messages[body.messages.length-1].content;
      const t = typeof last==='string' ? last : '';
      const txt = /Size up this goal/.test(t) ? '{"xp": 220, "why": "A real push for a week like yours."}'
        : /List up to 4 new, lasting facts/.test(t) ? '["He likes to train before work", "JJS Fitness wants more reels"]'
        : /Greet me by name/.test(t) ? 'Morning, Andre. Where do you want to start?' : 'Noted.';
      return r.fulfill({status:200, headers:CORS, body:JSON.stringify({stop_reason:'end_turn', content:[{type:'text', text:txt}]})});
    }
    if(u.includes('/mc/key')) return r.fulfill({status:200, headers:CORS, body:'{"ok":true}'});
    if(u.includes('/mc/api')) return r.fulfill({status:200, headers:CORS, body:JSON.stringify({data:[1,2,3].map(i => ({postId:'m'+i, publishedAt:{dateTime:'2026-10-1'+i+'T12:00:00'}, content:'Metricool post '+i, likes:100+i, comments:10+i, reach:2000+i, url:'https://instagram.com/p/m'+i}))})});
    if(u.includes('/fin/claim')) return r.fulfill({status:200, headers:CORS, body:'{"ok":true}'});
    if(u.includes('/fin/accounts')) return r.fulfill({status:200, headers:CORS, body:JSON.stringify({errors:[], accounts:[{id:'a1', name:'Checking', org:{name:'Chase'}, balance:'4210.55', 'balance-date':now0,
      transactions:[['Chipotle', -14.2], ['Shell', -48.1], ['Spotify', -11.99], ['Whole Foods', -96.4], ['Payroll', 2400]].map((x, i) => ({id:'t'+i, posted:now0 - i*86400, amount:String(x[1]), description:x[0]})).concat([{id:'p1', posted:now0, amount:'-5', description:'Pending thing', pending:true}])}]})});
    return r.fulfill(okJ);
  };
}
async function ctxPage(b, seed, opts){
  opts = opts || {};
  const ctx = await b.newContext({viewport: opts.viewport || {width:1440, height:900}}); const p = await ctx.newPage(); p.errors = []; p.on('pageerror', e => p.errors.push(e.message));
  if(opts.clock) await p.clock.install({time:opts.clock});
  await p.addInitScript((seed) => { if(sessionStorage.getItem('s')) return; sessionStorage.setItem('s', '1'); Object.keys(seed).forEach(k => localStorage.setItem('opsdash:'+k, JSON.stringify(seed[k]))); }, seed);
  p.calls = [];
  await p.route('http://127.0.0.1:8935/**', helperRoute(p.calls));
  await p.goto('file://'+path.resolve(OUT+'/r23.html')); await p.waitForTimeout(500);
  return p;
}
(async () => {
  instrument(process.argv[2], OUT+'/r23.html');
  const b = await launch();
  const WED = new Date(2026,9,14,10,0,5).getTime();

  // ---- minimal: Focus only ----
  {
    const p = await ctxPage(b, {profile:{name:'Andre', lockedView:'minimal'}}, {clock:WED});
    const E = c => p.evaluate(x => window.__op.ev(x), c);
    await E("state.focus.activeSession = {startedAt: Date.now()-1800000, plannedMinutes:null, completedTasks:[], breaks:[], onBreak:false, completeFired:false}; ui.view='today'; renderView()"); await p.waitForTimeout(300);
    check('r36: while locked in, minimal lives on Today (the overview)', await p.isVisible('#viewRoot .np-locked'));
    await E("ui.view='focus'; renderView()"); await p.waitForTimeout(300);
    check('…Focus stays the full page, with no Minimal button', !(await p.$('#viewRoot .np-locked')) && !(await p.$('#viewRoot .lv-corner .lv-btn')));
    await p.keyboard.press('m'); await p.waitForTimeout(200);
    check('…and M does nothing on Focus', await E("state.profile.lockedView")==='minimal' && !(await p.$('#viewRoot .np-locked')));
    await E("ui.view='today'; renderView()"); await p.waitForTimeout(300);
    check('…it doesn’t scroll', await p.evaluate(() => getComputedStyle(document.querySelector('#viewRoot .np')).overflowY)==='hidden');
    const fb = await p.evaluate(() => { const r = document.querySelector('.np .lv-btn').getBoundingClientRect(); return {x:r.left, y:r.top}; });
    check('…Full view sits bottom-left, out of the way of the corner', fb.x < 120 && fb.y > 700, fb);
    check('…and the level chip isn’t in the way', await p.evaluate(() => { const c = document.querySelector('#musicDock .md-lvl'); return !c || getComputedStyle(c).display==='none'; }));
    await E("ACTIONS.toggleLockedView(); ui.view='focus'; state.focus.activeSession=null; renderView()"); await p.waitForTimeout(400);
    check('(r38e) no Minimal button by the Focus title', !(await p.$('.view-title .lv-corner .lv-btn')));
    await E("ui.focusTasksSubTab='backlog'; renderView()"); await p.waitForTimeout(200);
    const onBacklog = !!(await p.$('.view-title .lv-btn'));
    await E("ui.focusTab='analytics'; renderView()"); await p.waitForTimeout(200);
    check('…only on the first Focus page (not Backlog, not Analytics)', !onBacklog && !(await p.$('.view-title .lv-btn')));
    await E("ui.focusTab='tasks'; ui.focusTasksSubTab='overview'; renderView()"); await p.waitForTimeout(200);
    check('on Focus the level chip is compact (no bar)', await p.evaluate(() => { const c = document.querySelector('#musicDock .md-lvl'); return c && c.classList.contains('is-compact') && !c.classList.contains('is-idle') && getComputedStyle(c.querySelector('i')).display==='none'; }));
    await E("ui.view='calendar'; renderView()"); await p.clock.runFor(12000); await p.waitForTimeout(300);
    check('elsewhere it fades out of the way when nothing’s happening', await p.evaluate(() => document.querySelector('#musicDock .md-lvl').classList.contains('is-idle')));
    await p.mouse.move(1400, 30); await p.waitForTimeout(400);
    check('…and comes back when the mouse goes to the corner', await p.evaluate(() => !document.querySelector('#musicDock .md-lvl').classList.contains('is-idle')));
    check('no page errors (minimal)', p.errors.length===0, p.errors);
    await p.context().close();
  }

  // ---- stats and Health ----
  {
    const p = await ctxPage(b, {profile:{name:'Andre', heightIn:70}, health:{gymLog:[], weightLog:[{id:'w', date:'2026-10-10', weight:250}], calorieEntries:[]}}, {clock:WED});
    const E = c => p.evaluate(x => window.__op.ev(x), c);
    const subs = JSON.parse(await E("JSON.stringify(Object.fromEntries(['BUS','PER'].map(k => [k, xpSummaryFresh().attrs[k].subs.map(s => s.label)])))"));
    check('Content on both: Business has its Content, Personal has its own', subs.BUS.join()==='MRR,Focus,Scaling,Content' && subs.PER.join()==='Content,Goals,Finances,Mind', subs);
    await E("ui.view='personal'; ui.personalTab='you'; renderView()"); await p.waitForTimeout(300);
    check('You: no text under the stats', (await p.$$('.you .you-sub small')).length===0 && (await p.$$('.you .you-sub')).length===15);
    await E("ui.personalTab='fitness'; renderView()"); await p.waitForTimeout(300);
    check('Health score: a ring, three numbers, the BMI scale, no explaining text', await p.isVisible('#healthScore .hsc-ring') && (await p.$$('#healthScore .hsc-t')).length===3 && !(await p.$('#healthScore .hs-note, #healthScore .hsc-how')));
    check('…the ceiling is a notch on the ring and a quiet "max"', await p.$('#healthScore .hsc-ring-n')!==null && /max \d+/.test(await p.textContent('#healthScore .hsc-max')));
    check('no page errors (stats)', p.errors.length===0, p.errors);
    await p.context().close();
  }

  // ---- goals ----
  {
    const p = await ctxPage(b, {profile:{name:'Andre', goalWeight:200, revenueGoalMonthly:20000}, health:{gymLog:[], weightLog:[{id:'w', date:'2026-09-01', weight:250}], calorieEntries:[]}}, {clock:WED});
    const E = c => p.evaluate(x => window.__op.ev(x), c);
    await E("AI.hasKey = true; ui.view='personal'; ui.personalTab='goals'; renderView()"); await p.waitForTimeout(300);
    // (round 32: one panel, divided: the big ones on top, this week & month, your goals)
    check('Goals: one panel with the big ones, this week & month, your goals', !!(await p.$('.gl .gx-card .gx-top')) && !!(await p.$('.gl .gx-card .gx-split')) && /Your goals/i.test(await p.textContent('.gl')));
    check('the revenue card is minimal: no pill, no pen, a quiet "of $20,000"', !(await p.$('.mg-hero .mg-pen')) && /of \$20,000/.test(await p.textContent('.mg-hero .mg-target')));
    check('losing 50 lbs is a big one: +7,500 XP', /\+7,500 XP/.test(await p.textContent('.gl')) && await E("masterXpFor('weight', 250, 200)")===7500 && await E("masterXpFor('mrr', 0, 10000)")===6000);
    // (round 25: no + on the cards; the + in the corner opens the sheet, on This week)
    await p.click('#fabAdd'); await p.waitForTimeout(250);
    check('the + opens the goal sheet (This week picked)', await p.isVisible('#goalSheet:not(.hidden) .gs') && /is-on/.test(await p.getAttribute('.gs-seg button[data-id="week"]', 'class')));
    await p.fill('#gsLabel', 'Post three reels'); await p.click('[data-action="gsSave"]'); await p.waitForTimeout(800);
    const g = JSON.parse(await E("JSON.stringify(tierGoals('week', weekKey()).find(g => g.label==='Post three reels'))"));
    check('Op sizes it up: +220 XP, with why', g && g.xp===220 && /real push/.test(g.xpWhy) && !g.xpPending, g);
    check('…and the row shows it', /\+220/.test(await p.textContent('.tg-card.is-week')));
    await E("openGoalSheet('long')"); await p.fill('#gsLabel', '10k followers'); await p.click('[data-action="gsSave"]'); await p.waitForTimeout(200);
    check('a long-term goal needs a number', await p.isVisible('#goalSheet:not(.hidden)') && await E("state.goals.items.filter(g => g.label==='10k followers').length")===0);
    await p.fill('#gsTarget', '10000'); await p.fill('#gsUnit', 'followers'); await p.click('[data-action="gsSave"]'); await p.waitForTimeout(800);
    check('…then it’s added with its own XP', await E("(state.goals.items.find(g => g.label==='10k followers')||{}).xp")===220);
    // reopening a week you checked out of
    await E("const r = intentStore().weeks[weekKey()] = intentStore().weeks[weekKey()] || {}; r.at = Date.now(); r.out = {at:Date.now()}; renderView()"); await p.waitForTimeout(200);
    check('a checked-out week offers Reopen', await p.isVisible('.tg-card.is-week [data-action="tierReopen"]'));
    await p.click('.tg-card.is-week [data-action="tierReopen"]'); await p.waitForTimeout(200);
    check('…and reopening it lets you add again', !(await E("checkedOut('week', weekKey())")) && !(await p.$('.tg-card.is-week [data-action="tierReopen"]')));
    check('no long dashes in the sheet or the goals', !/—/.test(await p.textContent('.gl')));
    check('no page errors (goals)', p.errors.length===0, p.errors);
    await p.context().close();
  }

  // ---- Op ----
  {
    const p = await ctxPage(b, {profile:{name:'Andre'}, business:{clients:[{id:'c1', name:'Jay', business:'JJS Fitness', stage:'active', status:'active', mrr:2000, journal:[{id:'j', date:'2026-10-01', text:'Wants to launch a new program in November'}]}], pipeline:[{id:'l1', name:'Mia', company:'Bloom Co', stage:'new', notes:'Met at the expo'}]}}, {clock:WED});
    const E = c => p.evaluate(x => window.__op.ev(x), c);
    const ctxt = await E("aiContext()");
    check('Op knows the clients in depth: what they pay and his notes', /JJS Fitness/.test(ctxt) && /\$2,000\/mo/.test(ctxt) && /new program in November/.test(ctxt) && /Bloom Co/.test(ctxt) && /Met at the expo/.test(ctxt), ctxt.slice(0, 400));
    await E("opRunTool('add_client_note', {who:'jjs', note:'Prefers calls on Fridays'}); opRunTool('log_touch', {who:'Bloom', type:'call'}); opRunTool('suggest_improvement', {idea:'Show client birthdays'})");
    check('it saves notes on a client', await E("state.business.clients[0].journal.some(j => /Fridays/.test(j.text))"));
    check('…logs a reach-out on a lead', await E("state.business.pipeline[0].touchpoints.length")===1);
    check('…and keeps ideas for the app (in Settings)', await E("state.settings.opIdeas[0].text")==='Show client birthdays');
    await E("AI.hasKey = true; AI.history = [{role:'user', content:'I like to train before work. Also JJS wants more reels.'}, {role:'assistant', content:'Noted.'}]; opMemFrom = 0"); await E("opMemoryDistill()"); await p.waitForTimeout(300);
    check('memory builds itself after a conversation', await E("opMemory().some(m => /train before work/.test(m.text)) && opMemory().some(m => /more reels/.test(m.text))"));
    await E("opfClose(); OV.cap = 'brVoice'; opCaption('Something said where no caption box is open')");   // (round 30: Op's tools opened his full screen; back to the app first) await p.waitForTimeout(200);
    check('whatever Op says has captions: no box on screen → the bubble', await p.isVisible('#opBub.is-in') && /no caption box/.test(await p.textContent('#opBubText')));
    check('no page errors (op)', p.errors.length===0, p.errors);
    await p.context().close();
  }

  // ---- Good morning ----
  {
    const p = await ctxPage(b, {profile:{name:'Andre'}, focus:{wake:{enabled:true, time:'07:00', days:[0,1,2,3,4,5,6], news:false, intro:'quick', introChosen:true, voice:true}}}, {clock:WED});
    const E = c => p.evaluate(x => window.__op.ev(x), c);
    // a song playing on the page (faked)
    await E("fireWake({})");
    await p.click('[data-action="wakeStartDay"]').catch(() => {}); await p.waitForTimeout(900);
    await E("wakeAudio = {volume:0.8, pause(){ this.paused = true; }, play(){}, addEventListener(){}}; wakeCfg().media = {ref:'x', name:'Morning song'}; opBriefReset(); renderWakeOverlayInto(); briefRevealAll && briefRevealAll()"); await p.clock.runFor(3000); await p.waitForTimeout(400);
    // (round 24: Op starts as Good morning does, music or not; the blue light is how you talk to it)
    check('music playing: Op still narrates (the song ducks), and the blue light is the way to talk', !(await p.$('.br-opgo')) && await p.isVisible('.br-voice-dot[data-action="briefTalk"]') && await E("(function(){ ui.briefSkipped = false; OV.speaking = false; OV.pending = false; OV.pre = {ready:true}; const r = opBriefTick(ui.briefLines, 99999); opStop(); OV.idx = 999; return r; })()")===true);
    check('the good-day list is there twice, so its end never shows a gap', await E("document.querySelectorAll('#wakeContent .gd-track > *').length")===2*await E("goodDayItems().length"));
    await E("const a = wakeAudio; window.__a = a; opDuck(true)");
    check('when Op talks, the song goes down', await E("window.__a.volume")<=0.12);
    await E("wakeMusicApp = true; opDucked = false; opDuck(true)"); await p.waitForTimeout(200);
    check('…and the Music app too, through the Operator app', p.calls.some(c => /music\/duck\?on=1/.test(c)));
    await E("wakeMusicApp = false; opDuck(false)"); await p.clock.runFor(1500); await p.waitForTimeout(200);
    check('…then back up after', p.calls.some(c => /music\/duck\?on=0/.test(c)));
    await E("AI.hasKey = true; opStop(); OV.idx = -1"); await p.click('.br-voice-dot', {force:true}); await p.waitForTimeout(600);
    check('Talk to Op: the music goes down (round 28: it no longer stops) and Op greets you and asks what you want', (!(await E("!!wakeAudio")) || await E("window.__a.volume") <= 0.12) && await E("AI.history.some(m => /Where do you want to start/.test(m.content))"));
    check('no page errors (good morning)', p.errors.length===0, p.errors);
    await p.context().close();
  }

  // ---- work detection, the journal box, carousels ----
  {
    const p = await ctxPage(b, {profile:{name:'Andre'}, settings:{appTracking:{enabled:true, awayMinutes:10, activityCats:{netflix:'other'}}}}, {clock:WED});
    const E = c => p.evaluate(x => window.__op.ev(x), c);
    await E("state.settings.appTracking = Object.assign({enabled:true, awayMinutes:10}, state.settings.appTracking); setActivityCategory('Code', 'work'); setActivityCategory('Netflix', 'other')");
    await E(`const n = Date.now(); state.focus.activeSession = {startedAt:n-40*60000, plannedMinutes:null, completedTasks:[], breaks:[], onBreak:false};
      state.appActivity.todayIntervals = [{app:'Code', start:n-40*60000, end:n-14*60000}, {app:'Netflix', start:n-14*60000, end:n-5000}]; lastRawSampleAt = n; checkAwayFromSession()`);
    check('a session you started yourself stops once you’ve been off work apps for a while', !(await E("!!state.focus.activeSession")) && await E("state.focus.sessions.slice(-1)[0].minutes")===26);
    check('…it says so, with Add it back', /Session stopped/.test(await p.textContent('#toastContainer')) && /Add it back/.test(await p.textContent('#toastContainer')));
    await E("ui.view='focus'; renderView(); openQuickJournalModal()"); await p.waitForTimeout(300);
    const h0 = await p.evaluate(() => document.getElementById('quickJournalContent').getBoundingClientRect().height);
    await p.fill('#quickJournalModalText', 'A test note'); await p.keyboard.press('Meta+Enter'); await p.waitForTimeout(200);
    const after = await p.evaluate(() => { const c = document.getElementById('quickJournalContent'), d = c.querySelector('.qj3-done'); const cr = c.getBoundingClientRect(), dr = d.getBoundingClientRect(); return {h:cr.height, dy:Math.abs((dr.top + dr.height/2) - (cr.top + cr.height/2)), dx:Math.abs((dr.left + dr.width/2) - (cr.left + cr.width/2))}; });
    check('saving a quick note: the box keeps its size and "Saved" sits in the middle', Math.abs(after.h - h0) < 2 && after.dy < 20 && after.dx < 20, {h0, after});
    check('no page errors (work)', p.errors.length===0, p.errors);
    await p.context().close();
  }
  {
    const p = await ctxPage(b, {profile:{name:'Andre', cardLayout:'carousel'}, tasks:{items:[1,2,3,4,5,6,7,8,9,10].map(i => ({id:'t'+i, title:'Task '+i, status:i<3?'today':'backlog', priority:'med', clients:[], createdAt:'2026-10-01'}))}}, {clock:WED});
    const E = c => p.evaluate(x => window.__op.ev(x), c);
    await E("ui.view='focus'; renderView()"); await p.waitForTimeout(600);
    const a = await p.evaluate(() => { const c = document.querySelector('.carousel.is-sized'); if(!c) return null; const cr = c.getBoundingClientRect(), n = c.querySelector('.car-next').getBoundingClientRect(), pv = c.querySelector('.car-prev').getBoundingClientRect(); return {inR:n.right <= cr.right + 1, inL:pv.left >= cr.left - 1}; });
    check('carousel arrows sit inside the row (never half cut by the page edge)', a && a.inR && a.inL, a);
    check('no page errors (carousel)', p.errors.length===0, p.errors);
    await p.context().close();
  }

  // ---- expenses, the bank ----
  {
    const p = await ctxPage(b, {profile:{name:'Andre'}}, {clock:WED});
    const E = c => p.evaluate(x => window.__op.ev(x), c);
    await E("ui.view='personal'; ui.personalTab='finances'; renderView()"); await p.waitForTimeout(300);
    check('Finances has Expenses, with Connect your bank', await p.isVisible('.ex') && await p.isVisible('#finToken'));
    await p.fill('#finToken', 'aHR0cHM6Ly9icmlkZ2Uuc2ltcGxlZmluLm9yZy9jbGFpbS94eXo='); await p.click('[data-action="finConnect"]'); await p.waitForTimeout(800);
    check('the token goes to the Operator app (never into Operator’s data)', p.calls.some(c => /\/fin\/claim\?t=/.test(c)) && !(await E("JSON.stringify(state)")).includes('aHR0cHM6Ly9icmlkZ2Uu'));
    const ex = JSON.parse(await E("JSON.stringify(state.finances.expenses)"));
    check('your bank’s card purchases come in as expenses (not income, not pending)', ex.length===4 && ex.every(e => e.src==='bank') && !ex.some(e => /Payroll|Pending/.test(e.name)), ex.map(e => e.name));
    check('…sorted into kinds', ex.find(e => e.name==='Chipotle').cat==='food' && ex.find(e => e.name==='Shell').cat==='transport' && ex.find(e => e.name==='Spotify').cat==='subs' && ex.find(e => e.name==='Whole Foods').cat==='groceries');
    check('…the balance shows, and syncing again adds nothing twice', /\$4,211/.test(await p.textContent('.ex')) && (await E("finSync(false).then(() => state.finances.expenses.length)"))===4);
    await E("openFinSheet('expense')"); await p.fill('#expName', 'Haircut'); await p.fill('#expAmount', '35'); await p.click('[data-action="expAdd"]'); await p.waitForTimeout(150);
    check('add one by hand too', await E("state.finances.expenses.some(e => e.name==='Haircut' && e.amount===35)"));
    check('Op knows the spending', /Spending this month/.test(await E("aiContext()")));
    check('no long dashes in Expenses', !/—/.test(await p.textContent('.ex')));
    await E("ui.view='convos'; renderView()"); await p.waitForTimeout(200);
    check('social numbers: Metricool or a CSV, not GoHighLevel', await E("/Metricool/.test(igSectionHtml()) && /Import a CSV/.test(igSectionHtml()) && !/Social Planner/.test(igSectionHtml())"));
    check('no page errors (expenses)', p.errors.length===0, p.errors);
    await p.context().close();
  }

  // ---- content, finished tasks ----
  {
    const p = await ctxPage(b, {profile:{name:'Andre'}, tasks:{items:[{id:'v1', title:'Client results reel', status:'backlog', isVideoIdea:true, contentRole:'personal', clients:['personal'], priority:'med', createdAt:'2026-10-01'}, {id:'d1', title:'Done task', status:'done', completedAt:'2026-10-13', clients:[], priority:'med'}]}}, {clock:WED});
    const E = c => p.evaluate(x => window.__op.ev(x), c);
    await E("ui.view='focus'; ui.focusTab='tasks'; ui.focusTasksSubTab='videoIdeas'; renderView()"); await p.waitForTimeout(300);
    check('Content lanes: no + or "add" buttons on them', !(await p.$('.ct-add')) && !(await p.$('.ct-lane [data-action="openAddContent"]')));
    await p.dragAndDrop('.ct-lane[data-content-role="personal"] [data-task-id="v1"]', '.ct-lane[data-content-role="business"]'); await p.waitForTimeout(300);
    check('drag a video from Personal to Business and it moves', await E("contentRoleOf(state.tasks.items.find(t => t.id==='v1'))")==='business');
    await p.click('#fabAdd'); await p.waitForTimeout(300); await p.click('#addPick .ap-tile:has-text("video idea")'); await p.waitForTimeout(300);   // (round 26: the + asks first)
    check('the + opens a New video sheet (Business or Personal)', await p.isVisible('#contentSheet:not(.hidden) #csTitle') && (await p.$$('#contentSheet .gs-seg button')).length===2);
    await p.click('#contentSheet [data-action="csRole"][data-id="personal"]'); await p.fill('#csTitle', 'Day in the life'); await p.click('[data-action="csSave"]'); await p.waitForTimeout(200);
    check('…and adds it to the right lane', await E("contentRoleOf(state.tasks.items.find(t => t.title==='Day in the life'))")==='personal');
    await E("ui.focusTasksSubTab='finished'; renderView()"); await p.waitForTimeout(200);
    check('finished tasks: no Undo button on every row', (await p.$$('.finished-row')).length>=1 && !(await p.$('.finished-row [data-action="undoTask"]')));
    check('no page errors (content)', p.errors.length===0, p.errors);
    await p.context().close();
  }

  // ---- social numbers without Meta or GoHighLevel; live big goals ----
  {
    const p = await ctxPage(b, {profile:{name:'Andre'}}, {clock:WED});
    const E = c => p.evaluate(x => window.__op.ev(x), c);
    await E("ui.view='convos'; renderView()"); await p.waitForTimeout(200);
    check('Social offers Metricool, a CSV, or Meta directly (no GoHighLevel numbers)', await p.isVisible('.soc-connect') && /Metricool/.test(await p.textContent('.soc-connect')) && /Import a CSV/.test(await p.textContent('.soc-connect')) && !/Connect GoHighLevel/.test(await p.textContent('#viewRoot')));
    const csv = 'Publish time,Description,Permalink,Post type,Reach,Likes,Comments,Followers\n2026-10-12T15:00,First reel,https://x/1,Reel,1500,120,9,4200\n2026-10-13T15:00,"Second, with a comma",https://x/2,Reel,1800,150,12,4210';
    await E("ui.socRole='personal'; socImportCsv("+JSON.stringify(csv)+", 'export.csv')"); await p.waitForTimeout(400);
    check('a CSV export comes in: posts, likes, followers', await E("igCfg().cache.data['csv-personal'].posts.length")===2 && await E("igCfg().cache.data['csv-personal'].followers")===4210 && /Second, with a comma/.test(await E("igCfg().cache.data['csv-personal'].posts[0].cap")));
    check('…counts as personal content on your card, and followers for XP', await E("igPostsByRole('personal')")===2 && await E("xpFollowersNow()")===4210);
    await E("ui.socAdd = true; ui.socShow='mc'; ui.socRole='business'; renderView()"); await p.waitForTimeout(200);
    await p.fill('#mcToken', 'tok123'); await p.fill('#mcUser', '456'); await p.fill('#mcBlog', '123'); await p.click('[data-action="mcConnect"]'); await p.waitForTimeout(800);
    check('Metricool: the token goes to the Operator app, the posts come in', p.calls.some(c => /\/mc\/key\?t=.*&u=456&b=123/.test(c)) && await E("igCfg().cache.data['metricool'].posts.length")===3 && !(await E("JSON.stringify(state)")).includes('tok123'));
    // a big one tracked live: followers
    await E("ui.view='personal'; ui.personalTab='goals'; renderView(); ui.gsTrack='followers'; openGoalSheet('long')"); await p.waitForTimeout(200);
    check('a new long-term goal can be tracked live (followers, weight, MRR…)', (await p.$$('.gs-trk button')).length===7 && /4,210 followers/.test(await p.textContent('.gs-now')));
    await p.fill('#gsTarget', '5000'); await p.click('[data-action="gsSave"]'); await p.waitForTimeout(300);
    const g = JSON.parse(await E("JSON.stringify(state.goals.items.find(g => g.master))"));
    check('…it becomes one of the big ones, from where you are, paying by size', g && g.autoTrack==='followers' && g.start===4210 && g.xp>=1500 && (await p.$$('.gl .mg-card.is-mine')).length===1, g);
    check('…and it moves with your numbers', await E("goalLiveCurrent(state.goals.items.find(g => g.master))")===4210);
    check('Op can set one up too', /tracked live/.test(await E("opRunTool('add_goal', {period:'long', label:'Hit 190', track:'weight', target:190})")) || /tracked live/.test(await E("opRunTool('add_goal', {period:'long', label:'10 clients', track:'clients', target:10})")));
    check('no page errors (social)', p.errors.length===0, p.errors);
    await p.context().close();
  }

  await b.close();
  process.exit(report()?1:0);
})();
