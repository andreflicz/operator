// Round 59 screenshots: the screens this round changed, on the app's demo data.
// node scripts/e2e/r59-shots.js dist/command-center-2.html <outdir> [name,name,...]
const { instrument, launch, newPage, OUT } = require('./common.js');
const path = require('path'), fs = require('fs');
(async () => {
  instrument(process.argv[2], OUT+'/r59s.html');
  const dir = process.argv[3] || OUT+'/r59shots'; fs.mkdirSync(dir, {recursive:true});
  const only = (process.argv[4] || '').split(',').filter(Boolean);
  const b = await launch();
  const p = await newPage(b, OUT+'/r59s.html', {profile:{name:'Andre Lopez', goalWeight:175}, settings:{instagram:{accounts:[{id:'a1', role:'business', username:'commenccollective', src:'zernio'}, {id:'a2', role:'personal', username:'andreflix', src:'zernio'}]}}}, new Date(2026, 9, 28, 10, 30).getTime());
  await p.setViewportSize({width:1440, height:900});
  const E = c => p.evaluate(x => window.__op.ev(x), c);
  await E(`(function(){
    document.querySelectorAll('.overlay').forEach(o => o.classList.add('hidden')); demoSeed();
    for(let i = 0; i < 14; i++) state.health.weightLog.push({id:uid(), date:addDays(todayStr(), -i*2 - 1), weight:Math.round((180 + i*0.35 + Math.sin(i)*0.8)*10)/10});
    const t = todayStr(); state.health.calorieEntries.push({id:uid(), date:t, name:'Eggs & turkey bacon', calories:450}, {id:uid(), date:t, name:'Chicken, rice & veggies', calories:650}); for(let i = 1; i < 7; i++) state.health.calorieEntries.push({id:uid(), date:addDays(t, -i), name:'Day', calories:1500 + (i*137) % 800});
    state.business.packages = [{id:'pk1', name:'Growth', price:3000, deliverables:[{id:'pd1', title:'Reels', weeklyTarget:2}, {id:'pd2', title:'Carousels', weeklyTarget:1}], schedule:{pd1:[1, 4, 8, 11, 15, 18, 22, 25], pd2:[3, 10, 17, 24]}}, {id:'pk2', name:'Starter', price:1500, deliverables:[{id:'pd3', title:'Reels', weeklyTarget:1}], schedule:{pd3:[2, 9, 16, 23]}}, {id:'pk3', name:'My brand', price:0, type:'self', deliverables:[{id:'pd4', title:'Reels', weeklyTarget:3}, {id:'pd5', title:'Stories', weeklyTarget:5}], schedule:{}}];
    const c = state.business.clients[0]; c.packageId = 'pk1'; c.startDate = '2026-09-05'; c.billingDay = 5; c.deliverables = arr(c.deliverables).filter(d => !d.fromPackage).concat([{id:'cd1', title:'Reels', recurring:true, weeklyTarget:2, completedDates:['2026-10-06', '2026-10-09'], fromPackage:true, sourceId:'pd1'}, {id:'cd2', title:'Carousels', recurring:true, weeklyTarget:1, completedDates:['2026-10-08'], fromPackage:true, sourceId:'pd2'}]);
    state.calendar.events.push({id:'ev9', title:c.business + ' shoot', date:'2026-10-29', time:'14:00', linkedClient:c.id});
    opReadStore()['money'] = {text:'Pattern: $10.5k coming in, nothing going out. Watch: no bank linked yet. Move: connect one today.', day:todayStr(), sig:'s'};
    opReadStore()['biz'] = {text:'Three clients at $7.5k; two leads worth $5.5k sit untouched. Book the call with Luis Auto this week.', day:todayStr(), sig:'s'};
    AI.hasKey = true; aiKeyCheck = function(){}; aiWrite = async function(){ return ''; }; opFactsMoneyPage = function(){ return 'x'; }; opFactsBizPage = function(){ return 'x'; };
    R57_TYPED['money'] = opReadStore()['money'].text; R57_TYPED['biz'] = opReadStore()['biz'].text;
    persist('business'); persist('health'); renderView();
  })()`);
  const shot = async (name, setup, sel) => {
    if(only.length && only.indexOf(name) < 0) return;
    await E("document.querySelectorAll('.overlay').forEach(o => o.classList.add('hidden'))");
    await E(setup); await p.waitForTimeout(700);
    const file = path.join(dir, name+'.png');
    await p.screenshot({path:file}); console.log(file);
  };
  await shot('finances-read', "ui.view='personal'; ui.personalTab='finances'; renderView()");
  await shot('biz-read', "ui.view='business'; ui.businessTab='overview'; renderView()");
  await shot('setup-pipeline', "ACTIONS.bizSetupOpen()");
  await shot('setup-clients', "ui.bsTab='clients'; ACTIONS.bizSetupOpen()");
  await shot('playbooks', "addSheetClose('bizSetup'); ui.view='business'; ui.businessTab='lifecycle'; ui.pbView='board'; renderView()");
  await shot('playbook-lead', "ui.pbView='build'; ui.pbSel=r59LeadPb().id; renderView()");
  await shot('packages', "ui.businessTab='packages'; renderView()");
  await shot('package-open', "openPackageEditModal('pk1')");
  await shot('package-new', "addSheetClose('r59PkSheet'); openNewPackageModal()");
  await shot('log-calendar', "addSheetClose('r59PkNew'); ui.businessTab='log'; ui.r59LcCal=true; renderView()");
  await shot('client-calendar', "ui.r59LcCal=false; ui.businessTab='clients'; renderView(); openClientModal(state.business.clients[0].id); ui.clientSec='calendar'; renderClientModalInto()");
  await shot('calendar-client', "ui.showClientModal=null; ui.view='calendar'; ui.calendarYear=2026; ui.calendarMonth=9; ui.r59CalClient=state.business.clients[0].id; renderView()");
  await shot('social-lockin', "ui.r59CalClient=null; ui.view='convos'; ui.socTab='overview'; ui.igTried=1; ui.sxRole='personal'; ui.r58Acct=null; renderView()");
  await shot('lockin-sheet', "ACTIONS.r59PlanOpen(null, null, 'a2'); ACTIONS.r59PlanPk(null, null, 'pk3')");
  await shot('social-locked', "addSheetClose('r59Plan'); r59Plans()['a2'] = {pk:'pk3', start:todayStr(), at:Date.now()}; r59Pk('pk3').schedule = {pd4:[1, 3, 5, 8, 10, 12, 15, 17, 19, 22, 24, 26], pd5:[2, 6, 9, 13, 16, 20, 23, 27]}; renderView()");
  await shot('weight-fuel', "ui.view='personal'; ui.personalTab='fitness'; ui.healthSub='body'; renderView()");
  await shot('health-overview', "ui.healthSub='overview'; renderView()");
  await shot('journal', "ui.personalTab='journal'; ui.journalMode='entries'; renderView()");
  await shot('app-updates', "opChat().push({r:'me', t:'yo the calendar should start on monday not sunday and the posted reels should be green, late ones red', at:Date.now()}); R58.turn = {text:'yo the calendar should start on monday not sunday and the posted reels should be green, late ones red', tools:[], filed:false}; opRunTool('suggest_improvement', {idea:'Calendar weeks start on Monday, not Sunday. Posted reels show in green, late ones in red.'}); R58.turn = null; ui.view='settings'; ui.settingsTab='system'; ui.r52Sub={'settings-system':'updates'}; renderView(); setTimeout(() => { const d = document.querySelector('.r59-said'); if(d) d.open = true; }, 50)");
  console.log('errors', p.errors);
  await b.close();
})();
