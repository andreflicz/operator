// Round 62: Andre's updates (ROUND-62-LIST.md).
const { instrument, launch, newPage, check, report, OUT } = require('./common.js');
(async () => {
  instrument(process.argv[2], OUT+'/r62.html');
  const b = await launch();
  const at = new Date(2026, 9, 28, 10).getTime();
  const p = await newPage(b, OUT+'/r62.html', {profile:{name:'Andre Lopez', businessName:'Comet Collective'}}, at);
  await p.setViewportSize({width:1440, height:900});
  const E = c => p.evaluate(x => window.__op.ev(x), c);
  await E("document.querySelectorAll('.overlay').forEach(o => o.classList.add('hidden')); demoSeed(); AI.hasKey = false; xpSystemShow = function(){}; uiConfirm = function(){ return Promise.resolve(true); }; aiKeyCheck = function(){}; opReadKick = function(){}; opVoiceOn = function(){ return false; }; renderView()"); await p.waitForTimeout(300);
  try{
  // ---- A1. One message, one reply ----
  await E("window.__calls = 0; AI.hasKey = true; aiPickModel = async function(){ return 'm'; }; aiCall = async function(){ window.__calls++; await new Promise(r => setTimeout(r, 150)); return {ok:true, j:{stop_reason:'end_turn', content:[{type:'text', text:'Sure thing, it is on your list for today now.'}]}}; }; R54.last = null; aiAsk('what should I work on first this morning'); aiAsk('what should I work on first this morning')"); await p.waitForTimeout(700);
  check('the same message sent twice in a row reaches Op once (one call, one reply)', await E("window.__calls===1 && opChat().filter(e => e.r==='op' && /on your list for today/.test(e.t)).length===1"));
  await E("R62.last = null; aiAsk('sure thing it is on your list for today now')"); await p.waitForTimeout(400);
  check('Op’s own reply heard back by the mic isn’t sent as a new message', await E("window.__calls===1"));
  await E("R62.last = null; AI.typedAt = 0; aiAsk('first message here please'); aiAsk('and a second one straight after')"); await p.waitForTimeout(1200);
  check('a message sent while he’s still answering waits, then goes (nothing dropped, nothing doubled)', await E("window.__calls===3 && opChat().filter(e => e.r==='me' && e.t==='and a second one straight after').length===1"));
  // ---- A2. "Filed" is always true ----
  await E("window.__calls = 0; aiWrite = async function(){ return 'Op window: show a working indicator.'; }; let k = 0; aiCall = async function(){ k++; if(k===1) return {ok:true, j:{stop_reason:'tool_use', content:[{type:'tool_use', id:'t1', name:'add_task', input:{title:'Look at Op indicator'}}]}}; return {ok:true, j:{stop_reason:'end_turn', content:[{type:'text', text:'Added a task, and I filed it in app updates.'}]}}; }; R62.last = null; window.__n0 = r58UpdateEntries().length; aiAsk('Op should show when he is working on something')"); await p.waitForTimeout(1200);
  check('he ran another tool and said he filed it without filing: the app files it', await E("r58UpdateEntries().length===window.__n0 + 1 && r58UpdateEntries().some(e => e.said==='Op should show when he is working on something' || e.text==='Op should show when he is working on something')"));
  await E("aiCall = async function(){ return {ok:true, j:{stop_reason:'end_turn', content:[{type:'text', text:'I haven’t filed that in app updates yet. Want me to?'}]}}; }; R62.last = null; window.__n1 = r58UpdateEntries().length; aiAsk('maybe the calendar could be blue one day')"); await p.waitForTimeout(900);
  check('…but “I haven’t filed it yet” files nothing', await E("r58UpdateEntries().length===window.__n1"));
  // ---- A3. ✕ mid-reply: clean ----
  // (the stuck turn, as it happened: his voice cut off, the turn waiting on it forever)
  await E("window.__res = ''; AI.busy = true; OV.pending = true; R59_PENDING.push({res:function(){ window.__res = 'done'; AI.busy = false; }}); R62.quiet = false; opBubShow()"); await p.waitForTimeout(200);
  await p.click('#opBub .op-bub-x'); await p.waitForTimeout(150);
  check('✕ while he’s talking: the window closes and the waiting turn lets go at once (no 5-second freeze)', await E("!document.getElementById('opBub').classList.contains('is-in') && window.__res==='done' && AI.busy===false"));
  await E("AI.busy = true; R62.quiet = true; R62.closedAt = Date.now(); OV.cap = 'opBubText'; opCaption('a late line from that turn')"); await p.waitForTimeout(150);
  check('…and nothing from that turn pops the window back open', await E("!document.getElementById('opBub').classList.contains('is-in')"));
  await E("AI.busy = false"); await p.waitForTimeout(2200);
  check('…quiet ends once the turn is over', await E("R62.quiet===false"));
  await E("opVoiceOn = function(){ return false; }; aiCall = async function(){ return {ok:true, j:{stop_reason:'end_turn', content:[{type:'text', text:'Ready when you are.'}]}}; }; R62.last = null; AI.typedAt = Date.now(); aiAsk('are you there')"); await p.waitForTimeout(600);
  check('…a new message goes straight through', await E("opChat().some(e => e.r==='op' && e.t==='Ready when you are.')"));
  // ---- A4. Working indicator ----
  await E("opBubShow(); AI.busy = true; OV.speaking = false; OV.pending = false; R62.tool = ''"); await p.waitForTimeout(400);
  check('while he works, the window says so (“Thinking…”)', /Thinking/.test(await E("document.querySelector('#opBub .r62-work.is-on') ? document.querySelector('#opBub .r62-work').textContent : ''")));
  await E("opRunTool('remember', {fact:'likes short replies'})"); await p.waitForTimeout(300);
  check('…and what he’s doing (“Remembering that…”)', /Remembering that/.test(await E("document.querySelector('#opBub .r62-work').textContent")));
  await E("AI.busy = false"); await p.waitForTimeout(400);
  check('…gone when he’s done', await E("!document.querySelector('#opBub .r62-work.is-on')"));
  // ---- A5. Op's window ----
  // (round 64: Andre asked for a small tab instead of the chat window: his state and three buttons; the conversation is
  // read in full screen. So the window no longer grows with the chat or has a grip.)
  await E("ACTIONS.opBubClose(); R62.quiet = false; state.focus.opChat = []; opChatLog('me', 'Hi'); opChatLog('op', 'Hey.'); OPCD.sig = ''"); await p.waitForTimeout(200);
  await E("opBubShow(); opChatDraw()"); await p.waitForTimeout(400);
  const h1 = await E("document.getElementById('opBub').getBoundingClientRect().height");
  check('the window opens compact', h1 < 60, h1);
  await E("for(let i = 0; i < 6; i++){ opChatLog('me', 'Line number '+i+' with a few more words in it so it wraps a little bit'); opChatLog('op', 'Answer number '+i+', also a little longer than one line so it takes up space.'); } opChatDraw()"); await p.waitForTimeout(400);
  check('…and stays small however long the conversation gets', await E("document.getElementById('opBub').getBoundingClientRect().height") < 60);
  // ---- B. Today ----
  await E("ui.view='today'; ui.todayEdit = false; renderView()"); await p.waitForTimeout(300);
  check('Customize sits in the top panel (no row of its own)', await E("!!document.querySelector('.today-hero .r62-cb') && !document.querySelector('.r61-cust')"));
  await p.click('.today-hero .r62-cb'); await p.waitForTimeout(250);
  check('…tap it to arrange (it turns into Done)', await E("ui.todayEdit===true && /Done/.test(document.querySelector('.today-hero .r62-cb').textContent)"));
  await p.click('.today-hero .r62-cb'); await p.waitForTimeout(250);
  const biz = async (n) => { await E("r60Spans().business = "+n+"; renderView()"); await p.waitForTimeout(250); return E("(function(){ const c = document.querySelector('.r60w[data-wid=\"business\"] .biz-card'); const s = getComputedStyle(c); const r = c.getBoundingClientRect(); const kids = [...c.children].filter(k => getComputedStyle(k).display!=='none'); return {grid:s.display==='grid', cols:s.gridTemplateColumns.split(' ').length, h:r.height, fit:kids.every(k => k.getBoundingClientRect().right <= r.right + 1)}; })()"); };
  const L = await biz(12), M = await biz(6), S = await biz(4);
  check('Business widget, Large: one row (amount, months, numbers)', L.grid && L.cols===3 && L.h < 240 && L.fit, L);
  check('…Medium: two columns, numbers underneath', M.grid && M.cols===2 && M.fit, M);
  check('…Small: one column, nothing spilling out', S.grid && S.cols===1 && S.fit, S);
  await E("const O = state.dashboardPanels.order; ['journal', 'clientHub'].forEach(k => O.splice(O.indexOf(k), 1)); O.splice(O.indexOf('personalStats') + 1, 0, 'journal', 'clientHub'); r60Spans().journal = 6; r60Spans().clientHub = 6; r60Spans().vision = 6; r60Spans().business = 6; renderView()"); await p.waitForTimeout(300);
  check('Clients next to Journal: the same size', await E("(function(){ const a = document.querySelector('.r60w[data-wid=\"journal\"]').getBoundingClientRect(), b = document.querySelector('.r60w[data-wid=\"clientHub\"]').getBoundingClientRect(); return Math.abs(a.top - b.top) < 2 && Math.abs(a.height - b.height) < 2 && Math.abs(a.width - b.width) < 2; })()"), await E("(function(){ const a = document.querySelector('.r60w[data-wid=\"journal\"]').getBoundingClientRect(), b = document.querySelector('.r60w[data-wid=\"clientHub\"]').getBoundingClientRect(); return [a.top, b.top, a.height, b.height, a.width, b.width]; })()"));
  check('…and the client cards fit inside it', await E("(function(){ const w = document.querySelector('.r60w[data-wid=\"clientHub\"]').getBoundingClientRect(); return [...document.querySelectorAll('.r60w[data-wid=\"clientHub\"] .hub-grid > *')].every(c => c.getBoundingClientRect().right <= w.right + 1); })()"));
  // ---- C. Personal ----
  await E("ui.view='personal'; ui.personalTab='goals'; renderView()"); await p.waitForTimeout(300);
  check('Goals: no “Goals” label (the tab says it)', !(await E("!!document.querySelector('.r61-gt')")) && !/^\s*Goals/.test(await p.textContent('#viewRoot .tab-panel')));
  check('…settings at the top right, on the tab line', await E("(function(){ const g = document.querySelector('.tabs .r43-gear').getBoundingClientRect(), t = document.querySelector('.tabs').getBoundingClientRect(); return g.top >= t.top - 2 && g.bottom <= t.bottom + 2 && g.right > t.right - 40; })()"));
  check('…the goals start right under the tabs, and Monthly revenue right under them', await E("(function(){ const t = document.querySelector('.tabs').getBoundingClientRect(), m = document.querySelector('.r60-mine').getBoundingClientRect(), n = document.querySelector('.r60-mine').nextElementSibling.getBoundingClientRect(); return m.top - t.bottom < 40 && n.top - m.bottom < 32; })()"));
  await E("ui.personalTab='journal'; ui.journalMode='entries'; ui.journalViewMode='personal'; renderView()"); await p.waitForTimeout(300);
  check('Journal: Entries / Boards / Vault on the You / Goals / Health line, at the far right', await E("(function(){ const j = document.querySelector('.tabs .r62-jtabs'); if(!j) return false; const r = j.getBoundingClientRect(), t = document.querySelector('.tabs').getBoundingClientRect(), y = document.querySelector('.tabs .tab').getBoundingClientRect(); return Math.abs((r.top + r.bottom)/2 - (y.top + y.bottom)/2) < 8 && r.right > t.right - 4; })()"));
  await p.click('.r62-jtabs [data-id="boards"]'); await p.waitForTimeout(250);
  check('…and they still switch', await E("ui.journalMode==='boards' && !!document.querySelector('.r62-jtabs .seg-tab.active[data-id=\"boards\"]')"));
  // ---- D. Social ----
  await E("ui.view='convos'; ui.socTab='overview'; ui.igTried = 1; renderView()"); await p.waitForTimeout(300);
  const sg = await E("document.querySelector('.sx-tabs').getBoundingClientRect().top - document.querySelector('#viewRoot .view-title').getBoundingClientRect().bottom");
  await E("ui.view='personal'; renderView()"); await p.waitForTimeout(200);
  const pg = await E("document.querySelector('.tabs').getBoundingClientRect().top - document.querySelector('#viewRoot .view-title').getBoundingClientRect().bottom");
  check('Social: the tabs sit under the title like the other pages (no big gap)', sg < 70 && Math.abs(sg - pg) < 25, [sg, pg]);
  // ---- A6. The talk key check (Mac app) ----
  // (as the Mac app: the page loads with the app's bridge)
  await p.context().addInitScript(() => { window.operatorApp = {isApp:true, talkCheck: async function(){ return {hooked:true, last:0, trusted:true, need:'', opened:'Input Monitoring'}; }, talkHealth: async function(){ return window.__health || {hooked:false, last:0, need:'', ok:null}; }, relaunch: function(){ window.__relaunched = 1; }, talkPrefs: function(){}, openPrivacy: function(){}, status: function(){}, loginItem: async function(){ return false; } }; });
  await p.reload(); await p.waitForTimeout(800);
  await E("document.querySelectorAll('.overlay').forEach(o => o.classList.add('hidden')); xpSystemShow = function(){}; R57.keyHealth = {}; ui.view='settings'; ui.settingsTab='op'; renderView()"); await p.waitForTimeout(400);
  const cb = await p.$('[data-action="r57OpenPrivacy"]');
  check('Settings → Op has the Check button', !!cb);
  if(cb){ await cb.click(); await p.waitForTimeout(500); }
  check('Check does something: it opens the setting and shows what’s on, live', await E("!!document.querySelector('.r62-ck') && /Accessibility/.test(document.querySelector('.r62-ck').textContent) && R62.check && R62.check.pane==='Input Monitoring'"));
  await p.waitForTimeout(1800);
  await E("window.__health = {hooked:true, last:Date.now(), need:'', ok:true}"); await p.waitForTimeout(1800);
  check('…and says when a key from another app reaches Operator', /Operator hears them/.test(await E("(document.querySelector('.r62-ck') || {}).textContent || ''")));
  await E("R62.check.h.last = 0; renderView()"); await p.waitForTimeout(100);
  await E("R62.check = {at:Date.now(), h:{trusted:true, hooked:true, last:0}}; clearInterval(R62.checkT); renderView()"); await p.waitForTimeout(150);
  const rb = await p.$('[data-action="r62Relaunch"]');
  check('…with a Restart button (macOS needs one after turning it on)', !!rb);
  if(rb){ await rb.click(); await p.waitForTimeout(100); }
  check('…which restarts Operator', await E("window.__relaunched===1"));
  }catch(err){ check('the run reached the end', false, String(err && err.message || err).slice(0, 300)); }
  check('no errors', p.errors.length===0, p.errors);
  await b.close(); process.exit(report() ? 1 : 0);
})();
