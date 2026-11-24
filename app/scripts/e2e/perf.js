// Click-latency benchmark: a heavy, realistic year of data, then times common clicks
// (handler + re-render + style/layout) and prints the hottest functions from a CPU profile.
// Usage: node scripts/e2e/perf.js dist/command-center-2.html
const { instrument, launch, OUT } = require('./common.js');
const path = require('path');
function ds(d){ return d.getFullYear()+'-'+String(d.getMonth()+1).padStart(2,'0')+'-'+String(d.getDate()).padStart(2,'0'); }
function heavySeed(){
  const now = new Date(2026, 9, 7, 14, 0, 0);
  const day = (n) => { const d = new Date(now); d.setDate(d.getDate()+n); return d; };
  const tasks = [], sessions = [], segs = [], history = [], completions = [], entries = [], events = [], clients = [], pipeline = [];
  const bigPhoto = 'data:image/jpeg;base64,' + 'A'.repeat(180000);
  for(let i=0;i<450;i++) tasks.push({id:'t'+i, title:'Task number '+i+' with a realistic title', clients:['personal'], client:'personal', priority:['high','med','low'][i%3], status: i<25?'today': i<220?'backlog':'done', completedAt: i>=220? ds(day(-(i%300))):null, notes:'Some notes about task '+i, createdAt: ds(day(-(i%300))), isVideoIdea: i%9===0, deadline: i%7===0? ds(day(i%20-5)) : null});
  for(let d=-365; d<=0; d++){
    const date = ds(day(d));
    for(let k=0;k<3;k++){ const st = +day(d).setHours(8+k*3,0,0,0); sessions.push({id:'s'+d+'_'+k, type:'deep', date, startedAt:st, endedAt:st+75*60000, minutes:75, completedTasks:[]}); segs.push({id:'g'+d+'_'+k, taskId:'t'+((d+400)%220), start:st, end:st+40*60000, date, inSession:true}); }
    history.push({id:'m'+d, type:['break','offtime','shooting'][Math.abs(d)%3], date, startedAt:+day(d), endedAt:+day(d)+3600000, minutes:60});
    completions.push({date, doneIds:['std1']});
    if(d%1===0) entries.push({id:'j'+d, date, timestamp:+day(d), text:'Journal entry for '+date+'. '.repeat(20), mood:null, pinned:false, photos: (d%25===0)?[bigPhoto]:[]});
    if(d%2===0) events.push({id:'e'+d, date:ds(day(d+30)), time:'10:00', title:'Event '+d, categoryId:'work'});
  }
  for(let i=0;i<30;i++) clients.push({id:'c'+i, name:'Client '+i, business:'Business '+i, status:'active', mrr:1000+i*100, touches:[ds(day(-(i%12)))], deliverables:[{id:'d'+i, title:'Reels', recurring:true, fromPackage:false, weeklyTarget:3, completedDates:[ds(day(-1)), ds(day(-3))]}], journal:[], notes:'notes', createdAt:ds(day(-200))});
  for(let i=0;i<200;i++) pipeline.push({id:'p'+i, name:'Lead '+i, company:'Company '+i, stage:['lead','contacted','discovery','proposal','closed','lost'][i%6], value:1000+i*10, createdAt:ds(day(-(i%60))), stageHistory:[]});
  const appDays = {}; for(let d=-90; d<0; d++){ const m={}; for(let a=0;a<30;a++) m['App '+a]=a*3; appDays[ds(day(d))]=m; }
  return { now, seed: {
    tasks:{items:tasks}, focus:{activeSession:null, sessions, taskSegments:segs, alarms:[], reminders:[]},
    modes:{active:null, history}, standards:{items:[{id:'std1', label:'Calories', createdAt:'2025-01-01'}], deepWorkTargetMinutes:180, completions},
    journal:{entries}, calendar:{events}, business:{clients, pipeline, packages:[]}, appActivity:{days:appDays, todayIntervals:[]},
    health:{gymLog: completions.map((c,i)=>({id:'w'+i, date:c.date, type:'Lift'})), weightLog:[], calorieEntries:[]}
  }};
}
(async () => {
  const src = process.argv[2];
  instrument(src, OUT+'/perf.html');
  const b = await launch();
  const ctx = await b.newContext({ viewport:{width:1400,height:900} });
  const p = await ctx.newPage();
  const errors = []; p.on('pageerror', e => errors.push(e.message));
  const { now, seed } = heavySeed();
  await p.clock.install({ time: now });
  await p.addInitScript((seed) => { try{ if(sessionStorage.getItem('s')) return; sessionStorage.setItem('s','1'); }catch(e){ return; } Object.keys(seed).forEach(k => localStorage.setItem('opsdash:'+k, JSON.stringify(seed[k]))); }, seed);
  const t0 = Date.now();
  await p.goto('file://'+path.resolve(OUT+'/perf.html')); await p.waitForSelector('#app[style*="flex"]');
  console.log('load (ms):', Date.now()-t0);
  await p.clock.runFor(6000); await p.waitForTimeout(1500); // let startup idle work finish (photo move, audio warm-up)
  console.log('journal size after cleanup (KB):', await p.evaluate(()=>Math.round(localStorage.getItem('opsdash:journal').length/1024)));
  const time = async (label, selector) => {
    await p.waitForTimeout(60);
    const ms = await p.evaluate((sel) => {
      const el = document.querySelector(sel); if(!el) return -1;
      const t = performance.now(); el.click(); void document.body.offsetHeight; getComputedStyle(document.body).color; return performance.now()-t;
    }, selector);
    console.log(label.padEnd(34), ms<0 ? 'MISSING '+selector : ms.toFixed(1)+' ms');
    return ms;
  };
  const cdp = await ctx.newCDPSession(p);
  await cdp.send('Profiler.enable'); await cdp.send('Profiler.setSamplingInterval', {interval:200}); await cdp.send('Profiler.start');
  const steps = [
    ['nav Today', '[data-action="nav"][data-view="today"]'],
    ['toggle standard (Today)', '[data-action="toggleStandard"]'],
    ['nav Focus', '[data-action="nav"][data-view="focus"]'],
    ['open task editor', '.task-card[data-action="openTaskEditModal"]'],
    ['close task editor', '[data-action="closeTaskEditModal"]'],
    ['task ⋯ menu', '.task-card .card-more'],
    ['move task to backlog', '#taskCtxMenu [data-op="backlog"]'],
    ['subtab Backlog', '[data-action="focusTasksSubTab"][data-tab="backlog"]'],
    ['subtab Video Ideas', '[data-action="focusTasksSubTab"][data-tab="videoIdeas"]'],
    ['tab Analytics', '[data-action="focusMainTab"][data-tab="analytics"]'],
    ['analytics This week', '[data-action="analyticsRange"][data-id="week"]'],
    ['analytics All time', '[data-action="analyticsRange"][data-id="all"]'],
    ['nav Business', '[data-action="nav"][data-view="business"]'],
    ['tab Leads', '[data-action="businessTab"][data-tab="leads"]'],
    ['log touch (lead)', '.touch-log-btn'],
    ['tab Clients', '[data-action="businessTab"][data-tab="clients"]'],
    ['open client', '.cc2-top'],
    ['close client', '[data-action="closeClientModalAndSave"]'],
    ['nav Calendar', '[data-action="nav"][data-view="calendar"]'],
    ['select calendar day', '.cal-cell[data-action="selectCalDay"]'],
    ['nav Personal', '[data-action="nav"][data-view="personal"]'],
    ['tab Journal', '[data-action="personalTab"][data-tab="journal"]'],
    ['journal menu', '[data-action="journalMenu"]'],
    ['nav Settings', '[data-action="nav"][data-view="settings"]'],
    ['nav Today (again)', '[data-action="nav"][data-view="today"]'],
  ];
  let total = 0;
  for(const s of steps) total += Math.max(0, await time(s[0], s[1]));
  console.log('TOTAL'.padEnd(34), total.toFixed(0)+' ms');
  const { profile } = await cdp.send('Profiler.stop');
  const self = {}; const byId = {}; profile.nodes.forEach(n => byId[n.id]=n);
  const dt = profile.timeDeltas; const counts = {};
  profile.samples.forEach((id, i) => { counts[id] = (counts[id]||0) + (dt[i]||0); });
  Object.keys(counts).forEach(id => { const n = byId[id]; const name = (n.callFrame.functionName||'(anon)')+(n.callFrame.url?'':' [native]'); self[name] = (self[name]||0) + counts[id]/1000; });
  console.log('\nTop self time (ms):');
  Object.entries(self).sort((a,b)=>b[1]-a[1]).slice(0,22).forEach(([k,v]) => console.log('  '+v.toFixed(0).padStart(6)+'  '+k));
  console.log('errors:', errors);
  await b.close();
})();
