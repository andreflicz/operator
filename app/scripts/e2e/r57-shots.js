// Round 57 screenshots: the screens this round changed, with a realistic seed.
// node scripts/e2e/r57-shots.js dist/command-center-2.html <outdir> [name,name,...]
const { instrument, launch, newPage, OUT } = require('./common.js');
const path = require('path'), fs = require('fs');
(async () => {
  instrument(process.argv[2], OUT+'/r57s.html');
  const dir = process.argv[3] || OUT+'/r57shots'; fs.mkdirSync(dir, {recursive:true});
  const only = (process.argv[4] || '').split(',').filter(Boolean);
  const at = new Date(2026, 9, 28, 10, 30).getTime();
  const seed = {profile:{name:'Andre Lopez', lineupView:'list'},
    business:{clients:[
      {id:'kk', name:'Kiko', business:'Kiko Studio', stage:'onboarding', status:'active', mrr:2000, startDate:'2026-10-14', deliverables:[]},
      {id:'jj', name:'Jay', business:'JJS Construction', stage:'active', status:'active', mrr:3000, startDate:'2026-01-05', deliverables:[{id:'d1', title:'Reels', recurring:true, weeklyTarget:2, completedDates:['2026-10-27'], fromPackage:true}]},
      {id:'bm', name:'Ben', business:'Brothers Mechanical', stage:'active', status:'active', mrr:2500, startDate:'2026-06-02', deliverables:[]}],
      pipeline:[{id:'l1', name:'Mia', company:'Mia Spa', stage:'contacted', value:2500, createdAt:'2026-10-24'}, {id:'l2', name:'Luis', company:'Luis Auto', stage:'discovery', value:3000, createdAt:'2026-10-20'}]}};
  const b = await launch();
  const p = await newPage(b, OUT+'/r57s.html', seed, at);
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
  await shot('pb-build', "ui.view='business'; ui.businessTab='lifecycle'; ui.pbView='build'; ui.pbWho='client'; ui.pbSel=pbAll()[0].id; ui.pb57Stage=null; ui.pbItem=null; ui.pb57Cal=false; renderView()");
  await shot('pb-step', "ui.pbItem=pbStages(pbAll()[0])[0].steps[1].id; renderView()");
  await shot('pb-stage', "ui.pbItem=null; ui.pb57StageEdit=true; ui.pb57Stage=pbStages(pbAll()[0])[1].id; renderView()");
  await shot('pb-guide', "ui.pb57StageEdit=false; ui.pb57Cal=true; renderView()");
  await shot('pb-board', "ui.pb57Cal=false; ui.pbView='board'; renderView()");
  await shot('pb-board-leads', "ui.pbWho='lead'; ui.pbSel=null; renderView()");
  await shot('pb-client', "ui.pbWho='client'; openClientModal('kk'); ui.clientSec='cycle'; renderClientModalInto()");
  await shot('pb-backlog', "ui.view='focus'; ui.focusTab='tasks'; ui.focusTasksSubTab='clientBacklog'; renderView()");
  await shot('tasks-today', "ui.view='focus'; ui.focusTab='tasks'; ui.focusTasksSubTab='overview'; renderView()");
  await shot('wind-plan', "openWindDown('plan')");
  if(fs.existsSync(path.join(__dirname, 'r57-shots-more.js'))) await require('./r57-shots-more.js')(p, E, shot);
  console.log('errors', p.errors);
  await b.close();
})();
