// Boards live in Journal → Boards: the vision board is pinned first (shows on Today and the
// wake screen), every other board next to it. Full screen, import, click-click arrows.
const fs = require('fs'), path = require('path');
const { instrument, launch, newPage, check, report, OUT } = require('./common.js');
const ZIP = fs.readFileSync(path.join(__dirname, 'fixtures', 'milanote.zip')).toString('base64');
(async () => {
  instrument(process.argv[2], OUT+'/bd.html');
  const b = await launch();
  const note = (id, title) => ({id, type:'note', header:true, color:'#3FBE8E', title, body:'', x:0, y:0, w:240, h:80});
  const seed = {boards:{boards:[
    {id:'v1', kind:'vision', name:'Vision Board', parentId:null, elements:[note('e1','Mind + Body')], viewport:{x:0,y:0,zoom:1}},
    {id:'v1k', kind:'vision', name:'The Key To Life', parentId:'v1', elements:[], viewport:{x:0,y:0,zoom:1}},
    {id:'v2', kind:'vision', name:'Shoot ideas', parentId:null, elements:[note('e2','Golden hour')], viewport:{x:0,y:0,zoom:1}},
    {id:'v2a', kind:'vision', name:'Locations', parentId:'v2', elements:[], viewport:{x:0,y:0,zoom:1}},
    {id:'m9', kind:'milanote', name:'Old Milanote board', parentId:null, elements:[], viewport:{x:0,y:0,zoom:1}},
    {id:'j1', kind:'journal', name:'Journal board 1', parentId:null, elements:[], viewport:{x:0,y:0,zoom:1}}]},
    profile:{visionSlideshow:true}};
  const p = await newPage(b, OUT+'/bd.html', seed);
  const E = (code) => p.evaluate(c => window.__op.ev(c), code);
  check('first vision board is the master', await E("state.boards.masterId")==='v1');
  check('other boards (and Milanote ones) are regular boards now', await E("['v2','v2a','m9'].every(id => boardById(id).kind==='journal')") && await E("boardById('v1k').kind")==='vision');
  check('nothing deleted', await E("state.boards.boards.length")===6);
  check('vision board on Today', await p.isVisible('.vision-panel .board-static') && (await p.textContent('.vision-panel')).includes('Mind + Body'));
  // Personal: no separate Vision / Milanote tabs
  await p.click('[data-action="nav"][data-view="personal"]');
  check('no Vision Board or Milanote tabs', (await p.$$('[data-action="personalTab"][data-tab="vision"], [data-action="personalTab"][data-tab="milanote"]')).length===0 && !(await p.textContent('#viewRoot')).includes('Milanote</'));
  await p.click('[data-action="personalTab"][data-tab="journal"]'); await p.click('[data-action="journalMode"][data-id="boards"]');
  const pills = await p.$$eval('.board-strip .board-pill[data-action="boardOpen"]', els => els.map(e => e.dataset.id + (e.classList.contains('is-master') ? '*' : '')));
  check('Journal → Boards: vision board pinned first, then every board', JSON.stringify(pills)===JSON.stringify(['v1*','v2','m9','j1']), pills);
  check('opens on the vision board', await E("cv.boardId")==='v1' && await p.isVisible('.board-master-tag'));
  check('the vision board can\'t be deleted', (await p.$$('[data-action="boardDeleteBoard"]')).length===0);
  await p.click('.board-pill[data-id="v2"]');
  check('switch boards from the strip', await E("cv.boardId")==='v2' && await p.isVisible('.board-pill.is-active[data-id="v2"]'));
  check('nested boards stay inside their board', !(await p.isVisible('.board-pill[data-id="v2a"]')));
  // full screen
  await p.click('[data-action="boardFullscreen"]');
  check('full screen', await p.isVisible('.board-shell.is-full'));
  await p.keyboard.press('Escape');
  check('Esc leaves full screen', !(await p.isVisible('.board-shell.is-full')));
  // draw an arrow: click start, click end
  await p.click('[data-action="boardAddArrow"]');
  check('arrow tool waits for clicks', await p.isVisible('#boardHost.is-drawing') && (await p.textContent('.board-draw-hint')).includes('starts'));
  const box = await p.locator('#boardHost').boundingBox();
  const vp = await E("cvBoard().viewport");
  await p.mouse.click(box.x+200, box.y+150);
  await p.mouse.move(box.x+330, box.y+210);
  check('a dashed preview follows the pointer', await p.isVisible('.bline-preview'));
  await p.mouse.click(box.x+400, box.y+250);
  const line = await E("cvBoard().elements.find(e => e.type==='line')");
  const wx = (sx) => Math.round((sx - vp.x)/vp.zoom), wy = (sy) => Math.round((sy - vp.y)/vp.zoom);
  check('arrow created from the two clicks', line && line.arrow===true && Math.abs(line.x1-wx(200))<=2 && Math.abs(line.y1-wy(150))<=2 && Math.abs(line.x2-wx(400))<=2 && Math.abs(line.y2-wy(250))<=2, line);
  check('drawing mode ends after the arrow', !(await p.isVisible('#boardHost.is-drawing')));
  // press-and-drag works too
  await p.click('[data-action="boardAddLine"]');
  await p.mouse.move(box.x+100, box.y+300); await p.mouse.down(); await p.mouse.move(box.x+250, box.y+300, {steps:4}); await p.mouse.up();
  check('or press and drag', await E("cvBoard().elements.filter(e => e.type==='line').length")===2);
  await p.click('[data-action="boardAddArrow"]'); await p.keyboard.press('Escape');
  check('Esc cancels drawing', !(await p.isVisible('#boardHost.is-drawing')) && await E("cvBoard().elements.filter(e => e.type==='line').length")===2);
  // make another board the vision board
  await p.click('[data-action="boardMakeMaster"]');
  check('"make it my vision board"', await E("state.boards.masterId")==='v2' && await E("masterVisionBoard().id")==='v2');
  // import
  await p.evaluate(async (b64) => {
    const bin = Uint8Array.from(atob(b64), c => c.charCodeAt(0));
    await window.__op.ev('importMilanoteFiles')([new File([bin], 'My Board.zip', {type:'application/zip'})]);
  }, ZIP);
  await p.waitForTimeout(300);
  const imp = await E("cvBoard()");
  const types = imp.elements.map(e=>e.type+(e.header?'+h':'')).join(',');
  check('import makes a new board in Journal → Boards', imp.kind==='journal' && imp.name==='My Board' && await E("ui.personalTab==='journal' && ui.journalMode==='boards'"), imp.name);
  check('headings → labels, text → notes, bullets → list', types.startsWith('note+h,note,list'), types);
  check('images from the zip', imp.elements.filter(e=>e.type==='image' && /^idb:|^data:/.test(e.ref)).length===2, types);
  check('import is a small ⬆ pill (no Milanote name on it)', /Import/.test(await p.getAttribute('.board-pill-new[data-action="boardImport"]', 'title')) && !/Milanote/.test(await p.textContent('.board-pill-new[data-action="boardImport"]')));
  // Today panel opens the vision board full screen in Journal → Boards
  await p.click('[data-action="nav"][data-view="today"]');
  await p.click('.vision-panel-box');
  check('vision board on Today opens it full screen', await p.isVisible('.board-shell.is-full') && await E("cv.boardId")==='v2');
  check('no page errors', p.errors.length===0, p.errors);
  await b.close();
  process.exit(report()?1:0);
})();
