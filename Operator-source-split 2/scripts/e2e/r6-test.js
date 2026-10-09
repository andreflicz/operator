// Round 6: the locked-in clock no longer flashes a scrollbar, tabs switch on press, long lists page in,
// carousels run edge to edge and loop (and follow the mouse wheel), task actions live in a ⋯ menu,
// one This-week panel, hold-to-start modes, softer light theme, video wallpapers, movable sidebar
// tabs, desktop-style selecting, Training retired and logged workouts in analytics.
const { instrument, launch, newPage, check, report, OUT } = require('./common.js');
(async () => {
  instrument(process.argv[2], OUT+'/r6.html');
  const b = await launch();
  const NOW = new Date(2026,9,8,11,0).getTime();
  const T = (id, title, status, extra) => Object.assign({id, title, client:'personal', clients:['personal'], priority:['high','med','low'][id.length%3], deadline:null, notes:'', status, ongoing:false, createdAt:'2026-10-01', completedAt:null}, extra||{});
  const many = []; for(let i=0;i<9;i++) many.push(T('t'+i+'x'.repeat(i%3), 'Task '+i, i<6?'today':'backlog', i===1?{ongoing:true}:{}));

  // ---- locked-in clock: the hero card never overflows, so no scrollbar flashes as the seconds tick ----
  {
    const p = await newPage(b, OUT+'/r6.html', {profile:{name:'Andre'}, tasks:{items:many}, focus:{activeSession:{startedAt:NOW-75*60000, breaks:[], onBreak:false, completedTasks:[]}}}, NOW);
    const col = await p.evaluate(() => { const c = document.querySelector('.focus-hero-col'); if(!c) return null; const s = getComputedStyle(c); return {oy:s.overflowY, sh:c.scrollHeight, ch:c.clientHeight}; });
    check('locked-in hero card can\'t scroll (no scrollbar flash each second)', col && col.oy==='visible', col);
    const muts = await p.evaluate(async () => {
      let n = 0; const mo = new MutationObserver(r => { r.forEach(x => { if(!(x.target.id||'').match(/Elapsed|liveClock/) && !(x.target.parentElement && (x.target.parentElement.id||'').match(/Elapsed|liveClock/))) n++; }); });
      mo.observe(document.getElementById('viewRoot'), {subtree:true, childList:true, characterData:true, attributes:true});
      window.__mo = mo; window.__n = () => n; return true;
    });
    await p.clock.runFor(5000);
    const n = await p.evaluate(() => { window.__mo.disconnect(); return window.__n(); });
    check('ticking seconds only touch the clock itself, nothing else on the page', n < 6, n);
    await p.context().close();
  }

  // ---- Focus page: carousel rows, wheel, ⋯ menu ----
  {
    const p = await newPage(b, OUT+'/r6.html', {profile:{name:'Andre', cardLayout:'carousel'}, tasks:{items:many}}, NOW);
    const E = c => p.evaluate(x => window.__op.ev(x), c);
    // press to switch: the page changes on pointerdown
    await p.hover('[data-action="nav"][data-view="focus"]'); await p.mouse.down();
    check('tabs switch the moment the button goes down', await E("ui.view")==='focus');
    await p.mouse.up(); await p.waitForTimeout(300);
    check('…and the click that follows doesn\'t run it twice', await E("ui.view")==='focus' && !p.errors.length, p.errors);
    const lineup = await p.evaluate(() => { const c = document.querySelector('.task-column.is-car'); const car = c && c.querySelector('.carousel'); const s = c && getComputedStyle(c); return c && {border:s.borderTopStyle, bleed:car.classList.contains('bleed'), loop:car.classList.contains('is-loop'), clones:c.querySelectorAll('.car-clone').length}; });
    check('Today\'s Lineup is unboxed and runs to the window edges', lineup && lineup.border==='none' && lineup.bleed, lineup);
    check('a long lineup loops — there\'s no end to hit', lineup && lineup.loop && lineup.clones > 0, lineup);
    const tr = '.task-column.is-car .car-track';
    const before = await p.$eval(tr, t => t.scrollLeft);
    const box = await (await p.$(tr)).boundingBox();
    await p.mouse.move(box.x+300, box.y+40); await p.mouse.wheel(0, 120); await p.waitForTimeout(700);
    check('the mouse wheel slides the carousel sideways', (await p.$eval(tr, t => t.scrollLeft)) !== before);
    check('card buttons are gone; each card has a ⋯ instead', (await p.$$('.task-card .mini-move-row')).length===0 && (await p.$$('.task-card:not(.car-clone) .card-more')).length >= 6);
    await p.click('.task-card:not(.car-clone)[data-id="t1x"] .card-more');
    const items = await p.$$eval('#taskCtxMenu .ctx-item', e => e.map(x => x.textContent.trim()));
    check('⋯ on an ongoing task offers Mark done for today and Move back to backlog', items.some(t => /Mark done for today/.test(t)) && items.some(t => /Move back to backlog/.test(t)), items);
    await p.click('#taskCtxMenu [data-op="done"]'); await p.waitForTimeout(200);
    check('…and Mark done for today works', await E("isOngoingDoneToday(state.tasks.items.find(t=>t.id==='t1x'))"));
    await p.waitForTimeout(1500);   // the done-for-today animation settles
    await p.click('.task-card:not(.car-clone)[data-id="t1x"] .card-more');
    const items2 = await p.$$eval('#taskCtxMenu .ctx-item', e => e.map(x => x.textContent.trim()));
    check('…then offers Undo', items2.some(t => /Undo — done for today/.test(t)), items2);
    await p.keyboard.press('Escape');
    // desktop-style selecting: drag a box across empty space
    await p.evaluate(() => { document.querySelector('.carousel').scrollIntoView({block:'center'}); const t = document.querySelector('.task-column .car-track'); t.scrollLeft = t.scrollWidth/3; });
    await p.waitForTimeout(150);
    const cards = await p.$$eval('.task-column.is-car .task-card[data-id]:not(.car-clone)', els => els.map(e => { const r = e.getBoundingClientRect(); return {id:e.dataset.id, x:r.left, y:r.top, r:r.right, b:r.bottom}; }).filter(c => c.x > 230 && c.r < 1400).sort((a, b) => a.x - b.x));
    const top = Math.min.apply(null, cards.map(c => c.y)) - 14;
    await p.mouse.move(cards[0].x + 20, top); await p.mouse.down();
    await p.mouse.move(cards[0].x + 200, top + 60, {steps:4}); await p.mouse.move(cards[1].x + 40, top + 80, {steps:4});
    check('dragging on empty space draws a selection box', await p.isVisible('.marquee-box'));
    await p.mouse.up(); await p.waitForTimeout(200);
    const sel = await E("Array.from(ui.selectedTaskIds)");
    check('…and picks up the cards it touched', sel.length >= 2 && sel.includes(cards[0].id) && sel.includes(cards[1].id), {sel, cards:cards.slice(0,2)});
    check('…which show as selected', (await p.$$('.task-card.card-selected:not(.car-clone)')).length >= 2);
    await p.click('.task-card.card-selected:not(.car-clone)', {button:'right'});
    const bulk = await p.textContent('#taskCtxMenu .ctx-title');
    check('right-clicking a picked card opens one menu for all of them', /\d+ tasks selected/.test(bulk), bulk);
    await p.click('#taskCtxMenu [data-op="pri-low"]');
    check('…and its actions apply to every picked task', (await E("Array.from(ui.selectedTaskIds).map(id=>state.tasks.items.find(t=>t.id===id).priority)")).every(x => x==='low'));
    await p.keyboard.press('Escape'); await p.waitForTimeout(100);
    check('Esc lets go of the selection', (await E("ui.selectedTaskIds.size"))===0);
    await p.click('.task-card:not(.car-clone)[data-id="t2xx"]', {modifiers:['Meta']});
    check('⌘-click adds one card without opening it', (await E("ui.selectedTaskIds.has('t2xx')")) && !(await p.isVisible('#taskEditOverlay:not(.hidden)')));
    await p.keyboard.press('Meta+a');
    check('⌘A picks every task on the page', (await E("ui.selectedTaskIds.size")) >= 9);
    await p.mouse.click(700, 80); await p.waitForTimeout(150);
    check('a click on empty space lets go', (await E("ui.selectedTaskIds.size"))===0);
    check('no errors (focus page)', !p.errors.length, p.errors);
    await p.context().close();
  }

  // ---- long lists page in as you scroll ----
  {
    const back = []; for(let i=0;i<130;i++) back.push(T('b'+i, 'Backlog '+i, 'backlog'));
    const p = await newPage(b, OUT+'/r6.html', {profile:{name:'Andre'}, tasks:{items:back}}, NOW);
    await p.click('[data-action="nav"][data-view="focus"]');
    await p.click('[data-action="focusTasksSubTab"][data-tab="backlog"]'); await p.waitForTimeout(300);
    const first = (await p.$$('.task-card')).length;
    check('a long backlog draws a first page, not all 130', first > 0 && first < 130, first);
    await p.evaluate(() => { const m = document.querySelector('.load-more'); if(m) m.scrollIntoView(); });
    await p.waitForTimeout(600);
    check('…and keeps going as you scroll down (no end to click)', (await p.$$('.task-card')).length > first);
    await p.context().close();
  }

  // ---- Today: hero modes, one progress panel, quieter sky line, streak tip ----
  {
    const p = await newPage(b, OUT+'/r6.html', {profile:{name:'Andre'}, tasks:{items:many}, dashboardPanels:{order:['personalStats','week','heatmap','why'], enabled:{week:false}}}, NOW);
    const E = c => p.evaluate(x => window.__op.ev(x), c);
    const pills = await p.$$eval('.th-modes .th-mode', e => e.map(x => x.textContent));
    check('Shooting, Off-time and Day off sit together as small hold buttons in the hero', pills.length===3 && /Shooting/.test(pills[0]) && /Off-time/.test(pills[1]) && /Day off/.test(pills[2]), pills);
    check('Training is gone from the mode buttons', !(await p.$('[data-type="training"]')) && (await p.$$('.modes-strip')).length===0);
    const sb = await (await p.$('.th-mode-shooting')).boundingBox();
    await p.mouse.move(sb.x+20, sb.y+sb.height/2); await p.mouse.down(); await p.clock.runFor(200); await p.mouse.up(); await p.waitForTimeout(200);
    check('a quick click on Shooting does nothing', !(await E("state.modes.active")));
    await p.mouse.down(); await p.clock.runFor(1200); await p.waitForTimeout(250); await p.mouse.up(); await p.waitForTimeout(200);
    check('holding it starts Shooting', (await E("state.modes.active && state.modes.active.type"))==='shooting');
    await E("finishActiveMode(true); renderView()"); await p.waitForTimeout(150);
    check('This week + Consistency are one panel (shown since Consistency was on)', (await p.$$('.progress-panel .wk-bars')).length===1 && (await p.$$('.progress-panel .hm-cell')).length > 100 && (await p.$$('.heatmap-panel, .week-panel')).length===0);
    check('the merge is saved once and later choices stick', (await E("state.dashboardPanels.progressMerged")) && (await E("state.dashboardPanels.enabled.week"))!==false);
    const chip = await p.evaluate(() => { const c = document.querySelector('.sky-chip'); const s = getComputedStyle(c); return {fs:parseFloat(s.fontSize), border:s.borderTopStyle}; });
    check('the daytime line under the clock is smaller and borderless', chip.fs <= 12 && chip.border==='none', chip);
    check('the streak line has a ? explaining it', !!(await p.$('.th-streak .qtip, .th-streak [class*="tip"]')));
    check('no errors (today)', !p.errors.length, p.errors);
    await p.context().close();
  }

  // ---- softer light theme ----
  {
    const p = await newPage(b, OUT+'/r6.html', {profile:{name:'Andre', theme:'light'}}, NOW);
    const bg = await p.evaluate(() => getComputedStyle(document.documentElement).getPropertyValue('--panel').trim().toLowerCase());
    check('light theme panels are soft grey, not white', bg && bg!=='#ffffff' && bg!=='#fff', bg);
    await p.context().close();
  }

  // ---- movable sidebar tabs ----
  {
    const p = await newPage(b, OUT+'/r6.html', {profile:{name:'Andre'}}, NOW);
    const E = c => p.evaluate(x => window.__op.ev(x), c);
    const cal = await (await p.$('#sidebarNav [data-view="calendar"]')).boundingBox();
    const today = await (await p.$('#sidebarNav [data-view="today"]')).boundingBox();
    await p.mouse.move(cal.x+40, cal.y+cal.height/2); await p.mouse.down();
    await p.mouse.move(cal.x+40, today.y+4, {steps:8}); await p.mouse.up(); await p.waitForTimeout(200);
    const order = await p.$$eval('#sidebarNav > .nav-item', e => e.map(x => x.dataset.view));
    check('dragging a sidebar tab moves it', order[0]==='calendar', order);
    check('…and the new order is saved', (await E("state.profile.navOrder[0]"))==='calendar');
    await p.reload(); await p.waitForTimeout(500);
    check('…and is still there after a restart', (await p.$$eval('#sidebarNav > .nav-item', e => e.map(x => x.dataset.view)))[0]==='calendar');
    await p.click('#sidebarNav [data-view="business"]'); await p.waitForTimeout(150);
    check('tabs still work as normal clicks', (await E("ui.view"))==='business');
    await p.context().close();
  }

  // ---- logged workouts in analytics; Training retired without losing anything ----
  {
    const ws = new Date(2026,9,4); const d = n => { const x = new Date(ws); x.setDate(x.getDate()+n); return x.getFullYear()+'-'+String(x.getMonth()+1).padStart(2,'0')+'-'+String(x.getDate()).padStart(2,'0'); };
    const p = await newPage(b, OUT+'/r6.html', {profile:{name:'Andre'}, health:{gymLog:[{id:'g1', date:d(1), type:'Push', duration:50}, {id:'g2', date:d(3), type:'Run', duration:30}, {id:'g3', date:'2026-08-01', type:'Legs', duration:60}], weightLog:[], calorieEntries:[]},
      modes:{active:null, history:[{id:'m1', type:'training', date:d(2), startedAt:new Date(2026,9,6,9).getTime(), endedAt:new Date(2026,9,6,10).getTime(), minutes:60}]}}, NOW);
    const E = c => p.evaluate(x => window.__op.ev(x), c);
    check('logged workout minutes count as Working out', (await E("dayModeTotals('"+d(1)+"').workout"))===50);
    check('old Training time is kept (now under Other)', (await E("dayModeTotals('"+d(2)+"').other"))>=60 && (await E("state.modes.history.length"))===1);
    await p.click('[data-action="nav"][data-view="focus"]'); await p.click('[data-action="focusMainTab"][data-tab="analytics"]');
    await p.click('[data-action="analyticsRange"][data-id="week"]'); await p.waitForTimeout(200);
    const tile = await p.textContent('.mode-tiles-sm');
    check('the week shows time working out and how many workouts', /1h 20m|1h20m|80m/.test(tile) && /2 workouts/.test(tile), tile);
    await p.click('[data-action="analyticsRange"][data-id="all"]'); await p.waitForTimeout(200);
    const fit = await p.evaluate(() => [...document.querySelectorAll('.section-title')].find(x => /Fitness/.test(x.textContent)).parentElement.textContent);
    check('All time shows total workouts and total time working out', /Total Workouts\s*3/.test(fit) && /Time Working Out\s*2h ?20m/.test(fit), fit.slice(0, 200));
    check('a Log a Workout button sits next to manual time logging', await p.isVisible('[data-action="goToFitness"]'));
    check('no errors (analytics)', !p.errors.length, p.errors);
    await p.context().close();
  }

  await b.close();
  process.exit(report() ? 1 : 0);
})();
