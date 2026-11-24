// Round 72 screenshots: node scripts/e2e/r72-shots.js dist/command-center-2.html <outdir> [names]
const path = require('path'), fs = require('fs');
const { instrument, launch, newPage, OUT } = require('./common');
const SRC = process.argv[2] || 'dist/command-center-2.html', DIR = process.argv[3] || OUT, ONLY = (process.argv[4] || '').split(',').filter(Boolean);
const FILE = path.join(OUT, 'r72s.html'); instrument(SRC, FILE); fs.mkdirSync(DIR, {recursive:true});
const ds = (off) => { const d = new Date(); d.setDate(d.getDate() + (off || 0)); return d.toISOString().slice(0, 10); };
const at = (off, h, m) => { const d = new Date(); d.setDate(d.getDate() + (off || 0)); d.setHours(h, m, 0, 0); return d.getTime(); };
const sessions = [];
for(let i = 1; i < 20; i++) sessions.push({id:'s'+i, date:ds(-i), type:'deep', startedAt:at(-i, 10, 5), endedAt:at(-i, 13, 0), minutes:175, breaks:[]});
const events = [];
const titles = ['Batusha Corp · Meet', 'Call with iFix', 'Brothers Mechanical shoot', 'JJS Construction call', 'In-person shoot', 'Weekly money check-in', 'Coral Energy pitch'];
for(let i = -18; i < 12; i++){ if(i % 2) continue; events.push({id:'e'+i, title:titles[(i+18) % titles.length], date:ds(i), time:'10:00'}); if(i % 4 === 0) events.push({id:'f'+i, title:'16 reels '+((i+20)%4+1)+'/4', date:ds(i), time:'14:00'}); if(i%3===0) events.push({id:'g'+i, title:'8 reels 2/4', date:ds(i), time:'16:00'}); }
const seed = {
  profile:{name:'Andre'},
  focus:{sessions:sessions, wake:{enabled:true, time:'07:00', days:[1,2,3,4,5], label:'Wake up'}, work:{enabled:true, start:'10:00', end:'17:00', days:[1,2,3,4,5]}},
  calendar:{events:events},
  tasks:{items:[{id:'t1', title:'Coral Energy edit', status:'today', deadline:ds(1), priority:'high', clients:['c2']}, {id:'t2', title:'Invoice run', status:'today'}, {id:'t4', title:'Cut 3 reels for Batusha', status:'today', priority:'high', clients:['c1'], deadline:ds(0)}, {id:'t5', title:'Reply to JJS', status:'today', deadline:ds(-1)}, {id:'t6', title:'Color grade', status:'today', priority:'low'}, {id:'t3', title:'Pitch deck', status:'backlog', deadline:ds(3)}, {id:'t7', title:'Rate card update', status:'backlog'}, {id:'t8', title:'Website for Brothers', status:'backlog', deadline:ds(12)}]},
  business:{clients:[{id:'c1', name:'Batusha Corp', status:'active', mrr:1200, touches:[ds(-1)]}, {id:'c2', name:'JJS Construction', status:'active', mrr:1800, touches:[ds(-5)]}, {id:'c3', name:'Brothers Mechanical', status:'active', mrr:1800, touches:[ds(-11)]}, {id:'c4', name:'Coral Energy', status:'active', mrr:3000, touches:[ds(0)]}], pipeline:[]}
};
const SHOTS = {
  mind: `state.profile.viewMode='mind'; r73MindBoot();`,
  mindLocked: `startFocus(null); state.focus.activeSession.startedAt = Date.now() - 4100000; state.profile.viewMode='mind'; r73MindBoot();`,
  mindSel: `state.profile.viewMode='mind'; r73MindBoot(); setTimeout(function(){ const n = MIND.nodes.find(function(x){ return x.kind==='client'; }); r73FlyNode(MIND.byId['s:business']); r73Inspect(n); MIND.hover = n; }, 700);`,
  mindDive: `state.profile.viewMode='mind'; r73MindBoot(); setTimeout(function(){ r73Dive({view:'business'}); }, 300);`,
  mindPal: `state.profile.viewMode='mind'; r73MindBoot(); setTimeout(function(){ r73Pal('jj'); }, 600);`,
  looksBoard: `r72Set('taskLook','board'); ui.view='focus'; ui.focusTab='tasks'; ui.focusTasksSubTab='overview'; renderView();`,
  looksTimeline: `r72Set('taskLook','timeline'); ui.view='focus'; ui.focusTab='tasks'; ui.focusTasksSubTab='overview'; renderView();`,
  looksFocus: `r72Set('taskLook','focus'); ui.view='focus'; ui.focusTab='tasks'; ui.focusTasksSubTab='overview'; renderView();`,
  looksOrbit: `r72Set('taskLook','orbit'); ui.view='focus'; ui.focusTab='tasks'; ui.focusTasksSubTab='overview'; renderView();`,
  calendar: `ui.view='calendar'; renderView();`,
  today: `ui.view='today'; renderView();`,
  todayEdit: `ui.view='today'; ui.todayEdit=true; renderView();`,
  you: `ui.view='personal'; ui.personalTab='you'; renderView();`,
  xp: `ui.view='xp'; renderView();`,
  command: `r71Open && r71Open();`,
  commandEdit: `ui.r72CmdEdit = true; r71Open();`,
  settingsSound: `ui.view='settings'; ui.settingsTab='sound'; renderView();`,
  settingsFocus: `ui.view='settings'; ui.settingsTab='focus'; renderView(); setTimeout(function(){ const e = document.getElementById('r72Auto'); if(e) e.scrollIntoView(); }, 300);`,
  wake: `fireWake({test:true});`,
  work: `fireWorkAlarm({test:true});`,
  snooze: `fireWake({test:true}); wakeSnooze();`,
  settingsMusic: `ui.view='settings'; ui.settingsTab='music'; renderView();`,
  focus: `ui.view='focus'; renderView();`,
  focusOverview: `ui.view='focus'; ui.focusTab='tasks'; ui.focusTasksSubTab='overview'; renderView();`,
  calBottom: `ui.view='calendar'; renderView(); setTimeout(function(){ const m = document.querySelector('main'); if(m) m.scrollTop = 99999; }, 300);`,
  personal: `ui.view='personal'; renderView();`,
  lockedToday: `startFocus(null); state.focus.activeSession.startedAt = Date.now() - 4100000; ui.view='today'; renderView();`,
  lockedFocus: `startFocus(null); state.focus.activeSession.startedAt = Date.now() - 4100000; ui.view='focus'; renderView();`,
  lockedCommand: `startFocus(null); state.focus.activeSession.startedAt = Date.now() - 4100000; ui.view='today'; renderView(); r71Open();`,
  personalTabs: `ui.view='personal'; renderView();`,
  tags: `r70TStarterMake('desk'); r70TStarterMake('awake'); ui.view='settings'; ui.settingsTab='tags'; renderView();`,
  tagsWiz: `r70TStarterMake('desk'); ui.view='settings'; ui.settingsTab='tags'; ui.r70TWiz = {step:1, picks:[], name:'', place:'', how:'open'}; renderView();`,
  debt: `state.finances.debts = [{id:'d1', name:'Car loan', balance:-2400, minPayment:180}]; state.finances.bank = {accounts:[{id:'a1', name:'Checking', org:'Chase', balance:3200}, {id:'a2', name:'Freedom Visa', org:'Chase', balance:-1850.4}]}; ui.view='personal'; ui.personalTab='finances'; ui.finTab='debts'; renderView();`,
  quoteEdit: `r71Open(); setTimeout(function(){ document.querySelector('.r75-qt').click(); }, 200);`,
  ccEdit: `ui.r72CmdEdit = true; r71Open();`,
  holLockedFocus: `r72Set('cvAuto', false); startFocus(null); ui.view='focus'; renderView();`,
  holLockedToday: `r72Set('cvAuto', false); startFocus(null); ui.view='today'; renderView();`,
  xpPage: `ui.view='xp'; renderView();`,
  opSet: `ui.view='settings'; ui.settingsTab='op'; renderView(); setTimeout(function(){ const e = document.getElementById('r76Persona'); if(e) e.scrollIntoView(); }, 100);`,
  pbOp: `ui.view='business'; ui.businessTab='lifecycle'; renderView(); ACTIONS.pb6NewOpen(null, null, 'client');`,
  cycle: `ui.view='focus'; ui.focusTasksSubTab='clientBacklog'; const c = state.business.clients[0]; c.deliverables = [{id:'dv1', title:'Reels', recurring:true, monthlyTarget:8, completedDates:[]}]; persist('business'); masterTasksSync(); renderView();`,
  ccBub: `startFocus(null); r71Open(); setTimeout(function(){ ACTIONS.r75Bub(); }, 400);`
};
(async () => {
  const browser = await launch();
  for(const [name, code] of Object.entries(SHOTS)){
    if(ONLY.length && ONLY.indexOf(name) < 0) continue;
    const page = await newPage(browser, FILE, seed);
    await page.setViewportSize({width:+(process.env.VW||1440), height:+(process.env.VH||900)});
    try{ await page.evaluate((c) => window.__op.ev(c), `(function(){ ${code} })()`); }catch(e){ console.log(name, 'error', e.message.slice(0, 200)); }
    await page.waitForTimeout(1500);
    if(process.env.FULL){ const h = await page.evaluate(() => { const m = document.querySelector('main'); return m ? m.scrollHeight : 900; }); await page.setViewportSize({width:+(process.env.VW||1440), height:Math.min(5000, h + 20)}); await page.waitForTimeout(500); }
    await page.screenshot({path:path.join(DIR, name+'.png')});
    if(page.errors.length) console.log(name, 'page errors:', page.errors.slice(0, 3));
    await page.context().close();
  }
  await browser.close();
})();
