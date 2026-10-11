// Round 24: Op is a blue light (in the corner of the app, and the dot on Good morning); Good morning
// starts talking as it opens ("Op loading" until the first word), keeps work out of it, has the asks as
// small icons on the headlines, a few vision board pictures by the greeting (click one to see it big)
// with the level line centred over them, and a cleaner Get to work; work mode where Op speaks straight
// away and its bubble keeps clear of Lock in (and can be dragged); clocking out is a full-screen page
// with no toast; Places you like is saved (and lives in Settings → You); free data in from CSV exports
// that land in Downloads (Instagram insights → Social, a bank statement → Expenses).
const { instrument, launch, check, report, OUT } = require('./common.js');
const path = require('path');
const CORS = {'Access-Control-Allow-Origin':'*'};
const okJ = {status:200, body:'{"ok":true}', headers:CORS};
const hex = s => Buffer.from(s).toString('hex');
const BANK = 'Transaction Date,Post Date,Description,Category,Type,Amount\n10/12/2026,10/13/2026,CHIPOTLE 1234,Food,Sale,-14.20\n10/12/2026,10/13/2026,SHELL OIL,Gas,Sale,-48.10\n10/11/2026,10/12/2026,Payment Thank You,,Payment,500.00\n10/10/2026,10/11/2026,NETFLIX.COM,Bills,Sale,-15.49\n';
const INSIGHTS = 'Post ID,Account username,Description,Publish time,Permalink,Post type,Reach,Likes,Comments,Shares,Saves,Follows\n1,andre,Morning reel,10/12/2026 09:00,https://x/1,IG reel,2400,180,12,4,9,3\n2,andre,"Office tour, part 2",10/13/2026 17:30,https://x/2,IG carousel,1900,140,8,2,6,1\n';
const OTHER = 'Name,Email,Phone\nKiko,k@x.com,555\n';
function helperRoute(calls, files){
  return r => {
    const u = r.request().url(); calls.push(u.replace('http://127.0.0.1:8935', ''));
    if(u.includes('/inbox/list')) return r.fulfill({status:200, headers:CORS, body:JSON.stringify({ok:true, files:Object.keys(files).map(n => ({f:hex(n), n, m:files[n].m, s:files[n].t.length}))})});
    if(u.includes('/inbox/get')){ const n = Buffer.from(u.split('f=')[1], 'hex').toString(); return files[n] ? r.fulfill({status:200, headers:Object.assign({'Content-Type':'text/csv'}, CORS), body:files[n].t}) : r.fulfill({status:404, headers:CORS, body:'{}'}); }
    if(u.includes('/ai/status')) return r.fulfill({status:200, headers:CORS, body:'{"ok":true,"hasKey":false}'});
    return r.fulfill(okJ);
  };
}
async function ctxPage(b, seed, opts){
  opts = opts || {};
  const ctx = await b.newContext({viewport: opts.viewport || {width:1440, height:900}}); const p = await ctx.newPage(); p.errors = []; p.on('pageerror', e => p.errors.push(e.message));
  if(opts.clock) await p.clock.install({time:opts.clock});
  await p.addInitScript((seed) => { if(sessionStorage.getItem('s')) return; sessionStorage.setItem('s', '1'); Object.keys(seed).forEach(k => localStorage.setItem('opsdash:'+k, JSON.stringify(seed[k]))); }, seed);
  p.calls = []; p.files = opts.files || {};
  await p.route('http://127.0.0.1:8935/**', helperRoute(p.calls, p.files));
  await p.goto('file://'+path.resolve(OUT+'/r24.html')); await p.waitForTimeout(500);
  return p;
}
const pic = c => 'data:image/svg+xml;utf8,'+encodeURIComponent('<svg xmlns="http://www.w3.org/2000/svg" width="300" height="200"><rect width="300" height="200" fill="'+c+'"/></svg>');
const BOARD = {boards:[{id:'v1', kind:'vision', name:'Vision', parentId:null, viewport:{x:0,y:0,zoom:1}, elements:['#f00','#0f0','#00f','#ff0','#0ff','#f0f','#888'].map((c, i) => ({id:'i'+i, type:'image', ref:pic(c), x:(i%4)*320, y:Math.floor(i/4)*220, w:300, h:200, z:i+1}))}], masterId:'v1'};
(async () => {
  instrument(process.argv[2], OUT+'/r24.html');
  const b = await launch();
  const WED = new Date(2026,9,14,7,10,5).getTime();
  const WAKE = {enabled:true, time:'07:00', days:[0,1,2,3,4,5,6], news:false, intro:'quick', introChosen:true, voice:true};

  // ---- Good morning ----
  {
    const p = await ctxPage(b, {profile:{name:'Andre'}, boards:BOARD, focus:{wake:WAKE}, calendar:{events:[]}}, {clock:WED});
    const E = c => p.evaluate(x => window.__op.ev(x), c);
    await E("window.__says = []; opSay = function(t, o){ window.__says.push(t); return new Promise(r => setTimeout(() => r(true), 50)); }");
    await E("fireWake({})"); await p.click('[data-action="wakeStartDay"]'); await p.waitForTimeout(300);
    await E("OV.pre = {ready:false}"); await p.clock.runFor(1600); await p.waitForTimeout(300);
    check('Op is loading as Good morning opens: "Op loading" with a bar, no words yet', await p.isVisible('.br-voice.op-loading .br-voice-load') && !(await E("window.__says.length")));
    await E("OV.pre.ready = true"); await p.clock.runFor(800); await p.waitForTimeout(300);
    check('…then it speaks: the first line, right away', await E("window.__says.length")>=1 && /^Good morning, Andre\./.test(await E("window.__says[0]")));
    await p.clock.runFor(400); await p.waitForTimeout(200);
    check('…and the bar goes', !(await p.$('.br-voice.op-loading')));
    check('music or not, Op narrates (no Talk to Op gate)', await E("(function(){ const was = wakeAudio; wakeAudio = {volume:1}; OV.speaking = false; OV.pending = false; const r = opBriefTick(ui.briefLines, 1e7); wakeAudio = was; return r; })()")===true);
    check('a breath between lines, so the blue text keeps up', await E("(function(){ OV.lastEnd = Date.now(); const i = OV.idx; opBriefTick(ui.briefLines, 1e7); return OV.idx===i; })()"));
    await E("briefRevealAll()"); await p.waitForTimeout(500);
    check('no chips row, no Talk to Op, no speaker up top', !(await p.$('.br-opbar')) && !(await p.$('.br-opgo')) && !(await p.$('.brief-top .op-mute-top')));
    check('the blue light is the one way to talk to Op', await p.isVisible('.br-voice-dot[data-action="briefTalk"]'));
    const thumbs = await p.$$('.br-vstrip .br-vthumb');
    check('a few vision board pictures by the greeting (the middle of the board)', thumbs.length===5);
    const cen = await p.evaluate(() => { const h = document.querySelector('.br-vcol .b4-hud').getBoundingClientRect(), s = document.querySelector('.br-vstrip').getBoundingClientRect(); return Math.abs((h.left + h.width/2) - (s.left + s.width/2)); });
    check('the level line sits centred over them, small', cen < 3 && !(await p.$('.brief-top .b4-hud')) && await p.evaluate(() => document.querySelector('.br-vcol .b4-hud .xp-badge').getBoundingClientRect().width) <= 16, cen);
    await thumbs[1].click(); await p.waitForTimeout(300);
    check('click one: it opens big (to look at, nothing to edit)', await p.isVisible('.br-lightbox .br-lb-fig img') && !(await p.$('.br-lightbox [contenteditable], .br-lightbox input')));
    await p.click('.br-lb-nav.is-next'); await p.waitForTimeout(200);
    check('…the arrows go through the rest', await E("ui.briefVis")===2);
    await p.keyboard.press('ArrowLeft'); await p.waitForTimeout(150);
    check('…(the arrow keys too)', await E("ui.briefVis")===1);
    await p.keyboard.press('Escape'); await p.waitForTimeout(200);
    check('…Esc closes it, and Good morning stays', !(await p.$('.br-lightbox')) && await E("overlayOpen('wakeOverlay')"));
    await thumbs[0].click(); await p.waitForTimeout(200); await p.click('.br-lb-all'); await p.waitForTimeout(300);
    check('…"Whole board" shows the board', await p.isVisible('.br-vision-big') && !(await p.$('.br-lightbox')));
    await E("ui.wakeBoardBig = false; renderWakeOverlayInto()");
    check('Get to work: the new button', await p.isVisible('.brief-go.bgo2 .bgo-a svg') && /Get to work/.test(await p.textContent('.brief-go.bgo2')));
    check('no work talk in Good morning: Op is told so', /Don’t bring up work/.test(await E("aiSystem()[1].text")));
    check('…and the rewrite of the narration keeps it about the morning', await E("(function(){ let t = ''; const w = aiWrite, k = AI.hasKey; AI.hasKey = true; aiWrite = function(x){ t = x; return Promise.resolve(''); }; ui.briefAi = null; opBriefRewrite([{key:'hero', text:'It’s 7.'}]); aiWrite = w; AI.hasKey = k; return /not work/.test(t); })()"));
    await E("window.__l = 0; aiListen = function(){ window.__l++; }; window.__says = []");
    await p.click('.br-voice-dot', {force:true}); await p.waitForTimeout(400);
    check('the blue light: Op stops the rundown, says good morning, and listens', await E("OV.idx")===999 && /What do you want to start with/.test(await E("window.__says[0] || ''")) && await E("window.__l")===1);
    check('no page errors (good morning)', p.errors.length===0, p.errors);
    await p.context().close();
  }

  // ---- the asks on the headlines; work mode ----
  {
    const p = await ctxPage(b, {profile:{name:'Andre'}, focus:{wake:Object.assign({}, WAKE, {news:true})}, tasks:{items:[{id:'t1', title:'Edit JJS reel', status:'today', priority:'high', clients:[]}]}}, {clock:WED});
    const E = c => p.evaluate(x => window.__op.ev(x), c);
    await E("ui.morningNews = {date:todayStr(), items:[{title:'Big news today', link:'https://x/1', src:'Reuters'}], sec:{}}; morningNewsOn = () => true; newsSections = () => []");
    await E("fireWake({})"); await p.click('[data-action="wakeStartDay"]'); await p.waitForTimeout(300); await E("ui.morningNews = {date:todayStr(), items:[{title:'Big news today', link:'https://x/1', src:'Reuters'}], sec:{}}; briefRevealAll()"); await p.waitForTimeout(400);
    const asks = await p.$$('.br-news .br-k .br-asks .br-ask');
    check('sports, news, tech, business: four small icons in the Headlines corner, no words', asks.length===4 && (await p.textContent('.br-asks')).trim()==='' && await p.$$eval('.br-ask', bs => bs.every(x => x.getAttribute('title'))));
    await E("window.__says = []; opSay = function(t, o){ window.__says.push([t, o && o.cap]); return new Promise(r => setTimeout(() => r(true), 30)); }");
    await p.click('.br-ask[data-id="business"]'); await p.waitForTimeout(400);
    check('…and Op answers in the blue line on Good morning', await E("window.__says.length")>=1 && await E("window.__says[0][1]")==='brVoice');
    // work mode: Op speaks straight away
    await E("window.__says = []; document.querySelectorAll('.overlay').forEach(o => o.classList.add('hidden')); clockIn({from:'morning', quiet:true})"); await p.waitForTimeout(150);
    check('work mode: Op speaks right away (no waiting on the brief)', await E("window.__says.length")>=1 && await E("window.__says[0][1]")==='opBubText');
    await p.waitForTimeout(800);
    check('…then gives the brief', await E("window.__says.some(s => /Edit JJS reel/.test(s[0]))"));
    await E("OV.cap = 'opBubText'; opBubShow(); opCaption('One two three four five six seven eight nine ten.')"); await p.waitForTimeout(500);
    const ov = await p.evaluate(() => { const a = document.getElementById('opBub').getBoundingClientRect(), g = document.querySelector('#planOverlay .pr-go').getBoundingClientRect(); return !(a.right < g.left || a.left > g.right || a.bottom < g.top || a.top > g.bottom); });
    check('the bubble stays clear of Lock in, in the corner by the light', !ov && await E("document.body.classList.contains('op-ov')"));
    const hb = await p.evaluate(() => { const r = document.querySelector('#opBub .op-bub-h').getBoundingClientRect(); return {x:r.left + 60, y:r.top + r.height/2}; });
    await p.mouse.move(hb.x, hb.y); await p.mouse.down(); await p.mouse.move(hb.x + 300, hb.y - 200, {steps:6}); await p.mouse.up(); await p.waitForTimeout(200);
    check('…and it can be dragged out of the way; it stays there', !!(await E("state.focus.opBubPos")) && await p.evaluate(() => document.getElementById('opBub').classList.contains('is-moved')));
    check('no page errors (asks, work mode)', p.errors.length===0, p.errors);
    await p.context().close();
  }

  // ---- clocking out; places you like ----
  {
    const p = await ctxPage(b, {profile:{name:'Andre'}, focus:{wake:Object.assign({}, WAKE, {voice:false})}}, {clock:new Date(2026,9,14,18,0,5).getTime()});
    const E = c => p.evaluate(x => window.__op.ev(x), c);
    await E("ui.view='today'; renderView()"); await p.waitForTimeout(200);
    await p.click('[data-action="clockOut"]'); await p.waitForTimeout(400);
    check('clock out: no "done for the day" toast, no flash', !/Done for the day/.test(await p.evaluate(() => document.body.innerText)) && !(await p.$('.lock-flash.is-clock')));
    check('…a full-screen clocked-out page', await p.isVisible('#viewRoot .np.rest.is-clockedout.rest-full') && await E("document.body.classList.contains('np-on')") && /That’s the day/.test(await p.textContent('.dayoff-h')));
    await p.click('.dayoff-back[data-action="clockIn"]'); await p.waitForTimeout(400);
    check('…Clock back in still works', !(await E("!!(state.modes.active && state.modes.active.clockedOut)")));
    await E("document.querySelectorAll('.overlay').forEach(o => o.classList.add('hidden')); showOverlay('wakeSetupOverlay'); renderWakeSetupInto()"); await p.waitForTimeout(200);
    await p.fill('#wakeSetupContent [data-wake="places"]', 'Riverside Park, Blue Bottle'); await p.dispatchEvent('#wakeSetupContent [data-wake="places"]', 'change'); await p.waitForTimeout(200);
    check('Places you like is saved (it used to vanish)', await E("wakeCfg().places")==='Riverside Park, Blue Bottle' && await p.inputValue('#wakeSetupContent [data-wake="places"]')==='Riverside Park, Blue Bottle');
    check('…and kept after a reload', await p.evaluate(() => JSON.parse(localStorage.getItem('opsdash:focus')).wake.places)==='Riverside Park, Blue Bottle');
    await E("hideOverlay('wakeSetupOverlay'); ui.view='settings'; ui.settingsTab='you'; renderView()"); await p.waitForTimeout(200);
    check('Settings → You has "Your world": places, teams, interests', await p.isVisible('#setYourWorld') && await p.inputValue('#setYourWorld [data-wake="places"]')==='Riverside Park, Blue Bottle');
    await p.fill('#setYourWorld [data-wake="places"]', 'Central Park'); await p.dispatchEvent('#setYourWorld [data-wake="places"]', 'change'); await p.waitForTimeout(200);
    check('…edit it there, it saves', await E("wakeCfg().places")==='Central Park');
    check('Op knows them too', /places he likes: Central Park/.test(await E("aiContext()")));
    check('no page errors (clock out, places)', p.errors.length===0, p.errors);
    await p.context().close();
  }

  // ---- free data: CSVs that land in Downloads ----
  {
    const recent = Math.floor(new Date(2026,9,14,9).getTime()/1000), old = recent - 20*86400;
    const files = {'Chase1234_Activity_20261014.CSV':{m:recent, t:BANK}, 'Oct-01-2026_Oct-14-2026_insights.csv':{m:recent - 60, t:INSIGHTS}, 'clients.csv':{m:recent - 120, t:OTHER}, 'old_statement.csv':{m:old, t:BANK.replace(/CHIPOTLE/g, 'OLDPLACE')}};
    const p = await ctxPage(b, {profile:{name:'Andre'}}, {clock:new Date(2026,9,14,10,0,5).getTime(), files});
    const E = c => p.evaluate(x => window.__op.ev(x), c);
    await E("inboxScan()"); await p.waitForTimeout(800);
    const ex = JSON.parse(await E("JSON.stringify(finExpenses())"));
    check('a bank statement in Downloads → Expenses (purchases only, no card payment)', ex.length===3 && ex.some(x => /CHIPOTLE/.test(x.name) && x.amount===14.2 && x.cat==='food') && !ex.some(x => /Payment/.test(x.name)), ex);
    check('…not the old one from weeks ago (the first look goes back 3 days)', !ex.some(x => /OLDPLACE/.test(x.name)));
    check('Instagram insights in Downloads → Social', await E("(igCfg().csvData && igCfg().csvData['csv-business'] || {posts:[]}).posts.length")===2);
    check('anything else is left alone', !p.calls.some(c => c.includes(hex('clients.csv')) && /inbox\/get/.test(c)) || ex.length===3);
    const gets = p.calls.filter(c => /inbox\/get/.test(c)).length;
    await E("inboxScan()"); await p.waitForTimeout(600);
    check('…and nothing is read twice', p.calls.filter(c => /inbox\/get/.test(c)).length===gets && await E("finExpenses().length")===3);
    p.files['Chase1234_Activity_20261015.CSV'] = {m:recent + 3600, t:BANK + '10/14/2026,10/14/2026,WHOLE FOODS,Groceries,Sale,-62.30\n'};
    await E("inboxScan()"); await p.waitForTimeout(600);
    check('a newer statement that overlaps only adds what’s new', await E("finExpenses().length")===4);
    await p.click('.toast-action[data-action="inboxUndoBank"]').catch(() => {}); await p.waitForTimeout(300);
    check('…and Undo takes it back out', await E("finExpenses().length")===3);
    // the parser on different banks
    check('a card export (purchases positive, payments negative)', await E("bankRowsToExpenses(csvParse('Date,Description,Amount\\n10/01/2026,UBER TRIP,23.10\\n10/02/2026,AUTOPAY PAYMENT,-500\\n10/03/2026,SPOTIFY,11.99\\n'), 'amex.csv').map(x => x.name+':'+x.amount).join('|')")==='UBER TRIP:23.1|SPOTIFY:11.99');
    check('debit / credit columns', await E("bankRowsToExpenses(csvParse('Date,Description,Debit,Credit\\n2026-10-01,TRADER JOES,45.12,\\n2026-10-02,PAYROLL,,2400\\n'), 'x.csv').map(x => x.name+':'+x.amount+':'+x.cat).join('|')")==='TRADER JOES:45.12:groceries');
    check('a CSV that isn’t a statement is turned down', await E("csvKind(csvParse('Name,Email\\nKiko,k@x.com\\n'))")===null && await E("csvKind(csvParse('Date,Description,Amount\\n10/01/2026,X,-1\\n'))")==='bank' && await E("csvKind(csvParse("+JSON.stringify(INSIGHTS)+"))")==='social');
    await E("ui.view='personal'; ui.personalTab='finances'; renderView()"); await p.waitForTimeout(300);
    check('Expenses: Import statement, and the free way explained', await p.isVisible('[data-action="bankCsvPick"]') && /Free:/.test(await p.textContent('.ex-connect')));
    await E("ui.view='convos'; igCfg().accounts = []; renderView()"); await p.waitForTimeout(200);
    check('Social: the free CSV comes first', /Import a CSV/.test(await p.textContent('.soc-opts .soc-opt:first-child')) && /Downloads/.test(await p.textContent('.soc-opts .soc-opt:first-child')));
    check('no page errors (free data)', p.errors.length===0, p.errors);
    await p.context().close();
  }

  await b.close();
  process.exit(report()?1:0);
})();
