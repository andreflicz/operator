// Round 41 (October batch, build 1): in-app dialogs instead of Chrome's popups, client colours on chips,
// Current + Up next, Worth doing soon as one row of tiles, removing alarms from the Calendar, the journal's
// Recently deleted, and the simpler add / edit task sheet.
const { instrument, launch, newPage, check, report, OUT } = require('./common.js');
(async () => {
  instrument(process.argv[2], OUT+'/r41.html');
  const b = await launch();
  const T = new Date(2026,9,25,11,0).getTime();
  const biz = {clients:[
    {id:'jj', name:'Jay', business:'JJS', stage:'active', status:'active', mrr:3000, startDate:'2026-08-01', createdAt:'2026-08-01'},
    {id:'ki', name:'Kiko', business:'Kiko', stage:'active', status:'active', mrr:2000, startDate:'2026-10-03', createdAt:'2026-10-03', color:'#9B8CFF'}]};
  const tasks = {items:[
    {id:'t1', title:'Edit testimonial video', status:'today', priority:'high', clients:['jj'], createdAt:'2026-10-20'},
    {id:'t2', title:'Send the November plan', status:'today', priority:'med', clients:['ki'], createdAt:'2026-10-20'},
    {id:'t3', title:'Push day', status:'today', priority:'low', clients:['personal'], createdAt:'2026-10-20'},
    {id:'b1', title:'Renew domain', status:'backlog', priority:'high', clients:['personal'], createdAt:'2026-10-20'},
    {id:'b2', title:'Pitch deck', status:'backlog', priority:'med', clients:['ki'], createdAt:'2026-10-20'},
    {id:'b3', title:'Shoot b-roll', status:'backlog', priority:'med', clients:['jj'], createdAt:'2026-10-20'},
    {id:'b4', title:'Update rate card', status:'backlog', priority:'low', clients:['personal'], createdAt:'2026-10-20'},
    {id:'b5', title:'Clean drive', status:'backlog', priority:'low', clients:['personal'], createdAt:'2026-10-20'}]};
  const p = await newPage(b, OUT+'/r41.html', {profile:{name:'Andre', lineupView:'list'}, business:biz, tasks:tasks,
    focus:{alarms:[{id:'al1', time:'15:00', label:'Call mom', days:[1,2,3], enabled:true}]},
    journal:{entries:[{id:'j1', date:'2026-10-24', text:'Good day. Shipped the JJS launch.'}, {id:'j2', date:'2026-10-23', text:'Second entry'}]}}, T);
  const E = c => p.evaluate(x => window.__op.ev(x), c);
  let native = 0; p.on('dialog', async d => { native++; await d.dismiss(); });
  await E("document.querySelectorAll('.overlay').forEach(o => o.classList.add('hidden'))");

  // ---- 1. in-app dialogs ----
  await E("state.goals.items.push({id:'g1', tier:'week', pk:'2026-10-19', label:'Old name'}); persist('goals'); ACTIONS.tierGoalRename(null, null, 'g1')"); await p.waitForTimeout(200);
  check('renaming a weekly goal opens Operator\'s own box, not Chrome\'s', !!(await p.$('#uiDialogOverlay #uiDialogInput')) && native===0);
  await p.fill('#uiDialogInput', 'New name'); await p.keyboard.press('Enter'); await p.waitForTimeout(250);
  check('…and Enter saves it', await E("state.goals.items.find(g => g.id==='g1').label")==='New name' && !(await p.$('#uiDialogOverlay')));
  check('no browser prompt/confirm/alert is left in the app', !/[^a-zA-Z_.](prompt|confirm|alert)\(/.test(await E("[ACTIONS.goalSetNumber, ACTIONS.boardAddImageUrl, ACTIONS.videoWallRemove, ACTIONS.ghlDisconnect, ACTIONS.tierGoalRename, ACTIONS.demoRestart].map(String).join(' ').replace(/ui(Ask|Confirm)\\(/g, '')")));

  // ---- 2/3. Current + Up next; no initials; client colours ----
  await E("ui.view='focus'; ui.focusTab='tasks'; ui.focusTasksSubTab='overview'; renderView(); setCurrentTask('t1'); setNextUp('t2'); renderView()"); await p.waitForTimeout(300);
  check('Current is the big card, with its timer and Done', /Current/.test(await p.textContent('.r41-cur .r41-k')) && (await p.textContent('.r41-cur .r41-title'))==='Edit testimonial video' && !!(await p.$('.r41-cur #currentTaskElapsedBar')) && !!(await p.$('.r41-cur [data-action="finishCurrentTask"]')));
  check('Up next is the strip under it, with whose it is', (await p.textContent('.r41-next .r41-next-t'))==='Send the November plan' && /Kiko/.test(await p.textContent('.r41-next .cchip')));
  check('the lineup says Current (not Now) on row 1 and Up next on row 2', /Current/.test(await p.textContent('.tl-row.is-now .tl-badge')) && /Up next/i.test(await p.textContent('.tl-row.is-next .tl-badge')));
  check('client chips carry the client\'s colour (a picked one wins)', (await E("document.querySelector('.tl-row[data-task-id=\"t2\"] .cchip').style.getPropertyValue('--cc')"))==='#9B8CFF');
  check('no client initials on tasks', !(await p.$('#viewRoot .dvc-av, #viewRoot .tl-row .cc2-avatar')));

  // ---- 4. Worth doing soon ----
  const tiles = await p.$$eval('.r41-soon .r41-soon-t', els => els.map(e => { const r = e.getBoundingClientRect(); return {t:r.top, h:r.height}; }));
  const visible = tiles.filter(t => t.h > 0);
  check('Worth doing soon: slim tiles in one row (nothing wraps to a lone card)', visible.length >= 3 && visible.every(t => Math.abs(t.t - visible[0].t) < 2) && visible[0].h < 90, tiles);
  check('…a tile opens the task', (await p.getAttribute('.r41-soon-t', 'data-action'))==='openTaskEditModal');

  // ---- 6. alarms ----
  await E("ui.view='calendar'; ui.cxDesk='alarms'; renderView()"); await p.waitForTimeout(250);
  check('every alarm on the Calendar has a remove button', !!(await p.$('[data-action="r41AlarmRemove"][data-id="al1"]')));
  await E("ACTIONS.r41AlarmRemove(null, null, 'al1')"); await p.waitForTimeout(150);
  check('…it asks first', !!(await p.$('#uiDialogOverlay')) && await E("state.focus.alarms.some(a => a.id==='al1')"));
  await p.click('#uiDialogOverlay [data-ui-dlg="yes"]'); await p.waitForTimeout(250);
  check('…then it\'s gone', !(await E("state.focus.alarms.some(a => a.id==='al1')")));
  await E("ACTIONS.r41UndoAlarm()"); await p.waitForTimeout(150);
  check('…and Undo brings it back', await E("state.focus.alarms.some(a => a.id==='al1')"));

  // ---- 8. journal ----
  await E("ui.view='personal'; ui.personalTab='journal'; ui.journalMode='entries'; ui.journalViewMode='personal'; renderView(); journalAskTrash('j1')"); await p.waitForTimeout(150);
  check('deleting a journal entry asks first', !!(await p.$('#uiDialogOverlay')) && await E("state.journal.entries.some(e => e.id==='j1')"));
  await p.click('#uiDialogOverlay [data-ui-dlg="yes"]'); await p.waitForTimeout(250);
  check('…and moves it to Recently deleted', !(await E("state.journal.entries.some(e => e.id==='j1')")) && await E("state.journal.trash.length")===1 && !!(await p.$('.r41-trash')));
  await E("ui.r41TrashOpen=true; renderView()"); await p.waitForTimeout(150);
  await p.click('.r41-trash-r [data-action="r41JournalRestore"]'); await p.waitForTimeout(200);
  check('…where Restore brings it back', await E("state.journal.entries.some(e => e.id==='j1')") && await E("state.journal.trash.length")===0);
  await E("performDelete('journal', 'j2')"); await p.waitForTimeout(150);
  check('the editor\'s Remove goes to Recently deleted too', await E("state.journal.trash.length")===1);
  await E("state.journal.trash[0].at = Date.now() - 31*86400000; state.journal = normalizeJournal(state.journal)");
  check('after 30 days it\'s gone for good', await E("state.journal.trash.length")===0);

  // ---- 9. task sheet ----
  await E("ui.view='focus'; renderView(); openAddTaskModal()"); await p.waitForTimeout(250);
  check('add: the title, For, Priority and Due up top; the rest under More', !!(await p.$('#addTaskOverlay .r41-ts-title#newTaskTitle')) && !!(await p.$('#addTaskOverlay .r41-ts-row #newTaskPriority')) && !!(await p.$('#addTaskOverlay .r41-ts-row #newTaskDeadline')) && !(await p.isVisible('#newTaskNotes')));
  await p.click('#addTaskOverlay [data-action="r41TaskMore"]'); await p.waitForTimeout(120);
  check('…More opens the extras (notes, category, alarm…)', await p.isVisible('#newTaskNotes') && await p.isVisible('#newTaskCategory'));
  await p.fill('#newTaskTitle', 'A brand new task'); await p.fill('#newTaskNotes', 'with a note');
  await p.click('#addTaskOverlay [data-action="addTaskToday"]'); await p.waitForTimeout(250);
  const nt = await E("JSON.stringify(state.tasks.items.find(t => t.title==='A brand new task'))");
  check('…and adding still saves everything', !!nt && /with a note/.test(nt) && /"today"/.test(nt), nt);
  await E("openTaskEditModal('t2')"); await p.waitForTimeout(250);
  check('edit: the same sheet, with the Low/Medium/High control', !!(await p.$('#taskEditOverlay .r41-ts')) && !!(await p.$('#taskEditOverlay [data-action="r41EditPri"][data-id="med"].is-on')));
  await p.click('#taskEditOverlay [data-action="r41EditPri"][data-id="high"]'); await p.fill('#editTitle-t2', 'Send the November plan v2');
  await p.click('#taskEditOverlay [data-action="saveEditTask"]'); await p.waitForTimeout(250);
  check('…and saving keeps the new priority and title', await E("state.tasks.items.find(t => t.id==='t2').priority")==='high' && await E("state.tasks.items.find(t => t.id==='t2').title")==='Send the November plan v2');

  check('no page errors (round 41)', p.errors.length===0, p.errors);
  await b.close();
  process.exit(report() ? 1 : 0);
})();
