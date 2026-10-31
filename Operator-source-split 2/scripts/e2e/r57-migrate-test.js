// Round 57: data from Round 56 (day-based playbooks, people on them, their tasks as you left them) upgrades cleanly.
const { instrument, launch, newPage, check, report, OUT } = require('./common.js');
(async () => {
  instrument(process.argv[2], OUT+'/r57m.html');
  const b = await launch();
  const at = new Date(2026, 9, 28, 10).getTime();
  const seed = {profile:{name:'Andre Lopez'},
    business:{clients:[{id:'mm', name:'Mo', business:'Mo Media', stage:'active', status:'active', mrr:2000, startDate:'2026-10-20', deliverables:[], pb:{id:'P1', start:'2026-10-20', run:'abc', done:{'abc~2026-10-20:i0':'2026-10-20'}, auto:{}, hist:[]}},
                         {id:'rr', name:'Ray', business:'Ray Roofing', stage:'active', status:'active', mrr:3000, startDate:'2026-01-05', deliverables:[], pb:{id:'P2', start:'2026-01-05', run:'xyz', done:{}, auto:{}, hist:[]}}],
      pipeline:[], crm:{pbSeeded:true, pbKnown:['mm', 'rr'], playbooks:[
        {id:'P1', name:'Onboarding', for:'client', repeats:false, days:30, next:'P2', kind:'onboarding', items:[{id:'i0', title:'Welcome', type:'send', day:1, repeat:'once'}, {id:'i1', title:'Kickoff', type:'call', day:1, repeat:'once'}, {id:'i2', title:'Strategy', type:'doc', day:10, repeat:'once'}, {id:'i3', title:'Weekly check-in', type:'call', repeat:'week', dow:5}]},
        {id:'P2', name:'Retainer', for:'client', repeats:true, days:30, kind:'monthly', items:[{id:'j1', title:'Monthly report', type:'report', day:22, repeat:'once'}, {id:'j2', title:'Book the monthly call', type:'task', day:24}]}]}},
    tasks:{items:[
      {id:'t1', title:'Kickoff call w/ Mo (moved)', status:'backlog', deadline:'2026-11-02', client:'mm', clients:['mm'], createdAt:'2026-10-20', master:{kind:'pb', k:'client:mm:abc~2026-10-20:i1', who:'client', id:'mm', key:'abc~2026-10-20:i1', item:'i1', type:'call', pb:'P1'}},
      {id:'t2', title:'Strategy', status:'backlog', deadline:'2026-10-29', client:'mm', clients:['mm'], createdAt:'2026-10-20', master:{kind:'pb', k:'client:mm:abc~2026-10-20:i2', who:'client', id:'mm', key:'abc~2026-10-20:i2', item:'i2', type:'doc', pb:'P1'}},
      {id:'t0', title:'Welcome', status:'done', completedAt:'2026-10-20', client:'mm', clients:['mm'], master:{kind:'pb', k:'client:mm:abc~2026-10-20:i0', who:'client', id:'mm', key:'abc~2026-10-20:i0', item:'i0', type:'send', pb:'P1'}}]}};
  const p = await newPage(b, OUT+'/r57m.html', seed, at);
  const E = c => p.evaluate(x => window.__op.ev(x), c);
  await p.waitForTimeout(400); await E("document.querySelectorAll('.overlay').forEach(o => o.classList.add('hidden')); masterTasksSync(); masterTasksSync()");
  const ts = JSON.parse(await E("JSON.stringify(state.tasks.items.filter(t => t.master && t.master.kind==='pb').map(t => [t.id, t.title, t.status, t.deadline]))"));
  // (round 59: the permanent lead playbook is its own thing)
  check('your playbooks became stages (one each), nothing lost', await E("pbAll().filter(p => !p.master).every(p => pbStages(p).length===1) && pbStages(pbById('P1'))[0].steps.length===4 && pbStages(pbById('P2'))[0].steps.length===2"));
  check('a monthly playbook’s stage runs every month; the monthly report is due on the last day', await E("pbStages(pbById('P2'))[0].repeat==='month' && pbStages(pbById('P2'))[0].steps[0].due.rule==='end'"));
  check('the people on them are on the stage, from the same day 1', await E("crmFind('client','mm').pb.stage===pbStages(pbById('P1'))[0].id && pb57In(crmFind('client','mm'))==='2026-10-20'"));
  check('your open tasks are the same tasks (no duplicates made)', ts.filter(t => /Kickoff/.test(t[1])).length===1 && ts.filter(t => /Strategy/.test(t[1])).length===1 && ts.filter(t => t[1]==='Welcome').length===1, ts);
  check('…with your renames, places and dates kept', ts.some(t => t[0]==='t1' && t[1]==='Kickoff call w/ Mo (moved)' && t[2]==='backlog' && t[3]==='2026-11-02'), ts);
  check('what was done stays done', await E("!!crmFind('client','mm').pb.done['abc~2026-10-20:i0'] && state.tasks.items.find(t => t.id==='t0').status==='done'"));
  check('the old tasks learn their stage (for the badge and the guide)', await E("state.tasks.items.filter(t => t.master && t.master.id==='mm').every(t => !!t.master.stage && !!t.master.wkEnd)"));
  check('a client on a monthly playbook since January isn’t buried in old weekly steps', await E("!state.tasks.items.some(t => t.master && t.master.id==='rr' && t.deadline && t.deadline < '2026-10-05')"));
  await E("ui.view='business'; ui.businessTab='lifecycle'; ui.pbView='build'; renderView()"); await p.waitForTimeout(200);
  check('Build opens on them', (await p.$$('.pb57-row')).length >= 2);
  await E("openClientModal('mm'); ui.clientSec='cycle'; renderClientModalInto()"); await p.waitForTimeout(200);
  check('their window shows the stage and its steps (the weekly one once a week)', (await p.$$('#clientModalOverlay .r55-pbp-r')).length===7);
  check('a behind-the-guide notification opens that client', await E("(function(){ const n = notifList().find(n => /^pbb:client:mm/.test(n.key)); if(!n) return 'none'; document.querySelectorAll('.overlay').forEach(o => o.classList.add('hidden')); ACTIONS.notifOpen(null, null, n.key); return !document.getElementById('clientModalOverlay').classList.contains('hidden'); })()")!==false);
  check('no errors', p.errors.length===0, p.errors);
  await b.close(); process.exit(report() ? 1 : 0);
})();
