// Round 66: Andre's updates (ROUND-66-LIST.md).
const { instrument, launch, newPage, check, report, OUT } = require('./common.js');
(async () => {
  instrument(process.argv[2], OUT+'/r66.html');
  const b = await launch();
  const at = new Date(2026, 9, 28, 10).getTime();
  const p = await newPage(b, OUT+'/r66.html', {profile:{name:'Andre Lopez'}}, at);
  await p.setViewportSize({width:1440, height:900});
  const E = c => p.evaluate(x => window.__op.ev(x), c);
  await E("document.querySelectorAll('.overlay').forEach(o => o.classList.add('hidden')); demoSeed(); AI.hasKey = false; xpSystemShow = function(){}; uiConfirm = function(){ return Promise.resolve(true); }; aiKeyCheck = function(){}; opReadKick = function(){}; opVoiceOn = function(){ return false; }; renderView()"); await p.waitForTimeout(300);
  try{
  // ---- A1. A playbook task carries its step's name ----
  await E("(function(){ const P = pbNew('client', 'Names test', 30, {for:'client'}); const st = pb57Stage('Onboarding', {days:14}); P.stages = [st]; pbAll().push(P); pbSave(); const c = state.business.clients[0]; pbStart('client', c, P.id, todayStr(), true); ui.view='business'; ui.businessTab='lifecycle'; ui.pbView='build'; ui.pbSel = P.id; ui.pb57Stage = st.id; renderView(); ACTIONS.pb57StepAdd(); pbSync(); })()"); await p.waitForTimeout(200);
  check('a step still called “New step” makes no task yet', await E("!state.tasks.items.some(t => t.master && t.master.kind==='pb' && t.master.pb===pbAll().find(p => p.name==='Names test').id)"));
  await E("(function(){ const P = pbAll().find(p => p.name==='Names test'); P.stages[0].steps[0].title = 'Send the welcome pack'; pbSave(); pbSync(); })()");
  check('…named, its task has the step’s name', await E("state.tasks.items.some(t => t.master && t.master.kind==='pb' && t.title==='Send the welcome pack')"));
  await E("(function(){ const P = pbAll().find(p => p.name==='Names test'); P.stages[0].steps[0].title = 'Send the welcome kit'; pbSave(); pbSync(); })()");
  check('…rename the step: the task follows', await E("state.tasks.items.some(t => t.master && t.master.kind==='pb' && t.title==='Send the welcome kit')"));
  await E("(function(){ const t = state.tasks.items.find(t => t.title==='Send the welcome kit'); t.title = 'My own name for it'; const P = pbAll().find(p => p.name==='Names test'); P.stages[0].steps[0].title = 'Welcome kit v2'; pbSave(); pbSync(); })()");
  check('…but a task you renamed keeps your name', await E("state.tasks.items.some(t => t.title==='My own name for it')"));
  // ---- A2/A3. When they finish; no "Starts when a lead reaches" ----
  await E("(function(){ const P = pbAll().find(p => p.name==='Names test'); P.stages.push(pb57Stage('Monthly', {days:30})); pbSave(); ui.pbSel = P.id; ui.r66EndOpen = true; renderView(); })()"); await p.waitForTimeout(200);
  check('“When they finish” offers: they’re done, back to any stage, on to another playbook', (await p.$$('.r66-endpop .r66-endo')).length >= 3 && /Back to a stage/.test(await p.textContent('.r66-endpop')));
  const stId = await E("pbAll().find(p => p.name==='Names test').stages[1].id");
  await p.click('.r66-endpop [data-id$="|stage:'+stId+'"]'); await p.waitForTimeout(200);
  check('…pick a stage: that’s where they go after the last one', await E("pbAll().find(p => p.name==='Names test').r66End.stage==='"+stId+"'") && /Back to Monthly/.test(await p.textContent('.r66-endb')));
  await E("ui.pbSel = pbAll().find(p => pbFor(p)==='lead').id; renderView()"); await p.waitForTimeout(150);
  check('no “Starts when a lead reaches” (every lead is on the lead playbook already)', !/Starts when a lead reaches/.test(await p.textContent('#viewRoot')) && await E("state.business.pipeline.filter(leadIsOpen).every(l => l.pb && l.pb.id)"));
  // ---- B4. Calendar: all clients ----
  await E("ui.view='calendar'; ui.r60CalPick = true; renderView()"); await p.waitForTimeout(200);
  await p.click('[data-action="r60CalSet"][data-id="__all"]'); await p.waitForTimeout(250);
  check('Calendar: “All clients” shows every client’s things at once', await E("ui.r59CalClient==='__all'") && /All clients/.test(await p.textContent('.r60-calb')) && await E("cxMonthCardHtml().indexOf('All clients &middot;') >= 0 && document.querySelectorAll('.cx-peek').length > 0"));
  // ---- C. Challenges ----
  await E("ui.view='personal'; ui.personalTab='streaks'; renderView()"); await p.waitForTimeout(250);
  check('Streaks: a quote up top, challenges by level (Warm-up, Build, Commit, Hard), each with its XP', !!(await p.$('.r66-hero .r66-q p')) && (await p.$$('.r66-lvl')).length===4 && /Monk mode 90/.test(await p.textContent('.r66-lvls')) && /\+[\d,]+ XP/.test(await p.textContent('.r66-pc')));
  await p.click('.r66-pc[data-id="cold30"]'); await p.waitForTimeout(200);
  await p.click('#r63Sheet [data-action="r66Next"]'); await p.waitForTimeout(200);
  check('Starting one: a commitment, the rules read back, why, what it’s worth', /for the next/.test(await p.textContent('.r66-oath')) && /2-minute cold shower/.test(await p.textContent('.r66-rules')) && !!(await p.$('#r66Why')) && /XP/.test(await p.textContent('.r66-stake')));
  const hb = await (await p.$('.r66-hold')).boundingBox();
  await p.mouse.move(hb.x + 40, hb.y + 20); await p.mouse.down(); await p.waitForTimeout(300); await p.mouse.up(); await p.waitForTimeout(200);
  check('…no why, no lock-in', await E("!r63Active().some(c => c.preset==='cold30')"));
  await p.fill('#r66Why', 'I want to prove I can do hard things every day.'); await p.waitForTimeout(80);
  await p.mouse.move(hb.x + 40, hb.y + 20); await p.mouse.down(); await p.waitForTimeout(400); await p.mouse.up(); await p.waitForTimeout(150);
  check('…let go early: not locked in', await E("!r63Active().some(c => c.preset==='cold30')"));
  await p.mouse.move(hb.x + 40, hb.y + 20); await p.mouse.down(); await p.waitForTimeout(1900); await p.mouse.up(); await p.waitForTimeout(300);
  check('…hold it: locked in, with your why kept', await E("r63Active().some(c => c.preset==='cold30' && /hard things/.test(c.why))") && !!(await p.$('.r66-locked')));
  await p.waitForTimeout(3600);
  check('…and the tab shows what finishing is worth (XP, the level it takes you to, days left)', /XP/.test(await p.textContent('.r66-worth')) && /Level \d+/.test(await p.textContent('.r66-worth')));
  await E("(function(){ const c = r63Active().find(c => c.preset==='cold30'); c.days = 2; c.start = addDays(todayStr(), -1); c.log = {}; c.log[c.start] = c.rules.map(r => r.id); c.log[todayStr()] = c.rules.map(r => r.id); window.__x0 = r66XpLog().length; r63Settle(); })()");
  check('finishing a challenge pays XP (once)', await E("r66XpLog().some(e => e.k==='challenge' && /Cold 30/.test(e.why))") && await E("(r63Settle(), r66XpLog().filter(e => e.k==='challenge').length)")===1);
  // ---- H18. The app asks ----
  await E("delete state.profile.r66Me; delete state.profile.r66SetupLater; ui.view='today'; renderView()"); await p.waitForTimeout(200);
  check('Today asks to set you up (a card, not a pop-up in your way)', !!(await p.$('.r66-ask')));
  await p.click('.r66-ask [data-action="r66SetupOpen"]'); await p.waitForTimeout(200);
  await p.selectOption('[data-r66-d="country"]', 'United States'); await p.click('#r66Setup .hs-go'); await p.waitForTimeout(150);
  await p.click('#r66Setup [data-action="r66Hol"][data-id="christmas"]'); await p.click('#r66Setup [data-action="r66Hol"][data-id="thanksgiving"]'); await p.waitForTimeout(100);
  await p.click('#r66Setup .hs-go'); await p.waitForTimeout(150);
  await p.click('#r66Setup [data-id="ext|1"]'); await p.waitForTimeout(100);
  await p.click('#r66Setup .hs-go'); await p.waitForTimeout(250);
  check('…where you live, your holidays, time off: saved', await E("state.profile.r66Me && state.profile.r66Me.country==='United States' && state.profile.r66Me.hols.indexOf('christmas') >= 0 && state.profile.r66Me.ext===1"));
  check('your holidays (and the day around them) are days off: the day streak doesn’t break', await E("isDayOff('2026-12-25') && isDayOff('2026-12-26') && !isDayOff('2026-12-28') || (isDayOff('2026-12-25') && isDayOff('2026-12-24'))"));
  check('…holidays you don’t celebrate don’t take over the app (Halloween is off here)', await E("holToday('2026-10-31')===null && holToday('2026-12-25')==='christmas'"));
  // ---- D. Widgets ----
  await E("const O = state.dashboardPanels.order; ['business', 'tasks', 'why'].forEach(k => { const i = O.indexOf(k); if(i >= 0) O.splice(i, 1); }); O.splice(O.indexOf('personalStats') + 1, 0, 'business', 'tasks', 'why'); const S = r60Spans(); S.business = 4; S.tasks = 4; S.why = 4; renderView()"); await p.waitForTimeout(300);
  check('widgets side by side stay a sensible size (none runs a screen tall)', await E("['business', 'tasks', 'why'].every(k => document.querySelector('.r60w[data-wid=\"'+k+'\"]').getBoundingClientRect().height <= 700)"));
  check('…Today’s tasks, small: what’s on and what’s next (not the whole list)', await E("[...document.querySelectorAll('.r60w[data-wid=\"tasks\"] .task-card')].every(c => getComputedStyle(c).display==='none')"));
  check('Your why is small by default: short chips that wrap inside it', await E("(function(){ const w = document.querySelector('.r60w[data-wid=\"why\"]').getBoundingClientRect(); return [...document.querySelectorAll('.why-panel .why-item')].every(i => i.getBoundingClientRect().right <= w.right + 1); })()"));
  // ---- E. The vault ----
  await E("vaultStore().push({id:'v1', kind:'week', key:'2026-09-07', label:'The week of Sep 7', text:'Old note', at:new Date(2026, 8, 13).getTime()}); delete state.settings.r66VaultFixed; vaultStore().forEach(m => { delete m.openOn; })");
  check('Vault: week and month notes are sealed, including the old ones', await E("vaultItems().filter(m => m.kind==='week' || m.kind==='month').every(m => m.locked && m.openOn > todayStr())"));
  await E("ui.view='personal'; ui.personalTab='journal'; ui.journalMode='vault'; renderView()"); await p.waitForTimeout(200);
  check('…they say when they open, and the words stay hidden', /Week note · opens/.test(await p.textContent('#viewRoot')) && !/Old note/.test(await p.textContent('#viewRoot')));
  // ---- F. Notifications ----
  await E("ui.view='settings'; ui.settingsTab='notif'; renderView()"); await p.waitForTimeout(200);
  check('Settings → Notifications: each kind on or off, and how it shows up', (await p.$$('.r66-nr')).length===8 && (await p.$$('.r66-nr [data-action="r66NHow"]')).length===24);
  await p.click('.r66-nr [data-action="r66NOn"][data-id="deadline"]'); await p.waitForTimeout(150);
  check('…turn deadlines off: they leave the list', await E("!notifList().some(n => n.kind==='deadline')"));
  await p.click('.r66-nr [data-action="r66NOn"][data-id="deadline"]'); await p.waitForTimeout(150);
  await E("(function(){ igCfg().accounts = [{id:'me', role:'personal', username:'andre'}]; igCfg().cache = {data:{me:{followers:1000, posts:[{id:'p1', likes:100, comments:5, shares:1, cap:'Day in the life'}]}}}; state.settings.r66Soc = null; r66SocialTick(); igCfg().cache.data.me = {followers:1010, posts:[{id:'p1', likes:800, comments:12, shares:4, cap:'Day in the life'}]}; window.__xp0 = r66XpLog().filter(e => e.k==='social' || e.k==='viral').reduce((a, e) => a + e.xp, 0); r66SocialTick(); })()");
  check('your page: likes, comments, shares and followers become a notification', await E("notifList().some(n => n.kind==='social' && /likes/.test(n.sub) && /comment/.test(n.sub) && /follower/.test(n.sub))"));
  check('…a post that takes off gets its own', await E("notifList().some(n => /taking off/.test(n.title))"));
  check('…and XP: small and steady, plus a bonus for the post that took off', await E("r66XpLog().some(e => e.k==='social' && e.xp > 0) && r66XpLog().some(e => e.k==='viral' && e.xp===R66_XP.viral)"));
  check('the XP guide says so', /Your page and your challenges/.test(await E("r43GuideHtml()")));
  await E("(function(){ const L = r53AdLedger(); const c = state.business.clients[0]; L.zz = {name:'Lead form', acct:'AC1', spend:200, leads:4, imp:10000, clicks:150, currency:'USD'}; adLinks().zz = c.id; state.settings.r66AdSnap = null; r66AdsTick(); L.zz.leads = 7; r66AdsTick(); })()");
  check('a client gets new leads from their ad campaign: a notification', await E("notifList().some(n => n.kind==='ads' && /got 3 new leads/.test(n.title))"));
  await E("r66Show({key:'k1', icon:'x', title:'Hello banner', sub:'up top'}, 'banner'); r66Show({key:'k2', icon:'x', title:'Hello corner', sub:'top right'}, 'corner')"); await p.waitForTimeout(500);
  check('…shown the way you chose: a banner up top, or a note at the top right', await E("(function(){ const b = document.querySelector('#r66Ban'), t = document.querySelector('#r66Toasts .r66-toast'); if(!b || !t) return false; const br = b.getBoundingClientRect(), tr = t.getBoundingClientRect(); return br.top < 60 && Math.abs((br.left + br.right)/2 - 720) < 30 && tr.right > 1400 && tr.top < 200; })()"));
  await E("ui.view='today'; renderView(); dockRefresh()"); await p.waitForTimeout(400);
  check('the bell is in the player at the top right', await E("(function(){ const b = document.querySelector('#musicDock .r66-bell'); if(!b) return false; const r = b.getBoundingClientRect(); return r.top < 80 && r.left > 1100; })()") && await E("getComputedStyle(document.getElementById('notifBell')).display==='none'"));
  await p.click('#musicDock .r66-bell'); await p.waitForTimeout(250);
  check('…tap it: the list drops from the top right', await E("(function(){ const n = document.getElementById('notifPanel'); if(!n || n.hidden) return false; const r = n.getBoundingClientRect(); return r.right > 1380 && r.top < 120; })()"));
  await E("ACTIONS.toggleNotifs()");
  // ---- G. The report ----
  await E("(function(){ const c = state.business.clients[0]; c.journal = [{id:'j1', date:todayStr(), text:'Reels on the new menu did 3x the usual views.'}]; ACTIONS.r66RepOpen(null, null, c.id); })()"); await p.waitForTimeout(300);
  check('the client report: a designed page (cover, numbers, content, ads)', !!(await p.$('#r66Doc .r66d-cover h1')) && (await p.$$('#r66Doc .r66d-t')).length >= 4 && /Lead form/.test(await p.textContent('#r66Doc')));
  await p.click('[data-action="r66RepJournal"]'); await p.waitForTimeout(200);
  await p.fill('[data-r66-rep="next"]', 'Double down on behind-the-scenes.'); await p.waitForTimeout(400);
  check('…with your words, and notes pulled from their journal', /3x the usual views/.test(await p.textContent('#r66Doc')) && /behind-the-scenes/.test(await p.textContent('#r66Doc')));
  await E("window.__printed = 0; window.print = function(){ window.__printed++; }");
  await p.click('[data-action="r66RepPdf"]'); await p.waitForTimeout(300);
  check('…Export PDF prints just the report (Save as PDF; a real PDF file in the Mac app)', await E("window.__printed===1"));
  await E("ACTIONS.r66RepClose()");
  }catch(err){ check('the run reached the end', false, String(err && err.message || err).slice(0, 300)); }
  check('no errors', p.errors.length===0, p.errors);
  await b.close(); process.exit(report() ? 1 : 0);
})();
