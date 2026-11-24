// Round 58 screenshots: the screens this round changed, with a realistic seed.
// node scripts/e2e/r58-shots.js dist/command-center-2.html <outdir> [name,name,...]
const { instrument, launch, newPage, OUT } = require('./common.js');
const path = require('path'), fs = require('fs');
(async () => {
  instrument(process.argv[2], OUT+'/r58s.html');
  const dir = process.argv[3] || OUT+'/r58shots'; fs.mkdirSync(dir, {recursive:true});
  const only = (process.argv[4] || '').split(',').filter(Boolean);
  const at = new Date(2026, 9, 28, 10, 30).getTime();
  const seed = {profile:{name:'Andre Lopez', lineupView:'list'},
    settings:{instagram:{accounts:[{id:'a1', role:'business', username:'commenccollective', src:'zernio'}, {id:'a2', role:'personal', username:'andreflix', src:'zernio'}], cliAll:[{id:'c1', platform:'instagram', username:'jjs_build', followers:1800}, {id:'c2', platform:'instagram', username:'kikostudio', followers:950}], cliLinks:{c1:'jj', c2:'kk'}}},
    business:{packages:[{id:'pk1', name:'Growth', price:3000, deliverables:[{id:'pd1', title:'Reels', weeklyTarget:2}, {id:'pd2', title:'Carousel posts', weeklyTarget:1}]}, {id:'pk2', name:'My brand', type:'self', price:0, deliverables:[{id:'pd3', title:'Reels', weeklyTarget:3}]}],
    clients:[
      {id:'kk', name:'Kiko', business:'Kiko Studio', stage:'onboarding', status:'active', mrr:2000, startDate:'2026-10-14', deliverables:[]},
      {id:'jj', name:'Jay', business:'JJS Construction', stage:'active', status:'active', mrr:3000, startDate:'2026-01-05', deliverables:[{id:'d1', title:'Reels', recurring:true, weeklyTarget:2, completedDates:['2026-10-27'], fromPackage:true}]},
      {id:'bm', name:'Ben', business:'Brothers Mechanical', stage:'active', status:'active', mrr:2500, startDate:'2026-06-02', deliverables:[]}],
      pipeline:[{id:'l1', name:'Mia', company:'Mia Spa', stage:'contacted', value:2500, createdAt:'2026-10-24'}, {id:'l2', name:'Luis', company:'Luis Auto', stage:'discovery', value:3000, createdAt:'2026-10-20'}]}};
  const b = await launch();
  const p = await newPage(b, OUT+'/r58s.html', seed, at);
  await p.setViewportSize({width:1440, height:900});
  const E = c => p.evaluate(x => window.__op.ev(x), c);
  await E("document.querySelectorAll('.overlay').forEach(o => o.classList.add('hidden')); AI.hasKey = false; uiConfirm = function(o){ return Promise.resolve(true); }");
  await E(`(function(){
    crm().playbooks = []; arr(state.business.clients).forEach(c => { c.pb = null; c.cycleId = null; });
    const P = pbNew('client', 'Client journey', 30, {for:'client'});
    P.stages = [pb57Stage('Onboarding', {crm:'onboarding', days:14}), pb57Stage('Monthly service', {crm:'active', repeat:'month'}), pb57Stage('At risk', {crm:'atrisk', days:7})];
    P.stages[0].steps = [pb57Step('Onboarding call', 'call', {rule:'enter'}), pb57Step('Get access to Meta Business Manager', 'access', {rule:'day', n:2}, {checklist:[{id:'a', t:'Business Manager'}, {id:'b', t:'Ad account'}]}), pb57Step('Send the intake form', 'send', {rule:'day', n:2}), pb57Step('Strategy doc', 'doc', {rule:'day', n:6}), pb57Step('Kick-off call', 'call', {rule:'day', n:8}), pb57Step('Deliver the first win', 'task', {rule:'end'})];
    P.stages[1].steps = [pb57Step('Weekly report', 'report', {rule:'week', dow:5}), pb57Step('Book the monthly call', 'task', {rule:'before', n:7}), pb57Step('Monthly call', 'call', {rule:'before', n:3}), pb57Step('Monthly report', 'report', {rule:'end'})];
    P.stages[2].steps = [pb57Step('Save call', 'call', {rule:'enter'})];
    P.postDays = ['1', '3', '5'];
    const L = pbNew('lead', 'Sales', 30, {for:'lead'}); L.stages = crmStages('lead').filter(s => s.kind!=='won' && s.kind!=='lost').map(s => pb57Stage(s.label, {crm:s.id}));
    L.stages[1].steps = [pb57Step('Follow-up text', 'send', {rule:'day', n:2})]; L.stages[2].steps = [pb57Step('Sales call', 'call', {rule:'enter'})];
    pbAll().push(P, L);
    pbStart('client', crmFind('client', 'kk'), P.id, '2026-10-14', true);
    pbStart('client', crmFind('client', 'jj'), P.id, '2026-01-05', true);
    pbStart('lead', crmFind('lead', 'l2'), L.id, todayStr(), true);
    pbSave(); masterTasksSync();
  })()`);
  const shot = async (name, setup, sel) => {
    if(only.length && only.indexOf(name) < 0) return;
    await E("document.querySelectorAll('.overlay').forEach(o => o.classList.add('hidden'))");
    await E(setup); await p.waitForTimeout(500);
    const file = path.join(dir, name+'.png');
    if(sel){ const el = await p.$(sel); if(el){ await el.screenshot({path:file}); console.log(file); return; } }
    await p.screenshot({path:file}); console.log(file);
  };
  await E("crmFind('client','jj').packageId='pk1'; pbAll()[1].star=true; persist('business')");
  await E("opChat().push({r:'me', t:'The calendar should start on Monday and show posted reels in green', at:Date.now()}); R58.turn={text:'The calendar should start on Monday and show posted reels in green', tools:[], filed:false, at:Date.now()}; opRunTool('mark_update', {summary:'Calendar starts Monday'})");
  await shot('biz-tabs', "ui.view='business'; ui.businessTab='overview'; renderView()");
  await shot('pb-overview', "ui.businessTab='lifecycle'; ui.pbView='board'; renderView()");
  await shot('pb-builder', "ui.pbView='build'; ui.pbSel=pbAll()[0].id; renderView()");
  await shot('social-overview', "ui.view='convos'; ui.socTab='overview'; ui.igTried=1; ui.r58Acct=null; renderView()");
  await shot('social-client', "ui.r58Acct='c1'; renderView()");
  await shot('social-full', "document.documentElement.classList.add('r58-content'); renderView()");
  await shot('packages-calendar', "document.documentElement.classList.remove('r58-content'); ui.r58Acct=null; ui.view='business'; ui.businessTab='packages'; renderView()");
  await shot('op-note', "ui.view='today'; renderView(); r57Note('Logged to App updates', 'The calendar should start on Monday')");
  await shot('notif-feed', "ui.notifOpen = true; const el = document.getElementById('notifPanel'); if(el) el.hidden = false; notifRender()");
  await shot('op-window', "ui.view='today'; renderView(); const t=Date.now(); opChat().push({r:'me', t:'Can you remove that last work session', at:t-60000}, {r:'op', t:'Done. Removed the 832-minute session from today. Undo is in the note.', at:t-50000}, {r:'me', t:'Mark that the calendar should start on Monday as an update', at:t-20000}, {r:'op', t:'Filed in App updates, in your words.', at:t-10000}); AI.hasKey=false; opBubShow()");
  await E("const ob=document.getElementById('opBub'); if(ob) ob.style.display='none'");
  await shot('settings-updates', "ui.notifOpen=false; const np=document.getElementById('notifPanel'); if(np) np.hidden=true; ui.view='settings'; ui.settingsTab='system'; ui.r52Sub={'settings-system':'updates'}; renderView()");
  console.log('errors', p.errors);
  await b.close();
})();
