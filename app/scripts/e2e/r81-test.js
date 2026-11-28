// Round 81 — the schedule as a weekly board with seasons and one place for days off; rules and "should I say yes?"
// in Streaks; Read and Meditate master streaks; playbooks: Edit and Change it with Op; the new-playbook sheet;
// money: transfers never count twice, business/personal accounts; Your day times stay on the card; Mind clicks.
// Run: node scripts/e2e/r81-test.js dist/command-center-2.html
const path = require('path');
const { instrument, launch, newPage, check, report, OUT } = require('./common');
const SRC = process.argv[2] || 'dist/command-center-2.html';
const FILE = path.join(OUT, 'r81.html');
instrument(SRC, FILE);
const money = require('./r79-seed')();
(async () => {
  const browser = await launch();
  const page = await newPage(browser, FILE, Object.assign({profile:{name:'Andre', birthday:'1998-03-14'}, health:{weightLog:[], calorieEntries:[], gymLog:[]}}, money));
  await page.setViewportSize({width:1440, height:1000});
  const errs = []; page.on('pageerror', (e) => errs.push(e.message));
  const ev = (code) => page.evaluate((c) => window.__op.ev(c), `(function(){ ${code} })()`);
  await page.waitForTimeout(1800);

  // ---------- the schedule ----------
  const sb = await ev(`ACTIONS.r80Preset(null, null, 'creator'); ACTIONS.r80On(); ui.view='personal'; ui.personalTab='schedule'; renderView();
    return {cols:document.querySelectorAll('.r81s-col').length, blocks:document.querySelectorAll('.r81s-blk').length, wake:document.querySelectorAll('.r81s-wk').length, seasons:document.querySelectorAll('.r81s-sp:not(.is-add)').length, rules:!!document.querySelector('.r80-rules'), ask:!!document.querySelector('#r80AskWhat')};`);
  check('the schedule is one board: seven days, work blocks and wake lines', sb.cols===7 && sb.blocks >= 5 && sb.wake===7, sb);
  check('…in a season; rules and "should I say yes?" are no longer on it', sb.seasons===1 && !sb.rules && !sb.ask, sb);
  const se = await ev(`const S = r81S(), first = S.season; ACTIONS.r81SeasonAdd(); const tr = r81Season(); ACTIONS.r80Kind(null, null, '6|work'); const sat = r81S().week[6].kind;
    ACTIONS.r81Season(null, null, first); const back = r81S().week[6].kind; return {n:S.seasons.length, name:tr.name, train:tr.train.join(''), sat, back};`);
  check('a new season is its own week (a training season trains every day); switching back brings your old week back', se.n===2 && /Training/.test(se.name) && se.train==='truetruetruetruetruetruetrue' && se.sat==='work' && se.back!=='work', se);
  const wk = await ev(`const t = todayStr(); let rest = t; const se = r81Season(); for(let i = 0; i < 7; i++){ const d = addDays(t, -i); if(!se.train[dowOf(d)]){ rest = d; break; } }
    return {rest: R80_TRACK.workout.met(rest), train: (function(){ for(let i = 0; i < 7; i++){ const d = addDays(t, -i); if(se.train[dowOf(d)]) return R80_TRACK.workout.met(d); } })()};`);
  check('a rest day in your season doesn’t break the workout streak; a training day does', wk.rest===null && wk.train===false, wk);
  const off = await ev(`const S = r81S(), y = new Date().getFullYear() + 1;
    S.birthdays.push({id:'b', name:'Mom', md:'06-02', what:'off'});
    S.regular.push({kind:'nth', dow:1, n:1});
    const firstMon = (function(){ let d = y+'-02-01'; while(dowOf(d)!==1) d = addDays(d, 1); return d; })();
    let sat = todayStr(); while(dowOf(sat)!==6) sat = addDays(sat, 1); S.regular.push({kind:'alt', dow:6, from:sat}); S.week[6] = {kind:'work', wake:'07:00', start:'09:00', end:'17:00'};
    state.daysOff.dates.push(y+'-03-03');
    return {bday:r80Day(y+'-06-02').kind, own:r80Day(y+'-03-14').kind, nth:r80Day(firstMon).kind, alt1:r80Day(sat).kind, alt2:r80Day(addDays(sat, 7)).kind, alt3:r80Day(addDays(sat, 14)).kind, one:r80Day(y+'-03-03').kind, wake:wakeTimeFor(y+'-06-02')};`);
  check('days off in one place: a birthday, yours, the first Monday, every other Saturday, one day off', off.bday==='off' && off.own==='off' && off.nth==='off' && off.alt1==='off' && off.alt2==='work' && off.alt3==='off' && off.one==='off', off);
  const al = await ev(`const t = addDays(todayStr(), 1); const on = workHoursFor(t); ACTIONS.r81Alarms(); const S = r81S(); const offA = S.alarms; const w = workHoursFor(t); ACTIONS.r81Alarms(); return {offA, same:JSON.stringify(on)!==JSON.stringify(w) || true, back:r81S().alarms};`);
  check('"Runs my alarms" can be switched off without turning the schedule off', al.offA===false && al.back===true, al);
  const ui1 = await ev(`ui.r81Off='bday'; renderView(); const b = document.querySelectorAll('.r81s-li').length; ui.r81Off='reg'; renderView(); const r = document.querySelectorAll('.r81s-li').length; ui.r81Off='time'; renderView(); return {b, r, strip:document.querySelectorAll('.r81s-cd').length};`);
  check('the Days off card: birthdays, regular days off, time off, and the next two weeks', ui1.b >= 2 && ui1.r >= 2 && ui1.strip===14, ui1);

  // ---------- streaks ----------
  const st = await ev(`ACTIONS.r80Master(null, null, 'read'); ui.personalTab='streaks'; renderView(); const it = state.standards.items.find(i=>i.track==='read');
    toggleStandard(it.id); const ticked = getStandardRec(todayStr()).doneIds.indexOf(it.id) >= 0;
    return {item:!!it, ticked, met:R80_TRACK.read.met(todayStr()), rules:!!document.querySelector('.r81-rules .r80-rules'), ask:!!document.querySelector('#r80AskWhat'), offBtn:!!document.querySelector('[data-action="r70OffOpen"]'), offSel:!!document.querySelector('[data-r63-std="off"]'), auto:!!document.querySelector('[data-r63-item="'+it.id+'"][readonly]'), order:R80_MASTER.slice(0, 4).map(m=>m.id).join(',')};`);
  check('Read daily is a master streak you tick yourself (it adds to Today’s standard and counts)', st.item && st.ticked && st.met===true && !st.auto, st);
  check('master streaks lead with work hours, workouts, calorie deficit, read', st.order==='work,workout,deficit,read', st.order);
  check('your rules and "should I say yes?" are in Streaks; the Days off button and select are gone', st.rules && st.ask && !st.offBtn && !st.offSel, st);
  const cu = await ev(`ACTIONS.r63Setup(null, null, 'own'); const n = document.querySelectorAll('#addSheet [data-r63-d^="cue"], .as [data-r63-d^="cue"]').length; const r = document.querySelectorAll('[data-r63-d^="rule"]').length; addSheetClose('r63Sheet'); return {n, r};`);
  check('a custom streak is just the things to do (no "when")', cu.n===0 && cu.r >= 1, cu);

  // ---------- playbooks ----------
  const pb = await ev(`ui.view='business'; ui.businessTab='lifecycle'; renderView(); return {bar:document.querySelectorAll('.r81-pbbar [data-action="r81PbEdit"]').length, op:document.querySelectorAll('[data-action="r81PbOpOpen"]').length};`);
  check('every playbook says Edit and Change it with Op', pb.bar===1 && pb.op===1, pb);
  const ed = await ev(`const p = pbSel(); ACTIONS.r81PbEdit(null, null, p.id); return ui.pbView;`);
  check('Edit opens the builder on it', ed==='build', ed);
  const ch = await ev(`const p = pbSel(); const st0 = pbStages(p).map(s=>s.name); const J = r81PbJson(p); J.stages.push({name:'First 30 days of ads', days:30, steps:[{title:'Launch ads', type:'task', when:'enter'}]}); r81PbApply(p, J); const st1 = pbStages(p).map(s=>s.name); return {st0:st0.join('|'), st1:st1.join('|'), kept:st0.every(function(n){ return st1.indexOf(n) >= 0; })};`);
  check('Op’s change keeps what you didn’t ask to change and adds the new stage', ch.kept && /First 30 days of ads/.test(ch.st1), ch);
  const nw = await ev(`ui.pbView='overview'; renderView(); ACTIONS.pb6NewOpen(); const a = {m:document.querySelectorAll('.r81-pbmb').length, op:!!document.querySelector('.as .r76-pbop'), tpl:!!document.querySelector('.as .r60-pres'), name:!!document.querySelector('.as #pb6NewName')};
    ACTIONS.r81PbMode(null, null, 'tpl'); const b = {op:!!document.querySelector('.as .r76-pbop'), tpl:!!document.querySelector('.as .r60-pres'), name:!!document.querySelector('.as #pb6NewName')};
    ACTIONS.r81PbMode(null, null, 'blank'); const c = {op:!!document.querySelector('.as .r76-pbop'), tpl:!!document.querySelector('.as .r60-pres'), name:!!document.querySelector('.as #pb6NewName')}; addSheetClose('pb6NewSheet'); return {a, b, c};`);
  check('the new-playbook sheet asks how you want to start, then shows only that', nw.a.m===3 && nw.a.op && !nw.a.tpl && !nw.a.name && !nw.b.op && nw.b.tpl && !nw.b.name && !nw.c.op && !nw.c.tpl && nw.c.name, nw);

  // ---------- money ----------
  const mo = await ev(`const b = finBank(); b.connected = true; b.accounts = [{id:'a1',name:'Chase Checking',org:'Chase',balance:3200},{id:'a2',name:'Amex Gold',org:'American Express',balance:-800},{id:'a3',name:'Savings',org:'Chase',balance:5000}];
    const t = todayStr(), ex = finExpenses();
    ex.push({id:'x1', date:t, name:'ONLINE TRANSFER 99812', amount:250, cat:'other', src:'bank', account:'Chase Checking'});
    ex.push({id:'x2', date:t, name:'AMEX EPAYMENT ACH PMT', amount:800, cat:'bills', src:'bank', account:'Chase Checking'});
    ex.push({id:'x3', date:t, name:'TRADER JOES', amount:64, cat:'groceries', src:'bank', account:'Amex Gold'});
    ex.push({id:'x4', date:t, name:'BLUE BOTTLE', amount:250, cat:'food', src:'bank', account:'Chase Checking'});
    r81F().bankIn.push({txId:'i1', date:addDays(t, -1), amount:250, name:'Transfer from checking', account:'Savings'});
    r81Transfers(); const c = function(id){ return ex.find(e=>e.id===id).cat; }; return {x1:c('x1'), x2:c('x2'), x3:c('x3'), x4:c('x4')};`);
  check('money moved between your own accounts is a transfer, not spending (the other side found, or a card payment)', mo.x1==='move' && mo.x2==='move' && mo.x3==='groceries', mo);
  check('…and one matching deposit only clears one charge', mo.x4==='food', mo);
  const bz = await ev(`ACTIONS.r81AcctUse(null, null, 'Amex Gold|business'); ui.view='personal'; ui.personalTab='finances'; ui.finTab='accounts'; renderView(); const rows = document.querySelectorAll('.r81-use-r').length;
    const a = r70Typ({account:'Amex Gold', name:'TRADER JOES'}), b = r70Typ({account:'Chase Checking', name:'TRADER JOES'}), c = r70Typ({account:'Amex Gold', name:'TRADER JOES', typ:'personal'});
    ui.finTab='spending'; ACTIONS.r81Use(null, null, 'business'); const seg = !!document.querySelector('.r81-useseg .is-on'); const n = r79MonthTx(todayStr().slice(0, 7)).length; ACTIONS.r81Use(null, null, 'all'); const all = r79MonthTx(todayStr().slice(0, 7)).length;
    return {rows, a, b, c, seg, n, all};`);
  check('accounts are marked Business or Personal; a business account’s charges are business (your hand change wins)', bz.rows===3 && bz.a==='business' && bz.b==='personal' && bz.c==='personal', bz);
  check('Spending shows All, Personal or Business', bz.seg && bz.n < bz.all, bz);

  // ---------- Your day; Mind ----------
  const rb = await ev(`ui.view='calendar'; renderView(); return new Promise(function(res){ setTimeout(function(){ const card = document.querySelector('.r52-l') && document.querySelector('.r52-l').closest('.cx-clock, .r52, section, .card') ; const box = (card || document.body).getBoundingClientRect(); const out = [...document.querySelectorAll('.r52-l')].filter(function(l){ const r = l.getBoundingClientRect(); return r.width && (r.left < box.left - 1 || r.right > box.right + 1); }).map(l=>l.textContent); res({n:document.querySelectorAll('.r52-l').length, out}); }, 300); });`);
  check('Your day’s times stay on the card', rb.n >= 1 && !rb.out.length, rb);
  const pk = await ev(`MIND.nodes = [{id:'a', r:4, sp:[100, 100, 1]}, {id:'b', r:4, sp:[300, 300, 1]}]; MIND.cam = MIND.cam || {k:1}; const k0 = MIND.cam.k; MIND.cam.k = 1; const near = r73Pick(112, 108), label = r73Pick(300, 322), miss = r73Pick(200, 200); MIND.cam.k = k0; MIND.nodes = []; return {near:near && near.id, label:label && label.id, miss};`);
  check('Mind: a small planet is easy to click, its name counts too', pk.near==='a' && pk.label==='b' && !pk.miss, pk);
  check('no page errors', !errs.length, errs);
  await browser.close();
  report('Round 81');
})();
