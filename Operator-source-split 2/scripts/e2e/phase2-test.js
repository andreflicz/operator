const { instrument, ds, launch, newPage, check, report } = require('./common.js');
const SP = require('./common.js').OUT;
(async () => {
  instrument(process.argv[2], SP+'/t.html');
  const b = await launch(); const today = ds(new Date());
  const seed = {
    tasks:{items:[
      {id:'t1', title:'Edit reel', clients:['personal'], client:'personal', priority:'high', status:'today', notes:'', createdAt:today, deadline:today},
      {id:'t2', title:'Backlog thing', clients:['personal'], client:'personal', priority:'low', status:'backlog', notes:'', createdAt:today},
      {id:'v1', title:'Video idea A with a fairly long title that would wrap', clients:['personal'], client:'personal', priority:'med', status:'backlog', isVideoIdea:true, notes:'vid notes', createdAt:today}
    ]},
    business:{pipeline:[{id:'p1', name:'Lead A', stage:'lead', value:500}], clients:[{id:'c1', name:'Nina', business:'Nina Co', status:'active', touches:[], deliverables:[]}]},
    dashboardPanels:{order:['personalStats','business','clientOps','goals','journal','focusMini','calendarMini','tasks'], enabled:{}}
  };
  let p = await newPage(b, SP+'/t.html', seed);
  const order = await p.evaluate(() => window.__op.state.dashboardPanels.order);
  check('journal raised under streak', order[1]==='journal', order);
  check('streak card rendered', await p.isVisible('.streak-card .streak-num'));
  check('today header centered', await p.evaluate(() => getComputedStyle(document.querySelector('.today-header')).alignItems)==='center');
  check('health pill', await p.isVisible('.health-pill.health-red'));
  await p.screenshot({path:SP+'/p2-today.png', fullPage:false});
  // paste image into quick journal
  await p.evaluate(async () => {
    const c = document.createElement('canvas'); c.width=40; c.height=30; c.getContext('2d').fillStyle='red'; c.getContext('2d').fillRect(0,0,40,30);
    const blob = await new Promise(r => c.toBlob(r,'image/png'));
    const dt = new DataTransfer(); dt.items.add(new File([blob],'shot.png',{type:'image/png'}));
    const ta = document.getElementById('quickJournalText'); ta.focus();
    ta.dispatchEvent(new ClipboardEvent('paste', {clipboardData:dt, bubbles:true, cancelable:true}));
  });
  await p.waitForTimeout(400);
  check('pasted image attached', (await p.evaluate(() => window.__op.ui.journalDraftPhotos.length))===1);
  // drop image onto journal card
  await p.evaluate(async () => {
    const c = document.createElement('canvas'); c.width=20; c.height=20;
    const blob = await new Promise(r => c.toBlob(r,'image/png'));
    const dt = new DataTransfer(); dt.items.add(new File([blob],'drop.png',{type:'image/png'}));
    const card = document.querySelector('[data-photo-drop="journal"]');
    card.dispatchEvent(new DragEvent('dragover', {dataTransfer:dt, bubbles:true, cancelable:true}));
    card.dispatchEvent(new DragEvent('drop', {dataTransfer:dt, bubbles:true, cancelable:true}));
  });
  await p.waitForTimeout(400);
  const refs = await p.evaluate(() => window.__op.ui.journalDraftPhotos);
  check('dropped image attached as idb ref', refs.length===2 && refs.every(r=>r.startsWith('idb:')), refs);
  await p.fill('#quickJournalText', 'Entry with screenshots');
  await p.click('[data-action="addJournal"][data-target="quickJournalText"]');
  const saved = await p.evaluate(() => JSON.parse(localStorage.getItem('opsdash:journal')).entries[0]);
  check('journal saved with photo refs', saved && saved.photos.length===2, saved);
  await p.click('[data-action="nav"][data-view="personal"]'); await p.click('[data-action="personalTab"][data-tab="journal"]');
  await p.waitForTimeout(300);
  check('journal thumbs load from IndexedDB', await p.evaluate(() => [...document.querySelectorAll('.journal-entry .journal-photo-thumb')].every(i => i.src.startsWith('blob:') && i.naturalWidth>1)));
  check('save button spacing row', await p.isVisible('.journal-compose-actions'));
  check('FAB = journal on journal tab', (await p.getAttribute('#fabAdd','title'))==='New journal entry');
  // Focus tasks: mini move controls + compact video ideas
  await p.click('[data-action="nav"][data-view="focus"]');
  check('FAB = add task', (await p.getAttribute('#fabAdd','title'))==='Add task');
  check('minimal move control on today card', await p.isVisible('.task-card[data-id="t1"] .mini-move'));
  await p.click('.task-card[data-id="t1"] .mini-move');
  check('moved to backlog', await p.evaluate(() => window.__op.state.tasks.items.find(t=>t.id==='t1').status)==='backlog');
  await p.click('[data-action="focusTasksSubTab"][data-tab="videoIdeas"]');
  check('FAB = video idea', (await p.getAttribute('#fabAdd','title'))==='Add video idea');
  check('video idea compact (no notes shown)', !(await p.isVisible('.video-idea-compact .vic-body')));
  await p.click('.video-idea-compact .vic-head');
  check('video idea expands', await p.isVisible('.video-idea-compact .vic-body'));
  await p.screenshot({path:SP+'/p2-video.png'});
  await p.click('.vic-actions [data-action="deleteTaskUndoable"]');
  check('video idea deleted', !(await p.evaluate(() => window.__op.state.tasks.items.some(t=>t.id==='v1'))));
  check('undo toast shown', await p.isVisible('.toast .toast-action'));
  await p.click('.toast .toast-action');
  check('undo restores', await p.evaluate(() => window.__op.state.tasks.items.some(t=>t.id==='v1')));
  // FAB on video ideas opens add video idea modal
  await p.click('#fabAdd');
  check('FAB opens video idea modal', await p.isVisible('#videoIdeaOverlay:not(.hidden)'));
  await p.click('[data-action="closeAddVideoIdeaModal"]');
  // view all deadlines
  await p.click('[data-action="nav"][data-view="today"]');
  await p.click('[data-action="goToDeadlines"]');
  check('view all deadlines → calendar list', await p.isVisible('text=All Deadlines'));
  // day off sleepy dots
  await p.click('[data-action="nav"][data-view="today"]');
  await p.click('.today-header [data-action="toggleDayOff"]');
  const dots = await p.evaluate(() => getComputedStyle(document.querySelector('.sleepy-dots'),'::after').animationName);
  check('sleepy dots animate', /sleepyDots/.test(dots), dots);
  await p.screenshot({path:SP+'/p2-dayoff.png'});
  check('crosshair cursor on', await p.evaluate(() => document.body.classList.contains('crosshair-cursor')));
  check('no page errors', p.errors.length===0, p.errors);
  await b.close();
  process.exit(report()?1:0);
})();
