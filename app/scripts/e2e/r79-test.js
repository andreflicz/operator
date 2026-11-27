// Round 79 — Mind view: pick then open, the whole app when opened, page changes from the map open it, no Space
// lock, a real 3D start. Money: Spending (Other you can sort, rules that stick), Transactions (all, sortable,
// recategorize on the row), debts by rate (high or low), no extra + Debt, the + form takes a rate, the check-in
// fixes things, the monthly review task, statements (OFX/CSV) without doubles, bills that repeat on the calendar.
// Holidays end when they're over; a pick lasts until that holiday ends. Asleep behind a closed window.
// Run: node scripts/e2e/r79-test.js dist/command-center-2.html
const path = require('path');
const { instrument, launch, newPage, check, report, OUT } = require('./common');
const SRC = process.argv[2] || 'dist/command-center-2.html';
const FILE = path.join(OUT, 'r79.html');
instrument(SRC, FILE);
const money = require('./r79-seed')();
const ds = (o) => { const d = new Date(); d.setDate(d.getDate() + o); return d.toISOString().slice(0, 10); };
(async () => {
  const browser = await launch();
  // ---------- the Mind view ----------
  let page = await newPage(browser, FILE, {profile:{name:'Andre', viewMode:'mind'}, tasks:{items:[{id:'t1', title:'Cut reels', status:'today', deadline:ds(-2)}]}, business:{clients:[{id:'c1', name:'Batusha Corp', status:'active', mrr:1200, touches:[ds(-1)]}], pipeline:[]}});
  await page.setViewportSize({width:1440, height:900});
  let errs = []; page.on('pageerror', (e) => errs.push(e.message));
  let ev = (code) => page.evaluate((c) => window.__op.ev(c), `(function(){ ${code} })()`);
  await page.waitForTimeout(2200);
  check('it starts tilted, looking across the galaxy (not down on a sheet)', await ev(`return MIND.pitch > -0.6;`));
  const nearFar = await ev(`const s = MIND.nodes.filter(n=>n.kind==='sector' && n.sp[2]>0).map(n=>n.sp[2]); return Math.max.apply(null, s)/Math.min.apply(null, s);`);
  check('some planets are much nearer than others', nearFar > 1.5, nearFar);
  const sp = await ev(`const n = MIND.byId['s:business']; return [n.sp[0], n.sp[1]];`);
  await page.mouse.click(sp[0], sp[1]); await page.waitForTimeout(900);
  const sel = await ev(`return {dive:MIND.dive, sel:MIND.sel && MIND.sel.id, card:document.getElementById('r73Insp').classList.contains('is-in')};`);
  check('a click picks a planet (its card shows), it doesn’t open by itself', !sel.dive && sel.sel==='s:business' && sel.card, sel);
  await page.click('#r73Insp [data-action="r73mDive"]'); await page.waitForTimeout(700);
  const op = await ev(`const a = document.getElementById('app').getBoundingClientRect(); return {dive:MIND.dive, view:ui.view, full:a.width >= innerWidth - 2 && a.height >= innerHeight - 2, side:getComputedStyle(document.querySelector('#app .sidebar')).display, map:getComputedStyle(document.getElementById('r79MapNav')).display, galaxy:getComputedStyle(document.getElementById('mindRoot')).visibility};`);
  check('Open shows the whole app, sidebar and all, and the galaxy steps out', op.dive && op.view==='business' && op.full && op.side!=='none' && op.map!=='none' && op.galaxy==='hidden', op);
  await page.click('.sidebar .nav-item[data-view="settings"]'); await page.waitForTimeout(400);
  check('every tab works from in there', await ev(`return ui.view==='settings' && MIND.dive;`));
  await page.click('#r79MapNav'); await page.waitForTimeout(600);
  check('Map at the top of the sidebar goes back to the galaxy', await ev(`return !MIND.dive && getComputedStyle(document.getElementById('mindRoot')).visibility==='visible';`));
  const sp2 = await ev(`const n = MIND.byId['s:calendar']; return [n.sp[0], n.sp[1]];`);
  await page.mouse.dblclick(sp2[0], sp2[1]); await page.waitForTimeout(900);
  check('a double-click opens a planet', await ev(`return MIND.dive && ui.view==='calendar';`));
  await page.keyboard.press('Escape'); await page.waitForTimeout(500);
  // (the galaxy turns slowly, so Social may be off the edge right now: pick it the way a click does, then Enter)
  const sp3 = await ev(`const n = MIND.byId['s:social']; r73Inspect(n); return n.id;`);
  await page.waitForTimeout(300); await page.keyboard.press('Enter'); await page.waitForTimeout(700);
  check('Social opens (click, then Enter)', await ev(`return MIND.dive && ui.view==='convos';`), sp3);
  await page.keyboard.press('Escape'); await page.waitForTimeout(500);
  await ev(`ACTIONS.openFocus ? ACTIONS.openFocus() : (ui.view='focus', renderView()); return 1;`); await page.waitForTimeout(500);
  check('a page change from the map (a quest’s Do it) opens the app instead of changing out of sight', await ev(`return MIND.dive && ui.view==='focus';`));
  await page.keyboard.press('Escape'); await page.waitForTimeout(500);
  await page.keyboard.press('Space'); await page.waitForTimeout(300);
  check('Space doesn’t lock you in or out anymore', await ev(`return !state.focus.activeSession;`));
  // asleep behind a closed window
  const sl = await ev(`const r = r79WinState({shown:false}); let ran = 0; requestAnimationFrame(function(){ ran = 1; }); return new Promise(function(res){ setTimeout(function(){ res({r:r, cls:document.body.className, ran:ran, running:document.getAnimations().filter(a=>a.playState==='running').length}); }, 300); });`);
  check('hidden: it goes to sleep (no animations, nothing drawn frame by frame)', sl.r.asleep && /op-asleep/.test(sl.cls) && sl.ran===0 && sl.running===0, sl);
  const dp = await ev(`r79Deep(); return {deep:R79S.deep, vr:document.getElementById('viewRoot').innerHTML.length};`);
  check('after a while hidden it lets go of the page', dp.deep && dp.vr===0, dp);
  const wk = await ev(`r79WinState({shown:true, focused:true}); return new Promise(function(res){ setTimeout(function(){ res({asleep:R79S.asleep, vr:document.getElementById('viewRoot').innerHTML.length, cls:document.body.className}); }, 300); });`);
  check('…and it’s all back the moment the window is', !wk.asleep && wk.vr > 100 && !/op-asleep|op-deep/.test(wk.cls), wk);
  check('Mind view: no page errors', !errs.length, errs);
  await page.close();

  // ---------- money ----------
  page = await newPage(browser, FILE, Object.assign({profile:{name:'Andre'}}, money));
  await page.setViewportSize({width:1440, height:1000});
  errs = []; page.on('pageerror', (e) => errs.push(e.message));
  ev = (code) => page.evaluate((c) => window.__op.ev(c), `(function(){ ${code} })()`);
  await page.waitForTimeout(2200);
  const bills = await ev(`return state.finances.bills.map(b=>b.rkey);`);
  check('bills that repeat (GHL, Verizon, Google) go on the finance calendar by themselves; the coffee shop and the subway don’t', ['highlevel gohighlevel', 'verizon wireless', 'google'].every(k => bills.indexOf(k) >= 0) && bills.length===3, bills);
  const cal = await ev(`const e = r44Events(todayStr().slice(0,7)+'-01', addDays(todayStr(), 40)).filter(x=>x.billId); return e.map(x=>x.name+'|'+x.sub+'|'+x.done+'|'+x.date);`);
  check('…on the calendar as "repeats every month", already paid once the charge is in the bank', cal.length >= 3 && cal.every(c => /Repeats every month/.test(c)) && cal.some(c => /\|true\|/.test(c)), cal);
  const tabs = await ev(`ui.view='personal'; ui.personalTab='finances'; ui.finTab='spending'; renderView(); return {tab:!!document.querySelector('[data-action="r44Tab"][data-id="spending"].is-on'), cats:[...document.querySelectorAll('.r79-cat .r79-cn')].map(x=>x.textContent.trim().split(/\\s+/)[0]), moved:!!document.querySelector('.r79-sp-mv')};`);
  check('Spending: where the money went, by category; transfers shown apart (not counted)', tabs.tab && tabs.cats.length >= 4 && tabs.moved, tabs);
  check('"Not spending" is called Transfers now', await ev(`return expCat('move').label==='Transfers';`));
  // Other: open it and sort a place; every charge from there follows, and new ones too
  const oth = await ev(`state.finances.expenses.push({id:'x1', date:todayStr(), name:'KINGS CUTS 4412', amount:40, cat:'other', src:'bank'}, {id:'x2', date:addDays(todayStr(), -3), name:'KINGS CUTS #88', amount:40, cat:'other', src:'bank'}); ui.r79Cat='other'; renderView(); return !!document.querySelector('[data-r79-rule="kings cuts"]');`);
  check('Other opens to the places in it, by who you paid', oth);
  await page.selectOption('[data-r79-rule="kings cuts"]', 'health'); await page.waitForTimeout(300);
  const rule = await ev(`const k = state.finances.expenses.filter(e=>/KINGS CUTS/.test(e.name)); return {moved:k.every(e=>e.cat==='health'), next:expGuessCat('KINGS CUTS 9921')};`);
  check('sorting a place moves every charge from it, and new ones follow', rule.moved && rule.next==='health', rule);
  // transactions
  const tx = await ev(`ui.finTab='transactions'; ui.r44Cat='all'; ui.r79TxSort='big'; renderView(); const a = [...document.querySelectorAll('.r44-tx .r44-a')].map(x=>Number(x.textContent.replace(/[^0-9.]/g,''))); return {n:a.length, sorted:a.slice(0,10).every((v,i,s)=>i===0||s[i-1]>=v), sel:document.querySelectorAll('select[data-r79-tx]').length, chips:[...document.querySelectorAll('.r44-chips button')].map(b=>b.dataset.id)};`);
  check('Transactions: every expense, sortable (biggest first), with the category changeable on the row', tx.n > 20 && tx.sorted && tx.sel > 0 && tx.chips.indexOf('spend') >= 0, tx);
  // debts
  const db = await ev(`ui.finTab='debts'; ui.r44Sort='rateHi'; renderView(); const hi = [...document.querySelectorAll('.r44-debt > b')].map(b=>b.textContent.trim()); ui.r44Sort='rateLo'; renderView(); const lo = [...document.querySelectorAll('.r44-debt > b')].map(b=>b.textContent.trim()); return {hi:hi, lo:lo, plus:!!document.querySelector('[data-action="r44DebtEdit"][data-id=""]'), sel:!!document.querySelector('[data-r79-dsort]')};`);
  check('debts: highest rate first works', db.hi.join()==='Capital One,Affirm,Car loan,Mom', db.hi);
  check('debts: lowest rate first works (no rate yet: last)', db.lo.join()==='Car loan,Affirm,Capital One,Mom', db.lo);
  check('no second "+ Debt" button (the + in the corner adds debts)', !db.plus && db.sel, db);
  const fab = await ev(`ui.finSheet='debt'; const h = finSheetHtml(); return /id="debtApr"/.test(h) && /id="debtMin"/.test(h) && /id="debtDue"/.test(h);`);
  check('the + button’s debt form asks for the rate, minimum and due day', fab);
  // the weekly check-in: mark what came in, add money you got
  const ck = await ev(`r55McOpen(); return new Promise(function(res){ setTimeout(function(){ res({fix:!!document.querySelector('.r79-fix'), got:!!document.querySelector('.r79-fix [data-action="r79Mark"]')}); }, 300); });`);
  check('the weekly check-in has a "Something off?" place to fix things', ck.fix && ck.got, ck);
  await page.click('[data-action="r79Paid"]'); await page.waitForTimeout(200);
  await page.fill('#r79PaidAmt', '650'); await page.fill('#r79PaidFrom', 'Batusha Corp'); await page.click('[data-action="r79PaidSave"]'); await page.waitForTimeout(300);
  check('"I got paid" right in the check-in (a client’s name counts as their payment)', await ev(`return state.finances.invoices.some(i=>i.client==='c1' && i.amount===650);`));
  await ev(`addSheetClose('r55Money'); return 1;`);
  // the monthly review
  const mt = await ev(`masterTasksSync(); const t = state.tasks.items.find(x=>x.master && x.master.kind==='moneyMonth'); return t ? {title:t.title, status:t.status} : null;`);
  check('a monthly money review shows up as a master task', !!mt && /Monthly money review/.test(mt.title), mt);
  const ms = await ev(`const t = state.tasks.items.find(x=>x.master && x.master.kind==='moneyMonth'); completeTask(t.id); return new Promise(function(res){ setTimeout(function(){ res(!!document.querySelector('#r79Month:not(.hidden) .r55-mc-s') && document.querySelectorAll('#r79Month .r55-mc-s').length===5); }, 300); });`);
  check('ticking it opens the review (statements, upload, where it went, bills, one change)', ms);
  const fin = await ev(`['get','up','where','bills'].forEach(k=>ACTIONS.r79Ms(null,null,k)); ACTIONS.r79MonthFinish(); masterTasksSync(); const t = state.tasks.items.find(x=>x.master && x.master.kind==='moneyMonth'); return {done:t.status, rec:!!state.finances.monthReviews[r79ReviewYm()]};`);
  check('finishing it checks the task off', fin.done==='done' && fin.rec, fin);
  // statements: OFX and CSV, no doubles with what the bank sent
  const st = await ev(`const before = finExpenses().length; const ofx = '<OFX><STMTTRN><TRNTYPE>DEBIT<DTPOSTED>'+todayStr().replace(/-/g,'')+'<TRNAMT>-23.10<NAME>NEW PLACE NYC</STMTTRN><STMTTRN><TRNTYPE>DEBIT<DTPOSTED>'+finExpenses()[0].date.replace(/-/g,'')+'<TRNAMT>-'+finExpenses()[0].amount+'<NAME>'+finExpenses()[0].name+'</STMTTRN><STMTTRN><TRNTYPE>CREDIT<DTPOSTED>'+todayStr().replace(/-/g,'')+'<TRNAMT>500.00<NAME>PAYMENT THANK YOU</STMTTRN></OFX>'; const n = r79ImportList(r79Ofx(ofx), 'card.qfx'); return {n:n, added:finExpenses().length - before};`);
  check('a statement adds what’s new, skips what the bank already sent, and leaves card payments out', st.n===1 && st.added===1, st);
  const pdf = await ev(`let seen = null; AI.hasKey = true; aiPickModel = async function(){ return 'claude-sonnet-5-5'; }; aiCall = async function(req){ seen = req; return {ok:true, status:200, j:{content:[{type:'text', text:'Here: {"account":"Amex Gold","t":[["'+todayStr()+'","ZOOM.US 888-799-9666",15.99,"out"],["'+todayStr()+'","PAYMENT RECEIVED",300,"in"]]}'}]}}; }; return r79PdfScan('JVBERi0xLjQK', 'amex.pdf').then(function(){ const z = finExpenses().find(e=>/ZOOM/.test(e.name)); return {doc:seen && seen.messages[0].content[0].type==='document' && seen.messages[0].content[0].source.media_type==='application/pdf', z:z ? z.amount+'|'+z.account+'|'+z.cat : null, pay:finExpenses().some(e=>/PAYMENT RECEIVED/.test(e.name)), log:R79ST.log[0] && R79ST.log[0].t}; });`);
  check('a PDF statement goes to Op as the PDF itself, and what Op reads comes in as charges (payments to the card left out)', pdf.doc && pdf.z==='15.99|Amex Gold|subs' && !pdf.pay, pdf);
  // holidays
  const hol = await ev(`const y = Number(todayStr().slice(0,4)), tg = holThanksgiving(y); return {before:holToday(addDays(tg,-2)), day:holToday(tg), after:holToday(addDays(tg,1)), xmas:holToday(y+'-12-25'), boxing:holToday(y+'-12-26'), ny:holToday(y+'-12-31')};`);
  check('holidays end when they’re over (Thanksgiving through the day itself, Christmas on the 25th)', hol.before==='thanksgiving' && hol.day==='thanksgiving' && hol.after===null && hol.xmas==='christmas' && hol.boxing===null && hol.ny==='newyear', hol);
  const pick = await ev(`ACTIONS.r79HolPick(null, null, 'christmas'); const a = holActive(); const p = state.profile.holidayPick; state.profile.holidayPick = {id:'halloween', until:addDays(todayStr(), -1)}; const b = holActive(); return {a:a, until:p.until, b:b, cleared:state.profile.holidayPick===null};`);
  check('pick one by hand: it’s on until that holiday ends, then back to automatic', pick.a==='christmas' && /-12-25$/.test(pick.until) && pick.b!=='halloween' && pick.cleared, pick);
  check('money: no page errors', !errs.length, errs);
  await browser.close();
  report('Round 79');
})();
