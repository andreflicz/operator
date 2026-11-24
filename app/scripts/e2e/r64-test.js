// Round 64: Andre's updates (ROUND-64-LIST.md).
const { instrument, launch, newPage, check, report, OUT } = require('./common.js');
(async () => {
  instrument(process.argv[2], OUT+'/r64.html');
  const b = await launch();
  const at = new Date(2026, 9, 28, 10).getTime();
  const p = await newPage(b, OUT+'/r64.html', {profile:{name:'Andre Lopez'}}, at);
  await p.setViewportSize({width:1440, height:900});
  const E = c => p.evaluate(x => window.__op.ev(x), c);
  await E("document.querySelectorAll('.overlay').forEach(o => o.classList.add('hidden')); demoSeed(); AI.hasKey = false; xpSystemShow = function(){}; uiConfirm = function(){ return Promise.resolve(true); }; aiKeyCheck = function(){}; opReadKick = function(){}; opVoiceOn = function(){ return false; }; renderView()"); await p.waitForTimeout(300);
  try{
  // ---- A1. Op: a small tab ----
  await E("opBubShow()"); await p.waitForTimeout(300);
  check('Op is a small tab: his state and three buttons, no chat box, no typing', await E("(function(){ const b = document.getElementById('opBub'), r = b.getBoundingClientRect(); const vis = s => { const e = b.querySelector(s); return !!e && e.getClientRects().length > 0; }; return r.height < 60 && r.width < 340 && vis('.r64-st') && !vis('.op-bub-log') && !vis('.op-bub-in') && !vis('#opBubInput') && b.querySelectorAll('.r58-round').length===3; })()"), await E("(function(){ const r = document.getElementById('opBub').getBoundingClientRect(); return [r.width, r.height]; })()"));
  await E("AI.listening = true"); await p.waitForTimeout(350);
  check('…it says “Listening…”', /Listening/.test(await p.textContent('#opBub .r64-st')) && await E("document.getElementById('opBub').classList.contains('r64-listen')"));
  await E("AI.listening = false; AI.busy = true; R62.tool = ''"); await p.waitForTimeout(350);
  check('…“Thinking…” while he works, with a spinner', /Thinking/.test(await p.textContent('#opBub .r64-st')) && await E("document.getElementById('opBub').classList.contains('r64-work')"));
  await E("R62.tool = R62_TOOL_LABEL.add_task; R62.toolAt = Date.now()"); await p.waitForTimeout(350);
  check('…and what he’s doing (“Adding a task…”)', /Adding a task/.test(await p.textContent('#opBub .r64-st')));
  await E("ACTIONS.opBubClose(); AI.busy = true"); await p.waitForTimeout(350);
  check('Tab closed while he works: a small sign that he’s still at it', await E("!!document.querySelector('#r64Dot.is-on')"));
  await E("ACTIONS.r64DotOpen()"); await p.waitForTimeout(300);
  check('…tap it to bring the tab back', await E("document.getElementById('opBub').classList.contains('is-in')"));
  await E("AI.busy = false"); await p.waitForTimeout(350);
  check('…done: the sign goes, the tab says Ready', !(await E("!!document.querySelector('#r64Dot.is-on')")) && /Ready|Replied/.test(await p.textContent('#opBub .r64-st')));
  // ---- A2. Cut off: one message ----
  await E("state.focus.opChat = []; opChatLog('me', 'Tell me about my week'); opChatLog('op', 'You had a strong Monday and Tuesday.'); opChatLog('op', 'You had a strong Monday and Tuesday. Wednesday is open, so plan the Atlas proposal there.')");
  check('Cut him off: the half-said line and the whole reply are one message', await E("opChat().filter(e => e.r==='op').length===1 && /Atlas proposal/.test(opChat()[opChat().length - 1].t)"));
  await E("opChatLog('op', 'Wednesday is open, so plan the Atlas proposal there.')");
  check('…and the rest of it (the caption) doesn’t come in again', await E("opChat().filter(e => e.r==='op').length===1"));
  await E("opChatLog('me', 'Thanks'); opChatLog('op', 'Anytime.')");
  check('…a new reply after your next message is its own', await E("opChat().filter(e => e.r==='op').length===2"));
  // ---- A3. Not filed yet ----
  await E("const t = Date.now() - 3600000; opChat().push({r:'me', t:'Can you make the calendar page show the week starting on Monday please', at:t}); opChat().push({r:'me', t:'what time is it in Tokyo right now', at:t + 1}); persist('focus'); aiWrite = async function(){ return 'Calendar: start the week on Monday.'; }; AI.hasKey = true");
  check('App updates lists what you asked of the app that isn’t filed (not small talk)', await E("(function(){ const L = r64Unfiled().map(e => e.t); return L.some(t => /calendar page/.test(t)) && !L.some(t => /Tokyo/.test(t)); })()"));
  await E("ACTIONS.r58OpenUpdates()"); await p.waitForTimeout(300);
  check('…at the top of App updates, with File / Skip / File all', !!(await p.$('.r64-unf')) && !!(await p.$('.r64-unf [data-action="r64FileAll"]')));
  await p.click('.r64-unf [data-action="r64File"] >> nth=0'); await p.waitForTimeout(500);
  check('…File: it’s saved (summary + your words) and leaves the list', await E("r58UpdateEntries().some(e => /Monday/.test(e.text) && /calendar page/.test(e.said || e.text)) && !r64Unfiled().some(e => /calendar page/.test(e.t))"));
  await E("AI.hasKey = false");
  // ---- B5. Clients: the bottom ----
  await E("ui.view='today'; const O = state.dashboardPanels.order; ['journal', 'clientHub'].forEach(k => O.splice(O.indexOf(k), 1)); O.splice(O.indexOf('personalStats') + 1, 0, 'journal', 'clientHub'); r60Spans().journal = 6; r60Spans().clientHub = 6; renderView()"); await p.waitForTimeout(300);
  check('Clients: the leads sit in an even row of cards under a line', await E("(function(){ const h = document.querySelector('.r60w[data-wid=\"clientHub\"] .hub-leads'); if(!h) return false; const s = getComputedStyle(h); const L = [...h.querySelectorAll('.hub-lead')].map(x => x.getBoundingClientRect()); return s.display==='grid' && parseFloat(s.borderTopWidth) >= 1 && L.length >= 2 && L.every(r => Math.abs(r.height - L[0].height) < 2); })()"));
  // ---- B6. The streak console ----
  await E("r63New(R63_PRESETS.find(p => p.id==='hard'), {}) /* (round 66: by id) */; renderView()"); await p.waitForTimeout(250);
  // (round 65: Andre wants just the day streak and hours on the left, and the rules simply part of the standard)
  check('Streak panel: the running streak’s day sits beside the fire streak', !(await p.$('.sw-l .r64-runs')) && !!(await p.$('.sw-l .sw-tw')));
  check('…its rules on the same line as Today’s standard (no extra row)', !(await p.$('.r63-today')) && (await p.$$('.r60-std-c .chip[data-action="r63Tick"]')).length===6 && !(await p.$('.r60-std-c .r64-sep')));
  await p.click('.r60-std-c .chip[data-action="r63Tick"] >> nth=0'); await p.waitForTimeout(200);
  check('…tick them there', await E("(r63Active()[0].log[todayStr()] || []).length===1"));
  // ---- C8 / C9. Health ----
  await E("state.profile.heightIn = 70; ui.view='personal'; ui.personalTab='fitness'; ui.healthSub='overview'; renderView()"); await p.waitForTimeout(300);
  check('BMI: one clean scale that fills its panel (healthy / overweight / obese, where you are)', await E("(function(){ const s = document.querySelector('.r64-bmi'), box = document.querySelector('.hsc-box'); if(!s || !box) return false; const a = s.getBoundingClientRect(), c = box.getBoundingClientRect(); return a.width > c.width - 60 && /Healthy/.test(s.textContent) && /Overweight/.test(s.textContent) && /Obese/.test(s.textContent) && !!s.querySelector('.r64-bmi-bar b'); })()"));
  check('Fuel: the quick picks fill the panel in two even columns at the bottom', await E("(function(){ const f = document.querySelector('.r59-fu'), q = document.querySelector('.r59-picks'); if(!f || !q) return false; const s = getComputedStyle(q); return s.display==='grid' && s.gridTemplateColumns.split(' ').length===2 && f.getBoundingClientRect().bottom - q.getBoundingClientRect().bottom < 30; })()"));
  // ---- C10. Goals: no flying in ----
  await E("ui.view='today'; renderView()"); await p.waitForTimeout(150);
  await E("ui.view='personal'; ui.personalTab='goals'; renderView()"); await p.waitForTimeout(40);
  check('Goals: switching pages, nothing glides in from where it sat on Today', await E("[...document.querySelectorAll('#viewRoot [data-flip]')].every(el => !el.style.transform)"));
  // ---- D. Analytics ----
  await E("ui.view='focus'; ui.focusTab='analytics'; ui.analyticsRange='today'; renderView()"); await p.waitForTimeout(250);
  check('Analytics: one 🔍 button for the time frame', !!(await p.$('.r64-rb')) && !(await p.$('.tabs-tools .seg-tabs [data-action="analyticsRange"]')));
  await p.click('.r64-rb'); await p.waitForTimeout(200);
  check('…Today, This week, Last week, This month, Last month, All time, and your own dates', /Today[\s\S]*This week[\s\S]*Last week[\s\S]*This month[\s\S]*Last month[\s\S]*All time/.test(await p.textContent('.r64-pop')) && !!(await p.$('.r64-pop #r64From')));
  await p.click('.r64-pop [data-id="month"]'); await p.waitForTimeout(250);
  check('…This month shows the month', await E("ui.analyticsRange==='month'") && /This month/.test(await p.textContent('.r64-rb')) && /This month/.test(await p.textContent('.r57-an')));
  check('…and the recap button follows the range (Month recap)', /Month recap/.test(await p.textContent('.r64-rc')));
  await p.click('.r64-rc'); await p.waitForTimeout(300);
  check('…which opens the month’s recap (totals, best day, every day)', await E("(function(){ const s = document.getElementById('r64RecapContent'); return !!s && /Month recap/.test(s.textContent) && s.querySelectorAll('.r64-rr').length >= 28; })()"));
  await E("addSheetClose('r64Recap'); ACTIONS.analyticsRange(null, null, 'week')"); await p.waitForTimeout(200);
  check('…This week → Week recap', /Week recap/.test(await p.textContent('.r64-rc')));
  await E("ui.r64Rng = true; renderView()"); await p.waitForTimeout(150);
  await p.fill('#r64From', '2026-10-10'); await p.fill('#r64To', '2026-10-20'); await p.click('.r64-pop [data-action="r64Custom"]'); await p.waitForTimeout(250);
  check('…your own dates', await E("ui.analyticsRange==='custom' && rangeDays('custom').length===11") && /Oct 10/.test(await p.textContent('.r64-rb')));
  await E("ACTIONS.analyticsRange(null, null, 'today')"); await p.waitForTimeout(150);
  check('…Today keeps the Day recap', /Day recap/.test(await p.textContent('.r64-rc')));
  // ---- E. Playbooks ----
  await E("ui.view='business'; ui.businessTab='lifecycle'; ui.pbView='board'; renderView()"); await p.waitForTimeout(300);
  check('Playbooks overview: pick a playbook, its stages as columns like the Lead center', (await p.$$('.r64-pbp')).length >= 1 && (await p.$$('.r64-board .r64-col')).length >= 3);
  const before = await E("(function(){ const c = document.querySelector('.r64-col .pb6-card'); return c ? c.getAttribute('data-pb6-drag') : ''; })()");
  const target = await E("(function(){ const cols = [...document.querySelectorAll('.r64-col')]; const c = cols.find(x => !x.querySelector('.pb6-card')); return c ? c.getAttribute('data-pb6-col') : ''; })()");
  if(before && target){
    await p.dragAndDrop('.r64-col .pb6-card >> nth=0', '.r64-col[data-pb6-col="'+target+'"]'); await p.waitForTimeout(500);
    check('…drag a card to another stage: they move there', await E("(function(){ const q = '"+before+"'.split(':'), x = crmFind(q[0], q[1]); return !!x && x.pb && x.pb.stage==='"+target.split('|')[1]+"'; })()"));
  } else check('…drag a card to another stage: they move there', false, [before, target]);
  }catch(err){ check('the run reached the end', false, String(err && err.message || err).slice(0, 300)); }
  check('no errors', p.errors.length===0, p.errors);
  await b.close(); process.exit(report() ? 1 : 0);
})();
