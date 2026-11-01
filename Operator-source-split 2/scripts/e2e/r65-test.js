// Round 65: Andre's updates (ROUND-65-LIST.md).
const { instrument, launch, newPage, check, report, OUT } = require('./common.js');
(async () => {
  instrument(process.argv[2], OUT+'/r65.html');
  const b = await launch();
  const at = new Date(2026, 9, 28, 10).getTime();
  const p = await newPage(b, OUT+'/r65.html', {profile:{name:'Andre Lopez'}}, at);
  await p.setViewportSize({width:1440, height:900});
  const E = c => p.evaluate(x => window.__op.ev(x), c);
  await E("document.querySelectorAll('.overlay').forEach(o => o.classList.add('hidden')); demoSeed(); AI.hasKey = false; xpSystemShow = function(){}; aiKeyCheck = function(){}; opReadKick = function(){}; opVoiceOn = function(){ return false; }; renderView()"); await p.waitForTimeout(300);
  try{
  // ---- A. Playbooks are SOPs ----
  check('three kinds of step: Task, Call / event, Document', await E("JSON.stringify(PB57_TYPES)===JSON.stringify(['task','call','doc']) && !PB_TYPES.report && !PB_TYPES.send && !PB_TYPES.access && /Call/.test(PB_TYPES.call.label)"));
  await E("(function(){ const P = pbNew('client', 'SOP test', 30, {for:'client'}); const st = pb57Stage('Onboarding', {days:14}); st.steps = [pb57Step('Set up their folder', 'task', {rule:'enter'}), pb57Step('Kickoff call', 'call', {rule:'day', n:2}), pb57Step('Onboarding form', 'doc', {rule:'enter'}, {links:['https://example.com/form']}), pb57Step('Weekly report', 'report', {rule:'day', n:3}), pb57Step('Send the link', 'send', {rule:'enter'}), pb57Step('Get access', 'access', {rule:'enter'})]; P.stages = [st]; pbAll().push(P); pbSave(); const c = crmFind('client', state.business.clients[0].id); pbStart('client', c, P.id, todayStr(), true); pbSync(); renderView(); })()"); await p.waitForTimeout(300);
  check('old Report, Access and Send steps are deleted', await E("(function(){ const P = pbAll().find(p => p.name==='SOP test'); return P.stages[0].steps.map(s => s.type).join(',')==='task,call,doc'; })()"));
  const pbTasks = await E("JSON.stringify(state.tasks.items.filter(t => t.master && t.master.kind==='pb' && t.master.pb===pbAll().find(p => p.name==='SOP test').id && t.status!=='done').map(t => t.title))");
  check('only the Task step makes a task (nothing for the call or the document)', pbTasks==='["Set up their folder"]', pbTasks);
  check('the call is on the Calendar on its due day, with the client’s name', await E("(function(){ const c = state.business.clients[0], e = state.calendar.events.find(e => e.r65pb && e.linkedClient===c.id); return !!e && e.date===addDays(todayStr(), 1) && e.title.indexOf(pbName('client', c)) >= 0 && /Kickoff call/.test(e.title); })()"));
  await E("pbSync(); pbSync()");
  check('…once (syncing again doesn’t add it twice)', await E("state.calendar.events.filter(e => e.r65pb && /Kickoff call/.test(e.title)).length===1"));
  await E("ui.view='business'; ui.businessTab='lifecycle'; ui.pbView='board'; ui.r64Pb = pbAll().find(p => p.name==='SOP test').id; renderView()"); await p.waitForTimeout(300);
  check('the document is on their card in Playbooks, with its link', /Onboarding form/.test(await p.textContent('.r64-board')) && !!(await p.$('.r65-docs a[href="https://example.com/form"]')));
  await p.click('.r65-dk'); await p.waitForTimeout(300);
  check('…tick it: done, off the card', await E("(function(){ const c = state.business.clients[0], s = pbState('client', c); return !s.open.some(o => o.it.type==='doc'); })()") && !(await p.$('.r65-docs')));
  await E("(function(){ const c = state.business.clients[0], e = state.calendar.events.find(e => e.r65pb && e.linkedClient===c.id); e.date = addDays(todayStr(), -1); pbSync(); })()");
  check('the call counts as done once its day has passed', await E("(function(){ const c = state.business.clients[0], s = pbState('client', c); return !s.open.some(o => o.it.type==='call'); })()"));
  // ---- A3. No reports ----
  await E("ui.view='convos'; renderView()"); await p.waitForTimeout(200);
  check('no reports anywhere: no report buttons, no report tool for Op', await E("!document.querySelector('[data-action=\"r55Report\"], [data-action=\"r57CliExport\"]') && !OP_TOOLS.some(t => t.name==='client_report')"));
  // ---- B. Streaks ----
  await E("r63New(R63_PRESETS.find(p => p.id==='first'), {}) /* (round 66: by id) */; ui.view='personal'; ui.personalTab='streaks'; renderView()"); await p.waitForTimeout(300);
  check('Streaks, redone: the running streak (day ring, today’s rules), the standard, start cards', !!(await p.$('.r65-run .r65-ring')) && (await p.$$('.r65-run .r65-rule')).length===3 && !!(await p.$('.r65-std')) && (await p.$$('.r66-pc')).length >= 10 /* (round 66: by level) */);
  check('…no wall of tips (one small link)', !(await p.$('.r63-tips')) && !!(await p.$('.r65-how')));
  await p.click('.r65-acts [data-action="r63End"]'); await p.waitForTimeout(300);
  check('End asks properly (a title and words, not an empty box)', /End First streak/.test(await p.textContent('#uiDialogOverlay .ui-dlg-t')) && /day 1 of 21/.test(await p.textContent('#uiDialogOverlay .ui-dlg-p')));
  await p.click('#uiDialogOverlay [data-ui-dlg="yes"]'); await p.waitForTimeout(400);
  check('…and ending it works (it moves to past streaks)', await E("r63Active().length===0") && /Past streaks/.test(await p.textContent('.r65s')));
  await E("const c = r63New(R63_PRESETS.find(p => p.id==='medium'), {}); c.start = addDays(todayStr(), -4); persist('standards'); renderView()"); await p.waitForTimeout(250);
  await p.click('.r65-acts [data-action="r63Restart"]'); await p.waitForTimeout(250);
  check('Restart asks properly too', /Restart 75 Medium/.test(await p.textContent('#uiDialogOverlay .ui-dlg-t')));
  await p.click('#uiDialogOverlay [data-ui-dlg="yes"]'); await p.waitForTimeout(300);
  check('…and starts it again from day 1', await E("r63Active()[0].start===todayStr() && r63Status(r63Active()[0]).day===1"));
  // ---- C. Today ----
  await E("ui.view='today'; renderView()"); await p.waitForTimeout(300);
  check('the left side: the day streak and hours worked, nothing else', !!(await p.$('.sw-l .sw-streak')) && !!(await p.$('.sw-l .sw-tw')) && !(await p.$('.sw-l .r64-runs')) && !(await p.$('.sw-l .sw-ss')));
  check('a streak’s rules are just part of Today’s standard (same chips, no divider)', !(await p.$('.r64-sep')) && !(await p.$('.r64-chip')) && await E("[...document.querySelectorAll('.r60-std-c .chip')].map(c => c.textContent).join('|').indexOf('10 minutes of quiet') >= 0"));
  await p.click('.r60-std-c .chip[data-action="r63Tick"] >> nth=0'); await p.waitForTimeout(200);
  check('…tick one there', await E("(r63Active()[0].log[todayStr()] || []).length===1") && !!(await p.$('.r60-std-c .chip.active[data-action="r63Tick"]')));
  // ---- D. Op's tab moves; no "?" ----
  await E("state.profile.r65OpPos = null; opBubShow()"); await p.waitForTimeout(400);
  const r0 = await E("(function(){ const r = document.getElementById('opBub').getBoundingClientRect(); return [r.left, r.top, r.width]; })()");
  check('Op’s tab starts in a better place (bottom center, clear of the clock pill)', Math.abs((r0[0] + r0[2]/2) - (220 + (1440 - 220)/2)) < 30 && r0[1] > 780, r0);
  await p.mouse.move(r0[0] + 30, r0[1] + 20); await p.mouse.down(); await p.mouse.move(r0[0] + 200, r0[1] - 400, {steps:6}); await p.mouse.up(); await p.waitForTimeout(200);
  const r1 = await E("(function(){ const r = document.getElementById('opBub').getBoundingClientRect(); return [r.left, r.top]; })()");
  check('…drag it anywhere', Math.abs(r1[0] - (r0[0] + 170)) < 30 && Math.abs(r1[1] - (r0[1] - 400)) < 30, [r0, r1]);
  await E("document.getElementById('opBub').classList.remove('is-in'); opBubShow()"); await p.waitForTimeout(300);
  check('…and it stays where you put it', await E("(function(){ const r = document.getElementById('opBub').getBoundingClientRect(); return Math.abs(r.top - "+r1[1]+") < 4; })()") && await E("!!state.profile.r65OpPos"));
  check('the activity pill shows no “?”', await E("(function(){ const s = document.createElement('span'); s.className = 'ap-warn'; s.textContent = '?'; (document.getElementById('activityPill') || document.body).appendChild(s); const hidden = getComputedStyle(s).display==='none'; s.remove(); return hidden; })()"));
  }catch(err){ check('the run reached the end', false, String(err && err.message || err).slice(0, 300)); }
  check('no errors', p.errors.length===0, p.errors);
  await b.close(); process.exit(report() ? 1 : 0);
})();
