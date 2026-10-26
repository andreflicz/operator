// Round 48/49: Op tags, busy etc. are in r45; this covers the real-use fixes and Square/Stripe.
const { instrument, launch, newPage, check, report, OUT } = require('./common.js');
(async () => {
  instrument(process.argv[2], OUT+'/r48.html');
  const b = await launch();
  const at = (d, h) => new Date(2026, 9, d, h).getTime();
  const p = await newPage(b, OUT+'/r48.html', {profile:{name:'Andre Lopez', xpBook:43, bedtime:'23:30', xpAreas:[{id:'work', name:'Work', on:true}, {id:'health', name:'Health', on:false}, {id:'personal', name:'Personal', on:true}, {id:'x1', name:'Music', on:true}]},
    business:{clients:[{id:'jj', name:'Jay', business:'JJS', email:'jay@jjs.co', stage:'active', status:'active', mrr:3000, billingDay:1, deliverables:[]}, {id:'ki', name:'Kiko Ruiz', business:'Kiko', stage:'active', status:'active', mrr:2000, billingDay:5, deliverables:[]}]},
    finances:{debts:[], payments:[], income:[], invoices:[], expenses:[]}, focus:{wake:{voice:false}}}, at(25, 13));
  const H = {'Access-Control-Allow-Origin':'*', 'content-type':'application/json'};
  await p.route(/127\.0\.0\.1:8935\/pay\//, r => {
    const u = new URL(r.request().url()), path = u.pathname;
    if(path.startsWith('/pay/status')) return r.fulfill({status:200, headers:H, body:JSON.stringify({ok:true, square:true, stripe:true})});
    const api = Buffer.from(u.searchParams.get('p') || '', 'hex').toString(), s = u.searchParams.get('s');
    if(s==='square' && api.startsWith('/v2/payments')) return r.fulfill({status:200, headers:H, body:JSON.stringify({payments:[{id:'A1', status:'COMPLETED', amount_money:{amount:300000, currency:'USD'}, created_at:'2026-10-02T15:00:00Z', buyer_email_address:'JAY@jjs.co'}, {id:'A2', status:'COMPLETED', amount_money:{amount:50000, currency:'USD'}, created_at:'2026-10-20T15:00:00Z', note:'logo job', customer_id:'C9'}]})});
    if(s==='square' && api.startsWith('/v2/customers')) return r.fulfill({status:200, headers:H, body:JSON.stringify({customer:{given_name:'Marco', family_name:'B'}})});
    if(s==='stripe' && api.startsWith('/v1/charges')) return r.fulfill({status:200, headers:H, body:JSON.stringify({data:[{id:'ch_1', paid:true, status:'succeeded', amount:200000, amount_refunded:0, currency:'usd', created:Math.floor(at(5, 12)/1000), billing_details:{name:'Kiko Ruiz'}, description:'Kiko retainer'}], has_more:false})});
    return r.fulfill({status:200, headers:H, body:'{}'});
  });
  const E = c => p.evaluate(x => window.__op.ev(x), c);
  await E("document.querySelectorAll('.overlay').forEach(o => o.classList.add('hidden'))");
  // mood tags never show / get spoken
  check('mood tags are taken out of anything he says', await E("opNoTags('[mood:humor] Fair point.')")==='Fair point.' && (await E("speakable('[mood:concern] You good?')")).indexOf('mood')<0);
  check('the live brief no longer asks for mood tags', !/\[mood:/.test(await E("opLiveRules()")));
  // XP from everything: the three areas, all on, nothing custom
  check('XP areas: Work, Health, Personal, always on', await E("r43Areas().map(a => a.id).join(',')")==='work,health,personal');
  // settings
  await E("ui.view='settings'; ui.settingsTab='you'; renderView()"); await p.waitForTimeout(200);
  const nav = await p.textContent('.settings-sidenav');
  check('Settings: no XP & Areas, a Good morning place', !/XP & Areas/.test(nav) && /Good morning/.test(nav));
  check('Settings → You has Sleep (bedtime)', !!(await p.$('#r43Bedtime')));
  // goals menu
  await E("ui.view='personal'; ui.personalTab='goals'; ui.r43Menu=true; renderView()"); await p.waitForTimeout(200);
  const menu = await p.textContent('.r43-cmenu');
  check('Goals Customize: Plan ahead, the check-ins', /Plan ahead/.test(menu) && /Check in for/.test(menu) && !(await p.$('.tg-edit')));
  // payments
  await E("ui.view='personal'; ui.personalTab='finances'; renderView()"); await p.waitForTimeout(1800);
  const inv = JSON.parse(await E("JSON.stringify(state.finances.invoices.map(i => [i.client, i.amount, i.src]))"));
  check('Square: a client’s payment (by email) is logged as theirs', inv.some(i => i[0]==='jj' && i[1]===3000 && i[2]==='square'), inv);
  check('Stripe: matched by name', inv.some(i => i[0]==='ki' && i[1]===2000 && i[2]==='stripe'), inv);
  check('…and the month shows Received by itself', await E("r44Events('2026-10-01','2026-10-31').find(e => e.key==='c:jj:2026-10').done"));
  check('a payment it can’t place waits for you', await E("payCfg().unmatched.length")===1 && /Marco/.test(await p.textContent('.r49-pay')));
  await p.selectOption('#payAs-sq_A2', 'ki'); await E("ACTIONS.payAssign(null, null, 'sq_A2')"); await p.waitForTimeout(150);
  check('…one tap logs it to the client you pick', await E("state.finances.invoices.some(i => i.payId==='sq_A2' && i.client==='ki')") && await E("payCfg().unmatched.length")===0);
  await E("payCfg().at = 0; paySync(true)"); await p.waitForTimeout(1200);
  check('syncing again doesn’t log anything twice', await E("state.finances.invoices.length")===3);
  // first name on the card, log center views
  check('your card: first name only', /pc-name">Andre</.test(await E("playerCardHtml('big')")));
  await E("ui.view='business'; ui.businessTab='log'; ui.r48LogView='recent'; state.business.clients[0].touchpoints=[{id:'t', type:'text', date:'2026-10-24', note:'recap', ts:Date.now()-86400000}]; renderView()"); await p.waitForTimeout(150);
  check('Log center: a Recent touches view of its own', !!(await p.$('.r48-rt')) && /recap/.test(await p.textContent('.r48-rtl')));
  check('no page errors (round 48/49)', p.errors.length===0, p.errors);
  await b.close(); process.exit(report() ? 1 : 0);
})();
