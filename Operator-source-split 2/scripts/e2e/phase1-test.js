const path = require('path');
const { chromium } = require('playwright');
require('./common.js').instrument(process.argv[2], require('./common.js').OUT+'/p1.html');
const file = 'file://' + require('./common.js').OUT+'/p1.html';
const results = [];
function check(name, ok, info){ results.push((ok?'PASS ':'FAIL ')+name+(info?'  '+JSON.stringify(info):'')); }
function ds(d){ return d.getFullYear()+'-'+String(d.getMonth()+1).padStart(2,'0')+'-'+String(d.getDate()).padStart(2,'0'); }
async function newPage(browser, seed, clockAt){
  const ctx = await browser.newContext({ viewport:{width:1400,height:900} });
  const page = await ctx.newPage();
  page.errors = [];
  page.on('pageerror', e => page.errors.push(e.message));
  if(clockAt) await page.clock.install({ time: clockAt });
  await page.addInitScript((seed) => {
    if (sessionStorage.getItem('seeded')) return; sessionStorage.setItem('seeded','1');
    Object.keys(seed).forEach(k => localStorage.setItem('opsdash:'+k, JSON.stringify(seed[k])));
  }, seed);
  await page.goto(file); await page.waitForTimeout(400);
  return page;
}
(async () => {
  const browser = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium-1194/chrome-linux/chrome', args: ['--no-sandbox'] });
  const today = ds(new Date());
  const baseTasks = {items:[
    {id:'t1', title:'Edit reel', clients:['personal'], client:'personal', priority:'high', status:'today', notes:'orig notes', createdAt:today, deadline:today},
    {id:'v1', title:'Video idea A', clients:['personal'], client:'personal', priority:'med', status:'backlog', isVideoIdea:true, notes:'vid notes', createdAt:today, deadline:today}
  ]};

  // 1.6 video idea opens its own editor
  let page = await newPage(browser, {tasks:baseTasks});
  await page.click('[data-action="nav"][data-view="focus"]');
  await page.click('[data-action="focusTasksSubTab"][data-tab="videoIdeas"]');
  await page.click('.video-idea-compact[data-task-id="v1"] .vic-head');
  await page.click('.video-idea-compact[data-task-id="v1"] [data-action="openTaskEditModal"]');
  check('1.6 video idea editor opens', await page.isVisible('#videoIdeaEditOverlay:not(.hidden) #editVideoTitle-v1') && await page.isHidden('#taskEditOverlay:not(.hidden)'));
  check('1.6 no priority field in video editor', (await page.$$('#videoIdeaEditContent select[id^="editPriority"]')).length===0);
  await page.fill('#editVideoNotes-v1', 'new hook');
  await page.click('[data-action="saveVideoIdeaEdit"]');
  check('1.6 video idea saved', await page.evaluate(() => JSON.parse(localStorage.getItem('opsdash:tasks')).items.find(t=>t.id==='v1').notes)==='new hook');

  // 1.7 toggling client chip in task editor keeps typed notes
  await page.click('[data-action="focusTasksSubTab"][data-tab="overview"]');
  await page.click('.task-card[data-id="t1"] .task-card-title');
  await page.fill('#editNotes-t1', 'typed but unsaved');
  await page.fill('#editTitle-t1', 'Edit reel v2');
  await page.click('#taskEditContent [data-action="toggleEditClientChip"][data-value="general"]');
  check('1.7 notes survive chip toggle', await page.inputValue('#editNotes-t1')==='typed but unsaved');
  check('1.7 title survives chip toggle', await page.inputValue('#editTitle-t1')==='Edit reel v2');
  await page.click('[data-action="saveEditTask"]');
  const t1 = await page.evaluate(() => JSON.parse(localStorage.getItem('opsdash:tasks')).items.find(t=>t.id==='t1'));
  check('1.7 saved values', t1.notes==='typed but unsaved' && t1.clients.includes('general'), t1);
  // reopen a different task: no stale fields
  await page.click('.task-card[data-id="t1"] .task-card-title');
  check('1.7 reopen shows saved notes', await page.inputValue('#editNotes-t1')==='typed but unsaved');
  await page.click('[data-action="closeTaskEditModal"]');

  // 1.8 calendar deadline click opens editor with delete
  await page.click('[data-action="nav"][data-view="calendar"]');
  await page.click('[data-action="openCalItem"][data-kind="deadline"][data-id="t1"]');
  check('1.8 deadline opens task editor', await page.isVisible('#taskEditOverlay:not(.hidden)'));
  check('1.8 editor has delete', await page.isVisible('#taskEditContent [data-action="deleteTaskUndoable"]'));
  await page.click('#taskEditContent [data-action="deleteTaskUndoable"]');
  check('1.8 task deleted', await page.evaluate(() => !JSON.parse(localStorage.getItem('opsdash:tasks')).items.some(t=>t.id==='t1')));
  await page.click('[data-action="openCalItem"][data-kind="deadline"][data-id="v1"]');
  check('1.8 video deadline opens video editor', await page.isVisible('#videoIdeaEditOverlay:not(.hidden)'));
  await page.click('[data-action="closeVideoIdeaEditModal"]');

  // 1.5 personal opens at top
  await page.click('[data-action="nav"][data-view="settings"]');
  await page.evaluate(() => { document.querySelector('.main').scrollTop = 600; });
  await page.click('[data-action="nav"][data-view="personal"]');
  check('1.5 personal scrolled to top', await page.evaluate(() => document.querySelector('.main').scrollTop)===0);
  check('no page errors (main flows)', page.errors.length===0, page.errors);
  await page.context().close();

  // 1.2 manual lock-in from off-time exits cleanly
  page = await newPage(browser, {modes:{active:{type:'offtime', startedAt:Date.now()-3600000}, history:[]}, tasks:{items:[{id:'t9', title:'X', clients:['personal'], client:'personal', priority:'med', status:'today', createdAt:today}]}});
  await page.evaluate(() => {}); 
  await page.click('[data-action="nav"][data-view="focus"]');
  await page.evaluate(() => { document.querySelector('[data-action="nav"][data-view="today"]').click(); });
  // drive the real flow: open chooser -> lock in -> stage task -> start
  await page.evaluate(() => { document.body.insertAdjacentHTML('beforeend','<button id="__lk" data-action="openLockInChooser">x</button>'); document.getElementById('__lk').click(); });
  await page.click('[data-action="chooseOpenEnded"]');
  await page.click('[data-action="openPreFocusPick"]');
  await page.click('[data-action="stageExistingTaskFromPreFocus"][data-id="t9"]');
  await page.click('[data-action="preFocusGoToWhy"]');
  await page.click('[data-action="confirmStartFocus"]');
  const st = await page.evaluate(() => ({ modes: JSON.parse(localStorage.getItem('opsdash:modes')), focus: JSON.parse(localStorage.getItem('opsdash:focus')) }));
  check('1.2 off-time ended on manual lock-in', !st.modes.active && st.modes.history.some(h=>h.type==='offtime'), st.modes);
  check('1.2 session started', !!st.focus.activeSession);
  check('1.2 today shows locked-in view', await page.isVisible('.locked-in-header'));
  // 1.5 locked-in header flush with top
  const gap = await page.evaluate(() => document.querySelector('.locked-in-header').getBoundingClientRect().top - document.querySelector('.main').getBoundingClientRect().top);
  check('1.5 locked-in header at top', Math.abs(gap) < 1, {gap});
  // manual stop records cooldown
  await page.click('[data-action="openStopFocus"]');
  await page.click('[data-action="requestStopConfirm"]');
  await page.click('[data-action="reallyConfirmStopFocus"]');
  const r = await page.evaluate(() => { const {checkAutoLockIn, parseActivityLogText, todayStr} = window.__op; const state = window.__op.state;
    const now = Date.now();
    state.settings.appTracking.thresholdMinutes = 2;
    // Chrome has been frontmost for 30 min (including the session) — the reported bug.
    state.appActivity.todayIntervals = [{app:'Google Chrome', start: now-30*60000, end: now}];
    checkAutoLockIn();
    const afterStop = !!state.focus.activeSession;
    // simulate cooldown over, but only 1 min of steady use since then
    state.focus.lastManualStopAt = now - 16*60000;
    window.__op.ev("setActivityCategory('Google Chrome', 'work')"); // only work apps auto lock in now
    state.appActivity.todayIntervals = [{app:'Google Chrome', start: now-30*60000, end: now}];
    checkAutoLockIn();
    const shortUse = !!state.focus.activeSession;
    // 3 min of steady use after cooldown -> auto lock-in
    state.focus.lastManualStopAt = now - 18*60000; state.focus.lastSessionEndedAt = now - 18*60000; state.modes.lastEndedAt = null;
    checkAutoLockIn();
    const longUse = !!state.focus.activeSession;
    if(state.focus.activeSession){ state.focus.activeSession = null; }
    // day off blocks
    state.daysOff.dates.push(todayStr()); state.focus.lastManualStopAt = null; state.focus.lastSessionEndedAt = null;
    checkAutoLockIn();
    const dayOff = !!state.focus.activeSession;
    state.daysOff.dates = [];
    state.modes.active = {type:'offtime', startedAt: now}; checkAutoLockIn();
    const offTime = !!state.focus.activeSession; state.modes.active = null;
    // idle samples filtered
    const parsed = parseActivityLogText('1000\tChrome\t5\n2000\tChrome\t300\n3000\tSafari\n');
    return {afterStop, shortUse, longUse, dayOff, offTime, parsed};
  });
  check('1.2 no auto lock-in right after manual stop', !r.afterStop);
  check('1.2 no auto lock-in when only 1 min used after cooldown', !r.shortUse);
  check('1.2 auto lock-in after cooldown + threshold', r.longUse);
  check('1.2 never on day off', !r.dayOff);
  check('1.2 never in off-time', !r.offTime);
  check('1.2 idle column parsed', r.parsed.length===3 && r.parsed[1].idle===300 && r.parsed[2].idle===null, r.parsed);
  check('no page errors (lock-in)', page.errors.length===0, page.errors);
  await page.context().close();

  // 1.3 midnight rollover on a non-working day + Sunday week reset
  const sat = new Date(2026, 9, 10, 23, 59, 50); // Sat Oct 10 2026, 11:59:50 PM
  page = await newPage(browser, {
    daysOff:{dates:['2026-10-10']},
    modes:{active:null, history:[]},
    focus:{activeSession:null, sessions:[
      {id:'s1', date:'2026-10-05', startedAt:+new Date(2026,9,5,9), endedAt:+new Date(2026,9,5,11), minutes:120, completedTasks:[]},
      {id:'s0', date:'2026-10-03', startedAt:+new Date(2026,9,3,9), endedAt:+new Date(2026,9,3,10), minutes:60, completedTasks:[]}
    ]}
  }, sat);
  check('1.3 day-off view before midnight', (await page.textContent('#viewRoot')).includes('Taking today off'));
  await page.clock.runFor(15000);
  await page.waitForTimeout(100);
  const txt = await page.textContent('#viewRoot');
  check('1.3 rolled over to Sunday without interaction', !txt.includes('Taking today off') && /Sunday/.test(txt), txt.slice(0,160));
  const week = await page.evaluate(() => { const rows=[...document.querySelectorAll('.time-worked-row')].map(r=>r.textContent); return rows; });
  check('1.3 week resets on Sunday (0m on Sunday)', week.some(w=>/This week\s*0m/.test(w)), week);
  check('no page errors (rollover)', page.errors.length===0, page.errors);
  await page.context().close();

  page = await newPage(browser, {focus:{activeSession:null, sessions:[
      {id:'s1', date:'2026-10-05', startedAt:+new Date(2026,9,5,9), endedAt:+new Date(2026,9,5,11), minutes:120, completedTasks:[]},
      {id:'s0', date:'2026-10-03', startedAt:+new Date(2026,9,3,9), endedAt:+new Date(2026,9,3,10), minutes:60, completedTasks:[]}]}}, new Date(2026,9,10,15,0));
  const wk2 = await page.evaluate(() => [...document.querySelectorAll('.time-worked-row')].map(r=>r.textContent));
  check('1.3 Saturday week = Sun..Sat only (2h, excludes prior Sat)', wk2.some(w=>/This week\s*2h$/.test(w)), wk2);
  await page.context().close();

  // 1.3 off-time spanning midnight is split per day
  page = await newPage(browser, {modes:{active:{type:'offtime', startedAt:+new Date(2026,9,10,22,0)}, history:[]}}, new Date(2026,9,10,23,59,50));
  await page.clock.runFor(15000); await page.waitForTimeout(100);
  const m = await page.evaluate(() => JSON.parse(localStorage.getItem('opsdash:modes')));
  check('1.3 off-time split at midnight', m.history.length===1 && m.history[0].date==='2026-10-10' && m.history[0].minutes===120 && ds(new Date(m.active.startedAt))==='2026-10-11', m);
  await page.context().close();

  await browser.close();
  console.log(results.join('\n'));
  process.exit(results.some(r=>r.startsWith('FAIL'))?1:0);
  function ds(d){ return d.getFullYear()+'-'+String(d.getMonth()+1).padStart(2,'0')+'-'+String(d.getDate()).padStart(2,'0'); }
})();
