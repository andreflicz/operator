const { instrument, ds, launch, newPage, check, report } = require('./common.js');
const SP = require('./common.js').OUT;
(async () => {
  instrument(process.argv[2], SP+'/t.html');
  const b = await launch();
  let p = await newPage(b, SP+'/t.html', {});
  const E = (code) => p.evaluate(c => window.__op.ev(c), code);
  const els = () => E("cvBoard().elements");
  await p.click('[data-action="nav"][data-view="personal"]');
  await p.click('[data-action="personalTab"][data-tab="vision"]');
  check('empty state', await p.isVisible('.board-empty'));
  await p.click('[data-action="boardTemplate"]'); await p.waitForTimeout(200);
  check('template board (7 elements, nested board)', (await els()).length===7 && (await E("boardsOfKind('vision').length"))===2);
  check('cards rendered', (await p.$$('.bel')).length===6 && (await p.$$('.board-lines line.bline')).length===1);
  await p.screenshot({path:SP+'/p4-vision.png'});
  // add note + edit text
  await p.click('[data-action="boardAddNote"]');
  const note = (await els()).slice(-1)[0];
  const nsel = '.bel[data-el="'+note.id+'"]';
  await p.dblclick(nsel+' .bel-body');
  await p.keyboard.press('Meta+A'); await p.keyboard.press('Control+A');
  await p.keyboard.type('Lock in daily');
  await p.mouse.click(1300, 860); // background click ends editing
  await p.waitForTimeout(100);
  check('edit note text', (await E("cvBoard().elements.find(e=>e.id==='"+note.id+"').body"))==='Lock in daily', await E("cvBoard().elements.find(e=>e.id==='"+note.id+"').body"));
  // drag the note
  const box = await p.locator(nsel).boundingBox();
  const before = await E("JSON.stringify(cvBoard().elements.find(e=>e.id==='"+note.id+"'))");
  await p.mouse.move(box.x+20, box.y+20); await p.mouse.down(); await p.mouse.move(box.x+120, box.y+80, {steps:6}); await p.mouse.up();
  const moved = JSON.parse(await E("JSON.stringify(cvBoard().elements.find(e=>e.id==='"+note.id+"'))"));
  const b0 = JSON.parse(before);
  check('drag moves card', Math.round((moved.x-b0.x)/ (await E("cvBoard().viewport.zoom")))!==0 && moved.y!==b0.y, [b0.x,b0.y,moved.x,moved.y]);
  await p.click('[data-action="boardUndo"]');
  check('undo move', (await E("cvBoard().elements.find(e=>e.id==='"+note.id+"').x"))===b0.x);
  await p.click('[data-action="boardRedo"]');
  check('redo move', (await E("cvBoard().elements.find(e=>e.id==='"+note.id+"').x"))===moved.x);
  // resize via handle
  await p.click(nsel+' .bel-body');
  const h = await p.locator(nsel+' .bel-resize').boundingBox();
  const w0 = await E("cvBoard().elements.find(e=>e.id==='"+note.id+"').w");
  await p.mouse.move(h.x+5, h.y+5); await p.mouse.down(); await p.mouse.move(h.x+65, h.y+45, {steps:5}); await p.mouse.up();
  check('resize', (await E("cvBoard().elements.find(e=>e.id==='"+note.id+"').w"))>w0);
  // color + forward
  await p.click('.board-swatch[data-id="#E8636B"]');
  const n2 = await E("cvBoard().elements.find(e=>e.id==='"+note.id+"')");
  check('color turns on header', n2.header===true && n2.color==='#E8636B');
  // marquee select all via shift-drag over whole board, then delete + undo
  const host = await p.locator('#boardHost').boundingBox();
  await p.keyboard.down('Shift');
  await p.mouse.move(host.x+3, host.y+3); await p.mouse.down(); await p.mouse.move(host.x+host.width-3, host.y+host.height-3, {steps:8}); await p.mouse.up();
  await p.keyboard.up('Shift');
  const selCount = await E("cv.sel.size");
  check('marquee multi-select', selCount>=3, selCount);
  await p.keyboard.press('Delete');
  const left = (await els()).length;
  check('delete selection', left===8-selCount, [left, selCount]);
  await p.keyboard.press('Control+z');
  check('undo delete', (await els()).length===8);
  // pan + zoom
  const v0 = await E("JSON.stringify(cvBoard().viewport)");
  const spot = await p.evaluate((h) => { for(let y=h.y+h.height-15; y>h.y; y-=20){ for(let x=h.x+15; x<h.x+h.width-90; x+=20){ const el=document.elementFromPoint(x,y); if(el && el.id==='boardHost') return {x,y}; } } return null; }, host);
  await p.mouse.move(spot.x, spot.y); await p.mouse.down(); await p.mouse.move(spot.x+90, spot.y-50, {steps:5}); await p.mouse.up();
  const v1 = JSON.parse(await E("JSON.stringify(cvBoard().viewport)"));
  check('pan', v1.x!==JSON.parse(v0).x);
  await p.keyboard.down('Control'); await p.mouse.wheel(0, -300); await p.keyboard.up('Control');
  check('ctrl+wheel zoom', (await E("cvBoard().viewport.zoom"))>v1.zoom);
  await p.click('[data-action="boardFit"]');
  // paste an image + drop an image
  await p.mouse.click(host.x+host.width-10, host.y+10);
  await p.evaluate(async () => {
    const c = document.createElement('canvas'); c.width=300; c.height=200; const g=c.getContext('2d'); g.fillStyle='#3a6'; g.fillRect(0,0,300,200);
    const blob = await new Promise(r=>c.toBlob(r,'image/png'));
    const dt = new DataTransfer(); dt.items.add(new File([blob],'p.png',{type:'image/png'}));
    document.dispatchEvent(new ClipboardEvent('paste',{clipboardData:dt, bubbles:true, cancelable:true}));
    const dt2 = new DataTransfer(); dt2.items.add(new File([blob],'d.png',{type:'image/png'}));
    const hostEl = document.getElementById('boardHost'); const r = hostEl.getBoundingClientRect();
    hostEl.dispatchEvent(new DragEvent('dragover',{dataTransfer:dt2, bubbles:true, cancelable:true, clientX:r.left+200, clientY:r.top+150}));
    hostEl.dispatchEvent(new DragEvent('drop',{dataTransfer:dt2, bubbles:true, cancelable:true, clientX:r.left+200, clientY:r.top+150}));
  });
  await p.waitForTimeout(500);
  const imgs = (await els()).filter(e=>e.type==='image');
  check('paste + drop images', imgs.length===2 && imgs.every(i=>i.ref.startsWith('idb:') && Math.round(i.h/i.w*300)===200), imgs);
  check('images render', await p.evaluate(()=>[...document.querySelectorAll('.bel-image img')].every(i=>i.src.startsWith('blob:'))));
  // nested board: dblclick the board card
  const bc = (await els()).find(e=>e.type==='board');
  await p.dblclick('.bel[data-el="'+bc.id+'"]');
  check('open nested board', (await E("cvBoard().name"))==='The Key To Life' && await p.isVisible('.board-crumb'));
  await p.click('[data-action="boardAddLabel"]');
  check('add to nested', (await els()).length===1);
  await p.click('.board-crumb');
  check('breadcrumb back to parent', (await E("cvBoard().name"))==='Vision Board');
  // view mode
  await p.click('[data-action="boardToggleView"]');
  check('view mode hides toolbar', !(await p.isVisible('.board-toolbar')) && await p.isVisible('#boardHost'));
  await p.click('.bel[data-el="'+bc.id+'"]');
  check('click board card opens in view mode', (await E("cvBoard().name"))==='The Key To Life');
  await p.click('.board-crumb'); await p.click('[data-action="boardToggleView"]');
  // persistence after reload
  await p.waitForTimeout(500);
  const count = (await els()).length;
  await p.reload(); await p.waitForTimeout(500);
  await p.click('[data-action="nav"][data-view="personal"]'); await p.click('[data-action="personalTab"][data-tab="vision"]');
  check('autosaved across reload', (await els()).length===count && (await p.$$('.bel')).length>0);
  // journal boards
  await p.click('[data-action="personalTab"][data-tab="journal"]');
  await p.click('[data-action="journalMode"][data-id="boards"]');
  await p.click('[data-action="boardNew"][data-kind="journal"]');
  check('journal board created (same engine)', (await E("cvBoard().kind"))==='journal' && await p.isVisible('#boardHost'));
  check('FAB adds note on journal board', (await p.getAttribute('#fabAdd','title'))==='Add note to board');
  await p.click('#fabAdd');
  check('journal note added', (await els()).length===1);
  await p.click('[data-action="journalMode"][data-id="entries"]');
  check('entries still there', await p.isVisible('#journalPageText'));
  // slideshow on lock-in screen
  await p.click('[data-action="personalTab"][data-tab="vision"]');
  await p.check('#setVisionSlideshow');
  await E("state.focus.activeSession={startedAt:Date.now(), plannedMinutes:null, completedTasks:[], breaks:[], onBreak:false}; persist('focus');");
  await p.click('[data-action="nav"][data-view="today"]');
  await p.waitForTimeout(200);
  check('slideshow on lock-in screen', await p.isVisible('#visionSlideshow img.is-on'));
  check('no page errors', p.errors.length===0, p.errors);
  await b.close();
  process.exit(report()?1:0);
})();
