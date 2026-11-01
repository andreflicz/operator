// Round 63: Streaks (ROUND-63-LIST.md).
const { instrument, launch, newPage, check, report, OUT } = require('./common.js');
(async () => {
  instrument(process.argv[2], OUT+'/r63.html');
  const b = await launch();
  const at = new Date(2026, 9, 28, 10).getTime();
  const p = await newPage(b, OUT+'/r63.html', {profile:{name:'Andre Lopez'}}, at);
  await p.setViewportSize({width:1440, height:900});
  const E = c => p.evaluate(x => window.__op.ev(x), c);
  await E("document.querySelectorAll('.overlay').forEach(o => o.classList.add('hidden')); demoSeed(); AI.hasKey = false; xpSystemShow = function(){}; uiConfirm = function(){ return Promise.resolve(true); }; aiKeyCheck = function(){}; opReadKick = function(){}; renderView()"); await p.waitForTimeout(300);
  try{
  // ---- A. The tab ----
  await E("ui.view='personal'; ui.personalTab='goals'; renderView()"); await p.waitForTimeout(200);
  check('Personal has a Streaks tab, next to Goals', await E("(function(){ const t = [...document.querySelectorAll('.tabs .tab')].map(x => x.textContent.trim()); return t.indexOf('Streaks')===t.indexOf('Goals') + 1; })()"));
  await p.click('.tabs .tab[data-tab="streaks"]'); await p.waitForTimeout(250);
  check('…it opens on Streaks', await E("ui.personalTab==='streaks' && !!document.querySelector('.tab-panel[data-key=\"personal-streaks\"] .r65s') /* (round 65) */ && document.querySelector('.tabs .tab.active').textContent.trim()==='Streaks'"));
  // Today's standard lives here
  check('Today’s standard is set here: deep work, days off, its items', !!(await p.$('#r63Std [data-r63-std="dw"]')) && !!(await p.$('#r63Std [data-r63-std="off"]')) && !!(await p.$('#r63Std #r63StdNew')));
  await p.fill('#r63StdNew', 'No phone in bed'); await p.press('#r63StdNew', 'Enter'); await p.waitForTimeout(200);
  check('…add to it', await E("state.standards.items.some(i => i.label==='No phone in bed')"));
  await p.selectOption('#r63Std [data-r63-std="dw"]', '240'); await p.waitForTimeout(200);
  check('…change the deep work target', await E("state.standards.deepWorkTargetMinutes===240"));
  await E("const id = state.standards.items.find(i => i.label==='No phone in bed').id; ACTIONS.r63StdDel(null, null, id)"); await p.waitForTimeout(150);
  check('…remove from it', await E("!state.standards.items.some(i => i.label==='No phone in bed')"));
  await E("ui.view='settings'; ui.settingsTab='standards'; renderView()"); await p.waitForTimeout(200);
  check('…and it’s no longer in Settings (Goals & Targets keeps work and content)', await E("(function(){ const t = document.getElementById('viewRoot').textContent; return !/Daily Standard|Deep work target|Streak Rules|Days off allowed/.test(t) && /Goals & Targets/.test(t) && !!document.getElementById('setAvgHoursTarget'); })()"));
  // ---- B. Starting one ----
  await E("ui.view='personal'; ui.personalTab='streaks'; renderView()"); await p.waitForTimeout(200);
  // (round 65: the Streaks tab redone: .r65-* pieces)
  check('Start a streak: First streak, 75 Soft, 75 Medium, 75 Hard, your own', /First streak[\s\S]*75 Soft[\s\S]*75 Medium[\s\S]*75 Hard[\s\S]*Make your own/.test(await p.textContent('.r66-lvls')));
  await p.click('.r66-pc[data-id="hard"]');  // (round 66: start cards grouped by level) await p.waitForTimeout(250);
  check('75 Hard comes with its rules, 75 days, back to day 1 on a miss', await E("ui.r63Draft.days===75 && ui.r63Draft.strict==='reset' && ui.r63Draft.rules.length===6 && /outside/.test(ui.r63Draft.rules.map(r => r.label).join(' '))"));
  await p.click('#r63Sheet [data-id="strict|twice"]'); await p.waitForTimeout(100);
  await p.fill('[data-r63-d="cue|0"]', 'At the gym, 6 AM'); await p.waitForTimeout(80);
  await p.click('#r63Sheet [data-id="add|1"]'); await p.waitForTimeout(120);
  await p.fill('[data-r63-d="rule|6"]', 'Stretch 5 minutes'); await p.waitForTimeout(80);
  // (round 66: starting is a commitment: Next, your why, then hold to lock in)
  await p.click('#r63Sheet .hs-go'); await p.waitForTimeout(200);
  await E("ui.r63Draft.why = 'Because I said I would.'; r66LockIn()"); await p.waitForTimeout(300);
  await E("document.querySelectorAll('.r66-locked').forEach(o => o.remove())");
  check('…edit it before starting (how strict, a moment for a rule, an extra rule), then start', await E("(function(){ const c = r63Active()[0]; return !!c && c.strict==='twice' && c.rules.length===7 && c.rules[0].cue==='At the gym, 6 AM' && c.start===todayStr(); })()"));
  check('Running: day 1 of 75, today’s rules to check off, the chain of days', /^\s*1\s*of 75/.test(await p.textContent('.r65-ring')) && (await p.$$('.r65-run .r65-rule')).length===7 && (await p.$$('.r65-chain i')).length===75);
  await p.click('.r65-run .r65-rule >> nth=0'); await p.waitForTimeout(150);
  check('…tap a rule to check it off', await E("(r63Active()[0].log[todayStr()] || []).length===1") && !!(await p.$('.r65-run .r65-rule.is-on')));
  // ---- the rules of missing a day ----
  await E("(function(){ const c = r63Active()[0]; c.start = addDays(todayStr(), -5); c.log = {}; [0, 1, 3, 4].forEach(i => c.log[addDays(c.start, i)] = c.rules.map(r => r.id)); persist('standards'); })()");
  check('Never miss twice: one missed day is a slip, the run goes on', await E("(function(){ const s = r63Status(r63Active()[0]); return s.day===6 && s.restarts===0 && s.slips.length===1; })()"));
  await E("(function(){ const c = r63Active()[0]; delete c.log[addDays(c.start, 3)]; persist('standards'); })()");
  check('…two in a row: back to day 1', await E("(function(){ const s = r63Status(r63Active()[0]); return s.restarts===1 && s.day===2; })()"));
  await E("(function(){ const c = r63Active()[0]; c.strict = 'reset'; c.log = {}; c.start = addDays(todayStr(), -3); [0, 2].forEach(i => c.log[addDays(c.start, i)] = c.rules.map(r => r.id)); })()");
  check('75 Hard rules: any miss is back to day 1', await E("(function(){ const s = r63Status(r63Active()[0]); return s.restarts===1 && s.day===2; })()"));
  await E("(function(){ const c = r63Active()[0]; c.strict = 'twice'; c.log = {}; c.start = addDays(todayStr(), -1); c.log[c.start] = c.rules.map(r => r.id); persist('standards'); ui.view='personal'; ui.personalTab='streaks'; renderView(); })()"); await p.waitForTimeout(150);
  // ---- On Today ----
  await E("ui.view='today'; renderView()"); await p.waitForTimeout(250);
  // (round 64: one console: the streak's day beside the fire streak, its rules on Today's standard's line)
  check('On Today: the running streak under Today’s standard, with today’s rules', /Workout 1/.test(await p.textContent('.r60-std-c')) && (await p.$$('.r60-std-c .chip[data-action="r63Tick"]')).length===7);  // (round 65: just part of the standard)
  await p.click('.r60-std-c .chip[data-action="r63Tick"] >> nth=1'); await p.waitForTimeout(150);
  check('…tick them right there', await E("(r63Active()[0].log[todayStr()] || []).length >= 1") && !!(await p.$('.r60-std-c .chip.active[data-action="r63Tick"]')));
  await p.click('.r63-stdlink'); await p.waitForTimeout(250);
  check('“Today’s standard” opens Streaks', await E("ui.view==='personal' && ui.personalTab==='streaks'"));
  // ---- Finishing, and the next step ----
  await E("(function(){ const c = r63Active()[0]; c.preset = 'first'; c.name = 'First streak'; c.days = 3; c.start = addDays(todayStr(), -2); c.log = {}; for(let i = 0; i < 3; i++) c.log[addDays(c.start, i)] = c.rules.map(r => r.id); persist('standards'); renderView(); })()"); await p.waitForTimeout(250);
  check('Finishing it closes the run and offers the next step up (First streak → 75 Soft)', await E("r63Active().length===0") && /75 Soft/.test(await p.textContent('.r63-won')));
  check('…and it’s kept under past streaks', /3 days/.test(await p.textContent('.r65-past')));  // (round 65)
  // ---- Op ----
  await E("r63New(R63_PRESETS.find(p => p.id==='medium'), {}) /* (round 66: presets found by id; more were added) */");
  const out = await E("opRunTool('streak_check', {rule:'read 10 pages'})");
  check('Op can check a rule off (“I did my 10 pages”)', /checked off: Read 10 pages/.test(out) && await E("(function(){ const c = r63Active()[0], r = c.rules.find(r => /Read 10/.test(r.label)); return (c.log[todayStr()] || []).indexOf(r.id) >= 0; })()"), out);
  const st = await E("opRunTool('start_streak', {preset:'own', name:'30 days locked in', days:30, rules:['Lock in 3 hours', 'Gym']})");
  check('…and start one when asked', /started 30 days locked in/.test(st) && await E("r63Active().some(c => c.name==='30 days locked in' && c.days===30 && c.rules.length===2)"), st);
  check('…and knows where you stand', await E("JSON.stringify(aiSystem()).indexOf('day 1 of 75')>=0"));
  // (round 65: one small link that opens them)
  await E("ui.view='personal'; ui.personalTab='streaks'; renderView(); ACTIONS.r65How()"); await p.waitForTimeout(200);
  check('How streaks stick: never miss twice, two minutes, stacking, same time and place, the chain, stepping up', (await p.$$('#r65How .r65-tips > div')).length===6);
  }catch(err){ check('the run reached the end', false, String(err && err.message || err).slice(0, 300)); }
  check('no errors', p.errors.length===0, p.errors);
  await b.close(); process.exit(report() ? 1 : 0);
})();
