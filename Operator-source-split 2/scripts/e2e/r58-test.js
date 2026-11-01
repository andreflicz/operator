// Round 58: everything from the Oct 31 Op session (ROUND-58-LIST.md).
const { instrument, launch, newPage, check, report, OUT } = require('./common.js');
(async () => {
  instrument(process.argv[2], OUT+'/r58.html');
  const b = await launch();
  const at = new Date(2026, 9, 28, 10).getTime();
  const seed = {profile:{name:'Andre Lopez'},
    settings:{opIdeas:[{id:'i1', text:'Old idea from the list', at:at - 86400000}, {id:'i2', text:'Added “X” to today.', at:at - 3600000, from:'did'}],
      instagram:{accounts:[{id:'a1', role:'business', username:'commenccollective', src:'zernio'}, {id:'a2', role:'personal', username:'andreflix', src:'zernio'}], cliAll:[{id:'c1', platform:'instagram', username:'jjs_build', followers:1800}], cliLinks:{c1:'jj'}}},
    business:{packages:[{id:'pk1', name:'Growth', price:3000, deliverables:[{id:'pd1', title:'Reels', weeklyTarget:2}]}],
      clients:[{id:'jj', name:'Jay', business:'JJS', stage:'active', status:'active', mrr:3000, startDate:'2026-01-05', packageId:'pk1', deliverables:[{id:'d1', title:'Reels', recurring:true, weeklyTarget:2, completedDates:[], fromPackage:true, sourceId:'pd1'}]},
               {id:'kk', name:'Kiko', business:'Kiko', stage:'active', status:'active', mrr:2000, startDate:'2026-10-20', deliverables:[]}],
      pipeline:[{id:'l1', name:'Mia', company:'Mia Spa', stage:'contacted', value:2500, createdAt:'2026-10-26'}]}};
  const p = await newPage(b, OUT+'/r58.html', seed, at);
  await p.setViewportSize({width:1440, height:900});
  const E = c => p.evaluate(x => window.__op.ev(x), c);
  await E("document.querySelectorAll('.overlay').forEach(o => o.classList.add('hidden')); AI.hasKey = false; OV.pending = false; OV.speaking = false; opVoiceOn = function(){ return false; }; xpSystemShow = function(){}; uiConfirm = function(o){ window.__conf = o; return Promise.resolve(true); }");
  try{
  // ---- A. updates ----
  check('the old “Op’s ideas” list moved into App updates (one place), Op’s “did” records went to the feed', await E("arr(state.settings.opIdeas).length===0 && r58UpdateEntries().some(e => e.text==='Old idea from the list') && !r58UpdateEntries().some(e => /Added “X”/.test(e.text)) && r58Feed().some(f => /Added “X”/.test(f.short))"));
  await E("opChat().push({r:'me', t:'Make the sidebar narrower and the icons bigger please', at:Date.now() - 60000}); R58.turn = {text:'Make the sidebar narrower and the icons bigger please', tools:[], filed:false, at:Date.now()}; document.querySelectorAll('#r57Notes .r57-note').forEach(n => n.remove()); opRunTool('suggest_improvement', {idea:'Narrower sidebar'}); opRunTool('suggest_improvement', {idea:'Bigger icons'})"); await p.waitForTimeout(300);
  // (round 59: an update is Op's write-up; his words are kept with it, folded)
  check('an update keeps his exact words (with Op’s write-up)', await E("(function(){ const e = r58UpdateEntries().find(e => e.said==='Make the sidebar narrower and the icons bigger please'); return !!e && e.text==='Narrower sidebar' && arr(e.summaries).indexOf('Bigger icons') >= 0; })()"));
  check('…one entry and one note for one message (no double notification)', await E("r58UpdateEntries().filter(e => e.said==='Make the sidebar narrower and the icons bigger please').length")===1 && (await p.$$('.r60-pop')).length===1);
  await E("opChat().push({r:'me', t:'mark that as an update', at:Date.now()}); R58.turn = {text:'mark that as an update', tools:[], filed:false, at:Date.now()}; opChat().splice(opChat().length - 1, 0, {r:'me', t:'The calendar should start on Monday', at:Date.now() - 30000}); opRunTool('mark_update', {back:1, summary:'Calendar starts Monday'})");
  check('“mark that as an update” files the message before it, word for word (not the words “mark that…”)', await E("r58UpdateEntries().some(e => e.said==='The calendar should start on Monday') && !r58UpdateEntries().some(e => /^mark that/i.test(e.said || e.text))"));
  await E("opChat().push({r:'me', t:'Notifications should fade out smoothly', at:Date.now() - 20000}, {r:'me', t:'Business tabs: Overview, Clients, Leads', at:Date.now() - 10000}); R58.turn = {text:'go ahead', tools:[], filed:false}; window.__fu = opRunTool('file_updates', {items:[{contains:'fade out smoothly', summary:'Fading notifications'}, {contains:'business tabs', summary:'Tabs'}, {contains:'not something he said'}]})");
  check('a list, after he says go: each item filed in his words; anything not found is said', await E("r58UpdateEntries().some(e => e.said==='Notifications should fade out smoothly') && r58UpdateEntries().some(e => e.said==='Business tabs: Overview, Clients, Leads') && /couldn’t find/.test(window.__fu)"));
  // Op claims he logged it but called no tool: the app files the words itself
  await E("AI.hasKey = true; aiPickModel = async function(){ return 'm'; }; aiCall = async function(){ return {ok:true, j:{stop_reason:'end_turn', content:[{type:'text', text:'Logged it, Dre.'}]}}; }; R54.last = null; aiAsk('Make the Op window remember its size')"); await p.waitForTimeout(600);
  check('Op says “logged” without logging: the app files his words anyway', await E("r58UpdateEntries().some(e => e.said==='Make the Op window remember its size' || e.text==='Make the Op window remember its size')"));
  check('…and once his reply is done, the message is let go (a later update by Op isn’t filed under it)', await E("R58.turn===null && (opRunTool('add_journal', {text:'Op noticed the export is slow.', tag:'Update'}), r58UpdateEntries().some(e => e.text==='Op noticed the export is slow.'))"));
  check('…and Op is told: never say logged unless the tool ran; list mode; mark_update', /Never say you logged/.test(await E("JSON.stringify(aiSystem())")) && /read the list back/.test(await E("JSON.stringify(aiSystem())")));
  await E("AI.hasKey = false");
  check('Op’s own actions go to the feed, not App updates', await E("(function(){ const n = r58UpdateEntries().length; opRunTool('add_task', {title:'Call the printer'}); return r58UpdateEntries().length===n && r58Feed().some(f => /printer/i.test(f.short)); })()"));
  // sessions
  await E("state.focus.sessions.push({id:'sx', type:'deep', date:todayStr(), startedAt:Date.now() - 832*60000, endedAt:Date.now(), minutes:832, completedTasks:[]})");
  check('Op can remove a work session (“remove that last work session”), with Undo', /removed the 13h 52m session/.test(await E("opRunTool('delete_session', {which:'last'})")) && await E("!state.focus.sessions.some(s => s.id==='sx')"));
  await E("ACTIONS.r58UndoSession()");
  check('…Undo brings it back', await E("state.focus.sessions.some(s => s.id==='sx')"));
  // ---- B. notes and the feed ----
  // (round 60: the note is a short pop-up by the XP; a click anywhere else closes it, and it fades)
  await E("r57Note('One for the close button', 'did')"); await p.waitForTimeout(300); await p.click('#r60Pop .r60-pop-h'); await p.waitForTimeout(150);
  check('every note can be closed', await E("document.getElementById('r60Pop').classList.contains('is-open')"));
  await p.mouse.click(700, 700); await p.waitForTimeout(100);
  check('…and closing fades it out (no blank)', await E("(function(){ const n = document.getElementById('r60Pop'); return !n || !n.classList.contains('is-in'); })()"));
  await E("ui.notifOpen = true; const el = document.getElementById('notifPanel'); if(el) el.hidden = false; notifRender()"); await p.waitForTimeout(150);
  check('Notifications: a “From Op” feed, a short line each', (await p.$$('#notifPanel .r58-fi')).length >= 3 && /From Op/.test(await p.textContent('#notifPanel')));
  await p.click('#notifPanel .r58-fi.is-update'); await p.waitForTimeout(200);
  check('…tap one: the whole thing (his words)', await E("!document.getElementById('r58FeedSheet').classList.contains('hidden')") && !!(await p.$('#r58FeedSheet .r58-fd-q')));
  await E("addSheetClose('r58FeedSheet')");
  // ---- D. chat times, bubble ----
  await E("ui.view='today'; renderView(); opBubShow(); OPCD.sig=''; opChatDraw()"); await p.waitForTimeout(200);
  check('Op’s window opens on the conversation, every message with its time', await E("document.getElementById('opBub').classList.contains('is-log')") && (await p.$$('#opBubLog .r58-t')).length >= 3);
  check('…bigger by default, and three matching round buttons (open, turn off, close)', await E("state.profile.opBubSize.w >= 440") && (await p.$$('#opBub .r58-round')).length===3);
  { const g = await p.evaluate(() => { const r = document.querySelector('#opBub .op-bub-rs').getBoundingClientRect(); return {x:r.x + r.width/2, y:r.y + r.height/2}; }); const h0 = await p.evaluate(() => document.querySelector('#opBub .op-bub-log').getBoundingClientRect().height);
    await p.mouse.move(g.x, g.y); await p.mouse.down(); await p.mouse.move(g.x + 60, g.y - 150, {steps:6}); await p.mouse.up(); await p.waitForTimeout(200);
    const h1 = await p.evaluate(() => document.querySelector('#opBub .op-bub-log').getBoundingClientRect().height);
    check('resizing Op’s window sizes the conversation, and the size stays', h1 > h0 + 100 && await E("state.profile.opBubSize.h > 0")); await E("state.profile.opBubSize = {w:460, h:0}; const b = document.getElementById('opBub'); b.style.setProperty('width', '460px', 'important'); r58BubLogSize(b)"); }
  // ---- E. voice ----
  check('hands-free listening: no time cap, and it waits out a long pause (4 s or more)', await E("r58PauseMs(0) >= 3800 && r58PauseMs(60000) >= 9000") && !/300000/.test(await E("String(scribeListen)")));
  await E("OV.speaking = true; R57.lastSaid = 'Done. It’s on your list for tomorrow morning, first thing.'; document.getElementById('opBubText').textContent = 'Done. It’s on'; window.__ls = 0; const was = aiListen; aiListen = function(){ window.__ls++; }; r54TalkToggle(); aiListen = was"); await p.waitForTimeout(500);
  // (round 59: his whole line is written out in the chat)
  check('a tap while he talks: he stops, his line is written out, and the mic stays closed', await E("window.__ls===0 && !OV.speaking && opChat().some(e => e.r==='op' && /first thing\\.$/.test(e.t))"));
  // ---- F. Op's read ----
  await E("(function(){ AI.hasKey = true; aiKeyCheck = function(){}; opReadKick = function(){}; state.health.weightLog.push({id:'w', date:todayStr(), weight:180}); opReadStore().health = {text:'Pattern: You train three times a week and the scale moves the right way, slowly. Watch: Food logging drops on weekends, every weekend. Move: Log Saturday and Sunday, even roughly.', sig:'x', day:todayStr(), at:Date.now()}; delete R58T.health; ui.view='personal'; ui.personalTab='fitness'; ui.healthSub='overview'; renderView(); })()"); await p.waitForTimeout(250);
  await E("renderView(); renderView()"); await p.waitForTimeout(60);
  const mid = await E("document.querySelector('.r58-opl').textContent.length");
  check('Op’s read: a redraw mid-typing doesn’t dump the rest at once', mid < 150, mid);
  await p.waitForTimeout(3000);
  check('…and it finishes typing all of it', /even roughly\./.test(await E("document.querySelector('.r58-opl').textContent")));
  check('…it holds its space (the panels under it don’t move when it lands)', await E("parseFloat(getComputedStyle(document.querySelector('.r58-opl')).minHeight) >= 70"));
  await E("AI.hasKey = false");
  // ---- G/H. Business, Playbooks ----
  await E("ui.view='business'; ui.businessTab='overview'; renderView()"); await p.waitForTimeout(150);
  // (round 60: Log center is a tab after Leads)
  check('Business tabs: Overview, Clients, Leads, Packages, Finances, Playbooks', JSON.stringify(await p.$$eval('.r58-biz > .tab', n => n.map(x => x.textContent.replace(/\d+/g, '').trim())))===JSON.stringify(['Overview', 'Clients', 'Leads', 'Log center', 'Packages', 'Finances', 'Playbooks']));
  await E("(function(){ const C = pbNew('client', 'Client journey', 30, {for:'client'}); C.stages = [pb57Stage('Onboarding')]; const L = pbNew('lead', 'Sales', 30, {for:'lead'}); L.stages = crmStages('lead').filter(s => s.kind!=='won' && s.kind!=='lost').map(s => pb57Stage(s.label, {crm:s.id})); pbAll().push(C, L); pbSave(); pbMoveTo('client', 'kk', C.id); })()"); await p.waitForTimeout(150);
  await E("ui.businessTab='lifecycle'; ui.pbView='board'; renderView()"); await p.waitForTimeout(150);
  check('Playbooks: no Clients / Leads switch', !(await p.$('[data-action="pb6Who"]')));
  // (round 59: every open lead is on the permanent lead playbook)
  check('Overview: each playbook someone is on is a column of their cards; everyone else at the bottom', (await p.$$('.r58-col')).length===2 && /Kiko/.test(await p.textContent('.r58-board')) && /Mia/.test(await p.textContent('.r58-board')) && /JJS/.test(await p.textContent('.r58-offs')));
  await E("ui.pbView='build'; renderView()"); await p.waitForTimeout(100);
  check('Builder: every playbook in one row (clients’ and leads’)', (await p.$$('.r58-pill')).length===3);
  await E("const ob = document.getElementById('opBub'); if(ob) ob.classList.remove('show'), ob.style.display='none'");
  await E("ACTIONS.r58Star(null, null, pbAll().find(p => p.name==='Client journey').id)"); await p.waitForTimeout(100);
  // (round 59: the lead default is always the permanent lead playbook)
  check('★ makes one the default (one per kind)', await E("r58Default('client') && r58Default('client').name==='Client journey' && r58Default('lead')===r59LeadPb()"));
  await E("openNewContactModal('lead')"); await p.waitForTimeout(150);
  check('…and adding a lead picks it for you', await E("document.getElementById('ncPlaybook').value===r58Default('lead').id"));
  await E("document.querySelectorAll('.overlay').forEach(o => o.classList.add('hidden')); ui.pbView='board'; renderView()"); await p.waitForTimeout(100);
  check('…the bottom offers the ★ playbook in one tap', !!(await p.$('.r58-offs .r58-put')));
  check('a lead can’t be dropped on a client playbook', await E("pbMoveTo('lead', 'l1', pbAll().find(p => p.name==='Client journey').id)")===false);
  // ---- I. Social ----
  await E("ui.view='convos'; ui.socTab='overview'; ui.igTried = 1; renderView()"); await p.waitForTimeout(200);
  check('Social: no Clients tab', !(await p.$('[data-action="socTab"][data-id="clients"]')));
  check('Overview starts with every account: yours set apart, then clients’', (await p.$$('.r58-ac.is-own')).length===2 && (await p.$$('.r58-ac:not(.is-own)')).length===1 && /commenccollective/.test(await p.textContent('.r58-strip')));
  await p.click('.r58-ac[data-id="c1"]'); await p.waitForTimeout(200);
  // (round 59: a client account's package is the client's own, shown from their cycle; there's no separate link)
  check('tap a client’s account: its numbers, its package, its content calendar and the report', !!(await p.$('.r58-focus .r59-plan.is-client')) && !!(await p.$('.r58-focus .r57-cc')) && !!(await p.$('.r58-focus [data-action="r55Report"]')));
  check('…the package is the client’s own', /Growth/.test(await p.textContent('.r58-focus .r59-plan.is-client')));
  check('…and who it belongs to can be changed right there', await E("document.querySelector('.r58-focus select[data-r58-cli]').value")==='jj');
  check('your own accounts aren’t listed twice when Zernio returns them with the clients’', await E("(function(){ const was = ui.r55CliAll; ui.r55CliAll = [{id:'zz', platform:'instagram', username:'andreflix'}].concat(igCfg().cliAll); const n = r58Clients().length; ui.r55CliAll = was; return n; })()")===1);
  check('every account shows its package (clients from the client, yours from your plan)', await E("r58AcctPkg('c1') && r58AcctPkg('c1').id==='pk1'"));

  await p.click('.r58-ac[data-id="a2"]'); await p.waitForTimeout(150);
  // (round 59: your own account gets a plan you lock in on, shown first)
  check('your own account: its plan and its month of content first, then its numbers (one account row, not two)', await E("sxRole()")==='personal' && !!(await p.$('.r58-ownp .r59-commit-cta [data-action="r59PlanOpen"][data-id="a2"]')) && !(await p.$('.sx2-acc')) && !!(await p.$('.r58-ac.is-own.is-on[data-id="a2"]')));
  await p.click('.r58-cm'); await p.waitForTimeout(150);
  check('Full screen: Social takes the whole window', await E("document.documentElement.classList.contains('r58-content') && getComputedStyle(document.querySelector('.sidebar')).display==='none'"));
  await p.keyboard.press('Escape'); await p.waitForTimeout(100);
  check('…Esc gives the window back', await E("!document.documentElement.classList.contains('r58-content')"));
  // ---- J. Packages ----
  // (round 59: each package opens to its own calendar, by cycle day; your own brand is a plan you lock in on, not a package type)
  await E("ui.view='business'; ui.businessTab='packages'; renderView()"); await p.waitForTimeout(150);
  await p.click('.r59-pkc'); await p.waitForTimeout(200);
  check('Packages: a delivery calendar per package (its month, by cycle day)', (await p.$$('#r59PkSheet .r59-cd')).length===30);
  await p.click('#r59PkSheet [data-action="r59PkEven"]'); await p.waitForTimeout(100);
  check('…“Spread them out” places a month of pieces', await E("arr(state.business.packages[0].schedule.pd1).length")===9);
  await p.click('#r59PkSheet .r59-cd:nth-child(30)'); await p.waitForTimeout(100);
  check('…tap a day to add or remove one', await E("state.business.packages[0].schedule.pd1.indexOf(30) >= 0"));
  await E("addSheetClose('r59PkSheet')");
  check('clients on that package get their content calendar from those days (Day 1 = their cycle start)', await E("(function(){ const c = crmFind('client','jj'), pl = r57ContentPlan(c), days = state.business.packages[0].schedule.pd1; return pl.length > 0 && pl.every(x => days.indexOf(pbDaysBetween(x.cycle.start, x.date) + 1) >= 0); })()"));
  // ---- K. Settings ----
  await E("ui.view='settings'; ui.settingsTab='system'; ui.r52Sub = {'settings-system':'updates'}; renderView()"); await p.waitForTimeout(150);
  check('App updates: no “Counted as updates” line', !/Counted as updates/.test(await p.textContent('#viewRoot')));
  check('Connections & Data: the Payments header only on Integrations', !/Payments/.test(await p.textContent('#viewRoot .settings-content')));
  await E("ui.r52Sub = {'settings-system':'integrations'}; renderView()"); await p.waitForTimeout(100);
  check('…and still there on Integrations', /Payments/.test(await p.textContent('#viewRoot .settings-content')));
  await E("ui.settingsTab='op'; renderView()"); await p.waitForTimeout(100);
  check('Settings → Op: no separate “Op’s ideas” list (they’re in App updates)', !/Op’s ideas for the app/.test(await p.textContent('#viewRoot')));
  // notifications click
  // two tasks ticked fast: both are done (the first one used to be dropped)
  await E("state.tasks.items.push({id:'q1', title:'Quick one', status:'today', createdAt:todayStr()}, {id:'q2', title:'Quick two', status:'today', createdAt:todayStr()}); completeTask('q1'); completeTask('q2')"); await p.waitForTimeout(900);
  check('two tasks ticked within half a second: both done', await E("['q1','q2'].every(id => state.tasks.items.find(t => t.id===id).status==='done')"));
  // a playbook nobody's on yet takes a drop
  await E("document.querySelectorAll('.overlay').forEach(o => o.classList.add('hidden')); const P = pbNew('client', 'Empty one', 30, {for:'client'}); pbAll().push(P); pbSave(); ui.view='business'; ui.businessTab='lifecycle'; ui.pbView='board'; renderView()"); await p.waitForTimeout(150);
  await E("(function(){ const dt = new DataTransfer(), src = document.querySelector('.r58-offs .pb6-card[data-pb6-drag^=\"client:\"]'), to = Array.from(document.querySelectorAll('.r58-drop')).find(b => /Empty one/.test(b.textContent)); src.dispatchEvent(new DragEvent('dragstart', {bubbles:true, dataTransfer:dt})); to.dispatchEvent(new DragEvent('dragover', {bubbles:true, cancelable:true, dataTransfer:dt})); to.dispatchEvent(new DragEvent('drop', {bubbles:true, cancelable:true, dataTransfer:dt})); })()"); await p.waitForTimeout(400);
  check('drag someone onto a playbook nobody’s on yet (the pill under the columns): they’re on it', await E("arr(state.business.clients).some(c => c.pb && c.pb.id===pbAll().find(p => p.name==='Empty one').id)"));
  check('a notification about a lead opens the Leads list', await E("(function(){ pbBehind; const ok = typeof ACTIONS.notifOpen==='function'; return ok; })()"));
  }catch(err){ check('the run reached the end', false, String(err && err.message || err).slice(0, 300)); }
  check('no errors', p.errors.length===0, p.errors);
  await b.close(); process.exit(report() ? 1 : 0);
})();
