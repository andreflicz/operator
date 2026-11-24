// Navigation feel benchmark: heavy data, CPU slowed 4x (a slower laptop), and the time
// from a sidebar click until the next frame is actually painted. Also sums the browser's
// own style / layout / paint work from a trace, to see where frame time goes.
// Usage: node scripts/e2e/perf-nav.js dist/command-center-2.html
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
  instrument(process.argv[2], OUT+'/perfnav.html');
  const b = await launch();
  const ctx = await b.newContext({ viewport:{width:1440,height:900} });
  const p = await ctx.newPage();
  const errors = []; p.on('pageerror', e => errors.push(e.message));
  const { now, seed } = heavySeed();
  const els = []; for(let i=0;i<40;i++) els.push({id:'e'+i, type: i%3 ? 'note':'list', header:true, color:'#3FBE8E', title:'Card '+i, body:'Body text '+i, items:[{id:'a',text:'one'},{id:'b',text:'two'}], x:(i%8)*320, y:Math.floor(i/8)*200, w:280, h:120});
  seed.boards = {boards:[{id:'v1', kind:'vision', name:'Vision Board', parentId:null, elements:els, viewport:{x:0,y:0,zoom:1}}].concat([1,2,3,4,5,6].map(n => ({id:'m'+n, kind:'milanote', name:'Board '+n, parentId:null, elements:els.slice(0,20), viewport:{x:0,y:0,zoom:1}})))};
  seed.profile = {name:'Andre', revenueGoalMonthly:10000};
  seed.goals = {items:[{id:'g1', label:'MRR', target:10000, current:4000}, {id:'g2', label:'Reels', target:30, current:12}]};
  await p.clock.install({ time: now });
  await p.addInitScript((seed) => { try{ if(sessionStorage.getItem('s')) return; sessionStorage.setItem('s','1'); }catch(e){ return; } Object.keys(seed).forEach(k => localStorage.setItem('opsdash:'+k, JSON.stringify(seed[k]))); }, seed);
  await p.goto('file://'+path.resolve(OUT+'/perfnav.html')); await p.waitForSelector('#app[style*="flex"]');
  await p.clock.runFor(6000); await p.waitForTimeout(1500);
  const cdp = await ctx.newCDPSession(p);
  await cdp.send('Emulation.setCPUThrottlingRate', {rate: Number(process.argv[3]||4)});
  const frame = async (label, sel) => {
    await p.waitForTimeout(150);
    const ms = await p.evaluate((sel) => new Promise((res) => {
      const el = document.querySelector(sel); if(!el){ res(-1); return; }
      const t = performance.now(); el.click();
      requestAnimationFrame(() => requestAnimationFrame(() => res(performance.now()-t)));
    }), sel);
    console.log(label.padEnd(26), ms<0 ? 'MISSING '+sel : ms.toFixed(0)+' ms');
    return ms;
  };
  const steps = [
    ['nav Today', '[data-action="nav"][data-view="today"]'],
    ['nav Focus', '[data-action="nav"][data-view="focus"]'],
    ['nav Business', '[data-action="nav"][data-view="business"]'],
    ['tab Clients', '[data-action="businessTab"][data-tab="clients"]'],
    ['tab Leads', '[data-action="businessTab"][data-tab="leads"]'],
    ['nav Calendar', '[data-action="nav"][data-view="calendar"]'],
    ['nav Personal', '[data-action="nav"][data-view="personal"]'],
    ['tab Journal', '[data-action="personalTab"][data-tab="journal"]'],
    ['nav Settings', '[data-action="nav"][data-view="settings"]'],
    ['nav Today (again)', '[data-action="nav"][data-view="today"]'],
    ['nav Focus (again)', '[data-action="nav"][data-view="focus"]'],
    ['nav Today (3rd)', '[data-action="nav"][data-view="today"]'],
  ];
  if(process.env.PROFILE){ await cdp.send('Profiler.enable'); await cdp.send('Profiler.setSamplingInterval', {interval:100}); await cdp.send('Profiler.start'); }
  await cdp.send('Tracing.start', {categories:'devtools.timeline,disabled-by-default-devtools.timeline', transferMode:'ReturnAsStream'});
  let total = 0;
  for(const s of steps) total += Math.max(0, await frame(s[0], s[1]));
  console.log('TOTAL'.padEnd(26), total.toFixed(0)+' ms', '(avg '+(total/steps.length).toFixed(0)+')');
  if(process.env.PROFILE){
    const { profile } = await cdp.send('Profiler.stop');
    const byId = {}; profile.nodes.forEach(n => byId[n.id]=n);
    const parent = {}; profile.nodes.forEach(n => (n.children||[]).forEach(c => parent[c]=n.id));
    const selfMs = {}; const dt = profile.timeDeltas;
    profile.samples.forEach((id, i) => { selfMs[id] = (selfMs[id]||0) + (dt[i]||0)/1000; });
    const incl = {}, self = {};
    Object.keys(selfMs).forEach(id => {
      const n = byId[id]; const nm = (n.callFrame.functionName||'(anon)');
      self[nm] = (self[nm]||0) + selfMs[id];
      const seen = new Set(); let cur = Number(id);
      while(cur!=null && byId[cur]){ const name = byId[cur].callFrame.functionName||'(anon)'; if(!seen.has(name)){ seen.add(name); incl[name] = (incl[name]||0) + selfMs[id]; } cur = parent[cur]; }
    });
    console.log('\nInclusive JS time (ms):');
    Object.entries(incl).filter(([k])=>/^render|Panel|Html|morph|memo|deepWork|compute|client|board|fit|heat|week|agenda|stat|goal|biz|collected/i.test(k)).sort((a,b)=>b[1]-a[1]).slice(0,40).forEach(([k,v]) => console.log('  '+v.toFixed(0).padStart(6)+'  '+k));
    console.log('\nSelf JS time (ms):');
    Object.entries(self).sort((a,b)=>b[1]-a[1]).slice(0,25).forEach(([k,v]) => console.log('  '+v.toFixed(0).padStart(6)+'  '+k));
  }
  const done = new Promise(r => cdp.once('Tracing.tracingComplete', r));
  await cdp.send('Tracing.end');
  const { stream } = await done;
  let data = ''; for(;;){ const r = await cdp.send('IO.read', {handle:stream}); data += r.data; if(r.eof) break; }
  const evs = JSON.parse(data).traceEvents || JSON.parse(data);
  const sums = {};
  (Array.isArray(evs) ? evs : evs.traceEvents).forEach(e => { if(e.ph==='X' && e.dur && ['UpdateLayoutTree','Layout','Paint','PrePaint','Layerize','Commit','FunctionCall','EventDispatch','ParseHTML','RecalculateStyles','HitTest','UpdateLayer','CompositeLayers','RasterTask','ScheduleStyleRecalculation','v8.callFunction','TimerFire','FireAnimationFrame'].indexOf(e.name)>=0){ sums[e.name] = (sums[e.name]||0) + e.dur/1000; } });
  console.log('\nBrowser work during the run (ms):');
  Object.entries(sums).sort((a,b)=>b[1]-a[1]).forEach(([k,v]) => console.log('  '+v.toFixed(0).padStart(7)+'  '+k));
  console.log('DOM nodes on Today:', await p.evaluate(() => { document.querySelector('[data-action="nav"][data-view="today"]').click(); return document.getElementById('viewRoot').getElementsByTagName('*').length; }));
  console.log('errors:', errors);
  await b.close();
})();
