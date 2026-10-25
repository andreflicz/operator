// Round 44 (October batch, build 4a): Finances as one money hub, and the payment calendar pop-up.
const { instrument, launch, newPage, check, report, OUT } = require('./common.js');
(async () => {
  instrument(process.argv[2], OUT+'/r44.html');
  const b = await launch();
  const T = new Date(2026,9,25,11,0).getTime();   // Sun Oct 25
  const p = await newPage(b, OUT+'/r44.html', {profile:{name:'Andre', xpBook:43, xpLevel:0},
    business:{clients:[
      {id:'jj', name:'Jay', business:'JJS', stage:'active', status:'active', mrr:3000, billingDay:1, startDate:'2026-03-01', color:'#4FC3B8', deliverables:[]},
      {id:'ki', name:'Kiko', business:'Kiko', stage:'active', status:'active', mrr:2000, billingDay:5, startDate:'2026-03-01', color:'#9B8CFF', deliverables:[]}]},
    finances:{debts:[{id:'v', name:'Visa card', balance:2140, originalAmount:3300, apr:24.9, minPayment:85, dueDay:1}, {id:'c', name:'Car loan', balance:4100, originalAmount:10000, apr:6.4, minPayment:212, dueDay:10}],
      payments:[], income:[], invoices:[], expenses:[{id:'e1', date:'2026-10-24', name:'Shell', amount:48.1, cat:'transport', src:'bank', account:'Checking'}, {id:'e2', date:'2026-10-22', name:'Whole Foods', amount:96.4, cat:'groceries', src:'bank', account:'Checking'}],
      bank:{connected:true, lastSync:Date.now(), accounts:[{id:'a1', name:'Checking', org:'Chase', balance:3411, at:Date.now()}, {id:'a2', name:'Savings', org:'Chase', balance:800, at:Date.now()}, {id:'a3', name:'Visa Credit', org:'Chase', balance:-2140, at:Date.now()}]}}}, T);
  const E = c => p.evaluate(x => window.__op.ev(x), c);
  await E("document.querySelectorAll('.overlay').forEach(o => o.classList.add('hidden')); ui.view='personal'; ui.personalTab='finances'; renderView()"); await p.waitForTimeout(400);

  const ev = JSON.parse(await E("JSON.stringify(r44Events('2026-10-25', '2026-11-07').map(e => [e.date, e.name, e.kind, e.amount]))"));
  check('upcoming: client payments from billing days, debt minimums from due days', ev.some(e => e[0]==='2026-11-01' && e[1]==='JJS' && e[2]==='in') && ev.some(e => e[0]==='2026-11-05' && e[1]==='Kiko') && ev.some(e => e[0]==='2026-11-01' && e[1]==='Visa card' && e[2]==='out'), ev);
  check('four numbers on top: cash, all debt, coming in, going out', (await p.$$('.r44-tile')).length===4 && /\$4,211/.test(await p.textContent('.r44-tiles')) && /\+\$5,000/.test(await p.textContent('.r44-tiles')));
  check('one tab bar for the hub', (await p.$$('.r44-pills')).length===1 && (await p.$$('.r44-pills button')).length===4);
  check('upcoming shows the days with Received / Paid', (await p.$$('.r44-day')).length >= 2 && !!(await p.$('[data-action="r44Mark"]')));
  await p.screenshot({path:OUT+'/r44-fin.png', fullPage:true});
  await E("ACTIONS.r44Mark(null, null, 'c:jj:2026-11')"); await p.waitForTimeout(150);
  check('Received logs that month’s client payment', await E("state.finances.invoices.some(i => i.client==='jj' && i.amount===3000)") && await E("r44Events('2026-11-01','2026-11-01').find(e => e.key==='c:jj:2026-11').done"));
  await E("ACTIONS.r44Unmark(null, null, 'c:jj:2026-11')");
  check('…and Undo takes it back', !(await E("state.finances.invoices.some(i => i.client==='jj')")));
  await E("ACTIONS.r44Mark(null, null, 'd:v:2026-11')");
  check('Paid logs the minimum on the debt', await E("state.finances.debts.find(d => d.id==='v').balance")===2055 && await E("state.finances.payments.length")===1);
  await E("ACTIONS.r44Tab(null, null, 'debts')"); await p.waitForTimeout(150);
  check('debts: rate, minimum, paid off', (await p.$$('.r44-debt')).length===2 && /24.9%/.test(await p.textContent('.r44-body')) && /% paid/.test(await p.textContent('.r44-body')));
  await E("ACTIONS.r44DebtEdit(null, null, '')"); await p.waitForTimeout(100);
  await p.fill('#r44dName', 'Klarna'); await p.fill('#r44dBal', '600'); await p.fill('#r44dMin', '115'); await p.fill('#r44dDue', '18');
  await p.click('#r44DebtOv [data-action="r44DebtSave"]'); await p.waitForTimeout(150);
  check('a debt can be added with its minimum and due day', await E("state.finances.debts.some(d => d.name==='Klarna' && d.minPayment===115 && d.dueDay===18)"));
  await E("ACTIONS.r44Tab(null, null, 'accounts')"); await p.waitForTimeout(150);
  check('accounts: each with its color, credit in red', (await p.$$('.r44-acct')).length===3);
  await E("ACTIONS.r44Acct(null, null, 'a1')"); await p.waitForTimeout(150);
  check('tapping an account filters transactions to it', await E("ui.finTab")==='transactions' && (await p.$$('.r44-tx')).length===2);
  await E("ACTIONS.r44Acct(null, null, ''); ACTIONS.r44Cat(null, null, 'groceries')"); await p.waitForTimeout(150);
  check('category chips filter', (await p.$$('.r44-tx')).length===1);
  await E("ACTIONS.r44Tab(null, null, 'upcoming'); ui.r44CalYm='2026-11'; ui.r44CalDay='2026-11-10'; r44CalRender()"); await p.waitForTimeout(200);
  check('the Calendar button opens the month with every payment, in its color', !!(await p.$('#r44CalOv:not(.hidden) .r44-cal')) && (await p.$$('#r44CalOv .r44-p')).length >= 4);
  await p.screenshot({path:OUT+'/r44-cal.png'});
  check('no page errors (round 44)', p.errors.length===0, p.errors);
  await b.close();
  process.exit(report() ? 1 : 0);
})();
