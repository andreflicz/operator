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
  tasks:{items:[{id:'t1', title:'Coral Energy edit', status:'today', deadline:ds(1)}, {id:'t2', title:'Invoice run', status:'today'}, {id:'t3', title:'Pitch deck', status:'backlog'}]},
  business:{clients:[{id:'c1', name:'Batusha Corp', status:'active', mrr:1200}, {id:'c2', name:'JJS Construction', status:'active', mrr:1800}], pipeline:[]}
};
const SHOTS = {
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
  personal: `ui.view='personal'; renderView();`
};
(async () => {
  const browser = await launch();
  for(const [name, code] of Object.entries(SHOTS)){
    if(ONLY.length && ONLY.indexOf(name) < 0) continue;
    const page = await newPage(browser, FILE, seed);
    await page.setViewportSize({width:1440, height:900});
    try{ await page.evaluate((c) => window.__op.ev(c), `(function(){ ${code} })()`); }catch(e){ console.log(name, 'error', e.message.slice(0, 200)); }
    await page.waitForTimeout(1500);
    await page.screenshot({path:path.join(DIR, name+'.png')});
    if(page.errors.length) console.log(name, 'page errors:', page.errors.slice(0, 3));
    await page.context().close();
  }
  await browser.close();
})();
