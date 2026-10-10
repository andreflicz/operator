// Round of fixes: one render per sidebar click, no idle repaint loops, click-outside / Esc
// closes pop-ups (edits saved), recap is a button + gentle note (never a surprise pop-up),
// the activity pill follows the sidebar, Today's timeline panel is off.
const { instrument, launch, newPage, check, report, OUT } = require('./common.js');
(async () => {
  instrument(process.argv[2], OUT+'/po.html');
  const b = await launch();
  const T = new Date(2026,9,8,21,0).getTime();
  const p = await newPage(b, OUT+'/po.html', {profile:{name:'Andre'},
    tasks:{items:[{id:'t1', title:'Edit reel', status:'today', priority:'med', clients:['personal']}]},
    business:{packages:[], pipeline:[], clients:[{id:'c1', name:'Nina', business:'Nina Co', status:'active', stage:'active', createdAt:'2026-10-01', touches:[], deliverables:[], journal:[]}]},
    focus:{sessions:[{id:'s1', type:'deep', date:'2026-10-08', startedAt:T-5*3600000, endedAt:T-4*3600000, minutes:60, completedTasks:[], auto:true, reviewed:false}], activeSession:{startedAt:T-600000, breaks:[], onBreak:false, completedTasks:[]}}}, T);
  const E = (code) => p.evaluate(c => window.__op.ev(c), code);
  // one render per nav click
  await E("(function(){ const o = renderView; window.__rv = 0; renderView = function(){ if(!renderHold) window.__rv++; return o(); }; })()");
  await E("window.__rv = 0"); await p.click('[data-action="nav"][data-view="business"]');
  check('a sidebar click renders the page once', await E("window.__rv")===1, await E("window.__rv"));
  // pill follows the sidebar right away
  await p.click('[data-action="toggleSidebar"]');
  check('pill moves with the sidebar immediately', await p.evaluate(() => document.body.classList.contains('sb-collapsed')) && await p.isVisible('#activityPill'));
  await p.click('[data-action="toggleSidebar"]');
  check('…and back', await p.evaluate(() => !document.body.classList.contains('sb-collapsed')));
  // no animation loops repainting while idle
  await p.click('[data-action="nav"][data-view="today"]');
  const running = await p.evaluate(() => document.getAnimations().filter(a => a.playState==='running' && a.effect && a.effect.getTiming().iterations===Infinity).map(a => (a.effect.target && a.effect.target.className || '')+':'+(a.animationName||'')));
  check('only the GPU-friendly locked-in glow loops', running.every(x => /glowBreath/.test(x)), running);
  // click outside saves + closes the task editor
  await E("openTaskEditModal('t1')");
  await p.fill('#editTitle-t1', 'Edit reel v2');
  await p.mouse.click(10, 10);
  check('click outside closes the task editor', !(await p.isVisible('#taskEditOverlay:not(.hidden)')));
  check('…and keeps the edit', await E("state.tasks.items[0].title")==='Edit reel v2');
  // client card
  await E("openClientModal('c1')");
  await p.mouse.click(10, 10);
  check('click outside closes the client card', !(await p.isVisible('#clientModalOverlay:not(.hidden)')));
  // Esc on an "add" pop-up closes it without adding
  await E("openAddTaskModal()"); await p.fill('#newTaskTitle', 'Should not be added');
  await p.keyboard.press('Escape');
  check('Esc closes add-task without adding', !(await p.isVisible('#addTaskOverlay:not(.hidden)')) && await E("state.tasks.items.length")===1);
  // wake screen ignores Esc / outside clicks
  await E("fireWake({test:true})"); await p.keyboard.press('Escape'); await p.mouse.click(5, 5);
  check('wake screen can\'t be dismissed by accident', await p.isVisible('#wakeOverlay:not(.hidden)'));
  await p.click('[data-action="wakeStartDay"]'); await p.$eval('[data-action="briefSkip"]', e=>e.click()).catch(()=>{}); await p.waitForTimeout(80); await p.$eval('[data-action="wakeBriefDone"]', e=>e.click());
  // recap: gentle note, not a pop-up
  await E("state.focus.activeSession = null; persist('focus'); renderView()");
  await p.clock.setSystemTime(T+40*60000); await E("maybeShowRecap()");
  check('recap time shows a note, not a pop-up', !(await p.isVisible('#recapOverlay:not(.hidden)')) && (await p.textContent('#toastContainer')).includes('recap'));
  await p.click('#toastContainer [data-action="openRecapToday"]');
  check('the note opens the recap', await p.isVisible('#recapOverlay:not(.hidden)'));
  await p.keyboard.press('Escape');
  check('Esc closes the recap', !(await p.isVisible('#recapOverlay:not(.hidden)')));
  await p.clock.setSystemTime(new Date(2026,9,9,10,0).getTime()); await E("renderView()");
  check('hero has a Recap button (with a badge for sessions to check)', await p.isVisible('.today-hero [data-action="openDayRecap"] .th-badge'));
  await p.click('.today-hero [data-action="openDayRecap"]');
  check('Recap button opens yesterday when it still needs a look', (await p.textContent('#recapOverlay')).includes('Yesterday'));
  await p.keyboard.press('Escape');
  check('Today timeline panel is off', !(await p.isVisible('.agenda-panel')));
  check('no page errors', p.errors.length===0, p.errors);
  await b.close();
  process.exit(report()?1:0);
})();
