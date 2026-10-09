// Round 4: explanations live behind "?" tips, Focus sub-tabs share the Tasks/Analytics line,
// the lock-in column sits flush right, the Leads/Clients controls line up, and the Business
// overview is the page itself rather than a card.
const { instrument, launch, newPage, check, report, OUT } = require('./common.js');
(async () => {
  instrument(process.argv[2], OUT+'/ti.html');
  const b = await launch();
  const T = (id, title, status, extra) => Object.assign({id, title, client:'personal', clients:['personal'], priority:'med', deadline:null, notes:'', status, ongoing:false, createdAt:'2026-10-01', completedAt:null}, extra||{});
  const p = await newPage(b, OUT+'/ti.html', {profile:{name:'Andre', revenueGoalMonthly:10000},
    tasks:{items:[T('t1','Edit reel','today',{priority:'high'}), T('t2','Script ad','today'), T('t3','Color grade','backlog'), T('v1','BTS','backlog',{isVideoIdea:true})]},
    focus:{wake:{enabled:true, time:'07:00', days:[1,2,3,4,5], media:{type:'music', q:'Lose Yourself', k:'song'}}},
    business:{packages:[], pipeline:[{id:'l1', company:'Peak Roofing', stage:'proposal', value:2000, createdAt:'2026-09-20', touchpoints:[]}],
      clients:[{id:'c1', name:'Nina', business:'Nina Co', status:'active', stage:'active', mrr:2500, createdAt:'2026-09-01', touches:[], deliverables:[], journal:[]}]}},
    new Date(2026,9,8,11,0).getTime());
  const E = (code) => p.evaluate(c => window.__op.ev(c), code);
  const rect = (sel) => p.evaluate(s => { const e = document.querySelector(s); if(!e) return null; const r = e.getBoundingClientRect(); return {l:r.left, r:r.right, t:r.top, b:r.bottom, h:r.height, cy:r.top+r.height/2}; }, sel);
  const nav = async (v) => { await p.click('[data-action="nav"][data-view="'+v+'"]'); await p.waitForTimeout(120); };

  // ---- Today: lock-in column flush right, quick-access dock out of the hero ----
  const hero = await rect('.today-hero'), right = await rect('.th-right'), dock = await rect('.quick-access-toggle');
  check('lock-in column sits flush with the hero\'s right padding', hero && right && hero.r-right.r <= 30, {hero, right});
  check('quick-access ☰ moved to the bottom-right stack, clear of the hero', dock && dock.t > hero.b, {dock, hero});

  // ---- page taglines are tips now ----
  for(const v of ['focus','business','calendar','personal']){
    await nav(v);
    const t = await p.evaluate(() => ({tip: !!document.querySelector('.view-title .qtip'), sub: [...document.querySelectorAll('#viewRoot .view-sub')].map(e => e.textContent).filter(Boolean)}));
    check(v+': tagline is a "?" next to the title', t.tip && !t.sub.length, t);
  }

  // ---- hover shows the bubble, leaving hides it; it stays on screen ----
  await nav('focus');
  await p.hover('.view-title .qtip'); await p.waitForTimeout(200);
  const pop = await p.evaluate(() => { const t = document.querySelector('.qtip-pop'); const r = t.getBoundingClientRect(); return {on:t.classList.contains('on'), text:t.textContent, l:r.left, r:r.right, w:innerWidth}; });
  check('hovering "?" shows the explanation', pop.on && /Manage the work itself/.test(pop.text), pop);
  check('…kept inside the window', pop.l >= 8 && pop.r <= pop.w-8, pop);
  await p.mouse.move(700, 600); await p.waitForTimeout(150);
  check('…and moving away hides it', !(await p.evaluate(() => document.querySelector('.qtip-pop').classList.contains('on'))));

  // ---- Focus: sub-tabs on the Tasks/Analytics line, tasks up front ----
  const line = await p.evaluate(() => { const tabs = document.querySelector('#viewRoot .tabs'); const r = tabs.getBoundingClientRect(); const pills = [...tabs.querySelectorAll('.subtab')]; return {n:pills.length, inside:pills.every(x => { const q = x.getBoundingClientRect(); return q.top>=r.top-1 && q.bottom<=r.bottom+1; }), stray:document.querySelectorAll('#viewRoot .subtab-panel > .subtabs, #viewRoot .tab-panel > .subtabs').length}; });
  check('Overview / Backlog / Video Ideas / Finished sit on the Tasks · Analytics line', line.n===4 && line.inside && !line.stray, line);
  const cur = await rect('.nn-panel'), tabs = await rect('#viewRoot .tabs');
  check('the Now / Up next box comes right after the tabs', cur && tabs && cur.t - tabs.b < 40, {cur, tabs});
  check('no Select Multiple button — highlighting picks tasks', !(await p.$('[data-action="toggleTaskSelectMode"]')));
  const col = await rect('[data-dropzone="today"]');
  check('the lineup box fits a short list instead of a 520px void', col && col.h < 400, col);
  await p.click('#viewRoot .tabs [data-action="focusTasksSubTab"][data-tab="backlog"]'); await p.waitForTimeout(120);
  check('sub-tab pills still switch views', await p.isVisible('#backlogResultsContainer'));
  await p.click('[data-action="focusMainTab"][data-tab="analytics"]'); await p.waitForTimeout(150);
  check('Analytics: range picker + Day recap move onto the tab line', await p.isVisible('#viewRoot .tabs .tabs-tools [data-action="analyticsRange"][data-id="week"]') && await p.isVisible('#viewRoot .tabs .tabs-tools [data-action="openDayRecap"]'));
  await p.click('#viewRoot .tabs [data-action="analyticsRange"][data-id="week"]'); await p.waitForTimeout(150);
  check('…and still switch the range', await p.isVisible('.analytics-hero'));
  await p.click('[data-action="focusMainTab"][data-tab="tasks"]');
  await p.click('#viewRoot .tabs [data-action="focusTasksSubTab"][data-tab="overview"]'); await p.waitForTimeout(100);

  // ---- clicking "?" inside a checkbox label shows the tip, never ticks the box ----
  await E("openAddTaskModal()"); await p.waitForTimeout(150);
  const before = await p.isChecked('#newTaskOngoing');
  await p.click('#addTaskOverlay label:has(#newTaskOngoing) .qtip'); await p.waitForTimeout(80);
  check('"?" in a checkbox label doesn\'t tick it', (await p.isChecked('#newTaskOngoing'))===before);
  check('…it shows the tip instead', await p.evaluate(() => document.querySelector('.qtip-pop').classList.contains('on')));
  await p.keyboard.press('Escape'); await p.keyboard.press('Escape'); await p.waitForTimeout(100);
  check('Esc hides the tip (and closes the pop-up as usual)', !(await p.evaluate(() => document.querySelector('.qtip-pop').classList.contains('on'))) && !(await p.isVisible('#addTaskOverlay:not(.hidden)')));

  // ---- a tip whose anchor goes away (page switch) disappears with it ----
  await nav('business');
  await p.hover('.view-title .qtip'); await p.waitForTimeout(150);
  await E("ui.view='calendar'; renderView()"); await p.waitForTimeout(100);
  await nav('business');
  check('switching pages never leaves a stray bubble', !(await p.evaluate(() => { const t = document.querySelector('.qtip-pop'); return t.classList.contains('on') && !document.querySelector('.qtip.is-on'); })));

  // ---- Business overview is the page, not a card ----
  await p.click('[data-action="businessTab"][data-tab="overview"]'); await p.waitForTimeout(120);
  const hq = await p.evaluate(() => { const e = document.querySelector('.hq'); const cs = getComputedStyle(e); return {card:e.classList.contains('card'), border:cs.borderTopWidth, bg:cs.backgroundColor}; });
  check('Business overview has no card box around it', hq && !hq.card && hq.border==='0px' && /rgba\(0, 0, 0, 0\)|transparent/.test(hq.bg), hq);
  check('…MRR, clients and pipeline all still there', await p.isVisible('.hq .biz-mrr') && await p.isVisible('.hq-row[data-id="c1"]') && await p.isVisible('.hq-stage'));

  // ---- Leads / Clients: stats left, one row of equal-height controls right ----
  await p.click('[data-action="businessTab"][data-tab="leads"]'); await p.waitForTimeout(150);
  const lc = await p.evaluate(() => ['.crm-toolbar-slim .crm-stats', '.crm-toolbar-slim .crm-tools-btn', '.crm-toolbar-slim .seg-tabs', '.crm-toolbar-slim .crm-add-btn'].map(s => { const r = document.querySelector(s).getBoundingClientRect(); return {s, h:Math.round(r.height), cy:Math.round(r.top+r.height/2)}; }));
  const ctrls = lc.slice(1);
  check('Leads: Search & sort, Board/List and + Add are the same height', ctrls.every(c => c.h===ctrls[0].h), lc);
  check('…and on one line with the stats', lc.every(c => Math.abs(c.cy-lc[0].cy) <= 3), lc);
  await p.click('[data-action="crmToggleTools"][data-kind="lead"]'); await p.waitForTimeout(120);
  check('…search & sort still opens', await p.isVisible('#crmSearch-lead'));
  await p.click('[data-action="businessTab"][data-tab="clients"]'); await p.waitForTimeout(150);
  const cc = await p.evaluate(() => ['.crm-toolbar-slim .crm-tools-btn', '.crm-toolbar-slim .crm-add-btn'].map(s => { const r = document.querySelector(s).getBoundingClientRect(); return {h:Math.round(r.height), cy:Math.round(r.top+r.height/2)}; }));
  check('Clients: Search & sort and + Add client line up', cc[0].h===cc[1].h && Math.abs(cc[0].cy-cc[1].cy)<=1, cc);

  // ---- wake setup: the how-to text is behind "?" ----
  await E("openWakeSetup()"); await p.waitForTimeout(150);
  const wk = await p.evaluate(() => { const r = document.getElementById('wakeSetupContent'); return {tips:r.querySelectorAll('.qtip').length, long:[...r.querySelectorAll('.kpi-sub')].map(e => e.textContent.trim()).filter(t => t.length > 60), music:[...r.querySelectorAll('.kind-label')].map(e => e.textContent).join('|')}; });
  check('wake setup explanations are tips', wk.tips >= 4 && !wk.long.length, wk);
  check('…labels stay short ("Alarm sound")', /Alarm sound\?/.test(wk.music) && !/starts by itself/i.test(wk.music), wk.music);
  await p.click('[data-action="closeWakeSetup"]');

  // ---- nothing chunky left on the main pages ----
  const chunky = [];
  const scan = async (where) => { const l = await p.evaluate(() => [...document.querySelectorAll('#viewRoot .kpi-sub, #viewRoot .view-sub')].filter(e => e.offsetParent && !e.closest('.task-card,.journal-entry')).map(e => e.textContent.trim()).filter(t => t.length > 80)); l.forEach(t => chunky.push(where+': '+t)); };
  await nav('today'); await scan('today');
  await nav('focus'); await scan('focus');
  await nav('business'); for(const t of ['overview','leads','clients','lifecycle','packages','finances']){ await p.click('[data-action="businessTab"][data-tab="'+t+'"]'); await p.waitForTimeout(80); await scan('business/'+t); }
  await nav('settings'); for(const t of await p.$$eval('[data-action="settingsTab"]', els => els.map(e => e.dataset.tab))){ await p.click('[data-action="settingsTab"][data-tab="'+t+'"]'); await p.waitForTimeout(80); await scan('settings/'+t); }
  check('no paragraph-long explanations left on the pages', !chunky.length, chunky);
  check('every page and pop-up rendered without errors', !p.errors.length, p.errors);
  await b.close();
  process.exit(report() ? 1 : 0);
})();
