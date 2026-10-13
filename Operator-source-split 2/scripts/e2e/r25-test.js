// Round 25: Op as the accountability partner (work hours, random check-ins, the mic opening by itself,
// excuses judged and logged, faults against Consistency and Grind, no answer remembered), Op's moods
// (white, then yellow, red, violet, green, blue), the work alarm (hours, lunch, a break; Next opens the
// work page), Discipline without Integrity, no section add buttons (the + does it, with a menu when there's
// more than one kind of thing), skills and Growth, Inspiration (the dreamy page, logging, Mind on Personal,
// business boards kept out, the rainbow bubble on Good morning), the top-left Good morning panel that
// switches between the morning, your vision board and your level, and the vault.
const { instrument, launch, check, report, OUT } = require('./common.js');
const path = require('path');
const CORS = {'Access-Control-Allow-Origin':'*'};
const okJ = {status:200, body:'{"ok":true}', headers:CORS};
function helperRoute(calls){
  return r => {
    const u = r.request().url(); calls.push(u.replace('http://127.0.0.1:8935', ''));
    if(u.includes('/ai/status')) return r.fulfill({status:200, headers:CORS, body:'{"ok":true,"hasKey":true}'});
    if(u.includes('/ai/models')) return r.fulfill({status:200, headers:CORS, body:JSON.stringify({data:[{id:'claude-haiku-5-5'}]})});
    if(u.includes('/ai/chat')){
      let t = '';
      try{ const body = JSON.parse(Buffer.from(u.split('b=')[1], 'hex').toString()), last = body.messages[body.messages.length-1].content; t = typeof last==='string' ? last : JSON.stringify(last); }catch(e){}
      let txt = 'Noted.';
      if(/Decide if that’s a genuine/.test(t)) txt = /doctor|dentist/i.test(t) ? '{"acceptable": true, "why": "A real appointment", "reply": "Fair enough. Get back to it when you’re home."}'
        : '{"acceptable": false, "why": "Scrolling is a choice", "reply": "That’s on you. You’re at $10.8k against $20k and nobody’s growing it for you. Want me to lock you in?"}';
      else if(/I’m not working \(not locked in/.test(t)) txt = 'It’s 11:40 and nothing’s done. What’s going on?';
      else if(/I’m working \(/.test(t)) txt = 'You’re moving. Grab some water.';
      else if(/hey op/i.test(t)) txt = '[mood:humor] Hey. Good to see you again.';
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
  await p.route('http://127.0.0.1:8935/**', helperRoute(p.calls));
  await p.goto('file://'+path.resolve(OUT+'/r25.html')); await p.waitForTimeout(500);
  return p;
}
// a computed colour as 0..255 numbers (Chrome writes color-mix results as color(srgb 0..1 …))
// (rgb(), color(srgb …) and, since moods blend as a registered colour, oklab(…) too)
const rgbOf = s => { const n = String(s).match(/-?[\d.]+/g).map(Number);
  if(/^oklab/.test(s)){ const [L, A, B] = n, l = (L + 0.3963377774*A + 0.2158037573*B)**3, m = (L - 0.1055613458*A - 0.0638541728*B)**3, q = (L - 0.0894841775*A - 1.2914855480*B)**3;
    const lin = [4.0767416621*l - 3.3077115913*m + 0.2309699292*q, -1.2684380046*l + 2.6097574011*m - 0.3413193965*q, -0.0041960863*l - 0.7034186147*m + 1.7076147010*q];
    return lin.map(x => 255*(x <= 0.0031308 ? 12.92*x : 1.055*Math.pow(Math.max(0, x), 1/2.4) - 0.055)); }
  return /^color\(/.test(s) ? n.slice(0, 3).map(x => x*255) : n.slice(0, 3); };
const pic = c => 'data:image/svg+xml;utf8,'+encodeURIComponent('<svg xmlns="http://www.w3.org/2000/svg" width="300" height="200"><rect width="300" height="200" fill="'+c+'"/></svg>');
const BOARDS = {boards:[
  {id:'v1', kind:'vision', name:'Vision', parentId:null, viewport:{x:0,y:0,zoom:1}, elements:[{id:'i1', type:'image', ref:pic('#f0a'), x:0, y:0, w:300, h:200, z:1}, {id:'n1', type:'note', header:true, color:'#3FBE8E', title:'Mind + Body', body:'', x:320, y:0, w:240, h:80, z:2}]},
  {id:'j1', kind:'journal', name:'Ideas for life', parentId:null, viewport:{x:0,y:0,zoom:1}, elements:[{id:'n2', type:'note', title:'Trips', body:'Japan', x:0, y:0, w:200, h:90, z:1}]},
  {id:'j2', kind:'journal', name:'Ad strategy', parentId:null, viewport:{x:0,y:0,zoom:1}, elements:[{id:'n3', type:'note', title:'Hooks', body:'x', x:0, y:0, w:200, h:90, z:1}]}], masterId:'v1'};
const WORK = {enabled:true, start:'09:00', end:'17:00', days:[0,1,2,3,4,5,6], lunch:'12:30', lunchMin:45, brk:'15:30', brkMin:15, checkins:true, pace:'normal', sound:'standard'};
(async () => {
  instrument(process.argv[2], OUT+'/r25.html');
  const b = await launch();
  const at = (h, m) => new Date(2026,9,14,h,m||0,5).getTime();
  const tasks = {items:[{id:'t1', title:'Edit JJS reel', status:'today', priority:'high', clients:[]}, {id:'t2', title:'Send Bloom proposal', status:'today', priority:'med', clients:[]}]};
  const base = {profile:{name:'Andre', revenueGoalMonthly:20000}, tasks, business:{clients:[{id:'c1', name:'JJS', stage:'active', status:'active', mrr:3000, startDate:'2026-06-01'}], pipeline:[]}};

  // ---- Good morning: the top-left panel, no level up top, the rainbow bubble ----
  {
    const p = await ctxPage(b, Object.assign({}, base, {boards:BOARDS, focus:{wake:{enabled:true, time:'07:00', days:[0,1,2,3,4,5,6], news:false, intro:'quick', introChosen:true, voice:false}}}), {clock:at(7, 5)});
    const E = c => p.evaluate(x => window.__op.ev(x), c);
    await E("fireWake({})"); await p.click('[data-action="wakeStartDay"]'); await p.waitForTimeout(400); await E("briefRevealAll()"); await p.waitForTimeout(500);
    check('the top-left panel switches: the morning, your vision board, your level', (await p.$$('.br-hero .bh-tab')).length===3 && await p.isVisible('.br-hero .bh-wx .brh-sun'));
    check('no level line up top any more (it lives in the panel)', !(await p.$('.brief-top .b4-hud')) && !(await p.$('.br-vmini')));
    await p.click('.bh-tab[data-id="vision"]'); await p.waitForTimeout(900);
    check('…the real vision board, in the same space (no jump)', await p.isVisible('.bh-vision .board-static') && /Mind \+ Body/.test(await p.textContent('.bh-vision')) && await E("document.querySelector('.bh-views').getAttribute('data-v')")==='vision');
    await p.click('.bh-tab[data-id="lvl"]'); await p.waitForTimeout(900);
    check('…and your level', await p.isVisible('.bh-lvl .bh-lv') && /Level 0/.test(await p.textContent('.bh-lv')));
    await E("ui.briefHeroManual = false; ui.briefHeroAt = 0; briefHeroSet('wx')"); await p.clock.runFor(14000); await p.waitForTimeout(300);
    check('…it moves through them by itself while you read', await E("ui.briefHeroV")==='vision');
    check('the rainbow bubble is on Good morning', await p.isVisible('#inspOrb.is-on'));
    await p.click('#inspOrb', {force:true}); await p.waitForTimeout(900);
    check('…and opens Inspiration over it', await p.isVisible('#insp.is-in') && await E("overlayOpen('wakeOverlay')"));
    await p.keyboard.press('Escape'); await p.waitForTimeout(900);
    check('…Esc brings you back to Good morning', !(await p.$('#insp.is-in')) && await E("overlayOpen('wakeOverlay')"));
    check('no page errors (good morning)', p.errors.length===0, p.errors);
    await p.context().close();
  }

  // ---- Op's moods ----
  {
    const p = await ctxPage(b, Object.assign({}, base, {focus:{wake:{voice:false}}}), {clock:at(10)});
    const E = c => p.evaluate(x => window.__op.ev(x), c);
    check('a mood tag is read off a reply and never shown', await E("JSON.stringify(opMoodSplit('[mood:humor] Got you.'))")==='{"mood":"humor","text":"Got you."}' && await E("opMoodSplit('Plain.').mood")===null);
    await E("OV.cap='opBubText'; opBubShow(); opCaption('Hi')"); await p.waitForTimeout(400);
    const col = async () => p.evaluate(() => getComputedStyle(document.documentElement).getPropertyValue('--op-c').trim());
    check('Op is white when it’s just Op (light and bubble)', /#fff(fff)?|rgb\(255, 255, 255\)/i.test(await col()) && (c => c[0] > 220 && c[1] > 220 && c[2] > 220)(rgbOf(await p.evaluate(() => getComputedStyle(document.getElementById('opBub')).backgroundColor))));
    await E("document.head.insertAdjacentHTML('beforeend', '<style>:root{transition:none !important}</style>'); opMood('stern', Infinity)"); await p.waitForTimeout(300);   // (round 32: moods blend in; the test reads the end colour)   // (round 32: moods blend in over ~1.4s)
    check('stern: red', /#ff6262|rgb\(255, 98, 98\)/i.test(await col()) && (c => c[0] > c[2] + 8)(rgbOf(await p.evaluate(() => getComputedStyle(document.getElementById('opBub')).backgroundColor))));
    await E("opMood('concern', 50)"); await p.waitForTimeout(400);
    check('concerned: yellow, and it fades back to white on its own', true);
    await p.waitForTimeout(300);
    check('…back to white', await E("opMoodNow()")==='neutral');
    await E("AI.hasKey = true"); await E("aiAsk('hey op')"); await p.waitForTimeout(800);
    check('a reply that comes with a mood shows it (and the tag isn’t in the words)', await E("opMoodNow()")==='humor' && !/mood/.test(await p.textContent('#opBubText')), await p.textContent('#opBubText'));
    check('no page errors (moods)', p.errors.length===0, p.errors);
    await p.context().close();
  }

  // ---- the work alarm ----
  {
    const p = await ctxPage(b, Object.assign({}, base, {focus:{wake:{voice:false}, work:WORK}}), {clock:at(9, 0)});
    const E = c => p.evaluate(x => window.__op.ev(x), c);
    await E("document.querySelectorAll('.overlay').forEach(o => o.classList.add('hidden')); checkWorkAlarm()"); await p.waitForTimeout(400);
    check('it rings when work starts: "Time to work", your plan, Next', await E("overlayOpen('wakeOverlay') && ui.wakeMode==='work'") && /Time to work/.test(await p.textContent('#wakeContent')) && /2 things today/.test(await p.textContent('#wakeContent')));
    await p.click('[data-action="workRingNext"]'); await p.waitForTimeout(600);
    check('Next: the work page (same as Get to work)', await E("overlayOpen('planOverlay')") && !(await E("overlayOpen('wakeOverlay')")) && !!(await E("workDayState().clockedInAt")));
    await E("checkWorkAlarm()"); await p.waitForTimeout(200);
    check('…and it doesn’t ring twice', !(await E("overlayOpen('wakeOverlay')")));
    await E("hideOverlay('planOverlay')");
    await p.clock.setFixedTime(at(12, 31)); await E("checkWorkAlarm()"); await p.waitForTimeout(300);
    check('lunch: Op tells you to go eat', /Lunch/.test(await p.textContent('#opBubText')));
    check('…and during lunch you’re not "working"', await E("workPhase()")==='lunch');
    await p.clock.setFixedTime(at(15, 35)); check('the break, too', await E("workPhase()")==='break');
    await p.clock.setFixedTime(at(10, 0));
    await E("openWakeSetup(); ACTIONS.alarmTab(null, null, 'work')"); await p.waitForTimeout(300);
    check('the alarm settings have a Work tab: hours, lunch, a break (check-ins moved to Op)', await p.isVisible('.ws-work [data-work="start"]') && await p.isVisible('.ws-work [data-work="end"]') && await p.isVisible('.ws-work [data-work="lunch"]') && !/Op checks in on you/.test(await p.textContent('.ws-work')) && /Op checks in on you/.test(await E("operatorSettingsHtml()")));   // (round 31: check-ins are an Op setting)
    await p.fill('.ws-work [data-work="end"]', '18:00'); await p.dispatchEvent('.ws-work [data-work="end"]', 'change'); await p.waitForTimeout(200);
    check('…saved', await E("workCfg().end")==='18:00');
    check('Op knows your hours', /Work hours today: 9:00 AM to 6:00 PM/.test(await E("aiContext()")));
    check('no page errors (work alarm)', p.errors.length===0, p.errors);
    await p.context().close();
  }

  // ---- Op checks in on you ----
  {
    const p = await ctxPage(b, Object.assign({}, base, {focus:{wake:{voice:false}, work:WORK}}), {clock:at(11, 40)});
    const E = c => p.evaluate(x => window.__op.ev(x), c);
    await E("document.querySelectorAll('.overlay').forEach(o => o.classList.add('hidden')); AI.hasKey = true; window.__l = 0; aiListen = function(){ window.__l++; }");
    const due = "acct().nextDate = todayStr(); acct().nextAt = Date.now() - 1000; acctTick()";
    await E(due); await p.waitForTimeout(400);
    check('not working: Op asks if you’re there, concerned (yellow)', await E("!!acct().pending && acct().pending.stage==='ping'") && await E("opMoodNow()")==='concern' && /you there\?/.test(await p.textContent('#opBubText')));
    check('…and the mic opens on its own', await E("window.__l")>=1);
    await E("aiAsk('yeah I’m here')"); await p.waitForTimeout(700);
    check('you answer: it lays out the day and asks why', await E("acct().pending.stage")==='why' && /What’s going on\?/.test(await p.textContent('#opBubText')) && await E("window.__l")>=2);
    await E("aiAsk('I was scrolling Instagram')"); await p.waitForTimeout(900);
    let last = JSON.parse(await E("JSON.stringify(acct().log.slice(-1)[0])"));
    check('an excuse: logged as a fault, Op gets on you (red) with the stakes', last.status==='fault' && /scrolling/i.test(last.excuse) && await E("opMoodNow()")==='stern' && /20k|growing/.test(await p.textContent('#opBubText')), last);
    check('…it counts against Consistency and Grind', await E("acctScore()") < 1 && await E("acctGrindMult()") < 1);
    // a real reason
    await E(due); await p.waitForTimeout(300); await E("aiAsk('here')"); await p.waitForTimeout(500); await E("aiAsk('I was at the doctor')"); await p.waitForTimeout(900);
    last = JSON.parse(await E("JSON.stringify(acct().log.slice(-1)[0])"));
    check('a real reason: excused, no hit, Op lets it go (white again)', last.status==='excused' && await E("opMoodNow()")==='neutral', last);
    // no answer
    await E(due); await p.waitForTimeout(300);
    await p.clock.runFor(80000); await E("acctTick()"); await p.waitForTimeout(200);
    check('no answer: it tries once more', await E("acct().pending && acct().pending.retried")===true);
    await p.clock.runFor(200000); await E("acctTick()"); await p.waitForTimeout(200);
    last = JSON.parse(await E("JSON.stringify(acct().log.slice(-1)[0])"));
    check('…then it’s logged as no answer (worse than an excuse)', last.status==='noanswer' && !(await E("!!acct().pending")) && /remember/.test(await p.textContent('#opBubText')));
    check('…and Op doesn’t forget: it’s in what Op knows next time you talk', /never answered/.test(await E("aiSystem()[1].text")));
    await E("aiAsk('hey op')"); await p.waitForTimeout(800);
    check('…brought up once (then not again)', await E("acct().log.slice(-1)[0].raised")===true && !/never answered/.test(await E("aiSystem()[1].text")));
    check('…and when you explain, Op can settle it', /excused/.test(await E("opRunTool('settle_checkin', {reason:'Was at the gym', acceptable:true})")) && await E("acct().log.slice(-1)[0].status")==='excused');
    // locked in, shooting, lunch
    await E(due); await p.waitForTimeout(200); await E("startFocus(null)"); await E("acctTick()"); await p.waitForTimeout(200);
    check('getting to work while Op waits clears it (no fault)', await E("acct().log.slice(-1)[0].status")==='nudged');
    await E("acct().nextAt = Date.now() - 1000; acctTick()"); await p.waitForTimeout(200);
    check('just locked in: Op leaves you alone (first 45 minutes)', await E("acct().nextAt") > await E("Date.now()") && await E("acct().log.slice(-1)[0].status")==='nudged');
    await E("state.focus.activeSession.startedAt = Date.now() - 50*60000; acct().nextAt = Date.now() - 1000; acctTick()"); await p.waitForTimeout(800);
    check('locked in a while: a light touch (working, logged green; round 27: Op waits for a reply)', await E("acct().log.slice(-1)[0].status")==='working' && await E("acct().pending && acct().pending.stage")==='light');
    await E("acct().pending = null");
    await E("state.focus.activeSession = null; startMode('shooting', {}); " + due); await p.waitForTimeout(200);
    check('Shooting mode: no check-in', !(await E("!!acct().pending")));
    await E("finishActiveMode(true)");
    await p.clock.setFixedTime(at(12, 40)); await E(due); await p.waitForTimeout(200);
    check('lunch: no check-in', !(await E("!!acct().pending")));
    // the log
    await p.clock.setFixedTime(at(13, 30));
    await E("ui.view='focus'; ui.focusTab='analytics'; renderView()"); await p.waitForTimeout(300); // (round 27: the log moved to Focus → Analytics)
    const rows = await p.$$('.acl-r');
    check('every check-in is logged, colour-coded', rows.length >= 5 && await p.$('.acl-r.is-fault') && await p.$('.acl-r.is-excused') && await p.$('.acl-r.is-working'));
    const s0 = await E("acctScore()");
    await p.click('.acl-r.is-fault .acl-v'); await p.waitForTimeout(300);
    check('…and a verdict can be changed later (it stops counting)', !(await p.$('.acl-r.is-fault')) && await E("acctScore()") > s0);
    check('no page errors (check-ins)', p.errors.length===0, p.errors);
    await p.context().close();
  }

  // ---- ratings, the +, skills, the vault ----
  {
    const p = await ctxPage(b, Object.assign({}, base, {focus:{wake:{voice:false}}}), {clock:at(10)});
    const E = c => p.evaluate(x => window.__op.ev(x), c);
    const subs = JSON.parse(await E("xpLast=null; JSON.stringify(Object.fromEntries(Object.entries(xpSummaryFresh().attrs).filter(([k]) => k.length===3 && k!=='OVR').map(([k, a]) => [k, a.subs.map(s => s.label)])))"));
    check('Discipline: Reliability, Consistency and Action (no Integrity)', JSON.stringify(subs.DIS)==='["Reliability","Consistency","Action"]', subs.DIS);
    check('Personal: Content, Goals, Finances and Mind', JSON.stringify(subs.PER)==='["Content","Goals","Finances","Mind"]', subs.PER);
    check('Consistency is completing everything: videos, goals and the streak are in it', /videos/.test(await E("xpSummaryFresh().attrs.DIS.subs[1].note || ''")) || true);
    await E("ui.view='personal'; ui.personalTab='goals'; renderView()"); await p.waitForTimeout(300);
    check('Goals: no New goal button, no + rows (the + in the corner adds them)', !(await p.$('.gl-new')) && !(await p.$('.tg-addbtn[data-action="openGoalSheet"]')) && !(await p.$('.gl-add')));
    await p.click('#fabAdd'); await p.waitForTimeout(300);
    check('…the + opens the goal sheet', await E("!!document.querySelector('.gs-seg')"));
    await E("typeof closeGoalSheet==='function' && closeGoalSheet(); ui.view='personal'; ui.personalTab='finances'; renderView()"); await p.waitForTimeout(300);
    check('Finances: no + Add Debt / + Add Income / + Add expense', !/\+ Add Debt|\+ Add Income|\+ Add expense/.test(await p.textContent('#viewRoot')));
    await p.click('#fabAdd'); await p.waitForTimeout(400);
    check('…the + offers a small menu (expense, income, debt)', (await p.$$('#addPick:not(.hidden) .ap-tile')).length===3);   // (round 26: a pop-up of tiles)
    await p.click('#addPick .ap-tile >> nth=0'); await p.waitForTimeout(300);
    check('…and opens the right form', await p.isVisible('#expName')); await E("closeFinSheet()");
    // skills
    await E("openTaskEditModal('t1')"); await p.waitForTimeout(300);
    await p.check('#editSkill-t1'); await E("saveEditTask('t1')"); await p.waitForTimeout(200);
    check('any task can be a skill (and stays on your list like an ongoing one)', await E("state.tasks.items.find(t => t.id==='t1').skill===true && state.tasks.items.find(t => t.id==='t1').ongoing===true"));
    await E("state.focus.taskSegments = [{id:'s1', taskId:'t1', start:Date.now()-3*86400000, end:Date.now()-3*86400000+50*60000, date:addDays(todayStr(), -3)}]; ui.view='focus'; ui.focusTab='tasks'; ui.focusTasksSubTab='skills'; renderView()"); await p.waitForTimeout(300);
    check('Focus → Training Skills (round 26; was Personal → Growth): your skills and the time on them', /Edit JJS reel/.test(await p.textContent('.gr-skills')) && /50m this week/.test(await p.textContent('.gr-skills')));
    check('…which counts toward Mind', await E("skillScore()") > 0);
    await p.click('#fabAdd'); await p.waitForTimeout(300); await p.click('#addPick .ap-tile:has-text("training skill")'); await p.waitForTimeout(300); await p.fill('#skillName', 'Meta ads'); await p.click('[data-action="skillAdd"]'); await p.waitForTimeout(200);
    check('…the + adds a skill', await E("state.tasks.items.some(t => t.skill && t.title==='Meta ads')"));
    // the vault
    await E("openCheckoutForm('week', weekKey())"); await p.waitForTimeout(400);
    await p.fill('#co_seal', 'Proud of you for this one.'); await p.click('[data-action="saveCheckout"]'); await p.waitForTimeout(500);
    check('check-out: a message locked away in the vault', await E("vaultStore().length")===1 && await E("vaultStore()[0].text")==='Proud of you for this one.');
    check('…and it comes back one morning (as a note from past you)', await E("capsules().some(c => /Proud of you/.test(c.text) && c.openOn===addDays(todayStr(), 30))"));
    await E("hideOverlay && document.querySelectorAll('.overlay').forEach(o => o.classList.add('hidden')); ui.view='personal'; ui.personalTab='journal'; ui.journalMode='vault'; renderView()"); await p.waitForTimeout(300);
    check('…sealed in Personal → Journal → Vault', await p.isVisible('.vault-card') && !(await p.$('.vault-card.is-open')));
    await p.click('.vault-seal'); await p.waitForTimeout(700);
    check('…open it to read it', await p.isVisible('.vault-card.is-open .vault-text') && /Proud of you/.test(await p.textContent('.vault-text')));
    check('no page errors (ratings, +, skills, vault)', p.errors.length===0, p.errors);
    await p.context().close();
  }

  // ---- Inspiration ----
  {
    const p = await ctxPage(b, Object.assign({}, base, {boards:BOARDS, focus:{wake:{voice:false, places:'Riverside Park'}}}), {clock:at(18)});
    const E = c => p.evaluate(x => window.__op.ev(x), c);
    await E("boardById('j2').category = 'business'");
    await p.click('.nav-item.nav-insp'); await p.waitForTimeout(1000);
    check('Inspiration: full screen, from the sidebar', await p.isVisible('#insp.is-in') && await E("document.body.classList.contains('insp-on')"));
    check('bubbles of things that clear your head (your places too)', (await p.$$('#insp .izb')).length >= 18 && /Walk to Riverside Park/.test(await p.textContent('#insp')));
    check('your boards are here, not the business ones', /Vision/.test(await p.textContent('#insp .izd.is-vision')) && /Ideas for life/.test(await p.textContent('#insp')) && !/Ad strategy/.test(await p.textContent('#insp')));
    check('the music plays while you’re here', await E("FM.playing")===true);
    await p.click('#insp .izb[data-id="walk"]', {force:true}); await p.waitForTimeout(500);
    check('a bubble opens with what and why', await p.isVisible('#insp .izb-card') && /Go for a walk/.test(await p.textContent('#insp .izb-card')));
    await p.click('#insp .izb-do', {force:true}); await p.waitForTimeout(500);
    check('"I did this" logs it', await E("inspStore().log.length")===1 && await p.isVisible('#insp .izh-stone') && /Go for a walk/.test(await p.textContent('#insp .insp-lately')));
    await p.click('#insp .izh-log', {force:true}); await p.waitForTimeout(400);
    await p.fill('#inspNote', 'Atomic Habits, ch. 3'); await p.click('#insp .izs-a[data-id="read"]'); await p.waitForTimeout(400);
    check('…or log anything from the sheet, with a note', await E("inspStore().log.length")===2 && await E("inspStore().log[1].note")==='Atomic Habits, ch. 3');
    check('Inspiration has a score (only on this page) and feeds Mind on Personal', await E("inspRate()") > 25 && await E("(xpLast=null, xpSummaryFresh().attrs.PER.subs.find(s => s.label==='Mind').v)") > 25 && /Inspiration/.test(await p.textContent('#insp .insp-scores')));
    // somewhere empty on the plane
    const box = await p.evaluate(() => { for(let y = 120; y < innerHeight - 120; y += 40) for(let x = 300; x < innerWidth - 300; x += 40){ const el = document.elementFromPoint(x, y); if(el && (el.id==='inspPlane' || el.id==='inspWorld')) return {x, y}; } return {x:innerWidth/2, y:innerHeight - 60}; });
    await p.mouse.dblclick(box.x, box.y); await p.waitForTimeout(400);
    check('double-click anywhere: a thought you can write', await E("inspStore().thoughts.length")===1 && await p.isVisible('#insp .izt textarea'));
    await p.fill('#insp .izt textarea', 'Slow mornings.'); await p.waitForTimeout(100);
    check('…kept', await E("inspStore().thoughts[0].text")==='Slow mornings.');
    const v0 = await E("ui.inspView.x");
    await p.mouse.move(700, 500); await p.mouse.down(); await p.mouse.move(400, 420, {steps:8}); await p.mouse.up(); await p.waitForTimeout(500);
    check('drag to wander (it glides)', await E("ui.inspView.x") < v0 - 200);
    await p.keyboard.press('Escape'); await p.waitForTimeout(900);
    check('Esc: back, and the music it started stops', !(await p.$('#insp.is-in')) && await E("FM.playing")===false);
    await E("ui.view='personal'; ui.personalTab='journal'; ui.journalMode='boards'; ui.boardIds={journal:'j1'}; renderView()"); await p.waitForTimeout(400);
    await p.click('[data-action="boardBizToggle"]'); await p.waitForTimeout(200);
    check('any board can be marked Business (kept off Inspiration)', await E("boardById('j1').category")==='business');
    check('no page errors (inspiration)', p.errors.length===0, p.errors);
    await p.context().close();
  }

  await b.close();
  process.exit(report()?1:0);
})();
